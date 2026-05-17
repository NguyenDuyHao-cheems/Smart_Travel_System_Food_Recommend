# 🎨 WANDERBITE DESIGN SYSTEM SPECIFICATION

Tài liệu này tổng hợp toàn bộ phong cách thiết kế, token màu sắc, typography và các component tái sử dụng hiện tại của hệ thống Wanderbite dựa trên mã nguồn thực tế.

## 1. 🧠 Tinh thần thiết kế (Core Vibe)

*   **Vibe:** Cổ điển pha lẫn hiện đại (Retro-Modern), ấm cúng, sang trọng, mang phong cách báo chí truyền thống nhưng vẫn rất High-Tech nhờ AI.
*   **Trải nghiệm:** Tối giản, mượt mà, nhiều hoạt ảnh (micro-animations), có chiều sâu (glassmorphism nhẹ).
*   **Chủ đề:** Hỗ trợ cả Light Mode và Dark Mode toàn diện.

---

## 2. 🎨 Color Palette (Hệ thống màu sắc)

Màu sắc sử dụng sự tương phản giữa nền kem/trắng ngà cổ điển và tông đỏ Vintage/Terracotta nổi bật.

### 🔴 Brand Colors (Màu chủ đạo)
*   **Brand (Light):** `#A91B0D` (Vintage Stamp Red) - Dùng cho primary buttons, text highlight.
*   **Brand Hover:** `#8A150A` - Trạng thái hover của brand.
*   **Brand Muted (Light):** `#F4EAD5` - Nền nhạt, trạng thái active của menu.
*   **Brand on Dark:** `#E8735A` (Terracotta) - Phiên bản đỏ đất dễ đọc hơn trên nền tối (Dark mode primary text/icons).

### 🌤 Light Mode Base
*   **Background:** `#FFFFFF` hoặc `#FFFDF9` / `#FDFBF7` (trắng ngà).
*   **Surface/Card:** `#FFFFFF`
*   **Primary Text:** `#3D312A` (Nâu đậm tối) hoặc `oklch(0.145 0 0)`
*   **Secondary Text:** `#9A8A7A` hoặc `#7A6A5A`
*   **Border:** rgba(0, 0, 0, 0.1) hoặc `#E6DFD5`

### 🌙 Dark Mode Base
*   **Background:** `#2A2420` (Nâu đen trầm).
*   **Surface/Card:** `#3D312A`
*   **Primary Text:** `#E6DFD5` (Trắng ngà sáng)
*   **Secondary Text:** `#9A8A7A` hoặc `#7A6A5A`
*   **Border:** `#4D3D32` hoặc `#3D312A`

---

## 3. 🔤 Typography (Kiểu chữ)

*   **Font Logo & Heading chính:** `DFVN Paper Kuto` (Font chữ phong cách Retro / Báo chí).
*   **Font Heading phụ:** `Playfair Display`.
*   **Font Body (Nội dung):** `Inter` / `Segoe UI` / `Roboto` / sans-serif.

### 📏 Type Scale
*   **Hero Heading:** 54px - 62px (`text-[54px] lg:text-[62px] font-black tracking-tight`).
*   **H1 / H2:** 24px - 32px (`text-2xl font-bold`).
*   **Body:** 14px - 16px (`text-sm / text-base`).
*   **Small / Tags:** 10px - 12px (`text-[10px] / text-xs`).

---

## 4. 📐 Layout & Effects

*   **Border Radius:**
    *   Cards / Modals: `rounded-2xl` hoặc `rounded-3xl`.
    *   Pills / Tags / Buttons: `rounded-full` (hoàn toàn tròn ở hai đầu).
    *   Icons / Avatar Boxes: `rounded-xl` (12px).
*   **Shadows (Light Mode):**
    *   Thường dùng `shadow-sm` hoặc custom hard shadow cho cảm giác retro: `shadow-[4px_4px_0px_rgba(61,49,42,1)]` (dùng cho SearchBar).
*   **Borders:**
    *   Viền mỏng cho card: `border border-gray-100` (Light) / `border-[#4D3D32]` (Dark).
*   **Textures / Backgrounds:**
    *   Sử dụng texture đồ ăn chìm (food-pattern.png) lặp lại với độ mờ thấp (0.15 ở light, 0.06 ở dark).
    *   Blob màu phát sáng mờ (ambient glow blur 120px).

---

## 5. 🧱 Components (Các thành phần UI chính)

### 5.1. Buttons & CTAs
*   **Primary Action (Tìm kiếm / Áp dụng):**
    *   `bg-brand text-white rounded-full font-bold uppercase tracking-wide hover:bg-brand-hover`.
*   **Secondary / Action Icons (Heart, Bookmark):**
    *   `w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 shadow-sm border border-gray-200 dark:border-[#4D3D32] hover:scale-110 transition-all`.
*   **Toggle / Filter (DistanceFilter, BudgetSelector):**
    *   Dạng viên thuốc (Pill): `px-3 py-1.5 rounded-full text-xs font-semibold border`.
    *   Active state: `bg-brand-muted text-brand-hover border-brand/30`.

### 5.2. Search Bar (Thanh tìm kiếm)
*   **Full Mode (Trang chủ):**
    *   To to, bo tròn hoàn toàn `rounded-full`, có viền đen dày `border-2 border-[#3D312A]`.
    *   Đổ bóng cứng phong cách retro: `shadow-[4px_4px_0px_rgba(61,49,42,1)]`.
    *   Hiệu ứng: Khi focus thụt vào một chút (`focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-[2px_2px_0px_rgba(61,49,42,1)]`).
*   **Compact Mode (Kết quả):** Kế thừa style viền đen bóng cứng nhưng kích thước nhỏ hơn.

### 5.3. Food Card (Thẻ món ăn)
*   **Container:** `bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300`.
*   **Image Header:** Chiều cao `180px`, object-cover, có gradient overlay từ đen sang trong suốt ở dưới đáy để làm nổi bật text. Hiệu ứng hover scale ảnh.
*   **Badges nổi trên ảnh:**
    *   AI Match: `bg-brand text-white text-[11px] font-bold rounded-full`.
    *   Distance: `bg-white/90 text-gray-600 rounded-full text-[11px] font-semibold`.
    *   Nút bấm nhanh (Bookmark, Heart) ở góc trên phải.
*   **Content:** Tiêu đề đậm (line-clamp-1), Tên quán màu đỏ brand, Đoạn lý do (reason) text xám (line-clamp-2).

### 5.4. Tags & Chips (Vibe / Category)
*   **Trending Chips (Trang chủ):** `border-2 border-[#3D312A]/20 bg-white/80 rounded-full text-xs font-bold uppercase hover:bg-brand hover:text-white`.
*   **Vibe Tags (Food Card):** Dùng màu nhạt phối hợp:
    *   Spicy: `bg-red-50 text-red-500`
    *   Seafood: `bg-yellow-50 text-yellow-600`
    *   Trendy: `bg-violet-50 text-violet-500`

### 5.5. Dialogs / Modals (Survey, Collection)
*   `bg-white dark:bg-[#2A2420] rounded-3xl shadow-2xl border border-gray-100`.
*   Hiệu ứng hiển thị: `animate-in fade-in zoom-in-95`.

### 5.6. Loading State & Overlays
*   Sử dụng framer-motion cho hoạt ảnh.
*   Icon AI: Xoay liên tục, toả hào quang (`animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}`).
*   Skeleton Cards có hiệu ứng shimmer lướt ngang.

---

## 6. ✨ Animation & Transitions
*   Mọi component tương tác đều có `transition-all duration-300` (hoặc 200).
*   **Hover items:** Phóng to nhẹ (`hover:scale-110` đối với icon button, `group-hover:scale-105` đối với ảnh món ăn).
*   Trạng thái tải (Text Typewriter effect trên SearchBar).
*   Chuyển đổi Dark/Light mode: Sun/Moon icon xoay và chuyển đổi scale (`scale-100` -> `scale-0`).
