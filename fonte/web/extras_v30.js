/* Rota do Mestre v30 — tela de partida mais limpa e tutorial de movimento das peças.
 * 1) Ao começar uma partida no celular, o jogo pede tela cheia ao navegador (só em celular; no iPhone o Safari não
 *    permite, então mostra uma vez como adicionar à Tela de Início, que abre sem as barras do navegador).
 * 2) Na partida, a faixa de cima ("‹ Partida" e "Mentor") sai: a seta de voltar vai para antes do botão Dica e o
 *    nome do adversário vai para depois do Abandonar. O tabuleiro sobe e sobra mais espaço embaixo.
 * 3) Em "Aprenda antes de jogar", o botão "Treinar movimento das peças" abre um tabuleiro com um exercício por
 *    peça: mova a peça até pegar todas as estrelas. */
var V30={fsMine:false};

/* ---------- 1: tela cheia só no celular ---------- */
V30.isPhone=function(){
 try{var coarse=window.matchMedia&&window.matchMedia('(pointer:coarse)').matches,sm=Math.min(screen.width,screen.height)<=600;
  return coarse&&sm;}catch(e){return false;}
};
V30.standalone=function(){try{return (window.matchMedia&&window.matchMedia('(display-mode: standalone),(display-mode: fullscreen)').matches)||navigator.standalone===true;}catch(e){return false;}};
V30.fs=function(){
 if(!V30.isPhone()||V30.standalone())return;
 var d=document,el=d.documentElement;
 if(d.fullscreenElement||d.webkitFullscreenElement)return;
 var rq=el.requestFullscreen||el.webkitRequestFullscreen;
 if(rq&&(d.fullscreenEnabled||d.webkitFullscreenEnabled)){
  try{var p=rq.call(el,{navigationUI:'hide'});V30.fsMine=true;if(p&&p.catch)p.catch(function(){V30.fsMine=false;});}catch(e){V30.fsMine=false;}
  return;
 }
 /* iPhone: o Safari não deixa uma página entrar em tela cheia; avisa uma vez */
 var ios=/iPhone|iPod/.test(navigator.userAgent||'');
 if(ios){var k='rdm-fs-dica';try{if(localStorage.getItem(k))return;localStorage.setItem(k,'1');}catch(e){}
  setTimeout(function(){try{UiJs.toast('Para jogar em tela cheia no iPhone: Compartilhar › Adicionar à Tela de Início.');}catch(e){}},700);}
};
V30.fsExit=function(){
 if(!V30.fsMine)return;V30.fsMine=false;var d=document;
 try{if(d.fullscreenElement&&d.exitFullscreen){var p=d.exitFullscreen();if(p&&p.catch)p.catch(function(){});}else if(d.webkitFullscreenElement&&d.webkitExitFullscreen)d.webkitExitFullscreen();}catch(e){}
};
if(typeof document!=='undefined')document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement)V30.fsMine=false;});

/* ---------- 2: partida sem a faixa de cima ---------- */
V30.gameUI=function(){
 var root=UiJs.root,shell=root&&root.querySelector('.shell'),bar=UiJs.actionBar,g=App.G;
 if(!shell||!bar||!g||!shell.querySelector('.bp'))return;
 shell.classList.add('v30-game');
 var row=bar.querySelector('.btns');if(!row)return;
 if(!row.querySelector('.v30-back')){
  var bk=document.createElement('button');bk.type='button';bk.className='btn v30-back';bk.setAttribute('aria-label','Voltar');bk.title='Voltar';bk.textContent='‹';
  bk.onclick=function(e){e.stopPropagation();var hb=shell.querySelector('.hdr .back');V30.fsExit();if(hb)hb.click();else App.menu();};
  row.insertBefore(bk,row.firstChild);
 }
 var op=row.querySelector('.v30-opp');
 if(!op){op=document.createElement('span');op.className='v30-opp';row.appendChild(op);}
 var nm=String(g.oppName||''),el=g.elo!=null?String(g.elo):'';
 if(op.__k!==nm+'|'+el){op.__k=nm+'|'+el;op.innerHTML='';var a=document.createElement('b');a.textContent=nm;op.appendChild(a);if(el){var s=document.createElement('span');s.textContent=el;op.appendChild(s);}op.setAttribute('aria-label','Adversário: '+nm+(el?' ('+el+')':''));}
};
(function(){
 var oSG=App.showGame;
 App.showGame=function(){V30.fs();var r=oSG.apply(this,arguments);try{V30.gameUI();}catch(e){}return r;};
 var oDG=App.drawGame;
 App.drawGame=function(){var r=oDG.apply(this,arguments);try{V30.gameUI();}catch(e){}return r;};
 /* saindo da partida para outra tela, devolve o navegador ao normal */
 var oPage=UiJs.page;UiJs.page=function(){V30.fsExit();return oPage.apply(this,arguments);};
 var oMenu=UiJs.menu;UiJs.menu=function(){V30.fsExit();return oMenu.apply(this,arguments);};
})();

/* ---------- 3: tutorial de movimento das peças ---------- */
V30.T=[
 {id:'torre',name:'Torre',g:'♖',p:'R',from:'a1',stars:['a6','f6','f2'],
  txt:'A torre anda em linha reta, na horizontal ou na vertical, quantas casas quiser. Não pode pular peças.'},
 {id:'bispo',name:'Bispo',g:'♗',p:'B',from:'c1',stars:['e3','g5','d8','a5'],
  txt:'O bispo anda nas diagonais, quantas casas quiser. Ele fica sempre na mesma cor de casa em que começou.'},
 {id:'dama',name:'Dama',g:'♕',p:'Q',from:'d1',stars:['d5','h5','e8','a4'],
  txt:'A dama junta a torre e o bispo: anda em linha reta ou na diagonal, quantas casas quiser. É a peça mais forte.'},
 {id:'rei',name:'Rei',g:'♔',p:'K',from:'e1',stars:['d2','c3','d4','e4'],
  txt:'O rei anda só uma casa, em qualquer direção. É a peça que precisa ser protegida: se ele não tiver como escapar do ataque, é xeque-mate.'},
 {id:'cavalo',name:'Cavalo',g:'♘',p:'N',from:'g1',own:['f2','g2','h2','e2'],stars:['f3','e5','c4','b6'],
  txt:'O cavalo anda em L: duas casas numa direção e uma para o lado. É a única peça que pula as outras — repare nos peões na frente dele.'},
 {id:'peao',name:'Peão',g:'♙',p:'P',from:'d2',opp:['e5'],stars:['d4','e5','e6','e7','e8'],
  txt:'O peão anda para a frente, uma casa (duas no primeiro lance). Ele captura de um jeito diferente: uma casa na diagonal, para a frente. Aqui, avance e capture o peão preto em e5.',
  end:'Quando o peão chega à última fileira, ele vira outra peça — quase sempre uma dama. Isso é a promoção.'}
];
V30.sq=function(n){return Engine.nameSq(n);};
V30.nm=function(s){return Engine.sqName(s);};
/* lances da peça que se move (sem xeque: no tutorial não há rei adversário) */
V30.moves=function(st){
 var from=st.at,f=from&7,r=from>>3,out=[],occ=st.occ,P=st.p;
 var add=function(c,rr,capOnly,noCap){if(c<0||c>7||rr<0||rr>7)return false;var s=rr*8+c,o=occ[s];
  if(o==='w')return false;if(o==='b'){if(!noCap)out.push(s);return false;}if(!capOnly)out.push(s);return true;};
 var slide=function(dirs){dirs.forEach(function(d){var c=f+d[0],rr=r+d[1];while(add(c,rr)){c+=d[0];rr+=d[1];}});};
 var O=[[1,0],[-1,0],[0,1],[0,-1]],D=[[1,1],[1,-1],[-1,1],[-1,-1]];
 if(P==='R')slide(O);else if(P==='B')slide(D);else if(P==='Q')slide(O.concat(D));
 else if(P==='K')O.concat(D).forEach(function(d){add(f+d[0],r+d[1]);});
 else if(P==='N')[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]].forEach(function(d){add(f+d[0],r+d[1]);});
 else if(P==='P'){
  if(r<7&&!occ[(r+1)*8+f]){out.push((r+1)*8+f);if(r===1&&!occ[(r+2)*8+f])out.push((r+2)*8+f);}
  [-1,1].forEach(function(dc){var c=f+dc;if(c>=0&&c<=7&&r<7&&occ[(r+1)*8+c]==='b')out.push((r+1)*8+c);});
 }
 return out.map(function(s){return V30.nm(from)+V30.nm(s);});
};
V30.fen=function(st){
 var rows=[];for(var rr=7;rr>=0;rr--){var row='',e=0;for(var c=0;c<8;c++){var s=rr*8+c,ch='';
  if(s===st.at)ch=st.p;else if(st.occ[s]==='w')ch='P';else if(st.occ[s]==='b')ch='p';
  if(ch){if(e){row+=e;e=0;}row+=ch;}else e++;}if(e)row+=e;rows.push(row);}
 return rows.join('/')+' w - - 0 1';
};
V30.tut={i:0,st:null};
V30.tutStart=function(i){
 var L=V30.T[i],occ={};V30.tut.i=i;
 (L.own||[]).forEach(function(n){occ[V30.sq(n)]='w';});(L.opp||[]).forEach(function(n){occ[V30.sq(n)]='b';});
 V30.tut.st={p:L.p,at:V30.sq(L.from),occ:occ,stars:L.stars.map(V30.sq),got:[],n:0,done:false,promo:false};
 V30.tutPage();
};
V30.done=function(){var d=Profile.d;if(!d.v30tut)d.v30tut={};return d.v30tut;};
V30.tutDraw=function(){
 var b=UiJs.board,st=V30.tut.st;if(!b||!st)return;
 b.fen=V30.fen(st);b.arrows=[];b.marks=[];b.check=-1;b.flip=false;
 b.legal=st.done?null:V30.moves(st);
 b.onMove=V30.tutMove;b.onSquare=null;b.onSel=null;
 b.sel=st.done?-1:st.at;          /* a peça já vem selecionada: os pontos mostram para onde ela pode ir */
 b.draw();
 var sqs=b.root?b.root.querySelectorAll('.sq'):[];
 for(var i=0;i<sqs.length&&i<64;i++){var rr=i>>3,c=i&7,s=(7-rr)*8+c;
  if(st.stars.indexOf(s)>=0&&st.got.indexOf(s)<0&&s!==st.at){var x=document.createElement('div');x.className='v30-star';x.textContent='★';sqs[i].appendChild(x);}}
 var info=document.querySelector('.v30-prog');
 if(info)info.textContent='Estrelas: '+st.got.length+' de '+st.stars.length+' · lances: '+st.n;
};
V30.tutMove=function(u){
 var st=V30.tut.st;if(!st||st.done)return;
 var to=V30.sq(u.substr(2,2)),from=st.at;
 if(st.occ[to]==='b')delete st.occ[to];
 st.at=to;st.n++;var bd=UiJs.board;if(bd)bd.last=[from,to];
 if(st.p==='P'&&(to>>3)===7){st.p='Q';st.promo=true;}
 if(st.stars.indexOf(to)>=0&&st.got.indexOf(to)<0)st.got.push(to);
 try{UiJs.sfx('mv');}catch(e){}
 if(st.got.length===st.stars.length){st.done=true;V30.done()[V30.T[V30.tut.i].id]=1;Profile.save();}
 V30.tutDraw();
 if(st.done)V30.tutPanel();
};
V30.tutPanel=function(){
 if(typeof UiJs.panel==='function')UiJs.panel();
 var L=V30.T[V30.tut.i],st=V30.tut.st,dn=V30.done(),cur=UiJs.cur;
 var chips=UiJs.el('div','v30-chips',cur);
 V30.T.forEach(function(x,k){var c=UiJs.el('button','v30-chip'+(k===V30.tut.i?' on':'')+(dn[x.id]?' ok':''),chips);c.type='button';
  c.innerHTML='<i>'+x.g+'</i><span>'+x.name+'</span>'+(dn[x.id]?'<em>✓</em>':'');c.onclick=function(){V30.tutStart(k);};});
 UiJs.el('div','p gold big',cur,L.g+'  '+L.name);
 UiJs.el('div','p',cur,L.txt);
 if(!st.done){
  UiJs.el('div','p muted small',cur,'Toque na casa com ponto para mover. Pegue todas as estrelas ★.');
  UiJs.el('div','p v30-prog',cur,'');
  UiJs.btns([['Recomeçar',function(){V30.tutStart(V30.tut.i);}],['Voltar',App.beginnerIntro]]);
 }else{
  var ok=UiJs.el('div','v30-ok',cur);
  UiJs.el('b','',ok,'Muito bem! '+st.got.length+' estrelas em '+st.n+(st.n===1?' lance.':' lances.'));
  if(st.promo||L.end)UiJs.el('span','',ok,L.end||'');
  var next=V30.tut.i+1,all=V30.T.every(function(x){return dn[x.id];});
  if(next<V30.T.length)UiJs.btns([['Próxima peça: '+V30.T[next].name,function(){V30.tutStart(next);},'pri wide'],['Repetir',function(){V30.tutStart(V30.tut.i);}]]);
  if(all||next>=V30.T.length){
   UiJs.el('div','p gold',cur,all?'Você já sabe mover todas as peças. Agora é jogar!':'Faltam algumas peças: toque nelas acima para treinar.');
   UiJs.btns([['Começar a partida',App.newGame,'pri wide'],['Voltar',App.beginnerIntro]]);
  }
 }
 V30.tutDraw();
};
V30.tutPage=function(){
 UiJs.boardPage('Movimento das peças',App.beginnerIntro);
 var shell=UiJs.root.querySelector('.shell');if(shell)shell.classList.add('v30-tut');
 V30.tutPanel();
};
V30.tutOpen=function(){
 var dn=V30.done(),k=0;for(var i=0;i<V30.T.length;i++)if(!dn[V30.T[i].id]){k=i;break;}
 V30.tutStart(k);
};
(function(){
 var oBI=App.beginnerIntro;
 App.beginnerIntro=function(){
  var r=oBI.apply(this,arguments);
  try{
   var cur=UiJs.cur,go=null;cur.querySelectorAll('.btns .btn').forEach(function(x){if(!go&&/^Entendi/.test(x.textContent.trim()))go=x;});
   if(go){var dn=V30.done(),n=V30.T.filter(function(x){return dn[x.id];}).length;
    var t=document.createElement('button');t.type='button';t.className='btn wide v30-train';
    t.innerHTML='♞ Treinar movimento das peças'+(n?'<small>'+(n===V30.T.length?'concluído ✓':n+' de '+V30.T.length+' peças')+'</small>':'');
    t.onclick=V30.tutOpen;go.parentNode.insertBefore(t,go);}
  }catch(e){}
  return r;
 };
})();
