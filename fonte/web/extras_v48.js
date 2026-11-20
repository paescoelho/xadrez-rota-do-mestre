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

/* ======================= v103: tela Nova partida em três linhas =======================
 * 1. Mentor (linha inteira, para iniciantes): liga "Comenta cada lance".
 * 2. Computador: barra deslizante de 800 a 3200 com o nome do nível (Fácil … Stockfish).
 * 3. 24 Lendas (linha inteira). Computador e Lendas desligam o Treinador (pode ser ligado à mão).
 * O "Treinador por voz" fica escondido e indisponível por enquanto (o código continua no jogo). */
var V103={VOICE_OFF:true,last:2,legSeen:null};
/* treinador por voz: fora de uso por enquanto */
if(typeof V36!=='undefined'&&V103.VOICE_OFF){V36.enabled=function(){return false;};V36.btn=function(){try{var b=document.querySelector('.v36-hb');if(b)b.remove();}catch(e){}};}
V103.esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V103.lvName=function(i){return Engine.LEVEL_NAMES[i];};
V103.lvElo=function(i){return Engine.LEVEL_ELO[i];};
V103.LVTIP=['','Aprende as regras jogando','Erra de vez em quando','Joga sério, pune os erros','Forte e paciente','Stockfish com força limitada','Força máxima do Stockfish'];
(function(){
 if(typeof App==='undefined'||!App.setupGame)return;
 var o=App.setupGame;
 App.setupGame=function(){
  var O=App.opts||{};
  /* acabou de escolher uma lenda: o treinador começa desligado */
  try{var sel=(typeof V74!=='undefined')?V74.sel:null;if(sel&&sel!==V103.legSeen){O.coach=false;O.process=false;}V103.legSeen=sel;}catch(e){}
  var r=o.apply(this,arguments);
  try{V103.build();}catch(e){if(window.console)console.error(e);}
  return r;
 };
})();
V103.build=function(){
 var cur=UiJs.cur,O=App.opts;if(!cur||!O)return;
 var seg=cur.querySelector('.seg'),grid=seg&&seg.querySelector('.segg');if(!grid)return;
 cur.classList.add('v103-setup');
 var leg=(typeof V74!=='undefined'&&V74.get)?V74.get(V74.sel):null;
 var mode=leg?'leg':(O.opp===0?'mentor':'lv');
 if(mode==='lv')V103.last=O.opp;
 /* some com a grade antiga, a nota e o cartão grande da lenda */
 grid.style.display='none';
 [].forEach.call(seg.querySelectorAll('.segn,.v74-card'),function(x){x.remove();});
 [].forEach.call(cur.querySelectorAll('.v36-card'),function(x){x.remove();});
 cur.classList.remove('v36-has','v74-has');
 /* v106: "Adversário" na vertical, centralizado ao lado das três opções */
 seg.classList.add('v106-adv');var sl=seg.querySelector('.segl');if(sl)sl.style.display='none';
 var vl=UiJs.el('div','v106-vl',seg);vl.setAttribute('aria-hidden','true');vl.innerHTML='<i></i><span>Adversário</span><i></i>';
 var box=UiJs.el('div','v103-opp',seg);
 /* 1. Mentor */
 var ad=0;try{ad=Profile.d.adapt;}catch(e){}
 var m=UiJs.el('button','v103-row v103-m'+(mode==='mentor'?' on':''),box);m.type='button';
 m.innerHTML='<span class="v103-ic" aria-hidden="true">🎓</span><span class="v103-tx"><b>Mentor <u>para iniciantes</u></b><i>Comenta cada lance seu, mostra o motivo das jogadas dele e se adapta ao seu nível.</i></span><span class="v103-el"><b>'+ad+'</b><i>se adapta</i></span>';
 m.onclick=function(){O.opp=0;try{V74.sel=null;}catch(e){}O.coach=true;O.process=false;App.setupGame();};
 /* 2. Computador: barra de 800 a 3200 */
 var lv=mode==='lv'?O.opp:V103.last;
 var row=UiJs.el('div','v103-row v103-lv'+(mode==='lv'?' on':''),box);
 row.innerHTML='<span class="v103-ln"><b></b><i></i></span><span class="v103-rg"><input type="range" min="1" max="6" step="1" aria-label="Força do computador"><span class="v103-tk" aria-hidden="true"><i>800</i><i></i><i></i><i>2000</i><i></i><i>3200</i></span></span>';
 var rg=row.querySelector('input'),nb=row.querySelector('.v103-ln b'),ni=row.querySelector('.v103-ln i');
 var show=function(i){nb.textContent=V103.lvName(i);ni.textContent=V103.lvElo(i)+' Elo';row.title=V103.LVTIP[i];rg.style.setProperty('--p',((i-1)/5*100)+'%');
  [].forEach.call(row.querySelectorAll('.v103-tk i'),function(t,k){t.classList.toggle('on',k<=i-1);});};
 rg.value=lv;show(lv);
 var pick=function(i){O.opp=i;V103.last=i;try{V74.sel=null;}catch(e){}O.coach=false;O.process=false;App.setupGame();};
 rg.oninput=function(){show(+rg.value);if(!row.classList.contains('on')){row.classList.add('on');m.classList.remove('on');lg.classList.remove('on');}};
 rg.onchange=function(){pick(+rg.value);};
 row.querySelector('.v103-ln').onclick=function(){if(mode!=='lv')pick(+rg.value);};
 /* 3. Lendas */
 var lg=UiJs.el('button','v103-row v103-lg'+(leg?' on':''),box);lg.type='button';lg.setAttribute('aria-haspopup','dialog');
 var n=(typeof LENDAS!=='undefined')?LENDAS.length:24;
 if(leg)lg.innerHTML='<span class="v103-ic fl" aria-hidden="true">'+leg.c+'</span><span class="v103-tx"><b>'+V103.esc(leg.n)+'</b><i>'+V103.esc(leg.st)+'</i></span><span class="v103-el"><b>'+leg.e+'</b><i>trocar ▾</i></span>';
 else lg.innerHTML='<span class="v103-ic" aria-hidden="true">👑</span><span class="v103-tx"><b>'+n+' Lendas do xadrez</b><i>Carlsen, Kasparov, Fischer… abrem como nas partidas reais e jogam no estilo de cada um.</i></span><span class="v103-el"><b>▾</b><i>escolher</i></span>';
 lg.onclick=function(){V74.open();};
 /* v104: Ritmo, Cor e Mentor com o nome na mesma linha das opções */
 [].forEach.call(cur.querySelectorAll('.seg'),function(sg){
  var l=sg.querySelector('.segl');if(!l)return;var t=l.textContent;
  var nm=/^Ritmo/.test(t)?'Ritmo':(/^Cor$/.test(t)?'Cor':(/^Treinador/.test(t)?'Mentor':null));if(!nm)return;
  sg.classList.add('v104-inl');l.textContent=nm;
  if(nm==='Ritmo')[].forEach.call(sg.querySelectorAll('.sb .sbt'),function(b){b.textContent=b.textContent.replace(/^Rápida 10\+5$/,'10 min').replace(/^Clássica 30\+20$/,'30 min');});
 });
 /* v105: sem a nota "Dica ou desfazer…" (vira um balão na partida, na hora em que acontece) */
 [].forEach.call(cur.querySelectorAll('.segn'),function(n){if(/^Dica ou desfazer/.test(n.textContent))n.remove();});
 /* v105: Começar e Continuar lado a lado, mesma altura; sem partida salva, Começar ocupa a linha toda */
 var ct=cur.querySelector('.v34-cont'),st=null;
 [].forEach.call(cur.querySelectorAll('.btns .btn.pri'),function(x){if(/^(Começar|Enfrentar)/.test(x.textContent))st=x;});
 if(ct&&st){
  var bx=st.parentNode;bx.classList.add('v105-two');bx.appendChild(ct);
  var tt=st.textContent;st.classList.add('v105-st');st.innerHTML='<b>'+V103.esc(tt)+'</b>';
  var sub=ct.querySelector('.v34-ctx i');if(sub)sub.textContent=sub.textContent.replace(/^Partida salva contra /,'contra ');
 }
 /* v108: "Tabuleiro" na vertical como "Adversário"; em cima, nome do tema e o efeito dele numa linha só */
 var tp=cur.querySelector('.theme-picker');
 if(tp&&!tp.classList.contains('v108-tb')){
  var g=tp.querySelector('.sw'),fx0=tp.querySelector('.v33-fxd'),lb0=tp.querySelector('.segl');
  if(g){
   tp.classList.add('v108-tb');if(lb0)lb0.style.display='none';
   var vt=document.createElement('div');vt.className='v106-vl';vt.setAttribute('aria-hidden','true');vt.innerHTML='<i></i><span>Tabuleiro</span><i></i>';
   var inn=document.createElement('div');inn.className='v108-in';
   var hd=document.createElement('div');hd.className='v108-hd';
   var on=tp.querySelector('.theme-tile.on .theme-name');
   hd.innerHTML='<b></b>';hd.firstChild.textContent=on?on.textContent:'';
   if(fx0){fx0.textContent=fx0.textContent.replace(/^✦\s*/,'');hd.appendChild(fx0);}
   tp.insertBefore(vt,tp.firstChild);tp.appendChild(inn);inn.appendChild(hd);inn.appendChild(g);
  }
 }
 /* v107: trocar o tema não redesenha a tela (sem piscar): troca só a seleção, o nome e o efeito */
 if(tp&&!tp.__v107){tp.__v107=1;
  tp.addEventListener('click',function(ev){
   var t=ev.target.closest&&ev.target.closest('.theme-tile');if(!t||!tp.contains(t))return;
   ev.stopPropagation();ev.preventDefault();
   var tiles=[].slice.call(tp.querySelectorAll('.theme-tile')),i=tiles.indexOf(t),th=Evo.BOARD_THEMES[i];if(!th)return;
   if(Profile.d.bt!==th[0]){Evo.setTheme(th[0]);try{Evo.applyTheme();}catch(e){}}
   tiles.forEach(function(x){x.classList.toggle('on',x===t);});
   var nm=t.querySelector('.theme-name'),lb=tp.querySelector('.segl');if(lb&&nm)lb.textContent='Tabuleiro · '+nm.textContent;
   var hb=tp.querySelector('.v108-hd b');if(hb&&nm)hb.textContent=nm.textContent;
   var fx=tp.querySelector('.v33-fxd');if(fx&&V33.FX[th[0]])fx.textContent=(hb?'':'✦ ')+V33.FX[th[0]];
  },true);
 }
 /* usa já a altura dos temas da última vez: a tela não pula enquanto o ajuste fino roda */
 if(V103.h){[].forEach.call(cur.querySelectorAll('.theme-tile .theme-preview'),function(x){x.style.height=V103.h+'px';});}
 try{V103.fit();}catch(e){}
 requestAnimationFrame(function(){requestAnimationFrame(V103.fit);});
 if(!V103.rz){V103.rz=1;window.addEventListener('resize',function(){if(document.querySelector('.v103-setup'))V103.fit();});}
};
/* cabe sem rolar: os temas do tabuleiro ocupam a altura que sobra; se faltar, saem primeiro as notas e as descrições */
V103.fit=function(){
 var cur=document.querySelector('.v103-setup');if(!cur)return;
 var m=cur.closest('.main')||cur.parentNode;if(!m)return;
 var tiles=cur.querySelectorAll('.theme-tile .theme-preview');if(!tiles.length)return;
 var rows=Math.ceil(tiles.length/5);
 var setH=function(h){[].forEach.call(tiles,function(t){t.style.height=h+'px';});};
 var over=function(){var mr=m.getBoundingClientRect(),cr=cur.getBoundingClientRect(),pb=parseFloat(getComputedStyle(m).paddingBottom)||0;return Math.ceil(cr.bottom+pb-mr.bottom+m.scrollTop)+2;};
 var hide=function(sel,on){[].forEach.call(cur.querySelectorAll(sel),function(e){e.style.display=on?'none':'';});};
 cur.classList.remove('v103-tight','v103-tight2','v103-tight3');hide('.v33-fxd',false);hide('.seg .segn',false);
 var MAX=window.innerWidth>=700?64:92,MIN=30;if(cur.querySelector('.v34-cont'))MIN=26;
 setH(MIN);
 var steps=[function(){hide('.v33-fxd',true);},function(){hide('.seg .segn',true);},function(){cur.classList.add('v103-tight');},function(){cur.classList.add('v103-tight2');},function(){cur.classList.add('v103-tight3');}];
 for(var i=0;i<steps.length&&over()>0;i++)steps[i]();
 var free=-over();
 var h=Math.max(MIN,Math.min(MAX,MIN+Math.floor(free/rows)-1));
 setH(h);V103.h=h;
 /* sobrou espaço com os temas no máximo: devolve a nota do efeito do tabuleiro */
 if(h>=MAX){var fx=cur.querySelector('.v33-fxd');if(fx&&fx.style.display==='none'){fx.style.display='';if(over()>0)fx.style.display='none';}}
};

/* v105: balão de 4 s quando uma ação (dica, ajuda, desfazer) tira a pontuação da partida */
var V105={g:null,r:null};
V105.bal=function(msg){
 try{[].forEach.call(document.querySelectorAll('.v105-bal'),function(x){x.remove();});
  var b=document.createElement('div');b.className='v105-bal';b.setAttribute('role','status');
  b.innerHTML='<span aria-hidden="true">ⓘ</span><b></b>';b.querySelector('b').textContent=msg;
  document.body.appendChild(b);requestAnimationFrame(function(){b.classList.add('in');});
  setTimeout(function(){b.classList.remove('in');setTimeout(function(){b.remove();},400);},4000);}catch(e){}
};
(function(){
 if(typeof App==='undefined'||!App.drawGame)return;
 var o=App.drawGame;
 App.drawGame=function(){
  var r=o.apply(this,arguments);
  try{var g=App.G;
   if(g){if(V105.g!==g){V105.g=g;V105.r=g.rated;}
    else if(V105.r===true&&g.rated===false&&g.over==null){V105.r=false;V105.bal(g.unrated||'Esta partida não vale mais pontos.');}
    else V105.r=g.rated;}
  }catch(e){}
  return r;
 };
})();

/* v106: efeito de cada tabuleiro numa linha só (a tela não pula ao trocar de tema) */
if(typeof V33!=='undefined'&&V33.FX){
 V33.FX.turquesa='Casas ondulam como água';
 V33.FX.pixel='Sons retrô e pixels na captura';
 V33.FX.pelourinho='Fitinhas do Bonfim na captura';
 V33.FX.praia='Onda de espuma a cada xeque';
 V33.FX.sertao='A captura levanta poeira';
 V33.FX.origami='A captura vira passarinho';
 V33.FX.bic='Lances desenhados à caneta';
 V33.FX.nanquim='Mancha de tinta na captura';
 V33.FX.praca='Pombo pousa no xeque-mate';
 V33.FX.daltonico='Marcas por forma, sem cor';
}
