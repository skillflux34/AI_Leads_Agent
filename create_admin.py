# create_admin.py
import os
import asyncio
from dotenv import load_dotenv
load_dotenv()  # loads .env before reading DATABASE_URL

from tortoise import Tortoise
from models.tortoise_models import User

DB_URL = os.getenv("DATABASE_URL")

async def make_admin():
    await Tortoise.init(db_url=DB_URL, modules={"models": ["models.tortoise_models"]})
    user = await User.filter(email="bsf2002030sohaibnaseer@gmail.com").first()
    if not user:
        print("❌ User not found — make sure you've registered first")
        return
    user.role = "admin"
    await user.save()
    print(f"✅ {user.email} is now admin")
    await Tortoise.close_connections()

asyncio.run(make_admin())
