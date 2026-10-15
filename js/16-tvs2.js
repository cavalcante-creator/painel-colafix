/* Painel Colafix · 16-tvs2.js — fase 2 do novo layout das TVs: Monitor do almoxarifado, Silos, Manutenção,
   Calendário da TV e Detalhamento do Previsto × Realizado. Usa a base de 15-tvs.js (tvnPagina, tvnCab, tvnStat, tvnEtq, hm). */
"use strict";
const t1=v=>(Math.round((+v||0)*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const tvnLeg=xs=>xs.map(x=>{ const [c,t]=x.split(':'); return `<span class="tvn-lg"><i class="${c}"></i>${t}</span>`; }).join('');
const tvnGrid=(cards,linhas)=>{ const n=cards.length, cols=Math.max(1,Math.ceil(n/(linhas||2))); return `<div class="tvn-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${Math.min(linhas||2,n)||1},minmax(0,1fr))">${cards.join('')}</div>`; };

/* ---------- 3 · Monitor do almoxarifado ---------- */
function tvnRanSit(o){ const e=dbEt(o), agora=Date.now(), min=iso=>(agora-new Date(iso).getTime())/6e4;
  const n=e.ent?4:e.sep?3:e.env?2:o.rancho?1:0, atr=!e.ent&&((e.env&&!e.sep&&min(e.env)>DB_PRAZO.sep)||(o.rancho&&dbPrazoMin(o)<0));
  return {n,c:e.ent?'ok':atr?'crit':o.rancho?'info':'warn',t:e.ent?'ENTREGUE '+hm(e.ent):atr?'ATRASADO':e.sep?'SEPARADO':e.env?'ENVIADO':o.rancho?'ANEXADO':'SEM RANCHO',ent:!!e.ent,sep:!!e.sep&&!e.ent,env:!!e.env&&!e.sep}; }
function vTvnMon(){ const h=hojeStr(); let aSep=0,aEnt=0,atr=0,ent=0;
  const cards=linhasOrd().map(l=>{ const os=corLista(l,h).filter(x=>!x._pv); if(!os.length) return '';
    const rs=os.map(o=>({o,s:tvnRanSit(o)})); rs.forEach(({s})=>{ if(s.ent) ent++; else if(s.c==='crit') atr++; else if(s.sep) aEnt++; else if(s.env) aSep++; });
    const ne=rs.filter(r=>r.s.ent).length, crit=rs.some(r=>r.s.c==='crit');
    const lis=rs.sort((a,b)=>(a.s.ent?1:0)-(b.s.ent?1:0)).slice(0,3).map(({o,s})=>`<div class="tvn-ord${s.c==='crit'?' tvn-pisca':''}"><div class="tvn-oh"><div><b>OP ${esc(o.num||'')}</b><span>${esc(codigoDe(o))} · ${f0(+o.total||0)} ${esc(uA(o))}</span></div>${tvnEtq(s.c,s.t)}</div>
      <div class="tvn-et" role="img" aria-label="${s.n} de 4 etapas do rancho">${[0,1,2,3].map(i=>`<i class="${i<s.n?s.c:''}"></i>`).join('')}</div></div>`).join('');
    return `<section class="tvn-card" aria-label="${esc(l)}"><div class="tvn-ch"><h2>${esc(l)}</h2><span class="tvn-fr ${crit?'crit':ne===rs.length?'ok':''}">${ne} de ${rs.length} entregue${rs.length>1?'s':''}</span></div>${lis}${rs.length>3?`<span class="tvn-mut">+ ${rs.length-3} ordem(ns)</span>`:''}</section>`; }).filter(Boolean);
  const peds=(S.pedmat||[]).slice(0,3).map(p=>`<div class="tvn-ped${p.urgente?' tvn-pisca':''}">${tvnEtq(p.urgente?'crit':'warn',p.urgente?'URGENTE':'PEDIDO')}<div><b>${esc(p.linha||'')} · ${esc(p.item||p.descricao||p.codigo||'material')}</b><span>${esc(String(p.qtd||''))} ${esc(p.un||'')} · ${esc(p.porNome||p.nome||'')} · há ${pmIdade(p.em)}</span></div></div>`).join('');
  return tvnPagina('tvn-mon',tvnCab('Ranchos de hoje','Entrega na linha até <b>'+esc(dbHoraEnt())+'</b> · atualizado pelas marcações',tvnStat(aSep,'A SEPARAR')+tvnStat(aEnt,'A ENTREGAR')+tvnStat(atr,'ATRASADOS',atr?'crit':'')+tvnStat(ent,'ENTREGUES','ok'),'marcações do almoxarifado'),
    (peds?`<div class="tvn-peds"><div class="tvn-pedt"><b>Pedidos de material</b><span>${(S.pedmat||[]).length} aberto(s)</span></div>${peds}</div>`:'')+(cards.length?tvnGrid(cards,2):'<div class="tvn-vz grande">Nenhuma ordem com rancho hoje</div>'),
    tvnLeg(['ok:Entregue','info:Em andamento','warn:Sem rancho','crit:Atrasado'])+'<span class="tvn-mut">Barras: anexado · enviado · separado · entregue</span>'); }

/* ---------- 4 · Silos ---------- */
function tvnTanque(p,c){ const h=Math.max(0,Math.min(1,p))*230;
  return `<svg class="tvn-tq" viewBox="0 0 150 300" aria-hidden="true"><defs><clipPath id="tq${c}${Math.round(p*1000)}"><path d="M25 20h100v230l-35 35h-30l-35-35z"/></clipPath></defs><path d="M25 20h100v230l-35 35h-30l-35-35z" class="tq-v"/>
    <rect x="0" y="${(250-h).toFixed(0)}" width="150" height="${(h+40).toFixed(0)}" class="tq-f ${c}" clip-path="url(#tq${c}${Math.round(p*1000)})"/><path d="M25 20h100v230l-35 35h-30l-35-35z" class="tq-c"/><path d="M40 265l-12 30M110 265l12 30" class="tq-c"/></svg>`; }
function vTvnSil(){ const ult=saldoPorSilo(), L=S.cfg.limites||CFG_PADRAO.limites, nv=p=>p*100>=L.normal?{c:'ok',t:'NORMAL'}:p*100>=L.atencao?{c:'warn',t:'ATENÇÃO'}:{c:'crit',t:'CRÍTICO'};
  let crit=0, ultMed=''; const grupos=[...new Set((S.cfg.silos||[]).map(s=>s.grupo))], tot={};
  const gH=grupos.map(g=>{ const ss=(S.cfg.silos||[]).filter(s=>s.grupo===g); let t=0,cap=0;
    const cs=ss.map(s=>{ const u=ult[s.id]; cap+=+s.cap||0; if(!u) return `<section class="tvn-sil"><div class="tvn-ch"><h3>${esc(s.nome)}</h3>${tvnEtq('neu','SEM MEDIÇÃO')}</div>${tvnTanque(0,'neu')}<div class="tvn-sq"><b>—</b></div><span class="tvn-mut">de ${s.cap} t</span></section>`;
      t+=u.q; if(u.em>ultMed) ultMed=u.em; const p=s.cap?u.q/s.cap:0, n=nv(p); if(n.c==='crit') crit++;
      return `<section class="tvn-sil${n.c==='crit'?' tvn-pisca':''}" aria-label="${esc(s.nome)}"><div class="tvn-ch"><h3>${esc(s.nome)}</h3>${tvnEtq(n.c,n.t)}</div>${tvnTanque(p,n.c)}
        <div class="tvn-sq"><b>${t1(u.q)}</b><span>t</span><em class="${n.c}">${Math.round(Math.min(p,9.99)*100)}%</em></div><span class="tvn-mut">de ${s.cap} t · ${u.origem==='consumo'||u.origem==='estorno'?'pelos apontamentos':'medido '+(hojeStr(new Date(u.em))===hojeStr()?'hoje ':'em '+dm(hojeStr(new Date(u.em)))+' ')+hm(u.em)}</span></section>`; }).join('');
    tot[g]={t,cap}; const n=nv(cap?t/cap:0);
    return `<section class="tvn-sg" style="flex:${ss.length} 1 0"><div class="tvn-sgh"><h2>${esc(String(g).toUpperCase())}</h2><b class="${n.c}">${t1(t)} t</b><span>de ${cap} t</span></div><div class="tvn-sgs">${cs}</div></section>`; }).join('');
  let pc=null; if(leitPrecisa('prod')){ try{ pc=previsaoCimento(); }catch(e){} }
  const caminho=(S.cargas||[]).filter(c=>etapaCarga(c)===0), naFab=(S.cargas||[]).filter(c=>etapaCarga(c)===1);
  const info=(t,c)=>`<section class="tvn-inf"><h2>${t}</h2>${c}</section>`, ln=(v,t,c)=>`<div class="tvn-il"><b class="${c||''}">${v}</b><span>${t}</span></div>`;
  const infos=(pc?info('CIMENTO × PROGRAMAÇÃO',ln(t1(pc.estoque)+' t','de cimento nos silos')+ln(t1(pc.necessario)+' t',`necessários para as ${pc.nOrdens} ordens programadas`+(pc.falta>0?` · <b class="crit">faltam ${t1(pc.falta)} t</b>`:''),pc.falta>0?'crit':'')):'')
    +info('CARGAS DE CIMENTO',ln(caminho.length,'a caminho')+ln(naFab.length,'na fábrica, aguardando descarga'));
  const st=grupos.slice(0,2).map(g=>{ const n=nv(tot[g].cap?tot[g].t/tot[g].cap:0); return tvnStat(t1(tot[g].t)+' t',String(g).toUpperCase(),n.c); }).join('');
  return tvnPagina('tvn-pgsil',tvnCab('Silos','Cimento e areia · pelas medições e apontamentos',st+tvnStat(crit,'SILOS CRÍTICOS',crit?'crit':'')+tvnStat(caminho.length,'CARGA A CAMINHO'),ultMed?'última medição '+hm(ultMed):''),
    `<div class="tvn-sgr">${gH||'<div class="tvn-vz grande">Nenhum silo cadastrado</div>'}</div><div class="tvn-infs">${infos}</div>`,
    tvnLeg([`ok:Normal: ${L.normal}% ou mais`,`warn:Atenção: ${L.atencao}% a ${L.normal}%`,`crit:Crítico: abaixo de ${L.atencao}%`])); }

/* ---------- 5 · Manutenção ---------- */
function vTvnMan(){ const h=hojeStr(), agora=new Date().toISOString(); let ab=0,par=0,exe=0,conc=[];
  const xs=(S.chamados||[]).filter(c=>!manIgnorar(c));
  xs.forEach(c=>{ const e=manEtapas(c); if(e.co&&hojeStr(new Date(e.co.em))===h) conc.push({c,e}); });
  const cards=linhasOrd().map(l=>{ const abs=xs.filter(c=>(c.linha||'')===l&&!manFechada(c));
    abs.forEach(c=>{ const e=manEtapas(c); ab++; if(c.impacto==='parou') par++; if(e.as) exe++; });
    const parou=abs.some(c=>c.impacto==='parou');
    if(!abs.length){ const uc=conc.filter(z=>z.c.linha===l).sort((a,b)=>String(b.e.co.em).localeCompare(a.e.co.em))[0];
      return `<section class="tvn-card" aria-label="${esc(l)}"><div class="tvn-ch"><h2>${esc(l)}</h2>${tvnEtq('ok','OK')}</div><div class="tvn-okc"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.5l3 3 6-6.5"/></svg><b>Sem chamado aberto</b><span>${uc?'último concluído hoje '+hm(uc.e.co.em):''}</span></div></section>`; }
    const its=abs.slice(0,2).map(c=>{ const e=manEtapas(c), k=e.as?'info':c.impacto==='parou'?'crit':'warn', t=e.as?'EM EXECUÇÃO'+(e.as.tec?' · '+String(e.as.tec).split(' ')[0].toUpperCase():''):(c.status==='Aguardando peça'||/pe[cç]a/i.test(c.status||''))?'AGUARDANDO PEÇA':'AGUARDANDO TÉCNICO';
      return `<div class="tvn-ch2${c.impacto==='parou'&&!e.as?' crit':''}"><div class="tvn-oh"><b>${esc(c.numero?'OS-'+c.numero:'Chamado')}</b><span>${esc(c.equip||'')}</span></div><div class="tvn-def">${esc(c.defeito||'')}</div>
        <div class="tvn-oh">${tvnEtq(k,t)}<span class="${c.impacto==='parou'?'crit':''}">${c.impacto==='parou'?'máquina parada':c.impacto?'produção '+esc(c.impacto):''}</span></div><span class="tvn-mut">aberto às ${hm(e.ab.em)}</span></div>`; }).join('');
    return `<section class="tvn-card${parou?' tvn-pisca':''}" aria-label="${esc(l)}"><div class="tvn-ch"><h2>${esc(l)}</h2>${tvnEtq(parou?'crit':'warn',parou?'MÁQUINA PARADA':abs.length+' CHAMADO'+(abs.length>1?'S':''))}</div>${its}${abs.length>2?`<span class="tvn-mut">+ ${abs.length-2} chamado(s)</span>`:''}</section>`; });
  const cc=conc.sort((a,b)=>String(b.e.co.em).localeCompare(a.e.co.em)).slice(0,4).map(z=>`<span class="tvn-lg"><i class="ok"></i><b>${hm(z.e.co.em)}</b> ${esc(z.c.linha||'')} · ${esc(z.c.defeito||z.c.equip||'')}</span>`).join('');
  return tvnPagina('tvn-man',tvnCab('Manutenção','Chamados de hoje · pelos registros dos técnicos',tvnStat(ab,'ABERTOS')+tvnStat(par,'MÁQUINA PARADA',par?'crit':'')+tvnStat(exe,'EM EXECUÇÃO')+tvnStat(conc.length,'CONCLUÍDOS HOJE','ok'),''),
    tvnGrid(cards,2),`<b class="tvn-rt">CONCLUÍDOS HOJE</b>${cc||'<span class="tvn-mut">nenhum ainda</span>'}`); }

/* ---------- 6 · Calendário da TV (só leitura; o Calendário da Produção não muda) ---------- */
function tvnViraH(){ const v=+((S.cfg||{}).tvVira); return v>=12&&v<=22?v:16; } /* horário em que o calendário da TV passa a destacar amanhã (config/geral.tvVira) */
function vTvnCal(){ const h=hojeStr(), hr=new Date().getHours(), util=d=>anlUtil(d);
  let foco=h; if(!util(foco)||hr>=tvnViraH()) foco=tvfProxUtil(h); let ant=addDias(foco,-1); for(let g=0;g<8&&!util(ant);g++) ant=addDias(ant,-1);
  const d2=tvfProxUtil(foco), d3=tvfProxUtil(d2), cols=[ant,foco,d2,d3], nomeD=d=>new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase()+' '+dm(d);
  const pend=x=>x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueDe(x)), cod=x=>x._pv?(x.codigo||codigoDe(x)):codigoDe(x), qt=x=>x._pv?(+x.qtd||0):(+x.total||0);
  const nome=x=>{ const n=String(x.produto||x.descricao||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,'').trim(); return n||((typeof itemDe==='function'&&itemDe(cod(x)))||{}).descricao||''; };
  const lin=(x,ok)=>`<div class="tvn-cx">${ok?'<b class="okm">✓</b> ':''}<b>${esc(cod(x))}</b> <span class="tvn-pn">${esc(nome(x))}</span> <span class="tvn-pq">· ${f0(qt(x))}</span></div>`;
  let nSem=0, nConc=0, nAtr=0, nFoco=0;
  const ran=x=>{ const m=x._pv?null:tvMat(x); if(!m) return ''; const c=/linha/.test(m.t)?'ok':/separ|caminho/.test(m.t)?'info':'warn'; return `<span class="tvn-rs ${c}"><i></i>${c==='ok'?'rancho entregue':c==='info'?'rancho separado':'sem rancho'}</span>`; };
  const rows=linhasOrd().map(l=>{ const cap=capDe(l);
    const cel=cols.map((d,i)=>{ const xs=corLista(l,d); nSem+=xs.length; if(i===1) nFoco+=xs.length;
      if(i===0) return `<div class="tvn-cc pas">${xs.slice(0,2).map(x=>lin(x,pend(x)<=0)).join('')||'<span class="tvn-mut">—</span>'}</div>`;
      if(i===1){ const P=(corAtiva(l)?corAvaliar(xs).passos:[])||[], ab=xs.map((x,j)=>({x,p:P[j]})).filter(z=>pend(z.x)>0), cur=ab[0];
        xs.forEach(x=>{ if(pend(x)<=0) nConc++; else if(!x._pv&&ordAtras(x,h)) nAtr++; });
        if(!cur) return `<div class="tvn-cc foco">${xs.length?'<span class="tvn-mut">✓ tudo produzido</span>':'<span class="tvn-mut">nada programado</span>'}</div>`;
        const x=cur.x, e=x._pv?0:entregueDe(x), tot=qt(x), pc=tot?Math.min(100,e/tot*100):0, atr=!x._pv&&ordAtras(x,h), k=atr?'crit':e>0?'info':'neu', nx=ab[1];
        const troca=nx&&nx.p&&nx.p.t?' <b class="warnm">↻ troca de cor</b>':'';
        return `<div class="tvn-cc foco${atr?' tvn-pisca':''}"><div class="tvn-oh"><div class="tvn-cx"><b>${esc(cod(x))}</b> <span class="tvn-pn">${esc(nome(x))}</span> <span class="tvn-pq">· ${f0(e)} de ${f0(tot)}</span></div>${tvnEtq(k,atr?'ATRASADA':e>0?'EM PRODUÇÃO':'A INICIAR')}</div><div class="tvn-bar"><i class="${k}" style="width:${pc}%"></i></div>${nx?`<div class="tvn-mut">A seguir: <b>${esc(cod(nx.x))}</b> ${esc(nome(nx.x))} · ${f0(pend(nx.x))} ${ran(nx.x)}${troca}</div>`:''}</div>`; }
      return `<div class="tvn-cc">${xs.slice(0,2).map(x=>`<div class="tvn-cx2">${lin(x)}${ran(x)}</div>`).join('')||'<span class="tvn-mut">—</span>'}</div>`; }).join('');
    const tF=corLista(l,foco).reduce((a,x)=>a+qt(x),0), pc=cap?Math.round(tF/cap*100):null;
    return `<div class="tvn-cl"><b>${esc(l)}</b>${pc!=null?`<span class="${pc>100?'warn':''}">${foco===h?'hoje':'amanhã'} ${pc}% da capacidade</span>`:''}</div>${cel}`; }).join('');
  const hd=cols.map((d,i)=>`<div class="tvn-ch3${i===1?' foco':''}">${i===1?(foco===h?'HOJE':'AMANHÃ')+' · ':''}${nomeD(d)}${i===1&&foco===h?` <span>às ${tvnViraH()}:00 o destaque passa para amanhã</span>`:''}</div>`).join('');
  return tvnPagina('tvn-cal',tvnCab('Calendário da semana','Programação do PCP · '+dm(cols[0])+' a '+dm(cols[3]),tvnStat(nFoco,foco===h?'ORDENS HOJE':'ORDENS AMANHÃ')+tvnStat(nConc,'CONCLUÍDAS','ok')+tvnStat(nAtr,'ATRASADAS',nAtr?'crit':''),''),
    `<div class="tvn-calg" style="grid-template-rows:auto repeat(${linhasOrd().length},minmax(0,1fr))"><div></div>${hd}${rows}</div>`,tvnLeg(['ok:Concluída / rancho entregue','info:Em produção / rancho separado','warn:Sem rancho / troca de cor','crit:Atrasada'])); }

/* ---------- 7 · Detalhamento do Previsto × Realizado (3 visões que se alternam) ---------- */
const TVND={v:0,l:0,t0:Date.now()};
function tvnDetDados(){ if(!S.rit.cp) S.rit.cp=hojeStr().slice(0,7); let D=null; try{ D=ritDados(S.rit.cp,S.rit.fonte); }catch(e){} return D; }
function tvnRealLI(D,l,c){ let r=0; for(const d in D.R){ const a=(D.R[d]||{})[l]; if(a&&a[c]) r+=a[c]; } return r; }
function vTvnDet(){ const D=tvnDetDados(); if(!D) return tvnPagina('tvn-det',tvnCab('Detalhamento','Previsto × Realizado','',''),'<div class="tvn-vz grande">Aguardando a previsão do mês e os apontamentos…</div>','');
  if(Date.now()-TVND.t0>15000){ TVND.v=(TVND.v+1)%3; if(TVND.v===0) TVND.l++; TVND.t0=Date.now(); }
  const LS=D.LS.filter(l=>ritStats(D,{l}).T>0), k0=ritStats(D,{}), ef=k0.T?k0.pa/k0.T*100:0, kk=p=>p>=ef?'ok':p>=ef*0.8?'warn':'crit', nota=(TVND.v+1)+' de 3 visões · troca sozinha';
  if(TVND.v===0&&LS.length){ const l=LS[TVND.l%LS.length], k=ritStats(D,{l});
    const its=D.its.filter(x=>x.dv[l]).map(x=>{ const pv=x.prev*x.dv[l], ap=tvnRealLI(D,l,x.c); return {c:x.c,n:x.nome||'',pv,ap,f:Math.max(0,pv-ap),p:pv?ap/pv*100:0}; }).filter(x=>x.pv>0).sort((a,b)=>b.f-a.f).slice(0,8);
    const th=`<div class="tvn-dr th"><span>ITEM</span><span>PRODUTO</span><span class="r">PREVISTO</span><span class="r">APONTADO</span><span class="r">FALTA</span><span>% DA META · ▮ DEVERIA</span></div>`;
    const rs=its.map(x=>{ const c=kk(x.p); return `<div class="tvn-dr"><b>${esc(x.c)}</b><span class="tvn-mut el">${esc(x.n)}</span><b class="r">${ritQ(x.pv,1)}</b><b class="r">${ritQ(x.ap,1)}</b><b class="r ${c==='ok'?'':c}">${ritQ(x.f,1)}</b><div class="tvn-dp"><b class="${c}">${Math.round(x.p)}%</b><div class="tvn-bar m"><i class="${c}" style="width:${Math.min(100,x.p)}%"></i><em style="left:${Math.min(100,ef)}%"></em></div></div></div>`; }).join('');
    const p=k.T?Math.round(k.ra/k.T*100):0;
    return tvnPagina('tvn-det',tvnCab(esc(l)+' · itens do mês','Detalhamento do Previsto × Realizado · ordenado pelo que mais falta',tvnStat(ritQ(k.T,k.kg),'META')+tvnStat(ritQ(k.ra,k.kg),'APONTADO')+tvnStat(ritQ(Math.max(0,k.sal),k.kg),'FALTA',k.sal>0?'crit':'ok')+tvnStat(p+'%','DA META',kk(p)),nota),`<div class="tvn-dt">${th}${rs}</div>`,'Barra: apontado do item · ▮ onde deveria estar hoje'); }
  if(TVND.v===1||!LS.length){ const dias=D.dias, h=D.h;
    const hd=`<div></div>${dias.map(d=>`<div class="tvn-dd${d===h?' hj':''}">${+d.slice(8)}${d===h?'<br>hoje':''}</div>`).join('')}<div class="tvn-dd">MÊS</div>`;
    let abaixo=0, ok=0; const rows=LS.map(l=>{ const s=ritSerie(D,{l}); let sp=0, sr=0;
      const cs=s.map(x=>{ if(x.d>h||(D.cut&&x.d>D.cut&&x.d!==h)) return '<div class="tvn-q fut"></div>'; if(x.d===h&&x.r<=0) return '<div class="tvn-q hj">em curso</div>';
        sp+=x.p; sr+=x.r; const p=x.p?Math.round(x.r/x.p*100):0, c=p>=100?'ok':p>=80?'warn':'crit'; return `<div class="tvn-q ${c}">${p}%</div>`; }).join('');
      const m=sp?Math.round(sr/sp*100):0, c=m>=100?'ok':m>=80?'warn':'crit'; if(c==='ok') ok++; else abaixo++;
      return `<div class="tvn-cl"><b>${esc(l)}</b></div>${cs}<div class="tvn-q mes ${c}">${m}%</div>`; }).join('');
    return tvnPagina('tvn-det',tvnCab('Apontado por dia','Cada quadrado: o apontado da linha no dia ÷ a meta do dia',tvnStat(k0.du+'/'+k0.n,'DIA ÚTIL')+tvnStat(abaixo,'LINHAS ABAIXO',abaixo?'crit':'')+tvnStat(ok,'NA META OU ACIMA','ok'),nota),
      `<div class="tvn-dg" style="grid-template-columns:200px repeat(${dias.length},minmax(0,1fr)) 96px;grid-template-rows:auto repeat(${LS.length},minmax(0,1fr))">${hd}${rows}</div>`,tvnLeg(['ok:100% ou mais da meta do dia','warn:80% a 99%','crit:abaixo de 80%'])); }
  const COR=['#3F6F93','#3C8A63','#AD8432','#6B5B95','#8C6D46','#5B8A8C','#9A5A6E','#55666F'], cl=l=>COR[D.LS.indexOf(l)%COR.length];
  const its=D.its.map(x=>{ const pv=Object.keys(x.dv).reduce((a,l)=>a+x.prev*x.dv[l],0), por=Object.keys(x.dv).map(l=>({l,r:tvnRealLI(D,l,x.c)})).filter(z=>z.r>0), ap=por.reduce((a,z)=>a+z.r,0); return {c:x.c,n:x.nome||'',pv,ap,f:Math.max(0,pv-ap),por}; }).filter(x=>x.pv>0&&x.f>0).sort((a,b)=>b.f-a.f);
  const rs=its.slice(0,5).map(x=>{ const p=x.pv?x.ap/x.pv*100:0, c=kk(p);
    return `<div class="tvn-ir"><div class="tvn-oh"><div><b>${esc(x.c)}</b> <span>${esc(x.n)}</span></div><div class="tvn-irn"><span>previsto <b>${ritQ(x.pv,1)}</b></span><span>falta <b class="${c==='ok'?'':c}">${ritQ(x.f,1)}</b></span><b class="${c}">${Math.round(p)}%</b></div></div>
      <div class="tvn-st2">${x.por.map(z=>`<i style="width:${(z.r/x.pv*100).toFixed(1)}%;background:${cl(z.l)}"></i>`).join('')}</div><div class="tvn-chs">${x.por.map(z=>`<span><i style="background:${cl(z.l)}"></i>${esc(z.l)} <b>${ritQ(z.r,1)}</b></span>`).join('')||'<span class="tvn-mut">ainda sem apontamento</span>'}</div></div>`; }).join('');
  const tP=its.reduce((a,x)=>a+x.pv,0), tF=its.reduce((a,x)=>a+x.f,0);
  return tvnPagina('tvn-det',tvnCab('Itens que mais faltam','Em quais linhas cada item foi feito e quanto falta no mês',tvnStat(its.length,'ITENS COM FALTA',its.length?'crit':'')+tvnStat((tP?Math.round(tF/tP*100):0)+'%','DA PREVISÃO A FAZER'),nota),`<div class="tvn-irs">${rs||'<div class="tvn-vz grande">Nenhum item com falta</div>'}</div>`,'Barra colorida: quanto cada linha já fez do item'); }

/* ---------- registro ---------- */
[['tvnmon','Monitor do almoxarifado (TV)','producao',vTvnMon],['tvnsil','Silos (TV)','silos',vTvnSil],['tvnman','Manutenção (TV)','manut',vTvnMan],['tvncal','Calendário (TV)','producao',vTvnCal],['tvndet','Detalhamento (TV)','analise',vTvnDet]].forEach(([v,n,m,f])=>{
  VIEWS[v]={nome:n,ic:'tv',mob:n.replace(' (TV)','')}; CRUMB[v]=n; const M=MODS.find(x=>x.id===m); if(M&&!M.views.includes(v)) M.views.push(v); S.extViews=S.extViews||{}; S.extViews[v]=f; });
{ const _sr=spRota, F={tvnmon:vTvnMon,tvnsil:vTvnSil,tvnman:vTvnMan,tvncal:vTvnCal,tvndet:vTvnDet}; spRota=function(v){ return F[v]?F[v]():_sr.apply(this,arguments); }; }
APR_TELAS.forEach(t=>{ if(t.k==='monitor') t.v='tvnmon'; if(t.k==='silos'){ t.v='tvnsil'; t.on=true; } if(t.k==='silosver') t.on=false; if(t.k==='manut') t.v='tvnman'; if(t.k==='cal') t.v='tvncal'; });
if(!APR_TELAS.some(t=>t.k==='detalhe')){ const i=APR_TELAS.findIndex(t=>t.k==='ritmo'); APR_TELAS.splice(i<0?APR_TELAS.length:i+1,0,{k:'detalhe',v:'tvndet',nome:'Detalhamento do Previsto × Realizado',d:'Por linha (itens), por dia (apontado ÷ meta do dia) e por item (em quais linhas). Troca sozinha.',cor:'#3F6F93',on:true}); }
setInterval(()=>{ if(S.view==='tvndet'&&Date.now()-TVND.t0>15000) rerenderSeguro(); },1000);

document.head.insertAdjacentHTML('beforeend',`<style id="tvn2-css">
.tvn-mut{font-size:16px;color:var(--tx2)}
.tvn .tvn-etq{color:#FFFFFF!important;font-size:15px!important;white-space:nowrap}.tvn-st b{white-space:nowrap}.tvn-mut.el{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tvn .crit{color:var(--crit)}.okm{color:var(--ok)}.warnm{color:var(--warn)}
.tvn-oh{display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0}.tvn-oh>div{min-width:0}.tvn-oh b{font-size:24px}.tvn-oh span{font-size:18px;color:var(--tx2);white-space:nowrap}
.tvn-oh>div>span{display:block;overflow:hidden;text-overflow:ellipsis}
.tvn-ord{border:1px solid var(--linha);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:9px}
.tvn-et{display:flex;gap:6px}.tvn-et i{flex:1;height:8px;border-radius:4px;background:var(--vazio)}.tvn-et i.ok{background:var(--ok)}.tvn-et i.info{background:var(--info)}.tvn-et i.warn{background:var(--warn)}.tvn-et i.crit{background:var(--crit)}
.tvn-fr{font-size:19px;font-weight:600;color:var(--tx2);white-space:nowrap}.tvn-fr.ok{color:var(--ok)}.tvn-fr.crit{color:var(--crit)}
.tvn-peds{display:flex;gap:14px;align-items:stretch}.tvn-pedt{width:200px;flex:none;display:flex;flex-direction:column;justify-content:center}.tvn-pedt b{font-size:24px}.tvn-pedt span{font-size:17px;color:var(--tx2)}
.tvn-ped{flex:1;min-width:0;display:flex;align-items:center;gap:14px;background:var(--card);box-shadow:var(--sombra);border:1px solid var(--linha);border-radius:14px;padding:12px 18px}.tvn-ped div{min-width:0}.tvn-ped b{display:block;font-size:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tvn-ped span{font-size:16px;color:var(--tx2)}
.tvn-sgr{flex:1;min-height:0;display:flex;gap:20px}.tvn-sg{display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0}.tvn-sgh{display:flex;align-items:baseline;gap:14px}.tvn-sgh h2{margin:0;font-size:24px;font-weight:800;letter-spacing:.08em;color:var(--tx2)}.tvn-sgh b{font-size:30px}.tvn-sgh b.ok{color:var(--ok)}.tvn-sgh b.warn{color:var(--warn)}.tvn-sgh b.crit{color:var(--crit)}.tvn-sgh span{font-size:19px;color:var(--tx2)}
.tvn-sgs{flex:1;min-height:0;display:flex;gap:16px}.tvn-sil{flex:1;min-width:0;min-height:0;overflow:hidden;background:var(--card);box-shadow:var(--sombra);border:1px solid transparent;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;align-items:center;gap:8px}
.tvn-sil .tvn-ch{width:100%}.tvn-sil h3{margin:0;font-size:28px;font-weight:700}.tvn-tq{flex:1 1 0;min-height:0;height:100%;width:auto;max-width:100%}.tq-v{fill:var(--vazio)}.tq-c{fill:none;stroke:var(--tx2);stroke-width:3}.tq-f{fill:var(--neu)}.tq-f.ok{fill:var(--ok)}.tq-f.warn{fill:var(--warn)}.tq-f.crit{fill:var(--crit)}
.tvn-sq{display:flex;align-items:baseline;gap:8px}.tvn-sq b{font-size:60px;font-weight:800;line-height:1}.tvn-sq span{font-size:24px;color:var(--tx2)}.tvn-sq em{font-style:normal;font-size:32px;font-weight:800;margin-left:10px}.tvn-sq em.ok{color:var(--ok)}.tvn-sq em.warn{color:var(--warn)}.tvn-sq em.crit{color:var(--crit)}
.tvn-infs{display:flex;gap:20px;height:150px;flex:none}.tvn-inf{flex:1;background:var(--card);box-shadow:var(--sombra);border-radius:16px;padding:16px 22px;display:flex;flex-direction:column;gap:8px}.tvn-inf h2{margin:0;font-size:20px;font-weight:800;letter-spacing:.08em;color:var(--tx2)}
.tvn-il{display:flex;align-items:baseline;gap:12px}.tvn-il b{font-size:36px;font-weight:800}.tvn-il span{font-size:19px;color:var(--tx2)}
.tvn-okc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}.tvn-okc svg{width:64px;height:64px;fill:none;stroke:var(--ok);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.tvn-okc b{font-size:24px}.tvn-okc span{font-size:17px;color:var(--tx2)}
.tvn-ch2{border:1px solid var(--linha);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:7px}.tvn-ch2.crit{border-color:var(--crit)}.tvn-def{font-size:22px;font-weight:600;line-height:1.2}
.tvn-rt{letter-spacing:.08em;font-size:14px}
.tvn-calg{flex:1;min-height:0;display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,2.4fr) minmax(0,1fr) minmax(0,1fr);gap:8px 12px}
.tvn-ch3{padding:0 6px 4px;font-size:21px;font-weight:700;color:var(--tx2);display:flex;align-items:baseline;gap:8px}.tvn-ch3.foco{color:var(--info);font-size:24px}.tvn-ch3 span{font-size:14px;font-weight:500;margin-left:auto;opacity:.85}
.tvn-cl{display:flex;flex-direction:column;justify-content:center;padding-left:4px}.tvn-cl b{font-size:24px}.tvn-cl span{font-size:15px;font-weight:600;color:var(--tx2)}.tvn-cl span.warn{color:var(--warn)}
.tvn-cc{background:var(--card);box-shadow:var(--sombra);border-radius:12px;padding:8px 14px;display:flex;flex-direction:column;justify-content:center;gap:5px;min-width:0;overflow:hidden;font-size:19px}.tvn-cc>div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvn-cc.pas{color:var(--tx2);font-size:18px}.tvn-cc.foco{border:2px solid var(--info)}.tvn-cc.foco .tvn-oh b{font-size:23px}.tvn-cc .tvn-mut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvn-cx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.tvn-pn{color:var(--tx2);font-size:.92em}.tvn-pq{color:var(--tx2);font-size:.86em}.tvn-cx2{display:flex;flex-direction:column;gap:1px;min-width:0}.tvn-cc.foco .tvn-oh>.tvn-cx{flex:1}
.tvn-rs{display:inline-flex;align-items:center;gap:5px;font-size:14px;font-weight:600}.tvn-rs i{width:8px;height:8px;border-radius:50%;background:currentColor}.tvn-rs.ok{color:var(--ok)}.tvn-rs.info{color:var(--info)}.tvn-rs.warn{color:var(--warn)}
.tvn-dt{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px}.tvn-dr{display:grid;grid-template-columns:150px minmax(0,1fr) 150px 150px 150px 380px;align-items:center;gap:24px;padding:14px 24px;background:var(--card);box-shadow:var(--sombra);border-radius:12px;font-size:28px}
.tvn-dr.th{background:none;box-shadow:none;padding:0 24px;font-size:15px;font-weight:700;letter-spacing:.08em;color:var(--tx2)}.tvn-dr .r{text-align:right}.tvn-dr .tvn-mut{font-size:21px}.tvn-dr b.warn{color:var(--warn)}
.tvn-dp{display:flex;align-items:center;gap:14px}.tvn-dp>b{width:72px;text-align:right}.tvn-dp>b.ok{color:var(--ok)}.tvn-dp>b.warn{color:var(--warn)}.tvn-dp .tvn-bar{flex:1}
.tvn-dg{flex:1;min-height:0;display:grid;gap:6px}.tvn-dd{text-align:center;font-size:15px;font-weight:600;color:var(--tx2)}.tvn-dd.hj{color:var(--info);font-weight:800}
.tvn-q{border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#FFFFFF}.tvn-q.ok{background:var(--ok)}.tvn-q.warn{background:var(--warn)}.tvn-q.crit{background:var(--crit)}
.tvn-q.fut{border:1px dashed var(--linha)}.tvn-q.hj{border:2px solid var(--info);color:var(--tx2);font-size:14px;font-weight:500}.tvn-q.mes{background:var(--card)!important;border:2px solid;font-size:22px}.tvn-q.mes.ok{color:var(--ok);border-color:var(--ok)}.tvn-q.mes.warn{color:var(--warn);border-color:var(--warn)}.tvn-q.mes.crit{color:var(--crit);border-color:var(--crit)}
.tvn-irs{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}.tvn-ir{background:var(--card);box-shadow:var(--sombra);border-radius:14px;padding:16px 24px;display:flex;flex-direction:column;gap:10px}.tvn-ir .tvn-oh b{font-size:30px}.tvn-ir .tvn-oh span{font-size:21px}
.tvn-irn{display:flex;gap:28px;align-items:baseline}.tvn-irn span{font-size:20px}.tvn-irn span b{font-size:28px;color:var(--tx)}.tvn-irn span b.warn{color:var(--warn)}.tvn-irn span b.crit{color:var(--crit)}.tvn-irn>b{font-size:28px}.tvn-irn>b.ok{color:var(--ok)}.tvn-irn>b.warn{color:var(--warn)}
.tvn-st2{height:14px;border-radius:7px;background:var(--vazio);display:flex;overflow:hidden}.tvn-st2 i{height:100%}.tvn-chs{display:flex;gap:26px;flex-wrap:wrap}.tvn-chs span{display:inline-flex;align-items:center;gap:8px;font-size:19px}.tvn-chs i{width:12px;height:12px;border-radius:3px;display:inline-block}
</style>`);
/* ===FIM TVS2=== */
