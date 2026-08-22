import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, Volume2, Code } from 'lucide-react';
import { FileItem } from '../../types';

interface MediaViewerProps {
  file: FileItem;
  onEditSource?: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ file, onEditSource }) => {
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isSvg = ext === 'svg';
  const isAudio = ['mp3', 'wav', 'ogg', 'aac'].includes(ext);

  // Prepare image source safely
  let src = file.content || '';
  if (src && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('blob:')) {
    if (isSvg) {
      src = `data:image/svg+xml;utf8,${encodeURIComponent(src)}`;
    } else {
      src = `data:image/${ext};base64,${src}`;
    }
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  };

  if (isAudio) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1e1e] p-6 select-none">
        <div className="p-8 rounded-2xl bg-[#252526] border border-[#3c3c3c] flex flex-col items-center gap-4 max-w-sm shadow-xl">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Volume2 size={32} />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-white text-sm">{file.name}</h3>
            <p className="text-xs text-[#858585] mt-0.5 font-mono">{ext.toUpperCase()} Audio Track</p>
          </div>
          <audio controls className="w-full mt-2" src={src}>
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#141414] overflow-hidden select-none">
      {/* Media Toolbar */}
      <div className="h-9 bg-[#252526] border-b border-[#333333] flex items-center justify-between px-3 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-sky-400" />
          <span className="font-medium text-white">{file.name}</span>
          {dimensions && (
            <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[10px] text-[#aaaaaa] font-mono">
              {dimensions.w} × {dimensions.h} px
            </span>
          )}
          <span className="text-[#858585] text-[10px] uppercase font-bold tracking-wider">{ext}</span>
        </div>

        <div className="flex items-center gap-1">
          {isSvg && onEditSource && (
            <button
              onClick={onEditSource}
              className="px-2 py-1 rounded bg-[#333333] hover:bg-[#444444] text-[#cccccc] text-[11px] flex items-center gap-1 mr-2 transition-colors"
            >
              <Code size={12} />
              <span>Edit XML</span>
            </button>
          )}

          <button
            onClick={() => setZoom(z => Math.max(0.2, z - 0.25))}
            className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-mono text-[#858585] min-w-[38px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded text-[#cccccc] hover:bg-[#333333] hover:text-white ml-1"
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Media Canvas with transparent checkerboard pattern */}
      <div 
        className="flex-1 flex items-center justify-center overflow-auto p-4 relative"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #1a1a1a 25%, transparent 25%), 
            linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #1a1a1a 75%), 
            linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      >
        <div 
          className="transition-transform duration-100 ease-out shadow-2xl rounded border border-white/5"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={src}
            alt={file.name}
            onLoad={handleImageLoad}
            className="max-h-[75vh] max-w-[85vw] object-contain rounded"
          />
        </div>
      </div>
    </div>
  );
};
