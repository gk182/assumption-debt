'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/lib/store';
import {
  Check,
  X,
  Edit2,
  ArrowRight,
  Quote,
  Inbox,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import Link from 'next/link';

export default function ReviewInboxPage() {
  const router = useRouter();
  const {
    proposedAssumptions,
    proposedDecisions,
    proposedLinks,
    proposedProjectName,
    reviewDecisions,
    nodes,
    setProposedData,
    setReviewDecision,
    commitReviewToGraph
  } = useGraphStore();

  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleLoadMockupSample = async () => {
    setIsLoadingSample(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: 'sample', useProductFlow: false })
      });
      const json = await res.json();
      if (json.data) {
        setProposedData(
          json.data.assumptions,
          json.data.decisions || [],
          json.data.links || [],
          'Instant Merchant Advance (Mockup)'
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImportance, setEditImportance] = useState(3);
  const [activeIndex, setActiveIndex] = useState(0);

  // Keyboard shortcut support: Enter = Confirm, Backspace = Reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (proposedAssumptions.length === 0) return;

      const current = proposedAssumptions[activeIndex];
      if (!current) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        setReviewDecision(current.tempId, 'confirm');
        if (activeIndex < proposedAssumptions.length - 1) {
          setActiveIndex((prev) => prev + 1);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setReviewDecision(current.tempId, 'reject');
        if (activeIndex < proposedAssumptions.length - 1) {
          setActiveIndex((prev) => prev + 1);
        }
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        startEditing(current.tempId, current.text, current.suggestedImportance);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, editingId, proposedAssumptions, setReviewDecision]);

  const startEditing = (id: string, text: string, importance: number) => {
    setEditingId(id);
    setEditText(text);
    setEditImportance(importance);
  };

  const saveEdit = (id: string) => {
    setReviewDecision(id, 'confirm', editText, editImportance);
    setEditingId(null);
  };

  const handleConfirmAll = () => {
    for (const a of proposedAssumptions) {
      setReviewDecision(a.tempId, 'confirm');
    }
  };

  const handleFinalize = (replace: boolean = true) => {
    commitReviewToGraph(replace);
    router.push('/graph');
  };

  if (proposedAssumptions.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-4 shadow-sm">
          <Inbox className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Chưa có giả định nào trong hòm thư duyệt
        </h2>
        <p className="text-xs text-neutral-500 max-w-md mt-1.5 mb-6 leading-relaxed">
          Quay lại trang chủ để dán tài liệu PRD mới, hoặc bấm nút dưới đây để nạp nhanh bộ kết quả mẫu (Mockup) để kiểm thử luồng duyệt.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={handleLoadMockupSample}
            disabled={isLoadingSample}
            className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 shadow-sm transition flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>{isLoadingSample ? 'Đang nạp...' : 'Nạp dữ liệu mẫu (Mockup)'}</span>
          </button>

          {nodes.length > 0 && (
            <Link
              href="/graph"
              className="px-3.5 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-xs transition"
            >
              Mở Đồ thị hiện tại ({nodes.length} nodes)
            </Link>
          )}

          <Link
            href="/"
            className="px-3.5 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-medium text-xs transition"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const confirmedCount = Object.values(reviewDecisions).filter((d) => d.action === 'confirm').length;
  const rejectedCount = Object.values(reviewDecisions).filter((d) => d.action === 'reject').length;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
          >
            ← Quay lại
          </Link>
          <div className="h-4 w-px bg-neutral-200 dark:border-neutral-800" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
              ▲
            </div>
            <div>
              <h1 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                Hòm Thư Duyệt Giả Định (Review Inbox)
              </h1>
              <p className="text-[10px] text-neutral-500 font-mono">
                {proposedProjectName ? `Dự án: ${proposedProjectName}` : 'Con người quyết định · AI chỉ đề xuất'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirmAll}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Xác nhận tất cả</span>
          </button>

          <button
            onClick={() => handleFinalize(false)}
            className="hidden md:flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
            title="Nối thêm các mục đã duyệt vào đồ thị hiện có"
          >
            <span>Nối vào đồ thị cũ</span>
          </button>

          <button
            onClick={() => handleFinalize(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-sm transition"
            title="Tạo mới toàn bộ đồ thị theo tài liệu vừa trích xuất"
          >
            <span>Dựng Đồ Thị Mới ({confirmedCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="font-mono text-[11px]">
            Đang hiển thị <strong>{proposedAssumptions.length}</strong> giả định được AI đề xuất
          </div>
          <div className="flex gap-3 text-xs font-medium">
            <span className="text-emerald-600">Đã duyệt: {confirmedCount}</span>
            <span className="text-rose-600">Đã loại: {rejectedCount}</span>
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-3">
          {proposedAssumptions.map((item, index) => {
            const decision = reviewDecisions[item.tempId];
            const isConfirmed = decision?.action === 'confirm';
            const isRejected = decision?.action === 'reject';
            const isCurrent = index === activeIndex;
            const isEditing = editingId === item.tempId;

            // Find linked decisions
            const linkedDecisionIds = proposedLinks
              .filter((l) => l.to === item.tempId)
              .map((l) => l.from);

            const linkedDecisions = proposedDecisions.filter((d) =>
              linkedDecisionIds.includes(d.tempId)
            );

            return (
              <div
                key={item.tempId}
                onClick={() => setActiveIndex(index)}
                className={`relative rounded-xl p-4 border transition-all ${
                  isRejected
                    ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/40 opacity-40'
                    : isCurrent
                    ? 'border-black dark:border-white bg-white dark:bg-[#0a0a0a] shadow-md ring-1 ring-black dark:ring-white'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                      {item.tempId.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                      {item.category.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Action buttons */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewDecision(item.tempId, 'confirm');
                      }}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition ${
                        isConfirmed
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(item.tempId, decision?.text || item.text, decision?.importance || item.suggestedImportance);
                      }}
                      className="p-1 rounded-md text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                      title="Chỉnh sửa (E)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewDecision(item.tempId, 'reject');
                      }}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition ${
                        isRejected
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Loại bỏ</span>
                    </button>
                  </div>
                </div>

                {/* Edit Form or Text */}
                {isEditing ? (
                  <div className="my-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                    <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Nội dung giả định (phải là mệnh đề có thể sai):
                    </label>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">Tầm quan trọng:</span>
                        <select
                          value={editImportance}
                          onChange={(e) => setEditImportance(Number(e.target.value))}
                          className="text-xs p-1 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100"
                        >
                          <option value={1}>1 - Thấp</option>
                          <option value={2}>2 - Vừa</option>
                          <option value={3}>3 - Trung bình</option>
                          <option value={4}>4 - Cao</option>
                          <option value={5}>5 - Rất nghiêm trọng</option>
                        </select>
                      </div>

                      <button
                        onClick={() => saveEdit(item.tempId)}
                        className="text-xs px-3 py-1 bg-black text-white dark:bg-white dark:text-black font-semibold rounded-md hover:opacity-90"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 my-1.5 leading-snug">
                    {decision?.text || item.text}
                  </p>
                )}

                {/* Verbatim quote from source */}
                {item.source?.quote && (
                  <div className="my-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 text-[11px] italic text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5">
                    <Quote className="w-3 h-3 text-neutral-400 flex-shrink-0 mt-0.5" />
                    <span>&ldquo;{item.source.quote}&rdquo;</span>
                  </div>
                )}

                {/* Linked Decisions & Tasks hint */}
                {linkedDecisions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-900 flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="font-mono text-[10px]">Quyết định phụ thuộc:</span>
                    <div className="flex flex-wrap gap-1">
                      {linkedDecisions.map((d) => (
                        <span
                          key={d.tempId}
                          className="px-1.5 py-0.5 rounded bg-[#0070f3]/10 text-[#0070f3] font-mono text-[10px] border border-[#0070f3]/20"
                        >
                          {d.tempId.toUpperCase()}: {d.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
