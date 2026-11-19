import asyncio, subprocess, time, json, urllib.request, sys
from playwright.async_api import async_playwright
APP, LI = 8941, 8950
srv = subprocess.Popen(['python3', '-m', 'http.server', str(APP), '-d', 's83'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
fake = subprocess.Popen(['python3', 'fakeli.py', str(LI)])
time.sleep(1.2)
def ctl(path):
    return json.loads(urllib.request.urlopen(f'http://127.0.0.1:{LI}{path}').read())
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

async def play_moves(pg, n, avoid_promo=True):
    done = 0
    for i in range(n * 30):
        if await pg.evaluate("!V83.g||V83.g.over"): break
        mine = await pg.evaluate("V83.g&&V83.g.me&&!V83.g.pend&&V83.turn(V83.g)===V83.g.me")
        if mine:
            u = await pg.evaluate("(()=>{const l=App.legalUcis(V83.pos(V83.g)).filter(u=>u.length===4);const c=l.filter(u=>!/^(e1|e8)(g|c)/.test(u));return (c.length?c:l)[Math.floor(Math.random()*(c.length?c:l).length)];})()")
            await pg.evaluate(f"V83.onMove('{u}')"); done += 1
            if done >= n: break
        await asyncio.sleep(0.25)
    await asyncio.sleep(1.0)
    return done

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(e.message[:160]))
        await pg.goto(f'http://localhost:{APP}/')
        await pg.evaluate(f"localStorage.setItem('rdm-li-host','http://127.0.0.1:{LI}')")
        try: await pg.get_by_text('Pular').first.click(timeout=8000)
        except Exception: pass
        await pg.wait_for_selector('.menu'); await asyncio.sleep(0.8)
        # 1) botão no Jogar online
        await pg.evaluate("V31.home()"); await asyncio.sleep(0.8)
        txt = await pg.evaluate("(document.querySelector('.v35-xb.li')||{}).textContent")
        check('botão Lichess ativo no Jogar online', txt and 'Lichess' in txt and 'desenvolvimento' not in txt, txt)
        await pg.screenshot(path='l_online.png')
        await pg.click('.v35-xb.li'); await asyncio.sleep(0.6)
        check('tela de entrada sem login', await pg.evaluate("!!document.querySelector('.v83-hero')"))
        await pg.screenshot(path='l_login.png')
        # 2) login OAuth com PKCE (vai ao Lichess falso e volta)
        await pg.get_by_text('Entrar com Lichess').click()
        ok = await until(pg, "!!document.querySelector('.v83-top')", 20)
        check('login concluído e volta para a tela do Lichess', ok)
        await until(pg, "document.querySelector('.v83-rts')&&/1180/.test(document.querySelector('.v83-rts').textContent)", 5)
        check('ratings reais na tela', 'Rápida 1180' in (await pg.evaluate("document.querySelector('.v83-rts').textContent")))
        check('escopos pedidos', any('scope=board:play challenge:read challenge:write' in x for x in ctl('/log')))
        check('token guardado só no aparelho (fora do perfil)', await pg.evaluate("!!V83.auth()&&JSON.stringify(Profile.d).indexOf('tok_teste')<0"))
        check('conta do Lichess ligada para importar', await pg.evaluate("V32.acc().lichess==='Rodrigo_T'"))
        await asyncio.sleep(2.5); await pg.screenshot(path='l_home.png')
        # 3) procurar adversário e jogar
        await pg.get_by_text('Procurar adversário', exact=True).last.click()
        check('tela de espera', await until(pg, "!!document.querySelector('.v83-wait')", 3))
        await pg.screenshot(path='l_wait.png')
        ok = await until(pg, "V83.g&&V83.g.me&&V83.g.view", 15)
        check('partida abre sozinha quando o Lichess pareia', ok)
        fair = await pg.evaluate("({chance:(document.querySelector('.game-chance')||{}).textContent||'',dica:!!Array.from(document.querySelectorAll('button')).find(b=>/Dica|Treinador/.test(b.textContent)),lenda:!!document.querySelector('.v42-card'),ab:/Abertura:/.test(document.body.innerText)})")
        check('jogo justo: sem dica, chances, lenda ou nome de abertura', not fair['chance'] and not fair['dica'] and not fair['lenda'] and not fair['ab'], fair)
        n = await play_moves(pg, 8)
        st = await pg.evaluate("({n:V83.g.moves.length,me:V83.g.me,over:V83.g.over,pend:V83.g.pend})")
        check('lances indo e voltando', n >= 4 and st['n'] >= 8, st)
        await pg.screenshot(path='l_game.png')
        castle = [x for x in ctl('/log') if False]
        # chat
        await pg.get_by_text('Bom jogo!').click()
        check('chat rápido', await until(pg, "V83.g.chat.some(m=>m.t==='Igualmente!')", 4))
        # empate oferecido pelo adversário
        cur_n = await pg.evaluate("V83.g.moves.length")
        ctl('/test/cfg?j=' + urllib.request.quote(json.dumps({'opp_draw_at': cur_n + 1})))
        await play_moves(pg, 1)
        ok = await until(pg, "(V83.g.me==='w'?V83.g.bdraw:V83.g.wdraw)", 8)
        check('oferta de empate do adversário aparece', ok)
        await pg.get_by_text('Aceitar empate').click()
        check('empate aceito encerra a partida', await until(pg, "V83.g&&V83.g.over&&V83.g.status==='draw'", 5))
        res = await pg.evaluate("document.querySelector('.panel').innerText")
        check('tela de resultado', 'Empate' in res and 'Analisar esta partida' in res, res[:80])
        check('partida no histórico', await pg.evaluate("Profile.d.hist.some(h=>h.cat==='lichess'&&h.li&&h.ucis.length>=8)"))
        await pg.screenshot(path='l_result.png')
        # análise
        await pg.get_by_text('Analisar esta partida').click()
        check('análise: partida importada', await until(pg, "!V83.g", 6), await pg.evaluate("document.querySelector('.htitle')&&document.querySelector('.htitle').textContent"))
        # 4) nova busca e abandono
        await pg.evaluate("V83.home()"); await asyncio.sleep(0.4)
        await pg.get_by_text('Procurar adversário', exact=True).last.click()
        await until(pg, "V83.g&&V83.g.me&&V83.g.view", 15)
        await play_moves(pg, 2)
        await pg.get_by_text('Abandonar').click(); await asyncio.sleep(0.3)
        await pg.locator('.modal button', has_text='Abandonar').click()
        check('abandono = derrota com rating', await until(pg, "V83.g&&V83.g.over&&V83.g.status==='resign'", 5))
        await until(pg, "/-9/.test(document.querySelector('.panel').innerText)", 5)
        check('mostra a mudança de rating', '-9' in await pg.evaluate("document.querySelector('.panel').innerText"))
        # 5) Stockfish do Lichess + reconexão + roque do adversário
        await pg.evaluate("V83.endGame();V83.home()"); await asyncio.sleep(0.3)
        await pg.get_by_text('Treinar contra o Stockfish do Lichess').click(); await asyncio.sleep(0.3)
        await pg.get_by_text('Jogar', exact=True).click()
        ok = await until(pg, "V83.g&&V83.g.me&&V83.g.view", 8)
        check('partida contra o Stockfish do Lichess', ok and 'Stockfish nível' in await pg.evaluate("document.querySelector('.pbar').textContent"))
        await play_moves(pg, 3)
        ctl('/test/cut'); await asyncio.sleep(0.4)
        recon = await until(pg, "V83.g&&V83.g.h&&V83.g.net", 8)
        n0 = await pg.evaluate("V83.g.moves.length")
        await play_moves(pg, 3)
        n1 = await pg.evaluate("V83.g.moves.length")
        check('reconecta sozinho e continua', recon and n1 > n0, (n0, n1))
        srv_moves = None
        # roque no formato rei-captura-torre
        norm = await pg.evaluate("V83.norm(['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6','e1h1'],V83.START).join(' ')")
        check('roque e1h1 convertido para e1g1', norm.endswith('e1g1'), norm)
        await pg.get_by_text('Abandonar').click(); await asyncio.sleep(0.3); await pg.locator('.modal button', has_text='Abandonar').click(); await asyncio.sleep(0.8)
        # 6) cancelar antes do 2º lance
        await pg.evaluate("V83.endGame();V83.aiPage()"); await asyncio.sleep(0.3)
        await pg.get_by_text('Jogar', exact=True).click(); await until(pg, "V83.g&&V83.g.me&&V83.g.view", 8)
        await pg.get_by_text('Cancelar partida').click(); await asyncio.sleep(0.3); await pg.locator('.modal button', has_text='Cancelar partida').click()
        check('cancelar partida no início', await until(pg, "V83.g&&V83.g.status==='aborted'", 5))
        # 7) desafio a amigo: aceito e recusado
        await pg.evaluate("V83.endGame();V83.friendPage()"); await asyncio.sleep(0.3)
        await pg.fill('.fi', 'amigo'); await pg.get_by_text('Enviar desafio').click()
        check('desafio aceito abre a partida', await until(pg, "V83.g&&V83.g.me&&V83.g.view&&/^ch/.test(V83.g.id)", 10))
        await pg.evaluate("V83.endGame();V83.friendPage()"); await asyncio.sleep(0.3)
        await pg.fill('.fi', 'recusa'); await pg.get_by_text('Enviar desafio').click()
        check('desafio recusado volta à tela', await until(pg, "V83.onHome&&!V83.wait", 8))
        # 8) desafio recebido
        ctl('/test/incoming')
        check('desafio recebido aparece', await until(pg, "!!document.querySelector('.v83-chal')", 6))
        await pg.screenshot(path='l_chal.png')
        await pg.locator('.v83-chal .btn.pri').click()
        check('aceitar desafio recebido abre a partida', await until(pg, "V83.g&&V83.g.id==='inc1'&&V83.g.me==='b'&&V83.g.view", 8))
        # 9) adversário saiu: reivindicar vitória
        ctl('/test/cfg?j=' + urllib.request.quote(json.dumps({'opp_gone': True})))
        await play_moves(pg, 4)
        ok = await until(pg, "Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Reivindicar vitória')", 10)
        check('reivindicar vitória quando o adversário some', ok)
        if ok:
            await pg.get_by_text('Reivindicar vitória').click()
            check('vitória registrada', await until(pg, "V83.g&&V83.g.over&&V83.g.winner===V83.g.me", 5))
        ctl('/test/cfg?j=' + urllib.request.quote(json.dumps({'opp_gone': False})))
        await pg.screenshot(path='l_claim.png')
        # 10) partida em andamento aparece na tela inicial
        ctl('/test/oldgame')
        await pg.evaluate("V83.endGame();if(V83.ev){V83.ev.abort();V83.ev=null;}V83.home()")
        check('partida em andamento listada', await until(pg, "!!document.querySelector('.v83-live')", 6))
        # 11) sair
        await pg.get_by_text('Sair', exact=True).click(); await asyncio.sleep(0.2); await pg.locator('.modal button', has_text='Sair').click(); await asyncio.sleep(0.6)
        check('sair revoga a autorização', any(x.startswith('DELETE /api/token') for x in ctl('/log')) and await pg.evaluate("!V83.auth()&&!!document.querySelector('.v83-hero')"))
        check('motor continua no worker', await pg.evaluate("Think.mode") == 'worker')
        check('sem erros de página', not errs, errs[:4])
        await b.close()
    print('\n%d/%d ok' % (sum(1 for _, o in OK if o), len(OK)))
asyncio.run(main())
srv.terminate(); fake.terminate()
