import asyncio
import json
import os
import random
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from playwright.async_api import BrowserContext, Page, async_playwright

# ================= CONFIG =================
INPUT_FILE = "data.json"
OUTPUT_FILE = "data.json"
CHECKPOINT_FILE = "checkpoint_opening_hours.txt"
FAILED_FILE = "failed_opening_hours.log"
BACKUP_FILE = "data.before_opening_hours.backup.json"

# None = chạy từ checkpoint tới hết data.json
MAX_ITEMS: Optional[int] = None

HEADLESS = False
CONCURRENCY = 3

DELAY_RANGE = (0.4, 1.0)
WAIT_AFTER_GOTO = 3.5
PAGE_TIMEOUT_MS = 60000
RETRY_PER_ITEM = 2

FORCE_RECRAWL = False
STOP_ON_FINAL_FAILURE = False
# ==========================================


def atomic_write_text(path: str, text: str) -> None:
    tmp_path = f"{path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp_path, path)


def atomic_write_json(path: str, data: Any) -> None:
    tmp_path = f"{path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def load_data() -> List[dict]:
    if not Path(INPUT_FILE).exists():
        raise FileNotFoundError(f"Không tìm thấy {INPUT_FILE}")
    data = json.load(open(INPUT_FILE, encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{INPUT_FILE} phải là JSON array")
    return data


def save_all(data_list: List[dict]) -> None:
    atomic_write_json(OUTPUT_FILE, data_list)


def ensure_backup_exists() -> None:
    if Path(BACKUP_FILE).exists():
        return
    if Path(INPUT_FILE).exists():
        atomic_write_json(BACKUP_FILE, json.load(open(INPUT_FILE, encoding="utf-8")))


def load_checkpoint() -> int:
    if not Path(CHECKPOINT_FILE).exists():
        return 0
    raw = Path(CHECKPOINT_FILE).read_text(encoding="utf-8").strip()
    return int(raw) if raw else 0


def save_checkpoint(i: int) -> None:
    atomic_write_text(CHECKPOINT_FILE, str(i))


def record_failure(index: int, name: str, url: str, reason: str) -> None:
    import time
    line = (
        f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] "
        f"index={index} name={name} url={url} reason={reason}\n"
    )
    with open(FAILED_FILE, "a", encoding="utf-8") as f:
        f.write(line)


async def sleep_random() -> None:
    await asyncio.sleep(random.uniform(*DELAY_RANGE))


def needs_processing(item: dict) -> bool:
    restaurant = item.get("restaurant") or {}
    foody_url = restaurant.get("foody_url")
    opening_hours = restaurant.get("opening_hours")
    if not foody_url:
        return False
    if FORCE_RECRAWL:
        return True
    return not bool(opening_hours)


def extract_opening_hours(html: str) -> Optional[str]:
    patterns = [
        r'class="itsopen"[^>]*>.*?</span>\s*<span[^>]*>&nbsp;([\d: -]+)</span>',
        r'Thời gian hoạt động.*?&nbsp;([\d: -]+)</span>',
        r'Giờ mở cửa.*?([\d]{1,2}:\d{2}\s*-\s*[\d]{1,2}:\d{2})',
        r'Open time.*?([\d]{1,2}:\d{2}\s*-\s*[\d]{1,2}:\d{2})',
    ]
    for pattern in patterns:
        m = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
        if m:
            value = re.sub(r"\s+", " ", m.group(1)).strip()
            return value
    return None


async def crawl_opening_hours(page: Page, foody_url: str, slot_name: str) -> Optional[str]:
    await page.goto(foody_url, timeout=PAGE_TIMEOUT_MS, wait_until="domcontentloaded")
    await asyncio.sleep(WAIT_AFTER_GOTO)
    html = await page.content()
    hours = extract_opening_hours(html)
    if hours:
        return hours

    # Fallback: scroll nhẹ rồi đọc lại HTML
    for _ in range(2):
        await page.mouse.wheel(0, 2500)
        await asyncio.sleep(1.0)
    html = await page.content()
    hours = extract_opening_hours(html)
    if hours:
        return hours

    # Fallback text search
    body_text = await page.locator("body").inner_text(timeout=5000)
    m = re.search(r'(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})', body_text)
    return m.group(1).strip() if m else None


class SharedState:
    def __init__(self, all_data: List[dict], start: int):
        self.all_data = all_data
        self.done_indices = set()
        self.failed_indices = set()
        self.next_checkpoint = start
        self.stop_requested = False
        self.lock = asyncio.Lock()

    async def mark_done(self, index: int) -> None:
        async with self.lock:
            self.done_indices.add(index)
            while self.next_checkpoint in self.done_indices:
                self.next_checkpoint += 1
            save_checkpoint(self.next_checkpoint)

    async def on_success(self, index: int, hours: Optional[str]) -> None:
        async with self.lock:
            restaurant = self.all_data[index].setdefault("restaurant", {})
            restaurant["opening_hours"] = hours
            self.done_indices.add(index)
            save_all(self.all_data)
            while self.next_checkpoint in self.done_indices:
                self.next_checkpoint += 1
            save_checkpoint(self.next_checkpoint)

    async def on_failure(self, index: int, name: str, url: str, reason: str) -> None:
        async with self.lock:
            if index in self.failed_indices:
                return
            self.failed_indices.add(index)
            record_failure(index, name, url, reason)
            if STOP_ON_FINAL_FAILURE:
                self.stop_requested = True


async def process_one_item(context: BrowserContext, item: dict, slot_name: str) -> Optional[str]:
    restaurant = item.get("restaurant") or {}
    foody_url = restaurant.get("foody_url")
    if not foody_url:
        return None

    page = await context.new_page()
    try:
        return await crawl_opening_hours(page, foody_url, slot_name)
    finally:
        await page.close()


async def worker(name: str, context: BrowserContext, queue: asyncio.Queue, state: SharedState) -> None:
    while True:
        if state.stop_requested and queue.empty():
            return

        try:
            index = await asyncio.wait_for(queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            if queue.empty():
                return
            continue

        item = state.all_data[index]
        restaurant = item.get("restaurant") or {}
        res_name = restaurant.get("name") or "(no name)"
        foody_url = restaurant.get("foody_url") or ""

        try:
            if not foody_url:
                print(f"⏭️ {name} [{index}] {res_name} | không có foody_url, bỏ qua")
                await state.mark_done(index)
                continue

            if not FORCE_RECRAWL and restaurant.get("opening_hours"):
                print(f"⏭️ {name} [{index}] {res_name} | đã có opening_hours, bỏ qua")
                await state.mark_done(index)
                continue

            print(f"\n🚀 {name} [{index}] {res_name}")
            success = False
            last_error: Optional[Exception] = None

            for attempt in range(1, RETRY_PER_ITEM + 2):
                try:
                    if attempt > 1:
                        print(f"  {name} 🔁 Retry {attempt - 1}/{RETRY_PER_ITEM}")
                    hours = await process_one_item(context, item, name)
                    await state.on_success(index, hours)
                    print(f"  {name} ✅ opening_hours: {hours or 'N/A'}")
                    success = True
                    break
                except Exception as e:
                    last_error = e
                    print(f"  {name} ❌ Attempt failed: {e}")
                    await asyncio.sleep(1.5)

            if not success:
                reason = str(last_error) if last_error else "Unknown error"
                await state.on_failure(index, res_name, foody_url, reason)
                print(f"  {name} ⛔ lỗi cuối cùng tại index {index}: {reason}")
                print(f"  {name} 📝 Đã ghi vào {FAILED_FILE}")
                if STOP_ON_FINAL_FAILURE:
                    print(f"  {name} 🛑 Ngừng cấp link mới.")
            await sleep_random()
        finally:
            queue.task_done()


async def async_main() -> None:
    ensure_backup_exists()
    all_data = load_data()
    start = load_checkpoint()

    if start >= len(all_data):
        print("✅ Checkpoint đã ở cuối file data.json")
        print(f"📦 Hiện có {len(all_data)} quán trong {OUTPUT_FILE}")
        return

    end = len(all_data) if MAX_ITEMS is None else min(start + MAX_ITEMS, len(all_data))

    print(f"📦 Tổng quán trong file: {len(all_data)}")
    print(f"▶️ Bắt đầu từ index: {start}")
    print(f"⏹️ Kết thúc tại index: {end - 1}")
    print(f"🗂️ Số tab song song: {CONCURRENCY}")
    print(f"💾 Output: {OUTPUT_FILE}")
    print(f"🧭 Checkpoint: {CHECKPOINT_FILE}\n")

    queue: asyncio.Queue = asyncio.Queue()
    for index in range(start, end):
        await queue.put(index)

    state = SharedState(all_data, start)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context()
        try:
            workers = [
                asyncio.create_task(worker(f"[TAB {i + 1}]", context, queue, state))
                for i in range(CONCURRENCY)
            ]
            await asyncio.gather(*workers)
        finally:
            await context.close()
            await browser.close()

    print(f"\n🎉 DONE! Đã cập nhật opening_hours trong {OUTPUT_FILE}")
    print(f"📍 Checkpoint hiện tại: {state.next_checkpoint}")


if __name__ == "__main__":
    asyncio.run(async_main())
