// Testa o Worker localmente: assinatura do Firebase, origem, validade e chamada à Cloudflare (simuladas)
import worker from './worker.js';
const enc = new TextEncoder();
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', kp.publicKey); jwk.kid = 'k1'; jwk.alg = 'RS256'; jwk.use = 'sig';
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function jwt(claims, key = kp.privateKey, kid = 'k1') {
  const h = b64u(enc.encode(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))), p = b64u(enc.encode(JSON.stringify(claims)));
  const s = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(h + '.' + p));
  return h + '.' + p + '.' + b64u(new Uint8Array(s));
}
const now = Math.floor(Date.now() / 1000);
const good = { aud: 'xadrez-whatsapp', iss: 'https://securetoken.google.com/xadrez-whatsapp', sub: 'uidAnonimo123', iat: now - 10, auth_time: now - 100, exp: now + 3000 };
let cfCalls = [];
globalThis.fetch = async (url, opt) => {
  if (url.includes('googleapis.com')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'public, max-age=20000' } });
  if (url.includes('.metered.live/api/v1/turn/credentials')) {
    cfCalls.push({ url });
    return new Response(JSON.stringify([{ urls: 'stun:stun.relay.metered.ca:80' }, { urls: 'turn:global.relay.metered.ca:80', username: 'u', credential: 'c' },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: 'u', credential: 'c' }, { urls: 'turn:global.relay.metered.ca:443', username: 'u', credential: 'c' },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'u', credential: 'c' }, { urls: 'turn:global.relay.metered.ca:53', username: 'u', credential: 'c' }]));
  }
  throw new Error('rede ' + url);
};
const env = { METERED_APP: 'rotadomestre', METERED_API_KEY: 'chaveTeste' };
const call = async (tok, origin = 'https://paescoelho.github.io', method = 'POST') => {
  const h = { Origin: origin }; if (tok) h.Authorization = 'Bearer ' + tok;
  const r = await worker.fetch(new Request('https://rota-turn.example.workers.dev/', { method, headers: h }), env);
  let j = null; try { j = await r.json(); } catch (e) {}
  return { st: r.status, j, aco: r.headers.get('access-control-allow-origin') };
};
const ok = [];
const t = (n, c, x) => { ok.push(c); console.log((c ? '✓ ' : '✗ ') + n + (x ? ' — ' + JSON.stringify(x) : '')); };
let r = await call(await jwt(good));
const urls = r.j && r.j.iceServers.flatMap(s => [].concat(s.urls));
t('jogador logado recebe senhas', r.st === 200 && r.j.iceServers.some(s => s.username === 'u'), r.st);
t('inclui TURN por TLS na porta 443 (redes fechadas)', urls.includes('turns:global.relay.metered.ca:443?transport=tcp'));
t('remove a porta 53', !urls.some(u => /:53(\?|$)/.test(u)), urls);
t('usa o app e a chave guardados como segredo', cfCalls[0].url === 'https://rotadomestre.metered.live/api/v1/turn/credentials?apiKey=chaveTeste');
t('CORS só para o site do jogo', r.aco === 'https://paescoelho.github.io');
r = await call(await jwt(good), 'https://site-qualquer.com'); t('outro site é recusado', r.st === 403);
r = await call(null); t('sem login é recusado', r.st === 401);
r = await call(await jwt({ ...good, exp: now - 5 })); t('token vencido é recusado', r.st === 401, r.j);
r = await call(await jwt({ ...good, aud: 'outro-projeto', iss: 'https://securetoken.google.com/outro-projeto' })); t('token de outro projeto Firebase é recusado', r.st === 401, r.j);
r = await call(await jwt(good, other.privateKey)); t('assinatura falsa é recusada', r.st === 401, r.j);
r = await call(await jwt(good, kp.privateKey, 'kid-desconhecido')); t('chave desconhecida é recusada', r.st === 401, r.j);
r = await call(null, 'https://paescoelho.github.io', 'OPTIONS'); t('pré-verificação CORS responde', r.st === 204);
r = await call(await jwt(good), 'https://paescoelho.github.io', 'GET'); t('GET é recusado', r.st === 405);
const r2 = await worker.fetch(new Request('https://x/', { method: 'POST', headers: { Origin: 'https://paescoelho.github.io', Authorization: 'Bearer ' + await jwt(good) } }), {});
t('sem os segredos configurados avisa', r2.status === 500);
console.log(`\n${ok.filter(Boolean).length}/${ok.length} ok`);
