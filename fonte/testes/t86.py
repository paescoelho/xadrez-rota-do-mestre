import asyncio,subprocess,time,json,urllib.request
from playwright.async_api import async_playwright
srv=subprocess.Popen(['python3','-m','http.server','8971','-d','s86'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
wk=subprocess.Popen(['python3','fakeworker.py','8972']);time.sleep(1)
FAKE=open('fake.js').read().replace("window.firebase={firestore:","window.firebase={auth:function(){return {currentUser:{getIdToken:function(){return Promise.resolve('tokenFirebaseTeste')}}}},firestore:").replace("function Peer(){var me=this;","function Peer(id,opts){var me=this;Peer.opts=opts;")
async def run(pg,me,uid):
  await pg.goto('http://localhost:8971/')
  try: await pg.get_by_text('Pular').first.click(timeout=8000)
  except Exception: pass
  await pg.wait_for_selector('.menu');await pg.evaluate(FAKE)
  await pg.evaluate(f"""()=>{{V41.TURN='http://127.0.0.1:8972/';V41.iceC=null;V41.iceUntil=0;
   const ac=new AudioContext(),o=ac.createOscillator(),d=ac.createMediaStreamDestination();o.connect(d);o.start();navigator.mediaDevices.getUserMedia=async()=>d.stream.clone();
   V31.db=window.__fakeDb;V31.room={{status:'play',host:'uA',guest:'uB',hostColor:'w',moves:[],hostName:'Rodrigo',guestName:'Ana'}};V31.code='SALA3';V31.me='{me}';V31.uid='{uid}';V31.view='game';
   var b=document.createElement('div');b.className='v35-tools';document.body.prepend(b);V41.render();}}""")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context()
    w=await ctx.new_page();await run(w,'w','uA')
    await asyncio.sleep(1)
    print('senhas pré-carregadas ao abrir a partida:',await w.evaluate("!!V41.iceC&&V41.iceC.length"))
    await w.evaluate("document.querySelector('.v41-btn').click()");await asyncio.sleep(2)
    o=await w.evaluate("JSON.stringify(Peer.opts.config.iceServers)")
    print('TURN na chamada:','turns:turn.cloudflare.com:443' in o and 'senhaTemp' in o,'| STUN de reserva junto:','stun.l.google.com' in o)
    seen=json.loads(urllib.request.urlopen('http://127.0.0.1:8972/x').read())['seen']
    print('login do Firebase enviado ao Worker:',all(s=='Bearer tokenFirebaseTeste' for s in seen),len(seen),'pedido(s)')
    # serviço fora do ar: a voz continua com STUN
    urllib.request.urlopen('http://127.0.0.1:8972/modo/falha')
    x=await ctx.new_page();await run(x,'b','uB');await x.evaluate("V41.iceC=null;V41.iceUntil=0")
    await x.evaluate("document.querySelector('.v41-btn').click()");await asyncio.sleep(3)
    o2=await x.evaluate("JSON.stringify(Peer.opts.config.iceServers)")
    st=await x.evaluate("V41.state")
    print('Worker fora do ar: chamada segue só com STUN:','turn:' not in o2 and 'stun' in o2,'| estado:',st)
    await b.close()
asyncio.run(main())
srv.terminate();wk.terminate()
