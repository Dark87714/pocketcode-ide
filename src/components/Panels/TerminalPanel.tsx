import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Plus, X, Trash2, Send, CornerDownLeft, Sparkles } from 'lucide-react';
import { terminalService, TerminalLine } from '../../services/terminalService';
import { fileSystemService } from '../../services/fileSystem';

interface TerminalTab {
  id: string;
  name: string;
  lines: TerminalLine[];
}

const COMMON_COMMANDS = [
  'help', 'man', 'ls', 'dir', 'tree', 'cd', 'pwd', 'cat', 'tac', 'head', 'tail', 'more', 'less',
  'touch', 'mkdir', 'rm', 'rmdir', 'cp', 'mv', 'find', 'grep', 'wc', 'stat', 'diff', 'file',
  'echo', 'base64', 'md5sum', 'sha256sum', 'sort', 'uniq', 'rev', 'tr', 'cut', 'sed', 'awk',
  'whoami', 'id', 'hostname', 'uname', 'date', 'cal', 'uptime', 'env', 'export', 'alias',
  'ps', 'top', 'htop', 'kill', 'free', 'history', 'clear', 'neofetch',
  'python', 'pip', 'node', 'npm', 'yarn', 'pnpm', 'npx', 'sql', 'sqlite3',
  'git', 'curl', 'wget', 'ping', 'code', 'open', 'preview', 'zip', 'tar',
  'cowsay', 'fortune', 'figlet', 'matrix', 'sl', 'weather'
];

export const TerminalPanel: React.FC = () => {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'term_1',
      name: '1: bash',
      lines: [
        {
          id: 'init_welcome',
          type: 'system',
          content: `🌟 Welcome to PocketCode Developer Terminal (Unix/POSIX v2.5)
Type 'help' to see all 80+ terminal commands, or 'man <command>' for syntax.
Try: 'python main.py', 'pip install numpy', 'npm i lodash', 'git status', or 'neofetch'.`
        }
      ]
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('term_1');
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPromptDir, setCurrentPromptDir] = useState(terminalService.getCurrentDir());
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab?.lines]);

  const handleCommand = async (commandToRun?: string) => {
    const cmd = commandToRun !== undefined ? commandToRun : input;
    if (!cmd.trim() || isExecuting) return;

    setInput('');
    setHistoryIndex(-1);
    setIsExecuting(true);

    try {
      await terminalService.executeCommand(
        cmd,
        (line) => {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId ? { ...t, lines: [...t.lines, line] } : t
            )
          );
        },
        () => {
          setTabs((prev) =>
            prev.map((t) => (t.id === activeTabId ? { ...t, lines: [] } : t))
          );
        }
      );
    } finally {
      setCurrentPromptDir(terminalService.getCurrentDir());
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCommandRef = useRef(handleCommand);
  handleCommandRef.current = handleCommand;

  useEffect(() => {
    const handleRunCmdEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setTimeout(() => {
          handleCommandRef.current(customEvent.detail);
        }, 50);
      }
    };
    window.addEventListener('pocketcode:terminal-run-command', handleRunCmdEvent);
    return () => window.removeEventListener('pocketcode:terminal-run-command', handleRunCmdEvent);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const history = terminalService.getHistory();

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.split(' ');
      const currentToken = parts[parts.length - 1];
      if (!currentToken) return;

      if (parts.length === 1) {
        // Auto-complete command
        const match = COMMON_COMMANDS.find(c => c.startsWith(currentToken.toLowerCase()));
        if (match) {
          setInput(match);
        }
      } else {
        // Auto-complete file/folder name
        const files = fileSystemService.getAllFlatFiles();
        const match = files.find(f => f.name.toLowerCase().startsWith(currentToken.toLowerCase()) || f.path.toLowerCase().startsWith(currentToken.toLowerCase()));
        if (match) {
          parts[parts.length - 1] = match.path;
          setInput(parts.join(' '));
        }
      }
    }
  };

  const handleCreateTab = () => {
    const newId = `term_${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      name: `${tabs.length + 1}: bash`,
      lines: [
        {
          id: `init_${Date.now()}`,
          type: 'system',
          content: `PocketCode Shell Session #${tabs.length + 1} initialized in ${terminalService.getCurrentDir()}`
        }
      ]
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const quickCommands = [
    { label: '❓ help', cmd: 'help' },
    { label: '📁 ls -la', cmd: 'ls -la' },
    { label: '🌳 tree', cmd: 'tree' },
    { label: '🐍 python', cmd: 'python main.py' },
    { label: '📦 pip list', cmd: 'pip list' },
    { label: '📦 npm i lodash', cmd: 'npm i lodash' },
    { label: '🐙 git status', cmd: 'git status' },
    { label: '📊 git log', cmd: 'git log --oneline' },
    { label: '⚡ ps / top', cmd: 'top' },
    { label: '🚀 neofetch', cmd: 'neofetch' },
    { label: '🐮 cowsay', cmd: 'cowsay Welcome to PocketCode!' },
    { label: '🔮 fortune', cmd: 'fortune' },
    { label: '🧹 clear', cmd: 'clear' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#181818] text-[#cccccc] font-mono text-xs select-none">
      {/* Multi-Tab Terminal Header */}
      <div className="h-8 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          {tabs.map((t) => {
            const isActive = t.id === activeTabId;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#252526] text-white border-t-2 border-t-[#007acc] font-semibold'
                    : 'text-[#858585] hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <TermIcon size={12} className={isActive ? 'text-emerald-400' : ''} />
                <span>{t.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(t.id, e)}
                    className="p-0.5 rounded hover:bg-white/20 text-[#858585] hover:text-white"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleCreateTab}
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2a2a] transition-colors"
            title="New Terminal Session"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, lines: [] } : t))
              )
            }
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2a2a] shrink-0"
            title="Clear Buffer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e]/60 border-b border-[#2d2d2d] overflow-x-auto no-scrollbar shrink-0">
        {quickCommands.map((qc) => (
          <button
            key={qc.label}
            onClick={() => handleCommand(qc.cmd)}
            disabled={isExecuting}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] active:bg-[#007acc] text-[#aaaaaa] hover:text-white text-[11px] font-mono shrink-0 transition-colors"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* Terminal Output Log */}
      <div
        className="flex-1 overflow-y-auto p-2.5 space-y-1 selectable-text cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {activeTab?.lines.map((l) => {
          let colorClass = 'text-[#cccccc]';
          if (l.type === 'input') colorClass = 'text-sky-400 font-bold';
          if (l.type === 'error') colorClass = 'text-rose-400 font-medium';
          if (l.type === 'success') colorClass = 'text-emerald-400 font-medium';
          if (l.type === 'info') colorClass = 'text-purple-300';
          if (l.type === 'system') colorClass = 'text-amber-300 font-semibold';

          return (
            <div key={l.id} className={`whitespace-pre-wrap leading-relaxed ${colorClass}`}>
              {l.content}
            </div>
          );
        })}
        {isExecuting && (
          <div className="flex items-center gap-2 text-sky-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Processing command...</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Interactive Command Input Line */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCommand();
        }}
        className="flex items-center px-2.5 py-1.5 bg-[#141414] border-t border-[#2d2d2d] gap-1.5 shrink-0"
      >
        <span className="text-emerald-400 font-bold text-[11px] whitespace-nowrap">
          guest@pocketcode:<span className="text-sky-400">{currentPromptDir}</span>$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command (e.g. 'help', 'ls -la', 'python main.py', 'git status')..."
          disabled={isExecuting}
          className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-[#555555]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isExecuting}
          className="p-1 rounded bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-30 text-white shrink-0"
          title="Send Command (Enter)"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
};
