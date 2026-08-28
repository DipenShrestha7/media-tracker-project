from langchain_tavily import TavilySearch
from config import settings


def get_web_search_tool():
    """Returns an initialized Tavily Search Tool tuned for current media updates."""
    return TavilySearch(
        api_key=settings.TAVILY_API_KEY,
        max_results=5,
        search_depth="advanced",
        include_raw_content=True,
        description=(
            "Use this tool whenever the user asks for current, live, or time-sensitive information "
            "about movies, TV shows, anime, manga, streaming availability, release dates, reviews, "
            "box office, news, or recent trends that may not be in the local media tracker database or "
            "conversation context. Prioritize the freshest available sources and the newest data for "
            "recent releases and changing facts. Do not use this tool for general static knowledge or "
            "questions already answered by the local database, uploaded documents, or prior context."
        ),
    )


def get_web_recommend_tool():
    """Returns an initialized Tavily Search Tool tuned for current media updates."""
    return TavilySearch(
        api_key=settings.TAVILY_API_KEY,
        max_results=5,
        search_depth="basic",
        include_raw_content=False,
        include_domains=[
            "imdb.com",
            "myanimelist.net",
            "anilist.co",
            "tvmaze.com",
            "rottentomatoes.com",
        ],
        description=(
            """
            You are an expert media recommendation engine for NEXUS.
            Analyze ALL items in the user's library across ALL genres and media types (Movies, TV Series, Anime, Manga).

            Rules for Recommendations:
            1. Diversity: You MUST recommend a mix matching the user's library types (e.g., at least 1 Anime, 1 TV Series, and Movies).
            2. Relevance: Do not recommend generic blockbusters unless they directly match the user's specific genre preferences (e.g., Crime/Drama, Action/Fantasy, Sci-Fi/Adventure).
            3. Accuracy: Ensure exact official titles and release years.
            """
        ),
    )


web_search_tool = get_web_search_tool()
recommend_search_tool = get_web_recommend_tool()
