/* ===================== ORGANIZAÇÃO DOS MÓDULOS (pedidos de 13/10) =====================
   Produção: só Programação, Calendário e Indicadores.
   Almoxarifado: Fila do almox (primeiro) · Diário de bordo · Monitor · fichas de premix · receitas.
     A fila sempre mostra o que a produção vai rodar no próximo dia útil (o que o PCP programou para amanhã aparece hoje)
     e as ordens de hoje que ainda não foram entregues.
   Telas de TV: Apresentação e TV da fábrica.
   Tablet da produção (módulo novo, por enquanto sem uso): Tela da linha e Paradas (as paradas já ficam na Manutenção).
   As permissões continuam: quem tinha Produção continua vendo o diário, a fila e o monitor (agora no Almoxarifado). */
(function(){
  const tira=(m,v)=>{ const M=MODS.find(x=>x.id===m); if(M) M.views=M.views.filter(x=>x!==v); };
  ['diario','paradas','tvfab','linhatv','ranchos'].forEach(v=>tira('producao',v));
  VIEWS.dbfila={nome:'Fila do almox',ic:'fila',mob:'Fila'}; CRUMB.dbfila='Fila do almox';
  VIEWS.dbmon={nome:'Monitor',ic:'tv',mob:'Monitor'}; CRUMB.dbmon='Monitor do rancho';
  VIEWS.diario.mob='Diário';
  const pmx=MODS.find(x=>x.id==='premix'); if(pmx) pmx.views=['dbfila','diario','dbmon'].concat(pmx.views.filter(v=>!['dbfila','diario','dbmon'].includes(v)));
  const tel=MODS.find(x=>x.id==='telas'); if(tel&&!tel.views.includes('tvfab')) tel.views.push('tvfab');
  if(!MODS.some(x=>x.id==='tabprod')){ const i=MODS.findIndex(x=>x.id==='telas'); MODS.splice(i<0?MODS.length:i+1,0,{id:'tabprod',nome:'Tablet da produção',ic:'fabrica',views:['linhatv','paradas']}); }
  if(!ACS_MODS.some(x=>x[0]==='tabprod')) ACS_MODS.splice(Math.max(0,ACS_MODS.findIndex(m=>m[0]==='ajustes')),0,['tabprod','Tablet da produção (tela da linha e paradas)']);
  try{ if(!LEIT_CONHECIDOS.includes('tabprod')) LEIT_CONHECIDOS.push('tabprod'); ['prod','paradas','chamados','diario'].forEach(g=>{ if(LEIT_GRUPOS[g]&&!LEIT_GRUPOS[g].includes('tabprod')) LEIT_GRUPOS[g].push('tabprod'); }); }catch(e){}
  try{ if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.tabprod) EQ_MOD.tabprod=['fabrica','Tablet da produção']; }catch(e){}
})();
/* permissões: as telas mudaram de módulo, mas quem já via continua vendo */
{ const _vo=viewOk; viewOk=function(v){
    if(v==='diario'||v==='dbfila'||v==='dbmon'){ const p=acsP(); if(!p) return false; if(p.tudo) return true; return ['producao','almox','premix'].some(m=>p.mods.includes(m)); }
    if(v==='tvfab'){ const p=acsP(); if(!p) return false; if(p.tudo) return true; return ['tv','telas','producao','analise'].some(m=>p.mods.includes(m)); }
    if(v==='paradas'){ const p=acsP(); if(!p) return false; if(p.tudo) return true; return ['paradas','tabprod'].some(m=>p.mods.includes(m)); }
    return _vo.apply(this,arguments); }; }
/* Tablet da produção (por enquanto sem uso): no menu só para quem tem o cargo da linha ou o módulo; a Tela da linha continua abrindo para a produção (chamado pela linha) */
{ const _mv=modsVis; modsVis=function(){ const xs=_mv.apply(this,arguments); const p=acsP(); if(!p||p.tudo||['paradas','tabprod'].some(m=>(p.mods||[]).includes(m))) return xs; return xs.filter(m=>m.id!=='tabprod'); }; }
/* tela da linha sozinha (computador fixo da linha): só ela e as paradas visíveis */
ltvSoLinha=function(){ const p=acsP(); if(!p||p.tudo||(S.acs&&S.acs.dono)) return false; const ms=modsVis(); return ms.length>0&&ms.every(m=>mViews(m).every(v=>v==='linhatv'||v==='paradas'))&&ms.reduce((a,m)=>a+mViews(m).length,0)>0; };
/* diário de bordo: cada modo é uma tela do Almoxarifado */
{ const _go=go; go=function(v){ const D=S.dbo, de=S.view;
    if(de==='dbmon'&&v!=='dbmon'){ try{ localStorage.setItem('colafix.monitor',''); }catch(e){} try{ document.fullscreenElement&&document.exitFullscreen(); }catch(e){} }
    if(v==='diario'){ /* quem pede a fila ou o monitor (Meu dia, painéis, QR) ainda chama go('diario') */
      if(D.modo==='fila'&&de!=='dbfila') v='dbfila';
      else if(D.modo==='monitor'&&de!=='dbmon'&&de!=='diario') v='dbmon';
      else D.modo='tabela'; }
    else if((de==='dbfila'||de==='dbmon')&&v!=='dbfila'&&v!=='dbmon') D.modo='tabela';
    if(v==='dbfila'){ D.modo='fila'; D.aberto=null; }
    if(v==='dbmon'){ D.modo='monitor'; D.dia=hojeStr(); D.so=''; try{ localStorage.setItem('colafix.monitor','1'); }catch(e){} }
    return _go.apply(this,[v].concat([].slice.call(arguments,1))); }; }
S.extViews.dbfila=()=>{ S.dbo.modo='fila'; return vDiario(); };
S.extViews.dbmon=()=>{ S.dbo.modo='monitor'; return vDiario(); };
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="db-modo"]'); if(!b) return; const m=b.dataset.v, alvo=m==='fila'?'dbfila':m==='monitor'?'dbmon':'diario'; if(S.view!==alvo) go(alvo); });
/* a fila do almox mostra sempre pelo dia da entrega (o que roda amanhã aparece hoje), a menos que a pessoa troque */
{ const _de=dbEntrega; dbEntrega=function(){ const D=S.dbo; if(D.entrega===undefined&&D.modo==='fila') return true; return _de.apply(this,arguments); }; }
/* cabeçalho do diário no Almoxarifado: título da tela, sem o texto longo e sem os botões de modo (agora são abas) */
{ const _vd=vDiario; vDiario=function(){ let h=_vd.apply(this,arguments); if(S.dbo.modo==='monitor') return h;
    const tit=S.view==='dbfila'?'Fila do almox':'Diário de bordo do rancho', sub=S.view==='dbfila'?'Ranchos para separar e entregar na linha, na ordem de prioridade.':'Cada etapa do rancho: enviado → separado → entregue → conferido.';
    h=h.replace(/<div class="eyebrow">PRODUÇÃO<\/div><h1>Diário de bordo do rancho<\/h1><div class="sub">[^<]*<\/div>/,`<div class="eyebrow">ALMOXARIFADO</div><h1>${tit}</h1><div class="sub">${sub}</div>`)
      .replace(/<div class="seg" role="group" aria-label="Modo">[\s\S]*?<\/div>/,'');
    return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style>
  .rsm{margin:0 0 2px!important}
  #view > .head + .rsm{margin-top:-4px!important}
  /* diário: a tabela cabe na tela (antes passava para fora do cartão em telas de 1366) */
  .dbt{min-width:0!important;table-layout:fixed}
  .dbt th,.dbt td{padding:7px 6px}
  .dbt th:nth-child(1),.dbt td:nth-child(1){width:30px}
  .dbt th:nth-child(2){width:70px} .dbt th:nth-child(3){width:78px} .dbt th:nth-child(5){width:108px}
  .dbt th:nth-child(6),.dbt th:nth-child(7),.dbt th:nth-child(8),.dbt th:nth-child(9),.dbt th:nth-child(10){width:74px}
  .dbt th:nth-child(11){width:150px}
  .dbc{min-width:0!important}
  .dbt td:nth-child(4) .dbn{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .dbt td:nth-child(4){overflow-wrap:anywhere}
  /* programação: filtros fixos mais baixos (ocupam menos a tela) e os botões de cada ordem numa linha só, embaixo do produto */
  .ofil.pfil{padding:10px 14px;gap:8px}
  .ofil .pf-lin{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
  .ofil .pf-l button{padding-top:0;padding-bottom:0}
  .ofil .pf-r3{padding-top:8px;gap:8px 10px;flex-wrap:wrap}
  .ofil .seg button{height:30px;padding:0 10px;font-size:12.5px}
  .ofil .srch .txt{height:38px}
  @media (min-width:1241px){
    body:not(.tv) .orow{grid-template-columns:124px 78px minmax(0,1fr) 84px 110px 84px 150px;row-gap:6px;padding:9px 8px}
    body:not(.tv) .orow > .ofp{grid-column:3/-1;grid-row:2;justify-content:flex-start;flex-wrap:wrap;gap:6px}
    body:not(.tv) .orow.ohead > span:last-child{display:none}
    body:not(.tv) .orow .ofp .fpbtn{height:28px;white-space:nowrap}
    body:not(.tv) .orow .ofp .prisel{height:28px}
    body:not(.tv) .orow .od{grid-row:1 / span 2;align-self:center}
    body:not(.tv) .orow .on{grid-row:1 / span 2}
  }
  @media (max-width:860px){ .mdw{max-width:100%;overflow-x:hidden} .mdw .mdh{flex-wrap:wrap} .mdw .megrid{grid-template-columns:minmax(0,1fr)!important} }
  .dbt th{white-space:normal;line-height:1.2;letter-spacing:.02em!important;font-size:10.5px!important}
  .dbt td.dbc small,.dbt td.dbc b{display:block!important}
</style>`);
/* calendário: cabeçalho curto, barra de semana/linhas fixa no topo ao rolar e cartões mais fáceis de ler */
{ const _vc=vCalendario; vCalendario=function(){ let h=_vc.apply(this,arguments);
    h=h.replace(/(<h1>Calendário<\/h1><div class="sub">)[^<]*(<\/div>)/,(m,a,b)=>a+(calRO()?'Consulta da programação.':'Arraste a ordem para outro dia ou linha. No celular, toque na ordem.')+b);
    /* feriado: a coluna do dia fica cinza */
    try{ const C=S.cal, nd=C.sab?6:5, fs=[...Array(nd)].map((_,i)=>addDias(C.ini,i)).map((d,i)=>feriadoDe(d)?i:-1).filter(i=>i>=0);
      if(fs.length&&!C.soAtras) h+=`<style>${fs.map(i=>`.calgrid > div:nth-child(${nd+1}n+${i+2})`).join(',')}{background:repeating-linear-gradient(135deg,var(--surface-2),var(--surface-2) 6px,transparent 6px,transparent 12px)}</style>`; }catch(e){}
    return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style>
  @media (min-width:861px){ .caltool{position:sticky;top:118px;z-index:4;box-shadow:0 6px 16px rgba(26,26,26,.10)} }
  .caltool{padding:10px 14px;gap:8px}
  .caltool .txt{height:36px}
  .caltool .chip{height:32px}
  .ch{font-size:12.5px;color:var(--ink-2)}
  .ch.hoje{background:var(--teal-wash);color:var(--teal-strong)}
  .cc{min-height:56px}
  .ccard{font-size:12.5px;padding:7px 9px;box-shadow:0 1px 2px rgba(26,26,26,.06)}
</style>`);
/* ordem do dia (ou de amanhã): o PCP manda direto para a fila do almox */
{ const _ea=envAlmBtn; envAlmBtn=function(o){ return String(_ea.apply(this,arguments)).replace('Enviado ao almox</button>','Mandar p/ fila do almox</button>').replace('title="Marcar o rancho','title="Mandar para a Fila do almox: marca o rancho'); }; }
/* Visão do gestor: o quadro de paradas abre a Manutenção (a tela de Paradas saiu da Produção) */
{ const _vg=vGestao; vGestao=function(){ const h=_vg.apply(this,arguments); return viewOk('paradas')?h:String(h).replace(/data-go="paradas"/g,'data-go="manch"'); }; }

/* ===================== CELULAR (pedidos de 13/10 madrugada) =====================
   Programação: cada ordem vira um cartão legível (nº e situação em cima, produto inteiro, andamento, botões embaixo).
   Calendário: no celular sempre por dia (lista), com uma barra de filtros pequena (semana, linha, busca em "Filtros"). */
document.head.insertAdjacentHTML('beforeend',`<style>
@media (max-width:640px){
  body:not(.tv) .orow{grid-template-columns:auto minmax(0,1fr) auto;gap:6px 10px;padding:12px 10px;margin:0 -6px;align-items:start}
  body:not(.tv) .orow .od{grid-column:1;grid-row:1;display:flex;align-items:center;gap:6px;flex-wrap:wrap;align-self:center}
  body:not(.tv) .orow .od .oseq button{display:none}
  body:not(.tv) .orow .od small,body:not(.tv) .orow .od .est{font-size:11.5px}
  body:not(.tv) .orow .on{grid-column:2;grid-row:1;align-self:center}
  body:not(.tv) .orow .on b{font-size:15px}
  body:not(.tv) .orow .os{grid-column:3;grid-row:1;align-items:flex-end;flex-direction:column;display:flex;gap:3px}
  body:not(.tv) .orow .op{grid-column:1/-1;grid-row:2}
  body:not(.tv) .orow .op b{display:block;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;font-size:14.5px;line-height:1.35}
  body:not(.tv) .orow .op small{display:block;white-space:normal;line-height:1.5;margin-top:3px}
  body:not(.tv) .orow .nr[data-l="Total"]{display:none}
  body:not(.tv) .orow .nr[data-l="Entregue"]{grid-column:1/3;grid-row:3;text-align:left}
  body:not(.tv) .orow .nr[data-l="Entregue"] .bar{max-width:none}
  body:not(.tv) .orow .nr[data-l="Pendente"]{grid-column:3;grid-row:3;text-align:right}
  body:not(.tv) .orow > .ofp{grid-column:1/-1;grid-row:4;justify-content:flex-start;gap:6px}
  body:not(.tv) .orow .ofp .fpbtn,body:not(.tv) .orow .ofp .prisel{height:34px}
  body:not(.tv) .orow .ofp .pmxadd span{white-space:nowrap}
  .ogrp{flex-wrap:wrap;row-gap:4px}
  .ofil .pf-r3{flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;padding-top:8px}
  .ofil .pf-r3 .pf-lab,.ofil .pf-r3 .pf-res,.ofil .pf-r3 > span[style*="inline-flex"]{display:none!important}
  .ofil .pf-r1{flex-wrap:wrap}
  .ofil .pf-r1 .seg{overflow-x:auto;max-width:100%}
  .pg-acts .btn{height:38px}
}
/* calendário no celular */
.calm{display:flex;flex-direction:column;gap:10px;padding:12px 14px}
.calm .cm1{display:flex;align-items:center;gap:8px}
.calm .cm1 .sem{flex:1;text-align:center;font-weight:800;font-size:15px;line-height:1.2}
.calm .cm1 .btn{height:40px;min-width:40px;padding:0 12px}
.calm .cm2{display:flex;gap:8px;align-items:center}
.calm .cm2 select{flex:1;height:40px}
.calm details summary{list-style:none;cursor:pointer;height:40px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;border:1.5px solid var(--line);border-radius:10px;font-weight:700;font-size:13.5px;color:var(--teal-strong);background:var(--surface)}
.calm details summary::-webkit-details-marker{display:none}
.calm details[open]{flex-basis:100%}
.calm .cmf{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.calm .cmf .chips{display:flex;gap:6px;flex-wrap:wrap}
.calhead .btn{height:38px;padding:0 12px;font-size:13px}
@media (max-width:700px){ .calhead .sub{display:none} .calhead > div:last-child{flex-direction:row!important;flex-wrap:nowrap!important;gap:8px!important} }
.cal-lst{display:grid;gap:14px}
.cal-lst > section.card{padding:0;overflow:hidden;border-radius:16px;border:1px solid var(--line)}
.cal-lst > section.card > .head{margin:0!important;padding:12px 16px;background:var(--surface-2);border-bottom:1px solid var(--line)}
.cal-lst > section.card > .head h2{font-size:17px!important;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cal-lst > section.cal-hj{border:2px solid var(--teal)}
.cal-lst > section.cal-hj > .head{background:var(--teal-strong);color:#fff}
.cal-lst > section.cal-hj > .head h2,.cal-lst > section.cal-hj > .head .sub{color:#fff!important}
.cal-lst > section.card > .label,.cal-lst > section.card > .sub{margin-left:16px!important;margin-right:16px!important}
.cal-lst > section.card > .label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--teal-strong)}
.cal-lst > section.card > .label::before{content:"";width:4px;height:14px;border-radius:2px;background:var(--teal)}
.cal-lst .cal-lg{padding:0 12px 4px}
.cal-lst .cal-lg:last-child{padding-bottom:14px}
.cal-lst > section.card > .sub:last-child{padding-bottom:14px}
.cal-lst .ccard{font-size:14px;padding:10px 12px;border-radius:12px;border-left:5px solid var(--teal)}
.cal-lst .ccard.st-ok{border-left-color:var(--ok)} .cal-lst .ccard.st-warn{border-left-color:var(--warn)} .cal-lst .ccard.st-crit{border-left-color:var(--crit)}
.cal-lst .ccard small{font-size:12.5px}
.cal-lst .cal-fer{color:inherit;opacity:.85}
</style>`);
{ const _vc2=vCalendario; vCalendario=function(){ let h=_vc2.apply(this,arguments);
    h=h.replace('<div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Calendário','<div class="head calhead"><div><div class="eyebrow">PRODUÇÃO</div><h1>Calendário');
    if(window.innerWidth>=700||S.cal.soAtras) return h;
    const C=S.cal, LT=linhasOrd(), sem=(h.match(/<span class="sem num">([^<]*)<\/span>/)||[])[1]||'', esf=s=>String(s).replace(/"/g,'&quot;');
    const mais=[C.busca?1:0,C.soAtras?1:0,C.sab?1:0,C.fech?1:0].reduce((a,b)=>a+b,0);
    const bar=`<section class="card calm">
      <div class="cm1"><button class="btn sec" data-act="c-sem" data-v="-7" aria-label="Semana anterior">‹</button><span class="sem num">${sem}</span><button class="btn sec" data-act="c-sem" data-v="7" aria-label="Próxima semana">›</button><button class="btn ${C.ini===segundaStr(new Date())?'':'sec'}" data-act="c-hoje">Hoje</button></div>
      <div class="cm2"><select class="txt" id="c-linsel" aria-label="Linha"><option value="todas">Todas as linhas</option>${LT.map(l=>`<option value="${esf(l)}" ${C.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select>
        <details ${C.busca?'open':''}><summary>Filtros${mais?' · '+mais:''}</summary></details></div>
      <div class="cmf" ${C.busca||S._calmAb?'':'hidden'} id="c-cmf"><input class="txt" id="c-busca" type="search" placeholder="Nº da ordem, código ou produto" value="${esc(C.busca||'')}" aria-label="Buscar ordem">
        <label class="sub" style="margin:0;display:flex;align-items:center;gap:8px;font-size:13px">Ir para <input type="date" class="txt" id="c-data" value="${esc(C.ini)}" style="flex:1"></label>
        <div class="chips"><button class="chip" data-act="c-atras" aria-pressed="${!!C.soAtras}">Atrasadas</button><button class="chip" data-act="c-sab" aria-pressed="${!!C.sab}">Sábado</button><button class="chip" data-act="c-fech" aria-pressed="${!!C.fech}">Encerradas</button></div></div></section>`;
    return h.replace(/<section class="card caltool">[\s\S]*?<\/section>/,bar); }; }
document.addEventListener('click',ev=>{ const s=ev.target.closest&&ev.target.closest('.calm details summary'); if(!s) return; ev.preventDefault(); S._calmAb=!S._calmAb; const f=document.getElementById('c-cmf'); if(f) f.hidden=!S._calmAb; });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||t.id!=='c-linsel') return; const b=document.createElement('button'); b.dataset.act='c-linha'; b.dataset.v=t.value; b.style.display='none'; document.body.appendChild(b); b.click(); b.remove(); });
/* ===== pedido de 13/10 (tarde): Monitor do rancho vira módulo próprio; quem é do almox não vê Telas de TV ===== */
(function(){
  const pmx=MODS.find(x=>x.id==='premix'); if(pmx) pmx.views=pmx.views.filter(v=>v!=='dbmon');
  if(!MODS.some(x=>x.id==='monitor')){ const i=MODS.findIndex(x=>x.id==='premix'); MODS.splice(i<0?MODS.length:i+1,0,{id:'monitor',nome:'Monitor do rancho',ic:'tv',views:['dbmon']}); }
  try{ if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.monitor) EQ_MOD.monitor=['tv','Monitor do rancho']; }catch(e){}
})();
/* vale também quando a administradora usa "Ver como" o cargo; não vale para cargos de TV, gestor e PCP (análise) */
function almoxSemTv(){ const p=acsP(); if(!p||p.tudo) return false; const ms=p.mods||[]; return ms.some(m=>m==='almox'||m==='premix')&&!ms.some(m=>m==='tv'||m==='gestor'||m==='analise'); }
{ const _mv=modsVis; modsVis=function(){ const xs=_mv.apply(this,arguments); return almoxSemTv()?xs.filter(m=>m.id!=='telas'):xs; }; }
{ const _vo=viewOk; viewOk=function(v){ if((v==='tvapres'||v==='tvfab')&&almoxSemTv()) return false; return _vo.apply(this,arguments); }; }
/* ===== pedidos de 13/10 (fim da tarde): telas numa janela separada, para arrastar para a segunda tela, e a logo nas telas ===== */
/* Telas que abrem em outra janela: monitor do rancho, TV da fábrica, apresentação, painel da manutenção e tela da linha.
   ?janela=<tela> abre a janela sem menu e sem cabeçalho, presa na tela (mesmo login). */
const JAN_TELAS={dbmon:'Monitor do rancho',tvfab:'TV da fábrica',tvapres:'Apresentação',manmon:'Painel da manutenção',linhatv:'Tela da linha'};
const JAN_V=(()=>{ const m=location.search.match(/[?&]janela=([a-z]+)/); if(!m) return ''; return m[1]==='monitor'?'dbmon':(JAN_TELAS[m[1]]?m[1]:''); })();
const JAN_MON=!!JAN_V;
function janAbrir(v){ const u=location.href.split(/[?#]/)[0]+'?janela='+(v==='dbmon'?'monitor':v);
  const w=window.open(u,'colafix_'+v,'popup=yes,width='+Math.min(1600,screen.availWidth||1280)+',height='+Math.min(900,screen.availHeight||800));
  if(!w){ toast('O navegador bloqueou a janela. Libere as janelas (pop-up) para este site e tente de novo.'); return; } try{ w.focus(); }catch(e){} }
function janLogo(){ return (document.querySelector('.brand img')||{}).src||''; }
/* botão "Abrir em outra janela": no canto da tela (computador), menos na própria janela */
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ const v=S.view; let b=document.getElementById('jan-bt');
    const quer=!JAN_MON&&JAN_TELAS[v]&&window.innerWidth>=900&&!document.body.classList.contains('tv')&&!document.fullscreenElement;
    if(quer){ if(!b){ b=document.createElement('button'); b.id='jan-bt'; b.className='btn sec'; b.type='button'; document.body.appendChild(b); } b.dataset.v=v; b.innerHTML='⧉ Abrir em outra janela'; b.title='Abre '+JAN_TELAS[v].toLowerCase()+' numa janela separada, para arrastar para a outra tela'; }
    else if(b) b.remove();
    /* logo nas telas que ainda não tinham */
    const lg=janLogo(); if(lg){ if(v==='manmon'){ const h=document.querySelector('#view .mdh'); if(h&&!h.querySelector('.mdlogo')) h.insertAdjacentHTML('afterbegin','<img class="mdlogo" src="'+lg+'" alt="Colafix">'); }
      if(v==='linhatv'){ const h=document.querySelector('#view .ltv-h > div'); if(h&&!h.querySelector('.jan-logo')) h.insertAdjacentHTML('afterbegin','<img class="jan-logo" src="'+lg+'" alt="Colafix">'); } }
  }catch(e){} return x; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('#jan-bt,[data-act="jan-tela"]'); if(!b) return;
  if(b.id==='jan-bt'){ janAbrir(b.dataset.v); return; }
  try{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }catch(e){} });
if(JAN_MON){
  /* a janela não mexe na tela que a janela principal abre ao recarregar */
  let ant=null; try{ ant=localStorage.getItem('colafix.monitor'); }catch(e){}
  document.title=JAN_TELAS[JAN_V]+' · Colafix';
  const tenta=(n)=>{ if(S.acs&&S.acs.pronto&&acsP()){ if(!viewOk(JAN_V)){ toast('Você não tem acesso a esta tela.'); return; } go(JAN_V); try{ if(ant===null) localStorage.removeItem('colafix.monitor'); else localStorage.setItem('colafix.monitor',ant); }catch(e){} return; } if(n<240) setTimeout(()=>tenta(n+1),500); };
  setTimeout(()=>tenta(0),300);
  /* fica sempre na mesma tela, sem menu e sem cabeçalho */
  { const _go=go; go=function(v){ if(v!==JAN_V&&S.view===JAN_V) return; return _go.apply(this,arguments); }; }
  { const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ document.body.classList.toggle('dbmon',S.view==='dbmon'); document.body.classList.add('jan-mon','jan-solo'); }catch(e){} return x; }; }
  { const _dm=dbMonitor; dbMonitor=function(){ return _dm.apply(this,arguments).replace(/<button class="mdsair"[^>]*>✕<\/button>/,'<button class="mdsair" data-act="jan-tela" title="Tela cheia">⛶</button>'); }; }
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') ev.stopImmediatePropagation(); },true);
  /* botão de tela cheia no canto, para as telas que não têm */
  setInterval(()=>{ try{ if(S.view===JAN_V&&JAN_V!=='dbmon'&&!document.getElementById('jan-fs')){ const b=document.createElement('button'); b.id='jan-fs'; b.dataset.act='jan-tela'; b.className='btn sec'; b.title='Tela cheia'; b.textContent='⛶'; document.body.appendChild(b); } }catch(e){} },1000);
}
document.head.insertAdjacentHTML('beforeend',`<style id="janmon-css">
#jan-bt{position:fixed;right:18px;bottom:18px;z-index:60;height:42px;box-shadow:0 4px 14px rgba(0,0,0,.15);white-space:nowrap}
#jan-fs{position:fixed;right:12px;bottom:12px;z-index:60;width:44px;height:44px;padding:0;font-size:20px;opacity:.55}#jan-fs:hover{opacity:1}
body.jan-solo .side,body.jan-solo .top,body.jan-solo .tabs,body.jan-solo nav,body.jan-solo .banner,body.jan-solo #tp-mais{display:none!important}
body.jan-solo .main,body.jan-solo #main{margin-left:0!important}body.jan-solo #view{max-width:none!important}
.jan-logo{display:block;height:34px;margin-bottom:6px}
</style>`);
