# Varredura do jogo: entra em cada tela do menu (2 níveis), registra erros de JS e telas que vazam na largura
import asyncio, subprocess, time, json, sys
from playwright.async_api import async_playwright
APP = 8960
srv = subprocess.Popen(['python3', '-m', 'http.server', str(APP), '-d', sys.argv[1] if len(sys.argv) > 1 else 's83'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
BAD = ('Apagar', 'Excluir', 'Sair', 'Abandonar', 'Zerar', 'Limpar', 'Resetar', 'Desconectar', 'Começar do zero', 'Entrar com', 'Google', 'WhatsApp', 'Abrir no', 'Abrir as partidas', 'Baixar', 'Exportar', 'Copiar', 'Compartilhar', 'Criar partida', 'Instalar', 'Lichess.org', 'Chess.com', 'Enviar', 'Procurar adversário', 'Ativar voz')
JS_CLICKABLES = """()=>{const root=document.querySelector('.shell')||document.body;
 const els=[...root.querySelectorAll('button, .mitem, .row, a.btn, .sb, .v35-xb')].filter(e=>e.offsetParent!==null&&!e.disabled);
 const seen=new Set();return els.map(e=>(e.innerText||'').trim().split('\\n')[0].slice(0,40)).filter(t=>t&&!seen.has(t)&&seen.add(t));}"""
async def goto_path(pg, path):
    await pg.evaluate("try{App.menu()}catch(e){}"); await asyncio.sleep(0.35)
    for t in path:
        ok = await pg.evaluate("""(t)=>{const root=document.querySelector('.shell')||document.body;
          const el=[...root.querySelectorAll('button, .mitem, .row, a.btn, .sb, .v35-xb')].find(e=>e.offsetParent!==null&&(e.innerText||'').trim().split('\\n')[0].slice(0,40)===t);
          if(!el)return false;el.click();return true;}""", t)
        if not ok: return False
        await asyncio.sleep(0.7)
        try:
            m = await pg.query_selector('.modal')
            if m: await pg.evaluate("document.querySelectorAll('.modal').forEach(m=>m.remove())")
        except Exception: pass
    return True
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width': 360, 'height': 740})).new_page()
        errs = []; cur = ['menu']
        pg.on('pageerror', lambda e: errs.append((' > '.join(cur), e.message[:150])))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        await pg.goto(f'http://localhost:{APP}/')
        try: await pg.get_by_text('Pular').first.click(timeout=8000)
        except Exception: pass
        await pg.wait_for_selector('.menu'); await asyncio.sleep(1)
        await pg.evaluate("()=>{Profile.d.games=(Profile.d.games||0)+3;}")
        top = await pg.evaluate(JS_CLICKABLES)
        top = [t for t in top if not any(x in t for x in BAD)]
        visited = 0; wide = []; titles = set()
        for t in top:
            cur[:] = [t]
            if not await goto_path(pg, [t]): continue
            visited += 1
            title = await pg.evaluate("(document.querySelector('.htitle')||{}).textContent||''"); titles.add(title)
            ov = await pg.evaluate("(()=>{const m=document.querySelector('.main')||document.scrollingElement;return document.scrollingElement.scrollWidth>document.scrollingElement.clientWidth+2})()")
            if ov: wide.append(' > '.join(cur))
            subs = [s for s in await pg.evaluate(JS_CLICKABLES) if not any(x in s for x in BAD)][:14]
            for s in subs:
                cur[:] = [t, s]
                if not await goto_path(pg, [t, s]): continue
                visited += 1
                titles.add(await pg.evaluate("(document.querySelector('.htitle')||{}).textContent||''"))
                ov = await pg.evaluate("document.scrollingElement.scrollWidth>document.scrollingElement.clientWidth+2")
                if ov: wide.append(' > '.join(cur))
        print('telas visitadas:', visited, '| títulos distintos:', len(titles))
        print('erros de JS:', len(errs))
        seen = set()
        for c, m in errs:
            if m in seen: continue
            seen.add(m); print('  ', c, '→', m)
        print('vazam na largura (360px):', wide[:15])
        await b.close()
asyncio.run(main())
srv.terminate()
