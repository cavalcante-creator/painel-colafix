/* Painel Colafix · 47-silo-celular.js (24/10) — celular de quem fica nos silos (pedido da usuária).
   Cargo pronto "silocel" (módulo "silocel"): no celular, recebe a AREIA e o CIMENTO que chegam (tela "Receber no silo", já existente)
   e confirma o PREMIX que o almoxarifado leva para as linhas 1 e 2 (não tem papel: escolhe na lista das fichas de premix dos últimos dias).
   Recebimento do premix: pmxentregas/{id} {fichaId,num,material,qtd,linha,porNome,por,em,avulso,removido}. Regra geral do banco (não mudou).
   No almoxarifado, a ficha mostra "recebido na linha N de M" (pmxSt envolvida). */
"use strict";
MODS.push({id:'silocel',nome:'Celular dos silos',ic:'grid',views:['silocel','silorec']});
VIEWS.silocel={nome:'Receber',ic:'grid',mob:'Início'}; Object.assign(CRUMB,{silocel:'Celular dos silos'});
if(typeof ACS_MODS!=='undefined'&&!ACS_MODS.some(m=>m[0]==='silocel')) ACS_MODS.splice(Math.max(0,ACS_MODS.findIndex(m=>m[0]==='ajustes')),0,['silocel','Celular dos silos (receber areia, cimento e premix)']);
if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.silocel) EQ_MOD.silocel=['silo','Celular dos silos','Receber areia, cimento e o premix das linhas'];
if(typeof LEIT_CONHECIDOS!=='undefined'&&!LEIT_CONHECIDOS.includes('silocel')) LEIT_CONHECIDOS.push('silocel');
registrarPerfil('silocel',{nome:'Celular dos silos (areia, cimento e premix)',mods:['silocel'],pos:4,desc:'Para o celular de quem fica perto dos silos: registra a areia e o cimento que chegam (nota e quantidade) e confirma o premix que o almoxarifado entrega nas linhas 1 e 2.'});
{ const _vo=viewOk; viewOk=function(v){ if(v==='silorec'){ try{ const p=acsP(); if(p&&!p.tudo&&(p.mods||[]).includes('silocel')) return true; }catch(e){} } return _vo.apply(this,arguments); }; }
function sclSo(){ try{ const A=S.acs; if(!A||A.dono) return false; const p=acsP(); return !!p&&!p.tudo&&(p.mods||[]).includes('silocel')&&!(p.mods||[]).includes('silos'); }catch(e){ return false; } }
{ const _mv=modsVis; modsVis=function(){ const r=_mv.apply(this,arguments); if(!sclSo()){ let tem=false; try{ const p=acsP(); tem=!!(S.acs&&S.acs.dono)||!!(p&&(p.mods||[]).includes('silocel')); }catch(e){} return tem?r:r.filter(m=>m.id!=='silocel'); } const s=r.filter(m=>m.id==='silocel'); return s.concat(r.filter(m=>m.id!=='silocel'&&m.id!=='silos'&&m.id!=='almoxcel')); }; }
{ const _md=modDe; modDe=function(v){ if(v==='silorec'&&sclSo()) return 'silocel'; return _md.apply(this,arguments); }; }
S.scl={ab:null,q:'',ln:'',rec:'',salv:false};
function sclTem(){ try{ return viewOk('silocel'); }catch(e){ return false; } }
/* leituras: fichas de premix recentes, receitas e os recebimentos (só quem usa) */
let _sclSub=false, _sclEntSub=false;
setInterval(()=>{ try{ if(!S.db||!S.acs||!S.acs.pronto) return;
  if(!_sclSub&&sclTem()){ _sclSub=true;
    inscrever('scl-pmxfichas',()=>S.db.collection('pmxfichas').orderBy('alteradoEm','desc').limit(150),snap=>{ S.sclFichas=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); });
    inscrever('scl-pmxrec',()=>S.db.collection('pmxrec').limit(300),snap=>{ S.scRecs=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); }); }
  if(!_sclEntSub&&(sclTem()||viewOk('pmxfichas'))){ _sclEntSub=true;
    inscrever('pmxentregas',()=>S.db.collection('pmxentregas').orderBy('em','desc').limit(400),snap=>{ S.pmxEnt=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); rerenderSeguro(); }); }
}catch(e){} },1500);
function sclRecebido(fid){ return (S.pmxEnt||[]).filter(x=>x.fichaId===fid).reduce((a,x)=>a+(+x.qtd||0),0); }
function sclLinhas(){ const L=linhasOrd(), u=L.filter(l=>/\b[12]\b/.test(l)); return u.length?u:L; }
function sclFichas(){ const lim=hojeStr(new Date(Date.now()-7*864e5)), src=(S.sclFichas&&S.sclFichas.length?S.sclFichas:(S.pmx&&S.pmx.fichas)||[]);
  return src.filter(f=>f.status!=='excluida'&&String(f.data||'')>=lim).map(f=>{ const pl=pmxNum(f.qtd), pr=pmxProd(f), base=pr>0?pr:pl, rc=sclRecebido(f._id); return {f,pl,pr,base,rc,falta:Math.max(0,base-rc)}; })
    .filter(x=>x.base>0&&x.falta>1e-9).sort((a,b)=>String(b.f.data||'').localeCompare(String(a.f.data||''))||String(pmxOp(b.f)).localeCompare(String(pmxOp(a.f)))); }
function sclForm(x){ const R=S.scl, L=sclLinhas(), avulso=!x, recs=(S.scRecs||[]).filter(r=>r.ativo!==false).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR',{numeric:true}));
  return `<div class="scl-form">
    ${avulso?`<label class="scl-f"><span>Qual premix?</span><select class="txt scl-in" id="scl-rec"><option value="">Escolha…</option>${recs.map(r=>`<option value="${esc(r._id)}" ${R.rec===r._id?'selected':''}>${esc(r.nome)}</option>`).join('')}</select></label>`:''}
    <label class="scl-f"><span>Quantos premix chegaram?</span><input class="txt scl-in" id="scl-q" inputmode="decimal" value="${esc(R.q)}" placeholder="0"></label>
    <div class="scl-f"><span>Para qual linha?</span><div class="scl-lns">${L.map(l=>`<button class="scl-ln ${R.ln===l?'on':''}" aria-pressed="${R.ln===l}" data-act="scl-ln" data-v="${esc(l)}">${esc(l)}</button>`).join('')}</div></div>
    <div class="scl-ac"><button class="btn scl-big" data-act="scl-ok" ${R.salv?'disabled':''}>${R.salv?'Registrando…':'Confirmar: recebi'}</button><button class="btn sec" data-act="scl-canc">Cancelar</button></div></div>`; }
function vSiloCel(){ const R=S.scl, xs=sclFichas(), nome=(S.nomes[S.uid]||'').split(' ')[0], h=hojeStr();
  const meus=(S.pmxEnt||[]).filter(x=>x.em&&hojeStr(new Date(x.em))===h).slice(0,15);
  const cartao=x=>{ const f=x.f, ab=R.ab===f._id; return `<div class="scl-c ${ab?'ab':''}"><button class="scl-ch" data-act="scl-ab" data-v="${esc(f._id)}"><div><b>${esc(f.material||'Premix')}</b><span>${esc(pmxOp(f))} · ${esc(dm(f.data))}${x.pr>0?' · feito '+pmxF(x.pr)+(x.pl&&x.pr<x.pl?' de '+pmxF(x.pl):''):' · '+pmxF(x.pl)+' programados'}</span></div><em>${x.rc>0?'faltam '+pmxF(x.falta):pmxF(x.falta)}<small>premix</small></em></button>${ab?sclForm(x):''}</div>`; };
  return `<div class="scl">
   <div class="head"><div><div class="eyebrow">CELULAR DOS SILOS</div><h1>${nome?'Olá, '+esc(nome):'Receber'}</h1><div class="sub">Toque no que chegou.</div></div></div>
   <button class="scl-bt scl-silo" data-act="scl-silo"><i>${ic('rota',26,2)}</i><div><b>Chegou areia ou cimento</b><span>Registrar a nota no silo</span></div></button>
   <section class="card scl-pm"><div class="scl-ph"><b>Premix que o almoxarifado trouxe</b><small>Toque no premix que chegou</small></div>
    ${xs.length?xs.map(cartao).join(''):'<div class="empty" style="margin:6px 0">Nenhum premix esperando. Se chegou um que não está aqui, use o botão abaixo.</div>'}
    <div class="scl-c ${R.ab==='_av'?'ab':''}"><button class="scl-ch scl-out" data-act="scl-ab" data-v="_av"><div><b>Chegou outro premix</b><span>Não está na lista</span></div></button>${R.ab==='_av'?sclForm(null):''}</div></section>
   ${meus.length?`<section class="card"><div class="scl-ph"><b>Premix recebido hoje</b></div>${meus.map(x=>{ const pode=x.por===S.uid&&Date.now()-new Date(x.em).getTime()<60*6e4; return `<div class="scl-r"><div><b>${pmxF(+x.qtd||0)} · ${esc(x.material||'')}</b><span>${esc(x.linha||'')} · ${hora(x.em)}${x.num?' · '+esc(x.num):''}${x.porNome?' · '+esc(x.porNome):''}</span></div>${pode?`<button class="lnk" data-act="scl-desf" data-v="${esc(x._id)}">Desfazer</button>`:''}</div>`; }).join('')}</section>`:''}
  </div>`; }
S.extViews=S.extViews||{}; S.extViews.silocel=vSiloCel;
/* no almoxarifado: a ficha mostra quanto já chegou na linha */
function sclRecTxt(fid){ const rc=sclRecebido(fid); if(!(rc>0)) return ''; const ls=[...new Set((S.pmxEnt||[]).filter(x=>x.fichaId===fid).map(x=>x.linha).filter(Boolean))]; return 'Recebido '+pmxF(rc)+(ls.length?' na '+ls.join(' e '):''); }
function sclMarcaAlmox(){ if(S.view!=='pmxfichas'||!(S.pmxEnt||[]).length) return; const marca=(el,fid)=>{ if(!el||el.querySelector('.scl-rcb')) return; const t=sclRecTxt(fid); if(t) el.insertAdjacentHTML('beforeend','<small class="scl-rcb">'+esc(t)+'</small>'); };
  document.querySelectorAll('.pmx-fc[data-id]').forEach(c=>marca(c.querySelector('.pmx-fh')?c:c,c.dataset.id));
  document.querySelectorAll('input[id^="pmx-op-"]').forEach(i=>{ const tr=i.closest('tr'); marca(tr&&tr.children[5],i.id.slice(7)); }); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ setTimeout(sclMarcaAlmox,0); }catch(e){} return x; }; }

{ const _st=pmxSt; pmxSt=function(f){ const r=_st.apply(this,arguments); try{ const rc=sclRecebido(f._id); if(rc>0&&r&&r.t){ const ls=[...new Set((S.pmxEnt||[]).filter(x=>x.fichaId===f._id).map(x=>x.linha).filter(Boolean))]; return Object.assign({},r,{t:r.t+' · recebido '+pmxF(rc)+(ls.length?' na '+ls.join(' e '):'')}); } }catch(e){} return r; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="scl-"]'); if(!b) return; const a=b.dataset.act, R=S.scl;
  const le=()=>{ const q=document.getElementById('scl-q'); if(q) R.q=q.value; const r=document.getElementById('scl-rec'); if(r) R.rec=r.value; };
  if(a==='scl-silo'){ go('silorec'); return; }
  if(a==='scl-ab'){ const v=b.dataset.v; if(R.ab===v){ R.ab=null; render(); return; } const x=sclFichas().find(y=>y.f._id===v); const L=sclLinhas();
    Object.assign(R,{ab:v,q:x?pmxF(x.falta).replace(/\./g,''):'',ln:L.length===1?L[0]:'',rec:'',salv:false}); render(); setTimeout(()=>{ const i=document.getElementById(v==='_av'?'scl-rec':'scl-q'); if(i) i.focus(); },60); return; }
  le();
  if(a==='scl-ln'){ R.ln=b.dataset.v; render(); return; }
  if(a==='scl-canc'){ R.ab=null; render(); return; }
  if(a==='scl-desf'){ const x=(S.pmxEnt||[]).find(y=>y._id===b.dataset.v); if(!x) return; if(!confirm('Desfazer o recebimento de '+pmxF(+x.qtd||0)+' '+(x.material||'premix')+'?')) return;
    try{ await S.db.doc('pmxentregas/'+x._id).update({removido:true,removidoEm:new Date().toISOString(),removidoPor:S.uid}); S.pmxEnt=(S.pmxEnt||[]).filter(y=>y._id!==x._id); toast('Recebimento desfeito.'); render(); }catch(e){ erro(e); } return; }
  if(a==='scl-ok'){ const q=numIn(R.q)||0; if(!(q>0)) return toast('Informe quantos premix chegaram.'); if(!R.ln) return toast('Escolha a linha.');
    let doc; if(R.ab==='_av'){ const r=(S.scRecs||[]).find(y=>y._id===R.rec); if(!r) return toast('Escolha qual premix chegou.'); doc={fichaId:null,num:'',material:r.nome,avulso:true}; }
    else { const x=sclFichas().find(y=>y.f._id===R.ab); if(!x) return toast('Esse premix não está mais na lista.'); doc={fichaId:x.f._id,num:pmxOp(x.f),material:x.f.material||'',avulso:false}; if(q>x.falta+1e-9&&!confirm('Chegou mais do que falta ('+pmxF(x.falta)+'). Confirmar '+pmxF(q)+' mesmo assim?')) return; }
    Object.assign(doc,{qtd:q,linha:R.ln,porNome:S.nomes[S.uid]||'',por:S.uid,em:new Date().toISOString()});
    R.salv=true; render(); const id='pe'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    try{ await S.db.doc('pmxentregas/'+id).set(doc); S.pmxEnt=[Object.assign({_id:id},doc)].concat((S.pmxEnt||[]).filter(y=>y._id!==id)); Object.assign(R,{ab:null,q:'',ln:'',rec:'',salv:false}); toast(pmxF(q)+' premix '+doc.material+' recebido na '+doc.linha+'.'); render(); }
    catch(e){ R.salv=false; render(); erro(e); } return; }
});
document.head.insertAdjacentHTML('beforeend',`<style id="scl-css">
.scl{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.scl-bt{display:flex;align-items:center;gap:14px;width:100%;padding:18px;border-radius:16px;border:1px solid var(--line,#D5DDE3);background:var(--surface,#fff);text-align:left;cursor:pointer;color:inherit;font:inherit}
.scl-bt i{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:var(--teal-strong,#143F54);color:#fff;flex:none}
.scl-bt b{display:block;font-size:19px}.scl-bt span{display:block;color:var(--muted);font-size:14px;margin-top:2px}
.scl-ph{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}.scl-ph b{font-size:17px}.scl-ph small{color:var(--muted)}
.scl-c{border:1px solid var(--line,#D5DDE3);border-radius:14px;margin-bottom:10px;overflow:hidden;background:var(--surface,#fff)}.scl-c.ab{border-color:var(--teal,#2B6A87);box-shadow:0 0 0 2px rgba(43,106,135,.18)}
.scl-ch{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:14px 16px;border:0;background:none;text-align:left;cursor:pointer;color:inherit;font:inherit;min-height:64px}
.scl-ch b{display:block;font-size:16px}.scl-ch span{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.scl-ch em{font-style:normal;font-weight:700;font-size:22px;text-align:right;white-space:nowrap}.scl-ch em small{display:block;font-size:11px;font-weight:500;color:var(--muted)}
.scl-out b{color:var(--teal-strong,#143F54)}
.scl-form{padding:4px 16px 16px;display:flex;flex-direction:column;gap:12px}.scl-f{display:flex;flex-direction:column;gap:6px}.scl-f>span{font-weight:600;font-size:14px}
.scl-in{font-size:20px;min-height:52px}.scl-lns{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.scl-ln{min-height:56px;border-radius:12px;border:1px solid var(--line,#D5DDE3);background:var(--surface,#fff);font:inherit;font-size:17px;font-weight:600;cursor:pointer;color:inherit}.scl-ln.on{background:var(--teal-strong,#143F54);color:#fff;border-color:var(--teal-strong,#143F54)}
.scl-ac{display:flex;gap:8px;flex-wrap:wrap}.scl-big{flex:1 1 220px;min-height:56px;font-size:17px}
.scl-rcb{display:block;margin-top:3px;font-size:11.5px;font-weight:600;color:var(--ok,#2F8C5A)}
.scl-r{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line,#E3E8EC)}.scl-r:first-of-type{border-top:0}.scl-r b{display:block}.scl-r span{display:block;color:var(--muted);font-size:13px}
</style>`);
