/* Rota do Mestre v67 — Elo com credibilidade.
 * Problemas corrigidos:
 *  1) Nas 5 primeiras partidas a nota era a "performance" (força do adversário − 400 numa derrota): perder para o Difícil (1600) dava 1200.
 *     Agora a nota começa do seu Elo estimado (ou 800) e só se move pelo resultado (Profile.recordRated, Haxe).
 *  2) O Elo do Painel (combinado) podia subir depois de uma derrota: o teto subia a cada partida jogada e outras partes
 *     (precisão, pesos) mudavam junto. Agora:
 *     - o teto com poucas partidas cresce com vitórias (+25) e empates (+10), nunca com derrotas;
 *     - o número mostrado só muda de verdade numa partida valendo pontos: derrota sempre tira (no mínimo 10), vitória nunca tira;
 *       entre uma partida e outra ele pode cair (inatividade, ajustes), mas não sobe sozinho.
 *     - Nivelamento novo ou conta do Lichess confirmada recalculam o número.
 *  3) Notas antigas por categoria são recalculadas com a regra nova, refazendo as partidas guardadas no histórico.
 */
var V67={};
V67.wins=function(){var w=0,dr=0,l=0;(Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=Profile.d.r&&Profile.d.r[c];if(r){w+=r.w||0;dr+=r.d||0;l+=r.l||0;}});return {w:w,d:dr,l:l};};
V67.rated=function(){var n=0;(Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=Profile.d.r&&Profile.d.r[c];if(r)n+=r.games||0;});return n;};
/* cálculo bruto (o da v29, com o teto por resultados em vez de por partidas jogadas) */
V67.raw=function(){
 var d=Profile.d,parts=[],bestGame=0,games=0;
 (Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=d.r&&d.r[c];if(!r)return;if(r.games>=5&&r.elo>bestGame)bestGame=r.elo;games+=r.games||0;});
 var ac=d.v29acc;
 if(ac&&ac.n>=3){var f=Math.min(1,ac.n/10);parts.push(['Precisão nas partidas',ac.perf,1.4*f*f]);games+=ac.imp||0;}
 if(bestGame>0)parts.push(['Partidas',bestGame,0.7*Math.min(1,games/20)]);
 if(d.pzN>=20)parts.push(['Problemas',V28.toGame(d.pzElo),0.2*Math.min(1,d.pzN/100)]);
 var md=d.model||[];
 if(md.length>=3){var s=0,n=0;for(var i=md.length-1;i>=0&&n<5;i--){s+=md[i].perf;n++;}parts.push(['Adivinhe o lance',V28.toGame(s/n),0.08*Math.min(1,md.length/8)]);}
 var pl=d.place;
 if(pl&&pl.est){var pe=pl.method==='critico-v28'?pl.est:V28.toGame(pl.est);parts.push(['Nivelamento',pe,parts.length===0?1:0.15]);}
 try{if(typeof V32!=='undefined'&&V32.ext)V32.ext().forEach(function(x){parts.push(x);});}catch(e){}
 var sw=0,sv=0;parts.forEach(function(p){sw+=p[2];sv+=p[1]*p[2];});
 var val=sw>0?Math.round(sv/sw):0;
 if(val>0&&games<10&&!(ac&&ac.n>=10)&&!(typeof V32!=='undefined'&&V32.verified&&V32.verified())){var wr=V67.wins();val=Math.min(val,1000+25*wr.w+10*wr.d);}
 var out=parts.map(function(p){return [p[0],Math.round(p[1]),p[2]];});
 var dc=val>0?V29.decay():{amt:0};
 if(dc.amt>0){val=Math.max(100,val-dc.amt);out.push(['Inatividade',-dc.amt,0]);}
 return [val,out];
};
/* o que, se mudar, recalcula o número do zero (nivelamento novo, conta do Lichess confirmada) */
V67.sig=function(){var d=Profile.d,pl=d.place,li=null;try{li=V32.d().li;}catch(e){}return [pl&&(pl.t||pl.est)||0,li&&li.ver?(li.t||1):0].join('|');};
V67.state=function(){var d=Profile.d;if(!d.v67||typeof d.v67!=='object')d.v67={};return d.v67;};
Profile.combined=function(){
 var r=V67.raw(),st=V67.state(),sig=V67.sig();
 if(!(r[0]>0))return r;
 if(st.D==null||st.sig!==sig){st.D=r[0];st.sig=sig;st.n=V67.rated();try{Profile.save();}catch(e){}return r;}
 /* entre partidas: pode cair, não sobe sozinho */
 if(r[0]>st.D){r[1].push(['Treino a confirmar jogando','+'+(r[0]-st.D),0]);r[0]=st.D;}
 return r;
};
/* cada partida valendo pontos decide para onde o número vai */
(function(){
 var o=Profile.recordRated;
 Profile.recordRated=function(cat,opp,score){
  var before=Profile.combined()[0];
  var rc=o.apply(this,arguments);
  try{
   var st=V67.state(),raw=V67.raw()[0],c=rc&&rc.length===2?rc[1]-rc[0]:0,D=before>0?before:raw,nd;
   if(score<=0)nd=Math.min(raw,D-Math.max(10,Math.round(Math.abs(c)*0.7)));
   else if(score>=1)nd=Math.max(D,Math.min(raw,D+Math.max(10,Math.round(c*1.2))));
   else nd=Math.max(D-12,Math.min(raw,D+12));
   st.D=Math.max(100,Math.round(nd));st.sig=V67.sig();st.n=V67.rated();st.last={t:Date.now(),s:score,from:D,to:st.D,cat:cat};
   Profile.save();
  }catch(e){}
  return rc;
 };
})();
/* recalcula as notas por categoria com a regra nova, refazendo as partidas valendo pontos do histórico */
V67.migrate=function(){
 var d=Profile.d;if(!d||d.v67mig)return;
 var pl=d.place,start=800;
 try{if(pl&&pl.est)start=Math.max(400,Math.min(2000,pl.method==='critico-v28'?pl.est:V28.toGame(pl.est)));}catch(e){}
 var hist=(d.hist||[]).slice().sort(function(a,b){return (a.t||0)-(b.t||0);});
 (Profile.CATS||['std','rapid','classic','online']).forEach(function(c){
  var r=d.r&&d.r[c];if(!r||!r.games)return;
  var hs=hist.filter(function(h){return h&&h.rated&&(h.cat||'std')===c&&h.oppElo>0&&h.res!=null;});
  if(hs.length!==r.games)return; /* histórico incompleto: mantém a nota */
  var t={elo:start,games:0},w=0,dr=0,l=0,peak=0;
  hs.forEach(function(h){t.elo=Profile.eloStep(t,h.oppElo,h.res);t.games++;if(h.res>=1)w++;else if(h.res<=0)l++;else dr++;if(t.games>=5&&t.elo>peak)peak=t.elo;});
  r.elo=t.elo;r.w=w;r.d=dr;r.l=l;r.peak=peak;r.v67=true;
 });
 d.v67mig=1;d.v67={};Profile.save();
};
if(typeof Profile!=='undefined'){try{if(Profile.d)V67.migrate();}catch(e){}
 var oL67=Profile.load;Profile.load=function(){var r=oL67.apply(this,arguments);try{V67.migrate();}catch(e){}return r;};}
