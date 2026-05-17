from groq import AsyncGroq
import os
import asyncio
from fastapi import APIRouter, Request
from models.tortoise_models import CallRecord
from api.websocket_manager import manager
from services.hubspot_service import HubSpotService

from services.email_service import EmailService
from services.calendly_service import CalendlyService
from services.ai_logic import AILogicEngine

from datetime import datetime


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

        await manager.broadcast({
            "type": "ACTIVE_CALLS_UPDATE",
            "count": len(active_calls),
            "active_call_ids": list(active_calls),  # ✅ convert set → list for JSON
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
            await manager.broadcast({
                "type": "TRANSCRIPT_UPDATE",
                "text": transcript_text
            })
        return {"status": "streaming"}


    if event_type == "end-of-call-report":
        active_calls.discard(vapi_call_id)

        transcript = (
            data.get("transcript") or
            message.get("transcript") or
            (data.get("artifact") or message.get("artifact") or {}).get("transcript")
        )

        # ✅ Always extract artifact fields regardless of transcript presence
        artifact = (
            data.get("artifact") or
            message.get("artifact") or
            data.get("message", {}).get("artifact") or
            {}
        )
        recording_url = artifact.get("recordingUrl") or data.get("recordingUrl") or message.get("recordingUrl")

        # ✅ Calculate duration from timestamps (Vapi doesn't send durationSeconds)
        started_at = data.get("startedAt") or call_data.get("startedAt") or message.get("startedAt")
        ended_at   = data.get("endedAt")   or call_data.get("endedAt")   or message.get("endedAt")
        duration_seconds = None
        if started_at and ended_at:
            try:
                fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
                start = datetime.strptime(started_at, fmt)
                end   = datetime.strptime(ended_at,   fmt)
                duration_seconds = int((end - start).total_seconds())
            except Exception as e:
                print(f"⚠️ Could not parse duration timestamps: {e}")
        
        print(f"DEBUG artifact keys: {list(artifact.keys())}")

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
            # Extract the reason the call ended from Vapi's response
            ended_reason = data.get("endedReason", "")
            print(f"ℹ️ Call ended reason: {ended_reason} for Call ID: {vapi_call_id}")

            # Specific carrier failure states representing an invalid or dead line
            INVALID_NUMBER_REASONS = ["error-with-carrier", "invalid-number", "network-error"]

            if ended_reason in INVALID_NUMBER_REASONS:
                await call_record.fetch_related("lead")
                lead = call_record.lead

                if lead:
                    print(f"🚨 Invalid number detected ({ended_reason}) for lead: {lead.name} ({lead.phone}). Invalidation sequence triggered...")
                    
                    # A. Remove from HubSpot CRM automatically
                    if lead.hubspot_id:
                        await HubSpotService.delete_lead(lead.hubspot_id)
                    
                    # B. Clear out call records linked to this specific lead to maintain database integrity
                    await CallRecord.filter(lead=lead).delete()
                    
                    # C. Delete the lead from your local database
                    lead_id_for_ui = lead.id
                    lead_name_for_ui = lead.name
                    await lead.delete()
                    print(f"🗑️ Lead {lead_name_for_ui} completely purged from local system due to invalid number.")
                    
                    # D. Notify your Dashboard UI via Websockets to remove the card instantly
                    await manager.broadcast({
                        "type": "LEAD_REMOVED",
                        "lead_id": lead_id_for_ui,
                        "message": f"Removed {lead_name_for_ui} due to an invalid phone number."
                    })
                    
                    # E. Delete standalone orphaned call record and return cleanly
                    await call_record.delete()
                    return {"status": "lead_invalidated_and_purged"}

            # 2. Extract artifact details and update the record (Runs for active valid numbers)
            call_record.recording_url = recording_url
            call_record.duration = int(float(duration_seconds)) if duration_seconds else None
            call_record.status = "completed"
            call_record.transcript = transcript # Ensure the raw transcript gets saved to the DB row
            await call_record.save()
            print(f"✅ Call record {vapi_call_id} marked completed with duration {call_record.duration}s and saved.")

            # 3. Analyze and Process Content
            if transcript:
                print(f"Analyzing sentiment for {vapi_call_id}...")
                sentiment, intent = await analyze_call_content(transcript)

                call_record.sentiment = sentiment
                call_record.intent = intent
                await call_record.save()

                # Fetch associated lead relation if it exists
                await call_record.fetch_related("lead")
                lead = call_record.lead

                # 4. Process Lead-Specific Rules (Only for Real Calls with valid lines)
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

                    # Sync outcome to CRM
                    await HubSpotService.update_lead_outcome(
                        hubspot_id=lead.hubspot_id,
                        sentiment=sentiment,
                        intent=intent,
                        score=lead.score,
                        transcript=transcript
                    )
                    
                    lead_score_val = lead.score
                else:
                    print(f"ℹ️ Test call detected (No CRM Lead attached). Skipping Lead and HubSpot updates.")
                    lead_score_val = 0

                # 5. Broadcast to your UI Dashboard over Websockets
                await manager.broadcast({
                    "type": "CALL_STATUS_UPDATE",
                    "call_id": vapi_call_id,
                    "sentiment": sentiment,
                    "intent": intent,
                    "lead_score": lead_score_val,
                    "status": "completed",
                    "duration": call_record.duration,
                    "recording_url": recording_url
                })
                print(f"🚀 Dashboard update broadcasted for {vapi_call_id}")

    return {"status": "success"}

