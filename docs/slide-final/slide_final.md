---
marp: true
size: 16:9
paginate: true
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&display=swap');

section {
    /* Set body font to Montserrat and text color to black */
    font-family: 'Montserrat', sans-serif; 
    color: black; 
}

h1, h2, h3 {
    /* Set heading font to Open Sauce One */
    font-family: 'Open Sauce One', 'Montserrat', sans-serif; 
    font-weight: 800; /* Make headings thicker and bolder */
    
    /* Apply linear gradient color to headings */
    background: linear-gradient(to right, #ff1313, #F44B16, #F6623C, #DF8748, #FFA24B);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    width: fit-content;
}
blockquote {
    border-left: 8px solid #F44B16;
    background: rgba(255, 255, 255, 0.85);
    padding: 15px 25px;
    margin: 20px 0;
    color: #1a1a1a;
    border-radius: 4px;
    font-weight: 500;
}
</style>
![bg](bg1.png)
# <span style="font-size: 3em;">Wanderbite</span>
## FINAL PRESENTATION

**GVHD:** TS.Bùi Văn Thạch, ThS.Lê Đức Khoan

---
![bg](bg2.png)

# Mục lục

- Nhắc lại bài toán
- Luồng xử lí của hệ thống
- Tính năng chính
- Kiểm thử
- Đánh giá - Cải tiến
- Demo dự án qua video
---
![bg](bg3.png)

# Nhắc lại bài toán
> Hệ thống gợi ý quán ăn cho khách du lịch, sử dụng AI để hiểu câu tìm kiếm tiếng Việt. Cá nhân hóa kết quả theo người dùng.
---
![bg](bg3.png)

# Nhắc lại bài toán
**Bài toán con**
- Hiểu ngôn ngữ tự nhiên tiếng Việt
- Gợi ý đa tiêu chí 
- Xếp hạng thông minh 
---
![bg](bg3.png)

# Nhắc lại bài toán
## ví dụ
Người dùng nhập vào thanh tìm kiếm
> "Hôm nay trời lạnh, thèm ăn món nóng."

---



# Nhắc lại bài toán
![bg](bg1.png)

* **Input:**
  - Câu truy vấn người dùng.
  - Ngữ cảnh người dùng: tọa độ GPS.
  - Hồ sơ cá nhân: dị ứng, sở thích, khẩu vị, ngân sách.
* **Output:**
  - Top N quán ăn phù hợp đã được sắp xếp
  - Thông tin chi tiết mỗi quán (khoảng cách, điểm đánh giá, danh sách món, giá)
  - Điểm số đánh giá mức độ phù hợp
---
# Nhắc lại bài toán
![bg](bg3.png)
**Ràng buộc:**
- Tối thiểu trả về 16 kết quả cho người dùng
- Tốc độ phản hồi trong khoảng 5 giây

---
![bg](bg2.png)

# Luồng xử lí của hệ thống
* **Nhận input**: câu văn tiếng Việt, tọa độ GPS, ID người dùng, ngân sách, chế độ tìm kiếm (bình thường hoặc cảm xúc)
- Làm sạch câu truy vấn: nhận câu văn, sử dụng mô hình gemini dịch ngữ cảnh mơ hồ thành danh sách tên món ăn cụ thể.
- Tách từ tiếng Việt bằng mô hình **underthesea** 
- Tạo vector 768 chiều bằng mô hình **vietnamese-bi-encoder**

---
![bg](bg2.png)

# Luồng xử lí của hệ thống
- Kết hợp vector người dùng và vector câu truy vấn (theo tỉ lệ 85% truy vấn hiện tại-15% sở thích người dùng)
- Lọc quán đang hoạt động
- Lọc theo ngân sách (lấy quán có khoảng giá <= ngân sách)
- Lọc món chay (nếu truy vấn không chứa từ khóa chay -> loại quán thuần chay)
---
![bg](bg2.png)

# Luồng xử lí của hệ thống
- Lọc theo tags
- Sắp xếp theo khoảng cách cosine (lấy tối đa 500 quán)
- Tăng điểm cho quán có tên khớp với truy vấn
- Tìm kiếm vector trên danh sách **món ăn**
- Sắp xếp lại theo khoảng cách cosine tăng dần
---
![bg](bg2.png)

# Luồng xử lí của hệ thống
- Gán nhãn cảnh báo dị ứng
- Xây dựng đặc trưng xếp hạng cho mỗi quán
- Sắp xếp lại bằng **LambdaMART**
- Sắp xếp lại theo cảm xúc (hoạt động với chế độ tìm theo cảm xúc)
- Format kết quả + tính điểm phù hợp %
- **Output**: trả về top 16 quán.

---

# Flowchart
![bg](bg3.png)

---
# Tính năng chính
![bg](bg2.png)

* Tìm kiếm quán ăn
- Lưu, tạo bộ sưu tập, xem lại lịch sử tìm kiếm
* Hồ sơ cá nhân 
- Cảnh báo dị ứng
---

![bg](bg1.png)
# Kiểm thử

> Câu truy vấn sau khi làm sạch bằng gemini

![alt text](image-1.png)

---
![bg](bg1.png)
# Kiểm thử
> Thứ tự kết quả khi mô hình xếp hạng lambdaMART bị lỗi

![alt text](image-2.png)

---
![bg](bg1.png)
# Đánh giá - Cải tiến
## Đánh giá
- **Khoảng cách** từ người dùng đến quán ăn chưa theo tuyến đường
- Phụ thuộc vào mô hình **gemini API**
- **Dị ứng** chỉ hỗ trợ 8 loại cố định, không cho phép người dùng tự thêm
---
![bg](bg1.png)
# Đánh giá - Cải tiến
## Cải tiến
- **Khoảng cách** từ người dùng đến quán ăn theo tuyến đường
- Xây dựng mô hình **openrouter** để thay thế **gemini API**
- **Dị ứng** cho phép người dùng tự thêm
---

# Demo dự án qua video

---
![bg](bg1.png)
# Kết thúc
