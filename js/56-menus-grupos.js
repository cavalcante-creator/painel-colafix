/* Painel Colafix · 56-menus-grupos.js (26/10) — a mesma organização do menu do Marcelo (js/55) para a administradora e para o RH.
   Administradora (S.acs.dono, fora do "?gestor=1"): 17 módulos viram 9 itens na lateral; o grupo aberto mostra os módulos dentro
     (as abas de cada módulo não mudam): Meu dia · Produção (Produção · Análise PCP · Tablet da produção) ·
     Almoxarifado (Almoxarifado · Inventário · Monitor do rancho) · Silos (Silos · Nível dos silos · Celular dos silos) ·
     Manutenção · RH · Visão do gestor · Telas de TV · Sistema (Meu menu · Cópia de segurança). Módulo que não está em grupo vai no fim.
   RH sozinho (Juliana): 10 telas viram 6 itens, com abas no alto da tela: Início · Pessoas (Funcionários · Pessoas na empresa · Vagas) ·
     Prazos (Agenda · Férias e prazos) · Documentos (Fichas do mês · Documentos e contratos) · Almoço · Cadastros.
   Busca na lateral (a mesma caixa do js/55, `#gxs`): cada perfil com o que é dele — vazia mostra os avisos; digitando acha
     ações, telas, ordens/ranchos/fichas/itens (busca do topo, tpBusca), chamados abertos e pessoas do RH (window.RHBusca). */
"use strict";
const ADMG=[{id:'inicio'},{g:'Produção',ms:['producao','analise','tabprod']},{g:'Almoxarifado',ms:['premix','almox','monitor']},{g:'Silos',ms:['silos','silosver','silocel']},
  {id:'manut'},{id:'rh'},{id:'gestor'},{id:'telas'},{g:'Sistema',ic:'ajuste',ms:['meumenu','backup']}];
const RHG=[{v:'rhinicio'},{g:'Pessoas',ic:'equipe',vs:[['rhfunc','Funcionários'],['rhpres','Pessoas na empresa'],['rhvagas','Vagas']]},
  {g:'Prazos',ic:'cal2',vs:[['rhagenda','Agenda'],['rhferias','Férias e prazos']]},{g:'Documentos',ic:'folha',vs:[['rhfichas','Fichas do mês'],['rhdocs','Documentos e contratos']]},
  {v:'rhalmoco'},{v:'rhfuncoes'}];
const RH_SUB={rhterc:'rhfunc'};
function sbRhSolo(){ try{ const ms=modsVis(); return ms.length===1&&ms[0].id==='rh'; }catch(e){ return false; } }
function sbPerfil(){ try{ if(typeof gxSolo==='function'&&gxSolo()) return 'gx'; if(!S.acs||!S.acs.pronto) return ''; if(sbRhSolo()) return 'rh'; if(S.acs.dono) return 'adm'; }catch(e){} return ''; }
/* ---------------- administradora ---------------- */
function admNav(){ const nl=$('#navlist'); if(!nl) return; const ms=modsVis(), por={}; ms.forEach(m=>por[m.id]=m); const usados=new Set();
  const fora=['ajustes','itens','acessos'].includes(S.view), cur=id=>S.mod===id&&!fora;
  const um=m=>`<button class="navbtn" data-mod="${m.id}" ${cur(m.id)?'aria-current="page"':''}>${ic(m.ic)}<span>${esc(m.nome)}</span></button>`;
  let h=''; ADMG.forEach(g=>{ if(!g.ms){ const m=por[g.id]; if(m){ usados.add(m.id); h+=um(m); } return; }
    const xs=g.ms.map(id=>por[id]).filter(Boolean); xs.forEach(m=>usados.add(m.id)); if(!xs.length) return; if(xs.length===1){ h+=um(xs[0]); return; }
    const ab=xs.some(m=>cur(m.id));
    h+=`<button class="navbtn gxn-nb gxg-gr" data-mod="${xs[0].id}" ${ab?'data-aberto="1"':''}>${ic(g.ic||xs[0].ic)}<span>${esc(g.g)}</span></button>`
      +(ab?`<div class="gxg-sub">${xs.map(m=>`<button class="navbtn gxg-si" data-mod="${m.id}" ${cur(m.id)?'aria-current="page"':''}><span>${esc(m.nome)}</span></button>`).join('')}</div>`:''); });
  ms.filter(m=>!usados.has(m.id)).forEach(m=>{ h+=um(m); });
  nl.innerHTML=h; nl.dataset.sbg='adm'; gxsMonta(nl); }
/* ---------------- RH ---------------- */
function rhgDe(v){ v=RH_SUB[v]||v; return RHG.find(g=>g.vs?g.vs.some(t=>t[0]===v):g.v===v)||null; }
function rhNav(){ const nl=$('#navlist'); if(!nl||nl.dataset.sbg==='rh'&&nl.querySelector('.sbg-rh')) return; const bs={}; nl.querySelectorAll('[data-go]').forEach(b=>{ bs[b.dataset.go]=b; });
  if(!Object.keys(bs).some(v=>v.startsWith('rh'))) return; const curV=RH_SUB[S.view]||S.view, usados=new Set();
  const um=v=>{ const b=bs[v]; if(!b) return ''; usados.add(v); return b.outerHTML; };
  let h=''; RHG.forEach(g=>{ if(!g.vs){ h+=um(g.v); return; } const xs=g.vs.filter(t=>bs[t[0]]); xs.forEach(t=>usados.add(t[0])); if(!xs.length) return; if(xs.length===1){ usados.delete(xs[0][0]); h+=um(xs[0][0]); return; }
    const ab=xs.some(t=>t[0]===curV);
    h+=`<button class="navbtn gxg-gr" data-go="${xs[0][0]}" ${ab?'data-aberto="1"':''} ${ab&&curV===xs[0][0]?'aria-current="page"':''}>${ic(g.ic,18)}<span>${esc(g.g)}</span></button>`
      +(ab?`<div class="gxg-sub">${xs.map(([v,t])=>`<button class="navbtn gxg-si" data-go="${v}" ${curV===v?'aria-current="page"':''}><span>${esc(t)}</span></button>`).join('')}</div>`:''); });
  Object.keys(bs).filter(v=>!usados.has(v)).forEach(v=>{ h+=bs[v].outerHTML; });
  nl.innerHTML='<i class="sbg-rh" hidden></i>'+h; nl.dataset.sbg='rh'; gxsMonta(nl); }
function rhAbas(v){ const g=rhgDe(v); if(!g||!g.vs) return ''; const xs=g.vs.filter(t=>{ try{ return viewOk(t[0]); }catch(e){ return false; } }); if(xs.length<2) return ''; const cur=RH_SUB[v]||v;
  return `<nav class="gxg-tabs" aria-label="${esc(g.g)}"><span class="gxg-tt">${ic(g.ic,16)}${esc(g.g)}</span>${xs.map(([x,t])=>`<button class="gxg-tb" data-go="${x}" ${x===cur?'aria-current="page"':''}>${esc(t)}</button>`).join('')}</nav>`; }
/* as telas do RH são registradas depois (modulos/): o embrulho com as abas é posto na hora de desenhar */
{ const _r=render; render=function(){ try{ RHG.forEach(g=>(g.vs||[]).forEach(([v])=>{ const f=S.extViews&&S.extViews[v]; if(typeof f==='function'&&!f._sbg){ const w=function(){ const h=f.apply(this,arguments); try{ return sbRhSolo()?rhAbas(v)+h:h; }catch(e){ return h; } }; w._sbg=1; S.extViews[v]=w; } })); }catch(e){} return _r.apply(this,arguments); }; }
/* ---------------- ligação com a lateral ---------------- */
{ const _g=gxnNav; gxnNav=function(){ const p=sbPerfil(); if(p==='adm'||p==='rh'){ document.body.classList.remove('gx-solo','gx-mod'); return; } return _g.apply(this,arguments); }; }
{ const _rn=renderNav; renderNav=function(){ _rn.apply(this,arguments); try{ const p=sbPerfil(); document.body.classList.toggle('sbg-adm',p==='adm'); if(p==='adm') admNav(); else if(p==='rh') rhNav(); else if(p!=='gx'){ const w=$('#gxs'); if(w) w.remove(); } }catch(e){ console.warn('[menu]',e); } }; }
{ const nl=$('#navlist'); if(nl&&window.MutationObserver) new MutationObserver(()=>{ try{ if(sbPerfil()==='rh'&&!nl.querySelector('.sbg-rh')) rhNav(); }catch(e){} }).observe(nl,{childList:true}); }
/* ---------------- busca por perfil ---------------- */
const sbN=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function sbBate(q){ const ws=sbN(q).trim().split(/\s+/).filter(Boolean); return t=>{ const pal=sbN(t).split(/[^a-z0-9]+/).filter(Boolean); return ws.every(w=>pal.some(x=>x.startsWith(w)||(/\d/.test(w)&&x.includes(w)))); }; }
function sbClica(attrs,ms){ setTimeout(()=>{ const b=document.createElement('button'); Object.assign(b.dataset,attrs); b.hidden=true; document.body.appendChild(b); b.click(); b.remove(); },ms||80); }
const sbOk=v=>{ try{ return !!VIEWS[v]&&viewOk(v); }catch(e){ return false; } };
function sbRhAcoes(){ const xs=[];
  if(sbOk('rhfunc')){ xs.push(['Nova admissão','admitir contratar funcionário novo cadastro',()=>sbClica({act:'rh-admnova'})]); xs.push(['Novo desligamento','demitir desligar demissão saída',()=>sbClica({act:'rh-deslnovo'})]); }
  if(sbOk('rhferias')) xs.push(['Marcar férias','férias marcar programar',()=>go('rhferias')]);
  if(sbOk('rhdocs')) xs.push(['Gerar documento ou contrato','contrato documento advertência aviso termo',()=>go('rhdocs')]);
  if(sbOk('rhalmoco')){ xs.push(['Ausência no almoço','almoço ausência não almoça',()=>{ try{ RHAlmoco.ausencia(Painel); }catch(e){ go('rhalmoco'); } }]); xs.push(['Importar o Face ID / folha do almoço','csv face id almoço folha assinatura',()=>go('rhalmoco')]); }
  if(sbOk('rhvagas')) xs.push(['Nova vaga','vaga candidato contratar',()=>{ go('rhvagas'); sbClica({act:'rhv-vnova'},150); }]);
  if(sbOk('rhfichas')) xs.push(['Imprimir as fichas do mês','fichas epi uniforme imprimir',()=>go('rhfichas')]);
  return xs; }
function sbPessoas(q,bate,r){ try{ if(!window.RHBusca||!sbOk('rhfunc')) return; RHBusca.pessoas().filter(p=>bate(p.nome+' '+p.setor+' '+p.funcao)).slice(0,6)
  .forEach(p=>r.push({g:'Pessoas',t:p.nome,s:[p.funcao,p.setor,p.status&&p.status!=='Ativo'?p.status:''].filter(Boolean).join(' · '),run:()=>sbClica({act:'rh-pess',id:p.id},0)})); }catch(e){} }
function sbTelas(q,bate,r,filtro){ const vis=new Set(); Object.keys(VIEWS).forEach(v=>{ if(v==='modulos'||!sbOk(v)||(filtro&&!filtro(v))) return; const nm=VIEWS[v].nome, k=nm+' '+(CRUMB[v]||'')+' '+(VIEWS[v].mob||''); if(!bate(k)) return; const key=sbN(nm); if(vis.has(key)) return; vis.add(key);
  let mod=''; try{ const m=MODS.find(x=>x.id===modDe(v)); mod=m?m.nome:''; }catch(e){} const g=rhgDe(v); r.push({g:'Telas',t:nm,s:g&&g.g?g.g:mod,run:()=>go(v)}); }); }
function sbItensAdm(q){ const r=[], ws=sbN(q).trim(); if(!ws){ let xs=[]; try{ xs=tpAvisos(); }catch(e){} xs.slice(0,8).forEach(a=>r.push({g:'Precisa de você',t:(a.n>1?a.n+' · ':'')+a.t,s:a.s||'',c:a.c,run:()=>tpIr(a.acao)}));
    if(!r.length) r.push({g:'Precisa de você',t:'Tudo em ordem agora',s:'Nada fora do normal.',run:()=>go('inicio')}); return r; }
  const bate=sbBate(q);
  let ac=[]; try{ ac=tpMais().map(([a,t])=>[t,'',()=>tpAcao(a)]); }catch(e){}
  if(sbOk('medicao')) ac.push(['Registrar medição dos silos','silo medir nível medição',()=>go('medicao')]);
  if(sbOk('silorec')) ac.push(['Receber areia ou cimento no silo','silo nota fiscal carga receber',()=>go('silorec')]);
  if(sbOk('apconf')) ac.push(['Conferir apontamentos do posto','apontamento conferir pcp posto',()=>go('apconf')]);
  if(sbOk('manch')) ac.push(['Abrir chamado de manutenção','chamado os manutenção conserto',()=>{ go('manch'); sbClica({act:'man-novo'},150); }]);
  ac=ac.concat(sbRhAcoes());
  ac.forEach(([t,k,f])=>{ if(bate(t+' '+k)) r.push({g:'Fazer',t,s:'',run:f}); });
  sbTelas(q,bate,r);
  try{ tpBusca(q).slice(0,10).forEach(x=>r.push({g:x.g,t:x.t,s:x.s||'',run:()=>tpAbrir(x)})); }catch(e){}
  try{ if(sbOk('manch')){ const n=(q.match(/\d+/)||[])[0]; (S.chamados||[]).filter(c=>!manFechada(c)&&c.status!=='Cancelada'&&(n&&String(c.numero)===String(+n)||bate(['os',manNum(c.numero),c.linha,c.local,c.defeito,c.equip].join(' ')))).slice(0,5)
    .forEach(c=>r.push({g:'Chamados abertos',t:'OS '+manNum(c.numero)+' · '+(c.linha||''),s:String(c.defeito||'').slice(0,70),run:()=>{ go('manch'); sbClica({act:'man-abrir',n:String(c.numero)},120); }})); } }catch(e){}
  sbPessoas(q,bate,r); return r.slice(0,28); }
function sbItensRh(q){ const r=[], ws=sbN(q).trim(); if(!ws){ let xs=[]; try{ xs=avisosModulos(); }catch(e){} xs.slice(0,8).forEach(a=>r.push({g:'Precisa de você',t:a.titulo,s:a.texto||'',c:a.nivel==='crit'?'crit':'warn',run:()=>go(a.go||'rhinicio')}));
    sbRhAcoes().slice(0,4).forEach(([t,k,f])=>r.push({g:'Atalhos',t,s:'',run:f})); return r; }
  const bate=sbBate(q); sbPessoas(q,bate,r); sbRhAcoes().forEach(([t,k,f])=>{ if(bate(t+' '+k)) r.push({g:'Fazer',t,s:'',run:f}); });
  sbTelas(q,bate,r,v=>/^rh/.test(v)); return r.slice(0,24); }
{ const _i=gxsItens; gxsItens=function(q){ const p=sbPerfil(); if(p==='adm') return sbItensAdm(q); if(p==='rh') return sbItensRh(q); return _i.apply(this,arguments); }; }
/* Ctrl+K também para a administradora e o RH */
document.addEventListener('keydown',ev=>{ const p=sbPerfil(); if(p!=='adm'&&p!=='rh') return; if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ ev.preventDefault(); const i=$('#gxs-q'); i&&i.focus(); } });
document.head.insertAdjacentHTML('beforeend',`<style id="sbg-css">
body.sbg-adm #navlist .navbtn>span{flex:1;min-width:0}
</style>`);
