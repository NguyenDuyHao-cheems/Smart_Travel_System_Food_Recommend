import asyncio
import json
import os
import random
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

from playwright.async_api import BrowserContext, Page, async_playwright


class SkipNoFoodyUrl(Exception):
    pass

# ================= CONFIG =================
INPUT_FILE = "links.txt"
OUTPUT_FILE = "data.json"
CHECKPOINT_FILE = "checkpoint.txt"
FAILED_FILE = "failed_links.log"

# None = chạy từ checkpoint tới hết file links.txt
MAX_LINKS: Optional[int] = None

# Giữ giao diện để hạn chế lỗi chặn / load thiếu
HEADLESS = False

# Số tab chạy song song
CONCURRENCY = 3

# Chậm vừa phải để ổn định hơn
DELAY_RANGE = (0.4, 1.0)
WAIT_AFTER_GOTO = 3.5
SCROLL_TIMES = 4
SCROLL_PAUSE = 0.8
RESPONSE_WAIT_TIMEOUT = 8.0
DETAIL_WAIT_TIMEOUT = 18.0
DISH_WAIT_TIMEOUT = 14.0
FINAL_BUFFER_WAIT = 1.0
SOFT_RELOAD_ON_EMPTY = True

# Số lần thử lại cho mỗi link, không tính lần đầu
RETRY_PER_LINK = 2

# Nếu 1 link lỗi hết retry thì ngừng cấp link mới.
# Các tab đang chạy dở vẫn hoàn tất, checkpoint sẽ chỉ tiến đến đoạn liên tục đã xong.
STOP_ON_FINAL_FAILURE = True
# ==========================================

APP_NAMESPACE = uuid.UUID("7db31f03-4398-4f41-bf62-4fa2f4fdcb20")


async def sleep_random() -> None:
    await asyncio.sleep(random.uniform(*DELAY_RANGE))


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


def load_links() -> List[str]:
    return [l.strip() for l in open(INPUT_FILE, encoding="utf-8") if l.strip()]


def load_checkpoint() -> int:
    if not Path(CHECKPOINT_FILE).exists():
        return 0
    raw = Path(CHECKPOINT_FILE).read_text(encoding="utf-8").strip()
    return int(raw) if raw else 0


def save_checkpoint(i: int) -> None:
    atomic_write_text(CHECKPOINT_FILE, str(i))


def record_failure(index: int, url: str, reason: str) -> None:
    line = f"[{__import__('time').strftime('%Y-%m-%d %H:%M:%S')}] index={index} url={url} reason={reason}\n"
    with open(FAILED_FILE, "a", encoding="utf-8") as f:
        f.write(line)


def load_existing_output() -> List[dict]:
    if not Path(OUTPUT_FILE).exists():
        return []
    try:
        data = json.load(open(OUTPUT_FILE, encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_all(data_list: List[dict]) -> None:
    atomic_write_json(OUTPUT_FILE, data_list)


def stable_uuid(prefix: str, value: str) -> str:
    return str(uuid.uuid5(APP_NAMESPACE, f"{prefix}:{value}"))


def normalize_space(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def get_best_photo(photos: Any, prefer_width: int = 640) -> Optional[str]:
    if not isinstance(photos, list) or not photos:
        return None
    valid = [p for p in photos if isinstance(p, dict)]
    if not valid:
        return None
    best = min(valid, key=lambda p: abs((p.get("width") or 0) - prefer_width))
    return best.get("value")


async def wait_until(
    predicate,
    timeout: float,
    interval: float = 0.25,
) -> bool:
    start = asyncio.get_running_loop().time()
    while asyncio.get_running_loop().time() - start < timeout:
        if predicate():
            return True
        await asyncio.sleep(interval)
    return bool(predicate())


def build_price_range(price_range_obj: Any) -> Optional[str]:
    if not isinstance(price_range_obj, dict):
        return None
    price_min = price_range_obj.get("min_price")
    price_max = price_range_obj.get("max_price")
    if price_min is None or price_max is None:
        return None
    try:
        return f"{int(price_min):,}đ - {int(price_max):,}đ"
    except Exception:
        return None


def normalize_foody_url(raw_href: Optional[str]) -> Optional[str]:
    if not raw_href:
        return None
    return urljoin("https://www.foody.vn/", raw_href)


def extract_restaurant_payload(detail_data: Dict[str, Any]) -> Dict[str, Any]:
    return (
        detail_data.get("reply", {}).get("delivery_detail")
        or detail_data.get("result", {}).get("restaurant")
        or detail_data.get("data")
        or {}
    )


async def crawl_shopeefood(page: Page, url: str, slot_name: str) -> Dict[str, Any]:
    store: Dict[str, Any] = {
        "detail": None,
        "dishes": [],
        "foody_url": None,
        "shopeefood_url": url,
    }

    async def handle_response(response) -> None:
        try:
            rurl = response.url
            if "get_detail" in rurl and "id_type=2" in rurl:
                data = await response.json()
                if not store["detail"]:
                    print(f"  {slot_name} 🔍 detail API captured")
                store["detail"] = data
            elif "get_delivery_dishes" in rurl:
                data = await response.json()
                store["dishes"].append(data)
        except Exception as e:
            print(f"  {slot_name} ❌ Response error: {e}")

    async def open_and_collect(target_url: str, allow_reload_log: bool = False) -> None:
        await page.goto(target_url, timeout=60000, wait_until="domcontentloaded")
        await asyncio.sleep(WAIT_AFTER_GOTO)

        detail_ready = await wait_until(
            lambda: store["detail"] is not None,
            timeout=DETAIL_WAIT_TIMEOUT,
            interval=0.3,
        )

        for _ in range(SCROLL_TIMES):
            if store["detail"] is not None and store["dishes"]:
                break
            await page.mouse.wheel(0, 4000)
            await asyncio.sleep(SCROLL_PAUSE)

        dishes_ready = await wait_until(
            lambda: bool(store["dishes"]),
            timeout=DISH_WAIT_TIMEOUT,
            interval=0.4,
        )

        if not dishes_ready:
            for _ in range(3):
                if store["dishes"]:
                    break
                await page.mouse.wheel(0, 3000)
                await asyncio.sleep(0.8)

        await asyncio.sleep(FINAL_BUFFER_WAIT)

        if allow_reload_log:
            print(
                f"  {slot_name} 🔄 Reload xong | "
                f"detail: {'yes' if detail_ready or store['detail'] else 'no'} | "
                f"dishes: {'yes' if dishes_ready or store['dishes'] else 'no'}"
            )

    page.on("response", handle_response)

    try:
        await open_and_collect(url)

        if SOFT_RELOAD_ON_EMPTY and store["detail"] is None:
            print(f"  {slot_name} ♻️ Chưa bắt được detail, thử reload 1 lần...")
            await open_and_collect(url, allow_reload_log=True)

        try:
            el = await page.query_selector("a.number-review[href*='foody.vn']")
            if el:
                store["foody_url"] = normalize_foody_url(await el.get_attribute("href"))
                if store["foody_url"]:
                    print(f"  {slot_name} 🔗 foody_url: {store['foody_url']}")
            else:
                print(f"  {slot_name} ⚠️ Không tìm thấy link Foody")
        except Exception as e:
            print(f"  {slot_name} ❌ Lỗi lấy foody_url: {e}")

        return store
    finally:
        page.remove_listener("response", handle_response)


def parse_data(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not raw.get("detail"):
        return None

    data = raw["detail"]
    res = extract_restaurant_payload(data)
    if not res:
        print("  ⚠️ Không tìm thấy restaurant data")
        return None

    shopeefood_url = raw.get("shopeefood_url") or ""
    source_restaurant_key = str(
        res.get("id")
        or res.get("restaurant_id")
        or res.get("delivery_id")
        or shopeefood_url
    )
    res_id = stable_uuid("restaurant", source_restaurant_key)

    pos = res.get("position") or {}
    lat = pos.get("latitude")
    lng = pos.get("longitude")
    google_maps_url = (
        f"https://www.google.com/maps?q={lat},{lng}"
        if lat is not None and lng is not None
        else None
    )

    photos = res.get("photos") or []
    image_url = get_best_photo(photos, prefer_width=640)
    if not image_url:
        bid = res.get("banner_mms_img_id") or res.get("logo_mms_img_id")
        if bid:
            image_url = (
                f"https://mms.img.susercontent.com/{bid}"
                f"@resize_ss640x400!@crop_w640_h400_cT"
            )

    rating_obj = res.get("rating") or {}
    delivery_obj = res.get("delivery") or {}
    is_open = delivery_obj.get("is_open")
    is_active = bool(is_open) if is_open is not None else True

    restaurant = {
        "id": res_id,
        "name": res.get("name"),
        "address": res.get("address"),
        "lat": lat,
        "lng": lng,
        "google_maps_url": google_maps_url,
        "price_range": build_price_range(res.get("price_range")),
        "opening_hours": None,
        "image_url": image_url,
        "rating_avg": rating_obj.get("avg"),
        "sentiment_score": None,
        "top_review_text": None,
        "is_active": is_active,
        "embedding_vector": None,
        "total_reviews": rating_obj.get("total_review"),
        "shopeefood_url": shopeefood_url,
        "foody_url": raw.get("foody_url"),
        "source_restaurant_key": source_restaurant_key,
    }

    dishes: List[Dict[str, Any]] = []
    seen_dish_ids = set()

    for batch in raw.get("dishes", []):
        menu_infos = (
            batch.get("reply", {}).get("menu_infos")
            or batch.get("data", {}).get("items")
            or []
        )
        if not isinstance(menu_infos, list):
            continue

        for cat in menu_infos:
            if not isinstance(cat, dict):
                continue
            for item in cat.get("dishes", []) or []:
                if not isinstance(item, dict):
                    continue

                price_obj = item.get("price") or {}
                price_val = price_obj.get("value") if isinstance(price_obj, dict) else price_obj
                dish_image = get_best_photo(item.get("photos") or [], prefer_width=240)
                raw_dish_key = (
                    item.get("id")
                    or item.get("dish_id")
                    or item.get("item_id")
                    or f"{normalize_space(item.get('name'))}|{price_val}|{dish_image or ''}"
                )
                dish_id = stable_uuid("dish", f"{source_restaurant_key}|{raw_dish_key}")

                if dish_id in seen_dish_ids:
                    continue
                seen_dish_ids.add(dish_id)

                dishes.append(
                    {
                        "id": dish_id,
                        "res_id": res_id,
                        "name": item.get("name"),
                        "price": price_val,
                        "image_url": dish_image,
                        "ingredients": None,
                        "allergens": None,
                        "is_vegetarian": None,
                        "embedding_vector": None,
                    }
                )

    return {"restaurant": restaurant, "dishes": dishes, "reviews": []}


def upsert_local_result(all_data: List[dict], new_item: dict) -> List[dict]:
    restaurant = new_item.get("restaurant") or {}
    new_url = restaurant.get("shopeefood_url")
    new_id = restaurant.get("id")

    for idx, item in enumerate(all_data):
        old_restaurant = item.get("restaurant") or {}
        if old_restaurant.get("shopeefood_url") == new_url or old_restaurant.get("id") == new_id:
            all_data[idx] = new_item
            return all_data

    all_data.append(new_item)
    return all_data


async def process_one_link(context: BrowserContext, link: str, slot_name: str) -> Dict[str, Any]:
    page = await context.new_page()
    try:
        raw = await crawl_shopeefood(page, link, slot_name)
        if not raw.get("foody_url"):
            raise SkipNoFoodyUrl("Không có foody_url, bỏ qua không lưu")
        data = parse_data(raw)
        if not data:
            raise RuntimeError(
                "Không parse được dữ liệu từ ShopeeFood (chưa bắt được detail sau khi đã chờ)"
            )
        return data
    finally:
        await page.close()


class SharedState:
    def __init__(self, all_data: List[dict], start: int):
        self.all_data = all_data
        self.done_indices = set()
        self.failed_indices = set()
        self.next_checkpoint = start
        self.stop_requested = False
        self.lock = asyncio.Lock()

    async def on_success(self, index: int, data: dict) -> None:
        async with self.lock:
            self.all_data = upsert_local_result(self.all_data, data)
            self.done_indices.add(index)
            save_all(self.all_data)
            while self.next_checkpoint in self.done_indices:
                self.next_checkpoint += 1
            save_checkpoint(self.next_checkpoint)

    async def on_skip(self, index: int) -> None:
        async with self.lock:
            self.done_indices.add(index)
            while self.next_checkpoint in self.done_indices:
                self.next_checkpoint += 1
            save_checkpoint(self.next_checkpoint)

    async def on_failure(self, index: int, url: str, reason: str) -> None:
        async with self.lock:
            if index in self.failed_indices:
                return
            self.failed_indices.add(index)
            record_failure(index, url, reason)
            if STOP_ON_FINAL_FAILURE:
                self.stop_requested = True


async def worker(name: str, context: BrowserContext, items: List[tuple], queue: asyncio.Queue, state: SharedState) -> None:
    while True:
        if state.stop_requested and queue.empty():
            return

        try:
            index, link = await asyncio.wait_for(queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            if queue.empty():
                return
            continue

        try:
            print(f"\n🚀 {name} [{index}] {link}")
            success = False
            last_error: Optional[Exception] = None

            for attempt in range(1, RETRY_PER_LINK + 2):
                try:
                    if attempt > 1:
                        print(f"  {name} 🔁 Retry {attempt - 1}/{RETRY_PER_LINK}")

                    data = await process_one_link(context, link, name)
                    await state.on_success(index, data)
                    print(
                        f"  {name} ✅ saved | dishes: {len(data['dishes'])}"
                        f" | foody_url: {'yes' if data['restaurant'].get('foody_url') else 'no'}"
                    )
                    success = True
                    break
                except SkipNoFoodyUrl as e:
                    await state.on_skip(index)
                    print(f"  {name} ⏭️ {e}")
                    success = True
                    break
                except Exception as e:
                    last_error = e
                    print(f"  {name} ❌ Attempt failed: {e}")
                    await asyncio.sleep(1.5)

            if not success:
                reason = str(last_error) if last_error else "Unknown error"
                await state.on_failure(index, link, reason)
                print(f"  {name} ⛔ Link lỗi cuối cùng tại index {index}: {reason}")
                print(f"  {name} 📝 Đã ghi vào {FAILED_FILE}")
                if STOP_ON_FINAL_FAILURE:
                    print(f"  {name} 🛑 Ngừng cấp link mới. Các tab còn lại sẽ chạy nốt link đang làm.")
            await sleep_random()
        finally:
            queue.task_done()


async def async_main() -> None:
    links = load_links()
    start = load_checkpoint()
    all_data = load_existing_output()

    if start >= len(links):
        print("✅ Checkpoint đã ở cuối file links.txt")
        print(f"📦 Hiện có {len(all_data)} quán trong {OUTPUT_FILE}")
        return

    end = len(links) if MAX_LINKS is None else min(start + MAX_LINKS, len(links))
    run_links = links[start:end]

    print(f"📄 Tổng link trong file: {len(links)}")
    print(f"▶️ Bắt đầu từ index: {start}")
    print(f"⏹️ Kết thúc tại index: {end - 1}")
    print(f"🗂️ Số tab song song: {CONCURRENCY}")
    print(f"💾 Output: {OUTPUT_FILE}")
    print(f"🧭 Checkpoint: {CHECKPOINT_FILE}\n")

    queue: asyncio.Queue = asyncio.Queue()
    for offset, link in enumerate(run_links, start=start):
        await queue.put((offset, link))

    state = SharedState(all_data, start)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context()

        try:
            workers = [
                asyncio.create_task(worker(f"[TAB {i + 1}]", context, [], queue, state))
                for i in range(CONCURRENCY)
            ]
            await asyncio.gather(*workers)
        finally:
            await context.close()
            await browser.close()

    print(f"\n🎉 DONE! Tổng hiện có: {len(state.all_data)} quán trong {OUTPUT_FILE}")
    print(f"📍 Checkpoint hiện tại: {state.next_checkpoint}")


if __name__ == "__main__":
    asyncio.run(async_main())
