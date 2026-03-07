"""FastAPI application entry point for the Recon RAG microservice.

Exposes three endpoints:
  POST /ingest  — ingest a GitHub repo into the vector store
  POST /query   — analyze a specific file using RAG + Claude
  GET  /health  — health check
"""

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import IngestRequest, IngestResponse, QueryRequest, QueryResponse
from ingest import ingest_repo, vector_store
from query import query_file
from vector_store import VectorStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

app = FastAPI(title="recon-rag")

# CORS — allow Next.js dev server at localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    """Health check endpoint.

    Returns:
        A dict with status "ok".
    """
    return {"status": "ok"}


@app.post("/ingest", response_model=IngestResponse)
async def ingest(request: IngestRequest) -> IngestResponse:
    """Ingest a GitHub repo into the vector store.

    Receives the file tree (with churn scores) from the Next.js frontend,
    fetches file contents, parses AST chunks, embeds them, and stores
    in ChromaDB.

    Args:
        request: IngestRequest with owner, repo, sha, tree, and churn_scores.

    Returns:
        IngestResponse with status, file_count, and chunk_count.

    Raises:
        HTTPException 404: If the GitHub repo is not found.
        HTTPException 500: If an unexpected error occurs during ingestion.
    """
    try:
        result = await ingest_repo(
            owner=request.owner,
            repo=request.repo,
            sha=request.sha,
            tree=request.tree,
            churn_scores=request.churn_scores,
        )
        return result
    except Exception as exc:
        error_msg = str(exc)
        if "404" in error_msg or "Not Found" in error_msg:
            raise HTTPException(status_code=404, detail="GitHub repo not found")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {error_msg}")


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest) -> QueryResponse:
    """Analyze a specific file using RAG and Claude.

    Requires the repo to have been ingested first via /ingest.
    Performs vector search, classifies dependencies, and calls Claude
    for structured analysis.

    Args:
        request: QueryRequest with owner, repo, sha, and file_path.

    Returns:
        QueryResponse with summary, read_first, depends_on, used_by,
        and relevant_chunks.

    Raises:
        HTTPException 400: If the repo has not been ingested yet.
        HTTPException 500: If an unexpected error occurs during query.
    """
    repo_id = VectorStore._repo_id(request.owner, request.repo, request.sha)

    # Removed vector_store.exists() check to allow querying while the repository is still being ingested in the background.

    try:
        result = await query_file(
            owner=request.owner,
            repo=request.repo,
            sha=request.sha,
            file_path=request.file_path,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(exc)}")
