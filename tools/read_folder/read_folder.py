from pathlib import Path
from typing import Optional


DEFAULT_IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
}


def read_folder(
    path: str = ".",
    recursive: bool = False,
    include_hidden: bool = False,
    max_results: int = 500,
    ignore_dirs: Optional[list[str]] = None,
) -> dict:
    """
    List files and folders in a directory.

    Args:
        path: Directory to read.
        recursive: Recursively list subdirectories.
        include_hidden: Include hidden files/folders.
        max_results: Maximum number of entries to return.
        ignore_dirs: Directory names to ignore.

    Returns:
        Structured dictionary containing folder entries.
    """

    root = Path(path)

    if not root.exists():
        return {
            "success": False,
            "error": f"Path does not exist: {path}",
            "entries": [],
        }

    if not root.is_dir():
        return {
            "success": False,
            "error": f"Path is not a directory: {path}",
            "entries": [],
        }

    ignored = DEFAULT_IGNORED_DIRS | set(ignore_dirs or [])

    entries = []

    def should_ignore(file_path: Path) -> bool:
        return any(part in ignored for part in file_path.parts)

    def add_entry(file_path: Path):
        if len(entries) >= max_results:
            return

        if should_ignore(file_path):
            return

        if not include_hidden and file_path.name.startswith("."):
            return

        try:
            is_directory = file_path.is_dir()
            is_file = file_path.is_file()

            if not is_directory and not is_file:
                return

            entries.append(
                {
                    "name": file_path.name,
                    "path": str(file_path),
                    "type": "directory" if is_directory else "file",
                }
            )

        except OSError:
            # Ignore inaccessible files
            return

    try:
        if recursive:
            for item in root.rglob("*"):
                if len(entries) >= max_results:
                    break

                add_entry(item)
        else:
            for item in root.iterdir():
                if len(entries) >= max_results:
                    break

                add_entry(item)

    except PermissionError:
        return {
            "success": False,
            "error": f"Permission denied: {path}",
            "entries": entries,
        }

    # Sort directories first, then files
    entries.sort(
        key=lambda item: (
            item["type"] != "directory",
            item["name"].lower(),
        )
    )

    return {
        "success": True,
        "path": str(root),
        "recursive": recursive,
        "total_entries": len(entries),
        "truncated": len(entries) >= max_results,
        "entries": entries,
    }