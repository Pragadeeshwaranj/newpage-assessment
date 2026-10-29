import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ToolCallResult {
  raw: any;
  text: string;
  isError: boolean;
}

export class McpManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: any[] = [];
  private isConnecting: boolean = false;

  public getPythonPath(): string {
    const rootDir = path.resolve(__dirname, '..', '..');
    const winVenv = path.join(rootDir, 'tools', '.venv', 'Scripts', 'python.exe');
    const unixVenv = path.join(rootDir, 'tools', '.venv', 'bin', 'python');

    if (fs.existsSync(winVenv)) return winVenv;
    if (fs.existsSync(unixVenv)) return unixVenv;
    return process.platform === 'win32' ? 'python.exe' : 'python3';
  }

  public getServerScriptPath(): string {
    return path.resolve(__dirname, '..', '..', 'tools', 'server.py');
  }

  public async connect(): Promise<Client> {
    if (this.client) return this.client;
    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.client) return this.client;
    }

    this.isConnecting = true;
    try {
      const pythonPath = this.getPythonPath();
      const serverScript = this.getServerScriptPath();

      console.log(`[MCP] Starting Python MCP server with: ${pythonPath} ${serverScript} --mcp`);

      this.transport = new StdioClientTransport({
        command: pythonPath,
        args: [serverScript, '--mcp'],
        env: {
          ...(process.env as Record<string, string>),
          PYTHONUNBUFFERED: '1',
        },
      });

      this.client = new Client(
        {
          name: 'codebase-qa-backend',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      console.log('[MCP] Connected to MCP server successfully.');

      const toolsResult = await this.client.listTools();
      this.tools = toolsResult.tools || [];
      console.log(`[MCP] Registered ${this.tools.length} tools: ${this.tools.map((t) => t.name).join(', ')}`);

      return this.client;
    } catch (err) {
      console.error('[MCP] Failed to connect to MCP server:', err);
      this.client = null;
      this.transport = null;
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  public async getTools(): Promise<any[]> {
    if (!this.client) {
      await this.connect();
    }
    return this.tools;
  }

  /**
   * Translates MCP tool definitions into Google Gen AI function declarations
   */
  public async getGenAiToolDeclarations(): Promise<any[]> {
    const tools = await this.getTools();

    function cleanType(type: any): string {
      if (!type) return 'STRING';
      const upper = String(type).toUpperCase();
      if (upper === 'INT') return 'INTEGER';
      if (upper === 'BOOL') return 'BOOLEAN';
      return upper;
    }

    function cleanSchema(schema: any): any {
      if (!schema) return { type: 'OBJECT', properties: {} };

      const type = cleanType(schema.type || 'object');
      const result: Record<string, any> = { type };

      if (schema.description) {
        result.description = schema.description;
      }

      if (schema.properties) {
        result.properties = {};
        for (const [k, v] of Object.entries(schema.properties)) {
          result.properties[k] = cleanSchema(v);
        }
      }

      if (schema.items) {
        result.items = cleanSchema(schema.items);
      }

      if (Array.isArray(schema.required) && schema.required.length > 0) {
        result.required = schema.required;
      }

      return result;
    }

    const declarations = tools
      .filter((t) => t.name !== 'read_process_output')
      .map((t) => {
        const schema = cleanSchema(t.inputSchema);
        return {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'OBJECT',
            properties: schema.properties || {},
            required: schema.required || [],
          },
        };
      });

    return [
      {
        functionDeclarations: declarations,
      },
    ];
  }

  /**
   * Execute a tool by name with arguments, adjusting paths relative to workspaceRoot
   */
  public async callTool(
    name: string,
    rawArgs: Record<string, any> = {},
    workspaceRoot: string | null = null
  ): Promise<ToolCallResult> {
    if (!this.client) {
      await this.connect();
    }

    const args = { ...rawArgs };

    if (workspaceRoot) {
      if (args.path !== undefined) {
        if (args.path === '.' || args.path === '' || !args.path) {
          args.path = workspaceRoot;
        } else if (!path.isAbsolute(args.path)) {
          args.path = path.resolve(workspaceRoot, args.path);
        }
      }

      if (args.root_dir !== undefined) {
        if (args.root_dir === '.' || args.root_dir === '' || !args.root_dir) {
          args.root_dir = workspaceRoot;
        } else if (!path.isAbsolute(args.root_dir)) {
          args.root_dir = path.resolve(workspaceRoot, args.root_dir);
        }
      }
    }

    console.log(`[MCP] Calling tool '${name}' with args:`, JSON.stringify(args));

    try {
      const response: any = await this.client!.callTool({
        name,
        arguments: args,
      });

      let outputText = '';
      if (response && response.content) {
        outputText = response.content
          .map((c: any) => (c.type === 'text' ? c.text : JSON.stringify(c)))
          .join('\n');
      } else {
        outputText = JSON.stringify(response);
      }

      return {
        raw: response,
        text: outputText,
        isError: !!response?.isError,
      };
    } catch (err: any) {
      console.error(`[MCP] Error executing tool '${name}':`, err.message);
      return {
        raw: { error: err.message },
        text: JSON.stringify({ error: err.message }),
        isError: true,
      };
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        console.error('[MCP] Error closing client:', err);
      }
      this.client = null;
      this.transport = null;
    }
  }
}

export const mcpManager = new McpManager();
