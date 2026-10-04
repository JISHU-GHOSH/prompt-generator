import React from 'react';
import { Sparkles, Wand2, Layers, Settings as SettingsIcon } from 'lucide-react';
import { ProviderType } from '../../types';

export interface HeaderProps {
  activeTab: 'studio' | 'library' | 'settings';
  onTabChange: (tab: 'studio' | 'library' | 'settings') => void;
  activeProvider: ProviderType;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  activeProvider,
  hasApiKey,
}) => {
  const providerNames: Record<ProviderType, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    anthropic: 'Claude',
    groq: 'Groq',
    auto: 'Auto',
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-3 pt-3 pb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-white">PromptForge AI</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Active Provider Pill */}
        <button
          onClick={() => onTabChange('settings')}
          title={hasApiKey ? `${providerNames[activeProvider]} ready` : `${providerNames[activeProvider]} API key missing`}
          className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasApiKey ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
            }`}
          />
          <span className="font-medium text-slate-300">{providerNames[activeProvider]}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex space-x-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
        <button
          onClick={() => onTabChange('studio')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            activeTab === 'studio'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Studio</span>
        </button>

        <button
          onClick={() => onTabChange('library')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            activeTab === 'library'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Library</span>
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </nav>
    </header>
  );
};
