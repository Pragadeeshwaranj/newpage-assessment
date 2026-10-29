import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Wrench, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { ToolTrace } from '../types';

interface ToolTraceViewerProps {
  traces?: ToolTrace[];
}

export default function ToolTraceViewer({ traces = [] }: ToolTraceViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [openTraceId, setOpenTraceId] = useState<string | number | null>(null);

  if (!traces || traces.length === 0) return null;

  const runningCount = traces.filter((t) => t.status === 'running').length;
  const successCount = traces.filter((t) => t.status === 'success').length;

  return (
    <div className="my-2.5 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition bg-slate-950/40"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-brand-500/10 text-brand-400">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-200">
            MCP Analysis Traces ({traces.length})
          </span>
          {runningCount > 0 ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running tool...
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              {successCount} tool calls executed
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="p-3 space-y-2 border-t border-slate-800/80 bg-slate-950/20">
          {traces.map((trace, idx) => {
            const isOpen = openTraceId === trace.id || (openTraceId === null && idx === traces.length - 1);
            return (
              <div
                key={trace.id || idx}
                className="rounded-lg border border-slate-800/90 bg-slate-900/70 overflow-hidden"
              >
                <div
                  onClick={() => setOpenTraceId(isOpen ? -1 : trace.id)}
                  className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2 font-mono text-[11px] truncate">
                    {trace.status === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    ) : trace.status === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-brand-300 font-semibold">{trace.tool}</span>
                    <span className="text-slate-500 truncate max-w-xs sm:max-w-md">
                      {JSON.stringify(trace.args)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {trace.duration && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {trace.duration}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="p-2.5 border-t border-slate-800 bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                    <div className="text-[10px] text-slate-500 mb-1">Arguments:</div>
                    <pre className="text-indigo-300 mb-2">{JSON.stringify(trace.args, null, 2)}</pre>
                    {trace.outputPreview && (
                      <>
                        <div className="text-[10px] text-slate-500 mb-1">MCP Tool Output:</div>
                        <pre className="whitespace-pre-wrap text-slate-300">{trace.outputPreview}</pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
