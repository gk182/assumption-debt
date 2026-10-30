'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
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
  ArrowRight,
  Download,
  Upload,
  Copy,
  Filter,
  Map as MapIcon,
  Target,
  ArrowRightLeft,
  GitMerge,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Grid
} from 'lucide-react';
import Link from 'next/link';

import { DocumentNodeComponent } from '@/components/DocumentNode';
import { SAMPLE_DOCS, extractProjectTitleFromDoc } from '@/lib/sampleDocs';
import { LLMProvider, PROVIDER_CONFIGS } from '@/lib/llm/types';
import { exportProjectToJSON, importProjectFromJSON } from '@/lib/storage';
import { generateAssumptionDebtReport } from '@/lib/report';
import { findPotentialDuplicates, DuplicateCandidate } from '@/lib/dedup';
import { downstream } from '@/lib/graph';
import { AssumptionNode } from '@/lib/types';

const nodeTypes = {
  document: DocumentNodeComponent,
  assumption: AssumptionNodeComponent,
  decision: DecisionNodeComponent,
  task: TaskNodeComponent
};

interface AdaptiveBackgroundProps {
  variant?: BackgroundVariant;
}

/**
 * AdaptiveBackground guarantees that dot size and spacing remain sharp,
 * beautifully visible, and never vanish into a pitch-black canvas when zooming out.
 */
function AdaptiveBackground({ variant = BackgroundVariant.Dots }: AdaptiveBackgroundProps) {
  const { zoom } = useViewport();

  // Guard against invalid/zero zoom
  const safeZoom = Math.max(zoom || 1, 0.15);

  // 1. Maintain consistent on-screen dot size across all zoom levels
  // In @xyflow/react: scaledSize = size * zoom; dot radius = scaledSize / 2
  // When zoomed out (< 0.5), boost on-screen radius slightly so dots pop crisply against black canvas
  const targetOnScreenRadius = safeZoom < 0.35 ? 1.4 : safeZoom < 0.65 ? 1.2 : 0.95;
  const dynamicSize = Math.max(1.0, (targetOnScreenRadius * 2) / safeZoom);

  // 2. Maintain comfortable on-screen dot spacing (~18px - 24px on physical screen)
  // In @xyflow/react: scaledGap = gap * zoom => gap = onScreenSpacing / zoom
  const targetOnScreenSpacing = safeZoom < 0.35 ? 18 : safeZoom < 0.65 ? 20 : 22;
  const dynamicGap = Math.max(16, Math.round(targetOnScreenSpacing / safeZoom));

  // 3. Adaptive contrast: when zoomed out, use brighter dot color
  const isFarOut = safeZoom < 0.55;
  const dotColor = isFarOut ? 'var(--flow-dot-color-far)' : 'var(--flow-dot-color)';

  return (
    <Background
      variant={variant}
      gap={dynamicGap}
      size={dynamicSize}
      color={dotColor}
      className="transition-colors duration-200"
    />
  );
}

function CanvasZoomControl() {
  const { zoom } = useViewport();
  const { zoomTo } = useReactFlow();
  const zoomPct = Math.round((zoom || 1) * 100);

  return (
    <button
      onClick={() => zoomTo(1.0, { duration: 300 })}
      className="px-1.5 py-1 text-[11px] font-mono font-semibold rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition"
      title="Bấm để đặt lại độ phóng về 100%"
    >
      {zoomPct}%
    </button>
  );
}

function GraphInner() {
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
    canRedo,
    tasks,
    getMetrics,
    getNeedsReviewIds,
    importProject,
    mergeNodes
  } = useGraphStore();

  const { zoomIn, zoomOut, fitView, zoomTo, setViewport } = useReactFlow();

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

  // Phase 11: Multi-document Extraction Options
  const [extractMode, setExtractMode] = useState<'replace' | 'append'>('replace');
  const [extractDocTitle, setExtractDocTitle] = useState<string>('');

  // Phase 10: Storage & Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [copyReportSuccess, setCopyReportSuccess] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Graph View Settings
  const [includeProjectRoot, setIncludeProjectRoot] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [bgVariant, setBgVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);

  // Phase 11: Smart Filter & Focus States
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filterDoc, setFilterDoc] = useState<string>('all');
  const [filterShowAssumptions, setFilterShowAssumptions] = useState<boolean>(true);
  const [filterShowDecisions, setFilterShowDecisions] = useState<boolean>(true);
  const [filterShowTasks, setFilterShowTasks] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Phase 11: Deduplication Candidates & Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateCandidate | null>(null);

  // Load API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('assumption_debt_api_key');
      if (savedKey) setExtractApiKey(savedKey);
    }
  }, []);

  // Compute unique documents in current graph
  const availableDocs = useMemo(() => {
    const docs = new Set<string>();
    storeNodes.forEach((n) => {
      if (n.source?.doc) docs.add(n.source.doc);
    });
    return Array.from(docs);
  }, [storeNodes]);

  // Compute potential duplicate assumptions
  const assumptionNodes = useMemo(
    () => storeNodes.filter((n): n is AssumptionNode => n.type === 'assumption'),
    [storeNodes]
  );
  const duplicateCandidates = useMemo(
    () => findPotentialDuplicates(assumptionNodes, 0.65),
    [assumptionNodes]
  );

  const needsReviewIds = useMemo(() => getNeedsReviewIds(), [getNeedsReviewIds, storeNodes, storeEdges]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterDoc !== 'all') count++;
    if (!filterShowAssumptions || !filterShowDecisions || !filterShowTasks) count++;
    if (filterStatus !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (focusMode && selectedNodeId) count++;
    return count;
  }, [filterDoc, filterShowAssumptions, filterShowDecisions, filterShowTasks, filterStatus, filterCategory, focusMode, selectedNodeId]);

  // Filter nodes & edges for graph visualization
  const visibleNodes = useMemo(() => {
    return storeNodes.filter((node) => {
      // 1. Type visibility
      if (node.type === 'assumption' && !filterShowAssumptions) return false;
      if (node.type === 'decision' && !filterShowDecisions) return false;
      if (node.type === 'task' && !filterShowTasks) return false;

      // 2. Document filter
      if (filterDoc !== 'all') {
        const doc = node.source?.doc;
        if (doc && doc !== filterDoc) return false;
      }

      // 3. Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'needs_review') {
          if (!needsReviewIds.has(node.id)) return false;
        } else if (node.type === 'assumption') {
          if (node.status !== filterStatus) return false;
        }
      }

      // 4. Category filter
      if (filterCategory !== 'all' && node.type === 'assumption') {
        if (node.category !== filterCategory) return false;
      }

      // 5. Focus mode (isolate downstream cascade of selected node)
      if (focusMode && selectedNodeId) {
        const downstreamData = downstream(selectedNodeId, storeEdges);
        const allowedIds = new Set([selectedNodeId, ...downstreamData.nodes]);
        if (!allowedIds.has(node.id)) return false;
      }

      return true;
    });
  }, [
    storeNodes,
    storeEdges,
    filterShowAssumptions,
    filterShowDecisions,
    filterShowTasks,
    filterDoc,
    filterStatus,
    filterCategory,
    focusMode,
    selectedNodeId,
    needsReviewIds
  ]);

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return storeEdges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));
  }, [storeEdges, visibleNodes]);

  // Phase 10: Report handlers
  const handleOpenReportModal = () => {
    const metrics = getMetrics(new Date());
    const md = generateAssumptionDebtReport(
      project,
      storeNodes,
      storeEdges,
      metrics,
      tasks,
      { generatedAt: new Date() }
    );
    setReportMarkdown(md);
    setIsReportModalOpen(true);
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopyReportSuccess(true);
      setTimeout(() => setCopyReportSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJSON = () => {
    const json = exportProjectToJSON(project, storeNodes, storeEdges, tasks);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.toLowerCase().replace(/[^a-z0-9]/g, '-')}-graph.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = importProjectFromJSON(text);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Dữ liệu không hợp lệ');
      }
      importProject(res.data);
      setImportNotification(`Đã khôi phục thành công dự án "${res.data.project}" (${res.data.nodes.length} nút)!`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'File JSON không hợp lệ');
    }
    e.target.value = '';
  };

  const handleSelectPreset = (docId: string) => {
    setSelectedPresetId(docId);
    const found = SAMPLE_DOCS.find((d) => d.id === docId);
    if (found) {
      setExtractDocText(found.content);
      setExtractDocTitle(found.title.split(':')[1]?.split('(')[0]?.trim() || found.title);
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

      const docTitle =
        extractDocTitle.trim() ||
        (extractUseAi
          ? extractProjectTitleFromDoc(extractDocText)
          : selectedPresetId
          ? SAMPLE_DOCS.find((d) => d.id === selectedPresetId)?.title
          : 'Instant Merchant Advance');

      // Commit to graph (replace or append based on extractMode)
      setProposedData(
        json.data.assumptions,
        json.data.decisions || [],
        json.data.links || [],
        docTitle
      );
      commitReviewToGraph(extractMode === 'replace');

      setExtractSuccess(
        extractMode === 'replace'
          ? `Đã tạo mới đồ thị cho "${docTitle}"!`
          : `Đã gộp thêm tài liệu "${docTitle}" vào đồ thị chung!`
      );

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

  // Connect nodes via drag-and-drop
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
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

  // Layout nodes whenever visible nodes/edges, root toggle, compact mode, direction, or cascade change
  useEffect(() => {
    const { flowNodes, flowEdges } = getLayoutedElements(visibleNodes, visibleEdges, {
      direction: layoutDirection,
      includeProjectRoot,
      projectName: project,
      isCompact
    });

    const styledEdges = flowEdges.map((edge) => {
      const isRootEdge = edge.id.startsWith('e-root-');

      if (isRootEdge) {
        const isTargetSelected = selectedNodeId && edge.target === selectedNodeId;
        return {
          ...edge,
          animated: true,
          style: {
            stroke: isTargetSelected ? '#0070f3' : '#888888',
            strokeWidth: isTargetSelected ? 2.8 : 2,
            strokeDasharray: '5 5',
            opacity: 0.85
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: isTargetSelected ? '#0070f3' : '#888888'
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
          style: { stroke: '#ee0000', strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: '#ee0000'
          }
        };
      }

      if (isSelected) {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#0070f3', strokeWidth: 2.8 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: '#0070f3'
          }
        };
      }

      const isDimmed = cascade?.isActive || !!selectedNodeId;
      return {
        ...edge,
        animated: false,
        style: {
          stroke: isDimmed ? '#404040' : '#8a8a8e',
          strokeWidth: 2,
          opacity: isDimmed ? 0.3 : 0.95
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 13,
          height: 13,
          color: isDimmed ? '#404040' : '#8a8a8e'
        }
      };
    });

    setNodes(flowNodes);
    setEdges(styledEdges);
  }, [
    visibleNodes,
    visibleEdges,
    selectedNodeId,
    cascade,
    includeProjectRoot,
    isCompact,
    layoutDirection,
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

  // Demo 1-click refute
  const handleDemoRefuteA1 = () => {
    const unverifiedAssumption = storeNodes.find(
      (n): n is import('@/lib/types').AssumptionNode =>
        n.type === 'assumption' && n.status === 'unverified'
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

  const handleMergeSubmit = () => {
    if (!selectedDuplicate) return;
    mergeNodes(selectedDuplicate.primaryId, selectedDuplicate.duplicateId);
    setIsMergeModalOpen(false);
    setSelectedDuplicate(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#fafafa] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Top Header (Vercel Navigation Bar Style) */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] px-5 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-85 transition"
          >
            <div className="w-7 h-7 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
              ▲
            </div>
            <div>
              <h1 className="font-bold text-xs tracking-tight leading-tight text-neutral-900 dark:text-neutral-100">
                Assumption Debt
              </h1>
              <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[180px]">
                {project}
              </p>
            </div>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Phase 7: Undo / Redo */}
          <div className="flex items-center gap-1 border-r border-neutral-200 dark:border-neutral-800 pr-2 mr-1">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-700 dark:text-neutral-300 transition"
              title="Hoàn tác thao tác đồ thị (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-700 dark:text-neutral-300 transition"
              title="Làm lại thao tác đồ thị (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Phase 11: Toggle Filter Bar Button */}
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition ${
              showFilterBar || activeFilterCount > 0
                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
            title="Mở thanh bộ lọc tài liệu, trạng thái, và phân loại"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0070f3] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Toggle Nối chung Nút Gốc PRD */}
          <button
            onClick={() => setIncludeProjectRoot(!includeProjectRoot)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition ${
              includeProjectRoot
                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
            title="Nối chung các giả định về Nút Gốc PRD để không bị rời rạc"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Nút Gốc: {includeProjectRoot ? 'Bật' : 'Tắt'}</span>
          </button>

          {/* Toggle Chế độ Thu gọn / Chi tiết */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition ${
              isCompact
                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
            title="Thu gọn thẻ để vừa màn hình, không bị tràn khi zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isCompact ? 'Thu gọn' : 'Chi tiết'}</span>
          </button>

          {/* Quick Demo Button for Refuting A1 */}
          <button
            onClick={handleDemoRefuteA1}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#ee0000] hover:bg-[#c50000] text-white shadow-sm transition"
            title="Thực hiện nhanh bước demo: Bác bỏ giả định đầu tiên để kích hoạt hiệu ứng sụp đổ dây chuyền (Cascade)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Demo: Bác bỏ {storeNodes.find((n) => n.type === 'assumption')?.id || 'A1'}</span>
          </button>

          {/* Phase 10: Report & JSON Export/Import */}
          <button
            onClick={handleOpenReportModal}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
            title="Xem và xuất Báo cáo nợ giả định định dạng Markdown hoặc In"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Báo cáo</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
            title="Xuất toàn bộ đồ thị và task thành file JSON có schemaVersion"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Xuất JSON</span>
          </button>

          <label
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
            title="Nhập đồ thị từ file JSON đã lưu"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-500" />
            <span>Nhập JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {/* Phase 7: Add Manual Node Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
            title="Thêm giả định, quyết định hoặc công việc thủ công vào đồ thị"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            <span>Thêm nút</span>
          </button>

          <button
            onClick={resetToInitial}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition"
            title="Khôi phục lại dữ liệu mẫu ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          {/* Primary Action Button (Vercel Style) */}
          <button
            onClick={() => setIsExtractModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition shadow-sm"
            title="Dán văn bản PRD/ADR để AI trích xuất giả định, quyết định, công việc và vẽ lại đồ thị"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>+ Dán PRD mới (AI)</span>
          </button>
        </div>
      </header>

      {/* Phase 11: Expandable Vercel Smart Filter Bar */}
      {showFilterBar && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] px-5 py-2.5 z-20 flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top duration-150">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Document */}
            {availableDocs.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-neutral-500 font-mono">Tài liệu:</span>
                <select
                  value={filterDoc}
                  onChange={(e) => setFilterDoc(e.target.value)}
                  className="text-xs py-1 px-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
                >
                  <option value="all">Tất cả tài liệu ({availableDocs.length})</option>
                  {availableDocs.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Node Types (Toggle Pills) */}
            <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-2">
              <button
                onClick={() => setFilterShowAssumptions(!filterShowAssumptions)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition border ${
                  filterShowAssumptions
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold'
                    : 'bg-transparent text-neutral-400 border-transparent hover:border-neutral-200'
                }`}
              >
                Giả định ({storeNodes.filter((n) => n.type === 'assumption').length})
              </button>
              <button
                onClick={() => setFilterShowDecisions(!filterShowDecisions)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition border ${
                  filterShowDecisions
                    ? 'bg-[#0070f3]/10 text-[#0070f3] border-[#0070f3]/30 font-semibold'
                    : 'bg-transparent text-neutral-400 border-transparent hover:border-neutral-200'
                }`}
              >
                Quyết định ({storeNodes.filter((n) => n.type === 'decision').length})
              </button>
              <button
                onClick={() => setFilterShowTasks(!filterShowTasks)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition border ${
                  filterShowTasks
                    ? 'bg-[#7928ca]/10 text-[#7928ca] border-[#7928ca]/30 font-semibold'
                    : 'bg-transparent text-neutral-400 border-transparent hover:border-neutral-200'
                }`}
              >
                Task ({storeNodes.filter((n) => n.type === 'task').length})
              </button>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-2">
              <span className="text-[11px] text-neutral-500 font-mono">Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs py-1 px-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="unverified">Chưa kiểm chứng</option>
                <option value="validated">Đã xác thực</option>
                <option value="refuted">Bị bác bỏ</option>
                <option value="needs_review">Cần xem lại ({needsReviewIds.size})</option>
              </select>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-2">
              <span className="text-[11px] text-neutral-500 font-mono">Phân loại:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs py-1 px-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
              >
                <option value="all">Tất cả phân loại</option>
                <option value="user_behavior">Hành vi người dùng</option>
                <option value="technical_dependency">Phụ thuộc kỹ thuật</option>
                <option value="market">Thị trường / Kinh doanh</option>
                <option value="data">Dữ liệu</option>
                <option value="legal">Pháp lý / Tuân thủ</option>
              </select>
            </div>

            {/* Focus Mode */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              disabled={!selectedNodeId}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                focusMode && selectedNodeId
                  ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                  : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={selectedNodeId ? 'Chỉ hiển thị nhánh phụ thuộc của nút đang chọn' : 'Chọn một nút để bật chế độ tiêu điểm'}
            >
              <Target className="w-3 h-3" />
              <span>Tiêu điểm {selectedNodeId ? `(${selectedNodeId})` : ''}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Duplicate Assumptions Merge Alert */}
            {duplicateCandidates.length > 0 && (
              <button
                onClick={() => {
                  setSelectedDuplicate(duplicateCandidates[0]);
                  setIsMergeModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
              >
                <GitMerge className="w-3 h-3 text-amber-500" />
                <span>Phát hiện {duplicateCandidates.length} giả định trùng</span>
              </button>
            )}

            {/* Reset Filter Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterDoc('all');
                  setFilterShowAssumptions(true);
                  setFilterShowDecisions(true);
                  setFilterShowTasks(true);
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setFocusMode(false);
                }}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      )}

      {/* Import Notification Banner */}
      {importNotification && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2 flex items-center justify-between text-xs z-20 animate-in fade-in text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm transition"
            >
              Nạp ngay vào Đồ thị (Thay thế cũ)
            </button>
            <button
              onClick={() => commitReviewToGraph(false)}
              className="px-3 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm transition"
            >
              Gộp thêm vào Đồ thị
            </button>
            <Link
              href="/review"
              className="px-3 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium transition"
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
            fitViewOptions={{ padding: 0.2, maxZoom: 1.0, minZoom: 0.65 }}
            minZoom={0.35}
            maxZoom={2.2}
            proOptions={{ hideAttribution: true }}
          >
            {/* Adaptive Dot Background that never disappears when zooming out */}
            <AdaptiveBackground variant={bgVariant} />

            {/* Vercel Clean MiniMap */}
            {showMiniMap && (
              <MiniMap
                className="!bg-white/90 dark:!bg-[#0a0a0a]/90 !border !border-neutral-200 dark:!border-neutral-800 !rounded-lg !shadow-sm hidden md:block !mb-16 !mr-3"
                nodeStrokeColor="#737373"
                nodeColor={(n) => {
                  if (n.type === 'document') return '#171717';
                  if (n.type === 'assumption') return '#f5a623';
                  if (n.type === 'decision') return '#0070f3';
                  return '#7928ca';
                }}
              />
            )}
          </ReactFlow>

          {/* Vercel Sleek Floating Canvas Toolbar (Bottom-Right) */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 p-1 bg-white dark:bg-[#141417] border border-neutral-200 dark:border-neutral-700/80 rounded-md shadow-md">
            <CanvasZoomControl />
            <div className="w-[1px] h-4 bg-neutral-200 dark:border-neutral-700 mx-0.5" />
            <button
              onClick={() => zoomIn({ duration: 300 })}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => zoomOut({ duration: 300 })}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fitView({ duration: 400, padding: 0.2, minZoom: 0.65 })}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
              title="Vừa màn hình (Fit View)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-0.5" />
            <button
              onClick={() => setLayoutDirection(layoutDirection === 'LR' ? 'TB' : 'LR')}
              className={`p-1.5 rounded transition ${
                layoutDirection === 'TB'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
              }`}
              title={`Đổi hướng đồ thị: Hiện tại là ${layoutDirection === 'LR' ? 'Trái -> Phải' : 'Trên -> Dưới'}`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`p-1.5 rounded transition ${
                showMiniMap
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
              }`}
              title="Bật / Tắt Bản đồ thu nhỏ (MiniMap)"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (bgVariant === BackgroundVariant.Dots) setBgVariant(BackgroundVariant.Lines);
                else if (bgVariant === BackgroundVariant.Lines) setBgVariant(BackgroundVariant.Cross);
                else setBgVariant(BackgroundVariant.Dots);
              }}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition"
              title={`Kiểu nền canvas: ${
                bgVariant === BackgroundVariant.Dots
                  ? 'Chấm (Dots)'
                  : bgVariant === BackgroundVariant.Lines
                  ? 'Lưới kẻ (Lines)'
                  : 'Dấu cộng (Cross)'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vercel Pill Legend (Bottom-Left, completely separated from controls) */}
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 shadow-sm text-[11px] flex items-center gap-3">
            {includeProjectRoot && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-black dark:bg-white" />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">Tài liệu Gốc</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f5a623]" />
              <span className="text-neutral-600 dark:text-neutral-400">Giả định</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#0070f3]" />
              <span className="text-neutral-600 dark:text-neutral-400">Quyết định</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#7928ca]" />
              <span className="text-neutral-600 dark:text-neutral-400">Công việc</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Gộp Giả Định Trùng Lặp (Phase 11) */}
      {isMergeModalOpen && selectedDuplicate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <GitMerge className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Gộp Giả Định Trùng Lặp
                </h2>
              </div>
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              Hệ thống phát hiện 2 giả định có độ tương đồng <strong>{Math.round(selectedDuplicate.similarity * 100)}%</strong>. Bạn có thể gộp chúng lại làm một nút để tối ưu đồ thị phụ thuộc:
            </p>

            <div className="space-y-3 mb-5">
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                    Giữ lại: {selectedDuplicate.primaryId}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Nút chính</span>
                </div>
                <p className="text-xs text-neutral-800 dark:text-neutral-200">{selectedDuplicate.primaryText}</p>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    Sẽ gộp vào: {selectedDuplicate.duplicateId}
                  </span>
                  <span className="text-[10px] text-rose-500 font-medium">Sẽ xóa nút thừa</span>
                </div>
                <p className="text-xs text-neutral-800 dark:text-neutral-200">{selectedDuplicate.duplicateText}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleMergeSubmit}
                className="px-4 py-1.5 text-xs font-semibold bg-black text-white dark:bg-white dark:text-black rounded-md hover:opacity-90 transition shadow-sm flex items-center gap-1.5"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Xác nhận Gộp Nút</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Thêm Nút Thủ Công (Phase 7) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Thêm nút mới vào đồ thị</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Loại nút:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddType('assumption')}
                    className={`py-1.5 text-xs font-medium rounded-md border transition ${
                      addType === 'assumption'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    Giả định
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddType('decision')}
                    className={`py-1.5 text-xs font-medium rounded-md border transition ${
                      addType === 'decision'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    Quyết định
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddType('task')}
                    className={`py-1.5 text-xs font-medium rounded-md border transition ${
                      addType === 'task'
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    Công việc
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nội dung:
                </label>
                <textarea
                  rows={3}
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  placeholder="Nhập nội dung giả định, quyết định hoặc công việc..."
                  className="w-full text-xs p-2.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">
                    Người phụ trách:
                  </label>
                  <input
                    type="text"
                    value={addOwner}
                    onChange={(e) => setAddOwner(e.target.value)}
                    placeholder="VD: Tech Lead"
                    className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                {addType === 'assumption' ? (
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Tầm quan trọng (1-5):
                    </label>
                    <select
                      value={addImportance}
                      onChange={(e) => setAddImportance(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
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
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      Thời gian (tuần):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={addEffortWeeks}
                      onChange={(e) => setAddEffortWeeks(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-black text-white dark:bg-white dark:text-black rounded-md hover:opacity-90 transition shadow-sm"
                >
                  Tạo Nút
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dán PRD & Tạo đồ thị AI mới (kèm Multi-document Mode) */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
                  ▲
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Trích xuất Giả định & Dựng Đồ thị AI
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Phân tích tài liệu PRD/ADR, liên kết quyết định và tính nợ giả định
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExtractModalOpen(false)}
                className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error or Success notification */}
            {extractError && (
              <div className="mb-3 p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{extractError}</span>
              </div>
            )}
            {extractSuccess && (
              <div className="mb-3 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{extractSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRunExtract} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              {/* Phase 11: Document Mode (Replace vs Append / Multi-document) */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Chế độ xử lý tài liệu:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtractMode('replace')}
                    className={`py-2 px-3 rounded-md text-left border transition ${
                      extractMode === 'replace'
                        ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 font-semibold text-neutral-900 dark:text-neutral-100'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-xs">Tạo đồ thị mới (Thay thế)</div>
                    <div className="text-[10px] text-neutral-500">Xóa đồ thị hiện tại và tạo lại từ đầu</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractMode('append')}
                    className={`py-2 px-3 rounded-md text-left border transition ${
                      extractMode === 'append'
                        ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 font-semibold text-neutral-900 dark:text-neutral-100'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-xs">Gộp thêm vào đồ thị (Nhiều tài liệu)</div>
                    <div className="text-[10px] text-neutral-500">Giữ nguyên đồ thị cũ và kết nối thêm tài liệu mới</div>
                  </button>
                </div>
              </div>

              {/* Document Title input */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tên tài liệu / Tiêu đề:
                </label>
                <input
                  type="text"
                  value={extractDocTitle}
                  onChange={(e) => setExtractDocTitle(e.target.value)}
                  placeholder="Ví dụ: PRD Thu ngân, ADR-002: Cổng thanh toán..."
                  className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Preset Document Buttons */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Chọn nhanh tài liệu mẫu:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_DOCS.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectPreset(doc.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition ${
                        selectedPresetId === doc.id
                          ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                      }`}
                    >
                      {doc.title.split(':')[1]?.split('(')[0]?.trim() || doc.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for document */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Nội dung văn bản (Markdown / Text):
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {extractDocText.length} ký tự
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={extractDocText}
                  onChange={(e) => {
                    setExtractDocText(e.target.value);
                    setSelectedPresetId('');
                  }}
                  placeholder="Dán nội dung PRD, ADR, Spec dự án vào đây..."
                  className="w-full text-xs font-mono p-2.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white leading-relaxed"
                  required
                />
              </div>

              {/* AI vs Mockup Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExtractUseAi(true)}
                  className={`p-2.5 rounded-md border text-left transition ${
                    extractUseAi
                      ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 font-semibold text-neutral-900 dark:text-neutral-100'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Chế độ AI Thật
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Gọi Gemini / Claude phân tích văn bản thực tế</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExtractUseAi(false)}
                  className={`p-2.5 rounded-md border text-left transition ${
                    !extractUseAi
                      ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 font-semibold text-neutral-900 dark:text-neutral-100'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Mockup Offline
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Dùng dữ liệu cache sẵn sàng trình chiếu</div>
                </button>
              </div>

              {/* AI Configuration */}
              {extractUseAi && (
                <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">
                        Nhà cung cấp LLM:
                      </label>
                      <select
                        value={extractProvider}
                        onChange={(e) => {
                          const p = e.target.value as LLMProvider;
                          setExtractProvider(p);
                          setExtractModel(PROVIDER_CONFIGS[p].defaultModel);
                        }}
                        className="w-full text-xs p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="gemini">Google Gemini (Khuyên dùng: 2.5 Flash)</option>
                        <option value="anthropic">Anthropic Claude (3.5 Sonnet)</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-500 mb-1">
                        Mô hình:
                      </label>
                      <select
                        value={extractModel}
                        onChange={(e) => setExtractModel(e.target.value)}
                        className="w-full text-xs p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100"
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
                    <label className="block text-[11px] text-neutral-500 mb-1">
                      API Key ({PROVIDER_CONFIGS[extractProvider].name}):
                    </label>
                    <input
                      type="password"
                      value={extractApiKey}
                      onChange={(e) => setExtractApiKey(e.target.value)}
                      placeholder={`Nhập ${PROVIDER_CONFIGS[extractProvider].name} API Key... (hoặc để trống nếu đã cấu hình trong .env.local)`}
                      className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-900 flex-shrink-0">
                <Link
                  href="/review"
                  onClick={() => setIsExtractModalOpen(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1"
                >
                  <span>Chuyển sang Hòm thư duyệt chi tiết</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExtractModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md transition"
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    disabled={isExtracting}
                    className="px-4 py-1.5 text-xs font-semibold bg-black text-white dark:bg-white dark:text-black rounded-md hover:opacity-90 disabled:opacity-50 transition shadow-sm flex items-center gap-1.5"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>{extractMode === 'replace' ? 'Dựng Đồ Thị Mới' : 'Gộp Vào Đồ Thị'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Báo Cáo Nợ Giả Định (Phase 10) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Báo Cáo Nợ Giả Định (Executive Risk Report)
                </h2>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 bg-neutral-50 dark:bg-neutral-900/60 p-4 rounded-md border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed select-text">
              {reportMarkdown}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-900 flex-shrink-0">
              <span className="text-[11px] text-neutral-400">
                Định dạng chuẩn Markdown · Có thể copy sang Notion, Slack, Email
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition shadow-sm"
                >
                  {copyReportSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã chép Markdown!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép Báo cáo</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
