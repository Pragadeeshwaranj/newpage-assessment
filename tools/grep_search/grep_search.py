from pathlib import Path
import re
from typing import Optional


def grep_search(
    query: str,
    path: str = ".",
    include: Optional[str] = None,
    case_sensitive: bool = False,
    max_results: int = 100,
) -> dict:
    """
    Search for a text pattern recursively in files.

    Args:
        query: Text or regex pattern to search for.
        path: Directory or file to search.
        include: Optional glob pattern, e.g. "*.py" or "*.js".
        case_sensitive: Whether the search is case-sensitive.
        max_results: Maximum number of matches to return.

    Returns:
        Dictionary containing search results.
    """

    root = Path(path)

    if not root.exists():
        return {
            "success": False,
            "error": f"Path does not exist: {path}",
            "results": [],
        }

    flags = 0 if case_sensitive else re.IGNORECASE

    try:
        pattern = re.compile(query, flags)
    except re.error as exc:
        return {
            "success": False,
            "error": f"Invalid regex: {exc}",
            "results": [],
        }

    files = [root] if root.is_file() else root.rglob(include or "*")

    results = []
    files_scanned = 0

    for file_path in files:
        if not file_path.is_file():
            continue

        # Skip common binary / generated directories
        if any(
            part in {
                ".git",
                "node_modules",
                "__pycache__",
                ".venv",
                "venv",
                "dist",
                "build",
            }
            for part in file_path.parts
        ):
            continue

        files_scanned += 1

        try:
            with file_path.open(
                "r",
                encoding="utf-8",
                errors="ignore",
            ) as file:
                for line_number, line in enumerate(file, start=1):
                    if pattern.search(line):
                        results.append(
                            {
                                "file": str(file_path),
                                "line": line_number,
                                "content": line.rstrip(),
                            }
                        )

                        if len(results) >= max_results:
                            return {
                                "success": True,
                                "query": query,
                                "path": str(root),
                                "files_scanned": files_scanned,
                                "total_matches": len(results),
                                "truncated": True,
                                "results": results,
                            }

        except (PermissionError, OSError):
            # Ignore files that cannot be read
            continue

    return {
        "success": True,
        "query": query,
        "path": str(root),
        "files_scanned": files_scanned,
        "total_matches": len(results),
        "truncated": False,
        "results": results,
    }