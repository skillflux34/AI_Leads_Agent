from fastapi import APIRouter, Depends, HTTPException
from models.tortoise_models import User, Lead, CallRecord
from services.auth_service import require_admin
from pydantic import BaseModel

router = APIRouter()


@router.get("/users")
async def list_users(admin: User = Depends(require_admin)):
    """List all users with their stats."""
    users = await User.all().order_by("-created_at")
    result = []
    for u in users:
        lead_count = await Lead.filter(user_id=u.id).count()
        call_count = await CallRecord.filter(lead__user_id=u.id).count()
        qualified_count = await Lead.filter(user_id=u.id, score__gte=70).count()
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "hubspot_connected": u.hubspot_connected,
            "hubspot_portal_id": u.hubspot_portal_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "stats": {
                "leads": lead_count,
                "calls": call_count,
                "qualified": qualified_count,
            }
        })
    return result


@router.get("/users/{user_id}/leads")
async def get_user_leads(user_id: int, admin: User = Depends(require_admin)):
    """Get all leads for a specific user."""
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    leads = await Lead.filter(user_id=user_id).order_by("-score")
    return [
        {
            "id": l.id,
            "name": l.name,
            "phone": l.phone,
            "company": l.company,
            "status": l.status,
            "score": l.score,
            "reschedule_time": l.reschedule_time.isoformat() if l.reschedule_time else None,
        }
        for l in leads
    ]


@router.get("/users/{user_id}/calls")
async def get_user_calls(user_id: int, admin: User = Depends(require_admin)):
    """Get all call records for a specific user."""
    records = await CallRecord.filter(
        lead__user_id=user_id
    ).prefetch_related("lead").order_by("-created_at")

    return [
        {
            "id": r.id,
            "vapi_call_id": r.vapi_call_id,
            "status": r.status,
            "sentiment": r.sentiment,
            "intent": r.intent,
            "duration": r.duration,
            "recording_url": r.recording_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "lead": {
                "id": r.lead.id,
                "name": r.lead.name,
                "phone": r.lead.phone,
            } if r.lead else None
        }
        for r in records
    ]


@router.get("/overview")
async def admin_overview(admin: User = Depends(require_admin)):
    """High-level stats across all users."""
    total_users = await User.filter(role="user").count()
    active_users = await User.filter(role="user", is_active=True).count()
    hubspot_connected = await User.filter(hubspot_connected=True).count()
    total_leads = await Lead.all().count()
    total_calls = await CallRecord.all().count()
    qualified_leads = await Lead.filter(score__gte=70).count()
    completed_calls = await CallRecord.filter(status="completed").count()

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "hubspot_connected": hubspot_connected,
        },
        "leads": {
            "total": total_leads,
            "qualified": qualified_leads,
        },
        "calls": {
            "total": total_calls,
            "completed": completed_calls,
        }
    }


class UserUpdateRequest(BaseModel):
    is_active: bool = None
    role: str = None


@router.patch("/users/{user_id}")
async def update_user(user_id: int, data: UserUpdateRequest, admin: User = Depends(require_admin)):
    """Enable/disable user or change role."""
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        if data.role not in ["admin", "user"]:
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")
        user.role = data.role

    await user.save()
    return {"status": "success", "message": f"User {user.email} updated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: User = Depends(require_admin)):
    """Delete a user and all their data."""
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")

    await Lead.filter(user_id=user_id).delete()
    await user.delete()
    return {"status": "success", "message": f"User {user.email} and their data deleted"}

