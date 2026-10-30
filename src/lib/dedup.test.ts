import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  computeTextSimilarity,
  findPotentialDuplicates,
  mergeAssumptions
} from './dedup';
import { AssumptionNode, ProjectGraph } from './types';

describe('Deduplication & Multi-document Merge', () => {
  it('normalizes text and strips accents for comparison', () => {
    const text1 = 'Hạ tầng API Napas247 duy trì độ khả dụng 99.9%!';
    const norm = normalizeText(text1);
    expect(norm).toContain('ha tang api napas247');
    expect(norm).not.toContain('!');
  });

  it('computes word Jaccard similarity accurately', () => {
    const textA = 'Nhà bán lẻ chấp nhận mức phí dịch vụ 1.2% trên số tiền rút sớm';
    const textB = 'Nhà bán lẻ sẵn sàng chịu mức phí dịch vụ 1.2% trên số tiền rút sớm';
    const sim = computeTextSimilarity(textA, textB);
    expect(sim).toBeGreaterThan(0.65);

    const completelyDifferent = 'Gemini AI trả về bounding box phân loại cây cảnh';
    const sim2 = computeTextSimilarity(textA, completelyDifferent);
    expect(sim2).toBeLessThan(0.1);
  });

  it('finds duplicate assumption candidates in a list', () => {
    const assumptions: AssumptionNode[] = [
      {
        id: 'A1',
        type: 'assumption',
        text: 'Nhà bán lẻ chấp nhận mức phí 1.2% trên số tiền rút sớm',
        status: 'unverified',
        importance: 4,
        confidence: 0.5
      },
      {
        id: 'A2',
        type: 'assumption',
        text: 'Tỷ lệ gian lận đơn ảo không đáng kể khi giải ngân',
        status: 'unverified',
        importance: 5,
        confidence: 0.5
      },
      {
        id: 'A3',
        type: 'assumption',
        text: 'Nhà bán lẻ sẵn sàng chấp nhận mức phí 1.2% khi rút tiền sớm',
        status: 'unverified',
        importance: 3,
        confidence: 0.5
      }
    ];

    const duplicates = findPotentialDuplicates(assumptions, 0.6);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0].primaryId).toBe('A1');
    expect(duplicates[0].duplicateId).toBe('A3');
  });

  it('merges assumptions and re-points edges safely without loops', () => {
    const initialGraph: ProjectGraph = {
      project: 'Test Multi-doc',
      nodes: [
        {
          id: 'A1',
          type: 'assumption',
          text: 'Hạ tầng Napas đáp ứng 99.9%',
          status: 'unverified',
          importance: 4,
          confidence: 0.5
        },
        {
          id: 'A2',
          type: 'assumption',
          text: 'Hệ thống Napas247 đảm bảo SLA 99.9%',
          status: 'unverified',
          importance: 5,
          confidence: 0.5
        },
        {
          id: 'D1',
          type: 'decision',
          text: 'Tích hợp cổng Napas',
          status: 'active',
          effortWeeks: 2
        },
        {
          id: 'D2',
          type: 'decision',
          text: 'Xây dựng cơ chế fallback',
          status: 'active',
          effortWeeks: 1
        }
      ],
      edges: [
        { from: 'D1', to: 'A1', relation: 'depends_on' },
        { from: 'D2', to: 'A2', relation: 'depends_on' }
      ]
    };

    // Merge A2 into A1
    const merged = mergeAssumptions(initialGraph, 'A1', 'A2');

    // A2 should be removed from nodes
    expect(merged.nodes.find((n) => n.id === 'A2')).toBeUndefined();

    // A1 should keep highest importance (5)
    const a1 = merged.nodes.find((n) => n.id === 'A1') as AssumptionNode;
    expect(a1.importance).toBe(5);

    // Both D1 and D2 should now point to A1
    const d1Edge = merged.edges.find((e) => e.from === 'D1');
    const d2Edge = merged.edges.find((e) => e.from === 'D2');
    expect(d1Edge?.to).toBe('A1');
    expect(d2Edge?.to).toBe('A1');
    expect(merged.edges.length).toBe(2);
  });
});
