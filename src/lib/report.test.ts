import { describe, it, expect } from 'vitest';
import { generateAssumptionDebtReport } from './report';
import seedData from '../../data/demo/seed.json';
import { GraphNode, GraphEdge } from './types';
import { computeGraphMetrics } from './graph';
import { generateVerificationTasks, generateReviewTasks } from './tasks';
import { recordStatusChange } from './history';

describe('Assumption Debt Report (Phase 10)', () => {
  const nodes = seedData.nodes as GraphNode[];
  const edges = seedData.edges as GraphEdge[];
  const baseDate = new Date('2026-10-30T09:00:00.000Z');

  it('generates a complete Markdown report for seed data', () => {
    const metrics = computeGraphMetrics({ project: seedData.project, nodes, edges }, baseDate);
    const tasks = generateVerificationTasks(nodes, edges, 3, baseDate);
    const report = generateAssumptionDebtReport(
      seedData.project,
      nodes,
      edges,
      metrics,
      tasks,
      { generatedAt: baseDate }
    );

    // Non-negotiable requirement: Scores are labeled "ước tính"
    expect(report).toContain('ước tính');
    expect(report).toContain('# Báo Cáo Nợ Giả Định (Assumption Debt Report)');
    expect(report).toContain(seedData.project);
    expect(report).toContain('## 1. Tóm Tắt Tổng Quan');
    expect(report).toContain('## 2. Thứ Tự Ưu Tiên Kiểm Chứng');
    expect(report).toContain('## 5. Danh Sách Công Việc Đề Xuất');
    expect(report).toContain('A1');
    expect(report).toContain('A4');
  });

  it('correctly includes refuted assumptions and downstream cascade impact', () => {
    // Refute A1
    const refutedNodes = nodes.map((n) =>
      n.id === 'A1'
        ? recordStatusChange(n, 'refuted', {
            note: 'Phản hồi khách hàng cho thấy mức phí 1.2% quá cao',
            at: baseDate.toISOString()
          })
        : n
    );

    const metrics = computeGraphMetrics({ project: seedData.project, nodes: refutedNodes, edges }, baseDate);
    const reviewTasks = generateReviewTasks('A1', refutedNodes, edges, baseDate);
    const report = generateAssumptionDebtReport(
      seedData.project,
      refutedNodes,
      edges,
      metrics,
      reviewTasks,
      { generatedAt: baseDate }
    );

    expect(report).toContain('## 4. Giả Định Bị Bác Bỏ & Tác Động Dây Chuyền (Cascade)');
    expect(report).toContain('Phản hồi khách hàng cho thấy mức phí 1.2% quá cao');
    // Downstream decisions of A1 on seed are D1, D2, T1
    expect(report).toContain('D1');
    expect(report).toContain('D2');
    expect(report).toContain('T1');
  });

  it('includes overdue alert when assumptions pass verifyBy deadline', () => {
    const lateDate = new Date('2026-12-01');
    const metrics = computeGraphMetrics({ project: seedData.project, nodes, edges }, lateDate);
    const report = generateAssumptionDebtReport(
      seedData.project,
      nodes,
      edges,
      metrics,
      [],
      { generatedAt: lateDate }
    );

    expect(report).toContain('## 3. Cảnh Báo Giả Định Đã Quá Hạn Kiểm Chứng');
  });
});
