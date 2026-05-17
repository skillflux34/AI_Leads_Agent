import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    VAPI_API_KEY = os.getenv("VAPI_API_KEY")
    VAPI_PHONE_ID = os.getenv("VAPI_PHONE_ID")
    HUBSPOT_ACCESS_TOKEN = os.getenv("HUBSPOT_ACCESS_TOKEN")
    REDIS_URL = os.getenv("REDIS_URL")
    DATABASE_URL = os.getenv("DATABASE_URL")

settings = Settings()

