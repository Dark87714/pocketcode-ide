import React from 'react';
import { 
  Files, Search, GitFork, PlayCircle, 
  Boxes, Sparkles, Settings, Terminal, Bug, ShieldCheck
} from 'lucide-react';
import { ActiveSidebarTab } from '../../types';

interface ActivityBarProps {
  activeTab: ActiveSidebarTab;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  isSidebarOpen: boolean;
  isMobileBottomNav?: boolean;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  isSidebarOpen,
  isMobileBottomNav = false
}) => {
  const navItems: { id: ActiveSidebarTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'explorer', label: 'Explorer', icon: <Files size={20} /> },
    { id: 'search', label: 'Search', icon: <Search size={20} /> },
    { id: 'git', label: 'Git', icon: <GitFork size={20} /> },
    { id: 'run', label: 'Run', icon: <PlayCircle size={20} /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck size={20} className="text-emerald-400" /> },
    { id: 'extensions', label: 'Extensions', icon: <Boxes size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  if (isMobileBottomNav) {
    return (
      <nav className="w-full bg-[#1e1e1e] border-t border-[#2d2d2d] flex items-center justify-around h-auto min-h-[52px] pt-1.5 pb-2 z-30 select-none safe-bottom shrink-0 shadow-lg">
        {navItems.map((item) => {
          const isActive = isSidebarOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive
                  ? 'text-sky-400 font-semibold'
                  : 'text-[#858585] hover:text-[#cccccc] active:scale-95'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 w-8 h-[2px] bg-sky-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop / Tablet side activity bar
  return (
    <aside className="w-12 bg-[#333333] border-r border-[#252526] flex flex-col items-center justify-between py-2 select-none z-20 shrink-0">
      <div className="flex flex-col items-center gap-1 w-full">
        {navItems.filter(i => i.id !== 'settings').map((item) => {
          const isActive = isSidebarOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-10 h-10 rounded flex items-center justify-center relative transition-colors ${
                isActive
                  ? 'text-white bg-[#252526] border-l-2 border-l-[#007acc]'
                  : 'text-[#858585] hover:text-white hover:bg-[#3c3c3c]'
              }`}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-10 h-10 rounded flex items-center justify-center relative transition-colors ${
            isSidebarOpen && activeTab === 'settings'
              ? 'text-white bg-[#252526] border-l-2 border-l-[#007acc]'
              : 'text-[#858585] hover:text-white hover:bg-[#3c3c3c]'
          }`}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </aside>
  );
};
