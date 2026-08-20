import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Lock, AlertTriangle, 
  Activity, Globe, Terminal, RefreshCw, Key, 
  Eye, CheckCircle2, XCircle, Slash, Radio
} from 'lucide-react';
import { securityService, SecurityThreat, SecurityAuditResult } from '../../services/securityService';
import { FileItem } from '../../types';

interface SecurityPanelProps {
  files: FileItem[];
  onOpenTerminal?: () => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ files, onOpenTerminal }) => {
  const [threats, setThreats] = useState<SecurityThreat[]>(securityService.getThreats());
  const [auditResult, setAuditResult] = useState<SecurityAuditResult>(securityService.runFullSecurityAudit(files));
  const [isStrict, setIsStrict] = useState(securityService.isStrict());
  const [isWafActive, setIsWafActive] = useState(securityService.isWafActive());
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'secrets' | 'firewall'>('overview');

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = securityService.runFullSecurityAudit(files);
      setAuditResult(result);
      setThreats(securityService.getThreats());
      setIsAuditing(false);
    }, 400);
  };

  const handleToggleWaf = () => {
    const next = !isWafActive;
    securityService.setWafActive(next);
    setIsWafActive(next);
  };

  const handleToggleStrict = () => {
    const next = !isStrict;
    securityService.setStrict(next);
    setIsStrict(next);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score >= 70) return 'text-sky-400 border-sky-500/40 bg-sky-950/20';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] select-none text-xs font-sans">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#2d2d2d] flex items-center justify-between shrink-0 bg-[#252526]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="font-bold text-xs text-white tracking-wide uppercase">CYBERSECURITY & FIREWALL</span>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-white transition-colors"
          title="Rescan Workspace"
        >
          <RefreshCw size={13} className={isAuditing ? 'animate-spin text-sky-400' : ''} />
        </button>
      </div>

      {/* Subnav Tabs */}
      <div className="flex items-center px-2 pt-1 border-b border-[#2d2d2d] bg-[#1a1a1a] gap-1 shrink-0 overflow-x-auto no-scrollbar">
        {(['overview', 'threats', 'secrets', 'firewall'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-t transition-colors capitalize ${
              activeTab === tab
                ? 'bg-[#252526] text-sky-400 border-b-2 border-sky-400'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            {tab}
            {tab === 'threats' && threats.length > 0 && (
              <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-rose-500/20 text-rose-400 rounded-full font-mono font-bold">
                {threats.length}
              </span>
            )}
            {tab === 'secrets' && auditResult.secretsFound.length > 0 && (
              <span className="ml-1.5 px-1 py-0.2 text-[9px] bg-amber-500/20 text-amber-400 rounded-full font-mono font-bold">
                {auditResult.secretsFound.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'overview' && (
          <>
            {/* Main Defense Banner */}
            <div className="p-3 bg-gradient-to-br from-emerald-950/30 via-[#181818] to-[#121214] border border-emerald-500/30 rounded-xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">ANTIHACKING SHIELD ACTIVE</h3>
                    <p className="text-[10px] text-emerald-400/80 font-mono">Status: {auditResult.status} (WASM Isolated)</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-sm ${getScoreColor(auditResult.score)}`}>
                  {auditResult.score}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-white/5 text-[10px]">
                <div className="bg-[#121214]/60 p-2 rounded border border-white/5 flex flex-col items-center">
                  <span className="text-[#858585]">WAF Guard</span>
                  <span className="text-emerald-400 font-bold mt-0.5">ARMORED</span>
                </div>
                <div className="bg-[#121214]/60 p-2 rounded border border-white/5 flex flex-col items-center">
                  <span className="text-[#858585]">Threats Blocked</span>
                  <span className="text-sky-400 font-bold mt-0.5">{threats.length}</span>
                </div>
                <div className="bg-[#121214]/60 p-2 rounded border border-white/5 flex flex-col items-center">
                  <span className="text-[#858585]">Sandbox</span>
                  <span className="text-purple-400 font-bold mt-0.5">V8 ISOLATED</span>
                </div>
              </div>
            </div>

            {/* Quick Security Status Toggles */}
            <div className="p-3 bg-[#252526] rounded-lg border border-[#333333] space-y-2.5">
              <div className="text-[11px] font-bold uppercase text-[#858585] tracking-wider">Firewall & Sandbox Settings</div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Web Application Firewall (WAF)</div>
                  <div className="text-[10px] text-[#858585]">Inspects outbound HTTP and API calls</div>
                </div>
                <button
                  onClick={handleToggleWaf}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    isWafActive ? 'bg-emerald-600' : 'bg-[#3c3c3c]'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isWafActive ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
                <div>
                  <div className="text-xs font-semibold text-white">Strict SSRF & Private IP Guard</div>
                  <div className="text-[10px] text-[#858585]">Blocks internal network probes (10.*, 192.168.*)</div>
                </div>
                <button
                  onClick={handleToggleStrict}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    isStrict ? 'bg-sky-600' : 'bg-[#3c3c3c]'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isStrict ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Anti-Hacking Capabilities Card */}
            <div className="p-3 bg-[#252526] rounded-lg border border-[#333333] space-y-2">
              <div className="text-[11px] font-bold uppercase text-[#858585] tracking-wider">Active Defense Modules</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Prototype Pollution Protection Enabled</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>CSP (Content Security Policy) Auto-Injection</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Path Traversal & Shell Injection Sanitizer</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Secrets & API Key Leak Prevention Guard</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Threats Log Tab */}
        {activeTab === 'threats' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#858585]">
              <span>Real-Time Threat Events ({threats.length})</span>
              <button
                onClick={() => {
                  securityService.clearThreats();
                  setThreats([]);
                }}
                className="text-xs text-sky-400 hover:underline"
              >
                Clear Log
              </button>
            </div>

            {threats.length === 0 ? (
              <div className="p-4 text-center bg-[#252526] rounded-lg border border-[#333333] text-[#858585]">
                <CheckCircle2 size={24} className="mx-auto mb-1.5 text-emerald-400" />
                <p className="font-semibold text-white">No active threats detected.</p>
                <p className="text-[10px] mt-0.5">Firewall is actively scanning runtime executions.</p>
              </div>
            ) : (
              threats.map((t) => (
                <div key={t.id} className="p-2.5 bg-[#252526] rounded-lg border border-rose-500/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono font-bold text-[9px]">
                      {t.type} • {t.action}
                    </span>
                    <span className="text-[10px] text-[#858585] font-mono">{t.timestamp}</span>
                  </div>
                  <p className="text-xs font-semibold text-white">{t.description}</p>
                  <div className="p-1.5 bg-[#181818] rounded font-mono text-[10px] text-rose-300 break-all">
                    {t.payload}
                  </div>
                  <div className="text-[9px] text-[#858585]">Source: {t.source}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Secrets Scanner Tab */}
        {activeTab === 'secrets' && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase text-[#858585] tracking-wider">
              Credentials & Secrets Detector
            </div>

            {auditResult.secretsFound.length === 0 ? (
              <div className="p-4 text-center bg-[#252526] rounded-lg border border-[#333333] text-[#858585]">
                <Key size={24} className="mx-auto mb-1.5 text-emerald-400" />
                <p className="font-semibold text-white">No exposed credentials detected</p>
                <p className="text-[10px] mt-0.5">All files are clean of plaintext API keys and private tokens.</p>
              </div>
            ) : (
              auditResult.secretsFound.map((sec, idx) => (
                <div key={idx} className="p-2.5 bg-[#252526] rounded-lg border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {sec.type}
                    </span>
                    <span className="text-[10px] text-[#858585] font-mono">{sec.file}:{sec.line}</span>
                  </div>
                  <div className="p-1.5 bg-[#181818] rounded font-mono text-[10px] text-amber-200">
                    {sec.maskedValue}
                  </div>
                  <p className="text-[10px] text-[#858585]">
                    Recommendation: Move this secret into environment variables or secrets store.
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Firewall Tab */}
        {activeTab === 'firewall' && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase text-[#858585] tracking-wider">
              Network WAF Domain Rules
            </div>

            <div className="p-2.5 bg-[#252526] rounded-lg border border-[#333333] space-y-1.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-400" />
                <span>Allowed CDN & Package Registries</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {securityService.getAllowedDomains().map((d) => (
                  <span key={d} className="px-1.5 py-0.5 rounded bg-[#181818] text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                    ✓ {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-[#252526] rounded-lg border border-[#333333] space-y-1.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Slash size={13} className="text-rose-400" />
                <span>Blocked Metadata & Malicious IPs</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {securityService.getBlockedDomains().map((d) => (
                  <span key={d} className="px-1.5 py-0.5 rounded bg-[#181818] text-rose-400 text-[10px] font-mono border border-rose-500/20">
                    ✕ {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
