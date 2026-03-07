"""AST-based code chunk extractor using tree-sitter.

Parses source files into function/class/module chunks for embedding.
Supports TypeScript, JavaScript, Python, and Go.
"""

import logging
import os

from tree_sitter_language_pack import get_language, get_parser

from models import Chunk

logger = logging.getLogger(__name__)

# Map file extensions to tree-sitter language names
EXTENSION_MAP: dict[str, str] = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".go": "go",
}

# Tree-sitter node types that represent extractable chunks per language
FUNCTION_NODE_TYPES: dict[str, set[str]] = {
    "typescript": {
        "function_declaration",
        "method_definition",
        "arrow_function",
        "function",
        "export_statement",
    },
    "javascript": {
        "function_declaration",
        "method_definition",
        "arrow_function",
        "function",
        "export_statement",
    },
    "python": {
        "function_definition",
    },
    "go": {
        "function_declaration",
        "method_declaration",
    },
}

CLASS_NODE_TYPES: dict[str, set[str]] = {
    "typescript": {"class_declaration"},
    "javascript": {"class_declaration"},
    "python": {"class_definition"},
    "go": {"type_declaration"},
}

# Minimum number of lines for a chunk to be considered meaningful
MIN_CHUNK_LINES: int = 3


def _detect_language(file_path: str) -> str | None:
    """Detect the tree-sitter language from a file extension.

    Args:
        file_path: Path to the source file.

    Returns:
        The tree-sitter language name, or None if unsupported.
    """
    _, ext = os.path.splitext(file_path)
    return EXTENSION_MAP.get(ext.lower())


def _extract_name_from_node(node, source_bytes: bytes, lang: str) -> str:
    """Extract a human-readable name from a tree-sitter AST node.

    Handles different naming conventions per language and node type.

    Args:
        node: The tree-sitter node.
        source_bytes: The raw source file bytes.
        lang: The tree-sitter language name.

    Returns:
        The extracted name, or "anonymous" if no name is found.
    """
    # For export statements, dig into the child declaration
    if node.type == "export_statement":
        for child in node.children:
            if child.type in ("function_declaration", "class_declaration",
                              "lexical_declaration", "variable_declaration"):
                return _extract_name_from_node(child, source_bytes, lang)
        # If it's a default export of an arrow function, e.g. export default () => ...
        return "default_export"

    # For lexical/variable declarations (const foo = () => {})
    if node.type in ("lexical_declaration", "variable_declaration"):
        for child in node.children:
            if child.type == "variable_declarator":
                name_node = child.child_by_field_name("name")
                if name_node:
                    return source_bytes[name_node.start_byte:name_node.end_byte].decode(
                        "utf-8", errors="replace"
                    )

    # Standard: look for "name" field
    name_node = node.child_by_field_name("name")
    if name_node:
        return source_bytes[name_node.start_byte:name_node.end_byte].decode(
            "utf-8", errors="replace"
        )

    # Go methods: look for "name" in the function part
    if node.type == "method_declaration":
        name_node = node.child_by_field_name("name")
        if name_node:
            return source_bytes[name_node.start_byte:name_node.end_byte].decode(
                "utf-8", errors="replace"
            )

    return "anonymous"


def _has_function_child(node, lang: str) -> bool:
    """Check if an export_statement contains a function or arrow function.

    Args:
        node: The tree-sitter node (expected to be export_statement).
        lang: The tree-sitter language name.

    Returns:
        True if the node wraps a function-like declaration.
    """
    for child in node.children:
        if child.type in ("function_declaration", "arrow_function", "function"):
            return True
        if child.type in ("lexical_declaration", "variable_declaration"):
            for sub in child.children:
                if sub.type == "variable_declarator":
                    value = sub.child_by_field_name("value")
                    if value and value.type in ("arrow_function", "function"):
                        return True
    return False


def _walk_top_level(root_node, source_bytes: bytes, lang: str) -> list[dict]:
    """Walk top-level AST nodes and extract function/class declarations.

    Only looks at immediate children of the root node (top-level) or
    one level deep for exports.

    Args:
        root_node: The root node of the parsed AST.
        source_bytes: The raw source file bytes.
        lang: The tree-sitter language name.

    Returns:
        List of dicts with keys: name, type ("function" or "class"),
        content, start_line, end_line.
    """
    func_types = FUNCTION_NODE_TYPES.get(lang, set())
    class_types = CLASS_NODE_TYPES.get(lang, set())
    results: list[dict] = []

    for node in root_node.children:
        node_type: str | None = None

        if node.type in class_types:
            node_type = "class"
        elif node.type in func_types:
            # For export_statement, only treat as function if it wraps one
            if node.type == "export_statement":
                if _has_function_child(node, lang):
                    node_type = "function"
                else:
                    # Could be exporting a class
                    for child in node.children:
                        if child.type in class_types:
                            node_type = "class"
                            break
                    if node_type is None:
                        continue
            else:
                node_type = "function"
        else:
            # For Python, also check methods inside classes at top level
            continue

        if node_type is None:
            continue

        start_line: int = node.start_point[0] + 1  # tree-sitter is 0-indexed
        end_line: int = node.end_point[0] + 1
        line_count: int = end_line - start_line + 1

        if line_count < MIN_CHUNK_LINES:
            continue

        content: str = source_bytes[node.start_byte:node.end_byte].decode(
            "utf-8", errors="replace"
        )
        name: str = _extract_name_from_node(node, source_bytes, lang)

        results.append({
            "name": name,
            "type": node_type,
            "content": content,
            "start_line": start_line,
            "end_line": end_line,
        })

    return results


def extract_chunks(file_path: str, content: str) -> list[Chunk]:
    """Parse a source file and extract function/class chunks.

    Uses tree-sitter to parse the AST and extract each top-level function
    and class as its own Chunk. If no functions/classes are found, the
    entire file is treated as a single module-level chunk.

    Args:
        file_path: Path to the source file (used for language detection).
        content: The raw source code as a string.

    Returns:
        List of Chunk objects extracted from the file.
        Returns a single module chunk if no functions/classes are found.
    """
    lang = _detect_language(file_path)
    if lang is None:
        logger.warning("extract_chunks: unsupported file type for %s", file_path)
        return [_make_module_chunk(file_path, content)]

    try:
        language = get_language(lang)
        parser = get_parser(lang)
    except Exception as exc:
        logger.error("extract_chunks: failed to load parser for %s: %s", lang, exc)
        return [_make_module_chunk(file_path, content)]

    source_bytes: bytes = content.encode("utf-8")

    try:
        tree = parser.parse(source_bytes)
    except Exception as exc:
        logger.error("extract_chunks: parse failed for %s: %s", file_path, exc)
        return [_make_module_chunk(file_path, content)]

    raw_chunks = _walk_top_level(tree.root_node, source_bytes, lang)

    if not raw_chunks:
        # No functions or classes found — treat whole file as module chunk
        return [_make_module_chunk(file_path, content)]

    chunks: list[Chunk] = []
    for rc in raw_chunks:
        chunks.append(Chunk(
            path=file_path,
            name=rc["name"],
            type=rc["type"],
            content=rc["content"],
            churn_score=0,  # will be set by ingest pipeline
            start_line=rc["start_line"],
            end_line=rc["end_line"],
        ))

    logger.info(
        "extract_chunks: %d chunks from %s (%s)",
        len(chunks), file_path, lang,
    )
    return chunks


def _make_module_chunk(file_path: str, content: str) -> Chunk:
    """Create a single module-level chunk for the entire file.

    Used as a fallback when no functions or classes are found,
    or when the parser fails.

    Args:
        file_path: Path to the source file.
        content: The full file content.

    Returns:
        A Chunk representing the entire file as a module.
    """
    lines = content.split("\n")
    name = os.path.basename(file_path).rsplit(".", 1)[0]
    return Chunk(
        path=file_path,
        name=name,
        type="module",
        content=content,
        churn_score=0,
        start_line=1,
        end_line=len(lines),
    )
