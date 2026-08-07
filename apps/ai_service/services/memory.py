# app/services/memory.py
from typing import Dict
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory


class MemoryService:
    def __init__(self):
        self._store: Dict[str, BaseChatMessageHistory] = {}

    def get_session_history(self, session_id: str) -> BaseChatMessageHistory:
        """Fetch existing chat history for a session or create a new one."""
        if session_id not in self._store:
            self._store[session_id] = ChatMessageHistory()
        return self._store[session_id]

    def clear_session(self, session_id: str) -> bool:
        """Clear history for a given session ID."""
        if session_id in self._store:
            del self._store[session_id]
            return True
        return False


memory_service = MemoryService()
