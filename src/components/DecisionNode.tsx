'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from '@xyflow/react';
import { DecisionNode as DecisionNodeType } from '@/lib/types';
import { useGraphStore } from '@/lib/store';
import { GitBranch, Clock, AlertTriangle } from 'lucide-react';

interface CustomData {
  node: DecisionNodeType;
}

export const DecisionNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const node = (data as unknown as CustomData).node;
  const { selectedNodeId, getNeedsReviewIds, cascade } = useGraphStore();

  const isZoomedOut = useStore(
    React.useCallback((s: { transform?: [number, number, number] }) => {
      return (s.transform?.[2] ?? 1) < 0.68;
    }, [])
  );

  const isSelected = selected || selectedNodeId === id;
  const needsReview = getNeedsReviewIds().has(id);
  const isCascadeTarget = cascade?.affectedNodeIds.includes(id);

  return (
    <div
      className={`relative w-[260px] rounded-xl ${
        isZoomedOut ? 'p-2.5 min-h-[75px]' : 'p-3.5'
      } border border-t-[3px] transition-all duration-200 ${
        needsReview
          ? 'border-rose-500 border-t-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-neutral-900 dark:text-neutral-50 ring-2 ring-rose-500 shadow-[0_0_20px_rgba(238,0,0,0.5)] animate-pulse'
          : 'border-neutral-200 dark:border-neutral-700/80 border-t-[#0070f3] bg-white dark:bg-[#141417] text-neutral-900 dark:text-neutral-50 shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)] hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-lg'
      } ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white dark:border-white shadow-xl dark:shadow-[0_0_25px_rgba(255,255,255,0.15)] -translate-y-0.5'
          : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#0070f3] !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#0070f3] !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[#0070f3]/15 text-[#0070f3] dark:text-[#3291ff] border border-[#0070f3]/30 shadow-sm">
            {node.id}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
            <GitBranch className="w-3 h-3 text-[#0070f3]" /> Quyết định
          </span>
        </div>

        {needsReview ? (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5" /> Cần xem lại
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            <Clock className="w-2.5 h-2.5 text-neutral-400" /> {node.effortWeeks} tuần
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">
        {node.text}
      </p>

      {isCascadeTarget && !isZoomedOut && (
        <div className="mt-2 text-[10px] font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1 bg-rose-500/15 px-2 py-1 rounded border border-rose-500/30">
          <span>⚠️ Bị ảnh hưởng bởi giả định đã bị bác bỏ</span>
        </div>
      )}
    </div>
  );
});

DecisionNodeComponent.displayName = 'DecisionNodeComponent';
