/* cache offline do Rota do Mestre (gerado pelo build) */
const V='rdm-275359878d';
const CORE=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","data/app.js?v=561d71ad90","data/content.json?v=facebd0421","data/lpuzzles.txt?v=6a7f7438c2","data/openings.txt?v=0433d98604","data/explorer.txt?v=a49e3a075b","data/models.txt?v=d4b717e2fe","data/sf.js?v=81cc4511ff","data/sf.wasm?v=c56761eebb","data/introfr.json?v=361b412139","data/introau.txt?v=ce6089d3a7","data/introhdx.json?v=efe43de4ba","data/intro_hd.bin?v=2f137ab566","data/historia.mp3?v=96a5aca958"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(async c=>{for(const u of CORE){const old=await caches.match(u);if(old&&u.indexOf('?v=')>0){await c.put(u,old);continue;}try{const r=await fetch(u,{cache:'no-cache'});if(r.ok)await c.put(u,r);}catch(err){}}}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('rdm-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put('index.html',cp));return res;}).catch(()=>caches.match('index.html')));return;}
 e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&u.search.indexOf('v=')>=0){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})));});
