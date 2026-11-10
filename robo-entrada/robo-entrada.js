#!/usr/bin/env node
/* Robô do Face ID da ENTRADA DA FÁBRICA (10/11/2026).
   Lê o relatório "Acessos Gerais" do 2º iDSecure (o da entrada da fábrica) e grava em rh/dados/ponto/<AAAA-MM> do Firestore,
   no mesmo formato que a importação manual do Pagamento dos PJ (dias.<dia>.<cpf>={p,t,ar}, pessoas, imp). Node.js puro, sem npm.
   Também envia os CSV deixados na pasta (config.pasta) — dá para usar sem a API do iDSecure.
   Status em rh/dados/robo/entrada {ultima, ok, passagens, origem, erro}. O robô do Face ID de sempre (almoço) não muda.
   Uso: node robo-entrada.js [--dias 7] [--config config.json] */
'use strict';
const fs=require('fs'), path=require('path'), https=require('https'), http=require('http'), crypto=require('crypto'), tls=require('tls');
const AQUI=__dirname, arg=(n,d)=>{ const i=process.argv.indexOf('--'+n); return i>0?process.argv[i+1]:d; };
const log=(...a)=>{ const t=new Date().toLocaleString('pt-BR'); const l='['+t+'] '+a.join(' '); console.log(l); try{ fs.appendFileSync(path.join(AQUI,'robo-entrada.log'),l+'\n'); }catch(e){} };

/* ---------- CSV "Acessos Gerais" (cópia de lerCsv/interpretar do modulos/rh-almoco.js; mudou lá, muda aqui) ---------- */
const nrm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const titulo=s=>String(s||'').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).trim();
function lerCsv(txt){ const L=[]; let row=[], cel='', q=false;
  for(let i=0;i<txt.length;i++){ const ch=txt[i];
    if(q){ if(ch==='"'){ if(txt[i+1]==='"'){ cel+='"'; i++; } else q=false; } else cel+=ch; continue; }
    if(ch==='"') q=true; else if(ch===','||ch===';'){ row.push(cel); cel=''; } else if(ch==='\n'){ row.push(cel); L.push(row); row=[]; cel=''; } else if(ch!=='\r') cel+=ch; }
  if(cel||row.length){ row.push(cel); L.push(row); } return L.filter(r=>r.some(x=>x.trim())); }
function interpretar(txt){ const L=lerCsv(txt); if(!L.length) throw new Error('Arquivo vazio.');
  const cab=L[0].map(nrm), col=re=>cab.findIndex(h=>re.test(h));
  const iH=col(/^HORA$|DATA E HORA/), iN=col(/NOME/), iC=col(/^CPF$/), iE=col(/^EMPRESA$/), iG=col(/^GRUPO/), iAu=col(/AUTORIZA/), iD=col(/DISPOSITIVO/), iAr=col(/^AREA$/);
  if(iH<0||iC<0||iD<0) throw new Error('Não parece o relatório "Acessos Gerais" do Control iD (faltam as colunas Hora, CPF ou Dispositivo).');
  const out={}, pes={}; let lidos=0, de='', ate='';
  for(const r of L.slice(1)){ const h=String(r[iH]||'').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}:\d{2})(:\d{2})?/); if(!h) continue;
    if(iAu>=0&&!/^AUTORIZADO$/.test(nrm(r[iAu]))) continue; const cpf=String(r[iC]||'').replace(/\D/g,''); if(!cpf) continue;
    const k=cpf.padStart(11,'0'), d=h[3]+'-'+h[2]+'-'+h[1], t=h[4].padStart(5,'0'); lidos++; if(!de||d<de) de=d; if(!ate||d>ate) ate=d;
    const x=((out[d]=out[d]||{})[k]=out[d][k]||{p:1}); (x.t=x.t||[]).push(t+(h[5]||'')+' '+String(r[iD]||'').trim().slice(0,30));
    if(iAr>=0){ const ar=String(r[iAr]||'').trim().slice(0,30); if(ar) (x.ar=x.ar||{})[t+(h[5]||'')]=ar; }
    pes[k]={n:titulo(r[iN]||''),e:iE>=0?String(r[iE]||'').trim():'',g:iG>=0?String(r[iG]||'').trim():''}; }
  Object.values(out).forEach(o=>Object.values(o).forEach(x=>{ if(x.t) x.t.sort(); }));
  return {dias:out,pessoas:pes,lidos,de,ate}; }
const decodifica=buf=>{ let t=new TextDecoder('utf-8').decode(buf); if(/\uFFFD/.test(t)) t=new TextDecoder('latin1').decode(buf); return t.replace(/^\uFEFF/,''); };

/* ---------- HTTP ---------- */
function pede(url,op={}){ return new Promise((res,rej)=>{ const u=new URL(url), mod=u.protocol==='http:'?http:https;
  const o={method:op.method||'GET',hostname:u.hostname,port:u.port||undefined,path:u.pathname+u.search,headers:op.headers||{},timeout:op.timeout||60000};
  if(op.inseguro){ o.rejectUnauthorized=false; o.checkServerIdentity=()=>undefined; }
  const r=mod.request(o,rs=>{ const b=[]; rs.on('data',x=>b.push(x)); rs.on('end',()=>res({status:rs.statusCode,headers:rs.headers,buf:Buffer.concat(b),cert:op.inseguro&&rs.socket&&rs.socket.getPeerCertificate?rs.socket.getPeerCertificate():null})); });
  r.on('timeout',()=>r.destroy(new Error('sem resposta de '+u.hostname))); r.on('error',rej); if(op.body) r.write(op.body); r.end(); }); }
const json=r=>{ try{ return JSON.parse(r.buf.toString('utf8')); }catch(e){ return null; } };

/* ---------- iDSecure ---------- */
/* certificado próprio do iDSecure: aceito só se for o mesmo da 1ª conexão (senão para, sem mandar a senha) */
async function confereCert(base){ const u=new URL(base); if(u.protocol!=='https:') return;
  const fp=await new Promise((res,rej)=>{ const s=tls.connect({host:u.hostname,port:+u.port||443,rejectUnauthorized:false,servername:u.hostname},()=>{ const c=s.getPeerCertificate(); s.end(); res(c&&c.fingerprint256||''); }); s.on('error',rej); s.setTimeout(20000,()=>s.destroy(new Error('sem resposta do iDSecure em '+u.host))); });
  const arq=path.join(AQUI,'entrada-certificado.txt'), guardado=fs.existsSync(arq)?fs.readFileSync(arq,'utf8').trim():'';
  if(!guardado){ fs.writeFileSync(arq,fp); log('Certificado do iDSecure guardado (1ª conexão).'); return; }
  if(guardado!==fp) throw new Error('O certificado do iDSecure mudou. Por segurança o robô parou e não mandou a senha. Se o iDSecure foi reinstalado, apague o arquivo entrada-certificado.txt e rode de novo.'); }
async function idsLogin(I){ const base=I.url.replace(/\/+$/,''), corpos=[{username:I.usuario,password:I.senha},{login:I.usuario,password:I.senha},{user:I.usuario,password:I.senha}];
  let ult=''; for(const caminho of [I.login||'/api/login','/api/login/']) for(const c of corpos){ const r=await pede(base+caminho,{method:'POST',inseguro:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}); const j=json(r);
    const tk=j&&(j.accessToken||j.token||j.access_token||(j.data&&(j.data.token||j.data.accessToken))); if(r.status<300&&tk) return tk; ult='login recusado ('+r.status+')'; }
  throw new Error('Não entrou no iDSecure: '+ult+'. Confira usuário e senha no config.json.'); }
const COLS=['Código','Hora','Nome do usuário','RG','CPF','Grupo','Empresa','Departamento','Empresa Visitada','Autorização','Detalhes','Matrícula','Dispositivo','Área','Operador'];
const relogio=d=>Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds())/1000); /* "hora do relógio" em segundos, como se fosse UTC */
async function idsRelatorio(I,tk,de,ate){ const base=I.url.replace(/\/+$/,''), rel=I.relatorio||{};
  const qs='draw=1&'+COLS.map((c,i)=>'columns%5B'+i+'%5D%5Bdata%5D='+i).join('&')+'&start=0&length=100000';
  const corpo=Object.assign({start:relogio(de),end:relogio(ate),cols:rel.cols||COLS,areas:[],devices:[],users:[],groups:[]},rel.corpo||{});
  const r=await pede(base+(rel.caminho||'/api/report/csv/global')+'?'+qs,{method:'POST',inseguro:true,timeout:180000,headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk},body:JSON.stringify(corpo)});
  if(r.status>=300) throw new Error('O iDSecure recusou o relatório ('+r.status+').');
  return decodifica(r.buf); }

/* ---------- Firestore (REST, chave de serviço) ---------- */
const b64u=b=>Buffer.from(b).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
async function fsToken(F){ const k=JSON.parse(fs.readFileSync(path.resolve(AQUI,F.chave),'utf8')), agora=Math.floor(Date.now()/1000), aud=F.tokenUrl||'https://oauth2.googleapis.com/token';
  const cab=b64u(JSON.stringify({alg:'RS256',typ:'JWT'})), pl=b64u(JSON.stringify({iss:k.client_email,scope:'https://www.googleapis.com/auth/datastore',aud,iat:agora,exp:agora+3600}));
  const sig=b64u(crypto.sign('RSA-SHA256',Buffer.from(cab+'.'+pl),k.private_key));
  const r=await pede(aud,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+cab+'.'+pl+'.'+sig});
  const j=json(r); if(!j||!j.access_token) throw new Error('A chave do Firebase foi recusada ('+r.status+').'); return j.access_token; }
const vEnc=v=>v===null||v===undefined?{nullValue:null}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}
  :Array.isArray(v)?{arrayValue:{values:v.map(vEnc)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,vEnc(x)]))}};
const vDec=v=>!v?null:'nullValue' in v?null:'booleanValue' in v?v.booleanValue:'integerValue' in v?+v.integerValue:'doubleValue' in v?v.doubleValue:'stringValue' in v?v.stringValue:'timestampValue' in v?v.timestampValue
  :'arrayValue' in v?(v.arrayValue.values||[]).map(vDec):'mapValue' in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,vDec(x)])):null;
const docUrl=(F,p)=>(F.base||'https://firestore.googleapis.com/v1')+'/projects/'+F.projeto+'/databases/(default)/documents/'+p;
async function fsLer(F,tk,p){ const r=await pede(docUrl(F,p),{headers:{Authorization:'Bearer '+tk}}); if(r.status===404) return null; if(r.status>=300) throw new Error('Firestore recusou a leitura de '+p+' ('+r.status+').');
  const j=json(r); return vDec({mapValue:{fields:(j&&j.fields)||{}}}); }
async function fsGravar(F,tk,p,obj){ const r=await pede(docUrl(F,p),{method:'PATCH',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({fields:vEnc(obj).mapValue.fields})});
  if(r.status>=300) throw new Error('Firestore recusou a gravação de '+p+' ('+r.status+'): '+r.buf.toString('utf8').slice(0,200)); }

/* junta as passagens com as que já estavam no mês (não apaga nada; mesma regra da importação manual) */
async function gravaPonto(F,tk,I,origem){ let nd=0; const porMes={}; Object.keys(I.dias).forEach(d=>{ (porMes[d.slice(0,7)]=porMes[d.slice(0,7)]||[]).push(d); });
  for(const m of Object.keys(porMes)){ const cur=(await fsLer(F,tk,'rh/dados/ponto/'+m))||{mes:m,dias:{},pessoas:{},imp:[]}, dias=Object.assign({},cur.dias||{});
    porMes[m].forEach(d=>{ const a=dias[d]||{}, b=I.dias[d]||{}, o={}; nd++;
      new Set(Object.keys(a).concat(Object.keys(b))).forEach(k=>{ const x=a[k]||{}, y=b[k]||{}, t=[...new Set((x.t||[]).concat(y.t||[]))].sort(), z={p:1,t}; if(x.ar||y.ar) z.ar=Object.assign({},x.ar||{},y.ar||{}); o[k]=z; }); dias[d]=o; });
    const pessoas=Object.assign({},cur.pessoas||{}); Object.keys(I.pessoas).forEach(k=>{ if(porMes[m].some(d=>I.dias[d]&&I.dias[d][k])) pessoas[k]=I.pessoas[k]; });
    const ds=porMes[m].sort(), imp=(cur.imp||[]).concat([{em:new Date().toISOString(),por:'Robô da entrada',auto:true,arq:origem,de:ds[0],ate:ds[ds.length-1],n:I.lidos}]).slice(-40);
    await fsGravar(F,tk,'rh/dados/ponto/'+m,{mes:m,dias,pessoas,imp,alteradoEm:new Date().toISOString()}); }
  return nd; }

async function rodar(){ const cfgArq=path.resolve(AQUI,arg('config','config.json')); if(!fs.existsSync(cfgArq)) throw new Error('Falta o config.json (copie o config.exemplo.json e preencha).');
  const C=JSON.parse(fs.readFileSync(cfgArq,'utf8')), F=C.firebase||{}, dias=+arg('dias',C.dias||7)||7; let tk=null, total=0, origem=[], erro='';
  const fim=new Date(), ini=new Date(fim); ini.setDate(ini.getDate()-(dias-1)); ini.setHours(0,0,0,0);
  try{ tk=await fsToken(F); }catch(e){ throw new Error('Firebase: '+e.message); }
  /* 1) API do iDSecure da entrada */
  if(C.idsecure&&C.idsecure.url){ try{ await confereCert(C.idsecure.url); const t=await idsLogin(C.idsecure), csv=await idsRelatorio(C.idsecure,t,ini,fim), I=interpretar(csv);
      if(I.lidos){ const nd=await gravaPonto(F,tk,I,'iDSecure da entrada'); total+=I.lidos; origem.push('iDSecure'); log('iDSecure: '+I.lidos+' passagens, '+nd+' dias ('+I.de+' a '+I.ate+').'); } else log('iDSecure: nenhuma passagem autorizada no período.'); }
    catch(e){ erro=e.message; log('ERRO iDSecure:',e.message); } }
  /* 2) CSV deixados na pasta (exportados à mão do iDSecure da entrada) */
  if(C.pasta&&fs.existsSync(C.pasta)){ const env=path.join(C.pasta,'enviados'); if(!fs.existsSync(env)) fs.mkdirSync(env);
    for(const n of fs.readdirSync(C.pasta).filter(n=>/\.csv$/i.test(n))){ const a=path.join(C.pasta,n);
      try{ const I=interpretar(decodifica(fs.readFileSync(a))); const nd=await gravaPonto(F,tk,I,n); total+=I.lidos; origem.push(n); fs.renameSync(a,path.join(env,Date.now()+'-'+n)); log('Pasta: '+n+' · '+I.lidos+' passagens, '+nd+' dias.'); }
      catch(e){ erro=erro||(n+': '+e.message); log('ERRO no arquivo',n+':',e.message); } } }
  await fsGravar(F,tk,'rh/dados/robo/entrada',{ultima:new Date().toISOString(),ok:!erro,passagens:total,origem:origem.join(', '),erro:erro||null,dias});
  return {total,erro}; }

if(require.main===module) rodar().then(r=>{ log('Fim · '+r.total+' passagens'+(r.erro?' · com erro: '+r.erro:'')); process.exit(r.erro?2:0); }).catch(e=>{ log('ERRO:',e.message); process.exit(1); });
module.exports={interpretar,vEnc,vDec,rodar};
