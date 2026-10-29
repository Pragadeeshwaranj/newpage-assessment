import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mcpManager } from './mcpClient.js';
import { IngestService } from './services/ingestService.js';
import { GeminiService } from './services/geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 0. Configuration & Status Probe (No GCP details exposed)
app.get('/api/config', (_req: Request, res: Response) => {
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const hasVertexAi = !!(
    (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT) &&
    (process.env.VERTEX_LOCATION || process.env.GCP_LOCATION)
  );

  res.json({
    authConfigured: hasGeminiKey || hasVertexAi,
    authMode: hasGeminiKey ? 'api_key' : hasVertexAi ? 'vertex_ai' : 'none',
  });
});

// 1. Health & Status
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const tools = await mcpManager.getTools();
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const hasVertexAi = !!(
      (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT) &&
      (process.env.VERTEX_LOCATION || process.env.GCP_LOCATION)
    );

    res.json({
      status: 'ok',
      mcpConnected: true,
      toolsCount: tools.length,
      tools: tools.map((t) => t.name),
      authConfigured: hasGeminiKey || hasVertexAi,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'degraded',
      mcpConnected: false,
      error: err.message,
    });
  }
});

// 2. List MCP Tools
app.get('/api/tools', async (_req: Request, res: Response) => {
  try {
    const tools = await mcpManager.getTools();
    res.json({ tools });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Ingest Codebase (GitHub or Local)
app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const { type, target } = req.body;
    if (!target) {
      return res.status(400).json({ error: 'Target directory or GitHub URL is required.' });
    }

    const workspace = await IngestService.ingest({ type, target });
    res.json({ success: true, workspace });
  } catch (err: any) {
    console.error('[API /api/ingest error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Get All Workspaces
app.get('/api/workspaces', (_req: Request, res: Response) => {
  const list = IngestService.getWorkspaces();
  res.json({ workspaces: list });
});

// 5. Inspect Workspace Directory Tree (uses MCP tool list_directory)
app.get('/api/workspace/:id/tree', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.id as string;
    const workspace = IngestService.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const subpath = (req.query.path as string) || '.';
    const result = await mcpManager.callTool('list_directory', { path: subpath }, workspace.path);
    if (result.isError) {
      return res.status(400).json({ error: result.text });
    }
    res.json(JSON.parse(result.text));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Inspect Workspace File Content (uses MCP tool read_file)
app.post('/api/workspace/:id/read', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.id as string;
    const workspace = IngestService.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const { filePath, startLine, endLine } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required.' });
    }

    const result = await mcpManager.callTool(
      'read_file',
      {
        path: filePath,
        start_line: startLine || null,
        end_line: endLine || null,
        max_lines: 500,
      },
      workspace.path
    );

    res.json({ content: result.text, isError: result.isError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Regular Chat Query
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { workspaceId, query, history, apiKey, model } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }
    if (!query) {
      return res.status(400).json({ error: 'query is required.' });
    }

    const workspace = IngestService.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const effectiveApiKey =
      apiKey || (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;

    const result = await GeminiService.queryCodebase({
      apiKey: effectiveApiKey,
      workspace,
      query,
      history,
      model: model || 'gemini-2.5-flash',
    });

    res.json(result);
  } catch (err: any) {
    console.error('[API /api/chat error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Streaming Chat Query with Live MCP Tool Traces (SSE)
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const { workspaceId, query, history, apiKey, model } = req.body;

  if (!workspaceId || !query) {
    return res.status(400).json({ error: 'workspaceId and query are required.' });
  }

  const workspace = IngestService.getWorkspace(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found.' });
  }

  const effectiveApiKey =
    apiKey || (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('status', { message: 'Analyzing query and preparing MCP tools...' });

    const result = await GeminiService.queryCodebase({
      apiKey: effectiveApiKey,
      workspace,
      query,
      history,
      model: model || 'gemini-2.5-flash',
      onEvent: (event) => {
        sendEvent(event.type, event);
      },
    });

    sendEvent('done', result);
    res.end();
  } catch (err: any) {
    console.error('[API /api/chat/stream error]:', err);
    sendEvent('error', { message: err.message });
    res.end();
  }
});

// Initialize MCP and start HTTP server
async function startServer(): Promise<void> {
  try {
    console.log('[Server] Connecting to MCP tools server...');
    await mcpManager.connect();
    console.log('[Server] MCP tools server ready.');

    app.listen(PORT, () => {
      console.log(`[Server] TypeScript Codebase Q&A Backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize MCP server:', err);
    process.exit(1);
  }
}

startServer();
