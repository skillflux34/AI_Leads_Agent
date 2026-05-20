import phonenumbers
from phonenumbers import geocoder, timezone as phone_timezone
from datetime import datetime
import pytz

# Calling window: 9 AM to 6 PM lead's local time
CALL_HOUR_START = 5
CALL_HOUR_END = 23


def get_lead_timezone(phone: str) -> str | None:
    """
    Detects the most likely timezone for a phone number.
    Returns a timezone string like 'America/New_York' or None if unknown.
    """
    try:
        # Try with + prefix first, then assume US if no country code
        if not phone.startswith("+"):
            phone = f"+{phone}"

        parsed = phonenumbers.parse(phone, None)
        timezones = phone_timezone.time_zones_for_number(parsed)

        if timezones:
            return timezones[0]  # Use the first matched timezone
        return None

    except Exception as e:
        print(f"⚠️ Could not detect timezone for {phone}: {e}")
        return None


def is_good_time_to_call(phone: str) -> tuple[bool, str]:
    """
    Returns (True, reason) if it's a good time to call,
    (False, reason) if not.
    """
    tz_name = get_lead_timezone(phone)

    if not tz_name:
        # Unknown timezone — allow the call but log it
        print(f"⚠️ Unknown timezone for {phone}, allowing call anyway")
        return True, "Unknown timezone — call allowed by default"

    try:
        tz = pytz.timezone(tz_name)
        local_time = datetime.now(tz)
        hour = local_time.hour
        local_time_str = local_time.strftime("%I:%M %p %Z")

        print(f"🕐 Lead local time ({tz_name}): {local_time_str}")

        if CALL_HOUR_START <= hour < CALL_HOUR_END:
            return True, f"Good time to call — {local_time_str} in {tz_name}"
        else:
            return False, f"Outside calling hours — it's {local_time_str} in {tz_name}. Call window: 5 AM–11 PM"

    except Exception as e:
        print(f"⚠️ Timezone check error for {phone}: {e}")
        return True, "Timezone check failed — call allowed by default"


def get_next_call_window(phone: str) -> str:
    """
    Returns a human-readable string of when to call next.
    e.g. 'Tomorrow at 9:00 AM EST'
    """
    tz_name = get_lead_timezone(phone)
    if not tz_name:
        return "Unknown — no timezone detected"

    try:
        tz = pytz.timezone(tz_name)
        local_time = datetime.now(tz)
        hour = local_time.hour

        if hour < CALL_HOUR_START:
            # Call later today
            next_window = local_time.replace(hour=CALL_HOUR_START, minute=0, second=0)
            return f"Today at {next_window.strftime('%I:%M %p %Z')}"
        else:
            # Call tomorrow morning
            from datetime import timedelta
            tomorrow = local_time + timedelta(days=1)
            next_window = tomorrow.replace(hour=CALL_HOUR_START, minute=0, second=0)
            return f"Tomorrow at {next_window.strftime('%I:%M %p %Z')}"

    except Exception as e:
        return "Unknown"

