export interface SampleDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: 'bookspa',
    title: 'PRD: Nhắc lịch Zalo và đặt cọc (BookSpa v2.3)',
    category: 'Product PRD (B2C/SaaS)',
    content: `# PRD: Nhắc lịch Zalo và đặt cọc (BookSpa v2.3)

**Tác giả:** Minh (PM) · **Trạng thái:** Draft v0.3 · **Cập nhật:** 12/10/2026 **Reviewer:** Hùng (Tech lead), Lan (Design), Thảo (Customer Success)

## 1. Bối cảnh
BookSpa là app đặt lịch cho spa, salon tóc và tiệm nail. Hiện có khoảng 1.200 cơ sở đang dùng, trung bình 14.000 lịch hẹn mỗi tuần.
Theo dashboard quý 3, tỉ lệ khách đặt lịch nhưng không đến (no-show) trung bình là 18%. Cơ sở nhỏ (1-3 nhân viên) cao hơn, khoảng 24%. Mỗi lịch bị bỏ trống làm mất trung bình 280.000đ doanh thu và một khung giờ không bán lại được.
Trong 9 cuộc phỏng vấn chủ tiệm tháng 9, có 7 người nói no-show là vấn đề đau nhất. Hai người nói họ đã tự nhắn Zalo cho khách từng lịch một và mất khoảng 30 phút mỗi ngày.
Đối thủ chính chưa có tính năng đặt cọc. Dự kiến họ cần ít nhất 6 tháng để làm, nên đây là cơ hội để BookSpa đi trước trước mùa Tết, khi lượng lịch tăng gần gấp đôi.

## 2. Mục tiêu
| # | Mục tiêu | Chỉ số | Mốc |
| --- | --- | --- | --- |
| G1 | Giảm no-show | Từ 18% xuống 10% ở các cơ sở bật tính năng | 3 tháng sau ra mắt |
| G2 | Cơ sở dùng tính năng | ≥ 30% cơ sở bật đặt cọc | 2 tháng sau ra mắt |
| G3 | Không làm giảm đặt lịch | Số lịch đặt giảm không quá 5% | Theo dõi hằng tuần |
| G4 | Doanh thu BookSpa | Phí xử lý đặt cọc đóng góp 8% doanh thu | Q1/2027 |

## 3. Ngoài phạm vi (v2.3)
- Tự động hoàn cọc. Chủ tiệm hoàn thủ công trong v1.
- Thanh toán bằng thẻ quốc tế.
- Bản web cho chủ tiệm. Chỉ làm trên mobile app hiện có.
- Chương trình khách hàng thân thiết.

## 4. Người dùng
- **Chủ tiệm:** quyết định bật đặt cọc, đặt mức cọc. Chủ yếu dùng điện thoại, ít khi mở máy tính.
- **Lễ tân / nhân viên:** xem lịch, xác nhận cọc đã nhận.
- **Khách đặt lịch:** nhận nhắc lịch, thanh toán cọc nếu tiệm yêu cầu.

## 5. Giải pháp
### 5.1 Nhắc lịch qua Zalo
Gửi tin ZNS (Zalo Notification Service) 24 giờ và 2 giờ trước giờ hẹn, kèm nút "Xác nhận" và "Hủy lịch". Khách bấm hủy thì khung giờ được mở lại ngay trên app của tiệm.
Nếu khách không có Zalo hoặc không nhận được tin thì gửi SMS. Chi phí ZNS ước tính khoảng 400đ mỗi tin theo báo giá tháng 8, SMS khoảng 600đ. BookSpa chịu phí này trong gói hiện tại, không tính thêm cho chủ tiệm.
Template tin nhắn chỉ cần Zalo duyệt một lần, sau đó dùng cho toàn bộ cơ sở.

### 5.2 Đặt cọc tùy chọn
Chủ tiệm bật đặt cọc theo từng dịch vụ, chọn mức cọc cố định (50.000đ - 500.000đ) hoặc phần trăm (20% - 50%). Mặc định đề xuất là 30%.
Khách thanh toán cọc bằng mã VietQR ngay sau khi đặt lịch. Lịch giữ chỗ 15 phút, quá hạn chưa thanh toán thì tự hủy.
Hoàn cọc: khách hủy trước 12 giờ thì được hoàn toàn bộ. Hủy sau 12 giờ hoặc không đến thì tiệm giữ cọc.

### 5.3 Đối soát thanh toán
Không xây cổng thanh toán riêng. Dùng dịch vụ đối soát của bên thứ ba, nhận thông báo biến động số dư qua webhook và tự khớp với lịch hẹn theo nội dung chuyển khoản. Khách chuyển khoản vào tài khoản ngân hàng của chính tiệm, BookSpa không giữ tiền.
Lựa chọn này nhanh và rẻ hơn cổng thanh toán thẻ, và tránh việc BookSpa phải xin giấy phép trung gian thanh toán.

### 5.4 Báo cáo no-show
Báo cáo hằng tuần trong app: tỉ lệ no-show, số lịch được cứu nhờ nhắc, tổng tiền cọc giữ lại.

## 6. Yêu cầu chi tiết
| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| R1 | Gửi nhắc 24h và 2h, kèm nút xác nhận/hủy | Must |
| R2 | Fallback SMS khi ZNS thất bại | Must |
| R3 | Bật/tắt và cấu hình cọc theo dịch vụ | Must |
| R4 | Tạo VietQR có nội dung chuyển khoản duy nhất | Must |
| R5 | Tự khớp thanh toán với lịch hẹn | Must |
| R6 | Giữ chỗ 15 phút, tự hủy khi quá hạn | Should |
| R7 | Báo cáo no-show hằng tuần | Should |
| R8 | Chủ tiệm đánh dấu "đã hoàn cọc" | Could |

## 7. Kế hoạch và nguồn lực
Team: 2 mobile, 1 backend, 1 designer làm 50% thời gian, QA dùng chung với team khác.
| Sprint | Nội dung | Kết thúc |
| --- | --- | --- |
| 1 | Nhắc lịch Zalo + SMS fallback (R1, R2) | 30/10 |
| 2 | Cấu hình cọc, VietQR, đối soát (R3-R6) | 20/11 |
| 3 | Báo cáo, beta với 40 cơ sở (R7, R8) | 4/12 |
Ra mắt chính thức 15/12. Backend ước tính cần 3 tuần cho phần đối soát, các hạng mục còn lại không có rủi ro đáng kể.

## 8. Chỉ số theo dõi
- Tỉ lệ no-show theo cơ sở (trước và sau khi bật)
- Tỉ lệ khách bấm "Xác nhận" và "Hủy" trong tin nhắc
- Tỉ lệ khách bỏ dở bước thanh toán cọc
- Tỉ lệ cơ sở bật cọc sau 2 tuần, 8 tuần
- Chi phí ZNS và SMS trên mỗi cơ sở mỗi tháng

## 9. Rủi ro đã nhận diện
- Chủ tiệm không bật đặt cọc vì sợ mất khách. Giảm thiểu: gợi ý mặc định, hiển thị dữ liệu từ cơ sở beta.
- Zalo duyệt template chậm. Giảm thiểu: nộp hồ sơ ngay trong tuần này.
- Khách chuyển sai nội dung nên không khớp tự động. Giảm thiểu: màn hình khớp thủ công cho lễ tân.

## 10. Câu hỏi mở
1. Mức cọc mặc định là 30% hay thấp hơn cho tiệm nail?
2. Có cần điều khoản riêng trong hợp đồng với chủ tiệm về việc giữ cọc không?
3. Phí xử lý đặt cọc BookSpa thu là bao nhiêu? (Chưa chốt, đang giả định 1,5% mỗi giao dịch.)
4. Có cho khách đặt lịch trong vòng 2 giờ tới mà vẫn yêu cầu cọc không?`
  },
  {
    id: 'merchant-advance',
    title: 'PRD: Chi hộ tức thì và Ứng vốn bán hàng (Instant Merchant Advance)',
    category: 'Fintech PRD',
    content: `# PRD: Chi hộ tức thì và Ứng vốn bán hàng (Instant Merchant Advance v1.0)

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
Sprint 3: Thiết kế UI UX Ví đối tác và Luồng rút tiền 1 chạm trên Merchant Portal.

## 5. Thu hồi nợ và Bảo hiểm
Không triển khai mua bảo hiểm tín dụng Credit Insurance trong giai đoạn v1 để bảo vệ biên lợi nhuận ròng trên 40%.
Tự động khấu trừ tiền nợ gốc từ các đơn hàng phát sinh tiếp theo. Người bán sẽ tiếp tục duy trì gian hàng và phát sinh đơn hàng đều đặn để hoàn trả khoản ứng.
Sprint 4: Module tự động thu hồi nợ gối đầu từ đơn hàng phát sinh tiếp theo.`
  },
  {
    id: 'redis-stream',
    title: 'ADR: Redis Streams for Order Event Sourcing',
    category: 'Architecture ADR',
    content: `# ADR: Dùng Redis Streams làm Event Bus cho Order Processing Service

## Trạng thái: Đã duyệt (Accepted) · Ngày: 18/10/2026 · Tác giả: Principal Architect

## Bối cảnh & Vấn đề
Hệ thống Order Processing cần chuyển đổi từ kiến trúc đồng bộ (monolithic REST calls) sang kiến trúc Event-Driven nhằm giảm tải cho Database Postgres chính trong các đợt Flash Sale.
Lưu lượng đỉnh (Peak Load) dự kiến đạt 25.000 events/giây trong các đợt Sale ngày đôi.
Ngân sách hạ tầng cloud cho message broker bị giới hạn ở mức 600 USD/tháng cho giai đoạn thử nghiệm MVP.

## Quyết định Kiến trúc
Chúng tôi quyết định sử dụng Redis Streams (Redis Enterprise Cluster có sẵn) làm Event Streaming Platform chính cho tất cả event liên quan đến Order Lifecycle (OrderCreated, PaymentCaptured, InventoryReserved) thay vì triển khai Apache Kafka hay AWS Kinesis.
Chấp nhận giới hạn lưu trữ Retention 7 ngày với policy MAXLEN ~ 5.000.000 items trên mỗi stream để khống chế dung lượng RAM trong phạm vi 32GB của cluster hiện hữu.

## Các Giả định Nền tảng (Assumptions)
1. Cụm Redis Enterprise Cluster hiện tại duy trì độ trễ ghi P99 dưới 5ms với thông lượng 25.000 events/s mà không cần scale thêm node phần cứng.
2. Thời gian khắc phục sự cố (MTTR) của các dịch vụ downstream không bao giờ vượt quá 48 giờ, do đó cửa sổ lưu trữ retention 7 ngày là hoàn toàn an toàn và không gây mất mát dữ liệu event.
3. Cơ chế Consumer Groups của Redis Streams đáp ứng đủ độ tin cậy At-Least-Once Delivery mà không gặp hiện tượng PEL (Pending Entries List) memory leak dưới tải cao.
4. Chi phí RAM bổ sung cho Redis Streams sẽ rẻ hơn đáng kể so với chi phí license và vận hành cụm Apache Kafka 3-broker chuyên biệt.

## Hệ quả & Kế hoạch Thực hiện
- Sprint 1: Xây dựng Redis Stream Producer SDK với batch pipeline.
- Sprint 2: Triển khai Consumer Group Worker Pool xử lý OrderCreated event.
- Sprint 3: Thiết lập Dead Letter Queue (DLQ) và Worker tự động dọn dẹp PEL backlog quá hạn.`
  }
];

export function extractProjectTitleFromDoc(docText: string): string {
  const lines = docText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.replace(/^#\s*(PRD:\s*|ADR:\s*|Spec:\s*)?/, '').trim();
    }
    if (trimmed.startsWith('PRD:') || trimmed.startsWith('Dự án:') || trimmed.startsWith('Project:')) {
      return trimmed.replace(/^(PRD:|Dự án:|Project:)\s*/, '').trim();
    }
  }
  return 'Dự án trích xuất mới';
}

