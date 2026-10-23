/* Painel Colafix · 44-chamados-teclado.js (23/10) — computador de chamados só com o TECLADO (sem mouse).
   No login "Chamados" (ttSoChamados), cada botão de escolha da tela ganha um número (1–9) e a tecla escolhe;
   0 = o botão de baixo (Cancelar / Voltar / + Abrir chamado); Esc = volta ao início; Enter nas telas de "pronto" volta ao início.
   O leitor de crachá também "digita": a tecla só vale se não vier outra em seguida (120 ms) — a rajada do coletor não escolhe nada;
   e o número digitado é tirado do campo do coletor (#cr-cap) para não estragar a próxima leitura. */
"use strict";
function ckOn(){ try{ return typeof ttAtivo==='function'&&ttAtivo()&&ttSoChamados()&&!(typeof poOn==='function'&&poOn())&&!(typeof ofOn==='function'&&ofOn()); }catch(e){ return false; } }
function ckBotoes(){ const m=document.querySelector('.cq .cq-main'); if(!m) return []; return [...m.querySelectorAll('.cq-bt')].filter(b=>!b.closest('.cq-rod')&&b.offsetParent!==null).slice(0,9); }
function ckRod(){ return document.querySelector('.cq .cq-main .cq-rod .cq-sec'); }
function ckMarca(){ if(!ckOn()) return; ckBotoes().forEach((b,i)=>{ if(b.querySelector('.ck-k')) return; b.insertAdjacentHTML('afterbegin',`<span class="ck-k" aria-hidden="true">${i+1}</span>`); b.setAttribute('aria-keyshortcuts',String(i+1)); });
  const r=ckRod(); if(r&&!r.querySelector('.ck-k')){ r.insertAdjacentHTML('afterbegin','<span class="ck-k">0</span>'); r.setAttribute('aria-keyshortcuts','0'); }
  const rod=document.querySelector('.cq .cq-main .cq-rod>span'); if(rod&&!rod.querySelector('.ck-dica')&&ckBotoes().length) rod.insertAdjacentHTML('beforeend','<small class="ck-dica"> · Teclado: o número escolhe · 0 = botão de baixo · Esc volta ao início</small>'); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ setTimeout(ckMarca,0); }catch(e){} return x; }; }
const ckK={t:0,pend:null};
function ckLimpaCap(n){ const i=document.getElementById('cr-cap'); if(i&&i.value.endsWith(n)) i.value=i.value.slice(0,-n.length); }
window.addEventListener('keydown',ev=>{ if(!ckOn()||ev.ctrlKey||ev.altKey||ev.metaKey||document.getElementById('trava-m')) return; const T=S.tt, ag=performance.now(), gap=ag-ckK.t; ckK.t=ag;
  if(ev.target&&/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)&&ev.target.id!=='cr-cap') return;
  if(gap<120){ if(ckK.pend){ clearTimeout(ckK.pend); ckK.pend=null; } if(/^[0-9]$/.test(ev.key)) return; }
  if(ev.key==='Escape'&&T.fase!=='espera'){ ev.preventDefault(); ev.stopImmediatePropagation(); ttVoltar(); return; }
  if(ev.key==='Enter'&&(T.fase==='ok'||T.fase==='fimok')&&gap>120){ ev.preventDefault(); ev.stopImmediatePropagation(); ttVoltar(); return; }
  if(!/^[0-9]$/.test(ev.key)||T.fase==='espera'||!T.p) return; const n=+ev.key;
  ckK.pend=setTimeout(()=>{ ckK.pend=null; if(!ckOn()) return; ckLimpaCap(String(n)); const b=n===0?ckRod():ckBotoes()[n-1]; if(b&&!b.disabled){ b.classList.add('ck-ap'); b.click(); } },120); },true);
document.head.insertAdjacentHTML('beforeend',`<style id="ck-css">
.cq .ck-k{display:inline-flex;align-items:center;justify-content:center;min-width:1.6em;height:1.6em;padding:0 .3em;margin-right:.5em;border-radius:8px;background:rgba(20,63,84,.12);border:2px solid currentColor;font-weight:800;font-size:.9em;line-height:1;vertical-align:middle;flex:0 0 auto}
.cq.esc .ck-k{background:rgba(255,255,255,.12)}.cq .cq-bt.crit .ck-k,.cq .cq-bt.ok .ck-k,.cq .cq-bt.pri .ck-k,.cq .cq-bt.warn .ck-k{background:rgba(255,255,255,.22)}
.cq .cq-bt{position:relative}.cq .cq-bt>.ck-k{position:absolute;top:10px;left:10px;margin:0}.cq .cq-bt:has(>.ck-k){padding-left:58px}
.cq .ck-dica{opacity:.75}.cq .cq-bt.ck-ap{outline:4px solid currentColor;outline-offset:2px}
</style>`);
/* tela de espera (posto, Nexus, oficina e chamados): os botões de baixo também ganham número (pedido de 23/10) */
function ckEsperaOn(){ try{ return typeof ttAtivo==='function'&&ttAtivo()&&S.tt&&(S.tt.fase==='espera'||!S.tt.p)&&!!document.querySelector('.cq .cq-tema'); }catch(e){ return false; } }
function ckEspBotoes(){ return [...document.querySelectorAll('.cq .cq-tema button')].filter(b=>b.offsetParent!==null).slice(0,9); }
function ckEspMarca(){ if(!ckEsperaOn()) return; ckEspBotoes().forEach((b,i)=>{ if(b.querySelector('.ck-k')) return; b.insertAdjacentHTML('afterbegin',`<span class="ck-k" aria-hidden="true">${i+1}</span>`); b.setAttribute('aria-keyshortcuts',String(i+1)); }); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ setTimeout(ckEspMarca,0); }catch(e){} return x; }; }
const ckE={t:0,pend:null};
window.addEventListener('keydown',ev=>{ if(!ckEsperaOn()||ev.ctrlKey||ev.altKey||ev.metaKey||document.getElementById('trava-m')) return; const ag=performance.now(), gap=ag-ckE.t; ckE.t=ag;
  if(ev.target&&/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)&&ev.target.id!=='cr-cap') return;
  if(gap<120){ if(ckE.pend){ clearTimeout(ckE.pend); ckE.pend=null; } return; }
  if(!/^[1-9]$/.test(ev.key)) return; const n=+ev.key;
  ckE.pend=setTimeout(()=>{ ckE.pend=null; if(!ckEsperaOn()) return; ckLimpaCap(String(n)); const b=ckEspBotoes()[n-1]; if(b&&!b.disabled) b.click(); },120); },true);
document.head.insertAdjacentHTML('beforeend','<style id="ck-esp-css">.cq .cq-tema button .ck-k{min-width:1.5em;height:1.5em;font-size:.85em}</style>');
