/* Painel Colafix · 64-producao-ano.js (27/10, pedido "pode montar o modelo completo de produção por ano? e que eu possa escolher linha ou produto")
   Tela "Produção do ano" (prodano), em Produção › Relatórios: os 12 meses em colunas e, nas linhas, os produtos, as linhas
   de produção ou linha › produto, com total, média, % e (opcional) o ano anterior. Filtros: ano, de onde vem (Extrato do
   Focco ou apontamentos do painel), sacos/toneladas, linhas (uma ou várias) e produto. Gráfico mês a mês, Excel e PDF.
   Os dados e as regras são os da Análise personalizada (js/57): praDad/praEsp buscam, praCalc filtra e devolve os
   lançamentos (it), praDiv põe a produção do Focco na linha onde o item é feito, praFocAvisos avisa o que falta.
   Prefixo `pano`. */
"use strict";
S.pano=S.pano||{ano:+hojeStr().slice(0,4),fonte:'focco',med:'sc',ver:'produto',ls:[],q:'',comp:false,tudo:false};
const PANO_M=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const PANO_VER=[['produto','Produto'],['linha','Linha'],['linprod','Linha › produto']];
function panoPer(ano){ const h=hojeStr(), de=ano+'-01-01', fim=ano+'-12-31'; return {de,ate:fim>h?h:fim,fim}; }
function panoF(A){ return {per:'datas',med:A.med,por:'produto',ls:A.ls.slice(),prod:A.q,semSetup:true,comp:false,fonte:A.fonte==='focco'?'focco':''}; }
/* lançamentos do ano → matriz chave × mês */
function panoMat(A,ano){ const f=panoF(A), P=panoPer(ano); if(P.de>hojeStr()) return {vazio:true,P};
  const d=praDad(f,P.de,P.ate); if(!d) return {carregando:true,P};
  const R=praCalc(f,d,P.de,P.ate); if(d.cov) R.cov=d.cov;
  const g=new Map(), lin={}, SEP=' › ';
  (R.it||[]).forEach(x=>{ if(!x.v) return; const p=x.p||'—', k=A.ver==='linha'?x.l:A.ver==='linprod'?x.l+SEP+p:p;
    let o=g.get(k); if(!o){ o={k,l:x.l,p,m:Array(12).fill(0),tot:0}; g.set(k,o); }
    const i=+x.d.slice(5,7)-1; o.m[i]+=x.v; o.tot+=x.v; if(A.ver==='produto') (lin[k]=lin[k]||new Set()).add(x.l); });
  const LO=linhasOrd(), ix=l=>{ const i=LO.indexOf(l); return i<0?999:i; };
  const rows=[...g.values()]; rows.forEach(o=>{ if(lin[o.k]) o.ls=[...lin[o.k]].sort((a,b)=>ix(a)-ix(b)); });
  if(A.ver==='linha') rows.sort((a,b)=>ix(a.k)-ix(b.k)||b.tot-a.tot); else if(A.ver==='linprod') rows.sort((a,b)=>ix(a.l)-ix(b.l)||a.l.localeCompare(b.l)||b.tot-a.tot); else rows.sort((a,b)=>b.tot-a.tot);
  const mes=Array(12).fill(0); rows.forEach(o=>o.m.forEach((v,i)=>mes[i]+=v)); const tot=mes.reduce((a,v)=>a+v,0);
  return {P,R,rows,mes,tot}; }
function panoDados(){ const A=S.pano, X=panoMat(A,A.ano); if(X.carregando||X.vazio) return X;
  if(A.comp){ const Y=panoMat(A,A.ano-1); if(Y.carregando) return {carregando:true,P:X.P}; X.ant=Y; X.antK={}; (Y.rows||[]).forEach(o=>X.antK[o.k]=o.tot); }
  return X; }
const panoN=(A,v)=>A.med==='t'?(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}):Math.round(v).toLocaleString('pt-BR');
const panoU=A=>A.med==='t'?'t':'sc';
function panoGraf(A,X){ const w=760,h=190,x0=48,x1=750,y0=160,yt=14, mx=Math.max(1,...X.mes,...(X.ant?X.ant.mes:[0])), bw=(x1-x0)/12;
  const Y=v=>y0-(y0-yt)*v/mx; let g='';
  for(let i=1;i<=4;i++){ const v=mx*i/4; g+=`<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="var(--line)"/><text x="${x0-6}" y="${Y(v)+4}" text-anchor="end">${panoN(A,v)}</text>`; }
  const hm=+hojeStr().slice(5,7)-1, anoH=+hojeStr().slice(0,4);
  X.mes.forEach((v,i)=>{ const cx=x0+bw*i, fut=A.ano===anoH&&i>hm; if(X.ant){ const a=X.ant.mes[i]; g+=`<rect x="${(cx+bw*0.16).toFixed(1)}" y="${Y(a).toFixed(1)}" width="${(bw*0.3).toFixed(1)}" height="${(y0-Y(a)).toFixed(1)}" fill="var(--line)" rx="2"><title>${PANO_M[i]} ${A.ano-1}: ${panoN(A,a)} ${panoU(A)}</title></rect>`; }
    const bx=X.ant?cx+bw*0.48:cx+bw*0.2, bww=X.ant?bw*0.36:bw*0.6;
    if(!fut) g+=`<rect x="${bx.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bww.toFixed(1)}" height="${(y0-Y(v)).toFixed(1)}" fill="var(--teal)" rx="2"><title>${PANO_M[i]}: ${panoN(A,v)} ${panoU(A)}</title></rect>`;
    g+=`<text x="${(cx+bw/2).toFixed(1)}" y="${y0+16}" text-anchor="middle" ${fut?'opacity=".45"':''}>${PANO_M[i]}</text>`; });
  return `<svg class="pano-g" viewBox="0 0 ${w} ${h}" role="img" aria-label="Produção por mês">${g}<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="var(--line)"/></svg>`; }
function vProdAno(){ const A=S.pano, X=panoDados(), LO=linhasOrd(), anoH=+hojeStr().slice(0,4), e=esc;
  const anos=[0,1,2,3].map(i=>anoH-i), seg=(k,ops)=>`<div class="seg" role="group">${ops.map(([v,l])=>`<button data-act="pano-set" data-k="${k}" data-v="${v}" aria-pressed="${String(A[k])===String(v)}">${l}</button>`).join('')}</div>`;
  const filtros=`<section class="card pano-f">
    <label>Ano<select class="txt" data-pano="ano">${anos.map(a=>`<option ${A.ano===a?'selected':''}>${a}</option>`).join('')}</select></label>
    <label>Produção de onde<select class="txt" data-pano="fonte"><option value="focco" ${A.fonte==='focco'?'selected':''}>Extrato do Focco (EPP)</option><option value="painel" ${A.fonte!=='focco'?'selected':''}>Apontamentos do painel</option></select></label>
    <div class="pano-fl"><span>Medida</span>${seg('med',[['sc','Sacos'],['t','Toneladas']])}</div>
    <div class="pano-fl"><span>Ver por</span>${seg('ver',PANO_VER)}</div>
    <label class="pano-q">Produto<input class="txt" id="pano-q" value="${e(A.q)}" placeholder="código ou nome (Enter)" autocomplete="off"></label>
    <div class="pano-ls"><span>Linhas</span><button class="pra-chip ${!A.ls.length?'on':''}" data-act="pano-ln" data-v="">Todas</button>${LO.map(l=>`<button class="pra-chip ${A.ls.includes(l)?'on':''}" data-act="pano-ln" data-v="${e(l)}">${e(l)}</button>`).join('')}</div>
    <label class="pra-ck"><input type="checkbox" data-pano="comp" ${A.comp?'checked':''}> Comparar com ${A.ano-1}</label>
    ${A.q||A.ls.length?`<button class="lnk" data-act="pano-limpar">Limpar filtros</button>`:''}</section>`;
  const cab=`<div class="head"><div><div class="eyebrow">PRODUÇÃO · RELATÓRIOS</div><h1>Produção do ano</h1><div class="sub">Mês a mês, por produto ou por linha${A.ls.length?' · '+e(A.ls.join(', ')):''}${A.q?' · produto com "'+e(A.q)+'"':''}</div></div>
    <div class="actions"><button class="btn sec" data-act="pano-xls" ${X.rows?'':'disabled'}>${ic('baixar',16,2)}Excel</button><button class="btn sec" data-act="pano-pdf" ${X.rows?'':'disabled'}>${ic('baixar',16,2)}PDF</button></div></div>`;
  if(X.vazio) return cab+filtros+'<section class="card"><div class="empty">Esse ano ainda não começou.</div></section>';
  if(X.carregando) return cab+filtros+'<section class="card"><div class="empty">Buscando a produção do ano…</div></section>';
  const hm=A.ano===anoH?+hojeStr().slice(5,7)-1:11, mesesCom=X.mes.slice(0,hm+1).filter(v=>v>0).length, media=mesesCom?X.tot/mesesCom:0;
  const melhor=X.mes.reduce((b,v,i)=>v>X.mes[b]?i:b,0), U=panoU(A), totAnt=X.ant?X.ant.tot:null;
  const vr=(a,b)=>!b?'':((a>=b?'+':'')+Math.round((a-b)/b*100)+'%');
  const k=(v,t,s,c)=>`<div class="${c||''}"><b class="num">${v}</b><span>${t}</span>${s?`<small>${s}</small>`:''}</div>`;
  const kp=`<div class="pra-tot pano-k">${k(panoN(A,X.tot)+' '+U,'Total em '+A.ano,X.ant?(totAnt?`${vr(X.tot,totAnt)} × ${A.ano-1} (${panoN(A,totAnt)} ${U})`:'sem dados em '+(A.ano-1)):'')}${k(panoN(A,media)+' '+U,'Média por mês',mesesCom+' '+(mesesCom===1?'mês':'meses')+' com produção')}${k(X.tot?PANO_M[melhor]:'—','Melhor mês',X.tot?panoN(A,X.mes[melhor])+' '+U:'')}${k(String(X.rows.length),A.ver==='linha'?'linhas':A.ver==='linprod'?'linha × produto':'produtos','')}</div>`;
  const avisos=A.fonte==='focco'?praFocAvisos(X.R,{P:{ate:X.P.ate}},{med:A.med}):'';
  const lim=A.tudo?X.rows.length:Math.min(X.rows.length,80), mostra=X.rows.slice(0,lim), cols=A.ver==='produto'&&!A.ls.length;
  const nc=v=>v?panoN(A,v):'<span class="t-mut">—</span>';
  let corpo='', lAnt=null;
  mostra.forEach(o=>{ if(A.ver==='linprod'&&o.l!==lAnt){ lAnt=o.l; const rs=X.rows.filter(r=>r.l===o.l), sm=Array(12).fill(0); rs.forEach(r=>r.m.forEach((v,i)=>sm[i]+=v)); const st=sm.reduce((a,v)=>a+v,0);
      corpo+=`<tr class="pano-gh"><th scope="row">${e(o.l)} <small>${rs.length} ${rs.length===1?'produto':'produtos'}</small></th>${sm.map(v=>`<td class="nr num">${nc(v)}</td>`).join('')}<td class="nr num"><b>${panoN(A,st)}</b></td><td class="nr num">${X.tot?Math.round(st/X.tot*100)+'%':''}</td>${X.ant?'<td></td><td></td>':''}</tr>`; }
    const nome=A.ver==='linprod'?o.p:o.k, cod=String(o.p||'').split(' · ')[0], a=X.antK?X.antK[o.k]||0:null;
    corpo+=`<tr><th scope="row">${A.ver!=='linha'&&cod&&cod!=='—'?`<button class="lnk pano-nm" data-act="pano-prod" data-v="${e(cod)}" title="Ver só este produto">${e(nome)}</button>`:e(nome)}${cols&&o.ls?`<small>${e(o.ls.join(' · '))}</small>`:''}</th>${o.m.map((v,i)=>`<td class="nr num ${A.ano===anoH&&i>hm?'fut':''}">${nc(v)}</td>`).join('')}<td class="nr num"><b>${panoN(A,o.tot)}</b></td><td class="nr num">${X.tot?Math.round(o.tot/X.tot*1000)/10+'%':''}</td>${X.ant?`<td class="nr num">${nc(a)}</td><td class="nr num ${a&&o.tot<a?'t-crit':a?'t-ok':''}">${vr(o.tot,a)}</td>`:''}</tr>`; });
  const tab=`<section class="card pano-t"><div class="pano-tw"><table class="anl-t pano-tb"><thead><tr><th>${A.ver==='linha'?'Linha':'Produto'}</th>${PANO_M.map(m=>`<th class="nr">${m}</th>`).join('')}<th class="nr">Total</th><th class="nr">%</th>${X.ant?`<th class="nr">${A.ano-1}</th><th class="nr">Var.</th>`:''}</tr></thead>
    <tbody>${corpo||`<tr><td colspan="${15+(X.ant?2:0)}"><div class="empty">Nada produzido com esses filtros.</div></td></tr>`}</tbody>
    <tfoot><tr><th scope="row">Total</th>${X.mes.map(v=>`<td class="nr num">${nc(v)}</td>`).join('')}<td class="nr num"><b>${panoN(A,X.tot)}</b></td><td class="nr num">100%</td>${X.ant?`<td class="nr num">${panoN(A,totAnt)}</td><td class="nr num">${vr(X.tot,totAnt)}</td>`:''}</tr></tfoot></table></div>
    ${X.rows.length>lim?`<button class="lnk" data-act="pano-tudo" style="margin-top:8px">Mostrar todos (${X.rows.length})</button>`:''}</section>`;
  return cab+filtros+kp+avisos+`<section class="card"><div class="pano-gh2"><h2>Mês a mês · ${A.ano}</h2>${X.ant?`<span class="pano-lg"><i class="a"></i>${A.ano} <i class="b"></i>${A.ano-1}</span>`:''}</div>${panoGraf(A,X)}</section>`+tab; }
/* ---------- Excel e PDF ---------- */
function panoLinhas(){ const A=S.pano, X=panoDados(); if(!X.rows) return null; const head=[A.ver==='linha'?'Linha':A.ver==='linprod'?'Linha':'Produto'].concat(A.ver==='linprod'?['Produto']:[]).concat(A.ver==='produto'?['Linhas']:[]).concat(PANO_M,['Total','%']).concat(X.ant?[String(A.ano-1),'Variação %']:[]);
  const num=v=>A.med==='t'?Math.round(v*10)/10:Math.round(v);
  const rows=X.rows.map(o=>{ const a=X.antK?X.antK[o.k]||0:null; return [A.ver==='linprod'?o.l:o.k].concat(A.ver==='linprod'?[o.p]:[]).concat(A.ver==='produto'?[(o.ls||[]).join(', ')]:[]).concat(o.m.map(num),[num(o.tot),X.tot?Math.round(o.tot/X.tot*1000)/10:0]).concat(X.ant?[num(a),a?Math.round((o.tot-a)/a*1000)/10:'']:[]); });
  const tot=['Total'].concat(A.ver!=='linha'&&A.ver!=='produto'?['']:[]).concat(A.ver==='produto'?['']:[]).concat(X.mes.map(num),[num(X.tot),100]).concat(X.ant?[num(X.ant.tot),X.ant.tot?Math.round((X.tot-X.ant.tot)/X.ant.tot*1000)/10:'']:[]);
  return {A,X,head,rows,tot}; }
function panoDesc(A){ return 'Produção '+(A.med==='t'?'em toneladas':'em sacos')+' · '+A.ano+' · '+(A.fonte==='focco'?'Extrato do Focco':'apontamentos do painel')+(A.ls.length?' · '+A.ls.join(', '):' · todas as linhas')+(A.q?' · produto com "'+A.q+'"':''); }
/* 27/10 ("o excel está muito básico"): Excel com cores (ExcelJS, como o "O que precisa produzir"): Resumo (os números do PDF,
   mês a mês, participação na fábrica, como foi contado) · Detalhe (produto/linha × mês, sacos e toneladas, totais com fórmula,
   filtro e painéis congelados) · Por linha (todas as linhas da fábrica, mês a mês). Sem ExcelJS cai na planilha simples. */
async function panoXlsSimples(){ const L=panoLinhas(); if(!L) return; try{ await carregarScript(ANL_XLSX); }catch(e){} if(!window.XLSX){ toast('Não foi possível carregar o gerador de Excel.'); return; }
  const XL=window.XLSX, ws=XL.utils.aoa_to_sheet([[panoDesc(L.A)],[],L.head].concat(L.rows,[L.tot])); ws['!cols']=L.head.map((h,i)=>({wch:i===0?(L.A.ver==='linha'?14:44):i===1&&L.A.ver!=='linha'?24:10}));
  const wb=XL.utils.book_new(); XL.utils.book_append_sheet(wb,ws,'Produção '+L.A.ano); XL.writeFile(wb,'Producao-'+L.A.ano+(L.A.ls.length?'-'+L.A.ls.join('-').replace(/\s+/g,''):'')+'.xlsx'); toast('Excel baixado.'); }
/* 27/10 (2º pedido "ainda dá para melhorar o layout"): gráficos desenhados em canvas e colados como imagem no Excel */
/* logo da Lys em branco (a original é azul-escura e some na faixa azul) — Excel e PDF */
async function panoLysBranca(img){ if(!img||!img.lys) return null; if(img._lysB!==undefined) return img._lysB; try{ img._lysB=await new Promise(res=>{ const im=new Image(); im.onload=()=>{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d'); g.drawImage(im,0,0); g.globalCompositeOperation='source-in'; g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); res(c.toDataURL('image/png')); }; im.onerror=()=>res(null); im.src=img.lys.d; }); }catch(e){ img._lysB=null; } return img._lysB; }
function panoCanvas(w,h,fn){ const k=2, c=document.createElement('canvas'); c.width=w*k; c.height=h*k; const g=c.getContext('2d'); g.scale(k,k); g.fillStyle='#fff'; g.fillRect(0,0,w,h); g.font='12px Arial'; fn(g); return c.toDataURL('image/png'); }
function panoPngMes(o){ /* o: {meses, v, ant, melhor, andamento, n} */ const W=1100,H=300; return panoCanvas(W,H,g=>{
  const x0=60,x1=W-20,y0=H-40,yt=24, mx=Math.max(1,...o.v.slice(0,o.n),...(o.ant?o.ant.slice(0,o.n):[0])), passo=Math.pow(10,Math.floor(Math.log10(mx))), top=Math.ceil(mx/passo*1.12)*passo, Y=v=>y0-(y0-yt)*v/top, bw=(x1-x0)/12;
  g.strokeStyle='#E3E8EC'; g.fillStyle='#5E6E77'; g.textAlign='right'; g.lineWidth=1;
  for(let i=0;i<=4;i++){ const v=top*i/4, y=Math.round(Y(v))+.5; g.beginPath(); g.moveTo(x0,y); g.lineTo(x1,y); g.stroke(); g.fillText(Math.round(v).toLocaleString('pt-BR'),x0-8,y+4); }
  o.v.forEach((v,i)=>{ const cx=x0+bw*i; if(i<o.n){ if(o.ant){ const a=o.ant[i]||0; g.fillStyle='#C9D3DA'; g.fillRect(cx+bw*.14,Y(a),bw*.3,y0-Y(a)); }
      const bx=o.ant?cx+bw*.46:cx+bw*.18, bww=o.ant?bw*.4:bw*.64; g.fillStyle=o.melhor===i?'#3C8A63':o.andamento===i?'#8CB2BE':'#1B5168'; if(v>0) g.fillRect(bx,Y(v),bww,y0-Y(v));
      if(v>0){ g.fillStyle='#143F54'; g.font='bold 12px Arial'; g.textAlign='center'; g.fillText(Math.round(v).toLocaleString('pt-BR'),bx+bww/2,Y(v)-6); } }
    g.font='12px Arial'; g.textAlign='center'; g.fillStyle=i<o.n?'#143F54':'#C9D3DA'; g.fillText(o.meses[i],cx+bw/2,y0+18); });
  g.strokeStyle='#5E6E77'; g.beginPath(); g.moveTo(x0,y0+.5); g.lineTo(x1,y0+.5); g.stroke();
  let lx=x0; const leg=(c,t)=>{ g.fillStyle=c; g.fillRect(lx,H-14,12,9); g.fillStyle='#5E6E77'; g.textAlign='left'; g.font='11px Arial'; g.fillText(t,lx+16,H-6); lx+=g.measureText(t).width+34; };
  leg('#1B5168',String(o.ano)); if(o.melhor!=null) leg('#3C8A63','melhor mês'); if(o.andamento!=null) leg('#8CB2BE',o.meses[o.andamento]+' em andamento'); if(o.ant) leg('#C9D3DA',String(o.ano-1)); }); }
function panoPngPart(bars,tot,sel){ const W=560,H=Math.max(38,bars.length*38); return panoCanvas(W,H,g=>{
  const lw=110, bx=lw, bwM=W-lw-150, mx=Math.max(1,...bars.map(b=>b.v));
  bars.forEach((b,i)=>{ const y=i*38+5, on=sel.includes(b.k); g.fillStyle=on?'#143F54':'#2B3A42'; g.font=(on?'bold ':'')+'13px Arial'; g.textAlign='left'; g.fillText(b.k,4,y+18);
    g.fillStyle='#EEF2F4'; g.fillRect(bx,y+6,bwM,16); g.fillStyle=on?'#E3312D':(sel.length?'#AEBBC3':'#1B5168'); g.fillRect(bx,y+6,Math.max(2,bwM*b.v/mx),16);
    g.fillStyle='#143F54'; g.font='bold 13px Arial'; g.textAlign='right'; g.fillText((tot?Math.round(b.v/tot*1000)/10:0).toLocaleString('pt-BR')+'%',W-6,y+18);
    g.fillStyle='#5E6E77'; g.font='11px Arial'; g.fillText(Math.round(b.v).toLocaleString('pt-BR')+' sc',W-62,y+18); }); }); }
async function panoXls(){ toast('Montando o Excel…'); const D=await panoPdfDados(); if(!D){ toast('Os dados ainda estão carregando. Tente de novo em alguns segundos.'); return; }
  try{ await carregarScript(typeof ESW_EXCELJS!=='undefined'?ESW_EXCELJS:'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'); }catch(e){}
  const XJ=window.ExcelJS; if(!XJ){ return panoXlsSimples(); }
  let img=null; try{ img=await gpImgs(); }catch(e){}
  const {A,X,Sc,Tn,Fb,FbT}=D, anoH=+hojeStr().slice(0,4), hm=A.ano===anoH?+hojeStr().slice(5,7)-1:11, nM=hm+1, MC=i=>PANO_M[i].replace(/^./,c=>c.toUpperCase());
  const andamento=A.ano===anoH&&hojeStr()<A.ano+'-'+String(hm+1).padStart(2,'0')+'-'+String(new Date(A.ano,hm+1,0).getDate()).padStart(2,'0');
  const fech=Sc.mes.slice(0,andamento?hm:nM).map((v,i)=>({i,v})).filter(o=>o.v>0), media=fech.length?fech.reduce((a,o)=>a+o.v,0)/fech.length:0;
  const melhor=fech.length?fech.reduce((b,o)=>o.v>b.v?o:b):null, pior=fech.length?fech.reduce((b,o)=>o.v<b.v?o:b):null, filtrado=!!(A.ls.length||A.q);
  const ant=X.ant&&A.med==='sc'?X.ant:null, tK={}; (Tn.rows||[]).forEach(o=>tK[o.k]=o.tot); const tF={}; (FbT.rows||[]).forEach(o=>tF[o.k]=o.tot);
  const r1=v=>Math.round(v), r10=v=>Math.round(v*10)/10, fN=v=>Math.round(v).toLocaleString('pt-BR');
  const escopo=(A.ls.length?A.ls.join(', '):'Todas as linhas')+(A.q?' · produto "'+A.q+'"':'');
  const fonteTxt=A.fonte==='focco'?'Extrato do Focco (EPP). Linha = a da ordem de produção no painel; sem a ordem, a do item (Ajustes › Itens ou Focco). Só entra o que tem linha certa.':'Apontamentos lançados no painel.';
  const per='Janeiro a '+PANO_M[hm]+' de '+A.ano+(andamento?' ('+PANO_M[hm]+' até '+hojeStr().slice(8,10)+'/'+hojeStr().slice(5,7)+')':'');
  const emit='Emitido em '+new Date().toLocaleDateString('pt-BR')+' às '+hora(new Date().toISOString())+' · Painel Colafix';
  const wb=new XJ.Workbook(); wb.creator='Painel Colafix'; try{ wb.calcProperties.fullCalcOnLoad=true; }catch(e){}
  const PET='FF143F54', PET2='FF1B5168', TINT='FFE2ECF1', SOFT='FFF4F6F8', MUT='FF5E6E77', RED='FFE3312D', OK='FF3C8A63', LIN='FFE3E8EC', FNT='Calibri';
  const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}), linhaB={bottom:{style:'thin',color:{argb:LIN}}};
  const fnt=(o)=>Object.assign({name:FNT,size:10,color:{argb:'FF2B3A42'}},o||{});
  const logoId=img&&img.escuro?wb.addImage({base64:img.escuro.d,extension:'png'}):null;
  /* logo da Lys em branco, para aparecer sobre a faixa azul */
  const lysB=await panoLysBranca(img);
  const lysId=lysB?wb.addImage({base64:lysB,extension:'png'}):null;
  const col=n=>{ let s=''; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; };
  /* faixa: linha 1 = as duas logos (Colafix à esquerda, Lys à direita), linha 2 = título e subtítulo — sem texto por baixo das logos */
  const faixa=(ws,n,titulo,sub)=>{ ws.mergeCells(1,1,1,n); ws.mergeCells(2,1,2,n); ws.getRow(1).height=logoId!=null||lysId!=null?40:6; ws.getRow(2).height=40; ws.getRow(3).height=8;
    ws.getCell(1,1).fill=fill(PET); const c=ws.getCell(2,1); c.fill=fill(PET); c.alignment={vertical:'middle',indent:1,wrapText:true};
    c.value={richText:[{text:titulo+'\n',font:fnt({bold:true,size:15,color:{argb:'FFFFFFFF'}})},{text:sub,font:fnt({size:9,color:{argb:'FFC7D7E0'}})}]};
    if(logoId!=null){ const lw=118, lh=img.escuro.h/img.escuro.w*lw; ws.addImage(logoId,{tl:{col:0.15,row:0.18},ext:{width:lw*Math.min(1,38/lh),height:Math.min(lh,38)}}); }
    if(lysId!=null){ const lh=36, lw=Math.min(90,img.lys.w/img.lys.h*lh), wd=ws.columns.map(c=>(c.width||9)*7.3), alvo=Math.max(0,wd.reduce((a,b)=>a+b,0)-lw-14); let px=0, ci=0; while(ci<wd.length-1&&px+wd[ci]<=alvo){ px+=wd[ci]; ci++; } ws.addImage(lysId,{tl:{col:ci+(alvo-px)/wd[ci],row:0.12},ext:{width:lw,height:lh}}); } };
  const secao=(ws,row,n,txt,a)=>{ ws.mergeCells(row,a||1,row,n); const c=ws.getCell(row,a||1); c.value=txt.toUpperCase(); c.font=fnt({bold:true,size:11,color:{argb:PET}}); c.border={bottom:{style:'medium',color:{argb:RED}}}; c.alignment={vertical:'bottom'}; ws.getRow(row).height=24; };
  const cab=(ws,row,vals,dir,c0)=>{ const r=ws.getRow(row); vals.forEach((v,i)=>{ const c=r.getCell((c0||1)+i); c.value=v; c.font=fnt({bold:true,size:9,color:{argb:'FFFFFFFF'}}); c.fill=fill(PET2); c.alignment={vertical:'middle',horizontal:i>=dir?'right':'left',wrapText:true,indent:i<dir?1:0}; }); r.height=22; };
  /* ===================== Resumo ===================== */
  const NC=14; const rs=wb.addWorksheet('Resumo',{views:[{showGridLines:false}],properties:{tabColor:{argb:PET}}}); rs.columns=Array(NC).fill(0).map(()=>({width:11.5}));
  faixa(rs,NC,'PRODUÇÃO '+A.ano+' · '+escopo.toUpperCase(),per+' · '+(A.fonte==='focco'?'Extrato do Focco':'apontamentos do painel')+' · '+emit);
  /* quadros */
  const K=[['PRODUZIDO NO ANO',r1(Sc.tot),'#,##0','sacos',PET2],['EM TONELADAS',r10(Tn.tot),'#,##0.0','toneladas',PET2],['MÉDIA POR MÊS',r1(media),'#,##0','sacos · '+fech.length+(fech.length===1?' mês fechado':' meses fechados'),PET2],
    ['MELHOR MÊS',melhor?MC(melhor.i):'—',null,melhor?fN(melhor.v)+' sacos':'',OK],['MÊS MAIS FRACO',pior?MC(pior.i):'—',null,pior?fN(pior.v)+' sacos':'','FFAD8432']];
  if(filtrado&&Fb.tot) K.push(['DA FÁBRICA',Sc.tot/Fb.tot,'0.0%','de '+fN(Fb.tot)+' sacos',RED]); else K.push(['ITENS',X.rows.length,'0',A.ver==='linha'?'linhas com produção':'produtos com produção',PET2]);
  if(ant&&ant.tot) K.push(['COMPARADO A '+(A.ano-1),(Sc.tot-ant.tot)/ant.tot,'+0%;-0%;0%',fN(ant.tot)+' sacos em '+(A.ano-1),Sc.tot>=ant.tot?OK:RED]);
  rs.getRow(4).height=20; rs.getRow(5).height=34; rs.getRow(6).height=20;
  K.forEach((k,i)=>{ const c0=1+i*2; [4,5,6].forEach(r=>rs.mergeCells(r,c0,r,c0+1));
    for(let r=4;r<=6;r++) for(let c=c0;c<=c0+1;c++){ const x=rs.getCell(r,c); x.fill=fill(SOFT); x.border={left:c===c0?{style:'thick',color:{argb:k[4]}}:undefined,bottom:r===6?{style:'thin',color:{argb:LIN}}:undefined,top:r===4?{style:'thin',color:{argb:LIN}}:undefined}; }
    const l=rs.getCell(4,c0); l.value=k[0]; l.font=fnt({bold:true,size:8,color:{argb:MUT}}); l.alignment={vertical:'bottom',indent:1};
    const v=rs.getCell(5,c0); v.value=k[1]; if(k[2]) v.numFmt=k[2]; v.font=fnt({bold:true,size:18,color:{argb:PET}}); v.alignment={vertical:'middle',horizontal:'left',indent:1};
    const n=rs.getCell(6,c0); n.value=k[3]; n.font=fnt({size:8,color:{argb:MUT}}); n.alignment={vertical:'top',indent:1,wrapText:true}; });
  /* gráfico mês a mês */
  let y=8; secao(rs,y,NC,'Produção mês a mês (sacos)'); y++;
  const gMes=wb.addImage({base64:panoPngMes({meses:PANO_M,v:Sc.mes,ant:ant?ant.mes:null,n:nM,melhor:melhor?melhor.i:null,andamento:andamento?hm:null,ano:A.ano}),extension:'png'});
  rs.addImage(gMes,{tl:{col:0.1,row:y-1+0.3},ext:{width:1050,height:286}}); for(let r=y;r<y+15;r++) rs.getRow(r).height=15; y+=16;
  /* tabela mês a mês */
  secao(rs,y,NC,'Mês a mês'); y++;
  cab(rs,y,['']. concat(Array.from({length:nM},(_,i)=>MC(i)),['Total']),1); y++;
  const linhasMes=[['Sacos',Sc.mes,'#,##0',true,true],['Toneladas',Tn.mes,'#,##0.0',true,false]];
  if(filtrado) linhasMes.push(['% da fábrica',Sc.mes.map((v,i)=>Fb.mes[i]?v/Fb.mes[i]:null),'0.0%',false,false]);
  if(ant) linhasMes.push([String(A.ano-1),ant.mes,'#,##0',true,false]);
  linhasMes.forEach((L,j)=>{ const r=rs.getRow(y); r.height=19; const a=r.getCell(1); a.value=L[0]; a.font=fnt({bold:true,color:{argb:PET}}); a.alignment={indent:1,vertical:'middle'};
    for(let i=0;i<nM;i++){ const c=r.getCell(2+i); const v=L[1][i]; c.value=!v?null:(L[2]==='0.0%'?v:(L[2]==='#,##0'?r1(v):r10(v))); c.numFmt=L[2]==='0.0%'?L[2]:L[2]+';-'+L[2]+';"–"'; c.alignment={vertical:'middle'}; c.font=fnt(); c.alignment={vertical:'middle'}; }
    const t=r.getCell(2+nM); if(L[3]) t.value={formula:'SUM('+col(2)+y+':'+col(1+nM)+y+')'}; else t.value=Fb.tot?Sc.tot/Fb.tot:null; t.numFmt=L[2]; t.font=fnt({bold:true,color:{argb:PET}}); t.fill=fill(TINT); t.alignment={vertical:'middle'};
    for(let c=1;c<=nM+1;c++){ r.getCell(c).border=linhaB; if(j%2&&!L[4]) r.getCell(c).fill=fill(SOFT); }
    if(L[4]) rs.addConditionalFormatting({ref:col(2)+y+':'+col(1+nM)+y,rules:[{type:'colorScale',cfvo:[{type:'min'},{type:'max'}],color:[{argb:'FFF4F8FA'},{argb:'FF9CC2D1'}]}]});
    if(L[4]&&melhor) r.getCell(2+melhor.i).font=fnt({bold:true,color:{argb:OK}}); y++; });
  /* participação na fábrica */
  y++; rs.getRow(y).addPageBreak&&rs.getRow(y-1).addPageBreak(); secao(rs,y,NC,'Participação na fábrica (todas as linhas)'); y++;
  const LO=linhasOrd(), ix=l=>{ const i=LO.indexOf(l); return i<0?999:i; };
  const bars=(Fb.rows||[]).filter(o=>o.k&&o.k!=='—'&&!/\s\/\s/.test(o.k)).sort((a,b)=>ix(a.k)-ix(b.k)).map(o=>({k:o.k,v:o.tot,m:o.m}));
  const yPt=y; cab(rs,y,['Linha','','Sacos','Toneladas','% da fábrica'],2); rs.mergeCells(y,1,y,2); y++;
  bars.forEach((b,j)=>{ const r=rs.getRow(y); r.height=28.5; rs.mergeCells(y,1,y,2); const sel=A.ls.includes(b.k);
    r.getCell(1).value=b.k; r.getCell(3).value=r1(b.v); r.getCell(4).value=tF[b.k]||0; r.getCell(5).value=Fb.tot?b.v/Fb.tot:0;
    r.getCell(3).numFmt='#,##0'; r.getCell(4).numFmt='#,##0.0'; r.getCell(5).numFmt='0.0%';
    for(let c=1;c<=5;c++){ const x=r.getCell(c); x.border=linhaB; x.font=fnt(sel?{bold:true,color:{argb:RED}}:{}); x.alignment={vertical:'middle',indent:c===1?1:0}; if(j%2) x.fill=fill(SOFT); } y++; });
  { const r=rs.getRow(y); r.height=20; rs.mergeCells(y,1,y,2); r.getCell(1).value='Fábrica (total)'; r.getCell(3).value=r1(Fb.tot); r.getCell(4).value=FbT.tot; r.getCell(5).value=1;
    r.getCell(3).numFmt='#,##0'; r.getCell(4).numFmt='#,##0.0'; r.getCell(5).numFmt='0.0%'; for(let c=1;c<=5;c++){ const x=r.getCell(c); x.font=fnt({bold:true,color:{argb:PET}}); x.fill=fill(TINT); x.alignment={vertical:'middle',indent:c===1?1:0}; x.border={top:{style:'medium',color:{argb:PET}}}; } y++; }
  const gPt=wb.addImage({base64:panoPngPart(bars,Fb.tot,A.ls),extension:'png'}); rs.addImage(gPt,{tl:{col:6.3,row:yPt},ext:{width:560,height:Math.max(38,bars.length*38)}}); y++; rs.getCell(y,1).value='O total da fábrica inclui itens feitos em mais de uma linha sem como separar; por isso as linhas podem não somar 100%.'; rs.getCell(y,1).font=fnt({italic:true,size:8,color:{argb:MUT}}); y+=2;
  secao(rs,y,NC,'Como foi contado'); y++;
  [fonteTxt,'Toneladas = sacos × peso do saco (do nome do produto).','Média, melhor e mais fraco mês: só os meses já fechados'+(andamento?' ('+PANO_M[hm]+' ainda em andamento).':'.')].forEach(t=>{ rs.mergeCells(y,1,y,NC); const c=rs.getCell(y,1); c.value='•  '+t; c.alignment={wrapText:true,vertical:'middle',indent:1}; c.font=fnt({size:9,color:{argb:MUT}}); rs.getRow(y).height=t.length>140?28:16; y++; });
  /* ===================== Detalhe ===================== */
  const verL=A.ver==='linha', colLin=A.ver==='produto'&&A.ls.length!==1;
  const head=[verL?'Linha':'Produto'].concat(A.ver==='linprod'?['Linha']:[]).concat(colLin?['Linhas']:[]).concat(Array.from({length:nM},(_,i)=>MC(i)),['Total sacos','Total t','% do total']).concat(ant?[String(A.ano-1),'Variação']:[]);
  const nF=head.length-nM-3-(ant?2:0), cM=nF+1, cT=nF+nM+1, cTt=cT+1, cP=cT+2, cA=cT+3, cV=cT+4;
  const ws=wb.addWorksheet('Detalhe',{views:[{state:'frozen',xSplit:nF,ySplit:4,showGridLines:false}],properties:{tabColor:{argb:PET2}}});
  ws.columns=head.map((h,i)=>({width:i===0?(verL?18:44):i<nF?16:i>=cT-1?13:9.5}));
  faixa(ws,head.length,'DETALHE '+(verL?'POR LINHA':A.ver==='linprod'?'POR LINHA E PRODUTO':'POR PRODUTO')+' · '+A.ano+' · '+escopo.toUpperCase(),per+' · '+emit);
  cab(ws,4,head,nF); ws.getRow(4).height=26; ws.autoFilter={from:{row:4,column:1},to:{row:4,column:head.length}};
  let ri=5; const first=5;
  (Sc.rows||[]).forEach((o,j)=>{ const r=ws.getRow(ri); r.height=18; const nm=A.ver==='linprod'?o.p:o.k; const vals=[nm].concat(A.ver==='linprod'?[o.l]:[]).concat(colLin?[(o.ls||[]).join(', ')]:[]);
    vals.forEach((v,i)=>{ const c=r.getCell(i+1); c.value=v; c.font=fnt(i===0?{color:{argb:PET}}:{color:{argb:MUT}}); c.alignment={vertical:'middle',indent:i===0?1:0}; });
    for(let i=0;i<nM;i++){ const c=r.getCell(cM+i); c.value=o.m[i]?r1(o.m[i]):null; c.numFmt='#,##0;-#,##0;"–"'; c.font=fnt(); c.alignment={vertical:'middle'}; }
    const t=r.getCell(cT); t.value={formula:'SUM('+col(cM)+ri+':'+col(cM+nM-1)+ri+')',result:r1(o.tot)}; t.numFmt='#,##0'; t.font=fnt({bold:true,color:{argb:PET}}); t.fill=fill(TINT);
    const tt=r.getCell(cTt); tt.value=tK[o.k]||0; tt.numFmt='#,##0.0'; tt.font=fnt();
    r.getCell(cP).numFmt='0.0%'; r.getCell(cP).font=fnt();
    if(ant){ const a=X.antK?X.antK[o.k]||0:0; r.getCell(cA).value=a?r1(a):null; r.getCell(cA).numFmt='#,##0'; r.getCell(cA).font=fnt({color:{argb:MUT}}); r.getCell(cV).value=a?{formula:'IF('+col(cA)+ri+'>0,'+col(cT)+ri+'/'+col(cA)+ri+'-1,"")'}:null; r.getCell(cV).numFmt='+0%;-0%;0%'; r.getCell(cV).font=fnt({bold:true}); }
    for(let c=1;c<=head.length;c++){ const k=r.getCell(c); k.border=linhaB; } ri++; });
  const last=Math.max(first,ri-1), tr=ws.getRow(ri); tr.height=22;
  tr.getCell(1).value='Total'; for(let i=0;i<nM+2;i++){ const cc=cM+i, c=tr.getCell(cc); c.value={formula:'SUBTOTAL(9,'+col(cc)+first+':'+col(cc)+last+')'}; c.numFmt=cc===cTt?'#,##0.0':'#,##0;-#,##0;"–"'; }
  tr.getCell(cP).value=1; tr.getCell(cP).numFmt='0.0%'; if(ant){ tr.getCell(cA).value={formula:'SUBTOTAL(9,'+col(cA)+first+':'+col(cA)+last+')'}; tr.getCell(cA).numFmt='#,##0'; tr.getCell(cV).value={formula:'IF('+col(cA)+ri+'>0,'+col(cT)+ri+'/'+col(cA)+ri+'-1,"")'}; tr.getCell(cV).numFmt='+0%;-0%;0%'; }
  for(let c=1;c<=head.length;c++){ const k=tr.getCell(c); k.font=fnt({bold:true,color:{argb:'FFFFFFFF'}}); k.fill=fill(PET); k.alignment={vertical:'middle',indent:c===1?1:0}; }
  for(let r=first;r<=last;r++){ ws.getRow(r).getCell(cP).value={formula:col(cT)+r+'/'+col(cT)+'$'+ri}; }
  if(last>=first&&(Sc.rows||[]).length){ ws.addConditionalFormatting({ref:col(cM)+first+':'+col(cM+nM-1)+last,rules:[{type:'colorScale',cfvo:[{type:'min'},{type:'max'}],color:[{argb:'FFFFFFFF'},{argb:'FF9CC2D1'}]}]});
    ws.addConditionalFormatting({ref:col(cP)+first+':'+col(cP)+last,rules:[{type:'dataBar',minLength:0,maxLength:100,cfvo:[{type:'num',value:0},{type:'max'}],color:{argb:'FF7FA9BA'}}]});
    if(ant) ws.addConditionalFormatting({ref:col(cV)+first+':'+col(cV)+last,rules:[{type:'cellIs',operator:'lessThan',formulae:['0'],style:{font:{color:{argb:'FFB5473F'},bold:true}}},{type:'cellIs',operator:'greaterThan',formulae:['0'],style:{font:{color:{argb:'FF2F6E4F'},bold:true}}}]}); }
  ws.getCell(ri+2,1).value='Cor dos meses: quanto mais escuro, mais produziu. '+fonteTxt; ws.getCell(ri+2,1).font=fnt({italic:true,size:8,color:{argb:MUT}});
  /* ===================== Por linha ===================== */
  const wl=wb.addWorksheet('Por linha',{views:[{state:'frozen',xSplit:1,ySplit:4,showGridLines:false}],properties:{tabColor:{argb:RED}}});
  const hL=['Linha'].concat(Array.from({length:nM},(_,i)=>MC(i)),['Total sacos','Total t','% da fábrica']); wl.columns=hL.map((h,i)=>({width:i===0?32:i>nM?13:9.5}));
  faixa(wl,hL.length,'TODAS AS LINHAS DA FÁBRICA · '+A.ano+' · MÊS A MÊS',per+' · '+emit); cab(wl,4,hL,1); wl.getRow(4).height=26;
  let rl=5; const lf=rl;
  bars.forEach(o=>{ const r=wl.getRow(rl); r.height=19; const sel=A.ls.includes(o.k); r.getCell(1).value=o.k; r.getCell(1).alignment={indent:1,vertical:'middle'};
    for(let i=0;i<nM;i++){ const c=r.getCell(2+i); c.value=o.m[i]?r1(o.m[i]):null; c.numFmt='#,##0;-#,##0;"–"'; }
    r.getCell(nM+2).value={formula:'SUM(B'+rl+':'+col(nM+1)+rl+')'}; r.getCell(nM+2).numFmt='#,##0'; r.getCell(nM+2).fill=fill(TINT);
    r.getCell(nM+3).value=tF[o.k]||0; r.getCell(nM+3).numFmt='#,##0.0'; r.getCell(nM+4).value=Fb.tot?o.v/Fb.tot:0; r.getCell(nM+4).numFmt='0.0%';
    for(let c=1;c<=hL.length;c++){ const k=r.getCell(c); k.border=linhaB; k.font=fnt(sel?{bold:true,color:{argb:RED}}:(c===1||c===nM+2?{bold:c===nM+2,color:{argb:PET}}:{})); if(c>1) k.alignment={vertical:'middle'}; } rl++; });
  const ll=rl-1;
  const outros=Fb.mes.map((v,i)=>v-bars.reduce((a,o)=>a+(o.m[i]||0),0)); if(outros.some(v=>v>0.5)){ const r=wl.getRow(rl); r.height=19; r.getCell(1).value='Mais de uma linha (sem separar)'; r.getCell(1).font=fnt({italic:true,color:{argb:MUT}}); r.getCell(1).alignment={indent:1};
    for(let i=0;i<nM;i++){ const c=r.getCell(2+i); c.value=outros[i]>0.5?r1(outros[i]):null; c.numFmt='#,##0;-#,##0;"–"'; c.font=fnt({italic:true,color:{argb:MUT}}); } r.getCell(nM+2).value={formula:'SUM(B'+rl+':'+col(nM+1)+rl+')'}; r.getCell(nM+2).numFmt='#,##0'; r.getCell(nM+2).font=fnt({italic:true,color:{argb:MUT}}); rl++; }
  { const r=wl.getRow(rl); r.height=22; r.getCell(1).value='Fábrica (total)'; r.getCell(1).alignment={indent:1,vertical:'middle'}; for(let i=0;i<nM+1;i++){ const cc=2+i, c=r.getCell(cc); c.value={formula:'SUM('+col(cc)+lf+':'+col(cc)+(rl-1)+')'}; c.numFmt='#,##0'; } r.getCell(nM+3).value=FbT.tot; r.getCell(nM+3).numFmt='#,##0.0'; r.getCell(nM+4).value=1; r.getCell(nM+4).numFmt='0.0%';
    for(let c=1;c<=hL.length;c++){ const k=r.getCell(c); k.font=fnt({bold:true,color:{argb:'FFFFFFFF'}}); k.fill=fill(PET); if(c>1) k.alignment={vertical:'middle'}; } }
  if(ll>=lf){ wl.addConditionalFormatting({ref:'B'+lf+':'+col(nM+1)+ll,rules:[{type:'colorScale',cfvo:[{type:'min'},{type:'max'}],color:[{argb:'FFFFFFFF'},{argb:'FF9CC2D1'}]}]});
    wl.addConditionalFormatting({ref:col(nM+4)+lf+':'+col(nM+4)+ll,rules:[{type:'dataBar',minLength:0,maxLength:100,cfvo:[{type:'num',value:0},{type:'max'}],color:{argb:'FF7FA9BA'}}]}); }
  /* impressão */
  [rs,ws,wl].forEach(s=>{ s.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:.35,right:.35,top:.45,bottom:.5,header:.2,footer:.2}}; s.headerFooter={oddFooter:'&L&8Painel Colafix · '+escopo+'&R&8Página &P de &N'}; });
  ws.pageSetup.printTitlesRow='4:4'; wl.pageSetup.printTitlesRow='4:4';
  const nome='Producao-'+A.ano+(A.ls.length?'-'+A.ls.join('-').replace(/\s+/g,''):'')+'.xlsx';
  const buf=await wb.xlsx.writeBuffer(); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); a.download=nome; document.body.appendChild(a); a.click(); a.remove(); toast('Excel baixado: '+nome); }
/* PDF para a diretoria (27/10, "preciso enviar para os chefes"): página 1 = resumo (sacos, toneladas, média, melhor e pior
   mês, participação na fábrica), gráfico mês a mês e quadro mês a mês; depois a tabela por produto/linha com toneladas.
   Só os meses até o mês atual. Itens sem linha definida não aparecem por nome (só somam no total da fábrica). */
/* 27/10 ("pode deixar só o concreto"): o PDF mostra só a produção com linha certa; os itens sem linha não aparecem (false volta a página à parte) */
const PANO_SO_CERTO=true;
async function panoPdfDados(){ const A=S.pano, f=panoF(A), P=panoPer(A.ano); try{ await praEsp(f,P.de,P.ate); if(A.comp){ const Q=panoPer(A.ano-1); await praEsp(f,Q.de,Q.ate); } }catch(e){}
  const mat=o=>{ for(let i=0;i<3;i++){ const X=panoMat(Object.assign({},A,o),A.ano); if(!X.carregando) return X; } return null; };
  const X=panoDados(); if(!X||!X.rows) return null;
  const Sc=mat({med:'sc'}), Tn=mat({med:'t'}), Fb=mat({med:'sc',ls:[],q:'',ver:'linha'}), FbT=mat({med:'t',ls:[],q:'',ver:'linha'});
  if(!Sc||!Tn||!Fb||!FbT) return null; return {A,X,Sc,Tn,Fb,FbT}; }
async function panoPdf(){ toast('Montando o PDF…'); const D=await panoPdfDados(); if(!D){ toast('Os dados ainda estão carregando. Tente de novo em alguns segundos.'); return; }
  try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }catch(e){}
  const J=window.jspdf&&window.jspdf.jsPDF; if(!J){ toast('O gerador de PDF não carregou. Confira a internet e tente de novo.'); return; }
  const {A,X,Sc,Tn,Fb,FbT}=D, img=await gpImgs(), Co=GPDF.cor, doc=new J({unit:'mm',format:'a4',orientation:'landscape'}), PW=297, PH=210, M=10;
  const fc=c=>doc.setFillColor(c[0],c[1],c[2]), tc=c=>doc.setTextColor(c[0],c[1],c[2]), dc=c=>doc.setDrawColor(c[0],c[1],c[2]);
  const fit=(t,w)=>{ t=String(t==null?'':t); if(doc.getTextWidth(t)<=w) return t; while(t.length>1&&doc.getTextWidth(t+'…')>w) t=t.slice(0,-1); return t+'…'; };
  const nS=v=>Math.round(v).toLocaleString('pt-BR'), nT=v=>(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}), pc=(a,b)=>b?(Math.round(a/b*1000)/10).toLocaleString('pt-BR')+'%':'—';
  const anoH=+hojeStr().slice(0,4), hm=A.ano===anoH?+hojeStr().slice(5,7)-1:11, nM=hm+1, MS=PANO_M.slice(0,nM);
  const andamento=A.ano===anoH&&hojeStr()<A.ano+'-'+String(hm+1).padStart(2,'0')+'-'+String(new Date(A.ano,hm+1,0).getDate()).padStart(2,'0');
  const fech=Sc.mes.slice(0,andamento?hm:nM).map((v,i)=>({i,v})), fechP=fech.filter(o=>o.v>0);
  const media=fechP.length?fechP.reduce((a,o)=>a+o.v,0)/fechP.length:0, melhor=fechP.length?fechP.reduce((b,o)=>o.v>b.v?o:b):null, pior=fechP.length?fechP.reduce((b,o)=>o.v<b.v?o:b):null;
  const filtrado=!!(A.ls.length||A.q), nomeSel=A.ls.length?A.ls.join(' + '):A.q?'Produto "'+A.q+'"':'Fábrica', MC=n=>PANO_M[n].replace(/^./,c=>c.toUpperCase());
  const titulo='Produção '+A.ano+' · '+(A.ls.length?A.ls.join(', '):'todas as linhas')+(A.q?' · produto "'+A.q+'"':'');
  /* cabeçalho */
  const lysPdf=await panoLysBranca(img), lyW=lysPdf?12*img.lys.w/img.lys.h:0, xR=PW-M-(lysPdf?lyW+4:0);
  const topo=(t,sub)=>{ fc(Co.pet); doc.rect(0,0,PW,20,'F'); if(img&&img.escuro) doc.addImage(img.escuro.d,'PNG',M,5,30,30*img.escuro.h/img.escuro.w);
    if(lysPdf) doc.addImage(lysPdf,'PNG',PW-M-lyW,4,lyW,12);
    doc.setFont('helvetica','bold'); doc.setFontSize(14); tc([255,255,255]); doc.text(fit(t,PW-2*M-90),M+38,10); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); tc([199,215,224]); doc.text(fit(sub,PW-2*M-90),M+38,15.5);
    doc.setFontSize(7.5); doc.text('Emitido em '+new Date().toLocaleDateString('pt-BR')+' às '+hora(new Date().toISOString()),xR,10,{align:'right'}); doc.text('Jan a '+PANO_M[hm]+' de '+A.ano+(andamento?' ('+PANO_M[hm]+' até '+hojeStr().slice(8,10)+'/'+hojeStr().slice(5,7)+')':''),xR,15.5,{align:'right'}); };
  const secao=(t,x,y)=>{ fc(Co.red); doc.rect(x,y-3.2,1.2,4.2,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(10); tc(Co.ink); doc.text(t,x+3,y); };
  topo(titulo,'Resumo para a diretoria · '+(A.fonte==='focco'?'Extrato do Focco (EPP)':'apontamentos do painel'));
  /* quadros */
  const fbTot=Fb.tot, part=filtrado&&fbTot?Sc.tot/fbTot:null;
  const K=[[nS(Sc.tot)+' sc','Produzido no ano',X.ant?(X.ant.tot?((Sc.tot>=X.ant.tot?'+':'')+Math.round((X.tot-X.ant.tot)/X.ant.tot*100)+'% × '+(A.ano-1)):'sem dados em '+(A.ano-1)):'jan a '+PANO_M[hm]],
    [nT(Tn.tot)+' t','Em toneladas','peso do saco × sacos'],
    [nS(media)+' sc','Média por mês',fechP.length+' '+(fechP.length===1?'mês fechado':'meses fechados')],
    [melhor?MC(melhor.i):'—','Melhor mês',melhor?nS(melhor.v)+' sc':''],
    [pior?MC(pior.i):'—','Mês mais fraco',pior?nS(pior.v)+' sc':''],
    part!=null?[pc(Sc.tot,fbTot),'Da produção da fábrica',nS(fbTot)+' sc no total']:[String(X.rows.length),A.ver==='linha'?'Linhas':'Produtos','com produção no ano']];
  const kw=(PW-2*M-5*4)/6; K.forEach((k,i)=>{ const x=M+i*(kw+4), y=25; fc(Co.soft); doc.roundedRect(x,y,kw,21,1.5,1.5,'F'); fc(i===5&&part!=null?Co.red:Co.teal); doc.rect(x,y,1.3,21,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(13.5); tc(Co.ink); doc.text(fit(k[0],kw-6),x+4,y+8.5); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); tc(Co.ink); doc.text(fit(k[1],kw-6),x+4,y+14); tc(Co.mut); doc.setFontSize(6.8); doc.text(fit(k[2],kw-6),x+4,y+18.3); });
  /* gráfico mês a mês */
  const gx=M, gw=178, gy=60, gh=78; secao('Produção mês a mês (sacos)',gx,gy-4);
  const ant=X.ant&&A.med==='sc'?X.ant.mes:null, mx=Math.max(1,...Sc.mes.slice(0,nM),...(ant?ant.slice(0,nM):[0])), passo=Math.pow(10,Math.floor(Math.log10(mx))), top=Math.ceil(mx/passo*1.1)*passo;
  const x0=gx+14, x1=gx+gw, y0=gy+gh, Y=v=>y0-(gh-6)*v/top, bw=(x1-x0)/12;
  doc.setFontSize(6.5); for(let i=0;i<=4;i++){ const v=top*i/4; dc(Co.lin); doc.setLineWidth(.2); doc.line(x0,Y(v),x1,Y(v)); tc(Co.mut); doc.text(nS(v),x0-1.5,Y(v)+1,{align:'right'}); }
  Sc.mes.forEach((v,i)=>{ const cx=x0+bw*i; if(i<nM){ if(ant){ fc(Co.cinza); doc.rect(cx+bw*.14,Y(ant[i]),bw*.3,y0-Y(ant[i]),'F'); }
      const bx=ant?cx+bw*.46:cx+bw*.18, bww=ant?bw*.4:bw*.64; fc(melhor&&i===melhor.i?Co.ok:andamento&&i===hm?[140,178,190]:Co.pet2); if(v>0) doc.rect(bx,Y(v),bww,y0-Y(v),'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.6); tc(Co.ink); if(v>0) doc.text(nS(v),bx+bww/2,Y(v)-1.2,{align:'center'}); }
    doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(i<nM?Co.ink:Co.cinza); doc.text(PANO_M[i],cx+bw/2,y0+4,{align:'center'}); });
  dc(Co.mut); doc.setLineWidth(.3); doc.line(x0,y0,x1,y0);
  doc.setFontSize(6.5); tc(Co.mut); let lx=x0; const leg=(c,t)=>{ fc(c); doc.rect(lx,y0+7,3,2.4,'F'); doc.text(t,lx+4,y0+9.1); lx+=doc.getTextWidth(t)+9; };
  leg(Co.pet2,String(A.ano)); if(melhor) leg(Co.ok,'melhor mês'); if(andamento) leg([140,178,190],PANO_M[hm]+' em andamento'); if(ant) leg(Co.cinza,String(A.ano-1));
  /* participação na fábrica, por linha */
  const px=M+gw+9, pw=PW-M-px; secao('Participação na fábrica',px,gy-4);
  const LO=linhasOrd(), ix=l=>{ const i=LO.indexOf(l); return i<0?999:i; }, tT={}; (FbT.rows||[]).forEach(o=>tT[o.k]=o.tot);
  let bars=[], semL=0, semLt=0; (Fb.rows||[]).forEach(o=>{ if(/\s\/\s/.test(o.k)||!o.k||o.k==='—'){ semL+=o.tot; semLt+=tT[o.k]||0; } else bars.push({k:o.k,v:o.tot,t:tT[o.k]||0}); });
  bars.sort((a,b)=>ix(a.k)-ix(b.k)); /* itens de mais de uma linha, sem divisão: não aparecem (pedido de 27/10); só somam no total da fábrica */
  const bmx=Math.max(1,...bars.map(b=>b.v)), rowH=Math.min(9.5,(gh-4)/Math.max(1,bars.length)), lw=27, bwM=pw-lw-30;
  bars.forEach((b,i)=>{ const y=gy+1+i*rowH, sel=A.ls.length?A.ls.includes(b.k):!b.sem; doc.setFont('helvetica',sel&&A.ls.length?'bold':'normal'); doc.setFontSize(7.4); tc(b.sem?Co.mut:Co.ink); doc.text(fit(b.k,lw-2),px,y+4);
    fc(b.sem?Co.lin:sel?(A.ls.length?Co.red:Co.pet2):Co.cinza); doc.rect(px+lw,y+1,Math.max(.6,bwM*b.v/bmx),4.2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7); tc(Co.ink); doc.text(pc(b.v,fbTot),PW-M,y+3.2,{align:'right'}); doc.setFont('helvetica','normal'); doc.setFontSize(6); tc(Co.mut); doc.text(nS(b.v)+' sc · '+nT(b.t)+' t',PW-M,y+6.2,{align:'right'}); });
  doc.setFontSize(6.5); tc(Co.mut); doc.text(fit('Fábrica no ano: '+nS(fbTot)+' sc · '+nT(FbT.tot)+' t'+'',pw),px,y0+9.1);
  /* quadro mês a mês */
  const ty=y0+17; secao('Mês a mês',M,ty);
  const fbM=Fb.mes, cols=[''].concat(MS.map((_,i)=>MC(i)),['Total']), cw0=36, cw=(PW-2*M-cw0)/(cols.length-1), cx=i=>i===0?M:M+cw0+cw*(i-1);
  const linhasQ=[['Sacos',Sc.mes.slice(0,nM).map(nS),nS(Sc.tot)],['Toneladas',Tn.mes.slice(0,nM).map(nT),nT(Tn.tot)]];
  if(filtrado) linhasQ.push(['% da fábrica',Sc.mes.slice(0,nM).map((v,i)=>pc(v,fbM[i])),pc(Sc.tot,fbTot)]);
  if(X.ant&&A.med==='sc') linhasQ.push([String(A.ano-1)+' (sacos)',X.ant.mes.slice(0,nM).map(nS),nS(X.ant.mes.slice(0,nM).reduce((a,v)=>a+v,0))]);
  let yy=ty+3; fc(Co.pet); doc.rect(M,yy,PW-2*M,5.5,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7); tc([255,255,255]); cols.forEach((c,i)=>{ if(i) doc.text(c,cx(i)+cw-1.5,yy+3.8,{align:'right'}); }); yy+=5.5;
  linhasQ.forEach((r,j)=>{ if(j%2){ fc(Co.zeb); doc.rect(M,yy,PW-2*M,5.4,'F'); } doc.setFont('helvetica','bold'); doc.setFontSize(7.2); tc(Co.ink); doc.text(r[0],M+1.5,yy+3.8);
    doc.setFont('helvetica','normal'); r[1].forEach((v,i)=>doc.text(v,cx(i+1)+cw-1.5,yy+3.8,{align:'right'})); doc.setFont('helvetica','bold'); doc.text(r[2],cx(cols.length-1)+cw-1.5,yy+3.8,{align:'right'}); yy+=5.4; });
  /* itens que podem ter passado pela linha escolhida, mas o Focco não separa (pedido de 27/10): fora do total */
  const sd=PANO_SO_CERTO?[]:((Sc.R&&Sc.R.semDiv)||[]), sdT={}; ((Tn.R&&Tn.R.semDiv)||[]).forEach(o=>sdT[o.c]=o.v); const sdTot=sd.reduce((a,o)=>a+o.v,0), sdTt=sd.reduce((a,o)=>a+(sdT[o.c]||0),0), nomeLs=A.ls.join(' + ');
  if(sd.length){ const by=yy+6; fc([253,246,232]); doc.roundedRect(M,by,PW-2*M,13,1.5,1.5,'F'); fc(Co.warn); doc.rect(M,by,1.3,13,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); tc(Co.ink); doc.text(fit('Fora do total: '+sd.length+(sd.length===1?' item que pode':' itens que podem')+' ter sido feito'+(sd.length===1?'':'s')+' na '+nomeLs+' somam '+nS(sdTot)+' sc ('+nT(sdTt)+' t) no ano.',PW-2*M-8),M+4,by+5.2);
    doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(Co.mut); doc.text(fit('O Focco registra quanto foi produzido do item, mas não em qual linha. Esses itens podem ser feitos em mais de uma linha, por isso ficam à parte (detalhe na última página).',PW-2*M-8),M+4,by+9.8); }
  /* tabela detalhada */
  doc.addPage(); topo(titulo,'Detalhe '+(A.ver==='linha'?'por linha':A.ver==='linprod'?'por linha e produto':'por produto')+' · sacos e toneladas');
  const verL=A.ver==='linha', colLin=A.ver==='produto'&&A.ls.length!==1, tK={}; (Tn.rows||[]).forEach(o=>tK[o.k]=o.tot);
  const head=[verL?'Linha':'Produto'].concat(colLin?['Linhas']:[]).concat(MS,['Total sc','Total t','%']).concat(X.ant&&A.med==='sc'?[String(A.ano-1),'Var.']:[]);
  const wNome=verL?34:colLin?78:96, wL=colLin?24:0, fixo=[wNome].concat(colLin?[wL]:[]), resto=(PW-2*M-fixo.reduce((a,b)=>a+b,0))/(head.length-fixo.length);
  const ws=fixo.concat(Array(head.length-fixo.length).fill(resto)), xs=[]; let ax=M; ws.forEach(w=>{ xs.push(ax); ax+=w; });
  let y=26; const cab=()=>{ fc(Co.pet); doc.rect(M,y,PW-2*M,6,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(6.6); tc([255,255,255]); head.forEach((h,i)=>{ const r=i>=fixo.length; doc.text(fit(h,ws[i]-2),r?xs[i]+ws[i]-1:xs[i]+1,y+4,{align:r?'right':'left'}); }); y+=6; };
  /* quebra de página sem deixar sobra: o fim da tabela (últimas linhas + Total) nunca vai sozinho para a página seguinte,
     e o título de uma linha (agrupado) não fica sozinho no pé da página (pedido de 27/10) */
  let rest=Sc.rows.length+1+(A.ver==='linprod'?new Set(Sc.rows.map(o=>o.l)).size:0); const LIM=PH-14, cabe=()=>LIM>=y?Math.floor((LIM-y)/5)+1:0;
  const lin=(r,tipo,zeb)=>{ const c=cabe(), sobra=rest-c; if(y>LIM||(sobra>0&&sobra<5&&rest<=6)||(tipo==='g'&&c<4&&rest>c)){ doc.addPage(); y=12; cab(); } rest--; const h=tipo?5.4:5; if(zeb){ fc(Co.zeb); doc.rect(M,y,PW-2*M,h,'F'); } if(tipo==='t'){ fc([226,236,241]); doc.rect(M,y,PW-2*M,h,'F'); } if(tipo==='g'){ fc(Co.soft); doc.rect(M,y,PW-2*M,h,'F'); }
    doc.setFont('helvetica',tipo?'bold':'normal'); doc.setFontSize(6.8); tc(tipo==='g'?Co.teal:Co.ink); r.forEach((v,i)=>{ const t=fit(v,ws[i]-2), rr=i>=fixo.length; if(t) doc.text(t,rr?xs[i]+ws[i]-1:xs[i]+1,y+3.6,{align:rr?'right':'left'}); }); y+=h; };
  const nv=v=>v?nS(v):'–';
  const linhaDe=(nome,ls,m,tot,tt,a)=>[nome].concat(colLin?[ls||'']:[]).concat(m.slice(0,nM).map(nv),[nS(tot),nT(tt),pc(tot,Sc.tot)]).concat(X.ant&&A.med==='sc'?[a?nS(a):'–',a?((tot>=a?'+':'')+Math.round((tot-a)/a*100)+'%'):'']:[]);
  /* tabela usa as linhas em sacos (Sc), para ter sc e t lado a lado */
  const rowsS=Sc.rows, antK=X.ant&&A.med==='sc'?X.antK:null; cab(); let lAnt=null, z=0;
  rowsS.forEach(o=>{ if(A.ver==='linprod'&&o.l!==lAnt){ lAnt=o.l; const rs=rowsS.filter(r=>r.l===o.l), sm=Array(12).fill(0); rs.forEach(r=>r.m.forEach((v,i)=>sm[i]+=v)); const st=sm.reduce((a,v)=>a+v,0), stt=rs.reduce((a,r)=>a+(tK[r.k]||0),0);
      lin([o.l+' · '+rs.length+(rs.length===1?' produto':' produtos')].concat(sm.slice(0,nM).map(nS),[nS(st),nT(stt),pc(st,Sc.tot)]).concat(antK?['','']:[]),'g'); z=0; }
    const r=linhaDe(A.ver==='linprod'?o.p:o.k,(o.ls||[]).join(', '),o.m,o.tot,tK[o.k]||0,antK?antK[o.k]||0:0); lin(r,'',z++%2); });
  lin(['Total'].concat(colLin?['']:[]).concat(Sc.mes.slice(0,nM).map(nS),[nS(Sc.tot),nT(Tn.tot),'100%']).concat(antK?[nS(X.ant.tot),X.ant.tot?((Sc.tot>=X.ant.tot?'+':'')+Math.round((Sc.tot-X.ant.tot)/X.ant.tot*100)+'%'):'']:[]),'t');
  if(sd.length){ doc.addPage(); topo(titulo,'Itens que podem ter passado pela '+nomeLs+' · fora do total'); let y2=28; secao('Itens que podem ter sido feitos na '+nomeLs,M,y2); y2+=5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8); tc(Co.ink);
    doc.splitTextToSize('O Extrato do Focco mostra quanto foi produzido de cada item por dia, mas não em qual linha. Os itens abaixo estão cadastrados para mais de uma linha e não há apontamento no painel que permita separar. Por isso NÃO estão somados no total da '+nomeLs+' das páginas anteriores. Os números abaixo são a produção inteira do item, em todas as linhas onde ele pode ser feito.',PW-2*M).forEach(t=>{ doc.text(t,M,y2+3); y2+=4; }); y2+=3;
    const hd=['Produto','Pode ser feito em'].concat(MS,['Total sc','Total t']), fx=[80,34], rs=(PW-2*M-114)/(hd.length-2), w2=fx.concat(Array(hd.length-2).fill(rs)), x2=[]; let bx=M; w2.forEach(w=>{ x2.push(bx); bx+=w; });
    const cab2=()=>{ fc(Co.pet); doc.rect(M,y2,PW-2*M,6,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(6.6); tc([255,255,255]); hd.forEach((h,i)=>{ const r=i>=2; doc.text(fit(h,w2[i]-2),r?x2[i]+w2[i]-1:x2[i]+1,y2+4,{align:r?'right':'left'}); }); y2+=6; };
    const l2=(r,tot,zeb)=>{ if(y2>PH-14){ doc.addPage(); y2=12; cab2(); } const h=tot?5.4:5; if(zeb){ fc(Co.zeb); doc.rect(M,y2,PW-2*M,h,'F'); } if(tot){ fc([226,236,241]); doc.rect(M,y2,PW-2*M,h,'F'); }
      doc.setFont('helvetica',tot?'bold':'normal'); doc.setFontSize(6.8); tc(Co.ink); r.forEach((v,i)=>{ const t=fit(v,w2[i]-2), rr=i>=2; if(t) doc.text(t,rr?x2[i]+w2[i]-1:x2[i]+1,y2+3.6,{align:rr?'right':'left'}); }); y2+=h; };
    cab2(); const sm=Array(12).fill(0); sd.forEach((o,j)=>{ (o.m||[]).forEach((v,i)=>sm[i]+=v); const nm=String(o.p||'').toUpperCase().startsWith(String(o.c).toUpperCase())?o.p:o.c+' · '+o.p;
      l2([nm,(o.ls||[]).join(' / ')].concat((o.m||Array(12).fill(0)).slice(0,nM).map(nv),[nS(o.v),nT(sdT[o.c]||0)]),false,j%2); });
    l2(['Total desses itens',''].concat(sm.slice(0,nM).map(nv),[nS(sdTot),nT(sdTt)]),true); y2+=6;
    if(y2>PH-30){ doc.addPage(); y2=14; }
    const caixa=(t1,t2,cor)=>{ fc(Co.soft); doc.roundedRect(M,y2,PW-2*M,12,1.5,1.5,'F'); fc(cor); doc.rect(M,y2,1.3,12,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(8.5); tc(Co.ink); doc.text(t1,M+4,y2+5); doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(Co.mut); doc.text(fit(t2,PW-2*M-8),M+4,y2+9.3); y2+=15; };
    caixa(nomeLs+' (certo): '+nS(Sc.tot)+' sc · '+nT(Tn.tot)+' t','Só os itens feitos apenas na '+nomeLs+', ou com a divisão conhecida (é o total das páginas anteriores).',Co.teal);
    caixa(nomeLs+' se todos esses itens tivessem sido feitos nela: até '+nS(Sc.tot+sdTot)+' sc · '+nT(Tn.tot+sdTt)+' t','É o máximo possível. O número real fica entre os dois; para saber, é preciso dizer a linha (ou a divisão) desses itens em Ajustes › Itens.',Co.warn); }
  /* rodapé */
  const np=doc.getNumberOfPages?doc.getNumberOfPages():1; for(let p=1;p<=np;p++){ if(doc.setPage) doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); tc(Co.mut);
    doc.text(fit(A.fonte==='focco'?'Fonte: Extrato do Focco (EPP). Linha = a da ordem de produção no painel; sem a ordem, a do item (Ajustes › Itens ou Focco). Só entra o que tem linha certa. Toneladas = sacos × peso do saco.':'Fonte: apontamentos lançados no painel. Toneladas = sacos × peso do saco.',PW-2*M-30),M,PH-5); doc.text('Página '+p+' de '+np,PW-M,PH-5,{align:'right'}); }
  const nome='Producao-'+A.ano+(A.ls.length?'-'+A.ls.join('-').replace(/\s+/g,''):'')+'.pdf'; doc.save(nome); toast('PDF baixado: '+nome); }
/* ---------- ações ---------- */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="pano-"]'); if(!b) return; const a=b.dataset.act, A=S.pano;
  if(a==='pano-set'){ const k=b.dataset.k; A[k]=b.dataset.v; A.tudo=false; render(); return; }
  if(a==='pano-ln'){ const v=b.dataset.v; A.ls=!v?[]:A.ls.includes(v)?A.ls.filter(x=>x!==v):A.ls.concat([v]); render(); return; }
  if(a==='pano-prod'){ A.q=b.dataset.v; if(A.ver==='linha') A.ver='produto'; render(); return; }
  if(a==='pano-limpar'){ A.q=''; A.ls=[]; render(); return; }
  if(a==='pano-tudo'){ A.tudo=true; render(); return; }
  if(a==='pano-xls'){ panoXls(); return; } if(a==='pano-pdf'){ panoPdf(); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset) return; if(t.id==='pano-q'){ S.pano.q=t.value.trim(); render(); return; } const k=t.dataset.pano; if(!k) return;
  S.pano[k]=t.type==='checkbox'?t.checked:k==='ano'?+t.value:t.value; render(); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='pano-q'){ ev.preventDefault(); ev.target.blur(); } });
/* ---------- registro: Produção › Relatórios ---------- */
VIEWS.prodano={nome:'Produção do ano',ic:'grafico',mob:'Ano'}; CRUMB.prodano='Produção do ano'; S.extViews=S.extViews||{}; S.extViews.prodano=vProdAno;
function panoReg(){ const M=MODS.find(x=>x.id==='producao'); if(M&&!M.views.includes('prodano')){ const i=M.views.indexOf('indicadores'); if(i>=0) M.views.splice(i+1,0,'prodano'); else M.views.push('prodano'); }
  try{ if(typeof ADM_REL!=='undefined'&&!ADM_REL.includes('prodano')) ADM_REL.push('prodano'); }catch(e){} }
panoReg(); setTimeout(panoReg,0); setTimeout(panoReg,1600);
/* 27/10: o Marcelo (Visão do gestor) também vê a Produção do ano, em Produção › Produção do ano */
{ const _vo=viewOk; viewOk=function(v){ if(v==='prodano'){ try{ const p=acsP(); if(p&&(p.mods||[]).includes('gestor')) return true; }catch(e){} } return _vo.apply(this,arguments); }; }
{ const _md=modDe; modDe=function(v){ if(v==='prodano'){ try{ if(gxSolo()) return 'gestor'; }catch(e){} } return _md.apply(this,arguments); }; }
try{ const g=GXG.find(x=>x.id==='g-prod'); if(g&&!g.tabs.some(t=>t[0]==='prodano')){ g.tabs.push(['prodano','Produção do ano']);
  const f=S.extViews.prodano; S.extViews.prodano=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('prodano')+h; }catch(e){ return h; } }; } }catch(e){}
window.Painel=window.Painel||{}; window.Painel.producaoAno={dados:()=>panoDados(),estado:()=>S.pano};
document.head.insertAdjacentHTML('beforeend',`<style id="pano-css">
.pano-f{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:flex-end;padding:14px 16px}
.pano-f label.pra-ck{flex-direction:row;align-items:center;align-self:center}
.pano-f label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted);font-weight:600}.pano-f select,.pano-f .txt{min-width:150px}
.pano-fl{display:flex;flex-direction:column;gap:4px}.pano-fl>span,.pano-ls>span{font-size:12.5px;color:var(--muted);font-weight:600}
.pano-q{flex:1 1 200px;max-width:280px}.pano-ls{display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex-basis:100%}
.pano-k{margin:0}.pano-k small{font-size:12px;color:var(--muted)}
.pano-g{width:100%;height:auto;display:block}.pano-g text{font-size:11px;fill:var(--muted);font-family:inherit}
.pano-gh2{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.pano-gh2 h2{margin:0;font-size:16px}
.pano-lg{font-size:12.5px;color:var(--muted);display:flex;gap:6px;align-items:center}.pano-lg i{width:12px;height:12px;border-radius:3px;display:inline-block}.pano-lg i.a{background:var(--teal)}.pano-lg i.b{background:var(--line);margin-left:8px}
.pano-t{padding:0;overflow:hidden}.pano-tw{overflow:auto;max-height:70vh}
.pano-tb{min-width:1080px}.pano-tb th[scope=row]{text-align:left;font-weight:500;position:sticky;left:0;background:var(--surface);z-index:1;min-width:220px;max-width:340px}
.pano-tb thead th{position:sticky;top:0;background:var(--surface);z-index:2}.pano-tb thead th:first-child{left:0;z-index:3}
.pano-tb th[scope=row] small{display:block;font-size:11.5px;color:var(--muted)}.pano-tb td.fut{opacity:.4}
.pano-tb tfoot th,.pano-tb tfoot td{font-weight:700;border-top:2px solid var(--teal-strong);background:var(--ground)}.pano-tb tfoot th{background:var(--ground)}
.pano-gh th,.pano-gh td{background:var(--ground)!important;font-weight:600;color:var(--teal-strong)}.pano-gh small{font-weight:400;color:var(--muted);margin-left:6px}
.pano-nm{text-align:left;padding:0;font:inherit;color:inherit}.pano-nm:hover{color:var(--teal-strong);text-decoration:underline}
</style>`);
