import uuid
from fastapi import APIRouter, HTTPException
from models.chat import ChatRequest, ChatResponse
from services.llm import llm_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        conv_id = request.conversation_id or str(uuid.uuid4())

        ai_message = await llm_service.generate_response(
            user_message=request.message, session_id=conv_id
        )

        return ChatResponse(
            response=ai_message, conversation_id=conv_id, metadata={"status": "success"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
