import { ExtractionOutput } from '../schema';

export type LLMProvider = 'gemini' | 'anthropic' | 'openai';

export interface ProviderConfig {
  id: LLMProvider;
  name: string;
  defaultModel: string;
  availableModels: string[];
  envKeyName: string;
  envModelName: string;
}

export const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    envKeyName: 'GEMINI_API_KEY',
    envModelName: 'GEMINI_MODEL'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    envKeyName: 'ANTHROPIC_API_KEY',
    envModelName: 'ANTHROPIC_MODEL'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI GPT',
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini'],
    envKeyName: 'OPENAI_API_KEY',
    envModelName: 'OPENAI_MODEL'
  }
};

export interface LLMExtractOptions {
  documentText: string;
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
}

export interface LLMAdapter {
  extract(options: LLMExtractOptions): Promise<ExtractionOutput>;
}

