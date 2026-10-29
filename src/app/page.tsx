'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/lib/store';
import {
  Sparkles,
  ArrowRight,
  FileText,
  ShieldCheck,
  Database,
  FlaskConical,
  Zap,
  Info
} from 'lucide-react';

const SAMPLE_PRD = `# PRD: Ung dung giao do an v1 (demo document)

## Muc tieu
Ra mat ban v1 trong 10 tuan, tap trung vao doanh thu tu phi giao hang va khach hang trung thanh.

## Phi giao hang
Phi ship co dinh 15k la hop ly voi hau het khach hang. Bo freeship de bao ve bien loi nhuan.
Sprint 3 se toi uu doanh thu tu phi ship.

## Ban do va ETA
Chung ta dung Google Maps nen khong lo ve khoang cach va ETA. Tich hop ETA realtime trong sprint 4.

## Menu
Quan se tu cap nhat menu hang ngay qua form don gian, khong can import menu tu POS.
Man hinh nhac quan cap nhat menu se lam o sprint 5.

## Khach hang trung thanh
Khach hang trung thanh se dat 2 lan moi tuan. Goi thang 99k cho khach hang trung thanh,
billing lam o sprint 6. Doi thu chac se chua kip phan ung trong 6 thang dau.`;

export default function PasteExtractPage() {
  const router = useRouter();
  const [docText, setDocText] = useState(SAMPLE_PRD);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Biến bật tắt flow: false = Mockup (mặc định để test trước), true = Product (gọi AI thật)
  const [isProductFlow, setIsProductFlow] = useState<boolean>(() => {
    return process.env.NEXT_PUBLIC_ENABLE_PRODUCT_FLOW === 'true';
  });

  const { setProposedData, loadSeedData } = useGraphStore();

  const handleLoadSample = () => {
    setDocText(SAMPLE_PRD);
    setErrorMsg(null);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docText.trim() && isProductFlow) {
      setErrorMsg('Vui lòng nhập nội dung văn bản để trích xuất.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: docText,
          useProductFlow: isProductFlow
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Trích xuất thất bại');
      }

      if (!json.data || !json.data.assumptions || json.data.assumptions.length === 0) {
        throw new Error(
          'Không tìm thấy giả định nào hoặc toàn bộ trích dẫn không khớp với văn bản gốc.'
        );
      }

      setProposedData(json.data.assumptions, json.data.decisions || [], json.data.links || []);
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
            <Sparkles className="w-3.5 h-3.5" /> Bước 1: Trích xuất giả định từ tài liệu
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Khám phá những giả định ngầm chưa được kiểm chứng
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Dán tài liệu PRD, tài liệu kiến trúc (ADR), ticket hoặc biên bản họp. Hệ thống sẽ bóc tách các giả định, 
            liên kết với quyết định phụ thuộc, và đảm bảo <strong>100% trích dẫn nguyên văn</strong> từ văn bản gốc.
          </p>
        </div>

        {/* Biến bật/tắt Flow: Mockup vs Product Flow */}
        <div className="mb-5 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                isProductFlow
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
              }`}
            >
              {isProductFlow ? <Sparkles className="w-5 h-5" /> : <FlaskConical className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {isProductFlow ? 'Chế độ: Product Flow (Gọi AI thật)' : 'Chế độ: Mockup Flow (Chạy dữ liệu mẫu để test)'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isProductFlow
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {isProductFlow ? 'Live Anthropic AI' : 'Mockup Offline'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isProductFlow
                  ? 'Gửi văn bản tới mô hình Anthropic Claude (yêu cầu ANTHROPIC_API_KEY trong .env.local).'
                  : 'Sử dụng file mẫu có sẵn (data/demo/extraction-cached.json) giúp test trọn vẹn mọi tính năng 100% offline.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-medium text-slate-500">
              {isProductFlow ? 'Bật AI' : 'Dùng Mockup'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsProductFlow(!isProductFlow);
                setErrorMsg(null);
              }}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isProductFlow ? 'bg-purple-600 focus:ring-purple-500' : 'bg-emerald-600 focus:ring-emerald-500'
              }`}
              title="Nhấn để chuyển đổi giữa Mockup và Product Flow"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  isProductFlow ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleExtract} className="space-y-4">
          <div className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-4 h-4 text-slate-400" /> Văn bản tài liệu đầu vào
              </span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                + Tải lại nội dung PRD mẫu
              </button>
            </div>

            <textarea
              rows={11}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Dán nội dung PRD, kế hoạch sprint hoặc tài liệu thiết kế vào đây..."
              className="w-full p-4 text-sm bg-transparent border-0 focus:outline-none resize-none font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              required
            />

            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {isProductFlow
                  ? 'Bộ lọc chống bịa: Tự động loại bỏ bất kỳ mục nào có quote không nằm trong văn bản'
                  : 'Chế độ Mockup: Nạp 4 giả định và 5 quyết định mẫu kèm liên kết phụ thuộc'}
              </span>
              <span>{docText.length} ký tự</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-600" />
                Thông báo:
              </div>
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              {isProductFlow
                ? 'Đang bật Product Flow. Sẽ gọi Anthropic Claude API.'
                : 'Đang dùng Mockup Flow. Sẽ nạp file mẫu offline ngay lập tức.'}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 ${
                isProductFlow
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Đang trích xuất...</span>
                </>
              ) : (
                <>
                  <span>
                    {isProductFlow ? 'Trích xuất bằng AI' : 'Trích xuất Giả định (Mockup)'}
                  </span>
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
