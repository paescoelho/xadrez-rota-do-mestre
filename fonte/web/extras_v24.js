/* Rota do Mestre v24 — Raio-X do pensamento.
 * Junta, lance a lance: nota do Stockfish (perda de chance), agudeza da posição (vitória/empate/derrota do motor),
 * tempo gasto, peças tocadas (ou olhadas com o mouse no computador), certeza declarada nos problemas e o tema.
 * Daí saem: Raio-X (calma sob fogo, pressa nas posições críticas, calibração da certeza, domínio por tema,
 * tilt com teste estatístico, estilo) e "Pergunte ao seu histórico".
 * Dados pesados (partidas sem limite e registros por lance) ficam no IndexedDB; o perfil continua no localStorage.
 * Só HTML5 (o Flash não carrega esta camada). */

var V24={};
V24.d=function(){var d=Profile.d;if(!d.v24)d.v24={bkt:{},cal:[],cloudDirty:{}};var v=d.v24;if(!v.bkt)v.bkt={};if(!v.cal)v.cal=[];if(!v.cloudDirty)v.cloudDirty={};return v;};
V24.clamp=function(x,a,b){return x<a?a:(x>b?b:x);};
V24.accOf=function(loss){return V24.clamp(103.1668*Math.exp(-0.04354*loss)-3.1669,0,100);};
/* agudeza: chance de resultado decisivo (vitória ou derrota) numa posição ainda em aberto, segundo o modelo do Stockfish.
   Limites calibrados em 700 posições de partidas de mestres do jogo (terços: 0,045 e 0,13). */
V24.SH=[0.045,0.13];
V24.sharpCat=function(w){if(!w)return null;if(w[0]>=900||w[2]>=900)return 'd';var s=(w[0]+w[2])/1000;return s<V24.SH[0]?'c':(s<V24.SH[1]?'m':'a');};
V24.sharpVal=function(w){if(!w)return null;return (w[0]+w[2])/1000;};
V24.CATN={c:'Calmas',m:'Médias',a:'Agudas',d:'Já decididas'};

/* ======================= IndexedDB ======================= */
V24.DB=(function(){
 var api={db:null,p:null,ok:typeof indexedDB!=='undefined'};
 api.open=function(){
  if(api.p)return api.p;
  api.p=new Promise(function(res,rej){
   if(!api.ok){rej(new Error('sem IndexedDB'));return;}
   /* versão 2 (v26): só acrescenta a gaveta 'imp' (partidas importadas); nada do que já existe é apagado */
   var rq=indexedDB.open('rota-do-mestre',2);
   rq.onupgradeneeded=function(){var db=rq.result;
    if(!db.objectStoreNames.contains('games'))db.createObjectStore('games',{keyPath:'t'});
    if(!db.objectStoreNames.contains('moves'))db.createObjectStore('moves',{keyPath:'t'});
    if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv');
    if(!db.objectStoreNames.contains('imp'))db.createObjectStore('imp',{keyPath:'id'});};
   rq.onblocked=function(){try{UiJs.toast('Feche as outras abas do Rota do Mestre para concluir a atualização.');}catch(e){}};
   rq.onsuccess=function(){api.db=rq.result;api.db.onversionchange=function(){try{api.db.close();}catch(e){}api.p=null;};res(api.db);};
   rq.onerror=function(){api.ok=false;rej(rq.error);};
  });
  return api.p;
 };
 function tx(store,mode,fn){return api.open().then(function(db){return new Promise(function(res,rej){var t=db.transaction(store,mode),st=t.objectStore(store),out;try{out=fn(st);}catch(e){rej(e);return;}t.oncomplete=function(){res(out&&out.result!==undefined?out.result:out);};t.onerror=function(){rej(t.error);};});});}
 api.put=function(store,obj,key){return tx(store,'readwrite',function(st){return key!==undefined?st.put(obj,key):st.put(obj);});};
 api.putAll=function(store,arr){return tx(store,'readwrite',function(st){arr.forEach(function(o){st.put(o);});return null;});};
 api.get=function(store,key){return tx(store,'readonly',function(st){return st.get(key);});};
 api.all=function(store){return tx(store,'readonly',function(st){return st.getAll();});};
 api.count=function(store){return tx(store,'readonly',function(st){return st.count();});};
 api.del=function(store,key){return tx(store,'readwrite',function(st){return st.delete(key);});};
 api.clear=function(store){return tx(store,'readwrite',function(st){return st.clear();});};
 return api;
})();

/* ======================= partidas: arquivo sem limite + cópia de segurança do perfil ======================= */
V24.archive=function(rec){if(!rec||!rec.t)return;V24.DB.put('games',JSON.parse(JSON.stringify(rec))).catch(function(){});};
V24.mirrorTimer=null;
V24.mirror=function(){clearTimeout(V24.mirrorTimer);V24.mirrorTimer=setTimeout(function(){try{V24.DB.put('kv',JSON.stringify(Profile.d),'profile').catch(function(){});}catch(e){}},4000);};
V24.boot=function(){
 /* 1) partidas antigas do perfil entram no arquivo; 2) se este aparelho perdeu o perfil (dados do site apagados em parte),
    o espelho no IndexedDB é mesclado de volta; 3) análises interrompidas voltam para a fila */
 if(!V24.DB.ok)return;
 V24.DB.putAll('games',(Profile.d.hist||[]).filter(function(h){return h&&h.t;}).map(function(h){return JSON.parse(JSON.stringify(h));})).catch(function(){});
 V24.DB.get('kv','profile').then(function(raw){
  if(!raw)return;var o=null;try{o=JSON.parse(raw);}catch(e){}
  if(!o||o.v!==4)return;var d=Profile.d,fresh=(!d.hist||!d.hist.length)&&!(d.pzN>0);
  if(fresh&&((o.hist&&o.hist.length)||o.pzN>0)){var m=V23.merge(d,o);if(V23.applyProfile(m,'antes de recuperar do armazenamento interno'))UiJs.toast('Recuperamos o seu progresso guardado neste aparelho.');}
 }).catch(function(){});
 V24.DB.all('moves').then(function(list){list.forEach(function(g){if(!g.done)V24.analyse(g);});}).catch(function(){});
};

/* ======================= registro por lance (fim de cada partida) ======================= */
V24.phaseOf=function(fen){var b=fen.split(' ')[0],mat=0,V={q:9,r:5,b:3,n:3};for(var i=0;i<b.length;i++){var c=b.charAt(i).toLowerCase();if(V[c])mat+=V[c];}var full=+(fen.split(' ')[5]||1);return mat<=26?'f':(full<=12&&mat>=50?'a':'m');};
V24.pieceAt=function(fen,sqName){var rows=fen.split(' ')[0].split('/'),f=sqName.charCodeAt(0)-97,r=8-(+sqName.charAt(1)),row=rows[r],c=0;for(var i=0;i<row.length;i++){var ch=row.charAt(i);if(/\d/.test(ch))c+=+ch;else{if(c===f)return ch.toLowerCase();c++;}}return '';};
V24.capture=function(g,rec){
 if(!g||!g.recs||!rec)return null;
 var m=[];
 g.recs.forEach(function(r){if(!r||!r.fen||!r.uci)return;var tp=r.tp||[],hv=0,tc={};tp.forEach(function(x){tc[x[0]]=1;if(x[2]===1)hv++;});
  m.push({p:r.ply,f:r.fen,u:r.uci,ms:r.ms||0,lf:r.left!=null?r.left:-1,n:Object.keys(tc).length,hv:hv,gr:r.fb&&r.fb.grade||null,cl:r.fb&&r.fb.loss!=null?Math.round(r.fb.loss):null,h:!!r.help,ph:V24.phaseOf(r.fen),pc:V24.pieceAt(r.fen,r.uci.substr(0,2))});});
 if(!m.length)return null;
 var inp=m.some(function(x){return x.hv>0;})?'mouse':'toque';
 return {t:rec.t,col:g.human,res:rec.res,cat:rec.cat,inp:inp,m:m,done:false};
};
/* análise de fundo: só roda quando não há partida em andamento, para não pesar no celular */
V24.queue=[];V24.busy=false;
SF.lowOk=function(){return !(App.G&&App.G.over==null&&App.G.recs);};
V24.analyse=function(gm){V24.queue.push(gm);V24.pump();};
V24.pump=function(){
 if(V24.busy||!V24.queue.length)return;
 if(SF.failed){V24.queue=[];return;}
 var gm=V24.queue.shift();V24.busy=true;
 var i=0;
 function next(){
  while(i<gm.m.length&&gm.m[i].sl!=null)i++;
  if(i>=gm.m.length){finish();return;}
  var mv=gm.m[i];
  SF.go({fen:mv.f,depth:12,movetime:260},function(r){
   if(!r||!r.lines.length||!r.best){V24.busy=false;return;}
   var L=r.lines[0],bs=SF.score(L);mv.wb=Math.round(Coach.winPct(bs));mv.wd=L.wdl||null;mv.b=r.best;
   if(mv.u===r.best){mv.sl=0;mv.wa=mv.wd;i++;save(next);return;}
   SF.go({fen:mv.f,depth:11,movetime:200,searchmoves:mv.u},function(r2){
    if(!r2||!r2.lines.length){V24.busy=false;return;}
    var L2=r2.lines[0];mv.sl=Math.round(Math.max(0,Coach.winPct(bs)-Coach.winPct(SF.score(L2)))*10)/10;mv.wa=L2.wdl||null;
    i++;save(next);
   },true);
  },true);
 }
 var cnt=0;function save(cb){cnt++;if(cnt%6===0)V24.DB.put('moves',gm).catch(function(){});cb();}
 function finish(){gm.done=true;gm.x=V24.summary(gm);V24.DB.put('moves',gm).catch(function(){});
  var h=(Profile.d.hist||[]).filter(function(x){return x.t===gm.t;})[0];
  if(h){h.x=gm.x;V24.d().cloudDirty[gm.t]=1;Profile.save();V24.archive(h);}
  V24.busy=false;V24.refresh();V24.pump();}
 next();
};
setInterval(function(){try{if(typeof SF!=='undefined'&&SF.ready)SF.pump();V24.pump();}catch(e){}},4000);
/* resumo compacto de uma partida (vai para o histórico e para a nuvem) */
V24.summary=function(gm){
 var z={c:[0,0,0],m:[0,0,0],a:[0,0,0],d:[0,0,0]},qa=0,qn=0,sd=0,sdn=0,bl=0,unp=0,accs=[];
 gm.m.forEach(function(mv,k){if(mv.sl==null)return;var c=V24.sharpCat(mv.wd)||'m',err=mv.sl>=10;z[c][0]++;if(err)z[c][1]++;z[c][2]+=mv.ms;accs.push(V24.accOf(mv.sl));
  if(c==='a'||c==='m'){if(mv.ms<5000){qn++;if(err)qa++;}}
  var s0=V24.sharpVal(mv.wd),s1=V24.sharpVal(mv.wa);if(s0!=null&&s1!=null&&c!=='d'){sd+=s1-s0;sdn++;}
  if(mv.sl>=20){bl++;var nx=gm.m[k+1];if(nx&&nx.wb!=null&&mv.wb!=null&&nx.wb>=mv.wb-mv.sl/2)unp++;}});
 var acc=accs.length?Math.round(accs.reduce(function(a,b){return a+b;},0)/accs.length):null;
 return {n:accs.length,z:z,qa:qa,qn:qn,sd:sdn?Math.round(sd/sdn*1000)/1000:0,sdn:sdn,bl:bl,unp:unp,acc:acc,inp:gm.inp};
};

/* ======================= computador: o mouse parado sobre uma peça conta como "olhar" ======================= */
(function(){
 if(typeof document==='undefined')return;
 var timer=null,lastSq=-1;
 function sqFromEl(el){var root=el.parentNode;if(!root||!UiJs.board)return -1;var list=root.querySelectorAll(':scope > .sq');var i=Array.prototype.indexOf.call(list,el);if(i<0)return -1;var r=i>>3,c=i&7;return UiJs.board.flip?(r*8+7-c):((7-r)*8+c);}
 document.addEventListener('pointermove',function(e){
  if(e.pointerType!=='mouse')return;
  var el=e.target&&e.target.closest?e.target.closest('.board .sq'):null;
  var g=App.G;if(!el||!g||g.over!=null||!g.tp||g.pos.turn!==g.human||g.peek!=null){clearTimeout(timer);lastSq=-1;return;}
  var s=sqFromEl(el);if(s===lastSq)return;lastSq=s;clearTimeout(timer);if(s<0)return;
  timer=setTimeout(function(){
   if(App.G!==g||g.over!=null||g.pos.turn!==g.human||!g.tp||g.tp.length>=40)return;
   var nm=Engine.sqName(s),pc=V24.pieceAt(Engine.toFEN(g.pos),nm);if(!pc)return;
   if((g.human===1)!==V24.pieceIsWhite(g,nm))return;
   for(var k=0;k<g.tp.length;k++)if(g.tp[k][0]===s)return;
   g.tp.push([s,Math.round(HxOverrides.now()-g.turnStart),1]);
  },450);
 },{passive:true});
})();
V24.pieceIsWhite=function(g,nm){var rows=Engine.toFEN(g.pos).split(' ')[0].split('/'),f=nm.charCodeAt(0)-97,r=8-(+nm.charAt(1)),row=rows[r],c=0;for(var i=0;i<row.length;i++){var ch=row.charAt(i);if(/\d/.test(ch))c+=+ch;else{if(c===f)return ch===ch.toUpperCase();c++;}}return false;};

/* ======================= domínio por tema (rastreamento bayesiano de conhecimento) ======================= */
/* P(dominou) por tema. Chute e escorregão dependem da dificuldade do problema em relação ao seu rating de problemas:
   problema fácil acertado diz pouco; problema difícil errado também diz pouco. Dominado a partir de 95%. */
V24.SKILLS=null;
V24.isSkill=function(k){if(!V24.SKILLS){V24.SKILLS={};[].concat(Content.MOTIFS,Content.MATE_PATTERNS,Content.ADV_MOTIFS,Content.EG_TYPES,['mateIn4','mateIn5']).forEach(function(x){V24.SKILLS[x]=1;});}return !!V24.SKILLS[k];};
V24.bktUpdate=function(tags,ok,rating){
 if(!tags||!tags.length)return;var v=V24.d(),ur=Profile.d.pzElo||1200,r=rating||ur;
 var E=1/(1+Math.pow(10,(r-ur)/400)),guess=0.08+0.3*E,slip=0.04+0.3*(1-E);
 tags.forEach(function(k){if(!V24.isSkill(k))return;var st=v.bkt[k];
  if(!st){var pc=Profile.themePct(k);st=v.bkt[k]={p:pc>=0?V24.clamp(pc/100*0.85,0.05,0.85):0.25,n:0,ok:0,ex:0};}
  var p=st.p,post=ok?p*(1-slip)/(p*(1-slip)+(1-p)*guess):p*slip/(p*slip+(1-p)*(1-guess));
  st.p=Math.round(V24.clamp(post+(1-post)*0.09,0.01,0.995)*1000)/1000;st.n++;if(ok)st.ok++;st.ex=Math.round((st.ex+E)*100)/100;});
};
V24.mastery=function(k){var st=V24.d().bkt[k];return st&&st.n>=3?Math.round(st.p*100):-1;};

/* ======================= aposta de certeza nos problemas ======================= */
V24.confChips=function(){
 var R=Drills.R;if(!R||!UiJs.cur)return;var t=R.tasks&&R.tasks[R.i];if(!t||t.k!=='pz'||R.state!=='play')return;
 if(R.opts&&(R.opts.storm||R.opts.rush||R.opts.placement))return;
 if(R.step>1)return;
 R.__cf=R.__cf||{};var cur=R.__cf[R.i];
 var box=UiJs.el('div','v24-conf',UiJs.cur);UiJs.el('span','v24-cl',box,'Sua certeza antes de jogar:');
 [50,70,90].forEach(function(c){var b=UiJs.el('button','v24-cb'+(cur===c?' on':''),box,c+'%');b.onclick=function(e){e.stopPropagation();R.__cf[R.i]=c;[].forEach.call(box.querySelectorAll('.v24-cb'),function(x){x.classList.remove('on');});b.classList.add('on');};});
};
V24.calRecord=function(ok,rating){var R=Drills.R;if(!R||!R.__cf)return;var c=R.__cf[R.i];if(!c)return;var v=V24.d();v.cal.push({t:Date.now(),c:c,ok:ok?1:0,r:rating||0});if(v.cal.length>400)v.cal=v.cal.slice(v.cal.length-400);delete R.__cf[R.i];};
(function(){
 var oDraw=Drills.draw;Drills.draw=function(){var r=oDraw.apply(this,arguments);try{V24.confChips();}catch(e){}return r;};
 var oRec=Profile.recordPuzzle;Profile.recordPuzzle=function(id,rating,solved,themes,ms){try{V24.calRecord(solved,rating);V24.bktUpdate(themes,solved,rating);}catch(e){}return oRec.apply(this,arguments);};
 var oSrs=Profile.srsResult;Profile.srsResult=function(kind,id,ok){try{var R=Drills.R,t=R&&R.tasks&&R.tasks[R.i];if(t&&t.k==='pz'){V24.calRecord(ok,t.rating);V24.bktUpdate(t.tags,ok,t.rating);}}catch(e){}return oSrs.apply(this,arguments);};
})();

/* ======================= tilt: o seu é real ou impressão? ======================= */
V24.tilt=function(){
 var hs=(Profile.d.hist||[]).filter(function(h){return h&&h.t&&h.res!=null&&h.human!==true;}).sort(function(a,b){return a.t-b.t;});
 var seq=hs.map(function(h){return h.res===0?1:0;});
 var pairs=[];for(var i=1;i<hs.length;i++)if(hs[i].t-hs[i-1].t<3*3600000)pairs.push([seq[i-1],seq[i]]);
 function stat(pp){var a=0,b=0;pp.forEach(function(x){if(x[0]){a++;if(x[1])b++;}});return a?b/a:0;}
 var nPrev=pairs.filter(function(x){return x[0];}).length,base=seq.length?seq.reduce(function(a,b){return a+b;},0)/seq.length:0,obs=stat(pairs);
 var p=1;if(nPrev>=6){var ge=0,N=1000,fl=pairs.map(function(x){return x[1];});for(var k=0;k<N;k++){var sh=fl.slice();V24.shuffle(sh);var pp=pairs.map(function(x,j){return [x[0],sh[j]];});if(stat(pp)>=obs-1e-9)ge++;}p=ge/N;}
 var accAfter=[],accOther=[];for(var j=1;j<hs.length;j++){var a=hs[j].acc;if(a==null)continue;if(hs[j-1].res===0&&hs[j].t-hs[j-1].t<3*3600000)accAfter.push(a);else accOther.push(a);}
 function avg(x){return x.length?Math.round(x.reduce(function(a,b){return a+b;},0)/x.length):null;}
 return {n:hs.length,nPrev:nPrev,base:base,obs:obs,p:p,accAfter:avg(accAfter),accOther:avg(accOther),nAfter:accAfter.length};
};
V24.shuffle=function(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;};
V24.stopLoss=function(){
 var hs=(Profile.d.hist||[]).filter(function(h){return h&&h.t&&h.human!==true;}).sort(function(a,b){return a.t-b.t;});
 if(hs.length<2)return false;var a=hs[hs.length-1],b=hs[hs.length-2];
 if(a.res!==0||b.res!==0||a.t-b.t>45*60000)return false;
 var accs=hs.slice(-20,-2).map(function(h){return h.acc;}).filter(function(x){return x!=null;});
 var avg=accs.length?accs.reduce(function(x,y){return x+y;},0)/accs.length:null;
 return avg==null||a.acc==null||a.acc<avg-4;
};

/* ======================= agregados do Raio-X ======================= */
V24.agg=function(nGames){
 var hs=(Profile.d.hist||[]).filter(function(h){return h&&h.x&&h.x.n>0;}).sort(function(a,b){return b.t-a.t;}).slice(0,nGames||50);
 var z={c:[0,0,0],m:[0,0,0],a:[0,0,0],d:[0,0,0]},qa=0,qn=0,sd=0,sdn=0,bl=0,unp=0,n=0,inp={};
 hs.forEach(function(h){var x=h.x;n+=x.n;['c','m','a','d'].forEach(function(k){for(var i=0;i<3;i++)z[k][i]+=x.z[k][i];});qa+=x.qa;qn+=x.qn;sd+=x.sd*x.sdn;sdn+=x.sdn;bl+=x.bl;unp+=x.unp;inp[x.inp||'toque']=1;});
 return {games:hs.length,n:n,z:z,qa:qa,qn:qn,sd:sdn?sd/sdn:0,sdn:sdn,bl:bl,unp:unp,inp:Object.keys(inp)};
};
V24.calib=function(){var v=V24.d(),b={50:[0,0],70:[0,0],90:[0,0]},br=0;v.cal.forEach(function(x){if(!b[x.c])return;b[x.c][0]++;b[x.c][1]+=x.ok;var p=x.c/100;br+=(p-x.ok)*(p-x.ok);});return {b:b,n:v.cal.length,brier:v.cal.length?br/v.cal.length:null};};
V24.themesRank=function(){var v=V24.d(),out=[];Object.keys(v.bkt).forEach(function(k){var st=v.bkt[k];if(st.n<5)return;out.push({k:k,p:st.p,n:st.n,acc:st.ok/st.n,ex:st.ex/st.n});});out.sort(function(a,b){return a.p-b.p;});return out;};
/* a recomendação única: o ponto mais fraco com dados suficientes */
V24.suggest=function(){
 var a=V24.agg(40),cal=V24.calib(),th=V24.themesRank(),errRate=function(k){return a.z[k][0]>=8?a.z[k][1]/a.z[k][0]:null;};
 var ea=errRate('a'),ec=errRate('c');
 var list=[];
 if(ea!=null&&ec!=null&&ea>ec*1.6&&ea>=0.2)list.push({sev:ea*100,t:'Calma sob fogo',d:'Você erra '+Math.round(ea*100)+'% dos lances em posições agudas, contra '+Math.round(ec*100)+'% nas calmas.',b:'Problemas longos de cálculo',f:function(){Drills.run('Cálculo em posições agudas',Study.themeTasks('long',10),{back:V24.xray});}});
 if(a.qn>=8&&a.qa/a.qn>=0.3)list.push({sev:a.qa*100/a.qn,t:'Pressa onde não pode',d:Math.round(a.qa*100/a.qn)+'% dos seus lances rápidos (menos de 5 s) em posições abertas foram erros.',b:'Jogar com processo de pensamento',f:function(){App.opts.process=true;App.setupGame();}});
 var b90=cal.b[90];if(b90[0]>=10&&b90[1]/b90[0]<0.75)list.push({sev:(0.9-b90[1]/b90[0])*120,t:'Certeza falsa',d:'Quando você diz 90% de certeza, acerta '+Math.round(b90[1]*100/b90[0])+'%.',b:'Problemas no seu nível',f:function(){var e=Profile.d.pzElo||1200;Drills.run('Problemas com aposta de certeza',Study.pzTasks(Puzzles.pick(null,e-100,e+150,10,Profile.seenMap()),false,'tatica'),{back:V24.xray});}});
 if(th.length&&th[0].p<0.6)list.push({sev:(0.6-th[0].p)*100+20,t:'Tema mais fraco: '+Content.themeName(th[0].k),d:'Domínio estimado de '+Math.round(th[0].p*100)+'% em '+th[0].n+' problemas.',b:'Treinar '+Content.themeName(th[0].k),f:function(){Drills.run(Content.themeName(th[0].k),Study.themeTasks(th[0].k,10),{back:V24.xray});}});
 list.sort(function(x,y){return y.sev-x.sev;});
 return list;
};

/* ======================= telas ======================= */
V24.refresh=function(){try{if(!UiJs.root)return;if(UiJs.root.querySelector('.v24-xray'))V24.xray();else{var e=UiJs.root.querySelector('.v24-end');if(e&&App.G&&App.G.over!=null){e.remove();var st=UiJs.root.querySelector('.v24-stop');if(st)st.remove();V24.endCard();}}}catch(e){}};
V24.pct=function(a,b){return b>0?Math.round(a*100/b):0;};
V24.xray=function(){
 StudyClock.set('estudo');
 UiJs.page('Raio-X do pensamento',Pages.profile);
 var cur=UiJs.cur;cur.classList.add('v24-xray');
 var a=V24.agg(50),cal=V24.calib(),th=V24.themesRank(),tl=V24.tilt();
 UiJs.p('O Stockfish revisa cada lance seu depois da partida, em segundo plano. O Raio-X cruza a qualidade do lance com a dificuldade da posição, o tempo gasto, as peças que você olhou e a certeza que você declarou.','muted');
 if(SF.failed)UiJs.p('Esta versão não tem o Stockfish: o Raio-X lance a lance funciona na versão completa e no site. Certeza, domínio por tema e tilt funcionam aqui.','warn');
 else if(V24.queue.length||V24.busy)UiJs.p('Analisando partidas em segundo plano…','gold');
 if(!a.games)UiJs.p('Jogue uma partida até o fim: o primeiro Raio-X aparece logo depois, quando a análise de fundo terminar.','warn');
 var sug=V24.suggest();
 if(sug.length){UiJs.h('O que treinar agora');var s=sug[0];UiJs.p(s.t,'gold');UiJs.p(s.d);UiJs.btns([[s.b,s.f,'pri']]);}
 if(a.games){
  UiJs.h('Calma sob fogo');
  UiJs.p(a.games+' partidas · '+a.n+' lances analisados'+(a.inp.length?' · entrada: '+a.inp.join(' e '):''),'muted small');
  ['c','m','a','d'].forEach(function(k){var z=a.z[k];if(!z[0])return;var er=V24.pct(z[1],z[0]);UiJs.bar(V24.CATN[k]+' · '+z[0]+' lances · '+Math.round(z[2]/z[0]/1000)+' s/lance',er,er>=30?'bad':(er>=15?'warn':'good'),er+'% de erros');});
  UiJs.p('Erro = lance que perde 10% ou mais de chance de vitória. Posição aguda = alta chance de alguém ganhar se errar.','muted small');
  if(a.qn>=5)UiJs.p('Pressa: '+a.qn+' lances em menos de 5 s em posições ainda abertas; '+V24.pct(a.qa,a.qn)+'% deles foram erros.',V24.pct(a.qa,a.qn)>=30?'bad':'');
  if(a.sdn>=20)UiJs.p(a.sd>0.004?'Estilo: você complica. Depois dos seus lances, a posição fica mais aguda do que estava.':(a.sd<-0.004?'Estilo: você simplifica. Depois dos seus lances, a posição fica mais calma.':'Estilo: equilibrado. Seus lances quase não mudam o quanto a posição é aguda.'),'gold');
  if(a.bl>=3)UiJs.p('Sorte: das suas '+a.bl+' gafes, '+a.unp+' não foram punidas ('+V24.pct(a.unp,a.bl)+'%). Contra adversários mais fortes, elas seriam.','muted');
 }
 UiJs.h('Sua certeza é confiável?');
 if(cal.n<6)UiJs.p('Nos problemas, toque em 50%, 70% ou 90% antes de jogar. Com algumas apostas, o jogo mostra se a sua certeza bate com os acertos.','muted');
 else{[50,70,90].forEach(function(c){var b=cal.b[c];if(!b[0])return;var r=V24.pct(b[1],b[0]);UiJs.bar('Disse '+c+'% · '+b[0]+' vezes',r,Math.abs(r-c)<=10?'good':(r<c?'bad':'warn'),'acertou '+r+'%');});
  UiJs.p(cal.brier!=null?'Nota de calibração (Brier): '+cal.brier.toFixed(2)+'. Quanto menor, melhor; 0,25 é o mesmo que chutar.':'','muted small');
  UiJs.p('Enxadristas de rating baixo superestimam a própria força e os mais fortes são calibrados (estudo com 3.388 jogadores de torneio, 2025). Ajustar a certeza é parte de ficar forte.','muted small');}
 UiJs.h('Domínio por tema');
 if(!th.length)UiJs.p('Resolva problemas por tema: com 5 ou mais em um tema, o domínio aparece aqui.','muted');
 else{var weak=th.slice(0,4),strong=th.slice(-3).reverse().filter(function(x){return weak.indexOf(x)<0;});
  UiJs.items(weak.concat(strong).map(function(x){var vs=Math.round((x.acc-x.ex)*100);return {t:Content.themeName(x.k),d:'Acerto '+Math.round(x.acc*100)+'% · esperado para o seu nível '+Math.round(x.ex*100)+'% ('+(vs>=0?'+':'')+vs+')',r:'domínio '+Math.round(x.p*100)+'%',ok:x.p>=0.95,f:function(){Drills.run(Content.themeName(x.k),Study.themeTasks(x.k,10),{back:V24.xray});}};}));
  UiJs.p('Domínio é a probabilidade estimada de você já saber o padrão (rastreamento bayesiano de conhecimento). Acima de 95% o tema conta como dominado.','muted small');}
 UiJs.h('Tilt: real ou impressão?');
 if(tl.nPrev<6)UiJs.p('Ainda há poucas derrotas seguidas de outra partida para testar. O teste aparece com mais partidas.','muted');
 else{UiJs.p('Depois de uma derrota, você perde a seguinte em '+Math.round(tl.obs*100)+'% das vezes (média geral: '+Math.round(tl.base*100)+'%).');
  UiJs.p(tl.p<0.05?'Tilt confirmado: em 1.000 sorteios dos seus resultados, só '+Math.round(tl.p*1000)+' ficaram tão ruins por acaso. Depois de perder, faça uma pausa ou treine problemas antes de jogar de novo.':'Sem prova de tilt: '+Math.round(tl.p*100)+'% dos sorteios aleatórios dos seus resultados ficaram iguais ou piores. As sequências de derrota podem ser só acaso.',tl.p<0.05?'bad':'good');
  if(tl.accAfter!=null&&tl.nAfter>=3&&tl.accOther!=null)UiJs.p('Precisão depois de derrota: '+tl.accAfter+'% · nas outras: '+tl.accOther+'%.','muted');}
 UiJs.btns([['Pergunte ao seu histórico',function(){V24.ask();},'pri'],['Mapa do pensamento',function(){Mind.page();}]]);
};

/* ---------- Pergunte ao seu histórico: métrica × dimensão ---------- */
V24.Q={m:'err',d:'sh',n:50};
V24.METRICS=[['err','Erros (%)'],['acc','Precisão'],['tm','Tempo por lance'],['luck','Sorte']];
V24.DIMS=[['sh','Agudeza'],['ph','Fase'],['tq','Tempo gasto'],['pc','Peça movida'],['col','Cor'],['ae','Depois de um erro'],['clk','Relógio'],['inp','Toque ou mouse']];
V24.dimVal=function(d,mv,g,prev){
 switch(d){
  case 'sh':return V24.CATN[V24.sharpCat(mv.wd)||'m'];
  case 'ph':return {a:'Abertura',m:'Meio-jogo',f:'Final'}[mv.ph];
  case 'tq':return mv.ms<5000?'Menos de 5 s':(mv.ms<30000?'5 a 30 s':'Mais de 30 s');
  case 'pc':return {p:'Peão',n:'Cavalo',b:'Bispo',r:'Torre',q:'Dama',k:'Rei'}[mv.pc]||'?';
  case 'col':return g.col===1?'De Brancas':'De Pretas';
  case 'ae':return prev&&prev.sl>=10?'Logo depois de um erro':'Normal';
  case 'clk':return mv.lf<0?'Sem relógio':(mv.lf<0.15?'Relógio apertado (<15%)':'Relógio confortável');
  case 'inp':return g.inp==='mouse'?'Mouse (computador)':'Toque (celular)';
 }
 return '?';
};
V24.ask=function(){
 UiJs.page('Pergunte ao seu histórico',V24.xray);
 var Q=V24.Q;
 UiJs.p('Escolha o que medir e por onde separar. Usa os lances analisados neste aparelho.','muted');
 function chips(title,list,key){UiJs.h(title);UiJs.btns(list.map(function(x){return [x[1],function(){Q[key]=x[0];V24.ask();},Q[key]===x[0]?'pri':''];}));}
 chips('Medir',V24.METRICS,'m');chips('Separar por',V24.DIMS,'d');
 UiJs.btns([[20,'Últimas 20'],[50,'Últimas 50'],[0,'Todas']].map(function(x){return [x[1],function(){Q.n=x[0];V24.ask();},Q.n===x[0]?'pri':''];}));
 var box=UiJs.el('div','v24-ans',UiJs.cur);box.textContent='Calculando…';
 V24.DB.all('moves').then(function(list){
  list=list.filter(function(g){return g.m&&g.m.some(function(mv){return mv.sl!=null;});}).sort(function(a,b){return b.t-a.t;});
  if(Q.n)list=list.slice(0,Q.n);
  var G={},all=[0,0,0];
  list.forEach(function(g){g.m.forEach(function(mv,k){if(mv.sl==null)return;var prev=k>0?g.m[k-1]:null,key=V24.dimVal(Q.d,mv,g,prev),o=G[key]||(G[key]=[0,0,0]);var val;
   if(Q.m==='err')val=mv.sl>=10?1:0;else if(Q.m==='acc')val=V24.accOf(mv.sl);else if(Q.m==='tm')val=mv.ms/1000;else{if(mv.sl<20)return;var nx=g.m[k+1];val=nx&&nx.wb!=null&&mv.wb!=null&&nx.wb>=mv.wb-mv.sl/2?1:0;}
   o[0]++;o[1]+=val;all[0]++;all[1]+=val;});});
  box.innerHTML='';
  if(!all[0]){UiJs.el('p','p muted',box,'Ainda não há lances analisados. Termine uma partida e espere a análise de fundo (alguns segundos).');return;}
  var unit=Q.m==='tm'?' s':'%',fmt=function(o){var v=o[1]/o[0];return Q.m==='err'||Q.m==='luck'?Math.round(v*100):Math.round(v*(Q.m==='tm'?10:1))/(Q.m==='tm'?10:1);};
  var mean=fmt(all),keys=Object.keys(G).sort(function(a,b){return G[b][0]-G[a][0];}),mx=0;keys.forEach(function(k){var v=fmt(G[k]);if(v>mx)mx=v;});
  var hd=UiJs.el('p','p gold',box,'Média geral: '+mean+unit+' ('+all[0]+(Q.m==='luck'?' gafes':' lances')+')');
  var worst=null;keys.forEach(function(k){var o=G[k];if(o[0]<12)return;var v=fmt(o),bad=Q.m==='acc'?mean-v:v-mean;if(Q.m==='tm'||Q.m==='luck')bad=-1e9;if(!worst||bad>worst.bad)worst={k:k,v:v,bad:bad};});
  keys.forEach(function(k){var o=G[k],v=fmt(o),row=UiJs.el('div','v24-row',box);
   row.innerHTML='<div class="v24-rl"><b>'+V23.esc(k)+'</b><span>'+v+unit+' · '+o[0]+'</span></div><div class="v24-rb"><i style="width:'+(mx?Math.max(3,Math.round(v*100/(Q.m==='acc'?100:mx))):3)+'%"></i></div>'+(o[0]<12?'<em>poucos dados</em>':'');});
  if(worst&&worst.bad>(Q.m==='acc'?4:5))UiJs.el('p','p bad',box,'Seu pior cenário: '+worst.k.toLowerCase()+' ('+worst.v+unit+', média '+mean+unit+').');
 }).catch(function(){box.textContent='Este navegador não permite o armazenamento interno (IndexedDB).';});
};

/* ---------- card do Raio-X na tela de fim de partida ---------- */
V24.endCard=function(){
 var g=App.G;if(!g||g.over==null||!UiJs.cur)return;
 if(UiJs.cur.querySelector('.v24-end'))return;
 var box=UiJs.el('div','v24-end',null),firstBtns=UiJs.cur.querySelector('.btns');
 /* logo acima dos botões de revisão/análise, para ser visto sem rolar */
 if(firstBtns&&firstBtns.parentNode===UiJs.cur)UiJs.cur.insertBefore(box,firstBtns);else UiJs.cur.appendChild(box);
 var h=(Profile.d.hist||[]).filter(function(x){return x.t===g.__v24t;})[0];
 var html='<b>Raio-X desta partida</b>';
 if(h&&h.x){var x=h.x,ag=x.z.a,cm=x.z.c;var er=function(n){return ' ('+n+(n===1?' erro)':' erros)');};html+='<span>Precisão (Stockfish): '+(x.acc!=null?x.acc+'%':'—')+' · posições agudas: '+ag[0]+(ag[0]?er(ag[1]):'')+' · calmas: '+cm[0]+(cm[0]?er(cm[1]):'')+'</span>';
  if(x.qn)html+='<span>Lances rápidos (<5 s) em posições abertas: '+x.qn+', erros: '+x.qa+'</span>';}
 else if(g.__v24t&&SF.failed)html+='<span>O Raio-X lance a lance precisa do Stockfish, que não vem na versão leve. Use a versão completa ou o site.</span>';
 else if(g.__v24t)html+='<span>O Stockfish está revisando seus lances em segundo plano…</span>';
 else html+='<span>Partida curta demais para o Raio-X.</span>';
 box.innerHTML=html;
 if(V24.stopLoss()){var s=UiJs.el('div','v24-stop',null);box.parentNode.insertBefore(s,box.nextSibling);s.innerHTML='<b>Pausa recomendada</b><span>Duas derrotas seguidas e a precisão caiu. Antes da próxima partida, 10 minutos de problemas recolocam o cálculo no lugar.</span>';
  var bt=UiJs.el('button','btn pri',s,'10 min de problemas');bt.onclick=function(){var e=Profile.d.pzElo||1200;Drills.run('Pausa ativa',Study.pzTasks(Puzzles.pick(null,e-200,e+50,10,Profile.seenMap()),false,'tatica'),{back:App.menu});};}
 var b=UiJs.el('button','btn',box,'Abrir o Raio-X');b.onclick=V24.xray;
};

/* ======================= ganchos nos menus que já existem ======================= */
(function(){
 /* fim de partida: guarda no arquivo, registra lance a lance e manda para a análise de fundo */
 var oAdd=Profile.addHistory;
 Profile.addHistory=function(rec){
  var r=oAdd.apply(this,arguments);
  try{V24.archive(rec);var g=App.G;if(g&&g.recs&&g.over!=null&&rec&&rec.t&&rec.human!==true){g.__v24t=rec.t;var gm=V24.capture(g,rec);if(gm){V24.DB.put('moves',gm).catch(function(){});V24.analyse(gm);}}
   if(navigator.storage&&navigator.storage.persist&&!V24.d().persistAsked){V24.d().persistAsked=1;navigator.storage.persist().catch(function(){});}}catch(e){}
  return r;
 };
 var oSave=Profile.save;Profile.save=function(){var r=oSave.apply(this,arguments);V24.mirror();return r;};
 var oDraw=App.drawGame;App.drawGame=function(){var r=oDraw.apply(this,arguments);try{V24.endCard();}catch(e){}return r;};
 /* nuvem: partidas cujo resumo do Raio-X chegou depois do envio sobem de novo */
 var oPush=V23.Cloud.push;V23.Cloud.push=function(force){
  try{var v=V24.d(),dirty=Object.keys(v.cloudDirty||{});if(dirty.length&&V23.Cloud.user&&V23.Cloud.loaded){var vv=V23.d(),min=Math.min.apply(null,dirty.map(Number));if(vv.cloudGamesT&&min<=vv.cloudGamesT)vv.cloudGamesT=min-1;v.cloudDirty={};}}catch(e){}
  return oPush.apply(this,arguments);
 };
 /* mesclagem de perfis (backup e nuvem) também cobre os dados do Raio-X */
 var oMerge=V23.merge;V23.merge=function(a,b){
  var out=oMerge(a,b);if(!a||!b)return out;var va=a.v24||{},vb=b.v24||{};
  if(a.v24||b.v24){var o=out.v24=JSON.parse(JSON.stringify(((b.upd||0)>(a.upd||0)?vb:va)||{}));
   o.bkt={};[va.bkt||{},vb.bkt||{}].forEach(function(m){Object.keys(m).forEach(function(k){if(!o.bkt[k]||(m[k].n||0)>(o.bkt[k].n||0))o.bkt[k]=m[k];});});
   var seen={},cal=[];(va.cal||[]).concat(vb.cal||[]).forEach(function(x){var id=x.t+'|'+x.c;if(!seen[id]){seen[id]=1;cal.push(x);}});cal.sort(function(x,y){return x.t-y.t;});o.cal=cal.slice(-400);o.cloudDirty={};}
  return out;
 };
 /* Painel de evolução: botão do Raio-X ao lado de Relógio e Conta */
 var oProf=Pages.profile;Pages.profile=function(){var r=oProf.apply(this,arguments);try{var row=UiJs.cur.querySelector('.v23-pbox .btns');if(row){var b=UiJs.el('button','btn pri',null,'Raio-X do pensamento');b.onclick=V24.xray;row.insertBefore(b,row.firstChild);}}catch(e){}return r;};
 /* Mapa do pensamento: o achado principal do Raio-X no topo */
 var oMind=Mind.page;Mind.page=function(){var r=oMind.apply(this,arguments);try{var sug=V24.suggest(),box=UiJs.el('div','v24-mcard',null);box.innerHTML='<b>Raio-X do pensamento</b><span>'+(sug.length?V23.esc(sug[0].t+': '+sug[0].d):'Agudeza, pressa, certeza, domínio por tema e tilt, lance a lance.')+'</span>';box.onclick=V24.xray;box.setAttribute('role','button');UiJs.cur.insertBefore(box,UiJs.cur.firstChild);}catch(e){}return r;};
 /* Centro de Treino: a recomendação do Raio-X logo abaixo do relógio de estudo */
 var oTr=App.training;App.training=function(){var r=oTr.apply(this,arguments);try{var m=UiJs.root.querySelector('.menu.hub'),clock=m&&m.querySelector('.v23-clock');var sug=V24.suggest();if(m&&sug.length){var s=sug[0],card=UiJs.el('div','v24-sug',null);card.innerHTML='<b>Treino sugerido pelo Raio-X</b><span>'+V23.esc(s.t)+'</span>';card.onclick=s.f;card.setAttribute('role','button');if(clock&&clock.nextSibling)m.insertBefore(card,clock.nextSibling);else m.appendChild(card);}}catch(e){}return r;};
 /* Conta e backup: instalar como app */
 var oAcc=V23.account;V23.account=function(){var r=oAcc.apply(this,arguments);try{V24.installUI();}catch(e){}return r;};
 Pages.sync=V23.account;
})();

/* ======================= instalar como app (PWA) ======================= */
V24.installEvt=null;
if(typeof window!=='undefined'){window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();V24.installEvt=e;});}
V24.installUI=function(){
 var standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
 if(!/^https?:$/.test(location.protocol))return;
 UiJs.h('Instalar no aparelho');
 if(standalone){UiJs.p('O jogo já está instalado como aplicativo neste aparelho.','good');return;}
 if(V24.installEvt){UiJs.p('Instale o jogo na tela inicial: abre como aplicativo, funciona sem internet e guarda o progresso com mais segurança.','muted');UiJs.btns([['Instalar o app',function(){var e=V24.installEvt;V24.installEvt=null;e.prompt();e.userChoice.then(function(){V23.account();});},'pri']]);}
 else if(/iphone|ipad|ipod/i.test(navigator.userAgent))UiJs.p('No iPhone: toque em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".','muted');
 else UiJs.p('No menu do navegador, procure "Instalar app" ou "Adicionar à tela inicial".','muted');
 UiJs.h('Versão em arquivo único');
 UiJs.p('Para jogar sem instalar nada, num computador sem internet ou para guardar uma cópia: baixe o jogo inteiro num só arquivo .html. A versão leve não tem o Stockfish nem a abertura em vídeo.','muted');
 UiJs.btns([['Baixar versão completa',function(){location.href='baixar/Rota-do-Mestre-offline.html';}],['Baixar versão leve',function(){location.href='baixar/Rota-do-Mestre-offline-leve.html';}]]);
};

if(typeof document!=='undefined')setTimeout(function(){try{V24.boot();}catch(e){}},3000);
