/* 77 · Apontamentos antecipados em evidência (02/11, pedido do PCP: "os apontamentos antecipados são materiais que estão sendo
   produzidos mas o comercial está pedindo; vou ter que descontar quando receber a folha no horário, então tem que estar em evidência
   para eu me lembrar").
   - Programação: quadro laranja "Antecipados para descontar" em cima da lista, com a ordem, a quantidade e o horário do apontamento.
     "Já descontei" grava descontadoEm/descontadoPor na entrega (não apaga nada) e ela sai do quadro.
   - Lançar apontamento (em lote): cada ordem com antecipado mostra "Antecipado X — desconte da folha".
   - Só os antecipados com a folha nos últimos 7 dias (ou no futuro) aparecem.
   - Avisos do Meu dia/sino: "N apontamentos antecipados para descontar" quando o horário já chegou.
   Prefixo `atc`. */
const ATC_DIAS=7; /* antecipado com a folha de mais de 7 dias atrás sai sozinho (os antigos, de antes deste quadro, não aparecem) */
function atcLista(){ const an=anuladas(), lim=new Date(Date.now()-ATC_DIAS*864e5).toISOString();
  return (S.entregas||[]).filter(e=>e.antecipado&&!e.anula&&!an.has(e._id)&&!e.descontadoEm&&+e.qtd>0&&String(e.em||'')>=lim)
    .sort((a,b)=>String(a.em).localeCompare(String(b.em))||String(a.num).localeCompare(String(b.num))); }
function atcDeOrdem(id){ return atcLista().filter(e=>e.ordem===id); }
function atcQuando(e){ const t=e.em||'', h=hojeStr(), d=t?hojeStr(new Date(t)):'';
  return (d===h?'hoje':d===amanhaStr()?'amanhã':dm(d))+' às '+hora(t); }
function atcCard(){ const xs=atcLista(); if(!xs.length) return ''; const agora=new Date().toISOString();
  const tot={}; xs.forEach(e=>{ const o=ordById(e.ordem); const u=o?uA(o):''; tot[u]=(tot[u]||0)+(+e.qtd||0); });
  return `<section class="card atc-card" aria-label="Apontamentos antecipados para descontar">
   <div class="atc-h"><div><div class="eyebrow">LEMBRETE</div><h2>${xs.length===1?'1 apontamento antecipado':xs.length+' apontamentos antecipados'} para descontar</h2>
    <div class="sub">Já foram lançados antes da folha. Quando a folha chegar no horário, desconte estas quantidades e toque em <b>Já descontei</b>.</div></div>
    <span class="atc-tot num">${Object.entries(tot).map(([u,q])=>fq(q)+(u?' '+esc(u):'')).join(' + ')}</span></div>
   <div class="atc-l">${xs.map(e=>{ const o=ordById(e.ordem), venceu=String(e.em||'')<=agora;
     return `<div class="atc-r ${venceu?'v':''}"><span class="atc-q num">${fq(+e.qtd||0)}<small>${o?esc(uA(o)):''}</small></span>
      <span class="atc-i"><b>${o?esc(nomeCurto(o)):'Ordem '+esc(e.num||'')}</b><small class="num">Ordem ${esc(e.num||(o&&o.num)||'')} · ${esc(e.linha||(o&&o.linha)||'')} · folha de ${atcQuando(e)}${e.registradoEm?' · lançado '+(hojeStr(new Date(e.registradoEm))===hojeStr()?'hoje':dm(hojeStr(new Date(e.registradoEm))))+' às '+hora(e.registradoEm):''}${e.obs?' · '+esc(e.obs):''}</small></span>
      <span class="atc-s">${venceu?'<span class="pill warn">a folha já chegou</span>':'<span class="pill neu">aguardando a folha</span>'}</span>
      <span class="atc-a">${o?`<button class="lnk" data-act="o-abrir" data-id="${esc(o._id)}">Abrir ordem</button>`:''}<button class="btn sec" data-act="atc-ok" data-id="${esc(e._id)}">${ic('check',16,2.2)}Já descontei</button></span></div>`; }).join('')}</div></section>`; }
/* Programação: o quadro entra logo antes dos filtros */
{ const _vp=vProgramacao; vProgramacao=function(){ const h=_vp.apply(this,arguments); try{ const c=atcCard(); if(!c) return h; const k='<section class="card ofil pfil">', i=h.indexOf(k); return i<0?c+h:h.slice(0,i)+c+h.slice(i); }catch(e){ console.warn('[antecipados]',e); return h; } }; }
/* Lançar apontamento em lote: aviso embaixo da ordem que tem antecipado */
{ const _ap=aptPainel; aptPainel=function(){ const h=_ap.apply(this,arguments); try{ if(S.apt.passo==='escolher') return h;
    return h.replace(/(<span class="num sub" style="margin:0;font-size:12px" data-apt-res="([^"]+)">[\s\S]*?<\/span><\/div>)/g,(m,a,id)=>{ const xs=atcDeOrdem(id); if(!xs.length) return a; const q=xs.reduce((s,e)=>s+(+e.qtd||0),0), o=ordById(id);
      return a+`<div class="atc-apt">${ic('alerta',16,2.2)}<span>Antecipado <b class="num">${fq(q)}${o?' '+esc(uA(o)):''}</b> (folha de ${atcQuando(xs[0])}): desconte da quantidade da folha. <button class="lnk" data-act="atc-ok" data-ids="${esc(xs.map(e=>e._id).join(','))}">Já descontei</button></span></div>`; }); }catch(e){ return h; } }; }
/* aviso no Meu dia / sino quando o horário da folha já chegou */
registrarAviso(()=>{ try{ if(!viewOk('programacao')) return []; const agora=new Date().toISOString(), xs=atcLista().filter(e=>String(e.em||'')<=agora); if(!xs.length) return [];
  return [{nivel:'warn',rotulo:'Antecipado',titulo:xs.length===1?'1 apontamento antecipado para descontar':xs.length+' apontamentos antecipados para descontar',texto:xs.slice(0,3).map(e=>'Ordem '+e.num+' · '+fq(+e.qtd||0)).join(' · ')+(xs.length>3?' · …':''),go:'programacao'}]; }catch(e){ return []; } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="atc-ok"]'); if(!b) return; ev.preventDefault(); ev.stopPropagation();
  const ids=(b.dataset.ids||b.dataset.id||'').split(',').filter(Boolean); if(!ids.length||!S.db) return; b.disabled=true;
  try{ const em=new Date().toISOString(); for(const id of ids){ await S.db.doc('entregas/'+id).update({descontadoEm:em,descontadoPor:S.uid||null}); const e=(S.entregas||[]).find(x=>x._id===id); if(e){ e.descontadoEm=em; e.descontadoPor=S.uid||null; } }
    toast(ids.length===1?'Marcado como descontado.':ids.length+' antecipados marcados como descontados.'); render(); }catch(e){ b.disabled=false; erro(e); } },true);
document.head.insertAdjacentHTML('beforeend',`<style id="atc-css">
.atc-card{border:1.5px solid #D9A54A;background:linear-gradient(0deg,var(--surface),var(--surface)),var(--surface);box-shadow:inset 4px 0 0 #D9A54A}
.atc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.atc-h h2{margin:2px 0 0}.atc-h .eyebrow{color:#9A6A12}
.atc-tot{font-size:22px;font-weight:700;color:#7A5410;white-space:nowrap}
.atc-l{display:flex;flex-direction:column;margin-top:10px}
.atc-r{display:grid;grid-template-columns:96px minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
.atc-r.v{background:var(--warn-tint,#FBF4E6);margin:0 -18px;padding:10px 18px}
.atc-q{font-size:20px;font-weight:700;display:flex;flex-direction:column;line-height:1.1}.atc-q small{font-size:11.5px;font-weight:500;color:var(--muted)}
.atc-i{min-width:0;display:flex;flex-direction:column}.atc-i b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atc-i small{color:var(--muted);font-size:12.5px}
.atc-a{display:flex;gap:12px;align-items:center}
.atc-apt{display:flex;gap:8px;align-items:flex-start;margin:6px 0 2px;padding:8px 10px;border-radius:8px;background:var(--warn-tint,#FBF4E6);color:var(--warn-ink,#7A5410);font-size:13px}.atc-apt svg{flex-shrink:0;margin-top:1px}
@media (max-width:860px){ .atc-r{grid-template-columns:72px minmax(0,1fr)} .atc-s,.atc-a{grid-column:2} .atc-r.v{margin:0 -14px;padding:10px 14px} }
</style>`);
