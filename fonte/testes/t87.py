import asyncio, subprocess, time, json
from playwright.async_api import async_playwright
APP=8987
srv=subprocess.Popen(['python3','-m','http.server',str(APP),'-d','s87'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
DAILY={"game":{"id":"abcd1234","perf":{"key":"rapid"},"rated":True,"players":[{"name":"artemmurom","color":"white","rating":1795},{"name":"mechgane","color":"black","rating":1806}],"pgn":"e4"},
 "puzzle":{"id":"lxIiR","rating":2071,"plays":74234,"solution":["c1c8","g8h7","c8h8","h7h8","e7f8","h8h7","f8g7"],"themes":["veryLong","endgame","attraction","sacrifice","mateIn4"],
 "fen":"6k1/p3Qpp1/3r1r1p/8/3P4/5q1P/P4P1K/2R3R1 w - - 0 1","lastMove":"h5f3","initialPly":65}}
OLD={"game":{"id":"x","players":[],"pgn":"e4 e5 Qh5 Nc6 Bc4 Nf6"},"puzzle":{"id":"old1","rating":900,"solution":["h5f7"],"themes":["mateIn1"],"initialPly":5}}
OK=[]
def ck(n,c,x=''):OK.append(bool(c));print(('✓ ' if c else '✗ ')+n+(' — '+str(x) if x!='' else ''),flush=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for vw,vh in [(390,844),(360,640),(1280,800)]:
      ctx=await b.new_context(viewport={'width':vw,'height':vh});pg=await ctx.new_page()
      errs=[];pg.on('pageerror',lambda e:errs.append(e.message[:160]))
      cnt={'n':0}
      async def rc(route):
        cnt['n']+=1;await route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body=json.dumps({"players":122043,"games":51355,"t":1}))
      await pg.route('https://rota-turn.paescoelho.workers.dev/lichess',rc)
      await pg.route('https://lichess.org/api/puzzle/daily',lambda r:r.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body=json.dumps(DAILY)))
      await pg.goto(f'http://localhost:{APP}/')
      try: await pg.get_by_text('Pular').first.click(timeout=8000)
      except Exception: pass
      await pg.wait_for_selector('.menu');await asyncio.sleep(0.6)
      await pg.evaluate("V31.home()");await asyncio.sleep(1.2)
      tag=f'{vw}x{vh}'
      t=await pg.evaluate("document.querySelector('.v35-home').innerText")
      ck(tag+' sem escolha de cor','Você joga de' not in t and 'Sorteio' not in t)
      ck(tag+' sorteio é o padrão',await pg.evaluate("V31.color")=='r')
      li=await pg.evaluate("document.querySelector('.v35-xb.li').innerText.replace(/\\n/g,' | ')")
      ck(tag+' contadores no botão Lichess','122.043 jogadores' in li and '51.355 partidas em andamento' in li,li)
      h=await pg.evaluate("[document.querySelector('.v35-xb.li').getBoundingClientRect().height,document.querySelector('.v35-xb.cc').getBoundingClientRect().height]")
      ck(tag+' botões maiores (≥ 84 px)',min(h)>=84,h)
      ov=await pg.evaluate("(()=>{const m=document.querySelector('.main');return [m.scrollHeight,m.clientHeight]})()")
      ck(tag+' cabe sem rolar',ov[0]<=ov[1]+2,ov)
      clip=await pg.evaluate("[...document.querySelectorAll('.v35-xb.li .v87-cnt div')].map(d=>d.scrollWidth<=d.clientWidth+1)")
      ck(tag+' números sem corte',all(clip),clip)
      await pg.screenshot(path=f'o87_{tag}.png')
      if vw==390:
        await pg.evaluate("V31.home()");await asyncio.sleep(0.5)
        ck('contadores em cache (1 pedido por minuto)',cnt['n']==1,cnt['n'])
      # tela do Lichess + problema do dia
      await pg.evaluate("V83.home()");await asyncio.sleep(1.2)
      ck(tag+' problema do dia aparece',await pg.evaluate("!!document.querySelector('.v87-pz .board .sq')"))
      await pg.screenshot(path=f'l87_{tag}.png',full_page=True)
      if vw!=390: await ctx.close();continue
      msg=lambda: pg.evaluate("document.querySelector('.v87-msg').textContent")
      ck('vez das brancas, tabuleiro na orientação certa','brancas jogam' in await msg() and not await pg.evaluate("document.querySelector('.v87-pz').__bd.flip"),await msg())
      await pg.evaluate("document.querySelector('.v87-pz').__bd.onMove('g1g2')");await asyncio.sleep(0.2)
      ck('lance errado é avisado','Não é esse' in await msg())
      await pg.evaluate("[...document.querySelectorAll('.v87-b')].find(b=>/Dica/.test(b.textContent)).click()");await asyncio.sleep(0.2)
      ck('dica marca a peça certa',await pg.evaluate("document.querySelector('.v87-pz .sq.sg')!==null"))
      for u in ['c1c8','c8h8','e7f8','f8g7']:
        await pg.evaluate(f"document.querySelector('.v87-pz').__bd.onMove('{u}')");await asyncio.sleep(0.8)
      m=await msg();ck('resolve até o mate','Resolvido' in m and '1 erro' in m,m)
      ck('fica marcado como resolvido',await pg.evaluate("V87.solved('lxIiR')")=='erros')
      await pg.evaluate("[...document.querySelectorAll('.v87-b')].find(b=>/Recomeçar/.test(b.textContent)).click()");await asyncio.sleep(0.2)
      ck('recomeçar volta ao início',await pg.evaluate("V87.st.moves.length")==0 and 'já resolvido' in await pg.evaluate("document.querySelector('.v87-ph').textContent"))
      await pg.evaluate("[...document.querySelectorAll('.v87-b')].find(b=>/solução/.test(b.textContent)).click()");await asyncio.sleep(6.2)
      ck('ver solução joga os lances','Esta era a solução' in await msg() and await pg.evaluate("V87.st.moves.length")==7)
      ck('link do Lichess',await pg.evaluate("document.querySelector('.v87-lk').href")=='https://lichess.org/training/lxIiR')
      ck('temas em português','sacrifício' in await pg.evaluate("document.querySelector('.v87-inf').textContent"),await pg.evaluate("document.querySelector('.v87-inf').textContent"))
      # outro mate no último passo também vale; formato antigo (sem fen)
      z=await pg.evaluate(f"JSON.stringify(V87.parse({json.dumps(OLD)}))")
      zj=json.loads(z);ck('formato antigo da API (sem FEN) funciona',zj and zj['fen'].startswith('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3') and zj['last']=='g8f6',zj and zj['fen'])
      # cache do dia: segunda abertura não refaz o pedido
      n0=await pg.evaluate("performance.getEntriesByName('https://lichess.org/api/puzzle/daily').length")
      await pg.evaluate("V83.home()");await asyncio.sleep(0.6)
      ck('problema guardado no dia (sem novo pedido)',await pg.evaluate("performance.getEntriesByName('https://lichess.org/api/puzzle/daily').length")==n0)
      ck('sem erros de JavaScript',not errs,errs)
      await ctx.close()
    await b.close()
asyncio.run(main())
srv.terminate()
print(f'\n{sum(OK)}/{len(OK)} ok')
