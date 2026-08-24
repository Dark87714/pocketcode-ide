import { get as idbGet } from 'idb-keyval';

const GEMINI_KEY_STORE = 'pocketcode_gemini_api_key';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface AICodeAction {
  label: string;
  prompt: string;
}

class AIService {
  private apiKey: string = '';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  async loadApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    try {
      const stored = localStorage.getItem(GEMINI_KEY_STORE) || '';
      this.apiKey = stored;
      return stored;
    } catch {
      return '';
    }
  }

  saveApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem(GEMINI_KEY_STORE, key);
  }

  hasApiKey(): boolean {
    return !!(this.apiKey || localStorage.getItem(GEMINI_KEY_STORE));
  }

  private async callGemini(prompt: string, systemContext?: string): Promise<string> {
    const key = await this.loadApiKey();
    if (!key) throw new Error('No Gemini API key configured. Click the key icon to add yours.');

    const systemInstruction = systemContext || 
      'You are an expert coding assistant inside PocketCode IDE. ' +
      'Be concise and practical. Format code blocks with markdown. ' +
      'When showing code, always specify the language in the code fence.';

    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };

    const res = await fetch(`${this.baseUrl}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(No response)';
  }

  async chat(messages: ChatMessage[], newMessage: string, fileContext?: string): Promise<string> {
    const context = fileContext
      ? `\n\nCurrent file context:\n\`\`\`\n${fileContext.slice(0, 3000)}\n\`\`\`\n\n`
      : '';

    const history = messages
      .slice(-6) // keep last 6 messages for context window
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${history ? `Previous conversation:\n${history}\n\n` : ''}${context}User: ${newMessage}`;
    return this.callGemini(prompt);
  }

  async explainCode(code: string, language: string): Promise<string> {
    return this.callGemini(
      `Explain this ${language} code concisely, highlighting what it does and any important patterns:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async fixError(code: string, error: string, language: string): Promise<string> {
    return this.callGemini(
      `Fix this ${language} error. Show the corrected code with a brief explanation of what was wrong.\n\nError: ${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async generateTests(code: string, language: string): Promise<string> {
    return this.callGemini(
      `Generate comprehensive unit tests for this ${language} code. Use the standard testing framework for the language:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async refactorCode(code: string, language: string, instruction?: string): Promise<string> {
    return this.callGemini(
      `Refactor this ${language} code${instruction ? ` to: ${instruction}` : ' for better readability, performance, and best practices'}. Show the refactored version:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async generateDocstring(code: string, language: string): Promise<string> {
    return this.callGemini(
      `Add comprehensive documentation comments/docstrings to this ${language} code. Return the fully documented version:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async completeCode(prefix: string, language: string): Promise<string> {
    const res = await this.callGemini(
      `Complete the following ${language} code. Return ONLY the completion text (not the prefix, no markdown fences, no explanation):\n\n${prefix}`,
      'You are a code completion engine. Return only raw code continuation, no explanations, no markdown.'
    );
    // Strip any accidental code fences
    return res.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }
}

export const aiService = new AIService();
