import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Replace, Check, X, CaseSensitive, Regex } from 'lucide-react';

interface TouchFindReplaceProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (query: string, matchCase: boolean, isRegex: boolean, forward: boolean) => { current: number; total: number } | void;
  onReplace: (replaceText: string) => void;
  onReplaceAll: (findText: string, replaceText: string, matchCase: boolean, isRegex: boolean) => void;
}

export const TouchFindReplace: React.FC<TouchFindReplaceProps> = ({
  isOpen,
  onClose,
  onFind,
  onReplace,
  onReplaceAll
}) => {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isReplaceVisible, setIsReplaceVisible] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  useEffect(() => {
    if (query) {
      const res = onFind(query, matchCase, isRegex, true);
      if (res) setMatchInfo(res);
    } else {
      setMatchInfo({ current: 0, total: 0 });
    }
  }, [query, matchCase, isRegex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (!query) return;
    const res = onFind(query, matchCase, isRegex, true);
    if (res) setMatchInfo(res);
  };

  const handlePrev = () => {
    if (!query) return;
    const res = onFind(query, matchCase, isRegex, false);
    if (res) setMatchInfo(res);
  };

  return (
    <div className="absolute top-2 right-2 z-30 bg-[#252526] border border-[#454545] rounded-lg shadow-2xl p-2 max-w-[95vw] sm:max-w-md animate-slide-down select-none text-xs font-sans text-white">
      {/* Search Input Row */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIsReplaceVisible(!isReplaceVisible)}
          className={`p-1 rounded transition-colors ${isReplaceVisible ? 'text-sky-400 bg-[#333333]' : 'text-[#858585] hover:text-white'}`}
          title="Toggle Replace"
        >
          <ChevronDown size={14} className={`transform transition-transform ${isReplaceVisible ? 'rotate-0' : '-rotate-90'}`} />
        </button>

        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNext();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Find in file..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-white placeholder-[#666666] focus:border-[#007acc] focus:outline-none pr-14"
          />
          {query && (
            <span className="absolute right-2 text-[10px] text-[#858585]">
              {matchInfo.total > 0 ? `${matchInfo.current || 1}/${matchInfo.total}` : 'No results'}
            </span>
          )}
        </div>

        {/* Options (Match Case & Regex) */}
        <button
          onClick={() => setMatchCase(!matchCase)}
          className={`p-1 rounded ${matchCase ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:bg-[#333333]'}`}
          title="Match Case"
        >
          <CaseSensitive size={13} />
        </button>

        <button
          onClick={() => setIsRegex(!isRegex)}
          className={`p-1 rounded ${isRegex ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:bg-[#333333]'}`}
          title="Use Regular Expression"
        >
          <Regex size={13} />
        </button>

        {/* Prev / Next Buttons */}
        <button
          onClick={handlePrev}
          disabled={!query || matchInfo.total === 0}
          className="p-1 rounded hover:bg-[#333333] active:bg-[#007acc] disabled:opacity-30"
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={handleNext}
          disabled={!query || matchInfo.total === 0}
          className="p-1 rounded hover:bg-[#333333] active:bg-[#007acc] disabled:opacity-30"
          title="Next Match (Enter)"
        >
          <ChevronDown size={14} />
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Replace Input Row */}
      {isReplaceVisible && (
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-[#333333] animate-fade-in">
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-white placeholder-[#666666] focus:border-[#007acc] focus:outline-none"
          />

          <button
            onClick={() => onReplace(replaceText)}
            disabled={!query || matchInfo.total === 0}
            className="px-2 py-1 rounded bg-[#333333] hover:bg-[#007acc] text-white text-[11px] disabled:opacity-30 font-medium transition-colors"
          >
            Replace
          </button>
          <button
            onClick={() => onReplaceAll(query, replaceText, matchCase, isRegex)}
            disabled={!query || matchInfo.total === 0}
            className="px-2 py-1 rounded bg-[#333333] hover:bg-[#007acc] text-white text-[11px] disabled:opacity-30 font-medium transition-colors"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};
