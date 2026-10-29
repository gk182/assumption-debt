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
      className={`relative w-[260px] rounded-xl p-3 shadow-sm border-2 transition-all duration-200 ${
        needsReview
          ? 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400 animate-pulse'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
      } ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-md'
          : 'hover:shadow-md'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-slate-900 !rounded-full shadow-sm hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-slate-900 !rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {node.id}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <GitBranch className="w-3 h-3" /> Quyết định
          </span>
        </div>

        {needsReview ? (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm">
            <AlertTriangle className="w-3 h-3" /> Cần xem lại
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Clock className="w-3 h-3" /> {node.effortWeeks} tuần
          </span>
        )}
      </div>

      <p className="text-xs font-medium leading-snug line-clamp-2">
        {node.text}
      </p>

      {isCascadeTarget && (
        <div className="mt-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
          ⚠️ Bị ảnh hưởng bởi giả định đã bị bác bỏ
        </div>
      )}
    </div>
  );
});

DecisionNodeComponent.displayName = 'DecisionNodeComponent';

