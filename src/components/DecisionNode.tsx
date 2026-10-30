'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { DecisionNode as DecisionNodeType } from '@/lib/types';
import { useGraphStore } from '@/lib/store';
import { GitBranch, Clock, AlertTriangle } from 'lucide-react';

interface CustomData {
  node: DecisionNodeType;
}

export const DecisionNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const node = (data as unknown as CustomData).node;
  const { selectedNodeId, getNeedsReviewIds, cascade } = useGraphStore();

  const isSelected = selected || selectedNodeId === id;
  const needsReview = getNeedsReviewIds().has(id);
  const isCascadeTarget = cascade?.affectedNodeIds.includes(id);

  return (
    <div
      className={`relative w-[260px] rounded-xl p-3 border transition-all duration-200 ${
        needsReview
          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-neutral-900 dark:text-neutral-100 ring-2 ring-rose-500 animate-pulse'
          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100'
      } ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white shadow-md'
          : 'shadow-sm hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-md'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#0070f3] !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#0070f3] !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/20">
            {node.id}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            <GitBranch className="w-3 h-3" /> Quyết định
          </span>
        </div>

        {needsReview ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
            <AlertTriangle className="w-2.5 h-2.5" /> Cần xem lại
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
            <Clock className="w-2.5 h-2.5" /> {node.effortWeeks} tuần
          </span>
        )}
      </div>

      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">
        {node.text}
      </p>

      {isCascadeTarget && (
        <div className="mt-2 text-[10px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
          <span>⚠️ Bị ảnh hưởng bởi giả định đã bị bác bỏ</span>
        </div>
      )}
    </div>
  );
});

DecisionNodeComponent.displayName = 'DecisionNodeComponent';
