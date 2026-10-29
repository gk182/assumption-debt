import { describe, it, expect } from 'vitest';
import {
  ExtractionOutputSchema,
  filterHallucinations,
  ExtractionOutput
} from './schema';
import fs from 'node:fs';
import path from 'node:path';

describe('Extraction Schema and Hallucination Guard', () => {
  const prdPath = path.join(process.cwd(), 'data', 'demo', 'prd-food-delivery.md');
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

