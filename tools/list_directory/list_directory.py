from pathlib import Path


def list_directory(path: str = ".") -> dict:
    """
    List files and directories at the given path.

    Args:
        path: Directory path to inspect. Defaults to current directory.

    Returns:
        Dictionary containing the directory path and its entries.
    """
    try:
        directory = Path(path).expanduser().resolve()

        if not directory.exists():
            return {
                "success": False,
                "error": f"Path does not exist: {path}"
            }

        if not directory.is_dir():
            return {
                "success": False,
                "error": f"Path is not a directory: {path}"
            }

        entries = []

        for item in sorted(directory.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            entries.append({
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
            })

        return {
            "success": True,
            "path": str(directory),
            "entries": entries
        }

    except PermissionError:
        return {
            "success": False,
            "error": f"Permission denied: {path}"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }