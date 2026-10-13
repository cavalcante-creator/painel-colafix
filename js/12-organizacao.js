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
