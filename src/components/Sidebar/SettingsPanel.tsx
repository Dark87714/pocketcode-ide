import React, { useState, useEffect } from 'react';
import { Settings, Palette, Type, Sliders, Key, Sparkles, Smartphone, FolderCog, Save, RefreshCw, Cpu, Check, AlertCircle } from 'lucide-react';
import { EditorSettings } from '../../types';
import { THEMES } from '../../services/themeService';
import { projectSettingsService, ProjectSettings } from '../../services/projectSettingsService';
import { compilerService } from '../../services/compilerService';

interface SettingsPanelProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
}

const KEYBINDINGS = [
  { shortcut: 'Ctrl+P', description: 'Quick Open file' },
  { shortcut: 'Ctrl+Shift+P', description: 'Command Palette' },
  { shortcut: 'Ctrl+S', description: 'Save file' },
  { shortcut: 'Ctrl+N', description: 'New untitled file' },
  { shortcut: 'Ctrl+`', description: 'Toggle terminal' },
  { shortcut: 'Ctrl+B', description: 'Toggle sidebar' },
  { shortcut: 'Ctrl+\\', description: 'Toggle split editor' },
  { shortcut: 'Ctrl+F', description: 'Find & Replace' },
  { shortcut: 'Ctrl+Shift+F', description: 'Project search' },
  { shortcut: 'Ctrl+Shift+G', description: 'Git panel' },
  { shortcut: 'Ctrl+Shift+D', description: 'Run/Debug panel' },
  { shortcut: 'Ctrl+Shift+A', description: 'AI Chat panel' },
  { shortcut: 'Ctrl+Shift+M', description: 'Markdown preview' },
  { shortcut: 'Shift+Alt+F', description: 'Format document' },
  { shortcut: 'F5', description: 'Start debugging' },
  { shortcut: 'F2', description: 'Rename symbol' },
  { shortcut: 'F12', description: 'Go to definition' },
  { shortcut: 'Shift+F12', description: 'Find all references' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [activeSection, setActiveSection] = useState<'global' | 'project' | 'compiler' | 'keybindings'>('global');
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({});
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [compilerEndpoint, setCompilerEndpoint] = useState(compilerService.getEndpoint());
  const [endpointSaved, setEndpointSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'ok' | 'fail'; msg?: string }>({ status: 'idle' });

  useEffect(() => {
    projectSettingsService.load().then(ps => setProjectSettings(ps));
  }, []);

  const handleSaveProjectSettings = async () => {
    setIsSavingProject(true);
    try {
      await projectSettingsService.save(projectSettings);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleResetProjectSettings = async () => {
    setProjectSettings({});
    await projectSettingsService.save({});
  };

  const handleSaveCompilerEndpoint = () => {
    compilerService.setEndpoint(compilerEndpoint);
    setEndpointSaved(true);
    setTimeout(() => setEndpointSaved(false), 2000);
  };

  const handleResetCompilerEndpoint = () => {
    compilerService.resetEndpoint();
    setCompilerEndpoint(compilerService.getEndpoint());
    setEndpointSaved(true);
    setTimeout(() => setEndpointSaved(false), 2000);
  };

  const handleTestCompiler = async () => {
    setTestResult({ status: 'testing' });
    try {
      const res = await compilerService.execute('test.c', '#include <stdio.h>\nint main() { printf("OK\\n"); return 0; }', 'c');
      if (res.success && res.stdout.includes('OK')) {
        setTestResult({ status: 'ok', msg: `Connected successfully (${res.executionTimeMs}ms)` });
      } else {
        setTestResult({ status: 'fail', msg: res.error || res.stderr || 'Execution failed' });
      }
    } catch (e: any) {
      setTestResult({ status: 'fail', msg: e.message || 'Connection failed' });
    }
  };

  const updateProjSetting = <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => {
    setProjectSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      <div className="px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999] flex items-center gap-1.5">
        <Settings size={13} className="text-sky-400" />
        <span>SETTINGS & PREFERENCES</span>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-[#333] shrink-0">
        {([['global', 'Global'], ['project', 'Project'], ['compiler', 'Compiler'], ['keybindings', 'Keys']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${
              activeSection === id
                ? 'text-white border-b-2 border-sky-400'
                : 'text-[#888] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ========== GLOBAL SETTINGS ========== */}
        {activeSection === 'global' && (
          <>
            {/* Themes */}
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-white mb-2">
                <Palette size={14} className="text-sky-400" />
                <span>Color Theme</span>
              </div>
              <div className="space-y-1.5">
                {THEMES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                      settings.theme === t.id
                        ? 'border-sky-500 bg-[#1e1e1e] text-white shadow-sm'
                        : 'border-[#333333] bg-[#1e1e1e]/60 hover:bg-[#1e1e1e] text-[#cccccc]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ background: t.accent }}
                      />
                      <span className="font-medium text-xs">{t.name}</span>
                    </div>
                    {settings.theme === t.id && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-sky-500/20 text-sky-400 rounded font-semibold">Active</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Editor Settings */}
            <div className="space-y-3 pt-2 border-t border-[#333333]">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Type size={14} className="text-sky-400" />
                <span>Editor Typography & Layout</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#999999]">Font Size ({settings.fontSize}px)</span>
                <div className="flex items-center gap-2">
                  <input type="range" min="11" max="22" value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                    className="w-24 accent-[#007acc]" />
                  <span className="font-mono text-xs w-5 text-right">{settings.fontSize}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#999999]">Tab Indentation</span>
                <select value={settings.tabSize} onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
                  className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white focus:outline-none">
                  <option value={2}>2 Spaces</option>
                  <option value={4}>4 Spaces</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#999999]">Word Wrap</span>
                <button onClick={() => onUpdateSettings({ wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })}
                  className={`px-3 py-1 rounded text-xs font-semibold ${settings.wordWrap === 'on' ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'}`}>
                  {settings.wordWrap === 'on' ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#999999]">Code Minimap</span>
                <button onClick={() => onUpdateSettings({ minimap: !settings.minimap })}
                  className={`px-3 py-1 rounded text-xs font-semibold ${settings.minimap ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'}`}>
                  {settings.minimap ? 'Shown' : 'Hidden'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#999999]">Format on Save</span>
                <button onClick={() => onUpdateSettings({ formatOnSave: !settings.formatOnSave })}
                  className={`px-3 py-1 rounded text-xs font-semibold ${settings.formatOnSave ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'}`}>
                  {settings.formatOnSave ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#999999]">Mobile Touch Toolbar</span>
                <button onClick={() => onUpdateSettings({ mobileKeybarVisible: !settings.mobileKeybarVisible })}
                  className={`px-3 py-1 rounded text-xs font-semibold ${settings.mobileKeybarVisible ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'}`}>
                  {settings.mobileKeybarVisible ? 'Active' : 'Hidden'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========== PROJECT SETTINGS ========== */}
        {activeSection === 'project' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <FolderCog size={14} className="text-sky-400" />
              <span>Per-Project Settings</span>
            </div>
            <p className="text-[10px] text-[#666] leading-relaxed">
              Overrides global settings for this project only. Saved to <code className="text-amber-400">.pocketcode/settings.json</code>.
            </p>

            <div className="flex items-center justify-between">
              <span className="text-[#999]">Tab Size Override</span>
              <select value={projectSettings.tabSize ?? ''}
                onChange={e => updateProjSetting('tabSize', e.target.value ? Number(e.target.value) : undefined)}
                className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white focus:outline-none">
                <option value="">Use Global</option>
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#999]">Format on Save</span>
              <select value={projectSettings.formatOnSave === undefined ? '' : String(projectSettings.formatOnSave)}
                onChange={e => updateProjSetting('formatOnSave', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white focus:outline-none">
                <option value="">Use Global</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#999]">Formatter</span>
              <select value={projectSettings.formatter ?? ''}
                onChange={e => updateProjSetting('formatter', (e.target.value as any) || undefined)}
                className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white focus:outline-none">
                <option value="">Use Global</option>
                <option value="prettier">Prettier</option>
                <option value="builtin">Built-in</option>
                <option value="none">None</option>
              </select>
            </div>

            <div>
              <span className="text-[#999] block mb-1">Exclude from Search (comma-separated)</span>
              <input
                type="text"
                placeholder="node_modules, .git, dist"
                value={(projectSettings.excludeFromSearch || []).join(', ')}
                onChange={e => updateProjSetting('excludeFromSearch', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white focus:outline-none text-[11px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveProjectSettings} disabled={isSavingProject}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-[11px] font-semibold transition-colors">
                {savedMsg ? <><span>✓</span> Saved</> : <><Save size={11} /> Save</>}
              </button>
              <button onClick={handleResetProjectSettings}
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#ccc] rounded text-[11px] transition-colors">
                <RefreshCw size={11} />
              </button>
            </div>
          </div>
        )}

        {/* ========== COMPILER & RUNTIMES ========== */}
        {activeSection === 'compiler' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Cpu size={14} className="text-sky-400" />
              <span>Multi-Language Compiler Engine</span>
            </div>
            <p className="text-[10px] text-[#888] leading-relaxed">
              PocketCode includes native compilation & execution for 50+ languages (C, C++, Java, Rust, Go, C#, PHP, Python, Ruby, Kotlin, Swift, Dart, Zig, SQLite).
            </p>

            <div className="space-y-1.5 pt-1">
              <span className="text-[#aaa] block text-[11px] font-medium">Compiler Backend Endpoint</span>
              <input
                type="text"
                placeholder="https://emkc.org/api/v2/piston"
                value={compilerEndpoint}
                onChange={e => setCompilerEndpoint(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-white focus:outline-none text-[11px] font-mono"
              />
              <p className="text-[9px] text-[#666]">
                Default is the public Piston execution service. You can also specify a private or self-hosted endpoint.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveCompilerEndpoint}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold transition-colors"
              >
                {endpointSaved ? <><span>✓</span> Saved</> : <><Save size={11} /> Save Endpoint</>}
              </button>
              <button
                onClick={handleTestCompiler}
                disabled={testResult.status === 'testing'}
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] disabled:opacity-50 text-white rounded text-[11px] font-medium transition-colors"
              >
                {testResult.status === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleResetCompilerEndpoint}
                title="Reset to default"
                className="px-2 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#ccc] rounded text-[11px] transition-colors"
              >
                <RefreshCw size={11} />
              </button>
            </div>

            {testResult.status !== 'idle' && testResult.status !== 'testing' && (
              <div className={`p-2 rounded border text-[10px] flex items-center gap-1.5 ${
                testResult.status === 'ok' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {testResult.status === 'ok' ? <Check size={12} className="shrink-0" /> : <AlertCircle size={12} className="shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}

            <div className="pt-2 border-t border-[#333]">
              <span className="text-[#aaa] block text-[11px] font-semibold mb-2">Supported Real Compilers & Engines</span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {[
                  ['C / C++', 'GCC 10.2 / Clang'],
                  ['Java', 'OpenJDK 15 / 21'],
                  ['Rust', 'rustc 1.68 / Cargo'],
                  ['Go', 'Golang 1.16+'],
                  ['Python', 'Pyodide 3.11 WASM'],
                  ['C# / .NET', 'Mono / .NET 6.0+'],
                  ['TypeScript', 'V8 Worker / TS 5.7'],
                  ['SQLite', 'SQLite 3.53 WASM'],
                  ['PHP', 'PHP 8.2+'],
                  ['Ruby', 'Ruby 3.0+'],
                  ['Kotlin', 'Kotlin 1.8+'],
                  ['Swift', 'Swift 5.3+'],
                  ['Dart', 'Dart 2.19+'],
                  ['Zig', 'Zig 0.10+'],
                ].map(([lang, note]) => (
                  <div key={lang} className="p-1.5 bg-[#1e1e1e] border border-[#333] rounded flex flex-col">
                    <span className="font-semibold text-white">{lang}</span>
                    <span className="text-[#777] text-[9px]">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== KEYBINDINGS ========== */}
        {activeSection === 'keybindings' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
              <Key size={14} className="text-sky-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="space-y-1">
              {KEYBINDINGS.map(kb => (
                <div key={kb.shortcut} className="flex items-center justify-between py-1.5 border-b border-[#2d2d2d]">
                  <span className="text-[#aaa] text-[11px]">{kb.description}</span>
                  <kbd className="px-2 py-0.5 bg-[#1e1e1e] border border-[#444] rounded text-[10px] font-mono text-amber-300 shrink-0">
                    {kb.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
