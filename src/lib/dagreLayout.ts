import dagre from 'dagre';
import { Node, Edge, MarkerType, Position } from '@xyflow/react';
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
    nodesep: 80, // Khoảng cách dọc rộng rãi giữa các hàng node trong cùng rank
    ranksep: 220, // Khoảng cách ngang thoáng đãng giữa các cột (Giả định -> Quyết định -> Task)
    marginx: 60,
    marginy: 60
  });

  const nodeDimensions: Record<string, { width: number; height: number }> = {
    assumption: { width: 320, height: 210 },
    decision: { width: 280, height: 130 },
    task: { width: 240, height: 100 }
  };

  for (const node of nodes) {
    const dim = nodeDimensions[node.type] || { width: 280, height: 140 };
    dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
  }

  // Thiết lập cạnh trong Dagre: từ dependency (edge.to) sang dependent (edge.from)
  // để Dagre phân tầng từ trái sang phải: Giả định (Trái) -> Quyết định (Giữa) -> Task (Phải)
  for (const edge of edges) {
    dagreGraph.setEdge(edge.to, edge.from);
  }

  dagre.layout(dagreGraph);

  const flowNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dim = nodeDimensions[node.type] || { width: 280, height: 140 };

    return {
      id: node.id,
      type: node.type,
      position: {
        x: nodeWithPosition.x - dim.width / 2,
        y: nodeWithPosition.y - dim.height / 2
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { node }
    };
  });

  const flowEdges: Edge[] = edges.map((edge, idx) => ({
    id: `e-${edge.to}-${edge.from}-${idx}`,
    // Nút nguồn bên TRÁI (e.g. A1) nối từ Handle bên PHẢI (Position.Right)
    source: edge.to,
    // Nút đích bên PHẢI (e.g. D1) nối vào Handle bên TRÁI (Position.Left)
    target: edge.from,
    type: 'bezier',
    animated: false,
    // Mũi tên trỏ về phía Dependency (ví dụ D1 phụ thuộc vào A1 -> mũi tên trỏ về A1)
    markerStart: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: '#64748b'
    },
    style: {
      stroke: '#94a3b8',
      strokeWidth: 2
    }
  }));

  return { flowNodes, flowEdges };
}
