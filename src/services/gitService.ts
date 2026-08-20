import { GitCommit } from '../types';
import { fileSystemService } from './fileSystem';

export interface GitStatus {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export class GitService {
  private currentBranch: string = 'main';
  private branches: string[] = ['main', 'dev'];
  private tags: string[] = ['v1.0.0'];
  private remotes: Record<string, string> = {
    origin: 'https://github.com/developer/pocketcode-workspace.git'
  };
  private stashes: { id: string; message: string; timestamp: number }[] = [];
  private stagedFiles: Set<string> = new Set();
  private commits: GitCommit[] = [
    {
      id: 'c_init',
      hash: '9f82ab4',
      message: 'Initial project setup & scaffolding',
      author: 'PocketCode Developer <dev@pocketcode.app>',
      timestamp: Date.now() - 3600000 * 2,
      filesChanged: ['index.html', 'style.css', 'game.js']
    }
  ];

  getCurrentBranch(): string {
    return this.currentBranch;
  }

  setBranch(branch: string) {
    this.currentBranch = branch;
    if (!this.branches.includes(branch)) {
      this.branches.push(branch);
    }
  }

  getBranches(): string[] {
    return this.branches;
  }

  createBranch(branch: string): boolean {
    if (!this.branches.includes(branch)) {
      this.branches.push(branch);
      return true;
    }
    return false;
  }

  deleteBranch(branch: string): boolean {
    if (branch === this.currentBranch || branch === 'main') return false;
    const idx = this.branches.indexOf(branch);
    if (idx !== -1) {
      this.branches.splice(idx, 1);
      return true;
    }
    return false;
  }

  getTags(): string[] {
    return this.tags;
  }

  createTag(tag: string): boolean {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      return true;
    }
    return false;
  }

  getRemotes(): Record<string, string> {
    return this.remotes;
  }

  setRemote(name: string, url: string) {
    this.remotes[name] = url;
  }

  removeRemote(name: string): boolean {
    if (this.remotes[name]) {
      delete this.remotes[name];
      return true;
    }
    return false;
  }

  stash(message: string = 'WIP on ' + this.currentBranch): string {
    const id = `stash@{${this.stashes.length}}`;
    this.stashes.unshift({ id, message, timestamp: Date.now() });
    this.stagedFiles.clear();
    return id;
  }

  popStash(): string | null {
    if (this.stashes.length === 0) return null;
    const item = this.stashes.shift();
    return item ? item.message : null;
  }

  getStashes(): { id: string; message: string; timestamp: number }[] {
    return this.stashes;
  }

  stageFile(path: string) {
    this.stagedFiles.add(path);
  }

  unstageFile(path: string) {
    this.stagedFiles.delete(path);
  }

  stageAll() {
    const files = fileSystemService.getAllFlatFiles();
    files.forEach(f => this.stagedFiles.add(f.path));
  }

  unstageAll() {
    this.stagedFiles.clear();
  }

  getStatus(): GitStatus {
    const files = fileSystemService.getAllFlatFiles();
    const modified: string[] = [];
    const untracked: string[] = [];

    files.forEach(f => {
      if (f.isModified) {
        if (!this.stagedFiles.has(f.path)) {
          modified.push(f.path);
        }
      }
    });

    return {
      branch: this.currentBranch,
      staged: Array.from(this.stagedFiles),
      modified,
      untracked
    };
  }

  commit(message: string): GitCommit {
    const changed = Array.from(this.stagedFiles);
    const hash = Math.random().toString(16).substring(2, 9);
    const newCommit: GitCommit = {
      id: `commit_${Date.now()}`,
      hash,
      message,
      author: 'PocketCode Developer <dev@pocketcode.app>',
      timestamp: Date.now(),
      filesChanged: changed.length > 0 ? changed : ['*']
    };

    this.commits.unshift(newCommit);
    this.stagedFiles.clear();
    
    // Clear isModified flag on files
    const allFiles = fileSystemService.getAllFlatFiles();
    allFiles.forEach(f => {
      f.isModified = false;
    });

    return newCommit;
  }

  getCommits(): GitCommit[] {
    return this.commits;
  }
}

export const gitService = new GitService();

