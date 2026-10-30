import { describe, it, expect } from 'vitest';
import {
  ExtractionOutputSchema,
  filterHallucinations,
  ExtractionOutput
} from './schema';
import { cleanJsonString } from './llm/providers/gemini';
import fs from 'node:fs';
import path from 'node:path';

describe('Extraction Schema and Hallucination Guard', () => {
  const prdPath = path.join(process.cwd(), 'data', 'demo', 'prd-fintech-instant-payout.md');
  const cachedPath = path.join(process.cwd(), 'data', 'demo', 'extraction-cached.json');
  const prdText = fs.readFileSync(prdPath, 'utf-8');
  const cachedData = JSON.parse(fs.readFileSync(cachedPath, 'utf-8')) as ExtractionOutput;

  it('validates cached extraction against Zod schema', () => {
    const parsed = ExtractionOutputSchema.safeParse(cachedData);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error(parsed.error);
    }
  });

  it('accepts long assumption text (> 200 characters) without throwing error', () => {
    const longText = 'Cơ chế fallback tự động chuyển từ model chính (`gemini-3.1-pro-preview`) sang model nhẹ hơn (`gemini-2.5-flash-lite`) sẽ giải quyết được vấn đề giới hạn Quotas hoặc nghẽn mạng Gemini API, đảm bảo tính năng AI luôn khả dụng.';
    expect(longText.length).toBeGreaterThan(200);

    const testPayload = {
      assumptions: [
        {
          tempId: 'a1',
          text: longText,
          category: 'technical_dependency',
          source: { quote: 'Model chính: `gemini-3.1-pro-preview`' },
          suggestedImportance: 4
        }
      ],
      decisions: [
        {
          tempId: 'd1',
          text: 'Chọn fallback model',
          kind: 'decision',
          estimatedEffortWeeks: 2
        }
      ],
      links: [
        {
          from: 'd1',
          to: 'a1',
          relation: 'depends_on'
        }
      ]
    };

    const parsed = ExtractionOutputSchema.safeParse(testPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.assumptions[0].text).toBe(longText);
    }
  });

  it('merges tasks array into decisions seamlessly', () => {
    const testPayload = {
      assumptions: [
        {
          tempId: 'a1',
          text: 'Giả định ngắn',
          source: { quote: 'quote test' }
        }
      ],
      decisions: [
        {
          tempId: 'd1',
          text: 'Quyết định 1',
          kind: 'decision',
          estimatedEffortWeeks: 2
        }
      ],
      tasks: [
        {
          tempId: 't1',
          text: 'Công việc 1',
          kind: 'task',
          estimatedEffortWeeks: 1
        }
      ],
      links: [
        { from: 't1', to: 'd1', relation: 'depends_on' }
      ]
    };

    const parsed = ExtractionOutputSchema.safeParse(testPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decisions).toHaveLength(2);
      expect(parsed.data.decisions.map((d) => d.tempId)).toEqual(['d1', 't1']);
    }
  });

  it('cleans json string and renames duplicate decisions key to tasks', () => {
    const rawWithDuplicates = `{
      "assumptions": [],
      "decisions": [ { "tempId": "d1", "text": "D1", "kind": "decision", "estimatedEffortWeeks": 1 } ],
      "links": [],
      "decisions": [ { "tempId": "t1", "text": "T1", "kind": "task", "estimatedEffortWeeks": 2 } ]
    }`;

    const cleaned = cleanJsonString(rawWithDuplicates);
    expect(cleaned).toContain('"tasks":');
    const parsed = JSON.parse(cleaned);
    const validated = ExtractionOutputSchema.parse(parsed);

    // Both d1 and t1 should be preserved in decisions
    expect(validated.decisions).toHaveLength(2);
    expect(validated.decisions.map((d) => d.tempId)).toEqual(['d1', 't1']);
  });

  it('preserves all 100% valid quotes from demo PRD', () => {
    const { filtered, droppedCount } = filterHallucinations(cachedData, prdText);
    expect(droppedCount).toBe(0);
    expect(filtered.assumptions.length).toBe(cachedData.assumptions.length);
    expect(filtered.links.length).toBe(cachedData.links.length);
  });

  it('drops hallucinated assumptions where quote is not in document', () => {
    const modifiedData: ExtractionOutput = {
      ...cachedData,
      assumptions: [
        ...cachedData.assumptions,
        {
          tempId: 'a_fake',
          text: 'Giả định hoàn toàn bịa đặt',
          category: 'market',
          source: { quote: 'Cau noi nay khong he co trong tai lieu goc!' },
          evidenceInDoc: 'none',
          suggestedImportance: 5,
          verifyWithinDays: 7
        }
      ],
      links: [
        ...cachedData.links,
        { from: 'd1', to: 'a_fake', relation: 'depends_on' }
      ]
    };

    const { filtered, droppedCount } = filterHallucinations(modifiedData, prdText);
    expect(droppedCount).toBe(1);
    expect(filtered.assumptions.find((a) => a.tempId === 'a_fake')).toBeUndefined();
    // Links to the dropped assumption must also be cleaned up
    expect(filtered.links.find((l) => l.to === 'a_fake')).toBeUndefined();
  });
});
