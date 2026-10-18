/* Painel Colafix · 22-manut.js — módulo da Manutenção organizado (protótipo aprovado "Manutenção organizada").
   Telas novas: Painel (o dia), Indicadores (diretoria + relatório do mês em PDF + TV) e Configurações (listas e opções).
   Menu: Painel · Chamados · Preventivas · Máquinas · Peças · Pessoas e crachás · Indicadores · Configurações · (apoio). */
"use strict";
S.mi=S.mi||{cp:hojeStr().slice(0,7)};
const mzMin=(a,b)=>{ const x=new Date(a).getTime(), y=new Date(b).getTime(); return isFinite(x)&&isFinite(y)&&y>x?(y-x)/6e4:null; };
const mzDur=m=>m==null?'—':m<60?Math.round(m)+' min':Math.floor(m/60)+' h'+(Math.round(m%60)?' '+String(Math.round(m%60)).padStart(2,'0'):'');
const mzHrs=m=>(Math.round(m/6)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' h';
function mzDados(cp){ const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido), doMes=xs.filter(c=>{ const e=manEtapas(c); return e.ab&&String(hojeStr(new Date(e.ab.em))).slice(0,7)===cp; });
  const esp=[], rep=[], porL={}, porM={}, porC={}, sem=[0,0,0,0,0]; let parado=0;
  doMes.forEach(c=>{ const e=manEtapas(c), ab=e.ab&&e.ab.em, as=e.as&&e.as.em, co=e.co&&e.co.em;
    const w=Math.min(4,Math.floor((+String(hojeStr(new Date(ab))).slice(8)-1)/7)); sem[w]++;
    if(ab&&as){ const m=mzMin(ab,as); if(m!=null) esp.push(m); } if(co){ const m=mzMin(as||ab,co); if(m!=null) rep.push(m); }
    if(c.impacto==='parou'){ const fim=c.liberadoEm||co||new Date().toISOString(), m=mzMin(ab,fim); if(m!=null){ parado+=m; porL[c.linha||'—']=(porL[c.linha||'—']||0)+m; } }
    if(c.equip) porM[c.equip]=(porM[c.equip]||0)+1; const ca=c.exec&&c.exec.causa; if(ca) porC[ca]=(porC[ca]||0)+1; });
  const med=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null, top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return {n:doMes.length,esp:med(esp),rep:med(rep),parado,porL:top(porL),porM:top(porM),porC:top(porC),sem}; }
const mzMesAnt=cp=>{ const [y,m]=cp.split('-').map(Number); return m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0'); };
const mzMesNome=cp=>{ const [y,m]=cp.split('-'); return ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][+m-1]+' de '+y; };
function mzKpi(v,r,c,sub){ return `<div class="mo-k"><b class="${c||''}">${v}</b><span>${r}</span>${sub?`<small>${sub}</small>`:''}</div>`; }
function mzBarras(t,xs,cor,fmt){ const mx=Math.max(1,...xs.map(x=>x[1])); return `<section class="card mo-c"><h2>${t}</h2>${xs.length?xs.map(([n,v])=>`<div class="mo-b"><span>${esc(n)}</span><div><i style="width:${(v/mx*100).toFixed(0)}%;background:${cor}"></i></div><b>${fmt?fmt(v):v}</b></div>`).join(''):'<div class="empty">Sem dados no mês.</div>'}</section>`; }

/* ---------- Painel do dia ---------- */
function vManHoje(){ const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido), ab=xs.filter(c=>!manFechada(c)), h=hojeStr();
  const par=ab.filter(c=>c.impacto==='parou'&&!(c.exec&&c.exec.tecnico)), exe=ab.filter(c=>c.exec&&c.exec.tecnico), conc=xs.filter(c=>{ const e=manEtapas(c); return e.co&&hojeStr(new Date(e.co.em))===h; });
  const D=mzDados(h.slice(0,7)); let pvs=[], pcs=[]; try{ pvs=mxPrevStatus().filter(o=>['atrasada','hoje','semana'].includes(o.st)); }catch(e){} try{ pcs=mxPecasCat().filter(p=>+p.min>0&&+p.saldo<+p.min); }catch(e){}
  const ord=ab.slice().sort((a,b)=>(a.impacto==='parou'&&!(a.exec&&a.exec.tecnico)?0:1)-(b.impacto==='parou'&&!(b.exec&&b.exec.tecnico)?0:1)||String(a.criado||'').localeCompare(String(b.criado||'')));
  const st=c=>c.exec&&c.exec.tecnico?{k:'info',t:'Em conserto · '+esc(String(c.exec.tecnico).split(' ')[0])}:/pe[cç]a/i.test(c.status||'')?{k:'warn',t:'Aguardando peça'}:c.impacto==='parou'?{k:'crit',t:'Máquina parada · aguardando técnico'}:{k:'warn',t:'Aguardando técnico'};
  const lista=ord.length?ord.map(c=>{ const s=st(c), e=manEtapas(c); return `<div class="mo-ln"><b>OS ${manNum(c.numero)}</b><div><b>${esc(c.linha||'')}</b> · ${esc(c.equip||'')}<small>aberto ${e.ab?hm(e.ab.em):''}${c.nome?' por '+esc(c.nome):''}</small></div><div>${esc(c.defeito||'')}</div><span class="pill ${s.k}">${s.t}</span></div>`; }).join(''):'<div class="empty">Nenhum chamado aberto. Tudo funcionando.</div>';
  const linhas=linhasOrd().map(l=>{ const e=typeof cqEstado==='function'?cqEstado(l):{c:'ok',t:'Funcionando'}; return `<div class="mo-li ${e.c}"><i></i><b>${esc(l)}</b><span>${esc(e.t)}</span></div>`; }).join('');
  const prev=pvs.length?pvs.slice(0,6).map(o=>`<div class="mo-ln2"><div><b>${esc((o.e&&o.e.nome)||o.p.equip||'Máquina')}</b><small>${esc((o.e&&o.e.linha)||'')} · ${esc(o.p.desc||o.p.nome||'preventiva')}</small></div><span class="pill ${o.st==='atrasada'?'crit':'warn'}">${o.st==='atrasada'?'atrasada':o.st==='hoje'?'hoje':'até '+dm(o.p.prox)}</span></div>`).join(''):'<div class="sub">Nenhuma preventiva para esta semana.</div>';
  return `<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Painel da manutenção</h1><div class="sub">${esc(new Date(h+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))} · o que precisa de atenção agora</div></div></div>
    <div class="mo-ks">${mzKpi(ab.length,'Chamados abertos')}${mzKpi(par.length,'Máquina parada',par.length?'crit':'',par[0]?esc(par[0].linha+' · '+(par[0].equip||'')):'')}${mzKpi(exe.length,'Em conserto','info')}${mzKpi(conc.length,'Concluídos hoje','ok')}${mzKpi(mzDur(D.rep),'Tempo médio de conserto','','no mês')}${mzKpi(pvs.length,'Preventivas da semana',pvs.some(o=>o.st==='atrasada')?'crit':pvs.length?'warn':'')}${mzKpi(pcs.length,'Peças abaixo do mínimo',pcs.length?'warn':'',pcs[0]?esc(pcs[0].desc||pcs[0].cod):'')}</div>
    <div class="mo-g"><section class="card mo-c"><div class="mo-h"><h2>Agora</h2><button class="lnk" data-go="manch">Ver todos os chamados</button></div>${lista}</section>
      <div class="mo-col"><section class="card mo-c"><h2>Linhas</h2><div class="mo-lis">${linhas}</div></section><section class="card mo-c"><div class="mo-h"><h2>Preventivas da semana</h2><button class="lnk" data-go="manprev">Abrir preventivas</button></div>${prev}</section></div></div>`; }

/* ---------- Indicadores (diretoria) ---------- */
function vManInd(){ const cp=S.mi.cp, D=mzDados(cp), A=mzDados(mzMesAnt(cp)), cmp=(a,b,menor)=>b==null||a==null||!b?'':`${mzMesNome(mzMesAnt(cp)).split(' ')[0]}: ${typeof b==='number'&&b>200?mzDur(b):b}`;
  const meses=[...Array(12)].map((_,i)=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7); });
  return `<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Indicadores da manutenção</h1><div class="sub">O mês em números, pelos chamados registrados, com comparação ao mês anterior</div></div>
      <div class="actions"><label class="sub" style="margin:0">Mês <select class="txt" id="mz-mes" style="width:auto">${meses.map(m=>`<option value="${m}" ${m===cp?'selected':''}>${mzMesNome(m)}</option>`).join('')}</select></label><button class="btn" data-act="mz-pdf">Relatório do mês (PDF)</button><button class="btn sec" data-act="mz-tv">Mostrar na TV</button></div></div>
    <div class="mo-ks">${mzKpi(D.n,'Chamados no mês','',A.n?mzMesNome(mzMesAnt(cp)).split(' ')[0]+': '+A.n:'')}${mzKpi(mzDur(D.rep),'Tempo médio de conserto','',A.rep!=null?'antes: '+mzDur(A.rep):'')}${mzKpi(mzHrs(D.parado),'Máquina parada','crit','chamados com máquina parada')}${mzKpi(mzDur(D.esp),'Espera até o técnico chegar','warn',A.esp!=null?'antes: '+mzDur(A.esp):'')}</div>
    <div class="mo-g2">${mzBarras('Horas de máquina parada por linha',D.porL,'var(--crit,#B5473F)',mzHrs)}${mzBarras('Máquinas que mais param',D.porM,'var(--teal,#2B6A87)')}${mzBarras('Causas mais comuns',D.porC,'var(--warn,#AD8432)')}
      <section class="card mo-c"><h2>Chamados por semana</h2><div class="mo-sem">${D.sem.map((v,i)=>`<div><b>${v}</b><i style="height:${(v/Math.max(1,...D.sem)*110).toFixed(0)}px"></i><span>sem ${i+1}</span></div>`).join('')}</div></section></div>`; }
function mzRelatorio(){ const cp=S.mi.cp, D=mzDados(cp), A=mzDados(mzMesAnt(cp)), tab=(t,xs,f)=>`<h2>${t}</h2><table>${xs.map(([n,v])=>`<tr><td>${esc(n)}</td><td style="text-align:right">${f?f(v):v}</td></tr>`).join('')||'<tr><td>Sem dados.</td></tr>'}</table>`;
  const w=window.open('','_blank'); if(!w) return toast('O navegador bloqueou a janela do relatório. Permita janelas deste site.');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manutenção · ${mzMesNome(cp)}</title><style>@page{size:A4;margin:16mm}body{font-family:Archivo,'Segoe UI',Arial,sans-serif;color:#1C2B33}h1{margin:0 0 4px;font-size:22px}h2{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #DDE3E8;padding-bottom:4px}.k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.k div{border:1px solid #DDE3E8;border-radius:8px;padding:8px 10px}.k b{display:block;font-size:20px}.k small{color:#5E6E77}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:5px 4px;border-bottom:1px solid #EDF1F4}</style></head><body>
    <h1>Relatório da manutenção · ${mzMesNome(cp)}</h1><div style="color:#5E6E77;font-size:13px">Colafix · gerado em ${new Date().toLocaleString('pt-BR')} · pelos chamados registrados no painel</div>
    <div class="k"><div><b>${D.n}</b><small>chamados (antes: ${A.n})</small></div><div><b>${mzDur(D.rep)}</b><small>conserto médio (antes: ${mzDur(A.rep)})</small></div><div><b>${mzHrs(D.parado)}</b><small>máquina parada (antes: ${mzHrs(A.parado)})</small></div><div><b>${mzDur(D.esp)}</b><small>espera até o técnico (antes: ${mzDur(A.esp)})</small></div></div>
    ${tab('Horas de máquina parada por linha',D.porL,mzHrs)}${tab('Máquinas que mais param (chamados)',D.porM)}${tab('Causas mais comuns',D.porC)}${tab('Chamados por semana',D.sem.map((v,i)=>['Semana '+(i+1),v]))}
    <script>setTimeout(()=>print(),400)<\/script></body></html>`); w.document.close(); }

/* ---------- Indicadores na TV ---------- */
function vTvnManInd(){ const cp=hojeStr().slice(0,7), D=mzDados(cp), A=mzDados(mzMesAnt(cp)), bar=(t,xs,cor,f)=>{ const mx=Math.max(1,...xs.map(x=>x[1])); return `<section class="tvn-card"><h2 style="margin:0;font-size:28px">${t}</h2>${xs.length?xs.slice(0,5).map(([n,v])=>`<div class="mzt-b"><span>${esc(n)}</span><div><i style="width:${(v/mx*100).toFixed(0)}%;background:${cor}"></i></div><b>${f?f(v):v}</b></div>`).join(''):'<div class="tvn-vz">Sem dados no mês.</div>'}</section>`; };
  const dif=(a,b)=>a==null||b==null?'—':(a<=b?'−':'+')+mzDur(Math.abs(a-b));
  return tvnPagina('tvn-mzi',tvnCab('Manutenção · '+mzMesNome(cp).split(' ')[0],'Pelos chamados registrados no computador de chamados',tvnStat(D.n,'CHAMADOS NO MÊS')+tvnStat(mzDur(D.rep),'CONSERTO MÉDIO')+tvnStat(mzHrs(D.parado),'MÁQUINA PARADA','crit')+tvnStat(mzDur(D.esp),'ESPERA DO TÉCNICO','warn'),''),
    `<div class="tvn-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))">${bar('Horas paradas por linha',D.porL,'var(--crit)',mzHrs)}${bar('Máquinas que mais param',D.porM,'var(--info)')}${bar('Causas mais comuns',D.porC,'var(--warn)')}
      <section class="tvn-card"><h2 style="margin:0;font-size:28px">Comparado ao mês anterior</h2><div class="mzt-cmp"><div class="${D.n<=A.n?'ok':'crit'}"><span>Chamados</span><b>${A.n} → ${D.n}</b></div><div class="${(D.rep||0)<=(A.rep||0)?'ok':'crit'}"><span>Conserto médio</span><b>${dif(D.rep,A.rep)}</b></div></div></section></div>`,''); }

/* ---------- Configurações ---------- */
function vManCfg(){ const adm=dbMaster(), defs=(S.cfg.manDefeitos&&S.cfg.manDefeitos.length?S.cfg.manDefeitos:TT_DEFEITOS), caus=(S.cfg.manCausas&&S.cfg.manCausas.length?S.cfg.manCausas:MZ_CAUSAS);
  const lst=(id,t,xs,sub)=>`<section class="card mo-c"><h2>${t}</h2><div class="sub" style="margin:2px 0 8px">${sub}</div><textarea class="txt" id="${id}" rows="9" ${adm?'':'disabled'} style="font-family:inherit">${esc(xs.join('\n'))}</textarea></section>`;
  return `<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Configurações</h1><div class="sub">Listas e opções do computador de chamados. Uma opção por linha.</div></div>${adm?'<div class="actions"><button class="btn" data-act="mz-cfgok">Salvar</button></div>':''}</div>
    <div class="mo-g2">${lst('mz-defs','Defeitos (o que aconteceu)',defs,'Aparecem para o gestor ao abrir o chamado.')}${lst('mz-caus','Causas (o que causou)',caus,'O técnico escolhe uma ao terminar o conserto. Mudar os nomes muda os indicadores daqui para a frente.')}
      <section class="card mo-c"><h2>Computador de chamados</h2><label class="ck"><input type="checkbox" id="mz-libtec" ${S.cfg.manLiberaTecnico===false?'':'checked'} ${adm?'':'disabled'}> O técnico libera a máquina ao terminar o conserto</label><div class="sub" style="margin:6px 0 0 26px">Desmarcado, quem libera é o gestor da linha, como era antes.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sec" data-go="mantotem">Abrir o computador de chamados</button><button class="btn sec" data-go="manqr">QR das linhas</button><button class="btn sec" data-go="mancrachas">Pessoas e crachás</button></div></section></div>`; }

/* ---------- registro: menu na ordem aprovada ---------- */
VIEWS.manpainel={nome:'Painel',ic:'grid',mob:'Painel'}; VIEWS.manind={nome:'Indicadores',ic:'grafico',mob:'Indic.'}; VIEWS.mancfg={nome:'Configurações',ic:'engr',mob:'Config.'}; VIEWS.tvnmanind={nome:'Indicadores da manutenção (TV)',ic:'tv',mob:'Indic. TV'};
if(VIEWS.manequip) VIEWS.manequip.nome='Máquinas'; if(VIEWS.mancrachas) VIEWS.mancrachas.nome='Pessoas e crachás'; if(VIEWS.manmon) VIEWS.manmon.nome='Monitor da oficina (TV)';
Object.assign(CRUMB,{manpainel:'Painel da manutenção',manind:'Indicadores',mancfg:'Configurações',tvnmanind:'Indicadores da manutenção (TV)'});
S.extViews=S.extViews||{}; Object.assign(S.extViews,{manpainel:vManHoje,manind:vManInd,mancfg:vManCfg,tvnmanind:vTvnManInd});
{ const _sr=spRota; spRota=function(v){ return v==='tvnmanind'?vTvnManInd():_sr.apply(this,arguments); }; }
function mzOrdena(){ const M=MODS.find(x=>x.id==='manut'); if(!M) return; ['manpainel','manind','mancfg','tvnmanind'].forEach(v=>{ if(!M.views.includes(v)) M.views.push(v); });
  const ordem=['manpainel','manch','manprev','manequip','manpecas','mancrachas','manind','manres','mancfg']; M.views=ordem.filter(v=>M.views.includes(v)).concat(M.views.filter(v=>!ordem.includes(v))); }
mzOrdena(); setTimeout(mzOrdena,0); setTimeout(mzOrdena,1500);
if(!APR_TELAS.some(t=>t.k==='manind')){ const i=APR_TELAS.findIndex(t=>t.k==='manut'); APR_TELAS.splice(i<0?APR_TELAS.length:i+1,0,{k:'manind',v:'tvnmanind',nome:'Indicadores da manutenção',d:'Chamados no mês, conserto médio, horas paradas por linha, máquinas e causas que mais param.',cor:'#AD8432',on:false}); }
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='mz-mes'){ S.mi.cp=ev.target.value; render(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mz-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='mz-pdf') mzRelatorio();
  if(a==='mz-tv'){ const t=APR_TELAS.find(x=>x.k==='manind'); if(t) aprIniciar([t]); }
  if(a==='mz-cfgok'){ if(!dbMaster()) return; const lin=id=>((document.getElementById(id)||{}).value||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,24);
    const d={manDefeitos:lin('mz-defs'),manCausas:lin('mz-caus'),manLiberaTecnico:!!(document.getElementById('mz-libtec')||{}).checked};
    if(d.manDefeitos.length<2||d.manCausas.length<2) return toast('Deixe pelo menos 2 defeitos e 2 causas.');
    try{ await S.db.doc('config/geral').set(d,{merge:true}); Object.assign(S.cfg,d); toast('Configurações da manutenção salvas.'); render(); }catch(e){ toast('Não foi possível salvar: '+((e&&e.message)||e)); } } });
document.head.insertAdjacentHTML('beforeend',`<style id="mz-css">
.mo-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}.mo-k{background:var(--surface);border-radius:14px;padding:14px 18px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:2px}
.mo-k b{font-size:30px;font-weight:700;line-height:1.05}.mo-k b.crit{color:var(--crit-ink)}.mo-k b.warn{color:var(--warn-ink)}.mo-k b.ok{color:var(--ok-ink)}.mo-k b.info{color:var(--teal)}.mo-k span{font-size:14px;font-weight:600}.mo-k small{font-size:12.5px;color:var(--muted)}
.mo-g{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}.mo-col{display:flex;flex-direction:column;gap:16px}.mo-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
@media (max-width:980px){.mo-g,.mo-g2{grid-template-columns:1fr}}
.mo-ln>*,.mo-ln2>*{min-width:0}.mo-ln .pill,.mo-ln2 .pill,.pd-ln .pill{white-space:normal;max-width:100%}
@media (max-width:700px){.mo-ln{grid-template-columns:1fr;gap:4px}.mo-b{grid-template-columns:96px minmax(0,1fr) 56px}.mo-lis{grid-template-columns:1fr}.mo-ks{grid-template-columns:repeat(2,minmax(0,1fr))}.mo-k b{font-size:24px}}
.mo-c h2{margin:0 0 10px;font-size:18px;font-weight:600}.mo-h{display:flex;justify-content:space-between;align-items:baseline}
.mo-ln{display:grid;grid-template-columns:84px minmax(0,1.2fr) minmax(0,1.3fr) auto;gap:12px;align-items:center;padding:11px 0;border-top:1px solid var(--line)}.mo-ln small{display:block;font-size:12.5px;color:var(--muted)}
.mo-ln2{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line)}.mo-ln2 small{display:block;font-size:12.5px;color:var(--muted)}
.mo-lis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mo-li{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;background:var(--surface-2)}.mo-li i{width:10px;height:10px;border-radius:50%;background:var(--ok)}.mo-li b{font-weight:600;font-size:14px}.mo-li span{margin-left:auto;font-size:12.5px;color:var(--muted);text-align:right}
.mo-li.crit{background:var(--crit-tint)}.mo-li.crit i{background:var(--crit)}.mo-li.crit span{color:var(--crit-ink)}.mo-li.warn{background:var(--warn-tint)}.mo-li.warn i{background:var(--warn)}.mo-li.info{background:var(--teal-tint)}.mo-li.info i{background:var(--teal)}
.mo-b{display:grid;grid-template-columns:140px minmax(0,1fr) 70px;gap:10px;align-items:center;margin:7px 0}.mo-b span{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mo-b div{height:14px;border-radius:7px;background:var(--surface-2)}.mo-b i{display:block;height:100%;border-radius:7px}.mo-b b{font-size:14px;font-weight:600;text-align:right}
.mo-sem{display:flex;align-items:flex-end;gap:16px;height:150px;padding-top:8px}.mo-sem>div{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}.mo-sem i{width:100%;border-radius:8px 8px 0 0;background:var(--teal-strong);min-height:2px}.mo-sem span{font-size:13px;color:var(--muted)}
.mzt-b{display:grid;grid-template-columns:240px minmax(0,1fr) 120px;gap:16px;align-items:center;margin-top:12px}.mzt-b span{font-size:24px}.mzt-b div{height:22px;border-radius:11px;background:var(--vazio)}.mzt-b i{display:block;height:100%;border-radius:11px}.mzt-b b{font-size:26px;text-align:right}
.mzt-cmp{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}.mzt-cmp>div{border-radius:14px;padding:18px 22px;background:var(--vazio)}.mzt-cmp span{display:block;font-size:22px;font-weight:600}.mzt-cmp b{font-size:52px;font-weight:800}.mzt-cmp .ok b{color:var(--ok)}.mzt-cmp .crit b{color:var(--crit)}
</style>`);
/* ===FIM MANUTENÇÃO=== */
