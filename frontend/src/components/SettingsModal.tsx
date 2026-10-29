import React, { useState, useEffect } from 'react';
import { X, Check, Key, Sliders, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  selectedModel,
  onSelectModel,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [model, setModel] = useState(selectedModel || 'gemini-2.5-flash');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputKey(apiKey || '');
  }, [apiKey]);

  useEffect(() => {
    setModel(selectedModel || 'gemini-2.5-flash');
  }, [selectedModel]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onSelectModel(model);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg border border-brand-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Model & Settings</h3>
              <p className="text-xs text-slate-400">Configure AI model and optional API credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Optional Gemini API Key */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-brand-400" />
                Gemini API Key (Option 1)
              </span>
              <span className="text-[10px] text-slate-500">Optional</span>
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Leave empty to use server environment default"
              className="w-full bg-slate-950 border border-slate-700 focus:border-brand-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              If provided, this API key is used as the first option. If left empty, the server uses its environment configuration.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Gemini Model
            </label>
            <div className="space-y-2">
              {[
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Recommended', desc: 'Fastest reasoning & high tool execution accuracy' },
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Fast', desc: 'Lightweight model with quick responses' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'Deep Reasoning', desc: 'Highest reasoning depth for complex architectures' },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition ${
                    model === m.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="model"
                      checked={model === m.id}
                      onChange={() => setModel(m.id)}
                      className="mt-1 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{m.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
