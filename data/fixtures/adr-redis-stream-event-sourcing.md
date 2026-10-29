# ADR-007: Áp dụng Redis Streams & Transactional Outbox cho Xử lý Đơn hàng

## 1. Hiện trạng & Vấn đề (Context)
Hệ thống Monolith hiện tại sử dụng synchronous HTTP calls giữa Order Service, Inventory Service và Payment Gateway gây ra nghẽn cổ chai khi lượng truy cập tăng vọt trong các đợt flash sale.
Mục tiêu: Chuyển đổi sang kiến trúc hướng sự kiện (Event-Driven Architecture) với cơ chế Publish/Subscribe bất đồng bộ.

## 2. Quyết định kỹ thuật (Decision)
Thay vì triển khai cụm Apache Kafka phức tạp và tốn kém tài nguyên vận hành, chúng tôi quyết định sử dụng Redis Streams làm event broker trung tâm kết hợp với mô hình Transactional Outbox trên cơ sở dữ liệu PostgreSQL.

## 3. Các giả định kỹ thuật & Nghiệp vụ (Assumptions)
- Redis Streams duy trì thông lượng 15,000 msg/s mà không cần cấu hình cluster sharding phức tạp trong vòng 12 tháng tới.
- Chi phí bản quyền và hạ tầng vận hành Redis Cloud trên AWS thấp hơn Apache Kafka ít nhất 35% ở cùng mức tải đỉnh.
- Cơ chế consumer group của Redis đảm bảo tính tuần tự tuyệt đối (Strict FIFO Ordering) cho các sự kiện của cùng một đơn hàng ngay cả khi worker node bị crash và restart lại.
- Đội ngũ kỹ sư backend hiện tại có thể làm chủ hoàn toàn cơ chế Ack và Pending Entries List (PEL) của Redis Streams trong vòng 2 tuần thử nghiệm mà không gây mất mát sự kiện đơn hàng.

## 4. Kế hoạch triển khai (Implementation Tasks)
Sprint 1: Cấu hình Redis Streams trên môi trường Staging và viết module Transactional Outbox Worker.
Sprint 2: Viết Consumer xử lý sự kiện trừ kho (Inventory) và thanh toán (Payment).
Sprint 3: Chạy bài kiểm thử tải mô phỏng 10,000 đơn hàng đồng thời.
