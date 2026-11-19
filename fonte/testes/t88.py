import asyncio,subprocess,time,json,re
from playwright.async_api import async_playwright
APP=8990
srv=subprocess.Popen(['python3','-m','http.server',str(APP),'-d','s88'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
OK=[]
def ck(n,c,x=''):OK.append(bool(c));print(('✓ ' if c else '✗ ')+n+(' — '+str(x) if x!='' else ''),flush=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844});pg=await ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(e.message[:200]))
    reqs=[]
    async def gc(route):
      u=route.request.url;reqs.append(u);path=re.search(r'/counter/([^.?]+)\.json',u).group(1)
      if path in('evento-lichess',):n=30
      elif path=='evento-online-jogo':n=70
      elif path=='TOTAL':n=500
      else:n=7
      await route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body=json.dumps({'count':str(n)}))
    await pg.route(re.compile(r'https://paescoelho\.goatcounter\.com/counter/.*'),gc)
    await pg.route('https://rota-turn.paescoelho.workers.dev/lichess',lambda r:r.fulfill(status=502,body='{}',headers={'Access-Control-Allow-Origin':'*'}))
    await pg.route('https://lichess.org/api/puzzle/daily',lambda r:r.fulfill(status=503,body='{}',headers={'Access-Control-Allow-Origin':'*'}))
    await pg.goto(f'http://localhost:{APP}/')
    try: await pg.get_by_text('Pular').first.click(timeout=8000)
    except Exception: pass
    await pg.wait_for_selector('.menu');await asyncio.sleep(0.5)
    await pg.evaluate("sessionStorage.clear();V27.sent={};V27.web=()=>true;localStorage.removeItem('rdm-nao-contar');window.__ev=[];window.goatcounter={count:o=>window.__ev.push(o.path)}")
    # navega pelos botões
    await pg.evaluate("V31.home()");await asyncio.sleep(0.6)
    await pg.evaluate("document.querySelector('.v35-xb.cc').click()");await asyncio.sleep(0.2)
    await pg.evaluate("V83.home()");await asyncio.sleep(0.6)
    await pg.evaluate("V83.home(true)");await asyncio.sleep(0.3)
    await pg.evaluate("V87.markSolved('x','limpo')")
    await pg.evaluate("App.menu()");await asyncio.sleep(0.4)
    await pg.evaluate("document.querySelector('.v71-int').click()");await asyncio.sleep(0.4)
    await pg.evaluate("App.menu()");await asyncio.sleep(0.3)
    await pg.evaluate("Dna.rival()");await asyncio.sleep(0.4)
    await pg.evaluate("App.menu()");await asyncio.sleep(0.3)
    await pg.evaluate("[...document.querySelectorAll('.menu .mitem')].find(b=>/Hist/.test(b.textContent)).click()");await asyncio.sleep(0.4)
    await pg.evaluate("V74.open()");await asyncio.sleep(0.4)
    await pg.evaluate("V31.room={status:'play',moves:['e2e4','e7e5'],hostColor:'w',hostName:'A',guestName:'B'};try{V31.render()}catch(e){}")
    await asyncio.sleep(1.5)
    ev=await pg.evaluate("window.__ev")
    print('eventos enviados:',ev)
    for k in ['evento-online','evento-chesscom','evento-lichess','evento-lichess-problema','evento-integrado','evento-adversario','evento-historia','evento-lendas','evento-online-jogou']:
      ck('conta '+k,k in ev)
    ck('cada item conta uma vez por sessão',len(ev)==len(set(ev)),len(ev))
    # painel do criador
    await pg.evaluate("V34.isAdmin=()=>true;localStorage.removeItem('rdm-pn-cache')")
    n0=len(reqs);await pg.evaluate("V27.panel()")
    for i in range(80):
      if await pg.evaluate("!document.querySelector('.v27-load')"):break
      await asyncio.sleep(0.25)
    t=await pg.evaluate("document.querySelector('.col').innerText")
    ck('painel mostra os botões do menu','Botões do menu principal' in t and 'Seu maior adversário' in t)
    ck('painel separa online do jogo e Lichess','Online do jogo' in t and 'Online do Lichess' in t and 'Jogar online: do jogo ou do Lichess?' in t)
    sp=await pg.evaluate("document.querySelector('.v27-split').innerText.replace(/\\n/g,' ')")
    ck('comparação 70 x 30','70 jogo' in sp and '30 Lichess' in sp and '70% / 30%' in sp,sp)
    ck('itens antigos continuam (convite, assistir, Pix)','Abriu o convite de um amigo' in t and 'Assistiu a uma partida ao vivo' in t and 'Copiou o código Pix' in t)
    n1=len(reqs);ck('busca feita',n1>n0,n1-n0)
    await pg.screenshot(path='p88.png',full_page=True)
    await pg.evaluate("App.menu()");await asyncio.sleep(0.3);await pg.evaluate("V27.panel()");await asyncio.sleep(1)
    ck('reabrir em 10 min usa o cache (sem novas buscas)',len(reqs)==n1 and 'guardados' in await pg.evaluate("document.querySelector('.v27-up').innerText"),len(reqs)-n1)
    await pg.evaluate("[...document.querySelectorAll('.v27-up button')][0].click()")
    for i in range(80):
      if await pg.evaluate("!document.querySelector('.v27-load')"):break
      await asyncio.sleep(0.25)
    ck('Atualizar busca de novo',len(reqs)>n1,len(reqs)-n1)
    ck('sem erros de JavaScript',not errs,errs)
    await b.close()
asyncio.run(main());srv.terminate()
print(f'\n{sum(OK)}/{len(OK)} ok')
