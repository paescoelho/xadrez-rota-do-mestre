// Gera web/lendas_data.js: jogadores + repertórios validados (SAN -> UCI) com o motor do jogo
const E = require('/home/claude/eng/bin/fin.js').E, fs = require('fs');
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const L = {
 // brancas com 1.e4
 RL:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5', RLx:'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4', RLb:'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6',
 IT:'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', EV:'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4', TK:'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6',
 KG:'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6', SC:'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7', PET:'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6',
 VIE:'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O', STD:'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6', OPN:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5',
 NAJe:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5', NAJg:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6', NAJ2:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5', NAJc:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6',
 RAU:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5 e6', SOZ:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bc4 e6', SVE:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6',
 DRA:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7', SCH:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 Be2 Be7', TAI:'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6', KAN:'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O Qc7',
 ROS:'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 dxc6 d3 Bg7 h3 Nf6', ROSb:'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5', ALA:'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6', CLS:'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6',
 FRw:'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7', FRc:'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7', FRt:'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6', FRtc:'e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6 Bb5 Bd6',
 FRa:'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6', FRx:'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
 CKc:'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6', CKk:'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6', CKa:'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7', CKp:'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7', CK2:'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6',
 PIR:'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6', PIRc:'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6', ALE:'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7', SCA:'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5',
 // 1.d4 / 1.c4 / 1.Cf3
 QGD:'d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6', QGDx:'d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6', QGDf:'d4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5', TAR:'d4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6',
 SLV:'d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6', SEM:'d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4', SEMc:'d4 d5 c4 c6 Nc3 Nf6 e3 e6 Nf3 Nbd7 Qc2 Bd6', QGA:'d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
 NIM:'d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5', NIMq:'d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6', NIMl:'d4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4 c5 d5 d6',
 QID:'d4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7', QIDp:'d4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5', CAT:'d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4',
 KID:'d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5', KIDs:'d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5', GRU:'d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7', GRUr:'d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O',
 BEN:'d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6', LON:'d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6', LONn:'d4 Nf6 Bf4 d5 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6',
 DUT:'d4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6', STO:'d4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6', STO2:'d4 f5 c4 Nf6 g3 e6 Bg2 d5 Nf3 c6 O-O Bd6',
 ENG:'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6', ENG4:'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6', ENGs:'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O', ENGq:'c4 Nf6 Nc3 e6 Nf3 d5 d4 Be7 Bg5 O-O e3 h6',
 ENGk:'c4 Nf6 Nc3 g6 e4 d6 d4 Bg7 Nf3 O-O Be2 e5', RET:'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bf5 d3 e6 Nbd2 h6', RETc:'Nf3 Nf6 c4 e6 g3 d5 Bg2 Be7 O-O O-O d4 dxc4', RETq:'Nf3 Nf6 c4 e6 Nc3 d5 d4 Be7 Bg5 O-O e3 h6',
 RETk:'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O Be2 e5', RETd:'Nf3 d5 d4 Nf6 c4 e6 Nc3 Be7 Bg5 O-O e3 h6'
};
function toUci(san) {
  const p = E.posFromFEN(START), out = [];
  for (const s of san.split(' ')) {
    let hit = -1;
    for (const m of E.legalMoves(p)) if (E.moveToSANEn(p, m).replace(/[+#]/g, '') === s.replace(/[+#]/g, '')) { hit = m; break; }
    if (hit < 0) throw new Error('lance inválido "' + s + '" em: ' + san);
    out.push(E.moveToUCI(hit)); E.makeMove(p, hit); p.stack = [];
  }
  if (out.length > 12) throw new Error('linha longa: ' + san);
  return out.join(' ');
}
const U = {}; for (const k in L) U[k] = toUci(L[k]);
// w/b: "CHAVE*peso"; nomes das aberturas para o cartão
const P = [
 {id:'carlsen',n:'Magnus Carlsen',s:'Carlsen',c:'🇳🇴',p:'Noruega',y:'1990',e:2882,t:'Campeão mundial 2013–2023',g:'wc now',st:'Universal: aperta posições iguais até você errar e vence o final.',ow:'Ruy Lopez, Italiana, Rossolimo, Gambito da Dama, Catalã',ob:'Siciliana Sveshnikov, Berlim, Gambito da Dama Recusado, Nimzo-Índia',
  ag:24,qx:58,ph:[.8,.8,.6],w:'RL*3 IT*3 ROS*3 NAJ2*2 FRt CKa PET QGD*2 CAT*2 LON*2 ENG RETc',b:'SVE*3 RLb*3 RL*2 IT*2 ROSb ALA SC QGD*3 QGDf*2 NIM*2 NIMq QID CAT ENG4 RETq LON'},
 {id:'kasparov',n:'Garry Kasparov',s:'Kasparov',c:'🇷🇺',p:'Rússia',y:'1963',e:2851,t:'Campeão mundial 1985–2000',g:'wc',st:'Ataque dinâmico e iniciativa: abre o jogo e não deixa você respirar.',ow:'Siciliana Aberta, Ruy Lopez, Escocesa, Gambito da Dama',ob:'Siciliana Najdorf e Scheveningen, Índia do Rei, Grünfeld',
  ag:34,qx:30,ph:[.8,.9,.8],w:'NAJe*3 RAU*2 RL*2 SC*2 FRw CKc PIR QGDx*2 NIMq*2 KID GRU CAT QIDp',b:'NAJe*3 NAJg*2 NAJ2*2 NAJc SCH*2 ROSb ALA KID*3 KIDs*2 GRU*3 GRUr ENGk ENGs RETk'},
 {id:'fischer',n:'Bobby Fischer',s:'Fischer',c:'🇺🇸',p:'EUA',y:'1943–2008',e:2785,t:'Campeão mundial 1972–1975',g:'wc cl',st:'Sempre 1.e4. Clareza e precisão: cada lance tem um motivo.',ow:'Ruy Lopez (inclusive a das Trocas), Siciliana com Bc4',ob:'Siciliana Najdorf, Índia do Rei, Grünfeld',
  ag:30,qx:40,ph:[.9,.9,.8],w:'RL*3 RLx*2 NAJc*3 SOZ*2 FRw*2 CK2*2 PIR ALE PET',b:'NAJe*2 NAJg*3 NAJ2*2 NAJc*2 ROSb ALA KID*3 KIDs*2 GRU*2 GRUr ENGk*2 RETk*2'},
 {id:'karpov',n:'Anatoly Karpov',s:'Karpov',c:'🇷🇺',p:'Rússia',y:'1951',e:2780,t:'Campeão mundial 1975–1985',g:'wc',st:'Estrangulamento posicional: tira as suas jogadas uma a uma.',ow:'Ruy Lopez, Francesa Tarrasch, Gambito da Dama, Índia da Dama',ob:'Caro-Kann, Ruy Lopez fechada, Índia da Dama, Nimzo-Índia',
  ag:18,qx:55,ph:[.9,.9,.7],w:'RL*3 NAJ2*2 FRt*3 CKc*2 PET QGD*2 QID*2 CAT ENGs KIDs NIM',b:'CKk*3 CKc*2 CKa RL*2 PET IT QID*2 NIM*2 NIMq QGD*2 ENG4 RETq'},
 {id:'capablanca',n:'José Raúl Capablanca',s:'Capablanca',c:'🇨🇺',p:'Cuba',y:'1888–1942',e:2725,est:1,t:'Campeão mundial 1921–1927',g:'wc cl',st:'Simplicidade e técnica: troca peças e vence o final sem esforço aparente.',ow:'Gambito da Dama, Ruy Lopez',ob:'Gambito da Dama Recusado, Ruy Lopez, Caro-Kann',
  ag:20,qx:62,ph:[1.2,1.0,.7],w:'QGD*4 QGDx*2 SLV RL*2 FRc CKc',b:'QGD*3 QGDf RL*2 IT CKc*2 NIM QID RETd'},
 {id:'alekhine',n:'Alexander Alekhine',s:'Alekhine',c:'🇫🇷',p:'Rússia / França',y:'1892–1946',e:2690,est:1,t:'Campeão mundial 1927–35 e 1937–46',g:'wc cl',st:'Combinações longas que nascem de posições calmas.',ow:'Gambito da Dama, Ruy Lopez',ob:'Defesa Alekhine, Francesa, Gambito da Dama Recusado, Nimzo-Índia',
  ag:34,qx:30,ph:[1.3,1.2,1.0],w:'QGD*3 SLV*2 RL*2 FRw NAJ2 CAT',b:'ALE*3 FRw*2 FRc RL QGD*2 NIM*2 SLV'},
 {id:'lasker',n:'Emanuel Lasker',s:'Lasker',c:'🇩🇪',p:'Alemanha',y:'1868–1941',e:2720,est:1,t:'Campeão mundial 1894–1921 (27 anos)',g:'wc cl',st:'Lutador pragmático: escolhe o lance mais incômodo para você.',ow:'Ruy Lopez das Trocas, Gambito da Dama',ob:'Ruy Lopez, Gambito da Dama Recusado',
  ag:26,qx:45,ph:[1.5,1.3,.9],w:'RLx*3 RL*2 QGD*2 FRx FRc',b:'RLb*2 STD*2 IT QGD*3 FRc RETd'},
 {id:'botvinnik',n:'Mikhail Botvinnik',s:'Botvinnik',c:'🇷🇺',p:'União Soviética',y:'1911–1995',e:2720,est:1,t:'Campeão mundial 1948–1963',g:'wc cl',st:'Método científico: plano estratégico e preparação profunda.',ow:'Inglesa, Gambito da Dama (Trocas), Nimzo-Índia',ob:'Francesa Winawer, Caro-Kann, Semi-Eslava, Holandesa Stonewall',
  ag:24,qx:42,ph:[1.1,1.1,.9],w:'ENG*3 ENGs*2 QGDx*3 NIM*2 SEM KIDs',b:'FRw*3 FRtc CKc*2 SEM*3 SEMc STO*2 STO2 NIM ENGs'},
 {id:'tal',n:'Mikhail Tal',s:'Tal',c:'🇱🇻',p:'Letônia',y:'1936–1992',e:2705,t:'Campeão mundial 1960–1961',g:'wc cl',st:'O Mágico de Riga: sacrifica peças para atacar o rei, mesmo sem calcular tudo.',ow:'Siciliana Aberta com Bg5, Ruy Lopez',ob:'Benoni Moderna, Siciliana, Índia do Rei',
  ag:42,qx:18,ph:[1.4,1.6,1.4],bl:.5,w:'NAJg*3 RAU*2 RL*2 FRw CKc PIR KIDs QGD',b:'BEN*3 KID*2 NAJg*2 NAJ2 RL NIM ENGs'},
 {id:'petrosian',n:'Tigran Petrosian',s:'Petrosian',c:'🇦🇲',p:'Armênia',y:'1929–1984',e:2645,t:'Campeão mundial 1963–1969',g:'wc cl',st:'Profilaxia: impede o seu plano antes de ele começar.',ow:'Índia da Dama com a3, Gambito da Dama (Trocas)',ob:'Caro-Kann, Francesa, Índia do Rei',
  ag:14,qx:50,ph:[1.1,1.1,.9],w:'QIDp*3 QGDx*2 KID*2 ENG CAT',b:'CKc*3 CKk FRw*2 FRc QID KID*2 NIM QGD'},
 {id:'spassky',n:'Boris Spassky',s:'Spassky',c:'🇷🇺',p:'Rússia',y:'1937–2025',e:2690,t:'Campeão mundial 1969–1972',g:'wc cl',st:'Universal: ataca e defende com a mesma naturalidade.',ow:'Ruy Lopez, Siciliana Fechada, Gambito do Rei',ob:'Ruy Lopez, Defesa Tarrasch, Gambito da Dama Recusado',
  ag:30,qx:36,ph:[1.1,1.2,1.0],w:'RL*3 CLS*3 KG*2 QGD*2 NIMl*2 FRw',b:'RL*3 IT TAR*2 QGD*2 KID NIM'},
 {id:'smyslov',n:'Vasily Smyslov',s:'Smyslov',c:'🇷🇺',p:'Rússia',y:'1921–2010',e:2620,t:'Campeão mundial 1957–1958',g:'wc cl',st:'Harmonia: peças sempre coordenadas e finais de mestre.',ow:'Ruy Lopez, Inglesa, Catalã',ob:'Eslava, Grünfeld (variante Smyslov), Ruy Lopez',
  ag:20,qx:58,ph:[1.1,1.1,.7],w:'RL*2 ENG*2 CAT*2 QGD CLS',b:'SLV*3 GRUr*2 RL*2 RLb NIM'},
 {id:'steinitz',n:'Wilhelm Steinitz',s:'Steinitz',c:'🇦🇹',p:'Áustria / EUA',y:'1836–1900',e:2650,est:1,t:'Primeiro campeão mundial, 1886–1894',g:'wc cl',st:'Pai do xadrez posicional: acumula pequenas vantagens e defende sem medo.',ow:'Vienense, Ruy Lopez, Gambito do Rei',ob:'Ruy Lopez com a Defesa Steinitz, Gambito Evans aceito',
  ag:24,qx:40,ph:[2.0,1.8,1.4],bl:.5,w:'VIE*3 RL*2 KG*2 FRx',b:'STD*3 TK EV*2 KG QGD'},
 {id:'morphy',n:'Paul Morphy',s:'Morphy',c:'🇺🇸',p:'EUA',y:'1837–1884',e:2690,est:1,t:'O melhor do mundo em 1858',g:'cl',st:'Desenvolvimento rápido e linhas abertas: ataca antes de você rocar.',ow:'Gambito Evans, Gambito do Rei, Italiana',ob:'Jogos abertos com 1…e5, Dois Cavalos',
  ag:38,qx:25,cn:6,ph:[2.0,1.8,1.6],bl:.5,w:'EV*3 KG*3 IT FRx*2 SC',b:'TK*2 EV*2 KG*2 RL*2 QGD'},
 {id:'kramnik',n:'Vladimir Kramnik',s:'Kramnik',c:'🇷🇺',p:'Rússia',y:'1975',e:2817,t:'Campeão mundial 2000–2007',g:'wc',st:'Muralha de Berlim: solidez absoluta e técnica refinada.',ow:'Catalã, Réti, Gambito da Dama, Italiana',ob:'Berlim, Petroff, Eslava e Semi-Eslava, Nimzo-Índia',
  ag:18,qx:64,ph:[.8,.8,.6],w:'RETc*3 CAT*3 QGD*2 ENG*2 SLV IT*2 KID',b:'RLb*4 PET*3 IT QGD*2 SLV*2 SEM*2 NIM*2 ENG4 RETq'},
 {id:'anand',n:'Viswanathan Anand',s:'Anand',c:'🇮🇳',p:'Índia',y:'1969',e:2817,t:'Campeão mundial 2007–2013',g:'wc',st:'Cálculo muito rápido e repertório completo.',ow:'Ruy Lopez, Siciliana Aberta, Italiana, Catalã',ob:'Semi-Eslava, Najdorf, Berlim, Nimzo-Índia',
  ag:28,qx:42,fa:20,ph:[.8,.9,.7],w:'RL*3 NAJe*3 IT*2 FRw CKa QGD*2 CAT*2 SEM',b:'SEM*3 SLV*2 NAJe*2 NAJ2 RL*2 RLb*2 NIM*2 QID ENG4'},
 {id:'caruana',n:'Fabiano Caruana',s:'Caruana',c:'🇺🇸',p:'EUA',y:'1992',e:2844,t:'Vice-campeão mundial 2018',g:'now',st:'Preparação de aberturas e cálculo concreto.',ow:'Ruy Lopez, Italiana, Siciliana Aberta, Rossolimo',ob:'Petroff, Ruy Lopez, Gambito da Dama Aceito, Nimzo-Índia',
  ag:24,qx:45,ph:[.8,.8,.7],w:'RL*3 IT*2 NAJe*2 ROS*2 PET*2 FRw CKa QGD*2 CAT ENG',b:'PET*4 RL*2 IT TAI*2 QGD*2 QGA*2 NIM*2 SLV ENG4'},
 {id:'nakamura',n:'Hikaru Nakamura',s:'Nakamura',c:'🇺🇸',p:'EUA',y:'1987',e:2816,t:'Elite há 15 anos; o maior nome do xadrez online',g:'now',st:'Tático e resistente; mestre das partidas rápidas.',ow:'Gambito da Dama, Catalã, Londres, Ruy Lopez',ob:'Índia do Rei, Najdorf, Berlim, Nimzo-Índia',
  ag:30,qx:38,fa:25,ph:[.9,.9,.8],w:'QGD*2 CAT*2 LON*2 LONn RL*2 IT*2 ENG RET',b:'KID*3 KIDs NAJe*2 NAJg RLb*2 QGD*2 NIM*2 DUT ENGk RETk'},
 {id:'ding',n:'Ding Liren',s:'Ding',c:'🇨🇳',p:'China',y:'1992',e:2816,t:'Campeão mundial 2023–2024',g:'wc now',st:'Sólido e profundo; contra-ataca com precisão.',ow:'Inglesa, Catalã, Gambito da Dama, Réti',ob:'Ruy Lopez, Italiana, Semi-Eslava, Nimzo-Índia',
  ag:22,qx:48,ph:[.8,.9,.7],w:'ENG*3 ENGs CAT*3 QGD*2 RET*2 LON IT',b:'RL*2 IT*2 FRc QGD*2 SEM*2 NIM*2 KID ENG4'},
 {id:'gukesh',n:'Gukesh Dommaraju',s:'Gukesh',c:'🇮🇳',p:'Índia',y:'2006',e:2794,t:'Campeão mundial desde 2024, o mais jovem da história',g:'wc now',st:'Cálculo profundo e nervos frios.',ow:'Italiana, Ruy Lopez, Catalã, Gambito da Dama',ob:'Ruy Lopez, Italiana, Nimzo-Índia, Gambito da Dama Recusado',
  ag:26,qx:42,ph:[.8,.9,.8],w:'IT*3 RL*2 NAJe*2 FRx CAT*2 QGD*2 RET',b:'RL*2 IT*2 PET QGD*2 QGDf NIM*3 SLV ENG4'},
 {id:'polgar',n:'Judit Polgár',s:'Polgár',c:'🇭🇺',p:'Hungria',y:'1976',e:2735,t:'A maior jogadora da história; chegou a 8ª do mundo',g:'',st:'Ataque direto ao rei desde a abertura.',ow:'Siciliana Aberta, Ruy Lopez, Gambito do Rei',ob:'Siciliana Najdorf e Scheveningen, Índia do Rei',
  ag:38,qx:24,ph:[1.0,1.1,1.0],w:'NAJe*3 RAU*2 RL*2 KG FRw CKa',b:'NAJe*2 NAJg*2 SCH*2 KID*3 KIDs RL NIM'},
 {id:'korchnoi',n:'Viktor Korchnoi',s:'Korchnoi',c:'🇨🇭',p:'URSS / Suíça',y:'1931–2016',e:2695,t:'Vice-campeão mundial 1978 e 1981',g:'cl',st:'Contra-atacante: aceita material e defende com unhas e dentes.',ow:'Inglesa, Gambito da Dama, Catalã',ob:'Francesa Winawer, Ruy Lopez Aberta, Grünfeld',
  ag:26,qx:40,ph:[1.1,1.2,.9],w:'ENG*3 QGD*2 CAT*2 KID GRU',b:'FRw*3 FRtc OPN*3 GRU*2 NIM*2 ENG4'},
 {id:'mequinho',n:'Henrique Mecking (Mequinho)',s:'Mequinho',c:'🇧🇷',p:'Brasil',y:'1952',e:2635,t:'O maior brasileiro; 3º do mundo em 1977',g:'',st:'Jogo ativo e preparado: venceu os Interzonais de 1973 e 1976.',ow:'Gambito da Dama, Ruy Lopez, Siciliana Aberta',ob:'Siciliana Najdorf, Nimzo-Índia, Benoni',
  ag:28,qx:40,ph:[1.2,1.2,1.0],w:'QGD*2 NIM*2 KIDs CAT RL*2 NAJ2*2',b:'NAJe NAJg*2 NAJ2 NIM*2 BEN*2 QGD RL'},
 {id:'firouzja',n:'Alireza Firouzja',s:'Firouzja',c:'🇫🇷',p:'Irã / França',y:'2003',e:2804,t:'O mais jovem a passar de 2800',g:'now',st:'Agressivo e veloz: complica o jogo sempre que pode.',ow:'Siciliana Aberta, Ruy Lopez, Italiana, Catalã',ob:'Siciliana Najdorf, Índia do Rei, Grünfeld',
  ag:36,qx:30,fa:20,ph:[.9,1.0,.9],w:'NAJe*3 RL*2 IT*2 CKa FRw QGD CAT*2',b:'NAJe*2 NAJg*2 NAJ2 KID*2 GRU*2 RL NIM ENGk'}
];
const out = P.map(p => {
  const ln = s => s.split(' ').map(x => { const [k, w] = x.split('*'); if (!U[k]) throw new Error('linha desconhecida ' + k + ' em ' + p.id); return [U[k], +(w || 1)]; });
  const w = ln(p.w).filter(l => true), b = ln(p.b);
  return { id:p.id, n:p.n, s:p.s, c:p.c, p:p.p, y:p.y, e:p.e, est:p.est||0, t:p.t, g:p.g, st:p.st, ow:p.ow, ob:p.ob, ag:p.ag, qx:p.qx, cn:p.cn||8, fa:p.fa||6, ph:p.ph, bl:p.bl||0.2, w, b };
});
// cobertura: resposta das pretas a 1.e4 e 1.d4 para todos
for (const p of out) for (const f of ['e2e4', 'd2d4']) if (!p.b.some(l => l[0].startsWith(f))) throw new Error(p.id + ' sem resposta a ' + f);
fs.writeFileSync('/home/claude/v2/web/lendas_data.js', '/* gerado por lendas/gen.js: repertórios validados lance a lance com o motor do jogo */\nvar LENDAS=' + JSON.stringify(out) + ';\n');
console.log(out.length, 'jogadores;', Object.keys(U).length, 'linhas;', Math.round(fs.statSync('/home/claude/v2/web/lendas_data.js').size / 1024) + ' KB');
