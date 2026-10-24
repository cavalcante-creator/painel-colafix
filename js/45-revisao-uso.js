/* Painel Colafix · 45-revisao-uso.js (24/10) — ajustes da revisão "como usuário no dia a dia".
   1) Posto: linha com ordem do dia que ninguém começou não diz mais "Produzindo" (dizia mesmo com a ordem parada).
   2) Monitor do rancho dentro do painel (com o menu): as colunas das linhas quebram para a linha de baixo em vez de sair da tela.
   3) Telas inteiras (posto, chamados, oficina, Nexus): o aviso (toast) aparece em cima, sem cobrir os botões de baixo.
   4) Painel da manutenção: os 7 números cabem numa fileira no computador.
   5) Calendário aberto no sábado/domingo começa na semana que vem (antes mostrava a semana que já passou).
   7) Paradas: o resumo do mês entrava DENTRO do cabeçalho (a tela ficava torta, com o título no meio); agora entra logo depois dele.
   6) Prévia das telas de TV dentro do painel: o cabeçalho quebra em duas linhas em vez de o título passar por cima dos números. */
"use strict";
{ const _e=poEstLinha; poEstLinha=function(l){ const e=_e.apply(this,arguments);
  try{ if(e&&/^Produzindo · ordem /.test(e.t||'')&&typeof otAtivaNaLinha==='function'&&!otAtivaNaLinha(l)&&!(typeof otPausadaNaLinha==='function'&&otPausadaNaLinha(l))&&(S.ordens||[]).some(o=>Array.isArray(o.prodSeg))){
      return Object.assign({},e,{t:e.t.replace(/^Produzindo · ordem /,'Ordem de hoje · ')+' · não começou',s:(e.s?e.s+' · ':'')+'começar no 5'}); } }catch(er){}
  return e; }; }
{ const w=new Date().getDay(); if(S.cal&&!S.cal.ini&&(w===6||w===0)) S.cal.ini=segundaStr(new Date(Date.now()+(w===6?2:1)*864e5)); }
/* fim do elemento que começa em i (conta <div> e </div>) */
function revFimDiv(h,i){ let n=0; const re=/<div\b|<\/div>/g; re.lastIndex=i; let m; while((m=re.exec(h))){ n+=m[0]==='</div>'?-1:1; if(n===0) return re.lastIndex; } return -1; }
if(typeof pdResumoParadas==='function') S.extViews.paradas=()=>{ const v=vParadas(); const k=v.indexOf('Paradas de produção</h1>'); const i=k<0?-1:v.lastIndexOf('<div class="head"',k); const f=i<0?-1:revFimDiv(v,i); return f>0?v.slice(0,f)+pdResumoParadas()+v.slice(f):pdResumoParadas()+v; };
document.head.insertAdjacentHTML('beforeend',`<style id="rev-uso-css">
body:not(.tv):not(.jan-solo) .mdw .megrid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))!important;overflow-x:visible}
body:has(.cq) .toast{bottom:auto;top:96px}
body:not(.tv) .tvn-cab{height:auto;min-height:118px;flex-wrap:wrap;row-gap:10px;padding-top:12px;padding-bottom:12px}
@media (min-width:900px){ .mo-ks{grid-template-columns:repeat(auto-fit,minmax(128px,1fr))} }
</style>`);
