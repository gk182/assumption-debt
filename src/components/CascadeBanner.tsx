'use client';

import React from 'react';
import { useGraphStore } from '@/lib/store';
import { AlertOctagon, X, CheckCheck, ArrowRight } from 'lucide-react';

export function CascadeBanner() {
  const { cascade, dismissCascade, nodes, selectNode } = useGraphStore();

  if (!cascade || !cascade.isActive) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[92%] bg-rose-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-rose-400 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
            <AlertOctagon className="w-6 h-6 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white">
                Hiệu ứng sụp đổ dây chuyền (Cascade Triggered)
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/30 font-bold">
                {cascade.refutedId}
              </span>
            </div>

            <p className="text-xs text-rose-100 mt-1 leading-relaxed">
              Giả định <strong>{cascade.refutedId}</strong> vừa bị bác bỏ. Có{' '}
              <strong className="underline decoration-white/60">
                {cascade.affectedNodeIds.length} quyết định & nhiệm vụ
              </strong>{' '}
              phía sau cần phải xem xét lại ngay, liên quan tới{' '}
              <strong className="text-white bg-black/20 px-1.5 py-0.5 rounded">
                {cascade.totalWeeksAtRisk.toFixed(1)} tuần
              </strong>{' '}
              công sức phát triển.
            </p>

            {/* Affected items pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {cascade.affectedNodeIds.map((id) => {
                const node = nodes.find((n) => n.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => selectNode(id)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/30 text-white transition"
                    title={node?.text}
                  >
                    <span>{id}</span>
                    <span className="text-[9px] opacity-80 truncate max-w-[120px]">
                      {node?.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={dismissCascade}
          className="p-1 rounded-lg hover:bg-white/20 text-rose-200 hover:text-white transition"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-rose-500/60">
        <button
          onClick={dismissCascade}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 transition shadow"
        >
          <CheckCheck className="w-4 h-4" /> Đã nắm thông tin
        </button>
      </div>
    </div>
  );
}
