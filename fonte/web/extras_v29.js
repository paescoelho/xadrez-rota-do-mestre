/* Rota do Mestre v29 — avaliação ainda mais precisa e crítica.
 * 1) Precisão nas partidas: a precisão média dos seus lances (partidas do app analisadas no Raio-X e partidas
 *    importadas no Laboratório) vira uma estimativa de força. Com 10 ou mais partidas analisadas ela passa a
 *    ser a parte de maior peso do Elo, porque mostra como você joga de verdade.
 * 2) Sorte não conta: problema de um lance só vale 70% do acerto (dá para acertar no chute) e o Nivelamento
 *    prefere problemas de vários lances.
 * 3) Revalidação: nas questões 12, 24 e 33 entra um "gêmeo" de um problema que você acertou antes (mesmo tema,
 *    dificuldade parecida). Se errar o gêmeo, o acerto original passa a valer metade.
 * 4) Tempo proporcional à dificuldade: limite = 30 s + (dificuldade − 600)/10 s. Dentro do limite vale 100%,
 *    até o dobro vale 60%, acima disso 30%.
 * 5) Inatividade: depois de 21 dias sem treinar, o Elo perde 2 pontos por dia (no máximo 150) e a faixa
 *    provável fica mais larga. Volta ao normal com 5 partidas ou um novo Nivelamento.
 * 6) Notas por área (tática, cálculo, finais, abertura). A nota geral do Nivelamento é
 *    70% da estimativa com todas as respostas + 30% da pior área com pelo menos 5 questões. */
var V29={TWIN_AT:[11,23,32],AREAS:[['tatica','Tática'],['calculo','Cálculo'],['finais','Finais'],['abertura','Abertura']],
 GENERIC:{short:1,long:1,veryLong:1,oneMove:1,middlegame:1,opening:1,endgame:1,advantage:1,crushing:1,equality:1,master:1,masterVsMaster:1,superGM:1}};

/* ---------- 4 + 2 + 3: crédito de cada resposta ---------- */
V29.limitMs=function(rating){return Math.max(30000,30000+((rating||1000)-600)*100);};
V28.credit=function(x){
 if(!x||!x.ok||x.attempts>1||x.hints>0)return 0;
 var lim=V29.limitMs(x.rating),s=x.ms||0,c=s<=lim?1:(s<=2*lim?0.6:0.3);
 if(x.k==='pz'&&x.nm===1)c*=0.7;           /* um lance só: pode ter sido chute */
 if(x.halved)c*=0.5;                        /* errou o gêmeo deste problema */
 return c;
};
/* marca os acertos cujo gêmeo foi errado */
V29.mark=function(res){
 var by={};res.forEach(function(x){if(x&&x.id!=null)by[x.id]=x;});
 res.forEach(function(x){if(x&&x.twinOf&&by[x.twinOf]){var o=by[x.twinOf];if(!x.ok||x.attempts>1||x.hints>0)o.halved=true;else delete o.halved;}});
 return res;
};
(function(){var om=V28.map;V28.map=function(res,mu,sd){V29.mark(res);return om(res,mu,sd);};})();

/* guarda no resultado de cada questão quantos lances o problema pede, os temas e de quem ela é gêmea */
(function(){
 if(typeof Drills==='undefined')return;
 var oRec=Drills.record;
 Drills.record=function(ok){
  var t=null;try{t=Drills.task&&Drills.task();}catch(e){}
  var out=oRec.apply(this,arguments),r=Drills.R,last=r&&r.res&&r.res[r.res.length-1];
  if(last&&t&&last.id===t.id){if(t.moves)last.nm=Math.max(1,Math.floor(t.moves.length/2));if(t.tags)last.tags=t.tags;if(t.twinOf)last.twinOf=t.twinOf;}
  return out;
 };
})();

/* ---------- 2 + 3: escolha das questões do Nivelamento ---------- */
V29.themes=function(p){return (p.tags||[]).filter(function(t){return !V29.GENERIC[t]&&!/^mateIn/.test(t);});};
V29.twin=function(r){
 var used=r.adaptiveUsed||{},old=Profile.d.placeSeen||[],done={};
 r.res.forEach(function(x){if(x.twinOf)done[x.twinOf]=1;});
 var cand=r.res.filter(function(x){return x.k==='pz'&&x.ok&&!(x.attempts>1)&&!x.hints&&!x.twinOf&&!done[x.id]&&x.tags;})
  .sort(function(a,b){return (b.rating||0)-(a.rating||0);});
 Puzzles.load();
 for(var i=0;i<cand.length;i++){
  var o=cand[i],th=V29.themes(o);if(!th.length)continue;var want=Math.max(1,o.nm||1);
  var ps=Puzzles.list.filter(function(p){return !used[p.id]&&old.indexOf(p.id)<0&&p.id!==o.id&&Math.abs(p.rating-o.rating)<=80&&p.hasAny(th)&&Math.floor(p.moves.length/2)>=Math.min(want,2);});
  if(!ps.length)continue;
  var p=ps[Math.floor(Math.random()*Math.min(8,ps.length))];used[p.id]=true;
  var t=Study.pzTask(p,o.dim==='calculo',o.dim);t.twinOf=o.id;return t;
 }
 return null;
};
if(typeof Mestre!=='undefined'){
 Mestre.nextTask=function(r){
  var idx=r?r.res.length:0;
  if(r&&V29.TWIN_AT.indexOf(idx)>=0){var tw=V29.twin(r);if(tw)return tw;}
  var target=r?r.adaptiveRating:Mestre.initialEstimate(),dim=Mestre.dims[idx%Mestre.dims.length];
  var used=r?r.adaptiveUsed:Object.create(null),old=Profile.d.placeSeen||[];
  var tags=dim==='calculo'?['long','veryLong','mateIn3']:dim==='finais'?['endgame']:null;
  if(dim==='abertura'){
   var qs=Content.placeX().filter(function(x){return x.cat==='opening'&&!used['place:'+x.fen]&&old.indexOf('place:'+x.fen)<0;});
   if(qs.length){qs.sort(function(a,b){return Math.abs(a.rating-target)-Math.abs(b.rating-target);});var x=qs[0];used['place:'+x.fen]=true;return {k:'q',id:'place:'+x.fen,fen:x.fen,accept:x.accept,q:x.q,rating:x.rating,dim:'abertura',note:'Compare o controle central, a atividade das peças e a segurança dos reis.'};}
  }
  Puzzles.load();
  var ok=function(p){return (!tags||p.hasAny(tags))&&(dim!=='calculo'||p.moves.length>=4);};
  var candidates=Puzzles.list.filter(function(p){return !used[p.id]&&old.indexOf(p.id)<0&&ok(p);});
  if(!candidates.length)candidates=Puzzles.list.filter(function(p){return !used[p.id]&&(!tags||p.hasAny(tags));});
  if(!candidates.length)candidates=Puzzles.list.filter(function(p){return !used[p.id];});
  if(!candidates.length)return null;
  var near=candidates.filter(function(p){return Math.abs(p.rating-target)<=230;});if(near.length>=3)candidates=near;
  /* prefere problemas de dois ou mais lances: acertar no chute fica bem mais difícil */
  var multi=candidates.filter(function(p){return p.moves.length>=4;});if(multi.length>=3)candidates=multi;
  var pool=candidates.slice().sort(function(a,b){return Math.abs(a.rating-target)-Math.abs(b.rating-target);}).slice(0,40);
  var chosen=pool[Math.floor(Math.random()*Math.min(12,pool.length))];used[chosen.id]=true;
  return Study.pzTask(chosen,dim==='calculo',dim);
 };

 /* ---------- 6: nota por área e nota geral puxada pela pior área ---------- */
 var oPR=Mestre.placementResult;
 Mestre.placementResult=function(res){
  V29.mark(res);
  var base=oPR(res),all=V28.map(res,800,350),areas={},worst=null;
  V29.AREAS.forEach(function(a){
   var sub=res.filter(function(x){return (x.dim||'tatica')===a[0];});if(!sub.length)return;
   var m=V28.map(sub,800,350),okN=sub.filter(function(x){return V28.credit(x)>0;}).length;
   areas[a[0]]={r:V28.toGame(m.r),pz:m.r,n:sub.length,ok:okN,se:m.se};
   if(sub.length>=5&&(worst===null||m.r<worst.pz))worst={k:a[0],pz:m.r};
  });
  var pz=worst?Math.round(0.7*all.r+0.3*worst.pz):all.r,g=V28.toGame(pz);
  base.pz=pz;base.est=g;base.lo=V28.toGame(pz-2*all.se);base.hi=V28.toGame(pz+2*all.se);
  base.areas=areas;base.worst=worst?worst.k:null;
  base.twins=res.filter(function(x){return x.twinOf;}).length;
  base.twinFail=res.filter(function(x){return x.halved;}).length;
  base.single=res.filter(function(x){return x.k==='pz'&&x.nm===1;}).length;
  base.step=g<850?1:g<1050?2:g<1250?3:g<1450?4:g<1650?5:g<1800?6:g<1950?7:g<2100?8:g<2250?9:10;
  base.method='critico-v28';base.v=29;
  return base;
 };
}

/* ---------- 1: precisão nas partidas ---------- */
/* precisão média dos lances (fórmula de precisão do Lichess, motor em profundidade baixa) → força aproximada.
 * Tabela conservadora; não é calibrada contra rating oficial. */
V29.ACC=[[50,250],[60,450],[70,750],[78,1050],[84,1400],[89,1750],[93,2100],[96,2450],[98,2700]];
V29.accToElo=function(a){var T=V29.ACC;if(a<=T[0][0])return T[0][1];for(var i=1;i<T.length;i++)if(a<=T[i][0]){var p=T[i-1],q=T[i];return Math.round(p[1]+(a-p[0])*(q[1]-p[1])/(q[0]-p[0]));}return T[T.length-1][1];};
V29.MINPLY=10;
V29.calcAcc=function(){
 var games=[];
 (Profile.d.hist||[]).forEach(function(h){if(h&&h.x&&h.x.acc!=null&&h.x.n>=V29.MINPLY)games.push({t:h.t||h.date||0,acc:h.x.acc,n:h.x.n,src:'app'});});
 var done=function(imp){
  (imp||[]).forEach(function(r){if(!r||r.src==='app'||!r.an||!r.an.m)return;var pl=[];try{pl=V26.minePlies(r);}catch(e){}
   var a=[];pl.forEach(function(k){var m=r.an.m[k];if(m&&m.sl!=null)a.push(V24.accOf(m.sl));});
   if(a.length>=V29.MINPLY)games.push({t:r.t||r.date||0,acc:a.reduce(function(s,v){return s+v;},0)/a.length,n:a.length,src:'imp'});});
  games.sort(function(a,b){return (b.t>a.t)?1:(b.t<a.t?-1:0);});
  var g=games.slice(0,30),sw=0,sv=0;g.forEach(function(x){var w=Math.min(40,x.n);sw+=w;sv+=x.acc*w;});
  var acc=sw?sv/sw:null,o=acc==null?null:{n:g.length,imp:g.filter(function(x){return x.src==='imp';}).length,acc:Math.round(acc*10)/10,perf:V29.accToElo(acc),day:Profile.today()};
  var prev=JSON.stringify(Profile.d.v29acc||null);Profile.d.v29acc=o;if(JSON.stringify(o)!==prev)Profile.save();
  return o;
 };
 if(typeof V24==='undefined'||!V24.DB||!V24.DB.ok||typeof V26==='undefined')return Promise.resolve(done([]));
 return V24.DB.all('imp').then(done,function(){return done([]);});
};
V29.accTimer=null;
V29.queueAcc=function(ms){clearTimeout(V29.accTimer);V29.accTimer=setTimeout(function(){V29.calcAcc().catch(function(){});},ms||1500);};
(function(){
 if(typeof window==='undefined')return;
 V29.queueAcc(4000);
 if(typeof V26!=='undefined'&&V26.analyseGame){var oa=V26.analyseGame;V26.analyseGame=function(rec,cb){return oa.call(this,rec,function(){V29.queueAcc();if(cb)return cb.apply(this,arguments);});};}
 if(typeof V26!=='undefined'&&V26.importText){var oi=V26.importText;V26.importText=function(){var r=oi.apply(this,arguments);V29.queueAcc(2500);return r;};}
 var oh=Profile.addHistory;Profile.addHistory=function(r){var o=oh.apply(this,arguments);V29.queueAcc(3000);return o;};
})();

/* ---------- 5: inatividade ---------- */
V29.gamesTotal=function(){var d=Profile.d,g=0;(Profile.CATS||['std','rapid','classic','online']).forEach(function(c){var r=d.r&&d.r[c];if(r)g+=r.games||0;});return g+((d.v29acc&&d.v29acc.imp)||0);};
V29.decayOf=function(gap){return gap>21?Math.min(150,2*(gap-21)):0;};
(function(){
 var ot=Profile.touch;
 Profile.touch=function(){
  var dl=Profile.d.daily,t=Profile.today();
  if(dl&&dl.last>0&&dl.last!==t){var amt=V29.decayOf(t-dl.last);if(amt>0)Profile.d.v29dec={amt:amt,day:t,g0:V29.gamesTotal(),gap:t-dl.last};}
  return ot.apply(this,arguments);
 };
})();
V29.decay=function(){
 var d=Profile.d,dl=d.daily,t=Profile.today(),live=0,gap=0;
 if(dl&&dl.last>0){gap=t-dl.last;live=V29.decayOf(gap);}
 var st=0,dec=d.v29dec;
 if(dec&&dec.amt){var pl=d.place;
  if(pl&&pl.day>=dec.day)st=0;
  else st=Math.round(dec.amt*Math.max(0,1-(V29.gamesTotal()-dec.g0)/5));
  if(st<=0&&!live){delete d.v29dec;}
 }
 return live>=st?{amt:live,gap:gap,pending:live>0}:{amt:st,gap:dec?dec.gap:0,pending:false,left:Math.max(0,5-(V29.gamesTotal()-dec.g0))};
};

/* ---------- Elo combinado ---------- */
Profile.combined=function(){
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
 /* força em partida só se comprova jogando: com menos de 10 partidas o número fica limitado */
 if(val>0&&games<10&&!(ac&&ac.n>=10)&&!(typeof V32!=='undefined'&&V32.verified&&V32.verified()))val=Math.min(val,1000+games*20);
 var out=parts.map(function(p){return [p[0],Math.round(p[1]),p[2]];});
 var dc=val>0?V29.decay():{amt:0};
 if(dc.amt>0){val=Math.max(100,val-dc.amt);out.push(['Inatividade',-dc.amt,0]);}
 return [val,out];
};
/* faixa provável do Elo combinado (mais larga com pouca informação e depois de inatividade) */
V29.range=function(){
 var c=Profile.combined(),v=c[0];if(!v)return null;
 var d=Profile.d,pl=d.place,hw=pl&&pl.hi&&pl.lo?Math.round((pl.hi-pl.lo)/2):250,ac=d.v29acc;
 if(ac&&ac.n>=10)hw=Math.min(hw,140);else if(ac&&ac.n>=5)hw=Math.min(hw,190);
 var dc=V29.decay();hw+=Math.round(dc.amt*0.8);
 return {v:v,lo:Math.max(100,v-hw),hi:v+hw,decay:dc};
};

/* ---------- telas ---------- */
V29.areaBars=function(parent,areas,worst){
 var box=UiJs.el('div','v29-areas',parent);
 V29.AREAS.forEach(function(a){var x=areas&&areas[a[0]];var row=UiJs.el('div','v29-arow'+(worst===a[0]?' worst':''),box);
  UiJs.el('span','v29-an',row,a[1]);
  var bar=UiJs.el('span','v29-ab',row),fill=UiJs.el('i','',bar);
  if(x){fill.style.width=Math.max(4,Math.min(100,(x.r-100)/16))+'%';}
  UiJs.el('span','v29-av',row,x?(x.n<5?'~'+x.r:String(x.r)):'—');
  UiJs.el('span','v29-ac',row,x?x.ok+'/'+x.n:'sem dados');
 });
 return box;
};
(function(){
 if(typeof Pages==='undefined')return;
 var oRes=Pages.placementResult;
 Pages.placementResult=function(r){
  oRes(r);
  if(!r||r.v!==29||!UiJs.cur)return;
  var wrap=UiJs.el('div','v29-box',UiJs.cur);
  UiJs.el('b','',wrap,'Nota por área');
  V29.areaBars(wrap,r.areas,r.worst);
  var notes=[];
  if(r.worst&&r.areas[r.worst])notes.push('A nota geral leva 30% da sua área mais fraca ('+(V29.AREAS.filter(function(a){return a[0]===r.worst;})[0]||['',''])[1].toLowerCase()+'): xadrez se perde no ponto fraco.');
  if(r.twins)notes.push('Revalidação: '+r.twins+(r.twins===1?' problema gêmeo':' problemas gêmeos')+(r.twinFail?' · '+r.twinFail+(r.twinFail===1?' acerto anterior caiu pela metade':' acertos anteriores caíram pela metade'):' · todos confirmados')+'.');
  if(r.single)notes.push(r.single+(r.single===1?' problema de um lance só (vale 70%, pode ser chute).':' problemas de um lance só (valem 70%, podem ser chute).'));
  notes.push('Tempo: o limite cresce com a dificuldade (30 s + 10 s a cada 100 pontos acima de 600). Até o limite vale tudo; até o dobro, 60%; depois disso, 30%.');
  notes.forEach(function(s){UiJs.el('span','',wrap,s);});
  var a=r.areas||{},few=V29.AREAS.filter(function(x){return a[x[0]]&&a[x[0]].n<5;}).map(function(x){return x[1].toLowerCase();});
  if(few.length)UiJs.el('span','muted',wrap,'"~" = poucas questões ('+few.join(', ')+'): nota indicativa.');
 };
 var oProf=Pages.profile;
 Pages.profile=function(){
  var out=oProf.apply(this,arguments);
  try{
   var cur=UiJs.cur;if(!cur)return out;
   var anchor=null;cur.querySelectorAll('p,.p').forEach(function(p){if(!anchor&&/O Elo estimado combina/.test(p.textContent))anchor=p;});
   var box=document.createElement('div');box.className='v29-box';
   var rg=V29.range(),d=Profile.d,ac=d.v29acc,pl=d.place;
   if(rg){var b=document.createElement('b');b.textContent='Faixa provável: '+rg.lo+' a '+rg.hi;box.appendChild(b);}
   var line=function(t,c){var s=document.createElement('span');if(c)s.className=c;s.textContent=t;box.appendChild(s);};
   if(ac&&ac.n){line('Precisão nas partidas: '+String(ac.acc).replace('.',',')+'% em '+ac.n+(ac.n===1?' partida':' partidas')+' analisadas → cerca de '+ac.perf+'. '+(ac.n>=10?'Já é a parte de maior peso do seu Elo.':ac.n<3?'Entra no Elo a partir de 3 partidas analisadas.':'Com 10 partidas analisadas passa a ser a parte de maior peso (faltam '+(10-ac.n)+').'));}
   else line('Precisão nas partidas: jogue no app ou importe partidas no Laboratório do Pensamento. Com 10 partidas analisadas, a sua precisão real passa a ser a parte de maior peso do Elo.','muted');
   if(rg&&rg.decay.amt>0){
    line(rg.decay.pending?('Você está há '+rg.decay.gap+' dias sem treinar: −'+rg.decay.amt+' pontos até voltar (2 por dia depois de 21 dias, no máximo 150).'):('Inatividade de '+rg.decay.gap+' dias: −'+rg.decay.amt+' pontos. Recupera com '+(rg.decay.left||5)+(rg.decay.left===1?' partida':' partidas')+' ou com um novo Nivelamento.'),'warn');
   }
   if(pl&&pl.areas){var h=document.createElement('b');h.textContent='Nivelamento por área';h.style.marginTop='8px';box.appendChild(h);V29.areaBars(box,pl.areas,pl.worst);}
   if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else cur.appendChild(box);
  }catch(e){}
  return out;
 };
})();
