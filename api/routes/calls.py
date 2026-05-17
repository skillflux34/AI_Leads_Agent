from fastapi import APIRouter, HTTPException
from models.tortoise_models import Lead, CallRecord, Assistant
from services.vapi_service import VapiService
from services.timezone_service import is_good_time_to_call, get_next_call_window
from pydantic import BaseModel
import json
import httpx
import os

router = APIRouter()
vapi = VapiService()


@router.post("/trigger/{lead_id}")
async def trigger_call(lead_id: int):
    lead = await Lead.get_or_none(id=lead_id)
    if not lead:
        print(f"DEBUG: Lead {lead_id} not found in database.")
        return {"error": "Lead not found"}
    
    # ✅ Timezone check BEFORE calling
    can_call, reason = is_good_time_to_call(lead.phone)
    if not can_call:
        next_window = get_next_call_window(lead.phone)
        print(f"⏰ Skipping call for {lead.name}: {reason}")
        return {
            "error": "Outside calling hours",
            "reason": reason,
            "next_call_window": next_window
        }

    print(f"✅ Timezone OK: {reason}")

    print(f"DEBUG: Attempting to trigger call for {lead.name} at {lead.phone}...")

    # Use active assistant, fallback to most recently created
    assistant = await Assistant.filter(is_active=True).first()
    if not assistant:
        assistant = await Assistant.all().order_by("-id").first()
    if not assistant:
        return {"error": "No assistant found. Create and activate one first."}

    print(f"DEBUG: Using assistant '{assistant.name}' (active={assistant.is_active})")

    response = await vapi.trigger_outbound_call(lead.phone, lead.name, assistant.vapi_assistant_id)

    print("DEBUG: Vapi Response:", json.dumps(response, indent=2))

    vapi_id = response.get("id")
    if not vapi_id:
        print("DEBUG: Call creation failed. No ID returned from Vapi.")
        return {"error": "Vapi failed to initiate call", "details": response}

    new_record = await CallRecord.create(
        lead=lead,
        vapi_call_id=vapi_id,
        status="queued"
    )
    print(f"✅ Record {new_record.id} created for Vapi ID: {vapi_id}")
    return response


@router.get("/logs")
async def get_call_logs():
    """Returns all call records with lead info, sorted newest first."""
    try:
        records = await CallRecord.exclude(lead_id=None).prefetch_related("lead").order_by("-created_at")

        result = []
        for r in records:
            result.append({
                "id": r.id,
                "vapi_call_id": r.vapi_call_id,
                "status": r.status,
                "sentiment": r.sentiment,
                "intent": r.intent,
                "transcript": r.transcript,
                "recording_url": r.recording_url,
                "duration": r.duration,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                # FIX: Check for the pre-fetched 'r.lead' instance object directly
                "lead": {
                    "id": r.lead.id,
                    "name": r.lead.name,
                    "phone": r.lead.phone,
                    "company": r.lead.company,
                    "score": r.lead.score,
                    "status": r.lead.status,
                } if r.lead else None
            })
            
        return result
    except Exception as e:
        print(f"❌ CRASH IN GET_CALL_LOGS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{call_id}")
async def get_call_detail(call_id: int):
    """Returns full detail for a single call including transcript."""
    record = await CallRecord.get_or_none(id=call_id).prefetch_related("lead")
    if not record:
        raise HTTPException(status_code=404, detail="Call record not found")

    return {
        "id": record.id,
        "vapi_call_id": record.vapi_call_id,
        "status": record.status,
        "sentiment": record.sentiment,
        "intent": record.intent,
        "transcript": record.transcript,
        "recording_url": record.recording_url,
        "duration": record.duration,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "lead": {
            "id": record.lead.id,
            "name": record.lead.name,
            "phone": record.lead.phone,
            "company": record.lead.company,
            "score": record.lead.score,
            "status": record.lead.status,
        } if record.lead_id else None
    }


@router.get("/logs/{call_id}/recording")
async def get_recording_url(call_id: int):
    """
    Returns recording URL for a call.
    If not saved in DB, fetches it live from Vapi API.
    """
    record = await CallRecord.get_or_none(id=call_id)
    if not record:
        raise HTTPException(status_code=404, detail="Call record not found")

    if record.recording_url:
        return {"recording_url": record.recording_url}

    if not record.vapi_call_id:
        raise HTTPException(status_code=404, detail="No Vapi call ID found")

    try:
        headers = {
            "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.vapi.ai/call/{record.vapi_call_id}",
                headers=headers
            )
            vapi_data = response.json()

        recording_url = (
            vapi_data.get("artifact", {}).get("recordingUrl") or
            vapi_data.get("recordingUrl")
        )

        if recording_url:
            record.recording_url = recording_url
            await record.save()
            return {"recording_url": recording_url}

        return {"recording_url": None, "message": "Recording not available yet"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vapi fetch error: {str(e)}")


class CallRegister(BaseModel):
    vapi_call_id: str
    assistant_id: str | None = None


@router.post("/register")
async def register_call(data: CallRegister):
    """Creates a placeholder call record for test calls from the browser."""
    record = await CallRecord.create(
        vapi_call_id=data.vapi_call_id,
        status="in-progress",
    )
    print(f"✅ Registered test call in DB: {data.vapi_call_id}")
    return {"status": "registered", "id": record.id}

    