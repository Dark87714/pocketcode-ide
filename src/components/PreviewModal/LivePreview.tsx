import React, { useState, useEffect, useRef } from 'react';
import { 
  X, RotateCw, Smartphone, Tablet, Monitor, 
  ExternalLink, Terminal, Shield, Play, Sparkles, RefreshCw
} from 'lucide-react';
import { FileItem } from '../../types';
import { webPreviewService, ConsoleLogMessage } from '../../services/webPreviewService';

interface LivePreviewProps {
  isOpen: boolean;
  files: FileItem[];
  onClose: () => void;
}

type DeviceMode = 'mobile' | 'tablet' | 'responsive';

export const LivePreview: React.FC<LivePreviewProps> = ({
  isOpen,
  files,
  onClose
}) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('mobile');
  const [isLandscape, setIsLandscape] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogMessage[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source && event.source !== iframeRef.current.contentWindow) {
        return; // Ignore messages not originating from our active sandbox iframe
      }
      if (event.data && event.data.type === 'POCKETCODE_CONSOLE') {
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: event.data.level || 'log',
            message: event.data.message || '',
            timestamp: event.data.timestamp || new Date().toLocaleTimeString()
          }
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  const previewHtml = webPreviewService.buildPreviewHtml(files);

  const handleOpenInNewTab = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getFrameDimensions = () => {
    if (deviceMode === 'responsive') return 'w-full h-full';

    if (deviceMode === 'mobile') {
      return isLandscape
        ? 'w-[720px] h-[360px] max-w-full rounded-2xl border-4 border-[#333333] shadow-2xl'
        : 'w-[375px] h-[680px] max-w-full max-h-[85vh] rounded-3xl border-4 border-[#333333] shadow-2xl';
    }

    if (deviceMode === 'tablet') {
      return isLandscape
        ? 'w-[850px] h-[560px] max-w-full max-h-[85vh] rounded-2xl border-4 border-[#333333] shadow-2xl'
        : 'w-[580px] h-[780px] max-w-full max-h-[85vh] rounded-2xl border-4 border-[#333333] shadow-2xl';
    }

    return 'w-full h-full';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121214] flex flex-col select-none animate-fade-in">
      {/* Top Controls Bar */}
      <header className="h-12 bg-[#1e1e1e] border-b border-[#2d2d2d] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-xs text-white">Live App Sandbox</span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center bg-[#121214] rounded-lg p-0.5 border border-[#2d2d2d] gap-1">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
              deviceMode === 'mobile' ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-white'
            }`}
            title="iPhone Preview"
          >
            <Smartphone size={14} />
            <span className="text-[11px] hidden sm:inline">Phone</span>
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
              deviceMode === 'tablet' ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-white'
            }`}
            title="Tablet Preview"
          >
            <Tablet size={14} />
            <span className="text-[11px] hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setDeviceMode('responsive')}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
              deviceMode === 'responsive' ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-white'
            }`}
            title="Full Screen View"
          >
            <Monitor size={14} />
            <span className="text-[11px] hidden sm:inline">Full</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {deviceMode !== 'responsive' && (
            <button
              onClick={() => setIsLandscape(!isLandscape)}
              className="p-1.5 rounded hover:bg-[#2d2d2d] text-[#858585] hover:text-white text-xs"
              title="Rotate Device"
            >
              <RotateCw size={15} />
            </button>
          )}

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 rounded hover:bg-[#2d2d2d] text-[#858585] hover:text-white text-xs"
            title="Reload Sandbox"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`p-1.5 rounded text-xs relative transition-colors ${
              showConsole ? 'bg-[#007acc] text-white' : 'hover:bg-[#2d2d2d] text-[#858585] hover:text-white'
            }`}
            title="Toggle Console Logs"
          >
            <Terminal size={15} />
            {consoleLogs.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-sky-400" />
            )}
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Open in new window / Install as standalone app on phone"
          >
            <Smartphone size={13} />
            <span className="hidden sm:inline">Install to Phone</span>
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded hover:bg-[#2d2d2d] text-[#858585] hover:text-white"
            title="Open in New Tab"
          >
            <ExternalLink size={15} />
          </button>

          <div className="h-4 w-[1px] bg-[#333333] mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 rounded bg-rose-900/40 hover:bg-rose-900/80 text-rose-300 font-bold"
            title="Close Preview"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Main Sandbox Frame Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 bg-[#09090b] overflow-hidden relative">
        <div className={`transition-all duration-300 overflow-hidden bg-white ${getFrameDimensions()}`}>
          <iframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={previewHtml}
            title="PocketCode Sandbox Preview"
            sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-popups"
            className="w-full h-full border-0 bg-white"
          />
        </div>

        {/* Embedded Console Drawer inside Sandbox */}
        {showConsole && (
          <div className="absolute bottom-0 inset-x-0 h-44 bg-[#141416] border-t border-[#2d2d2d] flex flex-col font-mono text-xs z-30 shadow-2xl">
            <div className="flex items-center justify-between px-3 py-1 bg-[#1e1e20] text-[11px] text-[#858585]">
              <span>SANDBOX CONSOLE LOGS ({consoleLogs.length})</span>
              <button
                onClick={() => setConsoleLogs([])}
                className="hover:text-white px-2 py-0.5 rounded bg-[#252528]"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 selectable-text">
              {consoleLogs.length === 0 ? (
                <div className="text-[#555555] italic">No console logs output yet.</div>
              ) : (
                consoleLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-[#cccccc]'
                    }`}
                  >
                    <span className="text-[#555555] shrink-0 text-[10px]">{log.timestamp}</span>
                    <span className="font-semibold uppercase text-[10px] shrink-0">[{log.type}]</span>
                    <span className="whitespace-pre-wrap">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
