'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronUp,
  GitBranch,
  Layers,
  Flame,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { LLMProvider, PROVIDER_CONFIGS } from '@/lib/llm/types';
import { SAMPLE_DOCS, extractProjectTitleFromDoc } from '@/lib/sampleDocs';

const SAMPLE_PRD = `# PRD: Chi hộ tức thì và Ứng vốn bán hàng (Instant Merchant Advance v1.0)

## 1. Bối cảnh và Bài toán (Problem Statement)
Hiện nay, nhà bán lẻ (SMB Merchants) trên nền tảng của chúng ta đang phải chờ chu kỳ đối soát doanh thu định kỳ T+3 (sau 3 ngày kể từ khi đơn giao thành công). Điều này khiến nhà bán hàng gặp khó khăn về dòng tiền nhập hàng.
Giải pháp: Ra mắt tính năng Chi hộ tức thì và Ứng trước doanh thu, cho phép người bán rút ngay 85% giá trị đơn hàng ngay sau khi đơn chuyển sang trạng thái giao thành công.

## 2. Mô hình doanh thu và Phí dịch vụ
Áp dụng mức phí dịch vụ cố định 1.2% trên số tiền rút sớm. Mức phí này là hoàn toàn hợp lý với nhà bán lẻ vì họ sẵn sàng trả phí thấp hơn lãi suất vay nóng để xoay vòng vốn nhanh.
Miễn phí 3 giao dịch đầu tiên cho nhà bán mới để tạo thói quen sử dụng.
Sprint 1: Tích hợp API Cổng Napas247 và Xây dựng hệ thống giải ngân tự động 24/7.

## 3. Thẩm định và Quản trị rủi ro (Risk Engine)
Tự động phê duyệt hạn mức ứng tiền dựa trên lịch sử giao dịch 45 ngày gần nhất mà không cần nộp sao kê ngân hàng.
Tỷ lệ gian lận đơn ảo sẽ không đáng kể vì chúng ta chỉ giải ngân cho các đơn hàng được vận chuyển bởi các đơn vị vận chuyển uy tín.
Sprint 2: Xây dựng Risk Scoring Engine tự động tính hạn mức dựa trên lịch sử 45 ngày.

## 4. Hạ tầng Kỹ thuật và Thanh toán
Kết nối trực tiếp vào Cổng Napas247 để tự động chuyển tiền 24/7. Hạ tầng API ngân hàng đối tác chắc chắn sẽ duy trì độ khả dụng 99.9% và không gặp nghẽn lệnh vào ban đêm.
Sprint 3: Thiết kế UI/UX Ví đối tác và Luồng rút tiền 1 chạm trên Merchant Portal.

## 5. Thu hồi nợ và Bảo hiểm
Không triển khai mua bảo hiểm tín dụng Credit Insurance trong giai đoạn v1 để bảo vệ biên lợi nhuận ròng trên 40%.
Tự động khấu trừ tiền nợ gốc từ các đơn hàng phát sinh tiếp theo. Người bán sẽ tiếp tục duy trì gian hàng và phát sinh đơn hàng đều đặn để hoàn trả khoản ứng.
Sprint 4: Module tự động thu hồi nợ gối đầu từ đơn hàng phát sinh tiếp theo.`;

export default function PasteExtractPage() {
  const router = useRouter();
  const [docText, setDocText] = useState(SAMPLE_DOCS[0]?.content || SAMPLE_PRD);
  const [selectedDocId, setSelectedDocId] = useState<string>('bookspa');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flow mode: true = Product (AI), false = Mockup (Offline)
  const [isProductFlow, setIsProductFlow] = useState<boolean>(() => {
    return process.env.NEXT_PUBLIC_ENABLE_PRODUCT_FLOW !== 'false';
  });

  // Multi-LLM provider & model
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>(PROVIDER_CONFIGS.gemini.defaultModel);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showKeyAccordion, setShowKeyAccordion] = useState<boolean>(false);

  // Restore API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('assumption_debt_api_key');
      if (saved) setCustomApiKey(saved);
    }
  }, []);

  const { setProposedData, loadSeedData } = useGraphStore();

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    setSelectedModel(PROVIDER_CONFIGS[provider].defaultModel);
    setErrorMsg(null);
  };

  const handleLoadPreset = (id: string) => {
    setSelectedDocId(id);
    const found = SAMPLE_DOCS.find((d) => d.id === id);
    if (found) {
      setDocText(found.content);
    }
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
      if (customApiKey.trim()) {
        localStorage.setItem('assumption_debt_api_key', customApiKey.trim());
      }

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
        : extractProjectTitleFromDoc(docText);

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Vercel Navigation Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
            ▲
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-xs tracking-tight text-neutral-900 dark:text-neutral-100">
              Assumption Debt
            </h1>
            <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDirectToGraph}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] hover:bg-neutral-100 dark:hover:bg-neutral-900 transition text-neutral-800 dark:text-neutral-200"
          >
            <Database className="w-3.5 h-3.5 text-neutral-500" />
            <span>Mở Đồ Thị Demo</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] py-14 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-start">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ASSUMPTION DEBT ENGINE · 100% VERBATIM QUOTES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 leading-[1.15] max-w-2xl">
            Định lượng & cảnh báo rủi ro từ những giả định chưa kiểm chứng
          </h2>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3 max-w-2xl leading-relaxed">
            Dán tài liệu PRD, tài liệu kiến trúc (ADR), ticket hoặc biên bản họp. Hệ thống bóc tách các giả định nền tảng,
            dựng cây phụ thuộc các quyết định và tính toán số tuần công việc có nguy cơ bị lãng phí khi một giả định bị bác bỏ.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-neutral-100 dark:border-neutral-900 w-full max-w-xl text-left">
            <div>
              <div className="font-mono text-xl font-semibold text-neutral-900 dark:text-neutral-100">0%</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Hallucination (chặn bịa)</div>
            </div>
            <div>
              <div className="font-mono text-xl font-semibold text-neutral-900 dark:text-neutral-100">&lt; 3.0s</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Thời gian trích xuất AI</div>
            </div>
            <div>
              <div className="font-mono text-xl font-semibold text-neutral-900 dark:text-neutral-100">1-Click</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Mô phỏng sụp đổ dây chuyền</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Form */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col">
        {/* Mode Selector (Product AI vs Mockup Offline) */}
        <div className="mb-4 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-neutral-100 font-bold">
              {isProductFlow ? <Sparkles className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100">
                  {isProductFlow ? 'Chế độ AI Thật (Live LLM)' : 'Chế độ Mockup Demo (Offline)'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                  {isProductFlow ? 'Active' : 'Offline'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {isProductFlow
                  ? 'Gửi văn bản tới Gemini / Claude / GPT để phân tích giả định và quan hệ phụ thuộc.'
                  : 'Sử dụng dữ liệu mẫu Merchant Advance có sẵn để trải nghiệm đồ thị 100% không cần API key.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsProductFlow(!isProductFlow);
              setErrorMsg(null);
            }}
            className="self-end sm:self-center text-xs font-medium px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition"
          >
            {isProductFlow ? 'Chuyển sang Mockup' : 'Chuyển sang AI Thật'}
          </button>
        </div>

        {/* AI Configuration Panel */}
        {isProductFlow && (
          <div className="mb-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-900 dark:text-neutral-100">
                <Cpu className="w-4 h-4 text-neutral-500" />
                <span>Cấu hình Mô hình Ngôn ngữ (LLM Provider)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyAccordion(!showKeyAccordion)}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showKeyAccordion ? 'Ẩn ô nhập API Key' : 'Tùy chỉnh API Key'}</span>
                {showKeyAccordion ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Provider Selection */}
              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                  Nhà cung cấp:
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
                        className={`text-xs py-1.5 px-2 rounded-md font-medium transition border text-center ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                            : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                        }`}
                      >
                        {cfg.name.replace('Google ', '').replace('Anthropic ', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                  Mô hình ({currentProviderConfig.name}):
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white font-mono"
                >
                  {currentProviderConfig.availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional API Key Input */}
            {showKeyAccordion && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900">
                <label className="block text-[11px] text-neutral-500 mb-1">
                  Nhập {currentProviderConfig.name} API Key (Tùy chọn - nếu để trống sẽ đọc từ .env.local):
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder={`Nhập API key...`}
                  className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                />
              </div>
            )}
          </div>
        )}

        {/* Input Text Form */}
        <form onSubmit={handleExtract} className="space-y-4">
          <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] shadow-sm focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition">
            {/* Presets header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-900 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                <FileText className="w-3.5 h-3.5 text-neutral-400" /> Văn bản tài liệu đầu vào
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-neutral-400">Nạp nhanh mẫu:</span>
                {SAMPLE_DOCS.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleLoadPreset(doc.id)}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition border ${
                      selectedDocId === doc.id
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                    }`}
                  >
                    {doc.id === 'bookspa' ? 'BookSpa v2.3' : doc.id === 'merchant-advance' ? 'Merchant Advance' : 'Redis ADR'}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Textarea */}
            <textarea
              rows={11}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Dán nội dung PRD, kế hoạch sprint hoặc tài liệu thiết kế vào đây..."
              className="w-full p-4 text-xs bg-transparent border-0 focus:outline-none resize-none font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 leading-relaxed"
              required
            />

            {/* Textarea Footer info */}
            <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-900 rounded-b-xl flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {isProductFlow
                  ? `Đang dùng ${currentProviderConfig.name} (${selectedModel}). Trích dẫn nguyên văn 100%.`
                  : 'Chế độ Mockup: Nạp sẵn dữ liệu demo offline tức thì.'}
              </span>
              <span className="font-mono text-[11px]">{docText.length} ký tự</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-600" />
                Thông báo:
              </div>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-neutral-500 font-mono">
              {isProductFlow
                ? `${currentProviderConfig.name} · ${selectedModel}`
                : 'Offline Mockup Flow'}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-xs bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Đang bóc tách giả định...</span>
                </>
              ) : (
                <>
                  <span>
                    {isProductFlow ? `Trích xuất bằng ${currentProviderConfig.name}` : 'Trích xuất Giả định (Mockup)'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Feature Cards Grid (Vercel Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
            <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-neutral-100 font-bold mb-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              100% Trích dẫn nguyên văn
            </h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
              Bộ lọc chống bịa (`filterHallucinations`) tự động loại bỏ bất kỳ giả định nào không tìm thấy câu văn nguyên bản trong tài liệu gốc.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
            <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-neutral-100 font-bold mb-2.5">
              <GitBranch className="w-4 h-4 text-[#0070f3]" />
            </div>
            <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              Sụp đổ dây chuyền (Cascade)
            </h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
              Tính toán thuật toán duyệt đồ thị (BFS) để xác định tức thì những quyết định và sprint task nào buộc phải xem xét lại khi giả định sai.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
            <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-neutral-100 font-bold mb-2.5">
              <Flame className="w-4 h-4 text-[#f5a623]" />
            </div>
            <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              Xếp hạng Nợ Giả Định
            </h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
              Công thức Risk Score tính toán dựa trên tầm quan trọng và thời gian công việc bị ảnh hưởng để đề xuất task cần đi kiểm chứng trước.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
