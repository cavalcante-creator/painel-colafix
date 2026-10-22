/* Painel Colafix · 36-topo-tema.js (22/10)
   1) Modo escuro para todos: botão no topo (Automático → Escuro → Claro), lembrado no aparelho (localStorage colafix.tema).
   2) Topo do gestor (cargo gestor): avisos do sino = os da Visão do gestor; ações rápidas do gestor; sem o botão MODO TV. */
"use strict";
/* ---------- tema ---------- */
function temaGet(){ try{ const t=localStorage.getItem('colafix.tema'); return t==='dark'||t==='light'?t:'auto'; }catch(e){ return 'auto'; } }
function temaSet(t){ try{ if(t==='auto') localStorage.removeItem('colafix.tema'); else localStorage.setItem('colafix.tema',t); }catch(e){} temaAplica(true); }
function temaAplica(forca){ if(document.body&&document.body.classList.contains('tv')) return; /* as TVs cuidam do tema delas */
  const t=temaGet(), de=document.documentElement, at=de.getAttribute('data-theme');
  if(t==='auto'){ if(at) de.removeAttribute('data-theme'); }
  else if(at!==t) de.setAttribute('data-theme',t);
  const b=document.getElementById('tp-tema'); if(b){ const ttl=t==='dark'?'Tema: escuro (toque para claro)':t==='light'?'Tema: claro (toque para automático)':'Tema: automático, segue o aparelho (toque para escuro)'; b.title=ttl; b.setAttribute('aria-label',ttl); b.innerHTML=temaIc(t); } }
function temaIc(t){ const lua='<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', sol='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', meio='<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>';
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t==='dark'?lua:t==='light'?sol:meio}</svg>`; }
temaAplica();
setInterval(()=>{ try{ temaAplica(); if(!document.getElementById('tp-tema')){ const s=document.getElementById('tp-sino'); if(s){ const b=document.createElement('button'); b.className='tp-ib'; b.id='tp-tema'; s.parentNode.insertBefore(b,s); temaAplica(); } } }catch(e){} },1500);
document.addEventListener('click',ev=>{ if(!(ev.target.closest&&ev.target.closest('#tp-tema'))) return; const t=temaGet(), nx=t==='auto'?'dark':t==='dark'?'light':'auto'; temaSet(nx); toast(nx==='dark'?'Modo escuro ligado.':nx==='light'?'Modo claro.':'Tema automático: segue o aparelho.'); });

/* ---------- topo do gestor ---------- */
{ const _av=tpAvisos; tpAvisos=function(){ if(!(typeof gxSolo==='function'&&gxSolo())) return _av.apply(this,arguments);
    let al=[]; try{ al=gxAlertas(); }catch(e){} return al.map(a=>({n:'',t:a.t,s:a.d||'',acao:a.n?'gxch:'+a.n:'gx:'+(a.go||'gxinicio'),c:a.c==='crit'?'crit':'warn'})); }; }
{ const _ir=tpIr; tpIr=function(acao){ const s=String(acao||''); if(s.startsWith('gxch:')){ S.tp.pop=null; tpFechaPop(); const b=document.createElement('button'); b.dataset.act='man-abrir'; b.dataset.n=s.slice(5); b.dataset.ir='1'; b.hidden=true; document.body.appendChild(b); b.click(); b.remove(); return; }
    if(s.startsWith('gx:')){ S.tp.pop=null; tpFechaPop(); go(s.slice(3)); return; } return _ir.apply(this,arguments); }; }
{ const _m=tpMais; tpMais=function(){ if(!(typeof gxSolo==='function'&&gxSolo())) return _m.apply(this,arguments); const ok=v=>{ try{ return viewOk(v); }catch(e){ return false; } }, xs=[];
    if(ok('gxacoes')) xs.push(['gx-acao','Nova ação no plano','']); if(ok('gxseg')) xs.push(['gx-seg','Preencher a segurança de hoje','']);
    if(ok('manprev')||ok('gxcal')) xs.push(['gx-prev','Programar preventiva','']); if(ok('manch')) xs.push(['gx-os','Abrir chamado de manutenção','']);
    if(ok('gxdia')) xs.push(['gx-pdf','Baixar o relatório do dia (PDF)','']); if(ok('gxpres')) xs.push(['gx-pres','Ver quem está na empresa','']); return xs; }; }
{ const _a=tpAcao; tpAcao=function(a){ if(!String(a).startsWith('gx-')) return _a.apply(this,arguments); S.tp.pop=null; tpFechaPop();
    const clica=(attrs)=>setTimeout(()=>{ const b=document.createElement('button'); Object.assign(b.dataset,attrs); b.hidden=true; document.body.appendChild(b); b.click(); b.remove(); },60);
    if(a==='gx-acao'){ go('gxacoes'); clica({act:'gx-ac-nova'}); return; }
    if(a==='gx-seg'){ clica({act:'gx-seg-ir',d:hojeStr()}); return; }
    if(a==='gx-prev'){ go(viewOk('manprev')?'manprev':'gxcal'); return; }
    if(a==='gx-os'){ clica({act:'gx-novaos'}); return; }
    if(a==='gx-pdf'){ S.gx.dia=hojeStr(); go('gxdia'); clica({act:'gx-pdf-dia'}); return; }
    if(a==='gx-pres'){ go('gxpres'); return; } }; }
/* sem MODO TV para o gestor (as TVs dele ficam em "TVs da fábrica") */
{ const _na=acsNavAjusta; acsNavAjusta=function(){ _na.apply(this,arguments); try{ if(typeof gxSolo==='function'&&gxSolo()){ const t=$('#tvbtn'); if(t) t.hidden=true; } }catch(e){} }; }

/* ---------- escuro nas telas novas (gestor, Pessoas hoje) ---------- */
{ const css=`
:root[data-theme="dark"] .gx-rt button.on{color:#E6EEF2}
:root[data-theme="dark"] .gx-hd1[aria-pressed="true"]{border-color:#7FB8CF;background:#1E3A48}
:root[data-theme="dark"] .gx-tu[aria-pressed="true"]{border-color:#7FB8CF;background:#1E3A48}
:root[data-theme="dark"] .gx-calf{border-color:#7FB8CF}
:root[data-theme="dark"] .gx-bar.big em,:root[data-theme="dark"] .gx-pdb em{background:#E6EEF2}
:root[data-theme="dark"] #view [style*="background:#143F54"]{background:#5FA8C4!important}
:root[data-theme="dark"] .gxp-fx.ch{background:#2B4F5E;color:#E6EEF2}

:root[data-theme="dark"] .btn.sec.gx-del{background:transparent;border:1px solid #B5473F;color:#F2B8B2}
:root[data-theme="dark"] .gxp-fx.al{background:#24513A;color:#DDF2E4}
`; const st=document.createElement('style'); st.id='tema-gx'; st.textContent=css+css.replace(/:root\[data-theme="dark"\]/g,'@@').split('\n').filter(l=>l.trim()).map(l=>l.replace('@@',':root:not([data-theme="light"])')).join('\n').replace(/^/,'@media (prefers-color-scheme:dark){')+'}'; document.head.appendChild(st); }
