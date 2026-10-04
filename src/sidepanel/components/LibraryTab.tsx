import React, { useState } from 'react';
import {
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  ArrowUpRight,
  Sparkles,
  Bot,
  FileText,
  Bug,
  Sliders,
  Layers,
} from 'lucide-react';
import { PromptHistoryItem, PresetType } from '../../types';

export interface LibraryTabProps {
  history: PromptHistoryItem[];
  onLoadIntoStudio: (item: PromptHistoryItem) => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  history,
  onLoadIntoStudio,
  onToggleFavorite,
  onDelete,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPreset, setFilterPreset] = useState<PresetType | 'all' | 'favorites'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHistory = history.filter((item) => {
    // Preset / Favorites filter
    if (filterPreset === 'favorites' && !item.isFavorite) {
      return false;
    }
    if (filterPreset !== 'all' && filterPreset !== 'favorites' && item.preset !== filterPreset) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRaw = item.rawInput.toLowerCase().includes(q);
      const matchEnhanced = item.enhancedPrompt.toLowerCase().includes(q);
      const matchPreset = item.preset.toLowerCase().includes(q);
      const matchTech = item.techStack.some((t) => t.toLowerCase().includes(q));
      return matchRaw || matchEnhanced || matchPreset || matchTech;
    }

    return true;
  });

  const handleCopy = async (id: string, text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt', err);
    }
  };

  const getPresetBadge = (preset: PresetType) => {
    switch (preset) {
      case 'coding-agent':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Bot className="w-2.5 h-2.5" />
            <span>Coding Agent</span>
          </span>
        );
      case 'rfc-spec':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-2.5 h-2.5" />
            <span>RFC Spec</span>
          </span>
        );
      case 'bugfix':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bug className="w-2.5 h-2.5" />
            <span>Bug Fix</span>
          </span>
        );
      case 'cursorrules':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sliders className="w-2.5 h-2.5" />
            <span>Cursor Rules</span>
          </span>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search saved prompts & history..."
          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      {/* Filter Tabs & Clear All */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-[80%]">
          <button
            onClick={() => setFilterPreset('all')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              filterPreset === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilterPreset('favorites')}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              filterPreset === 'favorites'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Favorites</span>
          </button>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearAll}
            aria-label="Clear all history"
            className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="space-y-2.5">
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all group"
          >
            {/* Top metadata */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getPresetBadge(item.preset)}
                <span className="text-[10px] text-slate-500">{formatDate(item.timestamp)}</span>
              </div>

              <div className="flex items-center space-x-1">
                {/* Favorite button */}
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  title={item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                  aria-label={item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                  className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      item.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                    }`}
                  />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => onDelete(item.id)}
                  title="Delete item"
                  aria-label="Delete prompt"
                  className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors opacity-70 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Prompt Preview */}
            <div className="text-xs text-slate-200 font-medium mb-1 line-clamp-2 leading-relaxed">
              {item.rawInput}
            </div>

            {/* Tech Stack Pills */}
            {item.techStack && item.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5">
                {item.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                onClick={() => handleCopy(item.id, item.enhancedPrompt)}
                title="Copy prompt"
                aria-label="Copy prompt to clipboard"
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Enhanced</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onLoadIntoStudio(item)}
                title="Load into Studio"
                aria-label="Load into Studio"
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium transition-colors"
              >
                <span>Load into Studio</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty States */}
        {filteredHistory.length === 0 && (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
            <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <div className="text-xs font-semibold text-slate-300 mb-1">
              {searchQuery ? 'No matching prompts found' : 'No saved prompts yet'}
            </div>
            <div className="text-[11px] text-slate-500 max-w-xs mx-auto">
              {searchQuery
                ? `No prompt items matched "${searchQuery}". Try a different keyword.`
                : 'Generated prompts will automatically be saved here so you can reuse them anytime.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
