import { AppSettings, PromptHistoryItem } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKeyGemini: '',
  apiKeyOpenAI: '',
  apiKeyAnthropic: '',
  modelGemini: 'gemini-1.5-flash',
  modelOpenAI: 'gpt-4o-mini',
  modelAnthropic: 'claude-3-5-sonnet-20241022',
  temperature: 0.4,
  defaultPreset: 'coding-agent',
  defaultTechStack: ['React', 'TypeScript', 'Tailwind CSS'],
};

export const MAX_HISTORY_ITEMS = 100;

const STORAGE_KEYS = {
  SETTINGS: 'promptforge_settings',
  HISTORY: 'promptforge_history',
} as const;

let inMemoryStore: Record<string, unknown> = {};

function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.local !== 'undefined'
  );
}

async function getStorageItem<T>(key: string): Promise<T | undefined> {
  if (isChromeStorageAvailable()) {
    try {
      const result = await chrome.storage.local.get(key);
      return result ? (result[key] as T) : undefined;
    } catch {
      return inMemoryStore[key] as T;
    }
  }
  return inMemoryStore[key] as T;
}

async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (isChromeStorageAvailable()) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return;
    } catch {
      inMemoryStore[key] = value;
      return;
    }
  }
  inMemoryStore[key] = value;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface StorageServiceInterface {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  getHistory(): Promise<PromptHistoryItem[]>;
  addHistoryItem(item: Omit<PromptHistoryItem, 'id' | 'timestamp'>): Promise<PromptHistoryItem>;
  toggleFavorite(id: string): Promise<void>;
  deleteHistoryItem(id: string): Promise<void>;
  clearHistory(): Promise<void>;
}

export const storageService: StorageServiceInterface = {
  getSettings: async (): Promise<AppSettings> => {
    const stored = await getStorageItem<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS);
    if (!stored) {
      return {
        ...DEFAULT_SETTINGS,
        defaultTechStack: [...DEFAULT_SETTINGS.defaultTechStack],
      };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      defaultTechStack: stored.defaultTechStack
        ? [...stored.defaultTechStack]
        : [...DEFAULT_SETTINGS.defaultTechStack],
    };
  },

  saveSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const current = await storageService.getSettings();
    const updated: AppSettings = {
      ...current,
      ...settings,
      defaultTechStack: settings.defaultTechStack
        ? [...settings.defaultTechStack]
        : current.defaultTechStack
        ? [...current.defaultTechStack]
        : [...DEFAULT_SETTINGS.defaultTechStack],
    };
    await setStorageItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  getHistory: async (): Promise<PromptHistoryItem[]> => {
    const stored = await getStorageItem<PromptHistoryItem[]>(STORAGE_KEYS.HISTORY);
    return Array.isArray(stored) ? stored : [];
  },

  addHistoryItem: async (
    item: Omit<PromptHistoryItem, 'id' | 'timestamp'>
  ): Promise<PromptHistoryItem> => {
    const newItem: PromptHistoryItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
    };

    const currentHistory = await storageService.getHistory();
    const updatedHistory = [newItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
    await setStorageItem(STORAGE_KEYS.HISTORY, updatedHistory);
    return newItem;
  },

  toggleFavorite: async (id: string): Promise<void> => {
    const currentHistory = await storageService.getHistory();
    const updatedHistory = currentHistory.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    await setStorageItem(STORAGE_KEYS.HISTORY, updatedHistory);
  },

  deleteHistoryItem: async (id: string): Promise<void> => {
    const currentHistory = await storageService.getHistory();
    const updatedHistory = currentHistory.filter((item) => item.id !== id);
    await setStorageItem(STORAGE_KEYS.HISTORY, updatedHistory);
  },

  clearHistory: async (): Promise<void> => {
    await setStorageItem(STORAGE_KEYS.HISTORY, []);
  },
};
