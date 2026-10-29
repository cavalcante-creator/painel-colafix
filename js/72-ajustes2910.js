/* Painel Colafix · 72-ajustes2910.js — pedidos de ajuste de 28 e 29/10.
   (3) Programação › filtro "Atrasada": só as ordens/previsões abertas com data antes de hoje (`ordAtras`).
   (4) Programação › filtro "Família": família do produto = 2 primeiras palavras do nome sem o peso (`sqFam`, a mesma
       da "Sugerir sequência"), com a quantidade de cada uma. Os dois entram no gancho `ranFiltro` do js/01 (depois do
       filtro do rancho) e são zerados no "limpar filtros". Prefixo `p29`. */
"use strict";
S.ord.atr=!!S.ord.atr; S.ord.fam=S.ord.fam||'';
function p29Atras(o){ return (o._pv||o.status==='aberta')&&ordAtras(o); }
{ const _rf=ranFiltro; ranFiltro=function(xs){ xs=_rf.apply(this,arguments); const O=S.ord;
    S._p29nA=xs.filter(p29Atras).length; if(O.atr) xs=xs.filter(p29Atras);
    const fc={}; xs.forEach(o=>{ const f=sqFam(o)||'Outros'; fc[f]=(fc[f]||0)+1; }); S._p29fam=fc;
    if(O.fam) xs=xs.filter(o=>(sqFam(o)||'Outros')===O.fam);
    return xs; }; }
{ const _vp=vProgramacao; vProgramacao=function(){ const h=_vp.apply(this,arguments); try{
    const O=S.ord, nA=S._p29nA||0, fc=Object.assign({},S._p29fam||{}); if(O.fam&&!fc[O.fam]) fc[O.fam]=0;
    const fams=Object.keys(fc).sort((a,b)=>a.localeCompare(b,'pt'));
    const ui=`<span class="p29-f"><button class="p29-at ${O.atr?'on':''}" data-act="p29-atr" aria-pressed="${O.atr}" title="Só as ordens com data antes de hoje que ainda estão abertas">Atrasadas<small class="num">${nA}</small></button>`+
      `<label class="p29-fam"><span class="pf-lab">Família</span><select class="txt" id="p29-fam" aria-label="Família do produto"><option value="">Todas</option>${fams.map(f=>`<option value="${esc(f)}" ${O.fam===f?'selected':''}>${esc(f)} (${fc[f]})</option>`).join('')}</select></label></span>`;
    const k='<span style="display:inline-flex;gap:10px;align-items:center;margin-left:6px"><span class="pf-lab">Tipo</span>';
    let r=h.includes(k)?h.replace(k,ui+k):h;
    if((O.atr||O.fam)&&!r.includes('data-act="o-limpar-filtros"')) r=r.replace('<span class="pf-res num">','<span class="pf-res num"><button class="lnk" data-act="o-limpar-filtros">limpar filtros</button> · ');
    return r; }catch(e){ console.warn('[programação] atrasada/família',e); return h; } }; }
document.addEventListener('click',ev=>{ const t=ev.target.closest&&ev.target.closest('[data-act]'); if(!t) return;
  if(t.dataset.act==='p29-atr'){ ev.stopPropagation(); S.ord.atr=!S.ord.atr; S.ord.aberta=null; render(); }
  else if(t.dataset.act==='o-limpar-filtros'){ S.ord.atr=false; S.ord.fam=''; } },true);
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='p29-fam'){ S.ord.fam=ev.target.value||''; S.ord.aberta=null; render(); } },true);
document.head.insertAdjacentHTML('beforeend',`<style id="p29-css">.p29-f{display:inline-flex;gap:10px;align-items:center;margin-left:6px;flex-wrap:wrap}
.p29-at{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--line,#d5dde2);background:var(--surface);color:inherit;font:inherit;font-weight:600;cursor:pointer}
.p29-at small{opacity:.7}.p29-at.on{background:var(--crit);border-color:var(--crit);color:#fff}
.p29-fam{display:inline-flex;gap:8px;align-items:center}.p29-fam select{height:36px;max-width:230px;padding:0 8px}</style>`);
/* (5) Sino do topo (pedido feito no Calendário): "Ordens atrasadas" some quando a ordem já foi resolvida —
   ordem que já entregou tudo (só falta encerrar no sistema) ou que foi marcada para continuar hoje ou depois
   ("Continua dd/mm") não conta mais como atrasada no sino. O resto do painel não muda. */
function p29AtrasSino(o,h){ if(!ordAtras(o,h)) return false; if(o.continuaEm&&o.continuaEm>=h) return false;
  try{ if(+o.total>0&&entregueDe(o)>=+o.total) return false; }catch(e){} return true; }
{ const _ta=tpAvisos; tpAvisos=function(){ const xs=_ta.apply(this,arguments); try{ const i=(xs||[]).findIndex(x=>x.acao==='atrasadas'); if(i<0) return xs;
    const h=hojeStr(), n=ordAbertas().filter(o=>p29AtrasSino(o,h)).length;
    if(!n) xs.splice(i,1); else xs[i]=Object.assign({},xs[i],{n,t:n>1?'Ordens atrasadas':'Ordem atrasada'}); }catch(e){ console.warn('[sino] atrasadas',e); } return xs; }; }
/* (2) Receber no silo · mais duas formas de dividir a nota entre os silos (além de "Meio a meio" e "Outra divisão"):
   "Em toneladas" — digita quantas toneladas foram para cada silo; o último fica com o resto da nota.
   "Completar o menor" — enche o silo menor até a capacidade (capacidade − saldo de agora) e o resto vai para o maior.
   `srPartes` envolvida (a barra, o "Vai entrar" e a gravação usam a mesma conta). R.ton = {sid: t}. */
function p29Livre(sid){ const s=(S.cfg.silos||[]).find(x=>x.id===sid), cap=(+(s&&s.cap)||0)*1000; if(!cap) return null; const u=saldoPorSilo()[sid]; return Math.max(0,siloR(cap-(u?u.kg:0))); }
function p29Ordem(R){ const capDe=id=>+(((S.cfg.silos||[]).find(x=>x.id===id)||{}).cap)||0; return R.sids.slice().sort((a,b)=>(capDe(a)||1e9)-(capDe(b)||1e9)); }
{ const _sp=srPartes; srPartes=function(R,kg){ const n=R.sids.length; if(n<2||(R.div!=='ton'&&R.div!=='encher')) return _sp.apply(this,arguments);
    let resto=kg; const out={};
    if(R.div==='ton'){ R.ton=R.ton||{}; R.sids.forEach((sid,i)=>{ if(i===n-1) return; const q=Math.max(0,siloR((numIn(R.ton[sid])||0)*1000)); out[sid]=q; resto=siloR(resto-q); }); out[R.sids[n-1]]=Math.max(0,resto); R._p29falta=resto<0?-resto:0; return R.sids.map(sid=>({sid,kg:out[sid]})); }
    const ord=p29Ordem(R); ord.forEach((sid,i)=>{ if(i===ord.length-1){ out[sid]=Math.max(0,resto); return; } const lv=p29Livre(sid), q=lv==null?0:Math.min(resto,lv); out[sid]=siloR(q); resto=siloR(resto-q); });
    return R.sids.map(sid=>({sid,kg:out[sid]})); }; }
function p29Painel(R){ const nm=id=>siloNome(id).replace(/\s*\(.*\)$/,''), qkg=(numIn(R.q)||0)*(R.un==='t'?1000:1), n=R.sids.length;
  if(R.div==='ton'){ R.ton=R.ton||{}; const pt=qkg>0?srPartes(R,qkg):[], ult=R.sids[n-1];
    return `<div class="srx-pc p29-ton">${R.sids.slice(0,-1).map(id=>`<label>${esc(nm(id))} <input class="txt" inputmode="decimal" data-sr-ton="${esc(id)}" placeholder="0" value="${esc(R.ton[id]!=null?R.ton[id]:'')}"> t</label>`).join('')}
      <div class="p29-info"><span class="p29-resto"><b>${esc(nm(ult))}</b> fica com o resto${qkg>0?': <b>'+fkg((pt.find(x=>x.sid===ult)||{}).kg||0)+'</b>':''}</span>
      ${R._p29falta>0&&qkg>0?`<div class="p29-av crit">As toneladas digitadas passam da nota em ${fkg(R._p29falta)}. Confira os números.</div>`:''}</div></div>`; }
  if(R.div==='encher'){ const ord=p29Ordem(R), sem=ord.slice(0,-1).filter(id=>p29Livre(id)==null);
    if(sem.length) return `<div class="p29-av crit">Cadastre a capacidade do ${esc(sem.map(nm).join(', '))} (Silos › Ajustes) para o painel saber quanto cabe.</div>`;
    const pt=qkg>0?srPartes(R,qkg):[], ult=ord[ord.length-1], lvU=p29Livre(ult), kU=(pt.find(x=>x.sid===ult)||{}).kg||0;
    return `<div class="p29-info"><div class="p29-enc">${ord.slice(0,-1).map(id=>`<span>Completa o <b>${esc(nm(id))}</b>: cabe mais <b>${fkg(p29Livre(id))}</b></span>`).join('')}<span>O resto vai para o <b>${esc(nm(ult))}</b>${qkg>0?': <b>'+fkg(kU)+'</b>':''}</span></div>
      ${qkg>0&&lvU!=null&&kU>lvU?`<div class="p29-av crit">Não cabe tudo: o ${esc(nm(ult))} só tem lugar para mais ${fkg(lvU)}.</div>`:''}</div>`; }
  return ''; }
{ const _vr=vSiloRec; vSiloRec=function(){ let h=_vr.apply(this,arguments); try{ const R=srEst(); if(!(R.sids&&R.sids.length>1)) return h;
    const bt=(k,t,tt)=>`<button class="${R.div===k?'on':''}" aria-pressed="${R.div===k}" data-act="sr-div" data-v="${k}" title="${tt}">${t}</button>`;
    const k='data-act="sr-div" data-v="outra">Outra divisão</button>'; if(!h.includes(k)) return h;
    h=h.replace(k,k+bt('ton','Em toneladas','Digitar as toneladas de cada silo')+bt('encher','Completar o menor','Enche o silo menor e o resto vai para o maior'));
    const i=h.indexOf('class="srx-dvh"'), j=i<0?-1:h.indexOf('</div></div>',i); if(j>=0){ const fim=j+'</div></div>'.length; h=h.slice(0,fim)+p29Painel(R)+h.slice(fim); }
    return h; }catch(e){ console.warn('[silo] divisão',e); return h; } }; if(S.extViews&&S.extViews.silorec) S.extViews.silorec=vSiloRec; }
function p29LeTon(){ const R=srEst(); R.ton=R.ton||{}; document.querySelectorAll('[data-sr-ton]').forEach(i=>{ R.ton[i.dataset.srTon]=i.value; }); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="sr-"]'); if(!b) return; p29LeTon(); const R=srEst();
  if(b.dataset.act==='sr-ok'&&R.sids&&R.sids.length>1&&(R.div==='ton'||R.div==='encher')){ const qkg=siloR((numIn(R.q)||0)*(R.un==='t'?1000:1)); if(!(qkg>0)) return;
    if(R.div==='ton'){ srPartes(R,qkg); if(R._p29falta>0){ ev.stopImmediatePropagation(); toast('As toneladas de cada silo passam do total da nota. Confira.'); } }
    else if(p29Ordem(R).slice(0,-1).some(id=>p29Livre(id)==null)){ ev.stopImmediatePropagation(); toast('Cadastre a capacidade dos silos para usar "Completar o menor".'); } }
  if(b.dataset.act==='sr-novo') R.ton={}; if(b.dataset.act==='sr-silo') R.ton={}; },true);
/* digitando: atualiza só a conta (resto, barra e "Vai entrar"), sem redesenhar a tela — o cursor fica no campo */
function p29Troca(sel){ const tp=document.createElement('div'); tp.innerHTML=vSiloRec(); const nv=tp.querySelector(sel), ve=document.querySelector(sel);
  if(ve&&nv) ve.replaceWith(nv); else if(ve&&!nv) ve.remove(); else if(!ve&&nv){ const ac=document.querySelector('.srx-acao'); if(ac) ac.before(nv); } }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.dataset||(t.dataset.srTon==null&&t.id!=='sr-q')) return; const R=srEst(); if(!(R.div==='ton'||R.div==='encher')||!(R.sids&&R.sids.length>1)) return;
  p29LeTon(); if(t.id==='sr-q') R.q=t.value; try{ ['.p29-info','.srx-bar','.srx-res'].forEach(p29Troca); }catch(e){ console.warn('[silo] conta',e); } });
document.head.insertAdjacentHTML('beforeend',`<style id="p29s-css">.p29-ton input{width:96px;height:44px!important}.p29-resto{display:flex;align-items:center;gap:6px;font-size:15px}
.p29-enc{display:flex;flex-direction:column;gap:4px;font-size:15px}.p29-av{margin-top:8px;padding:8px 12px;border-radius:10px;font-size:14px}.p29-av.crit{background:#F8E1DE;color:#7A2A20}</style>`);
/* (6) Uniformes no login do Marcelo: Visão do gestor › Pessoas › Uniformes (tela gxunif) — só o relatório de quem
   pegou o quê (sem desconto). O desenho fica no modulos/rh-uniformes.js (RHUnif.gestor). Precisa da regra nova
   do firestore.rules (rh/dados/uniformes: o gestor só lê). */
Object.assign(VIEWS,{gxunif:{nome:'Uniformes',ic:'equipe',mob:'Uniformes'}}); CRUMB.gxunif='Uniformes';
S.extViews=S.extViews||{}; S.extViews.gxunif=()=>window.RHUnif&&window.RHUnif.gestor?window.RHUnif.gestor():'<section class="card"><div class="empty">Carregando…</div></section>';
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxunif')){ const i=M.views.indexOf('gxqd'); M.views.splice(i>=0?i+1:M.views.length,0,'gxunif'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxunif')){ const i=GXN_TELAS.indexOf('gxqd'); GXN_TELAS.splice(i>=0?i+1:GXN_TELAS.length,0,'gxunif'); }
try{ const g=GXG.find(x=>x.id==='g-pes'); if(g&&!g.tabs.some(t=>t[0]==='gxunif')){ const i=g.tabs.findIndex(t=>t[0]==='gxqd'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['gxunif','Uniformes']);
  const f=S.extViews.gxunif; S.extViews.gxunif=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('gxunif')+h; }catch(e){ return h; } }; } }catch(e){}
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Uniformes entregues (quem pegou)','uniforme camiseta calça entrega relatório quem pegou','gxunif',()=>go('gxunif')]); }catch(e){}
/* PDF no padrão do painel para os módulos (RH · uniformes): o mesmo gerador dos relatórios do gestor/comercial
   (jsPDF, faixa com as logos, quadros, tabelas, rodapé com página; baixa o arquivo). */
window.Painel=window.Painel||{}; window.Painel.pdf={ carregar:()=>carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), imgs:()=>gpImgs(), novo:(t,s,i)=>gpNovo(t,s,i), cor:GPDF.cor };
/* (7) Marcelo cadastra as máquinas e equipamentos da manutenção (pedido de 29/10): a tela Máquinas (manequip, a mesma
   da Manutenção, config/manut.equips) entra na Visão do gestor › Manutenção › Máquinas e abre para quem tem o
   módulo `gestor` (antes só para quem tinha `manut`). A regra do banco já deixa gravar config/manut (grava()). */
function p29Gestor(){ try{ const p=acsP(); return !!p&&!p.tudo&&((p.mods||[]).includes('gestor')||(p.extras||[]).includes('gestor')); }catch(e){ return false; } }
{ const _vo=viewOk; viewOk=function(v){ if(v==='manequip'&&p29Gestor()) return true; return _vo.apply(this,arguments); }; }
setInterval(()=>{ try{ const X=S.mx; if(!X||X.sub||!S.db||!S.acs||!S.acs.pronto||!viewOk('manequip')) return; X.sub=true;
  S.db.doc('config/manut').onSnapshot(s=>{ const d=s.exists?(s.data()||{}):{}; X.cfg={equips:d.equips||[],prev:d.prev||[],pecas:d.pecas||[],limites:d.limites||null}; X.lido=true; rerenderSeguro(); },()=>{ X.lido=true; }); }catch(e){} },900);
/* no login do Marcelo a tela Máquinas é da Visão do gestor: sem as abas de cima da Manutenção (Painel, Chamados, Preventivas…) */
{ const _md=modDe; modDe=function(v){ if(v==='manequip'){ try{ if(gxSolo()) return 'gestor'; }catch(e){} } return _md.apply(this,arguments); }; }
S.extViews=S.extViews||{}; S.extViews.manequip=function(){ let a=''; try{ if(typeof gxSolo==='function'&&gxSolo()) a=gxgAbas('manequip'); }catch(e){} return a+manView('manequip'); };
try{ const g=GXG.find(x=>x.id==='g-man'); if(g&&!g.tabs.some(t=>t[0]==='manequip')) g.tabs.push(['manequip','Máquinas']); }catch(e){}
/* as ações de máquina eram só da equipe de manutenção (MAN_ACOES_ATENDER no js/07): agora também do gestor */
{ const P29_EQ=['mx-eq-novo','mx-eq-salvar','mx-eq-del','mx-eq-conf','mx-eq-sug','mx-eq-ed']; P29_EQ.forEach(a=>{ const i=MAN_ACOES_ATENDER.indexOf(a); if(i>=0) MAN_ACOES_ATENDER.splice(i,1); });
  window.addEventListener('click',ev=>{ const b=ev.target&&ev.target.closest&&ev.target.closest('[data-act]'); if(!b||!P29_EQ.includes(b.dataset.act)) return;
    if(!(manPodeAtender()||p29Gestor())){ ev.stopImmediatePropagation(); ev.preventDefault(); toast('Você não possui permissão para esta ação. Ela é da equipe de manutenção e do gestor.'); } },true); }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('manequip')) GXN_TELAS.push('manequip');
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Máquinas e equipamentos (cadastrar)','maquina equipamento cadastro manutenção qr','manequip',()=>go('manequip')]); }catch(e){}
/* (8) Produção × Comercial no login do Marcelo (pedido de 29/10): a tela anlcom (Análise PCP › Mês) abre para quem tem
   a Visão do gestor e entra em Produção, depois de "Produção do ano" (mesmo jeito do prodano, js/64). Os dados já
   carregam para o gestor (LEIT_GRUPOS.prod inclui gestor). */
{ const _vo=viewOk; viewOk=function(v){ if(v==='anlcom'&&p29Gestor()) return true; return _vo.apply(this,arguments); }; }
{ const _md=modDe; modDe=function(v){ if(v==='anlcom'){ try{ if(gxSolo()) return 'gestor'; }catch(e){} } return _md.apply(this,arguments); }; }
try{ const g=GXG.find(x=>x.id==='g-prod'); if(g&&!g.tabs.some(t=>t[0]==='anlcom')){ const i=g.tabs.findIndex(t=>t[0]==='prodano'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['anlcom','Produção × Comercial']);
  const f=S.extViews.anlcom; S.extViews.anlcom=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('anlcom')+h; }catch(e){ return h; } }; } }catch(e){}
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('anlcom')) GXN_TELAS.push('anlcom');
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Produção × Comercial (relatório do mês)','comercial previsão vendido faturado pedidos reunião pdf','anlcom',()=>go('anlcom')]); }catch(e){}
/* ===FIM AJUSTES 29/10=== */
