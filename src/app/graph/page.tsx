'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  MarkerType,
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
  Plus,
  Undo2,
  Redo2,
  AlertCircle,
  X,
  Layers,
  Check,
  CheckCircle2,
  Loader2,
  Key,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

import { DocumentNodeComponent } from '@/components/DocumentNode';
import { SAMPLE_DOCS, extractProjectTitleFromDoc } from '@/lib/sampleDocs';
import { LLMProvider, PROVIDER_CONFIGS } from '@/lib/llm/types';

const nodeTypes = {
  document: DocumentNodeComponent,
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
    selectedNodeId,
    cascade,
    proposedAssumptions,
    proposedProjectName,
    setProposedData,
    commitReviewToGraph,
    addManualNode,
    connectNodes,
    disconnectNodes,
    undo,
    redo,
    canUndo,
    canRedo
  } = useGraphStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Phase 7: Interactive Editing State
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'assumption' | 'decision' | 'task'>('assumption');
  const [addText, setAddText] = useState('');
  const [addImportance, setAddImportance] = useState(3);
  const [addEffortWeeks, setAddEffortWeeks] = useState(1);
  const [addOwner, setAddOwner] = useState('');

  // PRD Extraction Modal State
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('bookspa');
  const [extractDocText, setExtractDocText] = useState<string>(SAMPLE_DOCS[0]?.content || '');
  const [extractUseAi, setExtractUseAi] = useState<boolean>(true);
  const [extractProvider, setExtractProvider] = useState<LLMProvider>('gemini');
  const [extractModel, setExtractModel] = useState<string>(PROVIDER_CONFIGS.gemini.defaultModel);
  const [extractApiKey, setExtractApiKey] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);

  // Auto-restore API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('assumption_debt_api_key');
      if (savedKey) {
        setExtractApiKey(savedKey);
      }
    }
  }, []);

  const handleSelectPreset = (docId: string) => {
    setSelectedPresetId(docId);
    const found = SAMPLE_DOCS.find((d) => d.id === docId);
    if (found) {
      setExtractDocText(found.content);
    }
  };

  const handleRunExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractDocText.trim()) {
      setExtractError('Vui lòng nhập nội dung tài liệu để phân tích.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      if (extractApiKey.trim()) {
        localStorage.setItem('assumption_debt_api_key', extractApiKey.trim());
      }

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: extractDocText,
          useProductFlow: extractUseAi,
          provider: extractProvider,
          model: extractModel,
          apiKey: extractApiKey.trim() || undefined
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Trích xuất thất bại');
      }

      if (!json.data || !json.data.assumptions || json.data.assumptions.length === 0) {
        throw new Error('Không tìm thấy giả định nào phù hợp hoặc trích dẫn không khớp với văn bản.');
      }

      const docTitle = extractUseAi
        ? extractProjectTitleFromDoc(extractDocText)
        : 'Instant Merchant Advance (Mockup)';

      // Commit directly to graph
      setProposedData(
        json.data.assumptions,
        json.data.decisions || [],
        json.data.links || [],
        docTitle
      );
      commitReviewToGraph(true);

      setExtractSuccess(`Đã tạo thành công đồ thị mới cho "${docTitle}"!`);
      setTimeout(() => {
        setIsExtractModalOpen(false);
        setExtractSuccess(null);
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      setExtractError(err instanceof Error ? err.message : 'Lỗi khi trích xuất');
    } finally {
      setIsExtracting(false);
    }
  };

  // Enhanced Graph View Options: Root PRD node & Compact Mode
  const [includeProjectRoot, setIncludeProjectRoot] = useState(true);
  const [isCompact, setIsCompact] = useState(false);

  // Connect nodes via drag-and-drop
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // In our graph layout: Left is prerequisite (`to`), Right is dependent (`from`)
      let res = connectNodes(connection.target, connection.source);
      if (!res.success) {
        const resAlt = connectNodes(connection.source, connection.target);
        if (resAlt.success) {
          res = resAlt;
        }
      }
      if (!res.success) {
        setConnectError(res.error || 'Không thể tạo liên kết');
        setTimeout(() => setConnectError(null), 4000);
      }
    },
    [connectNodes]
  );

  // Delete edges via selection / Backspace
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        disconnectNodes(edge.target, edge.source);
        disconnectNodes(edge.source, edge.target);
      }
    },
    [disconnectNodes]
  );

  // Undo / Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addText.trim()) return;
    addManualNode({
      type: addType,
      text: addText.trim(),
      importance: addType === 'assumption' ? addImportance : undefined,
      effortWeeks: addType !== 'assumption' ? addEffortWeeks : undefined,
      owner: addOwner.trim() || undefined
    });
    setAddText('');
    setAddOwner('');
    setIsAddModalOpen(false);
  };

  // Layout nodes whenever store nodes/edges, root toggle, compact mode, or cascade change
  useEffect(() => {
    const { flowNodes, flowEdges } = getLayoutedElements(storeNodes, storeEdges, {
      direction: 'LR',
      includeProjectRoot,
      projectName: project,
      isCompact
    });

    const styledEdges = flowEdges.map((edge) => {
      const isRootEdge = edge.source === 'PRD_ROOT';

      if (isRootEdge) {
        const isTargetSelected = selectedNodeId && edge.target === selectedNodeId;
        return {
          ...edge,
          animated: true,
          style: {
            stroke: isTargetSelected ? '#f59e0b' : '#38bdf8',
            strokeWidth: isTargetSelected ? 2.5 : 1.8,
            strokeDasharray: '4 4',
            opacity: 0.8
          },
          markerStart: {
            type: MarkerType.ArrowClosed,
            width: 10,
            height: 10,
            color: isTargetSelected ? '#f59e0b' : '#38bdf8'
          }
        };
      }

      const isCascade =
        cascade?.isActive &&
        (edge.source === cascade.refutedId ||
          cascade.affectedNodeIds.includes(edge.target) ||
          cascade.affectedNodeIds.includes(edge.source));

      const isSelected =
        selectedNodeId &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);

      if (isCascade) {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#f43f5e', strokeWidth: 3 },
          markerStart: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: '#f43f5e'
          }
        };
      }

      if (isSelected) {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2.5 },
          markerStart: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: '#f59e0b'
          }
        };
      }

      const isDimmed = cascade?.isActive || !!selectedNodeId;
      return {
        ...edge,
        animated: false,
        style: {
          stroke: '#94a3b8',
          strokeWidth: 1.8,
          opacity: isDimmed ? 0.3 : 0.85
        },
        markerStart: {
          type: MarkerType.ArrowClosed,
          width: 13,
          height: 13,
          color: isDimmed ? '#cbd5e1' : '#64748b'
        }
      };
    });

    setNodes(flowNodes);
    setEdges(styledEdges);
  }, [
    storeNodes,
    storeEdges,
    selectedNodeId,
    cascade,
    includeProjectRoot,
    isCompact,
    project,
    setNodes,
    setEdges
  ]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Demo shortcut: Refute first available assumption with one click
  const handleDemoRefuteA1 = () => {
    const unverifiedAssumption = storeNodes.find(
      (n): n is import('@/lib/types').AssumptionNode => n.type === 'assumption' && n.status === 'unverified'
    );
    const target =
      unverifiedAssumption ||
      storeNodes.find((n): n is import('@/lib/types').AssumptionNode => n.type === 'assumption');
    if (target) {
      refuteAssumption(
        target.id,
        target.whyItMatters || 'Bác bỏ giả định qua phản hồi thực tế từ thị trường'
      );
    }
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
          {/* Phase 7: Undo / Redo */}
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition"
              title="Hoàn tác thao tác đồ thị (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition"
              title="Làm lại thao tác đồ thị (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Nối chung Nút Gốc PRD */}
          <button
            onClick={() => setIncludeProjectRoot(!includeProjectRoot)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              includeProjectRoot
                ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Nối chung các giả định về Nút Gốc PRD để không bị rời rạc"
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Nút Gốc PRD: {includeProjectRoot ? 'Bật' : 'Tắt'}</span>
          </button>

          {/* Toggle Chế độ Thu gọn / Chi tiết */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              isCompact
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-800 dark:text-indigo-300'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Thu gọn thẻ để vừa màn hình, không bị tràn khi zoom"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isCompact ? 'Thu gọn' : 'Chi tiết'}</span>
          </button>

          {/* Quick Demo Button for Refuting A1 */}
          <button
            onClick={handleDemoRefuteA1}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
            title="Thực hiện nhanh bước demo: Bác bỏ giả định đầu tiên để kích hoạt hiệu ứng sụp đổ dây chuyền (Cascade)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Demo: Bác bỏ {storeNodes.find((n) => n.type === 'assumption')?.id || 'A1'}</span>
          </button>

          {/* Phase 7: Add Manual Node Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            title="Thêm giả định, quyết định hoặc công việc thủ công vào đồ thị"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            <span>Thêm nút</span>
          </button>

          <button
            onClick={resetToInitial}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            title="Khôi phục lại dữ liệu mẫu ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          <button
            onClick={() => setIsExtractModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm"
            title="Dán văn bản PRD/ADR để AI trích xuất giả định, quyết định, công việc và vẽ lại đồ thị"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>+ Dán PRD mới (AI)</span>
          </button>
        </div>
      </header>

      {/* Notice Banner if new proposed assumptions are waiting in Review Inbox */}
      {proposedAssumptions.length > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
            <span>
              Bạn đang có <strong>{proposedAssumptions.length} giả định</strong> mới trích xuất
              {proposedProjectName ? ` từ "${proposedProjectName}"` : ''} chưa được nạp vào đồ thị.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => commitReviewToGraph(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm transition"
            >
              Nạp ngay vào Đồ thị (Thay thế cũ)
            </button>
            <Link
              href="/review"
              className="px-3 py-1 rounded-lg border border-amber-500/40 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 font-semibold transition"
            >
              Xem Hòm thư duyệt
            </Link>
          </div>
        </div>
      )}

      {/* Main Workspace: Left Sidebar (Tab Bar / DebtPanel) + Right Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Cascade Banner Notification */}
        <CascadeBanner />

        {/* Left Side: Risk & Debt Panel (Tab Bar) */}
        <DebtPanel
          onOpenExtractModal={() => setIsExtractModalOpen(true)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onDemoRefuteA1={handleDemoRefuteA1}
        />

        {/* Right Side: React Flow Canvas */}
        <div className="flex-1 h-full w-full relative">
          {/* Toast Alert for Connection Error */}
          {connectError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{connectError}</span>
              <button onClick={() => setConnectError(null)} className="ml-2 hover:opacity-80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1.0, minZoom: 0.4 }}
            minZoom={0.25}
            maxZoom={2.0}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#94a3b8"
              className="opacity-40"
            />
            <Controls
              position="bottom-right"
              className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-lg mb-2 mr-2"
            />
            <MiniMap
              className="!bg-white/80 dark:!bg-slate-900/80 !border-slate-200 dark:!border-slate-800 !rounded-xl hidden md:block"
              nodeStrokeColor="#94a3b8"
              nodeColor={(n) => {
                if (n.type === 'document') return '#8b5cf6';
                if (n.type === 'assumption') return '#f59e0b';
                if (n.type === 'decision') return '#3b82f6';
                return '#6366f1';
              }}
            />
          </ReactFlow>

          {/* Quick Legend at bottom-left */}
          <div className="absolute bottom-4 left-4 z-10 p-2.5 px-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg text-[11px] flex items-center gap-3.5">
            {includeProjectRoot && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-gradient-to-r from-amber-500 to-indigo-600 shadow-sm" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Nguồn (PRD)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-amber-500 bg-amber-100 dark:bg-amber-950" />
              <span>Giả định</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-blue-500 bg-blue-100 dark:bg-blue-950" />
              <span>Quyết định</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-indigo-500 bg-indigo-100 dark:bg-indigo-950" />
              <span>Công việc</span>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Thêm Nút Thủ Công (Phase 7) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Thêm nút mới vào đồ thị</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Loại phần tử:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddType('assumption')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      addType === 'assumption'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Giả định
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddType('decision')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      addType === 'decision'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Quyết định
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddType('task')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      addType === 'task'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Công việc
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nội dung:
                </label>
                <textarea
                  rows={3}
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  placeholder={
                    addType === 'assumption'
                      ? 'Ví dụ: Khách hàng sẵn sàng xác nhận số CCCD với bot...'
                      : addType === 'decision'
                      ? 'Ví dụ: Dùng kiến trúc Event Sourcing...'
                      : 'Ví dụ: Tích hợp API đối soát trong Sprint 2...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Người phụ trách:
                  </label>
                  <input
                    type="text"
                    value={addOwner}
                    onChange={(e) => setAddOwner(e.target.value)}
                    placeholder="VD: Tech Lead"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                {addType === 'assumption' ? (
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Tầm quan trọng (1-5):
                    </label>
                    <select
                      value={addImportance}
                      onChange={(e) => setAddImportance(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value={1}>1 - Thấp</option>
                      <option value={2}>2 - Vừa</option>
                      <option value={3}>3 - Trung bình</option>
                      <option value={4}>4 - Cao</option>
                      <option value={5}>5 - Rất nghiêm trọng</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Thời gian (tuần):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={addEffortWeeks}
                      onChange={(e) => setAddEffortWeeks(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow"
                >
                  Tạo Nút
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dán PRD & Tạo đồ thị AI mới */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Dán PRD & Tạo Đồ thị Bằng AI
                  </h2>
                  <p className="text-xs text-slate-500">
                    AI tự động trích xuất Giả định, Quyết định, Công việc và dựng Cây Phụ thuộc
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExtractModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error or Success notification */}
            {extractError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{extractError}</span>
              </div>
            )}
            {extractSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{extractSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRunExtract} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Preset Document Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn nhanh tài liệu mẫu hoặc tự dán:
                </label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_DOCS.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectPreset(doc.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                        selectedPresetId === doc.id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{doc.title.split(':')[1]?.split('(')[0]?.trim() || doc.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for document */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nội dung văn bản (Markdown / Text):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {extractDocText.length} ký tự
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={extractDocText}
                  onChange={(e) => {
                    setExtractDocText(e.target.value);
                    setSelectedPresetId('');
                  }}
                  placeholder="Dán nội dung PRD, ADR, Spec dự án vào đây..."
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  required
                />
              </div>

              {/* Mode Selection: AI vs Mockup */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtractUseAi(true)}
                  className={`p-3 rounded-xl border text-left transition ${
                    extractUseAi
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ✨ Chế độ AI Thật
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Gọi Gemini / Claude / GPT phân tích trực tiếp văn bản, tính toán rủi ro và dựng toàn bộ đồ thị.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExtractUseAi(false)}
                  className={`p-3 rounded-xl border text-left transition ${
                    !extractUseAi
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      📦 Mockup Offline
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Dùng dữ liệu mẫu Instant Merchant Advance có sẵn để test nhanh đồ thị mà không cần API key.
                  </p>
                </button>
              </div>

              {/* AI Provider & API Key Configuration if AI Mode */}
              {extractUseAi && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nhà cung cấp LLM:
                      </label>
                      <select
                        value={extractProvider}
                        onChange={(e) => {
                          const p = e.target.value as LLMProvider;
                          setExtractProvider(p);
                          setExtractModel(PROVIDER_CONFIGS[p].defaultModel);
                        }}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      >
                        <option value="gemini">Google Gemini (Khuyên dùng: 2.5 Flash)</option>
                        <option value="anthropic">Anthropic Claude (3.5 Sonnet)</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mô hình:
                      </label>
                      <select
                        value={extractModel}
                        onChange={(e) => setExtractModel(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      >
                        {PROVIDER_CONFIGS[extractProvider].availableModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>API Key ({PROVIDER_CONFIGS[extractProvider].name}):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Tự động lưu vào trình duyệt của bạn)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={extractApiKey}
                      onChange={(e) => setExtractApiKey(e.target.value)}
                      placeholder={`Nhập ${PROVIDER_CONFIGS[extractProvider].name} API Key... (hoặc để trống nếu đã cấu hình trong .env.local)`}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <Link
                  href="/review"
                  onClick={() => setIsExtractModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <span>Chuyển sang Hòm thư duyệt chi tiết</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExtractModalOpen(false)}
                    disabled={isExtracting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={isExtracting}
                    className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl transition shadow flex items-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI Đang Phân Tích & Dựng Cây...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>Tạo Đồ Thị Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

