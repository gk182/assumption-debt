'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TaskNode as TaskNodeType } from '@/lib/types';
import { useGraphStore } from '@/lib/store';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface CustomData {
  node: TaskNodeType;
}

export const TaskNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const node = (data as unknown as CustomData).node;
  const { selectedNodeId, getNeedsReviewIds } = useGraphStore();

  const isSelected = selected || selectedNodeId === id;
  const needsReview = getNeedsReviewIds().has(id);

  return (
    <div
      className={`relative w-[220px] rounded-xl p-2.5 border transition-all duration-200 ${
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
        className="!w-2.5 !h-2.5 !bg-[#7928ca] !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#7928ca] !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#7928ca]/10 text-[#7928ca] border border-[#7928ca]/20">
            {node.id}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            <CheckSquare className="w-2.5 h-2.5" /> Task
          </span>
        </div>

        {needsReview ? (
          <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
            <AlertTriangle className="w-2.5 h-2.5" /> Xem lại
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] font-mono text-neutral-500">
            <Clock className="w-2.5 h-2.5" /> {node.effortWeeks}w
          </span>
        )}
      </div>

      <p className="text-[11px] font-medium leading-snug line-clamp-2 text-neutral-800 dark:text-neutral-200">
        {node.text}
      </p>
    </div>
  );
});

TaskNodeComponent.displayName = 'TaskNodeComponent';
