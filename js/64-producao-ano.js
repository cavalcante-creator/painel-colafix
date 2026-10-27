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
async function panoXls(){ const L=panoLinhas(); if(!L) return; try{ await carregarScript(ANL_XLSX); }catch(e){} if(!window.XLSX){ toast('Não foi possível carregar o gerador de Excel.'); return; }
  const XL=window.XLSX, ws=XL.utils.aoa_to_sheet([[panoDesc(L.A)],[],L.head].concat(L.rows,[L.tot])); ws['!cols']=L.head.map((h,i)=>({wch:i===0?(L.A.ver==='linha'?14:44):i===1&&L.A.ver!=='linha'?24:10}));
  const wb=XL.utils.book_new(); XL.utils.book_append_sheet(wb,ws,'Produção '+L.A.ano); XL.writeFile(wb,'Producao-'+L.A.ano+(L.A.ls.length?'-'+L.A.ls.join('-').replace(/\s+/g,''):'')+'.xlsx'); toast('Excel baixado.'); }
async function panoPdf(){ const L=panoLinhas(); if(!L) return; try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }catch(e){}
  const J=window.jspdf&&window.jspdf.jsPDF; if(!J){ toast('O gerador de PDF não carregou. Confira a internet e tente de novo.'); return; }
  const img=await gpImgs(), Co=GPDF.cor, doc=new J({unit:'mm',format:'a4',orientation:'landscape'}), PW=297, PH=210, M=10;
  const fc=c=>doc.setFillColor(c[0],c[1],c[2]), tc=c=>doc.setTextColor(c[0],c[1],c[2]), fit=(t,w)=>{ t=String(t==null?'':t); if(doc.getTextWidth(t)<=w) return t; while(t.length>1&&doc.getTextWidth(t+'…')>w) t=t.slice(0,-1); return t+'…'; };
  fc(Co.pet); doc.rect(0,0,PW,20,'F'); if(img&&img.escuro) doc.addImage(img.escuro.d,'PNG',M,5,30,30*img.escuro.h/img.escuro.w);
  doc.setFont('helvetica','bold'); doc.setFontSize(14); tc([255,255,255]); doc.text('Produção do ano · '+L.A.ano,M+38,10); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); tc([199,215,224]); doc.text(fit(panoDesc(L.A),PW-M*2-80),M+38,15.5);
  doc.setFontSize(7.5); doc.text('Emitido em '+new Date().toLocaleString('pt-BR'),PW-M,10,{align:'right'});
  const nTxt=L.head.length, wNome=L.A.ver==='linha'?28:L.A.ver==='produto'?70:46, wExtra=L.A.ver!=='linha'?(L.A.ver==='produto'?26:40):0;
  const fixo=[wNome].concat(L.A.ver!=='linha'?[wExtra]:[]), resto=(PW-2*M-fixo.reduce((a,b)=>a+b,0))/(nTxt-fixo.length), ws=fixo.concat(Array(nTxt-fixo.length).fill(resto)), xs=[]; let ax=M; ws.forEach(w=>{ xs.push(ax); ax+=w; });
  let y=26; const cab=()=>{ fc(Co.pet); doc.rect(M,y,PW-2*M,6,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(6.5); tc([255,255,255]); L.head.forEach((h,i)=>{ const r=i>=fixo.length; doc.text(fit(h,ws[i]-2),r?xs[i]+ws[i]-1:xs[i]+1,y+4,{align:r?'right':'left'}); }); y+=6; };
  const fmt=(v,i)=>i<fixo.length?String(v==null?'':v):v===''||v==null?'':typeof v==='number'?(L.head[i]==='%'||/Varia/.test(L.head[i])?String(v).replace('.',',')+'%':v.toLocaleString('pt-BR')):String(v);
  const linha=(r,b,zeb)=>{ if(y>PH-14){ doc.addPage(); y=12; cab(); } if(zeb){ fc(Co.zeb); doc.rect(M,y,PW-2*M,5,'F'); } if(b){ fc([226,236,241]); doc.rect(M,y,PW-2*M,5.4,'F'); }
    doc.setFont('helvetica',b?'bold':'normal'); doc.setFontSize(6.8); tc(Co.ink); r.forEach((v,i)=>{ const t=fit(fmt(v,i),ws[i]-2), rr=i>=fixo.length; if(t) doc.text(t,rr?xs[i]+ws[i]-1:xs[i]+1,y+3.6,{align:rr?'right':'left'}); }); y+=b?5.4:5; };
  cab(); L.rows.forEach((r,i)=>linha(r,false,i%2)); linha(L.tot,true);
  const np=doc.getNumberOfPages?doc.getNumberOfPages():1; for(let p=1;p<=np;p++){ if(doc.setPage) doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); tc(Co.mut); doc.text(L.A.fonte==='focco'?'Fonte: Extrato do Focco (EPP). A linha é a do item no Focco; item de mais de uma linha dividido pela % da Curva S ou pelo apontado no painel.':'Fonte: apontamentos lançados no painel.',M,PH-5); doc.text('Página '+p+' de '+np,PW-M,PH-5,{align:'right'}); }
  const nome='Producao-'+L.A.ano+(L.A.ls.length?'-'+L.A.ls.join('-').replace(/\s+/g,''):'')+'.pdf'; doc.save(nome); toast('PDF baixado: '+nome); }
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
