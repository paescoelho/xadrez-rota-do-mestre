/* ======================= v83 — Jogar no Lichess pelo tabuleiro do Rota do Mestre =======================
 * Usa a Board API oficial do Lichess (https://lichess.org/api#tag/Board), feita para programas operados por uma pessoa:
 * - Login: OAuth 2 com PKCE (o mesmo da v32), sem senha e sem segredo no código. Aqui a autorização FICA neste aparelho
 *   (localStorage 'rdm-li-tok', fora do perfil que vai para a nuvem) para você jogar sem logar de novo; "Sair" a revoga.
 * - Procurar adversário (rápidas e clássicas, valendo rating ou amistosas), desafiar um amigo do Lichess (blitz permitido)
 *   e treinar contra o Stockfish do Lichess (níveis 1–8). Desafios recebidos aparecem para aceitar ou recusar.
 * - Partida: lances, relógio, empate, voltar lance, abandonar/abortar, chat rápido, adversário ausente (reivindicar vitória),
 *   reconexão automática e tela acesa.
 * - Jogo justo (regra do Lichess): durante a partida não há dica, treinador, avaliação, nome de abertura nem lendas.
 *   A análise vem só no fim: a partida é baixada do Lichess e vai para "Analisar jogadas".
 */
var V83={LI:'https://lichess.org',CLIENT:'rota-do-mestre',KEY:'rdm-li-tok',ST:'rdm-lip',
 SCOPES:'board:play challenge:read challenge:write',
 START:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 SEEK:[[10,0],[10,5],[15,10],[30,0],[30,20]],
 FRIEND:[[3,2],[5,0],[5,3],[10,0],[10,5],[15,10],[30,0]],
 opt:{tc:1,rated:true,ftc:3,frated:true,lvl:3,atc:3},
 ev:null,evOn:false,known:{},chal:[],wait:null,g:null,acc:null,accT:0};
V83.host=function(){
 /* só para testes locais: em localhost dá para apontar para um servidor falso do Lichess */
 try{if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){var h=localStorage.getItem('rdm-li-host');if(h)return h;}}catch(e){}
 return V83.LI;
};
V83.esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V83.auth=function(){try{var a=JSON.parse(localStorage.getItem(V83.KEY)||'null');return a&&a.tok?a:null;}catch(e){return null;}};
V83.saveAuth=function(a){try{if(a)localStorage.setItem(V83.KEY,JSON.stringify(a));else localStorage.removeItem(V83.KEY);}catch(e){}};
V83.form=function(o){return Object.keys(o).filter(function(k){return o[k]!=null;}).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(o[k]);}).join('&');};
V83.api=function(path,o){
 o=o||{};var a=V83.auth(),h={};if(a)h.Authorization='Bearer '+a.tok;
 if(o.body)h['Content-Type']='application/x-www-form-urlencoded';
 if(o.json!==false)h.Accept='application/json';
 return fetch(V83.host()+path,{method:o.method||(o.body?'POST':'GET'),headers:h,body:o.body?V83.form(o.body):undefined,signal:o.signal})
  .then(function(r){
   if(r.status===401){V83.expired();throw new Error('autorização expirada');}
   if(!r.ok)return r.text().then(function(t){throw V83.mkErr(t,r.status);});
   return o.text?r.text():r.json().catch(function(){return {};});
  });
};
V83.mkErr=function(t,st){
 var m='';try{var j=JSON.parse(t);m=j.error!=null?j.error:j;}catch(e){m=t;}
 /* erros de formulário vêm como objeto: {"error":{"time":["Invalid time control"]}} */
 if(m&&typeof m==='object')m=Object.keys(m).map(function(k){var v=m[k];return Array.isArray(v)?v.join(' '):String(v);}).join(' ');
 var e=new Error(V83.errTxt(m,st));e.status=st;return e;
};
V83.errTxt=function(m,st){
 m=String(m||'');
 if(/already playing/i.test(m))return 'Você já tem uma partida em andamento no Lichess. Termine-a antes de começar outra.';
 if(/ban|playban/i.test(m)&&st===403)return 'O Lichess suspendeu temporariamente as suas partidas (por abandonos). Tente mais tarde.';
 if(/too many games/i.test(m))return 'O Lichess limita quantas partidas você pode ter abertas ao mesmo tempo.';
 if(/must also play some games as/i.test(m))return 'O Lichess pede que você jogue também com a outra cor.';
 if(/rate.?limit|too many/i.test(m)||st===429)return 'O Lichess pediu para esperar um pouco antes de tentar de novo.';
 if(/cannot be played with the Board API|time control|blitz/i.test(m))return 'O Lichess não permite esse ritmo por aqui. Pelo lobby, só rápidas (10+0 ou mais) e clássicas.';
 if(/not.*found/i.test(m)||st===404)return 'Não encontrado no Lichess.';
 return m?('Lichess: '+m.slice(0,140)):('Erro '+st+' no Lichess.');
};
/* fluxo ndjson: cada linha não vazia vira um objeto; devolve {abort()} */
V83.stream=function(path,o,onObj,onEnd){
 o=o||{};var a=V83.auth(),ctl=typeof AbortController!=='undefined'?new AbortController():null,h={Accept:'application/x-ndjson'};
 if(a)h.Authorization='Bearer '+a.tok;if(o.body)h['Content-Type']='application/x-www-form-urlencoded';
 var done=false,fin=function(err){if(done)return;done=true;if(onEnd)onEnd(err);};
 fetch(V83.host()+path,{method:o.body?'POST':'GET',headers:h,body:o.body?V83.form(o.body):undefined,signal:ctl?ctl.signal:undefined})
 .then(function(r){
  if(r.status===401){V83.expired();throw new Error('autorização expirada');}
  if(!r.ok)return r.text().then(function(t){throw V83.mkErr(t,r.status);});
  if(o.onOpen)o.onOpen();
  if(!r.body||!r.body.getReader){return r.text().then(function(t){t.split('\n').forEach(function(l){l=l.trim();if(l){try{onObj(JSON.parse(l));}catch(e){}}});fin(null);});}
  var rd=r.body.getReader(),dec=new TextDecoder(),buf='';
  var pump=function(){return rd.read().then(function(x){
   if(x.done){if(buf.trim()){try{onObj(JSON.parse(buf));}catch(e){}}fin(null);return;}
   buf+=dec.decode(x.value,{stream:true});var ls=buf.split('\n');buf=ls.pop();
   ls.forEach(function(l){l=l.trim();if(!l)return;var j=null;try{j=JSON.parse(l);}catch(e){}if(j)try{onObj(j);}catch(e){if(window.console)console.error(e);}});
   return pump();});};
  return pump();
 }).catch(function(e){fin(e&&e.name==='AbortError'?null:e);});
 return {abort:function(){done=true;try{if(ctl)ctl.abort();}catch(e){}}};
};

/* ---------- login (autorização que fica neste aparelho) ---------- */
V83.login=function(){
 if(!V32.web()||!window.crypto||!crypto.subtle){UiJs.toast('O Lichess funciona na versão online do jogo.');return;}
 var ver=V32.rand(48),state=V32.rand(16);
 crypto.subtle.digest('SHA-256',new TextEncoder().encode(ver)).then(function(h){
  var s=JSON.stringify({v:ver,s:state,t:Date.now()});
  try{sessionStorage.setItem(V83.ST,s);localStorage.setItem(V83.ST,s);}catch(e){}
  var q={response_type:'code',client_id:V83.CLIENT,redirect_uri:V32.base(),code_challenge_method:'S256',code_challenge:V32.b64u(h),scope:V83.SCOPES,state:state};
  location.href=V83.host()+'/oauth?'+Object.keys(q).map(function(k){return k+'='+encodeURIComponent(q[k]);}).join('&');
 });
};
V83.ret=function(){
 var sp;try{sp=new URLSearchParams(location.search);}catch(e){return false;}
 var st=sp.get('state');if(!st||!(sp.get('code')||sp.get('error')))return false;
 var saved=null;try{saved=JSON.parse(sessionStorage.getItem(V83.ST)||localStorage.getItem(V83.ST)||'null');}catch(e){}
 if(!saved||saved.s!==st)return false;
 try{sessionStorage.removeItem(V83.ST);localStorage.removeItem(V83.ST);history.replaceState(null,'',location.pathname);}catch(e){}
 var code=sp.get('code'),err=sp.get('error');
 setTimeout(function(){V83.finish(code,err,saved.v);},30);
 return true;
};
V83.finish=function(code,err,ver){
 UiJs.page('Lichess',V83.back);
 if(err||!code){UiJs.p('Você não autorizou o acesso no Lichess. Nada foi alterado.','warn');UiJs.btns([['Tentar de novo',V83.login,'pri'],['Voltar',V83.back]]);return;}
 UiJs.p('Conectando com o Lichess…','muted');
 fetch(V83.host()+'/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:V83.form({grant_type:'authorization_code',code:code,code_verifier:ver,redirect_uri:V32.base(),client_id:V83.CLIENT})})
 .then(function(r){if(!r.ok)throw new Error('token '+r.status);return r.json();})
 .then(function(j){if(!j.access_token)throw new Error('sem token');V83.saveAuth({tok:j.access_token,t:Date.now(),exp:j.expires_in?Date.now()+j.expires_in*1000:0});return V83.account(true);})
 .then(function(acc){
  var a=V83.auth();a.user=acc.username||acc.id;a.id=acc.id;V83.saveAuth(a);
  /* o nome entra nas contas do jogo: as partidas de lá passam a ser importadas e analisadas */
  try{var c=V32.acc();if(!c.lichess){c.lichess=a.user;V26.addName(a.user);Profile.save();}}catch(e){}
  UiJs.toast('Conectado ao Lichess como '+a.user+'.');V83.home();
 })
 .catch(function(e){
  V83.saveAuth(null);UiJs.page('Lichess',V83.back);
  UiJs.p('Não foi possível conectar com o Lichess agora ('+V83.esc(e&&e.message||'erro')+').','warn');
  UiJs.btns([['Tentar de novo',V83.login,'pri'],['Voltar',V83.back]]);
 });
};
V83.expired=function(){var was=V83.onHome||V83.wait||V83.g;V83.saveAuth(null);V83.close();UiJs.toast('A autorização do Lichess expirou ou foi revogada. Entre de novo.');if(was)setTimeout(function(){V83.home();},50);};
V83.logout=function(){
 UiJs.modal('Sair do Lichess neste aparelho?','A autorização é revogada no Lichess. Suas partidas e o seu rating lá não mudam.',[['Sair',function(){
  var a=V83.auth();V83.close();
  if(a)fetch(V83.host()+'/api/token',{method:'DELETE',headers:{Authorization:'Bearer '+a.tok}}).catch(function(){});
  V83.saveAuth(null);V83.acc=null;V83.home();},'warn'],['Continuar conectado',null,'pri']]);
};
V83.account=function(force){
 if(!force&&V83.acc&&Date.now()-V83.accT<120000)return Promise.resolve(V83.acc);
 return V83.api('/api/account').then(function(a){V83.acc=a;V83.accT=Date.now();return a;});
};
V83.me=function(){var a=V83.auth();return a&&a.id?a.id:(V83.acc?V83.acc.id:'');};

/* ---------- fluxo de eventos (partidas que começam, desafios) ---------- */
V83.events=function(){
 if(V83.ev||!V83.auth())return;
 clearTimeout(V83.evT);V83.evOther=false;
 V83.evOn=false;
 V83.ev=V83.stream('/api/stream/event',{onOpen:function(){V83.evOn=true;V83.evAt=Date.now();}},function(e){
  if(e.type==='gameStart'&&e.game){
   var id=e.game.gameId||e.game.id;
   if(V83.wait&&!V83.known[id]){V83.stopWait(true);V83.play(id);return;}
   V83.known[id]=e.game;if(V83.onHome)V83.home(true);
  }else if(e.type==='gameFinish'&&e.game){
   var id2=e.game.gameId||e.game.id;delete V83.known[id2];
   if(V83.g&&V83.g.id===id2){V83.g.fin=e.game;if(V83.g.view&&V83.g.over)V83.panel();}
   if(V83.onHome)V83.home(true);
  }else if(e.type==='challenge'&&e.challenge){
   var c=e.challenge,mine=c.challenger&&c.challenger.id===V83.me();
   if(!mine&&!V83.chal.some(function(x){return x.id===c.id;})){V83.chal.push(c);try{UiJs.sfx('chk');}catch(er){}
    if(!V83.g||V83.g.over)UiJs.toast((c.challenger&&c.challenger.name||'Alguém')+' te desafiou no Lichess.');
    if(V83.onHome)V83.home(true);}
  }else if((e.type==='challengeCanceled'||e.type==='challengeDeclined')&&e.challenge){
   V83.chal=V83.chal.filter(function(x){return x.id!==e.challenge.id;});
   if(e.type==='challengeDeclined'&&V83.wait&&V83.wait.cid===e.challenge.id){V83.stopWait();UiJs.toast('O desafio foi recusado.');V83.home();}
   else if(V83.onHome)V83.home(true);
  }
 },function(err){
  V83.ev=null;V83.evOn=false;
  /* cai quando o celular dorme ou a rede oscila: volta sozinho enquanto você estiver no Lichess.
     O Lichess só mantém um fluxo de eventos por conta: se ele cair logo depois de abrir várias vezes seguidas,
     o jogo está aberto em outra aba ou aparelho; aí para de insistir até você voltar a esta tela. */
  var quick=V83.evAt&&Date.now()-V83.evAt<8000;V83.evKick=quick?(V83.evKick||0)+1:0;
  if(V83.evKick>=3){V83.evKick=0;V83.evOther=true;if(V83.onHome)V83.home(true);return;}
  var wait=err&&err.status===429?61000:Math.min(30000,(err?4000:1500)*Math.pow(2,V83.evKick));
  if(V83.auth()&&!document.hidden&&(V83.onHome||V83.wait||(V83.g&&!V83.g.over)))V83.evT=setTimeout(V83.events,wait);
 });
};
V83.close=function(){
 V83.onHome=false;V83.stopWait();
 if(V83.ev){V83.ev.abort();V83.ev=null;}
 if(V83.g){V83.endGame();}
};
V83.back=function(){V83.close();try{V31.home();}catch(e){App.menu();}};

/* ---------- tela inicial do Lichess ---------- */
V83.tcTxt=function(t){return t[0]+'+'+t[1];};
V83.speed=function(t){var s=t[0]*60+t[1]*40;return s<180?'bullet':s<480?'blitz':s<1500?'rápida':'clássica';};
V83.rt=function(p){return p&&p.rating?(p.rating+(p.prov?'?':'')):'—';};
V83.home=function(keep){
 V83.onHome=true;
 var a=V83.auth(),cur;
 var main=document.querySelector('.main'),st=keep&&main?main.scrollTop:0;
 UiJs.page('Lichess',V83.back);cur=UiJs.cur;cur.classList.add('v83');
 if(!a){
  var h=UiJs.el('div','v83-hero',cur);
  h.innerHTML='<i>♞</i><b>Jogue no Lichess pelo seu tabuleiro</b><span>Adversários reais do Lichess, valendo o seu rating de lá, sem sair do jogo.</span>';
  UiJs.ul(['Rápidas e clássicas no lobby; blitz em desafios a amigos e contra o Stockfish do Lichess.',
   'Jogo justo: durante a partida, dicas, treinador e avaliação ficam desligados (regra do Lichess).',
   'No fim, a partida vai sozinha para a sua análise aqui.'],'v83-ul');
  UiJs.btns([['Entrar com Lichess',V83.login,'pri']]);
  UiJs.p('Você digita a senha no site do Lichess, uma única vez; o jogo nunca vê a senha. A autorização fica só neste aparelho e você pode sair quando quiser.','muted small');
  return;
 }
 if(!V83.evOther)V83.events();
 if(V83.evOther){UiJs.p('O Lichess está aberto em outra aba ou aparelho com esta conta. Desafios e buscas funcionam em um lugar de cada vez.','warn small');UiJs.btns([['Usar o Lichess aqui',function(){V83.events();V83.home(true);}]]);}
 var top=UiJs.el('div','v83-top',cur);
 top.innerHTML='<i>♞</i><span><b>'+V83.esc(a.user||'Lichess')+'</b><em class="v83-rts">carregando ratings…</em></span>';
 var lo=UiJs.el('button','v83-out',top,'Sair');lo.type='button';lo.onclick=V83.logout;
 V83.account(false).then(function(acc){var e=top.querySelector('.v83-rts');if(!e)return;var p=acc.perfs||{};
  e.innerHTML='Rápida <b>'+V83.rt(p.rapid)+'</b> · Clássica <b>'+V83.rt(p.classical)+'</b> · Blitz <b>'+V83.rt(p.blitz)+'</b>';}).catch(function(e){var x=top.querySelector('.v83-rts');if(x)x.textContent='ratings indisponíveis agora';});
 /* partidas em andamento e desafios recebidos */
 var ids=Object.keys(V83.known);
 ids.forEach(function(id){var g=V83.known[id],o=g.opponent||{};
  var b=UiJs.el('button','v83-live',cur);b.type='button';
  b.innerHTML='<b>♟ Partida em andamento</b><span>contra '+V83.esc(o.username||o.id||'adversário')+(o.rating?' ('+o.rating+')':'')+(g.isMyTurn?' · <em>sua vez</em>':'')+'</span><i>continuar ›</i>';
  b.onclick=function(){V83.play(id);};});
 V83.chal.forEach(function(c){
  var w=UiJs.el('div','v83-chal',cur),tc=c.timeControl||{},who=c.challenger||{};
  w.innerHTML='<b>'+V83.esc(who.name||who.id||'Alguém')+(who.rating?' ('+who.rating+')':'')+' te desafiou</b><span>'+(tc.type==='clock'?V83.tcTxt([tc.limit/60,tc.increment]):tc.type==='correspondence'?tc.daysPerTurn+' dia(s) por lance':'sem relógio')+' · '+(c.rated?'valendo rating':'amistosa')+'</span>';
  var r=UiJs.el('div','v83-cb',w);
  var y=UiJs.el('button','btn pri',r,'Aceitar');y.onclick=function(){y.disabled=true;V83.wait={kind:'accept'};V83.api('/api/challenge/'+c.id+'/accept',{method:'POST'}).then(function(){V83.chal=V83.chal.filter(function(x){return x.id!==c.id;});V83.waitPage('Abrindo a partida…');},function(e){V83.wait=null;UiJs.toast(e.message);V83.home();});};
  var n=UiJs.el('button','btn',r,'Recusar');n.onclick=function(){V83.api('/api/challenge/'+c.id+'/decline',{method:'POST',body:{reason:'generic'}}).catch(function(){});V83.chal=V83.chal.filter(function(x){return x.id!==c.id;});V83.home(true);};
 });
 /* procurar adversário */
 UiJs.seg('Procurar adversário no Lichess',V83.SEEK.map(function(t,i){return [V83.tcTxt(t),function(){V83.opt.tc=i;V83.home(true);},V83.opt.tc===i,V83.speed(t)];}),5);
 UiJs.seg(null,[['Valendo rating',function(){V83.opt.rated=true;V83.home(true);},V83.opt.rated],['Amistosa',function(){V83.opt.rated=false;V83.home(true);},!V83.opt.rated]],2);
 UiJs.btns([['Procurar adversário',function(){V83.seek(V83.SEEK[V83.opt.tc],V83.opt.rated);},'pri']]);
 UiJs.items([
  {t:'Desafiar um amigo do Lichess',d:'Pelo nome de usuário; blitz também vale',r:'›',f:V83.friendPage},
  {t:'Treinar contra o Stockfish do Lichess',d:'Níveis 1 a 8 · não vale rating',r:'›',f:V83.aiPage}
 ]);
 UiJs.p('Jogo justo: na partida do Lichess não há dica, treinador nem avaliação. A análise vem no fim.','muted small');
 if(keep){var m2=document.querySelector('.main');if(m2)m2.scrollTop=st;}
};
V83.friendPage=function(){
 V83.onHome=false;UiJs.page('Desafiar no Lichess',V83.home);UiJs.cur.classList.add('v83');
 var name=V83.opt.fname||'';
 UiJs.field('Usuário do amigo no Lichess',name,'ex.: rodrigo_123','text',function(v){V83.opt.fname=v.trim();});
 UiJs.seg('Ritmo',V83.FRIEND.map(function(t,i){return [V83.tcTxt(t),function(){V83.opt.ftc=i;V83.friendPage();},V83.opt.ftc===i,V83.speed(t)];}),4);
 UiJs.seg(null,[['Valendo rating',function(){V83.opt.frated=true;V83.friendPage();},V83.opt.frated],['Amistosa',function(){V83.opt.frated=false;V83.friendPage();},!V83.opt.frated]],2);
 UiJs.btns([['Enviar desafio',function(){var u=(V83.opt.fname||'').replace(/^@/,'');if(!/^[A-Za-z0-9_-]{2,30}$/.test(u)){UiJs.toast('Escreva o nome de usuário do Lichess.');return;}V83.challenge(u,V83.FRIEND[V83.opt.ftc],V83.opt.frated);},'pri'],['Voltar',V83.home]]);
 UiJs.p('Seu amigo recebe o desafio no Lichess (no site ou no app de lá) e tem até ele aceitar enquanto esta tela estiver aberta.','muted small');
};
V83.aiPage=function(){
 V83.onHome=false;UiJs.page('Stockfish do Lichess',V83.home);UiJs.cur.classList.add('v83');
 UiJs.seg('Nível',[1,2,3,4,5,6,7,8].map(function(l){return [String(l),function(){V83.opt.lvl=l;V83.aiPage();},V83.opt.lvl===l];}),8);
 UiJs.seg('Ritmo',V83.FRIEND.map(function(t,i){return [V83.tcTxt(t),function(){V83.opt.atc=i;V83.aiPage();},V83.opt.atc===i];}),4);
 UiJs.btns([['Jogar',function(){var t=V83.FRIEND[V83.opt.atc];V83.waitPage('Criando a partida…');
  V83.api('/api/challenge/ai',{body:{level:V83.opt.lvl,'clock.limit':t[0]*60,'clock.increment':t[1],color:'random'}})
   .then(function(j){V83.wait=null;V83.play(j.id||j.gameId);},function(e){V83.wait=null;UiJs.toast(e.message);V83.aiPage();});},'pri'],['Voltar',V83.home]]);
 UiJs.p('Partidas contra o computador do Lichess não mudam o seu rating.','muted small');
};

/* ---------- procurar / desafiar: tela de espera ---------- */
V83.waitPage=function(msg,cancel){
 V83.onHome=false;UiJs.page('Lichess',function(){if(cancel)cancel();else V83.stopWait();V83.home();});UiJs.cur.classList.add('v83');
 var w=UiJs.el('div','v83-wait',UiJs.cur);w.innerHTML='<i class="v83-spin">♞</i><b>'+V83.esc(msg)+'</b><span class="v83-wt"></span>';
 var t0=Date.now(),el=w.querySelector('.v83-wt');
 clearInterval(V83.wTick);V83.wTick=setInterval(function(){if(!el.isConnected){clearInterval(V83.wTick);return;}var s=Math.floor((Date.now()-t0)/1000);el.textContent=Math.floor(s/60)+':'+('0'+s%60).slice(-2);},1000);
 if(cancel)UiJs.btns([['Cancelar',function(){cancel();V83.home();}]]);
 try{V31.wake(true);}catch(e){}
};
V83.stopWait=function(keepStream){
 clearInterval(V83.wTick);
 var w=V83.wait;V83.wait=null;
 if(w&&w.h)w.h.abort();
 if(w&&w.cid&&!keepStream)V83.api('/api/challenge/'+w.cid+'/cancel',{method:'POST'}).catch(function(){});
};
V83.ready=function(){
 /* abre o fluxo de eventos antes da busca, para não perder o aviso de início (recomendação do Lichess) */
 V83.events();
 /* ao abrir, o Lichess manda as partidas em andamento: espera esse lote para não confundi-las com a nova */
 return new Promise(function(ok){var n=0,iv=setInterval(function(){if(V83.evOn||++n>40){clearInterval(iv);setTimeout(ok,V83.evAt&&Date.now()-V83.evAt>1500?0:900);}},100);});
};
V83.seek=function(t,rated){
 V83.wait={kind:'seek'};
 V83.waitPage('Procurando adversário · '+V83.tcTxt(t)+(rated?' · valendo rating':' · amistosa'),function(){V83.stopWait();});
 V83.ready().then(function(){
  if(!V83.wait)return;
  V83.wait.h=V83.stream('/api/board/seek',{body:{rated:rated,time:t[0],increment:t[1],variant:'standard'}},function(){},function(err){
   if(!V83.wait||V83.wait.kind!=='seek')return;
   /* o servidor fecha a conexão quando a busca é aceita (o início chega pelos eventos) ou expira */
   setTimeout(function(){if(V83.wait&&V83.wait.kind==='seek'){V83.stopWait();UiJs.toast(err?err.message:'Ninguém aceitou a tempo. Tente de novo ou mude o ritmo.');V83.home();}},err?0:6000);
  });
 });
};
V83.challenge=function(user,t,rated){
 V83.wait={kind:'friend',user:user};
 V83.waitPage('Esperando '+user+' aceitar · '+V83.tcTxt(t),function(){V83.stopWait();});
 V83.ready().then(function(){
  if(!V83.wait)return;
  V83.wait.h=V83.stream('/api/challenge/'+encodeURIComponent(user),{body:{rated:rated,'clock.limit':Math.round(t[0]*60),'clock.increment':t[1],color:'random',keepAliveStream:true}},function(j){
   if(!V83.wait)return;
   var c=j.challenge||(j.id&&j.status?j:null);if(c&&c.id)V83.wait.cid=c.id;
   if(j.done){var d=j.done;if(d==='accepted')return;V83.stopWait(true);UiJs.toast(d==='declined'?user+' recusou o desafio.':'O desafio foi cancelado.');V83.home();}
  },function(err){
   if(V83.wait&&V83.wait.kind==='friend'&&err){V83.stopWait(true);UiJs.toast(err.message);V83.friendPage();}
  });
 });
};

/* ---------- partida ---------- */
V83.norm=function(moves,fen){
 /* o Lichess pode mandar o roque como "rei captura a torre" (e1h1): converte para e1g1 */
 var p=Engine.posFromFEN(fen),out=[];
 for(var i=0;i<moves.length;i++){
  var u=moves[i],legal=App.legalUcis(p);
  if(legal.indexOf(u)<0){var m=/^(e1|e8)([ah])([18])$/.exec(u);if(m)u=u.slice(0,2)+(m[2]==='h'?'g':'c')+m[3];}
  if(legal.indexOf(u)<0)break;
  Engine.makeMove(p,Engine.uciToMove(p,u));p.stack=[];out.push(u);
 }
 return out;
};
V83.pos=function(g,moves){var p=Engine.posFromFEN(g.fen);(moves||g.moves).forEach(function(u){Engine.makeMove(p,Engine.uciToMove(p,u));p.stack=[];});return p;};
V83.turn=function(g){var b=(g.fen.split(' ')[1]==='b');return ((g.moves.length%2===0)!==b)?'w':'b';};
V83.play=function(id){
 V83.stopWait(true);V83.onHome=false;
 if(V83.g&&V83.g.id!==id)V83.endGame();
 if(!V83.g)V83.g={id:id,moves:[],fen:V83.START,me:null,chat:[],status:'started',at:Date.now(),retry:0,view:false};
 V83.events();
 V83.connect();
 V83.page();
 clearInterval(V83.tick);V83.tick=setInterval(V83.onTick,250);
 try{V31.wake(true);}catch(e){}
};
V83.connect=function(){
 var g=V83.g;if(!g||g.h)return;
 g.h=V83.stream('/api/board/game/stream/'+g.id,{onOpen:function(){g.net=true;g.retry=0;V83.netLine();}},function(e){
  if(V83.g!==g)return;
  if(e.type==='gameFull'){
   g.full=e;g.fen=e.initialFen&&e.initialFen!=='startpos'?e.initialFen:V83.START;
   g.white=e.white||{};g.black=e.black||{};g.rated=e.rated;g.speed=e.speed;g.clock=e.clock||null;g.days=e.daysPerTurn||null;
   var me=V83.me();g.me=g.white.id===me?'w':(g.black.id===me?'b':(g.me||'w'));
   try{var ht=document.querySelector('.shell.v83-game .htitle');if(ht)ht.textContent='Lichess · '+V83.pl(g,g.me==='w'?'b':'w').replace(/ \(.*$/,'');}catch(er){}
   V83.state(e.state,true);
  }else if(e.type==='gameState')V83.state(e,false);
  else if(e.type==='chatLine'){if(e.room==='player'){g.chat.push({u:e.username,t:e.text});if(g.chat.length>30)g.chat.shift();if(g.view)V83.panel();}}
  else if(e.type==='opponentGone'){g.gone=e.gone;g.claimAt=e.gone&&e.claimWinInSeconds!=null?Date.now()+e.claimWinInSeconds*1000:null;if(g.view)V83.panel();}
 },function(err){
  if(V83.g!==g)return;g.h=null;g.net=false;V83.netLine();
  if(!g.over&&!(err&&err.status===401)){g.retry++;setTimeout(function(){if(V83.g===g&&!g.over&&!g.h)V83.connect();},err&&err.status===429?61000:Math.min(10000,800*g.retry));}
 });
};
V83.state=function(s,full){
 var g=V83.g;if(!s)return;
 var raw=(s.moves||'').trim()?s.moves.trim().split(/\s+/):[];
 var mv=V83.norm(raw,g.fen),prevN=g.conf==null?-1:g.conf;
 g.conf=mv.length;
 /* lance meu ainda pendente: só aceita o estado do servidor quando ele já contém o lance */
 if(g.pend&&mv.length<g.moves.length&&!(s.status&&s.status!=='started'))return;
 g.pend=null;
 var grew=mv.length>g.moves.length;
 g.moves=mv;g.wtime=s.wtime;g.btime=s.btime;g.at=Date.now();g.status=s.status||'started';g.winner=s.winner||null;
 g.wdraw=!!s.wdraw;g.bdraw=!!s.bdraw;g.wtake=!!s.wtakeback;g.btake=!!s.btakeback;g.exp=s.expiration||null;g.expAt=Date.now();
 if(grew&&prevN>=0&&V83.turn(g)===g.me){try{var p=V83.pos(g);UiJs.sfx(Engine.inCheck(p)?'chk':'mv');if(navigator.vibrate)navigator.vibrate(40);}catch(e){}}
 var over=g.status!=='started'&&g.status!=='created';
 if(over&&!g.over){g.over=true;V83.finishGame();}
 if(g.view)V83.page();
};
V83.left=function(g,c){
 if(!g.clock||g.wtime==null)return null;
 var ms=c==='w'?g.wtime:g.btime;
 if(!g.over&&g.moves.length>=2&&V83.turn(g)===c&&!g.pend)ms-=Date.now()-g.at;
 return Math.max(0,ms);
};
V83.clk=function(ms){if(ms==null)return '';var s=Math.ceil(ms/1000);if(ms<10000)return (ms/1000).toFixed(1);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);};
V83.pl=function(g,c){var p=c==='w'?g.white:g.black;p=p||{};
 if(p.aiLevel)return 'Stockfish nível '+p.aiLevel;
 return (p.title?p.title+' ':'')+(p.name||p.id||'?')+(p.rating?' ('+p.rating+(p.provisional?'?':'')+')':'');};
V83.bars=function(){
 var g=V83.g,b=UiJs.board;if(!g||!b||!g.me)return;
 var opp=g.me==='w'?'b':'w',t=V83.turn(g),live=!g.over;
 var top=V83.pl(g,opp)+(g.clock?' · '+V83.clk(V83.left(g,opp)):''),bot=V83.pl(g,g.me)+' (você)'+(g.clock?' · '+V83.clk(V83.left(g,g.me)):'');
 if(b.flip!==(g.me==='b'))UiJs.bars(bot,top,live&&t===g.me,live&&t===opp);else UiJs.bars(top,bot,live&&t===opp,live&&t===g.me);
 var low=g.clock&&live&&t===g.me&&V83.left(g,g.me)<20000;
 var bars=document.querySelectorAll('.pbar.on');for(var i=0;i<bars.length;i++)bars[i].classList.toggle('v83-low',!!low);
};
V83.onTick=function(){
 var g=V83.g;if(!g){clearInterval(V83.tick);return;}
 if(!g.view)return;
 V83.bars();
 var x=document.querySelector('.v83-exp');
 if(x&&g.exp){var left=Math.max(0,g.exp.millisToMove-g.exp.idleMillis-(Date.now()-g.expAt));x.textContent='Faça o primeiro lance em '+Math.ceil(left/1000)+' s, senão a partida é cancelada.';}
 var c=document.querySelector('.v83-claim');
 if(c&&g.claimAt){var s=Math.ceil((g.claimAt-Date.now())/1000);if(s<=0&&!c.dataset.ok){c.dataset.ok=1;V83.panel();}else if(s>0)c.textContent='O adversário saiu. Você poderá reivindicar a vitória em '+s+' s.';}
};
V83.page=function(){
 var g=V83.g;if(!g)return;
 if(!g.view){g.view=true;UiJs.boardPage('Lichess · '+(g.me?V83.pl(g,g.me==='w'?'b':'w'):'partida'),V83.leaveGame);
  var sh=UiJs.root.querySelector('.shell');if(sh)sh.classList.add('v83-game');}
 var b=UiJs.board;if(!b)return;b.showLost=true;
 var p=V83.pos(g),mine=!g.over&&!g.pend&&g.me&&V83.turn(g)===g.me;
 b.fen=Engine.toFEN(p);if(g.flip==null)g.flip=g.me==='b';b.flip=g.flip;
 b.last=g.moves.length?App.lastOf(g.moves[g.moves.length-1]):null;b.check=App.checkSq(p);
 b.arrows=[];b.marks=[];b.blind=false;b.onSquare=null;b.legal=mine?App.legalUcis(p):null;b.onMove=V83.onMove;b.clearSel();b.draw();
 V83.bars();V83.panel();
};
V83.panel=function(){
 var g=V83.g;if(!g||!g.view)return;
 UiJs.panel(true);var cur=UiJs.cur;cur.classList.add('v83');
 if(!g.me){UiJs.p('Conectando à partida…','muted');return;}
 var opp=g.me==='w'?'b':'w',oppN=V83.pl(g,opp).replace(/ \(.*$/,'');
 if(g.over){V83.result();return;}
 var mine=V83.turn(g)===g.me;
 UiJs.p(g.pend?'Enviando seu lance…':mine?(g.moves.length===0?'Sua vez: você começa de Brancas.':'Sua vez!'):'Vez de '+oppN+'.',mine&&!g.pend?'gold':'');
 if(g.exp&&g.moves.length<2){var e=UiJs.el('div','p warn v83-exp',cur);e.textContent='';}
 if(g.gone){var cl=UiJs.el('div','p warn v83-claim',cur);
  if(g.claimAt&&Date.now()>=g.claimAt){cl.textContent=oppN+' saiu da partida.';cl.dataset.ok=1;
   UiJs.btns([['Reivindicar vitória',function(){V83.api('/api/board/game/'+g.id+'/claim-victory',{method:'POST'}).catch(function(e){UiJs.toast(e.message);});},'pri'],['Reivindicar empate',function(){V83.api('/api/board/game/'+g.id+'/claim-draw',{method:'POST'}).catch(function(e){UiJs.toast(e.message);});}]]);}
  else cl.textContent=oppN+' saiu da partida. Espere um pouco: ele pode voltar.';}
 var od=opp==='w'?g.wdraw:g.bdraw,md=g.me==='w'?g.wdraw:g.bdraw,ot=opp==='w'?g.wtake:g.btake,mt=g.me==='w'?g.wtake:g.btake;
 if(od){UiJs.p(oppN+' ofereceu empate.','warn');UiJs.btns([['Aceitar empate',function(){V83.act('draw/yes');},'pri'],['Recusar',function(){V83.act('draw/no');}]]);}
 else if(md)UiJs.p('Empate oferecido. Esperando a resposta…','muted small');
 if(ot){UiJs.p(oppN+' pediu para voltar o último lance.','warn');UiJs.btns([['Aceitar',function(){V83.act('takeback/yes');},'pri'],['Recusar',function(){V83.act('takeback/no');}]]);}
 else if(mt)UiJs.p('Pedido de voltar lance enviado…','muted small');
 var bs=[];
 if(g.moves.length>=2&&!md&&!od)bs.push(['Oferecer empate',function(){V83.act('draw/yes');}]);
 if(g.moves.length>=2&&!mt&&!ot&&!(g.black&&g.black.aiLevel)&&!(g.white&&g.white.aiLevel))bs.push(['Voltar lance',function(){V83.act('takeback/yes');}]);
 bs.push(['Virar',function(){g.flip=!g.flip;V83.page();}]);
 bs.push(g.moves.length<2?['Cancelar partida',function(){UiJs.modal('Cancelar a partida?','Antes do segundo lance a partida pode ser cancelada sem resultado.',[['Cancelar partida',function(){V83.act('abort');},'warn'],['Continuar',null,'pri']]);},'warn']
  :['Abandonar',function(){UiJs.modal('Abandonar a partida?','Conta como derrota no Lichess'+(g.rated?' e muda o seu rating de lá.':'.'),[['Abandonar',function(){V83.act('resign');},'warn'],['Continuar',null,'pri']]);},'warn']);
 UiJs.btns(bs);
 /* chat rápido com o adversário (sala dos jogadores) */
 if(!(g.black&&g.black.aiLevel)&&!(g.white&&g.white.aiLevel)){
  var ch=UiJs.el('div','v83-chat',cur);
  g.chat.slice(-3).forEach(function(m){var l=UiJs.el('div','v83-cl',ch);l.innerHTML='<b>'+V83.esc(m.u)+':</b> '+V83.esc(m.t);});
  var qr=UiJs.el('div','v83-qr',ch);
  ['Olá!','Boa sorte!','Bom jogo!','Obrigado!'].forEach(function(t){var b=UiJs.el('button','v83-q',qr,t);b.type='button';b.onclick=function(){V83.api('/api/board/game/'+g.id+'/chat',{body:{room:'player',text:t}}).catch(function(e){UiJs.toast(e.message);});};});
 }
 var nl=UiJs.el('div','v83-net',cur);V83.netLine();
 UiJs.p((g.rated?'Valendo rating':'Amistosa')+(g.clock?' · '+V83.tcTxt([g.clock.initial/60000,g.clock.increment/1000]):g.days?' · '+g.days+' dia(s) por lance':'')+' · jogo justo: dicas, treinador e avaliação desligados até o fim.','muted small');
};
V83.netLine=function(){var el=document.querySelector('.v83-net'),g=V83.g;if(!el||!g)return;el.textContent=!g.net&&!g.over?'Reconectando ao Lichess…':'';};
V83.act=function(what){
 var g=V83.g;if(!g)return;
 V83.api('/api/board/game/'+g.id+'/'+what,{method:'POST'}).catch(function(e){UiJs.toast(e.message);});
};
V83.onMove=function(u4){
 var g=V83.g;if(!g||g.over||g.pend||V83.turn(g)!==g.me)return;
 var p=V83.pos(g);
 App.pickPromo(App.legalUcis(p),u4,function(uci){
  if(!g||g.over||g.pend)return;
  var before=g.moves.slice();
  /* o relógio local desconta o tempo usado até agora; o servidor corrige no próximo estado */
  if(g.clock&&g.moves.length>=2){var k=g.me==='w'?'wtime':'btime';g[k]=Math.max(0,g[k]-(Date.now()-g.at))+(g.clock.increment||0);g.at=Date.now();}
  g.moves=g.moves.concat([uci]);g.pend=uci;
  try{var q=V83.pos(g);UiJs.sfx(Engine.inCheck(q)?'chk':(/x/.test(V31.sans(g.fen===V83.START?g.moves:[]).pop()||'')?'cap':'mv'));}catch(e){}
  V83.page();
  V83.api('/api/board/game/'+g.id+'/move/'+uci,{method:'POST'}).then(function(){if(V83.g===g&&g.pend===uci){g.pend=null;if(g.conf!=null&&g.conf<g.moves.length)g.pend=uci;}V83.page();},
   function(e){if(V83.g!==g)return;g.pend=null;g.moves=before;UiJs.toast(e.message);V83.page();});
 });
};
V83.howTxt=function(g){
 var s=g.status,w=g.winner,me=g.me,oppN=V83.pl(g,me==='w'?'b':'w').replace(/ \(.*$/,'');
 var T={mate:'xeque-mate',resign:w===me?oppN+' abandonou':'você abandonou',stalemate:'afogamento',timeout:w===me?oppN+' saiu da partida':'você saiu da partida',outoftime:'tempo esgotado',
  draw:'empate combinado',aborted:'partida cancelada',noStart:'o primeiro lance não foi feito a tempo',insufficientMaterialClaim:'material insuficiente',cheat:'jogo injusto detectado',variantEnd:'fim da variante'};
 return T[s]||s;
};
V83.result=function(){
 var g=V83.g,cur=UiJs.cur;
 if(g.status==='aborted'||g.status==='noStart'){UiJs.p('Partida cancelada ('+V83.howTxt(g)+'). Não conta para o rating.','big gold');}
 else{var sc=!g.winner?0.5:(g.winner===g.me?1:0);
  UiJs.p((sc>=1?'Vitória!':sc<=0?'Derrota.':'Empate.')+' ('+V83.howTxt(g)+')','big '+(sc>=1?'good':sc<=0?'bad':'gold'));
  var rd=g.fin&&g.fin.ratingDiff;
  if(g.rated)UiJs.p(rd==null?'O Lichess atualiza o seu rating em instantes.':rd===0?'Seu rating no Lichess não mudou.':'Seu rating no Lichess: '+(rd>0?'+':'')+rd+'.',rd>0?'good':'muted');}
 var bs=[];
 if(g.moves.length>=4)bs.push(['Analisar esta partida',V83.analyse,'pri']);
 var opp=g.me==='w'?g.black:g.white;
 if(opp&&opp.id&&!opp.aiLevel&&g.clock)bs.push(['Desafiar de novo',function(){var t=[g.clock.initial/60000,g.clock.increment/1000];V83.endGame();V83.challenge(opp.id,t,!!g.rated);}]);
 bs.push(['Nova partida',function(){V83.endGame();V83.acc=null;V83.home();}]);
 UiJs.btns(bs);
 var ml=App.movesText(V31.sans(g.fen===V83.START?g.moves:[]));if(ml)UiJs.p(ml,'muted small');
 var lk=UiJs.el('a','v83-link',cur,'Ver a partida no Lichess ›');lk.href=V83.LI+'/'+g.id;lk.target='_blank';lk.rel='noopener';
};
V83.finishGame=function(){
 var g=V83.g;try{V31.wake(false);}catch(e){}
  V83.acc=null;
 /* a partida também entra no histórico daqui (sem mexer no seu Elo do jogo) */
 try{var d=Profile.d;if(!d.v83done)d.v83done={};
  if(!d.v83done[g.id]&&g.moves.length>=2&&g.status!=='aborted'&&g.status!=='noStart'){d.v83done[g.id]=1;
   var sc=!g.winner?0.5:(g.winner===g.me?1:0),opp=g.me==='w'?g.black:g.white;
   Profile.addHistory({t:Date.now(),col:g.me==='w'?1:-1,res:sc,opp:V83.pl(g,g.me==='w'?'b':'w')+' · Lichess',oppElo:opp&&opp.rating||0,cat:'lichess',
    tc:g.clock?V83.tcTxt([g.clock.initial/60000,g.clock.increment/1000]):'',ucis:g.fen===V83.START?g.moves.slice():[],how:V83.howTxt(g),rated:false,human:!(opp&&opp.aiLevel),live:true,li:g.id});
   Profile.save();}}catch(e){}
 setTimeout(function(){if(V83.g===g&&g.view)V83.panel();},2500);
};
V83.analyse=function(){
 var g=V83.g;if(!g)return;UiJs.toast('Baixando a partida do Lichess…');
 fetch(V83.host()+'/game/export/'+g.id+'?clocks=true&evals=false&literate=false').then(function(r){if(!r.ok)throw new Error('erro '+r.status);return r.text();}).then(function(pgn){
  if(typeof V26==='undefined'||!V26.importText)throw new Error('análise indisponível');
  V26.importText(pgn,'lichess',function(){V83.endGame();try{V26.lab();}catch(e){App.menu();}UiJs.toast('Partida na fila de análise: os lances aparecem em "Analisar jogadas".');});
 }).catch(function(e){UiJs.toast('Não deu para baixar agora ('+e.message+'). Ela entra na próxima importação automática.');});
};
V83.endGame=function(){
 var g=V83.g;clearInterval(V83.tick);
 if(g&&g.h)g.h.abort();V83.g=null;try{V31.wake(false);}catch(e){}
};
V83.leaveGame=function(){
 var g=V83.g;
 if(g&&!g.over){UiJs.modal('Sair da tela da partida?','A partida continua no Lichess e o seu relógio segue correndo. Você pode voltar por "Partida em andamento".',[['Sair mesmo assim',function(){V83.endGame();V83.home();},'warn'],['Voltar à partida',null,'pri']]);return;}
 V83.endGame();V83.home();
};
if(typeof document!=='undefined'){
 document.addEventListener('visibilitychange',function(){
  if(document.hidden)return;
  var g=V83.g;if(g&&!g.over){try{V31.wake(true);}catch(e){}if(!g.h)V83.connect();}
  if(V83.auth()&&!V83.ev&&(V83.onHome||V83.wait||(g&&!g.over)))V83.events();
 });
}

/* volta do login do Lichess e botão "Jogar no Lichess" do Jogar online */
(function(){
 if(typeof window==='undefined'||typeof document==='undefined')return;
 if(typeof Online!=='undefined'){var o=Online.fromUrl;Online.fromUrl=function(){if(V83.ret())return true;return o.apply(this,arguments);};}
})();
