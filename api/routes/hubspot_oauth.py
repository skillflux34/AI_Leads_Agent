from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from models.tortoise_models import User
from services.auth_service import get_current_user
import httpx
from jose import jwt, JWTError
import os
from datetime import datetime, timedelta

router = APIRouter()

HUBSPOT_CLIENT_ID = os.getenv("HUBSPOT_CLIENT_ID")
HUBSPOT_CLIENT_SECRET = os.getenv("HUBSPOT_CLIENT_SECRET")
HUBSPOT_REDIRECT_URI = os.getenv("HUBSPOT_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

HUBSPOT_SCOPES = "crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write"


@router.get("/connect")
async def hubspot_connect(token: str):  # Accept token directly from the URL query
    try:
        # Manually decode the token passed from window.location.href
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    auth_url = (
        f"https://app.hubspot.com/oauth/authorize"
        f"?client_id={HUBSPOT_CLIENT_ID}"
        f"&redirect_uri={HUBSPOT_REDIRECT_URI}"
        f"&scope={HUBSPOT_SCOPES.replace(' ', '%20')}"
        f"&state={user_id}"  # Now passing the securely verified user_id
    )
    return RedirectResponse(auth_url)

@router.get("/callback")
async def hubspot_callback(code: str, state: str):
    """HubSpot redirects here with auth code. Exchange for tokens."""
    user_id = int(state)
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.hubapi.com/oauth/v1/token",
            data={
                "grant_type": "authorization_code",
                "client_id": HUBSPOT_CLIENT_ID,
                "client_secret": HUBSPOT_CLIENT_SECRET,
                "redirect_uri": HUBSPOT_REDIRECT_URI,
                "code": code
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token_data = response.json()

    if "access_token" not in token_data:
        print(f"HubSpot OAuth error: {token_data}")
        return RedirectResponse(f"{FRONTEND_URL}/settings?hubspot=error")

    # Get portal info
    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://api.hubapi.com/oauth/v1/access-tokens/" + token_data["access_token"]
        )
        info = info_res.json()

    expires_at = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 1800))

    user.hubspot_access_token = token_data["access_token"]
    user.hubspot_refresh_token = token_data.get("refresh_token")
    user.hubspot_token_expires_at = expires_at
    user.hubspot_portal_id = str(info.get("hub_id", ""))
    user.hubspot_connected = True
    await user.save()

    print(f"✅ HubSpot connected for user {user.email} (portal: {user.hubspot_portal_id})")
    return RedirectResponse(f"{FRONTEND_URL}/settings?hubspot=success")


@router.post("/disconnect")
async def hubspot_disconnect(current_user: User = Depends(get_current_user)):
    """Removes HubSpot tokens from user."""
    current_user.hubspot_access_token = None
    current_user.hubspot_refresh_token = None
    current_user.hubspot_token_expires_at = None
    current_user.hubspot_portal_id = None
    current_user.hubspot_connected = False
    await current_user.save()
    return {"status": "success", "message": "HubSpot disconnected"}


@router.get("/status")
async def hubspot_status(current_user: User = Depends(get_current_user)):
    return {
        "connected": current_user.hubspot_connected,
        "portal_id": current_user.hubspot_portal_id,
    }


async def get_user_hubspot_token(user: User) -> str:
    """
    Returns a valid HubSpot access token for the user.
    Auto-refreshes if expired.
    """
    if not user.hubspot_connected or not user.hubspot_access_token:
        raise HTTPException(status_code=400, detail="HubSpot not connected for this user")

    # Check if token is expired (refresh 5 min before expiry)
    if user.hubspot_token_expires_at:
        expires_at = user.hubspot_token_expires_at
        if expires_at.tzinfo:
            from datetime import timezone
            now = datetime.now(timezone.utc)
        else:
            now = datetime.utcnow()

        if now >= expires_at - timedelta(minutes=5):
            # Refresh the token
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.hubapi.com/oauth/v1/token",
                    data={
                        "grant_type": "refresh_token",
                        "client_id": HUBSPOT_CLIENT_ID,
                        "client_secret": HUBSPOT_CLIENT_SECRET,
                        "refresh_token": user.hubspot_refresh_token
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                new_tokens = res.json()

            if "access_token" in new_tokens:
                user.hubspot_access_token = new_tokens["access_token"]
                user.hubspot_token_expires_at = datetime.utcnow() + timedelta(
                    seconds=new_tokens.get("expires_in", 1800)
                )
                await user.save()
                print(f"🔄 HubSpot token refreshed for {user.email}")

    return user.hubspot_access_token
