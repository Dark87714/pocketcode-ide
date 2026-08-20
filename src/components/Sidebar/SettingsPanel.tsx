import React from 'react';
import { Settings, Palette, Type, Sliders, Key, Sparkles, Smartphone } from 'lucide-react';
import { EditorSettings } from '../../types';
import { THEMES } from '../../services/themeService';

interface SettingsPanelProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings
}) => {
  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs">
      <div className="px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999] flex items-center gap-1.5">
        <Settings size={13} className="text-sky-400" />
        <span>SETTINGS & PREFERENCES</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
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

        {/* Editor Configurations */}
        <div className="space-y-3 pt-2 border-t border-[#333333]">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Type size={14} className="text-sky-400" />
            <span>Editor Typography & Layout</span>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <span className="text-[#999999]">Font Size ({settings.fontSize}px)</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="11"
                max="22"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-24 accent-[#007acc]"
              />
              <span className="font-mono text-xs w-5 text-right">{settings.fontSize}</span>
            </div>
          </div>

          {/* Tab Size */}
          <div className="flex items-center justify-between">
            <span className="text-[#999999]">Tab Indentation</span>
            <select
              value={settings.tabSize}
              onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
              className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white focus:outline-none"
            >
              <option value={2}>2 Spaces</option>
              <option value={4}>4 Spaces</option>
            </select>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between">
            <span className="text-[#999999]">Word Wrap</span>
            <button
              onClick={() => onUpdateSettings({ wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                settings.wordWrap === 'on' ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'
              }`}
            >
              {settings.wordWrap === 'on' ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between">
            <span className="text-[#999999]">Code Minimap</span>
            <button
              onClick={() => onUpdateSettings({ minimap: !settings.minimap })}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                settings.minimap ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'
              }`}
            >
              {settings.minimap ? 'Shown' : 'Hidden'}
            </button>
          </div>

          {/* Mobile Keybar */}
          <div className="flex items-center justify-between">
            <span className="text-[#999999]">Mobile Touch Toolbar</span>
            <button
              onClick={() => onUpdateSettings({ mobileKeybarVisible: !settings.mobileKeybarVisible })}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                settings.mobileKeybarVisible ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585]'
              }`}
            >
              {settings.mobileKeybarVisible ? 'Active' : 'Hidden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
