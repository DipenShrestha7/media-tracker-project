from datetime import datetime
from typing import AsyncGenerator

from langchain.agents import create_agent
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_openai import ChatOpenAI

from config import settings
from models.chat import StructuredRecommendationResponse
from services.memory import memory_service
from services.vector_store import vector_service

SYSTEM_PROMPT_TEMPLATE = """You are Nexus AI, an expert, proactive assistant for a personal media tracker app called "Nexus". You specialize in analyzing, summarizing, discovering, and recommending movies, TV shows, anime, manga, and general pop culture.

TEMPORAL CONTEXT:
- The current date and time is: {current_time}.
- Use this temporal information to determine if information needs to be fetched via web search (e.g., upcoming releases, recent movie debuts, current news).

CORE CAPABILITIES & CONTEXT HANDLING:
1. USE NEXUS DATABASE CONTEXT: When the query involves user recommendations, watchlists, or media synopses stored in Nexus, draw upon the provided context retrieved from the database/RAG index.
2. LIVE SEARCH FALLBACK: If local context or internal knowledge is insufficient for recent releases, real-time news, or streaming availability, use Tavily web search capabilities to deliver up-to-date information.
3. PERSONALIZATION: Personalize all recommendations and discussions based on user ratings, completion statuses, and preferences provided in the user's data profile.

RESPONSE LENGTH & DEPTH:
1. ADAPTIVE LENGTH: Match the scope and depth requested by the user.
2. CONCISE BY DEFAULT: For general questions (e.g., "What is Inception about?"), deliver clean, direct, standard-length explanations.
3. DETAILED ON DEMAND: Provide long, structured breakdowns only when the user explicitly requests depth.

FORMATTING & STRUCTURE RULES:
1. HEADERS: Format main section titles using Markdown headings (`##` for primary sections, `###` for sub-sections).
2. TABLES: Always format comparisons, watchlists, or media feature lists using standard GitHub Flavored Markdown (GFM) pipe syntax (`|`).

STRICT NEGATIVE CONSTRAINTS:
- NEVER output raw HTML tags (`<br>`, `<div>`, `<table>`, etc.).
- NEVER include internal system logs, execution notes, or status phrases in responses.
- Output ONLY the clean response intended for the user interface.

Context:
{context}"""


class LLMService:
    def __init__(self):
        self.llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            model="openrouter/free",
            api_key=settings.OPENROUTER_API_KEY,
            temperature=0.7,
            max_tokens=4000,
        )

        self.tavily_tool = TavilySearchResults(
            max_results=3, api_key=settings.TAVILY_API_KEY
        )
        self.tools = [self.tavily_tool]

        # 1. Base agent without in-memory Checkpointer
        self.raw_agent = create_agent(
            model=self.llm,
            tools=self.tools,
        )

        # 2. Wrap agent with PostgreSQL memory service
        self.agent_with_history = RunnableWithMessageHistory(
            self.raw_agent,
            memory_service.get_session_history,
            input_messages_key="messages",
            history_messages_key="messages",
        )

    def _get_current_time_str(self) -> str:
        return datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

    def _build_system_prompt(self, context: str) -> str:
        return SYSTEM_PROMPT_TEMPLATE.format(
            current_time=self._get_current_time_str(),
            context=context,
        )

    async def generate_response(self, user_message: str, session_id: str) -> str:
        # Step A: Query vector database for user's library context
        docs = vector_service.search_similar(user_message, k=2)
        retrieved_context = (
            "\n---\n".join([d.page_content for d in docs])
            if docs
            else "No specific database context found."
        )

        system_prompt = self._build_system_prompt(retrieved_context)

        config = {"configurable": {"session_id": session_id}}
        inputs = {
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ]
        }

        result = await self.agent_with_history.ainvoke(inputs, config=config)
        return str(result["messages"][-1].content)

    async def generate_stream(
        self, user_message: str, session_id: str
    ) -> AsyncGenerator[str, None]:
        docs = vector_service.search_similar(user_message, k=2)
        retrieved_context = (
            "\n---\n".join([d.page_content for d in docs])
            if docs
            else "No specific database context found."
        )

        system_prompt = self._build_system_prompt(retrieved_context)

        config = {"configurable": {"session_id": session_id}}
        inputs = {
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message),
            ]
        }
        async for chunk, metadata in self.agent_with_history.astream(
            inputs, config=config, stream_mode="messages"
        ):
            if metadata.get("langgraph_node") == "agent" and chunk.content:
                yield f"data: {chunk.content}\n\n"

    async def generate_structured_recommendations(
        self, query: str
    ) -> StructuredRecommendationResponse:
        structured_llm = self.llm.with_structured_output(
            StructuredRecommendationResponse, method="function_calling"
        )

        system_prompt = (
            f"You are an expert media recommendation engine. "
            f"Today's date is {self._get_current_time_str()}. "
            f"Return precise structured recommendations based on the user's criteria."
        )

        prompt = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=query),
        ]

        return await structured_llm.ainvoke(prompt)


llm_service = LLMService()
