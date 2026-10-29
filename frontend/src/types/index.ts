export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
}

export interface WorkspaceSummary {
  readmePreview?: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'github' | 'local';
  path: string;
  repoUrl?: string | null;
  createdAt: string;
  initialEntries?: DirectoryEntry[];
  summaryInfo?: WorkspaceSummary;
}

export interface McpToolParameter {
  type: string;
  required?: boolean;
  default?: any;
  description?: string;
}

export interface McpTool {
  name: string;
  description: string;
  parameters?: Record<string, McpToolParameter>;
}

export interface McpStatus {
  status: 'ok' | 'degraded';
  mcpConnected: boolean;
  toolsCount: number;
  tools: string[];
  authConfigured?: boolean;
}

export interface ToolTrace {
  id: string;
  tool: string;
  args?: Record<string, any>;
  status: 'running' | 'success' | 'error';
  timestamp?: string;
  duration?: string;
  outputPreview?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  traces?: ToolTrace[];
}
