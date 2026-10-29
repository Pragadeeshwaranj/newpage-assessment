import { GoogleGenAI, createPartFromFunctionResponse } from '@google/genai';
import { mcpManager } from '../mcpClient.js';
import { ChatQueryOptions, ChatQueryResult, ToolTrace } from '../types.js';

export class GeminiService {
  /**
   * Run a code Q&A reasoning loop with Gemini Vertex AI and MCP tools
   */
  public static async queryCodebase({
    apiKey,
    workspace,
    query,
    history = [],
    model = 'gemini-2.5-flash',
    onEvent = () => {},
  }: ChatQueryOptions): Promise<ChatQueryResult> {
    const geminiApiKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    let ai: GoogleGenAI;

    if (geminiApiKey) {
      console.log('[Gemini] Authenticating via Gemini API Key (Option 1)');
      ai = new GoogleGenAI({
        apiKey: geminiApiKey,
      });
    } else {
      console.log('[Gemini] Authenticating via Google Cloud Vertex AI (Option 2)');
      const project =
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCP_PROJECT_ID ||
        process.env.GCLOUD_PROJECT;

      const location =
        process.env.VERTEX_LOCATION ||
        process.env.GCP_LOCATION;

      if (!project || !location) {
        throw new Error(
          'No authentication configured. Please provide GEMINI_API_KEY in your environment, or configure GOOGLE_CLOUD_PROJECT and VERTEX_LOCATION for Vertex AI.'
        );
      }

      ai = new GoogleGenAI({
        vertexai: true,
        project,
        location,
        googleAuthOptions: {
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        },
      });
    }

    const toolsDeclaration = await mcpManager.getGenAiToolDeclarations();

    const systemInstruction = `You are a world-class principal software engineer and expert codebase assistant.
You are tasked with answering questions about the codebase located at: "${workspace.path}".
Codebase name: "${workspace.name}" (Type: ${workspace.type}).

STRICT RULES:
1. You MUST use the provided MCP tools to inspect, search, and analyze the codebase. Never guess or hallucinate file contents or architecture.
2. Available tools include:
   - list_directory: List entries in a folder.
   - read_folder: List files recursively or inspect directory trees.
   - glob_search: Find files by pattern (e.g. "**/*.js", "src/**/*.py", "package.json").
   - grep_search: Search for text or regex across files (e.g. route declarations, function names, imports).
   - read_file: Read specific file contents or line ranges.
3. Path handling: You can pass relative paths (e.g., "src/index.js", "package.json") or "." for root. The tools will automatically resolve them relative to the codebase.
4. When answering questions:
   - Point to exact file names and line numbers where functionality is defined.
   - Cite relevant code snippets.
   - For architecture, endpoints, or dependencies: inspect the manifests (package.json, requirements.txt, Cargo.toml, go.mod), routing tables, and main entry points first.
   - Provide clear, structured, and developer-friendly explanations with Markdown.`;

    const contents: any[] = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'model') {
          contents.push({
            role: msg.role,
            parts: [{ text: msg.text || msg.content || '' }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: query }],
    });

    const traces: ToolTrace[] = [];
    let iterations = 0;
    const maxIterations = 12;

    while (iterations < maxIterations) {
      iterations++;
      console.log(`[Gemini Vertex AI] Turn ${iterations} generating content...`);

      const response: any = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: toolsDeclaration,
          temperature: 0.2,
        },
      });

      const candidate = response.candidates && response.candidates[0];
      if (!candidate || !candidate.content) {
        throw new Error('No candidate content returned from Gemini');
      }

      const modelParts = candidate.content.parts || [];
      const functionCalls = response.functionCalls || [];

      if (functionCalls && functionCalls.length > 0) {
        contents.push({
          role: 'model',
          parts: modelParts,
        });

        const responseParts: any[] = [];

        for (const call of functionCalls) {
          const callId = call.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          console.log(`[Gemini Vertex AI] Function call detected: ${call.name} (id: ${callId})`);

          const traceEntry: ToolTrace = {
            id: callId,
            tool: call.name,
            args: call.args,
            timestamp: new Date().toISOString(),
            status: 'running',
          };
          traces.push(traceEntry);

          onEvent({
            type: 'tool_start',
            callId,
            tool: call.name,
            args: call.args,
          });

          const startTime = Date.now();
          const toolResult = await mcpManager.callTool(call.name, call.args, workspace.path);
          const duration = Date.now() - startTime;

          traceEntry.status = toolResult.isError ? 'error' : 'success';
          traceEntry.duration = `${duration}ms`;
          traceEntry.outputPreview =
            toolResult.text.length > 300
              ? toolResult.text.slice(0, 300) + '... (truncated)'
              : toolResult.text;

          onEvent({
            type: 'tool_end',
            callId,
            tool: call.name,
            status: traceEntry.status,
            outputPreview: traceEntry.outputPreview,
            duration: traceEntry.duration,
          });

          let resultData: any;
          try {
            resultData = JSON.parse(toolResult.text);
          } catch {
            resultData = { output: toolResult.text };
          }

          const responsePart = createPartFromFunctionResponse(
            callId,
            call.name,
            resultData
          );
          responseParts.push(responsePart);
        }

        contents.push({
          role: 'user',
          parts: responseParts,
        });

        continue;
      }

      const answerText = response.text || '';
      onEvent({
        type: 'final_answer',
        text: answerText,
      });

      return {
        answer: answerText,
        traces,
        iterations,
      };
    }

    return {
      answer: 'Maximum analysis iterations reached. Please refine your question.',
      traces,
      iterations,
    };
  }
}
