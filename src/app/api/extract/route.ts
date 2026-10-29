import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { filterHallucinations, ExtractionOutput } from '@/lib/schema';
import { extractWithMultiLLM, LLMProvider, PROVIDER_CONFIGS } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      documentText,
      useProductFlow,
      provider = 'gemini',
      model,
      apiKey
    } = body;

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

      return NextResponse.json({
        mode: 'mockup',
        provider: 'mockup',
        message: 'Đang chạy chế độ Mockup (dữ liệu mẫu có sẵn để test nhanh offline).',
        data: mockData,
        hallucinationsDropped: 0
      });
    }

    // === CHẾ ĐỘ 2: PRODUCT FLOW (Khi bật, gọi AI thật từ Provider đã chọn) ===
    if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập nội dung tài liệu dự án để trích xuất.' },
        { status: 400 }
      );
    }

    const selectedProvider: LLMProvider = (['gemini', 'anthropic', 'openai'].includes(provider)
      ? provider
      : (process.env.DEFAULT_LLM_PROVIDER as LLMProvider)) || 'gemini';

    const rawOutput = await extractWithMultiLLM({
      documentText,
      provider: selectedProvider,
      model,
      apiKey
    });

    // Apply hallucination guard: verify quotes are substrings of the input document
    const { filtered, droppedCount } = filterHallucinations(rawOutput, documentText);

    const providerConfig = PROVIDER_CONFIGS[selectedProvider];
    const usedModel = model || providerConfig?.defaultModel;

    return NextResponse.json({
      mode: 'product_live',
      provider: selectedProvider,
      model: usedModel,
      message: `Trích xuất thành công bằng ${providerConfig?.name || selectedProvider} (${usedModel}).`,
      data: filtered,
      hallucinationsDropped: droppedCount
    });
  } catch (error: unknown) {
    console.error('Extraction API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error during extraction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
