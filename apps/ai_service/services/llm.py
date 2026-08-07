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
            "You are Nexus AI, an expert, proactive media assistant for 'Nexus'. "
            "Help users discover, analyze, and discuss movies, TV shows, anime, and manga.\n\n"
            "Local Vector Context (Watchlist/Library):\n{context}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. If context from the local database answers the query (e.g. user ratings, watchlist), use it.\n"
            "2. If the user asks for live updates, real-time release dates, or streaming availability, use the `tavily_search_results_json` tool.\n"
            "3. ALWAYS format section titles with Markdown headings (`##` or `###`)."
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
