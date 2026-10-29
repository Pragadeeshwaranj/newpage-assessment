"""
Tools Server

Central server module that connects and exposes all tool functions located in
the tools directory:
- glob_search: Search for files and directories matching glob patterns.
- google_web_search: Search the web using Google's Custom Search API.
- grep_search: Recursively search text or regex patterns across files.
- list_directory: Inspect files and directories at a specified path.
- read_file: Read file contents with line range filtering and limits.
- read_folder: List directory contents with recursion and ignore options.
- read_process_output: Read stdout and stderr from background processes.

Features:
1. Tool Registry & Dispatcher: Direct Python imports (TOOLS, execute_tool, get_tools_metadata).
2. FastAPI REST API: Dedicated & dynamic endpoints, OpenAPI documentation (/docs), CORS enabled.
3. Model Context Protocol (MCP) Server: Registered tools for LLM agent frameworks.
4. CLI Interface: Run as an HTTP server or MCP stdio server with flexible flags.
"""

from __future__ import annotations

import argparse
import inspect
import logging
import os
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

# ---------------------------------------------------------------------------
# Path resolution: Ensure tools directory and submodules are importable
# ---------------------------------------------------------------------------
TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

for subdir in TOOLS_DIR.iterdir():
    if subdir.is_dir() and not subdir.name.startswith((".", "__")):
        subdir_str = str(subdir)
        if subdir_str not in sys.path:
            sys.path.insert(0, subdir_str)

# ---------------------------------------------------------------------------
# Tool function imports
# ---------------------------------------------------------------------------
try:
    from glob_search.glob_search import glob_search
except ImportError:
    from glob_search import glob_search

try:
    from google_web_search.google_web_search import google_web_search
except ImportError:
    from google_web_search import google_web_search

try:
    from grep_search.grep_search import grep_search
except ImportError:
    from grep_search import grep_search

try:
    from list_directory.list_directory import list_directory
except ImportError:
    from list_directory import list_directory

try:
    from read_file.read_file import read_file
except ImportError:
    from read_file import read_file

try:
    from read_folder.read_folder import read_folder
except ImportError:
    from read_folder import read_folder

try:
    from read_process_output.read_process_output import read_process_output
except ImportError:
    from read_process_output import read_process_output

logger = logging.getLogger("tools.server")

# ---------------------------------------------------------------------------
# Tool Registry
# ---------------------------------------------------------------------------
TOOLS: Dict[str, Callable[..., Any]] = {
    "glob_search": glob_search,
    "google_web_search": google_web_search,
    "grep_search": grep_search,
    "list_directory": list_directory,
    "read_file": read_file,
    "read_folder": read_folder,
    "read_process_output": read_process_output,
}

TOOL_METADATA: Dict[str, Dict[str, Any]] = {
    "glob_search": {
        "name": "glob_search",
        "description": "Search for files and directories matching a glob pattern.",
        "parameters": {
            "pattern": {"type": "string", "required": True, "description": "Glob pattern (e.g. '**/*.py')"},
            "root_dir": {"type": "string", "required": False, "default": ".", "description": "Directory from which the search starts."},
            "max_results": {"type": "integer", "required": False, "default": 1000, "description": "Maximum number of results to return."},
        },
    },
    "google_web_search": {
        "name": "google_web_search",
        "description": "Search the web using Google's Custom Search JSON API.",
        "parameters": {
            "query": {"type": "string", "required": True, "description": "Search query."},
            "max_results": {"type": "integer", "required": False, "default": 5, "description": "Maximum number of results (1-10)."},
            "api_key": {"type": "string", "required": False, "default": None, "description": "Google API key."},
            "search_engine_id": {"type": "string", "required": False, "default": None, "description": "Programmable Search Engine ID (cx)."},
        },
    },
    "grep_search": {
        "name": "grep_search",
        "description": "Search for a text pattern or regex recursively in files.",
        "parameters": {
            "query": {"type": "string", "required": True, "description": "Text or regex pattern to search for."},
            "path": {"type": "string", "required": False, "default": ".", "description": "Directory or file to search."},
            "include": {"type": "string", "required": False, "default": None, "description": "Optional glob pattern, e.g. '*.py'."},
            "case_sensitive": {"type": "boolean", "required": False, "default": False, "description": "Case sensitivity flag."},
            "max_results": {"type": "integer", "required": False, "default": 100, "description": "Maximum number of matches to return."},
        },
    },
    "list_directory": {
        "name": "list_directory",
        "description": "List files and directories at the given path.",
        "parameters": {
            "path": {"type": "string", "required": False, "default": ".", "description": "Directory path to inspect."},
        },
    },
    "read_file": {
        "name": "read_file",
        "description": "Read the contents of a text file with line boundaries.",
        "parameters": {
            "path": {"type": "string", "required": True, "description": "File to read."},
            "start_line": {"type": "integer", "required": False, "default": None, "description": "Starting line number (1-based)."},
            "end_line": {"type": "integer", "required": False, "default": None, "description": "Ending line number (inclusive)."},
            "max_lines": {"type": "integer", "required": False, "default": 500, "description": "Maximum number of lines to return."},
        },
    },
    "read_folder": {
        "name": "read_folder",
        "description": "List files and folders in a directory with recursive options.",
        "parameters": {
            "path": {"type": "string", "required": False, "default": ".", "description": "Directory to read."},
            "recursive": {"type": "boolean", "required": False, "default": False, "description": "Recursively list subdirectories."},
            "include_hidden": {"type": "boolean", "required": False, "default": False, "description": "Include hidden files/folders."},
            "max_results": {"type": "integer", "required": False, "default": 500, "description": "Maximum number of entries to return."},
            "ignore_dirs": {"type": "array", "required": False, "default": None, "description": "Directory names to ignore."},
        },
    },
    "read_process_output": {
        "name": "read_process_output",
        "description": "Read output collected from a background process.",
        "parameters": {
            "process": {"type": "object", "required": True, "description": "Process dictionary containing 'pid', 'output', 'stderr'."},
            "include_stderr": {"type": "boolean", "required": False, "default": True, "description": "Whether stderr should be included."},
            "clear": {"type": "boolean", "required": False, "default": False, "description": "Whether to clear output after reading."},
        },
    },
}


def get_tools_metadata() -> Dict[str, Dict[str, Any]]:
    """Return dictionary of all registered tool metadata specifications."""
    return TOOL_METADATA


def execute_tool(
    name: str,
    arguments: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Any:
    """
    Execute a registered tool function by name.

    Args:
        name: Name of the tool to execute.
        arguments: Optional dictionary of keyword arguments.
        **kwargs: Extra keyword arguments merged with arguments.

    Returns:
        The output produced by the tool.

    Raises:
        KeyError: If the tool name is not registered.
        Exception: Any exception raised during tool execution.
    """
    if name not in TOOLS:
        valid = ", ".join(sorted(TOOLS.keys()))
        raise KeyError(f"Unknown tool '{name}'. Registered tools: {valid}")

    args = dict(arguments or {})
    args.update(kwargs)

    tool_func = TOOLS[name]
    return tool_func(**args)


# ---------------------------------------------------------------------------
# MCP (Model Context Protocol) Server Setup
# ---------------------------------------------------------------------------
mcp_server: Optional[Any] = None

try:
    from mcp.server.mcpserver import MCPServer
    mcp_server = MCPServer("tools-server")
except ImportError:
    try:
        from mcp.server.fastmcp import FastMCP  # type: ignore[assignment]
        mcp_server = FastMCP("tools-server")
    except ImportError:
        mcp_server = None

if mcp_server is not None:
    for _name, _func in TOOLS.items():
        _doc = inspect.getdoc(_func) or f"Execute {_name}"
        mcp_server.tool(name=_name, description=_doc)(_func)

mcp = mcp_server


# ---------------------------------------------------------------------------
# FastAPI Application Setup
# ---------------------------------------------------------------------------
try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field

    app = FastAPI(
        title="Agent Tools Server",
        description="Unified API server connecting tools for code inspection, search, and process management.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -----------------------------------------------------------------------
    # Pydantic Request Models
    # -----------------------------------------------------------------------
    class GlobSearchRequest(BaseModel):
        pattern: str = Field(..., description="Glob pattern such as '**/*.py' or 'src/**/*.ts'.")
        root_dir: str = Field(".", description="Directory from which the search starts.")
        max_results: int = Field(1000, description="Maximum number of results to return.")

    class GoogleWebSearchRequest(BaseModel):
        query: str = Field(..., description="Search query.")
        max_results: int = Field(5, description="Maximum number of results to return (1-10).")
        api_key: Optional[str] = Field(None, description="Google API key.")
        search_engine_id: Optional[str] = Field(None, description="Programmable Search Engine ID (cx).")

    class GrepSearchRequest(BaseModel):
        query: str = Field(..., description="Text or regex pattern to search for.")
        path: str = Field(".", description="Directory or file to search.")
        include: Optional[str] = Field(None, description="Optional glob pattern, e.g. '*.py'.")
        case_sensitive: bool = Field(False, description="Whether the search is case-sensitive.")
        max_results: int = Field(100, description="Maximum number of matches to return.")

    class ListDirectoryRequest(BaseModel):
        path: str = Field(".", description="Directory path to inspect.")

    class ReadFileRequest(BaseModel):
        path: str = Field(..., description="File to read.")
        start_line: Optional[int] = Field(None, description="Starting line number (1-based).")
        end_line: Optional[int] = Field(None, description="Ending line number (inclusive).")
        max_lines: int = Field(500, description="Maximum number of lines to return.")

    class ReadFolderRequest(BaseModel):
        path: str = Field(".", description="Directory to read.")
        recursive: bool = Field(False, description="Recursively list subdirectories.")
        include_hidden: bool = Field(False, description="Include hidden files/folders.")
        max_results: int = Field(500, description="Maximum number of entries to return.")
        ignore_dirs: Optional[List[str]] = Field(None, description="Directory names to ignore.")

    class ReadProcessOutputRequest(BaseModel):
        process: Dict[str, Any] = Field(..., description="Process dict containing 'pid', 'output', 'stderr'.")
        include_stderr: bool = Field(True, description="Whether stderr should be included.")
        clear: bool = Field(False, description="Whether to clear the returned output after reading.")

    class GenericExecutionRequest(BaseModel):
        name: Optional[str] = Field(None, description="Name of the tool to execute.")
        tool: Optional[str] = Field(None, description="Alternative field for tool name.")
        arguments: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arguments for the tool.")
        parameters: Optional[Dict[str, Any]] = Field(None, description="Alternative field for arguments.")

    # -----------------------------------------------------------------------
    # FastAPI Routes
    # -----------------------------------------------------------------------
    @app.get("/")
    def root() -> Dict[str, Any]:
        """Server status and summary of available tools."""
        return {
            "name": "Agent Tools Server",
            "status": "online",
            "version": "1.0.0",
            "tools_count": len(TOOLS),
            "tools": list(TOOLS.keys()),
            "documentation": "/docs",
        }

    @app.get("/health")
    def health_check() -> Dict[str, Any]:
        """Health check endpoint."""
        return {
            "status": "ok",
            "tools_registered": len(TOOLS),
            "mcp_enabled": mcp_server is not None,
        }

    @app.get("/tools")
    def list_tools() -> Dict[str, Any]:
        """Return list of all registered tools and their specifications."""
        return {
            "tools": TOOL_METADATA,
            "count": len(TOOL_METADATA),
        }

    @app.get("/tools/{tool_name}")
    def get_tool_spec(tool_name: str) -> Dict[str, Any]:
        """Return specification for a single tool."""
        if tool_name not in TOOL_METADATA:
            raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found.")
        return TOOL_METADATA[tool_name]

    @app.post("/execute")
    @app.post("/call")
    def execute_generic(req: GenericExecutionRequest) -> Any:
        """Generic endpoint to execute any tool by name with arguments."""
        target_name = req.name or req.tool
        if not target_name:
            raise HTTPException(status_code=400, detail="Missing tool name in 'name' or 'tool' field.")

        args: Dict[str, Any] = {}
        if req.arguments:
            args.update(req.arguments)
        if req.parameters:
            args.update(req.parameters)

        try:
            result = execute_tool(target_name, args)
            if isinstance(result, dict) and "success" in result:
                return result
            return {"success": True, "tool": target_name, "result": result}
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except (FileNotFoundError, NotADirectoryError, ValueError) as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @app.post("/tools/{tool_name}")
    def execute_named_tool(tool_name: str, payload: Dict[str, Any] = None) -> Any:
        """Execute a specific tool via URL path with arbitrary JSON arguments."""
        args = payload or {}
        try:
            result = execute_tool(tool_name, args)
            if isinstance(result, dict) and "success" in result:
                return result
            return {"success": True, "tool": tool_name, "result": result}
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except (FileNotFoundError, NotADirectoryError, ValueError) as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    # Dedicated Tool POST Endpoints
    @app.post("/glob_search")
    def endpoint_glob_search(req: GlobSearchRequest) -> Any:
        """Endpoint for glob_search."""
        try:
            matches = glob_search(
                pattern=req.pattern,
                root_dir=req.root_dir,
                max_results=req.max_results,
            )
            return {"success": True, "matches": matches, "count": len(matches)}
        except (FileNotFoundError, NotADirectoryError) as exc:
            return {"success": False, "error": str(exc), "matches": []}

    @app.get("/glob_search")
    def get_endpoint_glob_search(
        pattern: str,
        root_dir: str = ".",
        max_results: int = 1000,
    ) -> Any:
        """Query-friendly GET endpoint for glob_search."""
        try:
            matches = glob_search(pattern=pattern, root_dir=root_dir, max_results=max_results)
            return {"success": True, "matches": matches, "count": len(matches)}
        except (FileNotFoundError, NotADirectoryError) as exc:
            return {"success": False, "error": str(exc), "matches": []}

    @app.post("/google_web_search")
    def endpoint_google_web_search(req: GoogleWebSearchRequest) -> Any:
        """Endpoint for google_web_search."""
        return google_web_search(
            query=req.query,
            max_results=req.max_results,
            api_key=req.api_key,
            search_engine_id=req.search_engine_id,
        )

    @app.post("/grep_search")
    def endpoint_grep_search(req: GrepSearchRequest) -> Any:
        """Endpoint for grep_search."""
        return grep_search(
            query=req.query,
            path=req.path,
            include=req.include,
            case_sensitive=req.case_sensitive,
            max_results=req.max_results,
        )

    @app.get("/grep_search")
    def get_endpoint_grep_search(
        query: str,
        path: str = ".",
        include: Optional[str] = None,
        case_sensitive: bool = False,
        max_results: int = 100,
    ) -> Any:
        """Query-friendly GET endpoint for grep_search."""
        return grep_search(
            query=query,
            path=path,
            include=include,
            case_sensitive=case_sensitive,
            max_results=max_results,
        )

    @app.post("/list_directory")
    def endpoint_list_directory(req: ListDirectoryRequest) -> Any:
        """Endpoint for list_directory."""
        return list_directory(path=req.path)

    @app.get("/list_directory")
    def get_endpoint_list_directory(path: str = ".") -> Any:
        """Query-friendly GET endpoint for list_directory."""
        return list_directory(path=path)

    @app.post("/read_file")
    def endpoint_read_file(req: ReadFileRequest) -> Any:
        """Endpoint for read_file."""
        return read_file(
            path=req.path,
            start_line=req.start_line,
            end_line=req.end_line,
            max_lines=req.max_lines,
        )

    @app.get("/read_file")
    def get_endpoint_read_file(
        path: str,
        start_line: Optional[int] = None,
        end_line: Optional[int] = None,
        max_lines: int = 500,
    ) -> Any:
        """Query-friendly GET endpoint for read_file."""
        return read_file(
            path=path,
            start_line=start_line,
            end_line=end_line,
            max_lines=max_lines,
        )

    @app.post("/read_folder")
    def endpoint_read_folder(req: ReadFolderRequest) -> Any:
        """Endpoint for read_folder."""
        return read_folder(
            path=req.path,
            recursive=req.recursive,
            include_hidden=req.include_hidden,
            max_results=req.max_results,
            ignore_dirs=req.ignore_dirs,
        )

    @app.get("/read_folder")
    def get_endpoint_read_folder(
        path: str = ".",
        recursive: bool = False,
        include_hidden: bool = False,
        max_results: int = 500,
    ) -> Any:
        """Query-friendly GET endpoint for read_folder."""
        return read_folder(
            path=path,
            recursive=recursive,
            include_hidden=include_hidden,
            max_results=max_results,
        )

    @app.post("/read_process_output")
    def endpoint_read_process_output(req: ReadProcessOutputRequest) -> Any:
        """Endpoint for read_process_output."""
        return read_process_output(
            process=req.process,
            include_stderr=req.include_stderr,
            clear=req.clear,
        )

except ImportError:
    app = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# CLI Entrypoint
# ---------------------------------------------------------------------------
def main() -> None:
    """CLI runner supporting HTTP mode, MCP mode, and tool execution."""
    parser = argparse.ArgumentParser(description="Agent Tools Server")
    parser.add_argument("--host", default=os.getenv("HOST", "0.0.0.0"), help="HTTP host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")), help="HTTP port (default: 8000)")
    parser.add_argument("--mode", choices=["http", "mcp"], default=os.getenv("SERVER_MODE", "http"), help="Server mode (http or mcp)")
    parser.add_argument("--mcp", action="store_true", help="Run as MCP stdio server")
    parser.add_argument("--list", action="store_true", help="List all available tools and exit")
    parser.add_argument("--call", help="Tool name to execute from CLI")
    parser.add_argument("--args", default="{}", help="JSON string of arguments for --call")

    args = parser.parse_args()

    if args.list:
        print("Registered Tools:")
        for name, meta in TOOL_METADATA.items():
            print(f"  - {name}: {meta['description']}")
        return

    if args.call:
        import json
        call_args = json.loads(args.args)
        result = execute_tool(args.call, call_args)
        print(json.dumps(result, indent=2))
        return

    if args.mcp or args.mode == "mcp":
        if mcp_server is None:
            sys.stderr.write("MCP server library not available. Please install 'mcp'.\n")
            sys.exit(1)
        print("Starting MCP Tools Server (stdio)...", file=sys.stderr)
        mcp_server.run()
    else:
        if app is None:
            sys.stderr.write("FastAPI/uvicorn not available. Please install 'fastapi' and 'uvicorn'.\n")
            sys.exit(1)
        import uvicorn
        print(f"Starting HTTP Tools Server on http://{args.host}:{args.port}")
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
