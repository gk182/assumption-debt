import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { GraphNode, GraphEdge } from './types';

export function getLayoutedElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: 'LR' | 'TB' = 'LR'
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 45,
    ranksep: 90,
    marginx: 30,
    marginy: 30
  });

  const nodeDimensions: Record<string, { width: number; height: number }> = {
    assumption: { width: 300, height: 160 },
    decision: { width: 260, height: 120 },
    task: { width: 220, height: 90 }
  };

  for (const node of nodes) {
    const dim = nodeDimensions[node.type] || { width: 240, height: 120 };
    dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
  }

  // Edge direction in Assumption Debt: from dependent (e.g. D1) to dependency (e.g. A1).
  // For DAG visual layout from left to right (Assumption -> Decision -> Task),
  // we layout the graph directed from dependency to dependent so Assumptions stay on the left.
  for (const edge of edges) {
    dagreGraph.setEdge(edge.to, edge.from);
  }

  dagre.layout(dagreGraph);

  const flowNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dim = nodeDimensions[node.type] || { width: 240, height: 120 };

    return {
      id: node.id,
      type: node.type,
      position: {
        x: nodeWithPosition.x - dim.width / 2,
        y: nodeWithPosition.y - dim.height / 2
      },
      data: { node }
    };
  });

  const flowEdges: Edge[] = edges.map((edge, idx) => ({
    id: `e-${edge.from}-${edge.to}-${idx}`,
    source: edge.from,
    target: edge.to,
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    label: edge.reason ? 'depends on' : undefined,
    labelStyle: { fontSize: 10, fill: '#64748b' }
  }));

  return { flowNodes, flowEdges };
}

