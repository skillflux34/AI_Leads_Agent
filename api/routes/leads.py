# from fastapi import APIRouter, HTTPException, Depends
# from models.tortoise_models import Lead, User
# from pydantic import BaseModel
# from datetime import datetime
# from services.auth_service import get_current_user  
# from services.hubspot_service import HubSpotService 

# router = APIRouter()

# class LeadSchema(BaseModel):
#     name: str
#     phone: str
#     company: str = None
#     score: int = 0

# class RescheduleRequest(BaseModel):
#     lead_id: int
#     reschedule_time: datetime  


# @router.post("/")
# async def create_lead(lead_data: LeadSchema, current_user: User = Depends(get_current_user)):
#     existing = await Lead.filter(phone=lead_data.phone, user_id=current_user.id).first()
#     if existing:
#         return {"message": "Lead already exists", "id": existing.id}
    
#     lead = await Lead.create(**lead_data.dict(), user_id=current_user.id)
#     return lead


# @router.get("/queue")
# async def get_lead_queue(user_id: int = None, current_user: User = Depends(get_current_user)):
#     try:
#         # If an admin explicitly requests a specific user's leads, allow it
#         if current_user.role == "admin" and user_id is not None:
#             leads = await Lead.filter(user_id=user_id).order_by("-score")
#         elif current_user.role == "admin":
#             # Admin default view without selection: see absolutely everything
#             leads = await Lead.all().order_by("-score")
#         else:
#             # Standard multi-tenant isolation for regular users
#             leads = await Lead.filter(user_id=current_user.id).order_by("-score")
#         return leads
#     except Exception as e:
#         print(f"CRASH IN QUEUE: {e}")
#         return {"error": str(e)}


# @router.get("/qualified")
# async def get_qualified_leads(user_id: int = None, current_user: User = Depends(get_current_user)):
#     try:
#         if current_user.role == "admin" and user_id is not None:
#             leads = await Lead.filter(score__gte=70, user_id=user_id).order_by("-score")
#         elif current_user.role == "admin":
#             leads = await Lead.filter(score__gte=70).order_by("-score")
#         else:
#             leads = await Lead.filter(score__gte=70, user_id=current_user.id).order_by("-score")
#         return leads
#     except Exception as e:
#         print(f"CRASH IN QUALIFIED: {e}")
#         return {"error": str(e)}


# @router.post("/sync")
# async def trigger_hubspot_sync(current_user: User = Depends(get_current_user)):
#     """Fetches real-time leads from HubSpot isolated STRICTLY to the current logged-in portal."""
#     try:
#         hubspot_contacts = await HubSpotService.fetch_new_leads(current_user)
        
#         synced_count = 0
#         for contact in hubspot_contacts:
#             properties = contact.get("properties", {})
#             first_name = properties.get("firstname", "")
#             last_name = properties.get("lastname", "")
#             full_name = f"{first_name} {last_name}".strip() or "Unknown HubSpot Lead"
#             phone = properties.get("phone")
#             company = properties.get("company", "")
            
#             if not phone:
#                 continue  
                
#             # 🔍 FIX: Check globally across the entire database for this phone number
#             # to respect the unique constraint in tortoise_models.py
#             existing_lead = await Lead.filter(phone=phone).first()
            
#             if not existing_lead:
#                 # If it doesn't exist anywhere, safe to create a brand new lead row
#                 await Lead.create(
#                     user_id=current_user.id,
#                     name=full_name,
#                     phone=phone,
#                     company=company,
#                     score=0
#                 )
#                 synced_count += 1
#             else:
#                 # 🔄 OPTIONAL: If it exists globally but doesn't have an owner,
#                 # you can optionally assign it to the current user syncing it
#                 if existing_lead.user_id is None:
#                     existing_lead.user_id = current_user.id
#                     await existing_lead.save()
#                     synced_count += 1
                
#         return {"message": "Sync complete", "new_leads_synced": synced_count}
        
#     except Exception as e:
#         print(f"CRASH IN CRM SYNC: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to sync with HubSpot: {str(e)}")
    
        
#     except Exception as e:
#         print(f"CRASH IN CRM SYNC: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to sync with HubSpot: {str(e)}")


# @router.post("/reschedule")
# async def reschedule_lead(data: RescheduleRequest, current_user: User = Depends(get_current_user)):
#     # 🔑 Admin Check: Admins can reschedule any lead, users can only reschedule theirs
#     if current_user.role == "admin":
#         lead = await Lead.filter(id=data.lead_id).first()
#     else:
#         lead = await Lead.filter(id=data.lead_id, user_id=current_user.id).first()
        
#     if not lead:
#         raise HTTPException(status_code=404, detail="Lead not found")

#     lead.status = "rescheduled"
#     lead.reschedule_time = data.reschedule_time
#     await lead.save()

#     return {
#         "status": "success",
#         "message": f"Call rescheduled for {lead.name} at {data.reschedule_time}"
#     }


# @router.get("/rescheduled")
# async def get_rescheduled_leads(current_user: User = Depends(get_current_user)):
#     """Fetch all pending rescheduled calls. Admins see all; users see theirs."""
#     # 🔑 Admin Check
#     if current_user.role == "admin":
#         leads = await Lead.filter(status="rescheduled").order_by("reschedule_time")
#     else:
#         leads = await Lead.filter(status="rescheduled", user_id=current_user.id).order_by("reschedule_time")
#     return leads


# ////////////////////////////////////////////////////////////////////////////////



from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from models.tortoise_models import Lead, User
from pydantic import BaseModel
from datetime import datetime
from services.auth_service import get_current_user  
from services.hubspot_service import HubSpotService
from workers.tasks import calculate_priority_score
import csv
import io
 
router = APIRouter()
 
class LeadSchema(BaseModel):
    name: str
    phone: str
    company: str = None
    email: str = None
    score: int = 0
 
class RescheduleRequest(BaseModel):
    lead_id: int
    reschedule_time: datetime  
 
class SingleLeadRequest(BaseModel):
    name: str
    phone: str
    company: str = None
    email: str = None
 
# Add this schema near your other Pydantic models (e.g., next to LeadSchema)
class LeadUpdateSchema(BaseModel):
    name: str
    phone: str
    company: str = None
    email: str = None

 
async def push_to_hubspot(user: User, lead_data: dict) -> str | None:
    """Push a single lead to HubSpot as a contact. Returns hubspot_id or None.
    
    Sends: firstname, lastname, phone, email, company (when non-empty),
    and hs_lead_status: NEW so the Lead Status column is populated immediately.
    """
    if not user.hubspot_connected:
        return None
    try:
        from api.routes.hubspot_oauth import get_user_hubspot_token
        import httpx
        token = await get_user_hubspot_token(user)

        # Build properties — only include company when it has a real value so we
        # never overwrite an existing HubSpot company name with an empty string.
        properties: dict = {
            "firstname": lead_data.get("name", "").split(" ")[0],
            "lastname": " ".join(lead_data.get("name", "").split(" ")[1:]) or "",
            "phone": lead_data.get("phone", ""),
            "email": lead_data.get("email", "") or "",
            "hs_lead_status": "NEW",   # Populate Lead Status column from day one
        }
        company = lead_data.get("company") or ""
        if company.strip():
            properties["company"] = company.strip()

        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.hubapi.com/crm/v3/objects/contacts",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"properties": properties},
            )
            if res.status_code in [200, 201]:
                hubspot_id = str(res.json().get("id"))
                print(f"✅ HubSpot contact created: {lead_data.get('name')} → ID {hubspot_id}")

                # Associate a Company object so 'Primary company' column populates
                if company.strip():
                    hs_headers = {
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    }
                    await HubSpotService.associate_company(
                        client, hs_headers, hubspot_id, company
                    )

                return hubspot_id
            print(f"⚠️ HubSpot contact creation failed: {res.status_code} {res.text}")
    except Exception as e:
        print(f"⚠️ HubSpot push failed: {e}")
    return None
 
 
@router.post("/")
async def create_lead(lead_data: LeadSchema, current_user: User = Depends(get_current_user)):
    existing = await Lead.filter(phone=lead_data.phone, user_id=current_user.id).first()
    if existing:
        return {"message": "Lead already exists", "id": existing.id}
    lead = await Lead.create(**lead_data.dict(), user_id=current_user.id)
    return lead
 
 
@router.get("/queue")
async def get_lead_queue(user_id: int = Query(None), current_user: User = Depends(get_current_user)):
    try:
        if current_user.role == "admin" and user_id is not None:
            leads = await Lead.filter(user_id=user_id).order_by("-score")
        elif current_user.role == "admin":
            leads = await Lead.all().order_by("-score")
        else:
            leads = await Lead.filter(user_id=current_user.id).order_by("-score")
        return [
            {
                "id": l.id, "name": l.name, "phone": l.phone,
                "company": l.company, "status": l.status,
                "score": int(l.score or 0),
                "reschedule_time": l.reschedule_time.isoformat() if l.reschedule_time else None,
                "hubspot_id": l.hubspot_id,
            }
            for l in leads
        ]
    except Exception as e:
        print(f"CRASH IN QUEUE: {e}")
        return {"error": str(e)}
 
 
@router.get("/qualified")
async def get_qualified_leads(user_id: int = Query(None), current_user: User = Depends(get_current_user)):
    try:
        if current_user.role == "admin" and user_id is not None:
            leads = await Lead.filter(score__gte=70, user_id=user_id).order_by("-score")
        elif current_user.role == "admin":
            leads = await Lead.filter(score__gte=70).order_by("-score")
        else:
            leads = await Lead.filter(score__gte=70, user_id=current_user.id).order_by("-score")
        return [
            {
                "id": l.id, "name": l.name, "phone": l.phone,
                "company": l.company, "status": l.status,
                "score": int(l.score or 0),
                "reschedule_time": l.reschedule_time.isoformat() if l.reschedule_time else None,
                "hubspot_id": l.hubspot_id,
            }
            for l in leads
        ]
    except Exception as e:
        print(f"CRASH IN QUALIFIED: {e}")
        return {"error": str(e)}
 
 
@router.post("/sync")
async def trigger_hubspot_sync(current_user: User = Depends(get_current_user)):
    """Fetches real-time leads from HubSpot isolated STRICTLY to the current logged-in portal."""
    try:
        hubspot_contacts = await HubSpotService.fetch_new_leads(current_user)
        synced_count = 0
        updated_count = 0

        for contact in hubspot_contacts:
            properties = contact.get("properties", {})
            first_name = properties.get("firstname", "") or ""
            last_name  = properties.get("lastname",  "") or ""
            full_name  = f"{first_name} {last_name}".strip() or "Unknown HubSpot Lead"
            phone      = properties.get("phone")
            company    = properties.get("company") or ""
            hubspot_id = contact.get("id")          # HubSpot's own contact ID

            if not phone:
                continue

            existing_lead = await Lead.filter(phone=phone).first()

            if not existing_lead:
                # Brand-new lead — create locally
                await Lead.create(
                    user_id=current_user.id,
                    name=full_name,
                    phone=phone,
                    company=company or None,
                    hubspot_id=hubspot_id,           # ← store HubSpot ID immediately
                    score=calculate_priority_score(properties),
                )
                synced_count += 1
            else:
                # Lead already exists — update fields that may have changed in HubSpot
                changed = False

                # Always write back the hubspot_id if it was missing
                if not existing_lead.hubspot_id and hubspot_id:
                    existing_lead.hubspot_id = hubspot_id
                    changed = True

                # Sync company from HubSpot if our DB has it blank
                if company and not existing_lead.company:
                    existing_lead.company = company
                    changed = True

                # Assign owner if the lead is currently unowned
                if existing_lead.user_id is None:
                    existing_lead.user_id = current_user.id
                    changed = True

                if changed:
                    await existing_lead.save()
                    updated_count += 1

        return {
            "message": "Sync complete",
            "new_leads_synced": synced_count,
            "existing_leads_updated": updated_count,
        }
    except Exception as e:
        print(f"CRASH IN CRM SYNC: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync with HubSpot: {str(e)}")

 
@router.post("/reschedule")
async def reschedule_lead(data: RescheduleRequest, current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        lead = await Lead.filter(id=data.lead_id).first()
    else:
        lead = await Lead.filter(id=data.lead_id, user_id=current_user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = "rescheduled"
    lead.reschedule_time = data.reschedule_time
    await lead.save()
    return {"status": "success", "message": f"Call rescheduled for {lead.name} at {data.reschedule_time}"}
 
 
@router.get("/rescheduled")
async def get_rescheduled_leads(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        leads = await Lead.filter(status="rescheduled").order_by("reschedule_time")
    else:
        leads = await Lead.filter(status="rescheduled", user_id=current_user.id).order_by("reschedule_time")
    return [
        {
            "id": l.id, "name": l.name, "phone": l.phone,
            "company": l.company, "status": l.status,
            "score": int(l.score or 0),
            "reschedule_time": l.reschedule_time.isoformat() if l.reschedule_time else None,
            "hubspot_id": l.hubspot_id,
        }
        for l in leads
    ]
 
 
@router.post("/upload-single")
async def upload_single_lead(data: SingleLeadRequest, current_user: User = Depends(get_current_user)):
    """Add a single lead manually, push to HubSpot if connected."""
    existing = await Lead.filter(phone=data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Phone {data.phone} already exists")
 
    lead_data = {"name": data.name, "phone": data.phone, "company": data.company, "email": data.email}
    hubspot_id = await push_to_hubspot(current_user, lead_data)
 
    lead = await Lead.create(
        user_id=current_user.id,
        name=data.name,
        phone=data.phone,
        company=data.company,
        status="new",
        score=calculate_priority_score({
            "company": data.company,
            "phone": data.phone,
            "jobtitle": "",
            "hs_lead_status": "new"
        }),
        hubspot_id=hubspot_id,
    )
    hs_note = " and synced to HubSpot" if hubspot_id else ""
    print(f"✅ Lead created{hs_note}: {lead.name} ({lead.phone})")
    return {"status": "success", "id": lead.id, "hubspot_id": hubspot_id, "message": f"'{lead.name}' added{hs_note}"}
 
 
@router.post("/upload-csv")
async def upload_csv_leads(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Bulk import leads from CSV. Expected columns: name, phone, company, email"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")
 
    contents = await file.read()
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")
 
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV is empty or malformed")
 
    headers = {h.strip().lower() for h in reader.fieldnames}
    if not {"name", "phone"}.issubset(headers):
        raise HTTPException(status_code=400, detail="CSV must have 'name' and 'phone' columns")
 
    success_count = 0
    failed_count = 0
    errors = []
 
    for i, row in enumerate(reader, start=2):
        row = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
        name = row.get("name", "")
        phone = row.get("phone", "")
        company = row.get("company", "")
        email = row.get("email", "")
 
        if not name or not phone:
            errors.append(f"Row {i}: missing name or phone")
            failed_count += 1
            continue
 
        existing = await Lead.filter(phone=phone).first()
        if existing:
            errors.append(f"Row {i}: {phone} already exists")
            failed_count += 1
            continue
 
        lead_data = {"name": name, "phone": phone, "company": company, "email": email}
        hubspot_id = await push_to_hubspot(current_user, lead_data)
 
        try:
            await Lead.create(
                user_id=current_user.id,
                name=name,
                phone=phone,
                company=company or None,
                status="new",
                score=calculate_priority_score({
                    "company": company,
                    "phone": phone,
                    "jobtitle": "",
                    "hs_lead_status": "new"
                }),
                hubspot_id=hubspot_id,
            )
            success_count += 1
            print(f"✅ Imported: {name} ({phone})" + (f" → HubSpot {hubspot_id}" if hubspot_id else ""))
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
            failed_count += 1
 
    return {
        "status": "success" if success_count > 0 else "failed",
        "success": success_count,
        "failed": failed_count,
        "errors": errors[:10],
        "message": f"{success_count} lead(s) imported, {failed_count} skipped"
    }


@router.put("/{lead_id}")
async def update_lead(lead_id: int, data: LeadUpdateSchema, current_user: User = Depends(get_current_user)):
    # 1. Fetch the lead matching authorization rules
    if current_user.role == "admin":
        lead = await Lead.filter(id=lead_id).first()
    else:
        lead = await Lead.filter(id=lead_id, user_id=current_user.id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 2. Update local database fields
    lead.name = data.name
    lead.phone = data.phone
    lead.company = data.company or None
    lead.email = data.email
    await lead.save()

    # 3. Push updates to HubSpot
    if current_user.hubspot_connected:
        try:
            from api.routes.hubspot_oauth import get_user_hubspot_token
            import httpx
            token = await get_user_hubspot_token(current_user)
            
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                
                # Fallback: Find matching HubSpot contact if ID is empty
                if not lead.hubspot_id:
                    search_url = "https://api.hubapi.com/crm/v3/objects/contacts/search"
                    search_payload = {
                        "filterGroups": [{
                            "filters": [{"propertyName": "phone", "operator": "EQ", "value": lead.phone}]
                        }]
                    }
                    search_res = await client.post(search_url, headers=headers, json=search_payload)
                    if search_res.status_code == 200:
                        results = search_res.json().get("results", [])
                        if results:
                            lead.hubspot_id = results[0]["id"]
                            await lead.save()

                # Execute update if linked
                if lead.hubspot_id:
                    # Map internal DB status values to HubSpot's hs_lead_status enum.
                    # HubSpot only accepts: NEW, IN_PROGRESS, OPEN, CONNECTED,
                    # UNQUALIFIED, ATTEMPTED_TO_CONTACT, BAD_TIMING
                    STATUS_MAP = {
                        "new":         "NEW",
                        "qualified":   "CONNECTED",
                        "cold":        "UNQUALIFIED",
                        "rescheduled": "IN_PROGRESS",
                        "handoff":     "CONNECTED",
                        "called":      "IN_PROGRESS",
                    }
                    hs_lead_status = STATUS_MAP.get(
                        (lead.status or "new").lower(), "NEW"
                    )

                    # Only send company when it has a real value.
                    # Sending "" would overwrite an existing company name in HubSpot with blank.
                    contact_properties = {
                        "firstname": data.name.split(" ")[0],
                        "lastname": " ".join(data.name.split(" ")[1:]) or "",
                        "phone": data.phone,
                        "email": data.email or "",
                        "hs_lead_status": hs_lead_status,
                    }
                    if data.company and data.company.strip():
                        contact_properties["company"] = data.company.strip()

                    res = await client.patch(
                        f"https://api.hubapi.com/crm/v3/objects/contacts/{lead.hubspot_id}",
                        headers=headers,
                        json={"properties": contact_properties},
                    )

                    if res.status_code == 200:
                        print(f"✅ Synced to HubSpot → status={hs_lead_status}, company={data.company!r}")
                        # Associate Company object so 'Primary company' column populates
                        if data.company and data.company.strip():
                            await HubSpotService.associate_company(
                                client, headers, lead.hubspot_id, data.company
                            )
                    else:
                        print(f"⚠️ HubSpot PATCH failed: {res.status_code} - {res.text}")
                else:
                    print(f"ℹ️ Could not sync: No matching contact profile found on HubSpot.")

        except Exception as e:
            print(f"⚠️ Failed syncing update properties to HubSpot: {e}")

    return {"status": "success", "message": "Lead updated locally and inside HubSpot", "lead_id": lead.id}


@router.delete("/{lead_id}")
async def delete_lead(lead_id: int, current_user: User = Depends(get_current_user)):
    # 1. Locate authorization scope
    if current_user.role == "admin":
        lead = await Lead.filter(id=lead_id).first()
    else:
        lead = await Lead.filter(id=lead_id, user_id=current_user.id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 2. If tracked in CRM, call HubSpot DELETE first
    if current_user.hubspot_connected and lead.hubspot_id:
        try:
            from api.routes.hubspot_oauth import get_user_hubspot_token
            import httpx
            token = await get_user_hubspot_token(current_user)
            
            async with httpx.AsyncClient() as client:
                res = await client.delete(
                    f"https://api.hubapi.com/crm/v3/objects/contacts/{lead.hubspot_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if res.status_code not in [200, 204]:
                    print(f"⚠️ HubSpot deletion call returned status: {res.status_code}")
        except Exception as e:
            print(f"⚠️ Failed deleting contact tracking from HubSpot: {e}")

    # 3. Clean up and remove from local DB database
    await lead.delete()
    return {"status": "success", "message": "Lead deleted from database and HubSpot successfully"}

