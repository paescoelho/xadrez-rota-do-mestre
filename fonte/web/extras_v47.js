/* ======================= v87 — Lichess ao vivo no botão e Problema do Dia =======================
 * - Botão "Jogar no Lichess.org": jogadores conectados e partidas em andamento, como na página inicial do Lichess.
 *   O Lichess não libera esses números para outros sites; o Worker do jogo (rota-turn) lê a página de lá a cada 60 s.
 * - Tela do Lichess: o Problema do Dia (API pública /api/puzzle/daily) num tabuleiro logo abaixo, sem mudar de tela.
 *   Vale qualquer lance que dê mate no último passo, como no Lichess.
 */
var V87={API:'https://rota-turn.paescoelho.workers.dev/lichess',CK:'rdm-li-cnt',PK:'rdm-li-daily',SK:'rdm-li-solved',
 cnt:null,cntAt:0,cntP:null,pz:null,st:null,pzP:null};
(function(){
 if(typeof window==='undefined'||typeof document==='undefined')return;

 /* ---------- contadores no botão ---------- */
 V87.fmt=function(n){try{return Number(n).toLocaleString('pt-BR');}catch(e){return String(n);}};
 V87.load=function(){try{var c=JSON.parse(localStorage.getItem(V87.CK)||'null');if(c&&c.players)V87.cnt=c;}catch(e){}};
 V87.cntHtml=function(){
  if(!V87.cnt)V87.load();var c=V87.cnt;
  return '<div class="v87-cnt'+(c?'':' v87-wait')+'"><div><s class="g"></s><span><b>'+(c?V87.fmt(c.players):'…')+'</b> jogadores</span></div><div><s class="y"></s><span><b>'+(c?V87.fmt(c.games):'…')+'</b> partidas em andamento</span></div></div>';
 };
 V87.paint=function(){
  var c=V87.cnt;if(!c)return;
  [].forEach.call(document.querySelectorAll('.v35-xb.li .v87-cnt'),function(e){e.outerHTML=V87.cntHtml();});
 };
 V87.counters=function(){
  V87.paint();
  /* enquanto a tela "Jogar online" estiver aberta, reagenda sempre - mesmo quando
     esta chamada não busca dados novos (evita o ciclo travar e o número ficar parado) */
  clearTimeout(V87.cntT);V87.cntT=setTimeout(function(){if(document.querySelector('.v35-home .v35-xb.li'))V87.counters();},18000);
  if(Date.now()-V87.cntAt<18000||V87.cntP)return;
  V87.cntP=fetch(V87.API,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){
   if(j&&j.players>0){V87.cnt={players:j.players,games:j.games};V87.cntAt=Date.now();try{localStorage.setItem(V87.CK,JSON.stringify(V87.cnt));}catch(e){}V87.paint();}
  }).catch(function(){if(!V87.cnt)[].forEach.call(document.querySelectorAll('.v35-xb.li .v87-cnt.v87-wait'),function(e){e.remove();});}).then(function(){V87.cntP=null;});
 };

 /* ---------- Problema do Dia ---------- */
 V87.today=function(){var d=new Date();return d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate();};
 V87.parse=function(j){
  var pz=j.puzzle||{},g=j.game||{},fen=pz.fen,last=pz.lastMove||null;
  if(!fen){/* API antiga: reconstrói a posição pelo PGN até o lance inicial do problema */
   var p=Engine.posFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
   var toks=String(g.pgn||'').split(/\s+/).filter(function(t){return t&&!/^\d+\.+$/.test(t)&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t);});
   var n=Math.min(toks.length,(pz.initialPly|0)+1);
   for(var i=0;i<n;i++){var mv=V26.matchSan(p,toks[i].replace(/^\d+\.+/,''));if(mv<0)return null;last=Engine.moveToUCI(mv);Engine.makeMove(p,mv);p.stack=[];}
   fen=Engine.toFEN(p);
  }
  if(!pz.id||!fen||!pz.solution||!pz.solution.length)return null;
  var pl=(g.players||[]).map(function(x){return (x.name||'?')+(x.rating?' ('+x.rating+')':'');});
  return {id:pz.id,fen:fen,last:last,sol:pz.solution.map(function(u){return String(u).toLowerCase();}),rating:pz.rating,themes:pz.themes||[],plays:pz.plays,game:g.id,players:pl,day:V87.today()};
 };
 V87.daily=function(){
  if(V87.pz&&V87.pz.day===V87.today())return Promise.resolve(V87.pz);
  try{var c=JSON.parse(localStorage.getItem(V87.PK)||'null');if(c&&c.day===V87.today()&&c.sol){V87.pz=c;return Promise.resolve(c);}}catch(e){}
  if(V87.pzP)return V87.pzP;
  V87.pzP=fetch(V83.host()+'/api/puzzle/daily',{headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json();}).then(function(j){
   var z=V87.parse(j);if(!z)throw new Error('formato');V87.pz=z;V87.st=null;try{localStorage.setItem(V87.PK,JSON.stringify(z));}catch(e){}return z;
  });
  V87.pzP.then(function(){V87.pzP=null;},function(){V87.pzP=null;});
  return V87.pzP;
 };
 V87.solved=function(id){try{return (JSON.parse(localStorage.getItem(V87.SK)||'{}'))[id]||null;}catch(e){return null;}};
 V87.markSolved=function(id,how){try{var o=JSON.parse(localStorage.getItem(V87.SK)||'{}');o[id]=how;var k=Object.keys(o);if(k.length>40)delete o[k[0]];localStorage.setItem(V87.SK,JSON.stringify(o));}catch(e){}};
 V87.pos=function(){var z=V87.pz,s=V87.st,p=Engine.posFromFEN(z.fen);s.moves.forEach(function(u){Engine.makeMove(p,Engine.uciToMove(p,u));p.stack=[];});return p;};
 V87.reset=function(){var z=V87.pz;V87.st={i:0,moves:[],done:false,shown:false,busy:false,msg:'',fail:0,hint:false,me:z.fen.split(' ')[1]};};
 V87.TH={mateIn1:'mate em 1',mateIn2:'mate em 2',mateIn3:'mate em 3',mateIn4:'mate em 4',mateIn5:'mate em 5',mate:'mate',fork:'garfo',pin:'cravada',skewer:'espeto',sacrifice:'sacrifício',
  attraction:'atração',deflection:'desvio',discoveredAttack:'ataque descoberto',doubleCheck:'xeque duplo',hangingPiece:'peça solta',trappedPiece:'peça presa',endgame:'final',middlegame:'meio-jogo',
  opening:'abertura',crushing:'vantagem decisiva',advantage:'vantagem',equality:'igualdade',promotion:'promoção',quietMove:'lance calmo',defensiveMove:'lance defensivo',zugzwang:'zugzwang',
  backRankMate:'mate no corredor',smotheredMate:'mate abafado',xRayAttack:'raio X',interference:'interferência',clearance:'liberação',capturingDefender:'captura do defensor',
  intermezzo:'lance intermediário',exposedKing:'rei exposto',kingsideAttack:'ataque na ala do rei',queensideAttack:'ataque na ala da dama',rookEndgame:'final de torres',pawnEndgame:'final de peões',
  queenEndgame:'final de damas',bishopEndgame:'final de bispos',knightEndgame:'final de cavalos',advancedPawn:'peão avançado',attackingF2F7:'ataque em f2/f7',enPassant:'en passant',castling:'roque',
  underPromotion:'subpromoção',short:'curto',long:'longo',veryLong:'muito longo',oneMove:'um lance',master:'partida de mestre',masterVsMaster:'mestre x mestre',superGM:'super GM'};
 V87.thTxt=function(z){return z.themes.filter(function(t){return !/^(short|long|veryLong|oneMove)$/.test(t);}).slice(0,3).map(function(t){return V87.TH[t]||t;}).join(' · ');};

 V87.mount=function(cur){
  var w=UiJs.el('div','v87-pz',cur);
  w.innerHTML='<div class="v87-ph"><b>♞ Problema do Dia</b><span>do Lichess</span></div><div class="v87-pb"><div class="v87-load">Carregando o problema de hoje…</div></div>';
  V87.daily().then(function(z){if(!w.isConnected)return;if(!V87.st||V87.st.id!==z.id){V87.reset();V87.st.id=z.id;}V87.draw(w);},
   function(){if(!w.isConnected)return;w.querySelector('.v87-pb').innerHTML='<div class="v87-load">Não deu para buscar o problema agora. Confira a internet e abra esta tela de novo.</div>';});
 };
 V87.draw=function(w){
  w=w||document.querySelector('.v87-pz');if(!w||!w.isConnected)return;
  var z=V87.pz,s=V87.st,p=V87.pos(),solved=V87.solved(z.id);
  var hd=w.querySelector('.v87-ph');
  hd.innerHTML='<b>♞ Problema do Dia</b><span>Lichess · rating '+(z.rating||'?')+(solved&&!s.done?' · ✓ já resolvido':'')+'</span>';
  var pb=w.querySelector('.v87-pb');
  if(!w.__bd){pb.innerHTML='';var bw=UiJs.el('div','v87-bw',pb);var bd=UiJs.el('div','board',bw);w.__bd=new BoardJ(bd);
   UiJs.el('div','v87-msg',pb);UiJs.el('div','v87-act',pb);UiJs.el('div','v87-inf',pb);}
  var b=w.__bd;
  b.fen=Engine.toFEN(p);b.flip=s.me==='b';
  var lu=s.moves.length?s.moves[s.moves.length-1]:z.last;b.last=lu?App.lastOf(lu):null;b.check=App.checkSq(p);
  b.arrows=[];b.marks=[];b.sugg=-1;
  if(s.hint&&!s.done)b.sugg=Engine.nameSq(z.sol[s.i].substr(0,2));
  b.legal=s.done||s.busy?null:App.legalUcis(p);b.onMove=V87.move;b.clearSel();b.draw();
  var turnTxt=(s.me==='w'?'Brancas':'Pretas')+' jogam';
  var m=w.querySelector('.v87-msg');
  m.className='v87-msg'+(s.msg==='bad'?' bad':s.done?' win':s.msg==='good'?' good':'');
  m.textContent=s.done?(s.shown?'Esta era a solução. Volte amanhã para um novo problema!':'Resolvido! '+(s.fail?'Com '+s.fail+' erro'+(s.fail>1?'s':'')+' no caminho.':'De primeira!')+' Volte amanhã para um novo.')
   :s.msg==='bad'?'Não é esse lance. Tente outro.'
   :s.busy?'Isso! Agora o adversário responde…'
   :s.msg==='good'?'Muito bem! Continue: '+turnTxt.toLowerCase()+'.'
   :'Encontre o melhor lance: '+turnTxt.toLowerCase()+'.';
  var a=w.querySelector('.v87-act');a.innerHTML='';
  var mk=function(t,f,c){var x=UiJs.el('button','v87-b'+(c?' '+c:''),a,t);x.type='button';x.onclick=f;return x;};
  if(!s.done){mk('💡 Dica',function(){s.hint=true;V87.draw();});mk('Ver solução',V87.show);}
  if(s.moves.length||s.done)mk('↺ Recomeçar',function(){var id=s.id;V87.reset();V87.st.id=id;V87.draw();});
  var lk=UiJs.el('a','v87-b v87-lk',a,'Abrir no Lichess ↗');lk.href='https://lichess.org/training/'+encodeURIComponent(z.id);lk.target='_blank';lk.rel='noopener';
  var th=V87.thTxt(z);
  w.querySelector('.v87-inf').textContent=(th?th+' · ':'')+(z.players.length===2?z.players[0]+' x '+z.players[1]:'partida real do Lichess');
 };
 V87.snd=function(p,u){try{UiJs.sfx(Engine.inCheck(p)?'chk':'mv');}catch(e){}};
 V87.move=function(u4){
  var s=V87.st,z=V87.pz;if(!s||s.done||s.busy)return;
  var p=V87.pos();
  App.pickPromo(App.legalUcis(p),u4,function(uci){
   if(!V87.st||s.done||s.busy)return;
   var ok=uci===z.sol[s.i];
   if(!ok){/* no último passo, qualquer mate vale (regra do Lichess) */
    var q=V87.pos();Engine.makeMove(q,Engine.uciToMove(q,uci));q.stack=[];
    if(Engine.inCheck(q)&&Engine.legalMoves(q).length===0)ok=true;}
   if(!ok){s.fail++;s.msg='bad';try{UiJs.sfx('err');}catch(e){}V87.draw();return;}
   s.moves.push(uci);s.i++;s.hint=false;var q2=V87.pos();V87.snd(q2);
   if(s.i>=z.sol.length||(Engine.inCheck(q2)&&Engine.legalMoves(q2).length===0)){s.done=true;s.msg='';V87.markSolved(z.id,s.fail?'erros':'limpo');V87.draw();return;}
   s.msg='good';s.busy=true;V87.draw();
   setTimeout(function(){if(V87.st!==s)return;s.moves.push(z.sol[s.i]);s.i++;s.busy=false;V87.snd(V87.pos());V87.draw();},500);
  });
 };
 V87.show=function(){
  var s=V87.st,z=V87.pz;if(!s||s.done)return;
  s.busy=true;s.hint=false;s.shown=true;
  var step=function(){if(V87.st!==s)return;if(s.i>=z.sol.length){s.busy=false;s.done=true;V87.draw();return;}
   s.moves.push(z.sol[s.i]);s.i++;V87.snd(V87.pos());V87.draw();setTimeout(step,700);};
  V87.draw();setTimeout(step,300);
 };

 /* a tela do Lichess ganha o problema no fim (logado ou não) */
 if(typeof V83!=='undefined'){
  var oH=V83.home;
  V83.home=function(keep){
   var r=oH.apply(this,arguments);
   try{if(V83.onHome&&UiJs.cur&&UiJs.cur.classList.contains('v83'))V87.mount(UiJs.cur);}catch(e){}
   return r;
  };
 }
})();
