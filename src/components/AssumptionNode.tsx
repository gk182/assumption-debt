'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from '@xyflow/react';
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
  const isCompactProp = !!customData.isCompact;
  const { selectedNodeId, cascade } = useGraphStore();

  // Semantic Zoom (LOD): Detect if user is zoomed out (< 0.68)
  const isZoomedOut = useStore(
    React.useCallback((s: { transform?: [number, number, number] }) => {
      return (s.transform?.[2] ?? 1) < 0.68;
    }, [])
  );
  const showCompact = isCompactProp || isZoomedOut;

  const isSelected = selected || selectedNodeId === id;
  const isRefutedInCascade = cascade?.refutedId === id;
  const [currentDate, setCurrentDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const isOverdue = currentDate ? isNodeOverdue(node, currentDate) : false;

  // High-contrast, glowing status tokens
  const statusConfig = {
    unverified: {
      border: isSelected ? 'border-amber-500' : 'border-neutral-200 dark:border-neutral-700/80',
      badgeBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
      icon: <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)] inline-block mr-1.5" />,
      label: 'Chưa kiểm chứng'
    },
    validated: {
      border: isSelected ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-700/80',
      badgeBg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />,
      label: 'Đã xác thực'
    },
    refuted: {
      border: 'border-rose-500 dark:border-rose-500',
      badgeBg: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(238,0,0,0.3)]',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mr-1" />,
      label: 'Bị bác bỏ'
    },
    proposed: {
      border: isSelected ? 'border-blue-500' : 'border-neutral-200 dark:border-neutral-700/80',
      badgeBg: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30',
      icon: <AlertCircle className="w-3.5 h-3.5 text-blue-600 mr-1" />,
      label: 'Đề xuất'
    }
  }[node.status] || {
    border: 'border-neutral-200 dark:border-neutral-700/80',
    badgeBg: 'bg-neutral-100 text-neutral-700',
    icon: null,
    label: node.status
  };

  return (
    <div
      className={`relative w-[290px] rounded-xl ${
        showCompact ? 'p-2.5 min-h-[85px]' : 'p-3.5'
      } bg-white dark:bg-[#141417] text-neutral-900 dark:text-neutral-50 border border-t-[3px] border-t-amber-500 transition-all duration-200 ${
        statusConfig.border
      } ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white shadow-xl dark:shadow-[0_0_25px_rgba(255,255,255,0.15)] -translate-y-0.5'
          : 'shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)] hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-lg'
      } ${isRefutedInCascade ? 'animate-pulse ring-2 ring-rose-500 shadow-[0_0_20px_rgba(238,0,0,0.6)]' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />

      {/* Header with ID and Status Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black shadow-sm">
            {node.id}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold truncate max-w-[85px]">
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
          <div className={`flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.badgeBg}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Main Assumption Claim */}
      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2 mb-2">
        {node.text}
      </p>

      {/* Verbatim Source Quote (Hidden in compact/overview mode for clutter reduction) */}
      {!showCompact && node.source?.quote && (
        <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-300 italic mb-2">
          <Quote className="w-2.5 h-2.5 text-neutral-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">&ldquo;{node.source.quote}&rdquo;</span>
        </div>
      )}

      {/* Importance & Confidence Bar (Hidden in compact/overview mode) */}
      {!showCompact && (
        <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-500" />
            <span>Mức độ: <strong className="text-neutral-800 dark:text-neutral-200">{node.importance}/5</strong></span>
          </div>
          <div>
            Tin cậy: <strong className="text-neutral-800 dark:text-neutral-200">{Math.round((node.confidence ?? 0.5) * 100)}%</strong>
          </div>
        </div>
      )}

      {node.refuteReason && (
        <div className="mt-1.5 text-[10px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-md border border-rose-200 dark:border-rose-900/80">
          <strong>Lý do bác bỏ:</strong> {node.refuteReason}
        </div>
      )}
    </div>
  );
});

AssumptionNodeComponent.displayName = 'AssumptionNodeComponent';
