"""Pydantic models for the Recon RAG microservice."""

from pydantic import BaseModel, ConfigDict, Field


class FileTreeItem(BaseModel):
    """A single file entry from the GitHub file tree (sent by the frontend)."""

    model_config = ConfigDict(populate_by_name=True)

    path: str
    type: str
    size: int
    sha: str
    churn_score: int = Field(alias="churnScore", default=0)


class Chunk(BaseModel):
    """Represents a code chunk extracted from a source file."""

    path: str
    name: str
    type: str  # "function" | "class" | "module"
    content: str
    churn_score: int
    start_line: int
    end_line: int


class IngestRequest(BaseModel):
    """Request body for the /ingest endpoint.

    The frontend sends the full file tree (with churn scores already computed)
    and a churn map, so the RAG service does not need to compute them.
    """

    model_config = ConfigDict(populate_by_name=True)

    owner: str
    repo: str
    sha: str
    tree: list[FileTreeItem]
    churn_scores: dict[str, int] = Field(alias="churnMap", default_factory=dict)


class IngestResponse(BaseModel):
    """Response body for the /ingest endpoint."""

    status: str  # "ready" | "already_ready"
    file_count: int
    chunk_count: int


class QueryRequest(BaseModel):
    """Request body for the /query endpoint."""

    owner: str
    repo: str
    sha: str
    file_path: str


class QueryResponse(BaseModel):
    """Response body for the /query endpoint."""

    summary: str
    read_first: list[str]
    depends_on: list[str]
    used_by: list[str]
    relevant_chunks: list[dict]
