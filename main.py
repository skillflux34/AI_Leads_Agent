import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from core.database import TORTOISE_CONFIG
from api.websocket_manager import manager
from api.routes import leads, webhooks, calls, assistants
from api.routes.auth import router as auth_router
from api.routes.hubspot_oauth import router as hubspot_oauth_router
from api.routes.admin import router as admin_router
from services.reschedule_service import process_rescheduled_calls

app = FastAPI(title="AI Voice Orchestration Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router,          prefix="/auth",          tags=["Auth"])
app.include_router(hubspot_oauth_router, prefix="/hubspot-oauth", tags=["HubSpot OAuth"])
app.include_router(admin_router,         prefix="/admin",         tags=["Admin"])
app.include_router(leads.router,         prefix="/leads",         tags=["Leads"])
app.include_router(webhooks.router,      prefix="/webhooks",      tags=["Webhooks"])
app.include_router(calls.router,         prefix="/calls",         tags=["Calls"])
app.include_router(assistants.router,    prefix="/assistants",    tags=["Assistants"])


@app.on_event("startup")
async def startup():
    asyncio.create_task(process_rescheduled_calls())


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/test")
def test_cors():
    return {"message": "CORS and Server are working"}


register_tortoise(
    app,
    config=TORTOISE_CONFIG,
    generate_schemas=True,
    add_exception_handlers=True,
)

