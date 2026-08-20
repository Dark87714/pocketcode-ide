import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { DiagnosticProblem } from '../../types';

interface ProblemsPanelProps {
  problems: DiagnosticProblem[];
  onSelectProblem: (p: DiagnosticProblem) => void;
}

export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ problems, onSelectProblem }) => {
  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-[#858585] text-xs">
        <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
        <p className="font-semibold text-white">No problems detected in the workspace.</p>
        <p className="text-[11px] text-[#666666] mt-0.5">Monaco IntelliSense & syntax diagnostics are running clean.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1 select-none text-xs">
      {problems.map((p) => {
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
            className="flex items-start gap-2 p-2 rounded bg-[#1e1e1e] hover:bg-[#252526] cursor-pointer transition-colors border border-[#2d2d2d]"
          >
            <Icon size={14} className={`${color} shrink-0 mt-0.5`} />
            <div className="flex-1 truncate">
              <div className="text-white font-medium truncate">{p.message}</div>
              <div className="text-[11px] text-[#858585] font-mono mt-0.5">
                {p.fileName} [{p.line}, {p.column}]
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
