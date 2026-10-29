import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { ExtractionOutputSchema, filterHallucinations, ExtractionOutput } from '@/lib/schema';

// Tool definition for Anthropic Tool Use / Structured Output
const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'record_extracted_assumptions',
  description: 'Records extracted unverified assumptions, decisions, and dependency links from the document.',
  input_schema: {
    type: 'object',
    properties: {
      assumptions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tempId: { type: 'string', description: 'Unique temp id e.g. a1, a2' },
            text: { type: 'string', description: 'Declarative sentence of the assumption' },
            category: {
              type: 'string',
              enum: ['user_behavior', 'technical_dependency', 'data', 'market', 'resource_timeline', 'legal']
            },
            source: {
              type: 'object',
              properties: {
                quote: { type: 'string', description: 'Verbatim quote from the input document' },
                location: { type: 'string' }
              },
              required: ['quote']
            },
            evidenceInDoc: { type: 'string', enum: ['none', 'weak', 'strong'] },
            suggestedImportance: { type: 'number', minimum: 1, maximum: 5 },
            whyItMatters: { type: 'string' },
            howToVerify: { type: 'string' },
            verifyWithinDays: { type: 'number' }
          },
          required: ['tempId', 'text', 'source', 'suggestedImportance']
        }
      },
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tempId: { type: 'string', description: 'e.g. d1, t1' },
            text: { type: 'string' },
            kind: { type: 'string', enum: ['decision', 'feature', 'task'] },
            source: {
              type: 'object',
              properties: {
                quote: { type: 'string' },
                location: { type: 'string' }
              }
            },
            estimatedEffortWeeks: { type: 'number' }
          },
          required: ['tempId', 'text', 'kind', 'estimatedEffortWeeks']
        }
      },
      links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Dependent decision/task ID e.g. d1' },
            to: { type: 'string', description: 'Depended assumption ID e.g. a1' },
            relation: { type: 'string', enum: ['depends_on'] },
            reason: { type: 'string' }
          },
          required: ['from', 'to', 'relation']
        }
      }
    },
    required: ['assumptions', 'decisions', 'links']
  }
};

const SYSTEM_PROMPT = `You are a skeptical senior product engineer reviewing a project document.
Your job is to surface implicit, unverified assumptions the authors rely on but have not verified.

Rules:
1. An assumption is a belief that, if false, would change a decision in this document. If it would not change any decision, do not output it.
2. Skip truisms that apply to any project ("users want a good experience").
3. Prefer implicit assumptions. For each decision, ask: what must be true for this to be right?
4. Each assumption is a falsifiable sentence, not a topic.
5. Quote the source text verbatim in source.quote. If you cannot quote it, do not output it.
6. evidenceInDoc: "strong" only if the document cites data, a test or a source. Hedge words alone do not count as evidence.
7. Write in the same language as the document.
8. Also list the decisions/features/tasks the document commits to, and link each to the assumptions it depends on (from: dependent, to: dependency).
9. Output only by calling the record_extracted_assumptions tool.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentText, useProductFlow } = body;

    // Check toggle:
    // 1. Explicit request flag `useProductFlow` takes precedence if specified
    // 2. Otherwise check env variable `ENABLE_PRODUCT_FLOW` (or `NEXT_PUBLIC_ENABLE_PRODUCT_FLOW`)
    const enableProduct = typeof useProductFlow === 'boolean'
      ? useProductFlow
      : (process.env.ENABLE_PRODUCT_FLOW === 'true' || process.env.NEXT_PUBLIC_ENABLE_PRODUCT_FLOW === 'true');

    // === CHẾ ĐỘ 1: MOCKUP FLOW (Default khi tắt, chạy file mockup để test trước) ===
    if (!enableProduct) {
      const cachedPath = path.join(process.cwd(), 'data', 'demo', 'extraction-cached.json');
      if (!fs.existsSync(cachedPath)) {
        return NextResponse.json(
          { error: 'Không tìm thấy file mockup data/demo/extraction-cached.json' },
          { status: 500 }
        );
      }

      const raw = fs.readFileSync(cachedPath, 'utf-8');
      const mockData: ExtractionOutput = JSON.parse(raw);

      // Trả về toàn bộ dữ liệu mockup mẫu để người dùng kiểm thử giao diện trơn tru
      return NextResponse.json({
        mode: 'mockup',
        message: 'Đang chạy chế độ Mockup (dữ liệu mẫu có sẵn để test nhanh offline).',
        data: mockData,
        hallucinationsDropped: 0
      });
    }

    // === CHẾ ĐỘ 2: PRODUCT FLOW (Khi bật, gọi AI thật từ Anthropic) ===
    if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập nội dung tài liệu dự án để trích xuất.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'mock-key-for-offline-demo' || apiKey.startsWith('your_')) {
      return NextResponse.json(
        {
          error:
            'Chế độ Product Flow (Live AI) yêu cầu ANTHROPIC_API_KEY hợp lệ trong file .env.local. Vui lòng cấu hình API key hoặc tắt công tắc sang "Chế độ Mockup" để tiếp tục test.'
        },
        { status: 400 }
      );
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    const client = new Anthropic({ apiKey });

    // Helper to call Anthropic with tool use
    async function callExtraction(promptAppend = ''): Promise<ExtractionOutput> {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: 'record_extracted_assumptions' },
        messages: [
          {
            role: 'user',
            content: `Analyze this document and extract assumptions, decisions, and dependencies:\n\n${documentText}${promptAppend}`
          }
        ]
      });

      const toolCall = response.content.find((block) => block.type === 'tool_use');
      if (!toolCall || toolCall.type !== 'tool_use') {
        throw new Error('LLM did not invoke the extraction tool');
      }

      return toolCall.input as ExtractionOutput;
    }

    let rawOutput: ExtractionOutput;
    try {
      rawOutput = await callExtraction();
    } catch (firstErr) {
      console.warn('First extraction attempt failed, retrying once...', firstErr);
      rawOutput = await callExtraction(
        '\n\n[Previous attempt failed to follow the tool schema strictly. Please ensure the tool is called with valid parameters.]'
      );
    }

    // Validate with Zod
    const validated = ExtractionOutputSchema.parse(rawOutput);

    // Apply hallucination guard: verify quotes are substrings of the input document
    const { filtered, droppedCount } = filterHallucinations(validated, documentText);

    return NextResponse.json({
      mode: 'product_live',
      message: 'Trích xuất thành công bằng AI thật.',
      data: filtered,
      hallucinationsDropped: droppedCount
    });
  } catch (error: unknown) {
    console.error('Extraction API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error during extraction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
