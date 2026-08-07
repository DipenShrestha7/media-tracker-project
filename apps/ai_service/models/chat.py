from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    message: str = Field(..., example="Can you summarize Inception for me?")
    user_id: Optional[str] = Field(None, example="user_123")
    conversation_id: Optional[str] = Field(None, example="conv_abc")


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MediaItem(BaseModel):
    title: str = Field(description="Title of the movie, show, anime, or manga")
    media_type: str = Field(description="Type: movie, tv_show, anime, or manga")
    genre: List[str] = Field(description="Primary genres")
    recommendation_reason: str = Field(
        description="Brief reason why this matches the user query"
    )


class StructuredRecommendationResponse(BaseModel):
    summary: str = Field(description="Brief introductory summary")
    recommendations: List[MediaItem] = Field(
        description="List of recommended media items"
    )
