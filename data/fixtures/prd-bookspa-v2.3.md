# PRD: Nhắc lịch Zalo và đặt cọc (BookSpa v2.3)

**Tác giả:** Minh (PM) · **Trạng thái:** Draft v0.3 · **Cập nhật:** 12/10/2026 **Reviewer:** Hùng (Tech lead), Lan (Design), Thảo (Customer Success)

*Tài liệu mẫu dùng để thử công cụ trích xuất giả định. Công ty, số liệu và con người đều là hư cấu.*

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
4. Có cho khách đặt lịch trong vòng 2 giờ tới mà vẫn yêu cầu cọc không?
