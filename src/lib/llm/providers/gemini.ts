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

    const requestedModel = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    // List of fallback candidates in case the requested model is overloaded (e.g. 503 high demand)
    const candidateModels = [
      requestedModel,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro'
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `Bạn là chuyên gia thẩm định tài liệu kỹ thuật. Hãy phân tích văn bản sau đây và trích xuất danh sách các giả định ngầm, các quyết định/nhiệm vụ liên đới, và liên kết phụ thuộc (depends_on).

Cấu trúc JSON yêu cầu:
${JSON.stringify(EXTRACTION_JSON_SCHEMA, null, 2)}

Văn bản tài liệu:
---
${options.documentText}
---`;

    let lastError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          },
          systemInstruction: SYSTEM_PROMPT
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJson = cleanJsonString(responseText);

        try {
          const parsed = JSON.parse(cleanedJson);
          return ExtractionOutputSchema.parse(parsed);
        } catch (parseErr: unknown) {
          console.warn(`[GeminiAdapter] Parse error on ${modelName}:`, parseErr, 'Raw:', responseText);
          throw new Error(`Đầu ra từ Gemini (${modelName}) không đúng chuẩn schema: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
        }
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient =
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('high demand') ||
          msg.includes('overloaded') ||
          msg.includes('ResourceExhausted') ||
          msg.includes('Service Unavailable');

        if (isTransient) {
          console.warn(`[GeminiAdapter] Mô hình ${modelName} đang quá tải (503/429). Tự động thử lại với mô hình dự phòng...`);
          continue; // Try next fallback candidate
        }

        // If not transient, throw immediately
        throw err;
      }
    }

    throw new Error(
      `Tất cả mô hình Gemini đều đang bận hoặc quá tải: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }
}

