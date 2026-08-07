import os
from typing import List
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from config import settings


class VectorStoreService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            base_url="https://openrouter.ai/api/v1",
            model="text-embedding-3-small",
            api_key=settings.OPENROUTER_API_KEY,
        )
        self.persist_directory = os.path.join(os.getcwd(), "chroma_db")

        self.vector_store = Chroma(
            collection_name="nexus_media",
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
        )

    def add_media_documents(self, docs: List[Document]):
        """Adds a list of LangChain Document objects to ChromaDB."""
        self.vector_store.add_documents(docs)

    def search_similar(self, query: str, k: int = 3) -> List[Document]:
        """Performs semantic similarity search for top k matching documents."""
        return self.vector_store.similarity_search(query, k=k)

    def get_retriever(self):
        """Returns a LangChain retriever object."""
        return self.vector_store.as_retriever(search_kwargs={"k": 3})


vector_service = VectorStoreService()
