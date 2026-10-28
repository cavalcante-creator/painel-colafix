/* Painel Colafix · 66-refino.js — escolha da letra do painel (Ajustes → Aparência), por aparelho. */
"use strict";
const letraAtual=()=>{ try{ return localStorage.getItem('colafix.letra')||'archivo'; }catch(e){ return 'archivo'; } };
const letraAplicar=()=>{ try{ document.documentElement.dataset.letra=letraAtual(); }catch(e){} };
letraAplicar();
if(typeof AJ_GRUPOS!=='undefined'&&!AJ_GRUPOS.some(g=>g[0]==='aparencia')) AJ_GRUPOS.push(['aparencia','Aparência',/^Aparência/]); /* um assunto próprio em Ajustes */
{ const _va=vAjustes; vAjustes=function(){ const h=_va.apply(this,arguments), l=letraAtual();
    const card=`<section class="card"><h2 style="margin:0 0 4px">Aparência</h2><div class="sub" style="margin:0 0 12px">A letra do painel neste aparelho. Dá para trocar e comparar quando quiser.</div>
      <div class="seg" role="group" aria-label="Letra do painel">${[['archivo','Archivo (atual)'],['geist','Geist (nova)']].map(([k,n])=>`<button type="button" data-act="letra" data-v="${k}" class="${l===k?'on':''}" aria-pressed="${l===k}" style="padding:0 16px;height:38px;${k==='geist'?'font-family:Geist,system-ui,sans-serif':'font-family:Archivo,system-ui,sans-serif'}">${n}</button>`).join('')}</div></section>`;
    const j=typeof saDepoisDoHead==='function'?saDepoisDoHead(h):0; return j>0?h.slice(0,j)+card+h.slice(j):card+h; }; } /* logo abaixo do título de Ajustes, fora das seções que se escondem */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="letra"]'); if(!b) return; try{ localStorage.setItem('colafix.letra',b.dataset.v); }catch(e){} letraAplicar(); render(); toast(b.dataset.v==='geist'?'Letra Geist neste aparelho.':'Letra Archivo neste aparelho.'); });
/* ===FIM REFINO=== */
