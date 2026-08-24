import React, { useState, useEffect } from 'react';
import { Settings, Palette, Type, Sliders, Key, Sparkles, Smartphone, FolderCog, Save, RefreshCw } from 'lucide-react';
import { EditorSettings } from '../../types';
import { THEMES } from '../../services/themeService';
import { projectSettingsService, ProjectSettings } from '../../services/projectSettingsService';

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
  const [activeSection, setActiveSection] = useState<'global' | 'project' | 'keybindings'>('global');
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({});
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

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
        {([['global', 'Global'], ['project', 'Project'], ['keybindings', 'Keybindings']] as const).map(([id, label]) => (
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
