/**
 * Promtify AI - In-Page Content Script & Magic Wand
 *
 * Responsibilities:
 * 1. Discover active chat inputs across AI platforms (ChatGPT, Claude, Gemini, GitHub).
 * 2. Attach a sleek floating magic wand quick-action button near the prompt input.
 * 3. Handle Alt+P keyboard shortcut to enhance prompt directly in-page.
 * 4. Dispatch ENHANCE_PROMPT message to background service worker and inject enhanced prompt.
 * 5. Safely replace text using synthetic InputEvent and Event('change') triggers.
 * 6. Listen for INSERT_PROMPT messages from Side Panel / service worker with clipboard fallback.
 * 7. Use MutationObserver to seamlessly support single-page apps (SPAs).
 */

let activeWandButton: HTMLButtonElement | null = null;
let currentTargetElement: HTMLElement | null = null;
let stateResetTimeout: any = null;

// SVG Icons
const WAND_SVG = `
  <svg class="promtify-wand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m19 11-4-4m0 0L3 19l4 4 12-12Z"/>
    <path d="m15 5 1.5-3 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5Z"/>
  </svg>
`;

const SPINNER_SVG = `
  <svg class="promtify-wand-icon promtify-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10"/>
  </svg>
`;

const CHECK_SVG = `
  <svg class="promtify-wand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
`;

const ALERT_SVG = `
  <svg class="promtify-wand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
`;

/**
 * Checks if a given DOM element is an editable input or textarea.
 */
export function isInputElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.classList.contains('promtify-wand-btn') || el.closest('.promtify-wand-btn')) return false;

  const tagName = el.tagName.toLowerCase();
  if (tagName === 'textarea') return true;
  if (tagName === 'input' && (el.getAttribute('type') === 'text' || !el.getAttribute('type'))) return true;
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
  if (el.getAttribute('role') === 'textbox') return true;

  return false;
}

/**
 * Searches the DOM for active or available AI chat prompt input elements.
 * Checks active element first, followed by known platform selectors.
 */
export function findPromptInput(root: Document | HTMLElement = document): HTMLElement | null {
  // Check currently active element
  if (document.activeElement && isInputElement(document.activeElement)) {
    return document.activeElement as HTMLElement;
  }

  // Priority selectors for supported AI tools & platforms
  const selectors = [
    '#prompt-textarea',                                     // ChatGPT
    'rich-textarea [contenteditable="true"]',                // Gemini
    'rich-textarea div',                                     // Gemini fallback
    'div.ProseMirror[contenteditable="true"]',               // Claude
    '.ProseMirror',                                          // Claude generic
    'div.ql-editor[contenteditable="true"]',                 // Quill/Gemini
    'textarea#issue_body',                                   // GitHub Issues
    'textarea[name="comment[body]"]',                        // GitHub Comments
    'textarea.comment-form-textarea',                        // GitHub
    '[role="textbox"][contenteditable="true"]',              // Generic rich text
    'textarea:not([aria-hidden="true"]):not([disabled])',    // Generic visible textarea
    'div[contenteditable="true"]:not([aria-hidden="true"])', // Generic contenteditable
    '[contenteditable="true"]',                              // Generic fallback
    '[role="textbox"]',                                      // ARIA textbox
    'textarea',                                              // Any textarea
  ];

  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el && el instanceof HTMLElement && isInputElement(el)) {
      return el;
    }
  }

  return null;
}

/**
 * Retrieves the plain text content from a textarea or contenteditable element.
 */
export function getElementText(element: HTMLElement | null): string {
  if (!element) return '';

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value.trim();
  }

  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    return (element.innerText !== undefined ? element.innerText : element.textContent || '').trim();
  }

  return (element.textContent || '').trim();
}

/**
 * Injects prompt text into a textarea or contenteditable element.
 * Fires native InputEvent and change events to notify frameworks (React, ProseMirror, etc.).
 */
export function injectPromptIntoElement(element: HTMLElement | null, text: string): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  try {
    element.focus();

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      // Use prototype setter to trigger React/Vue value tracking
      const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, text);
      } else {
        element.value = text;
      }

      // Dispatch synthetic input event
      try {
        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text,
        }));
      } catch {
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }

      // Dispatch synthetic change event
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      return true;
    }

    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
      let commandHandled = false;
      try {
        if (typeof document.execCommand === 'function') {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(element);
          selection?.removeAllRanges();
          selection?.addRange(range);
          commandHandled = document.execCommand('insertText', false, text);
        }
      } catch {
        commandHandled = false;
      }

      if (!commandHandled) {
        element.textContent = text;
      }

      // Dispatch input & change events
      try {
        element.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text,
        }));
      } catch {
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }

      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      return true;
    }

    element.textContent = text;
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    return true;
  } catch (err) {
    console.error('Failed to inject prompt into element:', err);
    return false;
  }
}

/**
 * Updates the visual state of the magic wand button.
 */
export function setWandState(
  button: HTMLButtonElement,
  state: 'idle' | 'loading' | 'success' | 'error'
): void {
  if (stateResetTimeout) {
    clearTimeout(stateResetTimeout);
    stateResetTimeout = null;
  }

  button.classList.remove('promtify-loading', 'promtify-success', 'promtify-error');

  switch (state) {
    case 'loading':
      button.classList.add('promtify-loading');
      button.innerHTML = SPINNER_SVG;
      button.setAttribute('aria-busy', 'true');
      button.disabled = true;
      break;

    case 'success':
      button.classList.add('promtify-success');
      button.innerHTML = CHECK_SVG;
      button.removeAttribute('aria-busy');
      button.disabled = false;
      stateResetTimeout = setTimeout(() => {
        setWandState(button, 'idle');
      }, 1500);
      break;

    case 'error':
      button.classList.add('promtify-error');
      button.innerHTML = ALERT_SVG;
      button.removeAttribute('aria-busy');
      button.disabled = false;
      stateResetTimeout = setTimeout(() => {
        setWandState(button, 'idle');
      }, 2000);
      break;

    case 'idle':
    default:
      button.innerHTML = WAND_SVG;
      button.removeAttribute('aria-busy');
      button.disabled = false;
      break;
  }
}

/**
 * Creates the floating magic wand button element.
 */
export function createWandButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'promtify-wand-btn';
  btn.title = 'Promptify AI (Alt+P) - Refine & Enhance Prompt';
  btn.setAttribute('aria-label', 'Promptify AI (Alt+P)');
  btn.type = 'button';
  btn.innerHTML = WAND_SVG;
  return btn;
}

/**
 * Positions the floating wand button relative to target input.
 */
export function updateWandPosition(button: HTMLButtonElement, target: HTMLElement): void {
  try {
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      button.style.position = 'fixed';
      button.style.top = `${Math.max(8, rect.bottom - 40)}px`;
      button.style.left = `${Math.max(8, rect.right - 44)}px`;
    }
  } catch {
    // Graceful fallback for non-rendered environments
  }
}

/**
 * Shows a lightweight floating toast message.
 */
export function showToast(message: string, duration = 2500): void {
  try {
    const existing = document.querySelector('.promtify-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'promtify-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  } catch {
    // Ignore in unsupported environments
  }
}

/**
 * Removes active wand button from document.
 */
export function removeWand(): void {
  if (activeWandButton) {
    activeWandButton.remove();
    activeWandButton = null;
  }
  document.querySelectorAll('.promtify-wand-btn').forEach((el) => el.remove());
}

/**
 * Attaches the floating wand button near the specified input element.
 */
export function attachWandToElement(target: HTMLElement): HTMLButtonElement {
  currentTargetElement = target;

  if (activeWandButton && document.contains(activeWandButton)) {
    updateWandPosition(activeWandButton, target);
    return activeWandButton;
  }

  const btn = createWandButton();
  activeWandButton = btn;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleEnhanceRequest(currentTargetElement || target);
  });

  document.body.appendChild(btn);
  updateWandPosition(btn, target);

  return btn;
}

/**
 * Handles enhancement request for a prompt input.
 * Extracts text, dispatches message to service worker, and injects result.
 */
export async function handleEnhanceRequest(
  targetElement?: HTMLElement | null
): Promise<{ success: boolean; prompt?: string; error?: string }> {
  const target = targetElement || findPromptInput();

  if (!target) {
    showToast('No active prompt input found');
    return { success: false, error: 'No active prompt input found on page' };
  }

  const rawText = getElementText(target);
  if (!rawText) {
    if (activeWandButton) {
      setWandState(activeWandButton, 'error');
    }
    showToast('Please enter a prompt first');
    return { success: false, error: 'Prompt input cannot be empty' };
  }

  if (activeWandButton) {
    setWandState(activeWandButton, 'loading');
  }

  try {
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      typeof chrome.runtime.sendMessage !== 'function'
    ) {
      throw new Error('Chrome extension runtime not available');
    }

    const response = await chrome.runtime.sendMessage({
      type: 'ENHANCE_PROMPT',
      payload: { rawInput: rawText },
      rawInput: rawText,
    });

    if (response && response.success && response.prompt) {
      injectPromptIntoElement(target, response.prompt);
      if (activeWandButton) {
        setWandState(activeWandButton, 'success');
      }
      showToast('Prompt enhanced with Promtify AI!');
      return { success: true, prompt: response.prompt };
    } else {
      const error = response?.error || 'Failed to enhance prompt';
      if (activeWandButton) {
        setWandState(activeWandButton, 'error');
      }
      showToast(error);
      return { success: false, error };
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Error communicating with background worker';
    if (activeWandButton) {
      setWandState(activeWandButton, 'error');
    }
    showToast(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Handles incoming runtime messages from side panel or background service worker.
 */
export async function handleContentScriptMessage(message: any): Promise<any> {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'INSERT_PROMPT') {
    const text = message.text ?? message.prompt ?? message.payload?.text ?? message.payload?.prompt;
    if (!text || (typeof text === 'string' && !text.trim())) {
      return { success: false, error: 'Missing prompt text for insertion' };
    }

    const input = findPromptInput();
    if (input) {
      const ok = injectPromptIntoElement(input, String(text).trim());
      showToast('Prompt inserted!');
      return { success: ok };
    } else {
      // Fallback: Copy to clipboard if no input exists on the current page
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(String(text).trim());
          showToast('No input found - copied to clipboard!');
          return { success: true, fallbackToClipboard: true };
        }
      } catch (clipErr) {
        return { success: false, error: 'Failed to insert prompt or copy to clipboard' };
      }
      return { success: false, error: 'No input element found on page' };
    }
  }
}

/**
 * Hotkey listener for Alt+P.
 */
export function handleKeyDown(event: KeyboardEvent): void {
  if (event.altKey && (event.key === 'p' || event.key === 'P' || event.code === 'KeyP')) {
    event.preventDefault();
    const input = findPromptInput();
    if (input) {
      handleEnhanceRequest(input);
    }
  }
}

/**
 * Sets up full content script observation, event handlers, and listeners.
 * Returns teardown cleanup function.
 */
export function setupContentScript(): () => void {
  // Initial check for existing input
  const initialInput = findPromptInput();
  if (initialInput) {
    attachWandToElement(initialInput);
  }

  // MutationObserver for single-page applications (ChatGPT, Claude, Gemini)
  let observerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (observerDebounceTimer) {
      clearTimeout(observerDebounceTimer);
    }
    observerDebounceTimer = setTimeout(() => {
      const input = findPromptInput();
      if (input) {
        attachWandToElement(input);
      }
      observerDebounceTimer = null;
    }, 200);
  });

  const rootToObserve = document.body || document.documentElement;
  if (rootToObserve) {
    observer.observe(rootToObserve, {
      childList: true,
      subtree: true,
    });
  }

  // Focus tracking
  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (isInputElement(target)) {
      attachWandToElement(target);
    }
  };
  document.addEventListener('focusin', onFocusIn);

  // Keyboard shortcut listener (Alt+P)
  window.addEventListener('keydown', handleKeyDown);

  // Position update on scroll / resize
  const onReposition = () => {
    if (activeWandButton && currentTargetElement) {
      updateWandPosition(activeWandButton, currentTargetElement);
    }
  };
  window.addEventListener('scroll', onReposition, true);
  window.addEventListener('resize', onReposition);

  // Runtime message listener
  const messageListener = (message: any, _sender: any, sendResponse: (resp: any) => void) => {
    handleContentScriptMessage(message)
      .then((res) => {
        if (res !== undefined) sendResponse(res);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err?.message || String(err) });
      });
    return true;
  };

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(messageListener);
  }

  return () => {
    if (observerDebounceTimer) {
      clearTimeout(observerDebounceTimer);
      observerDebounceTimer = null;
    }
    observer.disconnect();
    document.removeEventListener('focusin', onFocusIn);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('scroll', onReposition, true);
    window.removeEventListener('resize', onReposition);

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(messageListener);
    }

    removeWand();
  };
}

// Auto-initialize when loaded in browser (non-test environment)
if (
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV !== 'test'
) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupContentScript());
  } else {
    setupContentScript();
  }
}
