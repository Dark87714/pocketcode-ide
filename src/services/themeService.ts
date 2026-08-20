export interface IDETheme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  bg: string;
  sidebarBg: string;
  activityBg: string;
  statusBarBg: string;
  accent: string;
  monacoTheme: string;
  monacoData?: any;
}

export const THEMES: IDETheme[] = [
  {
    id: 'vscode-dark',
    name: 'VS Code Dark Modern (Default)',
    type: 'dark',
    bg: '#1e1e1e',
    sidebarBg: '#252526',
    activityBg: '#333333',
    statusBarBg: '#007acc',
    accent: '#007acc',
    monacoTheme: 'vs-dark'
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro (Atom Iconic)',
    type: 'dark',
    bg: '#282c34',
    sidebarBg: '#21252b',
    activityBg: '#1e2227',
    statusBarBg: '#61afef',
    accent: '#61afef',
    monacoTheme: 'one-dark-pro',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'function', foreground: '61afef' },
        { token: 'variable', foreground: 'e06c75' },
        { token: 'type', foreground: 'e5c07b' },
      ],
      colors: {
        'editor.background': '#282c34',
        'editor.foreground': '#abb2bf',
        'editor.lineHighlightBackground': '#2c313c',
        'editorCursor.foreground': '#528bff',
        'editor.selectionBackground': '#3e4451',
      }
    }
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    type: 'dark',
    bg: '#1e1e2e',
    sidebarBg: '#181825',
    activityBg: '#11111b',
    statusBarBg: '#cba6f7',
    accent: '#cba6f7',
    monacoTheme: 'catppuccin-mocha',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cba6f7' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'number', foreground: 'fab387' },
        { token: 'function', foreground: '89b4fa' },
        { token: 'variable', foreground: 'cdd6f4' },
        { token: 'type', foreground: 'f9e2af' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editorCursor.foreground': '#f5e0dc',
        'editor.selectionBackground': '#45475a',
      }
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night Storm',
    type: 'dark',
    bg: '#1a1b26',
    sidebarBg: '#16161e',
    activityBg: '#13141c',
    statusBarBg: '#7aa2f7',
    accent: '#7aa2f7',
    monacoTheme: 'tokyo-night',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7' },
        { token: 'string', foreground: '9ece6a' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'function', foreground: '7aa2f7' },
        { token: 'variable', foreground: 'c0caf5' },
        { token: 'type', foreground: '2ac3de' },
      ],
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5',
        'editor.lineHighlightBackground': '#292e42',
        'editorCursor.foreground': '#c0caf5',
        'editorWhitespace.foreground': '#3b4261',
        'editorIndentGuide.background': '#232433',
        'editor.selectionBackground': '#33467c',
      }
    }
  },
  {
    id: 'dracula',
    name: 'Dracula Official',
    type: 'dark',
    bg: '#282a36',
    sidebarBg: '#21222c',
    activityBg: '#191a21',
    statusBarBg: '#bd93f9',
    accent: '#bd93f9',
    monacoTheme: 'dracula',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'variable', foreground: 'f8f8f2' }
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a75',
        'editorCursor.foreground': '#f8f8f0',
        'editor.selectionBackground': '#44475a',
      }
    }
  },
  {
    id: 'nord',
    name: 'Nord Arctic',
    type: 'dark',
    bg: '#2e3440',
    sidebarBg: '#242933',
    activityBg: '#1d212a',
    statusBarBg: '#88c0d0',
    accent: '#88c0d0',
    monacoTheme: 'nord',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
        { token: 'keyword', foreground: '81a1c1' },
        { token: 'string', foreground: 'a3be8c' },
        { token: 'number', foreground: 'b48ead' },
        { token: 'function', foreground: '88c0d0' },
        { token: 'variable', foreground: 'd8dee9' },
        { token: 'type', foreground: '8fbcbb' },
      ],
      colors: {
        'editor.background': '#2e3440',
        'editor.foreground': '#d8dee9',
        'editor.lineHighlightBackground': '#3b4252',
        'editorCursor.foreground': '#88c0d0',
        'editor.selectionBackground': '#434c5e',
      }
    }
  },
  {
    id: 'synthwave84',
    name: "SynthWave '84 (Cyberpunk Neon)",
    type: 'dark',
    bg: '#262335',
    sidebarBg: '#241b2f',
    activityBg: '#1d1527',
    statusBarBg: '#ff7edb',
    accent: '#fe4450',
    monacoTheme: 'synthwave',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '848bbd', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'fed442' },
        { token: 'string', foreground: 'ff7edb' },
        { token: 'number', foreground: 'f97e72' },
        { token: 'function', foreground: '36f9f6' },
        { token: 'variable', foreground: 'fede5d' },
        { token: 'type', foreground: 'fe4450' }
      ],
      colors: {
        'editor.background': '#262335',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#34294f',
        'editorCursor.foreground': '#ff007f',
        'editor.selectionBackground': '#614d85',
      }
    }
  },
  {
    id: 'shades-of-purple',
    name: 'Shades of Purple',
    type: 'dark',
    bg: '#2d2b55',
    sidebarBg: '#222044',
    activityBg: '#1a1835',
    statusBarBg: '#fad000',
    accent: '#fad000',
    monacoTheme: 'shades-of-purple',
    monacoData: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: 'b362ff', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff9d00' },
        { token: 'string', foreground: 'a5ff90' },
        { token: 'number', foreground: 'ff628c' },
        { token: 'function', foreground: 'fad000' },
        { token: 'variable', foreground: '9effff' },
        { token: 'type', foreground: 'ffee80' },
      ],
      colors: {
        'editor.background': '#2d2b55',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#1f1d41',
        'editorCursor.foreground': '#fad000',
        'editor.selectionBackground': '#b362ff44',
      }
    }
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark Dimmed',
    type: 'dark',
    bg: '#22272e',
    sidebarBg: '#1c2128',
    activityBg: '#181c21',
    statusBarBg: '#316dca',
    accent: '#539bf5',
    monacoTheme: 'vs-dark'
  }
];

export class ThemeService {
  private currentTheme: IDETheme = THEMES[0];

  getThemes(): IDETheme[] {
    return THEMES;
  }

  getCurrentTheme(): IDETheme {
    return this.currentTheme;
  }

  setTheme(themeId: string): IDETheme {
    const found = THEMES.find(t => t.id === themeId);
    if (found) {
      this.currentTheme = found;
      this.applyThemeToDOM(found);
    }
    return this.currentTheme;
  }

  applyThemeToDOM(theme: IDETheme) {
    document.documentElement.style.setProperty('--vscode-bg', theme.bg);
    document.documentElement.style.setProperty('--vscode-sidebar', theme.sidebarBg);
    document.documentElement.style.setProperty('--vscode-activityBar', theme.activityBg);
    document.documentElement.style.setProperty('--vscode-status', theme.statusBarBg);
    document.documentElement.style.setProperty('--vscode-editor-bg', theme.bg);
    document.documentElement.style.setProperty('--vscode-accent', theme.accent);
  }
}

export const themeService = new ThemeService();
