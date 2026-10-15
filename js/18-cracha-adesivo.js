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
document.head.insertAdjacentHTML('beforeend',`<style id="cr-ad-css">.cr-adl{display:inline-flex;align-items:center;gap:6px;margin-right:6px}.cr-adl span{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--muted);text-transform:uppercase}.cr-ad{width:170px;height:36px;font-family:ui-monospace,monospace}</style>`);
/* ===FIM ADESIVO=== */
