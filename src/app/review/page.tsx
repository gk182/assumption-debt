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
  ShieldAlert,
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
    reviewDecisions,
    setReviewDecision,
    commitReviewToGraph
  } = useGraphStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImportance, setEditImportance] = useState(3);
  const [activeIndex, setActiveIndex] = useState(0);

  // If no proposed assumptions, redirect to page.tsx or show empty state
  useEffect(() => {
    if (proposedAssumptions.length === 0) {
      // Nothing to review
    }
  }, [proposedAssumptions]);

  // Keyboard shortcut support: Enter = Confirm, Backspace = Reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return; // Don't trigger shortcuts while typing in input
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

  const handleFinalize = () => {
    commitReviewToGraph();
    router.push('/graph');
  };

  if (proposedAssumptions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Inbox className="w-12 h-12 text-slate-400 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Chưa có giả định nào trong hòm thư duyệt
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          Hãy dán tài liệu tại màn hình chính để hệ thống tự động trích xuất các giả định ngầm.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
        >
          Quay lại màn Dán tài liệu
        </Link>
      </div>
    );
  }

  const confirmedCount = Object.values(reviewDecisions).filter((d) => d.action === 'confirm').length;
  const rejectedCount = Object.values(reviewDecisions).filter((d) => d.action === 'reject').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-sm tracking-tight hover:text-amber-500 transition">
            ← Quay lại
          </Link>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div>
            <h1 className="font-bold text-sm tracking-tight">
              Hòm thư duyệt giả định (Review Inbox)
            </h1>
            <p className="text-[11px] text-slate-500">
              Con người quyết định: Xác nhận (Enter), Bác bỏ (Backspace), Sửa (E)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirmAll}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Xác nhận tất cả</span>
          </button>

          <button
            onClick={handleFinalize}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow transition"
          >
            <span>Đưa vào Đồ thị ({confirmedCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            Đang hiển thị <strong>{proposedAssumptions.length}</strong> giả định được AI đề xuất
          </div>
          <div className="flex gap-3">
            <span className="text-emerald-600 font-medium">Đã duyệt: {confirmedCount}</span>
            <span className="text-rose-600 font-medium">Đã loại: {rejectedCount}</span>
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-3.5">
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
                className={`relative rounded-2xl p-4 border-2 transition-all ${
                  isRejected
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-50'
                    : isCurrent
                    ? 'border-amber-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.tempId.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-slate-500 capitalize">
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
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                        isConfirmed
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700'
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
                      className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
                      title="Chỉnh sửa (E)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewDecision(item.tempId, 'reject');
                      }}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                        isRejected
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Loại bỏ</span>
                    </button>
                  </div>
                </div>

                {/* Edit Form or Text */}
                {isEditing ? (
                  <div className="my-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Nội dung giả định (phải là mệnh đề có thể sai):
                    </label>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span>Tầm quan trọng:</span>
                        <select
                          value={editImportance}
                          onChange={(e) => setEditImportance(Number(e.target.value))}
                          className="text-xs p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
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
                        className="text-xs px-3 py-1 bg-amber-500 font-bold text-slate-950 rounded-lg hover:bg-amber-600"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 my-1.5 leading-snug">
                    {decision?.text || item.text}
                  </p>
                )}

                {/* Verbatim quote from source */}
                {item.source?.quote && (
                  <div className="my-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs italic text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>&ldquo;{item.source.quote}&rdquo;</span>
                  </div>
                )}

                {/* Linked Decisions & Tasks hint */}
                {linkedDecisions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-[11px]">Quyết định phụ thuộc vào giả định này:</span>
                    <div className="flex flex-wrap gap-1">
                      {linkedDecisions.map((d) => (
                        <span
                          key={d.tempId}
                          className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px]"
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
