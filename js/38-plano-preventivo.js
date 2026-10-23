/* Painel Colafix · 38-plano-preventivo.js (22/10) — Plano preventivo da fábrica (planilha "plano_preventiva_fabrica.xlsx").
   - Importa a planilha (abas Plano e Ativos) em config/manutplano {tarefas, rot, ativos, em, por, arquivo}.
   - Tarefas da manutenção viram ROTEIROS: área + periodicidade + equipe (ex.: "Linha 1 · Semanal · Mecânica", 12 itens).
     No dia, abre UMA OS por roteiro (prevId 'rot-<id>', rotId, chkItens) com checklist item a item.
     Ao concluir: próxima data = hoje + frequência (dia útil); item com problema vira chamado.
   - Tarefas diárias do Operador: checklist do dia no posto da linha (tecla 5), em checkop/{AAAA-MM-DD} {it:{id:{s,por,cracha,em,os}}}.
   - Primeiras datas espalhadas nos dias úteis do período (para não cair tudo no mesmo dia). */
"use strict";
S.pp={plano:null,lido:false,sub:false,ckSub:null,ck:{},f:'todos',eq:'',ab:{},imp:null,busy:false,gerando:false,data:null};
const PP_FREQ={'diária':1,'diaria':1,'semanal':7,'quinzenal':15,'mensal':30,'bimestral':60,'trimestral':90,'semestral':180,'anual':365};
function ppNorm(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
function ppHash(s){ let h=5381; for(const ch of String(s)) h=((h<<5)+h+ch.charCodeAt(0))>>>0; return h.toString(36); }
function ppLinhaDe(area){ const m=String(area||'').match(/linha\s*(\d+)/i); return m?'Linha '+m[1]:''; }
function ppUtil(d){ for(let i=0;i<15;i++){ const w=new Date(d+'T12:00:00').getDay(); let fer=null; try{ fer=feriadoDe(d); }catch(e){} if(w!==0&&w!==6&&!fer) return d; d=addDias(d,1); } return d; }
function ppDiasUteis(de,n,limite){ const out=[]; let d=de; for(let i=0;i<400&&out.length<n;i++){ if(limite&&d>limite) break; if(ppUtil(d)===d) out.push(d); d=addDias(d,1); } return out; }
function ppSemana(d){ return ['dom','seg','ter','qua','qui','sex','sáb'][new Date(d+'T12:00:00').getDay()]; }
function ppOp(t){ return ppNorm(t.resp)==='operador'&&(+t.freq||1)<=1; }
function ppRotDe(id){ return ((S.pp.plano||{}).rot||[]).find(r=>r.id===id); }
function ppItens(r){ return ((S.pp.plano||{}).tarefas||[]).filter(t=>t.rot===r.id); }
function ppOs(r){ return (S.chamados||[]).filter(c=>!manIgnorar(c)&&c.rotId===r.id&&!manFechada(c)).sort((a,b)=>b.numero-a.numero)[0]||null; }
function ppSt(r){ const h=hojeStr(), os=ppOs(r); if(os) return 'aberta'; if(!r.prox) return 'sem'; return r.prox<h?'atrasada':r.prox===h?'hoje':r.prox<=addDias(h,7)?'semana':'ok'; }
const PP_ST={atrasada:['Atrasado','crit'],hoje:['Hoje','warn'],aberta:['OS aberta','prod'],semana:['Esta semana','neu'],ok:['Em dia','ok'],sem:['Sem data','neu']};
function ppNomeRot(r){ return r.area+' · '+r.per+' · '+r.resp; }

/* ---------- assinaturas: o plano (1 documento) e o checklist do operador de hoje ---------- */
setInterval(()=>{ try{ const P=S.pp; if(!S.db||!S.acs||!S.acs.pronto) return;
  const pode=['manch','mantotem','manprev','gxcal'].some(v=>{ try{ return viewOk(v); }catch(e){ return false; } }); if(!pode) return;
  if(!P.sub){ P.sub=true; S.db.doc('config/manutplano').onSnapshot(s=>{ P.plano=s.exists?(s.data()||null):null; P.lido=true; rerenderSeguro(); },()=>{ P.lido=true; }); }
  const h=hojeStr(); if(P.ckSub!==h&&((typeof poOn==='function'&&poOn())||S.view==='manplano'||S.view==='gxcal')){ P.ckSub=h; S.db.doc('checkop/'+h).onSnapshot(s=>{ P.ck[h]=s.exists?(s.data()||{}):{}; rerenderSeguro(); },()=>{}); }
}catch(e){} },800);

/* ---------- importar a planilha ---------- */
async function ppCarregaXlsx(){ if(window.XLSX) return; await new Promise((ok,er)=>{ const src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; if([...document.scripts].some(s=>s.src===src)&&window.XLSX) return ok(); const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>er(new Error('Não consegui carregar a leitura de Excel. Confira a internet.')); document.head.appendChild(s); }); }
function ppData(v){ if(v==null||v==='') return null; if(typeof v==='number'&&v>20000&&v<80000){ const d=new Date(Date.UTC(1899,11,30)+Math.floor(v+1/1440)*864e5); /* sem fuso; tolera o arredondamento de segundos */ return d.toISOString().slice(0,10); }
  if(v instanceof Date) return hojeStr(v); const m=String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3]+'-'+pad(+m[2])+'-'+pad(+m[1]); const m2=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m2?m2[0]:null; }
async function ppLer(file){ const P=S.pp; P.imp={lendo:true,nome:file.name}; render();
  try{ await ppCarregaXlsx(); const wb=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});
    const ach=nomes=>wb.SheetNames.find(n=>nomes.includes(ppNorm(n)));
    let sh=ach(['plano']); let rows=null, hdr=-1;
    const tenta=n=>{ const m=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}); const i=m.findIndex(r=>r.some(c=>ppNorm(c)==='tarefa')&&r.some(c=>ppNorm(c)==='periodicidade')); return i>=0?{m,i}:null; };
    let t=sh?tenta(sh):null; if(!t){ for(const n of wb.SheetNames){ t=tenta(n); if(t){ sh=n; break; } } }
    if(!t) throw new Error('Não achei a aba com as colunas "Tarefa" e "Periodicidade".');
    rows=t.m; hdr=t.i; const H=rows[hdr].map(ppNorm), col=(...ns)=>H.findIndex(h=>ns.includes(h));
    const ci={id:col('id'),area:col('area'),cod:col('codigo do ativo','codigo','tag'),ativo:col('ativo','equipamento'),t:col('tarefa'),per:col('periodicidade'),freq:col('frequencia (dias)','frequencia'),resp:col('responsavel'),ult:col('ultima execucao'),obs:col('observacoes','obs')};
    const tarefas=[], erros=[];
    rows.slice(hdr+1).forEach((r,i)=>{ const tx=String(r[ci.t]||'').trim(); if(!tx) return; const per=String(r[ci.per]||'').trim();
      let fq=PP_FREQ[ppNorm(per)]; const fn=ci.freq>=0?+r[ci.freq]:NaN; if(!fq&&fn>0) fq=fn; if(!fq){ erros.push('Linha '+(hdr+i+2)+': periodicidade "'+per+'" não reconhecida'); return; }
      tarefas.push({id:String(r[ci.id]||'').trim()||('T'+(i+1)),area:String(r[ci.area]||'').trim()||'Geral',cod:String(r[ci.cod]||'').trim(),ativo:String(r[ci.ativo]||'').trim(),t:tx,per:per||'?',freq:fq,resp:String(r[ci.resp]||'').trim()||'Manutenção',ult:ci.ult>=0?ppData(r[ci.ult]):null,obs:String(ci.obs>=0?r[ci.obs]||'':'').trim()}); });
    if(!tarefas.length) throw new Error('A planilha não tem tarefas.');
    P.imp={nome:file.name,aba:sh,tarefas,erros}; }
  catch(e){ P.imp={nome:file.name,erro:(e&&e.message)||String(e)}; }
  render(); }
/* roteiros: tarefas da manutenção agrupadas por área + periodicidade + equipe; o operador (diárias) vai para o posto */
function ppMonta(tarefas,antigo){ const velho={}; ((antigo&&antigo.rot)||[]).forEach(r=>{ velho[r.id]=r; });
  const grupos={}; tarefas.forEach(t=>{ if(ppOp(t)){ t.rot=null; return; } const k=t.area+'|'+t.per+'|'+t.resp; const id='r'+ppHash(k); t.rot=id;
    (grupos[id]=grupos[id]||{id,area:t.area,per:t.per,freq:t.freq,resp:t.resp,n:0,ult:null}).n++; if(t.ult&&(!grupos[id].ult||t.ult>grupos[id].ult)) grupos[id].ult=t.ult; });
  const rot=Object.values(grupos), novos=rot.filter(r=>!velho[r.id]);
  /* datas: quem já existia fica; quem tem última execução = última + frequência; o resto espalhado nos dias úteis do período */
  const amanha=addDias(hojeStr(),1), porF={}; novos.filter(r=>!r.ult).forEach(r=>{ (porF[r.freq]=porF[r.freq]||[]).push(r); });
  /* carga por dia (inclui os roteiros que já existiam): cada novo vai para o dia útil menos ocupado da sua janela, perto da posição ideal */
  const carga={}; ((antigo&&antigo.rot)||[]).forEach(r=>{ if(r.prox) carga[r.prox]=(carga[r.prox]||0)+1; });
  Object.keys(porF).map(Number).sort((a,b)=>a-b).forEach(fd=>{ const xs=porF[fd].sort((a,b)=>String(a.area).localeCompare(String(b.area))||String(a.resp).localeCompare(String(b.resp)));
    const dias=ppDiasUteis(amanha,400,addDias(amanha,Math.max(1,fd<=1?1:fd)-1)); if(!dias.length) dias.push(ppUtil(amanha));
    xs.forEach((r,i)=>{ const ideal=Math.floor(i*dias.length/xs.length); let best=0, bv=1e9; dias.forEach((d,j)=>{ const v=(carga[d]||0)*1000+Math.abs(j-ideal); if(v<bv){ bv=v; best=j; } }); r.prox=dias[best]; carga[r.prox]=(carga[r.prox]||0)+1; }); });
  rot.forEach(r=>{ const v=velho[r.id]; if(v){ Object.assign(r,{prox:v.prox,ult:v.ult||r.ult,osDe:v.osDe||null,os:v.os||null,ativo:v.ativo}); } else if(r.ult) r.prox=ppUtil(addDias(r.ult,r.freq)); if(!r.prox) r.prox=ppUtil(amanha); });
  rot.sort((a,b)=>String(a.prox).localeCompare(String(b.prox)));
  const ativos={}; tarefas.forEach(t=>{ const k=t.cod||t.ativo; if(k&&!ativos[k]) ativos[k]={cod:t.cod,nome:t.ativo,area:t.area}; });
  return {tarefas,rot,ativos:Object.values(ativos),novos:novos.length}; }
/* reimportar respeita o que foi mexido no painel: tarefa editada/criada à mão fica, apagada não volta, roteiro manual fica */
function ppMescla(tarefas,cur){ cur=cur||{}; const keep=(cur.tarefas||[]).filter(t=>t.manual||t.editado).map(t=>Object.assign({},t)), apag=new Set(cur.apagados||[]), kid=new Set(keep.map(t=>t.id));
  const M=ppMonta(tarefas.filter(t=>!apag.has(t.id)&&!kid.has(t.id)).map(t=>Object.assign({},t)),cur), ids=new Set(M.rot.map(r=>r.id));
  (cur.rot||[]).filter(r=>!ids.has(r.id)&&(r.manual||keep.some(t=>t.rot===r.id))).forEach(r=>M.rot.push(Object.assign({},r)));
  M.tarefas=M.tarefas.concat(keep); return M; }
async function ppGravar(){ const P=S.pp, I=P.imp; if(!I||!I.tarefas||P.busy) return; P.busy=true; render();
  try{ const M=ppMescla(I.tarefas,P.plano);
    await S.db.doc('config/manutplano').set({tarefas:M.tarefas,rot:M.rot,ativos:M.ativos,em:new Date().toISOString(),por:S.uid||null,arquivo:I.nome},{merge:true});
    P.plano=Object.assign({},P.plano||{},{tarefas:M.tarefas,rot:M.rot,ativos:M.ativos,em:new Date().toISOString(),arquivo:I.nome}); P.imp=null;
    toast('Plano importado: '+M.rot.length+' roteiros da manutenção e '+M.tarefas.filter(t=>!t.rot).length+' itens do checklist do operador.'); }
  catch(e){ console.warn('[plano] gravar',e); toast('Não foi possível gravar o plano: '+((e&&e.message)||e)); }
  P.busy=false; render(); }
async function ppGravaRot(muda){ const g=await S.db.doc('config/manutplano').get(); const d=g.exists?(g.data()||{}):{}; const rot=(d.rot||[]).map(r=>Object.assign({},r)); muda(rot);
  await S.db.doc('config/manutplano').set({rot},{merge:true}); if(S.pp.plano) S.pp.plano.rot=rot; }

/* ---------- abrir a OS do roteiro no dia (uma por roteiro, com o checklist) ---------- */
async function ppGera(r,forcar){ if(typeof soVer==='function'&&soVer()) return null; if(!forcar&&(r.osDe===r.prox||ppOs(r))) return null;
  let lk=null; try{ lk=S.db.doc('config/manut-rot-'+r.id); const a=await lk.acquire({holder:S.uid||('t'+Math.random()),ttlMs:9000}); if(!a.acquired) return null; }catch(e){ lk=null; }
  try{ const g=await S.db.doc('config/manutplano').get(); const d=g.exists?(g.data()||{}):{}; const rr=(d.rot||[]).find(x=>x.id===r.id); if(!rr||rr.ativo===false) return null;
    if(!forcar&&(rr.osDe===rr.prox||ppOs(rr))) return null;
    const its=(d.tarefas||[]).filter(t=>t.rot===r.id), agora=new Date(), loc=new Date(agora.getTime()-agora.getTimezoneOffset()*6e4).toISOString().slice(0,16);
    const doc=await mxNovaOS({linha:ppLinhaDe(rr.area)||rr.area,quando:loc,defeito:'PREVENTIVA: '+ppNomeRot(rr)+' ('+its.length+' itens)',impacto:'nao',nome:'Plano preventivo',equip:rr.resp+' · '+rr.per,equipId:null,status:'Aberta',criado:agora.toISOString(),por:S.uid||null,
      prevId:'rot-'+rr.id,rotId:rr.id,origem:'preventiva',exec:{tipo:'Preventiva'},chkItens:its.map(t=>({id:t.id,t:t.t,a:t.ativo||t.cod||''})),chk:{},
      hist:[{em:agora.toISOString(),por:S.uid||null,o:'OS do plano preventivo aberta: '+ppNomeRot(rr)+' (prevista para '+dm(rr.prox)+')'}]});
    await ppGravaRot(rot=>{ const x=rot.find(y=>y.id===rr.id); if(x){ x.osDe=rr.prox||hojeStr(); x.os=doc.numero; } }); return doc; }
  finally{ try{ lk&&await lk.release(); }catch(e){} } }
setInterval(async()=>{ const P=S.pp; if(P.gerando||!P.lido||!P.plano||!S.db) return; try{ if(!(viewOk('manch')||(typeof ofOn==='function'&&ofOn()))||(typeof soVer==='function'&&soVer())) return; }catch(e){ return; }
  const h=hojeStr(), dev=(P.plano.rot||[]).filter(r=>r.ativo!==false&&r.prox&&r.prox<=h&&r.osDe!==r.prox&&!ppOs(r)).slice(0,6); if(!dev.length) return; P.gerando=true;
  try{ for(const r of dev) await ppGera(r,false); }catch(e){ console.warn('[plano] gerar OS',e); } P.gerando=false; },9000);

/* concluir/cancelar a OS do roteiro: próxima data e itens com problema viram chamado */
function ppPend(c){ const k=c.chk||{}; return (c.chkItens||[]).filter(i=>!k[i.id]||!k[i.id].s).length; }
{ const _ms=manStatus; manStatus=async function(c,st){
  if(c&&c.rotId&&st==='Concluída'&&c.status!=='Concluída'&&!c._ppOk){ const n=ppPend(c); if(n){ toast('Faltam '+n+' ite'+(n>1?'ns':'m')+' do checklist desta preventiva. Marque OK ou Problema em cada um.'); return; } }
  const antes=c&&c.status; const r=await _ms.apply(this,arguments);
  try{ if(c&&c.rotId&&antes!==c.status&&(c.status==='Concluída'||c.status==='Cancelada')){ const hj=hojeStr();
      await ppGravaRot(rot=>{ const x=rot.find(y=>y.id===c.rotId); if(!x) return; if(c.status==='Concluída'){ x.ult=hj; x.prox=ppUtil(addDias(hj,Math.max(1,+x.freq||30))); } else { x.prox=ppUtil(addDias(x.prox||hj,Math.max(1,+x.freq||30))); } x.osDe=null; x.os=null; });
      if(c.status==='Concluída'){ const k=c.chk||{}, pbs=(c.chkItens||[]).filter(i=>k[i.id]&&k[i.id].s==='pb'&&!k[i.id].os), agora=new Date(); const novo={};
        for(const i of pbs){ const loc=new Date(agora.getTime()-agora.getTimezoneOffset()*6e4).toISOString().slice(0,16);
          const d=await mxNovaOS({linha:c.linha,quando:loc,defeito:'Problema na preventiva: '+i.t+(k[i.id].obs?' — '+k[i.id].obs:''),impacto:'nao',nome:'Plano preventivo (OS '+manNum(c.numero)+')',equip:i.a||c.equip||null,equipId:null,status:'Aberta',criado:agora.toISOString(),por:S.uid||null,origem:'preventiva-problema',daOs:c.numero,
            hist:[{em:agora.toISOString(),por:S.uid||null,o:'Aberto pela preventiva OS '+manNum(c.numero)+': '+i.t}]}); novo[i.id]=Object.assign({},k[i.id],{os:d.numero}); }
        if(pbs.length){ await S.db.doc('chamados/'+c._id).update({chk:novo}); c.chk=Object.assign({},k,novo); toast(pbs.length+' problema'+(pbs.length>1?'s':'')+' do checklist virou chamado para a manutenção.'); } } } }
  catch(e){ console.warn('[plano] fechar OS',e); }
  return r; }; }
async function ppMarca(c,id,s,obs,quem){ const v={s,por:quem||nomeDe(S.uid)||'',em:new Date().toISOString()}; if(obs!=null) v.obs=obs; else if(c.chk&&c.chk[id]&&c.chk[id].obs&&s==='pb') v.obs=c.chk[id].obs;
  c.chk=Object.assign({},c.chk||{},{[id]:v}); await S.db.doc('chamados/'+c._id).update({chk:{[id]:v}}); }

/* ---------- checklist na OS (tela de detalhe da Manutenção) ---------- */
function ppChkHtml(c,cls){ const k=c.chk||{}, its=c.chkItens||[], ok=its.filter(i=>k[i.id]&&k[i.id].s==='ok').length, pb=its.filter(i=>k[i.id]&&k[i.id].s==='pb').length, fe=manFechada(c), por={};
  its.forEach(i=>{ (por[i.a||'Geral']=por[i.a||'Geral']||[]).push(i); });
  return `<section class="card pp-chk ${cls||''}"><div class="pp-ch"><div><div class="label">CHECKLIST DA PREVENTIVA</div><b>${ok+pb} de ${its.length} conferidos</b>${pb?` · <span class="pp-pbt">${pb} com problema</span>`:''}</div>${fe?'':`<button class="btn sec" data-act="ppk-tudo" data-n="${c.numero}">Marcar os que faltam como OK</button>`}</div>
   <div class="pp-bar"><i style="width:${its.length?ok/its.length*100:0}%"></i><i class="ppb" style="width:${its.length?pb/its.length*100:0}%"></i></div>
   ${Object.keys(por).map(a=>`<div class="pp-ga"><h3>${esc(a)}</h3>${por[a].map(i=>{ const s=(k[i.id]||{}).s||''; return `<div class="pp-it pp-s-${s}"><span class="pp-tx">${esc(i.t)}${k[i.id]&&k[i.id].os?` <small>· virou o chamado ${manNum(k[i.id].os)}</small>`:''}</span>
     ${fe?`<span class="pill ${s==='ok'?'ok':s==='pb'?'crit':'neu'}">${s==='ok'?'OK':s==='pb'?'Problema':'—'}</span>`:`<div class="pp-bs"><button class="pp-b ok" data-act="ppk-ok" data-n="${c.numero}" data-id="${esc(i.id)}" aria-pressed="${s==='ok'}">✓ OK</button><button class="pp-b ppbx" data-act="ppk-pb" data-n="${c.numero}" data-id="${esc(i.id)}" aria-pressed="${s==='pb'}">Problema</button></div>`}
     ${s==='pb'?`<input class="txt pp-obs" data-ppk-obs="${esc(i.id)}" data-n="${c.numero}" maxlength="160" placeholder="O que está errado? (vira chamado ao concluir)" value="${esc((k[i.id]||{}).obs||'')}" ${fe?'disabled':''}>`:''}</div>`; }).join('')}</div>`).join('')}
   ${fe?'':'<div class="sub" style="font-size:12.5px;margin-top:8px">Só dá para concluir a OS com todos os itens conferidos. Cada "Problema" vira um chamado para a manutenção ao concluir.</div>'}</section>`; }
{ const _md=manDetalhe; manDetalhe=function(c){ let h=_md.apply(this,arguments); if(!c||!c.rotId||!(c.chkItens||[]).length) return h; const i=h.indexOf('<section class="card man-at">'); return i>=0?h.slice(0,i)+ppChkHtml(c)+h.slice(i):h+ppChkHtml(c); }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ppk-"]'); if(!b) return; const c=manDoc(+b.dataset.n); if(!c) return; const a=b.dataset.act;
  try{ if(a==='ppk-ok') await ppMarca(c,b.dataset.id,'ok');
    else if(a==='ppk-pb') await ppMarca(c,b.dataset.id,'pb');
    else if(a==='ppk-tudo'){ const k=c.chk||{}, falta=(c.chkItens||[]).filter(i=>!k[i.id]||!k[i.id].s), por=nomeDe(S.uid)||'', em=new Date().toISOString(), up={}; falta.forEach(i=>{ up[i.id]={s:'ok',por,em}; }); if(falta.length){ c.chk=Object.assign({},k,up); await S.db.doc('chamados/'+c._id).update({chk:up}); } }
    render(); }catch(e){ console.warn('[plano] checklist',e); toast('Não foi possível gravar. Verifique a internet.'); } });
document.addEventListener('change',async ev=>{ const t=ev.target; if(!(t&&t.dataset&&t.dataset.ppkObs!=null)) return; const c=manDoc(+t.dataset.n); if(!c) return; try{ await ppMarca(c,t.dataset.ppkObs,'pb',String(t.value||'').trim()); }catch(e){ toast('Não foi possível gravar a observação.'); } });

/* ---------- computador de chamados: técnico faz o checklist e conclui ---------- */
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cq-terminar"]'); if(!b) return; const c=manDoc(+b.dataset.n); if(!c||!c.rotId||!(c.chkItens||[]).length) return;
  ev.stopPropagation(); ev.preventDefault(); const T=S.tt; T.osFim=c.numero; T.fase='cqchk'; T.msg=''; T.ult=Date.now(); render(); },true);
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cqk-"]'); if(!b) return; ev.stopPropagation(); ev.preventDefault(); const T=S.tt, c=manDoc(T.osFim); if(!c||!T.p) return; const a=b.dataset.act; T.ult=Date.now();
  try{ if(a==='cqk-ok'||a==='cqk-pb'){ await ppMarca(c,b.dataset.id,a==='cqk-ok'?'ok':'pb',null,T.p.nome); render(); return; }
    if(a==='cqk-tudo'){ const k=c.chk||{}, up={}, em=new Date().toISOString(); (c.chkItens||[]).filter(i=>!k[i.id]||!k[i.id].s).forEach(i=>{ up[i.id]={s:'ok',por:T.p.nome,em}; }); c.chk=Object.assign({},k,up); if(Object.keys(up).length) await S.db.doc('chamados/'+c._id).update({chk:up}); render(); return; }
    if(a==='cqk-volta'){ T.fase='tecnico'; render(); return; }
    if(a==='cqk-fim'){ if(ppPend(c)||T.enviando) return; T.enviando=true; render(); const agora=new Date().toISOString(), k=c.chk||{}, n=(c.chkItens||[]).length, pb=(c.chkItens||[]).filter(i=>k[i.id]&&k[i.id].s==='pb').length;
      const E=Object.assign({},c.exec||{},{causa:'Preventiva',servicos:'Checklist do plano preventivo: '+(n-pb)+' OK'+(pb?', '+pb+' com problema':''),tecnico:(c.exec&&c.exec.tecnico)||T.p.nome,tecnicoCracha:T.p.codigo||null}); if(!E.inicio) E.inicio=manAgoraLocal();
      const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Preventiva concluída por '+T.p.nome+' ('+(n-pb)+' OK'+(pb?', '+pb+' com problema':'')+')'}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({exec:E,hist,concluidoPorNome:T.p.nome,concluidoPorCracha:T.p.codigo||null}); c.exec=E; c.hist=hist;
      c._mzOk=true; c._ppOk=true; try{ await manStatus(c,'Concluída'); } finally { delete c._mzOk; delete c._ppOk; }
      T.enviando=false; if(c.status!=='Concluída'){ T.msg='Não foi possível concluir. Verifique a internet e toque de novo.'; render(); return; }
      if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+15000; T.numero=c.numero; T.ppFim=true; T.fase='fimok'; render(); return; } }
  catch(e){ T.enviando=false; console.warn('[plano] checklist no computador',e); T.msg='Não foi possível gravar: '+((e&&e.message)||'verifique a internet')+'.'; render(); } },true);
{ const _vc=vChamados; vChamados=function(){ const T=S.tt;
  if(T&&T.fase==='cqchk'){ const c=manDoc(T.osFim); if(!c){ T.fase='tecnico'; return _vc.apply(this,arguments); } T.fase='tecnico'; let h=_vc.apply(this,arguments); T.fase='cqchk'; if(!h) return h;
    const k=c.chk||{}, its=c.chkItens||[], feitos=its.filter(i=>k[i.id]&&k[i.id].s).length, falta=its.length-feitos, por={}; its.forEach(i=>{ (por[i.a||'Geral']=por[i.a||'Geral']||[]).push(i); });
    const corpo=`<h1 class="cq-h">Checklist · ${esc(String(c.defeito||'').replace(/^PREVENTIVA:\s*/,''))} <small>· OS ${manNum(c.numero)} · ${feitos} de ${its.length}</small></h1>
      <div class="pp-cq">${Object.keys(por).map(a=>`<h2>${esc(a)}</h2>${por[a].map(i=>{ const s=(k[i.id]||{}).s||''; return `<div class="pp-cqi pp-s-${s}"><span>${esc(i.t)}</span><button class="cq-bt ${s==='ok'?'ok':''}" data-act="cqk-ok" data-id="${esc(i.id)}" aria-pressed="${s==='ok'}"><b>✓ OK</b></button><button class="cq-bt ${s==='pb'?'crit':''}" data-act="cqk-pb" data-id="${esc(i.id)}" aria-pressed="${s==='pb'}"><b>Problema</b></button></div>`; }).join('')}`).join('')}</div>
      ${T.msg?`<div class="cq-msg">${esc(T.msg)}</div>`:''}
      <div class="cq-rod"><span>${falta?'Faltam '+falta+' itens. "Problema" vira chamado para a manutenção ao concluir.':'Tudo conferido.'}</span><div class="pp-cqr">${falta?'<button class="cq-sec" data-act="cqk-tudo">Marcar os que faltam como OK</button>':''}<button class="cq-sec" data-act="cqk-volta">Voltar</button><button class="cq-bt ok" data-act="cqk-fim" ${falta||T.enviando?'disabled':''}><b>Concluir a preventiva</b></button></div></div>`;
    return h.replace(/<main class="cq-main">[\s\S]*<\/main>/,'<main class="cq-main">'+corpo+'</main>'); }
  let h=_vc.apply(this,arguments); if(!h) return h;
  try{ (S.chamados||[]).filter(c=>c.rotId&&!manFechada(c)).forEach(c=>{
      h=h.replace(new RegExp('(data-act="cq-terminar" data-n="'+c.numero+'"[^>]*><b>)Terminar e liberar a máquina'),'$1Fazer o checklist e concluir');
      h=h.replace(/<section class="cq-ch[\s\S]*?<\/section>/g,s=>s.includes('>OS '+manNum(c.numero)+'<')?s.replace('Começar o conserto','Começar a preventiva').replace(/>Ainda funciona </,'>Preventiva do plano · '+(c.chkItens||[]).length+' itens <'):s); });
    if(T&&T.fase==='fimok'&&T.ppFim){ const c=manDoc(T.numero); if(c&&c.rotId){ const k=c.chk||{}, pb=(c.chkItens||[]).filter(i=>k[i.id]&&k[i.id].s==='pb').length;
      h=h.replace(/<h1>Máquina liberada · OS (\d+)<\/h1><p>[\s\S]*?<\/p><p class="cq-p2">[\s\S]*?<\/p>/,`<h1>Preventiva concluída · OS $1</h1><p>${esc(String(c.defeito||'').replace(/^PREVENTIVA:\s*/,''))}</p><p class="cq-p2">${pb?pb+' problema'+(pb>1?'s viraram chamados':' virou chamado')+' para a manutenção. ':''}A próxima já está marcada. Esta tela volta para o início sozinha.</p>`); } } }catch(e){}
  return h; }; }
{ const _tv=ttVoltar; ttVoltar=function(){ if(S.tt) S.tt.ppFim=false; return _tv.apply(this,arguments); }; }

/* ---------- posto: checklist do dia do operador (tecla 5) ---------- */
function ppOpItens(){ const L=ttLinhas(), T=S.tt, lp=T&&T.p&&T.p.linha&&T.p.linha!=='*'&&L.includes(T.p.linha)?[T.p.linha]:L;
  return ((S.pp.plano||{}).tarefas||[]).filter(t=>!t.rot&&ppOp(t)).filter(t=>{ const l=ppLinhaDe(t.area); return l?lp.includes(l):true; }); }
function ppOpDia(){ const h=hojeStr(); return ((S.pp.ck[h]||{}).it)||{}; }
function ppOpResumo(){ const its=ppOpItens(), k=ppOpDia(); return {n:its.length,f:its.filter(t=>k[t.id]&&k[t.id].s).length}; }
{ const _vp=vPosto; vPosto=function(){ const T=S.tt;
  if(T&&T.fase==='pochk'){ const its=ppOpItens(), k=ppOpDia(), por={}; its.forEach(t=>{ (por[t.area]=por[t.area]||[]).push(t); }); const sel=T.ckSel||0, falta=its.filter(t=>!(k[t.id]&&k[t.id].s)).length;
    let idx=-1; const corpo=`<h1 class="cq-h">Checklist do dia <small>· ${dm(hojeStr())} · ${its.length-falta} de ${its.length} feitos</small></h1>
      ${its.length?`<div class="pp-cq">${Object.keys(por).map(a=>`<h2>${esc(a)}${ppLinhaDe(a)?'':' <small>· geral</small>'}</h2>${por[a].map(t=>{ idx++; const v=k[t.id]||{}, s=v.s||''; return `<div class="pp-cqi pp-s-${s}${idx===sel?' sel':''}" data-i="${idx}"><span><b>${esc(t.ativo||'')}</b>${esc(t.t)}${s?` <small>· ${esc(v.por||'')}${v.em?' '+hora(v.em):''}${v.os?' · chamado '+manNum(v.os):''}</small>`:''}</span><button class="cq-bt ${s==='ok'?'ok':''}" data-act="ppo-ok" data-id="${esc(t.id)}" aria-pressed="${s==='ok'}"><b>✓ OK</b></button><button class="cq-bt ${s==='pb'?'crit':''}" data-act="ppo-pb" data-id="${esc(t.id)}" aria-pressed="${s==='pb'}"><b>Problema</b></button></div>`; }).join('')}`).join('')}</div>`:'<div class="cq-vz">Nenhum item de checklist para esta linha no plano.</div>'}
      ${poMsg()}${poRod('↑ ↓ escolhe · Enter = OK · P = problema (abre chamado para a manutenção) · Esc volta','po-volta','Voltar (Esc)')}`;
    return poPagina('Checklist do dia',corpo); }
  let h=_vp.apply(this,arguments);
  if(h&&T&&T.fase==='pomenu'&&S.pp.plano){ const r=ppOpResumo(); if(r.n){ const bt=`<button class="po-op ${r.f>=r.n?'ok':'pri'}" data-act="ppo-abrir"><span class="po-k">5</span><div><b>Checklist do dia</b><small>${r.f>=r.n?'feito hoje · '+r.n+' itens':r.f+' de '+r.n+' itens feitos'}</small></div></button>`; const i=h.indexOf('<div class="po-menu">'); const j=i>=0?h.indexOf('</button></div>',i):-1; if(j>=0) h=h.slice(0,j+9)+bt+h.slice(j+9); } }
  return h; }; }
async function ppOpMarca(id,s){ const T=S.tt, h=hojeStr(), t=((S.pp.plano||{}).tarefas||[]).find(x=>x.id===id); if(!t||!T.p||T.enviando) return; const k=ppOpDia();
  const v={s,por:T.p.nome,cracha:T.p.codigo||null,em:new Date().toISOString()};
  T.enviando=true; render();
  try{ if(s==='pb'&&!(k[id]&&k[id].os)){ const agora=new Date(), loc=new Date(agora.getTime()-agora.getTimezoneOffset()*6e4).toISOString().slice(0,16);
      const d=await mxNovaOS({linha:ppLinhaDe(t.area)||t.area,quando:loc,defeito:'Checklist do operador: '+t.t,impacto:'nao',nome:T.p.nome,cracha:T.p.codigo||null,equip:t.ativo||null,equipId:null,status:'Aberta',criado:agora.toISOString(),por:S.uid||null,origem:'checklist',
        hist:[{em:agora.toISOString(),por:S.uid||null,o:'Aberto pelo checklist do operador ('+T.p.nome+'): '+t.t}]}); v.os=d.numero; }
    else if(k[id]&&k[id].os) v.os=k[id].os;
    S.pp.ck[h]=S.pp.ck[h]||{}; S.pp.ck[h].it=Object.assign({},k,{[id]:v});
    await S.db.doc('checkop/'+h).set({dia:h,it:{[id]:v}},{merge:true}); T.msg=s==='pb'?'Problema anotado: a manutenção recebeu o chamado '+manNum(v.os)+'.':''; }
  catch(e){ console.warn('[plano] checklist do posto',e); T.msg='Não foi possível gravar. Verifique a internet e tente de novo.'; }
  T.enviando=false; const its=ppOpItens(), nx=its.findIndex((x,i)=>i>(T.ckSel||0)&&!(S.pp.ck[h].it[x.id]&&S.pp.ck[h].it[x.id].s)); if(nx>=0) T.ckSel=nx; else { const p=its.findIndex(x=>!(S.pp.ck[h].it[x.id]&&S.pp.ck[h].it[x.id].s)); if(p>=0) T.ckSel=p; } T.ult=Date.now(); render(); }
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ppo-"]'); if(!b) return; ev.stopPropagation(); const T=S.tt, a=b.dataset.act;
  if(a==='ppo-abrir'){ T.ckSel=0; poVai('pochk'); return; } if(a==='ppo-ok') ppOpMarca(b.dataset.id,'ok'); if(a==='ppo-pb') ppOpMarca(b.dataset.id,'pb'); },true);
let ppTecla=null; const ppK={t:0,ate:0,pend:null};
window.addEventListener('keydown',ev=>{ if(typeof ttAtivo!=='function'||!ttAtivo()||typeof poOn!=='function'||!poOn()||ev.ctrlKey||ev.altKey||ev.metaKey) return; const T=S.tt;
  /* rajada do coletor (teclas a menos de 60 ms): não é atalho */
  const ag=performance.now(), gap=ag-ppK.t; ppK.t=ag; if(gap<60){ ppK.ate=ag+300; if(ppK.pend){ clearTimeout(ppK.pend); ppK.pend=null; } clearTimeout(ppTecla); }
  if(T.fase==='pochk'&&ag<ppK.ate&&ev.key!=='Escape'){ ev.preventDefault(); ev.stopImmediatePropagation(); return; }
  if(T.fase==='pomenu'&&ev.key==='5'&&S.pp.plano&&ppOpResumo().n){ ev.preventDefault(); ev.stopImmediatePropagation(); clearTimeout(ppTecla); ppTecla=setTimeout(()=>{ if(S.tt.fase==='pomenu'){ S.tt.ckSel=0; poVai('pochk'); } },120); return; }
  if(T.fase!=='pochk') return; const its=ppOpItens();
  if(ev.key==='Escape'){ ev.preventDefault(); ev.stopImmediatePropagation(); if(typeof nxOn==='function'&&nxOn()) ttVoltar(); else poVai('pomenu'); return; }
  if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ ev.preventDefault(); ev.stopImmediatePropagation(); T.ckSel=Math.max(0,Math.min(its.length-1,(T.ckSel||0)+(ev.key==='ArrowDown'?1:-1))); T.ult=Date.now(); render(); const el=document.querySelector('.pp-cqi.sel'); el&&el.scrollIntoView({block:'nearest'}); return; }
  if(ev.key==='Enter'||ev.key==='p'||ev.key==='P'){ ev.preventDefault(); ev.stopImmediatePropagation(); const pb=ev.key!=='Enter'; ppK.pend=setTimeout(()=>{ ppK.pend=null; if(S.tt.fase!=='pochk') return; const t=ppOpItens()[S.tt.ckSel||0]; if(t) ppOpMarca(t.id,pb?'pb':'ok'); },120); } },true);
/* coletor: bipe na tela do checklist não vira atalho (a rajada do coletor) */
{ const _pv=poVolta; poVolta=function(){ if(S.tt&&S.tt.fase==='pochk'){ poVai('pomenu'); return; } return _pv.apply(this,arguments); }; }

/* ---------- tela "Plano preventivo" (Manutenção) ---------- */
function vManPlano(emb){ const P=S.pp, PL=P.plano;
  const topo=emb?`<div class="pp-emb"><span class="sub" style="margin:0">Os roteiros da planilha: cada um abre uma OS com checklist no dia marcado. As diárias do operador são o checklist do computador da Nexus.</span><div style="display:flex;gap:8px;flex-wrap:wrap">${(typeof soVer==='function'&&soVer())?'':'<button class="btn" data-act="ppe-novo">'+ic('mais',18,2)+'Novo roteiro</button>'}<label class="btn sec" style="cursor:pointer">${ic('folha',18,2)}${PL?'Importar planilha de novo':'Importar planilha do plano'}<input type="file" accept=".xlsx,.xls" data-pp-arq hidden></label></div></div>`:`${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Plano preventivo</h1><div class="sub">As tarefas do plano viram roteiros (área + periodicidade + equipe). No dia, abre uma OS com o checklist; o técnico confere item a item e a próxima data é marcada sozinha. As diárias do operador são o checklist do computador da Nexus.</div></div>
    <div class="pg-acts" style="display:flex;gap:8px;flex-wrap:wrap">${(typeof soVer==='function'&&soVer())?'':'<button class="btn" data-act="ppe-novo">'+ic('mais',18,2)+'Novo roteiro</button>'}<label class="btn sec" style="cursor:pointer">${ic('folha',18,2)}${PL?'Importar planilha de novo':'Importar planilha do plano'}<input type="file" accept=".xlsx,.xls" data-pp-arq hidden></label></div></div>`;
  const imp=P.imp?ppImpHtml():'';
  if(!P.lido) return topo+'<section class="card"><div class="empty">Carregando…</div></section>';
  if(!PL||!(PL.tarefas||[]).length) return topo+imp+`<section class="card"><div class="empty">Nenhum plano importado ainda. Use "Importar planilha do plano" (abas Plano e Ativos: ID, Área, Ativo, Tarefa, Periodicidade, Responsável, Última execução).</div></section>`;
  const rots=(PL.rot||[]).filter(r=>r.ativo!==false).map(r=>({r,st:ppSt(r),os:ppOs(r),n:ppItens(r).length}));
  const cnt=k=>rots.filter(x=>x.st===k).length, eqs=[...new Set(rots.map(x=>x.r.resp))].sort();
  const vis=rots.filter(x=>(P.f==='todos'||(P.f==='pend'?['atrasada','hoje','aberta'].includes(x.st):x.st===P.f))&&(!P.eq||x.r.resp===P.eq)).sort((a,b)=>String(a.r.prox).localeCompare(String(b.r.prox)));
  const row=x=>{ const {r,st,os,n}=x, [l,c]=PP_ST[st], ab=P.ab[r.id];
    return `<div class="pp-r ${st}"><div class="pp-rd"><b class="num">${r.prox?dm(r.prox):'—'}</b><small>${r.prox?ppSemana(r.prox):''}</small></div>
      <div class="pp-rt"><b>${esc(r.area)} · ${esc(r.per)}</b><small>${esc(r.resp)} · ${n} ite${n>1?'ns':'m'} · a cada ${r.freq} dia${r.freq>1?'s':''}${r.ult?' · última '+dm(r.ult):' · sem histórico'}</small></div>
      <span class="pill ${c}">${l}</span>
      <div class="pp-ra">${os?`<button class="btn sec" data-act="man-abrir" data-n="${os.numero}" data-ir="1">OS ${manNum(os.numero)}</button>`:`<button class="eq-lk" data-act="pp-gerar" data-id="${esc(r.id)}">${ic('play',15,2)}Gerar OS agora</button>`}
        <button class="eq-lk" data-act="pp-ver" data-id="${esc(r.id)}" aria-expanded="${!!ab}">${ab?'Esconder itens':'Ver itens'}</button>${os?'':`<label class="pp-dt"><span>mudar data</span><input type="date" data-pp-data="${esc(r.id)}" value="${esc(r.prox||'')}"></label>`}${(typeof soVer==='function'&&soVer())?'':`<span class="pp-sp"></span><button class="eq-lk" data-act="ppe-ed" data-id="${esc(r.id)}">${ic('editar',15,2)}Editar</button><button class="eq-lk del" data-act="ppe-apagar" data-id="${esc(r.id)}">${ic('lixo',15,2)}${P.apg===r.id?'Toque de novo para apagar':'Apagar'}</button>`}</div>
      ${ab?`<div class="pp-its">${ppItens(r).map(t=>`<div><b>${esc(t.ativo||t.cod)}</b> ${esc(t.t)}${t.cod?` <small>${esc(t.cod)}</small>`:''}</div>`).join('')}</div>`:''}</div>`; };
  /* checklist do operador hoje, por área */
  const h=hojeStr(), k=((P.ck[h]||{}).it)||{}, ops=(PL.tarefas||[]).filter(t=>!t.rot&&ppOp(t)), porA={}; ops.forEach(t=>{ (porA[t.area]=porA[t.area]||[]).push(t); });
  const pbs=ops.filter(t=>k[t.id]&&k[t.id].s==='pb');
  const opCard=ops.length?`<section class="card"><div class="head" style="align-items:baseline"><h2>Checklist do operador · hoje</h2><span class="sub" style="margin:0">feito no computador da Nexus${(typeof soVer==='function'&&soVer())?'':' · <button class="lnk" data-act="ppe-op">Editar os itens</button>'}</span></div>
    <div class="pp-opg">${Object.keys(porA).map(a=>{ const xs=porA[a], f=xs.filter(t=>k[t.id]&&k[t.id].s).length; return `<div class="pp-op"><b>${esc(a)}</b><div class="pp-bar"><i style="width:${f/xs.length*100}%"></i></div><small>${f} de ${xs.length}${xs.some(t=>k[t.id]&&k[t.id].s==='pb')?' · <span class="pp-pbt">com problema</span>':''}</small></div>`; }).join('')}</div>
    ${pbs.length?`<div class="pp-pbl">${pbs.map(t=>`<div><b>${esc(t.area)} · ${esc(t.ativo||'')}</b> ${esc(t.t)} <small>· ${esc(k[t.id].por||'')}${k[t.id].os?` · <button class="lnk" data-act="man-abrir" data-n="${k[t.id].os}" data-ir="1">chamado ${manNum(k[t.id].os)}</button>`:''}</small></div>`).join('')}</div>`:''}</section>`:'';
  return topo+imp+`<div class="mp-k mx-k"><div class="${cnt('atrasada')?'crit':''}"><span>Atrasados</span><b class="num">${cnt('atrasada')}</b><small>passou da data sem OS</small></div><div class="${cnt('hoje')?'warn':''}"><span>Hoje</span><b class="num">${cnt('hoje')}</b><small>a OS abre sozinha</small></div><div><span>OS abertas</span><b class="num">${cnt('aberta')}</b><small>checklist em andamento</small></div><div><span>Esta semana</span><b class="num">${cnt('semana')}</b><small>próximos 7 dias</small></div><div class="ok"><span>Em dia</span><b class="num">${cnt('ok')}</b><small>${rots.length} roteiros</small></div></div>
   ${opCard}
   <section class="card"><div class="pp-fl"><div class="chips">${[['todos','Todos'],['pend','Pendentes'],['semana','Esta semana'],['ok','Em dia']].map(([kk,l])=>`<button class="chip" data-act="pp-f" data-v="${kk}" aria-pressed="${P.f===kk}">${l}</button>`).join('')}</div>
     <div class="chips">${[['','Todas as equipes']].concat(eqs.map(e=>[e,e])).map(([kk,l])=>`<button class="chip" data-act="pp-eq" data-v="${esc(kk)}" aria-pressed="${P.eq===kk}">${esc(l)}</button>`).join('')}</div></div>
    ${vis.length?vis.map(row).join(''):'<div class="empty">Nenhum roteiro aqui.</div>'}</section>
   <p class="sub" style="font-size:12.5px">Plano importado de ${esc(PL.arquivo||'planilha')}${PL.em?' em '+dm(String(PL.em).slice(0,10)):''} · ${(PL.tarefas||[]).length} tarefas · ${(PL.ativos||[]).length} ativos. Importar de novo atualiza as tarefas e mantém as datas dos roteiros que já existiam.</p>`; }
function ppImpHtml(){ const I=S.pp.imp; if(I.lendo) return `<section class="card"><div class="empty">Lendo ${esc(I.nome)}…</div></section>`;
  if(I.erro) return `<section class="card pp-imp"><b>Não deu para ler ${esc(I.nome)}</b><p>${esc(I.erro)}</p><button class="btn sec" data-act="pp-imp-x">Fechar</button></section>`;
  const M=ppMescla(I.tarefas,S.pp.plano), op=M.tarefas.filter(t=>!t.rot).length, porP={}; M.rot.forEach(r=>{ porP[r.per]=(porP[r.per]||0)+1; });
  const prim=M.rot.slice().sort((a,b)=>String(a.prox).localeCompare(String(b.prox))).slice(0,6);
  return `<section class="card pp-imp"><h2>Conferir antes de importar · ${esc(I.nome)}</h2>
    <div class="pp-ig"><div><b class="num">${M.tarefas.length}</b><span>tarefas lidas (aba ${esc(I.aba)})</span></div><div><b class="num">${M.rot.length}</b><span>roteiros da manutenção (${Object.entries(porP).map(([p,n])=>n+' '+p.toLowerCase()).join(', ')})</span></div><div><b class="num">${op}</b><span>itens do checklist diário do operador (no posto)</span></div><div><b class="num">${M.ativos.length}</b><span>ativos</span></div></div>
    ${S.pp.plano?`<p class="sub">Já existe um plano: ${M.novos} roteiro(s) novo(s); os outros mantêm a próxima data.</p>`:''}
    <p class="sub" style="margin-bottom:6px">Primeiras datas (espalhadas nos dias úteis, para não cair tudo no mesmo dia):</p><div class="pp-pr">${prim.map(r=>`<div><b>${dm(r.prox)} ${ppSemana(r.prox)}</b> ${esc(ppNomeRot(r))} <small>· ${r.n} itens</small></div>`).join('')}</div>
    ${I.erros.length?`<p class="pp-pbt">${I.erros.length} linha(s) ignorada(s): ${esc(I.erros.slice(0,3).join(' · '))}</p>`:''}
    <div class="pp-ib"><button class="btn sec" data-act="pp-imp-x">Cancelar</button><button class="btn" data-act="pp-imp-ok" ${S.pp.busy?'disabled':''}>${S.pp.busy?'Gravando…':'Importar o plano'}</button></div></section>`; }
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset) return;
  if(t.dataset.ppArq!=null&&t.files&&t.files[0]){ ppLer(t.files[0]); t.value=''; return; }
  if(t.dataset.ppData!=null&&t.value){ const id=t.dataset.ppData, d=t.value; try{ await ppGravaRot(rot=>{ const x=rot.find(y=>y.id===id); if(x){ x.prox=d; x.osDe=null; } }); toast('Próxima data: '+dm(d)+'.'); render(); }catch(e){ toast('Não foi possível mudar a data.'); } } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="pp-"]'); if(!b) return; const P=S.pp, a=b.dataset.act;
  if(a==='pp-f'){ P.f=b.dataset.v; render(); return; } if(a==='pp-eq'){ P.eq=b.dataset.v; render(); return; }
  if(a==='pp-ver'){ P.ab[b.dataset.id]=!P.ab[b.dataset.id]; render(); return; }
  if(a==='pp-imp-x'){ P.imp=null; render(); return; } if(a==='pp-imp-ok'){ ppGravar(); return; }
  if(a==='pp-gerar'){ const r=ppRotDe(b.dataset.id); if(!r||P.busy) return; P.busy=true; b.disabled=true; try{ const d=await ppGera(r,true); toast(d?'OS '+manNum(d.numero)+' aberta com o checklist.':'Já existe uma OS aberta para este roteiro.'); }catch(e){ toast('Não foi possível abrir a OS.'); } P.busy=false; render(); } });

/* ---------- registro e ligações (Manutenção, calendário e avisos do gestor) ---------- */
VIEWS.manplano={nome:'Plano preventivo',ic:'lista',mob:'Plano'}; CRUMB.manplano='Plano preventivo';
S.extViews=S.extViews||{}; S.extViews.manplano=vManPlano;
{ const _vo=viewOk; viewOk=function(v){ if(v==='manplano') return _vo.call(this,'manprev'); return _vo.apply(this,arguments); }; }
{ const _mo=mzOrdena; mzOrdena=function(){ _mo.apply(this,arguments); const M=MODS.find(x=>x.id==='manut'); if(!M) return; M.views=M.views.filter(v=>v!=='manplano'); const i=M.views.indexOf('manprev'); M.views.splice(i>=0?i+1:M.views.length,0,'manplano'); }; mzOrdena(); setTimeout(()=>mzOrdena(),10); setTimeout(()=>mzOrdena(),1700); }
/* calendário do gestor: roteiros futuros e OS abertas */
{ const _pm=gxPrevMes; gxPrevMes=function(cp){ const out=_pm.apply(this,arguments); try{ const PL=S.pp.plano; if(!PL) return out; const h=hojeStr(), ini=cp+'-01', ult=new Date(+cp.slice(0,4),+cp.slice(5,7),0).getDate(), fim=cp+'-'+pad(ult);
    const add=(d,x)=>{ (out[d]=out[d]||[]).push(x); };
    (PL.rot||[]).filter(r=>r.ativo!==false&&r.prox).forEach(r=>{ const os=ppOs(r), t=r.area+' · '+r.per+' ('+r.resp+')', fr=Math.max(1,+r.freq||30);
      if(os&&r.osDe) add(r.osDe>=ini&&r.osDe<=fim?r.osDe:(r.osDe<ini?ini:fim),{st:os.exec&&os.exec.tecnico?'and':(r.osDe<h?'atr':'pen'),t,os});
      let d=r.prox; for(let i=0;i<400&&d<=fim;i++){ if(d>=ini&&!(os&&r.osDe===d)) add(d,{st:d<h?'atr':'pen',t}); d=ppUtil(addDias(d,fr)); } }); }catch(e){} return out; }; }

/* os roteiros entram na lista de preventivas usada no Início do gestor, nos avisos e no painel da manutenção
   (não na tela "Preventivas", que tem ações só das preventivas avulsas) */
let ppSemRot=false;
{ const _ps=mxPrevStatus; mxPrevStatus=function(){ const out=_ps.apply(this,arguments); if(ppSemRot) return out; try{ const PL=S.pp.plano; if(!PL) return out;
    (PL.rot||[]).filter(r=>r.ativo!==false).forEach(r=>{ const n=ppItens(r).length; out.push({p:{id:'rot-'+r.id,tarefa:ppNomeRot(r)+' ('+n+' itens)',prox:r.prox,freq:r.freq,ultima:r.ult||null,resp:r.resp,rot:r.id},e:{nome:r.area,linha:ppLinhaDe(r.area)||r.area},os:ppOs(r),st:ppSt(r)}); });
    out.sort((a,b)=>String(a.p.prox||'9').localeCompare(String(b.p.prox||'9'))); }catch(e){} return out; }; }
{ const _vp=vManPrev; vManPrev=function(){ ppSemRot=true; try{ let h=_vp.apply(this,arguments); if(S.pp.plano&&viewOk('manplano')) h=h.replace('<section class="card','<div class="pp-av"><b>Plano preventivo:</b> os '+((S.pp.plano.rot||[]).length)+' roteiros da planilha ficam em <button class="lnk" data-go="manplano">Plano preventivo</button>.</div><section class="card'); return h; } finally { ppSemRot=false; } }; }

{ const st=document.createElement('style'); st.id='pp-css'; st.textContent=`
.pp-r{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:6px 14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.pp-r:last-child{border-bottom:0}
.pp-r.atrasada{box-shadow:inset 4px 0 0 var(--crit);padding-left:10px}.pp-r.hoje{box-shadow:inset 4px 0 0 var(--warn);padding-left:10px}
.pp-rd{display:flex;flex-direction:column;align-items:center}.pp-rd b{font-size:17px}.pp-rd small{color:var(--muted);font-size:12px}
.pp-rt{display:flex;flex-direction:column;min-width:0}.pp-rt small{color:var(--muted);font-size:12.5px}
.pp-ra{grid-column:2/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pp-dt{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;color:var(--muted)}.pp-dt input{font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface);color:inherit}
.pp-its{grid-column:1/-1;display:flex;flex-direction:column;gap:4px;background:var(--sunken,#F3F6F8);border-radius:10px;padding:10px 12px;font-size:13.5px}.pp-its small{color:var(--muted)}
.pp-fl{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;margin-bottom:8px}
.pp-chk .pp-ch{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:flex-end}.pp-pbt{color:var(--crit);font-weight:600}
.pp-bar{height:8px;border-radius:5px;background:var(--line);display:flex;overflow:hidden;margin:10px 0}.pp-bar i{background:var(--ok)}.pp-bar i.ppb{background:var(--crit)}
.pp-ga h3{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:12px 0 4px}
.pp-it{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}.pp-it .pp-tx{flex:1 1 260px;font-size:14.5px}.pp-it.pp-s-pb .pp-tx{color:var(--crit)}
.pp-bs{display:flex;gap:6px}.pp-b{font:inherit;font-size:13.5px;font-weight:600;min-height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}
.pp-b.ok[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#fff}.pp-b.ppbx[aria-pressed="true"]{background:var(--crit);border-color:var(--crit);color:#fff}
.pp-obs{flex:1 1 100%}
.pp-cq{display:flex;flex-direction:column;gap:8px;max-height:calc(100vh - 290px);overflow:auto;padding-right:6px}.pp-cq h2{font-size:15px;letter-spacing:.06em;text-transform:uppercase;opacity:.75;margin:10px 0 0}
.pp-cqi{display:grid;grid-template-columns:minmax(0,1fr) 140px 170px;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;border:2px solid transparent;background:rgba(127,127,127,.08)}
.pp-cqi>span{font-size:19px;line-height:1.3}.pp-cqi>span b{display:block;font-size:13px;opacity:.7;letter-spacing:.03em}.pp-cqi>span small{font-size:13px;opacity:.7}
.pp-cqi .cq-bt{min-height:56px;padding:6px 10px}.pp-cqi .cq-bt b{font-size:22px}.pp-cqi.pp-s-ok{background:rgba(60,138,99,.12)}.pp-cqi.pp-s-pb{background:rgba(181,71,63,.12)}.pp-cqi.sel{border-color:currentColor}
.pp-cqr{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pp-opg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.pp-op{display:flex;flex-direction:column;gap:2px}.pp-op .pp-bar{margin:4px 0}.pp-op small{color:var(--muted)}
.pp-pbl{margin-top:10px;display:flex;flex-direction:column;gap:4px;font-size:13.5px}.pp-pbl small{color:var(--muted)}
.pp-av{background:var(--sunken,#F3F6F8);border-radius:12px;padding:10px 14px;font-size:14px;margin:0 0 14px}
.pp-imp{display:flex;flex-direction:column;gap:8px}.pp-imp h2{margin:0}.pp-ig{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.pp-ig>div{background:var(--sunken,#F3F6F8);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column}.pp-ig b{font-size:26px}.pp-ig span{font-size:13px;color:var(--muted)}
.pp-pr{display:flex;flex-direction:column;gap:3px;font-size:13.5px}.pp-pr small{color:var(--muted)}.pp-ib{display:flex;justify-content:flex-end;gap:8px}
@media (max-width:700px){.pp-r{grid-template-columns:52px minmax(0,1fr)}.pp-r .pill{grid-column:2}.pp-cqi{grid-template-columns:1fr 1fr}.pp-cqi>span{grid-column:1/-1}}
`; document.head.appendChild(st); }

/* ===================== Preventivas do gestor: Calendário · Planejar o dia · Plano =====================
   Para o Marcelo, "Preventivas" é onde ele organiza o que a manutenção faz em cada dia (planejado);
   "Chamados" é o imediato. Tarefa programada para um dia fica em config/manutplano.agenda
   [{id,dia,t,onde,local,tipo,paraTec,em,por,removido}] e no dia abre sozinha uma OS (prevId 'ag-<id>', agId, tarefa:true),
   que NÃO aparece na tela Chamados do gestor (lá só entra o que não é preventiva). */
S.gx.pvTab=S.gx.pvTab||'cal'; S.pp.dia=S.pp.dia||hojeStr(); S.pp.agf=S.pp.agf||{t:'',onde:'',local:'',tipo:'',tec:''};
function ppAgenda(){ return ((S.pp.plano||{}).agenda||[]).filter(a=>!a.removido); }
function ppAgOs(a){ return (S.chamados||[]).filter(c=>!manIgnorar(c)&&c.agId===a.id).sort((x,y)=>y.numero-x.numero)[0]||null; }
function ppAgSt(a){ const os=ppAgOs(a), h=hojeStr(); if(os) return manFechada(os)?'feita':(os.exec&&os.exec.tecnico)?'and':'aberta'; return a.dia<h?'atrasada':a.dia===h?'hoje':'prog'; }
async function ppGravaAg(muda){ const g=await S.db.doc('config/manutplano').get(); const d=g.exists?(g.data()||{}):{}; const ag=(d.agenda||[]).map(x=>Object.assign({},x)); muda(ag);
  await S.db.doc('config/manutplano').set({agenda:ag},{merge:true}); S.pp.plano=Object.assign({},S.pp.plano||{},{agenda:ag}); }
/* o que cai num dia: roteiros do plano, preventivas avulsas e tarefas programadas */
function ppDoDia(d){ const out=[], PL=S.pp.plano||{};
  (PL.rot||[]).filter(r=>r.ativo!==false&&r.prox).forEach(r=>{ const os=ppOs(r); if(os&&r.osDe===d){ out.push({k:'rot',r,os,prim:true}); return; }
    let x=r.prox; for(let i=0;i<400&&x<=d;i++){ if(x===d){ out.push({k:'rot',r,os:null,prim:i===0&&!os}); break; } x=ppUtil(addDias(x,Math.max(1,+r.freq||30))); } });
  ((S.mx&&S.mx.cfg&&S.mx.cfg.prev)||[]).filter(p=>p.ativo!==false&&p.prox).forEach(p=>{ const os=typeof mxOsPrev==='function'?mxOsPrev(p):null; if(os&&p.osDe===d){ out.push({k:'av',p,os,prim:true}); return; }
    let x=p.prox; for(let i=0;i<400&&x<=d;i++){ if(x===d){ out.push({k:'av',p,os:null,prim:i===0&&!os}); break; } x=addDias(x,Math.max(1,+p.freq||30)); } });
  ppAgenda().filter(a=>a.dia===d).forEach(a=>out.push({k:'ag',a,os:ppAgOs(a),prim:true}));
  return out; }
function ppDiaCont(d){ return ppDoDia(d).length; }
const PP_AGST={feita:['Feita','ok'],and:['Em andamento','prod'],aberta:['OS aberta','warn'],atrasada:['Atrasada','crit'],hoje:['Hoje','warn'],prog:['Programada','neu']};
function ppOndeSel(id,val){ const L=linhasOrd(), locs=(typeof GCH_LOCAIS!=='undefined'?GCH_LOCAIS:['Prédio / escritório','Pátio','Portaria','Almoxarifado','Refeitório','Oficina']);
  return `<select id="${id}" class="txt"><option value="">Onde…</option><optgroup label="Linhas">${L.map(l=>`<option ${val===l?'selected':''}>${esc(l)}</option>`).join('')}</optgroup><optgroup label="Fora das linhas">${locs.map(l=>`<option ${val===l?'selected':''}>${esc(l)}</option>`).join('')}</optgroup></select>`; }
function vPpDia(){ const d=S.pp.dia||hojeStr(), h=hojeStr(), xs=ppDoDia(d), F=S.pp.agf, w0=addDias(d,-((new Date(d+'T12:00:00').getDay()+6)%7));
  const sem=Array.from({length:7},(_,i)=>addDias(w0,i)).map(x=>{ const n=ppDiaCont(x), fds=[0,6].includes(new Date(x+'T12:00:00').getDay()); return `<button class="pp-wd${x===d?' on':''}${x===h?' hoje':''}${fds?' fds':''}" data-act="ppg-dia" data-d="${x}"><span>${ppSemana(x)}</span><b>${+x.slice(8)}</b><small>${n?n+' ite'+(n>1?'ns':'m'):'—'}</small></button>`; }).join('');
  const tecs=(typeof gchTecs==='function'?gchTecs():[]);
  const lin=x=>{ if(x.k==='rot'){ const r=x.r, n=ppItens(r).length, st=x.os?(x.os.exec&&x.os.exec.tecnico?'and':'aberta'):(d<h?'atrasada':d===h?'hoje':'prog'), ab=S.pp.ab[r.id];
      return `<div class="pp-dl"><span class="pp-tag pp-tg-rot">Plano</span><div class="pp-dt2"><b>${esc(r.area)} · ${esc(r.per)}</b><small>${esc(r.resp)} · ${n} itens no checklist${x.prim?'':' · repetição prevista'}</small>${ab?`<div class="pp-its">${ppItens(r).map(t=>`<div><b>${esc(t.ativo||t.cod)}</b> ${esc(t.t)}</div>`).join('')}</div>`:''}</div><span class="pill ${PP_AGST[st][1]}">${PP_AGST[st][0]}</span>
        <div class="pp-da"><button class="eq-lk" data-act="pp-ver" data-id="${esc(r.id)}">${ab?'Esconder itens':'Ver itens'}</button>${x.os?`<button class="btn sec" data-act="man-abrir" data-n="${x.os.numero}" data-ir="1">OS ${manNum(x.os.numero)}</button>`:x.prim?`<label class="pp-dt"><span>passar para</span><input type="date" data-ppg-mv="rot|${esc(r.id)}" value="${d}"></label><button class="eq-lk" data-act="pp-gerar" data-id="${esc(r.id)}">${ic('play',15,2)}Gerar OS agora</button>`:''}</div></div>`; }
    if(x.k==='av'){ const p=x.p, e=typeof mxEquip==='function'?mxEquip(p.equip):null, st=x.os?'aberta':(d<h?'atrasada':d===h?'hoje':'prog');
      return `<div class="pp-dl"><span class="pp-tag pp-tg-av">Preventiva</span><div class="pp-dt2"><b>${esc(p.tarefa)}</b><small>${esc((e&&e.nome)||'')}${e&&e.linha?' · '+esc(e.linha):''}${p.resp?' · '+esc(p.resp):''} · a cada ${p.freq} dias</small></div><span class="pill ${PP_AGST[st][1]}">${PP_AGST[st][0]}</span>
        <div class="pp-da">${x.os?`<button class="btn sec" data-act="man-abrir" data-n="${x.os.numero}" data-ir="1">OS ${manNum(x.os.numero)}</button>`:x.prim?`<label class="pp-dt"><span>passar para</span><input type="date" data-ppg-mv="av|${esc(p.id)}" value="${d}"></label>`:''}</div></div>`; }
    const a=x.a, st=ppAgSt(a), cf=S.pp.agDel===a.id;
    return `<div class="pp-dl"><span class="pp-tag pp-tg-ag">Tarefa</span><div class="pp-dt2"><b>${esc(a.t)}</b><small>${esc(a.onde||'')}${a.local?' · '+esc(a.local):''}${a.tipo&&typeof gchTipoT==='function'?' · '+esc(gchTipoT(a.tipo)):''}${a.paraTec?' · para '+esc(a.paraTec):' · qualquer técnico'}</small></div><span class="pill ${PP_AGST[st][1]}">${PP_AGST[st][0]}</span>
      <div class="pp-da">${x.os?`<button class="btn sec" data-act="man-abrir" data-n="${x.os.numero}" data-ir="1">OS ${manNum(x.os.numero)}</button>`:`<label class="pp-dt"><span>passar para</span><input type="date" data-ppg-mv="ag|${esc(a.id)}" value="${d}"></label><button class="eq-lk del" data-act="ppg-tira" data-id="${esc(a.id)}">${cf?'Toque de novo para tirar':'Tirar'}</button>`}</div></div>`; };
  const ordem={ag:0,rot:1,av:2};
  const op=d===h?(()=>{ const k=((S.pp.ck[h]||{}).it)||{}, ops=((S.pp.plano||{}).tarefas||[]).filter(t=>!t.rot&&ppOp(t)); if(!ops.length) return ''; const f=ops.filter(t=>k[t.id]&&k[t.id].s).length, pb=ops.filter(t=>k[t.id]&&k[t.id].s==='pb').length;
      return `<section class="card pp-opr"><b>Checklist do operador hoje</b><div class="pp-bar"><i style="width:${f/ops.length*100}%"></i></div><span>${f} de ${ops.length} itens feitos no computador da Nexus${pb?' · <span class="pp-pbt">'+pb+' com problema</span>':''}</span><button class="lnk" data-act="ppg-tab" data-v="plano">ver por área</button></section>`; })():'';
  return `<section class="card pp-dhd"><div class="pp-dnav"><button class="btn sec" data-act="ppg-dia" data-d="${addDias(d,-1)}" aria-label="Dia anterior">‹</button><div><b>${(x=>x.charAt(0).toUpperCase()+x.slice(1))(new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}))}</b><small>${xs.length?xs.length+' programado'+(xs.length>1?'s':''):'nada programado'}${d===h?' · hoje':''}</small></div><button class="btn sec" data-act="ppg-dia" data-d="${addDias(d,1)}" aria-label="Próximo dia">›</button>
      <input type="date" class="txt" data-ppg-ir value="${d}" aria-label="Ir para o dia">${d!==h?`<button class="lnk" data-act="ppg-dia" data-d="${h}">hoje</button>`:''}</div><div class="pp-wk">${sem}</div></section>
    ${op}
    <div class="pp-dg"><section class="card"><h2 class="pp-h2">O que a manutenção faz neste dia</h2>${xs.length?xs.sort((a,b)=>ordem[a.k]-ordem[b.k]).map(lin).join(''):'<div class="empty">Nada programado. Use "Programar tarefa" ao lado.</div>'}
       <p class="sub" style="font-size:12.5px;margin:10px 0 0">No dia, cada item abre uma OS sozinho na fila da manutenção (computador de chamados, posto e Manutenção). Para algo imediato, use <button class="lnk" data-go="gxch">Chamados</button>.</p></section>
     <section class="card pp-agf"><h2 class="pp-h2">Programar tarefa para ${dm(d)}</h2>
       <label class="gx-f">O que fazer<input id="ppg-t" maxlength="200" value="${esc(F.t)}" placeholder="Ex.: pintar a faixa do pátio, revisar o portão"></label>
       <label class="gx-f">Onde${ppOndeSel('ppg-o',F.onde)}</label>
       <label class="gx-f">Detalhe do lugar (opcional)<input id="ppg-l" maxlength="60" value="${esc(F.local)}" placeholder="Ex.: máquina, portão 2"></label>
       <div class="gx-f3"><label class="gx-f">Tipo<select id="ppg-tp"><option value="">—</option>${(typeof GCH_TIPOS!=='undefined'?GCH_TIPOS:[]).map(([k,t])=>`<option value="${k}" ${F.tipo===k?'selected':''}>${t}</option>`).join('')}</select></label>
        <label class="gx-f">Para quem<select id="ppg-tc"><option value="">Qualquer técnico</option>${tecs.map(t=>`<option value="${esc(t.nome)}" ${F.tec===t.nome?'selected':''}>${esc(t.nome)}${t.area?' · '+esc(t.area):''}</option>`).join('')}</select></label></div>
       <button class="btn" data-act="ppg-add" ${S.pp.busy?'disabled':''} style="margin-top:12px">${ic('mais',18,2)}Programar para ${dm(d)}</button></section></div>`; }
function ppgLe(){ const F=S.pp.agf, v=id=>{ const e=document.getElementById(id); return e?e.value:null; }; [['t','ppg-t'],['onde','ppg-o'],['local','ppg-l'],['tipo','ppg-tp'],['tec','ppg-tc']].forEach(([k,id])=>{ const x=v(id); if(x!=null) F[k]=x; }); }
/* abre a OS da tarefa programada no dia */
async function ppAgGera(a){ if(typeof soVer==='function'&&soVer()) return null; let lk=null; try{ lk=S.db.doc('config/manut-ag-'+a.id); const r=await lk.acquire({holder:S.uid||('t'+Math.random()),ttlMs:9000}); if(!r.acquired) return null; }catch(e){ lk=null; }
  try{ const g=await S.db.doc('config/manutplano').get(); const dd=g.exists?(g.data()||{}):{}; const aa=(dd.agenda||[]).find(x=>x.id===a.id); if(!aa||aa.removido||aa.osDe||ppAgOs(aa)) return null;
    const agora=new Date(), loc=new Date(agora.getTime()-agora.getTimezoneOffset()*6e4).toISOString().slice(0,16), tp=aa.tipo&&typeof gchTipoT==='function'?gchTipoT(aa.tipo):'';
    const doc=await mxNovaOS({linha:aa.onde||'Geral',local:aa.local||null,quando:loc,defeito:aa.t,tipo:aa.tipo||null,impacto:'nao',prioridade:'normal',prazo:aa.dia,paraTec:aa.paraTec||null,tarefa:true,nome:aa.porNome||'Gestor',equip:(aa.local?aa.local+' · ':'')+'Programada'+(tp?' · '+tp:''),equipId:null,status:'Aberta',criado:agora.toISOString(),por:S.uid||null,
      prevId:'ag-'+aa.id,agId:aa.id,origem:'preventiva-agenda',exec:{tipo:'Preventiva'},hist:[{em:agora.toISOString(),por:S.uid||null,o:'Tarefa programada para '+dm(aa.dia)+' aberta'+(aa.paraTec?' para '+aa.paraTec:'')}]});
    await ppGravaAg(ag=>{ const x=ag.find(y=>y.id===aa.id); if(x){ x.osDe=hojeStr(); x.os=doc.numero; } }); return doc; }
  finally{ try{ lk&&await lk.release(); }catch(e){} } }
setInterval(async()=>{ const P=S.pp; if(P.agGerando||!P.lido||!S.db) return; try{ if(!(viewOk('manch')||(typeof ofOn==='function'&&ofOn()))||(typeof soVer==='function'&&soVer())) return; }catch(e){ return; }
  const h=hojeStr(), dev=ppAgenda().filter(a=>a.dia&&a.dia<=h&&!a.osDe&&!ppAgOs(a)).slice(0,6); if(!dev.length) return; P.agGerando=true;
  try{ for(const a of dev) await ppAgGera(a); }catch(e){ console.warn('[plano] tarefa programada',e); } P.agGerando=false; },9000);
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ppg-"]'); if(!b) return; const P=S.pp, a=b.dataset.act;
  if(a==='ppg-tab'){ ppgLe(); S.gx.pvTab=b.dataset.v; render(); return; }
  if(a==='ppg-dia'){ ppgLe(); P.dia=b.dataset.d; P.agDel=null; render(); return; }
  if(a==='ppg-tira'){ const id=b.dataset.id; if(P.agDel!==id){ P.agDel=id; render(); setTimeout(()=>{ if(P.agDel===id){ P.agDel=null; render(); } },5000); return; }
    P.agDel=null; try{ await ppGravaAg(ag=>{ const x=ag.find(y=>y.id===id); if(x){ x.removido=true; x.remEm=new Date().toISOString(); } }); toast('Tarefa tirada da programação.'); }catch(e){ toast('Não foi possível tirar.'); } render(); return; }
  if(a==='ppg-add'){ ppgLe(); const F=P.agf, d=P.dia||hojeStr(), t=String(F.t||'').trim(); if(!t){ toast('Escreva o que a manutenção vai fazer.'); return; } if(!F.onde){ toast('Escolha onde é o serviço.'); return; } if(d<hojeStr()){ toast('Esse dia já passou. Escolha hoje ou um dia à frente.'); return; }
    P.busy=true; render(); const nome=(()=>{ try{ return nomeDe(S.uid)||'Gestor'; }catch(e){ return 'Gestor'; } })();
    try{ await ppGravaAg(ag=>{ ag.push({id:mxId(),dia:d,t:t.slice(0,200),onde:F.onde,local:String(F.local||'').trim()||null,tipo:F.tipo||null,paraTec:F.tec||null,em:new Date().toISOString(),por:S.uid||null,porNome:nome}); });
      P.agf={t:'',onde:F.onde,local:'',tipo:F.tipo,tec:F.tec}; toast('Tarefa programada para '+dm(d)+'.'+(d===hojeStr()?' A OS abre em instantes.':'')); }
    catch(e){ console.warn('[plano] programar',e); toast('Não foi possível programar. Verifique a internet.'); }
    P.busy=false; render(); return; } });
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset) return;
  if(t.dataset.ppgIr!=null&&t.value){ ppgLe(); S.pp.dia=t.value; render(); return; }
  if(t.dataset.ppgMv&&t.value){ const [k,id]=t.dataset.ppgMv.split('|'), d=t.value;
    try{ if(k==='rot') await ppGravaRot(rot=>{ const x=rot.find(y=>y.id===id); if(x){ x.prox=d; x.osDe=null; } });
      else if(k==='av') await mxGrava(cf=>{ const x=(cf.prev||[]).find(y=>y.id===id); if(x) x.prox=d; });
      else if(k==='ag') await ppGravaAg(ag=>{ const x=ag.find(y=>y.id===id); if(x) x.dia=d; });
      toast('Passou para '+dm(d)+'.'); }catch(e){ toast('Não foi possível mudar o dia.'); } render(); } });
/* calendário: tarefas programadas também; tocar no dia abre "Planejar o dia" */
{ const _pm=gxPrevMes; gxPrevMes=function(cp){ const out=_pm.apply(this,arguments); try{ ppAgenda().filter(a=>a.dia&&a.dia.slice(0,7)===cp).forEach(a=>{ const os=ppAgOs(a); if(os&&os.status==='Concluída') return; const st=ppAgSt(a); (out[a.dia]=out[a.dia]||[]).push({st:st==='and'?'and':st==='atrasada'?'atr':'pen',t:'Tarefa: '+a.t,os}); }); }catch(e){} return out; }; }
{ const _ps=mxPrevStatus; mxPrevStatus=function(){ const out=_ps.apply(this,arguments); if(ppSemRot) return out; try{ const h=hojeStr();
    ppAgenda().forEach(a=>{ const st=ppAgSt(a); if(st==='feita') return; out.push({p:{id:'ag-'+a.id,tarefa:'Tarefa: '+a.t,prox:a.dia,resp:a.paraTec||'',ag:a.id},e:{nome:a.onde+(a.local?' · '+a.local:''),linha:a.onde},os:ppAgOs(a),st:st==='and'||st==='aberta'?'aberta':st==='atrasada'?'atrasada':st==='hoje'?'hoje':a.dia<=addDias(h,7)?'semana':'ok'}); });
    out.sort((x,y)=>String(x.p.prox||'9').localeCompare(String(y.p.prox||'9'))); }catch(e){} return out; }; }
CRUMB.gxcal='Preventivas';
{ const _vc=vGxCal; vGxCal=function(){ const tab=S.gx.pvTab||'cal', solo=typeof gxSolo==='function'&&gxSolo();
  const tabs=`<div class="gx-rt pp-tabs" role="tablist" aria-label="Preventivas">${[['cal','Calendário'],['dia','Planejar o dia'],['plano','Plano (roteiros)']].map(([k,t])=>`<button role="tab" data-act="ppg-tab" data-v="${k}" class="${tab===k?'on':''}" aria-selected="${tab===k}">${t}</button>`).join('')}</div>`;
  if(tab==='cal'){ let h=_vc.apply(this,arguments); h=h.replace('Calendário de preventivas','Preventivas'); if(solo) h=h.replace('<button class="btn sec" data-go="manprev">Lista de preventivas</button>','');
    const cp=S.gx.cal||hojeStr().slice(0,7); h=h.replace(/<div class="gx-cd([^"]*)"><div class="gx-cdh"><b>(\d+)<\/b>/g,(m,c,n)=>`<div class="gx-cd${c} pp-cdk" data-ppd="${cp}-${pad(+n)}" title="Planejar o dia ${pad(+n)}"><div class="gx-cdh"><b>${n}</b>`);
    const i=h.indexOf('<section'); return (i>=0?h.slice(0,i)+tabs+h.slice(i):h+tabs)+'<p class="sub" style="font-size:12.5px">Toque num dia para ver e organizar o que a manutenção faz nele.</p>'; }
  const cab=`${banner()}${gxCab('MANUTENÇÃO','Preventivas','')}${tabs}`;
  if(tab==='dia') return cab+vPpDia();
  return cab+vManPlano(true); }; S.extViews.gxcal=vGxCal; }
document.addEventListener('click',ev=>{ const c=ev.target.closest&&ev.target.closest('.pp-cdk[data-ppd]'); if(!c||ev.target.closest('button')) return; S.pp.dia=c.dataset.ppd; S.gx.pvTab='dia'; render(); window.scrollTo(0,0); });
/* no login do gestor, "Programar preventiva" leva a Preventivas › Planejar o dia */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-go="manprev"]'); if(!b||!(typeof gxSolo==='function'&&gxSolo())) return; ev.stopPropagation(); ev.preventDefault(); S.gx.pvTab='dia'; go('gxcal'); },true);
{ const st=document.createElement('style'); st.id='pp-css2'; st.textContent=`
.pp-tabs{margin:0}.pp-emb{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}
.pp-cdk{cursor:pointer}.pp-cdk:hover{border-color:var(--teal-strong,#143F54)}
.pp-dhd{display:flex;flex-direction:column;gap:12px}.pp-dnav{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.pp-dnav>div{display:flex;flex-direction:column;min-width:220px}.pp-dnav>div b{font-size:20px}.pp-dnav>div small{color:var(--muted)}.pp-dnav input{max-width:170px}
.pp-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.pp-wd{font:inherit;color:inherit;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;border-radius:12px;border:2px solid var(--line);background:var(--surface);cursor:pointer}
.pp-wd span{font-size:12px;color:var(--muted);text-transform:uppercase}.pp-wd b{font-size:20px}.pp-wd small{font-size:12px;color:var(--muted)}.pp-wd.on{border-color:var(--teal-strong,#143F54);background:rgba(20,63,84,.07)}.pp-wd.hoje b{color:var(--crit)}.pp-wd.fds{opacity:.6}
.pp-dg{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:18px;align-items:start}@media (max-width:1100px){.pp-dg{grid-template-columns:1fr}}
.pp-h2{font-size:17px;margin:0 0 6px}
.pp-dl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.pp-dl:last-of-type{border-bottom:0}
.pp-dt2{display:flex;flex-direction:column;min-width:0}.pp-dt2 small{color:var(--muted);font-size:12.5px}.pp-da{grid-column:2/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pp-tag{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:6px;padding:3px 8px;align-self:start;margin-top:2px}.pp-tag.pp-tg-rot{background:#E3EEF3;color:#1F5568}.pp-tag.pp-tg-av{background:#EEF2F4;color:#55666F}.pp-tag.pp-tg-ag{background:#F6EEDC;color:#8A5A12}
.pp-opr{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}.pp-opr .pp-bar{flex:1 1 200px;margin:0}
.pp-agf .gx-f input,.pp-agf .gx-f select{font:inherit;font-size:15px}
:root[data-theme="dark"] .pp-tag.pp-tg-rot{background:#1E3A48;color:#CFE3EC}:root[data-theme="dark"] .pp-tag.pp-tg-av{background:#2A3236;color:#C9D3DA}:root[data-theme="dark"] .pp-tag.pp-tg-ag{background:#3D3220;color:#F1D9A8}
`; document.head.appendChild(st); }

/* ===================== Editar, apagar e criar roteiros (e os itens do operador) =====================
   Grava em config/manutplano: tarefas mexidas ficam com editado:true, criadas com manual:true; roteiro criado/editado manual:true;
   apagadas entram em apagados[] (reimportar a planilha não traz de volta). A OS já aberta segue com o checklist que tinha. */
const PP_PERS=[['Diária',1],['Semanal',7],['Quinzenal',15],['Mensal',30],['Bimestral',60],['Trimestral',90],['Semestral',180],['Anual',365]];
function ppEdLe(){ const E=S.pp.ed; if(!E) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  [['area','ppe-area'],['per','ppe-per'],['resp','ppe-resp'],['prox','ppe-prox']].forEach(([k,id])=>{ const x=v(id); if(x!=null) E[k]=x; });
  document.querySelectorAll('[data-ppe-i]').forEach(el=>{ const it=E.itens[+el.dataset.ppeI]; if(it) it[el.dataset.ppeK]=el.value; }); }
function ppEdHtml(){ const E=S.pp.ed; if(!E) return ''; const PL=S.pp.plano||{}, op=E.op;
  const areas=[...new Set([...(PL.rot||[]).map(r=>r.area),...(PL.tarefas||[]).map(t=>t.area),...linhasOrd()])].filter(Boolean).sort();
  const eqs=[...new Set(['Mecânica','Elétrica','Automação',...(PL.rot||[]).map(r=>r.resp)])].filter(x=>x&&ppNorm(x)!=='operador');
  const ativos=[...new Set((PL.tarefas||[]).map(t=>t.ativo).filter(Boolean))].sort();
  return `<div class="gx-modal pp-edm" role="dialog" aria-modal="true" aria-labelledby="ppe-t"><div class="card gx-mc pp-edc"><h2 id="ppe-t">${op?'Checklist do dia (computador da Nexus)':E.id?'Editar roteiro':'Novo roteiro'}</h2>
   ${op?'<p class="sub" style="margin:0 0 6px">Itens que o pessoal da Nexus confere todo dia no computador da Nexus (passa o crachá e faz o checklist). A área agrupa os itens na tela.</p>':`
   <div class="gx-f3"><label class="gx-f">Área<input id="ppe-area" list="ppe-al" maxlength="60" value="${esc(E.area||'')}" placeholder="Ex.: Linha 1, Descarga de areia"></label>
    <label class="gx-f">Periodicidade<select id="ppe-per">${PP_PERS.filter(x=>x[1]>1||!op).map(([n,f])=>`<option value="${n}" ${E.per===n?'selected':''}>${n}</option>`).join('')}</select></label>
    <label class="gx-f">Equipe<input id="ppe-resp" list="ppe-el" maxlength="40" value="${esc(E.resp||'')}" placeholder="Mecânica, Elétrica…"></label>
    <label class="gx-f">Próxima data<input id="ppe-prox" type="date" value="${esc(E.prox||'')}"></label></div>`}
   <datalist id="ppe-al">${areas.map(a=>`<option value="${esc(a)}">`).join('')}</datalist><datalist id="ppe-el">${eqs.map(a=>`<option value="${esc(a)}">`).join('')}</datalist><datalist id="ppe-atl">${ativos.map(a=>`<option value="${esc(a)}">`).join('')}</datalist>
   <div class="pp-edh"><b>${E.itens.length} ite${E.itens.length===1?'m':'ns'} no checklist</b><button class="btn sec" data-act="ppe-add">${ic('mais',16,2)}Acrescentar item</button></div>
   <div class="pp-edl">${E.itens.map((it,i)=>`<div class="pp-edi">${op?`<input data-ppe-i="${i}" data-ppe-k="area" list="ppe-al" maxlength="60" value="${esc(it.area||'')}" placeholder="Área" aria-label="Área do item ${i+1}">`:''}<input data-ppe-i="${i}" data-ppe-k="ativo" list="ppe-atl" maxlength="80" value="${esc(it.ativo||'')}" placeholder="Máquina / ativo" aria-label="Máquina do item ${i+1}"><textarea data-ppe-i="${i}" data-ppe-k="t" maxlength="200" rows="2" placeholder="O que conferir ou fazer" aria-label="Tarefa do item ${i+1}">${esc(it.t||'')}</textarea><button class="pp-edx" data-act="ppe-x" data-i="${i}" aria-label="Tirar o item ${i+1}">×</button></div>`).join('')||'<div class="empty">Nenhum item. Use "Acrescentar item".</div>'}</div>
   <div class="gx-ac pp-edb"><button class="btn sec" data-act="ppe-canc">Cancelar</button><button class="btn" data-act="ppe-salvar" ${S.pp.busy?'disabled':''}>${S.pp.busy?'Gravando…':'Salvar'}</button></div></div></div>`; }
{ const _vp=vManPlano; vManPlano=function(){ return _vp.apply(this,arguments)+ppEdHtml(); }; S.extViews.manplano=vManPlano; }
function ppEdAbre(r){ const PL=S.pp.plano||{};
  if(r==='op'){ S.pp.ed={op:true,itens:(PL.tarefas||[]).filter(t=>!t.rot&&ppOp(t)).map(t=>({id:t.id,area:t.area,ativo:t.ativo||'',t:t.t,cod:t.cod||''}))}; }
  else if(r){ S.pp.ed={id:r.id,area:r.area,per:r.per,resp:r.resp,prox:r.prox||'',itens:ppItens(r).map(t=>({id:t.id,ativo:t.ativo||'',t:t.t,cod:t.cod||''}))}; }
  else S.pp.ed={id:null,area:'',per:'Mensal',resp:'Mecânica',prox:ppUtil(addDias(hojeStr(),1)),itens:[{ativo:'',t:''}]};
  render(); }
async function ppEdSalvar(){ const P=S.pp, E=P.ed; ppEdLe(); if(!E||P.busy) return;
  const itens=E.itens.map(i=>Object.assign({},i,{t:String(i.t||'').trim(),ativo:String(i.ativo||'').trim(),area:String(i.area||'').trim()})).filter(i=>i.t);
  if(!E.op){ if(!String(E.area||'').trim()){ toast('Escreva a área do roteiro.'); return; } if(!String(E.resp||'').trim()){ toast('Escreva a equipe.'); return; } if(ppNorm(E.resp)==='operador'){ toast('Item do operador fica no checklist do posto: use "Editar os itens" do checklist do operador.'); return; } if(!itens.length){ toast('Coloque pelo menos um item.'); return; } }
  else if(itens.some(i=>!i.area)){ toast('Todo item do operador precisa da área.'); return; }
  P.busy=true; render(); const em=new Date().toISOString();
  try{ const g=await S.db.doc('config/manutplano').get(); const d=g.exists?(g.data()||{}):{}; let tar=(d.tarefas||[]).map(t=>Object.assign({},t)), rot=(d.rot||[]).map(r=>Object.assign({},r)); const apag=new Set(d.apagados||[]);
    if(E.op){ const antes=tar.filter(t=>!t.rot&&ppOp(t)), fica=new Set(itens.filter(i=>i.id).map(i=>i.id)); antes.forEach(t=>{ if(!fica.has(t.id)) apag.add(t.id); });
      tar=tar.filter(t=>!(!t.rot&&ppOp(t)));
      itens.forEach(i=>{ const old=antes.find(t=>t.id===i.id); const mud=!old||old.t!==i.t||old.ativo!==i.ativo||old.area!==i.area;
        tar.push(Object.assign({},old||{},{id:i.id||('M'+mxId()),area:i.area,ativo:i.ativo,cod:i.cod||'',t:i.t,per:'Diária',freq:1,resp:'Operador',rot:null},old?(mud?{editado:true,edEm:em}:{}):{manual:true,edEm:em})); }); }
    else { const pr=PP_PERS.find(x=>x[0]===E.per)||['Mensal',30], area=String(E.area).trim(), resp=String(E.resp).trim(); let id=E.id;
      if(!id){ id='m'+mxId(); rot.push({id,area,per:pr[0],freq:pr[1],resp,n:itens.length,prox:E.prox||ppUtil(addDias(hojeStr(),1)),ult:null,manual:true,em}); }
      else { const r=rot.find(x=>x.id===id); if(r) Object.assign(r,{area,per:pr[0],freq:pr[1],resp,n:itens.length,manual:true,edEm:em},E.prox&&E.prox!==r.prox?{prox:E.prox,osDe:null}:{}); }
      const antes=tar.filter(t=>t.rot===id), fica=new Set(itens.filter(i=>i.id).map(i=>i.id)); antes.forEach(t=>{ if(!fica.has(t.id)) apag.add(t.id); });
      tar=tar.filter(t=>t.rot!==id);
      itens.forEach(i=>{ const old=antes.find(t=>t.id===i.id); tar.push(Object.assign({},old||{},{id:i.id||('M'+mxId()),area,ativo:i.ativo,cod:i.cod||'',t:i.t,per:pr[0],freq:pr[1],resp,rot:id},old?{editado:true,edEm:em}:{manual:true,edEm:em})); }); }
    await S.db.doc('config/manutplano').set({tarefas:tar,rot,apagados:[...apag]},{merge:true});
    P.plano=Object.assign({},P.plano||{},{tarefas:tar,rot,apagados:[...apag]}); P.ed=null; toast(E.op?'Checklist do operador salvo.':E.id?'Roteiro salvo.':'Roteiro criado.'); }
  catch(e){ console.warn('[plano] salvar roteiro',e); toast('Não foi possível salvar. Verifique a internet.'); }
  P.busy=false; render(); }
async function ppApagar(id){ const P=S.pp; try{ const g=await S.db.doc('config/manutplano').get(); const d=g.exists?(g.data()||{}):{};
    const apag=new Set(d.apagados||[]); (d.tarefas||[]).filter(t=>t.rot===id).forEach(t=>apag.add(t.id));
    const tar=(d.tarefas||[]).filter(t=>t.rot!==id), rot=(d.rot||[]).filter(r=>r.id!==id);
    await S.db.doc('config/manutplano').set({tarefas:tar,rot,apagados:[...apag]},{merge:true}); P.plano=Object.assign({},P.plano||{},{tarefas:tar,rot,apagados:[...apag]}); toast('Roteiro apagado.'); }
  catch(e){ toast('Não foi possível apagar.'); } render(); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ppe-"]'); if(!b) return; const P=S.pp, a=b.dataset.act;
  if(a==='ppe-novo'){ ppEdAbre(null); setTimeout(()=>{ const i=document.getElementById('ppe-area'); i&&i.focus(); },50); return; }
  if(a==='ppe-ed'){ const r=ppRotDe(b.dataset.id); if(r) ppEdAbre(r); return; }
  if(a==='ppe-op'){ ppEdAbre('op'); return; }
  if(a==='ppe-apagar'){ const id=b.dataset.id; if(P.apg!==id){ P.apg=id; render(); setTimeout(()=>{ if(P.apg===id){ P.apg=null; render(); } },5000); return; } P.apg=null; ppApagar(id); return; }
  if(a==='ppe-add'){ ppEdLe(); P.ed.itens.push({ativo:'',t:'',area:P.ed.op?((P.ed.itens[P.ed.itens.length-1]||{}).area||''):''}); render(); setTimeout(()=>{ const xs=document.querySelectorAll('[data-ppe-k="t"]'); xs.length&&xs[xs.length-1].focus(); },50); return; }
  if(a==='ppe-x'){ ppEdLe(); P.ed.itens.splice(+b.dataset.i,1); render(); return; }
  if(a==='ppe-canc'){ P.ed=null; render(); return; }
  if(a==='ppe-salvar'){ ppEdSalvar(); return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.pp.ed){ S.pp.ed=null; render(); } });
{ const st=document.createElement('style'); st.id='pp-css3'; st.textContent=`
.pp-sp{flex:1}.pp-edc{width:min(900px,100%)}.pp-edh{display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px}
.pp-edl{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto;padding-right:4px}
.pp-edi{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,2fr) 40px;gap:8px;align-items:start}.pp-edm .pp-edi:has(input[data-ppe-k="area"]){grid-template-columns:minmax(0,.8fr) minmax(0,.9fr) minmax(0,2fr) 40px}
.pp-edi input,.pp-edi textarea{resize:vertical;font:inherit;font-size:14.5px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--surface);color:inherit;min-width:0}
.pp-edx{font:inherit;font-size:20px;line-height:1;width:40px;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--crit);cursor:pointer}
.pp-edb{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
@media (max-width:700px){.pp-edi,.pp-edm .pp-edi:has(input[data-ppe-k="area"]){grid-template-columns:1fr 40px}.pp-edi textarea{grid-column:1}}
`; document.head.appendChild(st); }
