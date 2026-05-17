"""
backfill_durations.py
---------------------
Fetches duration (and recording_url as a bonus) from Vapi API
for every call_record that has a NULL duration, then updates the DB.

Usage:
    python backfill_durations.py

Requirements:
    - Run from your project root (so .env is picked up)
    - pip install httpx tortoise-orm python-dotenv asyncpg
"""

import asyncio
import httpx
import os
from dotenv import load_dotenv
from tortoise import Tortoise

load_dotenv()

# ── DB config — adjust if yours differs ──────────────────────────────────────
DB_URL = os.getenv("DATABASE_URL")  # e.g. postgres://user:pass@localhost:5432/leads_agent_db
VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_BASE = "https://api.vapi.ai"

TORTOISE_CONFIG = {
    "connections": {"default": DB_URL},
    "apps": {
        "models": {
            "models": ["models.tortoise_models"],
            "default_connection": "default",
        }
    },
}

# ─────────────────────────────────────────────────────────────────────────────

async def fetch_vapi_call(client: httpx.AsyncClient, vapi_call_id: str) -> dict:
    """Fetch a single call from Vapi and return the raw JSON."""
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        r = await client.get(f"{VAPI_BASE}/call/{vapi_call_id}", headers=headers, timeout=15)
        if r.status_code == 200:
            return r.json()
        print(f"  ⚠️  Vapi returned {r.status_code} for {vapi_call_id}")
    except Exception as e:
        print(f"  ❌ Request error for {vapi_call_id}: {e}")
    return {}


async def backfill():
    await Tortoise.init(config=TORTOISE_CONFIG)

    # Import here so Tortoise is initialised first
    from models.tortoise_models import CallRecord

    # Fetch all records with no duration and a valid vapi_call_id
    records = await CallRecord.filter(
        duration=None,
        vapi_call_id__not_isnull=True,
    ).exclude(vapi_call_id="")

    total = len(records)
    print(f"🔍 Found {total} call records with NULL duration. Starting backfill...\n")

    updated = 0
    skipped = 0

    async with httpx.AsyncClient() as client:
        for i, record in enumerate(records, 1):
            print(f"[{i}/{total}] Fetching {record.vapi_call_id} ...", end=" ")
            vapi_data = await fetch_vapi_call(client, record.vapi_call_id)

            if not vapi_data:
                print("skipped (no data)")
                skipped += 1
                continue

            artifact = vapi_data.get("artifact") or {}

            # Vapi doesn't send durationSeconds — calculate from startedAt / endedAt
            started_at = vapi_data.get("startedAt")
            ended_at   = vapi_data.get("endedAt")
            duration_seconds = None
            if started_at and ended_at:
                from datetime import datetime, timezone
                fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
                try:
                    start = datetime.strptime(started_at, fmt)
                    end   = datetime.strptime(ended_at,   fmt)
                    duration_seconds = int((end - start).total_seconds())
                except Exception as e:
                    print(f"  ⚠️  Could not parse timestamps: {e}")

            recording_url = artifact.get("recordingUrl") or vapi_data.get("recordingUrl")

            if duration_seconds is not None:
                record.duration = int(float(duration_seconds))
            if recording_url:
                record.recording_url = recording_url

            await record.save()

            if duration_seconds is not None:
                print(f"✅ duration={record.duration}s")
                updated += 1
            else:
                print("⚠️  duration still null on Vapi (call may be incomplete)")
                skipped += 1

            # Be polite to the API — 5 requests/sec max
            await asyncio.sleep(0.2)

    print(f"\n✅ Done. Updated: {updated} | Skipped/failed: {skipped} | Total: {total}")
    await Tortoise.close_connections()


if __name__ == "__main__":
    asyncio.run(backfill())
    