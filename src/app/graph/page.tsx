'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '@/lib/store';
import { getLayoutedElements } from '@/lib/dagreLayout';
import { AssumptionNodeComponent } from '@/components/AssumptionNode';
import { DecisionNodeComponent } from '@/components/DecisionNode';
import { TaskNodeComponent } from '@/components/TaskNode';
import { DebtPanel } from '@/components/DebtPanel';
import { CascadeBanner } from '@/components/CascadeBanner';
import {
  RotateCcw,
  Sparkles,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Plus
} from 'lucide-react';
import Link from 'next/link';

const nodeTypes = {
  assumption: AssumptionNodeComponent,
  decision: DecisionNodeComponent,
  task: TaskNodeComponent
};

export default function GraphPage() {
  const {
    project,
    nodes: storeNodes,
    edges: storeEdges,
    selectNode,
    resetToInitial,
    refuteAssumption,
    selectedNodeId
  } = useGraphStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Layout nodes whenever store nodes/edges change
  useEffect(() => {
    const { flowNodes, flowEdges } = getLayoutedElements(storeNodes, storeEdges, 'LR');
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Demo shortcut: Refute A1 with one click
  const handleDemoRefuteA1 = () => {
    refuteAssumption(
      'A1',
      'Khảo sát thực tế: 38% khách hàng hủy đơn hàng khi nhìn thấy phí ship 15k không đổi'
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow">
              Δ
            </div>
            <div>
              <h1 className="font-bold text-xs tracking-tight leading-tight">
                Assumption Debt
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">
                {project}
              </p>
            </div>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Button for Refuting A1 */}
          <button
            onClick={handleDemoRefuteA1}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
            title="Thực hiện nhanh bước demo: Bác bỏ giả định A1 (Phí ship 15k) để kích hoạt Cascade"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Demo: Bác bỏ A1</span>
          </button>

          <button
            onClick={resetToInitial}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            title="Khôi phục lại dữ liệu mẫu ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dán PRD mới</span>
          </Link>
        </div>
      </header>

      {/* Main Workspace: React Flow Canvas + Debt Panel */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Cascade Banner Notification */}
        <CascadeBanner />

        {/* Left Side: React Flow Canvas */}
        <div className="flex-1 h-full w-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#94a3b8"
              className="opacity-40"
            />
            <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-md" />
            <MiniMap
              className="!bg-white/80 dark:!bg-slate-900/80 !border-slate-200 dark:!border-slate-800 !rounded-xl hidden md:block"
              nodeStrokeColor="#94a3b8"
              nodeColor={(n) => {
                if (n.type === 'assumption') return '#f59e0b';
                if (n.type === 'decision') return '#3b82f6';
                return '#6366f1';
              }}
            />
          </ReactFlow>

          {/* Quick Legend at bottom-left */}
          <div className="absolute bottom-4 left-4 z-10 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-md text-[11px] flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-100" />
              <span>Giả định (Assumption)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-blue-500 bg-blue-100" />
              <span>Quyết định (Decision)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-indigo-500 bg-indigo-100" />
              <span>Công việc (Task)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Risk & Debt Panel */}
        <DebtPanel />
      </div>
    </div>
  );
}

