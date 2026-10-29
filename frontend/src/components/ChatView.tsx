import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Trash2, 
  Copy, 
  Check, 
  FileCode2,
  GitPullRequest,
  ShieldCheck,
  Workflow
} from 'lucide-react';
import ToolTraceViewer from './ToolTraceViewer';
import { Workspace, ChatMessage, ToolTrace } from '../types';

const STARTER_PROMPTS = [
  {
    icon: Workflow,
    title: 'Architecture & Overview',
    prompt: 'Provide a high-level overview of how this codebase works, its architecture, and main components.',
  },
  {
    icon: FileCode2,
    title: 'API Endpoints & Routes',
    prompt: 'Where are API endpoints and routing implemented? List all endpoints with their methods and parameters.',
  },
  {
    icon: GitPullRequest,
    title: 'Dependencies & Tooling',
    prompt: 'What dependencies does this project use, and what is the role of each major dependency?',
  },
  {
    icon: ShieldCheck,
    title: 'Where functionality is implemented',
    prompt: 'Find where the primary business logic or core services are implemented and explain how they operate.',
  },
];

interface ChatViewProps {
  workspace: Workspace | null;
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  loading: boolean;
  currentTraces?: ToolTrace[];
  statusMessage?: string;
  onClearChat: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export default function ChatView({
  workspace,
  messages,
  onSendMessage,
  loading,
  currentTraces = [],
  statusMessage = '',
  onClearChat,
  selectedModel,
  onSelectModel,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTraces, statusMessage]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !workspace) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-950">
      {/* Top chat subheader */}
      <div className="px-6 py-2.5 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-slate-200">
            {workspace ? `Inspecting ${workspace.name}` : 'Codebase Assistant'}
          </span>
          <span className="text-[10px] text-slate-400 border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 rounded-md font-mono">
            {selectedModel}
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear conversation</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State & Starter Prompts */
          <div className="max-w-2xl mx-auto py-8 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600/30 to-indigo-600/30 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-xl shadow-brand-500/10">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Ask anything about {workspace ? workspace.name : 'your codebase'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 max-w-lg mx-auto">
                Powered by Gemini GenAI SDK and connected to Python MCP tools for live file search, recursive grep, and text extraction.
              </p>
            </div>

            {/* Starter Suggestion Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              {STARTER_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!workspace) return;
                      onSendMessage(item.prompt);
                    }}
                    disabled={!workspace || loading}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-brand-500/40 transition group disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs mb-1">
                      <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Message List */
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-3.5 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl px-5 py-3.5 text-xs sm:text-sm max-w-[85%] ${
                    isUser
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/15'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                  }`}
                >
                  {/* Assistant MCP Traces */}
                  {!isUser && msg.traces && msg.traces.length > 0 && (
                    <ToolTraceViewer traces={msg.traces} />
                  )}

                  {/* Message Body */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}

                  {/* Copy button for model responses */}
                  {!isUser && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-800/60 text-slate-400">
                      <button
                        onClick={() => copyToClipboard(msg.text, index)}
                        className="p-1 hover:text-slate-200 transition text-[11px] flex items-center gap-1"
                        title="Copy answer"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Loading / Tool Traces indicator */}
        {loading && (
          <div className="flex gap-3.5 max-w-4xl mx-auto justify-start animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3.5 text-xs text-slate-300 max-w-[85%] space-y-2">
              <div className="flex items-center gap-2 text-brand-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{statusMessage || 'Gemini reasoning with MCP tools...'}</span>
              </div>

              {currentTraces && currentTraces.length > 0 && (
                <ToolTraceViewer traces={currentTraces} />
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/70 backdrop-blur">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-slate-700/80 bg-slate-950 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition shadow-lg">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                workspace
                  ? `Ask how ${workspace.name} works, where endpoints are, dependencies, etc. (Press Enter to send)`
                  : 'Please ingest or select a codebase first...'
              }
              disabled={!workspace || loading}
              className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none resize-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 rounded-b-2xl">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Shift + Enter for new line</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!input.trim() || !workspace || loading}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Ask Codebase</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
