# Codebase Q&A System — User Guide

A step-by-step operational manual for ingesting software repositories, exploring codebases, and asking deep architectural and implementation questions using **Model Context Protocol (MCP)** tools and **Google Vertex AI**.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Prerequisites & Google Cloud Setup](#2-prerequisites--google-cloud-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Starting the Application](#4-starting-the-application)
5. [Core User Workflows](#5-core-user-workflows)
   - [Workflow 1: Ingesting a Local Directory](#workflow-1-ingesting-a-local-directory)
   - [Workflow 2: Ingesting a Remote GitHub Repository](#workflow-2-ingesting-a-remote-github-repository)
   - [Workflow 3: Exploring Files in the Codebase Explorer](#workflow-3-exploring-files-in-the-codebase-explorer)
   - [Workflow 4: Interrogating the Codebase & Asking Questions](#workflow-4-interrogating-the-codebase--asking-questions)
   - [Workflow 5: Monitoring Live MCP Tool Traces](#workflow-5-monitoring-live-mcp-tool-traces)
   - [Workflow 6: Model Selection & Settings](#workflow-6-model-selection--settings)
6. [High-Value Prompt Recipes](#6-high-value-prompt-recipes)
7. [Understanding MCP Tools & Traces](#7-understanding-mcp-tools--traces)
8. [Troubleshooting & Frequently Asked Questions](#8-troubleshooting--frequently-asked-questions)

---

## 1. Introduction

The **Codebase Q&A System** is an AI assistant built specifically for software engineers, tech leads, and security auditors.

Instead of relying on approximate embeddings or vector chunks, this system gives Gemini direct access to **Model Context Protocol (MCP)** tools running in a secure local Python environment. When you ask a question, Gemini uses these tools to:
- Traverse directory trees (`list_directory`, `read_folder`)
- Search for filenames matching wildcard patterns (`glob_search`)
- Search for text, symbols, or regex patterns across files (`grep_search`)
- Read exact source code files within specific line ranges (`read_file`)

Every answer is synthesized from **actual codebase files** with exact file citations and code references.

---

## 2. Prerequisites & Google Cloud Setup

Before running the application, ensure the following prerequisites are installed:

### 2.1 Required Software
- **Node.js**: v18.0.0 or higher (v22.x recommended). Verify with `node -v`.
- **npm**: v9.0.0 or higher. Verify with `npm -v`.
- **Python**: v3.10+ (a pre-configured virtual environment is located at `tools/.venv`).
- **Google Cloud SDK (`gcloud`)**: Required for Vertex AI authentication.

### 2.2 Authenticate with Google Cloud
The application uses **Application Default Credentials (ADC)** to communicate with Vertex AI. Run the following command in your terminal:

```bash
gcloud auth application-default login
```

Follow the browser prompt to log in with your Google Cloud account that has permissions to access Vertex AI in your targeted Google Cloud project.

---

## 3. Environment Configuration

The application supports a **dual authentication strategy**:

### 3.1 Option 1 (Primary): Gemini API Key
If a Gemini API key is available, the system prioritizes it as the first option:
In `backend/.env`:
```bash
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
```
*(You can also configure this dynamically in the web UI Settings modal).*

### 3.2 Option 2 (Secondary Fallback): Google Cloud Vertex AI
If `GEMINI_API_KEY` is not provided, the backend seamlessly falls back to enterprise Google Cloud Vertex AI using Application Default Credentials (ADC):
In `backend/.env`:
```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
VERTEX_LOCATION=your-gcp-vertex-location
PORT=3001
```

> 🔒 **Privacy Guarantee**: All Google Cloud infrastructure and project details remain strictly on the backend and are **never displayed** on the frontend user interface.

---

## 4. Starting the Application

### 4.1 One-Time Dependency Installation
From the root directory of the workspace, run:

```bash
npm run install:all
```
This installs dependencies for both the Node.js backend and the React frontend.

### 4.2 Start the Backend
Open a terminal and run:

```bash
npm run backend:dev
```
You should see:
```
[Server] Connecting to MCP tools server...
[MCP] Connected to MCP server successfully.
[MCP] Registered 7 tools: glob_search, google_web_search, grep_search, list_directory, read_file, read_folder, read_process_output
[Server] TypeScript Codebase Q&A Backend listening on http://localhost:3001
```

### 4.3 Start the Frontend
Open a second terminal and run:

```bash
npm run frontend
```
You should see:
```
  VITE v6.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 5. Core User Workflows

### Workflow 1: Ingesting a Local Directory

Use this when you want to analyze a codebase already located on your computer:

1. Click the **Ingest Codebase** button in the top navigation bar.
2. Select the **Local Directory** tab.
3. Enter the absolute path to your project (e.g. `C:\Projects\my-app` or `/Users/name/projects/my-app`).
   - *Quick Suggestion*: Click **Current Assessment Repo** to quickly ingest the current project.
4. Click **Ingest Codebase**.
5. The backend validates the directory, scans the root entries using the MCP `list_directory` tool, and populates the sidebar.

---

### Workflow 2: Ingesting a Remote GitHub Repository

Use this when you want to analyze an open-source project or remote repository:

1. Click the **Ingest Codebase** button in the top navigation bar.
2. Select the **GitHub Repository** tab.
3. Paste a public GitHub URL (e.g. `https://github.com/expressjs/express` or `https://github.com/pallets/flask`).
4. Click **Ingest Codebase**.
5. The backend performs a shallow clone (`--depth 1`) into `backend/storage/repos/`, registers the workspace, and lists the file tree.

---

### Workflow 3: Exploring Files in the Codebase Explorer

1. Look at the left sidebar under **Files & Folders**.
2. Click on any file name (e.g., `package.json`, `server.py`, or `src/index.ts`).
3. The **File Viewer Modal** will open, fetching the exact contents using the MCP `read_file` tool.
4. You can scroll through the code, view line numbers, and click the **Copy** button in the upper right corner.

---

### Workflow 4: Interrogating the Codebase & Asking Questions

1. Click on one of the **Starter Suggestion Cards** or type in the bottom chat input box:
   - *"How does authentication work in this codebase?"*
   - *"Where are the API routes defined?"*
   - *"What external libraries are used and what do they do?"*
2. Press **Enter** (or click the **Ask Codebase** button). To insert a new line in your prompt, press **Shift + Enter**.
3. While the model is reasoning, the status indicator will update in real time (e.g., `MCP executing: grep_search...`, `MCP executing: read_file...`).
4. Once reasoning concludes, the synthesized response is rendered with Markdown tables, bold headers, and syntax-highlighted code blocks.
5. Click **Copy** at the bottom of any assistant message to copy the explanation to your clipboard.

---

### Workflow 5: Monitoring Live MCP Tool Traces

To see exactly how the AI arrived at its conclusion:

1. Look at the top of the AI's response message for the **MCP Analysis Traces** card.
2. Click the header (e.g. `MCP Analysis Traces (4) - 4 tool calls executed`) to expand the trace log.
3. You will see an entry for each tool executed:
   - Green checkmark (`success`)
   - Tool name (e.g. `grep_search`, `read_file`)
   - Input arguments
   - Execution duration (e.g. `34ms`)
4. Click any individual trace row to view the full JSON arguments and a preview of the raw MCP tool output.

---

### Workflow 6: Model Selection & Settings

1. Click the **Settings** button in the top navigation bar.
2. *(Optional)* Enter your **Gemini API Key** if you wish to use it as the primary option directly from the browser. If left empty, the system uses the backend environment configuration.
3. Choose your preferred Gemini model:
   - **Gemini 2.5 Flash** *(Recommended)*: Fastest reasoning and high tool-calling accuracy.
   - **Gemini 2.0 Flash**: Lightweight, high speed.
   - **Gemini 1.5 Pro**: Deep reasoning for complex multi-layered architectural analysis.
4. Click **Save Preferences**. The setting is remembered in your browser session.

---

## 6. High-Value Prompt Recipes

Here are tested prompts that leverage the full power of the MCP analysis tools:

### Architecture & System Design
- *"Give me a high-level architectural summary of this project. What are the key directories, layers, and entry points?"*
- *"Trace the data flow from an incoming HTTP request to the database or storage layer."*
- *"Is there a separation between business logic and transport controllers in this repository?"*

### API Endpoints & Routes
- *"Find all API routes defined in this codebase. For each route, list the HTTP method, URL path, required parameters, and handler function."*
- *"Where is request body validation or schema validation handled for API endpoints?"*

### Dependencies & Configuration
- *"Inspect the dependency manifest (package.json / requirements.txt / Cargo.toml). Summarize the purpose of each external dependency."*
- *"What environment variables does this application expect? Search for `process.env` or `os.environ` usages."*

### Implementation & Logic Search
- *"Where is authentication or authorization enforced? Cite the exact file names and line ranges."*
- *"How is error handling and exception logging structured across the codebase?"*
- *"Find all background jobs, cron tasks, or scheduled workers."*

### Code Quality & Security Audit
- *"Scan this codebase for potential security concerns such as unvalidated user inputs, hardcoded secrets, or unescaped queries."*
- *"Are there unit or integration tests for the core services? What is the testing setup?"*

---

## 7. Understanding MCP Tools & Traces

The system provides Gemini with 5 specialized codebase tools:

| Tool Name | Purpose | Typical Use Case |
| :--- | :--- | :--- |
| `list_directory` | Lists entries in a directory (files and subfolders). | Initial directory reconnaissance and folder exploration. |
| `read_folder` | Recursively walks directory trees. | Discovering complete project hierarchy and module maps. |
| `glob_search` | Matches files using wildcard patterns (e.g. `**/*.ts`, `routes/*`). | Locating specific file types or configuration files quickly. |
| `grep_search` | Searches for text or regex patterns recursively in files. | Finding where functions, classes, routes, or imports are declared. |
| `read_file` | Reads file content with optional line boundaries. | Examining exact source code implementations and functions. |

When the model runs, you can verify each tool call in the **MCP Analysis Traces** view to confirm that no facts are fabricated.

---

## 8. Troubleshooting & Frequently Asked Questions

### Q: Why do I see "GCP Project ID is not configured" error?
**A:** You need to specify your Google Cloud project in `backend/.env`:
```bash
GOOGLE_CLOUD_PROJECT=your-actual-project-id
VERTEX_LOCATION=global
```
After updating `backend/.env`, restart the backend server (`npm run backend:dev`).

---

### Q: Why do I get a Google Cloud authentication error (401 or 403)?
**A:** Your local Application Default Credentials (ADC) may be expired or missing:
1. Run:
   ```bash
   gcloud auth application-default login
   ```
2. Ensure your Google Cloud user has the **Vertex AI User** (`roles/aiplatform.user`) role on the project.

---

### Q: What if port 3001 or 5173 is already in use?
**A:**
- **Backend**: Change `PORT=3002` in `backend/.env`. (Update `frontend/vite.config.ts` proxy target accordingly).
- **Frontend**: Vite will automatically offer the next available port (e.g. `5174`).

---

### Q: Where are cloned GitHub repositories stored?
**A:** Cloned repositories are saved locally under `backend/storage/repos/`. You can safely delete these folders anytime if you need to reclaim disk space.

---

### Q: Can I run automated tests to check if my tools server is healthy?
**A:** Yes! Run the automated integration test suite:
```bash
npm run test:backend
```
If all 6 tests pass, your MCP server, tool declarations, and Python runtime are operating normally.
