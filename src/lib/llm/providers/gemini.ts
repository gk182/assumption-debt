import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiAdapter implements LLMAdapter {
  async extract(options: LLMExtractOptions): Promise<ExtractionOutput> {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY. Vui lòng cung cấp Gemini API Key trong .env.local hoặc trên giao diện.');
    }

    const modelName = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      },
      systemInstruction: SYSTEM_PROMPT
    });

    const prompt = `Bạn là chuyên gia thẩm định tài liệu kỹ thuật. Hãy phân tích văn bản sau đây và trích xuất danh sách các giả định ngầm, các quyết định/nhiệm vụ liên đới, và liên kết phụ thuộc (depends_on).

Cấu trúc JSON yêu cầu:
${JSON.stringify(EXTRACTION_JSON_SCHEMA, null, 2)}

Văn bản tài liệu:
---
${options.documentText}
---`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedJson = cleanJsonString(responseText);

    try {
      const parsed = JSON.parse(cleanedJson);
      return ExtractionOutputSchema.parse(parsed);
    } catch (err: unknown) {
      console.warn('Gemini extraction output parse error:', err, 'Raw:', responseText);
      throw new Error(`Đầu ra từ Gemini không đúng chuẩn schema: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
