'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from '@xyflow/react';
import { TaskNode as TaskNodeType } from '@/lib/types';
import { useGraphStore } from '@/lib/store';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface CustomData {
  node: TaskNodeType;
}

export const TaskNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const node = (data as unknown as CustomData).node;
  const { selectedNodeId, getNeedsReviewIds } = useGraphStore();

  const isZoomedOut = useStore(
    React.useCallback((s: { transform?: [number, number, number] }) => {
      return (s.transform?.[2] ?? 1) < 0.68;
    }, [])
  );

  const isSelected = selected || selectedNodeId === id;
  const needsReview = getNeedsReviewIds().has(id);

  return (
    <div
      className={`relative w-[220px] rounded-xl ${
        isZoomedOut ? 'p-2 min-h-[65px]' : 'p-3'
      } border border-t-[3px] transition-all duration-200 ${
        needsReview
          ? 'border-rose-500 border-t-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-neutral-900 dark:text-neutral-50 ring-2 ring-rose-500 shadow-[0_0_20px_rgba(238,0,0,0.5)] animate-pulse'
          : 'border-neutral-200 dark:border-neutral-700/80 border-t-[#7928ca] bg-white dark:bg-[#141417] text-neutral-900 dark:text-neutral-50 shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)] hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-lg'
      } ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white dark:border-white shadow-xl dark:shadow-[0_0_25px_rgba(255,255,255,0.15)] -translate-y-0.5'
          : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#7928ca] !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#7928ca] !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#7928ca]/15 text-[#7928ca] dark:text-[#c084fc] border border-[#7928ca]/30 shadow-sm">
            {node.id}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
            <CheckSquare className="w-2.5 h-2.5 text-[#7928ca]" /> Task
          </span>
        </div>

        {needsReview ? (
          <span className="flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5" /> Xem lại
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            <Clock className="w-2.5 h-2.5 text-neutral-400" /> {node.effortWeeks}w
          </span>
        )}
      </div>

      <p className="text-xs font-semibold leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100">
        {node.text}
      </p>
    </div>
  );
});

TaskNodeComponent.displayName = 'TaskNodeComponent';
