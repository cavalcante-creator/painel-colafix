/* Painel Colafix · 61-analise-org.js (26/10, pedido "organizar a Análise PCP e tirar o que repete")
   Escolhas da usuária: 4 abas — Produzir (O que precisa produzir = anlest) · Mês (Previsto × Realizado + Previsão mensal)
   · Linhas (Carga das linhas) · Sistema (Base de dados + Painel × sistema).
   - Resumo (anlres) saiu: o que tinha já está nas outras. Necessidades (anlnec) juntou em Produzir: as ações
     "Antecipar a ordem" / "Programar a ordem da fila" viram botão na linha do item. Acerto (anlace) já está dentro
     da Base de dados. A TV (tvnrit) sai das abas (continua em Telas de TV).
   - Projeção de estoque (anlproj) sai do menu e abre pelo botão "Ver projeção dia a dia" em Produzir.
   - Quem abre um link antigo (anlres/anlnec → Produzir, anlace → Base de dados) cai no lugar novo.
   Prefixo `ao`. */
"use strict";
const AO_RED={anlres:'anlest',anlnec:'anlest',anlace:'anlbase'};
['anlres','anlnec','anlace','anlproj','tvnrit'].forEach(v=>{ TELA_SEM_MENU[v]=1; });
{ const M=MODS.find(m=>m.id==='analise'); if(M) M.views.filter(v=>/^tvn/.test(v)).forEach(v=>{ TELA_SEM_MENU[v]=1; }); } /* telas de TV (tvnrit, tvnprev…) ficam em Telas de TV */
NAV_GRP.analise=[{k:'prod',n:'Produzir',ic:'caixa',v:['anlest']},{k:'mes',n:'Mês',ic:'grafico',v:['anlrit','anlmes']},{k:'lin',n:'Linhas',ic:'fabrica',v:['anllin']},{k:'sis',n:'Sistema',ic:'baixar',v:['anlbase','anlapt']}];
{ const M=MODS.find(m=>m.id==='analise'); if(M){ const ord=['anlest','anlrit','anlmes','anllin','anlbase','anlapt']; M.views=ord.filter(v=>M.views.includes(v)).concat(M.views.filter(v=>!ord.includes(v))); } }
VIEWS.anlest=Object.assign({},VIEWS.anlest||{},{nome:'O que precisa produzir',mob:'Produzir'}); CRUMB.anlest='O que precisa produzir';
VIEWS.anllin=Object.assign({},VIEWS.anllin||{},{mob:'Linhas'});
/* o grupo "Outros" não mostra telas escondidas do menu */
{ const _ng=navGrupos; navGrupos=function(m){ const gs=_ng.apply(this,arguments); if(!gs||!m||m.id!=='analise') return gs;
    const r=gs.map(g=>g.k==='outros'?Object.assign({},g,{v:g.v.filter(v=>!TELA_SEM_MENU[v])}):g).filter(g=>g.v.length); return r.length>1?r:null; }; }
/* links antigos */
{ const _go=go; go=function(v){ if(AO_RED[v]) v=AO_RED[v]; return _go.call(this,v); }; }
{ const _r=render; render=function(){ if(AO_RED[S.view]){ S.view=AO_RED[S.view]; } return _r.apply(this,arguments); }; }
/* Produzir: ações da antiga Necessidades na linha do item + "Ver projeção dia a dia" + quando a base foi atualizada */
function aoAcaoBtn(r){ const a=(r.x&&r.x.acoes||[]).find(z=>z.t==='antecipar'||z.t==='programar'); if(!a||!a.o) return '';
  const txt=String(anlAcaoTxt(r.x,a)).replace(/<[^>]+>/g,'');
  return `<button class="anl-plan ao-ac" data-act="anl-ordem" data-id="${esc(a.o._id)}" title="${esc(txt)}">${a.t==='antecipar'?'Antecipar':'Programar'} ${esc(a.o.num)}</button>`; }
{ const _m=eswMonta; eswMonta=function(R,h){ let out=_m.apply(this,arguments); try{
    const xs=S.esw.xs||[]; xs.forEach(r=>{ const b=aoAcaoBtn(r); if(!b) return; const k='<button class="anl-plan" data-act="anl-sug" data-c="'+esc(r.c)+'"'; out=out.replace(k,b+k); });
    const fr=typeof anlFrescor==='function'?anlFrescor():''; const proj=`<button class="lnk ao-proj" data-act="ao-proj">${ic('grafico',15,2)}Ver projeção dia a dia</button>`;
    out=out.replace('<section class="card esw-fil">',`<div class="ao-fr">${fr}${proj}</div><section class="card esw-fil">`);
  }catch(e){ console.warn('[análise] produzir',e); } return out; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="ao-proj"],[data-act="ao-volta"]'); if(!b) return; ev.stopPropagation();
  if(b.dataset.act==='ao-volta'){ go('anlest'); return; }
  const F=S.anl.es||{}; S.anl.linha=F.linha&&F.linha!=='__sem'?F.linha:''; S.anl.busca=F.q||''; S.anl.f='todos'; go('anlproj'); },true);
{ const _vp=vAnlProj; vAnlProj=function(R){ const h=_vp.apply(this,arguments); return `<button class="lnk ao-volta" data-act="ao-volta">← Voltar para O que precisa produzir</button>`+h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="ao-css">
.ao-fr{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}.ao-fr .anl-fresh{margin:0}
.ao-proj{display:inline-flex;align-items:center;gap:6px;font-weight:600}.ao-volta{display:inline-block;margin:0 0 10px;font-weight:600}
.anl-plan.ao-ac{background:var(--teal-strong);color:#fff;border-color:var(--teal-strong);margin-right:6px}
</style>`);
