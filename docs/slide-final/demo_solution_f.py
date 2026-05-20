"""
demo_solution_f.py
Minh hoa Giai phap F: Adaptive Distance Decay voi Density-Aware Scaling.
"""
import math
import types


def make(name, ranking_score, distance_m):
    c = types.SimpleNamespace()
    c.name = name
    c.ranking_score = ranking_score
    c.distance_m = distance_m
    return c


candidates = [
    make("Quan Lau Thai Cay",     1.85,  320),
    make("Pho Bo 24h",            1.72,  780),
    make("Nha Hang Bo Ne Ngon",   1.90, 4500),  # Diem cao nhung xa 4.5km
    make("Bun Bo Hue Minh Tam",   1.60, 1100),
    make("Chao Suon Ba Nam",      1.55,  450),
    make("Hai San Dai Duong",     1.95, 8200),  # Diem cao nhat nhung xa 8.2km
    make("Banh Mi Phuong",        1.40,  600),
]

NEARBY_RADIUS_M = 2_000
nearby_count = sum(1 for c in candidates if c.distance_m <= NEARBY_RADIUS_M)

if nearby_count >= 10:
    decay_scale = 2.0
    zone = "dong dan"
elif nearby_count >= 5:
    decay_scale = 4.0
    zone = "trung binh"
else:
    decay_scale = 8.0
    zone = "thua thot"

print("=" * 65)
print("  Demo Giai phap F: Adaptive Distance Decay (Density-Aware)")
print("=" * 65)
print(f"\n  So quan trong ban kinh 2km : {nearby_count}")
print(f"  decay_scale duoc chon     : {decay_scale}  (vung {zone})")
print(f"  Cong thuc: final = ai_score x exp(-dist_km / {decay_scale})")

SEP = "  " + "-" * 63
HDR = f"  {'Ten quan':<26} {'AI Score':>10} {'dist':>8} {'Decay':>8} {'Final':>8}"

# --- TRUOC DECAY ---
print(f"\n{SEP}")
print("  TRUOC decay -- thu tu LambdaMART goc (chi dua tren AI score):")
print(SEP)
print(f"  {'#':<4} {'Ten quan':<26} {'AI Score':>10} {'Khoang cach':>14}")
print(f"  {'-'*4} {'-'*26} {'-'*10} {'-'*14}")
for i, c in enumerate(sorted(candidates, key=lambda x: -x.ranking_score), 1):
    flag = " <-- DIEM CAO NHAT" if c.ranking_score >= 1.90 else ""
    print(f"  {i:<4} {c.name:<26} {c.ranking_score:>10.2f} {c.distance_m/1000:>12.1f}km{flag}")

# --- AP DUNG DECAY ---
for c in candidates:
    dist_km = c.distance_m / 1000.0
    c.final_score = c.ranking_score * math.exp(-dist_km / decay_scale)

candidates.sort(key=lambda c: c.final_score, reverse=True)

# --- SAU DECAY ---
print(f"\n{SEP}")
print("  SAU decay -- thu tu moi (can bang: AI score + khoang cach):")
print(SEP)
print(f"  {'#':<4} {'Ten quan':<26} {'AI':>6} {'km':>6} {'Decay':>8} {'Final':>8}  Ghi chu")
print(f"  {'-'*4} {'-'*26} {'-'*6} {'-'*6} {'-'*8} {'-'*8}  {'-'*20}")
for i, c in enumerate(candidates, 1):
    dist_km = c.distance_m / 1000.0
    decay = math.exp(-dist_km / decay_scale)
    if i == 1:
        note = "<-- TOP 1 (gan + ngon)"
    elif c.distance_m > 4000:
        note = "<-- bi day xuong (xa)"
    else:
        note = ""
    print(
        f"  {i:<4} {c.name:<26} {c.ranking_score:>6.2f} {dist_km:>6.1f}"
        f" {decay:>8.3f} {c.final_score:>8.2f}  {note}"
    )

print(f"\n{SEP}")
print("  Ket luan:")
print("  - 'Hai San Dai Duong' (AI: 1.95, xa 8.2km) bi day xuong cuoi")
print("  - 'Quan Lau Thai Cay' (AI: 1.85, chi 0.3km) len TOP 1")
print("  - Khong co 0 ket qua, chi thay doi thu tu uu tien")
print("=" * 65)
