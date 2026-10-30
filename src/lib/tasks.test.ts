import { describe, it, expect } from 'vitest';
import seedData from '../../data/demo/seed.json';
import { GraphNode, GraphEdge } from './types';
import {
  generateVerificationTasks,
  generateReviewTasks,
  exportTasksToMarkdown,
  exportTasksToCSV
} from './tasks';

const nodes = seedData.nodes as GraphNode[];
const edges = seedData.edges as GraphEdge[];

describe('Task Generator (Phase 8)', () => {
  describe('generateVerificationTasks', () => {
    it('generates top 3 verification tasks ordered by risk score on seed data', () => {
      const fixedBaseDate = new Date('2026-10-30T00:00:00Z');
      const tasks = generateVerificationTasks(nodes, edges, 3, fixedBaseDate);

      expect(tasks.length).toBe(3);

      // Verify the top 3 unverified assumptions on seed data: A1 (3.6), A2 (3.5), A4 (1.7)
      expect(tasks[0].targetNodeId).toBe('A1');
      expect(tasks[1].targetNodeId).toBe('A2');
      expect(tasks[2].targetNodeId).toBe('A4');

      // Check Task fields
      expect(tasks[0].type).toBe('verification');
      expect(tasks[0].status).toBe('proposed');
      expect(tasks[0].priority).toBe('high');
      expect(tasks[0].riskScore).toBe(3.6);
      expect(tasks[0].effortWeeksAtRisk).toBe(6.0);
      expect(tasks[0].dueDate).toBe('2026-11-15'); // from seed A1.verifyBy
      expect(tasks[0].suggestedAssignee).toBe('Head of Product');
      expect(tasks[0].actionableSteps.length).toBeGreaterThanOrEqual(2);

      // Check A4 (priority medium because risk score 1.7 is in [1.5, 3.0))
      expect(tasks[2].priority).toBe('medium');
      expect(tasks[2].riskScore).toBe(1.7);
    });

    it('uses fallback 14-day due date when verifyBy is not provided on assumption', () => {
      const nodesWithoutVerifyBy: GraphNode[] = [
        {
          id: 'A99',
          type: 'assumption',
          status: 'unverified',
          text: 'Giả định không có ngày verifyBy',
          importance: 4,
          confidence: 0.5
        }
      ];
      const fixedBaseDate = new Date('2026-10-01T00:00:00Z');
      const tasks = generateVerificationTasks(nodesWithoutVerifyBy, [], 1, fixedBaseDate);

      expect(tasks.length).toBe(1);
      expect(tasks[0].dueDate).toBe('2026-10-15'); // 14 days after Oct 1
    });
  });

  describe('generateReviewTasks', () => {
    it('generates 3 review tasks for downstream nodes D1, D2, T1 when A1 is refuted', () => {
      const fixedBaseDate = new Date('2026-10-30T00:00:00Z');
      const tasks = generateReviewTasks('A1', nodes, edges, fixedBaseDate);

      // Downstream of A1 in seed: D1 (1.0w), D2 (1.5w), T1 (3.5w)
      expect(tasks.length).toBe(3);

      const targetIds = tasks.map((t) => t.targetNodeId);
      expect(targetIds).toContain('D1');
      expect(targetIds).toContain('D2');
      expect(targetIds).toContain('T1');

      // Check types and details
      tasks.forEach((t) => {
        expect(t.type).toBe('review');
        expect(t.status).toBe('proposed');
        expect(t.description).toContain('A1');
      });

      // Decisions get high priority review, tasks get medium priority review
      const d1Task = tasks.find((t) => t.targetNodeId === 'D1')!;
      expect(d1Task.priority).toBe('high');
      expect(d1Task.targetNodeType).toBe('decision');
      expect(d1Task.dueDate).toBe('2026-11-02'); // +3 days for decision

      const t1Task = tasks.find((t) => t.targetNodeId === 'T1')!;
      expect(t1Task.priority).toBe('medium');
      expect(t1Task.targetNodeType).toBe('task');
      expect(t1Task.dueDate).toBe('2026-11-06'); // +7 days for task
    });

    it('returns empty array when refuted node has no downstream dependents', () => {
      const tasks = generateReviewTasks('T1', nodes, edges);
      expect(tasks.length).toBe(0);
    });
  });

  describe('Export functions', () => {
    it('exports tasks to formatted Markdown checklist', () => {
      const tasks = [
        ...generateVerificationTasks(nodes, edges, 2),
        ...generateReviewTasks('A1', nodes, edges)
      ];
      const md = exportTasksToMarkdown(tasks, 'Test Project');

      expect(md).toContain('# Kế Hoạch Task Kiểm Chứng & Xử Lý Rủi Ro');
      expect(md).toContain('**Dự án:** Test Project');
      expect(md).toContain('- [ ] **[HIGH]** Kiểm chứng giả định A1:');
      expect(md).toContain('- [ ] **[HIGH]** Xem lại Quyết định D1:');
      expect(md).toContain('Nút đồ thị [A1]');
    });

    it('exports tasks to RFC-4180 compliant CSV', () => {
      const tasks = generateVerificationTasks(nodes, edges, 2);
      const csv = exportTasksToCSV(tasks);

      expect(csv).toContain('"Mã Task","Loại","Tiêu Đề","Nút Nguồn","Trạng Thái","Mức Ưu Tiên"');
      expect(csv).toContain('"task-verify-A1"');
      expect(csv).toContain('"Kiểm chứng"');
      expect(csv).toContain('"A1"');
    });
  });
});
