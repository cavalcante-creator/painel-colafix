/* Painel Colafix · 05-almox-premix.js — almoxarifado (contagem, conferência, recebimento) e premix.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

// número digitado do jeito do programa antigo: "1.234,5" = 1234,5 e "0,25" = 0,25
function pmxNum(v){ if(typeof v==='number') return isFinite(v)?v:0; const s=String(v==null?'':v).trim(); if(!s) return 0; if(s.includes(',')) return numIn(s)||0; const n=parseFloat(s); return isNaN(n)?0:n; }
function pmxF(n,c){ return (Math.round((n||0)*1000)/1000).toLocaleString('pt-BR',{maximumFractionDigits:c==null?3:c}); }
function pmxV(v){ return v==null?'':typeof v==='number'?String(v).replace('.',','):String(v); }
function pmxOpDup(num,id){ num=String(num||'').trim(); return num?S.pmx.fichas.find(f=>f._id!==id&&f.status!=='excluida'&&String(f.num||'').trim()===num):null; }
function pmxSujo(){ const P=S.pmx; return !!P.ed&&!!P.edSnap&&JSON.stringify(P.ed)!==P.edSnap; }
function pmxAvisoSujo(){ toast('Há uma ficha aberta com alterações. Salve ou clique em Fechar antes.'); const e=document.querySelector('.pmx-ed'); e&&e.scrollIntoView({block:'start',behavior:'smooth'}); }
function pmxId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pmxOp(f){ return String(f.num||'').trim()||f.numProv||'—'; }
function pmxPendSis(f){ return f.status!=='excluida'&&!f.sis&&(!String(f.num||'').trim()||(pmxEnc(f)&&f.origem!=='programa-antigo')); }
function pmxSt(f){ return f.sis?{t:'Apontada no sistema'+(f.sis.em?' · '+dataBR(hojeStr(new Date(f.sis.em))).slice(0,5)+' às '+hora(f.sis.em):''),c:'ok'}:pmxEnc(f)?(f.origem==='programa-antigo'?{t:'Encerrada',c:'ok'}:{t:'Feita · falta PCP',c:'warn'}):{t:'Em produção',c:'prod'}; }
function pmxNumProv(){ let mx=0; S.pmx.fichas.forEach(f=>{ const m=String(f.numProv||'').match(/^PMX-(\d+)$/); if(m) mx=Math.max(mx,+m[1]); }); return 'PMX-'+String(mx+1).padStart(4,'0'); }
function pmxAvisoMeuDia(){ if(!pmxPodeEd()) return ''; const xs=pmxFichasVis().filter(pmxPendSis); if(!xs.length) return ''; const nf=xs.filter(pmxEnc).length, no=xs.length-nf; return `<div class="av warn"><b>Premix: ${[no?no+' ficha'+(no===1?'':'s')+' sem OP do sistema':'',nf?nf+' feita'+(nf===1?'':'s')+' para apontar no sistema':''].filter(Boolean).join(' · ')}</b><span>Coloque a OP do sistema e confirme o apontamento.</span><button class="lnk" data-act="pmx-ir-pend">Ver fila</button></div>`; }
function pmxProd(f){ return (f.aponts||[]).reduce((a,x)=>a+pmxNum(x.qtd),0); }
function pmxEnc(f){ return f.status==='encerrada'||(pmxNum(f.qtd)>0&&pmxProd(f)>=pmxNum(f.qtd)); }
function pmxCod(material){ return String(material||'').trim().split(/\s+/)[0]||'SEM-CODIGO'; }
function pmxTotais(f){ const q=pmxNum(f.qtd), m=new Map();
  (f.itens||[]).forEach(it=>{ const k=(it.codigo||'Sem código')+'|'+(it.nome||'Sem nome')+'|'+(it.un||'g'); const x=m.get(k)||{codigo:it.codigo||'Sem código',nome:it.nome||'Sem nome',un:it.un||'g',total:0}; x.total+=q*pmxNum(it.qtd); m.set(k,x); });
  return [...m.values()].filter(x=>x.total>0); }
function pmxEmG(itens){ return (itens||[]).map(it=>(it.un||'g')==='Kg'?Object.assign({},it,{un:'g',qtd:Math.round(pmxNum(it.qtd)*1e6)/1e3}):Object.assign({},it)); } /* padrão em gramas: Kg vira g (×1000) */
function pmxTrocaUn(it,sel,k){ const para=sel.value; /* padrão em gramas: valor digitado com Kg é convertido para g (×1000) */
  if(para!=='Kg'){ it.un=para; return; } const q=pmxNum(it.qtd); it.un='g'; sel.value='g'; if(!(q>0)){ toast('Digite a quantidade em Kg e escolha Kg: ela vira gramas.'); it.un='Kg'; sel.value='Kg'; return; }
  it.qtd=String(Math.round(q*1e6)/1e3).replace('.',','); const tr=sel.closest('tr'), i=tr&&tr.querySelector(`[data-${k}="qtd"]`); if(i) i.value=it.qtd; toast(pmxF(q,6)+' Kg convertido para '+pmxF(q*1000,3)+' g'); }
function pmxPacoteUn(itens){ const us=[...new Set((itens||[]).map(i=>i.un||'g'))]; if(us.length===1) return us[0]; return us.every(u=>u==='g'||u==='Kg')?'g':'Un.'; }
function pmxPacote(itens){ const emG=pmxPacoteUn(itens)==='g'; return (itens||[]).reduce((a,it)=>a+pmxNum(it.qtd)*(emG&&(it.un||'g')==='Kg'?1000:1),0); }
function pmxTurnoAgora(){ const h=new Date().getHours(); return h<12?'Manhã':h<18?'Tarde':'Noite'; }
function pmxNomeUser(){ return (S.uid&&S.nomes[S.uid])||''; }
function pmxRecAtivas(){ return S.pmx.rec.filter(r=>r.ativo!==false).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR',{numeric:true})); }
function pmxFichasVis(){ return S.pmx.fichas.filter(f=>f.status!=='excluida'); }

function pmxAssinar(db){ const q=(col,key,mk)=>inscrever(col,mk,snap=>{ S.pmx[key]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&typeof x==='object'); rerenderSeguro(); });
  q('pmxrec','rec',()=>db.collection('pmxrec').limit(500));
  q('pmxfichas','fichas',()=>db.collection('pmxfichas').orderBy('alteradoEm','desc').limit(1000));
  inscrever('pmxbaixas',()=>db.collection('pmxbaixas').orderBy('em','desc').limit(1000),snap=>{ S.pmx.baixas=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>String(b.em||'').localeCompare(String(a.em||''))); rerenderSeguro(); });
  db.doc('config/premix').onSnapshot(s=>{ S.pmx.mats=(s.exists&&s.data().materiais)||[]; rerenderSeguro(); },()=>{}); }
function pmxPodeEd(){ return dbMaster(); }
function pmxApModal(){ const A=S.pmx.ap; if(!A) return ''; const f=S.pmx.fichas.find(x=>x._id===A.id); if(!f){ S.pmx.ap=null; return ''; }
  const pl=pmxNum(f.qtd), pr=pmxProd(f), falta=Math.max(0,pl-pr);
  return `<div class="dbmodal" data-pmxap-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Apontar produção de premix" style="max-width:560px"><div style="padding:22px 24px">
   <div class="head" style="align-items:flex-start;flex-wrap:nowrap"><div><div class="eyebrow">APONTAR PRODUÇÃO</div><h2 style="font-size:21px;margin-top:4px">${esc(pmxOp(f))} · ${esc(f.material||'')}</h2>
    <div class="sub num" style="margin:4px 0 0">Produzido <b>${pmxF(pr)}</b> de ${pmxF(pl)} premix${falta>0?' · faltam '+pmxF(falta):''}</div></div><button class="lnk" data-act="pmx-ap-x">Fechar</button></div>
   <div class="bar" style="height:6px;margin:12px 0 16px"><i style="width:${pl>0?Math.min(100,pr/pl*100):0}%"></i></div>
   <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px">
    <label><span class="label">PREMIX PRODUZIDOS</span><input class="txt num" id="pmx-ap-q" inputmode="decimal" autocomplete="off" placeholder="${falta>0?pmxF(falta):'0'}" value="${esc(A.qtd||'')}" style="height:46px;font-size:20px"></label>
    <label><span class="label">HORA</span><input class="txt num" id="pmx-ap-h" type="time" value="${esc(A.hora||'')}" style="height:46px"></label>
    <label style="grid-column:1/-1"><span class="label">NOME</span><input class="txt" id="pmx-ap-n" autocomplete="off" value="${esc(A.nome||'')}" placeholder="Quem produziu" style="height:46px"></label></div>
   <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="btn sec" data-act="pmx-ap-x">Cancelar</button><button class="btn" data-act="pmx-ap-ok">${ic('check',18,2.2)}Salvar apontamento</button></div>
   ${(f.aponts||[]).length?`<div class="label" style="margin:20px 0 6px">JÁ APONTADO</div>${(f.aponts||[]).map(a=>`<div class="num" style="display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--line-2);font-size:14px"><b style="min-width:60px">${pmxF(pmxNum(a.qtd))}</b><span style="color:var(--muted)">${esc(a.hora||'—')}${a.turno?' · '+esc(a.turno):''}</span><span style="margin-left:auto">${esc(a.nome||'')}</span></div>`).join('')}`:''}
  </div></div></div>`; }
function pmxRecAchar(txt){ const v=String(txt||'').trim().toLowerCase(); if(!v) return null; const recs=pmxRecAtivas();
  return recs.find(x=>pmxRecLab(x).toLowerCase()===v)||recs.find(x=>String(x.nome||'').trim().toLowerCase()===v)||(()=>{ const m=recs.filter(x=>pmxRecLab(x).toLowerCase().includes(v)); return m.length===1?m[0]:null; })(); }
function pmxRecLab(r){ return String(r.nome||'')+' · '+(r.batelada||'—')+' kg'; }
function pmxView(v){ return (v==='pmxfichas'?vPmxFichas():v==='pmxrec'?vPmxRec():v==='pmxest'?vPmxEst():'')+pmxDatalist(); }
function pmxDatalist(){ const vist=new Set(), op=[];
  const add=(c,n,u)=>{ c=String(c||'').trim(); if(!c||vist.has(c.toUpperCase())) return; vist.add(c.toUpperCase()); op.push(`<option value="${esc(c)}" label="${esc(n||'')}${u?' · '+esc(u):''}"></option>`); };
  S.pmx.mats.forEach(m=>add(m.codigo,m.nome,m.unidade)); S.pmx.rec.forEach(r=>(r.itens||[]).forEach(it=>add(it.codigo,it.nome,it.un)));
  (S.itens||[]).filter(i=>i.tipo==='mp'||/^MP/i.test(String(i.codigo||i._id))).forEach(i=>add(i.codigo||i._id,i.descricao,''));
  return `<datalist id="pmx-mps">${op.join('')}</datalist>`; }
function pmxAcharMp(cod){ cod=String(cod||'').trim().toUpperCase(); if(!cod) return null;
  const m=S.pmx.mats.find(x=>String(x.codigo).toUpperCase()===cod); if(m) return {nome:m.nome,un:m.unidade&&m.unidade!=='Kg'?m.unidade:'g'};
  for(const r of S.pmx.rec) for(const it of (r.itens||[])) if(String(it.codigo).toUpperCase()===cod) return {nome:it.nome,un:it.un||'g'};
  const i=(S.itens||[]).find(x=>String(x.codigo||x._id).toUpperCase()===cod); return i?{nome:i.descricao,un:'g'}:null; }

/* ---------- linhas de receita (editor de ficha e de receita) ---------- */
function pmxLinhasHtml(pref,itens,qtd){ const comTotal=qtd!=null;
  return `<div class="dbtw"><table class="dbti pmx-t"><thead><tr><th>Código</th><th>Matéria-prima</th><th class="r">Qtd. por premix</th><th>Un.</th>${comTotal?'<th class="r">Total usado</th>':''}<th></th></tr></thead><tbody>
   ${itens.map((it,i)=>`<tr><td><input class="txt num" list="pmx-mps" data-${pref}="codigo" data-i="${i}" value="${esc(it.codigo||'')}" placeholder="MP0001" style="height:38px;min-width:96px"></td>
    <td><input class="txt" data-${pref}="nome" data-i="${i}" value="${esc(it.nome||'')}" placeholder="Nome" style="height:38px;min-width:180px"></td>
    <td class="r"><input class="txt num" inputmode="decimal" data-${pref}="qtd" data-i="${i}" value="${esc(pmxV(it.qtd))}" placeholder="0,000" style="height:38px;width:110px;text-align:right"></td>
    <td><select class="txt" data-${pref}="un" data-i="${i}" style="height:38px;width:auto">${[...new Set([...PMX_UN,it.un||'g'])].map(u=>`<option ${u===(it.un||'g')?'selected':''}>${esc(u)}</option>`).join('')}</select></td>
    ${comTotal?`<td class="r num" id="${pref}-tot-${i}"><b>${pmxF(pmxNum(qtd)*pmxNum(it.qtd))}</b> ${esc(it.un||'g')}</td>`:''}
    <td><button class="lnk" data-act="pmx-${pref}-rm" data-i="${i}" style="color:var(--crit-ink)" aria-label="Remover linha">Remover</button></td></tr>`).join('')}
   </tbody></table></div><button class="lnk" data-act="pmx-${pref}-add" style="margin-top:6px">+ Matéria-prima</button>`; }

/* ---------- Fichas ---------- */
function pmxNovaFicha(recId){ if(pmxSujo()){ pmxAvisoSujo(); return; } const r=S.pmx.rec.find(x=>x._id===recId);
  S.pmx.ed={_id:null,num:'',receitaId:r?r._id:'',material:r?r.nome:'',qtd:'',data:hojeStr(),itens:r?pmxEmG(r.itens):[{codigo:'',nome:'',qtd:'',un:'g'}],aponts:[],obs:''};
  S.pmx.edSnap=JSON.stringify(S.pmx.ed); S.pmx.conf=null; go('pmxfichas'); window.scrollTo(0,0); setTimeout(()=>{ const e=$(r?'#pmx-qtd':'[data-pfrec]'); e&&e.focus(); },60); }
function pmxAbrirFicha(id){ const P=S.pmx; if(P.ed&&P.ed._id===id) return; if(pmxSujo()){ pmxAvisoSujo(); return; } const f=P.fichas.find(x=>x._id===id); if(!f) return; P.ed=JSON.parse(JSON.stringify(f)); P.ed.itens=pmxEmG(P.ed.itens); if(!P.ed.itens||!P.ed.itens.length) P.ed.itens=[{codigo:'',nome:'',qtd:'',un:'g'}];
  P.ed._apIds=(f.aponts||[]).map(a=>a.id); P.edSnap=JSON.stringify(P.ed); P.conf=null; render(); window.scrollTo(0,0); }
function pmxEditor(){ const E=S.pmx.ed, novo=!E._id, recs=pmxRecAtivas(), prod=pmxProd(E), enc=pmxEnc(E);
  const tot=pmxTotais(E);
  return `<section class="card pmx-ed" style="border:1.5px solid var(--teal)">
   <div class="head" style="align-items:baseline"><div><div class="eyebrow">${novo?'NOVA FICHA':'FICHA DO PREMIX'}</div><h2 style="margin-top:2px">${novo?'Ficha de produção do premix':esc(pmxOp(E))+' · '+esc(E.material)}</h2>${!novo&&pmxPendSis(E)?'<div class="sub" style="margin:2px 0 0;font-size:12.5px;color:var(--warn-ink)">Feita pelo almoxarifado. Falta apontar no sistema.</div>':''}</div>
    <div style="display:flex;gap:10px;align-items:center">${novo?'':`<span class="pill ${enc?'ok':'prod'}">${enc?'Encerrada':'Em produção'}</span>`}<button class="lnk" data-act="pmx-fechar">Fechar</button></div></div>
   <div class="pmx-g">
    ${novo||!String(E.num||'').trim()&&!pmxPodeEd()?`<label><span class="label">NÚMERO DA FICHA</span><div class="txt num" style="display:flex;align-items:center;height:46px;background:var(--surface-2);font-weight:700">${esc(E.numProv||pmxNumProv())}<small style="font-weight:500;color:var(--muted);margin-left:8px">automático</small></div><small class="sub" style="display:block;margin:4px 0 0;font-size:11.5px">Quando o almoxarifado marcar como feita, vai para o PCP apontar no sistema.</small></label>`:`<label><span class="label">OP NO SISTEMA</span><input class="txt num" data-pf="num" value="${esc(E.num||'')}" placeholder="${esc(E.numProv||'')} · sem OP ainda" autocomplete="off"></label>`}
    <label><span class="label">RECEITA (MATERIAL)</span><input class="txt" data-pfrec="1" list="pmx-rec-dl" value="${esc(E.receitaId?(()=>{ const r=recs.find(x=>x._id===E.receitaId); return r?pmxRecLab(r):(E.material||''); })():'')}" placeholder="Digite para pesquisar a receita…" autocomplete="off"><datalist id="pmx-rec-dl">${recs.map(r=>`<option value="${esc(pmxRecLab(r))}"></option>`).join('')}</datalist></label>
    <label><span class="label">QUANTIDADE DE PREMIX</span><input class="txt num" inputmode="decimal" data-pf="qtd" id="pmx-qtd" value="${esc(pmxV(E.qtd))}" placeholder="Ex.: 4"></label>
    <label><span class="label">DATA DE PRODUÇÃO</span><input class="txt" type="date" data-pf="data" value="${esc(E.data||'')}"></label>
   </div>
   <div class="label" style="margin:18px 0 6px">RECEITA DA FICHA</div>
   ${pmxLinhasHtml('pfi',E.itens,E.qtd)}
   <div class="label" style="margin:18px 0 6px" id="pmx-totlab">${pmxTotLab(E)}</div>
   <div class="pmx-tots" id="pmx-tots">${pmxTotHtml(tot)}</div>
   <div class="label" id="pmx-aps" style="margin:18px 0 6px;scroll-margin-top:90px">APONTAMENTOS DA PRODUÇÃO <span class="num" id="pmx-prodlab" style="letter-spacing:0;font-weight:600;color:var(--ink-2)">${pmxProdLab(E)}</span></div>
   <div class="dbtw"><table class="dbti"><thead><tr><th class="r">Premix produzidos</th><th>Hora</th><th>Turno</th><th>Nome</th><th>Assinatura almox</th><th></th></tr></thead><tbody>
    ${(E.aponts||[]).length?E.aponts.map((a,i)=>`<tr><td class="r"><input class="txt num" inputmode="decimal" data-pa="qtd" data-i="${i}" value="${esc(pmxV(a.qtd))}" style="height:38px;width:100px;text-align:right"></td>
      <td><input class="txt" type="time" data-pa="hora" data-i="${i}" value="${esc(a.hora||'')}" style="height:38px;width:auto"></td>
      <td><select class="txt" data-pa="turno" data-i="${i}" style="height:38px;width:auto">${[...new Set([...PMX_TURNOS,a.turno||'Manhã'])].map(t=>`<option ${t===a.turno?'selected':''}>${esc(t)}</option>`).join('')}</select></td>
      <td><input class="txt" data-pa="nome" data-i="${i}" value="${esc(a.nome||'')}" style="height:38px;min-width:140px"></td>
      <td><input class="txt" data-pa="assin" data-i="${i}" value="${esc(a.assin||'')}" style="height:38px;min-width:140px"></td>
      <td><button class="lnk" data-act="pmx-pa-rm" data-i="${i}" style="color:var(--crit-ink)">Remover</button></td></tr>`).join(''):'<tr><td colspan="6" class="sub" style="padding:10px">Nenhum apontamento ainda. Na ficha impressa sai a tabela em branco para preencher à mão.</td></tr>'}
   </tbody></table></div><button class="lnk" data-act="pmx-pa-add" style="margin-top:6px">+ Apontamento</button>
   <label style="display:flex;flex-direction:column;gap:6px;margin-top:16px"><span class="label">OBSERVAÇÃO</span><textarea class="txt" data-pf="obs" rows="2" placeholder="Observações da produção">${esc(E.obs||'')}</textarea></label>
   <div class="pmx-acts">
    ${novo?'':(S.pmx.conf==='excluir'?`<button class="btn warn" data-act="pmx-excluir-ok">Confirmar: excluir a ficha</button><button class="lnk" data-act="pmx-conf-x">Não</button>`:`<button class="lnk" data-act="pmx-excluir" style="color:var(--crit-ink)">Excluir ficha</button>`)}
    ${novo?'':`<button class="btn sec" data-act="pmx-encerrar">${E.status==='encerrada'?'Reabrir':'Encerrar agora'}</button>`}
    <span style="flex:1"></span>
    <button class="btn sec" data-act="pmx-salvar">${ic('check',18,2.2)}Salvar</button>
    <button class="btn" data-act="pmx-salvar-pdf">${ic('baixar',18,2)}Salvar e baixar ficha</button>
   </div></section>`; }
function pmxTotLab(E){ return pmxNum(E.qtd)>0?'TOTAL DE MATÉRIA-PRIMA PARA '+pmxF(pmxNum(E.qtd))+' PREMIX':'TOTAL DE MATÉRIA-PRIMA (INFORME A QUANTIDADE DE PREMIX)'; }
function pmxProdLab(E){ return pmxNum(E.qtd)>0?' · produzido '+pmxF(pmxProd(E))+' de '+pmxF(pmxNum(E.qtd))+' premix':''; }
function pmxTotHtml(tot){ return tot.length?tot.map(t=>`<div class="pmx-tot"><small class="num">${esc(t.codigo)}</small><b>${esc(t.nome)}</b><span class="num">${pmxF(t.total)} ${esc(t.un)}</span></div>`).join(''):'<div class="sub" style="margin:0">Preencha a quantidade e a receita para calcular.</div>'; }
document.addEventListener('toggle',e=>{ const t=e.target; if(t&&t.classList&&t.classList.contains('pmx-hist')) S.pmx.hsAberto=t.open; },true);
function pmxCard(f){ const pl=pmxNum(f.qtd), pr=pmxProd(f), en=pmxEnc(f), pc=pl>0?Math.min(100,pr/pl*100):0;
  return `<article class="pmx-fc ${en?'en':''}" data-act="pmx-abrir" data-id="${esc(f._id)}" role="button" tabindex="0">
      <div class="pmx-fh"><span class="pmx-op num">${esc(pmxOp(f))}</span><span class="pill ${pmxSt(f).c}">${pmxSt(f).t}</span></div>
      <div class="pmx-fm">${esc(f.material||'—')}</div>
      <div class="pmx-fi num">${esc(dataBR(f.data)||'—')} · ${pmxF(pl)} premix</div>
      ${pmxPodeEd()&&!String(f.num||'').trim()?`<div class="pmx-fw" data-act="pmx-ir-pend" role="button" title="Ir para o bloco do PCP">Sem OP do sistema · colocar no bloco 2</div>`:''}
      <div class="pmx-fp"><div class="bar"><i style="width:${pc}%"></i></div><span class="num">${pmxF(pr)} de ${pmxF(pl)} produzidos</span></div>
      <div class="pmx-fb">${en?'':`<button class="btn" data-act="pmx-apontar" data-id="${esc(f._id)}" style="height:36px;flex:1">Apontar</button><button class="btn sec" data-act="pmx-feita" data-id="${esc(f._id)}" style="height:36px;flex:1${S.pmx.confF===f._id?';border-color:var(--ok);color:var(--ok-ink)':''}">${S.pmx.confF===f._id?'Confirmar?':'Feita'}</button>`}${pmxPodeEd()?`<button class="btn sec" data-act="pmx-editar" data-id="${esc(f._id)}" style="height:36px;flex:1">Editar</button>`:''}<button class="btn sec" data-act="pmx-pdf" data-id="${esc(f._id)}" style="height:36px;padding:0 10px;flex:0 0 auto" title="Baixar a ficha em PDF" aria-label="Baixar a ficha em PDF">${ic('baixar',16,2)}</button></div></article>`; }
function vPmxFichas(){ const P=S.pmx, q=P.busca.trim().toLowerCase(); const ord=(a,b)=>String(b.data||'').localeCompare(String(a.data||''))||String(b.criadoEm||'').localeCompare(String(a.criadoEm||''));
  const bate=f=>{ if(!q) return true; const t=[f.num,f.numProv,f.material,f.data,dataBR(f.data),f.rancho,f.ordemRef,f.obs].map(x=>String(x||'').toLowerCase()).join(' | '); return q.split(/\s+/).every(w=>t.includes(w)); };
  const all0=pmxFichasVis(), all=all0.filter(bate), ab=all.filter(f=>!pmxEnc(f)).sort(ord), pend=all.filter(pmxPendSis), mst=pmxPodeEd();
  let hs=all.filter(pmxEnc); const nAp=hs.filter(f=>f.sis).length;
  if(P.st==='apontadas') hs=hs.filter(f=>f.sis); else if(P.st==='pendsis') hs=hs.filter(pmxPendSis);
  hs.sort(ord); const lim=P.hsN||24;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">ALMOXARIFADO · PREMIX</div><h1>Fichas de produção</h1><div class="sub">O almoxarifado gera a ficha, aponta e marca como feita. Depois ela vai para o PCP apontar no sistema.</div></div></div>
  ${P.ed?pmxEditor():''}${P.lote&&!P.ed?pmxLoteEditor():''}
  <div class="pmx-srch"><label class="srch" style="max-width:none;margin:0;flex:1 1 320px">${ic('lupa',16,2)}<input class="txt" id="pmx-busca" type="search" value="${esc(P.busca)}" placeholder="Pesquisar ficha: nº PMX, OP do sistema, material, data, rancho ou ordem…" autocomplete="off"></label>${q?`<span class="sub num" style="margin:0;font-size:13px">${all.length} de ${all0.length} fichas</span><button class="lnk" data-act="pmx-busca-x">Limpar</button>`:''}</div>
  <section class="card pmx-blk"><div class="head" style="align-items:center"><div><div class="label">1 · ALMOXARIFADO · EM PRODUÇÃO ${ab.length?'· '+ab.length:''}</div><div class="sub" style="margin:2px 0 0;font-size:13px">Gere a ficha, aponte o que foi produzido e clique em <b>Feita</b> quando terminar.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-act="pmx-lote">${ic('mais',18,2.2)}Várias fichas</button><button class="btn" data-act="pmx-nova">${ic('mais',20,2.2)}Nova ficha</button></div></div>
   ${ab.length?`<div class="pmx-fg">${ab.map(pmxCard).join('')}</div>`:`<div class="empty">${q?'Nenhuma ficha em produção com essa pesquisa.':P.rec.length?'Nenhuma ficha em produção. Clique em Nova ficha.':'Cadastre as receitas na aba Receitas para começar.'}</div>`}</section>
  ${mst?`<section class="card pmx-blk pmx-pend" id="pmx-pend"><div class="head" style="align-items:baseline"><div><div class="label" style="color:var(--warn-ink)">2 · PCP · ORDEM DO SISTEMA ${pend.length?'· '+pend.length:''}</div><div class="sub" style="margin:2px 0 0;font-size:13px">Toda ficha nova aparece aqui para você colocar a OP que abriu no sistema. Quando o almoxarifado marcar como feita, aponte no sistema e confirme.</div></div></div>
   ${pend.length?`<div class="dbtw" style="margin-top:8px"><table class="dbti pmx-pt"><thead><tr><th>Nº painel</th><th>Material</th><th>Data</th><th class="r">Premix</th><th class="r">Produzido</th><th>Situação</th><th>OP do sistema</th><th></th></tr></thead><tbody>
   ${pend.sort((a,b)=>(pmxEnc(b)?1:0)-(pmxEnc(a)?1:0)||String(a.numProv||'').localeCompare(String(b.numProv||''))).map(f=>{ const fe=pmxEnc(f), temOp=!!String(f.num||'').trim();
     return `<tr><td class="num"><b>${esc(f.numProv||'—')}</b></td><td>${esc(f.material||'')}</td><td class="num">${esc(dataBR(f.data)||'—')}</td><td class="r num">${pmxF(pmxNum(f.qtd))}</td><td class="r num">${pmxF(pmxProd(f))}</td>
      <td><span class="pill ${fe?'warn':'prod'}" style="font-size:11px">${fe?'Feita · apontar':'Em produção'}</span>${fe&&f.feitaEm?`<small style="display:block;color:var(--muted);font-size:11px;margin-top:2px">${dataBR(hojeStr(new Date(f.feitaEm)))} ${hora(f.feitaEm)}${f.feitaPor?' · '+esc(nomeDe(f.feitaPor)):''}</small>`:''}</td>
      <td><input class="txt num" id="pmx-op-${esc(f._id)}" placeholder="Nº da OP" value="${esc(String(f.num||'').trim())}" autocomplete="off" inputmode="numeric" style="height:38px;width:130px"></td>
      <td style="white-space:nowrap">${fe?`<button class="dbb" data-act="pmx-op-ok" data-m="sis" data-id="${esc(f._id)}">${ic('check',14,2.2)} Apontado no sistema</button>`:`<button class="dbb" data-act="pmx-op-ok" data-m="vinc" data-id="${esc(f._id)}">${temOp?'Trocar OP':'Salvar OP'}</button>`} <button class="dbb" data-act="pmx-pdf" data-id="${esc(f._id)}" title="Ver a ficha em PDF">${ic('baixar',14,2)}</button></td></tr>`; }).join('')}</tbody></table></div>`:q?'<div class="empty" style="padding:14px">Nenhuma ficha pendente com essa pesquisa.</div>':'<div class="empty" style="padding:14px">Nada pendente: todas as fichas têm OP e as feitas já foram apontadas.</div>'}</section>`:''}
  <details class="card pmx-blk pmx-hist" ${P.hsAberto||q?'open':''}><summary class="head" style="align-items:center;cursor:pointer;list-style:none"><div class="label">${mst?'3':'2'} · HISTÓRICO · ${all.filter(pmxEnc).length} FICHAS FEITAS${q?' COM ESSA PESQUISA':''}</div><span class="lnk">ver</span></summary>
   <div class="pmx-fil" style="margin-top:10px">
    <div class="chips">${[['todas','Todas',all.filter(pmxEnc).length],...(mst?[['pendsis','Falta PCP',all.filter(pmxEnc).filter(pmxPendSis).length]]:[]),['apontadas','Apontadas no sistema',nAp]].map(([k,n,c])=>`<button class="chip" data-act="pmx-st" data-v="${k}" aria-pressed="${(P.st==='abertas'||P.st==='encerradas'?'todas':P.st)===k}">${n} <span class="num" style="opacity:.75">${c}</span></button>`).join('')}</div></div>
   ${hs.length?`<div class="pmx-fg">${hs.slice(0,lim).map(pmxCard).join('')}</div>${hs.length>lim?`<div style="text-align:center;margin-top:12px"><button class="btn sec" data-act="pmx-hs-mais">Mostrar mais (${hs.length-lim})</button></div>`:''}`:'<div class="empty">Nenhuma ficha neste filtro.</div>'}</details>
  ${pmxApModal()}`; }

/* ---------- Receitas ---------- */
function vPmxRec(){ const P=S.pmx, recs=pmxRecAtivas(), R=P.red;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">ALMOXARIFADO · PREMIX</div><h1>Receitas de premix</h1><div class="sub">Cada receita tem a batelada e as matérias-primas com a quantidade por item. É ela que preenche a ficha.</div></div>
   <div style="display:flex;gap:10px;flex-wrap:wrap"><label class="btn sec" style="cursor:pointer">${ic('baixar',18,2)}Importar estrutura (PDF)<input type="file" id="pmx-est-arq" accept=".pdf,application/pdf" multiple hidden></label><button class="btn sec" data-act="pmx-imp-abrir">${ic('baixar',18,2)}Importar do programa antigo</button><button class="btn" data-act="pmx-rec-nova">${ic('mais',20,2.2)}Nova receita</button></div></div>
  ${P.imp?pmxImpCard():''}${P.est?pmxEstCard():''}
  ${R?`<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><h2>${R._id?'Editar receita':'Nova receita'}</h2><button class="lnk" data-act="pmx-rec-fechar">Fechar</button></div>
   <div class="pmx-g" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)"><label><span class="label">NOME DO PREMIX</span><input class="txt" data-pr="nome" value="${esc(R.nome||'')}" placeholder="Ex.: AC1"></label>
    <label><span class="label">BATELADA (KG)</span><input class="txt num" inputmode="decimal" list="pmx-bat" data-pr="batelada" value="${esc(R.batelada==null?'':R.batelada)}" placeholder="500"><datalist id="pmx-bat">${PMX_BATELADAS.map(b=>`<option value="${b}"></option>`).join('')}</datalist></label></div>
   <div class="label" style="margin:16px 0 6px">MATÉRIAS-PRIMAS</div>${pmxLinhasHtml('pri',R.itens)}
   <div class="pmx-acts">${R._id?(P.conf==='rec-x'?`<button class="btn warn" data-act="pmx-rec-x-ok">Confirmar: desativar receita</button><button class="lnk" data-act="pmx-conf-x">Não</button>`:`<button class="lnk" data-act="pmx-rec-x" style="color:var(--crit-ink)">Desativar receita</button>`):''}<span style="flex:1"></span><button class="btn" data-act="pmx-rec-salvar">${ic('check',18,2.2)}Salvar receita</button></div></section>`:''}
  ${recs.length?`<section class="card" style="padding:14px 18px"><div class="pmx-fil" style="margin-bottom:6px"><input class="txt" id="pmx-rbusca" value="${esc(P.rbusca||'')}" placeholder="Buscar receita ou matéria-prima" style="flex:1 1 240px;height:42px"><span class="sub num" style="margin:0;font-size:13px">${recs.length} receita${recs.length===1?'':'s'}</span></div>
   <div class="pmx-rl">
   ${(()=>{ const q=String(P.rbusca||'').trim().toLowerCase(); const ys=q?recs.filter(r=>String(r.nome||'').toLowerCase().includes(q)||(r.itens||[]).some(it=>String(it.codigo||'').toLowerCase().includes(q)||String(it.nome||'').toLowerCase().includes(q))):recs;
     return ys.length?ys.map(r0=>{ const r=Object.assign({},r0,{itens:pmxEmG(r0.itens)}); return `<details class="pmx-rd"><summary class="pmx-rr"><span class="pmx-rn"><b>${esc(r.nome)}</b><small class="num">Batelada <b>${esc(r.batelada||'—')} kg</b><i>·</i>${(r.itens||[]).length} matéria${(r.itens||[]).length===1?'':'s'}-prima${(r.itens||[]).length===1?'':'s'}<i>·</i>pacote <b>${pmxF(pmxPacote(r.itens))} ${(()=>{ const us=[pmxPacoteUn(r.itens)]; return esc(us.length===1?us[0]:'un.'); })()}</b><i>·</i><u>ver receita</u></small></span>
       <span class="pmx-ra"><button class="btn sec" data-act="pmx-rec-ed" data-id="${esc(r._id)}" style="height:34px;padding:0 12px;font-size:13px">Editar</button></span></summary>
       <table class="dbfot" style="margin:4px 0 12px"><thead><tr><th>Código</th><th>Matéria-prima</th><th class="r">Qtd.</th><th>Un.</th></tr></thead><tbody>${(r.itens||[]).map(it=>`<tr><td class="num">${esc(it.codigo||'—')}</td><td>${esc(it.nome||'—')}</td><td class="r num">${pmxF(pmxNum(it.qtd))}</td><td>${esc(it.un||'g')}</td></tr>`).join('')}</tbody></table></details>`; }).join(''):'<div class="empty">Nenhuma receita com essa busca.</div>'; })()}
   </div><div class="sub" style="font-size:12px;margin:8px 0 0">Clique na receita para ver as matérias-primas.</div></section>`
   :`<section class="card"><div class="empty">Nenhuma receita ainda. Importe do programa antigo (menu Backup → Baixar arquivo backup, lá no programa) ou cadastre uma nova.</div></section>`}`; }

/* ---------- Saldo ---------- */
function pmxSaldo(){ const m=new Map();
  pmxFichasVis().forEach(f=>{ const p=pmxProd(f); if(p<=0) return; const c=pmxCod(f.material), k=c.toLowerCase(); const x=m.get(k)||{codigo:c,material:f.material,prod:0,usado:0,saldo:0,fichas:0}; x.prod+=p; x.saldo+=p; x.fichas++; m.set(k,x); });
  S.pmx.baixas.forEach(b=>{ const c=pmxCod(b.codigo||b.material), k=c.toLowerCase(); const x=m.get(k)||{codigo:c,material:b.material||c,prod:0,usado:0,saldo:0,fichas:0}; const q=pmxNum(b.qtd); x.usado+=q; x.saldo-=q; m.set(k,x); });
  return [...m.values()].sort((a,b)=>String(a.material).localeCompare(String(b.material),'pt-BR')); }
function vPmxEst(){ const P=S.pmx, xs=pmxSaldo(), u=P.usar;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">ALMOXARIFADO · PREMIX</div><h1>Saldo de premix produzido</h1><div class="sub">Em quantidade de premix. Entra o que foi apontado nas fichas; sai o que você lança como usado.</div></div></div>
  <section class="card">${xs.length?`<div class="dbtw"><table class="dbti"><thead><tr><th>Código</th><th>Material</th><th class="r">Produzidos</th><th class="r">Usados</th><th class="r">Saldo (premix)</th><th></th></tr></thead><tbody>
   ${xs.map(x=>`<tr class="${x.saldo<=0?'off':''}"><td class="num"><b>${esc(x.codigo)}</b></td><td>${esc(x.material)}</td><td class="r num">${pmxF(x.prod,2)}</td><td class="r num">${pmxF(x.usado,2)}</td><td class="r num"><b>${pmxF(x.saldo,2)}</b></td>
    <td style="white-space:nowrap">${u&&u.codigo===x.codigo?`<span style="display:inline-flex;gap:6px;align-items:center"><input class="txt num" id="pmx-usar-q" inputmode="decimal" placeholder="Qtd." style="height:34px;width:90px;text-align:right"><button class="dbb" data-act="pmx-usar-ok">Dar baixa</button><button class="lnk" data-act="pmx-usar-x">Cancelar</button></span>`:`<button class="dbb" data-act="pmx-usar" data-v="${esc(x.codigo)}" ${x.saldo<=0?'disabled':''}>Usar</button>`}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum saldo ainda. Ele aparece quando as fichas têm apontamentos.</div>'}</section>
  <section class="card"><div class="label" style="margin-bottom:6px">ÚLTIMAS BAIXAS</div>${P.baixas.length?P.baixas.slice(0,20).map(b=>`<div class="row num" style="grid-template-columns:110px minmax(0,1fr) auto"><span>${b.em?dataBR(hojeStr(new Date(b.em)))+' '+hora(b.em):'—'}</span><span><b>${esc(b.codigo||'')}</b> · ${esc(b.material||'')}<small style="display:block;color:var(--muted)">${esc(b.porNome||S.nomes[b.por]||'')}</small></span><b>${pmxF(pmxNum(b.qtd),2)} premix</b></div>`).join(''):'<div class="sub" style="margin:0">Nenhuma baixa lançada.</div>'}</section>`; }

/* ---------- importar do programa antigo (backup-ficha-producao-*.json) ---------- */
function pmxNumAntigo(v){ return Number(String(v||'0').replace(/\./g,'').replace(',','.'))||0; }
/* ---------- importar estrutura do sistema (PDF "Explosão de estrutura") ---------- */
function pmxEstParse(pags,arq){ const t=pags.join('\n').replace(/\n(?=\d[\d.]*(?:,\d+)?\s*\S?\s*(?:\n|$))/g,' '); const mi=t.match(/item\s+([A-Z]{1,3}\d{3,6}[A-Z0-9]*)/i); if(!mi) return {arq,erro:'Não achei o código do item. Use o PDF "Explosão de estrutura" do sistema.'};
  const cod=mi[1].toUpperCase(); const mb=t.match(/qtd\.?\s*base\s*([\d.]*\d,?\d*)/i); const base=mb?pmxNum(mb[1])||1:1; const itens=[], fora=[];
  t.split('\n').forEach(l=>{ const m=l.trim().match(/^(\d+)\s+([A-Z]{1,3}\d{2,6}[A-Z0-9]*)\s+(.+?)\s+(KG|G|GR|UN|UND|L|LT|M|MT|PC|CX)\s+(\d[\d.]*(?:,\d+)?)/i); if(!m||m[1]!=='1') return;
    const um=m[4].toUpperCase(), q=pmxNum(m[5])/base, it={codigo:m[2].toUpperCase(),nome:m[3].trim(),um};
    if(um==='KG') itens.push(Object.assign(it,{qtd:Math.round(q*1e6)/1e3,un:'g'})); else if(um==='G'||um==='GR') itens.push(Object.assign(it,{qtd:Math.round(q*1e3)/1e3,un:'g'})); else fora.push(Object.assign(it,{qtd:q})); });
  if(!itens.length) return {arq,cod,erro:'Não achei matérias-primas em KG neste PDF.'};
  const ex=S.pmx.rec.find(r=>r.ativo!==false&&String(r.nome||'').trim().toUpperCase().split(/\s+/)[0]===cod); const it=itemDe(cod);
  return {arq,cod,itens,fora,ex:ex?ex._id:null,nome:ex?ex.nome:(cod+(it&&it.descricao?' '+it.descricao:'')),batelada:ex?ex.batelada:500,ok:true}; }
function pmxEstCard(){ const E=S.pmx.est; const ok=(E.l||[]).filter(x=>x.ok&&!x.erro);
  return `<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><div><h2>Importar estrutura do sistema</h2><div class="sub" style="margin:2px 0 0;font-size:12.5px">Lido do PDF "Explosão de estrutura". KG vira gramas (×1000). Sacaria e outros itens em UN ficam de fora da receita.</div></div><button class="lnk" data-act="pmx-est-x">Fechar</button></div>
   ${E.lendo?'<div class="empty">Lendo o PDF…</div>':(E.l||[]).map((x,i)=>x.erro?`<div class="av warn" style="margin:8px 0"><span><b>${esc(x.arq)}</b> · ${esc(x.erro)}</span></div>`:`<div class="opanel" style="margin:10px 0 0;background:var(--surface-2)">
     <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="ck" style="font-size:13px"><input type="checkbox" data-pest="ok" data-i="${i}" ${x.ok?'checked':''}> Importar</label>
      <span class="pill ${x.ex?'warn':'ok'}" style="font-size:11px">${x.ex?'Atualiza a receita existente':'Receita nova'}</span><small class="sub num" style="margin:0">${esc(x.arq)}</small></div>
     <div class="pmx-g" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);margin-top:8px"><label><span class="label">NOME DO PREMIX</span><input class="txt" data-pest="nome" data-i="${i}" value="${esc(x.nome)}"></label><label><span class="label">BATELADA (KG)</span><input class="txt num" data-pest="batelada" data-i="${i}" inputmode="decimal" value="${esc(String(x.batelada==null?'':x.batelada))}"></label></div>
     <table class="dbfot" style="margin:8px 0 0"><thead><tr><th>Código</th><th>Matéria-prima</th><th class="r">Qtd. por premix</th><th>Un.</th></tr></thead><tbody>${x.itens.map(it=>`<tr><td class="num">${esc(it.codigo)}</td><td>${esc(it.nome)}</td><td class="r num">${pmxF(it.qtd)}</td><td>g</td></tr>`).join('')}
      ${x.fora.map(it=>`<tr style="opacity:.55"><td class="num">${esc(it.codigo)}</td><td>${esc(it.nome)} <small>(fora da receita)</small></td><td class="r num">${pmxF(it.qtd)}</td><td>${esc(it.um)}</td></tr>`).join('')}</tbody></table>
     ${x.ex?`<div class="sub" style="margin:6px 0 0;font-size:12px">As matérias-primas de <b>${esc((S.pmx.rec.find(r=>r._id===x.ex)||{}).nome||'')}</b> serão trocadas por estas.</div>`:''}</div>`).join('')}
   ${ok.length?`<div class="pmx-acts"><span style="flex:1"></span><button class="btn" data-act="pmx-est-ok" ${E.salvando?'disabled':''}>${ic('check',18,2.2)}${E.salvando?'Salvando…':'Salvar '+ok.length+' receita'+(ok.length===1?'':'s')}</button></div>`:''}</section>`; }
async function pmxEstLer(files){ const P=S.pmx; P.est={lendo:true,l:[]}; P.red=null; render();
  for(const f of files){ try{ P.est.l.push(pmxEstParse(await textoPaginasPdf(await f.arrayBuffer()),f.name)); }catch(e){ console.warn('estrutura',e); P.est.l.push({arq:f.name,erro:'Não foi possível ler este PDF.'}); } }
  P.est.lendo=false; render(); }
async function pmxEstSalvar(){ const E=S.pmx.est; if(!E||E.salvando||!S.db) return; const xs=E.l.filter(x=>x.ok&&!x.erro); if(!xs.length) return;
  for(const x of xs){ if(!String(x.nome||'').trim()||!(pmxNum(x.batelada)>0)){ toast('Informe o nome e a batelada de '+x.cod+'.'); return; } }
  E.salvando=true; render(); const agora=new Date().toISOString(); let n=0;
  try{ for(const x of xs){ const itens=x.itens.map(it=>({codigo:it.codigo,nome:it.nome,qtd:it.qtd,un:'g'}));
      if(x.ex){ const r=S.pmx.rec.find(y=>y._id===x.ex)||{}; await S.db.doc('pmxrec/'+x.ex).update({nome:String(x.nome).trim(),batelada:pmxNum(x.batelada),itens,alteradoEm:agora,alteradoPor:S.uid,estruturaEm:agora}); Object.assign(r,{nome:String(x.nome).trim(),batelada:pmxNum(x.batelada),itens}); }
      else { const id=pmxId(), d={nome:String(x.nome).trim(),batelada:pmxNum(x.batelada),itens,ativo:true,criadoEm:agora,alteradoEm:agora,por:S.uid,alteradoPor:S.uid,origem:'estrutura',estruturaEm:agora}; await S.db.doc('pmxrec/'+id).set(d); if(!S.pmx.rec.some(y=>y._id===id)) S.pmx.rec.push(Object.assign({_id:id},d)); }
      n++; } }
  catch(e){ E.salvando=false; render(); erro(e); return; }
  S.pmx.est=null; render(); toast(n+' receita'+(n===1?'':'s')+' salva'+(n===1?'':'s')+' a partir da estrutura.'); }
function pmxImpCard(){ const I=S.pmx.imp;
  if(I.erro) return `<section class="card" style="border:1.5px solid var(--crit)"><div class="head"><h2>Importar do programa antigo</h2><button class="lnk" data-act="pmx-imp-x">Fechar</button></div><div class="sub" style="color:var(--crit-ink)">${esc(I.erro)}</div></section>`;
  if(!I.dados) return `<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><h2>Importar do programa antigo</h2><button class="lnk" data-act="pmx-imp-x">Fechar</button></div>
   <div class="sub">No programa Ficha de Produção, abra <b>Backup → Baixar arquivo backup</b> e escolha aqui o arquivo <code>backup-ficha-producao-….json</code>. Vêm as receitas, as fichas com os apontamentos e as baixas de estoque. Usuários e senhas não são trazidos.</div>
   <input type="file" id="pmx-imp-arq" accept=".json,application/json" style="margin-top:12px"></section>`;
  const D=I.dados, jaR=new Set(S.pmx.rec.map(r=>r._id)), jaF=new Set(S.pmx.fichas.map(f=>f._id));
  const nR=D.formulacoes.length, nF=D.fichas.length, nB=D.estoqueMovimentos.length, nM=D.materiais.length;
  const repet=D.formulacoes.filter(r=>jaR.has('o'+r.id)).length+D.fichas.filter(f=>jaF.has('o'+f.id)).length;
  return `<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><h2>Importar do programa antigo</h2><button class="lnk" data-act="pmx-imp-x">Fechar</button></div>
   <div class="pmx-imp num"><div><b>${nR}</b><span>receitas</span></div><div><b>${nF}</b><span>fichas</span></div><div><b>${nB}</b><span>baixas de estoque</span></div><div><b>${nM}</b><span>matérias-primas</span></div></div>
   <div class="sub">${repet?repet+' registro'+(repet===1?' já está no painel e será mantido como está':'s já estão no painel e serão mantidos como estão')+' (o que você mudou aqui não é desfeito). ':''}Arquivo gerado em ${D.geradoEm?new Date(D.geradoEm).toLocaleString('pt-BR'):'—'}.</div>
   <div class="pmx-acts"><span style="flex:1"></span><button class="btn" data-act="pmx-imp-ok" ${I.gravando?'disabled':''}>${I.gravando?'Gravando… '+(I.feito||0)+' de '+(nR+nF+nB+1):'Importar agora'}</button></div></section>`; }
async function pmxImportar(){ const I=S.pmx.imp, D=I&&I.dados; if(!D||I.gravando||!S.db) return; I.gravando=true; I.feito=0; render();
  const agora=new Date().toISOString(), ops=[];
  D.formulacoes.forEach(r=>ops.push(['pmxrec','o'+r.id,{nome:String(r.nome||r.material||'').trim(),batelada:pmxNumAntigo(r.batelada)||null,itens:(r.formula||[]).map(it=>({codigo:String(it.codigo||'').trim(),nome:String(it.nome||'').trim(),qtd:pmxNumAntigo(it.quantidade),un:it.kg||'Kg'})),ativo:true,origem:'programa-antigo',criadoEm:r.atualizadoEm||agora,alteradoEm:agora,por:S.uid}]));
  D.fichas.forEach(f=>ops.push(['pmxfichas','o'+f.id,{num:String(f.numeroOrdem||'').trim(),material:String(f.material||'').trim(),receitaId:f.formulacaoId?'o'+f.formulacaoId:null,qtd:pmxNumAntigo(f.quantidade),data:f.data||null,
    itens:(f.formula||[]).map(it=>({codigo:String(it.codigo||'').trim(),nome:String(it.nome||'').trim(),qtd:pmxNumAntigo(it.quantidade),un:it.kg||'Kg'})),
    aponts:(f.apontamentos||[]).map(a=>({id:String(a.id||pmxId()),qtd:pmxNumAntigo(a.quantidadeProduzida),hora:a.hora||'',turno:a.turno==='Manha'?'Manhã':(a.turno||''),nome:a.nome||'',assin:a.assinatura||''})),
    obs:f.observacao||'',status:'aberta',origem:'programa-antigo',criadoEm:f.atualizadoEm||agora,alteradoEm:agora,por:S.uid}]));
  D.estoqueMovimentos.forEach(b=>ops.push(['pmxbaixas','o'+b.id,{codigo:String(b.codigo||'').trim(),material:b.material||'',qtd:pmxNumAntigo(b.quantidade),em:b.atualizadoEm||agora,porNome:b.usuario||'',origem:'programa-antigo'}]));
  const mats=D.materiais.map(m=>({codigo:String(m.codigo||'').trim(),nome:String(m.nome||'').trim(),unidade:m.unidade||'Kg'})).filter(m=>m.codigo);
  let erros=0, pulados=0; const ja={pmxrec:new Set(S.pmx.rec.map(x=>x._id)),pmxfichas:new Set(S.pmx.fichas.map(x=>x._id)),pmxbaixas:new Set(S.pmx.baixas.map(x=>x._id))};
  for(const [c,id,d] of ops){ const sid=String(id).replace(/[^A-Za-z0-9_\-.~:@+]/g,'_'); if(ja[c]&&ja[c].has(sid)){ pulados++; I.feito++; continue; }
    try{ const g=await S.db.doc(c+'/'+sid).get(); if(g&&g.exists) pulados++; else await S.db.doc(c+'/'+sid).set(d); }catch(e){ erros++; } I.feito++; if(I.feito%10===0) render(); }
  const porCod=new Map(); (S.pmx.mats||[]).forEach(m=>porCod.set(String(m.codigo).toUpperCase(),m)); mats.forEach(m=>{ if(!porCod.has(m.codigo.toUpperCase())) porCod.set(m.codigo.toUpperCase(),m); });
  try{ await S.db.doc('config/premix').set({materiais:[...porCod.values()],alteradoEm:agora,por:S.uid}); }catch(e){ erros++; } I.feito++;
  S.pmx.imp=null; render(); toast(erros?`Importação terminou com ${erros} erro${erros===1?'':'s'}. Rode de novo: o que já entrou não é mexido.`:`Importação concluída: ${ops.length-pulados} registros novos${pulados?', '+pulados+' já estavam no painel e ficaram como estavam':''}.`); }

/* ---------- PDF da ficha (mesmo conteúdo da ficha impressa do programa antigo) ---------- */
async function pmxPdf(f){ return pmxPdfVarias([f]); }
async function pmxPdfVarias(fs){ if(!window.jspdf){ toast('Não foi possível carregar o gerador de PDF. Recarregue a página.'); return; }
  const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  const pdf=new window.jspdf.jsPDF('p','mm','a4'), ML=10, W=190, logo=(document.querySelector('.brand img')||{}).src||''; const ini=[];
  fs.forEach((f0,fi)=>{ const f=Object.assign({},f0,{itens:pmxEmG(f0.itens)}); if(fi) pdf.addPage('a4','p'); ini.push(pdf.getNumberOfPages());
  let y=8; const novaPag=()=>{ pdf.addPage('a4','p'); y=12; }; const cabe=h=>{ if(y+h>285) novaPag(); };
  if(logo){ try{ const pr=pdf.getImageProperties(logo); pdf.addImage(logo,'PNG',ML,y,30,(pr.height*30)/pr.width); }catch(e){} }
  pdf.setFont('helvetica','bold'); pdf.setFontSize(15); pdf.text('FICHA DE PRODUÇÃO · PREMIX',105,y+7,{align:'center'});
  pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(90,90,90); pdf.text('Controle impresso para apontamento de produção de premix',105,y+12,{align:'center'}); pdf.setTextColor(0,0,0);
  const prov=!String(f.num||'').trim(); pdf.setDrawColor(0); pdf.setLineWidth(.5); pdf.rect(160,y,40,12); pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.text(prov?'Nº PROVISÓRIO':'ORDEM',162,y+3.5); pdf.setFontSize(12); pdf.text(String(prov?(f.numProv||'—'):f.num),180,y+9.5,{align:'center'}); pdf.setLineWidth(.2);
  if(prov){ pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.text('OP no sistema: ______________',200,y+15,{align:'right'}); }
  y+=17;
  const corta=(t,w)=>{ const ls=pdf.splitTextToSize(String(t==null?'':t),w); return ls.length>1?String(ls[0]).replace(/\s*\S{0,3}$/,'')+'…':(ls[0]||''); };
  const campo=(x,w,lab,val)=>{ pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.text(lab,x+1,y-1.2); pdf.setDrawColor(170); pdf.rect(x,y,w,9); pdf.setDrawColor(0); pdf.setFont('helvetica','normal'); let fs=10; pdf.setFontSize(fs); while(fs>7&&pdf.getTextWidth(String(val))>w-5){ fs-=.5; pdf.setFontSize(fs); } pdf.text(corta(val,w-4),x+2.5,y+6); };
  y+=3; campo(ML,130,'MATERIAL',f.material||'—'); campo(ML+132,58,'QUANTIDADE DE PREMIX',pmxF(pmxNum(f.qtd))); y+=15;
  const tabela=(titulo,cols,linhas,rodape)=>{ cabe(20); pdf.setFillColor(44,62,80); pdf.rect(ML,y,W,7,'F'); pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(9.5); pdf.text(titulo,ML+3,y+4.9); pdf.setTextColor(0,0,0); y+=7;
    const cab=()=>{ pdf.setFillColor(236,230,216); pdf.rect(ML,y,W,6,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); let x=ML; cols.forEach(c=>{ pdf.text(c[0],c[2]==='r'?x+c[1]-2:x+2,y+4.2,{align:c[2]==='r'?'right':'left'}); x+=c[1]; }); y+=6; }; cab();
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
    const lin=(vals,neg,alt)=>{ if(y+(alt||7)>285){ novaPag(); cab(); pdf.setFont('helvetica','normal'); pdf.setFontSize(9); } let x=ML; pdf.setDrawColor(200); pdf.line(ML,y+(alt||7),ML+W,y+(alt||7)); pdf.setDrawColor(0); pdf.setFont('helvetica',neg?'bold':'normal');
      cols.forEach((c,i)=>{ const t=corta(vals[i],c[1]-4); pdf.text(t,c[2]==='r'?x+c[1]-2:x+2,y+(alt||7)-2.2,{align:c[2]==='r'?'right':'left'}); x+=c[1]; }); y+=(alt||7); };
    linhas.forEach(v=>lin(v)); if(rodape) lin(rodape,true); y+=5; return lin; };
  tabela('RECEITA DO PREMIX',[['Código',32],['Matéria-prima',98],['Qtd. por premix',32,'r'],['Unidade',28]],(f.itens||[]).filter(it=>it.codigo||it.nome||pmxNum(it.qtd)).map(it=>[it.codigo||'',it.nome||'',pmxF(pmxNum(it.qtd)),it.un||'g']),['','Total do pacote',pmxF(pmxPacote(f.itens)),pmxPacoteUn(f.itens)]);
  tabela('TOTAL DE MATÉRIA-PRIMA NECESSÁRIA PARA '+pmxF(pmxNum(f.qtd))+' PREMIX',[['Código',32],['Matéria-prima',98],['Total',32,'r'],['Unidade',28]],pmxTotais(f).map(t=>[t.codigo,t.nome,pmxF(t.total),t.un]));
  const ap=(f.aponts||[]).map(a=>[a.hora||'',pmxF(pmxNum(a.qtd)),'',a.nome||'',a.assin||'']); const vazias=Math.max(5,8-ap.length);
  for(let i=0;i<vazias;i++) ap.push(['','','','','']);
  const apCols=[['Hora',22],['Premix produzidos',38,'r'],['Finalizado',26],['Nome',52],['Assinatura almox.',52]];
  const apCab=()=>{ pdf.setFillColor(236,230,216); pdf.rect(ML,y,W,6,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); let x=ML; apCols.forEach(c=>{ pdf.text(c[0],c[2]==='r'?x+c[1]-2:x+2,y+4.2,{align:c[2]==='r'?'right':'left'}); x+=c[1]; }); y+=6; pdf.setFont('helvetica','normal'); pdf.setFontSize(9); };
  cabe(40); tabela('APONTAMENTO DA PRODUÇÃO',apCols,[]);
  y-=5; pdf.setFont('helvetica','normal'); pdf.setFontSize(9);
  ap.forEach(v=>{ if(y+9>285){ novaPag(); apCab(); } let x=ML; const cw=[22,38,26,52,52]; cw.forEach((w,i)=>{ pdf.setDrawColor(170); pdf.rect(x,y,w,9); const t=String(v[i]||''); if(t) pdf.text(corta(t,w-3),i===1?x+w-2:x+1.5,y+6,{align:i===1?'right':'left'}); x+=w; }); y+=9; });
  y+=6; if(f.obs){ cabe(14); pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.text('OBSERVAÇÃO',ML,y); pdf.setFont('helvetica','normal'); pdf.setFontSize(9); const ls=pdf.splitTextToSize(f.obs,W); const vis=ls.slice(0,4); if(ls.length>4) vis[3]=String(vis[3]).replace(/\s*\S{0,3}$/,'')+'…'; pdf.text(vis,ML,y+4.5); y+=6+vis.length*4; }
  cabe(24); y=Math.max(y+12,Math.min(268,y+30)); pdf.setDrawColor(0); pdf.line(ML+5,y,ML+85,y); pdf.line(ML+105,y,ML+185,y); pdf.setFontSize(8.5); pdf.text('Responsável produção',ML+45,y+4.5,{align:'center'}); pdf.text('Conferência almoxarifado',ML+145,y+4.5,{align:'center'});
  });
  const N=pdf.getNumberOfPages(); ini.push(N+1);
  for(let k=0;k<fs.length;k++){ const a=ini[k], n=ini[k+1]-a; for(let i=a;i<a+n;i++){ pdf.setPage(i); pdf.setFontSize(7); pdf.setTextColor(120,120,120); pdf.text('Emitida em '+new Date().toLocaleString('pt-BR').slice(0,17)+' · Painel de Operação Colafix · '+pmxOp(fs[k])+(n>1?' · página '+(i-a+1)+' de '+n:''),105,292,{align:'center'}); pdf.setTextColor(0,0,0); } }
  const nm=fs.length===1?'Ficha_premix_'+String(pmxOp(fs[0])).replace(/[^\w.-]+/g,'_'):'Fichas_premix_'+fs.length+'_'+hojeStr();
  pdf.setProperties({title:fs.length===1?'Ficha premix '+pmxOp(fs[0]):fs.length+' fichas de premix'});
  try{ await dl.save({filename:nm+'.pdf',data:pdf.output('blob')}); toast(fs.length===1?'Ficha '+pmxOp(fs[0])+' gerada.':fs.length+' fichas geradas em um PDF.'); }catch(e){ if(e&&e.code!=='declined') toast('Não foi possível baixar o arquivo.'); } }

/* ---------- várias fichas de uma vez ---------- */
function pmxLoteNovo(){ if(pmxSujo()){ pmxAvisoSujo(); return; } S.pmx.ed=null; S.pmx.edSnap=null; S.pmx.lote={data:hojeStr(),linhas:[{rec:'',qtd:''},{rec:'',qtd:''},{rec:'',qtd:''}],salvando:false}; render(); setTimeout(()=>{ const e=$('[data-pl="rec"]'); e&&e.focus(); },50); }
function pmxLoteEditor(){ const L=S.pmx.lote, recs=pmxRecAtivas(); let prox=+(pmxNumProv().slice(4)); const ok=L.linhas.filter(l=>pmxRecAchar(l.rec)&&pmxNum(l.qtd)>0).length;
  return `<section class="card pmx-ed" style="border:1.5px solid var(--teal)">
   <div class="head" style="align-items:baseline"><div><div class="eyebrow">VÁRIAS FICHAS</div><h2 style="margin-top:2px">Gerar várias fichas de uma vez</h2><div class="sub" style="margin:2px 0 0;font-size:12.5px">Uma linha para cada ficha. Cada uma ganha seu número automático e todas saem num único PDF.</div></div>
    <button class="lnk" data-act="pmx-lote-x">Fechar</button></div>
   <datalist id="pmx-rec-dl2">${recs.map(r=>`<option value="${esc(pmxRecLab(r))}"></option>`).join('')}</datalist>
   <div class="dbtw" style="margin-top:12px"><table class="dbti pmx-lt"><thead><tr><th style="width:110px">Nº</th><th>Receita (material)</th><th class="r" style="width:150px">Qtd. de premix</th><th style="width:150px"></th></tr></thead><tbody>
    ${L.linhas.map((l,i)=>{ const r=pmxRecAchar(l.rec), vale=r&&pmxNum(l.qtd)>0;
      return `<tr><td class="num sub" style="margin:0" id="pl-n-${i}">${vale?'PMX-'+String(prox++).padStart(4,'0'):'—'}</td>
       <td><input class="txt" data-pl="rec" data-i="${i}" list="pmx-rec-dl2" value="${esc(l.rec)}" placeholder="Digite para pesquisar a receita…" autocomplete="off" style="height:40px;min-width:240px;width:100%"><small id="pl-e-${i}" style="display:${l.rec&&!r?'block':'none'};color:var(--crit-ink);font-size:11.5px;margin-top:2px">Receita não encontrada. Escolha uma da lista.</small></td>
       <td class="r"><input class="txt num" data-pl="qtd" data-i="${i}" inputmode="decimal" value="${esc(pmxV(l.qtd))}" placeholder="Ex.: 4" style="height:40px;width:120px;text-align:right"></td>
       <td style="white-space:nowrap"><button class="lnk" data-act="pmx-lote-dup" data-i="${i}" title="Criar outra ficha igual logo abaixo">${ic('copiar',13,2.2)} Duplicar</button><span style="color:var(--faint);margin:0 6px">·</span><button class="lnk" data-act="pmx-lote-rm" data-i="${i}" style="color:var(--crit-ink)">Remover</button></td></tr>`; }).join('')}
   </tbody></table></div>
   <button class="lnk" data-act="pmx-lote-add" style="margin-top:6px">+ Linha</button>
   <div class="pmx-acts"><label style="display:flex;align-items:center;gap:8px"><span class="label">DATA DE PRODUÇÃO</span><input class="txt" type="date" data-pl="data" value="${esc(L.data||'')}" style="height:40px;width:auto"></label>
    <span style="flex:1"></span>
    <button class="btn sec" data-act="pmx-lote-ok" ${L.salvando?'disabled':''}>${ic('check',18,2.2)}${L.salvando?'Salvando…':'Salvar '+(ok||'')+' ficha'+(ok===1?'':'s')}</button>
    <button class="btn" data-act="pmx-lote-pdf" ${L.salvando?'disabled':''}>${ic('baixar',18,2)}Salvar e baixar todas (1 PDF)</button></div></section>`; }
function pmxLoteRefresh(avisar){ const L=S.pmx.lote; if(!L) return; let prox=+(pmxNumProv().slice(4)), ok=0;
  L.linhas.forEach((l,i)=>{ const r=pmxRecAchar(l.rec), vale=r&&pmxNum(l.qtd)>0; if(vale) ok++; const c=document.getElementById('pl-n-'+i); if(c) c.textContent=vale?'PMX-'+String(prox++).padStart(4,'0'):'—';
    const e=document.getElementById('pl-e-'+i); if(e&&(avisar||r)) e.style.display=String(l.rec).trim()&&!r?'block':'none'; });
  const b=$('[data-act="pmx-lote-ok"]'); if(b&&!L.salvando) b.lastChild.textContent='Salvar '+(ok||'')+' ficha'+(ok===1?'':'s'); }
async function pmxLoteSalvar(comPdf){ const L=S.pmx.lote; if(!L||L.salvando||!S.db) return;
  const val=L.linhas.filter(l=>String(l.rec).trim()||String(l.qtd).trim()); if(!val.length){ toast('Preencha pelo menos uma linha.'); return; }
  for(const l of val){ if(!pmxRecAchar(l.rec)){ toast('Receita não encontrada: '+l.rec); return; } if(!(pmxNum(l.qtd)>0)){ toast('Informe a quantidade de '+pmxRecAchar(l.rec).nome+'.'); return; } }
  if(!L.data){ toast('Informe a data de produção.'); return; }
  L.salvando=true; render(); const feitas=[]; let prox=+(pmxNumProv().slice(4));
  try{ for(const l of val){ const r=pmxRecAchar(l.rec), agora=new Date().toISOString(), id=pmxId(), numProv='PMX-'+String(prox++).padStart(4,'0');
      const itens=pmxEmG(r.itens).filter(it=>String(it.codigo||'').trim()||String(it.nome||'').trim()||pmxNum(it.qtd)>0).map(it=>({codigo:String(it.codigo||'').trim(),nome:String(it.nome||'').trim(),qtd:pmxNum(it.qtd),un:it.un||'g'}));
      const d={num:'',numProv,material:String(r.nome).trim(),receitaId:r._id,qtd:pmxNum(l.qtd),data:L.data,itens,aponts:[],obs:'',status:'aberta',alteradoEm:agora,alteradoPor:S.uid,criadoEm:agora,por:S.uid};
      d.hist=histAdd({},'Ficha criada com número provisório '+numProv+' (várias de uma vez)');
      await S.db.doc('pmxfichas/'+id).set(d); d._id=id; feitas.push(d); if(!S.pmx.fichas.some(x=>x._id===id)) S.pmx.fichas.push(d); } }
  catch(e){ L.salvando=false; render(); if(feitas.length) toast(feitas.length+' ficha(s) salvas antes do erro. Confira a lista.'); erro(e); return; }
  S.pmx.lote=null; render(); toast(feitas.length+' fichas salvas · '+feitas[0].numProv+(feitas.length>1?' a '+feitas[feitas.length-1].numProv:'')+'.'); if(comPdf) pmxPdfVarias(feitas); }

/* ---------- gravar ---------- */
async function pmxSalvarFicha(comPdf,opt){ opt=opt||{}; const E=S.pmx.ed; if(!E||!S.db) return;
  const ant0=E._id?S.pmx.fichas.find(x=>x._id===E._id):null;
  const num=String(E.num||'').trim()||String((ant0&&ant0.num)||'').trim(), qtd=pmxNum(E.qtd);
  if(!String(E.material||'').trim()||!(qtd>0)||!E.data){ toast('Escolha a receita e informe a quantidade e a data.'); return; }
  const dup=pmxOpDup(num,E._id); if(dup){ toast('A OP '+num+' já está na ficha '+(dup.numProv||pmxOp(dup))+' ('+(dup.material||'')+'). Confira o número.'); return; }
  const numProv=E.numProv||(num?null:pmxNumProv());
  const itens=(E.itens||[]).filter(it=>String(it.codigo||'').trim()||String(it.nome||'').trim()||pmxNum(it.qtd)>0).map(it=>({codigo:String(it.codigo||'').trim(),nome:String(it.nome||'').trim(),qtd:pmxNum(it.qtd),un:it.un||'g'}));
  if(!itens.length){ toast('A ficha precisa de pelo menos uma matéria-prima.'); return; }
  const aponts=(E.aponts||[]).filter(a=>pmxNum(a.qtd)>0||a.hora||a.nome||a.assin).map(a=>({id:a.id||pmxId(),qtd:pmxNum(a.qtd),hora:a.hora||'',turno:a.turno||'',nome:String(a.nome||'').trim(),assin:String(a.assin||'').trim(),em:a.em||new Date().toISOString(),por:a.por||S.uid}));
  const agora=new Date().toISOString(), id=E._id||pmxId(), ant=S.pmx.fichas.find(x=>x._id===id);
  // apontamentos lançados por outra pessoa enquanto a ficha estava aberta aqui entram junto
  if(ant&&Array.isArray(E._apIds)){ const vist=new Set(aponts.map(a=>a.id)); (ant.aponts||[]).forEach(a=>{ if(!E._apIds.includes(a.id)&&!vist.has(a.id)) aponts.push(a); }); }
  const base=ant?Object.assign({},ant):{}; delete base._id;
  const d=Object.assign(base,{num,numProv:numProv||null,material:String(E.material).trim(),receitaId:E.receitaId||null,qtd,data:E.data,itens,aponts,obs:String(E.obs||'').trim(),status:opt.status||(ant?ant.status:E.status)||'aberta',alteradoEm:agora,alteradoPor:S.uid,criadoEm:E.criadoEm||agora,por:E.por||S.uid});
  delete d._apIds;
  if(E.origem) d.origem=E.origem; if(E.rancho) d.rancho=String(E.rancho); if(E.ordemRef) d.ordemRef=String(E.ordemRef);
  d.hist=histAdd(ant||{hist:E.hist},!ant?(num?'Ficha criada · OP '+num:'Ficha criada com número provisório '+numProv):opt.status?(opt.status==='encerrada'?'Ficha encerrada':'Ficha reaberta'):(num&&!String(ant.num||'').trim()?'OP do sistema informada: '+num:'Ficha alterada'));
  try{ await S.db.doc('pmxfichas/'+id).set(d); }catch(e){ erro(e); return; }
  d._id=id; S.pmx.ed=null; S.pmx.edSnap=null; render(); toast(opt.status?(opt.status==='encerrada'?'Ficha encerrada.':'Ficha reaberta.'):num?'Ficha da OP '+num+' salva.':'Ficha '+numProv+' salva. Ela fica na lista para abrir a OP no sistema.'); if(comPdf) pmxPdf(d); }
async function pmxSalvarRec(){ const R=S.pmx.red; if(!R||!S.db) return; const nome=String(R.nome||'').trim();
  const itens=(R.itens||[]).filter(it=>String(it.codigo||'').trim()||String(it.nome||'').trim()||pmxNum(it.qtd)>0).map(it=>({codigo:String(it.codigo||'').trim(),nome:String(it.nome||'').trim(),qtd:pmxNum(it.qtd),un:it.un||'g'}));
  if(!nome||!(pmxNum(R.batelada)>0)){ toast('Informe o nome do premix e a batelada.'); return; }
  if(!itens.length){ toast('Informe pelo menos uma matéria-prima da receita.'); return; }
  const id=R._id||pmxId(), agora=new Date().toISOString();
  try{ await S.db.doc('pmxrec/'+id).set({nome,batelada:pmxNum(R.batelada),itens,ativo:true,criadoEm:R.criadoEm||agora,alteradoEm:agora,por:R.por||S.uid,alteradoPor:S.uid,origem:R.origem||'painel'}); }catch(e){ erro(e); return; }
  S.pmx.red=null; render(); toast('Receita '+nome+' salva.'); }

/* ---------- eventos ---------- */
function pmxAtualizaTotais(){ const E=S.pmx.ed; if(!E) return; const q=pmxNum(E.qtd);
  const tl=document.getElementById('pmx-totlab'); if(tl) tl.textContent=pmxTotLab(E); const pl=document.getElementById('pmx-prodlab'); if(pl) pl.textContent=pmxProdLab(E);
  (E.itens||[]).forEach((it,i)=>{ const c=document.getElementById('pfi-tot-'+i); if(c) c.innerHTML=`<b>${pmxF(q*pmxNum(it.qtd))}</b> ${esc(it.un||'g')}`; });
  const t=document.getElementById('pmx-tots'); if(t) t.innerHTML=pmxTotHtml(pmxTotais(E)); }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.dataset) return; const P=S.pmx;
  if(t.id==='pmx-rbusca'){ P.rbusca=t.value; clearTimeout(P._rbt); P._rbt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#pmx-rbusca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); return; }
  if(t.id==='pmx-busca'){ P.busca=t.value; clearTimeout(P._bt); P._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#pmx-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); return; }
  if(t.dataset.pest&&t.dataset.pest!=='ok'&&P.est){ const x=P.est.l[+t.dataset.i]; if(x) x[t.dataset.pest]=t.value; return; }
  if(t.dataset.pl&&P.lote){ if(t.dataset.pl==='data') P.lote.data=t.value; else { const l=P.lote.linhas[+t.dataset.i]; if(l) l[t.dataset.pl]=t.value; } pmxLoteRefresh(false); return; }
  if(t.dataset.pf&&P.ed){ if(t.dataset.pf!=='receitaId') P.ed[t.dataset.pf]=t.value; if(t.dataset.pf==='qtd') pmxAtualizaTotais(); return; }
  if(t.dataset.pfi==='un'&&P.ed){ const it=P.ed.itens[+t.dataset.i]; if(it) pmxTrocaUn(it,t,'pfi'); pmxAtualizaTotais(); return; }
  if(t.dataset.pfi&&P.ed){ const it=P.ed.itens[+t.dataset.i]; if(!it) return; it[t.dataset.pfi]=t.value;
    pmxAtualizaTotais(); return; }
  if(t.dataset.pa&&P.ed){ const a=P.ed.aponts[+t.dataset.i]; if(a) a[t.dataset.pa]=t.value; if(t.dataset.pa==='qtd') pmxAtualizaTotais(); return; }
  if(t.dataset.pr&&P.red){ P.red[t.dataset.pr]=t.value; return; }
  if(t.dataset.pri==='un'&&P.red){ const it=P.red.itens[+t.dataset.i]; if(it) pmxTrocaUn(it,t,'pri'); return; }
  if(t.dataset.pri&&P.red){ const it=P.red.itens[+t.dataset.i]; if(!it) return; it[t.dataset.pri]=t.value;
    return; } });
function pmxPreencheMp(t,pref,lista){ const it=lista[+t.dataset.i]; if(!it) return; const m=pmxAcharMp(t.value); if(!m) return; it.nome=m.nome; it.un=m.un;
  const tr=t.closest('tr'); const n=tr.querySelector('[data-'+pref+'="nome"]'), u=tr.querySelector('[data-'+pref+'="un"]'); if(n) n.value=m.nome||''; if(u){ if(![...u.options].some(o=>o.value===m.un)) u.add(new Option(m.un,m.un)); u.value=m.un; } pmxAtualizaTotais(); }
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t) return; const P=S.pmx;
  if(t.dataset&&t.dataset.pl&&P.lote){ pmxLoteRefresh(true); return; }
  if(t.dataset&&t.dataset.pfi==='codigo'&&P.ed){ pmxPreencheMp(t,'pfi',P.ed.itens); return; }
  if(t.dataset&&t.dataset.pri==='codigo'&&P.red){ pmxPreencheMp(t,'pri',P.red.itens); return; }
  if(t.dataset&&t.dataset.pfrec&&P.ed){ const v=String(t.value||'').trim().toLowerCase(); const recs=pmxRecAtivas(); const r=recs.find(x=>pmxRecLab(x).toLowerCase()===v)||recs.find(x=>String(x.nome||'').trim().toLowerCase()===v)||(()=>{ const m=recs.filter(x=>pmxRecLab(x).toLowerCase().includes(v)); return v&&m.length===1?m[0]:null; })();
    if(r){ P.ed.receitaId=r._id; P.ed.material=r.nome; P.ed.itens=pmxEmG(r.itens); render(); setTimeout(()=>{ const q=$('#pmx-qtd'); q&&q.focus(); },30); } else if(v) toast('Receita não encontrada. Escolha uma da lista.'); return; }
  if(t.dataset&&t.dataset.pf==='receitaId'&&P.ed){ const r=P.rec.find(x=>x._id===t.value); P.ed.receitaId=t.value; if(r){ P.ed.material=r.nome; P.ed.itens=pmxEmG(r.itens); } render(); return; }
  if(t.dataset&&(t.dataset.pfi==='un'||t.dataset.pri==='un')){ pmxAtualizaTotais(); return; }
  if(t.dataset&&(t.dataset.pfi==='qtd'||t.dataset.pri==='qtd')){ const k=t.dataset.pfi?'pfi':'pri', o=k==='pfi'?P.ed:P.red, it=o&&o.itens[+t.dataset.i]; if(it&&it.un==='Kg'){ const sel=t.closest('tr')&&t.closest('tr').querySelector(`[data-${k}="un"]`); if(sel){ sel.value='Kg'; pmxTrocaUn(it,sel,k); if(k==='pfi') pmxAtualizaTotais(); } } return; }
  if(t.id==='pmx-est-arq'){ const fs=[...(t.files||[])]; t.value=''; if(fs.length) pmxEstLer(fs); return; }
  if(t.dataset&&t.dataset.pest==='ok'&&P.est){ const x=P.est.l[+t.dataset.i]; if(x) x.ok=t.checked; render(); return; }
  if(t.id==='pmx-imp-arq'){ const f=t.files&&t.files[0]; if(!f) return; try{ const j=JSON.parse(await f.text());
      if(!j||!Array.isArray(j.formulacoes)||!Array.isArray(j.fichas)) throw new Error('formato');
      P.imp={dados:{formulacoes:j.formulacoes,fichas:j.fichas,estoqueMovimentos:Array.isArray(j.estoqueMovimentos)?j.estoqueMovimentos:[],materiais:Array.isArray(j.materiais)?j.materiais:[],geradoEm:j.geradoEm||j.atualizadoEm||null}}; }
    catch(e){ P.imp={erro:'Esse arquivo não é o backup do programa Ficha de Produção. No programa, use Backup → Baixar arquivo backup.'}; } render(); } });
document.addEventListener('click',ev=>{ const f=ev.target.closest&&ev.target.closest('[data-pmxap-fundo]'); if(f&&ev.target===f){ S.pmx.ap=null; render(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="pmx-"]'); if(!b||b.disabled) return; const act=b.dataset.act, P=S.pmx;
  if(act==='pmx-abrir'){ if(ev.target.closest('button')) return; if(pmxPodeEd()){ pmxAbrirFicha(b.dataset.id); return; } const f=P.fichas.find(x=>x._id===b.dataset.id); if(f&&!pmxEnc(f)){ const n=new Date(); P.ap={id:f._id,qtd:'',hora:pad(n.getHours())+':'+pad(n.getMinutes()),nome:pmxNomeUser()}; render(); setTimeout(()=>{ const x=document.getElementById('pmx-ap-q'); if(x) x.focus(); },40); } return; }
  if(act==='pmx-editar'){ ev.stopPropagation(); if(pmxSujo()&&!(P.ed&&P.ed._id===b.dataset.id)){ pmxAvisoSujo(); return; } if(!pmxPodeEd()){ toast('Só o login master pode editar a ficha.'); return; } pmxAbrirFicha(b.dataset.id); return; }
  if(act==='pmx-apontar'){ ev.stopPropagation(); const n=new Date(); P.ap={id:b.dataset.id,qtd:'',hora:pad(n.getHours())+':'+pad(n.getMinutes()),nome:pmxNomeUser()}; render(); setTimeout(()=>{ const x=document.getElementById('pmx-ap-q'); if(x) x.focus(); },40); return; }
  if(act==='pmx-ap-x'){ P.ap=null; render(); return; }
  if(act==='pmx-ap-ok'&&P.ap){ const f=P.fichas.find(x=>x._id===P.ap.id); if(!f||!S.db) return; const q=pmxNum(($('#pmx-ap-q')||{}).value), h=String(($('#pmx-ap-h')||{}).value||''), nm=String(($('#pmx-ap-n')||{}).value||'').trim();
    if(!(q>0)){ toast('Informe quantos premix foram produzidos.'); const x=$('#pmx-ap-q'); x&&x.focus(); return; }
    const hh=+(h.split(':')[0]||new Date().getHours()); const turno=hh<12?'Manhã':hh<18?'Tarde':'Noite'; const agora=new Date().toISOString();
    const aponts=[...(f.aponts||[]),{id:pmxId(),qtd:q,hora:h,turno,nome:nm,assin:'',em:agora,por:S.uid}];
    try{ await S.db.doc('pmxfichas/'+f._id).update({aponts,alteradoEm:agora,alteradoPor:S.uid,hist:histAdd(f,'Apontamento: '+pmxF(q)+' premix'+(nm?' · '+nm:''))}); }catch(e){ erro(e); return; }
    f.aponts=aponts; if(P.ed&&P.ed._id===f._id&&!pmxSujo()){ P.ed.aponts=JSON.parse(JSON.stringify(aponts)); P.ed._apIds=aponts.map(a=>a.id); P.edSnap=JSON.stringify(P.ed); } P.ap=null; render(); toast(pmxF(q)+' premix apontado'+(q===1?'':'s')+' na '+pmxOp(f)+'. Total '+pmxF(pmxProd(f))+' de '+pmxF(pmxNum(f.qtd))+'.'); return; }
  if(act==='pmx-nova'){ P.lote=null; pmxNovaFicha(null); return; }
  if(act==='pmx-lote'){ pmxLoteNovo(); window.scrollTo(0,0); return; }
  if(act==='pmx-lote-x'){ P.lote=null; render(); return; }
  if(act==='pmx-lote-add'&&P.lote){ P.lote.linhas.push({rec:'',qtd:''}); render(); const es=document.querySelectorAll('[data-pl="rec"]'); es.length&&es[es.length-1].focus(); return; }
  if(act==='pmx-lote-dup'&&P.lote){ const i=+b.dataset.i, l=P.lote.linhas[i]; if(!l) return; P.lote.linhas.splice(i+1,0,{rec:l.rec,qtd:l.qtd}); render(); const q=document.querySelector('[data-pl="qtd"][data-i="'+(i+1)+'"]'); if(q){ q.focus(); q.select(); } return; }
  if(act==='pmx-lote-rm'&&P.lote){ P.lote.linhas.splice(+b.dataset.i,1); if(!P.lote.linhas.length) P.lote.linhas.push({rec:'',qtd:''}); render(); return; }
  if(act==='pmx-lote-ok'){ pmxLoteSalvar(false); return; }
  if(act==='pmx-lote-pdf'){ pmxLoteSalvar(true); return; }
  if(act==='pmx-fechar'){ P.ed=null; P.edSnap=null; P.conf=null; render(); return; }
  if(act==='pmx-st'){ P.st=b.dataset.v; P.hsAberto=true; render(); return; }
  if(act==='pmx-ir-pend'){ go('pmxfichas'); setTimeout(()=>{ const c=$('#pmx-pend'); c&&c.scrollIntoView({block:'start',behavior:'smooth'}); },60); return; }
  if(act==='pmx-busca-x'){ P.busca=''; render(); const n=$('#pmx-busca'); n&&n.focus(); return; }
  if(act==='pmx-hs-mais'){ P.hsN=(P.hsN||24)+48; P.hsAberto=true; render(); return; }
  if(act==='pmx-op-ok'){ if(!pmxPodeEd()) return; const f=P.fichas.find(x=>x._id===b.dataset.id), i=$('#pmx-op-'+CSS.escape(b.dataset.id)), v=String((i&&i.value)||'').trim(), sis=b.dataset.m==='sis';
    if(!f) return; if(!v){ toast('Escreva o número da OP do sistema.'); i&&i.focus(); return; } const agora=new Date().toISOString();
    const dup=pmxOpDup(v,f._id); if(dup){ toast('A OP '+v+' já está na ficha '+(dup.numProv||pmxOp(dup))+' ('+(dup.material||'')+'). Confira o número.'); i&&i.focus(); return; }
    if(P.ed&&P.ed._id===f._id){ P.ed.num=v; if(sis) P.ed.sis={em:agora,por:S.uid}; P.edSnap=JSON.stringify(P.ed); }
    const u={num:v,opEm:f.opEm||agora,opPor:f.opPor||S.uid,alteradoEm:agora,hist:histAdd(f,(sis?'Apontada no sistema · OP ':'OP do sistema informada: ')+v+(f.numProv?' (nº automático '+f.numProv+')':''))}; if(sis) u.sis={em:agora,por:S.uid};
    try{ await S.db.doc('pmxfichas/'+f._id).update(u); f.num=v; if(sis) f.sis=u.sis; render(); toast(sis?'Ficha '+(f.numProv||v)+' apontada no sistema · OP '+v+'.':'OP '+v+' ligada à ficha '+(f.numProv||'')+'.'); }catch(e){ erro(e); } return; }
  if(act==='pmx-feita'){ ev.stopPropagation(); const f=P.fichas.find(x=>x._id===b.dataset.id); if(!f||!S.db) return; if(P.confF!==f._id){ P.confF=f._id; render(); return; } P.confF=null; const agora=new Date().toISOString();
    try{ await S.db.doc('pmxfichas/'+f._id).update({status:'encerrada',feitaEm:agora,feitaPor:S.uid,alteradoEm:agora,alteradoPor:S.uid,hist:histAdd(f,'Marcada como feita pelo almoxarifado')}); f.status='encerrada'; f.feitaEm=agora; f.feitaPor=S.uid; render(); toast('Ficha '+pmxOp(f)+' marcada como feita. Foi para o PCP apontar no sistema.'); }catch(e){ erro(e); } return; }
  if(act==='pmx-pdf'){ ev.stopPropagation(); const f=P.fichas.find(x=>x._id===b.dataset.id); if(f) pmxPdf(f); return; }
  if(act==='pmx-pfi-add'&&P.ed){ P.ed.itens.push({codigo:'',nome:'',qtd:'',un:'g'}); render(); return; }
  if(act==='pmx-pfi-rm'&&P.ed){ P.ed.itens.splice(+b.dataset.i,1); if(!P.ed.itens.length) P.ed.itens.push({codigo:'',nome:'',qtd:'',un:'g'}); render(); return; }
  if(act==='pmx-pa-add'&&P.ed){ P.ed.aponts=P.ed.aponts||[]; const n=new Date(); P.ed.aponts.push({id:pmxId(),qtd:'',hora:pad(n.getHours())+':'+pad(n.getMinutes()),turno:pmxTurnoAgora(),nome:pmxNomeUser(),assin:''}); render(); return; }
  if(act==='pmx-pa-rm'&&P.ed){ P.ed.aponts.splice(+b.dataset.i,1); render(); return; }
  if(act==='pmx-salvar'){ pmxSalvarFicha(false); return; }
  if(act==='pmx-salvar-pdf'){ pmxSalvarFicha(true); return; }
  if(act==='pmx-encerrar'&&P.ed){ pmxSalvarFicha(false,{status:P.ed.status==='encerrada'?'aberta':'encerrada'}); return; }
  if(act==='pmx-excluir'){ P.conf='excluir'; render(); return; }
  if(act==='pmx-conf-x'){ P.conf=null; render(); return; }
  if(act==='pmx-excluir-ok'&&P.ed&&P.ed._id){ const f=P.fichas.find(x=>x._id===P.ed._id); try{ await S.db.doc('pmxfichas/'+P.ed._id).update({status:'excluida',excluidaEm:new Date().toISOString(),excluidaPor:S.uid,hist:histAdd(f||{},'Ficha excluída')}); P.ed=null; P.edSnap=null; P.conf=null; render(); toast('Ficha excluída. O registro fica guardado no histórico.'); }catch(e){ erro(e); } return; }
  if(act==='pmx-usar-rec'){ pmxNovaFicha(b.dataset.id); return; }
  if(act==='pmx-rec-nova'){ P.red={nome:'',batelada:'500',itens:[{codigo:'',nome:'',qtd:'',un:'g'}]}; P.conf=null; render(); return; }
  if(act==='pmx-rec-ed'){ const r=P.rec.find(x=>x._id===b.dataset.id); if(!r) return; P.red=JSON.parse(JSON.stringify(r)); P.red.itens=pmxEmG(P.red.itens); if(!P.red.itens||!P.red.itens.length) P.red.itens=[{codigo:'',nome:'',qtd:'',un:'g'}]; P.conf=null; render(); window.scrollTo(0,0); return; }
  if(act==='pmx-rec-fechar'){ P.red=null; P.conf=null; render(); return; }
  if(act==='pmx-pri-add'&&P.red){ P.red.itens.push({codigo:'',nome:'',qtd:'',un:'g'}); render(); return; }
  if(act==='pmx-pri-rm'&&P.red){ P.red.itens.splice(+b.dataset.i,1); if(!P.red.itens.length) P.red.itens.push({codigo:'',nome:'',qtd:'',un:'g'}); render(); return; }
  if(act==='pmx-rec-salvar'){ pmxSalvarRec(); return; }
  if(act==='pmx-rec-x'){ P.conf='rec-x'; render(); return; }
  if(act==='pmx-rec-x-ok'&&P.red&&P.red._id){ try{ await S.db.doc('pmxrec/'+P.red._id).update({ativo:false,alteradoEm:new Date().toISOString(),alteradoPor:S.uid}); P.red=null; P.conf=null; render(); toast('Receita desativada. As fichas antigas continuam com ela.'); }catch(e){ erro(e); } return; }
  if(act==='pmx-est-x'){ P.est=null; render(); return; }
  if(act==='pmx-est-ok'){ pmxEstSalvar(); return; }
  if(act==='pmx-imp-abrir'){ P.imp={}; render(); return; }
  if(act==='pmx-imp-x'){ P.imp=null; render(); return; }
  if(act==='pmx-imp-ok'){ pmxImportar(); return; }
  if(act==='pmx-usar'){ P.usar={codigo:b.dataset.v}; render(); const i=$('#pmx-usar-q'); i&&i.focus(); return; }
  if(act==='pmx-usar-x'){ P.usar=null; render(); return; }
  if(act==='pmx-usar-ok'&&P.usar){ const x=pmxSaldo().find(s=>s.codigo===P.usar.codigo); const q=pmxNum(($('#pmx-usar-q')||{}).value);
    if(!x||!(q>0)){ toast('Informe uma quantidade maior que zero.'); return; } if(q>x.saldo+1e-9){ toast('Quantidade maior que o saldo ('+pmxF(x.saldo,2)+' premix).'); return; }
    if(await salvar('pmxbaixas',{codigo:x.codigo,material:x.material,qtd:q,em:new Date().toISOString(),por:S.uid})){ P.usar=null; render(); toast('Baixa de '+pmxF(q,2)+' premix '+x.codigo+' lançada.'); } return; }
});
document.addEventListener('keydown',ev=>{ if(ev.key!=='Enter'||ev.shiftKey) return; const t=ev.target; if(!t||!t.id) return;
  const clica=sel=>{ const b=document.querySelector(sel); if(b&&!b.disabled){ ev.preventDefault(); b.click(); } };
  if(t.id==='pmx-qtd') clica('[data-act="pmx-salvar-pdf"]');
  else if(t.id==='pmx-ap-q'||t.id==='pmx-ap-n'||t.id==='pmx-ap-h') clica('[data-act="pmx-ap-ok"]');
  else if(t.id==='pmx-usar-q') clica('[data-act="pmx-usar-ok"]');
  else if(t.id.startsWith('pmx-op-')) clica('[data-act="pmx-op-ok"][data-id="'+CSS.escape(t.id.slice(7))+'"]'); });
const ALX_LBL2ID={'Almox 3':'a3','Almox 30':'a30','Rejunte':'rej','Separação':'sep','Almox 1':'a1','Almox 2':'a2'};
const ALX_GRUPOS=['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY','FIXCOL','FILMES','MATERIAL EM BAG','PIGMENTOS/ADITIVOS','RESINAS','SACARIAS','ETIQUETAS'];
const ALX_MOTIVOS=['Faturado e não expedido','Transferência pendente','Falta de apontamento da produção','Avaria','Erro de contagem','Erro no sistema (ERP) — saldo ajustado','Outro'];
const ALX_MOT_ERP='Erro no sistema (ERP) — saldo ajustado', ALX_MOT_REC='Erro de contagem — material recontado';
const ALX_ST={nao:{t:'Não auditado',c:'neu'},val:{t:'Saldo validado',c:'ok'},inv:{t:'Em investigação',c:'crit'},res:{t:'Investigação resolvida',c:'prod'}};
S.alx={conferencias:[],auditorias:[],recebimentos:[],fila:[],
  modo:'sel',sel:[],loc:'todos',grupo:'',busca:'',cnt:{},undo:{},ini:null,pbusca:'',salvando:false,salvo:null,voltar:false,rasc:false,
  h:{busca:'',loc:'',per:'30',rasg:'',ab:null},
  r:{busca:'',per:'30',fil:'todos',ab:null,cod:null,q:'',qtd:'',dia:'',obs:'',salvando:false},
  a:{sit:'todos',busca:'',loc:'',conf:'',confer:'',grupo:'',ord:'situacao',agr:false,selec:[],ficha:null,tl:{},vs:null,modo:null,log:false,salvando:false}};

// ---------- cadastro, unidades, locais ----------
function alxLocsIt(it){ return (it&&it.almox&&it.almox.locais)||[]; }
function alxItensTodos(){ return S.itens.filter(i=>i.ativo!==false&&alxLocsIt(i).length); }
function alxPermLocs(){ const p=acsP(); return p?p.locais:[]; }
function alxItensPerm(loc){ const L=alxPermLocs(); return alxItensTodos().filter(i=>{ const ls=alxLocsIt(i); if(loc&&loc!=='todos') return ls.includes(loc)&&L.includes(loc); return ls.some(l=>L.includes(l)); }).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))); }
function alxSlots(it,loc){ const L=alxPermLocs(), ls=alxLocsIt(it); const ok=x=>L.includes(x)&&ls.includes(x); const out=[];
  if(loc&&loc!=='todos'){ if(ok(loc)) out.push({s:(loc==='a30'||loc==='a2')?'30':'3',id:loc}); return out; }
  const c3=['rej','sep','a1','a3'].find(ok); if(c3) out.push({s:'3',id:c3});
  const c30=['a2','a30'].find(ok); if(c30) out.push({s:'30',id:c30}); return out; }
function alxPP(it){ if(it&&+it.palete>0) return +it.palete; const pp=(S.cfg.paleteProd||{})[it&&it.codigo]; if(+pp>0) return +pp; const pl=S.cfg.paletes||{}; const l=((it&&it.linhas)||[]).find(x=>+pl[x]>0); return l?+pl[l]:88; }
function alxUn(it){ const a=(it&&it.almox)||{}; const conv=+a.conv||0;
  if(a.un&&!(conv>1)){ const u=String(a.un).toLowerCase(); return {a:u,p:u,pal:false,pp:0,conv:null}; }
  const k=it&&it.unidade&&UNID[it.unidade]?it.unidade:(alxLocsIt(it).includes('rej')?'FD':'SC');
  const pal=(it&&+it.palete>0)||k==='SC';
  return {a:UNID[k].a,p:UNID[k].p,pal,pp:pal?alxPP(it):0,conv:conv>1&&a.un?{f:conv,u:String(a.un).toLowerCase()}:null}; }
const alxN = n => (Math.round((+n||0)*100)/100).toLocaleString('pt-BR');
function alxQ(it,q,un){ const u=un||alxUn(it); let s=alxN(q)+' '+u.a; if(u.conv) s+=' → '+alxN(q*u.conv.f)+' '+u.conv.u; return s; }
function alxLbl3(cod){ const ls=alxLocsIt(itemDe(cod)); const k=['rej','sep','a1','a3'].find(x=>ls.includes(x)); return k?ALX_LOC[k]:null; }
function alxLbl30(cod){ const ls=alxLocsIt(itemDe(cod)); const k=['a2','a30'].find(x=>ls.includes(x)); return k?ALX_LOC[k]:null; }
function alxFocco(cod){ const B=S.anl&&S.anl.base&&S.anl.base.itens; const x=B&&B.l&&B.l[cod]; if(!x) return null; return {a3:+x.a3||0,a30:+x.a30||0,em:(B.atual||{}).SALDO||B.em||''}; }
function alxFisico3(loc){ return loc==='a3'||loc==='rej'||loc==='sep'; }
function alxKey(num,cod,loc){ return num+'_'+cod+'_'+loc; }
function alxQuem(uid,nome){ return uid?nomeDe(uid):(nome||'—'); }
function alxDH(iso){ if(!iso) return '—'; const d=new Date(iso); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+hora(iso); }
function alxD(iso){ if(!iso) return '—'; const d=new Date(iso); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2); }
function alxPer(per){ const h=ini0(new Date()).getTime(); const d={hoje:1,'7':7,'30':30,'90':90}[per]; return d?h-(d-1)*864e5:0; }
function alxSegPer(prefix,v){ return `<div class="seg">${[['hoje','Hoje'],['7','7 dias'],['30','30 dias'],['90','90 dias'],['todos','Tudo']].map(([k,t])=>`<button data-act="${prefix}" data-v="${k}" aria-pressed="${v===k}">${t}</button>`).join('')}</div>`; }

// ---------- conferências salvas: linhas auditáveis, auditorias, fila ----------
function alxLinhas(c){ const out=[]; Object.entries(c.itens||{}).forEach(([cod,it])=>{ const z=!!it.confirmadoZero, sl=it.slots;
  const t3=(!sl||sl.includes('3'))&&((+it.almox3||0)>0||z), t30=(!sl||sl.includes('30'))&&((+it.almox30||0)>0||z);
  if(t3){ const l=it.l3||alxLbl3(cod); if(l&&ALX_LBL2ID[l]) out.push({cod,nome:it.nome||'',lbl:l,loc:ALX_LBL2ID[l],fis:+it.almox3||0}); }
  if(t30){ const l=it.l30||alxLbl30(cod); if(l&&ALX_LBL2ID[l]) out.push({cod,nome:it.nome||'',lbl:l,loc:ALX_LBL2ID[l],fis:+it.almox30||0}); } }); return out; }
function alxVeLoc(loc){ const p=acsP(); return !!p&&(p.tudo||p.locais.includes(loc)); }
function alxLinhasVis(c){ return alxLinhas(c).filter(l=>alxVeLoc(l.loc)); }
function alxAudMapa(){ const X=S.alx; if(X._am&&X._am.n===X.auditorias) return X._am.m; const m={}; X.auditorias.forEach(a=>{ if(!a.excluida) m[a._id]=a; }); X._am={n:X.auditorias,m}; return m; }
function alxAudSt(key){ const a=alxAudMapa()[key]; if(!a) return 'nao'; if(a.resultado==='Validado') return 'val'; if(a.investigacao&&a.investigacao.status==='Resolvido') return 'res'; return 'inv'; }
function alxStPill(st){ const m=ALX_ST[st]||ALX_ST.nao; return `<span class="pill ${m.c}">${m.t}</span>`; }
function alxFilaEst(key){ const f=S.alx.fila.find(x=>x._id===key); return f?f.estado:null; }
function alxResumoConf(c){ const ls=alxLinhasVis(c); let v=0,p=0,i=0,r=0; ls.forEach(l=>{ const st=alxAudSt(alxKey(c.numero,l.cod,l.loc)); if(st==='val') v++; else if(st==='inv') i++; else if(st==='res') r++; else p++; });
  const t=ls.length; return {t,v,p,i,r,pct:t?Math.round((v+r)/t*100):0,ok:t>0&&p===0&&i===0}; }
function alxPend(){ const X=S.alx; const k=[X.conferencias,X.auditorias,X.fila,S.acs.doc]; if(X._pd&&X._pd.k.every((v,i)=>v===k[i])) return X._pd.m;
  const ontem=ini0(new Date()).getTime()-864e5; const m={};
  X.conferencias.forEach(c=>{ if(!c.em||new Date(c.em).getTime()<ontem) return;
    alxLinhasVis(c).forEach(l=>{ const key=alxKey(c.numero,l.cod,l.loc); if(alxAudMapa()[key]) return; if(alxFilaEst(key)==='descartada') return;
      (m[l.cod]=m[l.cod]||[]).push({key,num:c.numero,loc:l.loc,lbl:l.lbl,nome:l.nome,quem:alxQuem(c.por,c.porNome),fis:l.fis,em:c.em}); }); });
  Object.values(m).forEach(a=>a.sort((x,y)=>String(y.em).localeCompare(String(x.em)))); X._pd={k,m}; return m; }
function alxConfVisivel(c){ const p=acsP(); if(!p) return false; if(p.tudo||p.locais.length===ALX_LOCS.length) return true; if(c.por&&c.por===S.uid) return true; return alxLinhasVis(c).length>0; }
async function alxResolverNomes(){ if(!S.user) return; const ids=new Set(); const X=S.alx;
  X.conferencias.forEach(c=>{ if(c.por) ids.add(c.por); Object.values(c.itens||{}).forEach(it=>{ if(it.rasgoPor) ids.add(it.rasgoPor); }); });
  X.auditorias.forEach(a=>{ if(a.por) ids.add(a.por); if(a.investigacao&&a.investigacao.resolvidoPor) ids.add(a.investigacao.resolvidoPor); if(a.excluida&&a.excluida.por) ids.add(a.excluida.por); });
  X.recebimentos.forEach(r=>{ if(r.por) ids.add(r.por); if(r.apontadoPor) ids.add(r.apontadoPor); }); X.fila.forEach(f=>{ if(f.por) ids.add(f.por); });
  const falta=[...ids].filter(i=>!(i in S.nomes)); if(!falta.length) return;
  try{ const ps=await S.user.profiles(falta); falta.forEach(i=>{ S.nomes[i]=(ps&&ps[i]&&ps[i].name)||''; }); rerenderSeguro(); }catch(e){} }
function alxAssinar(db){ const q=(col,key,mk)=>inscrever(col,mk,snap=>{ S.alx[key]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&typeof x==='object'); alxResolverNomes(); rerenderSeguro(); });
  q('conferencias','conferencias',()=>db.collection('conferencias').orderBy('em','desc').limit(800));
  q('auditorias','auditorias',()=>db.collection('auditorias').orderBy('em','desc').limit(1000));
  q('recebimentos','recebimentos',()=>db.collection('recebimentos').orderBy('em','desc').limit(600));
  q('alxfila','fila',()=>db.collection('alxfila').limit(500)); }
function alxView(v){ if(!acsP()) return ''; return (v==='alxcont'?vAlxCont():v==='alxconf'?vAlxConf():v==='alxrec'?vAlxRec():v==='alxaud'?vAlxAud():'')+((v==='alxconf'||v==='alxaud')&&S.alx.a.vs?alxVsModal():''); }
function alxHead(t,sub,extra){ return `${banner()}<div class="head"><div><div class="eyebrow">INVENTÁRIO</div><h1>${t}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>${extra||''}</div>`; }

// ================= 1. CONTAGEM =================
function alxRascKey(){ return 'alx_rascunho_'+(S.uid||'x'); }
function alxRascSalvar(){ const X=S.alx; try{ if(X.modo==='cont'&&X.sel.length) localStorage.setItem(alxRascKey(),JSON.stringify({sel:X.sel,cnt:X.cnt,loc:X.loc,ini:X.ini})); else localStorage.removeItem(alxRascKey()); }catch(e){} }
function alxRascCarregar(){ const X=S.alx; if(X.rasc) return; X.rasc=true; try{ const r=JSON.parse(localStorage.getItem(alxRascKey())||'null'); if(r&&r.sel&&r.sel.length){ X.sel=r.sel; X.cnt=r.cnt||{}; X.loc=r.loc||'todos'; X.ini=r.ini||new Date().toISOString(); X.modo='cont'; toast('Contagem não salva recuperada.'); } }catch(e){} }
function alxUltimas(){ const X=S.alx; if(X._ul&&X._ul.n===X.conferencias) return X._ul.m; const m={};
  X.conferencias.forEach(c=>{ Object.keys(c.itens||{}).forEach(cod=>{ if(!m[cod]||String(c.em)>String(m[cod].em)) m[cod]={em:c.em,quem:alxQuem(c.por,c.porNome)}; }); }); X._ul={n:X.conferencias,m}; return m; }
function alxGruposDe(its){ const s=new Set(); its.forEach(i=>((i.almox||{}).grupos||[]).forEach(g=>s.add(g))); return [...ALX_GRUPOS.filter(g=>s.has(g)),...[...s].filter(g=>!ALX_GRUPOS.includes(g)).sort()]; }
function alxListaSel(){ const X=S.alx; let xs=alxItensPerm(X.loc); if(X.grupo) xs=xs.filter(i=>((i.almox||{}).grupos||[]).includes(X.grupo));
  const q=X.busca.trim().toLowerCase(); if(q) xs=xs.filter(i=>String(i.codigo).toLowerCase().includes(q)||String(i.descricao||'').toLowerCase().includes(q)); return xs; }
function vAlxCont(){ const X=S.alx, P=acsP(); alxRascCarregar();
  const locs=ALX_LOCS.filter(l=>P.locais.includes(l)); if(locs.length===1) X.loc=locs[0]; else if(X.loc!=='todos'&&!locs.includes(X.loc)) X.loc='todos';
  if(X.salvo){ const c=X.conferencias.find(x=>x.numero===X.salvo)||X._ultSalva;
    return alxHead('Contagem salva')+`<section class="card acs-gate" style="margin-top:0"><div class="acs-ic" style="background:var(--ok-tint);color:var(--ok-ink)">${ic('check',28,2.2)}</div><h2>Conferência ${esc(X.salvo)}</h2><div class="sub">${c?Object.keys(c.itens||{}).length+' item(ns) · '+alxDH(c.em):''}</div>
     <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px"><button class="btn" data-act="alx-pdf" data-n="${esc(X.salvo)}">${ic('baixar',18,2)}Baixar PDF</button><button class="btn sec" data-act="alx-nova">Nova contagem</button><button class="btn sec" data-go="alxconf">Ver conferências</button></div></section>`; }
  if(X.modo==='cont') return vAlxContagem();
  const todos=alxItensPerm(X.loc), xs=alxListaSel(), ult=alxUltimas(), grupos=alxGruposDe(todos), sel=new Set(X.sel);
  return alxHead('Contagem','Escolha os itens que vai contar e toque em <b>Começar contagem</b>. A contagem fica guardada neste aparelho até você salvar.')+`
  <section class="card ofil">
   ${locs.length>1?`<div class="frow"><div class="flab">LOCAL</div><div class="fline"><div class="seg">${[['todos','Todos'],...locs.map(l=>[l,ALX_LOC[l]])].map(([k,t])=>`<button data-act="alx-loc" data-v="${k}" aria-pressed="${X.loc===k}">${t} <small>${alxItensPerm(k).length}</small></button>`).join('')}</div></div></div>`:`<div class="frow"><div class="flab">LOCAL</div><div class="fline"><span class="pill prod">${ALX_LOC[locs[0]]||'—'}</span></div></div>`}
   ${grupos.length?`<div class="frow"><div class="flab">FILTRO</div><div class="fline"><div class="chips">${grupos.map(g=>`<button class="chip" data-act="alx-grupo" data-v="${esc(g)}" aria-pressed="${X.grupo===g}">${esc(g)}</button>`).join('')}</div></div></div>`:''}
   <div class="frow"><div class="flab">BUSCA</div><div class="fline"><div class="srch" style="margin:0;max-width:none"><input class="txt" style="padding-left:12px" id="alx-busca" type="search" placeholder="Código ou descrição" value="${esc(X.busca)}" autocomplete="off"></div>
    <button class="btn sec" data-act="alx-ciclo" style="height:40px" title="Marca os itens desta lista há mais tempo sem contagem. Contando assim todo dia, a lista inteira é contada em cerca de um mês.">Contagem do dia (${alxCicloN(xs.length)})</button><button class="btn sec" data-act="alx-todos" style="height:40px">Marcar os ${xs.length} da lista</button>${X.sel.length?`<button class="lnk" data-act="alx-limpar">Limpar seleção</button>`:''}</div></div>
  </section>
  <section class="card" style="padding:6px 18px 10px">
   ${xs.length?xs.map(i=>{ const on=sel.has(i.codigo), u=ult[i.codigo], un=alxUn(i);
     return `<div class="alx-sel ${on?'on':''}" data-act="alx-tog" data-c="${esc(i.codigo)}" role="checkbox" aria-checked="${on}" tabindex="0"><span class="alx-cb">${on?ic('check',16,3):''}</span>
      <span style="min-width:0"><b class="num">${esc(i.codigo)}</b> <span class="alx-desc">${esc(i.descricao||'')}</span>
       <small>${alxLocsIt(i).filter(l=>P.locais.includes(l)).map(l=>ALX_LOC[l]).join(' · ')} · ${un.pal?'paletes de '+un.pp+' '+un.a:esc(un.p)}${u?' · última contagem '+alxD(u.em)+' – '+esc(u.quem):' · sem contagem'}</small></span></div>`; }).join('')
     :`<div class="empty">${alxItensTodos().length?'Nenhum item para este filtro.':'Nenhum item tem almoxarifado marcado no cadastro. Marque em Ajustes → Itens.'}</div>`}
  </section>
  <div class="savebar"><span><b class="num">${X.sel.length}</b> ${X.sel.length===1?'item selecionado':'itens selecionados'}</span><button class="btn big" data-act="alx-comecar" ${X.sel.length?'':'disabled'}>Começar contagem ${ic('seta',18,2.2)}</button></div>`; }
function alxCntDe(cod){ return S.alx.cnt[cod]||(S.alx.cnt[cod]={}); }
function alxTot(cod,s){ const it=itemDe(cod), u=alxUn(it), c=S.alx.cnt[cod]||{}; const pal=u.pal?(+c['pal'+s]||0):0; return pal*u.pp+(+c['sac'+s]||0); }
function alxPreenchido(cod){ const c=S.alx.cnt[cod]||{}; return ['pal3','sac3','pal30','sac30','rasg'].some(k=>(+c[k]||0)>0)||!!c.zero; }
function vAlxContagem(){ const X=S.alx; const q=X.pbusca.trim().toLowerCase();
  const its=X.sel.map(c=>itemDe(c)).filter(Boolean); const vis=its.filter(i=>!q||String(i.codigo).toLowerCase().includes(q)||String(i.descricao||'').toLowerCase().includes(q));
  const n=its.filter(i=>alxPreenchido(i.codigo)).length;
  return alxHead('Contagem',`${X.loc==='todos'?'Todos os locais':ALX_LOC[X.loc]} · começou ${X.ini?hora(X.ini):''} · ${esc(S.nomes[S.uid]||'')}`,
    X.voltar?`<div class="pvact"><span class="sub" style="margin:0">Descartar a contagem?</span><button class="btn warn" data-act="alx-voltar-ok" style="height:40px">Sim, descartar</button><button class="btn sec" data-act="alx-voltar-nao" style="height:40px">Não</button></div>`:`<button class="btn sec" data-act="alx-voltar">← Voltar à seleção</button>`)+`
  ${its.length>6?`<div class="srch" style="margin:0;max-width:420px;flex:none;width:100%"><input class="txt" style="padding-left:12px" id="alx-pbusca" type="search" placeholder="Procurar na contagem" value="${esc(X.pbusca)}" autocomplete="off"></div>`:''}
  <div class="alx-grid">${vis.map(alxCard).join('')||'<div class="empty">Nenhum item.</div>'}</div>
  <div class="savebar"><span><b class="num" id="alx-npre">${n}</b> de ${its.length} preenchidos</span><button class="btn big" data-act="alx-salvar" ${X.salvando?'disabled':''}>${ic('check',20,2.2)}${X.salvando?'Salvando…':'Salvar conferência'}</button></div>`; }
function alxCard(it){ const X=S.alx, cod=it.codigo, c=X.cnt[cod]||{}, u=alxUn(it), sl=alxSlots(it,X.loc); const rg=+c.rasg||0;
  const campo=(k,lab)=>`<label>${lab}<input class="q num" inputmode="numeric" data-alx-q="${esc(cod)}" data-k="${k}" id="alx-${k}-${esc(cod)}" value="${c[k]!=null&&c[k]!==''?esc(c[k]):''}" placeholder="0" autocomplete="off">
    <span class="alx-add"><input inputmode="numeric" data-alx-add="${esc(cod)}" data-k="${k}" placeholder="+ somar" aria-label="Somar ao campo"><button type="button" data-act="alx-somar" data-c="${esc(cod)}" data-k="${k}" title="Somar">+</button><button type="button" class="u" data-act="alx-desf" data-c="${esc(cod)}" data-k="${k}" title="Desfazer a última soma" ${X.undo[cod+'|'+k]!=null?'':'disabled'}>↩</button></span></label>`;
  return `<article class="card alx-card ${rg>0?'rasg':''}" id="alx-card-${esc(cod)}">
   <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0"><b class="num" style="font-size:15px">${esc(cod)}</b><div class="alx-desc" style="font-size:13px;color:var(--ink-2)">${esc(it.descricao||'')}</div>
     <div class="chips" style="gap:4px;margin-top:6px"><span class="tag">${u.pal?'1 palete = '+u.pp+' '+u.a:'contar em '+esc(u.p)}</span>${u.conv?`<span class="tag">1 ${esc(u.a)} = ${alxN(u.conv.f)} ${esc(u.conv.u)}</span>`:''}</div></div>
    <button class="btn sec" data-act="alx-tirar" data-c="${esc(cod)}" aria-label="Tirar ${esc(cod)} da contagem" style="height:34px;width:34px;padding:0;flex-shrink:0">✕</button></div>
   ${sl.map(s=>`<div class="alx-blk"><h3>CONTAGEM FÍSICA — ${ALX_LOC[s.id].toUpperCase()}</h3><div class="alx-in ${u.pal?'':'um'}">${u.pal?campo('pal'+s.s,'Paletes'):''}${campo('sac'+s.s,u.pal?(UNID.SC.a===u.a?'Sacos avulsos':u.p[0].toUpperCase()+u.p.slice(1)+' avulsos'):u.p[0].toUpperCase()+u.p.slice(1))}</div>
     <div class="alx-tot"><span>Total ${ALX_LOC[s.id]}</span><b class="num" id="alx-t${s.s}-${esc(cod)}">${alxQ(it,alxTot(cod,s.s),u)}</b></div></div>`).join('')||'<div class="sub">Você não tem permissão para nenhum local deste item.</div>'}
   <div class="alx-rasg"><label>Qtd. rasgada<input class="txt num" inputmode="numeric" data-alx-q="${esc(cod)}" data-k="rasg" value="${rg||''}" placeholder="0" style="height:40px;width:110px;text-align:center"></label><span class="sub" style="margin:0;font-size:12px">fica separada: não desconta da contagem</span></div>
   <div id="alx-mot-${esc(cod)}" ${rg>0?'':'hidden'}><input class="txt" data-alx-q="${esc(cod)}" data-k="mot" value="${esc(c.mot||'')}" placeholder="Motivo / avaria (opcional)"></div>
   <label class="ck" style="font-size:13px;color:var(--ink-2)"><input type="checkbox" data-alx-zero="${esc(cod)}" ${c.zero?'checked':''}>Contei e não tem nenhuma unidade deste item (contagem zero)</label>
  </article>`; }
function alxAtualizaCard(cod){ const it=itemDe(cod); if(!it) return; const u=alxUn(it); ['3','30'].forEach(s=>{ const e=document.getElementById('alx-t'+s+'-'+cod); if(e) e.textContent=alxQ(it,alxTot(cod,s),u); });
  const c=S.alx.cnt[cod]||{}; const card=document.getElementById('alx-card-'+cod); if(card) card.classList.toggle('rasg',(+c.rasg||0)>0); const m=document.getElementById('alx-mot-'+cod); if(m) m.hidden=!((+c.rasg||0)>0);
  const np=$('#alx-npre'); if(np) np.textContent=S.alx.sel.filter(alxPreenchido).length;
  ['pal3','sac3','pal30','sac30'].forEach(k=>{ const b=document.querySelector(`[data-act="alx-desf"][data-c="${CSS.escape(cod)}"][data-k="${k}"]`); if(b) b.disabled=S.alx.undo[cod+'|'+k]==null; }); }
async function alxSalvarConf(){ const X=S.alx, P=acsP(); if(!P||!P.contar){ toast('Você não tem permissão para lançar contagem.'); return; } if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
  const agora=new Date(), num='CONF-'+agora.getTime()+'-'+Math.floor(Math.random()*1000);
  const reg={numero:num,em:agora.toISOString(),dia:hojeStr(agora),por:S.uid||null,local:X.loc==='todos'?'Todos':ALX_LOC[X.loc],inicio:X.ini||null,itens:{},origem:'painel'};
  X.sel.forEach(cod=>{ const it=itemDe(cod); if(!it||!alxPreenchido(cod)) return; const c=X.cnt[cod]||{}, u=alxUn(it), sl=alxSlots(it,X.loc); const s3=sl.find(s=>s.s==='3'), s30=sl.find(s=>s.s==='30'); const fc=alxFocco(cod)||{};
    const v=k=>Math.max(0,parseInt(c[k],10)||0); const a3=s3?(u.pal?v('pal3')*u.pp:0)+v('sac3'):0, a30=s30?(u.pal?v('pal30')*u.pp:0)+v('sac30'):0; const rg=v('rasg');
    if(!(a3>0||a30>0||rg>0||c.zero)) return;
    reg.itens[cod]={nome:it.descricao||'',slots:sl.map(s=>s.s),l3:s3?ALX_LOC[s3.id]:null,l30:s30?ALX_LOC[s30.id]:null,un:u.a,pp:u.pp||null,
      pal3:s3&&u.pal?v('pal3'):0,sac3:s3?v('sac3'):0,almox3:a3,pal30:s30&&u.pal?v('pal30'):0,sac30:s30?v('sac30'):0,almox30:a30,total:a3+a30,
      saldoSistema3:fc.a3!=null?fc.a3:null,saldoSistema30:fc.a30!=null?fc.a30:null,
      qtdRasgada:rg,motivoRasgo:rg?String(c.mot||'').trim():'',rasgoPor:rg?(S.uid||null):null,confirmadoZero:!!c.zero}; });
  const n=Object.keys(reg.itens).length; if(!n){ toast('Preencha pelo menos um item antes de salvar.'); return; }
  X.salvando=true; render();
  try{ await S.db.doc('conferencias/'+num).set(reg); X._ultSalva=reg; X.salvo=num; X.modo='sel'; X.sel=[]; X.cnt={}; X.undo={}; X.pbusca=''; X.voltar=false; alxRascSalvar(); toast('Conferência salva com '+n+' item(ns).'); }
  catch(e){ erro(e); } X.salvando=false; render(); window.scrollTo(0,0); }
document.addEventListener('input',ev=>{ const t=ev.target; const X=S.alx;
  if(t.dataset&&t.dataset.alxQ){ const cod=t.dataset.alxQ, k=t.dataset.k; const c=alxCntDe(cod); c[k]=k==='mot'?t.value:t.value.replace(/[^0-9]/g,''); if(k!=='mot'&&t.value!==c[k]) t.value=c[k]; delete X.undo[cod+'|'+k]; alxAtualizaCard(cod); alxRascSalvar(); return; }
  if(t.id==='alx-busca'||t.id==='alx-pbusca'){ X[t.id==='alx-busca'?'busca':'pbusca']=t.value; clearTimeout(X._bt); X._bt=setTimeout(()=>{ const p=t.selectionStart, id=t.id; render(); const i=document.getElementById(id); if(i){ i.focus(); try{ i.setSelectionRange(p,p); }catch(e){} } },250); return; }
});
document.addEventListener('keydown',ev=>{ const t=ev.target; if(ev.key==='Enter'&&t.dataset&&t.dataset.alxAdd){ ev.preventDefault(); const b=t.parentElement.querySelector('[data-act="alx-somar"]'); if(b) b.click(); }
  if((ev.key==='Enter'||ev.key===' ')&&t.classList&&t.classList.contains('alx-sel')){ ev.preventDefault(); t.click(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.alxZero){ alxCntDe(t.dataset.alxZero).zero=t.checked; alxAtualizaCard(t.dataset.alxZero); alxRascSalvar(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="alx-"]'); if(!b||b.disabled) return; const X=S.alx, act=b.dataset.act;
  if(act==='alx-loc'){ X.loc=b.dataset.v; X.grupo=''; render(); return; }
  if(act==='alx-grupo'){ const g=b.dataset.v; const doGrupo=gg=>alxItensPerm(X.loc).filter(i=>((i.almox||{}).grupos||[]).includes(gg)).map(i=>i.codigo);
    if(X.grupo) { const tira=new Set(doGrupo(X.grupo)); X.sel=X.sel.filter(c=>!tira.has(c)); }
    if(X.grupo===g) X.grupo=''; else { X.grupo=g; X.sel=[...new Set([...X.sel,...doGrupo(g)])]; } render(); return; }
  if(act==='alx-tog'){ const c=b.dataset.c; X.sel=X.sel.includes(c)?X.sel.filter(x=>x!==c):[...X.sel,c]; render(); return; }
  if(act==='alx-todos'){ X.sel=[...new Set([...X.sel,...alxListaSel().map(i=>i.codigo)])]; render(); return; }
  if(act==='alx-limpar'){ X.sel=[]; X.grupo=''; render(); return; }
  if(act==='alx-comecar'){ if(!X.sel.length) return; X.modo='cont'; X.ini=new Date().toISOString(); X.pbusca=''; X.voltar=false; alxRascSalvar(); render(); window.scrollTo(0,0); return; }
  if(act==='alx-voltar'){ if(!X.sel.some(alxPreenchido)){ X.modo='sel'; X.cnt={}; X.undo={}; alxRascSalvar(); render(); return; } X.voltar=true; render(); return; }
  if(act==='alx-voltar-nao'){ X.voltar=false; render(); return; }
  if(act==='alx-voltar-ok'){ X.voltar=false; X.modo='sel'; X.cnt={}; X.undo={}; alxRascSalvar(); render(); return; }
  if(act==='alx-tirar'){ const c=b.dataset.c; X.sel=X.sel.filter(x=>x!==c); delete X.cnt[c]; if(!X.sel.length){ X.modo='sel'; } alxRascSalvar(); render(); return; }
  if(act==='alx-somar'){ const cod=b.dataset.c, k=b.dataset.k; const inp=document.querySelector(`[data-alx-add="${CSS.escape(cod)}"][data-k="${k}"]`); const add=parseInt(inp&&inp.value,10)||0; if(add<=0){ inp&&inp.focus(); return; }
    const c=alxCntDe(cod), antes=parseInt(c[k],10)||0; c[k]=String(antes+add); X.undo[cod+'|'+k]=antes; inp.value=''; const m=document.getElementById('alx-'+k+'-'+cod); if(m) m.value=c[k]; alxAtualizaCard(cod); alxRascSalvar(); inp.focus(); return; }
  if(act==='alx-desf'){ const cod=b.dataset.c, k=b.dataset.k, key=cod+'|'+k; if(X.undo[key]==null) return; const c=alxCntDe(cod); c[k]=X.undo[key]?String(X.undo[key]):''; delete X.undo[key]; const m=document.getElementById('alx-'+k+'-'+cod); if(m) m.value=c[k]; alxAtualizaCard(cod); alxRascSalvar(); return; }
  if(act==='alx-salvar'){ alxSalvarConf(); return; }
  if(act==='alx-nova'){ X.salvo=null; render(); return; }
  if(act==='alx-pdf'){ alxPdf(b.dataset.n); return; }
});

// ---------- PDF da conferência ----------
async function alxPdf(num){ const c=S.alx.conferencias.find(x=>x.numero===num)||(S.alx._ultSalva&&S.alx._ultSalva.numero===num?S.alx._ultSalva:null); if(!c){ toast('Conferência não encontrada.'); return; }
  if(!window.jspdf){ toast('Não foi possível carregar o gerador de PDF. Recarregue a página.'); return; }
  const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  const pdf=new window.jspdf.jsPDF('p','mm','a4'); const W=210, ML=12, MR=12; let y=14;
  const logo=(document.querySelector('.brand img')||{}).src||''; try{ if(logo) pdf.addImage(logo,'PNG',ML,y-4,40,10.7); }catch(e){}
  pdf.setFont('helvetica','bold'); pdf.setFontSize(15); pdf.text('Conferência de estoque',W-MR,y+2,{align:'right'}); pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.text(c.numero,W-MR,y+7,{align:'right'}); y+=16;
  pdf.setDrawColor(200); pdf.line(ML,y,W-MR,y); y+=6; pdf.setFontSize(10);
  const rg=Object.values(c.itens||{}).reduce((a,it)=>a+(+it.qtdRasgada||0),0);
  [['Data',alxDH(c.em)],['Local',c.local||'—'],['Conferente',alxQuem(c.por,c.porNome)],['Itens',String(Object.keys(c.itens||{}).length)+(rg?'   ·   Rasgados: '+rg:'')]].forEach(([k,v],i)=>{ const x=ML+(i%2)*95, yy=y+Math.floor(i/2)*6; pdf.setFont('helvetica','bold'); pdf.text(k+':',x,yy); pdf.setFont('helvetica','normal'); pdf.text(String(v),x+24,yy); }); y+=16;
  const cols=[['Código / item',70],['Local',26],['Paletes',18],['Avulsos',20],['Total',26],['Rasgado',26]]; const head=()=>{ pdf.setFillColor(27,92,122); pdf.rect(ML,y-4.5,W-ML-MR,7,'F'); pdf.setTextColor(255); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); let x=ML+2; cols.forEach(([t,w])=>{ pdf.text(t,x,y); x+=w; }); pdf.setTextColor(20); pdf.setFont('helvetica','normal'); y+=6; }; head();
  Object.entries(c.itens||{}).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([cod,it])=>{ const lin=[]; const sl=it.slots;
    if((!sl||sl.includes('3'))&&((+it.almox3||0)>0||it.confirmadoZero||(!sl&&!(+it.almox30>0)))) lin.push([it.l3||alxLbl3(cod)||'Almox 3',it.pal3||0,it.sac3||0,it.almox3||0]);
    if((!sl||sl.includes('30'))&&((+it.almox30||0)>0||(it.confirmadoZero&&sl&&sl.includes('30')))) lin.push([it.l30||alxLbl30(cod)||'Almox 30',it.pal30||0,it.sac30||0,it.almox30||0]);
    if(!lin.length) lin.push(['—',0,0,0]);
    const nome=pdf.splitTextToSize(String(it.nome||''),66).slice(0,2); const h=Math.max(lin.length*5.5,4+nome.length*3.6)+2.5; if(y+h>285){ pdf.addPage(); y=16; head(); }
    pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.text(cod,ML+2,y); pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.text(nome,ML+2,y+3.6); pdf.setFontSize(8.5);
    lin.forEach((l,i)=>{ let x=ML+2+70; const yy=y+i*5.5; pdf.text(String(l[0]),x,yy); x+=26; pdf.text(String(l[1]),x,yy); x+=18; pdf.text(String(l[2]),x,yy); x+=20; pdf.setFont('helvetica','bold'); pdf.text(alxN(l[3])+' '+(it.un||(itemDe(cod)?alxUn(itemDe(cod)).a:'')),x,yy); pdf.setFont('helvetica','normal'); x+=26;
      if(i===0){ if(+it.qtdRasgada>0){ pdf.setTextColor(162,69,61); pdf.text(String(it.qtdRasgada),x,yy); pdf.setTextColor(20); } else if(it.confirmadoZero) pdf.text('zero conf.',x,yy); else pdf.text('—',x,yy); } });
    if(+it.qtdRasgada>0&&it.motivoRasgo){ pdf.setFontSize(7); pdf.setTextColor(120); pdf.text(pdf.splitTextToSize(it.motivoRasgo,40).slice(0,2),ML+2+160,y+3.6); pdf.setTextColor(20); pdf.setFontSize(8.5); }
    y+=h; pdf.setDrawColor(225); pdf.line(ML,y-3.5,W-MR,y-3.5); });
  if(y>262){ pdf.addPage(); y=20; } y+=14; pdf.setDrawColor(120); pdf.line(ML,y,ML+80,y); pdf.line(W-MR-80,y,W-MR,y); pdf.setFontSize(8.5); pdf.text('Conferente',ML,y+4); pdf.text('Supervisor',W-MR-80,y+4);
  pdf.setFontSize(7); pdf.setTextColor(140); pdf.text('Painel de Operação Colafix · gerado em '+alxDH(new Date().toISOString()),ML,292);
  try{ await dl.save({filename:c.numero+'.pdf',data:pdf.output('blob')}); }catch(e){} }

// ================= 2. CONFERÊNCIAS (histórico) =================
function vAlxConf(){ const X=S.alx, H=X.h, P=acsP(); const podeAud=P.auditar; const desde=alxPer(H.per);
  let xs=X.conferencias.filter(alxConfVisivel);
  if(desde) xs=xs.filter(c=>c.em&&new Date(c.em).getTime()>=desde);
  if(H.loc) xs=xs.filter(c=>alxLinhas(c).some(l=>l.loc===H.loc));
  if(H.rasg) xs=xs.filter(c=>{ const t=Object.values(c.itens||{}).some(it=>+it.qtdRasgada>0); return H.rasg==='sim'?t:!t; });
  const q=H.busca.trim().toLowerCase(); if(q) xs=xs.filter(c=>String(c.numero).toLowerCase().includes(q)||alxQuem(c.por,c.porNome).toLowerCase().includes(q)||Object.entries(c.itens||{}).some(([cod,it])=>cod.toLowerCase().includes(q)||String(it.nome||'').toLowerCase().includes(q)));
  const locs=ALX_LOCS.filter(l=>P.locais.includes(l));
  return alxHead('Conferências','Todas as contagens salvas. Toque numa conferência para ver os itens'+(podeAud?' e auditar o saldo.':'.'))+`
  <section class="card ofil">
   <div class="frow"><div class="flab">PERÍODO</div><div class="fline">${alxSegPer('alx-hper',H.per)}<span class="fcount">${xs.length} conferência${xs.length===1?'':'s'}</span></div></div>
   <div class="frow"><div class="flab">FILTRO</div><div class="fline">${locs.length>1?`<select class="txt" id="alx-hloc" style="height:40px;width:auto"><option value="">Todos os locais</option>${locs.map(l=>`<option value="${l}" ${H.loc===l?'selected':''}>${ALX_LOC[l]}</option>`).join('')}</select>`:''}
    <select class="txt" id="alx-hrasg" style="height:40px;width:auto"><option value="">Com e sem rasgados</option><option value="sim" ${H.rasg==='sim'?'selected':''}>Só com rasgados</option><option value="nao" ${H.rasg==='nao'?'selected':''}>Sem rasgados</option></select>
    <div class="srch" style="margin-left:auto"><input class="txt" style="padding-left:12px" id="alx-hbusca" type="search" placeholder="Nº, conferente, código…" value="${esc(H.busca)}" autocomplete="off"></div></div></div>
  </section>
  <section class="card" style="padding:6px 18px 10px">${xs.length?xs.slice(0,150).map(alxConfRow).join('')+(xs.length>150?`<div class="sub" style="font-size:12px;padding:10px 0">Mostrando 150 de ${xs.length}. Use o filtro de período ou a busca.</div>`:''):'<div class="empty">Nenhuma conferência neste filtro.</div>'}</section>`; }
function alxConfRow(c){ const X=S.alx, ab=X.h.ab===c.numero, P=acsP(); const r=alxResumoConf(c); const its=Object.entries(c.itens||{}); const rg=its.reduce((a,[,it])=>a+(+it.qtdRasgada||0),0);
  const stp=r.t===0?'':r.ok?'<span class="pill ok">auditada</span>':r.i?`<span class="pill crit">${r.i} em investigação</span>`:(r.v+r.r)?`<span class="pill warn">auditoria ${r.pct}%</span>`:'';
  return `<div class="alx-crow ${ab?'aberta':''}" data-act="alx-hab" data-n="${esc(c.numero)}" role="button" tabindex="0" aria-expanded="${ab}">
    <span><b class="num">${alxD(c.em)}</b><small class="num">${c.em?hora(c.em):''}</small></span>
    <span style="min-width:0"><b>${esc(alxQuem(c.por,c.porNome))}</b><small class="num">${esc(c.numero)} · ${its.length} ${its.length===1?'item':'itens'}${c.origem==='planilha'?' · app antigo':''}</small></span>
    <span class="alx-cpills"><span class="pill neu">${esc(c.local||'—')}</span>${rg?`<span class="pill crit">${rg} rasgado${rg===1?'':'s'}</span>`:''}${stp}</span></div>
   ${ab?`<div class="odet alx-cdet"><div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${P.auditar&&r.p?`<button class="btn sec" data-act="alx-abrir-conf" data-n="${esc(c.numero)}" style="height:40px">Abrir auditoria dos ${r.p} pendentes</button>`:''}<button class="btn sec" data-act="alx-pdf" data-n="${esc(c.numero)}" style="height:40px">${ic('baixar',18,2)}PDF</button></div>
     ${r.t?`<div style="grid-column:1/-1"><div class="bar" style="height:6px"><i style="width:${r.pct}%;background:${r.ok?'var(--ok)':'var(--teal)'}"></i></div><div class="sub" style="font-size:12px">Auditoria: ${r.v} validado${r.v===1?'':'s'} · ${r.i} em investigação · ${r.r} resolvida${r.r===1?'':'s'} · ${r.p} pendente${r.p===1?'':'s'}</div></div>`:''}
     <div style="grid-column:1/-1;overflow-x:auto"><table class="rtab"><thead><tr><th>Item</th><th>Local</th><th class="nr">Contado</th><th>Rasgado</th><th>Auditoria</th></tr></thead><tbody>
     ${its.sort((a,b)=>a[0].localeCompare(b[0])).map(([cod,it])=>{ const ls=alxLinhas({itens:{[cod]:it}}).filter(l=>alxVeLoc(l.loc)); if(!ls.length&&!(P.tudo)) return '';
       const itc=itemDe(cod); const u=itc?alxUn(itc):{a:it.un||'',conv:null};
       return (ls.length?ls:[{lbl:'—',loc:null,fis:+it.total||0}]).map((l,i)=>{ const key=l.loc?alxKey(c.numero,cod,l.loc):null; const st=key?alxAudSt(key):null;
        return `<tr>${i===0?`<th rowspan="${Math.max(1,ls.length)}"><b class="num">${esc(cod)}</b><small style="display:block;margin:0;max-width:260px;white-space:normal">${esc(it.nome||'')}</small>${it.confirmadoZero?'<span class="pill neu" style="margin-top:4px">zero confirmado</span>':''}</th>`:''}
         <td>${esc(l.lbl)}</td><td class="nr num"><b>${it.un&&!itc?alxN(l.fis)+' '+esc(it.un):alxQ(itc,l.fis,u)}</b>${(+it['pal'+(l.loc==='a30'||l.loc==='a2'?'30':'3')]>0)?`<small>${it['pal'+(l.loc==='a30'||l.loc==='a2'?'30':'3')]} pal + ${it['sac'+(l.loc==='a30'||l.loc==='a2'?'30':'3')]||0}</small>`:''}</td>
         ${i===0?`<td rowspan="${Math.max(1,ls.length)}">${+it.qtdRasgada>0?`<b style="color:var(--crit-ink)">${it.qtdRasgada}</b>${it.motivoRasgo?`<small style="display:block;margin:0;white-space:normal">${esc(it.motivoRasgo)}</small>`:''}`:'<span style="color:var(--faint)">—</span>'}</td>`:''}
         <td>${st?alxStPill(st):''}${key&&P.auditar?` <button class="lnk" data-act="alx-vs" data-n="${esc(c.numero)}" data-c="${esc(cod)}" data-l="${l.loc}">${st==='nao'?'Validar saldo':'Abrir'}</button>`:''}</td></tr>`; }).join(''); }).join('')}
     </tbody></table></div></div>`:''}`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="alx-h"]'); if(!b) return; const H=S.alx.h;
  if(b.dataset.act==='alx-hper'){ H.per=b.dataset.v; render(); } else if(b.dataset.act==='alx-hab'){ if(ev.target.closest('button,a')&&ev.target.closest('button,a')!==b) return; H.ab=H.ab===b.dataset.n?null:b.dataset.n; render(); } });
document.addEventListener('change',ev=>{ const t=ev.target, H=S.alx.h; if(t.id==='alx-hloc'){ H.loc=t.value; render(); } else if(t.id==='alx-hrasg'){ H.rasg=t.value; render(); } });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='alx-hbusca') return; const H=S.alx.h; H.busca=t.value; clearTimeout(H._t); H._t=setTimeout(()=>{ const p=t.selectionStart; render(); const i=$('#alx-hbusca'); if(i){ i.focus(); try{ i.setSelectionRange(p,p); }catch(e){} } },250); });
document.addEventListener('keydown',ev=>{ const t=ev.target; if((ev.key==='Enter'||ev.key===' ')&&t.classList&&(t.classList.contains('alx-crow')||t.classList.contains('alx-rrow')||t.classList.contains('alx-irow'))&&t.dataset.act){ ev.preventDefault(); t.click(); } });

// ================= 3. RECEBIMENTO =================
function vAlxRec(){ const X=S.alx, R=X.r, P=acsP(); const desde=alxPer(R.per);
  let xs=X.recebimentos.filter(r=>{ const it=itemDe(r.cod); const ls=alxLocsIt(it); return P.tudo||!ls.length||ls.some(l=>P.locais.includes(l)); });
  if(desde) xs=xs.filter(r=>r.em&&new Date(r.em).getTime()>=desde);
  if(R.fil==='pend') xs=xs.filter(r=>!r.apontado); else if(R.fil==='apont') xs=xs.filter(r=>r.apontado);
  const q=R.busca.trim().toLowerCase(); if(q) xs=xs.filter(r=>(r.cod+' '+(r.nome||'')+' '+alxQuem(r.por,r.porNome)).toLowerCase().includes(q));
  const pend=X.recebimentos.filter(r=>!r.apontado).length; const it=R.cod?itemDe(R.cod):null; const un=it?alxUn(it):null;
  const sug=R.q.trim().length>=2&&!it?alxItensPerm('todos').filter(i=>(i.codigo+' '+(i.descricao||'')).toLowerCase().includes(R.q.trim().toLowerCase())).slice(0,8):[];
  return alxHead('Recebimento de material','Registre a entrada de material no almoxarifado. Depois, o Supervisor Sistema marca como apontado quando lançar no sistema.')+`
  ${P.receber?`<section class="card"><h2>Novo recebimento</h2>
   <div class="ed-grid" style="grid-template-columns:minmax(0,2fr) repeat(2,minmax(0,1fr));margin-top:10px">
    <div style="position:relative;display:flex;flex-direction:column;gap:4px"><span class="sub">Item</span>${it?`<div class="alx-itsel"><b class="num">${esc(it.codigo)}</b> <span>${esc(it.descricao||'')}</span><button class="lnk" data-act="alx-rtrocar">trocar</button></div>`:`<input class="txt" id="alx-rq" placeholder="Digite código ou descrição" value="${esc(R.q)}" autocomplete="off">`}
     ${sug.length?`<div class="alx-sug">${sug.map(i=>`<button class="opt" data-act="alx-rsel" data-c="${esc(i.codigo)}"><b class="num">${esc(i.codigo)}</b> ${esc(i.descricao||'')}</button>`).join('')}</div>`:''}</div>
    <label><span class="sub">Quantidade${un?' ('+esc(un.p)+')':''}</span><input class="txt num" id="alx-rqtd" inputmode="numeric" value="${esc(R.qtd)}" placeholder="0" style="font-size:18px;font-weight:700"></label>
    <label><span class="sub">Data</span><input class="txt" type="date" id="alx-rdia" value="${esc(R.dia||hojeStr())}" max="${hojeStr()}"></label>
   </div>
   <label style="display:block;margin-top:10px"><span class="sub">Observação</span><input class="txt" id="alx-robs" value="${esc(R.obs)}" placeholder="Ex.: 10 paletes, NF 1234"></label>
   ${it&&un&&un.pal&&(+R.qtd||0)>0?`<div class="sub" style="font-size:12px;margin-top:6px">${alxN(+R.qtd)} ${esc(un.a)} = ${Math.floor(+R.qtd/un.pp)} palete${Math.floor(+R.qtd/un.pp)===1?'':'s'} de ${un.pp}${(+R.qtd)%un.pp?' + '+((+R.qtd)%un.pp)+' '+esc(un.a):''}</div>`:''}
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-act="alx-rsalvar" ${R.salvando?'disabled':''}>${ic('check',18,2.2)}Registrar recebimento</button></div></section>`:''}
  <section class="card ofil">
   <div class="frow"><div class="flab">PERÍODO</div><div class="fline">${alxSegPer('alx-rper',R.per)}</div></div>
   <div class="frow"><div class="flab">SITUAÇÃO</div><div class="fline"><div class="seg">${[['todos','Todos'],['pend','Não apontados'],['apont','Apontados']].map(([k,t])=>`<button data-act="alx-rfil" data-v="${k}" aria-pressed="${R.fil===k}">${t}${k==='pend'&&pend?` <small>${pend}</small>`:''}</button>`).join('')}</div>
    <div class="srch" style="margin-left:auto"><input class="txt" style="padding-left:12px" id="alx-rbusca" type="search" placeholder="Código, item ou quem registrou" value="${esc(R.busca)}" autocomplete="off"></div></div></div></section>
  <section class="card" style="padding:6px 18px 10px">${xs.length?xs.slice(0,200).map(alxRecRow).join(''):'<div class="empty">Nenhum recebimento neste filtro.</div>'}</section>`; }
function alxRecRow(r){ const R=S.alx.r, ab=R.ab===r._id, P=acsP();
  return `<div class="alx-rrow ${ab?'aberta':''}" data-act="alx-rab" data-id="${esc(r._id)}" role="button" tabindex="0" aria-expanded="${ab}"><span><b class="num">${esc(r.cod)}</b><small>${esc(r.nome||'')}</small></span>
   <span class="nr"><b class="num" style="color:var(--ok-ink)">+${alxN(r.quantidade)} ${esc(r.unidade||'')}</b><small class="num">${r.dia?dm(r.dia):alxD(r.em)}</small></span>
   <span>${r.apontado?'<span class="pill ok">apontado</span>':'<span class="pill warn">não apontado</span>'}</span></div>
   ${ab?`<div class="odet" style="grid-template-columns:minmax(0,1fr);gap:6px;font-size:13px"><div>Registrado por <b>${esc(alxQuem(r.por,r.porNome))}</b> em ${alxDH(r.em)}</div>${r.obs?`<div>Observação: ${esc(r.obs)}</div>`:''}
    ${r.apontado?`<div style="color:var(--ok-ink)">Apontado por <b>${esc(alxQuem(r.apontadoPor,r.apontadoPorNome))}</b> em ${alxDH(r.apontadoEm)} ${P.auditar?`<button class="lnk" data-act="alx-rdesap" data-id="${esc(r._id)}">desfazer</button>`:''}</div>`
      :P.auditar?`<div><button class="btn" data-act="alx-rap" data-id="${esc(r._id)}" style="height:40px">${ic('check',18,2.2)}Marcar como apontado</button></div>`:'<div class="sub" style="margin:0">Aguardando o Supervisor Sistema apontar.</div>'}
    ${(r.hist||[]).length?`<div class="sub" style="font-size:12px;margin:0">${r.hist.map(h=>`${alxDH(h.em)} · ${esc(h.t)} · ${esc(alxQuem(h.por,h.porNome))}`).join('<br>')}</div>`:''}</div>`:''}`; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="alx-r"]'); if(!b||b.disabled) return; const R=S.alx.r, act=b.dataset.act, P=acsP(); if(!P) return;
  if(act==='alx-rper'){ R.per=b.dataset.v; render(); return; }
  if(act==='alx-rfil'){ R.fil=b.dataset.v; render(); return; }
  if(act==='alx-rab'){ if(ev.target.closest('button')&&ev.target.closest('button')!==b) return; R.ab=R.ab===b.dataset.id?null:b.dataset.id; render(); return; }
  if(act==='alx-rsel'){ R.cod=b.dataset.c; R.q=''; render(); const q=$('#alx-rqtd'); q&&q.focus(); return; }
  if(act==='alx-rtrocar'){ R.cod=null; render(); const q=$('#alx-rq'); q&&q.focus(); return; }
  if(act==='alx-rsalvar'){ if(!P.receber){ toast('Você não tem permissão para registrar recebimento.'); return; } const it=R.cod&&itemDe(R.cod); if(!it){ toast('Escolha o item.'); return; }
    const qtd=parseInt(String(R.qtd).replace(/\D/g,''),10)||0; if(qtd<=0){ toast('Informe a quantidade recebida.'); return; } if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    const agora=new Date(), id='REC-'+agora.getTime()+'-'+Math.floor(Math.random()*1000), un=alxUn(it);
    const d={id,cod:it.codigo,nome:it.descricao||'',quantidade:qtd,unidade:un.a,dia:R.dia||hojeStr(),em:agora.toISOString(),por:S.uid||null,obs:String(R.obs||'').trim(),apontado:false,origem:'painel'};
    R.salvando=true; render(); try{ await S.db.doc('recebimentos/'+id).set(d); toast('Recebimento registrado: '+alxN(qtd)+' '+un.a+' de '+it.codigo); R.cod=null; R.qtd=''; R.obs=''; R.q=''; }catch(e){ erro(e); } R.salvando=false; render(); return; }
  if(act==='alx-rap'||act==='alx-rdesap'){ if(!P.auditar) return; const r=S.alx.recebimentos.find(x=>x._id===b.dataset.id); if(!r||!S.db) return; const em=new Date().toISOString(); const ap=act==='alx-rap';
    const hist=[...(r.hist||[]),{em,t:ap?'apontado':'apontamento desfeito',por:S.uid||null}].slice(-20);
    try{ await S.db.doc('recebimentos/'+r._id).update(ap?{apontado:true,apontadoPor:S.uid||null,apontadoPorNome:'',apontadoEm:em,hist}:{apontado:false,hist}); toast(ap?'Recebimento marcado como apontado.':'Apontamento desfeito.'); }catch(e){ erro(e); } return; }
});
document.addEventListener('input',ev=>{ const t=ev.target, R=S.alx.r;
  if(t.id==='alx-rq'){ R.q=t.value; clearTimeout(R._t); R._t=setTimeout(()=>{ const p=t.selectionStart; render(); const i=$('#alx-rq'); if(i){ i.focus(); try{ i.setSelectionRange(p,p); }catch(e){} } },200); return; }
  if(t.id==='alx-rqtd'){ R.qtd=t.value.replace(/\D/g,''); if(t.value!==R.qtd) t.value=R.qtd; return; }
  if(t.id==='alx-robs'){ R.obs=t.value; return; }
  if(t.id==='alx-rbusca'){ R.busca=t.value; clearTimeout(R._b); R._b=setTimeout(()=>{ const p=t.selectionStart; render(); const i=$('#alx-rbusca'); if(i){ i.focus(); try{ i.setSelectionRange(p,p); }catch(e){} } },250); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='alx-rdia') S.alx.r.dia=t.value; if(t.id==='alx-rqtd') render(); });

// ================= 4. AUDITORIA DE ESTOQUE =================
function alxRegsPorItem(){ const X=S.alx; const k=[X.auditorias,S.acs.doc]; if(X._rp&&X._rp.k.every((v,i)=>v===k[i])) return X._rp.m; const m={};
  X.auditorias.forEach(a=>{ if(a.excluida||!a.cod||!alxVeLoc(a.loc)) return; (m[a.cod]=m[a.cod]||[]).push(a); }); Object.values(m).forEach(a=>a.sort((x,y)=>String(y.em).localeCompare(String(x.em)))); X._rp={k,m}; return m; }
function alxReinc(regs){ const lim=Date.now()-30*864e5; return regs.filter(r=>r.resultado==='Divergência'&&new Date(r.em).getTime()>=lim).length; }
function alxUltCont(cod){ let u=null; S.alx.conferencias.forEach(c=>{ const it=(c.itens||{})[cod]; if(it&&(!u||String(c.em)>String(u.em))) u={em:c.em,q:+it.total||0,quem:alxQuem(c.por,c.porNome)}; }); return u; }
function alxAudFiltrada(){ const X=S.alx, A=X.a, pend=alxPend(), porItem=alxRegsPorItem(); const P=acsP();
  const todos=alxItensTodos().filter(i=>alxLocsIt(i).some(l=>alxVeLoc(l)));
  const cods=new Set([...Object.keys(porItem),...Object.keys(pend),...todos.map(i=>i.codigo)]);
  const q=A.busca.trim().toLowerCase(), fc=A.conf.trim().toLowerCase(), fq=A.confer.trim().toLowerCase();
  let xs=[...cods].filter(cod=>{ const regs=porItem[cod]||[], pd=pend[cod]||[]; const it=itemDe(cod); const nome=((regs[0]&&regs[0].nome)||(pd[0]&&pd[0].nome)||(it&&it.descricao)||'').toLowerCase();
    if(q&&!cod.toLowerCase().includes(q)&&!nome.includes(q)) return false;
    if(A.grupo&&!((it&&it.almox&&it.almox.grupos)||[]).includes(A.grupo)) return false;
    if(A.loc&&!regs.some(r=>r.loc===A.loc)&&!pd.some(p=>p.loc===A.loc)&&!(regs.length===0&&pd.length===0&&alxLocsIt(it).includes(A.loc))) return false;
    if(fc&&!regs.some(r=>String(r.numConf).toLowerCase().includes(fc))&&!pd.some(p=>String(p.num).toLowerCase().includes(fc))) return false;
    if(fq&&!regs.some(r=>alxConferenteDe(r).toLowerCase().includes(fq))&&!pd.some(p=>p.quem.toLowerCase().includes(fq))) return false;
    const r0=regs[0];
    if(A.sit==='pend'&&!pd.length) return false;
    if(A.sit==='inv'&&!regs.some(r=>r.investigacao&&r.investigacao.status!=='Resolvido')) return false;
    if(A.sit==='adj'&&!regs.some(r=>r.investigacao&&r.investigacao.status==='Resolvido'&&r.investigacao.motivo===ALX_MOT_ERP)) return false;
    if(A.sit==='nunca'&&(regs.length||pd.length)) return false;
    if(A.sit==='reinc'&&alxReinc(regs)<2) return false;
    if(A.sit==='todos'&&!regs.length&&!pd.length&&!q&&!A.grupo&&!A.loc) return false;
    return true; });
  const ord=cod=>{ const regs=porItem[cod]||[], pd=pend[cod]||[], r0=regs[0]; if(r0&&r0.investigacao&&r0.investigacao.status!=='Resolvido') return 0; if(pd.length) return 1; if(r0&&r0.investigacao) return 2; if(r0) return 3; return 4; };
  const dif=cod=>{ const r=(porItem[cod]||[])[0]; return r&&r.saldoInformado!=null?Math.abs((+r.saldoFisico||0)-(+r.saldoInformado||0)):-1; };
  const ult=cod=>{ const r=(porItem[cod]||[])[0], p=(pend[cod]||[])[0]; return String((r&&r.em)||(p&&p.em)||''); };
  xs.sort((a,b)=>A.ord==='diferenca'?dif(b)-dif(a):(ord(a)-ord(b)||ult(b).localeCompare(ult(a))||a.localeCompare(b)));
  const locDe=cod=>{ const r=(porItem[cod]||[])[0], p=(pend[cod]||[])[0]; return (r&&r.loc)||(p&&p.loc)||alxLocsIt(itemDe(cod)).find(l=>alxVeLoc(l))||''; };
  if(A.agr) xs.sort((a,b)=>ALX_LOCS.indexOf(locDe(a))-ALX_LOCS.indexOf(locDe(b)));
  return {xs,porItem,pend,todos,locDe}; }
function alxConferenteDe(r){ const c=S.alx.conferencias.find(x=>x.numero===r.numConf); return c?alxQuem(c.por,c.porNome):''; }
function vAlxAud(){ const X=S.alx, A=X.a, P=acsP(); const F=alxAudFiltrada(); const {xs,porItem,pend,todos}=F;
  // resumo geral
  let nunca=0,aberta=0,reinc=0,val=0,tot=0; todos.forEach(i=>{ const regs=porItem[i.codigo]||[], pd=pend[i.codigo]||[]; if(!regs.length&&!pd.length){ nunca++; return; } if(regs[0]&&regs[0].investigacao&&regs[0].investigacao.status!=='Resolvido') aberta++; if(alxReinc(regs)>=2) reinc++; regs.forEach(r=>{ tot++; if(r.resultado==='Validado') val++; }); });
  const acc=tot?Math.round(val/tot*100):null; const npend=Object.values(pend).reduce((a,v)=>a+v.length,0);
  const porLoc={}; let tdiv=0; xs.forEach(cod=>(porItem[cod]||[]).forEach(r=>{ if(r.resultado!=='Divergência') return; tdiv++; porLoc[r.almoxarifado]=(porLoc[r.almoxarifado]||0)+1; }));
  const locs=ALX_LOCS.filter(l=>P.locais.includes(l)); const grupos=alxGruposDe(todos);
  const excl=X.auditorias.filter(a=>a.excluida&&alxVeLoc(a.loc)).sort((a,b)=>String(b.excluida.em).localeCompare(String(a.excluida.em)));
  let locAnt=null;
  return alxHead('Auditoria de estoque','Depois da contagem, o Supervisor Sistema compara o físico com o saldo do sistema. Uma ficha por item, com a linha do tempo de todas as auditorias.',
    `<button class="btn sec" data-act="alx-aexp">${ic('baixar',18,2)}Exportar Excel</button>`)+`
  <div class="resumo alx-res5"><div><div class="k">Itens no cadastro</div><div class="v num">${todos.length}</div></div><div><div class="k">Contados, sem auditoria</div><div class="v num ${npend?'warn':''}">${npend}</div></div>
   <div><div class="k">Divergência aberta</div><div class="v num ${aberta?'crit':''}">${aberta}</div></div><div><div class="k">Reincidentes 30 dias</div><div class="v num ${reinc?'crit':''}">${reinc}</div></div>
   <div><div class="k">Acurácia</div><div class="v num ${acc==null?'':acc>=90?'ok':acc>=70?'warn':'crit'}">${acc==null?'—':acc+'%'}</div></div></div>
  <section class="card ofil">
   <div class="frow"><div class="flab">SITUAÇÃO</div><div class="fline"><div class="seg">${[['todos','Com registro'],['pend','Contado, não auditado'],['inv','Em investigação'],['adj','Sistema ajustado'],['reinc','Reincidentes'],['nunca','Nunca auditados']].map(([k,t])=>`<button data-act="alx-asit" data-v="${k}" aria-pressed="${A.sit===k}">${t}</button>`).join('')}</div><span class="fcount">${xs.length} ${xs.length===1?'item':'itens'}</span></div></div>
   <div class="frow"><div class="flab">FILTRO</div><div class="fline">${locs.length>1?`<select class="txt" id="alx-aloc" style="height:40px;width:auto"><option value="">Todos os locais</option>${locs.map(l=>`<option value="${l}" ${A.loc===l?'selected':''}>${ALX_LOC[l]}</option>`).join('')}</select>`:''}
    ${grupos.length?`<select class="txt" id="alx-agrupo" style="height:40px;width:auto"><option value="">Todos os grupos</option>${grupos.map(g=>`<option ${A.grupo===g?'selected':''}>${esc(g)}</option>`).join('')}</select>`:''}
    <input class="txt" id="alx-aconf" placeholder="Nº conferência" value="${esc(A.conf)}" style="height:40px;width:170px" autocomplete="off"><input class="txt" id="alx-aconfer" placeholder="Conferente" value="${esc(A.confer)}" style="height:40px;width:150px" autocomplete="off">
    <div class="srch" style="margin-left:auto"><input class="txt" style="padding-left:12px" id="alx-abusca" type="search" placeholder="Código ou descrição" value="${esc(A.busca)}" autocomplete="off"></div></div></div>
   <div class="frow"><div class="flab">ORDEM</div><div class="fline"><div class="seg">${[['situacao','O que precisa de ação'],['diferenca','Maior diferença']].map(([k,t])=>`<button data-act="alx-aord" data-v="${k}" aria-pressed="${A.ord===k}">${t}</button>`).join('')}</div><label class="ck" style="font-size:13px"><input type="checkbox" id="alx-aagr" ${A.agr?'checked':''}>Agrupar por local</label></div></div>
  </section>
  ${tdiv?`<section class="card"><div class="label" style="margin-bottom:8px">DIVERGÊNCIAS POR LOCAL (itens da lista)</div>${Object.entries(porLoc).sort((a,b)=>b[1]-a[1]).map(([l,n])=>`<div class="hb"><span class="hb-l">${esc(l)}</span><span class="hb-t"><i style="width:${Math.round(n/tdiv*100)}%;background:var(--crit)"></i></span><b class="num">${n} <small style="font-weight:400;color:var(--muted)">${Math.round(n/tdiv*100)}%</small></b></div>`).join('')}</section>`:''}
  ${P.auditar&&A.selec.length?`<div class="banner" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--teal-wash);color:var(--teal-strong)"><b>${A.selec.length} ${A.selec.length===1?'item marcado':'itens marcados'}</b><button class="btn sec" data-act="alx-amass-abrir" style="height:38px">Abrir auditoria das contagens pendentes</button><button class="btn warn" data-act="alx-amass-excl" style="height:38px">${A.confExcl?'Confirmar exclusão':'Excluir divergências em aberto'}</button><button class="lnk" data-act="alx-amass-limpar">Desmarcar</button></div>`:''}
  <section class="card" style="padding:6px 18px 10px">${xs.length?xs.slice(0,250).map(cod=>{ let h=''; if(A.agr){ const l=F.locDe(cod); if(l!==locAnt){ locAnt=l; h=`<div class="label" style="padding:14px 0 6px">${esc(ALX_LOC[l]||'Sem local')}</div>`; } } return h+alxItemRow(cod,F); }).join('')+(xs.length>250?`<div class="sub" style="font-size:12px;padding:10px 0">Mostrando 250 de ${xs.length}. Use os filtros.</div>`:'')
    :`<div class="empty">${A.sit==='todos'?'Nenhum item com contagem ou auditoria ainda. Use “Nunca auditados” para ver o cadastro inteiro.':'Nenhum item neste filtro.'}</div>`}</section>
  ${excl.length?`<section class="card"><button class="lnk" data-act="alx-alog">${A.log?'Esconder':'Ver'} registro de exclusões (${excl.length})</button>${A.log?excl.slice(0,100).map(a=>`<div class="rrow" style="font-size:13px"><span><b class="num">${esc(a.cod)}</b> ${esc(a.nome||'')}<small style="display:block;color:var(--muted)">${esc(a.numConf)} · ${esc(a.almoxarifado||'')} · motivo original: ${esc((a.investigacao&&a.investigacao.motivo)||'—')}</small></span><span class="sub" style="margin:0;font-size:12px;text-align:right">excluída por ${esc(alxQuem(a.excluida.por,a.excluida.porNome))}<br>${alxDH(a.excluida.em)}</span></div>`).join(''):''}</section>`:''}
  ${A.ficha?alxFicha(A.ficha):''}`; }
function alxItemRow(cod,F){ const A=S.alx.a, P=acsP(); const regs=F.porItem[cod]||[], pd=F.pend[cod]||[], r0=regs[0]; const it=itemDe(cod);
  const nome=(r0&&r0.nome)||(pd[0]&&pd[0].nome)||(it&&it.descricao)||''; const nunca=!regs.length&&!pd.length; const rc=alxReinc(regs);
  const st=nunca?'<span class="pill neu">Nunca auditado</span>':pd.length?`<span class="pill warn">Contado, não auditado${pd.length>1?' ('+pd.length+')':''}</span>`:alxStPill(!r0.investigacao?'val':r0.investigacao.status==='Resolvido'?'res':'inv');
  const aj=regs.find(r=>r.investigacao&&r.investigacao.status==='Resolvido'&&r.investigacao.motivo===ALX_MOT_ERP); const uc=alxUltCont(cod); const fc=alxFocco(cod); const vb=regs.find(r=>r.resultado==='Validado');
  const on=A.selec.includes(cod);
  return `<div class="alx-irow ${r0&&r0.investigacao&&r0.investigacao.status!=='Resolvido'?'inv':''}" data-act="alx-aficha" data-c="${esc(cod)}" role="button" tabindex="0">
   ${P.auditar?`<input type="checkbox" class="alx-ack" data-alx-asel="${esc(cod)}" ${on?'checked':''} aria-label="Marcar ${esc(cod)}">`:'<span></span>'}
   <span style="min-width:0"><b class="num">${esc(cod)}</b> <span class="alx-desc">${esc(nome)}</span>
    <small>${nunca?esc(alxLocsIt(it).filter(alxVeLoc).map(l=>ALX_LOC[l]).join(' · '))+' · nenhuma contagem ou auditoria'
      :[fc?'Focco: A3 '+alxN(fc.a3)+' · A30 '+alxN(fc.a30):'',uc?'última contagem '+alxN(uc.q)+' em '+alxD(uc.em):'',vb?'última validação '+alxD(vb.em):(regs.length?'nunca validado':''),regs.length?regs.length+' auditoria'+(regs.length===1?'':'s'):''].filter(Boolean).join(' · ')}</small></span>
   <span class="alx-cpills">${rc>=2?`<span class="pill crit">${rc} divergências em 30 dias</span>`:''}${aj?`<span class="pill warn">sistema ajustado ${alxD(aj.investigacao.resolvidoEm||aj.em)}</span>`:''}${st}${r0&&r0.investigacao&&r0.investigacao.status!=='Resolvido'?`<small class="num" style="color:var(--crit-ink)">${alxAberta(r0.em)}</small>`:''}</span></div>`; }
function alxAberta(em){ const d=Math.floor((Date.now()-new Date(em).getTime())/864e5); return d<=0?'aberta hoje':d===1?'aberta há 1 dia':'aberta há '+d+' dias'; }
function alxGrafico(regs){ const pts=regs.filter(r=>r.saldoInformado!=null).slice(0,20).reverse(); if(pts.length<2) return '';
  const W=560,H=110,PD=26; const vals=pts.flatMap(r=>[+r.saldoFisico||0,+r.saldoInformado||0]); const mn=Math.min(0,...vals), mx=Math.max(1,...vals);
  const x=i=>PD+i*(W-2*PD)/(pts.length-1), y=v=>H-PD-((v-mn)/((mx-mn)||1))*(H-2*PD); const ln=k=>pts.map((r,i)=>x(i).toFixed(1)+','+y(+r[k]||0).toFixed(1)).join(' ');
  return `<div class="alx-graf"><div class="sub" style="font-size:12px;margin:0 0 4px">Evolução: <b style="color:var(--anl-s1)">físico</b> × <b style="color:var(--anl-s2)">sistema</b></div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Físico e sistema nas últimas auditorias">
   <line x1="${PD}" x2="${W-PD}" y1="${H-PD}" y2="${H-PD}" stroke="var(--line)"/><text x="${PD}" y="${H-8}" font-size="10" fill="var(--muted)">${alxD(pts[0].em)}</text><text x="${W-PD}" y="${H-8}" font-size="10" fill="var(--muted)" text-anchor="end">${alxD(pts[pts.length-1].em)}</text>
   <polyline points="${ln('saldoFisico')}" fill="none" stroke="var(--anl-s1)" stroke-width="2"/><polyline points="${ln('saldoInformado')}" fill="none" stroke="var(--anl-s2)" stroke-width="2" stroke-dasharray="5 4"/>
   ${pts.map((r,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(+r.saldoFisico||0).toFixed(1)}" r="3" fill="var(--anl-s1)"><title>${alxD(r.em)} físico ${alxN(r.saldoFisico)}</title></circle><circle cx="${x(i).toFixed(1)}" cy="${y(+r.saldoInformado||0).toFixed(1)}" r="3" fill="var(--anl-s2)"><title>${alxD(r.em)} sistema ${alxN(r.saldoInformado)}</title></circle>`).join('')}</svg></div>`; }
function alxFicha(cod){ const A=S.alx.a, P=acsP(); const regs=alxRegsPorItem()[cod]||[], pd=alxPend()[cod]||[]; const it=itemDe(cod); const nome=(regs[0]&&regs[0].nome)||(pd[0]&&pd[0].nome)||(it&&it.descricao)||'';
  const fc=alxFocco(cod), uc=alxUltCont(cod), vb=regs.find(r=>r.resultado==='Validado'), aj=regs.find(r=>r.investigacao&&r.investigacao.status==='Resolvido'&&r.investigacao.motivo===ALX_MOT_ERP);
  const ini=new Date(); ini.setDate(1); ini.setHours(0,0,0,0); const iniAnt=new Date(ini); iniAnt.setMonth(iniAnt.getMonth()-1);
  let em=0,nm=0,ep=0,np=0; regs.forEach(r=>{ if(r.saldoInformado==null) return; const t=new Date(r.em).getTime(), d=Math.abs((+r.saldoFisico||0)-(+r.saldoInformado||0)); if(t>=ini) { em+=d; nm++; } else if(t>=iniAnt){ ep+=d; np++; } });
  const todas=!!A.tl[cod]; const vis=todas?regs:regs.slice(0,5);
  return `<div class="omodal" data-act="alx-ficha-x"><div class="obox" role="dialog" aria-modal="true" aria-label="Ficha ${esc(cod)}" style="width:min(860px,100%)">
   <div class="ohd"><div style="min-width:0"><div class="label">FICHA DO ITEM</div><h2 style="margin-top:4px"><span class="num">${esc(cod)}</span> <span style="font-weight:500;color:var(--ink-2)">${esc(nome)}</span></h2></div><button class="btn sec" data-act="alx-ficha-x" data-x="1" aria-label="Fechar" style="height:40px;width:40px;padding:0;flex-shrink:0">✕</button></div>
   <div style="padding:16px 20px 20px;display:flex;flex-direction:column;gap:14px">
    <div class="alx-mini"><div><span>Saldo no Focco</span><b class="num">${fc?alxN(fc.a3+fc.a30):'—'}</b><small>${fc?'A3 '+alxN(fc.a3)+' · A30 '+alxN(fc.a30):'sem saldo importado'}</small></div>
     <div><span>Última contagem</span><b class="num">${uc?alxN(uc.q):'—'}</b><small>${uc?alxD(uc.em)+' · '+esc(uc.quem):''}</small></div>
     <div><span>Última validação</span><b class="num" style="color:${vb?'var(--ok-ink)':'var(--muted)'}">${vb?alxD(vb.em):'Nunca'}</b></div>
     <div><span>Sistema ajustado</span><b class="num" style="color:${aj?'var(--warn-ink)':'var(--muted)'}">${aj?alxD(aj.investigacao.resolvidoEm||aj.em):'Nunca'}</b></div></div>
    ${nm||np?`<div class="rende" style="margin:0"><span>Diferença acumulada este mês: <b class="num">${alxN(em)}</b> em ${nm} auditoria${nm===1?'':'s'}</span><span>Mês passado: <b class="num">${alxN(ep)}</b></span><b style="color:${em>ep?'var(--crit-ink)':em<ep?'var(--ok-ink)':'var(--muted)'}">${em>ep?'↑ piorando':em<ep?'↓ melhorando':'→ estável'}</b></div>`:''}
    ${alxGrafico(regs)}
    <div class="label">LINHA DO TEMPO</div>
    ${pd.map(p=>{ const est=alxFilaEst(p.key); return `<div class="alx-tl neu"><div class="alx-tlh"><b class="num">${alxDH(p.em)}</b><span>${esc(p.num)} · ${esc(p.lbl)}</span><span>Físico contado: <b class="num">${alxN(p.fis)}</b></span><span>${esc(p.quem)}</span></div>
      <div class="sub" style="margin:4px 0 0;font-size:12px">Contado, ainda sem auditoria${est==='aberta'?' · auditoria aberta':''}.</div>
      ${P.auditar?`<div class="pvact" style="justify-content:flex-start;margin-top:8px">${est==='aberta'?`<button class="btn" data-act="alx-vs" data-n="${esc(p.num)}" data-c="${esc(cod)}" data-l="${p.loc}" style="height:38px">Validar saldo</button><button class="btn sec" data-act="alx-fila" data-k="${esc(p.key)}" data-e="nenhuma" style="height:38px">Cancelar abertura</button>`
        :`<button class="btn sec" data-act="alx-fila" data-k="${esc(p.key)}" data-e="aberta" style="height:38px">Abrir auditoria</button><button class="btn sec" data-act="alx-vs" data-n="${esc(p.num)}" data-c="${esc(cod)}" data-l="${p.loc}" style="height:38px">Validar saldo agora</button><button class="lnk" data-act="alx-fila" data-k="${esc(p.key)}" data-e="descartada">Descartar da fila</button>`}</div>`:''}</div>`; }).join('')}
    ${!regs.length&&!pd.length?'<div class="empty">Nenhuma auditoria ainda.</div>':''}
    ${vis.map(r=>alxTlReg(r,P)).join('')}
    ${regs.length>5?`<button class="lnk" data-act="alx-tl" data-c="${esc(cod)}">${todas?'Mostrar menos':'Mostrar mais '+(regs.length-5)+' auditoria'+(regs.length-5===1?'':'s')}</button>`:''}
   </div></div></div>`; }
function alxTlReg(r,P){ const A=S.alx.a; const inv=r.investigacao; const dif=(+r.saldoFisico||0)-(+r.saldoInformado||0); const ajE=inv&&inv.status==='Resolvido'&&inv.motivo===ALX_MOT_ERP, rcE=inv&&inv.status==='Resolvido'&&inv.motivo===ALX_MOT_REC;
  const cls=ajE?'adj':rcE?'rec':r.resultado==='Divergência'?(inv&&inv.status==='Resolvido'?'res':'inv'):'ok'; const aberta=inv&&inv.status!=='Resolvido';
  const erp=(r.saldoInformadoEmpresa1!=null||r.saldoInformadoEmpresa9!=null)?`${alxN(r.saldoInformado)} <small>(E1 ${alxN(r.saldoInformadoEmpresa1||0)} + E9 ${alxN(r.saldoInformadoEmpresa9||0)})</small>`:alxN(r.saldoInformado);
  return `<div class="alx-tl ${cls}"><div class="alx-tlh"><b class="num">${alxDH(r.em)}</b><span>${esc(r.numConf)} · ${esc(r.almoxarifado||'')}</span>${alxStPill(!inv?'val':inv.status==='Resolvido'?'res':'inv')}${ajE?'<span class="pill warn">sistema ajustado aqui</span>':''}${rcE?'<span class="pill prod">material recontado</span>':''}</div>
   <div class="alx-tlv"><span>Físico <b class="num">${alxN(r.saldoFisico)}</b></span><span>Sistema <b class="num">${erp}</b></span><span style="color:${dif===0?'var(--ok-ink)':'var(--crit-ink)'}">Diferença <b class="num">${dif>0?'+':''}${alxN(dif)}</b></span><span class="sub" style="margin:0">Conferente: ${esc(alxConferenteDe(r)||'—')}</span><span class="sub" style="margin:0">Auditou: ${esc(alxQuem(r.por,r.porNome))}</span></div>
   ${inv?`<div class="alx-tli">Motivo: <b>${esc(inv.motivo||'—')}</b>${inv.observacao?`<br><span class="sub" style="margin:0">Obs.: ${esc(inv.observacao)}</span>`:''}
     ${inv.status==='Resolvido'?`<br>${ajE?'Sistema ajustado':rcE?'Recontado':'Resolvido'} por <b>${esc(alxQuem(inv.resolvidoPor,inv.resolvidoPorNome))}</b> em ${alxDH(inv.resolvidoEm)}${inv.saldoAjustado!=null?`<br>Saldo do sistema mudou de <b class="num">${alxN(r.saldoInformado)}</b> para <b class="num">${alxN(inv.saldoAjustado)}</b>`:''}${inv.obsFinal?`<br>Conclusão: ${esc(inv.obsFinal)}`:''}`
       :`<br><b style="color:var(--crit-ink)">Investigação em aberto — ${alxAberta(r.em)}</b>`}</div>`:''}
   ${(r.hist||[]).length?`<div class="sub" style="font-size:11.5px;margin:6px 0 0">Alterada ${r.hist.length}× · antes: ${r.hist.slice(-3).map(h=>`${alxD(h.em)} ${esc(h.resultado||'')} sistema ${alxN(h.saldoInformado)}`).join(' · ')}</div>`:''}
   ${aberta&&P.auditar?`<div class="pvact" style="justify-content:flex-start;margin-top:8px"><button class="btn" data-act="alx-amodo" data-k="${esc(r._id)}" data-m="ajuste" style="height:38px">Informar saldo ajustado</button><button class="btn sec" data-act="alx-amodo" data-k="${esc(r._id)}" data-m="reconta" style="height:38px">Material recontado</button><button class="btn sec" data-act="alx-vs" data-n="${esc(r.numConf)}" data-c="${esc(r.cod)}" data-l="${esc(r.loc)}" style="height:38px">Editar</button><button class="btn warn" data-act="alx-amodo" data-k="${esc(r._id)}" data-m="excluir" style="height:38px">Excluir</button></div>
     ${A.modo&&A.modo.k===r._id?(A.modo.m==='ajuste'?`<div class="alx-acao"><label><span class="sub">Novo saldo do sistema (depois do ajuste)</span><input class="txt num" id="alx-aj-saldo" inputmode="numeric" placeholder="ex.: ${esc(r.saldoFisico)}"></label><label><span class="sub">O que foi feito (opcional)</span><input class="txt" id="alx-aj-obs" placeholder="Ex.: ERP corrigido conforme contagem"></label><div class="pvact"><button class="btn" data-act="alx-ajuste" data-k="${esc(r._id)}" style="height:40px">Confirmar ajuste</button><button class="lnk" data-act="alx-amodo" data-k="">Cancelar</button></div></div>`
       :A.modo.m==='reconta'?`<div class="alx-acao"><div class="sub" style="margin:0;font-size:12px">O conferente errou a contagem: informe o número da recontagem. Fecha esta divergência e já compara com o sistema (${alxN(r.saldoInformado)}).</div><label><span class="sub">Nova quantidade contada</span><input class="txt num" id="alx-rc-q" inputmode="numeric" placeholder="ex.: ${esc(r.saldoInformado)}"></label><div class="pvact"><button class="btn" data-act="alx-reconta" data-k="${esc(r._id)}" style="height:40px">Confirmar recontagem</button><button class="lnk" data-act="alx-amodo" data-k="">Cancelar</button></div></div>`
       :`<div class="alx-acao"><div class="sub" style="margin:0;font-size:12px">A auditoria sai das listas, mas fica guardada no registro de exclusões.</div><label><span class="sub">Por que excluir? (opcional)</span><input class="txt" id="alx-ex-mot" placeholder="Ex.: não dá tempo de investigar"></label><div class="pvact"><button class="btn warn" data-act="alx-excluir" data-k="${esc(r._id)}" style="height:40px">Confirmar exclusão</button><button class="lnk" data-act="alx-amodo" data-k="">Cancelar</button></div></div>`):''}`:''}</div>`; }
// ---- modal Validar saldo ----
function alxVsAbrir(num,cod,loc){ const c=S.alx.conferencias.find(x=>x.numero===num); const it=c&&(c.itens||{})[cod]; if(!it){ toast('Conferência ou item não encontrado.'); return; }
  const l=alxLinhas({itens:{[cod]:it}}).find(x=>x.loc===loc); const key=alxKey(num,cod,loc); const ex=alxAudMapa()[key];
  S.alx.a.vs={num,cod,loc,lbl:ALX_LOC[loc],nome:it.nome||'',fis:l?l.fis:(loc==='a30'||loc==='a2'?+it.almox30||0:+it.almox3||0),em:c.em,key,quem:alxQuem(c.por,c.porNome),
    e1:ex&&ex.saldoInformadoEmpresa1!=null?String(ex.saldoInformadoEmpresa1):'',e9:ex&&ex.saldoInformadoEmpresa9!=null?String(ex.saldoInformadoEmpresa9):'',un:ex&&ex.saldoInformadoEmpresa1==null&&ex.saldoInformado!=null?String(ex.saldoInformado):'',
    mot:(ex&&ex.investigacao&&ex.investigacao.motivo)||'',obs:(ex&&ex.investigacao&&(ex.investigacao.status==='Resolvido'?(ex.investigacao.obsFinal||ex.investigacao.observacao):ex.investigacao.observacao))||'',existe:!!ex}; render(); }
function alxVsLeitura(){ const V=S.alx.a.vs; if(!V) return null; const n=s=>{ const x=parseInt(String(s).replace(/\D/g,''),10); return isNaN(x)?null:x; };
  if(alxFisico3(V.loc)){ const a=n(V.e1), b=n(V.e9); if(a==null||b==null||V.e1===''||V.e9==='') return null; return {tot:a+b,e1:a,e9:b}; }
  const u=n(V.un); if(u==null||V.un==='') return null; return {tot:u,e1:null,e9:null}; }
function alxVsModal(){ const V=S.alx.a.vs, A=S.alx.a; const ex=alxAudMapa()[V.key]; const hist=(alxRegsPorItem()[V.cod]||[]).filter(a=>a.resultado==='Divergência'&&a._id!==V.key); const fc=alxFocco(V.cod);
  const L=alxVsLeitura(); const div=L&&L.tot!==V.fis; const d=L?V.fis-L.tot:0; const inv=ex&&ex.investigacao;
  return `<div class="omodal" data-act="alx-vs-x" style="z-index:45"><div class="obox" role="dialog" aria-modal="true" aria-label="Validar saldo" style="width:min(620px,100%)">
   <div class="ohd"><div><div class="label">VALIDAR SALDO · ${esc(V.lbl.toUpperCase())}</div><h2 style="margin-top:4px"><span class="num">${esc(V.cod)}</span> <span style="font-weight:500;color:var(--ink-2);font-size:15px">${esc(V.nome)}</span></h2></div><button class="btn sec" data-act="alx-vs-x" data-x="1" aria-label="Fechar" style="height:40px;width:40px;padding:0;flex-shrink:0">✕</button></div>
   <div style="padding:16px 20px 20px;display:flex;flex-direction:column;gap:12px">
    ${hist.length?`<div class="av warn" style="margin:0"><b>Este item já teve divergência antes (${hist.length}×)</b><span>Última: ${alxDH(hist[0].em)} · ${esc(hist[0].numConf)} · ${esc(hist[0].almoxarifado||'')} · ${hist[0].investigacao&&hist[0].investigacao.status==='Resolvido'?'resolvida':'em investigação'}${hist[0].investigacao&&hist[0].investigacao.motivo?' · '+esc(hist[0].investigacao.motivo):''}</span></div>`:''}
    <div class="kv"><span>Conferência</span><b class="num">${esc(V.num)} · ${alxDH(V.em)}</b><span>Conferente</span><b>${esc(V.quem)}</b><span>Físico contado</span><b class="num" style="font-size:17px">${alxN(V.fis)}</b></div>
    ${fc?`<div class="sub" style="margin:0;font-size:12px">Referência do Focco (saldo importado ${esc(String(fc.em).replace('T',' ').slice(0,16))}): Almox 3 <b class="num">${alxN(fc.a3)}</b> · Almox 30 <b class="num">${alxN(fc.a30)}</b>${!alxFisico3(V.loc)&&V.loc==='a30'?` <button class="lnk" data-act="alx-vs-focco" style="padding:0">usar</button>`:''}</div>`:''}
    ${alxFisico3(V.loc)?`<div class="two" style="gap:10px"><label><span class="sub">Saldo ${esc(V.lbl)} — Empresa 1</span><input class="txt num" data-alx-vs="e1" inputmode="numeric" value="${esc(V.e1)}" style="font-size:18px;font-weight:700"></label><label><span class="sub">Saldo ${esc(V.lbl)} — Empresa 9</span><input class="txt num" data-alx-vs="e9" inputmode="numeric" value="${esc(V.e9)}" style="font-size:18px;font-weight:700"></label></div><div class="sub" style="margin:-4px 0 0;font-size:12px">Almox 3, Rejunte e Separação são o mesmo almoxarifado físico: a soma das duas empresas é comparada com o contado.</div>`
      :`<label><span class="sub">Saldo ${esc(V.lbl)} no sistema</span><input class="txt num" data-alx-vs="un" inputmode="numeric" value="${esc(V.un)}" style="font-size:18px;font-weight:700"></label>`}
    <div id="alx-vs-res">${alxVsRes()}</div>
    <div id="alx-vs-inv" ${div?'':'hidden'}><div class="two" style="gap:10px"><label><span class="sub">Motivo da divergência</span><select class="txt" data-alx-vs="mot"><option value="">Escolha…</option>${ALX_MOTIVOS.map(m=>`<option ${V.mot===m?'selected':''}>${esc(m)}</option>`).join('')}</select></label>
      <label><span class="sub">Observação</span><input class="txt" data-alx-vs="obs" value="${esc(V.obs)}"></label></div></div>
    ${inv&&inv.status!=='Resolvido'?`<div class="sub" style="margin:0;font-size:12px;color:var(--crit-ink)">Em investigação desde ${alxDH(ex.em)}. Para encerrar: preencha a observação final e toque em “Marcar resolvido”.</div>`:inv?`<div class="sub" style="margin:0;font-size:12px">Investigação resolvida em ${alxDH(inv.resolvidoEm)} por ${esc(alxQuem(inv.resolvidoPor,inv.resolvidoPorNome))}. Salvar de novo guarda a versão anterior no histórico.</div>`:ex?'<div class="sub" style="margin:0;font-size:12px">Já auditado. Salvar de novo guarda a versão anterior no histórico.</div>':''}
    <div class="pvact">${inv&&inv.status!=='Resolvido'?`<button class="btn sec" data-act="alx-vs-resolver" ${A.salvando?'disabled':''}>Marcar resolvido</button>`:''}<button class="btn" data-act="alx-vs-salvar" ${A.salvando?'disabled':''}>${ic('check',18,2.2)}Salvar</button></div>
   </div></div></div>`; }
function alxVsRes(){ const V=S.alx.a.vs; const L=alxVsLeitura(); if(!L) return ''; if(L.tot===V.fis) return '<div class="av" style="background:var(--ok-tint);margin:0"><b style="color:var(--ok-ink)">✓ Saldo validado</b><span>O sistema bate com o físico.</span></div>';
  const d=V.fis-L.tot; return `<div class="av crit" style="margin:0"><b>Divergência encontrada (${d>0?'+':''}${alxN(d)})</b><span>Sistema ${alxN(L.tot)} × físico ${alxN(V.fis)}. Escolha o motivo para abrir a investigação.</span></div>`; }
async function alxAudGravar(key,dados,ant){ // nunca apaga: a versão anterior vai para hist
  const d=Object.assign({},dados); if(ant){ const {_id,hist,...resto}=ant; d.hist=[...(hist||[]),{em:resto.em,por:resto.por||null,porNome:resto.porNome||'',saldoInformado:resto.saldoInformado,resultado:resto.resultado,investigacao:resto.investigacao||null}].slice(-15); }
  await S.db.doc('auditorias/'+key).set(d); }
function alxAudBase(V,L,div,inv){ return {key:V.key,numConf:V.num,cod:V.cod,nome:V.nome,almoxarifado:V.lbl,loc:V.loc,saldoFisico:V.fis,saldoInformado:L.tot,saldoInformadoEmpresa1:L.e1,saldoInformadoEmpresa9:L.e9,resultado:div?'Divergência':'Validado',por:S.uid||null,em:new Date().toISOString(),investigacao:div?inv:null,origem:'painel'}; }
document.addEventListener('input',ev=>{ const t=ev.target; const A=S.alx.a;
  if(t.dataset&&t.dataset.alxVs&&A.vs){ const k=t.dataset.alxVs; A.vs[k]=(k==='e1'||k==='e9'||k==='un')?t.value.replace(/\D/g,''):t.value; if((k==='e1'||k==='e9'||k==='un')&&t.value!==A.vs[k]) t.value=A.vs[k];
    const r=$('#alx-vs-res'); if(r) r.innerHTML=alxVsRes(); const L=alxVsLeitura(); const i=$('#alx-vs-inv'); if(i) i.hidden=!(L&&L.tot!==A.vs.fis); return; }
  if(['alx-abusca','alx-aconf','alx-aconfer'].includes(t.id)){ const k={'alx-abusca':'busca','alx-aconf':'conf','alx-aconfer':'confer'}[t.id]; A[k]=t.value; clearTimeout(A._t); A._t=setTimeout(()=>{ const p=t.selectionStart, id=t.id; render(); const i=document.getElementById(id); if(i){ i.focus(); try{ i.setSelectionRange(p,p); }catch(e){} } },250); } });
document.addEventListener('change',ev=>{ const t=ev.target, A=S.alx.a;
  if(t.dataset&&t.dataset.alxVs==='mot'&&A.vs){ A.vs.mot=t.value; return; }
  if(t.id==='alx-aloc'){ A.loc=t.value; render(); return; } if(t.id==='alx-agrupo'){ A.grupo=t.value; render(); return; } if(t.id==='alx-aagr'){ A.agr=t.checked; render(); return; }
  if(t.dataset&&t.dataset.alxAsel){ const c=t.dataset.alxAsel; A.selec=t.checked?[...new Set([...A.selec,c])]:A.selec.filter(x=>x!==c); A.confExcl=false; render(); return; } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="alx-a"],[data-act^="alx-vs"],[data-act="alx-fila"],[data-act="alx-tl"],[data-act="alx-ajuste"],[data-act="alx-reconta"],[data-act="alx-excluir"],[data-act="alx-abrir-conf"],[data-act^="alx-ficha"]'); if(!b||b.disabled) return;
  const X=S.alx, A=X.a, act=b.dataset.act, P=acsP(); if(!P) return;
  if(act==='alx-asit'){ A.sit=b.dataset.v; render(); return; }
  if(act==='alx-aord'){ A.ord=b.dataset.v; render(); return; }
  if(act==='alx-alog'){ A.log=!A.log; render(); return; }
  if(act==='alx-aficha'){ if(ev.target.closest('input')) return; A.ficha=b.dataset.c; A.modo=null; render(); return; }
  if(act==='alx-ficha-x'){ if(ev.target!==b&&!b.dataset.x) return; A.ficha=null; A.modo=null; render(); return; }
  if(act==='alx-tl'){ A.tl[b.dataset.c]=!A.tl[b.dataset.c]; render(); return; }
  if(act==='alx-aexp'){ alxExportar(); return; }
  if(!P.auditar){ if(act==='alx-vs') toast('Só quem pode auditar valida saldo.'); return; }
  if(act==='alx-vs'){ alxVsAbrir(b.dataset.n,b.dataset.c,b.dataset.l); return; }
  if(act==='alx-vs-x'){ if(ev.target!==b&&!b.dataset.x) return; A.vs=null; render(); return; }
  if(act==='alx-vs-focco'){ const fc=alxFocco(A.vs.cod); if(fc){ A.vs.un=String(Math.round(fc.a30)); render(); } return; }
  if(act==='alx-amodo'){ A.modo=b.dataset.k?{k:b.dataset.k,m:b.dataset.m}:null; render(); return; }
  if(act==='alx-amass-limpar'){ A.selec=[]; A.confExcl=false; render(); return; }
  if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
  const em=new Date().toISOString();
  if(act==='alx-fila'){ try{ await S.db.doc('alxfila/'+b.dataset.k).set({estado:b.dataset.e,por:S.uid||null,em}); toast(b.dataset.e==='aberta'?'Auditoria aberta.':b.dataset.e==='descartada'?'Contagem tirada da fila de auditoria.':'Abertura cancelada.'); }catch(e){ erro(e); } return; }
  if(act==='alx-abrir-conf'){ const c=X.conferencias.find(x=>x.numero===b.dataset.n); if(!c) return; let n=0;
    for(const l of alxLinhasVis(c)){ const key=alxKey(c.numero,l.cod,l.loc); if(alxAudMapa()[key]||alxFilaEst(key)==='descartada'||alxFilaEst(key)==='aberta') continue; try{ await S.db.doc('alxfila/'+key).set({estado:'aberta',por:S.uid||null,em}); n++; }catch(e){ erro(e); break; } }
    toast(n?'Auditoria aberta para '+n+' item(ns).':'Nada pendente nesta conferência.'); if(n){ A.conf=c.numero; A.sit='pend'; go('alxaud'); } return; }
  if(act==='alx-amass-abrir'){ const pd=alxPend(); let n=0; for(const cod of A.selec){ for(const p of (pd[cod]||[])){ if(alxFilaEst(p.key)==='aberta') continue; try{ await S.db.doc('alxfila/'+p.key).set({estado:'aberta',por:S.uid||null,em}); n++; }catch(e){ erro(e); } } }
    toast(n?'Auditoria aberta para '+n+' contagem(ns).':'Os itens marcados não têm contagem pendente.'); A.selec=[]; render(); return; }
  if(act==='alx-amass-excl'){ const pr=alxRegsPorItem(); const alvos=A.selec.map(c=>(pr[c]||[])[0]).filter(r=>r&&r.investigacao&&r.investigacao.status!=='Resolvido');
    if(!alvos.length){ toast('Nenhum item marcado tem divergência em aberto.'); return; } if(!A.confExcl){ A.confExcl=true; render(); return; }
    for(const r of alvos){ try{ await S.db.doc('auditorias/'+r._id).update({excluida:{em,por:S.uid||null,motivo:'exclusão em massa'}}); }catch(e){ erro(e); break; } }
    toast(alvos.length+' divergência(s) excluída(s).'); A.selec=[]; A.confExcl=false; render(); return; }
  if(act==='alx-vs-salvar'||act==='alx-vs-resolver'){ const V=A.vs; const L=alxVsLeitura(); if(!L){ toast(alxFisico3(V.loc)?'Informe os dois saldos (Empresa 1 e Empresa 9).':'Informe o saldo do sistema.'); return; }
    const div=L.tot!==V.fis; const ex=alxAudMapa()[V.key]; const invA=ex&&ex.investigacao;
    let inv=null;
    if(act==='alx-vs-resolver'){ if(!invA){ toast('Não há investigação em aberto.'); return; } if(!String(V.obs||'').trim()){ toast('Escreva a observação final antes de marcar resolvido.'); return; }
      inv={motivo:V.mot||invA.motivo,observacao:invA.observacao||'',status:'Resolvido',resolvidoPor:S.uid||null,resolvidoEm:em,obsFinal:String(V.obs).trim()}; }
    else if(div){ if(!V.mot){ toast('Escolha o motivo da divergência.'); return; } inv={motivo:V.mot,observacao:String(V.obs||'').trim(),status:'Em Investigação'}; }
    A.salvando=true; render();
    try{ await alxAudGravar(V.key,alxAudBase(V,L,div||act==='alx-vs-resolver',inv),ex); toast(act==='alx-vs-resolver'?'Investigação resolvida.':div?'Divergência registrada — em investigação.':'Saldo validado.'); A.vs=null; }catch(e){ erro(e); }
    A.salvando=false; render(); return; }
  if(act==='alx-ajuste'){ const r=X.auditorias.find(x=>x._id===b.dataset.k); const v=parseInt(String(($('#alx-aj-saldo')||{}).value||'').replace(/\D/g,''),10); if(!r) return; if(isNaN(v)){ toast('Informe o novo saldo do sistema.'); return; }
    const d=Object.assign({},r,{investigacao:{motivo:ALX_MOT_ERP,observacao:(r.investigacao&&r.investigacao.observacao)||'',status:'Resolvido',resolvidoPor:S.uid||null,resolvidoEm:em,saldoAjustado:v,obsFinal:String(($('#alx-aj-obs')||{}).value||'').trim()}}); delete d._id; delete d.hist;
    try{ await alxAudGravar(r._id,d,r); toast('Sistema ajustado para '+alxN(v)+'.'); A.modo=null; }catch(e){ erro(e); } render(); return; }
  if(act==='alx-reconta'){ const r=X.auditorias.find(x=>x._id===b.dataset.k); const v=parseInt(String(($('#alx-rc-q')||{}).value||'').replace(/\D/g,''),10); if(!r) return; if(isNaN(v)){ toast('Informe a quantidade recontada.'); return; }
    const fech=Object.assign({},r,{investigacao:{motivo:ALX_MOT_REC,observacao:(r.investigacao&&r.investigacao.observacao)||'',status:'Resolvido',resolvidoPor:S.uid||null,resolvidoEm:em,obsFinal:'Recontagem apurou '+v+' (contagem original: '+r.saldoFisico+')'}}); delete fech._id; delete fech.hist;
    const bate=v===+r.saldoInformado; const nk=(r.key||r._id).replace(/_rc\d+$/,'')+'_rc'+Date.now();
    const novo={key:nk,numConf:r.numConf,cod:r.cod,nome:r.nome,almoxarifado:r.almoxarifado,loc:r.loc,saldoFisico:v,saldoInformado:r.saldoInformado,saldoInformadoEmpresa1:r.saldoInformadoEmpresa1!=null?r.saldoInformadoEmpresa1:null,saldoInformadoEmpresa9:r.saldoInformadoEmpresa9!=null?r.saldoInformadoEmpresa9:null,
      resultado:bate?'Validado':'Divergência',por:S.uid||null,em:new Date(Date.now()+1000).toISOString(),investigacao:bate?null:{motivo:'Erro de contagem',observacao:'Divergiu de novo depois da recontagem',status:'Em Investigação'},recontagemDe:r._id,origem:'painel'};
    try{ await alxAudGravar(r._id,fech,r); await S.db.doc('auditorias/'+nk).set(novo); toast(bate?'Recontagem validada com o sistema.':'A recontagem ainda diverge: nova investigação aberta.'); A.modo=null; }catch(e){ erro(e); } render(); return; }
  if(act==='alx-excluir'){ const r=X.auditorias.find(x=>x._id===b.dataset.k); if(!r) return; try{ await S.db.doc('auditorias/'+r._id).update({excluida:{em,por:S.uid||null,motivo:String(($('#alx-ex-mot')||{}).value||'').trim()}}); toast('Auditoria excluída (fica no registro de exclusões).'); A.modo=null; }catch(e){ erro(e); } render(); return; }
});
document.addEventListener('keydown',ev=>{ if(ev.key!=='Escape') return; const A=S.alx.a; if(A.vs){ A.vs=null; render(); } else if(A.ficha){ A.ficha=null; A.modo=null; render(); } });
async function alxExportar(){ const dl=await anlDl(); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  try{ await carregarScript(ANL_XLSX); const XL=window.XLSX, wb=XL.utils.book_new(); const F=alxAudFiltrada();
    const aoa=[['Código','Descrição','Situação','Auditorias','Divergências','Local','Físico','Sistema','Diferença','Conferente','Última auditoria','Sistema ajustado em','Saldo Focco A3','Saldo Focco A30']];
    F.xs.forEach(cod=>{ const regs=F.porItem[cod]||[], pd=F.pend[cod]||[], r0=regs[0], it=itemDe(cod), fc=alxFocco(cod); const aj=regs.find(r=>r.investigacao&&r.investigacao.status==='Resolvido'&&r.investigacao.motivo===ALX_MOT_ERP);
      const sit=!regs.length&&!pd.length?'Nunca auditado':pd.length?'Contado, não auditado':!r0.investigacao?'Validado':r0.investigacao.status==='Resolvido'?'Resolvido':'Em investigação';
      aoa.push([cod,(r0&&r0.nome)||(it&&it.descricao)||'',sit,regs.length,regs.filter(r=>r.resultado==='Divergência').length,r0?r0.almoxarifado:(pd[0]?pd[0].lbl:''),r0?r0.saldoFisico:'',r0?r0.saldoInformado:'',r0&&r0.saldoInformado!=null?(+r0.saldoFisico||0)-(+r0.saldoInformado||0):'',r0?alxConferenteDe(r0):(pd[0]?pd[0].quem:''),r0?alxDH(r0.em):'',aj?alxDH(aj.investigacao.resolvidoEm):'',fc?fc.a3:'',fc?fc.a30:'']); });
    XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(aoa),'Auditoria por item');
    const det=[['Data','Conferência','Código','Descrição','Local','Físico','Sistema','Empresa 1','Empresa 9','Resultado','Motivo','Situação','Auditou','Resolvido por','Resolvido em','Conclusão']];
    S.alx.auditorias.filter(a=>!a.excluida&&alxVeLoc(a.loc)).forEach(a=>{ const i=a.investigacao||{}; det.push([alxDH(a.em),a.numConf,a.cod,a.nome,a.almoxarifado,a.saldoFisico,a.saldoInformado,a.saldoInformadoEmpresa1??'',a.saldoInformadoEmpresa9??'',a.resultado,i.motivo||'',i.status||'',alxQuem(a.por,a.porNome),i.status==='Resolvido'?alxQuem(i.resolvidoPor,i.resolvidoPorNome):'',i.resolvidoEm?alxDH(i.resolvidoEm):'',i.obsFinal||'']); });
    XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(det),'Todas as auditorias');
    await dl.save({filename:'auditoria_estoque_'+hojeStr()+'.xlsx',data:new Blob([XL.write(wb,{type:'array',bookType:'xlsx'})])}); }
  catch(e){ console.warn('alx exp',e); toast('Não foi possível gerar o Excel.'); } }

// ---------- aviso no Meu dia ----------
function alxAvisoMeuDia(){ const P=acsP(); if(!P||!(P.tudo||P.mods.includes('almox'))||!P.auditar) return ''; const X=S.alx;
  const inv=X.auditorias.filter(a=>!a.excluida&&a.investigacao&&a.investigacao.status!=='Resolvido'&&alxVeLoc(a.loc)).length; const rec=X.recebimentos.filter(r=>!r.apontado).length; const pd=Object.values(alxPend()).reduce((a,v)=>a+v.length,0);
  if(!inv&&!rec&&!pd) return '';
  return `<div class="av warn"><b>Almoxarifado</b><span>${[pd?pd+' contage'+(pd===1?'m':'ns')+' sem auditoria':'',inv?inv+' investigaç'+(inv===1?'ão aberta':'ões abertas'):'',rec?rec+' recebimento'+(rec===1?'':'s')+' sem apontar':''].filter(Boolean).join(' · ')}</span><button class="lnk" data-go="${pd||inv?'alxaud':'alxrec'}">Abrir</button></div>`; }

// ---------------- conexão ----------------
function inscrever(nome,mk,on){ let tent=0, unsub=null;
  const vai=()=>{ try{ unsub=mk().onSnapshot(snap=>{ tent=0; if(S.dbErro&&S.dbErro.k===nome){ S.dbErro=null; rerenderSeguro(); } on(snap); },
      e=>{ const code=(e&&e.code)||'erro'; console.warn('db',nome,code,e&&e.message); try{ unsub&&unsub(); }catch(_){}
        tent++; S.dbErro={k:nome,code};
        if(tent<=6){ setTimeout(vai,Math.min(30000,2000*tent)); rerenderSeguro(); } else { S.dbOk=false; rerenderSeguro(); } }); }
    catch(e){ S.dbErro={k:nome,code:(e&&e.code)||'erro'}; tent++; if(tent<=6) setTimeout(vai,2000*tent); else { S.dbOk=false; rerenderSeguro(); } } };
  vai(); }
function assinar(col,key,lim){
  inscrever(col,()=>S.db.collection(col).limit(lim),snap=>{
    S[key]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x && (x.em||x.criadaEm||x.inicio));
    resolverNomes(); rerenderSeguro(); });
}
function assinarQ(mk,key){
  inscrever(key,mk,snap=>{ S[key]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&typeof x==='object');
    if(key==='_entViva'||key==='_entArq'){ const m=new Map(); (S._entArq||[]).forEach(d=>(d.l||[]).forEach(e=>{ if(e&&e._id) m.set(e._id,e); })); (S._entViva||[]).forEach(e=>m.set(e._id,e)); S.entregas=[...m.values()]; }
    if(key==='_ordA'||key==='_ordB'){ const m=new Map(); (S._ordB||[]).forEach(o=>m.set(o._id,o)); (S._ordA||[]).forEach(o=>m.set(o._id,o)); S.ordens=[...m.values()]; }
    resolverNomes(); rerenderSeguro(); });
}
async function resolverNomes(){
  if(!S.user) return; const ids=new Set();
  [...S.medicoes,...S.premix,...S.cargas,...S.paradas,...S.entregas].forEach(x=>{ if(x.por) ids.add(x.por); }); S.ordens.forEach(o=>(o.hist||[]).forEach(h=>{ if(h.por) ids.add(h.por); }));
  const falta=[...ids].filter(i=>!(i in S.nomes)); if(!falta.length) return;
  try{ const ps=await S.user.profiles(falta); falta.forEach(i=>{ S.nomes[i]=(ps&&ps[i]&&ps[i].name)||''; }); rerenderSeguro(); }catch(e){}
}
/* ---- LEITURAS POR PERFIL (08/10) ----
   Antes, todo login abria ~20 listas de até 1.000 documentos (o banco quase inteiro), e a cota grátis do Firestore
   (50 mil leituras/dia) acabava. Agora cada grupo de dados só é assinado por quem tem um módulo que usa esse grupo.
   Administradora, "tudo" e módulos desconhecidos continuam carregando tudo. */
const LEIT_CONHECIDOS=['inicio','silos','producao','tv','telas','cal','paradas','analise','almox','ajustes','manut','premix','silosver','tablet'];
const LEIT_GRUPOS={
  prod:['inicio','silos','producao','tv','telas','cal','paradas','analise','almox','ajustes','premix'], /* ordens, entregas, itens, previsões, análise */
  silos:['inicio','silos','producao','tv','telas','cal','analise','silosver'],                                    /* medições, premix, cargas */
  paradas:['inicio','silos','producao','tv','telas','paradas','analise'],                                 /* paradas (histórico) */
  chamados:['inicio','producao','paradas','tv','telas','manut','tablet'],                                         /* chamados de manutenção */
  diario:['inicio','producao','paradas','almox','premix','tv','telas'],                                           /* diário de bordo e ranchos */
  alx:['inicio','producao','almox','premix','ajustes'],                                                           /* inventário */
  pmx:['inicio','producao','almox','premix']                                                                       /* premix */
};
function leitPrecisa(g){ const A=S.acs; if(!A||!A.pronto) return false; if(A.dono) return true; let p=null; try{ p=acsP(); }catch(e){} if(!p) return false; if(p.tudo) return true;
  const m=p.mods||[]; if(m.some(x=>!LEIT_CONHECIDOS.includes(x))) return true; return (LEIT_GRUPOS[g]||[]).some(x=>m.includes(x)); }
const _leit={};
function assinaPorPerfil(db){ if(!db||!S.acs||!S.acs.pronto) return; const vez=(k,f)=>{ if(_leit[k]) return; _leit[k]=true; try{ f(); }catch(e){ _leit[k]=false; console.warn('[leituras]',k,e); } };
  const fil=key=>snap=>{ S[key]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&(x.em||x.criadaEm||x.inicio)); resolverNomes(); rerenderSeguro(); };
  if(leitPrecisa('prod')){ vez('anl',()=>anlAssinar(db));
    vez('ordens',()=>{ assinarQ(()=>db.collection('ordens').where('status','==','aberta').limit(1000),'_ordA'); assinarQ(()=>db.collection('ordens').orderBy('data','desc').limit(1000),'_ordB'); });
    vez('itens',()=>assinarQ(()=>db.collection('itens').limit(1000),'itens')); vez('previsoes',()=>assinarQ(()=>db.collection('previsoes').limit(1000),'previsoes'));
    vez('entregas',()=>{ assinarQ(()=>db.collection('entregas').orderBy('em','desc').limit(1000),'_entViva'); assinarQ(()=>db.collection('entregasarq').limit(500),'_entArq'); }); }
  if(leitPrecisa('silos')){ /* mais recentes primeiro (antes vinham 1.000 quaisquer) */
    vez('medicoes',()=>inscrever('medicoes',()=>db.collection('medicoes').orderBy('em','desc').limit(1000),fil('medicoes')));
    vez('premix',()=>assinar('premix','premix',500));
    vez('cargas',()=>inscrever('cargas',()=>S.db.collection('cargas').orderBy('criadaEm','desc').limit(1000),snap=>{ S.cargas=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&(x.em||x.criadaEm||x.inicio)); resolverNomes(); rerenderSeguro(); })); }
  if(leitPrecisa('paradas')) vez('paradas',()=>inscrever('paradas',()=>db.collection('paradas').orderBy('inicio','desc').limit(1000),fil('paradas')));
  else if(leitPrecisa('chamados')){ const n=S.acs&&acsP()&&(acsP().mods||[]).includes('manut')?200:60; /* manutenção e tablet: só as recentes (ligar/fechar a parada do chamado) */
    vez('paradas',()=>inscrever('paradas',()=>db.collection('paradas').orderBy('inicio','desc').limit(n),fil('paradas'))); }
  if(leitPrecisa('chamados')) vez('chamados',()=>inscrever('chamados',()=>db.collection('chamados').orderBy('numero','desc').limit(300),snap=>{ S.chamados=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>x&&typeof x==='object'); S._chamLido=true; resolverNomes(); rerenderSeguro(); }));
  if(leitPrecisa('diario')) vez('diario',()=>{ assinarQ(()=>db.collection('diario').limit(1000),'diario'); assinarQ(()=>db.collection('ranchos').orderBy('criadoEm','desc').limit(1000),'ranchos'); });
  if(leitPrecisa('alx')) vez('alx',()=>alxAssinar(db));
  if(leitPrecisa('pmx')) vez('pmx',()=>pmxAssinar(db)); }
async function iniciar(){
  tick(); setInterval(()=>{ tick(); rerenderSeguro(); },30000);
  render();
  if(!window.claude||!window.claude.use){ S.dbOk=false; S.dbMotivo='página aberta fora do Claude'; render(); return; }
  const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);
  S.user=user; S.acsUserOk=!!user;
  if(user){ try{ S.uid=await user.id(); const me=await user.me(); const nm=(me&&me.name)||''; if(S.uid) S.nomes[S.uid]=nm; $('#qn').textContent=nm||'PCP'; $('#avatar').textContent=(nm||'PCP').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(); }catch(e){} }
  acsIniciar(db,user);
  if(!db){ S.dbOk=false; S.dbMotivo='o armazenamento não respondeu nesta visualização'; render(); return; }
  S.db=db; S.dbOk=true;
  db.doc('sistema/importacao').onSnapshot(s=>{ S.sisImp=s.exists?s.data():null; rerenderSeguro(); },()=>{});
  db.doc('config/geral').onSnapshot(s=>{ if(s.exists){ const c=s.data(); S.cfg=Object.assign(JSON.parse(JSON.stringify(CFG_PADRAO)),c); rerenderSeguro(); } },()=>{});
  db.doc('config/feriados').onSnapshot(s=>{ S.ferCal=s.exists?s.data():{}; if(S.anl) S.anl._c=null; rerenderSeguro(); },()=>{}); /* calendário de feriados (RH + produção) */
  assinaPorPerfil(db); setInterval(()=>assinaPorPerfil(db),400); /* cada login carrega só o que usa (cota grátis do Firebase) */
  render();
}
// ================= BARRA DO TOPO: busca geral, avisos, ações rápidas, conexão, atalhos =================
P.sino='<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>';
S.tp={pop:null,q:'',sel:0};
function tpAvisos(){ const out=[], h=hojeStr(), dono=!!(S.acs&&S.acs.dono), ok=v=>{ try{ return viewOk(v); }catch(e){ return false; } };
  const add=(n,t,s,acao,c)=>{ if(n>0) out.push({n,t,s,acao,c:c||'warn'}); };
  if(dono){ const A=S.acs; const pend=(A.pedidos||[]).filter(p=>!(A.lista||[]).some(l=>l._id===p._id)).length; add(pend,'Pedido'+(pend>1?'s':'')+' de acesso','Alguém abriu o painel e espera liberação','acessos','crit'); }
  if(ok('programacao')){ const ab=ordAbertas(); const atr=ab.filter(o=>ordAtras(o,h)).length; add(atr,atr>1?'Ordens atrasadas':'Ordem atrasada','Programadas para dias que já passaram','atrasadas','crit');
    const se=ab.filter(o=>faltaEns(o)).length; add(se,'Sem ordem de ensacado','Rejunte flexível/siliconizado sem o nº do ensacado','semens');
    const d=S._div; const nd=d?(d.n||0)+(d.pend||[]).length:0; add(nd,'Divergência'+(nd>1?'s':'')+' com o sistema','Ordem aberta/encerrada ou pendente diferente do Focco','div');
    const sl=S.ordens.filter(o=>o.status==='aberta'&&!o.linha).length; add(sl,'Ordem'+(sl>1?'s':'')+' sem linha','Importadas e ainda não programadas','aprogramar'); }
  if(ok('calendario')||ok('programacao')){ const pv=(S.previsoes||[]).filter(p=>p.status==='prevista'&&p.data&&p.data<h).length; add(pv,'Previs'+(pv>1?'ões':'ão')+' com data vencida','Planejadas sem ordem para dias que já passaram: confirmar, mover ou apagar','prevvelhas'); }
  if(ok('paradas')){ const pa=(S.paradas||[]).filter(p=>!p.fim).length; add(pa,'Parada'+(pa>1?'s':'')+' em andamento','Linha parada agora','paradas','crit'); }
  if(ok('pmxfichas')&&S.pmx&&pmxPodeEd()){ const pf=S.pmx.fichas.filter(f=>pmxPendSis(f)&&pmxEnc(f)).length; add(pf,'Premix feito para apontar','O almoxarifado marcou como feita: falta apontar no sistema','pmxpend'); }
  if(dono&&S.dbOk===true){ const em=S.cfg&&S.cfg.backupEm; const dd=em?Math.floor((Date.now()-new Date(em))/864e5):999; if(dd>=7) out.push({n:'',t:'Backup',s:em?'Último há '+dd+' dias. Faça toda segunda-feira.':'Nenhum backup ainda.',acao:'backup',c:'warn'}); }
  if(ok('anlbase')){ const a=((S.anl&&S.anl.base&&S.anl.base.itens)||{}).atual||{}; const sd=a.SALDO?String(a.SALDO).slice(0,10):''; if(sd&&sd<h&&anlUtil(h)) out.push({n:'',t:'Saldo do Focco de '+dm(sd),s:'Importe o saldo e o perfil de hoje para a Análise PCP ficar certa','acao':'anlbase',c:'warn'}); }
  return out; }
function tpIr(acao){ const O=S.ord; S.tp.pop=null;
  if(acao==='acessos'){ go('acessos'); return; }
  if(acao==='atrasadas'){ go('calendario'); return; }
  if(acao==='semens'||acao==='div'){ O.linha='todas'; O.mostrar='abertas'; O.busca=''; go('programacao'); setTimeout(()=>{ const e=document.querySelector(acao==='div'?'.divbox,[data-act="o-div-ir"]':'.pill.crit,.ensreq'); e&&e.scrollIntoView({block:'center',behavior:'smooth'}); },80); return; }
  if(acao==='aprogramar'||acao==='prevvelhas'){ go('aprogramar'); return; }
  if(acao==='paradas'){ go('paradas'); return; }
  if(acao==='pmxpend'){ go('pmxfichas'); setTimeout(()=>{ const c=$('#pmx-pend'); c&&c.scrollIntoView({block:'start',behavior:'smooth'}); },80); return; }
  if(acao==='backup'){ go('anlbase'); setTimeout(()=>{ const b=document.querySelector('[data-act="anl-bkp"]'); b&&b.scrollIntoView({block:'center',behavior:'smooth'}); },80); return; }
  if(acao==='anlbase'){ go('anlbase'); return; } }
function tpNorm(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
function tpBusca(q){ q=tpNorm(q).trim(); if(q.length<2) return []; const ws=q.split(/\s+/), bate=t=>{ const x=tpNorm(t); return ws.every(w=>x.includes(w)); }, ok=v=>{ try{ return viewOk(v); }catch(e){ return false; } }, r=[];
  if(ok('programacao')||ok('calendario')){ S.ordens.filter(o=>o.status!=='excluida'&&bate([o.num,o.produto,o.rancho,o.ensaca,o.linha].join(' '))).sort((a,b)=>(a.status==='aberta'?0:1)-(b.status==='aberta'?0:1)||String(b.data||'').localeCompare(String(a.data||''))).slice(0,8)
      .forEach(o=>r.push({g:'Ordens',t:'Ordem '+o.num+' · '+codigoDe(o),s:nomeCurto(o)+' · '+(o.linha||'sem linha')+(dataEf(o)?' · '+dm(dataEf(o)):'')+(o.rancho?' · rancho '+o.rancho:'')+(o.status!=='aberta'?' · '+o.status:''),k:'o',id:o._id}));
    (S.previsoes||[]).filter(p=>p.status==='prevista'&&bate([p.produto,p.codigo,p.linha].join(' '))).slice(0,4).forEach(p=>r.push({g:'Previsões',t:(p.codigo||'')+' · '+fq(+p.qtd||0),s:nomeCurto({produto:p.produto})+' · '+(p.linha||'')+' · '+dm(p.data),k:'pv',id:p._id})); }
  if(ok('pmxfichas')&&S.pmx){ S.pmx.fichas.filter(f=>f.status!=='excluida'&&bate([f.num,f.numProv,f.material,f.rancho,f.ordemRef].join(' '))).slice(0,5).forEach(f=>r.push({g:'Fichas de premix',t:pmxOp(f)+' · '+f.material,s:dataBR(f.data)+' · '+pmxF(pmxNum(f.qtd))+' premix'+(pmxEnc(f)?' · feita':''),k:'pmx',id:f._id,q:pmxOp(f)}));
    (S.pmx.rec||[]).filter(x=>x.ativo!==false&&bate(x.nome)).slice(0,3).forEach(x=>r.push({g:'Receitas de premix',t:x.nome,s:'Batelada '+(x.batelada||'—')+' kg',k:'rec',id:x._id})); }
  if(ok('anlest')){ const R=anlDados(); if(R) R.itens.filter(x=>bate(x.c+' '+x.d)).slice(0,5).forEach(x=>r.push({g:'Itens (Análise)',t:x.c,s:x.d,k:'it',id:x.c})); }
  return r; }
function tpAbrir(x){ S.tp.pop=null; tpFechaPop();
  if(x.k==='o'){ const o=ordById(x.id); if(!o) return; const O=S.ord; O.busca=''; O.de=''; O.ate=''; O.linha=o.linha||'todas'; O.mostrar=o.status==='aberta'?'abertas':'todas'; O.aberta=o._id; O.f={}; O.painel=o.status==='aberta'?'entrega':'editar'; go(o.linha?'programacao':'aprogramar'); return; }
  if(x.k==='pv'){ const p=(S.previsoes||[]).find(y=>y._id===x.id); go('calendario'); if(p&&p.data) setTimeout(()=>{ const c=document.querySelector(`[data-card="pv:${CSS.escape(p._id)}"]`); if(c){ c.scrollIntoView({block:'center',behavior:'smooth'}); c.classList.add('tp-flash'); } },100); return; }
  if(x.k==='pmx'){ S.pmx.busca=x.q||''; go('pmxfichas'); return; }
  if(x.k==='rec'){ S.pmx.rbusca=''; go('pmxrec'); const r=S.pmx.rec.find(y=>y._id===x.id); if(r){ S.pmx.red=JSON.parse(JSON.stringify(r)); S.pmx.red.itens=pmxEmG(S.pmx.red.itens); render(); } return; }
  if(x.k==='it'){ S.anl.item=x.id; S.anl.sug=null; go('anlest'); return; } }
function tpMais(){ const ok=v=>{ try{ return viewOk(v); }catch(e){ return false; } }, xs=[];
  if(ok('programacao')){ xs.push(['nova-ordem','Nova ordem','N']); xs.push(['apontar','Lançar apontamento','A']); }
  if(ok('calendario')||ok('programacao')) xs.push(['nova-prev','Nova previsão (planejada)','P']);
  if(ok('paradas')) xs.push(['parada','Registrar parada','']);
  if(ok('pmxfichas')) xs.push(['ficha','Nova ficha de premix','F']);
  return xs; }
function tpAcao(a){ S.tp.pop=null; tpFechaPop(); const L=linhasOrd();
  if(a==='nova-ordem'){ const O=S.ord; O.aberta=null; O.nova=true; O.nf={linha:O.linha&&O.linha!=='todas'?O.linha:L[0],data:hojeStr(),turno:'Dia todo',tipo:'ordem'}; go('programacao'); setTimeout(()=>{ const s=document.querySelector('[aria-label="Nova ordem"]'); s&&s.scrollIntoView({block:'center',behavior:'smooth'}); const n=$('#o-n-num'); n&&n.focus({preventScroll:true}); },80); return; }
  if(a==='apontar'){ S.apt={aberto:true,passo:'escolher',sel:[],v:{},gravando:false,linha:'todas',data:hojeStr(),atras:true,busca:''}; S.horaMan.apt=null; S.ord.nova=false; go('programacao'); setTimeout(()=>{ const p=document.querySelector('[data-act="md-apt-fechar"]'); p&&p.closest('section')&&p.closest('section').scrollIntoView({block:'start',behavior:'smooth'}); },80); return; }
  if(a==='nova-prev'){ S.pv.f={linha:L[0],data:amanhaStr()}; go('calendario'); setTimeout(()=>{ const e=$('#pv-prod'); if(e){ e.scrollIntoView({block:'center',behavior:'smooth'}); e.focus({preventScroll:true}); } },80); return; }
  if(a==='parada'){ go('paradas'); return; }
  if(a==='ficha'){ go('pmxfichas'); pmxNovaFicha(null); return; } }
function tpConex(){ const on=navigator.onLine!==false; if(!on||S.dbOk===false) return ['off','Sem conexão','Os registros não estão sendo gravados. Confira a internet e recarregue.']; if(S.dbOk===null) return ['wait','Conectando…','Ligando ao armazenamento compartilhado'];
  const t=S.tp.ult; return ['on',t?'Salvo '+hora(t):'Conectado',t?'Último registro gravado às '+hora(t):'Tudo o que você grava vai direto para o armazenamento']; }
function tpInit(){ const r=document.querySelector('.top-r'); if(!r||$('#tp')) return;
  const w=document.createElement('div'); w.id='tp'; w.className='tp';
  w.innerHTML=`<button class="tp-busca" id="tp-busca" title="Buscar ordem, rancho, ficha, receita ou item (atalho: /)">${ic('lupa',16,2)}<span>Buscar…</span><kbd>/</kbd></button>
   <button class="tp-ib" id="tp-mais" title="Ações rápidas">${ic('mais',18,2.2)}</button>
   <button class="tp-ib" id="tp-sino" title="Avisos">${ic('sino',18,2)}<b id="tp-n" hidden></b></button>
   <span class="tp-cx" id="tp-cx"><i></i><span></span></span>`;
  r.insertBefore(w,r.firstChild);
  const pop=document.createElement('div'); pop.id='tp-pop'; pop.className='tp-pop'; pop.hidden=true; document.body.appendChild(pop);
  document.addEventListener('click',ev=>{ const t=ev.target;
    if(t.closest('#tp-busca')){ tpTogglePop('busca'); return; } if(t.closest('#tp-sino')){ tpTogglePop('avisos'); return; } if(t.closest('#tp-mais')){ tpTogglePop('mais'); return; }
    const it=t.closest('[data-tp]'); if(it){ const k=it.dataset.tp, v=it.dataset.v; if(k==='aviso') tpIr(v); else if(k==='acao') tpAcao(v); else if(k==='res'){ const x=(S.tp.res||[])[+v]; if(x) tpAbrir(x); } return; }
    if(S.tp.pop&&!t.closest('#tp-pop')){ tpFechaPop(); } });
  document.addEventListener('input',ev=>{ if(ev.target.id!=='tp-q') return; S.tp.q=ev.target.value; S.tp.sel=0; tpResHtml(); });
  document.addEventListener('keydown',ev=>{ const a=document.activeElement, dig=a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable);
    if(ev.target.id==='tp-q'){ const n=(S.tp.res||[]).length;
      if(ev.key==='ArrowDown'){ ev.preventDefault(); S.tp.sel=Math.min(n-1,S.tp.sel+1); tpResHtml(); return; } if(ev.key==='ArrowUp'){ ev.preventDefault(); S.tp.sel=Math.max(0,S.tp.sel-1); tpResHtml(); return; }
      if(ev.key==='Enter'){ ev.preventDefault(); const x=(S.tp.res||[])[S.tp.sel]; if(x) tpAbrir(x); return; } }
    if(ev.key==='Escape'&&S.tp.pop){ tpFechaPop(); return; }
    if(dig||ev.ctrlKey||ev.metaKey||ev.altKey||document.body.classList.contains('tv')) return;
    const k=ev.key.toLowerCase(), mais=tpMais().map(x=>x[0]);
    if(ev.key==='/'){ ev.preventDefault(); tpTogglePop('busca',true); return; }
    if(k==='n'&&mais.includes('nova-ordem')){ ev.preventDefault(); tpAcao('nova-ordem'); return; }
    if(k==='a'&&mais.includes('apontar')){ ev.preventDefault(); tpAcao('apontar'); return; }
    if(k==='p'&&mais.includes('nova-prev')){ ev.preventDefault(); tpAcao('nova-prev'); return; }
    if(k==='f'&&mais.includes('ficha')){ ev.preventDefault(); tpAcao('ficha'); return; }
    if(k==='?'){ ev.preventDefault(); tpTogglePop('atalhos',true); return; } });
  window.addEventListener('online',tpAtualiza); window.addEventListener('offline',tpAtualiza);
  setInterval(tpAtualiza,60000); }
function tpFechaPop(){ S.tp.pop=null; const p=$('#tp-pop'); if(p){ p.hidden=true; p.innerHTML=''; } document.querySelectorAll('#tp [aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false')); }
function tpTogglePop(k,abrir){ if(S.tp.pop===k&&!abrir){ tpFechaPop(); return; } S.tp.pop=k; const p=$('#tp-pop'); if(!p) return; p.hidden=false; p.dataset.k=k;
  if(k==='busca'){ p.innerHTML=`<label class="tp-qw">${ic('lupa',18,2)}<input id="tp-q" class="txt" placeholder="Ordem, código, rancho, PMX, receita, material…" autocomplete="off" value="${esc(S.tp.q)}"></label><div id="tp-res"></div><div class="tp-dica">↑ ↓ para escolher · Enter abre · Esc fecha</div>`; tpResHtml(); const q=$('#tp-q'); q&&(q.focus(),q.select()); }
  else if(k==='avisos'){ const xs=tpAvisos(); p.innerHTML=`<div class="tp-h">Avisos</div>${xs.length?xs.map(x=>`<button class="tp-it" data-tp="aviso" data-v="${x.acao}"><span class="tp-dot ${x.c}">${x.n===''?'!':x.n}</span><span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button>`).join(''):'<div class="tp-vz">Nada pendente. Tudo em dia.</div>'}`; }
  else if(k==='mais'){ const xs=tpMais(); p.innerHTML=`<div class="tp-h">Ações rápidas</div>${xs.length?xs.map(([a,t,kk])=>`<button class="tp-it" data-tp="acao" data-v="${a}"><span class="tp-pl">${ic('mais',14,2.4)}</span><span><b>${esc(t)}</b></span>${kk?`<kbd>${kk}</kbd>`:''}</button>`).join(''):'<div class="tp-vz">Nenhuma ação disponível no seu acesso.</div>'}<div class="tp-dica">Atalhos: / buscar · ? ver todos</div>`; }
  else if(k==='atalhos'){ p.innerHTML=`<div class="tp-h">Atalhos de teclado</div>${[['/','Buscar'],['N','Nova ordem'],['A','Lançar apontamento'],['P','Nova previsão'],['F','Nova ficha de premix'],['Esc','Fechar'],['?','Esta lista']].map(([a,b])=>`<div class="tp-at"><kbd>${a}</kbd><span>${b}</span></div>`).join('')}<div class="tp-dica">Funcionam quando o cursor não está num campo de texto.</div>`; }
  const b=$(k==='busca'?'#tp-busca':k==='avisos'?'#tp-sino':'#tp-mais'); if(b) b.setAttribute('aria-expanded','true'); }
function tpResHtml(){ const el=$('#tp-res'); if(!el) return; const xs=tpBusca(S.tp.q); S.tp.res=xs; if(S.tp.sel>=xs.length) S.tp.sel=0;
  if(String(S.tp.q).trim().length<2){ el.innerHTML='<div class="tp-vz">Digite pelo menos 2 letras ou números.</div>'; return; }
  if(!xs.length){ el.innerHTML='<div class="tp-vz">Nada encontrado.</div>'; return; } let g='';
  el.innerHTML=xs.map((x,i)=>{ const hd=x.g!==g?`<div class="tp-g">${esc(x.g)}</div>`:''; g=x.g; return hd+`<button class="tp-it ${i===S.tp.sel?'on':''}" data-tp="res" data-v="${i}"><span><b>${esc(x.t)}</b><small>${esc(x.s||'')}</small></span></button>`; }).join('');
  const on=el.querySelector('.tp-it.on'); on&&on.scrollIntoView({block:'nearest'}); }
function tpGravou(){ S.tp.ult=new Date().toISOString(); const cx=$('#tp-cx'); if(cx){ const [c,t,ti]=tpConex(); cx.className='tp-cx '+c+' pulse'; cx.title=ti; cx.lastChild.textContent=t; setTimeout(()=>cx.classList.remove('pulse'),900); } }
function tpEmbrulhaDb(){ const db=S.db; if(!db||db.__tp) return; try{ db.__tp=true;
  const wrap=r=>{ if(!r||r.__tp) return r; ['set','update','delete','add'].forEach(m=>{ if(typeof r[m]==='function'){ const f=r[m].bind(r); r[m]=(...a)=>{ const pr=f(...a); return pr&&pr.then?pr.then(x=>{ tpGravou(); return x; }):pr; }; } }); r.__tp=true; return r; };
  const od=db.doc.bind(db), oc=db.collection.bind(db);
  db.doc=(...a)=>wrap(od(...a)); db.collection=(...a)=>{ const c=oc(...a); if(c&&!c.__tp){ wrap(c); if(typeof c.doc==='function'){ const cd=c.doc.bind(c); c.doc=(...b)=>wrap(cd(...b)); } } return c; };
 }catch(e){ console.warn('tp db',e); } }
function tpAtualiza(){ tpEmbrulhaDb(); try{ if(S.acs&&S.acs.pronto&&!S.acs._dono&&!S._visto&&S.db&&S.uid&&acsP()){ S._visto=1; const t=new Date().toISOString(); S.db.doc('pedidos/'+S.uid).set({em:t,visto:t}).catch(()=>{}); } }catch(e){} try{ pvBarra(); }catch(e){ console.warn('pv',e); } const w=$('#tp'); if(!w) return; const gate=S.acs&&S.acs.pronto&&!acsP(); w.hidden=!!gate; if(gate) return;
  const xs=tpAvisos(), n=xs.reduce((a,x)=>a+(x.n===''?1:x.n),0), crit=xs.some(x=>x.c==='crit'); const b=$('#tp-n'); if(b){ b.hidden=!n; b.textContent=n>99?'99+':n; b.className=crit?'crit':''; }
  const [c,t,ti]=tpConex(), cx=$('#tp-cx'); if(cx){ cx.className='tp-cx '+c; cx.title=ti; cx.lastChild.textContent=t; }
  const mb=$('#tp-mais'); if(mb) mb.hidden=!tpMais().length;
  if(S.tp.pop==='avisos') tpTogglePop('avisos',true); }
tpInit();
// ================= PRÉ-VISUALIZAÇÃO: ver o painel como um cargo/pessoa vê (menu, telas e painel inicial) =================
function pvPermCargo(cg){ return {tudo:false,mods:[...(cg.mods||[])],locais:(cg.locais||[]).filter(l=>ALX_LOC[l]),contar:!!cg.contar,receber:!!cg.receber,auditar:!!cg.auditar,verAud:!!(cg.auditar||cg.verAud),ocultas:cg.ocultas||[],blocos:cg.blocos||[]}; }
function pvPermPessoa(id,blocos){ const d=(S.acs.lista||[]).find(x=>x._id===id); if(!d) return null; const cg=pnlCargo(d.perfil);
  const p=cg?pvPermCargo(cg):{tudo:false,mods:[...(d.mods||[])],locais:[...(d.locais||[])],contar:!!d.contar,receber:!!d.receber,auditar:!!d.auditar,verAud:!!d.verAud,ocultas:d.ocultas||[],blocos:[]};
  const bl=blocos||(d.blocos&&d.blocos.length?d.blocos:null); if(bl) p.blocos=bl; return p; }
function pvAlvos(){ const C=pnlCargos(), xs=Object.keys(C).sort((a,b)=>String(C[a].nome).localeCompare(String(C[b].nome))).map(k=>({v:'c:'+k,t:C[k].nome,g:'Cargos'}));
  (S.acs.lista||[]).filter(d=>d._id&&!String(d._id).startsWith('_')&&d.ativo!==false).sort((a,b)=>acsNome(a._id).localeCompare(acsNome(b._id))).forEach(d=>xs.push({v:'p:'+d._id,t:acsNome(d._id),g:'Pessoas'})); return xs; }
function pvAbrir(alvo){ const N=S.pnl; let P=null;
  if(alvo.startsWith('c:')){ const k=alvo.slice(2), cg=pnlCargos()[k]; if(!cg) return; P={alvo,cargo:cg.nome,nome:'',blocos:pnlClone(cg.blocos||[]),p:pvPermCargo(cg)}; }
  else if(alvo.startsWith('p:')){ const id=alvo.slice(2), p=pvPermPessoa(id); if(!p) return; const d=(S.acs.lista||[]).find(x=>x._id===id)||{}; P={alvo,nome:acsNome(id).split(' ')[0],cargo:pnlPerfilNome(d.perfil),blocos:pnlClone(p.blocos||[]),p}; }
  if(!P) return; P.p.blocos=P.blocos; N.prev=P; go(P.blocos.length?'painel':primeiraView()); }
function pvSair(){ S.pnl.prev=null; go('paineis'); }
function pvAtivo(){ return !!(S.acs&&S.acs._dono&&S.pnl&&S.pnl.prev&&S.pnl.prev.p); }
/* na prévia a dona vira "pessoa comum": some tudo o que é só de master (editar, acessos, painéis, avisos de master) */
(()=>{ const A=S.acs; let v=!!A.dono; delete A.dono; Object.defineProperty(A,'_dono',{get(){ return v; },configurable:true}); Object.defineProperty(A,'dono',{get(){ return v&&!pvAtivo(); },set(x){ v=!!x; },configurable:true,enumerable:true}); })();
{ const _pvAcsP=acsP; acsP=function(){ if(pvAtivo()) return S.pnl.prev.p; return _pvAcsP(); }; }
{ const _pvGate=acsGate; acsGate=function(){ if(pvAtivo()) return ''; return _pvGate(); }; }
function pvBarra(){ let b=$('#pv-bar'); const P=S.pnl&&S.pnl.prev;
  if(!pvAtivo()){ if(b) b.remove(); document.body.classList.remove('pv-on'); return; }
  if(!b){ b=document.createElement('div'); b.id='pv-bar'; b.className='pv-bar'; document.body.appendChild(b); } document.body.classList.add('pv-on');
  const xs=pvAlvos(), g={}; xs.forEach(x=>(g[x.g]=g[x.g]||[]).push(x));
  b.innerHTML=`<span class="pv-ic">${ic('lupa',16,2.2)}</span><span class="pv-t">Vendo como</span>
   <select class="txt" id="pv-sel" aria-label="Ver como">${Object.entries(g).map(([k,v])=>`<optgroup label="${esc(k)}">${v.map(x=>`<option value="${esc(x.v)}" ${x.v===P.alvo?'selected':''}>${esc(x.t)}</option>`).join('')}</optgroup>`).join('')}${P.alvo?'':`<option selected>${esc(P.nome||P.cargo||'editor')}</option>`}</select>
   <small class="pv-s">Você está travada no que a pessoa pode ver e fazer. Os dados são reais: o que gravar aqui grava de verdade.</small>
   <button class="btn sec" data-pv="sair" style="height:36px">Sair da prévia</button>`; }
document.addEventListener('change',ev=>{ if(ev.target.id==='pv-sel') pvAbrir(ev.target.value); });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-pv]'); if(!b) return; if(b.dataset.pv==='sair') pvSair(); else if(b.dataset.pv==='abrir'){ const xs=pvAlvos(); if(!xs.length){ toast('Crie um cargo ou dê acesso a alguém primeiro.'); return; } pvAbrir(b.dataset.v||xs[0].v); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.pnl&&S.pnl.prev&&S.pnl.prev.p&&!document.querySelector('.omodal,.dbmodal,#tp-pop:not([hidden])')) pvSair(); });