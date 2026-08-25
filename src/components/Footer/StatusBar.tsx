import React, { useState } from 'react';
import { GitFork, AlertCircle, CheckCircle2, Code2, Globe, Sparkles, X, BookOpen } from 'lucide-react';
import { DiagnosticProblem } from '../../types';

export const ALL_LANGUAGES = [
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'cpp', name: 'C++', ext: '.cpp' },
  { id: 'c', name: 'C', ext: '.c' },
  { id: 'rust', name: 'Rust', ext: '.rs' },
  { id: 'sql', name: 'SQL', ext: '.sql' },
  { id: 'go', name: 'Go', ext: '.go' },
  { id: 'java', name: 'Java', ext: '.java' },
  { id: 'html', name: 'HTML5', ext: '.html' },
  { id: 'css', name: 'CSS3', ext: '.css' },
  { id: 'json', name: 'JSON', ext: '.json' },
  { id: 'markdown', name: 'Markdown', ext: '.md' },
  { id: 'shell', name: 'Shell / Bash', ext: '.sh' },
  { id: 'yaml', name: 'YAML', ext: '.yaml' },
  { id: 'xml', name: 'XML', ext: '.xml' }
];

interface StatusBarProps {
  currentLanguage?: string;
  cursorPosition?: { line: number; col: number };
  problems?: DiagnosticProblem[];
  branch?: string;
  onOpenTerminal?: () => void;
  onSelectLanguage?: (langId: string) => void;
  onToggleMarkdownPreview?: () => void;
  isMarkdownPreviewOpen?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentLanguage = 'javascript',
  cursorPosition = { line: 1, col: 1 },
  problems = [],
  branch = 'main',
  onOpenTerminal,
  onSelectLanguage,
  onToggleMarkdownPreview,
  isMarkdownPreviewOpen = false
}) => {
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  const activeLangObj = ALL_LANGUAGES.find(
    l => l.id.toLowerCase() === currentLanguage.toLowerCase() || l.name.toLowerCase() === currentLanguage.toLowerCase()
  ) || { name: currentLanguage, ext: '' };

  const filteredLanguages = ALL_LANGUAGES.filter(
    l => l.name.toLowerCase().includes(search.toLowerCase()) || l.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <footer className="h-6 bg-[#181818] text-[#cccccc] border-t border-[#252526] flex items-center justify-between px-2.5 text-[11px] select-none shrink-0 z-20 font-sans">
        {/* Left Status Area */}
        <div className="flex items-center gap-3">
          {/* Git branch */}
          <div className="flex items-center gap-1 hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors">
            <GitFork size={11} className="text-[#858585]" />
            <span className="font-mono text-[11px]">{branch}</span>
          </div>

          {/* Problems Status */}
          <div 
            onClick={onOpenTerminal}
            className="flex items-center gap-1.5 hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          >
            {errorCount > 0 ? (
              <span className="flex items-center gap-0.5 text-rose-400 font-medium">
                <AlertCircle size={11} />
                <span>{errorCount}</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[#858585]">
                <CheckCircle2 size={11} />
                <span>0</span>
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-400 font-medium">
                {warningCount}
              </span>
            )}
          </div>
        </div>

        {/* Right Status Area */}
        <div className="flex items-center gap-3 text-[#858585]">
          {/* Cursor info */}
          <span className="hidden sm:inline hover:text-[#cccccc] transition-colors">
            Ln {cursorPosition.line}, Col {cursorPosition.col}
          </span>

          {/* Spaces & Encoding */}
          <span className="hidden md:inline hover:text-[#cccccc] transition-colors">Spaces: 2</span>
          <span className="hidden md:inline hover:text-[#cccccc] transition-colors">UTF-8</span>

          {/* Language Mode Selector Button */}
          <button
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-1 text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded transition-colors"
            title="Change Language Mode"
          >
            <span>{activeLangObj.name}</span>
          </button>

          {/* Markdown Preview Toggle */}
          {currentLanguage === 'markdown' && onToggleMarkdownPreview && (
            <button
              onClick={onToggleMarkdownPreview}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                isMarkdownPreviewOpen ? 'bg-[#007acc] text-white' : 'hover:bg-[#2a2d2e] hover:text-white'
              }`}
              title="Toggle Markdown Preview"
            >
              <BookOpen size={11} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}
        </div>
      </footer>

      {/* Language Mode Selector Modal */}
      {isLangModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-12 sm:pt-20 p-3 animate-fade-in">
          <div className="w-full max-w-sm bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="p-3 bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
                <Code2 size={14} className="text-sky-400" />
                <span>SELECT LANGUAGE MODE</span>
              </div>
              <button
                onClick={() => setIsLangModalOpen(false)}
                className="p-1 rounded text-[#858585] hover:text-white"
              >
                <X size={14} />
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
                  <span className="font-medium text-white group-hover:text-white">{l.name}</span>
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
