import React from 'react';
import { Play, Bug, Flame, Terminal, Globe, Cpu, RefreshCw } from 'lucide-react';

interface RunDebugPanelProps {
  onRunPreview: () => void;
  onRunPython: () => void;
  onOpenTerminal: () => void;
}

export const RunDebugPanel: React.FC<RunDebugPanelProps> = ({
  onRunPreview,
  onRunPython,
  onOpenTerminal
}) => {
  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      <div className="px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999] flex items-center gap-1.5">
        <Bug size={13} className="text-emerald-400" />
        <span>RUN & DEBUG</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Launch Cards */}
        <div className="p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c] hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-1.5">
            <Globe size={16} className="text-sky-400" />
            <h4 className="font-semibold text-white text-xs">Live Web Sandbox (HTML/CSS/JS)</h4>
          </div>
          <p className="text-[11px] text-[#858585] mb-3">
            Hot-reloading browser preview with mobile device frames, orientation switch, and console inspector.
          </p>
          <button
            onClick={onRunPreview}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
          >
            <Play size={13} fill="currentColor" />
            <span>Launch Live Sandbox</span>
          </button>
        </div>

        <div className="p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c] hover:border-sky-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-1.5">
            <Cpu size={16} className="text-emerald-400" />
            <h4 className="font-semibold text-white text-xs">Python 3.11 WASM Engine</h4>
          </div>
          <p className="text-[11px] text-[#858585] mb-3">
            Execute active Python script directly in the Pyodide WebAssembly terminal.
          </p>
          <button
            onClick={onRunPython}
            className="w-full py-2 bg-[#007acc] hover:bg-[#0062a3] text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
          >
            <Play size={13} fill="currentColor" />
            <span>Run in Pyodide Terminal</span>
          </button>
        </div>

        {/* Breakpoints / Watch section */}
        <div className="pt-2 border-t border-[#333333]">
          <div className="text-[11px] font-bold text-[#999999] uppercase mb-2">Variables & Call Stack</div>
          <div className="p-2.5 bg-[#1e1e1e] rounded border border-[#2d2d2d] text-[#858585] text-[11px]">
            No active debug session. Launch a runner above to capture runtime variables and logs.
          </div>
        </div>
      </div>
    </div>
  );
};
