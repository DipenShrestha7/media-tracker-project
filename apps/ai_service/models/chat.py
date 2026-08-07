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
