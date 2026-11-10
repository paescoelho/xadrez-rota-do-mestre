const fs=require('fs');
let t=fs.readFileSync(__dirname+'/template.html','utf8');
let app=fs.readFileSync(__dirname+'/../out/app.js','utf8');
/* camada v22 (JS puro): entra no escopo do app, logo antes de Main.main() */
{const ex=fs.readFileSync(__dirname+'/extras_v22.js','utf8');const k=app.lastIndexOf('Main.main();');if(k<0)throw new Error('Main.main() não encontrado');app=app.slice(0,k)+ex+'\n'+app.slice(k);}
/* camada v23 (Stockfish no jogo, relógio de estudo, visão, padrões de mate, conta Google e backup).
   O login Google só liga se existir web/firebase-config.json (config pública do Firebase, sem segredos). */
{let fb='null';const fp=__dirname+'/firebase-config.json';if(fs.existsSync(fp)){const c=JSON.parse(fs.readFileSync(fp,'utf8'));if(c.apiKey&&c.projectId)fb=JSON.stringify(c);}
 const ex='var V23_FIREBASE='+fb+';\n'+fs.readFileSync(__dirname+'/extras_v23.js','utf8');const k=app.lastIndexOf('Main.main();');app=app.slice(0,k)+ex+'\n'+app.slice(k);}
/* camada v24: Raio-X do pensamento (registro por lance, agudeza, certeza, domínio por tema, tilt, IndexedDB, PWA) */
{const ex=fs.readFileSync(__dirname+'/extras_v24.js','utf8');const k=app.lastIndexOf('Main.main();');app=app.slice(0,k)+ex+'\n'+app.slice(k);}
{const ex='/* QR Code Generator for JavaScript, Copyright (c) 2009 Kazuhiko Arase, licença MIT */\n'+fs.readFileSync(__dirname+'/qr_v25.part.js','utf8')+'\n'+fs.readFileSync(__dirname+'/extras_v25.js','utf8')+'\n'+fs.readFileSync(__dirname+'/extras_v26.js','utf8');const k=app.lastIndexOf('Main.main();');app=app.slice(0,k)+ex+'\n'+app.slice(k);}
if(/<\/script/i.test(app)) throw new Error('</script no app.js');
let css='';
/* peças com volume: degradê radial (luz vinda do alto à esquerda) no mesmo desenho; por tema e na edição marfim e ébano */
function grad(id,a,b,c){return `<radialGradient id="${id}" cx=".34" cy=".26" r=".95"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;}
function shade(code,P){
  let svg=fs.readFileSync(`${__dirname}/${code}.svg`,'utf8');
  const w=code[0]==='w';
  if(!w) svg=svg.replace('<path stroke="#000"','<path fill="#000" stroke="#000"');
  if(P.flat){
    if(w) svg=svg.replace(/fill="#fff"/g,`fill="${P.w[0]}"`).replace(/stroke="#000"/g,`stroke="${P.w[1]}"`).replace(/fill="#000"/g,`fill="${P.w[1]}"`);
    else svg=svg.replace(/fill="#000"/g,`fill="${P.b[0]}"`).replace(/stroke="#000"/g,`stroke="${P.b[1]}"`).replace(/#ececec/g,P.b[2]);
    return svg;
  }
  const g=w?grad('g',...P.wg):grad('g',...P.bg);
  svg=svg.replace(/(<svg[^>]*>)/,`$1<defs>${g}</defs>`);
  if(w) svg=svg.replace(/fill="#fff"/g,'fill="url(#g)"').replace(/stroke="#000"/g,`stroke="${P.wl}"`).replace(/fill="#000"/g,`fill="${P.wl}"`);
  else svg=svg.replace(/fill="#000"/g,'fill="url(#g)"').replace(/stroke="#000"/g,`stroke="${P.bl}"`).replace(/#ececec/g,P.bd);
  return svg;
}
const STD={wg:['#ffffff','#f3f0e8','#c8c0ae'],wl:'#000',bg:['#6b6b6b','#262626','#030303'],bl:'#000',bd:'#ececec'};
const PAL={
  ceu:{wg:['#ffffff','#eef4f9','#bccddb'],wl:'#3c5368',bg:['#63b6e6','#2b86bd','#124f78'],bl:'#0c3550',bd:'#e3f3fc'},
  lavanda:{wg:['#fffdf8','#f3ecf7','#cbbcdb'],wl:'#2c1f40',bg:['#6d5694','#3a2858','#1a1030'],bl:'#160c26',bd:'#eadff6'},
  pixel:{flat:true,w:['#fff1e8','#1d2b53'],b:['#1d2b53','#090f26','#ffec27']}
};
const LUX={wg:['#fffdf3','#f2e4c3','#c9a56a'],wl:'#5a3d14',bg:['#5e4832','#1f1710','#050403'],bl:'#0b0906',bd:'#e6c16a'};
const b64=x=>Buffer.from(x).toString('base64');
for(const c of ['w','b'])for(const p of ['K','Q','R','B','N','P'])css+=`.pc.${c}${p}{background-image:url("data:image/svg+xml;base64,${b64(shade(c+p,STD))}")}\n`;
for(const th in PAL)for(const c of ['w','b'])for(const p of ['K','Q','R','B','N','P'])css+=`.bt-${th} .pc.${c}${p}{background-image:url("data:image/svg+xml;base64,${b64(shade(c+p,PAL[th]))}")}\n`;
for(const c of ['w','b'])for(const p of ['K','Q','R','B','N','P'])css+=`.ps-lux .pc.${c}${p}{background-image:url("data:image/svg+xml;base64,${b64(shade(c+p,LUX))}")}\n`;
for(const c of ['w','b'])for(const p of ['F','E','S']){
  const svg=fs.readFileSync(`${__dirname}/anc/${c}${p}.svg`);
  css+=`.pc.${c}${p}{background-image:url("data:image/svg+xml;base64,${svg.toString('base64')}")}\n`;
}
const bg=fs.readFileSync(__dirname+'/../media/menu_bg2.jpg').toString('base64');
const font=(f)=>fs.readFileSync(__dirname+'/fonts/'+f).toString('base64');
const fonts=`@font-face{font-family:"Cinzel Decorative";font-weight:900;font-display:block;src:url(data:font/woff2;base64,${font('cinzel-decorative-latin-900-normal.woff2')}) format("woff2")}
@font-face{font-family:"Cinzel Decorative";font-weight:700;font-display:block;src:url(data:font/woff2;base64,${font('cinzel-decorative-latin-700-normal.woff2')}) format("woff2")}
@font-face{font-family:"Cinzel";font-weight:600;font-display:block;src:url(data:font/woff2;base64,${font('cinzel-latin-600-normal.woff2')}) format("woff2")}
/* Cinzel e Cinzel Decorative: SIL Open Font License 1.1, The Cinzel Project Authors */`;
const fdir=__dirname+'/../media/stills/';
const frames=fs.readdirSync(fdir).filter(f=>f.endsWith('.webp')).sort().map(f=>fs.readFileSync(fdir+f).toString('base64'));
const aud=fs.readFileSync(__dirname+'/../media/intro_audio.mp3').toString('base64');
/* v25: narração do menu História do xadrez */
const histau=fs.readFileSync(__dirname+'/../media/historia_audio.mp3');
const hdx=fs.readFileSync(__dirname+'/../media/intro_hd.json','utf8');
let res='';
for(const n of ['content','lpuzzles','openings','explorer','models']){const ext=n==='content'?'json':'txt';const txt=fs.readFileSync(__dirname+'/../res/'+n+'.'+ext,'utf8');if(/<\/script|<!--/i.test(txt))throw new Error('texto proibido em '+n);res+='<script type="text/plain" id="res_'+n+'">'+txt+'</script>\n';}
res+='<script type="text/plain" id="res_histau">'+histau.toString('base64')+'</script>\n';
const hd=fs.readFileSync(__dirname+'/../media/intro_hd.bin').toString('base64');
/* Stockfish 19 lite (GPLv3, nmrugg/stockfish.js): só na versão completa; a leve usa o motor do jogo */
const sfjs=fs.readFileSync(__dirname+'/../sf/bin/stockfish-19-lite-single.js','utf8');
if(/<\/script|<!--/i.test(sfjs))throw new Error('texto proibido no stockfish.js');
const sfwasm=fs.readFileSync(__dirname+'/../sf/bin/stockfish-19-lite-single.wasm').toString('base64');
const sfTags='<script type="text/plain" id="res_sfjs">'+sfjs+'</script>\n<script type="text/plain" id="res_sfwasm">'+sfwasm+'</script>\n';
const base=t;
function make(lite){let t=base;
t=t.replace('FONTS_CSS',()=>fonts).replace('PIECES_CSS',()=>css).replace('MENU_BG',()=>'"data:image/jpeg;base64,'+bg+'"').replace('INTRO_FRAMES',()=>lite?'[]':JSON.stringify(frames)).replace('INTRO_AUDIO',()=>lite?'':aud).replace('INTRO_HDX',()=>lite?'null':hdx).replace('INTRO_HD',()=>lite?'':hd).replace('INTRO_LITE',()=>lite?'true':'false').replace('RES_TAGS',()=>res+(lite?'':sfTags)).replace('APP_JS',()=>app);
return t;}
for(const [lite,name] of [[false,'xadrez-treinador.html'],[true,'xadrez-treinador-leve.html']]){const t=make(lite);fs.writeFileSync(__dirname+'/../out/'+name,t);console.log(name,(t.length/1e6).toFixed(2)+'MB');}

/* ======================= site para o GitHub Pages (PWA) =======================
   site/index.html (interface, estilos e carregador) + site/data/* (jogo, motor, problemas, abertura) + sw.js (cache offline)
   + manifest e ícones. Cada arquivo de dados leva um ?v=<hash>: só o que mudou é baixado de novo numa atualização. */
{
const crypto=require('crypto'),path=require('path');
const S=__dirname+'/../site';
fs.rmSync(S,{recursive:true,force:true});fs.mkdirSync(S+'/data',{recursive:true});fs.mkdirSync(S+'/icons',{recursive:true});fs.mkdirSync(S+'/baixar',{recursive:true});
const files={};
function put(name,buf){fs.writeFileSync(S+'/data/'+name,buf);files[name]=crypto.createHash('md5').update(buf).digest('hex').slice(0,10);}
put('app.js',Buffer.from(app,'utf8'));
for(const n of ['content','lpuzzles','openings','explorer','models']){const ext=n==='content'?'json':'txt';put(n+'.'+ext,fs.readFileSync(__dirname+'/../res/'+n+'.'+ext));}
put('sf.js',fs.readFileSync(__dirname+'/../sf/bin/stockfish-19-lite-single.js'));
put('sf.wasm',fs.readFileSync(__dirname+'/../sf/bin/stockfish-19-lite-single.wasm'));
put('introfr.json',Buffer.from(JSON.stringify(frames),'utf8'));
put('introau.txt',Buffer.from(aud,'utf8'));
put('introhdx.json',Buffer.from(hdx,'utf8'));
put('intro_hd.bin',fs.readFileSync(__dirname+'/../media/intro_hd.bin'));
put('historia.mp3',histau);
const U=n=>'data/'+n+'?v='+files[n];
const loader=`<script>
/* carregador do site: baixa (ou pega do cache offline) os arquivos do jogo, mostra o progresso e inicia o app */
(function(){
 var F=${JSON.stringify({res:[['res_content',U('content.json')],['res_lpuzzles',U('lpuzzles.txt')],['res_openings',U('openings.txt')],['res_explorer',U('explorer.txt')],['res_models',U('models.txt')],['res_sfjs',U('sf.js')]],intro:[['introfr',U('introfr.json')],['introau',U('introau.txt')],['introhdx',U('introhdx.json')]],hd:U('intro_hd.bin'),histau:U('historia.mp3'),wasm:U('sf.wasm'),app:U('app.js')})};
 var c=navigator.connection||{},slow=!!(c.saveData||/(^|-)2g|3g/.test(c.effectiveType||''));
 var box=document.createElement('div');box.id='boot';box.innerHTML='<div class="bt">Rota do Mestre</div><div class="bb"><i></i></div><div class="bs">Preparando o tabuleiro…</div>';document.body.appendChild(box);
 var bar=box.querySelector('i'),msg=box.querySelector('.bs'),done=0,total=F.res.length+(slow?0:F.intro.length+1)+1;
 function step(){done++;bar.style.width=Math.round(done*100/total)+'%';}
 function txt(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u);return r.text();}).then(function(t){step();return t;});}
 function tag(id,t,type){var e=document.getElementById(id);if(!e){e=document.createElement('script');e.type=type||'text/plain';e.id=id;document.body.appendChild(e);}e.textContent=t;}
 window.XSFURL=new URL(F.wasm,location.href).href;window.XHISTAU=new URL(F.histau,location.href).href;
 var jobs=F.res.map(function(x){return txt(x[1]).then(function(t){tag(x[0],t);});});
 if(slow){window.XLITE=true;tag('introfr','[]','application/json');tag('introhdx','null','application/json');}
 else{jobs=jobs.concat(F.intro.map(function(x){return txt(x[1]).then(function(t){tag(x[0],t,x[0]==='introau'?'text/plain':'application/json');});}));
  jobs.push(fetch(F.hd).then(function(r){return r.ok?r.arrayBuffer():null;}).then(function(b){if(b)window.XHDBUF=new Uint8Array(b);step();}).catch(function(){tag('introhdx','null','application/json');step();}));}
 Promise.all(jobs).then(function(){return txt(F.app);}).then(function(code){
  msg.textContent='Abrindo…';var s=document.createElement('script');s.id='appjs';s.textContent=code;document.body.appendChild(s);
  setTimeout(function(){box.remove();},300);
  /* o cache offline é montado depois que o jogo abriu, para não disputar a banda com o carregamento */
  if('serviceWorker' in navigator){var reg=function(){setTimeout(function(){navigator.serviceWorker.register('./sw.js').catch(function(){});},4000);};if(document.readyState==='complete')reg();else window.addEventListener('load',reg);}
 }).catch(function(e){msg.innerHTML='Não foi possível carregar o jogo. Verifique a internet e toque para tentar de novo.';box.onclick=function(){location.reload();};});
})();
</script>`;
const head=`<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0b0d10"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="icons/icon-192.png"><link rel="icon" type="image/png" href="icons/icon-192.png">
<style>#boot{position:fixed;inset:0;z-index:99;background:#050606;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#f3d98c;font-family:Georgia,serif}#boot .bt{font-size:26px;letter-spacing:2px}#boot .bb{width:min(70vw,320px);height:6px;border-radius:4px;background:#262c35;overflow:hidden}#boot .bb i{display:block;width:0;height:100%;background:linear-gradient(90deg,#b8852f,#f3d98c);transition:width .25s}#boot .bs{font:13px system-ui,sans-serif;color:#98a1ab}</style>`;
let idx=base.replace('FONTS_CSS',()=>fonts).replace('PIECES_CSS',()=>css).replace('MENU_BG',()=>'"data:image/jpeg;base64,'+bg+'"')
 .replace('INTRO_FRAMES',()=>'[]').replace('INTRO_AUDIO',()=>'').replace('INTRO_HDX',()=>'null').replace('INTRO_HD',()=>'').replace('INTRO_LITE',()=>'false')
 .replace('RES_TAGS',()=>'').replace(/<script id="appjs">\s*APP_JS\s*<\/script>/,()=>loader).replace('</head>',()=>head+'\n</head>');
if(idx.indexOf('APP_JS')>=0)throw new Error('APP_JS sobrou no index');
fs.writeFileSync(S+'/index.html',idx);
for(const f of fs.readdirSync(__dirname+'/icons'))fs.copyFileSync(__dirname+'/icons/'+f,S+'/icons/'+f);
fs.writeFileSync(S+'/manifest.webmanifest',JSON.stringify({name:'Xadrez · Rota do Mestre',short_name:'Rota do Mestre',description:'Treinador de xadrez: jogue, aprenda e acompanhe o seu pensamento.',lang:'pt-BR',start_url:'./',scope:'./',display:'standalone',orientation:'portrait',background_color:'#0b0d10',theme_color:'#0b0d10',
 icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,1));
const core=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'].concat(Object.keys(files).map(U));
const ver=crypto.createHash('md5').update(idx+JSON.stringify(files)).digest('hex').slice(0,10);
fs.writeFileSync(S+'/sw.js',`/* cache offline do Rota do Mestre (gerado pelo build) */
const V='rdm-${ver}';
const CORE=${JSON.stringify(core)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(async c=>{for(const u of CORE){const old=await caches.match(u);if(old&&u.indexOf('?v=')>0){await c.put(u,old);continue;}try{const r=await fetch(u,{cache:'no-cache'});if(r.ok)await c.put(u,r);}catch(err){}}}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('rdm-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put('index.html',cp));return res;}).catch(()=>caches.match('index.html')));return;}
 e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&u.search.indexOf('v=')>=0){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})));});
`);
fs.writeFileSync(S+'/.nojekyll','');
fs.copyFileSync(__dirname+'/../out/xadrez-treinador.html',S+'/baixar/Rota-do-Mestre-offline.html');
fs.copyFileSync(__dirname+'/../out/xadrez-treinador-leve.html',S+'/baixar/Rota-do-Mestre-offline-leve.html');
let tot=0;for(const n in files)tot+=fs.statSync(S+'/data/'+n).size;
console.log('site/index.html',(idx.length/1e6).toFixed(2)+'MB · data',(tot/1e6).toFixed(2)+'MB · versão',ver);
}
