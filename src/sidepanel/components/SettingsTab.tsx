import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, ProviderType, PresetType } from '../../types';
import { DEFAULT_SETTINGS } from '../../services/storage';

export interface SettingsTabProps {
  settings: AppSettings;
  onSaveSettings: (updated: Partial<AppSettings>) => Promise<void>;
  onResetDefaults?: () => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSaveSettings,
  onResetDefaults,
}) => {
  const [provider, setProvider] = useState<ProviderType>(settings.provider);
  const [apiKeyGemini, setApiKeyGemini] = useState(settings.apiKeyGemini);
  const [apiKeyGroq, setApiKeyGroq] = useState(settings.apiKeyGroq || '');
  const [apiKeyOpenAI, setApiKeyOpenAI] = useState(settings.apiKeyOpenAI);
  const [apiKeyAnthropic, setApiKeyAnthropic] = useState(settings.apiKeyAnthropic);
  const [modelGemini, setModelGemini] = useState(settings.modelGemini);
  const [modelGroq, setModelGroq] = useState(settings.modelGroq || 'llama-3.3-70b-versatile');
  const [modelOpenAI, setModelOpenAI] = useState(settings.modelOpenAI);
  const [modelAnthropic, setModelAnthropic] = useState(settings.modelAnthropic);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [defaultPreset, setDefaultPreset] = useState<PresetType>(settings.defaultPreset);
  const [proxyUrl, setProxyUrl] = useState(settings.proxyUrl || '');

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        provider,
        apiKeyGemini: apiKeyGemini.trim(),
        apiKeyGroq: apiKeyGroq.trim(),
        apiKeyOpenAI: apiKeyOpenAI.trim(),
        apiKeyAnthropic: apiKeyAnthropic.trim(),
        proxyUrl: proxyUrl.trim(),
        modelGemini,
        modelGroq,
        modelOpenAI,
        modelAnthropic,
        temperature,
        defaultPreset,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setProvider(DEFAULT_SETTINGS.provider);
    setApiKeyGemini('');
    setApiKeyGroq('');
    setApiKeyOpenAI('');
    setApiKeyAnthropic('');
    setProxyUrl('');
    setModelGemini(DEFAULT_SETTINGS.modelGemini);
    setModelGroq(DEFAULT_SETTINGS.modelGroq || 'llama-3.3-70b-versatile');
    setModelOpenAI(DEFAULT_SETTINGS.modelOpenAI);
    setModelAnthropic(DEFAULT_SETTINGS.modelAnthropic);
    setTemperature(DEFAULT_SETTINGS.temperature);
    setDefaultPreset(DEFAULT_SETTINGS.defaultPreset);

    if (onResetDefaults) {
      await onResetDefaults();
    } else {
      await onSaveSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 pb-8 text-xs text-slate-300">
      {/* Title & Privacy Badge */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">AI Provider & API Keys</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            BYOK (Bring Your Own Key) • Stored strictly locally in Chrome storage
          </p>
        </div>
        <div className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span>Local Only</span>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Active Provider Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Active Provider
        </label>

        {/* Prominent Auto-Failover Card */}
        <button
          type="button"
          onClick={() => setProvider('auto')}
          className={`w-full mb-2 p-3 rounded-lg border text-left transition-all ${
            provider === 'auto'
              ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-sm ring-1 ring-indigo-500/30'
              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold text-xs flex items-center space-x-1.5">
              <span>Auto-Failover (LLaMA 3.3 + Gemini 3.8 - Recommended)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
              Zero-Key Ready
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Automatic Failover: LLaMA 3.3 ➔ Gemini 3.8 ➔ Gemini 2.5 ➔ Offline Engine
          </div>
        </button>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setProvider('gemini')}
            className={`py-2 px-2 rounded-lg border text-center transition-all ${
              provider === 'gemini'
                ? 'border-indigo-500 bg-indigo-600/15 text-white font-medium shadow-sm'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-semibold text-xs">Gemini</div>
            <div className="text-[9px] text-emerald-400 mt-0.5">Free Tier</div>
          </button>

          <button
            type="button"
            onClick={() => setProvider('groq')}
            className={`py-2 px-2 rounded-lg border text-center transition-all ${
              provider === 'groq'
                ? 'border-indigo-500 bg-indigo-600/15 text-white font-medium shadow-sm'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-semibold text-xs">Groq</div>
            <div className="text-[9px] text-purple-400 mt-0.5">LLaMA 3.3</div>
          </button>

          <button
            type="button"
            onClick={() => setProvider('openai')}
            className={`py-2 px-2 rounded-lg border text-center transition-all ${
              provider === 'openai'
                ? 'border-indigo-500 bg-indigo-600/15 text-white font-medium shadow-sm'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-semibold text-xs">OpenAI</div>
            <div className="text-[9px] text-slate-400 mt-0.5">GPT-4o</div>
          </button>

          <button
            type="button"
            onClick={() => setProvider('anthropic')}
            className={`py-2 px-2 rounded-lg border text-center transition-all ${
              provider === 'anthropic'
                ? 'border-indigo-500 bg-indigo-600/15 text-white font-medium shadow-sm'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-semibold text-xs">Claude</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Sonnet 3.5</div>
          </button>
        </div>
      </div>

      {/* Auto Failover Info Card */}
      {provider === 'auto' && (
        <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-xs space-y-1">
          <div className="font-semibold text-white flex items-center space-x-1.5">
            <span>⚡ Multi-Model Failover Active</span>
          </div>
          <p className="text-[11px] text-slate-300">
            PromptForge AI operates automatically out-of-the-box with zero required setup. It cascades from high-throughput LLaMA 3.3 70B to Gemini 3.8 Flash, Gemini 2.5 Flash, and safely falls back to the Offline Engine.
          </p>
          <p className="text-[10px] text-slate-400">
            Manual API key fields below are optional overrides for users who supply personal keys.
          </p>
        </div>
      )}

      {/* Google Gemini Configuration */}
      <div
        className={`p-3 rounded-lg border transition-all ${
          provider === 'gemini'
            ? 'border-indigo-500/40 bg-slate-900/80 shadow-sm'
            : 'border-slate-800/80 bg-slate-900/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <span>Google Gemini</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">
              Recommended
            </span>
          </label>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            <span>Get Free Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key Input */}
        <div className="relative mb-2">
          <input
            type={showGeminiKey ? 'text' : 'password'}
            value={apiKeyGemini}
            onChange={(e) => setApiKeyGemini(e.target.value)}
            placeholder="Enter Gemini API Key (AIzaSy...)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowGeminiKey(!showGeminiKey)}
            title="Toggle password visibility"
            aria-label="Toggle password visibility"
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
          >
            {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Model</label>
          <select
            value={
              ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'].includes(modelGemini)
                ? modelGemini
                : 'custom'
            }
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setModelGemini(e.target.value);
              }
            }}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (Latest Fast Model)</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended, Generous Free Tier)</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash (Fast & Capable)</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
            <option value="custom">Custom Model Name...</option>
          </select>

          {!['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'].includes(modelGemini) && (
            <input
              type="text"
              value={modelGemini}
              onChange={(e) => setModelGemini(e.target.value)}
              placeholder="e.g. gemini-3.8-flash"
              className="mt-1.5 w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
        </div>
      </div>

      {/* Groq Configuration */}
      <div
        className={`p-3 rounded-lg border transition-all ${
          provider === 'groq'
            ? 'border-indigo-500/40 bg-slate-900/80 shadow-sm'
            : 'border-slate-800/80 bg-slate-900/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <span>Groq</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-normal">
              Ultra-Fast LLaMA
            </span>
          </label>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            <span>Get Groq Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key Input */}
        <div className="relative mb-2">
          <input
            type={showGroqKey ? 'text' : 'password'}
            value={apiKeyGroq}
            onChange={(e) => setApiKeyGroq(e.target.value)}
            placeholder="Enter Groq API Key (gsk_...)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowGroqKey(!showGroqKey)}
            title="Toggle password visibility"
            aria-label="Toggle password visibility"
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
          >
            {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Model</label>
          <select
            value={
              ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3.8-27b', 'llama-3.1-8b-instant'].includes(modelGroq)
                ? modelGroq
                : 'custom'
            }
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setModelGroq(e.target.value);
              }
            }}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (State-of-the-Art 120B Reasoning)</option>
            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Ultra-fast 70B LLaMA)</option>
            <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (27B Fast Coder)</option>
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest 8B)</option>
            <option value="custom">Custom Model Name...</option>
          </select>

          {!['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3.8-27b', 'llama-3.1-8b-instant'].includes(modelGroq) && (
            <input
              type="text"
              value={modelGroq}
              onChange={(e) => setModelGroq(e.target.value)}
              placeholder="e.g. llama-3.3-70b-versatile"
              className="mt-1.5 w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
        </div>
      </div>

      {/* OpenAI Configuration */}
      <div
        className={`p-3 rounded-lg border transition-all ${
          provider === 'openai'
            ? 'border-indigo-500/40 bg-slate-900/80 shadow-sm'
            : 'border-slate-800/80 bg-slate-900/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-slate-200 text-xs">OpenAI</label>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            <span>Get OpenAI Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key Input */}
        <div className="relative mb-2">
          <input
            type={showOpenAIKey ? 'text' : 'password'}
            value={apiKeyOpenAI}
            onChange={(e) => setApiKeyOpenAI(e.target.value)}
            placeholder="Enter OpenAI API Key (sk-...)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
            title="Toggle password visibility"
            aria-label="Toggle password visibility"
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
          >
            {showOpenAIKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Model</label>
          <select
            value={modelOpenAI}
            onChange={(e) => setModelOpenAI(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="gpt-4o-mini">gpt-4o-mini (Fast & Cost Efficient)</option>
            <option value="gpt-4o">gpt-4o (High Precision)</option>
            <option value="o3-mini">o3-mini (Reasoning Model)</option>
          </select>
        </div>
      </div>

      {/* Anthropic Claude Configuration */}
      <div
        className={`p-3 rounded-lg border transition-all ${
          provider === 'anthropic'
            ? 'border-indigo-500/40 bg-slate-900/80 shadow-sm'
            : 'border-slate-800/80 bg-slate-900/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-slate-200 text-xs">Anthropic Claude</label>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            <span>Get Claude Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key Input */}
        <div className="relative mb-2">
          <input
            type={showAnthropicKey ? 'text' : 'password'}
            value={apiKeyAnthropic}
            onChange={(e) => setApiKeyAnthropic(e.target.value)}
            placeholder="Enter Anthropic API Key (sk-ant-...)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
            title="Toggle password visibility"
            aria-label="Toggle password visibility"
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
          >
            {showAnthropicKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Model</label>
          <select
            value={modelAnthropic}
            onChange={(e) => setModelAnthropic(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="claude-3-5-sonnet-20241022">
              claude-3-5-sonnet-20241022 (State of the Art Coding)
            </option>
            <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Fast)</option>
            <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
          </select>
        </div>
      </div>

      {/* Cloud Relay Proxy (Optional Zero-Key Engine) */}
      <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/30 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300">
            Cloud Relay URL (Optional Zero-Key Mode)
          </label>
          <span className="text-[10px] text-indigo-400 font-mono">Cloudflare Worker</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Provide your deployed worker endpoint to generate prompts via hosted LLaMA 3.3 without storing API keys in Chrome. Leave blank to use direct BYOK or the built-in offline engine.
        </p>
        <input
          type="url"
          value={proxyUrl}
          onChange={(e) => setProxyUrl(e.target.value)}
          placeholder="https://promptforge-proxy.your-subdomain.workers.dev"
          aria-label="Cloud Relay Proxy URL"
          className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
        />
      </div>

      {/* Defaults & Temperature */}
      <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/30 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-slate-300">
              Temperature ({temperature.toFixed(2)})
            </label>
            <span className="text-[10px] text-slate-500">
              {temperature <= 0.3 ? 'Deterministic' : temperature <= 0.6 ? 'Balanced' : 'Creative'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Default Preset
          </label>
          <select
            value={defaultPreset}
            onChange={(e) => setDefaultPreset(e.target.value as PresetType)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="coding-agent">Coding Agent (Cursor, Claude Code)</option>
            <option value="rfc-spec">RFC & Architecture Spec</option>
            <option value="bugfix">Bug Fix & Root Cause Diagnosis</option>
            <option value="cursorrules">Cursor & IDE Rules</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.99]"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          title="Reset to defaults"
          aria-label="Reset to defaults"
          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 font-medium text-xs flex items-center space-x-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </form>
  );
};
