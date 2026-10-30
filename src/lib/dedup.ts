import { AssumptionNode, ProjectGraph, GraphEdge, GraphNode } from './types';

/**
 * Normalizes text for comparison:
 * Lowercases, strips punctuation, normalizes whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics for robust matching
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes word-level Jaccard similarity between two strings.
 * Range: 0.0 to 1.0.
 */
export function computeTextSimilarity(textA: string, textB: string): number {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const wordsA = new Set(normA.split(' ').filter((w) => w.length > 1));
  const wordsB = new Set(normB.split(' ').filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...wordsA, ...wordsB]).size;
  return unionCount === 0 ? 0.0 : intersectionCount / unionCount;
}

export interface DuplicateCandidate {
  primaryId: string;
  duplicateId: string;
  similarity: number;
  primaryText: string;
  duplicateText: string;
}

/**
 * Identifies duplicate or highly similar assumptions across the graph.
 * Defaults to a similarity threshold of 0.65 (65% word overlap).
 */
export function findPotentialDuplicates(
  assumptions: AssumptionNode[],
  threshold = 0.65
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (let i = 0; i < assumptions.length; i++) {
    for (let j = i + 1; j < assumptions.length; j++) {
      const a = assumptions[i];
      const b = assumptions[j];

      // Compare text
      const sim = computeTextSimilarity(a.text, b.text);
      if (sim >= threshold) {
        candidates.push({
          primaryId: a.id,
          duplicateId: b.id,
          similarity: Math.round(sim * 100) / 100,
          primaryText: a.text,
          duplicateText: b.text
        });
      }
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Merges a duplicate assumption (`removeId`) into `keepId`:
 * - Replaces all incoming and outgoing edges of `removeId` with `keepId`.
 * - Eliminates self-loops (edges from keepId to keepId) and duplicate edges.
 * - Retains the higher importance, preserves notes and quotes.
 * - Removes `removeId` from the graph node list.
 */
export function mergeAssumptions(
  graph: ProjectGraph,
  keepId: string,
  removeId: string
): ProjectGraph {
  if (keepId === removeId) return graph;

  const keepNode = graph.nodes.find((n) => n.id === keepId) as AssumptionNode | undefined;
  const removeNode = graph.nodes.find((n) => n.id === removeId) as AssumptionNode | undefined;

  if (!keepNode || !removeNode) return graph;

  // 1. Merge node properties (keep higher importance, merge notes/history)
  const mergedImportance = Math.max(keepNode.importance || 3, removeNode.importance || 3);
  const mergedQuote = keepNode.source?.quote || removeNode.source?.quote || '';

  const updatedNodes: GraphNode[] = graph.nodes
    .filter((n) => n.id !== removeId)
    .map((n) => {
      if (n.id === keepId && n.type === 'assumption') {
        return {
          ...n,
          importance: mergedImportance,
          source: {
            ...n.source,
            quote: mergedQuote,
            doc: n.source?.doc || removeNode.source?.doc
          },
          history: [
            ...(n.history || []),
            {
              at: new Date().toISOString(),
              action: 'edited' as const,
              note: `Gộp giả định từ ${removeId}: "${removeNode.text}"`
            }
          ]
        };
      }
      return n;
    });

  // 2. Re-point edges: replace removeId with keepId
  const seenEdges = new Set<string>();
  const updatedEdges: GraphEdge[] = [];

  for (const edge of graph.edges) {
    const newFrom = edge.from === removeId ? keepId : edge.from;
    const newTo = edge.to === removeId ? keepId : edge.to;

    // Skip self loops
    if (newFrom === newTo) continue;

    const key = `${newFrom}->${newTo}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      updatedEdges.push({
        ...edge,
        from: newFrom,
        to: newTo
      });
    }
  }

  return {
    ...graph,
    nodes: updatedNodes,
    edges: updatedEdges
  };
}
