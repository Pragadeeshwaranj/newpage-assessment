import React, { useState } from 'react';
import { 
  X, 
  GitFork, 
  Folder, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Workspace } from '../types';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (workspace: Workspace) => void;
}

export default function IngestModal({ isOpen, onClose, onIngestSuccess }: IngestModalProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'github'>('local');
  const [target, setTarget] = useState('C:\\Projects\\Google Appscript\\POC\\newpage-assesment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleIngest = async (overrideTarget: string | null = null, overrideType: 'local' | 'github' | null = null) => {
    const finalTarget = overrideTarget || target;
    const finalType = overrideType || activeTab;

    if (!finalTarget.trim()) {
      setError('Please provide a valid directory path or GitHub URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: finalType, target: finalTarget }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to ingest codebase');
      }

      onIngestSuccess(data.workspace);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg border border-brand-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Ingest Codebase</h3>
              <p className="text-xs text-slate-400">
                Connect a local folder or clone a remote GitHub repository
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-6 bg-slate-950/40">
          <button
            onClick={() => {
              setActiveTab('local');
              setTarget('C:\\Projects\\Google Appscript\\POC\\newpage-assesment');
              setError(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'local'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            Local Directory
          </button>
          <button
            onClick={() => {
              setActiveTab('github');
              setTarget('https://github.com/expressjs/express');
              setError(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'github'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-4 h-4" />
            GitHub Repository
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {activeTab === 'local' ? 'Local Absolute Path' : 'GitHub Repository URL'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={
                  activeTab === 'local'
                    ? 'e.g. C:\\Projects\\my-codebase or /Users/name/repo'
                    : 'e.g. https://github.com/owner/repo'
                }
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-700 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Quick Suggestions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('local');
                  setTarget('C:\\Projects\\Google Appscript\\POC\\newpage-assesment');
                }}
                className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 transition group text-xs"
              >
                <div className="font-medium text-slate-200 group-hover:text-brand-300">
                  Current Assessment Repo
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  C:\Projects\Google Appscript\POC\newpage-assesment
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('local');
                  setTarget('C:\\Projects\\Google Appscript\\POC\\newpage-assesment\\tools');
                }}
                className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 transition group text-xs"
              >
                <div className="font-medium text-slate-200 group-hover:text-brand-300">
                  Tools Server Workspace
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  ...\newpage-assesment\tools
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-brand-500/5 border border-brand-500/15 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
            <span>
              Ingestion registers the directory and connects the MCP analysis tools (
              <code className="text-brand-300 text-[10px]">grep_search</code>,{' '}
              <code className="text-brand-300 text-[10px]">read_file</code>,{' '}
              <code className="text-brand-300 text-[10px]">glob_search</code>).
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleIngest()}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{activeTab === 'github' ? 'Cloning Repo...' : 'Inspecting Folder...'}</span>
              </>
            ) : (
              <>
                <span>Ingest Codebase</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
