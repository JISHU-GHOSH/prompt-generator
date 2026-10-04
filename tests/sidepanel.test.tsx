import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/sidepanel/App';
import { storageService, DEFAULT_SETTINGS } from '../src/services/storage';
import * as clientFactory from '../src/services/ai/client-factory';

describe('Side Panel React Application', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    mockStorage = {};
    // Setup Chrome API mocks
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
            if (Array.isArray(keys)) {
              return keys.reduce((acc, k) => ({ ...acc, [k]: mockStorage[k] }), {});
            }
            return mockStorage;
          }),
          set: vi.fn(async (items) => {
            Object.assign(mockStorage, items);
          }),
        },
      },
      runtime: {
        sendMessage: vi.fn(async () => ({ success: true })),
      },
      tabs: {
        query: vi.fn(async () => [{ id: 123, active: true }]),
        sendMessage: vi.fn(async () => ({ success: true })),
      },
    };

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => {}),
      },
    });
  });

  describe('Header and Navigation', () => {
    it('should render header with Promtify AI logo and navigation tabs', async () => {
      render(<App />);

      expect(await screen.findByText(/PromptForge AI/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Studio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Library/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
    });

    it('should switch between Studio, Library, and Settings tabs', async () => {
      render(<App />);

      // Studio tab is default
      expect(await screen.findByPlaceholderText(/Describe what you want to build/i)).toBeInTheDocument();

      // Switch to Library tab
      fireEvent.click(screen.getByRole('button', { name: /Library/i }));
      expect(await screen.findByPlaceholderText(/Search saved prompts/i)).toBeInTheDocument();

      // Switch to Settings tab
      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
      expect(await screen.findByText(/AI Provider & API Keys/i)).toBeInTheDocument();

      // Switch back to Studio tab
      fireEvent.click(screen.getByRole('button', { name: /Studio/i }));
      expect(await screen.findByPlaceholderText(/Describe what you want to build/i)).toBeInTheDocument();
    });
  });

  describe('Studio Tab', () => {
    it('should allow entering raw prompt and toggling presets', async () => {
      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'build a responsive navbar' } });
      expect((textarea as HTMLTextAreaElement).value).toBe('build a responsive navbar');

      // Check preset selector buttons
      const codingAgentBtn = screen.getByRole('button', { name: /Coding Agent/i });
      const rfcBtn = screen.getByRole('button', { name: /RFC/i });
      expect(codingAgentBtn).toBeInTheDocument();
      expect(rfcBtn).toBeInTheDocument();

      fireEvent.click(rfcBtn);
      // Selected preset changes
    });

    it('should allow adding and removing tech stack tags', async () => {
      render(<App />);

      const tagInput = await screen.findByPlaceholderText(/Add tech/i);
      fireEvent.change(tagInput, { target: { value: 'Next.js' } });
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });

      expect(await screen.findByText('Next.js')).toBeInTheDocument();

      // Remove a tag
      const removeBtn = screen.getByLabelText('Remove Next.js');
      fireEvent.click(removeBtn);
      expect(screen.queryByLabelText('Remove Next.js')).not.toBeInTheDocument();
    });

    it('should generate enhanced prompt and display in OutputViewer', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('## Enhanced Coding Prompt\n```tsx\nexport const Nav = () => <nav/>\n```');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
      });

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Create a dark mode switch' } });

      const promptifyButton = screen.getByRole('button', { name: /Promptify|Enhance/i });
      fireEvent.click(promptifyButton);

      expect(await screen.findByText(/Enhanced Coding Prompt/i)).toBeInTheDocument();
    });
  });

  describe('OutputViewer Actions', () => {
    it('should copy output to clipboard and send to active tab', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('# Compiled Prompt Result');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
      });

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Make a counter' } });
      fireEvent.click(screen.getByRole('button', { name: /Promptify|Enhance/i }));

      expect(await screen.findByText(/Compiled Prompt Result/i)).toBeInTheDocument();

      // Test Copy button
      const copyBtn = screen.getByRole('button', { name: /Copy/i });
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Compiled Prompt Result');

      // Test Save prompt button
      const saveBtn = screen.getByRole('button', { name: /Save prompt/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });

      // Clicking save button again should toggle favorite back to false
      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });

      // Test Send to Tab button
      const sendBtn = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, expect.objectContaining({
          type: 'INSERT_PROMPT',
        }));
      });
    });
  });

  describe('Library Tab', () => {
    it('should list history items and allow reloading into studio', async () => {
      vi.spyOn(storageService, 'getHistory').mockResolvedValue([
        {
          id: 'hist-1',
          timestamp: Date.now(),
          rawInput: 'Build user settings page',
          enhancedPrompt: '# User Settings Specification',
          preset: 'rfc-spec',
          techStack: ['React', 'Zustand'],
          isFavorite: false,
        },
      ]);

      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /Library/i }));

      expect(await screen.findByText(/Build user settings page/i)).toBeInTheDocument();

      // Click reload / use prompt
      const reloadBtn = screen.getByRole('button', { name: /Load into Studio|Use in Studio/i });
      fireEvent.click(reloadBtn);

      // Should switch back to Studio tab with the prompt loaded
      const studioTextarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      expect((studioTextarea as HTMLTextAreaElement).value).toBe('Build user settings page');
    });
  });

  describe('Settings Tab', () => {
    it('should update and save provider and API key settings', async () => {
      const saveSpy = vi.spyOn(storageService, 'saveSettings').mockResolvedValue({
        ...DEFAULT_SETTINGS,
        apiKeyGemini: 'new-gemini-key',
      });

      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      const apiKeyInput = await screen.findByPlaceholderText(/Enter Gemini API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'new-gemini-key' } });

      const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
          apiKeyGemini: 'new-gemini-key',
        }));
      });
    });

    it('should toggle password visibility on API key inputs', async () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      const apiKeyInput = (await screen.findByPlaceholderText(/Enter Gemini API Key/i)) as HTMLInputElement;
      expect(apiKeyInput.type).toBe('password');

      // Click mask toggle button next to Gemini API key using aria-label
      const visibilityBtns = screen.getAllByLabelText('Toggle password visibility');
      expect(visibilityBtns.length).toBe(4);
      fireEvent.click(visibilityBtns[0]);
      expect(apiKeyInput.type).toBe('text');
    });

    it('should reset settings to default values', async () => {
      const saveSpy = vi.spyOn(storageService, 'saveSettings').mockResolvedValue(DEFAULT_SETTINGS);

      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      const resetBtn = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledWith(DEFAULT_SETTINGS);
      });
    });
  });

  describe('Error Handling and UI Feedback', () => {
    it('should show error when prompt generation fails', async () => {
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: vi.fn().mockRejectedValue(new Error('Quota exceeded on Gemini API')),
      });

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Create microservice' } });

      const promptifyButton = screen.getByRole('button', { name: /Promptify|Enhance/i });
      fireEvent.click(promptifyButton);

      expect(await screen.findByText(/Quota exceeded on Gemini API/i)).toBeInTheDocument();
    });

    it('should switch to settings tab when provider badge in header is clicked', async () => {
      render(<App />);

      const providerBadge = await screen.findByTitle(/API key missing|ready/i);
      fireEvent.click(providerBadge);

      expect(await screen.findByText(/AI Provider & API Keys/i)).toBeInTheDocument();
    });

    it('should filter items in library tab by search query', async () => {
      vi.spyOn(storageService, 'getHistory').mockResolvedValue([
        {
          id: 'hist-1',
          timestamp: Date.now(),
          rawInput: 'Build authentication modal',
          enhancedPrompt: '# Auth Modal',
          preset: 'coding-agent',
          techStack: ['React'],
          isFavorite: false,
        },
        {
          id: 'hist-2',
          timestamp: Date.now(),
          rawInput: 'Fix memory leak in web worker',
          enhancedPrompt: '# Bugfix worker',
          preset: 'bugfix',
          techStack: ['TypeScript'],
          isFavorite: false,
        },
      ]);

      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /Library/i }));

      expect(await screen.findByText(/Build authentication modal/i)).toBeInTheDocument();
      expect(screen.getByText(/Fix memory leak in web worker/i)).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/Search saved prompts/i);
      fireEvent.change(searchInput, { target: { value: 'memory' } });

      expect(screen.queryByText(/Build authentication modal/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Fix memory leak in web worker/i)).toBeInTheDocument();
    });
  });

  describe('Zero-Key Auto Failover and Model Badges', () => {
    it('should not display missing API key alert when provider is auto', async () => {
      render(<App />);

      // Should find Studio tab active by default
      expect(await screen.findByPlaceholderText(/Describe what you want to build/i)).toBeInTheDocument();

      // No warning banners should be shown for missing API keys
      expect(screen.queryByText(/Missing API Key/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Configure key in settings/i)).not.toBeInTheDocument();
    });

    it('should display LLaMA 3.3 70B model badge in OutputViewer after generation', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('## Enhanced System Plan');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
        getActiveModelUsed: vi.fn().mockReturnValue('llama-3.3-70b-versatile'),
      } as any);

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Create microservice architecture' } });

      const enhanceBtn = screen.getByRole('button', { name: /Promptify|Enhance/i });
      fireEvent.click(enhanceBtn);

      expect(await screen.findByText(/Enhanced System Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/LLaMA 3.3 70B/i)).toBeInTheDocument();
    });

    it('should display LLaMA 3.1 8B model badge in OutputViewer when model includes 8b', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('## Enhanced Fast Plan');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
        getActiveModelUsed: vi.fn().mockReturnValue('llama-3.1-8b-instant'),
      } as any);

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Create quick utility' } });

      const enhanceBtn = screen.getByRole('button', { name: /Promptify|Enhance/i });
      fireEvent.click(enhanceBtn);

      expect(await screen.findByText(/Enhanced Fast Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/LLaMA 3.1 8B/i)).toBeInTheDocument();
    });

    it('should display Gemini 3.8 Flash model badge when active model is gemini-3.8-flash', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('## Gemini Enhanced Plan');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
        getActiveModelUsed: vi.fn().mockReturnValue('gemini-3.8-flash'),
      } as any);

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Build GraphQL server' } });

      const enhanceBtn = screen.getByRole('button', { name: /Promptify|Enhance/i });
      fireEvent.click(enhanceBtn);

      expect(await screen.findByText(/Gemini Enhanced Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini 3.8 Flash/i)).toBeInTheDocument();
    });

    it('should display Offline Engine badge when fallback reaches local synthesizer', async () => {
      const mockGeneratePrompt = vi.fn().mockResolvedValue('## Offline Synthesized Output');
      vi.spyOn(clientFactory, 'getAIClient').mockReturnValue({
        generatePrompt: mockGeneratePrompt,
        getActiveModelUsed: vi.fn().mockReturnValue('local-synthesizer'),
      } as any);

      render(<App />);

      const textarea = await screen.findByPlaceholderText(/Describe what you want to build/i);
      fireEvent.change(textarea, { target: { value: 'Build offline calculator' } });

      const enhanceBtn = screen.getByRole('button', { name: /Promptify|Enhance/i });
      fireEvent.click(enhanceBtn);

      expect(await screen.findByText(/Offline Synthesized Output/i)).toBeInTheDocument();
      expect(screen.getByText(/Offline Engine/i)).toBeInTheDocument();
    });

    it('should display auto-failover provider option and groq section in settings tab', async () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      expect(
        await screen.findByText(/Auto-Failover \(LLaMA 3.3 \+ Gemini 3.8 - Recommended\)/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/llama-3.3-70b-versatile/i)).toBeInTheDocument();
    });
  });
});
