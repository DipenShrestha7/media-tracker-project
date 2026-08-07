import uuid
from fastapi import APIRouter, HTTPException
from services.llm import llm_service
from fastapi.responses import StreamingResponse
from models.chat import (
    ChatRequest,
    ChatResponse,
    StructuredRecommendationResponse,
)

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


@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Returns Server-Sent Events (SSE) stream for real-time frontend rendering."""
    conv_id = request.conversation_id or str(uuid.uuid4())
    return StreamingResponse(
        llm_service.generate_stream(user_message=request.message, session_id=conv_id),
        media_type="text/event-stream",
    )


@router.post("/chat/recommend", response_model=StructuredRecommendationResponse)
async def structured_recommend_endpoint(request: ChatRequest):
    """Returns strongly-typed JSON payload matching StructuredRecommendationResponse schema."""
    try:
        return await llm_service.generate_structured_recommendations(
            query=request.message
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Structured Output Error: {str(e)}"
        )
