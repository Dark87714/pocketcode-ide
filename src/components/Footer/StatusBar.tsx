import React, { useState } from 'react';
import { GitFork, AlertCircle, CheckCircle2, Code2, Globe, Sparkles, X } from 'lucide-react';
import { DiagnosticProblem } from '../../types';

export const ALL_LANGUAGES = [
  { id: 'python', name: 'Python', ext: '.py', icon: '🐍' },
  { id: 'javascript', name: 'JavaScript', ext: '.js', icon: '🟨' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts', icon: '🔷' },
  { id: 'cpp', name: 'C++', ext: '.cpp', icon: '⚡' },
  { id: 'c', name: 'C', ext: '.c', icon: '⚙️' },
  { id: 'rust', name: 'Rust', ext: '.rs', icon: '🦀' },
  { id: 'sql', name: 'SQL', ext: '.sql', icon: '📊' },
  { id: 'go', name: 'Go (Golang)', ext: '.go', icon: '🐹' },
  { id: 'java', name: 'Java', ext: '.java', icon: '☕' },
  { id: 'html', name: 'HTML5', ext: '.html', icon: '🌐' },
  { id: 'css', name: 'CSS3', ext: '.css', icon: '🎨' },
  { id: 'json', name: 'JSON', ext: '.json', icon: '📋' },
  { id: 'markdown', name: 'Markdown', ext: '.md', icon: '📝' },
  { id: 'shell', name: 'Shell / Bash', ext: '.sh', icon: '💻' },
  { id: 'yaml', name: 'YAML', ext: '.yaml', icon: '⚙️' },
  { id: 'xml', name: 'XML', ext: '.xml', icon: '📄' }
];

interface StatusBarProps {
  currentLanguage?: string;
  cursorPosition?: { line: number; col: number };
  problems?: DiagnosticProblem[];
  branch?: string;
  onOpenTerminal?: () => void;
  onSelectLanguage?: (langId: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentLanguage = 'javascript',
  cursorPosition = { line: 1, col: 1 },
  problems = [],
  branch = 'main',
  onOpenTerminal,
  onSelectLanguage
}) => {
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  const activeLangObj = ALL_LANGUAGES.find(
    l => l.id.toLowerCase() === currentLanguage.toLowerCase() || l.name.toLowerCase() === currentLanguage.toLowerCase()
  ) || { name: currentLanguage, icon: '📄' };

  const filteredLanguages = ALL_LANGUAGES.filter(
    l => l.name.toLowerCase().includes(search.toLowerCase()) || l.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-2 text-[11px] select-none shrink-0 z-20 font-sans shadow-inner">
        {/* Left Status Area */}
        <div className="flex items-center gap-3">
          {/* Git branch */}
          <div className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
            <GitFork size={11} />
            <span className="font-mono">{branch}</span>
          </div>

          {/* Problems Status */}
          <div 
            onClick={onOpenTerminal}
            className="flex items-center gap-1.5 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          >
            {errorCount > 0 ? (
              <span className="flex items-center gap-0.5 text-rose-200 font-bold">
                <AlertCircle size={11} />
                <span>{errorCount}</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 opacity-90">
                <CheckCircle2 size={11} />
                <span>0</span>
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-200">
                ⚠ {warningCount}
              </span>
            )}
          </div>
        </div>

        {/* Right Status Area */}
        <div className="flex items-center gap-2.5">
          {/* Cursor info */}
          <span className="hidden sm:inline opacity-90">
            Ln {cursorPosition.line}, Col {cursorPosition.col}
          </span>

          {/* Spaces & Encoding */}
          <span className="hidden md:inline opacity-90">Spaces: 2</span>
          <span className="hidden md:inline opacity-90">UTF-8</span>

          {/* Language Mode Selector Button */}
          <button
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1 font-semibold hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors active:scale-95"
            title="Change Language Mode"
          >
            <span>{activeLangObj.icon}</span>
            <span>{activeLangObj.name}</span>
          </button>
        </div>
      </footer>

      {/* Language Mode Selector Modal */}
      {isLangModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-12 sm:pt-20 p-3 animate-fade-in">
          <div className="w-full max-w-sm bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="p-3 bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Code2 size={15} className="text-sky-400" />
                <span>SELECT LANGUAGE MODE</span>
              </div>
              <button
                onClick={() => setIsLangModalOpen(false)}
                className="p-1 rounded text-[#858585] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-2 border-b border-[#333333]">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search programming language..."
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#666666] focus:border-[#007acc] focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-1 space-y-0.5 text-xs">
              {filteredLanguages.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    onSelectLanguage?.(l.id);
                    setIsLangModalOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-[#007acc] hover:text-white text-[#cccccc] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{l.icon}</span>
                    <span className="font-semibold text-white group-hover:text-white">{l.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#858585] group-hover:text-white">
                    {l.ext}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
