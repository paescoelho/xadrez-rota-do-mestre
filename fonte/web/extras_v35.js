/* Rota do Mestre — v53: jogo ao vivo com ligação pelo WhatsApp, reações e partida para assistir.
 * 1) Ligação: cada jogador decide se libera o próprio número (salas/{code}/privado/{cor}); só os dois jogadores leem.
 *    O botão verde abre a conversa com o adversário no WhatsApp (o WhatsApp não deixa um site iniciar a ligação sozinho).
 *    Os números são apagados da sala quando a partida termina.
 * 2) Reações: 👍 😮 😂 👏 🤝 🔥 aparecem por 2 segundos no tabuleiro de todos (salas/{code}/reacoes), com limite por pessoa.
 * 3) Assistir: link "?ver=CODE" abre a partida só para ver (sem login, sem mexer, sem dicas, sem telefones).
 *    Quem assiste marca presença em salas/{code}/plateia/{uid} a cada 90 s; os jogadores veem "👁 N assistindo".
 */
var V35={EMO:['👍','😮','😂','👏','🤝','🔥'],un:[],code:null,tel:{},plat:{},lastFx:0,fxN:0,w:null};
V35.esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V35.ev=function(k){try{if(typeof V27!=='undefined'&&V27.ev)V27.ev(k);}catch(e){}};
V35.db=function(){return window.firebase.firestore();};
V35.TS=function(){return window.firebase.firestore.FieldValue.serverTimestamp();};
V35.link=function(code){return V31.base()+'?ver='+code;};
V35.digits=function(s){var d=String(s||'').replace(/\D/g,'');if(d.length===10||d.length===11)d='55'+d;return d;};
V35.validTel=function(d){return /^[0-9]{12,15}$/.test(d);};
V35.fmt=function(d){if(!d)return '';var m=d.match(/^55(\d\d)(\d{4,5})(\d{4})$/);return m?'('+m[1]+') '+m[2]+'-'+m[3]:'+'+d;};
V35.myTelLS=function(){try{return localStorage.getItem('rdm-tel')||'';}catch(e){return '';}};
V35.asked=function(code){try{return localStorage.getItem('rdm-telask-'+code)==='1';}catch(e){return false;}};
V35.setAsked=function(code){try{localStorage.setItem('rdm-telask-'+code,'1');}catch(e){}};

/* ---------- ouvintes da sala (jogadores) ---------- */
V35.stop=function(){V35.un.forEach(function(f){try{f();}catch(e){}});V35.un=[];V35.code=null;V35.tel={};V35.plat={};clearInterval(V35.pt);V35.pt=null;};
V35.listen=function(code,asPlayer){
 V35.stop();V35.code=code;var ref=V35.db().collection('salas').doc(code);
 if(asPlayer){
  V35.un.push(ref.collection('privado').onSnapshot(function(qs){V35.tel={};qs.forEach(function(d){V35.tel[d.id]=d.data().tel;});V35.decorate();},function(){}));
 }
 V35.un.push(ref.collection('plateia').onSnapshot(function(qs){V35.plat={};qs.forEach(function(d){var t=d.data().t;V35.plat[d.id]=t&&t.toMillis?t.toMillis():Date.now();});V35.watchers();},function(){}));
 var since=window.firebase.firestore.Timestamp.fromMillis(Date.now()-4000);
 V35.un.push(ref.collection('reacoes').where('t','>',since).onSnapshot(function(qs){
  qs.docChanges().forEach(function(ch){if(ch.type!=='added')return;var x=ch.doc.data();if(!x||x.uid===V31.uid)return;V35.float(x.e,x.de);});
 },function(){}));
 V35.pt=setInterval(V35.watchers,20000);
};
V35.count=function(){var n=0,now=Date.now();for(var k in V35.plat)if(now-V35.plat[k]<150000)n++;return n;};
V35.watchers=function(){var n=V35.count();[].forEach.call(document.querySelectorAll('.v35-eye'),function(e){e.textContent=n?'👁 '+n+(e.classList.contains('short')?'':(n===1?' assistindo':' assistindo')):'';e.style.display=n?'':'none';});};

/* ---------- reações ---------- */
V35.who=function(de,r){r=r||V31.room||V35.w;if(de==='p')return 'plateia';if(!r)return '';return de===r.hostColor?(r.hostName||'Brancas'):(r.guestName||'Pretas');};
V35.float=function(e,de){
 var bd=document.querySelector('.board');if(!bd||V35.EMO.indexOf(e)<0)return;
 var f=document.createElement('div');f.className='v35-fl';f.innerHTML='<b>'+e+'</b><i>'+V35.esc(V35.who(de))+'</i>';
 f.style.left=(18+Math.random()*58)+'%';bd.appendChild(f);setTimeout(function(){f.remove();},2300);
 try{if(navigator.vibrate)navigator.vibrate(15);}catch(err){}
};
V35.react=function(e,de){
 var now=Date.now();if(now-V35.lastFx<2500){UiJs.toast('Calma: uma reação a cada 3 segundos.');return;}
 if(V35.fxN>=40){UiJs.toast('Limite de reações desta partida.');return;}
 V35.lastFx=now;V35.fxN++;V35.float(e,de);
 var code=V35.code;if(!code)return;
 V35.db().collection('salas').doc(code).collection('reacoes').add({e:e,de:de,t:V35.TS(),uid:V31.uid}).catch(function(){});
};
V35.emoRow=function(parent,de){var row=UiJs.el('div','v35-emo',parent);V35.EMO.forEach(function(e){var b=UiJs.el('button','',row,e);b.type='button';b.setAttribute('aria-label','Reagir '+e);b.onclick=function(){V35.react(e,de);};});return row;};

/* ---------- ligação pelo WhatsApp ---------- */
V35.telAsk=function(code){
 if(document.querySelector('.v35-ov'))return;
 var ov=document.createElement('div');ov.className='v35-ov';
 var saved=V35.myTelLS();
 ov.innerHTML='<div class="v35-md" role="dialog" aria-modal="true"><b>📞 Liberar ligação pelo WhatsApp?</b><p>Assim vocês podem conversar por áudio durante a partida. O seu número aparece <em>só para o seu adversário</em>, nunca para quem estiver assistindo, e é apagado da sala quando a partida termina.</p>'
  +'<label class="v35-tel"><span>🇧🇷 +55</span><input type="tel" inputmode="tel" autocomplete="tel-national" maxlength="20" placeholder="(75) 9 9999-9999"></label>'
  +'<label class="v35-ck"><input type="checkbox" checked> Lembrar meu número neste aparelho</label>'
  +'<button type="button" class="btn pri wide v35-ok">Liberar ligação</button><button type="button" class="btn wide v35-no">Agora não</button></div>';
 document.body.appendChild(ov);
 var inp=ov.querySelector('input[type=tel]'),ck=ov.querySelector('input[type=checkbox]');
 if(saved)inp.value=V35.fmt(saved).replace(/^\+/,'');
 var close=function(){ov.remove();};
 ov.querySelector('.v35-no').onclick=function(){V35.setAsked(code);close();};
 ov.onclick=function(ev){if(ev.target===ov){V35.setAsked(code);close();}};
 ov.querySelector('.v35-ok').onclick=function(){
  var d=V35.digits(inp.value);
  if(!V35.validTel(d)){UiJs.toast('Confira o número: DDD + celular.');inp.focus();return;}
  try{if(ck.checked)localStorage.setItem('rdm-tel',d);else localStorage.removeItem('rdm-tel');}catch(e){}
  V35.setAsked(code);close();
  V35.db().collection('salas').doc(code).collection('privado').doc(V31.me).set({tel:d,t:V35.TS()})
   .then(function(){UiJs.toast('Ligação liberada. Quando o adversário liberar também, o botão verde aparece.');},function(){UiJs.toast('Não deu para liberar agora. Tente de novo.');});
 };
 setTimeout(function(){if(!inp.value)inp.focus();},120);
};
V35.telOff=function(code){var ref=V35.db().collection('salas').doc(code).collection('privado');['w','b'].forEach(function(c){ref.doc(c).delete().catch(function(){});});};

/* ---------- ferramentas na tela do jogador ---------- */
V35.decorate=function(){
 var r=V31.room,me=V31.me,cur=UiJs.cur;if(!r||!me||!cur||V31.view!=='game')return;
 var old=cur.querySelector('.v35-tools');if(old)old.remove();
 if(r.status==='over'){if(V35.code&&!V35.cleared){V35.cleared=V35.code;V35.telOff(V35.code);}}
 var box=document.createElement('div');box.className='v35-tools';
 var opp=V31.other(me),mine=V35.tel[me],his=V35.tel[opp],play=r.status==='play';
 if(play&&mine&&his){
  var a=document.createElement('a');a.className='v35-call';a.href='https://wa.me/'+his;a.target='_blank';a.rel='noopener';
  a.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg><span>Ligar para '+V35.esc(V31.oppName(r))+' no WhatsApp</span>';
  a.onclick=function(){V35.ev('ligacao-whatsapp');UiJs.toast('Abrindo a conversa: toque no telefone no topo do WhatsApp para ligar.');};
  box.appendChild(a);
 }else if(play&&!mine){
  var b=UiJs.el('button','v35-lib',box,'📞 Liberar ligação pelo WhatsApp');b.type='button';b.onclick=function(){V35.telAsk(V31.code);};
 }else if(play&&mine&&!his){
  UiJs.el('div','v35-wait',box,'📞 Ligação liberada por você. Esperando '+V31.oppName(r)+' liberar também.');
 }
 var row=UiJs.el('div','v35-row',box);
 var sh=UiJs.el('button','v35-tb',row,'🔗 Chamar para assistir');sh.type='button';sh.onclick=V35.shareWatch;
 var eye=UiJs.el('span','v35-eye',row,'');eye.style.display='none';
 if(play)V35.emoRow(box,me);
 var btns=cur.querySelectorAll('.btns'),after=btns.length?btns[btns.length-1]:null;
 if(after&&after.nextSibling)cur.insertBefore(box,after.nextSibling);else cur.appendChild(box);
 V35.watchers();
};
V35.shareWatch=function(){
 var r=V31.room||V35.w,code=V31.code||V35.wc;if(!code)return;
 var txt='♟️ Partida de xadrez AO VIVO: '+(r?(r.hostName||'Brancas')+' x '+(r.guestName||'Pretas'):'')+'. Assista agora, não precisa instalar nada: '+V35.link(code);
 V35.ev('assistir-convite');
 if(navigator.share){navigator.share({title:'Xadrez ao vivo',text:txt}).catch(function(){});return;}
 window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener');
};

/* integra com o jogo ao vivo da v31 */
(function(){
 if(typeof V31==='undefined')return;
 var oOpen=V31.open;V31.open=function(code){var r=oOpen.apply(this,arguments);V35.fxN=0;V35.cleared=null;try{V35.listen(code,true);}catch(e){}return r;};
 var oClose=V31.close;V31.close=function(){V35.stop();var x=document.querySelector('.v35-ov');if(x)x.remove();return oClose.apply(this,arguments);};
 var oGP=V31.gamePage;V31.gamePage=function(){
  var r=oGP.apply(this,arguments);
  try{V35.decorate();
   var rm=V31.room;if(rm&&rm.status==='play'&&V31.me&&!V35.tel[V31.me]&&!V35.asked(V31.code)&&(rm.moves||[]).length<4)setTimeout(function(){if(V31.room&&V31.room.status==='play'&&!V35.tel[V31.me]&&!V35.asked(V31.code))V35.telAsk(V31.code);},900);
  }catch(e){}
  return r;
 };
})();

/* ---------- assistir (quem recebeu o link ?ver=) ---------- */
V35.wStop=function(){if(V35.wun){try{V35.wun();}catch(e){}V35.wun=null;}clearInterval(V35.wt);clearInterval(V35.wb);V35.wt=V35.wb=null;V35.stop();V35.w=null;V35.wc=null;};
V35.watch=function(code){
 code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
 V35.wStop();V35.ev('assistir-aberto');
 var back=function(){V35.wStop();App.menu();};
 UiJs.page('Assistindo ao vivo',back);UiJs.p('Abrindo a partida…','muted');
 if(!V31.ready()){UiJs.p('O jogo ao vivo ainda não foi liberado.','warn');return;}
 V31.init().then(function(){
  V35.wc=code;V35.wLen=-1;V35.wView=null;
  var ref=V35.db().collection('salas').doc(code);
  V35.wun=ref.onSnapshot(function(s){
   if(!s.exists){V35.wMsg('Esta partida não existe ou já expirou.',back);return;}
   var r=s.data(),n=(r.moves||[]).length;
   if(n!==V35.wLen){if(V35.wLen>=0&&n>V35.wLen){try{UiJs.sfx('mv');}catch(e){}}V35.wLen=n;V35.wStart=Date.now();}
   V35.w=r;V35.wRender(back);
  },function(e){V35.wMsg(V31.err(e),back);});
  var beat=function(){if(document.hidden||!V35.wc)return;ref.collection('plateia').doc(V31.uid).set({t:V35.TS()}).catch(function(){});};
  beat();V35.wb=setInterval(beat,90000);
  V35.listen(code,false);
  V35.wt=setInterval(function(){if(V35.w&&V35.w.status==='play')V35.wBars();},500);
 },function(e){V35.wMsg(V31.err(e),back);});
};
V35.wMsg=function(m,back){V35.wStop();UiJs.page('Assistindo ao vivo',back||App.menu);UiJs.p(m,'warn');UiJs.btns([['Abrir o jogo',App.menu,'pri']]);};
V35.wLeft=function(r,c){if(!r||!r.clocks)return null;var ms=r.clocks[c];if(r.status==='play'&&(r.moves||[]).length>=2&&V31.turn(r)===c)ms-=Date.now()-V35.wStart;return ms;};
V35.wBars=function(){
 var r=V35.w,b=UiJs.board;if(!r||!b)return;
 var wn=r.hostColor==='w'?r.hostName:r.guestName,bn=r.hostColor==='w'?r.guestName:r.hostName,we=r.hostColor==='w'?r.hostElo:r.guestElo,be=r.hostColor==='w'?r.guestElo:r.hostElo;
 var t=V31.turn(r),play=r.status==='play';
 var wt=(wn||'Brancas')+(we?' ('+we+')':'')+(r.clocks?' · '+V31.clk(V35.wLeft(r,'w')):''),bt=(bn||'Pretas')+(be?' ('+be+')':'')+(r.clocks?' · '+V31.clk(V35.wLeft(r,'b')):'');
 if(b.flip)UiJs.bars(wt,bt,play&&t==='w',play&&t==='b');else UiJs.bars(bt,wt,play&&t==='b',play&&t==='w');
};
V35.wRender=function(back){
 var r=V35.w;if(!r)return;
 if(r.status==='cancel'){V35.wMsg('Este convite foi cancelado.',back);return;}
 if(r.status==='wait'){if(V35.wView!=='wait'){V35.wView='wait';UiJs.page('Assistindo ao vivo',back);var c=UiJs.el('div','v35-wwait',UiJs.cur);c.innerHTML='<span class="v35-live">AO VIVO</span><b>A partida ainda não começou</b><span>'+V35.esc(r.hostName||'O jogador')+' está esperando o adversário entrar. Esta tela atualiza sozinha.</span>';}return;}
 if(V35.wView!=='game'){V35.wView='game';UiJs.boardPage('Assistindo',back);var sh=UiJs.root.querySelector('.shell');if(sh)sh.classList.add('v31-game','v35-watching');}
 var b=UiJs.board;if(!b)return;b.showLost=true;
 var p=V31.pos(r.moves),mv=r.moves||[],st=V31.status(r);
 b.fen=Engine.toFEN(p);b.flip=!!V35.wFlip;b.last=mv.length?App.lastOf(mv[mv.length-1]):null;b.check=App.checkSq(p);
 b.arrows=[];b.marks=[];b.blind=false;b.onSquare=null;b.legal=null;b.onMove=null;b.clearSel();b.draw();
 V35.wBars();
 UiJs.panel(true);var cur=UiJs.cur;
 var hd=UiJs.el('div','v35-whd',cur);
 hd.innerHTML=(st?'<span class="v35-end">FIM</span>':'<span class="v35-live">AO VIVO</span>')+'<b>'+V35.esc(r.hostColor==='w'?r.hostName:r.guestName)+' <i>x</i> '+V35.esc(r.hostColor==='w'?r.guestName:r.hostName)+'</b><span class="v35-eye short"></span>';
 if(st){
  var wn=st.winner==='d'?null:(st.winner==='w'?(r.hostColor==='w'?r.hostName:r.guestName):(r.hostColor==='b'?r.hostName:r.guestName));
  UiJs.p(wn?wn+' venceu'+(st.how?' ('+st.how+')':'')+'!':'Empate'+(st.how?' ('+st.how+')':'')+'.','big gold');
  UiJs.p('Gostou? Desafie um amigo ou treine com o treinador que explica cada lance.','muted');
  UiJs.btns([['Desafiar um amigo',function(){V35.wStop();V31.home();},'pri'],['Jogar contra o computador',function(){V35.wStop();App.setupGame();}]]);
 }else{
  UiJs.p('Vez das '+(V31.turn(r)==='w'?'Brancas':'Pretas')+(Engine.inCheck(p)?' · xeque!':'')+'.','');
  V35.emoRow(cur,'p');
 }
 var tb=UiJs.el('div','v35-row',cur);
 var s1=UiJs.el('button','v35-tb',tb,'🔗 Compartilhar');s1.type='button';s1.onclick=V35.shareWatch;
 var s2=UiJs.el('button','v35-tb',tb,'⇅ Virar');s2.type='button';s2.onclick=function(){V35.wFlip=!V35.wFlip;V35.wRender(back);};
 var ml=App.movesText(V31.sans(mv));if(ml)UiJs.p(ml,'muted small');
 try{var op=Book.detect(mv);if(op)UiJs.p('Abertura: '+op[1]+' ('+op[0]+')','muted small');}catch(e){}
 UiJs.p('Você está só assistindo: não mexe nas peças, não vê dicas nem o telefone de ninguém.'+(r.tc?' Ritmo '+V31.tcTxt([r.tc.m,r.tc.i])+'.':''),'muted small');
 V35.watchers();
};
/* link ?ver=CODE */
V35.urlCode=function(){var m=(location.search+location.hash).match(/[?&#]ver=([A-Za-z0-9]{4,8})/);return m?m[1].toUpperCase():null;};
(function(){
 if(typeof Online==='undefined')return;
 var oFU=Online.fromUrl;
 Online.fromUrl=function(){
  var c=V35.urlCode();
  if(c){try{history.replaceState(null,'',location.pathname);}catch(e){}setTimeout(function(){V35.watch(c);},30);return true;}
  return oFU.apply(this,arguments);
 };
})();
/* sair da tela de assistir pelo menu também desliga os ouvintes */
(function(){var o=App.menu;App.menu=function(){if(V35.wc)V35.wStop();return o.apply(this,arguments);};})();

/* v55: tela "Jogar online" numa tela só, sem rolar: destaque das funções, opções compactas e botão grande */
(function(){
 if(typeof V31==='undefined')return;
 var oH=V31.home;
 V31.home=function(){
  if(!V31.ready())return oH.apply(this,arguments);
  V31.close();
  UiJs.page('Jogar online',App.menu);
  var cur=UiJs.cur;cur.classList.add('v35-home');
  V31.init().catch(function(){});
  /* topo */
  var hd=UiJs.el('div','v35-hh',cur);
  hd.innerHTML='<span class="v35-hi">'+V31.WA+'</span><div><b>Xadrez ao vivo com um amigo</b><span>Mande o link pelo WhatsApp: ele toca e já está no tabuleiro. Sem instalar, sem cadastro.</span></div>';
  /* funções em destaque */
  var ft=UiJs.el('div','v35-fg',cur);
  [['📞','Áudio no WhatsApp','conversem durante a partida','call'],['👁','Assistir ao vivo','qualquer um, pelo link','eye'],['👏','Reações','👍 😮 😂 🔥 no tabuleiro','fx'],['🎓','Ideal para aulas','explique os lances por áudio','prof']].forEach(function(x){
   var c=UiJs.el('div','v35-fc '+x[3],ft);c.innerHTML='<i>'+x[0]+'</i><span><b>'+x[1]+'</b>'+x[2]+'</span>';
  });
  /* nome */
  var nm=document.createElement('input');nm.className='v35-nm';nm.maxLength=30;nm.placeholder='Seu nome (como o amigo vai ver você)';nm.value=V35.nome();nm.autocomplete='nickname';
  nm.oninput=function(){V35.setNome(nm.value);};nm.onblur=function(){nm.value=V35.nome();};cur.appendChild(nm);
  /* ritmo e cor */
  var seg=function(label,opts,on,pick){var w=UiJs.el('div','v35-sg',cur);UiJs.el('span','v35-sl',w,label);var g=UiJs.el('div','v35-so',w);g.style.gridTemplateColumns='repeat('+opts.length+',1fr)';
   opts.forEach(function(o,i){var b=UiJs.el('button',on(o,i)?'on':'',g,o[0]);b.type='button';b.onclick=function(){pick(o,i);[].forEach.call(g.children,function(x){x.className='';});b.className='on';};});};
  seg('Ritmo',V31.TCS.map(function(t){return [t[0]==='Sem relógio'?'Livre':t[0]];}),function(o,i){return V31.tc===i;},function(o,i){V31.tc=i;});
  seg('Você joga de',[['♔ Brancas','w'],['♚ Pretas','b'],['🎲 Sorteio','r']],function(o){return V31.color===o[1];},function(o){V31.color=o[1];});
  /* criar */
  var go=document.createElement('button');go.type='button';go.className='btn pri wide v31-wa v35-go';go.innerHTML='<span class="v31-wai">'+V31.WA+'</span>Criar partida e convidar';
  go.onclick=function(){if(go.disabled)return;go.disabled=true;go.lastChild.textContent='Criando…';
   try{V30.fs();}catch(e){}
   V31.create({tc:V31.TCS[V31.tc][1],color:V31.color}).then(function(code){V31.open(code);},function(e){go.disabled=false;go.lastChild.textContent='Criar partida e convidar';UiJs.toast(V31.err(e));});};
  cur.appendChild(go);
  /* código recebido + partidas abertas */
  var row=UiJs.el('div','v35-cr',cur);
  var ci=document.createElement('input');ci.className='v35-ci';ci.maxLength=8;ci.placeholder='Recebeu um código?';ci.autocapitalize='characters';ci.spellcheck=false;row.appendChild(ci);
  var cb=UiJs.el('button','v35-cb',row,'Entrar');cb.type='button';
  cb.onclick=function(){var c=String(ci.value).toUpperCase().replace(/[^A-Z0-9]/g,'');if(c.length===6)V31.invite(c);else{UiJs.toast('O código tem 6 letras e números.');ci.focus();}};
  var open=V31.mine().filter(function(x){return x.st==='play'||x.st==='wait';}).slice(0,6);
  if(open.length){var ob=UiJs.el('button','v35-ob',cur,'♟ '+(open.length===1?'1 partida sua aberta':open.length+' partidas suas abertas')+' · continuar ›');ob.type='button';
   ob.onclick=function(){UiJs.page('Suas partidas abertas',V31.home);UiJs.items(open.map(function(x){return {t:(x.st==='wait'?'Convite '+x.c:'Contra '+(x.opp||'seu amigo')),d:(x.me?'você de '+V31.colName(x.me)+' · ':'')+V31.tcTxt(x.tc),r:'abrir ›',f:function(){V31.resume(x.c);}};}));};}
  /* em desenvolvimento: jogar via Lichess e via Chess.com */
  var ex=UiJs.el('div','v35-ext',cur);
  [['li','♞','Jogar via','Lichess.org','em breve aqui no seu tabuleiro'],['cc','♟','Jogar via','Chess.com','em breve, com importação na hora']].forEach(function(x){
   var b=UiJs.el('button','v35-xb '+x[0],ex);b.type='button';b.setAttribute('aria-disabled','true');
   b.innerHTML='<i>'+x[1]+'</i><span><small>'+x[2]+'</small><b>'+x[3]+'</b><em>Em desenvolvimento…</em></span>';
   b.onclick=function(){UiJs.toast(x[0]==='li'?'Em desenvolvimento: em breve você joga no Lichess com o tabuleiro do Rota do Mestre.':'Em desenvolvimento: em breve o Chess.com abre daqui e a partida volta sozinha para a sua análise.');};
  });
  UiJs.el('div','v35-fp',cur,'Jogo justo: dicas e treinador desligados. O resultado vai para o seu histórico.');
 };
})();

/* v57: o nome do Jogar online fica salvo (último preenchido), também fora do perfil para não se perder numa sincronização */
V35.nome=function(){var n='';try{n=typeof Profile.d.name==='string'?Profile.d.name.trim():'';}catch(e){}if(!n){try{n=localStorage.getItem('rdm-nome')||'';}catch(e){}if(n){try{Profile.d.name=n;Profile.save();}catch(e){}}}return n;};
V35.setNome=function(v){v=String(v||'').trim().slice(0,30);if(!v)return;try{Profile.d.name=v;Profile.save();}catch(e){}try{localStorage.setItem('rdm-nome',v);}catch(e){}};
(function(){
 if(typeof V31==='undefined')return;
 V31.name=function(){var n=V35.nome();return n?n.slice(0,24):'';};
 /* tela do convite: o campo de nome também usa e grava o último nome */
 var oI=V31.invite;V31.invite=function(){var r=oI.apply(this,arguments);var fix=function(){try{[].forEach.call(document.querySelectorAll('.fld input, input.fi'),function(i){var l=i.closest('label');if(l&&/Seu nome/.test(l.textContent)&&!i.__v57){i.__v57=1;if(!i.value)i.value=V35.nome();i.addEventListener('input',function(){V35.setNome(i.value);});}});}catch(e){}};fix();setTimeout(fix,600);setTimeout(fix,1800);return r;};
})();
