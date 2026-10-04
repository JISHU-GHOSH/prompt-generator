import React, { useState } from 'react';
import { Copy, Check, Send, CheckCircle2, Bookmark, BookmarkCheck } from 'lucide-react';

export interface OutputViewerProps {
  prompt: string;
  activeModel?: string;
  isStreaming?: boolean;
  onSendToTab?: () => Promise<boolean | void> | void;
  onSave?: () => Promise<void> | void;
  isSaved?: boolean;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({
  prompt,
  activeModel,
  isStreaming = false,
  onSendToTab,
  onSave,
  isSaved = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [sentStatus, setSentStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const charCount = prompt.length;
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const estimatedTokens = Math.ceil(charCount / 4);

  const renderModelBadge = () => {
    if (!activeModel) return null;
    const lower = activeModel.toLowerCase();

    if (lower.includes('llama') || lower === 'llama-3.3-70b-versatile') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <span>⚡ LLaMA 3.3 70B</span>
        </span>
      );
    }
    if (lower.includes('gemini-3.8') || lower === 'gemini-3.8-flash') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <span>✨ Gemini 3.8 Flash</span>
        </span>
      );
    }
    if (lower.includes('gemini-2.5') || lower === 'gemini-2.5-flash') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
          <span>✨ Gemini 2.5 Flash</span>
        </span>
      );
    }
    if (
      lower.includes('local-synthesizer') ||
      lower.includes('synthesizer') ||
      lower.includes('offline')
    ) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span>🛡️ Offline Engine</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
        <span>{activeModel}</span>
      </span>
    );
  };

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleSend = async () => {
    if (!onSendToTab || !prompt) return;
    setSentStatus('sending');
    try {
      await onSendToTab();
      setSentStatus('sent');
      setTimeout(() => setSentStatus('idle'), 2500);
    } catch (err) {
      console.error('Failed to send to active tab', err);
      setSentStatus('error');
      setTimeout(() => setSentStatus('idle'), 3000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/80 overflow-hidden shadow-lg shadow-black/40 flex flex-col">
      {/* Top action & stat bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-200">Result</span>
          {renderModelBadge()}
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span>~{estimatedTokens} tokens</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {onSave && (
            <button
              onClick={onSave}
              title={isSaved ? 'Saved in library' : 'Save to library'}
              aria-label="Save prompt"
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                isSaved
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium text-amber-300">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Save</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            aria-label="Copy prompt to clipboard"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              copied
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {onSendToTab && (
            <button
              onClick={handleSend}
              disabled={sentStatus === 'sending'}
              title="Send to active tab"
              aria-label="Send prompt to active tab"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                sentStatus === 'sent'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : sentStatus === 'error'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500'
              }`}
            >
              {sentStatus === 'sent' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sent to Tab!</span>
                </>
              ) : sentStatus === 'error' ? (
                <span>Tab Error</span>
              ) : sentStatus === 'sending' ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Tab</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Output Content */}
      <div className="p-3.5 text-xs text-slate-200 font-mono leading-relaxed overflow-y-auto max-h-[380px] whitespace-pre-wrap select-text selection:bg-indigo-500/30 selection:text-white">
        {prompt}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
};
