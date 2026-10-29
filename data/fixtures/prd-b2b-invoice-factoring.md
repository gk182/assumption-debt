# PRD: Nền tảng Ứng vốn Hóa đơn B2B (Supply Chain Finance v1.2)

## 1. Bối cảnh thị trường & Bài toán kinh doanh
Các doanh nghiệp vừa và nhỏ (SME) cung cấp nguyên vật liệu cho các tập đoàn bán lẻ lớn thường phải chịu điều khoản thanh toán công nợ chậm từ 45 đến 90 ngày. Điều này làm cạn kiệt dòng tiền lưu động để tái nhập hàng.
Giải pháp: Xây dựng nền tảng FinTech kết nối ngân hàng để ứng trước 80% giá trị hóa đơn VAT hợp lệ ngay khi bên mua xác nhận đã nhận đủ hàng hóa.

## 2. Mô hình định giá & Doanh thu
Áp dụng mức phí chiết khấu ứng vốn 1.8%/tháng trên giá trị hóa đơn. Mức phí này là hoàn toàn cạnh tranh vì các doanh nghiệp SME sẵn sàng trả chi phí này thay vì phải chịu lãi suất tín dụng đen hoặc thủ tục thế chấp bất động sản phức tạp tại ngân hàng truyền thống.
Sprint 1: Xây dựng cổng Portal nộp hóa đơn VAT và tích hợp xác thực mã CQT.

## 3. Quy trình xác nhận công nợ ba bên (Tri-party Agreement)
Để giải ngân an toàn, doanh nghiệp mua hàng đầu chuỗi (Anchor Buyer) bắt buộc phải ký số xác nhận nghĩa vụ thanh toán vào tài khoản chỉ định của nền tảng.
Doanh nghiệp mua hàng chắc chắn sẽ sẵn sàng ký số xác nhận công nợ điện tử trong vòng 48 giờ vì nền tảng hỗ trợ API kết nối thẳng vào phần mềm ERP SAP/Oracle của họ.
Sprint 2: Xây dựng module tích hợp ERP SAP và ký số tự động qua HSM Cloud.

## 4. Tích hợp Hệ thống Hóa đơn điện tử Tổng cục Thuế
Hệ thống kết nối trực tiếp với cổng Hóa đơn điện tử của Tổng cục Thuế qua đơn vị trung gian TVAN.
Dữ liệu đối soát hóa đơn VAT từ hệ thống Tổng cục Thuế luôn duy trì phản hồi dưới 30 giây và không bị ngắt kết nối vào những ngày cao điểm cuối tháng.
Sprint 3: Xây dựng luồng crawler/API đối soát tự động trạng thái hiệu lực hóa đơn.

## 5. Phòng chống gian lận & Hóa đơn khống
Rủi ro xuất khống hóa đơn VAT để chiếm đoạt tiền giải ngân có thể ngăn chặn hoàn toàn bằng thuật toán đối soát chéo mã số thuế và kiểm tra lịch sử nộp thuế 12 tháng qua.
Sprint 4: Xây dựng mô hình chấm điểm tín nhiệm doanh nghiệp SME dựa trên dữ liệu thuế và ngân hàng.
