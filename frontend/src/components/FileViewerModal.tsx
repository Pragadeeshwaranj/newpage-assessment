import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, Copy, Check } from 'lucide-react';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  filePath: string | null;
}

export default function FileViewerModal({
  isOpen,
  onClose,
  workspaceId,
  filePath,
}: FileViewerModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !workspaceId || !filePath) return;

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath, maxLines: 500 }),
        });
        const data = await res.json();
        if (data.isError) {
          setError(data.content);
        } else {
          setContent(data.content);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [isOpen, workspaceId, filePath]);

  if (!isOpen || !filePath) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-mono text-xs font-semibold text-slate-200 truncate">{filePath}</h3>
              <p className="text-[10px] text-slate-500">Inspected via MCP read_file tool</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs leading-relaxed text-slate-200">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
              <span>Fetching file content using MCP read_file...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 p-4 border border-rose-500/20 rounded-xl bg-rose-500/10">
              {error}
            </div>
          ) : (
            <pre className="whitespace-pre overflow-x-auto">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
