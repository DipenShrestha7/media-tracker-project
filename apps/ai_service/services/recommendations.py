import sys
from pathlib import Path
import json

# Ensure parent directory is in sys.path for direct execution
sys.path.append(str(Path(__file__).resolve().parent.parent))

from config import settings
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.prebuilt import ToolNode, tools_condition
from models.recommendaModel import (
    RecommendationList,
    RecommendationState,
)
from tools.web_tool import recommend_search_tool
from prompts.recommendPrompt import AGENT_SYSTEM_PROMPT
from prompts.recommendPrompt import EXTRACTOR_SYSTEM_PROMPT

llm = ChatOpenAI(
    base_url="https://openrouter.ai/api/v1",
    model="openai/gpt-oss-120b",
    api_key=settings.OPENROUTER_API_KEY,
    temperature=0.7,
    max_tokens=4000,
)


# Node 1: Reasoning & Tool Calling


def agent_node(state: RecommendationState):
    llm_with_tools = llm.bind_tools([recommend_search_tool])
    messages = state.get("messages", [])
    # If starting fresh, attach system prompt and library input
    if not messages:
        system_prompt = SystemMessage(content=AGENT_SYSTEM_PROMPT)
        user_msg = HumanMessage(
            content=f"User Library context: {state['user_library']}"
        )
        messages_to_send = [system_prompt, user_msg]
    else:
        messages_to_send = state["messages"]

    response = llm_with_tools.invoke(messages_to_send)

    # --- DEBUG LOGGING ---
    if response.tool_calls:
        for tool_call in response.tool_calls:
            print(f"🔍 AGENT IS SEARCHING FOR: {tool_call['args']}")
    else:
        print("🤖 AGENT FINISHED SEARCHING (Proceeding to Extractor)")
    # ---------------------

    return {"messages": [response]}


# 4. Node 2: Final Structured Extraction
def extractor_node(state: RecommendationState):
    parser = PydanticOutputParser(pydantic_object=RecommendationList)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                EXTRACTOR_SYSTEM_PROMPT
                + "\n\nSchema Instructions:\n{format_instructions}",
            ),
            ("placeholder", "{messages}"),
        ]
    )

    # 3. Chain prompt -> standard llm -> parser
    chain = prompt | llm | parser

    result = chain.invoke(
        {
            "messages": state["messages"],
            "format_instructions": parser.get_format_instructions(),
        }
    )
    candidate_dicts = [item.model_dump() for item in result.recommendations]

    return {"candidates": candidate_dicts}


# 5. Graph Assembly
workflow = StateGraph(RecommendationState)

workflow.add_node("agent", agent_node)
workflow.add_node("tools", ToolNode([recommend_search_tool]))
workflow.add_node("extractor", extractor_node)

workflow.add_edge(START, "agent")

# If the agent requests search, route to 'tools'. If done searching, route to 'extractor'.
workflow.add_conditional_edges(
    "agent",
    tools_condition,
    {
        "tools": "tools",  # Routes to tool execution when tools are requested
        "__end__": "extractor",  # Routes to extraction node when search is finished
    },
)

# After tool runs, loop back to agent to inspect search results
workflow.add_edge("tools", "agent")
workflow.add_edge("extractor", END)

recommendation_app = workflow.compile()

if __name__ == "__main__":
    MOCK_USER_LIBRARY = [
        {
            "title": "Interstellar",
            "type": "movie",
            "genres": ["Sci-Fi", "Adventure"],
            "user_rating": 9.0,
        },
        {
            "title": "Demon Slayer",
            "type": "anime",
            "genres": ["Action", "Fantasy"],
            "user_rating": 8.5,
        },
        {
            "title": "Breaking Bad",
            "type": "series",
            "genres": ["Crime", "Drama"],
            "user_rating": 9.5,
        },
        {
            "title": "Vincenzo",
            "type": "series",
            "genres": ["Dark Comedy", "Action", "Crime"],
            "user_rating": 8.4,
        },
    ]
    print("--- Running Recommendation Graph with Mock Library ---")

    # Run graph
    initial_state = {
        "messages": [],
        "user_library": MOCK_USER_LIBRARY,
        "candidates": [],
    }
    result = recommendation_app.invoke(initial_state)

    print("\n--- AGENT EXECUTION LOG ---")
    for i, msg in enumerate(result["messages"]):
        # 1. Inspect what search query the LLM issued
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for call in msg.tool_calls:
                print(f"\n[Turn {i}] LLM Issued Search Query:")
                print(f"  Tool Name: {call['name']}")
                print(f"  Query Arguments: {call['args']}")

        # 2. Inspect what Tavily returned
        elif msg.type == "tool":
            print(f"\n[Turn {i}] Tavily Raw Search Output:")
            print(f"  {msg.content[:300]}...")

    print("\nGenerated Candidates:")
    print(json.dumps(result["candidates"], indent=2))
