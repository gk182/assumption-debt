import { describe, it, expect } from 'vitest';
import {
  downstream,
  effortAtRisk,
  riskScore,
  debtTotal,
  getNeedsReviewNodes,
  computeGraphMetrics
} from './graph';
import { GraphEdge, GraphNode, AssumptionNode, ProjectGraph } from './types';
import seedData from '../../data/demo/seed.json';

describe('Assumption Debt Graph Engine', () => {
  const seedNodes = seedData.nodes as GraphNode[];
  const seedEdges = seedData.edges as GraphEdge[];

  describe('downstream traversal', () => {
    it('correctly finds downstream of A1 on seed data (D1, D2, T1)', () => {
      const result = downstream('A1', seedEdges);
      expect(result.cycleDetected).toBe(false);
      expect(new Set(result.nodes)).toEqual(new Set(['D1', 'D2', 'T1']));
      expect(result.depthById['D1']).toBe(1);
      expect(result.depthById['D2']).toBe(1);
      expect(result.depthById['T1']).toBe(2);
    });

    it('calculates downstream effort of A1 as exactly 6.0 weeks', () => {
      const result = downstream('A1', seedEdges);
      const effort = effortAtRisk(result.nodes, seedNodes);
      expect(effort).toBe(6.0);
    });

    it('handles diamond dependencies by counting unique nodes once', () => {
      // Create a diamond: T1 depends on D1 as well as D2
      const diamondEdges: GraphEdge[] = [
        ...seedEdges,
        { from: 'T1', to: 'D1', relation: 'depends_on' }
      ];
      const result = downstream('A1', diamondEdges);
      expect(result.nodes.length).toBe(3);
      expect(new Set(result.nodes)).toEqual(new Set(['D1', 'D2', 'T1']));
      const effort = effortAtRisk(result.nodes, seedNodes);
      expect(effort).toBe(6.0);
    });

    it('handles cycles safely without infinite loop and reports cycleDetected', () => {
      // Create a cycle: A1 depends on T1
      const cyclicEdges: GraphEdge[] = [
        ...seedEdges,
        { from: 'A1', to: 'T1', relation: 'depends_on' }
      ];
      const result = downstream('A1', cyclicEdges);
      expect(result.cycleDetected).toBe(true);
      // startId is excluded from output
      expect(result.nodes).not.toContain('A1');
      expect(new Set(result.nodes)).toEqual(new Set(['D1', 'D2', 'T1']));
    });

    it('returns empty downstream when refuting a leaf node', () => {
      const result = downstream('T1', seedEdges);
      expect(result.nodes).toEqual([]);
      expect(effortAtRisk(result.nodes, seedNodes)).toBe(0);
    });
  });

  describe('risk scoring and assumption debt', () => {
    it('calculates risk score for A1 correctly (3.6)', () => {
      const a1 = seedNodes.find((n) => n.id === 'A1') as AssumptionNode;
      // formula: (1 - 0.4) * (5 / 5) * 6.0 = 0.6 * 1.0 * 6.0 = 3.6
      const score = riskScore(a1, seedNodes, seedEdges);
      expect(score).toBe(3.6);
    });

    it('returns 0 risk score for validated or refuted assumptions', () => {
      const a1 = seedNodes.find((n) => n.id === 'A1') as AssumptionNode;
      const validatedA1: AssumptionNode = { ...a1, status: 'validated' };
      const refutedA1: AssumptionNode = { ...a1, status: 'refuted' };

      expect(riskScore(validatedA1, seedNodes, seedEdges)).toBe(0);
      expect(riskScore(refutedA1, seedNodes, seedEdges)).toBe(0);
    });

    it('calculates total debt across unverified assumptions', () => {
      const assumptions = seedNodes.filter((n): n is AssumptionNode => n.type === 'assumption');
      const debt = debtTotal(assumptions, seedNodes, seedEdges);
      expect(debt).toBeGreaterThan(0);
      // Check that it's rounded to at most 1 decimal place
      expect(debt.toString()).toMatch(/^\d+(\.\d)?$/);
    });
  });

  describe('needs_review derived state', () => {
    it('flags downstream nodes only when an assumption is refuted', () => {
      // Initially all assumptions are unverified -> no needs_review
      const initialNeedsReview = getNeedsReviewNodes(seedNodes, seedEdges);
      expect(initialNeedsReview.size).toBe(0);

      // When A1 is refuted, D1, D2, T1 are marked for review
      const modifiedNodes: GraphNode[] = seedNodes.map((n) =>
        n.id === 'A1' ? ({ ...n, status: 'refuted' } as AssumptionNode) : n
      );

      const reviewSet = getNeedsReviewNodes(modifiedNodes, seedEdges);
      expect(reviewSet).toEqual(new Set(['D1', 'D2', 'T1']));

      // Re-validating A1 clears needs_review automatically
      const revalidatedNodes: GraphNode[] = seedNodes.map((n) =>
        n.id === 'A1' ? ({ ...n, status: 'validated' } as AssumptionNode) : n
      );
      const clearedSet = getNeedsReviewNodes(revalidatedNodes, seedEdges);
      expect(clearedSet.size).toBe(0);
    });
  });

  describe('comprehensive graph metrics', () => {
    it('computes metrics matching seed project expectations', () => {
      const graph: ProjectGraph = {
        project: seedData.project,
        nodes: seedNodes,
        edges: seedEdges
      };

      const metrics = computeGraphMetrics(graph, new Date('2026-10-29'));
      expect(metrics.totalAssumptions).toBe(4);
      expect(metrics.unverifiedCount).toBe(4);
      expect(metrics.validatedCount).toBe(0);
      expect(metrics.refutedCount).toBe(0);
      expect(metrics.rankedAssumptions.length).toBe(4);
      expect(metrics.rankedAssumptions[0].assumptionId).toBe('A1'); // A1 is top risk
      expect(metrics.rankedAssumptions[0].riskScore).toBe(3.6);
      expect(metrics.rankedAssumptions[0].downstreamEffortWeeks).toBe(6.0);
    });
  });
});
