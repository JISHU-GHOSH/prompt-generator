import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleBackgroundMessage,
  setupSidePanelBehavior,
  setupActionClickListener,
  setupRuntimeMessageListener,
} from '../src/background/service-worker';
import { storageService, DEFAULT_SETTINGS } from '../src/services/storage';
import * as clientFactory from '../src/services/ai/client-factory';

describe('Background Service Worker Message Handler', () => {
  let mockStore: Record<string, any> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
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
      sidePanel: {
        setPanelBehavior: vi.fn().mockResolvedValue(undefined),
        open: vi.fn().mockResolvedValue(undefined),
      },
      action: {
        onClicked: {
          addListener: vi.fn(),
        },
      },
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 101, url: 'https://chatgpt.com' }]),
        sendMessage: vi.fn().mockResolvedValue({ received: true }),
      },
      runtime: {
        onMessage: {
          addListener: vi.fn(),
        },
      },
    };
  });

  describe('Validation & Unknown Messages', () => {
    it('should reject unknown message types', async () => {
      const response = await handleBackgroundMessage({ type: 'UNKNOWN_ACTION' } as any);
      expect(response.error).toBeDefined();
      expect(response.success).toBe(false);
    });

    it('should handle undefined or null message safely', async () => {
      const response = await handleBackgroundMessage(undefined as any);
      expect(response.error).toBeDefined();
      expect(response.success).toBe(false);
    });

    it('should handle message without type property', async () => {
      const response = await handleBackgroundMessage({} as any);
      expect(response.error).toBeDefined();
      expect(response.success).toBe(false);
    });
  });

  describe('Settings Messages', () => {
    it('should handle GET_SETTINGS and return current settings', async () => {
      await storageService.saveSettings({ apiKeyGemini: 'secret-gemini-key' });
      const response = await handleBackgroundMessage({ type: 'GET_SETTINGS' });
      expect(response.apiKeyGemini).toBe('secret-gemini-key');
      expect(response.provider).toBe(DEFAULT_SETTINGS.provider);
    });

    it('should handle SAVE_SETTINGS with payload and return updated settings', async () => {
      const response = await handleBackgroundMessage({
        type: 'SAVE_SETTINGS',
        payload: {
          provider: 'openai',
          apiKeyOpenAI: 'sk-test-key-123',
        },
      });
      expect(response.provider).toBe('openai');
      expect(response.apiKeyOpenAI).toBe('sk-test-key-123');

      const stored = await storageService.getSettings();
      expect(stored.provider).toBe('openai');
      expect(stored.apiKeyOpenAI).toBe('sk-test-key-123');
    });

    it('should handle SAVE_SETTINGS when settings are passed directly on message', async () => {
      const response = await handleBackgroundMessage({
        type: 'SAVE_SETTINGS',
        provider: 'anthropic',
        apiKeyAnthropic: 'sk-ant-test',
      } as any);
      expect(response.provider).toBe('anthropic');
      expect(response.apiKeyAnthropic).toBe('sk-ant-test');
    });
  });

  describe('History Messages', () => {
    it('should handle GET_HISTORY and return history items', async () => {
      await storageService.addHistoryItem({
        rawInput: 'build a calculator',
        enhancedPrompt: '# Calculator Spec',
        preset: 'coding-agent',
        techStack: ['React'],
        isFavorite: false,
      });

      const response = await handleBackgroundMessage({ type: 'GET_HISTORY' });
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBe(1);
      expect(response[0].rawInput).toBe('build a calculator');
      expect(response[0].enhancedPrompt).toBe('# Calculator Spec');
    });
  });

  describe('ENHANCE_PROMPT Messages', () => {
    it('should compile prompt, call AI client, record history, and return success', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('Engineered Prompt for Coding Agent');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
      } as any);

      const response = await handleBackgroundMessage({
        type: 'ENHANCE_PROMPT',
        payload: {
          rawInput: 'build user profile page',
          preset: 'coding-agent',
          techStack: ['React', 'TypeScript', 'Tailwind CSS'],
          additionalContext: 'Use Zustand for state',
        },
      });

      expect(response.success).toBe(true);
      expect(response.prompt).toBe('Engineered Prompt for Coding Agent');
      expect(response.id).toBeDefined();

      expect(mockGeneratePrompt).toHaveBeenCalledWith(
        expect.stringContaining('Promptify AI'),
        expect.stringContaining('build user profile page')
      );

      // Verify item saved in history
      const history = await storageService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(response.id);
      expect(history[0].enhancedPrompt).toBe('Engineered Prompt for Coding Agent');
      expect(history[0].preset).toBe('coding-agent');
      expect(history[0].techStack).toEqual(['React', 'TypeScript', 'Tailwind CSS']);
      expect(response.activeModel).toBeDefined();
      expect(history[0].activeModelUsed).toBeDefined();
    });

    it('should track and return activeModel when client provides getActiveModelUsed', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('Enhanced output');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
        getActiveModelUsed: vi.fn().mockReturnValue('llama-3.3-70b-versatile'),
      } as any);

      const response = await handleBackgroundMessage({
        type: 'ENHANCE_PROMPT',
        payload: {
          rawInput: 'optimize database queries',
          preset: 'bugfix',
        },
      });

      expect(response.success).toBe(true);
      expect(response.activeModel).toBe('llama-3.3-70b-versatile');

      const history = await storageService.getHistory();
      expect(history[0].activeModelUsed).toBe('llama-3.3-70b-versatile');
    });

    it('should fallback to settings.provider when client does not implement getActiveModelUsed', async () => {
      await storageService.saveSettings({ provider: 'gemini' });
      const mockGeneratePrompt = vi.fn().mockResolvedValue('Enhanced output via gemini');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
      } as any);

      const response = await handleBackgroundMessage({
        type: 'ENHANCE_PROMPT',
        payload: {
          rawInput: 'create rust microservice',
        },
      });

      expect(response.success).toBe(true);
      expect(response.activeModel).toBe('gemini');

      const history = await storageService.getHistory();
      expect(history[0].activeModelUsed).toBe('gemini');
    });

    it('should handle ENHANCE_PROMPT when arguments are passed at top-level', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('Engineered RFC Spec');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
      } as any);

      const response = await handleBackgroundMessage({
        type: 'ENHANCE_PROMPT',
        rawInput: 'add dark mode support',
        preset: 'rfc-spec',
      } as any);

      expect(response.success).toBe(true);
      expect(response.prompt).toBe('Engineered RFC Spec');
      expect(response.id).toBeDefined();
      expect(response.activeModel).toBeDefined();
    });

    it('should return error when rawInput is empty or whitespace', async () => {
      const response = await handleBackgroundMessage({
        type: 'ENHANCE_PROMPT',
        payload: {
          rawInput: '   ',
        },
      });

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/empty|required/i);
    });

    it('should return error when AI client throws an exception', async () => {
      vi.spyOn(clientFactory, 'getAIClient').mockImplementation(() => {
        throw new Error('API key is missing for Gemini');
      });

      const response = await handleBackgroundMessage({
        type: 'ENHANCE_PROMPT',
        payload: {
          rawInput: 'create a blog',
        },
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('API key is missing for Gemini');
    });
  });

  describe('INSERT_INTO_ACTIVE_TAB Messages', () => {
    it('should query active tab and send message to content script', async () => {
      const response = await handleBackgroundMessage({
        type: 'INSERT_INTO_ACTIVE_TAB',
        payload: {
          text: 'Generated Code Prompt',
        },
      });

      expect(response.success).toBe(true);
      expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          type: 'INSERT_PROMPT',
          text: 'Generated Code Prompt',
        })
      );
    });

    it('should handle text passed directly as prompt or text property', async () => {
      const response = await handleBackgroundMessage({
        type: 'INSERT_INTO_ACTIVE_TAB',
        prompt: 'Alternative prompt format',
      } as any);

      expect(response.success).toBe(true);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          type: 'INSERT_PROMPT',
          text: 'Alternative prompt format',
        })
      );
    });

    it('should return error if no prompt text is provided', async () => {
      const response = await handleBackgroundMessage({
        type: 'INSERT_INTO_ACTIVE_TAB',
        payload: {},
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should return error if no active tab is found', async () => {
      (chrome.tabs.query as any).mockResolvedValueOnce([]);

      const response = await handleBackgroundMessage({
        type: 'INSERT_INTO_ACTIVE_TAB',
        payload: {
          text: 'Some prompt',
        },
      });

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/no active tab/i);
    });

    it('should return error if chrome.tabs.sendMessage fails', async () => {
      (chrome.tabs.sendMessage as any).mockRejectedValueOnce(
        new Error('Could not establish connection. Receiving end does not exist.')
      );

      const response = await handleBackgroundMessage({
        type: 'INSERT_INTO_ACTIVE_TAB',
        payload: {
          text: 'Some prompt',
        },
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Could not establish connection');
    });
  });

  describe('Lifecycle & Event Listeners', () => {
    it('should configure sidePanel behavior to open on action click', () => {
      setupSidePanelBehavior();
      expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
        openPanelOnActionClick: true,
      });
    });

    it('should register action onClicked listener and open side panel on click', async () => {
      let registeredHandler: ((tab: any) => Promise<void>) | null = null;
      (chrome.action.onClicked.addListener as any).mockImplementation((handler: any) => {
        registeredHandler = handler;
      });

      setupActionClickListener();
      expect(registeredHandler).not.toBeNull();

      if (registeredHandler) {
        await (registeredHandler as any)({ windowId: 555 });
        expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 555 });
      }
    });

    it('should safely catch errors if sidePanel.open fails in action click handler', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let registeredHandler: ((tab: any) => Promise<void>) | null = null;
      (chrome.action.onClicked.addListener as any).mockImplementation((handler: any) => {
        registeredHandler = handler;
      });

      (chrome.sidePanel.open as any).mockRejectedValueOnce(new Error('Window does not support sidepanel'));

      setupActionClickListener();
      if (registeredHandler) {
        await (registeredHandler as any)({ windowId: 999 });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to open side panel',
          expect.any(Error)
        );
      }
    });

    it('should register runtime onMessage listener and invoke sendResponse asynchronously', async () => {
      let registeredHandler: ((message: any, sender: any, sendResponse: any) => boolean) | null = null;
      (chrome.runtime.onMessage.addListener as any).mockImplementation((handler: any) => {
        registeredHandler = handler;
      });

      setupRuntimeMessageListener();
      expect(registeredHandler).not.toBeNull();

      const sendResponse = vi.fn();
      const keepsOpen = (registeredHandler as any)(
        { type: 'GET_SETTINGS' },
        {},
        sendResponse
      );

      expect(keepsOpen).toBe(true);

      // Wait for promise tick
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ provider: expect.any(String) })
      );
    });
  });
});
