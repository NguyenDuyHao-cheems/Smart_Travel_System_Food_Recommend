"""
demo_lambdamart_fallback.py
Minh họa: Khi LambdaMART lỗi → hệ thống giữ nguyên thứ tự cosine distance.
"""

import time

# ── ANSI colors ───────────────────────────────────────────────────────────────
RESET   = "\033[0m"
BOLD    = "\033[1m"
RED     = "\033[91m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
CYAN    = "\033[96m"
WHITE   = "\033[97m"
DIM     = "\033[2m"

SEP  = f"{DIM}{'─' * 64}{RESET}"
SEP2 = f"{DIM}{'═' * 64}{RESET}"

# ── Dữ liệu giả lập ──────────────────────────────────────────────────────────
USER_QUERY = "Hôm nay trời lạnh, thèm ăn món nóng."
CLEANED    = "lẩu thái, phở bò, bún bò huế, cháo sườn"

CANDIDATES = [
    {"res_id": "res-001", "name": "Quán Lẩu Thái Cay",      "cosine_dist": 0.12, "rating": 4.8, "distance_m": 320},
    {"res_id": "res-002", "name": "Phở Bò 24h",              "cosine_dist": 0.21, "rating": 4.6, "distance_m": 780},
    {"res_id": "res-003", "name": "Bún Bò Huế Minh Tâm",     "cosine_dist": 0.27, "rating": 4.5, "distance_m": 1100},
    {"res_id": "res-004", "name": "Cháo Sườn Bà Năm",        "cosine_dist": 0.33, "rating": 4.3, "distance_m": 450},
    {"res_id": "res-005", "name": "Nhà Hàng Hải Sản Đại Dương","cosine_dist": 0.55, "rating": 4.7, "distance_m": 2300},
]

def print_header():
    print()
    print(SEP2)
    print(f"  {BOLD}{WHITE}WANDERBITE — Kiểm thử Fallback LambdaMART{RESET}")
    print(SEP2)
    print()

def print_input():
    print(f"{BOLD}{CYAN}[INPUT]{RESET}")
    print(f"  Câu truy vấn gốc : {WHITE}\"{USER_QUERY}\"{RESET}")
    print(f"  Sau khi Gemini làm sạch: {WHITE}\"{CLEANED}\"{RESET}")
    print()

def print_candidates_cosine():
    print(SEP)
    print(f"{BOLD}{CYAN}[BƯỚC 1] Kết quả Retrieval — Sắp xếp theo Cosine Distance{RESET}")
    print(SEP)
    print(f"  {'STT':<5} {'Tên quán':<30} {'Cosine Dist':>12} {'Rating':>8} {'Khoảng cách':>14}")
    print(f"  {'-'*5} {'-'*30} {'-'*12} {'-'*8} {'-'*14}")
    for i, c in enumerate(sorted(CANDIDATES, key=lambda x: x["cosine_dist"]), 1):
        dist_color = GREEN if c["cosine_dist"] < 0.3 else (YELLOW if c["cosine_dist"] < 0.5 else RED)
        print(
            f"  {i:<5} {c['name']:<30} "
            f"{dist_color}{c['cosine_dist']:>12.2f}{RESET} "
            f"{c['rating']:>8.1f} "
            f"{c['distance_m']:>12}m"
        )
    print()

def simulate_lambdamart_call():
    print(SEP)
    print(f"{BOLD}{CYAN}[BƯỚC 2] Gọi LambdaMART Rerank (AI Engine :8001/api/v1/ml/rank){RESET}")
    print(SEP)
    print(f"  {DIM}POST http://ai_engine:8001/api/v1/ml/rank{RESET}")
    print(f"  {DIM}Payload: {len(CANDIDATES)} candidates, timeout=5.0s{RESET}")
    print()

    for i in range(3):
        print(f"  {DIM}Đang kết nối{'.' * (i+1)}{RESET}", end="\r")
        time.sleep(0.4)

    # Giả lập lỗi
    print(f"  {RED}{BOLD}✗  httpx.ConnectError: [Errno 111] Connection refused{RESET}         ")
    print(f"  {RED}   ai_engine:8001 không phản hồi (timeout sau 5.0s){RESET}")
    print()
    print(f"  {YELLOW}{BOLD}⚠  WARNING — recommendation_service.py, dòng 152:{RESET}")
    print(f"  {YELLOW}   \"Ranking rerank failed, keeping cosine order: Connection refused\"{RESET}")
    print()

def print_fallback_result():
    print(SEP)
    print(f"{BOLD}{GREEN}[BƯỚC 3] FALLBACK — Giữ nguyên thứ tự Cosine Distance{RESET}")
    print(SEP)
    print(f"  {GREEN}✓  Hệ thống KHÔNG crash.{RESET}")
    print(f"  {GREEN}✓  Trả về danh sách theo thứ tự cosine distance tăng dần.{RESET}")
    print()

    ranked = sorted(CANDIDATES, key=lambda x: x["cosine_dist"])
    print(f"  {'#':<5} {'Tên quán':<30} {'Match%':>8} {'Khoảng cách':>14}")
    print(f"  {'-'*5} {'-'*30} {'-'*8} {'-'*14}")

    for i, c in enumerate(ranked, 1):
        similarity  = 1.0 - c["cosine_dist"]
        match_pct   = 70 + int(similarity * 28)
        dist_km     = c["distance_m"] / 1000
        color       = GREEN if i <= 2 else (YELLOW if i <= 4 else DIM)
        print(
            f"  {color}{i:<5} {c['name']:<30} "
            f"{match_pct:>7}% "
            f"{dist_km:>12.1f}km{RESET}"
        )

    print()

def print_summary():
    print(SEP2)
    print(f"  {BOLD}Tổng kết:{RESET}")
    print(f"  {GREEN}✓{RESET}  LambdaMART lỗi → {BOLD}không trả về lỗi cho người dùng{RESET}")
    print(f"  {GREEN}✓{RESET}  Kết quả vẫn được trả về theo {BOLD}Cosine Distance (Semantic){RESET}")
    print(f"  {GREEN}✓{RESET}  Ràng buộc tốc độ 5 giây vẫn được đảm bảo")
    print(f"  {YELLOW}⚠{RESET}  Thứ tự chưa được tối ưu bằng LambdaMART (mất tín hiệu Rating, Sentiment)")
    print(SEP2)
    print()

if __name__ == "__main__":
    print_header()
    print_input()
    print_candidates_cosine()
    simulate_lambdamart_call()
    print_fallback_result()
    print_summary()
