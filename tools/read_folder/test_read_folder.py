from pathlib import Path

import pytest

from read_folder import read_folder


@pytest.fixture
def test_project(tmp_path):
    """
    Creates:

    project/
    ├── src/
    │   ├── app.py
    │   └── utils.py
    ├── tests/
    │   └── test_app.py
    ├── node_modules/
    │   └── package.js
    ├── dist/
    │   └── bundle.js
    ├── .git/
    │   └── config
    ├── .env
    └── README.md
    """

    src = tmp_path / "src"
    tests = tmp_path / "tests"
    node_modules = tmp_path / "node_modules"
    dist = tmp_path / "dist"
    git = tmp_path / ".git"

    src.mkdir()
    tests.mkdir()
    node_modules.mkdir()
    dist.mkdir()
    git.mkdir()

    (src / "app.py").write_text(
        "print('hello')",
        encoding="utf-8",
    )

    (src / "utils.py").write_text(
        "def helper(): pass",
        encoding="utf-8",
    )

    (tests / "test_app.py").write_text(
        "def test_app(): pass",
        encoding="utf-8",
    )

    (node_modules / "package.js").write_text(
        "module.exports = {}",
        encoding="utf-8",
    )

    (dist / "bundle.js").write_text(
        "console.log('bundle')",
        encoding="utf-8",
    )

    (git / "config").write_text(
        "[core]",
        encoding="utf-8",
    )

    (tmp_path / ".env").write_text(
        "SECRET=value",
        encoding="utf-8",
    )

    (tmp_path / "README.md").write_text(
        "# Test Project",
        encoding="utf-8",
    )

    return tmp_path


def test_read_folder(test_project):
    result = read_folder(str(test_project))

    assert result["success"] is True
    assert result["path"] == str(test_project)
    assert result["total_entries"] > 0


def test_read_folder_returns_files_and_directories(test_project):
    result = read_folder(str(test_project))

    names = {
        entry["name"]
        for entry in result["entries"]
    }

    assert "src" in names
    assert "tests" in names
    assert "README.md" in names


def test_directory_type(test_project):
    result = read_folder(str(test_project))

    src_entry = next(
        entry
        for entry in result["entries"]
        if entry["name"] == "src"
    )

    assert src_entry["type"] == "directory"


def test_file_type(test_project):
    result = read_folder(str(test_project))

    readme_entry = next(
        entry
        for entry in result["entries"]
        if entry["name"] == "README.md"
    )

    assert readme_entry["type"] == "file"


def test_hidden_files_are_ignored(test_project):
    result = read_folder(str(test_project))

    names = {
        entry["name"]
        for entry in result["entries"]
    }

    assert ".env" not in names
    assert ".git" not in names


def test_hidden_files_can_be_included(test_project):
    result = read_folder(
        str(test_project),
        include_hidden=True,
    )

    names = {
        entry["name"]
        for entry in result["entries"]
    }

    assert ".env" in names


def test_recursive_search(test_project):
    result = read_folder(
        str(test_project),
        recursive=True,
    )

    paths = [
        Path(entry["path"])
        for entry in result["entries"]
    ]

    assert any(
        path.name == "app.py"
        for path in paths
    )

    assert any(
        path.name == "test_app.py"
        for path in paths
    )


def test_ignored_directories(test_project):
    result = read_folder(
        str(test_project),
        recursive=True,
    )

    for entry in result["entries"]:
        path = Path(entry["path"])

        assert "node_modules" not in path.parts
        assert "dist" not in path.parts
        assert ".git" not in path.parts


def test_max_results(test_project):
    result = read_folder(
        str(test_project),
        recursive=True,
        max_results=2,
    )

    assert result["success"] is True
    assert result["total_entries"] == 2
    assert result["truncated"] is True


def test_non_existing_directory():
    result = read_folder(
        "./does-not-exist",
    )

    assert result["success"] is False
    assert "does not exist" in result["error"]


def test_file_instead_of_directory(test_project):
    file_path = test_project / "README.md"

    result = read_folder(str(file_path))

    assert result["success"] is False
    assert "not a directory" in result["error"]


def test_custom_ignore_directory(test_project):
    result = read_folder(
        str(test_project),
        recursive=True,
        ignore_dirs=["src"],
    )

    for entry in result["entries"]:
        assert "src" not in Path(entry["path"]).parts