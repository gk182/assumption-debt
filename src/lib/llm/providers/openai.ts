import OpenAI from 'openai';
import { LLMAdapter, LLMExtractOptions } from '../types';
import { SYSTEM_PROMPT, EXTRACTION_JSON_SCHEMA } from '../prompts';
import { ExtractionOutput, ExtractionOutputSchema } from '../../schema';

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export class OpenAIAdapter implements LLMAdapter {
  async extract(options: LLMExtractOptions): Promise<ExtractionOutput> {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình OPENAI_API_KEY. Vui lòng cung cấp OpenAI API Key trong .env.local hoặc trên giao diện.');
    }

    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o';
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this document and extract assumptions, decisions, and dependencies strictly in JSON adhering to schema:\n\n${JSON.stringify(
            EXTRACTION_JSON_SCHEMA
          )}\n\nDocument:\n${options.documentText}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Không nhận được nội dung trả về từ OpenAI');
    }

    const cleaned = cleanJsonString(content);
    try {
      const parsed = JSON.parse(cleaned);
      return ExtractionOutputSchema.parse(parsed);
    } catch (err: unknown) {
      console.warn('OpenAI parse error:', err, 'Raw:', content);
      throw new Error(`Đầu ra từ OpenAI không đúng chuẩn schema: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
