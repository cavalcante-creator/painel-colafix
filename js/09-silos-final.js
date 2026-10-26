/* Painel Colafix · 09-silos-final.js — silos (saldo, consumo), cotas de leitura e início do painel (iniciar).
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

/* ===FIM CELULAR DO ALMOX=== */

/* ===================== ALMOXARIFADO (09/10): dia da entrega no diário + sem manutenção para o almox ===================== */
/* A entrega do rancho é sempre feita no dia útil anterior à produção: no "Hoje" o almox vê as ordens do próximo dia útil. */
function dbUtil(d){ const w=new Date(d+'T12:00:00').getDay(); let sab=false, fer=[]; try{ sab=!!anlCfg().sab; }catch(e){} try{ fer=feriados()||[]; }catch(e){} return w!==0&&(w!==6||sab)&&!fer.includes(d); }
function dbProxUtil(d){ let x=addDias(d,1); for(let i=0;i<20&&!dbUtil(x);i++) x=addDias(x,1); return x; }
function dbAntUtil(d){ let x=addDias(d,-1); for(let i=0;i<20&&!dbUtil(x);i++) x=addDias(x,-1); return x; }
function dbEhAlmox(){ try{ const p=acsP(); if(!p||(S.acs&&S.acs.dono)) return false; return (p.mods||[]).some(m=>m==='almox'||m==='premix')||!dbPode().prod; }catch(e){ return false; } }
function dbEntrega(){ const D=S.dbo; if(D.entrega!==undefined) return D.entrega; return D.modo==='monitor'||dbEhAlmox(); }
function dbDiaProd(dia){ return dbEntrega()?dbProxUtil(dia):dia; }
function diaSemana(d){ return ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][new Date(d+'T12:00:00').getDay()]; }
/* aviso no topo do diário: qual produção está sendo entregue */
{ const _vd=vDiario; vDiario=function(){ const h=_vd.apply(this,arguments); const D=S.dbo; if(D.modo==='monitor') return h; const dia=D.dia||hojeStr(), p=dbDiaProd(dia);
  const txt=dbEntrega()?`${dia===hojeStr()?'<b>Hoje</b> o almox separa e entrega':'Em <b>'+diaSemana(dia)+' '+dm(dia)+'</b> o almox separa e entrega'} os ranchos das ordens de <b>${diaSemana(p)}, ${dm(p)}</b>${dia===hojeStr()?' (e as atrasadas)':''}`:`<b>Dia da produção:</b> ${diaSemana(dia)}, ${dm(dia)}`;
  return `<div class="banner db-ent" style="background:var(--teal-wash);color:var(--teal-strong);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>${ic('cal',16,2)} ${txt}</span><span class="db-entb" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><button class="lnk" data-act="db-entrega">${dbEntrega()?'Ver pelo dia da produção':'Ver pelo dia da entrega'}</button></span></div>`+h; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="db-entrega"]'); if(!b) return; S.dbo.entrega=!dbEntrega(); render(); });
/* abrir um rancho (QR da folha, coletor RA-, busca): vai para o dia certo da entrega */
{ const _ab=dbAbrirRancho; dbAbrirRancho=function(num){ const r=_ab.apply(this,arguments); try{ const D=S.dbo, h=hojeStr(); if(r&&dbEntrega()&&D.dia&&D.dia!==h){ const e=dbAntUtil(D.dia); D.dia=e<h?h:e; render(); } }catch(e){} return r; }; }
/* manutenção não aparece para o almoxarifado (e some de verdade quando tirada em "Ajustar acesso") */
{ const _vo=viewOk; viewOk=function(v){ const r=_vo.apply(this,arguments); if(!r) return r; try{ const A=S.acs; if(!A||A.dono) return r; const m=(MODS.find(x=>(x.views||[]).includes(v))||{}).id; if(m!=='manut') return r;
    const d=A.doc||{}; if((d.semMods||[]).includes('manut')) return false; if((d.telas||[]).includes(v)) return r; const p=acsP(); const mods=(p&&p.mods)||[];
    if(!mods.includes('manut')&&mods.some(x=>x==='almox'||x==='premix')) return false; }catch(e){} return r; }; }
/* ===FIM ALMOXARIFADO=== */
/* ===================== DIÁRIO MAIS LIMPO (09/10) ===================== */
/* Almox: sempre na Fila (um cartão por rancho, um botão para a próxima etapa) e só os filtros essenciais.
   Tabela completa: por padrão só a hora em cada etapa; nome/acerto/imprimir/desfazer aparecem ao passar o mouse ou tocar na linha. */
S.dbo.det=false; S.dbo.maisf=false;
{ const _vd=vDiario; vDiario=function(){ const D=S.dbo; if(!D.modo&&dbEhAlmox()) D.modo='fila'; const h=_vd.apply(this,arguments); if(D.modo==='monitor') return h;
  const simples=D.modo==='fila'&&!D.maisf, compacto=D.modo!=='fila'&&!D.det;
  const bot=D.modo==='fila'?`<button class="lnk" data-act="db-maisf">${D.maisf?'Menos filtros':'Mais filtros'}</button>`:`<button class="lnk" data-act="db-det">${D.det?'Ver compacto':'Ver detalhado'}</button>`;
  const h2=h.includes('data-act="db-entrega"')?h.replace('<button class="lnk" data-act="db-entrega">',bot+'<button class="lnk" data-act="db-entrega">'):h.replace('<div class="head">','<div style="display:flex;justify-content:flex-end;margin-bottom:-6px">'+bot+'</div><div class="head">');
  return `<div class="${compacto?'db-compacto':''} ${simples?'db-simples':''}">${h2}</div>`; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="db-maisf"],[data-act="db-det"]'); if(b){ if(b.dataset.act==='db-maisf') S.dbo.maisf=!S.dbo.maisf; else S.dbo.det=!S.dbo.det; render(); return; }
  /* tabela compacta: tocar na célula (fora de botão) mostra os detalhes daquela linha */
  const td=ev.target.closest&&ev.target.closest('.db-compacto td.dbc'); if(td&&!ev.target.closest('button,a,input,select')){ const tr=td.closest('tr'); if(tr) tr.classList.toggle('db-ver'); } });
document.head.insertAdjacentHTML('beforeend',`<style id="dblimpo-css">
.db-compacto td.dbc > *:not(b.num):not(small.num):not(.dbb):not(.dbmi):not(:has(b)){display:none}
.db-compacto tr:hover td.dbc > *, .db-compacto tr.db-ver td.dbc > *{display:revert}
.db-compacto td.dbc{cursor:pointer}
.db-simples .rsm,.db-simples #db-data,.db-simples .srch,.db-simples #db-pri,.db-simples .seg[aria-label="Mostrar"],.db-simples .head .sub,.db-simples .sub[style*="font-size:12px"]{display:none!important} /* o aviso de ordem sem rancho continua */
</style>`);
/* ===FIM DIÁRIO LIMPO=== */














/* ===================== LAYOUT DO CELULAR (06/10): barra de baixo com "Mais", topo limpo, botões e filtros no tamanho do dedo ===================== */
P.mais3='<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>';
S.mob={sheet:false};
function mobCel(){ return matchMedia('(max-width:860px)').matches; }
{ const _rn=renderNav; renderNav=function(){ _rn.apply(this,arguments); try{ const bn=$('#bottomnav'); if(!bn) return; const m=modAtual(); const tabs=mTabs(m)||[];
    const aj=['ajustes','itens','acessos','paineis'].includes(S.view)||S.view==='modulos';
    document.body.classList.toggle('mob-semnav',aj||tabs.length<=1);
    if(tabs.length>5&&m.id!=='analise'){ /* a Análise PCP já tem a própria barra por grupos */ let vis=tabs.slice(0,4); if(!vis.includes(S.view)&&tabs.includes(S.view)) vis=[...tabs.slice(0,3),S.view];
      const resto=tabs.filter(v=>!vis.includes(v));
      bn.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';
      bn.innerHTML=vis.map(v=>`<button data-go="${v}" ${S.view===v?'aria-current="page"':''}>${ic(VIEWS[v].ic,22)}${esc(VIEWS[v].mob||VIEWS[v].nome)}</button>`).join('')+`<button data-act="mob-mais" aria-expanded="${S.mob.sheet}" ${resto.includes(S.view)?'aria-current="page"':''}>${ic('mais3',22,2.6)}Mais</button>`;
      let sh=document.getElementById('mob-sheet'); if(S.mob.sheet){ if(!sh){ sh=document.createElement('div'); sh.id='mob-sheet'; document.body.appendChild(sh); }
        sh.innerHTML=`<div class="mob-sh-bx" role="dialog" aria-label="Mais telas"><div class="mob-sh-h"><b>${esc(m.nome)}</b><button data-act="mob-mais-x" aria-label="Fechar">✕</button></div>${resto.map(v=>`<button class="mob-sh-it" data-go="${v}" ${S.view===v?'aria-current="page"':''}>${ic(VIEWS[v].ic,22)}<span>${esc(VIEWS[v].nome)}</span></button>`).join('')}</div>`; }
      else if(sh) sh.remove(); }
    else { const sh=document.getElementById('mob-sheet'); if(sh) sh.remove(); S.mob.sheet=false; }
  }catch(e){ console.warn('nav celular',e); } }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mob-mais"],[data-act="mob-mais-x"],#mob-sheet [data-go]'); const fundo=ev.target&&ev.target.id==='mob-sheet';
  if(!b&&!fundo) return; if(b&&b.dataset.act==='mob-mais'){ S.mob.sheet=!S.mob.sheet; renderNav(); return; } S.mob.sheet=false; setTimeout(()=>renderNav(),0); });
document.head.insertAdjacentHTML('beforeend',`<style id="mob-css">
#mob-sheet{position:fixed;inset:0;z-index:40;background:rgba(10,25,35,.35);display:flex;align-items:flex-end}
.mob-sh-bx{width:100%;background:var(--surface);border-radius:18px 18px 0 0;padding:10px 12px calc(76px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 30px rgba(0,0,0,.18);animation:mobsh .2s ease-out}
@keyframes mobsh{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
.mob-sh-h{display:flex;justify-content:space-between;align-items:center;padding:6px 6px 10px}.mob-sh-h b{font-size:16px}.mob-sh-h button{width:36px;height:36px;border-radius:10px;border:0;background:var(--sunken);font-size:15px;cursor:pointer}
.mob-sh-it{display:flex;align-items:center;gap:14px;width:100%;height:54px;padding:0 12px;border:0;border-radius:12px;background:transparent;font:inherit;font-size:16px;font-weight:600;color:var(--ink);cursor:pointer;text-align:left}
.mob-sh-it[aria-current="page"]{background:var(--teal-wash);color:var(--teal-strong)}.mob-sh-it svg{color:var(--teal-strong)}
@media (max-width:860px){
  /* topo: só o essencial e o nome do módulo inteiro */
  #tp-mais{display:none!important}
  .top{gap:8px}.top-r{gap:6px!important}
  .mob-brand{min-width:0;flex:1 1 auto}.mob-brand img{flex-shrink:0}
  .mob-brand .mob-mod{font-size:13px!important;padding:7px 10px!important;border-radius:9px!important;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .avatar{width:36px;height:36px}
  /* barra de baixo: no máximo 5, com rótulo legível; some onde não ajuda */
  .bottomnav button{font-size:11.5px;gap:4px;height:62px;padding:0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bottomnav button[aria-current="page"]{background:var(--teal-wash)}
  body.mob-semnav .bottomnav{display:none!important} body.mob-semnav .content{padding-bottom:40px}
  /* títulos e espaços */
  h1{font-size:25px;line-height:31px}
  .content{gap:16px}
  .card{padding:18px 16px}
  .head{gap:12px}.head>div:first-child{min-width:0}
  /* filtros em uma linha que rola para o lado, no tamanho do dedo */
  .seg{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto;max-width:100%;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .seg::-webkit-scrollbar{display:none}
  .seg button{flex:0 0 auto;height:40px!important;padding:0 14px}
  .chip{min-height:40px;height:auto;padding:0 14px}
  .chips{gap:8px}
  .btn{min-height:46px}
  .lnk{padding:8px 0}
  .txt{height:48px;font-size:16px}textarea.txt{height:auto}
  /* nada passa da largura da tela */
  .pill{white-space:normal;max-width:100%;text-align:center}
  #view img,#view svg{max-width:100%}
  /* Tela da linha */
  .ltv-h{align-items:flex-start}.ltv-hr{flex-wrap:wrap;gap:8px;width:100%}.ltv-hr .btn{flex:1 1 auto;height:44px!important;white-space:nowrap;font-size:14px;padding:0 12px}.ltv-clk{display:none}
  /* Programação: busca em cima, filtros embaixo */
  .pf-r1 .srch{flex:1 1 100%!important;min-width:0!important;max-width:100%!important;width:100%}
  .pfil{overflow:hidden}.pf-r1,.pf-r3{min-width:0;width:100%}.pf-r1>*,.pf-r3>*{min-width:0;max-width:100%}.pfil .seg{max-width:100%}
  /* Paradas por cimento e Base de dados: nada fica para fora */
  .row.num[style*="grid-template-columns:150px"]{grid-template-columns:110px minmax(0,1fr)!important}
  .bq-fs{grid-template-columns:minmax(0,1fr)!important}.bq-fh{flex-wrap:wrap}
  .mob-brand img{height:18px!important}.mob-brand .mob-mod{font-size:12.5px!important;padding:6px 9px!important}
  /* TV da fábrica no celular */
  .tv2-top img,.tv2-top .tv2-logo{display:none}.tv2-top h1{font-size:24px!important;line-height:30px!important}.tv2-ck{font-size:28px!important}.tv2-ey{letter-spacing:.12em;font-size:11px}
  .tvf-top img{display:none}.tvf-top h1{font-size:24px!important;line-height:30px!important}.tvf-rel{font-size:28px!important}.tvf-acts{width:100%}.tvf-acts .btn{flex:1}
  .tvf-o{font-size:15px;grid-template-columns:28px minmax(0,1fr) auto}
  /* tabelas largas rolam dentro do cartão */
  .dbw,.mx-tw,.chw,.calscroll{-webkit-overflow-scrolling:touch}
}
@media (max-width:420px){ .mob-brand img{height:18px!important} .tp-ib,.tp-busca{width:36px!important;height:36px!important} }
</style>`);
/* ===FIM MOB=== */
/* ===================== SILOS · SALDO ÚNICO (07/10): consumo automático pelos apontamentos + medição manual ===================== */
/* Fonte única do saldo: silos/{siloId}  { saldoKg, medidoKg, medidoEm, atualizadoEm, origem, ultimoMov, medicaoId, porUid, porNome }
   Histórico (só inclusão): silomov/{id}  tipos: consumo · estorno · medicao · recusado
   - consumo  id c_{entregaId}  (um apontamento nunca desconta duas vezes)
   - estorno  id e_{entregaId}  (apontamento desfeito devolve o que tinha descontado)
   - recusado id r_{entregaId}  (estoque insuficiente: nada é descontado, fica registrado)
   - medicao  id m_{medicaoId}_{siloId} (medição física: o saldo passa a ser o medido; não é consumo)
   Qual silo cada linha consome: config/geral.siloConsumo = {'Linha 1':'c2', …}. Linha sem silo = nada é descontado. */
S.siloSaldo={}; S.siloMov=[]; S.siloSub=false; S.sm=null; S.siloAvisados={};
const SILO_MOTIVOS=['Medição física','Correção de divergência','Inventário','Erro de apontamento','Outro'];
const SILO_TIPO={consumo:{ic:'⚙️',n:'Consumo (apontamento)'},estorno:{ic:'↩️',n:'Estorno (apontamento desfeito)'},medicao:{ic:'📏',n:'Medição manual'},recusado:{ic:'⛔',n:'Consumo recusado'}};
const siloR=n=>Math.round((+n||0)*1000)/1000;
const fkg=n=>(Math.round(+n||0)).toLocaleString('pt-BR')+' kg';
const fkgS=n=>((+n||0)>0?'+':(+n||0)<0?'−':'')+(Math.round(Math.abs(+n||0))).toLocaleString('pt-BR')+' kg';
function siloFs(){ try{ return window.claude&&window.claude._fs?window.claude._fs():null; }catch(e){ return null; } }
function siloNome(id){ const s=(S.cfg.silos||[]).find(x=>x.id===id); return s?s.nome+(s.grupo?' ('+s.grupo.toLowerCase()+')':''):id; }
function siloPodeMedir(){ try{ return !!(S.acs&&S.acs.dono)||viewOk('medicao'); }catch(e){ return false; } }
function siloPodeConfig(){ try{ return !!(S.acs&&S.acs.dono)||viewOk('ajustes'); }catch(e){ return false; } }
function siloEu(){ return {porUid:S.uid||null,porNome:(S.uid&&S.nomes[S.uid])||''}; }
/* aviso que não some sozinho em 3 s (o toast pode ser coberto pela confirmação do apontamento) */
function siloAviso(msg,tipo){ console.warn('[silos]',msg); let b=document.getElementById('silo-aviso');
  if(!b){ b=document.createElement('div'); b.id='silo-aviso'; b.setAttribute('role','alert'); b.style.cssText='position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:2100;max-width:min(640px,calc(100% - 24px));border-radius:12px;padding:12px 14px;font:14px/1.4 "Segoe UI",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.15);display:flex;gap:10px;align-items:center'; document.body.appendChild(b); }
  b.style.background=tipo==='erro'?'#F8E6E3':'#FFF7E6'; b.style.border='1px solid '+(tipo==='erro'?'#D9A39C':'#E8CB8A'); b.style.color=tipo==='erro'?'#7A2B23':'#5C4210';
  b.innerHTML=`<span style="flex:1">${esc(msg)}</span><button type="button" style="border:0;background:none;font-size:16px;cursor:pointer;color:inherit" aria-label="Fechar">✕</button>`;
  b.querySelector('button').onclick=()=>b.remove(); clearTimeout(siloAviso._t); siloAviso._t=setTimeout(()=>{ const x=document.getElementById('silo-aviso'); if(x) x.remove(); },20000); }
function siloAvisoUmaVez(k,msg,tipo){ if(S.siloAvisados[k]) return; S.siloAvisados[k]=true; siloAviso(msg,tipo); }

/* ---------- leitura ---------- */
function siloAssinar(){ if(S.siloSub||!S.db) return; S.siloSub=true;
  inscrever('silos',()=>S.db.collection('silos').limit(100),snap=>{ const o={}; snap.docs.forEach(d=>{ o[d.id]=d.data(); }); S.siloSaldo=o; S.siloLido=true; rerenderSeguro(); });
  inscrever('silomov',()=>S.db.collection('silomov').orderBy('em','desc').limit(400),snap=>{ S.siloMov=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); }); }
setInterval(()=>{ try{ if(S.db&&S.acs&&S.acs.pronto&&acsP()) siloAssinar(); }catch(e){} },1000);
/* saldo atual por silo, no formato que as telas já usam ({q em toneladas, em}). Sem saldo no sistema novo = última medição (como antes). */
function saldoPorSilo(){ const base=ultimoPorSilo(), out={};
  (S.cfg.silos||[]).forEach(s=>{ const d=S.siloSaldo[s.id];
    if(d&&d.saldoKg!=null) out[s.id]={q:siloR(d.saldoKg/1000),em:d.atualizadoEm||d.medidoEm,origem:d.origem||'medicao',kg:+d.saldoKg,doc:d};
    else if(base[s.id]) out[s.id]=Object.assign({origem:'legado',kg:base[s.id].q*1000},base[s.id]); });
  return out; }
function siloOrigemCurta(u){ return !u?'':u.origem==='consumo'||u.origem==='estorno'?'⚙️ ':u.origem==='medicao'?'📏 Medido ':'Medido '; }
function siloAgoraSub(s,u){ if(!u) return 'sem medição';
  const quando=new Date(u.em).toLocaleDateString('pt-BR')+' '+hora(u.em);
  if(u.origem==='legado') return `${fkg(u.kg)} · medido ${dia(u.em).toLowerCase()} ${hora(u.em)} · <b>desconto automático ainda não iniciado</b>: registre uma medição 📏 para começar`;
  return `${fkg(u.kg)} · Última atualização: ${quando} · Origem: ${u.origem==='medicao'?'📏 Medição manual':'⚙️ Atualização automática'}`; }

/* ---------- consumo pelo apontamento (entregas) ---------- */
let siloFila=Promise.resolve();
/* 26/10: um trabalho travado (sem resposta do servidor) não segura a fila para sempre: depois de 30 s a fila segue (o trabalho continua sozinho) */
const siloEmFila=fn=>{ const job=()=>Promise.race([Promise.resolve().then(fn),new Promise(r=>setTimeout(()=>r({tempo:true}),30000))]); return (siloFila=siloFila.then(job,job)); };
/* quando o cimento saiu do silo: hora do apontamento (antecipado conta a partir de quando foi registrado, como no resto do painel) */
function siloRefEm(e){ return (e.antecipado&&e.registradoEm)?e.registradoEm:(e.em||e.registradoEm||''); }
function siloConsumoDe(e){ const o=ordById(e.ordem); const linha=(o&&o.linha)||e.linha; if(!linha||!usaCimFab(linha)) return null;
  const cod=o?codigoDe(o):''; const kgU=kgCimento(cod); const kg=siloR((+e.qtd||0)*kgU); if(!(kg>0)) return null;
  return {linha,cod,kgU,kg,sid:(S.cfg.siloConsumo||{})[linha]||''}; }
async function siloProcessarEntrega(id,e,silencioso){ const fs=siloFs(); if(!fs||!id||!e) return null;
  if(e.anula) return siloEstornar(e.anula,id,silencioso);
  const c=siloConsumoDe(e); if(!c) return null;
  if(!c.sid){ if(!silencioso&&Object.values(S.cfg.siloConsumo||{}).some(Boolean)) siloAvisoUmaVez('sem-'+c.linha,`A ${c.linha} não tem silo de consumo configurado (Silos → Consumo automático). O apontamento foi salvo, mas nenhum silo foi descontado.`); return null; }
  const agora=new Date().toISOString(), eu=siloEu(), movId='c_'+id;
  const r=await fs.runTransaction(async t=>{ const mref=fs.doc('silomov/'+movId), rref=fs.doc('silomov/r_'+id), sref=fs.doc('silos/'+c.sid);
    const m=await t.get(mref); if(m.exists) return {dup:true};
    const rc=await t.get(rref); if(rc.exists) return {dup:true};
    const sd=await t.get(sref); if(!sd.exists) return {semSaldo:true};
    const ref=siloRefEm(e)||agora; if(sd.data().medidoEm&&ref<=sd.data().medidoEm) return {jaMedido:true}; /* produzido antes da última medição: a medição já enxergou */
    const antes=siloR(sd.data().saldoKg);
    const base={silo:c.sid,entregaId:id,ordem:e.ordem||null,num:e.num||null,linha:c.linha,codigo:c.cod,qtd:+e.qtd||0,kgPorUn:c.kgU,refEm:ref,em:agora,origem:'apontamento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu};
    if(c.kg>antes+1e-6){ t.set(rref,Object.assign({tipo:'recusado',antesKg:antes,pedidoKg:c.kg,deltaKg:0,depoisKg:antes,motivo:'Estoque insuficiente no silo'},base)); return {insuf:true,antes}; }
    const depois=siloR(antes-c.kg);
    t.set(mref,Object.assign({tipo:'consumo',antesKg:antes,deltaKg:-c.kg,depoisKg:depois},base));
    t.set(sref,{saldoKg:depois,atualizadoEm:agora,origem:'consumo',ultimoMov:movId,...eu},{merge:true});
    return {ok:true,antes,depois}; });
  if(r.semSaldo&&!silencioso) siloAvisoUmaVez('semsaldo-'+c.sid,`O ${siloNome(c.sid)} ainda não tem saldo inicial. Registre uma medição (📏 Registrar medição) para ativar o desconto automático. O apontamento foi salvo.`);
  if(r.insuf) siloAviso(`Estoque insuficiente no silo ${siloNome(c.sid)}: saldo ${fkg(r.antes)}, consumo de ${fkg(c.kg)} (ordem ${e.num||''}). O apontamento foi salvo, mas o saldo do silo NÃO foi alterado. Confira o silo e registre uma medição.`,'erro');
  return Object.assign({sid:c.sid,kg:c.kg},r); }
async function siloEstornar(origId,anulaId,silencioso){ const fs=siloFs(); if(!fs) return null; const agora=new Date().toISOString(), eu=siloEu(), movId='e_'+origId;
  return fs.runTransaction(async t=>{ const cref=fs.doc('silomov/c_'+origId), eref=fs.doc('silomov/'+movId);
    const ce=await t.get(cref); if(!ce.exists) return {nada:true};   /* esse apontamento não tinha descontado silo */
    const ee=await t.get(eref); if(ee.exists) return {dup:true};
    const c=ce.data(); const sref=fs.doc('silos/'+c.silo); const sd=await t.get(sref); const antes=siloR(sd.exists?sd.data().saldoKg:0);
    const kg=siloR(-c.deltaKg); const sdd=sd.exists?sd.data():{};
    /* uma medição feita DEPOIS do consumo já enxergou o silo sem esse material: devolver agora contaria duas vezes */
    const medidoDepois=sdd.medidoEm&&c.em&&sdd.medidoEm>c.em;
    const depois=medidoDepois?antes:siloR(antes+kg);
    t.set(eref,{tipo:'estorno',silo:c.silo,entregaId:origId,anulaId:anulaId||null,ordem:c.ordem||null,num:c.num||null,linha:c.linha||null,antesKg:antes,deltaKg:medidoDepois?0:kg,depoisKg:depois,
      motivo:medidoDepois?'Apontamento desfeito depois de uma medição: saldo mantido (a medição já vale)':'Apontamento desfeito',refEm:agora,em:agora,origem:'apontamento',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu});
    if(!medidoDepois) t.set(sref,{saldoKg:depois,atualizadoEm:agora,origem:'estorno',ultimoMov:movId,...eu},{merge:true});
    return {ok:true,antes,depois}; }); }

/* ---------- medição manual (física) ---------- */
/* o saldo passa a ser o medido. Se a medição foi feita mais cedo (hora informada), os consumos lançados depois daquela hora continuam valendo. */
async function siloRegistrarMedicao(p){ const fs=siloFs(); if(!fs) throw {code:'sem-db'};
  const agora=new Date().toISOString(), eu=siloEu(), em=p.em||agora, movId='m_'+p.medicaoId+'_'+p.sid;
  const depoisDaMedicao=S.siloMov.filter(m=>m.silo===p.sid&&(m.tipo==='consumo'||m.tipo==='estorno')&&String(m.refEm||m.em)>em).reduce((a,m)=>a+(+m.deltaKg||0),0);
  const legado=(ultimoPorSilo()[p.sid]||null);
  return fs.runTransaction(async t=>{ const mref=fs.doc('silomov/'+movId), sref=fs.doc('silos/'+p.sid);
    const m=await t.get(mref); if(m.exists) return {dup:true};
    const sd=await t.get(sref); const d=sd.exists?sd.data():null;
    const antes=d?siloR(d.saldoKg):(legado?siloR(legado.q*1000):null);
    const base={tipo:'medicao',silo:p.sid,medicaoId:p.medicaoId,motivo:p.motivo,obs:p.obs||null,medidoPor:p.medidoPor||null,refEm:em,em:agora,medidoEm:em,horaInformada:em!==agora&&!!p.horaManual,origem:'medicao',gravadoEm:firebase.firestore.FieldValue.serverTimestamp(),...eu};
    let novo, aplicado=true, nota=null;
    if(p.corrige&&d&&d.medicaoId===p.corrige&&p.corrigeKg!=null){ novo=Math.max(0,siloR(antes+(p.kg-p.corrigeKg))); nota='Correção da medição anterior: diferença aplicada sobre o saldo atual'; }
    else if(p.corrige){ aplicado=false; novo=antes; nota='Correção de uma medição antiga: já existe medição mais nova, saldo mantido'; }
    /* 26/10: medição feita agora (sem hora informada) sempre vale; medidoEm no futuro (relógio adiantado de outro aparelho) não conta */
    else if(d&&d.medidoEm&&d.medidoEm>em&&!p.forcar&&!(p.agora&&!p.horaManual)&&d.medidoEm<=new Date(Date.now()+120000).toISOString()){ aplicado=false; novo=antes; nota='Medição com hora anterior à última medição: registrada no histórico, saldo mantido'; }
    else { novo=Math.max(0,siloR(p.kg+depoisDaMedicao)); if(depoisDaMedicao) nota='Medição com hora informada: '+fkgS(depoisDaMedicao)+' de apontamentos lançados depois dessa hora continuam valendo'; }
    t.set(mref,Object.assign(base,{antesKg:antes,medidoKg:siloR(p.kg),diferencaKg:antes==null?null:siloR(p.kg-antes),deltaKg:antes==null?null:siloR(novo-antes),depoisKg:novo,aplicado,nota}));
    if(aplicado) t.set(sref,{saldoKg:novo,medidoKg:p.corrige?siloR((d.medidoKg||0)+(p.kg-p.corrigeKg)):siloR(p.kg),medidoEm:p.corrige?d.medidoEm:em,medicaoId:p.corrige?p.medicaoId:p.medicaoId,atualizadoEm:agora,origem:'medicao',ultimoMov:movId,...eu},{merge:true});
    return {ok:true,antes,novo,aplicado,nota}; }); }
/* medição salva pela tela "Nova medição" (vários silos de uma vez): cada silo medido atualiza o saldo */
async function siloMedicaoSalva(id,doc,op){ const corr=doc.corrige?S.medicoes.find(m=>m._id===doc.corrige):null; const res=[];
  for(const sid of Object.keys(doc.itens||{})){ const t=+doc.itens[sid]; if(isNaN(t)) continue;
    const orig=corr&&corr.itens&&corr.itens[sid]!=null?+corr.itens[sid]*1000:null;
    try{ res.push(await siloRegistrarMedicao({sid,kg:t*1000,motivo:doc.motivo||(doc.corrige?'Correção de divergência':'Medição física'),obs:doc.obs,medidoPor:doc.medidoPor,em:doc.em,horaManual:!!doc.horaManual,agora:!!(op&&op.agora),medicaoId:id,corrige:orig!=null?doc.corrige:null,corrigeKg:orig})); }
    catch(e){ console.warn('[silos] medição',sid,e); siloAviso('A medição foi salva, mas o saldo do '+siloNome(sid)+' não foi atualizado agora ('+((e&&e.code)||'erro')+'). Tente registrar de novo.','erro'); } }
  return res; }

/* ---------- gravação: entregas e medições passam por aqui (mesmo comportamento de antes + saldo do silo) ---------- */
{ const _sv=salvar; salvar=async function(col,doc){ if((col!=='entregas'&&col!=='medicoes')||!S.db) return _sv(col,doc);
    if(col==='medicoes') doc.saldoV=2; /* marca: medição que alimenta o saldo (para a rede de segurança) */
    let id; try{ const ref=S.db.collection(col).doc(); id=ref.id; await ref.set(doc); }catch(e){ erro(e); return false; }
    if(col==='entregas') siloEmFila(()=>siloProcessarEntrega(id,doc).catch(e=>{ console.warn('[silos] consumo',e); siloAviso('O apontamento foi salvo, mas não consegui descontar o silo agora ('+((e&&e.code)||'erro')+'). O painel tenta de novo sozinho.'); }));
    else { await siloEmFila(()=>siloMedicaoSalva(id,doc,{agora:true})); try{ avMedicao(id,doc); }catch(e){ console.warn('[avisos]',e); } }
    return true; }; }
/* rede de segurança: apontamentos que não descontaram (sem internet, aba fechada no meio, aparelho com versão antiga) são processados por qualquer painel aberto */
async function siloReconciliar(){ if(!S.db||!siloFs()||!S.siloSub||S._siloRec||(typeof soVer==='function'&&soVer())) return;
  const feitos=new Set(S.siloMov.map(m=>m._id)); const lim=new Date(Date.now()-3*864e5).toISOString(); const pend=[];
  for(const e of S.entregas||[]){ if(pend.length>=20) break; const reg=siloRefEm(e); if(!reg||reg<lim) continue;
    if(e.anula){ if(feitos.has('c_'+e.anula)&&!feitos.has('e_'+e.anula)) pend.push(e); continue; }
    if(feitos.has('c_'+e._id)||feitos.has('r_'+e._id)) continue;
    const c=siloConsumoDe(e); if(!c||!c.sid) continue; const sd=S.siloSaldo[c.sid]; if(!sd||!sd.medidoEm||reg<=sd.medidoEm) continue; pend.push(e); }
  /* medições gravadas pelo painel novo que ainda não chegaram ao saldo (ex.: salvas sem internet) */
  const medPend=(S.medicoes||[]).filter(m=>m.saldoV===2&&!m.corrige&&m.em>=lim&&Object.keys(m.itens||{}).some(sid=>!feitos.has('m_'+m._id+'_'+sid)&&!(S.siloSaldo[sid]&&S.siloSaldo[sid].medidoEm>m.em))).slice(0,5);
  if(!pend.length&&!medPend.length) return; S._siloRec=true;
  try{ for(const m of medPend) await siloEmFila(()=>siloMedicaoSalva(m._id,m).catch(x=>console.warn('[silos] reconciliar medição',x&&x.code)));
    for(const e of pend) await siloEmFila(()=>siloProcessarEntrega(e._id,e,true).catch(x=>console.warn('[silos] reconciliar',x&&x.code))); } finally { S._siloRec=false; } }
setInterval(()=>{ siloReconciliar().catch(()=>{}); },45000);

/* ---------- cimento × programação: usa o mesmo saldo dos tanques quando o sistema novo está completo ---------- */
{ const _pc=previsaoCimento; previsaoCimento=function(){ const cs=S.cfg.silos.filter(s=>s.grupo==='Cimento'); const map=S.cfg.siloConsumo||{};
    const ativo=cs.length&&cs.every(s=>S.siloSaldo[s.id]&&S.siloSaldo[s.id].saldoKg!=null)&&linhasOrd().filter(usaCimFab).every(l=>map[l]);
    if(!ativo) return _pc();
    const ds=cs.map(s=>S.siloSaldo[s.id]); const base=ds.map(d=>d.medidoEm||d.atualizadoEm).sort()[0];
    const saldo=ds.reduce((a,d)=>a+(+d.saldoKg||0),0)/1000, medido=ds.reduce((a,d)=>a+(+(d.medidoKg!=null?d.medidoKg:d.saldoKg)||0),0)/1000, consumido=Math.max(0,medido-saldo);
    let chegou=0; S.cargas.forEach(c=>{ const d=(c.etapas||{}).descarregado; if(d&&d>base&&+c.qtd>0) chegou+=+c.qtd; });
    const pend=S.cargas.filter(c=>etapaCarga(c)<2); const aCaminho=pend.reduce((a,c)=>a+(+c.qtd||0),0);
    const estoque=Math.max(0,saldo+chegou); const L=linhasOrd(); const abertas=ordAbertas().filter(o=>usaCimFab(o.linha));
    const fila=abertas.map(o=>({o,kg:kgCimento(codigoDe(o))})).filter(x=>x.kg>0).map(x=>({o:x.o,t:Math.max(0,x.o.total-entregueDe(x.o))*x.kg/1000})).filter(x=>x.t>0)
      .sort((a,b)=>dataEf(a.o).localeCompare(dataEf(b.o))||L.indexOf(a.o.linha)-L.indexOf(b.o.linha)||String(a.o.num).localeCompare(String(b.o.num)));
    let acc=0, falta=null; fila.forEach(x=>{ const antes=acc; acc+=x.t; if(!falta&&acc>estoque+0.0001) falta={o:x.o,dia:dataEf(x.o),sacosOk:Math.max(0,Math.floor((estoque-antes)*1000/kgCimento(codigoDe(x.o))))}; });
    const semKg=abertas.filter(o=>/^(AC|AB)\d/.test(codigoDe(o))&&!kgCimento(codigoDe(o))).length;
    return {medido,base,consumido,chegou,estoque,necessario:acc,falta,aCaminho,nCaminho:pend.length,semKg,nOrdens:fila.length}; }; }

/* ---------- tela do silo: formulário 📏, movimentações e configuração ---------- */
function siloFormHtml(s){ const F=S.sm; if(!F||F.silo!==s.id) return ''; const u=saldoPorSilo()[s.id];
  return `<section class="card" id="sm-form" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><h2>📏 Registrar medição · ${esc(s.nome)}</h2><button class="lnk" data-act="sm-fechar">Cancelar</button></div>
   <div class="sub" style="margin:4px 0 14px">A medição física substitui o saldo do sistema. Não é lançada como consumo.</div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;align-items:end">
    <div><div class="label">SALDO NO SISTEMA</div><div class="num" style="font-size:24px;font-weight:700;margin-top:4px" id="sm-antes" data-kg="${u?u.kg:''}">${u?fkg(u.kg):'—'}</div></div>
    <label style="display:flex;flex-direction:column;gap:6px"><span class="label">MEDIÇÃO FÍSICA (KG)</span><input class="txt" id="sm-kg" inputmode="decimal" autocomplete="off" value="${esc(F.kg||'')}" style="height:48px;font-size:20px" placeholder="ex.: 9200"></label>
    <div><div class="label">DIFERENÇA</div><div class="num" style="font-size:20px;font-weight:700;margin-top:4px" id="sm-dif">—</div></div></div>
   <div class="label" style="margin:16px 0 6px">MOTIVO</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap" role="radiogroup" aria-label="Motivo da medição">${SILO_MOTIVOS.map(m=>`<button type="button" class="opt" role="radio" data-act="sm-motivo" data-v="${esc(m)}" aria-pressed="${F.motivo===m}" aria-checked="${F.motivo===m}" style="min-height:44px;padding:8px 14px">${esc(m)}</button>`).join('')}</div>
   ${F.motivo==='Outro'?`<label style="display:flex;flex-direction:column;gap:6px;margin-top:12px"><span class="label">DESCREVA O MOTIVO</span><input class="txt" id="sm-outro" maxlength="120" value="${esc(F.outro||'')}" style="height:44px"></label>`:''}
   <label style="display:flex;flex-direction:column;gap:6px;margin-top:12px"><span class="label">OBSERVAÇÃO (OPCIONAL)</span><textarea class="txt" id="sm-obs" rows="2" maxlength="500">${esc(F.obs||'')}</textarea></label>
   <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:14px"><button class="btn big" data-act="sm-salvar" ${F.salvando?'disabled':''}>${F.salvando?'Salvando…':'Salvar medição'}</button></div></section>`; }
function siloMovHtml(s){ const xs=S.siloMov.filter(m=>m.silo===s.id).slice(0,60);
  const row=m=>{ const T=SILO_TIPO[m.tipo]||{ic:'',n:m.tipo}; const mov=m.tipo==='medicao'?`medido ${fkg(m.medidoKg)}${m.diferencaKg!=null?' · diferença '+fkgS(m.diferencaKg):''}`:m.tipo==='recusado'?`pedido ${fkg(m.pedidoKg)}`:fkgS(m.deltaKg);
    const det=m.tipo==='medicao'?[m.motivo,m.obs,m.nota].filter(Boolean).join(' · '):[m.num?'Ordem '+m.num:'',m.linha,m.qtd?fq(m.qtd)+' un × '+fq(m.kgPorUn)+' kg':'',m.motivo&&m.tipo!=='consumo'?m.motivo:''].filter(Boolean).join(' · ');
    return `<div class="row num" style="grid-template-columns:135px minmax(0,1.3fr) 110px 110px minmax(0,1fr);gap:10px;align-items:start"><span style="color:var(--ink-2)">${new Date(m.em).toLocaleDateString('pt-BR')} ${hora(m.em)}</span><span><b>${T.ic} ${T.n}</b><small style="display:block;color:var(--muted)">${esc(det)}</small></span><span style="text-align:right">${m.antesKg!=null?fkg(m.antesKg):'—'}<small style="display:block;color:var(--muted)">antes</small></span><span style="text-align:right"><b>${fkg(m.depoisKg)}</b><small style="display:block;color:var(--muted)">${esc(mov)}</small></span><span style="color:var(--ink-2)">${esc(m.porNome||nomeDe(m.porUid))}<small style="display:block;color:var(--muted)">${m.origem==='medicao'?'📏 manual':'⚙️ apontamento'}</small></span></div>`; };
  return `<section class="card"><div class="label" style="margin-bottom:6px">MOVIMENTAÇÕES DO ${esc(s.nome).toUpperCase()} (SALDO)</div><div style="overflow-x:auto"><div style="min-width:720px">${xs.length?xs.map(row).join(''):'<div class="empty">Ainda não há movimentações neste silo. Elas começam na primeira medição registrada com 📏.</div>'}</div></div></section>`; }
function siloCfgHtml(){ const cs=(S.cfg.silos||[]).filter(s=>s.grupo==='Cimento'); const map=S.cfg.siloConsumo||{}; const ls=linhasOrd().filter(usaCimFab); const pode=siloPodeConfig();
  return `<section class="card"><div class="label">CONSUMO AUTOMÁTICO DE CIMENTO</div><div class="sub" style="margin:4px 0 10px">Cada apontamento desconta do silo da linha: quantidade × kg de cimento do item (cadastro de Itens). Linha sem silo não desconta nada.</div>
   ${ls.map(l=>`<div class="row" style="grid-template-columns:minmax(0,1fr) 240px;align-items:center"><b>${esc(l)}</b>${pode?`<select class="txt" data-silo-linha="${esc(l)}" style="height:40px"><option value="">— não descontar —</option>${cs.map(s=>`<option value="${esc(s.id)}" ${map[l]===s.id?'selected':''}>${esc(s.nome)}</option>`).join('')}</select>`:`<span>${map[l]?esc(siloNome(map[l])):'não desconta'}</span>`}</div>`).join('')}
   ${pode?'<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-act="sm-cfg">Salvar silos das linhas</button></div>':''}</section>`; }
{ const _vs=vSilos; vSilos=function(){ const s=S.cfg.silos.find(x=>x.id===S.siloSel)||S.cfg.silos[0]; return _vs.apply(this,arguments)+(s?siloMovHtml(s):'')+(s&&s.grupo==='Cimento'?siloCfgHtml():''); }; }
function siloDifAtualiza(){ const i=$('#sm-kg'), a=$('#sm-antes'), d=$('#sm-dif'); if(!i||!a||!d) return; const n=numIn(i.value), ant=a.dataset.kg===''?null:+a.dataset.kg;
  d.textContent=n==null?'—':ant==null?'(sem saldo anterior)':fkgS(n-ant); d.style.color=n!=null&&ant!=null&&n<ant?'var(--crit-ink)':''; }
document.addEventListener('input',ev=>{ if(ev.target&&ev.target.id==='sm-kg'){ if(S.sm) S.sm.kg=ev.target.value; siloDifAtualiza(); } else if(ev.target&&ev.target.id==='sm-outro'&&S.sm) S.sm.outro=ev.target.value; else if(ev.target&&ev.target.id==='sm-obs'&&S.sm) S.sm.obs=ev.target.value; });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="sm-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='sm-abrir'){ if(!siloPodeMedir()){ toast('Você não possui permissão para acessar este módulo.'); return; } S.sm={silo:b.dataset.silo,kg:'',motivo:'Medição física',outro:'',obs:'',salvando:false}; render(); setTimeout(()=>{ const i=$('#sm-kg'); i&&i.focus(); siloDifAtualiza(); },30); return; }
  if(a==='sm-fechar'){ S.sm=null; render(); return; }
  if(a==='sm-motivo'&&S.sm){ S.sm.motivo=b.dataset.v; render(); siloDifAtualiza(); return; }
  if(a==='sm-cfg'){ if(!siloPodeConfig()) return; const m={}; document.querySelectorAll('[data-silo-linha]').forEach(x=>{ m[x.dataset.siloLinha]=x.value||''; });
    try{ await S.db.doc('config/geral').update({siloConsumo:m}); S.cfg.siloConsumo=Object.assign({},S.cfg.siloConsumo||{},m); toast('Silos das linhas salvos.'); render(); }catch(e){ erro(e); } return; }
  if(a==='sm-salvar'&&S.sm&&!S.sm.salvando){ const F=S.sm; const kg=numIn(($('#sm-kg')||{}).value); const s=S.cfg.silos.find(x=>x.id===F.silo);
    if(kg==null||kg<0){ toast('Informe a medição em kg (0 = vazio).'); return; }
    if(s&&s.cap&&kg>s.cap*1000*1.05&&!confirm(`A medição (${fkg(kg)}) passa da capacidade do silo (${fkg(s.cap*1000)}). Salvar mesmo assim?`)) return;
    const motivo=F.motivo==='Outro'?('Outro: '+String(($('#sm-outro')||{}).value||'').trim()):F.motivo; if(F.motivo==='Outro'&&motivo.length<8){ toast('Descreva o motivo.'); return; }
    if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    F.salvando=true; render(); const em=new Date().toISOString(); const obs=String(($('#sm-obs')||{}).value||F.obs||'').trim();
    try{ const ref=S.db.collection('medicoes').doc(); const doc={em,por:S.uid,itens:{[F.silo]:Math.round(kg/100)/10},caps:Object.fromEntries(S.cfg.silos.map(x=>[x.id,x.cap])),medidoPor:(S.uid&&S.nomes[S.uid])||'',motivo,origem:'silo-medicao',saldoV:2}; if(obs) doc.obs=obs;
      await ref.set(doc);
      const r=await siloEmFila(()=>siloRegistrarMedicao({sid:F.silo,kg,motivo,obs,em,medicaoId:ref.id,agora:true})); try{ avMedicao(ref.id,doc); }catch(e){ console.warn('[avisos]',e); } try{ if(typeof mdnRelata==='function') mdnRelata(ref.id,doc,[r],true); }catch(e){}
      S.sm=null; toast(r&&r.ok&&r.aplicado!==false?`Medição salva · ${siloNome(F.silo)}: ${fkg(r.novo)}${r.antes!=null?' (diferença '+fkgS(kg-r.antes)+')':''}`:'Medição salva.'); render(); }
    catch(e){ console.warn('[silos] medição',e); F.salvando=false; render(); siloAviso(e&&e.code==='unavailable'?'Não foi possível conectar ao servidor. A medição não foi salva. Verifique sua conexão e tente novamente.':'A medição não foi salva ('+((e&&e.code)||'erro')+').','erro'); }
    return; } });

/* ===================== API PARA MÓDULOS EM ARQUIVOS SEPARADOS (09/10) =====================
   Módulos novos ficam em modulos/<nome>.js (carregados por modulos/lista.js) e usam window.Painel.
   Painel.registrarModulo({ id, nome, ic, telas:{ <id-da-tela>:{ nome, render:()=>html } }, iniciar:()=>{ assinaturas do banco } }) */
S.extViews={};
var TELA_SEM_MENU={}; /* telas de módulo que abrem por link/aba mas não aparecem nas abas do menu (telas:{x:{menu:false}}) */
function registrarModulo(m){ if(!m||!m.id||MODS.some(x=>x.id===m.id)) return false; const vs=Object.keys(m.telas||{});
  vs.forEach(v=>{ const t=m.telas[v]; VIEWS[v]={nome:t.nome,ic:m.ic||'grid',mob:t.mob||t.nome}; CRUMB[v]=t.nome; if(t.menu===false) TELA_SEM_MENU[v]=1; S.extViews[v]=()=>{ try{ return t.render(); }catch(e){ console.warn('[módulo '+m.id+']',e); return '<section class="card"><div class="empty">Não foi possível mostrar esta tela.</div></section>'; } }; });
  MODS.push({id:m.id,nome:m.nome,ic:m.ic||'grid',views:vs}); if(!ACS_MODS.some(x=>x[0]===m.id)) ACS_MODS.splice(Math.max(0,ACS_MODS.findIndex(x=>x[0]==='ajustes')),0,[m.id,m.nome]);
  if(typeof LEIT_CONHECIDOS!=='undefined'&&!LEIT_CONHECIDOS.includes(m.id)) LEIT_CONHECIDOS.push(m.id);
  if(typeof EQ_MOD!=='undefined'&&!EQ_MOD[m.id]) EQ_MOD[m.id]=[m.ic||'grid',m.nome];
  if(typeof m.iniciar==='function'){ const t=setInterval(()=>{ try{ if(S.db&&S.acs&&S.acs.pronto&&acsP()&&vs.some(v=>viewOk(v))){ clearInterval(t); m.iniciar(); } }catch(e){ clearInterval(t); console.warn('[módulo '+m.id+']',e); } },500); }
  try{ render(); }catch(e){} return true; }
window.Painel={ versao:1, S, registrarModulo, render:()=>render(), rerender:()=>rerenderSeguro(), go:v=>go(v), viewOk:v=>viewOk(v), acsP:()=>acsP(), dono:()=>!!(S.acs&&S.acs.dono),
  db:()=>S.db, inscrever:(nome,mk,on)=>inscrever(nome,mk,on), esc, ic, toast:m=>toast(m), erro:e=>erro(e), hojeStr:d=>hojeStr(d), hora, dia:x=>dia(x), dm:x=>dm(x), linhas:()=>linhasOrd(),
  nomeDe:id=>nomeDe(id), soVer:()=>(typeof soVer==='function'&&soVer()), registrarPerfil, registrarAviso,
  modsVis:()=>modsVis().map(m=>m.id) /* módulos que a pessoa vê no menu (o RH usa para mostrar as telas na lateral) */,
  feriadosAno:y=>feriadosAno(y), feriadoDe:d=>feriadoDe(d), ferNac:y=>feriadosNac(y), ferSug:y=>feriadosSug(y), ferCal:()=>S.ferCal||{} /* calendário de feriados */ };
/* avisos de módulos no "Meu dia": Painel.registrarAviso(()=>[{nivel:'crit'|'warn', titulo, texto, go:'tela'}]) */
S.avisosMod=[];
function registrarAviso(fn){ if(typeof fn==='function') S.avisosMod.push(fn); }
function avisosModulos(){ const xs=[]; S.avisosMod.forEach(f=>{ try{ (f()||[]).forEach(a=>{ if(a&&a.titulo&&(!a.go||viewOk(a.go))) xs.push(a); }); }catch(e){ console.warn('[avisos]',e); } });
  return xs.sort((a,b)=>(a.nivel==='crit'?0:1)-(b.nivel==='crit'?0:1)); }
{ const _md=vMeuDia; vMeuDia=function(){ const h=_md.apply(this,arguments); const xs=avisosModulos(); if(!xs.length) return h;
  const card=`<section class="card md-av"><div class="label" style="margin-bottom:8px">AVISOS</div>${xs.slice(0,8).map(a=>`<div class="md-avi ${a.nivel==='crit'?'crit':'warn'}"><span class="pill ${a.nivel==='crit'?'crit':'warn'}">${esc(a.rotulo||(a.nivel==='crit'?'Urgente':'Atenção'))}</span><div><b>${esc(a.titulo)}</b><small>${esc(a.texto||'')}</small></div>${a.go?`<button class="lnk" data-go="${esc(a.go)}">Abrir</button>`:''}</div>`).join('')}${xs.length>8?`<div class="sub" style="margin:6px 0 0">e mais ${xs.length-8}</div>`:''}</section>`;
  const i=h.indexOf('<section'); return i<0?h+card:h.slice(0,i)+card+h.slice(i); }; }
document.head.insertAdjacentHTML('beforeend','<style>.md-av{border-left:6px solid var(--warn)}.md-avi{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.md-avi:first-of-type{border-top:0}.md-avi small{display:block;color:var(--muted)}</style>');
/* cargo pronto vindo de um módulo: Painel.registrarPerfil('rh',{nome,mods,desc,soVer:true}) */
function registrarPerfil(k,o){ if(!k||!o||ACS_PERFIS[k]) return false; const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS[k]={nome:o.nome,mods:o.mods||[],locais:[]}; ACS_PERFIS.outro=_o;
  if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes(k)) EQ_PRONTO_ORD.splice(Math.min(EQ_PRONTO_ORD.length,o.pos!=null?o.pos:3),0,k);
  if(typeof EQ_PRONTO_DESC!=='undefined'&&o.desc) EQ_PRONTO_DESC[k]=o.desc; if(o.soVer&&!ACS_SO_VER.includes(k)) ACS_SO_VER.push(k); try{ render(); }catch(e){} return true; }
/* ===FIM API MÓDULOS=== */

iniciar();
