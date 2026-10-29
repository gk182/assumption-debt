import Anthropic from '@anthropic-ai/sdk';
import { LLMAdapter, LLMExtractOptions } from '../types';
import { SYSTEM_PROMPT, EXTRACTION_JSON_SCHEMA } from '../prompts';
import { ExtractionOutput, ExtractionOutputSchema } from '../../schema';

export class AnthropicAdapter implements LLMAdapter {
  async extract(options: LLMExtractOptions): Promise<ExtractionOutput> {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình ANTHROPIC_API_KEY. Vui lòng cung cấp API Key trong .env.local hoặc trên giao diện.');
    }

    const model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    const client = new Anthropic({ apiKey });

    const tool: Anthropic.Tool = {
      name: 'record_extracted_assumptions',
      description: 'Records extracted unverified assumptions, decisions, and dependency links from the document.',
      input_schema: EXTRACTION_JSON_SCHEMA as Anthropic.Tool.InputSchema
    };

    const callApi = async (appendNote = ''): Promise<ExtractionOutput> => {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'record_extracted_assumptions' },
        messages: [
          {
            role: 'user',
            content: `Analyze this document and extract assumptions, decisions, and dependencies:\n\n${options.documentText}${appendNote}`
          }
        ]
      });

      const toolCall = response.content.find((block) => block.type === 'tool_use');
      if (!toolCall || toolCall.type !== 'tool_use') {
        throw new Error('Claude model không gọi đúng tool trích xuất');
      }

      return toolCall.input as ExtractionOutput;
    };

    try {
      const raw = await callApi();
      return ExtractionOutputSchema.parse(raw);
    } catch {
      // Retry once if validation failed
      const raw = await callApi('\n\n[Lưu ý: Đảm bảo dữ liệu trích xuất tuân thủ chính xác JSON schema của tool]');
      return ExtractionOutputSchema.parse(raw);
    }
  }
}

