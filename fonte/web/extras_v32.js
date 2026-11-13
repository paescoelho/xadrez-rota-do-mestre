/* Rota do Mestre v32 — conta Google, contas de xadrez, Aula da semana e calibração pelo Lichess.
 * 1) Conta Google (opcional): liga a base da v23 (perfil na nuvem, mesclagem entre aparelhos) no projeto Firebase do jogo.
 *    Quem já joga como anônimo é "promovido" para a conta Google, sem perder nada (nem as partidas ao vivo abertas).
 *    Os nomes no Lichess e no Chess.com ficam no perfil e vão junto para a nuvem. Ao abrir o jogo, as partidas novas
 *    de lá são importadas sozinhas (no máximo a cada 3 horas) e analisadas em segundo plano.
 * 2) Aula da semana: o erro que mais se repete nas suas partidas de lá, a lição, as suas posições e problemas parecidos.
 *    Cada posição crítica das partidas importadas vira um cartão da revisão espaçada ("Seus erros"), que volta até você acertar.
 * 3) Entrar com Lichess (OAuth com PKCE, sem senha e sem segredo): confirma que a conta é sua, lê os ratings e devolve a
 *    autorização na hora. O rating de lá entra no Elo daqui com peso alto (conversão aproximada, mostrada na tela).
 * Nada aqui pede ou guarda senha. A chave de acesso do Lichess é usada uma vez e revogada. */
var V32={LI:'https://lichess.org',CLIENT:'rota-do-mestre',AUTO_MS:3*3600000};
V32.d=function(){var d=Profile.d;if(!d.v32)d.v32={};var v=d.v32;if(!v.rt)v.rt={};if(!v.rh)v.rh=[];return v;};
V32.acc=function(){return V26.d();};                     /* v26 guarda lichess/chesscom e os nomes do jogador */
V32.esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V32.base=function(){return location.origin+location.pathname.replace(/index\.html$/,'');};
V32.web=function(){return /^https?:$/.test(location.protocol);};
V32.when=function(t){if(!t)return '';var d=new Date(t);return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);};

/* ======================= 1. conta Google ======================= */
(function(){
 if(typeof V23==='undefined'||!V23.Cloud||typeof V31==='undefined')return;
 var C=V23.Cloud;
 C.cfg=V31.FB;
 C.configured=function(){return V31.ready();};
 C.load=function(){
  if(C.loaded)return Promise.resolve();
  if(!C.web())return Promise.reject(new Error('arquivo local'));
  if(C.loadP)return C.loadP;
  C.loading=true;
  C.loadP=V31.fbBoot().then(function(){
   C.loaded=true;C.loading=false;
   firebase.auth().onAuthStateChanged(function(u){
    var g=u&&!u.isAnonymous?u:null,was=C.user;C.user=g;
    if(g){V23.d().cloudOn=true;C.status='Conectado como '+(g.email||g.displayName||'Google');if(!was||was.uid!==g.uid){C.pull();try{localStorage.setItem('rdm-conta',g.email||'1');}catch(e){}}}
    else C.status='';
    C.refresh();V32.refreshBoxes();
   });
  }).catch(function(e){C.loading=false;C.loadP=null;throw e;});
  return C.loadP;
 };
 C.login=function(){
  var go=function(){
   var auth=firebase.auth(),pr=new firebase.auth.GoogleAuthProvider(),u=auth.currentUser;
   pr.setCustomParameters({prompt:'select_account'});
   var cred=function(e){return (e&&e.credential)||(firebase.auth.GoogleAuthProvider.credentialFromError?firebase.auth.GoogleAuthProvider.credentialFromError(e):null);};
   var p=u&&u.isAnonymous?u.linkWithPopup(pr).catch(function(e){var c=cred(e);if(e&&/already-in-use/.test(e.code||'')&&c)return auth.signInWithCredential(c);throw e;}):auth.signInWithPopup(pr);
   return p.then(function(){V23.d().cloudOn=true;Profile.save();UiJs.toast('Pronto! Seu progresso agora fica salvo na sua conta Google.');})
    .catch(function(e){
     var c=e&&e.code||'';
     if(/popup-closed|cancelled-popup/.test(c))return;
     if(/popup-blocked|operation-not-supported/.test(c))return auth.signInWithRedirect(pr);
     UiJs.toast('Não foi possível entrar ('+(c||e&&e.message||'erro')+').');
    });
  };
  /* a janela do Google precisa abrir no mesmo toque: se o Firebase ainda não carregou, carrega e pede um segundo toque */
  if(C.loaded){go();return;}
  UiJs.toast('Preparando o login… toque de novo em "Entrar com Google".');
  C.load().catch(function(e){UiJs.toast('Sem conexão com o Google agora.');});
 };
 C.logout=function(){
  if(!C.loaded)return;
  UiJs.modal('Sair da conta Google?','O progresso continua salvo neste aparelho e na sua conta. Para voltar a sincronizar, é só entrar de novo.',[['Sair',function(){
   firebase.auth().signOut().then(function(){V23.d().cloudOn=false;Profile.save();try{localStorage.removeItem('rdm-conta');}catch(e){}V31.boot=null;UiJs.toast('Você saiu da conta.');V23.account();});
  },'warn'],['Continuar conectado',null,'pri']]);
 };
 C.wipe=function(){
  if(!C.user)return;
  UiJs.modal('Apagar seus dados da nuvem?','Apaga o perfil e as partidas guardadas na sua conta Google. O que está neste aparelho continua aqui. Não dá para desfazer.',[['Apagar da nuvem',function(){
   var db=firebase.firestore(),ref=db.collection('users').doc(C.user.uid);
   ref.collection('games').get().then(function(gs){var b=db.batch(),n=0;gs.forEach(function(g){if(n<450){b.delete(g.ref);n++;}});b.delete(ref);return b.commit();})
    .then(function(){V23.d().cloudGamesT=0;V23.d().cloudOn=false;Profile.save();return firebase.auth().signOut();})
    .then(function(){UiJs.toast('Seus dados foram apagados da nuvem.');V23.account();},function(e){UiJs.toast('Não deu certo: '+(e&&e.code||'erro'));});
  },'warn'],['Cancelar',null,'pri']]);
 };
 /* quem entrou antes reconecta ao abrir o jogo (a v23 também tenta; o load é o mesmo) */
 if(V32.web())setTimeout(function(){try{var on=V23.d().cloudOn;var mark=null;try{mark=localStorage.getItem('rdm-conta');}catch(e){}if(on||mark)C.load().catch(function(){});}catch(e){}},1200);
 /* a tela "Conta e backup" já começa a carregar o Firebase, para o botão do Google abrir a janela no primeiro toque */
 var oAcc=V23.account;
 V23.account=function(){
  if(C.web()&&!C.loaded)C.load().then(function(){if(UiJs.root.querySelector('.v23-acct'))V23.account();}).catch(function(){});
  var r=oAcc.apply(this,arguments);
  try{
   var cur=UiJs.cur,h=null;[].forEach.call(cur.querySelectorAll('h2,h3,.h'),function(x){if(!h&&/Backup em arquivo/.test(x.textContent))h=x;});
   var box=document.createElement('div');box.className='v32-sec';
   if(h)cur.insertBefore(box,h);else cur.appendChild(box);
   var keep=UiJs.cur;UiJs.cur=box;
   if(C.user)UiJs.btns([['Apagar meus dados da nuvem',C.wipe,'warn']]);
   UiJs.h('Contas de xadrez');
   V32.chessForm(box);
   UiJs.cur=keep;
  }catch(e){}
  return r;
 };
})();

/* ======================= contas de xadrez (Lichess e Chess.com) ======================= */
V32.setUser=function(site,name){
 name=String(name||'').trim().replace(/^@/,'');var a=V32.acc(),v=V32.d();
 if(site==='li'){if(V26.nk(a.lichess)!==V26.nk(name)){a.lichess=name;if(v.li&&V26.nk(v.li.user)!==V26.nk(name))v.li=null;v.liSince=0;delete v.rt.li;}}
 else{if(V26.nk(a.chesscom)!==V26.nk(name)){a.chesscom=name;delete v.rt.cc;}}
 if(name)V26.addName(name);
 v.lastAuto=0;Profile.save();
};
V32.chessForm=function(parent){
 var a=V32.acc(),v=V32.d(),li=v.li,box=UiJs.el('div','v32-acc',parent);
 var row=function(label,site,val,ph){
  var w=UiJs.el('label','fld',box);UiJs.el('span','fl',w,label);var i=UiJs.el('input','fi',w);i.type='text';i.value=val||'';i.placeholder=ph;i.autocomplete='off';i.autocapitalize='off';i.spellcheck=false;
  i.onchange=function(){V32.setUser(site,i.value);V32.chessForm.redraw(parent);};
  return i;
 };
 row('Usuário no Lichess','li',a.lichess,'ex.: seu_usuario');
 var st=UiJs.el('div','v32-st',box);
 if(li&&li.ver&&V26.nk(li.user)===V26.nk(a.lichess))st.innerHTML='<b class="ok">✓ Conta do Lichess confirmada</b> em '+V32.when(li.t)+'. '+V32.rtLine('li');
 else if(a.lichess)st.innerHTML='<span>Ainda não confirmada.</span> '+V32.rtLine('li');
 else st.innerHTML='<span>Sem conta? Crie grátis em lichess.org.</span>';
 if(a.lichess||!li)UiJs.btns([[li&&li.ver?'Confirmar de novo com o Lichess':'Entrar com Lichess (confirmar que é sua)',V32.liStart,li&&li.ver?'':'pri']]);
 row('Usuário no Chess.com','cc',a.chesscom,'ex.: seu_usuario');
 var s2=UiJs.el('div','v32-st',box);s2.innerHTML=a.chesscom?V32.rtLine('cc'):'<span>O Chess.com não oferece login para outros apps: basta o nome de usuário (as partidas de lá são públicas).</span>';
 UiJs.p('O jogo nunca pede a senha dessas contas. As partidas novas são importadas sozinhas quando você abre o jogo e analisadas aqui, para virar a sua Aula da semana.','muted small');
 if(a.lichess||a.chesscom)UiJs.btns([['Buscar partidas novas agora',function(){V32.auto(true,true);}]]);
};
V32.chessForm.redraw=function(parent){try{parent.innerHTML='';var keep=UiJs.cur;UiJs.cur=parent;UiJs.h('Contas de xadrez');V32.chessForm(parent);UiJs.cur=keep;}catch(e){}};
V32.PERF={li:[['rapid','rápidas'],['classical','clássicas'],['blitz','blitz'],['bullet','bullet']],cc:[['chess_rapid','rápidas'],['chess_daily','por dia'],['chess_blitz','blitz'],['chess_bullet','bullet']]};
V32.rtLine=function(site){
 var r=V32.d().rt[site];if(!r||!r.p)return '';
 var out=[];V32.PERF[site].forEach(function(k){var x=r.p[k[0]];if(x&&x.n>0)out.push(k[1]+' '+x.r+(x.prov?'?':'')+' ('+x.n+')');});
 return out.length?'<span class="v32-rt">Ratings: '+out.join(' · ')+'</span>':'';
};

/* ======================= ratings públicos (sem login) ======================= */
V32.fetchRatings=function(force){
 var a=V32.acc(),v=V32.d(),now=Date.now(),jobs=[];
 if(a.lichess&&(force||!v.rt.li||now-v.rt.li.t>20*3600000))jobs.push(fetch(V32.LI+'/api/user/'+encodeURIComponent(a.lichess)).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){
  var p={};Object.keys(j.perfs||{}).forEach(function(k){var x=j.perfs[k];if(x&&x.rating)p[k]={r:x.rating,n:x.games||0,prov:!!x.prov};});v.rt.li={t:now,p:p};}).catch(function(){}));
 if(a.chesscom&&(force||!v.rt.cc||now-v.rt.cc.t>20*3600000))jobs.push(fetch('https://api.chess.com/pub/player/'+encodeURIComponent(V26.nk(a.chesscom))+'/stats').then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){
  var p={};['chess_rapid','chess_blitz','chess_bullet','chess_daily'].forEach(function(k){var x=j[k];if(x&&x.last){var rc=x.record||{};p[k]={r:x.last.rating,n:(rc.win||0)+(rc.loss||0)+(rc.draw||0),prov:false};}});v.rt.cc={t:now,p:p};}).catch(function(){}));
 if(!jobs.length)return Promise.resolve();
 return Promise.all(jobs).then(function(){
  var snap={t:now};['li','cc'].forEach(function(s){var b=V32.best(s);if(b){snap[s]=b.r;snap[s+'k']=b.k;}});
  var last=v.rh[v.rh.length-1];if(!last||now-last.t>20*3600000)v.rh.push(snap);if(v.rh.length>90)v.rh=v.rh.slice(-90);
  Profile.save();V32.refreshBoxes();
 });
};
/* melhor ritmo para comparar: rápidas > clássicas > blitz, com pelo menos 15 partidas e rating firme */
V32.best=function(site){
 var r=V32.d().rt[site];if(!r||!r.p)return null;var L=V32.PERF[site];
 for(var i=0;i<L.length;i++){var x=r.p[L[i][0]];if(x&&x.n>=15&&!x.prov&&L[i][0]!=='bullet'&&L[i][0]!=='chess_bullet')return {r:x.r,n:x.n,k:L[i][1]};}
 return null;
};

/* ======================= importação automática ao abrir ======================= */
V32.busy=false;
V32.auto=function(force,loud){
 var a=V32.acc(),v=V32.d();
 if(V32.busy||!(a.lichess||a.chesscom)||!V32.web())return;
 if(typeof navigator!=='undefined'&&navigator.onLine===false){if(loud)UiJs.toast('Sem internet agora.');return;}
 if(!force&&v.lastAuto&&Date.now()-v.lastAuto<V32.AUTO_MS)return;
 if(typeof V24==='undefined'||!V24.DB||!V24.DB.ok){if(loud)UiJs.toast('O armazenamento deste aparelho não está disponível.');return;}
 V32.busy=true;if(loud)UiJs.toast('Buscando partidas novas…');
 if(a.lichess)V26.addName(a.lichess);if(a.chesscom)V26.addName(a.chesscom);
 var start=Date.now(),total=0,fails=[];
 var one=function(src,user,getter){return new Promise(function(ok){getter(user,function(err,text){
   if(err||!text||!text.trim()){if(err)fails.push(src==='lichess'?'Lichess':'Chess.com');ok();return;}
   V26.importText(text,src,function(res){total+=(res&&res.n)||0;ok();});
  });});};
 var liGet=function(user,cb){
  var url=V26.lichessUrl(user,40)+(v.liSince?'&since='+v.liSince:'');
  fetch(url,{headers:{Accept:'application/x-chess-pgn'}}).then(function(r){if(r.status===404)throw new Error('usuário não encontrado');if(!r.ok)throw new Error('o Lichess respondeu '+r.status);return r.text();}).then(function(t){cb(null,t);}).catch(function(e){cb(e);});
 };
 var p=Promise.resolve();
 if(a.lichess)p=p.then(function(){return one('lichess',a.lichess,liGet);}).then(function(){if(fails.indexOf('Lichess')<0)v.liSince=start-6*3600000;});
 if(a.chesscom)p=p.then(function(){return one('chesscom',a.chesscom,V26.fetchChesscom);});
 p.then(function(){return V32.fetchRatings(false);}).then(function(){
  v.lastAuto=Date.now();if(total)v.newN=(v.newN||0)+total;Profile.save();V32.busy=false;
  if(total)UiJs.toast(total+(total===1?' partida nova importada':' partidas novas importadas')+' do '+(a.lichess&&a.chesscom?'Lichess e do Chess.com':(a.lichess?'Lichess':'Chess.com'))+'. A análise roda em segundo plano para a sua Aula da semana.');
  else if(loud)UiJs.toast(fails.length?'Não foi possível buscar no '+fails.join(' e no ')+' agora.':'Nenhuma partida nova desde a última busca.');
  try{V26.kick();}catch(e){}
  V32.refreshBoxes();
 }).catch(function(){V32.busy=false;});
};
if(typeof window!=='undefined')setTimeout(function(){try{V32.auto(false,false);}catch(e){}},5000);

/* ======================= seus erros viram cartões da revisão espaçada ======================= */
V32.feedT=null;
V32.feedSoon=function(){clearTimeout(V32.feedT);V32.feedT=setTimeout(V32.feed,1500);};
V32.feed=function(){
 if(typeof V24==='undefined'||!V24.DB||!V24.DB.ok)return Promise.resolve(0);
 return V24.DB.all('imp').then(function(all){
  var have={},added=0;(Profile.d.srs||[]).forEach(function(c){if(c.k==='mine')have[c.id]=1;});
  all.forEach(function(r){
   if(!r||r.src==='app'||!r.crit||!r.an||!r.an.m)return;
   r.crit.forEach(function(c){
    var id='L'+c.id,o=r.an.m[c.k];if(have[id]||!o||!o.b||!r.f[c.k])return;
    var cat=V26.CAT[c.cat]||V26.CAT.posicional;
    Profile.srsAdd('mine',id,{fen:r.f[c.k],best:o.b,played:r.u[c.k],why:cat.fact});have[id]=1;added++;
   });
  });
  if(added)Profile.save();
  return added;
 }).catch(function(){return 0;});
};
(function(){
 if(typeof V26==='undefined'||!V26.analyseGame)return;
 var oa=V26.analyseGame;
 V26.analyseGame=function(rec,cb){return oa.call(this,rec,function(){V32.feedSoon();if(cb)return cb.apply(this,arguments);});};
 if(typeof window!=='undefined')setTimeout(function(){V32.feed();},9000);
})();
V32.mineStats=function(){var n=0,due=0,t=Profile.today();(Profile.d.srs||[]).forEach(function(c){if(c.k==='mine'&&String(c.id).charAt(0)==='L'&&c.st<4){n++;if(c.due<=t)due++;}});return {n:n,due:due};};

/* ======================= Aula da semana ======================= */
V32.dateOf=function(r){var m=/^(\d{4})\.(\d{2})\.(\d{2})/.exec(r.date||'');return m?new Date(+m[1],+m[2]-1,+m[3]).getTime():(r.added||0);};
V32.srcName=function(r){return r.src==='lichess'?'Lichess':(r.src==='chesscom'?'Chess.com':'PGN');};
V32.collect=function(cb){
 V26.allCrits(function(cr,all){
  var ext=all.filter(function(r){return r.src!=='app'&&r.col;}),done=ext.filter(function(r){return r.an&&r.an.done;});
  var now=Date.now(),recent=done.filter(function(r){return now-V32.dateOf(r)<=14*86400000;});
  var base=recent.length>=5?recent:done.slice().sort(function(a,b){return V32.dateOf(b)-V32.dateOf(a);}).slice(0,20);
  var ids={};base.forEach(function(r){ids[r.id]=1;});
  var cs=cr.filter(function(x){return ids[x.r.id];}),cnt={};
  cs.forEach(function(x){cnt[x.c.cat]=(cnt[x.c.cat]||0)+1;});
  var cats=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  cb({ext:ext,done:done,base:base,recent:recent.length>=5,cs:cs,cnt:cnt,cats:cats,pending:ext.length-done.length});
 });
};
V32.lesson=function(back){
 back=back||V32.lessonBack||App.menu;V32.lessonBack=back;
 UiJs.page('Aula da semana',back);
 var cur=UiJs.cur;cur.classList.add('v32-lesson');
 var wait=UiJs.el('div','muted',cur,'Montando a sua aula…');
 V32.collect(function(L){
  cur.removeChild(wait);
  var a=V32.acc();
  if(!L.ext.length){
   var h=UiJs.el('div','v32-hero',cur);h.innerHTML='<b>A sua aula nasce das suas partidas</b><span>Informe seu usuário no Lichess ou no Chess.com. O jogo busca as partidas sozinho, encontra os erros que mais se repetem e monta uma aula só para você.</span>';
   var box=UiJs.el('div','v32-sec',cur);var keep=UiJs.cur;UiJs.cur=box;V32.chessForm(box);UiJs.cur=keep;
   UiJs.btns([['Importar um arquivo PGN',V26.games]]);
   return;
  }
  if(!L.base.length||!L.cats.length){
   UiJs.p(L.pending?'Analisando as suas partidas ('+L.pending+' na fila). A aula aparece assim que houver partidas analisadas com erros graves. Deixe o jogo aberto alguns minutos.':'Nas partidas analisadas não houve erro grave. Ótimo sinal! Importe mais partidas para a aula ficar precisa.','gold');
   UiJs.btns([['Buscar partidas novas',function(){V32.auto(true,true);}],['Minhas partidas',V26.games]]);
   return;
  }
  var top=L.cats[0],cat=V26.CAT[top]||V26.CAT.posicional,n=L.cnt[top],srcs={};L.base.forEach(function(r){srcs[V32.srcName(r)]=1;});
  var hero=UiJs.el('div','v32-hero',cur);
  hero.innerHTML='<b>'+V32.esc(cat.n)+'</b><span>Nas suas '+(L.recent?'partidas das últimas 2 semanas':'últimas '+L.base.length+' partidas analisadas')+' ('+Object.keys(srcs).join(' e ')+'), este foi o erro que mais se repetiu: <b>'+n+(n===1?' vez':' vezes')+'</b> em '+L.base.length+(L.base.length===1?' partida':' partidas')+'.</span>';
  var bars=UiJs.el('div','v32-bars',cur),mx=L.cnt[top];
  L.cats.slice(0,5).forEach(function(k){var r=UiJs.el('div','v32-bar'+(k===top?' top':''),bars);UiJs.el('span','',r,(V26.CAT[k]||{n:k}).n);var b=UiJs.el('span','v32-b',r);var f=UiJs.el('i','',b);f.style.width=Math.max(6,Math.round(100*L.cnt[k]/mx))+'%';UiJs.el('span','v32-n',r,String(L.cnt[k]));});
  UiJs.h('O que acontece');UiJs.p(cat.fact,'');
  UiJs.h('A lição');UiJs.p(cat.lesson,'gold');
  var mine=L.cs.filter(function(x){return x.c.cat===top;}).sort(function(x,y){return (x.done-y.done)||(y.c.sl-x.c.sl);}).slice(0,3);
  UiJs.h('Passo 1 · Suas posições');
  UiJs.p('Momentos reais das suas partidas. Reconstrua o pensamento, compare com o melhor lance e comprove numa posição nova.','muted small');
  UiJs.items(mine.map(function(x){var r=x.r,opp=r.col===1?r.b:r.w;return {t:V26.moveLabel(r,x.c.k)+' · contra '+opp,d:V32.srcName(r)+(r.date?' · '+r.date.replace(/\./g,'/'):'')+' · você perdeu '+Math.round(x.c.sl)+'% de chance de vitória',r:x.done?'✓ comprovada':'treinar ›',ok:x.done,f:function(){V26.rc(r.id,x.c.id);}};}));
  UiJs.h('Passo 2 · Problemas parecidos');
  var pz=Profile.d.pzElo||1000;
  UiJs.btns([['Resolver 8 problemas de '+cat.n.toLowerCase(),function(){
   var ps=Puzzles.pick(cat.tags,pz-200,pz+150,8,Profile.seenMap());
   if(!ps.length)ps=Puzzles.pick(cat.tags,pz-400,pz+300,8,Profile.seenMap());
   if(!ps.length){UiJs.toast('Nenhum problema novo deste tema agora.');return;}
   Drills.run('Aula · '+cat.n,Study.pzTasks(ps,false,cat.dim),{back:function(){V32.lesson();}});
  },'pri wide']]);
  var ms=V32.mineStats();
  UiJs.h('Passo 3 · Seus erros na revisão');
  UiJs.p(ms.n?('Cada erro grave das suas partidas virou um cartão da revisão espaçada: '+ms.n+' em aprendizado'+(ms.due?', '+ms.due+' para hoje.':'. Os próximos voltam nos próximos dias.')):'Os erros das partidas analisadas viram cartões da revisão a partir de amanhã.','');
  var due=Profile.srsCount(null);
  if(due)UiJs.btns([['Fazer as revisões de hoje ('+due+')',function(){Drills.run('Revisões do dia',Study.srsTasks(20),{back:function(){V32.lesson();}});}]]);
  if(L.cats.length>1){UiJs.h('Também apareceu');UiJs.ul(L.cats.slice(1,4).map(function(k){return (V26.CAT[k]||{n:k}).n+': '+L.cnt[k]+(L.cnt[k]===1?' vez':' vezes');}),'small');}
  UiJs.p('Depois, jogue no Lichess ou no Chess.com: as partidas novas entram sozinhas e a aula da próxima semana mostra se o erro diminuiu.','muted small');
  if(a.lichess)UiJs.btns([['Jogar no Lichess',function(){window.open('https://lichess.org/','_blank','noopener');}],a.chesscom?['Jogar no Chess.com',function(){window.open('https://www.chess.com/play/online','_blank','noopener');}]:null]);
  else if(a.chesscom)UiJs.btns([['Jogar no Chess.com',function(){window.open('https://www.chess.com/play/online','_blank','noopener');}]]);
 });
};

/* ======================= 3. Entrar com Lichess (OAuth 2 com PKCE) ======================= */
V32.b64u=function(buf){var s='',b=new Uint8Array(buf);for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
V32.rand=function(n){var a=new Uint8Array(n);crypto.getRandomValues(a);return V32.b64u(a);};
V32.liStart=function(){
 if(!V32.web()||!window.crypto||!crypto.subtle){UiJs.toast('O login com o Lichess funciona na versão online do jogo.');return;}
 var ver=V32.rand(48),state=V32.rand(16);
 crypto.subtle.digest('SHA-256',new TextEncoder().encode(ver)).then(function(h){
  try{sessionStorage.setItem('rdm-li',JSON.stringify({v:ver,s:state,t:Date.now()}));localStorage.setItem('rdm-li',JSON.stringify({v:ver,s:state,t:Date.now()}));}catch(e){}
  var q={response_type:'code',client_id:V32.CLIENT,redirect_uri:V32.base(),code_challenge_method:'S256',code_challenge:V32.b64u(h),state:state};
  location.href=V32.LI+'/oauth?'+Object.keys(q).map(function(k){return k+'='+encodeURIComponent(q[k]);}).join('&');
 });
};
V32.liReturn=function(){
 var sp;try{sp=new URLSearchParams(location.search);}catch(e){return false;}
 var st=sp.get('state');if(!st||!(sp.get('code')||sp.get('error')))return false;
 var saved=null;try{saved=JSON.parse(sessionStorage.getItem('rdm-li')||localStorage.getItem('rdm-li')||'null');}catch(e){}
 if(!saved||saved.s!==st)return false;
 try{sessionStorage.removeItem('rdm-li');localStorage.removeItem('rdm-li');history.replaceState(null,'',location.pathname);}catch(e){}
 var code=sp.get('code'),err=sp.get('error');
 setTimeout(function(){V32.liFinish(code,err,saved.v);},30);
 return true;
};
V32.liFinish=function(code,err,ver){
 UiJs.page('Conta do Lichess',App.menu);
 if(err||!code){UiJs.p('Você não autorizou o acesso no Lichess. Nada foi alterado.','warn');UiJs.btns([['Voltar ao jogo',App.menu,'pri']]);return;}
 UiJs.p('Confirmando com o Lichess…','muted');
 var tok=null;
 fetch(V32.LI+'/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=authorization_code&code='+encodeURIComponent(code)+'&code_verifier='+encodeURIComponent(ver)+'&redirect_uri='+encodeURIComponent(V32.base())+'&client_id='+encodeURIComponent(V32.CLIENT)})
 .then(function(r){if(!r.ok)throw new Error('token '+r.status);return r.json();})
 .then(function(j){tok=j.access_token;if(!tok)throw new Error('sem token');return fetch(V32.LI+'/api/account',{headers:{Authorization:'Bearer '+tok}});})
 .then(function(r){if(!r.ok)throw new Error('conta '+r.status);return r.json();})
 .then(function(acc){
  /* a autorização é devolvida na hora: o jogo não guarda nenhuma chave do Lichess */
  fetch(V32.LI+'/api/token',{method:'DELETE',headers:{Authorization:'Bearer '+tok}}).catch(function(){});tok=null;
  var v=V32.d(),a=V32.acc(),name=acc.username||acc.id;
  a.lichess=name;V26.addName(name);
  var p={};Object.keys(acc.perfs||{}).forEach(function(k){var x=acc.perfs[k];if(x&&x.rating)p[k]={r:x.rating,n:x.games||0,prov:!!x.prov};});
  v.li={user:name,ver:true,t:Date.now()};v.rt.li={t:Date.now(),p:p};v.lastAuto=0;
  var b=V32.best('li');if(b)v.rh.push({t:Date.now(),li:b.r,lik:b.k});
  Profile.save();
  UiJs.page('Conta do Lichess',App.menu);
  var h=UiJs.el('div','v32-hero',UiJs.cur);h.innerHTML='<b>✓ Conta confirmada: '+V32.esc(name)+'</b><span>O Lichess confirmou que a conta é sua. O jogo leu só o nome e os ratings e já devolveu a autorização.</span>';
  var line=V32.rtLine('li');if(line){var d=UiJs.el('div','v32-st',UiJs.cur);d.innerHTML=line;}
  if(b)UiJs.p('Seu Elo aqui passa a considerar o seu rating de '+b.k+' no Lichess ('+b.r+' → cerca de '+V32.toGame('li',b.r)+' na escala daqui).','gold');
  else UiJs.p('Para o rating do Lichess entrar no seu Elo daqui, são precisas pelo menos 15 partidas com rating firme em rápidas, clássicas ou blitz.','muted');
  UiJs.btns([['Importar minhas partidas agora',function(){App.menu();V32.auto(true,true);},'pri'],['Voltar ao jogo',App.menu]]);
 })
 .catch(function(e){
  if(tok)fetch(V32.LI+'/api/token',{method:'DELETE',headers:{Authorization:'Bearer '+tok}}).catch(function(){});
  UiJs.page('Conta do Lichess',App.menu);UiJs.p('Não foi possível confirmar com o Lichess agora ('+(e&&e.message||'erro')+'). Tente de novo em instantes.','warn');
  UiJs.btns([['Tentar de novo',V32.liStart,'pri'],['Voltar ao jogo',App.menu]]);
 });
};
(function(){
 if(typeof Online==='undefined')return;
 var o=Online.fromUrl;
 Online.fromUrl=function(){if(V32.liReturn())return true;return o.apply(this,arguments);};
})();

/* ======================= calibração do Elo pelo rating de lá ======================= */
/* conversão aproximada e conservadora para a escala daqui (que é bem mais crítica que a dos sites) */
V32.toGame=function(site,r){var x=site==='li'?0.9*r-350:0.95*r-100;return Math.max(100,Math.min(2600,Math.round(x)));};
V32.ext=function(){
 var v=V32.d(),a=V32.acc(),out=[],li=V32.best('li'),cc=V32.best('cc');
 var ver=!!(v.li&&v.li.ver&&V26.nk(v.li.user)===V26.nk(a.lichess));
 if(li&&a.lichess)out.push([ver?'Lichess (confirmado)':'Lichess',V32.toGame('li',li.r),ver?1.6:0.5]);
 if(cc&&a.chesscom)out.push(['Chess.com',V32.toGame('cc',cc.r),0.6]);
 return out;
};
V32.verified=function(){var v=V32.d(),a=V32.acc();return !!(v.li&&v.li.ver&&V26.nk(v.li.user)===V26.nk(a.lichess)&&V32.best('li'));};

/* ======================= telas: Painel, Laboratório, Centro de Treino ======================= */
V32.refreshBoxes=function(){try{var b=document.querySelector('.v32-panel');if(b&&b.__fill)b.__fill();}catch(e){}};
V32.panelBox=function(anchor){
 var box=document.createElement('div');box.className='v29-box v32-panel';
 box.__fill=function(){
  box.innerHTML='';var C=V23&&V23.Cloud,a=V32.acc(),v=V32.d();
  var t=document.createElement('b');t.textContent='Sua conta e seu xadrez lá fora';box.appendChild(t);
  var line=function(html,cls){var s=document.createElement('span');if(cls)s.className=cls;s.innerHTML=html;box.appendChild(s);return s;};
  if(C&&C.user)line('☁ Progresso salvo na conta Google ('+V32.esc(C.user.email||'Google')+').','good');
  else if(C&&C.configured()&&C.web()){var s=line('Seu progresso está só neste aparelho. Se trocar de celular ou limpar o navegador, ele se perde.','warn');}
  var li=V32.best('li'),cc=V32.best('cc');
  if(li)line('Lichess'+(V32.verified()?' ✓':'')+': '+li.k+' '+li.r+' → cerca de '+V32.toGame('li',li.r)+' aqui');
  if(cc)line('Chess.com: '+cc.k+' '+cc.r+' → cerca de '+V32.toGame('cc',cc.r)+' aqui');
  var h=v.rh.filter(function(x){return x.li||x.cc;});
  ['li','cc'].some(function(k){
   var l=null;for(var i=h.length-1;i>=0;i--)if(h[i][k]){l=h[i];break;}if(!l)return false;
   var f=null;for(var j=0;j<h.length;j++)if(h[j][k]&&h[j][k+'k']===l[k+'k']){f=h[j];break;}
   if(!f||l.t-f.t<5*86400000)return false;
   var dlt=l[k]-f[k];line('Seu treino aqui → seu resultado lá: '+(dlt>=0?'+':'')+dlt+' em '+l[k+'k']+' no '+(k==='li'?'Lichess':'Chess.com')+' desde '+V32.when(f.t)+'.',dlt>=0?'good':'');return true;
  });
  if(!a.lichess&&!a.chesscom)line('Informe seu usuário no Lichess ou no Chess.com: as partidas de lá viram a sua Aula da semana e o rating de lá ajusta o seu Elo daqui.','muted');
  else if(li||cc)line('A conversão é aproximada: a escala daqui é mais exigente que a dos sites.','muted');
  var row=document.createElement('div');row.className='btns';box.appendChild(row);
  var btn=function(txt,fn,cls){var b=document.createElement('button');b.type='button';b.className='btn '+(cls||'');b.textContent=txt;b.onclick=fn;row.appendChild(b);};
  if(C&&!C.user&&C.configured()&&C.web())btn('Salvar progresso com Google',function(){V23.account();},'pri');
  btn(a.lichess||a.chesscom?'Contas Lichess e Chess.com':'Ligar Lichess / Chess.com',function(){if(typeof V34!=='undefined')V34.contas();else V23.account();});
  btn('Aula da semana',function(){V32.lesson(Pages.profile);});
 };
 box.__fill();
 if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);
 return box;
};
(function(){
 if(typeof Pages==='undefined')return;
 var oP=Pages.profile;
 Pages.profile=function(){
  var r=oP.apply(this,arguments);
  try{var cur=UiJs.cur,v29=cur.querySelector('.v29-box');V32.panelBox(v29||cur.firstChild);}catch(e){}
  return r;
 };
 if(typeof V26!=='undefined'&&V26.lab){
  var oL=V26.lab;
  V26.lab=function(){
   var r=oL.apply(this,arguments);
   try{
    var cur=UiJs.cur,st=cur.querySelector('.v26-stat'),a=V32.acc(),ms=V32.mineStats();
    var card=document.createElement('button');card.type='button';card.className='v32-card';
    card.innerHTML='<b>Aula da semana</b><span>'+(a.lichess||a.chesscom?'O erro que mais se repete nas suas partidas'+(a.lichess?' do Lichess':'')+(a.chesscom?(a.lichess?' e':'')+' do Chess.com':'')+', com treino sob medida.':'Informe seu usuário no Lichess ou no Chess.com e o jogo monta uma aula com os seus erros.')+(ms.due?' · '+ms.due+(ms.due===1?' erro seu volta hoje':' erros seus voltam hoje'):'')+'</span><i>›</i>';
    card.onclick=function(){V32.lesson(V26.lab);};
    if(st&&st.parentNode)st.parentNode.insertBefore(card,st);else cur.appendChild(card);
    [].forEach.call(cur.querySelectorAll('.p'),function(x){if(/^Privacidade:/.test(x.textContent))x.textContent='Privacidade: as partidas e as análises ficam neste aparelho (e na sua conta Google, se você entrar). Se você informou seu usuário no Lichess ou no Chess.com, o jogo busca as partidas públicas novas de lá ao abrir. Nenhuma senha é pedida, e partidas em andamento nunca são analisadas.';});
    V32.auto(false,false);
   }catch(e){}
   return r;
  };
 }
 if(typeof App!=='undefined'&&App.training){
  var oT=App.training;
  App.training=function(){
   var r=oT.apply(this,arguments);
   try{var m=UiJs.root.querySelector('.menu.hub'),g=m&&m.querySelector('.mgrid');if(g&&UiJs.mitem){var ms=V32.mineStats();UiJs.mitem(g,{t:'Aula da semana',d:ms.due?ms.due+' erros seus hoje':'Seus erros do Lichess',f:function(){V32.lesson(App.training);}});}}catch(e){}
   return r;
  };
 }
})();
