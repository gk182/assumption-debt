import { describe, it, expect } from 'vitest';
import {
  chunkDocumentByHeadings,
  deduplicateAssumptions,
  mergeExtractionOutputs,
  estimateTokens
} from './chunking';
import { ExtractedAssumption, ExtractionOutput } from './schema';

describe('chunkDocumentByHeadings', () => {
  it('returns single chunk for document within token budget', () => {
    const doc = `# PRD: Small Document\n\n## 1. Intro\nContent goes here.`;
    const chunks = chunkDocumentByHeadings(doc, 1000);
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('Content goes here');
  });

  it('splits document across headings when exceeding maxTokens', () => {
    const sec1 = `# Header 1\n` + 'Line of text for section 1.\n'.repeat(50);
    const sec2 = `\n## Header 2\n` + 'Line of text for section 2.\n'.repeat(50);
    const fullDoc = sec1 + sec2;

    const tokens1 = estimateTokens(sec1);
    // Set budget smaller than total tokens but larger than sec1 tokens
    const chunks = chunkDocumentByHeadings(fullDoc, tokens1 + 10);
    expect(chunks.length).toBe(2);
    expect(chunks[0].headingPath).toContain('Header 1');
    expect(chunks[1].headingPath).toContain('Header 2');
  });

  it('handles empty or whitespace-only documents', () => {
    expect(chunkDocumentByHeadings('')).toEqual([]);
    expect(chunkDocumentByHeadings('   \n  ')).toEqual([]);
  });
});

describe('deduplicateAssumptions', () => {
  it('drops assumption with exact duplicate quote', () => {
    const items: ExtractedAssumption[] = [
      {
        tempId: 'a1',
        text: 'Nha ban le chap nhan phi 1.2%',
        category: 'user_behavior',
        source: { quote: 'Muc phi 1.2% la hoan toan hop ly', location: 'Section 1' },
        evidenceInDoc: 'none',
        suggestedImportance: 5,
        whyItMatters: 'Rui ro do vo mo hinh',
        howToVerify: 'Khao sat',
        verifyWithinDays: 7
      },
      {
        tempId: 'a2',
        text: 'Nha ban hang san sang tra phi 1.2%',
        category: 'user_behavior',
        source: { quote: 'Muc phi 1.2% la hoan toan hop ly', location: 'Section 2' },
        evidenceInDoc: 'none',
        suggestedImportance: 4,
        whyItMatters: 'Trung lap',
        howToVerify: 'Khao sat',
        verifyWithinDays: 7
      }
    ];

    const { deduplicated, duplicatesDropped } = deduplicateAssumptions(items);
    expect(deduplicated.length).toBe(1);
    expect(duplicatesDropped).toBe(1);
    expect(deduplicated[0].tempId).toBe('a1');
  });

  it('preserves distinct assumptions', () => {
    const items: ExtractedAssumption[] = [
      {
        tempId: 'a1',
        text: 'Nha ban le chap nhan phi 1.2%',
        category: 'user_behavior',
        source: { quote: 'Muc phi 1.2% la hoan toan hop ly', location: 'Section 1' },
        evidenceInDoc: 'none',
        suggestedImportance: 5,
        whyItMatters: 'Ly do 1',
        howToVerify: 'Cach 1',
        verifyWithinDays: 7
      },
      {
        tempId: 'a2',
        text: 'API Napas247 on dinh 99.9%',
        category: 'technical_dependency',
        source: { quote: 'API Napas duy tri do kha dung 99.9%', location: 'Section 2' },
        evidenceInDoc: 'none',
        suggestedImportance: 4,
        whyItMatters: 'Ly do 2',
        howToVerify: 'Cach 2',
        verifyWithinDays: 14
      }
    ];

    const { deduplicated, duplicatesDropped } = deduplicateAssumptions(items);
    expect(deduplicated.length).toBe(2);
    expect(duplicatesDropped).toBe(0);
  });
});

describe('mergeExtractionOutputs', () => {
  it('merges two chunk outputs and prevents ID collision', () => {
    const out1: ExtractionOutput = {
      assumptions: [
        {
          tempId: 'a1',
          text: 'Gia dinh 1',
          category: 'market',
          source: { quote: 'Trich dan 1', location: 'Part 1' },
          evidenceInDoc: 'none',
          suggestedImportance: 5,
          whyItMatters: 'Reason 1',
          howToVerify: 'Verify 1',
          verifyWithinDays: 7
        }
      ],
      decisions: [
        { tempId: 'd1', text: 'Quyet dinh 1', estimatedEffortWeeks: 2, kind: 'decision' }
      ],
      links: [{ from: 'd1', to: 'a1', relation: 'depends_on', reason: 'Phu thuoc' }]
    };

    const out2: ExtractionOutput = {
      assumptions: [
        {
          tempId: 'a1', // same tempId name in chunk 2
          text: 'Gia dinh 2',
          category: 'technical_dependency',
          source: { quote: 'Trich dan 2', location: 'Part 2' },
          evidenceInDoc: 'none',
          suggestedImportance: 4,
          whyItMatters: 'Reason 2',
          howToVerify: 'Verify 2',
          verifyWithinDays: 10
        }
      ],
      decisions: [
        { tempId: 'd1', text: 'Quyet dinh 2', estimatedEffortWeeks: 1, kind: 'decision' }
      ],
      links: [{ from: 'd1', to: 'a1', relation: 'depends_on', reason: 'Phu thuoc 2' }]
    };

    const merged = mergeExtractionOutputs([out1, out2]);
    expect(merged.assumptions.length).toBe(2);
    expect(merged.decisions.length).toBe(2);
    expect(merged.links.length).toBe(2);

    // Temp IDs should be remapped to avoid collision
    expect(merged.assumptions[0].tempId).not.toBe(merged.assumptions[1].tempId);
    expect(merged.links[0].to).toBe(merged.assumptions[0].tempId);
    expect(merged.links[1].to).toBe(merged.assumptions[1].tempId);
  });
});
