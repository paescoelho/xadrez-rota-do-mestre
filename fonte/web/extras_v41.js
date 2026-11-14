/* Rota do Mestre v75 — voz integrada: WebRTC + sinalização privada no Firestore.
 * O WhatsApp continua sendo usado APENAS para enviar o convite.
 * Cada jogador inicia com um toque e autoriza o microfone; após os dois
 * consentirem, a conexão é negociada automaticamente sem sair do tabuleiro.
 * Requer as regras /salas/{code}/voz/{cor} publicadas no Firebase.
 */
var V41={
 code:null,me:null,doc:null,unsub:null,heartbeat:null,pc:null,stream:null,audio:null,
 sid:'',enabled:false,muted:false,state:'off',error:'',peers:{},queue:Promise.resolve(),
 making:false,answering:false,offerSent:false,offerSeen:'',answerSeen:'',remoteSid:'',
 seenIce:{},icePending:[],reconnectTimer:null,retries:0,leaving:false
};
V41.css=function(){
 if(document.getElementById('rdm-voice-style'))return;
 var el=document.createElement('style');el.id='rdm-voice-style';
 el.textContent=[
 '.v41-wrap{padding:10px 12px;margin:0 0 8px;border:1px solid rgba(75,188,145,.38);border-radius:14px;background:linear-gradient(135deg,rgba(23,78,62,.32),rgba(13,18,23,.94));color:#eaf6ef;box-sizing:border-box}',
 '.v41-head{display:flex;align-items:center;gap:9px}.v41-symbol{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:11px;background:rgba(49,181,119,.18);font-size:18px}',
 '.v41-text{flex:1;min-width:0}.v41-text strong{display:block;font-size:13.5px;color:#e4f9e9}.v41-text small{display:block;font-size:11.5px;color:#9cbaae;line-height:1.35;margin-top:2px}',
 '.v41-dot{width:7px;height:7px;background:#98a2aa;border-radius:100%;flex:none}.v41-dot.live{background:#36d88e;box-shadow:0 0 0 4px rgba(54,216,142,.12);animation:v41blink 1.5s infinite}',
 '@keyframes v41blink{50%{opacity:.5}}.v41-actions{display:flex;gap:7px;margin-top:9px;align-items:center;flex-wrap:wrap}',
 '.v41-btn{min-height:38px;border:1px solid #415e52;border-radius:10px;padding:7px 12px;color:#e9f9f0;background:#234536;font:600 12.5px system-ui,sans-serif;cursor:pointer;flex:1;min-width:0}',
 '.v41-btn:disabled{opacity:.55;cursor:wait}.v41-btn.secondary{background:#17251f;border-color:#375448}.v41-btn.hangup{background:#602b30;border-color:#995059;color:#fff0f0}',
 '.v41-tip{font-size:10.5px;color:#89a99a;margin-top:6px;line-height:1.4}.v41-wrap.warn{border-color:rgba(216,148,65,.6)}.v41-wrap.warn .v41-text small{color:#f0bd8a}',
 '@media(max-width:380px){.v41-wrap{padding:8px 9px}.v41-btn{padding:7px 8px;font-size:11.5px}}',
 '@media(prefers-reduced-motion:reduce){.v41-dot.live{animation:none}}'
 ].join('\n');
 document.head.appendChild(el);
};
V41.statusText=function(){
 switch(V41.state){
 case 'asking':return 'Autorize o microfone no navegador.';
 case 'waiting':return 'Microfone liberado. Aguardando o outro jogador ativar o áudio.';
 case 'connecting':return 'Conectando áudio de forma segura…';
 case 'connected':return 'Conversa ativa, sem sair do tabuleiro.';
 case 'reconnecting':return 'Conexão interrompida. Tentando reconectar…';
 case 'error':return V41.error||'Não foi possível iniciar o áudio.';
 default:return 'Ative para conversar durante a partida, sem usar seu telefone.';
 }
};
V41.prepare=function(){
 var code=V31.code,me=V31.me,r=V31.room;
 if(!code||!me||!r||r.status!=='play')return false;
 if(V41.code!==code||V41.me!==me){V41.stop(true);V41.code=code;V41.me=me;}
 return true;
};
V41.render=function(){
 V41.css();
 var box=document.querySelector('.v35-tools');if(!box)return;
 var old=box.querySelector('.v41-wrap');if(old)old.remove();
 if(!V41.prepare()){if(V41.enabled)V41.stop(true);return;}
 var p=document.createElement('section');p.className='v41-wrap'+(V41.state==='error'?' warn':'');
 p.setAttribute('aria-label','Áudio da partida');
 var head=document.createElement('div');head.className='v41-head';p.appendChild(head);
 var symbol=document.createElement('span');symbol.className='v41-symbol';symbol.textContent='🎙️';head.appendChild(symbol);
 var tx=document.createElement('span');tx.className='v41-text';head.appendChild(tx);
 var title=document.createElement('strong');title.textContent='Áudio entre jogadores';tx.appendChild(title);
 var sub=document.createElement('small');sub.textContent=V41.statusText();sub.setAttribute('role','status');tx.appendChild(sub);
 var dot=document.createElement('span');dot.className='v41-dot'+(V41.state==='connected'?' live':'');head.appendChild(dot);
 var actions=document.createElement('div');actions.className='v41-actions';p.appendChild(actions);
 var add=function(label,variant,fn,disabled){var b=document.createElement('button');b.type='button';b.className='v41-btn'+(variant?' '+variant:'');b.textContent=label;b.disabled=!!disabled;b.onclick=fn;actions.appendChild(b);return b;};
 if(!V41.enabled){
  add(V41.state==='asking'?'Solicitando microfone…':'🎙️ Ativar áudio','',V41.start,V41.state==='asking');
 }else{
  add(V41.muted?'🔇 Reativar microfone':'🎙️ Silenciar','secondary',V41.toggleMute,false);
  add('✕ Encerrar áudio','hangup',function(){V41.stop(true);V41.render();},false);
  if(V41.state==='connected'||V41.state==='connecting'||V41.state==='reconnecting')add('🔊 Ativar som','secondary',V41.unlockAudio,false);
 }
 var tip=document.createElement('div');tip.className='v41-tip';
 tip.textContent='A chamada só inicia quando ambos autorizarem. O áudio não é gravado pelo jogo.';
 p.appendChild(tip);box.insertBefore(p,box.firstChild);
};
V41.show=function(state,error){V41.state=state;V41.error=error||'';V41.render();};
V41.serverTime=function(){return window.firebase.firestore.FieldValue.serverTimestamp();};
V41.ownRef=function(){return V31.db.collection('salas').doc(V41.code).collection('voz').doc(V41.me);};
V41.other=function(){return V41.me==='w'?'b':'w';};
V41.fresh=function(d){if(!d||!d.enabled||!d.t)return false;var t=d.t.toMillis?d.t.toMillis():0;return t>0&&Math.abs(Date.now()-t)<120000;};
V41.id=function(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);};
V41.config=function(){
 var override=window.RDM_VOICE_ICE_SERVERS;
 return {iceServers:Array.isArray(override)&&override.length?override:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
};
V41.unlockAudio=function(){
 if(!V41.audio)return;
 var p=V41.audio.play();if(p&&p.catch)p.catch(function(){UiJs.toast('Verifique se o som está liberado no navegador.');});
};
V41.audioNode=function(){
 if(V41.audio)return V41.audio;
 var a=document.createElement('audio');a.autoplay=true;a.playsInline=true;a.setAttribute('playsinline','');a.style.display='none';
 document.body.appendChild(a);V41.audio=a;return a;
};
V41.start=async function(){
 if(V41.enabled||V41.state==='asking'||!V41.prepare())return;
 if(!window.RTCPeerConnection||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){V41.show('error','Este navegador não oferece acesso a áudio WebRTC.');return;}
 var code=V41.code,me=V41.me;
 V41.show('asking');
 try{
  var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(V41.code!==code||V41.me!==me||!V31.room||V31.room.status!=='play'){stream.getTracks().forEach(function(t){t.stop();});V41.show('off');return;}
  V41.stream=stream;V41.sid=V41.id();V41.enabled=true;V41.muted=false;V41.leaving=false;V41.retries=0;
  V41.doc=V41.ownRef();V41.audioNode();
  V41.unsub=V31.db.collection('salas').doc(code).collection('voz').onSnapshot(function(q){
   if(V41.code!==code||!V41.enabled)return;
   var next={};q.forEach(function(d){if(d.id==='w'||d.id==='b')next[d.id]=d.data();});V41.peers=next;V41.schedule();
  },function(e){if(V41.enabled)V41.fail('Sem permissão para o áudio no Firebase. Verifique as regras publicadas.',e);});
  await V41.doc.set({uid:V31.uid,enabled:true,sid:V41.sid,sdp:'',ice:[],t:V41.serverTime()});
  if(!V41.enabled||V41.code!==code)return;
  V41.heartbeat=setInterval(function(){if(V41.enabled&&V41.doc)V41.doc.update({t:V41.serverTime()}).catch(function(){});},30000);
  V41.show('waiting');
  V41.schedule();
 }catch(e){
  if(V41.code!==code)return;
  var denied=e&&(['NotAllowedError','PermissionDeniedError','SecurityError'].indexOf(e.name)>=0);
  V41.fail(denied?'Acesso ao microfone negado. Libere-o nas permissões do navegador.':
   /permission|insufficient/i.test(String(e&&e.message||''))?'Regras de áudio do Firebase ainda não publicadas.':
   'Não foi possível iniciar o áudio. Confira microfone e conexão.',e);
 }
};
V41.fail=function(message,e){
 V41.stop(true);
 V41.state='error';V41.error=message;V41.render();
 if(e&&window.console)console.warn('[Rota do Mestre: áudio]',e);
};
V41.toggleMute=function(){
 V41.muted=!V41.muted;
 if(V41.stream)V41.stream.getAudioTracks().forEach(function(t){t.enabled=!V41.muted;});
 V41.render();
};
V41.closePeer=function(){
 clearTimeout(V41.reconnectTimer);V41.reconnectTimer=null;
 if(V41.pc){var pc=V41.pc;V41.pc=null;pc.onicecandidate=null;pc.ontrack=null;pc.onconnectionstatechange=null;try{pc.close();}catch(e){}}
 if(V41.audio){V41.audio.srcObject=null;}
 V41.making=false;V41.answering=false;V41.offerSent=false;V41.offerSeen='';V41.answerSeen='';V41.remoteSid='';V41.seenIce={};V41.icePending=[];
};
V41.stop=function(notify){
 var ref=V41.doc,active=V41.enabled,sid=V41.sid,uid=V31.uid;
 V41.enabled=false;V41.leaving=true;clearInterval(V41.heartbeat);V41.heartbeat=null;
 if(V41.unsub){try{V41.unsub();}catch(e){}V41.unsub=null;}
 V41.closePeer();
 if(V41.stream){V41.stream.getTracks().forEach(function(t){t.stop();});V41.stream=null;}
 if(V41.audio){V41.audio.pause();V41.audio.srcObject=null;V41.audio.remove();V41.audio=null;}
 V41.doc=null;V41.peers={};V41.sid='';V41.muted=false;V41.state='off';V41.error='';
 if(notify&&active&&ref&&uid){
  ref.set({uid:uid,enabled:false,sid:sid,sdp:'',ice:[],t:V41.serverTime()}).catch(function(){});
 }
};
V41.peer=function(){
 if(!V41.pc){
  var pc=new RTCPeerConnection(V41.config());
  V41.pc=pc;
  if(V41.stream)V41.stream.getTracks().forEach(function(t){pc.addTrack(t,V41.stream);});
  pc.ontrack=function(e){
   var a=V41.audioNode();
   a.srcObject=e.streams&&e.streams[0]?e.streams[0]:new MediaStream([e.track]);
   V41.unlockAudio();
  };
  pc.onicecandidate=function(e){
   if(!e.candidate||!V41.enabled||!V41.doc)return;
   var item=JSON.stringify({sid:V41.sid,c:e.candidate.toJSON()});
   V41.doc.update({ice:window.firebase.firestore.FieldValue.arrayUnion(item),t:V41.serverTime()}).catch(function(err){if(window.console)console.warn('ICE Firestore',err);});
  };
  pc.onconnectionstatechange=function(){
   if(pc!==V41.pc||!V41.enabled)return;
   var st=pc.connectionState;
   if(st==='connected'){V41.retries=0;V41.show('connected');V41.unlockAudio();}
   else if(st==='disconnected'||st==='failed'){
    V41.show('reconnecting');
    clearTimeout(V41.reconnectTimer);
    V41.reconnectTimer=setTimeout(function(){
     if(pc!==V41.pc||!V41.enabled||pc.connectionState==='connected')return;
     if(V41.me==='w'&&V41.retries<3){V41.retries++;V41.closePeer();V41.schedule();}
     else if(V41.me==='b'&&V41.retries<3){V41.retries++;V41.closePeer();V41.schedule();}
     else V41.show('error','Conexão de voz falhou. Encerre e ative novamente.');
    },8500);
   }
  };
 }
 return V41.pc;
};
V41.setIce=async function(data){
 if(!data||!Array.isArray(data.ice)||!V41.pc)return;
 for(var i=0;i<data.ice.length;i++){
  var value=data.ice[i];if(typeof value!=='string'||V41.seenIce[value])continue;
  var c;try{c=JSON.parse(value);}catch(e){continue;}
  if(!c||c.sid!==data.sid||!c.c)continue;
  V41.seenIce[value]=true;
  if(!V41.pc.remoteDescription){V41.icePending.push(c.c);continue;}
  try{await V41.pc.addIceCandidate(c.c);}catch(e){}
 }
};
V41.flushIce=async function(){
 while(V41.icePending.length&&V41.pc&&V41.pc.remoteDescription){
  try{await V41.pc.addIceCandidate(V41.icePending.shift());}catch(e){}
 }
};
V41.schedule=function(){
 if(!V41.enabled)return;
 V41.queue=V41.queue.catch(function(){}).then(function(){return V41.process();}).catch(function(e){
  if(window.console)console.warn('Negociação de áudio',e);
  if(V41.enabled)V41.show('reconnecting');
 });
};
V41.process=async function(){
 if(!V41.enabled||!V41.doc||!V31.room||V31.room.status!=='play')return;
 var him=V41.peers[V41.other()];
 if(!V41.fresh(him)){
  if(V41.pc)V41.closePeer();
  if(V41.state!=='waiting')V41.show('waiting');
  return;
 }
 if(V41.pc&&V41.remoteSid&&V41.remoteSid!==him.sid)V41.closePeer();
 if(V41.me==='w'){
  if(!V41.offerSent&&!V41.making){
   V41.making=true;V41.remoteSid=him.sid;V41.show('connecting');
   try{
    var pc=V41.peer();var offer=await pc.createOffer();
    if(!V41.enabled||V41.remoteSid!==him.sid)return;
    await pc.setLocalDescription(offer);
    await V41.doc.update({sdp:JSON.stringify({type:'offer',sdp:pc.localDescription.sdp,for:him.sid}),ice:[],t:V41.serverTime()});
    V41.offerSent=true;
   }finally{V41.making=false;}
  }
  var answer;try{answer=him.sdp?JSON.parse(him.sdp):null;}catch(e){answer=null;}
  if(answer&&answer.type==='answer'&&answer.for===V41.sid&&V41.pc&&V41.pc.signalingState==='have-local-offer'&&!V41.answerSeen){
   V41.answerSeen=him.sdp;await V41.pc.setRemoteDescription({type:'answer',sdp:answer.sdp});await V41.flushIce();
  }
 }else{
  var offer;try{offer=him.sdp?JSON.parse(him.sdp):null;}catch(e){offer=null;}
  if(offer&&offer.type==='offer'&&offer.for===V41.sid&&him.sid&&V41.offerSeen!==him.sdp&&!V41.answering){
   V41.answering=true;V41.remoteSid=him.sid;V41.show('connecting');
   try{
    V41.closePeer();V41.remoteSid=him.sid;
    var pc2=V41.peer();await pc2.setRemoteDescription({type:'offer',sdp:offer.sdp});
    V41.offerSeen=him.sdp;
    var ans=await pc2.createAnswer();await pc2.setLocalDescription(ans);
    await V41.doc.update({sdp:JSON.stringify({type:'answer',sdp:pc2.localDescription.sdp,for:him.sid}),ice:[],t:V41.serverTime()});
    await V41.flushIce();
   }finally{V41.answering=false;}
  }
 }
 if(V41.pc)await V41.setIce(him);
};
(function(){
 if(typeof V31==='undefined'||typeof V35==='undefined')return;
 // Desativa o antigo pedido de número telefônico: áudio é privado via microfone.
 V35.asked=function(){return true;};
 var decorate=V35.decorate;
 V35.decorate=function(){
  var ret=decorate.apply(this,arguments);
  var box=document.querySelector('.v35-tools');
  if(box){
   [].forEach.call(box.querySelectorAll('.v35-call,.v35-lib,.v35-wait'),function(x){x.remove();});
   V41.render();
  }
  return ret;
 };
 var oldClose=V31.close;
 V31.close=function(){V41.stop(true);V41.code=null;V41.me=null;return oldClose.apply(this,arguments);};
})();
