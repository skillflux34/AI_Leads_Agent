import httpx
import os
from twilio.rest import Client

class VapiService:
    def __init__(self):
        self.vapi_api_key = os.getenv("VAPI_API_KEY")
        self.vapi_base_url = "https://api.vapi.ai"
        self.server_url = os.getenv("SERVER_URL")
        
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
        # self.twilio_client = Client(self.twilio_sid, self.twilio_auth)

    def get_active_twilio_number(self):
        """Fetches your Twilio number dynamically."""
        number = os.getenv("TWILIO_PHONE_NUMBER")
        if not number:
            print("DEBUG: TWILIO_PHONE_NUMBER not set in .env")
        return number

    # --- NEW FUNCTION: Run this once to create your agent on Vapi ---
    async def create_persistent_assistant(self, name: str, system_prompt: str, first_message: str):
        headers = {
            "Authorization": f"Bearer {self.vapi_api_key}",
            "Content-Type": "application/json"
        }

        # Define the tool inline
        booking_tool = {
            "type": "function",
            "function": {
                "name": "book_discovery_call",
                "description": "Books a 15-minute discovery call for Cyberify Academy when a lead is interested.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "datetime": {
                            "type": "string",
                            "description": "The date and time the user wants to book (ISO 8601 format)."
                        },
                        "email": {
                            "type": "string",
                            "description": "The lead's email address."
                        }
                    },
                    "required": ["datetime", "email"]
                }
            }
        }

        transfer_tool = {
            "type": "transferCall",
            "function": {
                "name": "transfer_to_human",
                "description": "Transfers the call to a human representative when the lead requests it."
            },
            "destinations": [
                {
                    "type": "number",
                    "number": "+923168568352",
                    "transferPlan": {
                        "mode": "warm-transfer-say-message",  # ← ADD THIS
                        "message": "Please wait while I connect you to a human representative."
                    }
                }
            ]
        }
        
        payload = {
            "name": name,
            "firstMessage": first_message,
            "firstMessageMode": "assistant-speaks-first",
            "serverUrl": f"{self.server_url}/webhooks/vapi-webhook",
            "transcriber": {
                "provider": "deepgram",
                "model": "nova-2",
                "language": "en-US"
            },
            "model": {
                "provider": "openai",
                "model": "gpt-4",
                "messages": [
                    {
                        "role": "system", 
                        "content": system_prompt
                    }
                ],
                "tools": [booking_tool, transfer_tool],
                "temperature": 0.7
            },
            "voice": {
                "provider": "vapi",
                "voiceId": "Layla", # You can use 'jennifer' or 'morgan'
                "speed": 1.0
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.vapi_base_url}/assistant", 
                json=payload, 
                headers=headers
            )
            return response.json() # This returns the 'id' you need to save
        

    
    async def update_assistant_prompt(self, vapi_assistant_id: str, system_prompt: str):
        """Update an existing Vapi assistant's system prompt."""
        headers = {
            "Authorization": f"Bearer {self.vapi_api_key}",
            "Content-Type": "application/json"
        }


        booking_tool = {
            "type": "function",
            "function": {
                "name": "book_discovery_call",
                "description": "Books a 15-minute discovery call for Cyberify Academy when a lead is interested.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "datetime": {
                            "type": "string",
                            "description": "The date and time the user wants to book in ISO 8601 format."
                        },
                        "email": {
                            "type": "string",
                            "description": "The lead email address."
                        }
                    },
                    "required": ["datetime", "email"]
                }
            }
        }

        transfer_tool = {
            "type": "transferCall",
            "function": {
                "name": "transfer_to_human",
                "description": "Transfers the call to a human representative when the lead requests it."
            },
            "destinations": [
                {
                    "type": "number",
                    "number": "+923168568352",
                    "transferPlan": {
                        "mode": "warm-transfer-say-message",  # ← ADD THIS
                        "message": "Please wait while I connect you to a human representative."
                    }
                }
            ]
        }

        payload = {
            "transcriber": {"provider": "deepgram", "model": "nova-2", "language": "en-US"},
            "model": {
                "provider": "openai",
                "model": "gpt-4",
                "messages": [{"role": "system", "content": system_prompt}],
                "temperature": 0.7,
                "tools": [booking_tool, transfer_tool]
            },
            "voice": {"provider": "vapi", "voiceId": "Layla"}
        }
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.vapi_base_url}/assistant/{vapi_assistant_id}",
                json=payload,
                headers=headers
            )
            return response.json()
    

    # --- UPDATED TRIGGER: Uses the saved Assistant ID ---
    async def trigger_outbound_call(self, phone: str, lead_name: str, assistant_id: str):
        active_number = os.getenv("TWILIO_PHONE_NUMBER")  # direct, no network call

        if not active_number:
            return {"error": "TWILIO_PHONE_NUMBER not set in environment."}

        headers = {
            "Authorization": f"Bearer {self.vapi_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "assistantId": assistant_id,
            "assistantOverrides": {
                "firstMessage": f"Hi, this is Alex from Cyberify. Am I speaking with {lead_name}?",  # ✅ name injected here
                "variableValues": {
                    "name": lead_name
                }
            },
            "customer": {
                "number": phone,
                "name": lead_name
            },
            "phoneNumber": {
                "twilioAccountSid": self.twilio_sid,
                "twilioAuthToken": self.twilio_auth,
                "twilioPhoneNumber": active_number
            }
        }

        timeout = httpx.Timeout(30.0, read=30.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.vapi_base_url}/call", 
                json=payload, 
                headers=headers
            )
            result = response.json()
            print(f"DEBUG Vapi Call Response: {result}")
            return result

