# Spec & Meeting Notes: Triển khai AI Voicebot CSKH & Nhắc hẹn Thanh toán

## 1. Mục tiêu dự án
Tự động hóa 70% các cuộc gọi nhắc lịch hẹn thanh toán khoản vay tiêu dùng và khảo sát độ hài lòng của khách hàng (NPS), giảm chi phí nhân sự tổng đài viên từ 45 nhân sự xuống còn 15 nhân sự giám sát.

## 2. Kiến trúc giải pháp (Speech-to-Speech Pipeline)
Pipeline xử lý thời gian thực gồm 3 thành phần:
SIP Trunking Viễn thông -> Audio Streaming (WebRTC) -> Speech-to-Text (STT) -> LLM Reasoning -> Text-to-Speech (TTS) -> SIP Audio Out.

## 3. Các giả định nghiệp vụ & Trải nghiệm người dùng
- Tổng độ trễ toàn trình (End-to-End Latency từ lúc người dùng ngưng nói đến khi bot phản hồi âm thanh) duy trì ổn định dưới 800ms qua hạ tầng mạng di động 4G tại Việt Nam.
- Tỷ lệ khách hàng dập máy ngay trong 5 giây đầu tiên khi nhận biết là giọng AI nói tự động sẽ không vượt quá 15%.
- Các nhà mạng viễn thông Viettel và Mobifone sẽ không gắn cờ SPAM hoặc chặn cuộc gọi hàng loạt khi hệ thống phát sinh hơn 10,000 cuộc gọi mỗi ngày từ cùng một dải Brandname đã đăng ký.
- Khách hàng vay tiêu dùng sẽ tin tưởng và sẵn sàng xác nhận thông tin định danh cá nhân (4 số cuối CCCD) với bot tự động mà không yêu cầu chuyển máy sang nhân viên thật.

## 4. Lộ trình phát triển & Kiểm thử
Sprint 1: Kết nối hạ tầng SIP Trunking viễn thông và kiểm tra độ trễ âm thanh WebRTC.
Sprint 2: Thử nghiệm kịch bản nhắc hẹn thanh toán trên nhóm 500 khách hàng mẫu.
Sprint 3: Xây dựng Dashboard giám sát tỷ lệ ngắt máy và độ chính xác nhận diện giọng nói tiếng Việt các vùng miền.
