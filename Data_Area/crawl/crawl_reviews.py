import asyncio
import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, urlunparse

from playwright.async_api import BrowserContext, Page, async_playwright


# =========================================================
# CONFIG
# =========================================================
INPUT_FILE = "data.json"
OUTPUT_FILE = "reviews.json"
CHECKPOINT_FILE = "checkpoint_reviews.txt"
FAILED_FILE = "failed_reviews.log"
BACKUP_FILE = "reviews.backup.json"

STORAGE_STATE_FILE = "storage_state.json"

HEADLESS = False
CONCURRENCY = 3
MAX_ITEMS = None              # None = chạy từ checkpoint tới hết
MAX_REVIEWS_PER_RESTAURANT = None   # None = lấy hết có thể
FORCE_RECRAWL = False

PAGE_TIMEOUT_MS = 60000
WAIT_AFTER_GOTO_MS = 3500
SCROLL_ROUNDS = 10
SCROLL_PAUSE_MS = 1200
NO_NEW_REVIEW_STOP = 3
RETRY_PER_ITEM = 2
PROGRESS_EVERY = 20

APP_NAMESPACE = uuid.UUID("3d49f5a1-4a56-4b68-9e0a-99d8d0e7d243")


# =========================================================
# LOGGING
# =========================================================
def log(message: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {message}", flush=True)


def log_progress(prefix: str, index: int, total: int, extra: str = "") -> None:
    if total <= 0:
        return
    if index == 1 or index == total or index % PROGRESS_EVERY == 0:
        percent = (index / total) * 100
        suffix = f" | {extra}" if extra else ""
        log(f"{prefix}: {index}/{total} ({percent:.1f}%){suffix}")


# =========================================================
# FILE HELPERS
# =========================================================
def atomic_write_text(path: str, text: str) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def atomic_write_json(path: str, data: Any) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def backup_existing_output() -> None:
    if Path(OUTPUT_FILE).exists() and not Path(BACKUP_FILE).exists():
        atomic_write_json(BACKUP_FILE, json.load(open(OUTPUT_FILE, encoding="utf-8")))


def load_input_items() -> List[dict]:
    if not Path(INPUT_FILE).exists():
        raise FileNotFoundError(f"Không tìm thấy {INPUT_FILE}")
    data = json.load(open(INPUT_FILE, encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{INPUT_FILE} phải là JSON array")
    return data


def load_existing_reviews_output() -> List[dict]:
    if not Path(OUTPUT_FILE).exists():
        return []
    try:
        data = json.load(open(OUTPUT_FILE, encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def load_checkpoint() -> int:
    if not Path(CHECKPOINT_FILE).exists():
        return 0
    raw = Path(CHECKPOINT_FILE).read_text(encoding="utf-8").strip()
    return int(raw) if raw else 0


def save_checkpoint(i: int) -> None:
    atomic_write_text(CHECKPOINT_FILE, str(i))


def record_failure(index: int, res_id: str, url: str, reason: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(FAILED_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] index={index} res_id={res_id} url={url} reason={reason}\n")


async def sleep_ms(ms: int) -> None:
    await asyncio.sleep(ms / 1000)


# =========================================================
# PARSE HELPERS
# =========================================================
def normalize_space(text: Any) -> str:
    if text is None:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def stable_uuid(prefix: str, key: str) -> str:
    return str(uuid.uuid5(APP_NAMESPACE, f"{prefix}:{key}"))


def normalize_foody_comment_url(url: str) -> str:
    url = normalize_space(url)
    if not url:
        return ""

    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    if not path.endswith("/binh-luan"):
        path = f"{path}/binh-luan"

    return urlunparse((
        parsed.scheme or "https",
        parsed.netloc,
        path,
        "", "", ""
    ))


def parse_review_date(raw: Any) -> Optional[str]:
    text = normalize_space(raw)
    if not text:
        return None

    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$", text)
    if m:
        day = int(m.group(1))
        month = int(m.group(2))
        year = int(m.group(3))
        hour = int(m.group(4) or 0)
        minute = int(m.group(5) or 0)
        try:
            return datetime(year, month, day, hour, minute).isoformat()
        except ValueError:
            return text

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()
    except Exception:
        return text


def dedupe_reviews(reviews: List[dict]) -> List[dict]:
    seen = set()
    out = []
    for review in reviews:
        key = (
            review.get("reviewer_name"),
            review.get("date"),
            review.get("review_title"),
            review.get("text"),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(review)
    return out


# =========================================================
# DOM EXTRACTION
# =========================================================
async def click_if_exists(page: Page, selector: str) -> bool:
    try:
        locator = page.locator(selector).first
        if await locator.count() > 0 and await locator.is_visible():
            await locator.click(timeout=3000)
            return True
    except Exception:
        pass
    return False


async def ensure_comment_tab(page: Page) -> None:
    selectors = [
        "text=Bình luận",
        "a[href*='binh-luan']",
        "button:has-text('Bình luận')",
    ]
    for selector in selectors:
        if await click_if_exists(page, selector):
            await sleep_ms(1500)
            return


async def extract_criteria_scores(page: Page) -> Dict[str, Optional[float]]:
    body_text = await page.locator("body").inner_text()
    labels = ["Vị trí", "Giá cả", "Chất lượng", "Phục vụ", "Không gian"]
    result: Dict[str, Optional[float]] = {}

    for label in labels:
        pattern = rf"{label}\s+(\d+(?:\.\d+)?)"
        m = re.search(pattern, body_text, re.IGNORECASE)
        result[label.lower()] = float(m.group(1)) if m else None

    if all(v is None for v in result.values()):
        return {}
    return result


async def extract_reviews_from_dom(page: Page, res_id: str) -> List[dict]:
    data = await page.evaluate(
        r"""
        () => {
          function text(el) {
            return el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "";
          }

          function getFirst(root, selectors) {
            for (const sel of selectors) {
              const el = root.querySelector(sel);
              if (el) return el;
            }
            return null;
          }

          const cardSelectors = [
            ".review-item",
            ".review-item-container",
            ".list-reviews .review-item",
            ".reviews-list .review-item",
            ".review-list .review-item",
            ".review-list .review-item-container"
          ];

          let cards = [];
          for (const sel of cardSelectors) {
            const found = Array.from(document.querySelectorAll(sel));
            if (found.length > 0) {
              cards = found;
              break;
            }
          }

          if (cards.length === 0) {
            cards = Array.from(document.querySelectorAll("div")).filter(el => {
              const t = text(el);
              return t.includes("via Web") || t.includes("via iPhone") || t.includes("via Android");
            });
          }

          const out = [];
          for (const card of cards) {
            const reviewerName = text(getFirst(card, [
              ".ru-username a", ".ru-username", ".name a", ".name", ".username a", ".username"
            ]));

            const avatarEl = getFirst(card, [
              ".avatar img", ".review-user img", "img"
            ]);

            const title = text(getFirst(card, [
              ".rd-title", ".review-title", "h3", "h4", "b"
            ]));

            const body = text(getFirst(card, [
              ".rd-des", ".review-content", ".review-text", ".text"
            ]));

            const timeText = text(getFirst(card, [
              ".ru-time", ".review-time", ".time"
            ]));

            let ratingText = text(getFirst(card, [
              ".review-points", ".review-point", ".point", ".green", ".review-score"
            ]));

            if (!ratingText) {
              const nums = Array.from(card.querySelectorAll("*"))
                .map(el => text(el))
                .filter(x => /^\d+(\.\d+)?$/.test(x));
              if (nums.length > 0) ratingText = nums[0];
            }

            const reviewImages = Array.from(card.querySelectorAll(".rd-des img, .review-images img, .review-pics img, .images img, img"))
              .map(img => img.getAttribute("src") || img.getAttribute("data-src") || "")
              .filter(Boolean)
              .filter(src => !src.includes("avatar") && !src.includes("default") && !src.includes("icon"));

            const looksLikeReview = reviewerName || title || body || timeText || ratingText || reviewImages.length > 0;
            if (!looksLikeReview) continue;

            out.push({
              reviewer_name: reviewerName || null,
              reviewer_avatar_url: avatarEl ? (avatarEl.getAttribute("src") || avatarEl.getAttribute("data-src") || null) : null,
              review_title: title || null,
              rating_raw: ratingText || null,
              text: body || null,
              date_raw: timeText || null,
              review_images: reviewImages
            });
          }

          return out;
        }
        """
    )

    reviews: List[dict] = []
    for raw in data:
        reviewer_name = normalize_space(raw.get("reviewer_name")) or None
        reviewer_avatar_url = normalize_space(raw.get("reviewer_avatar_url")) or None
        review_title = normalize_space(raw.get("review_title")) or None
        text = normalize_space(raw.get("text")) or None
        date_iso = parse_review_date(raw.get("date_raw"))

        rating_raw = normalize_space(raw.get("rating_raw"))
        rating = None
        if rating_raw:
            m = re.search(r"\d+(?:\.\d+)?", rating_raw)
            if m:
                try:
                    rating = float(m.group(0))
                    if rating.is_integer():
                        rating = int(rating)
                except Exception:
                    rating = None

        review_images = [normalize_space(x) for x in (raw.get("review_images") or []) if normalize_space(x)]

        review_key = "|".join([
            res_id,
            reviewer_name or "",
            date_iso or "",
            review_title or "",
            text or "",
        ])
        review_id = stable_uuid("review", review_key)

        reviews.append({
            "id": review_id,
            "res_id": res_id,
            "reviewer_name": reviewer_name,
            "reviewer_avatar_url": reviewer_avatar_url,
            "review_title": review_title,
            "rating": rating,
            "text": text,
            "date": date_iso,
            "review_images": review_images,
        })

    reviews = dedupe_reviews(reviews)
    if MAX_REVIEWS_PER_RESTAURANT is not None:
        reviews = reviews[:MAX_REVIEWS_PER_RESTAURANT]
    return reviews


async def load_all_reviews(page: Page) -> None:
    last_count = -1
    stable_rounds = 0

    for _ in range(SCROLL_ROUNDS):
        await ensure_comment_tab(page)
        try:
            await page.mouse.wheel(0, 5000)
        except Exception:
            pass

        for selector in [
            "text=/Xem thêm/i",
            "text=/Xem thêm bình luận/i",
            "text=/Tải thêm/i",
            "button:has-text('Xem thêm')",
        ]:
            try:
                locator = page.locator(selector).first
                if await locator.count() > 0 and await locator.is_visible():
                    await locator.click(timeout=2000)
                    await sleep_ms(1000)
                    break
            except Exception:
                pass

        await sleep_ms(SCROLL_PAUSE_MS)

        current_count = len(await extract_reviews_from_dom(page, res_id="__temp__"))
        if current_count == last_count:
            stable_rounds += 1
        else:
            stable_rounds = 0
            last_count = current_count

        if stable_rounds >= NO_NEW_REVIEW_STOP:
            break


# =========================================================
# PER-RESTAURANT CRAWL
# =========================================================
async def crawl_one_restaurant(page: Page, res_id: str, foody_url: str) -> Dict[str, Any]:
    url = normalize_foody_comment_url(foody_url)
    if not url:
        return {
            "res_id": res_id,
            "foody_url": foody_url,
            "criteria_scores": {},
            "reviews": [],
        }

    await page.goto(url, timeout=PAGE_TIMEOUT_MS, wait_until="domcontentloaded")
    await sleep_ms(WAIT_AFTER_GOTO_MS)
    await ensure_comment_tab(page)
    await sleep_ms(1200)

    criteria_scores = await extract_criteria_scores(page)
    await load_all_reviews(page)
    reviews = await extract_reviews_from_dom(page, res_id=res_id)

    return {
        "res_id": res_id,
        "foody_url": foody_url,
        "criteria_scores": criteria_scores,
        "reviews": reviews,
    }


# =========================================================
# OUTPUT UPSERT
# =========================================================
def upsert_output_row(all_rows: List[dict], new_row: dict) -> List[dict]:
    new_res_id = new_row.get("res_id")
    for i, row in enumerate(all_rows):
        if row.get("res_id") == new_res_id:
            all_rows[i] = new_row
            return all_rows
    all_rows.append(new_row)
    return all_rows


class SharedState:
    def __init__(self, input_items: List[dict], output_rows: List[dict], start: int):
        self.input_items = input_items
        self.output_rows = output_rows
        self.done_indices = set()
        self.failed_indices = set()
        self.next_checkpoint = start
        self.lock = asyncio.Lock()

    async def mark_done(self, index: int, output_row: Optional[dict] = None) -> None:
        async with self.lock:
            if output_row is not None:
                self.output_rows = upsert_output_row(self.output_rows, output_row)
                atomic_write_json(OUTPUT_FILE, self.output_rows)

            self.done_indices.add(index)
            while self.next_checkpoint in self.done_indices:
                self.next_checkpoint += 1
            save_checkpoint(self.next_checkpoint)

    async def mark_failed(self, index: int, res_id: str, url: str, reason: str) -> None:
        async with self.lock:
            if index in self.failed_indices:
                return
            self.failed_indices.add(index)
            record_failure(index, res_id, url, reason)


# =========================================================
# WORKER
# =========================================================
async def process_one(context: BrowserContext, item: dict) -> dict:
    page = await context.new_page()
    try:
        restaurant = item.get("restaurant") or {}
        res_id = restaurant.get("id")
        foody_url = restaurant.get("foody_url")
        return await crawl_one_restaurant(page, res_id=res_id, foody_url=foody_url)
    finally:
        await page.close()


async def worker(name: str, context: BrowserContext, queue: asyncio.Queue, state: SharedState, total: int) -> None:
    while True:
        try:
            index = await asyncio.wait_for(queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            if queue.empty():
                return
            continue

        item = state.input_items[index]
        restaurant = item.get("restaurant") or {}
        res_id = normalize_space(restaurant.get("id"))
        res_name = normalize_space(restaurant.get("name")) or "(no name)"
        foody_url = normalize_space(restaurant.get("foody_url"))

        try:
            if not res_id:
                log(f"{name} [{index}] thiếu restaurant.id -> bỏ qua")
                await state.mark_done(index)
                continue

            if not foody_url:
                log(f"{name} [{index}] {res_name} -> không có foody_url, ghi rỗng")
                await state.mark_done(index, {
                    "res_id": res_id,
                    "foody_url": None,
                    "criteria_scores": {},
                    "reviews": [],
                })
                continue

            if not FORCE_RECRAWL:
                existed = next((x for x in state.output_rows if x.get("res_id") == res_id), None)
                if existed is not None:
                    log(f"{name} [{index}] {res_name} -> đã có trong reviews.json, bỏ qua")
                    await state.mark_done(index)
                    continue

            log(f"🚀 {name} [{index}] {res_name}")

            success = False
            last_error: Optional[Exception] = None

            for attempt in range(1, RETRY_PER_ITEM + 2):
                try:
                    if attempt > 1:
                        log(f"{name} [{index}] retry {attempt - 1}/{RETRY_PER_ITEM}")

                    output_row = await process_one(context, item)
                    await state.mark_done(index, output_row)

                    review_count = len(output_row.get("reviews") or [])
                    criteria_count = len(output_row.get("criteria_scores") or {})
                    log(f"✅ {name} [{index}] {res_name} | reviews={review_count} | criteria_scores={criteria_count}")
                    success = True
                    break
                except Exception as e:
                    last_error = e
                    log(f"❌ {name} [{index}] attempt failed: {e}")
                    await sleep_ms(1500)

            if not success:
                reason = str(last_error) if last_error else "Unknown error"
                await state.mark_failed(index, res_id, foody_url, reason)
                log(f"⛔ {name} [{index}] {res_name} thất bại: {reason}")

            done_count = len(state.done_indices | state.failed_indices)
            log_progress("Tiến độ reviews", done_count, total)

        finally:
            queue.task_done()


# =========================================================
# MAIN
# =========================================================
async def async_main() -> None:
    if not Path(STORAGE_STATE_FILE).exists():
        raise FileNotFoundError(f"Không tìm thấy {STORAGE_STATE_FILE}")

    backup_existing_output()

    input_items = load_input_items()
    output_rows = load_existing_reviews_output()
    start = load_checkpoint()

    if start >= len(input_items):
        log("Checkpoint đã ở cuối data.json")
        log(f"Hiện có {len(output_rows)} dòng trong {OUTPUT_FILE}")
        return

    end = len(input_items) if MAX_ITEMS is None else min(start + MAX_ITEMS, len(input_items))
    total = end - start

    log("=== BẮT ĐẦU CRAWL REVIEWS ===")
    log(f"Input: {INPUT_FILE}")
    log(f"Output: {OUTPUT_FILE}")
    log(f"Checkpoint: {CHECKPOINT_FILE}")
    log(f"Storage state: {STORAGE_STATE_FILE}")
    log(f"Bắt đầu từ index: {start}")
    log(f"Kết thúc tại index: {end - 1}")
    log(f"Số worker: {CONCURRENCY}")

    queue: asyncio.Queue = asyncio.Queue()
    for index in range(start, end):
        await queue.put(index)

    state = SharedState(input_items, output_rows, start)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(storage_state=STORAGE_STATE_FILE)

        try:
            workers = [
                asyncio.create_task(worker(f"[W{i+1}]", context, queue, state, total))
                for i in range(CONCURRENCY)
            ]
            await asyncio.gather(*workers)
        finally:
            await context.close()
            await browser.close()

    log("=== HOÀN TẤT CRAWL REVIEWS ===")
    log(f"Tổng số row trong {OUTPUT_FILE}: {len(state.output_rows)}")
    log(f"Checkpoint hiện tại: {state.next_checkpoint}")


if __name__ == "__main__":
    asyncio.run(async_main())
