/* Painel Colafix · 21-avisos.js — avisos das TVs: o RH (ou a administradora) publica em RH → Início → "Avisos nas TVs".
   Guardados em config/feriados.avisos (o RH já grava esse documento e todos leem — funciona com as regras atuais).
   Cada aviso: {id, t, sub, tipo: info|seg|festa|atencao, de, ate, por, em}. Nas telas novas (tvnPagina) passam numa faixa de lado. */
"use strict";
S.avTV=S.avTV||[];
setInterval(()=>{ try{ if(S.db&&S.uid&&!S._avSub){ S._avSub=S.db.doc('config/feriados').onSnapshot(d=>{ const x=(d&&d.exists&&d.data())||{}; S.avTV=x.avisos||[]; S.avAuto=x.avAnivOff?[]:(x.avisosAuto||[]); },()=>{ S._avSub=null; }); } }catch(e){} },2000);
const AV_TIPOS={info:{n:'Informativo',c:'#3F6F93',ic:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'},seg:{n:'Segurança',c:'#3C8A63',ic:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'},
  festa:{n:'Comemoração',c:'#8C5BA8',ic:'<path d="M4 20l5-14 9 9z"/><path d="M14 4l1 2M19 5l-2 1M20 10l-2-.5"/>'},atencao:{n:'Atenção',c:'#B5473F',ic:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'}};
const avSoLinhas=()=>{ try{ return (new URLSearchParams(location.search).get('linhas')||'').split(',').map(x=>x.trim()).filter(Boolean); }catch(e){ return []; } };
function avAtivos(){ const h=hojeStr(), so=avSoLinhas(); const novos=(S.avTV||[]).filter(a=>a&&String(a.t||'').trim()&&(!a.de||a.de<=h)&&(!a.ate||a.ate>=h)&&(!so.length||!(a.linhas||[]).length||(a.linhas||[]).some(l=>so.includes(l))));
  const velhos=((S.cfg||{}).tvRecados||[]).filter(r=>r&&String(r.t||'').trim()&&(!r.ate||r.ate>=h)).map(r=>({t:r.t,tipo:'info'}));
  const auto=(S.avAuto||[]).filter(a=>a&&String(a.t||'').trim()&&(!a.de||a.de<=h)&&(!a.ate||a.ate>=h)); /* parabéns dos aniversariantes (publicados pelo RH) */
  return auto.concat(novos,velhos); }
function avFaixa(){ const xs=avAtivos(); if(!xs.length) return '';
  const card=a=>{ const T=AV_TIPOS[a.tipo]||AV_TIPOS.info; return `<span class="tva-c" style="--c:${T.c}"><i><svg viewBox="0 0 24 24" aria-hidden="true">${T.ic}</svg></i><span><b>${(a.linhas||[]).length?`<u class="tva-ln">${esc(a.linhas.join(' · ').toUpperCase())}</u>`:''}${esc(a.t)}</b>${a.sub?`<em>${esc(a.sub)}</em>`:''}</span></span>`; };
  const um=xs.map(card).join(''), chars=xs.reduce((n,a)=>n+String(a.t).length+String(a.sub||'').length+12,0), dur=Math.max(18,Math.round(chars*0.32));
  const atraso=-((Date.now()/1000)%dur); /* continua de onde estava quando a tela é redesenhada */
  return `<div class="tva" role="marquee" aria-label="Avisos"><div class="tva-l"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/></svg><b>AVISOS</b></div>
    <div class="tva-v"><div class="tva-t" style="animation-duration:${dur}s;animation-delay:${atraso.toFixed(2)}s">${um}${um}</div></div></div>`; }
/* as telas novas das TVs usam a faixa nova no lugar da antiga */
tvnRecados=function(){ return []; };
{ const _pg=tvnPagina; tvnPagina=function(cls,cab,corpo,rod){ return _pg.call(this,cls,cab,corpo+avFaixa(),rod); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="tva-css">
.tva{flex:none;display:flex;align-items:stretch;height:84px;border-radius:16px;overflow:hidden;background:var(--card,#FFFFFF);box-shadow:var(--sombra,0 2px 6px rgba(20,63,84,.08))}
.tva-l{flex:none;display:flex;align-items:center;gap:10px;padding:0 22px;background:#143F54;color:#FFFFFF}:root[data-theme="dark"] .tva-l{background:#1C2A33}
.tva-l svg{width:30px;height:30px;fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.tva-l b{font-size:17px;letter-spacing:.12em}
.tva-v{flex:1;min-width:0;overflow:hidden;display:flex;align-items:center;-webkit-mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent)}
.tva-t{display:flex;gap:18px;padding-left:18px;width:max-content;animation:tvaPassa linear infinite}
@keyframes tvaPassa{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.tva-c{display:flex;align-items:center;gap:14px;padding:8px 22px 8px 10px;border-radius:14px;background:color-mix(in srgb,var(--c) 12%,transparent);border:1px solid color-mix(in srgb,var(--c) 40%,transparent);white-space:nowrap}
.tva-c>i{width:50px;height:50px;border-radius:12px;background:var(--c);display:inline-flex;align-items:center;justify-content:center;flex:none}.tva-c>i svg{width:30px;height:30px;fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tva-c>span{display:flex;flex-direction:column;line-height:1.15}.tva-c b{font-size:26px;font-weight:700;color:var(--tx,#143F54)}.tva-c em{font-style:normal;font-size:18px;color:var(--tx2,#55666F)}
@media (prefers-reduced-motion:reduce){.tva-t{animation-duration:120s!important}}
</style>`);
/* ---------- editor de avisos em Telas de TV (quem grava no painel: produção, gestor, administradora) ---------- */
const AV_TN=Object.fromEntries(Object.entries(AV_TIPOS).map(([k,v])=>[k,v.n]));
function avPodeEditar(){ try{ if(dbMaster()) return true; const pf=S.acs&&S.acs.doc&&S.acs.doc.perfil; return !!pf&&!['ver','tv','cal','silosver','consulta','tvtodas','rh','tablet','chamados','producao','auditor','tvman'].includes(pf); }catch(e){ return false; } }
function avEditor(){ if(!avPodeEditar()) return ''; const h=hojeStr(), xs=(S.avTV||[]).filter(a=>!a.ate||a.ate>=h).sort((a,b)=>String(a.de||'').localeCompare(String(b.de||''))), F=S.avf, LS=linhasOrd();
  const lista=xs.length?xs.map(a=>{ const T=AV_TIPOS[a.tipo]||AV_TIPOS.info; return `<div class="av-l"><i style="background:${T.c}"></i><div><b>${esc(a.t)}</b>${a.sub?`<small>${esc(a.sub)}</small>`:''}<span class="sub" style="margin:2px 0 0">${T.n} · ${(a.linhas||[]).length?esc(a.linhas.join(', ')):'toda a fábrica'} · até ${a.ate?br(a.ate):'sem data'}</span></div><button class="lnk" data-act="av-x" data-id="${esc(a.id)}">Remover</button></div>`; }).join(''):'<div class="sub">Nenhum aviso nas TVs agora.</div>';
  const form=F?`<div class="av-f"><label><span class="label">Aviso *</span><input class="txt" id="av-t" maxlength="90" value="${esc(F.t||'')}" placeholder="Ex.: Troca de cor às 14h"></label><label><span class="label">Detalhe (opcional)</span><input class="txt" id="av-s" maxlength="90" value="${esc(F.sub||'')}" placeholder="Ex.: Preparar a limpeza do misturador"></label>
    <div><span class="label">Para</span><div class="chips" style="margin-top:6px"><button class="chip" data-act="av-ln" data-v="" aria-pressed="${!(F.linhas||[]).length}">Toda a fábrica</button>${LS.map(l=>`<button class="chip" data-act="av-ln" data-v="${esc(l)}" aria-pressed="${(F.linhas||[]).includes(l)}">${esc(l)}</button>`).join('')}</div></div>
    <div><span class="label">Tipo</span><div class="chips" style="margin-top:6px">${Object.entries(AV_TN).map(([k,n])=>`<button class="chip" data-act="av-tp" data-v="${k}" aria-pressed="${(F.tipo||'info')===k}">${n}</button>`).join('')}</div></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><label><span class="label">A partir de</span><input class="txt" type="date" id="av-de" value="${esc(F.de||h)}"></label><label><span class="label">Até</span><input class="txt" type="date" id="av-ate" value="${esc(F.ate||h)}"></label></div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sec" data-act="av-canc">Cancelar</button><button class="btn" data-act="av-ok">Publicar nas TVs</button></div></div>`:'';
  return `<div class="label" style="margin-top:16px">AVISOS NAS TVS</div><div class="sub" style="margin:2px 0 8px">Passam no rodapé das TVs. Escolha "toda a fábrica" ou uma linha (aparece com a etiqueta da linha). O RH também publica em RH → Início.</div>${F?form:'<button class="btn sec" data-act="av-novo">+ Novo aviso</button>'}<div style="margin-top:8px">${lista}</div>`; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="av-"]'); if(!b) return; const a=b.dataset.act, h=hojeStr();
  const le=()=>{ const g=i=>(document.getElementById(i)||{}).value||''; if(S.avf) Object.assign(S.avf,{t:g('av-t'),sub:g('av-s'),de:g('av-de'),ate:g('av-ate')}); };
  const salva=async(xs,msg)=>{ try{ await S.db.doc('config/feriados').set({avisos:xs},{merge:true}); S.avTV=xs; S.avf=null; toast(msg); }catch(e){ toast('Não foi possível salvar: '+((e&&e.message)||e)); } render(); };
  if(a==='av-novo'){ S.avf={tipo:'info',linhas:[],de:h,ate:h}; render(); return; }
  if(a==='av-canc'){ S.avf=null; render(); return; }
  if(a==='av-ln'){ le(); const v=b.dataset.v, L=S.avf.linhas||[]; S.avf.linhas=!v?[]:L.includes(v)?L.filter(x=>x!==v):L.concat([v]); render(); return; }
  if(a==='av-tp'){ le(); S.avf.tipo=b.dataset.v; render(); return; }
  if(a==='av-ok'){ le(); const F=S.avf; if(String(F.t||'').trim().length<3) return toast('Escreva o aviso.'); if(F.ate&&F.de&&F.ate<F.de) return toast('A data final é antes da inicial.');
    const novo={id:'a'+Date.now().toString(36),t:F.t.trim(),sub:String(F.sub||'').trim(),tipo:F.tipo||'info',linhas:F.linhas||[],de:F.de||h,ate:F.ate||'',por:(S.perfil&&S.perfil.nome)||'',em:new Date().toISOString()};
    return salva((S.avTV||[]).filter(x=>!x.ate||x.ate>=addDias(h,-30)).concat([novo]),'Aviso publicado nas TVs.'); }
  if(a==='av-x'){ const x=(S.avTV||[]).find(y=>y.id===b.dataset.id); if(!x||!confirm('Remover o aviso "'+x.t+'" das TVs?')) return; return salva((S.avTV||[]).filter(y=>y.id!==x.id),'Aviso removido das TVs.'); } });
document.head.insertAdjacentHTML('beforeend','<style id="av-ed-css">.tva-ln{text-decoration:none;display:inline-block;background:#143F54;color:#FFFFFF;font-size:.7em;letter-spacing:.08em;padding:3px 8px;border-radius:6px;margin-right:10px;vertical-align:.18em}.av-l{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}.av-l>i{min-height:38px;border-radius:5px}.av-l small{display:block;color:var(--muted)}.av-f{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:12px;background:var(--sunken)}</style>');
/* ===FIM AVISOS=== */
