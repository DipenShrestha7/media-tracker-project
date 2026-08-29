from typing import TypedDict, List, Dict, Any, Annotated, Literal
from pydantic import BaseModel, Field
from langgraph.graph.message import add_messages



class CandidateRecommendation(BaseModel):
    title: str = Field(description="Exact official title of the recommended media")
    year: int = Field(description="Release year of the specific media")
    type: Literal["movie", "series", "kdrama", "anime", "manga", "manhwa"] = Field(
        description="The media category"
    )
    source_hint: Literal["OMDB", "ANILIST", "TVMAZE"] = Field(
        description=(
            "Primary API source to hydrate details: "
            "'OMDB' for standard movies & series, "
            "'TVMAZE' for K-dramas, "
            "'ANILIST' for anime, manga, and manhwa."
        )
    )


class RecommendationList(BaseModel):
    recommendations: List[CandidateRecommendation]


class RecommendationState(TypedDict):
    messages: Annotated[list, add_messages]
    user_library: List[Dict[str, Any]]
    candidates: List[Dict[str, Any]]
