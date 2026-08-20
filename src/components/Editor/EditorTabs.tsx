import React from 'react';
import { X, Plus, FileCode2, FileType2, FileCode, FileSpreadsheet, FileJson, Terminal, FileText, File } from 'lucide-react';
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
      return <FileCode2 size={14} className="text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileType2 size={14} className="text-sky-400 shrink-0" />;
    case 'html':
      return <FileCode size={14} className="text-orange-500 shrink-0" />;
    case 'css':
      return <FileSpreadsheet size={14} className="text-cyan-400 shrink-0" />;
    case 'json':
      return <FileJson size={14} className="text-amber-400 shrink-0" />;
    case 'py':
      return <Terminal size={14} className="text-emerald-400 shrink-0" />;
    case 'md':
      return <FileText size={14} className="text-slate-300 shrink-0" />;
    default:
      return <File size={14} className="text-slate-400 shrink-0" />;
  }
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewFile
}) => {
  return (
    <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] h-9 overflow-x-auto no-scrollbar select-none">
      <div className="flex items-center h-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 h-full border-r border-[#1e1e1e] cursor-pointer text-xs font-medium shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                  : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
              }`}
            >
              {getTabIcon(tab.name)}
              <span className="truncate max-w-[120px]">{tab.name}</span>
              {tab.isModified && (
                <span className="w-2 h-2 rounded-full bg-[#007acc] shrink-0" title="Unsaved changes" />
              )}
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-white shrink-0 ml-1"
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add New File Tab button */}
      <button
        onClick={onNewFile}
        className="px-2 h-full flex items-center justify-center text-[#858585] hover:text-white hover:bg-[#2d2d2d] transition-colors"
        title="New File"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
