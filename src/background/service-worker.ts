/**
 * PromptForge AI - Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * 1. Configure side panel behavior (open on extension icon click).
 * 2. Fallback click handler to open side panel programmatically if setPanelBehavior is unsupported.
 * 3. Route runtime messages:
 *    - ENHANCE_PROMPT: Compiles prompt, executes LLM generation, records in storage history.
 *    - GET_SETTINGS: Returns user configuration.
 *    - SAVE_SETTINGS: Updates user configuration.
 *    - GET_HISTORY: Returns prompt generation history.
 *    - INSERT_INTO_ACTIVE_TAB: Relays generated prompt to the active browser tab content script.
 */

import { storageService } from '../services/storage';
import { compileMetaPrompt } from '../services/prompt-engine/compiler';
import { getAIClient } from '../services/ai/client-factory';
import { AppSettings, PromptHistoryItem } from '../types';

/**
 * Handles incoming extension runtime messages.
 * Exported for isolated unit testing.
 */
export async function handleBackgroundMessage(message: any, sender?: any): Promise<any> {
  if (!message || typeof message !== 'object' || !message.type) {
    return {
      success: false,
      error: 'Unknown or missing message type',
    };
  }

  try {
    switch (message.type) {
      case 'ENHANCE_PROMPT': {
        const payload = message.payload ?? message;
        const rawInput = payload.rawInput;
        const preset = payload.preset;
        const techStack = payload.techStack;
        const additionalContext = payload.additionalContext;

        if (!rawInput || (typeof rawInput === 'string' && !rawInput.trim())) {
          return {
            success: false,
            error: 'Prompt input cannot be empty',
          };
        }

        const settings = await storageService.getSettings();
        const targetPreset = preset || settings.defaultPreset || 'coding-agent';
        const targetTechStack = techStack ?? settings.defaultTechStack ?? [];

        const compiled = compileMetaPrompt({
          rawInput: String(rawInput).trim(),
          preset: targetPreset,
          techStack: targetTechStack,
          additionalContext: additionalContext ? String(additionalContext).trim() : undefined,
        });

        const aiClient = getAIClient(settings);
        const enhancedPrompt = await aiClient.generatePrompt(
          compiled.systemPrompt,
          compiled.userPrompt
        );

        const historyItem = await storageService.addHistoryItem({
          rawInput: String(rawInput).trim(),
          enhancedPrompt,
          preset: targetPreset,
          techStack: targetTechStack,
          isFavorite: false,
        });

        return {
          success: true,
          prompt: enhancedPrompt,
          id: historyItem.id,
        };
      }

      case 'GET_SETTINGS': {
        return await storageService.getSettings();
      }

      case 'SAVE_SETTINGS': {
        const payload = message.payload ?? message;
        const incomingSettings = payload.settings ?? (message.payload !== undefined ? message.payload : message);
        const { type: _ignored, ...cleanSettings } = incomingSettings;
        return await storageService.saveSettings(cleanSettings);
      }

      case 'GET_HISTORY': {
        return await storageService.getHistory();
      }

      case 'INSERT_INTO_ACTIVE_TAB': {
        const payload = message.payload ?? message;
        const text = payload.text ?? payload.prompt ?? payload.enhancedPrompt;

        if (!text || (typeof text === 'string' && !text.trim())) {
          return {
            success: false,
            error: 'Prompt text is required for insertion',
          };
        }

        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query || !chrome.tabs.sendMessage) {
          return {
            success: false,
            error: 'Chrome Tabs API is not available',
          };
        }

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs && tabs[0];
        if (!activeTab || activeTab.id === undefined) {
          return {
            success: false,
            error: 'No active tab found in current window',
          };
        }

        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, {
            type: 'INSERT_PROMPT',
            text: String(text).trim(),
            prompt: String(text).trim(),
            payload: { text: String(text).trim(), prompt: String(text).trim() },
          });

          return {
            success: true,
            tabId: activeTab.id,
            response,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err?.message || 'Failed to send prompt to active tab',
          };
        }
      }

      default: {
        return {
          success: false,
          error: `Unknown message type: ${message.type}`,
        };
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred in service worker',
    };
  }
}

/**
 * Configure side panel behavior (open panel when extension action icon is clicked)
 */
export function setupSidePanelBehavior(): void {
  if (typeof chrome !== 'undefined' && chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === 'function') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
}

/**
 * Fallback listener for extension action clicks
 */
export function setupActionClickListener(): void {
  if (typeof chrome !== 'undefined' && chrome.action && chrome.action.onClicked) {
    chrome.action.onClicked.addListener(async (tab) => {
      if (tab?.windowId && chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
        try {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        } catch (e) {
          console.error('Failed to open side panel', e);
        }
      }
    });
  }
}

/**
 * Listener for runtime messages
 */
export function setupRuntimeMessageListener(): void {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleBackgroundMessage(message, sender)
        .then((response) => sendResponse(response))
        .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
      return true; // Keep message channel open for async response
    });
  }
}

// Initialize listeners on service worker start
setupSidePanelBehavior();
setupActionClickListener();
setupRuntimeMessageListener();
