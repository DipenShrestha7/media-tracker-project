from typing import AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from config import settings
from services.memory import memory_service
from services.vector_store import vector_service
from tools.web_tool import web_search_tool
from models.chat import StructuredRecommendationResponse


class LLMService:
    def __init__(self):
        self.llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            model="openrouter/free",
            api_key=settings.OPENROUTER_API_KEY,
            temperature=0.7,
            max_tokens=4000,
        )

        self.tools = [web_search_tool]

    async def generate_response(self, user_message: str, session_id: str) -> str:
        docs = vector_service.search_similar(user_message, k=2)
        retrieved_context = (
            "\n---\n".join([d.page_content for d in docs])
            if docs
            else "No specific database context found."
        )
        self.system_prompt = """
            You are Nexus AI, an expert, proactive assistant for a personal media tracker app called "Nexus". You specialize in analyzing, summarizing, discovering, and recommending movies, TV shows, anime, manga, and general pop culture.

            CORE CAPABILITIES & CONTEXT HANDLING:
            1. USE NEXUS DATABASE CONTEXT: When the query involves user recommendations, watchlists, or media synopses stored in Nexus, draw upon the provided context retrieved from the database/RAG index.
            2. LIVE SEARCH FALLBACK: If local context or internal knowledge is insufficient for recent releases, real-time news, or streaming availability, use external web search capabilities to deliver up-to-date information.
            3. PERSONALIZATION: Personalize all recommendations and discussions based on user ratings, completion statuses, and preferences provided in the user's data profile.

            RESPONSE LENGTH & DEPTH:
            1. ADAPTIVE LENGTH: Match the scope and depth requested by the user.
            2. CONCISE BY DEFAULT: For general questions (e.g., "What is Inception about?"), deliver clean, direct, standard-length explanations.
            3. DETAILED ON DEMAND: Provide long, structured breakdowns only when the user explicitly requests depth (e.g., using keywords like "in detail", "deep dive", "step-by-step recap", "comprehensive analysis", or "explain everything").	

            FORMATTING & STRUCTURE RULES:
            1. HEADERS: Format main section titles using Markdown headings (`##` for primary sections, `###` for sub-sections). Do not use plain bold text as section titles.
            2. TABLES: Always format comparisons, watchlists, or media feature lists using standard GitHub Flavored Markdown (GFM) pipe syntax (`|`). Never use raw space-aligned text or HTML tags (`<br>`, `<table>`, etc.).

            STRICT NEGATIVE CONSTRAINTS:
            - NEVER output raw HTML tags (`<br>`, `<div>`, `<table>`, `<tr>`, `<td>`).
            - NEVER include internal system logs, execution notes, or status phrases (e.g., "LOG:", "Context verified") in responses.
	    - Output ONLY the clean response intended for the user interface.
        """
        self.prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt),
                MessagesPlaceholder(variable_name="history"),
                ("human", "{user_message}"),
                (MessagesPlaceholder(variable_name="agent_scratchpad")),
            ]
        )

        agent = create_tool_calling_agent(self.llm, self.tools, self.prompt_template)
        self.agent_executor = AgentExecutor(
            agent=agent, tools=self.tools, verbose=True, return_intermediate_steps=False
        )

        self.chain_with_history = RunnableWithMessageHistory(
            self.agent_executor,
            memory_service.get_session_history,
            input_messages_key="user_message",
            history_messages_key="history",
        )

        config = {"configurable": {"session_id": session_id}}

        response = await self.chain_with_history.ainvoke(
            {"user_message": user_message, "context": retrieved_context}, config=config
        )
        return str(response["output"])

    async def generate_stream(
        self, user_message: str, session_id: str
    ) -> AsyncGenerator[str, None]:
        """Streams response tokens line-by-line using Server-Sent Events format."""
        docs = vector_service.search_similar(user_message, k=2)
        retrieved_context = (
            "\n---\n".join([d.page_content for d in docs])
            if docs
            else "No specific local context."
        )

        prompt_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are Nexus AI. Provide helpful answers on media.\n\n"
                    f"Context:\n{retrieved_context}",
                ),
                MessagesPlaceholder(variable_name="history"),
                ("human", "{user_message}"),
            ]
        )

        chain = prompt_template | self.llm

        chain_with_history = RunnableWithMessageHistory(
            chain,
            memory_service.get_session_history,
            input_messages_key="user_message",
            history_messages_key="history",
        )

        config = {"configurable": {"session_id": session_id}}

        async for chunk in chain_with_history.astream(
            {"user_message": user_message}, config=config
        ):
            if chunk.content:
                yield f"data: {chunk.content}\n\n"

    async def generate_structured_recommendations(
        self, query: str
    ) -> StructuredRecommendationResponse:
        """Uses OpenAI's structured outputs feature to return validated JSON matching Pydantic schema."""
        structured_llm = self.llm.with_structured_output(
            StructuredRecommendationResponse, method="function_calling"
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an expert media recommendation engine. Return precise structured recommendations based on the user's criteria.",
                ),
                ("human", "{query}"),
            ]
        )

        chain = prompt | structured_llm
        return await chain.ainvoke({"query": query})


llm_service = LLMService()
