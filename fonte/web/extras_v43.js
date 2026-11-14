/* Rota do Mestre v77 — Lendas Vivas: palco cinematográfico e personagem animado.
 * Extensão progressiva da V42, sem modificar lógica dos 24 adversários.
 * Retrato: quadro estático + camada de personagem e cabeça com
 * microanimações por estado; sem vídeos, dependências externas ou timers.
 */
var V43=(function(){
 var api={};
 api.style=function(){
  if(document.getElementById('v43-style')||typeof document==='undefined')return;
  var el=document.createElement('style');el.id='v43-style';
  el.textContent=[
  '.v43-card{--v43-size:clamp(124px, min(42vw,25dvh), 192px);border-color:rgba(235,199,122,.42)!important;border-radius:16px!important;background:radial-gradient(ellipse at 13% 50%,rgba(188,142,59,.15),transparent 65%),linear-gradient(122deg,#1b202b,#101419 83%)!important;padding:9px 11px!important;margin:3px 0 7px!important;box-shadow:0 8px 24px rgba(0,0,0,.25)!important}',
  '.v43-card .v42-meta{min-height:19px;margin:0 0 5px!important;align-items:center}',
  '.v43-card .v42-meta b{font-size:10px;letter-spacing:.12em;color:#edcb81}',
  '.v43-card .v42-meta em{font-size:10.5px;line-height:1.2;flex:1;text-align:right}',
  '.v43-card .v42-scene{gap:clamp(9px,2vw,16px)!important;align-items:stretch!important}',
  '.v43-card .v42-portrait{width:var(--v43-size)!important;height:var(--v43-size)!important;flex:0 0 var(--v43-size)!important;border-radius:13px!important;background-image:url("data/lendas-portraits.webp")!important;overflow:hidden;animation:none!important;transform:none!important;box-shadow:0 0 0 1px rgba(249,219,157,.36),0 7px 18px rgba(0,0,0,.42)!important}',
  '.v43-card .v42-portrait:after{z-index:3;box-shadow:inset 0 0 0 1px rgba(255,226,163,.23),inset 0 0 15px rgba(0,0,0,.12)!important}',
  '.v43-card .v43-figure,.v43-card .v43-face{position:absolute;inset:-1px;display:block;pointer-events:none;border-radius:inherit;background-image:url("data/lendas-portraits.webp");background-repeat:no-repeat;background-size:400% 600%;background-color:transparent;backface-visibility:hidden;transform-origin:50% 70%;will-change:transform}',
  '.v43-card .v42-portrait{background-color:#202631!important;filter:none!important}',
  '.v43-card .v43-figure{z-index:1;animation:v43breath 4.2s ease-in-out infinite;filter:contrast(1.07) saturate(1.07)}',
  '.v43-card .v43-face{z-index:2;opacity:.88;mask-image:radial-gradient(ellipse 48% 45% at 52% 38%,black 0%,black 42%,transparent 84%);-webkit-mask-image:radial-gradient(ellipse 48% 45% at 52% 38%,black 0%,black 42%,transparent 84%);animation:v43look 7s ease-in-out infinite}',
  '.v43-card.v42-thinking .v43-figure{animation:v43think 3.5s ease-in-out infinite}',
  '.v43-card.v42-thinking .v43-face{animation:v43look 5.1s ease-in-out infinite}',
  '.v43-card.v42-attacking .v43-figure{animation:v43strike 1.35s cubic-bezier(.2,.7,.35,1) 1,v43breath 3.6s ease-in-out 1.35s infinite}',
  '.v43-card.v42-attacking .v43-face{animation:v43focus 1.35s ease-in-out 1,v43look 6s ease-in-out 1.35s infinite}',
  '.v43-card.v42-surprised .v43-figure{animation:v43surprise .85s cubic-bezier(.2,.85,.3,1) 1,v43breath 4s ease-in-out .85s infinite}',
  '.v43-card.v42-surprised .v43-face{animation:v43focus .75s ease-in-out 1,v43look 6s ease-in-out .75s infinite}',
  '.v43-card.v42-victory .v43-figure{animation:v43victory 2.3s ease-in-out infinite}',
  '.v43-card.v42-victory .v43-face{animation:v43look 5s ease-in-out infinite}',
  '.v43-card.v42-pressured .v43-figure{animation:v43tension 2.4s ease-in-out infinite}',
  '.v43-card.v42-pressured .v43-face{animation:v43focus 3s ease-in-out infinite}',
  '.v43-card .v42-phrase{gap:5px!important;justify-content:center;min-width:0}',
  '.v43-card .v42-name{font-size:clamp(13px,1.55vw,17px)!important;line-height:1.2;white-space:normal!important;overflow:visible!important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden!important}',
  '.v43-card .v42-epithet{font-size:clamp(10px,1vw,12px)!important;white-space:normal!important;overflow:visible!important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden!important}',
  '.v43-card .v42-balloon{font-size:clamp(11px,1.2vw,14px)!important;line-height:1.36!important;padding:10px 12px!important;min-height:65px!important;border-radius:13px 13px 13px 5px!important;animation:v42reveal .28s ease-out!important}',
  '.v43-card .v42-foot{display:none!important}',
  '.v43-card .v43-motion{border:1px solid rgba(221,189,112,.28);background:rgba(255,255,255,.045);color:#c8bfa9;width:28px;height:24px;flex:0 0 auto;border-radius:7px;padding:0;font:600 13px/1 system-ui;cursor:pointer;display:inline-grid;place-items:center}',
  '.v43-card .v43-motion:focus-visible{outline:2px solid #e6be65;outline-offset:2px}',
  '.v43-card .v42-fx{z-index:4;right:5px;top:3px}',
  '.v43-card.v42-s1 .v43-face,.v43-card.v42-s1 .v43-figure{image-rendering:pixelated}',
  '@keyframes v43breath{0%,100%{transform:translate3d(0,0,0) scale(1)}45%{transform:translate3d(0,-3px,0) scale(1.015)}70%{transform:translate3d(1px,-1px,0) scale(1.01)}}',
  '@keyframes v43look{0%,16%,100%{transform:rotate(0deg) translate3d(0,0,0)}36%{transform:rotate(.7deg) translate3d(1px,-1px,0)}60%{transform:rotate(-.6deg) translate3d(-1px,1px,0)}}',
  '@keyframes v43think{0%,100%{transform:translate3d(0,0,0) rotate(0deg)}50%{transform:translate3d(0,-4px,0) rotate(.85deg)}}',
  '@keyframes v43strike{0%{transform:translate3d(-3px,3px,0) scale(.98)}32%{transform:translate3d(1px,-5px,0) scale(1.055) rotate(-1deg)}65%{transform:translate3d(0,1px,0) scale(1.013)}100%{transform:none}}',
  '@keyframes v43surprise{0%{transform:translate3d(0,3px,0) scale(.97)}45%{transform:translate3d(0,-6px,0) scale(1.05)}100%{transform:none}}',
  '@keyframes v43focus{0%,100%{transform:rotate(0deg) scale(1)}50%{transform:rotate(-.7deg) scale(1.025)}}',
  '@keyframes v43victory{0%,100%{transform:translate3d(0,0,0) scale(1)}35%{transform:translate3d(0,-5px,0) scale(1.025)}70%{transform:translate3d(0,-2px,0) scale(1.015)}}',
  '@keyframes v43tension{0%,100%{transform:none}30%{transform:translateX(-1px) rotate(-.4deg)}75%{transform:translateX(1px) rotate(.35deg)}}',
  '@media (min-width:850px){.v43-card{--v43-size:clamp(122px,14vw,198px)}}',
  '@media (max-width:420px){.v43-card{--v43-size:clamp(119px,40vw,166px);padding:7px 8px!important}.v43-card .v42-scene{gap:9px!important}.v43-card .v42-balloon{font-size:11.5px!important;padding:8px 9px!important;min-height:54px!important}.v43-card .v42-name{font-size:12.6px!important}.v43-card .v42-meta{margin-bottom:4px!important}}',
  '@media (max-height:680px){.v43-card{--v43-size:clamp(106px,20dvh,138px)}.v43-card .v42-balloon{min-height:44px!important;padding:7px 8px!important}.v43-card .v42-epithet{font-size:10px!important}}',
  '@media (prefers-reduced-motion:reduce){.v43-card .v43-figure,.v43-card .v43-face,.v43-card .v42-balloon{animation:none!important;will-change:auto}}',
  '.v43-card.v42-still .v43-face,.v43-card.v42-still .v43-figure,.v43-card.v42-still .v42-balloon{animation:none!important;will-change:auto}'
  ].join('\n');
  document.head.appendChild(el);
 };
 api.decorate=function(){
  var card=document.querySelector('.v42-card');
  if(!card)return;
  api.style();
  card.classList.add('v43-card');
  var pic=card.querySelector('.v42-portrait');
  if(pic&&!pic.querySelector('.v43-figure')){
   var pos=pic.style.backgroundPosition||'0% 0%';
   var layer=document.createElement('div');layer.className='v43-figure';layer.style.backgroundPosition=pos;
   var face=document.createElement('div');face.className='v43-face';face.style.backgroundPosition=pos;
   pic.insertBefore(layer,pic.firstChild);pic.insertBefore(face,layer.nextSibling);
   pic.setAttribute('aria-label','Caricatura animada de '+(card.querySelector('.v42-name')||{}).textContent);
  }
  // Elimina todas as etiquetas de estilo da interface.
  var foot=card.querySelector('.v42-foot'),bar=card.querySelector('.v42-meta');
  if(foot){
   var btn=foot.querySelector('button');
   if(btn&&bar){
    btn.className='v43-motion';
    var stopped=!!(typeof V42.reduced==='function'&&V42.reduced());
    btn.textContent=stopped?'▶':'Ⅱ';
    btn.title=stopped?'Ativar movimentos do personagem':'Pausar movimentos do personagem';
    btn.setAttribute('aria-label',btn.title);
    bar.appendChild(btn);
   }
   foot.remove();
  }
 };
 var original=V42.render;
 V42.render=function(){
  var out=original.apply(this,arguments);
  try{api.decorate();}catch(e){if(window.console)console.warn('Lendas Vivas: refinamento',e);}
  return out;
 };
 return api;
})();
