/* ======================= v74 — Lendas: enfrente os maiores jogadores =======================
 * Botão "Lendas" depois do Stockfish, em Nova partida. Abre uma lista com busca e filtros; cada jogador traz
 * o repertório de aberturas dele (linhas validadas lance a lance), o estilo (agressividade, trocas de dama, roque)
 * e uma taxa de erros baixa. Quem joga é o motor do jogo, no modo "fantasma": imita repertório e estilo,
 * não a força real do jogador. O duelo não muda o Elo e tem placar próprio.
 */
var V74={sel:null,filter:'all'};
V74.get=function(id){for(var i=0;i<LENDAS.length;i++)if(LENDAS[i].id===id)return LENDAS[i];return null;};
V74.dna=function(p){
 var enc=function(ls){return ls.map(function(l){return [Dna.enc(l[0].split(' ')),l[1]];});};
 return {v:1,src:'lenda',bk:1,n:p.n,e:p.e,ph:p.ph,bl:p.bl,fa:p.fa,fe:1.0,tl:1.0,ag:p.ag,cs:'k',cn:p.cn,qx:p.qx,ms:9000,
  bp:null,bb:null,bq:null,bL:null,bw:null,vs:-1,ow:enc(p.w),ob:enc(p.b),ax:null,g:0};
};
V74.play=function(){
 var p=V74.get(V74.sel);if(!p)return;
 try{Profile.d.v74={sel:p.id};Profile.save();}catch(e){}
 App.newGhostGame(V74.dna(p),p.s,'leg:'+p.id,App.opts.color||0);
};
V74.esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
V74.norm=function(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
V74.FILTERS=[['all','Todos'],['wc','Campeões mundiais'],['now','Em atividade'],['cl','Clássicos']];
/* ---------- lista suspensa ---------- */
V74.open=function(){
 if(document.querySelector('.v74-ov'))return;
 var ov=document.createElement('div');ov.className='v74-ov';
 ov.innerHTML='<div class="v74-sh" role="dialog" aria-modal="true" aria-label="Escolha uma lenda para enfrentar">'+
  '<div class="v74-hd"><div><b>Enfrente uma lenda</b><span>'+LENDAS.length+' jogadores. O jogo imita o repertório e o estilo; a força é a do motor do jogo.</span></div><button class="v74-x" aria-label="Fechar">✕</button></div>'+
  '<input class="v74-q" type="search" placeholder="Buscar por nome ou país" aria-label="Buscar jogador" autocomplete="off">'+
  '<div class="v74-fs" role="tablist"></div><div class="v74-ls" role="listbox"></div></div>';
 document.body.appendChild(ov);
 var q=ov.querySelector('.v74-q'),fs=ov.querySelector('.v74-fs'),ls=ov.querySelector('.v74-ls');
 var close=function(){ov.remove();document.removeEventListener('keydown',key);};
 var key=function(e){if(e.key==='Escape')close();};
 document.addEventListener('keydown',key);
 ov.addEventListener('click',function(e){if(e.target===ov)close();});
 ov.querySelector('.v74-x').onclick=close;
 var draw=function(){
  var t=V74.norm(q.value.trim()),f=V74.filter,n=0;ls.innerHTML='';
  LENDAS.forEach(function(p){
   if(f!=='all'&&(' '+p.g+' ').indexOf(' '+f+' ')<0)return;
   if(t&&V74.norm(p.n+' '+p.p).indexOf(t)<0)return;
   n++;
   var b=document.createElement('button');b.className='v74-it'+(V74.sel===p.id?' on':'');b.setAttribute('role','option');b.setAttribute('aria-selected',V74.sel===p.id?'true':'false');
   b.innerHTML='<span class="v74-fl" aria-hidden="true">'+p.c+'</span><span class="v74-tx"><b>'+V74.esc(p.n)+'</b><i>'+V74.esc(p.t)+'</i><em>'+V74.esc(p.st)+'</em></span>'+
    '<span class="v74-el"><b>'+p.e+'</b><i>'+(p.est?'estimado':'rating máx.')+'</i></span>';
   b.onclick=function(){V74.sel=p.id;App.opts.opp=4;close();App.setupGame();};
   ls.appendChild(b);
  });
  if(!n){var em=document.createElement('div');em.className='v74-em';em.textContent='Nenhum jogador encontrado.';ls.appendChild(em);}
 };
 V74.FILTERS.forEach(function(x){var c=document.createElement('button');c.className='v74-f'+(V74.filter===x[0]?' on':'');c.textContent=x[1];c.setAttribute('role','tab');
  c.onclick=function(){V74.filter=x[0];[].forEach.call(fs.children,function(k){k.classList.toggle('on',k===c);});draw();};fs.appendChild(c);});
 q.oninput=draw;draw();
 var on=ls.querySelector('.v74-it.on');if(on)on.scrollIntoView({block:'center'});
};
/* ---------- botão e cartão na tela Nova partida ---------- */
(function(){
 var o=App.setupGame;
 App.setupGame=function(){
  var r=o.apply(this,arguments);
  try{
   var page=UiJs.cur,seg=page.querySelector('.seg'),grid=seg&&seg.querySelector('.segg');if(!grid)return r;
   var p=V74.get(V74.sel);
   [].forEach.call(grid.querySelectorAll('.sb'),function(b){b.addEventListener('click',function(){V74.sel=null;},true);if(p)b.classList.remove('on');});
   grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';
   var b=document.createElement('button');b.className='sb v74-btn'+(p?' on':'');b.setAttribute('aria-haspopup','dialog');
   b.innerHTML='<span class="sbt">Lendas <span class="v74-car">▾</span></span><span class="sbs">'+(p?V74.esc(p.s):LENDAS.length+' jogadores')+'</span>';
   b.onclick=function(){V74.open();};grid.appendChild(b);
   if(p){
    var note=seg.querySelector('.segn');if(note)note.remove();
    var sc='';try{sc=Dna.scoreTxt('leg:'+p.id);if(/^0V 0E 0D/.test(sc))sc='';}catch(e){}
    var c=document.createElement('button');c.className='v74-card';c.setAttribute('aria-label','Trocar de lenda');
    c.innerHTML='<span class="v74-fl" aria-hidden="true">'+p.c+'</span><span class="v74-tx"><b>'+V74.esc(p.n)+' <u>'+p.e+'</u></b><i>'+V74.esc(p.t)+'</i>'+
     '<em>'+V74.esc(p.st)+'</em><em class="v74-op">De brancas: '+V74.esc(p.ow)+'.<br>De pretas: '+V74.esc(p.ob)+'.</em>'+
     '<em class="v74-no">Imita o repertório e o estilo; a força é a do motor do jogo. Não muda o seu Elo'+(sc?' · seu placar: '+sc:'')+'.</em></span><span class="v74-ch">trocar ▾</span>';
    c.onclick=function(){V74.open();};seg.appendChild(c);
    /* o cartão ocupa espaço: a nota do efeito do tabuleiro sai para a tela continuar sem rolar */
    setTimeout(function(){try{var fx=page.querySelector('.v33-fxd');if(fx)fx.style.display='none';}catch(e){}},0);
    page.classList.add('v74-has');
    var bs=page.querySelectorAll('.btn.pri');var st=null;[].forEach.call(bs,function(x){if(/Começar/.test(x.textContent))st=x;});
    if(st){st.textContent='Enfrentar '+p.s;st.onclick=function(ev){if(ev)ev.stopPropagation();V74.play();};}
   }
  }catch(e){if(window.console)console.error(e);}
  return r;
 };
})();
