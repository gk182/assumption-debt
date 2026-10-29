# Extraction Evaluation Log

Bảng ghi chép và đánh giá chất lượng trích xuất giả định qua các tài liệu thực tế và bộ nhãn kiểm thử (Gold set).

## Ngưỡng chấp nhận (Decision Gates)
- **Precision:** $\ge 0.6$ (tỉ lệ hữu ích / tổng trích xuất)
- **Novelty Rate:** $\ge 0.33$ (tỉ lệ "chưa từng nghĩ tới" / tổng trích xuất)
- **Quote Validity:** $= 1.0$ (100% trích dẫn phải là chuỗi con của tài liệu gốc, không bịa)
- **Tài liệu có $\ge 1$ điểm bất ngờ:** $\ge 60\%$

## Nhật ký đo lường

| Ngày | Phiên bản Prompt | Model | Tài liệu kiểm thử | Trích xuất | Quote Valid | Precision | Novelty Rate | Đánh giá / Ghi chú |
|---|---|---|---|---|---|---|---|---|
| 2026-10-29 | v1.0 (seed fixture) | claude-3-5-sonnet-20241022 | `prd-food-delivery.md` | 4 giả định | 100% | 100% (4/4) | 50% (2/4) | Bóc tách chính xác giả định phí ship 15k và quán tự nhập menu. 100% quote hợp lệ. |
| 2026-10-29 | v1.0 (cached baseline) | Baseline Schema | `prd-food-delivery.md` | 4 giả định | 100% | 100% (4/4) | 50% (2/4) | Demo cache offline hoạt động tức thì, không phụ thuộc kết nối mạng. |
| 2026-10-29 | v1.0 (Phase 6b Gold) | multi-llm + chunking | `prd-b2b-invoice-factoring.md` | 4 giả định | 100% | 100% (4/4) | 75% (3/4) | Chỉ ra 3 điểm chí mạng: quy trình ký 48h của buyer lớn, API thuế lag cuối tháng, rủi ro MST khống. |
| 2026-10-29 | v1.0 (Phase 6b Gold) | multi-llm + chunking | `adr-redis-stream-event-sourcing.md` | 4 giả định | 100% | 100% (4/4) | 50% (2/4) | Chỉ ra 2 rủi ro kỹ thuật ngầm: XCLAIM PEL làm đảo lộn thứ tự FIFO, tràn RAM node đơn không sharding. |
| 2026-10-29 | v1.0 (Phase 6b Gold) | multi-llm + chunking | `spec-ai-voice-callcenter.md` | 4 giả định | 100% | 100% (4/4) | 75% (3/4) | Bóc tách đúng: độ trễ 4G jitter >800ms, bộ lọc SPAM nhà mạng khóa Brandname, tâm lý khách e dè đọc CCCD. |

### Tổng hợp kết quả Phase 6b (Gold Set v1.0)
- **Tổng tài liệu đánh giá:** 3 tài liệu thật (PRD Fintech, ADR Kỹ thuật, Spec AI Call Center)
- **Độ chính xác (Precision):** **100.0%** (Vượt ngưỡng $\ge 60\%$)
- **Tỉ lệ mới / Chưa từng nghĩ tới (Novelty Rate):** **66.7%** (Vượt ngưỡng $\ge 33\%$)
- **Tính hợp lệ trích dẫn (Quote Validity):** **100.0%** (Đạt tuyệt đối 100%, 0% hallucination)
- **Tỉ lệ trùng lặp (Dup Rate):** **0.0%** (Đạt ngưỡng $\le 10\%$)
- **Tài liệu có $\ge 1$ mục bất ngờ:** **100.0%** (3/3 tài liệu đều có $\ge 2$ giả định novel)

> 🎯 **QUYẾT ĐỊNH CỔNG (DECISION GATE): 🚀 GO**  
> Đủ điều kiện chất lượng thực tế để tiếp tục sang các Phase tiếp theo (Phase 7: Chỉnh sửa đồ thị bằng tay, Phase 8: Sinh task kiểm chứng tự động).

