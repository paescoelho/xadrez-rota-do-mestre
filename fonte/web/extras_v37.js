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
/* v69: nível escolhido na primeira vez (como no Chess.com) */
V67.LV={novo:{s:400,n:'Novo no xadrez',d:'Estou aprendendo as regras ou jogo muito pouco'},regras:{s:800,n:'Sei jogar',d:'Conheço as regras e jogo de vez em quando'},freq:{s:1200,n:'Jogo com frequência',d:'Jogo bastante e conheço táticas básicas'}};
V67.CAPN=30;
V67.start=function(){var l=Profile.d&&Profile.d.v69lvl;return l&&V67.LV[l]?V67.LV[l].s:400;};
V67.wins=function(){var w=0,dr=0,l=0;(Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=Profile.d.r&&Profile.d.r[c];if(r){w+=r.w||0;dr+=r.d||0;l+=r.l||0;}});return {w:w,d:dr,l:l};};
V67.rated=function(){var n=0;(Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=Profile.d.r&&Profile.d.r[c];if(r)n+=r.games||0;});return n;};
/* cálculo bruto (o da v29, com o teto por resultados em vez de por partidas jogadas) */
V67.raw=function(){
 var d=Profile.d,parts=[],bestGame=0,games=0,main=V67.main(),CS=Profile.CATS||['std','rapid','classic','online'];
 CS.forEach(function(c){var r=d.r&&d.r[c];if(!r)return;if(r.games>=5&&r.elo>bestGame)bestGame=r.elo;games+=r.games||0;});
 /* v69: treino nunca vale mais que 100 acima do que as partidas mostram (sem partidas: o nível escolhido) */
 var ref=main>0?main:V67.start(),ac=d.v29acc;
 if(ac&&ac.n>=3){var f=Math.min(1,ac.n/10),ap=Math.min(ac.perf,ref+100);parts.push(['Precisão nas partidas',ap,1.4*f*f]);games+=ac.imp||0;}
 if(main>0)parts.push([bestGame>0?'Partidas':'Partidas (provisória)',main,Math.max(0.5,0.7*Math.min(1,games/20))]);
 if(d.pzN>=20)parts.push(['Problemas',Math.min(V28.toGame(d.pzElo),ref+100),0.1*Math.min(1,d.pzN/100)]);
 var md=d.model||[];
 if(md.length>=3){var s=0,n=0;for(var i=md.length-1;i>=0&&n<5;i--){s+=md[i].perf;n++;}parts.push(['Adivinhe o lance',Math.min(V28.toGame(s/n),ref+100),0.05*Math.min(1,md.length/8)]);}
 var pl=d.place;
 if(pl&&pl.est){var pe=pl.method==='critico-v28'?pl.est:V28.toGame(pl.est);parts.push(['Nivelamento',pe,parts.length===0?1:0.15]);}
 try{if(typeof V32!=='undefined'&&V32.ext)V32.ext().forEach(function(x){parts.push(x);});}catch(e){}
 var sw=0,sv=0;parts.forEach(function(p){sw+=p[2];sv+=p[1]*p[2];});
 var val=sw>0?Math.round(sv/sw):0;
 /* v69: rigor máximo — até 30 partidas valendo pontos o número parte do nível escolhido, sobe só 12 por vitória e 4 por empate
    e nunca passa a sua melhor nota em partidas; depois disso, nunca passa 50 acima dela. Conta do Lichess confirmada libera. */
 var wr=V67.wins(),verified=typeof V32!=='undefined'&&V32.verified&&V32.verified();
 if(val>0&&!verified){
  if(V67.rated()<V67.CAPN){var cap=V67.start()+12*wr.w+4*wr.d;if(main>0)cap=Math.min(cap,main);
   if(val>cap){val=cap;parts.push(['Limite de iniciante ('+V67.start()+' + 12 por vitória)',cap,0]);}}
  else if(main>0&&val>main+50){val=main+50;parts.push(['Limite pelos resultados',val,0]);}
 }
 var out=parts.map(function(p){return [p[0],Math.round(p[1]),p[2]];});
 var dc=val>0?V29.decay():{amt:0};
 if(dc.amt>0){val=Math.max(100,val-dc.amt);out.push(['Inatividade',-dc.amt,0]);}
 return [val,out];
};
/* a sua nota principal em partidas: a maior entre as categorias jogadas */
V67.main=function(){var m=0;(Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=Profile.d.r&&Profile.d.r[c];if(r&&r.games>0&&r.elo>m)m=r.elo;});return m;};

/* o que, se mudar, recalcula o número do zero (nivelamento novo, conta do Lichess confirmada) */
V67.sig=function(){var d=Profile.d,pl=d.place,li=null;try{li=V32.d().li;}catch(e){}return ['v69',d.v69lvl||'-',pl&&(pl.t||pl.est)||0,li&&li.ver?(li.t||1):0].join('|');};
V67.state=function(){var d=Profile.d;if(!d.v67||typeof d.v67!=='object')d.v67={};return d.v67;};
Profile.combined=function(){
 var r=V67.raw(),st=V67.state(),sig=V67.sig();
 if(!(r[0]>0))return r;
 if(st.D==null||st.sig!==sig){st.D=r[0];st.sig=sig;st.n=V67.rated();try{Profile.save();}catch(e){}return r;}
 /* v69: entre partidas o número fica parado: treino não sobe nem desce; só a inatividade tira pontos */
 if(r[0]>st.D){r[1].push(['Treino a confirmar jogando','+'+(r[0]-st.D),0]);r[0]=st.D;}
 else if(r[0]<st.D){var ina=r[1].some(function(x){return x[0]==='Inatividade';});
  if(ina){st.D=r[0];try{Profile.save();}catch(e){}}else{r[1].push(['Ajuste a confirmar jogando',r[0]-st.D,0]);r[0]=st.D;}}
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
   /* v69: derrota tira no mínimo 15; vitória sobe no máximo 80% do que a categoria subiu; empate quase nunca sobe */
   if(!(before>0))nd=raw; /* primeira partida: o número nasce da própria partida */
   else if(score<=0)nd=Math.min(raw,D-Math.max(15,Math.abs(c)));
   else if(score>=1)nd=Math.max(D,Math.min(raw,D+Math.max(1,Math.round(c*0.8))));
   else nd=Math.min(raw,D+Math.max(-15,Math.min(4,c)));
   st.D=Math.max(100,Math.round(nd));st.sig=V67.sig();st.n=V67.rated();st.last={t:Date.now(),s:score,from:D,to:st.D,cat:cat};
   Profile.save();
  }catch(e){}
  return rc;
 };
})();
/* recalcula as notas por categoria com a regra nova, refazendo as partidas valendo pontos do histórico */
V67.migrate=function(){
 var d=Profile.d;if(!d||d.v67mig)return;
 var pl=d.place,start=d.v69lvl?V67.start():800;
 try{if(!d.v69lvl&&pl&&pl.est)start=Math.max(400,Math.min(2000,pl.method==='critico-v28'?pl.est:V28.toGame(pl.est)));}catch(e){}
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

/* ======================= v69 — rigor máximo =======================
 * Mais duro que Chess.com e Lichess (que usam Glicko, simétrico):
 *  - K menor (40 nas 5 primeiras, 24 até 30 partidas, 16 depois);
 *  - vitória vale metade (máx. +12 nas 5 primeiras, +8 depois; mín. +1);
 *  - derrota vale o dobro (mín. −20 nas 5 primeiras, −12 depois);
 *  - empate: ganho pela metade (máx. +4), perda em dobro; empate contra igual tira 4;
 *  - problemas (treino): ganho ×0,4, perda ×1,5.
 */
Profile.kOf=function(r){var g=r.games||0;return g<5?40:(g<30?24:((r.elo||0)>=2400?10:16));};
Profile.eloStep=function(r,opp,score){
 var k=Profile.kOf(r),e=Profile.expected(r.elo,opp),d=k*(score-e),prov=(r.games||0)<5;
 if(score<=0)d=Math.min(d*2,prov?-20:-12);
 else if(score>=1)d=Math.max(1,Math.min(d*0.5,prov?12:8));
 else d=d>0?Math.min(d*0.5,4):Math.min(d*2,-4);
 return Math.max(100,Math.round(r.elo+d));
};
Profile.startElo=function(){
 var s=V67.start();
 /* categoria nova começa na sua nota principal (nunca acima do nível + 12 por vitória) */
 var m=V67.main();if(m>0)return Math.max(100,Math.min(m,s+12*V67.wins().w));
 return s;
};
(function(){
 var o=Profile.recordPuzzle;
 Profile.recordPuzzle=function(){
  var b=Profile.d.pzElo,rr=o.apply(this,arguments);
  try{var dl=Profile.d.pzElo-b;if(dl>0)dl=Math.max(1,Math.round(dl*0.4));else if(dl<0)dl=Math.round(dl*1.5);
   Profile.d.pzElo=Math.max(100,b+dl);if(rr&&rr.length>1)rr[1]=Profile.d.pzElo;Profile.save();}catch(e){}
  return rr;
 };
})();
/* escolhe o nível e refaz as partidas do histórico a partir dele */
V67.setLevel=function(l){
 var d=Profile.d;if(!d||!V67.LV[l])return;
 d.v69lvl=l;d.v69t=Date.now();
 var start=V67.LV[l].s,hist=(d.hist||[]).slice().sort(function(a,b){return (a.t||0)-(b.t||0);});
 (Profile.CATS||['std','rapid','classic','online']).forEach(function(c){
  var r=d.r&&d.r[c];if(!r||!r.games)return;
  var hs=hist.filter(function(h){return h&&h.rated&&(h.cat||'std')===c&&h.oppElo>0&&h.res!=null;});
  if(hs.length===r.games){
   var t={elo:start,games:0},w=0,dr=0,ls=0,peak=0;
   hs.forEach(function(h){t.elo=Profile.eloStep(t,h.oppElo,h.res);t.games++;if(h.res>=1)w++;else if(h.res<=0)ls++;else dr++;if(t.games>=5&&t.elo>peak)peak=t.elo;});
   r.elo=t.elo;r.w=w;r.d=dr;r.l=ls;r.peak=peak;
  }else{ /* histórico incompleto: no máximo o nível + 12 por vitória */
   r.elo=Math.max(100,Math.min(r.elo||start,start+12*(r.w||0)));r.peak=Math.min(r.peak||0,r.elo);
  }
  r.v69=true;
 });
 d.v67={};d.v67mig=1;Profile.save();
};
V67.ask=function(done){
 if(document.querySelector('.v69-ov'))return;
 var ov=document.createElement('div');ov.className='v69-ov';
 var h='<div class="v69-card" role="dialog" aria-modal="true" aria-labelledby="v69t"><div class="v69-ico">♞</div><h2 id="v69t">Qual é o seu nível no xadrez?</h2>'+
  '<p>Isso define seu ponto de partida no ranking. Aqui subir é difícil: vitória vale pouco, derrota custa caro.</p><div class="v69-ops">';
 Object.keys(V67.LV).forEach(function(k){var v=V67.LV[k];h+='<button class="v69-op" data-l="'+k+'"><b>'+v.n+'</b><i>'+v.d+'</i><span>'+v.s+'</span></button>';});
 h+='</div><small>Escolha com honestidade: a escolha vale para este perfil.</small></div>';
 ov.innerHTML=h;document.body.appendChild(ov);
 ov.querySelectorAll('.v69-op').forEach(function(b){b.onclick=function(){V67.setLevel(b.getAttribute('data-l'));ov.remove();try{if(done)done();}catch(e){}};});
};
(function(){
 var o=App.menu;
 App.menu=function(){var r=o.apply(this,arguments);try{if(Profile.d&&!Profile.d.v69lvl)setTimeout(function(){if(Profile.d&&!Profile.d.v69lvl)V67.ask(function(){App.menu();});},350);}catch(e){}return r;};
})();
