'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useGraphStore } from '@/lib/store';
import { FileText, Sparkles, Layers } from 'lucide-react';

export const DocumentNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const { selectedNodeId, selectNode, project, nodes } = useGraphStore();
  const isSelected = selected || selectedNodeId === id;

  const assumptionCount = nodes.filter((n) => n.type === 'assumption').length;
  const decisionCount = nodes.filter((n) => n.type === 'decision').length;
  const taskCount = nodes.filter((n) => n.type === 'task').length;

  return (
    <div
      onClick={() => selectNode(null)}
      className={`relative w-[280px] rounded-2xl p-4 shadow-md transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-amber-500 shadow-xl scale-[1.02]'
          : 'hover:shadow-lg'
      } bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border-2 border-amber-500/50`}
    >
      {/* Right Source Handle to branch to Assumptions */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-amber-400 !border-2 !border-slate-900 !rounded-full shadow-md hover:scale-125 transition-transform"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Tài liệu Nguồn (PRD)
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
          Gốc đồ thị
        </span>
      </div>

      {/* Document / Project Name */}
      <h3 className="font-bold text-sm leading-snug line-clamp-2 text-white mb-3">
        {project || 'Tài liệu Dự án'}
      </h3>

      {/* Summary Badges */}
      <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-slate-700/60 text-[10px]">
        <div className="flex flex-col items-center p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <span className="font-mono font-bold text-xs">{assumptionCount}</span>
          <span className="text-[9px] opacity-80">Giả định</span>
        </div>
        <div className="flex flex-col items-center p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
          <span className="font-mono font-bold text-xs">{decisionCount}</span>
          <span className="text-[9px] opacity-80">Quyết định</span>
        </div>
        <div className="flex flex-col items-center p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <span className="font-mono font-bold text-xs">{taskCount}</span>
          <span className="text-[9px] opacity-80">Task</span>
        </div>
      </div>
    </div>
  );
});

DocumentNodeComponent.displayName = 'DocumentNodeComponent';

