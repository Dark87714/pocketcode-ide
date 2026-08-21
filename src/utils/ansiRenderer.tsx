import React from 'react';

// VS Code Dark+ Terminal 16-color ANSI Palette
const ANSI_COLORS_FG: Record<number, string> = {
  30: '#000000', // Black
  31: '#cd3131', // Red
  32: '#0dbc79', // Green
  33: '#e5e510', // Yellow
  34: '#2472c8', // Blue
  35: '#bc3fbc', // Magenta
  36: '#11a8cd', // Cyan
  37: '#e5e5e5', // White
  90: '#666666', // Bright Black (Gray)
  91: '#f14c4c', // Bright Red
  92: '#23d18b', // Bright Green
  93: '#f5f543', // Bright Yellow
  94: '#3b8eea', // Bright Blue
  95: '#d670d6', // Bright Magenta
  96: '#29b8db', // Bright Cyan
  97: '#ffffff', // Bright White
};

const ANSI_COLORS_BG: Record<number, string> = {
  40: '#000000',
  41: '#cd3131',
  42: '#0dbc79',
  43: '#e5e510',
  44: '#2472c8',
  45: '#bc3fbc',
  46: '#11a8cd',
  47: '#e5e5e5',
  100: '#666666',
  101: '#f14c4c',
  102: '#23d18b',
  103: '#f5f543',
  104: '#3b8eea',
  105: '#d670d6',
  106: '#29b8db',
  107: '#ffffff',
};

interface AnsiStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
}

/**
 * Parses raw text containing ANSI escape sequences (e.g. \x1b[32m, \x1b[1;34m, \x1b[0m)
 * and renders it as styled React spans matching VS Code's terminal styling.
 */
export const renderAnsiContent = (rawText: string): React.ReactNode => {
  if (!rawText) return null;
  if (!rawText.includes('\x1b') && !rawText.includes('\u001b')) {
    return rawText;
  }

  // Regex to match ANSI SGR escape sequences
  const ansiRegex = /(?:\x1b|\u001b)\[([0-9;]*)m/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentStyle: AnsiStyle = {};
  let match: RegExpExecArray | null;

  let keyIndex = 0;

  while ((match = ansiRegex.exec(rawText)) !== null) {
    const textChunk = rawText.slice(lastIndex, match.index);
    if (textChunk) {
      elements.push(
        <span
          key={`chunk_${keyIndex++}`}
          style={{
            color: currentStyle.inverse ? currentStyle.bg : currentStyle.fg,
            backgroundColor: currentStyle.inverse ? currentStyle.fg : currentStyle.bg,
            fontWeight: currentStyle.bold ? 'bold' : undefined,
            opacity: currentStyle.dim ? 0.7 : undefined,
            fontStyle: currentStyle.italic ? 'italic' : undefined,
            textDecoration: [
              currentStyle.underline ? 'underline' : '',
              currentStyle.strikethrough ? 'line-through' : ''
            ].filter(Boolean).join(' ') || undefined
          }}
        >
          {textChunk}
        </span>
      );
    }

    const codeSequence = match[1];
    if (!codeSequence || codeSequence === '0') {
      currentStyle = {};
    } else {
      const codes = codeSequence.split(';').map((c) => parseInt(c, 10));
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (code === 0) {
          currentStyle = {};
        } else if (code === 1) {
          currentStyle.bold = true;
        } else if (code === 2) {
          currentStyle.dim = true;
        } else if (code === 3) {
          currentStyle.italic = true;
        } else if (code === 4) {
          currentStyle.underline = true;
        } else if (code === 7) {
          currentStyle.inverse = true;
        } else if (code === 9) {
          currentStyle.strikethrough = true;
        } else if (code === 22) {
          currentStyle.bold = false;
          currentStyle.dim = false;
        } else if (code === 23) {
          currentStyle.italic = false;
        } else if (code === 24) {
          currentStyle.underline = false;
        } else if (code === 27) {
          currentStyle.inverse = false;
        } else if (code === 29) {
          currentStyle.strikethrough = false;
        } else if (code === 39) {
          delete currentStyle.fg;
        } else if (code === 49) {
          delete currentStyle.bg;
        } else if (ANSI_COLORS_FG[code]) {
          currentStyle.fg = ANSI_COLORS_FG[code];
        } else if (ANSI_COLORS_BG[code]) {
          currentStyle.bg = ANSI_COLORS_BG[code];
        } else if (code === 38 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          // 256 color foreground: \x1b[38;5;<n>m
          const colorIndex = codes[i + 2];
          currentStyle.fg = get256Color(colorIndex);
          i += 2;
        } else if (code === 48 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          // 256 color background: \x1b[48;5;<n>m
          const colorIndex = codes[i + 2];
          currentStyle.bg = get256Color(colorIndex);
          i += 2;
        } else if (code === 38 && codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          // 24-bit TrueColor foreground: \x1b[38;2;r;g;bm
          currentStyle.fg = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`;
          i += 4;
        } else if (code === 48 && codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          // 24-bit TrueColor background: \x1b[48;2;r;g;bm
          currentStyle.bg = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`;
          i += 4;
        }
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const trailingChunk = rawText.slice(lastIndex);
  if (trailingChunk) {
    elements.push(
      <span
        key={`chunk_${keyIndex++}`}
        style={{
          color: currentStyle.inverse ? currentStyle.bg : currentStyle.fg,
          backgroundColor: currentStyle.inverse ? currentStyle.fg : currentStyle.bg,
          fontWeight: currentStyle.bold ? 'bold' : undefined,
          opacity: currentStyle.dim ? 0.7 : undefined,
          fontStyle: currentStyle.italic ? 'italic' : undefined,
          textDecoration: [
            currentStyle.underline ? 'underline' : '',
            currentStyle.strikethrough ? 'line-through' : ''
          ].filter(Boolean).join(' ') || undefined
        }}
      >
        {trailingChunk}
      </span>
    );
  }

  return <>{elements}</>;
};

// Helper for 256-color lookups
function get256Color(n: number): string {
  if (n < 16) {
    const basic16 = [
      '#000000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5',
      '#666666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#ffffff'
    ];
    return basic16[n] || '#ffffff';
  }
  if (n >= 232 && n <= 255) {
    // Grayscale
    const gray = Math.round(((n - 232) / 23) * 255);
    return `rgb(${gray}, ${gray}, ${gray})`;
  }
  // 6x6x6 color cube
  n -= 16;
  const b = n % 6;
  const g = Math.floor(n / 6) % 6;
  const r = Math.floor(n / 36) % 6;
  const steps = [0, 95, 135, 175, 215, 255];
  return `rgb(${steps[r]}, ${steps[g]}, ${steps[b]})`;
}
