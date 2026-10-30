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

  // Generous, expansive layout spacing so the graph breathes naturally across widescreen monitors
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isCompact ? 40 : 64,
    ranksep: isCompact ? 140 : 220,
    marginx: 60,
    marginy: 60
  });

  const nodeDimensions: Record<string, { width: number; height: number }> = {
    document: { width: 280, height: isCompact ? 110 : 140 },
    assumption: { width: 290, height: isCompact ? 95 : 160 },
    decision: { width: 260, height: isCompact ? 80 : 105 },
    task: { width: 220, height: isCompact ? 70 : 85 }
  };

  // 1. Multi-Document Support: Identify documents
  const docNames = Array.from(
    new Set(nodes.map((n) => n.source?.doc).filter(Boolean))
  ) as string[];

  const workingNodes: Array<GraphNode | { id: string; type: string; text: string; docId?: string }> = [
    ...nodes
  ];
  const workingEdges: Array<
    GraphEdge | { from: string; to: string; relation: string; isRootEdge?: boolean; rootDoc?: string }
  > = [...edges];

  const assumptions = nodes.filter((n) => n.type === 'assumption');

  if (includeProjectRoot && assumptions.length > 0) {
    if (docNames.length > 1) {
      // Multiple documents exist: Create a root node for each document
      docNames.forEach((docName, idx) => {
        const rootId = `DOC_ROOT_${idx + 1}`;
        workingNodes.unshift({
          id: rootId,
          type: 'document',
          text: docName,
          docId: docName
        });

        const docAssumptions = assumptions.filter((a) => a.source?.doc === docName);
        const targetAssumptions = docAssumptions.length > 0 ? docAssumptions : (idx === 0 ? assumptions : []);

        for (const a of targetAssumptions) {
          workingEdges.push({
            from: a.id,
            to: rootId,
            relation: 'originates_from',
            isRootEdge: true,
            rootDoc: docName
          });
        }
      });
    } else {
      // Single Document Root
      const rootId = 'PRD_ROOT';
      const rootTitle = docNames[0] || projectName;
      workingNodes.unshift({
        id: rootId,
        type: 'document',
        text: rootTitle
      });

      for (const a of assumptions) {
        workingEdges.push({
          from: a.id,
          to: rootId,
          relation: 'originates_from',
          isRootEdge: true
        });
      }
    }
  }

  // 2. Register nodes in Dagre
  for (const node of workingNodes) {
    const dim = nodeDimensions[node.type] || { width: 250, height: 105 };
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
    const dim = nodeDimensions[node.type] || { width: 250, height: 105 };

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

  // 5. Transform to React Flow Edges (with markerEnd pointing forward!)
  const flowEdges: Edge[] = workingEdges.map((edge, idx) => {
    const isRootEdge = (edge as any).isRootEdge;

    if (isRootEdge) {
      return {
        id: `e-root-${edge.from}-${idx}`,
        source: edge.to, // Root Node
        target: edge.from, // Assumption Node
        type: 'bezier',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 10,
          height: 10,
          color: '#888888'
        },
        style: {
          stroke: '#888888',
          strokeWidth: 1.5,
          strokeDasharray: '4 4',
          opacity: 0.75
        }
      };
    }

    return {
      id: `e-${edge.to}-${edge.from}-${idx}`,
      source: edge.to, // Prerequisite (e.g. A1)
      target: edge.from, // Dependent (e.g. D1)
      type: 'bezier',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#737373'
      },
      style: {
        stroke: '#737373',
        strokeWidth: 1.5,
        opacity: 0.8
      }
    };
  });

  return { flowNodes, flowEdges };
}
