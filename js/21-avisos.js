/* Painel Colafix · 21-avisos.js — avisos das TVs: o RH (ou a administradora) publica em RH → Início → "Avisos nas TVs".
   Guardados em config/feriados.avisos (o RH já grava esse documento e todos leem — funciona com as regras atuais).
   Cada aviso: {id, t, sub, tipo: info|seg|festa|atencao, de, ate, por, em}. Nas telas novas (tvnPagina) passam numa faixa de lado. */
"use strict";
S.avTV=S.avTV||[];
setInterval(()=>{ try{ if(S.db&&S.uid&&!S._avSub){ S._avSub=S.db.doc('config/feriados').onSnapshot(d=>{ const x=(d&&d.exists&&d.data())||{}; S.avTV=x.avisos||[]; S.avAuto=x.avAnivOff?[]:(x.avisosAuto||[]); S.avLido=true; },()=>{ S._avSub=null; }); } }catch(e){} },2000);
const AV_TIPOS={info:{n:'Informativo',c:'#3F6F93',ic:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'},seg:{n:'Segurança',c:'#3C8A63',ic:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'},
  festa:{n:'Comemoração',c:'#8C5BA8',ic:'<path d="M4 20l5-14 9 9z"/><path d="M14 4l1 2M19 5l-2 1M20 10l-2-.5"/>'},atencao:{n:'Atenção',c:'#B5473F',ic:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'}};
const avSoLinhas=()=>{ try{ return (new URLSearchParams(location.search).get('linhas')||'').split(',').map(x=>x.trim()).filter(Boolean); }catch(e){ return []; } };
function avAtivos(){ const h=hojeStr(), so=avSoLinhas(); const novos=(S.avTV||[]).filter(a=>a&&String(a.t||'').trim()&&(!a.de||a.de<=h)&&(!a.ate||a.ate>=h)&&(!so.length||!(a.linhas||[]).length||(a.linhas||[]).some(l=>so.includes(l))));
  const ja=new Set((S.avTV||[]).map(a=>String(a.t||'').trim().toLowerCase())), velhos=((S.cfg||{}).tvRecados||[]).filter(r=>r&&String(r.t||'').trim()&&(!r.ate||r.ate>=h)&&!ja.has(String(r.t).trim().toLowerCase())).map(r=>({t:r.t,tipo:'info'})); /* sem repetir o que já foi para o quadro */
  const auto=(S.avAuto||[]).filter(a=>a&&String(a.t||'').trim()&&(!a.de||a.de<=h)&&(!a.ate||a.ate>=h)); /* parabéns dos aniversariantes (publicados pelo RH) */
  return auto.concat(novos,velhos); }
/* faixa da TV (opção B aprovada): um aviso por vez, na cor do tipo, trocando a cada AV_SEG segundos pelo relógio
   (continua de onde estava quando a tela é redesenhada). Lista completa escondida para leitores de tela. */
const AV_SEG=8;
/* tempo de cada aviso: 8 s, ou mais quando o texto é comprido (para dar tempo de ler rolando) — título cabe ~60 letras */
const avDur=a=>{ const cabe=a.tam==='g'?42:a.tam==='p'?80:60, n=Math.max(String(a.t||'').length-cabe,(String(a.sub||'').length-120)/2,0); return Math.max(AV_SEG,Math.round(5+n*0.2)); };
function avAgenda(xs){ const ds=xs.map(avDur), tot=ds.reduce((x,y)=>x+y,0)||1; let t=(Date.now()/1000)%tot, k=0; while(k<ds.length-1&&t>=ds[k]){ t-=ds[k]; k++; } return {k,dur:ds[k],dec:t}; }
const avIdx=(n,xs)=>n>1?avAgenda(xs||avAtivos()).k:0;
function avFaixa(lista){ const xs=lista||avAtivos(); if(!xs.length) return ''; const n=xs.length, ag=n>1?avAgenda(xs):{k:0,dur:avDur(xs[0]),dec:(Date.now()/1000)%avDur(xs[0])}, k=ag.k, a=xs[k], T=AV_TIPOS[a.tipo]||AV_TIPOS.info, prox=n>1?xs[(k+1)%n]:null;
  const para=(a.linhas||[]).length?a.linhas.join(' · '):'Toda a fábrica', atraso=-ag.dec, dur=ag.dur;
  const TM={p:1,m:2,g:3}, alt=['','p','m','g'][Math.max(...xs.map(x=>TM[x.tam]||2))], tam=a.tam||'m';
  return `<div class="tva tvb alt-${alt} tam-${tam}" style="--c:${T.c}" data-k="${k}" data-n="${n}" data-dur="${dur}">
    <i class="tvb-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${T.ic}</svg></i>
    <div class="tvb-tx" style="--atraso:${atraso.toFixed(2)}s"><small>${esc(T.n.toUpperCase())} · ${esc(para.toUpperCase())}</small><b><span class="tvb-mv">${esc(a.t)}</span></b>${a.sub?`<em><span class="tvb-mv">${esc(a.sub)}</span></em>`:''}</div>
    ${n>1?`<div class="tvb-nav"><strong>${k+1} de ${n}</strong><span class="tvb-dots">${xs.map((_,i)=>`<i class="${i===k?'on':''}"></i>`).join('')}</span>${prox?`<span class="tvb-prox">a seguir: ${esc(prox.t)}</span>`:''}</div><u class="tvb-bar" style="animation-duration:${dur}s;animation-delay:${atraso.toFixed(2)}s"></u>`:''}
    <ul class="tvb-sr">${xs.map(x=>`<li>${esc(x.t)}${x.sub?' · '+esc(x.sub):''}</li>`).join('')}</ul></div>`; }
/* texto que não cabe: fica parado no começo, desliza até o fim e para antes de trocar (só quando passa da largura) */
function avRolagem(){ document.querySelectorAll('.tvb').forEach(el=>{ if(el.dataset.med==='1') return; el.dataset.med='1';
  el.querySelectorAll('.tvb-mv').forEach(mv=>{ const caixa=mv.parentElement, dif=mv.scrollWidth-caixa.clientWidth;
    if(dif>4){ mv.style.setProperty('--dx',(-dif-24)+'px'); mv.style.animationDuration=(+el.dataset.dur||AV_SEG)+'s'; mv.classList.add('rola'); } }); }); }
setInterval(avRolagem,300);
/* troca o aviso sozinha, sem esperar a tela inteira ser redesenhada */
setInterval(()=>{ document.querySelectorAll('.tvb').forEach(el=>{ if(el.closest('.avx-tv')) return; const n=+el.dataset.n||0; if(n<2) return; if(+el.dataset.k!==avIdx(n)){ const h=avFaixa(); if(h) el.outerHTML=h; } }); },1000);
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
.tvb{position:relative;display:flex!important;align-items:center;gap:28px;height:128px!important;padding:0 34px;border-radius:18px;background:var(--c)!important;color:#FFFFFF;overflow:hidden;box-shadow:none!important}
.tvb-ic{flex:none;width:88px;height:88px;border-radius:20px;background:rgba(255,255,255,.18);display:inline-flex;align-items:center;justify-content:center}.tvb-ic svg{width:52px;height:52px;fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tvb-tx{flex:1;min-width:0;display:flex;flex-direction:column}.tvb-tx small{font-size:18px;font-weight:700;letter-spacing:.14em;opacity:.88}.tvb-tx b{font-size:46px;font-weight:800;line-height:1.1;white-space:nowrap;overflow:hidden}.tvb-tx em{font-style:normal;font-size:24px;opacity:.92;white-space:nowrap;overflow:hidden}
.tvb-mv{display:inline-block;white-space:nowrap}.tvb-mv.rola{animation-name:tvbRola;animation-timing-function:linear;animation-iteration-count:infinite;animation-delay:var(--atraso,0s);will-change:transform}
.tvb-tx b:has(.rola),.tvb-tx em:has(.rola){-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 36px),transparent);mask-image:linear-gradient(90deg,transparent 0,#000 18px,#000 calc(100% - 36px),transparent)}
@keyframes tvbRola{0%,18%{transform:translateX(0)}82%,100%{transform:translateX(var(--dx,0))}}
.tvb-nav{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:420px}.tvb-nav strong{font-size:30px;font-weight:800}.tvb-dots{display:flex;gap:8px}.tvb-dots i{width:12px;height:12px;border-radius:6px;background:rgba(255,255,255,.45)}.tvb-dots i.on{width:28px;background:#FFFFFF}
.tvb-prox{font-size:17px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px}
.tvb-bar{position:absolute;left:0;bottom:0;height:6px;width:0;background:rgba(255,255,255,.8);animation-name:tvbEnche;animation-timing-function:linear;animation-iteration-count:infinite;text-decoration:none}
@keyframes tvbEnche{from{width:0}to{width:100%}}
.tvb.alt-p{height:96px!important}.tvb.alt-g{height:184px!important}
.tvb.tam-p .tvb-ic{width:64px;height:64px;border-radius:16px}.tvb.tam-p .tvb-ic svg{width:38px;height:38px}.tvb.tam-p .tvb-tx small{font-size:15px}.tvb.tam-p .tvb-tx b{font-size:34px}.tvb.tam-p .tvb-tx em{font-size:20px}
.tvb.tam-g .tvb-ic{width:124px;height:124px;border-radius:26px}.tvb.tam-g .tvb-ic svg{width:72px;height:72px}.tvb.tam-g .tvb-tx small{font-size:22px}.tvb.tam-g .tvb-tx b{font-size:66px}.tvb.tam-g .tvb-tx em{font-size:30px}.tvb.tam-g .tvb-nav strong{font-size:36px}
.tvb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0;padding:0}
@media (prefers-reduced-motion:reduce){.tvb-bar{animation:none}.tvb-mv.rola{animation-duration:16s!important}}

</style>`);
/* ---------- editor de avisos em Telas de TV (quem grava no painel: produção, gestor, administradora) ---------- */
const AV_TN=Object.fromEntries(Object.entries(AV_TIPOS).map(([k,v])=>[k,v.n]));
function avPodeEditar(){ try{ if(dbMaster()) return true; const pf=S.acs&&S.acs.doc&&S.acs.doc.perfil; return !!pf&&!['ver','tv','cal','silosver','consulta','tvtodas','rh','tablet','chamados','producao','auditor','tvman'].includes(pf); }catch(e){ return false; } }
function avEditor(){ if(!avPodeEditar()) return ''; return '<div style="margin-top:16px">'+window.avxRender({pre:'av-',idp:'av-',avisos:S.avTV||[],form:S.avf,linhas:linhasOrd(),sub:'Passam no rodapé das TVs. Escolha toda a fábrica ou uma linha. O RH também publica em RH → Início.'})+'</div>'; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="av-"]'); if(!b) return; const a=b.dataset.act, h=hojeStr();
  const le=()=>{ const g=(i,d)=>{ const e=document.getElementById(i); return e?e.value:d; }; if(S.avf) Object.assign(S.avf,{t:g('av-t',S.avf.t||''),sub:g('av-s',S.avf.sub||''),de:g('av-de',S.avf.de),ate:g('av-ate',S.avf.ate)}); };
  const salva=async(xs,msg)=>{ try{ await S.db.doc('config/feriados').set({avisos:xs},{merge:true}); S.avTV=xs; S.avf=null; toast(msg); }catch(e){ toast('Não foi possível salvar: '+((e&&e.message)||e)); } render(); };
  if(a==='av-novo'){ S.avf={tipo:'info',linhas:[],per:'hoje',de:h,ate:h}; render(); return; }
  if(a==='av-ed'){ const x=(S.avTV||[]).find(y=>y.id===b.dataset.id); if(!x) return; S.avf=Object.assign({},x,{edit:x.id,linhas:(x.linhas||[]).slice(),per:'datas'}); render(); return; }
  if(a==='av-per'){ le(); S.avf.per=b.dataset.v; if(b.dataset.v!=='datas'){ S.avf.de=h; S.avf.ate=window.avxPer(b.dataset.v,h); } render(); return; }
  if(a==='av-canc'){ S.avf=null; render(); return; }
  if(a==='av-ln'){ le(); const v=b.dataset.v, L=S.avf.linhas||[]; S.avf.linhas=!v?[]:L.includes(v)?L.filter(x=>x!==v):L.concat([v]); render(); return; }
  if(a==='av-tipo'){ le(); S.avf.tipo=b.dataset.v; render(); return; }
  if(a==='av-tam'){ le(); S.avf.tam=b.dataset.v; render(); return; }
  if(a==='av-ok'){ le(); const F=S.avf; if(String(F.t||'').trim().length<3) return toast('Escreva o aviso.'); if(F.ate&&F.de&&F.ate<F.de) return toast('A data final é antes da inicial.');
    if(F.per&&F.per!=='datas'){ F.de=h; F.ate=window.avxPer(F.per,h); }
    const novo={id:F.edit||'a'+Date.now().toString(36),t:F.t.trim(),sub:String(F.sub||'').trim(),tipo:F.tipo||'info',linhas:F.linhas||[],tam:F.tam||'m',de:F.de||h,ate:F.ate||'',por:(S.perfil&&S.perfil.nome)||'',em:new Date().toISOString()};
    const base=(S.avTV||[]).filter(x=>(!x.ate||x.ate>=addDias(h,-30))&&x.id!==novo.id);
    return salva(base.concat([novo]),F.edit?'Aviso atualizado nas TVs.':'Aviso publicado nas TVs.'); }
  if(a==='av-x'){ const x=(S.avTV||[]).find(y=>y.id===b.dataset.id); if(!x||!confirm('Remover o aviso "'+x.t+'" das TVs?')) return; return salva((S.avTV||[]).filter(y=>y.id!==x.id),'Aviso removido das TVs.'); } });
document.head.insertAdjacentHTML('beforeend','<style id="av-ed-css">.tva-ln{text-decoration:none;display:inline-block;background:#143F54;color:#FFFFFF;font-size:.7em;letter-spacing:.08em;padding:3px 8px;border-radius:6px;margin-right:10px;vertical-align:.18em}.av-l{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}.av-l>i{min-height:38px;border-radius:5px}.av-l small{display:block;color:var(--muted)}.av-f{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:12px;background:var(--sunken)}</style>');
/* recados do sistema antigo (config/geral.tvRecados) passam para o quadro de avisos, para poder editar e remover */
setInterval(async()=>{ try{ const rs=((S.cfg||{}).tvRecados||[]).filter(r=>r&&String(r.t||'').trim()); const pf=S.acs&&S.acs.doc&&S.acs.doc.perfil, pode=avPodeEditar(), rh=pf==='rh'; if(!rs.length||!S.avLido||S._avMig||!(pode||rh)) return; S._avMig=true;
    const h=hojeStr(), ja=new Set((S.avTV||[]).map(a=>String(a.t||'').trim().toLowerCase())), novos=rs.filter(r=>!ja.has(String(r.t).trim().toLowerCase())&&(!r.ate||r.ate>=h)).map((r,i)=>({id:'rec'+Date.now().toString(36)+i,t:String(r.t).trim(),sub:'',tipo:'info',linhas:[],tam:'m',de:h,ate:r.ate||'',por:'recado antigo',em:new Date().toISOString()}));
    if(novos.length) await S.db.doc('config/feriados').set({avisos:(S.avTV||[]).concat(novos)},{merge:true});
    if(pode){ await S.db.doc('config/geral').set({tvRecados:[]},{merge:true}); S.cfg.tvRecados=[]; } /* o RH não grava config/geral: a TV não repete o recado (avAtivos) */ if(novos.length) toast(novos.length===1?'O recado antigo das TVs agora está no quadro de avisos, para editar.':novos.length+' recados antigos das TVs agora estão no quadro de avisos.'); render(); }
  catch(e){ console.warn('[avisos] migrar recados antigos',e); } },3000);
/* ===FIM AVISOS=== */

/* ---------- visual novo do quadro de avisos (usado em Telas de TV e no Início do RH) ----------
   window.avxRender({pre, idp, avisos, form, linhas, aniv, hoje, sub}) devolve o quadro inteiro.
   Ações: pre+'novo' | 'x' | 'ed' | 'tipo' | 'ln' | 'per' | 'ok' | 'canc'; campos: idp+'t' | 's' | 'de' | 'ate'. */
window.avFaixaHtml=lista=>avFaixa(lista);
window.avLinhas=()=>{ try{ return linhasOrd(); }catch(e){ return []; } };
const AVX_DIAS=['dom','seg','ter','qua','qui','sex','sáb'];
const avxDia=iso=>{ if(!iso) return ''; const d=new Date(iso+'T12:00:00'); return AVX_DIAS[d.getDay()]+', '+iso.slice(8,10)+'/'+iso.slice(5,7); };
window.avxRender=function(o){ const P=o.pre, I=o.idp, h=o.hoje||hojeStr(), F=o.form, xs=(o.avisos||[]).filter(a=>!a.ate||a.ate>=h).sort((a,b)=>String(a.de||'').localeCompare(String(b.de||'')));
  const ic=t=>`<svg viewBox="0 0 24 24" aria-hidden="true">${(AV_TIPOS[t]||AV_TIPOS.info).ic}</svg>`;
  const cartao=a=>{ const T=AV_TIPOS[a.tipo]||AV_TIPOS.info, futuro=a.de&&a.de>h;
    return `<article class="avx-c" style="--c:${T.c}"><i class="avx-ic">${ic(a.tipo)}</i><div class="avx-tx"><b>${esc(a.t)}</b>${a.sub?`<small>${esc(a.sub)}</small>`:''}
      <div class="avx-tags"><span class="avx-st ${futuro?'prog':'on'}">${futuro?'A partir de '+avxDia(a.de):'● No ar agora'}</span><span>${T.n}</span><span>${(a.linhas||[]).length?esc(a.linhas.join(' · ')):'Toda a fábrica'}</span><span>${a.ate?(a.ate===h?'só hoje':'até '+avxDia(a.ate)):'sem data para sair'}</span><span>${{p:'pequeno',g:'grande'}[a.tam]||'médio'} na TV</span></div></div>
      <div class="avx-ac"><button class="lnk" data-act="${P}ed" data-id="${esc(a.id)}">Editar</button><button class="lnk avx-rm" data-act="${P}x" data-id="${esc(a.id)}">Remover</button></div></article>`; };
  let form='';
  if(F){ const T=AV_TIPOS[F.tipo]||AV_TIPOS.info, per=F.per||'hoje';
    form=`<div class="avx-f"><div class="avx-fh"><b>${F.edit?'Editar aviso':'Novo aviso'}</b><button class="lnk" data-act="${P}canc">Cancelar</button></div>
      <label class="avx-lb"><span>O que vai aparecer na TV</span><input class="txt avx-big" id="${I}t" maxlength="70" value="${esc(F.t||'')}" placeholder="Ex.: Reunião de segurança hoje às 15h"></label>
      <label class="avx-lb"><span>Detalhe (opcional)</span><input class="txt" id="${I}s" maxlength="80" value="${esc(F.sub||'')}" placeholder="Ex.: No refeitório · todos os turnos"></label>
      <div class="avx-lb"><span>Tipo</span><div class="avx-tipos">${Object.entries(AV_TIPOS).map(([k,v])=>`<button class="avx-tp" data-act="${P}tipo" data-v="${k}" aria-pressed="${(F.tipo||'info')===k}" style="--c:${v.c}"><i>${ic(k)}</i>${v.n}</button>`).join('')}</div></div>
      ${o.linhas&&o.linhas.length?`<div class="avx-lb"><span>Para</span><div class="chips"><button class="chip" data-act="${P}ln" data-v="" aria-pressed="${!(F.linhas||[]).length}">Toda a fábrica</button>${o.linhas.map(l=>`<button class="chip" data-act="${P}ln" data-v="${esc(l)}" aria-pressed="${(F.linhas||[]).includes(l)}">${esc(l)}</button>`).join('')}</div></div>`:''}
      <div class="avx-lb"><span>Por quanto tempo</span><div class="chips">${[['hoje','Só hoje'],['3d','3 dias'],['7d','1 semana'],['datas','Escolher datas']].map(([k,n])=>`<button class="chip" data-act="${P}per" data-v="${k}" aria-pressed="${per===k}">${n}</button>`).join('')}</div>
        ${per==='datas'?`<div class="avx-datas"><label>De <input class="txt" type="date" id="${I}de" value="${esc(F.de||h)}"></label><label>Até <input class="txt" type="date" id="${I}ate" value="${esc(F.ate||h)}"></label></div>`:''}</div>
      <div class="avx-lb"><span>Tamanho na TV</span><div class="chips">${[['p','Pequeno'],['m','Médio'],['g','Grande']].map(([k,n])=>`<button class="chip" data-act="${P}tam" data-v="${k}" aria-pressed="${(F.tam||'m')===k}">${n}</button>`).join('')}</div></div>
      <div class="avx-lb"><span>Prévia (como fica na TV)</span><div class="avx-pv"><div class="avx-pvz">${avFaixa([{t:F.t||'Seu aviso aparece assim',sub:F.sub||'',tipo:F.tipo||'info',linhas:F.linhas||[],tam:F.tam||'m'}])}</div></div></div>
      <div class="avx-fb"><button class="btn sec" data-act="${P}canc">Cancelar</button><button class="btn" data-act="${P}ok">${F.edit?'Salvar alterações':'Publicar nas TVs'}</button></div></div>`; }
  const A=o.aniv, aniv=A?`<div class="avx-aniv"><i class="avx-ic" style="--c:#8C5BA8">${ic('festa')}</i><div><b>Parabéns dos aniversariantes</b><small>${A.on?(A.hoje.length?'Hoje nas TVs: '+esc(A.hoje.join(', ')):'Ninguém faz aniversário hoje')+(A.prox.length?' · próximos: '+esc(A.prox.join(', ')):''):'Desligado: os parabéns não passam nas TVs'}</small></div>
      <label class="avx-sw"><input type="checkbox" data-avx-aniv="${A.act}" ${A.on?'checked':''} aria-label="Parabéns dos aniversariantes nas TVs"><span></span><em>${A.on?'Ligado':'Desligado'}</em></label></div>`:'';
  const noAr=(o.autoHoje||[]).concat(xs.filter(a=>!a.de||a.de<=h)); /* a prévia sai da lista do próprio quadro (já atualizada ao salvar) */
  const prev=noAr.length?`<div class="avx-prev"><span>Assim aparece na TV agora</span><div class="avx-tv">${avFaixa(noAr)}</div></div>`:'';
  return `<section class="card avx${o.compacto?' avx-mini':''}"><div class="avx-cab"><div><h2>Avisos nas TVs</h2><p>${esc(o.sub||'Passam no rodapé de todas as TVs da fábrica, um atrás do outro.')}</p></div>${F?'':`<button class="btn" data-act="${P}novo">+ Novo aviso</button>`}</div>
    ${form}${prev}${aniv}
    ${xs.length?`<div class="avx-grid">${xs.map(cartao).join('')}</div>`:(F?'':o.compacto?`<div class="avx-vz1">Nenhum aviso publicado. Use <b>+ Novo aviso</b> para mandar um recado para a fábrica.</div>`:`<div class="avx-vz"><b>Nenhum aviso nas TVs</b><span>Publique um recado para a fábrica: reunião, segurança, comemoração ou atenção.</span></div>`)}</section>`; };
const avxPer=(per,h)=>per==='3d'?addDias(h,2):per==='7d'?addDias(h,6):h;
window.avxPer=avxPer;
document.head.insertAdjacentHTML('beforeend',`<style id="avx-css">
.avx-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}.avx-cab h2{margin:0;font-size:20px}.avx-cab p{margin:2px 0 0;color:var(--muted);font-size:14px}
.avx-prev{border-radius:14px;background:#0E1418;padding:10px 12px 12px;margin-bottom:12px}.avx-prev>span{display:block;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#9FB0B9;margin-bottom:8px}
.avx-tv{zoom:.62;--card:#172026;--tx:#EEF2F4;--tx2:#9FB0B9;--sombra:none}.avx-tv .tva{border-radius:12px}
.avx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:12px}
.avx-c{position:relative;display:grid;grid-template-columns:52px minmax(0,1fr);gap:4px 14px;padding:14px 16px;border-radius:14px;background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--c)}
.avx-ic{width:52px;height:52px;border-radius:12px;background:var(--c);display:inline-flex;align-items:center;justify-content:center;grid-row:span 3}.avx-ic svg{width:28px;height:28px;fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.avx-tx b{display:block;font-size:16.5px;line-height:1.3}.avx-tx small{display:block;color:var(--muted);font-size:13.5px;margin-top:2px}
.avx-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.avx-tags span{font-size:12px;padding:3px 9px;border-radius:999px;background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)}
.avx-tags .avx-st{font-weight:600;border:0}.avx-st.on{background:var(--ok-tint);color:var(--ok-ink)}.avx-st.prog{background:var(--teal-tint);color:var(--teal-strong)}
.avx-ac{display:flex;gap:14px;justify-content:flex-end;margin-top:6px}.avx-rm{color:var(--crit-ink)!important}
.avx-aniv{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 14px;border-radius:14px;margin-bottom:12px;background:color-mix(in srgb,#8C5BA8 8%,var(--surface));border:1px solid color-mix(in srgb,#8C5BA8 25%,transparent)}
.avx-aniv .avx-ic{grid-row:auto}.avx-aniv b{display:block;font-size:15.5px}.avx-aniv small{color:var(--muted);font-size:13.5px}
.avx-sw{display:flex;align-items:center;gap:8px;cursor:pointer}.avx-sw input{position:absolute;opacity:0;width:1px;height:1px}.avx-sw span{width:46px;height:26px;border-radius:13px;background:#C9D2D9;position:relative;transition:background .2s}
.avx-sw span::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#FFFFFF;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}.avx-sw input:checked+span{background:#8C5BA8}.avx-sw input:checked+span::after{left:23px}
.avx-sw input:focus-visible+span{outline:3px solid var(--teal-tint)}.avx-sw em{font-style:normal;font-size:13px;font-weight:600;color:var(--ink-2)}
.avx-f{border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;background:var(--surface-2);display:flex;flex-direction:column;gap:14px}
.avx-fh{display:flex;justify-content:space-between;align-items:baseline}.avx-fh b{font-size:17px}
.avx-lb{display:flex;flex-direction:column;gap:6px}.avx-lb>span{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.avx-big{font-size:18px!important;height:50px!important}
.avx-tipos{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.avx-tp{font:inherit;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;border:2px solid var(--line);background:var(--surface);cursor:pointer;font-weight:600;color:var(--ink);min-height:52px}
.avx-tp i{width:34px;height:34px;border-radius:9px;background:var(--c);display:inline-flex;align-items:center;justify-content:center}.avx-tp i svg{width:20px;height:20px;fill:none;stroke:#FFFFFF;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.avx-tp[aria-pressed=true]{border-color:var(--c);background:color-mix(in srgb,var(--c) 10%,var(--surface))}
.avx-datas{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}.avx-datas label{display:flex;align-items:center;gap:8px;font-size:14px}
.avx-pv{padding:10px;border-radius:12px;background:#0E1418;overflow:hidden}.avx-pvz{zoom:.5}
.avx-fb{display:flex;justify-content:flex-end;gap:10px}
.avx-vz{display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;padding:26px 12px;border:2px dashed var(--line);border-radius:14px;color:var(--muted)}.avx-vz b{color:var(--ink);font-size:16px}
@media (max-width:600px){.avx-grid{grid-template-columns:1fr}}
/* versão compacta (Início do RH) */
.avx-mini{padding:14px 18px!important}.avx-mini .avx-cab{margin-bottom:8px;align-items:center}.avx-mini .avx-cab h2{font-size:17px}.avx-mini .avx-cab p{font-size:13px}.avx-mini .avx-cab .btn{height:38px;padding:0 14px;font-size:14px}
.avx-mini .avx-prev{padding:6px 8px 8px;margin-bottom:8px;border-radius:10px}.avx-mini .avx-prev>span{font-size:10px;margin-bottom:4px}.avx-mini .avx-tv{zoom:.4}
.avx-mini .avx-aniv{grid-template-columns:34px minmax(0,1fr) auto;gap:10px;padding:7px 10px;margin-bottom:8px;border-radius:10px}.avx-mini .avx-aniv .avx-ic{width:34px;height:34px;border-radius:9px}.avx-mini .avx-aniv .avx-ic svg{width:19px;height:19px}
.avx-mini .avx-aniv b{font-size:14px}.avx-mini .avx-aniv small{font-size:12.5px}.avx-mini .avx-sw span{width:38px;height:22px}.avx-mini .avx-sw span::after{width:16px;height:16px}.avx-mini .avx-sw input:checked+span::after{left:19px}
.avx-mini .avx-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px}.avx-mini .avx-c{grid-template-columns:38px minmax(0,1fr);padding:10px 12px;gap:2px 10px}.avx-mini .avx-ic{width:38px;height:38px;border-radius:10px}.avx-mini .avx-ic svg{width:21px;height:21px}
.avx-mini .avx-tx b{font-size:14.5px}.avx-mini .avx-tx small{font-size:12.5px}.avx-mini .avx-tags{margin-top:5px;gap:4px}.avx-mini .avx-tags span{font-size:11px;padding:2px 7px}.avx-mini .avx-ac{margin-top:2px}
.avx-vz1{font-size:13.5px;color:var(--muted);padding:8px 2px}
</style>`);
