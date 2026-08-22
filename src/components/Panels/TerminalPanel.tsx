import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Plus, X, Trash2 } from 'lucide-react';
import { terminalService, TerminalLine } from '../../services/terminalService';
import { fileSystemService } from '../../services/fileSystem';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalTab {
  id: string;
  name: string;
}

export const TerminalPanel: React.FC = () => {
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: 'term_1', name: '1: bash' }]);
  const [activeTabId, setActiveTabId] = useState('term_1');

  // We keep a reference to active terminal instances so we don't recreate them.
  const terminals = useRef<Record<string, { term: Terminal, fitAddon: FitAddon, currentLine: string, isExecuting: boolean }>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const writePrompt = (term: Terminal) => {
    const projectName = fileSystemService.getCurrentProjectName() || 'project';
    const currentPromptDir = terminalService.getCurrentDir();
    const cleanDir = currentPromptDir === '/workspace' ? '' : currentPromptDir.replace(/^\/workspace/, '');
    const prompt = `\x1b[1;32muser@mobile\x1b[0m:\x1b[1;34m~/${projectName}${cleanDir}\x1b[0m$ `;
    term.write(prompt);
  };

  const initTerminal = (id: string, container: HTMLDivElement) => {
    if (terminals.current[id]) return;

    const term = new Terminal({
      theme: {
        background: '#181818',
        foreground: '#cccccc',
        cursor: '#cccccc'
      },
      fontFamily: 'monospace, "Courier New", courier',
      fontSize: 12,
      cursorBlink: true,
      convertEol: true // Ensures \n is converted to \r\n
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    terminals.current[id] = { term, fitAddon, currentLine: '', isExecuting: false };

    term.write('🌟 PocketCode Virtual Shell v2.5\r\n');
    term.write('Running xterm.js native rendering instance.\r\n\r\n');
    writePrompt(term);

    term.onData(async (e) => {
      const tInfo = terminals.current[id];
      if (!tInfo || tInfo.isExecuting) return;

      switch (e) {
        case '\r': // Enter
          term.write('\r\n');
          const cmd = tInfo.currentLine.trim();
          tInfo.currentLine = '';
          
          if (cmd) {
            tInfo.isExecuting = true;
            try {
              await terminalService.executeCommand(
                cmd,
                (line: TerminalLine) => {
                  let prefix = '';
                  if (line.type === 'error') prefix = '\x1b[31m';
                  else if (line.type === 'success') prefix = '\x1b[32m';
                  else if (line.type === 'info') prefix = '\x1b[35m';
                  else if (line.type === 'system') prefix = '\x1b[33m';
                  else if (line.type === 'input') return; // Don't print input twice
                  
                  // Convert newlines to crlf for xterm
                  const content = (line.content || '').replace(/\r?\n/g, '\r\n');
                  term.write(prefix + content + '\x1b[0m\r\n');
                },
                () => {
                  term.clear();
                }
              );
            } finally {
              tInfo.isExecuting = false;
            }
          }
          writePrompt(term);
          break;
        case '\x7F': // Backspace
          if (tInfo.currentLine.length > 0) {
            term.write('\b \b');
            tInfo.currentLine = tInfo.currentLine.slice(0, -1);
          }
          break;
        case '\x03': // Ctrl+C
          term.write('^C\r\n');
          tInfo.currentLine = '';
          writePrompt(term);
          break;
        default:
          // B10 fix: filter out ANSI escape sequences (arrow keys, F-keys, etc.) before they
          // corrupt currentLine. Multi-byte sequences that start with \x1b are control codes.
          if (!e.startsWith('\x1b') && (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e.length >= 2)) {
            tInfo.currentLine += e;
            term.write(e);
          }
      }
    });
  };

  useEffect(() => {
    const handleResize = () => {
      Object.values(terminals.current).forEach(({ fitAddon }) => {
        try { fitAddon.fit(); } catch(e){}
      });
    };
    window.addEventListener('resize', handleResize);
    
    // Allow terminal resizing to settle on first mount
    const timeout = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, []);

  const quickCommands = [
    { label: '⚡ run', cmd: 'run' },
    { label: '🤖 termux', cmd: 'termux' },
    { label: '🌐 preview', cmd: 'preview' },
    { label: '📁 ls -la', cmd: 'ls -la' },
    { label: '🌳 tree', cmd: 'tree' },
    { label: '🧹 clear', cmd: 'clear' }
  ];

  const executeQuickCommand = async (cmd: string) => {
    const tInfo = terminals.current[activeTabId];
    if (tInfo && !tInfo.isExecuting) {
      tInfo.term.write(cmd + '\r\n');
      tInfo.isExecuting = true;
      try {
        await terminalService.executeCommand(
          cmd,
          (line: TerminalLine) => {
            let prefix = '';
            if (line.type === 'error') prefix = '\x1b[31m';
            else if (line.type === 'success') prefix = '\x1b[32m';
            else if (line.type === 'info') prefix = '\x1b[35m';
            else if (line.type === 'system') prefix = '\x1b[33m';
            else if (line.type === 'input') return; 
            
            const content = (line.content || '').replace(/\r?\n/g, '\r\n');
            tInfo.term.write(prefix + content + '\x1b[0m\r\n');
          },
          () => { tInfo.term.clear(); }
        );
      } finally {
        tInfo.isExecuting = false;
        writePrompt(tInfo.term);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] text-[#cccccc] font-mono text-xs select-none">
      <div className="h-8 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          {tabs.map((t) => {
            const isActive = t.id === activeTabId;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTabId(t.id);
                  setTimeout(() => {
                    terminals.current[t.id]?.term.focus();
                    terminals.current[t.id]?.fitAddon.fit();
                  }, 50);
                }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextTabs = tabs.filter((tab) => tab.id !== t.id);
                      setTabs(nextTabs);
                      if (activeTabId === t.id) setActiveTabId(nextTabs[nextTabs.length - 1].id);
                      
                      const tInfo = terminals.current[t.id];
                      if (tInfo) {
                        tInfo.term.dispose();
                        delete terminals.current[t.id];
                      }
                      delete containerRefs.current[t.id];
                    }}
                    className="p-0.5 rounded hover:bg-white/20 text-[#858585] hover:text-white"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={() => {
              const newId = `term_${Date.now()}`;
              setTabs([...tabs, { id: newId, name: `${tabs.length + 1}: bash` }]);
              setActiveTabId(newId);
            }}
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const tInfo = terminals.current[activeTabId];
              if (tInfo) {
                tInfo.term.clear();
              }
            }}
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2a2a] shrink-0"
            title="Clear Buffer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e]/60 border-b border-[#2d2d2d] overflow-x-auto no-scrollbar shrink-0">
        {quickCommands.map((qc) => (
          <button
            key={qc.label}
            onClick={() => executeQuickCommand(qc.cmd)}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] active:bg-[#007acc] text-[#aaaaaa] hover:text-white text-[11px] font-mono shrink-0 transition-colors"
          >
            {qc.label}
          </button>
        ))}
      </div>
      <div className="flex-1 relative overflow-hidden" style={{ background: '#181818' }}>
        {tabs.map((t) => (
          <div
            key={t.id}
            ref={(el) => {
              if (el && !containerRefs.current[t.id]) {
                containerRefs.current[t.id] = el;
                initTerminal(t.id, el);
              }
            }}
            className="absolute inset-0 p-2"
            style={{
              display: t.id === activeTabId ? 'block' : 'none',
              height: '100%',
              width: '100%'
            }}
          />
        ))}
      </div>
    </div>
  );
};
