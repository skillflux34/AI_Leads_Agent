# import re
# from celery import Celery
# from tortoise.expressions import Q
# from models.tortoise_models import Lead
# from services.hubspot_service import HubSpotService
# import asyncio

# celery_app = Celery("tasks", broker="redis://localhost:6379/0")

# @celery_app.task
# def sync_leads_from_hubspot_celery_wrapper():
#     return asyncio.run(sync_leads_from_hubspot())


# def calculate_priority_score(props: dict) -> int:
#     """
#     Assigns an initial priority score to a lead based on HubSpot properties.
#     Higher score = call this lead first.
#     """
#     score = 50  # Base score

#     # +10 if company exists (more serious lead)
#     if props.get("company"):
#         score += 10

#     # +5 if phone exists (reachable)
#     if props.get("phone"):
#         score += 5

#     # Job title scoring (decision maker = higher priority)
#     title = (props.get("jobtitle") or "").lower()
#     if any(t in title for t in ["ceo", "cto", "coo", "founder", "owner", "president", "partner"]):
#         score += 20
#     elif any(t in title for t in ["manager", "director", "head", "vp", "vice president", "lead"]):
#         score += 15
#     elif any(t in title for t in ["developer", "engineer", "analyst", "consultant", "specialist"]):
#         score += 10

#     # HubSpot lead status scoring
#     hs_status = (props.get("hs_lead_status") or "").lower()
#     if hs_status == "new":
#         score += 10
#     elif hs_status in ["in_progress", "open", "connected"]:
#         score += 5
#     elif hs_status in ["unqualified", "bad timing"]:
#         score -= 10

#     return max(0, min(100, score))


# async def sync_leads_from_hubspot():
#     """
#     Syncs leads from HubSpot with phone normalization,
#     deduplication, and priority score assignment.
#     """
#     contacts = await HubSpotService.fetch_new_leads()

#     synced_count = 0
#     for contact in contacts:
#         props = contact.get("properties", {})
#         phone = props.get("phone")
#         hubspot_id = contact.get("id")

#         if not phone:
#             continue

#         # Normalize phone: strip non-digits
#         clean_phone = re.sub(r"\D", "", str(phone))
#         if not clean_phone:
#             continue

#         # Validate length (7–15 digits)
#         if len(clean_phone) < 7 or len(clean_phone) > 15:
#             print(f"⚠️ Malformed number from CRM: {phone} (ID: {hubspot_id}). Removing from HubSpot...")
#             if hubspot_id:
#                 await HubSpotService.delete_lead(hubspot_id)
#             continue

#         if not clean_phone.startswith("+"):
#             clean_phone = f"+{clean_phone}"

#         # Deduplicate: check by HubSpot ID or normalized phone
#         existing_lead = await Lead.filter(
#             Q(hubspot_id=hubspot_id) | Q(phone=clean_phone)
#         ).first()

#         name_str = f"{props.get('firstname', '')} {props.get('lastname', '')}".strip() or "Unknown HubSpot Lead"
#         company_str = props.get("company", "Unknown")

#         if existing_lead:
#             # Update existing record but preserve score if already called
#             existing_lead.name = name_str
#             existing_lead.phone = clean_phone
#             existing_lead.company = company_str
#             existing_lead.hubspot_id = hubspot_id

#             # Only re-score if this lead has never been called (score is still default)
#             if existing_lead.score == 0:
#                 existing_lead.score = calculate_priority_score(props)
#                 print(f"📊 Re-scored {name_str}: {existing_lead.score}")

#             await existing_lead.save()
#             print(f"🔄 Updated lead: {name_str} ({clean_phone})")
#         else:
#             # Calculate initial priority score
#             initial_score = calculate_priority_score(props)

#             await Lead.create(
#                 name=name_str,
#                 phone=clean_phone,
#                 company=company_str,
#                 hubspot_id=hubspot_id,
#                 status="new",
#                 score=initial_score  # ← priority score instead of 0
#             )
#             print(f"✨ Created lead: {name_str} | Score: {initial_score}")

#         synced_count += 1

#     return f"Synced {synced_count} leads."


# ///////////////////////////////////////////////////////////////////////////////



import re
from celery import Celery
from tortoise.expressions import Q
from models.tortoise_models import Lead
from services.hubspot_service import HubSpotService
import asyncio

celery_app = Celery("tasks", broker="redis://localhost:6379/0")

@celery_app.task
def sync_leads_from_hubspot_celery_wrapper():
    return asyncio.run(sync_leads_from_hubspot())


def calculate_priority_score(props: dict) -> int:
    """
    Assigns an initial priority score to a lead based on HubSpot properties.
    Higher score = call this lead first.
    """
    score = 50  # Base score

    # +10 if company exists (more serious lead)
    if props.get("company"):
        score += 10

    # +5 if phone exists (reachable)
    if props.get("phone"):
        score += 5

    # Job title scoring (decision maker = higher priority)
    title = (props.get("jobtitle") or "").lower()
    if any(t in title for t in ["ceo", "cto", "coo", "founder", "owner", "president", "partner"]):
        score += 20
    elif any(t in title for t in ["manager", "director", "head", "vp", "vice president", "lead"]):
        score += 15
    elif any(t in title for t in ["developer", "engineer", "analyst", "consultant", "specialist"]):
        score += 10

    # HubSpot lead status scoring
    hs_status = (props.get("hs_lead_status") or "").lower()
    if hs_status == "new":
        score += 10
    elif hs_status in ["in_progress", "open", "connected"]:
        score += 5
    elif hs_status in ["unqualified", "bad timing"]:
        score -= 10

    return max(0, min(100, score))


async def sync_leads_from_hubspot():
    """
    Syncs leads from HubSpot with phone normalization,
    deduplication, and priority score assignment.
    """
    # Fetch from all HubSpot-connected users
    from models.tortoise_models import User as UserModel
    connected_users = await UserModel.filter(hubspot_connected=True, is_active=True)
    contacts_by_user = {}
    contacts = []
    for u in connected_users:
        try:
            user_contacts = await HubSpotService.fetch_new_leads(u)
            for c in user_contacts:
                contacts_by_user[c.get("id")] = u.id
            contacts.extend(user_contacts)
        except Exception as e:
            print(f"⚠️ HubSpot fetch failed for {u.email}: {e}")

    synced_count = 0
    for contact in contacts:
        props = contact.get("properties", {})
        phone = props.get("phone")
        hubspot_id = contact.get("id")

        if not phone:
            continue

        # Normalize phone: strip non-digits
        clean_phone = re.sub(r"\D", "", str(phone))
        if not clean_phone:
            continue

        # Validate length (7–15 digits)
        if len(clean_phone) < 7 or len(clean_phone) > 15:
            print(f"⚠️ Malformed number from CRM: {phone} (ID: {hubspot_id}). Removing from HubSpot...")
            if hubspot_id:
                await HubSpotService.delete_lead(hubspot_id)
            continue

        if not clean_phone.startswith("+"):
            clean_phone = f"+{clean_phone}"

        # Deduplicate: check by HubSpot ID or normalized phone
        existing_lead = await Lead.filter(
            Q(hubspot_id=hubspot_id) | Q(phone=clean_phone)
        ).first()

        name_str = f"{props.get('firstname', '')} {props.get('lastname', '')}".strip() or "Unknown HubSpot Lead"
        company_str = props.get("company", "Unknown")

        if existing_lead:
            # Update existing record but preserve score if already called
            existing_lead.name = name_str
            existing_lead.phone = clean_phone
            existing_lead.company = company_str
            existing_lead.hubspot_id = hubspot_id

            # Only re-score if this lead has never been called (score is still default)
            if existing_lead.score == 0:
                existing_lead.score = calculate_priority_score(props)
                print(f"📊 Re-scored {name_str}: {existing_lead.score}")

            await existing_lead.save()
            print(f"🔄 Updated lead: {name_str} ({clean_phone})")
        else:
            # Calculate initial priority score
            initial_score = calculate_priority_score(props)

            owner_id = contacts_by_user.get(hubspot_id)
            await Lead.create(
                name=name_str,
                phone=clean_phone,
                company=company_str,
                hubspot_id=hubspot_id,
                status="new",
                score=initial_score,
                user_id=owner_id,
            )
            print(f"✨ Created lead: {name_str} | Score: {initial_score}")

        synced_count += 1

    return f"Synced {synced_count} leads."

