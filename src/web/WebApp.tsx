import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  Trash2,
  ExternalLink,
  Github,
  Code2,
  Zap,
  Sliders,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PresetType, PromptIntent } from '../types';
import { compileMetaPrompt, detectPromptIntent } from '../services/prompt-engine/compiler';
import { FailoverRouter, LocalSynthesizer } from '../services/ai/failover-router';
import { storageService } from '../services/storage';

const POPULAR_STACKS = [
  'Python',
  'React',
  'TypeScript',
  'FastAPI',
  'Node.js',
  'Tailwind CSS',
  'Go',
  'Rust',
  'PostgreSQL',
  'Docker',
];

const PRESETS: Array<{ id: PresetType; name: string; desc: string }> = [
  { id: 'coding-agent', name: 'Coding Agent', desc: 'Cursor, Claude Code, Copilot' },
  { id: 'rfc-spec', name: 'RFC Architecture Spec', desc: 'System design & data schemas' },
  { id: 'bugfix', name: 'Bug Fix & Root Cause', desc: 'Diagnosis, edge cases & repair' },
  { id: 'cursorrules', name: 'IDE Rules (.cursorrules)', desc: 'Strict coding conventions' },
];

const INSPIRATION_PROMPTS = [
  'python app for sorting shopping list and prices',
  'make an python app to monitor weather telemetry',
  'bulletproof jwt authentication middleware with refresh tokens',
  'high throughput web scraper with proxy rotation and playwright',
];

export const WebApp: React.FC = () => {
  const [rawInput, setRawInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('coding-agent');
  const [techStack, setTechStack] = useState<string[]>(['Python']);
  const [newTech, setNewTech] = useState('');
  const [detailLevel, setDetailLevel] = useState<'brief' | 'standard' | 'comprehensive'>('standard');
  const [outputPrompt, setOutputPrompt] = useState('');
  const [activeModel, setActiveModel] = useState<string>('openai/gpt-oss-120b');
  const [intent, setIntent] = useState<PromptIntent | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const liveIntent = detectPromptIntent(rawInput);

  // Toggle tech stack item
  const toggleTech = (tech: string) => {
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const addCustomTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTech.trim() && !techStack.includes(newTech.trim())) {
      setTechStack((prev) => [...prev, newTech.trim()]);
      setNewTech('');
    }
  };

  const handleEnhance = async () => {
    if (!rawInput.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setOutputPrompt('');

    const compiled = compileMetaPrompt({
      rawInput: rawInput.trim(),
      preset: selectedPreset,
      techStack,
      additionalContext: detailLevel !== 'standard' ? `Detail Level: ${detailLevel}` : undefined,
    });

    setIntent(compiled.intent);

    try {
      // 1. Try Vercel Serverless Function first (Zero-Key proxy)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: compiled.systemPrompt,
          userPrompt: compiled.userPrompt,
          model: 'openai/gpt-oss-120b',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOutputPrompt(data.content);
        setActiveModel(data.model || 'openai/gpt-oss-120b');
        await storageService.addHistoryItem({
          rawInput: rawInput.trim(),
          enhancedPrompt: data.content,
          preset: selectedPreset,
          techStack,
          isFavorite: false,
          activeModelUsed: data.model || 'openai/gpt-oss-120b',
          intent: compiled.intent,
        });
        return;
      }

      // 2. If API fails (e.g. running locally without Vercel CLI), use client-side router
      const settings = await storageService.getSettings();
      const router = new FailoverRouter({
        apiKeyGroq: settings.apiKeyGroq,
        apiKeyGemini: settings.apiKeyGemini,
      });

      const result = await router.generatePrompt(
        compiled.systemPrompt,
        compiled.userPrompt,
        (chunk) => {
          setOutputPrompt((prev) => prev + chunk);
        }
      );

      setOutputPrompt(result);
      setActiveModel(router.getActiveModelUsed());
      await storageService.addHistoryItem({
        rawInput: rawInput.trim(),
        enhancedPrompt: result,
        preset: selectedPreset,
        techStack,
        isFavorite: false,
        activeModelUsed: router.getActiveModelUsed(),
        intent: compiled.intent,
      });
    } catch (err: unknown) {
      console.warn('API error, falling back to offline synthesizer', err);
      const synth = new LocalSynthesizer();
      const localResult = await synth.generatePrompt(compiled.systemPrompt, compiled.userPrompt);
      setOutputPrompt(localResult);
      setActiveModel('local-synthesizer');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!outputPrompt) return;
    navigator.clipboard.writeText(outputPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!outputPrompt) return;
    const blob = new Blob([outputPrompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptforge-${selectedPreset}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut Ctrl + Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleEnhance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rawInput, selectedPreset, techStack, detailLevel, isGenerating]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">PromptForge AI</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Web Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Professional Coding Prompt Generator & Spec Compiler
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Model Badge */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Engine:</span>
              <span className="text-emerald-400 font-medium">GPT-OSS 120B (Groq)</span>
            </div>

            {/* Install Chrome Extension Button */}
            <a
              href="https://github.com/JISHU-GHOSH/prompt-generator#installation--usage"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Add to Chrome</span>
            </a>

            {/* GitHub Repo */}
            <a
              href="https://github.com/JISHU-GHOSH/prompt-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="View on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Studio Dual-Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt Inputs */}
        <section className="lg:col-span-5 flex flex-col space-y-5">
          {/* Prompt Input Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Your Casual Thought or Idea</span>
                  </label>
                  {rawInput.trim() && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                        liveIntent === 'followup'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}
                    >
                      {liveIntent === 'followup' ? '⚡ Follow-Up Steer' : '🎯 Project Kickoff'}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {rawInput.length} chars
                </span>
              </div>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="e.g. python app for sorting shopping list and prices..."
                rows={5}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed"
              />
            </div>

            {/* Prompt Inspiration Chips */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-2">
                Quick Examples
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setRawInput(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-800/80 transition-colors text-left truncate max-w-full"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Compiler Preset</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedPreset === p.id
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Stack Chips */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Target Technologies
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {POPULAR_STACKS.map((tech) => {
                  const isSelected = techStack.includes(tech);
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => toggleTech(tech)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {tech}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tech Input */}
              <form onSubmit={addCustomTech} className="flex space-x-1.5">
                <input
                  type="text"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  placeholder="Add custom library or framework..."
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium border border-slate-700 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Detail Level Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Detail Level</span>
                </label>
                <span className="text-[11px] text-indigo-400 capitalize font-medium">
                  {detailLevel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['brief', 'standard', 'comprehensive'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDetailLevel(lvl)}
                    className={`py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                      detailLevel === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhance Button */}
            <button
              type="button"
              onClick={handleEnhance}
              disabled={!rawInput.trim() || isGenerating}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
                !rawInput.trim() || isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>
                    {liveIntent === 'followup'
                      ? 'Synthesizing Surgical Mini-Prompt...'
                      : 'Synthesizing 120B Master Prompt...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>
                    {liveIntent === 'followup'
                      ? 'Synthesize Mini-Prompt (Follow-Up)'
                      : 'Enhance Prompt (Kickoff)'}
                  </span>
                  <span className="text-[10px] opacity-75 font-mono ml-1 hidden sm:inline">(Ctrl+Enter)</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Column: Generated Specification Viewer */}
        <section className="lg:col-span-7 flex flex-col">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex-1 flex flex-col">
            {/* Output Header Toolbar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {intent === 'followup'
                    ? 'Surgical Steering Mini-Prompt'
                    : 'Compiled Technical Specification'}
                </span>
                {intent === 'followup' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                    ⚡ Follow-Up Steer
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                    🎯 Project Kickoff
                  </span>
                )}
                {activeModel && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                    ⚡ {activeModel}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  disabled={!outputPrompt}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-all ${
                    copied
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={downloadMarkdown}
                  disabled={!outputPrompt}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Download Markdown (.md)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setOutputPrompt('')}
                  disabled={!outputPrompt}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Clear Output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Output Display Area */}
            <div className="flex-1 flex flex-col justify-center">
              {outputPrompt ? (
                <div className="relative flex-1">
                  <pre className="w-full h-[520px] overflow-y-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs sm:text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/30">
                    {outputPrompt}
                  </pre>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{outputPrompt.split(/\s+/).filter(Boolean).length} words</span>
                    <span>~{Math.round(outputPrompt.length / 4)} tokens</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">
                    Your Enhanced Specification Will Appear Here
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                    Type a casual coding goal on the left and hit <strong>Enhance Prompt</strong> to compile an authoritative technical specification.
                  </p>
                  <div className="inline-flex items-center space-x-2 text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Zero-Key Serverless Mode Active</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-4 mt-8 text-center text-xs text-slate-500">
        <p>
          PromptForge AI • Built with React 18, Tailwind CSS & Groq LPUs • MIT Licensed •{' '}
          <a
            href="https://github.com/JISHU-GHOSH/prompt-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
};
