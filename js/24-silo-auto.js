/* Painel Colafix · 24-silo-auto.js — desconto automático dos silos pelo apontamento: diagnóstico e configuração guiada.
   O desconto já existia (09-silos-final.js: siloProcessarEntrega); só funciona com: silo de cada linha (config/geral.siloConsumo),
   saldo inicial do silo (medição no sistema novo) e kg de cimento do produto (itens.kgCimento). Este quadro mostra o que falta e
   resolve ali mesmo; depois de salvar, os apontamentos que ficaram para trás são descontados (siloReconciliar). */
"use strict";
/* ---------- AREIA: desconto pelo apontamento, igual ao cimento (movimentos ca_/ra_/ea_ em silomov) ---------- */
function kgAreia(cod){ cod=String(cod||'').toUpperCase(); const it=itemDe(cod); return it&&+it.kgAreia>0?+it.kgAreia:0; }
function usaAreiaFab(l){ return !(S.cfg.linhasSemAreia||[]).includes(l); }
function siloAreiaDe(e){ const o=ordById(e.ordem); const linha=(o&&o.linha)||e.linha; if(!linha||!usaAreiaFab(linha)) return null;
  const cod=o?codigoDe(o):''; const kgU=kgAreia(cod); const kg=siloR((+e.qtd||0)*kgU); if(!(kg>0)) return null;
  return {linha,cod,kgU,kg,sid:(S.cfg.siloConsumoAreia||{})[linha]||''}; }
async function siloProcessarAreia(id,e,silencioso){ const fs=siloFs(); if(!fs||!id||!e) return null;
  if(e.anula) return siloEstornarAreia(e.anula,id);
  const c=siloAreiaDe(e); if(!c||!c.sid) return null;
  const agora=new Date().toISOString(), eu=siloEu(), movId='ca_'+id;
  const r=await fs.runTransaction(async t=>{ const mref=fs.doc('silomov/'+movId), rref=fs.doc('silomov/ra_'+id), sref=fs.doc('silos/'+c.sid);
    if((await t.get(mref)).exists||(await t.get(rref)).exists) return {dup:true};
    const sd=await t.get(sref); if(!sd.exists) return {semSaldo:true};
    const ref=siloRefEm(e)||agora; if(sd.data().medidoEm&&ref<=sd.data().medidoEm) return {jaMedido:true};
    const antes=siloR(sd.data().saldoKg);
    const base={silo:c.sid,material:'areia',entregaId:id,ordem:e.ordem||null,num:e.num||null,linha:c.linha,codigo:c.cod,qtd:+e.qtd||0,kgPorUn:c.kgU,refEm:ref,em:agora,origem:'apontamento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu};
    if(c.kg>antes+1e-6){ t.set(rref,Object.assign({tipo:'recusado',antesKg:antes,pedidoKg:c.kg,deltaKg:0,depoisKg:antes,motivo:'Estoque insuficiente no silo'},base)); return {insuf:true,antes}; }
    const depois=siloR(antes-c.kg);
    t.set(mref,Object.assign({tipo:'consumo',antesKg:antes,deltaKg:-c.kg,depoisKg:depois},base));
    t.set(sref,{saldoKg:depois,atualizadoEm:agora,origem:'consumo',ultimoMov:movId,...eu},{merge:true});
    return {ok:true,antes,depois}; });
  if(r.insuf&&!silencioso) siloAviso(`Estoque insuficiente no silo ${siloNome(c.sid)}: saldo ${fkg(r.antes)}, consumo de areia de ${fkg(c.kg)} (ordem ${e.num||''}). O apontamento foi salvo, mas o saldo do silo NÃO foi alterado. Confira o silo e registre uma medição.`,'erro');
  return Object.assign({sid:c.sid,kg:c.kg},r); }
async function siloEstornarAreia(origId,anulaId){ const fs=siloFs(); if(!fs) return null; const agora=new Date().toISOString(), eu=siloEu(), movId='ea_'+origId;
  return fs.runTransaction(async t=>{ const cref=fs.doc('silomov/ca_'+origId), eref=fs.doc('silomov/'+movId);
    const ce=await t.get(cref); if(!ce.exists) return {nada:true}; if((await t.get(eref)).exists) return {dup:true};
    const c=ce.data(), sref=fs.doc('silos/'+c.silo), sd=await t.get(sref), antes=siloR(sd.exists?sd.data().saldoKg:0), kg=siloR(-c.deltaKg), sdd=sd.exists?sd.data():{};
    const medidoDepois=sdd.medidoEm&&c.em&&sdd.medidoEm>c.em, depois=medidoDepois?antes:siloR(antes+kg);
    t.set(eref,{tipo:'estorno',material:'areia',silo:c.silo,entregaId:origId,anulaId:anulaId||null,ordem:c.ordem||null,num:c.num||null,linha:c.linha||null,antesKg:antes,deltaKg:medidoDepois?0:kg,depoisKg:depois,
      motivo:medidoDepois?'Apontamento desfeito depois de uma medição: saldo mantido (a medição já vale)':'Apontamento desfeito',refEm:agora,em:agora,origem:'apontamento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu});
    if(!medidoDepois) t.set(sref,{saldoKg:depois,atualizadoEm:agora,origem:'estorno',ultimoMov:movId,...eu},{merge:true});
    return {ok:true,antes,depois}; }); }
/* todo apontamento passa pelo cimento (já existia) e depois pela areia */
{ const _pe=siloProcessarEntrega; siloProcessarEntrega=async function(id,e,sil){ const r=await _pe.apply(this,arguments); try{ await siloProcessarAreia(id,e,sil); }catch(x){ console.warn('[silos] areia',x); } return r; }; }
/* apontamentos que ficaram para trás (feitos antes de configurar a areia, ou sem internet) */
async function siloReconciliarAreia(){ if(!S.db||!siloFs()||!S.siloSub||S._siloRecA||(typeof soVer==='function'&&soVer())) return; S._siloRecA=true;
  try{ const feitos=new Set((S.siloMov||[]).filter(m=>/^(ca|ra)_/.test(m._id||'')).map(m=>m._id.slice(3))), an=anuladas(), lim=addDias(hojeStr(),-7);
    for(const e of (S.entregas||[])){ if(e.anula||an.has(e._id)||feitos.has(e._id)||!e.em||e.em.slice(0,10)<lim) continue; const c=siloAreiaDe(e); if(!c||!c.sid) continue;
      const sd=S.siloSaldo[c.sid], reg=siloRefEm(e); if(!sd||!sd.medidoEm||reg<=sd.medidoEm) continue; await siloEmFila(()=>siloProcessarAreia(e._id,e,true).catch(x=>console.warn('[silos] areia reconciliar',x&&x.code))); } }
  finally{ S._siloRecA=false; } }
setInterval(()=>{ siloReconciliarAreia().catch(()=>{}); },45000);

/* ---------- quadro "Desconto automático" (cimento e areia) ---------- */
const SA_MAT=[{k:'cim',nome:'Cimento',grupo:'Cimento',map:'siloConsumo',sem:'linhasSemCimento',usa:l=>usaCimFab(l),kg:c=>kgCimento(c),campo:'kgCimento'},
  {k:'are',nome:'Areia',grupo:'Areia',map:'siloConsumoAreia',sem:'linhasSemAreia',usa:l=>usaAreiaFab(l),kg:c=>kgAreia(c),campo:'kgAreia'}];
function saDiag(){ const LS=linhasOrd(), an=anuladas(), lim=addDias(hojeStr(),-30), mats=SA_MAT.filter(M=>(S.cfg.silos||[]).some(s=>s.grupo===M.grupo));
  const semSilo=[], sids=new Set(), semKg={};
  mats.forEach(M=>{ LS.filter(M.usa).forEach(l=>{ const xs=typeof smSilos==='function'?smSilos(M.map,l):((S.cfg[M.map]||{})[l]?[{sid:S.cfg[M.map][l]}]:[]); if(xs.length) xs.forEach(x=>sids.add(x.sid)); else semSilo.push({M,l}); }); });
  const semSaldo=[...sids].filter(id=>{ const d=S.siloSaldo[id]; return !d||d.saldoKg==null; });
  (S.entregas||[]).forEach(e=>{ if(e.anula||an.has(e._id)||!e.em||hojeStr(new Date(e.em))<lim) return; const o=ordById(e.ordem), l=(o&&o.linha)||e.linha, cod=o?String(codigoDe(o)||'').toUpperCase():''; if(!l||!cod) return;
    let conta=false; mats.forEach(M=>{ if(!M.usa(l)||!(S.cfg[M.map]||{})[l]||M.kg(cod)>0) return; const x=(semKg[cod]=semKg[cod]||{cod,n:0,desc:(itemDe(cod)||{}).descricao||'',falta:{}}); x.falta[M.k]=true; conta=true; }); if(conta) semKg[cod].n++; });
  const movs=S.siloMov||[], ult=M=>movs.find(m=>m.tipo==='consumo'&&(M.k==='are'?m.material==='areia':m.material!=='areia')), recus=movs.filter(m=>m.tipo==='recusado'&&m.em>=addDias(hojeStr(),-7)+'T');
  return {mats,semSilo,semSaldo,semKg:Object.values(semKg).sort((a,b)=>b.n-a.n),ult,recus,ok:!semSilo.length&&!semSaldo.length&&!Object.keys(semKg).length}; }
function saCard(){ if(!S.siloLido) return ''; const D=saDiag(), pode=siloPodeConfig(), medir=siloPodeMedir(); if(!D.mats.length) return '';
  if(D.ok){ const ls=D.mats.map(M=>{ const u=D.ult(M); return u?`${M.nome}: ${esc(new Date(u.em).toLocaleDateString('pt-BR'))} ${hora(u.em)} · ${esc(u.linha||'')} · ${fkg(-u.deltaKg)} do ${esc(siloNome(u.silo))}`:`${M.nome}: aguardando o primeiro apontamento`; });
    return `<section class="card sa sa-ok"><i class="sa-dot"></i><div><b>Desconto automático funcionando (${D.mats.map(M=>M.nome.toLowerCase()).join(' e ')})</b><span>Último desconto · ${ls.join(' · ')}${D.recus.length?` · <b style="color:var(--crit-ink)">${D.recus.length} desconto(s) recusado(s) por saldo insuficiente nos últimos 7 dias — registre uma medição</b>`:''}</span></div></section>`; }
  const passos=[];
  if(D.semSilo.length){ const ls=[...new Set(D.semSilo.map(x=>x.l))];
    passos.push(`<div class="sa-p"><b>${passos.length+1}. Escolha os silos de cada linha</b><span>De qual silo cada linha puxa o cimento e a areia. Sem isso, o apontamento não sabe de onde descontar.</span>
      <div class="sa-tab">${ls.map(l=>`<div class="sa-tr"><b>${esc(l)}</b>${D.mats.map(M=>{ const precisa=D.semSilo.some(x=>x.l===l&&x.M.k===M.k); if(!precisa){ const xs=typeof smSilos==='function'?smSilos(M.map,l):[]; return `<span class="sa-okc">${M.nome}: ${xs.length?esc(xs.map(x=>siloNome(x.sid)).join(' + ')):'não usa'}</span>`; }
        const cs=(S.cfg.silos||[]).filter(s=>s.grupo===M.grupo); return pode?`<label><span>${M.nome}</span><select class="txt" data-sa-silo="${M.k}" data-l="${esc(l)}"><option value="">— escolha —</option>${cs.map(s=>`<option value="${esc(s.id)}">${esc(s.nome)}</option>`).join('')}<option value="-">Esta linha não usa ${M.nome.toLowerCase()} do silo</option></select></label>`:`<em>${M.nome}: peça a quem configura</em>`; }).join('')}</div>`).join('')}</div>
      ${pode?'<button class="btn sec" data-act="sa-linhas">Salvar silos das linhas</button>':''}</div>`); }
  if(D.semSaldo.length) passos.push(`<div class="sa-p"><b>${passos.length+1}. Registre o saldo de partida</b><span>O desconto começa a partir de uma medição feita no painel.</span>
    <div class="sa-g">${D.semSaldo.map(id=>`<div class="sa-s"><span>${esc(siloNome(id))}</span>${medir?`<button class="btn" data-act="sa-medir" data-sa-sel="${esc(id)}">Registrar medição</button>`:'<em>peça a quem mede</em>'}</div>`).join('')}</div></div>`);
  if(D.semKg.length) passos.push(`<div class="sa-p"><b>${passos.length+1}. Informe quanto cimento e areia leva cada saco</b><span>Estes produtos foram apontados nos últimos 30 dias e não descontaram nada, porque o cadastro não tem esse número.</span>
    <div class="sa-tab">${D.semKg.slice(0,14).map(x=>`<div class="sa-tr"><b>${esc(x.cod)} <small>${esc(x.desc.slice(0,32))} · ${x.n} apont.</small></b>${D.mats.filter(M=>x.falta[M.k]).map(M=>`<label><span>kg de ${M.nome.toLowerCase()} por saco</span><input class="txt" data-sa-kg="${esc(x.cod)}" data-m="${M.campo}" inputmode="decimal" placeholder="ex.: ${M.k==='are'?'14':'4'}" ${pode?'':'disabled'}></label>`).join('')}</div>`).join('')}</div>
    ${pode?'<button class="btn sec" data-act="sa-kg">Salvar no cadastro dos itens</button>':''}</div>`);
  return `<section class="card sa sa-falta"><div class="sa-h"><i class="sa-dot"></i><div><b>O nível dos silos ainda não baixa sozinho</b><span>Falta${passos.length===1?'':'m'} ${passos.length} passo${passos.length===1?'':'s'} para cada apontamento descontar ${D.mats.map(M=>'o '+M.nome.toLowerCase()).join(' e ').replace('o areia','a areia')} dos silos.</span></div></div>${passos.join('')}</section>`; }
/* o quadro entra logo depois do fim real do cabeçalho da tela (conta as divisões abertas dentro dele) */
function saDepoisDoHead(h){ const i=h.indexOf('<div class="head"'); if(i<0) return 0; const re=/<\/?div\b/g; re.lastIndex=i; let d=0, m; while((m=re.exec(h))){ if(m[0]==='<div') d++; else { d--; if(d===0) return h.indexOf('>',m.index)+1; } } return 0; }
{ const _vs=vSilos; vSilos=function(){ const h=_vs.apply(this,arguments), c=saCard(); if(!c) return h; const j=saDepoisDoHead(h); return j>0?h.slice(0,j)+c+h.slice(j):c+h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="sa-medir"],[data-act="sa-linhas"],[data-act="sa-kg"]'); if(!b) return;
  if(b.dataset.act==='sa-medir'){ if(!siloPodeMedir()) return toast('Você não possui permissão para registrar medição.'); const id=b.dataset.saSel; S.siloSel=id; S.sm={silo:id,kg:'',motivo:'Medição física',outro:'',obs:'',salvando:false}; render(); setTimeout(()=>{ const i=document.getElementById('sm-kg'); if(i){ i.focus(); i.scrollIntoView({block:'center'}); } },80); return; } /* ação própria: não confunde com o botão da tela do silo */
  if(!siloPodeConfig()) return;
  try{ if(b.dataset.act==='sa-linhas'){ const up={}; let n=0;
      SA_MAT.forEach(M=>{ const m=Object.assign({},S.cfg[M.map]||{}), sem=new Set(S.cfg[M.sem]||(M.k==='cim'?linhasSemCim():[])); let mud=false;
        document.querySelectorAll(`[data-sa-silo="${M.k}"]`).forEach(x=>{ const l=x.dataset.l; if(x.value==='-'){ sem.add(l); mud=true; n++; } else if(x.value){ m[l]=x.value; mud=true; n++; } });
        if(mud){ up[M.map]=m; up[M.sem]=[...sem]; } });
      if(!n) return toast('Escolha o silo de pelo menos uma linha.');
      await S.db.doc('config/geral').set(up,{merge:true}); Object.assign(S.cfg,up); toast('Silos das linhas salvos.'); }
    if(b.dataset.act==='sa-kg'){ let n=0; const falt=new Set();
      for(const x of document.querySelectorAll('[data-sa-kg]')){ const v=numIn(x.value); if(!(v>0)) continue; const cod=x.dataset.saKg, campo=x.dataset.m||'kgCimento', it=(S.itens||[]).find(i=>String(i.codigo||'').toUpperCase()===cod);
        if(!it){ falt.add(cod); continue; } await S.db.doc('itens/'+it._id).update({[campo]:v}); it[campo]=v; n++; }
      if(falt.size) toast('Não achei no cadastro de Itens: '+[...falt].join(', ')+'. Cadastre o item em Ajustes → Itens.'); else if(!n) return toast('Preencha pelo menos um valor.'); else toast(n+' valor(es) salvos no cadastro dos itens.'); }
    render(); setTimeout(()=>{ siloReconciliar().catch(()=>{}); siloReconciliarAreia().catch(()=>{}); },800); /* desconta os apontamentos que ficaram para trás */ }
  catch(e){ erro(e); } },true);
document.head.insertAdjacentHTML('beforeend',`<style id="sa-css">
.sa{display:flex;flex-direction:column;gap:12px;border-left:5px solid var(--warn)!important}.sa-ok{flex-direction:row;align-items:center;gap:12px;border-left-color:var(--ok)!important}
.sa b{display:block;font-size:16px}.sa span{display:block;font-size:14px;color:var(--muted)}.sa-h{display:flex;gap:12px;align-items:center}
.sa-dot{width:12px;height:12px;border-radius:50%;background:var(--warn);flex:none}.sa-ok .sa-dot{background:var(--ok)}
.sa-p{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:12px;background:var(--surface-2)}.sa-p>.btn{align-self:flex-start}
.sa-tab{display:flex;flex-direction:column;gap:8px}.sa-tr{display:grid;grid-template-columns:minmax(160px,1fr) repeat(2,minmax(200px,1fr));gap:10px;align-items:end;padding:8px 0;border-top:1px solid var(--line)}.sa-tr>b{align-self:center;font-size:15px}.sa-tr small{display:block;font-weight:400;color:var(--muted)}.sa-tr label{display:flex;flex-direction:column;gap:4px;font-size:13px}.sa-okc{align-self:center;font-size:13px;color:var(--ok-ink)}
@media (max-width:760px){.sa-tr{grid-template-columns:1fr}}
.sa-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:4px 0}.sa-g label,.sa-s{display:flex;flex-direction:column;gap:4px;font-size:14px}.sa-g small{color:var(--muted)}.sa-s .btn{align-self:flex-start}
</style>`);
/* ===FIM SILO AUTO=== */
