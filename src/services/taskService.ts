import { DiagnosticProblem } from '../types';
import { fileSystemService } from './fileSystem';

export interface TaskDefinition {
  id: string;
  label: string;
  type: 'shell' | 'runner' | 'security' | 'format';
  command: string;
  group?: 'build' | 'test' | 'clean';
  problemMatcher?: 'tsc' | 'python' | 'eslint' | 'gcc';
}

export class TaskService {
  private defaultTasks: TaskDefinition[] = [
    {
      id: 'task_typecheck',
      label: 'TypeScript: TypeCheck & Diagnostics',
      type: 'runner',
      command: 'tsc --noEmit',
      group: 'build',
      problemMatcher: 'tsc'
    },
    {
      id: 'task_security_scan',
      label: 'Security: Full Workspace Threat & Secret Audit',
      type: 'security',
      command: 'security audit',
      group: 'test',
      problemMatcher: 'eslint'
    },
    {
      id: 'task_format_workspace',
      label: 'Formatter: Format All Workspace Files',
      type: 'format',
      command: 'format --all',
      group: 'clean'
    },
    {
      id: 'task_python_test',
      label: 'Python: Run Active File with Diagnostics',
      type: 'runner',
      command: 'python -m unittest',
      group: 'test',
      problemMatcher: 'python'
    }
  ];

  getTasks(): TaskDefinition[] {
    try {
      const taskFile = fileSystemService.getFileByPath('.pocketcode/tasks.json');
      if (taskFile) {
        const json = JSON.parse(taskFile.content);
        if (Array.isArray(json.tasks)) {
          return [...json.tasks, ...this.defaultTasks];
        }
      }
    } catch {}

    return this.defaultTasks;
  }

  /**
   * Parses raw compiler/linter terminal lines into structured diagnostic problems
   */
  parseProblems(output: string): DiagnosticProblem[] {
    const problems: DiagnosticProblem[] = [];
    const lines = output.split('\n');

    const patterns = [
      // 1. TypeScript tsc: src/App.tsx(42,15): error TS2304: Cannot find name 'foo'.
      {
        regex: /^([a-zA-Z0-9_\-\.\/]+)\((\d+),(\d+)\):\s*(error|warning)\s*(?:TS\d+)?:\s*(.+)$/i,
        extract: (m: RegExpMatchArray): DiagnosticProblem => ({
          id: `prob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fileId: m[1],
          fileName: m[1],
          line: parseInt(m[2], 10),
          column: parseInt(m[3], 10),
          severity: m[4].toLowerCase() === 'warning' ? 'warning' : 'error',
          message: m[5].trim()
        })
      },
      // 2. Generic / GCC / Clang / ESLint: src/main.c:10:5: error: expected ';'
      {
        regex: /^([a-zA-Z0-9_\-\.\/]+):(\d+):(\d+):\s*(error|warning|fatal error|info):\s*(.+)$/i,
        extract: (m: RegExpMatchArray): DiagnosticProblem => ({
          id: `prob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fileId: m[1],
          fileName: m[1],
          line: parseInt(m[2], 10),
          column: parseInt(m[3], 10),
          severity: m[4].toLowerCase().includes('warn') ? 'warning' : 'error',
          message: m[5].trim()
        })
      },
      // 3. Python Traceback: File "main.py", line 12, in <module>
      {
        regex: /File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+([a-zA-Z0-9_<>\-]+))?/i,
        extract: (m: RegExpMatchArray): DiagnosticProblem => ({
          id: `prob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fileId: m[1],
          fileName: m[1],
          line: parseInt(m[2], 10),
          column: 1,
          severity: 'error',
          message: m[3] ? `Traceback in function '${m[3]}'` : 'Runtime Exception'
        })
      }
    ];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      for (const p of patterns) {
        const match = trimmed.match(p.regex);
        if (match) {
          try {
            problems.push(p.extract(match));
            break;
          } catch {}
        }
      }
    });

    return problems;
  }
}

export const taskService = new TaskService();
