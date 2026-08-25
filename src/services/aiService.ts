import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { fileSystemService } from './fileSystem';
import { projectStore } from './projectStore';

const AI_CONFIG_KEY = 'pocketcode_ai_config_v2';
const LEGACY_GEMINI_KEY = 'pocketcode_gemini_api_key';

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'groq' | 'ollama';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customEndpoint?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface WorkspaceAIContext {
  projectName: string;
  activeFilePath?: string;
  activeLanguage?: string;
  selectedCode?: string;
  cursorLine?: number;
  fileSnippet?: string;
  diagnostics?: string[];
}

export interface CodeDiffChunk {
  type: 'unchanged' | 'addition' | 'deletion';
  content: string;
  lineNumber?: number;
}

export class AIService {
  private config: AIProviderConfig = {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2048
  };
  private isLoaded: boolean = false;

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<AIProviderConfig> {
    if (this.isLoaded && this.config.apiKey) return this.config;

    try {
      const stored = await idbGet<AIProviderConfig>(AI_CONFIG_KEY);
      if (stored && stored.provider) {
        this.config = { ...this.config, ...stored };
        this.isLoaded = true;
        return this.config;
      }
    } catch (err) {
      console.warn('[AIService] Failed to load config from IndexedDB:', err);
    }

    // Fallback: migrate legacy single Gemini key
    try {
      const legacyKey = await idbGet<string>(LEGACY_GEMINI_KEY) || localStorage.getItem(LEGACY_GEMINI_KEY);
      if (legacyKey) {
        this.config.apiKey = legacyKey;
        this.config.provider = 'gemini';
        this.config.model = 'gemini-1.5-flash';
        await this.saveConfig(this.config);
      }
    } catch {}

    this.isLoaded = true;
    return this.config;
  }

  async saveConfig(config: Partial<AIProviderConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.isLoaded = true;
    try {
      await idbSet(AI_CONFIG_KEY, this.config);
    } catch (err) {
      console.error('[AIService] Failed to save AI config:', err);
    }
  }

  hasApiKey(): boolean {
    return Boolean(this.config.apiKey || this.config.provider === 'ollama');
  }

  getProvider(): AIProvider {
    return this.config.provider;
  }

  getModel(): string {
    return this.config.model;
  }

  // --- Workspace Context Aggregator (Phase 36) ---

  getWorkspaceContext(
    activeFileContent?: string,
    activeFilePath?: string,
    selectedCode?: string,
    diagnostics?: string[]
  ): WorkspaceAIContext {
    const project = projectStore.getProject();
    return {
      projectName: project.name,
      activeFilePath,
      activeLanguage: activeFilePath ? activeFilePath.split('.').pop() : 'javascript',
      selectedCode,
      fileSnippet: activeFileContent ? activeFileContent.slice(0, 4000) : undefined,
      diagnostics
    };
  }

  // --- Multi-Provider AI Inference Dispatcher (Phase 35) ---

  async callAI(prompt: string, systemInstruction?: string, timeoutMs: number = 35000): Promise<string> {
    await this.loadConfig();

    if (!this.hasApiKey()) {
      throw new Error(`API key required for ${this.config.provider.toUpperCase()}. Configure your key in AI Settings.`);
    }

    switch (this.config.provider) {
      case 'gemini':
        return this.callGemini(prompt, systemInstruction, timeoutMs);
      case 'openai':
      case 'groq':
      case 'ollama':
        return this.callOpenAICompatible(prompt, systemInstruction, timeoutMs);
      case 'claude':
        return this.callClaude(prompt, systemInstruction, timeoutMs);
      default:
        return this.callGemini(prompt, systemInstruction, timeoutMs);
    }
  }

  private async callGemini(prompt: string, systemInstruction?: string, timeoutMs: number = 35000): Promise<string> {
    const defaultInstruction = systemInstruction ||
      'You are PocketCode AI, an expert mobile and web coding assistant. ' +
      'Provide concise, production-ready code with clear markdown fences and explanations.';

    const model = this.config.model || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
      system_instruction: { parts: [{ text: defaultInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: this.config.temperature ?? 0.7,
        maxOutputTokens: this.config.maxTokens ?? 2048
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API Error: ${res.status}`);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '(No response)';
    } finally {
      clearTimeout(timer);
    }
  }

  private async callOpenAICompatible(prompt: string, systemInstruction?: string, timeoutMs: number = 35000): Promise<string> {
    const isOllama = this.config.provider === 'ollama';
    const isGroq = this.config.provider === 'groq';
    
    let baseEndpoint = 'https://api.openai.com/v1/chat/completions';
    if (isGroq) baseEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    if (isOllama) baseEndpoint = `${this.config.customEndpoint || 'http://localhost:11434'}/v1/chat/completions`;

    const body = {
      model: this.config.model || (isGroq ? 'llama-3.1-70b-versatile' : isOllama ? 'llama3' : 'gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemInstruction || 'You are an expert coding assistant in PocketCode IDE.' },
        { role: 'user', content: prompt }
      ],
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 2048
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(baseEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Inference error: HTTP ${res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '(No response)';
    } finally {
      clearTimeout(timer);
    }
  }

  private async callClaude(prompt: string, systemInstruction?: string, timeoutMs: number = 35000): Promise<string> {
    const body = {
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.maxTokens ?? 2048,
      system: systemInstruction || 'You are an expert coding assistant in PocketCode IDE.',
      messages: [{ role: 'user', content: prompt }]
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Claude API error: ${res.status}`);
      }

      const data = await res.json();
      return data.content?.[0]?.text || '(No response)';
    } finally {
      clearTimeout(timer);
    }
  }

  // --- Streaming Chat (Phase 38) ---

  async chat(messages: ChatMessage[], newMessage: string, context?: WorkspaceAIContext): Promise<string> {
    let ctxString = '';
    if (context) {
      ctxString += `\n[Project: ${context.projectName}]`;
      if (context.activeFilePath) ctxString += `\n[Active File: ${context.activeFilePath}]`;
      if (context.selectedCode) ctxString += `\n[Selected Code:\n\`\`\`\n${context.selectedCode}\n\`\`\`]`;
      if (context.fileSnippet && !context.selectedCode) ctxString += `\n[File Content:\n\`\`\`\n${context.fileSnippet}\n\`\`\`]`;
      if (context.diagnostics && context.diagnostics.length > 0) ctxString += `\n[Diagnostics:\n${context.diagnostics.join('\n')}]`;
    }

    const history = messages
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${history ? `Conversation History:\n${history}\n\n` : ''}${ctxString}\n\nUser Question: ${newMessage}`;
    return this.callAI(prompt);
  }

  // --- Inline Code Completion for Ghost Text (Phase 37) ---

  async completeInlineCode(prefix: string, suffix: string = '', language: string = 'javascript'): Promise<string> {
    const prompt = `Complete the following ${language} code at the insertion cursor marked by [CURSOR].
Return ONLY the completion code to replace [CURSOR]. Do not repeat the prefix or suffix. Do not include markdown fences.

Code Before Cursor:
${prefix.slice(-1500)}
[CURSOR]
Code After Cursor:
${suffix.slice(0, 500)}`;

    const raw = await this.callAI(prompt, 'You are an inline code autocompletion engine. Return raw continuation text only.');
    return raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trimEnd();
  }

  // --- Code Refactoring & Multi-File Diff (Phase 39) ---

  async refactorCode(code: string, language: string, instruction?: string): Promise<string> {
    return this.callAI(
      `Refactor this ${language} code${instruction ? ` according to: "${instruction}"` : ' to follow modern clean architecture, performance, and best practices'}. Return the updated code block:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async fixError(code: string, error: string, language: string): Promise<string> {
    return this.callAI(
      `Fix this ${language} error. Show the corrected code with a brief explanation.\n\nError:\n${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async explainCode(code: string, language: string): Promise<string> {
    return this.callAI(
      `Explain this ${language} code concisely, highlighting its architecture, inputs, and behavior:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async generateTests(code: string, language: string): Promise<string> {
    return this.callAI(
      `Generate comprehensive unit tests for this ${language} code using standard test frameworks:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async generateDocstring(code: string, language: string): Promise<string> {
    return this.callAI(
      `Add comprehensive documentation comments and type annotations to this ${language} code. Return the fully documented version:\n\n\`\`\`${language}\n${code}\n\`\`\``
    );
  }

  async completeCode(prefix: string, language: string): Promise<string> {
    return this.completeInlineCode(prefix, '', language);
  }
}

export const aiService = new AIService();
