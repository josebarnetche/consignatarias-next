/* GSC — diagnóstico de orgánico + oportunidades. Read-only. No se commitea. */
const fs=require('fs'),path=require('path');
const {google}=require('googleapis');const {OAuth2Client}=require('google-auth-library');
const credentials=require('./oauth-credentials.json');const tokens=require('./oauth-token.json');
const o=new OAuth2Client(credentials.installed.client_id,credentials.installed.client_secret,'http://localhost:3333');
o.setCredentials(tokens);
o.on('tokens',(n)=>{if(n.refresh_token)tokens.refresh_token=n.refresh_token;tokens.access_token=n.access_token;tokens.expiry_date=n.expiry_date;fs.writeFileSync(path.join(__dirname,'oauth-token.json'),JSON.stringify(tokens,null,2));});
const sc=google.searchconsole({version:'v1',auth:o});
const SITE='sc-domain:consignatarias.com.ar';

// ventana: últimos 28d terminando hace 3d (lag de GSC)
function d(off){const t=new Date('2026-06-08T12:00:00Z');t.setUTCDate(t.getUTCDate()-off);return t.toISOString().slice(0,10);}
const END=d(3), START=d(31), PREV_END=d(32), PREV_START=d(60);
const pct=(n)=>(n*100).toFixed(1);

async function q(body){const r=await sc.searchanalytics.query({siteUrl:SITE,requestBody:body});return r.data.rows||[];}

(async()=>{
  // 1) totales 28d vs 28d previos
  const cur=(await q({startDate:START,endDate:END,dimensions:[]}))[0]||{};
  const prev=(await q({startDate:PREV_START,endDate:PREV_END,dimensions:[]}))[0]||{};
  console.log(`=== TOTALES ORGÁNICO ===  (${START}→${END} vs ${PREV_START}→${PREV_END})`);
  const f=(r)=>r.clicks!==undefined?`clicks=${Math.round(r.clicks)} impr=${Math.round(r.impressions)} ctr=${pct(r.ctr)}% pos=${(r.position||0).toFixed(1)}`:'(sin data)';
  console.log('  actual :',f(cur));
  console.log('  previo :',f(prev));

  // 2) top queries por clicks
  const queries=await q({startDate:START,endDate:END,dimensions:['query'],rowLimit:200});
  console.log('\n=== TOP 15 QUERIES POR CLICKS ===');
  queries.slice().sort((a,b)=>b.clicks-a.clicks).slice(0,15).forEach(r=>{
    console.log(`  ${String(Math.round(r.clicks)).padStart(3)}clk ${String(Math.round(r.impressions)).padStart(5)}imp ctr ${pct(r.ctr).padStart(4)}% pos ${(r.position).toFixed(1).padStart(4)}  ${r.keys[0]}`);
  });

  // 3) STRIKING DISTANCE: pos 4-20, impresiones altas, pocos clicks → mover a page 1
  console.log('\n=== OPORTUNIDAD A · STRIKING DISTANCE (pos 4-20, +impresiones) ===');
  queries.filter(r=>r.position>=4&&r.position<=20&&r.impressions>=30)
    .sort((a,b)=>b.impressions-a.impressions).slice(0,15).forEach(r=>{
      console.log(`  pos ${(r.position).toFixed(1).padStart(4)} ${String(Math.round(r.impressions)).padStart(5)}imp ${String(Math.round(r.clicks)).padStart(3)}clk ctr ${pct(r.ctr).padStart(4)}%  ${r.keys[0]}`);
    });

  // 4) ALTO IMPR / BAJO CTR en page 1 (pos<=10) → mejorar title/meta
  console.log('\n=== OPORTUNIDAD B · EN PAGE 1 PERO CTR BAJO (pos<=10, ctr<3%) ===');
  queries.filter(r=>r.position<=10&&r.impressions>=50&&r.ctr<0.03)
    .sort((a,b)=>b.impressions-a.impressions).slice(0,12).forEach(r=>{
      console.log(`  pos ${(r.position).toFixed(1).padStart(4)} ${String(Math.round(r.impressions)).padStart(5)}imp ctr ${pct(r.ctr).padStart(4)}%  ${r.keys[0]}`);
    });

  // 5) top páginas
  const pages=await q({startDate:START,endDate:END,dimensions:['page'],rowLimit:50});
  console.log('\n=== TOP 12 PÁGINAS POR CLICKS ===');
  pages.slice().sort((a,b)=>b.clicks-a.clicks).slice(0,12).forEach(r=>{
    console.log(`  ${String(Math.round(r.clicks)).padStart(3)}clk ${String(Math.round(r.impressions)).padStart(5)}imp ctr ${pct(r.ctr).padStart(4)}%  ${r.keys[0].replace('https://www.consignatarias.com.ar','')}`);
  });
})().catch(e=>{console.error('ERROR:',e.message);process.exit(1);});
