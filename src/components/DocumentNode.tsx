'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useGraphStore } from '@/lib/store';
import { FileText } from 'lucide-react';

interface CustomData {
  node: {
    id: string;
    type: string;
    text: string;
    docId?: string;
  };
}

export const DocumentNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const { selectedNodeId, selectNode, project, nodes } = useGraphStore();
  const isSelected = selected || selectedNodeId === id;
  const customData = data as unknown as CustomData;
  const docTitle = customData?.node?.text || project || 'Tài liệu Dự án';

  const assumptionCount = nodes.filter((n) => n.type === 'assumption').length;
  const decisionCount = nodes.filter((n) => n.type === 'decision').length;
  const taskCount = nodes.filter((n) => n.type === 'task').length;

  return (
    <div
      onClick={() => selectNode(null)}
      className={`relative w-[280px] rounded-xl p-3.5 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white shadow-md'
          : 'hover:border-neutral-400 dark:hover:border-neutral-600 shadow-sm'
      } bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800`}
    >
      {/* Right Source Handle to branch cleanly to Assumptions */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-black dark:!bg-white !border-2 !border-white dark:!border-black !rounded-full shadow-sm hover:scale-125 transition-transform"
      />

      {/* Header with Vercel icon and Eyebrow */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
            ▲
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-medium">
            Tài liệu Gốc (Root)
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-mono border border-neutral-200 dark:border-neutral-800">
          Source
        </span>
      </div>

      {/* Document / Project Name */}
      <h3 className="font-semibold text-xs leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100 mb-2.5">
        {docTitle}
      </h3>

      {/* Summary Stat Pills in Vercel Style */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-900 text-[10px]">
        <div className="flex flex-col items-center py-1 px-1 rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/80">
          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{assumptionCount}</span>
          <span className="text-[9px] text-neutral-500">Giả định</span>
        </div>
        <div className="flex flex-col items-center py-1 px-1 rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/80">
          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{decisionCount}</span>
          <span className="text-[9px] text-neutral-500">Quyết định</span>
        </div>
        <div className="flex flex-col items-center py-1 px-1 rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/80">
          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{taskCount}</span>
          <span className="text-[9px] text-neutral-500">Công việc</span>
        </div>
      </div>
    </div>
  );
});

DocumentNodeComponent.displayName = 'DocumentNodeComponent';
