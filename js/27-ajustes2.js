/* Painel Colafix · 27-ajustes2.js — silos: tela reorganizada e "Última medição" (vale sempre o mais recente);
   Análise → Estoques: capacidade por item. */
"use strict";
/* ---------- silos: quadro "Última medição" (com a medição acertando o saldo) ---------- */
{ const _ch=smCompHtml; smCompHtml=function(s){ if(smComparar()) return _ch.apply(this,arguments); const d=S.siloSaldo[s.id]; if(!d||d.saldoKg==null) return '';
    const m=(S.siloMov||[]).find(x=>x.silo===s.id&&x.tipo==='medicao'&&x.aplicado!==false), med=m?(m.medidoKg!=null?m.medidoKg:m.depoisKg):null, ant=m?m.antesKg:null, dif=med!=null&&ant!=null?med-ant:null, pc=dif!=null&&ant?dif/ant*100:null;
    const fonte=d.origem==='medicao'?'pela medição manual':d.origem==='entrada'?'pelo recebimento da nota':d.origem==='estorno'?'por um apontamento desfeito':'pelos apontamentos (automático)';
    return `<section class="card smc"><div class="aj-fonte">Nível atualizado ${esc(fonte)}${d.atualizadoEm?' · '+esc(new Date(d.atualizadoEm).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))+' '+hora(d.atualizadoEm):''} · vale sempre o mais recente</div>
      <div class="smc-c"><span>Última medição manual</span><b>${med!=null?fkg(med):'—'}</b><small>${m?esc(new Date(m.medidoEm||m.em).toLocaleDateString('pt-BR'))+' '+hora(m.medidoEm||m.em)+(ant!=null?' · o automático marcava '+fkg(ant):''):'nenhuma medição ainda'}</small></div>
      <div class="smc-c ${pc==null?'':Math.abs(pc)>5?'crit':Math.abs(pc)>2?'warn':'ok'}"><span>Diferença na medição</span><b>${dif!=null?fkgS(dif)+(pc!=null?' ('+(pc>0?'+':'')+pc.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%)':''):'—'}</b><small>medido − automático naquele momento</small></div>
      ${siloPodeConfig()?`<label class="ck smc-mod"><input type="checkbox" data-smc-mod> Comparar sem acertar (a medição manual não corrige o automático)</label>`:''}</section>`; }; }
/* ---------- silos: tela reorganizada (o mais importante em cima; configurações recolhidas) ---------- */
{ const _vs=vSilos; vSilos=function(){ const h=_vs.apply(this,arguments); try{ const t=document.createElement('template'); t.innerHTML=h; const els=[...t.content.children], pega=f=>{ const i=els.findIndex(f); return i<0?null:els.splice(i,1)[0]; };
    const tx=e=>(e.innerText||e.textContent||'').trim().toUpperCase(), cl=(e,c)=>e.classList&&e.classList.contains(c);
    const head=pega(e=>cl(e,'head')), form=pega(e=>e.querySelector&&e.querySelector('#sm-kg')), sel=pega(e=>e.getAttribute&&e.getAttribute('aria-label')==='Escolher silo'||(e.querySelector&&e.querySelector('[data-silo-sel]')&&e.tagName==='DIV'&&!e.className)),
      sa=pega(e=>cl(e,'sa')), agora=pega(e=>/^AGORA/.test(tx(e))), smc=pega(e=>cl(e,'smc')), cons=pega(e=>cl(e,'aj-cons')), mov=pega(e=>/^MOVIMENTAÇÕES DO/.test(tx(e))), med=pega(e=>/^MEDIÇÕES DO/.test(tx(e))),
      ntfy=pega(e=>/^AVISOS NO CELULAR/.test(tx(e))), smf=pega(e=>cl(e,'smf'));
    const o=x=>x?x.outerHTML:'', dupla=smc&&cons?`<div class="aj-g2">${o(smc)}${o(cons)}</div>`:o(smc)+o(cons);
    const cfg=(smf||ntfy)?`<details class="card aj-cfg" ${S._ajCfgAb?'open':''}><summary>Configurações dos silos <small>de quais silos cada linha puxa${ntfy?' · avisos no celular':''}</small></summary>${o(smf)}${o(ntfy)}</details>`:'';
    return o(head)+o(form)+o(sel)+o(sa)+o(agora)+dupla+o(mov)+o(med)+cfg+els.map(o).join(''); }catch(e){ console.warn('[silos layout]',e); return h; } }; }
document.addEventListener('toggle',ev=>{ const d=ev.target; if(d&&d.classList&&d.classList.contains('aj-cfg')) S._ajCfgAb=d.open; },true);
document.head.insertAdjacentHTML('beforeend',`<style id="aj2-css">
.aj-g2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px;align-items:start}.aj-g2>section{margin:0}.aj-g2 .smc{grid-template-columns:1fr}.aj-g2 .smc .btn{justify-self:start}
@media (max-width:980px){.aj-g2{grid-template-columns:1fr}}
.aj-fonte{font-size:13px;color:var(--muted)}.aj-cfg{padding:0!important;overflow:hidden}.aj-cfg>summary{cursor:pointer;padding:16px 20px;font-weight:700;font-size:16px;list-style:none;display:flex;align-items:baseline;gap:10px}.aj-cfg>summary::before{content:"▸";color:var(--muted);transition:transform .15s}.aj-cfg[open]>summary::before{transform:rotate(90deg)}
.aj-cfg>summary small{font-weight:400;font-size:13.5px;color:var(--muted)}.aj-cfg>section{margin:0 14px 14px;box-shadow:none;border:1px solid var(--line)}
</style>`);
/* ===FIM AJUSTES2=== */

/* ---------- Análise → Estoques: capacidade por item (paletes ocupados × capacidade reservada para o item) ---------- */
function ajItensCap(R){ let rows=[]; try{ rows=anlEstRows(R).map(anlEstX); }catch(e){ return []; } const cap=S.cfg.almoxCapItem||{};
  return rows.map(r=>{ let pp=0; try{ pp=+paleteDe({produto:r.c})||0; }catch(e){} const q3=+r.a3||0, q30=+r.a30||0; if(q3<=0&&q30<=0&&!cap[r.c]) return null;
    const p3=pp>0?Math.ceil(q3/pp):null, p30=pp>0?Math.ceil(q30/pp):null, tot=pp>0?(p3||0)+(p30||0):null, c=+cap[r.c]||0;
    return {c:r.c,d:r.d||'',pp,p3,p30,tot,cap:c,pc:c&&tot!=null?tot/c*100:null}; }).filter(Boolean).sort((a,b)=>(b.tot||0)-(a.tot||0)||a.c.localeCompare(b.c)); }
function ajItensCapHtml(R){ const xs=ajItensCap(R); if(!xs.length) return ''; const pode=!(typeof soVer==='function'&&soVer()), q=String(S._ajcq||'').trim().toUpperCase();
  const vis=xs.filter(x=>!q||x.c.toUpperCase().includes(q)||x.d.toUpperCase().includes(q)), acima=xs.filter(x=>x.pc!=null&&x.pc>100).length;
  const cor=pc=>pc==null?'':pc>100?'crit':pc>=90?'crit':pc>=75?'warn':'ok';
  return `<section class="card aj-ic"><div class="aj-caph0"><div><div class="label">CAPACIDADE POR ITEM</div><div class="sub" style="margin:2px 0 0">Paletes que cada produto ocupa hoje em cada almox e o espaço reservado para ele (em paletes).${acima?` <b style="color:var(--crit-ink)">${acima} item(ns) acima do espaço reservado.</b>`:''}</div></div>
      <div class="aj-ica"><input class="txt" id="aj-cq" placeholder="Procurar código ou nome" value="${esc(S._ajcq||'')}" autocomplete="off">${pode?'<button class="btn sec" data-act="aj-icok">Salvar capacidades por item</button>':''}</div></div>
    <div class="aj-icw"><table class="aj-ict"><thead><tr><th>Item</th><th class="r">Sacos/palete</th><th class="r">Almox 3</th><th class="r">Almox 30</th><th class="r">Total</th><th class="r">Capacidade</th><th>Uso</th></tr></thead><tbody>
      ${vis.slice(0,150).map(x=>`<tr><td><b>${esc(x.c)}</b><small>${esc(x.d.slice(0,42))}</small></td><td class="r">${x.pp>0?x.pp:'<span class="aj-sem">sem padrão</span>'}</td><td class="r">${x.p3!=null?x.p3:'—'}</td><td class="r">${x.p30!=null?x.p30:'—'}</td><td class="r"><b>${x.tot!=null?x.tot:'—'}</b></td>
        <td class="r"><input class="txt aj-icin" type="number" min="0" data-aj-icap="${esc(x.c)}" value="${x.cap||''}" placeholder="—" ${pode?'':'disabled'}></td>
        <td>${x.pc!=null?`<div class="aj-icu ${cor(x.pc)}"><i><u style="width:${Math.min(100,x.pc).toFixed(0)}%"></u></i><em>${Math.round(x.pc)}%${x.pc>100?' · acima do espaço':''}</em></div>`:'<span class="sub" style="margin:0">—</span>'}</td></tr>`).join('')}
      ${vis.length>150?`<tr><td colspan="7" class="sub">+ ${vis.length-150} itens — use a busca</td></tr>`:''}</tbody></table></div></section>`; }
{ const _ve=vAnlEst; vAnlEst=function(R){ const h=_ve.apply(this,arguments); let c=''; try{ c=ajItensCapHtml(R); }catch(e){ console.warn('[capacidade por item]',e); } if(!c) return h; const i=h.indexOf('class="card aj-capw"'); const j=i>=0?h.indexOf('</section>',i)+10:0; return j>0?h.slice(0,j)+c+h.slice(j):c+h; }; }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||t.id!=='aj-cq') return; S._ajcq=t.value; clearTimeout(S._ajcqT); S._ajcqT=setTimeout(()=>{ render(); const i=document.getElementById('aj-cq'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },250); });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="aj-icok"]'); if(!b) return; const v=Object.assign({},S.cfg.almoxCapItem||{});
  document.querySelectorAll('[data-aj-icap]').forEach(i=>{ const n=Math.round(+i.value||0); if(n>0) v[i.dataset.ajIcap]=n; else delete v[i.dataset.ajIcap]; });
  try{ await S.db.doc('config/geral').set({almoxCapItem:v},{merge:true}); S.cfg.almoxCapItem=v; toast('Capacidades por item salvas ('+Object.keys(v).length+' itens com espaço reservado).'); render(); }catch(e){ erro(e); } });
document.head.insertAdjacentHTML('beforeend',`<style id="aj2-ic-css">
.aj-ic{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}.aj-ica{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.aj-ica input{min-width:240px}
.aj-icw{overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:10px}.aj-ict{width:100%;border-collapse:collapse;font-size:14px}.aj-ict th{position:sticky;top:0;background:var(--surface-2);font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);z-index:1}
.aj-ict td{padding:6px 10px;border-bottom:1px solid var(--line);vertical-align:middle}.aj-ict .r{text-align:right;font-variant-numeric:tabular-nums}.aj-ict td small{display:block;color:var(--muted);font-size:12px}.aj-sem{font-size:12px;color:var(--warn-ink)}
.aj-icin{width:84px;height:34px!important;text-align:right}.aj-icu{display:flex;align-items:center;gap:8px;min-width:150px}.aj-icu i{flex:1;height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden}.aj-icu u{display:block;height:100%}.aj-icu em{font-style:normal;font-size:12.5px;white-space:nowrap}
.aj-icu.ok u{background:var(--ok)}.aj-icu.warn u{background:var(--warn)}.aj-icu.crit u{background:var(--crit)}.aj-icu.crit em{color:var(--crit-ink);font-weight:600}
</style>`);
