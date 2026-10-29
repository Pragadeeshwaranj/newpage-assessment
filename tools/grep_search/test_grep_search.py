import pytest
from pathlib import Path
from grep_search import grep_search


@pytest.fixture
def test_project(tmp_path):
    """
    Creates a temporary project structure:

    project/
      src/
        app.py
        utils.py
        config.js
      tests/
        test_app.py
      node_modules/
        package.js
    """

    src = tmp_path / "src"
    tests = tmp_path / "tests"
    node_modules = tmp_path / "node_modules"

    src.mkdir()
    tests.mkdir()
    node_modules.mkdir()

    (src / "app.py").write_text(
        """
def hello():
    print("Hello World")

def generate_content():
    return "content"
""",
        encoding="utf-8",
    )

    (src / "utils.py").write_text(
        """
def helper():
    return "generate_content"
""",
        encoding="utf-8",
    )

    (src / "config.js").write_text(
        """
const config = {
    generateContent: true
};
""",
        encoding="utf-8",
    )

    (tests / "test_app.py").write_text(
        """
def test_generate():
    assert True
""",
        encoding="utf-8",
    )

    (node_modules / "package.js").write_text(
        """
generate_content()
""",
        encoding="utf-8",
    )

    return tmp_path


def test_search_text(test_project):
    result = grep_search(
        "generate_content",
        str(test_project),
    )

    assert result["success"] is True
    assert result["total_matches"] == 2


def test_search_with_file_filter(test_project):
    result = grep_search(
        "generate_content",
        str(test_project),
        include="*.py",
    )

    assert result["success"] is True
    assert result["total_matches"] == 2

    for match in result["results"]:
        assert match["file"].endswith(".py")


def test_case_insensitive_search(test_project):
    result = grep_search(
        "GENERATE_CONTENT",
        str(test_project),
        case_sensitive=False,
    )

    assert result["success"] is True
    assert result["total_matches"] == 2


def test_case_sensitive_search(test_project):
    result = grep_search(
        "GENERATE_CONTENT",
        str(test_project),
        case_sensitive=True,
    )

    assert result["success"] is True
    assert result["total_matches"] == 0


def test_regex_search(test_project):
    result = grep_search(
        r"generate_\w+",
        str(test_project),
    )

    assert result["success"] is True
    assert result["total_matches"] == 2


def test_non_existing_path():
    result = grep_search(
        "hello",
        "./does-not-exist",
    )

    assert result["success"] is False
    assert "does not exist" in result["error"]


def test_max_results(test_project):
    result = grep_search(
        "def",
        str(test_project),
        max_results=1,
    )

    assert result["success"] is True
    assert result["total_matches"] == 1
    assert result["truncated"] is True


def test_result_contains_line_number(test_project):
    result = grep_search(
        "generate_content",
        str(test_project),
    )

    assert result["total_matches"] > 0

    match = result["results"][0]

    assert "file" in match
    assert "line" in match
    assert "content" in match
    assert isinstance(match["line"], int)


def test_node_modules_is_ignored(test_project):
    result = grep_search(
        "generate_content",
        str(test_project),
    )

    for match in result["results"]:
        file_path = Path(match["file"])
        assert "node_modules" not in file_path.parts
