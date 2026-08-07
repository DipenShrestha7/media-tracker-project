from langchain_core.documents import Document
from apps.ai_service.services.vector_store import vector_service


def seed():
    sample_media = [
        Document(
            page_content="Inception (2010): A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
            metadata={"title": "Inception", "type": "movie", "genre": "Sci-Fi"},
        ),
        Document(
            page_content="Arcane (2021): Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart.",
            metadata={"title": "Arcane", "type": "tv_show", "genre": "Animation"},
        ),
        Document(
            page_content="Attack on Titan (2013): After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
            metadata={"title": "Attack on Titan", "type": "anime", "genre": "Action"},
        ),
        Document(
            page_content="User Watchlist Note: User 'Alex' rated Cyberpunk: Edgerunners 10/10 and marked it as Completed. Favorite character: David Martinez.",
            metadata={"user": "Alex", "category": "user_watchlist"},
        ),
    ]

    print("Seeding ChromaDB with sample media documents...")
    vector_service.add_media_documents(sample_media)
    print("Seeding complete!")


if __name__ == "__main__":
    seed()
