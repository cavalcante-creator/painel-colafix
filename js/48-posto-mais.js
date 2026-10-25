/* Painel Colafix · 48-posto-mais.js (24/10) — pedidos 4, 7 e 9 da lista de ideias.
   4) Ordem urgente (prioridade 1 do rancho, que já existia no diário/fila/programação/TV de produção) aparece também no posto,
      no calendário (etiqueta P1…P4 no cartão) e na TV do monitor do almox ("URGENTE").
   7) Perda no posto: no "Apontar produção" há o campo "Perda (rasgados ou descartados)". Grava perdas/{id}
      {ordem,num,linha,produto,qtd,un,em,por,operador,cracha,origem:'posto'}. Aparece no Conferir apontamentos (PCP) e no Relatório do dia do gestor.
   9) Rancho a caminho: na espera do posto, cada linha mostra "Rancho N separado às HH:MM · a caminho"; quando o almox conclui a
      separação de um rancho das linhas do posto, o posto toca e mostra o aviso. */
"use strict";
/* ---------- 4) urgente ---------- */
function pmUrg(o){ try{ return !!o&&!o._pv&&dbPri(o)===1; }catch(e){ return false; } }
{ const _c=calCard; calCard=function(o){ let h=_c.apply(this,arguments); try{ if(o&&!o._pv&&o.status==='aberta'&&dbPri(o)) h=h.replace('<b>',priTag(o)+'<b>'); }catch(e){} return h; }; }
{ const _r=tvnRanSit; tvnRanSit=function(o){ const s=_r.apply(this,arguments); try{ if(s&&!s.ent&&pmUrg(o)) return Object.assign({},s,{t:'URGENTE · '+s.t}); }catch(e){} return s; }; }
{ const _oc=poOrdCab; poOrdCab=function(o){ let h=_oc.apply(this,arguments); try{ if(pmUrg(o)) h=h.replace('<small>','<small><span class="pm-urg">URGENTE</span> '); }catch(e){} return h; }; }
/* ---------- 9) rancho separado / a caminho, por linha ---------- */
function pmOrdsLinha(l){ const h=hojeStr(), xs=[]; try{ const r=ordemRodando(l); if(r) xs.push(r); }catch(e){} try{ ordensDoDia(h,l).forEach(o=>{ if(!xs.includes(o)) xs.push(o); }); }catch(e){} return xs; }
function pmRanchoLinha(l){ const xs=pmOrdsLinha(l).filter(o=>o.rancho&&o.rdb&&o.rdb.sep&&!o.rdb.ent); return xs[0]||null; }
{ const _e=poEstLinha; poEstLinha=function(l){ const e=_e.apply(this,arguments); try{ const o=pmRanchoLinha(l), u=pmOrdsLinha(l).find(pmUrg);
    const r=Object.assign({},e); if(o){ const s=o.rdb.sep, tx='Rancho '+o.rancho+' separado'+(s.em?' às '+hora(s.em):'')+' · a caminho da linha'; r.ch=[e.ch,tx].filter(Boolean).join(' · '); }
    if(u){ const resto=e.t?(e.t.indexOf('ordem '+u.num)<0?e.t:e.t.replace('Produzindo · ordem '+u.num,'produzindo')):''; r.t='URGENTE · ordem '+u.num+(resto?' · '+resto:''); }
    return r; }catch(x){ return e; } }; }
let _pmSepV=null;
setInterval(()=>{ try{ if(typeof poOn!=='function'||!poOn()||!ttAtivo()) return; const lim=Date.now()-3*36e5, novos=[], vis=new Set();
  ttLinhas().forEach(l=>pmOrdsLinha(l).forEach(o=>{ const s=o.rancho&&o.rdb&&o.rdb.sep; if(!s||o.rdb.ent||!s.em||new Date(s.em).getTime()<lim) return; const k=o.rancho+'|'+l; if(vis.has(k)) return; vis.add(k); if(_pmSepV&&!_pmSepV.has(k)) novos.push({o,l}); }));
  if(!_pmSepV) _pmSepV=new Set(); vis.forEach(k=>_pmSepV.add(k));
  if(novos.length){ const x=novos[0]; try{ SOMpo('pronto'); }catch(e){} toast('Rancho '+x.o.rancho+' (ordem '+x.o.num+') foi separado e está a caminho da '+x.l+'.'+(novos.length>1?' Mais '+(novos.length-1)+'.':'')); if(S.tt&&S.tt.fase==='espera') render(); }
}catch(e){} },3000);
/* ---------- 7) perda no posto ---------- */
S.perdas=[]; let _pmPdSub=false;
setInterval(()=>{ try{ if(_pmPdSub||!S.db||!S.acs||!S.acs.pronto) return; if(!(viewOk('gxdia')||viewOk('apconf')||(typeof poOn==='function'&&poOn()))) return; _pmPdSub=true;
  inscrever('perdas',()=>S.db.collection('perdas').orderBy('em','desc').limit(300),snap=>{ S.perdas=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); rerenderSeguro(); }); }catch(e){} },1500);
function pmPerdasDia(d){ return (S.perdas||[]).filter(x=>x.em&&hojeStr(new Date(x.em))===d); }
{ const _v=vPosto; vPosto=function(){ let h=_v.apply(this,arguments); try{ const T=S.tt; if(h&&T&&T.fase==='poap'&&T.ap){ const o=ttOrd(), un=o?ttUn(o):'sc';
    const box=`<section class="po-box pm-pd"><label class="po-lb" for="po-pd">Perda <small>(rasgados ou descartados, ${esc(un)})</small></label><input id="po-pd" class="po-in" inputmode="numeric" autocomplete="off" maxlength="5" value="${esc(T.ap.pd||'')}" placeholder="0"><small class="po-dica">Não entra no apontado · vai para o PCP</small></section>`;
    const i=h.indexOf('id="po-av"'), j=i>=0?h.indexOf('</section></div>',i):-1; if(j>=0) h=h.slice(0,j)+'</section>'+box+'</div>'+h.slice(j+'</section></div>'.length);
    h=h.replace('<div class="po-q2">','<div class="po-q2 pm-q3">'); pmBotao(h); } }catch(e){} return h; }; }
function pmBotao(){ setTimeout(()=>{ try{ const T=S.tt; if(!T||T.fase!=='poap') return; const pd=+(T.ap&&T.ap.pd)||0, bt=document.querySelector('[data-act="po-ap-ok"]'), o=ttOrd(); if(!bt||!o||!pd) return;
  const pp=+T.ap.pp||0, tot=T.ap.pal*pp+(+T.ap.av||0), un=ttUn(o); bt.disabled=!!T.enviando||!S._entOrd[o._id]; bt.innerHTML='<b>'+(T.enviando?'Enviando…':(tot>0?'Apontar '+fQ(tot)+' '+esc(un)+' + perda '+fQ(pd):'Registrar perda de '+fQ(pd)+' '+esc(un))+' (Enter)')+'</b>'; }catch(e){} },0); }
{ const _a=poAtualiza; poAtualiza=function(){ const r=_a.apply(this,arguments); pmBotao(); return r; }; }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||t.id!=='po-pd'||!S.tt||!S.tt.ap) return; const v=t.value.replace(/\D/g,'').slice(0,5); if(v!==t.value) t.value=v; S.tt.ap.pd=v; poAtualiza(); });
{ const _ap=poApontar; poApontar=async function(){ const T=S.tt, o=ttOrd(), pd=+(T&&T.ap&&T.ap.pd)||0; if(!pd||!o||!T.p||T.enviando) return _ap.apply(this,arguments);
  const pp=+T.ap.pp||0, tot=T.ap.pal*pp+(+T.ap.av||0), un=ttUn(o);
  T.enviando=true; render(); const d={ordem:o._id,num:o.num,linha:o.linha,produto:o.produto||'',qtd:pd,un,em:new Date().toISOString(),por:S.uid||null,operador:T.p.nome,cracha:T.p.codigo||null,origem:'posto'};
  try{ const r=await S.db.collection('perdas').add(d); S.perdas=[Object.assign({_id:r&&r.id},d)].concat(S.perdas||[]); }catch(e){ T.enviando=false; T.msg='Não foi possível salvar a perda. Confira a internet e tente de novo.'; render(); return; }
  T.enviando=false; T.ap.pd='';
  if(tot>0){ await _ap.apply(this,arguments); if(T.fase==='pook'){ T.okTxt=(T.okTxt||'')+' · perda de '+fQ(pd)+' '+un+' registrada'; render(); } return; }
  try{ SOMpo('ok'); }catch(e){} poVai('pook',{okTit:'Perda registrada: '+fQ(pd)+' '+un,okTxt:'Ordem '+o.num+' · '+o.linha+' · o PCP vê em Conferir apontamentos · no nome de '+T.p.nome}); }; }
function pmPerdaCard(d,tit){ const xs=pmPerdasDia(d); if(!xs.length) return ''; const tot=xs.reduce((a,x)=>a+(+x.qtd||0),0), por={}; xs.forEach(x=>{ por[x.linha||'—']=(por[x.linha||'—']||0)+(+x.qtd||0); });
  return `<section class="card pm-pdc"><div class="head" style="align-items:baseline"><div><div class="eyebrow">PERDA NO POSTO</div><h2 style="margin:2px 0 0">${esc(tit)} · ${fQ(tot)} sacos</h2><div class="sub" style="margin:2px 0 0">${Object.keys(por).map(l=>esc(l)+': '+fQ(por[l])).join(' · ')}</div></div></div>
    ${xs.slice(0,30).map(x=>`<div class="row num" style="grid-template-columns:64px minmax(0,1fr) auto"><span>${hora(x.em)}</span><span><b>Ordem ${esc(x.num||'')}</b> · ${esc(x.linha||'')}<small style="display:block;color:var(--muted)">${esc(String(x.produto||'').replace(/^\S+\s+-\s+/,''))}${x.operador?' · '+esc(x.operador):''}</small></span><b>${fQ(+x.qtd||0)} ${esc(x.un||'')}</b></div>`).join('')}</section>`; }
{ const _c=vApConf; vApConf=function(){ return _c.apply(this,arguments)+pmPerdaCard(hojeStr(),'Perda de hoje'); }; S.extViews.apconf=vApConf; }
{ const _d=vGxDia; vGxDia=function(){ const h=_d.apply(this,arguments); try{ const dia=(S.gx&&S.gx.dia)||hojeStr(); return h+pmPerdaCard(dia,'Perda do dia'); }catch(e){ return h; } }; S.extViews.gxdia=vGxDia; }
document.head.insertAdjacentHTML('beforeend',`<style id="pm-css">
.pm-urg{display:inline-block;padding:1px 8px;border-radius:6px;background:#C0392B;color:#fff;font-weight:700;letter-spacing:.04em;margin-right:4px}
.po-q2.pm-q3{grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.pm-pd .po-lb small{font-weight:500;opacity:.8}
.ccard .prit{float:right;margin-left:4px;font-size:10px}
.pm-pdc{margin-top:18px}
</style>`);
