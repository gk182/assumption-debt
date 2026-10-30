'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '@/lib/store';
import { AssumptionNode } from '@/lib/types';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Flame,
  ShieldCheck,
  RotateCcw,
  Clock,
  Edit3,
  Trash2,
  Save,
  X,
  FileText,
  Sparkles,
  Layers,
  Plus,
  Zap,
  Sliders,
  CheckSquare,
  Copy,
  Download,
  Calendar,
  User,
  ExternalLink,
  Check,
  RefreshCw,
  Link as LinkIcon,
  History as HistoryIcon,
  Bookmark,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronLeft,
  GripVertical
} from 'lucide-react';
import {
  exportTasksToMarkdown,
  exportTasksToCSV,
  GeneratedTask
} from '@/lib/tasks';
import { getFormattedHistory, isNodeOverdue } from '@/lib/history';

interface DebtPanelProps {
  onOpenExtractModal?: () => void;
  onOpenAddModal?: () => void;
  onDemoRefuteA1?: () => void;
}

export function DebtPanel({
  onOpenExtractModal,
  onOpenAddModal,
  onDemoRefuteA1
}: DebtPanelProps) {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    getMetrics,
    updateNode,
    deleteNode,
    refuteAssumption,
    validateAssumption,
    resetAssumptionStatus,
    getDownstreamOfSelected,
    project,
    resetToInitial,
    tasks = [],
    generateTasks,
    approveTask,
    rejectTask,
    updateTask,
    approveAllTasks,
    addEvidenceToNode
  } = useGraphStore();

  const [activeTab, setActiveTab] = useState<'risk' | 'tasks' | 'node' | 'actions'>('risk');
  const [taskFilter, setTaskFilter] = useState<'all' | 'proposed' | 'approved'>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  // Vercel-style Collapsible & Resizable Sidebar State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Restore width & collapse state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('assumption_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }
      const savedWidth = localStorage.getItem('assumption_sidebar_width');
      if (savedWidth) {
        const w = parseInt(savedWidth, 10);
        if (!isNaN(w) && w >= 280 && w <= 700) {
          setPanelWidth(w);
        }
      }
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('assumption_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const updateWidth = (w: number) => {
    const clamped = Math.max(280, Math.min(680, Math.round(w)));
    setPanelWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assumption_sidebar_width', String(clamped));
    }
  };

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      updateWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const [refuteReason, setRefuteReason] = useState('');
  const [showRefuteInput, setShowRefuteInput] = useState(false);

  // Evidence input state
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  // Inline editing state for nodes
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftOwner, setDraftOwner] = useState('');
  const [draftImportance, setDraftImportance] = useState(3);
  const [draftEffortWeeks, setDraftEffortWeeks] = useState(1);
  const [draftVerifyBy, setDraftVerifyBy] = useState('');

  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const metrics = getMetrics(currentDate || undefined);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const downstreamResult = getDownstreamOfSelected();

  const pendingTasksCount = (tasks || []).filter((t) => t.status === 'proposed').length;

  // Automatically switch to 'node' tab when a node is selected
  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('node');
    }
  }, [selectedNodeId]);

  // Reset or initialize edit drafts when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setDraftText(selectedNode.text);
      setDraftOwner(selectedNode.owner || '');
      if (selectedNode.type === 'assumption') {
        const a = selectedNode as AssumptionNode;
        setDraftImportance(a.importance);
        setDraftVerifyBy(a.verifyBy || '');
      } else {
        setDraftEffortWeeks(selectedNode.effortWeeks || 1);
      }
      setIsEditing(false);
      setShowRefuteInput(false);
    }
  }, [selectedNode]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !draftText.trim()) return;

    if (selectedNode?.type === 'assumption') {
      updateNode(selectedNodeId, {
        text: draftText.trim(),
        owner: draftOwner.trim() || undefined,
        importance: draftImportance,
        verifyBy: draftVerifyBy || undefined
      });
    } else {
      updateNode(selectedNodeId, {
        text: draftText.trim(),
        owner: draftOwner.trim() || undefined,
        effortWeeks: draftEffortWeeks
      });
    }
    setIsEditing(false);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    if (confirm(`Bạn có chắc chắn muốn xóa nút ${selectedNodeId} này không?`)) {
      deleteNode(selectedNodeId);
      setActiveTab('risk');
    }
  };

  const handleRefuteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) return;
    refuteAssumption(
      selectedNodeId,
      refuteReason.trim() || 'Dữ liệu thực tế cho thấy giả định không còn đúng'
    );
    setShowRefuteInput(false);
    setRefuteReason('');
    setActiveTab('tasks'); // Switch to tasks tab to see newly generated review tasks!
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !evidenceText.trim()) return;
    addEvidenceToNode(selectedNodeId, evidenceText.trim(), evidenceNote.trim() || undefined);
    setEvidenceText('');
    setEvidenceNote('');
    setShowEvidenceForm(false);
  };

  const handleCopyMarkdown = () => {
    const md = exportTasksToMarkdown(tasks, project);
    navigator.clipboard.writeText(md);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2200);
  };

  const handleDownloadCSV = () => {
    const csv = exportTasksToCSV(tasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks-${project.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'assumption-debt'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTasks = (tasks || []).filter((t) => {
    if (taskFilter === 'proposed') return t.status === 'proposed';
    if (taskFilter === 'approved') return t.status === 'approved';
    return true;
  });

  // Collapsed View (Vercel-style slim icon rail)
  if (isCollapsed) {
    return (
      <aside className="w-[56px] flex-shrink-0 bg-white dark:bg-[#000000] border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center py-3.5 h-full z-20 shadow-sm select-none transition-all duration-150">
        {/* Toggle open button on top */}
        <button
          onClick={toggleCollapse}
          className="w-9 h-9 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition mb-3"
          title="Mở rộng thanh điều khiển (Expand Sidebar)"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        {/* Vercel Iconic Mark */}
        <div className="w-8 h-8 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 shadow-sm">
          ▲
        </div>

        {/* Vertical Tab Icons */}
        <div className="flex flex-col items-center gap-2 flex-1 w-full px-2">
          <button
            onClick={() => {
              setActiveTab('risk');
              setIsCollapsed(false);
            }}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition relative ${
              activeTab === 'risk'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            title={`Rủi ro (${metrics.totalDebt.toFixed(1)} điểm nợ)`}
          >
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </button>

          <button
            onClick={() => {
              setActiveTab('tasks');
              setIsCollapsed(false);
            }}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition relative ${
              activeTab === 'tasks'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            title="Công việc (Tasks)"
          >
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                {pendingTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('node');
              setIsCollapsed(false);
            }}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition ${
              activeTab === 'node'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            title={selectedNode ? `Chi tiết nút ${selectedNode.id}` : 'Chi tiết nút'}
          >
            <Sliders className="w-4 h-4 text-[#0070f3]" />
          </button>

          <button
            onClick={() => {
              setActiveTab('actions');
              setIsCollapsed(false);
            }}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition ${
              activeTab === 'actions'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            title="Thao tác & Nạp PRD"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </button>
        </div>

        {/* Bottom Expand Arrow */}
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition mt-auto"
          title="Mở rộng thanh bên (Expand)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      ref={sidebarRef}
      style={{ width: `${panelWidth}px` }}
      className="relative flex-shrink-0 bg-white dark:bg-[#000000] border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full overflow-hidden shadow-sm z-20 select-auto transition-[width] duration-75"
    >
      {/* Top Header & Core Metrics */}
      <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
              ▲
            </div>
            <div>
              <h2 className="font-bold text-xs tracking-tight text-neutral-900 dark:text-neutral-100 font-mono">
                Assumption Debt
              </h2>
              <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[170px]">
                {project}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 font-semibold">
              Ước tính
            </span>
            {/* Collapse Button */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
              title="Thu gọn thanh tab bar (Collapse)"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Big numbers - Vercel Metric Cards */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 font-mono">
              Tổng điểm nợ rủi ro
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100 mt-0.5 font-mono">
              {metrics.totalDebt.toFixed(1)}
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5 truncate font-mono">
              {metrics.unverifiedCount} chưa xác thực
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400 font-mono">
              Công việc gặp rủi ro
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-neutral-100 mt-0.5 font-mono">
              {metrics.totalEffortAtRisk.toFixed(1)}{' '}
              <span className="text-xs font-normal text-neutral-500">tuần</span>
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5 truncate font-mono">
              Có thể lãng phí
            </div>
          </div>
        </div>

        {/* Tab Bar Navigation (Vercel segmented pill control) */}
        <div className="flex items-center gap-1 mt-2.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('risk')}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 transition text-[11px] font-medium ${
              activeTab === 'risk'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span>Rủi ro</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 transition text-[11px] font-medium relative ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tasks</span>
            {pendingTasksCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-mono font-bold">
                {pendingTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('node')}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 transition text-[11px] font-medium ${
              activeTab === 'node'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#0070f3]" />
            <span className="truncate max-w-[50px]">{selectedNode ? selectedNode.id : 'Chi tiết'}</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 transition text-[11px] font-medium ${
              activeTab === 'actions'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nạp PRD</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Risk Ranking List */}
      {activeTab === 'risk' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              Thứ tự ưu tiên kiểm chứng
            </h3>
            <span className="text-[10px] text-slate-400">Điểm cao xếp trên</span>
          </div>

          {/* Overdue alert banner if any unverified assumptions are overdue */}
          {metrics.overdueCount > 0 && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500 flex-shrink-0 animate-pulse" />
              <span>
                <strong>{metrics.overdueCount} giả định đã quá hạn</strong> kiểm chứng. Cần ưu tiên xác thực ngay!
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            {metrics.rankedAssumptions.map((item, idx) => {
              const assumption = nodes.find((n) => n.id === item.assumptionId) as AssumptionNode;
              if (!assumption) return null;
              const isSelected = selectedNodeId === item.assumptionId;
              const overdue = currentDate ? isNodeOverdue(assumption, currentDate) : false;

              const statusColor =
                assumption.status === 'validated'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : assumption.status === 'refuted'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

              return (
                <div
                  key={item.assumptionId}
                  onClick={() => selectNode(item.assumptionId)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-1 ring-amber-500 shadow-sm'
                      : overdue
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        #{idx + 1} {item.assumptionId}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[110px]">
                        {assumption.owner || 'Chưa gán'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {overdue && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Quá hạn
                        </span>
                      )}
                      <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 font-mono">
                        <span>{item.riskScore.toFixed(1)}</span>
                        <span className="text-[9px] font-normal text-slate-400">điểm</span>
                      </div>
                    </div>
                  </div>

                  <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-2 leading-relaxed">
                    {assumption.text}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Ảnh hưởng: <strong>{item.downstreamEffortWeeks.toFixed(1)} tuần</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${statusColor}`}>
                      {assumption.status === 'unverified'
                        ? 'Chưa kiểm chứng'
                        : assumption.status === 'validated'
                        ? 'Đã xác thực'
                        : 'Bị bác bỏ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Task Generator (Phase 8) */}
      {activeTab === 'tasks' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Action Toolbar */}
          <div className="space-y-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span>Task Đề Xuất ({tasks.length})</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyMarkdown}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                  title="Sao chép danh sách Task dạng Markdown Checklist"
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                  title="Tải về file CSV để nhập vào Jira / Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => generateTasks(4)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                  title="Tạo lại các task kiểm chứng từ đồ thị"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter pills & Bulk Approve */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    taskFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Tất cả ({tasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter('proposed')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    taskFilter === 'proposed'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Cần duyệt ({pendingTasksCount})
                </button>
                <button
                  onClick={() => setTaskFilter('approved')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    taskFilter === 'approved'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Đã duyệt ({tasks.filter((t) => t.status === 'approved').length})
                </button>
              </div>

              {pendingTasksCount > 0 && (
                <button
                  onClick={approveAllTasks}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Duyệt tất cả
                </button>
              )}
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <CheckSquare className="w-7 h-7 mx-auto opacity-30" />
                <p className="text-xs">Chưa có task nào trong bộ lọc này.</p>
                <button
                  onClick={() => generateTasks(4)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Đề xuất task từ đồ thị
                </button>
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isVerification = t.type === 'verification';
                const prioColor =
                  t.priority === 'high'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : t.priority === 'medium'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border text-xs transition-all space-y-2 ${
                      t.status === 'approved'
                        ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : t.status === 'rejected'
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 opacity-60'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                    }`}
                  >
                    {/* Header: Priority, Type & Target Node */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${prioColor}`}>
                          {t.priority === 'high' ? 'Cao' : t.priority === 'medium' ? 'Vừa' : 'Thấp'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            isVerification
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                              : 'bg-rose-500/20 text-rose-800 dark:text-rose-200'
                          }`}
                        >
                          {isVerification ? 'Kiểm chứng' : 'Xem lại sau Bác bỏ'}
                        </span>
                      </div>

                      <button
                        onClick={() => selectNode(t.targetNodeId)}
                        className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition flex items-center gap-1"
                        title="Chọn và xem nút này trên đồ thị"
                      >
                        <span>{t.targetNodeId}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                      {t.title}
                    </h4>

                    {/* Description */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                      &ldquo;{t.description}&rdquo;
                    </p>

                    {/* Metadata & Actions */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {t.dueDate}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <User className="w-3 h-3 text-slate-400" />
                          {t.suggestedAssignee}
                        </span>
                      </div>

                      {/* Decision buttons: Approve / Reject */}
                      <div className="flex items-center gap-1">
                        {t.status === 'proposed' ? (
                          <>
                            <button
                              onClick={() => rejectTask(t.id)}
                              className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                            >
                              Bỏ qua
                            </button>
                            <button
                              onClick={() => approveTask(t.id)}
                              className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Duyệt</span>
                            </button>
                          </>
                        ) : t.status === 'approved' ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã duyệt</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => approveTask(t.id)}
                            className="text-slate-400 hover:underline"
                          >
                            Khôi phục
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Selected Node Inspector */}
      {activeTab === 'node' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedNode ? (
            <div className="space-y-3">
              {/* Node Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded text-white ${
                      selectedNode.type === 'assumption'
                        ? 'bg-amber-500'
                        : selectedNode.type === 'decision'
                        ? 'bg-blue-600'
                        : 'bg-indigo-600'
                    }`}
                  >
                    {selectedNode.id}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                    {selectedNode.type === 'assumption'
                      ? 'Giả định nền tảng'
                      : selectedNode.type === 'decision'
                      ? 'Quyết định'
                      : 'Hạng mục Công việc'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                    title="Chỉnh sửa nội dung"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteNode}
                    className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 transition"
                    title="Xóa nút này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Edit Form */}
              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nội dung nút:
                    </label>
                    <textarea
                      rows={3}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Phụ trách:</label>
                      <input
                        type="text"
                        value={draftOwner}
                        onChange={(e) => setDraftOwner(e.target.value)}
                        placeholder="VD: Tech Lead"
                        className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>

                    {selectedNode.type === 'assumption' ? (
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Tầm quan trọng:</label>
                        <select
                          value={draftImportance}
                          onChange={(e) => setDraftImportance(Number(e.target.value))}
                          className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
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
                        <label className="block text-[10px] text-slate-500 mb-0.5">Thời gian (tuần):</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={draftEffortWeeks}
                          onChange={(e) => setDraftEffortWeeks(Number(e.target.value))}
                          className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded flex items-center gap-1 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {selectedNode.text}
                  </p>

                  {/* Verbatim quote from source PRD */}
                  {selectedNode.source?.quote && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Trích dẫn từ văn bản gốc:
                      </div>
                      <p className="italic leading-relaxed">&ldquo;{selectedNode.source.quote}&rdquo;</p>
                    </div>
                  )}

                  {/* Why it matters & How to verify */}
                  {selectedNode.type === 'assumption' && (
                    <>
                      {(selectedNode as AssumptionNode).whyItMatters && (
                        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Tác động nếu sai: </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {(selectedNode as AssumptionNode).whyItMatters}
                          </span>
                        </div>
                      )}

                      {(selectedNode as AssumptionNode).howToVerify && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-[11px]">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">Cách kiểm chứng: </span>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            {(selectedNode as AssumptionNode).howToVerify}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Downstream impact summary if assumption */}
              {selectedNode.type === 'assumption' && downstreamResult && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span>Hạng mục phụ thuộc dây chuyền:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">
                      {downstreamResult.nodes.length} mục
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] font-mono leading-relaxed">
                    {downstreamResult.nodes.length > 0
                      ? downstreamResult.nodes.join(' → ')
                      : 'Chưa có quyết định nào phụ thuộc'}
                  </div>
                </div>
              )}

              {/* Actions for Assumption: Validate & Refute */}
              {selectedNode.type === 'assumption' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => validateAssumption(selectedNode.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Xác thực
                    </button>

                    <button
                      onClick={() => setShowRefuteInput(!showRefuteInput)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      <XCircle className="w-4 h-4" /> Bác bỏ
                    </button>
                  </div>

                  {(selectedNode as AssumptionNode).status !== 'unverified' && (
                    <button
                      onClick={() => resetAssumptionStatus(selectedNode.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Đặt lại thành Chưa kiểm chứng
                    </button>
                  )}

                  {/* Refute Evidence Drawer */}
                  {showRefuteInput && (
                    <form
                      onSubmit={handleRefuteSubmit}
                      className="mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2.5 animate-in slide-in-from-top-2"
                    >
                      <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200">
                        Bằng chứng hoặc dữ liệu thực tế bác bỏ:
                      </label>
                      <textarea
                        rows={2}
                        value={refuteReason}
                        onChange={(e) => setRefuteReason(e.target.value)}
                        placeholder="VD: Khảo sát thực tế đối tác Napas bảo trì định kỳ ban đêm dẫn đến nghẽn giao dịch..."
                        className="w-full text-xs p-2 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRefuteInput(false)}
                          className="text-xs px-2.5 py-1 text-slate-600 dark:text-slate-400"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
                        >
                          Kích hoạt Bác bỏ & Cascade
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Phase 9: Evidence & Verification Notes */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                    Bằng chứng kiểm chứng thực tế
                  </span>
                  <button
                    onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {showEvidenceForm ? 'Đóng' : 'Thêm bằng chứng'}
                  </button>
                </div>

                {/* Existing Evidence Display */}
                {(selectedNode.evidenceUrl || selectedNode.evidenceNotes) && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1">
                    {selectedNode.evidenceUrl && (
                      <a
                        href={selectedNode.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 hover:underline break-all"
                      >
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span>{selectedNode.evidenceUrl}</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    )}
                    {selectedNode.evidenceNotes && (
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        &ldquo;{selectedNode.evidenceNotes}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Add Evidence Form */}
                {showEvidenceForm && (
                  <form
                    onSubmit={handleAddEvidence}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs animate-in slide-in-from-top-1"
                  >
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Link hoặc ghi chú bằng chứng:
                      </label>
                      <input
                        type="text"
                        value={evidenceText}
                        onChange={(e) => setEvidenceText(e.target.value)}
                        placeholder="VD: https://jira.example.com/... hoặc kết quả khảo sát 10 khách hàng"
                        className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Ghi chú bổ sung (tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={evidenceNote}
                        onChange={(e) => setEvidenceNote(e.target.value)}
                        placeholder="VD: Kết quả A/B test tuần 2 hoàn tất"
                        className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowEvidenceForm(false)}
                        className="px-2 py-1 text-slate-500 text-[11px]"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px]"
                      >
                        Lưu bằng chứng
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Phase 9: Node History Timeline */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HistoryIcon className="w-3.5 h-3.5 text-slate-500" />
                    Lịch sử & Thay đổi ({selectedNode.history?.length || 0})
                  </span>
                </div>

                {(!selectedNode.history || selectedNode.history.length === 0) ? (
                  <p className="text-[10px] text-slate-400 italic p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    Chưa có lịch sử thay đổi nào được ghi nhận cho nút này.
                  </p>
                ) : (
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800 ml-1">
                    {getFormattedHistory(selectedNode).map((h, i) => {
                      const isRefuted = h.action === 'refuted';
                      const isValidated = h.action === 'validated';
                      const isEvidence = h.action === 'evidence_added';
                      const isCreated = h.action === 'created';

                      const dotColor = isRefuted
                        ? 'bg-rose-500 ring-rose-200'
                        : isValidated
                        ? 'bg-emerald-500 ring-emerald-200'
                        : isEvidence
                        ? 'bg-blue-500 ring-blue-200'
                        : isCreated
                        ? 'bg-purple-500 ring-purple-200'
                        : 'bg-slate-400 ring-slate-200';

                      const actionLabel = isRefuted
                        ? 'Bị bác bỏ'
                        : isValidated
                        ? 'Đã xác thực'
                        : isEvidence
                        ? 'Bổ sung bằng chứng'
                        : isCreated
                        ? 'Tạo nút'
                        : 'Chỉnh sửa';

                      const formattedTime = new Date(h.at).toLocaleString('vi-VN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={i} className="relative pl-3.5 text-[10px] space-y-0.5">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ring-2 ${dotColor}`}
                          />
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {actionLabel}
                            </span>
                            <span className="font-mono text-[9px]">{formattedTime}</span>
                          </div>
                          {h.note && (
                            <p className="text-slate-600 dark:text-slate-400 leading-snug">
                              {h.note}
                            </p>
                          )}
                          {h.evidence && (
                            <p className="text-blue-600 dark:text-blue-400 truncate font-mono text-[9px]">
                              {h.evidence}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Sliders className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">
                Hãy click vào một nút trên đồ thị (Giả định, Quyết định, hoặc Công việc) để xem chi tiết và thực hiện thao tác.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Fast Actions & PRD Management */}
      {activeTab === 'actions' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Dán PRD & Tạo đồ thị bằng AI</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Trích xuất tự động toàn bộ Giả định, Quyết định, Công việc và dựng Cây Phụ thuộc hoàn chỉnh từ văn bản PRD/ADR của bạn.
            </p>
            <button
              onClick={onOpenExtractModal}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dán PRD & Trích xuất AI mới</span>
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Thao tác đồ thị nhanh
            </h4>

            <button
              onClick={onDemoRefuteA1}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Demo: Bác bỏ A1 (Kích hoạt Cascade)</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>Thêm nút thủ công (Node)</span>
            </button>

            <button
              onClick={resetToInitial}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset về Mockup Mẫu ban đầu</span>
            </button>
          </div>
        </div>
      )}

      {/* Resizable Drag Handle on Right Edge (Vercel Style) */}
      <div
        onMouseDown={startResizing}
        onDoubleClick={() => updateWidth(380)}
        title="Kéo sang phải/trái để dãn độ rộng (Click đúp để về 380px)"
        className={`absolute top-0 right-0 w-2 h-full cursor-col-resize z-30 transition-colors group flex items-center justify-center ${
          isResizing ? 'bg-[#0070f3]' : 'hover:bg-[#0070f3]/40'
        }`}
      >
        <div
          className={`w-0.5 h-8 rounded-full transition-colors ${
            isResizing ? 'bg-white' : 'bg-neutral-300 dark:bg-neutral-700 group-hover:bg-[#0070f3]'
          }`}
        />
      </div>
    </aside>
  );
}
