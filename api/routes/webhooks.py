from groq import AsyncGroq
import os
import asyncio
from fastapi import APIRouter, Request
from models.tortoise_models import CallRecord, User
from api.websocket_manager import manager
from services.hubspot_service import HubSpotService

from services.email_service import EmailService
from services.calendly_service import CalendlyService
from services.ai_logic import AILogicEngine

from datetime import datetime, timezone


email_service = EmailService()
calendly_service = CalendlyService()


router = APIRouter()

active_calls = set()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

RESCHEDULE_KEYWORDS = [
    'reschedule', 'call me back', 'call back', 'talk later',
    'not a good time', 'busy right now', 'another time',
    'can we talk later', 'talk another time', 'catch you later',
    'call later', 'bad time', 'in a meeting', 'get back to you'
]


@router.post("/test/send-email")
async def test_send_email():
    await email_service.send_meeting_link(
        lead_name="Hamza Khan",
        lead_email="sohaibchughtai626@gmail.com",
        calendly_link=os.getenv("CALENDLY_EVENT_URI")
    )
    return {"status": "email sent"}


async def analyze_call_content(transcript: str):
    """Analyzes transcript using Groq (Llama 3.1 8B - Free Tier)."""
    if not transcript or len(transcript) < 10:
        return "Neutral", "Unknown"

    prompt = (
        "Analyze this call transcript.\n"
        "Respond with EXACTLY two lines, nothing else.\n"
        "Line 1: ONLY one word from this list: Positive, Negative, Neutral\n"
        "Line 2: ONLY one option from this list: Interested, Busy, Not Interested, Asking Questions\n"
        "Do NOT combine options. Pick the single best match.\n"
        f"Transcript:\n{transcript}"
    )

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20,
            temperature=0.0
        )
        analysis = response.choices[0].message.content.strip().split("\n")

        sentiment_raw = analysis[0].strip() if len(analysis) > 0 else "Neutral"
        intent_raw = analysis[1].strip() if len(analysis) > 1 else "Unknown"

        def clean_sentiment(raw):
            raw = raw.lower()
            if "positive" in raw:
                return "Positive"
            if "negative" in raw:
                return "Negative"
            return "Neutral"

        def clean_intent(raw):
            raw = raw.lower()
            if "not interested" in raw:
                return "Not Interested"
            if "interested" in raw:
                return "Interested"
            if "asking" in raw or "question" in raw:
                return "Asking Questions"
            if "busy" in raw:
                return "Busy"
            return "Unknown"

        sentiment = clean_sentiment(sentiment_raw)
        intent = clean_intent(intent_raw)

        return sentiment, intent
    except Exception as e:
        print(f"Groq Analysis Error: {e}")
        return "Error", "Analysis Failed"


def detect_reschedule_from_transcript(transcript: str) -> bool:
    """
    Checks if the lead explicitly asked to reschedule during the call
    by scanning only the user/human lines of the transcript.
    """
    if not transcript:
        return False

    transcript_lower = transcript.lower()
    user_lines = [
        line for line in transcript_lower.split('\n')
        if line.strip().startswith('user:') or line.strip().startswith('human:')
    ]
    user_text = ' '.join(user_lines)

    matched = [kw for kw in RESCHEDULE_KEYWORDS if kw in user_text]
    if matched:
        print(f"🔍 Reschedule keywords detected in transcript: {matched}")
        return True
    return False


@router.post("/vapi-webhook")
async def vapi_webhook(request: Request):
    data = await request.json()

    message = data.get("message", {})
    call_data = data.get("call") or message.get("call") or {}
    vapi_call_id = call_data.get("id") or data.get("callId") or message.get("callId")
    event_type = data.get("type") or message.get("type")

    print(f"DEBUG: Webhook received: {event_type} for Call ID: {vapi_call_id}")

    if event_type == "transcript":
        transcript_text = message.get("transcript", "")
        if not transcript_text and "messages" in message:
            transcript_text = "\n".join([
                f"{msg.get('role').capitalize()}: {msg.get('transcript', msg.get('text', ''))}"
                for msg in message.get("messages", []) if msg.get("transcript") or msg.get("text")
            ])

        if transcript_text:
            # Resolve user_id from call record
            _cr = await CallRecord.filter(vapi_call_id=vapi_call_id).prefetch_related("lead").first()
            _uid = _cr.lead.user_id if (_cr and _cr.lead) else None
            await manager.broadcast({
                "type": "TRANSCRIPT_UPDATE",
                "user_id": _uid,
                "call_id": vapi_call_id,
                "text": transcript_text
            })
        return {"status": "ok"}


    # --- HANDLE TOOL CALLS ---
    if event_type == "tool-calls":
        tool_calls = message.get("toolCalls", [])

        for tool_call in tool_calls:
            if tool_call["function"]["name"] == "book_discovery_call":
                args = tool_call["function"]["arguments"]
                lead_email = args.get("email")
                start_time = args.get("datetime")

                call_record = await CallRecord.filter(
                    vapi_call_id=vapi_call_id
                ).prefetch_related("lead").first()

                lead_name = call_record.lead.name if call_record else "Valued Lead"
                calendly_link = os.getenv("CALENDLY_EVENT_URI")

                print(f"📅 Sending meeting link to {lead_name} ({lead_email})")

                await email_service.send_meeting_link(
                    lead_name=lead_name,
                    lead_email=lead_email,
                    calendly_link=calendly_link
                )

                await manager.broadcast({
                    "type": "MEETING_BOOKED",
                    "user_id": call_record.lead.user_id if (call_record and call_record.lead) else None,
                    "lead_name": lead_name,
                    "lead_email": lead_email,
                    "scheduled_time": start_time,
                    "timestamp": datetime.now().isoformat()
                })

                # Also mark lead as rescheduled in DB if we have a datetime
                if call_record and start_time:
                    try:
                        lead = call_record.lead
                        lead.status = "rescheduled"
                        lead.reschedule_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                        await lead.save()
                        print(f"🔁 Lead {lead.id} marked rescheduled via tool call at {lead.reschedule_time}")
                    except Exception as e:
                        print(f"⚠️ Could not parse reschedule datetime: {e}")

                return {
                    "results": [{
                        "toolCallId": tool_call["id"],
                        "result": f"Success! I've sent the Calendly booking link to {lead_email}."
                    }]
                }


    # --- ACTIVE CALL TRACKING ---
    if event_type == "status-update":
        call_status = message.get("status") or data.get("status")

        if call_status == "in-progress":
            active_calls.add(vapi_call_id)
        elif call_status in ["ended", "failed"]:
            active_calls.discard(vapi_call_id)

        # ✅ ADD THIS — update the DB record status
        if vapi_call_id and call_status:
            db_status = "in-progress" if call_status == "in-progress" else call_status
            await CallRecord.filter(vapi_call_id=vapi_call_id).update(status=db_status)

        # Resolve user_id for scoping
        _cr_status = await CallRecord.filter(vapi_call_id=vapi_call_id).prefetch_related("lead").first() if vapi_call_id else None
        _uid_status = _cr_status.lead.user_id if (_cr_status and _cr_status.lead) else None

        await manager.broadcast({
            "type": "ACTIVE_CALLS_UPDATE",
            "user_id": _uid_status,
            "count": len(active_calls),
            "active_call_ids": list(active_calls),
            "status": call_status,
            "call_id": vapi_call_id,
        })
        return {"status": "ok"}


    if event_type == "transfer-update":
        print(f"🔄 Transfer fired for call {vapi_call_id}")

        call_record = await CallRecord.filter(
            vapi_call_id=vapi_call_id
        ).prefetch_related("lead").first()

        lead = call_record.lead if call_record else None
        lead_name = lead.name if lead else "Unknown"
        lead_score = lead.score if lead else 0

        if lead:
            lead.status = "handoff"
            await lead.save()

        await manager.broadcast({
            "type": "HANDOFF_TRIGGERED",
            "user_id": lead.user_id if lead else None,
            "call_id": vapi_call_id,
            "lead_name": lead_name,
            "lead_score": lead_score,
            "timestamp": datetime.now().isoformat()
        })
        return {"status": "ok"}


    # --- LIVE TRANSCRIPT ---
    if event_type == "conversation-update":
        transcript_data = (
            message.get("transcript") or
            data.get("transcript") or
            message.get("artifact", {}).get("transcript") or
            message.get("messages") or
            data.get("messages") or
            []
        )

        if isinstance(transcript_data, list):
            transcript_text = "\n".join([
                f"{item.get('role', 'unknown')}: {item.get('content', item.get('message', ''))}"
                for item in transcript_data
                if item.get('content') or item.get('message')
                and item.get('role') != 'system'
                and item.get('role') != 'tool'
            ])
        else:
            transcript_text = transcript_data or ""

        if transcript_text:
            # Resolve user_id for scoping
            _cr_conv = await CallRecord.filter(vapi_call_id=vapi_call_id).prefetch_related("lead").first() if vapi_call_id else None
            _uid_conv = _cr_conv.lead.user_id if (_cr_conv and _cr_conv.lead) else None
            await manager.broadcast({
                "type": "TRANSCRIPT_UPDATE",
                "user_id": _uid_conv,
                "text": transcript_text
            })
        return {"status": "streaming"}


    if event_type == "end-of-call-report":
        active_calls.discard(vapi_call_id)

        transcript = (
            data.get("transcript") or
            message.get("transcript") or
            (data.get("artifact") or message.get("artifact") or {}).get("transcript") or ""
        ).strip()

        # ✅ Always extract artifact fields regardless of transcript presence
        artifact = (
            data.get("artifact") or
            message.get("artifact") or
            data.get("message", {}).get("artifact") or
            {}
        )
        recording_url = artifact.get("recordingUrl") or data.get("recordingUrl") or message.get("recordingUrl") or ""

        # ✅ Calculate duration from timestamps safely
        started_at = data.get("startedAt") or call_data.get("startedAt") or message.get("startedAt")
        ended_at   = data.get("endedAt")   or call_data.get("endedAt")   or message.get("endedAt")
        duration_seconds = 0
        
        if started_at and ended_at:
            try:
                fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
                start = datetime.strptime(started_at, fmt)
                end   = datetime.strptime(ended_at,   fmt)
                duration_seconds = max(0, int((end - start).total_seconds()))
            except Exception as e:
                print(f"⚠️ Could not parse duration timestamps: {e}")

        if vapi_call_id:
            call_record = await CallRecord.filter(vapi_call_id=vapi_call_id).first()

            # 1. Fallback / Self-Heal if record wasn't created yet
            if not call_record:
                print(f"⚠️ Webhook arrived before frontend/backend registration. Creating record for {vapi_call_id}")
                await asyncio.sleep(1)
                call_record = await CallRecord.create(
                    vapi_call_id=vapi_call_id,
                    status="completed",
                    lead=None
                )

            # --- AUTOMATIC INVALIDATION CHECK ---
            ended_reason = data.get("endedReason", "") or message.get("endedReason", "")
            print(f"ℹ️ Call ended reason: {ended_reason} for Call ID: {vapi_call_id}")

            INVALID_NUMBER_REASONS = ["error-with-carrier", "invalid-number", "network-error"]

            if ended_reason in INVALID_NUMBER_REASONS:
                await call_record.fetch_related("lead")
                lead = call_record.lead

                if lead:
                    print(f"🚨 Invalid number detected ({ended_reason}) for lead: {lead.name} ({lead.phone}). Invalidation sequence triggered...")
                    if lead.hubspot_id:
                        try:
                            await HubSpotService.delete_lead(lead.hubspot_id)
                        except Exception as hs_err:
                            print(f"⚠️ Failed to delete lead from HubSpot: {hs_err}")
                    
                    await CallRecord.filter(lead=lead).delete()
                    
                    lead_id_for_ui = lead.id
                    lead_name_for_ui = lead.name
                    await lead.delete()
                    print(f"🗑️ Lead {lead_name_for_ui} completely purged from local system.")
                    
                    await manager.broadcast({
                        "type": "LEAD_REMOVED",
                        "lead_id": lead_id_for_ui,
                        "message": f"Removed {lead_name_for_ui} due to an invalid phone number."
                    })
                    
                    await call_record.delete()
                    return {"status": "lead_invalidated_and_purged"}

            # 2. Update Database values for valid calls
            call_record.recording_url = recording_url
            call_record.duration = duration_seconds
            call_record.status = "completed"
            call_record.transcript = transcript
            await call_record.save()
            print(f"✅ Call record {vapi_call_id} marked completed with duration {duration_seconds}s.")

            # Default values for dashboard sync logic
            sentiment = "Unknown"
            intent = "Unknown"
            lead_score_val = 0

            # 3. Analyze and Process Content (Only execute analytical mutations if a transcript exists)
            if transcript:
                print(f"Analyzing sentiment for {vapi_call_id}...")
                sentiment, intent = await analyze_call_content(transcript)

                call_record.sentiment = sentiment
                call_record.intent = intent
                await call_record.save()

                # Fetch associated lead relation if it exists
                await call_record.fetch_related("lead")
                lead = call_record.lead

                # 4. Process Lead-Specific Rules
                if lead:
                    score = 50
                    if sentiment == "Positive": score += 30
                    elif sentiment == "Negative": score -= 20

                    if intent == "Interested": score += 40
                    elif intent == "Asking Questions": score += 20
                    elif intent == "Busy": score -= 10
                    elif intent == "Not Interested": score -= 30

                    score = max(0, min(100, score))
                    lead.score = score

                    # Store the AI-derived intent as lead_status and stamp last_activity
                    lead.lead_status = intent                          # e.g. "Interested", "Busy"
                    lead.last_activity = datetime.now(timezone.utc)   # UTC timestamp of this call

                    decision = AILogicEngine.process_outcome({"sentiment": sentiment, "intent": intent})
                    keyword_reschedule = detect_reschedule_from_transcript(transcript)

                    if decision["reschedule"] or keyword_reschedule:
                        lead.status = "rescheduled"
                        lead.reschedule_time = AILogicEngine.get_reschedule_time()
                    elif lead.status != "handoff":
                        if score >= 70: lead.status = "qualified"
                        elif score <= 30: lead.status = "cold"
                        else: lead.status = "new"

                    await lead.save()
                    lead_score_val = lead.score

                    # Fetch the lead owner so we can pass user context to HubSpot
                    lead_owner = await User.get_or_none(id=lead.user_id) if lead.user_id else None

                    # Sync outcome to CRM — pass user AND company so both fields update
                    if lead_owner:
                        try:
                            await HubSpotService.update_lead_outcome(
                                user=lead_owner,
                                hubspot_id=lead.hubspot_id,
                                sentiment=sentiment,
                                intent=intent,
                                score=lead.score,
                                transcript=transcript,
                                company=lead.company,   # ← company now flows to HubSpot
                            )
                        except Exception as hs_up_err:
                            print(f"⚠️ HubSpot sync failed: {hs_up_err}")
                    else:
                        print(f"ℹ️ Lead has no owner — skipping HubSpot sync.")
                else:
                    print(f"ℹ️ Test call detected (No CRM Lead attached). Skipping Lead and HubSpot updates.")

            # Safely resolve user_id — lead may be unset if no transcript or test call
            try:
                await call_record.fetch_related("lead")
                _final_lead = call_record.lead
            except Exception:
                _final_lead = None
            user_id = _final_lead.user_id if _final_lead else None

            # 5. Broadcast to your UI Dashboard over Websockets (MOVED OUTSIDE 'if transcript' block)
            await manager.broadcast({
                "type": "CALL_STATUS_UPDATE",
                "user_id": user_id,
                "call_id": vapi_call_id,
                "sentiment": sentiment,
                "intent": intent,
                "lead_score": lead_score_val,
                "status": "completed",
                "duration": duration_seconds,
                "recording_url": recording_url
            })
            print(f"🚀 Dashboard update broadcasted for {vapi_call_id}")

    return {"status": "success"}

    