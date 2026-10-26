/* Painel Colafix · 62-prog-rancho.js (26/10, pedido "incluir o filtro dos ranchos entregues, separado e não entregue")
   Programação ganha o filtro "Rancho": Todos · Entregue · Separado (separado e ainda não entregue) · Não entregue
   (tudo o que ainda não foi entregue na linha). Vale só para ordens com número (as previsões ficam de fora quando filtra).
   Gancho no js/01 (vProgramacao): ranFiltro(xs). Prefixo `pr`. */
"use strict";
S.ord.ran=S.ord.ran||'';
function prRanSit(o){ const r=o.rdb||{}; if(r.ent||(r.fim&&r.fim.st==='encerrado')) return 'ent'; if(r.sep) return 'sep'; return 'nao'; }
function ranFiltro(xs){ const c={todos:0,ent:0,sep:0,nao:0}; xs.forEach(o=>{ if(o._pv) return; c.todos++; const k=prRanSit(o); c[k]++; if(k==='sep') c.naoT=(c.naoT||0)+1; });
  c.naoT=(c.naoT||0)+c.nao; S._ranN=c; const f=S.ord.ran; if(!f) return xs;
  return xs.filter(o=>{ if(o._pv) return false; const k=prRanSit(o); return f==='nao'?k!=='ent':k===f; }); }
{ const _vp=vProgramacao; vProgramacao=function(){ const h=_vp.apply(this,arguments); try{
    const c=S._ranN||{}, f=S.ord.ran||'', ops=[['','Todos',c.todos],['ent','Entregue',c.ent],['sep','Separado',c.sep],['nao','Não entregue',c.naoT]];
    const ui=`<span class="pr-ran"><span class="pf-lab">Rancho</span><div class="seg" role="group" aria-label="Rancho">${ops.map(([k,l,n])=>`<button data-act="pr-ran" data-v="${k}" aria-pressed="${f===k}" ${k==='sep'?'title="Separado no almoxarifado e ainda não entregue na linha"':k==='nao'?'title="Ainda não entregue na linha (separado ou não)"':''}>${l}<small class="num">${n||0}</small></button>`).join('')}</div></span>`;
    const k='<span style="display:inline-flex;gap:10px;align-items:center;margin-left:6px"><span class="pf-lab">Tipo</span>';
    return h.includes(k)?h.replace(k,ui+k):h; }catch(e){ console.warn('[programação] filtro do rancho',e); return h; } }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="pr-ran"]'); if(!b) return; ev.stopPropagation(); S.ord.ran=b.dataset.v||''; S.ord.aberta=null; render(); },true);
document.head.insertAdjacentHTML('beforeend',`<style id="pr-css">.pr-ran{display:inline-flex;gap:10px;align-items:center;margin-left:6px;flex-wrap:wrap}</style>`);
document.addEventListener('click',ev=>{ if(ev.target.closest&&ev.target.closest('[data-act="o-limpar-filtros"]')) S.ord.ran=''; },true);
