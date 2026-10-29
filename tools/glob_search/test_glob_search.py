from pathlib import Path

import pytest

from glob_search import glob_search


@pytest.fixture
def test_project(tmp_path: Path):
    """
    Create a temporary project structure for testing.
    """

    files = [
        "src/main.py",
        "src/utils.py",
        "src/components/button.py",
        "src/components/input.py",
        "tests/test_main.py",
        "README.md",
        "package.json",
    ]

    for file in files:
        file_path = tmp_path / file
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text("test")

    return tmp_path


def test_find_python_files(test_project):
    result = glob_search("**/*.py", str(test_project))

    assert result == [
        "src/components/button.py",
        "src/components/input.py",
        "src/main.py",
        "src/utils.py",
        "tests/test_main.py",
    ]


def test_find_files_in_specific_directory(test_project):
    result = glob_search("src/*.py", str(test_project))

    assert result == [
        "src/main.py",
        "src/utils.py",
    ]


def test_find_markdown_files(test_project):
    result = glob_search("**/*.md", str(test_project))

    assert result == [
        "README.md",
    ]


def test_no_matches(test_project):
    result = glob_search("**/*.java", str(test_project))

    assert result == []


def test_directory_pattern(test_project):
    result = glob_search("src/*", str(test_project))

    assert result == [
        "src/components",
        "src/main.py",
        "src/utils.py",
    ]


def test_non_existing_directory():
    with pytest.raises(FileNotFoundError):
        glob_search("**/*.py", "/does/not/exist")


def test_root_is_file(test_project):
    file_path = test_project / "README.md"

    with pytest.raises(NotADirectoryError):
        glob_search("**/*.py", str(file_path))


def test_max_results(test_project):
    result = glob_search(
        "**/*.py",
        str(test_project),
        max_results=2,
    )

    assert len(result) == 2