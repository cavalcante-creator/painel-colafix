/* Inventário · lista do dia e fechar cada divergência (pedido de 04/11: "refazer a lógica do inventário para ser o mais eficaz possível").
   1 · LISTA DO DIA AUTOMÁTICA (`invdia/{AAAA-MM-DD}`): o painel escolhe o que contar no dia, antes da expedição começar.
       Ordem: (a) divergências esperando recontagem por OUTRA pessoa (sempre, ao vivo); (b) giro alto (20% que mais saem nos
       últimos 30 dias) sem contagem há `giro` dias; (c) rodízio: o resto, do que está há mais tempo sem contar, `total ÷ dias` por dia
       (assim todos passam pela contagem em ~1 mês). No máximo `max` itens. Ajustes em `config/geral.invDia {hora,dias,giro,max}`.
       A lista do dia é gravada pela primeira pessoa do inventário que abre o painel no dia e não muda mais (a recontagem entra ao vivo).
   2 · FECHAR CADA DIVERGÊNCIA (`invdiv/{id}`): ao salvar uma contagem, cada item/almox com diferença ≥ 5 e ≥ 3% do saldo abre uma
       divergência (st 'recontar'). Recontagem de OUTRA pessoa: bateu → fecha sozinha (erro na 1ª contagem); não bateu → 'pcp'.
       A mesma pessoa recontando: se bateu, fecha sozinha; se não, continua esperando outra pessoa. O PCP fecha com a causa e se corrigiu
       no Focco (nº do documento) · 'Ainda não' deixa em 'focco' (Falta corrigir no Focco).
   Tela `anlinvd` "Divergências do inventário" em Análise PCP › Sistema. No programa do inventário: `inventario/js/dia.js` (cartão
   "Contagem do dia") pela ponte `Painel.inv.dia()`. Não muda `conferencia.js`. */
const INVD_PAD={hora:'07:30',dias:20,giro:7,max:60};
const INVD_CAUSAS=['Saldo do Focco antigo (vendeu depois da foto do saldo)','Faturado e não saiu (ou saiu sem nota)','Produção apontada a mais no Focco','Perda / rasgado sem baixa no Focco',
  'Transferência entre almoxarifados não lançada','Recebimento ou devolução não lançado','Item trocado (código errado)','Erro na contagem','Outra'];
S.invd=S.invd||{ab:[],fe:[],dia:null,diaK:null,uDia:null,sub:false,subFe:false,aba:'pcp',fm:null,q:''};
function invdCfg(){ const c=Object.assign({},INVD_PAD,(S.cfg&&S.cfg.invDia)||{}); c.dias=Math.max(1,+c.dias||20); c.giro=Math.max(1,+c.giro||7); c.max=Math.max(5,+c.max||60); return c; }
function invdTol(sis){ return Math.max(5,Math.abs(+sis||0)*0.03); }
function invdBl(local){ return (typeof XF_BLOCOS!=='undefined'&&XF_BLOCOS[local])||[3,30]; }
function invdDesc(c){ const it=(typeof itemDe==='function'&&itemDe(c))||{}; return it.descricao||((((S.anl.base||{}).itens||{}).l||{})[c]||{}).d||''; }
function invdDias(a,b){ return Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5); }
function invdMesma(a,b){ return !!(a&&b&&((a.por&&b.por&&a.por===b.por)||(!a.por||!b.por)&&a.porNome&&b.porNome&&anlNorm(a.porNome)===anlNorm(b.porNome))); }

/* ---------- leituras ---------- */
function invdAssina(){ const X=S.invd; if(!S.db||!S.acs||!S.acs.pronto) return; let pode=false; try{ pode=viewOk('inventario')||viewOk('anlinvd'); }catch(e){}
  if(!pode) return;
  if(!X.sub){ X.sub=true; inscrever('invdiv',()=>S.db.collection('invdiv').where('aberta','==',true).limit(500),snap=>{ X.ab=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); X._l_ab=true; rerenderSeguro(); }); }
  const h=hojeStr(); if(X.diaK!==h){ try{ X.uDia&&X.uDia(); }catch(e){} X.diaK=h; X.dia=null; X._l_dia=false;
    X.uDia=S.db.doc('invdia/'+h).onSnapshot(s=>{ X.dia=s.exists?s.data():null; X._l_dia=true; rerenderSeguro(); },e=>console.warn('[invdia]',e&&e.code)); }
  if(X._l_dia&&!X.dia&&!X.gerando) invdGera(); }
function invdAssinaFe(){ const X=S.invd; if(X.subFe||!S.db) return; X.subFe=true;
  inscrever('invdivfe',()=>S.db.collection('invdiv').orderBy('fechadoEm','desc').limit(150),snap=>{ X.fe=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.aberta); rerenderSeguro(); }); }
setInterval(()=>{ try{ invdAssina(); }catch(e){ console.warn('[invd]',e); } },1500);

/* ---------- 1 · lista do dia ---------- */
function invdUltimas(){ const u={}; ((S.alx&&S.alx.conferencias)||[]).forEach(cf=>{ if(!cf||cf.excluida) return; const d=cf.dia||String(cf.em||'').slice(0,10); for(const c in (cf.itens||{})) if(!u[c]||u[c]<d) u[c]=d; }); return u; }
function invdCalcLista(dia){ const C=invdCfg(), U=alxItensTodos().map(i=>String(i.codigo)), V=(((S.anl.base||{}).vendas||{}).diario)||{}, ult=invdUltimas(); dia=dia||hojeStr();
  const ini=hojeStr(new Date(new Date(dia+'T12:00').getTime()-30*864e5)); const sai={};
  U.forEach(c=>{ let s=0; const D=V[c]||{}; for(const d in D) if(d>=ini&&d<dia) s+=+D[d][1]||0; sai[c]=s; });
  const vend=U.filter(c=>sai[c]>0).sort((a,b)=>sai[b]-sai[a]); const giro=new Set(vend.slice(0,Math.max(1,Math.ceil(U.length*0.2))));
  const sem=c=>ult[c]?invdDias(ult[c],dia):9999; const out={};
  [...giro].filter(c=>sem(c)>=C.giro).sort((a,b)=>sem(b)-sem(a)||sai[b]-sai[a]).forEach(c=>{ out[c]={m:'giro',u:ult[c]||null}; });
  const q=Math.ceil(U.length/C.dias); U.filter(c=>!out[c]&&sem(c)>=1).sort((a,b)=>sem(b)-sem(a)||a.localeCompare(b)).slice(0,q).forEach(c=>{ out[c]={m:'rod',u:ult[c]||null}; });
  const ks=Object.keys(out).slice(0,C.max), r={}; ks.forEach(k=>r[k]=out[k]); return r; }
async function invdGera(){ const X=S.invd; if(!(S.alx&&S.alx._l_conferencias)||!S.anl.base||!S.anl.base.itens||!(S.itens||[]).length||!X._l_ab) return;
  let pode=false; try{ pode=viewOk('inventario'); }catch(e){} if(!pode) return; X.gerando=true;
  try{ const h=hojeStr(), it=invdCalcLista(h); if(!Object.keys(it).length) return; const doc={dia:h,em:new Date().toISOString(),por:S.uid||null,porNome:(S.nomes&&S.nomes[S.uid])||'',itens:it,n:Object.keys(it).length};
    await S.db.doc('invdia/'+h).set(doc); X.dia=doc; }catch(e){ console.warn('[invdia] gerar',e); } finally{ setTimeout(()=>{ X.gerando=false; },30000); } }
function invdConfHoje(){ const X=S.invd, h=hojeStr(); if(S.alx&&S.alx._l_conferencias) return S.alx.conferencias;
  if(S.db&&(!X.hc||X.hc.dia!==h||Date.now()-X.hc.t>120000)&&!X.hcLendo){ X.hcLendo=true; S.db.collection('conferencias').where('dia','==',h).limit(100).get().then(q=>{ X.hc={dia:h,t:Date.now(),xs:q.docs.map(d=>d.data())}; rerenderSeguro(); }).catch(e=>console.warn('[invd] hoje',e)).then(()=>{ X.hcLendo=false; }); }
  return (X.hc&&X.hc.dia===h&&X.hc.xs)||[]; }
function invdContHoje(){ const h=hojeStr(), s={}; invdConfHoje().forEach(cf=>{ if(!cf||cf.excluida||(cf.dia||String(cf.em||'').slice(0,10))!==h) return; for(const c in (cf.itens||{})) s[c]=cf.porNome||true; }); return s; }
function invdHojeLista(){ const X=S.invd, C=invdCfg(), feito=invdContHoje(), L=[], vis={};
  X.ab.filter(x=>x.st==='recontar').forEach(x=>{ if(vis[x.c]) return; vis[x.c]=1; L.push({cod:x.c,m:'rec',div:x._id,b:x.b,porNome:(x.c1||{}).porNome||'',meu:invdMesma(x.c1||{},{por:S.uid,porNome:(S.nomes&&S.nomes[S.uid])||''}),feito:false}); });
  const it=(X.dia&&X.dia.itens)||{}; Object.keys(it).forEach(c=>{ if(vis[c]) return; vis[c]=1; L.push({cod:c,m:it[c].m,u:it[c].u||null,feito:!!feito[c]}); });
  return {dia:X.diaK||hojeStr(),hora:C.hora,pronto:!!X._l_dia&&!!X.dia,itens:L}; }

/* ---------- 2 · divergências abertas ao salvar a contagem ---------- */
async function invdConf(cf){ const X=S.invd; if(!cf||!cf.itens||!S.db) return; const em=new Date().toISOString(), dia=cf.dia||hojeStr();
  const quem={por:cf.por||null,porNome:cf.porNome||''};
  for(const c in cf.itens){ const it=cf.itens[c]||{};
    for(const b of invdBl(cf.local)){ const sk='saldoSistema'+b; if(it[sk]==null&&it['almox'+b]==null) continue;
      const q=+it['almox'+b]||0, s=+it[sk]||0; if(!q&&!s) continue; const dif=q-s, div=Math.abs(dif)>=invdTol(s);
      const e={q,s,dif,por:quem.por,porNome:quem.porNome,conf:cf.numero||null,em,dia,local:cf.local||''};
      const op=X.ab.find(x=>x.c===c&&+x.b===+b&&x.aberta);
      try{ if(!op){ if(!div) continue; const id=String(c).replace(/[\/\s]/g,'-')+'_'+b+'_'+Date.now().toString(36);
          const d={c,d:invdDesc(c),b,local:cf.local||'',aberta:true,st:'recontar',dia,em,c1:e,cs:[e]}; X.ab.push(Object.assign({_id:id},d)); await S.db.doc('invdiv/'+id).set(d); continue; }
        if((op.cs||[]).some(x=>x.conf&&x.conf===e.conf&&x.em&&String(x.em).slice(0,16)===em.slice(0,16))) continue;
        const cs=(op.cs||[]).concat([e]).slice(-12), up={cs,ult:e};
        if(op.st==='recontar'){ const mes=invdMesma(op.c1||{},quem);
          if(!div){ Object.assign(up,{aberta:false,st:'fechada',auto:true,causa:'Erro na contagem',foc:'nao',fechObs:mes?'Recontei e bateu com o sistema.':'A recontagem de '+(quem.porNome||'outra pessoa')+' bateu com o sistema.',fechadoEm:em,fechadoPorNome:'Automático'}); if(!mes) up.rec=e; }
          else if(!mes){ Object.assign(up,{st:'pcp',rec:e,pcpEm:em}); } }
        Object.assign(op,up); if(up.aberta===false) X.ab=X.ab.filter(x=>x!==op); await S.db.doc('invdiv/'+op._id).update(up); }
      catch(err){ console.warn('[invdiv]',err); } } } }
const _invdGravar=invGravar;
invGravar=async function(acao,id,d,json){ const r=await _invdGravar.apply(this,arguments);
  if(acao==='salvarConf'&&d){ try{ const k=String(d.numero||id||'').replace(/\//g,'-').slice(0,600), ant=(S.alx.conferencias||[]).find(c=>c._id===k);
      const cf=Object.assign({},d,{por:ant?(ant.por||null):(S.uid||null),porNome:(ant&&ant.porNome)||(S.nomes&&S.nomes[S.uid])||'',dia:(ant&&ant.dia)||hojeStr()});
      invdConf(cf).catch(e=>console.warn('[invdiv]',e)); }catch(e){ console.warn('[invdiv]',e); } }
  return r; };
if(window.Painel&&Painel.inv) Painel.inv.dia=()=>{ try{ return invdHojeLista(); }catch(e){ return {pronto:false,itens:[]}; } };

/* ---------- 3 · tela do PCP ---------- */
const invdN=v=>(+v||0).toLocaleString('pt-BR',{maximumFractionDigits:0}), invdS=v=>(v>0?'+':v<0?'−':'')+invdN(Math.abs(v));
function invdCont(e,rot){ if(!e) return '<span class="sub" style="margin:0">—</span>'; return `<div class="ivd-c"><small>${rot}</small><b class="num">${invdN(e.q)}</b> <span class="sub" style="margin:0">sistema ${invdN(e.s)}</span> <span class="${e.dif<0?'cm-neg':'ivd-pos'}">${invdS(e.dif)}</span><i>${esc(e.porNome||'—')} · ${dm(e.dia)}${e.local?' · '+esc(e.local):''}</i></div>`; }
function invdForm(x){ const F=S.invd.fm||{}; if(F.id!==x._id) return '';
  const so=x.st==='focco'; const foc=F.foc||'sim';
  return `<tr class="ivd-fr"><td colspan="6"><div class="ivd-f">${so?'':`<label>Causa<select id="ivd-causa" class="txt">${['<option value="">Escolha a causa…</option>'].concat(INVD_CAUSAS.map(t=>`<option ${F.causa===t?'selected':''}>${esc(t)}</option>`)).join('')}</select></label>
     <div><span class="ivd-l">Corrigiu no Focco?</span><div class="seg">${[['sim','Sim, corrigi'],['nao','Não precisa'],['ainda','Ainda não']].map(([v,t])=>`<button class="${foc===v?'on':''}" data-act="ivd-foc" data-v="${v}">${t}</button>`).join('')}</div></div>`}
     ${so||foc==='sim'?`<label>Nº do documento no Focco<input id="ivd-doc" class="txt" value="${esc(F.doc||'')}" placeholder="ex.: ajuste de estoque 12345" autocomplete="off"></label>`:''}
     <label>Observação<input id="ivd-obs" class="txt" value="${esc(F.obs||'')}" placeholder="o que aconteceu (opcional)" autocomplete="off"></label>
     <div class="row" style="gap:8px"><button class="btn" data-act="ivd-ok">${so?'Corrigi no Focco':foc==='ainda'?'Salvar (falta corrigir no Focco)':'Fechar a divergência'}</button><button class="btn sec" data-act="ivd-canc">Cancelar</button></div></div></td></tr>`; }
function vInvd(){ invdAssina(); invdAssinaFe(); const X=S.invd, C=invdCfg();
  const head=`<div class="head"><div><div class="eyebrow">ANÁLISE PCP · SISTEMA</div><h1>Divergências do inventário</h1>
    <p class="sub">Cada diferença da contagem é recontada por outra pessoa e só sai daqui quando o PCP diz a causa e se corrigiu no Focco.</p></div></div>`;
  const ab=X.ab.filter(x=>x.aberta), g={recontar:ab.filter(x=>x.st==='recontar'),pcp:ab.filter(x=>x.st==='pcp'),focco:ab.filter(x=>x.st==='focco')};
  const lim=hojeStr(new Date(Date.now()-30*864e5)), fe=X.fe.filter(x=>String(x.fechadoEm||'').slice(0,10)>=lim);
  const k=(t,v,s,c,a)=>`<button class="cm-k ${c||''} ivd-k${X.aba===a?' on':''}" data-act="ivd-aba" data-v="${a}"><span>${t}</span><b class="num">${v}</b><i>${s}</i></button>`;
  const L=invdHojeLista(), nF=L.itens.filter(i=>i.feito).length, nR=L.itens.filter(i=>i.m==='rec').length, nG=L.itens.filter(i=>i.m==='giro').length, nO=L.itens.filter(i=>i.m==='rod').length;
  const agora=new Date(), [hh,mm]=String(C.hora).split(':').map(Number), passou=agora.getHours()*60+agora.getMinutes()>(hh||0)*60+(mm||0);
  const lista=`<section class="card cm-s"><div class="cm-q">CONTAGEM DO DIA · ${dm(L.dia)}</div>
    <p class="cm-r">${L.pronto||nR?`${L.itens.length} ${L.itens.length===1?'item':'itens'} para contar hoje, antes da expedição (até ${esc(C.hora)}): ${nR} para recontar por outra pessoa, ${nG} de giro alto e ${nO} do rodízio. ${nF?nF+' já contados hoje.':'Nenhum contado ainda hoje.'}`:'A lista de hoje aparece quando alguém do inventário abrir o painel.'}${passou&&L.itens.length>nF+nR?' <b>A expedição já começou:</b> o que sair agora deixa a contagem diferente.':''}</p>
    <details class="ivd-dt"${X.listaAb?' open':''}><summary data-act="ivd-lista">Ver a lista e os ajustes</summary>
     <div class="ivd-ch">${L.itens.map(i=>`<span class="ivd-it ${i.feito?'ok':''} m-${i.m}"><b>${esc(i.cod)}</b> ${esc(invdDesc(i.cod)).slice(0,34)}<i>${i.m==='rec'?'recontar · não pode ser '+esc(i.porNome||'quem contou'):i.m==='giro'?'giro alto':'rodízio'}${i.u?' · última '+dm(i.u):i.m!=='rec'?' · nunca contado':''}${i.feito?' · ✓ contado':''}</i></span>`).join('')||'<span class="sub">Nada na lista.</span>'}</div>
     <div class="ivd-aj"><label>Contar até<input id="ivd-hora" class="txt" type="time" value="${esc(C.hora)}"></label><label>Passar por todos em (dias úteis)<input id="ivd-dias" class="txt" type="number" min="5" max="60" value="${C.dias}"></label>
      <label>Giro alto: contar a cada (dias)<input id="ivd-giro" class="txt" type="number" min="1" max="30" value="${C.giro}"></label><label>Máximo por dia<input id="ivd-max" class="txt" type="number" min="5" max="200" value="${C.max}"></label>
      <button class="btn sec" data-act="ivd-aj">Salvar ajustes</button></div><p class="cm-nota">Os ajustes valem a partir da lista de amanhã (a de hoje já foi feita).</p></details></section>`;
  const q=anlNorm(X.q||''); const fil=xs=>xs.filter(x=>!q||anlNorm(x.c+' '+(x.d||'')).includes(q));
  const linha=x=>{ const fe=!x.aberta; return `<tr><td class="l"><b>${esc(x.c)}</b><small class="xf-de">${esc(x.d||invdDesc(x.c))}</small><small class="xf-de">Almox ${x.b===30||x.b==='30'?'30':'3'} · aberta ${dm(x.dia)}${x.aberta?' · há '+Math.max(0,invdDias(x.dia,hojeStr()))+' dias':''}</small></td>
     <td class="l">${invdCont(x.c1,'1ª contagem')}</td><td class="l">${x.rec?invdCont(x.rec,'Recontagem'):x.st==='recontar'?`<span class="pill warn">esperando outra pessoa</span>${(x.cs||[]).length>1?'<small class="xf-de">a mesma pessoa recontou e não bateu</small>':''}`:'—'}</td>
     <td class="l">${fe?`<b>${esc(x.causa||'—')}</b><small class="xf-de">${x.foc==='sim'?'Corrigido no Focco · '+esc(x.doc||''):x.foc==='nao'?'Não precisou corrigir':'—'}${x.fechObs?' · '+esc(x.fechObs):''}</small><small class="xf-de">${esc(x.fechadoPorNome||'')} · ${dm(String(x.fechadoEm||'').slice(0,10))}</small>`:x.st==='focco'?`<b>${esc(x.causa||'')}</b><small class="xf-de">falta corrigir no Focco${x.fechObs?' · '+esc(x.fechObs):''}</small>`:''}</td>
     <td>${fe?'':`<button class="btn ${x.st==='recontar'?'sec':''}" data-act="ivd-abre" data-v="${esc(x._id)}">${x.st==='focco'?'Corrigi no Focco':x.st==='recontar'?'Fechar sem recontar':'Fechar'}</button>`}</td>
     <td><button class="btn sec" data-act="ivd-xf" data-v="${esc(x.c)}" title="Ver as contagens no Estoque × Focco">Estoque × Focco</button></td></tr>`+(x.aberta?invdForm(x):''); };
  const xs=X.aba==='fe'?fil(fe):fil(g[X.aba]||[]); xs.sort((a,b)=>String(a.dia||'').localeCompare(String(b.dia||'')));
  const vazio={pcp:'Nenhuma divergência para o PCP fechar.',recontar:'Nenhuma divergência esperando recontagem.',focco:'Nada falta corrigir no Focco.',fe:'Nenhuma divergência fechada nos últimos 30 dias.'}[X.aba];
  return head+`<div class="cm">${lista}
   <div class="cm-ks ivd-ks">${k('Para o PCP fechar',g.pcp.length,'a recontagem confirmou','c','pcp')}${k('Esperando recontagem',g.recontar.length,'por outra pessoa','w','recontar')}${k('Falta corrigir no Focco',g.focco.length,'causa já dita','o','focco')}${k('Fechadas',fe.length,'nos últimos 30 dias','','fe')}</div>
   <section class="card cm-s"><div class="xf-fb"><label class="srch">${ic('lupa',16,2)}<input class="txt" id="ivd-q" value="${esc(X.q||'')}" placeholder="Buscar código ou produto (Enter)" autocomplete="off"></label><span class="sub" style="margin:0">${xs.length} ${xs.length===1?'divergência':'divergências'}</span></div>
    ${xs.length?`<div class="cm-tw"><table class="cm-t ivd-t"><thead><tr><th class="l">Item</th><th class="l">Contagem</th><th class="l">Recontagem</th><th class="l">Causa</th><th></th><th></th></tr></thead><tbody>${xs.slice(0,200).map(linha).join('')}</tbody></table></div>`:`<div class="empty">${vazio}</div>`}</section>
   <p class="cm-nota">Abre divergência o item com diferença de 5 ou mais e de 3% ou mais do saldo do sistema na contagem. A recontagem precisa ser de outra pessoa; se ela bater com o sistema, a divergência fecha sozinha como erro na contagem. Se a mesma pessoa recontar e bater, também fecha.</p></div>`; }

VIEWS.anlinvd={nome:'Divergências do inventário',ic:'caixa',mob:'Divergências'}; CRUMB.anlinvd='Divergências do inventário'; S.extViews=S.extViews||{}; S.extViews.anlinvd=()=>banner()+vInvd();
function invdReg(){ const M=MODS.find(x=>x.id==='analise'); if(M&&!M.views.includes('anlinvd')) M.views.push('anlinvd');
  try{ const g=(NAV_GRP.analise||[]).find(x=>x.k==='sis'); if(g&&!g.v.includes('anlinvd')) g.v.push('anlinvd'); }catch(e){} }
invdReg(); setTimeout(invdReg,0);
function invdLeForm(){ const F=S.invd.fm; if(!F) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  const c=v('ivd-causa'), d=v('ivd-doc'), o=v('ivd-obs'); if(c!=null) F.causa=c; if(d!=null) F.doc=d.trim(); if(o!=null) F.obs=o.trim(); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ivd-"]'); if(!b) return; const a=b.dataset.act, X=S.invd;
  if(a==='ivd-lista'){ X.listaAb=!X.listaAb; return; }
  if(a==='ivd-aba'){ X.aba=b.dataset.v; X.fm=null; render(); return; }
  if(a==='ivd-abre'){ X.fm={id:b.dataset.v,foc:'sim'}; render(); return; }
  if(a==='ivd-canc'){ X.fm=null; render(); return; }
  if(a==='ivd-foc'){ invdLeForm(); X.fm.foc=b.dataset.v; render(); return; }
  if(a==='ivd-xf'){ if(S.xf) S.xf.q=b.dataset.v; if(S.xf) S.xf.so='todos'; go('anlxf'); return; }
  if(a==='ivd-aj'){ const n=id=>+(document.getElementById(id)||{}).value; const h=(document.getElementById('ivd-hora')||{}).value||'07:30';
    const c={hora:h,dias:Math.max(5,Math.min(60,n('ivd-dias')||20)),giro:Math.max(1,Math.min(30,n('ivd-giro')||7)),max:Math.max(5,Math.min(200,n('ivd-max')||60))};
    try{ await S.db.doc('config/geral').update({invDia:c}); S.cfg=Object.assign({},S.cfg||{},{invDia:c}); toast('Ajustes da lista do dia salvos.'); render(); }catch(e){ erro(e); } return; }
  if(a==='ivd-ok'){ invdLeForm(); const F=X.fm, x=X.ab.find(y=>y._id===F.id); if(!x) return; const em=new Date().toISOString(), nm=(S.nomes&&S.nomes[S.uid])||'';
    let up;
    if(x.st==='focco'){ if(!F.doc) return toast('Escreva o nº do documento do Focco.'); up={aberta:false,st:'fechada',foc:'sim',doc:F.doc,fechObs:F.obs||x.fechObs||'',fechadoEm:em,fechadoPor:S.uid||null,fechadoPorNome:nm}; }
    else { if(!F.causa) return toast('Escolha a causa da divergência.'); if(F.foc==='sim'&&!F.doc) return toast('Escreva o nº do documento do Focco (ou marque "Não precisa").');
      up=F.foc==='ainda'?{st:'focco',causa:F.causa,fechObs:F.obs||'',causaEm:em,causaPorNome:nm}:{aberta:false,st:'fechada',causa:F.causa,foc:F.foc,doc:F.foc==='sim'?F.doc:'',fechObs:F.obs||'',fechadoEm:em,fechadoPor:S.uid||null,fechadoPorNome:nm}; }
    try{ await S.db.doc('invdiv/'+x._id).update(up); Object.assign(x,up); if(up.aberta===false){ X.ab=X.ab.filter(y=>y!==x); X.fe.unshift(x); } X.fm=null; toast(up.aberta===false?'Divergência fechada.':'Guardado: falta corrigir no Focco.'); render(); }catch(e){ erro(e); } return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='ivd-q'){ ev.preventDefault(); S.invd.q=ev.target.value.trim(); render(); } });
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='ivd-q'){ S.invd.q=ev.target.value.trim(); render(); } });
document.head.insertAdjacentHTML('beforeend',`<style>
.ivd-k{text-align:left;cursor:pointer;border:2px solid transparent;font:inherit}.ivd-k.on{border-color:var(--teal,#14706A)}
.ivd-c small{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.ivd-c i{display:block;font-style:normal;font-size:11px;color:var(--muted)}.ivd-pos{color:var(--warn,#B7791F)}
.ivd-t td{vertical-align:top}.ivd-fr td{background:var(--surface-2,#EEF2F5)}
.ivd-f{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:10px 4px}.ivd-f label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);min-width:220px}.ivd-l{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}
.ivd-dt summary{cursor:pointer;color:var(--teal,#14706A);font-weight:500;margin:6px 0}
.ivd-ch{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.ivd-it{display:inline-flex;flex-direction:column;padding:6px 10px;border-radius:10px;background:var(--surface-2,#EEF2F5);font-size:12px;max-width:260px}
.ivd-it i{font-style:normal;color:var(--muted);font-size:11px}.ivd-it.ok{opacity:.55}.ivd-it.m-rec{background:#FDECEC}
.ivd-aj{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-top:10px}.ivd-aj label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}.ivd-aj input{width:150px}
:root[data-theme="dark"] .ivd-it.m-rec{background:#4a2323}
</style>`);
