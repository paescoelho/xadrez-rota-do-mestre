/* Rota do Mestre v34 — menus reorganizados.
 * Menu principal (nesta ordem): Jogar · Jogar online · Centro de Treino · Seu maior adversário · Entrar com Google ·
 *   Apoiar o projeto (seis botões lado a lado) + Painel de evolução e História do xadrez (os dois grandes).
 * "Continuar" fica dentro do Jogar (no topo da tela Nova partida).
 * Centro de Treino em seções numeradas, na ordem de estudo, com rolagem no celular:
 *   1 Comece por aqui (Nivelamento, Como pensar) · 2 Sua rotina (Plano do dia, Trilha) · 3 Treinos por tema ·
 *   4 Seus erros e seu pensamento (Analisar erros, Laboratório do Pensamento) · 5 Alto rendimento.
 * "Analisar erros" reúne tudo do Lichess, Chess.com e outros sites: contas, importação, Aula da semana e Reconstrua seu Pensamento.
 */
var V34={errCtx:false};
V34.esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
V34.ev=function(k){try{if(typeof V27!=='undefined'&&V27.ev)V27.ev(k);}catch(e){}};
V34.reback=function(fn){try{var b=document.querySelector('.hdr .back');if(b)b.onclick=function(){fn();};UiJs.backFn=fn;}catch(e){}};
V34.cat=function(c){try{var m=App.CAT_LABEL,l=m&&(m.h?m.h[c]:(m.get?m.get(c):null));return l?' · '+l:'';}catch(e){return '';}};
/* partida para continuar: a que está aberta ou a salva */
V34.cont=function(){
 try{
  var G=App.G;if(G&&G.over==null)return {d:'Contra '+(G.oppName||'o computador')+V34.cat(G.cat),f:App.showGame};
  var c=Profile.current;if(c)return {d:'Partida salva'+(c.oppName?' contra '+c.oppName:'')+V34.cat(c.cat),f:App.restoreGame};
 }catch(e){}
 return null;
};
V34.state=function(){
 var d=Profile.d,pl=d.place,hist=d.hist||[],placed=!(pl==null&&hist.length===0&&(d.pzN|0)<10),dailyAll=true;
 try{Study.dailyPlan().forEach(function(x){if(!Profile.dailyDone(x.id))dailyAll=false;});}catch(e){}
 return {placed:placed,dailyAll:dailyAll};
};
V34.mine=function(){try{return V32.mineStats();}catch(e){return {due:0};}};

/* ---------- ícones ---------- */
V34.G_ICO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
V34.HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.1 4.3 2.4.4.6 1.6.6 2 0 .8-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#e3605a"/></svg>';
/* lupa sobre um tabuleiro com um lance errado (x) */
V34.ERR_ICO='<svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true"><g opacity=".55"><rect x="3" y="3" width="6" height="6" fill="#f3d98c"/><rect x="15" y="3" width="6" height="6" fill="#f3d98c"/><rect x="9" y="9" width="6" height="6" fill="#f3d98c"/><rect x="3" y="15" width="6" height="6" fill="#f3d98c"/></g><rect x="3" y="3" width="18" height="18" fill="none" stroke="#f3d98c" stroke-width="1.2" opacity=".6"/><g class="v34-lens"><circle cx="18.5" cy="17.5" r="7" fill="rgba(10,10,8,.72)" stroke="#f3d98c" stroke-width="1.8"/><path d="M23.6,22.6 L29,28" stroke="#f3d98c" stroke-width="2.6" stroke-linecap="round"/><path d="M15.8,14.8 L21.2,20.2 M21.2,14.8 L15.8,20.2" stroke="#ff8a7a" stroke-width="1.7" stroke-linecap="round"/></g></svg>';
V34.addIcon=function(b,cls,html){if(!b||b.querySelector('.'+cls))return;var ic=document.createElement('span');ic.className='mic '+cls;ic.innerHTML=html;b.insertBefore(ic,b.firstChild);};
V34.findItem=function(root,title){var r=null;[].forEach.call(root.querySelectorAll('.mitem'),function(b){var t=b.querySelector('.mt');if(!r&&t&&t.textContent===title)r=b;});return r;};

/* ---------- Entrar com Google ---------- */
V34.C=function(){return typeof V23!=='undefined'&&V23.Cloud?V23.Cloud:null;};
V34.gItem=function(){
 var C=V34.C();
 if(C&&C.user)return {t:'Conta Google',d:'Progresso salvo na nuvem ✓',f:V23.account,ico:'v34g'};
 return {t:'Entrar com Google',d:'Salve seu progresso',f:V34.gLogin,ico:'v34g'};
};
/* com o Firebase já carregado, a janela do Google abre no mesmo toque; senão vai para "Conta e backup", que carrega e mostra o botão */
V34.gLogin=function(){
 var C=V34.C();if(!C){return;}
 try{if(C.loaded&&C.web()&&C.configured()&&!C.user){C.login();return;}}catch(e){}
 V23.account();
};
V34.gRefresh=function(){
 try{var b=UiJs.root.querySelector('.menu:not(.hub) .v34-gt');if(!b)return;var it=V34.gItem(),t=b.querySelector('.mt'),d=b.querySelector('.md');
  if(t)t.textContent=it.t;if(d)d.textContent=it.d;b.onclick=function(){it.f();};b.classList.toggle('on',it.t==='Conta Google');}catch(e){}
};
(function(){var C=V34.C();if(C&&C.refresh){var o=C.refresh;C.refresh=function(){var r=o.apply(this,arguments);V34.gRefresh();return r;};}})();

/* ---------- menu principal ---------- */
App.menu=function(){
 try{App.stopClock();}catch(e){}
 V34.errCtx=false;
 var c=V34.cont(),s=V34.state(),it=[];
 it.push({t:'Jogar',d:c?'Continue sua partida':'Contra o computador',f:App.setupGame,hero:true});
 it.push({t:'Jogar online',d:'Convide um amigo',f:function(){if(typeof V31!=='undefined')V31.home();else Online.home();},ico:'whats'});
 it.push({t:'Centro de Treino',d:!s.placed?'Comece pelo Nivelamento':(!s.dailyAll?'Próximo passo: Plano do dia':'Treinos, Nivelamento e seus erros'),f:App.training,ico:'ct',hl:!s.placed||!s.dailyAll});
 it.push({t:'Seu maior adversário',d:'Você de 3 meses atrás',f:Dna.rival,ico:'ghost'});
 it.push(V34.gItem());
 it.push({t:'Apoiar o projeto',d:'Ajude o jogo a evoluir',f:function(){V25.page(App.menu);},ico:'v34heart'});
 var pd=null;try{pd=App.panelData();}catch(e){}
 if(pd)it.push({t:'Painel de evolução',d:'Perfil em teia, evolução mês a mês e dicas',f:Pages.profile,wide:true,ico:'pnl',pnl:pd});
 it.push({t:'História do xadrez',d:'1.500 anos · 18 jogos para jogar',f:Pages.history,wide:true,ico:'hist'});
 UiJs.menu(it,'');
 try{
  var m=UiJs.root.querySelector('.menu');
  var j=V34.findItem(m,'Jogar');if(j&&c)j.classList.add('v34-hascont');
  var g=V34.findItem(m,'Entrar com Google')||V34.findItem(m,'Conta Google');
  if(g){g.classList.add('v34-gt');if(V34.findItem(m,'Conta Google'))g.classList.add('on');V34.addIcon(g,'v34-gic',V34.G_ICO);}
  var h=V34.findItem(m,'Apoiar o projeto');if(h){h.classList.add('v25-item');V34.addIcon(h,'v25-mic',V34.HEART);}
  /* deixa o login do Google pronto para abrir no primeiro toque */
  var C=V34.C();
  if(C&&!C.user&&!C.loaded&&!C.loading&&C.web&&C.web()&&C.configured&&C.configured())setTimeout(function(){try{if(!C.loaded&&!C.loading&&navigator.onLine!==false&&document.querySelector('.menu .v34-gt'))C.load().catch(function(){});}catch(e){}},2500);
 }catch(e){}
};

/* ---------- Jogar: "Continuar" no topo da tela Nova partida ---------- */
(function(){var o=App.setupGame;App.setupGame=function(){
 var r=o.apply(this,arguments);
 try{var c=V34.cont(),cur=UiJs.cur;if(c&&cur){
  var b=document.createElement('button');b.type='button';b.className='v34-cont';
  b.innerHTML='<span class="v34-cic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></span><span class="v34-ctx"><b>Continuar partida</b><i>'+V34.esc(c.d)+'</i></span><em aria-hidden="true">›</em>';
  b.onclick=function(){c.f();};
  cur.insertBefore(b,cur.firstChild);
  var sep=document.createElement('div');sep.className='v34-or';sep.textContent='ou comece uma nova partida';
  cur.insertBefore(sep,b.nextSibling);
 }}catch(e){}
 return r;
};})();

/* ---------- Centro de Treino ---------- */
App.training=function(){
 V34.ev('evento-centro-treino');
 try{App.stopClock();}catch(e){}
 V34.errCtx=false;
 var s=V34.state(),ms=V34.mine();
 var info=!s.placed?'Comece pelo Nivelamento: ele ajusta os treinos ao seu nível':(!s.dailyAll?'Plano do dia é o seu próximo passo':'Plano do dia concluído · siga a Trilha ou treine por tema');
 UiJs.hub('Centro de Treino','Cada treino cria uma nova conexão.',App.menu,[],info);
 var m=UiJs.root.querySelector('.menu.hub');if(!m)return;
 m.classList.add('v34-ct');
 var g0=m.querySelector('.mgrid');if(g0)g0.parentNode.removeChild(g0);
 /* relógio de estudo e treino sugerido pelo Raio-X, logo abaixo da legenda */
 var cap=m.querySelector('.ctcap'),after=cap;
 try{var card=V23.studyCard(m);card.onclick=V23.studyPage;card.setAttribute('role','button');if(after&&after.nextSibling)m.insertBefore(card,after.nextSibling);after=card;}catch(e){}
 try{var sug=V24.suggest();if(sug&&sug.length){var x=sug[0],sc=UiJs.el('div','v24-sug',null);sc.innerHTML='<b>Treino sugerido pelo Raio-X</b><span>'+V34.esc(x.t)+'</span>';sc.onclick=x.f;sc.setAttribute('role','button');if(after&&after.nextSibling)m.insertBefore(sc,after.nextSibling);else m.appendChild(sc);}}catch(e){}
 var sec=function(n,title,items){
  var w=UiJs.el('div','v34-sec',m),h=UiJs.el('div','v34-sh',w);h.innerHTML='<i>'+n+'</i><span>'+title+'</span>';
  var g=UiJs.el('div','mgrid',w),half=0;items.forEach(function(x){if(!x.wide)half++;});
  if(half%2===1){for(var k=items.length-1;k>=0;k--)if(!items[k].wide){items[k].lone=true;break;}}
  items.forEach(function(x){UiJs.mitem(g,x);});
  return g;
 };
 var dueTxt=ms.due?' · '+ms.due+(ms.due===1?' erro seu volta hoje':' erros seus voltam hoje'):'';
 sec(1,'Comece por aqui',[
  {t:'Nivelamento',d:s.placed?'Refaça e confira seu nível':'Descubra seu nível',f:Pages.placementIntro,ico:'lvl',hl:!s.placed},
  {t:'Como pensar',d:'Processo dos mestres',f:Pages.think}
 ]);
 sec(2,'Sua rotina',[
  {t:'Plano do dia',d:s.placed&&!s.dailyAll?'Próximo passo · 15, 30 ou 60 min':'15, 30 ou 60 min',f:Pages.daily,hl:s.placed&&!s.dailyAll},
  {t:'Trilha',d:'10 etapas até mestre',f:Pages.trail}
 ]);
 sec(3,'Treinos por tema',[
  {t:'Treino de visão',d:'Casas e memória',f:V23.vision},
  {t:'Táticas',d:'Temas, Storm, Rush',f:Pages.tactics},
  {t:'Padrões de mate',d:'Do corredor ao Boden',f:V23.mates},
  {t:'Aberturas',d:'Seu repertório',f:Pages.openings},
  {t:'Estruturas',d:'Planos de peões',f:Pages.structs},
  {t:'Finais',d:'Ganhar e defender',f:Pages.endgames},
  {t:'Partidas de mestres',d:'Adivinhe o lance',f:Pages.models}
 ]);
 var g4=sec(4,'Seus erros e seu pensamento',[
  {t:'Analisar erros',d:'Lichess, Chess.com e outros sites · Aula da semana'+dueTxt,f:V34.erros,wide:true,ico:'v34err',hl:ms.due>0},
  {t:'Laboratório do Pensamento',d:'Descubra como você pensa',f:V26.lab,wide:true,ico:'eye'}
 ]);
 try{var ae=V34.findItem(g4,'Analisar erros');if(ae){ae.classList.add('v34-ae');V34.addIcon(ae,'mico v34-eic',V34.ERR_ICO);}}catch(e){}
 sec(5,'Alto rendimento',[
  {t:'Laboratório de alto rendimento',d:'Desafios progressivos · cálculo profundo · biblioteca dos mestres',f:Mestre.hub,wide:true,ico:'ct'}
 ]);
};

/* ---------- Analisar erros (Lichess, Chess.com e outros sites) ---------- */
V34.PRIV='Privacidade: as partidas e as análises ficam neste aparelho (e na sua conta Google, se você entrar). Se você informou seu usuário no Lichess ou no Chess.com, o jogo busca as partidas públicas novas de lá ao abrir. Nenhuma senha é pedida, e partidas em andamento nunca são analisadas.';
V34.stats=function(st,cr,all){
 var imp=all.filter(function(r){return r.src!=='app';}),an=all.filter(function(r){return r.an&&r.an.done;});
 st.innerHTML='<span><b>'+imp.length+'</b>importadas</span><span><b>'+an.length+'</b>analisadas</span><span><b>'+cr.length+'</b>posições críticas</span><span><b>'+cr.filter(function(x){return x.done;}).length+'</b>comprovadas</span>';
 return imp;
};
V34.erros=function(){
 V34.ev('evento-erros');V34.errCtx=true;
 UiJs.page('Analisar erros',App.training);
 var cur=UiJs.cur;cur.classList.add('v26-lab','v34-err');
 var hd=UiJs.el('div','v26-hero',cur);hd.innerHTML='<b>Seus erros dos outros sites viram aula aqui.</b><span>Traga as partidas do Lichess, do Chess.com ou de qualquer site (arquivo PGN). O jogo encontra os lances que mais custaram e treina você neles com posições novas, para o erro não se repetir.</span>';
 var st=UiJs.el('div','v26-stat',cur);st.textContent='Carregando…';
 var pr=UiJs.el('div','v26-prog',cur);
 var list=UiJs.el('div','v34-list',cur);
 var pv=UiJs.el('div','p muted small',cur,V34.PRIV);
 try{if(!V26.busy)V26.kick();}catch(e){}
 V26.syncApp().then(function(){V26.allCrits(function(cr,all){
  var imp=V34.stats(st,cr,all),pend=cr.filter(function(x){return !x.done;}).length;
  try{V26.progLine(pr);}catch(e){}
  var a={},li=null,ms=V34.mine();try{a=V32.acc();li=V32.d().li;}catch(e){}
  var ver=li&&li.ver&&V26.nk(li.user)===V26.nk(a.lichess);
  var keep=UiJs.cur;UiJs.cur=list;
  UiJs.items([
   {t:'1 · Conecte suas contas',d:a.lichess||a.chesscom?('Lichess: '+(a.lichess||'—')+(ver?' ✓':'')+' · Chess.com: '+(a.chesscom||'—')):'Lichess e Chess.com, sem senha. As partidas novas chegam sozinhas',r:a.lichess||a.chesscom?'›':'conectar ›',f:V34.contas},
   {t:'2 · Traga suas partidas',d:'Automático pelas contas, ou um arquivo PGN de qualquer site',r:imp.length?imp.length+' ›':'importar ›',f:V26.games},
   {t:'3 · Aula da semana',d:'Mentoria com o erro que mais se repete nas suas partidas'+(ms.due?' · '+ms.due+(ms.due===1?' erro seu volta hoje':' erros seus voltam hoje'):''),r:ms.due?'hoje ›':'›',f:function(){V32.lesson(V34.erros);}},
   {t:'4 · Reconstrua seu Pensamento',d:pend?pend+(pend===1?' posição crítica esperando por você':' posições críticas esperando por você'):'Refaça as posições em que você errou até acertar sozinho',r:pend?'treinar ›':'›',f:V26.critList}
  ]);
  UiJs.cur=keep;
 });});
 try{V26.timer=V26.timer||setInterval(function(){var e=document.querySelector('.v26-prog');if(e)V26.progLine(e);},1500);}catch(e){}
 try{V32.auto(false,false);}catch(e){}
};
V34.contas=function(){
 UiJs.page('Contas Lichess e Chess.com',V34.erros);
 var cur=UiJs.cur;cur.classList.add('v34-err');
 var hd=UiJs.el('div','v26-hero',cur);hd.innerHTML='<b>Ligue suas contas de xadrez</b><span>Com o seu usuário, o jogo busca as partidas públicas novas ao abrir, monta a Aula da semana com os seus erros e usa o rating de lá para ajustar o seu Elo daqui.</span>';
 var box=UiJs.el('div','v32-sec',cur);var keep=UiJs.cur;UiJs.cur=box;
 try{V32.chessForm(box);}catch(e){}
 UiJs.cur=keep;
};
/* Minhas partidas e Reconstrua abertas pelo "Analisar erros" voltam para ele */
['games','critList'].forEach(function(k){if(typeof V26==='undefined'||!V26[k])return;var o=V26[k];V26[k]=function(){var r=o.apply(this,arguments);if(V34.errCtx)V34.reback(V34.erros);return r;};});

/* ---------- Laboratório do Pensamento: como você pensa (as partidas de fora ficam no Analisar erros) ---------- */
if(typeof V26!=='undefined'){
 V26.lab=function(){
  V34.ev('evento-laboratorio');V34.errCtx=false;
  UiJs.page('Laboratório do Pensamento',App.training);
  var cur=UiJs.cur;cur.classList.add('v26-lab');
  var hd=UiJs.el('div','v26-hero',cur);hd.innerHTML='<b>Descubra como você pensa. Aprenda a evoluir.</b><span>O laboratório estuda as suas partidas, as daqui e as dos outros sites, e mostra como você decide: onde acerta, onde se apressa e o que deixa de ver.</span>';
  var st=UiJs.el('div','v26-stat',cur);st.textContent='Carregando…';
  var pr=UiJs.el('div','v26-prog',cur);
  var list=UiJs.el('div','v34-list',cur);
  UiJs.el('div','p muted small',cur,V34.PRIV);
  try{if(!V26.busy)V26.kick();}catch(e){}
  V26.syncApp().then(function(){V26.allCrits(function(cr,all){
   V34.stats(st,cr,all);
   try{V26.progLine(pr);}catch(e){}
   var keep=UiJs.cur;UiJs.cur=list;
   UiJs.items([
    {t:'Primeiras observações',d:'Onde as suas decisões mais custaram, com o grau de confiança',r:'›',f:V26.obs},
    {t:'Mapa do seu pensamento',d:'O que você olhou e o que deixou de ver nas partidas daqui',r:'›',f:function(){Mind.page();V34.reback(V26.lab);}},
    {t:'Raio-X das partidas',d:'Calma sob pressão, pressa, certeza e domínio por tema',r:'›',f:function(){if(V24.xray){V24.xray();V34.reback(V26.lab);}}},
    {t:'Analisar erros',d:'Traga partidas do Lichess, do Chess.com e de outros sites',r:'›',f:V34.erros}
   ]);
   UiJs.cur=keep;
  });});
  V26.timer=V26.timer||setInterval(function(){var e=document.querySelector('.v26-prog');if(e)V26.progLine(e);},1500);
 };
}

/* ---------- Conta e backup: as contas de xadrez agora moram no "Analisar erros" ---------- */
if(typeof V23!=='undefined'&&V23.account){
 var oAcc34=V23.account;
 V23.account=function(){
  var r=oAcc34.apply(this,arguments);
  try{
   var cur=UiJs.cur,f=cur&&cur.querySelector('.v32-acc');
   if(f){
    var sec=f.parentNode,h=null;[].forEach.call(sec.querySelectorAll('.h'),function(x){if(x.textContent==='Contas de xadrez')h=x;});
    var w=document.createElement('div');w.className='v34-accl';
    w.innerHTML='<b>Contas de xadrez</b><span>Lichess e Chess.com ficam em Centro de Treino › Analisar erros.</span>';
    var bt=document.createElement('button');bt.type='button';bt.className='btn';bt.textContent='Abrir contas Lichess e Chess.com';bt.onclick=V34.contas;w.appendChild(bt);
    sec.insertBefore(w,h||f);if(h)sec.removeChild(h);sec.removeChild(f);
    [].forEach.call(sec.querySelectorAll('.p'),function(x){if(/nunca pede a senha dessas contas/.test(x.textContent))sec.removeChild(x);});
    [].forEach.call(sec.querySelectorAll('.btns'),function(x){if(x.parentNode===sec&&/Lichess|Buscar partidas/.test(x.textContent))sec.removeChild(x);});
   }
  }catch(e){}
  return r;
 };
}

/* ---------- Nivelamento volta para o Centro de Treino ---------- */
(function(){var o=Pages.placementIntro;Pages.placementIntro=function(){var r=o.apply(this,arguments);V34.reback(App.training);return r;};})();
