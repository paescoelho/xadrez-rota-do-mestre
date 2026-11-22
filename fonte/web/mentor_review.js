/* Revisão pós-partida. Posições próprias; nenhuma intervenção na escolha de lances. */
var MentorReview = (function () {
 var active = null;
 function el(tag, parent, text) {
  var node = document.createElement(tag);
  if (text) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
 }
 function button(parent, text, action) {
  var node = el('button', parent, text); node.type = 'button'; node.onclick = action; return node;
 }
 function frames(game) {
  var p = Engine.posFromFEN(game.recs && game.recs[0] && game.recs[0].ply === 0 ? game.recs[0].fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  return game.ucis.map(function (uci, index) {
   var fen = Engine.toFEN(p), m = Engine.uciToMove(p, uci);
   if (m < 0) throw new Error('Histórico incompatível');
   var san = Engine.moveToSAN(p, m), side = p.turn, number = p.full;
   Engine.makeMove(p, m);
   return {fen:fen, after:Engine.toFEN(p), uci:uci, san:san, side:side, number:number, index:index};
  });
 }
 /* Raios geométricos: respeitam bloqueios. Cavalos usam seus oito saltos. */
 function attacks(p, from, to) {
  var pc = p.board[from], type = Math.abs(pc), dx = (to & 7) - (from & 7), dy = (to >> 3) - (from >> 3);
  if (!pc || from === to) return false;
  if (type === 1) return Math.abs(dx) === 1 && dy === (pc > 0 ? 1 : -1);
  if (type === 2) return Math.abs(dx) * Math.abs(dy) === 2;
  if (type === 6) return Math.max(Math.abs(dx), Math.abs(dy)) === 1;
  var diagonal = Math.abs(dx) === Math.abs(dy), straight = dx === 0 || dy === 0;
  if (!(type === 3 && diagonal || type === 4 && straight || type === 5 && (diagonal || straight))) return false;
  var step = Math.sign(dx) + 8 * Math.sign(dy);
  for (var sq = from + step; sq !== to; sq += step) if (p.board[sq]) return false;
  return true;
 }
 function open(game) {
  if (active || !game.over || !game.ucis.length) return;
  var list;
  try { list = frames(game); } catch (_) { UiJs.toast('Não foi possível reconstruir esta partida.'); return; }
  var oldFocus = document.activeElement, overlay = el('div', document.body);
  overlay.className = 'mentor-review';
  overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true'); overlay.setAttribute('aria-label','Revisão dinâmica');
  var panel = el('div', overlay); panel.className = 'mr-panel';
  var head = el('div', panel); head.className = 'mr-toolbar';
  el('strong',head,'Revisão do Mentor');
  var state = {closed:false, index:0, token:0, timer:null, auto:false, cache:{}, branch:false};
  active = state;
  function stop() { clearTimeout(state.timer); state.timer = null; }
  function close() { state.closed = true; state.token++; stop(); overlay.remove(); active = null; document.removeEventListener('keydown', key); if (oldFocus && oldFocus.isConnected) oldFocus.focus(); }
  button(head,'Fechar',close);
  var wrap = el('div',panel); wrap.className = 'mr-wrap';
  var root = el('div',wrap), board = new BoardJ(root); board.flip = game.human === -1;
  var card = el('div',wrap); card.className = 'mr-card';
  var label = button(card,'Comentário do Mentor',function () { content.hidden = !content.hidden; label.setAttribute('aria-expanded',String(!content.hidden)); });
  label.setAttribute('aria-expanded','true');
  var content = el('div',card), message = el('p',content), choices = el('div',content);
  message.setAttribute('aria-live','polite');
  var controls = el('div',panel); controls.className = 'mr-toolbar';
  button(controls,'Anterior',function () { state.auto=false; show(Math.max(0,state.index-1)); });
  var play = button(controls,'Reproduzir',function () { state.auto=!state.auto; if(state.auto) show(state.index); else {stop(); play.textContent='Reproduzir';} });
  button(controls,'Próximo',function () { state.auto=false; show(Math.min(list.length-1,state.index+1)); });
  var select = el('select',panel); select.setAttribute('aria-label','Escolher lance da partida');
  list.forEach(function(f,i){var o=el('option',select,f.number+(f.side===1?'. ':'… ')+f.san+(f.side===game.human?' · Você':' · CPU'));o.value=i;});
  select.onchange=function(){state.auto=false;show(+select.value);};
  el('small',panel,'Verde: suas linhas · Vermelho: CPU · Trace as ideias e compare antes de avançar.');
  function valid(token) { return !state.closed && state.token===token; }
  function position(fen,uci, radar) {
   var p=Engine.posFromFEN(fen), from=uci?Engine.nameSq(uci.slice(0,2)):-1, to=uci?Engine.nameSq(uci.slice(2,4)):-1;
   board.last=uci?[from,to]:null; board.arrows=[]; board.marks=[];
   if(radar && to>=0) {
    for(var sq=0;sq<64;sq++) {
     if(p.board[sq] && attacks(p,to,sq)) board.arrows.push([to,sq,p.board[to]*game.human>0?0:1]);
     if(sq!==to && p.board[sq]*p.board[to]>0 && attacks(p,sq,to)) board.arrows.push([sq,to,p.board[sq]*game.human>0?0:1]);
    }
   }
   board.check=Engine.inCheck(p)?p.king[p.turn===1?0:1]:-1; board.show(fen);
   // Coloca o comentário no quadrante com menor ocupação e menos linhas relevantes.
   var candidates=[[3,3],[53,3],[3,54],[53,54]], scores=[0,0,0,0];
   for(var s=0;s<64;s++){
    var x=board.flip?7-(s&7):(s&7),y=board.flip?s>>3:7-(s>>3),q=(y>=4?2:0)+(x>=4?1:0);
    if(p.board[s]) scores[q]+=Math.abs(p.board[s])===6?8:2;
    if(s===to||s===from)scores[q]+=14;
    board.arrows.forEach(function(a){if(a[0]===s||a[1]===s)scores[q]+=8;});
   }
   var best=scores.indexOf(Math.min.apply(Math,scores));card.style.left=candidates[best][0]+'%';card.style.top=candidates[best][1]+'%';
  }
  function explain(fen,uci) {
   var p=Engine.posFromFEN(fen), m=Engine.uciToMove(p,uci);
   if(m<0)return 'Esta continuação já terminou.';
   var reasons=Coach.moveReasons(p,m,null).slice(0,2).map(function(r){return r.text;});
   Engine.makeMove(p,m);
   if(Engine.inCheck(p)) reasons.unshift(Engine.legalMoves(p).length?'O rei está em xeque. Observe as respostas legais.':'Xeque-mate: o rei está atacado e não há resposta legal.');
   return reasons.join(' ') || 'Compare as casas controladas e a segurança das peças depois deste lance.';
  }
  function search(fen, extra) {
   return new Promise(function(resolve){
    var finished=false, timeout=setTimeout(function(){if(!finished){finished=true;resolve(null);}},18000);
    var job={fen:fen,movetime:900,multipv:3};Object.keys(extra||{}).forEach(function(k){job[k]=extra[k];});
    SF.go(job,function(r){if(finished)return;finished=true;clearTimeout(timeout);resolve(r);});
   });
  }
  async function analyse(f,token) {
   if(state.cache[f.index])return state.cache[f.index];
   if(typeof SF==='undefined'||SF.failed)return null;
   var result=await search(f.fen);
   if(!valid(token)||!result||!result.lines.length)return null;
   var lines=result.lines.filter(function(l){return l.pv&&l.pv.length;});
   var played=lines.find(function(l){return l.pv[0]===f.uci;});
   if(!played) {var r=await search(f.fen,{multipv:1,searchmoves:f.uci});if(r&&r.lines.length)played=r.lines[0];}
   if(!valid(token))return null;
   return state.cache[f.index]={lines:lines,played:played};
  }
  function advance(token) {
   if(state.auto&&valid(token)&&!state.branch)state.timer=setTimeout(function(){if(state.index+1<list.length)show(state.index+1);else {state.auto=false;play.textContent='Reproduzir';}},6500);
  }
  function variation(f,line) {
   state.auto=false;stop();play.textContent='Reproduzir';var token=++state.token;state.branch=true;
   var p=Engine.posFromFEN(f.fen), pv=line.pv.slice(0,6),step=0;
   choices.replaceChildren();label.textContent='Alternativa analisada';
   position(f.fen,null,false);
   function next() {
    if(!valid(token))return;
    var u=pv[step],m=u?Engine.uciToMove(p,u):-1;
    if(m<0){message.textContent+=' Fim da continuação analisada.';return;}
    message.textContent=(step?'Resposta e continuação. ':'Experimente esta ideia. ')+explain(Engine.toFEN(p),u);
    Engine.makeMove(p,m);position(Engine.toFEN(p),u,true);step++;
    nextButton.disabled=step>=pv.length||Engine.legalMoves(p).length===0;
   }
   var nextButton=button(choices,'Próximo lance da linha',next);
   button(choices,'Voltar à partida',function(){show(state.index);});
   state.timer=setTimeout(next,350);
  }
  async function show(index) {
   stop();state.index=index;state.branch=false;var token=++state.token,f=list[index];
   select.value=index;play.textContent=state.auto?'Pausar':'Reproduzir';
   choices.replaceChildren();label.textContent=f.number+(f.side===1?'. ':'… ')+f.san+' · '+(f.side===game.human?'Seu lance':'CPU');
   message.textContent='Observe o movimento. Depois, compare as alternativas.';
   position(f.fen,null,false);
   state.timer=setTimeout(async function(){
    if(!valid(token))return;
    position(f.after,f.uci,true);message.textContent=explain(f.fen,f.uci);
    var status=el('small',choices,'Analisando alternativas…'), data;
    try { data=await analyse(f,token); } catch(_){data=null;}
    if(!valid(token))return;
    status.remove();
    if(data){
     var best=data.lines[0],loss=data.played?Math.max(0,Coach.winPct(SF.score(best))-Coach.winPct(SF.score(data.played))):null;
     if(loss!==null)el('p',choices,loss>=20?'Gafe segundo esta análise. Compare a resposta que o adversário poderia aproveitar.':loss>=10?'Este lance cedeu uma vantagem importante. Veja outra possibilidade.':loss>=4?'Havia uma opção mais precisa.':'O lance mantém boa parte das chances avaliadas.');
     data.lines.filter(function(l){return l.pv[0]!==f.uci;}).slice(0,2).forEach(function(line,i){
      button(choices,(i?'Outra opção: ':'Comparar: ')+SF.san(f.fen,line.pv[0]),function(){variation(f,line);});
     });
     el('small',choices,'Alternativas de busca limitada; a resposta real pode variar.');
    } else button(choices,'Tentar analisar novamente',function(){show(index);});
    advance(token);
   },450);
  }
  function key(e){
   if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'){var nodes=Array.from(overlay.querySelectorAll('button,select')).filter(function(n){return !n.disabled&&n.offsetParent!==null;});var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }
  document.addEventListener('keydown',key);head.querySelector('button').focus();show(0);
 }
 function install() {
  if(typeof document==='undefined')return;
  var css=el('style',document.head);
  css.textContent='.mr-entry{position:absolute!important;z-index:25;left:50%;top:50%;transform:translate(-50%,-50%);background:#eed49a!important;color:#172d25!important;padding:16px 22px!important;border:1px solid #e7d4a5!important;border-radius:14px!important;font-weight:bold;font-size:clamp(14px,3vw,22px)}.mentor-review{position:fixed;inset:0;z-index:100000;background:#10201feF;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}.mr-panel{width:min(690px,95vw,76dvh);color:#f7efd8;font-family:system-ui,sans-serif}.mr-wrap{position:relative;width:100%;aspect-ratio:1}.mr-wrap>.board{width:100%!important;height:100%!important;max-width:none!important}.mr-card{position:absolute;z-index:30;width:44%;max-height:43%;overflow:auto;background:#17322bf5;border:1px solid #8ba891;border-radius:12px;padding:9px;box-shadow:0 6px 20px #0005;font-size:clamp(12px,1.8vw,16px)}.mr-card p{margin:6px 0;line-height:1.35}.mr-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:9px 0}.mentor-review button,.mentor-review select{background:#29483c;color:#fff1cd;border:1px solid #779681;border-radius:8px;padding:9px;cursor:pointer}.mr-card button{width:100%;margin:3px 0;text-align:left;font:inherit}.mr-panel>select{width:100%}.mr-panel small{display:block;font-size:11px;line-height:1.4;margin-top:7px}.mentor-review button:focus-visible,.mentor-review select:focus-visible{outline:3px solid #f1ce7e}.mr-wrap .pc.mv{animation-duration:700ms!important}@media(prefers-reduced-motion:reduce){.mr-wrap .pc.mv{animation:none!important}}';
  var draw=App.drawGame;
  App.drawGame=function(){
   var result=draw.apply(this,arguments),g=App.G,b=UiJs.board;
   if(g&&g.over&&g.adaptive&&b&&b.root&&!b.root.querySelector('.mr-entry')){
    var entry=button(b.root,'Revisão dinâmica',function(){open(g);});entry.className='mr-entry';
   }
   return result;
  };
 }
 if(typeof window!=='undefined')install();
 return {open:open,frames:frames,attacks:attacks};
})();
