# -*- coding: utf-8 -*-
"""
enrich_vegetarian.py  (rule-based, edge-case-aware)
Ghi đè dishes.json với trường is_vegetarian được điền tự động.
    python Data_Pipeline/enrich_vegetarian.py
"""

import json, sys, time, re, unicodedata
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT        = Path(__file__).resolve().parent.parent
DISHES_PATH = ROOT / "dishes.json"

# ---------------------------------------------------------------------------
# MEAT / NON-VEGETARIAN KEYWORDS
# Bất kỳ từ nào trong list này xuất hiện trong tên món → KHÔNG CHAY
# ---------------------------------------------------------------------------
MEAT_KEYWORDS = [
    # --- Thịt đỏ ---
    "bò", "thịt bò", "bắp bò", "gân bò", "đuôi bò", "gầu bò", "vạc bò",
    "nạm bò", "bắp bò", "xương bò", "trâu", "dê", "cừu", "nai", "hươu",
    # --- Heo ---
    "heo", "lợn", "ba chỉ", "ba rọi", "sườn heo", "chân giò", "móng giò",
    "giò heo", "tai heo", "đầu heo", "mặt heo", "thủ heo", "bì heo",
    "da heo", "mỡ heo", "lòng heo", "dồi heo", "huyết heo", "tiết heo",
    # --- Gà / gia cầm ---
    "gà", "vịt", "ngan", "chim", "bồ câu", "trĩ", "cút", "đà điểu",
    "gà con", "gà ta", "gà tây",
    # --- Nội tạng ---
    "lòng", "dồi", "gan", "mề", "cật", "tim", "phèo", "ruột",
    "óc", "tủy", "tiết", "huyết", "nội tạng",
    # --- Chế biến từ thịt ---
    "thịt", "thịt nguội", "pate", "pa tê", "xúc xích", "lạp xưởng",
    "dăm bông", "jambon", "bacon", "ham", "spam", "hotdog", "hot dog",
    "chả lụa", "giò chả", "giò lụa", "giò bò", "nem chua", "nem cuốn",
    "chả chiên", "chả nướng", "thịt xông khói", "thịt quay", "thịt kho",
    # --- Hải sản ---
    "tôm", "cua", "ghẹ", "tôm hùm", "tôm sú", "tôm thẻ", "tôm càng",
    "mực", "bạch tuộc", "hào", "hàu", "nghêu", "sò", "sò điệp",
    "ốc", "ốc mỡ", "ốc nhồi", "lươn", "unagi", "sứa",
    "thanh cua", "kani", "ebi", "hotate",
    "hải sản", "seafood",
    # --- Cá ---
    "cá", "cá hồi", "cá ngừ", "cá thu", "cá basa", "cá lóc",
    "cá chép", "cá diêu hồng", "cá trê", "cá mú", "cá kèo",
    "salmon", "tuna", "mackerel", "snapper", "barramundi",
    "chả cá", "bánh cá", "sashimi", "takoyaki",
    # --- Ếch / baba / rắn ---
    "ếch", "baba", "rắn", "kỳ đà", "nhái",
    # --- Dim sum mặn ---
    "há cảo", "xíu mại",  # thường có tôm/thịt
    # --- Trứng (strict vegan) ---
    "trứng",        # bao gồm: trứng gà, trứng vịt, trứng muối, cà phê trứng...
    "egg", "roe",   # tiếng Anh
]

# Ngoại lệ: các từ trên nhưng trong ngữ cảnh CHAY
# (Bước 1 kiểm tra "chay" trong tên rồi mới tới bước 2 nên thực ra không cần,
# nhưng list này hỗ trợ debug / mở rộng sau này)
MEAT_EXCEPTIONS = [
    "chả cá chay", "cá chay", "tôm chay", "hải sản chay",
    "gà chay", "thịt chay", "bò chay", "nem chay",
    "chả giò chay", "lạp xưởng chay",
]

# ---------------------------------------------------------------------------
# PURE VEGETARIAN KEYWORDS
# Tên món chứa bất kỳ từ này (VÀ không có từ thịt) → CHAY
# ---------------------------------------------------------------------------

# Đồ uống không cồn thường là chay
DRINKS = [
    "cà phê", "cafe", "café", "coffee", "espresso", "americano",
    "latte", "cappuccino", "macchiato", "cortado", "flat white",
    "cold brew", "pour over", "drip coffee",
    "trà ", "trà sữa", "hồng trà", "lục trà", "trà xanh", "matcha",
    "oolong", "pu-erh", "trà đen", "trà cam", "trà vải", "trà hibiscus",
    "trà hibiscus", "trà nho", "trà dâu", "trà bưởi",
    "kombucha", "kefir",
    "nước ép", "nước cam", "nước chanh", "nước dừa", "nước mía",
    "nước táo", "nước cốt dừa", "nước suối", "nước lọc",
    "sinh tố", "smoothie", "frappe",
    "soda", "sprite", "fanta", "pepsi", "coca", "7up", "redbull",
    "bạc xỉu",  # cà phê + sữa → chay
    "sữa chua",  # sữa lên men → chay
    "sữa tươi",
    "kefir",
    "cam vắt", "chanh vắt", "chanh muối",
    "rau má", "bí đao", "mướp đắng",
    "trà sữa gấu", "sữa gấu",
]

# Tráng miệng / bánh ngọt / kem (thường chay, trừ khi có thịt)
DESSERTS = [
    "kem ", "kem tươi", "kem que", "kem gelato", "kem mochi",
    "chè ", "chè đậu", "chè bưởi", "chè thái", "chè khúc bạch",
    "tào phớ", "tàu hũ", "sương sáo", "sương sa", "rau câu",
    "bánh flan", "flan ", "custard",
    "bánh trôi", "bánh chay", "bánh ít", "bánh dẻo", "bánh pía",
    "bánh trung thu", "bánh mochi", "mochi",
    "pudding", "mousse",   # thường chay (trừ mousse thịt)
    "tiramisu",            # chứa mascarpone/trứng nhưng không phải thịt → xét chay theo định nghĩa lacto-ovo
    "panna cotta",
    "waffle", "pancake", "crepe",  # bản ngọt thường chay
    "donut", "doughnut",
    "cookie", "bánh quy", "bánh bông lan", "bánh kem",
    "brownie", "muffin", "cupcake", "scone",
    "macaroon", "macaron",
    "eclair", "profiterole", "croissant",
    "cheesecake", "bánh phô mai",
    "bánh su kem",
]

# Rau / củ / nấm / đậu thuần tuý
PURE_VEG_FOOD = [
    # Đậu hũ
    "đậu hũ", "đậu hủ", "đậu phụ", "tàu hũ", "tào phớ",
    "tofu", "tempeh", "edamame",
    # Nấm
    "nấm", "nấm rơm", "nấm hương", "nấm kim châm", "nấm đùi gà",
    "nấm shiitake", "nấm bào ngư", "nấm truffle",
    # Rau xanh
    "rau muống", "rau cải", "rau dền", "rau lang", "rau húng",
    "rau ngổ", "rau sống", "rau xà lách", "xà lách", "cải xanh",
    "cải ngọt", "cải thảo", "bắp cải", "súp lơ", "broccoli",
    "bông cải", "cải bó xôi", "spinach", "kale", "arugula",
    # Củ quả
    "khoai tây", "khoai lang", "khoai môn", "khoai mì", "sắn",
    "bí đỏ", "bí xanh", "bí ngòi", "cà tím", "cà chua",
    "ớt chuông", "ớt ngọt", "ngô", "bắp", "cà rốt", "củ cải",
    "củ dền", "củ sen", "măng", "măng tây", "asparagus",
    "đậu bắp", "đậu que", "đậu Hà Lan", "đậu xanh", "đậu đen",
    "đậu đỏ", "đậu lăng", "lentil",
    "hành tây", "tỏi", "gừng", "nghệ", "sả",
    # Salad / gỏi chay
    "salad trái cây", "salad rau", "gỏi xoài", "gỏi đu đủ",
    "gỏi cuốn chay", "rau củ xào",
    # Cơm chay đặc trưng
    "cơm chay", "bún chay", "phở chay", "hủ tiếu chay",
    "lẩu chay", "lẩu nấm", "lẩu rau",
    # Bánh chay
    "bánh cuốn chay", "bánh tráng chay",
    # Trái cây
    "trái cây", "hoa quả", "nước trái cây",
    "xoài", "dứa", "thơm", "dưa hấu", "dưa lưới", "dưa vàng",
    "dâu tây", "dâu rừng", "việt quất", "blueberry", "raspberry",
    "cherry", "nho", "chuối", "cam", "quýt", "bưởi", "chanh",
    "ổi", "mận", "đào", "mơ", "lê", "táo", "kiwi", "đu đủ",
    "na", "mãng cầu", "sapoche", "lychee", "vải", "nhãn",
    "chôm chôm", "sầu riêng", "măng cụt", "thanh long",
    "bơ",  # trái bơ (avocado) — vẫn dùng thêm check
    # Hạt / ngũ cốc chay
    "hạt chia", "hạt lanh", "granola", "yến mạch", "oatmeal",
    "ngũ cốc", "muesli",
    # Món chay đặc biệt
    "hummus", "falafel",
    "bánh mì nướng muối ớt",   # thường chay
]

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _nfc(s: str) -> str:
    """Chuẩn hóa Unicode NFC để tránh lỗi so sánh chuỗi tiếng Việt."""
    return unicodedata.normalize("NFC", s)

# Normalize tất cả keyword list một lần khi load module
_DRINKS_LOWER  = [_nfc(k.lower()) for k in DRINKS]
_DESERTS_LOWER = [_nfc(k.lower()) for k in DESSERTS]
_PUREVEG_LOWER = [_nfc(k.lower()) for k in PURE_VEG_FOOD]

# MEAT dùng regex word-boundary để tránh false-positive ("rắn" trong "trắng")
_MEAT_PATTERN = re.compile(
    "|".join(rf"(?<![\w])(?:{re.escape(_nfc(k.lower()))})(?![\w])"
              for k in MEAT_KEYWORDS),
    re.UNICODE,
)

def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(kw in text for kw in keywords)

def _meat_hit(text: str) -> bool:
    return bool(_MEAT_PATTERN.search(text))


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def is_vegetarian(name: str) -> bool:
    n = _nfc(name.lower())  # NFC normalize để tránh lỗi Unicode tiếng Việt

    # 1. Có chữ "chay" → LUÔN chay (kể cả "gà chay", "tôm chay")
    if re.search(r"\bchay\b", n):
        return True

    # 2. Kiểm tra từ thịt / hải sản / cá / trứng → KHÔNG CHAY (dùng word boundary)
    if _meat_hit(n):
        return False

    # 3. Là đồ uống → chay
    if _contains_any(n, _DRINKS_LOWER):
        return True

    # 4. Là tráng miệng / bánh ngọt → chay
    if _contains_any(n, _DESERTS_LOWER):
        return True

    # 5. Là rau / củ / nấm / đậu / trái cây thuần tuý → chay
    if _contains_any(n, _PUREVEG_LOWER):
        return True

    # Mặc định: không xác định được → coi là KHÔNG CHAY (safe fallback)
    return False


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

TESTS: list[tuple[str, bool]] = [
    # --- Chắc chắn CHAY ---
    ("Cà Phê Sữa",                      True),
    ("Bạc Xỉu",                         True),
    ("Trà Sữa Trân Châu",               True),
    ("Cold Brew Dừa",                   True),
    ("Kombucha Bưởi Hồng",              True),
    ("Nước Ép Cà Rốt Táo Chanh",        True),
    ("Sinh Tố Bơ",                      True),
    ("Sữa Chua Dâu Rừng",               True),
    ("Kem Dừa",                         True),
    ("Chè Đậu Đỏ",                      True),
    ("Tào Phớ Trân Châu",               True),
    ("Flan Cốt Dừa",                    True),
    ("Bánh Tiramisu",                   True),
    ("Panna Cotta Việt Quất",           True),
    ("Mousse Dâu",                      True),
    ("Waffle Trái Cây",                 True),
    ("Pancake Chuối",                   True),
    ("Bánh Kem Dâu",                    True),
    ("Croissant",                       True),
    ("Đậu Hũ Chiên Sả",                 True),
    ("Đậu Phụ Sốt Cà Chua",            True),
    ("Tàu Hũ Trắng Trân Châu",         True),
    ("Rau Củ Xào Nấm",                  True),
    ("Nấm Hương Xào Bơ",               True),
    ("Khoai Tây Chiên Giòn",            True),
    ("Khoai Lang Chiên Phô Mai",        True),
    ("Salad Trái Cây",                  True),
    ("Gỏi Xoài Khô",                    True),  # khô chay (không thịt)
    ("Cơm Chay",                        True),
    ("Phở Chay",                        True),
    ("Bún Chay",                        True),
    ("Lẩu Nấm Chay",                    True),
    ("Chả Giò Chay",                    True),
    ("Gà Chay Xào Sả Ớt",              True),   # gà chay
    ("Bánh Mì Nướng Muối Ớt",          True),
    ("Nước Ép Dưa Hấu Dứa",            True),
    ("Trà Hibiscus Bưởi Hồng",         True),
    ("Matcha Latte",                    True),
    ("Espresso",                        True),
    ("Coca-Cola",                       True),
    ("Sprite",                          True),
    ("Granola Sữa Chua",               True),
    ("Oatmeal Chuối",                   True),
    ("Hummus Bánh Mì",                  True),
    ("Bánh Bông Lan",                   True),
    ("Bánh Quy Socola",                 True),
    # --- Chắc chắn KHÔNG CHAY ---
    ("Phở Bò",                          False),
    ("Bún Chả Giò",                     False),
    ("Cơm Gà Đùi Lớn",                 False),
    ("Bún Bò Huế",                      False),
    ("Mì Ramen Thịt Heo",              False),
    ("Cơm Tấm Sườn Bì Chả",           False),
    ("Lẩu Hải Sản",                    False),
    ("Cơm Chiên Hải Sản",              False),
    ("Cá Hồi Sốt Teri",                False),
    ("Tôm Hùm Nướng",                  False),
    ("Mực Chiên Giòn",                  False),
    ("Ốc Mỡ Cháy Tỏi",                False),
    ("Hàu Nướng Mọi",                  False),
    ("Sò Huyết Xào Tỏi",              False),
    ("Cua Rang Muối",                  False),
    ("Gà Rán Giòn",                    False),
    ("Vịt Nướng Chao",                 False),
    ("Bò Bít Tết",                     False),
    ("Sườn Nướng BBQ",                 False),
    ("Lòng Heo Xào Dứa",              False),
    ("Xúc Xích Đức Nướng",            False),
    ("Lạp Xưởng Tươi Nướng",          False),
    ("Chả Lụa Chiên",                  False),
    ("Sandwich Kẹp Jambon",            False),
    ("Bánh Mì Pate",                   False),
    ("Nem Chua Rán",                   False),
    ("Cà Phê Trứng",                   False),  # trứng → không chay (lacto-ovo tùy quan điểm, nhưng ta dùng strict)
    ("Corndog Xúc Xích",               False),
    ("Hotdog",                         False),
    ("Takoyaki",                       False),
    ("Háo Cảo Tôm",                    False),
    ("Xíu Mại Thịt",                   False),
    ("Bánh Cuốn Tôm Thịt",            False),
    ("Bún Cá Lóc",                     False),
    ("Chả Cá Lã Vọng",                False),
    ("Cháo Gà",                        False),  # gà → không chay
    ("Miến Gà",                        False),
    ("Canh Cua",                       False),
    ("Ếch Xào Sả Ớt",                 False),
]


def run_self_test() -> bool:
    print("=" * 64)
    print("SELF-TEST  is_vegetarian")
    print("=" * 64)
    passed = failed = 0
    for name, expected in TESTS:
        result = is_vegetarian(name)
        if result == expected:
            passed += 1
        else:
            label = "CHAY" if expected else "MAN"
            print(f"  [FAIL] {name!r}")
            print(f"         got:      {'CHAY' if result else 'MAN'}")
            print(f"         expected: {label}")
            failed += 1

    print(f"\n  Ket qua: {passed} pass / {failed} fail (/{len(TESTS)} cases)")
    print("=" * 64)
    return failed == 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ok = run_self_test()
    if not ok:
        print("\n[WARN] Co test that bai. Tiep tuc? (y/n): ", end="", flush=True)
        if input().strip().lower() != "y":
            print("Huy.")
            return

    print(f"\n[READ] Doc: {DISHES_PATH}")
    t0 = time.perf_counter()
    with open(DISHES_PATH, encoding="utf-8") as f:
        dishes: list[dict] = json.load(f)
    total = len(dishes)
    print(f"[OK] {total:,} mon an\n")

    veg_count = 0
    non_veg_count = 0

    for dish in dishes:
        veg = is_vegetarian(dish.get("name", ""))
        dish["is_vegetarian"] = veg
        if veg:
            veg_count += 1
        else:
            non_veg_count += 1

    elapsed = time.perf_counter() - t0

    print(f"[WRITE] Ghi de {DISHES_PATH.name} ...")
    with open(DISHES_PATH, "w", encoding="utf-8") as f:
        json.dump(dishes, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*52}")
    print(f"  THONG KE VEGETARIAN")
    print(f"{'='*52}")
    print(f"  Tong mon       : {total:>8,}")
    print(f"  Chay (True)    : {veg_count:>8,}  ({veg_count/total*100:.1f}%)")
    print(f"  Man (False)    : {non_veg_count:>8,}  ({non_veg_count/total*100:.1f}%)")
    print(f"\n  Thoi gian: {elapsed:.2f}s")
    print(f"{'='*52}")

    print("\n[SAMPLE] 5 mon chay (is_vegetarian=True):")
    for d in [x for x in dishes if x.get("is_vegetarian")][:5]:
        print(f"  {d['name']!r}")
    print("\n[SAMPLE] 5 mon man (is_vegetarian=False):")
    for d in [x for x in dishes if not x.get("is_vegetarian")][:5]:
        print(f"  {d['name']!r}")


if __name__ == "__main__":
    main()
