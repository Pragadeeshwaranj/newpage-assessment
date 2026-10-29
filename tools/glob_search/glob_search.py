from pathlib import Path
from typing import List


def glob_search(
    pattern: str,
    root_dir: str = ".",
    max_results: int = 1000,
) -> List[str]:
    """
    Search for files and directories matching a glob pattern.

    Args:
        pattern: Glob pattern such as "**/*.py" or "src/**/*.ts".
        root_dir: Directory from which the search starts.
        max_results: Maximum number of results to return.

    Returns:
        List of matching paths using "/" as the separator.
    """

    root = Path(root_dir).resolve()

    if not root.exists():
        raise FileNotFoundError(
            f"Directory does not exist: {root}"
        )

    if not root.is_dir():
        raise NotADirectoryError(
            f"Not a directory: {root}"
        )

    matches = []

    for path in root.glob(pattern):
        if len(matches) >= max_results:
            break

        relative_path = path.relative_to(root).as_posix()
        matches.append(relative_path)

    return sorted(matches)