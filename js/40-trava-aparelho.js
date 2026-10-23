/* Painel Colafix · 40-trava-aparelho.js (23/10)
   "Travar este aparelho": em QUALQUER login, o aparelho (PWA ou navegador) só sai do painel com a senha de administrador
   (a mesma de Manutenção › Configurações, config/geral.travaSenha). Fica guardado no aparelho (localStorage colafix.travaAparelho).
   Liga/desliga pelo menu do usuário (toque no nome, no alto) — os dois pedem a senha.
   Travado: Sair da conta (menu do usuário, botões Sair), sair do rodízio das TVs (botão e Esc) e fechar/recarregar a janela pedem a senha
   (fechar a janela: o navegador mostra o aviso "Sair do site?"; travar o Windows inteiro só com o modo quiosque). */
"use strict";
const TRAVA_AP_K='colafix.travaAparelho';
function travaApar(){ try{ return localStorage.getItem(TRAVA_AP_K)==='1'; }catch(e){ return false; } }
function travaTemSenha(){ const t=S.cfg&&S.cfg.travaSenha; return !!(t&&t.h); }
{ const _o=travaOn; travaOn=function(){ return _o.apply(this,arguments)||(travaApar()&&travaTemSenha()); }; }
/* janela de senha com ação no fim */
function travaPedeAp(titulo,texto,feito){ if(document.getElementById('trava-m')) return; const d=document.createElement('div'); d.id='trava-m'; d.className='trava-m'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','trava-t');
  d.innerHTML=`<form class="trava-c"><h2 id="trava-t">${esc(titulo)}</h2><p>${esc(texto)}</p><label for="trava-s">Senha de administrador</label><input id="trava-s" type="password" autocomplete="off" required><p class="trava-e" role="alert"></p><div class="trava-b"><button type="button" class="trava-x">Cancelar</button><button type="submit" class="trava-ok">Confirmar</button></div></form>`;
  document.body.appendChild(d); const i=d.querySelector('#trava-s'); setTimeout(()=>i.focus(),30);
  const fecha=()=>{ d.remove(); try{ if(typeof crCapPoe==='function') crCapPoe(); }catch(e){} };
  d.querySelector('.trava-x').onclick=fecha; d.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); fecha(); } e.stopPropagation(); });
  d.querySelector('form').onsubmit=async e=>{ e.preventDefault(); const t=S.cfg.travaSenha||{}; let okk=false; try{ okk=(await travaHash(t.s||'',i.value))===t.h; }catch(er){}
    if(!okk){ d.querySelector('.trava-e').textContent='Senha errada.'; i.value=''; i.focus(); return; } fecha(); feito(); }; }
function travaApLiga(on){ try{ if(on) localStorage.setItem(TRAVA_AP_K,'1'); else localStorage.removeItem(TRAVA_AP_K); }catch(e){} document.body.classList.toggle('trava-ap',on); render(); }
/* menu do usuário (toque no nome): Sair pede a senha; e a opção de travar/destravar o aparelho */
window.addEventListener('click',ev=>{ const s=ev.target.closest&&ev.target.closest('#pf-menu [data-m="sair"]'); if(s&&travaOn()){ ev.stopImmediatePropagation(); ev.preventDefault(); const m=document.getElementById('pf-menu'); if(m) m.remove(); travaPede(); return; }
  const t=ev.target.closest&&ev.target.closest('#pf-menu [data-m="travaap"]'); if(t){ ev.stopImmediatePropagation(); ev.preventDefault(); const m=document.getElementById('pf-menu'); if(m) m.remove();
    if(!travaTemSenha()){ toast(dbMaster()?'Defina primeiro a senha de administrador em Manutenção › Configurações.':'A administradora precisa definir a senha de administrador antes (Manutenção › Configurações).'); return; }
    if(travaApar()) travaPedeAp('Destravar este aparelho','Digite a senha de administrador para destravar. Depois, qualquer pessoa pode sair do painel neste aparelho.',()=>{ travaApLiga(false); toast('Aparelho destravado.'); });
    else travaPedeAp('Travar este aparelho','Com o aparelho travado, sair do painel (e do rodízio das TVs) só com a senha de administrador. Vale para qualquer login neste aparelho.',()=>{ travaApLiga(true); toast('Aparelho travado: para sair, só com a senha.'); }); } },true);
document.addEventListener('click',ev=>{ if(!(ev.target.closest&&ev.target.closest('.quem'))) return; setTimeout(()=>{ const m=document.getElementById('pf-menu'); if(!m||m.querySelector('[data-m="travaap"]')) return;
  const b=document.createElement('button'); b.dataset.m='travaap'; b.textContent=travaApar()?'🔒 Destravar este aparelho':'Travar este aparelho (sair só com senha)'; const s=m.querySelector('[data-m="sair"]'); m.insertBefore(b,s||null); },0); });
/* rodízio das TVs: sair (botão ou Esc) pede a senha no aparelho travado */
let _travaApr=0;
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="apr-sair"]'); if(!b||!travaApar()||!travaTemSenha()||Date.now()-_travaApr<1500) return; ev.stopImmediatePropagation(); ev.preventDefault();
  travaPedeAp('Aparelho travado','Para sair do rodízio das TVs, digite a senha de administrador.',()=>{ _travaApr=Date.now(); aprSair(); }); },true);
window.addEventListener('keydown',ev=>{ if(ev.key!=='Escape'||!S.apres||!S.apres.on||!travaApar()||!travaTemSenha()||document.getElementById('trava-m')) return; ev.preventDefault(); ev.stopImmediatePropagation();
  travaPedeAp('Aparelho travado','Para sair do rodízio das TVs, digite a senha de administrador.',()=>{ _travaApr=Date.now(); aprSair(); }); },true);
/* fechar ou recarregar a janela: o navegador pergunta "Sair do site?" (não dá para pôr senha aqui) */
window.addEventListener('beforeunload',ev=>{ if(!travaApar()||!travaTemSenha()||Date.now()-_travaLib<8000) return; ev.preventDefault(); ev.returnValue=''; return ''; });
try{ if(travaApar()) document.body.classList.add('trava-ap'); }catch(e){}
/* Manutenção › Configurações: explica o "Travar este aparelho" */
{ const _v=S.extViews.mancfg; if(_v){ S.extViews.mancfg=function(){ const h=_v.apply(this,arguments); if(!dbMaster()) return h;
  return h.replace(/(<section class="card trava-cfg">[\s\S]*?)(<\/section>)/,`$1<p class="sub" style="margin:10px 0 0"><b>Qualquer outro aparelho</b> (TV, notebook, celular): toque no nome do usuário, no alto, e em <b>“Travar este aparelho”</b>. A partir daí, sair do painel ou do rodízio das TVs só com esta senha. ${travaApar()?'<b>Este aparelho está travado.</b>':''}</p>$2`); }; } }
