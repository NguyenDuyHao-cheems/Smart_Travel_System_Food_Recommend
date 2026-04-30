# -*- coding: utf-8 -*-
"""
enrich_allergens.py  (rule-based, edge-case-aware)
Ghi de dishes.json voi allergens da duoc dien.
    python Data_Pipeline/enrich_allergens.py
"""

import json, sys, time
from collections import Counter
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT        = Path(__file__).resolve().parent.parent
DISHES_PATH = ROOT / "dishes.json"

# ---------------------------------------------------------------------------
# DAIRY — "sữa" tag
# Exclude: sữa dừa / sữa đậu / sữa hạt (không phải lactose)
# ---------------------------------------------------------------------------
DAIRY_INCLUDE = [
    "sữa","phô mai","phomai","cheese","cream","whipping",
    " bơ ","bơ tỏi","bơ mặn","bơ lạt","bơ pháp","bơ tươi","beurre",
    "bạc xỉu","latte","cappuccino","macchiato","mocha","cortado","flat white",
    "tiramisu",
    "panna cotta","pannacotta","bechamel","lasagna","quiche",
    "sô-cô-la sữa","socola sữa","chocolate sữa",
    "trà sữa","matcha sữa","hồng trà sữa","trà sữa",
    "kem cheese","kem tươi","kem bơ","kem sữa",
    "cafe sữa","café sữa","cà phê sữa","coffee sữa","cà phê trứng",
    "sữa gấu","sữa đặc",
    "fondue","raclette","gratin",
    "mousse",        # thường có whipping cream
    "mochi chấm kem sữa",
]
DAIRY_EXCLUDE = [
    "sữa dừa","sữa đậu","sữa hạt","sữa sen",
    "phô mai hạt điều",  # vegan cashew cheese
    "phô mai chay",      # vegan cheese
    "cheese chay",
]

# ---------------------------------------------------------------------------
# EGGS — "trứng" tag
# ---------------------------------------------------------------------------
EGG_INCLUDE = [
    "trứng","egg","trứng gà","trứng vịt","trứng cút","trứng muối",
    "trứng non","trứng ốp","trứng chiên","trứng luộc","trứng hấp",
    "ốp la","omelette","omelet","frittata",
    "custard","flan","pudding","chawanmushi","steamed egg",
    "mayonnaise","mayo","trứng mayo",
    "bánh bông lan","bánh kem",
    "tiramisu",          # mascarpone + trứng
    "cà phê trứng","coffee trứng",
    "hollandaise","meringue","soufflé","egg benedict",
    "katsudon","oyakodon","tamagoyaki",
    "trứng cá hồi",  # roe
]
EGG_EXCLUDE: list[str] = []

# ---------------------------------------------------------------------------
# GLUTEN — "gluten" tag
# Exclude: phở/bún/hủ tiếu/miến/bánh tráng/bánh cuốn/bèo/ướt/đúc/canh/cháo
# ---------------------------------------------------------------------------
GLUTEN_INCLUDE = [
    # -- Bánh mì & biến thể --
    "bánh mì","sandwich","sanwich","brioche","croissant","baguette","toast",
    "focaccia","bruschetta","bánh hoa cúc","bánh mì pháp",
    # -- Pasta & mì lúa mì --
    "pasta","spaghetti","penne","fettuccine","linguine","tagliatelle",
    "mì ý","mì ống","mì ramen","ramen","mì udon","udon",
    "mì soba",  # thường mix bột mì
    "mì xào","mì cay","mì trộn","mì bò","mì gà","mì hải sản",
    "mì vịt tiềm","mì hoành thánh","mì thịt","mì gói xào","mì gói",
    "mì quảng","cao lầu","mỳ ý","mỳ xào",
    # -- Dimsum / bao --
    "bánh bao","há cảo","xíu mại","hoành thánh","wonton",
    "dimsum","dim sum","gyoza","dumplings","pierogi",
    # -- Chiên xù / tẩm bột --
    "tempura","katsu","tonkatsu","katsudon","karaage","schnitzel",
    "panko","tẩm bột","chiên xù","fried chicken","gà rán",
    "corndog","hot dog",
    # -- Bánh ngọt có bột mì --
    "waffle","pancake","crepe","bánh crepe","bánh waffle","bánh pancake",
    "bánh quy","cookie","bánh cookie","churros","donut","bánh tiêu",
    "bánh su","eclair","profiterole","cronut",
    "cheesecake","bánh phô mai",  # đế bột mì
    "bánh bông lan","bánh kem","bánh ngọt",
    "pizza","calzone",
    "burger","hamburger",
    "muffin","cupcake","brownie","scone","pie",
    "naan","pita","tortilla","roti",
    "tiramisu",      # ladyfingers (savoiardi) = bột mì
    "takoyaki",      # vỏ bột mì
    "okonomiyaki",
    # -- Xúc xích / chế biến --
    "xúc xích","lạp xưởng","nem chua rán",
    # -- Mì cuốn --
    "sake panko",    # cá hồi tẩm bột bánh mì chiên
    # -- Combo có ghi rõ --
    "mì ý + pizza","combo 11","combo 23",
]
GLUTEN_EXCLUDE = [
    "phở","bún","hủ tiếu","hủ tíu","miến","bánh tráng",
    "bánh cuốn","bánh bèo","bánh ướt","bánh đúc","bánh canh",
    "bánh phở","cháo","bánh da lợn",
    "bánh xèo",
    "bánh khọt",
]

# ---------------------------------------------------------------------------
# HẢI SẢN — shellfish / crustaceans / mollusks / cephalopods
# ---------------------------------------------------------------------------
SHELLFISH_INCLUDE = [
    "tôm","cua","ghẹ","tôm hùm","tôm sú","tôm thẻ","tôm càng",
    "mực","bạch tuộc","takoyaki","tako","bạch tuộc","lươn","unagi",
    "hào","hàu","nghêu","sò","sò điệp","sò đỏ","sò huyết",
    "ốc","ốc mỡ","ốc nhồi","ốc luộc","scallop",
    "crab","shrimp","prawn","lobster","crawfish",
    "octopus","squid","calamari","clam","mussel","oyster",
    "hải sản","seafood","thập cẩm hải sản",
    "surf clam","surf clam nigiri",
    "sứa",           # jellyfish — hải sản
    "thanh cua","kani","imitation crab",
    "tom yum","tom kha",
    "chả ốc",
    "ebi",           # tôm tiếng Nhật
    "hotate",        # sò điệp tiếng Nhật
]
SHELLFISH_EXCLUDE: list[str] = []

# ---------------------------------------------------------------------------
# CÁ — fish
# Exclude: nước mắm (gia vị ẩn, không gán)
# ---------------------------------------------------------------------------
FISH_INCLUDE = [
    "cá hồi","salmon","sake ",  # sake = cá hồi trong thực đơn Nhật
    "cá ngừ","tuna",
    "cá thu","cá basa","cá lóc","cá chép","cá diêu hồng",
    "cá trout","cá trê","cá dứa","cá mú","cá kèo","cá đù",
    "cá linh","cá tai tượng","cá chiên","cá nướng","cá hấp","cá kho",
    "cá thập cẩm","cá tra",
    "snapper","barramundi","tilapia","catfish","mackerel",
    "chả cá","bánh cá","fish cake","fishcake",
    "fish","fish sauce",
    "lươn",          # eel — cá
    "unagi","anago",
    "sashimi",       # thường là cá
    "shiromi",       # cá thịt trắng
    "sake toro","sake kawa","sake furai","sake panko",
    "cuộn cá ngừ","salad cá",
    "bún cá","lẩu cá","hủ tiếu cá",
    "xiên chả cá",
]
FISH_EXCLUDE = [
    "nước mắm",      # gia vị
    "chả cá chay",   # vegan fish cake — không có cá thật
    "cá chay",
]

# ---------------------------------------------------------------------------
# ĐẬU PHỘNG / HẠT — "đậu phộng" tag
# ---------------------------------------------------------------------------
NUTS_INCLUDE = [
    "đậu phộng","lạc","peanut","peanut butter","bơ đậu phộng",
    "hạnh nhân","almond","phindi hạnh nhân",
    "hạt điều","cashew","phô mai hạt điều",
    "óc chó","walnut",
    "hạt macadamia","macadamia",
    "hạt dẻ","chestnut",
    "pistachio","pecan","hazelnut","praline","nougat",
    "marzipan","frangipane",
    "satay","pad thai",
    "nutella",
]
NUTS_EXCLUDE: list[str] = []

# ---------------------------------------------------------------------------
# ĐẬU NÀNH — "đậu nành" tag
# ---------------------------------------------------------------------------
SOY_INCLUDE = [
    "đậu nành","soy","đậu hũ","đậu hủ","tàu hũ","tào phớ","đậu phụ",
    "tofu","tempeh","edamame","miso","natto","tamari",
    "teriyaki","sốt teri",  # teriyaki/teri sauce = đậu nành
    "hoisin","tương hoisin","tương đậu",
    "sữa đậu","sữa đậu nành",
]
SOY_EXCLUDE = [
    "đậu xanh","đậu đỏ","đậu hà lan","đậu đen",
]


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def _hit(name: str, include: list[str], exclude: list[str]) -> bool:
    return (
        not any(ex in name for ex in exclude)
        and any(kw in name for kw in include)
    )


def detect_allergens(name: str) -> list[str]:
    n = name.lower()
    out: list[str] = []
    if _hit(n, DAIRY_INCLUDE,     DAIRY_EXCLUDE):    out.append("sữa")
    if _hit(n, EGG_INCLUDE,       EGG_EXCLUDE):      out.append("trứng")
    if _hit(n, GLUTEN_INCLUDE,    GLUTEN_EXCLUDE):   out.append("gluten")
    if _hit(n, SHELLFISH_INCLUDE, SHELLFISH_EXCLUDE):out.append("hải sản")
    if _hit(n, FISH_INCLUDE,      FISH_EXCLUDE):     out.append("cá")
    if _hit(n, NUTS_INCLUDE,      NUTS_EXCLUDE):     out.append("đậu phộng")
    if _hit(n, SOY_INCLUDE,       SOY_EXCLUDE):      out.append("đậu nành")
    return out


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

TESTS: list[tuple[str, list[str]]] = [
    # --- Dairy ---
    ("Cà Phê Sữa",                           ["sữa"]),
    ("Bạc Xỉu",                              ["sữa"]),
    ("Panna cotta",                          ["sữa"]),
    ("Tiramisu",                             ["sữa", "trứng", "gluten"]),
    ("Sữa dừa thạch",                        []),
    ("Sữa Đậu Nành",                         ["đậu nành"]),
    ("Mousse dâu",                           ["sữa"]),
    ("Cafe latte đá",                        ["sữa"]),
    ("Matcha latte sữa gấu",                 ["sữa"]),
    # --- Eggs ---
    ("Cà phê trứng",                         ["sữa", "trứng"]),
    ("Flan Cafe Cheese",                     ["sữa", "trứng"]),
    ("Flan cốt dừa",                         ["trứng"]),
    ("FLAN NƯỚNG",                           ["trứng"]),
    ("Trứng mayo",                           ["trứng"]),
    ("Trứng cút chiên 20 trứng",             ["trứng"]),
    ("Sanwich Kẹp Jambon + Trứng",           ["trứng", "gluten"]),
    ("Katsudon",                             ["trứng", "gluten"]),
    ("Trà olong lài sữa trân châu đen pudding trứng", ["sữa", "trứng"]),
    # --- Gluten ---
    ("Mỳ ý bò bằm đút lò",                  ["gluten"]),
    ("Corndog xúc xích phô mai ngũ sắc",    ["sữa", "gluten"]),
    ("Bánh mì Pate phomai tan chảy",         ["sữa", "gluten"]),
    ("Bánh mì hoa cúc Pháp",                 ["gluten"]),
    ("Mì Ramen Xào Hải Sản",                 ["gluten", "hải sản"]),
    ("Udon hải sản nước",                    ["gluten", "hải sản"]),
    ("Takoyaki",                             ["gluten", "hải sản"]),
    ("Tempura tôm",                          ["gluten", "hải sản"]),
    ("Gà Chiên Karaage",                     ["gluten"]),
    ("COMBO 11: Combo Mì Ý + Pizza",         ["gluten"]),
    ("Xúc xích Đức nướng sốt BBQ",           ["gluten"]),
    # --- Gluten EXCLUDE ---
    ("Phở bò",                               []),
    ("Bún Chả Giò Chay",                     []),
    ("Hủ tiếu nam vang nước",                []),
    ("Bánh tráng cuộn phô mai",              ["sữa"]),
    ("Bánh cuốn tôm",                        ["hải sản"]),
    ("Miến măng đầu cổ",                     []),
    ("Cháo gà",                              []),
    # --- Shellfish ---
    ("Cơm chiên hải sản",                    ["hải sản"]),
    ("Ốc mỡ cháy tỏi",                       ["hải sản"]),
    ("Ốc nhồi ba sa",                        ["hải sản"]),
    ("Sứa sốt thái",                         ["hải sản"]),
    ("Hàu nướng mọi 2 con",                  ["hải sản"]),
    ("Sò đỏ Nhật",                           ["hải sản"]),
    ("Takoyaki nhân sò huyết 8 viên",        ["gluten", "hải sản"]),
    ("Hamburger Tôm Phô Mai",                ["sữa", "gluten", "hải sản"]),
    # --- Fish ---
    ("Cá Hồi Sốt Teri",                      ["cá", "đậu nành"]),
    ("Cá hồi sốt phô mai",                   ["sữa", "cá"]),
    ("Cuộn cá ngừ cay",                      ["cá"]),
    ("Salad Cá ngừ",                         ["cá"]),
    ("Sake panko. Cơm cuộn cá hồi tẩm bột bánh mì chiên", ["gluten", "cá"]),
    ("Chả cá Lã Vọng",                       ["cá"]),
    ("Hủ tiếu cá lóc",                       ["cá"]),
    ("Sashimi 3 Loại Cá Trích",              ["cá"]),
    ("Chả cá chay",                          []),   # chả cá chay = không cá thật
    # --- Nuts ---
    ("Hạt điều rang muối",                   ["đậu phộng"]),
    ("Phô Mai Hạt Điều Chay",                ["đậu phộng"]),
    ("Phindi Hạnh Nhân",                     ["đậu phộng"]),
    # --- Soy ---
    ("Đậu hũ chiên sả",                      ["đậu nành"]),
    ("Đậu hủ chiên nước mắm",                ["đậu nành"]),
    ("Tàu Hũ Trắng Trân Châu Đường Đen",     ["đậu nành"]),
    ("Tào phớ",                              ["đậu nành"]),
    ("Cá Hồi Sốt Teriyaki",                  ["cá", "đậu nành"]),
    # --- Empty ---
    ("Khoai tây chiên giòn",                 []),
    ("Trà Vải",                              []),
    ("Nước ép dưa hấu",                      []),
    ("Coca-Cola",                            []),
    ("Rau Củ Xào Nấm",                       []),
    ("Cơm gà đùi lớn",                       []),
]


def run_self_test() -> bool:
    print("=" * 64)
    print("SELF-TEST")
    print("=" * 64)
    passed = failed = 0
    for name, expected in TESTS:
        result   = sorted(detect_allergens(name))
        expected = sorted(expected)
        if result == expected:
            passed += 1
        else:
            print(f"  [FAIL] {name!r}")
            print(f"         got:      {result}")
            print(f"         expected: {expected}")
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

    counter: Counter = Counter()
    no_allergen = 0
    for dish in dishes:
        tags = detect_allergens(dish.get("name", ""))
        dish["allergens"] = tags
        if tags:
            for t in tags: counter[t] += 1
        else:
            no_allergen += 1

    elapsed = time.perf_counter() - t0

    print(f"[WRITE] Ghi de {DISHES_PATH.name} ...")
    with open(DISHES_PATH, "w", encoding="utf-8") as f:
        json.dump(dishes, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*52}")
    print(f"  THONG KE ALLERGENS")
    print(f"{'='*52}")
    print(f"  Tong mon         : {total:>8,}")
    print(f"  Khong allergen   : {no_allergen:>8,}  ({no_allergen/total*100:.1f}%)")
    print(f"  Co >= 1 tag      : {total-no_allergen:>8,}  ({(total-no_allergen)/total*100:.1f}%)")
    print(f"\n  Phan phoi tag:")
    for tag, cnt in counter.most_common():
        bar = "=" * (cnt * 28 // max(counter.values(), default=1))
        print(f"    {tag:<15} {cnt:>7,}  {bar}")
    print(f"\n  Thoi gian: {elapsed:.2f}s")
    print(f"{'='*52}")

    print("\n[SAMPLE] 5 mon co allergen:")
    for d in [x for x in dishes if x.get("allergens")][:5]:
        print(f"  {d['name']!r}  ->  {d['allergens']}")
    print("\n[SAMPLE] 3 mon khong allergen:")
    for d in [x for x in dishes if not x.get("allergens")][:3]:
        print(f"  {d['name']!r}  ->  []")


if __name__ == "__main__":
    main()
