/* Rota do Mestre v28 — avaliação de força mais crítica.
 * 1) Os problemas do banco usam a escala de dificuldade do Lichess, que fica bem acima da força em partidas para
 *    quem está começando. Toda estimativa vinda de problemas é convertida para a escala de partidas:
 *    partida ≈ 0,8 × problema − 250 (conservador; não calibrado contra rating oficial).
 * 2) O Nivelamento continua com as mesmas 36 posições adaptativas, mas:
 *    - começa mais fácil para quem não tem histórico;
 *    - o passo da adaptação diminui ao longo do teste (antes era fixo e alto, e o resultado oscilava);
 *    - o resultado final é a estimativa mais provável considerando TODAS as respostas (não só a última),
 *      partindo da suposição de iniciante e exigindo evidência para subir;
 *    - acerto lento vale menos (mais de 90 s: 60%; mais de 3 min: 30%); perguntas de abertura que aceitam
 *      vários lances pesam metade;
 *    - mostra a faixa provável (incerteza) junto do número.
 * 3) O Elo combinado só usa partidas reais com peso alto; problemas e "adivinhe o lance" entram convertidos e com peso menor. */
var V28={};
V28.toGame=function(p){return Math.round(Math.max(100,Math.min(2700,0.8*p-250)));};
V28.fromGame=function(g){return Math.round((g+250)/0.8);};
V28.E=function(r,d){return 1/(1+Math.pow(10,(d-r)/400));};
V28.credit=function(x){if(!x.ok)return 0;var s=x.ms||0;if(x.attempts>1||x.hints>0)return 0;return s>180000?0.3:(s>90000?0.6:1);};
/* estimativa mais provável (escala dos problemas), com suposição inicial de iniciante: média 800, desvio 350 */
V28.map=function(res,mu,sd){
 mu=mu||800;sd=sd||350;var best=mu,bl=-1e18,L=function(R){var s=-(R-mu)*(R-mu)/(2*sd*sd);
  for(var i=0;i<res.length;i++){var x=res[i];if(x.rating==null)continue;var w=x.k==='q'?0.5:1,c=V28.credit(x),e=Math.min(0.999,Math.max(0.001,V28.E(R,x.rating)));s+=w*(c*Math.log(e)+(1-c)*Math.log(1-e));}return s;};
 for(var R=100;R<=3000;R+=5){var l=L(R);if(l>bl){bl=l;best=R;}}
 /* incerteza pela curvatura (informação de Fisher) */
 var info=1/(sd*sd);for(var i=0;i<res.length;i++){var x=res[i];if(x.rating==null)continue;var w=x.k==='q'?0.5:1,e=V28.E(best,x.rating),k=Math.LN10/400;info+=w*k*k*e*(1-e);}
 return {r:best,se:Math.round(1/Math.sqrt(info))};
};

if(typeof Mestre!=='undefined'){
 /* começa mais fácil: sem histórico, o primeiro problema fica perto de 850 na escala dos problemas */
 Mestre.initialEstimate=function(){var p=Profile.d.place;if(p&&p.method==='critico-v28'&&p.pz)return Mestre.clamp(p.pz,600,2650);return Mestre.clamp(Profile.d.pzN>30?Math.min(Profile.d.pzElo,1400):850,600,2200);};
 /* passo que diminui: 260 no início, ~70 no fim (antes: 330 fixo) */
 Mestre.ratingStep=function(rating,task,answer){var r=Drills.R,n=r&&r.res?r.res.length:0,K=Math.max(70,260-n*6);var p=Mestre.expected(rating,task.rating||1000);var y=V28.credit(answer);return Mestre.clamp(Math.round(rating+K*(y-p)),400,2900);};
 var oldPR=Mestre.placementResult;
 Mestre.placementResult=function(res){
  var base=oldPR(res),m=V28.map(res,800,350),g=V28.toGame(m.r),lo=V28.toGame(m.r-2*m.se),hi=V28.toGame(m.r+2*m.se);
  base.est=g;base.pz=m.r;base.lo=lo;base.hi=hi;base.method='critico-v28';
  base.step=g<850?1:g<1050?2:g<1250?3:g<1450?4:g<1650?5:g<1800?6:g<1950?7:g<2100?8:g<2250?9:10;
  return base;
 };
}
/* o Nivelamento ajusta a pontuação de problemas na escala dos problemas (não na de partidas) */
(function(){
 if(typeof Pages==='undefined')return;
 var oldRes=Pages.placementResult;
 Pages.placementResult=function(r){
  if(r&&r.method==='critico-v28'&&r.pz&&Profile.d.pzN<15&&Profile.d.pzElo!==r.pz){Profile.d.pzElo=Math.round(r.pz);Profile.save();}
  oldRes(r);
  if(r&&r.method==='critico-v28'&&UiJs.cur){
   var box=UiJs.el('div','v28-note',UiJs.cur);
   box.innerHTML='<b>Faixa provável: '+r.lo+' a '+r.hi+'</b><span>Avaliação crítica: parte da suposição de iniciante e só sobe com acertos consistentes, de primeira e sem demorar. Os problemas usam a escala de dificuldade do Lichess, que fica acima da força em partidas; por isso o número é convertido para a escala de partidas. É uma estimativa interna, não um rating oficial. Jogar partidas contra o computador é o que mais deixa o número preciso.</span>';
  }
 };
})();

/* Elo combinado mais crítico */
Profile.combined=function(){
 var d=Profile.d,parts=[],bestGame=0,games=0;
 (Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=d.r&&d.r[c];if(!r)return;if(r.games>=5&&r.elo>bestGame)bestGame=r.elo;games+=r.games||0;});
 if(bestGame>0)parts.push(['Partidas',bestGame,0.7*Math.min(1,games/20)]);
 if(d.pzN>=20)parts.push(['Problemas',V28.toGame(d.pzElo),0.2*Math.min(1,d.pzN/100)]);
 var md=d.model||[];
 if(md.length>=3){var s=0,n=0;for(var i=md.length-1;i>=0&&n<5;i--){s+=md[i].perf;n++;}parts.push(['Adivinhe o lance',V28.toGame(s/n),0.08*Math.min(1,md.length/8)]);}
 var pl=d.place;
 if(pl&&pl.est){var pe=pl.method==='critico-v28'?pl.est:V28.toGame(pl.est);parts.push(['Nivelamento',pe,parts.length===0?1:0.15]);}
 var sw=0,sv=0;parts.forEach(function(p){sw+=p[2];sv+=p[1]*p[2];});
 var val=sw>0?Math.round(sv/sw):0;
 /* sem partidas suficientes, o número fica limitado: força em partida só se comprova jogando */
 if(val>0&&games<10)val=Math.min(val,1000+games*20);
 return [val,parts.map(function(p){return [p[0],Math.round(p[1]),p[2]];})];
};
