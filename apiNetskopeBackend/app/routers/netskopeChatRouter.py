# app/routers/netskopeChatRouter.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.netskopeChatService import send_message_to_n8n

router = APIRouter(prefix="/api", tags=["Netskope Chat"])

class ChatRequest(BaseModel):
    question: str

@router.post("/netskope-chat")
def chat_with_netskope(req: ChatRequest):
    """
    Endpoint que recibe el mensaje del frontend y lo envía al flujo de n8n (Netskope).
    """
    try:
        reply = send_message_to_n8n(req.question)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))