from pathlib import Path
from unittest.mock import Mock, patch
import pytest
from fastapi.testclient import TestClient

import server
from server import (
    TOOLS,
    TOOL_METADATA,
    app,
    execute_tool,
    get_tools_metadata,
    mcp_server,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_project(tmp_path: Path):
    """Create a temporary project structure for testing."""
    (tmp_path / "hello.txt").write_text("Hello World\nLine 2\nLine 3\n")
    sub = tmp_path / "subdir"
    sub.mkdir()
    (sub / "nested.py").write_text("def test(): pass\n")
    return tmp_path


# ---------------------------------------------------------------------------
# Registry & Direct Execution Tests
# ---------------------------------------------------------------------------
def test_all_tools_registered():
    expected_tools = {
        "glob_search",
        "google_web_search",
        "grep_search",
        "list_directory",
        "read_file",
        "read_folder",
        "read_process_output",
    }
    assert set(TOOLS.keys()) == expected_tools
    assert len(TOOLS) == 7


def test_tool_metadata():
    metadata = get_tools_metadata()
    assert len(metadata) == 7
    for name in TOOLS:
        assert name in metadata
        assert "description" in metadata[name]
        assert "parameters" in metadata[name]


def test_execute_tool_success(test_project):
    result = execute_tool("list_directory", {"path": str(test_project)})
    assert result["success"] is True
    assert len(result["entries"]) >= 2


def test_execute_tool_kwargs(test_project):
    result = execute_tool("read_file", path=str(test_project / "hello.txt"))
    assert result["success"] is True
    assert "Hello World" in result["content"]


def test_execute_tool_unknown():
    with pytest.raises(KeyError) as exc_info:
        execute_tool("non_existent_tool")
    assert "non_existent_tool" in str(exc_info.value)


# ---------------------------------------------------------------------------
# FastAPI Route Tests
# ---------------------------------------------------------------------------
def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["tools_count"] == 7
    assert "glob_search" in data["tools"]


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["tools_registered"] == 7


def test_list_tools_endpoint(client):
    response = client.get("/tools")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 7
    assert "glob_search" in data["tools"]


def test_get_tool_spec_endpoint(client):
    response = client.get("/tools/read_file")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "read_file"

    # Non-existent tool
    response_404 = client.get("/tools/unknown_tool")
    assert response_404.status_code == 404


def test_generic_execute_endpoint(client, test_project):
    # Success via 'name'
    payload = {
        "name": "list_directory",
        "arguments": {"path": str(test_project)},
    }
    response = client.post("/execute", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Success via 'tool' and 'parameters'
    payload2 = {
        "tool": "read_file",
        "parameters": {"path": str(test_project / "hello.txt")},
    }
    response2 = client.post("/call", json=payload2)
    assert response2.status_code == 200
    assert response2.json()["success"] is True

    # Missing name/tool
    response_missing = client.post("/execute", json={"arguments": {}})
    assert response_missing.status_code == 400

    # Unknown tool
    response_unknown = client.post("/execute", json={"name": "invalid_tool"})
    assert response_unknown.status_code == 404


def test_execute_named_tool_endpoint(client, test_project):
    response = client.post(
        "/tools/read_file",
        json={"path": str(test_project / "hello.txt")},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    response_unknown = client.post("/tools/fake_tool", json={})
    assert response_unknown.status_code == 404


def test_dedicated_glob_search_endpoint(client, test_project):
    response = client.post(
        "/glob_search",
        json={"pattern": "**/*.py", "root_dir": str(test_project)},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "subdir/nested.py" in data["matches"]

    # GET endpoint
    response_get = client.get(f"/glob_search?pattern=**/*.py&root_dir={test_project}")
    assert response_get.status_code == 200
    assert response_get.json()["success"] is True


def test_dedicated_grep_search_endpoint(client, test_project):
    response = client.post(
        "/grep_search",
        json={"query": "Hello", "path": str(test_project)},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_matches"] >= 1

    # GET endpoint
    response_get = client.get(f"/grep_search?query=Hello&path={test_project}")
    assert response_get.status_code == 200
    assert response_get.json()["success"] is True


def test_dedicated_list_directory_endpoint(client, test_project):
    response = client.post(
        "/list_directory",
        json={"path": str(test_project)},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # GET endpoint
    response_get = client.get(f"/list_directory?path={test_project}")
    assert response_get.status_code == 200
    assert response_get.json()["success"] is True


def test_dedicated_read_file_endpoint(client, test_project):
    file_path = str(test_project / "hello.txt")
    response = client.post(
        "/read_file",
        json={"path": file_path, "start_line": 1, "end_line": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["lines_read"] == 2

    # GET endpoint
    response_get = client.get(f"/read_file?path={file_path}&start_line=1&end_line=2")
    assert response_get.status_code == 200
    assert response_get.json()["lines_read"] == 2


def test_dedicated_read_folder_endpoint(client, test_project):
    response = client.post(
        "/read_folder",
        json={"path": str(test_project), "recursive": True},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # GET endpoint
    response_get = client.get(f"/read_folder?path={test_project}&recursive=true")
    assert response_get.status_code == 200
    assert response_get.json()["success"] is True


def test_dedicated_read_process_output_endpoint(client):
    proc = {
        "pid": 9999,
        "output": "sample output\n",
        "stderr": "",
        "running": False,
        "exit_code": 0,
    }
    response = client.post(
        "/read_process_output",
        json={"process": proc, "include_stderr": True, "clear": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["pid"] == 9999


def test_dedicated_google_web_search_endpoint(client):
    # Mocking external API call
    mock_resp = {
        "success": True,
        "query": "pytest",
        "total_results": 1,
        "results": [{"title": "pytest docs", "url": "https://pytest.org"}],
    }
    with patch("server.google_web_search", return_value=mock_resp):
        response = client.post(
            "/google_web_search",
            json={"query": "pytest", "max_results": 1},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True


# ---------------------------------------------------------------------------
# MCP Server Registration & Execution Tests
# ---------------------------------------------------------------------------
def test_mcp_server_initialization():
    if mcp_server is not None:
        assert mcp_server.name == "tools-server"


@pytest.mark.anyio
async def test_mcp_server_tools_async(test_project):
    if mcp_server is not None:
        tools = await mcp_server.list_tools()
        tool_names = {t.name for t in tools}
        assert "glob_search" in tool_names
        assert "list_directory" in tool_names
        assert "read_file" in tool_names
        assert len(tools) == 7

        result = await mcp_server.call_tool("list_directory", {"path": str(test_project)})
        assert not result.is_error


def test_glob_search_endpoint_not_found(client):
    response = client.post(
        "/glob_search",
        json={"pattern": "*.py", "root_dir": "/non_existent_folder_abc_123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "error" in data
