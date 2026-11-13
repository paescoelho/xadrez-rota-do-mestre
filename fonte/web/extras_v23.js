/* Rota do Mestre v23 (09.11.2026) — Stockfish 19 no jogo, relógio de estudo, treino de visão,
 * padrões de mate, conta Google (Firebase) e backup em arquivo.
 * Inserido pelo web/build.js no mesmo escopo das classes Haxe (App, UiJs, Drills, Pages, Profile, Engine...).
 * Só vale para a versão HTML5; o Flash continua com o motor próprio do jogo. */

/* ======================= Stockfish 19 (WASM, roda num Web Worker) ======================= */
/* o mesmo app.js roda dentro do Web Worker do motor do jogo: lá não há janela, então nada de interface */
var V23_UI=typeof window!=='undefined'&&typeof document!=='undefined';
var SF=(function(){
 var api={ready:false,failed:false,w:null,q:[],lq:[],cur:null,info:{},startT:0};
 api.ok=function(){return api.ready&&!api.failed&&api.w;};
 api.init=function(){
  if(api.w||api.failed)return;
  try{
   var js=document.getElementById('res_sfjs'),wb=document.getElementById('res_sfwasm'),wurl=window.XSFURL||null;
   if(!js||(!wb&&!wurl)||typeof Worker==='undefined'||typeof WebAssembly==='undefined'){api.failed=true;return;}
   /* o binário do motor vai embutido no próprio worker: o pedido "sfwasm" é atendido sem rede (funciona offline e em file://) */
   /* versão site (PWA): o binário vem por URL e fica no cache do app; versão arquivo único: vem embutido no HTML */
   var pre=wurl?'':'var __b=atob("'+wb.textContent.replace(/\s+/g,'')+'"),__u=new Uint8Array(__b.length);for(var __i=0;__i<__b.length;__i++)__u[__i]=__b.charCodeAt(__i);__b=null;'+
    'var __of=self.fetch;self.fetch=function(x){if(String(x).indexOf("sfwasm")>=0)return Promise.resolve(new Response(__u,{status:200,headers:{"Content-Type":"application/wasm"}}));return __of.apply(self,arguments);};\n';
   var url=URL.createObjectURL(new Blob([pre+js.textContent],{type:'text/javascript'}));
   var w=new Worker(url+'#'+(wurl?encodeURIComponent(wurl):'sfwasm'));
   api.w=w;api.startT=Date.now();
   w.onmessage=function(e){var line=typeof e.data==='string'?e.data:'';if(line)api.line(line);};
   w.onerror=function(){api.fail();};
   w.postMessage('uci');
   setTimeout(function(){if(!api.ready)api.fail();},25000);
  }catch(e){api.fail();}
 };
 api.fail=function(){api.failed=true;api.ready=false;try{if(api.w)api.w.terminate();}catch(e){}api.w=null;var q=api.q.concat(api.lq);api.q=[];api.lq=[];if(api.cur){q.unshift(api.cur);api.cur=null;}q.forEach(function(j){try{j.cb(null);}catch(e){}});};
 api.line=function(l){
  if(l==='uciok'){api.w.postMessage('setoption name Hash value 16');api.w.postMessage('setoption name UCI_ShowWDL value true');api.w.postMessage('isready');return;}
  if(l==='readyok'&&!api.ready){api.ready=true;api.pump();return;}
  var j=api.cur;if(!j)return;
  if(l.indexOf('info ')===0&&l.indexOf(' pv ')>0&&l.indexOf(' score ')>0){
   var t=l.split(' '),o={mp:1};
   for(var i=1;i<t.length;i++){
    if(t[i]==='depth')o.depth=+t[i+1];
    else if(t[i]==='multipv')o.mp=+t[i+1];
    else if(t[i]==='score'){if(t[i+1]==='cp')o.cp=+t[i+2];else if(t[i+1]==='mate')o.mate=+t[i+2];}
    else if(t[i]==='wdl'){o.wdl=[+t[i+1],+t[i+2],+t[i+3]];}
    else if(t[i]==='pv'){o.pv=t.slice(i+1);break;}
   }
   if(t.indexOf('lowerbound')>=0||t.indexOf('upperbound')>=0)return;
   j.lines[o.mp-1]=o;return;
  }
  if(l.indexOf('bestmove')===0){
   var bm=l.split(' ')[1];api.cur=null;
   try{j.cb({best:bm&&bm!=='(none)'?bm:null,lines:j.lines.filter(Boolean)});}catch(e){if(window.console)console.error(e);}
   api.pump();
  }
 };
 api.pump=function(){
  if(!api.ready||api.cur)return;
  /* fila normal (o que a pessoa pediu) antes da fila de fundo (Raio-X depois da partida) */
  var j=api.q.length?api.q.shift():(api.lq.length&&(!api.lowOk||api.lowOk())?api.lq.shift():null);
  if(!j)return;
  api.cur=j;j.lines=[];
  var w=api.w;
  w.postMessage('setoption name MultiPV value '+(j.multipv||1));
  /* v73: quando joga (níveis do Stockfish), a força pode ser limitada; nas análises volta sempre à força total */
  var want=j.play&&j.elo?j.elo:0;
  if(want!==(api.lim||0)){
   if(want){w.postMessage('setoption name UCI_LimitStrength value true');w.postMessage('setoption name UCI_Elo value '+want);}
   else w.postMessage('setoption name UCI_LimitStrength value false');
   api.lim=want;
  }
  w.postMessage(j.pos||('position fen '+j.fen));
  var go='go';
  if(j.depth)go+=' depth '+j.depth;
  if(j.movetime)go+=' movetime '+j.movetime;
  if(j.searchmoves)go+=' searchmoves '+j.searchmoves;
  w.postMessage(go);
 };
 /* fila serial: {fen, depth, movetime, multipv, searchmoves}, cb({best, lines}) ou cb(null) se o motor falhar */
 api.go=function(job,cb,low){job.cb=cb;if(api.failed){cb(null);return;}(low?api.lq:api.q).push(job);if(!api.w)api.init();api.pump();};
 /* nota do ponto de vista de quem joga, na escala do motor do jogo (mate = 30000 - lances) */
 api.score=function(o){if(!o)return 0;if(o.mate!=null){var n=o.mate;return n>0?30000-(2*n-1):-(30000-2*(-n));}return o.cp||0;};
 api.san=function(fen,uci){try{var p=Engine.posFromFEN(fen);var m=Engine.uciToMove(p,uci);return m<0?uci:Engine.moveToSAN(p,m);}catch(e){return uci;}};
 api.pvSan=function(fen,pv,n){try{var p=Engine.posFromFEN(fen),ms=[],q=Engine.posFromFEN(fen);for(var i=0;i<pv.length&&i<n;i++){var m=Engine.uciToMove(q,pv[i]);if(m<0)break;ms.push(m);Engine.makeMove(q,m);q.stack=[];}return Coach.lineSAN(p,ms,n);}catch(e){return '';}};
 return api;
})();

/* As consultas pesadas de análise passam pelo Stockfish quando ele está pronto; senão, pelo motor do jogo. */
var _sfOldRun=Think.run;
Think.run=function(q,cb){
 var cmd=q&&q.cmd;
 if((cmd==='anl'||cmd==='judge')&&SF.ok()){
  var p;try{p=Engine.posFromFEN(q.fen);}catch(e){p=null;}
  if(p&&Engine.legalMoves(p).length>0){
   Think.busy++;
   var fin=function(r){Think.busy--;cb(r);};
   var back=function(){Think.busy--;_sfOldRun(q,cb);};
   if(cmd==='anl')V23.sfAnl(q,p,fin,back);else V23.sfJudge(q,p,fin,back);
   return;
  }
 }
 _sfOldRun(q,cb);
};

var V23={};
V23.sfAnl=function(q,p,fin,back){
 SF.go({fen:q.fen,depth:18,movetime:450},function(r){
  if(!r||!r.lines.length||!r.best){back();return;}
  var sc=SF.score(r.lines[0]);
  fin({w:p.turn===1?sc:-sc,best:r.best,bestSan:SF.san(q.fen,r.best),sf:true});
 });
};
V23.sfJudge=function(q,p,fin,back){
 SF.go({fen:q.fen,depth:18,movetime:650},function(r){
  if(!r||!r.lines.length||!r.best){back();return;}
  var best=r.lines[0],bs=SF.score(best);
  var done=function(ms){
   var loss=Math.max(0,Coach.winPct(bs)-Coach.winPct(ms));
   fin({loss:loss,best:r.best,bestSan:SF.san(q.fen,r.best),score:ms,bestScore:bs,line:SF.pvSan(q.fen,best.pv||[r.best],4),sf:true});
  };
  if(q.uci===r.best){done(bs);return;}
  SF.go({fen:q.fen,depth:16,movetime:450,searchmoves:q.uci},function(r2){
   if(!r2||!r2.lines.length){back();return;}
   done(SF.score(r2.lines[0]));
  });
 });
};

/* ======================= utilidades ======================= */
V23.d=function(){var d=Profile.d;if(!d.v23)d.v23={study:{days:{},total:0,play:0},coord:{w:0,b:0},color:{best:0},mem:{lvl:1,best:0},mates:{}};var v=d.v23;if(!v.study)v.study={days:{},total:0,play:0};if(!v.coord)v.coord={w:0,b:0};if(!v.color)v.color={best:0};if(!v.mem)v.mem={lvl:1,best:0};if(!v.mates)v.mates={};return v;};
V23.fmtH=function(sec){sec=Math.round(sec||0);if(sec<3600)return Math.round(sec/60)+' min';var h=Math.floor(sec/3600),m=Math.round((sec%3600)/60);return h+' h'+(m?' '+(m<10?'0':'')+m:'');};
V23.today=function(){return Profile.today();};
V23.esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V23.shuffle=function(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;};
V23.sqName=function(s){return Engine.sqName(s);};

/* ======================= Relógio de estudo sério ======================= */
/* Conta o tempo em que você está ativo (tocou ou clicou no último minuto) em treinos: problemas, finais, aberturas,
   partidas de mestres, lições, revisão de partidas, visão e padrões de mate. Tempo em partidas fica separado. */
var StudyClock=(function(){
 var api={ctx:null,lastInput:0,acc:0,STEP:5};
 api.set=function(c){api.ctx=c;};
 api.mark=function(){api.lastInput=Date.now();};
 api.tick=function(){
  if(!api.ctx||!Profile.d)return;
  if(document.visibilityState&&document.visibilityState!=='visible')return;
  if(Date.now()-api.lastInput>60000)return;
  var v=V23.d(),s=v.study,day=V23.today();
  if(api.ctx==='estudo'){s.total+=api.STEP;s.days[day]=(s.days[day]||0)+api.STEP;}
  else if(api.ctx==='jogo'){s.play+=api.STEP;s.pdays=s.pdays||{};s.pdays[day]=(s.pdays[day]||0)+api.STEP;}
  api.acc+=api.STEP;
  if(api.acc>=60){api.acc=0;try{Profile.save();}catch(e){}}
 };
 api.todaySec=function(){var s=V23.d().study;return s.days[V23.today()]||0;};
 api.weekSec=function(){var s=V23.d().study,t=V23.today(),n=0;for(var i=0;i<7;i++)n+=s.days[t-i]||0;return n;};
 api.goalSec=function(){return ((Profile.d.dailyMin||30)*60);};
 return api;
})();
if(V23_UI){['pointerdown','keydown','touchstart'].forEach(function(ev){window.addEventListener(ev,StudyClock.mark,true);});setInterval(StudyClock.tick,StudyClock.STEP*1000);}
(function(){
 function wrapCtx(obj,name,ctx){var f=obj[name];if(typeof f!=='function')return;obj[name]=function(){StudyClock.set(ctx);return f.apply(this,arguments);};}
 wrapCtx(Drills,'run','estudo');wrapCtx(Drills,'endgame','estudo');wrapCtx(Drills,'model','estudo');
 wrapCtx(Pages,'lesson','estudo');wrapCtx(Pages,'think','estudo');wrapCtx(App,'analysis','estudo');wrapCtx(App,'startReview','estudo');
 wrapCtx(App,'setupGame','jogo');wrapCtx(App,'restoreGame','jogo');
 wrapCtx(UiJs,'menu',null);wrapCtx(UiJs,'hub',null);
})();
/* volta ao estudo quando se abre uma lição de abertura ou estrutura dentro dessas páginas */
V23.studyCard=function(parent){
 var v=V23.d(),s=v.study,today=StudyClock.todaySec(),goal=StudyClock.goalSec();
 var pct=Math.min(100,Math.round(today*100/Math.max(60,goal)));
 var box=UiJs.el('div','v23-clock',parent);
 box.innerHTML='<div class="v23-ct"><b>Estudo sério hoje</b><span>'+V23.fmtH(today)+' de '+V23.fmtH(goal)+'</span></div>'+
  '<div class="v23-bar"><i style="width:'+pct+'%"></i></div>'+
  '<div class="v23-cs">Semana: '+V23.fmtH(StudyClock.weekSec())+' · Total: '+V23.fmtH(s.total)+' rumo às 5.000 h dos mestres</div>';
 return box;
};
V23.studyPage=function(){
 StudyClock.set(null);
 UiJs.page('Relógio de estudo sério',Pages.profile);
 var v=V23.d(),s=v.study,t=V23.today();
 V23.studyCard(UiJs.cur);
 UiJs.stats([[V23.fmtH(s.total),'estudo sério'],[V23.fmtH(s.play||0),'em partidas'],[String(V23.streakDays()),'dias seguidos']]);
 UiJs.h('Últimos 14 dias (minutos de estudo)');
 var labels=[],vals=[],mx=1;
 for(var i=13;i>=0;i--){var dd=new Date((t-i)*86400000);labels.push(dd.getUTCDate()+'/'+(dd.getUTCMonth()+1));var m=Math.round((s.days[t-i]||0)/60);vals.push(m);if(m>mx)mx=m;}
 var bars=UiJs.el('div','v23-bars',UiJs.cur);
 for(var k=0;k<vals.length;k++){var b=UiJs.el('div','v23-b',bars);b.innerHTML='<i style="height:'+Math.max(2,Math.round(vals[k]*100/mx))+'%"></i><span>'+vals[k]+'</span><em>'+labels[k]+'</em>';}
 UiJs.h('Por que contar horas de estudo?');
 UiJs.p('Pesquisas com milhares de enxadristas (Charness e colegas, 2005) mostram que o melhor preditor da força é o estudo sério sozinho: problemas, finais, análise de partidas. Grandes mestres somaram cerca de 5.000 horas disso na primeira década. Para quem começa adulto, tempo de estudo e livros foram os únicos preditores que se mantiveram.','muted');
 UiJs.p('O relógio só conta enquanto você está ativo (tocou ou clicou no último minuto) dentro de um treino. Partidas contam à parte: jogar é importante, mas não substitui o estudo.','muted small');
 UiJs.btns([['Ir para o Centro de Treino',App.training,'pri']]);
};
V23.streakDays=function(){var s=V23.d().study,t=V23.today(),n=0;if(!(s.days[t]>=300))t--;while(s.days[t]>=300){n++;t--;}return n;};

/* ======================= Treino de visão ======================= */
V23.vision=function(){
 StudyClock.set('estudo');
 UiJs.page('Treino de visão',App.training);
 var v=V23.d();
 UiJs.p('Mestres enxergam o tabuleiro de olhos fechados. Estes treinos curtos (1 a 3 minutos) constroem esse mapa mental: saber o nome e a cor de cada casa e lembrar onde cada peça está.','muted');
 UiJs.items([
  {t:'Coordenadas',d:'Toque na casa pedida, sem as letras e números da borda. 30 segundos.',r:'recorde '+v.coord.w+' / '+v.coord.b,f:V23.coordIntro},
  {t:'Cor da casa',d:'Sem olhar o tabuleiro: a casa é clara ou escura? 20 perguntas.',r:v.color.best?('recorde '+v.color.best+' s'):'novo',f:V23.colorStart},
  {t:'Memória de posição',d:'Memorize a posição em poucos segundos e depois diga onde estavam as peças.',r:'nível '+v.mem.lvl,f:V23.memStart}
 ]);
};
/* --- coordenadas --- */
V23.coordIntro=function(){
 UiJs.page('Coordenadas',V23.vision);
 var v=V23.d();
 UiJs.p('Uma casa aparece escrita (por exemplo, e4). Toque nela o mais rápido que puder. Vale treinar dos dois lados: de Pretas o tabuleiro fica de cabeça para baixo.','muted');
 UiJs.stats([[String(v.coord.w),'recorde de Brancas'],[String(v.coord.b),'recorde de Pretas']]);
 UiJs.btns([['Jogar de Brancas',function(){V23.coordRun(false);},'pri'],['Jogar de Pretas',function(){V23.coordRun(true);}]]);
};
V23.coordRun=function(flip){
 StudyClock.set('estudo');
 UiJs.boardPage('Coordenadas',V23.coordIntro);
 var shell=UiJs.root.querySelector('.bp');if(shell)shell.classList.add('v23-nocoord');
 var b=UiJs.board,st={ok:0,bad:0,target:-1,end:Date.now()+30000,timer:null,done:false};
 b.fen='8/8/8/8/8/8/8/8 w - - 0 1';b.flip=flip;b.arrows=[];b.marks=[];b.legal=null;b.onMove=null;b.last=null;b.check=-1;b.blind=false;
 function pick(){var s;do{s=Math.floor(Math.random()*64);}while(s===st.target);st.target=s;}
 function draw(){
  UiJs.bars('Encontre a casa','Acertos: '+st.ok+' · erros: '+st.bad,false,true);
  UiJs.panel();
  var left=Math.max(0,Math.ceil((st.end-Date.now())/1000));
  if(!st.done){UiJs.html('<div class="v23-big">'+V23.sqName(st.target)+'</div>');UiJs.p(left+' s · acertos: '+st.ok+(st.bad?' · erros: '+st.bad:''),'gold');}
  else{
   var v=V23.d(),k=flip?'b':'w',rec=st.ok>v.coord[k];if(rec){v.coord[k]=st.ok;Profile.save();}
   UiJs.p(st.ok+' acertos em 30 s'+(st.bad?' ('+st.bad+' erros)':'')+'.',rec?'big gold':'big');
   if(rec)UiJs.p('Novo recorde!','good');
   UiJs.p(st.ok>=20?'Excelente: o mapa do tabuleiro já está na sua cabeça.':st.ok>=12?'Bom ritmo. Repita alguns dias seguidos e passe de 20.':'Dica: aprenda primeiro as diagonais longas (a1-h8 e h1-a8) e as colunas centrais.','muted');
   UiJs.btns([['De novo',function(){V23.coordRun(flip);},'pri'],['Voltar',V23.coordIntro]]);
  }
 }
 b.onSquare=function(s){
  if(st.done)return;
  if(s===st.target){st.ok++;b.marks=[[s,0]];pick();}else{st.bad++;b.marks=[[s,1],[st.target,3]];}
  b.draw();draw();
 };
 pick();b.draw();draw();
 st.timer=setInterval(function(){
  if(UiJs.board!==b){clearInterval(st.timer);return;}
  if(Date.now()>=st.end&&!st.done){st.done=true;clearInterval(st.timer);b.marks=[];b.onSquare=null;b.draw();}
  draw();
 },1000);
};
/* --- cor da casa --- */
V23.colorStart=function(){
 StudyClock.set('estudo');
 var st={i:0,n:20,ok:0,t0:Date.now(),sq:-1,msg:''};
 function next(){var s;do{s=Math.floor(Math.random()*64);}while(s===st.sq);st.sq=s;}
 function isLight(s){return (((s>>3)+(s&7))&1)===1;}
 function draw(){
  UiJs.page('Cor da casa',V23.vision);
  if(st.i>=st.n){
   var sec=Math.round((Date.now()-st.t0)/1000),v=V23.d(),rec=st.ok>=19&&(!v.color.best||sec<v.color.best);
   if(rec){v.color.best=sec;Profile.save();}
   UiJs.p(st.ok+' de '+st.n+' em '+sec+' s.',rec?'big gold':'big');
   if(rec)UiJs.p('Novo recorde (vale com 19 ou 20 acertos).','good');
   UiJs.p('Regra de bolso: a1 é escura. Se a letra (a=1, b=2...) e o número têm a mesma paridade, a casa é escura; se são diferentes, é clara.','muted');
   UiJs.btns([['De novo',V23.colorStart,'pri'],['Voltar',V23.vision]]);
   return;
  }
  UiJs.p('Pergunta '+(st.i+1)+' de '+st.n+' · acertos: '+st.ok,'muted');
  UiJs.html('<div class="v23-big">'+V23.sqName(st.sq)+'</div>');
  if(st.msg)UiJs.p(st.msg,st.msg.charAt(0)==='C'?'good':'bad');
  UiJs.btns([['Clara',function(){ans(true);},'pri'],['Escura',function(){ans(false);},'pri']]);
 }
 function ans(light){var r=isLight(st.sq)===light;if(r)st.ok++;st.msg=(r?'Certo: ':'Não: ')+V23.sqName(st.sq)+' é '+(isLight(st.sq)?'clara':'escura')+'.';st.i++;next();draw();}
 next();draw();
};
/* --- memória de posição --- */
V23.MEM=[[5,6,8000],[8,9,9000],[11,13,10000],[14,18,12000],[19,26,15000]];
V23.NAMES={K:'o Rei',Q:'a Dama',R:'a Torre',B:'o Bispo',N:'o Cavalo',P:'o Peão'};
V23.memStart=function(){
 StudyClock.set('estudo');
 Puzzles.load();
 var v=V23.d(),lvl=Math.max(1,Math.min(V23.MEM.length,v.mem.lvl)),L=V23.MEM[lvl-1];
 /* posição real (de problemas do Lichess) com a quantidade de peças do nível */
 var list=Puzzles.list,fen=null,tries=0;
 while(!fen&&tries<4000){tries++;var p=list[Math.floor(Math.random()*list.length)];var n=p.fen.split(' ')[0].replace(/[^a-zA-Z]/g,'').length;if(n>=L[0]&&n<=L[1])fen=p.fen;}
 if(!fen)fen=list[0].fen;
 var b0=Engine.posFromFEN(fen),pcs={},uniq=[];
 for(var s=0;s<64;s++){var x=b0.board[s];if(!x)continue;var c=x>0?'w':'b',t='PNBRQK'.charAt(Math.abs(x)-1);var k=c+t;(pcs[k]=pcs[k]||[]).push(s);}
 for(var k in pcs)if(pcs[k].length===1)uniq.push(k);
 V23.shuffle(uniq);
 var qs=uniq.slice(0,4);
 if(qs.length<3){for(var k2 in pcs)if(pcs[k2].length===2&&qs.length<4)qs.push(k2);}
 var st={fen:fen,qs:qs,pcs:pcs,i:0,ok:0,phase:'look',end:Date.now()+L[2],timer:null,res:[]};
 UiJs.boardPage('Memória de posição',V23.vision);
 var b=UiJs.board;b.flip=false;b.arrows=[];b.marks=[];b.legal=null;b.onMove=null;b.last=null;b.check=-1;b.blind=false;
 function qText(k){var nm=V23.NAMES[k.charAt(1)]+(k.charAt(0)==='w'?' branco':' preto');if(k.charAt(1)==='Q'||k.charAt(1)==='R')nm=nm.replace('branco','branca').replace('preto','preta');return nm;}
 function draw(){
  UiJs.panel();
  if(st.phase==='look'){
   var left=Math.max(0,Math.ceil((st.end-Date.now())/1000));
   UiJs.bars('Nível '+lvl+' · '+st.fen.split(' ')[0].replace(/[^a-zA-Z]/g,'').length+' peças','Memorize: '+left+' s',false,true);
   UiJs.p('Nível '+lvl+' · '+st.fen.split(' ')[0].replace(/[^a-zA-Z]/g,'').length+' peças · '+left+' s','gold');
   UiJs.p('Olhe a posição e grave onde está cada peça. Quando o tempo acabar, as peças somem.','muted');
   UiJs.btns([['Já memorizei',function(){st.end=0;},'pri']]);
  }else if(st.phase==='ask'){
   UiJs.bars('Onde estava…','Pergunta '+(st.i+1)+' de '+st.qs.length,false,true);
   UiJs.html('<div class="v23-q">Toque na casa onde estava <b>'+qText(st.qs[st.i])+'</b>'+(st.pcs[st.qs[st.i]].length>1?' (uma das duas)':'')+'</div>');
   UiJs.p('Pergunta '+(st.i+1)+' de '+st.qs.length+' · acertos: '+st.ok,'muted');
  }else{
   var v=V23.d(),all=st.ok===st.qs.length;
   if(all&&lvl===v.mem.lvl&&v.mem.lvl<V23.MEM.length){v.mem.lvl++;}
   if(st.ok===0&&v.mem.lvl>1&&lvl===v.mem.lvl)v.mem.lvl--;
   Profile.save();
   UiJs.bars('Posição original','Verde: acerto · vermelho: erro',false,true);
   UiJs.p(st.ok+' de '+st.qs.length+' acertos.',all?'big gold':'big');
   UiJs.p('Verde: você acertou · vermelho: seu toque · amarelo: onde a peça estava.','muted small');
   UiJs.p(all?(lvl<V23.MEM.length?'Perfeito! Próximo nível: mais peças.':'Perfeito no nível máximo: memória de mestre.'):'Dica: agrupe as peças em blocos (o roque, a cadeia de peões, a bateria dama-bispo). Mestres lembram padrões, não peças soltas.','muted');
   UiJs.btns([['Próxima posição',V23.memStart,'pri'],['Voltar',V23.vision]]);
  }
 }
 b.fen=fen;b.onSquare=null;b.draw();draw();
 st.timer=setInterval(function(){
  if(UiJs.board!==b){clearInterval(st.timer);return;}
  if(st.phase==='look'){
   if(Date.now()>=st.end){st.phase='ask';b.fen='8/8/8/8/8/8/8/8 w - - 0 1';b.draw();
    b.onSquare=function(s){
     if(st.phase!=='ask')return;
     var k=st.qs[st.i],good=st.pcs[k].indexOf(s)>=0;
     if(good)st.ok++;
     st.res.push([s,good?0:1]);if(!good)st.res.push([st.pcs[k][0],3]);
     st.i++;
     if(st.i>=st.qs.length){st.phase='end';clearInterval(st.timer);b.fen=st.fen;b.marks=st.res;b.onSquare=null;b.draw();}
     else{b.marks=[[s,good?0:1]];b.draw();}
     draw();
    };
    draw();
   }else draw();
  }
 },1000);
};

/* ======================= Trilha dos padrões de mate ======================= */
V23.MATES=[
 ['backRankMate','O rei roqueado fica preso atrás dos próprios peões. Uma torre ou dama chega à última fila e não há casa de fuga.','Procure: rei na primeira fila, peões na frente sem "luft" (casa de respiro) e a fila de trás sem defensores.'],
 ['smotheredMate','O rei está cercado pelas próprias peças e o cavalo, que salta por cima de todas, dá o mate.','Procure: rei no canto (h8/g8) cercado por torre e peões. Muitas vezes vem depois de um sacrifício de dama em g8 que obriga a torre a tapar a fuga.'],
 ['anastasiaMate','Cavalo e torre (ou dama) caçam o rei na coluna da borda: o cavalo tira as casas de fuga e a torre dá o xeque pela coluna.','Procure: rei em h7/h8 com o próprio peão em g7 e um cavalo seu em e7 ou e6. A coluna h aberta é o caminho da torre.'],
 ['arabianMate','Torre e cavalo no canto: a torre dá xeque ao lado do rei e o cavalo protege a torre e cobre a última casa.','Procure: rei no canto (h8) e um cavalo seu em f6. A torre entra em h7 ou g8.'],
 ['hookMate','Torre, cavalo e peão formam um gancho: a torre dá xeque protegida pelo cavalo, que por sua vez é protegido por um peão.','Procure: torre colada ao rei, cavalo defendendo a torre e um peão segurando o cavalo.'],
 ['dovetailMate','A dama encosta no rei pela diagonal, protegida, e as peças do próprio rei bloqueiam as duas casas de fuga ao lado (cauda de andorinha).','Procure: dama sua em contato diagonal com o rei e peças dele nas casas atrás.'],
 ['bodenMate','Dois bispos em diagonais cruzadas dão mate no rei que rocou na ala da dama, com as próprias peças bloqueando.','Procure: rei em c8 (ou c1) com peça em d7/d8 e as diagonais a6-c8 e b8-h2 abertas para os seus bispos.'],
 ['doubleBishopMate','Os dois bispos, em diagonais vizinhas e paralelas, fecham todas as casas do rei.','Procure: um bispo dá o xeque e o outro, na diagonal ao lado, cobre a fuga.']
];
V23.mateState=function(k){var m=V23.d().mates;return m[k]||(m[k]={best:0,done:false,tries:0});};
V23.mateUnlocked=function(i){if(i===0)return true;return V23.mateState(V23.MATES[i-1][0]).done;};
V23.mates=function(){
 StudyClock.set('estudo');
 UiJs.page('Padrões de mate',App.training);
 var done=V23.MATES.filter(function(m){return V23.mateState(m[0]).done;}).length;
 UiJs.p('Os 8 mates com nome que mais aparecem nas partidas. Em cada um: a ideia em duas frases e 6 problemas reais do Lichess, do mais fácil ao mais difícil. Acerte 5 de 6 para liberar o próximo.','muted');
 UiJs.bar('Padrões dominados',done*100/V23.MATES.length,'gold',done+'/'+V23.MATES.length);
 var rows=[];
 V23.MATES.forEach(function(m,i){
  var s=V23.mateState(m[0]),un=V23.mateUnlocked(i),n=Puzzles.count(m[0]);
  rows.push({t:(s.done?'✓ ':(un?'':'🔒 '))+Content.themeName(m[0]),d:Content.themeDesc(m[0]),r:s.done?('dominado'):(un?(s.tries?'melhor '+s.best+'/6':n+' problemas'):'bloqueado'),ok:s.done,dis:!un,f:function(){if(un)V23.mateLesson(i);}});
 });
 UiJs.items(rows);
 if(done===V23.MATES.length)UiJs.p('Todos os padrões dominados. Para fixar, monte um conjunto Woodpecker de "Padrões de mate" em Táticas.','good');
};
V23.mateLesson=function(i){
 var m=V23.MATES[i],k=m[0];
 UiJs.page(Content.themeName(k),V23.mates);
 UiJs.p(m[1],'gold');
 UiJs.h('Como reconhecer');
 UiJs.p(m[2]);
 var s=V23.mateState(k);
 if(s.tries)UiJs.p('Sua melhor marca: '+s.best+' de 6.'+(s.done?' Padrão dominado.':''),s.done?'good':'muted');
 UiJs.btns([['Resolver 6 problemas',function(){V23.mateRun(i);},'pri'],['Voltar',V23.mates]]);
};
V23.mateRun=function(i){
 var k=V23.MATES[i][0],seen=Profile.seenMap();
 var ps=Puzzles.pick([k],400,1300,3,seen).concat(Puzzles.pick([k],1300,2300,3,seen));
 var ids={},uniq=[];ps.forEach(function(p){if(!ids[p.id]){ids[p.id]=1;uniq.push(p);}});
 if(uniq.length<6){Puzzles.pick([k],400,2600,12,null).forEach(function(p){if(!ids[p.id]&&uniq.length<6){ids[p.id]=1;uniq.push(p);}});}
 uniq.sort(function(a,b){return a.rating-b.rating;});
 Drills.run(Content.themeName(k),Study.pzTasks(uniq.slice(0,6),false,'tatica'),{back:function(){V23.mateLesson(i);},done:function(res){
  var ok=0;res.forEach(function(x){if(x.ok)ok++;});
  var s=V23.mateState(k);s.tries++;if(ok>s.best)s.best=ok;if(ok>=5)s.done=true;Profile.save();
  UiJs.page('Resultado',V23.mates);
  UiJs.p(ok+' de '+res.length+' no '+Content.themeName(k)+'.',ok>=5?'big gold':'big');
  if(ok>=5){UiJs.p(i<V23.MATES.length-1?'Padrão dominado! O próximo está liberado: '+Content.themeName(V23.MATES[i+1][0])+'.':'Você completou a trilha dos padrões de mate.','good');}
  else UiJs.p('Faltou pouco. Releia a ideia e tente de novo: os problemas mudam a cada tentativa.','muted');
  var bs=[];if(ok>=5&&i<V23.MATES.length-1)bs.push(['Próximo padrão',function(){V23.mateLesson(i+1);},'pri']);bs.push(['Tentar de novo',function(){V23.mateRun(i);},ok>=5?'':'pri']);bs.push(['Trilha',V23.mates]);
  UiJs.btns(bs);
 }});
};

/* ======================= Backup em arquivo e conta Google ======================= */
V23.SNAP='xadrez_treinador_v4_snap';
V23.snapshot=function(why){try{var raw=JSON.stringify(Profile.d),arr=[];try{arr=JSON.parse(localStorage.getItem(V23.SNAP)||'[]');}catch(e){}arr.unshift({t:Date.now(),why:why,d:raw});arr=arr.slice(0,2);localStorage.setItem(V23.SNAP,JSON.stringify(arr));}catch(e){}};
V23.download=function(name,text,type){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);};
V23.backupFile=function(){
 var dt=new Date(),ds=dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2)+'-'+('0'+dt.getDate()).slice(-2);
 V23.download('rota-do-mestre-backup-'+ds+'.json',JSON.stringify({app:'rota-do-mestre',v:4,date:dt.toISOString(),d:Profile.d}));
 V23.d().lastBackup=Date.now();Profile.save();
 UiJs.toast('Backup salvo nos downloads.');
};
/* mescla dois perfis sem perder histórico: partidas e cartões de revisão somam; contadores e recordes ficam com o maior */
V23.merge=function(a,b){
 if(!a)return b;if(!b)return a;
 var newer=(b.upd||0)>(a.upd||0)?b:a,older=newer===a?b:a;
 var out=JSON.parse(JSON.stringify(newer));
 function arr(x){return Array.isArray(x)?x:[];}
 function union(key,idf,cap,pref){var m={},o=[];arr(older[key]).concat(arr(newer[key])).forEach(function(x){var id=idf(x);if(id==null)return;if(m[id]===undefined){m[id]=o.length;o.push(x);}else if(pref&&pref(x,o[m[id]]))o[m[id]]=x;});if(cap&&o.length>cap)o=o.slice(o.length-cap);return o;}
 out.hist=union('hist',function(x){return x&&x.t;},200).sort(function(x,y){return x.t-y.t;});
 out.srs=union('srs',function(x){return x&&(x.k+'|'+x.id);},600,function(x,y){return (x.last||0)>(y.last||0)||((x.last||0)===(y.last||0)&&(x.due||0)>(y.due||0));});
 out.pzSeen=union('pzSeen',function(x){return typeof x==='string'?x:JSON.stringify(x);},4000);
 ['online','ghost','clones','model','stSeen'].forEach(function(k){if(Array.isArray(newer[k])||Array.isArray(older[k]))out[k]=union(k,function(x){return JSON.stringify(x);},400);});
 ['pzN','pzOk','stormBest','rushBest','ladder','storm'].forEach(function(k){out[k]=Math.max(+a[k]||0,+b[k]||0);});
 out.pzElo=((+a.pzN||0)>=(+b.pzN||0)?a:b).pzElo;
 if(a.r&&b.r){out.r={};var cats=Object.keys(Object.assign({},a.r,b.r));cats.forEach(function(c){var x=a.r[c],y=b.r[c];out.r[c]=!x?y:!y?x:((y.games||0)>(x.games||0)?y:x);});}
 if(Array.isArray(a.trail)&&Array.isArray(b.trail)){out.trail=[];for(var i=0;i<Math.max(a.trail.length,b.trail.length);i++){var x=a.trail[i],y=b.trail[i];if(!x||!y){out.trail.push(x||y);continue;}var rd={};arr(x.read).concat(arr(y.read)).forEach(function(r){rd[r]=1;});out.trail.push({read:Object.keys(rd).map(Number),prog:arr(x.prog).map(function(v,j){return Math.max(v||0,(y.prog||[])[j]||0);}),exam:!!(x.exam||y.exam),best:Math.max(x.best||0,y.best||0)});}}
 out.eg=Object.assign({},older.eg||{},newer.eg||{});
 out.evo=Object.assign({},older.evo||{},newer.evo||{});
 function cnt2(k){var o={},x=a[k]||{},y=b[k]||{};Object.keys(Object.assign({},x,y)).forEach(function(t){var u=x[t],v=y[t];o[t]=!u?v:!v?u:((v[0]+v[1])>(u[0]+u[1])?v:u);});return o;}
 if(a.themes||b.themes)out.themes=cnt2('themes');if(a.dims||b.dims)out.dims=cnt2('dims');
 if(a.daily&&b.daily){out.daily=JSON.parse(JSON.stringify((a.daily.last||0)>=(b.daily.last||0)?a.daily:b.daily));out.daily.best=Math.max(a.daily.best||0,b.daily.best||0);}
 if(a.wood&&b.wood){out.wood=((b.wood.times||[]).length>(a.wood.times||[]).length)?b.wood:a.wood;}
 if(Array.isArray(a.masterStats)||Array.isArray(b.masterStats))out.masterStats=arr(a.masterStats).length>=arr(b.masterStats).length?a.masterStats:b.masterStats;
 if(a.v23||b.v23){var va=a.v23||{},vb=b.v23||{},o=out.v23=JSON.parse(JSON.stringify((newer.v23)||{}));
  var sa=(va.study||{}),sb=(vb.study||{});o.study={days:{},pdays:{},total:0,play:0};
  [sa,sb].forEach(function(s){Object.keys(s.days||{}).forEach(function(d){o.study.days[d]=Math.max(o.study.days[d]||0,s.days[d]);});Object.keys(s.pdays||{}).forEach(function(d){o.study.pdays[d]=Math.max(o.study.pdays[d]||0,s.pdays[d]);});});
  o.study.total=Math.max(sa.total||0,sb.total||0,Object.keys(o.study.days).reduce(function(t,d){return t+o.study.days[d];},0));o.study.play=Math.max(sa.play||0,sb.play||0);
  o.coord={w:Math.max((va.coord||{}).w||0,(vb.coord||{}).w||0),b:Math.max((va.coord||{}).b||0,(vb.coord||{}).b||0)};
  var ca=(va.color||{}).best||0,cb=(vb.color||{}).best||0;o.color={best:ca&&cb?Math.min(ca,cb):(ca||cb)};
  o.mem={lvl:Math.max((va.mem||{}).lvl||1,(vb.mem||{}).lvl||1)};
  o.mates={};[va.mates||{},vb.mates||{}].forEach(function(m){Object.keys(m).forEach(function(k){var x=o.mates[k]||{best:0,done:false,tries:0};o.mates[k]={best:Math.max(x.best,m[k].best||0),done:x.done||!!m[k].done,tries:Math.max(x.tries,m[k].tries||0)};});});
 }
 out.upd=Math.max(a.upd||0,b.upd||0);
 return out;
};
V23.applyProfile=function(nd,why){V23.snapshot(why);var ok=false;try{ok=Profile.importCode(JSON.stringify(nd));}catch(e){}return ok;};
V23.restoreFile=function(mode){
 var inp=document.createElement('input');inp.type='file';inp.accept='.json,.txt,application/json,text/plain';
 inp.onchange=function(){var f=inp.files&&inp.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){
  var txt=String(rd.result||''),nd=null;
  try{var o=JSON.parse(txt);nd=o&&o.d&&o.d.v===4?o.d:(o&&o.v===4?o:null);}catch(e){}
  if(!nd&&txt.trim().indexOf('XCT4:')===0){try{var bin=atob(txt.trim().substr(5));nd=JSON.parse(decodeURIComponent(escape(bin)));}catch(e){}}
  if(!nd){UiJs.toast('Arquivo não reconhecido.');return;}
  var res=mode==='merge'?V23.merge(Profile.d,nd):nd;
  if(V23.applyProfile(res,mode==='merge'?'antes de mesclar backup':'antes de restaurar backup')){UiJs.toast(mode==='merge'?'Backup mesclado ao seu progresso.':'Backup restaurado.');V23.Cloud.queue();V23.account();}
  else UiJs.toast('Não foi possível ler o backup.');
 };rd.readAsText(f);};
 inp.click();
};
V23.undoSnap=function(){try{var arr=JSON.parse(localStorage.getItem(V23.SNAP)||'[]');if(!arr.length){UiJs.toast('Nada para desfazer.');return;}var s=arr.shift();localStorage.setItem(V23.SNAP,JSON.stringify(arr));if(Profile.importCode(s.d)){UiJs.toast('Progresso anterior recuperado.');V23.account();}}catch(e){UiJs.toast('Não foi possível recuperar.');}};

/* --- nuvem: Firebase Auth (Google) + Firestore. Só ativa se o firebaseConfig (público, sem segredos) estiver no build. --- */
V23.Cloud=(function(){
 var api={cfg:(typeof V23_FIREBASE!=='undefined'?V23_FIREBASE:null),user:null,loading:false,loaded:false,timer:null,status:'',lastSync:0,syncing:false};
 var VER='10.14.1',BASE='https://www.gstatic.com/firebasejs/'+VER+'/';
 api.configured=function(){return !!(api.cfg&&api.cfg.apiKey&&api.cfg.projectId);};
 api.web=function(){return /^https?:$/.test(location.protocol);};
 function script(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){no(new Error('rede'));};document.head.appendChild(s);});}
 api.load=function(){
  if(api.loaded)return Promise.resolve();
  if(!api.configured())return Promise.reject(new Error('sem configuração'));
  if(!api.web())return Promise.reject(new Error('arquivo local'));
  api.loading=true;
  return script(BASE+'firebase-app-compat.js').then(function(){return script(BASE+'firebase-auth-compat.js');}).then(function(){return script(BASE+'firebase-firestore-compat.js');}).then(function(){
   firebase.initializeApp(api.cfg);
   try{firebase.firestore().enablePersistence({synchronizeTabs:true}).catch(function(){});}catch(e){}
   api.loaded=true;api.loading=false;
   firebase.auth().onAuthStateChanged(function(u){api.user=u;if(u){api.status='Conectado como '+(u.email||u.displayName||'Google');api.pull();}else api.status='';api.refresh();});
  }).catch(function(e){api.loading=false;throw e;});
 };
 api.refresh=function(){if(UiJs.root&&UiJs.root.querySelector('.v23-acct'))V23.account();};
 api.login=function(){
  api.load().then(function(){
   var pr=new firebase.auth.GoogleAuthProvider();
   return firebase.auth().signInWithPopup(pr).catch(function(e){
    if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'))return firebase.auth().signInWithRedirect(pr);
    throw e;
   });
  }).catch(function(e){UiJs.toast(e&&e.message==='arquivo local'?'O login funciona na versão online do jogo (site), não no arquivo baixado.':'Não foi possível entrar: '+(e&&e.code?e.code:(e&&e.message)||'erro'));});
 };
 api.logout=function(){if(api.loaded)firebase.auth().signOut().then(function(){UiJs.toast('Você saiu da conta. O progresso continua salvo neste aparelho.');V23.account();});};
 function ref(){return firebase.firestore().collection('users').doc(api.user.uid);}
 /* documento do perfil sem as partidas (as partidas ficam uma por documento, em users/{uid}/games: histórico sem limite) */
 function packed(d){var c=JSON.parse(JSON.stringify(d));c.hist=[];c.current=null;return JSON.stringify(c);}
 api.pull=function(){
  if(!api.user||api.syncing)return;
  api.syncing=true;api.status='Sincronizando…';api.refresh();
  ref().get().then(function(doc){
   return ref().collection('games').orderBy('t','desc').limit(200).get().then(function(gs){
    var games=[];gs.forEach(function(g){var x=g.data();if(x&&x.rec)games.push(JSON.parse(x.rec));});
    var remote=null;
    if(doc.exists&&doc.data().d){try{remote=JSON.parse(doc.data().d);}catch(e){}}
    if(remote){remote.hist=games.sort(function(x,y){return x.t-y.t;});var cur=Profile.current;var m=V23.merge(Profile.d,remote);V23.applyProfile(m,'antes de sincronizar com a nuvem');if(cur&&!Profile.current)Profile.current=cur;}
    api.syncing=false;return api.push(true);
   });
  }).catch(function(e){api.syncing=false;api.status='Falha ao sincronizar ('+(e&&e.code||'rede')+'). Tentaremos de novo.';api.refresh();});
 };
 api.push=function(force){
  if(!api.user||!api.loaded)return Promise.resolve();
  if(api.syncing&&!force)return Promise.resolve();
  api.syncing=true;
  var d=Profile.d,v=V23.d(),upT=v.cloudGamesT||0,batch=firebase.firestore().batch(),n=0,maxT=upT;
  (d.hist||[]).forEach(function(h){if(h&&h.t>upT&&n<400){batch.set(ref().collection('games').doc(String(h.t)),{t:h.t,rec:JSON.stringify(h)});n++;if(h.t>maxT)maxT=h.t;}});
  batch.set(ref(),{d:packed(d),upd:d.upd||Date.now(),app:'rota-do-mestre',v:4},{merge:true});
  return batch.commit().then(function(){v.cloudGamesT=maxT;api.lastSync=Date.now();api.status='Sincronizado às '+new Date().toLocaleTimeString().slice(0,5);api.syncing=false;try{_v23OldSave();}catch(e){}api.refresh();})
   .catch(function(e){api.syncing=false;api.status='Sem conexão: o progresso fica guardado aqui e sobe depois.';api.refresh();});
 };
 api.queue=function(){if(!api.user)return;clearTimeout(api.timer);api.timer=setTimeout(function(){api.push();},20000);};
 api.allGames=function(cb){
  if(!api.user){cb(null);return;}
  ref().collection('games').orderBy('t','asc').get().then(function(gs){var out=[];gs.forEach(function(g){try{out.push(JSON.parse(g.data().rec));}catch(e){}});cb(out);}).catch(function(){cb(null);});
 };
 return api;
})();
/* toda gravação marca a hora (para mesclar) e agenda o envio à nuvem */
var _v23OldSave=Profile.save;
Profile.save=function(){if(Profile.d)Profile.d.upd=Date.now();_v23OldSave();V23.Cloud.queue();};
if(V23_UI)document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&V23.Cloud.user){clearTimeout(V23.Cloud.timer);V23.Cloud.push();}});
/* quem já entrou antes reconecta sozinho quando o jogo abre online */
if(V23_UI)setTimeout(function(){try{if(V23.Cloud.configured()&&V23.Cloud.web()&&Profile.d&&V23.d().cloudOn)V23.Cloud.load().catch(function(){});}catch(e){}},1500);

V23.account=function(){
 UiJs.page('Conta e backup',Pages.profile);
 var cur=UiJs.cur;cur.classList.add('v23-acct');
 var C=V23.Cloud,v=V23.d();
 UiJs.h('Conta Google');
 if(!C.configured()){
  UiJs.p('O login com Google ainda não foi ativado nesta versão do jogo. Enquanto isso, use o backup em arquivo abaixo: ele guarda tudo.','muted');
 }else if(!C.web()){
  UiJs.p('O login com Google funciona na versão online do jogo (no site). Neste arquivo baixado, use o backup em arquivo.','muted');
 }else if(C.user){
  UiJs.p(C.status||('Conectado como '+(C.user.email||'Google')),'good');
  UiJs.p('Seu progresso é enviado para a nuvem automaticamente e todas as partidas ficam guardadas, sem o limite de 200 deste aparelho. Em outro aparelho, entre com a mesma conta: o progresso dos dois é mesclado, nada é apagado.','muted');
  UiJs.btns([['Sincronizar agora',function(){C.pull();},'pri'],['Todas as partidas da nuvem (PGN)',V23.cloudPgn],['Sair da conta',C.logout]]);
 }else{
  UiJs.p('Entre com sua conta Google para guardar o progresso na nuvem e continuar em qualquer aparelho. O jogo nunca vê a sua senha: quem confirma é o próprio Google.','muted');
  if(C.status)UiJs.p(C.status,'warn');
  UiJs.btns([['Entrar com Google',function(){v.cloudOn=true;Profile.save();C.login();},'pri']]);
 }
 UiJs.h('Backup em arquivo');
 var lb=v.lastBackup?new Date(v.lastBackup).toLocaleDateString():'nunca';
 UiJs.p('Um arquivo .json com todo o seu progresso (partidas, revisões, trilha, recordes, relógio de estudo). Guarde no Drive, no e-mail ou no pendrive. Último backup: '+lb+'.','muted');
 UiJs.btns([['Baixar backup',V23.backupFile,'pri'],['Mesclar um backup',function(){V23.restoreFile('merge');}],['Substituir por um backup',function(){UiJs.modal('Substituir o progresso?','O progresso atual deste aparelho será trocado pelo do arquivo. Uma cópia de segurança fica guardada e pode ser recuperada em "Desfazer". Para juntar os dois, use "Mesclar".',[["Substituir",function(){V23.restoreFile('replace');},"pri"],["Cancelar",function(){}]]);}]]);
 var snaps=[];try{snaps=JSON.parse(localStorage.getItem(V23.SNAP)||'[]');}catch(e){}
 if(snaps.length)UiJs.btns([['Desfazer última troca ('+new Date(snaps[0].t).toLocaleString().slice(0,16)+')',V23.undoSnap]]);
 UiJs.h('Código de transferência');
 UiJs.p('Também dá para levar o progresso por um código de texto (útil no Flash/Switch).','muted');
 UiJs.btns([['Mostrar código',function(){_v23OldSync();}]]);
};
V23.cloudPgn=function(){V23.Cloud.allGames(function(gs){if(!gs){UiJs.toast('Não foi possível buscar as partidas.');return;}UiJs.page('Todas as partidas da nuvem',V23.account);UiJs.p(gs.length+' partidas guardadas na sua conta.','muted');var t=gs.map(function(g){try{return Study.pgn(g);}catch(e){return '';}}).filter(Boolean).join('\n\n');if(!t)UiJs.p('Nenhuma partida ainda.','muted');else UiJs.pre(t,'todas-as-partidas.pgn');});};
var _v23OldSync=Pages.sync;
Pages.sync=V23.account;

/* relógio do treino (camada v22): ao sair de um exercício pela seta de voltar, o relógio não deve reaparecer em outra tela */
if(typeof Mestre!=='undefined'&&Mestre.clock){
 var _v23OldClock=Mestre.clock,_v23OldDraw=Drills.draw;
 Drills.draw=function(){V23.inDraw=true;try{return _v23OldDraw.apply(this,arguments);}finally{V23.inDraw=false;}};
 Mestre.clock=function(r){if(!V23.inDraw&&r&&r.timerLabel&&!r.timerLabel.isConnected){Mestre.clearClock(r);return;}return _v23OldClock(r);};
}
/* ======================= entradas nos menus ======================= */
var _v23OldTraining=App.training;
App.training=function(){
 _v23OldTraining();
 var m=UiJs.root.querySelector('.menu.hub');if(!m)return;
 var g=m.querySelector('.mgrid');
 if(g){
  var lab=null;[].forEach.call(g.querySelectorAll('.mitem'),function(x){if(x.textContent.indexOf('Laboratório')===0)lab=x;});
  UiJs.mitem(g,{t:'Padrões de mate',d:'Do corredor ao Boden',f:V23.mates});
  UiJs.mitem(g,{t:'Treino de visão',d:'Casas e memória',f:V23.vision});
  if(lab)g.appendChild(lab);
 }
 var cap=m.querySelector('.ctcap');
 var card=V23.studyCard(m);card.onclick=V23.studyPage;card.setAttribute('role','button');
 if(cap&&cap.nextSibling)m.insertBefore(card,cap.nextSibling);
};
var _v23OldProfile=Pages.profile;
Pages.profile=function(){
 _v23OldProfile();
 var col=UiJs.cur;if(!col)return;
 var box=UiJs.el('div','v23-pbox',null);
 col.insertBefore(box,col.firstChild);
 var card=V23.studyCard(box);card.onclick=V23.studyPage;card.setAttribute('role','button');
 var row=UiJs.el('div','btns',box);
 var b1=UiJs.el('button','btn',row,'Relógio de estudo');b1.onclick=V23.studyPage;
 var b2=UiJs.el('button','btn',row,V23.Cloud.user?'Conta e backup ✓':'Conta e backup');b2.onclick=V23.account;
};
/* motor carregado em segundo plano, depois que o jogo abre */
if(V23_UI)setTimeout(function(){try{SF.init();}catch(e){}},2500);
