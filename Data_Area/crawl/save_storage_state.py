import asyncio
from playwright.async_api import async_playwright

LOGIN_URL = "https://www.foody.vn/"
STATE_FILE = "storage_state.json"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto(LOGIN_URL, wait_until="domcontentloaded")
        print("Hãy đăng nhập Foody trên cửa sổ trình duyệt.")
        input("Đăng nhập xong thì nhấn Enter ở terminal để lưu trạng thái...")

        await context.storage_state(path=STATE_FILE, indexed_db=True)
        print(f"Đã lưu: {STATE_FILE}")

        await context.close()
        await browser.close()

asyncio.run(main())