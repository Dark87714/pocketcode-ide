import React from 'react';
import { 
  FileText, FolderPlus, Sparkles, Code2, Play, 
  Terminal, GitFork, Command, ChevronRight, Layers, Smartphone
} from 'lucide-react';

interface WelcomeTabProps {
  onNewFile: () => void;
  onOpenTemplates: () => void;
  onOpenCommandPalette: () => void;
  onOpenTerminal: () => void;
  onOpenNewProject?: () => void;
}

export const WelcomeTab: React.FC<WelcomeTabProps> = ({
  onNewFile,
  onOpenTemplates,
  onOpenCommandPalette,
  onOpenTerminal,
  onOpenNewProject
}) => {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#1e1e1e] text-[#cccccc] p-4 sm:p-8 flex flex-col items-center justify-start select-none">
      <div className="w-full max-w-2xl space-y-6">
        {/* Hero Header */}
        <div className="flex flex-col items-start gap-1 pb-4 border-b border-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-md">
              <Code2 size={18} className="text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              PocketCode Studio
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#007acc] text-white font-mono font-semibold">
              VS Code Mobile
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#858585] mt-1">
            Visual Studio Code editing experience, live sandboxing, terminal, PyTorch AI, and multi-language engine.
          </p>
        </div>

        {/* Start Actions Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#999999]">Start</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* New Project */}
            <button
              onClick={onOpenNewProject || onOpenTemplates}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sky-950/40 to-[#252526] hover:bg-[#2a2d2e] border border-sky-600/40 hover:border-sky-400 text-left transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-[#007acc] flex items-center justify-center text-white shadow-md">
                <FolderPlus size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="text-sky-300">Start New Project...</span>
                  <span className="text-[10px] bg-sky-600/30 text-sky-300 px-1.5 py-0.2 rounded font-mono">VS Code</span>
                </div>
                <div className="text-[11px] text-[#858585]">Blank, Template, or Git Clone</div>
              </div>
            </button>

            {/* New File */}
            <button
              onClick={onNewFile}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#252526] hover:bg-[#2a2d2e] border border-[#333333] hover:border-[#007acc] text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-sky-400 group-hover:text-white group-hover:bg-[#007acc] transition-colors">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>New Blank File</span>
                  <kbd className="text-[10px] bg-[#1e1e1e] px-1.5 py-0.5 rounded text-[#858585] border border-[#3c3c3c]">Ctrl+N</kbd>
                </div>
                <div className="text-[11px] text-[#858585]">Open a blank untitled file</div>
              </div>
            </button>

            {/* Command Palette */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#252526] hover:bg-[#2a2d2e] border border-[#333333] hover:border-[#007acc] text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-purple-400 group-hover:text-white group-hover:bg-purple-600 transition-colors">
                <Command size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Command Palette</span>
                  <kbd className="text-[10px] bg-[#1e1e1e] px-1.5 py-0.5 rounded text-[#858585] border border-[#3c3c3c]">Ctrl+P</kbd>
                </div>
                <div className="text-[11px] text-[#858585]">Run any command or action</div>
              </div>
            </button>

            {/* Terminal */}
            <button
              onClick={onOpenTerminal}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#252526] hover:bg-[#2a2d2e] border border-[#333333] hover:border-[#007acc] text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-emerald-400 group-hover:text-white group-hover:bg-emerald-600 transition-colors">
                <Terminal size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Open Terminal</span>
                  <kbd className="text-[10px] bg-[#1e1e1e] px-1.5 py-0.5 rounded text-[#858585] border border-[#3c3c3c]">Ctrl+`</kbd>
                </div>
                <div className="text-[11px] text-[#858585]">Virtual shell with pip & npm</div>
              </div>
            </button>

            {/* Starter Templates */}
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#252526] hover:bg-[#2a2d2e] border border-[#333333] hover:border-[#007acc] text-left transition-all group sm:col-span-2"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-amber-400 group-hover:text-white group-hover:bg-amber-600 transition-colors">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Browse Starter Templates</span>
                  <span className="text-[10px] text-[#858585]">Cyber Game, PyTorch, React & Go</span>
                </div>
                <div className="text-[11px] text-[#858585]">Instantly bootstrap pre-configured project templates</div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Gestures / Pro Tips */}
        <div className="p-4 rounded-xl bg-[#252526] border border-[#333333] space-y-2">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
            <Smartphone size={15} />
            <span>Mobile IDE Pro Tips</span>
          </div>
          <ul className="text-xs text-[#858585] space-y-1.5 list-disc list-inside">
            <li><strong className="text-[#cccccc]">Split Editor:</strong> Tap the <code className="text-sky-300">[ | ]</code> icon in the top bar to edit 2 files at once.</li>
            <li><strong className="text-[#cccccc]">Format Code:</strong> Tap <code className="text-sky-300">&#123; &#125; Format</code> or press <code className="text-sky-300">Shift+Alt+F</code>.</li>
            <li><strong className="text-[#cccccc]">PyTorch & ML:</strong> Run Python scripts with <code className="text-sky-300">import torch</code> and <code className="text-sky-300">import numpy</code> directly in the browser!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
