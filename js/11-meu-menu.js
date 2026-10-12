/* Painel Colafix · 11-meu-menu.js — "Meu menu": a administradora escolhe quais módulos aparecem no menu dela.
   Só muda o menu (não tira permissão): ela continua abrindo qualquer tela pela busca ou por link, e os avisos continuam.
   Guardado em perfis/{uid}.menuOculto (vale em todos os aparelhos). */
"use strict";
S.menuOculto=[]; let mmLido=false;
setInterval(()=>{ if(mmLido||!S.db||!S.uid||!S.acs||!S.acs.pronto) return; mmLido=true; if(!S.acs.dono) return;
  S.db.doc('perfis/'+S.uid).get().then(g=>{ S.menuOculto=(g.exists&&g.data().menuOculto)||[]; render(); }).catch(e=>{ mmLido=false; console.warn('[meu menu]',e); }); },500);
MODS.push({id:'meumenu',nome:'Meu menu',ic:'olho',views:['meumenu']}); VIEWS.meumenu={nome:'Meu menu',ic:'olho',mob:'Menu'}; CRUMB.meumenu='Meu menu';
{ const _vo=viewOk; viewOk=function(v){ if(v==='meumenu') return !!(S.acs&&S.acs.dono); return _vo.apply(this,arguments); }; }
{ const _mv=modsVis; modsVis=function(){ const r=_mv.apply(this,arguments); if(!(S.acs&&S.acs.dono)||!S.menuOculto.length) return r; return r.filter(m=>m.id==='meumenu'||!S.menuOculto.includes(m.id)); }; }
S.extViews.meumenu=function(){ if(!(S.acs&&S.acs.dono)) return '<section class="card"><div class="empty">Só a administradora.</div></section>';
  const todos=_mvTodos(); const oc=S.menuOculto;
  return `<div class="head"><div><div class="eyebrow">ADMINISTRAÇÃO</div><h1>Meu menu</h1><div class="sub">Escolha o que aparece no <b>seu</b> menu. Isso não tira nenhum acesso: você continua abrindo qualquer tela pela busca (tecla /) e continua recebendo os avisos.</div></div></div>
    <section class="card mm">${todos.map(m=>`<label class="mm-r"><input type="checkbox" data-mm="${esc(m.id)}" ${oc.includes(m.id)?'':'checked'}><span class="mm-i">${ic(m.ic||'grid',18,2)}</span><span>${esc(m.nome)}</span><small>${oc.includes(m.id)?'escondido':'no menu'}</small></label>`).join('')}
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="lnk" data-act="mm-todos">Mostrar todos</button><span class="sub" style="margin:0">Salva sozinho, em todos os aparelhos.</span></div></section>`; };
function _mvTodos(){ const sal=S.menuOculto; S.menuOculto=[]; let xs=[]; try{ xs=modsVis(); }finally{ S.menuOculto=sal; } return xs.filter(m=>m.id!=='meumenu'); }
async function mmSalva(){ try{ await S.db.doc('perfis/'+S.uid).set({menuOculto:S.menuOculto},{merge:true}); }catch(e){ erro(e); } }
document.addEventListener('change',ev=>{ const t=ev.target; if(!(t.dataset&&t.dataset.mm)||!(S.acs&&S.acs.dono)) return; const id=t.dataset.mm;
  S.menuOculto=t.checked?S.menuOculto.filter(x=>x!==id):[...new Set(S.menuOculto.concat([id]))]; render(); mmSalva(); });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mm-todos"]'); if(!b||!(S.acs&&S.acs.dono)) return; S.menuOculto=[]; render(); mmSalva(); });
document.head.insertAdjacentHTML('beforeend','<style>.mm-r{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--line);cursor:pointer}.mm-r input{width:22px;height:22px}.mm-i{color:var(--teal-strong)}.mm-r small{color:var(--muted)}</style>');
/* ===FIM MEU MENU=== */
