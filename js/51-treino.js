/* Painel Colafix · 51-treino.js (24/10) — botão e faixa do MODO TREINAMENTO (o motor está em treino.js).
   Menu do usuário (toque no nome, no alto): "Modo treinamento neste aparelho". Ligar pede a senha de administrador
   (a da trava, Manutenção › Configurações) — sem senha cadastrada, só a administradora liga. Desligar não pede senha.
   Ligado: faixa laranja fixa "MODO TREINAMENTO · nada é gravado" com "Sair do treinamento" em qualquer tela (também nas telas
   cheias do posto, oficina e celulares). Ligar ou sair recarrega a página (o que foi feito no treino some). */
"use strict";
const TREINO_K='colafix.treino';
function treinoOn(){ return !!(window.TREINO&&window.TREINO.on); }
function treinoLiga(v){ try{ if(v) localStorage.setItem(TREINO_K,'1'); else localStorage.removeItem(TREINO_K); }catch(e){} location.reload(); }
function treinoPedeLigar(){ const ok=()=>treinoLiga(true);
  if(typeof travaTemSenha==='function'&&travaTemSenha()&&typeof travaPedeAp==='function') return travaPedeAp('Modo treinamento','Neste aparelho, nada do que for feito será gravado de verdade: serve para ensinar. Digite a senha de administrador para ligar.',ok);
  if(dbMaster()){ if(confirm('Ligar o modo treinamento neste aparelho? Nada do que for feito aqui será gravado de verdade.')) ok(); return; }
  toast('Para ligar o treinamento, a administradora precisa definir a senha de administrador (Manutenção › Configurações).'); }
document.addEventListener('click',ev=>{ if(!(ev.target.closest&&ev.target.closest('.quem'))) return; setTimeout(()=>{ const m=document.getElementById('pf-menu'); if(!m||m.querySelector('[data-m="treino"]')) return;
  const b=document.createElement('button'); b.dataset.m='treino'; b.textContent=treinoOn()?'Sair do modo treinamento':'Modo treinamento neste aparelho'; const s=m.querySelector('[data-m="sair"]'); m.insertBefore(b,s||null); },0); });
window.addEventListener('click',ev=>{ const t=ev.target.closest&&ev.target.closest('#pf-menu [data-m="treino"],[data-act="treino-sair"]'); if(!t) return; ev.stopImmediatePropagation(); ev.preventDefault(); const m=document.getElementById('pf-menu'); if(m) m.remove();
  if(treinoOn()){ if(confirm('Sair do modo treinamento? Tudo o que foi feito no treino some.')) treinoLiga(false); } else treinoPedeLigar(); },true);
function treinoFaixa(){ if(!treinoOn()) return; let el=document.getElementById('treino-fx'); if(!el){ el=document.createElement('div'); el.id='treino-fx'; el.setAttribute('role','status'); document.body.appendChild(el); document.body.classList.add('treino'); }
  const n=window.TREINO.gravados?window.TREINO.gravados():0, h=`<b>MODO TREINAMENTO</b><span>nada é gravado de verdade${n?' · '+n+' registro'+(n>1?'s':'')+' de treino':''}</span><button type="button" data-act="treino-sair">Sair do treinamento</button>`;
  if(el.dataset.h!==h){ el.dataset.h=h; el.innerHTML=h; } }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ treinoFaixa(); }catch(e){} return x; }; }
setInterval(()=>{ try{ treinoFaixa(); }catch(e){} },2000);
/* OneDrive (fichas, fotos): no treino não envia de verdade */
setTimeout(function od(){ try{ if(!treinoOn()) return; if(!window.OneDrive){ setTimeout(od,1500); return; } if(OneDrive._treino) return; OneDrive._treino=true; OneDrive.enviar=async(caminho)=>({webUrl:'',name:String(caminho||'').split('/').pop(),treino:true}); }catch(e){} },1500);
document.head.insertAdjacentHTML('beforeend',`<style id="treino-css">
#treino-fx{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;padding:6px 8px 6px 14px;border-radius:0 0 12px 12px;background:#E67E22;color:#fff;font:13px/1.2 Archivo,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.2);max-width:calc(100vw - 16px);flex-wrap:wrap;justify-content:center}
#treino-fx b{letter-spacing:.06em}#treino-fx span{opacity:.95}#treino-fx button{border:0;border-radius:8px;background:#fff;color:#A04D0B;font:inherit;font-weight:600;padding:4px 10px;cursor:pointer}
</style>`);
