import React from 'react';
import { X, Gamepad2, Code2, Layout, ArrowRight, Check } from 'lucide-react';
import { PROJECT_TEMPLATES } from '../../services/templates';
import { ProjectTemplate } from '../../types';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  if (!isOpen) return null;

  const getTemplateIcon = (id: string) => {
    switch (id) {
      case 'cyber-runner-game':
        return <Gamepad2 size={24} className="text-emerald-400" />;
      case 'python-data-science':
        return <Code2 size={24} className="text-sky-400" />;
      default:
        return <Layout size={24} className="text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="w-full max-w-xl bg-[#252526] border border-[#3c3c3c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333]">
          <div>
            <h3 className="font-bold text-white text-sm">Starter Project Templates</h3>
            <p className="text-xs text-[#858585]">Choose a template to instantly scaffold a working project.</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#858585] hover:text-white rounded">
            <X size={18} />
          </button>
        </div>

        {/* Templates List */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {PROJECT_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl.id);
                onClose();
              }}
              className="p-3.5 bg-[#1e1e1e] rounded-xl border border-[#333333] hover:border-[#007acc] cursor-pointer group transition-all duration-200 hover:shadow-lg flex items-start gap-3.5"
            >
              <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] flex items-center justify-center shrink-0 border border-[#3c3c3c]">
                {getTemplateIcon(tmpl.id)}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm group-hover:text-sky-400 transition-colors">
                    {tmpl.name}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2d2d2d] text-[#aaaaaa] font-semibold uppercase">
                    {tmpl.category}
                  </span>
                </div>
                <p className="text-xs text-[#858585] mt-1 line-clamp-2">{tmpl.description}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#666666] font-mono">
                  <span>Files: {Object.keys(tmpl.files).join(', ')}</span>
                </div>
              </div>

              <div className="self-center">
                <div className="w-8 h-8 rounded-full bg-[#2a2a2a] group-hover:bg-[#007acc] text-white flex items-center justify-center transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
