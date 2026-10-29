import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { simpleGit } from 'simple-git';
import crypto from 'crypto';
import { mcpManager } from '../mcpClient.js';
import { Workspace, IngestOptions, DirectoryEntry, WorkspaceSummary } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaces = new Map<string, Workspace>();

const STORAGE_DIR = path.resolve(__dirname, '..', '..', 'storage', 'repos');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class IngestService {
  public static getWorkspaces(): Workspace[] {
    return Array.from(workspaces.values());
  }

  public static getWorkspace(id: string): Workspace | undefined {
    return workspaces.get(id);
  }

  public static async ingest({ type, target }: IngestOptions): Promise<Workspace> {
    if (!target || typeof target !== 'string') {
      throw new Error('Target path or URL is required');
    }

    const trimmedTarget = target.trim();
    let workspacePath = '';
    let name = '';
    let repoUrl: string | null = null;

    if (
      type === 'github' ||
      trimmedTarget.startsWith('http://') ||
      trimmedTarget.startsWith('https://') ||
      trimmedTarget.endsWith('.git')
    ) {
      repoUrl = trimmedTarget;
      const cleanName = trimmedTarget
        .replace(/\.git$/, '')
        .split('/')
        .filter(Boolean)
        .slice(-2)
        .join('_')
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      name = cleanName || 'cloned-repo';
      const uniqueSuffix = Date.now().toString(36);
      workspacePath = path.join(STORAGE_DIR, `${name}_${uniqueSuffix}`);

      console.log(`[Ingest] Cloning repository ${repoUrl} into ${workspacePath}...`);
      const git = simpleGit();
      await git.clone(repoUrl, workspacePath, ['--depth', '1']);
      console.log(`[Ingest] Successfully cloned ${repoUrl}`);
    } else {
      workspacePath = path.resolve(trimmedTarget);
      if (!fs.existsSync(workspacePath)) {
        throw new Error(`Directory does not exist: ${workspacePath}`);
      }
      const stat = fs.statSync(workspacePath);
      if (!stat.isDirectory()) {
        throw new Error(`Specified path is not a directory: ${workspacePath}`);
      }
      name = path.basename(workspacePath) || 'local-codebase';
    }

    const workspaceId = crypto.randomUUID();

    let initialEntries: DirectoryEntry[] = [];
    try {
      const toolRes = await mcpManager.callTool('list_directory', { path: workspacePath }, workspacePath);
      if (!toolRes.isError && toolRes.text) {
        const parsed = JSON.parse(toolRes.text);
        if (parsed && Array.isArray(parsed.entries)) {
          initialEntries = parsed.entries;
        }
      }
    } catch (err: any) {
      console.warn('[Ingest] Failed to list directory with MCP:', err.message);
    }

    const summaryInfo: WorkspaceSummary = {};
    try {
      const readmeCheck = await mcpManager.callTool(
        'glob_search',
        { pattern: 'README*', root_dir: workspacePath },
        workspacePath
      );
      if (!readmeCheck.isError && readmeCheck.text) {
        const readmeMatches = JSON.parse(readmeCheck.text);
        if (Array.isArray(readmeMatches) && readmeMatches.length > 0) {
          const readmeContent = await mcpManager.callTool(
            'read_file',
            { path: readmeMatches[0], max_lines: 30 },
            workspacePath
          );
          summaryInfo.readmePreview = readmeContent.text;
        }
      }
    } catch {
      // Non-blocking
    }

    const workspace: Workspace = {
      id: workspaceId,
      name,
      type: repoUrl ? 'github' : 'local',
      path: workspacePath,
      repoUrl,
      createdAt: new Date().toISOString(),
      initialEntries,
      summaryInfo,
    };

    workspaces.set(workspaceId, workspace);
    return workspace;
  }
}
