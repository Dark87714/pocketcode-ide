import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { DiagnosticProblem } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface ProblemsPanelProps {
  problems: DiagnosticProblem[];
  onSelectProblem: (p: DiagnosticProblem) => void;
}

export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ problems, onSelectProblem }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  const filteredProblems = problems.filter(p => {
    if (severityFilter === 'error' && p.severity !== 'error') return false;
    if (severityFilter === 'warning' && p.severity !== 'warning') return false;
    if (filterQuery && !p.message.toLowerCase().includes(filterQuery.toLowerCase()) && !p.fileName.toLowerCase().includes(filterQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group by file name
  const groupedByFile = new Map<string, DiagnosticProblem[]>();
  filteredProblems.forEach(p => {
    const list = groupedByFile.get(p.fileName) || [];
    list.push(p);
    groupedByFile.set(p.fileName, list);
  });

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-[#858585] text-xs">
        <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
        <p className="font-semibold text-white">No problems detected in the workspace.</p>
        <p className="text-[11px] text-[#666666] mt-0.5">Monaco IntelliSense, Linter, and Tasks problem matchers are clean.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] select-none text-xs">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#333333] gap-2">
        <div className="flex items-center gap-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-0.5 flex-1 max-w-xs">
          <Search size={12} className="text-[#858585]" />
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter problems..."
            className="flex-1 bg-transparent border-none text-white text-[11px] placeholder-[#666666] focus:outline-none"
          />
        </div>

        {/* Severity Badges & Filter */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setSeverityFilter(severityFilter === 'error' ? 'all' : 'error')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${
              severityFilter === 'error' ? 'bg-rose-600 text-white font-bold' : 'hover:bg-[#333333] text-rose-400'
            }`}
            title="Filter Errors"
          >
            <AlertCircle size={12} />
            <span>{errorCount}</span>
          </button>
          <button
            onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${
              severityFilter === 'warning' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-[#333333] text-amber-400'
            }`}
            title="Filter Warnings"
          >
            <AlertTriangle size={12} />
            <span>{warningCount}</span>
          </button>
        </div>
      </div>

      {/* Grouped Problems List */}
      <div className="flex-1 overflow-y-auto p-1 divide-y divide-[#2a2a2a]">
        {Array.from(groupedByFile.entries()).map(([fileName, fileProblems]) => {
          const isCollapsed = collapsedFiles[fileName];

          return (
            <div key={fileName} className="py-1">
              {/* File Header */}
              <div
                onClick={() => setCollapsedFiles(prev => ({ ...prev, [fileName]: !prev[fileName] }))}
                className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#252526] cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate flex-1">
                  <ChevronDown size={12} className={`text-[#858585] transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  {getTabIcon(fileName)}
                  <span className="font-semibold text-white truncate">{fileName}</span>
                </div>
                <span className="px-1.5 py-0.2 bg-[#333333] text-[#aaaaaa] rounded-full text-[10px] shrink-0 font-mono">
                  {fileProblems.length}
                </span>
              </div>

              {/* Problems in File */}
              {!isCollapsed && (
                <div className="pl-5 space-y-0.5 pt-0.5">
                  {fileProblems.map(p => {
                    let Icon = AlertCircle;
                    let color = 'text-rose-400';
                    if (p.severity === 'warning') {
                      Icon = AlertTriangle;
                      color = 'text-amber-400';
                    } else if (p.severity === 'info') {
                      Icon = Info;
                      color = 'text-sky-400';
                    }

                    return (
                      <div
                        key={p.id}
                        onClick={() => onSelectProblem(p)}
                        className="flex items-start gap-2 p-1.5 rounded bg-[#1e1e1e] hover:bg-[#04395e] cursor-pointer transition-colors border border-[#2d2d2d]"
                      >
                        <Icon size={13} className={`${color} shrink-0 mt-0.5`} />
                        <div className="flex-1 truncate">
                          <div className="text-white font-medium truncate">{p.message}</div>
                          <div className="text-[10px] text-[#858585] font-mono mt-0.5">
                            Line {p.line}, Col {p.column}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
