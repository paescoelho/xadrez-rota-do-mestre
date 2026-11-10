/* Rota do Mestre v26 — Laboratório do Pensamento (Fase A).
 * Importar partidas (PGN colado ou em arquivo, Lichess e Chess.com), análise em segundo plano com o Stockfish,
 * posições críticas e "Reconstrua seu Pensamento" (Observe, Investigue, Decida, Compreenda, Comprove).
 * Tudo fica no aparelho (IndexedDB, gaveta 'imp'); a internet só é usada se a pessoa pedir a busca no Lichess/Chess.com.
 * Fatos (lances, perdas medidas pelo motor) e hipóteses (a competência provável) são mostrados separados. */
var V26_UI=typeof document!=='undefined';
var V26={busy:false,progress:null,noSF:false};
V26.START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
V26.CAT={
 indefesa:{n:'Peças sem defesa',tags:['hangingPiece'],dim:'tatica',
  fact:'Depois do seu lance, o adversário pôde capturar uma peça que tinha ficado sem defesa.',
  lesson:'Antes de soltar a peça, faça a varredura: depois deste lance, alguma peça minha fica atacada e sem defesa? Quem pode capturá-la?'},
 ameaca:{n:'Ameaças do adversário',tags:['defensiveMove'],dim:'tatica',
  fact:'O lance da partida permitiu uma resposta forte do adversário (captura ou xeque).',
  lesson:'Comece cada lance pela pergunta: o que o adversário quer fazer agora? Imagine que é a vez dele e procure as capturas e os xeques que ele teria.'},
 tatica:{n:'Golpes táticos',tags:['fork','pin','skewer','discoveredAttack','hangingPiece','doubleCheck'],dim:'tatica',
  fact:'Havia um lance forçante (captura, xeque ou mate) bem melhor do que o jogado.',
  lesson:'Antes de um lance tranquilo, confira os seus lances forçantes: xeques, capturas e ameaças. Eles são os primeiros candidatos.'},
 mate:{n:'Mates',tags:['mateIn1','mateIn2','mateIn3'],dim:'tatica',
  fact:'Havia uma sequência de mate e ela não foi jogada.',
  lesson:'Quando o rei adversário tem poucas casas de fuga, procure xeques em sequência: às vezes o mate está a dois ou três lances.'},
 finais:{n:'Finais',tags:['endgame'],dim:'finais',
  fact:'O erro aconteceu num final, com pouco material no tabuleiro.',
  lesson:'No final, o rei vira peça de ataque e cada tempo conta: ative o rei, crie peões passados e calcule as corridas até a promoção.'},
 conversao:{n:'Conversão de vantagem',tags:['advantage','crushing'],dim:'tatica',
  fact:'Você estava em vantagem e a deixou escapar boa parte.',
  lesson:'Com vantagem, simplifique: troque peças, elimine o contrajogo do adversário e não dê chances táticas. Pressa não ajuda.'},
 abertura:{n:'Abertura',tags:['opening'],dim:'tatica',
  fact:'O erro aconteceu na abertura (primeiros 12 lances).',
  lesson:'Na abertura: desenvolva as peças menores, controle o centro, faça o roque cedo e não mova a mesma peça várias vezes sem motivo.'},
 posicional:{n:'Decisões posicionais',tags:['quietMove','advantage'],dim:'tatica',
  fact:'Não havia um golpe tático evidente; o lance jogado piorou a posição aos poucos.',
  lesson:'Sem tática no ar, compare os planos: qual peça está pior colocada? Que casa importante está fraca? Melhore a pior peça.'}
};
V26.d=function(){var d=Profile.d;if(!d.v26)d.v26={};var v=d.v26;if(!v.names)v.names=[];if(!v.rec)v.rec={};if(!v.comp)v.comp={};if(v.lichess==null)v.lichess='';if(v.chesscom==null)v.chesscom='';return v;};
V26.esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V26.hash=function(s){var h1=0x811c9dc5,h2=0x9e3779b1;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);h1^=c;h1=Math.imul(h1,16777619)>>>0;h2=Math.imul(h2^c,2246822519)>>>0;h2=(h2<<13|h2>>>19)>>>0;}return ('0000000'+h1.toString(16)).slice(-8)+('0000000'+h2.toString(16)).slice(-8);};
V26.nk=function(n){return String(n||'').trim().toLowerCase();};
V26.addName=function(n){n=String(n||'').trim();if(!n)return;var v=V26.d();if(v.names.map(V26.nk).indexOf(V26.nk(n))<0)v.names.push(n);Profile.save();};
V26.colorOf=function(r){var N=V26.d().names.map(V26.nk);if(N.indexOf(V26.nk(r.w))>=0)return 1;if(N.indexOf(V26.nk(r.b))>=0)return -1;return 0;};

/* ======================= PGN ======================= */
/* separa um texto em partidas: blocos de etiquetas [Tag "valor"] seguidos dos lances */
V26.splitPGN=function(text){
 text=String(text||'').replace(/^﻿/,'').replace(/\r\n?/g,'\n');
 var lines=text.split('\n'),games=[],cur=null,inMoves=false;
 function push(){if(cur&&(cur.mt.trim()||Object.keys(cur.tags).length))games.push(cur);cur=null;}
 for(var i=0;i<lines.length;i++){
  var L=lines[i],tm=/^\s*\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/.exec(L);
  if(tm){if(!cur||inMoves){push();cur={tags:{},mt:'',raw:''};inMoves=false;}cur.tags[tm[1]]=tm[2].replace(/\\(.)/g,'$1');cur.raw+=L+'\n';continue;}
  if(/^%/.test(L))continue;
  if(!L.trim()){if(cur)cur.raw+='\n';continue;}
  if(!cur)cur={tags:{},mt:'',raw:''};
  inMoves=true;cur.mt+=L+'\n';cur.raw+=L+'\n';
 }
 push();
 /* várias partidas só com lances (sem etiquetas) no mesmo bloco: separa pelo resultado */
 var out=[];
 games.forEach(function(g){
  var parts=g.mt.split(/(\s(?:1-0|0-1|1\/2-1\/2|\*)(?=\s|$))/);
  if(Object.keys(g.tags).length||parts.length<=3){out.push(g);return;}
  for(var k=0;k<parts.length;k+=2){var mt=(parts[k]||'')+(parts[k+1]||'');if(mt.trim())out.push({tags:{},mt:mt,raw:mt.trim()});}
 });
 return out;
};
/* lances, comentários e variantes: as variantes (entre parênteses) são ignoradas; o [%clk] dos comentários é guardado */
V26.tokens=function(mt){
 var out=[],i=0,n=mt.length,depth=0;
 while(i<n){
  var c=mt.charAt(i),j;
  if(c==='{'){j=mt.indexOf('}',i+1);if(j<0)j=n;if(depth===0)out.push({c:mt.slice(i+1,j)});i=j+1;continue;}
  if(c===';'){j=mt.indexOf('\n',i);if(j<0)j=n;i=j+1;continue;}
  if(c==='('){depth++;i++;continue;}
  if(c===')'){if(depth>0)depth--;i++;continue;}
  if(/\s/.test(c)){i++;continue;}
  j=i;while(j<n&&!/[\s{}();]/.test(mt.charAt(j)))j++;
  var tok=mt.slice(i,j);i=j;
  if(depth===0)out.push({t:tok});
 }
 return out;
};
/* SAN -> lance do motor. Aceita: Nf3, Nbd2, R1e2, exd5, e8=Q, e8Q, O-O, 0-0, e.p., +, #, !?, notação longa (e2e4) e letras em português (C, B, T, D, R) */
V26.PC={K:6,Q:5,R:4,B:3,N:2};V26.PT={R:6,D:5,T:4,B:3,C:2};
V26.matchSan=function(pos,tok){
 var legal=Engine.legalMoves(pos),b=pos.board;
 var t=String(tok).replace(/[+#!?]+/g,'').replace(/e\.p\.?$/i,'').replace(/^0-0-0$/,'O-O-O').replace(/^0-0$/,'O-O').replace(/^o-o-o$/i,'O-O-O').replace(/^o-o$/i,'O-O');
 if(!t)return -1;
 if(t==='O-O'||t==='O-O-O'){var lg=t==='O-O-O';for(var i=0;i<legal.length;i++){var m=legal[i];if((m>>15)===2){var fr=m&63,to=(m>>6)&63;if((to<fr)===lg)return m;}}return -1;}
 var u=/^([a-h][1-8])-?([a-h][1-8])([qrbnQRBN])?$/.exec(t);
 if(u){var s=u[1]+u[2]+(u[3]?u[3].toLowerCase():'');for(var k=0;k<legal.length;k++){var uc=Engine.moveToUCI(legal[k]);if(uc===s||(!u[3]&&uc===s+'q'))return legal[k];}}
 function tryMap(map){
  var mm=/^([A-Z])?([a-h])?([1-8])?[x:]?([a-h][1-8])(?:=?\(?([A-Z])\)?)?$/.exec(t);if(!mm)return -1;
  var pt=mm[1]?map[mm[1]]:1;if(!pt)return -1;
  var promo=mm[5]?map[mm[5]]:0;if(mm[5]&&!promo)return -1;
  var dest=Engine.nameSq(mm[4]),ff=mm[2]?mm[2].charCodeAt(0)-97:-1,rr=mm[3]?(+mm[3])-1:-1,c=[];
  for(var i=0;i<legal.length;i++){var m=legal[i],fr=m&63,to=(m>>6)&63,pr=(m>>12)&7;
   if(to!==dest||Math.abs(b[fr])!==pt||(m>>15)===2)continue;
   if(ff>=0&&(fr&7)!==ff)continue;if(rr>=0&&(fr>>3)!==rr)continue;
   if(promo?pr!==promo:(pr!==0&&pr!==5))continue;
   c.push(m);}
  return c.length===1?c[0]:-1;
 }
 var r=tryMap(V26.PC);if(r>=0)return r;
 return tryMap(V26.PT);
};
V26.clk=function(c){var m=/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/.exec(c||'');return m?(+m[1])*3600+(+m[2])*60+(+m[3]):null;};
/* valida e monta uma partida: reconstrói todas as posições; qualquer lance inválido recusa a partida inteira */
V26.build=function(g){
 var T=g.tags||{},v=String(T.Variant||'').toLowerCase();
 if(v&&['standard','from position','chess','normal'].indexOf(v)<0)return {err:'é da variante "'+T.Variant+'", não do xadrez normal'};
 var fen0=T.FEN?T.FEN.trim():V26.START,pos;
 try{pos=Engine.posFromFEN(fen0);if(!pos||!pos.board)throw 0;}catch(e){return {err:'a posição inicial (FEN) é inválida'};}
 var t0=pos.turn,toks=V26.tokens(g.mt||''),u=[],s=[],f=[],clk=[],res=null,bad=null;
 for(var i=0;i<toks.length;i++){
  var tk=toks[i];
  if(tk.c!=null){var c=V26.clk(tk.c);if(c!=null&&u.length)clk[u.length-1]=c;continue;}
  var x=tk.t.replace(/^\d+\.+/,'');if(!x)continue;
  if(/^\$\d+$/.test(x)||/^[!?]+$/.test(x))continue;
  if(/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(x)){res=x==='½-½'?'1/2-1/2':x;break;}
  var mv=V26.matchSan(pos,x);
  if(mv<0){var no=Math.floor((u.length+(t0===1?0:1))/2)+1;bad='o lance '+no+((u.length%2===0)===(t0===1)?'. ':'… ')+x+' não é válido nesta posição';break;}
  f.push(Engine.toFEN(pos));u.push(Engine.moveToUCI(mv));s.push(Engine.moveToSAN(pos,mv));Engine.makeMove(pos,mv);pos.stack=[];
 }
 if(bad)return {err:bad};
 var fin=res||T.Result||'*';
 if(fin==='*')return {err:'a partida não terminou (sem resultado)',unf:true};
 if(u.length<2)return {err:'a partida não tem lances suficientes'};
 var date=String(T.UTCDate||T.Date||'').replace(/\?+/g,'').replace(/\.+$/,'').replace(/^\.+/,'');
 var r={src:'pgn',w:T.White||'?',b:T.Black||'?',we:+T.WhiteElo||null,be:+T.BlackElo||null,res:fin,date:date,ev:T.Event||'',site:T.Site||'',tc:T.TimeControl||'',eco:T.ECO||'',op:T.Opening||'',term:T.Termination||'',
  fen0:fen0,t0:t0,u:u,s:s,f:f,clk:clk,raw:(g.raw||'').trim(),added:Date.now(),col:0,an:null,crit:null};
 r.id='i'+V26.hash(fen0+'|'+u.join(' ')+'|'+V26.nk(r.w)+'|'+V26.nk(r.b)+'|'+date);
 return r;
};
/* importa um texto: devolve o resumo {n, dup, bad[], unf, unknown, names} */
V26.MAXG=300;
V26.importText=function(text,src,done){
 var parts=V26.splitPGN(text),ok=[],bad=[],unf=0,cut=0;
 if(parts.length>V26.MAXG){cut=parts.length-V26.MAXG;parts=parts.slice(0,V26.MAXG);}
 parts.forEach(function(g,k){var r=V26.build(g);
  if(r.err){if(r.unf)unf++;else bad.push('Partida '+(k+1)+(g.tags&&g.tags.White?' ('+g.tags.White+' × '+(g.tags.Black||'?')+')':'')+': '+r.err+'.');}
  else{r.src=src||'pgn';ok.push(r);}});
 if(!parts.length)bad.push('Nenhuma partida encontrada. Confira se o texto está no formato PGN (etiquetas entre colchetes e os lances numerados).');
 var seen={},inBatch=0;ok=ok.filter(function(r){if(seen[r.id]){inBatch++;return false;}seen[r.id]=1;return true;});
 V24.DB.all('imp').then(function(all){
  var ex={};all.forEach(function(x){ex[x.id]=1;});
  var dup=inBatch,fresh=ok.filter(function(r){if(ex[r.id]){dup++;return false;}return true;});
  fresh.forEach(function(r){r.col=V26.colorOf(r);});
  return V24.DB.putAll('imp',fresh).then(function(){
   var unk=fresh.filter(function(r){return !r.col;});
   done({n:fresh.length,dup:dup,bad:bad,unf:unf,cut:cut,unknown:unk.length,names:V26.nameCounts(unk)});
   V26.kick();
  });
 }).catch(function(e){done({err:'Não foi possível guardar neste aparelho ('+(e&&e.message||e)+').'});});
};
V26.nameCounts=function(list){var c={},lab={};list.forEach(function(r){[r.w,r.b].forEach(function(n){var k=V26.nk(n);if(!k||k==='?')return;c[k]=(c[k]||0)+1;lab[k]=n;});});return Object.keys(c).sort(function(a,b){return c[b]-c[a];}).map(function(k){return [lab[k],c[k]];});};
/* depois que a pessoa diz quem é, todas as partidas sem identificação são atualizadas */
V26.identify=function(name,cb){
 V26.addName(name);
 V24.DB.all('imp').then(function(all){var ch=all.filter(function(r){if(r.col||r.src==='app')return false;var c=V26.colorOf(r);if(c){r.col=c;return true;}return false;});return V24.DB.putAll('imp',ch).then(function(){cb(ch.length);V26.kick();});}).catch(function(){cb(0);});
};

/* ======================= busca no Lichess e no Chess.com (só partidas terminadas e públicas) ======================= */
V26.lichessUrl=function(u,n){return 'https://lichess.org/api/games/user/'+encodeURIComponent(u)+'?max='+(n||30)+'&clocks=true&opening=true&finished=true';};
V26.chesscomMonthUrl=function(u,d){d=d||new Date();return 'https://api.chess.com/pub/player/'+encodeURIComponent(V26.nk(u))+'/games/'+d.getFullYear()+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/pgn';};
V26.fetchLichess=function(user,cb){
 fetch(V26.lichessUrl(user,30),{headers:{Accept:'application/x-chess-pgn'}}).then(function(r){if(r.status===404)throw new Error('usuário não encontrado');if(!r.ok)throw new Error('o Lichess respondeu '+r.status);return r.text();}).then(function(t){cb(null,t);}).catch(function(e){cb(e);});
};
V26.fetchChesscom=function(user,cb){
 var base='https://api.chess.com/pub/player/'+encodeURIComponent(V26.nk(user))+'/games/archives';
 fetch(base).then(function(r){if(r.status===404)throw new Error('usuário não encontrado');if(!r.ok)throw new Error('o Chess.com respondeu '+r.status);return r.json();}).then(function(j){
  var arc=(j&&j.archives||[]).slice(-2);if(!arc.length)throw new Error('nenhuma partida pública encontrada');
  return Promise.all(arc.map(function(a){return fetch(a+'/pgn').then(function(r){return r.ok?r.text():'';});}));
 }).then(function(ts){
  /* só as 30 mais recentes */
  var games=V26.splitPGN(ts.join('\n\n'));games=games.slice(-30);
  cb(null,games.map(function(g){return g.raw;}).join('\n\n'));
 }).catch(function(e){cb(e);});
};

/* ======================= partidas do próprio jogo (já analisadas pelo Raio-X) ======================= */
V26.syncApp=function(){
 if(!V24.DB.ok)return Promise.resolve(0);
 return Promise.all([V24.DB.all('moves'),V24.DB.all('imp')]).then(function(x){
  var have={};x[1].forEach(function(r){have[r.id]=1;});
  var hist={};(Profile.d.hist||[]).forEach(function(h){if(h&&h.t)hist[h.t]=h;});
  var add=[];
  x[0].forEach(function(gm){
   if(!gm||!gm.done||!gm.m||!gm.m.length||have['a'+gm.t])return;
   var h=hist[gm.t]||{},sc=h.res!=null?h.res:gm.res,res=sc===0.5?'1/2-1/2':(sc==null?'':(((sc===1)===(gm.col===1))?'1-0':'0-1'));
   var r={id:'a'+gm.t,src:'app',w:gm.col===1?'Você':(h.opp||'Computador'),b:gm.col===1?(h.opp||'Computador'):'Você',res:res,date:new Date(gm.t).toISOString().slice(0,10).replace(/-/g,'.'),
    op:h.opening||'',tc:gm.cat||'',fen0:gm.m[0].f,t0:gm.col,col:gm.col,u:[],s:[],f:[],mine:[],clk:[],raw:'',added:gm.t,an:{done:false,m:{}},crit:null};
   gm.m.forEach(function(mv,k){r.u.push(mv.u);r.f.push(mv.f);r.s.push(SF.san(mv.f,mv.u));r.mine.push(k);
    /* lances sem perda grande: reaproveita a nota do Raio-X; os críticos são analisados de novo para achar a resposta do adversário */
    if(mv.sl!=null&&mv.sl<12)r.an.m[k]={sl:mv.sl,wb:mv.wb,b:mv.b};});
   add.push(r);
  });
  return add.length?V24.DB.putAll('imp',add).then(function(){return add.length;}):0;
 }).catch(function(){return 0;});
};

/* ======================= análise em segundo plano ======================= */
/* a fila de fundo do Stockfish só para enquanto o tabuleiro da partida está na tela */
if(typeof SF!=='undefined')SF.lowOk=function(){return !(App.G&&App.G.over==null&&App.G.recs&&typeof V25!=='undefined'&&V25.gameBoard&&UiJs.board===V25.gameBoard);};
V26.minePlies=function(r){if(r.mine)return r.mine;var out=[];for(var k=0;k<r.u.length;k++){var side=(k%2===0)?r.t0:-r.t0;if(side===r.col)out.push(k);}return out;};
V26.kick=function(){
 V26.idle=false;
 if(V26.busy||!V24.DB.ok||typeof SF==='undefined')return;
 if(SF.failed){V26.noSF=true;return;}
 V26.busy=true;
 V26.syncApp().then(function(){return V24.DB.all('imp');}).then(function(all){
  var todo=all.filter(function(r){return r.col&&!(r.an&&r.an.done);}).sort(function(a,b){return (a.src==='app')-(b.src==='app')||a.added-b.added;});
  V26.pending=todo.length;
  if(!todo.length){V26.busy=false;V26.progress=null;V26.idle=true;return;}
  V26.analyseGame(todo[0],function(){V26.busy=false;V26.refresh();setTimeout(V26.kick,50);});
 }).catch(function(){V26.busy=false;});
};
V26.analyseGame=function(rec,cb){
 if(!rec.an)rec.an={done:false,m:{}};
 var plies=V26.minePlies(rec),i=0,cnt=0;
 function next(){
  while(i<plies.length&&rec.an.m[plies[i]]&&rec.an.m[plies[i]].sl!=null)i++;
  V26.progress={id:rec.id,k:Math.min(i,plies.length),n:plies.length,w:rec.w,b:rec.b};
  if(i>=plies.length){rec.an.done=true;rec.crit=V26.crits(rec);V24.DB.put('imp',rec).then(cb,cb);return;}
  var k=plies[i],fen=rec.f[k],uci=rec.u[k];
  SF.go({fen:fen,depth:12,movetime:260},function(r){
   if(!r||!r.lines.length||!r.best){stall();return;}
   var L=r.lines[0],wb=Coach.winPct(SF.score(L));
   var o={wb:Math.round(wb),b:r.best,bm:L.mate!=null&&L.mate>0?L.mate:0,pv:(L.pv||[]).slice(0,6)};
   if(uci===r.best){o.sl=0;o.rp=(L.pv||[])[1]||null;o.pp=o.pv;rec.an.m[k]=o;i++;save();return;}
   SF.go({fen:fen,depth:11,movetime:200,searchmoves:uci},function(r2){
    if(!r2||!r2.lines.length){stall();return;}
    var L2=r2.lines[0];o.sl=Math.round(Math.max(0,wb-Coach.winPct(SF.score(L2)))*10)/10;o.rp=(L2.pv||[])[1]||null;o.pp=(L2.pv||[]).slice(0,6);
    rec.an.m[k]=o;i++;save();
   },true);
  },true);
 }
 function save(){cnt++;if(cnt%5===0)V24.DB.put('imp',rec).catch(function(){});next();}
 function stall(){V24.DB.put('imp',rec).catch(function(){});if(SF.failed)V26.noSF=true;cb();}
 next();
};
/* sem trabalho pendente, nada é lido do disco; uma importação, uma identificação ou uma partida nova analisada acorda a fila */
setInterval(function(){try{if(!V26.busy&&!V26.idle)V26.kick();}catch(e){}},6000);
if(typeof V24!=='undefined'&&V24.refresh){var _v26r=V24.refresh;V24.refresh=function(){V26.idle=false;return _v26r.apply(this,arguments);};}

/* ======================= posições críticas e competência provável ======================= */
V26.VAL=[0,1,3,3,5,9,0];
V26.crits=function(rec){
 var out=[];
 Object.keys(rec.an.m).forEach(function(kk){var k=+kk,o=rec.an.m[k];if(o&&o.sl!=null&&o.sl>=12&&o.wb>=10&&o.b)out.push({k:k,sl:o.sl,wb:o.wb});});
 out.sort(function(a,b){return b.sl-a.sl;});
 return out.slice(0,3).sort(function(a,b){return a.k-b.k;}).map(function(c){
  var o=rec.an.m[c.k],cl;try{cl=V26.classify(rec.f[c.k],rec.u[c.k],o);}catch(e){cl={cat:'posicional'};}
  return {id:rec.id+':'+c.k,k:c.k,sl:c.sl,wb:c.wb,cat:cl.cat};
 });
};
V26.classify=function(fen,uci,o){
 var pos=Engine.posFromFEN(fen),side=pos.turn,full=+(fen.split(' ')[5]||1);
 var m=Engine.uciToMove(pos,uci),mb=o.b?Engine.uciToMove(pos,o.b):-1,allowed=false,capV=0;
 if(m>=0){
  Engine.makeMove(pos,m);
  var hang=App.hanging(pos,side),rp=o.rp?Engine.uciToMove(pos,o.rp):-1,rpTo=rp>=0?(rp>>6)&63:-1;
  capV=rp>=0&&pos.board[rpTo]!==0?V26.VAL[Math.abs(pos.board[rpTo])]:0;var chk=false;
  if(rp>=0){Engine.makeMove(pos,rp);chk=Engine.inCheck(pos);Engine.unmakeMove(pos);}
  Engine.unmakeMove(pos);
  if(capV>=3&&hang.indexOf(rpTo)>=0)return {cat:'indefesa'};
  allowed=chk||(capV>=1&&hang.indexOf(rpTo)>=0);
 }
 if(o.bm>0)return {cat:'mate'};
 if(allowed)return {cat:'ameaca'};
 var forcing=false;if(mb>=0){var cap=pos.board[(mb>>6)&63]!==0;Engine.makeMove(pos,mb);var ck=Engine.inCheck(pos);Engine.unmakeMove(pos);forcing=cap||ck;}
 if(forcing)return {cat:'tatica'};
 if(capV>=1)return {cat:'ameaca'};
 if(V24.phaseOf(fen)==='f')return {cat:'finais'};
 if(o.wb>=70)return {cat:'conversao'};
 if(full<=12)return {cat:'abertura'};
 return {cat:'posicional'};
};
/* todas as posições críticas, com o estado do treino de cada uma */
V26.allCrits=function(cb){
 V24.DB.all('imp').then(function(all){
  var R=V26.d().rec,out=[];
  all.forEach(function(r){(r.crit||[]).forEach(function(c){var st=R[c.id]||{};var pr=st.proof||[];
   out.push({c:c,r:r,done:pr.some(function(x){return x.ok;}),tried:!!st.t,fails:pr.filter(function(x){return !x.ok;}).length});});});
  out.sort(function(a,b){return (a.done-b.done)||(b.c.sl-a.c.sl);});
  cb(out,all);
 }).catch(function(){cb([],[]);});
};
V26.moveLabel=function(r,k){var p=r.f[k].split(' ');return (+(p[5]||1))+(p[1]==='w'?'. ':'… ')+(r.s[k]||r.u[k]);};

/* ======================= telas ======================= */
V26.reback=function(fn){try{var b=document.querySelector('.hdr .back');if(b)b.onclick=function(){fn();};}catch(e){}};
V26.lab=function(){
 UiJs.page('Laboratório do Pensamento',App.menu);
 var cur=UiJs.cur;cur.classList.add('v26-lab');
 var hd=UiJs.el('div','v26-hero',cur);hd.innerHTML='<b>Descubra como você pensa. Aprenda a evoluir.</b><span>Traga suas partidas do Lichess, do Chess.com ou daqui mesmo. O laboratório encontra as decisões que mais custaram e treina você nelas, com posições novas para comprovar o aprendizado.</span>';
 var st=UiJs.el('div','v26-stat',cur);st.textContent='Carregando…';
 var pr=UiJs.el('div','v26-prog',cur);
 if(!V26.busy)V26.kick();
 V26.syncApp().then(function(){V26.allCrits(function(cr,all){
  var imp=all.filter(function(r){return r.src!=='app';}),an=all.filter(function(r){return r.an&&r.an.done;}),pend=cr.filter(function(x){return !x.done;}).length;
  st.innerHTML='<span><b>'+imp.length+'</b>importadas</span><span><b>'+an.length+'</b>analisadas</span><span><b>'+cr.length+'</b>posições críticas</span><span><b>'+cr.filter(function(x){return x.done;}).length+'</b>comprovadas</span>';
  V26.progLine(pr);
  UiJs.items([
   {t:'Minhas partidas',d:'Importe do Lichess, do Chess.com ou um arquivo PGN',r:imp.length?imp.length+' ›':'importar ›',f:V26.games},
   {t:'Reconstrua seu Pensamento',d:pend?pend+(pend===1?' posição crítica esperando por você':' posições críticas esperando por você'):'As posições críticas das suas partidas aparecem aqui',r:pend?'treinar ›':'›',f:V26.critList},
   {t:'Primeiras observações',d:'Onde as suas decisões mais custaram, com o grau de confiança',r:'›',f:V26.obs},
   {t:'Mapa do seu pensamento',d:'O que você olhou e o que deixou de ver nas partidas daqui',r:'›',f:function(){Mind.page();V26.reback(V26.lab);}},
   {t:'Raio-X das partidas',d:'Calma sob pressão, pressa, certeza e domínio por tema',r:'›',f:function(){if(V24.xray){V24.xray();V26.reback(V26.lab);}}}
  ]);
  UiJs.p('Privacidade: as partidas e as análises ficam neste aparelho. A internet só é usada quando você pede a busca no Lichess ou no Chess.com, e o Rota do Mestre nunca analisa partidas em andamento.','muted small');
 });});
 V26.timer=V26.timer||setInterval(function(){var e=document.querySelector('.v26-prog');if(e)V26.progLine(e);},1500);
};
V26.progLine=function(e){
 if(V26.noSF||(typeof SF!=='undefined'&&SF.failed)){e.textContent='A análise lance a lance usa o Stockfish, que não vem na versão leve. Use o site ou a versão completa para analisar as partidas.';e.className='v26-prog warn';return;}
 var p=V26.progress;
 if(V26.busy&&p&&p.n){e.className='v26-prog on';e.innerHTML='<i style="width:'+Math.round(p.k*100/p.n)+'%"></i><span>Analisando '+V26.esc(p.w)+' × '+V26.esc(p.b)+' · lance '+p.k+' de '+p.n+(V26.pending>1?' · mais '+(V26.pending-1)+' na fila':'')+'</span>';}
 else{e.className='v26-prog';e.textContent='';}
};
V26.refresh=function(){try{var t=document.querySelector('.htitle');if(!t)return;var x=t.textContent;
 if(x==='Laboratório do Pensamento'&&document.querySelector('.v26-lab'))V26.lab();
 else if(x==='Minhas partidas'&&document.querySelector('.v26-games')&&!document.querySelector('.v26-games textarea:focus'))V26.games(true);}catch(e){}};

/* ---------- Minhas partidas ---------- */
V26.games=function(keepScroll){
 var sc=0;try{sc=document.querySelector('.main').scrollTop;}catch(e){}
 UiJs.page('Minhas partidas',V26.lab);
 var cur=UiJs.cur;cur.classList.add('v26-games');
 UiJs.h('Importar partidas');
 UiJs.p('Só partidas terminadas. Você pode colar o PGN, abrir um arquivo ou buscar pelo nome de usuário.','muted small');
 var box=UiJs.el('div','v26-imp',cur);
 var ta=UiJs.el('textarea','v26-ta',box);ta.rows=5;ta.placeholder='[White "Você"]\n[Black "Adversário"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 … 1-0';
 var b1=UiJs.el('div','btns',box);
 var bt=UiJs.el('button','btn pri',b1,'Importar o texto');bt.onclick=function(){if(!ta.value.trim()){UiJs.toast('Cole o PGN primeiro.');return;}V26.run(ta.value,'pgn');};
 var fl=UiJs.el('label','btn',b1,'Abrir arquivo .pgn');var fi=UiJs.el('input','',fl);fi.type='file';fi.accept='.pgn,.txt,text/plain,application/x-chess-pgn';fi.multiple=true;fi.style.display='none';
 fi.onchange=function(){var fs=[].slice.call(fi.files||[]);if(!fs.length)return;Promise.all(fs.map(function(f){return new Promise(function(res){var rd=new FileReader();rd.onload=function(){res(String(rd.result||''));};rd.onerror=function(){res('');};rd.readAsText(f);});})).then(function(ts){V26.run(ts.join('\n\n'),'pgn');});};
 var v=V26.d();
 [['lichess','Lichess','Usuário no Lichess'],['chesscom','Chess.com','Usuário no Chess.com']].forEach(function(x){
  var row=UiJs.el('div','v26-user',box);var inp=UiJs.el('input','v26-in',row);inp.placeholder=x[2];inp.value=v[x[0]]||'';inp.autocapitalize='off';inp.spellcheck=false;
  var b=UiJs.el('button','btn',row,'Buscar no '+x[1]);
  b.onclick=function(){var u=inp.value.trim();if(!u){UiJs.toast('Digite o nome de usuário.');return;}v[x[0]]=u;V26.addName(u);Profile.save();
   b.disabled=true;b.textContent='Buscando…';
   (x[0]==='lichess'?V26.fetchLichess:V26.fetchChesscom)(u,function(err,txt){b.disabled=false;b.textContent='Buscar no '+x[1];
    if(err){V26.netFail(x[0],u,err);return;}V26.run(txt,x[0]);});};
 });
 UiJs.p('A busca usa a internet só para baixar as suas últimas 30 partidas públicas. Se o site bloquear a busca, o jogo mostra um link para baixar o arquivo e importá-lo aqui.','muted small');
 var res=UiJs.el('div','v26-res',cur);
 /* o resumo da última importação continua visível quando a tela se atualiza sozinha (fim de uma análise) */
 if(V26.flash&&Date.now()-V26.flash.t<180000)res.innerHTML=V26.flash.html;
 var lst=UiJs.el('div','v26-list',cur);
 V24.DB.all('imp').then(function(all){
  var imp=all.filter(function(r){return r.src!=='app';}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||b.added-a.added;});
  var unk=imp.filter(function(r){return !r.col;});
  var ow=res.querySelector('.v26-who');if(ow)ow.remove();
  if(unk.length)V26.askWho(res,unk);
  var old=UiJs.cur;UiJs.cur=lst;
  UiJs.h('Partidas importadas ('+imp.length+')');
  if(!imp.length)UiJs.p('Nenhuma partida ainda.','muted');
  UiJs.items(imp.slice(0,200).map(function(r){
   var me=r.col===1?'Brancas':(r.col===-1?'Pretas':null),opp=r.col===1?r.b:(r.col===-1?r.w:null);
   var out=r.res==='1/2-1/2'?'empate':(r.col?((r.res==='1-0')===(r.col===1)?'vitória':'derrota'):r.res);
   var stt=!r.col?'quem é você?':(r.an&&r.an.done?((r.crit||[]).length?(r.crit.length+(r.crit.length===1?' crítica':' críticas')):'✓ sem erros grandes'):'na fila');
   return {t:me?('Você ('+me+') × '+opp):(r.w+' × '+r.b),d:[out,r.date,r.op||r.eco,Math.ceil(r.u.length/2)+' lances',r.src==='lichess'?'Lichess':(r.src==='chesscom'?'Chess.com':'PGN')].filter(Boolean).join(' · '),r:stt,f:function(){V26.game(r.id);}};
  }));
  if(imp.length>200)UiJs.p('Mostrando as 200 mais recentes.','muted small');
  if(imp.length){UiJs.btns([['Exportar PGN',function(){V26.exportPGN(imp);}],['Apagar as importadas',V26.wipe,'warn']]);}
  UiJs.cur=old;
  if(keepScroll===true)try{document.querySelector('.main').scrollTop=sc;}catch(e){}
 }).catch(function(){var old=UiJs.cur;UiJs.cur=lst;UiJs.p('O armazenamento interno deste navegador não está disponível (modo privado?). A importação precisa dele.','warn');UiJs.cur=old;});
};
V26.run=function(text,src){
 var res=document.querySelector('.v26-res');if(res)res.innerHTML='<div class="p muted">Lendo as partidas…</div>';
 setTimeout(function(){V26.importText(text,src,function(o){V26.games(true);var r=document.querySelector('.v26-res');if(!r)return;V26.summary(r,o);try{r.scrollIntoView({block:'start'});}catch(e){}});},30);
};
V26.summary=function(el,o){
 var old=UiJs.cur;UiJs.cur=el;el.innerHTML='';
 if(o.err){UiJs.p(o.err,'warn');UiJs.cur=old;return;}
 var box=UiJs.el('div','v26-sum',el);
 box.innerHTML='<b>'+(o.n?o.n+(o.n===1?' partida importada':' partidas importadas'):'Nenhuma partida nova')+'</b>'+
  (o.dup?'<span>'+o.dup+(o.dup===1?' já estava aqui (repetida)':' já estavam aqui (repetidas)')+'</span>':'')+
  (o.unf?'<span>'+o.unf+(o.unf===1?' partida em andamento ou sem resultado foi ignorada':' partidas em andamento ou sem resultado foram ignoradas')+'</span>':'')+
  (o.cut?'<span>O arquivo tinha mais de '+V26.MAXG+' partidas: '+o.cut+' ficaram de fora. Importe o restante depois.</span>':'')+
  (o.bad.length?'<span class="bad">'+o.bad.length+(o.bad.length===1?' partida recusada:':' partidas recusadas:')+'</span>'+o.bad.slice(0,5).map(function(x){return '<span class="bad">· '+V26.esc(x)+'</span>';}).join('')+(o.bad.length>5?'<span class="bad">· e mais '+(o.bad.length-5)+'</span>':''):'');
 UiJs.cur=old;
 V26.flash={t:Date.now(),html:el.innerHTML};
};
V26.askWho=function(el,unk){
 var names=V26.nameCounts(unk).slice(0,8);if(!names.length)return;
 var box=UiJs.el('div','v26-who',el);
 UiJs.el('b','',box,'Quem é você nestas partidas?');
 UiJs.el('span','',box,unk.length+(unk.length===1?' partida ainda não sabe':' partidas ainda não sabem')+' qual lado é o seu. Toque no seu nome:');
 var bs=UiJs.el('div','btns',box);
 names.forEach(function(n){var b=UiJs.el('button','btn',bs,n[0]+' ('+n[1]+')');b.onclick=function(){V26.identify(n[0],function(k){UiJs.toast(k+(k===1?' partida identificada.':' partidas identificadas.'));V26.games(true);});};});
};
V26.netFail=function(kind,u,err){
 var el=document.querySelector('.v26-res');if(!el)return;
 var url=kind==='lichess'?V26.lichessUrl(u,30):V26.chesscomMonthUrl(u);
 var msg=String(err&&err.message||err||'');var blocked=/fetch|network|load|cors|Failed/i.test(msg);
 el.innerHTML='<div class="v26-sum"><b>Não foi possível buscar agora</b><span>'+V26.esc(blocked?'O site não respondeu a este aplicativo (pode ser falta de internet ou um bloqueio do próprio site).':msg)+'</span>'+
  '<span>Plano B: abra o link abaixo, salve o arquivo e use "Abrir arquivo .pgn" (ou copie o texto e cole acima).</span>'+
  '<a class="btn" href="'+url+'" target="_blank" rel="noopener">Abrir as partidas no '+(kind==='lichess'?'Lichess':'Chess.com')+'</a></div>';
 V26.flash={t:Date.now(),html:el.innerHTML};
};
V26.exportPGN=function(list){UiJs.page('Exportar partidas',function(){V26.games();});UiJs.p(list.length+' partidas importadas, no formato PGN.','muted');UiJs.pre(list.map(function(r){return r.raw;}).filter(Boolean).join('\n\n'),'rota-do-mestre-importadas.pgn');};
V26.wipe=function(){UiJs.modal('Apagar as partidas importadas?','As partidas importadas e as análises delas serão apagadas deste aparelho. As partidas jogadas aqui no Rota do Mestre e o seu progresso não são afetados.',[['Apagar',function(){V24.DB.all('imp').then(function(all){return Promise.all(all.filter(function(r){return r.src!=='app';}).map(function(r){return V24.DB.del('imp',r.id);}));}).then(function(){UiJs.toast('Partidas importadas apagadas.');V26.games();});},'warn'],['Cancelar',function(){}]]);};
V26.game=function(id){
 V24.DB.get('imp',id).then(function(r){
  if(!r){V26.games();return;}
  var back=r.src==='app'?V26.critList:function(){V26.games();};
  UiJs.page(r.src==='app'?'Partida no Rota do Mestre':(r.w+' × '+r.b),back);
  UiJs.p([r.res,r.date,r.ev,r.tc?('ritmo '+r.tc):'',r.op||r.eco].filter(Boolean).join(' · '),'gold');
  if(!r.col){UiJs.p('Ainda não sabemos qual lado é o seu nesta partida.','warn');
   UiJs.btns([['Eu joguei de Brancas',function(){r.col=1;V24.DB.put('imp',r).then(function(){V26.kick();V26.game(r.id);});},'pri'],['Eu joguei de Pretas',function(){r.col=-1;V24.DB.put('imp',r).then(function(){V26.kick();V26.game(r.id);});}]]);
   if(V26.nk(r.w)!=='?'||V26.nk(r.b)!=='?')UiJs.p('Dica: em "Minhas partidas", tocar no seu nome identifica de uma vez todas as partidas em que ele aparece.','muted small');
   return;}
  if(!(r.an&&r.an.done))UiJs.p('Na fila de análise. Pode continuar usando o jogo: a análise roda em segundo plano.','muted');
  var cr=r.crit||[];
  if(r.an&&r.an.done){
   var mine=V26.minePlies(r),ls=mine.map(function(k){return r.an.m[k]&&r.an.m[k].sl;}).filter(function(x){return x!=null;});
   var acc=ls.length?Math.round(ls.reduce(function(a,b){return a+V24.accOf(b);},0)/ls.length):null;
   UiJs.stats([[acc!=null?acc+'%':'—','precisão (Stockfish)'],[String(ls.filter(function(x){return x>=12;}).length),'lances que custaram caro'],[String(cr.length),'para reconstruir']]);
   if(cr.length){UiJs.h('Posições críticas');var R=V26.d().rec;
    UiJs.items(cr.map(function(c){var st=R[c.id]||{},ok=(st.proof||[]).some(function(x){return x.ok;});return {t:V26.moveLabel(r,c.k),d:V26.CAT[c.cat].n+' (provável) · a chance de vitória caiu '+Math.round(c.sl)+' pontos',r:ok?'✓ comprovado':'reconstruir ›',ok:ok,f:function(){V26.rc(r.id,c.id);}};}));}
   else UiJs.p('Nenhum lance seu perdeu mais de 12 pontos de chance de vitória nesta partida.','good');
  }
  if(r.src!=='app'){UiJs.h('Lances');var L=[];for(var k=0;k<r.s.length;k++){var full=+(r.f[k].split(' ')[5]||1),wt=(r.f[k].split(' ')[1]==='w');var bad=cr.some(function(c){return c.k===k;});L.push((wt?full+'. ':(k===0?full+'… ':''))+(bad?'<b class="v26-bad">'+V26.esc(r.s[k])+'?</b>':V26.esc(r.s[k])));}
   var mv=UiJs.el('div','v26-moves',UiJs.cur);mv.innerHTML=L.join(' ');
   UiJs.btns([['Apagar esta partida',function(){V24.DB.del('imp',r.id).then(function(){UiJs.toast('Partida apagada.');V26.games();});},'warn']]);}
 });
};

/* ---------- Primeiras observações (com o grau de confiança) ---------- */
V26.obs=function(){
 UiJs.page('Primeiras observações',V26.lab);
 V26.allCrits(function(cr,all){
  var n=all.filter(function(r){return r.an&&r.an.done;}).length;
  var lv=n<5?['Poucos dados','Com menos de 5 partidas analisadas, qualquer padrão pode ser acaso. Importe mais partidas.']:
   n<10?['Primeiras observações','De 5 a 9 partidas: são pistas, ainda não um diagnóstico.']:
   n<20?['Indicadores provisórios','De 10 a 19 partidas: os indicadores começam a fazer sentido, mas ainda podem mudar bastante.']:
   n<50?['Primeiro diagnóstico','Com 20 partidas ou mais já dá para falar em padrão, com cautela. 20 partidas não mostram o seu estilo inteiro.']:
   ['Avaliação de longo prazo','Com 50 partidas ou mais, as tendências ficam bem mais confiáveis.'];
  UiJs.stats([[String(n),'partidas analisadas'],[String(cr.length),'posições críticas'],[lv[0],'nível de confiança']]);
  UiJs.p(lv[1],'muted');
  if(!cr.length){UiJs.p('Ainda não há posições críticas. Importe partidas em "Minhas partidas" ou jogue aqui: a análise roda sozinha.','muted');return;}
  var cnt={};cr.forEach(function(x){cnt[x.c.cat]=(cnt[x.c.cat]||0)+1;});
  var games={};cr.forEach(function(x){(games[x.c.cat]=games[x.c.cat]||{})[x.r.id]=1;});
  UiJs.h('Onde as decisões mais custaram');
  Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];}).forEach(function(k){
   var g=Object.keys(games[k]).length,kind=g>=3?'padrão que se repete':(g===2?'apareceu em 2 partidas':'erro isolado (1 partida)');
   UiJs.bar(V26.CAT[k].n,cnt[k]*100/cr.length,g>=3?'warn':'',cnt[k]+' · '+kind);
  });
  UiJs.p('Como ler: os números são fatos medidos pelo Stockfish (quanto cada lance custou). O nome da competência é uma hipótese automática sobre o tipo de erro, não uma leitura do que você pensou. Um erro só vira "padrão" quando aparece em 3 partidas ou mais.','muted small');
  var comp=V26.d().comp,ks=Object.keys(comp);
  if(ks.length){UiJs.h('Comprovações em posições novas');ks.forEach(function(k){var c=comp[k];UiJs.bar(V26.CAT[k]?V26.CAT[k].n:k,c.n?c.ok*100/c.n:0,'',c.ok+' de '+c.n+' acertos');});
   UiJs.p('Acertar uma posição nova é evidência de aprendizado; repetir a mesma posição não conta.','muted small');}
  UiJs.btns([['Treinar as posições críticas',V26.critList,'pri']]);
 });
};

/* ---------- Reconstrua seu Pensamento ---------- */
V26.critList=function(){
 UiJs.page('Reconstrua seu Pensamento',V26.lab);
 UiJs.p('Volte às decisões que mais custaram nas suas partidas. Primeiro você observa, procura candidatos e decide; só depois vê a análise. No fim, uma posição nova do mesmo tema comprova o aprendizado.','muted');
 V26.allCrits(function(cr){
  if(!cr.length){UiJs.p('Nenhuma posição crítica ainda. Importe partidas ou jogue aqui: assim que a análise terminar, elas aparecem nesta lista.','muted');UiJs.btns([['Importar partidas',function(){V26.games();},'pri']]);return;}
  var pend=cr.filter(function(x){return !x.done;});
  if(pend.length)UiJs.btns([['Começar pela mais importante',function(){V26.rc(pend[0].r.id,pend[0].c.id);},'pri']]);
  UiJs.items(cr.slice(0,120).map(function(x){var r=x.r,c=x.c;
   var who=r.src==='app'?'Rota do Mestre':(r.col===1?r.b:r.w);
   return {t:V26.moveLabel(r,c.k)+' · '+V26.CAT[c.cat].n,d:'contra '+who+(r.date?' · '+r.date:'')+' · custou '+Math.round(c.sl)+' pontos de chance',r:x.done?'✓ comprovado':(x.fails?'tente de novo':'novo'),ok:x.done,f:function(){V26.rc(r.id,c.id);}};
  }));
 });
};
V26.R=null;
V26.rc=function(gid,cid){
 V24.DB.get('imp',gid).then(function(r){
  if(!r)return;var c=(r.crit||[]).filter(function(x){return x.id===cid;})[0];if(!c)return;
  var o=r.an.m[c.k],fen=r.f[c.k],pos=Engine.posFromFEN(fen);
  V26.R={r:r,c:c,o:o,fen:fen,side:pos.turn,step:1,marks:[],cands:[],choice:null,why:'',t0:Date.now()};
  UiJs.boardPage('Reconstrua seu Pensamento',V26.critList);
  V26.draw();
 });
};
V26.legal=function(fen){var p=Engine.posFromFEN(fen);return Engine.legalMoves(p).map(function(m){return Engine.moveToUCI(m);});};
V26.sq=function(n){return Engine.nameSq(n);};
V26.arrow=function(u,c){return [V26.sq(u.substr(0,2)),V26.sq(u.substr(2,2)),c];};
V26.pieceName=function(fen,sq){var p=Engine.posFromFEN(fen),v=p.board[sq];var n=['','peão','cavalo','bispo','torre','dama','rei'][Math.abs(v)];return n+' '+Engine.sqName(sq);};
V26.draw=function(){
 var R=V26.R;if(!R)return;var b=UiJs.board;if(!b)return;
 b.fen=R.fen;b.flip=R.side===-1;b.arrows=[];b.marks=[];b.legal=null;b.onMove=null;b.onSquare=null;b.check=-1;
 var pk=R.r.mine?-1:R.c.k-1;b.last=pk>=0&&R.r.u[pk]?[V26.sq(R.r.u[pk].substr(0,2)),V26.sq(R.r.u[pk].substr(2,2))]:null;
 try{var pp=Engine.posFromFEN(R.fen);if(Engine.inCheck(pp))b.check=pp.king[pp.turn===1?0:1];}catch(e){}
 V26.boardSet=function(){b.clearSel();b.draw();};
 UiJs.panel();
 var steps=['Observe','Investigue','Decida','Compreenda','Comprove'],sb=UiJs.el('div','v26-steps',UiJs.cur);
 steps.forEach(function(s,i){UiJs.el('span',(i+1===R.step?'on':(i+1<R.step?'ok':'')),sb,(i+1)+' '+s);});
 var me=R.side===1?'Brancas':'Pretas',ctx=UiJs.el('div','v26-ctx',UiJs.cur);
 ctx.textContent=(R.r.src==='app'?'Partida no Rota do Mestre':(R.r.w+' × '+R.r.b+(R.r.date?' · '+R.r.date:'')))+' · você joga de '+me+' · lance '+(+(R.fen.split(' ')[5]||1));
 if(R.step===1){
  UiJs.p('Etapa 1 · Observe','gold big');
  UiJs.p('O que está acontecendo nesta posição? O que o seu adversário está ameaçando? Qual peça está mais vulnerável, sua ou dele?','');
  UiJs.p('Toque nas peças que você acha que estão em perigo ou vulneráveis (suas ou dele). Toque de novo para desmarcar. Ainda não mostramos nenhuma resposta.','muted small');
  b.marks=R.marks.map(function(s){return [s,1];});
  b.onSquare=function(s){var i=R.marks.indexOf(s);if(i>=0)R.marks.splice(i,1);else R.marks.push(s);V26.draw();};
  UiJs.btns([['Pronto ('+R.marks.length+(R.marks.length===1?' marcada)':' marcadas)'),function(){R.step=2;V26.draw();},'pri'],['Não vejo perigo',function(){R.marks=[];R.step=2;V26.draw();}]]);
 } else if(R.step===2){
  UiJs.p('Etapa 2 · Investigue','gold big');
  UiJs.p('Faça no tabuleiro 2 ou 3 lances candidatos. Eles não são jogados: aparecem como setas. Para cada um, pergunte: qual seria a resposta mais forte do adversário? O que acontece depois?','');
  var L=V26.legal(R.fen);b.legal=L;b.arrows=R.cands.map(function(u){return V26.arrow(u,2);});
  b.onMove=function(u4){V26.pick(L,u4,function(u){if(R.cands.indexOf(u)<0){if(R.cands.length>=3)R.cands.shift();R.cands.push(u);}V26.draw();});};
  if(R.cands.length)UiJs.p('Candidatos: '+R.cands.map(function(u){return SF.san(R.fen,u);}).join(' · '),'gold');
  UiJs.btns([['Continuar',function(){if(!R.cands.length){UiJs.toast('Faça pelo menos um lance candidato no tabuleiro.');return;}R.step=3;V26.draw();},R.cands.length?'pri':'off'],R.cands.length?['Limpar',function(){R.cands=[];V26.draw();}]:null]);
 } else if(R.step===3){
  UiJs.p('Etapa 3 · Decida','gold big');
  UiJs.p('Qual lance você joga? Escolha um dos candidatos ou faça outro lance no tabuleiro.','');
  var L2=V26.legal(R.fen);b.legal=L2;b.arrows=R.cands.map(function(u){return V26.arrow(u,u===R.choice?0:2);});
  b.onMove=function(u4){V26.pick(L2,u4,function(u){R.choice=u;if(R.cands.indexOf(u)<0)R.cands.push(u);V26.draw();});};
  var bs=UiJs.el('div','btns',UiJs.cur);
  R.cands.forEach(function(u){var x=UiJs.el('button','btn'+(u===R.choice?' pri':''),bs,SF.san(R.fen,u));x.onclick=function(){R.choice=u;V26.draw();};});
  var ta=UiJs.el('textarea','v26-ta',UiJs.cur);ta.rows=2;ta.placeholder='Por que esse lance? (opcional)';ta.value=R.why;ta.oninput=function(){R.why=ta.value;};
  UiJs.btns([['Confirmar a decisão',function(){if(!R.choice){UiJs.toast('Escolha um lance.');return;}V26.decide();},R.choice?'pri':'off']]);
 } else if(R.step===4){
  V26.understand();
 }
 b.clearSel();b.draw();
};
V26.pick=function(L,u4,cb){var c=L.filter(function(u){return u.substr(0,4)===u4;});if(!c.length)return;if(c.length===1){cb(c[0]);return;}App.pickPromo(L,u4,function(u){cb(u);});};
V26.decide=function(){
 var R=V26.R,o=R.o,d=V26.d();
 d.rec[R.c.id]=Object.assign(d.rec[R.c.id]||{},{t:Date.now(),marks:R.marks.length,cands:R.cands.slice(),choice:R.choice,why:R.why.slice(0,300)});Profile.save();
 R.step=4;R.ana=null;V26.draw();
 function fin(sl,pv){R.ana={sl:sl,pv:pv};if(V26.R===R&&R.step===4)V26.draw();}
 if(R.choice===o.b){fin(0,o.pv);return;}
 if(R.choice===R.r.u[R.c.k]){fin(o.sl,o.pp);return;}
 if(typeof SF==='undefined'||SF.failed){fin(null,null);return;}
 SF.go({fen:R.fen,depth:12,movetime:500,searchmoves:R.choice},function(r){if(!r||!r.lines.length){fin(null,null);return;}var L=r.lines[0];fin(Math.round(Math.max(0,o.wb-Coach.winPct(SF.score(L)))*10)/10,(L.pv||[]).slice(0,6));});
};
V26.verdict=function(sl){return sl==null?['—','']:(sl<=2?['Excelente','good']:(sl<=6?['Boa','good']:(sl<=12?['Imprecisa','warn']:['Erro','bad'])));};
V26.understand=function(){
 var R=V26.R,o=R.o,b=UiJs.board,played=R.r.u[R.c.k],cat=V26.CAT[R.c.cat];
 UiJs.p('Etapa 4 · Compreenda','gold big');
 if(!R.ana){UiJs.p('O Stockfish está conferindo a sua escolha…','muted');return;}
 b.marks=R.marks.map(function(s){return [s,1];});b.arrows=[V26.arrow(o.b,0)];if(played!==o.b)b.arrows.push(V26.arrow(played,1));if(R.choice!==o.b&&R.choice!==played)b.arrows.push(V26.arrow(R.choice,2));b.draw();
 var v=V26.verdict(R.ana.sl),fen=R.fen;
 var box=UiJs.el('div','v26-cmp',UiJs.cur);
 box.innerHTML='<div><i class="c2"></i><b>Sua escolha agora: '+V26.esc(SF.san(fen,R.choice))+'</b><span class="'+v[1]+'">'+v[0]+(R.ana.sl!=null?' · custa '+Math.round(R.ana.sl)+' pontos de chance':'')+'</span></div>'+
  '<div><i class="c1"></i><b>Na partida: '+V26.esc(SF.san(fen,played))+'</b><span class="bad">custou '+Math.round(o.sl)+' pontos de chance</span></div>'+
  '<div><i class="c0"></i><b>Melhor lance verificado: '+V26.esc(SF.san(fen,o.b))+'</b><span>'+V26.esc(o.pv&&o.pv.length?SF.pvSan(fen,o.pv,5):'')+'</span></div>';
 UiJs.p('Setas: verde = melhor lance, vermelha = lance da partida'+(R.choice!==o.b&&R.choice!==played?', azul = sua escolha agora':'')+'. "Pontos de chance" é a queda na chance de vitória estimada pelo Stockfish (0 a 100).','muted small');
 /* a resposta crítica do adversário ao lance da partida */
 if(o.rp){var p2=Engine.posFromFEN(fen),m=Engine.uciToMove(p2,played);if(m>=0){Engine.makeMove(p2,m);var f2=Engine.toFEN(p2);UiJs.p('Depois de '+SF.san(fen,played)+', a resposta mais forte do adversário era '+SF.san(f2,o.rp)+(o.pp&&o.pp.length>2?' ('+SF.pvSan(fen,o.pp,5)+')':'')+'.','');}}
 /* o que havia de perigo na posição x o que foi marcado */
 try{
  var pos=Engine.posFromFEN(fen),me=pos.turn,mine=App.hanging(pos,me),theirs=App.hanging(pos,-me),all=mine.concat(theirs);
  var hit=R.marks.filter(function(s){return all.indexOf(s)>=0;}).length;
  var t='Peças sem defesa e atacadas nesta posição: '+(all.length?all.map(function(s){return V26.pieceName(fen,s)+(mine.indexOf(s)>=0?' (sua)':' (dele)');}).join(', '):'nenhuma')+'.';
  if(all.length)t+=' Você marcou '+hit+' de '+all.length+'.';
  var th=null;Engine.makeNull(pos);try{var sb=Engine.searchBest(pos,4,180);if(sb&&sb.m>=0)th=Engine.moveToSAN(pos,sb.m);}catch(e){}Engine.unmakeNull(pos);
  if(th)t+=' Se fosse a vez do adversário, o lance mais forte dele seria '+th+'.';
  UiJs.p(t,'small');
 }catch(e){}
 /* por que o melhor lance funciona */
 try{var p3=Engine.posFromFEN(fen),mb=Engine.uciToMove(p3,o.b),rs=Coach.moveReasons(p3,mb,null).slice(0,2).map(function(x){return x.text;}).filter(Boolean);if(rs.length){UiJs.h('Por que '+SF.san(fen,o.b)+' funciona');UiJs.ul(rs);}}catch(e){}
 UiJs.h('O que aprender');
 UiJs.p('Fato: '+cat.fact,'');
 UiJs.p('Competência provável: '+cat.n+'. É uma classificação automática do tipo de erro, não uma leitura do que você pensou.','muted small');
 UiJs.p(cat.lesson,'gold');
 var st=V26.d().rec[R.c.id];if(st&&st.why)UiJs.p('Sua justificativa: "'+st.why+'"','muted small');
 UiJs.btns([['Etapa 5 · Comprovar numa posição nova',V26.prove,'pri'],['Voltar à lista',V26.critList]]);
};
V26.prove=function(){
 var R=V26.R;if(!R)return;var cat=V26.CAT[R.c.cat],r=Profile.d.pzElo||1000;
 var ps=Puzzles.pick(cat.tags,r-150,r+150,1,Profile.seenMap());
 if(!ps.length){UiJs.toast('Nenhuma posição nova disponível para este tema agora.');return;}
 var cid=R.c.id,ck=R.c.cat,gid=R.r.id;
 Drills.run('Comprove · '+cat.n,Study.pzTasks(ps,false,cat.dim),{back:V26.critList,done:function(res){
  var ok=!!(res&&res.length&&res[0].ok),d=V26.d(),st=d.rec[cid]||(d.rec[cid]={});(st.proof=st.proof||[]).push({t:Date.now(),ok:ok,p:ps[0].id});
  var c=d.comp[ck]||(d.comp[ck]={n:0,ok:0});c.n++;if(ok)c.ok++;Profile.save();
  UiJs.page('Comprove · '+cat.n,V26.critList);
  UiJs.p(ok?'Comprovado!':'Ainda não.',ok?'big good':'big warn');
  UiJs.p(ok?'Você resolveu uma posição nova do mesmo tema, sem ter visto a solução antes. Essa é a evidência que conta.':'A posição nova do mesmo tema ainda escapou. Releia a lição e tente outra posição: o aprendizado aparece quando você acerta posições diferentes.','');
  UiJs.p(cat.lesson,'gold');
  UiJs.btns([ok?null:['Tentar outra posição nova',function(){V26.rc(gid,cid);setTimeout(function(){if(V26.R){V26.R.step=4;V26.R.ana={sl:null};V26.prove();}},60);},'pri'],['Próxima posição crítica',function(){V26.allCrits(function(cr){var p=cr.filter(function(x){return !x.done;});if(p.length)V26.rc(p[0].r.id,p[0].c.id);else V26.critList();});},ok?'pri':''],['Voltar ao laboratório',V26.lab]]);
 }});
};

if(V26_UI){(function(){
 /* menu: o Laboratório entra no lugar do "Mapa do seu pensamento" (o Mapa continua dentro dele) */
 var oMenu=UiJs.menu;
 UiJs.menu=function(items){
  if(items&&items.length)for(var i=0;i<items.length;i++)if(items[i]&&items[i].t==='Mapa do seu pensamento'){var o=items[i];items[i]={t:'Laboratório do Pensamento',d:'Descubra como você pensa',f:V26.lab,ico:o.ico,lone:o.lone,hl:o.hl};}
  return oMenu.apply(this,arguments);
 };
 setTimeout(function(){try{V26.kick();}catch(e){}},8000);
})();}
