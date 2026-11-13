/* Rota do Mestre v72 — "Seu maior adversário" com Lichess e Chess.com.
 * O jogo busca as suas partidas públicas de ~3 meses atrás (sem senha), monta o seu DNA daquela época
 * (aberturas que você jogava, ritmo, pressa, estilo, roque, trocas de dama e o nível pelo rating) e você joga contra ele.
 * As contas são as mesmas da Conta Google, do Painel e do "Analisar jogadas": ligou num lugar, vale em todos.
 */
var V72={};
V72.SITES={li:{n:'Lichess',pc:'♞',k:'lichess'},cc:{n:'Chess.com',pc:'♟',k:'chesscom'}};
V72.d=function(){var d=Profile.d;if(!d.v72)d.v72={};return d.v72;};
V72.user=function(s){var a=V32.acc();return s==='li'?a.lichess:a.chesscom;};
V72.mk=function(t){var d=new Date(t);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);};
V72.esc=V32.esc;

/* ---------- busca ---------- */
V72.fetchLi=function(u){
 var now=Date.now(),D=86400000;
 var get=function(since,until){return fetch('https://lichess.org/api/games/user/'+encodeURIComponent(u)+'?since='+since+'&until='+until+'&max=60&clocks=true&finished=true',{headers:{Accept:'application/x-chess-pgn'}})
  .then(function(r){if(r.status===404)throw new Error('usuário não encontrado no Lichess');if(r.status===429)throw new Error('o Lichess pediu para esperar um minuto');if(!r.ok)throw new Error('o Lichess respondeu '+r.status);return r.text();});};
 /* janela de 2 a 4 meses atrás; se tiver pouco, pega as 60 mais recentes antes de 1 mês atrás */
 return get(now-120*D,now-60*D).then(function(t){if(V26.splitPGN(t).length>=5)return t;return get(now-730*D,now-30*D);});
};
V72.fetchCc=function(u){
 return fetch('https://api.chess.com/pub/player/'+encodeURIComponent(V26.nk(u))+'/games/archives').then(function(r){if(r.status===404)throw new Error('usuário não encontrado no Chess.com');if(!r.ok)throw new Error('o Chess.com respondeu '+r.status);return r.json();})
 .then(function(j){
  var arc=(j&&j.archives)||[];if(!arc.length)throw new Error('nenhuma partida pública no Chess.com');
  var tk=V72.mk(Date.now()-90*86400000).replace('-','/'),old=arc.filter(function(a){return a.slice(-7)<=tk;});
  var pick=old.length?old.slice(-2):arc.slice(0,2);
  return Promise.all(pick.map(function(a){return fetch(a+'/pgn').then(function(r){return r.ok?r.text():'';});})).then(function(ts){return ts.join('\n\n');});
 });
};

/* ---------- DNA a partir das partidas ---------- */
V72.tc=function(tc){var m=/^(\d+)(?:\+(\d+))?/.exec(tc||'');return m?{base:+m[1],inc:+(m[2]||0)}:null;};
V72.build=function(site,user,text){
 var me=V26.nk(user),gs=[];
 V26.splitPGN(text).forEach(function(g){var r=V26.build(g);if(r.err)return;var c=V26.nk(r.w)===me?1:(V26.nk(r.b)===me?-1:0);if(!c||r.t0!==1)return;r.col=c;gs.push(r);});
 gs=gs.slice(-60);
 if(gs.length<5)return {err:gs.length?'só encontrei '+gs.length+' partida'+(gs.length>1?'s':'')+' sua'+(gs.length>1?'s':'')+' nessa época; preciso de pelo menos 5':'não encontrei partidas suas nessa época'};
 var rs=[],n=0,fast=0,timed=0,msS=0,msK=0,agg=0,ks=0,qs=0,cnS=0,cast=0,qx=0,dates=[],cnt={1:{},'-1':{}};
 gs.forEach(function(r){
  var el=r.col===1?r.we:r.be;if(el>0)rs.push(el);
  var t=V32.dateOf(r);if(t)dates.push(t);
  var tc=V72.tc(r.tc),inc=tc?tc.inc:0,castled=false;
  for(var k=0;k<r.u.length;k++){
   if((k%2===0?1:-1)!==r.col)continue;
   n++;var s=r.s[k]||'';
   if(/[x+#]/.test(s))agg++;
   if(!castled&&/^O-O/.test(s)){castled=true;cast++;cnS+=Math.floor(k/2)+1;if(/^O-O-O/.test(s))qs++;else ks++;}
   if(r.clk[k]!=null&&k>=2&&r.clk[k-2]!=null){var sp=(r.clk[k-2]-r.clk[k]+inc)*1000;if(sp>=0){timed++;msS+=sp;msK++;if(sp<5000)fast++;}}
  }
  var f=r.f[Math.min(40,r.f.length-1)]||'',bd=f.split(' ')[0];if(r.u.length>=24&&bd.indexOf('Q')<0&&bd.indexOf('q')<0)qx++;
  var key=Dna.enc(r.u.slice(0,12));cnt[r.col][key]=(cnt[r.col][key]||0)+1;
 });
 var lines=function(c){return Object.keys(cnt[c]).map(function(k){return [k,cnt[c][k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,12);};
 rs.sort(function(a,b){return a-b;});
 var med=rs.length?rs[Math.floor(rs.length/2)]:0,e=med?V32.toGame(site,med):600;
 /* erros: estimados pelo nível (o motor do jogo não analisou essas partidas lance a lance) */
 var x=Math.max(5,Math.min(26,26-(e-400)*0.012)),bl=Math.max(1,Math.min(9,9-(e-400)*0.005));
 dates.sort();var mid=dates.length?dates[Math.floor(dates.length/2)]:Date.now()-90*86400000;
 var pc=function(a,b){return b>0?Math.round(a*100/b):0;};
 return {v:1,src:site,m:V72.mk(mid),n:'Você no '+V72.SITES[site].n,e:e,site:med,
  ph:[Math.round(x*7)/10,Math.round(x*10)/10,Math.round(x*11.5)/10],bl:Math.round(bl*10)/10,
  fa:timed>=10?pc(fast,timed):null,fe:1.25,tl:1.3,ag:pc(agg,n),
  cs:cast*10>=gs.length*3?(qs>ks?'q':'k'):'',cn:cast?Math.round(cnS/cast):10,qx:pc(qx,gs.length),ms:msK?Math.round(msS/msK):15000,
  bp:null,bb:null,bq:null,bL:null,bw:null,vs:-1,ow:lines(1),ob:lines(-1),ax:null,g:gs.length,
  from:dates[0]||0,to:dates[dates.length-1]||0};
};
V72.importSite=function(site,btn){
 var u=V72.user(site);if(!u){UiJs.toast('Coloque o seu usuário do '+V72.SITES[site].n+' primeiro.');return;}
 if(V72.busy)return;V72.busy=site;
 if(btn){btn.disabled=true;btn.textContent='Buscando no '+V72.SITES[site].n+'…';}
 var f=site==='li'?V72.fetchLi:V72.fetchCc;
 f(u).then(function(text){
  var dna=V72.build(site,u,text);
  if(dna.err){V72.busy=null;UiJs.toast('No '+V72.SITES[site].n+', '+dna.err+'.');Dna.rival();return;}
  V72.d()[site]={dna:dna,t:Date.now(),user:u};Profile.save();
  /* as mesmas partidas entram no "Analisar jogadas" */
  try{V26.addName(u);V26.importText(text,site==='li'?'lichess':'chesscom',function(){});}catch(e){}
  V72.busy=null;UiJs.toast('Pronto: você de '+Dna.monthLabel(dna.m)+' no '+V72.SITES[site].n+' ('+dna.g+' partidas).');Dna.rival();
 }).catch(function(e){V72.busy=null;UiJs.toast('Não consegui buscar: '+(e&&e.message||'sem conexão')+'.');Dna.rival();});
};
V72.play=function(site){
 var x=V72.d()[site];if(!x)return;var dna=x.dna;
 App.newGhostGame(dna,'Você · '+V72.SITES[site].n+' '+Dna.monthLabel(dna.m),'ext:'+site+':'+dna.m,Dna.duelColor||0);
};

/* ---------- bloco na tela "Seu maior adversário" ---------- */
V72.block=function(box){
 var keep=UiJs.cur;UiJs.cur=box;
 var hd=UiJs.el('div','v72-hd',box);hd.innerHTML='<span class="v72-li">♞ Lichess</span><i>·</i><span class="v72-cc">♟ Chess.com</span>';
 UiJs.el('div','v72-tt',box,'Você de 3 meses atrás nesses sites');
 UiJs.p('Importe as suas partidas de uns 3 meses atrás e enfrente o você daquela época: as mesmas aberturas, o mesmo ritmo, o mesmo estilo e o nível do seu rating de então. Não precisa ter jogado aqui.','v72-tx');
 var any=false;
 ['li','cc'].forEach(function(s){
  var u=V72.user(s);if(!u)return;any=true;
  var x=V72.d()[s],ok=x&&V26.nk(x.user)===V26.nk(u),S=V72.SITES[s];
  var row=UiJs.el('div','v72-row v72-'+s,box);
  var top=UiJs.el('div','v72-rt',row);top.innerHTML='<b>'+S.pc+' '+S.n+'</b><span>@'+V72.esc(u)+'</span>';
  if(ok){
   var d=x.dna,ln=UiJs.el('div','v72-in',row);
   ln.innerHTML='<b>'+Dna.monthLabel(d.m)+'</b> · '+d.g+' partidas · rating '+d.site+' no '+S.n+' → nível <b>'+d.e+'</b> aqui · placar '+Dna.scoreTxt('ext:'+s+':'+d.m);
   var ds=Dna.describe(d,'você').filter(function(t){return !/^Erra |^Gafes|Pontos cegos|^Sem pontos cegos/.test(t);}).slice(0,3);
   if(ds.length){var ul=UiJs.el('ul','v72-ds',row);ds.forEach(function(t){UiJs.el('li','',ul,t);});}
   var bs=UiJs.el('div','v72-bs',row);
   var b1=UiJs.el('button','btn pri',bs,'Desafiar você de '+Dna.monthLabel(d.m));b1.onclick=function(){V72.play(s);};
   var b2=UiJs.el('button','btn',bs,'Atualizar');b2.onclick=function(){V72.importSite(s,b2);};
  }else{
   var bs2=UiJs.el('div','v72-bs',row);
   var b=UiJs.el('button','btn pri',bs2,V72.busy===s?'Buscando no '+S.n+'…':'Importar minhas partidas de 3 meses atrás');b.disabled=V72.busy===s;b.onclick=function(){V72.importSite(s,b);};
  }
 });
 /* campos de integração: os mesmos de todos os menus */
 var fw=UiJs.el('div','v72-form',box);
 if(any){var tg=UiJs.el('button','v72-tog',fw,'Contas do Lichess e do Chess.com ›');var inner=UiJs.el('div','v72-inner',fw);inner.style.display='none';
  tg.onclick=function(){var o=inner.style.display==='none';inner.style.display=o?'':'none';tg.textContent='Contas do Lichess e do Chess.com '+(o?'⌄':'›');if(o&&!inner.firstChild)V32.chessForm(inner);};}
 else{UiJs.el('div','p v72-tx v72-hint',fw,'Só o nome de usuário, sem senha. Ligou aqui, vale no jogo inteiro: Painel, Analisar jogadas e Conta.');V32.chessForm(fw);}
 UiJs.p('O nível de erros desse fantasma é estimado pelo seu rating da época; as aberturas, a pressa, o estilo e o roque vêm das suas partidas de verdade. O duelo não muda o seu Elo.','muted small');
 UiJs.cur=keep;
};
(function(){
 var o=Dna.rival;
 Dna.rival=function(){
  var r=o.apply(this,arguments);
  try{var page=UiJs.cur,first=null;
   [].slice.call(page.querySelectorAll('.p')).some(function(p){if(/Você contra você de 3 meses/.test(p.textContent)){first=p;return true;}return false;});
   var box=document.createElement('div');box.className='v72';V72.block(box);
   /* logo abaixo da explicação, antes de "Meu DNA Enxadrista" */
   if(first&&first.parentNode)first.parentNode.insertBefore(box,first.nextSibling);else page.insertBefore(box,page.firstChild);
   /* sem 20 partidas aqui: o aviso vira alternativa, não bloqueio */
   [].slice.call(page.querySelectorAll('.p')).forEach(function(p){if(/exige 20 partidas analisadas/.test(p.textContent)){var m=/\((\d+)\/20/.exec(p.textContent);p.textContent='Ou crie o fantasma deste jogo: jogue 20 partidas aqui'+(m?' ('+m[1]+'/20 registradas)':'')+' e ele aparece abaixo.';p.className='v72-alt';}});
   /* quando o usuário muda nos campos, a tela se refaz */
   box.addEventListener('change',function(ev){if(ev.target&&ev.target.classList.contains('fi'))setTimeout(function(){if(document.body.contains(box))Dna.rival();},60);});
  }catch(e){}
  return r;
 };
})();
