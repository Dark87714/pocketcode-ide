import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Send, Copy, Check, Terminal, FileCode, 
  Settings, Key, Trash2, ArrowDownToLine, RefreshCw, 
  Bug, Zap, HelpCircle, FileText, ChevronDown, ChevronRight, Split
} from 'lucide-react';
import { 
  aiService, AIProvider, AIMessage, AIConfig, 
  AVAILABLE_MODELS, CodeContext 
} from '../../services/aiService';
import { FileItem, DiagnosticProblem } from '../../types';

interface CopilotPanelProps {
  activeFile?: FileItem | null;
  selectedText?: string;
  cursorLine?: number;
  diagnostics?: DiagnosticProblem[];
  allFiles?: FileItem[];
  onInsertCode?: (code: string) => void;
  onReplaceFileContent?: (fileId: string, newContent: string) => void;
  onOpenDiff?: (original: string, modified: string, fileName: string) => void;
}

const CHAT_STORAGE_KEY = 'pocketcode_copilot_chat_history';

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  activeFile,
  selectedText,
  cursorLine,
  diagnostics = [],
  allFiles = [],
  onInsertCode,
  onReplaceFileContent,
  onOpenDiff
}) => {
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome to PocketCode Copilot!**\n\n⚡ **Zero Setup / Free Mode Active** (No API Key Required)\n\nI can help you:\n- 🚀 **Generate** full features, components, and code logic\n- 🐞 **Debug & Fix** errors in your active file\n- ⚡ **Optimize** & refactor existing functions\n- 🧪 **Write tests** or documentation\n\nAsk anything below or select a code snippet in the editor!`,
        timestamp: Date.now()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<AIConfig>(() => aiService.getConfig());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleUpdateConfig = (updates: Partial<AIConfig>) => {
    const updated = aiService.saveConfig(updates);
    setConfig(updated);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    if (!config.apiKey && config.provider !== 'free-ai' && config.provider !== 'ollama') {
      setIsConfigOpen(true);
      return;
    }

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: AIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);

    const activeDiagnostics = diagnostics
      .filter(d => !activeFile || d.fileId === activeFile.id)
      .map(d => `Line ${d.line}: [${d.severity.toUpperCase()}] ${d.message}`)
      .join('\n');

    const projectFilePaths = allFiles.map(f => f.path || f.name);

    const context: CodeContext = {
      fileName: activeFile?.name,
      filePath: activeFile?.path,
      language: activeFile?.language,
      fullCode: activeFile?.content,
      selectedCode: selectedText || undefined,
      cursorLine: cursorLine,
      diagnostics: activeDiagnostics || undefined,
      projectFiles: projectFilePaths
    };

    await aiService.streamChat(
      [...messages.filter(m => m.id !== 'welcome'), userMessage],
      context,
      (chunk) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      },
      (fullText) => {
        const blocks = aiService.extractCodeBlocks(fullText);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: fullText, codeBlocks: blocks, isStreaming: false }
              : m
          )
        );
        setIsLoading(false);
      },
      (error) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `❌ **Error:** ${error}\n\n*Please check your API key or model configuration in settings.*`,
                  isStreaming: false
                }
              : m
          )
        );
        setIsLoading(false);
      }
    );
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyToActiveFile = (code: string, id: string) => {
    if (activeFile && onReplaceFileContent) {
      onReplaceFileContent(activeFile.id, code);
      setAppliedId(id);
      setTimeout(() => setAppliedId(null), 2000);
    } else if (onInsertCode) {
      onInsertCode(code);
      setAppliedId(id);
      setTimeout(() => setAppliedId(null), 2000);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Chat history cleared. How can I assist you with your code today?`,
        timestamp: Date.now()
      }
    ]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] select-none text-xs">
      {/* Header Bar */}
      <div className="px-3 py-2 bg-[#252526] border-b border-[#333333] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-white">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          <span>COPILOT CHAT</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
            {config.provider.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`p-1.5 rounded hover:bg-[#333333] transition-colors ${
              isConfigOpen ? 'text-sky-400 bg-[#333333]' : 'text-[#888888] hover:text-white'
            }`}
            title="Configure AI API Key & Model"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded hover:bg-[#333333] text-[#888888] hover:text-rose-400 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* API Key / Model Settings Overlay */}
      {isConfigOpen && (
        <div className="p-3 bg-[#252526] border-b border-[#3c3c3c] space-y-2.5 animate-slide-down shrink-0">
          <div className="text-[11px] font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key size={13} className="text-amber-400" />
              <span>AI Provider & API Configuration</span>
            </span>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="text-[#888888] hover:text-white text-[10px] underline"
            >
              Close
            </button>
          </div>

          {/* Provider Selector */}
          <div>
            <label className="block text-[10px] text-[#888888] uppercase tracking-wider mb-1 font-semibold">
              Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => {
                const prov = e.target.value as AIProvider;
                const firstModel = AVAILABLE_MODELS[prov]?.[0]?.id || '';
                handleUpdateConfig({ provider: prov, model: firstModel });
              }}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
            >
              <option value="free-ai">⚡ Free Cloud AI (Zero API Key / Instant)</option>
              <option value="gemini">Google Gemini (Gemini 2.5 Flash / Pro)</option>
              <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
              <option value="claude">Anthropic Claude</option>
              <option value="openrouter">OpenRouter (DeepSeek R1, Llama 3)</option>
              <option value="ollama">Ollama / Local LLM</option>
              <option value="custom">Custom OpenAI-Compatible</option>
            </select>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-[10px] text-[#888888] uppercase tracking-wider mb-1 font-semibold">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => handleUpdateConfig({ model: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {AVAILABLE_MODELS[config.provider]?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key or Free Mode Banner */}
          {config.provider === 'free-ai' ? (
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <span>✨</span>
              <span><strong>Zero-Config Mode</strong>: Ready to generate code instantly with no API key.</span>
            </div>
          ) : config.provider !== 'ollama' ? (
            <div>
              <label className="block text-[10px] text-[#888888] uppercase tracking-wider mb-1 font-semibold flex items-center justify-between">
                <span>API Key</span>
                {config.provider === 'gemini' && (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline lowercase font-normal"
                  >
                    get free key ↗
                  </a>
                )}
              </label>
              <input
                type="password"
                placeholder={config.provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                value={config.apiKey}
                onChange={(e) => handleUpdateConfig({ apiKey: e.target.value })}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          ) : null}

          {/* Custom Endpoint */}
          {(config.provider === 'ollama' || config.provider === 'custom') && (
            <div>
              <label className="block text-[10px] text-[#888888] uppercase tracking-wider mb-1 font-semibold">
                Endpoint URL
              </label>
              <input
                type="text"
                placeholder={config.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.yourserver.com/v1'}
                value={config.customEndpoint || ''}
                onChange={(e) => handleUpdateConfig({ customEndpoint: e.target.value })}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          )}
        </div>
      )}

      {/* Active Editor Context Pill */}
      {activeFile && (
        <div className="px-3 py-1.5 bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between text-[11px] text-[#888888] shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <FileCode size={13} className="text-sky-400 shrink-0" />
            <span className="font-mono text-white truncate">{activeFile.name}</span>
            {selectedText && (
              <span className="text-[9px] px-1 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-800">
                Snippet Selected
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase font-mono text-[#666666]">{activeFile.language}</span>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="px-2 py-1.5 bg-[#222222] border-b border-[#2d2d2d] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => handleSendMessage(`Explain how this ${activeFile?.name || 'file'} works and break down the logic step by step.`)}
          className="px-2 py-1 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded-md text-[10px] font-medium flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
        >
          <HelpCircle size={11} className="text-sky-400" />
          <span>Explain</span>
        </button>
        <button
          onClick={() => handleSendMessage(`Analyze the active file for any bugs, type errors, or syntax issues, and output the fully fixed code.`)}
          className="px-2 py-1 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded-md text-[10px] font-medium flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
        >
          <Bug size={11} className="text-rose-400" />
          <span>Fix Bugs</span>
        </button>
        <button
          onClick={() => handleSendMessage(`Refactor and optimize the active code for maximum performance, clean architecture, and modern best practices.`)}
          className="px-2 py-1 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded-md text-[10px] font-medium flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
        >
          <Zap size={11} className="text-amber-400" />
          <span>Optimize</span>
        </button>
        <button
          onClick={() => handleSendMessage(`Generate comprehensive unit tests for all exported functions/classes in ${activeFile?.name || 'this file'}.`)}
          className="px-2 py-1 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded-md text-[10px] font-medium flex items-center gap-1 whitespace-nowrap active:scale-95 transition-all"
        >
          <FileText size={11} className="text-emerald-400" />
          <span>Unit Tests</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const blocks = aiService.extractCodeBlocks(msg.content);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[94%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#007acc] text-white rounded-br-none shadow-md font-medium'
                    : 'bg-[#252526] text-[#e0e0e0] border border-[#333333] rounded-bl-none shadow'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center gap-1.5 mb-1.5 opacity-60 text-[10px]">
                  {isUser ? (
                    <span className="font-semibold">You</span>
                  ) : (
                    <span className="font-semibold flex items-center gap-1 text-sky-300">
                      <Bot size={12} /> PocketCode Copilot
                    </span>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Message Body with Markdown formatting & code rendering */}
                <div className="whitespace-pre-wrap font-sans text-xs space-y-2">
                  {msg.content.split(/```[a-zA-Z0-9_\-+]*\n[\s\S]*?```/g).map((chunk, i) => (
                    <span key={i}>{chunk}</span>
                  ))}
                </div>

                {/* Rendered Code Blocks with VS Code Action Buttons */}
                {blocks.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {blocks.map((block, bIdx) => {
                      const blockId = `${msg.id}_b_${bIdx}`;
                      const isCopied = copiedId === blockId;
                      const isApplied = appliedId === blockId;

                      return (
                        <div key={bIdx} className="rounded-lg overflow-hidden border border-[#3c3c3c] bg-[#141414]">
                          {/* Code Block Header */}
                          <div className="px-2.5 py-1 bg-[#1a1a1a] border-b border-[#2d2d2d] flex items-center justify-between text-[10px]">
                            <span className="font-mono text-sky-400 uppercase font-bold">{block.language || 'code'}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopy(block.code, blockId)}
                                className="px-2 py-0.5 rounded bg-[#252526] hover:bg-[#333333] text-[#cccccc] hover:text-white flex items-center gap-1 transition-colors"
                                title="Copy code"
                              >
                                {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                              {activeFile && (
                                <button
                                  onClick={() => handleApplyToActiveFile(block.code, blockId)}
                                  className="px-2 py-0.5 rounded bg-[#007acc]/20 hover:bg-[#007acc]/40 text-sky-300 flex items-center gap-1 border border-sky-700/50 transition-colors"
                                  title="Apply directly to active file"
                                >
                                  {isApplied ? <Check size={11} className="text-emerald-400" /> : <ArrowDownToLine size={11} />}
                                  <span>{isApplied ? 'Applied' : 'Apply to File'}</span>
                                </button>
                              )}
                              {activeFile && onOpenDiff && (
                                <button
                                  onClick={() => onOpenDiff(activeFile.content, block.code, activeFile.name)}
                                  className="px-2 py-0.5 rounded bg-[#252526] hover:bg-[#333333] text-[#aaaaaa] hover:text-white flex items-center gap-1 transition-colors"
                                  title="View Side-by-Side Diff"
                                >
                                  <Split size={11} />
                                  <span>Diff</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Code Block Content */}
                          <pre className="p-2.5 text-[11px] font-mono overflow-x-auto text-[#d4d4d4] leading-relaxed select-text">
                            <code>{block.code}</code>
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                )}

                {msg.isStreaming && (
                  <div className="flex items-center gap-1 mt-2 text-sky-400 text-[10px] animate-pulse">
                    <RefreshCw size={11} className="animate-spin" />
                    <span>Generating intelligent code response...</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-2.5 bg-[#252526] border-t border-[#333333] shrink-0">
        <div className="relative flex items-end gap-1.5 bg-[#1e1e1e] rounded-xl border border-[#3c3c3c] focus-within:border-sky-500 p-1.5 shadow-inner">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Copilot (e.g. 'Build an express route', 'Fix bug on line 12')..."
            className="w-full bg-transparent text-white text-xs placeholder-[#666666] focus:outline-none resize-none px-2 py-1 max-h-28"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-lg font-bold text-xs flex items-center justify-center transition-all shrink-0 ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md active:scale-95'
                : 'bg-[#2a2a2a] text-[#555555] cursor-not-allowed'
            }`}
            title="Send prompt to Copilot"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1 text-[9px] text-[#666666] px-1">
          <span>Enter to send, Shift+Enter for newline</span>
          <span>⚡ Context Aware ({config.model})</span>
        </div>
      </div>
    </div>
  );
};
