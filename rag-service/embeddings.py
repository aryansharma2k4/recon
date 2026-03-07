"""Embedding model wrapper using sentence-transformers.

Loads the all-MiniLM-L6-v2 model once and provides methods to embed
individual texts or batches of texts for vector storage and search.

Model info:
  - Dimension: 384
  - Max sequence length: 256 tokens
  - Fast and lightweight — suitable for CPU inference
"""

import logging

from sentence_transformers import SentenceTransformer

from models import Chunk

logger = logging.getLogger(__name__)

# Batch size to avoid memory issues when embedding many chunks at once
EMBED_BATCH_SIZE: int = 50


class EmbeddingModel:
    """Wrapper around sentence-transformers for code chunk embedding.

    Loads the model once on init and reuses it for all subsequent calls.
    """

    def __init__(self) -> None:
        """Load the all-MiniLM-L6-v2 model from sentence-transformers."""
        logger.info("Loading embedding model: all-MiniLM-L6-v2")
        self._model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info(
            "Embedding model loaded — dimension: %d",
            self._model.get_sentence_embedding_dimension(),
        )

    @property
    def dimension(self) -> int:
        """Return the embedding vector dimension (384 for MiniLM-L6-v2).

        Returns:
            The number of dimensions in the embedding vector.
        """
        return self._model.get_sentence_embedding_dimension()

    def embed(self, text: str) -> list[float]:
        """Embed a single text string into a vector.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        vector = self._model.encode(text, convert_to_numpy=True)
        return vector.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts in batches to avoid memory issues.

        Processes texts in batches of 50. Each text is encoded independently.

        Args:
            texts: List of text strings to embed.

        Returns:
            List of embedding vectors (one per input text).
        """
        all_embeddings: list[list[float]] = []

        for i in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[i : i + EMBED_BATCH_SIZE]
            vectors = self._model.encode(batch, convert_to_numpy=True)
            all_embeddings.extend(vectors.tolist())
            logger.info(
                "Embedded batch %d–%d of %d texts",
                i + 1, min(i + EMBED_BATCH_SIZE, len(texts)), len(texts),
            )

        return all_embeddings


def chunk_to_embed_text(chunk: Chunk) -> str:
    """Build the text string used for embedding a code chunk.

    Combines the file path, chunk name, and first 500 characters of content
    to create a representative text for vector search.

    Args:
        chunk: The Chunk to create embed text for.

    Returns:
        A formatted string: "{path}\\n{name}\\n{content[:500]}"
    """
    return f"{chunk.path}\n{chunk.name}\n{chunk.content[:500]}"
