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

