/* Painel Colafix · 63-leituras.js (27/10, cota do Firebase: "cada abertura do painel gasta ~4.500 leituras")
   Curva S / Previsto × Realizado / O que precisa produzir: as entregas do mês eram lidas DUAS vezes — a lista viva das 1.000
   mais recentes (S.entregas) e, de novo, uma escuta com o mês inteiro. Agora o mês é montado a partir da lista viva; só a parte
   do mês mais antiga do que a lista viva é buscada (uma vez, sem escuta). Prefixo `le`. */
"use strict";
const LE_OLD={}; let LE_MEMO={};
function ritEntMes(cp){ if(!S.db||!cp) return null;
  const a=new Date(+cp.slice(0,4),+cp.slice(5,7)-1,0), b=new Date(+cp.slice(0,4),+cp.slice(5,7),2);
  const de=a.toISOString().slice(0,10), ate=b.toISOString().slice(0,10);
  const viva=S._entViva; if(!Array.isArray(viva)) return S._ritEnt[cp]||null; /* lista viva ainda não chegou */
  const todas=S.entregas||viva; let menor=null; if(viva.length>=1000) viva.forEach(e=>{ if(e.em&&(menor===null||e.em<menor)) menor=e.em; });
  const precisaVelho=menor!==null&&menor>de; const O=LE_OLD[cp];
  if(precisaVelho&&(!O||(O.ok&&O.ate<menor)&&!O.busy)){
    const st=LE_OLD[cp]=Object.assign(O||{},{busy:true,ok:O?O.ok:false}); const lim=menor;
    S.db.collection('entregas').where('em','>=',de).where('em','<',lim).orderBy('em').get()
      .then(sn=>{ st.xs=sn.docs.map(d=>Object.assign({_id:d.id},d.data())); st.ate=lim; st.ok=true; st.busy=false; LE_MEMO={}; rerenderSeguro(); })
      .catch(e=>{ st.busy=false; console.warn('[leituras] entregas antigas do mês',cp,e); setTimeout(()=>{ if(LE_OLD[cp]===st&&!st.ok) delete LE_OLD[cp]; },60000); }); }
  if(precisaVelho&&!(LE_OLD[cp]&&LE_OLD[cp].ok)) return S._ritEnt[cp]||null;
  const k=cp+'|'+todas.length+'|'+(menor||'')+'|'+(LE_OLD[cp]&&LE_OLD[cp].ate||''); if(LE_MEMO[cp]&&LE_MEMO[cp].k===k&&LE_MEMO[cp].ref===todas) return LE_MEMO[cp].v;
  const m=new Map(); if(precisaVelho) (LE_OLD[cp].xs||[]).forEach(e=>m.set(e._id,e));
  todas.forEach(e=>{ if(e.em&&e.em>=de&&e.em<ate) m.set(e._id,e); });
  const v=[...m.values()].sort((x,y)=>String(x.em).localeCompare(String(y.em))); S._ritEnt[cp]=v; LE_MEMO[cp]={k,ref:todas,v}; return v; }
/* inventário da administradora: carrega só ao abrir; o programa espera as conferências chegarem (até 8 s) */
if(window.Painel&&Painel.inv&&Painel.inv.pronto){ const _p=Painel.inv.pronto; Painel.inv.pronto=function(){ if(!_p.apply(this,arguments)) return false;
  if(!(S.acs&&S.acs.dono)) return true; if(!S._leitAlx){ leitAlxAgora(); if(S._leitAlx&&S.db) assinaPorPerfil(S.db); return false; }
  return !!S.alx._l_conferencias||Date.now()-(S._leitAlxEm||0)>8000; }; }
