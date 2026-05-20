import asyncio
from datetime import datetime, timezone
from models.tortoise_models import Lead, CallRecord, Assistant
from services.vapi_service import VapiService
from services.timezone_service import is_good_time_to_call, get_next_call_window

vapi_service = VapiService()

async def process_rescheduled_calls():
    """
    Checks every 60 seconds for leads due a rescheduled call.
    - Uses timezone-aware UTC to correctly compare with DB timestamps
    - Pre-registers CallRecords to prevent webhook race conditions
    - Skips calls outside 9 AM - 6 PM lead's local time
    """
    tick = 0
    while True:
        # Wait first — prevents firing stale leads instantly on server startup
        await asyncio.sleep(60)
        tick += 1
        try:
            # ✅ timezone-aware UTC — correctly compares with +05/+00 DB timestamps
            now = datetime.now(timezone.utc)
            print(f"⏱️ Reschedule tick #{tick} at {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")

            due_leads = await Lead.filter(
                status="rescheduled",
                reschedule_time__lte=now
            ).all()

            total_rescheduled = await Lead.filter(status="rescheduled").count()
            print(f"🔍 Rescheduled leads: {total_rescheduled} total, {len(due_leads)} due now")

            for lead in due_leads:
                # Timezone check — skip if outside calling hours
                can_call, reason = is_good_time_to_call(lead.phone)
                if not can_call:
                    next_window = get_next_call_window(lead.phone)
                    print(f"⏰ Skipping {lead.name}: {reason}. Next window: {next_window}")
                    continue

                print(f"✅ Timezone OK for {lead.name}: {reason}")

                # Get active assistant, fallback to newest
                assistant = await Assistant.filter(is_active=True).first()
                if not assistant:
                    assistant = await Assistant.filter().order_by("-id").first()
                if not assistant:
                    print("❌ No assistant found in database, skipping reschedule.")
                    continue

                print(f"📞 Triggering rescheduled call for {lead.name} ({lead.phone}) using '{assistant.name}'")

                # Trigger the outbound call via Vapi
                result = await vapi_service.trigger_outbound_call(
                    phone=lead.phone,
                    lead_name=lead.name,
                    assistant_id=assistant.vapi_assistant_id
                )

                vapi_call_id = result.get("id")

                if vapi_call_id:
                    # Pre-register call record so webhook finds it and links the lead
                    await CallRecord.create(
                        lead=lead,
                        vapi_call_id=vapi_call_id,
                        status="queued"
                    )

                    # Mark lead as called to prevent re-triggering
                    lead.status = "called"
                    lead.reschedule_time = None
                    await lead.save()

                    print(f"✅ Rescheduled call triggered for {lead.name} (Vapi ID: {vapi_call_id})")
                else:
                    print(f"❌ Reschedule failed for {lead.name}: {result}")

        except Exception as e:
            import traceback
            print(f"🔺 Background Reschedule Loop Error: {e}")
            print(traceback.format_exc())  # full stack trace so nothing is silently swallowed

            