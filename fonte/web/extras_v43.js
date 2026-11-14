/* Rota do Mestre v79 — Lendas Vivas HD (retratos estáticos).
 * 24 personagens preservam artes individuais, nomes, epítetos e balões.
 * Desliga inteiramente Canvas, sprites faciais, efeitos, keyframes e timers.
 * Fonte oficial de imagem: data/lendas-portraits-hd.webp, atlas 4 x 6.
 */
var V43=(function(){
 var api={};
 api.src='data/lendas-portraits-hd.webp?v=v79-static-20261114';
 api.style=function(){
  if(typeof document==='undefined'||document.getElementById('v43-static-style'))return;
  var style=document.createElement('style');
  style.id='v43-static-style';
  style.textContent=[
   '.v43-card{--v43-size:clamp(118px,min(40vw,23dvh),194px);position:relative;padding:9px 11px!important;margin:3px 0 7px!important;border:1px solid rgba(230,196,119,.44)!important;border-radius:15px!important;background:radial-gradient(ellipse at 15% 45%,rgba(194,151,63,.12),transparent 65%),linear-gradient(125deg,#1c222d,#101419 85%)!important;box-shadow:0 6px 22px rgba(0,0,0,.28)!important}',
   '.v43-card .v42-meta{margin:0 0 7px!important;min-height:15px!important}',
   '.v43-card .v42-meta b{font-size:10px;letter-spacing:.09em;color:#f0cf89}',
   '.v43-card .v42-meta em{font-size:10px;color:#b5b7b6}',
   '.v43-card .v42-scene{display:flex!important;align-items:stretch!important;gap:clamp(8px,2vw,14px)!important;min-width:0!important}',
   '.v43-card .v42-portrait{position:relative;display:block;width:var(--v43-size)!important;height:var(--v43-size)!important;flex:0 0 var(--v43-size)!important;min-width:0;border:1px solid rgba(242,206,144,.5)!important;border-radius:12px!important;background-image:url("data/lendas-portraits-hd.webp?v=v79-static-20261114")!important;background-size:400% 600%!important;background-repeat:no-repeat!important;background-color:#28303b!important;transform:none!important;animation:none!important;box-shadow:0 5px 16px rgba(0,0,0,.4)!important;overflow:hidden!important}',
   '.v43-card .v42-portrait::before{content:none!important}',
   '.v43-card .v42-portrait::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,235,189,.12);pointer-events:none}',
   '.v43-card .v42-phrase{display:flex;flex:1;min-width:0;flex-direction:column;justify-content:center;gap:5px!important}',
   '.v43-card .v42-name{font:700 clamp(13px,1.3vw,18px)/1.2 Georgia,serif!important;white-space:normal!important;overflow-wrap:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;color:#f7d98d!important}',
   '.v43-card .v42-epithet{font:11.5px/1.25 system-ui,sans-serif!important;color:#b9c0bd!important;white-space:normal!important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}',
   '.v43-card .v42-balloon{position:relative;min-height:52px!important;background:#f3ecdf!important;color:#26222b!important;padding:10px 12px!important;border-radius:12px 12px 12px 4px!important;font:500 clamp(11px,1.15vw,13.5px)/1.38 system-ui,sans-serif!important;box-shadow:0 3px 10px rgba(0,0,0,.25)!important;animation:none!important;transform:none!important}',
   '.v43-card .v42-balloon:before{border-right-color:#f3ecdf!important}',
   '.v43-card .v42-foot,.v43-card .v42-fx,.v43-card .v43-figure,.v43-card .v43-face,.v43-card .v44-canvas,.v43-card .v43-motion{display:none!important}',
   '.v43-card .v42-portrait,.v43-card .v42-balloon,.v43-card .v42-meta,.v43-card .v42-phrase{animation:none!important;transition:none!important;will-change:auto!important}',
   '.v43-card.v42-thinking .v42-portrait,.v43-card.v42-attacking .v42-portrait,.v43-card.v42-surprised .v42-portrait,.v43-card.v42-victory .v42-portrait,.v43-card.v42-pressured .v42-portrait{animation:none!important;transform:none!important}',
   '.v43-card.v42-s1 .v42-portrait{image-rendering:pixelated!important}',
   '@media(min-width:850px){.v43-card{--v43-size:clamp(118px,min(15vw,24dvh),194px)}}',
   '@media(max-width:420px){.v43-card{--v43-size:clamp(114px,min(41vw,23dvh),164px);padding:7px 8px!important;margin:2px 0 5px!important}.v43-card .v42-scene{gap:9px!important}.v43-card .v42-meta{margin-bottom:5px!important}.v43-card .v42-name{font-size:12.5px!important}.v43-card .v42-epithet{font-size:10px!important}.v43-card .v42-balloon{font-size:11.3px!important;line-height:1.32!important;min-height:46px!important;padding:8px 9px!important}}',
   '@media(max-height:660px){.v43-card{--v43-size:clamp(96px,19dvh,132px)}.v43-card .v42-balloon{min-height:38px!important;padding:6px 8px!important}.v43-card .v42-meta{margin-bottom:3px!important}}'
  ].join('\n');
  document.head.appendChild(style);
 };
 api.decorate=function(){
  var card=document.querySelector('.v42-card');
  if(!card)return;
  api.style();card.classList.add('v43-card');
  var pic=card.querySelector('.v42-portrait');
  if(pic){
   // As posicoes da grade 4x6 sao calculadas pelo V42 para cada lenda.
   // Preserva image-rendering pixelated somente para as lendas pixel art.
   var name=card.querySelector('.v42-name');
   pic.setAttribute('aria-label','Retrato estático em alta definição de '+(name?name.textContent:'lenda do xadrez'));
   pic.style.animation='none';pic.style.transform='none';
   [].forEach.call(pic.querySelectorAll('.v43-figure,.v43-face,.v44-canvas,.v42-fx'),function(el){el.remove();});
  }
  var foot=card.querySelector('.v42-foot');
  if(foot)foot.remove();
  [].forEach.call(card.querySelectorAll('.v43-motion,.v42-fx'),function(el){el.remove();});
 };
 if(typeof V42!=='undefined'&&typeof V42.render==='function'){
  var original=V42.render;
  V42.render=function(){
   var result=original.apply(this,arguments);
   try{api.decorate();}catch(e){if(typeof console!=='undefined')console.warn('Lendas Vivas HD',e);}
   return result;
  };
 }
 return api;
})();
