/* Painel Colafix · 79-pedidos0411.js (pedidos de ajuste de 04/11).
   1. Busca do topo no login do RH (e do gestor): procura o que é do módulo da pessoa (pessoas, telas, ações) com a mesma busca da lateral
      (`gxsItens`), e o exemplo do campo fala disso — não de ordem, rancho e PMX.
   2. O que precisa produzir: itens desativados em Ajustes › Itens (`ativo:false`) não aparecem (tela, PDF, Excel e o Excel antigo dos Estoques).
      A capacidade física dos almoxarifados continua contando todos (o estoque ocupa espaço).
   3. Capacidade da linha em fardos: item com "fardo" no cadastro (ex.: ensacado de 1 kg, fardo de 20) conta na capacidade como fardos
      (quantidade ÷ unidades por fardo), na Programação e no Calendário (`capQtd`). Prefixo `p04`. */
"use strict";
/* ---------- 3 · quantidade que ocupa a capacidade ---------- */
function capFardo(o){ try{ if(o&&o._pv){ const it=itemDe(o.codigo); return it&&+it.fardo>1?+it.fardo:0; } const f=fardoDe(o); return f>1?f:0; }catch(e){ return 0; } }
function capQtd(o,q){ if(q==null) q=o._pv?(+o.qtd||0):Math.max(0,(+o.total||0)-entregueDe(o)); const f=capFardo(o); return f?q/f:q; }

/* ---------- 2 · itens inativos fora do "O que precisa produzir" ---------- */
function p04Inativo(c){ try{ const it=itemDe(c); return !!(it&&it.ativo===false); }catch(e){ return false; } }
{ const _r=anlEstRows; anlEstRows=function(){ const xs=_r.apply(this,arguments); return S._p04SemInat?xs.filter(r=>!p04Inativo(r.c)):xs; }; }
{ const _v=vAnlEst; vAnlEst=function(){ S._p04SemInat=true; try{ return _v.apply(this,arguments); } finally{ S._p04SemInat=false; } }; }
{ const _e=anlExportar; anlExportar=async function(tipo){ S._p04SemInat=tipo==='est'; try{ return await _e.apply(this,arguments); } finally{ S._p04SemInat=false; } }; }

/* ---------- 1 · busca do topo no módulo da pessoa ---------- */
function p04BuscaPerfil(){ try{ const p=typeof sbPerfil==='function'?sbPerfil():''; return p==='rh'||p==='gx'?p:''; }catch(e){ return ''; } }
const P04_PH={rh:'Pessoa, tela ou ação do RH…',gx:'Tela, ação, chamado, peça ou pessoa…'};
{ const _b=tpBusca; tpBusca=function(q){ const p=p04BuscaPerfil(); if(!p) return _b.apply(this,arguments); if(String(q||'').trim().length<2) return [];
    let xs=[]; try{ xs=gxsItens(q); }catch(e){ console.warn('[busca topo]',e); } return xs.map(x=>({g:x.g,t:x.t,s:x.s||'',k:'run',run:x.run})); }; }
{ const _a=tpAbrir; tpAbrir=function(x){ if(x&&x.k==='run'){ S.tp.pop=null; tpFechaPop(); try{ x.run(); }catch(e){ console.warn('[busca topo]',e); } return; } return _a.apply(this,arguments); }; }
function p04Textos(){ const p=p04BuscaPerfil(); const b=document.getElementById('tp-busca'); if(b) b.title=p?(p==='rh'?'Buscar pessoa, tela ou ação do RH (atalho: /)':'Buscar tela, ação, chamado ou pessoa (atalho: /)'):'Buscar ordem, rancho, ficha, receita ou item (atalho: /)';
  const i=document.getElementById('tp-q'); if(i&&p) i.placeholder=P04_PH[p]; }
{ const _t=tpTogglePop; tpTogglePop=function(k){ const r=_t.apply(this,arguments); if(k==='busca') p04Textos(); return r; }; }
{ const _u=tpAtualiza; tpAtualiza=function(){ const r=_u.apply(this,arguments); p04Textos(); return r; }; }
setTimeout(p04Textos,0);
try{ window.Painel=window.Painel||{}; window.Painel.p04={capQtd:o=>capQtd(o),inativo:c=>p04Inativo(c)}; }catch(e){}
