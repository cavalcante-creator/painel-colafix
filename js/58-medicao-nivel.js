/* Painel Colafix · 58-medicao-nivel.js (26/10, pedido "A medição manual não está atualizando os níveis do silo")
   Junto com o js/09: (1) medição feita agora sempre acerta o nível, mesmo que outro aparelho com relógio adiantado tenha gravado
   uma medição "no futuro"; (2) a fila do silo não fica presa por um trabalho sem resposta (30 s); (3) depois de "Salvar medição",
   o painel diz silo por silo o que aconteceu. Se algum nível NÃO mudou (modo "comparar" ligado, hora informada mais antiga que a
   última medição…), aparece um aviso que não some sozinho com o motivo e os botões "Usar a medição como nível agora" e, no modo
   comparar, "Desligar o modo comparar". Prefixo `mdn`. */
"use strict";
S.mdn=S.mdn||{pend:[]};
const mdnFmt=kg=>Math.round(+kg||0).toLocaleString('pt-BR')+' kg';
{ const _ms=siloMedicaoSalva; siloMedicaoSalva=async function(id,doc,op){ const res=await _ms.apply(this,arguments);
    try{ if(op&&op.agora) mdnRelata(id,doc,res||[]); }catch(e){ console.warn('[medição] relato',e); } return res; }; }
function mdnRelata(id,doc,res,semToast){ const sids=Object.keys(doc.itens||{}).filter(sid=>!isNaN(+doc.itens[sid])); const ok=[], nao=[];
  sids.forEach((sid,i)=>{ const r=res[i]; if(!r) return; if(r.aplicado===false&&!r.dup) nao.push({sid,kg:+doc.itens[sid]*1000,r}); else if(r.ok) ok.push({sid,r}); });
  S.mdn.pend=nao.map(x=>({id,doc,sid:x.sid,kg:x.kg,comp:!!x.r.comparacao,nota:x.r.nota||''}));
  if(!nao.length){ if(ok.length&&!semToast) setTimeout(()=>toast('Nível atualizado pela medição: '+ok.map(x=>siloNome(x.sid)+' '+mdnFmt(x.r.novo)).join(' · ')),900); return; }
  mdnAviso(); }
/* o aviso fica no alto da tela (dentro da página, não por cima dos botões) até a pessoa decidir */
function mdnAviso(){ const xs=S.mdn.pend; let b=document.getElementById('mdn-av'); if(!xs.length){ if(b) b.remove(); return; }
  const v=document.getElementById('view'); if(!v) return;
  if(!b||b.parentNode!==v){ if(b) b.remove(); b=document.createElement('div'); b.id='mdn-av'; b.setAttribute('role','alert'); const h=v.querySelector(':scope > .head'); if(h&&h.nextSibling) v.insertBefore(b,h.nextSibling); else v.insertBefore(b,v.firstChild); }
  const comp=xs.some(x=>x.comp), pode=typeof siloPodeConfig==='function'?siloPodeConfig():true;
  b.innerHTML=`<div class="mdn-t">A medição foi salva, mas o nível ${xs.length>1?'destes silos':'deste silo'} não mudou</div>
    <ul>${xs.map(x=>`<li><b>${esc(siloNome(x.sid))}</b>: medido ${mdnFmt(x.kg)} · ${esc(x.comp?'o modo "comparar" está ligado (a medição manual só é anotada, o nível segue pelos apontamentos)':x.nota||'saldo mantido')}</li>`).join('')}</ul>
    <div class="mdn-b"><button class="btn" data-act="mdn-usar">Usar a medição como nível agora</button>${comp&&pode?'<button class="btn sec" data-act="mdn-comp">Desligar o modo comparar</button>':''}<button class="btn sec" data-act="mdn-x">Deixar assim</button></div>`; }
async function mdnUsar(){ const xs=S.mdn.pend.slice(), feitos=[]; for(const x of xs){ try{
      const r=await siloRegistrarMedicao({sid:x.sid,kg:x.kg,motivo:'Medição física (usada como nível)',obs:x.doc.obs,medidoPor:x.doc.medidoPor,em:new Date().toISOString(),medicaoId:x.id+'-nivel',usarComoSaldo:true,forcar:true});
      if(r&&(r.ok||r.dup)) feitos.push(x.sid); }catch(e){ console.warn('[medição] usar',e); siloAviso('Não consegui atualizar o '+siloNome(x.sid)+' ('+((e&&e.code)||'erro')+'). Confira a internet e tente de novo.','erro'); } }
  S.mdn.pend=S.mdn.pend.filter(x=>!feitos.includes(x.sid)); mdnAviso(); if(feitos.length) toast('Nível atualizado: '+feitos.map(siloNome).join(', ')+'.'); render(); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ if(S.mdn.pend.length) mdnAviso(); }catch(e){} return x; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('#mdn-av [data-act^="mdn-"]'); if(!b) return; ev.stopPropagation(); const a=b.dataset.act;
  if(a==='mdn-x'){ S.mdn.pend=[]; mdnAviso(); return; }
  b.disabled=true;
  if(a==='mdn-usar'){ await mdnUsar(); return; }
  if(a==='mdn-comp'){ try{ await S.db.doc('config/geral').set({siloComparar:false},{merge:true}); S.cfg.siloComparar=false; S.mdn.pend.forEach(x=>x.comp=false); toast('Modo comparar desligado: as próximas medições já acertam o nível.'); }catch(e){ erro(e); } mdnAviso(); } },true);
document.head.insertAdjacentHTML('beforeend',`<style id="mdn-css">
#mdn-av{margin:0 0 14px;background:#FFF7E6;border:1px solid #E8CB8A;color:#5C4210;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.4}
#mdn-av .mdn-t{font-weight:700;font-size:15px}#mdn-av ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px}
#mdn-av .mdn-b{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px}
</style>`);
