/* Rota do Mestre · senhas temporárias do TURN da Cloudflare para a voz na partida.
 *
 * Por que existe: a chave do TURN (TURN_KEY_API_TOKEN) não pode ficar no código público do jogo.
 * Este Worker guarda a chave como segredo e entrega ao jogo só senhas que expiram em 3 horas.
 *
 * Quem pode pedir: só o site do jogo (Origin) e só quem está logado no Firebase do jogo
 * (o login anônimo que todo jogador online já tem; o jogador não faz nada).
 * O token do Firebase é conferido aqui com as chaves públicas do Google (RS256, aud/iss/exp).
 *
 * Segredos (Settings → Variables and Secrets do Worker, tipo "Secret"):
 *   TURN_KEY_ID          ID da chave do TURN (Realtime → TURN Server)
 *   TURN_KEY_API_TOKEN   token da API dessa chave
 */
const PROJECT = 'xadrez-whatsapp';
const ORIGINS = ['https://paescoelho.github.io'];
const TTL = 3 * 3600;
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwkCache = null, jwkUntil = 0;
async function googleKeys() {
  if (jwkCache && Date.now() < jwkUntil) return jwkCache;
  const r = await fetch(JWK_URL);
  if (!r.ok) throw new Error('jwk ' + r.status);
  const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  jwkCache = j.keys || []; jwkUntil = Date.now() + (m ? +m[1] : 3600) * 1000;
  return jwkCache;
}
function b64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function verifyFirebase(token) {
  const p = (token || '').split('.');
  if (p.length !== 3) throw new Error('formato');
  const head = JSON.parse(new TextDecoder().decode(b64u(p[0])));
  const body = JSON.parse(new TextDecoder().decode(b64u(p[1])));
  if (head.alg !== 'RS256' || !head.kid) throw new Error('alg');
  const jwk = (await googleKeys()).find(k => k.kid === head.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
  if (!ok) throw new Error('assinatura');
  const now = Math.floor(Date.now() / 1000);
  if (body.aud !== PROJECT || body.iss !== 'https://securetoken.google.com/' + PROJECT) throw new Error('projeto');
  if (!body.sub || typeof body.sub !== 'string' || body.sub.length > 128) throw new Error('sub');
  if (!(body.exp > now) || !(body.iat <= now + 300) || !(body.auth_time <= now + 300)) throw new Error('validade');
  return body.sub;
}
function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = ORIGINS.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : ORIGINS[0],
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed) return reply({ error: 'origem' }, 403, cors);
    if (req.method !== 'POST') return reply({ error: 'metodo' }, 405, cors);
    const auth = req.headers.get('Authorization') || '';
    let uid;
    try { uid = await verifyFirebase(auth.startsWith('Bearer ') ? auth.slice(7) : ''); }
    catch (e) { return reply({ error: 'login', motivo: String(e.message || e) }, 401, cors); }
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return reply({ error: 'config' }, 500, cors);
    const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + env.TURN_KEY_ID + '/credentials/generate-ice-servers', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.TURN_KEY_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL })
    });
    if (!r.ok) return reply({ error: 'cloudflare', status: r.status }, 502, cors);
    const j = await r.json();
    let ice = Array.isArray(j.iceServers) ? j.iceServers : (j.iceServers ? [j.iceServers] : []);
    /* a porta 53 é bloqueada pelos navegadores e só atrasa a conexão */
    ice = ice.map(s => ({ ...s, urls: [].concat(s.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length);
    return reply({ iceServers: ice, ttl: TTL }, 200, cors);
  }
};
