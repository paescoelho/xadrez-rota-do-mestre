/* Rota do Mestre v80 — chamada de voz 1:1 com PeerJS 1.5.5 (MIT).
 * Projeto: https://github.com/peers/peerjs — https://peerjs.com/
 *
 * Só dois jogadores autenticados de uma partida em andamento podem
 * publicar/ler o ID aleatório do PeerJS em salas/{code}/voz/{cor}.
 * Reutiliza a estrutura e as regras de voz já existentes do Firebase:
 *   {uid,enabled,sid,sdp:'',ice:[],t:serverTimestamp()}
 * SDP e ICE não são armazenados no Firestore: o PeerServer faz sinalização.
 * Consentimento explícito de ambos; stream apenas de áudio, sem câmera.
 * O áudio não é gravado pelo aplicativo. Servidor PeerJS Cloud é externo.
 */
var V41={
 code:null,me:null,uid:null,token:0,enabled:false,muted:false,state:'off',error:'',
 peer:null,peerId:'',peerReady:false,published:false,local:null,remote:null,media:null,
 call:null,pending:null,peerDoc:null,unsub:null,heartbeat:null,openTimer:null,pendingTimer:null,
 retryTimer:null,tries:0,remoteId:'',participants:{},needsTap:false,loadPromise:null
};
V41.css=function(){
 if(document.getElementById('rdm-peerjs-style'))return;
 var st=document.createElement('style');st.id='rdm-peerjs-style';
 st.textContent=[
 '.v41-wrap{padding:10px 12px;margin:0 0 8px;border:1px solid rgba(89,184,143,.4);border-radius:14px;background:linear-gradient(135deg,#1d3832,#151d22 80%);color:#edf8f1;box-sizing:border-box}',
 '.v41-wrap.warn{border-color:rgba(226,159,86,.7)}.v41-head{display:flex;align-items:center;gap:9px}',
 '.v41-symbol{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:11px;background:#2e5949;font-size:18px}',
 '.v41-text{flex:1;min-width:0}.v41-text strong{display:block;font:700 13px/1.4 system-ui,sans-serif;color:#eff9f2}',
 '.v41-text small{display:block;font:11.5px/1.35 system-ui,sans-serif;color:#a6c5b6;margin-top:2px}',
 '.v41-wrap.warn .v41-text small{color:#f3c09a}.v41-dot{width:8px;height:8px;flex:none;border-radius:50%;background:#909a9e}',
 '.v41-dot.live{background:#32d78a;box-shadow:0 0 0 3px rgba(50,215,138,.16)}',
 '.v41-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
 '.v41-btn{flex:1;min-width:0;min-height:38px;border-radius:10px;padding:7px 9px;border:1px solid #517666;background:#234939;color:#edfff2;font:600 12px/1.2 system-ui,sans-serif;cursor:pointer}',
 '.v41-btn.secondary{background:#1b2926;border-color:#466759}.v41-btn.hangup{background:#592d35;border-color:#ad636f;color:#fff1f2}',
 '.v41-btn:disabled{opacity:.55;cursor:wait}.v41-tip{font:10.5px/1.35 system-ui,sans-serif;color:#a8baaf;margin-top:7px}',
 '@media(max-width:390px){.v41-wrap{padding:8px 9px}.v41-btn{font-size:11px;padding:7px 5px}}'
 ].join('\n');document.head.appendChild(st);
};
V41.statusText=function(){
 switch(V41.state){
 case 'asking':return 'Autorize o microfone no seu navegador.';
 case 'loading':return 'Preparando chamada segura pelo PeerJS…';
 case 'waiting':return 'Microfone ativado. Aguardando o outro jogador liberar a voz.';
 case 'connecting':return 'Conectando os dois jogadores…';
 case 'connected':return V41.needsTap?'Áudio conectado. Toque em “Ativar som” para ouvir.':'Voz conectada. Continue jogando enquanto conversam.';
 case 'reconnecting':return 'Conexão interrompida. Tentando restabelecer o áudio…';
 case 'error':return V41.error||'Não foi possível conectar a chamada.';
 default:return 'Converse por voz sem sair da partida e sem compartilhar seu telefone.';
 }
};
V41.prepare=function(){
 var r=V31.room,c=V31.code,me=V31.me,valid=r&&c&&(me==='w'||me==='b')&&V31.view==='game'&&r.status==='play';
 if(!valid){if(V41.enabled||V41.state==='asking'||V41.state==='loading')V41.stop(true);return false;}
 if(V41.code!==c||V41.me!==me||V41.uid!==V31.uid){
  V41.stop(true);V41.code=c;V41.me=me;V41.uid=V31.uid;
 }
 return true;
};
V41.render=function(){
 V41.css();
 var box=document.querySelector('.v35-tools');if(!box)return;
 var prior=box.querySelector('.v41-wrap');if(prior)prior.remove();
 if(!V41.prepare())return;
 var card=document.createElement('section');card.className='v41-wrap'+(V41.state==='error'?' warn':'');
 card.setAttribute('aria-label','Chamada de voz da partida');
 var head=document.createElement('div');head.className='v41-head';card.appendChild(head);
 var symbol=document.createElement('span');symbol.className='v41-symbol';symbol.textContent='🎙️';head.appendChild(symbol);
 var titleBlock=document.createElement('span');titleBlock.className='v41-text';head.appendChild(titleBlock);
 var name=document.createElement('strong');name.textContent='Voz com o adversário · PeerJS';titleBlock.appendChild(name);
 var sub=document.createElement('small');sub.textContent=V41.statusText();sub.setAttribute('role','status');titleBlock.appendChild(sub);
 var dot=document.createElement('span');dot.className='v41-dot'+(V41.state==='connected'?' live':'');head.appendChild(dot);
 var actions=document.createElement('div');actions.className='v41-actions';card.appendChild(actions);
 var button=function(label,variant,fn,disabled){
  var b=document.createElement('button');b.type='button';b.className='v41-btn'+(variant?' '+variant:'');b.textContent=label;b.disabled=!!disabled;b.onclick=fn;actions.appendChild(b);
 };
 if(!V41.enabled){
  button(V41.state==='asking'?'Pedindo permissão…':'🎙️ Ativar voz','',V41.start,V41.state==='asking'||V41.state==='loading');
 }else{
  button(V41.muted?'🔇 Reativar microfone':'🎙️ Silenciar','secondary',V41.toggleMute,false);
  button('✕ Encerrar voz','hangup',function(){V41.stop(true);V41.render();},false);
  if(V41.needsTap||V41.state==='connected')button('🔊 Ativar som','secondary',V41.unlockAudio,false);
 }
 var tip=document.createElement('div');tip.className='v41-tip';
 tip.textContent='Somente os 2 jogadores • Sem vídeo ou número • Ambos precisam autorizar.';
 card.appendChild(tip);box.insertBefore(card,box.firstChild);
};
V41.show=function(status,msg){V41.state=status;V41.error=msg||'';V41.render();};
V41.db=function(){return V31.db||window.firebase.firestore();};
V41.ts=function(){return window.firebase.firestore.FieldValue.serverTimestamp();};
V41.ownRef=function(){return V41.db().collection('salas').doc(V41.code).collection('voz').doc(V41.me);};
V41.other=function(){return V41.me==='w'?'b':'w';};
V41.otherUid=function(){
 var r=V31.room;if(!r)return null;return r.hostColor===V41.other()?r.host:r.guest;
};
V41.activeOther=function(){
 var d=V41.participants[V41.other()],ts=d&&d.t&&d.t.toMillis?d.t.toMillis():0;
 if(!d||!d.enabled||typeof d.sid!=='string'||d.sid.length<6||d.sid.length>80)return null;
 if(d.uid!==V41.otherUid()||!d.uid||!ts||Date.now()-ts>95000||Date.now()-ts< -15000)return null;
 if(d.sid===V41.peerId)return null;
 return d;
};
V41.options=function(){
 var ice=window.RDM_PEERJS_ICE_SERVERS||window.RDM_VOICE_ICE_SERVERS;
 var options={debug:1,config:{iceServers:Array.isArray(ice)&&ice.length?ice:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]}};
 var custom=window.RDM_PEERJS_OPTIONS;
 if(custom&&typeof custom==='object'){
  ['host','port','path','secure','key','pingInterval'].forEach(function(k){if(custom[k]!==undefined)options[k]=custom[k];});
 }
 return options;
};
V41.load=function(){
 if(window.Peer)return Promise.resolve(window.Peer);
 if(V41.loadPromise)return V41.loadPromise;
 // Dependência leve, carregada só após permissão do microfone. Versão fixa.
 var urls=['https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',
           'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js'];
 if(typeof window.RDM_PEERJS_SCRIPT_URL==='string')urls.unshift(window.RDM_PEERJS_SCRIPT_URL);
 var use=function(i){
  if(window.Peer)return Promise.resolve(window.Peer);
  if(i>=urls.length)return Promise.reject(new Error('PeerJS indisponível: verifique a conexão com a internet.'));
  return new Promise(function(resolve,reject){
   var s=document.createElement('script');s.src=urls[i];s.async=true;s.crossOrigin='anonymous';
   s.onload=function(){window.Peer?resolve(window.Peer):reject(new Error('Biblioteca PeerJS inválida.'));};
   s.onerror=function(){s.remove();reject(new Error('Falha ao carregar PeerJS'));};
   document.head.appendChild(s);
  }).catch(function(){return use(i+1);});
 };
 V41.loadPromise=use(0).catch(function(e){V41.loadPromise=null;throw e;});
 return V41.loadPromise;
};
V41.audioNode=function(){
 if(V41.remote)return V41.remote;
 var a=document.createElement('audio');a.autoplay=true;a.playsInline=true;a.setAttribute('playsinline','');a.style.display='none';
 document.body.appendChild(a);V41.remote=a;return a;
};
V41.unlockAudio=function(){
 if(!V41.remote||!V41.remote.srcObject)return;
 V41.remote.muted=false;
 var p=V41.remote.play();
 if(p&&p.then)p.then(function(){V41.needsTap=false;V41.show('connected');})
  .catch(function(){V41.needsTap=true;V41.show('connected');});
};
V41.subscribe=function(ticket){
 var ref=V41.db().collection('salas').doc(V41.code).collection('voz');
 V41.unsub=ref.onSnapshot(function(snapshot){
  if(ticket!==V41.token||!V41.enabled)return;
  var peers={};
  snapshot.forEach(function(doc){if(doc.id==='w'||doc.id==='b')peers[doc.id]=doc.data();});
  V41.participants=peers;V41.maybeConnect();
 },function(e){
  if(ticket===V41.token&&V41.enabled)V41.fail('Firebase bloqueou a sala de voz. Publique as regras da coleção /voz.',e);
 });
};
V41.publish=function(ticket){
 if(ticket!==V41.token||!V41.peerId)return Promise.resolve();
 return V41.peerDoc.set({uid:V41.uid,enabled:true,sid:V41.peerId,sdp:'',ice:[],t:V41.ts()})
 .then(function(){
  if(ticket!==V41.token)return;
  V41.published=true;V41.show('waiting');
  V41.heartbeat=setInterval(function(){
   if(V41.enabled&&V41.published&&V41.peerDoc)V41.peerDoc.update({t:V41.ts()}).catch(function(){});
  },25000);
  V41.maybeConnect();
 }).catch(function(e){if(ticket===V41.token)V41.fail('Não foi possível ativar a voz no Firebase. Confira as regras /voz.',e);});
};
V41.start=async function(){
 if(V41.enabled||V41.state==='asking'||V41.state==='loading'||!V41.prepare())return;
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.RTCPeerConnection){
  V41.show('error','Este navegador não oferece chamadas WebRTC ou acesso ao microfone.');return;
 }
 var ticket=++V41.token,code=V41.code,me=V41.me;
 V41.show('asking');
 try{
  // Chamada direta durante o clique, para preservar a ativação do usuário no iPhone.
  var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(ticket!==V41.token||V31.code!==code||V31.me!==me||!V31.room||V31.room.status!=='play'){
   stream.getTracks().forEach(function(t){t.stop();});return;
  }
  V41.local=stream;V41.enabled=true;V41.muted=false;V41.needsTap=false;V41.tries=0;
  V41.show('loading');
  var PeerCtor=await V41.load();
  if(ticket!==V41.token)return;
  V41.peerDoc=V41.ownRef();V41.subscribe(ticket);V41.audioNode();
  var peer=new PeerCtor(undefined,V41.options());V41.peer=peer;
  V41.openTimer=setTimeout(function(){
   if(ticket===V41.token&&!V41.peerReady)V41.fail('O PeerServer não respondeu. Tente novamente.',null);
  },19000);
  peer.on('open',function(id){
   if(ticket!==V41.token)return;
   clearTimeout(V41.openTimer);V41.openTimer=null;
   if(typeof id!=='string'||id.length<6||id.length>80){V41.fail('O servidor PeerJS retornou um identificador inválido.');return;}
   V41.peerReady=true;V41.peerId=id;V41.publish(ticket);
  });
  peer.on('call',function(c){
   if(ticket!==V41.token||!V41.enabled||V41.me!=='b'||!V31.room||V31.room.status!=='play'){
    try{c.close();}catch(e){}return;
   }
   // Apenas as Pretas atendem; só o Peer ID validado no Firestore pode ligar.
   if(V41.call||V41.pending){try{c.close();}catch(e){}return;}
   // Aceita aguardar até 4,5 s enquanto o Firebase confirma nosso ID.
   // A resposta final só ocorre depois de ambos publicarem /voz.
   V41.pending=c;V41.maybeConnect();
   if(V41.pending===c)V41.pendingTimer=setTimeout(function(){
    if(V41.pending===c){V41.pending=null;try{c.close();}catch(e){}}
   },4500);
  });
  peer.on('disconnected',function(){
   if(ticket!==V41.token||!V41.enabled)return;
   if(V41.state!=='connected')V41.show('reconnecting');
   if(!peer.destroyed)setTimeout(function(){
    if(ticket===V41.token&&V41.enabled&&peer.disconnected&&!peer.destroyed){
     try{peer.reconnect();}catch(e){V41.fail('Não foi possível reconectar ao PeerServer.',e);}
    }
   },2600);
  });
  peer.on('error',function(e){
   if(ticket!==V41.token||!V41.enabled)return;
   if(e&&e.type==='peer-unavailable'){
    V41.dropCall();V41.scheduleRetry();return;
   }
   V41.fail('Falha no PeerServer ('+String(e&&e.type||'rede')+'). Tente novamente.',e);
  });
 }catch(e){
  if(ticket!==V41.token)return;
  var denied=e&&['NotAllowedError','PermissionDeniedError','SecurityError'].indexOf(e.name)>=0;
  V41.fail(denied?'Microfone negado. Permita o acesso nas configurações do navegador.':
    e&&e.message&&/PeerJS|cdn|internet/i.test(e.message)?e.message:
    'Não foi possível iniciar a chamada. Verifique microfone e internet.',e);
 }
};
V41.attachCall=function(call,remoteId){
 if(!call||!V41.enabled)return;
 V41.dropCall();V41.call=call;V41.remoteId=remoteId;V41.show('connecting');
 var ticket=V41.token,opened=false;
 call.on('stream',function(stream){
  if(ticket!==V41.token||V41.call!==call)return;
  if(!stream||!stream.getAudioTracks||!stream.getAudioTracks().length){V41.dropCall();return;}
  V41.tries=0;opened=true;
  var node=V41.audioNode();node.srcObject=stream;V41.needsTap=false;
  var promise=node.play();
  if(promise&&promise.then)promise.then(function(){
   if(ticket===V41.token&&V41.call===call){V41.needsTap=false;V41.show('connected');}
  }).catch(function(){
   if(ticket===V41.token&&V41.call===call){V41.needsTap=true;V41.show('connected');}
  });
  else V41.show('connected');
 });
 call.on('close',function(){
  if(ticket!==V41.token||V41.call!==call)return;
  V41.dropCall();
  if(V41.enabled) V41.scheduleRetry();
 });
 call.on('error',function(e){
  if(ticket!==V41.token||V41.call!==call)return;
  if(window.console)console.warn('[PeerJS áudio]',e);
  V41.dropCall();V41.scheduleRetry();
 });
 V41.retryTimer=setTimeout(function(){
  if(ticket===V41.token&&V41.call===call&&!opened){V41.dropCall();V41.scheduleRetry();}
 },18000);
};
V41.dropCall=function(){
 clearTimeout(V41.retryTimer);V41.retryTimer=null;
 var old=V41.call;V41.call=null;V41.remoteId='';
 if(old){try{old.close();}catch(e){}}
 if(V41.remote){try{V41.remote.pause();V41.remote.srcObject=null;}catch(e){}}
 V41.needsTap=false;
};
V41.scheduleRetry=function(){
 if(!V41.enabled)return;
 var active=V41.activeOther();
 if(!active){V41.tries=0;V41.show('waiting');return;}
 if(++V41.tries>4){V41.show('error','Não foi possível conectar. Encerre a voz e tente novamente.');return;}
 V41.show('reconnecting');
 clearTimeout(V41.retryTimer);
 var ticket=V41.token;
 V41.retryTimer=setTimeout(function(){
  V41.retryTimer=null;
  if(ticket===V41.token&&V41.enabled)V41.maybeConnect();
 },3000+V41.tries*1400);
};
V41.maybeConnect=function(){
 if(!V41.enabled||!V41.published||!V41.peerReady||!V41.peer||!V31.room||V31.room.status!=='play')return;
 var other=V41.activeOther();
 if(!other){
  if(V41.call)V41.dropCall();
  if(V41.pending){try{V41.pending.close();}catch(e){}V41.pending=null;}
  if(V41.state!=='waiting')V41.show('waiting');
  return;
 }
 if(V41.call){
  if(V41.remoteId===other.sid)return;
  V41.dropCall();
 }
 if(V41.me==='b'){
  var incoming=V41.pending;
  if(incoming&&incoming.peer===other.sid&&incoming.metadata&&incoming.metadata.room===V41.code&&incoming.metadata.from==='w'){
   V41.pending=null;clearTimeout(V41.pendingTimer);V41.pendingTimer=null;
   V41.attachCall(incoming,other.sid);
   try{incoming.answer(V41.local);}catch(e){V41.dropCall();V41.scheduleRetry();}
  }
  return;
 }
 // Só Brancas iniciam a chamada: impede colisão entre ofertas simultâneas.
 if(V41.retryTimer||V41.tries>4)return;
 try{
  var call=V41.peer.call(other.sid,V41.local,{metadata:{room:V41.code,from:'w'}});
  if(!call){V41.scheduleRetry();return;}
  V41.attachCall(call,other.sid);
 }catch(e){V41.scheduleRetry();}
};
V41.toggleMute=function(){
 if(!V41.enabled||!V41.local)return;
 V41.muted=!V41.muted;
 V41.local.getAudioTracks().forEach(function(t){t.enabled=!V41.muted;});
 V41.render();
};
V41.fail=function(message,error){
 V41.stop(true);V41.state='error';V41.error=message;V41.render();
 if(error&&window.console)console.warn('[Rota do Mestre / PeerJS]',error);
};
V41.stop=function(notify){
 V41.token++;
 var ref=V41.peerDoc,uid=V41.uid,was=V41.enabled;
 V41.enabled=false;V41.peerReady=false;V41.published=false;
 clearInterval(V41.heartbeat);clearTimeout(V41.openTimer);clearTimeout(V41.pendingTimer);clearTimeout(V41.retryTimer);
 V41.heartbeat=V41.openTimer=V41.pendingTimer=V41.retryTimer=null;
 if(V41.unsub){try{V41.unsub();}catch(e){}V41.unsub=null;}
 if(V41.pending){try{V41.pending.close();}catch(e){}V41.pending=null;}
 V41.dropCall();
 if(V41.peer){try{V41.peer.destroy();}catch(e){}V41.peer=null;}
 if(V41.local){V41.local.getTracks().forEach(function(t){t.stop();});V41.local=null;}
 if(V41.remote){try{V41.remote.pause();V41.remote.srcObject=null;V41.remote.remove();}catch(e){}V41.remote=null;}
 V41.peerDoc=null;V41.peerId='';V41.remoteId='';V41.participants={};V41.tries=0;
 V41.muted=false;V41.needsTap=false;V41.state='off';V41.error='';
 if(notify&&was&&ref&&uid){
  ref.set({uid:uid,enabled:false,sid:'',sdp:'',ice:[],t:V41.ts()}).catch(function(){});
 }
};
(function(){
 if(typeof V31==='undefined'||typeof V35==='undefined')return;
 // A interface antiga de chamadas telefônicas foi retirada de V35.
 var decorate=V35.decorate;
 V35.decorate=function(){
  var result=decorate.apply(this,arguments);
  var box=document.querySelector('.v35-tools');
  if(box){
   [].forEach.call(box.querySelectorAll('.v35-call,.v35-lib,.v35-wait'),function(el){el.remove();});
   V41.render();
  }
  return result;
 };
 var close=V31.close;
 V31.close=function(){V41.stop(true);V41.code=null;V41.me=null;V41.uid=null;return close.apply(this,arguments);};
 window.addEventListener('pagehide',function(){if(V41.enabled)V41.stop(true);});
})();
