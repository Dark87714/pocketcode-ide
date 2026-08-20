import React from 'react';
import { Terminal, CheckCircle2, RotateCw } from 'lucide-react';

interface OutputPanelProps {
  logs: string[];
  onClear: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ logs, onClear }) => {
  return (
    <div className="flex flex-col h-full bg-[#181818] text-[#cccccc] font-mono text-xs select-none">
      <div className="flex items-center justify-between px-3 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] text-[11px] text-[#858585]">
        <span>POCKETCODE BUILD & PREVIEW LOGS</span>
        <button
          onClick={onClear}
          className="hover:text-white px-1.5 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#333333]"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 selectable-text">
        {logs.length === 0 ? (
          <div className="text-[#666666] italic">No output logs yet.</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap leading-relaxed text-[#aaaaaa]">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
