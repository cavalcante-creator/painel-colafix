/* Painel Colafix · 23-producao.js — módulo da Produção no visual novo (protótipo aprovado "Produção organizada").
   Só aparência e organização: nenhuma função sai. Telas novas: Painel da produção (prodpainel) e Indicadores (prodind,
   com relatório do mês). Paradas ganham um resumo em cima da tela de hoje (que continua inteira). Programação: só estilo. */
"use strict";
S.pi=S.pi||{cp:hojeStr().slice(0,7)};
const pdMin=(a,b)=>{ const x=new Date(a).getTime(), y=new Date(b||new Date().toISOString()).getTime(); return isFinite(x)&&isFinite(y)&&y>x?(y-x)/6e4:0; };
const pdHrs=m=>m<60?Math.round(m)+' min':(Math.round(m/6)/10).toLocaleString('pt-BR',{maximumFractionDigits:1})+' h';
const pdMes=cp=>{ const [y,m]=cp.split('-'); return ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][+m-1]+' de '+y; };
const pdK=(v,r,c,s)=>`<div class="mo-k"><b class="${c||''}">${v}</b><span>${r}</span>${s?`<small>${s}</small>`:''}</div>`;
function pdBarras(t,xs,cor,fmt,nota){ const mx=Math.max(1,...xs.map(x=>x[1])); return `<section class="card mo-c"><h2>${t}</h2>${xs.length?xs.map(([n,v,mk])=>`<div class="mo-b"><span>${esc(n)}</span><div style="position:relative"><i style="width:${Math.min(100,v/mx*100).toFixed(0)}%;background:${cor}"></i>${mk!=null?`<em class="pd-mk" style="left:${Math.min(100,mk/mx*100).toFixed(0)}%"></em>`:''}</div><b>${fmt?fmt(v):v}</b></div>`).join(''):'<div class="empty">Sem dados.</div>'}${nota?`<div class="sub" style="margin:6px 0 0">${nota}</div>`:''}</section>`; }
function pdParadasMes(cp){ const xs=(S.paradas||[]).filter(p=>p.inicio&&String(hojeStr(new Date(p.inicio))).slice(0,7)===cp), porM={}, porL={}; let tot=0;
  xs.forEach(p=>{ const m=pdMin(p.inicio,p.fim); tot+=m; porM[p.motivo||'Sem motivo']=(porM[p.motivo||'Sem motivo']||0)+m; porL[p.linha||'—']=(porL[p.linha||'—']||0)+m; });
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,6); return {n:xs.length,tot,porM:top(porM),porL:top(porL)}; }

/* ---------- Painel da produção ---------- */
function vProdPainel(){ const h=hojeStr(), an=anuladas(); let totE=0,totP=0,atr=[],ranP=0; const linhas=[], prox=[];
  linhasOrd().forEach(l=>{ const xs=corLista(l,h), par=(S.paradas||[]).find(p=>p.linha===l&&!p.fim), pend=x=>x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueDe(x));
    const ents=(S.entregas||[]).filter(e=>!e.anula&&!an.has(e._id)&&e.em&&e.linha===l&&hojeStr(new Date(e.em))===h), entH=ents.reduce((a,e)=>a+(+e.qtd||0),0), ult=ents.reduce((a,e)=>e.em>a?e.em:a,'');
    const ini=new Date(h+'T00:00:00').toISOString(), prog=xs.reduce((a,x)=>a+(x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueAte(x,ini))),0); totE+=entH; totP+=prog;
    const ab=xs.filter(x=>pend(x)>0), cur=ab[0], at=xs.some(x=>!x._pv&&ordAtras(x,h)&&pend(x)>0); if(at) atr.push(l);
    xs.forEach(x=>{ if(!x._pv){ const m=tvMat(x); if(m&&!/linha/.test(m.t)) ranP++; } }); if(ab[1]) prox.push({l,x:ab[1],q:pend(ab[1])});
    const setup=par&&/setup|troca|limpez/i.test(par.motivo||''), st=par?(setup?{k:'info',t:'Setup · '+(par.motivo||'')}:{k:'crit',t:'Parada · '+(par.motivo||'sem motivo')}):!xs.length?{k:'neu',t:'Nada programado'}:!ab.length?{k:'neu',t:'Tudo produzido'}:at?{k:'warn',t:'Atrasada'}:{k:'ok',t:'Produzindo'};
    const e=cur?(cur._pv?0:entregueDe(cur)):0, tot=cur?(cur._pv?(+cur.qtd||0):(+cur.total||0)):0, velho=ult&&!par&&ab.length&&pdMin(ult)>90;
    linhas.push(`<div class="pd-ln"><div><b>${esc(l)}</b><span class="pill ${st.k==='neu'?'':st.k}">${esc(st.t)}</span></div><div class="pd-o">${cur?`<div class="pd-on">${esc(codigoDe(cur))} · ${esc(String(cur.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,''))}</div><div class="pd-bar"><i class="${st.k}" style="width:${tot?Math.min(100,e/tot*100):0}%"></i></div>`:'<div class="sub" style="margin:0">—</div>'}</div><b class="pd-q">${cur?f0(e)+' de '+f0(tot)+' '+esc(uA(cur)):''}</b><small class="${velho?'warn':''}">${ult?'último apont. '+hm(ult):'sem apontamento hoje'}</small></div>`); });
  let pm=null; try{ const D=ritDados(h.slice(0,7),S.rit.fonte); if(D){ const k=ritStats(D,{}); pm={p:k.T?Math.round(k.ra/k.T*100):0,du:k.du,n:k.n}; } }catch(e){}
  const pas=(S.paradas||[]).filter(p=>!p.fim), abertas=(S.ordens||[]).filter(o=>o.status==='aberta').length;
  const parH=pas.length?pas.map(p=>`<div class="mo-ln2"><div><b>${esc(p.linha||'')}</b> · ${esc(p.motivo||'sem motivo')}<small>desde ${hm(p.inicio)}${p.os?' · OS '+manNum(p.os)+' na manutenção':''}</small></div><span class="pill ${/setup|troca|limpez/i.test(p.motivo||'')?'info':'crit'}">${pdHrs(pdMin(p.inicio))}</span></div>`).join(''):'<div class="sub">Nenhuma linha parada.</div>';
  const proxH=prox.length?prox.slice(0,6).map(o=>{ const m=o.x._pv?null:tvMat(o.x); return `<div class="mo-ln2"><div><b>${esc(o.x._pv?(o.x.codigo||codigoDe(o.x)):codigoDe(o.x))}</b> · ${f0(o.q)}<small>${esc(o.l)} · a seguir</small></div>${m?`<span class="pill ${/linha/.test(m.t)?'ok':/separ|caminho/.test(m.t)?'':'warn'}">${esc(m.t)}</span>`:''}</div>`; }).join(''):'<div class="sub">Sem próximas ordens hoje.</div>';
  return `<div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Painel da produção</h1><div class="sub">${esc(new Date(h+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))} · como está o dia, pelos apontamentos</div></div><div class="actions"><button class="btn sec" data-go="programacao">Programação</button><button class="btn" data-go="paradas">Paradas</button></div></div>
    <div class="mo-ks">${pdK((totP?Math.round(totE/totP*100):0)+'%','Produzido hoje','',f0(totE)+' de '+f0(totP)+' programados')}${pdK(abertas,'Ordens abertas')}${pdK(atr.length,'Atrasadas',atr.length?'warn':'',atr.slice(0,2).join(' e '))}${pdK(pas.filter(p=>!/setup|troca|limpez/i.test(p.motivo||'')).length,'Linha parada',pas.length?'crit':'',pas[0]?esc(pas[0].linha+' · '+(pas[0].motivo||'')):'')}${pdK(ranP,'Ranchos pendentes',ranP?'warn':'')}${pm?pdK(pm.p+'%','Meta do mês','','dia útil '+pm.du+' de '+pm.n):''}</div>
    <div class="mo-g"><section class="card mo-c"><div class="mo-h"><h2>Linhas agora</h2><button class="lnk" data-go="programacao">Abrir a programação</button></div>${linhas.join('')}</section>
      <div class="mo-col"><section class="card mo-c"><div class="mo-h"><h2>Paradas abertas</h2><button class="lnk" data-go="paradas">Ver paradas</button></div>${parH}</section><section class="card mo-c"><h2>Próximas ordens</h2>${proxH}</section></div></div>`; }

/* ---------- Indicadores da produção ---------- */
function pdInd(cp){ let D=null; try{ D=ritDados(cp,S.rit.fonte); }catch(e){} const P=pdParadasMes(cp); if(!D) return {D:null,P};
  const k=ritStats(D,{}), ef=k.T?k.pa/k.T*100:0, LS=D.LS.filter(l=>ritStats(D,{l}).T>0), porL=LS.map(l=>{ const kl=ritStats(D,{l}); return [l,kl.T?Math.round(kl.ra/kl.T*100):0,Math.round(ef)]; });
  const dias=(k.s||[]).filter(x=>!D.cut||x.d<=D.cut).map(x=>[dm(x.d),x.r,x.p]);
  const conc=(S.ordens||[]).filter(o=>o.status!=='aberta'&&String(o.data||'').slice(0,7)===cp).length;
  return {D,P,k,ef,porL,dias,conc}; }
function vProdInd(){ const cp=S.pi.cp, X=pdInd(cp), meses=[...Array(12)].map((_,i)=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7); });
  const cab=`<div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Indicadores da produção</h1><div class="sub">O mês em números: meta, produção por dia, ordens e paradas</div></div><div class="actions"><label class="sub" style="margin:0">Mês <select class="txt" id="pd-mes" style="width:auto">${meses.map(m=>`<option value="${m}" ${m===cp?'selected':''}>${pdMes(m)}</option>`).join('')}</select></label><button class="btn" data-act="pd-pdf">Relatório do mês (PDF)</button><button class="btn sec" data-go="indicadores">Indicadores (detalhado)</button></div></div>`;
  if(!X.D) return cab+'<section class="card"><div class="empty">Sem previsão do mês carregada ainda.</div></section>';
  const k=X.k, p=k.T?Math.round(k.ra/k.T*100):0, U=ritU(), Q=v=>ritQ(v,k.kg);
  const dmx=Math.max(1,...X.dias.map(d=>Math.max(d[1],d[2])));
  return cab+`<div class="mo-ks">${pdK(p+'%','Da meta do mês',p>=X.ef?'ok':p>=X.ef*0.8?'warn':'crit','dia útil '+k.du+' de '+k.n+' · deveria '+Math.round(X.ef)+'%')}${pdK(Q(k.ra)+' '+U,'Produzido no mês')}${pdK(X.conc,'Ordens concluídas no mês')}${pdK(pdHrs(X.P.tot),'Tempo parado','crit',X.P.porM[0]?esc(X.P.porM[0][0])+': '+pdHrs(X.P.porM[0][1]):'')}${pdK(Q(k.du?k.ra/k.du:0),'Média por dia','',k.sal>0?'precisa '+Q(k.need)+'/dia':'meta batida')}</div>
    <div class="mo-g2">${pdBarras('Meta do mês por linha',X.porL,'var(--teal,#2B6A87)',v=>v+'%','Barra: feito da meta · ▮ onde deveria estar hoje')}
      <section class="card mo-c"><h2>Produzido por dia</h2><div class="pd-dias">${X.dias.map(([d,r,m])=>`<div title="${d}: ${Q(r)} de ${Q(m)}"><b>${Q(r)}</b><i class="${r>=m?'ok':'warn'}" style="height:${(r/dmx*120).toFixed(0)}px"></i><span>${d.slice(0,2)}</span></div>`).join('')}</div><div class="sub" style="margin:6px 0 0">Verde: bateu a meta do dia · âmbar: abaixo</div></section>
      ${pdBarras('Tempo parado por motivo',X.P.porM,'var(--warn,#AD8432)',pdHrs)}${pdBarras('Tempo parado por linha',X.P.porL,'var(--crit,#B5473F)',pdHrs)}</div>`; }
function pdRelatorio(){ const cp=S.pi.cp, X=pdInd(cp); if(!X.D) return toast('Sem previsão do mês para o relatório.'); const k=X.k, Q=v=>ritQ(v,k.kg), U=ritU(), tab=(t,xs,f)=>`<h2>${t}</h2><table>${xs.map(r=>`<tr><td>${esc(r[0])}</td><td style="text-align:right">${f?f(r[1]):r[1]}</td></tr>`).join('')||'<tr><td>Sem dados.</td></tr>'}</table>`;
  const w=window.open('','_blank'); if(!w) return toast('O navegador bloqueou a janela do relatório. Permita janelas deste site.');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Produção · ${pdMes(cp)}</title><style>@page{size:A4;margin:16mm}body{font-family:Archivo,'Segoe UI',Arial,sans-serif;color:#1C2B33}h1{margin:0 0 4px;font-size:22px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #DDE3E8;padding-bottom:4px}.k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.k div{border:1px solid #DDE3E8;border-radius:8px;padding:8px 10px}.k b{display:block;font-size:20px}.k small{color:#5E6E77}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:5px 4px;border-bottom:1px solid #EDF1F4}</style></head><body>
    <h1>Relatório da produção · ${pdMes(cp)}</h1><div style="color:#5E6E77;font-size:13px">Colafix · gerado em ${new Date().toLocaleString('pt-BR')} · pelos apontamentos e pela previsão do mês</div>
    <div class="k"><div><b>${k.T?Math.round(k.ra/k.T*100):0}%</b><small>da meta (deveria ${Math.round(X.ef)}%)</small></div><div><b>${Q(k.ra)} ${U}</b><small>produzido</small></div><div><b>${X.conc}</b><small>ordens concluídas</small></div><div><b>${pdHrs(X.P.tot)}</b><small>tempo parado</small></div></div>
    ${tab('Meta por linha (% feito)',X.porL,v=>v+'%')}${tab('Produzido por dia',X.dias,v=>Q(v)+' '+U)}${tab('Tempo parado por motivo',X.P.porM,pdHrs)}${tab('Tempo parado por linha',X.P.porL,pdHrs)}
    <script>setTimeout(()=>print(),400)<\/script></body></html>`); w.document.close(); }

/* ---------- Paradas: resumo em cima da tela de hoje (que continua inteira) ---------- */
function pdResumoParadas(){ const h=hojeStr(), P=pdParadasMes(h.slice(0,7)), ag=(S.paradas||[]).filter(p=>!p.fim), hoje=(S.paradas||[]).filter(p=>p.inicio&&hojeStr(new Date(p.inicio))===h).reduce((a,p)=>a+pdMin(p.inicio,p.fim),0);
  return `<div class="mo-ks" style="margin-top:4px">${pdK(ag.length,'Paradas agora',ag.length?'crit':'',ag.slice(0,2).map(p=>esc(p.linha)).join(' · '))}${pdK(pdHrs(hoje),'Tempo parado hoje','warn','todas as linhas')}${pdK(pdHrs(P.tot),'Tempo parado no mês')}${pdK(P.porM[0]?esc(P.porM[0][0]):'—','Motivo que mais para','',P.porM[0]?pdHrs(P.porM[0][1])+' no mês':'')}</div>
    <div class="mo-g2" style="margin-bottom:16px">${pdBarras('Tempo parado por motivo (mês)',P.porM,'var(--warn,#AD8432)',pdHrs)}${pdBarras('Tempo parado por linha (mês)',P.porL,'var(--crit,#B5473F)',pdHrs)}</div>`; }

/* ---------- registro ---------- */
VIEWS.prodpainel={nome:'Painel',ic:'grid',mob:'Painel'}; VIEWS.prodind={nome:'Indicadores',ic:'grafico',mob:'Indic.'}; if(VIEWS.indicadores) VIEWS.indicadores.nome='Indicadores (detalhado)';
Object.assign(CRUMB,{prodpainel:'Painel da produção',prodind:'Indicadores da produção'});
S.extViews=S.extViews||{}; Object.assign(S.extViews,{prodpainel:vProdPainel,prodind:vProdInd,paradas:()=>{ const v=vParadas(); const i=v.indexOf('</div>',v.indexOf('class="head"')); return v; }});
/* paradas: o resumo entra logo depois do cabeçalho da tela de hoje */
S.extViews.paradas=()=>{ const v=vParadas(), m=v.match(/^([\s\S]*?class="head"[\s\S]*?<\/div>\s*<\/div>)/); return m?m[1]+pdResumoParadas()+v.slice(m[1].length):pdResumoParadas()+v; };
function pdOrdena(){ const M=MODS.find(x=>x.id==='producao'); if(!M) return; ['prodpainel','prodind'].forEach(v=>{ if(!M.views.includes(v)) M.views.push(v); });
  const ordem=['prodpainel','programacao','calendario','ranchos','diario','paradas','prodind','indicadores']; M.views=ordem.filter(v=>M.views.includes(v)).concat(M.views.filter(v=>!ordem.includes(v))); }
pdOrdena(); setTimeout(pdOrdena,0); setTimeout(pdOrdena,1500);
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='pd-mes'){ S.pi.cp=ev.target.value; render(); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="pd-pdf"]'); if(b) pdRelatorio(); });
document.head.insertAdjacentHTML('beforeend',`<style id="pd-css">
.pd-ln{display:grid;grid-template-columns:200px minmax(0,1.6fr) minmax(0,.9fr) auto;gap:14px;align-items:center;padding:11px 0;border-top:1px solid var(--line)}.pd-ln>div:first-child{display:flex;flex-direction:column;gap:4px;align-items:flex-start}.pd-ln>div:first-child b{font-weight:600}
.pd-on{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pd-bar{height:8px;border-radius:4px;background:var(--surface-2);margin-top:6px}.pd-bar i{display:block;height:100%;border-radius:4px;background:var(--ok)}.pd-bar i.warn{background:var(--warn)}.pd-bar i.crit{background:var(--crit)}.pd-bar i.info{background:var(--teal)}.pd-bar i.neu{background:#8A979F}
.pd-q{font-size:14px;font-weight:600}.pd-ln small{font-size:12.5px;color:var(--muted);white-space:nowrap}.pd-ln small.warn{color:var(--warn-ink);font-weight:600}
.pd-mk{position:absolute;top:-4px;bottom:-4px;width:3px;border-radius:2px;background:var(--ink)}
.pd-dias{display:flex;align-items:flex-end;gap:6px;height:160px;padding-top:8px;overflow-x:auto}.pd-dias>div{flex:1;min-width:22px;display:flex;flex-direction:column;align-items:center;gap:4px}.pd-dias b{font-size:11px;font-weight:600}.pd-dias i{width:100%;border-radius:5px 5px 0 0;min-height:2px;background:var(--ok)}.pd-dias i.warn{background:var(--warn)}.pd-dias span{font-size:11px;color:var(--muted)}
@media (max-width:980px){.pd-ln{grid-template-columns:1fr}}
/* Programação: só estilo (os botões, o arrastar e as planejadas continuam os mesmos) */
.ord-card .orow{border-radius:10px;transition:background .15s}.ord-card .orow:hover{background:var(--surface-2)}
.ord-card .ohead{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.ofil{gap:8px}
</style>`);
/* ===FIM PRODUÇÃO=== */
