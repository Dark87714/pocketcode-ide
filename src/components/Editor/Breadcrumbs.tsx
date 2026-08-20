import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';
import { getTabIcon } from './EditorTabs';

interface BreadcrumbsProps {
  filePath: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ filePath }) => {
  if (!filePath) return null;

  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];

  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] text-xs text-[#858585] overflow-x-auto no-scrollbar select-none">
      <span className="hover:text-[#cccccc] cursor-pointer">workspace</span>
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={12} className="shrink-0 text-[#555555]" />
            <div className={`flex items-center gap-1 ${isLast ? 'text-[#ffffff] font-medium' : 'hover:text-[#cccccc] cursor-pointer'}`}>
              {isLast && getTabIcon(fileName)}
              <span>{part}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
