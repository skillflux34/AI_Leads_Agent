import httpx
from core.config import settings

class HubSpotService:
    @staticmethod
    async def fetch_new_leads():
        url = "https://api.hubapi.com/crm/v3/objects/contacts"
        headers = {
            "Authorization": f"Bearer {settings.HUBSPOT_ACCESS_TOKEN}",
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
            return []

    @staticmethod
    async def update_lead_outcome(hubspot_id: str, sentiment: str, intent: str, score: int, transcript: str):
        if not hubspot_id:
            print("⚠️ No HubSpot ID, skipping CRM update")
            return

        headers = {
            "Authorization": f"Bearer {settings.HUBSPOT_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:

            # ✅ Step 1: Update lead status
            if score >= 70:
                hs_status = "CONNECTED"
            elif score <= 30:
                hs_status = "UNQUALIFIED"
            else:
                hs_status = "IN_PROGRESS"

            await client.patch(
                f"https://api.hubapi.com/crm/v3/objects/contacts/{hubspot_id}",
                json={"properties": {"hs_lead_status": hs_status}},
                headers=headers
            )
            print(f"✅ HubSpot status updated → {hs_status}")

            # ✅ Step 2: Create a note with transcript + analysis
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


