# apps/ai_service/tools/web_tool.py
from langchain_community.tools.tavily_search import TavilySearchResults
from config import settings


def get_web_search_tool():
    """Returns an initialized Tavily Search Tool for LangChain."""
    return TavilySearchResults(max_results=3, tavily_api_key=settings.TAVILY_API_KEY)


web_search_tool = get_web_search_tool()


# from langchain_tavily import TavilySearch

# web_tool = TavilySearch(
#     max_results=1,
#     include_raw_content=False,
#     search_depth="advanced",
#     description=(
#         "STRICT CONDITION: Use this tool ONLY IF the user explicitly asks you to search the web, "
#         "or look up live data outside their PDF. Otherwise, stick to Document_Search."
#     ),
# )
