/* Rota do Mestre · Lendas Vivas v78
 * Animacao procedural de 10 FPS (100 ms/frame), sem trocar fotografias.
 * Rig por retrato: pescoco/cabeca, face, olhos, ombros e maos visiveis.
 * 16 comportamentos, perfis individuais das 24 lendas, sem dependencias.
 * Respeita preferencia de movimento reduzido e pausa com a aba oculta.
 */
var V44=(function(){
 var api={FPS:10,FRAME_MS:100,session:null,timer:null,img:null,imageState:0,cache:{},lastDraw:0};
 api.REACTIONS=['repouso','piscar','refletir','calcular','planejar','iniciativa','atacar','capturar','xeque','reconhecer','punir','defender','vencer','perder','empatar','final'];
 //             giro   alto  ombro olhar mao  sorriso  sobrancelha
 api.moves={
  repouso:   [0,  0,0,   0,0, 0,0], piscar:[0,  0,0,0,0,0,0],
  refletir:  [-1, 1,-1,-2,1,-.3,1], calcular:[-.7,1,0,1,.8,-.2,1],
  planejar:  [1,  -1,.5,2,1,.3,.4], iniciativa:[1.4,-2,2,1,1.1,1,1],
  atacar:    [-2,-3,3,2,2,1.1,1.5], capturar:[1,-2,2,-1,2,1,1],
  xeque:     [-1.7,-3,1,-2,2,1.2,1.6], reconhecer:[1,0,0,1,.4,.9,.7],
  punir:     [-1,-1,1,1,1.4,1.1,1.2], defender:[.3,1,-1,-1,.4,-.5,1.1],
  vencer:    [2,-3,2,2,1.2,1.6,.8], perder:[-2,3,-2,-2,-.4,-.7,1.2],
  empatar:   [0,0,0,0,0,.3,0], final:[-.5,0,0,1,.5,.1,.5]
 };
 // Marcações aproximadas sobre cada quadro de 256x256 do atlas HD.
 // [cabecaX,Y, raioX,Y, olhoE X,Y, olhoD X,Y, boca X,Y, mao X,Y, energia, pisca(s), gesto, inclinacao]
 // Mao (0,0) = retrato sem dedos em primeiro plano: evita inventar dedos.
 api.points={
  carlsen:[124,108,87,95,100,112,151,108,135,153,169,178,.57,6.6,.5,-.4],
  kasparov:[137,103,84,91,113,107,166,109,145,156,85,178,1.36,4.6,1.5,-1],
  fischer:[127,110,79,94,105,114,156,112,133,159,192,104,.68,6.3,.65,-1.2],
  karpov:[132,108,79,98,113,116,164,116,133,164,0,0,.47,7.2,.1,.3],
  capablanca:[124,106,83,94,104,116,152,116,132,163,0,0,.65,6.2,.2,.1],
  alekhine:[128,111,85,96,105,119,159,120,132,168,0,0,1.06,5.1,.7,-.6],
  lasker:[130,111,84,99,103,123,153,122,133,176,0,0,.63,6.5,.3,-.2],
  botvinnik:[135,112,83,98,114,121,164,124,143,176,0,0,.52,7.4,.15,0],
  tal:[129,108,89,94,102,111,151,112,133,164,102,184,1.48,3.9,1.5,-1.3],
  petrosian:[131,112,86,94,106,119,160,117,139,166,181,185,.49,7.1,.4,-.4],
  spassky:[129,110,87,95,101,116,157,116,132,170,0,0,.78,5.8,.4,.1],
  smyslov:[137,115,84,96,115,119,166,122,143,170,0,0,.54,7.2,.22,-.1],
  steinitz:[127,113,87,99,102,115,153,118,133,172,0,0,.56,7,.3,.4],
  morphy:[130,108,83,97,105,110,151,115,133,163,0,0,1.24,4.9,.5,-.4],
  kramnik:[137,111,83,94,113,111,162,112,139,171,188,185,.52,7.1,.25,.3],
  anand:[135,111,88,98,108,116,159,116,139,172,194,196,.88,5.3,.4,.2],
  caruana:[127,110,85,95,100,115,151,115,134,169,0,0,.71,5.8,.3,.3],
  nakamura:[135,112,89,96,106,111,160,112,142,170,0,0,1.19,4.3,.6,.5],
  ding:[127,114,86,101,104,122,153,121,135,173,0,0,.55,6.5,.2,.2],
  gukesh:[130,112,88,96,106,118,158,117,140,170,0,0,1.02,4.8,.4,-.5],
  polgar:[130,111,89,97,100,115,152,115,133,169,180,188,1.19,4.7,.7,.5],
  korchnoi:[130,110,86,100,107,116,159,116,137,168,103,191,1.1,4.7,1.1,-.7],
  mecking:[128,116,83,98,107,115,156,115,130,169,0,0,.7,5.9,.2,0],
  firouzja:[133,111,87,97,109,118,161,115,140,172,0,0,1.31,4.1,.4,.7]
 };
 api.stopped=function(){
  try{if(V42.reduced())return true;}catch(e){}
  try{return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){return false;}
 };
 api.style=function(){
  if(document.getElementById('v44-style'))return;
  var el=document.createElement('style');el.id='v44-style';
  el.textContent=[
   '.v43-card .v42-portrait.v44-stage{background-image:none!important;transform:none!important;animation:none!important;isolation:isolate}',
   '.v43-card .v44-stage .v43-figure,.v43-card .v44-stage .v43-face{display:none!important}',
   '.v44-canvas{position:absolute;display:block;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;border-radius:inherit}',
   '.v43-card .v44-stage:after{z-index:3;pointer-events:none}',
   '.v43-card .v42-portrait.v44-stage.v44-static{background-image:var(--v43-atlas,url("data/lendas-portraits-hd.webp"))!important}',
   '.v43-card .v42-meta .v44-state{color:#f0d699;opacity:.9;font-size:10px}',
   '@media(prefers-reduced-motion:reduce){.v44-stage *{animation:none!important}}'
  ].join('\n');document.head.appendChild(el);
 };
 api.easing=function(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 api.rand=function(session){
  session.seed=(1664525*session.seed+1013904223)>>>0;return session.seed/4294967296;
 };
 api.pick=function(g){
  var last=g.sans&&g.sans.length?String(g.sans[g.sans.length-1]):'';
  var ply=g.ucis?g.ucis.length:0;
  if(g.over)return {name:g.over.score>=1?'perder':g.over.score<=0?'vencer':'empatar',key:'fim'+g.over.score};
  if(g.peek)return {name:'calcular',key:'rever'+ply};
  if(g.busy){
   if(/movimentando|movendo/i.test(g.busy))return {name:'atacar',key:'mover'+ply};
   if(/pensando|calculando|analisando/i.test(g.busy))return {name:'refletir',key:'pensar'+ply};
  }
  if(g.fbPending)return {name:'calcular',key:'analisar'+ply};
  if(last.includes('#')||last.includes('+'))return {name:'xeque',key:'xeque'+ply};
  if(/x/.test(last))return {name:'capturar',key:'captura'+ply};
  if(g.lastFb&&g.lastRec&&g.lastRec.ply===ply-1){
   var grade=g.lastFb.grade;
   if(grade==='blunder'||grade==='mistake')return {name:'punir',key:'erro'+ply};
   if(grade==='best'||grade==='great'||grade==='good')return {name:'reconhecer',key:'bom'+ply};
  }
  if(g.evalW!=null&&ply>6){
   var value=g.evalW*(g.human===1?-1:1);
   if(value>=220)return {name:'iniciativa',key:'pressao'+ply};
   if(value<=-220)return {name:'defender',key:'defesa'+ply};
  }
  if(ply>40)return {name:'final',key:'final'+ply};
  if(ply>1&&g.pos&&g.pos.turn===g.human)return {name:'planejar',key:'jogou'+ply};
  return {name:'repouso',key:'inicio'+ply};
 };
 api.part=function(base,cx,cy,rx,ry){
  var w=256,h=256,out=document.createElement('canvas'),mask=document.createElement('canvas');
  out.width=mask.width=w;out.height=mask.height=h;
  var x=out.getContext('2d'),m=mask.getContext('2d');
  x.drawImage(base,0,0);
  m.save();m.translate(cx,cy);m.scale(rx,ry);
  var gr=m.createRadialGradient(0,0,.42,0,0,1);
  gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.71,'rgba(0,0,0,.98)');gr.addColorStop(.88,'rgba(0,0,0,.64)');gr.addColorStop(1,'rgba(0,0,0,0)');
  m.fillStyle=gr;m.fillRect(-1.01,-1.01,2.02,2.02);m.restore();
  x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0);return out;
 };
 api.assets=function(id,index){
  if(api.cache[id])return api.cache[id];
  if(!api.img||!api.img.complete||!api.img.naturalWidth)return null;
  var x=(index%4)*(api.img.naturalWidth/4),y=Math.floor(index/4)*(api.img.naturalHeight/6);
  var base=document.createElement('canvas');base.width=base.height=256;var b=base.getContext('2d');
  b.imageSmoothingEnabled=true;b.drawImage(api.img,x,y,api.img.naturalWidth/4,api.img.naturalHeight/6,0,0,256,256);
  var p=api.points[id],a={
   base:base,
   head:api.part(base,p[0],p[1],p[2],p[3]),
   body:api.part(base,127,225,126,66),
   hand:p[10]?api.part(base,p[10],p[11],31,34):null,
   skin:[]
  };
  var eyelid=function(ex,ey){
   try{
    var pos=b.getImageData(Math.round(ex),Math.round(ey+12),1,1).data;
    return 'rgb('+pos[0]+','+pos[1]+','+pos[2]+')';
   }catch(e){return '#a78669';}
  };
  a.skin=[eyelid(p[4],p[5]),eyelid(p[6],p[7])];
  api.cache[id]=a;return a;
 };
 api.blink=function(ctx,p,alpha,a){
  if(alpha<=.04)return;
  var eyes=[[p[4],p[5],a.skin[0]],[p[6],p[7],a.skin[1]]];
  for(var i=0;i<2;i++){
   var e=eyes[i];ctx.save();ctx.globalAlpha=Math.min(.97,alpha*.95);
   ctx.beginPath();ctx.ellipse(e[0],e[1],10,2.2+5.5*alpha,0,0,Math.PI*2);
   ctx.fillStyle=e[2];ctx.fill();
   ctx.globalAlpha=Math.min(.9,alpha);
   ctx.beginPath();ctx.moveTo(e[0]-9,e[1]);ctx.quadraticCurveTo(e[0],e[1]+2*alpha,e[0]+9,e[1]);
   ctx.lineWidth=1.3;ctx.strokeStyle='rgba(34,25,22,.83)';ctx.stroke();ctx.restore();
  }
 };
 api.frame=function(s,now){
  if(!s||!s.canvas||!s.canvas.isConnected)return;
  var cvs=s.canvas,size=s.stage.getBoundingClientRect().width||s.stage.clientWidth||150;
  var dpr=Math.min(2,window.devicePixelRatio||1),pix=Math.round(size*dpr);
  if(cvs.width!==pix||cvs.height!==pix){cvs.width=cvs.height=pix;}
  var ctx=cvs.getContext('2d');if(!ctx)return;
  var aa=api.assets(s.id,s.index);if(!aa)return;
  var p=s.p,t=(now-s.start)/1000,profile=p[12],speed=(.75+.21*profile);
  ctx.setTransform(cvs.width/256,0,0,cvs.height/256,0,0);
  ctx.clearRect(0,0,256,256);
  ctx.imageSmoothingEnabled=s.style!==1;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(aa.base,0,0);
  var next=api.moves[s.reaction]||api.moves.repouso;
  var before=api.moves[s.before]||api.moves.repouso;
  var k=api.easing((now-s.changed)/580),v=[];
  for(var n=0;n<7;n++)v[n]=(before[n]*(1-k)+next[n]*k)*profile;
  var breath=Math.sin(t*1.8*speed)*(.7+.6*profile),sway=Math.sin(t*.8*speed+p[15])*.6;
  var tilt=(v[0]+p[15]*.35+sway*.5)*Math.PI/180;
  var yy=v[1]+breath*.6,shift=v[2]+Math.sin(t*.7)*.4;
  // Casaco e ombros, movendo de forma independente em torno do torax.
  ctx.save();ctx.translate(128,230);ctx.scale(1+breath*.0014,1+breath*.004);
  ctx.translate(-128,-230);ctx.drawImage(aa.body,0,0);ctx.restore();
  // Cabeca recortada com borda suavizada, inclinacao/nod e paralaxe discreta.
  ctx.save();ctx.translate(p[0]+shift*.5,p[1]+yy);ctx.rotate(tilt);
  ctx.translate(-p[0],-p[1]);ctx.drawImage(aa.head,0,0);
  // Piscar de modo independente da emocao, com intervalos irregulares.
  if(now>=s.nextBlink){
    s.blinkAt=now;
    s.nextBlink=now+(p[13]+api.rand(s)*2.1)*1000;
  }
  var elapsed=now-s.blinkAt,closed=(elapsed>=0&&elapsed<440)?Math.pow(Math.sin(Math.PI*elapsed/440),2):0;
  api.blink(ctx,p,closed,aa);
  // Micromovimento da boca durante reacoes; sem alterar a identidade facial.
  if(v[5]>.65){
   ctx.save();ctx.globalAlpha=Math.min(.13,v[5]*.09);
   ctx.fillStyle='#fff1c1';ctx.beginPath();ctx.ellipse(p[8],p[9]-2,8,2,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.restore();
  // Gestual localizado apenas onde o retrato realmente mostra a mao.
  if(aa.hand){
   var amplitude=p[14]*profile;
   var handWave=(Math.sin(t*2.0*speed)+.5*Math.sin(t*3.5*speed))*.65;
   ctx.save();ctx.translate(p[10]+v[4]*.4,p[11]+handWave*amplitude);
   ctx.rotate((.4*handWave*amplitude+v[4]*.3)*Math.PI/180);
   ctx.translate(-p[10],-p[11]);ctx.drawImage(aa.hand,0,0);ctx.restore();
  }
  // Pequeno movimento ocular direcionado: brilho suave, não olhos desenhados sobrepostos.
  if(Math.abs(v[3])>.4&&closed<.1){
   ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#fff5d6';
   ctx.beginPath();ctx.ellipse(p[4]+v[3]*.24,p[5]-2,1.6,1.0,0,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(p[6]+v[3]*.24,p[7]-2,1.6,1.0,0,0,Math.PI*2);ctx.fill();
   ctx.restore();
  }
  s.frames++;
 };
 api.stop=function(){
  if(api.timer){clearInterval(api.timer);api.timer=null;}
  api.session=null;
 };
 api.run=function(){
  if(api.timer)return;
  api.timer=setInterval(function(){
   var s=api.session;if(!s||!s.canvas||!s.canvas.isConnected){api.stop();return;}
   if(document.hidden||api.stopped())return;
   api.frame(s,performance.now());
  },api.FRAME_MS);
 };
 api.readyImage=function(){
  if(api.imageState)return;
  api.imageState=1;api.img=new Image();
  api.img.onload=function(){
   api.imageState=2;
   if(api.session&&api.session.canvas){
    api.session.stage.classList.remove('v44-static');
    api.frame(api.session,performance.now());if(!api.stopped())api.run();
   }
  };
  api.img.onerror=function(){
   // Atlas antigo apenas como fallback, ainda sem troca de fotografias.
   api.img.onload=function(){
    api.imageState=2;
    if(api.session&&api.session.canvas){api.session.stage.classList.remove('v44-static');api.frame(api.session,performance.now());if(!api.stopped())api.run();}
   };
   api.img.onerror=function(){api.imageState=-1;};
   api.img.src='data/lendas-portraits.webp';
  };
  api.img.src='data/lendas-portraits-hd.webp?v=v77-20261114';
 };
 api.attach=function(){
  var g=App.G,legend=V42.byGame(g),card=document.querySelector('.v42-card');
  if(!legend||!card){api.stop();return;}
  api.style();
  var pic=card.querySelector('.v42-portrait');
  if(!pic)return;
  var p=api.points[legend.id];if(!p)return;
  var motion=card.querySelector('.v43-motion');
  // Deixa o controle de pausa totalmente acessivel.
  if(motion){motion.setAttribute('title','Ativar ou pausar as animações humanas (10 quadros por segundo)');}
  var id=legend.id,was=api.session;
  var s=(was&&was.id===id)?was:null;
  if(!s){
   s={id:id,index:legend.index,p:p,style:legend.words[0],start:performance.now(),seed:2166136261,
      frames:0,blinkAt:-1000,nextBlink:performance.now()+p[13]*1000,reaction:'repouso',before:'repouso',changed:performance.now()};
   for(var z=0;z<id.length;z++)s.seed=(Math.imul(s.seed^id.charCodeAt(z),16777619)>>>0);
  }
  var r=api.pick(g);
  if(s.reaction!==r.name||s.key!==r.key){
   s.before=s.reaction;s.reaction=r.name;s.key=r.key;s.changed=performance.now();
  }
  var canvas=document.createElement('canvas');canvas.className='v44-canvas';canvas.setAttribute('aria-hidden','true');
  pic.classList.add('v44-stage');pic.appendChild(canvas);s.canvas=canvas;s.stage=pic;
  pic.setAttribute('aria-label','Retrato animado de '+legend.p.n+'; reação: '+s.reaction);
  pic.setAttribute('data-reaction',s.reaction);
  api.session=s;
  api.readyImage();
  if(api.imageState===2){
   api.frame(s,performance.now());
   if(!api.stopped()){api.run();}else{api.stopTimerOnly();}
  }else{
   pic.classList.add('v44-static');
  }
 };
 api.stopTimerOnly=function(){if(api.timer){clearInterval(api.timer);api.timer=null;}};
 api.diagnostics=function(){
  var names=Object.keys(api.points);
  return {fps:api.FPS,intervaloMs:api.FRAME_MS,lendas:names.length,tiposDeReacao:api.REACTIONS.length,
   sessoes:api.session?{personagem:api.session.id,reacao:api.session.reaction,quadros:api.session.frames}:null};
 };
 var original=V42.render;
 V42.render=function(){
  var x=original.apply(this,arguments);
  try{api.attach();}catch(e){if(window.console)console.warn('Lendas Vivas: animacao facial',e);}
  return x;
 };
 if(typeof document!=='undefined'){
  document.addEventListener('visibilitychange',function(){
   if(document.hidden){api.stopTimerOnly();}
   else if(api.session&&api.imageState===2&&!api.stopped()){api.run();}
  });
  window.addEventListener('pagehide',api.stop);
 }
 return api;
})();
if(typeof window!=='undefined')window.RotaLendasAnimacoes=V44;
