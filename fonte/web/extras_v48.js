/* ======================= v88 — contagem anônima dos outros botões (Painel do criador) =======================
 * Mesmo esquema da v27 (GoatCounter, sem cookies, no máximo uma vez por sessão). Os nomes antigos não mudam,
 * então o histórico que já existe no painel continua valendo; os itens novos começam do zero.
 * Jogar online fica separado: online do próprio jogo (evento-online-jogo) ou online do Lichess (evento-lichess).
 */
(function(){
 if(typeof window==='undefined'||typeof document==='undefined'||typeof V27==='undefined')return;
 var ev=function(k){try{V27.ev(k);}catch(e){}};
 var hook=function(obj,name,fn){if(obj&&typeof obj[name]==='function'){var o=obj[name];obj[name]=function(){try{fn.apply(this,arguments);}catch(e){}return o.apply(this,arguments);};}};
 /* botões do menu principal */
 if(typeof Dna!=='undefined')hook(Dna,'rival',function(){ev('evento-adversario');});
 if(typeof Pages!=='undefined')hook(Pages,'profile',function(){ev('evento-painel-evolucao');});
 if(typeof V34!=='undefined'){hook(V34,'gLogin',function(){ev('evento-login-google');});hook(V34,'markSent',function(){ev('evento-sugestao');});}
 /* online do próprio jogo */
 if(typeof V31!=='undefined'){
  hook(V31,'home',function(){ev('evento-online');});
  hook(V31,'invite',function(){ev('evento-online-jogo');});
  hook(V31,'resume',function(){ev('evento-online-jogo');});
  if(typeof V31.create==='function'){var oC=V31.create;V31.create=function(){var p=oC.apply(this,arguments);try{p.then(function(){ev('evento-online-jogo');ev('evento-online-criou');},function(){});}catch(e){}return p;};}
  hook(V31,'render',function(){var r=V31.room;if(r&&r.status==='play'&&(r.moves||[]).length>=2){ev('evento-online-jogo');ev('evento-online-jogou');}});
 }
 if(typeof V35!=='undefined')hook(V35,'watch',function(){ev('evento-online-jogo');});
 if(typeof V41!=='undefined')hook(V41,'start',function(){ev('evento-voz');});
 /* online do Lichess */
 if(typeof V83!=='undefined'){
  hook(V83,'home',function(){ev('evento-lichess');});
  hook(V83,'saveAuth',function(a){if(a&&a.tok)ev('evento-lichess-conectou');});
  hook(V83,'play',function(){ev('evento-lichess-partida');});
 }
 if(typeof V87!=='undefined')hook(V87,'markSolved',function(){ev('evento-lichess-problema');});
 /* lendas */
 if(typeof V74!=='undefined'){hook(V74,'open',function(){ev('evento-lendas');});hook(V74,'play',function(){ev('evento-lendas-jogou');});}
})();

/* ======================= v98: apresentação do botão Lichess em Jogar online =======================
 * Nas 3 primeiras vezes que a pessoa abre a tela: toca a locução, o resto da tela escurece de leve
 * e o botão Lichess pulsa e brilha no ritmo da voz, sem sair do lugar (os números seguem ao vivo).
 * Depois disso: só um brilho dourado rápido, sem som. Um toque em qualquer lugar encerra na hora.
 * Som do jogo desligado: tudo igual, sem voz. "Reduzir movimento": brilho sem pulsar. */
var V98={a:null,url:null,raf:0,t0:0,on:false,MAX:3,END:4.0};
V98.d=function(){var d=Profile.d;if(!d.v98)d.v98={n:0};return d.v98;};
V98.src=function(){
 if(V98.url)return V98.url;
 if(typeof window!=='undefined'&&window.XLICHAU)return V98.url=window.XLICHAU;
 var e=document.getElementById('res_lichau');if(!e||!e.textContent)return null;
 try{var bin=atob(e.textContent.trim()),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);V98.url=URL.createObjectURL(new Blob([u],{type:'audio/mpeg'}));}catch(err){return null;}
 return V98.url;
};
V98.reduce=function(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
V98.now=function(){var a=V98.a;if(a&&!a.paused&&a.currentTime>0)return a.currentTime;return (performance.now()-V98.t0)/1000;};
/* intensidade do brilho (0..1) no ritmo da fala: 3 batidas na primeira frase, 1 batida maior na segunda */
V98.beat=function(t){
 if(t<0.2)return 0.35*Math.max(0,t/0.2);
 if(t<3.05)return 0.35+0.65*(0.5-0.5*Math.cos(2*Math.PI*(t-0.2)/0.95));
 if(t<V98.END)return 0.35+0.65*Math.sin(Math.PI*Math.min(1,(t-3.05)/0.95));
 return 0.35;
};
/* escurece tudo que não está no caminho até o botão (inclui o topo da tela) */
V98.dim=function(btn,on){
 if(!on){var ds=[].slice.call(document.querySelectorAll('.v98-dk'));ds.forEach(function(e){e.classList.add('v98-up');e.classList.remove('v98-dk');});setTimeout(function(){ds.forEach(function(e){e.classList.remove('v98-up');});},800);return;}
 var n=btn;while(n&&n.parentNode&&n!==document.body){[].forEach.call(n.parentNode.children,function(s){if(s!==n&&!/^(SCRIPT|STYLE)$/.test(s.tagName)&&!s.classList.contains('toast'))s.classList.add('v98-dk');});n=n.parentNode;}
};
V98.btn=function(){return document.querySelector('.v35-home .v35-xb.li');};
V98.finish=function(fast){
 if(!V98.on)return;V98.on=false;cancelAnimationFrame(V98.raf);V98.raf=0;
 document.removeEventListener('pointerdown',V98.skip,true);document.removeEventListener('keydown',V98.skip,true);
 var a=V98.a;
 if(a&&!a.paused){if(fast){var v=1,k=setInterval(function(){v-=0.2;if(v<=0){clearInterval(k);try{a.pause();a.volume=1;}catch(e){}}else try{a.volume=v;}catch(e){}},30);}}
 V98.dim(null,false);
 var b=V98.btn();if(!b)return;
 b.classList.remove('v98-run');b.style.removeProperty('--v98g');
 b.classList.add('v98-out');setTimeout(function(){b.classList.remove('v98-out');},900);
};
V98.skip=function(){V98.finish(true);};
V98.run=function(){
 var b=V98.btn();if(!b)return;
 var d=V98.d();
 if(d.n>=V98.MAX){/* depois das 3 primeiras: só um brilho rápido */
  b.classList.add('v98-quick');setTimeout(function(){b.classList.remove('v98-quick');},1400);return;}
 d.n++;try{Profile.save();}catch(e){}
 if(V98.on)V98.finish(true);
 V98.on=true;V98.t0=performance.now();
 var u=V98.src();
 if(u&&UiJs.soundOn!==false){try{if(!V98.a){V98.a=new Audio();V98.a.preload='auto';}V98.a.volume=1;V98.a.src=u;V98.a.currentTime=0;var p=V98.a.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
 V98.dim(b,true);b.classList.add('v98-run');if(V98.reduce())b.classList.add('v98-still');
 /* o toque que abriu a tela já passou; a partir daqui qualquer toque ou tecla encerra */
 setTimeout(function(){if(V98.on){document.addEventListener('pointerdown',V98.skip,true);document.addEventListener('keydown',V98.skip,true);}},250);
 var still=V98.reduce();
 var loop=function(){
  var bb=V98.btn();
  if(!bb||!bb.isConnected){V98.on=false;V98.dim(null,false);document.removeEventListener('pointerdown',V98.skip,true);document.removeEventListener('keydown',V98.skip,true);if(V98.a)try{V98.a.pause();}catch(e){}return;}
  var t=V98.now();
  if(t>=V98.END){V98.finish(false);return;}
  bb.style.setProperty('--v98g',(still?0.7:V98.beat(t)).toFixed(3));
  V98.raf=requestAnimationFrame(loop);
 };
 V98.raf=requestAnimationFrame(loop);
};
(function(){
 if(typeof V31==='undefined'||!V31.home)return;
 var oH=V31.home;
 V31.home=function(){
  var r=oH.apply(this,arguments);
  try{if(V98.on)V98.finish(true);requestAnimationFrame(function(){requestAnimationFrame(V98.run);});}catch(e){}
  return r;
 };
})();
