import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  FileText,
  Bug,
  Sliders,
  Plus,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { PresetType, ProviderType } from '../../types';
import { PRESET_LIST } from '../../services/prompt-engine/presets';
import { OutputViewer } from './OutputViewer';

export interface StudioTabProps {
  rawInput: string;
  setRawInput: (val: string) => void;
  preset: PresetType;
  setPreset: (val: PresetType) => void;
  techStack: string[];
  setTechStack: (val: string[]) => void;
  additionalContext: string;
  setAdditionalContext: (val: string) => void;
  outputPrompt: string;
  setOutputPrompt: (val: string) => void;
  activeModel?: string;
  isGenerating: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  onGenerate: () => Promise<void>;
  onSendToTab: () => Promise<boolean | void> | void;
  onNavigateToSettings: () => void;
  hasApiKey: boolean;
  activeProvider: ProviderType;
  onSave?: () => Promise<void> | void;
  isSaved?: boolean;
}

const COMMON_TECH_SUGGESTIONS = [
  'React',
  'TypeScript',
  'Tailwind CSS',
  'Next.js',
  'FastAPI',
  'Node.js',
  'PostgreSQL',
  'Docker',
  'Zustand',
  'Python',
];

export const StudioTab: React.FC<StudioTabProps> = ({
  rawInput,
  setRawInput,
  preset,
  setPreset,
  techStack,
  setTechStack,
  additionalContext,
  setAdditionalContext,
  outputPrompt,
  activeModel,
  isGenerating,
  error,
  setError,
  onGenerate,
  onSendToTab,
  onNavigateToSettings,
  hasApiKey,
  activeProvider,
  onSave,
  isSaved = false,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getPresetIcon = (id: PresetType) => {
    switch (id) {
      case 'coding-agent':
        return <Bot className="w-3.5 h-3.5" />;
      case 'rfc-spec':
        return <FileText className="w-3.5 h-3.5" />;
      case 'bugfix':
        return <Bug className="w-3.5 h-3.5" />;
      case 'cursorrules':
        return <Sliders className="w-3.5 h-3.5" />;
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd ?? newTagInput).trim();
    if (!tag) return;
    if (!techStack.includes(tag)) {
      setTechStack([...techStack, tag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTechStack(techStack.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Missing API Key Alert */}
      {!hasApiKey && activeProvider !== 'auto' && (
        <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">Missing API Key:</span> Configure your{' '}
            <span className="capitalize font-medium">{activeProvider}</span> API key to enable prompt generation.
          </div>
          <button
            onClick={onNavigateToSettings}
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-[11px] whitespace-nowrap transition-colors"
          >
            Configure
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-start justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="text-rose-400 hover:text-rose-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preset Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Preset Persona
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_LIST.map((item) => {
            const isSelected = preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                className={`flex items-start p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/10 text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-1.5 rounded-md mr-2 mt-0.5 ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {getPresetIcon(item.id)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-tight truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Raw Input Prompt */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Raw Thought / Requirement
          </label>
          {rawInput && (
            <button
              onClick={() => setRawInput('')}
              aria-label="Clear raw input"
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
        <div className="relative">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Describe what you want to build or fix in plain English..."
            rows={4}
            className="w-full rounded-lg bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y leading-relaxed"
          />
        </div>
      </div>

      {/* Tech Stack Pills */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Target Tech Stack
        </label>
        
        {/* Active Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
          {techStack.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/90 text-indigo-300 border border-indigo-500/20 shadow-sm"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove ${tag}`}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {techStack.length === 0 && (
            <span className="text-[11px] text-slate-500 italic py-1">No tech stack specified</span>
          )}
        </div>

        {/* Add Tag Input */}
        <div className="flex space-x-1.5 mb-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleKeyDownTag}
            placeholder="Add tech (e.g. Next.js)..."
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleAddTag()}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Suggested Quick Tags */}
        <div className="flex flex-wrap gap-1">
          {COMMON_TECH_SUGGESTIONS.map((tag) => {
            const isAdded = techStack.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                disabled={isAdded}
                onClick={() => handleAddTag(tag)}
                className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                  isAdded
                    ? 'opacity-40 bg-slate-800 text-slate-500 cursor-default'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/40'
                }`}
              >
                + {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Context Accordion */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>Additional Project Context (Optional)</span>
          {showAdvanced ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-2.5 pt-0 border-t border-slate-800">
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Existing conventions, folder structure, database constraints, auth patterns..."
              rows={3}
              className="w-full rounded-md bg-slate-950/80 border border-slate-800 p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        type="button"
        disabled={isGenerating || !rawInput.trim()}
        onClick={onGenerate}
        className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
          isGenerating || !rawInput.trim()
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 active:scale-[0.99]'
        }`}
      >
        <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
        <span>{isGenerating ? 'Promptifying...' : 'Promptify (Enhance Prompt)'}</span>
      </button>

      {/* Generated Output Viewer */}
      {outputPrompt && (
        <div className="pt-2">
          <OutputViewer
            prompt={outputPrompt}
            activeModel={activeModel}
            isStreaming={isGenerating}
            onSendToTab={onSendToTab}
            onSave={onSave}
            isSaved={isSaved}
          />
        </div>
      )}
    </div>
  );
};
