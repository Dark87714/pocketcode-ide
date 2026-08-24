import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, ArrowDown, ArrowUp, CornerRightDown, RotateCcw, Square, 
  Bug, Eye, ListTree, Layers, CircleDot, Plus, Trash2, Globe, Cpu, ChevronRight, ChevronDown 
} from 'lucide-react';
import { debuggerService, Breakpoint, DebugState, StackFrame, DebugVariable } from '../../services/debuggerService';
import { FileItem } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface RunDebugPanelProps {
  activeFile?: FileItem | null;
  onStartDebugging: () => void;
  onRunPreview: () => void;
  onRunPython: () => void;
  onJumpToLine?: (file: string, line: number) => void;
}

export const RunDebugPanel: React.FC<RunDebugPanelProps> = ({
  activeFile,
  onStartDebugging,
  onRunPreview,
  onRunPython,
  onJumpToLine
}) => {
  const [debugState, setDebugState] = useState<DebugState>(debuggerService.getState());
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(debuggerService.getBreakpoints());
  const [variables, setVariables] = useState<DebugVariable[]>(debuggerService.getVariables());
  const [stackFrames, setStackFrames] = useState<StackFrame[]>(debuggerService.getStackFrames());
  const [watchExpressions, setWatchExpressions] = useState<string[]>(debuggerService.getWatchExpressions());
  const [watchResults, setWatchResults] = useState<DebugVariable[]>(debuggerService.getWatchResults());
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    variables: true,
    watch: true,
    callStack: true,
    breakpoints: true
  });

  const refreshState = () => {
    setDebugState(debuggerService.getState());
    setBreakpoints(debuggerService.getBreakpoints());
    setVariables(debuggerService.getVariables());
    setStackFrames(debuggerService.getStackFrames());
    setWatchExpressions(debuggerService.getWatchExpressions());
    setWatchResults(debuggerService.getWatchResults());
  };

  useEffect(() => {
    const handleStateChange = () => refreshState();
    const handlePaused = () => refreshState();
    const handleBreakpoints = () => setBreakpoints(debuggerService.getBreakpoints());
    const handleWatch = () => {
      setWatchExpressions(debuggerService.getWatchExpressions());
      setWatchResults(debuggerService.getWatchResults());
    };

    window.addEventListener('pocketcode:debug-state-changed', handleStateChange);
    window.addEventListener('pocketcode:debug-paused', handlePaused);
    window.addEventListener('pocketcode:debug-stopped', handleStateChange);
    window.addEventListener('pocketcode:breakpoints-changed', handleBreakpoints);
    window.addEventListener('pocketcode:debug-watch-changed', handleWatch);

    return () => {
      window.removeEventListener('pocketcode:debug-state-changed', handleStateChange);
      window.removeEventListener('pocketcode:debug-paused', handlePaused);
      window.removeEventListener('pocketcode:debug-stopped', handleStateChange);
      window.removeEventListener('pocketcode:breakpoints-changed', handleBreakpoints);
      window.removeEventListener('pocketcode:debug-watch-changed', handleWatch);
    };
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchInput.trim()) {
      debuggerService.addWatchExpression(newWatchInput.trim());
      setNewWatchInput('');
      setIsAddingWatch(false);
      setWatchExpressions(debuggerService.getWatchExpressions());
      setWatchResults(debuggerService.getWatchResults());
    }
  };

  const isDebugging = debugState === 'running' || debugState === 'paused';

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999]">
        <div className="flex items-center gap-1.5">
          <Bug size={13} className={isDebugging ? 'text-amber-400 animate-pulse' : 'text-emerald-400'} />
          <span>RUN & DEBUG {isDebugging && `(${debugState.toUpperCase()})`}</span>
        </div>
      </div>

      {/* Interactive Debug Controls Toolbar */}
      {isDebugging ? (
        <div className="p-2 bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-center gap-2">
          {debugState === 'paused' ? (
            <button
              onClick={() => debuggerService.continueExecution()}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow"
              title="Continue (F5)"
            >
              <Play size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              disabled
              className="p-1.5 bg-zinc-700 text-zinc-400 rounded opacity-50"
              title="Running..."
            >
              <Pause size={14} />
            </button>
          )}

          <button
            onClick={() => debuggerService.stepOver()}
            disabled={debugState !== 'paused'}
            className="p-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 text-sky-400 rounded shadow"
            title="Step Over (F10)"
          >
            <CornerRightDown size={14} />
          </button>

          <button
            onClick={() => debuggerService.stepInto()}
            disabled={debugState !== 'paused'}
            className="p-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 text-purple-400 rounded shadow"
            title="Step Into (F11)"
          >
            <ArrowDown size={14} />
          </button>

          <button
            onClick={() => debuggerService.stepOut()}
            disabled={debugState !== 'paused'}
            className="p-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 text-purple-400 rounded shadow"
            title="Step Out (Shift+F11)"
          >
            <ArrowUp size={14} />
          </button>

          <button
            onClick={() => onStartDebugging()}
            className="p-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-amber-400 rounded shadow"
            title="Restart Debugging (Ctrl+Shift+F5)"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => debuggerService.stopDebugging()}
            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded shadow"
            title="Stop Debugging (Shift+F5)"
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      ) : (
        <div className="p-2 border-b border-[#333333] space-y-2">
          {/* Main Debug Button */}
          <button
            onClick={onStartDebugging}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
          >
            <Bug size={14} />
            <span>Start Debugging Active File</span>
          </button>

          {/* Quick Runner Cards */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onRunPreview}
              className="py-1.5 px-2 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-white text-[11px] font-semibold flex items-center justify-center gap-1 truncate"
            >
              <Globe size={12} className="text-sky-400" />
              <span>Live Web</span>
            </button>
            <button
              onClick={onRunPython}
              className="py-1.5 px-2 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-white text-[11px] font-semibold flex items-center justify-center gap-1 truncate"
            >
              <Cpu size={12} className="text-emerald-400" />
              <span>Pyodide Run</span>
            </button>
          </div>
        </div>
      )}

      {/* Accordion Panes */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2d2d2d]">
        {/* 1. VARIABLES PANE */}
        <div>
          <div
            onClick={() => toggleSection('variables')}
            className="flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] cursor-pointer text-[11px] font-bold text-[#aaaaaa] uppercase tracking-wide"
          >
            <div className="flex items-center gap-1">
              <ChevronDown size={12} className={`transform transition-transform ${!expandedSections.variables ? '-rotate-90' : ''}`} />
              <ListTree size={12} className="text-emerald-400" />
              <span>VARIABLES</span>
            </div>
            {variables.length > 0 && <span className="font-mono text-[10px] text-[#777777]">{variables.length}</span>}
          </div>

          {expandedSections.variables && (
            <div className="p-2 space-y-1">
              {variables.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-3">
                  {isDebugging ? 'No variables in local scope.' : 'Variables populate when paused at a breakpoint.'}
                </div>
              ) : (
                variables.map((v, i) => (
                  <div key={`${v.name}_${i}`} className="flex items-start justify-between py-0.5 px-1.5 rounded hover:bg-[#1e1e1e] text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-purple-300 font-bold">{v.name}:</span>
                      <span className="text-emerald-300 truncate">{v.value}</span>
                    </div>
                    <span className="text-[#666666] text-[10px] shrink-0">({v.type})</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. WATCH EXPRESSIONS PANE */}
        <div>
          <div
            onClick={() => toggleSection('watch')}
            className="flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] cursor-pointer text-[11px] font-bold text-[#aaaaaa] uppercase tracking-wide"
          >
            <div className="flex items-center gap-1">
              <ChevronDown size={12} className={`transform transition-transform ${!expandedSections.watch ? '-rotate-90' : ''}`} />
              <Eye size={12} className="text-sky-400" />
              <span>WATCH</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setIsAddingWatch(true); }}
              className="p-0.5 hover:text-white text-[#858585] rounded"
              title="Add Watch Expression"
            >
              <Plus size={13} />
            </button>
          </div>

          {expandedSections.watch && (
            <div className="p-2 space-y-1">
              {isAddingWatch && (
                <form onSubmit={handleAddWatch} className="flex items-center gap-1 mb-2">
                  <input
                    type="text"
                    autoFocus
                    value={newWatchInput}
                    onChange={e => setNewWatchInput(e.target.value)}
                    placeholder="Expression (e.g. data.length)"
                    className="flex-1 bg-[#1e1e1e] border border-[#007acc] rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                  />
                  <button type="submit" className="px-2 py-0.5 bg-[#007acc] text-white rounded text-[10px] font-bold">Add</button>
                </form>
              )}

              {watchExpressions.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-3">No watch expressions added.</div>
              ) : (
                watchExpressions.map(expr => {
                  const result = watchResults.find(r => r.name === expr);
                  return (
                    <div key={expr} className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-[#1e1e1e] group text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sky-300 font-semibold">{expr}:</span>
                        <span className="text-white truncate">{result ? result.value : '—'}</span>
                      </div>
                      <button
                        onClick={() => debuggerService.removeWatchExpression(expr)}
                        className="p-0.5 text-[#666666] hover:text-rose-400 opacity-0 group-hover:opacity-100"
                        title="Remove Expression"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 3. CALL STACK PANE */}
        <div>
          <div
            onClick={() => toggleSection('callStack')}
            className="flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] cursor-pointer text-[11px] font-bold text-[#aaaaaa] uppercase tracking-wide"
          >
            <div className="flex items-center gap-1">
              <ChevronDown size={12} className={`transform transition-transform ${!expandedSections.callStack ? '-rotate-90' : ''}`} />
              <Layers size={12} className="text-purple-400" />
              <span>CALL STACK</span>
            </div>
          </div>

          {expandedSections.callStack && (
            <div className="p-2 space-y-1">
              {stackFrames.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-3">Not paused on any stack frame.</div>
              ) : (
                stackFrames.map((frame, idx) => (
                  <div
                    key={`${frame.file}_${frame.line}_${idx}`}
                    onClick={() => onJumpToLine?.(frame.file, frame.line)}
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#04395e] cursor-pointer text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-purple-400 font-bold">{frame.name}()</span>
                      <span className="text-[#888888] truncate">{frame.file}</span>
                    </div>
                    <span className="text-amber-300 shrink-0">:{frame.line}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 4. BREAKPOINTS PANE */}
        <div>
          <div
            onClick={() => toggleSection('breakpoints')}
            className="flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] cursor-pointer text-[11px] font-bold text-[#aaaaaa] uppercase tracking-wide"
          >
            <div className="flex items-center gap-1">
              <ChevronDown size={12} className={`transform transition-transform ${!expandedSections.breakpoints ? '-rotate-90' : ''}`} />
              <CircleDot size={12} className="text-rose-500" />
              <span>BREAKPOINTS</span>
            </div>
            {breakpoints.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); debuggerService.clearAllBreakpoints(); }}
                className="p-0.5 text-[#858585] hover:text-rose-400"
                title="Remove All Breakpoints"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {expandedSections.breakpoints && (
            <div className="p-2 space-y-1">
              {breakpoints.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-3">
                  Click on the line number gutter in the code editor to set a breakpoint.
                </div>
              ) : (
                breakpoints.map(bp => (
                  <div
                    key={bp.id}
                    onClick={() => onJumpToLine?.(bp.filePath, bp.lineNumber)}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#1e1e1e] cursor-pointer group text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={bp.enabled}
                        onChange={e => { e.stopPropagation(); debuggerService.setBreakpointEnabled(bp.id, e.target.checked); }}
                        className="rounded border-[#3c3c3c] text-rose-500 focus:ring-0"
                      />
                      <CircleDot size={12} className={bp.enabled ? 'text-rose-500 fill-rose-500' : 'text-zinc-600'} />
                      <span className="font-semibold text-white truncate">{bp.filePath.split('/').pop()}</span>
                      <span className="font-mono text-amber-300">:{bp.lineNumber}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); debuggerService.removeBreakpoint(bp.id); }}
                      className="p-0.5 text-[#666666] hover:text-rose-400 opacity-0 group-hover:opacity-100"
                      title="Remove Breakpoint"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
