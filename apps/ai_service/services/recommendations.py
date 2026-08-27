import os
import sys
from pathlib import Path
from typing import List, Dict, Any
from typing_extensions import TypedDict
from pydantic import BaseModel, Field

# Ensure parent directory is in sys.path for direct execution
sys.path.append(str(Path(__file__).resolve().parent.parent))

from config import settings

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END


# 1. Define Structured Output Schema for Candidates
class CandidateRecommendation(BaseModel):
    title: str = Field(description="Exact official title of the recommended media")
    year: int = Field(description="Release year of the specific item")
    type: str = Field(
        description="Media type: 'movie', 'series', 'anime', 'manga', or 'kdrama'"
    )
    source_hint: str = Field(
        description="Best API to fetch metadata from: 'OMDB', 'ANILIST', or 'TVMAZE'"
    )


class RecommendationList(BaseModel):
    recommendations: List[CandidateRecommendation]


# 2. Define Graph State
class RecommendationState(TypedDict):
    user_library: List[Dict[str, Any]]
    candidates: List[Dict[str, Any]]


# 3. Define the AI Reasoning Node
def generate_recommendations_node(state: RecommendationState) -> Dict[str, Any]:
    llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        model="openai/gpt-oss-120b",
        api_key=settings.OPENROUTER_API_KEY,
        temperature=0.7,
        max_tokens=4000,
    )
    structured_llm = llm.with_structured_output(RecommendationList)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """You are an expert media recommendation engine for an app called NEXUS.
                Analyze the user's library and generate 5 high-quality media recommendations across movies, anime, series, manga, manhwa or kdramas.
                For each recommendation, provide the exact official title, the release year, the media type, and the best primary API source ('OMDB' for movies/shows, 'ANILIST' for anime/manga/manhwa, 'TVMAZE' for non-US or TV series).""",
            ),
            ("user", "User Library Context: {library}"),
        ]
    )

    chain = prompt | structured_llm
    response = chain.invoke({"library": state["user_library"]})

    # Convert Pydantic models to dicts for graph state
    candidate_dicts = [item.model_dump() for item in response.recommendations]
    return {"candidates": candidate_dicts}


# 4. Assemble Graph
workflow = StateGraph(RecommendationState)
workflow.add_node("generate_recommendations", generate_recommendations_node)
workflow.add_edge(START, "generate_recommendations")
workflow.add_edge("generate_recommendations", END)

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
    ]
    import json

    print("--- Running Recommendation Graph with Mock Library ---")

    # Run graph
    initial_state = {"user_library": MOCK_USER_LIBRARY, "candidates": []}
    result = recommendation_app.invoke(initial_state)

    print("\nGenerated Candidates:")
    print(json.dumps(result["candidates"], indent=2))
