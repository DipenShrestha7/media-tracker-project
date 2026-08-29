import asyncio
import json

# pyrefly: ignore [missing-import]
from recommendations import recommendation_app


async def main():
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

    initial_state = {
        "messages": [],
        "user_library": MOCK_USER_LIBRARY,
        "candidates": [],
    }
    result = await recommendation_app.ainvoke(initial_state)

    print("\n--- EXECUTION LOG & SEARCH CONTEXT ---")
    for i, msg in enumerate(result["messages"]):
        print(f"\n[Message {i}] Content:\n{msg.content}\n")

    print("\n--- GENERATED CANDIDATES ---")
    print(json.dumps(result["candidates"], indent=2))


if __name__ == "__main__":
    asyncio.run(main())
