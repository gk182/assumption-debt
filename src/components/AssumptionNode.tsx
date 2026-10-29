'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AssumptionNode as AssumptionNodeType } from '@/lib/types';
import { useGraphStore } from '@/lib/store';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, Quote } from 'lucide-react';

interface CustomData {
  node: AssumptionNodeType;
}

export const AssumptionNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const node = (data as unknown as CustomData).node;
  const { selectedNodeId, cascade } = useGraphStore();

  const isSelected = selected || selectedNodeId === id;
  const isRefutedInCascade = cascade?.refutedId === id;

  const statusConfig = {
    unverified: {
      border: 'border-amber-400 dark:border-amber-500',
      bg: 'bg-amber-50/90 dark:bg-amber-950/30',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
      label: 'Chưa kiểm chứng'
    },
    validated: {
      border: 'border-emerald-500 dark:border-emerald-400',
      bg: 'bg-emerald-50/90 dark:bg-emerald-950/30',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      label: 'Đã xác thực'
    },
    refuted: {
      border: 'border-rose-500 dark:border-rose-400',
      bg: 'bg-rose-50/90 dark:bg-rose-950/40',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
      label: 'Bị bác bỏ'
    },
    proposed: {
      border: 'border-sky-400 dark:border-sky-500',
      bg: 'bg-sky-50/90 dark:bg-sky-950/30',
      badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-sky-600" />,
      label: 'Đề xuất'
    }
  }[node.status] || {
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-800',
    icon: null,
    label: node.status
  };

  return (
    <div
      className={`relative w-[300px] rounded-xl p-3.5 shadow-sm border-2 border-dashed transition-all duration-200 ${
        statusConfig.border
      } ${statusConfig.bg} ${
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 shadow-md scale-[1.02]'
          : 'hover:shadow-md'
      } ${isRefutedInCascade ? 'animate-pulse ring-2 ring-rose-500' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-slate-900 !rounded-full shadow-sm hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-slate-900 !rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      {/* Header with ID and Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            {node.id}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {node.category || 'Giả định'}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.badge}`}>
          {statusConfig.icon}
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Main Assumption Claim */}
      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-snug line-clamp-3 mb-2.5">
        {node.text}
      </p>

      {/* Verbatim Source Quote */}
      {node.source?.quote && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 italic mb-2">
          <Quote className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">&ldquo;{node.source.quote}&rdquo;</span>
        </div>
      )}

      {/* Importance & Confidence Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-slate-400" />
          <span>Tầm quan trọng: <strong>{node.importance}/5</strong></span>
        </div>
        <div>
          Độ tin cậy: <strong>{Math.round((node.confidence ?? 0.5) * 100)}%</strong>
        </div>
      </div>

      {node.refuteReason && (
        <div className="mt-2 text-[10px] text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/60 p-1.5 rounded border border-rose-300 dark:border-rose-800">
          <strong>Lý do bác bỏ:</strong> {node.refuteReason}
        </div>
      )}
    </div>
  );
});

AssumptionNodeComponent.displayName = 'AssumptionNodeComponent';

