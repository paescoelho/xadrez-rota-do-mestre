import asyncio, subprocess, time, sys, json
from playwright.async_api import async_playwright
SITE = sys.argv[1]
PORT = 8993
srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '-d', SITE], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
OK = []
def ck(n, c, x=''):
    OK.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (' — ' + str(x) if x != '' else ''), flush=True)

JS_UNIT = r"""
() => {const {V82,V121,V123,V74,Engine,SF,LENDAS,Profile,Think}=window.__T;
 const out={};
 out.engine = V82.engine===V123.move;
 const L = V74.get(LENDAS[0].id); out.lenda = L.n||L.name||L.id; out.e = L.e;
 out.human = V123.human(); out.C = V123.C(L);
 // repetição na partida: Cf3 Cf6 Cg1 Cg8 Cf3 Cf6 Cg1 (pretas jogam)
 const ucis=['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1'];
 let p=Engine.posFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
 for(const u of ucis){Engine.makeMove(p,Engine.uciToMove(p,u));}
 const fen=Engine.toFEN(p); out.fen=fen;
 const h=V123.hist({ucis, fen});
 out.repG8 = V123.repeats(fen,'f6g8',h);
 out.repE5 = V123.repeats(fen,'e7e5',h);
 out.drawG8 = V123.drawish(fen,['f6g8'],0,h);
 out.drawE5 = V123.drawish(fen,['e7e5','e2e4'],-20,h);
 // escolha com linhas simuladas
 const cx={h, C:120};
 const mk=(pv,cp)=>({pv,cp});
 let c=V123.rate(fen,[mk(['f6g8'],0),mk(['e7e5','e2e4'],-30),mk(['d7d5'],-45)],cx);
 out.rateTop=c[0].u; out.rateTopA=c[0].a;
 let picks={}; for(let i=0;i<300;i++){const ch=V123.pick(fen,c,L,cx);picks[ch.u]=(picks[ch.u]||0)+1;}
 out.picksAvoid=picks;
 // empate legítimo: alternativas perdem muito
 c=V123.rate(fen,[mk(['f6g8'],0),mk(['e7e5'],-400),mk(['d7d5'],-500)],cx);
 picks={}; for(let i=0;i<300;i++){const ch=V123.pick(fen,c,L,cx);picks[ch.u]=(picks[ch.u]||0)+1;}
 out.picksLegit=picks;
 // sem desprezo (jogador de força parecida): comportamento antigo
 const cx0={h,C:0};
 c=V123.rate(fen,[mk(['f6g8'],0),mk(['e7e5','e2e4'],-30),mk(['d7d5'],-45)],cx0);
 out.noContemptTop=c[0].u;
 // conversão: vantagem decisiva joga sempre o melhor
 c=V123.rate(fen,[mk(['e7e5'],350),mk(['d7d5'],340),mk(['c7c5'],330)],cx);
 picks={}; for(let i=0;i<300;i++){const ch=V123.pick(fen,c,L,cx);picks[ch.k+':'+ch.u]=(picks[ch.k+':'+ch.u]||0)+1;}
 out.picksConv=picks;
 return out;
}
"""

JS_LIVE = r"""
(args) => new Promise(res => {const {V82,V121,V123,V74,Engine,SF,LENDAS,Think}=window.__T;
 const [mode,start,ucis] = args;
 const L = LENDAS[0];
 let p=Engine.posFromFEN(start);
 for(const u of ucis){Engine.makeMove(p,Engine.uciToMove(p,u));}
 const q={cmd:'ghost',fen:Engine.toFEN(p),start:start,ucis:ucis.slice(),human:1,dna:{src:'lenda',lid:L.id}};
 const prev=(x,cb)=>cb(x&&x.cmd==='cpunote'?{uci:x.uci}:null);
 const fn = mode==='old' ? V121.move : V123.move;
 const calls=[]; const go0=SF.go;
 SF.go=function(j,cb){calls.push({mp:j.multipv,sm:j.searchmoves?j.searchmoves.split(' ').length:0});return go0.call(SF,j,cb);};
 fn(q, r => {SF.go=go0; res({uci:r&&r.uci, last: mode==='old'?null:V123.last, calls});}, prev);
})
"""

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(e.message[:200]))
        async def block(route):
            if route.request.url.startswith(f'http://localhost:{PORT}/'): await route.continue_()
            else: await route.abort()
        await pg.route('**/*', block)
        await pg.goto(f'http://localhost:{PORT}/')
        try: await pg.get_by_text('Pular').first.click(timeout=15000)
        except Exception: pass
        await pg.wait_for_selector('.menu', timeout=60000)
        ver = await pg.evaluate("document.querySelector('.menu-version')&&document.querySelector('.menu-version').textContent")
        ck('versão no menu', ver == 'Versão: 21.11.2026', ver)
        await pg.evaluate("window.__fn=[...document.querySelectorAll('*')].map(e=>e.onclick).find(f=>typeof f==='function')")
        cdp = await ctx.new_cdp_session(pg)
        fo = await cdp.send('Runtime.evaluate', {'expression': 'window.__fn'})
        props = await cdp.send('Runtime.getProperties', {'objectId': fo['result']['objectId'], 'ownProperties': False})
        scopes = [p for p in props.get('internalProperties', []) if p['name'] == '[[Scopes]]'][0]
        sl = await cdp.send('Runtime.getProperties', {'objectId': scopes['value']['objectId'], 'ownProperties': True})
        found = False
        for sc in sl['result']:
            if 'value' not in sc or 'objectId' not in sc['value']: continue
            vs = await cdp.send('Runtime.getProperties', {'objectId': sc['value']['objectId'], 'ownProperties': True})
            names = [v['name'] for v in vs['result']]
            print(sc['name'], len(names), [n for n in names if n.startswith('V8') or n.startswith('V12') or n in ('Engine','SF','LENDAS','Think','V74')][:20])
            if 'V82' in names and 'Engine' in names:
                await cdp.send('Runtime.evaluate', {'expression': 'window.__T={}'})
                for v in vs['result']:
                    if v['name'] in ('V82','V121','V74','Engine','SF','LENDAS','Think') and 'value' in v and 'objectId' in v['value']:
                        await cdp.send('Runtime.callFunctionOn', {'functionDeclaration': 'function(x,n){window.__T[n]=x;}', 'objectId': fo['result']['objectId'], 'arguments': [{'objectId': v['value']['objectId']}, {'value': v['name']}]})
                found = True; break
        # V123 = variável V no escopo de V82.engine
        eo = await cdp.send('Runtime.evaluate', {'expression': 'window.__T.V82.engine'})
        ep = await cdp.send('Runtime.getProperties', {'objectId': eo['result']['objectId'], 'ownProperties': False})
        esc = [p for p in ep.get('internalProperties', []) if p['name'] == '[[Scopes]]'][0]
        esl = await cdp.send('Runtime.getProperties', {'objectId': esc['value']['objectId'], 'ownProperties': True})
        for sc in esl['result']:
            if 'value' not in sc or 'objectId' not in sc['value']: continue
            vs = await cdp.send('Runtime.getProperties', {'objectId': sc['value']['objectId'], 'ownProperties': True})
            for v in vs['result']:
                if v['name'] == 'V' and 'value' in v and 'objectId' in v['value']:
                    await cdp.send('Runtime.callFunctionOn', {'functionDeclaration': 'function(x){if(x&&x.pick&&x.drawish)window.__T.V123=x;}', 'objectId': fo['result']['objectId'], 'arguments': [{'objectId': v['value']['objectId']}]})
        ck('acesso aos módulos para teste', found)
        print(await pg.evaluate("['V82','V121','V123','V74','Engine','SF','LENDAS','Think'].map(n=>n+':'+typeof (window.__T||{})[n]).join(' ')"))
        u = await pg.evaluate(JS_UNIT)
        print(json.dumps(u, ensure_ascii=False))
        ck('lenda usa o motor v123', u['engine'])
        ck('desprezo máximo contra iniciante', u['C'] == 120, u['C'])
        ck('Cg8 repete posição', u['repG8'] and not u['repE5'])
        ck('linha Cg8 detectada como repetição', u['drawG8'] and not u['drawE5'])
        ck('nota ajustada põe e5 acima da repetição', u['rateTop'] == 'e7e5', u['rateTopA'])
        ck('recusa a repetição (300 sorteios)', 'f6g8' not in u['picksAvoid'], u['picksAvoid'])
        ck('aceita empate legítimo quando o resto perde', u['picksLegit'].get('f6g8', 0) == 300, u['picksLegit'])
        ck('sem desprezo, repetição continua a melhor', u['noContemptTop'] == 'f6g8')
        ck('vantagem decisiva: sempre o melhor', u['picksConv'] == {'conv:e7e5': 300}, u['picksConv'])
        # Stockfish de verdade
        await pg.evaluate("__T.SF.init()")
        await pg.wait_for_function("__T.SF.ready||__T.SF.failed", timeout=60000)
        ck('Stockfish carregou', await pg.evaluate("__T.SF.ready&&!__T.SF.failed"))
        FR='rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 1 3'
        U=['g8e7','g1f3','e7g8','f3g1','g8e7','g1f3','e7g8','f3g1','g8e7','g1f3']
        for mode in ('old','new'):
            res=[]
            for i in range(4):
                r = await pg.evaluate(JS_LIVE, [mode,FR,U]); res.append(r['uci'])
                if mode=='new': print('  v123', r['last'], r['calls'])
            print(mode, 'francesa, lenda um pouco pior:', res)
            if mode=='old': ck('antes: a lenda aceitava o empate (Cg8)', res.count('e7g8')>=3, res)
            else: ck('agora: recusa o empate e segue jogando', 'e7g8' not in res, res)
        NQ='rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'
        U2=['g8f6','g1f3','f6g8','f3g1','g8f6','g1f3','f6g8','f3g1','g8f6','g1f3']
        res=[]
        for i in range(3):
            r = await pg.evaluate(JS_LIVE, ['new',NQ,U2]); res.append(r['uci']); print('  v123', r['last'], r['calls'])
        ck('sem a dama (perdida): aceita o empate legítimo', res.count('f6g8')==3, res)
        bk = await pg.evaluate(r"""() => new Promise(res => {const {V82,V123,V74,Engine,LENDAS,Think}=window.__T;
 const L=V74.get(LENDAS[0].id), S='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 const dna=V74.dna(L);
 Think.run({cmd:'ghost',fen:S,ucis:[],human:-1,dna:dna}, r => {
  const out={first:r&&r.uci,book:r&&r.book};
  const p=Engine.posFromFEN(S);Engine.makeMove(p,Engine.uciToMove(p,'e2e4'));
  const h={};h[V82.key(S)]=1;h[V82.key(Engine.toFEN(p))]=1;
  V123.cur={fen:S,h:h};
  const got={};for(let i=0;i<200;i++){const x=V82.probe(L.id,S);const k=x?x.uci:'null';got[k]=(got[k]||0)+1;}
  out.filtered=got;V123.cur=null;res(out);
 });
})""")
        print(bk)
        ck('livro real abre a partida normalmente', bk['book'] and bk['first'], bk['first'])
        ck('livro troca o lance que repetiria posição', 'e2e4' not in bk['filtered'] and 'null' not in bk['filtered'], bk['filtered'])
        gm = await pg.evaluate(r"""() => new Promise(res => {const {V74,Engine,LENDAS,Think}=window.__T;
 const L=V74.get(LENDAS[3].id),dna=V74.dna(L),S='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 const p=Engine.posFromFEN(S),ucis=[];let n=0,books=0,t0=Date.now();
 const step=()=>{
  const lm=Engine.legalMoves(p);if(!lm.length||ucis.length>=40){res({n:ucis.length,books,s:Math.round((Date.now()-t0)/1000)});return;}
  if(ucis.length%2===0){ // humano (brancas) joga lance aleatório
   const m=lm[Math.floor(Math.random()*lm.length)];ucis.push(Engine.moveToUCI(m));Engine.makeMove(p,m);step();return;}
  Think.run({cmd:'ghost',fen:Engine.toFEN(p),ucis:ucis.slice(),human:1,dna:dna},r=>{
   if(!r||!r.uci){res({fail:true,n:ucis.length});return;}
   if(r.book)books++;const m=Engine.uciToMove(p,r.uci);if(m<0){res({illegal:r.uci});return;}
   ucis.push(r.uci);Engine.makeMove(p,m);step();});
 };step();
})""")
        print(gm)
        ck('partida inteira contra a lenda sem travar', gm.get('n',0)>=20 and not gm.get('fail') and not gm.get('illegal'), gm)
        ck('sem erros de página', not errs, errs)
        await b.close()
    srv.terminate()
    print('RESULTADO', sum(OK), '/', len(OK))

asyncio.run(main())
