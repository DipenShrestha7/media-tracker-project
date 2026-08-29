from langchain_tavily import TavilySearch
from config import settings


def get_web_search_tool() -> TavilySearch:
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
        max_results=3,
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
            "Search for top-rated, highly recommended, or trending media titles. "
            "Input a specific search query containing genres and media formats "
            "(e.g., 'top rated dark fantasy anime', 'best sci-fi space movies')."
        ),
    )


web_search_tool = get_web_search_tool()
recommend_search_tool = get_web_recommend_tool()
