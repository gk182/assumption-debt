'use client';

import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';

export function DebtPanel() {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    getMetrics,
    refuteAssumption,
    validateAssumption,
    resetAssumptionStatus,
    getDownstreamOfSelected
  } = useGraphStore();

  const [refuteReason, setRefuteReason] = useState('');
  const [showRefuteInput, setShowRefuteInput] = useState(false);

  const metrics = getMetrics();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const downstreamResult = getDownstreamOfSelected();

  const handleRefuteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) return;
    refuteAssumption(selectedNodeId, refuteReason.trim() || 'Dữ liệu thực tế cho thấy giả định không còn đúng');
    setShowRefuteInput(false);
    setRefuteReason('');
  };

  return (
    <aside className="w-full lg:w-96 flex-shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto">
      {/* Top Header & Core Metrics */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
              Assumption Debt
            </h2>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            Ước tính
          </span>
        </div>

        {/* Big numbers */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
              Tổng điểm nợ rủi ro
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {metrics.totalDebt.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {metrics.unverifiedCount} giả định chưa xác thực
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
              Công việc gặp rủi ro
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {metrics.totalEffortAtRisk.toFixed(1)} <span className="text-xs font-normal">tuần</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Có thể lãng phí nếu sai
            </div>
          </div>
        </div>
      </div>

      {/* Selected Node Details & Actions */}
      {selectedNode && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
              {selectedNode.id}
            </span>
            <span className="text-xs font-medium text-slate-500 capitalize">
              {selectedNode.type}
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {selectedNode.text}
          </p>

          {selectedNode.source?.quote && (
            <div className="p-2 mb-3 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] italic text-slate-600 dark:text-slate-300">
              &ldquo;{selectedNode.source.quote}&rdquo;
            </div>
          )}

          {/* Downstream impact summary if assumption */}
          {selectedNode.type === 'assumption' && downstreamResult && (
            <div className="mb-3 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                <span>Mục phụ thuộc trực tiếp & gián tiếp:</span>
                <span className="font-bold">{downstreamResult.nodes.length} mục</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                {downstreamResult.nodes.length > 0
                  ? `Bao gồm: ${downstreamResult.nodes.join(', ')}`
                  : 'Chưa có quyết định nào phụ thuộc'}
              </div>
            </div>
          )}

          {/* Actions for Assumption */}
          {selectedNode.type === 'assumption' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => validateAssumption(selectedNode.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Xác thực
                </button>

                <button
                  onClick={() => setShowRefuteInput(!showRefuteInput)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
                >
                  <XCircle className="w-3.5 h-3.5" /> Bác bỏ
                </button>
              </div>

              {(selectedNode as AssumptionNode).status !== 'unverified' && (
                <button
                  onClick={() => resetAssumptionStatus(selectedNode.id)}
                  className="w-full flex items-center justify-center gap-1 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Đặt lại thành Chưa kiểm chứng
                </button>
              )}

              {/* Refute Evidence Input Drawer */}
              {showRefuteInput && (
                <form onSubmit={handleRefuteSubmit} className="mt-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
                  <label className="block text-[11px] font-medium text-rose-900 dark:text-rose-200">
                    Bằng chứng hoặc dữ liệu bác bỏ:
                  </label>
                  <textarea
                    rows={2}
                    value={refuteReason}
                    onChange={(e) => setRefuteReason(e.target.value)}
                    placeholder="Ví dụ: Khảo sát thực tế 38% khách bỏ giỏ hàng khi thấy ship 15k..."
                    className="w-full text-xs p-2 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                      className="text-xs px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded"
                    >
                      Kích hoạt Bác bỏ & Cascade
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ranked Risk List (What to verify first) */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            Thứ tự ưu tiên kiểm chứng
          </h3>
          <span className="text-[10px] text-slate-400">Điểm cao xếp trên</span>
        </div>

        <div className="space-y-2.5">
          {metrics.rankedAssumptions.map((item, idx) => {
            const assumption = nodes.find((n) => n.id === item.assumptionId) as AssumptionNode;
            if (!assumption) return null;
            const isSelected = selectedNodeId === item.assumptionId;

            return (
              <div
                key={item.assumptionId}
                onClick={() => selectNode(item.assumptionId)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-1 ring-amber-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      #{idx + 1} {item.assumptionId}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                      {assumption.owner || 'Chưa gán'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 font-mono">
                    <span>{item.riskScore.toFixed(1)}</span>
                    <span className="text-[9px] font-normal text-slate-400">điểm</span>
                  </div>
                </div>

                <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-2">
                  {assumption.text}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Ảnh hưởng: <strong>{item.downstreamEffortWeeks.toFixed(1)} tuần</strong>
                  </span>
                  <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {assumption.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

