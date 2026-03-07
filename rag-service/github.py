"""GitHub API layer for fetching file content.

The file tree and churn scores are provided by the Next.js frontend,
so this module only handles fetching raw file content and ranking files.
Uses httpx for async HTTP calls and GITHUB_TOKEN from env for auth.
"""

import os
import base64
import logging
from typing import Any

import httpx
from dotenv import load_dotenv
from pathlib import Path

from models import FileTreeItem

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

# File extensions we care about for code analysis
ALLOWED_EXTENSIONS: set[str] = {".ts", ".tsx", ".js", ".jsx", ".py", ".go"}

# Directories to always skip
SKIP_DIRS: set[str] = {"node_modules", ".git", "dist", "build"}

# Max file size in bytes (500 KB)
MAX_FILE_SIZE: int = 500_000


def _headers() -> dict[str, str]:
    """Build authorization headers for GitHub API requests."""
    headers: dict[str, str] = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _should_skip_path(path: str) -> bool:
    """Check if a file path belongs to a directory we want to skip.

    Args:
        path: The file path to check.

    Returns:
        True if the path should be skipped, False otherwise.
    """
    parts = path.split("/")
    return any(part in SKIP_DIRS for part in parts)


def _has_allowed_extension(path: str) -> bool:
    """Check if a file has one of the allowed extensions.

    Args:
        path: The file path to check.

    Returns:
        True if the file extension is in ALLOWED_EXTENSIONS.
    """
    return any(path.endswith(ext) for ext in ALLOWED_EXTENSIONS)


async def get_file_content(owner: str, repo: str, file_path: str, sha: str) -> str:
    """Fetch and decode a single file's content from GitHub.

    Uses the Contents API, extracts the base64-encoded content, and decodes it.

    Args:
        owner: GitHub repo owner.
        repo: GitHub repo name.
        file_path: Path to the file within the repo.
        sha: Git commit SHA or branch to read from.

    Returns:
        The raw file content as a string.
    """
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{file_path}?ref={sha}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        data = resp.json()

    content_b64: str = data.get("content", "")
    raw_bytes = base64.b64decode(content_b64)
    return raw_bytes.decode("utf-8", errors="replace")


def filter_tree(tree: list[FileTreeItem]) -> list[FileTreeItem]:
    """Filter the frontend-provided tree to only code files we can parse.

    Keeps only blobs with allowed extensions, skips ignored directories
    and files larger than 500 KB.

    Args:
        tree: Full file tree from the frontend (includes all file types).

    Returns:
        Filtered list of FileTreeItem with only parseable code files.
    """
    filtered: list[FileTreeItem] = []
    for item in tree:
        if item.type != "blob":
            continue
        if _should_skip_path(item.path):
            continue
        if not _has_allowed_extension(item.path):
            continue
        if item.size > MAX_FILE_SIZE:
            continue
        filtered.append(item)

    logger.info("filter_tree: %d code files from %d total items", len(filtered), len(tree))
    return filtered


def rank_files(
    tree: list[FileTreeItem],
    churn_map: dict[str, int],
) -> list[FileTreeItem]:
    """Score and rank files by importance using churn and inverse size.

    Formula: score = (churn_score × 0.6) + (1/size × 0.4)
    Returns the top 100 files sorted by descending score.

    Args:
        tree: Filtered list of code files.
        churn_map: Dict mapping file path → churn count (from frontend).

    Returns:
        Top 100 FileTreeItems sorted by importance score (descending).
    """
    scored: list[tuple[float, FileTreeItem]] = []
    for item in tree:
        size: int = max(item.size, 1)  # avoid division by zero
        churn: int = churn_map.get(item.path, item.churn_score)
        score: float = (churn * 0.6) + ((1.0 / size) * 0.4)
        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_files = [item for _, item in scored[:100]]

    logger.info("rank_files: selected top %d files from %d", len(top_files), len(tree))
    return top_files
