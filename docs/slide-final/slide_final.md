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
1. **Nhận input**: câu văn tiếng Việt, tọa độ GPS, ID người dùng, ngân sách, chế độ tìm kiếm (bình thường hoặc cảm xúc)
2. Làm sạch câu truy vấn: nhận câu văn, sử dụng mô hình gemini dịch ngữ cảnh mơ hồ thành danh sách tên món ăn cụ thể.
3. Tách từ tiếng Việt bằng mô hình **underthesea** 
4. Tạo vector 768 chiều bằng mô hình **vietnamese-bi-encoder**

---
![bg](bg2.png)

# Luồng xử lí của hệ thống
5. Kết hợp vector người dùng và vector câu truy vấn (theo tỉ lệ 85% truy vấn hiện tại-15% sở thích người dùng)
6. Lọc quán đang hoạt động
7. Lọc theo ngân sách (lấy quán có khoảng giá <= ngân sách)
8. Lọc món chay (nếu truy vấn không chứa từ khóa chay -> loại quán thuần chay)
---
![bg](bg2.png)

# Luồng xử lí của hệ thống
9. Lọc theo tags
10. Sắp xếp theo khoảng cách cosine (lấy tối đa 500 quán)
11. Tăng điểm cho quán có tên khớp với truy vấn
12. Tìm kiếm vector trên danh sách **món ăn**
13. Sắp xếp lại theo khoảng cách cosine tăng dần
---
![bg](bg2.png)

# Luồng xử lí của hệ thống
14. Gán nhãn cảnh báo dị ứng
15. Xây dựng đặc trưng xếp hạng cho mỗi quán (6 đặc trưng: `similarity_score`, `rating_norm`, `sentiment_norm`, `distance_log`, `price_clipped`, `review_log`)
16. Sắp xếp theo cảm xúc (tùy chọn)
17. Sắp xếp lại bằng **LambdaMART**
18. Phân rã khoảng cách + nhận diện mật độ quán ăn

19. Format kết quả + tính điểm phù hợp %
20. **Output**: trả về top 16 quán đã sắp xếp.

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

![w:1000 center](image-1.png)

---
![bg](bg1.png)
# Kiểm thử
> Thứ tự kết quả khi mô hình xếp hạng lambdaMART bị lỗi

![alt text](image-2.png)

---
![bg](bg1.png)
# Đánh giá - Cải tiến
## Đánh giá
- **Khoảng cách** từ người dùng đến quán ăn đang tính theo đường chim bay.
- Phụ thuộc vào mô hình **gemini API**
- **Dị ứng** chỉ hỗ trợ 8 loại cố định, không cho phép người dùng tự thêm
---
![bg](bg1.png)
# Đánh giá - Cải tiến
## Cải tiến
- **Khoảng cách** từ người dùng đến quán ăn theo tuyến đường
-  Tích hợp cổng **API OpenRouter** để linh hoạt chuyển đổi giữa nhiều mô hình AI 
- **Dị ứng** cho phép người dùng tự thêm
---

# Demo dự án qua video

---
![bg](bg1.png)
# Kết thúc
