# Casos difíceis do Lichess (v83) contra o servidor simulado fiel ao lila
import asyncio, subprocess, time, json, urllib.request
from playwright.async_api import async_playwright
APP, LI = 8942, 8951
srv = subprocess.Popen(['python3', '-m', 'http.server', str(APP), '-d', 's83'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
fake = subprocess.Popen(['python3', 'fakeli.py', str(LI)])
time.sleep(1.2)
def ctl(path): return json.loads(urllib.request.urlopen(f'http://127.0.0.1:{LI}{path}').read())
def cfg(**k): ctl('/test/cfg?j=' + urllib.request.quote(json.dumps(k)))
OK = []
def check(name, cond, extra=''):
    OK.append((name, bool(cond))); print(('✓ ' if cond else '✗ ') + name + (' — ' + str(extra) if extra else ''), flush=True)
async def until(pg, js, t=15):
    for i in range(int(t * 10)):
        try:
            if await pg.evaluate(js): return True
        except Exception: pass
        await asyncio.sleep(0.1)
    return False
async def boot(ctx):
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(e.message[:160]))
    await pg.goto(f'http://localhost:{APP}/')
    await pg.evaluate(f"localStorage.setItem('rdm-li-host','http://127.0.0.1:{LI}')")
    try: await pg.get_by_text('Pular').first.click(timeout=6000)
    except Exception: pass
    await pg.wait_for_selector('.menu'); await asyncio.sleep(0.6)
    return pg, errs
async def open_game(pg, gid):
    await pg.evaluate(f"V83.play('{gid}')")
    return await until(pg, f"V83.g&&V83.g.id==='{gid}'&&V83.g.me&&V83.g.view", 8)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 360, 'height': 740})
        pg, errs = await boot(ctx)
        await pg.evaluate("V83.home()"); await pg.get_by_text('Entrar com Lichess').click()
        check('login', await until(pg, "!!document.querySelector('.v83-top')", 20))
        # 1) ritmo não permitido (erro de formulário em objeto) e "já está jogando"
        msg = await pg.evaluate("V83.api('/api/board/seek',{body:{rated:true,time:3,increment:0}}).then(()=>'ok',e=>e.message)")
        check('erro de ritmo vira texto legível', ('rápidas' in msg or 'Invalid' in msg) and 'object' not in msg, msg)
        cfg(busy=True)
        await pg.evaluate("V83.home()"); await asyncio.sleep(0.3)
        await pg.get_by_text('Procurar adversário', exact=True).last.click()
        ok = await until(pg, "V83.onHome&&!V83.wait", 8)
        check('"já tem partida em andamento" volta à tela com aviso', ok)
        cfg(busy=False)
        # 2) promoção: escolha da peça
        ctl('/test/promo'); check('partida a partir de posição', await open_game(pg, 'promo001'))
        await pg.evaluate("V83.onMove('a7a8')")
        promo = await until(pg, "!!document.querySelector('.modal')", 3)
        if promo:
            btns = await pg.evaluate("Array.from(document.querySelectorAll('.modal button')).map(b=>b.textContent)")
            await pg.locator('.modal button').first.click()
        await until(pg, "V83.g.moves.length>=1&&!V83.g.pend", 5)
        mv = await pg.evaluate("V83.g.moves[0]")
        check('promoção enviada com a peça escolhida', promo and mv and len(mv) == 5 and mv.startswith('a7a8'), (mv, btns if promo else None))
        check('servidor aceitou a promoção', any('move/a7a8' in x for x in ctl('/log')))
        await pg.evaluate("V83.endGame()")
        # 3) mate dado por mim
        ctl('/test/mate1'); await open_game(pg, 'mate0001')
        await pg.evaluate("V83.onMove('d1d8')")
        ok = await until(pg, "V83.g&&V83.g.over&&V83.g.status==='mate'", 6)
        txt = await pg.evaluate("document.querySelector('.panel').innerText")
        check('xeque-mate: vitória na tela', ok and 'Vitória' in txt and 'xeque-mate' in txt, txt[:60])
        await pg.evaluate("V83.endGame()")
        # 4) tempo esgotado
        ctl('/test/corr'); await open_game(pg, 'corr0001')
        bar = await pg.evaluate("Array.from(document.querySelectorAll('.pbar')).map(x=>x.textContent).join(' | ')")
        pan = await pg.evaluate("document.querySelector('.panel').innerText")
        check('correspondência: sem relógio, com dias por lance', ':' not in bar.replace('Rodrigo','') and 'dia(s) por lance' in pan, bar)
        await pg.evaluate("V83.onMove('e2e4')"); await until(pg, "V83.g.moves.length>=2", 5)
        ctl('/test/flag')
        ok = await until(pg, "V83.g&&V83.g.over&&V83.g.status==='outoftime'", 6)
        check('tempo esgotado: derrota com motivo', ok and 'tempo esgotado' in await pg.evaluate("document.querySelector('.panel').innerText"))
        await pg.evaluate("V83.endGame()")
        # 5) quedas repetidas da conexão
        ctl('/test/oldgame') if False else None
        await pg.evaluate("V83.home()"); await pg.get_by_text('Treinar contra o Stockfish do Lichess').click(); await asyncio.sleep(0.3)
        await pg.get_by_text('Jogar', exact=True).click(); await until(pg, "V83.g&&V83.g.me&&V83.g.view", 8)
        n0 = await pg.evaluate("V83.g.moves.length")
        for i in range(4):
            ctl('/test/cut'); await asyncio.sleep(0.3)
            await until(pg, "V83.g.h&&V83.g.net", 10)
            mine = await pg.evaluate("V83.turn(V83.g)===V83.g.me")
            if mine:
                u = await pg.evaluate("App.legalUcis(V83.pos(V83.g)).filter(u=>u.length===4)[0]")
                await pg.evaluate(f"V83.onMove('{u}')")
            await asyncio.sleep(1.2)
        n1 = await pg.evaluate("V83.g.moves.length")
        sync = await pg.evaluate("V83.g.moves.length===V83.g.conf")
        check('4 quedas seguidas: reconecta e continua em sincronia', n1 > n0 and sync, (n0, n1))
        # 6) Lichess pede para esperar (429) no fluxo de eventos: não insiste
        await pg.evaluate("if(V83.ev){V83.ev.abort();V83.ev=null;}")
        cfg(r429=1); before = ctl('/test/evn')['n']
        await pg.evaluate("V83.events()"); await asyncio.sleep(6)
        after = ctl('/test/evn')['n']
        check('429: espera 1 minuto antes de tentar de novo', after == before, (before, after))
        await pg.evaluate("clearTimeout(V83.evT)")
        await pg.get_by_text('Abandonar').click(); await asyncio.sleep(0.2); await pg.locator('.modal button', has_text='Abandonar').click(); await asyncio.sleep(0.6)
        await pg.evaluate("V83.endGame()")
        # 7) duas abas com a mesma conta: sem ping-pong infinito
        await pg.evaluate("V83.home()"); await asyncio.sleep(1)
        pg2, errs2 = await boot(ctx)
        await pg2.evaluate("V83.home()")
        t0 = ctl('/test/evn')['n']; await asyncio.sleep(40); t1 = ctl('/test/evn')['n']
        warn = await pg.evaluate("/outra aba/.test(document.body.innerText)") or await pg2.evaluate("/outra aba/.test(document.body.innerText)")
        check('duas abas: param de brigar e avisam', (t1 - t0) <= 12 and warn, f'{t1-t0} conexões em 40 s')
        await pg2.close()
        # 8) autorização revogada no meio: volta para o login sem travar
        await pg.evaluate("V83.events();V83.home()"); await asyncio.sleep(0.5)
        ctl('/test/revoke')
        await pg.evaluate("V83.account(true).catch(()=>0)")
        ok = await until(pg, "!V83.auth()&&!!document.querySelector('.v83-hero')", 6)
        check('autorização revogada: volta para Entrar com Lichess', ok)
        # 9) tela pequena: partida cabe e sem erros
        check('sem erros de página', not errs and not errs2, (errs + errs2)[:4])
        await b.close()
    print('\n%d/%d ok' % (sum(1 for _, o in OK if o), len(OK)))
asyncio.run(main())
srv.terminate(); fake.terminate()
