import React from 'react';
import { 
  Code2, 
  Settings2, 
  Plus, 
  Server, 
  AlertCircle, 
  FolderGit2
} from 'lucide-react';
import { Workspace, McpStatus } from '../types';

interface NavbarProps {
  mcpStatus: McpStatus | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onOpenIngest: () => void;
  onOpenSettings: () => void;
}

export default function Navbar({
  mcpStatus,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onOpenIngest,
  onOpenSettings,
}: NavbarProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 md:px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Code2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">Codebase Q&A</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
              Gemini + MCP
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Autonomous codebase interrogation powered by Model Context Protocol
          </p>
        </div>
      </div>

      {/* Middle: Active Codebase Selector */}
      <div className="flex items-center gap-2">
        {workspaces.length > 0 ? (
          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-1">
            <FolderGit2 className="w-4 h-4 text-brand-400 ml-2" />
            <select
              value={currentWorkspace ? currentWorkspace.id : ''}
              onChange={(e) => {
                const found = workspaces.find((w) => w.id === e.target.value);
                if (found) onSelectWorkspace(found);
              }}
              className="bg-transparent text-xs font-medium text-slate-200 px-2 py-1 outline-none cursor-pointer max-w-[200px] truncate"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-slate-200">
                  {w.name} ({w.type})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          onClick={onOpenIngest}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest Codebase</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* MCP Server Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">MCP Tools:</span>
          {mcpStatus?.mcpConnected ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {mcpStatus.toolsCount} Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Connecting...
            </span>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 transition"
          title="Configure Model & API Preferences"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
}
