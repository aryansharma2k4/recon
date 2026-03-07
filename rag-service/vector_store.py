"""ChromaDB vector store wrapper for code chunk storage and retrieval.

Provides persistent local storage at ./chroma_db with one collection
per repo+sha combination. Supports storing chunks with metadata and
performing vector similarity search.
"""

import logging
from typing import Any

import chromadb
from chromadb.config import Settings

from models import Chunk

logger = logging.getLogger(__name__)

# Local persistent storage directory
CHROMA_DB_PATH: str = "./chroma_db"


class VectorStore:
    """Wrapper around ChromaDB for storing and searching code chunk embeddings."""

    def __init__(self) -> None:
        """Initialize the ChromaDB client with local persistent storage."""
        logger.info("Initializing ChromaDB at %s", CHROMA_DB_PATH)
        self._client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        logger.info("ChromaDB initialized")

    @staticmethod
    def _repo_id(owner: str, repo: str, sha: str) -> str:
        """Build a collection ID from owner, repo, and sha.

        Args:
            owner: GitHub repo owner.
            repo: GitHub repo name.
            sha: Git commit SHA.

        Returns:
            A string in the format "owner__repo__sha".
        """
        return f"{owner}__{repo}__{sha}"

    def get_or_create_collection(self, repo_id: str) -> chromadb.Collection:
        """Get or create a ChromaDB collection for a given repo.

        One collection per repo+sha combination ensures isolation between
        different repos and different versions of the same repo.

        Args:
            repo_id: Collection identifier (e.g. "owner__repo__sha").

        Returns:
            The ChromaDB Collection object.
        """
        # ChromaDB collection names must match [a-zA-Z0-9_-] and be 3-63 chars
        # Replace any problematic characters
        safe_name = repo_id[:63].replace(".", "_").replace("/", "_")
        collection = self._client.get_or_create_collection(name=safe_name)
        logger.info("Collection '%s' ready (%d docs)", safe_name, collection.count())
        return collection

    def store(
        self,
        repo_id: str,
        chunks: list[Chunk],
        embeddings: list[list[float]],
    ) -> None:
        """Store code chunks with their embeddings in ChromaDB.

        Each chunk is stored with its embedding vector and metadata
        (path, name, type, churn_score, start_line, end_line).

        Args:
            repo_id: Collection identifier for this repo+sha.
            chunks: List of Chunk objects to store.
            embeddings: Corresponding embedding vectors (same order as chunks).
        """
        if not chunks:
            logger.warning("store: no chunks to store for %s", repo_id)
            return

        collection = self.get_or_create_collection(repo_id)

        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{chunk.path}::{chunk.name}::{chunk.start_line}"
            ids.append(chunk_id)
            documents.append(chunk.content)
            metadatas.append({
                "path": chunk.path,
                "name": chunk.name,
                "type": chunk.type,
                "churn_score": chunk.churn_score,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
            })

        # ChromaDB upsert handles duplicates gracefully
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info("Stored %d chunks in collection '%s'", len(chunks), repo_id)

    def search(
        self,
        repo_id: str,
        query_embedding: list[float],
        n_results: int = 10,
    ) -> list[dict[str, Any]]:
        """Perform vector similarity search for the most relevant chunks.

        Args:
            repo_id: Collection identifier to search within.
            query_embedding: The query vector to search with.
            n_results: Maximum number of results to return (default 10).

        Returns:
            List of dicts with keys: id, content, metadata, distance.
            Sorted by relevance (lowest distance first).
        """
        collection = self.get_or_create_collection(repo_id)

        # Clamp n_results to available docs
        doc_count = collection.count()
        if doc_count == 0:
            logger.warning("search: collection '%s' is empty", repo_id)
            return []

        actual_n = min(n_results, doc_count)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_n,
            include=["documents", "metadatas", "distances"],
        )

        # Unpack ChromaDB query results into a flat list of dicts
        output: list[dict[str, Any]] = []
        for i in range(len(results["ids"][0])):
            output.append({
                "id": results["ids"][0][i],
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })

        logger.info(
            "search: found %d results in '%s'", len(output), repo_id,
        )
        return output

    def exists(self, repo_id: str) -> bool:
        """Check if a repo+sha has already been ingested.

        Args:
            repo_id: Collection identifier to check.

        Returns:
            True if the collection exists and contains documents.
        """
        safe_name = repo_id[:63].replace(".", "_").replace("/", "_")
        try:
            existing = self._client.list_collections()
            for col in existing:
                if col.name == safe_name:
                    count = col.count()
                    logger.info("exists: '%s' has %d docs", safe_name, count)
                    return count > 0
        except Exception:
            pass

        return False
