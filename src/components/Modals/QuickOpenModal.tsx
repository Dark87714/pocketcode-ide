import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, Hash, ArrowRight, CornerDownLeft, X } from 'lucide-react';
import { fileSystemService } from '../../services/fileSystem';
import { parseDocumentSymbols, DocumentSymbol } from '../../utils/symbolParser';
import { FileItem } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (file: FileItem, line?: number) => void;
  activeFile?: FileItem | null;
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({
  isOpen,
  onClose,
  onOpenFile,
  activeFile
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSymbolSearch = query.startsWith('@');
  const cleanQuery = query.trim();

  // 1. Symbol Search mode (@symbol)
  let symbolResults: DocumentSymbol[] = [];
  if (isSymbolSearch && activeFile) {
    const symbolQuery = query.substring(1).toLowerCase().trim();
    const allSymbols = parseDocumentSymbols(activeFile.content, activeFile.language || 'typescript');
    symbolResults = symbolQuery
      ? allSymbols.filter(s => s.name.toLowerCase().includes(symbolQuery))
      : allSymbols;
  }

  // 2. File Search mode (filename:line)
  let lineJump: number | undefined;
  let fileQuery = cleanQuery;
  const lineMatch = cleanQuery.match(/^([^:]+):(\d+)$/);
  if (lineMatch) {
    fileQuery = lineMatch[1];
    lineJump = parseInt(lineMatch[2], 10);
  }

  const allFiles = fileSystemService.getAllFlatFiles().filter(f => !f.isFolder);
  const filteredFiles = fileQuery && !isSymbolSearch
    ? allFiles.filter(f => f.path.toLowerCase().includes(fileQuery.toLowerCase()))
    : allFiles;

  const totalResults = isSymbolSearch ? symbolResults.length : filteredFiles.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalResults));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults) % Math.max(1, totalResults));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isSymbolSearch) {
        const sel = symbolResults[selectedIndex];
        if (sel && activeFile) {
          onOpenFile(activeFile, sel.line);
          onClose();
        }
      } else {
        const sel = filteredFiles[selectedIndex];
        if (sel) {
          onOpenFile(sel, lineJump);
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] text-[#cccccc] text-xs font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3 py-2.5 bg-[#252526] border-b border-[#333333] gap-2">
          {isSymbolSearch ? (
            <Hash size={16} className="text-purple-400 shrink-0" />
          ) : (
            <Search size={16} className="text-[#007acc] shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name (type :line to jump, @ for symbols)..."
            className="flex-1 bg-transparent border-none text-white text-xs placeholder-[#777777] focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-[#858585] hover:text-white rounded">
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-1 divide-y divide-[#2a2a2a]">
          {isSymbolSearch ? (
            symbolResults.length === 0 ? (
              <div className="p-4 text-center text-[#777777]">No symbols matching "@" in active document.</div>
            ) : (
              symbolResults.map((s, idx) => (
                <div
                  key={`${s.name}_${s.line}_${idx}`}
                  onClick={() => {
                    if (activeFile) {
                      onOpenFile(activeFile, s.line);
                      onClose();
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    idx === selectedIndex ? 'bg-[#04395e] text-white' : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-purple-400 font-mono text-[11px]">[{s.kind}]</span>
                    <span className="font-semibold text-white truncate">{s.name}</span>
                    {s.detail && <span className="text-[#888888] text-[11px] truncate">({s.detail})</span>}
                  </div>
                  <span className="text-[#858585] font-mono text-[11px] shrink-0">Line {s.line}</span>
                </div>
              ))
            )
          ) : filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-[#777777]">No files found in workspace.</div>
          ) : (
            filteredFiles.map((file, idx) => (
              <div
                key={file.id}
                onClick={() => {
                  onOpenFile(file, lineJump);
                  onClose();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  idx === selectedIndex ? 'bg-[#04395e] text-white' : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {getTabIcon(file.name)}
                  <span className="font-semibold text-white truncate">{file.name}</span>
                  <span className="text-[#888888] text-[11px] truncate">{file.path}</span>
                </div>
                {lineJump ? (
                  <span className="text-sky-400 font-mono text-[11px] shrink-0 flex items-center gap-1">
                    <ArrowRight size={11} /> Line {lineJump}
                  </span>
                ) : (
                  <span className="text-[#666666] text-[10px] shrink-0">{(file.content.length / 1024).toFixed(1)} KB</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-3 py-1.5 bg-[#181818] border-t border-[#2d2d2d] flex items-center justify-between text-[10px] text-[#777777]">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-[#2d2d2d] text-white rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-[#2d2d2d] text-white rounded">Enter</kbd> Open</span>
            <span><kbd className="px-1 py-0.5 bg-[#2d2d2d] text-white rounded">Esc</kbd> Close</span>
          </div>
          <span><strong>Ctrl+P</strong> Quick Open</span>
        </div>
      </div>
    </div>
  );
};
