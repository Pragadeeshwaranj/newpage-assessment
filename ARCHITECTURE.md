# System Architecture Specification

## Codebase Q&A System with Model Context Protocol (MCP) & Google Vertex AI

This document provides a comprehensive technical specification of the Codebase Q&A System, detailing its architectural design, component interactions, protocol integrations, and data flows.

---

## 1. Architectural Overview

The **Codebase Q&A System** is designed to inspect, interrogate, and reason over arbitrary software repositories (either local file trees or cloned GitHub repositories). Unlike traditional RAG (Retrieval-Augmented Generation) systems that rely on static embeddings and vector search, this system operates as an **agentic software architect**:

1. **Active Exploration**: The LLM queries the filesystem dynamically through specialized Model Context Protocol (MCP) tools (`list_directory`, `glob_search`, `grep_search`, `read_file`, and `read_folder`).
2. **Deterministic Verification**: Exact file paths, regex patterns, and line bounds are investigated before conclusions are drawn, eliminating structural hallucinations.
3. **End-to-End Type Safety**: Built from the ground up with strict TypeScript across both frontend and backend.
4. **Enterprise Cloud Security**: Powered by Google GenAI SDK (`@google/genai`) connecting directly to **Google Cloud Vertex AI** with Application Default Credentials (ADC) and strictly environment-driven project configurations (zero hardcoding).

---

## 2. High-Level System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                          │
│  React 18 + Vite + Tailwind CSS (TypeScript)                           │
│  - Interactive File Explorer       - Live MCP Tool Trace Accordion     │
│  - Markdown & Syntax Highlighter   - Ingestion (Local / GitHub)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / SSE Stream
┌───────────────────────────────────▼────────────────────────────────────┐
│                       BACKEND SERVICE (Node.js)                        │
│  Express API + TypeScript Runtime (tsx)                                │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Ingestion Service      │  │ Gemini Vertex AI Service             │  │
│  │ - simple-git clone     │  │ - @google/genai SDK (Vertex AI mode) │  │
│  │ - Workspace management │  │ - Multi-turn reasoning loop          │  │
│  └───────────┬────────────┘  │ - Server-Sent Events (SSE) streaming │  │
│              │               └──────────────────┬───────────────────┘  │
│              │                                  │                      │
│  ┌───────────▼──────────────────────────────────▼───────────────────┐  │
│  │ MCP Client Manager (@modelcontextprotocol/sdk)                   │  │
│  │ - StdioClientTransport subprocess orchestration                  │  │
│  │ - Schema conversion (MCP JSON Schema -> GenAI FunctionDecl)      │  │
│  │ - Safe workspace path containment & resolution                   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ JSON-RPC 2.0 over Stdio
┌─────────────────────────────────────▼──────────────────────────────────┐
│                   MCP TOOLS SERVER (Python 3.10+)                      │
│  tools/server.py running via mcp.server.mcpserver.MCPServer            │
│  - list_directory        - read_file          - glob_search            │
│  - grep_search           - read_folder        - google_web_search      │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │ Target Filesystem Access
┌─────────────────────────────────────▼──────────────────────────────────┐
│                         TARGET CODEBASE                                │
│  - Ingested Local Directory (e.g. C:\Projects\...)                      │
│  - Cloned GitHub Repository (storage/repos/<owner>_<repo>_<id>)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Component Breakdown

### 3.1 Frontend Application (`frontend/`)

- **Tech Stack**: React 18, Vite 6, Tailwind CSS 3, Lucide React icons, React Markdown.
- **Key Modules**:
  - `src/App.tsx`: Central state controller managing active workspace, conversation history, live streaming events, and configuration synchronization.
  - `src/components/Navbar.tsx`: Displays system health, active codebase selector, MCP connectivity state, and dynamic Vertex AI project indicator.
  - `src/components/CodebaseSidebar.tsx`: Renders the codebase filesystem tree (fetched through MCP `list_directory`), active MCP tools summary, and quick-navigation links.
  - `src/components/ChatView.tsx`: Conversational message thread rendering formatted Markdown responses, starter recommendation chips, and auto-scroll controls.
  - `src/components/ToolTraceViewer.tsx`: Collapsible execution monitor displaying which MCP tools the model invoked, input parameters, execution duration in milliseconds, and raw tool output previews.
  - `src/components/IngestModal.tsx`: Dual-tab modal facilitating one-click ingestion of local filesystem directories or public GitHub repository URLs.
  - `src/components/SettingsModal.tsx`: Inspects active Vertex AI project and location (sourced from environment variables) and allows switching between Gemini models (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`).
  - `src/components/FileViewerModal.tsx`: Displays line-numbered, syntax-styled source code retrieved on-demand via the MCP `read_file` tool.

### 3.2 Backend API Service (`backend/`)

- **Tech Stack**: Node.js 22, Express 4, TypeScript 5, `tsx` runtime.
- **REST & Streaming Endpoints**:
  - `GET /api/config`: Emits runtime GCP project ID and Vertex AI location loaded from `process.env`.
  - `GET /api/health`: Health status probe reporting MCP connection state, active tool count, and GCP configuration flags.
  - `GET /api/tools`: Enumerates all available MCP tool definitions.
  - `POST /api/ingest`: Accepts `{ type, target }` to register a local directory or shallow-clone a GitHub repository.
  - `GET /api/workspaces`: Lists all currently registered workspaces.
  - `GET /api/workspace/:id/tree`: Navigates directory structures using the MCP `list_directory` tool.
  - `POST /api/workspace/:id/read`: Reads file segments using the MCP `read_file` tool.
  - `POST /api/chat`: Synchronous multi-turn reasoning endpoint.
  - `POST /api/chat/stream`: Server-Sent Events (SSE) streaming endpoint delivering real-time tool start, tool end, reasoning status, and final answer tokens.

### 3.3 Model Context Protocol (MCP) Integration Engine (`backend/src/mcpClient.ts`)

- **Orchestration**:
  Spawns `python tools/server.py --mcp` as a dedicated child process communicating via standard input/output (`stdio`).
- **Transport**:
  Uses `@modelcontextprotocol/sdk/client/stdio.js` (`StdioClientTransport`) with automatic environment propagation (`PYTHONUNBUFFERED=1`).
- **Schema Translation**:
  Translates MCP `inputSchema` structures into Google GenAI-compliant `FunctionDeclarations`:
  ```
  MCP InputSchema (JSON Schema)  ──►  cleanSchema()  ──►  GenAI Parameter Schema (OBJECT, STRING, INTEGER)
  ```
- **Workspace Path Containment**:
  Automatically intercepts file arguments (`path`, `root_dir`) passed by the model and safely resolves relative paths against the active workspace root directory, ensuring the MCP tools always execute within the targeted codebase.

### 3.4 Google GenAI & Autonomous Reasoning Service (`backend/src/services/geminiService.ts`)

- **Dual Authentication Strategy**:
  1. **Option 1 (Primary)**: If `GEMINI_API_KEY` (or request `apiKey`) is provided:
     ```typescript
     const ai = new GoogleGenAI({ apiKey: geminiApiKey });
     ```
  2. **Option 2 (Secondary Fallback)**: If no API key is set, falls back to enterprise Google Cloud Vertex AI using Application Default Credentials (ADC):
     ```typescript
     const ai = new GoogleGenAI({
       vertexai: true,
       project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
       location: process.env.VERTEX_LOCATION || process.env.GCP_LOCATION,
       googleAuthOptions: {
         scopes: ['https://www.googleapis.com/auth/cloud-platform'],
       },
     });
     ```
  *Privacy Note: Cloud infrastructure details remain strictly server-side and are never transmitted or rendered on the frontend browser interface.*
- **Reasoning Loop**:
  Operates an autonomous multi-turn reasoning cycle (up to 12 turns):
  1. User prompt + conversation history + system instruction dispatched to Gemini.
  2. Gemini inspects the query and requests one or more `functionCalls` (e.g. `glob_search` for `*.config.*`).
  3. The service delegates each function call to the Python MCP client via `mcpManager.callTool(...)`.
  4. Formats results using `createPartFromFunctionResponse(...)` and feeds them back into the conversation history.
  5. The cycle repeats until Gemini determines it has collected sufficient evidence and generates the final natural language answer.

---

## 4. Detailed Sequence Diagrams

### 4.1 Ingestion Sequence

```
User (Browser)          Express API                 IngestService               MCP Server
     │                       │                            │                          │
     │── POST /api/ingest ──►│                            │                          │
     │   { target }          │── IngestService.ingest() ─►│                          │
     │                       │                            │                          │
     │                       │                     [Local or Git?]                   │
     │                       │                     If Git: clone()                   │
     │                       │                     If Local: stat()                  │
     │                       │                            │                          │
     │                       │                            │── callTool(list_dir) ───►│
     │                       │                            │◄── return entries ───────│
     │                       │                            │                          │
     │                       │                            │── callTool(glob README) ─►│
     │                       │                            │◄── return matches ───────│
     │                       │                            │                          │
     │                       │◄── return workspace obj ───│                          │
     │◄── 200 { workspace } ─│                            │                          │
```

### 4.2 Query & Tool Execution Loop (SSE Stream)

```
User (Browser)               Express API                  GeminiService              Python MCP Server
     │                            │                             │                            │
     │── POST /api/chat/stream ──►│                             │                            │
     │   { workspaceId, query }   │── queryCodebase() ─────────►│                            │
     │                            │                             │                            │
     │◄── event: status ──────────│◄── emit('status') ──────────│                            │
     │                            │                             │── generateContent() ──┐    │
     │                            │                             │   (Gemini Vertex AI)  │    │
     │                            │                             │◄──────────────────────┘    │
     │                            │                             │   [Returns functionCall]   │
     │                            │                             │                            │
     │◄── event: tool_start ──────│◄── emit('tool_start') ──────│                            │
     │                            │                             │── callTool(grep_search) ──►│
     │                            │                             │◄── raw regex matches ──────│
     │◄── event: tool_end ────────│◄── emit('tool_end') ────────│                            │
     │                            │                             │                            │
     │                            │                             │── generateContent() ──┐    │
     │                            │                             │   (With tool results) │    │
     │                            │                             │◄──────────────────────┘    │
     │                            │                             │   [Returns functionCall]   │
     │                            │                             │                            │
     │◄── event: tool_start ──────│◄── emit('tool_start') ──────│                            │
     │                            │                             │── callTool(read_file) ────►│
     │                            │                             │◄── file contents ──────────│
     │◄── event: tool_end ────────│◄── emit('tool_end') ────────│                            │
     │                            │                             │                            │
     │                            │                             │── generateContent() ──┐    │
     │                            │                             │   (Synthesize answer) │    │
     │                            │                             │◄──────────────────────┘    │
     │                            │                             │   [Returns text answer]    │
     │                            │                             │                            │
     │◄── event: final_answer ────│◄── emit('final_answer') ────│                            │
     │◄── event: done ────────────│◄── emit('done') ────────────│                            │
```

---

## 5. Security & Isolation Architecture

1. **Strict Zero-Hardcoding**:
   - Zero hardcoded GCP project IDs, credentials, or regions.
   - All environment variables are validated at runtime before model execution.
2. **Subprocess Isolation**:
   - The MCP Python server runs as an isolated subprocess with explicit unbuffered stdio pipes.
   - Background process reader (`read_process_output`) is withheld from the model declaration to prevent process snooping.
3. **Workspace Path Containment**:
   - File paths are normalized and resolved within the boundaries of the ingested workspace root.
4. **Read-Only Inspection**:
   - MCP analysis tools are strictly read-only (`glob_search`, `grep_search`, `list_directory`, `read_file`, `read_folder`). No file mutation tools are exposed to the reasoning loop.

---

## 6. Directory Map

```
newpage-assesment/
├── backend/
│   ├── src/
│   │   ├── types.ts                     # Domain interfaces (Workspace, ToolTrace, GcpConfig)
│   │   ├── mcpClient.ts                 # Python MCP stdio orchestrator & tool converter
│   │   ├── server.ts                    # Express REST & SSE streaming server
│   │   ├── test_integration.ts          # Automated backend integration tests
│   │   └── services/
│   │       ├── ingestService.ts         # Local directory & Git repo ingestion engine
│   │       └── geminiService.ts         # Vertex AI autonomous reasoning & tool loop
│   ├── .env.example                     # Backend environment template
│   ├── package.json                     # Backend scripts (start, dev, build, test)
│   └── tsconfig.json                    # Backend TypeScript configuration
├── frontend/
│   ├── src/
│   │   ├── types/index.ts               # Shared frontend type definitions
│   │   ├── components/
│   │   │   ├── Navbar.tsx               # Header, MCP status, Vertex AI project badge
│   │   │   ├── CodebaseSidebar.tsx      # Tree view & MCP tools accordion
│   │   │   ├── ChatView.tsx             # Markdown conversation & suggestion prompts
│   │   │   ├── ToolTraceViewer.tsx      # Live collapsible tool execution trace viewer
│   │   │   ├── IngestModal.tsx          # Local path / GitHub URL ingestion modal
│   │   │   ├── SettingsModal.tsx        # Vertex AI config & model switcher
│   │   │   └── FileViewerModal.tsx      # Syntax-highlighted file inspector
│   │   ├── App.tsx                      # Root application component
│   │   ├── main.tsx                     # React 18 bootstrap
│   │   └── index.css                    # Tailwind CSS directives & markdown typography
│   ├── .env.example                     # Frontend environment template
│   ├── vite.config.ts                   # Vite bundler & backend proxy config
│   ├── tailwind.config.js               # Tailwind design system configuration
│   ├── package.json                     # Frontend scripts (dev, build, preview)
│   └── tsconfig.json                    # Frontend TypeScript configuration
├── tools/
│   ├── server.py                        # Python Model Context Protocol (MCP) server
│   ├── requirements.txt                 # Python MCP server dependencies
│   ├── glob_search/                     # Pattern search implementation
│   ├── grep_search/                     # Regex search implementation
│   ├── list_directory/                  # Directory traversal implementation
│   ├── read_file/                       # Line-bounded reader implementation
│   └── read_folder/                     # Recursive folder inspector
├── ARCHITECTURE.md                      # This architectural specification
├── README.md                            # Setup, configuration & operational guide
└── package.json                         # Root workspace scripts
```
