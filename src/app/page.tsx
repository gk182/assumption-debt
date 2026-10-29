'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/lib/store';
import { Sparkles, ArrowRight, FileText, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import Link from 'next/link';

const SAMPLE_PRD = `# PRD: Ứng dụng giao đồ ăn v1 (Demo Document)

## Mục tiêu
Ra mắt bản v1 trong 10 tuần, tập trung vào doanh thu từ phí giao hàng và khách hàng trung thành.

## Phí giao hàng
Phí ship cố định 15k là hợp lý với hầu hết khách hàng. Bỏ freeship để bảo vệ biên lợi nhuận.
Sprint 3 sẽ tối ưu doanh thu từ phí ship.

## Bản đồ và ETA
Chúng ta dùng Google Maps nên không lo về khoảng cách và ETA. Tích hợp ETA realtime trong sprint 4.

## Menu
Quán sẽ tự cập nhật menu hàng ngày qua form đơn giản, không cần import menu từ POS.
Màn hình nhắc quán cập nhật menu sẽ làm ở sprint 5.

## Khách hàng trung thành
Khách hàng trung thành sẽ đặt 2 lần mỗi tuần. Gói tháng 99k cho khách hàng trung thành,
billing làm ở sprint 6. Đối thủ chắc sẽ chưa kịp phản ứng trong 6 tháng đầu.`;

export default function PasteExtractPage() {
  const router = useRouter();
  const [docText, setDocText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { setProposedData, loadSeedData } = useGraphStore();

  const handleLoadSample = () => {
    setDocText(SAMPLE_PRD);
    setErrorMsg(null);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docText.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: docText })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Trích xuất thất bại');
      }

      setProposedData(json.data.assumptions, json.data.decisions, json.data.links);
      router.push('/review');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectToGraph = () => {
    loadSeedData();
    router.push('/graph');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base shadow-sm">
            Δ
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-tight">
              Assumption Debt
            </h1>
            <p className="text-[11px] text-slate-500">
              Quản lý nợ giả định & cảnh báo rủi ro sản phẩm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDirectToGraph}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Database className="w-3.5 h-3.5 text-amber-500" />
            <span>Mở ngay Đồ thị Demo</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Bước 1: Dán tài liệu dự án để bóc tách giả định
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Khám phá những giả định ngầm chưa được kiểm chứng
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Dán tài liệu PRD, tài liệu kiến trúc (ADR), ticket hoặc biên bản họp. Hệ thống sẽ bóc tách các giả định, 
            liên kết với quyết định phụ thuộc, và đảm bảo <strong>100% trích dẫn nguyên văn</strong> từ văn bản gốc.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleExtract} className="space-y-4">
          <div className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-4 h-4 text-slate-400" /> Văn bản tài liệu
              </span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                + Tải PRD Giao đồ ăn mẫu (Demo)
              </button>
            </div>

            <textarea
              rows={12}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Dán nội dung PRD, kế hoạch sprint hoặc tài liệu thiết kế vào đây..."
              className="w-full p-4 text-sm bg-transparent border-0 focus:outline-none resize-none font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              required
            />

            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Bộ lọc chống bịa: Tự động loại bỏ bất kỳ mục nào thiếu trích dẫn
              </span>
              <span>{docText.length} ký tự</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
              <strong>Lỗi:</strong> {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Chế độ Demo: Tự động dùng trích xuất cache offline khi không có API key.
            </div>

            <button
              type="submit"
              disabled={isLoading || !docText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md disabled:opacity-50 transition"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Đang trích xuất...</span>
                </>
              ) : (
                <>
                  <span>Trích xuất giả định</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
