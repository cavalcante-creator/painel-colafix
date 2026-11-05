/* =====================================================================
   Produção × Comercial › COMO FOI O DIA (pedido de 05/11:
   "selecionar o dia de hoje e, com base nas movimentações, ver se saiu mais AC3 que o normal
    ou quanto saiu e entrou de cada material").
   Tela `anlcomdia`, aba ao lado de "Mês" no Produção × Comercial. Só usa o que já está carregado:
   `vendas.diario` do Extrato do Focco (NFS = saiu/faturado, EPP = entrou/produzido, últimos 150 dias).
   Normal = média dos dias úteis com movimento nas 8 semanas antes do dia (até 40 dias).
   Mesmo recorte do resto da tela: sem ensacado/premix/nivelador (`cmInt`) e com os filtros (`cmFora`).
   ===================================================================== */
S.cmd=S.cmd||{dia:'',ver:'fam',un:'sc',ab:{}};
const CMD_REF=40, CMD_ACIMA=1.3, CMD_ABAIXO=0.7;
function cmdDiario(){ return ((S.anl.base||{}).vendas||{}).diario||{}; }
function cmdDias(){ const D=cmdDiario(), s=new Set(); for(const c in D) for(const d in D[c]){ const v=D[c][d]||[]; if((+v[0]||0)||(+v[1]||0)) s.add(d); } return [...s].sort(); }
function cmdUtil(d){ const w=new Date(d+'T12:00:00').getDay(); if(w===0||w===6) return false; try{ if(feriadoDe(d)) return false; }catch(e){} return true; }
function cmdMin(un,item){ return un==='t'?(item?1:3):(item?50:150); }
function cmdSit(v,n,un,item){ const m=cmdMin(un,item);
  if(n<=0) return v>=m?'novo':'';
  if(v>=n*CMD_ACIMA&&v-n>=m) return 'acima'; if(v<=n*CMD_ABAIXO&&n-v>=m) return 'abaixo'; return ''; }
function cmdCalc(dia,un){ const D=cmdDiario(), todos=cmdDias();
  const ref=todos.filter(d=>d<dia&&cmdUtil(d)).slice(-CMD_REF), nR=ref.length||1;
  const val=(c,q)=>un==='t'?cmTon(c,q):q;
  const its=[], fam={}; let tot={e:0,s:0,ne:0,ns:0};
  for(const c in D){ const d=cmDesc(c); if(cmFora(c,d)) continue; const X=D[c], h=X[dia]||[0,0];
    let se=0,ss=0,mx=0; ref.forEach(r=>{ const v=X[r]; if(!v) return; se+=+v[0]||0; ss+=+v[1]||0; if((+v[1]||0)>mx) mx=+v[1]||0; });
    const r={c,d,fam:eswFam(d,c),e:val(c,+h[0]||0),s:val(c,+h[1]||0),ne:val(c,se/nR),ns:val(c,ss/nR),rec:(+h[1]||0)>0&&(+h[1]||0)>mx&&ref.length>=10};
    if(!r.e&&!r.s&&!r.ne&&!r.ns) continue;
    r.sitS=cmdSit(r.s,r.ns,un,true); r.sitE=cmdSit(r.e,r.ne,un,true); its.push(r);
    const F=fam[r.fam]=fam[r.fam]||{k:r.fam,e:0,s:0,ne:0,ns:0,its:[]}; ['e','s','ne','ns'].forEach(k=>{ F[k]+=r[k]; tot[k]+=r[k]; }); F.its.push(r); }
  const fams=ESW_FAMO.map(k=>fam[k]).filter(Boolean).concat(Object.values(fam).filter(f=>!ESW_FAMO.includes(f.k)));
  fams.forEach(f=>{ f.sitS=cmdSit(f.s,f.ns,un,false); f.sitE=cmdSit(f.e,f.ne,un,false); f.its.sort((a,b)=>(b.s+b.e)-(a.s+a.e)); });
  /* histórico do total que saiu e entrou nos últimos dias úteis (para o gráfico) */
  const hist=ref.slice(-19).concat([dia]).map(d=>{ let e=0,s=0; its.forEach(r=>{ const v=(D[r.c]||{})[d]; if(v){ e+=val(r.c,+v[0]||0); s+=val(r.c,+v[1]||0); } }); return {d,e,s}; });
  return {dia,ref,its,fams,tot,hist,un}; }
const cmdN=(v,un)=>v==null||!isFinite(v)?'—':un==='t'?(Math.round(v*10)/10).toLocaleString('pt-BR'):Math.round(v).toLocaleString('pt-BR');
function cmdPct(v,n){ if(!n) return v?'sem média':'—'; const p=Math.round((v/n-1)*100); return (p>0?'+':'')+p+'%'; }
function cmdSelo(sit,v,n){ if(sit==='acima') return `<span class="cmd-sl up">${cmdPct(v,n)} · acima do normal</span>`; if(sit==='abaixo') return `<span class="cmd-sl dn">${cmdPct(v,n)} · abaixo</span>`;
  if(sit==='novo') return `<span class="cmd-sl up">sem saída normal</span>`; return `<span class="cmd-sl">${cmdPct(v,n)}</span>`; }
function cmdDiaNome(d){ try{ return new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}); }catch(e){ return d; } }
function vAnlComDia(){ const A=S.cmd, V=(S.anl.base||{}).vendas||{}, ate=V.ate||'', hj=hojeStr();
  if(!A.dia) A.dia=ate&&ate<hj?ate:hj;
  const todos=cmdDias(), un=A.un;
  let head=`<div class="head"><div><div class="eyebrow">ANÁLISE PCP · COMERCIAL</div><h1>Como foi o dia</h1>
    <p class="sub">Quanto saiu (faturado) e entrou (produzido) de cada material no dia, comparado com um dia normal.</p></div>
    <div class="cmd-ctl"><button class="btn sec" data-act="cmd-dmv" data-v="-1" aria-label="Dia anterior">‹</button>
    <input type="date" class="txt" id="cmd-dia" value="${esc(A.dia)}" ${todos[0]?`min="${todos[0]}"`:''} max="${hj}">
    <button class="btn sec" data-act="cmd-dmv" data-v="1" aria-label="Próximo dia">›</button>
    ${A.dia!==(ate&&ate<hj?ate:hj)?`<button class="lnk" data-act="cmd-ult">Último dia importado</button>`:''}
    <div class="seg" role="group" aria-label="Unidade">${[['sc','Sacos'],['t','Toneladas']].map(([k,l])=>`<button aria-pressed="${un===k}" data-act="cmd-un" data-v="${k}">${l}</button>`).join('')}</div></div></div>`;
  if(!S.anl.lidos.vendas&&!V.diario) return head+'<div class="empty">Carregando a base…</div>';
  if(!todos.length) return head+'<section class="card"><div class="empty">Sem o Extrato do Focco importado. Importe o Extrato (NFS e EPP) em Sistema › Base de dados.</div></section>';
  head+=cmBarra(A.dia.slice(0,7));
  if(ate&&A.dia>ate) return head+`<section class="card cmd-av">O Extrato importado vai até <b>${esc(dm(ate))}</b>. Para ver ${A.dia===hj?'o dia de hoje':'este dia'}, importe o Extrato do Focco desse dia em Sistema › Base de dados (ou deixe o robô do Focco mandar). <button class="lnk" data-act="cmd-ult">Ver ${esc(dm(ate))}</button></section>`;
  if(todos[0]&&A.dia<todos[0]) return head+`<section class="card cmd-av">O painel guarda o dia a dia só dos últimos 150 dias (desde ${esc(dm(todos[0]))}).</section>`;
  const X=cmdCalc(A.dia,un), T=X.tot, nR=X.ref.length;
  const fdu=!cmdUtil(A.dia);
  const k=(t,v,s,c)=>`<div class="cmd-k ${c||''}"><span>${t}</span><b class="num">${v}</b><i>${s||''}</i></div>`;
  const uN=un==='t'?' t':' sc';
  const acS=X.fams.filter(f=>f.sitS==='acima'||f.sitS==='novo'), abS=X.fams.filter(f=>f.sitS==='abaixo');
  const frase=!T.s&&!T.e?'Nenhuma movimentação neste dia no Extrato.':
    (acS.length?`Saiu mais que o normal: ${acS.map(f=>`<b>${esc(eswFamN(f.k))}</b> (${cmdN(f.s,un)}${uN}, normal ${cmdN(f.ns,un)})`).join(', ')}.`:'Nenhuma família saiu acima do normal.')
    +(abS.length?` Saiu menos: ${abS.map(f=>esc(eswFamN(f.k))).join(', ')}.`:'');
  const kp=`<div class="cmd-ks">${k('Saiu (faturado)',cmdN(T.s,un)+uN,'normal '+cmdN(T.ns,un)+' · '+cmdPct(T.s,T.ns),T.s>=T.ns*CMD_ACIMA&&T.ns?'up':'')}
    ${k('Entrou (produzido)',cmdN(T.e,un)+uN,'normal '+cmdN(T.ne,un)+' · '+cmdPct(T.e,T.ne))}
    ${k('Entrou − saiu',(T.e-T.s>0?'+':'')+cmdN(T.e-T.s,un)+uN,T.e>=T.s?'o estoque subiu':'o estoque desceu',T.e>=T.s?'ok':'dn')}
    ${k('Saíram acima do normal',String(X.its.filter(r=>r.sitS==='acima'||r.sitS==='novo').length),'itens · '+acS.length+(acS.length===1?' família':' famílias'))}</div>`;
  /* gráfico dos últimos dias úteis */
  const mx=Math.max(1,...X.hist.map(h=>Math.max(h.s,h.e)));
  const gr=`<div class="cmd-gr" aria-label="Saiu e entrou nos últimos dias úteis">${X.hist.map(h=>`<button class="cmd-gc${h.d===A.dia?' on':''}" data-act="cmd-ir" data-v="${h.d}" title="${esc(dm(h.d))}: saiu ${cmdN(h.s,un)}, entrou ${cmdN(h.e,un)}"><span class="cmd-bs" style="height:${Math.round(h.s/mx*108)}px"></span><span class="cmd-be" style="height:${Math.round(h.e/mx*108)}px"></span><small>${esc(dm(h.d).slice(0,5))}</small></button>`).join('')}
    <div class="cmd-nl" style="bottom:${18+Math.round(T.ns/mx*108)}px"></div></div>
    <div class="cmd-lg"><span><i class="s"></i>Saiu</span><span><i class="e"></i>Entrou</span><span><i class="n"></i>Saída normal</span></div>`;
  const row=(r,fam)=>`<tr class="${fam?'cmd-fr':'cmd-ir'}${r.sitS==='acima'||r.sitS==='novo'?' up':''}" ${fam?`data-act="cmd-fab" data-v="${esc(r.k)}"`:''}>
    <td class="l">${fam?`<b>${A.ab[r.k]?'▾':'▸'} ${esc(eswFamN(r.k))}</b> <small>${r.its.length} ${r.its.length===1?'item':'itens'}</small>`:`<b>${esc(r.c)}</b> ${esc(r.d)}${r.rec?' <span class="cmd-sl up">maior saída em '+nR+' dias</span>':''}`}</td>
    <td>${cmdN(r.s,un)}</td><td class="m">${cmdN(r.ns,un)}</td><td>${cmdSelo(r.sitS,r.s,r.ns)}</td>
    <td>${cmdN(r.e,un)}</td><td class="m">${cmdN(r.ne,un)}</td><td class="${r.e-r.s<0?'neg':'pos'}">${(r.e-r.s>0?'+':'')+cmdN(r.e-r.s,un)}</td></tr>`;
  const cab=`<thead><tr><th class="l">${A.ver==='fam'?'Família / item':'Item'}</th><th>Saiu</th><th>Normal</th><th>× normal</th><th>Entrou</th><th>Normal</th><th>Entrou − saiu</th></tr></thead>`;
  let corpo='';
  if(A.ver==='fam') X.fams.forEach(f=>{ corpo+=row(f,true); if(A.ab[f.k]) corpo+=f.its.map(r=>row(r,false)).join(''); });
  else corpo=X.its.slice().sort((a,b)=>Math.abs(b.s-b.ns)-Math.abs(a.s-a.ns)).map(r=>row(r,false)).join('');
  corpo+=`<tr class="cmd-tot"><td class="l"><b>Total</b></td><td>${cmdN(T.s,un)}</td><td class="m">${cmdN(T.ns,un)}</td><td>${cmdSelo('',T.s,T.ns)}</td><td>${cmdN(T.e,un)}</td><td class="m">${cmdN(T.ne,un)}</td><td>${(T.e-T.s>0?'+':'')+cmdN(T.e-T.s,un)}</td></tr>`;
  return head+`<section class="card cmd-s"><div class="cmd-dt">${esc(cmdDiaNome(A.dia))}${fdu?' <span class="cmd-sl">sem expediente</span>':''}</div>
    <p class="cmd-fr0">${frase}</p>${kp}${gr}</section>
    <section class="card cmd-s"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><h3 class="cmd-h3">Cada material no dia</h3>
      <div class="seg" role="group" aria-label="Ver">${[['fam','Por família'],['item','Por item']].map(([k2,l])=>`<button aria-pressed="${A.ver===k2}" data-act="cmd-ver" data-v="${k2}">${l}</button>`).join('')}</div></div>
      <div class="cm-tw"><table class="cm-t cmd-t">${cab}<tbody>${corpo}</tbody></table></div>
      <p class="cm-nota">Normal = média de ${nR} ${nR===1?'dia útil':'dias úteis'} com movimento antes deste dia (até 8 semanas). "Acima do normal" = 30% ou mais acima da média e pelo menos ${cmdMin(un,false)}${uN} na família (${cmdMin(un,true)}${uN} no item). Saiu = faturado (NFS) e entrou = produzido (EPP) do Extrato do Focco. Ensacado, premix e nivelador ficam de fora.${un==='t'?' Toneladas = sacos × peso do nome do produto.':''}</p></section>`; }

/* ---------- ligação ---------- */
VIEWS.anlcomdia={nome:'Como foi o dia',ic:'grafico',mob:'Dia'}; CRUMB.anlcomdia='Como foi o dia'; S.extViews.anlcomdia=()=>banner()+vAnlComDia();
function cmdReg(){ const M=MODS.find(x=>x.id==='analise'); if(M&&!M.views.includes('anlcomdia')){ const i=M.views.indexOf('anlcom'); M.views.splice(i>=0?i+1:M.views.length,0,'anlcomdia'); }
  try{ const g=(NAV_GRP.analise||[]).find(x=>x.k==='mes'); if(g&&!g.v.includes('anlcomdia')){ const i=g.v.indexOf('anlcom'); g.v.splice(i>=0?i+1:g.v.length,0,'anlcomdia'); } }catch(e){} }
cmdReg(); setTimeout(cmdReg,0);
/* login do gestor: igual ao anlcom (js/72) */
{ const _vo=viewOk; viewOk=function(v){ if(v==='anlcomdia') return viewOk('anlcom'); return _vo.apply(this,arguments); }; }
{ const _md=modDe; modDe=function(v){ if(v==='anlcomdia') return modDe('anlcom'); return _md.apply(this,arguments); }; }
try{ const g=GXG.find(x=>x.id==='g-prod'); if(g&&!g.tabs.some(t=>t[0]==='anlcomdia')){ const i=g.tabs.findIndex(t=>t[0]==='anlcom'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['anlcomdia','Como foi o dia']);
  const f=S.extViews.anlcomdia; S.extViews.anlcomdia=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('anlcomdia')+h; }catch(e){ return h; } }; } }catch(e){}
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('anlcomdia')) GXN_TELAS.push('anlcomdia');
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Como foi o dia (saiu e entrou de cada material)','dia faturado produzido saiu entrou normal ac3 comercial movimento','anlcomdia',()=>go('anlcomdia')]); }catch(e){}

function cmdMove(n){ const A=S.cmd, ts=cmdDias(); if(!ts.length) return; let i=ts.indexOf(A.dia);
  if(i<0){ const j=ts.findIndex(d=>d>A.dia); i=n>0?(j<0?ts.length:j)-1:(j<0?ts.length:j); }
  const k=Math.max(0,Math.min(ts.length-1,i+n)); A.dia=ts[k]; render(); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cmd-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v, A=S.cmd;
  if(a==='cmd-aba'){ go(v); return; }
  if(a==='cmd-dmv'){ cmdMove(+v); return; }
  if(a==='cmd-ult'){ const ate=((S.anl.base||{}).vendas||{}).ate; if(ate) A.dia=ate; render(); return; }
  if(a==='cmd-ir'){ A.dia=v; render(); return; }
  if(a==='cmd-un'){ A.un=v; render(); return; }
  if(a==='cmd-ver'){ A.ver=v; render(); return; }
  if(a==='cmd-fab'){ A.ab[v]=!A.ab[v]; render(); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t&&t.id==='cmd-dia'&&t.value){ S.cmd.dia=t.value; render(); } });
Painel.comercialDia={calc:(d,u)=>cmdCalc(d,u||'sc'),S:()=>S};

document.head.insertAdjacentHTML('beforeend',`<style id="cmd-css">
.cmd-abas{display:inline-flex;gap:2px;margin:0 0 12px;border-bottom:1px solid var(--line)}
.cmd-abas button{background:none;border:0;padding:8px 14px;font:inherit;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer}
.cmd-abas button.on{color:var(--teal-strong);border-bottom-color:var(--teal)}
.cmd-ctl{display:flex;flex-direction:row;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end}.cmd-ctl>*{flex:0 0 auto;width:auto}.cmd-ctl .btn{height:42px;min-width:42px;padding:0 10px}.cmd-ctl input[type=date]{height:42px;width:auto}
.cmd-av{color:var(--ink,inherit)}.cmd-dt{font-size:13px;color:var(--muted);text-transform:capitalize;margin-bottom:4px}
.cmd-fr0{margin:0 0 14px;font-size:15px;line-height:1.5}
.cmd-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:16px}
.cmd-k{background:var(--surface-2,#F4F6F8);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.cmd-k span{font-size:12px;color:var(--muted)}.cmd-k b{font-size:24px;font-weight:500}.cmd-k i{font-style:normal;font-size:12px;color:var(--muted)}
.cmd-k.up b{color:var(--crit)}.cmd-k.ok b{color:var(--ok)}.cmd-k.dn b{color:var(--warn)}
.cmd-gr{position:relative;display:flex;align-items:flex-end;gap:4px;height:150px;padding-bottom:18px}
.cmd-gc{flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px;background:none;border:0;padding:0;cursor:pointer;position:relative;border-radius:6px}
.cmd-gc:hover{background:var(--surface-2,#F4F6F8)}.cmd-gc.on{background:rgba(20,63,84,.08)}
.cmd-gc>span{width:40%;max-width:14px;border-radius:3px 3px 0 0}
.cmd-bs{background:#C0392B}.cmd-be{background:#2E7D5B}.cmd-gc:not(.on) .cmd-bs{opacity:.55}.cmd-gc:not(.on) .cmd-be{opacity:.55}
.cmd-gc small{position:absolute;bottom:-18px;font-size:10px;color:var(--muted)}.cmd-gc.on small{color:var(--teal-strong);font-weight:600}
.cmd-nl{position:absolute;left:0;right:0;border-top:2px dashed rgba(192,57,43,.45);pointer-events:none}
.cmd-lg{display:flex;gap:16px;font-size:12px;color:var(--muted);margin-top:10px}.cmd-lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.cmd-lg i.s{background:#C0392B}.cmd-lg i.e{background:#2E7D5B}.cmd-lg i.n{height:0;border-top:2px dashed rgba(192,57,43,.6);border-radius:0}
.cmd-h3{margin:0;font-size:16px;font-weight:600}
.cmd-t td.m{color:var(--muted)}.cmd-t td.neg{color:var(--warn)}.cmd-t td.pos{color:var(--ok)}
.cmd-t tr.cmd-fr{cursor:pointer}.cmd-t tr.cmd-fr td{background:var(--surface-2,#F4F6F8)}.cmd-t tr.cmd-ir td.l{padding-left:26px}
.cmd-t tr.up td:first-child{box-shadow:inset 3px 0 0 var(--crit)}.cmd-t tr.cmd-tot td{font-weight:600;border-top:2px solid var(--line)}
.cmd-t td.l small{color:var(--muted);font-weight:400}
.cmd-sl{display:inline-block;font-size:11.5px;padding:2px 8px;border-radius:999px;background:var(--surface-2,#EEF1F4);color:var(--muted);white-space:nowrap}
.cmd-sl.up{background:rgba(192,57,43,.1);color:var(--crit)}.cmd-sl.dn{background:rgba(196,140,20,.13);color:#8a6200}
@media(max-width:640px){.cmd-gc small{display:none}.cmd-k b{font-size:20px}}
</style>`);
