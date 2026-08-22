import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Star, Download, Check, Boxes, Sparkles, 
  Trash2, ToggleLeft, ToggleRight, MoreVertical, Upload,
  X, ExternalLink, ShieldCheck, Tag, Code2, Palette, Terminal
} from 'lucide-react';
// B14 fix: lazy-load canvas-confetti via dynamic import to avoid a static-import
// failure on mobile browsers that don't support <canvas> well.
import { extensionService } from '../../services/extensionService';
import { ExtensionItem } from '../../types';

interface ExtensionsPanelProps {
  onSelectTheme?: (themeId: string) => void;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({ onSelectTheme }) => {
  const [search, setSearch] = useState('');
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedExt, setSelectedExt] = useState<ExtensionItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const vsixInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const loaded = await extensionService.loadExtensions();
      setExtensions(loaded);
    };
    init();
  }, []);

  // Search handler (searches local + Open VSX registry)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (search.trim().length > 1) {
        setIsSearchingOnline(true);
        const results = await extensionService.searchOnline(search);
        if (active) {
          setExtensions(results);
          setIsSearchingOnline(false);
        }
      } else {
        setExtensions(extensionService.getExtensions());
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const filtered = extensions.filter((ext) => {
    if (activeCategory === 'installed') return ext.installed;
    if (activeCategory === 'theme') return ext.category === 'theme';
    if (activeCategory === 'formatter') return ext.category === 'formatter';
    if (activeCategory === 'language') return ext.category === 'language';
    if (activeCategory === 'tool') return ext.category === 'tool';
    if (activeCategory === 'snippet') return ext.category === 'snippet';
    return true;
  });

  const handleInstall = async (ext: ExtensionItem) => {
    setDownloadingId(ext.id);
    setDownloadProgress(10);
    setDownloadStatus('Starting download...');

    try {
      await extensionService.installExtension(ext, (progress, status) => {
        setDownloadProgress(progress);
        setDownloadStatus(status);
      });

      // Confetti effect - dynamically imported to avoid static module failure
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {}

      // Refresh list
      setExtensions([...extensionService.getExtensions()]);
      if (selectedExt && selectedExt.id === ext.id) {
        setSelectedExt({ ...selectedExt, installed: true, enabled: true });
      }
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
        setDownloadProgress(0);
        setDownloadStatus('');
      }, 500);
    }
  };

  const handleUninstall = async (ext: ExtensionItem) => {
    await extensionService.uninstallExtension(ext.id);
    setExtensions([...extensionService.getExtensions()]);
    if (selectedExt && selectedExt.id === ext.id) {
      setSelectedExt({ ...selectedExt, installed: false, enabled: false });
    }
  };

  const handleToggleEnable = async (ext: ExtensionItem) => {
    const isEnabled = await extensionService.toggleEnable(ext.id);
    setExtensions([...extensionService.getExtensions()]);
    if (selectedExt && selectedExt.id === ext.id) {
      setSelectedExt({ ...selectedExt, enabled: isEnabled });
    }
  };

  const handleVsixUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDownloadingId('vsix_upload');
    setDownloadStatus(`Installing ${file.name}...`);
    setDownloadProgress(30);

    try {
      const installed = await extensionService.installFromVsix(file, (progress, status) => {
        setDownloadProgress(progress);
        setDownloadStatus(status);
      });

      setExtensions([...extensionService.getExtensions()]);
      setSelectedExt(installed);

      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 50, spread: 70 });
      } catch (err) {}
    } catch (err: any) {
      alert(`Failed to install VSIX: ${err.message}`);
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
      setDownloadStatus('');
      if (vsixInputRef.current) vsixInputRef.current.value = '';
    }
  };

  const getExtensionIcon = (category: string) => {
    switch (category) {
      case 'theme':
        return <Palette size={16} className="text-purple-400" />;
      case 'formatter':
        return <Sparkles size={16} className="text-amber-400" />;
      case 'language':
        return <Code2 size={16} className="text-sky-400" />;
      default:
        return <Boxes size={16} className="text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs relative">
      {/* Hidden VSIX File Input */}
      <input
        ref={vsixInputRef}
        type="file"
        accept=".vsix,.zip"
        onChange={handleVsixUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Boxes size={14} className="text-sky-400" />
          <span>EXTENSIONS : MARKETPLACE</span>
        </div>
        <button
          onClick={() => vsixInputRef.current?.click()}
          className="p-1 rounded hover:bg-[#333333] text-[#cccccc] hover:text-white flex items-center gap-1 text-[11px]"
          title="Install from VSIX..."
        >
          <Upload size={12} />
          <span className="hidden sm:inline">Install VSIX</span>
        </button>
      </div>

      {/* Search & Categories */}
      <div className="p-2 space-y-2 border-b border-[#333333]">
        <div className="flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 focus-within:border-[#007acc]">
          <Search size={14} className="text-[#858585] shrink-0 mr-1.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Extensions in Marketplace..."
            className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none placeholder-[#666666]"
          />
          {isSearchingOnline && (
            <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'installed', label: `Installed (${extensions.filter(e => e.installed).length})` },
            { id: 'theme', label: 'Themes' },
            { id: 'formatter', label: 'Formatters' },
            { id: 'language', label: 'Languages' },
            { id: 'tool', label: 'Tools' },
            { id: 'snippet', label: 'Snippets' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#007acc] text-white'
                  : 'bg-[#1e1e1e] text-[#858585] hover:bg-[#333333]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Download Progress Banner */}
      {downloadingId && (
        <div className="px-3 py-2 bg-[#1e1e1e] border-b border-[#007acc] animate-fade-in space-y-1">
          <div className="flex items-center justify-between text-[11px] text-sky-400 font-medium">
            <span>{downloadStatus}</span>
            <span>{downloadProgress}%</span>
          </div>
          <div className="w-full h-1 bg-[#333333] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007acc] transition-all duration-300 rounded-full"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Extension Cards Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[#858585]">
            <p>No matching extensions found.</p>
            <button
              onClick={() => vsixInputRef.current?.click()}
              className="mt-3 px-3 py-1.5 bg-[#007acc] text-white rounded font-medium text-xs hover:bg-[#0062a3]"
            >
              Install from .VSIX file
            </button>
          </div>
        ) : (
          filtered.map((ext) => {
            const isThisDownloading = downloadingId === ext.id;

            return (
              <div
                key={ext.id}
                onClick={() => setSelectedExt(ext)}
                className="p-3 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] hover:border-[#3c3c3c] cursor-pointer transition-all hover:bg-[#202022] group"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#252526] border border-[#333333] flex items-center justify-center shrink-0 group-hover:border-sky-500/50 transition-colors">
                      {getExtensionIcon(ext.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs group-hover:text-sky-400 transition-colors">
                        {ext.name}
                      </h4>
                      <p className="text-[11px] text-[#858585]">
                        {ext.publisher} • <span className="font-mono">v{ext.version}</span>
                      </p>
                    </div>
                  </div>

                  {/* Install / Uninstall Button */}
                  <div className="flex items-center gap-1">
                    {ext.installed ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEnable(ext);
                          }}
                          className={`p-1 rounded text-[11px] font-semibold transition-colors ${
                            ext.enabled ? 'text-emerald-400 hover:bg-[#2d2d2d]' : 'text-[#858585] hover:bg-[#2d2d2d]'
                          }`}
                          title={ext.enabled ? 'Disable Extension' : 'Enable Extension'}
                        >
                          {ext.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUninstall(ext);
                          }}
                          className="px-2 py-1 rounded bg-[#2d2d2d] hover:bg-rose-900/60 text-[#858585] hover:text-rose-300 text-[11px] font-semibold transition-colors"
                          title="Uninstall"
                        >
                          Uninstall
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstall(ext);
                        }}
                        disabled={isThisDownloading}
                        className="px-3 py-1 bg-[#007acc] hover:bg-[#0062a3] active:scale-95 disabled:opacity-50 text-white rounded-md font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                      >
                        {isThisDownloading ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        <span>{isThisDownloading ? 'Installing' : 'Install'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-[#999999] mt-1.5 line-clamp-2 leading-relaxed">
                  {ext.description}
                </p>

                {/* Footer Badges */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#2a2a2d] text-[10px] text-[#858585]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Download size={10} />
                      {ext.downloads}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star size={10} fill="currentColor" />
                      {ext.rating}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-[#252526] rounded uppercase text-[9px] font-mono">
                    {ext.category}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Extension Details Modal / Drawer */}
      {selectedExt && (
        <div className="absolute inset-0 bg-[#1e1e1e] z-30 flex flex-col animate-slide-right overflow-hidden">
          {/* Detail Header */}
          <div className="p-4 bg-[#252526] border-b border-[#333333] flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center">
                {getExtensionIcon(selectedExt.category)}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{selectedExt.name}</h3>
                <p className="text-xs text-sky-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>{selectedExt.publisher}</span>
                  <span className="text-[#858585]">• v{selectedExt.version}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedExt(null)}
              className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Action Row */}
          <div className="px-4 py-2.5 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedExt.installed ? (
                <>
                  <button
                    onClick={() => handleUninstall(selectedExt)}
                    className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-rose-900/60 text-rose-400 rounded-md font-semibold text-xs transition-colors"
                  >
                    Uninstall
                  </button>
                  <button
                    onClick={() => handleToggleEnable(selectedExt)}
                    className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-md font-semibold text-xs transition-colors"
                  >
                    {selectedExt.enabled ? 'Disable' : 'Enable'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleInstall(selectedExt)}
                  className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded-md font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Download size={13} />
                  <span>Install Extension</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#858585]">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star size={12} fill="currentColor" />
                {selectedExt.rating}
              </span>
              <span>•</span>
              <span>{selectedExt.downloads} installs</span>
            </div>
          </div>

          {/* README Content View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#cccccc] selectable-text leading-relaxed">
            <div>
              <h4 className="font-bold text-white text-xs mb-1">Description</h4>
              <p className="text-[#858585]">{selectedExt.description}</p>
            </div>

            {selectedExt.features && selectedExt.features.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs">Features & Contributions</h4>
                <ul className="space-y-1 list-disc list-inside text-[#aaaaaa]">
                  {selectedExt.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedExt.readme && (
              <div className="pt-3 border-t border-[#2d2d2d] space-y-2">
                <h4 className="font-bold text-white text-xs">Documentation</h4>
                <div className="p-3 bg-[#181818] rounded-lg border border-[#2d2d2d] font-mono text-[11px] whitespace-pre-wrap text-[#999999]">
                  {selectedExt.readme}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
