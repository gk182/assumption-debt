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
  Info,
  Cpu,
  Key,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LLMProvider, PROVIDER_CONFIGS } from '@/lib/llm/types';

const SAMPLE_PRD = `# PRD: Chi ho tuc thi va Ung von ban hang (Instant Merchant Advance v1.0)

## 1. Boi canh va Bai toan (Problem Statement)
Hien nay, nha ban le (SMB Merchants) tren nen tang cua chung ta dang phai cho chu ky doi soat doanh thu dinh ky T+3 (sau 3 ngay ke tu khi don giao thanh cong). Dieu nay khien nha ban hang gap kho khan ve dong tien nhap hang.
Giai phap: Ra mat tinh nang Chi ho tuc thi va Ung truoc doanh thu, cho phep nguoi ban rut ngay 85% gia tri don hang ngay sau khi don chuyen sang trang thai giao thanh cong.

## 2. Mo hinh doanh thu va Phi dich vu
Ap dung muc phi dich vu co dinh 1.2% tren so tien rut som. Muc phi nay la hoan toan hop ly voi nha ban le vi ho san sang tra phi thap hon lai suat vay nong de xoay vong von nhanh.
Mien phi 3 giao dich dau tien cho nha ban moi de tao thoi quen su dung.
Sprint 1: Tich hop API Cong Napas247 va Xay dung he thong giai ngan tu dong 24/7.

## 3. Tham dinh va Quan tri rui ro (Risk Engine)
Tu dong phe duyet han muc ung tien dua tren lich su giao dich 45 ngay gan nhat ma khong can nop sao ke ngan hang.
Ty le gian lan don ao se khong dang ke vi chung ta chi giai ngan cho cac don hang duoc van chuyen boi cac don vi van chuyen uy tin.
Sprint 2: Xay dung Risk Scoring Engine tu dong tinh han muc dua tren lich su 45 ngay.

## 4. Ha tang Ky thuat va Thanh toan
Ket noi truc tiep vao Cong Napas247 de tu dong chuyen tien 24/7. Ha tang API ngan hang doi tac chac chan se duy tri do kha dung 99.9% va khong gap nghen lenh vao ban dem.
Sprint 3: Thiet ke UI UX Vi doi tac va Luong rut tien 1 cham tren Merchant Portal.

## 5. Thu hoi no va Bao hiem
Khong trien khai mua bao hiem tin dung Credit Insurance trong giai doan v1 de bao ve bien loi nhuan rong tren 40%.
Tu dong khau tru tien no goc tu cac don hang phat sinh tiep theo. Nguoi ban se tiep tuc duy tri gian hang va phat sinh don hang deu dan de hoan tra khoan ung.
Sprint 4: Module tu dong thu hoi no goi dau tu don hang phat sinh tiep theo.`;

function extractProjectTitle(docText: string): string {
  const lines = docText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.replace(/^#\s*(PRD:\s*)?/, '').trim();
    }
    if (trimmed.startsWith('PRD:') || trimmed.startsWith('Dự án:') || trimmed.startsWith('Project:')) {
      return trimmed.replace(/^(PRD:|Dự án:|Project:)\s*/, '').trim();
    }
  }
  return 'Dự án trích xuất mới';
}

export default function PasteExtractPage() {
  const router = useRouter();
  const [docText, setDocText] = useState(SAMPLE_PRD);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Biến bật tắt flow: false = Mockup (mặc định để test trước), true = Product (gọi AI thật)
  const [isProductFlow, setIsProductFlow] = useState<boolean>(() => {
    return process.env.NEXT_PUBLIC_ENABLE_PRODUCT_FLOW === 'true';
  });

  // Chọn Provider & Model
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>(PROVIDER_CONFIGS.gemini.defaultModel);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showKeyAccordion, setShowKeyAccordion] = useState<boolean>(false);

  const { setProposedData, loadSeedData } = useGraphStore();

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    setSelectedModel(PROVIDER_CONFIGS[provider].defaultModel);
    setErrorMsg(null);
  };

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
          useProductFlow: isProductFlow,
          provider: selectedProvider,
          model: selectedModel,
          apiKey: customApiKey.trim() || undefined
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

      const projectTitle = !isProductFlow
        ? 'Instant Merchant Advance (Mockup)'
        : extractProjectTitle(docText);

      setProposedData(
        json.data.assumptions,
        json.data.decisions || [],
        json.data.links || [],
        projectTitle
      );
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

  const currentProviderConfig = PROVIDER_CONFIGS[selectedProvider];

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
        <div className="mb-4 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  {isProductFlow ? 'Live Multi-LLM' : 'Mockup Offline'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isProductFlow
                  ? 'Gửi văn bản tới mô hình AI (hỗ trợ chọn Gemini, Claude, OpenAI) để trích xuất thời gian thực.'
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

        {/* Khung cấu hình Multi-Model khi bật Product Flow */}
        {isProductFlow && (
          <div className="mb-4 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200">
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Tùy chọn mô hình AI (Multi-Model Support)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyAccordion(!showKeyAccordion)}
                className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1 hover:underline"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showKeyAccordion ? 'Ẩn ô nhập API Key' : 'Tùy chỉnh API Key riêng'}</span>
                {showKeyAccordion ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chọn Nhà cung cấp */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nhà cung cấp AI:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['gemini', 'anthropic', 'openai'] as LLMProvider[]).map((p) => {
                    const cfg = PROVIDER_CONFIGS[p];
                    const isSelected = selectedProvider === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleProviderChange(p)}
                        className={`text-xs py-1.5 px-2 rounded-lg font-semibold transition border text-center ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        {cfg.name.replace('Google ', '').replace('Anthropic ', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn Model cụ thể */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô hình ({currentProviderConfig.name}):
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                >
                  {currentProviderConfig.availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ô nhập API Key tùy chọn nếu không muốn sửa .env.local */}
            {showKeyAccordion && (
              <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nhập API Key {currentProviderConfig.name} (Tùy chọn - nếu bỏ trống sẽ đọc từ .env.local):
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder={`Ví dụ: ${currentProviderConfig.envKeyName}=...`}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            )}
          </div>
        )}

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
                  ? `Đang dùng ${currentProviderConfig.name} (${selectedModel}). Quote 100% nguyên văn.`
                  : 'Chế độ Mockup: Nạp kết quả giả định mẫu hoàn chỉnh để test không cần API key.'}
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
                ? `Mô hình: ${currentProviderConfig.name} (${selectedModel})`
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
                  <span>Đang trích xuất với {selectedProvider}...</span>
                </>
              ) : (
                <>
                  <span>
                    {isProductFlow ? `Trích xuất bằng ${currentProviderConfig.name}` : 'Trích xuất Giả định (Mockup)'}
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
