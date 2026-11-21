/* ======================= v82 — Lendas com repertório real =======================
 * Cada lenda abre como abriu nas partidas reais: 51 mil partidas (PgnMentor, via github.com/rozim/ChessData;
 * Gukesh via github.com/NateSolon/hans e o Mundial de 2024) viraram um livro por jogador em data/lendas/<id>.json.
 * Formato: chave da posição (FNV-1a de "peças lado roques") -> [partidas, [uci, peso], ...]; peso 2 por partida
 * clássica e 1 por partida rápida; só posições vistas 2+ vezes e lances com 3%+ das escolhas, até o lance 15.
 * Enquanto a posição estiver no livro, a lenda sorteia entre os lances que ela jogou, na proporção real;
 * fora dele, quem joga é o motor do jogo no estilo medido (capturas e xeques, sacrifícios, trocas de dama, roque).
 */
var V82={books:{},wait:{},last:{}};
V82.key=function(fen){
 var f=String(fen).split(' '),s=f[0]+' '+f[1]+' '+f[2],h=0x811c9dc5;
 for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return h.toString(16);
};
V82.load=function(id){
 if(V82.books[id])return Promise.resolve(V82.books[id]);
 if(V82.wait[id])return V82.wait[id];
 var p=typeof V74!=='undefined'?V74.get(id):null;if(!p||!p.bv)return Promise.resolve(null);
 V82.wait[id]=fetch('data/lendas/'+id+'.json?v='+p.bv).then(function(r){return r.ok?r.json():null;})
  .then(function(b){if(b)V82.books[id]=b;delete V82.wait[id];return b;},function(){delete V82.wait[id];return null;});
 return V82.wait[id];
};
/* espera o livro no máximo ms milissegundos (sem internet a lenda joga só com o motor) */
V82.ready=function(id,ms){
 return Promise.race([V82.load(id),new Promise(function(ok){setTimeout(function(){ok(null);},ms);})]);
};
V82.probe=function(id,fen){
 var b=V82.books[id];if(!b)return null;
 var e=b[V82.key(fen)];if(!e||e.length<2)return null;
 var tot=0,i;for(i=1;i<e.length;i++)tot+=e[i][1];
 var r=Math.random()*tot;
 for(i=1;i<e.length;i++){r-=e[i][1];if(r<=0)return {uci:e[i][0],n:e[0],share:Math.round(100*e[i][1]/tot)};}
 return {uci:e[1][0],n:e[0],share:Math.round(100*e[1][1]/tot)};
};
(function(){
 if(typeof window==='undefined'||typeof document==='undefined'||typeof Think==='undefined')return;
 var prev=Think.run;
 Think.run=function(q,cb){
  var lid=q&&q.cmd==='ghost'&&q.dna&&q.dna.src==='lenda'?q.dna.lid:null;
  if(!lid)return prev(q,cb);
  var go=function(){
   var hit=V82.probe(lid,q.fen),ply=(q.ucis?q.ucis.length:0)+1,was=V82.last[lid];
   if(hit)hit.l=ply;
   else if(was&&was.l&&was.l<ply&&!was.out)hit={out:true,l:ply};
   V82.last[lid]=hit;
   if(!hit||hit.out)return V82.engine?V82.engine(q,cb,prev):prev(q,cb);
   prev({cmd:'cpunote',fen:q.fen,uci:hit.uci,human:q.human},function(r){
    if(!r||!r.uci){V82.last[lid]=null;prev(q,cb);return;}
    r.book=true;r.err=false;r.score=null;r.real=hit;cb(r);
   });
  };
  if(V82.books[lid])go();else V82.ready(lid,2500).then(go);
 };
})();
/* o DNA da lenda passa a levar o id (livro real) e o roque medido; sem livro carregado, ficam as linhas de reserva */
(function(){
 if(typeof V74==='undefined')return;
 var dna=V74.dna;
 V74.dna=function(p){
  var d=dna(p);d.lid=p.id;d.cs=p.cs||'k';
  if(V82.books[p.id]){d.ow=[];d.ob=[];}
  return d;
 };
 var play=V74.play;
 V74.play=function(){
  var p=V74.get(V74.sel);if(!p)return play.apply(this,arguments);
  if(V82.books[p.id])return play.apply(this,arguments);
  try{UiJs.toast('Abrindo o repertório de '+p.s+'…');}catch(e){}
  var self=this,args=arguments;
  V82.ready(p.id,5000).then(function(b){
   if(!b)try{UiJs.toast('Sem o repertório real agora: '+p.s+' abre com as linhas de reserva.');}catch(e){}
   play.apply(self,args);
  });
 };
})();
