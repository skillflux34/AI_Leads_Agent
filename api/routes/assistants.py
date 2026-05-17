import os
from fastapi import APIRouter, HTTPException
from services.vapi_service import VapiService
from models.tortoise_models import Assistant
from pydantic import BaseModel

router = APIRouter()
vapi_service = VapiService()


class AssistantCreateRequest(BaseModel):
    name: str
    system_prompt: str
    first_message: str
    voice_id: str = "Layla"
    model_provider: str = "openai"
    model_name: str = "gpt-4"


@router.post("/create")
async def create_new_assistant(data: AssistantCreateRequest):
    vapi_res = await vapi_service.create_persistent_assistant(
        name=data.name,
        system_prompt=data.system_prompt,
        first_message=data.first_message
    )

    if "id" not in vapi_res:
        raise HTTPException(status_code=400, detail=f"Vapi Error: {vapi_res}")

    assistant = await Assistant.create(
        name=data.name,
        system_prompt=data.system_prompt,
        first_message=data.first_message,
        voice_id=data.voice_id,
        model_provider=data.model_provider,
        model_name=data.model_name,
        vapi_assistant_id=vapi_res["id"],
        is_active=False
    )

    return {"status": "success", "assistant_id": assistant.id, "vapi_id": vapi_res["id"]}


@router.get("/list")
async def list_assistants():
    """Returns all assistants, active one first."""
    assistants = await Assistant.all().order_by("-is_active", "-id")
    return [
        {
            "id": a.id,
            "name": a.name,
            "first_message": a.first_message,
            "system_prompt": a.system_prompt,
            "voice_id": a.voice_id,
            "model_name": a.model_name,
            "model_provider": a.model_provider,
            "vapi_assistant_id": a.vapi_assistant_id,
            "is_active": a.is_active,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assistants
    ]


@router.post("/set-active/{vapi_assistant_id}")
async def set_active_assistant(vapi_assistant_id: str):
    """Marks one assistant as active for outbound calls. Deactivates all others."""
    await Assistant.all().update(is_active=False)

    assistant = await Assistant.filter(vapi_assistant_id=vapi_assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    assistant.is_active = True
    await assistant.save()

    return {
        "status": "success",
        "message": f"'{assistant.name}' is now the active assistant for outbound calls",
        "assistant_id": assistant.id,
        "vapi_assistant_id": assistant.vapi_assistant_id,
    }


@router.get("/active")
async def get_active_assistant():
    """Returns the currently active assistant."""
    assistant = await Assistant.filter(is_active=True).first()
    if not assistant:
        assistant = await Assistant.all().order_by("-id").first()
    if not assistant:
        raise HTTPException(status_code=404, detail="No assistants found")

    return {
        "id": assistant.id,
        "name": assistant.name,
        "vapi_assistant_id": assistant.vapi_assistant_id,
        "is_active": assistant.is_active,
    }


@router.delete("/{assistant_id}")
async def delete_assistant(assistant_id: str):
    """Removes the assistant from both local DB and Vapi."""
    
    # 1. Delete from Vapi first
    try:
        headers = {
            "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}",
            "Content-Type": "application/json"
        }
        import httpx
        async with httpx.AsyncClient() as client:
            vapi_response = await client.delete(
                f"https://api.vapi.ai/assistant/{assistant_id}",
                headers=headers
            )
            if vapi_response.status_code not in [200, 204]:
                print(f"⚠️ Vapi delete returned {vapi_response.status_code}: {vapi_response.text}")
            else:
                print(f"✅ Deleted from Vapi: {assistant_id}")
    except Exception as e:
        print(f"⚠️ Vapi delete failed: {e}")
        # Don't block local deletion even if Vapi fails

    # 2. Delete from local DB
    deleted_count = await Assistant.filter(vapi_assistant_id=assistant_id).delete()
    if not deleted_count:
        raise HTTPException(status_code=404, detail="Assistant not found in local DB")

    print(f"🗑️ Deleted assistant from DB: {assistant_id}")
    return {"status": "success", "message": "Assistant deleted from Vapi and local DB"}


OBJECTION_HANDLING_PROMPT = """
You are Alex, a professional sales representative for Cyberify Academy — a cybersecurity and technology training company.

Your goal is to qualify leads, handle objections confidently, and book discovery meetings.

## YOUR APPROACH:
1. Greet warmly and confirm you're speaking with {{name}}
2. Ask 2-3 quick qualifying questions about their goals
3. Present Cyberify Academy's value based on their answers
4. Handle any objections using the framework below
5. Close by offering to book a discovery call

## QUALIFYING QUESTIONS:
- "Are you looking to start a career in cybersecurity, or upskill in your current role?"
- "Have you tried any training programs before?"
- "What's your biggest challenge right now when it comes to growing in tech?"

## BOOKING MEETINGS:
- If the lead agrees to a 15-minute discovery call, you MUST check for a date and time.
- Ask for their email address explicitly.
- Once you have the date/time and email, use the 'book_discovery_call' tool to finalize it.
- Tell them: "Great! I've just sent a confirmation to [email]. I look forward to speaking then!"

## EMAIL COLLECTION:
- When asking for email, say: "Could you please spell out your email address letter by letter so I get it right?"
- After they spell it, repeat it back: "Just to confirm, that's s-o-h-a-i-b at gmail dot com, is that correct?"
- Only call the book_discovery_call tool once the lead confirms the email is correct

## RESCHEDULE PROTOCOL:
- If the lead says anything like "can we talk later", "call me back", "reschedule",
  "not a good time", or "busy right now", treat it as a reschedule request.
- DO NOT ask clarifying questions. Simply say:
  "Of course! I'll have our system schedule a callback for you.
   What time works best — later today, or another day this week?"
- Once they give a time, confirm it and use the 'book_discovery_call' tool
  with their preferred time and any email you already have.
- If no email, ask ONLY for their email, then call the tool immediately.

## HANDOFF PROTOCOL:
- If the lead asks to speak to a human, a manager, or has complex technical questions you cannot answer, say: "I'd be happy to connect you with one of our senior tech leads. Please stay on the line for a moment."
- Immediately use the 'transfer_to_human' tool to move the call.

## OBJECTION HANDLING:
**"I'm too busy"**
→ "I completely understand — that's exactly why our programs are designed to be flexible, with self-paced modules you can do in 30 minutes a day. Many of our students are full-time professionals. Would a 15-minute discovery call this week work for you?"

**"It's too expensive"**
→ "That's a fair concern. Can I ask — what's the cost of staying where you are for another year? Our programs start at affordable tiers, and we offer installment plans. Would it help if I shared what the ROI looks like for someone in your position?"

**"I need to think about it"**
→ "Of course — this is a big decision. What specifically would help you feel more confident? I can send you some success stories from people with a similar background, or we could book a quick call with one of our advisors."

**"I'm not interested"**
→ "No problem at all. Can I ask what's holding you back? I want to make sure I'm not missing something that could actually be a fit for you."

**"I already have a job in tech"**
→ "That's great! Many of our students are already working in tech but want to specialize in cybersecurity, which is one of the fastest-growing and highest-paying fields. Are you open to hearing how others in your position have made that transition?"

## RULES:
- Keep responses SHORT — 2-3 sentences max per turn
- Never read out long lists
- Always end your turn with a question to keep the conversation going
- If the lead is clearly not interested after 2 objections, politely end the call
- If the lead is interested, offer to book a meeting: "I'd love to set up a quick 15-minute call with our team. What day works best for you this week?"
- Never make up pricing or specific course details you are not sure about
- If a technical question is out of scope, trigger the transfer tool.
"""


class AssistantUpdateRequest(BaseModel):
    assistant_id: int


@router.post("/update-prompt")
async def update_assistant_prompt(data: AssistantUpdateRequest):
    assistant = await Assistant.filter(id=data.assistant_id).first()
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    result = await vapi_service.update_assistant_prompt(
        vapi_assistant_id=assistant.vapi_assistant_id,
        system_prompt=OBJECTION_HANDLING_PROMPT
    )

    if "id" not in result:
        raise HTTPException(status_code=400, detail=f"Vapi Error: {result}")

    assistant.system_prompt = OBJECTION_HANDLING_PROMPT
    await assistant.save()

    return {"status": "success", "message": "Assistant prompt updated on Vapi and DB"}

    