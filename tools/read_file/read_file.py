from pathlib import Path
from typing import Optional


def read_file(
    path: str,
    start_line: Optional[int] = None,
    end_line: Optional[int] = None,
    max_lines: int = 500,
) -> dict:
    """
    Read the contents of a text file.

    Args:
        path: File to read.
        start_line: Starting line number (1-based).
        end_line: Ending line number (inclusive).
        max_lines: Maximum number of lines to return.

    Returns:
        Structured result containing file content and metadata.
    """

    if not path or not path.strip():
        return {
            "success": False,
            "error": "File path cannot be empty.",
        }

    if max_lines <= 0:
        return {
            "success": False,
            "error": "max_lines must be greater than 0.",
        }

    file_path = Path(path)

    if not file_path.exists():
        return {
            "success": False,
            "error": f"File does not exist: {path}",
        }

    if not file_path.is_file():
        return {
            "success": False,
            "error": f"Path is not a file: {path}",
        }

    if start_line is not None and start_line < 1:
        return {
            "success": False,
            "error": "start_line must be greater than or equal to 1.",
        }

    if end_line is not None and end_line < 1:
        return {
            "success": False,
            "error": "end_line must be greater than or equal to 1.",
        }

    if (
        start_line is not None
        and end_line is not None
        and start_line > end_line
    ):
        return {
            "success": False,
            "error": "start_line cannot be greater than end_line.",
        }

    try:
        lines = file_path.read_text(
            encoding="utf-8",
            errors="replace",
        ).splitlines()

    except PermissionError:
        return {
            "success": False,
            "error": f"Permission denied: {path}",
        }

    except OSError as exc:
        return {
            "success": False,
            "error": f"Unable to read file: {exc}",
        }

    total_lines = len(lines)

    # Convert to zero-based indexes.
    start_index = (
        start_line - 1
        if start_line is not None
        else 0
    )

    end_index = (
        end_line
        if end_line is not None
        else total_lines
    )

    # Apply max_lines.
    requested_lines = lines[start_index:end_index]

    truncated = len(requested_lines) > max_lines

    if truncated:
        requested_lines = requested_lines[:max_lines]

    actual_start_line = (
        start_index + 1
        if requested_lines
        else start_index + 1
    )

    actual_end_line = (
        actual_start_line + len(requested_lines) - 1
        if requested_lines
        else actual_start_line
    )

    content = "\n".join(requested_lines)

    return {
        "success": True,
        "path": str(file_path.resolve()),
        "total_lines": total_lines,
        "start_line": actual_start_line,
        "end_line": actual_end_line,
        "lines_read": len(requested_lines),
        "truncated": truncated,
        "content": content,
    }