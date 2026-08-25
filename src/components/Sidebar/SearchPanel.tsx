import React, { useState } from 'react';
import { 
  Search, Replace, CaseSensitive, WholeWord, Regex, 
  ChevronRight, ChevronDown, Check, X, FileCode, ArrowRight, RefreshCw 
} from 'lucide-react';
import { fileSystemService } from '../../services/fileSystem';
import { FileItem } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface SearchResultMatch {
  file: FileItem;
  lineNumber: number;
  lineContent: string;
  previewBefore: string;
  previewMatch: string;
  previewAfter: string;
}

interface SearchPanelProps {
  onOpenFile: (file: FileItem, line?: number) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onOpenFile }) => {
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [filesToInclude, setFilesToInclude] = useState('');
  const [filesToExclude, setFilesToExclude] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Perform multi-file search
  const performSearch = (): Map<string, SearchResultMatch[]> => {
    const resultsMap = new Map<string, SearchResultMatch[]>();
    if (!query.trim()) return resultsMap;

    let regex: RegExp;
    try {
      let pattern = query;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
    } catch {
      return resultsMap;
    }

    const allFiles = fileSystemService.getAllFlatFiles().filter(f => !f.isFolder);

    // Apply include/exclude filters
    const filteredFiles = allFiles.filter(f => {
      if (filesToExclude && filesToExclude.split(',').some(ext => f.name.includes(ext.trim()))) {
        return false;
      }
      if (filesToInclude && !filesToInclude.split(',').some(ext => f.name.includes(ext.trim()))) {
        return false;
      }
      return true;
    });

    filteredFiles.forEach(file => {
      const lines = file.content.split('\n');
      const matches: SearchResultMatch[] = [];

      lines.forEach((line, idx) => {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          const matchIndex = match.index;
          const matchLen = match[0].length;
          matches.push({
            file,
            lineNumber: idx + 1,
            lineContent: line,
            previewBefore: line.substring(Math.max(0, matchIndex - 25), matchIndex).trimStart(),
            previewMatch: match[0],
            previewAfter: line.substring(matchIndex + matchLen, matchIndex + matchLen + 40).trimEnd()
          });

          // Prevent infinite loop if zero-width match
          if (matchLen === 0) {
            regex.lastIndex++;
          }
        }
      });

      if (matches.length > 0) {
        resultsMap.set(file.path, matches);
      }
    });

    return resultsMap;
  };

  const results = performSearch();
  let totalMatchCount = 0;
  results.forEach(m => { totalMatchCount += m.length; });

  const handleReplaceAll = () => {
    if (!query.trim() || totalMatchCount === 0) return;

    let regex: RegExp;
    try {
      let pattern = query;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
    } catch {
      return;
    }

    let filesModified = 0;
    results.forEach((matches, filePath) => {
      const file = fileSystemService.getFileByPath(filePath);
      if (file) {
        file.content = file.content.replace(regex, replaceQuery);
        file.isModified = true;
        filesModified++;
      }
    });

    fileSystemService.saveWorkspace();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pocketcode:workspace-changed'));
    }

    setStatusMessage(`Replaced in ${totalMatchCount} occurrences across ${filesModified} files.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles(prev => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999]">
        <div className="flex items-center gap-1.5">
          <Search size={13} className="text-[#007acc]" />
          <span>SEARCH IN WORKSPACE</span>
        </div>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`p-1 rounded hover:bg-[#333333] ${showReplace ? 'text-[#007acc]' : 'text-[#858585]'}`}
          title="Toggle Replace"
        >
          <Replace size={13} />
        </button>
      </div>

      {/* Inputs Bar */}
      <div className="p-2 space-y-2 border-b border-[#333333]">
        {/* Search input */}
        <div className="flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent border-none text-white text-xs placeholder-[#666666] focus:outline-none"
          />
          <div className="flex items-center gap-1 text-[#858585]">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`p-0.5 rounded ${matchCase ? 'bg-[#007acc] text-white' : 'hover:bg-[#333333]'}`}
              title="Match Case"
            >
              <CaseSensitive size={13} />
            </button>
            <button
              onClick={() => setMatchWholeWord(!matchWholeWord)}
              className={`p-0.5 rounded ${matchWholeWord ? 'bg-[#007acc] text-white' : 'hover:bg-[#333333]'}`}
              title="Match Whole Word"
            >
              <WholeWord size={13} />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`p-0.5 rounded ${useRegex ? 'bg-[#007acc] text-white' : 'hover:bg-[#333333]'}`}
              title="Use Regular Expression"
            >
              <Regex size={13} />
            </button>
          </div>
        </div>

        {/* Replace input */}
        {showReplace && (
          <div className="flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 gap-1">
            <input
              type="text"
              value={replaceQuery}
              onChange={e => setReplaceQuery(e.target.value)}
              placeholder="Replace"
              className="flex-1 bg-transparent border-none text-white text-xs placeholder-[#666666] focus:outline-none"
            />
            <button
              onClick={handleReplaceAll}
              disabled={totalMatchCount === 0}
              className="px-2 py-0.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white rounded text-[10px] font-bold"
              title="Replace All"
            >
              All ({totalMatchCount})
            </button>
          </div>
        )}

        {/* Filter Toggle */}
        <div className="flex items-center justify-between text-[10px] text-[#858585] pt-0.5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="hover:text-white flex items-center gap-1"
          >
            <ChevronRight size={11} className={`transform transition-transform ${showFilters ? 'rotate-90' : ''}`} />
            <span>Files to include / exclude</span>
          </button>
          {query && <span>{totalMatchCount} results</span>}
        </div>

        {showFilters && (
          <div className="space-y-1.5 pt-1">
            <input
              type="text"
              value={filesToInclude}
              onChange={e => setFilesToInclude(e.target.value)}
              placeholder="files to include (e.g. .ts, .py)"
              className="w-full bg-[#1e1e1e] border border-[#333333] rounded px-2 py-1 text-[11px] text-white placeholder-[#666666] focus:outline-none"
            />
            <input
              type="text"
              value={filesToExclude}
              onChange={e => setFilesToExclude(e.target.value)}
              placeholder="files to exclude (e.g. .git, dist)"
              className="w-full bg-[#1e1e1e] border border-[#333333] rounded px-2 py-1 text-[11px] text-white placeholder-[#666666] focus:outline-none"
            />
          </div>
        )}

        {statusMessage && (
          <div className="p-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded text-[10px]">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Results Tree */}
      <div className="flex-1 overflow-y-auto p-1 divide-y divide-[#2d2d2d]">
        {results.size === 0 ? (
          <div className="p-4 text-center text-[#777777] text-xs italic">
            {query ? 'No matching occurrences found.' : 'Type a query above to search files.'}
          </div>
        ) : (
          Array.from(results.entries()).map(([filePath, matches]) => {
            const isCollapsed = collapsedFiles[filePath];
            const file = matches[0].file;

            return (
              <div key={filePath} className="py-1">
                {/* File Header */}
                <div
                  onClick={() => toggleFileCollapse(filePath)}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#2a2d2e] cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate flex-1">
                    <ChevronDown size={12} className={`text-[#858585] transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    {getTabIcon(file.name)}
                    <span className="font-semibold text-white truncate">{file.name}</span>
                    <span className="text-[#666666] text-[10px] truncate">{file.path}</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-[#333333] text-[#aaaaaa] rounded-full text-[10px] shrink-0 font-mono">
                    {matches.length}
                  </span>
                </div>

                {/* Matches lines */}
                {!isCollapsed && (
                  <div className="pl-5 space-y-0.5 pt-0.5">
                    {matches.map((m, idx) => (
                      <div
                        key={`${filePath}_${m.lineNumber}_${idx}`}
                        onClick={() => onOpenFile(m.file, m.lineNumber)}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#04395e] cursor-pointer group text-[11px]"
                      >
                        <span className="font-mono text-[#777777] text-[10px] w-6 shrink-0 text-right">
                          {m.lineNumber}
                        </span>
                        <div className="truncate font-mono">
                          <span className="text-[#888888]">{m.previewBefore}</span>
                          <span className="bg-amber-500/30 text-amber-200 font-bold px-0.5 rounded">
                            {m.previewMatch}
                          </span>
                          <span className="text-[#888888]">{m.previewAfter}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
