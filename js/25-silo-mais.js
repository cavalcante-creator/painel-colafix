/* Painel Colafix · 25-silo-mais.js — silos: (1) medição manual × automático lado a lado (modo comparação),
   (2) receber material no silo pela nota (tela "Receber no silo", celular do almox), (3) linha puxando de mais de um silo (%).
   Não reescreve o motor do cimento de um silo só (09-silos-final.js); só assume quando a linha tem 2+ silos, e a areia. */
"use strict";
/* ---------- silos de cada linha: texto (um silo) ou lista [{sid,pct}] (vários) ---------- */
function smSilos(mapKey,linha){ const v=(S.cfg[mapKey]||{})[linha]; if(!v) return []; if(typeof v==='string') return [{sid:v,pct:100}];
  if(Array.isArray(v)){ const xs=v.filter(x=>x&&x.sid), tot=xs.reduce((a,x)=>a+(+x.pct||0),0); return xs.map(x=>({sid:x.sid,pct:tot>0?(+x.pct||0)*100/tot:100/xs.length})); } return []; }
const SM_MAT={cim:{k:'cim',nome:'Cimento',grupo:'Cimento',map:'siloConsumo',p:'c',r:'r',e:'e',kg:c=>kgCimento(c),usa:l=>usaCimFab(l)},
  are:{k:'are',nome:'Areia',grupo:'Areia',map:'siloConsumoAreia',p:'ca',r:'ra',e:'ea',kg:c=>kgAreia(c),usa:l=>usaAreiaFab(l)}};
/* o motor antigo do cimento só cuida de linha com UM silo; com vários, este arquivo assume */
{ const _cd=siloConsumoDe; siloConsumoDe=function(e){ const r=_cd.apply(this,arguments); if(!r) return r; const xs=smSilos('siloConsumo',r.linha); if(xs.length>1) return null; if(xs.length===1) r.sid=xs[0].sid; return r; }; }
function smParte(M,e){ const o=ordById(e.ordem), linha=(o&&o.linha)||e.linha; if(!linha||!M.usa(linha)) return null; const cod=o?codigoDe(o):'', kgU=M.kg(cod), kg=siloR((+e.qtd||0)*kgU); if(!(kg>0)) return null;
  const xs=smSilos(M.map,linha); if(!xs.length) return null; let resto=kg; const partes=xs.map((x,i)=>{ const q=i===xs.length-1?siloR(resto):siloR(kg*x.pct/100); resto=siloR(resto-q); return {sid:x.sid,kg:q,pct:Math.round(x.pct)}; });
  return {linha,cod,kgU,kg,partes}; }
async function smProcessar(M,id,e,silencioso){ const fs=siloFs(); if(!fs||!id||!e) return null; if(e.anula) return smEstornar(M,e.anula,id);
  const c=smParte(M,e); if(!c) return null; const agora=new Date().toISOString(), eu=siloEu(), ref=siloRefEm(e)||agora;
  const r=await fs.runTransaction(async t=>{ const main=fs.doc('silomov/'+M.p+'_'+id), rref=fs.doc('silomov/'+M.r+'_'+id);
    if((await t.get(main)).exists||(await t.get(rref)).exists) return {dup:true};
    const ps=[]; for(const p of c.partes){ const sd=await t.get(fs.doc('silos/'+p.sid)); if(!sd.exists||sd.data().saldoKg==null) continue; if(sd.data().medidoEm&&ref<=sd.data().medidoEm) continue; ps.push(Object.assign({antes:siloR(sd.data().saldoKg)},p)); }
    if(!ps.length) return {nada:true};
    const base={material:M.k==='are'?'areia':'cimento',entregaId:id,ordem:e.ordem||null,num:e.num||null,linha:c.linha,codigo:c.cod,qtd:+e.qtd||0,kgPorUn:c.kgU,refEm:ref,em:agora,origem:'apontamento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu};
    const falta=ps.find(p=>p.kg>p.antes+1e-6); if(falta){ t.set(rref,Object.assign({tipo:'recusado',silo:falta.sid,antesKg:falta.antes,pedidoKg:falta.kg,deltaKg:0,depoisKg:falta.antes,motivo:'Estoque insuficiente no silo'},base)); return {insuf:true,p:falta}; }
    ps.forEach((p,k)=>{ const depois=siloR(p.antes-p.kg), mid=k===0?M.p+'_'+id:M.p+'_'+id+'_'+(k+1);
      t.set(fs.doc('silomov/'+mid),Object.assign({tipo:'consumo',silo:p.sid,antesKg:p.antes,deltaKg:-p.kg,depoisKg:depois,pct:p.pct,partes:ps.length,parte:k+1},base));
      t.set(fs.doc('silos/'+p.sid),{saldoKg:depois,atualizadoEm:agora,origem:'consumo',ultimoMov:mid,...eu},{merge:true}); });
    return {ok:true,n:ps.length}; });
  if(r.insuf&&!silencioso) siloAviso(`Estoque insuficiente no silo ${siloNome(r.p.sid)}: saldo ${fkg(r.p.antes)}, consumo de ${M.nome.toLowerCase()} de ${fkg(r.p.kg)} (ordem ${e.num||''}). O apontamento foi salvo, mas os silos NÃO foram alterados. Confira e registre uma medição.`,'erro');
  return r; }
async function smEstornar(M,origId,anulaId){ const fs=siloFs(); if(!fs) return null; const agora=new Date().toISOString(), eu=siloEu();
  return fs.runTransaction(async t=>{ const main=await t.get(fs.doc('silomov/'+M.p+'_'+origId)); if(!main.exists) return {nada:true};
    if((await t.get(fs.doc('silomov/'+M.e+'_'+origId))).exists) return {dup:true};
    const n=+main.data().partes||1, docs=[main]; for(let k=2;k<=n;k++){ const d=await t.get(fs.doc('silomov/'+M.p+'_'+origId+'_'+k)); if(d.exists) docs.push(d); }
    const sds=[]; for(const d of docs){ sds.push(await t.get(fs.doc('silos/'+d.data().silo))); }
    docs.forEach((d,k)=>{ const c=d.data(), sd=sds[k], sdd=sd.exists?sd.data():{}, antes=siloR(sdd.saldoKg||0), kg=siloR(-c.deltaKg), medidoDepois=sdd.medidoEm&&c.em&&sdd.medidoEm>c.em, depois=medidoDepois?antes:siloR(antes+kg), eid=k===0?M.e+'_'+origId:M.e+'_'+origId+'_'+(k+1);
      t.set(fs.doc('silomov/'+eid),{tipo:'estorno',material:c.material||null,silo:c.silo,entregaId:origId,anulaId:anulaId||null,ordem:c.ordem||null,num:c.num||null,linha:c.linha||null,antesKg:antes,deltaKg:medidoDepois?0:kg,depoisKg:depois,
        motivo:medidoDepois?'Apontamento desfeito depois de uma medição: saldo mantido (a medição já vale)':'Apontamento desfeito',refEm:agora,em:agora,origem:'apontamento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu});
      if(!medidoDepois) t.set(fs.doc('silos/'+c.silo),{saldoKg:depois,atualizadoEm:agora,origem:'estorno',ultimoMov:eid,...eu},{merge:true}); });
    return {ok:true}; }); }
/* areia (um ou vários silos) e cimento com vários silos passam por aqui; o estorno do cimento também (cobre um ou vários) */
siloProcessarAreia=(id,e,sil)=>smProcessar(SM_MAT.are,id,e,sil);
siloEstornarAreia=(origId,anulaId)=>smEstornar(SM_MAT.are,origId,anulaId);
siloEstornar=(origId,anulaId)=>smEstornar(SM_MAT.cim,origId,anulaId);
{ const _pe=siloProcessarEntrega; siloProcessarEntrega=async function(id,e,sil){ const r=await _pe.apply(this,arguments);
    try{ if(!e.anula){ const o=ordById(e.ordem), l=(o&&o.linha)||e.linha; if(l&&smSilos('siloConsumo',l).length>1) await smProcessar(SM_MAT.cim,id,e,sil); } }catch(x){ console.warn('[silos] cimento em vários silos',x); } return r; }; }
async function smReconciliar(){ if(!S.db||!siloFs()||!S.siloSub||S._smRec||(typeof soVer==='function'&&soVer())) return; S._smRec=true;
  try{ const ids=new Set((S.siloMov||[]).map(m=>m._id||'')), an=anuladas(), lim=addDias(hojeStr(),-7);
    for(const e of (S.entregas||[])){ if(e.anula||an.has(e._id)||!e.em||e.em.slice(0,10)<lim) continue; const o=ordById(e.ordem), l=(o&&o.linha)||e.linha; if(!l) continue;
      for(const M of [SM_MAT.cim,SM_MAT.are]){ if(M.k==='cim'&&smSilos(M.map,l).length<2) continue; if(ids.has(M.p+'_'+e._id)||ids.has(M.r+'_'+e._id)) continue; const c=smParte(M,e); if(!c) continue;
        const reg=siloRefEm(e); if(!c.partes.some(p=>{ const sd=S.siloSaldo[p.sid]; return sd&&sd.medidoEm&&reg>sd.medidoEm; })) continue;
        await siloEmFila(()=>smProcessar(M,e._id,e,true).catch(x=>console.warn('[silos] reconciliar',x&&x.code))); } } }
  finally{ S._smRec=false; } }
siloReconciliarAreia=smReconciliar; setInterval(()=>{ smReconciliar().catch(()=>{}); },45000);

/* ---------- (1) medição manual × automático ---------- */
const smComparar=()=>S.cfg.siloComparar!==false;
{ const _rm=siloRegistrarMedicao; siloRegistrarMedicao=async function(p){ const fs=siloFs(); if(!fs) throw {code:'sem-db'}; const d=S.siloSaldo[p.sid];
    if(!smComparar()||p.usarComoSaldo||p.corrige||!d||d.saldoKg==null) return _rm.apply(this,arguments); /* sem saldo ainda: a medição é o saldo de partida */
    const agora=new Date().toISOString(), eu=siloEu(), em=p.em||agora, movId='m_'+p.medicaoId+'_'+p.sid;
    return fs.runTransaction(async t=>{ const mref=fs.doc('silomov/'+movId), sref=fs.doc('silos/'+p.sid); if((await t.get(mref)).exists) return {dup:true};
      const sd=await t.get(sref), auto=siloR(sd.exists?sd.data().saldoKg:0), kg=siloR(p.kg);
      t.set(mref,{tipo:'medicao',silo:p.sid,medicaoId:p.medicaoId,motivo:p.motivo,obs:p.obs||null,medidoPor:p.medidoPor||null,refEm:em,em:agora,medidoEm:em,origem:'medicao',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu,
        antesKg:auto,medidoKg:kg,diferencaKg:siloR(kg-auto),deltaKg:0,depoisKg:auto,aplicado:false,comparacao:true,nota:'Comparação: medição manual registrada; o saldo automático foi mantido'});
      t.set(sref,{manualKg:kg,manualEm:em,manualAutoKg:auto,manualMov:movId},{merge:true});
      return {ok:true,antes:auto,novo:auto,aplicado:false,comparacao:true,nota:'Medição registrada para comparar; o automático foi mantido'}; }); }; }
function smCompHtml(s){ const d=S.siloSaldo[s.id]; if(!d||d.saldoKg==null) return ''; const tem=d.manualKg!=null, dif=tem?siloR(d.manualKg-(d.manualAutoKg!=null?d.manualAutoKg:d.saldoKg)):0, base=tem?(d.manualAutoKg||d.saldoKg):0, pc=tem&&base?dif/base*100:0;
  return `<section class="card smc"><div class="smc-c"><span>Automático (agora)</span><b>${fkg(d.saldoKg)}</b><small>pelos apontamentos e recebimentos</small></div>
    <div class="smc-c"><span>Medido manualmente</span><b>${tem?fkg(d.manualKg):'—'}</b><small>${tem?esc(new Date(d.manualEm).toLocaleDateString('pt-BR'))+' '+hora(d.manualEm):'nenhuma medição para comparar ainda'}</small></div>
    <div class="smc-c ${tem?(Math.abs(pc)>5?'crit':Math.abs(pc)>2?'warn':'ok'):''}"><span>Diferença na hora da medição</span><b>${tem?fkgS(dif)+' ('+(pc>0?'+':'')+pc.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%)':'—'}</b><small>${tem?'medido − automático naquele momento':'registre uma medição para comparar'}</small></div>
    ${tem&&siloPodeMedir()?`<button class="btn sec" data-act="smc-usar" data-sid="${esc(s.id)}">Usar a medição como saldo</button>`:''}
    <label class="ck smc-mod">${siloPodeConfig()?`<input type="checkbox" data-smc-mod ${smComparar()?'checked':''}>`:''} Comparar (a medição manual não corrige o automático)</label></section>`; }

/* ---------- (2) receber material no silo pela nota ---------- */
async function smEntradaVarios(p){ const fs=siloFs(); if(!fs) throw {code:'sem-db'}; const agora=new Date().toISOString(), eu=siloEu(), grupo='n_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  return fs.runTransaction(async t=>{ const sds=[]; for(const x of p.partes){ const sd=await t.get(fs.doc('silos/'+x.sid)); if(!sd.exists||sd.data().saldoKg==null) return {semSaldo:true,sid:x.sid}; sds.push(sd); }
    const res=[]; p.partes.forEach((x,k)=>{ const antes=siloR(sds[k].data().saldoKg), depois=siloR(antes+x.kg), mid=p.partes.length===1?grupo:grupo+'_'+(k+1);
      t.set(fs.doc('silomov/'+mid),{tipo:'entrada',silo:x.sid,material:p.material||null,nf:p.nf,fornecedor:p.fornecedor||null,obs:p.obs||null,grupo,totalKg:siloR(p.totalKg),partes:p.partes.length,parte:k+1,antesKg:antes,deltaKg:siloR(x.kg),depoisKg:depois,refEm:agora,em:agora,origem:'recebimento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu});
      t.set(fs.doc('silos/'+x.sid),{saldoKg:depois,atualizadoEm:agora,origem:'entrada',ultimoMov:mid,...eu},{merge:true}); res.push({sid:x.sid,kg:x.kg,depois}); });
    return {ok:true,res}; }); }
async function smEntrada(p){ const fs=siloFs(); if(!fs) throw {code:'sem-db'}; const agora=new Date().toISOString(), eu=siloEu(), movId='n_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  return fs.runTransaction(async t=>{ const sref=fs.doc('silos/'+p.sid), sd=await t.get(sref); if(!sd.exists||sd.data().saldoKg==null) return {semSaldo:true};
    const antes=siloR(sd.data().saldoKg), depois=siloR(antes+p.kg);
    t.set(fs.doc('silomov/'+movId),{tipo:'entrada',silo:p.sid,material:p.material||null,nf:p.nf,fornecedor:p.fornecedor||null,obs:p.obs||null,antesKg:antes,deltaKg:siloR(p.kg),depoisKg:depois,refEm:agora,em:agora,origem:'recebimento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu});
    t.set(sref,{saldoKg:depois,atualizadoEm:agora,origem:'entrada',ultimoMov:movId,...eu},{merge:true}); return {ok:true,antes,depois,movId}; }); }
const srEst=()=>S.sr||(S.sr={mat:'',sids:[],div:'meio',pct:{},nf:'',q:'',un:'t',forn:'',salv:false,ok:null}); /* criado na hora (o estado do painel é refeito no login) */
function srPartes(R,kg){ const n=R.sids.length; if(!n) return []; const pc=R.sids.map(id=>R.div==='outra'?Math.max(0,+(R.pct[id]!=null?R.pct[id]:100/n)||0):100/n), tot=pc.reduce((a,x)=>a+x,0)||1; let resto=kg;
  return R.sids.map((sid,i)=>{ const q=i===n-1?siloR(resto):siloR(kg*pc[i]/tot); resto=siloR(resto-q); return {sid,kg:q}; }); }
function vSiloRec(){ const R=srEst(), mats=['Cimento','Areia'].filter(g=>(S.cfg.silos||[]).some(s=>s.grupo===g)), sal=saldoPorSilo(), hj=hojeStr();
  if(!R.mat&&mats.length===1) R.mat=mats[0]; const silos=(S.cfg.silos||[]).filter(s=>s.grupo===R.mat);
  const qkg=(numIn(R.q)||0)*(R.un==='t'?1000:1); R.sids=R.sids||[];
  const recs=(()=>{ const g={}, out=[]; (S.siloMov||[]).filter(m=>m.tipo==='entrada'&&String(m.em||'').slice(0,10)>=addDias(hj,-6)).forEach(m=>{ const k=m.grupo||m._id; if(!g[k]){ g[k]={em:m.em,nf:m.nf,fornecedor:m.fornecedor,material:m.material,deltaKg:0,silos:[]}; out.push(g[k]); } g[k].deltaKg+=+m.deltaKg||0; g[k].silos.push(siloNome(m.silo).replace(/\s*\(.*\)$/,'')+(m.partes>1?' '+fkg(m.deltaKg):'')); }); return out.slice(0,6); })();
  const COR={Cimento:'#5B6B78',Areia:'#C49A55'}, nm=id=>siloNome(id).replace(/\s*\(.*\)$/,'');
  const ICM={Cimento:'<path d="M5 20h14M7 20V9l5-4 5 4v11"/><path d="M10 20v-5h4v5"/>',Areia:'<path d="M3 18c3-6 6-9 9-9s6 3 9 9z"/><path d="M8 18c1.5-3 2.5-4 4-4"/>'};
  const ic=(k,c)=>`<svg viewBox="0 0 24 24" aria-hidden="true" style="stroke:${c||'currentColor'}">${ICM[k]||''}</svg>`;
  if(R.ok) return `<div class="srx"><section class="card srx-ok"><div class="srx-ic">✓</div><b>Recebido</b><span>${esc(R.ok)}</span><button class="btn srx-big" data-act="sr-novo">Receber outra nota</button><button class="lnk" data-go="silos">Ver os silos</button></section></div>`;
  const passo=(n,tit,feito,corpo)=>`<section class="card srx-p ${feito?'feito':''}"><div class="srx-ph"><span class="srx-n">${feito?'✓':n}</span><b>${tit}</b></div>${corpo}</section>`;
  const tanque=s=>{ const u=sal[s.id], cap=(+s.cap||0)*1000, pc=u&&cap?Math.max(0,Math.min(100,u.kg/cap*100)):0, on=R.sids.includes(s.id);
    return `<button class="srx-t ${on?'on':''}" data-act="sr-silo" data-v="${esc(s.id)}" aria-pressed="${on}" style="--c:${COR[R.mat]||'#2B6A87'}"><span class="srx-tq"><i style="height:${pc.toFixed(0)}%"></i></span><span class="srx-tt"><b>${esc(nm(s.id))}</b><small>${u?fkg(u.kg):'sem saldo'}${cap?' · '+Math.round(pc)+'%':''}</small></span>${on?'<em>✓</em>':''}</button>`; };
  const partes=R.sids.length>1&&qkg>0?srPartes(R,qkg):[];
  const barra=R.sids.length>1?`<div class="srx-bar">${(partes.length?partes:R.sids.map(sid=>({sid,kg:0}))).map((x,k)=>{ const w=partes.length?x.kg/qkg*100:100/R.sids.length; return `<span style="width:${w}%;--k:${k}"><b>${esc(nm(x.sid))}</b>${partes.length?`<small>${fkg(x.kg)}</small>`:''}</span>`; }).join('')}</div>`:'';
  const p1=passo(1,'Material',!!R.mat,`<div class="srx-ms">${mats.map(m=>`<button class="srx-m ${R.mat===m?'on':''}" data-act="sr-mat" data-v="${m}" style="--c:${COR[m]}"><i>${ic(m,'#FFFFFF')}</i><b>${m}</b></button>`).join('')}</div>`);
  const p2=R.mat?passo(2,'Em qual silo',R.sids.length>0,`<div class="srx-sub">Toque em mais de um se a carga foi dividida.</div><div class="srx-ts">${silos.map(tanque).join('')}</div>
      ${R.sids.length>1?`<div class="srx-dvh"><span>Divisão da carga</span><div class="seg">${[['meio',R.sids.length===2?'Meio a meio':'Partes iguais'],['outra','Outra divisão']].map(([k,n])=>`<button class="${R.div===k?'on':''}" aria-pressed="${R.div===k}" data-act="sr-div" data-v="${k}">${n}</button>`).join('')}</div></div>
        ${R.div==='outra'?`<div class="srx-pc">${R.sids.map(id=>`<label>${esc(nm(id))} <input class="txt" type="number" min="0" max="100" data-sr-pct="${esc(id)}" value="${Math.round(R.pct[id]!=null?R.pct[id]:100/R.sids.length)}"> %</label>`).join('')}</div>`:''}${barra}`:''}`):'';
  const p3=R.sids.length?passo(3,'Nota e quantidade',!!(String(R.nf||'').trim()&&qkg>0),`<div class="srx-g2"><label class="srx-f"><span>Número da nota fiscal</span><input class="txt srx-in" id="sr-nf" inputmode="numeric" placeholder="Ex.: 12345" value="${esc(R.nf)}"></label>
      <label class="srx-f"><span>Quantidade recebida</span><div class="srx-qq"><input class="txt srx-in" id="sr-q" inputmode="decimal" placeholder="0" value="${esc(R.q)}"><div class="seg">${[['t','t'],['kg','kg']].map(([k,n])=>`<button class="${R.un===k?'on':''}" aria-pressed="${R.un===k}" data-act="sr-un" data-v="${k}">${n}</button>`).join('')}</div></div></label></div>
      <label class="srx-f"><span>Fornecedor <small>(opcional)</small></span><input class="txt srx-in" id="sr-forn" placeholder="Ex.: Votorantim, Areeiro São João" value="${esc(R.forn)}"></label>`):'';
  const res=R.sids.length&&qkg>0?`<section class="card srx-res"><span>Vai entrar</span><b>${fkg(qkg)} de ${esc(R.mat.toLowerCase())}</b><small>${R.sids.length>1?srPartes(R,qkg).map(x=>fkg(x.kg)+' no '+esc(nm(x.sid))).join(' + '):'no '+esc(nm(R.sids[0]))}${String(R.nf||'').trim()?' · NF '+esc(R.nf):''}</small></section>`:'';
  return `<div class="srx"><div class="head"><div><div class="eyebrow">SILOS</div><h1>Receber no silo</h1><div class="sub">Informe a nota e a quantidade que chegou. O saldo do silo sobe na hora.</div></div></div>
    ${p1}${p2}${p3}${res}
    ${R.sids.length?`<div class="srx-acao"><button class="btn srx-big" data-act="sr-ok" ${R.salv?'disabled':''}>${R.salv?'Registrando…':'Registrar recebimento'}</button></div>`:''}
    ${recs.length?`<section class="card srx-recs"><div class="srx-ph"><b>Últimos recebimentos</b></div>${recs.map(m=>`<div class="srx-r" style="--c:${COR[m.material]||'#2B6A87'}"><i>${ic(m.material||'Cimento','#FFFFFF')}</i><div><b>${fkg(m.deltaKg)} <small>· NF ${esc(m.nf||'—')}</small></b><span>${esc(m.silos.join(' + '))}${m.fornecedor?' · '+esc(m.fornecedor):''}</span></div><small>${esc(new Date(m.em).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))} ${hora(m.em)}</small></div>`).join('')}</section>`:''}</div>`; }
VIEWS.silorec={nome:'Receber no silo',ic:'rota',mob:'Receber'}; Object.assign(CRUMB,{silorec:'Receber no silo'}); S.extViews=S.extViews||{}; S.extViews.silorec=vSiloRec;
function smMods(){ for(const id of ['almoxcel','silos']){ const M=MODS.find(x=>x.id===id); if(M&&!M.views.includes('silorec')) M.views.push('silorec'); } const A=MODS.find(x=>x.id==='almoxcel'); if(A) A.nome='Celular do almox'; }
smMods(); setTimeout(smMods,0); setTimeout(smMods,1500);
if(typeof SILO_TIPO!=='undefined') SILO_TIPO.entrada={ic:'🚚',n:'Recebimento (nota)'};
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="sr-"],[data-act="smc-usar"]'); if(!b) return; const a=b.dataset.act, R=srEst(), le=()=>{ const g=i=>{ const x=document.getElementById(i); return x?x.value:null; }; if(g('sr-nf')!=null) R.nf=g('sr-nf'); if(g('sr-q')!=null) R.q=g('sr-q'); if(g('sr-forn')!=null) R.forn=g('sr-forn'); };
  if(a==='smc-usar'){ const d=S.siloSaldo[b.dataset.sid]; if(!d||d.manualKg==null) return; if(!confirm('Usar a medição manual ('+fkg(d.manualKg)+') como saldo automático do '+siloNome(b.dataset.sid)+'?')) return;
    try{ await siloRegistrarMedicao({sid:b.dataset.sid,kg:d.manualKg,medicaoId:'ajuste'+Date.now().toString(36),motivo:'Correção de divergência',usarComoSaldo:true,em:new Date().toISOString()}); toast('Saldo automático ajustado pela medição.'); render(); }catch(e){ erro(e); } return; }
  le(); document.querySelectorAll('[data-sr-pct]').forEach(i=>{ R.pct[i.dataset.srPct]=+i.value||0; });
  if(a==='sr-mat'){ R.mat=b.dataset.v; R.sids=[]; render(); return; } if(a==='sr-silo'){ const v=b.dataset.v; R.sids=R.sids.includes(v)?R.sids.filter(x=>x!==v):R.sids.concat([v]); R.pct={}; render(); if(R.sids.length===1) setTimeout(()=>{ const i=document.getElementById('sr-nf'); if(i) i.focus(); },60); return; }
  if(a==='sr-div'){ R.div=b.dataset.v; render(); return; }
  if(a==='sr-un'){ R.un=b.dataset.v; render(); return; } if(a==='sr-novo'){ Object.assign(R,{nf:'',q:'',forn:'',ok:null,div:'meio',pct:{}}); render(); return; }
  if(a==='sr-ok'){ const kg=siloR((numIn(R.q)||0)*(R.un==='t'?1000:1)); if(!String(R.nf||'').trim()) return toast('Informe o número da nota.'); if(!(kg>0)) return toast('Informe a quantidade recebida.');
    if(R.div==='outra'&&R.sids.length>1&&!R.sids.some(id=>(R.pct[id]!=null?R.pct[id]:1)>0)) return toast('Informe a % de cada silo.');
    R.salv=true; render(); try{ const partes=srPartes(R,kg).filter(x=>x.kg>0); const r=await smEntradaVarios({partes,totalKg:kg,nf:String(R.nf).trim(),fornecedor:String(R.forn||'').trim(),material:R.mat}); R.salv=false;
      if(r.semSaldo){ toast('O '+siloNome(r.sid)+' ainda não tem saldo de partida. Registre uma medição do silo antes.'); render(); return; }
      R.ok=fkg(kg)+' · NF '+String(R.nf).trim()+' · '+r.res.map(x=>fkg(x.kg)+' no '+siloNome(x.sid)+' (agora '+fkg(x.depois)+')').join(' + '); render(); }catch(e){ R.salv=false; render(); erro(e); } } });
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset||t.dataset.smcMod==null) return; try{ await S.db.doc('config/geral').set({siloComparar:t.checked},{merge:true}); S.cfg.siloComparar=t.checked; toast(t.checked?'Modo comparação ligado: a medição manual não corrige o automático.':'Modo comparação desligado: a medição volta a corrigir o saldo.'); render(); }catch(e){ erro(e); } });

/* ---------- (3) editor dos silos de cada linha: um ou vários silos por material, com % ---------- */
function smRasc(){ if(S.smcfg) return S.smcfg; const r={}; for(const M of [SM_MAT.cim,SM_MAT.are]){ r[M.k]={}; linhasOrd().forEach(l=>{ r[M.k][l]=M.usa(l)?smSilos(M.map,l).map(x=>({sid:x.sid,pct:Math.round(x.pct)})):'nao'; }); } return S.smcfg=r; }
function smCfgHtml(){ const pode=siloPodeConfig(), R=smRasc(), mats=[SM_MAT.cim,SM_MAT.are].filter(M=>(S.cfg.silos||[]).some(s=>s.grupo===M.grupo));
  const cel=(M,l)=>{ const v=R[M.k][l], cs=(S.cfg.silos||[]).filter(s=>s.grupo===M.grupo), sel=v==='nao'?[]:v;
    return `<div class="smf-m"><span class="smf-t">${M.nome}</span><div class="smf-ch">${cs.map(s=>{ const on=sel.some(x=>x.sid===s.id); return `<button class="chip" data-act="smf-tg" data-m="${M.k}" data-l="${esc(l)}" data-sid="${esc(s.id)}" aria-pressed="${on}" ${pode?'':'disabled'}>${esc(s.nome)}</button>`; }).join('')}<button class="chip" data-act="smf-nao" data-m="${M.k}" data-l="${esc(l)}" aria-pressed="${v==='nao'}" ${pode?'':'disabled'}>Não usa</button></div>
      ${sel.length>1?`<div class="smf-pc">${sel.map(x=>`<label>${esc((cs.find(s=>s.id===x.sid)||{}).nome||x.sid)} <input class="txt" type="number" min="0" max="100" data-smf-pct="${M.k}|${esc(l)}|${esc(x.sid)}" value="${x.pct}" ${pode?'':'disabled'}> %</label>`).join('')}<small>a soma é ajustada para 100%</small></div>`:''}</div>`; };
  return `<section class="card smf"><div class="label">SILOS DE CADA LINHA</div><div class="sub" style="margin:4px 0 10px">De quais silos cada linha puxa o cimento e a areia. Com mais de um silo, o consumo é dividido pela porcentagem.</div>
    ${linhasOrd().map(l=>`<div class="smf-r"><b>${esc(l)}</b>${mats.map(M=>cel(M,l)).join('')}</div>`).join('')}
    ${pode?'<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" data-act="smf-ok">Salvar silos das linhas</button></div>':''}</section>`; }
siloCfgHtml=function(){ return smCfgHtml(); }; /* o seletor antigo (um silo) dá lugar ao editor novo */
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="smf-"]'); if(!b||!siloPodeConfig()) return; const a=b.dataset.act, R=smRasc();
  document.querySelectorAll('[data-smf-pct]').forEach(i=>{ const [m,l,sid]=i.dataset.smfPct.split('|'), v=R[m][l]; if(Array.isArray(v)){ const x=v.find(y=>y.sid===sid); if(x) x.pct=Math.max(0,+i.value||0); } });
  if(a==='smf-tg'){ const m=b.dataset.m, l=b.dataset.l, sid=b.dataset.sid; let v=R[m][l]; if(v==='nao') v=[]; const i=v.findIndex(x=>x.sid===sid); if(i>=0) v.splice(i,1); else v.push({sid,pct:0}); v.forEach(x=>x.pct=Math.round(100/v.length)); R[m][l]=v; render(); return; }
  if(a==='smf-nao'){ R[b.dataset.m][b.dataset.l]=R[b.dataset.m][b.dataset.l]==='nao'?[]:'nao'; render(); return; }
  if(a==='smf-ok'){ const up={}; for(const M of [SM_MAT.cim,SM_MAT.are]){ const map={}, sem=[]; Object.entries(R[M.k]).forEach(([l,v])=>{ if(v==='nao') sem.push(l); else if(v.length===1) map[l]=v[0].sid; else if(v.length>1){ const tot=v.reduce((s,x)=>s+(+x.pct||0),0)||1; map[l]=v.map(x=>({sid:x.sid,pct:Math.round((+x.pct||0)*100/tot)})); } });
      up[M.map]=map; up[M.k==='cim'?'linhasSemCimento':'linhasSemAreia']=sem; }
    try{ await S.db.doc('config/geral').set(up,{merge:true}); Object.assign(S.cfg,up); S.smcfg=null; toast('Silos das linhas salvos.'); render(); setTimeout(()=>{ siloReconciliar().catch(()=>{}); smReconciliar().catch(()=>{}); },800); }catch(e){ erro(e); } } },true);
/* tela do silo: comparação logo depois do quadro de desconto; o editor no fim também nas telas de areia */
{ const _vs=vSilos; vSilos=function(){ let h=_vs.apply(this,arguments); const s=(S.cfg.silos||[]).find(x=>x.id===S.siloSel)||(S.cfg.silos||[])[0]; if(!s) return h; const c=smCompHtml(s);
    if(c){ const i=h.indexOf('class="card sa '); const j=i>0?h.indexOf('</section>',i)+10:(typeof saDepoisDoHead==='function'?saDepoisDoHead(h):0); h=j>0?h.slice(0,j)+c+h.slice(j):c+h; }
    if(s.grupo==='Areia') h+=smCfgHtml(); return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="sm-css">
.smc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:12px;align-items:center}.smc-c{display:flex;flex-direction:column;gap:2px;padding:10px 14px;border-radius:12px;background:var(--surface-2)}
.smc-c span{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.smc-c b{font-size:24px}.smc-c small{font-size:12.5px;color:var(--muted)}
.smc-c.ok b{color:var(--ok-ink)}.smc-c.warn b{color:var(--warn-ink)}.smc-c.crit b{color:var(--crit-ink)}.smc-mod{grid-column:1/-1;font-size:13.5px;color:var(--muted)}
@media (max-width:860px){.smc{grid-template-columns:1fr}}
.smf-r{display:grid;grid-template-columns:140px repeat(2,minmax(0,1fr));gap:12px;padding:10px 0;border-top:1px solid var(--line);align-items:start}.smf-r>b{padding-top:6px}
.smf-m{display:flex;flex-direction:column;gap:6px}.smf-t{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.smf-ch{display:flex;gap:6px;flex-wrap:wrap}
.smf-pc{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.smf-pc label{display:flex;align-items:center;gap:6px;font-size:13.5px}.smf-pc input{width:72px;height:36px!important}.smf-pc small{color:var(--muted)}
@media (max-width:760px){.smf-r{grid-template-columns:1fr}}
.srx{max-width:760px;display:flex;flex-direction:column;gap:12px;padding-bottom:84px}
.srx-p{display:flex;flex-direction:column;gap:12px}.srx-ph{display:flex;align-items:center;gap:12px}.srx-ph b{font-size:18px}
.srx-n{width:32px;height:32px;border-radius:50%;background:var(--teal-strong);color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex:none}.srx-p.feito .srx-n{background:var(--ok)}
.srx-sub{font-size:14px;color:var(--muted);margin-top:-6px}
.srx-ms{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.srx-m{font:inherit;display:flex;align-items:center;gap:14px;padding:12px 16px;min-height:72px;border-radius:16px;border:2px solid var(--line);background:var(--surface);cursor:pointer;color:var(--ink)}
.srx-m i{width:46px;height:46px;border-radius:12px;background:var(--c);display:inline-flex;align-items:center;justify-content:center;flex:none}.srx-m svg,.srx-r svg{width:26px;height:26px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.srx-m b{font-size:19px}
.srx-m.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 10%,var(--surface))}
.srx-ts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.srx-t{position:relative;font:inherit;display:flex;align-items:center;gap:12px;padding:10px 14px;min-height:76px;border-radius:16px;border:2px solid var(--line);background:var(--surface);cursor:pointer;color:var(--ink);text-align:left}
.srx-tq{width:30px;height:52px;border-radius:8px 8px 6px 6px;border:2px solid var(--c);position:relative;overflow:hidden;flex:none;background:var(--surface-2)}.srx-tq i{position:absolute;left:0;right:0;bottom:0;background:var(--c);opacity:.85}
.srx-tt{display:flex;flex-direction:column}.srx-tt b{font-size:17px}.srx-tt small{font-size:13px;color:var(--muted)}.srx-t em{position:absolute;top:8px;right:10px;width:22px;height:22px;border-radius:50%;background:var(--c);color:#FFFFFF;font-style:normal;font-size:13px;display:flex;align-items:center;justify-content:center}
.srx-t.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 8%,var(--surface))}
.srx-dvh{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.srx-dvh>span{font-size:14px;font-weight:600}
.srx-pc{display:flex;gap:12px;flex-wrap:wrap}.srx-pc label{display:flex;align-items:center;gap:6px;font-size:15px}.srx-pc input{width:84px;height:44px!important}
.srx-bar{display:flex;height:54px;border-radius:12px;overflow:hidden;border:1px solid var(--line)}.srx-bar span{display:flex;flex-direction:column;justify-content:center;padding:0 12px;min-width:0;color:#FFFFFF;background:hsl(calc(200 + var(--k)*35) 35% calc(40% + var(--k)*8%))}.srx-bar b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.srx-bar small{font-size:13px;opacity:.9}
.srx-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:600px){.srx-g2{grid-template-columns:1fr}}
.srx-f{display:flex;flex-direction:column;gap:6px}.srx-f>span{font-size:13px;font-weight:600;color:var(--ink-2)}.srx-f small{font-weight:400;color:var(--muted)}
.srx-in{height:56px!important;font-size:20px!important}.srx-qq{display:flex;gap:8px;align-items:center}.srx-qq .srx-in{flex:1;min-width:0}.srx-qq .seg button{min-width:52px;height:46px}
.srx-res{display:flex;flex-direction:column;gap:2px;background:var(--teal-wash)!important;border:1px solid color-mix(in srgb,var(--teal) 25%,transparent)}.srx-res span{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--teal-strong)}.srx-res b{font-size:24px}.srx-res small{font-size:15px;color:var(--ink-2)}
.srx-acao{position:sticky;bottom:0;z-index:5;padding:10px 0 calc(10px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,var(--ground) 30%)}
.srx-big{width:100%;height:60px!important;font-size:18px!important}
@media (max-width:760px){.srx-acao{bottom:calc(62px + env(safe-area-inset-bottom,0px))}.srx-ms{grid-template-columns:1fr 1fr}.srx-m{gap:10px;padding:10px 12px}.srx-m i{width:38px;height:38px}.srx-m b{font-size:17px}.srx{padding-bottom:140px}}
.srx-recs{display:flex;flex-direction:column;gap:4px}.srx-r{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
.srx-r>i{width:40px;height:40px;border-radius:10px;background:var(--c);display:inline-flex;align-items:center;justify-content:center}.srx-r svg{width:22px;height:22px}.srx-r b{display:block;font-size:16px}.srx-r b small{font-weight:400;color:var(--muted)}.srx-r span{font-size:13.5px;color:var(--muted)}.srx-r>small{color:var(--muted);font-size:13px}
.srx-ok{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:32px 22px}.srx-ic{width:88px;height:88px;border-radius:50%;background:var(--ok);color:#fff;font-size:50px;display:flex;align-items:center;justify-content:center}.srx-ok>b{font-size:28px}.srx-ok>span{font-size:17px;color:var(--ink-2);max-width:520px}
</style>`);
/* ===FIM SILO MAIS=== */
