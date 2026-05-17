from fastapi import APIRouter, HTTPException
from models.tortoise_models import Lead
from workers.tasks import sync_leads_from_hubspot
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class LeadSchema(BaseModel):
    name: str
    phone: str
    company: str = None
    score: int = 0

class RescheduleRequest(BaseModel):
    lead_id: int
    reschedule_time: datetime  # ISO format from frontend e.g. "2026-05-15T14:00:00"

@router.post("/")
async def create_lead(lead_data: LeadSchema):
    existing = await Lead.filter(phone=lead_data.phone).first()
    if existing:
        return {"message": "Lead already exists", "id": existing.id}
    lead = await Lead.create(**lead_data.dict())
    return lead

@router.get("/queue")
async def get_lead_queue():
    try:
        leads = await Lead.all().order_by("-score")
        return leads
    except Exception as e:
        print(f"CRASH IN QUEUE: {e}")
        return {"error": str(e)}

@router.get("/qualified")
async def get_qualified_leads():
    """Returns all leads with score >= 70, sorted by score descending."""
    try:
        leads = await Lead.filter(score__gte=70).order_by("-score")
        return leads
    except Exception as e:
        print(f"CRASH IN QUALIFIED: {e}")
        return {"error": str(e)}

@router.post("/sync")
async def trigger_hubspot_sync():
    await sync_leads_from_hubspot()
    return {"message": "Sync complete"}

@router.post("/reschedule")
async def reschedule_lead(data: RescheduleRequest):
    lead = await Lead.filter(id=data.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = "rescheduled"
    lead.reschedule_time = data.reschedule_time
    await lead.save()

    return {
        "status": "success",
        "message": f"Call rescheduled for {lead.name} at {data.reschedule_time}"
    }

@router.get("/rescheduled")
async def get_rescheduled_leads():
    """Fetch all leads pending a rescheduled call — for dashboard display."""
    leads = await Lead.filter(status="rescheduled").order_by("reschedule_time")
    return leads


    