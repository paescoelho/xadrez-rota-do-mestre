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


/* ---------- Jogar online (v42): radar com o WhatsApp no centro e selo AO VIVO ---------- */
V34.RADAR='<svg viewBox="0 0 70 70" width="100%" height="100%" aria-hidden="true"><defs>'
 +'<radialGradient id="v34rg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="rgba(76,210,138,.2)"/><stop offset="1" stop-color="rgba(76,210,138,0)"/></radialGradient>'
 +'<linearGradient id="v34sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(76,210,138,0)"/><stop offset="1" stop-color="rgba(76,210,138,.6)"/></linearGradient></defs>'
 +'<circle cx="35" cy="35" r="33" fill="url(#v34rg)" stroke="rgba(76,210,138,.4)"/><circle cx="35" cy="35" r="24" fill="none" stroke="rgba(76,210,138,.35)"/><circle cx="35" cy="35" r="15" fill="none" stroke="rgba(76,210,138,.35)"/>'
 +'<path d="M35 2v66M2 35h66" stroke="rgba(76,210,138,.18)" stroke-width=".8"/>'
 +'<g class="v34-sweep"><path d="M35 35L35 2A33 33 0 0 1 63.6 18.5Z" fill="url(#v34sw)"/></g>'
 +'<g class="v34-blip b1"><circle cx="56" cy="15" r="3.2" fill="#4cd28a"/><circle class="v34-ring" cx="56" cy="15" r="6" fill="none" stroke="#4cd28a"/></g>'
 +'<g class="v34-blip b2"><circle cx="14" cy="50" r="2.6" fill="#4cd28a"/><circle class="v34-ring" cx="14" cy="50" r="5" fill="none" stroke="#4cd28a"/></g>'
 +'<circle cx="35" cy="35" r="13.5" fill="#25D366" stroke="#0b0a08" stroke-width="1.5"/>'
 +'<path d="M28.6 42l1.1-3.4A7 7 0 1 1 32.1 40.8z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>'
 +'<path d="M32.2 31.3c.35 2.1 2.45 4.6 5.25 5.5l1.1-1.25 1.7.85c-.2 1.1-1.1 1.8-2.25 1.7-3.35-.4-6.6-3.65-7-7-.15-1.1.55-2 1.7-2.25l.85 1.7z" fill="#fff"/></svg>';
V34.onlineTile=function(m){
 var b=V34.findItem(m,'Jogar online');if(!b||b.querySelector('.v34-rad'))return;
 var old=b.querySelector('.mwa');if(old)old.parentNode.removeChild(old);
 var r=document.createElement('span');r.className='mic v34-rad';r.innerHTML=V34.RADAR;b.insertBefore(r,b.firstChild);
 var lv=document.createElement('span');lv.className='v34-live';lv.textContent='AO VIVO';b.appendChild(lv);
 b.classList.add('v34-online');
};
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
  V34.onlineTile(m);
  var h=V34.findItem(m,'Apoiar o projeto');if(h){h.classList.add('v25-item');V34.addIcon(h,'v25-mic',V34.HEART);}
  /* deixa o login do Google pronto para abrir no primeiro toque */
  var C=V34.C();
  if(C&&!C.user&&!C.loaded&&!C.loading&&C.web&&C.web()&&C.configured&&C.configured())setTimeout(function(){try{if(!C.loaded&&!C.loading&&navigator.onLine!==false&&document.querySelector('.menu .v34-gt'))C.load().catch(function(){});}catch(e){}},2500);
 }catch(e){}
};

/* ---------- Jogar (v44): tela Nova partida cabe sem rolar no celular; "Começar nova partida" e, no fim, "Continuar partida" ---------- */
(function(){var o=App.setupGame;App.setupGame=function(){
 var r=o.apply(this,arguments);
 try{
  var cur=UiJs.cur;if(!cur)return r;
  cur.classList.add('v34-setup');
  [].forEach.call(cur.querySelectorAll('.btn'),function(x){if(/^Começar partida/.test(x.textContent))x.textContent='Começar nova partida';});
  var c=V34.cont();
  if(c){
   var bt=document.createElement('button');bt.type='button';bt.className='v34-cont';
   bt.innerHTML='<span class="v34-cic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></span><span class="v34-ctx"><b>Continuar partida</b><i>'+V34.esc(c.d)+'</i></span><em aria-hidden="true">›</em>';
   bt.onclick=function(){c.f();};
   cur.appendChild(bt);
  }
 }catch(e){}
 return r;
};})();


/* ---------- Aprenda antes de jogar (v46): tudo numa tela, sem rolar no celular ---------- */
App.beginnerIntro=function(){
 UiJs.page('Aprenda antes de jogar',App.setupGame);
 var cur=UiJs.cur;cur.classList.add('v34-intro');
 var hd=UiJs.el('div','v34-ih',cur);
 hd.innerHTML='<b>Seu primeiro jogo de xadrez</b><span>Objetivo: dar <em>xeque-mate</em>, quando o rei está atacado e não tem para onde fugir. As brancas começam e cada lado tem 16 peças.</span>';
 var P=[['♙','Peão','1 casa à frente (2 na primeira vez). Captura na diagonal e promove no fim.'],['♖','Torre','Em linha reta, quantas casas quiser.'],
  ['♘','Cavalo','Em L. É a única peça que salta outras.'],['♗','Bispo','Nas diagonais, quantas casas quiser.'],
  ['♕','Dama','Em qualquer direção, quantas casas quiser.'],['♔','Rei','1 casa em qualquer direção, nunca para casa atacada.']];
 var g=UiJs.el('div','v34-ip',cur);
 P.forEach(function(x){var c=UiJs.el('div','v34-ipc',g);c.innerHTML='<i>'+x[0]+'</i><span><b>'+x[1]+'</b>'+x[2]+'</span>';});
 var how=UiJs.el('div','v34-ihow',cur);
 how.innerHTML='<b>Como jogar:</b> toque numa peça sua e depois na casa marcada. <b>Dica</b> mostra lances e ameaças; toque na peça que o computador moveu para ver o motivo.<small>Regras especiais: roque (protege o rei), en passant (captura especial de peão) e promoção.</small>';
 var row=UiJs.el('div','v34-ibt',cur);
 var t=document.createElement('button');t.type='button';t.className='btn v30-train';
 var n=0,tot=0;try{var dn=V30.done();tot=V30.T.length;n=V30.T.filter(function(x){return dn[x.id];}).length;}catch(e){}
 t.innerHTML='♞ Treinar movimento das peças'+(n?'<small>'+(n===tot?'concluído ✓':n+' de '+tot+' peças')+'</small>':'');
 t.onclick=function(){try{V30.tutOpen();}catch(e){}};row.appendChild(t);
 var go=document.createElement('button');go.type='button';go.className='btn pri';go.textContent='Entendi · começar partida';go.onclick=function(){App.newGame();};row.appendChild(go);
};

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
 /* topo: Analisar jogadas do Lichess e Chess (com animação das partidas chegando dos sites); depois o treino sugerido pelo Raio-X */
 var cap=m.querySelector('.ctcap'),after=cap;
 try{var top=V34.aeBanner(ms);if(after&&after.nextSibling)m.insertBefore(top,after.nextSibling);else m.appendChild(top);after=top;}catch(e){}
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
 var g2=sec(2,'Sua rotina',[
  {t:'Plano do dia',d:s.placed&&!s.dailyAll?'Próximo passo · 15, 30 ou 60 min':'15, 30 ou 60 min',f:Pages.daily,hl:s.placed&&!s.dailyAll},
  {t:'Trilha',d:'10 etapas até mestre',f:Pages.trail}
 ]);
 /* Estudo sério hoje: dentro de "Sua rotina", antes do Plano do dia */
 try{var w2=g2.parentNode,card=V23.studyCard(w2);card.onclick=V23.studyPage;card.setAttribute('role','button');card.classList.add('v34-clock');w2.insertBefore(card,g2);}catch(e){}
 sec(3,'Treinos por tema',[
  {t:'Treino de visão',d:'Casas e memória',f:V23.vision},
  {t:'Táticas',d:'Temas, Storm, Rush',f:Pages.tactics},
  {t:'Padrões de mate',d:'Do corredor ao Boden',f:V23.mates},
  {t:'Aberturas',d:'Seu repertório',f:Pages.openings},
  {t:'Estruturas',d:'Planos de peões',f:Pages.structs},
  {t:'Finais',d:'Ganhar e defender',f:Pages.endgames},
  {t:'Partidas de mestres',d:'Adivinhe o lance',f:Pages.models}
 ]);
 sec(4,'Seu pensamento',[
  {t:'Laboratório do Pensamento',d:'Descubra como você pensa',f:V26.lab,wide:true,ico:'eye'}
 ]);
 sec(5,'Alto rendimento',[
  {t:'Laboratório de alto rendimento',d:'Desafios progressivos · cálculo profundo · biblioteca dos mestres',f:Mestre.hub,wide:true,ico:'ct'}
 ]);
};


/* ---------- banner do topo do Centro de Treino: partidas saindo do Lichess e do Chess.com, passando pela lupa e virando aula ---------- */
V34.AE_SVG='<svg viewBox="0 0 132 64" aria-hidden="true"><defs>'
 +'<path id="v34p1" d="M50,16 C68,16 72,30 92,31"/><path id="v34p2" d="M58,48 C72,48 76,34 92,33"/></defs>'
 +'<path d="M50,16 C68,16 72,30 92,31 M58,48 C72,48 76,34 92,33" fill="none" stroke="rgba(243,217,140,.35)" stroke-width="1" stroke-dasharray="2 3"><animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite"/></path>'
 +'<g class="v34-src"><rect x="1" y="7" width="49" height="18" rx="9" fill="#14181e" stroke="rgba(243,217,140,.7)"/><text x="25.5" y="19.4" text-anchor="middle" font-size="9" font-weight="700" fill="#f2f2f2" font-family="Inter,system-ui,sans-serif">Lichess</text>'
 +'<rect x="1" y="39" width="57" height="18" rx="9" fill="#14181e" stroke="rgba(140,224,170,.75)"/><text x="29.5" y="51.4" text-anchor="middle" font-size="9" font-weight="700" fill="#d9f5e3" font-family="Inter,system-ui,sans-serif">Chess.com</text></g>'
 +'<g class="v34-fly"><text font-size="15" fill="#fff1c4" text-anchor="middle" dy="5" stroke="#1b1406" stroke-width=".5">♞<animateMotion dur="2.4s" repeatCount="indefinite" begin="0s"><mpath href="#v34p1"/></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.8;1" dur="2.4s" repeatCount="indefinite" begin="0s"/></text>'
 +'<text font-size="15" fill="#d9f5e3" text-anchor="middle" dy="5" stroke="#0c241b" stroke-width=".5">♟<animateMotion dur="2.4s" repeatCount="indefinite" begin="1.2s"><mpath href="#v34p2"/></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.8;1" dur="2.4s" repeatCount="indefinite" begin="1.2s"/></text></g>'
 +'<g><circle cx="104" cy="31" r="13" fill="rgba(10,14,12,.8)" stroke="#f3d98c" stroke-width="2"/><path d="M113.5,40.5 L121,48" stroke="#f3d98c" stroke-width="3.2" stroke-linecap="round"/>'
 +'<path d="M99,26 L109,36 M109,26 L99,36" stroke="#ff8a7a" stroke-width="2.4" stroke-linecap="round"><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;.45;.55;.95;1" dur="2.4s" repeatCount="indefinite"/></path>'
 +'<path d="M98.5,31.5 L102.5,35.5 L110,27" fill="none" stroke="#7fe0a8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.45;.55;.95;1" dur="2.4s" repeatCount="indefinite"/></path></g>'
 +'</svg>';
V34.aeBanner=function(ms){
 var b=document.createElement('button');b.type='button';b.className='v34-aeb'+(ms&&ms.due?' due':'');
 var due=ms&&ms.due?'<em>'+ms.due+(ms.due===1?' erro seu volta hoje':' erros seus voltam hoje')+'</em>':'';
 b.innerHTML='<span class="v34-aea">'+V34.AE_SVG+'</span><span class="v34-aet"><b>Analisar jogadas do Lichess e Chess</b><i>Conecte suas contas: o jogo importa as partidas e monta aulas sobre os seus erros</i>'+due+'</span><span class="v34-aer" aria-hidden="true">›</span>';
 b.onclick=function(){V34.erros();};
 return b;
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
 UiJs.page('Analisar jogadas',App.training);
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
    {t:'Analisar jogadas do Lichess e Chess',d:'Conecte suas contas para importar as partidas e montar aulas sobre os seus erros',r:'›',f:V34.erros}
   ]);
   UiJs.cur=keep;
  });});
  V26.timer=V26.timer||setInterval(function(){var e=document.querySelector('.v26-prog');if(e)V26.progLine(e);},1500);
 };
}

/* ---------- Conta Google: uma tela só, enxuta ----------
 * Google · Lichess e Chess.com (campos aqui mesmo) · Backup · Instalar · "Mais opções" recolhido.
 * Sem código de transferência (Flash/Switch). O voltar respeita de onde veio (menu ou Painel). */
V34.accBack=null;
V34.card=function(parent,title,cls){var c=UiJs.el('div','v34-acard'+(cls?' '+cls:''),parent);if(title)UiJs.el('div','v34-acth',c,title);return c;};
V34.inside=function(el,fn){var keep=UiJs.cur;UiJs.cur=el;try{fn();}catch(e){}UiJs.cur=keep;};
V34.restoreAsk=function(){UiJs.modal('Restaurar um backup','Mesclar junta o arquivo com o que está neste aparelho, sem apagar nada. Substituir troca tudo pelo arquivo (uma cópia de segurança fica guardada).',[['Mesclar',function(){V23.restoreFile('merge');},'pri'],['Substituir',function(){V23.restoreFile('replace');}],['Cancelar',null]]);};
V23.account=function(){
 var C=V23.Cloud,v=V23.d();
 /* de onde veio: se já está nesta tela (atualização), mantém; no Painel, volta ao Painel; senão, ao menu */
 if(!(UiJs.root&&UiJs.root.querySelector('.v23-acct'))){var t=document.querySelector('.htitle');V34.accBack=t&&t.textContent==='Painel de evolução'?Pages.profile:App.menu;}
 var back=V34.accBack||App.menu;
 if(C&&C.web()&&C.configured()&&!C.loaded&&!C.loading)C.load().then(function(){if(UiJs.root.querySelector('.v23-acct'))V23.account();}).catch(function(){});
 var y=0;try{var sc=document.querySelector('.content,.page');if(UiJs.root.querySelector('.v23-acct')&&sc)y=sc.scrollTop;}catch(e){}
 UiJs.page('Conta Google',back);
 var cur=UiJs.cur;cur.classList.add('v23-acct','v34-acct');
 /* 1. Google */
 var g=V34.card(cur,null,'v34-ag');
 var hd=UiJs.el('div','v34-agh',g);hd.innerHTML='<span class="v34-agi">'+V34.G_ICO+'</span><span><b'+(C&&C.user?' class="v34-on"><span class="v34-dot" aria-hidden="true"></span>Conectado · sincronizado':'>Conta Google')+'</b><i>'+(C&&C.user?V34.esc(C.user.email||C.user.displayName||'Google'):'Progresso salvo na nuvem, em qualquer aparelho')+'</i></span>';
 V34.inside(g,function(){
  if(!C||!C.configured())UiJs.p('O login com Google ainda não está disponível nesta versão. Use o backup abaixo.','muted small');
  else if(!C.web())UiJs.p('O login com Google funciona no site do jogo. Nesta versão em arquivo, use o backup abaixo.','muted small');
  else if(C.user){
   UiJs.p('Tudo é enviado sozinho para a nuvem. Em outro aparelho, entre com a mesma conta: o progresso é mesclado, nada se perde.','muted small');
   UiJs.btns([['Sincronizar agora',function(){C.pull();UiJs.toast('Sincronizando…');},'pri'],['Sair',C.logout]]);
  }else{
   UiJs.p('O próprio Google confirma quem é você: o jogo nunca vê a senha.','muted small');
   if(C.status)UiJs.p(C.status,'warn small');
   UiJs.btns([['Entrar com Google',function(){v.cloudOn=true;Profile.save();C.login();},'pri']]);
  }
 });
 /* 2. Lichess e Chess.com, aqui mesmo */
 var x=V34.card(cur,'Lichess e Chess.com','v34-ax');
 V34.inside(x,function(){try{V32.chessForm(x);}catch(e){}});
 /* 3. Backup */
 var bk=V34.card(cur,'Backup em arquivo');
 V34.inside(bk,function(){
  UiJs.p('Último backup: '+(v.lastBackup?new Date(v.lastBackup).toLocaleDateString():'nunca')+'. Guarde o arquivo no Drive ou no e-mail.','muted small');
  UiJs.btns([['Baixar backup',V23.backupFile,'pri'],['Restaurar…',V34.restoreAsk]]);
 });
 /* 4. Instalar */
 try{
  var web=/^https?:$/.test(location.protocol),standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  if(web&&!standalone){
   var ins=V34.card(cur,'Instalar como aplicativo');
   V34.inside(ins,function(){
    if(V24.installEvt)UiJs.btns([['Instalar o app',function(){var e=V24.installEvt;V24.installEvt=null;e.prompt();e.userChoice.then(function(){V23.account();});},'pri']]);
    else if(/iphone|ipad|ipod/i.test(navigator.userAgent))UiJs.p('No iPhone: Compartilhar › "Adicionar à Tela de Início".','muted small');
    else UiJs.p('No menu do navegador: "Instalar app" ou "Adicionar à tela inicial".','muted small');
   });
  }
 }catch(e){}
 /* 5. Mais opções (recolhido) */
 var det=document.createElement('details');det.className='v34-more';cur.appendChild(det);
 var sm=document.createElement('summary');sm.textContent='Mais opções';det.appendChild(sm);
 var mb=UiJs.el('div','v34-mb',det);
 V34.inside(mb,function(){
  var bt=[];
  if(C&&C.user){bt.push(['Baixar todas as partidas da nuvem (PGN)',V23.cloudPgn]);}
  var snaps=[];try{snaps=JSON.parse(localStorage.getItem(V23.SNAP)||'[]');}catch(e){}
  if(snaps.length)bt.push(['Desfazer a última restauração ('+new Date(snaps[0].t).toLocaleString().slice(0,16)+')',V23.undoSnap]);
  if(web)bt.push(['Baixar o jogo num arquivo (completo)',function(){location.href='baixar/Rota-do-Mestre-offline.html';}],['Baixar o jogo num arquivo (leve)',function(){location.href='baixar/Rota-do-Mestre-offline-leve.html';}]);
  if(C&&C.user)bt.push(['Apagar meus dados da nuvem',C.wipe,'warn']);
  bt.forEach(function(b){UiJs.btns([b]);});
  UiJs.p('Privacidade: nenhuma senha é pedida aqui. O Lichess e o Chess.com só são lidos pelas partidas públicas.','muted small');
 });
 try{if(y){var sc2=document.querySelector('.content,.page');if(sc2)sc2.scrollTop=y;}}catch(e){}
};
Pages.sync=V23.account;

/* ---------- Nivelamento volta para o Centro de Treino ---------- */
(function(){var o=Pages.placementIntro;Pages.placementIntro=function(){var r=o.apply(this,arguments);V34.reback(App.training);return r;};})();

/* ======================= v48: Apoio ou sugestão ======================= *
 * Tela com duas abas: ♥ Apoiar (Pix, primeiro) e 💬 Sugestão (caixa que só o criador lê, no Painel do criador).
 * As sugestões vão para a coleção "sugestoes" do Firebase: qualquer pessoa pode CRIAR; só a conta do criador LÊ, marca e apaga. */
V34.ADMIN=[];/* identificador (uid) da conta Google do criador: preenchido depois do primeiro login dele */
V34.TIPOS=[['ideia','💡 Ideia'],['erro','🐞 Erro'],['elogio','👍 Elogio'],['outro','Outro']];
V34.sug={tipo:'ideia',msg:'',contato:''};
V34.device=function(){var u=navigator.userAgent||'',d=/iPhone|iPad/.test(u)?(/iPad/.test(u)?'iPad':'iPhone'):/Android/.test(u)?'Android':/Windows/.test(u)?'Windows':/Mac/.test(u)?'Mac':/Linux/.test(u)?'Linux':'outro';
 var b=/Edg\//.test(u)?'Edge':/SamsungBrowser/.test(u)?'Samsung':/CriOS|Chrome\//.test(u)?'Chrome':/Firefox|FxiOS/.test(u)?'Firefox':/Safari/.test(u)?'Safari':'navegador';return d+' · '+b;};
V34.ver=function(){try{var v=document.querySelector('.menu-version');if(v)return v.textContent.replace(/^Versão:\s*/,'');}catch(e){}return '12.11.2026';};
V34.sentToday=function(){try{var o=JSON.parse(localStorage.getItem('rdm-sug')||'{}'),k=new Date().toDateString();return o.d===k?o.n:0;}catch(e){return 0;}};
V34.markSent=function(){try{var k=new Date().toDateString(),n=V34.sentToday()+1;localStorage.setItem('rdm-sug',JSON.stringify({d:k,n:n}));}catch(e){}};
/* uma tela só, sem abas e sem rolar: Pix em cima (primeiro), caixa de sugestão embaixo */
V34.apoio=function(back){
 back=back||App.menu;V25.back=back;
 UiJs.page('Apoio ou sugestão',back);
 var cur=UiJs.cur,S=V34.sug;cur.classList.add('v34-ap');
 try{V25.d().seen=Date.now();Profile.save();}catch(e){}
 /* 1. Pix */
 var pc=UiJs.el('div','v34-apc',cur);
 var sel=V25.sel==null?10:V25.sel,code=V25.payload(sel);
 pc.innerHTML='<div class="v34-aph"><span>♥</span><b>Apoie com Pix</b><i>jogo grátis e sem anúncios</i></div>';
 var vals=UiJs.el('div','v34-apv',pc);
 V25.VALUES.concat([0]).forEach(function(v){var b=UiJs.el('button',sel===v?'on':'',vals,v?'R$ '+v:'Outro');b.type='button';b.onclick=function(){V25.sel=v;V34.apoio(back);};});
 var row=UiJs.el('div','v34-apr',pc);
 var qr=UiJs.el('div','v34-apq',row);qr.innerHTML=V25.svg(code);
 var side=UiJs.el('div','v34-aps',row);
 var c1=UiJs.el('button','btn pri',side,'Pix copia e cola');c1.onclick=function(){V25.copy(code,'Código Pix copiado. Cole no app do banco em "Pix copia e cola".');try{V25.d().copied=(V25.d().copied||0)+1;Profile.save();}catch(e){}};
 var c2=UiJs.el('button','btn',side,'Copiar chave Pix');c2.onclick=function(){V25.copy(V25.PIX.key,'Chave Pix copiada.');};
 UiJs.el('div','v34-apn',side,(sel>0?'R$ '+sel+',00 · ':'')+'Recebedor: Rodrigo Paes Coelho Santana');
 /* 2. Sugestão */
 var sc=UiJs.el('div','v34-sgc',cur);
 sc.innerHTML='<div class="v34-aph"><span>💬</span><b>Mande uma sugestão</b><i>só o criador lê</i></div>';
 var ch=UiJs.el('div','v34-chips',sc);
 V34.TIPOS.forEach(function(x){var b=UiJs.el('button',x[0]===S.tipo?'on':'',ch,x[1]);b.type='button';b.onclick=function(){S.tipo=x[0];[].forEach.call(ch.children,function(c){c.className='';});b.className='on';};});
 var ta=document.createElement('textarea');ta.className='v34-ta';ta.maxLength=1000;ta.placeholder='Sua ideia, o erro que encontrou ou o que achou do jogo…';ta.value=S.msg;ta.oninput=function(){S.msg=ta.value;};sc.appendChild(ta);
 var inp=document.createElement('input');inp.className='v34-in';inp.maxLength=80;inp.placeholder='Seu nome ou contato (opcional)';inp.value=S.contato;inp.oninput=function(){S.contato=inp.value;};sc.appendChild(inp);
 var bt=UiJs.el('button','btn pri wide v34-send',sc,'Enviar sugestão');
 bt.onclick=function(){
  var msg=S.msg.trim();if(msg.length<3){UiJs.toast('Escreva a sua mensagem antes de enviar.');ta.focus();return;}
  if(V34.sentToday()>=5){UiJs.toast('Você já mandou 5 sugestões hoje. Obrigado! Amanhã dá para mandar mais.');return;}
  bt.disabled=true;bt.textContent='Enviando…';
  V31.init().then(function(){
   var fb=window.firebase,u=fb.auth().currentUser;
   return fb.firestore().collection('sugestoes').add({tipo:S.tipo,msg:msg,contato:S.contato.trim().slice(0,80),versao:V34.ver(),aparelho:S.tipo==='erro'?V34.device():'',t:fb.firestore.FieldValue.serverTimestamp(),uid:u.uid});
  }).then(function(){
   V34.markSent();V34.sug={tipo:'ideia',msg:'',contato:''};
   sc.innerHTML='<div class="v34-ok"><b>✓ Sugestão enviada!</b><span>Obrigado por ajudar o Rota do Mestre a evoluir. Ela chegou direto para o criador do jogo.</span></div>';
   var again=UiJs.el('button','btn wide',sc,'Mandar outra sugestão');again.onclick=function(){V34.apoio(back);};
  }).catch(function(e){bt.disabled=false;bt.textContent='Enviar sugestão';UiJs.toast(/config/.test(String(e&&e.message))?'O envio ainda não está ligado nesta versão.':'Não deu para enviar agora. Confira a internet e tente de novo.');});
 };
 UiJs.el('div','v34-apf',cur,'Se for um erro, o jogo junta a versão e o tipo de aparelho. Nada é cobrado nem guardado no Pix: o código é gerado aqui mesmo.');
};
if(typeof V25!=='undefined')V25.page=function(back){V34.apoio(back);};
/* menu: "Apoio ou sugestão" */
(function(){var o=App.menu;App.menu=function(){var r=o.apply(this,arguments);try{var b=V34.findItem(UiJs.root.querySelector('.menu'),'Apoiar o projeto');if(b){b.querySelector('.mt').textContent='Apoio ou sugestão';}}catch(e){}return r;};})();

/* ---------- Painel do criador › Caixa de sugestões (só a conta do criador lê) ---------- */
V34.inbox=function(){
 UiJs.page('Caixa de sugestões',function(){V27.panel();});
 var cur=UiJs.cur;cur.classList.add('v34-inb');
 var C=V23.Cloud;
 var msg=function(t,cls){UiJs.el('div','p '+(cls||'muted'),cur,t);};
 if(!C||!C.user){
  msg('Para ler as sugestões, entre com a sua conta Google (a do criador do jogo).','gold');
  UiJs.btns([['Entrar com Google',function(){V23.account();},'pri']]);return;
 }
 var wait=UiJs.el('div','p muted',cur,'Carregando…');
 V31.fbBoot().then(function(){return window.firebase.firestore().collection('sugestoes').orderBy('t','desc').limit(200).get();}).then(function(qs){
  wait.remove();
  var all=[];qs.forEach(function(d){var x=d.data();x.id=d.id;x.ref=d.ref;all.push(x);});
  var nNew=all.filter(function(x){return !x.lida;}).length,cnt=function(t){return all.filter(function(x){return x.tipo===t;}).length;};
  var st=UiJs.el('div','v34-ist',cur);st.innerHTML='<span><b>'+nNew+'</b>novas</span><span><b>'+all.length+'</b>no total</span><span><b>'+cnt('ideia')+'</b>ideias</span><span><b>'+cnt('erro')+'</b>erros</span>';
  if(!all.length){msg('Nenhuma sugestão ainda.');return;}
  var TAG={ideia:'IDEIA',erro:'ERRO',elogio:'ELOGIO',outro:'OUTRO'};
  all.sort(function(a,b){return (a.guardada?0:1)-(b.guardada?0:1);});
  all.forEach(function(x){
   var c=UiJs.el('div','v34-icard'+(x.lida?'':' novo'),cur);
   var when=x.t&&x.t.toDate?x.t.toDate().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
   var meta=[x.contato||'anônimo',x.versao?'v'+x.versao:'',x.aparelho||''].filter(Boolean).join(' · ');
   c.innerHTML='<div class="v34-it"><span>'+(x.lida?'':'<i class="v34-dotn"></i>')+'<em class="t-'+V34.esc(x.tipo)+'">'+(TAG[x.tipo]||'OUTRO')+'</em>'+(x.guardada?' ⭐':'')+'</span><span>'+when+'</span></div><p></p><div class="v34-im">'+V34.esc(meta)+'</div><div class="v34-ia"></div>';
   c.querySelector('p').textContent=x.msg||'';
   var ac=c.querySelector('.v34-ia');
   var add=function(txt,fn){var b=document.createElement('button');b.type='button';b.textContent=txt;b.onclick=fn;ac.appendChild(b);};
   if(!x.lida)add('✓ Lida',function(){x.ref.update({lida:true}).then(V34.inbox,function(){UiJs.toast('Não deu para marcar.');});});
   add(x.guardada?'☆ Tirar dos guardados':'⭐ Guardar',function(){x.ref.update({guardada:!x.guardada}).then(V34.inbox,function(){UiJs.toast('Não deu para guardar.');});});
   add('🗑 Apagar',function(){UiJs.modal('Apagar esta sugestão?','Não dá para desfazer.',[['Apagar',function(){x.ref.delete().then(V34.inbox,function(){UiJs.toast('Não deu para apagar.');});},'warn'],['Cancelar',null,'pri']]);});
  });
 }).catch(function(e){
  wait.remove();
  if(/permission/i.test(String(e&&(e.code||e.message)))){
   msg('Esta conta ainda não está liberada para ler as sugestões.','warn');
   msg('Envie este identificador ao Claude para liberar a sua conta (não é senha, é só o número da conta no Firebase):');
   var id=UiJs.el('div','v34-uid',cur,C.user.uid);
   UiJs.btns([['Copiar identificador',function(){try{navigator.clipboard.writeText(C.user.uid);UiJs.toast('Copiado.');}catch(err){}},'pri']]);
  }else msg('Não deu para carregar agora. Confira a internet.','warn');
 });
};
if(typeof V27!=='undefined'&&V27.panel){var oP34=V27.panel;V27.panel=function(){var r=oP34.apply(this,arguments);try{var cur=UiJs.cur,dev=cur.querySelector('.v27-dev');var b=document.createElement('button');b.type='button';b.className='v34-inbtn';b.innerHTML='<b>💬 Caixa de sugestões</b><span>Ideias, erros e elogios enviados pelos jogadores. Só a sua conta Google lê.</span><i>›</i>';b.onclick=V34.inbox;if(dev&&dev.nextSibling)cur.insertBefore(b,dev.nextSibling);else cur.insertBefore(b,cur.firstChild);}catch(e){}return r;};}
