import { LLMAdapter, LLMExtractOptions, LLMProvider, PROVIDER_CONFIGS } from './types';
import { AnthropicAdapter } from './providers/anthropic';
import { GeminiAdapter } from './providers/gemini';
import { OpenAIAdapter } from './providers/openai';
import { ExtractionOutput } from '../schema';

export * from './types';
export * from './prompts';

export function getLLMAdapter(provider: LLMProvider): LLMAdapter {
  switch (provider) {
    case 'gemini':
      return new GeminiAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'openai':
      return new OpenAIAdapter();
    default:
      throw new Error(`Nhà cung cấp mô hình không được hỗ trợ: ${provider}`);
  }
}

export async function extractWithMultiLLM(options: LLMExtractOptions): Promise<ExtractionOutput> {
  const provider = options.provider || (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'gemini';
  const adapter = getLLMAdapter(provider);
  return adapter.extract(options);
}

