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
 /* v110: Ritmo, Cor e Mentor sem rótulo, agrupados sob "Partida" na vertical; textos do Mentor */
 var ins=[].slice.call(cur.querySelectorAll('.seg.v104-inl'));
 if(ins.length){
  var grp=document.createElement('div');grp.className='v110-grp';
  var pv=document.createElement('div');pv.className='v106-vl';pv.setAttribute('aria-hidden','true');pv.innerHTML='<i></i><span>Partida</span><i></i>';
  var gi=document.createElement('div');gi.className='v110-in';
  ins[0].parentNode.insertBefore(grp,ins[0]);grp.appendChild(pv);grp.appendChild(gi);
  ins.forEach(function(sg){gi.appendChild(sg);var l=sg.querySelector('.segl');if(l)l.style.display='none';
   if(l&&l.textContent==='Mentor')[].forEach.call(sg.querySelectorAll('.sb .sbt'),function(b){b.textContent=b.textContent.replace(/^Comenta cada lance$/,'Comentando cada lance').replace(/^Só no fim$/,'Comentários no final');});
  });
 }
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
 if(V103.h){[].forEach.call(cur.querySelectorAll('.theme-tile .theme-preview'),function(x){x.style.height=V103.h+'px';x.style.width=V103.h+'px';});}
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
 var setH=function(h){[].forEach.call(tiles,function(t){t.style.height=h+'px';t.style.width=h+'px';});};
 var over=function(){var mr=m.getBoundingClientRect(),cr=cur.getBoundingClientRect(),pb=parseFloat(getComputedStyle(m).paddingBottom)||0;return Math.ceil(cr.bottom+pb-mr.bottom+m.scrollTop)+2;};
 var hide=function(sel,on){[].forEach.call(cur.querySelectorAll(sel),function(e){e.style.display=on?'none':'';});};
 cur.classList.remove('v103-tight','v103-tight2','v103-tight3');hide('.v33-fxd',false);hide('.seg .segn',false);
 /* v109: temas quadrados: no máximo a largura da coluna */
 var tl=tiles[0].parentNode,tcs=getComputedStyle(tl),colW=Math.floor(tl.clientWidth-(parseFloat(tcs.paddingLeft)||0)-(parseFloat(tcs.paddingRight)||0));
 var MAX=Math.max(30,colW),MIN=30;if(cur.querySelector('.v34-cont'))MIN=26;
 /* v110: primeiro aperta o resto; os temas só ficam menores que 46 px se não houver outro jeito */
 var TGT=Math.min(MAX,46);setH(TGT);
 var steps=[function(){hide('.v33-fxd',true);},function(){hide('.seg .segn',true);},function(){cur.classList.add('v103-tight');},function(){cur.classList.add('v103-tight2');},function(){cur.classList.add('v103-tight3');}];
 for(var i=0;i<steps.length&&over()>0;i++)steps[i]();
 var free=-over();
 var h=Math.max(MIN,Math.min(MAX,TGT+Math.floor(free/rows)-1));
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

/* ======================= v111: Centro de Treino ======================= */
/* botão "Analisar jogadas": sem a seta, texto mais enxuto e organizado */
if(typeof V34!=='undefined'){
 V34.aeBanner=function(ms){
  var b=document.createElement('button');b.type='button';b.className='v34-aeb v111-aeb'+(ms&&ms.due?' due':'');
  var due=ms&&ms.due?'<em>'+ms.due+(ms.due===1?' erro seu volta hoje':' erros seus voltam hoje')+'</em>':'';
  b.innerHTML='<span class="v34-aea">'+V34.AE_SVG+'</span><span class="v34-aet"><b>Analisar jogadas</b><u>Lichess · Chess.com</u><i>Suas partidas viram aulas sobre os seus erros</i>'+due+'</span>';
  b.onclick=function(){V34.erros();};
  return b;
 };
}
/* sem a faixa "Plano do dia é o seu próximo passo": as seções sobem */
(function(){
 if(typeof App==='undefined'||!App.training)return;
 var o=App.training;
 App.training=function(){
  var r=o.apply(this,arguments);
  try{[].forEach.call(document.querySelectorAll('.menu.hub .minfo'),function(x){if(/^Plano do dia é o seu próximo passo/.test(x.textContent.trim()))x.remove();});}catch(e){}
  return r;
 };
})();

/* ======================= v112: ícones animados nos botões do Centro de Treino que ainda não tinham ======================= */
var V112={G:'#f3d98c',S:'rgba(243,217,140,.16)'};
V112.svg=function(inner){return '<svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true" fill="none" stroke="#f3d98c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>';};
V112.pawn=function(x,y,cls,d){return '<g class="'+cls+'"'+(d?' style="animation-delay:'+d+'"':'')+'><circle cx="'+x+'" cy="'+(y-4.6)+'" r="2.5" fill="rgba(243,217,140,.25)"/><path d="M'+(x-4)+','+(y+3.4)+' h8 l-1.7,-5.6 h-4.6 z" fill="rgba(243,217,140,.25)"/></g>';};
V112.ICONS={
 /* lâmpada que acende: ideia, processo de pensar */
 'Como pensar':V112.svg('<g class="v112-rays"><path d="M16,.9 v2 M5.3,4.9 l1.4,1.4 M26.7,4.9 l-1.4,1.4 M1.8,13.6 h2 M28.2,13.6 h2"/></g><path class="v112-bulb" d="M16,5.2 a8,8 0 0 0 -4.8,14.4 c.9,.7 1.4,1.7 1.4,2.8 v1.1 h6.8 v-1.1 c0,-1.1 .5,-2.1 1.4,-2.8 A8,8 0 0 0 16,5.2 z" fill="rgba(243,217,140,.16)"/><path class="v112-fil" d="M13.4,15.6 l1.3,1.6 1.3,-1.6 1.3,1.6 1.3,-1.6"/><path d="M13,26.6 h6 M14,29.2 h4"/>'),
 /* folha do dia com o visto sendo desenhado */
 'Plano do dia':V112.svg('<rect x="5" y="7" width="22" height="20.5" rx="3" fill="rgba(243,217,140,.12)"/><path d="M5,12.6 h22 M11,4.4 v5 M21,4.4 v5"/><path class="v112-chk" pathLength="1" d="M11,19.6 l3.6,3.6 l7,-7.2" stroke-width="2.2"/>'),
 /* caminho que sobe até a bandeira, com um ponto percorrendo */
 'Trilha':V112.svg('<path d="M4.5,27.5 C10,27.5 9,18.5 16,18.5 S22,9.5 25.5,8.6" stroke-dasharray="1.6 2.6" opacity=".7"/><path d="M25.5,8.6 V2.6 l4.4,1.8 -4.4,1.8" fill="#f3d98c"/><circle r="2.3" fill="#f3d98c" stroke="none"><animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.8;1" calcMode="linear" path="M4.5,27.5 C10,27.5 9,18.5 16,18.5 S22,9.5 25.5,8.6"/></circle>'),
 /* casas do tabuleiro com o olhar varrendo */
 'Treino de visão':V112.svg('<g stroke-width="1.2" opacity=".75"><rect x="4.5" y="4.5" width="23" height="23" rx="2"/><path d="M12.2,4.5 v23 M19.8,4.5 v23 M4.5,12.2 h23 M4.5,19.8 h23"/></g><g fill="rgba(243,217,140,.18)" stroke="none"><rect x="12.2" y="4.5" width="7.6" height="7.7"/><rect x="4.5" y="12.2" width="7.7" height="7.6"/><rect x="19.8" y="12.2" width="7.7" height="7.6"/><rect x="12.2" y="19.8" width="7.6" height="7.7"/></g><rect class="v112-scan" x="4.5" y="4.5" width="7.7" height="7.7" rx="1" fill="rgba(243,217,140,.75)" stroke="none"/>'),
 /* raio: o golpe tático */
 'Táticas':V112.svg('<path class="v112-bolt" d="M18.6,2.4 L7.6,18 h7 l-2,11.6 L24.6,13 h-7.2 z" fill="rgba(243,217,140,.18)"/><path class="v112-spark" d="M26.5,4.5 l1.8,-1.8 M27.5,8.5 h2.5 M4.6,24 l-2,1.6"/>'),
 /* o rei tomba: xeque-mate */
 'Padrões de mate':V112.svg('<path d="M6.5,29 h19" opacity=".6"/><g class="v112-tip"><path d="M16,2.8 v5.4 M13.3,5.4 h5.4"/><path d="M10.6,15.6 c0,-3.4 2.4,-5.6 5.4,-5.6 s5.4,2.2 5.4,5.6 z" fill="rgba(243,217,140,.16)"/><path d="M9.6,15.6 h12.8"/><path d="M11.2,26.4 l1.4,-10.8 h6.8 l1.4,10.8 z" fill="rgba(243,217,140,.16)"/><path d="M10,26.6 h12"/></g>'),
 /* livro aberto com a página virando */
 'Aberturas':V112.svg('<path d="M16,8.4 c-3,-2 -7,-2.6 -11.2,-2.1 v19 c4.2,-.5 8.2,.1 11.2,2.1" fill="rgba(243,217,140,.12)"/><path d="M16,8.4 c3,-2 7,-2.6 11.2,-2.1 v19 c-4.2,-.5 -8.2,.1 -11.2,2.1" fill="rgba(243,217,140,.12)"/><path d="M16,8.4 v19"/><path class="v112-page" d="M16,8.4 c3,-2 7,-2.6 11.2,-2.1 v19 c-4.2,-.5 -8.2,.1 -11.2,2.1 z" fill="rgba(243,217,140,.32)" stroke-width="1.2"/><path d="M8,12 h4.6 M8,15.4 h4.6 M8,18.8 h3.4" stroke-width="1.1" opacity=".6"/>'),
 /* corrente de peões acendendo em sequência */
 'Estruturas':V112.svg('<path d="M9,22 L16,15 L23,8" stroke-dasharray="1.4 2.4" opacity=".55"/>'+V112.pawn(8.5,25,'v112-pw','0s')+V112.pawn(16,18,'v112-pw','.45s')+V112.pawn(23.5,11,'v112-pw','.9s')),
 /* peão sobe até a última fileira e a coroa brilha: promoção */
 'Finais':V112.svg('<path d="M3.5,8.6 h25" opacity=".55" stroke-dasharray="2.2 2.2"/><path class="v112-crn" d="M11.5,6.4 l-1.2,-4.2 3.2,2.2 2.5,-3 2.5,3 3.2,-2.2 -1.2,4.2 z" fill="#f3d98c" stroke-width="1"/><g class="v112-up">'+V112.pawn(16,25,'','')+'</g><path d="M4,29.4 h24" opacity=".35"/>'),
 /* coroa dos mestres com brilho nas pontas */
 'Partidas de mestres':V112.svg('<path d="M5,23.6 L3.4,11.4 l6.6,5 L16,7.2 l6,9.2 6.6,-5 L27,23.6 z" fill="rgba(243,217,140,.16)"/><path d="M5.4,27.6 h21.2"/><g fill="#f3d98c" stroke="none"><circle class="v112-tw" cx="3.4" cy="11.4" r="1.6"/><circle class="v112-tw" cx="16" cy="7.2" r="1.8" style="animation-delay:.6s"/><circle class="v112-tw" cx="28.6" cy="11.4" r="1.6" style="animation-delay:1.2s"/></g><circle cx="16" cy="18.6" r="2" fill="rgba(243,217,140,.5)"/>')
};
V112.decorate=function(){
 var m=document.querySelector('.menu.hub.v34-ct');if(!m)return;
 [].forEach.call(m.querySelectorAll('.v34-sec .mitem'),function(b){
  if(b.querySelector('.mic'))return;
  var t=b.querySelector('.mt');if(!t)return;var ic=V112.ICONS[t.textContent];if(!ic)return;
  var s=document.createElement('span');s.className='mic mico v112-ic';s.innerHTML=ic;
  var tx=document.createElement('span');tx.className='mtx';
  var d=b.querySelector('.md');tx.appendChild(t);if(d)tx.appendChild(d);
  b.insertBefore(tx,b.firstChild);b.insertBefore(s,tx);b.classList.add('irow');
 });
};
(function(){
 if(typeof App==='undefined'||!App.training)return;
 var o=App.training;
 App.training=function(){var r=o.apply(this,arguments);try{V112.decorate();}catch(e){}return r;};
})();

/* ======================= v113: "Estudo sério hoje" dentro do Plano do dia ======================= */
var V113={};
V113.info=function(){
 var v=V23.d(),s=v.study,today=StudyClock.todaySec(),goal=StudyClock.goalSec();
 return {today:today,goal:goal,pct:Math.min(100,Math.round(today*100/Math.max(60,goal))),week:StudyClock.weekSec(),total:s.total};
};
(function(){
 if(typeof App==='undefined'||!App.training)return;
 var o=App.training;
 App.training=function(){
  var r=o.apply(this,arguments);
  try{
   var m=document.querySelector('.menu.hub.v34-ct');if(!m)return r;
   [].forEach.call(m.querySelectorAll('.v34-clock'),function(x){x.remove();});
   var b=null;[].forEach.call(m.querySelectorAll('.v34-sec .mitem'),function(x){var t=x.querySelector('.mt');if(t&&t.textContent==='Plano do dia')b=x;});
   if(b){
    var I=V113.info(),tx=b.querySelector('.mtx')||b;
    var md=b.querySelector('.md');if(md)md.textContent=md.textContent.replace(/^Próximo passo\s*·\s*/,'');
    b.classList.add('v113-pd');
    var st=document.createElement('span');st.className='v113-st';
    st.innerHTML='<span class="v113-l"><b>Hoje '+V23.fmtH(I.today)+'</b> de '+V23.fmtH(I.goal)+'</span><span class="v113-bar"><i style="width:'+I.pct+'%"></i></span>';
    tx.appendChild(st);
    b.setAttribute('title','Estudo sério · semana '+V23.fmtH(I.week)+' · total '+V23.fmtH(I.total)+' rumo às 5.000 h dos mestres');
   }
  }catch(e){}
  return r;
 };
})();
/* Painel de evolução: sem o cartão "Estudo sério hoje" (o botão Relógio de estudo continua) */
(function(){
 if(typeof Pages==='undefined'||!Pages.profile)return;
 var o=Pages.profile;
 Pages.profile=function(){var r=o.apply(this,arguments);try{[].forEach.call(document.querySelectorAll('.v23-pbox .v23-clock'),function(x){x.remove();});}catch(e){}return r;};
})();

/* ======================= v115: uma escala só para os números de nível =======================
 * O jogo guarda a pontuação de problemas (Profile.d.pzElo) na escala dos problemas, parecida com a do Lichess,
 * que fica bem acima da escala das partidas. Ela continua sendo usada por dentro (escolher a dificuldade),
 * mas tudo o que aparece para a pessoa passa a usar a escala do Elo central do jogo, com o mesmo limite
 * do Painel (no máximo 100 acima do seu Elo). Vale para táticas, faixas, Rush, resumo dos treinos e
 * "Adivinhe o lance" das partidas de mestres. */
var V115={};
V115.ref=function(){var v=0;try{v=Profile.combined()[0];}catch(e){}if(!(v>0)){try{v=V67.start();}catch(e){v=400;}}return v;};
V115.g=function(p){try{return V28.toGame(+p);}catch(e){return +p;}};
V115.cap=function(p){return Math.max(100,Math.min(V115.g(p),V115.ref()+100));};
V115.tac=function(){return V115.cap(Profile.d.pzElo||1200);};
/* textos que mostravam números na escala antiga */
V115.fix=function(t){
 if(typeof t!=='string')return t;
 var m;
 if((m=/^Pontuação de quebra-cabeças: (\d+)$/.exec(t)))return 'Nível em táticas: '+V115.tac()+' (na mesma escala do seu Elo)';
 if((m=/^(Fim da partida \([^)]*\)\. Desempenho estimado: )(\d+)( .*)$/.exec(t)))return m[1]+V115.cap(+m[2])+m[3];
 if((m=/^Desempenho médio recente: (\d+)( .*)$/.exec(t)))return 'Desempenho médio recente: '+V115.cap(+m[1])+m[2];
 if((m=/^(Vidas: .* · {2}nível )(\d+)$/.exec(t)))return m[1]+V115.g(+m[2]);
 if((m=/^Chegou até o nível (\d+)\. (.*)$/.exec(t)))return 'Chegou até o nível '+V115.g(+m[1])+'. '+m[2];
 return t;
};
(function(){
 if(typeof UiJs==='undefined')return;
 var op=UiJs.p;UiJs.p=function(t,c){return op.call(this,V115.fix(t),c);};
 /* título do exercício: "Exercício 3 de 10 · 1350" passa a mostrar a dificuldade na escala do Elo */
 var ob=UiJs.bars;UiJs.bars=function(top,bot,a,b){
  try{var m=/^((?:Exercício \d+ de \d+)|(?:Puzzle Rush · problema \d+)) · (\d+)$/.exec(top);if(m)top=m[1]+' · nível '+V115.g(+m[2]);}catch(e){}
  return ob.call(this,top,bot,a,b);
 };
})();
/* Táticas: o número do topo é o nível em táticas, já na escala do Elo */
(function(){
 if(typeof Pages==='undefined'||!Pages.tactics)return;
 var o=Pages.tactics;
 Pages.tactics=function(){
  var r=o.apply(this,arguments);
  try{var st=UiJs.cur.querySelector('.stats .stat, .stats > div');
   var box=UiJs.cur.querySelector('.stats');if(box){var first=box.firstElementChild;if(first){var b=first.querySelector('b,.sv,.stv')||first.firstElementChild;var l=first.querySelector('span,.sl,.stl')||first.lastElementChild;
    if(b)b.textContent=String(V115.tac());if(l&&l!==b)l.textContent='nível em táticas';}}
   var w=document.createTreeWalker(UiJs.cur,NodeFilter.SHOW_TEXT,null),n;while((n=w.nextNode()))if(/perto da sua pontuação/.test(n.nodeValue))n.nodeValue=n.nodeValue.replace('perto da sua pontuação','perto do seu nível');
  }catch(e){}
  return r;
 };
})();
/* Desafio por faixa: as faixas aparecem na escala do Elo e a indicada para você fica marcada */
if(typeof Pages!=='undefined'&&Pages.bands){
 Pages.bands=function(){
  UiJs.page('Desafio por faixa',Pages.tactics);
  var tac=V115.tac();
  UiJs.p('Escolha a dificuldade. Os números estão na mesma escala do seu Elo; a faixa marcada é a mais indicada agora (seu nível em táticas: '+V115.tac()+').','muted');
  var rows=[],lo=400;
  var name=function(g){try{return Profile.category(g);}catch(e){return '';}};
  while(lo<2600){(function(a){var ga=V115.g(a),gb=V115.g(a+200),on=(tac>=ga||a===400)&&tac<gb;
    rows.push({t:(ga<=100?'até ':ga+' a ')+gb,d:name(Math.round((ga+gb)/2))+(on?' · indicada para você':''),r:'10',hl:on,f:function(){Drills.run('Faixa '+(ga<=100?'até ':ga+'-')+gb,Study.pzTasks(Puzzles.pick(null,a,a+200,10,Profile.seenMap()),false,'tatica'),{back:Pages.bands});}});})(lo);lo+=200;}
  UiJs.items(rows);
 };
}
/* Nivelamento: o resultado mostra junto o seu Elo no jogo, para não parecer outra nota */
(function(){
 if(typeof Pages==='undefined'||!Pages.placementResult)return;
 var o=Pages.placementResult;
 Pages.placementResult=function(){
  var r=o.apply(this,arguments);
  try{UiJs.p('Seu Elo no jogo agora: '+V115.ref()+'. O Nivelamento entra no cálculo, mas o número só sobe de verdade com partidas valendo pontos.','gold small');}catch(e){}
  return r;
 };
})();

/* ======================= v116: Painel de evolução reorganizado =======================
 * Ordem: aviso de conta · Seu nível · Próximo passo · Seu jogo (régua 1/10/20 e 4 blocos) · Sua rotina · Suas partidas · Conta e dados.
 * A mesma estrutura serve ao iniciante (blocos travados, que vão acendendo) e ao veterano. Os cálculos são os de sempre. */
var V116={};
V116.esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V116.st=function(){var d=Profile.d;if(!d.v116||typeof d.v116!=='object')d.v116={seen:{}};if(!d.v116.seen)d.v116.seen={};return d.v116;};
V116.n=function(){try{return Mind.games().length;}catch(e){return 0;}};
V116.MIN=function(){try{return Mind.MIN_GAMES||20;}catch(e){return 20;}};
V116.elo=function(){try{return Profile.combined();}catch(e){return [0,[]];}};
V116.monthKey=function(t){try{return Profile.monthKey(t);}catch(e){var d=new Date(t);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);}};
V116.months=function(){var evo=Profile.d.evo||{},ks=Object.keys(evo).filter(function(k){return evo[k]&&evo[k].e>0;}).sort();return ks.slice(-6).map(function(k){return {k:k,e:Math.round(evo[k].e)};});};
V116.MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
V116.delta=function(v){var ms=V116.months(),cur=V116.monthKey(Date.now());var prev=ms.filter(function(m){return m.k<cur;}).pop();return prev&&v>0?v-prev.e:null;};
V116.mget=function(M,k){try{if(!M)return null;if(typeof M.get==='function')return M.get(k);if(M.h)return M.h[k];return M[k];}catch(e){return null;}};
V116.icon=function(n){return '<i class="v116-ti" aria-hidden="true">'+n+'</i>';};
V116.go=function(f){return function(){try{f();}catch(e){if(window.console)console.error(e);}};};

/* o que fazer agora: um único cartão */
V116.next=function(){
 var s=V34.state(),h=Profile.d.hist||[],ss=Profile.srsStats(),n=V116.n(),MIN=V116.MIN();
 if(!s.placed&&!h.length)return {i:'◎',t:'Fazer o Nivelamento',d:'36 posições · cerca de 10 min · mostra o seu nível',f:Pages.placementIntro};
 if(!h.length)return {i:'♞',t:'Jogar a sua primeira partida',d:'Contra o Mentor, que explica cada lance',f:App.setupGame};
 if(ss[2]>0)return {i:'↻',t:ss[2]+(ss[2]===1?' erro seu volta hoje':' erros seus voltam hoje'),d:'Revisão rápida · cerca de '+Math.max(2,Math.round(ss[2]*1.5))+' min',f:function(){Drills.run('Revisões do dia',Study.srsTasks(30),{back:Pages.profile});}};
 if(!s.dailyAll)return {i:'☀',t:'Plano do dia',d:'15, 30 ou 60 min de treino guiado',f:Pages.daily};
 if(n<MIN)return {i:'♞',t:'Faltam '+(MIN-n)+(MIN-n===1?' partida':' partidas')+' para o seu perfil completo',d:'Jogue valendo pontos: cada partida é analisada',f:App.setupGame};
 try{var sg=V24.suggest();if(sg&&sg.length)return {i:'✦',t:sg[0].b||'Treinar o seu ponto fraco',d:sg[0].t,f:sg[0].f};}catch(e){}
 return {i:'♞',t:'Jogar uma partida valendo pontos',d:'É o que faz o seu Elo subir',f:App.setupGame};
};

V116.page=function(){
 UiJs.page('Painel de evolução',App.menu);
 var cur=UiJs.cur;cur.classList.add('v116');
 var C=V23&&V23.Cloud,el=function(c,p,h){var e=UiJs.el('div',c,p||cur);if(h!=null)e.innerHTML=h;return e;};
 /* aviso: progresso só neste aparelho */
 if(!(C&&C.user)){var bn=el('v116-warn',null,'<span>📱</span><b>Seu progresso está só neste aparelho</b><u>Salvar com Google</u>');bn.setAttribute('role','button');bn.onclick=V116.go(V23.account);}
 /* 1. Seu nível */
 var cb=V116.elo(),v=cb[0];
 var lv=el('v116-card v116-lv');
 if(v>0){
  var goal=Profile.nextGoal(v),prev=0;(Profile.GOALS||[]).forEach(function(g){if(g<=v)prev=g;});
  var pct=Math.max(2,Math.min(100,Math.round((v-prev)*100/Math.max(1,goal-prev)))),dl=V116.delta(v);
  lv.innerHTML='<div class="v116-k">Seu nível</div><div class="v116-big"><b>'+v.toLocaleString('pt-BR')+'</b><span>'+V116.esc(Profile.category(v))+'</span>'+(dl?'<em class="'+(dl>0?'up':'dn')+'">'+(dl>0?'▲ +':'▼ ')+dl+' no mês</em>':'')+'</div>'+
   '<div class="v116-bar"><i style="width:'+pct+'%"></i></div><div class="v116-sub"><span>Meta '+goal.toLocaleString('pt-BR')+' · faltam '+(goal-v)+'</span><a>Como é calculado ›</a></div><div class="v116-hint">Sobe com vitórias em partidas valendo pontos.</div>';
  lv.querySelector('a').onclick=V116.go(V116.calc);
 }else{
  lv.innerHTML='<div class="v116-k">Seu nível</div><div class="v116-big"><b>—</b><span>Descubra o seu nível em 10 min</span></div><div class="v116-bar"></div><div class="v116-sub"><span>Nivelamento, partidas ou problemas dão a primeira estimativa</span></div>';
  lv.setAttribute('role','button');lv.onclick=V116.go(Pages.placementIntro);
 }
 /* 2. Próximo passo */
 var nx=V116.next(),np=el('v116-next',null,'<span class="v116-ni">'+nx.i+'</span><span class="v116-nt"><i>Próximo passo</i><b>'+V116.esc(nx.t)+'</b><small>'+V116.esc(nx.d||'')+'</small></span><em>›</em>');
 np.setAttribute('role','button');np.onclick=V116.go(nx.f);
 /* 3. Seu jogo */
 var n=V116.n(),MIN=V116.MIN(),S=V116.st(),ac=Profile.d.v29acc,ss=Profile.srsStats();
 el('v116-h',null,'Seu jogo');
 var rl=el('v116-rule');
 [[1,'1 partida'],[10,'10'],[MIN,MIN+' · perfil completo']].forEach(function(m,i){if(i)UiJs.el('i','v116-rl'+(n>=m[0]?' on':''),rl);var s=UiJs.el('span','v116-rm'+(n>=m[0]?' on':''),rl);s.innerHTML='<s></s>'+m[1];});
 UiJs.el('div','v116-rn',cur,n>=MIN?'Perfil completo · '+n+' partidas analisadas':n+' de '+MIN+' partidas analisadas');
 var grid=el('v116-grid');
 var ax=null;try{ax=Evo.axes();}catch(e){}
 var perfDesc=function(){if(!ax)return '';var ok=ax.filter(function(a){return a.val>=0;}).slice().sort(function(a,b){return b.val-a.val;});if(ok.length<2)return 'Seu jogo em 8 características';return 'Forte: '+ok[0].label.toLowerCase()+' · treinar: '+ok[ok.length-1].label.toLowerCase();};
 var rx='';try{var sg=V24.suggest();if(sg&&sg.length)rx=sg[0].t;}catch(e){}
 var tiles=[
  {k:'raiox',t:'Raio-X',ic:'⌕',need:1,why:'Onde você mais erra',d:rx||'Pronto: veja o que mais custa pontos',f:function(){V24.xray();}},
  {k:'revisoes',t:'Revisões',ic:'↻',need:0,why:'Seus erros voltam para fixar',d:ss[2]+' hoje · '+ss[1]+' dominadas',hl:ss[2]>0,f:function(){if(ss[2]>0)Drills.run('Revisões do dia',Study.srsTasks(30),{back:Pages.profile});else Pages.tactics();}},
  {k:'precisao',t:'Precisão',ic:'◎',need:10,why:'Qualidade média dos seus lances',d:ac&&ac.n?String(ac.acc).replace('.',',')+'% em '+ac.n+' partidas':'Pronta com as próximas análises',f:V116.calc},
  {k:'perfil',t:'Perfil',ic:'✶',need:MIN,why:'Pontos fortes e o que treinar',d:perfDesc(),f:V116.perfil}
 ];
 tiles.forEach(function(x){
  var open=n>=x.need,isNew=open&&x.need>0&&!S.seen[x.k];
  var b=UiJs.el('button','v116-tile'+(open?'':' lock')+(x.hl?' hl':'')+(isNew?' new':''),grid);b.type='button';
  b.innerHTML='<span class="v116-th"><span class="v116-tic">'+(open?x.ic:'🔒')+'</span><b>'+x.t+'</b>'+(isNew?'<u>novo</u>':'')+'</span><span class="v116-why">'+x.why+'</span><span class="v116-td">'+(open?V116.esc(x.d):'após '+x.need+(x.need===1?' partida':' partidas')+' · faltam '+(x.need-n))+'</span>';
  b.onclick=function(){if(!open){UiJs.toast(x.t+': libera com '+x.need+(x.need===1?' partida analisada':' partidas analisadas')+'. Você tem '+n+'.');return;}if(isNew){S.seen[x.k]=1;try{Profile.save();}catch(e){}}x.f();};
 });
 var newOne=tiles.filter(function(x){return n>=x.need&&x.need>0&&!S.seen[x.k];})[0];
 if(newOne)UiJs.el('div','v116-tip',cur,'✦ '+({raiox:'Seu Raio-X está pronto: veja onde você mais perde pontos.',precisao:'Sua precisão já tem amostra: ela passa a pesar no seu Elo.',perfil:'Seu perfil completo está pronto: pontos fortes e o que treinar.'}[newOne.k]));
 var lk=el('v116-links');
 var a1=UiJs.el('a','',lk,'Mapa do pensamento ›');a1.onclick=V116.go(Mind.page);
 if((Profile.d.pzN|0)>=10){var tac=0;try{tac=V115.tac();}catch(e){}if(tac)UiJs.el('span','',lk,'Tática '+tac);}
 /* 4. Sua rotina */
 el('v116-h',null,'Sua rotina');
 var rt=el('v116-card v116-rt');
 var wk='0 min';try{wk=V23.fmtH(StudyClock.weekSec());}catch(e){}
 var sk=0;try{sk=Profile.streak();}catch(e){}
 rt.innerHTML='<div class="v116-rr"><span><b>'+sk+'</b> '+(sk===1?'dia seguido':'dias seguidos')+'</span><span>Semana '+wk+'</span><a class="clk">Relógio ›</a></div>';
 rt.querySelector('.clk').onclick=V116.go(V23.studyPage);
 var ms=V116.months();
 if(ms.length>=2){
  var mx=Math.max.apply(null,ms.map(function(m){return m.e;})),mn=Math.min.apply(null,ms.map(function(m){return m.e;}));
  var bars=UiJs.el('div','v116-mb',rt);
  ms.forEach(function(m,i){var h=mx===mn?60:Math.round(25+75*(m.e-mn)/(mx-mn));var c=UiJs.el('span','v116-mbc'+(i===ms.length-1?' on':''),bars);c.innerHTML='<i style="height:'+h+'%"></i><em>'+V116.MES[+m.k.slice(5,7)-1]+'</em>';c.title=m.e;});
  var ev=UiJs.el('a','v116-ev',rt,'Evolução mês a mês ›');ev.onclick=V116.go(V116.evolucao);
 }else UiJs.el('div','v116-hint',rt,'A linha do tempo mês a mês aparece a partir do segundo mês de atividade.');
 /* 5. Suas partidas */
 el('v116-h',null,'Suas partidas');
 var h=Profile.d.hist||[],pl=el('v116-card v116-gl');
 if(!h.length){var e0=UiJs.el('div','v116-empty',pl,'Nenhuma partida ainda · ');var j=UiJs.el('a','',e0,'Jogar agora ›');j.onclick=V116.go(App.setupGame);}
 else{
  for(var i=h.length-1,c=0;i>=0&&c<4;i--,c++)V116.row(pl,h[i],i);
  var all=UiJs.el('a','v116-all',pl,'Ver todas as '+h.length+' ›');all.onclick=V116.go(V116.partidas);
 }
 /* 6. Conta e dados (recolhido) */
 var det=document.createElement('details');det.className='v34-more v116-acc';cur.appendChild(det);
 det.open=!!V116.accOpen;det.ontoggle=function(){V116.accOpen=det.open;};
 var g=C&&C.user,li=false;try{li=!!V32.acc().lichess;}catch(e){}
 var sm=document.createElement('summary');sm.innerHTML='<span>Conta e dados</span><small>'+(g?'<b class="ok">Google ✓</b>':'Google ✗')+' · '+(li?'<b class="ok">Lichess ✓</b>':'Lichess ✗')+'</small>';det.appendChild(sm);
 var mb=UiJs.el('div','v34-mb',det);
 V34.inside(mb,function(){
  UiJs.btns([[g?'Conta Google, Lichess e backup':'Salvar com Google · ligar Lichess e Chess.com',V23.account,'pri']]);
  if(typeof V32!=='undefined'&&V32.lesson)UiJs.btns([['Aula da semana (suas partidas de fora)',function(){V32.lesson(Pages.profile);}]]);
  UiJs.btns([['Exportar todas as partidas (PGN)',function(){Pages.pgnAll();}]]);
  UiJs.btns([['Apagar todo o progresso',function(){UiJs.modal('Apagar tudo?','Pontuações, histórico, revisões e trilha serão apagados deste aparelho.',[['Apagar',function(){Profile.reset();Pages.profile();},'warn'],['Cancelar',null,'pri']]);},'warn']]);
 });
};
V116.row=function(p,r,k){
 var sc=r.res,res=sc>=1?'Vitória':(sc<=0?'Derrota':'Empate'),dt=new Date(r.t),hoje=new Date();
 var dd=dt.toDateString()===hoje.toDateString()?'hoje':(new Date(hoje-86400000).toDateString()===dt.toDateString()?'ontem':dt.getDate()+'/'+(dt.getMonth()+1));
 var cat='';cat=V116.mget(App.CAT_LABEL,r.cat)||'';
 var b=UiJs.el('button','v116-gr',p);b.type='button';
 b.innerHTML='<span><b class="'+(sc>=1?'w':(sc<=0?'l':'d'))+'">'+res+'</b> · '+(r.col==1?'Brancas':'Pretas')+' · '+V116.esc(r.opp||'')+'</span><em>'+dd+(cat?' · '+V116.esc(cat):'')+'</em>';
 if(r.ucis)b.onclick=function(){try{Pages.pgnOne(k);}catch(e){}};else b.disabled=true;
};
/* páginas de detalhe */
V116.calc=function(){
 UiJs.page('Como o seu nível é calculado',Pages.profile);
 var cb=V116.elo(),v=cb[0],parts=cb[1]||[];
 UiJs.p(v>0?'Seu nível: '+v+' · '+Profile.category(v):'Você ainda não tem um nível: faça o Nivelamento ou jogue partidas.','gold big');
 UiJs.p('É uma estimativa do treinador, não um rating oficial. Ela é rigorosa de propósito: só sobe com vitórias em partidas valendo pontos; treinos e problemas ajudam a confirmar, mas não fazem o número subir sozinhos.','muted');
 if(parts.length){UiJs.h('O que entra na conta');UiJs.items(parts.map(function(p){return {t:String(p[0]),d:null,r:String(p[1])};}));}
 try{var rg=V29.range();if(rg)UiJs.p('Faixa provável: '+rg.lo+' a '+rg.hi+'.','');}catch(e){}
 var ac=Profile.d.v29acc;
 UiJs.h('Precisão nas partidas');
 UiJs.p(ac&&ac.n?String(ac.acc).replace('.',',')+'% em '+ac.n+(ac.n===1?' partida analisada':' partidas analisadas')+' (cerca de '+ac.perf+'). '+(ac.n>=10?'Já é a parte de maior peso do seu nível.':'Com 10 partidas analisadas passa a ser a parte de maior peso.'):'Jogue partidas ou importe as do Lichess e do Chess.com: com 10 analisadas, a precisão vira a parte de maior peso do seu nível.','muted');
 UiJs.btns([['Voltar ao Painel',Pages.profile,'pri']]);
};
V116.perfil=function(){
 UiJs.page('Seu perfil enxadrístico',Pages.profile);
 var ax=null;try{ax=Evo.axes();}catch(e){}
 if(!ax){UiJs.p('Não deu para montar o perfil agora. Jogue mais uma partida e tente de novo.','warn');UiJs.btns([['Voltar ao Painel',Pages.profile,'pri']]);return;}
 UiJs.radar(ax);
 UiJs.p('De 0 a 100 em cada característica. Verde: ponto forte · dourado: em desenvolvimento · vermelho: prioridade.','muted small');
 UiJs.h('Leitura do seu jogo');
 Evo.reading(ax).forEach(function(sec){var items=sec[1];UiJs.group('rsec',function(){UiJs.p(sec[0],'gold');if(items.length)UiJs.ul(items,'small');else UiJs.p(sec[2],'muted');});});
 UiJs.h('Como evoluir cada característica');
 var order=ax.slice().sort(function(a,b){var x=a.val<0?999:a.val,y=b.val<0?999:b.val;return x-y;});
 UiJs.items(order.map(function(a){var t=V116.mget(Evo.TIPS,a.k)||['','Treinar',App.training];return {t:a.label+(a.val>=0?' · '+a.val:' · sem dados'),d:t[0],r:t[1]+' ›',f:t[2]};}));
};
V116.evolucao=function(){UiJs.page('Evolução mês a mês',Pages.profile);Evo.monthly(V116.elo()[0]);};
V116.partidas=function(){
 UiJs.page('Suas partidas',Pages.profile);
 var h=Profile.d.hist||[],box=UiJs.el('div','v116-card v116-gl',UiJs.cur);
 for(var i=h.length-1;i>=0;i--)V116.row(box,h[i],i);
 UiJs.btns([['Exportar todas (PGN)',function(){Pages.pgnAll();},'pri']]);
};
if(typeof Pages!=='undefined')Pages.profile=V116.page;
