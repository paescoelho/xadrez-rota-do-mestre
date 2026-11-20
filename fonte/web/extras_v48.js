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

/* ======================= v102: Conta Google — caixas separadas do Lichess e do Chess.com =======================
 * Mesmo visual da caixa do Google: ícone redondo, título e, quando ligada, "Conectado · sincronizado" em verde
 * piscando, com borda verde. Lichess: entra pelo próprio Lichess (sem senha). Chess.com: só o nome de usuário. */
var V102={LI_ICO:'<span class="v102-ic li" aria-hidden="true">♞</span>',CC_ICO:'<span class="v102-ic cc" aria-hidden="true">♟</span>',edit:{li:false,cc:false}};
V102.esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V102.redraw=function(){try{if(UiJs.root&&UiJs.root.querySelector('.v23-acct'))V23.account();}catch(e){}};
V102.head=function(card,ico,on,title,sub){
 var hd=UiJs.el('div','v34-agh',card);
 hd.innerHTML='<span class="v34-agi v102-agi">'+ico+'</span><span><b'+(on?' class="v34-on"><span class="v34-dot" aria-hidden="true"></span>Conectado · sincronizado':'>'+title)+'</b><i>'+sub+'</i></span>';
};
V102.rt=function(card,site){try{var h=V32.rtLine(site);if(h){var r=UiJs.el('div','v102-rt',card);r.innerHTML=h.replace('Ratings: ','');}}catch(e){}};
V102.sync=function(){try{V32.auto(true,true);}catch(e){}setTimeout(V102.redraw,4000);};
/* campo de usuário dentro da caixa, com botão ao lado */
V102.field=function(card,site,val,label){
 var w=UiJs.el('div','v102-fl',card);
 var i=document.createElement('input');i.type='text';i.className='fi';i.placeholder='Seu usuário no '+(site==='li'?'Lichess':'Chess.com');i.value=val||'';i.autocomplete='off';i.autocapitalize='off';i.spellcheck=false;w.appendChild(i);
 var b=UiJs.el('button','btn'+(site==='cc'?' pri':''),w,label);b.type='button';
 var go=function(){var n=i.value.trim().replace(/^@/,'');if(n.length<2){UiJs.toast('Digite o nome de usuário.');i.focus();return;}V32.setUser(site,n);V102.edit[site]=false;UiJs.toast(site==='li'?'Usuário do Lichess salvo.':'Chess.com conectado. Buscando suas partidas…');if(site==='cc')V102.sync();V102.redraw();};
 b.onclick=go;i.onkeydown=function(e){if(e.key==='Enter')go();};
 return i;
};
V102.liCard=function(cur){
 var a=V32.acc(),v=V32.d(),au=(typeof V83!=='undefined')?V83.auth():null;
 var user=(au&&au.user)||a.lichess||'';
 var ver=!!(v.li&&v.li.ver&&V26.nk(v.li.user)===V26.nk(a.lichess));
 var on=!!(au&&au.user)||ver;
 var c=V34.card(cur,null,'v34-ag v102-card v102-li');
 V102.head(c,V102.LI_ICO,on,'Lichess.org',on?'lichess.org/@/'+V102.esc(user):(user?'@'+V102.esc(user)+' · ainda não confirmado':'Jogue valendo rating e importe suas partidas'));
 V34.inside(c,function(){
  if(on){
   UiJs.p('Suas partidas de lá são importadas e analisadas sozinhas. Você também joga no Lichess aqui dentro, valendo rating.','muted small');
   V102.rt(c,'li');
   UiJs.btns([['Sincronizar agora',V102.sync,'pri'],['Sair',V102.liOut]]);
  }else{
   UiJs.p('O próprio Lichess confirma quem é você: o jogo nunca vê a senha.','muted small');
   if(user)V102.rt(c,'li');
   UiJs.btns([['Entrar com Lichess',V102.liIn,'pri']]);
   if(V102.edit.li||!user){var t=UiJs.el('button','v102-lk',c,user?'Cancelar':'Ou só informe o usuário (partidas públicas)');t.type='button';
    if(!user&&!V102.edit.li){t.onclick=function(){V102.edit.li=true;V102.redraw();};}
    else{t.onclick=function(){V102.edit.li=false;V102.redraw();};}
    if(V102.edit.li)V102.field(c,'li',user,'Salvar');}
   else{var t2=UiJs.el('button','v102-lk',c,'Trocar usuário');t2.type='button';t2.onclick=function(){V102.edit.li=true;V102.redraw();};}
  }
 });
};
V102.liIn=function(){try{sessionStorage.setItem('rdm-v102',String(Date.now()));}catch(e){}if(typeof V83!=='undefined')V83.login();else V32.liStart();};
V102.liOut=function(){
 var au=(typeof V83!=='undefined')?V83.auth():null;
 UiJs.modal('Sair do Lichess neste aparelho?','A autorização é revogada no Lichess. Suas partidas e o seu rating lá não mudam, e as partidas já importadas continuam aqui.',[['Sair',function(){
  try{if(au){if(V83.close)V83.close();fetch(V83.host()+'/api/token',{method:'DELETE',headers:{Authorization:'Bearer '+au.tok}}).catch(function(){});V83.saveAuth(null);V83.acc=null;}}catch(e){}
  try{V32.setUser('li','');}catch(e){}
  V102.redraw();UiJs.toast('Lichess desconectado.');},'warn'],['Continuar conectado',null,'pri']]);
};
V102.ccCard=function(cur){
 var a=V32.acc(),user=a.chesscom||'',on=!!user&&!V102.edit.cc;
 var c=V34.card(cur,null,'v34-ag v102-card v102-cc');
 V102.head(c,V102.CC_ICO,on,'Chess.com',on?'chess.com/member/'+V102.esc(user):'Importe suas partidas para análise');
 V34.inside(c,function(){
  if(on){
   UiJs.p('As partidas públicas de lá chegam sozinhas e viram análise e Aula da semana. Nenhuma senha é pedida.','muted small');
   V102.rt(c,'cc');
   UiJs.btns([['Sincronizar agora',V102.sync,'pri'],['Sair',V102.ccOut]]);
  }else{
   UiJs.p('Basta o nome de usuário: as partidas do Chess.com são públicas. O jogo nunca pede a senha.','muted small');
   V102.field(c,'cc',user,'Conectar');
   if(user){var t=UiJs.el('button','v102-lk',c,'Cancelar');t.type='button';t.onclick=function(){V102.edit.cc=false;V102.redraw();};}
  }
 });
};
V102.ccOut=function(){
 UiJs.modal('Desconectar o Chess.com?','As partidas já importadas continuam aqui. Novas partidas deixam de ser buscadas.',[['Desconectar',function(){try{V32.setUser('cc','');}catch(e){}V102.redraw();UiJs.toast('Chess.com desconectado.');},'warn'],['Continuar conectado',null,'pri']]);
};
/* login do Lichess começado na Conta: ao voltar, abre a Conta (e não a tela de jogar) */
(function(){
 if(typeof V83==='undefined'||!V83.home)return;
 var oH=V83.home;
 V83.home=function(){
  var f=0;try{f=+sessionStorage.getItem('rdm-v102')||0;}catch(e){}
  if(f){try{sessionStorage.removeItem('rdm-v102');}catch(e){}if(Date.now()-f<15*60000&&V83.auth()){V34.accBack=App.menu;return V23.account();}}
  return oH.apply(this,arguments);
 };
})();
