export interface FileItem {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isFolder: boolean;
  parentId?: string | null;
  children?: FileItem[];
  isExpanded?: boolean;
  isModified?: boolean;
}

export interface TabItem {
  id: string;
  fileId: string;
  name: string;
  path: string;
  language: string;
  isModified?: boolean;
}

export type ActiveSidebarTab = 
  | 'explorer' 
  | 'search' 
  | 'git' 
  | 'run' 
  | 'ai'
  | 'extensions' 
  | 'security'
  | 'settings';

export type ActiveBottomTab = 
  | 'terminal' 
  | 'problems' 
  | 'output' 
  | 'debug';

export interface DiagnosticProblem {
  id: string;
  fileId: string;
  fileName: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
}

export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  filesChanged: string[];
}

export interface ExtensionItem {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  icon: string;
  downloads: string;
  rating: number;
  installed: boolean;
  enabled?: boolean;
  category: 'theme' | 'language' | 'snippet' | 'tool' | 'formatter' | 'ai';
  readme?: string;
  features?: string[];
  tags?: string[];
  isDownloading?: boolean;
  downloadProgress?: number;
  themeData?: any;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  theme: string;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  keyboardMode: 'default' | 'vim' | 'emacs';
  mobileKeybarVisible: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  files: Record<string, string>;
  entryFile: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  templateId?: string;
  fileCount: number;
  description?: string;
  schemaVersion?: number;
}

export type WorkerMessageType = 'stdout' | 'stderr' | 'output' | 'error' | 'done' | 'system' | 'table';

export interface WorkerExecutionMessage {
  type: WorkerMessageType;
  msg?: string;
  content?: string;
  error?: string;
  stack?: string;
  data?: unknown;
}

export interface SecurityTestResult {
  id: string;
  name: string;
  category: 'sandbox' | 'timeout' | 'waf' | 'xss' | 'prototype';
  passed: boolean;
  details: string;
  timestamp: number;
}

export interface WorkspaceMigrationReport {
  previousVersion: number;
  currentVersion: number;
  filesMigrated: number;
  repairedEntries: number;
  backupCreated: boolean;
  success: boolean;
}

export interface ProjectSettings {
  language?: string;
  entryFile?: string;
  tabSize?: number;
  formatOnSave?: boolean;
  compilerVersion?: string;
  packageName?: string;
}

export interface ProjectBuildSettings {
  appId?: string;
  appName?: string;
  versionName?: string;
  versionCode?: number;
  minSdk?: number;
  targetSdk?: number;
  buildType?: 'debug' | 'release';
}

export interface ProjectGitSettings {
  remoteUrl?: string;
  branch?: string;
  autoSync?: boolean;
}

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  files: FileItem[];
  settings: ProjectSettings;
  buildSettings?: ProjectBuildSettings;
  gitSettings?: ProjectGitSettings;
  createdAt: number;
  updatedAt: number;
  formatVersion: number; // e.g. 1
}

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export interface RecoverySnapshot {
  projectId: string;
  projectName: string;
  timestamp: number;
  files: FileItem[];
  activeFileId?: string | null;
  reason: 'autosave' | 'before_switch' | 'crash_backup';
}

export interface GitStashItem {
  id: string;
  message: string;
  timestamp: number;
  branch: string;
  files: { path: string; content: string }[];
  stagedPaths: string[];
}

export interface IDEError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  timestamp: number;
}

/**
 * Standardizes error formatting across all IDE subsystems
 */
export function formatErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error occurred';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return String(error);
}
