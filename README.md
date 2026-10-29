# Codebase Q&A System

> An enterprise-grade, full-stack AI system that ingests any codebase (local directory or remote GitHub repository) and answers technical questions about its architecture, endpoints, business logic, and dependencies using **exclusively Model Context Protocol (MCP) tools** for deterministic code analysis.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg?logo=node.js)](https://nodejs.org/)
[![Google GenAI SDK](https://img.shields.io/badge/@google/genai-Vertex_AI-orange.svg)](https://cloud.google.com/vertex-ai)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard_stdio-purple.svg)](https://modelcontextprotocol.io/)

---

## 🌟 Key Highlights

- **Strictly MCP-Driven Analysis**: The system never hallucinates file structures or imports. All code exploration is executed dynamically by calling registered MCP tools (`list_directory`, `glob_search`, `grep_search`, `read_file`, and `read_folder`).
- **Dual Authentication Strategy**:
  - **Option 1 (Primary)**: Use `GEMINI_API_KEY` for direct Gemini Developer API access.
  - **Option 2 (Secondary Fallback)**: Use Google Cloud Vertex AI via Application Default Credentials (ADC) with `GOOGLE_CLOUD_PROJECT` and `VERTEX_LOCATION`.
- **Clean, Privacy-First Frontend**: Cloud project IDs, regions, and infrastructure details are kept strictly on the server and are never exposed in the browser interface.
- **Live Tool Trace Observability**: Real-time Server-Sent Events (SSE) stream every tool call (`tool_start`, `tool_end`, duration in ms, and output preview) directly to a collapsible trace monitor in the browser.
- **Interactive Codebase Explorer**: Browse directory entries in the sidebar (via MCP `list_directory`) and view source code files with line numbers and syntax styling (via MCP `read_file`).
- **End-to-End TypeScript**: Complete type safety across both backend (`tsx`, `express`) and frontend (`vite`, `react`).

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│           React + Vite + Tailwind CSS (TSX)            │  (Port 5173)
│   - Codebase Ingestion Modal (GitHub & Local)          │
│   - Interactive File Tree (via MCP list_directory)     │
│   - Live Tool Trace Accordion (Real-Time SSE)          │
│   - Markdown Q&A Interface with Starter Prompts        │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP REST / SSE Stream (/api/chat/stream)
┌───────────────────────────▼────────────────────────────┐
│          Node.js + Express + TypeScript API            │  (Port 3001)
│   - Ingestion Service (Local validation & Git clone)   │
│   - Google GenAI SDK (@google/genai in Vertex AI mode) │
│   - MCP Client Manager (@modelcontextprotocol/sdk)     │
└───────────────────────────┬────────────────────────────┘
                            │ JSON-RPC 2.0 (stdio)
┌───────────────────────────▼────────────────────────────┐
│                Python Tools MCP Server                 │  (tools/server.py)
│   - glob_search: File pattern matching                 │
│   - grep_search: Regex text search                     │
│   - list_directory: Directory traversal                │
│   - read_file: Line-bounded content reader             │
│   - read_folder: Recursive folder inspector            │
└────────────────────────────────────────────────────────┘
```

> 📖 **Documentation**:
> - [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Complete technical specification, sequence diagrams, and protocol details.
> - [**USER_GUIDE.md**](./USER_GUIDE.md) — Comprehensive operational guide, workflows, prompt recipes, and troubleshooting.

---

## 📋 Prerequisites

1. **Node.js**: v18+ (v22 tested and recommended)
2. **Python**: v3.10+ (with virtual environment in `tools/.venv`)
3. **Google Cloud SDK**: Application Default Credentials configured:
   ```bash
   gcloud auth application-default login
   ```

---

## ⚙️ Environment Configuration

The application supports a **dual authentication strategy** configured in `backend/.env`:

### Option 1 (Primary): Gemini API Key
Provide your Gemini Developer API key in `backend/.env`:
```bash
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
```

### Option 2 (Secondary Fallback): Google Cloud Vertex AI
If `GEMINI_API_KEY` is not set, the system automatically falls back to enterprise Google Cloud Vertex AI via Application Default Credentials (ADC):
```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
VERTEX_LOCATION=your-gcp-vertex-location
PORT=3001
```

> 🔒 **Privacy Guarantee**: All Google Cloud project identifiers and credentials remain strictly server-side and are never displayed in the frontend browser interface.

---

## 🚀 Quick Start

### 1. Install Dependencies
Run from the root directory to install both backend and frontend dependencies:
```bash
npm run install:all
```

### 2. Start the Backend API
```bash
npm run backend:dev
```
*Backend starts on `http://localhost:3001` and connects to the Python MCP tools server.*

### 3. Start the Frontend Application
```bash
npm run frontend
```
*Frontend opens on `http://localhost:5173` with proxy configuration to the backend.*

---

## 📦 Available Scripts

From the root repository:

| Command | Description |
| :--- | :--- |
| `npm run install:all` | Installs dependencies for both `backend` and `frontend` |
| `npm run backend:dev` | Starts backend with hot-reload via `tsx watch` |
| `npm run backend` | Starts backend production server |
| `npm run frontend` | Starts frontend Vite development server |
| `npm run build` | Builds both backend (`tsc`) and frontend (`tsc -b && vite build`) |
| `npm run test:backend`| Runs automated backend integration test suite |

---

## 🧪 Automated Testing

The automated test suite verifies:
1. Connection to the Python MCP server via `stdio`.
2. Discovery of MCP tools (`glob_search`, `grep_search`, `list_directory`, `read_file`, `read_folder`).
3. Translation of MCP schemas to Google GenAI function declarations.
4. Local codebase ingestion and metadata extraction.
5. Live MCP tool execution (`list_directory`, `grep_search`, `read_file`).

Run the test suite:
```bash
npm run test:backend
```

Expected output:
```
=== Starting Backend TypeScript Integration Tests ===
✓ MCP tools discovered successfully.
✓ Gemini tool declarations generated successfully.
✓ Local codebase ingested successfully via MCP tools.
✓ MCP list_directory executed successfully.
✓ MCP grep_search executed successfully.
✓ MCP read_file executed successfully.
=======================================
🎉 ALL TYPESCRIPT INTEGRATION TESTS PASSED!
=======================================
```

---

## 💡 How to Use

1. **Ingest a Codebase**:
   - Open the web interface at `http://localhost:5173`.
   - Click **Ingest Codebase** in the top bar.
   - Choose **Local Directory** (e.g. `C:\Projects\my-repo`) or **GitHub Repository** (e.g. `https://github.com/expressjs/express`).
   - Click **Ingest Codebase**. The directory will be cataloged using MCP tools.

2. **Explore Files**:
   - Browse the folder structure in the left sidebar.
   - Click on any file to open the **File Viewer Modal** and read its contents directly through the MCP `read_file` tool.

3. **Ask Questions**:
   - Use one of the starter prompt chips or enter custom questions:
     - *"How does this codebase work and what is its architecture?"*
     - *"Where are the API endpoints and route handlers declared?"*
     - *"What dependencies does this project use and what is each used for?"*
     - *"Find where authentication or permission validation is implemented."*

4. **Observe Tool Execution**:
   - As Gemini reasons over your question, an **MCP Analysis Traces** accordion will expand in real-time, showing which tools were called, their execution duration, and preview results.

---

## 🛡️ Security & Privacy

- **Read-Only Code Analysis**: The MCP tools exposed to Gemini are strictly read-only. No file writing or deletion operations can be triggered by the model.
- **Path Confinement**: All tool file queries are resolved and restricted within the bounds of the active workspace.
- **No Hardcoded Secrets**: Secrets and project identifiers are never baked into source code or build artifacts.

---

## 📄 License

MIT
