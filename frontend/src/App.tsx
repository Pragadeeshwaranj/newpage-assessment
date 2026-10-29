import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CodebaseSidebar from './components/CodebaseSidebar';
import ChatView from './components/ChatView';
import IngestModal from './components/IngestModal';
import SettingsModal from './components/SettingsModal';
import FileViewerModal from './components/FileViewerModal';
import { Workspace, McpStatus, McpTool, ChatMessage, ToolTrace } from './types';

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTraces, setCurrentTraces] = useState<ToolTrace[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Modals
  const [isIngestOpen, setIsIngestOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  // Settings
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem('gemini_model') || 'gemini-2.5-flash'
  );

  // Load initial health, tools & existing workspaces
  useEffect(() => {
    const init = async () => {
      try {
        const healthRes = await fetch('/api/health');
        const healthData = await healthRes.json();
        setMcpStatus(healthData);

        const toolsRes = await fetch('/api/tools');
        const toolsData = await toolsRes.json();
        if (toolsData?.tools) setTools(toolsData.tools);

        const wsRes = await fetch('/api/workspaces');
        const wsData = await wsRes.json();
        if (wsData?.workspaces && wsData.workspaces.length > 0) {
          setWorkspaces(wsData.workspaces);
          setCurrentWorkspace(wsData.workspaces[0]);
        } else {
          setIsIngestOpen(true);
        }
      } catch (err) {
        console.error('Initial status load failed:', err);
      }
    };

    init();
  }, []);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem('gemini_api_key', newKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  const handleSelectModel = (newModel: string) => {
    setSelectedModel(newModel);
    localStorage.setItem('gemini_model', newModel);
  };

  const handleIngestSuccess = (workspace: Workspace) => {
    setWorkspaces((prev) => [workspace, ...prev]);
    setCurrentWorkspace(workspace);
    setMessages([]);
  };

  const handleSendMessage = async (query: string) => {
    if (!currentWorkspace || loading) return;

    const userMessage: ChatMessage = { role: 'user', text: query };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);
    setCurrentTraces([]);
    setStatusMessage('Analyzing codebase & dispatching MCP tools...');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey;
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          query,
          history: messages.slice(-6),
          model: selectedModel,
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported by server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalAnswer = '';
      const collectedTraces: ToolTrace[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent: string | null = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            const rawData = line.replace('data: ', '').trim();
            try {
              const data = JSON.parse(rawData);

              if (currentEvent === 'status') {
                setStatusMessage(data.message);
              } else if (currentEvent === 'tool_start') {
                setStatusMessage(`MCP executing: ${data.tool}...`);
                const existing = collectedTraces.find((t) => t.id === data.callId);
                if (!existing) {
                  collectedTraces.push({
                    id: data.callId,
                    tool: data.tool,
                    args: data.args,
                    status: 'running',
                  });
                  setCurrentTraces([...collectedTraces]);
                }
              } else if (currentEvent === 'tool_end') {
                const target = collectedTraces.find((t) => t.id === data.callId);
                if (target) {
                  target.status = data.status;
                  target.outputPreview = data.outputPreview;
                  target.duration = data.duration;
                } else {
                  collectedTraces.push({
                    id: data.callId,
                    tool: data.tool,
                    status: data.status,
                    outputPreview: data.outputPreview,
                    duration: data.duration,
                  });
                }
                setCurrentTraces([...collectedTraces]);
              } else if (currentEvent === 'final_answer') {
                finalAnswer = data.text;
              } else if (currentEvent === 'done') {
                finalAnswer = data.answer || finalAnswer;
              } else if (currentEvent === 'error') {
                throw new Error(data.message || 'Error occurred during streaming reasoning');
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE event data:', parseErr);
            }
          }
        }
      }

      setMessages([
        ...nextMessages,
        {
          role: 'model',
          text: finalAnswer || 'Analysis complete.',
          traces: collectedTraces,
        },
      ]);
    } catch (err: any) {
      console.error('Chat query error:', err);
      setMessages([
        ...nextMessages,
        {
          role: 'model',
          text: `⚠️ **Error during analysis**: ${err.message}`,
          traces: currentTraces,
        },
      ]);
    } finally {
      setLoading(false);
      setCurrentTraces([]);
      setStatusMessage('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Navbar
        mcpStatus={mcpStatus}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => {
          setCurrentWorkspace(ws);
          setMessages([]);
        }}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Codebase & MCP Tree */}
        <CodebaseSidebar
          workspace={currentWorkspace}
          onOpenFile={(filePath) => setViewingFile(filePath)}
          tools={tools}
        />

        {/* Right Chat & Reasoning Area */}
        <ChatView
          workspace={currentWorkspace}
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          currentTraces={currentTraces}
          statusMessage={statusMessage}
          onClearChat={() => setMessages([])}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
        />
      </div>

      {/* Ingest Modal */}
      <IngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onIngestSuccess={handleIngestSuccess}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
      />

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        workspaceId={currentWorkspace?.id}
        filePath={viewingFile}
      />
    </div>
  );
}
