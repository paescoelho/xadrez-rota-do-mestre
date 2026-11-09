const {spawn}=require('child_process');const fs=require('fs');
const games=JSON.parse(fs.readFileSync('/home/claude/v2/games_sf.json','utf8'));
let jobs=[];for(const g of games){const mv=g.moves.split(' ');for(let i=4;i<mv.length;i+=3)jobs.push(mv.slice(0,i).join(' '));}
jobs=jobs.filter((_,i)=>i%2===0).slice(0,700);
const sf=spawn('node',['/home/claude/v2/sf/bin/stockfish-19-lite-single.js']);
let buf='',cur=0,last=null,out=[];
sf.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const l=buf.slice(0,k);buf=buf.slice(k+1);
 if(l.includes(' wdl ')){const t=l.split(' ');const i=t.indexOf('wdl');last=[+t[i+1],+t[i+2],+t[i+3]];}
 if(l.startsWith('bestmove')){if(last)out.push(last);last=null;cur++;if(cur<jobs.length)go();else{sf.stdin.write('quit\n');done();}}
 if(l==='readyok')go();}});
function go(){sf.stdin.write('position startpos moves '+jobs[cur]+'\ngo depth 11\n');}
sf.stdin.write('uci\nsetoption name UCI_ShowWDL value true\nisready\n');
function sharp(w){let W=Math.max(w[0],1)/1000,L=Math.max(w[2],1)/1000;const s=Math.log(1/W-1)+Math.log(1/L-1);if(s<=0)return 10;return Math.min(10,Math.pow(2/s,2));}
function done(){const open=out.filter(w=>w[0]<900&&w[2]<900);console.log("decididas",out.length-open.length);const s=open.map(w=>(w[0]+w[2])/1000).sort((a,b)=>a-b);const q=p=>s[Math.floor(p*(s.length-1))];console.log('n',s.length,'p10',q(.1).toFixed(3),'p33',q(.33).toFixed(3),'p50',q(.5).toFixed(3),'p67',q(.67).toFixed(3),'p90',q(.9).toFixed(3));}
