/* ===================== INVENTÁRIO = O PROGRAMA "GESTÃO DE ALMOXARIFADO" (pedido de 13/10) =====================
   O módulo Inventário passa a ser o próprio programa da Iasmyn (pasta inventario/), igual: mesmas telas, mesmo layout,
   mesmas funções da Conferência: Contagem · Recebimento · Auditoria. As Transferências do programa NÃO entram (pedido de 13/10).
   - Os dados ficam no banco do painel (não na planilha): conferencias, auditorias, recebimentos e alxfila (auditoria aberta/descartada).
     A ponte é inventario/js/ponte-painel.js.
   - Quem só tem o Inventário (conferentes, auditor…) vê o programa em tela cheia, como antes. Os outros veem dentro do painel.
   - O programa abre num iframe fixo sobre o espaço da tela (como as fichas do RH), para não recarregar quando o painel redesenha.
   - Para voltar às telas antigas do painel: config/geral.invAntigo = true. */
const INV={pedido:null,t0:Date.now(),frm:null};
const INV_PERF={pcp:'administrador',supsis:'supervisor sistema',sup:'supervisor',conf:'conferente',conf2:'conferente 2',conf3:'conferente 3',confa1:'conferente almox 1',confa2:'conferente almox 2',auditor:'auditor'};
const INV_SUF={a3:'almox3',a30:'almox30',rej:'rejunte',sep:'separação',a1:'almox1',a2:'almox2'};
function invLigado(){ return !(S.cfg&&S.cfg.invAntigo===true); }
function invChavePainel(k){ const m=String(k||'').match(/^([^_]+)_(.+)_(almox30|almox3|rejunte|separação|almox1|almox2)(_reconta_\d+)?$/); if(!m) return String(k||'').replace(/\//g,'-').slice(0,600);
  const id=Object.keys(INV_SUF).find(x=>INV_SUF[x]===m[3]); return m[1]+'_'+m[2]+'_'+id+(m[4]||''); }
/* quem só tem o Inventário: o programa ocupa a tela toda (como era o programa) */
function invSolo(){ const A=S.acs; if(!A||!A.pronto||A.dono||!invLigado()) return false; let p=null; try{ p=acsP(); }catch(e){} if(!p||p.tudo) return false;
  const ms=p.mods||[]; return ms.length>0&&ms.every(m=>m==='almox')&&viewOk('inventario'); }
(function(){
  VIEWS.inventario={nome:'Inventário',ic:'caixa',mob:'Inventário'}; CRUMB.inventario='Inventário';
  const M=MODS.find(m=>m.id==='almox'); if(M){ M._antigas=M.views.slice(); M.views=['inventario']; }
})();
{ const _vo=viewOk; viewOk=function(v){
    if(v==='inventario'){ if(!invLigado()) return false; const p=acsP(); if(!p) return false; if(p.tudo) return true; return (p.mods||[]).includes('almox')&&(p.locais||[]).length>0&&!!(p.contar||p.receber||p.auditar||p.verAud); }
    return _vo.apply(this,arguments); }; }
/* com o programa ligado, as telas antigas do inventário (alx…) abrem o programa na parte certa */
{ const _mv=mViews; mViews=function(m){ if(m&&m.id==='almox'&&m._antigas&&!invLigado()) return m._antigas.filter(viewOk); return _mv.apply(this,arguments); }; }
{ const _go=go; go=function(v){ if(String(v).startsWith('alx')&&invLigado()&&viewOk('inventario')){ INV.pedido=v==='alxaud'?'auditoria':v==='alxrec'?'recebimento':'contagem'; v='inventario'; }
    return _go.apply(this,[v].concat([].slice.call(arguments,1))); }; }
{ const _rd=render; render=function(){ const solo=invSolo(); document.body.classList.toggle('inv-solo',solo); if(solo&&S.view!=='inventario'){ S.view='inventario'; S.mod='almox'; }
    if(String(S.view).startsWith('alx')&&invLigado()&&viewOk('inventario')) S.view='inventario';
    return _rd.apply(this,arguments); }; }
S.extViews.inventario=()=>'<div id="inv-slot" class="inv-slot"></div>';

function invFrame(){ if(!INV.frm){ INV.uidFrm=S.uid||null; const f=document.createElement('iframe'); f.src='inventario/index.html'; f.title='Inventário'; f.className='inv-frx'; f.setAttribute('allow','clipboard-write'); document.body.appendChild(f); INV.frm=f; } return INV.frm; }
function invSync(){ /* saiu ou trocou de pessoa: fecha o programa (ele guarda quem estava logado) e volta a mostrar o painel/login */
  if(INV.frm&&INV.uidFrm!==(S.uid||null)){ INV.frm.remove(); INV.frm=null; }
  if(document.body.classList.contains('inv-solo')&&!invSolo()) document.body.classList.remove('inv-solo');
  const slot=document.getElementById('inv-slot'), solo=document.body.classList.contains('inv-solo');
  if(!(S.view==='inventario'&&(slot||solo))){ if(INV.frm) INV.frm.style.display='none'; return; }
  const f=invFrame(); if(solo){ Object.assign(f.style,{display:'block',left:'0px',top:'0px',width:'100vw',height:'100vh'}); return; }
  const r=slot.getBoundingClientRect(); const h=Math.max(480,innerHeight-Math.max(0,r.top)-10); if(Math.abs(slot.offsetHeight-h)>2) slot.style.height=h+'px';
  const cel=innerWidth<=700; /* no celular o programa usa a largura toda da tela */
  Object.assign(f.style,{display:'block',left:(cel?0:r.left)+'px',top:r.top+'px',width:(cel?innerWidth:r.width)+'px',height:h+'px'}); }
setInterval(invSync,200); addEventListener('resize',invSync); addEventListener('scroll',invSync,true);

async function invGravar(acao,id,d,json){ if(!S.db) throw new Error('Sem conexão com o banco.');
  const em=new Date().toISOString(), uid=S.uid||null, nm=(S.nomes&&S.nomes[S.uid])||''; const sid=x=>String(x||'').replace(/\//g,'-').slice(0,600); const X=S.alx; d=d||{};
  if(acao==='salvarConf'){ const k=sid(d.numero||id); const ant=X.conferencias.find(c=>c._id===k);
    const doc=Object.assign({},d,{em:(ant&&ant.em)||em,dia:(ant&&ant.dia)||hojeStr(),por:ant?(ant.por||null):uid,porNome:(ant&&ant.porNome)||nm,origem:(ant&&ant.origem)||'programa'}); if(ant) doc.alteradoEm=em;
    return S.db.doc('conferencias/'+k).set(doc); }
  if(acao==='salvarAuditoria'){ const k=invChavePainel(d.auditKey||id); const ant=X.auditorias.find(a=>a._id===k); const doc=Object.assign({},d);
    doc.key=k.replace(/_reconta_\d+$/,''); doc.loc=ALX_LBL2ID[d.almoxarifado]||(ant&&ant.loc)||null; doc.em=em; doc.por=uid; doc.porNome=nm; doc.origem='programa';
    if(doc.investigacao){ const iv=Object.assign({},doc.investigacao), ai=ant&&ant.investigacao; if(iv.resolvidoPor){ if(ai&&ai.resolvidoPorNome===iv.resolvidoPor){ iv.resolvidoPorNome=ai.resolvidoPorNome; iv.resolvidoPor=ai.resolvidoPor||null; iv.resolvidoEm=ai.resolvidoEm||em; } else { iv.resolvidoPorNome=iv.resolvidoPor; iv.resolvidoPor=iv.resolvidoPor===nm?uid:null; iv.resolvidoEm=em; } } doc.investigacao=iv; }
    return alxAudGravar(k,doc,ant); }
  if(acao==='removerAuditoria'){ const k=invChavePainel(id); const ant=X.auditorias.find(a=>a._id===k); if(!ant) return; return S.db.doc('auditorias/'+k).update({excluida:{em,por:uid,motivo:'excluída no inventário'}}); }
  if(acao==='salvarAuditoriaAberta') return S.db.doc('alxfila/'+invChavePainel(id)).set({estado:'aberta',por:uid,em});
  if(acao==='descartarAuditoria') return S.db.doc('alxfila/'+invChavePainel(id)).set({estado:'descartada',por:uid,em});
  if(acao==='removerAuditoriaAberta') return S.db.doc('alxfila/'+invChavePainel(id)).delete();
  if(acao==='salvarRecebimento'){ const k=sid(d.id||id); const ant=X.recebimentos.find(r=>r._id===k); const doc=Object.assign({},d);
    if(d.apontado){ if(ant&&ant.apontado){ doc.apontadoPor=ant.apontadoPor||null; doc.apontadoEm=ant.apontadoEm||em; } else { doc.apontadoPor=uid; doc.apontadoEm=em; } doc.apontadoPorNome=d.apontadoPor||nm; }
    else { doc.apontadoPor=null; doc.apontadoPorNome=''; }
    if(ant) return S.db.doc('recebimentos/'+k).update(Object.assign(doc,{alteradoEm:em}));
    const m=String(d.data||'').match(/^(\d{2})\/(\d{2})\/(\d{4})/); return S.db.doc('recebimentos/'+k).set(Object.assign(doc,{dia:m?m[3]+'-'+m[2]+'-'+m[1]:hojeStr(),em,por:uid,porNome:nm,obs:d.observacao||'',origem:'programa'})); }
  if(acao==='salvarReq'||acao==='removerReq'||acao==='salvarHist') return; /* Transferências: fora do painel */
  if(acao==='notificarEmail') return; /* e-mail automático do Apps Script: ainda não existe no painel */
  console.warn('[inventário] ação desconhecida',acao); }
let _invErroEm=0;
window.Painel.inv={
  usuario(){ const A=S.acs; if(!A||!A.pronto) return null; let p=null; try{ p=acsP(); }catch(e){} if(!p||!viewOk('inventario')) return null; const nome=(S.nomes&&S.nomes[S.uid])||'Usuário';
    const perfil=(p.tudo||A.dono)?'administrador':(INV_PERF[(A.doc||{}).perfil]||null);
    return {nome,usuario:nome,perfil,flags:{contar:!!p.contar,receber:!!p.receber,auditar:!!p.auditar,verAud:!!p.verAud,locais:(p.tudo?ALX_LOCS:p.locais)||[]},solo:invSolo()}; },
  pronto(){ const t=Date.now()-INV.t0>8000; return !!(S.acs&&S.acs.pronto)&&((S.itens||[]).length>0||t)&&(!!(S.anl&&S.anl.lidos&&S.anl.lidos.itens)||t); },
  dados(){ return {itens:alxItensTodos(),base:(S.anl&&S.anl.base&&S.anl.base.itens)||null,conferencias:S.alx.conferencias,auditorias:S.alx.auditorias,recebimentos:S.alx.recebimentos,fila:S.alx.fila,grupos:ALX_GRUPOS,itemDe}; },
  versao(){ return [S.alx.conferencias,S.alx.auditorias,S.alx.recebimentos,S.alx.fila,null,null,S.itens,S.anl&&S.anl.base&&S.anl.base.itens]; },
  nome(uid){ return uid?(nomeDe(uid)||''):''; },
  gravar(acao,id,d,json){ return Promise.resolve().then(()=>invGravar(acao,id,d,json)).catch(e=>{ if(Date.now()-_invErroEm>3000){ _invErroEm=Date.now(); erro(e); } throw e; }); },
  pedido(){ const x=INV.pedido; INV.pedido=null; return x; },
  sair(){ const b=document.createElement('button'); b.dataset.act='sair-conta'; b.hidden=true; document.body.appendChild(b); b.click(); b.remove(); }
};
document.head.insertAdjacentHTML('beforeend',`<style>
  .inv-slot{width:100%;min-height:480px}
  .inv-frx{position:fixed;z-index:3;border:0;border-radius:12px;background:#fff;display:none}
  body.inv-solo > :not(.inv-frx){display:none!important}
  body.inv-solo .inv-frx{border-radius:0;z-index:50}
  @media (max-width:900px){ .inv-frx{border-radius:0} }
</style>`);
