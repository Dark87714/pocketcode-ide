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
}
