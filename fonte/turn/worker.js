/* Rota do Mestre · credenciais do TURN para a voz na partida (publicado como rota-turn.paescoelho.workers.dev).
 *
 * Por que existe: a chave da API do TURN não pode ficar no código público do jogo.
 * Este Worker guarda a chave como segredo e entrega ao jogo só as credenciais de uso do TURN.
 *
 * Quem pode pedir: só o site do jogo (Origin) e só quem está logado no Firebase do jogo
 * (o login anônimo que todo jogador online já tem; o jogador não faz nada).
 * O token do Firebase é conferido aqui com as chaves públicas do Google (RS256, aud/iss/exp).
 *
 * Fonte das senhas: Open Relay da Metered (20 GB/mês grátis, sem cartão).
 * Segredos (Settings → Variables and Secrets do Worker, tipo "Secret"):
 *   METERED_APP      nome do app na Metered (o começo de <nome>.metered.live)
 *   METERED_API_KEY  chave da API de credenciais da Metered
 * Rotas públicas (só para o site do jogo): GET /lichess (a cada 20 s) e GET /chesscom (a cada 15 min).
 * (worker_cloudflare.js tem a versão para o TURN da Cloudflare, se um dia houver cartão cadastrado.)
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
/* contadores do Lichess (jogadores conectados e partidas em andamento), lidos da página inicial de lá a cada 20 s */
let liCache = null, liUntil = 0;
async function lichessCounters(cors) {
  if (!liCache || Date.now() > liUntil) {
    try {
      const r = await fetch('https://lichess.org/', { headers: { 'User-Agent': 'RotaDoMestre/1.0 (+https://paescoelho.github.io/xadrez-rota-do-mestre/)', 'Accept': 'text/html' } });
      const m = /"counters":\{"members":(\d+),"rounds":(\d+)/.exec(await r.text());
      if (m) { liCache = { players: +m[1], games: +m[2], t: Date.now() }; liUntil = Date.now() + 20000; }
      else liUntil = Date.now() + 15000;
    } catch (e) { liUntil = Date.now() + 15000; }
  }
  if (!liCache) return reply({ error: 'lichess' }, 502, cors);
  return new Response(JSON.stringify(liCache), { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=20' } });
}
/* v129: contadores do Chess.com (jogadores agora e partidas hoje), lidos da página pública de rankings
   (https://www.chess.com/leaderboard, que já mostra esses números a qualquer visitante).
   No máximo UMA leitura a cada 15 min para o jogo inteiro (cache compartilhado da Cloudflare), com identificação honesta;
   se a leitura falhar, espera os mesmos 15 min antes de tentar de novo e mantém o último valor bom por até 6 h. */
const CC_TTL = 900, CC_KEY = 'https://rota-turn.cache/chesscom-v1';
let ccMem = null;
function ccNum(txt, label) {
  const m = new RegExp('([0-9][0-9.,\\u00a0 ]{0,14}[0-9])\\s*' + label, 'i').exec(txt);
  return m ? +m[1].replace(/[^0-9]/g, '') : 0;
}
async function chesscomCounters(cors) {
  const cache = caches.default, key = new Request(CC_KEY);
  let hit = await cache.match(key), data = hit ? await hit.json() : ccMem;
  const fresh = data && Date.now() - (data.tried || data.t) < CC_TTL * 1000;
  if (!fresh) {
    let ok = null;
    try {
      const r = await fetch('https://www.chess.com/leaderboard', { headers: { 'User-Agent': 'RotaDoMestre/1.0 (+https://paescoelho.github.io/xadrez-rota-do-mestre/; contador publico a cada 15 min)', 'Accept': 'text/html', 'Accept-Language': 'en' } });
      if (r.ok) {
        const txt = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
        const players = ccNum(txt, 'playing now'), games = ccNum(txt, 'games today');
        if (players > 1000 && games > 1000) ok = { players, games, t: Date.now() };
      }
    } catch (e) {}
    if (ok) data = ok;
    else if (data && Date.now() - data.t < 6 * 3600 * 1000) data = { ...data, tried: Date.now() };
    else data = { error: 1, t: 0, tried: Date.now() };
    ccMem = data;
    await cache.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + (CC_TTL * 2) } }));
  }
  if (!data || data.error) return reply({ error: 'chesscom' }, 502, cors);
  const left = Math.max(30, CC_TTL - Math.round((Date.now() - (data.tried || data.t)) / 1000));
  return new Response(JSON.stringify({ players: data.players, games: data.games, t: data.t }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + left } });
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed) return reply({ error: 'origem' }, 403, cors);
    if (req.method === 'GET' && new URL(req.url).pathname === '/lichess') return lichessCounters(cors);
    if (req.method === 'GET' && new URL(req.url).pathname === '/chesscom') return chesscomCounters(cors);
    if (req.method !== 'POST') return reply({ error: 'metodo' }, 405, cors);
    const auth = req.headers.get('Authorization') || '';
    try { await verifyFirebase(auth.startsWith('Bearer ') ? auth.slice(7) : ''); }
    catch (e) { return reply({ error: 'login', motivo: String(e.message || e) }, 401, cors); }
    if (!env.METERED_APP || !env.METERED_API_KEY) return reply({ error: 'config' }, 500, cors);
    if (!/^[a-z0-9-]{2,63}$/i.test(env.METERED_APP)) return reply({ error: 'config' }, 500, cors);
    const r = await fetch('https://' + env.METERED_APP + '.metered.live/api/v1/turn/credentials?apiKey=' + encodeURIComponent(env.METERED_API_KEY));
    if (!r.ok) return reply({ error: 'turn', status: r.status }, 502, cors);
    const j = await r.json();
    let ice = Array.isArray(j) ? j : (Array.isArray(j.iceServers) ? j.iceServers : (j.iceServers ? [j.iceServers] : []));
    /* a porta 53 é bloqueada pelos navegadores e só atrasa a conexão */
    ice = ice.map(s => ({ ...s, urls: [].concat(s.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length);
    return reply({ iceServers: ice, ttl: TTL }, 200, cors);
  }
};
