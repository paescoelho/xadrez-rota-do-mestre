import asyncio
from playwright.async_api import async_playwright
svg = open('/home/claude/v2/web/wN.svg').read()
svg = svg.replace('<svg ', '<svg id="k" ').replace('stroke="#000"', 'stroke="#4a3210"').replace('fill="#000"', 'fill="#4a3210"')
svg = svg.replace('fill="#fff"', 'fill="url(#g)"').replace('viewBox="0 0 45 45">', 'viewBox="0 0 45 45"><defs><radialGradient id="g" cx=".34" cy=".26" r=".95"><stop offset="0" stop-color="#fffdf3"/><stop offset=".55" stop-color="#f2d58e"/><stop offset="1" stop-color="#b9873a"/></radialGradient></defs>')
def html(size, pad):
    k = int(size * (1 - 2 * pad))
    return f"""<html><body style="margin:0;background:transparent"><div style="width:{size}px;height:{size}px;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 38%,#3a2c16 0%,#14110c 55%,#070708 100%);{'' if pad>0.15 else 'border-radius:22%;'}box-shadow:inset 0 0 0 {max(2,size//64)}px #c99a3f">
    <div style="width:{k}px;height:{k}px">{svg.replace('width="45" height="45"', f'width="{k}" height="{k}"')}</div></div></body></html>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, size, pad in [("icon-192", 192, 0.12), ("icon-512", 512, 0.12), ("icon-maskable-512", 512, 0.22)]:
            pg = await b.new_page(viewport={"width": size, "height": size})
            await pg.set_content(html(size, pad))
            await pg.screenshot(path=f"/home/claude/v2/web/icons/{name}.png", omit_background=True)
        await b.close()
asyncio.run(main())
