/* Painel Colafix · 04-analise-paineis-acessos.js — análise, painéis por cargo, acessos e telas de TV.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

function adeCompromisso(o){ if(!o.linha||o.status==='cancelada') return null; const tl=adeLinhaTempo(o);
  for(let k=0;k<tl.length;k++){ const a=tl[k]; if(!a.d) continue; const b=tl[k+1]; const t0=new Date(a.d+'T00:00:00').getTime();
    const de=a.em?new Date(a.em).getTime():-Infinity, ate=b&&b.em?new Date(b.em).getTime():Infinity; if(de<=t0&&t0<ate) return a.d; }
  return null; }
function adeDados(ini,fim,lf){ const h=hojeStr(); const ate=fim>h?h:fim; const out=[]; const an=anuladas();
  S.ordens.forEach(o=>{ if(!o.linha||o.status==='cancelada'||(lf&&o.linha!==lf)) return; const d=adeCompromisso(o); if(!d||d<ini||d>=ate) return;
    const q=+o.total||0; if(!(q>0)) return; const t0=d+'T00:00:00', t1=addDias(d,1)+'T00:00:00'; const t0i=new Date(t0).toISOString(), t1i=new Date(t1).toISOString();
    let antes=0,noDia=0,depois=0; (o.ant||[]).forEach(a=>antes+=+a.qtd||0);
    S.entregas.forEach(e=>{ if(e.ordem!==o._id||e.anula||an.has(e._id)||!e.em) return; const v=+e.qtd||0; if(e.em<t0i) antes+=v; else if(e.em<t1i) noDia+=v; else depois+=v; });
    const fechouAte=o.status==='encerrada'&&o.fimEm&&o.fimEm<t1i; const ok=antes+noDia>=q*0.98||fechouAte; const adi=antes>=q*0.98||(fechouAte&&o.fimEm<t0i);
    let fimReal=null; if(!ok){ if(o.status==='encerrada'&&o.fimEm) fimReal=hojeStr(new Date(o.fimEm)); else { let acc=antes+noDia; const es=S.entregas.filter(e=>e.ordem===o._id&&!e.anula&&!an.has(e._id)&&e.em>=t1i).sort((a,b)=>a.em.localeCompare(b.em)); for(const e of es){ acc+=+e.qtd||0; if(acc>=q*0.98){ fimReal=hojeStr(new Date(e.em)); break; } } } }
    const pars=S.paradas.filter(p=>p.linha===o.linha&&p.inicio&&hojeStr(new Date(p.inicio))===d);
    out.push({o,d,l:o.linha,q,antes,noDia,depois,feito:Math.min(q,antes+noDia),st:adi?'adi':ok?'dia':'atr',fimReal,atraso:fimReal?Math.max(1,anlUteisEntre(d,fimReal)):null,pars}); });
  return out; }
function adePct(xs){ const n=xs.length; if(!n) return null; const ok=xs.filter(x=>x.st!=='atr').length; const q=xs.reduce((a,x)=>a+x.q,0), f=xs.reduce((a,x)=>a+x.feito,0); return {n,ok,atr:n-ok,adi:xs.filter(x=>x.st==='adi').length,pctO:ok/n*100,pctQ:q?f/q*100:0,q,f}; }
function adeCor(p){ return p==null?'var(--faint)':p>=85?'var(--ok)':p>=70?'var(--warn)':'var(--crit)'; }
function adeCard(){ const [ini,fim,rot]=perInd(); const xs=adeDados(ini,fim,S.ind.linha); const T=adePct(xs);
  const hd=`<div class="head" style="align-items:baseline;margin-bottom:6px"><div class="label">ADERÊNCIA À PROGRAMAÇÃO · ${esc(rot).toUpperCase()}</div>${T?`<span class="sub num" style="margin:0;font-size:12.5px">${T.n} ordem(ns) com dia comprometido</span>`:''}</div>`;
  if(!T) return `<section class="card">${hd}<div class="sub" style="margin:0;font-size:12.5px">Nenhuma ordem com dia comprometido no período (dias já encerrados). Conta a ordem que estava programada, com linha, na virada do dia.</div></section>`;
  const L=linhasOrd().map(l=>({l,p:adePct(xs.filter(x=>x.l===l))})).filter(r=>r.p);
  const dias=[...new Set(xs.map(x=>x.d))].sort(); const porDia=dias.map(d=>({d,p:adePct(xs.filter(x=>x.d===d))}));
  const bar=p=>`<span class="anl-pb w"><i style="width:${Math.min(100,p)}%;background:${adeCor(p)}"></i></span><b class="num">${Math.round(p)}%</b>`;
  const atr=xs.filter(x=>x.st==='atr').sort((a,b)=>(b.atraso||99)-(a.atraso||99)||b.q-a.q).slice(0,12);
  return `<section class="card">${hd}
   <div class="ade-kpi"><div><span class="k">No dia ou antes</span><b class="num" style="color:${adeCor(T.pctO)}">${Math.round(T.pctO)}%</b><small class="num">${T.ok} de ${T.n} ordens${T.adi?' · '+T.adi+' adiantada'+(T.adi===1?'':'s'):''}</small></div>
    <div><span class="k">Quantidade no dia</span><b class="num" style="color:${adeCor(T.pctQ)}">${Math.round(T.pctQ)}%</b><small class="num">${anlN(T.f)} de ${anlN(T.q)}</small></div>
    <div><span class="k">Atrasadas</span><b class="num" style="color:${T.atr?'var(--crit-ink)':'var(--ok-ink)'}">${T.atr}</b><small>${atr.filter(x=>x.pars.length).length} em dia com parada na linha</small></div></div>
   ${porDia.length>1?`<div class="vbars" style="grid-template-columns:repeat(${porDia.length},minmax(0,1fr));height:110px">${porDia.map(z=>`<div class="vb" title="${dm(z.d)}: ${z.p.ok} de ${z.p.n} ordens no dia"><span class="vb-v num">${Math.round(z.p.pctO)}%</span><i style="height:${Math.max(3,z.p.pctO)}%;background:${adeCor(z.p.pctO)}"></i></div>`).join('')}</div><div class="vbx num"><span>${dm(dias[0])}</span><span>${dm(dias[dias.length-1])}</span></div>`:''}
   <div style="overflow-x:auto;margin-top:12px"><table class="rtab"><thead><tr><th>Linha</th><th class="nr">Ordens</th><th>No dia ou antes</th><th>Quantidade no dia</th><th class="nr">Atrasadas</th></tr></thead><tbody>
   ${L.map(r=>`<tr><th>${esc(r.l)}</th><td class="nr num">${r.p.n}</td><td>${bar(r.p.pctO)}</td><td>${bar(r.p.pctQ)}</td><td class="nr num">${r.p.atr||'—'}</td></tr>`).join('')}</tbody></table></div>
   ${atr.length?`<div class="label" style="margin:14px 0 4px">ATRASADAS</div>${atr.map(x=>`<div class="impl" style="cursor:pointer" data-act="o-abrir" data-id="${esc(x.o._id)}"><span class="num"><b>${esc(x.o.num)}</b> · ${esc(x.l)} · ${esc(codigoDe(x.o))} · era ${dm(x.d)}${x.pars.length?` · <span class="t-crit">parada: ${esc([...new Set(x.pars.map(p=>p.motivo))].join(', '))}</span>`:''}</span><span class="num">${x.fimReal?`terminou ${dm(x.fimReal)} (${x.atraso} dia${x.atraso===1?'':'s'} útil${x.atraso===1?'':'eis'} depois)`:`ainda falta ${anlN(x.q-x.antes-x.noDia-x.depois)}`} · ${anlN(x.feito)} de ${anlN(x.q)} no dia</span></div>`).join('')}`:''}
   <div class="sub" style="font-size:12px;margin:8px 0 0">Conta a ordem no dia em que estava programada, com linha, na virada do dia (quem é remarcada antes do dia não conta como atraso; remarcada no próprio dia, conta). No dia = entregue até o fim daquele dia, ou encerrada nele. Hoje não entra: o dia ainda não acabou.</div></section>`; }
function adeOntem(){ const h=hojeStr(); let d=addDias(h,-1); for(let g=0;g<6&&!anlUtil(d);g++) d=addDias(d,-1); const p=adePct(adeDados(d,addDias(d,1),'')); return p?{d,p}:null; }

// ---------- 2. acerto da projeção (aba Acerto) ----------
function acrComp(){ const sn=S.anl.snaps; if(!sn) return null; const por={}; sn.forEach(x=>por[x.data]=x); const out=[];
  sn.forEach(A=>{ (A.d||[]).forEach((d,k)=>{ let nx=addDias(d,1); for(let g=0;g<6&&!anlUtil(nx);g++) nx=addDias(nx,1); const B=por[nx]; if(!B) return;
    for(const c in A.p){ const pv=(A.p[c]||[])[k], rv=B.s[c]; if(pv==null||rv==null) continue; out.push({c,feito:A.data,d,h:k+1,pv,rv,e:pv-rv}); } }); });
  return out; }
function acrResumo(xs){ let sa=0,sr=0,se=0; xs.forEach(z=>{ sa+=Math.abs(z.e); sr+=Math.abs(z.rv); se+=z.e; }); return {n:xs.length,pct:sr?sa/sr*100:null,vies:sr?se/sr*100:null,med:xs.length?sa/xs.length:0}; }
function vAnlAce(R){ const sn=S.anl.snaps; if(!sn){ anlSnapsLer(); return anlHead('Acerto da projeção','')+'<div class="empty">Carregando as fotos da projeção…</div>'; }
  const A=S.anl.ace||(S.anl.ace={h:0,busca:'',ord:'erro'}); const xs=acrComp();
  const head=anlHead('Acerto da projeção','A cada importação de saldo o painel guarda o saldo projetado dos próximos 10 dias úteis. Aqui ele compara com o saldo que veio de verdade depois, para mostrar onde a análise acerta e onde erra.');
  if(!xs||!xs.length) return head+`<section class="card"><div class="empty">${sn.length?`Já há ${sn.length} foto(s) (a última de ${dm(sn[sn.length-1].data)}). O acerto aparece quando houver saldo importado no dia seguinte a uma foto.`:'A primeira foto fica guardada na próxima importação do Saldo.'}</div></section>`;
  const hs=[...new Set(xs.map(z=>z.h))].sort((a,b)=>a-b); const hSel=A.h&&hs.includes(A.h)?A.h:(hs.includes(5)?5:hs[hs.length-1]);
  const G=acrResumo(xs.filter(z=>z.h===hSel)); const byH=hs.map(h=>({h,r:acrResumo(xs.filter(z=>z.h===h))}));
  const datas=[...new Set(xs.filter(z=>z.h===hSel).map(z=>z.feito))].sort().slice(-20); const byD=datas.map(d=>({d,r:acrResumo(xs.filter(z=>z.h===hSel&&z.feito===d))}));
  const I=(S.anl.base.itens||{}).l||{}; const its={}; xs.filter(z=>z.h===hSel).forEach(z=>{ (its[z.c]=its[z.c]||[]).push(z); });
  let rows=Object.entries(its).map(([c,zs])=>{ const r=acrResumo(zs); const acima=zs.filter(z=>z.e>0).length/zs.length; return {c,d:(I[c]||{}).d||((R.por[c]||{}).d)||'',r,acima,zs}; });
  const q=A.busca.trim().toUpperCase(); if(q) rows=rows.filter(x=>x.c.includes(q)||x.d.toUpperCase().includes(q));
  rows.sort(A.ord==='vies'?(a,b)=>Math.abs(b.r.vies||0)-Math.abs(a.r.vies||0):A.ord==='cod'?(a,b)=>a.c.localeCompare(b.c):(a,b)=>b.r.med-a.r.med);
  const leitura=x=>{ if(x.zs.length<3||x.r.vies==null) return '<span class="t-mut">poucos dias</span>'; if(x.r.vies>=20&&x.acima>=0.7) return '<span class="t-crit">saldo real abaixo do projetado: saiu mais que o previsto ou produção não apontada. Rever estoque de segurança.</span>'; if(x.r.vies<=-20&&x.acima<=0.3) return '<span style="color:var(--warn-ink)">saldo real acima do projetado: saiu menos que o previsto ou entrou produção fora do painel.</span>'; if((x.r.pct||0)<=15) return '<span style="color:var(--ok-ink)">acerta bem</span>'; return '<span class="t-mut">erra para os dois lados</span>'; };
  const cor=p=>p==null?'var(--faint)':p<=15?'var(--ok)':p<=35?'var(--warn)':'var(--crit)';
  return `${head}
  <div class="resumo"><div><div class="k">Comparações (D+${hSel})</div><div class="v num">${anlN(G.n)}</div></div><div><div class="k">Erro médio</div><div class="v num" style="color:${cor(G.pct)}">${G.pct==null?'—':Math.round(G.pct)+'%'} <small>do saldo real</small></div></div>
   <div><div class="k">Tendência</div><div class="v num">${G.vies==null?'—':(G.vies>0?'+':'')+Math.round(G.vies)+'%'} <small>${G.vies>5?'projeta acima do real':G.vies<-5?'projeta abaixo do real':'equilibrada'}</small></div></div><div><div class="k">Fotos</div><div class="v num">${sn.length} <small>${dm(sn[0].data)} a ${dm(sn[sn.length-1].data)}</small></div></div></div>
  <div class="two">
   <section class="card"><div class="label">ERRO POR HORIZONTE</div><div class="sub" style="margin:4px 0 0;font-size:12.5px">Quanto mais longe, mais erra. Clique para ver aquele horizonte.</div>
    ${(()=>{ S._acrMx=Math.max(1,...byH.map(z=>z.r.pct||0)); return ''; })()}<div class="vbars" style="grid-template-columns:repeat(${byH.length},minmax(0,1fr));height:120px">${byH.map(z=>`<div class="vb" data-act="acr-h" data-h="${z.h}" style="cursor:pointer" title="D+${z.h}: ${z.r.n} comparações"><span class="vb-v num">${z.r.pct==null?'—':Math.round(z.r.pct)+'%'}</span><i style="height:${Math.max(3,(z.r.pct||0)/S._acrMx*85)}%;background:${z.h===hSel?'var(--teal-strong)':cor(z.r.pct)}"></i></div>`).join('')}</div>
    <div class="vbx num">${byH.map(z=>`<span style="${z.h===hSel?'font-weight:700;color:var(--teal-strong)':''}">D+${z.h}</span>`).join('')}</div></section>
   <section class="card"><div class="label">ERRO D+${hSel} POR DIA EM QUE A PROJEÇÃO FOI FEITA</div><div class="sub" style="margin:4px 0 0;font-size:12.5px">Se está caindo, a base (Perfil, apontamento, previsões) está melhorando.</div>
    ${byD.length?`${(()=>{ S._acrMx=Math.max(1,...byD.map(z=>z.r.pct||0)); return ''; })()}<div class="vbars" style="grid-template-columns:repeat(${byD.length},minmax(0,1fr));height:120px">${byD.map(z=>`<div class="vb" title="${dm(z.d)}: ${z.r.n} comparações"><span class="vb-v num">${z.r.pct==null?'—':Math.round(z.r.pct)+'%'}</span><i style="height:${Math.max(3,(z.r.pct||0)/S._acrMx*85)}%;background:${cor(z.r.pct)}"></i></div>`).join('')}</div><div class="vbx num"><span>${dm(byD[0].d)}</span><span>${dm(byD[byD.length-1].d)}</span></div>`:'<div class="empty">—</div>'}</section></div>
  <section class="card"><div class="head" style="align-items:center;gap:10px"><div class="label">POR ITEM · D+${hSel}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><div class="seg">${[['erro','Maior erro'],['vies','Maior tendência'],['cod','Código']].map(([k,t])=>`<button data-act="acr-ord" data-k="${k}" aria-pressed="${A.ord===k}">${t}</button>`).join('')}</div>
    <div class="srch" style="margin:0;min-width:200px"><input class="txt" id="acr-busca" placeholder="Código ou descrição" value="${esc(A.busca)}"></div></div></div>
   <div style="overflow-x:auto"><table class="rtab anl-mt"><thead><tr><th>Item</th><th class="nr">Dias</th><th class="nr">Erro médio</th><th class="nr">Erro %</th><th class="nr">Tendência</th><th>Leitura</th></tr></thead><tbody>
   ${rows.slice(0,80).map(x=>`<tr data-act="anl-item" data-c="${esc(x.c)}" style="cursor:pointer"><th><b class="num">${esc(x.c)}</b><small>${esc(x.d.slice(0,38))}</small></th><td class="nr num">${x.zs.length}</td><td class="nr num">${anlN(x.r.med)}</td><td class="nr num" style="color:${cor(x.r.pct)}">${x.r.pct==null?'—':Math.round(x.r.pct)+'%'}</td><td class="nr num">${x.r.vies==null?'—':(x.r.vies>0?'+':'')+Math.round(x.r.vies)+'%'}</td><td style="font-size:12px;max-width:340px">${leitura(x)}</td></tr>`).join('')}</tbody></table></div>
   ${rows.length>80?`<div class="sub" style="font-size:12px">Mostrando 80 de ${rows.length}. Use a busca.</div>`:''}
   <div class="sub" style="font-size:12px;margin:8px 0 0">Erro % = soma dos erros ÷ soma dos saldos reais. Tendência positiva = a projeção dizia que ia sobrar mais do que sobrou.</div></section>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="acr-"]'); if(!b) return; const A=S.anl.ace||(S.anl.ace={h:0,busca:'',ord:'erro'});
  if(b.dataset.act==='acr-h'){ A.h=+b.dataset.h; render(); } else if(b.dataset.act==='acr-ord'){ A.ord=b.dataset.k; render(); } });
document.addEventListener('input',ev=>{ if(ev.target.id!=='acr-busca') return; const A=S.anl.ace; A.busca=ev.target.value; clearTimeout(A._t); A._t=setTimeout(()=>{ const p=ev.target.selectionStart; render(); const i=$('#acr-busca'); if(i){ i.focus(); try{ i.setSelectionRange(p,p); }catch(e){} } },250); });

// ---------- 5. TV da fábrica ----------
function tvfAtivos(){ const h=hojeStr(); let am=addDias(h,1); for(let g=0;g<6&&!anlUtil(am);g++) am=addDias(am,1); return {h,am}; }
S.tvf=(()=>{ let o={}; try{ o=JSON.parse(localStorage.getItem('colafix.tvf')||'{}')||{}; }catch(e){} return {dia:'',linhas:Array.isArray(o.linhas)?o.linhas:[]}; })();
function tvfSalvar(){ try{ localStorage.setItem('colafix.tvf',JSON.stringify({linhas:S.tvf.linhas})); }catch(e){} }
function tvfProxUtil(d){ let x=addDias(d,1); for(let g=0;g<6&&!anlUtil(x);g++) x=addDias(x,1); return x; }
const TV_SW={'Branco':'#F5F3EE','Marfim Médio':'#EDE3CC','Corda':'#D9CBB0','Palha':'#E7D9AE','Areia':'#D8C6A1','Bege':'#D9C3A0','Platina':'#CFD2D2','Cinza':'#A9ADAD','Cinza Ártico':'#C2C7C9','Cinza Escuro':'#6F7476','Grafite':'#4E5355','Preto':'#2E2E2E','Marrom':'#7A5A43','Marrom Café':'#6B4B36','Marrom Sucupira':'#8A6A4E','Castanho':'#7B5539','Castor':'#6C5A4A','Chocolate':'#5A3D2B','Ébano':'#3B2E26','Camurça':'#B99A73','Canela':'#A8774E','Bronce':'#A97B4C','Azul Piscina':'#7EC3D4'};
function tvSw(c){ return TV_SW[c.nome]||(c.g==='E'?'#7B7F81':'#E6DCC6'); }
function tvMat(o){ if(o._pv) return null; if(!o.rancho) return {c:'#D9DEE1',t:'sem rancho'}; const e=dbEt(o);
  if(e.ent) return {c:'#7CC4A0',t:'material na linha'}; if(e.sep) return {c:'#9FC6D6',t:'separado · a caminho'}; if(e.env) return {c:'#E9B872',t:'almox separando'}; return {c:'#D9DEE1',t:'aguardando envio ao almox'}; }
function vTvFab(){ const T=S.tvf; if(T.rit&&T.fase===1&&document.body.classList.contains('tv')){ const rq=ritTvFab(); if(rq) return rq; } const {h,am:amU}=tvfAtivos(); const dia=T.dia||h; const agora=new Date(); const an=anuladas();
  if(!document.getElementById('mdfont')){ try{ const l=document.createElement('link'); l.id='mdfont'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }catch(e){} }
  const LT=linhasOrd(); const selL=T.linhas.filter(l=>LT.includes(l));
  const L=LT.filter(l=>!selL.length||selL.includes(l)).map(l=>{ const xs=corLista(l,dia); const par=dia===h?S.paradas.find(p=>p.linha===l&&!p.fim):null;
    const entH=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&e.linha===l&&hojeStr(new Date(e.em))===dia).reduce((a,e)=>a+(+e.qtd||0),0);
    const ini=new Date(dia+'T00:00:00').toISOString(); const prog=xs.reduce((a,x)=>a+(x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueAte(x,ini))),0);
    return {l,xs,par,entH,prog}; }).filter(r=>r.xs.length||r.par||selL.length);
  const pendDe=x=>x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueDe(x));
  const col=r=>{ const cor=corAtiva(r.l); const A=cor?corAvaliar(r.xs):null; const P=A?A.passos:[];
    const ab=r.xs.map((x,i)=>({x,i,p:P[i]})).filter(z=>pendDe(z.x)>0); const feitas=r.xs.length-ab.length; const cur=ab[0];
    const atras=r.xs.some(x=>!x._pv&&ordAtras(x,h)&&pendDe(x)>0);
    const st=r.par?{c:'#E59A98',t:'Parada · '+esc(r.par.motivo||'sem motivo')+' há '+dur(Date.now()-new Date(r.par.inicio))}
      :!r.xs.length?{c:'#D9DEE1',t:'Nada programado'}:!ab.length?{c:'#8DB4C9',t:'Tudo produzido'}
      :atras?{c:'#E9B872',t:'Atrasada'}:(dia===h&&(r.entH>0||(cur&&entregueDe(cur.x)>0)))?{c:'#7CC4A0',t:'Produzindo'}:{c:'#C5CDD1',t:dia===h?'Aguardando início':'Programada'};
    const nomeDe=x=>String(x.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,'').split(' ').map(w=>/^[A-Za-zÀ-ÿ]{4,}$/.test(w)?w.charAt(0).toUpperCase()+w.slice(1).toLowerCase():w).join(' ');
    const cod=x=>x._pv?(x.codigo||codigoDe(x)):codigoDe(x);
    const mat=x=>{ const m=tvMat(x); return m?`<div class="tv2-m"><i class="tv2-d" style="background:${m.c}"></i>${m.t}</div>`:'<div class="tv2-m"><i class="tv2-d" style="background:#D9DEE1"></i>previsão</div>'; };
    const corc=z=>z.p&&z.p.c?`<div class="tv2-m"><i class="tv2-sw" style="background:${tvSw(z.p.c)}"></i>${esc(z.p.c.nome)}</div>`:'';
    const limpa=z=>z.p&&z.p.t==='dolomita'?'<div class="tv2-lp">limpar com dolomita</div>':'';
    const pri=x=>{ const n=x._pv?0:dbPri(x); return n?`<span class="tv2-pr p${n}">${n===1?'prioridade':PRI[n].t.toLowerCase()}</span>`:''; };
    let now='';
    if(cur){ const x=cur.x, e=x._pv?0:entregueDe(x), tot=x._pv?(+x.qtd||0):(+x.total||0), pc=tot?Math.min(100,e/tot*100):0;
      now=`<div class="tv2-now">${limpa(cur)}<span class="tv2-cap">Agora</span><div class="tv2-cd">${esc(cod(x))}${pri(x)}</div><div class="tv2-nm">${esc(nomeDe(x))}</div>${corc(cur)}<div class="tv2-pb"><i style="width:${pc}%;background:${st.c}"></i></div><div class="tv2-qq"><b class="num">${f0(e)}</b> de ${f0(tot)} ${esc(x._pv?'':uA(x))}</div>${mat(x)}</div>`; }
    else now=`<div class="tv2-now tv2-vz">${r.xs.length?'Todas as ordens do dia produzidas':'Nada programado'+(dia===h?' hoje':'')}</div>`;
    const nx=ab.slice(1).map(z=>`${limpa(z)}<div class="tv2-nx"><div class="tv2-nh"><b>${esc(cod(z.x))}</b>${pri(z.x)}<span class="num">${f0(pendDe(z.x))}</span></div><small>${esc(nomeDe(z.x))}</small>${mat(z.x)}${corc(z)}</div>`).join('');
    return `<section class="tv2-col"><i class="tv2-bar" style="background:${st.c}"></i><div class="tv2-h">${esc(r.l)}</div><div class="tv2-st"><i class="tv2-d" style="background:${st.c}"></i>${st.t}</div>
      ${now}${ab.length>1?`<span class="tv2-cap tv2-lb">A seguir</span>${nx}`:''}${feitas?`<div class="tv2-ft">${feitas} ordem${feitas===1?'':'s'} já produzida${feitas===1?'':'s'}${r.prog?' · '+f0(r.entH)+' de '+f0(r.prog)+' no dia':''}</div>`:(r.prog&&r.entH?`<div class="tv2-ft">${f0(r.entH)} de ${f0(r.prog)} no dia</div>`:'')}</section>`; };
  const tit=(t=>t.charAt(0).toUpperCase()+t.slice(1))(new Date(dia+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}));
  return `<div class="tv2"><div class="tv2-top">${(document.querySelector('.brand img')||{}).src?`<img class="tv2-logo" src="${document.querySelector('.brand img').src}" alt="Colafix">`:''}<div><div class="tv2-ey">CHÃO DE FÁBRICA · PRODUÇÃO DO DIA${dia!==h?' · <span style="color:#9A6A1F">VENDO OUTRO DIA</span>':''}</div><h1>${esc(tit)}</h1></div><div class="tv2-ck num">${agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
   <div class="tvf-acts">${document.body.classList.contains('tv')?`<button class="btn sec" data-act="tvf-lista">Ver lista</button><button class="tv2-x" data-act="tv" title="Sair do modo TV" aria-label="Sair do modo TV">✕</button>`:`<button class="btn sec" data-act="tvf-rit" aria-pressed="${!!T.rit}" title="No modo TV, a cada 20 segundos mostra o Previsto × Realizado do mês">${T.rit?'✓ ':''}Alternar com o mês</button><button class="btn" data-act="tv">${ic('tv',18,2)}Tela cheia (modo TV)</button>`}</div></div>
   <div class="tvf-fil"><div class="seg" role="group" aria-label="Dia"><button data-act="tvf-dia" data-v="${h}" aria-pressed="${dia===h}">Hoje <small class="num">${dm(h)}</small></button><button data-act="tvf-dia" data-v="${amU}" aria-pressed="${dia===amU}">${amU===addDias(h,1)?'Amanhã':'Próximo dia útil'} <small class="num">${dm(amU)}</small></button></div>
    <input type="date" class="txt" id="tvf-data" value="${esc(dia)}" style="width:auto;height:38px" aria-label="Escolher dia">
    <div class="tvf-lins"><button class="tvf-l ${selL.length?'':'on'}" data-act="tvf-linha" data-v="">Todas as linhas</button>${LT.map(l=>`<button class="tvf-l ${selL.includes(l)?'on':''}" data-act="tvf-linha" data-v="${esc(l)}">${esc(l)}</button>`).join('')}</div></div>
   ${S.dbOk===false?'<div class="banner">Sem conexão com o armazenamento: a tela não está atualizando.</div>':''}
   <div class="tv2-g" style="--n:${Math.max(1,Math.min(L.length,8))}">${L.length?L.map(col).join(''):`<div class="empty">Nada programado para ${esc(dmTxt(dia))}${selL.length?' nas linhas escolhidas':''}.</div>`}</div>
   <div class="tv2-ft" style="margin-top:14px">Atualiza sozinha. Clique numa linha para filtrar; clique em várias para ver só elas. Material: vem do Diário de bordo do rancho. Cores e limpeza: Guia de Sequência de Cores.</div></div>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="tvf-"]'); if(!b) return; const T=S.tvf, a=b.dataset.act, v=b.dataset.v;
  if(a==='tvf-dia'){ T.dia=v===hojeStr()?'':v; render(); return; }
  if(a==='tvf-linha'){ if(!v) T.linhas=[]; else T.linhas=T.linhas.includes(v)?T.linhas.filter(x=>x!==v):[...T.linhas,v]; tvfSalvar(); render(); return; } });
document.addEventListener('change',ev=>{ if(ev.target.id==='tvf-data'&&ev.target.value){ S.tvf.dia=ev.target.value===hojeStr()?'':ev.target.value; render(); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="tvf-lista"]'); if(!b) return; go('programacao'); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="tvf-painel"]'); if(!b) return; go('tvfab'); });


// ================= 03/10: PREVISTO × REALIZADO (ritmo do mês, ideia da gerência) =================
// Previsto = previsão do Focco (RPRE0301, importada em Base de dados) dividida pelas linhas e pelos dias úteis.
// Realizado = entregas lançadas no painel (ou EPP do Extrato do Focco). Regras de status iguais às da planilha da gerência.
const RIT_PL=1.875; /* 7.500 papel ÷ 4.000 plástico por dia */
const RIT_PADRAO={linhas:['Linha 1','Linha 2'],itens:{
  AB0001:{d:{'Linha 2':100}},AB0002:{d:{'Linha 2':100},f:RIT_PL},AB0003:{d:{'Linha 2':100},f:RIT_PL},
  AC0002:{d:{'Linha 1':100},f:RIT_PL},AC0001:{d:{'Linha 1':100}},AC0003:{d:{'Linha 1':50,'Linha 2':50}},AC0005:{d:{'Linha 1':50,'Linha 2':50}},
  AC0009:{d:{'Linha 1':50,'Linha 2':50}},AC0017:{d:{'Linha 1':100}},AC0018:{d:{'Linha 1':50,'Linha 2':50}},AC0019:{d:{'Linha 1':50,'Linha 2':50}},
  AC0020:{d:{'Linha 1':50,'Linha 2':50}},AC0025:{d:{'Linha 1':50,'Linha 2':50},f:RIT_PL}}};
const RIT_FER_PADRAO=['2026-10-12'];
function ritCfg(){ const r=S.cfg&&S.cfg.ritmo; return r&&r.itens&&Array.isArray(r.linhas)?r:Object.assign({},RIT_PADRAO,{linhas:linhasOrd().slice()}); } /* sem configuração salva: acompanha todas as linhas */
function feriados(){ return (S.cfg&&Array.isArray(S.cfg.feriados))?S.cfg.feriados:RIT_FER_PADRAO; }
S.rit={cp:'',fonte:'painel',un:'sc',curva:'',tab:'linhas',cfg:false,ed:null,salvando:false};
function ritKg(c){ const I=((S.anl.base.itens||{}).l||{})[c]||{}; const d=String(I.d||((itemDe(c)||{}).descricao)||''); const m=d.match(/(\d+(?:[.,]\d+)?)\s*KG\b/i); const k=m?parseFloat(m[1].replace(',','.')):20; return k>0&&k<=60?k:20; }
function ritDesc(c){ const I=((S.anl.base.itens||{}).l||{})[c]||{}; return String(I.d||((itemDe(c)||{}).descricao)||'').trim(); }
function ritNome(c){ return ritDesc(c).replace(/^ARGAMASSA\s+/i,'').replace(/\s+EMB\b/i,'').replace(/\s+\d+(?:[.,]\d+)?\s*KG\b/i,'').replace(/\s+/g,' ').trim()||c; }
function ritMeses(){ const P=S.anl.base.prev||{}; return Object.keys(P.mes||{}).filter(cp=>Object.values(P.mes[cp]||{}).some(v=>v>0)).sort(); }

/* Curva S: todas as entregas do mês consultado, sem o limite das 1.000 mais recentes da tela.
   A faixa vai de 1 dia antes a 1 dia depois do mês (fuso: o horário gravado é UTC) e o filtro pelo dia local é feito em ritDados. */
S._ritEnt={}; const _ritSub={};
function ritEntMes(cp){ if(!S.db||!cp) return null; if(!_ritSub[cp]){ _ritSub[cp]=true; const a=new Date(+cp.slice(0,4),+cp.slice(5,7)-1,0), b=new Date(+cp.slice(0,4),+cp.slice(5,7),2);
    const de=a.toISOString().slice(0,10), ate=b.toISOString().slice(0,10);
    inscrever('ritent-'+cp,()=>S.db.collection('entregas').where('em','>=',de).where('em','<',ate).orderBy('em'),snap=>{ S._ritEnt[cp]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); }); }
  return S._ritEnt[cp]||null; }
function ritEntregas(cp){ const m=new Map(); (S.entregas||[]).forEach(e=>m.set(e._id,e)); (ritEntMes(cp)||[]).forEach(e=>m.set(e._id,e)); return [...m.values()]; }
function ritDados(cp,fonte){
  const P=S.anl.base.prev||{}; const pm=(P.mes||{})[cp]; if(!pm) return null;
  const C=ritCfg(), LT=linhasOrd(), LS=C.linhas.filter(l=>LT.includes(l)); if(!LS.length) return null;
  const ult=new Date(+cp.slice(0,4),+cp.slice(5,7),0).getDate(); const dias=[];
  for(let i=1;i<=ult;i++){ const d=cp+'-'+pad(i); if(anlUtil(d)) dias.push(d); }
  if(!dias.length) return null;
  const h=hojeStr(), n=dias.length;
  const its=Object.keys(C.itens).map(c=>{ const ci=C.itens[c]||{}, dv={}; let s=0; LS.forEach(l=>{ const p=+(ci.d||{})[l]||0; if(p>0){ dv[l]=p; s+=p; } }); for(const l in dv) dv[l]/=s;
    return {c,prev:+pm[c]||0,dv,f:+ci.f||1,kg:ritKg(c),nome:ritNome(c)}; }).filter(x=>Object.keys(x.dv).length);
  /* previsão comercial completa: itens não configurados entram pela linha cadastrada do item (dividido igual entre as linhas acompanhadas) */
  { const IL=((S.anl.base.itens||{}).l)||{}; Object.keys(pm).forEach(c=>{ if(C.itens[c]||!(+pm[c]>0)) return; const ls=anlLinhasDe(c,IL[c]).filter(l=>LS.includes(l)); if(!ls.length) return; const dv={}; ls.forEach(l=>dv[l]=1/ls.length); its.push({c,prev:+pm[c],dv,f:1,kg:ritKg(c),nome:ritNome(c),auto:true}); }); }
  const IC={}; its.forEach(x=>IC[x.c]=x);
  const diaUtil=d=>{ if(dias.includes(d)) return d; let k=null; for(const x of dias) if(x<d) k=x; return k||dias[0]; };
  const R={}, outros={}, sem={}; LS.forEach(l=>{ outros[l]=0; });
  const add=(d,l,c,q)=>{ if(!q) return; const k=diaUtil(d); const a=R[k]=R[k]||{}; const b=a[l]=a[l]||{}; b[c]=(b[c]||0)+q; };
  let fonteAte='';
  if(fonte==='focco'){ const V=S.anl.base.vendas||{}, D=V.diario||{}; fonteAte=V.ate||'';
    its.forEach(x=>{ const dd=D[x.c]||{}; for(const d in dd){ if(d.slice(0,7)!==cp) continue; const q=+((dd[d]||[])[0])||0; if(!q) continue; for(const l in x.dv) add(d,l,x.c,q*x.dv[l]); } }); }
  else { const EM=ritEntregas(cp), an=new Set(EM.filter(e=>e.anula).map(e=>e.anula)), OM={}; S.ordens.forEach(o=>OM[o._id]=o);
    EM.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em) return; const d=hojeStr(new Date(e.em)); if(d.slice(0,7)!==cp) return; const o=OM[e.ordem]; if(!o) return;
      const l=e.linha||o.linha, q=+e.qtd||0; if(!LS.includes(l)||!q) return; const c=codigoDe(o);
      if(!IC[c]){ outros[l]+=q; sem[c]=(sem[c]||0)+q; } add(d,l,c,q); }); }
  /* planejado: o que está programado no calendário (ordens + previsões sem número) por dia útil e linha */
  const PL={}, PLf={}; const addP=(d,l,q,f)=>{ if(!q||!LS.includes(l)) return; const k=diaUtil(d); const a=PL[k]=PL[k]||{}; a[l]=(a[l]||0)+q; const b=PLf[k]=PLf[k]||{}; b[l]=(b[l]||0)+q*(f||1); };
  const fDe=c=>{ const ci=C.itens[c]; return ci&&+ci.f>1?+ci.f:1; }, ini=cp+'-01', fimM=cp+'-'+pad(ult);
  S.ordens.forEach(o=>{ if(!o.linha||!LS.includes(o.linha)||['cancelada','excluida','vinculada'].includes(o.status)) return; const d0=o.data||''; if(!d0) return; const d1=o.ate&&o.ate>d0?o.ate:d0; if(d1<ini||d0>fimM) return;
    const ds=calDiasUteis(d0,d1,anlCfg().sab).filter(d=>anlUtil(d)); const dd=ds.length?ds:[d0]; const q=(+o.total||0)/dd.length; dd.forEach(d=>{ if(d.slice(0,7)===cp) addP(d,o.linha,q,fDe(codigoDe(o))); }); });
  (S.previsoes||[]).forEach(pv=>{ if(pv.status!=='prevista'||!pv.data||pv.data.slice(0,7)!==cp) return; addP(pv.data,pv.linha,+pv.qtd||0,fDe(pv.codigo||String(pv.produto||'').split(' - ')[0].trim())); });
  /* 1) meta de produção líquida = previsão comercial + estoque de segurança − estoque no início do mês (saldo do Focco recalculado para o dia 1) */
  { const B=S.anl.base, IL=((B.itens||{}).l)||{}, sAt=String(((B.itens||{}).atual||{}).SALDO||'').slice(0,10), V=B.vendas||{}, DV=V.diario||{}, i0=cp+'-01';
    its.forEach(x=>{ const it=IL[x.c]||{}, dd=DV[x.c]||{}; x.prevCom=x.prev; let fat=0; for(const d in dd){ if(d.slice(0,7)===cp) fat+=+((dd[d]||[])[1])||0; } x.fat=fat;
      if(!sAt){ x.ei=null; x.metaL=x.prev; } else { let ei=(+it.a3||0)+(+it.a30||0); for(const d in dd){ const v=dd[d]||[], m=(+v[0]||0)-(+v[1]||0); if(d>sAt&&d<i0) ei+=m; else if(d>=i0&&d<=sAt) ei-=m; } x.ei=Math.max(0,ei); x.seg=+it.seg||0; x.metaL=Math.max(0,Math.round(x.prev+x.seg-x.ei)); }
      if((S.rit.meta||'liq')==='liq') x.prev=x.metaL; }); }
  /* 3) aderência ao programa: do que estava programado para o dia em cada ordem, quanto saiu no próprio dia */
  const ADH={}; if(fonte!=='focco'){ const EM=ritEntregas(cp), an=new Set(EM.filter(e=>e.anula).map(e=>e.anula)), feito={}; EM.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em) return; const d=hojeStr(new Date(e.em)); if(d.slice(0,7)!==cp) return; const k=diaUtil(d)+'|'+e.ordem; feito[k]=(feito[k]||0)+(+e.qtd||0); });
    S.ordens.forEach(o=>{ if(!o.linha||!LS.includes(o.linha)||['cancelada','excluida','vinculada'].includes(o.status)) return; const d0=o.data||''; if(!d0) return; const d1=o.ate&&o.ate>d0?o.ate:d0; if(d1<ini||d0>fimM) return;
      const ds=calDiasUteis(d0,d1,anlCfg().sab).filter(d=>anlUtil(d)); const dd=ds.length?ds:[d0]; const q=(+o.total||0)/dd.length;
      dd.forEach(d=>{ if(d.slice(0,7)!==cp||d>h) return; const k=diaUtil(d); const a=ADH[k]=ADH[k]||{}; const b=a[o.linha]=a[o.linha]||{pl:0,ok:0}; b.pl+=q; b.ok+=Math.min(q,feito[k+'|'+o._id]||0); }); }); }
  /* 4) paradas do mês por linha (minutos e motivos) */
  const PAR={}; { const t0=new Date(cp+'-01T00:00:00').getTime(), t1=Math.min(Date.now(),new Date(fimM+'T23:59:59').getTime());
    (S.paradas||[]).forEach(p=>{ if(!LS.includes(p.linha)||!p.inicio) return; const a=Math.max(t0,new Date(p.inicio).getTime()), b=Math.min(t1,p.fim?new Date(p.fim).getTime():Date.now()); if(b<=a) return; const m=(b-a)/6e4; const P=PAR[p.linha]=PAR[p.linha]||{min:0,mot:{}}; P.min+=m; const k=p.motivo||'Sem motivo'; P.mot[k]=(P.mot[k]||0)+m; }); }
  /* 5) capacidade real: média dos últimos 20 dias úteis com produção, por linha */
  const {CAPR,CAPRi}=capRealCalc(LS,h);
  /* 6) plano da manhã (fotos do programa guardadas a cada dia) */
  const SN={}; (S.rit.snaps||[]).forEach(z=>{ if(z.data&&z.data.slice(0,7)===cp&&z.l) SN[diaUtil(z.data)]=z.l; });
  const temDia=d=>!!R[d]&&Object.values(R[d]).some(b=>Object.values(b).some(v=>v>0));
  let cut=null; dias.forEach(d=>{ if(d<h||(d===h&&temDia(d))) cut=d; });
  if(fonte==='focco'&&fonteAte&&cut&&cut>fonteAte){ let k=null; dias.forEach(d=>{ if(d<=fonteAte) k=d; }); cut=k; }
  return {cp,fonte,fonteAte,LS,dias,n,its,IC,R,PL,PLf,ADH,PAR,CAPR,CAPRi,SN,jor:+C.jornada||528,fatAte:(S.anl.base.vendas||{}).ate||'',cut,h,outros,sem,prevEm:(P.mesEm||{})[cp]||''};
}
// série diária de um recorte: {l} linha, {ls} grupo de linhas, {c} item; sem nada = total
function ritInL(f,l){ return f.l?l===f.l:f.ls?f.ls.includes(l):true; }
function ritSerie(D,f){ f=f||{}; return D.dias.map(d=>{ let p=0,r=0; D.its.forEach(x=>{ if(f.c&&x.c!==f.c) return; for(const l in x.dv){ if(!ritInL(f,l)) continue; p+=x.prev*x.dv[l]/D.n; } });
  const a=D.R[d]||{}; for(const l in a){ if(!ritInL(f,l)) continue; for(const c in a[l]){ if(f.c&&c!==f.c) continue; r+=a[l][c]; } }
  let pl=0, plf=0, ap=0, ok=0, sn=null; if(!f.c){ const b=(D.PL||{})[d]||{}, bf=(D.PLf||{})[d]||{}, ad=(D.ADH||{})[d]||{}, sd=(D.SN||{})[d]; for(const l in b){ if(!ritInL(f,l)) continue; pl+=b[l]; plf+=bf[l]||b[l]; }
    for(const l in ad){ if(!ritInL(f,l)) continue; ap+=ad[l].pl; ok+=ad[l].ok; } if(sd){ sn=0; for(const l in sd){ if(ritInL(f,l)) sn+=sd[l]; } } }
  return {d,p,r,pl,plf,ap,ok,sn}; }); }
function ritStats(D,f){ f=f||{}; const s=ritSerie(D,f), c=D.cut, up=s.filter(x=>c&&x.d<=c);
  const T=s.reduce((a,x)=>a+x.p,0), pa=up.reduce((a,x)=>a+x.p,0), ra=s.reduce((a,x)=>a+x.r,0), rem=s.filter(x=>!c||x.d>c).length, sal=T-ra;
  const LSf=f.c?[]:D.LS.filter(l=>ritInL(f,l)); const cd=LSf.reduce((a,l)=>a+capDe(l),0), cdR=LSf.some(l=>(D.CAPR||{})[l])?LSf.reduce((a,l)=>a+((D.CAPR||{})[l]||capDe(l)),0):0; /* só usa a capacidade real quando todas as linhas do recorte têm histórico */
  let pf=0,pp=0,pk=0,pc=0,ei=0,fat=0; D.its.forEach(x=>{ if(f.c&&x.c!==f.c) return; for(const l in x.dv){ if(!ritInL(f,l)) continue; const q=x.prev*x.dv[l]; pp+=q; pf+=q*x.f; pk+=q*x.kg; pc+=(x.prevCom||0)*x.dv[l]; ei+=(x.ei||0)*x.dv[l]; fat+=(x.fat||0)*x.dv[l]; } });
  const fm=pp?pf/pp:1, kg=pp?pk/pp:20;
  let z=0; for(let i=up.length-1;i>=0&&up[i].r<=0&&up[i].p>0;i--) z++;
  const need=rem?Math.max(0,sal)/rem:0, du=up.length;
  const PLt=s.reduce((a,x)=>a+x.pl,0), pla=up.reduce((a,x)=>a+x.pl,0), rau=up.reduce((a,x)=>a+x.r,0), capM=cd*s.length, sobre=cd?s.filter(x=>x.plf>cd*1.001).map(x=>x.d):[], ocup=capM?s.reduce((a,x)=>a+x.plf,0)/capM:0;
  const adP=up.reduce((a,x)=>a+x.ap,0), adO=up.reduce((a,x)=>a+x.ok,0), sd=up.filter(x=>x.sn!=null), snT=sd.reduce((a,x)=>a+x.sn,0), snD=sd.reduce((a,x)=>a+Math.abs(x.pl-x.sn),0);
  let pmin=0, perda=0; const mot={}; LSf.forEach(l=>{ const P=(D.PAR||{})[l]; if(!P) return; pmin+=P.min; const cl=capDe(l), jm=D.jor||528; const lost=cl?P.min/jm*cl:0; perda+=lost; for(const m in P.mot) mot[m]=(mot[m]||0)+P.mot[m]; });
  return {s,T,pa,ra,rem,sal,need,needEq:need*fm,fm,kg,cd,cdR,cap:cd*rem,ratio:pa?ra/pa:1,dev:ra-pa,z,n:s.length,du,proj:du?Math.round(ra/du*s.length):0,PLt,pla,devPl:rau-pla,capM,sobre,ocup,comOcup:capM?T*fm/capM:0,
    pc,ei,fat,ader:adP?adO/adP:null,adP,replan:snT?snD/snT:null,snDias:sd.length,pmin,perda,mot}; }
function ritSt(k){ if(!k.du) return {t:'Aguardando lançamentos',c:'neu'}; if(k.sal<=0&&k.T>0) return {t:'Concluído',c:'ok'};
  { const cp=k.cdR||k.cd; if((cp&&k.needEq>cp)||k.z>=3) return {t:'Risco',c:'crit'}; } const r=k.ratio;
  return r>=1.05?{t:'Adiantado',c:'ok'}:r>=1?{t:'Dentro do plano',c:'ok'}:r>=.95?{t:'Em atenção',c:'warn'}:r>=.9?{t:'Atrasado',c:'warn'}:{t:'Risco',c:'crit'}; }
function ritQ(v,k){ return S.rit.un==='t'?(Math.round(v*(k||20)/100)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}):anlN(v); }
function ritU(){ return S.rit.un==='t'?'t':'sacos'; }
function ritMesNome(cp){ return (ANL_MESES[+cp.slice(5,7)-1]||'')+'/'+cp.slice(0,4); }
function ritAlertas(D){ const A=[]; const mes=(ANL_MESES[+D.cp.slice(5,7)-1]||'').toLowerCase();
  ritAtivas(D).forEach(l=>{ const k=ritStats(D,{l}); if(!k.T) return;
    if(k.du&&(k.cdR||k.cd)&&k.needEq>(k.cdR||k.cd)) A.push({c:'crit',t:`${l}: precisa de ${anlN(k.need)} sacos/dia${k.fm>1.01?` (≈ ${anlN(k.needEq)} em equivalente papel)`:''}, acima ${k.cdR?`do que a linha tem feito (${anlN(k.cdR)}/dia · nominal ${anlN(k.cd)})`:`da capacidade de ${anlN(k.cd)}/dia`}.`,s:'Com o ritmo da capacidade, a linha não fecha o mês. Vale rever a divisão entre as linhas, hora extra ou sábado.'});
    else if(k.du&&k.dev<0) A.push({c:'warn',t:`${l} está ${anlN(-k.dev)} sacos abaixo da meta acumulada.`,s:`Para cumprir a meta de ${mes}: ${anlN(k.need)} sacos/dia nos próximos ${k.rem} dias úteis.`});
    if(k.z>=2) A.push({c:k.z>=3?'crit':'warn',t:`${l}: ${k.z} dias úteis seguidos sem produção dos itens da meta.`,s:''}); });
  const sl=D.dias.filter(d=>d<D.h&&(!D.cut||d<=D.cut)&&!(D.R[d]&&Object.values(D.R[d]).some(b=>Object.values(b).some(v=>v>0))));
  if(sl.length&&D.fonte==='painel') A.push({c:'warn',t:`Dias úteis sem nenhuma entrega lançada nas linhas: ${sl.map(dm).join(', ')}.`,s:'Se houve produção, faltou lançar a entrega no painel.'});
  const par=D.its.filter(x=>x.prev>0).map(x=>({x,k:ritStats(D,{c:x.c})})).filter(o=>o.k.z>=2&&o.k.sal>0&&o.k.ra>0);
  if(par.length) A.push({c:'warn',t:`Itens parados há 2 dias úteis ou mais, com saldo: ${par.map(o=>esc(o.x.c)+' ('+o.k.z+'d)').join(', ')}.`,s:''});
  return A; }

function ritTicks(lo,hi,n){ const span=Math.max(1,hi-lo), raw=span/n, mag=Math.pow(10,Math.floor(Math.log10(raw))); const st=[1,2,2.5,5,10].map(m=>m*mag).find(x=>x>=raw)||10*mag;
  const t0=Math.floor(lo/st)*st, out=[]; for(let v=t0; v<=hi+st*0.999&&out.length<12; v+=st) out.push(Math.round(v*1000)/1000); return out; }
function ritCurva(D,f,o){ o=o||{}; const k=ritStats(D,f), s0=k.s; const big=!!o.big; const W=o.w||820, Hc=o.h||340, pl=big?84:66, pr=big?160:136, pt=26, fs=big?16:13;
  const band=o.dia===false?0:(big?110:78), gapB=band?18:0, pbx=34, H=Hc+band+gapB;
  let ap=0, ar=0, apl=0; const P0=[], R0=[], L0=[]; let ultPl=-1; s0.forEach((x,i)=>{ ap+=x.p; ar+=x.r; apl+=x.pl||0; P0.push(ap); L0.push(apl); if((x.pl||0)>0) ultPl=i; if(D.cut&&x.d<=D.cut) R0.push(ar); });
  const ci0=R0.length-1, ritmo=k.du?k.ra/k.du:0;
  let a=0, b=s0.length-1; if(o.jan==='perto'){ const ref=ci0>=0?ci0:Math.max(0,s0.findIndex(x=>x.d>=D.h)); a=Math.max(0,ref-6); b=Math.min(s0.length-1,ref+5); }
  const z=a===0?1:0; // ponto zero no início do mês
  const s=s0.slice(a,b+1), P=(z?[0]:[]).concat(P0.slice(a,b+1)), Rr=(z?[0]:[]).concat(R0.slice(a,Math.min(b+1,R0.length))), ci=Rr.length-1;
  const temPl=!(f&&f.c)&&L0.some(v=>v>0); const fimPl=Math.max(ultPl,ci0); const Lp=temPl?(z?[0]:[]).concat(L0.slice(a,Math.min(b,fimPl)+1)):[];
  const n=s.length+z, fim=b===s0.length-1, prev=P[P.length-1], projV=fim?k.proj:(ci0>=0?R0[ci0]+ritmo*(b-ci0):0);
  const temProj=ci0>=a&&ci0<b&&k.du;
  const vals=P.concat(Rr,Lp,temProj?[projV]:[]); const vmin=Math.min(...vals), vmax=Math.max(1,...vals);
  const ts=ritTicks(a>0?vmin*0.97:0,vmax*1.03,5); const y0=ts[0], y1=Math.max(ts[ts.length-1],vmax);
  const yb=band?Hc-6:Hc-pbx; // base da curva
  const X=i=>pl+(W-pl-pr)*(n<2?0.5:i/(n-1)), Y=v=>pt+(yb-pt)*(1-(v-y0)/(y1-y0));
  const ln=arr=>arr.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  const hi=s.findIndex(x=>x.d>=D.h), hx=hi>=0?hi+z:-1, atras=k.dev<0;
  const gap=ci>=1?`<path d="${ln(P.slice(0,ci+1))} ${Rr.slice().reverse().map((v,j)=>'L'+X(ci-j).toFixed(1)+' '+Y(v).toFixed(1)).join(' ')} Z" fill="${atras?'var(--crit)':'var(--ok)'}" opacity=".16"/>`:'';
  const area=ci>=1?`<path d="${ln(Rr)} L${X(ci).toFixed(1)} ${Y(y0).toFixed(1)} L${X(0).toFixed(1)} ${Y(y0).toFixed(1)} Z" fill="var(--anl-s1)" opacity=".08"/>`:'';
  const proj=temProj?`<path d="M${X(ci).toFixed(1)} ${Y(Rr[ci]).toFixed(1)} L${X(n-1).toFixed(1)} ${Y(projV).toFixed(1)}" fill="none" stroke="var(--anl-s1)" stroke-width="2.2" stroke-dasharray="2 6" stroke-linecap="round" opacity=".8"/>`:'';
  const ev=Math.max(1,Math.ceil(s.length/(W<700?6:big?12:9)));
  const xe=X(n-1)+10; let yP=Y(prev), yJ=temProj?Y(projV):null; if(yJ!=null&&Math.abs(yJ-yP)<fs*2.6){ if(yJ>yP) yJ=yP+fs*2.6; else yP=yJ+fs*2.6; }
  const pctP=fim&&k.T?Math.round(k.proj/k.T*100):(prev?Math.round(projV/prev*100):0), dFim=dm(s[s.length-1].d);
  const lab=(y,t1,t2,c)=>`<text x="${xe}" y="${(y-2).toFixed(1)}" font-size="${fs}" font-weight="700" fill="${c}">${t1}</text><text x="${xe}" y="${(y+fs).toFixed(1)}" font-size="${fs-1.5}" fill="var(--muted)">${t2}</text>`;
  const bw=big?116:92, bh=big?30:24;
  const ultR=ci>=1||(ci===0&&!z)?(()=>{ const bx=Math.min(Math.max(pl,X(ci)-bw/2),W-pr-bw); return `<circle cx="${X(ci)}" cy="${Y(Rr[ci])}" r="${big?7:5.5}" fill="var(--surface)" stroke="var(--anl-s1)" stroke-width="3"/>
     <g><rect x="${bx.toFixed(1)}" y="${(Y(Rr[ci])-bh-14).toFixed(1)}" width="${bw}" height="${bh}" rx="6" fill="var(--anl-s1)"/><text x="${(bx+bw/2).toFixed(1)}" y="${(Y(Rr[ci])-14-bh*0.3).toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#fff">${ritQ(Rr[ci],k.kg)}</text></g>`; })():'';
  // faixa dia a dia: produção do dia × meta do dia
  let faixa='';
  if(band){ const by0=Hc+gapB, by1=H-pbx, mxD=Math.max(1,...s.map(x=>Math.max(x.r,x.p)))*1.1, bwD=Math.max(4,Math.min(big?34:24,(W-pl-pr)/n*0.55));
    const YB=v=>by1-(by1-by0)*(v/mxD);
    faixa=`<text x="${pl-10}" y="${by0+10}" text-anchor="end" font-size="${fs-2}" fill="var(--muted)">por dia</text><line x1="${pl}" x2="${W-pr}" y1="${by1}" y2="${by1}" stroke="var(--line)"/>`+
      s.map((x,i)=>{ const cx=X(i+z), fut=!D.cut||x.d>D.cut; const bar=fut?'':`<rect x="${(cx-bwD/2).toFixed(1)}" y="${YB(x.r).toFixed(1)}" width="${bwD.toFixed(1)}" height="${Math.max(1,by1-YB(x.r)).toFixed(1)}" rx="2" fill="${x.r>=x.p*0.95?'var(--ok)':'var(--crit)'}" opacity="${x.d===D.cut?1:.85}"/>`;
        return bar+`<line x1="${(cx-bwD/2-3).toFixed(1)}" x2="${(cx+bwD/2+3).toFixed(1)}" y1="${YB(x.p).toFixed(1)}" y2="${YB(x.p).toFixed(1)}" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="3 2" opacity=".6"/>`; }).join('')+
      `<text x="${xe}" y="${by0+12}" font-size="${fs-1.5}" fill="var(--muted)">meta do dia</text><text x="${xe}" y="${by0+12+fs}" font-size="${fs-1.5}" fill="var(--muted)">${ritQ(s.length?s[0].p:0,k.kg)}</text>`; }
  // áreas de leitura (passar o mouse)
  let aP=a>0?P0[a-1]:0, aR=a>0?(R0[a-1]||0):0, aL=a>0?L0[a-1]:0;
  const tips=s.map((x,i)=>{ aP+=x.p; aL+=x.pl||0; const fut=!D.cut||x.d>D.cut; if(!fut) aR+=x.r; const cx=X(i+z), w=(W-pl-pr)/Math.max(1,n-1);
    const t=[DIAS_CAL[new Date(x.d+'T12:00:00').getDay()]+' '+dm(x.d), 'Meta do dia: '+ritQ(x.p,k.kg), fut?'Ainda não apontado':'Apontado no dia: '+ritQ(x.r,k.kg), 'Meta acumulada: '+ritQ(aP,k.kg), fut?'':'Apontado acumulado: '+ritQ(aR,k.kg)+' ('+(aR-aP>0?'+':'')+ritQ(aR-aP,k.kg)+')', temPl&&!(f&&f.c)?'Planejado acumulado: '+ritQ(aL,k.kg):''].filter(Boolean).join('|');
    return `<rect class="rit-hv" x="${(cx-w/2).toFixed(1)}" y="${pt}" width="${w.toFixed(1)}" height="${(H-pt-pbx+(band?0:0)).toFixed(1)}" fill="transparent" data-tip="${esc(t)}"/>`; }).join('');
  const xlab=(i,t)=>`<text x="${X(i)}" y="${H-10}" text-anchor="middle" font-size="${fs-1}" fill="var(--muted)">${t}</text>`;
  return `<svg class="chart rit-cv" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva S: meta ${anlN(prev)} até ${dFim}, apontado ${anlN(ar)}">
   ${ts.filter(t=>t<=y1+0.5).map(t=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line-2)"/><text x="${pl-10}" y="${Y(t)+4}" text-anchor="end" font-size="${fs-1}" fill="var(--muted)">${ritQ(t,k.kg)}</text>`).join('')}
   ${hx>=0?`<rect x="${X(hx)-0.5}" y="${pt}" width="1" height="${H-pt-pbx}" fill="var(--teal)" opacity=".45"/><text x="${X(hx)}" y="${pt-9}" text-anchor="middle" font-size="${fs-1}" font-weight="700" fill="var(--teal-strong)">hoje</text>`:''}
   ${area}${gap}
   <path d="${ln(P)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="7 6" opacity=".75"/>
   ${Lp.length>1?`<path d="${ln(Lp)}" fill="none" stroke="var(--warn)" stroke-width="2.4" stroke-linejoin="round" opacity=".95"/>${Lp.length<n&&Lp.length-1>ci?`<circle cx="${X(Lp.length-1)}" cy="${Y(Lp[Lp.length-1])}" r="4" fill="var(--warn)"/><text x="${X(Lp.length-1)+8}" y="${Y(Lp[Lp.length-1])+4}" font-size="${fs-2}" fill="var(--warn-ink)">fim da programação</text>`:''}`:''}
   ${proj}
   ${Rr.length>1?`<path d="${ln(Rr)}" fill="none" stroke="var(--anl-s1)" stroke-width="${big?4.5:3.5}" stroke-linejoin="round" stroke-linecap="round"/>`:''}
   ${ultR}
   ${lab(yP,ritQ(prev,k.kg),fim?'meta no mês':'meta até '+dFim,'var(--ink-2)')}
   ${temProj?lab(yJ,ritQ(projV,k.kg),'no ritmo · '+pctP+'%',pctP<97?'var(--crit-ink)':'var(--ok-ink)'):''}
   ${faixa}
   ${z&&ev===1?xlab(0,'início'):''}${s.map((x,i)=>i%ev===0||i===s.length-1?xlab(i+z,dm(x.d)):'').join('')}
   ${tips}
  </svg>`; }
// dica ao passar o mouse na curva
(function(){ let tip=null; const pos=ev=>{ if(!tip) return; const w=tip.offsetWidth, h=tip.offsetHeight; let x=ev.clientX+14, y=ev.clientY+14; if(x+w>innerWidth-8) x=ev.clientX-w-14; if(y+h>innerHeight-8) y=ev.clientY-h-14; tip.style.left=x+'px'; tip.style.top=y+'px'; };
  document.addEventListener('mouseover',ev=>{ const r=ev.target.closest&&ev.target.closest('.rit-hv'); if(!r) return; if(!tip){ tip=document.createElement('div'); tip.className='rit-tip'; document.body.appendChild(tip); }
    const ls=String(r.dataset.tip||'').split('|'); tip.innerHTML='<b>'+esc(ls[0])+'</b>'+ls.slice(1).map(l=>'<span>'+esc(l)+'</span>').join(''); tip.hidden=false; r.classList.add('on'); pos(ev); });
  document.addEventListener('mousemove',ev=>{ if(tip&&!tip.hidden&&ev.target.closest&&ev.target.closest('.rit-hv')) pos(ev); });
  document.addEventListener('mouseout',ev=>{ const r=ev.target.closest&&ev.target.closest('.rit-hv'); if(r){ r.classList.remove('on'); if(tip) tip.hidden=true; } }); })();

// Curva S: alterna sozinha entre Consolidado e cada linha (para quando alguém clica num recorte)
const RIT_CV_MS=10000;
function ritCvAuto(D){ const ops=ritCvOps(D); const ts=ops.map(o=>{ try{ return ritStats(D,o.f).T; }catch(e){ return 0; } }); const mx=Math.max(1,...ts); const xs=ops.filter((o,i)=>i===0||o.k.startsWith('g:')||ts[i]>=mx*0.12).slice(0,6); return xs.length?xs:ops; }
function ritAtivas(D){ return D.LS.filter(l=>{ const k=ritStats(D,{l}); return k.T>0||k.ra>0||k.PLt>0; }); }
function ritFams(D){ const L=ritAtivas(D), ar=L.filter(l=>ritFam(l)==='arg'), rj=L.filter(l=>ritFam(l)==='rej'); return {L,ar,rj,mist:!!(ar.length&&rj.length)}; }
function ritCvOps(D){ const F=ritFams(D); return [{k:'',t:F.mist?'Argamassas':'Consolidado',f:F.mist?{ls:F.ar}:{}}].concat(F.mist?[{k:'g:rej',t:'Rejuntes e outros',f:{ls:F.rj}}]:[],F.L.map(l=>({k:'l:'+l,t:l,f:{l}}))); }
function ritCvAtual(D,forcaAuto){ const A=S.rit, ops=ritCvOps(D);
  if(forcaAuto||A.auto){ const au=ritCvAuto(D); return au[Math.floor(Date.now()/RIT_CV_MS)%au.length]; }
  if(A.curva.startsWith('c:')){ const c=A.curva.slice(2), x=D.IC[c]; return {k:A.curva,t:c+(x?' · '+x.nome:''),f:{c}}; }
  return ops.find(o=>o.k===A.curva)||ops[0]; }
function ritCvBox(D,tv){ const A=S.rit, op=ritCvAtual(D,tv), k=ritStats(D,op.f), st=ritSt(k), auto=tv||A.auto;
  const n=ritCvAuto(D).length, i=ritCvAuto(D).findIndex(o=>o.k===op.k), atraso=-(Date.now()%RIT_CV_MS);
  const st4=(a,b,c)=>`<div class="rit-cvk ${c||''}"><span>${a}</span><b class="num">${b}</b></div>`;
  return `<div class="rit-cvh"><div class="rit-cvt"><span class="rit-cvn">${esc(op.t)}</span><span class="pill ${st.c}">${st.t}</span>${auto&&!op.f.c?`<span class="rit-cvpg num">${i+1}/${n}</span>`:''}</div>
    <div class="rit-cvks">${st4('Meta até hoje',ritQ(k.pa,k.kg))}${st4('Apontado',ritQ(k.ra,k.kg))}${st4('Desvio',(k.dev>0?'+':'')+ritQ(k.dev,k.kg),k.dev<0?'neg':'pos')}${st4('Precisa por dia',k.rem?ritQ(k.need,k.kg):'—',k.cd&&k.needEq>k.cd?'neg':'')}</div></div>
   ${auto&&!op.f.c?`<div class="rit-prog"><i style="animation-delay:${atraso}ms"></i></div>`:'<div class="rit-prog off"></div>'}
   <div class="rit-cvsvg">${ritCurva(D,op.f,Object.assign(tv?{w:1240,h:560,big:true}:{},{jan:ritJan(D)}))}</div>`; }
function ritJan(D){ const j=S.rit.jan||'auto'; if(j!=='auto') return j; const k=ritStats(D,{}); return k.du<=6&&k.n>12?'perto':'mes'; }
S.rit.auto=true; S.rit._cvi=-1; S.rit.jan='auto';
setInterval(()=>{ try{ const A=S.rit; const tvf=S.view==='tvfab'&&S.tvf&&S.tvf.rit&&S.tvf.fase===1&&document.body.classList.contains('tv'); const spl=S.view==='tvsplit'&&!!document.getElementById('rit-cvbox'); /* tela dividida com o Previsto × Realizado */ if(S.view!=='anlrit'&&!tvf&&!spl) return;
  const tv=tvf||document.body.classList.contains('tv'); if(!tv&&!A.auto) return;
  const box=document.getElementById('rit-cvbox'); if(!box) return;
  const D=tvf?ritDados(hojeStr().slice(0,7),'painel'):ritDados(A.cp,A.fonte); if(!D) return;
  const ops=ritCvAuto(D), idx=Math.floor(Date.now()/RIT_CV_MS)%ops.length; if(idx===A._cvi) return; A._cvi=idx;
  box.classList.remove('troca'); void box.offsetWidth; box.innerHTML=ritCvBox(D,tv); box.classList.add('troca');
  document.querySelectorAll('[data-act="rit-curva"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===ops[idx].k)));
  document.querySelectorAll('.rtv-t[data-k]').forEach(t=>t.classList.toggle('on',t.dataset.k===ops[idx].k)); }catch(e){} },500);

function ritPainel(D,f,tit,big,ton){ const k=ritStats(D,f), st=ritSt(k), kg=k.kg; const _un=S.rit.un; if(ton) S.rit.un='t'; try{ const pct=k.T?Math.round(k.ra/k.T*100):0, rit=k.pa?Math.round(k.ra/k.pa*100):null;
  const row=(a,b,cls)=>`<div class="rit-r ${cls||''}"><span>${a}</span><b class="num">${b}</b></div>`;
  return `<section class="card rit-p ${st.c}"><div class="rit-ph"><h2>${esc(tit)}</h2><span class="pill ${st.c}">${st.t}</span></div>
   <div class="rit-big"><b class="num">${ritQ(k.ra,kg)}</b><span>apontado de ${ritQ(k.T,kg)} ${ritU()} da meta · ${pct}%</span></div>
   <div class="rit-bar" title="Realizado sobre o previsto do mês"><i style="width:${Math.min(100,pct)}%"></i>${k.T&&k.pa?`<em style="left:${Math.min(100,k.pa/k.T*100)}%" title="Previsto até hoje"></em>`:''}</div>
   ${row((S.rit.meta||'liq')==='liq'?'Meta de produção até hoje':'Meta comercial até hoje',ritQ(k.pa,kg))}
   ${row('Apontado × meta',(k.dev>0?'+':'')+ritQ(k.dev,kg),k.dev<0?'neg':'pos')}
   ${f.c?'':row('Planejado no mês',ritQ(k.PLt,kg)+(k.capM?' <small>'+Math.round(k.ocup*100)+'% da capac.</small>':''),k.ocup>1?'neg':'')}
   ${f.c?'':row('Planejado até hoje',ritQ(k.pla,kg))}
   ${f.c?'':row('Apontado × planejado',(k.devPl>0?'+':'')+ritQ(k.devPl,kg),k.devPl<0?'neg':'pos')}
   ${f.c||!k.sobre.length?'':row('Dias acima da capacidade',k.sobre.length,'neg')}
   ${row('% sobre a meta até hoje',rit==null?'—':rit+'%')}
   ${row('Saldo do mês',ritQ(Math.max(0,k.sal),kg))}
   ${row('Necessário por dia útil',k.rem?ritQ(k.need,kg)+(f.l||!f.c?' <small>de '+ritQ(k.cd,kg)+'</small>':''):'—',k.cd&&k.needEq>k.cd?'neg':'')}
   ${row('Dias úteis restantes',k.rem)}
   ${f.c?'':row('Aderência ao programa',k.ader==null?'—':Math.round(k.ader*100)+'%',k.ader!=null&&k.ader<.85?'neg':'')}
   ${f.c||!k.pmin?'':row('Perdido em paradas','≈ '+ritQ(k.perda,kg)+' <small>'+ritH(k.pmin)+'</small>','neg')}
   ${f.c||!k.cdR?'':row('Capacidade real',ritQ(k.cdR,kg)+(k.cd?' <small>'+Math.round(k.cdR/k.cd*100)+'% da nominal</small>':''),k.cd&&k.cdR<k.cd*.85?'neg':'')}
   ${k.cd?row('Capacidade restante',ritQ(k.cap,kg)):''}
   ${k.du?row('No ritmo atual fecha em',ritQ(k.proj,kg)+' <small>'+(k.T?Math.round(k.proj/k.T*100):0)+'%</small>'):''}
   ${f.l&&D.outros[f.l]>0?`<div class="rit-nt">Inclui ${anlN(D.outros[f.l])} sacos apontados de itens sem previsão comercial.</div>`:''}</section>`; } finally{ S.rit.un=_un; } }

function ritTabProd(D){ const xs=D.its.filter(x=>x.prev>0||(x.prevCom||0)>0||ritStats(D,{c:x.c}).ra>0).map(x=>{ const k=ritStats(D,{c:x.c}); let ul=''; k.s.forEach(y=>{ if(y.r>0) ul=y.d; }); return {x,k,ul}; })
   .sort((a,b)=>b.x.prev-a.x.prev);
  const st=o=>{ const k=o.k; if(k.T>0&&k.sal<=0) return '<span class="pill ok">Concluído</span>'; if(!k.ra) return D.cut?'<span class="pill neu">Não iniciado</span>':'<span class="pill dash">Aguardando</span>';
    if(k.z>=2) return `<span class="pill warn">Parado há ${k.z} dias</span>`; return '<span class="pill prod">Em produção</span>'; };
  const div=x=>Object.keys(x.dv).map(l=>esc(l.replace(/^Linha\s*/,'L'))+(Object.keys(x.dv).length>1?' '+Math.round(x.dv[l]*100)+'%':'')).join(' · ');
  return `<div class="dbw"><table class="dbt rit-t" style="min-width:1080px"><thead><tr><th>Item</th><th>Linhas</th><th style="text-align:right">Comercial</th><th style="text-align:right">Estoque dia 1</th><th style="text-align:right">Faturado</th><th style="text-align:right">${(S.rit.meta||'liq')==='liq'?'Meta produção':'Meta'}</th><th style="text-align:right">Apontado</th><th style="text-align:right">Saldo</th><th style="min-width:150px">% do mês</th><th>Última produção</th><th>Situação</th></tr></thead><tbody>
   ${xs.map(o=>`<tr><td><b>${esc(o.x.c)}</b><small>${esc(o.x.nome)}${o.x.f>1.01?' · plástico':''}</small></td><td class="dbn">${div(o.x)}</td><td class="num" style="text-align:right">${ritQ(o.x.prevCom||0,o.x.kg)}</td><td class="num" style="text-align:right">${o.x.ei==null?'—':ritQ(o.x.ei,o.x.kg)}</td><td class="num" style="text-align:right">${ritQ(o.x.fat||0,o.x.kg)}</td><td class="num" style="text-align:right">${ritQ(o.k.T,o.x.kg)}</td><td class="num" style="text-align:right"><b>${ritQ(o.k.ra,o.x.kg)}</b></td><td class="num" style="text-align:right">${ritQ(Math.max(0,o.k.sal),o.x.kg)}</td>
    <td>${anlBarPct(o.k.T?o.k.ra/o.k.T*100:0)}</td><td class="dbn">${o.ul?dm(o.ul):'—'}</td><td>${st(o)}</td></tr>`).join('')}</tbody></table></div>
   ${Object.keys(D.sem).length?`<div class="sub" style="font-size:12.5px;margin-top:10px">Também lançados nas linhas, sem previsão acompanhada: ${Object.entries(D.sem).sort((a,b)=>b[1]-a[1]).map(([c,q])=>esc(c)+' ('+anlN(q)+')').join(', ')}. Para incluir algum, use <b>Configurar</b>.</div>`:''}`; }

function ritTabDia(D){ const LS=D.LS, S0=LS.map(l=>ritSerie(D,{l})), T=ritSerie(D,{}); let ap=0, ar=0;
  return `<div class="dbw"><table class="dbt rit-t" style="min-width:${380+LS.length*190}px"><thead><tr><th>Dia útil</th>${LS.map(l=>`<th style="text-align:right">${esc(l)} meta</th><th style="text-align:right">${esc(l)} plan.</th><th style="text-align:right">${esc(l)} apont.</th>`).join('')}<th style="text-align:right">Total meta</th><th style="text-align:right">Plano da manhã</th><th style="text-align:right">Total plan.</th><th style="text-align:right">Total apont.</th><th style="text-align:right">Aderência</th><th style="text-align:right">Apont. × meta acum.</th></tr></thead><tbody>
   ${T.map((t,i)=>{ const fut=!D.cut||t.d>D.cut; ap+=t.p; if(!fut) ar+=t.r; const dv=ar-ap;
     return `<tr class="${t.d===D.h?'rit-hj':''} ${fut?'rit-fut':''}"><td><b>${dm(t.d)}</b><small>${DIAS_CAL[new Date(t.d+'T12:00:00').getDay()]}</small></td>${S0.map((s,j)=>{ const cp=capDe(LS[j]); return `<td class="num" style="text-align:right">${anlN(s[i].p)}</td><td class="num" style="text-align:right"><span class="${cp&&s[i].plf>cp*1.001?'rit-neg':''}" title="${cp?'Capacidade '+anlN(cp)+'/dia':''}">${s[i].pl?anlN(s[i].pl):'—'}</span></td><td class="num" style="text-align:right">${fut&&!s[i].r?'':`<b class="${s[i].r<s[i].p*0.95?'rit-neg':''}">${anlN(s[i].r)}</b>`}</td>`; }).join('')}
      <td class="num" style="text-align:right">${anlN(t.p)}</td><td class="num" style="text-align:right">${t.sn!=null?anlN(t.sn):'—'}</td><td class="num" style="text-align:right">${t.pl?`<span class="${t.sn!=null&&Math.abs(t.pl-t.sn)>t.sn*0.1?'rit-neg':''}">${anlN(t.pl)}</span>`:'—'}</td><td class="num" style="text-align:right">${fut&&!t.r?'':'<b>'+anlN(t.r)+'</b>'}</td><td class="num" style="text-align:right">${fut||!t.ap?'—':`<b class="${t.ok/t.ap<.85?'rit-neg':'rit-pos'}">${Math.round(t.ok/t.ap*100)}%</b>`}</td><td class="num" style="text-align:right">${fut?'':`<b class="${dv<0?'rit-neg':'rit-pos'}">${dv>0?'+':''}${anlN(dv)}</b>`}</td></tr>`; }).join('')}</tbody></table></div>
   <div class="sub" style="font-size:12px;margin-top:8px">Só dias úteis (segunda a sexta). Plano da manhã = foto do programa guardada no começo do dia (em vermelho quando o planejado mudou mais de 10%). Aderência = do que estava programado para o dia em cada ordem, quanto saiu no próprio dia. Meta do dia = previsão comercial da linha ÷ ${D.n} dias úteis do mês. Planejado = ordens e previsões do calendário (em vermelho quando passa da capacidade da linha)${feriados().some(f=>f.slice(0,7)===D.cp)?' (sem os feriados: '+feriados().filter(f=>f.slice(0,7)===D.cp).map(dm).join(', ')+')':''}. Produção em dia não útil entra no dia útil anterior.</div>`; }

function ritCfgCard(D){ const E=S.rit.ed, LT=linhasOrd(); const pm=((S.anl.base.prev||{}).mes||{})[S.rit.cp]||{};
  const cods=[...new Set(Object.keys(E.itens).concat(Object.keys(pm).filter(c=>pm[c]>0&&anlLinhasDe(c,((S.anl.base.itens||{}).l||{})[c]).some(l=>E.linhas.includes(l)))))]
    .sort((a,b)=>(E.itens[b]?1:0)-(E.itens[a]?1:0)||(pm[b]||0)-(pm[a]||0)||a.localeCompare(b));
  return `<section class="card rit-cfg"><div class="head"><div><h2>Configurar o acompanhamento</h2><div class="sub">Quais itens entram, como a previsão se divide entre as linhas e o peso do plástico na capacidade.</div></div>
    <div class="chips"><button class="btn sec" data-act="rit-cfg-x" style="height:42px">Cancelar</button><button class="btn" data-act="rit-cfg-ok" style="height:42px" ${S.rit.salvando?'disabled':''}>${S.rit.salvando?'Salvando…':'Salvar'}</button></div></div>
   <div class="rit-cfg-g"><div><div class="label" style="margin-bottom:6px">LINHAS ACOMPANHADAS</div><div class="chips">${LT.map(l=>`<button class="chip" data-act="rit-cfg-l" data-v="${esc(l)}" aria-pressed="${E.linhas.includes(l)}">${esc(l)}</button>`).join('')}</div></div>
    <div><label class="label" for="rit-jor">JORNADA DA LINHA (MINUTOS POR DIA)</label><input class="txt num" id="rit-jor" inputmode="numeric" value="${esc(String(E.jornada||528))}" style="margin-top:6px;max-width:140px"><div class="sub" style="font-size:12px">Usada para converter tempo parado em sacos perdidos (528 = 8h48).</div></div>
    <div><label class="label" for="rit-fer">FERIADOS E PARADAS COLETIVAS</label><input class="txt" id="rit-fer" value="${esc(E.fer)}" placeholder="12/10/2026, 02/11/2026" style="margin-top:6px"><div class="sub" style="font-size:12px">Não contam como dia útil (vale para toda a Análise PCP).</div></div></div>
   <div class="dbw" style="margin-top:14px"><table class="dbt" style="min-width:${520+E.linhas.length*110}px"><thead><tr><th style="width:40px"></th><th>Item</th><th style="text-align:right">Previsto ${esc(ritMesNome(S.rit.cp))}</th>${E.linhas.map(l=>`<th style="text-align:center">% ${esc(l)}</th>`).join('')}<th style="text-align:center">Embalagem</th></tr></thead><tbody>
    ${cods.map(c=>{ const it=E.itens[c]; return `<tr class="${it?'':'rit-off'}"><td><input type="checkbox" data-rit-on="${esc(c)}" ${it?'checked':''} aria-label="Acompanhar ${esc(c)}" style="width:18px;height:18px;accent-color:var(--teal)"></td><td><b>${esc(c)}</b><small>${esc(ritNome(c))}</small></td><td class="num" style="text-align:right">${anlN(pm[c]||0)}</td>
      ${E.linhas.map(l=>`<td style="text-align:center"><input class="txt num" style="height:36px;width:76px;text-align:right" inputmode="numeric" data-rit-pc="${esc(c)}" data-l="${esc(l)}" value="${it&&it.d&&it.d[l]!=null?it.d[l]:''}" ${it?'':'disabled'} aria-label="% ${esc(l)} ${esc(c)}"></td>`).join('')}
      <td style="text-align:center"><select class="txt" style="height:36px;width:auto" data-rit-f="${esc(c)}" ${it?'':'disabled'}><option value="1" ${it&&(+it.f||1)<1.01?'selected':''}>Papel</option><option value="${RIT_PL}" ${it&&(+it.f||1)>1.01?'selected':''}>Plástico (4.000/dia)</option></select></td></tr>`; }).join('')}</tbody></table></div>
   <div class="sub" style="font-size:12px;margin-top:8px">A % de cada linha é proporcional (50 e 50, ou 100 numa só). Plástico pesa ${String(RIT_PL).replace('.',',')}× na capacidade (7.500 sacos de papel ou 4.000 de plástico por dia).</div></section>`; }

function ritFam(l){ return /rejunte|fixcol|l[ií]quid/i.test(l)?'rej':'arg'; }
function ritT(v,kg){ return (Math.round(v*(kg||20)/100)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}); }
function ritH(m){ m=Math.round(m||0); return m>=60?Math.floor(m/60)+'h'+(m%60?pad(m%60):''):m+' min'; }
function ritResumo(D,k){ const liq=(S.rit.meta||'liq')==='liq', mist=new Set(D.LS.map(ritFam)).size>1;
  const Q=v=>ritQ(v,k.kg), U=ritU();
  const card=(c,t,v,sb,ex)=>`<div class="rit-3c ${c}"><span>${t}</span><b class="num">${v}</b><small>${sb}</small>${ex||''}</div>`;
  const ind=(t,v,sb,c)=>`<div><span>${t}</span><b class="num ${c||''}">${v}</b>${sb?`<small>${sb}</small>`:''}</div>`;
  const fatP=k.pc?Math.round(k.fat/k.pc*100):null, pr=k.n?Math.round(k.du/k.n*100):0;
  const mots=Object.entries(k.mot).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([m,v])=>esc(m)+' '+ritH(v)).join(' · ');
  return `<section class="card rit-3"><div class="rit-3h"><div class="label">O MÊS EM 3 NÚMEROS · ${k.n} DIAS ÚTEIS (SEG A SEX)</div><span class="sub" style="margin:0;font-size:12px">Dia útil ${k.du} de ${k.n} · capacidade ${Q(k.cd)} ${U}/dia${k.cdR?' (real '+Q(k.cdR)+')':''}${mist?' · <b>mistura argamassa e rejunte: veja os totais por família abaixo</b>':''}</span></div>
    <div class="rit-3g">
     ${card('teal',liq?'Meta de produção':'Previsão comercial',Q(k.T),liq?`comercial ${Q(k.pc)} + seg. − estoque no dia 1 (${Q(k.ei)}) · até hoje ${Q(k.pa)}`:`previsão do Focco · até hoje ${Q(k.pa)}`,k.capM?`<em class="${k.comOcup>1?'neg':''}">${Math.round(k.comOcup*100)}% da capacidade do mês</em>`:'')}
     ${card('warn','Planejado',Q(k.PLt),'o que está no calendário · até hoje '+Q(k.pla),k.capM?`<em class="${k.ocup>1?'neg':''}">${Math.round(k.ocup*100)}% da capacidade do mês</em>`:'')}
     ${card('ok','Apontado',Q(k.ra),'o que foi produzido · '+(k.T?Math.round(k.ra/k.T*100):0)+'% da meta ('+pr+'% do mês já passou)')}
    </div>
    <div class="rit-3d">
     ${ind('Apontado × planejado até hoje',(k.devPl>0?'+':'')+Q(k.devPl),'',k.devPl<0?'neg':'pos')}
     ${ind('Apontado × meta até hoje',(k.dev>0?'+':'')+Q(k.dev),'',k.dev<0?'neg':'pos')}
     ${ind('Planejado × meta no mês',(k.PLt-k.T>0?'+':'')+Q(k.PLt-k.T),k.PLt<k.T?'falta planejar '+Q(k.T-k.PLt):'',k.PLt<k.T?'neg':'pos')}
     ${ind('Para bater a meta, por dia útil',k.rem?Q(k.need):'—',k.rem?k.rem+' dias úteis · '+(k.cdR?(k.needEq>k.cdR?'acima da capacidade real':'cabe na capacidade real'):k.cd?(k.needEq>k.cd?'acima da capacidade':'cabe na capacidade'):''):'',(k.cdR&&k.needEq>k.cdR)||(k.cd&&k.needEq>k.cd)?'neg':'')}
    </div>
    <div class="rit-3d rit-3e">
     ${ind('Aderência ao programa',k.ader==null?'—':Math.round(k.ader*100)+'%','do que foi programado para cada dia, quanto saiu no próprio dia',k.ader!=null&&k.ader<.85?'neg':'pos')}
     ${ind('Replanejamento',k.replan==null?'—':Math.round(k.replan*100)+'%',k.snDias?'quanto o plano mudou desde a manhã ('+k.snDias+' dia'+(k.snDias>1?'s':'')+' com foto)':'começa a contar com as fotos diárias do plano',k.replan!=null&&k.replan>.2?'neg':'')}
     ${ind('Perdido em paradas',k.pmin?'≈ '+Q(k.perda):'—',k.pmin?ritH(k.pmin)+' parado'+(mots?' · '+mots:''):'nenhuma parada no mês',k.pmin?'neg':'pos')}
     ${ind('Faturado × previsão comercial',k.pc?Q(k.fat):'—',k.pc?(fatP+'% da previsão · '+(k.fat<k.pc*pr/100*0.9?'abaixo do ritmo do mês':'no ritmo do mês'))+(D.fatAte?' · Focco até '+dm(D.fatAte):''):'sem previsão',fatP!=null&&fatP<pr*0.9?'neg':'')}
    </div>
    ${k.sobre.length?`<div class="av warn" style="margin-top:10px"><b>Planejado acima da capacidade em ${k.sobre.length} dia${k.sobre.length>1?'s':''}:</b><span>${k.sobre.slice(0,8).map(dm).join(', ')}${k.sobre.length>8?'…':''}</span></div>`:''}
    ${ritAcertoPrev()}</section>
   ${ritPorQue(D)}`; }
/* 7) acerto histórico da previsão comercial (meses fechados) */
function ritAcertoPrev(){ const P=S.anl.base.prev||{}, V=S.anl.base.vendas||{}, cur=hojeStr().slice(0,7); const cps=Object.keys(P.mes||{}).filter(c=>c<cur).sort().slice(-6); if(!cps.length) return '';
  let tp=0,tf=0,te=0; cps.forEach(cp=>{ const pm=P.mes[cp]||{}; for(const c in pm){ const pv=+pm[c]||0, ft=+((((V.mensal||{})[c]||{})[cp]||[0,0])[1])||0; tp+=pv; tf+=ft; te+=Math.abs(ft-pv); } });
  if(!tp) return ''; const ac=Math.max(0,Math.round((1-te/tp)*100));
  return `<div class="sub" style="font-size:12.5px;margin:10px 0 0">Confiabilidade da previsão comercial nos últimos ${cps.length} mes${cps.length>1?'es':''} fechados: <b>${ac}%</b> de acerto item a item · faturado foi ${Math.round(tf/tp*100)}% do previsto no total.</div>`; }
/* 4) por que o desvio: paradas × desvio por linha */
function ritPorQue(D){ const rows=D.LS.map(l=>{ const k=ritStats(D,{l}); const cap=capDe(l); return {l,k,cap}; }).filter(x=>x.k.T||x.k.ra||x.k.pmin);
  if(!rows.length) return '';
  return `<section class="card rit-pq"><div class="head" style="align-items:baseline"><div><h2>Por que o desvio</h2><div class="sub" style="margin:2px 0 0;font-size:12.5px">Apontado × meta até hoje, quanto disso foi parada (minutos parados × capacidade da linha ÷ jornada de ${ritH(D.jor)}) e quanto ficou sem causa registrada.</div></div></div>
   <div class="dbw"><table class="dbt rit-t" style="min-width:880px"><thead><tr><th>Linha</th><th style="text-align:right">Apontado × meta</th><th style="text-align:right">Tempo parado</th><th style="text-align:right">Perdido em paradas</th><th style="text-align:right">Sem causa registrada</th><th>Principais motivos</th><th style="text-align:right">Capacidade nominal</th><th style="text-align:right">Capacidade real</th><th style="text-align:right">Aderência</th></tr></thead><tbody>
   ${rows.map(({l,k,cap})=>{ const sc=k.dev<0?Math.min(0,k.dev+k.perda):0; const m=Object.entries(k.mot).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([x,v])=>esc(x)+' '+ritH(v)).join(' · ');
     return `<tr><td><b>${esc(l)}</b></td><td class="num" style="text-align:right"><b class="${k.dev<0?'rit-neg':'rit-pos'}">${k.dev>0?'+':''}${anlN(k.dev)}</b></td><td class="num" style="text-align:right">${k.pmin?ritH(k.pmin):'—'}</td><td class="num" style="text-align:right">${k.pmin?'≈ '+anlN(k.perda):'—'}</td><td class="num" style="text-align:right">${k.dev<0?`<b class="rit-neg">${anlN(sc)}</b>`:'—'}</td><td class="dbn">${m||'—'}</td>
      <td class="num" style="text-align:right">${cap?anlN(cap)+'/dia':'<span class="t-mut">sem capacidade</span>'}</td><td class="num" style="text-align:right;white-space:nowrap">${D.CAPR[l]?`<b class="${cap&&D.CAPR[l]<cap*0.85?'rit-neg':''}" title="Média dos ${D.CAPRi[l].usados} melhores de ${D.CAPRi[l].dias} dias úteis · média de todos os dias: ${anlN(D.CAPRi[l].media)}${D.CAPRi[l].fora?' · '+D.CAPRi[l].fora+' dia(s) de lançamento acumulado fora':''}">${anlN(D.CAPR[l])}/dia</b>${cap?' <small>'+Math.round(D.CAPR[l]/cap*100)+'%</small>':''}<div class="t-mut" style="font-size:11px">média ${anlN(D.CAPRi[l].media)} · ${D.CAPRi[l].dias} dias</div>`:`<span class="t-mut" style="font-size:12px">${D.CAPRi[l]&&D.CAPRi[l].demanda?'pouca programação':'poucos dias'}</span>`}</td><td class="num" style="text-align:right">${k.ader==null?'—':Math.round(k.ader*100)+'%'}</td></tr>`; }).join('')}</tbody></table></div>
   <div class="sub" style="font-size:12px;margin-top:8px">Capacidade real = o que a linha mostrou que consegue: média dos 5 melhores dias úteis dos últimos 20 com produção lançada (embaixo, a média de todos os dias). Ensacados ficam fora (são etapa intermediária, em outra unidade) e dias com mais de 150% da nominal também (lançamento acumulado). Precisa de pelo menos 3 dias. "Sem causa registrada" é o atraso que as paradas não explicam: lentidão, setup, troca de cor, falta de operador ou parada não lançada.</div></section>`; }
/* 6) foto diária do plano: guardada na primeira vez que a tela abre no dia útil (ou pelo botão) */
async function ritCarregaSnaps(){ const A=S.rit; if(A.snaps!==undefined||!S.db) return; A.snaps=null; try{ const q=await S.db.collection('ritplano').limit(400).get(); A.snaps=q.docs.map(d=>Object.assign({_id:d.id},d.data())); }catch(e){ A.snaps=[]; } rerenderSeguro(); ritFotoAuto(); }
function ritFotoPlano(d){
  const all={}; S.ordens.forEach(o=>{ if(!o.linha||['cancelada','excluida','vinculada'].includes(o.status)) return; const d0=o.data||'', d1=o.ate&&o.ate>d0?o.ate:d0; if(!d0||d<d0||d>d1) return; const ds=calDiasUteis(d0,d1,anlCfg().sab).filter(x=>anlUtil(x)); all[o.linha]=(all[o.linha]||0)+(+o.total||0)/(ds.length||1); });
  (S.previsoes||[]).forEach(p=>{ if(p.status==='prevista'&&p.data===d&&p.linha) all[p.linha]=(all[p.linha]||0)+(+p.qtd||0); });
  for(const k in all) all[k]=Math.round(all[k]); return all; }
async function ritFotoSalva(manual){ const A=S.rit, d=hojeStr(); if(!S.db||!anlUtil(d)) return; if(!manual&&(A.snaps||[]).some(z=>z.data===d)) return;
  const doc={data:d,l:ritFotoPlano(d),em:new Date().toISOString(),por:S.uid||null,manual:!!manual};
  try{ await S.db.doc('ritplano/'+d).set(doc); A.snaps=(A.snaps||[]).filter(z=>z.data!==d).concat([Object.assign({_id:d},doc)]); if(manual) toast('Plano de hoje guardado às '+hora(doc.em)+'.'); rerenderSeguro(); }catch(e){ if(manual) erro(e); } }
function ritFotoAuto(){ const A=S.rit, h=new Date().getHours(); if(A.snaps&&h<13&&!(A.snaps||[]).some(z=>z.data===hojeStr())) ritFotoSalva(false); }
function vRit(){ const A=S.rit, h=hojeStr(); const ms=ritMeses(); ritCarregaSnaps();
  if(!A.cp) A.cp=ms.includes(h.slice(0,7))?h.slice(0,7):(ms[ms.length-1]||h.slice(0,7));
  if(!A.det) A.det={};
  const pode=dbMaster()||!!(acsP()&&acsP().mods.includes('analise'));
  const D=ritDados(A.cp,A.fonte);
  const seg=(act,cur,ops)=>`<div class="seg">${ops.map(([v,l])=>`<button data-act="${act}" data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join('')}</div>`;
  const opc=A.opc?`<section class="card rx-opc"><div class="rx-opr"><div><span class="label">META</span>${seg('rit-meta',A.meta||'liq',[['liq','Meta de produção'],['com','Previsão comercial']])}</div>
     <div><span class="label">APONTADO</span>${seg('rit-fonte',A.fonte,[['painel','Entregas do painel'],['focco','Apontado no Focco']])}</div><div><span class="label">UNIDADE</span>${seg('rit-un',A.un,[['sc','Sacos'],['t','Toneladas']])}</div></div>
     <div class="rx-opb">${pode&&anlUtil(h)?`<button class="btn sec" data-act="rit-foto" style="height:40px" title="Guarda o programa de hoje como está agora, para medir o replanejamento">${(A.snaps||[]).some(z=>z.data===h)?'✓ Plano de hoje guardado':'Guardar plano de hoje'}</button>`:''}${pode?`<button class="btn sec" data-act="rit-cfg" style="height:40px">Configurar itens e linhas</button>`:''}</div></section>`:'';
  const topo=`<div class="chips">${ms.length>1?`<select class="txt" id="rit-mes" style="height:42px;width:auto">${ms.map(cp=>`<option value="${cp}" ${cp===A.cp?'selected':''}>${ritMesNome(cp)}</option>`).join('')}</select>`:''}
    <button class="btn sec" data-act="rit-opc" aria-expanded="${!!A.opc}" style="height:42px">${ic('ajuste',16,2)}Opções</button>${D?`<button class="btn sec" data-act="rit-apr" style="height:42px" title="Slides em tela cheia para a reunião, com os dados de agora">${ic('grafico',16,2)}Apresentar</button>`:''}<button class="btn" data-act="rit-tv" style="height:42px">${ic('tv',16,2)}Modo TV</button></div>`;
  const head=`<div class="head"><div><div class="eyebrow">ANÁLISE PCP</div><h1>Previsto × Realizado</h1><div class="sub">${esc(ritMesNome(A.cp))} · ${(A.meta||'liq')==='liq'?'meta de produção':'previsão comercial'} × ${A.fonte==='focco'?'apontado no Focco':'entregas do painel'}${D&&D.prevEm&&D.prevEm!=='planilha'?' · previsão do Focco de '+dm(D.prevEm):''}</div></div>${topo}</div>`;
  if(!D){ const tem=((S.anl.base.prev||{}).mes||{})[A.cp];
    return head+opc+`<section class="card"><div class="empty">${tem?'Nenhuma linha acompanhada. Use <b>Configurar</b> para escolher as linhas.':`Sem previsão de ${esc(ritMesNome(A.cp))}. Importe o relatório <b>RPRE0301</b> (Previsto x Realizado do Focco) em Base de dados.`}<div style="margin-top:12px"><button class="btn" data-go="anlbase">Ir para Base de dados</button></div></div></section>`+(A.cfg&&pode?ritCfgCard(D):''); }
  if(A.apr) return ritApres(D);
  if(document.body.classList.contains('tv')) return ritTv(D);
  const F=ritFams(D), f0=F.mist?{ls:F.ar}:{}, fam=F.mist?'de argamassas ':'';
  const k=ritStats(D,f0), st=ritSt(k), Q=v=>ritQ(v,k.kg), U=ritU();
  const pct=k.T?Math.round(k.ra/k.T*100):0, pdu=k.n?Math.round(k.du/k.n*100):0, fp=k.T&&k.du?Math.round(k.proj/k.T*100):null;
  const frase=!k.du?'O mês ainda não tem produção apontada.':k.sal<=0?`A meta ${fam}do mês já foi alcançada.`:
    `${k.dev<0?`Estamos <b class="neg">${Q(-k.dev)} ${U} atrás</b> da meta até hoje.`:`Estamos <b class="pos">${Q(k.dev)} ${U} à frente</b> da meta até hoje.`} Para fechar o mês, ${k.rem?`precisamos de <b>${Q(k.need)} ${U} por dia útil</b> ${(k.cdR||k.cd)?(k.needEq>(k.cdR||k.cd)?`<span class="neg">— acima ${k.cdR?'do que as linhas têm feito':'da capacidade'} (${Q(k.cdR||k.cd)}/dia)</span>`:`— cabe ${k.cdR?'no que as linhas têm feito':'na capacidade'} (${Q(k.cdR||k.cd)}/dia)`):''}.`:'não há mais dias úteis.'}`;
  const r=54, C=2*Math.PI*r, pm=Math.min(1,k.T?k.ra/k.T:0), pa=Math.min(1,k.T?k.pa/k.T:0), ang=pa*2*Math.PI-Math.PI/2;
  const ring=`<svg class="rx-ring" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--sunken)" stroke-width="12"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--rx-c)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(pm*C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)"/>
    ${k.pa?`<circle cx="${(70+Math.cos(ang)*r).toFixed(1)}" cy="${(70+Math.sin(ang)*r).toFixed(1)}" r="6" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"><title>meta até hoje</title></circle>`:''}
    <text x="70" y="70" text-anchor="middle" font-size="30" font-weight="700" fill="var(--ink)">${pct}%</text><text x="70" y="90" text-anchor="middle" font-size="11" fill="var(--muted)">da meta do mês</text></svg>`;
  const tl=`<div class="rx-tl" title="${k.du} de ${k.n} dias úteis">${D.dias.map(d=>`<i class="${D.cut&&d<=D.cut?'ok':''} ${d===h?'hj':''}"></i>`).join('')}</div>`;
  const Al=ritAlertas(D);
  const hero=`<section class="rx-hero st-${st.c}">
    <div class="rx-hl"><div class="rx-ey">${esc(ritMesNome(A.cp).toUpperCase())} · DIA ÚTIL ${k.du} DE ${k.n}</div>
     <div class="rx-big"><b class="num">${Q(k.ra)}</b><span>${U} ${fam}produzidos de <b class="num">${Q(k.T)}</b> da meta</span></div>
     <p class="rx-fr">${frase}</p>
     <div class="rx-tlw">${tl}<div class="rx-tlk"><span>${pdu}% do mês já passou</span><span>faltam ${k.rem} dias úteis</span></div></div></div>
    <div class="rx-hr">${ring}<div class="rx-ks">
      <div><span>Meta até hoje</span><b class="num">${Q(k.pa)}</b></div>
      <div><span>Desvio</span><b class="num ${k.dev<0?'neg':'pos'}">${k.dev>0?'+':''}${Q(k.dev)}</b></div>
      <div><span>No ritmo, fecha em</span><b class="num ${fp!=null&&fp<97?'neg':'pos'}">${fp==null?'—':fp+'%'}</b></div>
      <div><span>Situação</span><b class="rx-st ${st.c}"><i></i>${st.t}</b></div></div></div></section>`;
  const alS=Al.length?`<section class="rx-al">${Al.slice(0,2).map(a=>`<div class="rx-ai ${a.c}"><i></i><span>${a.t}</span></div>`).join('')}${Al.length>2?`<button class="lnk" data-act="rit-det" data-v="al">+${Al.length-2} ${Al.length-2===1?'alerta':'alertas'}</button>`:''}</section>`:'';
  // curva + linhas
  const op=ritCvAtual(D), cvOps=ritCvOps(D), au=ritCvAuto(D);
  const outros=cvOps.filter(o=>!au.some(x=>x.k===o.k));
  const sel=`<select class="txt rx-cvs" id="rit-cvi"><option value="">Outra linha ou item…</option>${outros.length?`<optgroup label="Linhas">${outros.map(o=>`<option value="${esc(o.k)}" ${!A.auto&&A.curva===o.k?'selected':''}>${esc(o.t)}</option>`).join('')}</optgroup>`:''}<optgroup label="Itens">${D.its.filter(x=>x.prev>0).map(x=>`<option value="c:${esc(x.c)}" ${!A.auto&&A.curva==='c:'+x.c?'selected':''}>${esc(x.c)} · ${esc(x.nome.length>26?x.nome.slice(0,25)+'…':x.nome)}</option>`).join('')}</optgroup></select>`;
  const linha=(o)=>{ const kk=ritStats(D,o.f), s2=ritSt(kk), p2=kk.T?Math.min(100,kk.ra/kk.T*100):0, a2=kk.T?Math.min(100,kk.pa/kk.T*100):0;
    return `<button class="rx-ln st-${s2.c} ${op.k===o.k?'on':''}" data-act="rit-curva" data-v="${esc(o.k)}"><div class="rx-lnh"><b>${esc(o.t)}</b><span class="rx-st ${s2.c}"><i></i>${esc(s2.t)}</span></div>
      <div class="rx-bar"><i style="width:${p2}%"></i>${kk.pa?`<em style="left:${a2}%"></em>`:''}</div><div class="rx-lnk"><span class="num">${Q(kk.ra)} <small>de ${Q(kk.T)}</small></span><span class="num ${kk.dev<0?'neg':'pos'}">${kk.dev>0?'+':''}${Q(kk.dev)}</span></div></button>`; };
  const linhas=`<section class="card rx-lns"><div class="rx-lnt"><h2>Linhas</h2><span class="sub" style="margin:0;font-size:12.5px">toque para ver a curva</span></div>
    ${cvOps.filter(o=>o.k===''||o.k.startsWith('g:')).map(linha).join('')}<div class="rx-sep"></div>${(()=>{ const ls=cvOps.filter(o=>o.k.startsWith('l:')); const prin=ls.filter(o=>au.some(x=>x.k===o.k)||o.k===op.k||ritSt(ritStats(D,o.f)).c==='crit'&&ritStats(D,o.f).T>0); const mostra=A.todasL||prin.length>=ls.length-1?ls:prin; return mostra.map(linha).join('')+(ls.length>mostra.length?`<button class="lnk rx-mais" data-act="rit-todasl">Mostrar todas as ${ls.length} linhas</button>`:A.todasL&&prin.length<ls.length-1?`<button class="lnk rx-mais" data-act="rit-todasl">Mostrar só as principais</button>`:''); })()}
    <div class="rx-lg"><span><i class="bar"></i>apontado</span><span><i class="mk"></i>meta até hoje</span></div></section>`;
  const curva=`<section class="card rit-cvc rx-cv"><div class="rit-cvbar"><h2>Curva S</h2>
      <div class="chips"><button class="chip rit-auto" data-act="rit-auto" aria-pressed="${A.auto}" title="Troca sozinha entre as visões principais a cada ${RIT_CV_MS/1000} segundos">${A.auto?'⏸ Pausar':'▶ Alternar'}</button>${au.map(o=>`<button class="chip" data-act="rit-curva" data-v="${esc(o.k)}" aria-pressed="${op.k===o.k}">${esc(o.t)}</button>`).join('')}${sel}</div></div>
     <div id="rit-cvbox" class="rit-cvbox">${ritCvBox(D)}</div>
     <div class="rit-cvft"><div class="seg rit-jan">${[['perto','Perto de hoje'],['mes','Mês inteiro']].map(([v,l])=>`<button data-act="rit-jan" data-v="${v}" aria-pressed="${ritJan(D)===v}">${l}</button>`).join('')}</div><div class="legend rit-leg"><span><i class="lp"></i>Meta</span><span><i style="background:var(--warn)"></i>Planejado</span><span><i style="background:var(--anl-s1)"></i>Apontado</span><span><i class="lj"></i>No ritmo atual</span></div></div></section>`;
  const det=(key,tit,sub,body)=>`<details class="card rx-det" data-det="${key}" ${A.det[key]?'open':''}><summary data-act="rit-dett" data-v="${key}"><span><b>${tit}</b><small>${sub}</small></span><span class="rx-chev" aria-hidden="true">›</span></summary><div class="rx-detb">${A.det[key]?body():''}</div></details>`;
  const alertasDet=()=>Al.length?Al.map(a=>`<div class="av ${a.c}"><b>${a.t}</b>${a.s?`<span>${a.s}</span>`:''}</div>`).join(''):'<div class="av ok"><b>Sem alertas.</b></div>';
  const paineis=()=>`<div class="rit-g" style="--n:${D.LS.length+1}">${ritAtivas(D).map(l=>ritPainel(D,{l},l)).join('')}${F.mist?ritPainel(D,{ls:F.ar},'Total argamassas')+ritPainel(D,{ls:F.rj},'Total rejuntes e outros')+ritPainel(D,{},'Total geral (toneladas)',false,true):ritPainel(D,{},'Total')}</div>`;
  const tabelas=()=>`<div class="anl-th" style="padding:0 0 12px"><div class="seg">${[['linhas','Por item'],['dia','Dia a dia']].map(([v,l])=>`<button data-act="rit-tab" data-v="${v}" aria-pressed="${A.tab===v}">${l}</button>`).join('')}</div><button class="btn sec" data-act="rit-csv" style="height:38px">${ic('baixar',16,2)}Exportar CSV</button></div>${A.tab==='dia'?ritTabDia(D):ritTabProd(D)}`;
  return `${head}${opc}
   ${A.cfg&&pode?ritCfgCard(D):''}
   ${hero}${alS}
   <div class="rx-main">${curva}${linhas}</div>
   <div class="rx-dets">
    ${det('al','Alertas',Al.length?Al.length+(Al.length===1?' ponto de atenção':' pontos de atenção'):'nenhum agora',alertasDet)}
    ${det('num','Números do mês e por que o desvio','meta, planejado, aderência e paradas por linha',()=>ritResumo(D,ritStats(D,{})))}
    ${det('lin','Detalhe de cada linha','capacidade, planejado, saldo e projeção',paineis)}
    ${det('tab','Tabelas por item e dia a dia','com exportação para Excel (CSV)',tabelas)}
   </div>`; }
document.addEventListener('click',ev=>{ const sm=ev.target.closest('[data-act="rit-dett"]'); if(!sm) return; ev.preventDefault(); const A=S.rit; if(!A.det) A.det={}; const k=sm.dataset.v; A.det[k]=!A.det[k]; render(); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="rit-opc"],[data-act="rit-det"],[data-act="rit-todasl"]'); if(!b) return; const A=S.rit; if(b.dataset.act==='rit-todasl'){ A.todasL=!A.todasL; render(); return; }
  if(b.dataset.act==='rit-opc'){ A.opc=!A.opc; render(); return; }
  if(!A.det) A.det={}; A.det[b.dataset.v]=true; render(); setTimeout(()=>{ const d=document.querySelector(`details[data-det="${b.dataset.v}"]`); if(d) d.scrollIntoView({behavior:'smooth',block:'start'}); },40); });

/* ===== Apresentação para a reunião (slides em tela cheia com os dados ao vivo) ===== */
const RAP_W=1600, RAP_H=900;
function rapEscala(){ const el=document.querySelector('.rap'); if(!el) return; el.style.setProperty('--s',Math.min(innerWidth/RAP_W,innerHeight/RAP_H)); }
addEventListener('resize',rapEscala);
function rapSlides(D){ const F=ritFams(D), f0=F.mist?{ls:F.ar}:{}, k=ritStats(D,f0), st=ritSt(k), Q=v=>ritQ(v,k.kg), U=ritU(), h=hojeStr();
  const fam=F.mist?' de argamassas':'', mes=ritMesNome(D.cp);
  const pct=k.T?Math.round(k.ra/k.T*100):0, pdu=k.n?Math.round(k.du/k.n*100):0, fp=k.T&&k.du?Math.round(k.proj/k.T*100):null;
  const sg=v=>(v>0?'+':'')+v;
  const ring=(kk,sz)=>{ const r=54, C=2*Math.PI*r, pm=Math.min(1,kk.T?kk.ra/kk.T:0), pa=Math.min(1,kk.T?kk.pa/kk.T:0), ang=pa*2*Math.PI-Math.PI/2;
    return `<svg class="rap-ring" style="width:${sz}px;height:${sz}px" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${r}" fill="none" stroke="#E6EBEE" stroke-width="13"/>
     <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--rp-c)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${(pm*C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)"/>
     ${kk.pa?`<circle cx="${(70+Math.cos(ang)*r).toFixed(1)}" cy="${(70+Math.sin(ang)*r).toFixed(1)}" r="6.5" fill="#fff" stroke="#15222A" stroke-width="3"/>`:''}
     <text x="70" y="74" text-anchor="middle" font-size="31" font-weight="600" fill="#15222A">${Math.round(pm*100)}%</text><text x="70" y="93" text-anchor="middle" font-size="10.5" fill="#5E6E76">da meta do mês</text></svg>`; };
  const tl=`<div class="rap-tl">${D.dias.map(d=>`<i class="${D.cut&&d<=D.cut?'ok':''} ${d===h?'hj':''}"></i>`).join('')}</div><div class="rap-tlk"><span>${pdu}% do mês já passou · dia útil ${k.du} de ${k.n}</span><span>faltam ${k.rem} dias úteis</span></div>`;
  const chip=s=>`<span class="rap-chip ${s.c}"><i></i>${esc(s.t)}</span>`;
  const out=[];
  // 1) capa
  const frase=!k.du?'O mês ainda não tem produção apontada.':k.sal<=0?`A meta${fam} do mês já foi alcançada.`:
    `${k.dev<0?`Estamos <b class="neg">${Q(-k.dev)} ${U} atrás</b> da meta até hoje`:`Estamos <b class="pos">${Q(k.dev)} ${U} à frente</b> da meta até hoje`}${fp!=null?` e, no ritmo atual, o mês fecha em <b class="${fp<97?'neg':'pos'}">${fp}% da meta</b>`:''}.`;
  const rj=F.mist?ritStats(D,{ls:F.rj}):null;
  out.push({t:'Capa',h:`<div class="rap-capa st-${st.c}"><div class="rap-cl"><div class="rap-ey">REUNIÃO DE PRODUÇÃO · PCP</div><h1>Previsto × Realizado<br><span>${esc(mes)}</span></h1>
    <p class="rap-fr">${frase}</p><div class="rap-cm">${chip(st)}<span>dia útil ${k.du} de ${k.n}</span>${rj&&rj.T?`<span>Rejuntes e outros: <b>${rj.T?Math.round(rj.ra/rj.T*100):0}%</b> da meta</span>`:''}</div></div>
    <div class="rap-cr">${ring(k,380)}</div></div>`});
  // 2) números
  const big=(t,v,s,c)=>`<div class="rap-k ${c||''}"><span>${t}</span><b class="num">${v}</b><small>${s}</small></div>`;
  out.push({t:'Onde estamos',ey:'ONDE ESTAMOS',tt:`${Q(k.ra)} ${U}${fam} produzidos`,h:`<div class="rap-ks">
     ${big('Meta do mês',Q(k.T),U+fam)}
     ${big('Meta até hoje',Q(k.pa),'o que já devia ter saído')}
     ${big('Produzido',Q(k.ra),pct+'% da meta do mês','teal')}
     ${big('Desvio',sg(Q(k.dev)),k.dev<0?U+' abaixo da meta até hoje':U+' acima da meta até hoje',k.dev<0?'neg':'pos')}</div>
    <div class="rap-tlw">${tl}</div>
    <div class="rap-ks rap-ks2">
     ${big('No ritmo atual, fecha em',k.du?Q(k.proj):'—',fp!=null?fp+'% da meta':'',fp!=null&&fp<97?'neg':'pos')}
     ${big('Planejado no calendário',k.PLt?Q(k.PLt):'—',k.PLt?(k.PLt<k.T?'falta planejar '+Q(k.T-k.PLt):'cobre a meta do mês'):'nada planejado ainda','')}
     ${big('Aderência ao programa',k.ader==null?'—':Math.round(k.ader*100)+'%','do programado de cada dia, quanto saiu no dia',k.ader!=null&&k.ader<.85?'neg':'')}</div>`});
  // 3) curva S
  out.push({t:'Curva S',ey:'CURVA S'+(F.mist?' · ARGAMASSAS':''),tt:'Acumulado do mês: meta × produzido',h:`<div class="rap-cv">${ritCurva(D,f0,{w:1480,h:400,big:true})}</div>
    <div class="rap-leg"><span><i class="lp"></i>Meta</span><span><i style="background:var(--warn)"></i>Planejado</span><span><i style="background:var(--anl-s1)"></i>Produzido</span><span><i class="lj"></i>No ritmo atual</span><span><i style="background:var(--ok)"></i>Dia na meta</span><span><i style="background:var(--crit)"></i>Dia abaixo</span></div>`});
  // 4) linhas
  const grupos=F.mist?[['Argamassas',F.ar],['Rejuntes e outros',F.rj]]:[['',F.L]];
  const nL=F.L.length, lh=Math.max(46,Math.min(84,Math.floor(560/(nL+(F.mist?1.4:0)))));
  const linha=l=>{ const kk=ritStats(D,{l}), s2=ritSt(kk), p2=kk.T?Math.min(100,kk.ra/kk.T*100):0, a2=kk.T?Math.min(100,kk.pa/kk.T*100):0;
    return `<div class="rap-ln st-${s2.c}" style="height:${lh}px"><b>${esc(l)}</b><div class="rap-bar"><i style="width:${p2}%"></i>${kk.pa?`<em style="left:${a2}%"></em>`:''}<span class="num">${anlN(kk.ra)} <small>de ${anlN(kk.T)}</small></span></div>
      <span class="num rap-dv ${kk.dev<0?'neg':'pos'}">${sg(anlN(kk.dev))}</span>${chip(s2)}</div>`; };
  const nAtr=F.L.filter(l=>ritSt(ritStats(D,{l})).c==='crit').length;
  out.push({t:'Linhas',ey:'POR LINHA',tt:nAtr?`${nAtr} ${nAtr>1?'linhas em risco':'linha em risco'} de ${nL}`:`${nL} linhas acompanhadas`,h:`<div class="rap-lns"><div class="rap-lnh"><span></span><span>Produzido × meta do mês <em class="rap-mk"></em> meta até hoje</span><span>Desvio</span><span>Situação</span></div>
    ${grupos.map(([g,ls])=>(g?`<div class="rap-g">${g}</div>`:'')+ls.map(linha).join('')).join('')}</div>`});
  // 5) por que o desvio
  const rows=F.L.map(l=>({l,k:ritStats(D,{l})})).filter(x=>x.k.dev<0).sort((a,b)=>a.k.dev-b.k.dev);
  const atr=rows.reduce((a,x)=>a-x.k.dev,0), par=rows.reduce((a,x)=>a+Math.min(x.k.perda,-x.k.dev),0), mot={}; let pmin=0;
  F.L.forEach(l=>{ const P=(D.PAR||{})[l]; if(!P) return; pmin+=P.min; for(const m in P.mot) mot[m]=(mot[m]||0)+P.mot[m]; });
  const mots=Object.entries(mot).sort((a,b)=>b[1]-a[1]).slice(0,5), mmx=mots.length?mots[0][1]:1, rmx=rows.length?-rows[0].k.dev:1;
  const pp=atr?Math.round(par/atr*100):0;
  out.push({t:'Por que o desvio',ey:'POR QUE O DESVIO',tt:atr?(pmin?`${anlN(atr)} sacos de atraso: ${pp}% explicado por paradas`:`${anlN(atr)} sacos de atraso, sem parada registrada`):'Nenhuma linha atrás da meta',h:atr?`<div class="rap-pq"><div class="rap-pql">
     ${rows.slice(0,8).map(({l,k:kk})=>{ const pr=Math.min(kk.perda,-kk.dev), sc=-kk.dev-pr; return `<div class="rap-pqr"><b>${esc(l)}</b><div class="rap-pqb" style="width:${Math.max(4,-kk.dev/rmx*100)}%"><i class="pa" style="flex:${pr}"></i><i class="sc" style="flex:${sc}"></i></div><span class="num">${anlN(-kk.dev)}</span></div>`; }).join('')}
     <div class="rap-leg" style="margin-top:14px"><span><i style="background:#E0930F"></i>Perdido em paradas registradas</span><span><i style="background:#C0665D"></i>Sem causa registrada (lentidão, setup, parada não lançada…)</span></div></div>
    <div class="rap-pqm"><div class="rap-sub">Tempo parado no mês</div><div class="rap-pqt num">${pmin?ritH(pmin):'nenhuma parada'}</div>
     ${mots.map(([m,v])=>`<div class="rap-mo"><span>${esc(m)}</span><div><i style="width:${v/mmx*100}%"></i></div><b class="num">${ritH(v)}</b></div>`).join('')}
     ${!pmin?'<p class="rap-nota">Sem paradas registradas: o atraso não tem causa lançada no painel.</p>':''}</div></div>`:`<div class="rap-vazio">Todas as linhas estão em dia com a meta acumulada.</div>`});
  // 6) para fechar o mês
  const cl=F.L.map(l=>{ const kk=ritStats(D,{l}); const cap=kk.cdR||kk.cd; return {l,k:kk,cap,r:cap?kk.needEq/cap:null}; }).filter(x=>x.k.T>0);
  const acima=cl.filter(x=>x.r!=null&&x.r>1);
  out.push({t:'Para fechar o mês',ey:'PARA FECHAR O MÊS',tt:!k.rem?'Não há mais dias úteis no mês':acima.length?`${acima.length} ${acima.length>1?'linhas precisam':'linha precisa'} de mais do que a capacidade`:`Todas as linhas cabem na capacidade`,h:`<div class="rap-fc"><div class="rap-fch"><span></span><span>Quanto precisa produzir por dia útil × quanto a linha consegue</span><span>Precisa / consegue</span><span></span></div>
     ${cl.map(x=>{ const w=x.r==null?0:Math.min(1.5,x.r)/1.5*100; const ok=x.r!=null&&x.r<=1; const done=x.k.sal<=0;
      return `<div class="rap-fcr ${done?'ok':x.r==null?'':ok?'ok':'crit'}" style="height:${lh}px"><b>${esc(x.l)}</b><div class="rap-fcb"><i style="width:${done?0:w}%"></i><em style="left:${100/1.5}%"></em></div>
       <span class="num">${done?'—':anlN(x.k.needEq)}<small>${x.cap?' / '+anlN(x.cap):''}</small></span><span class="rap-vd">${done?'meta batida':x.r==null?'sem capacidade':ok?'cabe':'acima em '+Math.round((x.r-1)*100)+'%'}</span></div>`; }).join('')}
     <div class="rap-leg" style="margin-top:12px"><span><i class="lk"></i>o que a linha consegue por dia (capacidade real dos melhores dias recentes; sem histórico, a nominal)</span><span>${k.rem} dias úteis restantes</span></div></div>`});
  // 7) pontos de atenção
  const Al=ritAlertas(D);
  out.push({t:'Pontos de atenção',ey:'PONTOS DE ATENÇÃO',tt:Al.length?`${Al.length} ${Al.length>1?'pontos para decidir':'ponto para decidir'}`:'Nada fora do esperado',h:Al.length?`<div class="rap-al">${Al.slice(0,6).map(a=>`<div class="rap-ai ${a.c}"><i></i><div><b>${a.t}</b>${a.s?`<span>${a.s}</span>`:''}</div></div>`).join('')}${Al.length>6?`<div class="rap-nota">e mais ${Al.length-6} no painel.</div>`:''}</div>`:`<div class="rap-vazio">Sem alertas no momento.</div>`});
  return {out,st}; }
function ritApres(D){ const A=S.rit, P=A.apr; const {out,st}=rapSlides(D); P.i=Math.max(0,Math.min(out.length-1,P.i|0)); const sl=out[P.i];
  if(!document.getElementById('mdfont')){ try{ const l=document.createElement('link'); l.id='mdfont'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }catch(e){} }
  document.body.classList.add('rap-on'); setTimeout(rapEscala,0);
  const logo=(document.querySelector('.brand img')||{}).src||''; const an=P.vis!==P.i; P.vis=P.i; const n=new Date();
  return `<div class="rap st-${st.c}" style="--s:${Math.min(innerWidth/RAP_W,innerHeight/RAP_H)}" role="dialog" aria-label="Apresentação · ${esc(sl.t)}"><div class="rap-st">
   ${sl.ey?`<header class="rap-hd">${logo?`<img src="${logo}" alt="Colafix">`:''}<div><div class="rap-ey">${sl.ey} · ${esc(ritMesNome(D.cp).toUpperCase())}</div><h2>${sl.tt}</h2></div></header>`:''}
   <div class="rap-bd ${an?'in':''} ${sl.ey?'':'capa'}">${sl.h}</div>
   <footer class="rap-ft">${!sl.ey&&logo?`<img src="${logo}" alt="Colafix">`:'<span></span>'}<div class="rap-dots">${out.map((o,j)=>`<button data-act="rap-ir" data-v="${j}" aria-label="${esc(o.t)}" aria-current="${j===P.i}"></button>`).join('')}</div>
    <span class="rap-at">dados de ${dm(hojeStr())} às ${pad(n.getHours())}:${pad(n.getMinutes())} · ${P.i+1}/${out.length}</span></footer>
  </div>
  <div class="rap-ctl"><button data-act="rap-ant" aria-label="Anterior" ${P.i?'':'disabled'}>‹</button><button data-act="rap-prox" aria-label="Próximo" ${P.i<out.length-1?'':'disabled'}>›</button><button data-act="rap-fs" aria-label="Tela cheia" title="Tela cheia">⛶</button><button data-act="rap-sair" aria-label="Sair da apresentação" title="Sair (Esc)">✕</button></div></div>`; }
function rapSair(){ const A=S.rit; A.apr=null; document.body.classList.remove('rap-on'); try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){} render(); }
function rapFs(){ try{ const el=document.documentElement; if(document.fullscreenElement) document.exitFullscreen(); else if(el.requestFullscreen) el.requestFullscreen().then(()=>{ if(S.rit.apr) S.rit.apr.fs=true; }).catch(()=>{}); }catch(e){} }
function rapVai(d){ const P=S.rit.apr; if(!P) return; const n=document.querySelectorAll('.rap-dots button').length||7; const i=Math.max(0,Math.min(n-1,P.i+d)); if(i===P.i) return; P.i=i; render(); }
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="rit-apr"],[data-act^="rap-"]'); if(!b) return; const a=b.dataset.act, A=S.rit;
  if(a==='rit-apr'){ A.apr={i:0}; A.opc=false; rapFs(); render(); return; }
  if(!A.apr) return;
  if(a==='rap-ir'){ A.apr.i=+b.dataset.v; render(); } else if(a==='rap-ant') rapVai(-1); else if(a==='rap-prox') rapVai(1); else if(a==='rap-fs') rapFs(); else if(a==='rap-sair') rapSair(); });
document.addEventListener('keydown',ev=>{ const A=S.rit; if(!A||!A.apr||S.view!=='anlrit') return; if(ev.target.closest&&ev.target.closest('input,select,textarea')) return;
  if(['ArrowRight','PageDown',' ','Enter'].includes(ev.key)){ ev.preventDefault(); rapVai(1); }
  else if(['ArrowLeft','PageUp','Backspace'].includes(ev.key)){ ev.preventDefault(); rapVai(-1); }
  else if(ev.key==='Home'){ A.apr.i=0; render(); } else if(ev.key==='End'){ A.apr.i=99; render(); }
  else if(ev.key==='Escape') rapSair(); else if(ev.key==='f'||ev.key==='F') rapFs(); });
document.addEventListener('fullscreenchange',()=>{ const A=S.rit; if(!document.fullscreenElement&&A&&A.apr&&A.apr.fs) rapSair(); });

// quadro grande (modo TV aqui e no rodízio da TV da fábrica)
function ritTv(D,embed){ const op=ritCvAtual(D,true); const F=ritFams(D); const T=ritStats(D,F.mist?{ls:F.ar}:{}), stT=ritSt(T), Al=ritAlertas(D), h=hojeStr();
  if(!document.getElementById('mdfont')){ try{ const l=document.createElement('link'); l.id='mdfont'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }catch(e){} }
  const logo=(document.querySelector('.brand img')||{}).src||'';
  const ring=(k)=>{ const pct=k.T?Math.min(1,k.ra/k.T):0, pa=k.T?Math.min(1,k.pa/k.T):0, r=44, C=2*Math.PI*r;
    const ang=pa*2*Math.PI-Math.PI/2, tx=60+Math.cos(ang)*r, ty=60+Math.sin(ang)*r, tx2=60+Math.cos(ang)*(r-14), ty2=60+Math.sin(ang)*(r-14), tx3=60+Math.cos(ang)*(r+8), ty3=60+Math.sin(ang)*(r+8);
    return `<svg class="rtv-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--rt-track)" stroke-width="11"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--rt-c)" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(pct*C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>
      ${k.pa?`<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4.5" fill="var(--rt-card)" stroke="var(--rt-ink)" stroke-width="2.5"><title>meta até hoje</title></circle>`:''}
      <text x="60" y="58" text-anchor="middle" font-size="24" font-weight="600" fill="var(--rt-ink)">${Math.round(pct*100)}%</text><text x="60" y="76" text-anchor="middle" font-size="10.5" fill="var(--rt-mut)">do mês</text></svg>`; };
  const spark=(f)=>{ const s=ritSerie(D,f), mx=Math.max(1,...s.map(x=>Math.max(x.r,x.p)))*1.1, W=300, H=46, bw=W/s.length; const meta=s.length?s[0].p:0;
    return `<svg class="rtv-sp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${s.map((x,i)=>{ const fut=!D.cut||x.d>D.cut, hh=Math.max(fut?3:2,(fut?meta:x.r)/mx*(H-4));
      return `<rect x="${(i*bw+1.5).toFixed(1)}" y="${(H-hh).toFixed(1)}" width="${(bw-3).toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="${fut?'var(--rt-track)':x.r>=x.p*0.95?'var(--rt-ok)':'var(--rt-bad)'}" opacity="${fut?.55:1}"/>${x.d===h?`<rect x="${(i*bw).toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H}" fill="var(--rt-ink)" opacity=".08"/>`:''}`; }).join('')}
      <line x1="0" x2="${W}" y1="${(H-meta/mx*(H-4)).toFixed(1)}" y2="${(H-meta/mx*(H-4)).toFixed(1)}" stroke="var(--rt-ink)" stroke-dasharray="4 4" stroke-width="1" opacity=".55" vector-effect="non-scaling-stroke"/></svg>`; };
  const tile=(f,tit,key)=>{ const k=ritStats(D,f), st=ritSt(k), fp=k.T&&k.du?Math.round(k.proj/k.T*100):null;
    return `<section class="rtv-t st-${st.c} ${op.k===key?'on':''}" data-k="${esc(key)}">
     <div class="rtv-th"><span class="rtv-ln">${esc(tit)}</span><span class="rtv-chip"><i></i>${st.t}</span></div>
     <div class="rtv-main">${ring(k)}<div class="rtv-fig"><b class="num">${anlN(k.ra)}</b><span>de <span class="num">${anlN(k.T)}</span> sacos da meta</span>
       <em class="num ${k.dev<0?'neg':'pos'}">${k.dev>0?'+':''}${anlN(k.dev)} <small>vs meta até hoje</small></em>${k.PLt?`<small class="rtv-pl">planejado ${anlN(k.PLt)}${k.ader!=null?' · aderência '+Math.round(k.ader*100)+'%':''}</small>`:''}</div></div>
     <div class="rtv-spw">${spark(f)}<div class="rtv-spl"><span>dia a dia</span><span>meta ${anlN(k.n?k.T/k.n:0)}/dia</span></div></div>
     <div class="rtv-kk"><div><span>Precisa/dia</span><b class="num ${k.cd&&k.needEq>k.cd?'neg':''}">${k.rem?anlN(k.need):'—'}</b></div><div><span>Capacidade</span><b class="num">${k.cd?anlN(k.cd):'—'}</b></div><div><span>Fecha em</span><b class="num ${fp!=null&&fp<97?'neg':'pos'}">${fp==null?'—':fp+'%'}</b></div></div></section>`; };
  const dias=D.dias, pm=T.n?T.du/T.n:0;
  const tl=`<div class="rtv-tl" aria-label="${T.du} de ${T.n} dias úteis">${dias.map(d=>`<i class="${D.cut&&d<=D.cut?'ok':''} ${d===h?'hj':''}"></i>`).join('')}</div>`;
  const al=Al.slice(0,3).map(a=>`<div class="rtv-al ${a.c}"><i></i><span>${a.t}</span></div>`).join('');
  const agora=new Date();
  return `<div class="rtv ${embed?'emb':''} ${S.apres&&S.apres.on?'apr':''}">
   <header class="rtv-top">
    <div class="rtv-brand">${logo?`<span class="rtv-logo"><img src="${logo}" alt="Colafix"></span>`:''}<div><div class="rtv-ey">Previsto × Realizado</div><div class="rtv-tit">${esc(ritMesNome(D.cp))}</div></div></div>
    <div class="rtv-hero"><b class="num">${T.T?Math.round(T.ra/T.T*100):0}%</b><div><span>da meta ${F.mist?'de argamassas ':''}produzida</span><span class="rtv-chip st-${stT.c}"><i></i>${stT.t}</span></div></div>
    <div class="rtv-mes"><div class="rtv-mesl"><span>Dia útil <b class="num">${T.du}</b> de ${T.n}</span><span>faltam <b class="num">${T.rem}</b></span></div>${tl}</div>
    <div class="rtv-clk"><b class="num" data-rtv-clk>${agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</b><span>${esc(agora.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short'}))}</span></div>
    ${S.apres&&S.apres.on?'':`<button class="rtv-x" data-act="tv" title="Sair do modo TV" aria-label="Sair do modo TV">✕</button>`}
   </header>
   <div class="rtv-body"><div class="rtv-g ${F.L.length+(F.mist?2:1)>5?'many':''}">${F.L.map(l=>tile({l},l,'l:'+l)).join('')}${F.mist?tile({ls:F.ar},'Argamassas','')+tile({ls:F.rj},'Rejuntes e outros','g:rej'):tile({},'Total','')}</div>
    <section class="rtv-cv"><div id="rit-cvbox" class="rit-cvbox">${ritCvBox(D,true)}</div>
     <div class="rtv-leg"><span><i class="lp"></i>meta</span><span><i class="lpl"></i>planejado</span><span><i class="lr"></i>apontado</span><span><i class="lj"></i>no ritmo atual</span><span><i class="lg"></i>atraso</span></div></section></div>
   ${al?`<footer class="rtv-als">${al}</footer>`:''}</div>`; }
setInterval(()=>{ document.querySelectorAll('[data-rtv-clk]').forEach(e=>{ e.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }); },10000);

async function ritCsv(){ const A=S.rit, D=ritDados(A.cp,A.fonte); if(!D) return; const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"', n=v=>String(Math.round(v*10)/10).replace('.',','); let lin;
  if(A.tab==='dia'){ const S0=D.LS.map(l=>ritSerie(D,{l})), T=ritSerie(D,{}); let ap=0, ar=0;
    lin=[['Dia'].concat(...D.LS.map(l=>[l+' previsto',l+' realizado']),['Total previsto','Total realizado','Previsto acumulado','Realizado acumulado','Desvio acumulado']).map(q).join(';')]
      .concat(T.map((t,i)=>{ const fut=!D.cut||t.d>D.cut; ap+=t.p; if(!fut) ar+=t.r; return [dataBR(t.d)].concat(...S0.map(s=>[n(s[i].p),fut?'':n(s[i].r)]),[n(t.p),fut?'':n(t.r),n(ap),fut?'':n(ar),fut?'':n(ar-ap)]).map(q).join(';'); })); }
  else lin=[['Item','Descricao','Linhas','Previsto','Realizado','Saldo','% do mes'].map(q).join(';')].concat(D.its.map(x=>{ const k=ritStats(D,{c:x.c}); return [x.c,x.nome,Object.keys(x.dv).map(l=>l+' '+Math.round(x.dv[l]*100)+'%').join(' / '),n(k.T),n(k.ra),n(Math.max(0,k.sal)),k.T?Math.round(k.ra/k.T*100)+'%':''].map(q).join(';'); }));
  try{ await dl.save({filename:'Previsto_x_Realizado_'+A.cp+(A.tab==='dia'?'_diario':'_itens')+'.csv',data:new Blob(['\ufeff'+lin.join('\r\n')],{type:'text/csv'})}); toast('Planilha exportada.'); }catch(e){ if(!e||e.code!=='declined') toast('Não foi possível baixar.'); } }

function ritEdNovo(){ const C=ritCfg(); return {jornada:C.jornada||528,linhas:[...C.linhas],itens:JSON.parse(JSON.stringify(C.itens)),fer:feriados().map(dataBR).join(', ')}; }
async function ritSalvarCfg(){ const E=S.rit.ed; if(!E||S.rit.salvando) return; if(!E.linhas.length){ toast('Escolha ao menos uma linha.'); return; }
  const fer=[]; let ruim=''; String(E.fer||'').split(/[,;\s]+/).filter(Boolean).forEach(t=>{ const m=t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/); if(!m){ ruim=t; return; } let a=m[3]?+m[3]:+S.rit.cp.slice(0,4); if(a<100) a+=2000; fer.push(a+'-'+pad(+m[2])+'-'+pad(+m[1])); });
  if(ruim){ toast('Não entendi o feriado "'+ruim+'". Use dd/mm/aaaa.'); return; }
  const itens={}; for(const c in E.itens){ const it=E.itens[c], d={}; let s=0; E.linhas.forEach(l=>{ const v=+String((it.d||{})[l]==null?'':it.d[l]).replace(',','.'); if(v>0){ d[l]=Math.round(v*100)/100; s+=v; } });
    if(!s){ toast(c+': informe a % de pelo menos uma linha.'); return; } itens[c]={d}; if(+it.f>1.01) itens[c].f=RIT_PL; }
  const ritmo={linhas:E.linhas,itens,jornada:Math.max(60,Math.min(1440,+E.jornada||528)),em:new Date().toISOString(),por:S.uid||null};
  S.rit.salvando=true; render();
  try{ await S.db.doc('config/geral').update({ritmo,feriados:[...new Set(fer)].sort()}); S.cfg.ritmo=ritmo; S.cfg.feriados=[...new Set(fer)].sort(); S.anl._c=null; S.rit.cfg=false; S.rit.ed=null; toast('Acompanhamento salvo.'); }
  catch(e){ erro(e); } S.rit.salvando=false; render(); }

document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="rit-"]'); if(!b) return; const A=S.rit, a=b.dataset.act, v=b.dataset.v;
  if(a==='rit-fonte'){ A.fonte=v; render(); return; }
  if(a==='rit-meta'){ A.meta=v; render(); return; }
  if(a==='rit-foto'){ ritFotoSalva(true); return; }
  if(a==='rit-un'){ A.un=v; render(); return; }
  if(a==='rit-tab'){ A.tab=v; render(); return; }
  if(a==='rit-curva'){ A.curva=v; A.auto=false; render(); return; }
  if(a==='rit-jan'){ A.jan=v; A._cvi=-1; render(); return; }
  if(a==='rit-auto'){ A.auto=!A.auto; if(!A.auto){ const D=ritDados(A.cp,A.fonte); if(D) A.curva=ritCvAtual(D,true).k; } A._cvi=-1; render(); return; }
  if(a==='rit-tv'){ modoTV(true); go('anlrit'); return; }
  if(a==='rit-csv'){ ritCsv(); return; }
  if(a==='rit-cfg'){ A.cfg=!A.cfg; A.ed=A.cfg?ritEdNovo():null; render(); if(A.cfg) setTimeout(()=>{ const c=document.querySelector('.rit-cfg'); if(c) c.scrollIntoView({behavior:'smooth',block:'start'}); },30); return; }
  if(a==='rit-cfg-x'){ A.cfg=false; A.ed=null; render(); return; }
  if(a==='rit-cfg-ok'){ ritSalvarCfg(); return; }
  if(a==='rit-cfg-l'&&A.ed){ const L=A.ed.linhas; A.ed.linhas=L.includes(v)?L.filter(x=>x!==v):linhasOrd().filter(x=>L.includes(x)||x===v); render(); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; const A=S.rit;
  if(t.id==='rit-mes'){ A.cp=t.value; render(); return; }
  if(t.id==='rit-cvi'){ A.curva=t.value; A.auto=!t.value?A.auto:false; render(); return; }
  if(!A.ed) return;
  if(t.dataset&&t.dataset.ritOn!=null){ const c=t.dataset.ritOn; if(t.checked){ const L=A.ed.linhas, d={}; const ls=anlLinhasDe(c,((S.anl.base.itens||{}).l||{})[c]).filter(l=>L.includes(l)); (ls.length?ls:L).forEach(l=>d[l]=Math.round(100/((ls.length?ls:L).length))); A.ed.itens[c]={d,f:/PLASTIC/i.test(ritDesc(c))?RIT_PL:1}; } else delete A.ed.itens[c]; render(); return; }
  if(t.dataset&&t.dataset.ritF!=null){ const it=A.ed.itens[t.dataset.ritF]; if(it) it.f=+t.value; return; } });
document.addEventListener('input',ev=>{ const t=ev.target, A=S.rit; if(!A.ed) return;
  if(t.id==='rit-fer'){ A.ed.fer=t.value; return; }
  if(t.id==='rit-jor'){ A.ed.jornada=t.value.replace(/\D/g,''); return; }
  if(t.dataset&&t.dataset.ritPc!=null){ const it=A.ed.itens[t.dataset.ritPc]; if(!it) return; it.d=it.d||{}; const l=t.dataset.l, v=t.value.trim();
    if(v==='') delete it.d[l]; else it.d[l]=v;
    if(A.ed.linhas.length===2&&v!==''&&!isNaN(+v.replace(',','.'))){ const o=A.ed.linhas.find(x=>x!==l); const r=Math.max(0,100-(+v.replace(',','.'))); it.d[o]=Math.round(r*100)/100; const inp=document.querySelector(`[data-rit-pc="${CSS.escape(t.dataset.ritPc)}"][data-l="${CSS.escape(o)}"]`); if(inp) inp.value=it.d[o]; } } });

// TV da fábrica: alterna com o quadro do mês (opção deste aparelho)
S.tvf.rit=(()=>{ try{ return localStorage.getItem('colafix.tvf.rit')==='1'; }catch(e){ return false; } })();
S.tvf.fase=0;
setInterval(()=>{ try{ if(S.view!=='tvfab'||!S.tvf.rit) return; const f=Math.floor(Date.now()/20000)%2; if(f!==S.tvf.fase){ S.tvf.fase=f; rerenderSeguro(); } }catch(e){} },1000);
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="tvf-rit"]'); if(!b) return; S.tvf.rit=!S.tvf.rit; try{ localStorage.setItem('colafix.tvf.rit',S.tvf.rit?'1':'0'); }catch(e){} render(); });
function ritTvFab(){ const h=hojeStr(); const D=ritDados(h.slice(0,7),'painel'); return D?ritTv(D,true):''; }

// ================= 03/10: Telas de TV · apresentação (alterna as telas de TV em tela cheia) =================
const APR_TELAS=[
  {k:'tvfab',v:'tvfab',nome:'Produção do dia',d:'TV da fábrica: o que cada linha está produzindo agora, o que vem a seguir e o material de cada ordem.',cor:'#1B5C7A',on:true},
  {k:'ritmo',v:'anlrit',nome:'Previsto × Realizado',d:'Ritmo do mês por linha, desvio, quanto precisa por dia e a Curva S trocando entre as linhas.',cor:'#2E9E5B',on:true},
  {k:'monitor',v:'diario',nome:'Monitor do almoxarifado',d:'Diário de bordo dos ranchos: o que falta separar, enviar e entregar para as linhas.',cor:'#E0930F',on:true},
  {k:'silos',v:'geral',nome:'Silos',d:'Nível de cimento e areia nos silos e a previsão de falta.',cor:'#6B6558',on:false},
  {k:'cal',v:'calendario',nome:'Calendário da semana',d:'Programação das linhas na semana.',cor:'#8A6326',on:false}];
S.apres=(()=>{ let o={}; try{ o=JSON.parse(localStorage.getItem('colafix.apres')||'{}')||{}; }catch(e){} return {on:false,i:0,lista:[],seg:+o.seg||30,sel:o.sel&&typeof o.sel==='object'?o.sel:null,pausa:false,t0:0,ant:null}; })();
function aprSalvar(){ try{ localStorage.setItem('colafix.apres',JSON.stringify({seg:S.apres.seg,sel:S.apres.sel})); }catch(e){} }
function aprTelas(){ return APR_TELAS.filter(t=>viewOk(t.v)); }
function aprSel(t){ const s=S.apres.sel; return s&&s[t.k]!=null?!!s[t.k]:t.on; }
function vApres(){ const A=S.apres, ts=aprTelas(), n=ts.filter(aprSel).length;
  return `<div class="head"><div><div class="eyebrow">TELAS DE TV</div><h1>Apresentação</h1><div class="sub">Escolha as telas e inicie: elas passam sozinhas em tela cheia. Use ← → para trocar, espaço para pausar e Esc para sair.</div></div></div>
   <section class="card apr-cfg"><div class="apr-go"><div><div class="label">TEMPO EM CADA TELA</div><div class="seg" style="margin-top:6px">${[15,30,60,120].map(v=>`<button data-act="apr-seg" data-v="${v}" aria-pressed="${A.seg===v}">${v<60?v+' s':(v/60)+' min'}</button>`).join('')}</div></div>
     <button class="btn big" data-act="apr-ini" ${n?'':'disabled'}>${ic('tv',20,2)}Iniciar apresentação <small class="num" style="font-weight:600;opacity:.8">${n} ${n===1?'tela':'telas'}</small></button></div></section>
   <div class="apr-g">${ts.map((t,i)=>`<section class="apr-c ${aprSel(t)?'on':''}" style="--c:${t.cor}"><div class="apr-pv">${aprMini(t.k)}</div>
     <div class="apr-b"><div class="apr-n"><b>${esc(t.nome)}</b><label class="apr-ck"><input type="checkbox" data-apr-sel="${t.k}" ${aprSel(t)?'checked':''}> Na apresentação</label></div><div class="sub" style="margin:2px 0 0;font-size:13px">${esc(t.d)}</div>
     <div class="chips" style="margin-top:12px"><button class="btn sec" data-act="apr-abre" data-v="${t.k}" style="height:40px">${ic('tv',16,2)}Abrir só esta</button></div></div></section>`).join('')}</div>`; }
// miniatura esquemática de cada tela
function aprMini(k){ const b=(x,y,w,h,c,o)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" opacity="${o||1}"/>`;
  const fundo=b(0,0,160,90,'#F2F5F7');
  if(k==='tvfab') return `<svg viewBox="0 0 160 90">${fundo}${[0,1,2].map(i=>b(8+i*50,10,46,72,'#fff')+b(8+i*50,10,46,4,['#7CC4A0','#E9B872','#8DB4C9'][i])+b(13+i*50,22,30,6,'#143F54',.8)+b(13+i*50,32,36,3,'#5E6E76',.4)+b(13+i*50,44,36,10,'#EEF1F3')+b(13+i*50,60,36,8,'#EEF1F3')).join('')}</svg>`;
  if(k==='ritmo') return `<svg viewBox="0 0 160 90">${fundo}${b(6,6,148,12,'#fff')}${[0,1,2].map(i=>b(6,22+i*22,44,19,'#fff')+b(6,22+i*22,3,19,'#D64545')).join('')}${b(54,22,100,63,'#fff')}<path d="M60 78 L148 34" stroke="#8C949A" stroke-dasharray="3 3" fill="none"/><path d="M60 78 L80 70" stroke="#1672A8" stroke-width="2.5" fill="none"/><path d="M80 70 L148 52" stroke="#1672A8" stroke-dasharray="1 3" fill="none"/></svg>`;
  if(k==='monitor') return `<svg viewBox="0 0 160 90">${fundo}${b(6,6,148,12,'#fff')}${[0,1,2,3].map(i=>b(6+i*37,22,34,62,'#F7F9FA')+b(6+i*37,22,34,3,['#D64545','#E0930F','#1B5C7A','#2E9E5B'][i])+[0,1,2].map(j=>b(9+i*37,29+j*18,28,15,'#fff')+b(9+i*37,29+j*18,2,15,['#D64545','#E0930F','#1B5C7A','#2E9E5B'][i])).join('')).join('')}</svg>`;
  if(k==='silos') return `<svg viewBox="0 0 160 90">${fundo}${[0,1,2,3,4,5].map(i=>b(12+i*24,20,16,58,'#EDE7DA')+b(12+i*24,20+58*(1-[.7,.4,.85,.3,.6,.5][i]),16,58*[.7,.4,.85,.3,.6,.5][i],['#6A9C7E','#D2A857','#6A9C7E','#C0665D','#6A9C7E','#6A9C7E'][i])).join('')}</svg>`;
  return `<svg viewBox="0 0 160 90">${fundo}${[0,1,2,3,4].map(i=>b(8+i*29,10,27,74,'#fff')+[0,1,2].map(j=>b(10+i*29,16+j*22,23,18,['#E3ECF0','#F5ECD6','#E2EEE6'][(i+j)%3])).join('')).join('')}</svg>`; }

function aprAplica(){ const A=S.apres, t=A.lista[A.i]; if(!t) return; A.t0=Date.now(); A._fim=null;
  if(t.k==='monitor'){ S.dbo.modo='monitor'; S.dbo.dia=hojeStr(); S.dbo.so=''; } else if(A.ant) S.dbo.modo=A.ant.dbo;
  document.body.classList.add('tv'); go(t.v); aprBarra(); }
function aprIniciar(lista){ const A=S.apres; if(!lista.length) return;
  A.ant={dbo:S.dbo.modo,tvfRit:S.tvf.rit,view:S.view}; S.tvf.rit=false;
  A.lista=lista; A.i=0; A.on=true; A.pausa=false;
  try{ const el=document.documentElement; if(!document.fullscreenElement&&el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }catch(e){}
  aprAplica(); }
function aprSair(){ const A=S.apres; if(!A.on) return; A.on=false; const ant=A.ant||{};
  S.dbo.modo=ant.dbo||''; S.tvf.rit=!!ant.tvfRit; document.body.classList.remove('tv');
  try{ if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(e){}
  const bar=document.getElementById('apr-bar'); if(bar) bar.remove(); go(ant.view==='gestao'?'gestao':'tvapres'); /* aberta pela Visão do gestor: volta para ela */ }
function aprPassa(d){ const A=S.apres; if(!A.on) return; A.i=(A.i+d+A.lista.length)%A.lista.length; aprAplica(); }
function aprBarra(){ const A=S.apres; let bar=document.getElementById('apr-bar');
  if(!bar){ bar=document.createElement('div'); bar.id='apr-bar'; bar.className='apr-bar'; document.body.appendChild(bar); }
  const t=A.lista[A.i]||{};
  bar.innerHTML=`<div class="apr-bt"><span class="apr-dots">${A.lista.map((x,i)=>`<i class="${i===A.i?'on':''}" title="${esc(x.nome)}"></i>`).join('')}</span><b>${esc(t.nome||'')}</b></div>
   <div class="apr-bb">${A.lista.length>1?`<button data-act="apr-ant" title="Anterior (←)" aria-label="Anterior">‹</button><button data-act="apr-pausa" title="Pausar (espaço)" aria-label="${A.pausa?'Continuar':'Pausar'}">${A.pausa?'▶':'❚❚'}</button><button data-act="apr-prox" title="Próxima (→)" aria-label="Próxima">›</button>`:''}<button data-act="apr-sair" title="Sair (Esc)" aria-label="Sair">✕</button></div>
   ${A.lista.length>1?`<div class="apr-pg"><i id="apr-pgi"></i></div>`:''}`;
  aprAcorda(); }
function aprAcorda(){ const bar=document.getElementById('apr-bar'); if(!bar) return; bar.classList.add('vis'); clearTimeout(aprAcorda._t); aprAcorda._t=setTimeout(()=>bar.classList.remove('vis'),3500); }
setInterval(()=>{ try{ const A=S.apres; if(!A.on) return;
  if(!document.body.classList.contains('tv')){ document.body.classList.add('tv'); }
  if(!document.getElementById('apr-bar')) aprBarra();
  const t=A.lista[A.i]; if(t&&S.view!==t.v){ go(t.v); }
  if(A.lista.length<2) return;
  if(A.pausa){ A.t0+=500; return; }
  const p=Math.min(1,(Date.now()-A.t0)/(A.seg*1000)); const g=document.getElementById('apr-pgi'); if(g) g.style.width=(p*100)+'%';
  if(p>=1) aprPassa(1); }catch(e){} },500);
document.addEventListener('click',ev=>{ const A=S.apres;
  if(A.on&&ev.target.closest('[data-act="tv"],[data-act="tvf-lista"]')){ ev.preventDefault(); ev.stopPropagation(); aprSair(); return; }
  const b=ev.target.closest('[data-act^="apr-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='apr-seg'){ A.seg=+b.dataset.v; aprSalvar(); render(); return; }
  if(a==='apr-ini'){ aprIniciar(aprTelas().filter(aprSel)); return; }
  if(a==='apr-abre'){ const t=aprTelas().find(x=>x.k===b.dataset.v); if(t) aprIniciar([t]); return; }
  if(a==='apr-sair'){ aprSair(); return; }
  if(a==='apr-prox'){ aprPassa(1); return; }
  if(a==='apr-ant'){ aprPassa(-1); return; }
  if(a==='apr-pausa'){ A.pausa=!A.pausa; aprBarra(); return; } },true);
document.addEventListener('change',ev=>{ const t=ev.target; if(!t.dataset||t.dataset.aprSel==null) return; const A=S.apres; A.sel=Object.assign({},A.sel||{}); A.sel[t.dataset.aprSel]=t.checked; aprSalvar(); render(); });
document.addEventListener('keydown',ev=>{ const A=S.apres; if(!A.on) return;
  if(ev.key==='Escape'){ ev.preventDefault(); ev.stopImmediatePropagation(); aprSair(); return; }
  if(ev.key==='ArrowRight'){ aprPassa(1); return; } if(ev.key==='ArrowLeft'){ aprPassa(-1); return; }
  if(ev.key===' '&&!(ev.target&&ev.target.matches&&ev.target.matches('input,textarea,select,button'))){ ev.preventDefault(); A.pausa=!A.pausa; aprBarra(); } },true);
document.addEventListener('mousemove',()=>{ if(S.apres.on) aprAcorda(); });
document.addEventListener('fullscreenchange',()=>{ if(S.apres.on&&!document.fullscreenElement&&S.apres._fs) aprSair(); S.apres._fs=!!document.fullscreenElement; });
VIEWS.tvapres={nome:'Apresentação',ic:'tv',mob:'TVs'}; CRUMB.tvapres='Apresentação';
MODS.push({id:'telas',nome:'Telas de TV',ic:'tv',views:['tvapres']});



// ================= 05/10: PAINÉIS POR CARGO · acesso + tela inicial com blocos (montados pela master) =================
// config/paineis = {cargos:{cg_x:{nome,desc,mods,ocultas,locais,contar,receber,auditar,verAud,blocos:[{t,s,p}]}}, dono:{blocos}}
// acessos/{uid}.perfil = 'cg_x' → a pessoa segue o cargo (módulos, abas e painel). acessos/{uid}.blocos = painel próprio (opcional).
S.pnl={dados:{cargos:{}},lido:false,sub:false,ed:null,prev:null,_ini:false,add:false,salvando:false};
const PNL_BLOCOS={
  linha:{nome:'Produção da linha',d:'O que uma linha está produzindo agora, quanto já saiu e o que vem a seguir.',ic:'fabrica',s:'m',par:'linha',go:'programacao'},
  linhas:{nome:'Todas as linhas',d:'Uma faixa por linha: ordem atual, andamento e situação.',ic:'tv',s:'g',go:'tvfab'},
  ritmo:{nome:'Ritmo do mês',d:'Previsto × realizado do mês, desvio e quanto precisa por dia.',ic:'relogio',s:'m',par:'ritmo',go:'anlrit'},
  alertas:{nome:'O que precisa de atenção',d:'Paradas, atrasos, ranchos e falta de cimento, num só lugar.',ic:'alvo',s:'m'},
  ranchos:{nome:'Diário de bordo (ranchos)',d:'O diário de bordo do dia: o que falta separar, enviar e entregar nas linhas, com atrasos e prioridades.',ic:'folha',s:'m',par:'linhaOpc',go:'diario'},
  fila:{nome:'Fila do almox',d:'Ranchos a separar e entregar, por prioridade, com complementos pendentes. Abre direto na Fila do almoxarifado.',ic:'lista',s:'m',par:'linhaOpc',go:'diario'},
  paradas:{nome:'Paradas',d:'Linhas paradas agora e o tempo parado hoje.',ic:'pausa',s:'p',go:'paradas'},
  silos:{nome:'Silos',d:'Cimento e areia nos silos e se o cimento cobre a programação.',ic:'silo',s:'p',go:'geral'},
  atrasadas:{nome:'Ordens atrasadas',d:'Ordens com data vencida e saldo a produzir.',ic:'lista',s:'m',go:'programacao'},
  cargas:{nome:'Cargas de cimento',d:'Cargas a caminho, na fábrica e descarregadas hoje.',ic:'rota',s:'p',go:'cargas'},
  premix:{nome:'Fichas de premix',d:'Fichas do dia e as que faltam abrir OP no sistema.',ic:'premix',s:'p',go:'pmxfichas'},
  atalhos:{nome:'Atalhos',d:'Botões grandes para as telas que a pessoa mais usa.',ic:'grid',s:'g',par:'views'},
  recado:{nome:'Recado do PCP',d:'Um aviso fixo escrito por você no topo do painel.',ic:'folha',s:'g',par:'texto'}};
const PNL_TAM={p:'Pequeno',m:'Médio',g:'Largura toda'};
const PNL_MODELOS={
  supprod:{nome:'Supervisor de produção',desc:'Acompanha as linhas, paradas e o ritmo do mês.',mods:['inicio','producao'],blocos:[{t:'alertas',s:'m'},{t:'ritmo',s:'m',p:{ritmo:'total'}},{t:'linhas',s:'g'},{t:'paradas',s:'p'},{t:'atrasadas',s:'m'},{t:'silos',s:'p'}]},
  lider:{nome:'Líder de linha',desc:'Vê a própria linha e registra paradas.',mods:['producao'],ocultas:['indicadores','ranchos'],blocos:[{t:'linha',s:'m',p:{linha:'Linha 1'}},{t:'ritmo',s:'m',p:{ritmo:'Linha 1'}},{t:'ranchos',s:'m',p:{linha:'Linha 1'}},{t:'paradas',s:'p'}]},
  almox:{nome:'Almoxarifado',desc:'Próximo a separar, fila, complementos, falta de material, premix e contagem.',mods:['almox','premix'],locais:['a3'],contar:1,receber:1,blocos:[{t:'proximo',s:'g'},{t:'comp',s:'p'},{t:'fila',s:'m'},{t:'faltamat',s:'m'},{t:'pmxmp',s:'m'},{t:'amanha',s:'g'},{t:'cargas',s:'p'},{t:'contagem',s:'m'}]},
  gerencia:{nome:'Gerência',desc:'Visão do mês e do que precisa de atenção.',mods:['inicio','silos','producao','analise'],blocos:[{t:'ritmo',s:'m',p:{ritmo:'total'}},{t:'alertas',s:'m'},{t:'ritmo',s:'p',p:{ritmo:'Linha 1'}},{t:'ritmo',s:'p',p:{ritmo:'Linha 2'}},{t:'silos',s:'p'},{t:'linhas',s:'g'}]},
  vazio:{nome:'Novo cargo',desc:'',mods:[],blocos:[]}};
function pnlCargos(){ return (S.pnl.dados&&S.pnl.dados.cargos)||{}; }
function pnlCargo(k){ return k&&String(k).startsWith('cg_')?pnlCargos()[k]||null:null; }
function pnlPerfilNome(k){ const c=pnlCargo(k); return c?c.nome:((ACS_PERFIS[k]||ACS_PERFIS.outro).nome); }
function pnlPessoasDe(k){ return (S.acs.lista||[]).filter(d=>d._id!=='_geral'&&d.perfil===k); }
function pnlNum(){ return 'cg_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function pnlClone(x){ return JSON.parse(JSON.stringify(x||null)); }
// --- acesso: a pessoa segue o cargo ---
const _pnlAcsP=acsP;
acsP=function(){ const p=_pnlAcsP(); if(!p||p.tudo) return p; const d=S.acs.doc||{}; const cg=pnlCargo(d.perfil);
  if(cg) return Object.assign({},p,{mods:[...(cg.mods||[])],locais:(cg.locais||[]).filter(l=>ALX_LOC[l]),contar:!!cg.contar,receber:!!cg.receber,auditar:!!cg.auditar,verAud:!!(cg.auditar||cg.verAud),ocultas:cg.ocultas||[],blocos:(d.blocos&&d.blocos.length)?d.blocos:(cg.blocos||[]),cargo:cg});
  return Object.assign({},p,{ocultas:d.ocultas||[],blocos:d.blocos||[]}); };
const _pnlViewOk=viewOk;
viewOk=function(v){ if(v==='painel') return S.acs.dono?pnlBlocos().length>0:!!acsP(); if(v==='paineis') return !!S.acs.dono; if(v==='meudia'&&!S.acs.dono) return false; /* quem não é master usa o Meu painel (a rotina do cargo), nunca o Meu dia do PCP */
  const p=acsP(); if(p&&!p.tudo&&p.ocultas&&p.ocultas.includes(v)) return false; return _pnlViewOk(v); };
const _pnlPreset=acsPreset;
acsPreset=function(k){ const c=pnlCargo(k); if(!c) return _pnlPreset(k); return {perfil:k,mods:[...(c.mods||[])],locais:[...(c.locais||[])],contar:!!c.contar,receber:!!c.receber,auditar:!!c.auditar,verAud:!!c.verAud,ativo:true}; };
function pnlBlocos(){ if(S.acs.dono){ const P=S.pnl.prev; if(P) return P.blocos||[]; return ((S.pnl.dados||{}).dono||{}).blocos||[]; } const p=acsP(); return (p&&p.blocos)||[]; }
VIEWS.painel={nome:'Meu painel',ic:'grid',mob:'Painel'}; VIEWS.paineis={nome:'Painéis por cargo',ic:'grid'};
CRUMB.painel='Meu painel'; CRUMB.paineis='Painéis por cargo';
MODS.unshift({id:'meupainel',nome:'Meu painel',ic:'grid',views:['painel']});
// carrega config/paineis e leva a pessoa para o painel na primeira vez
setInterval(()=>{ try{ const N=S.pnl;
  if(!N.sub&&S.db){ N.sub=true; S.db.doc('config/paineis').onSnapshot(s=>{ N.dados=s.exists?(s.data()||{}):{}; if(!N.dados.cargos) N.dados.cargos={}; N.lido=true; rerenderSeguro(); },()=>{ N.lido=true; }); }
  if(!N._ini&&N.lido&&S.acs.pronto&&!S.acs.dono&&acsP()){ N._ini=true; if(S.view==='meudia'||S.view==='painel'||!viewOk(S.view)) go('painel'); }
}catch(e){} },400);

// ---------- blocos ----------
function pnlNomeProd(x){ return String(x.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,'').split(' ').map(w=>/^[A-Za-zÀ-ÿ]{4,}$/.test(w)?w.charAt(0).toUpperCase()+w.slice(1).toLowerCase():w).join(' '); }
function pnlLinhaInfo(l){ const h=hojeStr(), xs=corLista(l,h), par=S.paradas.find(p=>p.linha===l&&!p.fim), an=anuladas();
  const pend=x=>x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueDe(x)); const ab=xs.filter(x=>pend(x)>0);
  const entH=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&e.linha===l&&hojeStr(new Date(e.em))===h).reduce((a,e)=>a+(+e.qtd||0),0);
  const atras=xs.some(x=>!x._pv&&ordAtras(x,h)&&pend(x)>0); const cur=ab[0];
  const st=par?{c:'crit',t:'Parada · '+(par.motivo||'sem motivo')+' há '+dur(Date.now()-new Date(par.inicio))}:!xs.length?{c:'neu',t:'Nada programado'}:!ab.length?{c:'ok',t:'Tudo produzido'}:atras?{c:'warn',t:'Atrasada'}:(entH>0||(cur&&!cur._pv&&entregueDe(cur)>0))?{c:'ok',t:'Produzindo'}:{c:'neu',t:'Aguardando início'};
  return {l,xs,ab,cur,pend,entH,st}; }
const PNL_R={
  linha(p){ const L=linhasOrd(), l=L.includes(p.linha)?p.linha:L[0]; const X=pnlLinhaInfo(l), x=X.cur;
    const now=x?(()=>{ const e=x._pv?0:entregueDe(x), tot=x._pv?(+x.qtd||0):(+x.total||0), pc=tot?Math.min(100,e/tot*100):0;
      return `<div class="pb-cap">Agora</div><div class="pb-op"><b>${esc(x._pv?(x.codigo||codigoDe(x)):codigoDe(x))}</b><span>${x._pv?'previsão':'OP '+esc(x.num)}</span></div><div class="pb-nm">${esc(pnlNomeProd(x))}</div>
       <div class="pb-bar"><i style="width:${pc}%"></i></div><div class="pb-q"><b class="num">${f0(e)}</b> de ${f0(tot)} ${esc(x._pv?'':uA(x))}</div>`; })():`<div class="pb-vz">${X.xs.length?'Todas as ordens do dia produzidas':'Nada programado hoje'}</div>`;
    const nx=X.ab.slice(1,3).map(z=>`<div class="pb-nx"><b>${esc(z._pv?(z.codigo||codigoDe(z)):codigoDe(z))}</b><span>${esc(pnlNomeProd(z))}</span><em class="num">${f0(X.pend(z))}</em></div>`).join('');
    return {tit:esc(l),st:X.st,html:`${now}${nx?`<div class="pb-cap" style="margin-top:12px">A seguir</div>${nx}`:''}<div class="pb-ft">${X.entH?f0(X.entH)+' entregues hoje':'Nenhuma entrega lançada hoje'}</div>`}; },
  linhas(){ const L=linhasOrd().map(pnlLinhaInfo).filter(X=>X.xs.length||X.st.c==='crit');
    return {html:L.length?`<div class="pb-lns">${L.map(X=>{ const x=X.cur, e=x&&!x._pv?entregueDe(x):0, tot=x?(x._pv?(+x.qtd||0):(+x.total||0)):0, pc=tot?Math.min(100,e/tot*100):(X.ab.length?0:100);
      return `<div class="pb-ln ${X.st.c}"><div class="pb-lnh"><b>${esc(X.l)}</b><span class="pb-dot ${X.st.c}">${esc(X.st.t)}</span></div><div class="pb-lnc">${x?`<b>${esc(x._pv?(x.codigo||codigoDe(x)):codigoDe(x))}</b> ${esc(pnlNomeProd(x))}`:'—'}</div><div class="pb-bar"><i style="width:${pc}%"></i></div><div class="pb-lnq num">${x?f0(e)+' de '+f0(tot):''}${X.entH?` · ${f0(X.entH)} hoje`:''}</div></div>`; }).join('')}</div>`:'<div class="pb-vz">Nada programado hoje.</div>'}; },
  ritmo(p){ const D=ritDados(hojeStr().slice(0,7),'painel'); if(!D) return {html:'<div class="pb-vz">Sem previsão do mês importada.<br><small>O PCP importa o relatório RPRE0301 do Focco.</small></div>'};
    const f=p.ritmo&&p.ritmo!=='total'&&D.LS.includes(p.ritmo)?{l:p.ritmo}:{}; const k=ritStats(D,f), st=ritSt(k), pct=k.T?Math.round(k.ra/k.T*100):0, fp=k.T&&k.du?Math.round(k.proj/k.T*100):null;
    return {tit:'Ritmo do mês · '+esc(f.l||'Total'),st,html:`<div class="pb-big"><b class="num">${anlN(k.ra)}</b><span>de ${anlN(k.T)} sacos · ${pct}%</span></div>
     <div class="pb-bar big"><i style="width:${Math.min(100,pct)}%"></i>${k.T&&k.pa?`<em style="left:${Math.min(100,k.pa/k.T*100)}%" title="previsto até hoje"></em>`:''}</div>
     <div class="pb-k3"><div><span>Desvio</span><b class="num ${k.dev<0?'neg':'pos'}">${k.dev>0?'+':''}${anlN(k.dev)}</b></div><div><span>Precisa por dia</span><b class="num ${k.cd&&k.needEq>k.cd?'neg':''}">${k.rem?anlN(k.need):'—'}</b></div><div><span>Fecha em</span><b class="num ${fp!=null&&fp<97?'neg':'pos'}">${fp==null?'—':fp+'%'}</b></div></div>`}; },
  alertas(){ const A=[], h=hojeStr();
    S.paradas.filter(p=>!p.fim).forEach(p=>A.push({c:'crit',t:`${esc(p.linha)} parada há ${dur(Date.now()-new Date(p.inicio))}`,s:esc(p.motivo||'sem motivo'),go:'paradas'}));
    try{ const D=ritDados(h.slice(0,7),'painel'); if(D) ritAlertas(D).slice(0,3).forEach(a=>A.push({c:a.c,t:a.t,s:'',go:'anlrit'})); }catch(e){}
    try{ const n=repAtrasadas().length; if(n) A.push({c:'warn',t:`${n} ${n===1?'ordem atrasada':'ordens atrasadas'} com saldo`,s:'replanejar no Calendário',go:'programacao'}); }catch(e){}
    try{ const r=pnlRanchos(''); const at=r.filter(x=>x.x.c==='crit'&&!x.feito).length; if(at) A.push({c:'crit',t:`${at} ${at===1?'rancho atrasado ou com problema':'ranchos atrasados ou com problema'}`,s:'diário de bordo do almox',go:'diario'}); }catch(e){}
    try{ const pc=previsaoCimento(); if(pc&&pc.falta) A.push({c:'crit',t:'Cimento não cobre a programação',s:`falta na OP ${esc(pc.falta.o.num)} (${esc(pc.falta.o.linha)}) em ${dm(pc.falta.dia)}`,go:'geral'}); }catch(e){}
    const v=A.filter(a=>!a.go||viewOk(a.go)||true);
    return {st:v.length?{c:v.some(a=>a.c==='crit')?'crit':'warn',t:v.length+(v.length===1?' alerta':' alertas')}:{c:'ok',t:'Tudo em dia'},
      html:v.length?`<div class="pb-als">${v.slice(0,7).map(a=>`<${a.go&&viewOk(a.go)?`button class="pb-al ${a.c}" data-go="${a.go}"`:`div class="pb-al ${a.c}"`}><i></i><span><b>${a.t}</b>${a.s?`<small>${a.s}</small>`:''}</span></${a.go&&viewOk(a.go)?'button':'div'}>`).join('')}</div>`:'<div class="pb-vz ok">Nada pedindo atenção agora.</div>'}; },
  fila(p){ const r=pnlRanchos(p.linha||'').filter(x=>x.o.status==='aberta'&&x.o.rancho), g={};
    r.filter(x=>!x.e.ent).forEach(x=>{ const k=String(x.o.rancho); (g[k]=g[k]||{num:k,rs:[]}).rs.push(x); });
    const gs=Object.values(g).map(z=>{ z.o=z.rs.slice().sort((a,b)=>priOrd(a.o)-priOrd(b.o))[0].o; z.sep=z.rs.some(x=>x.e.sep); z.env=z.rs.some(x=>x.e.env); const ms=z.rs.map(x=>dbPrecisa(x.o)).filter(m=>m!=null); z.m=ms.length?Math.min(...ms):null; return z; })
      .sort((a,b)=>priOrd(a.o)-priOrd(b.o)||(a.m==null)-(b.m==null)||(a.m-b.m)||a.num.localeCompare(b.num));
    const cp=r.filter(x=>x.e.conf&&x.e.conf.falta&&!x.e.comp).length, as=gs.filter(z=>!z.sep).length, se=gs.filter(z=>z.sep).length, urg=gs.filter(z=>dbPri(z.o)===1).length;
    return {tit:'Fila do almox'+(p.linha?' · '+esc(p.linha):''),st:cp?{c:'crit',t:cp+' complemento'+(cp>1?'s':'')}:urg?{c:'crit',t:urg+' urgente'+(urg>1?'s':'')}:gs.length?{c:'warn',t:gs.length+' na fila'}:{c:'ok',t:'Fila vazia'},
      html:`<div class="pb-k3"><div><span>A separar</span><b class="num ${as?'neg':''}">${as}</b></div><div><span>Separados · falta entregar</span><b class="num">${se}</b></div><div><span>Complementos</span><b class="num ${cp?'neg':''}">${cp}</b></div></div>
       ${gs.length?`<div class="pb-rl">${gs.slice(0,6).map(z=>{ const pr=dbPri(z.o), c=pr===1?'crit':z.sep?'ok':z.env?'warn':'neu', lin=[...new Set(z.rs.map(x=>x.o.linha))].join(' · ');
          return `<div class="pb-ri ${c}"><i></i><div><b>Rancho ${esc(z.num)}</b> <span>${esc(lin)} · ${z.rs.length} OP${z.rs.length>1?'s':''} · ${esc(codigoDe(z.o))}</span></div><em>${pr===1?'Urgente':z.sep?'Separado':z.env?'A separar':'Não enviado'}</em></div>`; }).join('')}${gs.length>6?`<div class="pb-ri neu"><i></i><div><span>+ ${gs.length-6} rancho${gs.length-6>1?'s':''} na fila</span></div><em></em></div>`:''}</div>`:'<div class="pb-vz ok">Nada para separar agora.</div>'}`}; },
  ranchos(p){ const r=pnlRanchos(p.linha||''); const fe=r.filter(x=>x.feito).length, at=r.filter(x=>!x.feito&&x.x.c==='crit').length, pr=r.filter(x=>!x.feito&&x.x.c==='warn').length, pe=r.length-fe;
    const ord={crit:0,warn:1,neu:2,ok:3}; const ls=r.filter(x=>!x.feito).sort((a,b)=>ord[a.x.c]-ord[b.x.c]).slice(0,5);
    return {tit:'Diário de bordo'+(p.linha?' · '+esc(p.linha):''),st:at?{c:'crit',t:at+' atrasado'+(at>1?'s':'')}:pe?{c:'neu',t:pe+' a entregar'}:r.length?{c:'ok',t:'Tudo entregue'}:{c:'neu',t:'Sem ranchos'},
      html:`<div class="pb-k3"><div><span>A entregar</span><b class="num">${pe}</b></div><div><span>Atrasados</span><b class="num ${at?'neg':''}">${at}</b></div><div><span>Entregues</span><b class="num pos">${fe}</b></div></div>
       ${ls.length?`<div class="pb-rl">${ls.map(x=>`<div class="pb-ri ${x.x.c}"><i></i><div><b>OP ${esc(x.o.num)}</b> <span>${esc(x.o.linha)} · ${esc(codigoDe(x.o))}</span></div><em>${esc(x.x.t.charAt(0)+x.x.t.slice(1).toLowerCase())}</em></div>`).join('')}</div>`:''}`}; },
  paradas(){ const h0=ini0(new Date()).getTime(), at=S.paradas.filter(p=>!p.fim); const min={};
    S.paradas.forEach(p=>{ const i=new Date(p.inicio).getTime(), f=p.fim?new Date(p.fim).getTime():Date.now(); if(f<h0) return; min[p.linha]=(min[p.linha]||0)+(f-Math.max(i,h0)); });
    const tot=Object.values(min).reduce((a,v)=>a+v,0);
    return {st:at.length?{c:'crit',t:at.length+' parada'+(at.length>1?'s':'')+' agora'}:{c:'ok',t:'Nenhuma agora'},
      html:`${at.map(p=>`<div class="pb-pa"><b>${esc(p.linha)}</b><span>${esc(p.motivo||'sem motivo')} · há ${dur(Date.now()-new Date(p.inicio))}</span></div>`).join('')}
       <div class="pb-cap" style="margin-top:${at.length?12:0}px">Tempo parado hoje</div>${tot?Object.entries(min).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([l,ms])=>`<div class="pb-row"><span>${esc(l)}</span><b class="num">${dur(ms)}</b></div>`).join(''):'<div class="pb-row"><span>Nenhuma parada hoje</span><b></b></div>'}`}; },
  silos(){ const ult=saldoPorSilo(); const g=['Cimento','Areia'].map(n=>{ const ss=S.cfg.silos.filter(s=>s.grupo===n); const t=ss.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0), cap=ss.reduce((a,s)=>a+s.cap,0); return {n,t,cap,p:cap?t/cap:0}; });
    let pc=null; try{ pc=previsaoCimento(); }catch(e){}
    return {st:pc?(pc.falta?{c:'crit',t:'Vai faltar cimento'}:{c:'ok',t:'Cimento cobre'}):{c:'neu',t:'Sem medição'},
      html:`${g.map(x=>{ const nv=nivel(x.p); return `<div class="pb-si"><div class="pb-row"><span>${x.n}</span><b class="num">${f1(x.t)} t <small>de ${x.cap} t</small></b></div><div class="pb-bar"><i style="width:${Math.min(100,x.p*100)}%;background:${nv.fill}"></i></div></div>`; }).join('')}
       ${pc&&pc.falta?`<div class="pb-ft neg">Falta na OP ${esc(pc.falta.o.num)} · ${esc(pc.falta.o.linha)} · ${dm(pc.falta.dia)}</div>`:pc&&pc.aCaminho?`<div class="pb-ft">${f1(pc.aCaminho)} t a caminho</div>`:''}`}; },
  atrasadas(){ let xs=[]; try{ xs=repAtrasadas(); }catch(e){}
    return {st:xs.length?{c:'warn',t:xs.length+' atrasada'+(xs.length>1?'s':'')}:{c:'ok',t:'Nenhuma'},
      html:xs.length?`<div class="pb-rl">${xs.slice(0,6).map(o=>`<div class="pb-ri warn"><i></i><div><b>OP ${esc(o.num)}</b> <span>${esc(o.linha)} · ${esc(codigoDe(o))}</span></div><em class="num">${f0(Math.max(0,o.total-entregueDe(o)))} · ${dm(dataEf(o))}</em></div>`).join('')}</div>${xs.length>6?`<div class="pb-ft">e mais ${xs.length-6}</div>`:''}`:'<div class="pb-vz ok">Nenhuma ordem atrasada.</div>'}; },
  cargas(){ const h=hojeStr(); const ab=S.cargas.filter(c=>etapaCarga(c)<2), hj=S.cargas.filter(c=>{ const d=(c.etapas||{}).descarregado; return d&&hojeStr(new Date(d))===h; });
    return {st:ab.length?{c:'neu',t:ab.length+' a caminho / na fábrica'}:{c:'ok',t:'Nenhuma pendente'},
      html:`${ab.slice(0,4).map(c=>`<div class="pb-row"><span>NF ${esc(c.nota||'—')} · ${etapaCarga(c)===1?'na fábrica':'a caminho'}</span><b class="num">${c.qtd!=null?f1(+c.qtd)+' t':''}</b></div>`).join('')}
       <div class="pb-ft">${hj.length?hj.length+' descarregada'+(hj.length>1?'s':'')+' hoje · '+f1(hj.reduce((a,c)=>a+(+c.qtd||0),0))+' t':'Nenhuma descarregada hoje'}</div>`}; },
  premix(){ let fs=[]; try{ fs=pmxFichasVis(); }catch(e){} const h=hojeStr(); const hj=fs.filter(f=>f.data===h), pend=fs.filter(f=>{ try{ return pmxPendSis(f); }catch(e){ return false; } });
    return {st:pend.length?{c:'warn',t:pend.length+' sem OP no sistema'}:{c:'ok',t:'Em dia'},
      html:`<div class="pb-k3 two"><div><span>Fichas de hoje</span><b class="num">${hj.length}</b></div><div><span>Sem OP no sistema</span><b class="num ${pend.length?'neg':''}">${pend.length}</b></div></div>`}; },
  atalhos(p){ const vs=(p.views&&p.views.length?p.views:['programacao','calendario','paradas','diario']).filter(v=>VIEWS[v]&&viewOk(v));
    return {html:vs.length?`<div class="pb-at">${vs.map(v=>`<button class="pb-atb" data-go="${v}">${ic(VIEWS[v].ic,22,1.9)}<span>${esc(VIEWS[v].nome)}</span></button>`).join('')}</div>`:'<div class="pb-vz">Nenhuma tela liberada para atalho.</div>'}; },
  recado(p){ const venc=p.ate&&hojeStr()>p.ate; return {oculto:!!venc,st:venc?{c:'neu',t:'Vencido em '+dm(p.ate)}:p.urg?{c:'crit',t:'Urgente'}:p.ate?{c:'neu',t:'Até '+dm(p.ate)}:null,html:`<div class="pb-rec ${p.urg?'urg':''}">${esc(p.texto||'Escreva o recado no editor.').replace(/\n/g,'<br>')}</div>`}; } };
/* ---------- blocos do almoxarifado ---------- */
function almRanchos(dia){ /* ranchos abertos para o dia (e atrasados, se hoje), agrupados */ const h=hojeStr(), g={};
  S.ordens.filter(o=>o.status==='aberta'&&o.rancho&&o.linha).forEach(o=>{ const d=dataEf(o); if(dia===h?!(d<=h):d!==dia) return; const e=dbEt(o); if(e.ent&&dia===h) return; const k=String(o.rancho); (g[k]=g[k]||{num:k,rs:[]}).rs.push({o,e}); });
  return Object.values(g).map(z=>{ z.o=z.rs.slice().sort((a,b)=>priOrd(a.o)-priOrd(b.o))[0].o; z.sep=z.rs.some(x=>x.e.sep); z.env=z.rs.some(x=>x.e.env); z.rc=ranchoDe(z.num); const ms=z.rs.map(x=>dbPrecisa(x.o)).filter(m=>m!=null); z.m=ms.length?Math.min(...ms):null; return z; })
    .sort((a,b)=>priOrd(a.o)-priOrd(b.o)||(a.m==null)-(b.m==null)||(a.m-b.m)||a.num.localeCompare(b.num)); }
function almPrazo(z){ if(z.m==null) return {t:'sem previsão de início',c:'neu'}; if(z.m<=0) return {t:'a linha precisa agora',c:'crit'}; return {t:'a linha precisa em '+ritH(z.m),c:z.m<=60?'warn':'ok'}; }
Object.assign(PNL_BLOCOS,{
  comp:{nome:'Complementos pendentes',d:'O que a produção recebeu a menos e está esperando o almox mandar.',ic:'zap',s:'p',go:'diario'},
  proximo:{nome:'Próximo a separar',d:'O rancho que a linha vai precisar primeiro, com prazo e botões Separado / Entregue.',ic:'folha',s:'g',go:'diario'},
  amanha:{nome:'Ranchos de amanhã',d:'O que já foi enviado para o próximo dia útil, para adiantar a separação.',ic:'calendario',s:'m',go:'diario'},
  faltamat:{nome:'Falta de material',d:'Cruza os materiais dos ranchos do dia com o saldo do almox e avisa o que não vai dar.',ic:'zap',s:'m',go:'diario'},
  pmxmp:{nome:'Premix do dia',d:'Fichas de premix abertas e a soma da matéria-prima a separar.',ic:'premix',s:'m',go:'pmxfichas'},
  contagem:{nome:'Contagem do dia',d:'Os itens do inventário que estão há mais tempo sem contar.',ic:'lista',s:'m',go:'alxcont'}});
Object.assign(PNL_R,{
  comp(){ const cp=S.ordens.filter(o=>o.status==='aberta'||o.status==='encerrada').map(o=>({o,e:dbEt(o)})).filter(x=>x.e.conf&&x.e.conf.falta&&!x.e.comp);
    return {st:cp.length?{c:'crit',t:cp.length+' pendente'+(cp.length>1?'s':'')}:{c:'ok',t:'Nenhum'},html:cp.length?`<div class="pb-rl">${cp.slice(0,5).map(x=>`<div class="pb-ri crit"><i></i><div><b>Rancho ${esc(x.o.rancho||'')}</b> <span>${esc(x.o.linha)} · faltou ${(x.e.conf.itens||[]).map(i=>esc(i.i)+(i.q?' ('+esc(i.q)+')':'')).join(', ')||'—'}</span></div><em>há ${ritH((Date.now()-new Date(x.e.conf.em).getTime())/6e4)}</em></div>${viewOk('diario')?`<button class="btn sm" data-act="db-comp" data-id="${esc(x.o._id)}" style="height:32px;margin:2px 0 6px 18px">${ic('check',14,2.2)} Complemento enviado</button>`:''}`).join('')}</div>`:'<div class="pb-vz ok">Nada faltando nas linhas.</div>'}; },
  proximo(){ const zs=almRanchos(hojeStr()), z=zs[0]; if(!z) return {st:{c:'ok',t:'Fila vazia'},html:'<div class="pb-vz ok">Nada para separar agora.</div>'};
    const pz=almPrazo(z), pr=dbPri(z.o)===1, lins=[...new Set(z.rs.map(x=>x.o.linha))].join(' · '), its=((z.rc&&z.rc.itens)||[]).filter(dbVisivel), pode=viewOk('diario');
    return {tit:'Próximo a separar',st:pr?{c:'crit',t:'Urgente'}:{c:pz.c==='crit'?'crit':pz.c==='warn'?'warn':'neu',t:pz.t},
      html:`<div class="alm-px"><div><div class="alm-pn">Rancho <b class="num">${esc(z.num)}</b>${pr?' <span class="pill crit">URGENTE</span>':''}</div><div class="sub" style="margin:2px 0 0">${esc(lins)} · ${z.rs.length} OP${z.rs.length>1?'s':''} · <b class="${pz.c==='crit'?'t-crit':''}">${pz.t}</b>${z.env?'':' · <b>ainda não enviado pelo PCP</b>'}</div>
        <div class="alm-po">${z.rs.map(x=>`<span><b class="num">${esc(x.o.num)}</b> ${esc(codigoDe(x.o))} ${esc(nomeCurto(x.o))} · ${f0(x.o.total)} ${esc(uA(x.o))}</span>`).join('')}</div>
        ${its.length?`<details class="dbfmat"><summary>Materiais do rancho (${its.length})</summary><table class="dbfot"><tbody>${its.map(i=>`<tr><td class="num"><b>${esc(i.c)}</b></td><td>${esc(i.d)}</td><td class="num r">${fQ(i.q)} <small>${esc(i.um)}</small></td></tr>`).join('')}</tbody></table></details>`:''}</div>
       ${pode?`<div class="alm-pb">${z.sep?'<span class="pill ok">✓ Separado</span>':`<button class="btn" data-act="db-mark" data-k="sep" data-id="${esc(z.o._id)}">${ic('check',18,2.2)}Separado</button>`}<button class="btn ${z.sep?'':'sec'}" data-act="alm-ent" data-id="${esc(z.o._id)}">Entregue na linha</button></div>`:''}</div>
       ${zs.length>1?`<div class="sub" style="font-size:12px;margin:10px 0 0">Depois: ${zs.slice(1,4).map(y=>'rancho '+esc(y.num)+' ('+esc([...new Set(y.rs.map(x=>x.o.linha))].join('/'))+')').join(' · ')}${zs.length>4?' · +'+(zs.length-4):''}</div>`:''}`}; },
  amanha(){ const d=amanhaStr(), zs=almRanchos(d); const env=zs.filter(z=>z.env).length;
    return {tit:'Ranchos de '+amanhaLab().toLowerCase(),st:zs.length?{c:env<zs.length?'warn':'ok',t:env+' de '+zs.length+' enviados'}:{c:'neu',t:'Nada ainda'},
      html:zs.length?`<div class="pb-rl">${zs.slice(0,6).map(z=>`<div class="pb-ri ${z.sep?'ok':z.env?'warn':'neu'}"><i></i><div><b>Rancho ${esc(z.num)}</b> <span>${esc([...new Set(z.rs.map(x=>x.o.linha))].join(' · '))} · ${z.rs.length} OP${z.rs.length>1?'s':''}</span></div><em>${z.sep?'Separado':z.env?'Pode adiantar':'Não enviado'}</em></div>`).join('')}</div>`:'<div class="pb-vz">Nenhum rancho para '+esc(amanhaLab().toLowerCase())+' ainda.</div>'}; },
  faltamat(){ const zs=almRanchos(hojeStr()).filter(z=>!z.sep), nec={};
    zs.forEach(z=>((z.rc&&z.rc.itens)||[]).filter(dbVisivel).forEach(i=>{ const k=String(i.c||'').trim(); if(!k) return; const n=nec[k]=nec[k]||{c:k,d:i.d,um:i.um,q:0,rs:new Set()}; n.q+=+i.q||0; n.rs.add(z.num); }));
    const xs=Object.values(nec).map(n=>{ const f=alxFocco(n.c); n.sal=f?f.a3+f.a30:null; n.a3=f?f.a3:null; return n; }).filter(n=>n.sal!=null&&n.q>n.sal).sort((a,b)=>(b.q-b.sal)-(a.q-a.sal));
    const sem=Object.values(nec).filter(n=>n.sal==null).length;
    return {st:xs.length?{c:'crit',t:xs.length+' ite'+(xs.length>1?'ns':'m')+' sem saldo'}:{c:'ok',t:Object.keys(nec).length?'Saldo suficiente':'Sem ranchos'},
      html:xs.length?`<div class="pb-rl">${xs.slice(0,6).map(n=>`<div class="pb-ri crit"><i></i><div><b>${esc(n.c)}</b> <span>${esc(n.d||'')} · ranchos ${[...n.rs].map(esc).join(', ')}</span></div><em>precisa ${fQ(n.q)} ${esc(n.um||'')} · tem ${fQ(n.sal)}</em></div>`).join('')}</div><div class="sub" style="font-size:11.5px;margin:6px 0 0">Saldo do Focco (almox 3 + 30). Confira a unidade.</div>`
        :`<div class="pb-vz ok">${Object.keys(nec).length?'Os materiais dos ranchos de hoje cabem no saldo do almox.':'Nenhum rancho a separar agora.'}${sem?` <small>(${sem} material${sem>1?'is':''} sem saldo importado)</small>`:''}</div>`}; },
  pmxmp(){ const h=hojeStr(), fs=S.pmx.fichas.filter(f=>f.status!=='excluida'&&!pmxEnc(f)&&(!f.data||f.data<=h)); const tot={};
    fs.forEach(f=>{ const g=Object.assign({},f,{itens:pmxEmG(f.itens)}); pmxTotais(g).forEach(t=>{ const k=t.codigo+'|'+t.un; const x=tot[k]=tot[k]||{c:t.codigo,n:t.nome,un:t.un,q:0}; x.q+=t.total*(1-Math.min(1,pmxProd(f)/(pmxNum(f.qtd)||1))); }); });
    const xs=Object.values(tot).filter(x=>x.q>0).sort((a,b)=>b.q-a.q);
    return {st:fs.length?{c:'warn',t:fs.length+' ficha'+(fs.length>1?'s':'')+' aberta'+(fs.length>1?'s':'')}:{c:'ok',t:'Nenhuma ficha aberta'},
      html:fs.length?`<div class="sub" style="font-size:12px;margin:0 0 6px">${fs.slice(0,4).map(f=>'<b>'+esc(pmxOp(f))+'</b> '+esc(f.material)+' ('+pmxF(pmxNum(f.qtd)-pmxProd(f))+' a fazer)').join(' · ')}${fs.length>4?' · …':''}</div>
        <div class="label" style="margin:4px 0 2px">MATÉRIA-PRIMA A SEPARAR (O QUE FALTA PRODUZIR)</div><div class="pb-rl">${xs.slice(0,8).map(x=>`<div class="pb-ri neu"><i></i><div><b>${esc(x.c)}</b> <span>${esc(x.n)}</span></div><em>${pmxF(x.q)} ${esc(x.un)}</em></div>`).join('')}</div>`:'<div class="pb-vz ok">Nenhuma ficha de premix aberta.</div>'}; },
  contagem(){ const p=acsP()||{}; const its=(typeof alxItensPerm==='function'?alxItensPerm('todos'):[]).map(it=>({it,u:alxUltCont(it.codigo)})).sort((a,b)=>String(a.u||'').localeCompare(String(b.u||''))).slice(0,6);
    const nunca=its.filter(x=>!x.u).length;
    return {st:its.length?{c:nunca?'warn':'neu',t:nunca?nunca+' nunca contado'+(nunca>1?'s':''):'Rodízio em dia'}:{c:'neu',t:'Sem itens'},
      html:its.length?`<div class="pb-rl">${its.map(x=>`<div class="pb-ri ${x.u?'neu':'warn'}"><i></i><div><b>${esc(x.it.codigo)}</b> <span>${esc(x.it.descricao||'')}</span></div><em>${x.u?'última '+alxD(x.u):'nunca contado'}</em></div>`).join('')}</div>`:'<div class="pb-vz">Nenhum item do inventário liberado para você.</div>'}; }});
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="alm-ent"]'); if(!b) return; const o=ordById(b.dataset.id); if(!o) return; if(S.dbo){ S.dbo.modo='fila'; S.dbo.aberto=o._id; S.dbo.f=dbNovoF(o,'ent'); } go('diario'); });
function pnlRanchos(linha){ const h=hojeStr();
  return S.ordens.filter(o=>o.linha&&(o.status==='aberta'||o.status==='encerrada')&&(!linha||o.linha===linha)).filter(o=>{ const d=dataEf(o); const k=o.status==='aberta'&&d<h?h:(o.status==='encerrada'&&o.fimEm?hojeStr(new Date(o.fimEm)):d); return k===h; })
    .map(o=>{ const e=dbEt(o), x=dbMonStatus({o,e}); return {o,e,x,feito:!!(e.ent||(e.fim&&e.fim.st==='encerrado'))}; }); }
function pnlBloco(b,i,edit){ const B=PNL_BLOCOS[b.t]; if(!B) return ''; let r; try{ r=PNL_R[b.t](b.p||{})||{}; }catch(e){ console.warn('bloco',b.t,e); r={html:'<div class="pb-vz">Não consegui montar este bloco agora.</div>'}; }
  const go=B.go&&viewOk(B.go)?B.go:'';
  return `<section class="pb s-${b.s||B.s} ${r.st?'st-'+r.st.c:''}" data-pbt="${esc(b.t)}" ${edit?`data-pbi="${i}"`:''}><header class="pb-h"><span class="pb-ic">${ic(B.ic,18,2)}</span><b class="pb-t">${r.tit||esc(B.nome)}</b>${r.st?`<span class="pb-st ${r.st.c}"><i></i>${esc(r.st.t)}</span>`:''}${go&&!edit?`<button class="pb-go" data-go="${go}" aria-label="Abrir ${esc(VIEWS[go]?VIEWS[go].nome:'')}">Abrir ${ic('seta',14,2.2)}</button>`:''}</header><div class="pb-b">${r.html||''}</div></section>`; }
document.addEventListener('click',ev=>{ const g=ev.target.closest&&ev.target.closest('[data-pbt="fila"] [data-go="diario"]'); if(g&&S.dbo){ S.dbo.modo='fila'; S.dbo.aberto=null; } },true);
function pnlSaud(){ const h=new Date().getHours(); return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'; }
/* painel do cargo no mesmo layout do Meu dia: blocos pequenos/médios viram os cartões numerados da rotina; os grandes viram os quadros de baixo */
function pnlMeuDia(bl,o){ o=o||{}; const agora=new Date(), icSt={ok:ic('check',16,2.4),pend:'<i class="dot"></i>',alerta:'!',futuro:ic('relogio',15,2)}, stMap={ok:'ok',warn:'pend',crit:'alerta',neu:'futuro'};
  const R=bl.map(b=>{ const B=PNL_BLOCOS[b.t]; if(!B) return null; let r; try{ r=PNL_R[b.t](b.p||{})||{}; }catch(e){ r={html:'<div class="pb-vz">Não consegui montar este bloco agora.</div>'}; } if(r.oculto) return null; const go=B.go&&viewOk(B.go)?B.go:''; return {b,B,r,go,g:(b.s||B.s)==='g'}; }).filter(Boolean);
  let ini=0; while(ini<R.length&&R[ini].g) ini++; const topo=R.slice(0,ini), R2=R.slice(ini); /* blocos grandes que vêm antes de todos os pequenos ficam acima da rotina */
  const peq=R2.filter(x=>!x.g), gr=R2.filter(x=>x.g);
  const rot=peq.map((x,i)=>{ const st=x.r.st?stMap[x.r.st.c]||'futuro':'futuro';
    return `<div class="rot pmd st-${st}" ${x.go?`data-go="${x.go}" role="link" tabindex="0" title="Abrir ${esc(VIEWS[x.go]?VIEWS[x.go].nome:x.B.nome)}"`:''}><div class="rot-h"><span class="rot-n num">${i+1} · ${esc(x.B.nome).toUpperCase()}</span><span class="rot-ic">${icSt[st]}</span></div>
      <b>${x.r.tit||esc(x.B.nome)}</b>${x.r.st?`<div class="rot-d">${esc(x.r.st.t)}</div>`:''}<div class="pmd-b">${x.r.html||''}</div>${x.go?`<div class="rot-a"><button class="lnk" data-go="${x.go}">Abrir</button></div>`:''}</div>`; }).join('');
  const quadro=x=>`<section class="card pmd-q"><div class="head" style="align-items:center"><div class="label">${(x.r.tit||esc(x.B.nome)).toUpperCase()}</div><div style="display:flex;gap:10px;align-items:center">${x.r.st?`<span class="pill ${x.r.st.c==='crit'?'crit':x.r.st.c==='warn'?'warn':x.r.st.c==='ok'?'ok':'neu'}">${esc(x.r.st.t)}</span>`:''}${x.go?`<button class="lnk" data-go="${x.go}">Abrir</button>`:''}</div></div>${x.r.html||''}</section>`;
  const esq=gr.filter((x,i)=>i%2===0), dir=gr.filter((x,i)=>i%2===1);
  const n=peq.length;
  if(o.corpo) return `${topo.map(x=>`<div style="margin-bottom:12px">${quadro(x)}</div>`).join('')}${n?`<div class="rotina pmd-r" style="grid-template-columns:repeat(${Math.min(n,4)},minmax(0,1fr))">${rot}</div>`:''}${gr.length?`<div class="md-grid" ${gr.length===1?'style="grid-template-columns:minmax(0,1fr)"':''}>${gr.length===1?quadro(gr[0]):`<div style="display:flex;flex-direction:column;gap:20px;min-width:0">${esq.map(quadro).join('')}</div><div style="display:flex;flex-direction:column;gap:20px;min-width:0">${dir.map(quadro).join('')}</div>`}</div>`:''}`;
  return `${banner()}${o.topo||''}
  <div class="head"><div><div class="eyebrow">${o.eyebrow?esc(o.eyebrow.toUpperCase())+' · ':'MEU PAINEL · '}${esc(agora.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).toUpperCase())}</div><h1>${saudacao()}${o.nome?', '+esc(o.nome):''}</h1><div class="sub">A sua rotina na ordem do dia. O que está pendente fica em amarelo; o que precisa de atenção, em vermelho.</div></div></div>
  ${topo.map(x=>`<div style="margin-bottom:16px">${quadro(x)}</div>`).join('')}
  ${n?`<div class="rotina pmd-r" style="grid-template-columns:repeat(${Math.min(n,4)},minmax(0,1fr))">${rot}</div>`:''}
  ${gr.length?`<div class="md-grid" ${gr.length===1?'style="grid-template-columns:minmax(0,1fr)"':''}>${gr.length===1?quadro(gr[0]):`<div style="display:flex;flex-direction:column;gap:20px;min-width:0">${esq.map(quadro).join('')}</div><div style="display:flex;flex-direction:column;gap:20px;min-width:0">${dir.map(quadro).join('')}</div>`}</div>`:''}
  ${!R.length?'<section class="card"><div class="empty">Nenhum bloco no painel ainda. Monte em Ajustes → Painéis por cargo.</div></section>':''}`; }
function vPainel(){ const N=S.pnl, bl=pnlBlocos(), P=N.prev; const nome=P?P.nome:(String(S.nomes[S.uid]||'').split(' ')[0]);
  const cg=P?P.cargo:(!S.acs.dono&&acsP()&&acsP().cargo?acsP().cargo.nome:'');
  if(!S.acs.dono){ const prevBar=P?`<div class="pnl-prev"><span>${ic('lupa',16,2)} Prévia: ${P.nome?`é assim que <b>${esc(P.nome)}</b> vê o painel.`:`é assim que quem tem o cargo <b>${esc(P.cargo||'')}</b> vê o painel.`}</span><button class="btn sec" data-act="pnl-prev-x" style="height:38px">Voltar ao editor</button></div>`:'';
    const cgN=cg||(()=>{ const d=S.acs.doc||{}; return pnlPerfilNome(d.perfil); })();
    if(bl.length) return pnlMeuDia(bl,{eyebrow:cgN,nome:P?(P.nome||''):String(S.nomes[S.uid]||'').split(' ')[0],topo:prevBar});
    return vMeuDia({cargo:true,cargoNome:cgN,nome:P?(P.nome||''):null,topo:prevBar}).replace(/^\s*/,''); }
  if(bl.length){ const prevBar=P?`<div class="pnl-prev"><span>${ic('lupa',16,2)} Prévia: ${P.nome?`é assim que <b>${esc(P.nome)}</b> vê o painel.`:`é assim que quem tem o cargo <b>${esc(P.cargo||'')}</b> vê o painel.`}</span><button class="btn sec" data-act="pnl-prev-x" style="height:38px">Voltar ao editor</button></div>`:''; return pnlMeuDia(bl,{eyebrow:cg||'Meu painel',nome,topo:prevBar}); }
  const data=(t=>t.charAt(0).toUpperCase()+t.slice(1))(new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}));
  return `${P?`<div class="pnl-prev"><span>${ic('lupa',16,2)} Prévia: ${P.nome?`é assim que <b>${esc(P.nome)}</b> vê o painel.`:`é assim que quem tem o cargo <b>${esc(P.cargo||'')}</b> vê o painel.`}</span><button class="btn sec" data-act="pnl-prev-x" style="height:38px">Voltar ao editor</button></div>`:''}
   <div class="head"><div><div class="eyebrow">${cg?esc(cg.toUpperCase()):'MEU PAINEL'}</div><h1>${pnlSaud()}${nome?', '+esc(nome):''}</h1><div class="sub">${esc(data)} · atualiza sozinho</div></div></div>
   ${bl.length?`<div class="pnl-g">${bl.map((b,i)=>pnlBloco(b,i,false)).join('')}</div>`:'<section class="card"><div class="empty">Nenhum bloco no painel ainda.</div></section>'}`; }

// ---------- editor (só a master) ----------
function pnlAbrirCargo(k){ const c=pnlCargos()[k]; if(!c) return; S.pnl.ed={tipo:'cargo',id:k,f:Object.assign({mods:[],ocultas:[],locais:[],blocos:[]},pnlClone(c)),aba:'painel',sujo:false}; S.pnl.add=false; }
function pnlAbrirPessoa(id){ const d=(S.acs.lista||[]).find(x=>x._id===id); if(!d) return; const cg=pnlCargo(d.perfil);
  S.pnl.ed={tipo:'pessoa',id,f:{nome:acsNome(id),perfil:d.perfil,proprio:!cg||!!(d.blocos&&d.blocos.length),blocos:pnlClone((d.blocos&&d.blocos.length)?d.blocos:(cg?cg.blocos:[]))||[]},aba:'painel',sujo:false}; S.pnl.add=false; }
function pnlAbrirDono(){ S.pnl.ed={tipo:'dono',id:'dono',f:{blocos:pnlClone(((S.pnl.dados||{}).dono||{}).blocos)||[]},aba:'painel',sujo:false}; S.pnl.add=false; }
function pnlParEd(b,i){ const B=PNL_BLOCOS[b.t]; const p=b.p||{}, LT=linhasOrd();
  if(B.par==='linha') return `<label class="pe-f"><span>Linha</span><select class="txt" data-pe="${i}" data-k="linha">${LT.map(l=>`<option ${p.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  if(B.par==='linhaOpc') return `<label class="pe-f"><span>Linha</span><select class="txt" data-pe="${i}" data-k="linha"><option value="">Todas</option>${LT.map(l=>`<option ${p.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  if(B.par==='ritmo') return `<label class="pe-f"><span>Mostrar</span><select class="txt" data-pe="${i}" data-k="ritmo"><option value="total">Total das linhas</option>${ritCfg().linhas.map(l=>`<option ${p.ritmo===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  if(B.par==='texto') return `<label class="pe-f wide"><span>Recado</span><textarea class="txt" data-pe="${i}" data-k="texto" rows="2" placeholder="Ex.: Inventário geral na sexta às 14h.">${esc(p.texto||'')}</textarea></label><label class="pe-f"><span>Mostrar até</span><input type="date" class="txt" data-pe="${i}" data-k="ate" value="${esc(p.ate||'')}"></label><label class="pe-f" style="flex-direction:row;align-items:center;gap:6px;align-self:flex-end"><input type="checkbox" data-pe="${i}" data-k="urg" ${p.urg?'checked':''}><span style="margin:0">Urgente (vermelho)</span></label>`;
  if(B.par==='views'){ const cand=Object.keys(VIEWS).filter(v=>!['painel','paineis','modulos','acessos','medicao'].includes(v)&&modDe(v)&&modDe(v)!=='meupainel'); const sel=p.views&&p.views.length?p.views:['programacao','calendario','paradas','diario'];
    return `<div class="pe-f wide"><span>Telas</span><div class="pe-vs">${cand.map(v=>`<label class="pe-v"><input type="checkbox" data-pe="${i}" data-k="views" value="${v}" ${sel.includes(v)?'checked':''}>${esc(VIEWS[v].nome)}</label>`).join('')}</div></div>`; }
  return ''; }
function pnlPodeVer(E,v){ const perm=E.tipo==='cargo'?pvPermCargo(E.f):E.tipo==='pessoa'?pvPermPessoa(E.id,null):null; if(!perm) return true; const old=S.pnl.prev; S.pnl.prev={p:perm}; let r=true; try{ r=viewOk(v); }catch(e){} S.pnl.prev=old; return r; }
const PNL_SUG={almox:['proximo','comp','fila','faltamat','amanha','pmxmp','contagem','cargas'],premix:['pmxmp','premix'],producao:['alertas','linhas','paradas','atrasadas','ranchos','ritmo'],silos:['silos','cargas'],analise:['ritmo','alertas'],paradas:['paradas'],tv:['linhas'],cal:['atrasadas']};
function pnlSugeridos(E){ const f=E.f||{}; const mods=E.tipo==='cargo'?(f.mods||[]):E.tipo==='pessoa'?(((pnlCargo(f.perfil)||{}).mods)||(((S.acs.lista||[]).find(x=>x._id===E.id)||{}).mods)||[]):[]; const ja=new Set((f.blocos||[]).map(b=>b.t)); const out=[]; mods.forEach(m=>(PNL_SUG[m]||[]).forEach(k=>{ if(PNL_BLOCOS[k]&&!ja.has(k)&&!out.includes(k)) out.push(k); })); return out; }
function pnlVisto(id){ const p=(S.acs.pedidos||[]).find(x=>x._id===id); const v=p&&p.visto; if(!v) return 'ainda não entrou'; const d=Math.floor((Date.now()-new Date(v).getTime())/864e5); return 'último acesso '+(d<=0?'hoje '+hora(v):d===1?'ontem':dm(hojeStr(new Date(v)))); }
function pnlEditor(){ const N=S.pnl, E=N.ed; if(!E) return `<section class="card pnl-ed pnl-vz"><div class="empty">${ic('grid',28,1.6)}<p>Escolha um cargo à esquerda para montar o acesso e a tela inicial,<br>ou crie um novo a partir de um modelo.</p></div></section>`;
  const f=E.f, tit=E.tipo==='cargo'?(f.nome||'Cargo sem nome'):E.tipo==='pessoa'?f.nome:'Meu painel (você)';
  const cg=E.tipo==='pessoa'?pnlCargo(f.perfil):null;
  const abas=E.tipo==='cargo'?`<div class="seg pe-abas">${[['painel','Tela inicial'],['acesso','Acesso']].map(([k,l])=>`<button data-act="pnl-aba" data-v="${k}" aria-pressed="${E.aba===k}">${l}</button>`).join('')}</div>`:'';
  const topo=`<div class="pe-top"><div style="min-width:0;flex:1 1 320px">${E.tipo==='cargo'?`<input class="txt pe-nome" id="pe-nome" value="${esc(f.nome||'')}" placeholder="Nome do cargo" aria-label="Nome do cargo"><input class="txt pe-desc" id="pe-desc" value="${esc(f.desc||'')}" placeholder="Para que serve (opcional)" aria-label="Descrição">`:`<div class="label">${E.tipo==='pessoa'?'PAINEL DA PESSOA':'SEU PAINEL'}</div><h2 style="margin-top:4px">${esc(tit)}</h2>${cg?`<div class="sub" style="margin:2px 0 0;font-size:13px">Cargo: ${esc(cg.nome)}</div>`:''}`}</div>
    <div class="pe-acts">${abas}${E.tipo==='cargo'&&!E.novo?`<button class="btn sec" data-act="pnl-dup" style="height:42px" title="Cria uma cópia deste cargo para ajustar">${ic('copiar',16,2)}Duplicar</button>`:''}<button class="btn sec" data-act="pnl-prev" style="height:42px">${ic('lupa',16,2)}Ver como ${E.tipo==='dono'?'fica':'a pessoa vê'}</button><button class="btn" data-act="pnl-salvar" style="height:42px" ${N.salvando?'disabled':''}>${N.salvando?'Salvando…':E.sujo?'Salvar':'Salvo ✓'}</button></div></div>`;
  if(E.tipo==='cargo'&&E.aba==='acesso') return `<section class="card pnl-ed">${topo}${pnlAcessoEd(f)}${pnlRodape(E)}</section>`;
  const segue=E.tipo==='pessoa'&&!cg?`<div class="pe-aviso">Esta pessoa ainda está no perfil antigo <b>${esc(pnlPerfilNome(f.perfil))}</b>. Você pode montar um painel só dela aqui, ou em <button class="lnk" data-go="acessos">Acessos</button> trocar para um cargo novo.</div>`:E.tipo==='pessoa'?`<div class="pe-segue"><label class="opt ${!f.proprio?'on':''}"><input type="radio" name="pe-seg" value="cargo" ${!f.proprio?'checked':''}> <span><b>Igual ao do cargo</b><small>Muda junto quando você mexer no cargo.</small></span></label><label class="opt ${f.proprio?'on':''}"><input type="radio" name="pe-seg" value="proprio" ${f.proprio?'checked':''}> <span><b>Painel só dela</b><small>Parte do painel do cargo e você ajusta para esta pessoa.</small></span></label></div>`:'';
  const trava=E.tipo==='pessoa'&&!f.proprio;
  const lista=f.blocos.length?f.blocos.map((b,i)=>{ const B=PNL_BLOCOS[b.t]; if(!B) return ''; return `<div class="pe-b" draggable="${!trava}" data-pei="${i}"><span class="pe-grip" aria-hidden="true">⋮⋮</span><span class="pb-ic">${ic(B.ic,16,2)}</span>
     <div class="pe-bm"><b>${esc(B.nome)}</b>${E.tipo!=='dono'&&B.go&&!pnlPodeVer(E,B.go)?`<div class="pe-warn">⚠ Este cargo não tem acesso à tela "${esc(VIEWS[B.go]?VIEWS[B.go].nome:B.go)}": o bloco aparece, mas sem o botão Abrir. Libere o módulo na aba Acesso.</div>`:''}<div class="pe-bp">${trava?'':`<div class="pe-f"><span>Tamanho</span><div class="seg pe-tam">${Object.entries(PNL_TAM).map(([k,l])=>`<button data-act="pnl-tam" data-i="${i}" data-v="${k}" aria-pressed="${(b.s||B.s)===k}" title="${k==='g'?'Fica nos quadros de baixo (ou no topo, se vier antes dos pequenos)':'Vira um cartão da rotina'}">${l}</button>`).join('')}</div></div>${pnlParEd(b,i)}`}</div></div>
     ${trava?'':`<div class="pe-bb"><button class="pe-ib" data-act="pnl-sobe" data-i="${i}" aria-label="Subir" ${i?'':'disabled'}>↑</button><button class="pe-ib" data-act="pnl-desce" data-i="${i}" aria-label="Descer" ${i<f.blocos.length-1?'':'disabled'}>↓</button><button class="pe-ib del" data-act="pnl-tira" data-i="${i}" aria-label="Tirar bloco">✕</button></div>`}</div>`; }).join(''):`<div class="pe-vz">Nenhum bloco ainda.${pnlSugeridos(E).length?` <button class="lnk" data-act="pnl-addsug">Adicionar os sugeridos para este cargo (${pnlSugeridos(E).length})</button>`:' Adicione abaixo.'}</div>`;
  const sug=pnlSugeridos(E);
  const cat=N.add&&!trava?`${sug.length?`<div class="label" style="margin:12px 0 6px">SUGERIDOS PARA ESTE CARGO</div><div class="pe-cat">${sug.map(k=>{ const B=PNL_BLOCOS[k]; return `<button class="pe-cb sug" data-act="pnl-add" data-v="${k}"><span class="pb-ic">${ic(B.ic,18,2)}</span><span><b>${esc(B.nome)}</b><small>${esc(B.d)}</small></span></button>`; }).join('')}</div><div class="label" style="margin:12px 0 6px">TODOS OS BLOCOS</div>`:''}<div class="pe-cat">${Object.entries(PNL_BLOCOS).map(([k,B])=>`<button class="pe-cb" data-act="pnl-add" data-v="${k}"><span class="pb-ic">${ic(B.ic,18,2)}</span><span><b>${esc(B.nome)}</b><small>${esc(B.d)}</small></span></button>`).join('')}</div>`:'';
  return `<section class="card pnl-ed">${topo}${segue}
   <div class="pe-cols"><div class="pe-l"><div class="label" style="margin-bottom:8px">BLOCOS DA TELA INICIAL · ${f.blocos.length}</div><div class="pe-lst">${lista}</div>
     ${trava?'':`<button class="btn sec pe-addb" data-act="pnl-addt" aria-expanded="${!!N.add}">${N.add?'Fechar lista':'+ Adicionar bloco'}</button>${cat}`}</div>
    <div class="pe-r"><div class="label" style="margin-bottom:8px">PRÉVIA AO VIVO · COMO A PESSOA VÊ (LAYOUT DO MEU DIA)</div><div class="pe-pv">${f.blocos.length?`<div class="pmd-mini"><div class="pmd-mh"><small>${esc((E.tipo==='cargo'?f.nome:cg?cg.nome:'')||'').toUpperCase()}</small><b>${saudacao()}</b></div>${pnlMeuDia(f.blocos,{corpo:true})}</div>`:'<div class="pe-vz">A prévia aparece aqui.</div>'}</div></div></div>
   ${pnlRodape(E)}</section>`; }
function pnlRodape(E){ if(E.tipo!=='cargo') return ''; const ps=pnlPessoasDe(E.id);
  const hs=((pnlCargos()[E.id]||{}).hist||[]).map((h,i)=>({h,i})).reverse();
  return `<div class="pe-foot"><div><b>${ps.length}</b> ${ps.length===1?'pessoa usa':'pessoas usam'} este cargo${ps.length?': '+ps.map(d=>`<button class="lnk" data-act="pnl-pessoa" data-id="${esc(d._id)}">${esc(acsNome(d._id))}</button> <small class="t-mut">(${pnlVisto(d._id)})</small>`).join(', '):'. Atribua em Acessos.'}
   ${hs.length?`<details class="pe-hist"><summary>Histórico de mudanças (${hs.length})</summary>${hs.map(({h,i})=>`<div class="pe-hr"><span>${h.em?dia(h.em)+' '+hora(h.em):'versão anterior'}${h.por?' · '+esc(nomeDe(h.por)):''} · ${(h.snap&&h.snap.blocos||[]).length} blocos · ${(h.snap&&h.snap.mods||[]).length} módulos</span><button class="lnk" data-act="pnl-hist" data-i="${i}">Voltar a esta versão</button></div>`).join('')}</details>`:''}</div><button class="lnk" data-act="pnl-excluir" style="color:var(--crit-ink)">Excluir cargo</button></div>`; }
function pnlAcessoEd(f){ const temAlx=(f.mods||[]).includes('almox');
  const viewsDe=m=>{ const M=MODS.find(x=>x.id===m); return M?M.views:[]; };
  return `<div class="pe-acc"><div class="label" style="margin:4px 0 8px">MÓDULOS</div>
   <div class="pe-mods">${ACS_MODS.map(([k,n])=>{ const on=(f.mods||[]).includes(k), vs=viewsDe(k).filter(v=>VIEWS[v]);
     return `<div class="pe-mod ${on?'on':''}"><label class="ck"><input type="checkbox" data-pm="${k}" ${on?'checked':''}><b>${esc(n)}</b></label>${on&&vs.length>1?`<div class="pe-vws">${vs.map(v=>`<label class="pe-v"><input type="checkbox" data-pv="${v}" ${(f.ocultas||[]).includes(v)?'':'checked'}>${esc(VIEWS[v].nome)}</label>`).join('')}</div>`:''}</div>`; }).join('')}</div>
   ${temAlx?`<div class="label" style="margin:16px 0 8px">ALMOXARIFADOS</div><div class="acs-cks">${ALX_LOCS.map(l=>`<label class="ck"><input type="checkbox" data-pl="${l}" ${(f.locais||[]).includes(l)?'checked':''}>${ALX_LOC[l]}</label>`).join('')}</div>
   <div class="label" style="margin:16px 0 8px">NO ALMOXARIFADO PODE</div><div class="acs-cks">${ACS_ACOES.map(([k,n])=>`<label class="ck"><input type="checkbox" data-pa="${k}" ${f[k]?'checked':''}>${esc(n)}</label>`).join('')}</div>`:''}
   <div class="sub" style="font-size:12.5px;margin-top:14px">Desmarque uma aba para esconder só ela dentro do módulo. Quem tem este cargo passa a ver assim assim que você salvar.</div></div>`; }
function vPaineis(){ if(!S.acs.dono) return acsCaixa('Somente a responsável','Esta tela é só da dona do painel.');
  const N=S.pnl, C=pnlCargos(), ks=Object.keys(C).sort((a,b)=>String(C[a].nome).localeCompare(String(C[b].nome))); const E=N.ed;
  const semCargo=(S.acs.lista||[]).filter(d=>d._id!=='_geral'&&!d.apagado&&!pnlCargo(d.perfil)&&d.ativo!==false);
  return `${banner()}<div class="head"><div><div class="eyebrow">AJUSTES</div><h1>Painéis por cargo</h1><div class="sub">Monte o que cada cargo acessa e a tela inicial que a pessoa vê ao entrar. Depois, se precisar, ajuste o painel de uma pessoa só.</div></div><button class="btn" data-pv="abrir" style="height:42px">${ic('lupa',16,2.2)}Pré-visualizar como cargo</button></div>
   ${ajAbas('paineis')}
   <div class="pnl-wrap"><aside class="pnl-side">
     <section class="card pnl-lst"><div class="label" style="margin-bottom:8px">CARGOS · ${ks.length}</div>
      ${ks.length?ks.map(k=>{ const c=C[k], n=pnlPessoasDe(k).length; return `<button class="pnl-it ${E&&E.tipo==='cargo'&&E.id===k?'on':''}" data-act="pnl-cargo" data-id="${k}"><b>${esc(c.nome)}</b><small>${(c.blocos||[]).length} blocos · ${(c.mods||[]).length} módulos · ${n} ${n===1?'pessoa':'pessoas'}</small></button>`; }).join(''):'<div class="sub" style="font-size:13px;margin:0 0 6px">Nenhum cargo ainda. Comece por um modelo:</div>'}
      <div class="label" style="margin:14px 0 8px">NOVO A PARTIR DE</div><div class="pnl-mods">${Object.entries(PNL_MODELOS).map(([k,m])=>`<button class="chip" data-act="pnl-novo" data-v="${k}">${k==='vazio'?'Em branco':esc(m.nome)}</button>`).join('')}</div></section>
     <section class="card pnl-lst"><div class="label" style="margin-bottom:8px">PESSOAS</div>
      ${(S.acs.lista||[]).filter(d=>d._id!=='_geral'&&!d.apagado).sort((a,b)=>acsNome(a._id).localeCompare(acsNome(b._id))).map(d=>`<button class="pnl-it ${E&&E.tipo==='pessoa'&&E.id===d._id?'on':''}" data-act="pnl-pessoa" data-id="${esc(d._id)}"><b>${esc(acsNome(d._id))}</b><small>${esc(pnlPerfilNome(d.perfil))}${d.blocos&&d.blocos.length?' · painel próprio':''} · ${pnlVisto(d._id)}${d.ativo===false?' · bloqueada':''}</small></button>`).join('')||'<div class="sub" style="font-size:13px;margin:0">Ninguém com acesso ainda.</div>'}
      <button class="pnl-it ${E&&E.tipo==='dono'?'on':''}" data-act="pnl-dono"><b>Você</b><small>seu próprio painel inicial</small></button>
      ${semCargo.length?`<div class="sub" style="font-size:12px;margin:8px 2px 0">${semCargo.length} ${semCargo.length===1?'pessoa ainda está':'pessoas ainda estão'} num perfil antigo. Em <button class="lnk" data-go="acessos" style="font-size:12px">Acessos</button>, escolha o cargo novo para ela seguir o painel.</div>`:''}</section>
   </aside><div class="pnl-main">${pnlEditor()}</div></div>`; }
function pnlSujo(){ if(S.pnl.ed) S.pnl.ed.sujo=true; }
async function pnlSalvar(){ const N=S.pnl, E=N.ed; if(!E||N.salvando||!S.db) return;
  const limpa=bs=>(bs||[]).map(b=>{ const o={t:b.t,s:b.s||PNL_BLOCOS[b.t].s}; if(b.p&&Object.keys(b.p).length) o.p=b.p; return o; });
  N.salvando=true; render();
  try{ if(E.tipo==='cargo'){ const f=E.f; if(!String(f.nome||'').trim()){ toast('Dê um nome para o cargo.'); N.salvando=false; render(); return; }
      const c={nome:String(f.nome).trim(),desc:String(f.desc||'').trim(),mods:f.mods||[],ocultas:f.ocultas||[],locais:(f.mods||[]).includes('almox')?(f.locais||[]):[],contar:!!f.contar,receber:!!f.receber,auditar:!!f.auditar,verAud:!!f.verAud,blocos:limpa(f.blocos),alteradoEm:new Date().toISOString()};
      { const old=((N.dados||{}).cargos||{})[E.id]; if(old){ const snap=pnlClone(old); delete snap.hist; c.hist=[...(old.hist||[]).slice(-9),{em:old.alteradoEm||null,por:old.alteradoPor||null,snap}]; } c.alteradoPor=S.uid||null; }
      const D=pnlClone(N.dados)||{}; D.cargos=D.cargos||{}; D.cargos[E.id]=c; D.em=new Date().toISOString(); await S.db.doc('config/paineis').set(D); N.dados=D; }
    else if(E.tipo==='dono'){ const D=pnlClone(N.dados)||{}; D.cargos=D.cargos||{}; D.dono={blocos:limpa(E.f.blocos)}; D.em=new Date().toISOString(); await S.db.doc('config/paineis').set(D); N.dados=D; }
    else { const d=(S.acs.lista||[]).find(x=>x._id===E.id); if(!d) throw {code:'not_found'}; const nd=Object.assign({},d); delete nd._id; if(E.f.proprio) nd.blocos=limpa(E.f.blocos); else delete nd.blocos; nd.alteradoEm=new Date().toISOString(); nd.alteradoPor=S.uid||null; await S.db.doc('acessos/'+E.id).set(nd); }
    E.sujo=false; toast('Salvo. Quem usa '+(E.tipo==='cargo'?'este cargo':E.tipo==='dono'?'o seu painel':'este painel')+' já vê assim.'); }
  catch(e){ erro(e); } N.salvando=false; render(); }
function pnlMover(i,d){ const bs=S.pnl.ed.f.blocos, j=i+d; if(j<0||j>=bs.length) return; [bs[i],bs[j]]=[bs[j],bs[i]]; pnlSujo(); render(); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="pnl-"]'); if(!b||b.disabled) return; const N=S.pnl, a=b.dataset.act;
  if(a==='pnl-prev-x'){ N.prev=null; go('paineis'); return; }
  if(!S.acs.dono) return;
  if(a==='pnl-cargo'){ if(N.ed&&N.ed.sujo&&!confirmarTroca()) return; pnlAbrirCargo(b.dataset.id); render(); return; }
  if(a==='pnl-pessoa'){ if(N.ed&&N.ed.sujo&&!confirmarTroca()) return; pnlAbrirPessoa(b.dataset.id); if(S.view!=='paineis') go('paineis'); else render(); return; }
  if(a==='pnl-dono'){ if(N.ed&&N.ed.sujo&&!confirmarTroca()) return; pnlAbrirDono(); render(); return; }
  if(a==='pnl-novo'){ const m=PNL_MODELOS[b.dataset.v]||PNL_MODELOS.vazio; const id=pnlNum(); N.ed={tipo:'cargo',id,f:Object.assign({mods:[],ocultas:[],locais:[],blocos:[]},pnlClone(m),{nome:b.dataset.v==='vazio'?'':m.nome}),aba:'painel',sujo:true,novo:true}; N.add=b.dataset.v==='vazio'; render(); setTimeout(()=>{ const n=document.getElementById('pe-nome'); if(n){ n.focus(); n.select(); } },30); return; }
  if(a==='pnl-aba'){ N.ed.aba=b.dataset.v; render(); return; }
  if(a==='pnl-tam'){ const bl=N.ed.f.blocos[+b.dataset.i]; if(bl){ bl.s=b.dataset.v; pnlSujo(); render(); } return; }
  if(a==='pnl-dup'){ const E=N.ed; const id=pnlNum(), f=pnlClone(E.f); delete f.hist; f.nome=(f.nome||'Cargo')+' (cópia)'; N.ed={tipo:'cargo',id,f,aba:'painel',sujo:true,novo:true}; N.add=false; render(); toast('Cópia criada. Ajuste o nome e o que precisar e clique em Salvar.'); setTimeout(()=>{ const n=document.getElementById('pe-nome'); if(n){ n.focus(); n.select(); } },60); return; }
  if(a==='pnl-addsug'){ const E=N.ed; pnlSugeridos(E).forEach(k=>{ const B=PNL_BLOCOS[k], nb={t:k,s:B.s}; if(B.par==='linha') nb.p={linha:linhasOrd()[0]}; if(B.par==='ritmo') nb.p={ritmo:'total'}; E.f.blocos.push(nb); }); pnlSujo(); render(); return; }
  if(a==='pnl-hist'){ const E=N.ed, h=((pnlCargos()[E.id]||{}).hist||[])[+b.dataset.i]; if(!h||!h.snap) return; const keep=E.f.hist; E.f=Object.assign({mods:[],ocultas:[],locais:[],blocos:[]},pnlClone(h.snap)); E.f.hist=keep; pnlSujo(); render(); toast('Versão de '+(h.em?dia(h.em).toLowerCase()+' '+hora(h.em):'antes')+' carregada. Clique em Salvar para manter.'); return; }
  if(a==='pnl-addt'){ N.add=!N.add; render(); return; }
  if(a==='pnl-add'){ const k=b.dataset.v, B=PNL_BLOCOS[k], nb={t:k,s:B.s}; if(B.par==='linha') nb.p={linha:linhasOrd()[0]}; if(B.par==='ritmo') nb.p={ritmo:'total'}; N.ed.f.blocos.push(nb); pnlSujo(); render(); setTimeout(()=>{ const l=document.querySelector('.pe-lst .pe-b:last-child'); if(l) l.scrollIntoView({block:'nearest',behavior:'smooth'}); },30); return; }
  if(a==='pnl-sobe'){ pnlMover(+b.dataset.i,-1); return; }
  if(a==='pnl-desce'){ pnlMover(+b.dataset.i,1); return; }
  if(a==='pnl-tira'){ N.ed.f.blocos.splice(+b.dataset.i,1); pnlSujo(); render(); return; }
  if(a==='pnl-salvar'){ pnlSalvar(); return; }
  if(a==='pnl-prev'){ const E=N.ed; const nome=E.tipo==='pessoa'?String(E.f.nome).split(' ')[0]:E.tipo==='dono'?String(S.nomes[S.uid]||'').split(' ')[0]:'';
    N.prev={blocos:pnlClone(E.f.blocos),nome,cargo:E.tipo==='cargo'?E.f.nome:E.tipo==='pessoa'&&pnlCargo(E.f.perfil)?pnlCargo(E.f.perfil).nome:''};
    if(E.tipo==='cargo'){ N.prev.p=pvPermCargo(Object.assign({},E.f,{blocos:N.prev.blocos})); N.prev.alvo=pnlCargos()[E.id]?'c:'+E.id:''; } else if(E.tipo==='pessoa'){ const pp=pvPermPessoa(E.id,E.f.proprio?N.prev.blocos:null); if(pp){ N.prev.p=pp; N.prev.blocos=pp.blocos||[]; N.prev.alvo='p:'+E.id; } }
    go('painel'); return; }
  if(a==='pnl-excluir'){ const E=N.ed; const ps=pnlPessoasDe(E.id); if(ps.length){ toast('Antes, mude o cargo de '+ps.length+(ps.length===1?' pessoa':' pessoas')+' em Acessos.'); return; }
    if(E.novo||!pnlCargos()[E.id]){ N.ed=null; render(); return; }
    if(!b.dataset.ok){ b.dataset.ok='1'; b.textContent='Clique de novo para excluir'; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.ok; b.textContent='Excluir cargo'; } },4000); return; }
    const D=pnlClone(N.dados)||{}; delete (D.cargos||{})[E.id]; D.em=new Date().toISOString(); try{ await S.db.doc('config/paineis').set(D); N.dados=D; N.ed=null; toast('Cargo excluído.'); }catch(e){ erro(e); } render(); return; } });
function confirmarTroca(){ const N=S.pnl, t=Date.now(); if(N._tr&&t-N._tr<5000){ N._tr=0; return true; } N._tr=t; toast('Há mudanças não salvas. Clique de novo para sair sem salvar.'); return false; }
document.addEventListener('input',ev=>{ const t=ev.target, E=S.pnl.ed; if(!E||!S.acs.dono) return;
  if(t.id==='pe-nome'){ E.f.nome=t.value; E.sujo=true; const s=document.querySelector('[data-act="pnl-salvar"]'); if(s&&!S.pnl.salvando) s.textContent='Salvar'; return; }
  if(t.id==='pe-desc'){ E.f.desc=t.value; E.sujo=true; return; }
  if(t.dataset&&t.dataset.pe!=null&&t.dataset.k==='texto'){ const bl=E.f.blocos[+t.dataset.pe]; if(bl){ bl.p=Object.assign({},bl.p,{texto:t.value}); E.sujo=true; } } });
document.addEventListener('change',ev=>{ const t=ev.target, E=S.pnl.ed; if(!E||!S.acs.dono||!t.dataset) return; const f=E.f;
  if(t.dataset.pe!=null){ const bl=f.blocos[+t.dataset.pe]; if(!bl) return; const k=t.dataset.k; if(k==='texto') return;
    if(k==='urg'){ bl.p=Object.assign({},bl.p,{urg:t.checked}); pnlSujo(); render(); return; }
    if(k==='_s') bl.s=t.value; else if(k==='views'){ const vs=[...document.querySelectorAll(`[data-pe="${t.dataset.pe}"][data-k="views"]:checked`)].map(x=>x.value); bl.p=Object.assign({},bl.p,{views:vs}); }
    else if(k!=='texto') bl.p=Object.assign({},bl.p,{[k]:t.value});
    pnlSujo(); render(); return; }
  if(t.name==='pe-seg'){ f.proprio=t.value==='proprio'; if(!f.proprio){ const cg=pnlCargo(f.perfil); f.blocos=pnlClone(cg?cg.blocos:[])||[]; } pnlSujo(); render(); return; }
  if(t.dataset.pm!=null){ const k=t.dataset.pm; f.mods=t.checked?[...new Set([...(f.mods||[]),k])]:(f.mods||[]).filter(x=>x!==k); pnlSujo(); render(); return; }
  if(t.dataset.pv!=null){ const v=t.dataset.pv; f.ocultas=t.checked?(f.ocultas||[]).filter(x=>x!==v):[...new Set([...(f.ocultas||[]),v])]; pnlSujo(); render(); return; }
  if(t.dataset.pl!=null){ const l=t.dataset.pl; f.locais=t.checked?[...new Set([...(f.locais||[]),l])]:(f.locais||[]).filter(x=>x!==l); pnlSujo(); render(); return; }
  if(t.dataset.pa!=null){ f[t.dataset.pa]=t.checked?1:0; pnlSujo(); render(); return; } });
// arrastar para reordenar
let _pnlDrag=null;
document.addEventListener('dragstart',ev=>{ const r=ev.target.closest&&ev.target.closest('.pe-b[draggable="true"]'); if(!r) return; _pnlDrag=+r.dataset.pei; r.classList.add('arr'); try{ ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain',String(_pnlDrag)); }catch(e){} });
document.addEventListener('dragover',ev=>{ if(_pnlDrag==null) return; const r=ev.target.closest&&ev.target.closest('.pe-b'); if(!r) return; ev.preventDefault(); document.querySelectorAll('.pe-b.alvo').forEach(x=>x.classList.remove('alvo')); r.classList.add('alvo'); });
document.addEventListener('drop',ev=>{ if(_pnlDrag==null) return; const r=ev.target.closest&&ev.target.closest('.pe-b'); ev.preventDefault(); const de=_pnlDrag; _pnlDrag=null; if(!r||!S.pnl.ed) return render(); const para=+r.dataset.pei; if(para===de) return render(); const bs=S.pnl.ed.f.blocos; const [x]=bs.splice(de,1); bs.splice(para,0,x); pnlSujo(); render(); });
document.addEventListener('dragend',()=>{ if(_pnlDrag!=null){ _pnlDrag=null; render(); } });

document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="pnl-cargo-ir"]'); if(!b) return; pnlAbrirCargo(b.dataset.id); S.pnl.ed&&(S.pnl.ed.aba='acesso'); go('paineis'); });

// ================= BLOCO 1 (01/10): replanejar atrasadas · cadastro incompleto · paradas sem motivo =================
S.rep={aberto:false,d:{},off:{},salvando:false};
function repAtrasadas(){ const h=hojeStr(), L=linhasOrd();
  return ordAbertas().filter(o=>ordAtras(o,h)&&Math.max(0,o.total-entregueDe(o))>0)
    .sort((a,b)=>L.indexOf(a.linha)-L.indexOf(b.linha)||dataEf(a).localeCompare(dataEf(b))||seqCmp(a,b)); }
/* encaixa cada atrasada no 1º dia útil (a partir de hoje) com capacidade livre na linha, sem mexer nas outras ordens */
function repSugestao(xs){ const h=hojeStr(), out={}, carga={}, ids=new Set(xs.map(o=>o._id)); const kd=x=>{ const d=dataEf(x); return d<h?h:d; };
  ordAbertas().concat(prevAtivas()).forEach(x=>{ if(!x._pv&&ids.has(x._id)) return; const q=x._pv?(+x.qtd||0):Math.max(0,x.total-entregueDe(x)); const k=x.linha+'|'+kd(x); carga[k]=(carga[k]||0)+q; });
  xs.forEach(o=>{ const cap=capDe(o.linha), q=Math.max(0,o.total-entregueDe(o)); let d=h; for(let i=0;i<14&&!anlUtil(d);i++) d=addDias(d,1);
    if(cap>0){ for(let i=0;i<60;i++){ if(anlUtil(d)&&(carga[o.linha+'|'+d]||0)<cap*0.98) break; d=addDias(d,1); } }
    carga[o.linha+'|'+d]=(carga[o.linha+'|'+d]||0)+q; out[o._id]=d; });
  return out; }
function repBtn(){ if(calRO()) return ''; const n=repAtrasadas().length; return n?`<button class="btn warn" data-act="rep-abrir" style="height:42px">${ic('relogio',18,2)}Replanejar atrasadas (${n})</button>`:''; }
function repModal(){ const R=S.rep; if(!R.aberto) return ''; const h=hojeStr(), xs=repAtrasadas(); const sug=repSugestao(xs);
  xs.forEach(o=>{ if(!R.d[o._id]) R.d[o._id]=sug[o._id]; });
  const sel=xs.filter(o=>!R.off[o._id]); const porL={}; xs.forEach(o=>(porL[o.linha]=porL[o.linha]||[]).push(o));
  const dTag=d=>{ const w=['dom','seg','ter','qua','qui','sex','sáb'][new Date(d+'T12:00:00').getDay()]; return (d===h?'hoje':w)+' '+dm(d); };
  return `<div class="dbmodal" data-rep-fundo="1"><div class="dbmbox rep" role="dialog" aria-modal="true" aria-label="Replanejar ordens atrasadas"><div class="dbfw">
   <div class="head" style="align-items:flex-start;flex-wrap:nowrap"><div><div class="eyebrow">PRODUÇÃO</div><h2 style="font-size:22px;margin-top:4px">Replanejar atrasadas</h2>
    <div class="sub">${xs.length} ${xs.length===1?'ordem está':'ordens estão'} com o dia vencido e ainda têm saldo. A sugestão põe cada uma no primeiro dia útil com capacidade livre na linha, sem tirar nenhuma outra ordem do lugar. Elas entram na frente da fila do novo dia. Ajuste o dia se quiser.</div></div>
    <button class="lnk" data-act="rep-fechar">Fechar</button></div>
   ${xs.length?Object.keys(porL).map(l=>`<div class="rep-l"><div class="rep-lh"><b>${esc(l)}</b><small class="num">${capDe(l)?f0(capDe(l))+' por dia':'sem capacidade cadastrada · sugere hoje'}</small><button class="lnk" data-act="rep-hoje" data-v="${esc(l)}">Todas para hoje</button></div>
     ${porL[l].map(o=>{ const q=Math.max(0,o.total-entregueDe(o)), at=difDias(dataEf(o),h), d=R.d[o._id];
       return `<div class="rep-r ${R.off[o._id]?'off':''}"><input type="checkbox" class="rep-ck" data-rep-on="${esc(o._id)}" ${R.off[o._id]?'':'checked'} aria-label="Replanejar a ordem ${esc(o.num)}">
        <span class="rep-o"><b class="num">${esc(o.num)}</b> · ${esc(nomeCurto(o))}<small class="num">${esc(codigoDe(o))} · falta ${f0(q)} ${uA(o)} · era ${dm(dataEf(o))}, ${at} dia${at===1?'':'s'} de atraso</small></span>
        <span class="rep-n"><input type="date" class="txt rep-d" data-rep-d="${esc(o._id)}" value="${esc(d)}" min="${h}" ${R.off[o._id]?'disabled':''}><small class="num">${d===sug[o._id]?'sugerido':'escolhido'} · ${dTag(d)}</small></span></div>`; }).join('')}</div>`).join(''):'<div class="empty">Nenhuma ordem atrasada.</div>'}
   <div class="rep-f"><button class="btn sec" data-act="rep-sug">Voltar à sugestão</button><button class="btn" data-act="rep-aplicar" ${sel.length&&!R.salvando?'':'disabled'}>${ic('check',18,2.2)}${R.salvando?'Gravando…':'Replanejar '+sel.length+' '+(sel.length===1?'ordem':'ordens')}</button></div>
  </div></div></div>`; }
async function repAplicar(){ const R=S.rep, h=hojeStr(); const xs=repAtrasadas().filter(o=>!R.off[o._id]); if(!xs.length||R.salvando) return;
  R.salvando=true; render(); let ok=0; const grupos={};
  for(const o of xs){ const d=R.d[o._id]||h; if(d<h) continue; const ant=dataEf(o), u={};
    if(entregueDe(o)>0&&o.data&&d>o.data){ u.continuaEm=d; u.hist=histAdd(o,'Replanejada (atrasada): continua '+dm(d)); }
    else { u.data=d; u.continuaEm=null; u.hist=histAdd(o,'Replanejada (atrasada): '+dm(ant)+' → '+dm(d)); }
    if(!o.turno) u.turno='Dia todo';
    if(await ordUpd(o._id,u)){ Object.assign(o,u); ok++; (grupos[o.linha+'|'+d]=grupos[o.linha+'|'+d]||[]).push(o); } }
  const kd=x=>{ const e=dataEf(x); return e<h?h:e; };
  for(const k of Object.keys(grupos)){ const i=k.indexOf('|'), l=k.slice(0,i), d=k.slice(i+1); const mov=grupos[k], ids=new Set(mov.map(x=>x._id));
    const resto=ordAbertas().concat(prevAtivas()).filter(x=>x.linha===l&&kd(x)===d&&!(!x._pv&&ids.has(x._id))).sort(seqCmp);
    await reordenarCal(mov[0]._id,l,d,true,mov.concat(resto).map(seqId)); }
  S.rep={aberto:false,d:{},off:{},salvando:false}; render();
  toast(ok?`${ok} ${ok===1?'ordem replanejada':'ordens replanejadas'}, na frente da fila do novo dia.`:'Nada foi gravado.'); }

/* ---------- cadastro incompleto (Meu dia) ---------- */
function cadFaltas(){ const ab=ordAbertas(), L=linhasOrd();
  const semCap=L.filter(l=>!(capDe(l)>0)&&ab.some(o=>o.linha===l));
  const semCim=[...new Set(ab.filter(o=>usaCimFab(o.linha)&&/^(AC|AB)\d/.test(codigoDe(o))&&!kgCimento(codigoDe(o))).map(codigoDe))].sort();
  const cor=!S.cfg.seqCor&&corCfg().linhas.some(l=>ab.some(o=>o.linha===l));
  return {semCap,semCim,cor,n:semCap.length+semCim.length+(cor?1:0)}; }
function cadAviso(){ const f=cadFaltas(); if(!f.n) return ''; const p=[];
  if(f.semCap.length) p.push(`<span><b>Sem capacidade por dia:</b> ${f.semCap.map(esc).join(', ')}. Sem ela não há estimativa de término nem sugestão de dia.</span><button class="lnk" data-go="anllin">Cadastrar capacidade</button>`);
  if(f.semCim.length) p.push(`<span><b>${f.semCim.length} ${f.semCim.length===1?'produto':'produtos'} sem kg de cimento por saco</b> (${f.semCim.slice(0,5).map(esc).join(', ')}${f.semCim.length>5?'…':''}). O “Cimento × programação” não conta essas ordens.</span><button class="lnk" data-act="cad-cim">Completar nos itens</button>`);
  if(f.cor) p.push(`<span><b>Sequência de cores ainda no padrão.</b> Confirme as regras com a produção.</span><button class="lnk" data-act="cad-cor">Ver regras</button>`);
  return `<div class="av warn cad"><b>Cadastro incompleto</b>${p.join('')}</div>`; }

/* ---------- paradas sem motivo ---------- */
function parSemMotivo(){ const h0=ini0(new Date()).getTime();
  const xs=S.paradas.filter(p=>p.motivo==='A definir'&&p.fim&&new Date(p.inicio).getTime()<h0).sort((a,b)=>b.inicio.localeCompare(a.inicio)); if(!xs.length) return '';
  return `<section class="card" style="border:1.5px solid var(--warn)"><div class="label" style="color:var(--warn-ink)">PARADAS DE OUTROS DIAS SEM MOTIVO · ${xs.length}</div><div class="sub" style="margin:2px 0 6px;font-size:13px">A linha registrou com “Ainda não sei”. Abra e escolha o motivo.</div>
   ${xs.map(p=>S.parEd===p._id?parEdForm(p):`<div class="row num" style="grid-template-columns:90px minmax(0,1fr) auto auto"><b>${esc(p.linha)}</b><span>${dm(hojeStr(new Date(p.inicio)))} · ${hora(p.inicio)} → ${hora(p.fim)}${p.ordem?' · ordem '+esc(p.ordem):''}${p.obs?' · '+esc(p.obs):''}</span><span class="pill neu">${dur(new Date(p.fim)-new Date(p.inicio))}</span><button class="lnk" data-act="par-ed" data-id="${esc(p._id)}" style="padding:0 2px">Escolher motivo</button></div>`).join('')}</section>`; }
function parAvisoMeuDia(){ const n=S.paradas.filter(p=>p.motivo==='A definir').length; return n?`<div class="av warn"><b>${n} ${n===1?'parada':'paradas'} sem motivo</b><span>Registrada${n===1?'':'s'} pela linha com “Ainda não sei”.</span><button class="lnk" data-go="paradas">Completar</button></div>`:''; }

document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="rep-"],[data-act^="cad-"],[data-act="it-falta-x"]');
  if(!b){ const f=ev.target.closest('[data-rep-fundo]'); if(f&&ev.target===f){ S.rep.aberto=false; render(); } return; }
  if(b.disabled) return; const act=b.dataset.act, R=S.rep;
  if(act==='rep-abrir'){ S.rep={aberto:true,d:{},off:{},salvando:false,st:0}; render(); return; }
  if(act==='rep-fechar'){ R.aberto=false; render(); return; }
  if(act==='rep-sug'){ R.d={}; render(); return; }
  if(act==='rep-hoje'){ const h=hojeStr(); repAtrasadas().filter(o=>o.linha===b.dataset.v).forEach(o=>{ R.d[o._id]=h; delete R.off[o._id]; }); render(); return; }
  if(act==='rep-aplicar'){ repAplicar(); return; }
  if(act==='cad-cim'){ S.it.falta=cadFaltas().semCim; S.it.busca=''; S.it.linha='todas'; go('itens'); return; }
  if(act==='cad-cor'){ go('ajustes'); setTimeout(()=>{ const e=[...document.querySelectorAll('#view .label,#view h2')].find(x=>/SEQU[ÊE]NCIA DE CORES/i.test(x.textContent)); e&&e.scrollIntoView({block:'start',behavior:'smooth'}); },60); return; }
  if(act==='it-falta-x'){ S.it.falta=null; render(); return; }
});
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset) return;
  if(t.dataset.repOn){ if(t.checked) delete S.rep.off[t.dataset.repOn]; else S.rep.off[t.dataset.repOn]=true; render(); return; }
  if(t.dataset.repD){ if(t.value&&t.value>=hojeStr()) S.rep.d[t.dataset.repD]=t.value; render(); return; } });
document.addEventListener('scroll',ev=>{ const t=ev.target; if(t&&t.classList&&t.classList.contains('rep')) S.rep.st=t.scrollTop; },true);
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.rep&&S.rep.aberto){ S.rep.aberto=false; render(); } });

// ================= ACESSOS (login: dona do painel = master; libera módulos por pessoa) =================
const ALX_LOC={a3:'Almox 3',a30:'Almox 30',rej:'Rejunte',sep:'Separação',a1:'Almox 1',a2:'Almox 2'};
const ALX_LOCS=Object.keys(ALX_LOC);
const ACS_MODS=[['inicio','Meu dia'],['silos','Silos'],['producao','Produção'],['tv','Só a TV da fábrica'],['telas','Telas de TV (apresentação)'],['cal','Só o Calendário (consulta)'],['paradas','Só Paradas (registrar)'],['analise','Análise PCP'],['almox','Inventário'],['ajustes','Ajustes e itens']];
const ACS_ACOES=[['contar','Lançar contagem'],['receber','Registrar recebimento'],['auditar','Auditar saldo e apontar recebimentos'],['verAud','Ver a auditoria (só consulta)']];
const ACS_PERFIS={
  pcp:{nome:'PCP (tudo)',mods:['inicio','silos','producao','analise','almox','ajustes'],locais:ALX_LOCS,contar:1,receber:1,auditar:1,verAud:1},
  supsis:{nome:'Supervisor Sistema',mods:['almox'],locais:ALX_LOCS,contar:1,receber:1,auditar:1,verAud:1},
  sup:{nome:'Supervisor',mods:['almox'],locais:ALX_LOCS,contar:1,receber:1},
  conf:{nome:'Conferente (Almox 3)',mods:['almox'],locais:['a3'],contar:1,receber:1},
  conf2:{nome:'Conferente 2 (Almox 30)',mods:['almox'],locais:['a30'],contar:1},
  conf3:{nome:'Conferente 3 (Rejunte e Separação)',mods:['almox'],locais:['rej','sep'],contar:1},
  confa1:{nome:'Conferente Almox 1',mods:['almox'],locais:['a1'],contar:1},
  confa2:{nome:'Conferente Almox 2',mods:['almox'],locais:['a2'],contar:1},
  auditor:{nome:'Auditor (consulta)',mods:['almox'],locais:ALX_LOCS,verAud:1},
  linha:{nome:'Produção · Tela da linha (computador fixo)',mods:['paradas'],locais:[]},
  producao:{nome:'Produção (consulta)',mods:['inicio','producao'],locais:[]},
  tv:{nome:'TV da fábrica',mods:['tv'],locais:[]},
  cal:{nome:'Calendário (só consulta)',mods:['cal'],locais:[]},
  outro:{nome:'Personalizado',mods:[],locais:[]}
};
const ACS_TUDO={tudo:true,mods:ACS_MODS.map(m=>m[0]),locais:ALX_LOCS,contar:true,receber:true,auditar:true,verAud:true};
S.acs={pronto:false,dono:false,semId:false,doc:null,erro:null,pedido:null,erroPedido:null,lista:[],pedidos:[],ed:null,busca:'',res:[],salvando:false};

function acsP(){ const A=S.acs; if(A.dono) return ACS_TUDO; const d=A.doc; if(!A.pronto||!d||d.ativo===false) return null;
  const aud=!!d.auditar; return {mods:d.mods||[],locais:(d.locais||[]).filter(l=>ALX_LOC[l]),contar:!!d.contar,receber:!!d.receber,auditar:aud,verAud:aud||!!d.verAud}; }
function alxViewOk(v,p){ if(v==='alxcont') return !!p.contar; if(v==='alxrec') return !!(p.receber||p.auditar||p.verAud); if(v==='alxaud') return !!(p.auditar||p.verAud); return true; }
function viewOk(v){ const p=acsP(); if(!p) return false; if(p.tudo) return true;
  if(v==='modulos') return true; if(v==='acessos') return false;
  if(v==='ajustes'||v==='itens') return p.mods.includes('ajustes');
  if(v==='tvfab'&&p.mods.includes('tv')) return true;
  if(v==='tvapres') return p.mods.includes('tv')||p.mods.includes('telas')||p.mods.includes('producao')||p.mods.includes('analise');
  if(v==='calendario'&&p.mods.includes('cal')) return true;
  if(v==='paradas'&&p.mods.includes('paradas')) return true;
  if(v==='diario'&&p.mods.includes('almox')) return true;
  if(String(v).startsWith('alx')) return p.mods.includes('almox')&&p.locais.length>0&&alxViewOk(v,p);
  const m=modDe(v); return !!m&&p.mods.includes(m); }
function calRO(){ const p=acsP(); return !!p&&!p.tudo&&!p.mods.includes('producao'); }
function mViews(m){ return m.views.filter(viewOk); }
function modsVis(){ return MODS.filter(m=>mViews(m).length); }
function primeiraView(){ const m=modsVis()[0]; return m?mViews(m)[0]:(viewOk('ajustes')?'ajustes':'meudia'); }

async function acsIniciar(db,user){ const A=S.acs;
  try{ A.dono=user?!!(await user.isOwner()):false; }catch(e){ A.dono=false; }
  if(A.dono){ A.pronto=true;
    if(db){ inscrever('acessos',()=>db.collection('acessos').limit(500),snap=>{ A.lista=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); acsNomes(); rerenderSeguro(); });
      inscrever('pedidos',()=>db.collection('pedidos').limit(500),snap=>{ A.pedidos=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); acsNomes(); rerenderSeguro(); }); }
    render(); return; }
  if(!S.uid||!db){ A.pronto=true; A.semId=!S.uid; A.erro=db?null:'sem-db'; render(); return; }
  db.doc('acessos/'+S.uid).onSnapshot(s=>{
      /* LOGIN: "não existe" vindo só do cache local (sem resposta do servidor ainda, ou sem internet) NÃO é "sem perfil".
         Antes isso mostrava "Aguardando liberação" para quem já tinha acesso. Continua em "Verificando seu acesso…" até o servidor confirmar. */
      const soCache=!!(s.metadata&&s.metadata.fromCache);
      if(!s.exists&&soCache){ A.cacheSemDoc=true; if(!A.doc) rerenderSeguro(); return; }
      const antes=!!acsP(), esperava=A.pronto&&!A.doc; A.doc=s.exists?s.data():null; A.pronto=true; A.cacheSemDoc=false;
      if(!A.doc){ console.warn('[login] autenticado, mas sem perfil de acesso (acessos/'+S.uid+'). Pedido de acesso enviado ao administrador.'); acsPedir(); }
      if(!viewOk(S.view)){ S.view=primeiraView(); const m=modDe(S.view); if(m) S.mod=m; }
      if(esperava&&!antes&&acsP()) toast('Acesso liberado.');
      render(); },
    e=>{ console.warn('[login] não consegui ler o perfil de acesso', e&&e.code); A.pronto=true; A.erro=(e&&e.code)||'erro'; render(); },
    {includeMetadataChanges:true});
}
async function acsPedir(){ const A=S.acs; if(A.pedido||!S.db||!S.uid) return; A.pedido='enviando';
  try{ const ref=S.db.doc('pedidos/'+S.uid); let ja=null; try{ const g=await ref.get(); ja=g.exists?g.data():null; }catch(e){}
    if(!ja) await ref.set({em:new Date().toISOString()}); A.pedido='ok'; A.erroPedido=null; }
  catch(e){ A.pedido='erro'; A.erroPedido=(e&&e.code)||'erro'; }
  rerenderSeguro(); }
async function acsNomes(){ if(!S.user) return; const ids=new Set(); S.acs.lista.forEach(x=>ids.add(x._id)); S.acs.pedidos.forEach(x=>ids.add(x._id));
  const falta=[...ids].filter(i=>i&&i!=='_geral'&&!(i in S.nomes)); if(!falta.length) return;
  try{ const ps=await S.user.profiles(falta); falta.forEach(i=>{ S.nomes[i]=(ps&&ps[i]&&ps[i].name)||''; }); rerenderSeguro(); }catch(e){} }
function acsNome(id){ return (S.nomes[id])||'Pessoa sem nome visível'; }

// tela quando a pessoa ainda não tem acesso
function acsGate(){ const A=S.acs;
  if(!A.pronto){ if(S.dbOk===false&&!S.user) return acsCaixa('Abra o painel pelo claude.ai','Este painel só funciona aberto pelo link do claude.ai, com a sua conta da Colafix.'); return acsCaixa('Verificando seu acesso…','Um instante.'); }
  if(A.dono) return '';
  if(A.semId) return acsCaixa('Não consegui identificar a sua conta','Abra o painel pelo link do claude.ai, entrando com a sua conta da Colafix. Se já está assim, recarregue a página.');
  if(A.erro&&!A.doc) return acsCaixa('Não consegui verificar o seu acesso',(/unavailable|network|tempo/.test(A.erro)?'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.':'Login realizado, mas não consegui ler o seu perfil de acesso. Recarregue a página. Se continuar, avise o administrador.')+(A.erro!=='sem-db'?' <small>(código: '+esc(A.erro)+')</small>':'')+(window.claude&&window.claude.online?'<p style="margin:14px 0 0"><button class="btn sec" onclick="location.reload()">Tentar de novo</button> <button class="lnk" data-act="sair-conta">Entrar com outro usuário</button></p>':''));
  const d=A.doc;
  if(d&&d.ativo===false) return acsCaixa('Acesso bloqueado','O seu acesso a este painel foi retirado. Se for engano, fale com a responsável pelo PCP.');
  if(d&&acsP()&&!modsVis().length&&!viewOk('ajustes')) return acsCaixa('Nenhum módulo liberado','O seu acesso existe, mas nenhum módulo foi marcado. Peça para a responsável escolher o que você pode ver.');
  if(d) return '';
  const nm=S.nomes[S.uid]||'';
  return acsCaixa('Perfil de acesso não encontrado',`${nm?'<b>'+esc(nm)+'</b> — ':''}Login realizado, mas seu perfil de acesso não foi encontrado. Entre em contato com o administrador.`+
    (A.pedido==='erro'?`<div class="banner" style="margin-top:14px">Não consegui registrar o seu pedido: a sua conta só tem permissão de <b>ver</b> este painel. Peça para a responsável mudar o seu acesso para <b>Colaborador</b> no compartilhamento do painel (ou liberar você direto na tela Acessos).<br><small>(código: ${esc(A.erroPedido||'')})</small></div>`
     :`<p style="margin:12px 0 0">O pedido já foi enviado para a responsável pelo PCP. Assim que ela liberar, esta tela muda sozinha.</p>${window.claude&&window.claude.online?'<p style="margin:14px 0 0"><button class="lnk" data-act="sair-conta">Entrar com outra conta</button></p>':''}`));
}
P.cadeado='<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>';
function acsCaixa(t,txt){ return `<section class="card acs-gate"><div class="acs-ic">${ic('cadeado',28,1.8)}</div><h1 style="font-size:24px;line-height:30px">${t}</h1><div class="sub" style="font-size:15px;line-height:1.5;max-width:520px">${txt}</div></section>`; }

// ---------- tela Acessos (só a dona) ----------
function acsResumo(d){ d=pnlCargo(d.perfil)?Object.assign({},d,acsPreset(d.perfil),{ativo:d.ativo}):d; if(d.ativo===false) return '<span class="pill crit">bloqueado</span>';
  const mods=(d.mods||[]).map(m=>(ACS_MODS.find(x=>x[0]===m)||[m,m])[1]);
  const locs=(d.mods||[]).includes('almox')?(d.locais||[]).map(l=>ALX_LOC[l]).filter(Boolean):[];
  return `${mods.map(m=>`<span class="tag">${esc(m)}</span>`).join(' ')||'<span style="color:var(--faint)">nenhum módulo</span>'}${locs.length?` <span class="sub" style="font-size:12px">· ${esc(locs.length===ALX_LOCS.length?'todos os almox':locs.join(', '))}</span>`:''}`; }
function vAcessos(){ const A=S.acs; if(!A.dono) return acsCaixa('Somente a responsável','Esta tela é só da dona do painel.');
  const pend=A.pedidos.filter(p=>!A.lista.some(l=>l._id===p._id)).sort((a,b)=>String(a.em).localeCompare(String(b.em)));
  const lista=[...A.lista].filter(x=>x._id!=='_geral').sort((a,b)=>acsNome(a._id).localeCompare(acsNome(b._id)));
  const ed=A.ed;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">AJUSTES</div><h1>Acessos</h1><div class="sub">Você é a master: cada pessoa abre o link com a própria conta do claude.ai e só vê o que você liberar aqui.</div></div></div>
  ${ajAbas('acessos')}
  <section class="card acs-info"><div class="label" style="margin-bottom:8px">COMO FUNCIONA</div>
   <ol>
    <li>Compartilhe o link do painel (botão <b>Compartilhar</b> do claude.ai) com a pessoa, com acesso de <b>Colaborador</b>. Quem fica como “Visualizador” consegue abrir, mas não grava nada.</li>
    <li>A pessoa abre o link com a conta dela. Aparece para ela “Aguardando liberação” e para você um pedido aqui.</li>
    <li>Você escolhe o perfil e o que ela pode ver. Dá para mudar ou bloquear quando quiser.</li>
   </ol>
   <div class="sub" style="font-size:12px;margin-top:6px">A pessoa precisa ter conta no claude.ai da organização Colafix. Convidados de fora da empresa só conseguem ver, não gravar.</div></section>
  ${pend.length?`<section class="card" style="border:1.5px solid var(--warn)"><h2>Pedidos aguardando (${pend.length})</h2>
   ${pend.map(p=>{ const cv=acsConvDe(p._id); return `<div class="acs-row"><div><b>${esc(acsNome(p._id))}</b><small>pediu ${p.em?dia(p.em).toLowerCase()+' às '+hora(p.em):''}${cv?` · <span class="pill ok" style="font-size:11px">pré-cadastrada: ${esc(pnlPerfilNome(cv.perfil))}</span>`:''}</small></div>
    <div class="acs-ac"><select class="txt" id="acs-pp-${esc(p._id)}" data-pre="${esc(cv?cv.perfil:'')}" style="height:40px;width:auto">${acsCargoOpts(cv?cv.perfil:'')}</select>
     <button class="btn" data-act="acs-liberar" data-id="${esc(p._id)}" style="height:40px">Liberar</button>
     <button class="btn sec" data-act="acs-editar" data-id="${esc(p._id)}" style="height:40px">Escolher módulos…</button>
     <button class="btn warn" data-act="acs-recusar" data-id="${esc(p._id)}" style="height:40px">Recusar</button></div></div>`; }).join('')}</section>`:''}
  ${acsCriarCard(lista)}
  ${ed?acsEditor(ed):''}
  <section class="card"><div class="head" style="align-items:center"><h2>Pessoas com acesso</h2></div>
   <div class="acs-row acs-eu"><div><b>${esc(S.nomes[S.uid]||'Você')}</b><small>dona do painel</small></div><div><span class="pill ok">master · tudo</span></div></div>
   ${lista.length?lista.map(d=>`<div class="acs-row" data-act="acs-editar" data-id="${esc(d._id)}" role="button" tabindex="0"><div><b>${esc(acsNome(d._id))}</b><small>${esc(pnlPerfilNome(d.perfil))}${d.alteradoEm?' · alterado '+dia(d.alteradoEm).toLowerCase():''}</small></div><div class="acs-mods">${acsResumo(d)}</div></div>`).join('')
     :'<div class="empty">Ninguém mais tem acesso ainda.</div>'}
  </section>`; }
function acsEditor(ed){ const f=pnlCargo(ed.f.perfil)?Object.assign({},ed.f,acsPreset(ed.f.perfil),{ativo:ed.f.ativo,perfil:ed.f.perfil}):ed.f; const nome=acsNome(ed.id); const temAlx=f.mods.includes('almox');
  return `<section class="card" style="border:1.5px solid var(--teal)" id="acs-ed"><div class="head" style="align-items:baseline"><div><div class="label">${ed.novo?'LIBERAR ACESSO':'EDITAR ACESSO'}</div><h2 style="margin-top:4px">${esc(nome)}</h2></div><button class="lnk" data-act="acs-fechar">Fechar</button></div>
   <div class="label" style="margin:14px 0 8px">PERFIL</div>
   ${Object.keys(pnlCargos()).length?`<div class="chips" style="margin-bottom:8px">${Object.entries(pnlCargos()).map(([k,v])=>`<button class="chip" data-act="acs-perfil" data-v="${k}" aria-pressed="${f.perfil===k}">${esc(v.nome)}</button>`).join('')}</div><div class="sub" style="font-size:12px;margin:0 0 6px">Perfis antigos (sem painel):</div>`:''}<div class="chips">${Object.entries(ACS_PERFIS).map(([k,v])=>`<button class="chip" data-act="acs-perfil" data-v="${k}" aria-pressed="${f.perfil===k}">${esc(v.nome)}</button>`).join('')}</div>${pnlCargo(f.perfil)?`<div class="acs-cargo">Segue o cargo <b>${esc(pnlCargo(f.perfil).nome)}</b>: módulos, abas e tela inicial vêm de <button class="lnk" data-act="pnl-cargo-ir" data-id="${esc(f.perfil)}">Painéis por cargo</button>.</div>`:''}
   <div class="label" style="margin:16px 0 8px">MÓDULOS QUE PODE VER</div>
   <div class="acs-cks">${ACS_MODS.map(([k,n])=>`<label class="ck"><input type="checkbox" data-acs-mod="${k}" ${pnlCargo(f.perfil)?'disabled':''} ${f.mods.includes(k)?'checked':''}>${esc(n)}</label>`).join('')}</div>
   ${temAlx?`<div class="label" style="margin:16px 0 8px">ALMOXARIFADOS</div>
   <div class="acs-cks">${ALX_LOCS.map(l=>`<label class="ck"><input type="checkbox" data-acs-loc="${l}" ${pnlCargo(f.perfil)?'disabled':''} ${f.locais.includes(l)?'checked':''}>${ALX_LOC[l]}</label>`).join('')}</div>
   <div class="label" style="margin:16px 0 8px">NO ALMOXARIFADO PODE</div>
   <div class="acs-cks">${ACS_ACOES.map(([k,n])=>`<label class="ck"><input type="checkbox" data-acs-acao="${k}" ${pnlCargo(f.perfil)?'disabled':''} ${f[k]?'checked':''}>${esc(n)}</label>`).join('')}</div>`:''}
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px">
    ${ed.novo?'<span></span>':`<button class="btn ${f.ativo===false?'':'warn'}" data-act="acs-bloq" style="height:44px">${f.ativo===false?'Desbloquear':'Bloquear acesso'}</button>`}
    <button class="btn" data-act="acs-salvar" ${S.acs.salvando?'disabled':''}>${ic('check',18,2.2)}${ed.novo?'Liberar acesso':'Salvar'}</button></div>
  </section>`; }
function acsPreset(k){ const p=ACS_PERFIS[k]||ACS_PERFIS.outro; return {perfil:k,mods:[...p.mods],locais:[...(p.locais||[])],contar:!!p.contar,receber:!!p.receber,auditar:!!p.auditar,verAud:!!p.verAud,ativo:true}; }
function acsAbrir(id){ const A=S.acs; const d=A.lista.find(x=>x._id===id); A.ed={id,novo:!d,f:d?{perfil:d.perfil||'outro',mods:[...(d.mods||[])],locais:[...(d.locais||[])],contar:!!d.contar,receber:!!d.receber,auditar:!!d.auditar,verAud:!!d.verAud,ativo:d.ativo!==false}:acsPreset('conf')}; A.res=[]; A.busca=''; render(); const e=$('#acs-ed'); if(e) e.scrollIntoView({behavior:'smooth',block:'start'}); }
async function acsGravar(id,f,novo){ const A=S.acs; if(!S.db) return false; const agora=new Date().toISOString(); const ant=A.lista.find(x=>x._id===id);
  const d={perfil:f.perfil,mods:f.mods,locais:f.mods.includes('almox')?f.locais:[],contar:!!f.contar,receber:!!f.receber,auditar:!!f.auditar,verAud:!!f.verAud,ativo:f.ativo!==false,alteradoEm:agora,alteradoPor:S.uid||null,
    liberadoEm:(ant&&ant.liberadoEm)||agora,...(ant&&ant.blocos&&ant.blocos.length?{blocos:ant.blocos}:{}),hist:[...((ant&&ant.hist)||[]).slice(-19),...(ant?[{em:ant.alteradoEm||ant.liberadoEm||null,perfil:ant.perfil||null,mods:ant.mods||[],locais:ant.locais||[],ativo:ant.ativo!==false}]:[])]};
  A.salvando=true; render();
  try{ await S.db.doc('acessos/'+id).set(d); try{ if(A.pedidos.some(p=>p._id===id)) await S.db.doc('pedidos/'+id).delete(); }catch(e){} A.salvando=false; return true; }
  catch(e){ A.salvando=false; erro(e); render(); return false; } }
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="acs-"]'); if(!b||b.disabled) return; const A=S.acs, act=b.dataset.act; if(!A.dono) return;
  if(act==='acs-editar'){ acsAbrir(b.dataset.id); return; }
  if(act==='acs-add'){ acsAbrir(b.dataset.id); if(A.cargo&&A.ed&&A.ed.novo){ A.ed.f=acsPreset(A.cargo); render(); } return; }
  if(act==='acs-criar'){ const id=b.dataset.id; if(!A.cargo){ toast('Escolha o cargo antes.'); $('#acs-cargo')&&$('#acs-cargo').focus(); return; } const ok=await acsGravar(id,acsPreset(A.cargo),true); if(ok){ toast('Acesso criado para '+acsNome(id)+' como '+pnlPerfilNome(A.cargo)+'.'); A.res=[]; A.busca=''; A.buscou=null; render(); } return; }
  if(act==='acs-cv-novo'){ const nome=String(A.busca||'').trim(); if(!nome||!A.cargo) return; const l=[...acsConvs().filter(c=>acsNorm(c.nome)!==acsNorm(nome)),{id:Date.now().toString(36),nome,perfil:A.cargo,em:new Date().toISOString()}]; A.busca=''; A.res=[]; A.buscou=null; await acsConvGravar(l); toast(nome+' pré-cadastrada como '+pnlPerfilNome(A.cargo)+'.'); return; }
  if(act==='acs-cv-x'){ await acsConvGravar(acsConvs().filter(c=>c.id!==b.dataset.id)); return; }
  if(act==='acs-fechar'){ A.ed=null; render(); return; }
  if(act==='acs-perfil'){ const k=b.dataset.v; const at=A.ed.f.ativo; A.ed.f=k==='outro'?Object.assign({},A.ed.f,{perfil:'outro'}):acsPreset(k); A.ed.f.ativo=at; render(); return; }
  if(act==='acs-bloq'){ A.ed.f.ativo=A.ed.f.ativo===false; const ok=await acsGravar(A.ed.id,A.ed.f,false); if(ok){ toast(A.ed.f.ativo===false?'Acesso bloqueado.':'Acesso desbloqueado.'); A.ed=null; render(); } return; }
  if(act==='acs-salvar'){ const f=A.ed.f; if(!f.mods.length){ toast('Marque pelo menos um módulo.'); return; } if(f.mods.includes('almox')&&!f.locais.length){ toast('Marque pelo menos um almoxarifado.'); return; }
    const ok=await acsGravar(A.ed.id,f,A.ed.novo); if(ok){ toast(A.ed.novo?'Acesso liberado para '+acsNome(A.ed.id)+'.':'Acesso atualizado.'); A.ed=null; render(); } return; }
  if(act==='acs-liberar'){ const id=b.dataset.id; const sel=$('#acs-pp-'+CSS.escape(id)); if(!sel||!sel.value){ toast('Escolha o perfil antes de liberar.'); sel&&sel.focus(); return; } const f=acsPreset(sel.value); const cv=acsConvDe(id); const ok=await acsGravar(id,f,true); if(ok){ if(cv) await acsConvGravar(acsConvs().filter(c=>c.id!==cv.id)); toast('Acesso liberado para '+acsNome(id)+'.'); render(); } return; }
  if(act==='acs-recusar'){ const id=b.dataset.id; if(b.dataset.c!=='1'){ b.dataset.c='1'; b.textContent='Confirmar recusa'; return; }
    const f=acsPreset('outro'); f.mods=[]; f.ativo=false; const ok=await acsGravar(id,f,true); if(ok){ toast('Pedido recusado. A pessoa verá “acesso bloqueado”.'); render(); } return; }
});
document.addEventListener('change',ev=>{ const t=ev.target, A=S.acs; if(!A.ed) return; const f=A.ed.f;
  const tg=(arr,v,on)=>on?(arr.includes(v)?arr:[...arr,v]):arr.filter(x=>x!==v);
  if(t.dataset.acsMod){ f.mods=tg(f.mods,t.dataset.acsMod,t.checked); f.perfil='outro'; if(t.dataset.acsMod==='almox'&&t.checked&&!f.locais.length){ f.locais=[...ALX_LOCS]; f.contar=true; } render(); return; }
  if(t.dataset.acsLoc){ f.locais=tg(f.locais,t.dataset.acsLoc,t.checked); f.perfil='outro'; return; }
  if(t.dataset.acsAcao){ f[t.dataset.acsAcao]=t.checked; f.perfil='outro'; return; }
});
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='acs-busca') return; const A=S.acs; A.busca=t.value; const q=t.value.trim(); A.buscou=null;
  if(!S.user){ acsResPinta(); return; } if(q.length<2){ A.res=[]; acsResPinta(); if(!q) acsBuscaPadrao(); return; }
  S.user.search(q).then(r=>{ if(A.busca!==t.value) return; A.res=(r||[]).filter(x=>x.id&&!x.isMe).slice(0,8); (r||[]).forEach(x=>{ if(x.id&&x.name) S.nomes[x.id]=x.name; }); A.buscou=q; acsResPinta(); }); });
function acsBuscaPadrao(){ const A=S.acs; if(!S.user||String(A.busca||'').trim()) return; S.user.search('').then(r=>{ if(String(A.busca||'').trim()) return; A.res=(r||[]).filter(x=>x.id&&!x.isMe).slice(0,8); (r||[]).forEach(x=>{ if(x.id&&x.name) S.nomes[x.id]=x.name; }); acsResPinta(); }); }
document.addEventListener('focusin',ev=>{ if(ev.target.id==='acs-busca') acsBuscaPadrao(); });
document.addEventListener('change',ev=>{ if(ev.target.id!=='acs-cargo') return; S.acs.cargo=ev.target.value; acsResPinta(); });
function acsNorm(t){ return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
function acsConvs(){ const A=S.acs; if(A.cv===undefined&&S.db){ A.cv=null; S.db.doc('config/convites').get().then(s=>{ A.cv=(s.exists&&s.data().l)||[]; rerenderSeguro(); }).catch(()=>{ A.cv=[]; }); } return A.cv||[]; }
function acsConvDe(id){ const n=acsNorm(acsNome(id)); if(!n||n==='pessoa sem nome visivel') return null; return acsConvs().find(c=>{ const ws=acsNorm(c.nome).split(' ').filter(Boolean); return ws.length&&(c.nome.includes('@')?false:ws.every(w=>n.includes(w))); })||null; }
async function acsConvGravar(l){ const A=S.acs; A.cv=l; try{ await S.db.doc('config/convites').set({l,em:new Date().toISOString(),por:S.uid||null}); }catch(e){ erro(e); } render(); }
function acsCargoOpts(sel){ return `<option value="">Cargo / perfil…</option>${Object.keys(pnlCargos()).length?`<optgroup label="Cargos (com painel)">${Object.entries(pnlCargos()).map(([k,v])=>`<option value="${k}">${esc(v.nome)}</option>`).join('')}</optgroup><optgroup label="Perfis antigos">`:''}${Object.entries(ACS_PERFIS).filter(([k])=>k!=='outro').map(([k,v])=>`<option value="${k}">${esc(v.nome)}</option>`).join('')}${Object.keys(pnlCargos()).length?'</optgroup>':''}`.replace(/<option value="([^"]*)">/g,(m,v)=>v&&v===sel?`<option value="${v}" selected>`:m); }
function acsCriarCard(lista){ const A=S.acs, cv=acsConvs();
  return `<section class="card acs-criar" style="border:1.5px solid var(--teal)"><h2>Criar acesso</h2><div class="sub" style="margin:2px 0 12px">Procure a pessoa da Colafix pelo nome ou e-mail, escolha o cargo e crie o acesso. Ela já entra liberada quando abrir o link.</div>
   <div class="acs-cr"><label class="srch" style="max-width:none;margin:0;flex:2 1 260px">${ic('lupa',16,2)}<input class="txt" id="acs-busca" placeholder="Nome ou e-mail da pessoa…" autocomplete="off" value="${esc(A.busca)}"></label>
    <select class="txt" id="acs-cargo" style="height:44px;flex:1 1 200px;width:auto">${acsCargoOpts(A.cargo||'')}</select></div>
   <div id="acs-res">${acsResHtml(lista)}</div>
   ${cv.length?`<div class="label" style="margin:16px 0 6px">PRÉ-CADASTRADAS · ESPERANDO ABRIR O LINK</div>${cv.map(c=>`<div class="acs-row"><div><b>${esc(c.nome)}</b><small>${esc(pnlPerfilNome(c.perfil))} · criado ${c.em?dia(c.em).toLowerCase():''}</small></div><div><button class="lnk" data-act="acs-cv-x" data-id="${esc(c.id)}" style="color:var(--crit-ink)">Remover</button></div></div>`).join('')}<div class="sub" style="font-size:12px;margin:6px 0 0">Quando a pessoa abrir o link, o pedido dela aparece aqui em cima já com o cargo escolhido: é só clicar em Liberar.</div>`:''}
  </section>`; }
function acsResHtml(lista){ const A=S.acs, q=String(A.busca||'').trim(); lista=lista||S.acs.lista.filter(x=>x._id!=='_geral');
  if(!S.user) return '<div class="sub" style="font-size:12.5px;margin:10px 0 0">A busca de pessoas não está disponível nesta visualização.</div>';
  if(A.res.length) return `<div class="acs-res">${A.res.map(r=>{ const ja=lista.find(l=>l._id===r.id); return `<div class="acs-rr"><span><b>${esc(r.name)}</b>${r.email?`<small>${esc(r.email)}</small>`:''}${ja?`<small>já tem acesso · ${esc(pnlPerfilNome(ja.perfil))}</small>`:''}</span>
     ${ja?`<button class="btn sec" data-act="acs-add" data-id="${esc(r.id)}" style="height:36px">Editar</button>`:`<button class="btn sec" data-act="acs-add" data-id="${esc(r.id)}" style="height:36px">Escolher módulos…</button><button class="btn" data-act="acs-criar" data-id="${esc(r.id)}" style="height:36px" ${A.cargo?'':'disabled title="Escolha o cargo ao lado"'}>${ic('check',16,2.2)}Criar acesso</button>`}</div>`; }).join('')}</div>`;
  if(q.length>=2&&A.buscou===q) return `<div class="acs-nada"><div><b>Ninguém da Colafix com “${esc(q)}”.</b><div class="sub" style="font-size:12.5px;margin:2px 0 0">Confira a grafia ou tente o e-mail. Se a pessoa ainda não tem conta no claude.ai da Colafix, deixe o acesso pré-cadastrado: quando ela abrir o link, o pedido já chega com o cargo escolhido.</div></div>
    <button class="btn sec" data-act="acs-cv-novo" ${A.cargo?'':'disabled title="Escolha o cargo ao lado"'}>Pré-cadastrar “${esc(q)}”</button></div>`;
  return ''; }
function acsResPinta(){ const el=$('#acs-res'); if(el) el.innerHTML=acsResHtml(); }
function acsNavVazia(){ const n=$('#navlist'); if(n) n.innerHTML=''; const bn=$('#bottomnav'); if(bn) bn.innerHTML='';
  ['#nav-ajustes','#mob-aj','#tvbtn'].forEach(s=>{ const e=$(s); if(e) e.hidden=true; }); const c=$('#crumb'); if(c) c.innerHTML='<b>Painel de Operação</b>';
  const mb=$('#mob-brand .mob-mod'); if(mb) mb.hidden=true; }
function acsNavAjusta(){ const a=viewOk('ajustes'); ['#nav-ajustes','#mob-aj'].forEach(s=>{ const e=$(s); if(e) e.hidden=!a; }); const t=$('#tvbtn'); if(t) t.hidden=!viewOk('tvfab'); const mb=$('#mob-brand .mob-mod'); if(mb) mb.hidden=false; }

// ================= ALMOXARIFADO (módulo; veio do app "Gestão de Almoxarifado") =================
// Contagem (conferência física), Conferências (histórico), Recebimento e Auditoria de estoque.
// Cadastro: itens/<código>.almox = {locais:[a3,a30,rej,sep,a1,a2], un, conv, grupos:[...]}
// Coleções: conferencias, auditorias, recebimentos, alxfila (auditoria aberta/descartada por linha).
Object.assign(VIEWS,{alxcont:{nome:'Contagem',ic:'lista',mob:'Contagem'},alxconf:{nome:'Conferências',ic:'folha',mob:'Conferências'},alxrec:{nome:'Recebimento',ic:'caixa',mob:'Receber'},alxaud:{nome:'Auditoria',ic:'check',mob:'Auditoria'}});
Object.assign(CRUMB,{alxcont:'Contagem',alxconf:'Conferências',alxrec:'Recebimento de material',alxaud:'Auditoria de estoque',acessos:'Acessos'});
MODS.push({id:'almox',nome:'Inventário',ic:'caixa',views:['alxcont','alxconf','alxrec','alxaud']});

// ================= PREMIX (ficha de produção do premix para o almox · 01/10) =================
// Traz para o painel o programa "Ficha de Produção" (receitas de premix, ficha impressa, apontamentos e saldo).
// Quantidade da ficha = número de premix (ex.: 4 AC3). Total de cada matéria-prima = nº de premix × quantidade por premix da receita.
S.pmx={rec:[],fichas:[],baixas:[],mats:[],ed:null,red:null,busca:'',st:'abertas',conf:null,imp:null,usar:null,impLendo:false};
Object.assign(VIEWS,{pmxfichas:{nome:'Fichas',ic:'folha',mob:'Fichas'},pmxrec:{nome:'Receitas',ic:'premix',mob:'Receitas'},pmxest:{nome:'Saldo',ic:'caixa',mob:'Saldo'}});
Object.assign(CRUMB,{pmxfichas:'Fichas de produção do premix',pmxrec:'Receitas de premix',pmxest:'Saldo de premix'});
MODS.push({id:'premix',nome:'Almoxarifado',ic:'premix',views:['pmxfichas','pmxrec']});
ACS_MODS.splice(ACS_MODS.findIndex(m=>m[0]==='ajustes'),0,['premix','Almoxarifado (fichas e receitas de premix)']);
if(ACS_PERFIS.pcp&&!ACS_PERFIS.pcp.mods.includes('premix')) ACS_PERFIS.pcp.mods.push('premix');

const PMX_UN=['g','Kg','Und','Metro'], PMX_TURNOS=['Manhã','Tarde','Noite'], PMX_BATELADAS=[500,1000,1500,2000];