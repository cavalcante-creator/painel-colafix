/* Painel Colafix · 59-pedidos2610b.js (26/10, pedidos de ajuste da tarde)
   (1) "As notificações de ninguém pegou o chamado ficam aparecendo e me incomodando": no painel da administradora
       (fora do ?gestor=1) o aviso de chamado sem atendimento (js/07: toast "ninguém assumiu há…", bipe, notificação do
       Windows e o item do sino) não aparece mais. A manutenção, o gestor e a TV da oficina continuam recebendo.
   (2) "Quando vou colocar uma ordem complementar, aperto e sai": a janela da ordem só fecha pelo fundo quando o
       toque COMEÇA e TERMINA no fundo. Antes, um clique que começava dentro (no link da complementar, que se redesenha
       na hora, ou ao selecionar o número no campo e soltar fora) podia cair no fundo e fechar a janela.
       E o leitor de código de barras com o cursor no nº da complementar (ou do ensacado) só preenche o número,
       sem ir para outra ordem. Prefixo `p26`. */
"use strict";
function p26Adm(){ try{ return !!(S.acs&&S.acs.dono)&&!(typeof gxSolo==='function'&&gxSolo()); }catch(e){ return false; } }
{ const _za=mzAtrasados; mzAtrasados=function(){ if(p26Adm()) return []; return _za.apply(this,arguments); }; }

/* ---------- janela da ordem: fecha pelo fundo só se o toque começou no fundo ---------- */
S.p26={down:null};
document.addEventListener('pointerdown',ev=>{ S.p26.down=ev.target; },true);
document.addEventListener('mousedown',ev=>{ S.p26.down=ev.target; },true);
document.addEventListener('click',ev=>{ const t=ev.target; if(!t||!t.classList||!t.classList.contains('omodal')) return;
  if(S.p26.down!==t){ ev.stopImmediatePropagation(); ev.preventDefault(); } },true);

/* ---------- leitor no campo do nº da complementar / do ensacado: só preenche ---------- */
function p26CampoNum(){ const a=document.activeElement; if(!a||a.tagName!=='INPUT') return null; if(a.id==='o-ent-ens'||(a.dataset&&a.dataset.comp!=null&&a.dataset.k==='n')) return a; return null; }
{ const _cb=cbLeu; cbLeu=function(cod){ const c=String(cod||'').toUpperCase(), a=p26CampoNum();
    if(a&&/^OP-?\d{3,}$/.test(c)){ a.value=c.replace(/\D/g,''); a.dispatchEvent(new Event('input',{bubbles:true})); try{ a.focus(); }catch(e){} return; }
    return _cb.apply(this,arguments); }; }
