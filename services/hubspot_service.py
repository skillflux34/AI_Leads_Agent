import httpx
from core.config import settings
from models.tortoise_models import User
from api.routes.hubspot_oauth import get_user_hubspot_token

class HubSpotService:

    @staticmethod
    async def associate_company(
        client: httpx.AsyncClient,
        headers: dict,
        contact_id: str,
        company_name: str,
    ) -> None:
        """
        Finds or creates a HubSpot Company object by name, then associates
        it with the given contact. This is what populates the 'Primary company'
        column in the HubSpot Contacts list view.

        The plain `company` text property on a Contact only fills the 'Company name'
        field inside the contact record — it does NOT populate the list-view column.
        That column requires a real Company object association (associationTypeId=1).
        """
        company_name = company_name.strip()
        if not company_name:
            return

        # Step 1 — Search for an existing Company object with this name
        search_res = await client.post(
            "https://api.hubapi.com/crm/v3/objects/companies/search",
            headers=headers,
            json={
                "filterGroups": [{
                    "filters": [{
                        "propertyName": "name",
                        "operator": "EQ",
                        "value": company_name,
                    }]
                }],
                "properties": ["name"],
                "limit": 1,
            },
        )

        if search_res.status_code == 200 and search_res.json().get("results"):
            company_id = search_res.json()["results"][0]["id"]
            print(f"🏢 Found existing HubSpot company '{company_name}' → ID {company_id}")
        else:
            # Step 2 — Create a new Company object
            create_res = await client.post(
                "https://api.hubapi.com/crm/v3/objects/companies",
                headers=headers,
                json={"properties": {"name": company_name}},
            )
            if create_res.status_code not in (200, 201):
                print(f"❌ Failed to create HubSpot company: {create_res.status_code} {create_res.text}")
                return
            company_id = create_res.json()["id"]
            print(f"🏢 Created new HubSpot company '{company_name}' → ID {company_id}")

        # Step 3 — Associate the Company object with the Contact
        # associationTypeId 1 = contact → company (HUBSPOT_DEFINED)
        assoc_res = await client.put(
            f"https://api.hubapi.com/crm/v4/objects/contacts/{contact_id}"
            f"/associations/companies/{company_id}",
            headers=headers,
            json=[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 1}],
        )
        if assoc_res.status_code in (200, 201):
            print(f"✅ Contact {contact_id} associated with company '{company_name}' (ID {company_id})")
        else:
            print(f"❌ Company association failed: {assoc_res.status_code} {assoc_res.text}")

    @staticmethod
    async def fetch_new_leads(user: User): # 1. Accept the user object here
        """Fetches leads matching the specific logged-in user's portal."""
        try:
            # 2. Get the dynamically verified/refreshed access token
            access_token = await get_user_hubspot_token(user)
        except Exception as e:
            print(f"⚠️ Could not fetch leads: {e}")
            return []

        url = "https://api.hubapi.com/crm/v3/objects/contacts"
        headers = {
            "Authorization": f"Bearer {access_token}", # 3. Inject the dynamic token
            "Content-Type": "application/json"
        }
        params = {
            "properties": "firstname,lastname,phone,company,hs_lead_status",
            "limit": 50
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                return response.json().get("results", [])
            print(f"❌ HubSpot fetch failed: {response.status_code} {response.text}")
            return []

    @staticmethod
    async def update_lead_outcome(
        user: User,
        hubspot_id: str,
        sentiment: str,
        intent: str,
        score: int,
        transcript: str,
        company: str = None,
    ):
        """Updates lead outcome on the user's specific HubSpot portal.
        
        Sends: hs_lead_status, company (if provided), and creates a call summary note.
        """
        if not hubspot_id:
            print("⚠️ No HubSpot ID, skipping CRM update")
            return

        try:
            access_token = await get_user_hubspot_token(user)
        except Exception as e:
            print(f"⚠️ Could not update lead: {e}")
            return

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            # Step 1: Determine hs_lead_status from score
            if score >= 70:
                hs_status = "CONNECTED"
            elif score <= 30:
                hs_status = "UNQUALIFIED"
            else:
                hs_status = "IN_PROGRESS"

            # Build the contact properties payload.
            # Always send hs_lead_status. Include company only when it has a real
            # value so we never accidentally blank it out in HubSpot.
            contact_properties: dict = {"hs_lead_status": hs_status}
            if company and company.strip():
                contact_properties["company"] = company.strip()

            url = f"https://api.hubapi.com/crm/v3/objects/contacts/{hubspot_id}"
            patch_res = await client.patch(
                url,
                json={"properties": contact_properties},
                headers=headers,
            )
            # HubSpot returns 200 for a successful PATCH on contacts
            if patch_res.status_code == 200:
                print(f"✅ HubSpot contact updated → status={hs_status}, company={company!r}")
                # Also associate a Company object so 'Primary company' column populates
                if company and company.strip():
                    await HubSpotService.associate_company(
                        client, headers, hubspot_id, company
                    )
            else:
                print(f"❌ HubSpot contact PATCH failed: {patch_res.status_code} {patch_res.text}")

            # Step 2: Create a note with transcript + analysis
            note_body = (
                f"📞 AI Call Summary\n"
                f"Sentiment: {sentiment}\n"
                f"Intent: {intent}\n"
                f"Lead Score: {score}/100\n\n"
                f"Transcript:\n{transcript[:3000]}"
            )

            note_response = await client.post(
                "https://api.hubapi.com/crm/v3/objects/notes",
                json={
                    "properties": {
                        "hs_note_body": note_body,
                        "hs_timestamp": str(int(__import__("time").time() * 1000))
                    },
                    "associations": [
                        {
                            "to": {"id": hubspot_id},
                            "types": [
                                {
                                    "associationCategory": "HUBSPOT_DEFINED",
                                    "associationTypeId": 202  # note → contact
                                }
                            ]
                        }
                    ]
                },
                headers=headers
            )

            if note_response.status_code in [200, 201]:
                print(f"✅ HubSpot note created for contact {hubspot_id}")
            else:
                print(f"❌ HubSpot note failed: {note_response.status_code} {note_response.text}")

    
    @staticmethod
    async def update_lead(user: User, hubspot_id: str, update_data: dict):
        """Updates an existing contact in HubSpot with changed properties."""
        if not hubspot_id:
            print("⚠️ No HubSpot ID provided for update sync.")
            return False

        try:
            access_token = await get_user_hubspot_token(user)
        except Exception as e:
            print(f"⚠️ Could not refresh HubSpot token for update: {e}")
            return False

        url = f"https://api.hubapi.com/crm/v3/objects/contacts/{hubspot_id}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        # Build the properties payload HubSpot expects
        properties = {}
        if "name" in update_data:
            # Simple split if your DB stores full name in one field
            parts = update_data["name"].split(" ", 1)
            properties["firstname"] = parts[0]
            properties["lastname"] = parts[1] if len(parts) > 1 else ""
        
        if "phone" in update_data:
            properties["phone"] = update_data["phone"]
            
        if "company" in update_data:
            properties["company"] = update_data["company"]

        if "email" in update_data:
            properties["email"] = update_data["email"]

        payload = {"properties": properties}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.patch(url, headers=headers, json=payload)
                if response.status_code in [200, 202]:
                    print(f"✅ Successfully updated lead {hubspot_id} in HubSpot.")
                    return True
                else:
                    print(f"❌ HubSpot update failed: {response.status_code} {response.text}")
                    return False
            except Exception as e:
                print(f"❌ Error syncing update to HubSpot: {e}")
                return False


    @staticmethod
    async def delete_lead(hubspot_id: str):
        if not hubspot_id:
            print("⚠️ No HubSpot ID provided for deletion.")
            return False

        headers = {
            "Authorization": f"Bearer {settings.HUBSPOT_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        url = f"https://api.hubapi.com/crm/v3/objects/contacts/{hubspot_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=headers)
                if response.status_code == 204:
                    print(f"🗑️ Successfully deleted lead {hubspot_id} from HubSpot CRM.")
                    return True
                else:
                    print(f"❌ Failed to delete lead from HubSpot: {response.status_code} {response.text}")
                    return False
            except Exception as e:
                print(f"❌ Error communicating with HubSpot during deletion: {e}")
                return False


