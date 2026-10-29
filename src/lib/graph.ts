import {
  GraphNode,
  GraphEdge,
  AssumptionNode,
  DownstreamResult,
  ProjectGraph,
  GraphMetrics,
  RiskAnalysis
} from './types';

/**
 * Normalizes an array or map of nodes into a Record<string, GraphNode>
 */
export function getNodeMap(nodes: GraphNode[] | Record<string, GraphNode>): Record<string, GraphNode> {
  if (!Array.isArray(nodes)) return nodes;
  const map: Record<string, GraphNode> = {};
  for (const node of nodes) {
    map[node.id] = node;
  }
  return map;
}

/**
 * Computes all downstream nodes that depend on startId using BFS on reversed edges.
 * Edge convention: { from: 'D1', to: 'A1' } means D1 depends on A1.
 * Downstream of A1 is [D1, ...].
 */
export function downstream(startId: string, edges: GraphEdge[]): DownstreamResult {
  const rev: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!edge.from || !edge.to) continue; // Skip malformed edge safely
    if (!rev[edge.to]) rev[edge.to] = [];
    rev[edge.to].push(edge.from);
  }

  const seen = new Set<string>([startId]);
  const depthById: Record<string, number> = {};
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  const out: string[] = [];
  let cycleDetected = false;

  while (queue.length > 0) {
    const { id: cur, depth: dep } = queue.shift()!;
    const dependents = rev[cur] || [];

    for (const nxt of dependents) {
      if (nxt === startId) {
        cycleDetected = true;
      } else if (!seen.has(nxt)) {
        seen.add(nxt);
        depthById[nxt] = dep + 1;
        out.push(nxt);
        queue.push({ id: nxt, depth: dep + 1 });
      }
    }
  }

  return { nodes: out, depthById, cycleDetected };
}

/**
 * Sums the effortWeeks of unique downstream nodes.
 */
export function effortAtRisk(
  nodeIds: string[],
  nodes: GraphNode[] | Record<string, GraphNode>
): number {
  const nodeMap = getNodeMap(nodes);
  const total = nodeIds.reduce((sum, id) => {
    const node = nodeMap[id];
    return sum + (node?.effortWeeks ?? 0);
  }, 0);
  return Number(total.toFixed(1));
}

/**
 * Computes risk score for an assumption:
 * risk = (1 - confidence) * (importance / 5) * effortAtRisk(downstream)
 * Returns 0 if assumption is not 'unverified'.
 */
export function riskScore(
  assumption: AssumptionNode,
  nodes: GraphNode[] | Record<string, GraphNode>,
  edges: GraphEdge[]
): number {
  if (assumption.status !== 'unverified') {
    return 0.0;
  }
  const { nodes: downIds } = downstream(assumption.id, edges);
  const effort = effortAtRisk(downIds, nodes);
  const confidence = assumption.confidence ?? 0.5;
  const importance = assumption.importance ?? 3;

  const raw = (1 - confidence) * (importance / 5) * effort;
  return Number(raw.toFixed(1));
}

/**
 * Computes the total Assumption Debt (sum of risk scores of all unverified assumptions).
 */
export function debtTotal(
  assumptions: AssumptionNode[],
  nodes: GraphNode[] | Record<string, GraphNode>,
  edges: GraphEdge[]
): number {
  const sum = assumptions.reduce((acc, a) => acc + riskScore(a, nodes, edges), 0);
  return Number(sum.toFixed(1));
}

/**
 * Returns the set of node IDs that currently need review because an upstream assumption is refuted.
 * Re-validating or changing the assumption status clears this automatically because it is derived.
 */
export function getNeedsReviewNodes(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Set<string> {
  const needsReview = new Set<string>();
  const refutedAssumptions = nodes.filter(
    (n): n is AssumptionNode => n.type === 'assumption' && n.status === 'refuted'
  );

  for (const assumption of refutedAssumptions) {
    const { nodes: downIds } = downstream(assumption.id, edges);
    for (const id of downIds) {
      needsReview.add(id);
    }
  }

  return needsReview;
}

/**
 * Checks whether an assumption is overdue based on verifyBy date.
 */
export function isAssumptionOverdue(assumption: AssumptionNode, now?: Date): boolean {
  if (assumption.status !== 'unverified' || !assumption.verifyBy || !now) {
    return false;
  }
  const targetDate = new Date(assumption.verifyBy);
  if (isNaN(targetDate.getTime())) return false;
  return targetDate.getTime() < now.getTime();
}

/**
 * Computes comprehensive metrics for the whole graph.
 */
export function computeGraphMetrics(
  graph: ProjectGraph,
  now?: Date
): GraphMetrics {
  const nodeMap = getNodeMap(graph.nodes);
  const assumptions = graph.nodes.filter((n): n is AssumptionNode => n.type === 'assumption');

  let unverifiedCount = 0;
  let validatedCount = 0;
  let refutedCount = 0;
  let overdueCount = 0;

  const rankedAssumptions: RiskAnalysis[] = [];

  for (const a of assumptions) {
    if (a.status === 'unverified') unverifiedCount++;
    else if (a.status === 'validated') validatedCount++;
    else if (a.status === 'refuted') refutedCount++;

    const isOverdue = isAssumptionOverdue(a, now);
    if (isOverdue) overdueCount++;

    const { nodes: downIds } = downstream(a.id, graph.edges);
    const downEffort = effortAtRisk(downIds, nodeMap);
    const score = riskScore(a, nodeMap, graph.edges);

    rankedAssumptions.push({
      assumptionId: a.id,
      riskScore: score,
      downstreamCount: downIds.length,
      downstreamEffortWeeks: downEffort,
      isOverdue
    });
  }

  // Sort descending by risk score
  rankedAssumptions.sort((a, b) => b.riskScore - a.riskScore);

  const totalDebt = debtTotal(assumptions, nodeMap, graph.edges);

  // Total effort at risk across all unique nodes downstream of unverified assumptions
  const allUnverifiedDownstream = new Set<string>();
  for (const a of assumptions) {
    if (a.status === 'unverified') {
      const { nodes: downIds } = downstream(a.id, graph.edges);
      for (const id of downIds) {
        allUnverifiedDownstream.add(id);
      }
    }
  }
  const totalEffortAtRisk = effortAtRisk(Array.from(allUnverifiedDownstream), nodeMap);

  return {
    totalAssumptions: assumptions.length,
    unverifiedCount,
    validatedCount,
    refutedCount,
    totalDebt,
    totalEffortAtRisk,
    overdueCount,
    rankedAssumptions
  };
}
