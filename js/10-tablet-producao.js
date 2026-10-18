/* Painel Colafix · 10-tablet-producao.js — tablet da linha: abrir a ordem pela folha (QR, RA-, OP- ou nº), apontar produção e pedir material.
   Também: pedidos de material para o almoxarifado (coleção pedmat) no diário de bordo e avisos no Meu dia. */
"use strict";
/* ---------- pedidos de material (pedmat/{id}) ---------- */
S.pedmat=[];
{ const _ap=assinaPorPerfil; assinaPorPerfil=function(db){ _ap.apply(this,arguments); try{ if(!db||!S.acs||!S.acs.pronto||!acsP()||_leit.pedmat) return;
    if(!(leitPrecisa('diario')||(ttPodeUsar()&&(S.view==='mantotem'||ttSoTablet())))) return; _leit.pedmat=true;
    inscrever('pedmat',()=>db.collection('pedmat').where('status','==','aberto').limit(200),snap=>{ S.pedmat=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>(b.urgente?1:0)-(a.urgente?1:0)||String(a.em).localeCompare(String(b.em))); rerenderSeguro(); }); }catch(e){} }; }
function pmIdade(iso){ const m=Math.max(0,Math.round((Date.now()-new Date(iso))/60000)); return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'); }
/* almoxarifado: quadro no topo do diário */
{ const _vd=vDiario; vDiario=function(){ const h=_vd.apply(this,arguments); if(S.dbo.modo==='monitor'||!dbPode().alm||!S.pedmat.length) return h;
  const card=`<section class="card pm-card"><div class="label" style="margin-bottom:8px">PEDIDOS DE MATERIAL DAS LINHAS · ${S.pedmat.length}</div>${S.pedmat.map(p=>`<div class="pm-row ${p.urgente?'urg':''}">
      <div><b>${esc(p.linha||'')}</b>${p.urgente?' <span class="pill crit">URGENTE · linha vai parar</span>':''}<span>${esc(p.item||'')} · <b>${esc(fQ(p.qtd))} ${esc(p.um||'')}</b></span>
      <small>Ordem ${esc(p.num||'')}${p.rancho?' · rancho '+esc(p.rancho):''} · pedido por ${esc(p.porNome||'')} há ${pmIdade(p.em)}${p.obs?' · '+esc(p.obs):''}</small></div>
      <button class="btn" data-act="pm-ok" data-id="${p._id}">Atendido</button></div>`).join('')}</section>`;
  const i=h.indexOf('<section'); return i<0?h+card:h.slice(0,i)+card+h.slice(i); }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="pm-ok"]'); if(!b) return; b.disabled=true;
  try{ await S.db.doc('pedmat/'+b.dataset.id).update({status:'atendido',atendidoEm:new Date().toISOString(),atendidoPor:S.uid||null,atendidoNome:(S.nomes[S.uid]||'')}); toast('Pedido marcado como atendido.'); }catch(e){ erro(e); b.disabled=false; } });
registrarAviso(()=>S.pedmat.filter(p=>p.urgente).map(p=>({nivel:'crit',rotulo:'Material',titulo:'Material urgente para a '+(p.linha||'linha'),texto:(p.item||'')+' · '+fQ(p.qtd)+' '+(p.um||'')+' · há '+pmIdade(p.em),go:'diario'})));

/* ---------- leitura no tablet: OP- (folha sem rancho) e a folha do rancho abrem a ordem ---------- */
{ const _lc=lerCodigo; lerCodigo=function(txt){ const m=String(txt||'').trim().toUpperCase().match(/^OP-?(\d{3,})$/); if(m) return {tipo:'ordem',num:m[1]}; return _lc.apply(this,arguments); }; }
{ const _cb=cbLeu; cbLeu=function(cod){ const c=String(cod||'').toUpperCase(); if(/^OP-?\d{3,}$/.test(c)){ if(S.view==='mantotem'){ S.tt.ult=Date.now(); ttLeu(c); return; } const o=(S.ordens||[]).find(x=>String(x.num)===c.replace(/\D/g,'')); if(!o){ toast('Ordem '+c.replace(/\D/g,'')+' não encontrada.'); return; } if(viewOk('programacao')){ go('programacao'); } toast('Ordem '+o.num+' · '+o.linha); return; } return _cb.apply(this,arguments); }; }
{ const _cc=crColetor; crColetor=function(cod){ if(S.view==='mantotem'&&S.tt.fase==='ordem'&&!S.tt.p){ S.tt.ult=Date.now(); ttLeu('COLAFIX:CRACHA:'+cod); return; } return _cc.apply(this,arguments); }; }
const ttRanchoConf=ttRancho;
ttRancho=function(num){ if(ttEntrega()||S.tt._direto) return ttRanchoConf.apply(this,arguments); ttHub({rancho:String(num).replace(/\D/g,'')}); };
{ const _tl=ttLeu; ttLeu=function(txt){ const T=S.tt; if(ttEntrega()) return _tl.apply(this,arguments); const k=lerCodigo(txt);
  if(k&&k.tipo==='ordem'){ if(T.fase==='espera') ttHub({ordem:k.num}); return; }
  if(T.fase==='ordem'&&!T.p){ const m=String(txt||'').trim().toUpperCase().match(TT_RE); if(!m) return; const c=crDe(m[1]); if(!c||c.ativo===false){ ttMsg('Crachá não reconhecido.'); return; }
    ttBip(); T.p={codigo:c.codigo,nome:c.nome,linha:c.linha,papel:c.papel}; T.ult=Date.now(); ttCamDesliga(); render(); return; }
  return _tl.apply(this,arguments); }; }
/* abre a ordem: pelo nº da ordem ou pelo rancho (se o rancho tiver mais de uma ordem nas linhas do tablet, a pessoa escolhe) */
function ttHub(q){ const T=S.tt, L=ttLinhas(); let cands=[];
  if(q.ordem) cands=(S.ordens||[]).filter(o=>String(o.num)===String(q.ordem));
  else cands=(S.ordens||[]).filter(o=>String(o.rancho||'')===String(q.rancho));
  cands=cands.filter(o=>o.status!=='excluida'); const nasLinhas=cands.filter(o=>L.includes(o.linha)); if(nasLinhas.length) cands=nasLinhas;
  if(!cands.length){ ttMsg(q.ordem?'Ordem '+q.ordem+' não encontrada no painel.':'Rancho '+q.rancho+' não encontrado no painel (ou já encerrado).'); return; }
  Object.assign(T,{fase:'ordem',p:null,ult:Date.now(),msg:'',enviando:false,hub:{rancho:q.rancho||(cands[0].rancho||''),cands:cands.map(o=>o._id),oid:cands.length===1?cands[0]._id:null},ap:null,pm:null}); render(); }
/* o tablet não carrega todos os apontamentos: busca só os da ordem aberta (para "já apontado" e "falta" saírem certos) */
S._entOrd={}; const _entSub={};
function ttEntDaOrdem(id){ if(!S.db||!id||leitPrecisa('prod')||_entSub[id]) return; _entSub[id]=true;
  inscrever('ent-'+id,()=>S.db.collection('entregas').where('ordem','==',id).limit(2000),snap=>{ S._entOrd[id]=snap.docs.map(d=>Object.assign({_id:d.id},d.data()));
    const m=new Map(); Object.values(S._entOrd).forEach(xs=>xs.forEach(e=>m.set(e._id,e))); S.entregas=[...m.values()]; if(ttAtivo()) render(); }); }
/* o tablet também não carrega o cadastro de itens: busca só o item da ordem aberta (palete por item) */
const _itSub={};
function ttItemDaOrdem(o){ if(!S.db||leitPrecisa('prod')) return; let c=''; try{ c=codigoDe(o); }catch(e){} if(!c||_itSub[c]) return; _itSub[c]=true;
  S.db.doc('itens/'+c).get().then(g=>{ if(g.exists){ const it=Object.assign({_id:g.id},g.data()); S.itens=(S.itens||[]).filter(x=>x._id!==it._id).concat([it]); if(ttAtivo()) render(); } }).catch(e=>{ _itSub[c]=false; console.warn('[tablet] item',e); }); }
function ttOrd(){ const H=S.tt.hub; const o=H&&H.oid?ordById(H.oid):null; if(o){ ttEntDaOrdem(o._id); ttItemDaOrdem(o); } return o; }
function ttPP(o){ try{ return +paleteDe(o)||0; }catch(e){ return 0; } }
function ttUn(o){ try{ return uA(o)||'sc'; }catch(e){ return 'sc'; } }
function ttProg(o){ const tot=+o.total||0, fe=entregueDe(o), falta=Math.max(0,tot-fe), pc=tot?Math.min(1,fe/tot):0, un=ttUn(o);
  return `<div class="tt-prog"><div class="tt-progb"><i style="width:${Math.round(pc*100)}%"></i></div><div class="tt-progn"><div><b>${fQ(tot)}</b><span>programado</span></div><div><b>${fQ(fe)}</b><span>já apontado</span></div><div class="${falta?'':'ok'}"><b>${fQ(falta)}</b><span>${falta?'falta':'completa'}</span></div></div><small>em ${esc(un)}</small></div>`; }
function ttTeclado(alvo){ return `<div class="tt-kp">${['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k=>`<button data-act="tt-kp" data-alvo="${alvo}" data-k="${k}">${k}</button>`).join('')}</div>`; }
function vTtProd(){ const T=S.tt, H=T.hub, o=ttOrd(); const topo=ttTopo('Produção na linha');
  if(T.fase==='ordem'&&!o){ const cs=H.cands.map(ordById).filter(Boolean);
    return `<div class="tt">${topo}<h1 class="tt-h">Qual ordem?</h1><div class="sub" style="font-size:16px;margin:-6px 0 6px">O rancho ${esc(H.rancho)} tem mais de uma ordem.</div><div class="tt-lst">${cs.map(x=>`<button class="tt-bt" data-act="tt-hub-o" data-id="${x._id}" style="text-align:left"><b>Ordem ${esc(x.num)} · ${esc(x.linha)}</b><span>${esc(x.produto||'')}</span></button>`).join('')}</div><div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button></div></div>`; }
  if(!o) return null;
  const cab=`<div class="tt-ordc"><div><small>ORDEM ${esc(o.num)} · ${esc(o.linha)}${o.rancho?' · rancho '+esc(o.rancho):''}</small><b>${esc(o.produto||'')}</b></div></div>${ttProg(o)}`;
  const quem=T.p?`<div class="tt-ola">Operador: <b>${esc(T.p.nome)}</b></div>`:`<div class="tt-rcq">${ic('grid',26,2)}<div><b>Passe o seu crachá para continuar</b><span>Câmera ou coletor</span></div></div>`;
  if(T.fase==='ordem'){ const pend=S.pedmat.filter(p=>p.ordem===o._id); const r=o.rdb||{};
    return `<div class="tt">${topo}${cab}${quem}${pend.length?`<div class="tt-pmab">📦 Material já pedido: ${pend.map(p=>esc(p.item)+' ('+fQ(p.qtd)+' '+esc(p.um||'')+', há '+pmIdade(p.em)+')').join(' · ')}</div>`:''}
      <div class="tt-acts"><button class="tt-act ap" data-act="tt-ap" ${T.p&&(leitPrecisa('prod')||S._entOrd[o._id])?'':'disabled'}>${ic('mais',30,2.6)}<b>Apontar produção</b><span>quantos ${esc(ttUn(o))} saíram</span></button>
        <button class="tt-act pm" data-act="tt-pm" ${T.p?'':'disabled'}>${ic('grid',30,2.4)}<b>Pedir material</b><span>para o almoxarifado</span></button>
        ${o.rancho?`<button class="tt-act cf" data-act="tt-cf" ${T.p?'':'disabled'}>${ic('check',30,2.6)}<b>Conferir rancho</b><span>${r.conf?'já conferido':'item a item'}</span></button>`:''}</div>
      ${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Sair</button>${!T.p&&ttSemCrachaOk()?'<button class="btn sec" data-act="tt-hub-sem">Estou sem crachá</button>':''}</div></div>`; }
  if(T.fase==='apont'){ const A=T.ap, pp=ttPP(o), un=ttUn(o), av=+A.av||0, tot=A.pal*pp+av, falta=Math.max(0,(+o.total||0)-entregueDe(o));
    return `<div class="tt">${topo}${cab}<h1 class="tt-h">Quanto saiu agora?</h1>
      ${pp?`<div class="tt-pal"><span>Paletes <small>(${fQ(pp)} ${esc(un)} cada)</small></span><button data-act="tt-pal" data-v="-1" ${A.pal?'':'disabled'}>−</button><b class="num">${A.pal}</b><button data-act="tt-pal" data-v="1">+</button></div>`:''}
      <div class="tt-qtd"><span>${pp?'Avulsos':'Quantidade'} (${esc(un)})</span><b class="num">${A.av||'0'}</b></div>${ttTeclado('av')}
      <div class="tt-tot ${tot>falta&&falta>0?'warn':''}">Total: <b class="num">${fQ(tot)} ${esc(un)}</b>${tot>falta?`<small>${falta?'Passa do que falta ('+fQ(falta)+'). O excedente é lançado no computador (ordem complementar).':'A ordem já está completa. Lance no computador (ordem complementar).'}</small>`:''}</div>
      ${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-hub">Voltar</button><button class="btn" data-act="tt-ap-ok" style="background:var(--ok-ink)" ${tot>0&&tot<=falta&&!T.enviando?'':'disabled'}>${T.enviando?'Salvando…':'Apontar '+fQ(tot)+' '+esc(un)}</button></div></div>`; }
  if(T.fase==='pmat'){ const M=T.pm, rc=o.rancho&&ranchoDe(o.rancho), its=((rc&&rc.itens)||[]).filter(x=>typeof dbVisivel!=='function'||dbVisivel(x));
    return `<div class="tt">${topo}${cab}<h1 class="tt-h">Qual material?</h1>
      <div class="tt-pmi">${its.map(x=>`<button data-act="tt-pmi" data-c="${esc(x.c)}" aria-pressed="${M.cod===x.c}"><b>${esc(x.c)}</b><span>${esc(x.d||'')}</span></button>`).join('')}<button data-act="tt-pmi" data-c="__outro" aria-pressed="${M.cod==='__outro'}"><b>Outro</b><span>escrever qual</span></button></div>
      ${M.cod==='__outro'?`<input class="txt tt-in" id="tt-pm-txt" maxlength="80" placeholder="Qual material?" value="${esc(M.txt||'')}">`:''}
      ${M.cod?`<div class="tt-qtd"><span>Quantidade${M.um?' ('+esc(M.um)+')':''}</span><b class="num">${M.qtd||'0'}</b></div>${ttTeclado('pm')}
        <label class="tt-urg ${M.urg?'on':''}"><input type="checkbox" id="tt-pm-urg" ${M.urg?'checked':''}> Urgente: a linha vai parar sem esse material</label>`:''}
      ${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-hub">Voltar</button><button class="btn" data-act="tt-pm-ok" ${M.cod&&+M.qtd>0&&!T.enviando?'':'disabled'}>${T.enviando?'Enviando…':'Pedir ao almoxarifado'}</button></div></div>`; }
  if(T.fase==='apok'||T.fase==='pmok') return `<div class="tt">${topo}<div class="tt-box ok"><div class="tt-okic">${ic('check',56,2.6)}</div><h1>${esc(T.okTit||'')}</h1><p>${esc(T.okTxt||'')}</p><div class="tt-rod"><button class="btn sec" data-act="tt-hub">Voltar à ordem</button><button class="btn" data-act="tt-voltar">Pronto</button></div></div></div>`;
  return null; }
{ const _vt=vTotem; vTotem=function(){ if(!ttEntrega()&&['ordem','apont','pmat','apok','pmok'].includes(S.tt.fase)){ const h=vTtProd(); if(h) return h; } return _vt.apply(this,arguments); }; }
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='tt-pm-txt'&&S.tt.pm){ S.tt.pm.txt=t.value; S.tt.ult=Date.now(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='tt-pm-urg'&&S.tt.pm){ S.tt.pm.urg=t.checked; render(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="tt-hub"],[data-act="tt-ap"],[data-act="tt-pm"],[data-act="tt-cf"],[data-act="tt-kp"],[data-act="tt-pal"],[data-act="tt-ap-ok"],[data-act="tt-pmi"],[data-act="tt-pm-ok"]'); if(!b||b.disabled) return;
  const T=S.tt, a=b.dataset.act, o=ttOrd(); T.ult=Date.now(); T.msg='';
  if(a==='tt-hub-o'){ T.hub.oid=b.dataset.id; render(); return; }
  if(a==='tt-hub'){ T.fase='ordem'; render(); return; }
  if(a==='tt-hub-sem'){ const n=prompt('Seu nome:'); if(n&&n.trim().length>1){ T.p={codigo:null,nome:n.trim().slice(0,60),semCracha:true}; ttCamDesliga(); render(); } return; }
  if(!o||!T.p) return;
  if(a==='tt-ap'){ T.ap={pal:0,av:''}; T.fase='apont'; render(); return; }
  if(a==='tt-pm'){ T.pm={cod:'',txt:'',qtd:'',urg:false,um:''}; T.fase='pmat'; render(); return; }
  if(a==='tt-cf'){ const p=T.p; T._direto=true; ttRanchoConf(o.rancho); T._direto=false; if(T.fase==='rancho'){ T.p=p; ttCamDesliga(); } render(); return; }
  if(a==='tt-kp'){ const alvo=b.dataset.alvo, k=b.dataset.k, obj=alvo==='av'?T.ap:T.pm, campo=alvo==='av'?'av':'qtd'; let v=String(obj[campo]||'');
    v=k==='C'?'':k==='⌫'?v.slice(0,-1):(v.length<6?(v==='0'?k:v+k):v); obj[campo]=v; render(); return; }
  if(a==='tt-pal'){ T.ap.pal=Math.max(0,T.ap.pal+(+b.dataset.v)); render(); return; }
  if(a==='tt-pmi'){ const c=b.dataset.c; T.pm.cod=c; const rc=o.rancho&&ranchoDe(o.rancho), it=c!=='__outro'&&((rc&&rc.itens)||[]).find(x=>x.c===c); T.pm.um=it?(it.um||''):''; render(); return; }
  if(a==='tt-ap-ok'){ const pp=ttPP(o), tot=T.ap.pal*pp+(+T.ap.av||0), falta=Math.max(0,(+o.total||0)-entregueDe(o)); if(!(tot>0)||tot>falta||T.enviando) return;
    T.enviando=true; render(); const d={ordem:o._id,num:o.num,linha:o.linha,em:new Date().toISOString(),por:S.uid,qtd:Math.round(tot*1000)/1000,origem:'tablet',operador:T.p.nome,cracha:T.p.codigo||null};
    if(T.ap.pal&&pp){ d.pal=T.ap.pal; d.porPal=pp; } if(+T.ap.av) d.avulso=+T.ap.av;
    const ok=await salvar('entregas',d); T.enviando=false;
    if(!ok){ T.msg='Não foi possível salvar. Confira a internet e tente de novo.'; render(); return; }
    const resta=Math.max(0,(+o.total||0)-entregueDe(o)); T.okTit='Apontado: +'+fQ(tot)+' '+ttUn(o); T.okTxt='Ordem '+o.num+' · '+(resta?'faltam '+fQ(resta)+' '+ttUn(o):'ordem completa')+' · '+T.p.nome; T.fase='apok'; T.ult=Date.now(); render(); return; }
  if(a==='tt-pm-ok'){ const M=T.pm; const rc=o.rancho&&ranchoDe(o.rancho), it=M.cod!=='__outro'&&((rc&&rc.itens)||[]).find(x=>x.c===M.cod);
    const item=it?(it.c+' '+(it.d||'')).trim():String(M.txt||'').trim(); if(item.length<2){ T.msg='Escreva qual material.'; render(); return; } if(!(+M.qtd>0)||T.enviando) return;
    T.enviando=true; render();
    try{ await S.db.collection('pedmat').add({ordem:o._id,num:o.num,linha:o.linha,rancho:o.rancho||'',item,cod:it?it.c:'',qtd:+M.qtd,um:M.um||'',urgente:!!M.urg,status:'aberto',em:new Date().toISOString(),por:S.uid||null,porNome:T.p.nome,cracha:T.p.codigo||null,origem:'tablet'});
      T.enviando=false; T.okTit='Pedido enviado ao almoxarifado'; T.okTxt=item+' · '+fQ(+M.qtd)+' '+(M.um||'')+(M.urg?' · URGENTE':''); T.fase='pmok'; T.ult=Date.now(); render(); }
    catch(e){ T.enviando=false; console.warn('[tablet] pedido de material',e); T.msg='Não foi possível enviar. Confira a internet e tente de novo.'; render(); } return; } });
setInterval(()=>{ const T=S.tt; if(ttAtivo()&&(T.fase==='apok'||T.fase==='pmok')&&Date.now()-T.ult>12000) ttVoltar(); },1000);
document.head.insertAdjacentHTML('beforeend',`<style id="tt-prod-css">
.tt-ordc{background:var(--surface);border-radius:16px;padding:14px 18px;box-shadow:var(--shadow)}.tt-ordc small{color:var(--muted);font-weight:700;letter-spacing:.04em}.tt-ordc b{display:block;font-size:22px;margin-top:2px}
.tt-prog{background:var(--surface);border-radius:16px;padding:12px 18px}.tt-progb{height:12px;border-radius:9px;background:var(--line);overflow:hidden}.tt-progb i{display:block;height:100%;background:var(--ok)}
.tt-progn{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;text-align:center}.tt-progn b{display:block;font-size:26px}.tt-progn span{color:var(--muted);font-size:14px}.tt-progn .ok b{color:var(--ok-ink)}.tt-prog small{display:block;text-align:center;color:var(--muted)}
.tt-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}.tt-act{font:inherit;border:0;border-radius:20px;padding:22px 16px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;color:#fff;box-shadow:var(--shadow)}
.tt-act b{font-size:22px}.tt-act span{font-size:15px;opacity:.9}.tt-act.ap{background:var(--ok-ink)}.tt-act.pm{background:var(--teal-strong)}.tt-act.cf{background:#6B5B95}.tt-act:disabled{opacity:.35;cursor:not-allowed}
.tt-pmab{background:var(--warn-tint);color:var(--warn-ink);border-radius:12px;padding:10px 14px;font-weight:600}
.tt-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:460px;margin:0 auto;width:100%}.tt-kp button{height:64px;border-radius:14px;border:2px solid var(--line);background:var(--surface);font:inherit;font-size:26px;font-weight:700;cursor:pointer}
.tt-qtd{display:flex;justify-content:space-between;align-items:center;max-width:460px;margin:0 auto;width:100%;background:var(--surface);border-radius:14px;padding:10px 18px}.tt-qtd span{color:var(--muted);font-weight:700}.tt-qtd b{font-size:34px}
.tt-pal{display:flex;align-items:center;gap:12px;justify-content:center}.tt-pal span{font-weight:700}.tt-pal button{width:64px;height:64px;border-radius:50%;border:2px solid var(--teal);background:var(--surface);font-size:30px;font-weight:700;cursor:pointer}.tt-pal b{font-size:34px;min-width:50px;text-align:center}
.tt-tot{text-align:center;font-size:20px}.tt-tot b{font-size:26px}.tt-tot small{display:block;color:var(--warn-ink);font-size:14px;margin-top:4px}.tt-tot.warn b{color:var(--warn-ink)}
.tt-pmi{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.tt-pmi button{font:inherit;text-align:left;border:2px solid var(--line);border-radius:14px;background:var(--surface);padding:12px;cursor:pointer}.tt-pmi button[aria-pressed="true"]{border-color:var(--teal-strong);background:var(--teal-wash)}.tt-pmi b{display:block}.tt-pmi span{font-size:14px;color:var(--muted)}
.tt-urg{display:flex;gap:10px;align-items:center;justify-content:center;font-weight:700;padding:12px;border-radius:12px;border:2px dashed var(--line);cursor:pointer}.tt-urg.on{border-color:var(--crit);background:var(--crit-tint);color:var(--crit-ink)}.tt-urg input{width:24px;height:24px}
.pm-card{border-left:6px solid var(--teal)}.pm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.pm-row:first-of-type{border-top:0}.pm-row.urg{background:var(--crit-tint);margin:0 -12px;padding:10px 12px;border-radius:10px}.pm-row span{display:block}.pm-row small{color:var(--muted)}
</style>`);
/* ===FIM TABLET PRODUÇÃO=== */
