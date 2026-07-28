import fs from 'fs';
const raw = fs.readFileSync('/tmp/rows.txt','utf8').trim();
let cur = raw.split(';').filter(Boolean).map(l=>{const [p,c,q,co,pr]=l.split('|');return {pacote:p,category:c,quantidade:+q,cost_brl:+co,price_brl:+pr}});
const {planAuthorityPrices} = await import('./src/lib/price-authority.ts');
const antes = cur.map(r=>({...r}));
for(let i=0;i<40;i++) cur = planAuthorityPrices(cur).rows;
const m = new Map(cur.map(r=>[r.pacote,r.price_brl]));
let dn=0,up=0,sa=0,sb=0; const worst=[];
for(const a of antes){const p=m.get(a.pacote); sb+=a.price_brl; sa+=p;
 if(p<a.price_brl-0.01){dn++; worst.push([a.pacote,a.quantidade,a.price_brl,p,Math.round((p/a.price_brl-1)*100)+'%'])} else if(p>a.price_brl+0.01) up++;}
worst.sort((x,y)=>(x[3]/x[2])-(y[3]/y[2]));
console.log({total:antes.length,baixaram:dn,subiram:up,somaAntes:sb.toFixed(0),somaDepois:sa.toFixed(0)});
console.log(worst.slice(0,20));
console.log('IG:', cur.filter(r=>r.category==='instagram:seguidores').sort((a,b)=>a.quantidade-b.quantidade).slice(0,12).map(r=>r.quantidade+'='+r.price_brl));
