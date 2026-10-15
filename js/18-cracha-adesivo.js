/* Painel Colafix · 18-cracha-adesivo.js — crachá de adesivo da empresa (código de barras próprio) lido pelo coletor.
   Cada crachá do painel pode ter o campo "adesivo" (crachas/{id}.adesivo). Quando o coletor lê esse código,
   o painel trata exatamente como o crachá daquela pessoa (tablet/computador da parede, Cheguei/Terminei, teste de leitura). */
"use strict";
const crAdNorm=v=>String(v==null?'':v).trim().toUpperCase().replace(/\s+/g,'');
function crPorAdesivo(cod){ const v=crAdNorm(cod); if(v.length<3) return null; try{ return (S.cr.lista||[]).find(c=>c.adesivo&&crAdNorm(c.adesivo)===v)||null; }catch(e){ return null; } }
function crAdesivoCampo(c){ const pode=crPodeGerir();
  return `<label class="cr-adl" title="Clique no campo e passe o crachá de adesivo no coletor"><span>Adesivo</span><input class="txt cr-ad" data-cr-ad="${esc(c._id)}" value="${esc(c.adesivo||'')}" placeholder="passe no coletor" maxlength="40" autocomplete="off" ${pode?'':'disabled'}></label>`; }
async function crAdesivoSalva(id,val){ const v=crAdNorm(val), c=(S.cr.lista||[]).find(x=>x._id===id); if(!c) return;
  if(v&&v.length<3){ toast('Código do adesivo muito curto.'); render(); return; }
  const outro=v&&(S.cr.lista||[]).find(x=>x._id!==id&&((x.adesivo&&crAdNorm(x.adesivo)===v)||x.codigo===v));
  if(outro){ toast('Esse adesivo já está no crachá de '+outro.nome+'.'); render(); return; }
  if(crAdNorm(c.adesivo)===v) return;
  try{ await S.db.doc('crachas/'+id).update({adesivo:v||null}); c.adesivo=v||null; toast(v?'Adesivo '+v+' ligado ao crachá de '+c.nome+'.':'Adesivo removido do crachá de '+c.nome+'.'); }
  catch(e){ toast('Não foi possível salvar: '+(e.message||e)); } render(); }
document.addEventListener('change',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.crAd!=null&&crPodeGerir()) crAdesivoSalva(t.dataset.crAd,t.value); });
/* Enter no campo (o coletor manda Enter no fim): salva na hora sem disparar a leitura de crachá */
document.addEventListener('keydown',ev=>{ const t=ev.target; if(ev.key==='Enter'&&t&&t.dataset&&t.dataset.crAd!=null){ ev.preventDefault(); ev.stopPropagation(); t.blur(); } },true);
/* diagnóstico do coletor: no tablet/computador da parede e na tela de Crachás, um código bipado que não é
   reconhecido mostra o que foi lido (antes ficava em silêncio e não dava para saber o que estava errado) */
const CRD={buf:'',t:0,n:0};
window.addEventListener('keydown',ev=>{ if(S.view!=='mancrachas') return; /* na janela: escuta antes do leitor (que bloqueia a rajada) e não interfere nele */ if(ev.ctrlKey||ev.altKey||ev.metaKey) return;
  const a=document.activeElement; if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT')) return;
  const agora=performance.now(), gap=agora-CRD.t; CRD.t=agora;
  if(ev.key==='Enter'){ const cod=CRD.buf.trim(), n=CRD.n; CRD.buf=''; CRD.n=0; if(cod.length<3||n<3) return;
    const conhecido=crPorAdesivo(cod)||/^(CH|RA|EQ|OP)-/i.test(cod)||/^CX[A-Z0-9]{8}$/i.test(cod)||/CRACHA/i.test(cod)||/(rancho|chamado|equip)=/i.test(cod);
    if(!conhecido) setTimeout(()=>toast('O coletor leu "'+cod+'", mas não é um crachá cadastrado. Ligue esse código a um crachá em Manutenção → Crachás (campo Adesivo).'),50);
    else if(gap>(S.view==='mantotem'?400:120)) setTimeout(()=>toast('O coletor leu "'+cod+'" devagar demais para o painel aceitar. Tente de novo; se repetir, me avise o modelo do coletor.'),50);
    return; }
  if(ev.key&&ev.key.length===1){ if(gap>(S.view==='mantotem'?300:80)){ CRD.buf=''; CRD.n=0; } CRD.buf+=ev.key; CRD.n++; if(CRD.buf.length>40) CRD.buf=CRD.buf.slice(-40); } },true);
/* campo invisível de captura no modo tablet: recebe o que qualquer coletor "digitar" (teclas, códigos Alt, colar)
   e processa no Enter. Assim funciona mesmo com coletores que o ouvinte de teclas não enxerga. */
function crCapPoe(){ let i=document.getElementById('cr-cap');
  if(S.view!=='mantotem'){ if(i) i.remove(); return; }
  if(!i){ i=document.createElement('input'); i.id='cr-cap'; i.type='text'; i.autocomplete='off'; i.setAttribute('aria-hidden','true'); i.tabIndex=-1; i.className='cr-cap'; document.body.appendChild(i); }
  const a=document.activeElement; if(a!==i&&(!a||a===document.body||a===document.documentElement||a.tagName==='BUTTON'||a.tagName==='VIDEO')) i.focus({preventScroll:true}); }
function crCapLeu(cod){ cod=String(cod||'').trim(); if(cod.length<3) return;
  const conhecido=crPorAdesivo(cod)||/^(CH|RA|EQ|OP)-/i.test(cod)||/^CX[A-Z0-9]{8}$/i.test(cod)||/CRACHA/i.test(cod)||/(rancho|chamado|equip)=/i.test(cod);
  if(conhecido){ cbLeu(cod); return; }
  toast('O coletor leu "'+cod+'", mas não é um crachá cadastrado. Ligue esse código a um crachá em Manutenção → Crachás (campo Adesivo).'); }
/* fim da leitura: Enter ou Tab; coletor que não manda nada no fim é processado sozinho 500 ms depois da última letra */
let crCapT=null;
document.addEventListener('keydown',ev=>{ const t=ev.target; if(!t||t.id!=='cr-cap'||(ev.key!=='Enter'&&ev.key!=='Tab')) return; ev.preventDefault(); clearTimeout(crCapT); const v=t.value; t.value=''; if(v.trim()) crCapLeu(v); });
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||t.id!=='cr-cap') return; clearTimeout(crCapT); crCapT=setTimeout(()=>{ const v=t.value; if(v.trim().length>=3){ t.value=''; crCapLeu(v); } },500); });

/* Teste do coletor (tela Crachás): mostra exatamente o que o coletor manda para o computador */
const CRT={ev:[],t0:0,fim:null,timer:null};
function crTesteCard(){ return `<section class="card cr-tst" id="cr-tst"><div class="label">TESTE DO COLETOR</div>
  <div class="sub" style="margin:4px 0 8px">Clique no campo e passe um crachá. O painel mostra o que o coletor mandou.</div>
  <input class="txt" id="cr-tst-in" autocomplete="off" placeholder="clique aqui e passe o crachá no coletor" style="max-width:420px">
  <div id="cr-tst-out" class="cr-tst-out" aria-live="polite">Aguardando uma leitura…</div></section>`; }
function crTesteResumo(){ const i=document.getElementById('cr-tst-in'), o=document.getElementById('cr-tst-out'); if(!i||!o) return;
  const txt=i.value, teclas=CRT.ev.filter(e=>e.k&&e.k.length===1), alt=CRT.ev.some(e=>e.alt), cola=CRT.ev.some(e=>e.tipo==='insertFromPaste'||e.tipo==='insertText'&&!teclas.length);
  const ints=teclas.slice(1).map((e,j)=>e.t-teclas[j].t), med=ints.length?Math.round(ints.reduce((a,b)=>a+b,0)/ints.length):0;
  const modo=alt?'códigos Alt (Alt + números)':teclas.length?'teclas normais':(txt?'texto direto (sem teclas)':'nada chegou');
  const c=txt.trim(), cr=c?(crPorAdesivo(c)||(typeof crDe==='function'&&crDe(c))):null;
  o.innerHTML=`<b>Recebido:</b> "${esc(txt)}" (${txt.length} caracteres)<br><b>Teclas:</b> ${teclas.length} · intervalo médio ${med} ms<br><b>Terminou com:</b> ${CRT.fim||'nada (sem Enter nem Tab)'}<br><b>Modo:</b> ${modo}<br><b>Crachá:</b> ${cr?'é o crachá de '+esc(cr.nome):'não é um crachá cadastrado'+(c?' — ligue este código no campo Adesivo':'')}`;
  CRT.ev=[]; CRT.fim=null; i.value=''; }
window.addEventListener('keydown',ev=>{ if(!ev.target||ev.target.id!=='cr-tst-in') return; CRT.ev.push({k:ev.key,alt:ev.altKey,t:performance.now()});
  if(ev.key==='Enter'||ev.key==='Tab'){ ev.preventDefault(); ev.stopPropagation(); CRT.fim=ev.key; clearTimeout(CRT.timer); crTesteResumo(); } },true);
window.addEventListener('input',ev=>{ if(!ev.target||ev.target.id!=='cr-tst-in') return; CRT.ev.push({tipo:ev.inputType,t:performance.now()}); clearTimeout(CRT.timer); CRT.timer=setTimeout(crTesteResumo,700); });
function crTestePoe(){ if(S.view!=='mancrachas'||document.getElementById('cr-tst')) return; const v=document.getElementById('view'); if(!v) return; const h=v.querySelector('.head'); (h||v.firstElementChild||v).insertAdjacentHTML(h?'afterend':'afterbegin',crTesteCard()); }
{ const _r2=render; render=function(){ const x=_r2.apply(this,arguments); try{ crTestePoe(); }catch(e){} return x; }; }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ crCapPoe(); }catch(e){} return x; }; }
setInterval(()=>{ try{ crCapPoe(); }catch(e){} },800);
document.head.insertAdjacentHTML('beforeend',`<style id="cr-ad-css">.cr-adl{display:inline-flex;align-items:center;gap:6px;margin-right:6px}.cr-adl span{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--muted);text-transform:uppercase}.cr-ad{width:170px;height:36px;font-family:ui-monospace,monospace}.cr-tst-out{margin-top:10px;font-size:14px;line-height:1.6;background:var(--sunken,#ECE6D8);border-radius:10px;padding:10px 14px}
.cr-cap{position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;border:0;padding:0;pointer-events:none;z-index:-1}</style>`);
/* ===FIM ADESIVO=== */
