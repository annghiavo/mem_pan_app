# mem_pan — Sơ đồ luồng nghiệp vụ (Sequence Diagrams)

> Tài liệu dành cho BA trao đổi với khách hàng. Mô tả 2 luồng nghiệp vụ chính của ứng dụng học từ vựng theo phương pháp lặp lại ngắt quãng (SRS):
> 1. **Quản lý bộ thẻ (Deck)**
> 2. **Học & Ôn tập (Study & Review)**
>
> Các thành phần tham gia:
> - **Người dùng**: người học sử dụng ứng dụng.
> - **Ứng dụng**: app di động / web mà người dùng thao tác trực tiếp.
> - **Hệ thống**: máy chủ (backend) xử lý nghiệp vụ và lưu trữ dữ liệu.

---

## 1. Luồng Quản lý bộ thẻ (Deck)

Luồng này mô tả việc người dùng **tạo, xem, chỉnh sửa và xóa** bộ thẻ cùng các thẻ học bên trong, bao gồm cả nhập liệu hàng loạt từ tệp (CSV / Excel / PDF).

```mermaid
sequenceDiagram
    autonumber
    actor ND as Người dùng
    participant App as Ứng dụng
    participant HT as Hệ thống

    Note over ND,HT: A. Tạo bộ thẻ mới
    ND->>App: Chọn "Tạo bộ thẻ"
    App-->>ND: Hiển thị biểu mẫu (tên, mô tả, công khai/riêng tư)
    ND->>App: Nhập thông tin bộ thẻ

    alt Nhập thẻ thủ công
        ND->>App: Thêm/sửa từng thẻ (mặt trước, mặt sau, hình ảnh)
    else Nhập hàng loạt từ tệp
        ND->>App: Tải lên tệp CSV / Excel / PDF
        App->>App: Đọc và bóc tách nội dung thành danh sách thẻ
        App-->>ND: Hiển thị danh sách thẻ để xem trước & chỉnh sửa
    end

    ND->>App: Bấm "Lưu"
    App->>HT: Tạo bộ thẻ (tên, mô tả, chế độ hiển thị)
    HT-->>App: Trả về mã bộ thẻ
    App->>HT: Tạo các thẻ cho bộ thẻ (theo lô)
    HT-->>App: Xác nhận đã lưu thẻ
    App-->>ND: Thông báo tạo bộ thẻ thành công

    Note over ND,HT: B. Xem danh sách & chi tiết
    ND->>App: Mở "Thư viện"
    App->>HT: Lấy danh sách bộ thẻ & thư mục
    HT-->>App: Trả về danh sách
    App-->>ND: Hiển thị bộ thẻ và thư mục
    ND->>App: Chọn một bộ thẻ
    App->>HT: Lấy chi tiết bộ thẻ + danh sách thẻ + tiến độ ghi nhớ
    HT-->>App: Trả về dữ liệu chi tiết
    App-->>ND: Hiển thị chi tiết bộ thẻ và tiến độ

    Note over ND,HT: C. Chỉnh sửa / Xóa
    alt Chỉnh sửa
        ND->>App: Sửa thông tin bộ thẻ hoặc thẻ
        App->>HT: Cập nhật bộ thẻ / thẻ
        HT-->>App: Xác nhận cập nhật
        App-->>ND: Cập nhật giao diện
    else Xóa
        ND->>App: Chọn "Xóa bộ thẻ"
        App-->>ND: Yêu cầu xác nhận
        ND->>App: Xác nhận xóa
        App->>HT: Xóa bộ thẻ
        HT-->>App: Xác nhận đã xóa
        App-->>ND: Quay lại thư viện, thông báo đã xóa
    end
```

---

## 2. Luồng Học & Ôn tập (Study & Review)

Luồng này mô tả một **phiên học/ôn tập**: hệ thống chọn thẻ cần ôn, sinh câu hỏi (trắc nghiệm, tự luận, đúng/sai, lật thẻ), chấm câu trả lời và ghi nhận mức độ ghi nhớ theo cơ chế SRS để lên lịch ôn lại.

```mermaid
sequenceDiagram
    autonumber
    actor ND as Người dùng
    participant App as Ứng dụng
    participant HT as Hệ thống

    Note over ND,HT: A. Bắt đầu phiên học
    ND->>App: Mở bộ thẻ và chọn "Học / Ôn tập"
    App->>HT: Lấy cấu hình học của bộ thẻ
    HT-->>App: Trả về cấu hình (xáo trộn, loại câu hỏi, độ chặt...)
    App->>HT: Lấy danh sách thẻ cần ôn (đến hạn)
    HT-->>App: Trả về danh sách thẻ
    App->>HT: Khởi tạo phiên học
    HT-->>App: Trả về mã phiên học
    App->>App: Sinh bộ câu hỏi từ thẻ (trắc nghiệm / tự luận / đúng-sai / lật thẻ)

    Note over ND,HT: B. Vòng lặp trả lời từng câu hỏi
    loop Với mỗi câu hỏi
        App-->>ND: Hiển thị câu hỏi (kèm đọc to nếu bật TTS)
        ND->>App: Nhập / chọn câu trả lời
        App->>App: Chấm điểm câu trả lời & tính mức ghi nhớ theo thời gian phản hồi
        App-->>ND: Hiển thị phản hồi đúng/sai và đáp án đúng
        App->>HT: Gửi kết quả ôn thẻ (mức đánh giá 1–4)
        HT->>HT: Cập nhật lịch ôn lại của thẻ theo SRS
        HT-->>App: Xác nhận đã ghi nhận
    end

    Note over ND,HT: C. Kết thúc phiên
    App->>HT: Kết thúc phiên học
    HT-->>App: Trả về tổng kết (số đúng/sai, tỉ lệ, tiến độ mới)
    App-->>ND: Hiển thị kết quả phiên học & tiến độ ghi nhớ cập nhật
```

---

## Phụ lục: Mức đánh giá ghi nhớ (SRS)

Sau mỗi câu trả lời, hệ thống ghi nhận một mức đánh giá quyết định thời điểm thẻ được ôn lại:

| Mức | Tên | Khi nào | Lần ôn kế tiếp |
|-----|------|---------|----------------|
| 1 | Lại (Again) | Trả lời sai | Rất sớm |
| 2 | Khó (Hard) | Đúng nhưng chậm (> 8 giây) | Khoảng cách vừa |
| 3 | Tốt (Good) | Đúng, tốc độ bình thường (3–8 giây) | Khoảng cách tiêu chuẩn |
| 4 | Dễ (Easy) | Đúng và nhanh (< 3 giây) | Khoảng cách dài |

> Thuật toán lên lịch ôn lại do **Hệ thống** xử lý; ứng dụng chỉ gửi mức đánh giá.
