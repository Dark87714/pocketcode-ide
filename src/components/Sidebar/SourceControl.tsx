import React, { useState } from 'react';
import { 
  GitFork, Check, Plus, Minus, RotateCcw, 
  History, GitCommit as GitCommitIcon, ChevronDown, ChevronRight, FileCode
} from 'lucide-react';
import { gitService, GitStatus } from '../../services/gitService';
import { GitCommit } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface SourceControlProps {
  onOpenDiff?: (fileName: string) => void;
}

export const SourceControl: React.FC<SourceControlProps> = ({ onOpenDiff }) => {
  const [commitMsg, setCommitMsg] = useState('');
  const [status, setStatus] = useState<GitStatus>(gitService.getStatus());
  const [commits, setCommits] = useState<GitCommit[]>(gitService.getCommits());
  const [showHistory, setShowHistory] = useState(false);

  const refreshStatus = () => {
    setStatus(gitService.getStatus());
    setCommits(gitService.getCommits());
  };

  React.useEffect(() => {
    refreshStatus();
  }, []);

  const handleStageFile = (file: string) => {
    gitService.stageFile(file);
    refreshStatus();
  };

  const handleUnstageFile = (file: string) => {
    gitService.unstageFile(file);
    refreshStatus();
  };

  const handleStageAll = () => {
    gitService.stageAll();
    refreshStatus();
  };

  const handleUnstageAll = () => {
    gitService.unstageAll();
    refreshStatus();
  };

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim()) return;

    gitService.commit(commitMsg.trim());
    setCommitMsg('');
    refreshStatus();
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999]">
        <div className="flex items-center gap-1.5">
          <GitFork size={13} className="text-sky-400" />
          <span>SOURCE CONTROL ({status.branch})</span>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-1 rounded hover:bg-[#333333] ${showHistory ? 'text-sky-400' : 'text-[#858585]'}`}
          title="Toggle Git History"
        >
          <History size={14} />
        </button>
      </div>

      {/* Commit Input Box */}
      <form onSubmit={handleCommit} className="p-3 border-b border-[#333333] space-y-2">
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={2}
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded p-2 text-xs text-white placeholder-[#666666] focus:border-[#007acc] focus:outline-none resize-none font-sans"
        />
        <button
          type="submit"
          disabled={!commitMsg.trim()}
          className="w-full py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-white rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <Check size={14} />
          <span>Commit Changes</span>
        </button>
      </form>

      {/* Changes list or Commit Log */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {showHistory ? (
          <div>
            <div className="font-semibold text-xs text-white mb-2 flex items-center gap-1.5">
              <GitCommitIcon size={14} className="text-purple-400" />
              <span>Commit Timeline</span>
            </div>
            <div className="space-y-2 border-l-2 border-purple-500/40 ml-2 pl-3">
              {commits.map((c) => (
                <div key={c.id} className="relative pb-2">
                  <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-[#252526]" />
                  <div className="font-semibold text-white text-xs">{c.message}</div>
                  <div className="text-[11px] text-[#858585] flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sky-400">{c.hash.slice(0, 7)}</span>
                    <span>•</span>
                    <span>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Staged Changes */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#999999] uppercase mb-1">
                <span>Staged Changes ({status.staged.length})</span>
                {status.staged.length > 0 && (
                  <button onClick={handleUnstageAll} className="hover:text-white p-0.5" title="Unstage All">
                    <Minus size={13} />
                  </button>
                )}
              </div>
              {status.staged.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-2">No staged changes</div>
              ) : (
                status.staged.map((f) => (
                  <div key={f} className="flex items-center justify-between py-1 px-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] group">
                    <div className="flex items-center gap-1.5 truncate">
                      {getTabIcon(f)}
                      <span className="truncate text-emerald-400">{f}</span>
                    </div>
                    <button onClick={() => handleUnstageFile(f)} className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585]">
                      <Minus size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Unstaged / Modified Changes */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#999999] uppercase mb-1">
                <span>Changes ({status.modified.length})</span>
                {status.modified.length > 0 && (
                  <button onClick={handleStageAll} className="hover:text-white p-0.5" title="Stage All">
                    <Plus size={13} />
                  </button>
                )}
              </div>
              {status.modified.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-2">Working tree clean</div>
              ) : (
                status.modified.map((f) => (
                  <div key={f} className="flex items-center justify-between py-1 px-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] group">
                    <div className="flex items-center gap-1.5 truncate">
                      {getTabIcon(f)}
                      <span className="truncate text-amber-400">{f}</span>
                    </div>
                    <button onClick={() => handleStageFile(f)} className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585]">
                      <Plus size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
