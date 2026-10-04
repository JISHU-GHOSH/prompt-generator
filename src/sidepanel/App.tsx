import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StudioTab } from './components/StudioTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { storageService, DEFAULT_SETTINGS } from '../services/storage';
import { compileMetaPrompt } from '../services/prompt-engine/compiler';
import { getAIClient } from '../services/ai/client-factory';
import { AppSettings, PromptHistoryItem, PresetType } from '../types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'library' | 'settings'>('studio');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  // Studio tab states
  const [rawInput, setRawInput] = useState('');
  const [preset, setPreset] = useState<PresetType>(DEFAULT_SETTINGS.defaultPreset);
  const [techStack, setTechStack] = useState<string[]>(DEFAULT_SETTINGS.defaultTechStack);
  const [additionalContext, setAdditionalContext] = useState('');
  const [outputPrompt, setOutputPrompt] = useState('');
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings and history on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const storedSettings = await storageService.getSettings();
        const storedHistory = await storageService.getHistory();
        if (isMounted) {
          setSettings(storedSettings);
          setPreset(storedSettings.defaultPreset);
          setTechStack(storedSettings.defaultTechStack || []);
          setHistory(storedHistory);
        }
      } catch (err) {
        console.error('Failed to load initial extension data', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasApiKey = useMemo(() => {
    switch (settings.provider) {
      case 'gemini':
        return Boolean(settings.apiKeyGemini && settings.apiKeyGemini.trim().length > 0);
      case 'openai':
        return Boolean(settings.apiKeyOpenAI && settings.apiKeyOpenAI.trim().length > 0);
      case 'anthropic':
        return Boolean(settings.apiKeyAnthropic && settings.apiKeyAnthropic.trim().length > 0);
      default:
        return false;
    }
  }, [settings]);

  const handleGenerate = async () => {
    const trimmedInput = rawInput.trim();
    if (!trimmedInput) {
      setError('Please enter a description or requirement to enhance.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const compiled = compileMetaPrompt({
        rawInput: trimmedInput,
        preset,
        techStack,
        additionalContext: additionalContext.trim() || undefined,
      });

      const client = getAIClient(settings);
      const enhanced = await client.generatePrompt(compiled.systemPrompt, compiled.userPrompt);

      setOutputPrompt(enhanced);

      // Save to history
      const savedItem = await storageService.addHistoryItem({
        rawInput: trimmedInput,
        enhancedPrompt: enhanced,
        preset,
        techStack,
        isFavorite: false,
      });

      setHistory((prev) => [savedItem, ...prev]);
      setCurrentHistoryId(savedItem.id);
    } catch (err: any) {
      console.error('Generation failed', err);
      setError(err?.message || 'Failed to generate prompt. Please verify your API key and network.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToTab = async () => {
    if (!outputPrompt) return;

    if (
      typeof chrome !== 'undefined' &&
      chrome.tabs &&
      typeof chrome.tabs.query === 'function' &&
      typeof chrome.tabs.sendMessage === 'function'
    ) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs && tabs[0];
        if (activeTab?.id !== undefined) {
          await chrome.tabs.sendMessage(activeTab.id, {
            type: 'INSERT_PROMPT',
            text: outputPrompt,
            prompt: outputPrompt,
            payload: { text: outputPrompt, prompt: outputPrompt },
          });
          return;
        }
      } catch (tabErr) {
        console.warn('Direct tab send message failed, falling back to background', tabErr);
      }
    }

    // Fallback via background message passing
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      typeof chrome.runtime.sendMessage === 'function'
    ) {
      const res = await chrome.runtime.sendMessage({
        type: 'INSERT_INTO_ACTIVE_TAB',
        prompt: outputPrompt,
        text: outputPrompt,
        payload: { prompt: outputPrompt, text: outputPrompt },
      });
      if (res && res.error) {
        throw new Error(res.error);
      }
    }
  };

  const handleLoadIntoStudio = (item: PromptHistoryItem) => {
    setRawInput(item.rawInput);
    setPreset(item.preset);
    setTechStack([...item.techStack]);
    setOutputPrompt(item.enhancedPrompt);
    setCurrentHistoryId(item.id);
    setError(null);
    setActiveTab('studio');
  };

  const handleToggleFavorite = async (id: string) => {
    await storageService.toggleFavorite(id);
    const updated = await storageService.getHistory();
    setHistory(updated);
  };

  const currentHistoryItem = useMemo(() => {
    if (currentHistoryId) {
      const match = history.find((h) => h.id === currentHistoryId);
      if (match) return match;
    }
    if (outputPrompt) {
      return history.find((h) => h.enhancedPrompt === outputPrompt) || null;
    }
    return null;
  }, [currentHistoryId, history, outputPrompt]);

  const handleSaveCurrentPrompt = async () => {
    if (!outputPrompt) return;
    if (currentHistoryItem) {
      await handleToggleFavorite(currentHistoryItem.id);
    } else {
      const newItem = await storageService.addHistoryItem({
        rawInput: rawInput.trim() || 'Custom Prompt',
        enhancedPrompt: outputPrompt,
        preset,
        techStack,
        isFavorite: true,
      });
      setHistory((prev) => [newItem, ...prev]);
      setCurrentHistoryId(newItem.id);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    await storageService.deleteHistoryItem(id);
    const updated = await storageService.getHistory();
    setHistory(updated);
  };

  const handleClearHistory = async () => {
    await storageService.clearHistory();
    setHistory([]);
  };

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    const saved = await storageService.saveSettings(updated);
    setSettings(saved);
    if (updated.defaultPreset && !rawInput) {
      setPreset(saved.defaultPreset);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeProvider={settings.provider}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 p-3 overflow-y-auto">
        {activeTab === 'studio' && (
          <StudioTab
            rawInput={rawInput}
            setRawInput={setRawInput}
            preset={preset}
            setPreset={setPreset}
            techStack={techStack}
            setTechStack={setTechStack}
            additionalContext={additionalContext}
            setAdditionalContext={setAdditionalContext}
            outputPrompt={outputPrompt}
            setOutputPrompt={setOutputPrompt}
            isGenerating={isGenerating}
            error={error}
            setError={setError}
            onGenerate={handleGenerate}
            onSendToTab={handleSendToTab}
            onNavigateToSettings={() => setActiveTab('settings')}
            hasApiKey={hasApiKey}
            activeProvider={settings.provider}
            onSave={handleSaveCurrentPrompt}
            isSaved={Boolean(currentHistoryItem?.isFavorite)}
          />
        )}

        {activeTab === 'library' && (
          <LibraryTab
            history={history}
            onLoadIntoStudio={handleLoadIntoStudio}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>
    </div>
  );
};

export default App;
