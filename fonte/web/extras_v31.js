/* Rota do Mestre v31 — Jogar online ao vivo (convite pelo WhatsApp).
 * Quem convida cria uma sala e manda o link; o amigo toca e entra direto no tabuleiro, sem cadastro.
 * Os lances passam por um banco Firestore (Firebase, plano gratuito) com login anônimo.
 * Enquanto V31.FB estiver vazio, o botão explica que o modo ao vivo ainda vai ser ligado e oferece o modo por mensagens.
 * A configuração do Firebase NÃO é segredo (identifica o projeto); quem protege os dados são as regras do Firestore
 * (arquivo firebase/firestore.rules do repositório). */
var V31={START:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 FB:{apiKey:'AIzaSyBraWM57IhpPDRgPuBp2eEgNHPMvBH1dho',authDomain:'xadrez-whatsapp.firebaseapp.com',projectId:'xadrez-whatsapp',
  storageBucket:'xadrez-whatsapp.firebasestorage.app',messagingSenderId:'788487053452',appId:'1:788487053452:web:77ea97f6afab461cee9ba9'},
                                            /* firebaseConfig público do projeto xadrez-whatsapp (não é segredo; as regras protegem os dados) */
 SDK:'https://www.gstatic.com/firebasejs/10.14.1/',
 EMU:null,                                  /* só para testes: {host, fs, auth} */
 TCS:[['Sem relógio',null],['3+2',[3,2]],['5+3',[5,3]],['10 min',[10,0]],['15+10',[15,10]]],
 tc:3,color:'r',
 app:null,db:null,uid:null,ref:null,unsub:null,room:null,code:null,me:null,
 turnStart:0,turnLen:-1,heard:0,seenOpp:null,tick:null,beat:null,view:null,busy:false,flip:null
};
V31.ready=function(){return !!(V31.FB&&V31.FB.apiKey&&V31.FB.projectId);};
V31.owner=function(){try{return localStorage.getItem('rdm-nao-contar')==='1';}catch(e){return false;}};
V31.base=function(){return location.origin+location.pathname.replace(/index\.html$/,'');};
V31.link=function(code){return V31.base()+'?sala='+code;};
V31.name=function(){var n=Profile.d.name;return n&&String(n).trim()?String(n).trim().slice(0,24):'';};
V31.elo=function(){try{var c=Profile.combined();return c&&c[0]>0?c[0]:0;}catch(e){return 0;}};
V31.esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};

/* ---------- Firebase sob demanda ---------- */
V31.script=function(src){return new Promise(function(ok,bad){var s=document.createElement('script');s.src=src;s.async=true;s.onload=ok;s.onerror=function(){bad(new Error('rede'));};document.head.appendChild(s);});};
V31.boot=null;
V31.init=function(){
 if(!V31.ready())return Promise.reject(new Error('config'));
 if(V31.boot)return V31.boot;
 V31.boot=(window.firebase&&window.firebase.firestore?Promise.resolve():V31.script(V31.SDK+'firebase-app-compat.js').then(function(){return V31.script(V31.SDK+'firebase-auth-compat.js');}).then(function(){return V31.script(V31.SDK+'firebase-firestore-compat.js');}))
 .then(function(){
  var fb=window.firebase;V31.app=fb.apps.length?fb.app():fb.initializeApp(V31.FB);
  var auth=fb.auth();V31.db=fb.firestore();
  if(V31.EMU){try{auth.useEmulator('http://'+V31.EMU.host+':'+V31.EMU.auth,{disableWarnings:true});V31.db.useEmulator(V31.EMU.host,V31.EMU.fs);}catch(e){}}
  return new Promise(function(ok,bad){
   var done=false,off=auth.onAuthStateChanged(function(u){if(u&&!done){done=true;off();V31.uid=u.uid;ok();}});
   if(!auth.currentUser)auth.signInAnonymously().catch(function(e){if(!done){done=true;bad(e);}});
  });
 }).catch(function(e){V31.boot=null;throw e;});
 return V31.boot;
};
V31.FV=function(){return window.firebase.firestore.FieldValue;};
V31.err=function(e){
 var m=String(e&&(e.code||e.message)||e);
 if(/config/.test(m))return 'O jogo online ainda não foi ligado.';
 if(/rede|network|unavailable|offline/i.test(m))return 'Sem conexão com a internet. Confira e tente de novo.';
 if(/permission/i.test(m))return 'Esta sala não aceita você (já tem dois jogadores ou foi encerrada).';
 if(/admin-restricted|operation-not-allowed/i.test(m))return 'O login anônimo do Firebase ainda não foi ativado.';
 return 'Não deu certo agora ('+m+'). Tente de novo.';
};

/* ---------- posição a partir dos lances ---------- */
V31.pos=function(moves){var p=Engine.posFromFEN(V31.START);(moves||[]).forEach(function(u){Engine.makeMove(p,Engine.uciToMove(p,u));p.stack=[];});return p;};
V31.keys=function(moves){var p=Engine.posFromFEN(V31.START),k=[Engine.posKey(p)];(moves||[]).forEach(function(u){Engine.makeMove(p,Engine.uciToMove(p,u));p.stack=[];k.push(Engine.posKey(p));});return k;};
V31.sans=function(moves){var q=Engine.posFromFEN(V31.START),out=[];(moves||[]).forEach(function(u){var m=Engine.uciToMove(q,u);out.push(Engine.moveToSAN(q,m));Engine.makeMove(q,m);q.stack=[];});return out;};
V31.turn=function(r){return (r.moves||[]).length%2===0?'w':'b';};
V31.other=function(c){return c==='w'?'b':'w';};
V31.colName=function(c){return c==='w'?'Brancas':'Pretas';};
V31.tcTxt=function(tc){return tc?(tc[1]?tc[0]+'+'+tc[1]:tc[0]+' min'):'sem relógio';};
V31.clk=function(ms){if(ms==null)return '';ms=Math.max(0,ms);var s=Math.ceil(ms/1000),m=Math.floor(s/60);s=s%60;return m+':'+(s<10?'0':'')+s;};
V31.newCode=function(){var A='ABCDEFGHJKMNPQRSTUVWXYZ23456789',s='';var r=new Uint32Array(6);(window.crypto||window.msCrypto).getRandomValues(r);for(var i=0;i<6;i++)s+=A.charAt(r[i]%A.length);return s;};

/* ---------- lista local das minhas partidas ao vivo ---------- */
V31.mine=function(){var l=Profile.d.v31list;if(!l)l=Profile.d.v31list=[];return l;};
V31.remember=function(code,o){var l=V31.mine(),x=l.filter(function(y){return y.c===code;})[0];if(!x){x={c:code};l.unshift(x);}for(var k in o)x[k]=o[k];x.t=Date.now();Profile.d.v31list=l.slice(0,12);Profile.save();};

/* ---------- criar, entrar, ouvir ---------- */
V31.create=function(opts){
 return V31.init().then(function(){
  var tc=opts.tc||null,col=opts.color==='r'?(Math.random()<0.5?'w':'b'):opts.color,code=V31.newCode(),ref=V31.db.collection('salas').doc(code);
  var data={v:1,host:V31.uid,guest:null,hostName:V31.name()||'Jogador',hostElo:V31.elo(),guestName:'',guestElo:0,hostColor:col,
   tc:tc?{m:tc[0],i:tc[1]}:null,status:'wait',moves:[],clocks:tc?{w:tc[0]*60000,b:tc[0]*60000}:null,draw:null,rematch:null,next:null,
   winner:null,how:null,seen:{},created:V31.FV().serverTimestamp(),
   expira:window.firebase.firestore.Timestamp.fromMillis(Date.now()+3*86400000)};
  if(opts.prev)data.prev=opts.prev;
  return ref.set(data).then(function(){V31.remember(code,{me:col,opp:'',tc:tc,st:'wait'});return code;});
 });
};
V31.join=function(code){
 return V31.init().then(function(){
  var ref=V31.db.collection('salas').doc(code);
  return V31.db.runTransaction(function(t){return t.get(ref).then(function(s){
   if(!s.exists)throw new Error('naoexiste');
   var r=s.data();
   if(r.host===V31.uid||r.guest===V31.uid)return r;
   if(r.status!=='wait'||r.guest)throw new Error('cheia');
   t.update(ref,{guest:V31.uid,guestName:V31.name()||'Convidado',guestElo:V31.elo(),status:'play'});
   return r;
  });});
 });
};
V31.open=function(code){
 if(V31.unsub){try{V31.unsub();}catch(e){}V31.unsub=null;}
 V31.code=code;V31.room=null;V31.view=null;V31.turnLen=-1;V31.flip=null;V31.busy=false;V31.heard=Date.now();V31.seenOpp=null;
 V31.ref=V31.db.collection('salas').doc(code);
 V31.unsub=V31.ref.onSnapshot(function(s){if(!s.exists){V31.gone('Esta sala não existe mais.');return;}V31.onSnap(s.data());},function(e){V31.gone(V31.err(e));});
 V31.startTimers();
};
V31.close=function(){
 if(V31.unsub){try{V31.unsub();}catch(e){}V31.unsub=null;}
 clearInterval(V31.tick);clearInterval(V31.beat);V31.tick=V31.beat=null;V31.room=null;V31.code=null;V31.view=null;
};
V31.leave=function(){V31.close();try{V30.fsExit();}catch(e){}App.menu();};
V31.gone=function(msg){V31.close();UiJs.page('Jogar online',App.menu);UiJs.p(msg,'warn');UiJs.btns([['Voltar',V31.home,'pri']]);};

V31.onSnap=function(r){
 var prev=V31.room;V31.room=r;
 V31.me=r.host===V31.uid?r.hostColor:(r.guest===V31.uid?V31.other(r.hostColor):null);
 var n=(r.moves||[]).length;
 if(n!==V31.turnLen){V31.turnLen=n;V31.turnStart=Date.now();
  if(prev&&n>(prev.moves||[]).length&&V31.turn(r)===V31.me){V31.moveFx(r);}}
 var opp=V31.other(V31.me||'w'),sv=r.seen&&r.seen[opp];sv=sv&&sv.toMillis?sv.toMillis():(sv||null);
 if(sv!==V31.seenOpp){V31.seenOpp=sv;V31.heard=Date.now();}
 if(r.next&&r.next!==V31.code&&r.rematch===V31.me){V31.goRematch(r.next);return;}
 V31.remember(V31.code,{me:V31.me,opp:V31.oppName(r),tc:r.tc?[r.tc.m,r.tc.i]:null,st:r.status});
 if(r.status==='over')V31.finalize(r);
 V31.render();
};
V31.moveFx=function(r){
 try{var p=V31.pos(r.moves);UiJs.sfx(Engine.inCheck(p)?'chk':'mv');}catch(e){}
 try{if(navigator.vibrate)navigator.vibrate(40);}catch(e){}
};
V31.goRematch=function(code){V31.join(code).then(function(){V31.open(code);},function(e){UiJs.toast(V31.err(e));});};
V31.oppName=function(r){if(!r)return 'Seu amigo';var n=V31.me===r.hostColor?r.guestName:r.hostName;return n||'Seu amigo';};
V31.oppElo=function(r){return V31.me===r.hostColor?r.guestElo:r.hostElo;};

/* ---------- relógio e presença ---------- */
V31.left=function(r,c){
 if(!r||!r.clocks)return null;var ms=r.clocks[c];
 if(r.status==='play'&&(r.moves||[]).length>=2&&V31.turn(r)===c)ms-=Date.now()-V31.turnStart;
 return ms;
};
V31.startTimers=function(){
 clearInterval(V31.tick);clearInterval(V31.beat);
 V31.tick=setInterval(function(){
  var r=V31.room;if(!r||r.status!=='play')return;
  if(r.clocks){V31.bars();
   var t=V31.turn(r),ms=V31.left(r,t);
   if(ms!=null&&(r.moves||[]).length>=2){
    if(t===V31.me&&ms<=0)V31.timeout(V31.me);
    else if(t!==V31.me&&ms<=-4000)V31.timeout(t);
   }}
  V31.presence();
 },250);
 V31.beat=setInterval(function(){var r=V31.room;if(!r||!V31.me||r.status==='over'||document.hidden)return;var u={};u['seen.'+V31.me]=V31.FV().serverTimestamp();V31.ref.update(u).catch(function(){});},20000);
 setTimeout(function(){var r=V31.room;if(r&&V31.me&&r.status!=='over'){var u={};u['seen.'+V31.me]=V31.FV().serverTimestamp();V31.ref.update(u).catch(function(){});}},800);
};
V31.timeout=function(c){
 if(V31.busy)return;V31.busy=true;var len=(V31.room.moves||[]).length;
 V31.db.runTransaction(function(t){return t.get(V31.ref).then(function(s){var r=s.data();if(r.status!=='play'||(r.moves||[]).length!==len)return;
  var cl=Object.assign({},r.clocks);cl[c]=0;t.update(V31.ref,{status:'over',winner:V31.other(c),how:'tempo esgotado',clocks:cl});});})
 .catch(function(){}).then(function(){V31.busy=false;});
};
V31.presence=function(){
 var el=document.querySelector('.v31-net');if(!el)return;var r=V31.room;
 if(!r||r.status!=='play'){el.textContent='';return;}
 var off=Date.now()-V31.heard>65000;
 el.className='v31-net'+(off?' off':'');el.textContent=off?V31.oppName(r)+' parece desconectado. A partida continua quando ele voltar.':'';
};

/* ---------- lances e ações ---------- */
V31.status=function(r){
 if(r.status==='over')return {winner:r.winner,how:r.how||''};
 var p=V31.pos(r.moves),st=Engine.gameStatus(p,V31.keys(r.moves));
 if(!st.over)return null;
 return {winner:st.winner===0?'d':(st.winner===1?'w':'b'),how:App.howText(st.result)};
};
V31.onMove=function(u4){
 var r=V31.room;if(!r||V31.busy||r.status!=='play'||V31.turn(r)!==V31.me)return;
 var p=V31.pos(r.moves);
 App.pickPromo(App.legalUcis(p),u4,function(uci){
  var len=(r.moves||[]).length,moves=(r.moves||[]).concat([uci]),upd={moves:moves,draw:null};
  if(r.clocks){var cl=Object.assign({},r.clocks);if(len>=2){cl[V31.me]=Math.max(0,cl[V31.me]-(Date.now()-V31.turnStart))+(r.tc&&r.tc.i?r.tc.i*1000:0);}upd.clocks=cl;}
  var q=V31.pos(moves),st=Engine.gameStatus(q,V31.keys(moves));
  if(st.over){upd.status='over';upd.winner=st.winner===0?'d':(st.winner===1?'w':'b');upd.how=App.howText(st.result);}
  /* mostra o lance na hora; o servidor confirma em seguida */
  V31.busy=true;var opt=Object.assign({},r,upd);V31.room=opt;V31.turnLen=moves.length;V31.turnStart=Date.now();V31.render();
  try{UiJs.sfx(Engine.inCheck(q)?'chk':'mv');}catch(e){}
  V31.db.runTransaction(function(t){return t.get(V31.ref).then(function(s){var x=s.data();if(x.status!=='play'||(x.moves||[]).length!==len)throw new Error('fora de hora');t.update(V31.ref,upd);});})
  .catch(function(e){UiJs.toast(/fora de hora/.test(String(e&&e.message))?'A partida mudou antes do seu lance chegar.':V31.err(e));V31.room=r;V31.turnLen=-1;V31.render();})
  .then(function(){V31.busy=false;});
 });
};
V31.upd=function(o){return V31.ref.update(o).catch(function(e){UiJs.toast(V31.err(e));});};
V31.resign=function(){UiJs.modal('Abandonar a partida?','Conta como derrota.',[['Abandonar',function(){V31.upd({status:'over',winner:V31.other(V31.me),how:V31.colName(V31.me)+' abandonaram'});},'warn'],['Continuar',null,'pri']]);};
V31.rematchAsk=function(){V31.upd({rematch:V31.me});};
V31.rematchAccept=function(){
 var r=V31.room,mine=V31.me;
 V31.create({tc:r.tc?[r.tc.m,r.tc.i]:null,color:V31.other(mine),prev:V31.code}).then(function(code){
  return V31.ref.update({next:code}).then(function(){V31.open(code);});
 }).catch(function(e){UiJs.toast(V31.err(e));});
};

/* ---------- resultado no perfil (uma vez por sala) ---------- */
V31.finalize=function(r){
 var d=Profile.d;if(!d.v31done)d.v31done={};if(d.v31done[V31.code]||!V31.me)return;
 var st=V31.status(r);if(!st)return;
 d.v31done[V31.code]=1;
 var sc=st.winner==='d'?0.5:(st.winner===V31.me?1:0),n=(r.moves||[]).length,oe=V31.oppElo(r)||1200,rc=null;
 if(n>=6){try{rc=Profile.recordRated('online',oe,sc);}catch(e){}}
 try{Profile.addHistory({t:Date.now(),col:V31.me==='w'?1:-1,res:sc,opp:V31.oppName(r)+(V31.oppElo(r)?' ('+V31.oppElo(r)+')':''),oppElo:oe,cat:'online',tc:r.tc?V31.tcTxt([r.tc.m,r.tc.i]):'',
  ucis:(r.moves||[]).slice(),how:st.how,rc:rc,rated:rc!=null,human:true,live:true});}catch(e){}
 V31.lastRc=rc;
 try{Profile.touch();}catch(e){}Profile.save();
};

/* ---------- telas ---------- */
V31.render=function(){var r=V31.room;if(!r)return;if(r.status==='wait'&&V31.me===r.hostColor)V31.waitPage();else if(r.status==='cancel')V31.gone('O convite foi cancelado.');else V31.gamePage();};
V31.bars=function(){
 var r=V31.room;if(!r||!V31.me)return;var b=UiJs.board;if(!b)return;
 var opp=V31.other(V31.me),t=V31.turn(r),play=r.status==='play';
 var oc=r.clocks?' · '+V31.clk(V31.left(r,opp)):'',mc=r.clocks?' · '+V31.clk(V31.left(r,V31.me)):'';
 var top=V31.oppName(r)+(V31.oppElo(r)?' ('+V31.oppElo(r)+')':'')+oc,bot=(V31.name()||'Você')+' (você)'+mc;
 var flipped=b.flip!==(V31.me==='b');
 if(flipped)UiJs.bars(bot,top,play&&t===V31.me,play&&t===opp);else UiJs.bars(top,bot,play&&t===opp,play&&t===V31.me);
};
V31.gamePage=function(){
 var r=V31.room,me=V31.me;if(!me){V31.gone('Esta partida já tem dois jogadores.');return;}
 if(V31.view!=='game'){V31.view='game';UiJs.boardPage('Ao vivo · '+V31.oppName(r),V31.leave);var sh=UiJs.root.querySelector('.shell');if(sh)sh.classList.add('v31-game');}
 var b=UiJs.board;if(!b)return;b.showLost=true;
 var p=V31.pos(r.moves),st=V31.status(r),mv=r.moves||[],myTurn=!st&&r.status==='play'&&V31.turn(r)===me&&!V31.busy;
 b.fen=Engine.toFEN(p);b.flip=V31.flip!=null?V31.flip:me==='b';b.last=mv.length?App.lastOf(mv[mv.length-1]):null;b.check=App.checkSq(p);
 b.arrows=[];b.marks=[];b.blind=false;b.onSquare=null;b.legal=myTurn?App.legalUcis(p):null;b.onMove=V31.onMove;b.clearSel();b.draw();
 V31.bars();
 UiJs.panel();var cur=UiJs.cur;
 if(st){
  var sc=st.winner==='d'?0.5:(st.winner===me?1:0);
  UiJs.p((sc>=1?'Vitória!':(sc<=0?'Derrota.':'Empate.'))+(st.how?' ('+st.how+')':''),'big '+(sc>=1?'good':(sc<=0?'bad':'gold')));
  if(r.rematch&&r.rematch!==me&&!r.next){UiJs.p(V31.oppName(r)+' quer revanche!','warn');UiJs.btns([['Aceitar revanche',V31.rematchAccept,'pri'],['Agora não',V31.leave]]);}
  else if(r.rematch===me&&!r.next)UiJs.p('Revanche pedida. Esperando '+V31.oppName(r)+' aceitar…','gold');
  else UiJs.btns([['Pedir revanche',V31.rematchAsk,'pri'],['Convidar outro amigo',function(){V31.close();V31.home();}],['Menu',V31.leave]]);
 }else{
  if(myTurn)UiJs.p(mv.length===0?'Sua vez: você começa de Brancas.':'Sua vez!','gold');
  else UiJs.p(V31.busy?'Enviando seu lance…':'Vez de '+V31.oppName(r)+'.','');
  if(myTurn&&Engine.inCheck(p))UiJs.p('Você está em xeque.','warn');
  if(r.draw&&r.draw!==me){UiJs.p(V31.oppName(r)+' ofereceu empate.','warn');UiJs.btns([['Aceitar empate',function(){V31.upd({status:'over',winner:'d',how:'empate combinado',draw:null});},'pri'],['Recusar',function(){V31.upd({draw:null});}]]);}
  else if(r.draw===me)UiJs.p('Empate oferecido. Esperando a resposta…','muted small');
  var bs=[];
  if(mv.length>=2&&!r.draw)bs.push(['Oferecer empate',function(){V31.upd({draw:me});}]);
  bs.push(['Virar',function(){V31.flip=!(V31.flip!=null?V31.flip:me==='b');V31.gamePage();}]);
  bs.push(['Abandonar',V31.resign,'warn']);
  UiJs.btns(bs);
  if(mv.length<2&&r.clocks)UiJs.p('O relógio começa depois do primeiro lance de cada um.','muted small');
 }
 var net=document.createElement('div');net.className='v31-net';cur.appendChild(net);V31.presence();
 var ml=App.movesText(V31.sans(mv));if(ml)UiJs.p(ml,'muted small');
 try{var op=Book.detect(mv);if(op)UiJs.p('Abertura: '+op[1]+' ('+op[0]+')','muted small');}catch(e){}
 UiJs.p('Ritmo: '+V31.tcTxt(r.tc?[r.tc.m,r.tc.i]:null)+' · sala '+V31.code+' · jogo justo: dicas e treinador desligados.','muted small');
};
V31.msg=function(r,code){var tc=r&&r.tc?' ('+V31.tcTxt([r.tc.m,r.tc.i])+')':'';return '♟️ '+(V31.name()||'Um amigo')+' te desafiou para uma partida de xadrez ao vivo'+tc+'! Toque para entrar, não precisa instalar nada: '+V31.link(code);};
V31.waitPage=function(){
 var r=V31.room,code=V31.code;if(V31.view==='wait')return;V31.view='wait';
 UiJs.page('Convide um amigo',function(){V31.cancel();});
 var cur=UiJs.cur,box=UiJs.el('div','v31-wait',cur);
 UiJs.el('div','v31-code',box,code);
 UiJs.el('div','v31-wt',box,'Você joga de '+V31.colName(V31.me)+' · '+V31.tcTxt(r.tc?[r.tc.m,r.tc.i]:null));
 var wa=document.createElement('a');wa.className='btn pri wide v31-wa';wa.href='https://wa.me/?text='+encodeURIComponent(V31.msg(r,code));wa.target='_blank';wa.rel='noopener';
 wa.innerHTML='<span class="v31-wai">'+V31.WA+'</span>Enviar convite pelo WhatsApp';box.appendChild(wa);
 UiJs.btns([['Copiar link',function(){V31.copy(V31.link(code));}],navigator.share?['Outro app',function(){navigator.share({title:'Xadrez ao vivo',text:V31.msg(r,code)}).catch(function(){});}]:null]);
 var w=UiJs.el('div','v31-waiting',cur);w.innerHTML='<i></i><span>Esperando seu amigo entrar… Assim que ele tocar no link, a partida começa aqui.</span>';
 UiJs.p('Deixe esta tela aberta. O convite vale por 3 dias e só uma pessoa pode entrar.','muted small');
 UiJs.btns([['Cancelar convite',V31.cancel]]);
};
V31.cancel=function(){var r=V31.room;if(r&&r.status==='wait'&&V31.me===r.hostColor)V31.ref.update({status:'cancel'}).catch(function(){});V31.close();V31.home();};
V31.copy=function(t){var done=function(){UiJs.toast('Link copiado.');};try{navigator.clipboard.writeText(t).then(done,function(){prompt('Copie o link:',t);});}catch(e){prompt('Copie o link:',t);}};

V31.home=function(){
 V31.close();
 UiJs.page('Jogar online',App.menu);
 var hero=UiJs.el('div','v31-hero',UiJs.cur);
 hero.innerHTML='<span class="v31-heroi">'+V31.WA+'</span><div><b>Xadrez ao vivo com um amigo</b><span>Você cria a partida e manda o link. Ele toca e já entra no tabuleiro, sem instalar e sem cadastro.</span></div>';
 if(!V31.ready()){
  UiJs.p('O jogo ao vivo está quase pronto e vai ser liberado em breve.','gold');
  UiJs.p('Enquanto isso, dá para jogar com um amigo por mensagens: cada lance vai pelo WhatsApp e ele responde quando puder.','');
  UiJs.btns([['Jogar por mensagens',Online.home,'pri wide']]);
  if(V31.owner())UiJs.p('Para o criador: falta colar o firebaseConfig em web/extras_v31.js (V31.FB) e publicar as regras de firebase/firestore.rules.','muted small');
  return;
 }
 UiJs.field('Seu nome','string'===typeof Profile.d.name?Profile.d.name:'','Como seu amigo vai ver você','text',function(v){Profile.d.name=String(v).trim();Profile.save();});
 UiJs.seg('Ritmo',V31.TCS.map(function(t,i){return [t[0],function(){V31.tc=i;V31.home();},V31.tc===i];}),3);
 UiJs.seg('Você joga de',[['Brancas',function(){V31.color='w';V31.home();},V31.color==='w'],['Pretas',function(){V31.color='b';V31.home();},V31.color==='b'],['Sorteio',function(){V31.color='r';V31.home();},V31.color==='r']],3);
 var go=document.createElement('button');go.type='button';go.className='btn pri wide v31-wa';go.innerHTML='<span class="v31-wai">'+V31.WA+'</span>Criar partida e convidar';
 go.onclick=function(){if(go.disabled)return;go.disabled=true;go.lastChild.textContent='Criando…';
  try{V30.fs();}catch(e){}
  V31.create({tc:V31.TCS[V31.tc][1],color:V31.color}).then(function(code){V31.open(code);},function(e){go.disabled=false;go.lastChild.textContent='Criar partida e convidar';UiJs.toast(V31.err(e));});};
 UiJs.cur.appendChild(go);
 var open=V31.mine().filter(function(x){return x.st==='play'||x.st==='wait';}).slice(0,4);
 if(open.length){UiJs.h('Suas partidas abertas');UiJs.items(open.map(function(x){return {t:(x.st==='wait'?'Convite '+x.c:'Contra '+(x.opp||'seu amigo')),d:(x.me?'você de '+V31.colName(x.me)+' · ':'')+V31.tcTxt(x.tc),r:'abrir ›',f:function(){V31.resume(x.c);}};}));}
 UiJs.h('Recebeu um código?');
 var code='';UiJs.field('Código da sala',code,'Ex.: K7P2QX','text',function(v){code=String(v).toUpperCase().replace(/[^A-Z0-9]/g,'');});
 UiJs.btns([['Entrar',function(){if(code.length===6)V31.invite(code);else UiJs.toast('O código tem 6 letras e números.');}]]);
 UiJs.p('Jogo justo: durante a partida as dicas e o treinador ficam desligados. O resultado entra no seu histórico e você pode revisar a partida depois.','muted small');
 UiJs.btns([['Prefere jogar por mensagens?',Online.home]]);
};
V31.resume=function(code){
 UiJs.page('Jogar online',V31.home);UiJs.p('Abrindo a partida…','muted');
 V31.init().then(function(){return V31.db.collection('salas').doc(code).get();}).then(function(s){
  if(!s.exists){V31.gone('Esta sala não existe mais.');return;}
  var r=s.data();if(r.host!==V31.uid&&r.guest!==V31.uid){V31.invite(code);return;}
  V31.open(code);
 },function(e){V31.gone(V31.err(e));});
};

/* ---------- quem recebeu o link ---------- */
V31.invite=function(code){
 code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
 UiJs.page('Convite para jogar',App.menu);var cur=UiJs.cur;
 if(!V31.ready()){UiJs.p('O jogo ao vivo ainda não foi liberado. Abra o jogo e treine enquanto isso!','gold');UiJs.btns([['Abrir o jogo',App.menu,'pri']]);return;}
 UiJs.p('Abrindo o convite…','muted');
 V31.init().then(function(){return V31.db.collection('salas').doc(code).get();}).then(function(s){
  UiJs.page('Convite para jogar',App.menu);
  if(!s.exists){UiJs.p('Este convite não existe ou já expirou.','warn');UiJs.btns([['Abrir o jogo',App.menu,'pri']]);return;}
  var r=s.data();
  if(r.host===V31.uid||r.guest===V31.uid){V31.open(code);return;}
  if(r.status==='cancel'){UiJs.p('Este convite foi cancelado.','warn');UiJs.btns([['Abrir o jogo',App.menu,'pri']]);return;}
  if(r.status!=='wait'||r.guest){UiJs.p('Esta partida já começou com outra pessoa.','warn');UiJs.btns([['Abrir o jogo',App.menu,'pri']]);return;}
  var hero=UiJs.el('div','v31-hero',UiJs.cur);
  hero.innerHTML='<span class="v31-heroi">♟</span><div><b>'+V31.esc(r.hostName||'Seu amigo')+' te desafiou!</b><span>Partida ao vivo · '+V31.tcTxt(r.tc?[r.tc.m,r.tc.i]:null)+' · você joga de '+V31.colName(V31.other(r.hostColor))+(r.hostElo?' · Elo dele: '+r.hostElo:'')+'</span></div>';
  UiJs.field('Seu nome',Profile.d.name||'','Como ele vai ver você','text',function(v){Profile.d.name=String(v).trim();Profile.save();});
  var go=document.createElement('button');go.type='button';go.className='btn pri wide';go.textContent='Entrar na partida';
  go.onclick=function(){if(go.disabled)return;go.disabled=true;go.textContent='Entrando…';try{V30.fs();}catch(e){}try{UiJs.sfx('mv');}catch(e){}
   V31.join(code).then(function(){V31.open(code);},function(e){go.disabled=false;go.textContent='Entrar na partida';UiJs.toast(/cheia/.test(String(e&&e.message))?'Esta partida já começou com outra pessoa.':/naoexiste/.test(String(e&&e.message))?'Este convite expirou.':V31.err(e));});};
  UiJs.cur.appendChild(go);
  UiJs.p('Não precisa instalar nada nem criar conta. Depois da partida, conheça o resto do jogo: treinador que explica cada lance, nivelamento e problemas.','muted small');
 },function(e){UiJs.page('Convite para jogar',App.menu);UiJs.p(V31.err(e),'warn');UiJs.btns([['Tentar de novo',function(){V31.invite(code);},'pri'],['Abrir o jogo',App.menu]]);});
};
V31.urlCode=function(){var m=(location.search+location.hash).match(/[?&#]sala=([A-Za-z0-9]{4,8})/);return m?m[1].toUpperCase():null;};
(function(){
 if(typeof Online==='undefined')return;
 var oFU=Online.fromUrl;
 Online.fromUrl=function(){
  var c=V31.urlCode();
  if(c){try{history.replaceState(null,'',location.pathname);}catch(e){}setTimeout(function(){V31.invite(c);},30);try{V27&&V27.ev&&V27.ev('convite-aberto');}catch(e){}return true;}
  return oFU.apply(this,arguments);
 };
})();

/* ---------- menu: "Jogar online · Convide um amigo" no lugar de "Meu DNA Enxadrista" ---------- */
V31.WA='<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#25D366" d="M16 3C8.8 3 3 8.7 3 15.7c0 2.5.7 4.8 2 6.8L3.4 29l6.7-1.7c1.8 1 3.8 1.5 5.9 1.5 7.2 0 13-5.7 13-12.7S23.2 3 16 3z"/><path fill="#fff" d="M22.6 18.9c-.4-.2-2.2-1.1-2.5-1.2-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.6.1-.2.1-.5 0-.7l-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.8c.2.2 2.6 4 6.3 5.6 3.1 1.2 3.7 1 4.4.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.1-.4-.2-.8-.4z"/></svg>';
(function(){
 if(typeof UiJs==='undefined')return;
 var oMenu=UiJs.menu;
 UiJs.menu=function(items){
  if(items&&items.length)for(var i=0;i<items.length;i++)if(items[i]&&items[i].t==='Meu DNA Enxadrista'){var o=items[i];items[i]={t:'Jogar online',d:'Convide um amigo',f:V31.home,ico:'whats',lone:o.lone,hl:o.hl};}
  var r=oMenu.apply(this,arguments);
  try{[].forEach.call(UiJs.root.querySelectorAll('.menu .mitem'),function(b){var t=b.querySelector('.mtx');if(t&&t.textContent.indexOf('Jogar online')===0)b.classList.add('v31-mi');});}catch(e){}
  return r;
 };
})();
