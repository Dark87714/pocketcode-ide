import React from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { getTabIcon } from './EditorTabs';

interface BreadcrumbsProps {
  filePath: string;
  onNavigatePath?: (path: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ filePath, onNavigatePath }) => {
  if (!filePath) return null;

  const parts = filePath.replace(/^\/+/, '').split('/');
  const fileName = parts[parts.length - 1];

  let cumulativePath = '';

  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-[#1e1e1e] border-b border-[#252526] text-[11px] text-[#858585] overflow-x-auto no-scrollbar select-none font-sans shrink-0">
      <span 
        onClick={() => onNavigatePath?.('')}
        className="hover:text-white cursor-pointer transition-colors flex items-center gap-1 font-medium"
      >
        <Folder size={11} className="text-[#858585]" />
        <span>root</span>
      </span>
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        cumulativePath = cumulativePath ? `${cumulativePath}/${part}` : part;
        const currentPath = cumulativePath;

        return (
          <React.Fragment key={index}>
            <ChevronRight size={10} className="shrink-0 text-[#555555]" />
            <div 
              onClick={() => onNavigatePath?.(currentPath)}
              className={`flex items-center gap-1 transition-colors ${
                isLast 
                  ? 'text-[#cccccc] font-medium' 
                  : 'hover:text-white cursor-pointer text-[#858585]'
              }`}
            >
              {isLast && getTabIcon(fileName)}
              <span>{part}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

