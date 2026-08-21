import * as monaco from 'monaco-editor';

/**
 * Initializes and enhances Monaco Editor with advanced TypeScript/JavaScript type definitions,
 * auto-closing tags, and IntelliSense capabilities.
 */
export function setupMonacoIntellisense(monacoInstance: typeof monaco) {
  // TypeScript & JavaScript Compiler Options
  const ts = monacoInstance.languages.typescript;
  
  if (ts && ts.typescriptDefaults) {
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      module: ts.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });

    ts.javascriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true
    });

    // Inject Common React and Node global types
    const extraDeclarations = `
      declare namespace React {
        function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
        function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
        function useRef<T>(initialValue: T): { current: T };
        function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
        function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
        type FC<P = {}> = (props: P) => any;
        type ReactNode = any;
      }
      declare var process: { env: Record<string, string> };
      declare var require: (module: string) => any;
      declare var module: { exports: any };
      declare var exports: any;
    `;

    try {
      ts.typescriptDefaults.addExtraLib(extraDeclarations, 'ts:pocketcode_globals.d.ts');
      ts.javascriptDefaults.addExtraLib(extraDeclarations, 'js:pocketcode_globals.d.ts');
    } catch {}
  }
}
