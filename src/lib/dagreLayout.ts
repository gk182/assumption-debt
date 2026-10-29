import dagre from 'dagre';
import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { GraphNode, GraphEdge } from './types';

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  includeProjectRoot?: boolean;
  projectName?: string;
  isCompact?: boolean;
}

export function getLayoutedElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions = {}
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const {
    direction = 'LR',
    includeProjectRoot = true,
    projectName = 'Tài liệu Dự án',
    isCompact = false
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Compact, intentional spacing so graphs fit naturally without microscopic zoom-out
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isCompact ? 28 : 36, // Khoảng cách dọc vừa vặn, không bị rời rạc
    ranksep: isCompact ? 90 : 120, // Khoảng cách ngang giữa các rank gọn gàng
    marginx: 40,
    marginy: 40
  });

  const nodeDimensions: Record<string, { width: number; height: number }> = {
    document: { width: 280, height: 145 },
    assumption: { width: 290, height: isCompact ? 110 : 165 },
    decision: { width: 250, height: isCompact ? 80 : 110 },
    task: { width: 220, height: isCompact ? 70 : 85 }
  };

  // 1. Prepare working node list (include virtual Document Root Node if enabled)
  const workingNodes: Array<GraphNode | { id: string; type: string; text: string }> = [...nodes];
  const workingEdges: Array<GraphEdge | { from: string; to: string; relation: string; isRootEdge?: boolean }> = [
    ...edges
  ];

  const hasAssumptions = nodes.some((n) => n.type === 'assumption');

  if (includeProjectRoot && hasAssumptions) {
    const rootId = 'PRD_ROOT';
    workingNodes.unshift({
      id: rootId,
      type: 'document',
      text: projectName
    });

    // Connect root to all assumptions that don't have another assumption prerequisite
    const assumptions = nodes.filter((n) => n.type === 'assumption');
    for (const a of assumptions) {
      workingEdges.push({
        from: a.id,
        to: rootId,
        relation: 'originates_from',
        isRootEdge: true
      });
    }
  }

  // 2. Register nodes in Dagre
  for (const node of workingNodes) {
    const dim = nodeDimensions[node.type] || { width: 250, height: 110 };
    dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
  }

  // 3. Register edges in Dagre: from dependency (edge.to) to dependent (edge.from)
  for (const edge of workingEdges) {
    if (edge.to && edge.from) {
      dagreGraph.setEdge(edge.to, edge.from);
    }
  }

  dagre.layout(dagreGraph);

  // 4. Transform to React Flow Nodes
  const flowNodes: Node[] = workingNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id) || { x: 0, y: 0 };
    const dim = nodeDimensions[node.type] || { width: 250, height: 110 };

    return {
      id: node.id,
      type: node.type,
      position: {
        x: nodeWithPosition.x - dim.width / 2,
        y: nodeWithPosition.y - dim.height / 2
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { node, isCompact }
    };
  });

  // 5. Transform to React Flow Edges
  const flowEdges: Edge[] = workingEdges.map((edge, idx) => {
    const isRootEdge = (edge as any).isRootEdge;

    if (isRootEdge) {
      return {
        id: `e-root-${edge.from}-${idx}`,
        source: edge.to, // PRD_ROOT
        target: edge.from, // A1, A2, etc.
        type: 'bezier',
        animated: true,
        markerStart: {
          type: MarkerType.ArrowClosed,
          width: 10,
          height: 10,
          color: '#f59e0b'
        },
        style: {
          stroke: '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: '4 4',
          opacity: 0.75
        }
      };
    }

    return {
      id: `e-${edge.to}-${edge.from}-${idx}`,
      source: edge.to, // Prerequisite (Left handle Position.Right)
      target: edge.from, // Dependent (Right handle Position.Left)
      type: 'bezier',
      animated: false,
      markerStart: {
        type: MarkerType.ArrowClosed,
        width: 13,
        height: 13,
        color: '#64748b'
      },
      style: {
        stroke: '#94a3b8',
        strokeWidth: 2
      }
    };
  });

  return { flowNodes, flowEdges };
}
