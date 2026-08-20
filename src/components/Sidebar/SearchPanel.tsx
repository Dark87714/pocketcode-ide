import React, { useState } from 'react';
import { Search, Replace, ChevronRight, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { FileItem } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface SearchPanelProps {
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onReplaceInFile: (fileId: string, search: string, replace: string) => void;
}

function getAllFlat(items: FileItem[]): FileItem[] {
  const flat: FileItem[] = [];
  const traverse = (list: FileItem[]) => {
    for (const item of list) {
      if (!item.isFolder) flat.push(item);
      if (item.children && item.children.length > 0) traverse(item.children);
    }
  };
  traverse(items);
  return flat;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  files,
  onOpenFile,
  onReplaceInFile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  interface SearchMatch {
    file: FileItem;
    line: number;
    lineContent: string;
    index: number;
  }

  const getResults = (): { file: FileItem; matches: SearchMatch[] }[] => {
    if (!searchQuery.trim()) return [];

    const results: { file: FileItem; matches: SearchMatch[] }[] = [];
    const allFiles = files.length > 0 ? (files.some(f => f.isFolder) ? getAllFlat(files) : files) : [];

    allFiles.forEach((file) => {
      if (file.isFolder || !file.content) return;

      const lines = file.content.split('\n');
      const fileMatches: SearchMatch[] = [];

      lines.forEach((line, lineIdx) => {
        let matched = false;
        if (useRegex) {
          try {
            const regex = new RegExp(searchQuery, matchCase ? 'g' : 'gi');
            matched = regex.test(line);
          } catch (e) {}
        } else {
          matched = matchCase
            ? line.includes(searchQuery)
            : line.toLowerCase().includes(searchQuery.toLowerCase());
        }

        if (matched) {
          fileMatches.push({
            file,
            line: lineIdx + 1,
            lineContent: line.trim(),
            index: lineIdx
          });
        }
      });

      if (fileMatches.length > 0) {
        results.push({ file, matches: fileMatches });
      }
    });

    return results;
  };

  const results = getResults();
  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    results.forEach((r) => {
      onReplaceInFile(r.file.id, searchQuery, replaceQuery);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      <div className="px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999]">
        SEARCH WORKSPACE
      </div>

      <div className="p-2 space-y-2 border-b border-[#333333]">
        {/* Search Input Box */}
        <div className="relative flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 focus-within:border-[#007acc]">
          <Search size={14} className="text-[#858585] shrink-0 mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none font-mono"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                matchCase ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:bg-[#333333]'
              }`}
              title="Match Case (Aa)"
            >
              Aa
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                useRegex ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:bg-[#333333]'
              }`}
              title="Use Regular Expression (.*)"
            >
              .*
            </button>
          </div>
        </div>

        {/* Replace Toggle & Input */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="text-[11px] text-sky-400 flex items-center gap-1 hover:underline"
          >
            {showReplace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Toggle Replace</span>
          </button>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1">
            <div className="flex-1 relative flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 focus-within:border-[#007acc]">
              <Replace size={14} className="text-[#858585] shrink-0 mr-1.5" />
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace with..."
                className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <button
              onClick={handleReplaceAll}
              disabled={results.length === 0}
              className="px-2 py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1 shrink-0"
              title="Replace All Occurrences"
            >
              <Check size={13} />
              <span>All</span>
            </button>
          </div>
        )}
      </div>

      {/* Results Header */}
      {searchQuery && (
        <div className="px-3 py-1.5 bg-[#1e1e1e] text-[11px] text-[#858585] flex justify-between">
          <span>{totalMatches} match{totalMatches === 1 ? '' : 'es'} in {results.length} file{results.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {results.map(({ file, matches }) => (
          <div key={file.id} className="rounded bg-[#1e1e1e] border border-[#2d2d2d] overflow-hidden">
            <div
              onClick={() => onOpenFile(file)}
              className="flex items-center justify-between px-2.5 py-1.5 bg-[#2d2d2d] cursor-pointer hover:bg-[#333333]"
            >
              <div className="flex items-center gap-1.5 truncate">
                {getTabIcon(file.name)}
                <span className="font-semibold text-white truncate">{file.name}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#007acc] text-white">
                {matches.length}
              </span>
            </div>

            <div className="divide-y divide-[#2d2d2d]">
              {matches.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenFile(file)}
                  className="px-3 py-1 text-xs hover:bg-[#252526] cursor-pointer flex items-center justify-between font-mono"
                >
                  <span className="text-[#858585] mr-2 shrink-0">Line {m.line}:</span>
                  <span className="text-[#cccccc] truncate">{m.lineContent}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
