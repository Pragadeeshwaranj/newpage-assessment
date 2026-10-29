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

export interface IngestOptions {
  type?: 'github' | 'local';
  target: string;
}

export interface ToolTrace {
  id: string;
  tool: string;
  args?: Record<string, any>;
  timestamp: string;
  status: 'running' | 'success' | 'error';
  duration?: string;
  outputPreview?: string;
}

export interface ChatQueryOptions {
  apiKey?: string;
  workspace: Workspace;
  query: string;
  history?: Array<{ role: 'user' | 'model'; text?: string; content?: string }>;
  model?: string;
  onEvent?: (event: Record<string, any>) => void;
}

export interface ChatQueryResult {
  answer: string;
  traces: ToolTrace[];
  iterations: number;
}
