import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService, DEFAULT_SETTINGS } from '../src/services/storage';

describe('Storage Service', () => {
  let mockStore: Record<string, any> = {};

  beforeEach(() => {
    mockStore = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (typeof keys === 'string') return { [keys]: mockStore[keys] };
            if (Array.isArray(keys)) {
              return keys.reduce((acc, k) => ({ ...acc, [k]: mockStore[k] }), {});
            }
            return mockStore;
          }),
          set: vi.fn(async (items) => {
            Object.assign(mockStore, items);
          }),
        },
      },
    };
  });

  it('should return default settings when storage is empty', async () => {
    const settings = await storageService.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should save and update settings', async () => {
    await storageService.saveSettings({ apiKeyGemini: 'test-key-123' });
    const settings = await storageService.getSettings();
    expect(settings.apiKeyGemini).toBe('test-key-123');
    expect(settings.provider).toBe(DEFAULT_SETTINGS.provider);
  });

  it('should add and manage history items', async () => {
    const item = await storageService.addHistoryItem({
      rawInput: 'make a todo app',
      enhancedPrompt: '# Todo App Spec',
      preset: 'coding-agent',
      techStack: ['React', 'TypeScript'],
      isFavorite: false,
    });
    expect(item.id).toBeDefined();
    expect(item.timestamp).toBeGreaterThan(0);
    const history = await storageService.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].rawInput).toBe('make a todo app');
  });

  it('should toggle favorite status of a history item', async () => {
    const item = await storageService.addHistoryItem({
      rawInput: 'fix memory leak',
      enhancedPrompt: '# Fix Spec',
      preset: 'bugfix',
      techStack: ['Node.js'],
      isFavorite: false,
    });
    expect(item.isFavorite).toBe(false);

    await storageService.toggleFavorite(item.id);
    let history = await storageService.getHistory();
    expect(history[0].isFavorite).toBe(true);

    await storageService.toggleFavorite(item.id);
    history = await storageService.getHistory();
    expect(history[0].isFavorite).toBe(false);
  });

  it('should delete a history item by id', async () => {
    const item1 = await storageService.addHistoryItem({
      rawInput: 'prompt 1',
      enhancedPrompt: 'enhanced 1',
      preset: 'coding-agent',
      techStack: [],
      isFavorite: false,
    });
    const item2 = await storageService.addHistoryItem({
      rawInput: 'prompt 2',
      enhancedPrompt: 'enhanced 2',
      preset: 'rfc-spec',
      techStack: [],
      isFavorite: false,
    });

    let history = await storageService.getHistory();
    expect(history.length).toBe(2);

    await storageService.deleteHistoryItem(item1.id);
    history = await storageService.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(item2.id);
  });

  it('should clear all history', async () => {
    await storageService.addHistoryItem({
      rawInput: 'prompt to clear',
      enhancedPrompt: 'enhanced prompt',
      preset: 'cursorrules',
      techStack: [],
      isFavorite: false,
    });
    expect((await storageService.getHistory()).length).toBe(1);

    await storageService.clearHistory();
    expect((await storageService.getHistory()).length).toBe(0);
  });

  it('should cap history to a maximum of 100 items', async () => {
    for (let i = 0; i < 105; i++) {
      await storageService.addHistoryItem({
        rawInput: `prompt ${i}`,
        enhancedPrompt: `enhanced ${i}`,
        preset: 'coding-agent',
        techStack: [],
        isFavorite: false,
      });
    }
    const history = await storageService.getHistory();
    expect(history.length).toBe(100);
    // Most recent item should be at the top (index 0)
    expect(history[0].rawInput).toBe('prompt 104');
  });

  it('should fallback to in-memory store when chrome.storage is not available', async () => {
    delete (globalThis as any).chrome;
    await storageService.clearHistory();
    const settings = await storageService.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);

    const saved = await storageService.saveSettings({ apiKeyOpenAI: 'sk-test' });
    expect(saved.apiKeyOpenAI).toBe('sk-test');
    expect((await storageService.getSettings()).apiKeyOpenAI).toBe('sk-test');

    const item = await storageService.addHistoryItem({
      rawInput: 'fallback prompt',
      enhancedPrompt: 'fallback enhanced',
      preset: 'coding-agent',
      techStack: [],
      isFavorite: false,
    });
    expect((await storageService.getHistory()).length).toBe(1);
    await storageService.deleteHistoryItem(item.id);
    expect((await storageService.getHistory()).length).toBe(0);
  });

  it('should defensively copy defaultTechStack so mutations do not affect DEFAULT_SETTINGS', async () => {
    const originalLength = DEFAULT_SETTINGS.defaultTechStack.length;
    const settings = await storageService.getSettings();
    settings.defaultTechStack.push('NewFramework');

    expect(DEFAULT_SETTINGS.defaultTechStack.length).toBe(originalLength);
    expect(DEFAULT_SETTINGS.defaultTechStack).not.toContain('NewFramework');

    const freshSettings = await storageService.getSettings();
    expect(freshSettings.defaultTechStack).not.toContain('NewFramework');
  });

  it('should function properly when storageService methods are destructured', async () => {
    const { getSettings, saveSettings, getHistory, addHistoryItem, toggleFavorite, deleteHistoryItem, clearHistory } =
      storageService;

    const settings = await getSettings();
    expect(settings.provider).toBe('gemini');

    const updated = await saveSettings({ temperature: 0.8 });
    expect(updated.temperature).toBe(0.8);

    const item = await addHistoryItem({
      rawInput: 'destructured prompt',
      enhancedPrompt: 'enhanced',
      preset: 'coding-agent',
      techStack: [],
      isFavorite: false,
    });
    expect(item.id).toBeDefined();

    let hist = await getHistory();
    expect(hist.length).toBe(1);

    await toggleFavorite(item.id);
    hist = await getHistory();
    expect(hist[0].isFavorite).toBe(true);

    await deleteHistoryItem(item.id);
    hist = await getHistory();
    expect(hist.length).toBe(0);

    await clearHistory();
  });
});
