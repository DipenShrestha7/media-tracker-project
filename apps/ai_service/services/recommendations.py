from models.chat import StructuredRecommendationResponse
from langchain_core.messages import HumanMessage, SystemMessage


async def generate_structured_recommendations(
    self, query: str
) -> StructuredRecommendationResponse:
    from langchain_core.output_parsers import PydanticOutputParser

    parser = PydanticOutputParser(pydantic_object=StructuredRecommendationResponse)

    system_prompt = (
        f"You are an expert media recommendation engine.\n"
        f"Today's date is {self._get_current_time_str()}.\n"
        f"Return precise structured recommendations based on the user's criteria.\n\n"
        f"{parser.get_format_instructions()}"
    )

    prompt = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=query),
    ]

    response = await self.llm.ainvoke(prompt)
    return parser.parse(response.content)

