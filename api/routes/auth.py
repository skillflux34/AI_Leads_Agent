from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from models.tortoise_models import User
from services.auth_service import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = None


@router.post("/register")
async def register(data: RegisterRequest):
    existing = await User.filter(email=data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await User.create(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role="user"
    )

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "hubspot_connected": user.hubspot_connected
        }
    }


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await User.filter(email=form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "hubspot_connected": user.hubspot_connected
        }
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "hubspot_connected": current_user.hubspot_connected,
        "hubspot_portal_id": current_user.hubspot_portal_id,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

