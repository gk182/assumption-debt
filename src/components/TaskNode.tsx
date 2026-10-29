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
      className={`relative w-[220px] rounded-lg p-2.5 shadow-sm border transition-all duration-200 ${
        needsReview
          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400 animate-pulse'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
      } ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-md'
          : 'hover:shadow'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900"
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            {node.id}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <CheckSquare className="w-2.5 h-2.5" /> Task
          </span>
        </div>

        {needsReview ? (
          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white">
            <AlertTriangle className="w-2.5 h-2.5" /> Xem lại
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
            <Clock className="w-2.5 h-2.5" /> {node.effortWeeks}w
          </span>
        )}
      </div>

      <p className="text-[11px] font-medium leading-snug line-clamp-2">
        {node.text}
      </p>
    </div>
  );
});

TaskNodeComponent.displayName = 'TaskNodeComponent';

