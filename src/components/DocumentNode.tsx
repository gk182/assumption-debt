'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from '@xyflow/react';
import { useGraphStore } from '@/lib/store';

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

  const isZoomedOut = useStore(
    React.useCallback((s: { transform?: [number, number, number] }) => {
      return (s.transform?.[2] ?? 1) < 0.68;
    }, [])
  );

  const assumptionCount = nodes.filter((n) => n.type === 'assumption').length;
  const decisionCount = nodes.filter((n) => n.type === 'decision').length;
  const taskCount = nodes.filter((n) => n.type === 'task').length;

  return (
    <div
      onClick={() => selectNode(null)}
      className={`relative w-[280px] rounded-xl ${
        isZoomedOut ? 'p-2.5 min-h-[90px]' : 'p-3.5'
      } transition-all duration-200 cursor-pointer border border-t-[3px] border-t-neutral-900 dark:border-t-white bg-white dark:bg-[#141417] text-neutral-900 dark:text-neutral-50 ${
        isSelected
          ? 'ring-2 ring-black dark:ring-white dark:border-white shadow-xl dark:shadow-[0_0_25px_rgba(255,255,255,0.15)] -translate-y-0.5'
          : 'border-neutral-200 dark:border-neutral-700/80 shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)] hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-lg'
      }`}
    >
      {/* Right Source Handle to branch cleanly to Assumptions */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-black dark:!bg-white !border-2 !border-white dark:!border-[#141417] !rounded-full shadow-md hover:scale-125 transition-transform"
      />

      {/* Header with Vercel icon and Eyebrow */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
            ▲
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
            Tài liệu Gốc (Root)
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-medium border border-neutral-200 dark:border-neutral-700">
          Source
        </span>
      </div>

      {/* Document / Project Name */}
      <h3 className="font-bold text-xs leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-50 mb-2">
        {docTitle}
      </h3>

      {/* Summary Stat Pills in Vercel Style */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px]">
        <div className="flex flex-col items-center py-1 px-1 rounded-md bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800">
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{assumptionCount}</span>
          <span className="text-[9px] text-neutral-500 dark:text-neutral-400">Giả định</span>
        </div>
        <div className="flex flex-col items-center py-1 px-1 rounded-md bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800">
          <span className="font-mono font-bold text-[#0070f3] dark:text-[#3291ff]">{decisionCount}</span>
          <span className="text-[9px] text-neutral-500 dark:text-neutral-400">Quyết định</span>
        </div>
        <div className="flex flex-col items-center py-1 px-1 rounded-md bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800">
          <span className="font-mono font-bold text-[#7928ca] dark:text-[#c084fc]">{taskCount}</span>
          <span className="text-[9px] text-neutral-500 dark:text-neutral-400">Công việc</span>
        </div>
      </div>
    </div>
  );
});

DocumentNodeComponent.displayName = 'DocumentNodeComponent';
