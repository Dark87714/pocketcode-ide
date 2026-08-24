import { pyodideService } from './pyodideService';
import { fileSystemService } from './fileSystem';

export interface Breakpoint {
  id: string;
  filePath: string;
  lineNumber: number;
  enabled: boolean;
  condition?: string;
}

export interface StackFrame {
  id: string;
  name: string;
  file: string;
  line: number;
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
  scope: 'local' | 'global' | 'watch';
}

export type DebugState = 'idle' | 'running' | 'paused' | 'stopped';

export class DebuggerService {
  private breakpoints: Map<string, Breakpoint[]> = new Map(); // filePath -> Breakpoint[]
  private state: DebugState = 'idle';
  private currentFrame: StackFrame | null = null;
  private stackFrames: StackFrame[] = [];
  private variables: DebugVariable[] = [];
  private watchExpressions: string[] = ['activeFile', 'total', 'count'];
  private watchResults: DebugVariable[] = [];
  private activeFile: string | null = null;
  private stepResolver: ((action: 'step' | 'step_into' | 'step_out' | 'continue' | 'stop') => void) | null = null;

  constructor() {
    // Expose bridge to window for Python/Worker callbacks
    if (typeof window !== 'undefined') {
      (window as any).__POCKETCODE_DEBUGGER_BRIDGE__ = {
        onPause: (file: string, line: number, funcName: string, localsJson: string, globalsJson: string, framesJson: string) => {
          return this.handlePythonPause(file, line, funcName, localsJson, globalsJson, framesJson);
        }
      };
    }
  }

  // --- Breakpoint Management ---

  getBreakpoints(filePath?: string): Breakpoint[] {
    if (filePath) {
      return this.breakpoints.get(filePath) || [];
    }
    const all: Breakpoint[] = [];
    this.breakpoints.forEach(list => all.push(...list));
    return all;
  }

  toggleBreakpoint(filePath: string, lineNumber: number, condition?: string): Breakpoint | null {
    const list = this.breakpoints.get(filePath) || [];
    const existingIndex = list.findIndex(b => b.lineNumber === lineNumber);

    let result: Breakpoint | null = null;
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    } else {
      result = {
        id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        filePath,
        lineNumber,
        enabled: true,
        condition
      };
      list.push(result);
      list.sort((a, b) => a.lineNumber - b.lineNumber);
    }

    this.breakpoints.set(filePath, list);
    this.emitChange('pocketcode:breakpoints-changed', { filePath, breakpoints: list });
    return result;
  }

  setBreakpointEnabled(id: string, enabled: boolean) {
    this.breakpoints.forEach(list => {
      const bp = list.find(b => b.id === id);
      if (bp) {
        bp.enabled = enabled;
      }
    });
    this.emitChange('pocketcode:breakpoints-changed', {});
  }

  removeBreakpoint(id: string) {
    this.breakpoints.forEach((list, file) => {
      const filtered = list.filter(b => b.id !== id);
      this.breakpoints.set(file, filtered);
    });
    this.emitChange('pocketcode:breakpoints-changed', {});
  }

  clearAllBreakpoints() {
    this.breakpoints.clear();
    this.emitChange('pocketcode:breakpoints-changed', {});
  }

  // --- Watch Expressions ---

  getWatchExpressions(): string[] {
    return this.watchExpressions;
  }

  addWatchExpression(expr: string) {
    const trimmed = expr.trim();
    if (trimmed && !this.watchExpressions.includes(trimmed)) {
      this.watchExpressions.push(trimmed);
      this.evaluateWatchExpressions();
      this.emitChange('pocketcode:debug-watch-changed', {});
    }
  }

  removeWatchExpression(expr: string) {
    this.watchExpressions = this.watchExpressions.filter(w => w !== expr);
    this.watchResults = this.watchResults.filter(w => w.name !== expr);
    this.emitChange('pocketcode:debug-watch-changed', {});
  }

  getWatchResults(): DebugVariable[] {
    return this.watchResults;
  }

  // --- Debug Session Controls ---

  getState(): DebugState {
    return this.state;
  }

  getCurrentFrame(): StackFrame | null {
    return this.currentFrame;
  }

  getStackFrames(): StackFrame[] {
    return this.stackFrames;
  }

  getVariables(): DebugVariable[] {
    return this.variables;
  }

  async startDebugging(
    filePath: string, 
    content: string, 
    language: string,
    onOutput: (line: string, type: 'stdout' | 'stderr' | 'system') => void
  ) {
    this.activeFile = filePath;
    this.setState('running');
    onOutput(`⚡ [Debug Engine] Starting interactive debug session for ${filePath}...`, 'system');

    const lang = language.toLowerCase();
    if (lang === 'python' || filePath.endsWith('.py')) {
      await this.debugPython(filePath, content, onOutput);
    } else if (lang === 'javascript' || lang === 'typescript' || filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      await this.debugJavaScript(filePath, content, onOutput);
    } else {
      onOutput(`⚠️ Interactive debugging is not yet supported for ${language}. Running file standard...`, 'stderr');
      this.setState('idle');
    }
  }

  stepOver() {
    if (this.state === 'paused' && this.stepResolver) {
      const resolver = this.stepResolver;
      this.stepResolver = null;
      this.setState('running');
      resolver('step');
    }
  }

  stepInto() {
    if (this.state === 'paused' && this.stepResolver) {
      const resolver = this.stepResolver;
      this.stepResolver = null;
      this.setState('running');
      resolver('step_into');
    }
  }

  stepOut() {
    if (this.state === 'paused' && this.stepResolver) {
      const resolver = this.stepResolver;
      this.stepResolver = null;
      this.setState('running');
      resolver('step_out');
    }
  }

  continueExecution() {
    if (this.state === 'paused' && this.stepResolver) {
      const resolver = this.stepResolver;
      this.stepResolver = null;
      this.setState('running');
      resolver('continue');
    }
  }

  stopDebugging() {
    if (this.stepResolver) {
      const resolver = this.stepResolver;
      this.stepResolver = null;
      resolver('stop');
    }
    this.cleanupSession();
    this.emitChange('pocketcode:debug-stopped', {});
  }

  // --- Python bdb Debugger Integration ---

  private async debugPython(
    filePath: string,
    code: string,
    onOutput: (line: string, type: 'stdout' | 'stderr' | 'system') => void
  ) {
    const activeBps = (this.breakpoints.get(filePath) || [])
      .filter(b => b.enabled)
      .map(b => b.lineNumber);

    const bpListStr = `[${activeBps.join(', ')}]`;

    // Python Bdb interactive tracer harness
    const pyDebuggerScript = `
import sys
import bdb
import json
import js

class _PocketCodeDebugger(bdb.Bdb):
    def __init__(self, target_bps):
        super().__init__()
        self.target_bps = set(target_bps)
        self.interrupted = False
        self.stepping = False

    def user_line(self, frame):
        if self.interrupted:
            raise KeyboardInterrupt("Debug session stopped by user")

        lineno = frame.f_lineno
        filename = frame.f_code.co_filename
        func_name = frame.f_code.co_name

        # Trigger pause if breakpoint or stepping
        if self.stepping or (lineno in self.target_bps):
            # Extract local variables
            locs = {}
            for k, v in list(frame.f_locals.items()):
                if not k.startswith('__'):
                    try:
                        locs[k] = {"val": repr(v), "type": type(v).__name__}
                    except Exception:
                        locs[k] = {"val": "<unrepresentable>", "type": "unknown"}

            # Extract global variables
            globs = {}
            for k, v in list(frame.f_globals.items()):
                if not k.startswith('__') and k not in ('sys', 'bdb', 'json', 'js', '_PocketCodeDebugger'):
                    try:
                        globs[k] = {"val": repr(v), "type": type(v).__name__}
                    except Exception:
                        globs[k] = {"val": "<unrepresentable>", "type": "unknown"}

            # Extract call stack
            stack_frames = []
            curr = frame
            while curr is not None:
                stack_frames.append({
                    "name": curr.f_code.co_name,
                    "file": curr.f_code.co_filename,
                    "line": curr.f_lineno
                })
                curr = curr.f_back

            # Call JavaScript async pause handler
            action = js.window.__POCKETCODE_DEBUGGER_BRIDGE__.onPause(
                filename, 
                lineno, 
                func_name,
                json.dumps(locs), 
                json.dumps(globs),
                json.dumps(stack_frames)
            )

            if action == 'step' or action == 'step_into':
                self.set_step()
                self.stepping = True
            elif action == 'step_out':
                self.set_return(frame)
                self.stepping = True
            elif action == 'continue':
                self.set_continue()
                self.stepping = False
            elif action == 'stop':
                self.interrupted = True
                raise KeyboardInterrupt("Debug session terminated")

def _run_debugged_code(bps):
    code_str = str(js.window.__POCKETCODE_DEBUGGER_BRIDGE__.activeCode)
    dbg = _PocketCodeDebugger(bps)
    compiled = compile(code_str, '${filePath.replace(/\\/g, '/')}', 'exec')
    dbg.run(compiled)

_run_debugged_code(${bpListStr})
`;

    try {
      if (typeof window !== 'undefined' && (window as any).__POCKETCODE_DEBUGGER_BRIDGE__) {
        (window as any).__POCKETCODE_DEBUGGER_BRIDGE__.activeCode = code;
      }

      await pyodideService.runPython(
        pyDebuggerScript,
        msg => onOutput(msg, 'stdout'),
        err => {
          if (!err.includes('Debug session terminated') && !err.includes('KeyboardInterrupt')) {
            onOutput(err, 'stderr');
          }
        }
      );
      onOutput(`✅ [Debug Engine] Session completed for ${filePath}.`, 'system');
    } catch (e: any) {
      if (!String(e).includes('KeyboardInterrupt')) {
        onOutput(`❌ [Debug Error] ${e.message || e}`, 'stderr');
      }
    } finally {
      if (typeof window !== 'undefined' && (window as any).__POCKETCODE_DEBUGGER_BRIDGE__) {
        (window as any).__POCKETCODE_DEBUGGER_BRIDGE__.activeCode = null;
      }
      this.cleanupSession();
    }
  }

  // --- JavaScript Debugger Simulation Harness ---

  private async debugJavaScript(
    filePath: string,
    code: string,
    onOutput: (line: string, type: 'stdout' | 'stderr' | 'system') => void
  ) {
    const lines = code.split('\n');
    const bps = new Set((this.breakpoints.get(filePath) || []).filter(b => b.enabled).map(b => b.lineNumber));

    onOutput(`⚡ [Debug Engine] JavaScript runtime stepper initialized.`, 'system');

    // Instrument line boundaries
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const lineText = lines[i].trim();

      if (bps.has(lineNum) && lineText && !lineText.startsWith('//') && !lineText.startsWith('/*')) {
        const dummyLocals: Record<string, { val: string; type: string }> = {
          currentLine: { val: `${lineNum}`, type: 'number' },
          sourceSnippet: { val: JSON.stringify(lineText), type: 'string' },
          scope: { val: 'Module Scope', type: 'object' }
        };

        const dummyFrames: StackFrame[] = [
          { id: `frame_${lineNum}`, name: `(anonymous) [Line ${lineNum}]`, file: filePath, line: lineNum },
          { id: 'frame_main', name: 'main()', file: filePath, line: 1 }
        ];

        const action = await this.handlePythonPause(
          filePath,
          lineNum,
          'anonymous',
          JSON.stringify(dummyLocals),
          JSON.stringify({}),
          JSON.stringify(dummyFrames)
        );

        if (action === 'stop') break;
      }
    }

    onOutput(`✅ [Debug Engine] Execution finished.`, 'system');
    this.cleanupSession();
  }

  private handlePythonPause(
    file: string,
    line: number,
    funcName: string,
    localsJson: string,
    globalsJson: string,
    framesJson: string
  ): Promise<string> {
    return new Promise((resolve) => {
      this.stepResolver = resolve;

      let parsedLocals: Record<string, { val: string; type: string }> = {};
      let parsedGlobals: Record<string, { val: string; type: string }> = {};
      let parsedFrames: StackFrame[] = [];

      try { parsedLocals = JSON.parse(localsJson); } catch {}
      try { parsedGlobals = JSON.parse(globalsJson); } catch {}
      try { parsedFrames = JSON.parse(framesJson); } catch {}

      this.currentFrame = {
        id: `f_${line}`,
        name: funcName || '(module)',
        file,
        line
      };
      this.stackFrames = parsedFrames.length > 0 ? parsedFrames : [this.currentFrame];

      const vars: DebugVariable[] = [];
      Object.entries(parsedLocals).forEach(([k, v]) => {
        vars.push({ name: k, value: v.val, type: v.type, scope: 'local' });
      });
      Object.entries(parsedGlobals).forEach(([k, v]) => {
        vars.push({ name: k, value: v.val, type: v.type, scope: 'global' });
      });
      this.variables = vars;

      this.evaluateWatchExpressions();
      this.setState('paused');

      this.emitChange('pocketcode:debug-paused', {
        file,
        line,
        currentFrame: this.currentFrame,
        stackFrames: this.stackFrames,
        variables: this.variables
      });
    });
  }

  private evaluateWatchExpressions() {
    this.watchResults = this.watchExpressions.map(expr => {
      const match = this.variables.find(v => v.name === expr);
      if (match) {
        return { name: expr, value: match.value, type: match.type, scope: 'watch' };
      }
      return { name: expr, value: '<not in scope>', type: 'undefined', scope: 'watch' };
    });
  }

  private setState(state: DebugState) {
    this.state = state;
    this.emitChange('pocketcode:debug-state-changed', { state });
  }

  private cleanupSession() {
    this.state = 'idle';
    this.currentFrame = null;
    this.stackFrames = [];
    this.variables = [];
    this.stepResolver = null;
    this.setState('idle');
    this.emitChange('pocketcode:debug-state-changed', { state: 'idle' });
  }

  private emitChange(eventName: string, detail: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }
}

export const debuggerService = new DebuggerService();
