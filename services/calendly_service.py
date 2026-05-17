import httpx
import os

class CalendlyService:
    def __init__(self):
        self.api_key = os.getenv("CALENDLY_API_KEY")
        self.event_uri = os.getenv("CALENDLY_EVENT_URI")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def book_meeting(self, lead_name: str, lead_email: str, start_time: str):
        """Books a meeting on Calendly."""
        payload = {
            "event_type": self.event_uri,
            "invitee": {
                "name": lead_name,
                "email": lead_email,
                "timezone": "Asia/Karachi"
            },
            "start_time": start_time
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.calendly.com/scheduled_events",
                json=payload,
                headers=self.headers
            )
            print(f"Calendly Response: {response.status_code} {response.text}")
            return response.json()

    async def get_scheduling_link(self):
        """Returns your Calendly scheduling link for the event."""
        return os.getenv("CALENDLY_EVENT_URI")
    

    