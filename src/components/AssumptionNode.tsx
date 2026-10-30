'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AssumptionNode as AssumptionNodeType } from '@/lib/types';
import { useGraphStore } from '@/lib/store';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, Quote, Clock } from 'lucide-react';
import { isNodeOverdue } from '@/lib/history';

interface CustomData {
  node: AssumptionNodeType;
  isCompact?: boolean;
}

export const AssumptionNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const customData = data as unknown as CustomData;
  const node = customData.node;
  const isCompact = !!customData.isCompact;
  const { selectedNodeId, cascade } = useGraphStore();

  const isSelected = selected || selectedNodeId === id;
  const isRefutedInCascade = cascade?.refutedId === id;
  const [currentDate, setCurrentDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const isOverdue = currentDate ? isNodeOverdue(node, currentDate) : false;

  // Vercel-style subtle status tokens
  const statusConfig = {
    unverified: {
      border: isSelected ? 'border-amber-500' : 'border-neutral-200 dark:border-neutral-800',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
      icon: <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1" />,
      label: 'Chưa kiểm chứng'
    },
    validated: {
      border: isSelected ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-800',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1" />,
      label: 'Đã xác thực'
    },
    refuted: {
      border: 'border-rose-500 dark:border-rose-500',
      badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
      icon: <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 mr-1" />,
      label: 'Bị bác bỏ'
    },
    proposed: {
      border: isSelected ? 'border-blue-500' : 'border-neutral-200 dark:border-neutral-800',
      badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
      icon: <AlertCircle className="w-3 h-3 text-blue-600 mr-1" />,
      label: 'Đề xuất'
    }
  }[node.status] || {
    border: 'border-neutral-200 dark:border-neutral-800',
    badgeBg: 'bg-neutral-100 text-neutral-700',
    icon: null,
    label: node.status
  };

  return (
    <div
      className={`relative w-[290px] rounded-xl ${
        isCompact ? 'p-2.5' : 'p-3'
      } bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 border transition-all duration-200 ${
        statusConfig.border
      } ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white shadow-md'
          : 'shadow-sm hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-md'
      } ${isRefutedInCascade ? 'animate-pulse ring-2 ring-rose-500' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      {/* Header with ID and Status Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
            {node.id}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 truncate max-w-[85px]">
            {node.category || 'Giả định'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isOverdue && (
            <span
              className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse"
              title={`Quá hạn kiểm chứng: ${node.verifyBy}`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Quá hạn</span>
            </span>
          )}
          <div className={`flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${statusConfig.badgeBg}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Main Assumption Claim */}
      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2 mb-2">
        {node.text}
      </p>

      {/* Verbatim Source Quote (Hidden in compact mode for space efficiency) */}
      {!isCompact && node.source?.quote && (
        <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-400 italic mb-2">
          <Quote className="w-2.5 h-2.5 text-neutral-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">&ldquo;{node.source.quote}&rdquo;</span>
        </div>
      )}

      {/* Importance & Confidence Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-900 text-[10px] text-neutral-500">
        <div className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-neutral-400" />
          <span>Quan trọng: <strong className="text-neutral-700 dark:text-neutral-300">{node.importance}/5</strong></span>
        </div>
        <div>
          Độ tin cậy: <strong className="text-neutral-700 dark:text-neutral-300">{Math.round((node.confidence ?? 0.5) * 100)}%</strong>
        </div>
      </div>

      {node.refuteReason && (
        <div className="mt-1.5 text-[10px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-md border border-rose-200 dark:border-rose-900/60">
          <strong>Lý do bác bỏ:</strong> {node.refuteReason}
        </div>
      )}
    </div>
  );
});

AssumptionNodeComponent.displayName = 'AssumptionNodeComponent';
