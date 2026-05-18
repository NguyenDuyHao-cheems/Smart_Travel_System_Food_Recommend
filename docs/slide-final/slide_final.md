---
marp: true
size: 16:9
paginate: true
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap');

section {
    /* Set body font to Montserrat and text color to black */
    font-family: 'Montserrat', sans-serif; 
    color: black; 
}

h1, h2, h3 {
    /* Set heading font to Open Sauce One */
    font-family: 'Open Sauce One', 'Montserrat', sans-serif; 
    
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
# Wanderbite
## FINAL PRESENTATION

**GVHD:** TS.Bùi Văn Thạch, ThS.Lê Đức Khoan

---
![bg](bg2.png)

# Mục lục

---
![bg](bg3.png)

# Nhắc lại bài toán
> Gợi ý quán ăn cho khách du lịch, sử dụng AI để hiểu câu tìm kiếm tiếng Việt. Cá nhân hóa kết quả theo người dùng.
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
  - Hồ sơ cá nhân: dị ứng, sở thích.
* **Output:**
  - Top N quán ăn phù hợp đã được sắp xếp
  - Thông tin chi tiết mỗi quán (khoảng cách, điểm đánh giá, danh sách món, giá)
  - Điểm số đánh giá mức độ phù hợp
---
# Nhắc lại bài toán
![bg](bg3.png)
**Ràng buộc:**
- Tối thiểu trả về 16 kết quả cho người dùng


---

# Flowchart
![bg](bg3.png)

---

# Kiểm thử - điểm yếu & cải tiến
![bg](bg1.png)

* Verify each solution meets constraints
* Advanced methods:
  * Branch & bound
  * Metaheuristics (e.g., genetic algorithms)
* GUI visualization

---

# Kết quả làm được
![bg](bg2.png)

* feature a
* b

---

# Demo dự án qua video

---

# Kết thúc