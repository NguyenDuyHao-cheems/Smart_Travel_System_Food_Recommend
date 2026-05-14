import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(storage_state="storage_state.json")
        page = await context.new_page()

        await page.goto("https://www.foody.vn/", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)

        content = await page.content()
        print("Đã đăng nhập?" , ("đăng xuất" in content.lower()) or ("logout" in content.lower()))

        input("Nhấn Enter để đóng...")
        await context.close()
        await browser.close()

asyncio.run(main())