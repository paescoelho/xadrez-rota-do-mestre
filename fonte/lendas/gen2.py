# Atualiza web/lendas_data.js com o que foi medido nas partidas reais (stats.json + book/*.json)
# e copia os livros para web/lendas/<id>.json. Mantém as linhas manuais (w/b) só como reserva sem internet.
import json, re, hashlib, shutil, os, sys, chess
sys.path.insert(0, '/home/claude/lendas'); import real
W = '/home/claude/v2/web/'
src = open(W + 'lendas_data.js', encoding='utf8').read()
head, arr = src.split('var LENDAS=', 1)
L = json.loads(arr.strip().rstrip(';'))
S = json.load(open('/home/claude/lendas/stats.json'))
NAME = {'Defesa Siciliana':'Siciliana','Ruy Lopez (Espanhola)':'Ruy Lopez','Abertura Inglesa':'Inglesa','Gambito da Dama Recusado':'Gambito da Dama Recusado',
 'Abertura Zukertort':'Réti (1.Cf3)','Defesa Nimzo-Índia':'Nimzo-Índia','Defesa Francesa':'Francesa','Defesa Índia':'Índias (1.d4 Cf6)','Defesa do Rei Índia':'Índia do Rei',
 'Defesa Caro-Kann':'Caro-Kann','Jogo do Peão da Dama':'Peão da Dama','Jogo Italiano':'Italiana','Defesa da Dama Índia':'Índia da Dama','Defesa Eslava':'Eslava',
 'Gambito do Rei Aceito':'Gambito do Rei','Gambito do Rei Recusado':'Gambito do Rei',"Defesa Petrov's":'Petrov','Ataque do Rei Índia':'Ataque Índio do Rei','Defesa Grünfeld':'Grünfeld',
 'Jogo Escocês':'Escocesa','Defesa Horwitz':'Horwitz','Defesa Benoni':'Benoni','Defesa Philidor':'Philidor','Jogo dos Quatro Cavalos':'Quatro Cavalos','Defesa Holandesa':'Holandesa',
 'Ataque Nimzo-Larsen':'Nimzo-Larsen','Defesa Pirc':'Pirc','Jogo Vienense':'Vienense','Abertura dos Três Cavalos':'Três Cavalos'}
def short(f): return NAME.get(f, f)
def fams(lst, k=3):
    agg = {}
    for f, pc in lst: agg[short(f)] = agg.get(short(f), 0) + pc
    out = [f'{f} {pc}%' for f, pc in sorted(agg.items(), key=lambda x: -x[1]) if pc >= 4][:k]
    return ', '.join(out)
FIRST = {'e2e4': '1.e4', 'd2d4': '1.d4', 'c2c4': '1.c4', 'g1f3': '1.Cf3', 'b2b3': '1.b3', 'f2f4': '1.f4', 'g2g3': '1.g3'}
mean_ag = sum(v['ag'] for v in S.values()) / len(S)
mean_sac = sum(v['sacok'] for v in S.values()) / len(S)
mean_qx = sum(v['qx'] for v in S.values()) / len(S)
clamp = lambda x, a, b: max(a, min(b, x))
os.makedirs(W + 'lendas', exist_ok=True)
for p in L:
    s = S[p['id']]
    # estilo medido: capturas+xeques por lance e jogos com material a menos sem perder (sacrifícios),
    # ampliados em torno da média das 24 lendas para o motor sentir a diferença
    p['ag'] = int(clamp(round(25 + 2.2 * (s['sacok'] - mean_sac) + 1.5 * (s['ag'] - mean_ag)), 15, 48))
    p['qx'] = int(clamp(round(40 + 3 * (s['qx'] - mean_qx)), 20, 65))
    p['cs'] = s['cs'] or 'k'; p['cn'] = s['cn']
    bk = json.load(open(f"/home/claude/lendas/book/{p['id']}.json"))
    def shares(fen_moves, names, k):
        bd = chess.Board()
        for u in fen_moves: bd.push_uci(u)
        e = bk.get(real.key(bd))
        if not e: return ''
        tot = sum(w for _, w in e[1:]); out = []
        for u, w in e[1:]:
            pc = round(100 * w / tot)
            if pc >= 5 and len(out) < k: out.append(f"{names.get(u, u)} {pc}%")
        return ', '.join(out)
    p['ow'] = shares([], {'e2e4':'1.e4','d2d4':'1.d4','c2c4':'1.c4','g1f3':'1.Cf3','b2b3':'1.b3','f2f4':'1.f4','g2g3':'1.g3'}, 3)
    E4 = {'e7e5':'1…e5','c7c5':'Siciliana','e7e6':'Francesa','c7c6':'Caro-Kann','d7d6':'Pirc','g7g6':'Moderna','g8f6':'Alekhine','d7d5':'Escandinava','b8c6':'Nimzowitsch'}
    D4 = {'g8f6':'1…Cf6','d7d5':'1…d5','e7e6':'1…e6','f7f5':'Holandesa','g7g6':'1…g6','d7d6':'1…d6','c7c5':'Benoni','b8c6':'1…Cc6'}
    a, b2 = shares(['e2e4'], E4, 2), shares(['d2d4'], D4, 2)
    p['ob'] = '; '.join(x for x in (('contra 1.e4: ' + a) if a else '', ('contra 1.d4: ' + b2) if b2 else '') if x)
    p['ng'] = s['n']; p['yr'] = f"{s['y0']}–{s['y1']}" if s['y0'] != s['y1'] else str(s['y0'])
    b = open(f"/home/claude/lendas/book/{p['id']}.json", 'rb').read()
    p['bv'] = hashlib.md5(b).hexdigest()[:8]
    shutil.copy(f"/home/claude/lendas/book/{p['id']}.json", W + f"lendas/{p['id']}.json")
    print(f"{p['id']:11} ag {p['ag']:2} qx {p['qx']:2} cn {p['cn']:2} | B: {p['ow']} | P: {p['ob']}")
head = '/* gerado por lendas/gen.js + lendas/gen2.py: estilo e aberturas medidos em ' + str(sum(v['n'] for v in S.values())) + ' partidas reais; w/b são reserva sem internet */\n'
open(W + 'lendas_data.js', 'w', encoding='utf8').write(head + 'var LENDAS=' + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + ';\n')
