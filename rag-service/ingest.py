"""Ingestion pipeline for processing GitHub repos into vector storage.

Orchestrates the full flow: filter tree → rank files → fetch contents →
parse AST → embed chunks → store in ChromaDB.
"""

import asyncio
import logging
from typing import Any

from github import get_file_content, filter_tree, rank_files
from ast_parser import extract_chunks
from embeddings import EmbeddingModel, chunk_to_embed_text
from vector_store import VectorStore
from models import Chunk, FileTreeItem, IngestResponse

logger = logging.getLogger(__name__)

# How many files to fetch in parallel per batch
FETCH_BATCH_SIZE: int = 20

# Global singletons — loaded once, reused across requests
embedding_model = EmbeddingModel()
vector_store = VectorStore()


async def ingest_repo(
    owner: str,
    repo: str,
    sha: str,
    tree: list[FileTreeItem],
    churn_scores: dict[str, int],
) -> IngestResponse:
    """Ingest a GitHub repo into the vector store.

    Full pipeline:
      1. Check if already ingested → return early if so
      2. Filter tree to code files only
      3. Rank files by churn + inverse size → take top 100
      4. Fetch all file contents in parallel (batches of 20)
      5. Parse each file into AST chunks
      6. Attach churn scores to each chunk
      7. Embed all chunks in batches
      8. Store in ChromaDB
      9. Return IngestResponse

    Args:
        owner: GitHub repo owner.
        repo: GitHub repo name.
        sha: Git commit SHA.
        tree: File tree from the frontend (includes churn scores).
        churn_scores: Dict mapping file path → churn count.

    Returns:
        IngestResponse with status, file_count, and chunk_count.
    """
    repo_id = VectorStore._repo_id(owner, repo, sha)

    # 1. Check if already ingested
    if vector_store.exists(repo_id):
        logger.info("Repo %s already ingested, skipping", repo_id)
        collection = vector_store.get_or_create_collection(repo_id)
        return IngestResponse(
            status="already_ready",
            file_count=0,
            chunk_count=collection.count(),
        )

    # 2. Filter tree to code files
    logger.info("Step 1/6: Filtering tree...")
    code_files = filter_tree(tree)
    logger.info("Found %d code files", len(code_files))

    # 3. Rank and take top 100
    logger.info("Step 2/6: Ranking files...")
    ranked = rank_files(code_files, churn_scores)
    logger.info("Selected top %d files to ingest", len(ranked))

    # 4. Fetch all file contents in parallel
    logger.info("Step 3/6: Fetching file contents...")
    file_contents = await _fetch_all_contents(owner, repo, sha, ranked)
    logger.info("Fetched %d / %d files successfully", len(file_contents), len(ranked))

    # 5 & 6. Parse chunks and attach churn scores
    logger.info("Step 4/6: Parsing AST chunks...")
    all_chunks: list[Chunk] = []
    for file_item, content in file_contents:
        try:
            chunks = extract_chunks(file_item.path, content)
        except Exception as exc:
            logger.warning("AST parse failed for %s: %s — using module chunk", file_item.path, exc)
            from ast_parser import _make_module_chunk
            chunks = [_make_module_chunk(file_item.path, content)]

        # Attach churn score from the churn map
        churn = churn_scores.get(file_item.path, file_item.churn_score)
        for chunk in chunks:
            chunk.churn_score = churn

        all_chunks.extend(chunks)

    logger.info("Extracted %d total chunks from %d files", len(all_chunks), len(file_contents))

    if not all_chunks:
        logger.warning("No chunks extracted — nothing to store")
        return IngestResponse(status="ready", file_count=len(file_contents), chunk_count=0)

    # 7. Embed all chunks
    logger.info("Step 5/6: Embedding %d chunks...", len(all_chunks))
    embed_texts = [chunk_to_embed_text(c) for c in all_chunks]
    embeddings = embedding_model.embed_batch(embed_texts)

    # 8. Store in vector store
    logger.info("Step 6/6: Storing in ChromaDB...")
    vector_store.store(repo_id, all_chunks, embeddings)

    logger.info(
        "Ingestion complete: %d files, %d chunks for %s",
        len(file_contents), len(all_chunks), repo_id,
    )

    return IngestResponse(
        status="ready",
        file_count=len(file_contents),
        chunk_count=len(all_chunks),
    )


async def _fetch_all_contents(
    owner: str,
    repo: str,
    sha: str,
    files: list[FileTreeItem],
) -> list[tuple[FileTreeItem, str]]:
    """Fetch file contents in parallel batches.

    Fetches up to FETCH_BATCH_SIZE files concurrently. If a single file
    fetch fails, it is skipped and the rest continue.

    Args:
        owner: GitHub repo owner.
        repo: GitHub repo name.
        sha: Git commit SHA.
        files: List of FileTreeItems to fetch.

    Returns:
        List of (FileTreeItem, content) tuples for successfully fetched files.
    """
    results: list[tuple[FileTreeItem, str]] = []

    for i in range(0, len(files), FETCH_BATCH_SIZE):
        batch = files[i : i + FETCH_BATCH_SIZE]
        tasks = [
            _safe_fetch(owner, repo, f.path, sha, f)
            for f in batch
        ]
        batch_results = await asyncio.gather(*tasks)

        for result in batch_results:
            if result is not None:
                results.append(result)

        logger.info(
            "Fetched batch %d–%d of %d files",
            i + 1, min(i + FETCH_BATCH_SIZE, len(files)), len(files),
        )

    return results


async def _safe_fetch(
    owner: str,
    repo: str,
    file_path: str,
    sha: str,
    file_item: FileTreeItem,
) -> tuple[FileTreeItem, str] | None:
    """Fetch a single file's content, returning None on failure.

    Args:
        owner: GitHub repo owner.
        repo: GitHub repo name.
        file_path: Path to the file.
        sha: Git commit SHA.
        file_item: The FileTreeItem for this file.

    Returns:
        A (FileTreeItem, content) tuple on success, or None on failure.
    """
    try:
        content = await get_file_content(owner, repo, file_path, sha)
        return (file_item, content)
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s — skipping", file_path, exc)
        return None
