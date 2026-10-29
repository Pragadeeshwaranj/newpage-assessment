import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Wrench
} from 'lucide-react';
import { Workspace, DirectoryEntry, McpTool } from '../types';

interface CodebaseSidebarProps {
  workspace: Workspace | null;
  onOpenFile: (path: string) => void;
  tools?: McpTool[];
}

export default function CodebaseSidebar({
  workspace,
  onOpenFile,
  tools = [],
}: CodebaseSidebarProps) {
  const [tree, setTree] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    if (!workspace) return;

    if (workspace.initialEntries && workspace.initialEntries.length > 0) {
      setTree(workspace.initialEntries);
    } else {
      fetchTree('.');
    }
  }, [workspace]);

  const fetchTree = async (subpath = '.') => {
    if (!workspace) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/${workspace.id}/tree?path=${encodeURIComponent(subpath)}`);
      const data = await res.json();
      if (data && data.entries) {
        setTree(data.entries);
      }
    } catch (err) {
      console.error('Failed to fetch tree:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!workspace) {
    return (
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-center items-center text-center">
        <Folder className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-xs font-medium text-slate-400">No codebase selected</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Ingest a GitHub repo or select a local path to begin.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-72 lg:w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col h-[calc(100vh-4rem)]">
      {/* Codebase Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Active Workspace
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
            {workspace.type === 'github' ? 'GitHub Repo' : 'Local Codebase'}
          </span>
        </div>
        <h2 className="text-sm font-bold text-slate-100 mt-1.5 truncate" title={workspace.name}>
          {workspace.name}
        </h2>
        <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5" title={workspace.path}>
          {workspace.path}
        </p>
      </div>

      {/* MCP Tools Section */}
      <div className="border-b border-slate-800">
        <button
          onClick={() => setToolsOpen(!toolsOpen)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/40 transition text-xs font-semibold text-slate-300"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-brand-400" />
            <span>MCP Tools ({tools.length})</span>
          </div>
          {toolsOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {toolsOpen && (
          <div className="px-4 pb-3 space-y-1.5">
            <p className="text-[11px] text-slate-400">
              Gemini analyzes your code by calling these MCP tools:
            </p>
            <div className="grid grid-cols-1 gap-1 pt-1">
              {tools.map((t) => (
                <div
                  key={t.name}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between group"
                >
                  <code className="text-brand-300 font-medium">{t.name}</code>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">
                    MCP tool
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Tree Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Files & Folders
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {tree.length} items
          </span>
        </div>

        <div className="space-y-0.5 font-mono text-xs">
          {tree.map((item, idx) => {
            const isDir = item.type === 'directory';
            return (
              <div
                key={idx}
                onClick={() => {
                  if (!isDir) onOpenFile(item.name);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition ${
                  isDir
                    ? 'text-slate-300 hover:bg-slate-800/40 cursor-default'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-brand-500/10 hover:border-brand-500/20 cursor-pointer'
                }`}
              >
                {isDir ? (
                  <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className="truncate">{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
