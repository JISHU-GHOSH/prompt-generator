import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findPromptInput,
  getElementText,
  injectPromptIntoElement,
  createWandButton,
  attachWandToElement,
  handleEnhanceRequest,
  handleContentScriptMessage,
  setupContentScript,
  removeWand,
} from '../src/content/content-script';

describe('Content Script In-Page Utilities', () => {
  let mockStore: Record<string, any> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';

    // Mock chrome APIs
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    };

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('findPromptInput', () => {
    it('should find textarea elements in mocked DOM', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const input = findPromptInput();
      expect(input).not.toBeNull();
      expect(input?.id).toBe('prompt-textarea');
    });

    it('should find ChatGPT input (#prompt-textarea)', () => {
      document.body.innerHTML = `
        <div class="chat-container">
          <textarea id="prompt-textarea" placeholder="Message ChatGPT"></textarea>
        </div>
      `;
      const input = findPromptInput();
      expect(input).not.toBeNull();
      expect(input?.id).toBe('prompt-textarea');
    });

    it('should find Claude ProseMirror contenteditable element', () => {
      document.body.innerHTML = `
        <div class="input-wrap">
          <div class="ProseMirror" contenteditable="true"><p>Test</p></div>
        </div>
      `;
      const input = findPromptInput();
      expect(input).not.toBeNull();
      expect(input?.classList.contains('ProseMirror')).toBe(true);
    });

    it('should find Gemini rich-textarea element', () => {
      document.body.innerHTML = `
        <rich-textarea>
          <div contenteditable="true" role="textbox"><p>Gemini prompt</p></div>
        </rich-textarea>
      `;
      const input = findPromptInput();
      expect(input).not.toBeNull();
      expect(input?.getAttribute('contenteditable')).toBe('true');
    });

    it('should prefer active element if active element is an input', () => {
      document.body.innerHTML = `
        <textarea id="first-box"></textarea>
        <textarea id="active-box"></textarea>
      `;
      const activeBox = document.getElementById('active-box') as HTMLTextAreaElement;
      activeBox.focus();

      const found = findPromptInput();
      expect(found).toBe(activeBox);
    });

    it('should return null when no suitable input exists', () => {
      document.body.innerHTML = '<div><p>Just plain text</p></div>';
      const input = findPromptInput();
      expect(input).toBeNull();
    });
  });

  describe('getElementText', () => {
    it('should extract text from textarea value', () => {
      const textarea = document.createElement('textarea');
      textarea.value = '  Create a REST API  ';
      expect(getElementText(textarea)).toBe('Create a REST API');
    });

    it('should extract text from contenteditable element', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      div.innerText = 'Refactor this module';
      expect(getElementText(div)).toBe('Refactor this module');
    });

    it('should return empty string for null or empty elements', () => {
      const textarea = document.createElement('textarea');
      textarea.value = '';
      expect(getElementText(textarea)).toBe('');
      expect(getElementText(null as any)).toBe('');
    });
  });

  describe('injectPromptIntoElement', () => {
    it('should inject text into textarea and fire input & change events', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const input = document.querySelector('textarea')!;
      let inputFired = false;
      let changeFired = false;

      input.addEventListener('input', () => { inputFired = true; });
      input.addEventListener('change', () => { changeFired = true; });

      const success = injectPromptIntoElement(input, 'New Refined Prompt');

      expect(success).toBe(true);
      expect(input.value).toBe('New Refined Prompt');
      expect(inputFired).toBe(true);
      expect(changeFired).toBe(true);
    });

    it('should inject text into contenteditable div and fire input events', () => {
      document.body.innerHTML = '<div id="ce" contenteditable="true">old text</div>';
      const input = document.getElementById('ce')!;
      let inputFired = false;

      input.addEventListener('input', () => { inputFired = true; });

      const success = injectPromptIntoElement(input, 'Supercharged prompt');

      expect(success).toBe(true);
      expect(input.textContent).toBe('Supercharged prompt');
      expect(inputFired).toBe(true);
    });

    it('should return false if element is invalid', () => {
      const success = injectPromptIntoElement(null as any, 'Hello');
      expect(success).toBe(false);
    });
  });

  describe('createWandButton & attachWandToElement', () => {
    it('should create wand button with correct attributes and accessibility labels', () => {
      const btn = createWandButton();
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('promtify-wand-btn')).toBe(true);
      expect(btn.getAttribute('aria-label')).toBe('Promptify AI (Alt+P)');
      expect(btn.getAttribute('title')).toContain('Promptify');
    });

    it('should attach wand button next to prompt input container', () => {
      document.body.innerHTML = `
        <div class="container">
          <textarea id="prompt-textarea"></textarea>
        </div>
      `;
      const input = document.querySelector('textarea')!;
      const btn = attachWandToElement(input);

      expect(btn).not.toBeNull();
      expect(document.querySelector('.promtify-wand-btn')).not.toBeNull();
    });

    it('should not attach duplicate wand buttons to the same target', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const input = document.querySelector('textarea')!;
      const btn1 = attachWandToElement(input);
      const btn2 = attachWandToElement(input);

      expect(btn1).toBe(btn2);
      expect(document.querySelectorAll('.promtify-wand-btn').length).toBe(1);
    });

    it('should remove existing wand button cleanly', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const input = document.querySelector('textarea')!;
      attachWandToElement(input);
      expect(document.querySelector('.promtify-wand-btn')).not.toBeNull();

      removeWand();
      expect(document.querySelector('.promtify-wand-btn')).toBeNull();
    });
  });

  describe('handleEnhanceRequest', () => {
    it('should send ENHANCE_PROMPT to service worker and inject result', async () => {
      document.body.innerHTML = '<textarea id="prompt-textarea">make a navbar</textarea>';
      const input = document.querySelector('textarea')!;

      (chrome.runtime.sendMessage as any).mockResolvedValue({
        success: true,
        prompt: '# Enhanced: Make responsive navbar with Tailwind',
      });

      const res = await handleEnhanceRequest(input);

      expect(res.success).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ENHANCE_PROMPT',
          payload: expect.objectContaining({
            rawInput: 'make a navbar',
          }),
        })
      );
      expect(input.value).toBe('# Enhanced: Make responsive navbar with Tailwind');
    });

    it('should handle empty input without sending service worker request', async () => {
      document.body.innerHTML = '<textarea id="prompt-textarea">   </textarea>';
      const input = document.querySelector('textarea')!;

      const res = await handleEnhanceRequest(input);

      expect(res.success).toBe(false);
      expect(res.error).toContain('empty');
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle service worker error and fallback to clipboard if copyable', async () => {
      document.body.innerHTML = '<textarea id="prompt-textarea">my raw prompt</textarea>';
      const input = document.querySelector('textarea')!;

      (chrome.runtime.sendMessage as any).mockResolvedValue({
        success: false,
        error: 'API quota exceeded',
      });

      const res = await handleEnhanceRequest(input);

      expect(res.success).toBe(false);
      expect(res.error).toBe('API quota exceeded');
    });
  });

  describe('handleContentScriptMessage (Runtime message listener)', () => {
    it('should handle INSERT_PROMPT message by finding input and injecting text', async () => {
      document.body.innerHTML = '<textarea id="prompt-textarea">Initial</textarea>';
      const input = document.querySelector('textarea')!;

      const response = await handleContentScriptMessage({
        type: 'INSERT_PROMPT',
        text: 'Prompt from Side Panel Studio',
      });

      expect(response.success).toBe(true);
      expect(input.value).toBe('Prompt from Side Panel Studio');
    });

    it('should fallback to clipboard if no input element exists on page', async () => {
      document.body.innerHTML = '<div class="no-inputs">No inputs here</div>';

      const response = await handleContentScriptMessage({
        type: 'INSERT_PROMPT',
        text: 'Prompt copied to clipboard',
      });

      expect(response.success).toBe(true);
      expect(response.fallbackToClipboard).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Prompt copied to clipboard');
    });

    it('should ignore unrelated message types', async () => {
      const response = await handleContentScriptMessage({
        type: 'UNRELATED_NOTIFICATION',
      });

      expect(response).toBeUndefined();
    });
  });

  describe('Keyboard hotkey (Alt+P)', () => {
    it('should trigger enhancement on Alt+P keypress', async () => {
      document.body.innerHTML = '<textarea id="prompt-textarea">build a modal</textarea>';
      const input = document.querySelector('textarea')!;
      input.focus();

      (chrome.runtime.sendMessage as any).mockResolvedValue({
        success: true,
        prompt: '# Enhanced Modal Spec',
      });

      const cleanup = setupContentScript();

      // Dispatch Alt+P
      const event = new KeyboardEvent('keydown', {
        key: 'p',
        code: 'KeyP',
        altKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);

      // Wait a microtask
      await new Promise((r) => setTimeout(r, 10));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ENHANCE_PROMPT',
          payload: expect.objectContaining({
            rawInput: 'build a modal',
          }),
        })
      );

      cleanup();
    });
  });
});
