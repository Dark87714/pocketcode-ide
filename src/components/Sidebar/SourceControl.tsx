import React, { useState, useEffect } from 'react';
import { 
  GitFork, Check, Plus, Minus, RotateCcw, 
  History, GitCommit as GitCommitIcon, GitBranch, ArrowUp, ArrowDown, 
  Key, DownloadCloud, UploadCloud, RefreshCw, X, Shield 
} from 'lucide-react';
import { realGitService, RealGitStatus } from '../../services/realGitService';
import { GitCommit } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';

interface SourceControlProps {
  onOpenDiff?: (fileName: string) => void;
}

export const SourceControl: React.FC<SourceControlProps> = ({ onOpenDiff }) => {
  const [commitMsg, setCommitMsg] = useState('');
  const [status, setStatus] = useState<RealGitStatus>({ branch: 'main', staged: [], modified: [], untracked: [], deleted: [] });
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<string[]>(['main']);
  const [showHistory, setShowHistory] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [githubToken, setGithubToken] = useState(realGitService.getGitHubToken());
  const [remoteUrl, setRemoteUrl] = useState('');
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshStatus = async () => {
    try {
      const s = await realGitService.getStatus();
      const c = await realGitService.getCommits(15);
      const b = await realGitService.getBranches();
      setStatus(s);
      setCommits(c);
      setBranches(b);
    } catch {}
  };

  useEffect(() => {
    refreshStatus();
    const handler = () => refreshStatus();
    window.addEventListener('pocketcode:git-status-changed', handler);
    window.addEventListener('pocketcode:workspace-changed', handler);
    return () => {
      window.removeEventListener('pocketcode:git-status-changed', handler);
      window.removeEventListener('pocketcode:workspace-changed', handler);
    };
  }, []);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim()) return;
    try {
      await realGitService.commit(commitMsg.trim());
      setCommitMsg('');
      await refreshStatus();
    } catch (e: any) {
      setSyncStatus(`Commit error: ${e.message}`);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBranchName.trim()) {
      await realGitService.createBranch(newBranchName.trim());
      await realGitService.checkoutBranch(newBranchName.trim());
      setNewBranchName('');
      setShowBranchModal(false);
      await refreshStatus();
    }
  };

  const handleCheckoutBranch = async (branch: string) => {
    await realGitService.checkoutBranch(branch);
    await refreshStatus();
  };

  const handlePush = async () => {
    setIsSyncing(true);
    setSyncStatus('Pushing to remote...');
    try {
      await realGitService.push('origin', status.branch, msg => setSyncStatus(msg));
    } catch (e: any) {
      setSyncStatus(`Push error: ${e.message}`);
      if (e.message.includes('Token')) setShowTokenModal(true);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handlePull = async () => {
    setIsSyncing(true);
    setSyncStatus('Pulling from remote...');
    try {
      await realGitService.pull('origin', status.branch, msg => setSyncStatus(msg));
      await refreshStatus();
    } catch (e: any) {
      setSyncStatus(`Pull error: ${e.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteUrl.trim()) return;
    setIsSyncing(true);
    setSyncStatus('Cloning repository...');
    try {
      await realGitService.cloneRepository(remoteUrl.trim(), msg => setSyncStatus(msg));
      setShowCloneModal(false);
      setRemoteUrl('');
      await refreshStatus();
    } catch (e: any) {
      setSyncStatus(`Clone error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      {/* Header with Branch Switcher */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999]">
        <div className="flex items-center gap-1.5 truncate">
          <GitFork size={13} className="text-sky-400" />
          <button 
            onClick={() => setShowBranchModal(true)}
            className="flex items-center gap-1 text-white hover:text-sky-300 font-mono bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#3c3c3c]"
            title="Switch Branch"
          >
            <GitBranch size={11} className="text-emerald-400" />
            <span>{status.branch}</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePull}
            disabled={isSyncing}
            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
            title="Pull from Remote"
          >
            <ArrowDown size={13} />
          </button>
          <button
            onClick={handlePush}
            disabled={isSyncing}
            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
            title="Push to Remote"
          >
            <ArrowUp size={13} />
          </button>
          <button
            onClick={() => setShowTokenModal(true)}
            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
            title="GitHub Credentials"
          >
            <Key size={13} />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1 rounded hover:bg-[#333333] ${showHistory ? 'text-sky-400' : 'text-[#858585]'}`}
            title="Toggle Git History"
          >
            <History size={13} />
          </button>
        </div>
      </div>

      {/* Status banner */}
      {syncStatus && (
        <div className="px-3 py-1.5 bg-[#182a3a] border-b border-sky-600/40 text-sky-200 text-[10px] flex items-center justify-between">
          <span>{syncStatus}</span>
          {isSyncing && <RefreshCw size={11} className="animate-spin" />}
        </div>
      )}

      {/* Commit Input Box */}
      <form onSubmit={handleCommit} className="p-3 border-b border-[#333333] space-y-2">
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={2}
          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded p-2 text-xs text-white placeholder-[#666666] focus:border-[#007acc] focus:outline-none resize-none font-sans"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            disabled={!commitMsg.trim()}
            className="flex-1 py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-white rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Check size={13} />
            <span>Commit to {status.branch}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCloneModal(true)}
            className="py-1.5 px-2 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#858585] hover:text-white"
            title="Clone Repository"
          >
            <DownloadCloud size={13} />
          </button>
        </div>
      </form>

      {/* Changes list or Commit Log */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {showHistory ? (
          <div>
            <div className="font-semibold text-xs text-white mb-2 flex items-center gap-1.5">
              <GitCommitIcon size={14} className="text-purple-400" />
              <span>Git Commit History</span>
            </div>
            <div className="space-y-2 border-l-2 border-purple-500/40 ml-2 pl-3">
              {commits.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic">No commits in repository yet.</div>
              ) : (
                commits.map((c) => (
                  <div key={c.id} className="relative pb-2">
                    <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-[#252526]" />
                    <div className="font-semibold text-white text-xs">{c.message}</div>
                    <div className="text-[10px] text-[#858585] flex items-center gap-2 mt-0.5 font-mono">
                      <span className="text-sky-400">{c.hash}</span>
                      <span>•</span>
                      <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Staged Changes */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#999999] uppercase mb-1">
                <span>Staged Changes ({status.staged.length})</span>
                {status.staged.length > 0 && (
                  <button onClick={() => realGitService.unstageAll()} className="hover:text-white p-0.5" title="Unstage All">
                    <Minus size={13} />
                  </button>
                )}
              </div>
              {status.staged.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-2">No staged changes</div>
              ) : (
                status.staged.map((f) => (
                  <div key={f} className="flex items-center justify-between py-1 px-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] group cursor-pointer">
                    <div 
                      onClick={() => onOpenDiff?.(f)}
                      className="flex items-center gap-1.5 truncate flex-1"
                      title="Click to view diff"
                    >
                      {getTabIcon(f)}
                      <span className="truncate text-emerald-400">{f}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); realGitService.unstageFile(f); }} className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585]">
                      <Minus size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Unstaged / Modified Changes */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#999999] uppercase mb-1">
                <span>Changes ({status.modified.length + status.untracked.length})</span>
                {(status.modified.length > 0 || status.untracked.length > 0) && (
                  <button onClick={() => realGitService.stageAll()} className="hover:text-white p-0.5" title="Stage All">
                    <Plus size={13} />
                  </button>
                )}
              </div>
              {status.modified.length === 0 && status.untracked.length === 0 ? (
                <div className="text-[11px] text-[#666666] italic pl-2">Working tree clean</div>
              ) : (
                <>
                  {status.modified.map((f) => (
                    <div key={f} className="flex items-center justify-between py-1 px-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] group cursor-pointer">
                      <div 
                        onClick={() => onOpenDiff?.(f)}
                        className="flex items-center gap-1.5 truncate flex-1"
                        title="Click to view diff"
                      >
                        {getTabIcon(f)}
                        <span className="truncate text-amber-400">{f}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); realGitService.stageFile(f); }} className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585]">
                        <Plus size={12} />
                      </button>
                    </div>
                  ))}
                  {status.untracked.map((f) => (
                    <div key={f} className="flex items-center justify-between py-1 px-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] group cursor-pointer">
                      <div 
                        onClick={() => onOpenDiff?.(f)}
                        className="flex items-center gap-1.5 truncate flex-1"
                        title="Untracked new file"
                      >
                        {getTabIcon(f)}
                        <span className="truncate text-emerald-300 font-semibold">{f} (U)</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); realGitService.stageFile(f); }} className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585]">
                        <Plus size={12} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                <GitBranch size={14} className="text-sky-400" />
                <span>Switch / Create Branch</span>
              </h3>
              <button onClick={() => setShowBranchModal(false)}><X size={14} /></button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-2">
              <input
                type="text"
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                placeholder="New branch name (e.g. feature/login)"
                className="w-full bg-[#252526] border border-[#3c3c3c] rounded p-2 text-xs text-white focus:outline-none"
              />
              <button type="submit" disabled={!newBranchName.trim()} className="w-full py-1.5 bg-[#007acc] text-white rounded font-bold text-xs">
                Create & Switch Branch
              </button>
            </form>

            <div className="pt-2 border-t border-[#333333] space-y-1">
              <span className="text-[10px] text-[#777777] uppercase font-bold">Existing Branches</span>
              {branches.map(b => (
                <div
                  key={b}
                  onClick={() => { handleCheckoutBranch(b); setShowBranchModal(false); }}
                  className={`flex items-center justify-between p-1.5 rounded cursor-pointer ${b === status.branch ? 'bg-[#04395e] text-white font-bold' : 'hover:bg-[#252526]'}`}
                >
                  <span>{b}</span>
                  {b === status.branch && <Check size={12} className="text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GitHub Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Key size={14} className="text-amber-400" />
                <span>GitHub Personal Access Token</span>
              </h3>
              <button onClick={() => setShowTokenModal(false)}><X size={14} /></button>
            </div>
            <p className="text-[11px] text-[#858585]">
              To push or pull private repositories with GitHub, enter your GitHub Personal Access Token (classic with <code>repo</code> scope).
            </p>
            <input
              type="password"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-[#252526] border border-[#3c3c3c] rounded p-2 text-xs text-white focus:outline-none font-mono"
            />
            <button
              onClick={() => { realGitService.setGitHubToken(githubToken); setShowTokenModal(false); }}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs"
            >
              Save Credentials
            </button>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                <DownloadCloud size={14} className="text-sky-400" />
                <span>Clone Git Repository</span>
              </h3>
              <button onClick={() => setShowCloneModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleClone} className="space-y-2">
              <input
                type="text"
                value={remoteUrl}
                onChange={e => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full bg-[#252526] border border-[#3c3c3c] rounded p-2 text-xs text-white focus:outline-none"
              />
              <button type="submit" disabled={!remoteUrl.trim() || isSyncing} className="w-full py-1.5 bg-[#007acc] text-white rounded font-bold text-xs">
                {isSyncing ? 'Cloning...' : 'Clone into Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
