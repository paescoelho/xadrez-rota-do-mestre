/* ======================= v73 — Stockfish joga nos níveis mais altos =======================
 * Níveis 5 (Grande Mestre, força limitada) e 6 (Stockfish, força máxima) são jogados pelo Stockfish que já vem no jogo.
 * Os lances de abertura continuam vindo do livro de mestres (variedade). O Stockfish recebe a partida inteira,
 * para enxergar repetições. Se ele não carregar neste aparelho, joga o motor do jogo e a tela avisa.
 */
var V73={};
/* 2900 na escala do próprio Stockfish equivale a cerca de 2500 na escala dos níveis do jogo (medido contra o nível Mestre) */
V73.LV={5:{elo:2900,ms:500},6:{elo:0,ms:900}};
V73.warned=false;
V73.posCmd=function(q){
 try{
  if(q.ucis&&q.ucis.length){
   var p=Engine.posFromFEN(q.start||'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),ok=true;
   for(var i=0;i<q.ucis.length;i++){var m=Engine.uciToMove(p,q.ucis[i]);if(m<0){ok=false;break;}Engine.makeMove(p,m);}
   if(ok&&Engine.toFEN(p).split(' ').slice(0,4).join(' ')===q.fen.split(' ').slice(0,4).join(' '))
    return 'position '+(q.start?'fen '+q.start:'startpos')+' moves '+q.ucis.join(' ');
  }
 }catch(e){}
 return 'position fen '+q.fen;
};
(function(){
 var prev=Think.run;
 Think.run=function(q,cb){
  var cfg=q&&q.cmd==='cpu'&&q.elo==null?V73.LV[q.level]:null;
  if(!cfg||typeof SF==='undefined'||SF.failed){
   if(cfg&&!V73.warned){V73.warned=true;try{UiJs.toast('O Stockfish não carregou neste aparelho: este nível joga com o motor do jogo, que é mais fraco.');}catch(e){}}
   return prev(q,cb);
  }
  var qb={};for(var k in q)qb[k]=q[k];qb.bookOnly=true;
  prev(qb,function(r){
   if(r&&r.uci){cb(r);return;}
   Think.busy++;
   SF.go({fen:q.fen,pos:V73.posCmd(q),movetime:cfg.ms,elo:cfg.elo,play:true},function(res){
    Think.busy--;
    if(!res||!res.best){
     if(!V73.warned){V73.warned=true;try{UiJs.toast('O Stockfish não carregou neste aparelho: este nível joga com o motor do jogo, que é mais fraco.');}catch(e){}}
     prev(q,cb);return;
    }
    var sc=res.lines&&res.lines[0]?SF.score(res.lines[0]):null;
    prev({cmd:'cpunote',fen:q.fen,uci:res.best,human:q.human,score:sc},cb);
   });
  });
 };
})();
