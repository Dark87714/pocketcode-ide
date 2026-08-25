import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, FileCode2, FileType2, FileCode, FileSpreadsheet, FileJson, Terminal, FileText, File } from 'lucide-react';
import { TabItem } from '../../types';

interface EditorTabsProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onNewFile: () => void;
}

export const getTabIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
      return <FileCode2 size={13} className="text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileType2 size={13} className="text-sky-400 shrink-0" />;
    case 'html':
      return <FileCode size={13} className="text-orange-500 shrink-0" />;
    case 'css':
      return <FileSpreadsheet size={13} className="text-cyan-400 shrink-0" />;
    case 'json':
      return <FileJson size={13} className="text-amber-400 shrink-0" />;
    case 'py':
      return <Terminal size={13} className="text-emerald-400 shrink-0" />;
    case 'md':
      return <FileText size={13} className="text-slate-300 shrink-0" />;
    default:
      return <File size={13} className="text-slate-400 shrink-0" />;
  }
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewFile
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOverflowOpen]);

  return (
    <div className="flex items-center justify-between bg-[#252526] border-b border-[#1e1e1e] h-9 select-none relative w-full">
      <div className="flex items-center h-full overflow-x-auto no-scrollbar flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.id, e);
                }
              }}
              className={`group flex items-center gap-1.5 px-3 h-full border-r border-[#1e1e1e] cursor-pointer text-xs font-normal shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                  : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
              }`}
            >
              {getTabIcon(tab.name)}
              <span className="truncate max-w-[130px]">{tab.name}</span>
              {tab.isModified && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#007acc] shrink-0" title="Unsaved changes" />
              )}
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-white shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Close Tab (Middle-click)"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        {/* Add New File Tab button */}
        <button
          onClick={onNewFile}
          className="px-2.5 h-full flex items-center justify-center text-[#858585] hover:text-white hover:bg-[#2d2d2d] transition-colors shrink-0"
          title="New Untitled File"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Overflow Tabs Chevron Dropdown */}
      {tabs.length > 3 && (
        <div className="relative shrink-0 pr-1" ref={overflowMenuRef}>
          <button
            onClick={() => setIsOverflowOpen(!isOverflowOpen)}
            className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2d2d2d] rounded transition-colors"
            title="Show All Open Tabs"
          >
            <ChevronDown size={13} />
          </button>

          {isOverflowOpen && (
            <div className="absolute right-0 top-full mt-0.5 w-56 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-2xl z-50 py-1 max-h-60 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[#858585] border-b border-[#333333] uppercase tracking-wider">
                Open Tabs ({tabs.length})
              </div>
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setIsOverflowOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer hover:bg-[#2a2d2e] ${
                    tab.id === activeTabId ? 'bg-[#1e1e1e] text-white font-medium' : 'text-[#cccccc]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getTabIcon(tab.name)}
                    <span className="truncate">{tab.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id, e);
                    }}
                    className="p-0.5 text-[#858585] hover:text-white rounded"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

