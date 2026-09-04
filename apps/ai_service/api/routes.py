import uuid
from fastapi import APIRouter, HTTPException, Body
from services.llm import llm_service
from services.recommendations import recommendation_app
from fastapi.responses import StreamingResponse
from models.chat import (
    ChatRequest,
    ChatResponse,
    StructuredRecommendationResponse,
)
from typing import Any

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        conv_id = request.conversation_id or str(uuid.uuid4())

        last_user = next(
            (m.content for m in reversed(request.messages) if m.role == "user"),
            "",
        )
        ai_message = await llm_service.generate_response(
            user_message=last_user,
            system_context=request.system_context or "",
            session_id=conv_id,
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
        llm_service.generate_stream(
            user_message=request.messages,
            system_context=request.system_context,
            session_id=conv_id,
        ),
        media_type="text/event-stream",
    )


@router.post("/chat/recommend", response_model=ChatResponse)
async def structured_recommend_endpoint(request: ChatRequest):
    """Generates AI recommendations based on user library.

    Expects: { "user_library": [list of media items], "conversation_id": "optional", "messages": [...] }
    Returns: ChatResponse format with metadata containing recommendations
    """
    try:
        # Extract library from request - could be in system_context or body
        user_library = request.system_context or []

        if isinstance(user_library, str):
            # If it's a string, parse it as JSON or create empty list
            import json

            try:
                user_library = json.loads(user_library)
            except:
                user_library = []

        # Invoke the recommendation workflow
        result = await recommendation_app.ainvoke(
            {
                "user_library": user_library,
                "messages": [],
                "candidates": [],
            }
        )

        # Extract candidates and format response
        candidates = result.get("candidates", [])
        response_text = (
            f"Found {len(candidates)} recommendations based on your library."
        )

        return ChatResponse(
            response=response_text,
            conversation_id=request.conversation_id or str(uuid.uuid4()),
            metadata={
                "status": "success",
                "recommendations": candidates,
                "count": len(candidates),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation Error: {str(e)}")


@router.post("/recommend")
async def recommend_endpoint(request_data: dict[str, Any] = Body(...)):
    """Backend-facing endpoint for recommendations (without /chat prefix).

    Accepts: { "user_library": [...] }
    """
    try:
        user_library = request_data.get("user_library", [])
        conversation_id = request_data.get("conversation_id", str(uuid.uuid4()))

        if isinstance(user_library, str):
            import json

            try:
                user_library = json.loads(user_library)
            except Exception as parse_err:
                print(f"Failed to parse user_library JSON: {parse_err}")
                user_library = []

        print(f"[RECOMMEND] Processing library with {len(user_library)} items")

        # Invoke the recommendation workflow
        result = await recommendation_app.ainvoke(
            {
                "user_library": user_library,
                "messages": [],
                "candidates": [],
            }
        )

        print(f"[RECOMMEND] Got result: {result}")

        # Extract candidates and format response
        candidates = result.get("candidates", [])
        response_text = (
            f"Found {len(candidates)} recommendations based on your library."
        )

        print(f"[RECOMMEND] Extracted {len(candidates)} candidates")

        return {
            "response": response_text,
            "conversation_id": conversation_id,
            "metadata": {
                "status": "success",
                "recommendations": candidates,
                "count": len(candidates),
            },
        }
    except Exception as e:
        print(f"[RECOMMEND ERROR] {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recommendation Error: {str(e)}")
