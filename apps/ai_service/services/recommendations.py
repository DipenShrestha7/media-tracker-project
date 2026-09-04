import asyncio
from collections import defaultdict
import sys
from pathlib import Path

# Ensure parent directory is in sys.path for direct execution
sys.path.append(str(Path(__file__).resolve().parent.parent))

from config import settings
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import SecretStr
from models.recommendaModel import (
    RecommendationList,
    RecommendationState,
)
from tools.web_tool import recommend_search_tool
from prompts.recommendPrompt import EXTRACTOR_SYSTEM_PROMPT

llm = ChatOpenAI(
    base_url="https://openrouter.ai/api/v1",
    model="openai/gpt-oss-120b",
    api_key=SecretStr(settings.OPENROUTER_API_KEY),
    temperature=0.7,
    max_completion_tokens=4000,
)


def analyze_user_library(library: list):
    """
    Groups items by media type and aggregates top genres and favorite titles.
    """
    grouped = defaultdict(list)
    for item in library:
        media_type = item.get("type", "movie").lower()
        grouped[media_type].append(item)

    profile = {}
    search_queries = {}

    for m_type, items in grouped.items():
        # Sort items by rating descending if available
        sorted_items = sorted(
            items, key=lambda x: x.get("user_rating", 0), reverse=True
        )

        genres = set()
        fav_titles = []
        for it in sorted_items:
            for g in it.get("genres", []):
                genres.add(g)
            if len(fav_titles) < 3:
                fav_titles.append(it.get("title"))

        genre_str = ", ".join(list(genres)[:4])
        fav_str = ", ".join(fav_titles)

        profile[m_type] = {
            "top_genres": list(genres),
            "favorites": fav_titles,
            "count": len(items),
        }

        # Build category-targeted query
        search_queries[m_type] = (
            f"best top rated {m_type} similar to {fav_str} {genre_str}"
        )

    return profile, search_queries


# Node 1: Category Parallel Search & Context Builder
async def search_node(state: RecommendationState):
    library = state.get("user_library", [])
    profile, search_queries = analyze_user_library(library)

    async def _fetch_category_search(m_type: str, query: str):
        try:
            res = await recommend_search_tool.ainvoke({"query": query})
            return f"=== Web Search Results for Category [{m_type.upper()}] (Query: '{query}') ===\n{res}\n"
        except Exception as e:
            return f"Search failed for category {m_type}: {e}"

    tasks = [
        _fetch_category_search(m_type, query)
        for m_type, query in search_queries.items()
    ]
    search_results = await asyncio.gather(*tasks)
    combined_search_context = "\n".join(search_results)

    if not profile:
        profile_msg = HumanMessage(
            content=(
                "USER LIBRARY PREFERENCE PROFILE:\n"
                "The user library is empty (no saved media yet).\n\n"
                "INSTRUCTION:\n"
                "Since the user library is currently empty, provide a well-balanced starter recommendation list "
                "featuring universally acclaimed, top-rated media across Movies, TV Series, and Anime."
            )
        )
    else:
        formatted_profile = "\n".join(
            [
                f"- Type: {m_type} | Favorites: {', '.join(info['favorites'])} | Top Genres: {', '.join(info['top_genres'])}"
                for m_type, info in profile.items()
            ]
        )

        profile_msg = HumanMessage(
            content=(
                f"USER LIBRARY PREFERENCE PROFILE:\n{formatted_profile}\n\n"
                f"SEARCH RESULTS BY CATEGORY:\n{combined_search_context}"
            )
        )

    return {"messages": [profile_msg]}


# Node 2: Structured Recommendation Extractor
async def extractor_node(state: RecommendationState):
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

    chain = prompt | llm | parser

    result = await chain.ainvoke(
        {
            "messages": state["messages"],
            "format_instructions": parser.get_format_instructions(),
        }
    )
    candidate_dicts = [item.model_dump() for item in result.recommendations]

    return {"candidates": candidate_dicts}


# Graph Assembly
workflow = StateGraph(RecommendationState)  # type: ignore[arg-type]


workflow.add_node("search", search_node)
workflow.add_node("extractor", extractor_node)

workflow.add_edge(START, "search")
workflow.add_edge("search", "extractor")
workflow.add_edge("extractor", END)

recommendation_app = workflow.compile()
