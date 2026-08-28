from datetime import datetime
import asyncio
from typing import AsyncGenerator, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from config import settings
from services.memory import memory_service
from tools.web_tool import web_search_tool
from prompts.chatbotPrompt import SYSTEM_PROMPT_TEMPLATE


class LLMService:
    def __init__(self):
        self.llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            model="openai/gpt-oss-120b",
            api_key=settings.OPENROUTER_API_KEY,
            temperature=0.7,
            max_tokens=4000,
        )

        self.tools = [web_search_tool]

    def _get_current_time_str(self) -> str:
        return datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

    def _build_system_prompt(self, system_context: str | None) -> str:
        return SYSTEM_PROMPT_TEMPLATE.format(
            current_time=self._get_current_time_str(),
            system_context=system_context or "No user library context provided.",
        )

    async def generate_response(
        self,
        user_message: str,
        system_context: Optional[str],
        session_id: str,
    ) -> str:
        system_prompt = self._build_system_prompt(system_context)
        history = memory_service.get_session_history(session_id)

        messages = [SystemMessage(content=system_prompt)]
        messages.extend(history.messages)
        messages.append(HumanMessage(content=user_message))

        try:
            llm_with_tools = self.llm.bind_tools(self.tools)
            response = await llm_with_tools.ainvoke(messages)
            tool_calls = getattr(response, "tool_calls", None) or []

            if tool_calls:
                messages.append(response)

                for tool_call in tool_calls:
                    call_id = (
                        tool_call.get("id", "tool_call_1")
                        if isinstance(tool_call, dict)
                        else getattr(tool_call, "id", "tool_call_1")
                    )
                    call_args = (
                        tool_call.get("args", {})
                        if isinstance(tool_call, dict)
                        else getattr(tool_call, "args", {})
                    )
                    search_query = (
                        call_args.get("query")
                        if isinstance(call_args, dict)
                        else getattr(call_args, "query", None)
                    )
                    if not search_query:
                        search_query = user_message

                    tool_result = await asyncio.to_thread(
                        self.tavily_tool.invoke, {"query": search_query}
                    )
                    messages.append(
                        ToolMessage(content=str(tool_result), tool_call_id=call_id)
                    )

                final_response = await self.llm.ainvoke(messages)
                ai_content = (
                    final_response.content
                    if hasattr(final_response, "content")
                    else str(final_response)
                )
            else:
                ai_content = (
                    response.content if hasattr(response, "content") else str(response)
                )
        except Exception:
            fallback_response = await self.llm.ainvoke(messages)
            ai_content = (
                fallback_response.content
                if hasattr(fallback_response, "content")
                else str(fallback_response)
            )

        history.add_user_message(user_message)
        history.add_ai_message(str(ai_content))
        return str(ai_content)

    async def generate_stream(
        self,
        user_message: list,
        system_context: Optional[str],
        session_id: str,
    ) -> AsyncGenerator[str, None]:
        # user_message is a List[MessageItem] passed from the Node backend.
        # Extract the last user turn's text for RAG vector search.
        last_user_text = ""
        for item in reversed(user_message):
            role = item.role if hasattr(item, "role") else item.get("role", "")
            content = (
                item.content if hasattr(item, "content") else item.get("content", "")
            )
            if role == "user":
                last_user_text = content
                break

        system_prompt = self._build_system_prompt(system_context)

        # Build LangChain messages from user/assistant history only.
        # Library context belongs in the system prompt, not as a chat turn.
        messages = [SystemMessage(content=system_prompt)]
        for item in user_message:
            role = item.role if hasattr(item, "role") else item.get("role", "")
            content = (
                item.content if hasattr(item, "content") else item.get("content", "")
            )
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        print(f"\n=== AI REQUEST ===")
        print(f"session_id: {session_id}")
        print(f"last_user_message: {last_user_text}")
        print(f"history_turns: {len(user_message)}")

        try:
            llm_with_tools = self.llm.bind_tools(self.tools)
            try:
                first_response = await asyncio.wait_for(
                    llm_with_tools.ainvoke(messages), timeout=35
                )
            except (asyncio.TimeoutError, Exception) as e:
                print(
                    f"First response/tool binding failed or timed out: {e}. Falling back to direct streaming."
                )
                accumulated = ""
                async for chunk in self.llm.astream(messages):
                    if hasattr(chunk, "content") and chunk.content:
                        content = str(chunk.content)
                        accumulated += content
                        escaped_content = (
                            content.replace("\r\n", "\n")
                            .replace("\r", "\n")
                            .replace("\n", "\\n")
                        )
                        yield f"data: {escaped_content}\n\n"

                if accumulated:
                    print(
                        f"\n=== AI FINAL RESPONSE (FALLBACK) ===\n{accumulated}\n=== END AI RESPONSE ===\n"
                    )
                return

            stream_messages = list(messages)

            if getattr(first_response, "tool_calls", None):
                stream_messages.append(first_response)
                yield "data: Searching web and your library...\n\n"

                for tool_call in first_response.tool_calls:
                    call_id = (
                        tool_call.get("id", "tool_call_1")
                        if isinstance(tool_call, dict)
                        else getattr(tool_call, "id", "tool_call_1")
                    )
                    call_args = (
                        tool_call.get("args", {})
                        if isinstance(tool_call, dict)
                        else getattr(tool_call, "args", {})
                    )
                    search_query = (
                        call_args.get("query")
                        if isinstance(call_args, dict)
                        else getattr(call_args, "query", None)
                    )
                    if not search_query:
                        search_query = last_user_text

                    print(f"--> Executing Tool: {search_query}")
                    try:
                        tool_result = await asyncio.wait_for(
                            asyncio.to_thread(
                                self.tavily_tool.invoke, {"query": search_query}
                            ),
                            timeout=15,
                        )
                        stream_messages.append(
                            ToolMessage(content=str(tool_result), tool_call_id=call_id)
                        )
                    except (asyncio.TimeoutError, Exception) as e:
                        print(
                            f"Tool execution failed or timed out: {e}. Proceeding without search results."
                        )
                        stream_messages.append(
                            ToolMessage(
                                content="Search failed or timed out. Please proceed using your internal knowledge.",
                                tool_call_id=call_id,
                            )
                        )

                accumulated = ""
                async for chunk in self.llm.astream(stream_messages):
                    if hasattr(chunk, "content") and chunk.content:
                        content = str(chunk.content)
                        accumulated += content
                        escaped_content = (
                            content.replace("\r\n", "\n")
                            .replace("\r", "\n")
                            .replace("\n", "\\n")
                        )
                        yield f"data: {escaped_content}\n\n"

                if not accumulated:
                    print(
                        "Received empty response from streamed tool completion. Falling back to direct streaming without search context."
                    )
                    async for chunk in self.llm.astream(messages):
                        if hasattr(chunk, "content") and chunk.content:
                            content = str(chunk.content)
                            accumulated += content
                            escaped_content = (
                                content.replace("\r\n", "\n")
                                .replace("\r", "\n")
                                .replace("\n", "\\n")
                            )
                            yield f"data: {escaped_content}\n\n"

                if not accumulated:
                    raise ValueError("empty response")

                print(
                    f"\n=== AI FINAL RESPONSE ===\n{accumulated}\n=== END AI RESPONSE ===\n"
                )
                return

            accumulated = ""
            async for chunk in self.llm.astream(stream_messages):
                if hasattr(chunk, "content") and chunk.content:
                    content = str(chunk.content)
                    accumulated += content
                    escaped_content = (
                        content.replace("\r\n", "\n")
                        .replace("\r", "\n")
                        .replace("\n", "\\n")
                    )
                    yield f"data: {escaped_content}\n\n"

            if not accumulated:
                print("Received empty response in base stream. Retrying once...")
                async for chunk in self.llm.astream(stream_messages):
                    if hasattr(chunk, "content") and chunk.content:
                        content = str(chunk.content)
                        accumulated += content
                        escaped_content = (
                            content.replace("\r\n", "\n")
                            .replace("\r", "\n")
                            .replace("\n", "\\n")
                        )
                        yield f"data: {escaped_content}\n\n"

            if not accumulated:
                raise ValueError("empty response")

            print(
                f"\n=== AI FINAL RESPONSE ===\n{accumulated}\n=== END AI RESPONSE ===\n"
            )

        except asyncio.TimeoutError:
            timeout_message = "The AI service is taking longer than expected. Please try again in a moment."
            print(
                f"\n=== AI STREAM TIMEOUT ===\n{timeout_message}\n=== END AI STREAM TIMEOUT ===\n"
            )
            yield f"data: {timeout_message}\n\n"
            return
        except Exception as exc:
            error_message = (
                f"I hit an issue while generating the response. Details: {exc}"
            )
            print(f"\n=== AI STREAM ERROR ===\n{exc}\n=== END AI STREAM ERROR ===\n")
            yield f"data: {error_message}\n\n"
            return


llm_service = LLMService()
