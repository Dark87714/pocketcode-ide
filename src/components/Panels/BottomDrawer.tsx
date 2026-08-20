import React from 'react';
import { 
  Terminal as TermIcon, AlertCircle, ListOrdered, Bug, 
  ChevronUp, ChevronDown, X, Maximize2, Minimize2 
} from 'lucide-react';
import { ActiveBottomTab, DiagnosticProblem } from '../../types';
import { TerminalPanel } from './TerminalPanel';
import { ProblemsPanel } from './ProblemsPanel';
import { OutputPanel } from './OutputPanel';

interface BottomDrawerProps {
  isOpen: boolean;
  activeTab: ActiveBottomTab;
  problems: DiagnosticProblem[];
  logs: string[];
  isExpanded: boolean;
  onSelectTab: (tab: ActiveBottomTab) => void;
  onToggleExpand: () => void;
  onClose: () => void;
  onClearLogs: () => void;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  activeTab,
  problems,
  logs,
  isExpanded,
  onSelectTab,
  onToggleExpand,
  onClose,
  onClearLogs
}) => {
  if (!isOpen) return null;

  const errorCount = problems.filter((p) => p.severity === 'error').length;
  const warningCount = problems.filter((p) => p.severity === 'warning').length;

  return (
    <div
      className={`w-full bg-[#181818] border-t border-[#333333] flex flex-col z-20 transition-all duration-200 shadow-2xl ${
        isExpanded ? 'h-[75vh]' : 'h-[34vh] min-h-[190px]'
      }`}
    >
      {/* Drawer Header Tabs */}
      <div className="flex items-center justify-between px-2 bg-[#252526] border-b border-[#333333] h-8 select-none shrink-0">
        <div className="flex items-center h-full gap-1 overflow-x-auto no-scrollbar">
          {/* Terminal Tab */}
          <button
            onClick={() => onSelectTab('terminal')}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-t-[#007acc] text-white bg-[#181818]'
                : 'border-t-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <TermIcon size={13} />
            <span>Terminal</span>
          </button>

          {/* Problems Tab */}
          <button
            onClick={() => onSelectTab('problems')}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'problems'
                ? 'border-t-[#007acc] text-white bg-[#181818]'
                : 'border-t-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <AlertCircle size={13} className={errorCount > 0 ? 'text-rose-400' : ''} />
            <span>Problems</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                {errorCount + warningCount}
              </span>
            )}
          </button>

          {/* Output Tab */}
          <button
            onClick={() => onSelectTab('output')}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'output'
                ? 'border-t-[#007acc] text-white bg-[#181818]'
                : 'border-t-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <ListOrdered size={13} />
            <span>Output</span>
          </button>

          {/* Debug Console Tab */}
          <button
            onClick={() => onSelectTab('debug')}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium border-t-2 transition-colors ${
              activeTab === 'debug'
                ? 'border-t-[#007acc] text-white bg-[#181818]'
                : 'border-t-transparent text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Bug size={13} />
            <span>Debug</span>
          </button>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
            title={isExpanded ? 'Restore Panel' : 'Maximize Panel'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'terminal' && <TerminalPanel />}
        {activeTab === 'problems' && (
          <ProblemsPanel problems={problems} onSelectProblem={() => {}} />
        )}
        {activeTab === 'output' && <OutputPanel logs={logs} onClear={onClearLogs} />}
        {activeTab === 'debug' && (
          <div className="p-3 text-xs text-[#858585] font-mono">
            Debug session active. Standard logs and evaluation expressions will appear here.
          </div>
        )}
      </div>
    </div>
  );
};
