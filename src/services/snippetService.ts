import { fileSystemService } from './fileSystem';

export interface Snippet {
  prefix: string;
  body: string | string[];
  description: string;
  scope?: string; // Language or comma-separated list of languages
}

export type SnippetsMap = Record<string, Snippet>;

export class SnippetService {
  private builtInSnippets: Record<string, SnippetsMap> = {
    javascript: {
      clg: {
        prefix: 'clg',
        body: 'console.log(${1:item});$0',
        description: 'Log to console'
      },
      afn: {
        prefix: 'afn',
        body: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
        description: 'Arrow function'
      },
      prm: {
        prefix: 'prm',
        body: 'new Promise((resolve, reject) => {\n\t$0\n});',
        description: 'New Promise'
      },
      trycatch: {
        prefix: 'trycatch',
        body: 'try {\n\t$1\n} catch (error) {\n\tconsole.error(${2:error});\n}$0',
        description: 'Try/Catch Block'
      }
    },
    typescriptreact: {
      rfc: {
        prefix: 'rfc',
        body: 'import React from \'react\';\n\ninterface ${1:ComponentName}Props {\n\t$2\n}\n\nexport const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({\n\t$3\n}) => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};',
        description: 'React Functional Component with Props'
      },
      useState: {
        prefix: 'useState',
        body: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:string}>(${3:initialState});$0',
        description: 'React useState hook'
      },
      useEffect: {
        prefix: 'useEffect',
        body: 'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [${3:dependencies}]);$0',
        description: 'React useEffect hook'
      }
    },
    python: {
      def: {
        prefix: 'def',
        body: 'def ${1:function_name}(${2:args}) -> ${3:None}:\n\t"""${4:Docstring}"""\n\t$0',
        description: 'Function definition with type hints'
      },
      class: {
        prefix: 'class',
        body: 'class ${1:ClassName}:\n\t"""${2:Docstring}"""\n\tdef __init__(self, ${3:args}):\n\t\tself.${4:attr} = ${4:attr}\n\t$0',
        description: 'Class definition'
      },
      ifmain: {
        prefix: 'ifmain',
        body: 'if __name__ == "__main__":\n\t${1:main()}$0',
        description: 'if __name__ == "__main__"'
      },
      withopen: {
        prefix: 'withopen',
        body: 'with open("${1:filename}", "${2:r}", encoding="utf-8") as ${3:f}:\n\t${4:data = f.read()}\n\t$0',
        description: 'Open file context manager'
      },
      tryexcept: {
        prefix: 'tryexcept',
        body: 'try:\n\t$1\nexcept ${2:Exception} as ${3:e}:\n\tprint(f"Error: {${3:e}}")\n\t$0',
        description: 'Try/Except Block'
      }
    },
    html: {
      html5: {
        prefix: 'html5',
        body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n\t<link rel="stylesheet" href="${2:style.css}">\n</head>\n<body>\n\t$0\n\t<script src="${3:main.js}"></script>\n</body>\n</html>',
        description: 'HTML5 Boilerplate'
      }
    },
    css: {
      flexcenter: {
        prefix: 'flexcenter',
        body: 'display: flex;\nalign-items: center;\njustify-content: center;\n$0',
        description: 'Centering flexbox'
      },
      grid2: {
        prefix: 'grid2',
        body: 'display: grid;\ngrid-template-columns: repeat(2, 1fr);\ngap: ${1:1rem};\n$0',
        description: '2-column grid'
      }
    },
    rust: {
      fn: {
        prefix: 'fn',
        body: 'fn ${1:name}(${2:args}) -> ${3:Result<(), Box<dyn std::error::Error>>} {\n\t$0\n}',
        description: 'Function definition'
      },
      struct: {
        prefix: 'struct',
        body: '#[derive(Debug, Clone)]\npub struct ${1:Name} {\n\tpub ${2:field}: ${3:String},\n}$0',
        description: 'Struct with derives'
      }
    },
    sql: {
      select: {
        prefix: 'select',
        body: 'SELECT ${1:*}\nFROM ${2:table_name}\nWHERE ${3:condition}\nORDER BY ${4:id} DESC\nLIMIT ${5:100};$0',
        description: 'SELECT query'
      }
    }
  };

  /**
   * Retrieves snippets for a given language combining built-ins and workspace custom snippets
   */
  getSnippetsForLanguage(language: string): Snippet[] {
    const lang = language.toLowerCase();
    const list: Snippet[] = [];

    // 1. Built-in snippets matching language
    Object.entries(this.builtInSnippets).forEach(([scope, map]) => {
      if (scope === lang || (lang === 'typescript' && scope === 'javascript') || (lang === 'tsx' && scope === 'typescriptreact')) {
        Object.values(map).forEach(s => list.push(s));
      }
    });

    // 2. Load custom project snippets (.pocketcode/snippets.json)
    try {
      const customFile = fileSystemService.getFileByPath('.pocketcode/snippets.json');
      if (customFile) {
        const parsed: Record<string, Snippet> = JSON.parse(customFile.content);
        Object.values(parsed).forEach(snip => {
          if (!snip.scope || snip.scope.toLowerCase().split(',').map(s => s.trim()).includes(lang)) {
            list.push(snip);
          }
        });
      }
    } catch {}

    return list;
  }
}

export const snippetService = new SnippetService();
