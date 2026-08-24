import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Key, X, Copy, Check, RefreshCw, Sparkles, Code2, Wrench, TestTube, FileText } from 'lucide-react';
import { aiService, ChatMessage } from '../../services/aiService';

interface AIChatPanelProps {
  activeFileContent?: string;
  activeFileLanguage?: string;
  activeFileName?: string;
}

const QUICK_ACTIONS = [
  { icon: <Code2 size={11} />, label: 'Explain Code', action: 'explain' },
  { icon: <Wrench size={11} />, label: 'Refactor', action: 'refactor' },
  { icon: <TestTube size={11} />, label: 'Generate Tests', action: 'tests' },
  { icon: <FileText size={11} />, label: 'Add Docs', action: 'docs' },
];

function MarkdownText({ text }: { text: string }) {
  // Simple markdown renderer for chat messages
  const parts = text.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```([\w]*)\n([\s\S]*)```$/);
        if (codeMatch) {
          return (
            <pre key={i} className="bg-black/40 rounded p-2 text-[10px] font-mono text-green-300 overflow-x-auto whitespace-pre-wrap">
              {codeMatch[2]}
            </pre>
          );
        }
        return (
          <p key={i} className="text-[11px] leading-relaxed whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </div>
  );
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  activeFileContent,
  activeFileLanguage,
  activeFileName
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHasKey(aiService.hasApiKey());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveKey = () => {
    if (apiKeyInput.trim()) {
      aiService.saveApiKey(apiKeyInput.trim());
      setHasKey(true);
      setShowKeyInput(false);
      setApiKeyInput('');
    }
  };

  const addMessage = (role: 'user' | 'model', content: string): ChatMessage => {
    const msg: ChatMessage = { id: `${Date.now()}_${role}`, role, content, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const send = async (text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    addMessage('user', trimmed);
    setIsLoading(true);

    try {
      const reply = await aiService.chat(
        messages,
        trimmed,
        activeFileContent ? `File: ${activeFileName}\n${activeFileContent}` : undefined
      );
      addMessage('model', reply);
    } catch (e: any) {
      addMessage('model', `**Error:** ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const quickAction = async (action: string) => {
    if (!activeFileContent) {
      addMessage('model', 'No file is currently open. Open a file to use quick actions.');
      return;
    }
    const lang = activeFileLanguage || 'code';

    setIsLoading(true);
    let label = '';
    let promise: Promise<string>;

    if (action === 'explain') {
      label = `Explain ${activeFileName}`;
      promise = aiService.explainCode(activeFileContent, lang);
    } else if (action === 'refactor') {
      label = `Refactor ${activeFileName}`;
      promise = aiService.refactorCode(activeFileContent, lang);
    } else if (action === 'tests') {
      label = `Generate tests for ${activeFileName}`;
      promise = aiService.generateTests(activeFileContent, lang);
    } else {
      label = `Add documentation to ${activeFileName}`;
      promise = aiService.generateDocstring(activeFileContent, lang);
    }

    addMessage('user', label);

    try {
      const reply = await promise;
      addMessage('model', reply);
    } catch (e: any) {
      addMessage('model', `**Error:** ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] text-xs select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#333333] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Bot size={13} className="text-violet-400" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-[#999999]">AI ASSISTANT</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold">Gemini</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1 rounded hover:bg-white/10 text-[#858585] hover:text-white"
              title="Clear chat"
            >
              <RefreshCw size={11} />
            </button>
          )}
          <button
            onClick={() => setShowKeyInput(v => !v)}
            className={`p-1 rounded hover:bg-white/10 ${hasKey ? 'text-emerald-400' : 'text-amber-400'}`}
            title={hasKey ? 'API key configured' : 'Set API key'}
          >
            <Key size={11} />
          </button>
        </div>
      </div>

      {/* API Key input */}
      {showKeyInput && (
        <div className="px-3 py-2 bg-[#252526] border-b border-[#333333] shrink-0">
          <p className="text-[10px] text-[#999] mb-1.5">Enter your Gemini API key (<a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-sky-400 underline">Get one free</a>):</p>
          <div className="flex gap-1">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder="AIzaSy..."
              className="flex-1 bg-[#1e1e1e] border border-[#444] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-violet-500"
            />
            <button onClick={saveKey} className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-semibold">
              Save
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#2d2d2d] overflow-x-auto no-scrollbar shrink-0">
        <Sparkles size={10} className="text-violet-400 shrink-0" />
        {QUICK_ACTIONS.map(qa => (
          <button
            key={qa.action}
            onClick={() => quickAction(qa.action)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-violet-600/30 hover:text-violet-300 text-[#aaa] text-[10px] shrink-0 transition-colors disabled:opacity-40"
          >
            {qa.icon}
            {qa.label}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-60">
            <Bot size={28} className="text-violet-400" />
            <div>
              <p className="text-[11px] font-semibold text-white mb-1">Gemini AI Assistant</p>
              <p className="text-[10px] text-[#777]">
                Ask anything about your code, use quick actions above, or type a question below.
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`group flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[95%] px-2.5 py-2 rounded-lg text-[11px] relative ${
                msg.role === 'user'
                  ? 'bg-violet-600/30 text-white border border-violet-500/30'
                  : 'bg-[#252526] text-[#d4d4d4] border border-[#333]'
              }`}
            >
              <MarkdownText text={msg.content} />
              <button
                onClick={() => copyMessage(msg.id, msg.content)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all"
                title="Copy"
              >
                {copiedId === msg.id ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} className="text-[#777]" />}
              </button>
            </div>
            <span className="text-[9px] text-[#555]">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-[#252526] border border-[#333] px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#777]">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#333] px-2 py-2 shrink-0">
        {activeFileName && (
          <div className="flex items-center gap-1 mb-1.5 text-[9px] text-[#555]">
            <Code2 size={9} />
            <span>Context: {activeFileName}</span>
          </div>
        )}
        <div className="flex gap-1 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Gemini... (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 bg-[#252526] border border-[#3c3c3c] rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-violet-500 resize-none placeholder-[#555] font-sans"
          />
          <button
            onClick={() => send()}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-white transition-colors shrink-0"
            title="Send (Enter)"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
