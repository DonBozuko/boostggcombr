const url=process.env.VITE_SUPABASE_URL, key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const r=await fetch(`${url}/rest/v1/pricing_items?select=pacote,category,quantidade,cost_brl,price_brl&limit=2000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
const rows=await r.json();
if(!Array.isArray(rows)){console.log(rows);process.exit(1)}
const {planAuthorityPrices}=await import('./src/lib/price-authority.ts');
let cur=rows.map(x=>({pacote:x.pacote,category:x.category||'',quantidade:+x.quantidade||0,cost_brl:+x.cost_brl||0,price_brl:+x.price_brl||0}));
const antes=cur.map(r=>({...r}));
for(let i=0;i<40;i++) cur=planAuthorityPrices(cur).rows;
const m=new Map(cur.map(r=>[r.pacote,r.price_brl]));
let dn=0,up=0,sa=0,sb=0,worst=[];
for(const a of antes){const p=m.get(a.pacote); sb+=a.price_brl; sa+=p; if(p<a.price_brl-0.01){dn++;worst.push([a.pacote,a.quantidade,a.price_brl,p])} else if(p>a.price_brl+0.01) up++;}
worst.sort((x,y)=>(x[3]/x[2])-(y[3]/y[2]));
console.log({total:antes.length,baixaram:dn,subiram:up,somaAntes:sb.toFixed(0),somaDepois:sa.toFixed(0)});
console.log(worst.slice(0,15));
