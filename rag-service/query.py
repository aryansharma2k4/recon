"""Query pipeline for analyzing a specific file using RAG.

Fetches the target file, performs vector search for relevant chunks,
classifies dependencies, and calls Gemini for structured analysis.
"""

import json
import logging
import os
import re
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

from github import get_file_content
from embeddings import chunk_to_embed_text
from ingest import embedding_model, vector_store
from vector_store import VectorStore
from models import Chunk, QueryResponse

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)

# Maximum chunks to send to the LLM
MAX_CHUNKS_FOR_LLM: int = 10

# Gemini prompt template
LLM_PROMPT: str = """You are a senior engineer helping a developer understand a codebase.
Given the following file and its most relevant related code chunks,
provide a structured analysis. Respond ONLY in JSON with these exact keys:
{{
  "summary": "2-3 sentence explanation of what this file does",
  "read_first": ["ordered list of files to read to understand this"],
  "depends_on": ["files/modules this file needs"],
  "used_by": ["files that depend on this file"],
  "relevant_chunks": [{{"path": "...", "name": "...", "summary": "..."}}]
}}

Target file: {file_path}

Content (first 3000 chars):
{target_content}

Related code chunks:
{chunks}
"""


def _extract_imports(content: str, file_path: str) -> set[str]:
    """Extract imported file paths from source code.

    Handles common import patterns for JS/TS, Python, and Go.

    Args:
        content: The source code content.
        file_path: Path of the file (for language detection).

    Returns:
        Set of imported module/file path strings.
    """
    imports: set[str] = set()

    # JS/TS: import ... from "path" or require("path")
    js_import = re.findall(r'''(?:import\s+.*?from\s+['"](.+?)['"]|require\s*\(\s*['"](.+?)['"]\s*\))''', content)
    for groups in js_import:
        for match in groups:
            if match:
                imports.add(match)

    # Python: import x / from x import y
    py_import = re.findall(r'''(?:from\s+(\S+)\s+import|import\s+(\S+))''', content)
    for groups in py_import:
        for match in groups:
            if match:
                imports.add(match)

    # Go: import "path" or import ( "path" )
    go_import = re.findall(r'''import\s+(?:\(\s*([\s\S]*?)\s*\)|"(.+?)")''', content)
    for groups in go_import:
        for match in groups:
            if match:
                for line in match.strip().split("\n"):
                    cleaned = line.strip().strip('"')
                    if cleaned:
                        imports.add(cleaned)

    return imports


def _classify_chunks(
    results: list[dict[str, Any]],
    target_content: str,
    target_path: str,
) -> tuple[list[str], list[str], list[dict[str, Any]]]:
    """Classify search results into depends_on, used_by, and relevant.

    - depends_on: chunks from files that the target file imports
    - used_by: chunks from files that import the target file
    - relevant: everything else

    Args:
        results: Vector search results with content and metadata.
        target_content: The target file's source code.
        target_path: The target file's path.

    Returns:
        Tuple of (depends_on paths, used_by paths, relevant chunks).
    """
    target_imports = _extract_imports(target_content, target_path)
    # Get the base name without extension for fuzzy matching
    target_base = os.path.splitext(os.path.basename(target_path))[0]

    depends_on: set[str] = set()
    used_by: set[str] = set()
    relevant: list[dict[str, Any]] = []

    for result in results:
        chunk_path: str = result["metadata"]["path"]
        chunk_content: str = result.get("content", "")

        # Skip if it's the same file
        if chunk_path == target_path:
            relevant.append(result)
            continue

        chunk_base = os.path.splitext(os.path.basename(chunk_path))[0]

        # Check if target imports this chunk's file
        is_dependency = any(
            chunk_base in imp or chunk_path in imp
            for imp in target_imports
        )

        # Check if this chunk's file imports the target
        chunk_imports = _extract_imports(chunk_content, chunk_path)
        is_dependent = any(
            target_base in imp or target_path in imp
            for imp in chunk_imports
        )

        if is_dependency:
            depends_on.add(chunk_path)
        elif is_dependent:
            used_by.add(chunk_path)

        relevant.append(result)

    return list(depends_on), list(used_by), relevant


def _format_chunks_for_prompt(results: list[dict[str, Any]]) -> str:
    """Format search result chunks as text for the LLM prompt.

    Args:
        results: Vector search results to format.

    Returns:
        A formatted string with each chunk's path, name, and content.
    """
    parts: list[str] = []
    for i, result in enumerate(results[:MAX_CHUNKS_FOR_LLM], 1):
        meta = result["metadata"]
        content = result.get("content", "")[:500]
        parts.append(
            f"--- Chunk {i}: {meta['path']} :: {meta['name']} ---\n{content}\n"
        )
    return "\n".join(parts)


async def query_file(
    owner: str,
    repo: str,
    sha: str,
    file_path: str,
) -> QueryResponse:
    """Analyze a specific file using RAG and Gemini.

    Pipeline:
      1. Fetch target file content
      2. Build query text and embed it
      3. Vector search for top 10 relevant chunks
      4. Classify into depends_on / used_by / relevant
      5. Assemble context and send to Gemini
      6. Parse Gemini response into QueryResponse

    Args:
        owner: GitHub repo owner.
        repo: GitHub repo name.
        sha: Git commit SHA.
        file_path: Path to the file to analyze.

    Returns:
        QueryResponse with summary, read_first, depends_on, used_by,
        and relevant_chunks.
    """
    repo_id = VectorStore._repo_id(owner, repo, sha)

    # 1. Fetch target file content
    logger.info("Fetching target file: %s", file_path)
    target_content = await get_file_content(owner, repo, file_path, sha)

    # 2. Build query text and embed
    query_text = f"{file_path}\n{target_content[:500]}"
    logger.info("Embedding query text...")
    query_embedding = embedding_model.embed(query_text)

    # 3. Vector search
    logger.info("Searching for relevant chunks...")
    results = vector_store.search(repo_id, query_embedding, n_results=MAX_CHUNKS_FOR_LLM)

    if not results:
        logger.warning("No search results found for %s", file_path)
        return QueryResponse(
            summary="No indexed chunks found for analysis.",
            read_first=[],
            depends_on=[],
            used_by=[],
            relevant_chunks=[],
        )

    # 4. Classify chunks
    depends_on, used_by, relevant = _classify_chunks(results, target_content, file_path)

    # 5. Build prompt and call Gemini
    chunks_text = _format_chunks_for_prompt(results)
    prompt = LLM_PROMPT.format(
        file_path=file_path,
        target_content=target_content[:3000],
        chunks=chunks_text,
    )

    logger.info("Calling Gemini API...")
    gemini_response = await _call_gemini(prompt)

    # 6. Parse response
    try:
        parsed = json.loads(gemini_response)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', gemini_response)
        if json_match:
            parsed = json.loads(json_match.group())
        else:
            logger.error("Failed to parse Gemini response as JSON")
            parsed = {}

    # Merge Gemini's analysis with our dependency classification
    return QueryResponse(
        summary=parsed.get("summary", "Analysis could not be generated."),
        read_first=parsed.get("read_first", []),
        depends_on=parsed.get("depends_on", depends_on),
        used_by=parsed.get("used_by", used_by),
        relevant_chunks=parsed.get("relevant_chunks", []),
    )


async def _call_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the response text.

    Uses the Google Generative AI SDK with gemini-2.5-flash.

    Args:
        prompt: The full prompt to send.

    Returns:
        The text content of Gemini's response.
    """
    model = genai.GenerativeModel("gemini-2.5-flash")

    response = model.generate_content(prompt)

    response_text: str = response.text
    logger.info("Gemini response received (%d chars)", len(response_text))
    return response_text
