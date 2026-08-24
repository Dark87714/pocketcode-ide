import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

// Configure marked with syntax highlighting
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Override code block renderer with highlight.js and safe escaping
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = language !== 'plaintext' 
    ? hljs.highlight(text, { language }).value 
    : escapeHtml(text);
  return `<pre class="hljs-code-block"><code class="hljs language-${language}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

interface MarkdownPreviewProps {
  content: string;
  fileName?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, fileName }) => {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const rendered = marked.parse(content || '') as string;
      const sanitized = DOMPurify.sanitize(rendered);
      setHtml(sanitized);
    } catch (e) {
      setHtml(`<p style="color:#f85149">Error rendering markdown: ${escapeHtml(String(e))}</p>`);
    }
  }, [content]);

  // Scroll to top when file changes
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [fileName]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#333] bg-[#252526] shrink-0">
        <span className="text-[10px] text-[#888] font-semibold uppercase tracking-wider">Preview</span>
        {fileName && <span className="text-[10px] text-[#555]">— {fileName}</span>}
      </div>

      {/* Rendered Markdown */}
      <div
        ref={containerRef}
        className="markdown-preview-body flex-1 overflow-y-auto px-6 py-5"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.7',
          color: '#c9d1d9'
        }}
      />

      <style>{`
        .markdown-preview-body h1, .markdown-preview-body h2,
        .markdown-preview-body h3, .markdown-preview-body h4,
        .markdown-preview-body h5, .markdown-preview-body h6 {
          color: #e6edf3;
          margin: 1.2em 0 0.4em;
          font-weight: 600;
        }
        .markdown-preview-body h1 { font-size: 1.8em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
        .markdown-preview-body h2 { font-size: 1.4em; border-bottom: 1px solid #21262d; padding-bottom: 0.3em; }
        .markdown-preview-body a { color: #58a6ff; text-decoration: none; }
        .markdown-preview-body a:hover { text-decoration: underline; }
        .markdown-preview-body code { 
          background: #161b22; padding: 2px 6px; border-radius: 4px; 
          font-family: "Fira Code", Consolas, monospace; font-size: 87%;
          color: #f0883e;
        }
        .markdown-preview-body .hljs-code-block {
          margin: 1em 0; border-radius: 8px; overflow: hidden;
          border: 1px solid #30363d;
        }
        .markdown-preview-body .hljs-code-block code {
          display: block; padding: 1em; background: #0d1117; 
          color: #c9d1d9; overflow-x: auto; font-size: 13px; line-height: 1.5;
        }
        .markdown-preview-body blockquote {
          border-left: 4px solid #3b82f6; margin: 1em 0; 
          padding: 0.5em 1em; background: #161b22; border-radius: 0 6px 6px 0;
          color: #8b949e;
        }
        .markdown-preview-body table {
          border-collapse: collapse; width: 100%; margin: 1em 0;
          border: 1px solid #30363d; border-radius: 6px; overflow: hidden;
        }
        .markdown-preview-body th {
          background: #161b22; padding: 8px 12px; text-align: left;
          border-bottom: 1px solid #30363d; font-weight: 600; color: #e6edf3;
        }
        .markdown-preview-body td {
          padding: 8px 12px; border-bottom: 1px solid #21262d;
        }
        .markdown-preview-body tr:last-child td { border-bottom: none; }
        .markdown-preview-body tr:hover { background: #161b22; }
        .markdown-preview-body ul, .markdown-preview-body ol {
          padding-left: 1.5em; margin: 0.5em 0;
        }
        .markdown-preview-body li { margin: 0.2em 0; }
        .markdown-preview-body hr { border: none; border-top: 1px solid #30363d; margin: 1.5em 0; }
        .markdown-preview-body img { max-width: 100%; border-radius: 6px; }
        .markdown-preview-body p { margin: 0.6em 0; }
      `}</style>
    </div>
  );
};
