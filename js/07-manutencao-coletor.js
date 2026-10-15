/* Painel Colafix · 07-manutencao-coletor.js — manutenção (equipamentos, preventivas, peças, QR) e coletor.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

/* ===FIM EQUIPE=== */
/* ===================== MANUTENÇÃO · PAINEL NO LAYOUT DO PAINEL (06/10) + LOGIN SÓ PARA VER AS TELAS ===================== */
/* o Painel da manutenção (quadro por linha) continua como estava; esta tela nova fica na aba Resumo */
VIEWS.manres={nome:'Resumo',ic:'grafico',mob:'Resumo'}; CRUMB.manres='Resumo da manutenção';
{ const M=MODS.find(m=>m.id==='manut'); if(M&&!M.views.includes('manres')){ const i=M.views.indexOf('manmon'); M.views.splice(i<0?0:i+1,0,'manres'); } }
{ const _vr=viewOk; viewOk=function(v){ if(v==='manres') return _vr.call(this,'manmon'); return _vr.apply(this,arguments); }; }
S.mp={col:''};
function mpRows(dia){ const h=hojeStr(), agora=new Date().toISOString(), doDia=iso=>iso&&hojeStr(new Date(iso))===dia;
  const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&(doDia(c.criado)||doDia(c.concluidoEm)||(c.hist||[]).some(x=>doDia(x.em))||(dia===h&&!manFechada(c))));
  return xs.map(c=>{ const e=manEtapas(c); const resp=manMin(e.ab.em,e.as?e.as.em:(c.status==='Aberta'?agora:null)), rep=e.as?manMin(e.as.em,e.co?e.co.em:agora):null;
    const par=c.paradaId&&S.paradas.find(p=>p._id===c.paradaId); const pm=par?manMin(par.inicio,par.fim||agora):null;
    const fase=e.co?'co':e.as||c.status==='Em execução'?'ex':'ag';
    const cor=fase==='co'?'ok':c.impacto==='parou'?'crit':fase==='ag'&&resp>15?'crit':fase==='ag'?'warn':'neu';
    return {c,e,resp,rep,pm,par,fase,cor}; }); }
function mpStats30(){ const ini=Date.now()-30*864e5; const rs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&c.criado&&new Date(c.criado).getTime()>=ini).map(c=>({c,e:manEtapas(c)}));
  const resp=rs.filter(r=>r.e.as).map(r=>manMin(r.e.ab.em,r.e.as.em)), rep=rs.filter(r=>r.e.as&&r.e.co).map(r=>manMin(r.e.as.em,r.e.co.em));
  const med=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
  const porL={}; rs.forEach(r=>{ const l=r.c.linha||'Sem linha'; const o=porL[l]||(porL[l]={n:0,par:0}); o.n++; if(r.c.impacto==='parou') o.par++; });
  const porE={}; rs.forEach(r=>{ const k=String(r.c.equip||'').trim(); if(!k) return; const n=k.toLowerCase(); const o=porE[n]||(porE[n]={nome:k,n:0,l:new Set()}); o.n++; o.l.add(r.c.linha||''); });
  return {n:rs.length,resp:med(resp),rep:med(rep),porL,porE:Object.values(porE).sort((a,b)=>b.n-a.n).slice(0,5)}; }
function mpItem(r,hj){ const {c,e,fase,cor}=r, [it]=MAN_IMP[c.impacto]||['—'], n=1+(e.as?1:0)+(e.co?1:0), tec=(c.exec&&c.exec.tecnico)||(e.as&&nomeDe(e.as.por))||'';
  const st=fase==='co'?'Concluído '+hora(e.co.em):fase==='ex'?'Em execução':c.impacto==='parou'?'Máquina parada':r.resp>15?'Ninguém assumiu':'Aguardando';
  const sub=fase==='co'?'reparo '+manDur(r.rep)+(tec?' · '+esc(tec):''):fase==='ex'?esc(tec||'técnico')+' · há <span data-mm-desde="'+esc(e.as?e.as.em:c.criado)+'">'+manDur(r.rep)+'</span>':'aberto há <span data-mm-desde="'+esc(e.ab.em)+'">'+manDur(r.resp)+'</span>';
  const bt=hj&&fase!=='co'?`<div class="mp-bts">${fase==='ag'?`<button class="btn" data-act="mm-assumir" data-n="${c.numero}">${ic('play',15,2.4)}Assumir</button>`:`<button class="btn ok" data-act="mm-concluir" data-n="${c.numero}">${ic('check',15,2.6)}Concluir</button>`}<button class="btn sec" data-act="man-abrir" data-n="${c.numero}" data-ir="1">Abrir OS</button></div>`:'';
  return `<article class="mp-it ${cor} ${(fase==='ag'||(fase==='ex'&&c.impacto==='parou'))&&hj?'vivo':''}"><div class="mp-ith"><button class="mp-os num" data-act="man-abrir" data-n="${c.numero}" data-ir="1">OS ${manNum(c.numero)}</button><span class="mp-st">${esc(st)}</span></div>
    <div class="mp-df">${esc(c.defeito||'')}</div>
    <div class="mp-meta"><span class="pill neu">${esc(c.linha||'Sem linha')}</span>${c.equip?`<span class="mp-eq">${ic('ajuste',13,2)}${esc(c.equip)}</span>`:''}<span class="mp-imp ${(MAN_IMP[c.impacto]||[])[1]||''}">${esc(it)}</span></div>
    <div class="mp-ft"><span class="mp-stp" title="aberto · assumido · concluído">${[0,1,2].map(k=>`<i class="${n>k?'on':''}"></i>`).join('')}</span><span>${sub}</span>${r.pm?`<span class="${r.par.fim?'':'crit'}">· linha parada ${manDur(r.pm)}</span>`:''}</div>${bt}</article>`; }
function vManPainel(){ const M=S.man, h=hojeStr(), dia=M.dia||h, ont=addDias(h,-1), hj=dia===h, rs=mpRows(dia), z=mpStats30(), LT=linhasOrd();
  const ag=rs.filter(r=>r.fase==='ag'), ex=rs.filter(r=>r.fase==='ex'), co=rs.filter(r=>r.fase==='co'), par=rs.filter(r=>r.fase!=='co'&&r.c.impacto==='parou');
  const ord=(a,b)=>(b.c.impacto==='parou')-(a.c.impacto==='parou')||String(a.c.criado).localeCompare(String(b.c.criado));
  const tPar=rs.reduce((a,r)=>a+(r.pm||0),0), nome=String((S.uid&&S.nomes[S.uid])||'').split(' ')[0];
  const dTxt=(t=>t.charAt(0).toUpperCase()+t.slice(1))(new Date(dia+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}));
  const col=(k,t,xs,vz)=>`<section class="card mp-col ${k}"><div class="mp-ch"><span class="mp-dot ${k}"></span><b>${t}</b><span class="mp-n num">${xs.length}</span></div>
     <div class="mp-cl">${xs.length?xs.sort(ord).map(r=>mpItem(r,hj)).join(''):`<div class="mp-vz">${vz}</div>`}</div></section>`;
  const maxL=Math.max(1,...Object.values(z.porL).map(o=>o.n));
  const lsL=[...new Set([...LT,...Object.keys(z.porL)])].filter(l=>z.porL[l]);
  return `${banner()}
  <div class="head"><div><div class="eyebrow">MANUTENÇÃO · ${esc(dTxt.toUpperCase())}</div><h1>${hj?pnlSaud()+(nome?', '+esc(nome):''):'Diário de '+esc(dm(dia))}</h1><div class="sub">${hj?(ag.length+ex.length?`${ag.length+ex.length} chamado${ag.length+ex.length>1?'s':''} em aberto${par.length?` · <b style="color:var(--crit-ink)">${par.length} com máquina parada</b>`:''}`:'Tudo em dia: nenhum chamado em aberto')+' · atualiza sozinho':'Chamados abertos, assumidos ou concluídos neste dia'}</div></div>
   <div class="pg-acts mp-acts"><div class="seg" role="group" aria-label="Dia"><button data-act="mdb-dia" data-v="${h}" aria-pressed="${hj}">Hoje</button><button data-act="mdb-dia" data-v="${ont}" aria-pressed="${dia===ont}">Ontem</button></div><input class="txt mp-data" type="date" id="mdb-data" value="${esc(dia)}" max="${h}" aria-label="Escolher dia">
    <button class="btn sec mp-ib" data-act="mm-som" title="${M.som?'Som ligado: toca aviso quando chega chamado novo':'Ligar som de aviso'}" aria-pressed="${!!M.som}">${M.som?'🔔':'🔕'}</button>
    ${viewOk('manqr')?`<button class="btn sec" data-go="manqr">${ic('grid',18,2)}QR das linhas</button>`:''}<button class="btn" data-act="mp-novo">${ic('mais',20,2.4)}Abrir chamado</button></div></div>
  ${hj&&par.length?`<section class="mp-alert" role="alert">${ic('pausa',22,2.4)}<div><b>${par.length===1?'Máquina parada agora':par.length+' máquinas paradas agora'}</b><span>${par.map(r=>`${esc(r.c.linha)} · OS ${manNum(r.c.numero)} · ${esc(String(r.c.defeito||'').slice(0,60))} · ${r.fase==='ag'?'esperando há '+manDur(r.resp):'em execução'}`).join('<br>')}</span></div>${par.some(r=>r.fase==='ag')?`<button class="btn" data-act="mm-assumir" data-n="${par.find(r=>r.fase==='ag').c.numero}">${ic('play',16,2.4)}Assumir agora</button>`:''}</section>`:''}
  <div class="mp-k">
   <div class="${ag.length?'crit':''}"><span>Aguardando</span><b class="num">${ag.length}</b><small>${ag.length?'mais antigo há '+manDur(Math.max(...ag.map(r=>r.resp||0))):'ninguém esperando'}</small></div>
   <div><span>Em execução</span><b class="num">${ex.length}</b><small>${ex.length?[...new Set(ex.map(r=>(r.c.exec&&r.c.exec.tecnico)||'').filter(Boolean))].slice(0,2).join(', ')||'sem técnico':'nenhum agora'}</small></div>
   <div class="ok"><span>Concluídos</span><b class="num">${co.length}</b><small>${hj?'hoje':'no dia'}</small></div>
   <div class="${tPar?'warn':''}"><span>Linha parada</span><b class="num">${tPar?manDur(tPar):'0'}</b><small>por chamados ${hj?'de hoje':'do dia'}</small></div>
   <div><span>Tempo de resposta</span><b class="num">${manDur(z.resp)}</b><small>média de 30 dias (abriu → assumiu)</small></div>
   <div><span>Tempo de reparo</span><b class="num">${manDur(z.rep)}</b><small>média de 30 dias (assumiu → concluiu)</small></div></div>
  <div class="mp-board">${col('ag','Aguardando',ag,hj?'Ninguém esperando atendimento.':'Nada aguardando neste dia.')}${col('ex','Em execução',ex,'Nenhum serviço em andamento.')}${col('co','Concluídos',co,hj?'Nenhum concluído hoje ainda.':'Nenhum concluído neste dia.')}</div>
  <div class="two mp-two">
   <section class="card"><div class="head" style="align-items:baseline"><h2>Chamados por linha</h2><span class="sub" style="margin:0">últimos 30 dias · ${z.n} chamado${z.n===1?'':'s'}</span></div>
    ${lsL.length?`<div class="mp-bars">${lsL.map(l=>{ const o=z.porL[l]; return `<div class="mp-br"><span>${esc(l)}</span><div class="mp-bt"><i style="width:${o.n/maxL*100}%"></i><i class="p" style="width:${o.par/maxL*100}%"></i></div><b class="num">${o.n}</b></div>`; }).join('')}</div><div class="legend" style="margin-top:10px"><span><i style="background:var(--teal)"></i>chamados</span><span><i style="background:var(--crit)"></i>com máquina parada</span></div>`:'<div class="empty">Nenhum chamado nos últimos 30 dias.</div>'}</section>
   <section class="card"><div class="head" style="align-items:baseline"><h2>Equipamentos que mais pedem manutenção</h2><span class="sub" style="margin:0">últimos 30 dias</span></div>
    ${z.porE.length?z.porE.map((o,i)=>`<div class="mp-eqr"><span class="mp-rk">${i+1}</span><div><b>${esc(o.nome)}</b><small>${esc([...o.l].filter(Boolean).join(', '))}</small></div><span class="pill ${o.n>=3?'crit':o.n>=2?'warn':'neu'}">${o.n} chamado${o.n>1?'s':''}</span></div>`).join('')+'<div class="sub" style="font-size:12px;margin-top:10px">Equipamento que volta sempre é candidato a manutenção preventiva.</div>':'<div class="empty">Quando os chamados tiverem o equipamento preenchido, o ranking aparece aqui.</div>'}</section></div>`; }
{ const _mv2=manView; manView=function(v){ return v==='manres'?vManPainel():_mv2(v); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mp-novo"]'); if(!b) return; manNovo(); S.man.cur=null; go('manch'); setTimeout(()=>{ const f=$('#man-form'); if(f) f.scrollIntoView({block:'start',behavior:'smooth'}); },60); });
/* "Concluir" no painel: um toque abre a confirmação (já existia) — o botão fica verde */
/* detalhe da OS: botão Assumir no topo e a linha do tempo */
{ const _md=manDetalhe; manDetalhe=function(c){ let h=_md(c); const e=manEtapas(c);
  if(c.status==='Aberta') h=h.replace('<button class="btn sec" data-act="man-voltar">','<button class="btn" data-act="mm-assumir" data-n="'+c.numero+'">'+ic('play',16,2.4)+'Assumir</button><button class="btn sec" data-act="man-voltar">');
  const ev=[{em:c.criado,t:'Chamado aberto',s:(c.nome?'por '+c.nome:'')+(c.impacto?' · '+(MAN_IMP[c.impacto]||[''])[0]:''),k:'ab'}].concat((c.hist||[]).filter(x=>!/^Chamado aberto/.test(x.o||'')).map(x=>({em:x.em,t:String(x.o||'').split('→').pop().trim(),s:x.por?'por '+nomeDe(x.por):'',k:/Conclu/.test(x.o||'')?'co':'ex'}))).filter(x=>x.em);
  const tl=`<section class="card mp-tl"><div class="label" style="margin-bottom:10px">LINHA DO TEMPO</div>${ev.map(x=>`<div class="mp-tli ${x.k}"><span class="mp-tlh num">${dm(hojeStr(new Date(x.em)))} ${hora(x.em)}</span><i></i><div><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</div></div>`).join('')}
    ${e.as&&e.co?`<div class="mp-tls">Resposta ${manDur(manMin(e.ab.em,e.as.em))} · reparo ${manDur(manMin(e.as.em,e.co.em))}</div>`:e.as?`<div class="mp-tls">Resposta ${manDur(manMin(e.ab.em,e.as.em))} · em execução há ${manDur(manMin(e.as.em,new Date().toISOString()))}</div>`:''}</section>`;
  return h.replace('<section class="card man-at">',tl+'<section class="card man-at">'); }; }
/* quem só tem a Manutenção cai direto no painel dela; "Meu painel" sem blocos não aparece */
{ const _vo3=viewOk; viewOk=function(v){ if(v==='painel'&&S.acs&&!S.acs.dono){ try{ if(!pnlBlocos().length) return false; }catch(e){} } return _vo3.apply(this,arguments); }; }

/* modo tela cheia automático é só para quem tem apenas a Tela da linha */
{ const _sl=ltvSoLinha; ltvSoLinha=function(){ try{ if(!mViews(MODS.find(m=>m.id==='producao')).length) return false; }catch(e){} return _sl.apply(this,arguments); }; }
/* ---------- login só para ver as telas (TV, calendário, apresentação) ---------- */
if(!ACS_PERFIS.ver){ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.ver={nome:'Telas de TV (só ver)',mods:['tv','telas','cal'],locais:[]}; ACS_PERFIS.outro=_o; }
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('ver')) EQ_PRONTO_ORD.splice(3,0,'ver');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.ver='Só olha: TV das linhas, apresentação e calendário. Não muda nada.';
const ACS_SO_VER=['ver','tv','cal'];
function soVer(){ const A=S.acs; return !!(A&&!A.dono&&A.doc&&ACS_SO_VER.includes(A.doc.perfil)); }
{ const _pv=primeiraView; primeiraView=function(){ if(soVer()&&viewOk('tvapres')&&(S.acs.doc.perfil==='ver')) return 'tvapres'; if(S.acs&&!S.acs.dono&&viewOk('manmon')&&!viewOk('programacao')&&!viewOk('alxcont')&&!viewOk('pmxfichas')) return 'manmon'; return _pv(); }; }
/* avisa quem só vê: o botão de gravar não faz nada */
{ const _er=erro; erro=function(e){ if(soVer()&&e&&(e.code==='sem-permissao'||e.code==='permission-denied')){ toast('Este acesso é só para ver as telas.'); return; } return _er.apply(this,arguments); }; }
/* cartão de acesso: o endereço já abre a entrada certa (manutenção, almox, produção ou telas) */
const EQ_AREA={manut:'manutencao',ver:'telas',tv:'telas',cal:'telas',almoxpmx:'almox',linha:'producao',producao:'producao'};
function eqAreaDe(perfil){ const c=pnlCargo(perfil); if(c){ const m=c.mods||[]; return m.includes('manut')&&m.length<=2?'manutencao':m.every(x=>['tv','telas','cal'].includes(x))?'telas':m.includes('almox')||m.includes('premix')?'almox':m.includes('producao')||m.includes('paradas')?'producao':''; } return EQ_AREA[perfil]||''; }

document.head.insertAdjacentHTML('beforeend',`<style id="mp-css">
.mp-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mp-acts .btn{height:44px}.mp-acts .seg button{height:38px}.mp-acts .mp-data{height:44px;width:auto!important;flex:0 0 auto}.mp-ib{width:44px;padding:0!important;font-size:17px}
.mp-alert{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:14px;background:var(--crit);color:#fff;box-shadow:0 8px 24px rgba(192,102,93,.35);animation:mpal 2.4s ease-in-out infinite}
.mp-alert>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.mp-alert b{font-size:17px}.mp-alert span{font-size:13.5px;opacity:.95}.mp-alert .btn{background:#fff;color:var(--crit-ink);box-shadow:none;height:44px}
@keyframes mpal{0%,100%{box-shadow:0 8px 24px rgba(192,102,93,.30)}50%{box-shadow:0 8px 34px rgba(192,102,93,.65)}}
.mp-k{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.mp-k>div{background:var(--surface);border-radius:12px;box-shadow:var(--shadow);padding:14px 16px;display:flex;flex-direction:column;gap:2px;border-top:4px solid var(--teal);min-width:0}
.mp-k>div.crit{border-top-color:var(--crit)}.mp-k>div.crit b{color:var(--crit-ink)}.mp-k>div.ok{border-top-color:var(--ok)}.mp-k>div.ok b{color:var(--ok-ink)}.mp-k>div.warn{border-top-color:var(--warn)}.mp-k>div.warn b{color:var(--warn-ink)}
.mp-k span{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mp-k b{font-size:30px;line-height:1.15;color:var(--ink)}.mp-k small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mp-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
.mp-col{padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--surface-2);box-shadow:none;border:1px solid var(--line)}
.mp-ch{display:flex;align-items:center;gap:8px;padding:2px 4px}.mp-ch b{font-size:15px;flex:1}.mp-n{font-weight:800;font-size:13px;background:var(--surface);border-radius:999px;padding:2px 10px;color:var(--ink-2)}
.mp-dot{width:10px;height:10px;border-radius:999px;background:var(--warn)}.mp-dot.ex{background:var(--teal)}.mp-dot.co{background:var(--ok)}
.mp-cl{display:flex;flex-direction:column;gap:10px}.mp-vz{padding:22px 10px;text-align:center;color:var(--muted);font-size:13px;border:1.5px dashed var(--line);border-radius:12px}
.mp-it{background:var(--surface);border-radius:12px;box-shadow:var(--shadow);padding:12px 14px 12px 16px;display:flex;flex-direction:column;gap:7px;border-left:5px solid var(--teal);position:relative}
.mp-it.crit{border-left-color:var(--crit)}.mp-it.warn{border-left-color:var(--warn)}.mp-it.ok{border-left-color:var(--ok);opacity:.85}
.mp-it.vivo.crit{animation:mpviv 1.6s ease-in-out infinite}@keyframes mpviv{0%,100%{box-shadow:var(--shadow)}50%{box-shadow:0 0 0 3px rgba(192,102,93,.35),var(--shadow)}}
.mp-ith{display:flex;justify-content:space-between;align-items:center;gap:8px}.mp-os{border:0;background:none;padding:0;font:inherit;font-weight:800;font-size:15px;color:var(--teal-strong);cursor:pointer}.mp-os:hover{text-decoration:underline}
.mp-st{font-size:12px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:var(--teal-strong)}.mp-it.crit .mp-st{color:var(--crit-ink)}.mp-it.warn .mp-st{color:var(--warn-ink)}.mp-it.ok .mp-st{color:var(--ok-ink)}
.mp-df{font-size:15px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.mp-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px}.mp-eq{display:inline-flex;align-items:center;gap:4px;color:var(--ink-2)}
.mp-imp{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--sunken);color:var(--ink-2)}.mp-imp.crit{background:var(--crit-tint);color:var(--crit-ink)}.mp-imp.warn{background:var(--warn-tint);color:var(--warn-ink)}.mp-imp.ok{background:var(--ok-tint);color:var(--ok-ink)}
.mp-ft{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:12.5px;color:var(--muted)}.mp-ft .crit{color:var(--crit-ink);font-weight:700}
.mp-stp{display:inline-flex;gap:3px}.mp-stp i{width:18px;height:5px;border-radius:3px;background:var(--line)}.mp-stp i.on{background:var(--ok)}
.mp-bts{display:flex;gap:8px;margin-top:2px}.mp-bts .btn{height:40px;flex:1;font-size:14px;padding:0 12px}.mp-bts .btn.ok{background:var(--ok-ink)}.mp-bts .btn.ok:hover{background:#2f6448}
.mp-bars{display:flex;flex-direction:column;gap:9px;margin-top:12px}.mp-br{display:grid;grid-template-columns:120px minmax(0,1fr) 36px;gap:10px;align-items:center;font-size:13.5px}.mp-br span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mp-br b{text-align:right}
.mp-bt{position:relative;height:12px;border-radius:6px;background:var(--sunken);overflow:hidden}.mp-bt i{position:absolute;left:0;top:0;bottom:0;background:var(--teal);border-radius:6px}.mp-bt i.p{background:var(--crit)}
.mp-eqr{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line-2)}.mp-eqr:first-of-type{border-top:0;margin-top:6px}.mp-eqr>div{flex:1;min-width:0}.mp-eqr b{display:block}.mp-eqr small{color:var(--muted);font-size:12px}
.mp-rk{width:28px;height:28px;border-radius:8px;background:var(--teal-wash);color:var(--teal-strong);font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mp-tl{display:flex;flex-direction:column}.mp-tli{display:grid;grid-template-columns:96px 14px minmax(0,1fr);gap:10px;align-items:start;padding:0 0 14px;position:relative}
.mp-tli i{width:12px;height:12px;border-radius:999px;background:var(--warn);margin-top:4px;position:relative;z-index:1}.mp-tli.ex i{background:var(--teal)}.mp-tli.co i{background:var(--ok)}
.mp-tli:not(:last-of-type)::after{content:'';position:absolute;left:111px;top:16px;bottom:0;width:2px;background:var(--line)}
.mp-tlh{font-size:12.5px;color:var(--muted);text-align:right;padding-top:1px}.mp-tli b{display:block;font-size:14px}.mp-tli small{color:var(--muted);font-size:12.5px}
.mp-tls{margin-top:4px;padding:10px 12px;border-radius:10px;background:var(--teal-wash);color:var(--teal-strong);font-weight:700;font-size:13.5px}
body.ltv-k .mp-k b{font-size:38px} body.ltv-k .mp-df{font-size:17px}
@media (max-width:1240px){ .mp-k{grid-template-columns:repeat(3,minmax(0,1fr))} }
@media (max-width:860px){ .mp-board{grid-template-columns:minmax(0,1fr)} .mp-k{grid-template-columns:repeat(2,minmax(0,1fr))} .mp-acts{width:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px} .mp-acts [data-act="mp-novo"]{grid-column:1/-1;order:-1;height:52px} .mp-acts .seg{display:flex} .mp-acts .seg button{flex:1} .mp-acts .seg{grid-row:2;grid-column:1} .mp-acts .mp-data{width:100%!important;grid-row:2;grid-column:2/4} .mp-acts .mp-ib{grid-row:3;grid-column:3} .mp-acts [data-go="manqr"]{grid-row:3;grid-column:1/3} .mp-alert{flex-wrap:wrap} .mp-alert .btn{width:100%} .mp-br{grid-template-columns:90px minmax(0,1fr) 30px} }
</style>`);

/* ---------- chamados que chegam pelo QR sem login: viram OS numerada no primeiro painel aberto ---------- */
{ const _mn=manNum; manNum=function(n){ return (+n||0)>=900000?'nova':_mn(n); }; }
S.mp.conv=false;
async function mpConverteQr(){ if(S.mp.conv||!S.db||!S.acs||!S.acs.pronto||!viewOk('manch')||(typeof soVer==='function'&&soVer())) return;
  const pend=(S.chamados||[]).filter(c=>c.qr&&String(c._id||'').startsWith('q-')&&!c.excluido).sort((a,b)=>String(a.criado).localeCompare(String(b.criado))); if(!pend.length) return;
  S.mp.conv=true;
  try{ for(const q of pend){ const qref=S.db.doc('chamados/'+q._id); const lk=await qref.acquire({holder:S.uid||('t'+Math.random()),ttlMs:9000}); if(!lk.acquired) continue;
      try{ const g=await qref.get(); if(!g.exists) continue; const d=Object.assign({},g.data()); delete d.qr;
        let n=(S.chamados||[]).reduce((m,c)=>Math.max(m,(+c.numero||0)<900000?(+c.numero||0):0),0)+1, doc=null;
        for(let i=0;i<60&&!doc;i++,n++){ const ref=S.db.doc('chamados/os-'+manNum(n)); const r=await ref.acquire({holder:S.uid||('t'+Math.random()),ttlMs:5000}); if(!r.acquired) continue; const x=await ref.get(); if(x.exists&&x.data()&&x.data().numero) continue; doc=Object.assign({},d,{numero:n,origem:'qr',qid:q._id}); await ref.set(doc); }
        if(!doc) continue;
        if(doc.impacto==='parou'&&linhasOrd().includes(doc.linha)){ const ab=S.paradas.find(p=>p.linha===doc.linha&&!p.fim); let pid=ab?ab._id:null;
          if(!pid){ const ini=new Date(doc.criado||Date.now()).toISOString(); const ref=await S.db.collection('paradas').add({linha:doc.linha,motivo:'Manutenção',inicio:ini,fim:null,por:null,obs:'OS '+manNum(doc.numero)+' · '+String(doc.defeito||'').slice(0,80)+' (pelo QR, '+(doc.nome||'')+')',os:doc.numero}); pid=ref&&ref.id; }
          if(pid) await S.db.doc('chamados/os-'+manNum(doc.numero)).update({paradaId:pid}); }
        await qref.delete();
      } finally { try{ await qref.release(); }catch(e){} } } }
  catch(e){ console.warn('qr→OS',e); }
  S.mp.conv=false; }
setInterval(mpConverteQr,4000);

/* ---------- aviso de chamado novo: toca, mostra na tela e repete enquanto ninguém assume a máquina parada ---------- */
try{ S.man.som=localStorage.getItem('painel.mansom')==='1'; }catch(e){}
S.mp.vistos=null; S.mp.novo=null; S.mp.ultBip=0;
function mpPodeAvisar(){ try{ return viewOk('manmon')&&viewOk('manch'); }catch(e){ return false; } }
function mpChave(c){ return c.qid||c._id; }
function mpTocar(forte){ if(!S.man.som) return; manBip(); if(forte) setTimeout(manBip,900); S.mp.ultBip=Date.now(); }
function mpAvisa(c){ S.mp.novo={id:mpChave(c),em:Date.now()}; mpTocar(true);
  try{ if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){ const nt=new Notification('Chamado · '+(c.linha||''),{body:(c.impacto==='parou'?'MÁQUINA PARADA · ':'')+String(c.defeito||'').slice(0,120),tag:'chamado-'+mpChave(c),icon:'icons/icon-192.png'}); nt.onclick=()=>{ window.focus(); go('manmon'); nt.close(); }; } }catch(e){}
  try{ if(document.hidden){ let k=0; const t0=document.title; const pisca=setInterval(()=>{ document.title=(k++%2?'🔔 Chamado novo':t0); if(!document.hidden||k>40){ clearInterval(pisca); document.title=t0; } },1000); } }catch(e){}
  mpAvisoPinta(); }
function mpAvisoPinta(){ let el=document.getElementById('mp-aviso'); const N=S.mp.novo; const c=N&&(S.chamados||[]).find(x=>mpChave(x)===N.id);
  if(!N||!c||Date.now()-N.em>45000||c.status!=='Aberta'){ if(el) el.remove(); if(N&&(!c||c.status!=='Aberta'||Date.now()-N.em>45000)) S.mp.novo=null; return; }
  if(!el){ el=document.createElement('div'); el.id='mp-aviso'; document.body.appendChild(el); }
  const par=c.impacto==='parou', pronta=(+c.numero||0)<900000;
  el.className='mp-aviso '+(par?'crit':'');
  el.innerHTML=`<div class="mp-av-ic">🔔</div><div class="mp-av-tx"><small>${par?'MÁQUINA PARADA · CHAMADO NOVO':'CHAMADO NOVO'}${c.origem==='qr'?' · PELO QR':''}</small><b>${esc(c.linha||'')}</b><span>${esc(String(c.defeito||'').slice(0,110))}${c.nome?' · '+esc(c.nome):''}</span></div>
   <div class="mp-av-bt">${pronta?`<button class="btn" data-act="mm-assumir" data-n="${c.numero}">Assumir</button>`:'<span class="sub" style="color:inherit;opacity:.8;margin:0">gerando a OS…</span>'}<button class="btn sec" data-act="mp-av-ver">Ver</button><button class="mp-av-x" data-act="mp-av-x" aria-label="Fechar">✕</button></div>`; }
function mpVigia(){ if(!mpPodeAvisar()||!S.acs.pronto) return; const ab=(S.chamados||[]).filter(c=>!manIgnorar(c)&&c.status==='Aberta'&&!c.prevId);
  const ids=new Set(ab.map(mpChave)); if(S.mp.vistos===null){ S.mp.vistos=ids; return; }
  const novos=ab.filter(c=>!S.mp.vistos.has(mpChave(c))&&Date.now()-new Date(c.criado||0).getTime()<30*6e4); S.mp.vistos=new Set([...S.mp.vistos,...ids]);
  if(novos.length) mpAvisa(novos.sort((a,b)=>(b.impacto==='parou')-(a.impacto==='parou'))[0]);
  else if(ab.some(c=>c.impacto==='parou')&&Date.now()-S.mp.ultBip>60000) mpTocar(false);
  mpAvisoPinta(); }
setInterval(mpVigia,2500);
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mp-av-"],[data-act="mm-som"]'); try{ if(S.man._ac&&S.man._ac.state==='suspended') S.man._ac.resume(); }catch(e){} if(!b) return; const a=b.dataset.act;
  if(a==='mp-av-x'){ S.mp.novo=null; mpAvisoPinta(); return; }
  if(a==='mp-av-ver'){ S.mp.novo=null; mpAvisoPinta(); S.man.cur=null; go('manmon'); return; }
  if(a==='mm-som'){ setTimeout(()=>{ try{ localStorage.setItem('painel.mansom',S.man.som?'1':'0'); }catch(e){} if(S.man.som&&'Notification' in window&&Notification.permission==='default'){ try{ Notification.requestPermission(); }catch(e){} } },0); } },true);
/* o painel volta a perguntar se o som deve tocar quando o navegador bloqueia o áudio depois de recarregar */
{ const _vmp=vManPainel; vManPainel=function(){ const h=_vmp(); let susp=false; try{ susp=S.man.som&&S.man._ac&&S.man._ac.state==='suspended'; }catch(e){}
  const dica=!S.man.som?`<div class="banner mp-som" data-act="mm-som" role="button" tabindex="0">🔕 O som está desligado neste aparelho. <b>Toque aqui para ligar</b> e ouvir quando chegar chamado.</div>`:susp?`<div class="banner mp-som" role="button" tabindex="0">🔔 Toque em qualquer lugar da tela para liberar o som.</div>`:'';
  return dica?h.replace('<div class="mp-k">',dica+'<div class="mp-k">'):h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="mp-css2">
.mp-aviso{position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:960;width:min(720px,calc(100% - 24px));display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;background:var(--teal-strong);color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35);animation:mpin .35s ease-out}
.mp-aviso.crit{background:var(--crit-ink);animation:mpin .35s ease-out,mppul 1.4s ease-in-out .4s infinite}
@keyframes mpin{from{transform:translate(-50%,-20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}@keyframes mppul{0%,100%{box-shadow:0 18px 50px rgba(0,0,0,.35)}50%{box-shadow:0 0 0 6px rgba(255,255,255,.25),0 18px 50px rgba(0,0,0,.35)}}
.mp-av-ic{font-size:30px;animation:mpsino 1s ease-in-out infinite}@keyframes mpsino{0%,100%{transform:rotate(0)}25%{transform:rotate(14deg)}75%{transform:rotate(-14deg)}}
.mp-av-tx{flex:1;min-width:0;display:flex;flex-direction:column}.mp-av-tx small{font-size:11px;font-weight:800;letter-spacing:.12em;opacity:.85}.mp-av-tx b{font-size:22px;line-height:1.2}.mp-av-tx span{font-size:13.5px;opacity:.92;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mp-av-bt{display:flex;gap:8px;align-items:center}.mp-av-bt .btn{height:42px;background:#fff;color:var(--teal-strong);box-shadow:none}.mp-av-bt .btn.sec{background:transparent;color:#fff;border-color:rgba(255,255,255,.5)}.mp-aviso.crit .mp-av-bt .btn:not(.sec){color:var(--crit-ink)}
.mp-av-x{border:0;background:rgba(255,255,255,.15);color:#fff;width:34px;height:34px;border-radius:10px;cursor:pointer}
.mp-som{cursor:pointer}
@media (max-width:640px){ .mp-aviso{flex-wrap:wrap;top:64px} .mp-av-bt{width:100%} .mp-av-bt .btn{flex:1} }
@media (prefers-reduced-motion:reduce){ .mp-aviso,.mp-av-ic{animation:none!important} }
</style>`);
/* ===FIM MANP=== */
/* ===================== MANUTENÇÃO 2 (06/10): equipamentos, preventivas, peças, fotos, confiabilidade e TV da oficina ===================== */
/* config/manut = {equips:[{id,linha,nome,tag,ativo}], prev:[{id,equip,tarefa,freq,prox,ultima,ativo,osDe,os}], pecas:[{cod,desc,un,min}]}
   pecasmov/{id} = {cod,desc,un,qtd(+ entrada / − saída),tipo:'entrada'|'saida'|'ajuste',os?,em,por,obs?}   chamfotos/{id} = {d:dataURL,em,origem} */
P.foto='<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>';
P.engr='<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>';
P.cal2='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>';
P.peca='<path d="M10 3h4v3l3 2v4h3v4h-3v4H7v-4H4v-4h3V8l3-2z"/>';
P.tela='<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>';
S.mx={cfg:{equips:[],prev:[],pecas:[]},lido:false,sub:false,movs:[],fotos:{},eq:{linha:'',nome:'',tag:'',ed:null},pv:{equip:'',tarefa:'',freq:'30',prox:'',ed:null,fil:'todas'},pc:{cod:'',desc:'',un:'un',min:'',ent:{cod:'',qtd:'',obs:''},busca:''},add:{cod:'',qtd:'1'},ger:false};
Object.assign(VIEWS,{manprev:{nome:'Preventivas',ic:'cal2',mob:'Prevent.'},manequip:{nome:'Equipamentos',ic:'engr',mob:'Equip.'},manpecas:{nome:'Peças',ic:'peca',mob:'Peças'}});
Object.assign(CRUMB,{manprev:'Manutenção preventiva',manequip:'Equipamentos',manpecas:'Peças da manutenção'});
{ const M=MODS.find(m=>m.id==='manut'); if(M){ const qr=M.views.indexOf('manqr'); ['manprev','manequip','manpecas'].forEach(v=>{ if(!M.views.includes(v)) M.views.splice(qr<0?M.views.length:M.views.indexOf('manqr'),0,v); }); } }
{ const _vo=viewOk; viewOk=function(v){ if(['manprev','manequip','manpecas'].includes(v)){ if(S.acs&&S.acs.dono) return true; const p=acsP(); return !!p&&!p.tudo&&(p.mods||[]).includes('manut'); } return _vo.apply(this,arguments); }; }
{ const _mv=manView; manView=function(v){ return v==='manprev'?vManPrev():v==='manequip'?vManEquip():v==='manpecas'?vManPecas():_mv(v); }; }
/* assinaturas */
setInterval(()=>{ try{ const X=S.mx; if(X.sub||!S.db||!S.acs||!S.acs.pronto||!(viewOk('manch')||viewOk('mantotem'))) return; X.sub=true;
  S.db.doc('config/manut').onSnapshot(s=>{ const d=s.exists?(s.data()||{}):{}; X.cfg={equips:d.equips||[],prev:d.prev||[],pecas:d.pecas||[],limites:d.limites||null}; X.lido=true; rerenderSeguro(); },()=>{ X.lido=true; });
  inscrever('pecasmov',()=>S.db.collection('pecasmov').orderBy('em','desc').limit(1000),snap=>{ X.movs=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); });
}catch(e){} },700);
function mxId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
async function mxGrava(muda){ const fs=window.claude&&window.claude._fs&&window.claude._fs(), enc=window.claude&&window.claude._enc;
  const monta=d=>{ d=d||{}; const n=Object.assign({},d,{equips:d.equips||[],prev:d.prev||[],pecas:d.pecas||[],limites:d.limites||null}); muda(n); n.em=new Date().toISOString(); n.por=S.uid||null; return n; };
  let n;
  if(fs&&enc){ const ref=fs.doc('config/manut'); await fs.runTransaction(async t=>{ const g=await t.get(ref); n=monta(g.exists?JSON.parse(JSON.stringify(g.data()||{})):{}); t.set(ref,enc(n)); }); }
  else { const g=await S.db.doc('config/manut').get(); n=monta(g.exists?(g.data()||{}):{}); await S.db.doc('config/manut').set(n); }
  S.mx.cfg={equips:n.equips,prev:n.prev,pecas:n.pecas,limites:n.limites}; }
function mxEquips(linha){ return (S.mx.cfg.equips||[]).filter(e=>e.ativo!==false&&(!linha||e.linha===linha)).sort((a,b)=>String(a.nome).localeCompare(String(b.nome))); }
function mxEquip(id){ return (S.mx.cfg.equips||[]).find(e=>e.id===id); }
function mxNorm(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
function mxHoras(m){ return m==null?'—':m<60?m+' min':(m/60).toFixed(m<600?1:0).replace('.',',')+' h'; }
function mxDias(d){ return d==null?'—':d<1?Math.round(d*24)+' h':(d<10?d.toFixed(1).replace('.',','):Math.round(d))+' d'; }
/* número da OS (mesmo jeito do chamado normal) */
async function mxNovaOS(base){ let n=(S.chamados||[]).reduce((m,c)=>Math.max(m,(+c.numero||0)<900000?(+c.numero||0):0),0)+1, doc=null;
  for(let i=0;i<60&&!doc;i++,n++){ const ref=S.db.doc('chamados/os-'+manNum(n)); const r=await ref.acquire({holder:S.uid||('t'+Math.random()),ttlMs:5000}); if(!r.acquired) continue; const x=await ref.get(); if(x.exists&&x.data()&&x.data().numero) continue; doc=Object.assign({},base,{numero:n}); await ref.set(doc); }
  if(!doc) throw new Error('Não consegui reservar o número da OS.');
  if(!(S.chamados||[]).some(c=>c.numero===doc.numero)) S.chamados=[Object.assign({_id:'os-'+manNum(doc.numero)},doc)].concat(S.chamados||[]);
  return doc; }

/* ---------- confiabilidade por equipamento ---------- */
function mxChamEquip(e){ const k=mxNorm(e.nome); return (S.chamados||[]).filter(c=>!manIgnorar(c)&&(+c.numero||0)<900000&&(c.equipId===e.id||(!c.equipId&&mxNorm(c.equip)===k&&(!c.linha||!e.linha||c.linha===e.linha)))); }
function mxConf(xs,dias){ const ini=Date.now()-dias*864e5; const cor=xs.filter(c=>!c.prevId&&c.criado&&new Date(c.criado).getTime()>=ini).sort((a,b)=>String(a.criado).localeCompare(String(b.criado)));
  const reps=cor.map(c=>{ const e=manEtapas(c); return e.as&&e.co?manMin(e.as.em,e.co.em):null; }).filter(x=>x!=null);
  const par=cor.reduce((a,c)=>{ const p=c.paradaId&&S.paradas.find(x=>x._id===c.paradaId); return a+(p?manMin(p.inicio,p.fim||new Date().toISOString())||0:0); },0);
  let mtbf=null; if(cor.length>=2){ const t0=new Date(cor[0].criado).getTime(), t1=new Date(cor[cor.length-1].criado).getTime(); mtbf=(t1-t0)/864e5/(cor.length-1); } else if(cor.length===1) mtbf=null;
  return {n:cor.length,mttr:reps.length?Math.round(reps.reduce((a,b)=>a+b,0)/reps.length):null,mtbf,par,ult:cor.length?cor[cor.length-1].criado:null}; }
function mxConfTabela(){ const eqs=mxEquips(); const livres={}; (S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.equipId&&c.equip&&(+c.numero||0)<900000&&!eqs.some(e=>mxNorm(e.nome)===mxNorm(c.equip))).forEach(c=>{ const k=mxNorm(c.equip)+'|'+(c.linha||''); livres[k]=livres[k]||{id:'',nome:c.equip,linha:c.linha||''}; });
  const rows=[...eqs,...Object.values(livres)].map(e=>({e,z:mxConf(mxChamEquip(e),90)})).filter(r=>r.z.n).sort((a,b)=>b.z.n-a.z.n||(b.z.par-a.z.par));
  if(!rows.length) return '<div class="empty">Quando os chamados tiverem o equipamento, aparece aqui quanto cada máquina quebra e quanto demora o reparo.</div>';
  return `<div class="mx-tw"><table class="mx-t"><thead><tr><th>Equipamento</th><th>Linha</th><th class="r">Falhas</th><th class="r" title="Tempo médio de reparo">MTTR</th><th class="r" title="Tempo médio entre falhas">MTBF</th><th class="r">Linha parada</th><th>Última falha</th></tr></thead><tbody>
   ${rows.slice(0,10).map(({e,z})=>`<tr class="${z.mtbf!=null&&z.mtbf<7?'crit':z.mtbf!=null&&z.mtbf<15?'warn':''}"><td><b>${esc(e.nome)}</b>${e.tag?`<small>${esc(e.tag)}</small>`:''}</td><td>${esc(e.linha||'—')}</td><td class="r num">${z.n}</td><td class="r num">${mxHoras(z.mttr)}</td><td class="r num">${z.mtbf==null?'<span class="t-mut">1 falha</span>':mxDias(z.mtbf)}</td><td class="r num">${z.par?mxHoras(z.par):'—'}</td><td>${z.ult?dia(z.ult).toLowerCase()+' '+hora(z.ult):'—'}</td></tr>`).join('')}</tbody></table></div>
   <div class="sub" style="font-size:12px;margin-top:8px">Últimos 90 dias, só corretivas. MTTR = tempo médio de reparo (assumiu → concluiu). MTBF = tempo médio entre uma falha e a próxima. MTBF baixo (vermelho, menos de 7 dias) pede preventiva.</div>`; }
function mxMeses(){ const out=[]; const h=new Date(); for(let i=5;i>=0;i--){ const d=new Date(h.getFullYear(),h.getMonth()-i,1); const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&(+c.numero||0)<900000&&String(c.criado||'').length&&hojeStr(new Date(c.criado)).slice(0,7)===k);
    const cor=xs.filter(c=>!c.prevId), prev=xs.filter(c=>c.prevId);
    const reps=cor.map(c=>{ const e=manEtapas(c); return e.as&&e.co?manMin(e.as.em,e.co.em):null; }).filter(x=>x!=null);
    const par=cor.reduce((a,c)=>{ const p=c.paradaId&&S.paradas.find(x=>x._id===c.paradaId); return a+(p?manMin(p.inicio,p.fim||new Date().toISOString())||0:0); },0);
    out.push({k,lab:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),cor:cor.length,prev:prev.length,prevOk:prev.filter(c=>c.status==='Concluída').length,mttr:reps.length?Math.round(reps.reduce((a,b)=>a+b,0)/reps.length):null,par}); }
  return out; }
function mxMesesCard(){ const ms=mxMeses(); const mx=Math.max(1,...ms.map(m=>m.cor+m.prev)), mxp=Math.max(1,...ms.map(m=>m.par));
  return `<section class="card"><div class="head" style="align-items:baseline"><h2>Mês a mês</h2><span class="sub" style="margin:0">últimos 6 meses</span></div>
   <div class="mx-mm">${ms.map(m=>`<div class="mx-m"><div class="mx-mb" title="${m.cor} corretivas · ${m.prev} preventivas"><i class="p" style="height:${m.prev/mx*100}%"></i><i style="height:${m.cor/mx*100}%"></i></div><b class="num">${m.cor+m.prev}</b><span>${esc(m.lab)}</span></div>`).join('')}</div>
   <div class="legend" style="margin:6px 0 12px"><span><i style="background:var(--teal)"></i>corretivas</span><span><i style="background:var(--ok)"></i>preventivas</span></div>
   <div class="mx-tw"><table class="mx-t"><thead><tr><th></th>${ms.map(m=>`<th class="r">${esc(m.lab)}</th>`).join('')}</tr></thead><tbody>
    <tr><td>Tempo de reparo (MTTR)</td>${ms.map(m=>`<td class="r num">${mxHoras(m.mttr)}</td>`).join('')}</tr>
    <tr><td>Linha parada</td>${ms.map(m=>`<td class="r num"><span class="mx-pb" style="--w:${m.par/mxp*100}%"></span>${m.par?mxHoras(m.par):'—'}</td>`).join('')}</tr>
    <tr><td>Preventivas feitas</td>${ms.map(m=>`<td class="r num">${m.prev?m.prevOk+'/'+m.prev:'—'}</td>`).join('')}</tr></tbody></table></div></section>`; }
/* painel: confiabilidade, mês a mês, preventivas do dia e modo TV */
{ const _vp=vManPainel; vManPainel=function(){ let h=_vp(); const hj=!S.man.dia||S.man.dia===hojeStr();
  const atr=mxPrevStatus().filter(x=>x.st==='atrasada'||x.st==='hoje');
  const prevCard=hj&&atr.length?`<section class="card mx-prevhj"><div class="head" style="align-items:baseline"><h2>${ic('cal2',20,2)} Preventivas para hoje</h2><button class="lnk" data-go="manprev">Ver todas</button></div>${atr.slice(0,6).map(x=>`<div class="mx-pr ${x.st}"><div><b>${esc(x.p.tarefa)}</b><small>${esc((x.e&&x.e.nome)||'—')} · ${esc((x.e&&x.e.linha)||'')} · ${x.st==='atrasada'?'atrasada desde '+dm(x.p.prox):'hoje'}</small></div>${x.os?`<button class="btn sec" data-act="man-abrir" data-n="${x.os.numero}" data-ir="1">OS ${manNum(x.os.numero)}</button>`:`<span class="pill warn">OS sai em instantes</span>`}</div>`).join('')}</section>`:'';
  const relogio=`<div class="mx-tvclk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div>`;
  h=h.replace('<div class="mp-k">',prevCard+'<div class="mp-k">');
  h=h.replace('<button class="btn" data-act="mp-novo">','<button class="btn sec" data-act="mx-tv" title="Tela cheia para a TV da oficina, com som">'+ic('tela',18,2)+(document.body.classList.contains('ltv-k')?'Sair do modo TV':'Modo TV')+'</button><button class="btn" data-act="mp-novo">');
  h=h.replace('<div class="head"><div><div class="eyebrow">MANUTENÇÃO','<div class="head mx-hd">'+relogio+'<div><div class="eyebrow">MANUTENÇÃO');
  return h+`<div class="two mp-two">${mxMesesCard()}<section class="card"><div class="head" style="align-items:baseline"><h2>Confiabilidade por equipamento</h2><span class="sub" style="margin:0">90 dias</span></div>${mxConfTabela()}</section></div>`; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mx-tv"]'); if(!b) return; const on=!document.body.classList.contains('ltv-k'); document.body.classList.toggle('ltv-k',on);
  try{ if(on&&document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); if(!on&&document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }catch(e){}
  if(on&&!S.man.som){ S.man.som=true; try{ localStorage.setItem('painel.mansom','1'); }catch(e){} manBip(); } try{ localStorage.setItem('painel.mantv',on?'1':'0'); }catch(e){} if(on&&S.view!=='manmon'){ go('manmon'); document.body.classList.add('ltv-k'); } else render(); });
/* TV da oficina: cargo próprio que abre direto no painel em modo TV */
if(!ACS_PERFIS.tvman){ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.tvman={nome:'TV da oficina (manutenção)',mods:['manut'],locais:[]}; ACS_PERFIS.outro=_o; }
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('tvman')) EQ_PRONTO_ORD.splice(4,0,'tvman');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.tvman='TV ligada na oficina: painel da manutenção em tela cheia, com som e as OS dos QR';
if(typeof EQ_AREA!=='undefined') EQ_AREA.tvman='manutencao';
setInterval(()=>{ try{ const A=S.acs; if(!A||!A.pronto||A.dono||!A.doc) return; let tv=false; try{ tv=localStorage.getItem('painel.mantv')==='1'; }catch(e){}
  if((A.doc.perfil==='tvman'||tv)&&S.view==='manmon'&&!document.body.classList.contains('ltv-k')&&!S.mx._tvIni){ S.mx._tvIni=true; document.body.classList.add('ltv-k'); if(A.doc.perfil==='tvman'&&!S.man.som){ S.man.som=true; try{ localStorage.setItem('painel.mansom','1'); }catch(e){} } render(); } }catch(e){} },1500);
APR_TELAS.push({k:'manut',v:'manmon',nome:'Manutenção',d:'Chamados ao vivo, máquinas paradas, preventivas do dia e a confiabilidade de cada equipamento.',cor:'#A2453D',on:true});

/* ---------- equipamentos ---------- */
function vManEquip(){ const X=S.mx, F=X.eq, LT=manLinhas(); if(!X.lido) return `${banner()}<section class="card"><div class="empty">Carregando…</div></section>`;
  const porL={}; mxEquips().forEach(e=>{ (porL[e.linha||'Sem linha']=porL[e.linha||'Sem linha']||[]).push(e); });
  const ls=Object.keys(porL).sort((a,b)=>{ const ia=LT.indexOf(a), ib=LT.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b); });
  const sug=[...new Set((S.chamados||[]).filter(c=>c.equip&&!c.equipId&&!mxEquips().some(e=>mxNorm(e.nome)===mxNorm(c.equip)&&e.linha===c.linha)).map(c=>(c.linha||'')+'|'+c.equip))].slice(0,12);
  const row=e=>{ const z=mxConf(mxChamEquip(e),90), pv=(X.cfg.prev||[]).filter(p=>p.equip===e.id&&p.ativo!==false).length, ed=F.ed===e.id;
    if(ed) return `<div class="mx-er ed"><input class="txt" id="mx-eq-n" value="${esc(F.nome)}" placeholder="Nome"><input class="txt" id="mx-eq-t" value="${esc(F.tag)}" placeholder="TAG / patrimônio"><select class="txt" id="mx-eq-l">${LT.map(l=>`<option ${F.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select><button class="btn" data-act="mx-eq-salvar">Salvar</button><button class="btn sec" data-act="mx-eq-x">Cancelar</button></div>`;
    return `<div class="mx-er"><span class="mx-eic">${ic('engr',18,2)}</span><div class="mx-en"><b>${esc(e.nome)}</b><small>${e.tag?esc(e.tag)+' · ':''}${z.n?`${z.n} falha${z.n>1?'s':''} em 90 dias · reparo ${mxHoras(z.mttr)}${z.mtbf!=null?' · MTBF '+mxDias(z.mtbf):''}`:'sem falha em 90 dias'}${pv?` · ${pv} preventiva${pv>1?'s':''}`:''}</small></div>
     <div class="mx-ea"><button class="eq-lk" data-act="mx-eq-prev" data-id="${esc(e.id)}">${ic('cal2',15,2)}Preventiva</button><button class="eq-lk" data-act="mx-eq-ed" data-id="${esc(e.id)}">${ic('editar',15,2)}Editar</button>${F.conf===e.id?`<button class="eq-lk del" data-act="mx-eq-del" data-id="${esc(e.id)}">Confirmar: tirar</button>`:`<button class="eq-lk del" data-act="mx-eq-conf" data-id="${esc(e.id)}">${ic('lixo',15,2)}Tirar</button>`}</div></div>`; };
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Equipamentos</h1><div class="sub">Cadastre as máquinas de cada linha. Quem abre o chamado escolhe na lista, e o painel mostra quanto cada uma quebra.</div></div></div>
   <div class="mx-eqw${ls.length?' tem':''}"><section class="card mx-new"><div class="label" style="margin-bottom:8px">NOVO EQUIPAMENTO</div><div class="mx-nf"><select class="txt" id="mx-eqn-l"><option value="">Linha…</option>${LT.map(l=>`<option ${F.linha===l&&!F.ed?'selected':''}>${esc(l)}</option>`).join('')}</select><input class="txt" id="mx-eqn-n" placeholder="Nome (ex.: Misturador, Ensacadeira, Elevador de canecas)" value="${F.ed?'':esc(F.nome)}"><input class="txt" id="mx-eqn-t" placeholder="TAG (opcional)" value="${F.ed?'':esc(F.tag)}"><button class="btn" data-act="mx-eq-novo">${ic('mais',18,2.4)}Cadastrar</button></div>
    ${sug.length?`<div class="sub" style="font-size:12.5px;margin:10px 0 6px">Já apareceram nos chamados (toque para cadastrar):</div><div class="chips">${sug.map(s=>{ const [l,n]=s.split('|'); return `<button class="chip" data-act="mx-eq-sug" data-l="${esc(l)}" data-n="${esc(n)}">${esc(n)}${l?' · '+esc(l):''}</button>`; }).join('')}</div>`:''}</section>
   ${ls.length?ls.map(l=>`<section class="card"><div class="head" style="align-items:baseline"><h2>${esc(l)}</h2><span class="sub" style="margin:0">${porL[l].length} equipamento${porL[l].length>1?'s':''}</span></div>${porL[l].map(row).join('')}</section>`).join(''):'<section class="card"><div class="empty">Nenhum equipamento cadastrado ainda.</div></section>'}</div>`; }
document.head.insertAdjacentHTML('beforeend','<style>@media(max-width:700px){.mx-eqw.tem{display:flex;flex-direction:column}.mx-eqw.tem>.mx-new{order:9}}</style>');

/* ---------- preventivas ---------- */
function mxOsPrev(p){ return (S.chamados||[]).filter(c=>!manIgnorar(c)&&c.prevId===p.id&&!manFechada(c)).sort((a,b)=>b.numero-a.numero)[0]||null; }
function mxPrevStatus(){ const h=hojeStr(), em7=addDias(h,7); return (S.mx.cfg.prev||[]).filter(p=>p.ativo!==false).map(p=>{ const os=mxOsPrev(p), e=mxEquip(p.equip);
    const st=os?'aberta':!p.prox?'sem':p.prox<h?'atrasada':p.prox===h?'hoje':p.prox<=em7?'semana':'ok'; return {p,e,os,st}; }).sort((a,b)=>String(a.p.prox||'9').localeCompare(String(b.p.prox||'9'))); }
function vManPrev(){ const X=S.mx, F=X.pv; if(!X.lido) return `${banner()}<section class="card"><div class="empty">Carregando…</div></section>`;
  const eqs=mxEquips(), xs=mxPrevStatus(), h=hojeStr(); const cnt=k=>xs.filter(x=>x.st===k).length;
  const lab={atrasada:['Atrasada','crit'],hoje:['Hoje','warn'],aberta:['OS aberta','prod'],semana:['Esta semana','neu'],ok:['Em dia','ok'],sem:['Sem data','neu']};
  const fil=F.fil==='todas'?xs:xs.filter(x=>F.fil==='pend'?['atrasada','hoje','aberta'].includes(x.st):x.st===F.fil);
  const row=x=>{ const {p,e,os,st}=x; const [l,c]=lab[st]; const ed=F.ed===p.id;
    return `<div class="mx-pv ${st}"><div class="mx-pvd"><b class="num">${p.prox?dm(p.prox):'—'}</b><small>a cada ${p.freq} dia${+p.freq>1?'s':''}</small></div><div class="mx-pvt"><b>${esc(p.tarefa)}</b><small>${esc((e&&e.nome)||'equipamento removido')} · ${esc((e&&e.linha)||'')}${p.ultima?' · última '+dm(p.ultima):''}${p.resp?' · resp. '+esc(p.resp):''}</small>${mxPrevExec(p)}</div><span class="pill ${c}">${l}</span>
     <div class="mx-ea">${os?`<button class="btn sec" data-act="man-abrir" data-n="${os.numero}" data-ir="1" style="height:38px">OS ${manNum(os.numero)}</button>`:`<button class="eq-lk" data-act="mx-pv-gerar" data-id="${esc(p.id)}">${ic('play',15,2)}Gerar OS agora</button>`}<button class="eq-lk" data-act="mx-pv-ed" data-id="${esc(p.id)}">${ic('editar',15,2)}Editar</button>${F.conf===p.id?`<button class="eq-lk del" data-act="mx-pv-del" data-id="${esc(p.id)}">Confirmar: tirar</button>`:`<button class="eq-lk del" data-act="mx-pv-conf" data-id="${esc(p.id)}">${ic('lixo',15,2)}Tirar</button>`}</div>
     ${ed?mxPrevForm(true):''}</div>`; };
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Preventivas</h1><div class="sub">Cadastre o que precisa ser feito em cada máquina e de quanto em quanto tempo. No dia, a OS abre sozinha na fila da manutenção; ao concluir, a próxima data é marcada.</div></div></div>
   ${eqs.length?`<section class="card mx-new"><div class="label" style="margin-bottom:8px">NOVA PREVENTIVA</div>${F.ed?'<div class="sub" style="margin:0">Termine a edição abaixo.</div>':mxPrevForm(false)}</section>`:`<section class="card"><div class="empty">Cadastre os equipamentos primeiro. <button class="lnk" data-go="manequip">Ir para Equipamentos</button></div></section>`}
   <div class="mp-k mx-k"><div class="${cnt('atrasada')?'crit':''}"><span>Atrasadas</span><b class="num">${cnt('atrasada')}</b><small>passou da data sem OS</small></div><div class="${cnt('hoje')?'warn':''}"><span>Hoje</span><b class="num">${cnt('hoje')}</b><small>a OS abre sozinha</small></div><div><span>OS abertas</span><b class="num">${cnt('aberta')}</b><small>esperando execução</small></div><div><span>Esta semana</span><b class="num">${cnt('semana')}</b><small>próximos 7 dias</small></div><div class="ok"><span>Em dia</span><b class="num">${cnt('ok')}</b><small>mais de 7 dias</small></div><div><span>Total</span><b class="num">${xs.length}</b><small>planos ativos</small></div></div>
   <section class="card"><div class="chips" style="margin-bottom:10px">${[['todas','Todas'],['pend','Pendentes'],['semana','Esta semana'],['ok','Em dia']].map(([k,l])=>`<button class="chip" data-act="mx-pv-fil" data-v="${k}" aria-pressed="${F.fil===k}">${l}</button>`).join('')}</div>
    ${fil.length?fil.map(row).join(''):'<div class="empty">Nenhuma preventiva aqui.</div>'}</section>`; }
function mxPrevForm(ed){ const F=S.mx.pv, eqs=mxEquips(); return `<div class="mx-nf ${ed?'mx-pvf':''}"><select class="txt" id="mx-pv-e"><option value="">Equipamento…</option>${manLinhas().map(l=>{ const es=eqs.filter(e=>e.linha===l); return es.length?`<optgroup label="${esc(l)}">${es.map(e=>`<option value="${esc(e.id)}" ${F.equip===e.id?'selected':''}>${esc(e.nome)}</option>`).join('')}</optgroup>`:''; }).join('')}</select>
   <input class="txt" id="mx-pv-t" placeholder="O que fazer (ex.: lubrificar rolamentos, trocar correia)" value="${esc(F.tarefa)}"><label class="mx-in"><span>a cada</span><input class="txt num" id="mx-pv-f" type="number" min="1" value="${esc(F.freq)}"><span>dias</span></label><label class="mx-in"><span>${ed?'próxima':'primeira'}</span><input class="txt" id="mx-pv-p" type="date" value="${esc(F.prox||hojeStr())}"></label><input class="txt" id="mx-pv-r" placeholder="Responsável (opcional)" value="${esc(F.resp||'')}" style="max-width:220px" aria-label="Responsável pela preventiva">
   <button class="btn" data-act="mx-pv-salvar">${ic('check',18,2.4)}${ed?'Salvar':'Cadastrar'}</button>${ed?'<button class="btn sec" data-act="mx-pv-x">Cancelar</button>':''}</div>`; }
/* abre a OS da preventiva no dia */
S.mx.gerando=false;
async function mxGeraPrev(p,forcar){ if(typeof soVer==='function'&&soVer()) return false; const lk=S.db.doc('config/manut-prev-'+p.id); const r=await lk.acquire({holder:S.uid||('t'+Math.random()),ttlMs:9000}); if(!r.acquired) return false;
  try{ const g=await S.db.doc('config/manut').get(); const d=g.exists?(g.data()||{}):{}; const pp=(d.prev||[]).find(x=>x.id===p.id); if(!pp||pp.ativo===false) return false;
    if(!forcar&&(pp.osDe===pp.prox||mxOsPrev(pp))) return false; const e=(d.equips||[]).find(x=>x.id===pp.equip)||{};
    const agora=new Date(), loc=new Date(agora.getTime()-agora.getTimezoneOffset()*6e4).toISOString().slice(0,16);
    const doc=await mxNovaOS({linha:e.linha||'Outra',quando:loc,defeito:'PREVENTIVA: '+pp.tarefa,impacto:'nao',nome:'Preventiva programada',equip:e.nome||null,equipId:e.id||null,status:'Aberta',criado:agora.toISOString(),por:S.uid||null,prevId:pp.id,origem:'preventiva',exec:pp.resp?{tipo:'Preventiva',tecnico:pp.resp}:{tipo:'Preventiva'},hist:[{em:agora.toISOString(),por:S.uid||null,o:'OS de preventiva aberta: '+pp.tarefa+(pp.prox?' (prevista para '+dm(pp.prox)+')':'')}]});
    await mxGrava(c=>{ const x=c.prev.find(y=>y.id===pp.id); if(x){ x.osDe=pp.prox||hojeStr(); x.os=doc.numero; } }); return doc; }
  finally{ try{ await lk.release(); }catch(e){} } }
setInterval(async()=>{ const X=S.mx; if(X.gerando||!X.lido||!S.db||!viewOk('manch')||soVer&&typeof soVer==='function'&&soVer()) return; const h=hojeStr();
  const dev=(X.cfg.prev||[]).filter(p=>p.ativo!==false&&p.prox&&p.prox<=h&&p.osDe!==p.prox&&!mxOsPrev(p)); if(!dev.length) return; X.gerando=true;
  try{ for(const p of dev){ await mxGeraPrev(p,false); } }catch(e){ console.warn('preventiva',e); } X.gerando=false; },8000);
/* concluir a OS: próxima data da preventiva e baixa das peças */
{ const _ms=manStatus; manStatus=async function(c,st){ const antes=c.status; const r=await _ms.apply(this,arguments);
  try{ if(st==='Concluída'&&antes!=='Concluída'&&c.status==='Concluída'){
      if(c.prevId) await mxGrava(cf=>{ const x=cf.prev.find(y=>y.id===c.prevId); if(x){ const hj=hojeStr(); x.ultima=hj; x.prox=addDias(hj,Math.max(1,+x.freq||30)); } });
      const E=c.exec||{}; if((E.pecas||[]).length&&!E.pecasBaixa){ for(const [i,p] of E.pecas.entries()){ if(!(+p.qtd>0)) continue; /* id fixo por OS e item: repetir a baixa não duplica a saída */ await S.db.doc('pecasmov/osb_'+c._id+'_'+i).set({cod:p.cod||'',desc:p.desc||'',un:p.un||'un',qtd:-Math.abs(+p.qtd),tipo:'saida',os:c.numero,linha:c.linha||'',em:new Date().toISOString(),por:S.uid||null}); }
        const E2=Object.assign({},E,{pecasBaixa:true}); await S.db.doc('chamados/'+c._id).update({exec:E2}); c.exec=E2; toast('OS '+manNum(c.numero)+' concluída · '+E.pecas.length+' peça'+(E.pecas.length>1?'s':'')+' baixada'+(E.pecas.length>1?'s':'')+' do estoque.'); } } }
  catch(e){ console.warn('pós-conclusão',e); } return r; }; }

/* ---------- peças ---------- */
function mxSaldos(){ const s={}; (S.mx.movs||[]).forEach(m=>{ const k=m.cod||mxNorm(m.desc); const o=s[k]||(s[k]={cod:m.cod||'',desc:m.desc||'',un:m.un||'un',saldo:0,cons30:0}); o.saldo+=(+m.qtd||0); if(m.tipo==='saida'&&m.em&&Date.now()-new Date(m.em).getTime()<30*864e5) o.cons30+=Math.abs(+m.qtd||0); }); return s; }
function mxPecasCat(){ const s=mxSaldos(); const cad=(S.mx.cfg.pecas||[]).map(p=>Object.assign({},p,{saldo:(s[p.cod]||{}).saldo||0,cons30:(s[p.cod]||{}).cons30||0}));
  Object.values(s).forEach(o=>{ if(!cad.some(p=>p.cod===o.cod)) cad.push({cod:o.cod,desc:o.desc,un:o.un,min:0,saldo:o.saldo,cons30:o.cons30,solta:true}); }); return cad.sort((a,b)=>String(a.desc).localeCompare(String(b.desc))); }
function mxBuscaPeca(q){ q=mxNorm(q); if(!q) return null; const cad=mxPecasCat(); const it=(S.itens||[]).filter(i=>i.ativo!==false).map(i=>({cod:i.codigo||i._id,desc:i.descricao||i.desc||i.nome||'',un:i.unidade||'un'}));
  return [...cad,...it.filter(i=>!cad.some(c=>c.cod===i.cod))].find(p=>mxNorm(p.cod)===q||mxNorm(p.desc)===q||mxNorm(p.cod+' · '+p.desc)===q)||null; }
function mxDatalist(){ const cad=mxPecasCat(); const it=(S.itens||[]).filter(i=>i.ativo!==false&&!cad.some(c=>c.cod===(i.codigo||i._id))).slice(0,600);
  return `<datalist id="mx-pdl">${cad.map(p=>`<option value="${esc(p.cod?p.cod+' · '+p.desc:p.desc)}">${p.saldo!=null?'saldo '+p.saldo+' '+esc(p.un||''):''}</option>`).join('')}${it.map(i=>`<option value="${esc((i.codigo||i._id)+' · '+(i.descricao||''))}"></option>`).join('')}</datalist>`; }
function vManPecas(){ const X=S.mx, F=X.pc; if(!X.lido) return `${banner()}<section class="card"><div class="empty">Carregando…</div></section>`;
  const cat=mxPecasCat(), q=mxNorm(F.busca), lst=q?cat.filter(p=>mxNorm(p.cod+' '+p.desc).includes(q)):cat, baixo=cat.filter(p=>+p.min>0&&p.saldo<=+p.min);
  const movs=(X.movs||[]).slice(0,40);
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Peças</h1><div class="sub">O técnico escolhe as peças na OS e, ao concluir, elas saem do estoque sozinhas. Aqui você lança as entradas e vê o que está acabando.</div></div></div>
   ${mxDatalist()}
   ${baixo.length?`<section class="mp-alert" style="background:var(--warn-ink);animation:none">${ic('peca',22,2.2)}<div><b>${baixo.length} peça${baixo.length>1?'s':''} no mínimo ou abaixo</b><span>${baixo.slice(0,6).map(p=>esc(p.desc)+' ('+p.saldo+' '+esc(p.un||'')+')').join(' · ')}</span></div></section>`:''}
   <div class="two mp-two"><section class="card mx-new"><div class="label" style="margin-bottom:8px">ENTRADA DE PEÇAS (COMPRA, DEVOLUÇÃO)</div><div class="mx-nf"><input class="txt" id="mx-ent-p" list="mx-pdl" placeholder="Peça (código ou nome)" value="${esc(F.ent.cod)}" autocomplete="off"><label class="mx-in"><span>qtd</span><input class="txt num" id="mx-ent-q" type="number" min="0" step="any" value="${esc(F.ent.qtd)}"></label><input class="txt" id="mx-ent-o" placeholder="Obs. (nota, fornecedor)" value="${esc(F.ent.obs)}"><button class="btn" data-act="mx-ent">${ic('mais',18,2.4)}Lançar entrada</button></div>
     <div class="sub" style="font-size:12px;margin-top:8px">Para corrigir o saldo depois de contar, lance a diferença (ex.: −2). Nada é apagado: cada lançamento fica no histórico.</div></section>
    <section class="card mx-new"><div class="label" style="margin-bottom:8px">CADASTRAR PEÇA</div><div class="mx-nf"><input class="txt" id="mx-pc-c" placeholder="Código" value="${esc(F.cod)}"><input class="txt" id="mx-pc-d" placeholder="Descrição (ex.: Rolamento 6205)" value="${esc(F.desc)}"><input class="txt" id="mx-pc-u" placeholder="Un." value="${esc(F.un)}" style="max-width:80px"><label class="mx-in"><span>mín.</span><input class="txt num" id="mx-pc-m" type="number" min="0" value="${esc(F.min)}"></label><button class="btn" data-act="mx-pc-novo">${ic('check',18,2.4)}Cadastrar</button></div>
     <div class="sub" style="font-size:12px;margin-top:8px">Os itens do cadastro do painel (Ajustes → Itens) também aparecem na busca da OS.</div></section></div>
   <section class="card"><div class="head" style="align-items:center"><h2>Estoque de peças</h2><label class="eq-q" style="max-width:320px;flex:1">${ic('lupa',18,2)}<input class="txt" id="mx-pc-q" placeholder="Procurar peça…" value="${esc(F.busca)}"></label></div>
    ${lst.length?`<div class="mx-tw"><table class="mx-t"><thead><tr><th>Código</th><th>Peça</th><th class="r">Saldo</th><th class="r">Mínimo</th><th class="r">Usado em 30 dias</th><th></th></tr></thead><tbody>${lst.map(p=>`<tr class="${+p.min>0&&p.saldo<=+p.min?'crit':''}"><td class="num">${esc(p.cod||'—')}</td><td><b>${esc(p.desc)}</b>${p.solta?'<small>sem cadastro</small>':''}</td><td class="r num"><b>${p.saldo}</b> ${esc(p.un||'')}</td><td class="r num">${+p.min||'—'}</td><td class="r num">${p.cons30||'—'}</td><td class="r">${p.solta?`<button class="eq-lk" data-act="mx-pc-cad" data-c="${esc(p.cod)}" data-d="${esc(p.desc)}" data-u="${esc(p.un||'un')}">Cadastrar</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma peça ainda. Cadastre ao lado ou lance uma entrada.</div>'}</section>
   <section class="card"><h2>Últimos lançamentos</h2>${movs.length?movs.map(m=>`<div class="mx-mv ${+m.qtd<0?'s':'e'}"><span class="num">${m.em?dm(hojeStr(new Date(m.em)))+' '+hora(m.em):''}</span><b class="num">${+m.qtd>0?'+':''}${m.qtd} ${esc(m.un||'')}</b><span><b>${esc(m.desc||m.cod)}</b>${m.os?` · <button class="lnk" data-act="man-abrir" data-n="${m.os}" data-ir="1" style="padding:0">OS ${manNum(m.os)}</button>`:''}${m.obs?' · '+esc(m.obs):''}</span><small>${esc(nomeDe(m.por)||'')}</small></div>`).join(''):'<div class="empty">Nenhum lançamento ainda.</div>'}</section>`; }

/* ---------- equipamento e foto no chamado (formulário do painel e Tela da linha) ---------- */
function mxEqChips(linha,sel){ const es=mxEquips(linha); if(!es.length) return ''; return `<div class="mx-eqc"><span class="label">EQUIPAMENTO</span><div class="chips">${es.map(e=>`<button type="button" class="chip" data-act="mx-f-eq" data-id="${esc(e.id)}" aria-pressed="${sel===e.id}">${esc(e.nome)}</button>`).join('')}<button type="button" class="chip" data-act="mx-f-eq" data-id="" aria-pressed="${!sel}">Outro / não sei</button></div></div>`; }
function mxFotoCampo(){ const F=S.man.f||{}; return `<div class="mx-foto">${F.foto?`<img src="${F.foto}" alt="Foto do defeito"><button type="button" class="eq-lk del" data-act="mx-foto-x">${ic('lixo',15,2)}Tirar foto</button>`:`<label class="btn sec mx-fbt">${ic('foto',18,2)}Tirar foto do defeito (opcional)<input type="file" accept="image/*" capture="environment" id="mx-foto-in" hidden></label>`}</div>`; }
{ const _mf=manForm; manForm=function(){ const F=S.man.f||{}; let h=_mf(); const ch=mxEqChips(F.linha,F.equipId);
  if(ch) h=h.replace(/<label><span class="label">EQUIPAMENTO \(OPCIONAL\)<\/span>/,'<label style="display:none"><span class="label">EQUIPAMENTO (OPCIONAL)</span>');
  return h.replace('<label style="display:block;margin-top:12px"><span class="label">DEFEITO / PROBLEMA</span>',ch+(ch?'':'')+'<label style="display:block;margin-top:12px"><span class="label">DEFEITO / PROBLEMA</span>').replace('<div class="label" style="margin:12px 0 6px">IMPACTO NA PRODUÇÃO</div>',mxFotoCampo()+'<div class="label" style="margin:12px 0 6px">IMPACTO NA PRODUÇÃO</div>'); }; }
{ const _lf=manLtvForm; manLtvForm=function(l){ const F=S.man.f||{}; return _lf(l).replace('<div class="label" style="margin-top:12px">A LINHA…</div>',mxEqChips(l,F.equipId)+mxFotoCampo()+'<div class="label" style="margin-top:12px">A LINHA…</div>'); }; }
async function mxComprime(file){ const url=await new Promise((ok,er)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=er; r.readAsDataURL(file); });
  const img=await new Promise((ok,er)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=er; i.src=url; });
  let w=img.width, h=img.height, max=1280; if(Math.max(w,h)>max){ const k=max/Math.max(w,h); w=Math.round(w*k); h=Math.round(h*k); }
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h); let q=.72, d=cv.toDataURL('image/jpeg',q); while(d.length>700000&&q>.3){ q-=.12; d=cv.toDataURL('image/jpeg',q); } return d; }
document.addEventListener('change',async ev=>{ const t=ev.target; if(t.id!=='mx-foto-in'&&t.id!=='mx-foto-os') return; const f=t.files&&t.files[0]; if(!f) return;
  const alvo=t.id==='mx-foto-os'?+(t.dataset.n||S.man.cur):null; t.value='';
  let d; try{ d=await mxComprime(f); }catch(e){ console.warn('[manutenção] ler foto',e); toast('Não consegui ler a foto. Tente outra imagem.'); return; }
  if(t.id==='mx-foto-in'){ S.man.f=S.man.f||{}; S.man.f.foto=d; render(); return; }
  const c=manDoc(alvo); if(!c){ toast('A OS da foto não foi encontrada. Nada foi salvo.'); return; }
  try{ await mxSalvaFoto(c,d); }catch(e){ console.warn('[manutenção] salvar foto',e); manErro(e,'Não foi possível salvar a foto na OS '+manNum(c.numero)+'.'); } });
async function mxSalvaFoto(c,d){ if(S.mx._fotoGrav) { toast('Aguarde: a foto anterior ainda está sendo salva.'); return; } S.mx._fotoGrav=true; toast('Salvando foto…');
  try{ const id='f-'+mxId(), agora=new Date().toISOString();
    await S.db.doc('chamfotos/'+id).set({d,em:agora,por:S.uid||null,os:c.numero,chamado:c._id,equipId:c.equipId||null});
    const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Foto adicionada'}]).slice(-200);
    const u=c.foto?{fotos:(c.fotos||[]).concat([id]),hist}:{foto:id,hist}; await S.db.doc('chamados/'+c._id).update(u); Object.assign(c,u); S.mx.fotos[id]=d; toast('Foto anexada à OS '+manNum(c.numero)+'.'); render(); }
  finally{ S.mx._fotoGrav=false; } }
/* depois que o chamado é salvo pelo formulário do painel, grava a foto e o equipamento escolhido */
{ const _sv=manSalvar; manSalvar=async function(){ const F=S.man.f||{}, foto=F.foto; S.man._criado=null; await _sv.apply(this,arguments);
  const n=S.man._criado; S.man._criado=null; const c=n!=null&&manDoc(n); if(!c||!S.db||!foto) return;
  try{ await mxSalvaFoto(c,foto); }catch(e){ console.warn('[manutenção] foto do chamado',e); manErro(e,'O chamado OS '+manNum(c.numero)+' foi criado, mas a foto não foi salva. Abra a OS e adicione a foto de novo.'); } }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mx-f-eq"],[data-act="mx-foto-x"]'); if(!b) return; ev.stopPropagation(); const F=S.man.f=S.man.f||{};
  if(b.dataset.act==='mx-foto-x'){ F.foto=null; render(); return; }
  const e=b.dataset.id?mxEquip(b.dataset.id):null; F.equipId=e?e.id:''; F.equip=e?e.nome:''; render(); },true);
/* na OS: fotos e peças usadas */
async function mxFoto(id){ if(id in S.mx.fotos) return S.mx.fotos[id]; S.mx.fotos[id]=null; try{ const g=await S.db.doc('chamfotos/'+id).get(); S.mx.fotos[id]=g.exists?(g.data().d||''):''; }catch(e){ S.mx.fotos[id]=''; } rerenderSeguro(); return S.mx.fotos[id]; }
{ const _md=manDetalhe; manDetalhe=function(c){ let h=_md(c); const ids=[c.foto,...(c.fotos||[])].filter(Boolean); ids.forEach(id=>{ if(!(id in S.mx.fotos)) mxFoto(id); });
  const fotos=`<section class="card mx-fts"><div class="head" style="align-items:center"><div class="label">FOTOS</div><label class="btn sec" style="height:38px">${ic('foto',16,2)}Adicionar foto<input type="file" accept="image/*" capture="environment" id="mx-foto-os" data-n="${c.numero}" hidden></label></div>
    ${ids.length?`<div class="mx-ftg">${ids.map(id=>{ const d=S.mx.fotos[id]; return d?`<a href="${d}" target="_blank" rel="noopener"><img src="${d}" alt="Foto da OS"></a>`:`<div class="mx-ftl">${d===''?'foto indisponível':'carregando…'}</div>`; }).join('')}</div>`:'<div class="sub" style="font-size:13px;margin:0">Nenhuma foto. O operador pode mandar pelo QR ou a manutenção adiciona aqui.</div>'}</section>`;
  const E=c.exec||{}, ps=E.pecas||[], A=S.mx.add;
  const pecas=`<div class="mx-pecas"><span class="label">PEÇAS USADAS ${E.pecasBaixa?'<span class="pill ok" style="margin-left:6px">baixadas do estoque</span>':'<small style="font-weight:500;letter-spacing:0;text-transform:none;color:var(--muted)">· saem do estoque ao concluir</small>'}</span>
    ${ps.length?`<div class="mx-pl">${ps.map((p,i)=>`<div class="mx-pi"><b>${esc(p.desc||p.cod)}${p.obs?`<small style="display:block;font-weight:500;color:var(--muted)">${esc(p.obs)}</small>`:''}</b><span class="num">${esc(p.cod||'')}</span><span class="num"><b>${p.qtd}</b> ${esc(p.un||'')}</span>${E.pecasBaixa?'':`<button type="button" class="eq-lk del" data-act="mx-p-x" data-i="${i}" aria-label="Tirar">${ic('lixo',15,2)}</button>`}</div>`).join('')}</div>`:''}
    ${E.pecasBaixa?'':`<div class="mx-nf" style="margin-top:6px"><input class="txt" id="mx-p-c" list="mx-pdl" placeholder="Procurar peça (código ou nome)" value="${esc(A.cod)}" autocomplete="off"><label class="mx-in"><span>qtd</span><input class="txt num" id="mx-p-q" type="number" min="0" step="any" value="${esc(A.qtd)}"></label><input class="txt" id="mx-p-u" placeholder="Un." value="${esc(A.un||'')}" style="max-width:80px" aria-label="Unidade"><input class="txt" id="mx-p-o" placeholder="Observação (opcional)" value="${esc(A.obs||'')}" aria-label="Observação da peça"><button type="button" class="btn sec" data-act="mx-p-add">${ic('mais',16,2.4)}Adicionar peça</button></div>${mxDatalist()}`}</div>`;
  h=h.replace(/<label style="display:block;margin-top:10px"><span class="label">MATERIAIS \/ PEÇAS UTILIZADOS<\/span><textarea[^>]*data-man-e="materiais"[^>]*>[\s\S]*?<\/textarea><\/label>/,pecas);
  if(c.equipId||c.equip){ const e=c.equipId&&mxEquip(c.equipId); const z=e?mxConf(mxChamEquip(e),90):null; if(z&&z.n>1) h=h.replace('<section class="card man-at">',`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong)">${ic('engr',16,2)} <b>${esc(e.nome)}</b>: ${z.n} falhas em 90 dias · reparo médio ${mxHoras(z.mttr)}${z.mtbf!=null?' · uma falha a cada '+mxDias(z.mtbf):''}.</div><section class="card man-at">`); }
  return h.replace('<section class="card man-at">',fotos+'<section class="card man-at">'); }; }
async function mxPecasGrava(c,ps,nota){ const E=Object.assign({},c.exec||{},{pecas:ps,materiais:ps.map(p=>(p.desc||p.cod)+' — '+p.qtd+' '+(p.un||'')+(p.obs?' ('+p.obs+')':'')).join('\n')});
  const hist=nota?(c.hist||[]).concat([{em:new Date().toISOString(),por:S.uid||null,o:nota}]).slice(-200):c.hist; const u=nota?{exec:E,hist}:{exec:E};
  await S.db.doc('chamados/'+c._id).update(u); c.exec=E; if(nota) c.hist=hist; render(); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mx-"]'); if(!b||b.disabled) return; const a=b.dataset.act, X=S.mx;
  const v=id=>{ const e=document.getElementById(id); return e?String(e.value||'').trim():''; };
  try{
  if(a==='mx-p-add'){ const c=manDoc(S.man.cur); if(!c) return; const q=+String(v('mx-p-q')).replace(',','.'), t=v('mx-p-c'); if(!t||!(q>0)){ toast('Escolha a peça/material e a quantidade.'); return; }
    const p=mxBuscaPeca(t)||{cod:'',desc:t.replace(/^[^·]*·\s*/,'')||t,un:'un'}; const un=v('mx-p-u')||p.un||'un', obs=v('mx-p-o');
    const it={cod:p.cod||'',desc:p.desc||t,un,qtd:q}; if(obs) it.obs=obs.slice(0,200);
    b.disabled=true; try{ await mxPecasGrava(c,[...((c.exec||{}).pecas||[]),it],'Material registrado: '+it.desc+' — '+q+' '+un+(obs?' ('+obs+')':'')); X.add={cod:'',qtd:'1',un:'',obs:''}; toast('Material registrado na OS '+manNum(c.numero)+'.'); }
    catch(e){ console.warn('[manutenção] material',e); manErro(e,'Não foi possível registrar o material.'); b.disabled=false; } return; }
  if(a==='mx-p-x'){ const c=manDoc(S.man.cur); if(!c) return; const ps=[...((c.exec||{}).pecas||[])]; const tir=ps.splice(+b.dataset.i,1)[0]; b.disabled=true;
    try{ await mxPecasGrava(c,ps,'Material retirado: '+((tir&&(tir.desc||tir.cod))||'')); }catch(e){ console.warn('[manutenção] material',e); manErro(e,'Não foi possível retirar o material.'); b.disabled=false; } return; }
  if(a==='mx-eq-novo'||a==='mx-eq-sug'){ const l=a==='mx-eq-sug'?b.dataset.l:v('mx-eqn-l'), n=a==='mx-eq-sug'?b.dataset.n:v('mx-eqn-n'), t=a==='mx-eq-sug'?'':v('mx-eqn-t');
    if(!l||!n){ toast('Escolha a linha e escreva o nome.'); return; } if(mxEquips(l).some(e=>mxNorm(e.nome)===mxNorm(n))){ toast('Já existe '+n+' na '+l+'.'); return; }
    const id=mxId(); await mxGrava(cf=>{ cf.equips.push({id,linha:l,nome:n,tag:t||'',ativo:true,em:new Date().toISOString()}); });
    /* liga os chamados antigos com esse nome ao equipamento */
    for(const c of (S.chamados||[]).filter(c=>!c.equipId&&c.linha===l&&mxNorm(c.equip)===mxNorm(n)&&(+c.numero||0)<900000)){ try{ await S.db.doc('chamados/'+c._id).update({equipId:id}); c.equipId=id; }catch(e){} }
    X.eq={linha:l,nome:'',tag:'',ed:null}; toast(n+' cadastrado na '+l+'.'); render(); return; }
  if(a==='mx-eq-ed'){ const e=mxEquip(b.dataset.id); if(!e) return; X.eq={linha:e.linha,nome:e.nome,tag:e.tag||'',ed:e.id}; render(); return; }
  if(a==='mx-eq-x'){ X.eq={linha:'',nome:'',tag:'',ed:null}; render(); return; }
  if(a==='mx-eq-salvar'){ const id=X.eq.ed, n=v('mx-eq-n'), t=v('mx-eq-t'), l=v('mx-eq-l'); if(!n){ toast('Escreva o nome.'); return; } await mxGrava(cf=>{ const e=cf.equips.find(x=>x.id===id); if(e){ e.nome=n; e.tag=t; e.linha=l; } }); X.eq={linha:'',nome:'',tag:'',ed:null}; toast('Equipamento salvo.'); render(); return; }
  if(a==='mx-eq-conf'){ X.eq.conf=b.dataset.id; render(); return; }
  if(a==='mx-eq-del'){ const id=b.dataset.id; await mxGrava(cf=>{ const e=cf.equips.find(x=>x.id===id); if(e){ e.ativo=false; e.tiradoEm=new Date().toISOString(); } cf.prev.forEach(p=>{ if(p.equip===id) p.ativo=false; }); }); X.eq.conf=null; toast('Equipamento tirado da lista (o histórico fica).'); render(); return; }
  if(a==='mx-eq-prev'){ X.pv=Object.assign({},X.pv,{equip:b.dataset.id,tarefa:'',freq:'30',prox:hojeStr(),ed:null}); go('manprev'); setTimeout(()=>{ const i=$('#mx-pv-t'); i&&i.focus(); },60); return; }
  if(a==='mx-pv-fil'){ X.pv.fil=b.dataset.v; render(); return; }
  if(a==='mx-pv-ed'){ const p=(X.cfg.prev||[]).find(x=>x.id===b.dataset.id); if(!p) return; X.pv=Object.assign({},X.pv,{equip:p.equip,tarefa:p.tarefa,freq:String(p.freq),prox:p.prox||'',resp:p.resp||'',ed:p.id}); render(); return; }
  if(a==='mx-pv-x'){ X.pv=Object.assign({},X.pv,{equip:'',tarefa:'',freq:'30',prox:'',ed:null}); render(); return; }
  if(a==='mx-pv-salvar'){ const e=v('mx-pv-e'), t=v('mx-pv-t'), f=Math.round(+v('mx-pv-f')), p=v('mx-pv-p'); if(!e||!t||!(f>0)||!p){ toast('Preencha o equipamento, o que fazer, a frequência e a data.'); return; }
    const ed=X.pv.ed, resp=v('mx-pv-r'); b.disabled=true; await mxGrava(cf=>{ if(ed){ const x=cf.prev.find(y=>y.id===ed); if(x){ x.equip=e; x.tarefa=t; x.freq=f; x.resp=resp||null; if(x.prox!==p){ x.prox=p; x.osDe=null; } } } else cf.prev.push({id:mxId(),equip:e,tarefa:t,freq:f,prox:p,resp:resp||null,ativo:true,em:new Date().toISOString(),por:S.uid||null}); });
    X.pv=Object.assign({},X.pv,{equip:'',tarefa:'',freq:'30',prox:'',resp:'',ed:null}); toast(ed?'Preventiva salva.':'Preventiva cadastrada'+(p<=hojeStr()?': a OS abre em instantes.':' para '+dm(p)+'.')); render(); return; }
  if(a==='mx-pv-gerar'){ const p=(X.cfg.prev||[]).find(x=>x.id===b.dataset.id); if(!p) return; b.disabled=true; const d=await mxGeraPrev(p,true); toast(d?'OS '+manNum(d.numero)+' aberta para a preventiva.':'Não foi possível abrir agora. Tente de novo.'); render(); return; }
  if(a==='mx-pv-conf'){ X.pv.conf=b.dataset.id; render(); return; }
  if(a==='mx-pv-del'){ const id=b.dataset.id; await mxGrava(cf=>{ const x=cf.prev.find(y=>y.id===id); if(x){ x.ativo=false; x.tiradoEm=new Date().toISOString(); } }); X.pv.conf=null; toast('Preventiva tirada.'); render(); return; }
  if(a==='mx-pc-novo'||a==='mx-pc-cad'){ const c=a==='mx-pc-cad'?b.dataset.c:v('mx-pc-c'), d=a==='mx-pc-cad'?b.dataset.d:v('mx-pc-d'), u=(a==='mx-pc-cad'?b.dataset.u:v('mx-pc-u'))||'un', m=a==='mx-pc-cad'?0:+v('mx-pc-m')||0;
    if(!d){ toast('Escreva a descrição da peça.'); return; } const cod=c||('P'+Date.now().toString(36).toUpperCase().slice(-5)); if((X.cfg.pecas||[]).some(p=>p.cod===cod)){ toast('Já existe a peça '+cod+'.'); return; }
    await mxGrava(cf=>{ cf.pecas.push({cod,desc:d,un:u,min:m}); }); X.pc=Object.assign({},X.pc,{cod:'',desc:'',un:'un',min:''}); toast('Peça '+d+' cadastrada.'); render(); return; }
  if(a==='mx-ent'){ const t=v('mx-ent-p'), q=+String(v('mx-ent-q')).replace(',','.'), o=v('mx-ent-o'); if(!t||!q){ toast('Escolha a peça e a quantidade.'); return; }
    const p=mxBuscaPeca(t)||{cod:'',desc:t,un:'un'}; await S.db.collection('pecasmov').add({cod:p.cod||'',desc:p.desc||t,un:p.un||'un',qtd:q,tipo:q>0?'entrada':'ajuste',obs:o||null,em:new Date().toISOString(),por:S.uid||null});
    X.pc.ent={cod:'',qtd:'',obs:''}; toast((q>0?'Entrada':'Ajuste')+' lançado: '+q+' '+(p.un||'')+' de '+(p.desc||t)+'.'); render(); return; }
  }catch(e){ erro(e); } });
document.addEventListener('input',ev=>{ const t=ev.target, X=S.mx; if(!t.id||!t.id.startsWith('mx-')) return; const m={'mx-eqn-n':['eq','nome'],'mx-eqn-t':['eq','tag'],'mx-eq-n':['eq','nome'],'mx-eq-t':['eq','tag'],'mx-pv-t':['pv','tarefa'],'mx-pv-f':['pv','freq'],'mx-pv-r':['pv','resp'],'mx-pc-c':['pc','cod'],'mx-pc-d':['pc','desc'],'mx-pc-u':['pc','un'],'mx-pc-m':['pc','min'],'mx-p-c':['add','cod'],'mx-p-q':['add','qtd'],'mx-p-u':['add','un'],'mx-p-o':['add','obs']}[t.id];
  if(m){ X[m[0]][m[1]]=t.value; return; } if(t.id==='mx-ent-p') X.pc.ent.cod=t.value; if(t.id==='mx-ent-q') X.pc.ent.qtd=t.value; if(t.id==='mx-ent-o') X.pc.ent.obs=t.value;
  if(t.id==='mx-pc-q'){ X.pc.busca=t.value; const p=t.selectionStart; render(); const n=$('#mx-pc-q'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } } });
document.addEventListener('change',ev=>{ const t=ev.target, X=S.mx; if(t.id==='mx-eqn-l') X.eq.linha=t.value; if(t.id==='mx-pv-e') X.pv.equip=t.value; if(t.id==='mx-pv-p') X.pv.prox=t.value; if(t.id==='mx-eq-l') X.eq.linha=t.value; });
{ const _rs=rerenderSeguro; rerenderSeguro=function(){ const a=document.activeElement; if(a&&a.id&&a.id.startsWith('mx-')) return; return _rs.apply(this,arguments); }; }
/* cartões do quadro: câmera quando o chamado tem foto */
{ const _it=mpItem; mpItem=function(r,hj){ let h=_it(r,hj); if(r.c.foto) h=h.replace('<span class="mp-st">',`<span class="mx-cam" title="Tem foto">${ic('foto',14,2)}</span><span class="mp-st">`); if(r.c.prevId) h=h.replace('<span class="mp-st">','<span class="pill ok" style="font-size:10.5px;padding:1px 7px">preventiva</span><span class="mp-st">'); return h; }; }

document.head.insertAdjacentHTML('beforeend',`<style id="mx-css">
.mx-hd .mx-tvclk{display:none}body.ltv-k .mx-hd .mx-tvclk{display:block;order:2;margin-left:auto;font-size:54px;font-weight:800;color:var(--teal-strong);line-height:1}
body.ltv-k .mx-hd{align-items:center}body.ltv-k .mx-hd .mp-acts .seg,body.ltv-k .mx-hd .mp-data,body.ltv-k .mx-hd [data-go="manqr"]{display:none}
.mx-nf{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mx-nf>.txt{flex:1 1 200px;height:44px;width:auto;min-width:0}.mx-nf>select.txt{flex:0 1 220px}.mx-nf .btn{height:44px}
.mx-in{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);font-weight:600}.mx-in .txt{width:96px;height:44px}.mx-in input[type=date]{width:auto}
.mx-er{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line-2);flex-wrap:wrap}.mx-er:first-of-type{border-top:0}.mx-er.ed .txt{flex:1 1 160px;height:42px;width:auto}.mx-er.ed .btn{height:42px}
.mx-eic{width:38px;height:38px;border-radius:10px;background:var(--teal-wash);color:var(--teal-strong);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mx-en{flex:1 1 240px;min-width:0}.mx-en b{display:block;font-size:15px}.mx-en small{color:var(--muted);font-size:12.5px}
.mx-ea{display:flex;gap:4px 14px;flex-wrap:wrap;align-items:center}.mx-ea .eq-lk.del{margin-left:0}
.mx-pv{display:grid;grid-template-columns:86px minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line-2)}.mx-pv:first-of-type{border-top:0}
.mx-pvd b{display:block;font-size:17px}.mx-pvd small{font-size:11.5px;color:var(--muted)}.mx-pv.atrasada .mx-pvd b{color:var(--crit-ink)}.mx-pv.hoje .mx-pvd b{color:var(--warn-ink)}
.mx-pvt b{display:block;font-size:15px}.mx-pvt small{color:var(--muted);font-size:12.5px}.mx-pvf{grid-column:1/-1;padding:10px;border-radius:12px;background:var(--teal-wash)}
.mx-k{grid-template-columns:repeat(6,minmax(0,1fr))}
.mx-prevhj .mx-pr{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:10px 0;border-top:1px solid var(--line-2)}.mx-prevhj .mx-pr:first-of-type{border-top:0}.mx-pr b{display:block}.mx-pr small{color:var(--muted);font-size:12.5px}.mx-pr.atrasada b{color:var(--crit-ink)}.mx-prevhj h2{display:flex;gap:8px;align-items:center}
.mx-tw{overflow-x:auto}.mx-t{width:100%;border-collapse:collapse;font-size:13.5px}.mx-t th{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-align:left;padding:8px;border-bottom:1px solid var(--line);white-space:nowrap}
.mx-t td{padding:9px 8px;border-bottom:1px solid var(--line-2);vertical-align:top}.mx-t td small{display:block;color:var(--muted);font-size:11.5px}.mx-t .r{text-align:right;white-space:nowrap}.mx-t tr.crit td:first-child{box-shadow:inset 4px 0 0 var(--crit)}.mx-t tr.warn td:first-child{box-shadow:inset 4px 0 0 var(--warn)}.t-mut{color:var(--muted)}
.mx-mm{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:end;height:150px;margin-top:12px}.mx-m{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}.mx-m span{font-size:12px;color:var(--muted);text-transform:capitalize}.mx-m b{font-size:13px}
.mx-mb{width:60%;max-width:46px;flex:1;display:flex;flex-direction:column-reverse;border-radius:8px 8px 0 0;overflow:hidden;background:var(--sunken)}.mx-mb i{display:block;background:var(--teal)}.mx-mb i.p{background:var(--ok)}
.mx-pb{display:inline-block;width:var(--w);max-width:40px;height:6px;border-radius:3px;background:var(--crit);opacity:.6;margin-right:6px;vertical-align:1px}
.mx-mv{display:grid;grid-template-columns:110px 90px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line-2);font-size:13.5px}.mx-mv:first-of-type{border-top:0}.mx-mv>span:first-child{color:var(--muted)}.mx-mv.e>b{color:var(--ok-ink)}.mx-mv.s>b{color:var(--crit-ink)}.mx-mv small{color:var(--muted)}
.mx-eqc{margin-top:12px}.mx-eqc .chips{margin-top:6px}.mx-foto{margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.mx-foto img{max-height:120px;border-radius:10px;box-shadow:var(--shadow)}.mx-fbt{cursor:pointer;height:46px}
.mx-fts .head{margin-bottom:10px}.mx-ftg{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.mx-ftg img{width:100%;height:180px;object-fit:cover;border-radius:10px;display:block}.mx-ftl{height:180px;border-radius:10px;background:var(--sunken);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px}
.mx-pecas{margin-top:10px;display:flex;flex-direction:column;gap:6px}.mx-pl{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:10px;overflow:hidden}.mx-pi{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:12px;align-items:center;padding:8px 12px;border-top:1px solid var(--line-2);font-size:14px}.mx-pi:first-child{border-top:0}.mx-pi>span{color:var(--muted)}
.mx-cam{color:var(--teal-strong);display:inline-flex;margin-left:auto;margin-right:6px}
@media (max-width:860px){ .mx-pv{grid-template-columns:70px minmax(0,1fr)} .mx-pv .pill,.mx-pv .mx-ea{grid-column:2} .mx-k{grid-template-columns:repeat(2,minmax(0,1fr))} .mx-mv{grid-template-columns:80px 70px minmax(0,1fr)} .mx-mv small{display:none} .mx-nf>select.txt{flex:1 1 100%} }
</style>`);
/* ===FIM MANX=== */
/* ===================== MANUTENÇÃO 3 (06/10): causa ao concluir e aviso de chamado sem atendimento ===================== */
const MZ_CAUSAS=['Mecânica','Elétrica','Pneumática / hidráulica','Ajuste / regulagem','Operacional','Desgaste de peça','Outra'];
const MZ_LIM_PADRAO={parou:15,outro:30};
S.mz={conc:null,avisados:{},ultBip:0};
function mzLim(){ const l=(S.mx&&S.mx.cfg&&S.mx.cfg.limites)||{}; return {parou:+l.parou||MZ_LIM_PADRAO.parou,outro:+l.outro||MZ_LIM_PADRAO.outro}; }
/* ---------- concluir: pede a causa e o que foi feito (uma vez por OS) ---------- */
{ const _ms=manStatus; manStatus=async function(c,st){ if(st==='Concluída'&&c&&c.status!=='Concluída'&&!c._mzOk){ const E=c.exec||{}; /* sempre confirma com os dados mínimos: causa, serviço realizado e responsável */
    S.mz.conc={n:c.numero,causa:E.causa||'',txt:E.servicos||'',tec:E.tecnico||(S.uid&&S.nomes[S.uid])||'',diag:E.diagnostico||'',prev:!!c.prevId}; render(); setTimeout(()=>{ const t=document.getElementById('mz-txt'); t&&t.focus(); },60); return; }
  return _ms.apply(this,arguments); }; }
function mzModal(){ const Z=S.mz.conc, c=Z&&manDoc(Z.n); if(!c) return '';
  return `<div class="dbmodal eq-modal" data-mz-fundo="1"><div class="dbmbox eq-box sm mz-box" role="dialog" aria-modal="true" aria-labelledby="mz-t">
   <div class="eyebrow">CONCLUIR OS ${manNum(c.numero)} · ${esc(c.linha||'')}</div><h2 id="mz-t" style="margin:4px 0 2px">${esc(String(c.defeito||'').slice(0,80))}</h2><div class="sub" style="margin:0 0 14px">${esc(c.equip||'')}${c.paradaId?' · a parada da linha também é encerrada':''}</div>
   <div class="label" style="margin-bottom:8px">${Z.prev?'TIPO DO SERVIÇO':'O QUE CAUSOU?'}</div>
   <div class="mz-cs">${(Z.prev?['Preventiva feita','Preventiva com troca de peça','Preventiva com problema encontrado']:MZ_CAUSAS).map(k=>`<button type="button" class="mz-c" data-act="mz-causa" data-v="${esc(k)}" aria-pressed="${Z.causa===k}">${esc(k)}</button>`).join('')}</div>
   <label style="display:block;margin-top:14px"><span class="label">DIAGNÓSTICO (OPCIONAL)</span><input class="txt" id="mz-diag" value="${esc(Z.diag||'')}" placeholder="Ex.: rolamento travado por falta de lubrificação" style="margin-top:6px"></label>
   <label style="display:block;margin-top:14px"><span class="label">SERVIÇO REALIZADO *</span><textarea class="txt" id="mz-txt" rows="3" placeholder="Ex.: troquei a correia e regulei a tensão" style="margin-top:6px">${esc(Z.txt)}</textarea></label>
   <label style="display:block;margin-top:14px"><span class="label">RESPONSÁVEL PELA EXECUÇÃO *</span><input class="txt" id="mz-tec" value="${esc(Z.tec||'')}" style="margin-top:6px"></label>
   ${((c.exec||{}).pecas||[]).length?`<div class="sub" style="margin:10px 0 0;font-size:12.5px">Materiais registrados: ${esc(((c.exec||{}).pecas||[]).map(p=>(p.desc||p.cod)+' '+p.qtd+' '+(p.un||'')).join(' · '))}</div>`:''}
   <div class="eq-err" id="mz-err"></div>
   <div class="eq-mf" style="border:0;padding:14px 0 0"><button class="btn sec" data-act="mz-x">Voltar</button><button class="btn" data-act="mz-ok" style="background:var(--ok-ink)">${ic('check',18,2.6)}Concluir OS</button></div></div></div>`; }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ let el=document.getElementById('mz-ov'); const h=S.mz.conc?mzModal():'';
    if(!h){ if(el) el.remove(); return x; } if(!el){ el=document.createElement('div'); el.id='mz-ov'; document.body.appendChild(el); }
    const t=document.getElementById('mz-txt'), foco=t&&document.activeElement===t, pos=t&&t.selectionStart; el.innerHTML=h; if(foco){ const n=document.getElementById('mz-txt'); n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } }catch(e){} return x; }; }
document.addEventListener('input',ev=>{ const Z=S.mz.conc; if(!Z) return; if(ev.target.id==='mz-txt') Z.txt=ev.target.value; if(ev.target.id==='mz-tec') Z.tec=ev.target.value; if(ev.target.id==='mz-diag') Z.diag=ev.target.value; });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mz-"]'), f=ev.target.closest&&ev.target.closest('[data-mz-fundo]');
  if(!b){ if(f&&ev.target===f){ S.mz.conc=null; render(); } return; } const Z=S.mz.conc; if(!Z) return; const a=b.dataset.act;
  if(a==='mz-x'){ S.mz.conc=null; render(); return; }
  if(a==='mz-causa'){ Z.causa=b.dataset.v; render(); return; }
  if(a==='mz-ok'){ const c=manDoc(Z.n); if(!c) return; const er=document.getElementById('mz-err'), falta=m=>{ if(er) er.textContent=m; };
    if(!Z.causa) return falta(Z.prev?'Escolha o tipo do serviço.':'Escolha o que causou o problema.');
    if(String(Z.txt||'').trim().length<3) return falta('Descreva o serviço realizado.');
    if(String(Z.tec||'').trim().length<2) return falta('Informe o responsável pela execução.');
    b.disabled=true; b.textContent='Concluindo…';
    try{ const E=Object.assign({},c.exec||{},{causa:Z.causa,servicos:String(Z.txt).trim(),tecnico:String(Z.tec).trim()}); if(String(Z.diag||'').trim()) E.diagnostico=String(Z.diag).trim();
      await S.db.doc('chamados/'+c._id).update({exec:E}); c.exec=E; S.mz.conc=null; c._mzOk=true; await manStatus(c,'Concluída'); delete c._mzOk; }
    catch(e){ b.disabled=false; console.warn('[manutenção] concluir',e); manErro(e,'Não foi possível concluir a OS. Nada foi perdido: tente de novo.'); } render(); } });
/* a causa aparece no Resumo (30 dias) e no cartão concluído */
function mzCausas(){ const ini=Date.now()-30*864e5, cnt={}; (S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.prevId&&c.status==='Concluída'&&c.concluidoEm&&new Date(c.concluidoEm).getTime()>=ini).forEach(c=>{ const k=(c.exec&&c.exec.causa)||'Sem causa'; cnt[k]=(cnt[k]||0)+1; }); return Object.entries(cnt).sort((a,b)=>b[1]-a[1]); }
{ const _vp=vManPainel; vManPainel=function(){ const h=_vp(); const cs=mzCausas(); const mx=Math.max(1,...cs.map(x=>x[1]));
  const card=`<section class="card"><div class="head" style="align-items:baseline"><h2>Causas das falhas</h2><span class="sub" style="margin:0">corretivas concluídas · 30 dias</span></div>${cs.length?`<div class="mp-bars">${cs.map(([k,n])=>`<div class="mp-br"><span>${esc(k)}</span><div class="mp-bt"><i style="width:${n/mx*100}%;${k==='Sem causa'?'background:var(--faint)':''}"></i></div><b class="num">${n}</b></div>`).join('')}</div>`:'<div class="empty">A causa é escolhida ao concluir cada OS. Os números aparecem aqui.</div>'}</section>`;
  return h+`<div class="two mp-two">${card}<section class="card"><div class="head" style="align-items:baseline"><h2>Aviso de chamado sem atendimento</h2></div><div class="sub" style="margin:0 0 10px">Avisa no sino, com som e notificação, quando ninguém assumiu o chamado depois de:</div>
    <div class="mx-nf"><label class="mx-in"><span>máquina parada</span><input class="txt num" id="mz-lp" type="number" min="1" value="${mzLim().parou}"><span>min</span></label><label class="mx-in"><span>outros</span><input class="txt num" id="mz-lo" type="number" min="1" value="${mzLim().outro}"><span>min</span></label><button class="btn sec" data-act="mzl-salvar">Salvar</button></div></section></div>`; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mzl-salvar"]'); if(!b) return; const p=Math.max(1,+document.getElementById('mz-lp').value||15), o=Math.max(1,+document.getElementById('mz-lo').value||30);
  try{ await mxGrava(cf=>{ cf.limites={parou:p,outro:o}; }); S.mx.cfg.limites={parou:p,outro:o}; toast('Aviso: '+p+' min com máquina parada, '+o+' min nos outros.'); render(); }catch(e){ erro(e); } });
/* ---------- aviso de chamado esquecido ---------- */
function mzAtrasados(){ const L=mzLim(), ag=Date.now(); return (S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.prevId&&c.status==='Aberta'&&c.criado&&(+c.numero||0)<900000).map(c=>({c,min:Math.round((ag-new Date(c.criado).getTime())/6e4)})).filter(x=>x.min>=(x.c.impacto==='parou'?L.parou:L.outro)); }
NAV_EXTRA.push(()=>{ try{ if(!viewOk('manch')) return []; const xs=mzAtrasados(); if(!xs.length) return []; const pior=xs.sort((a,b)=>b.min-a.min)[0];
  return [{n:xs.length,t:'Chamado'+(xs.length>1?'s':'')+' sem atendimento',s:'OS '+manNum(pior.c.numero)+' · '+pior.c.linha+' · há '+manDur(pior.min),acao:'manch',c:'crit'}]; }catch(e){ return []; } });
setInterval(()=>{ try{ if(!S.acs||!S.acs.pronto||!viewOk('manch')) return; for(const {c,min} of mzAtrasados()){ const k=c._id+'|'+(min>=2*(c.impacto==='parou'?mzLim().parou:mzLim().outro)?2:1); if(S.mz.avisados[k]) continue; S.mz.avisados[k]=1;
      toast('⚠ OS '+manNum(c.numero)+' · '+c.linha+': ninguém assumiu há '+manDur(min)+'.'); if(S.man.som&&typeof manBip==='function'){ manBip(); setTimeout(manBip,900); }
      try{ if('Notification' in window&&Notification.permission==='granted'&&document.hidden){ const n=new Notification('Chamado sem atendimento · '+c.linha,{body:'OS '+manNum(c.numero)+' · há '+manDur(min)+' · '+String(c.defeito||'').slice(0,80),tag:'atraso-'+c._id,icon:'icons/icon-192.png'}); n.onclick=()=>{ window.focus(); S.man.cur=c.numero; go('manch'); n.close(); }; } }catch(e){}
      try{ rerenderSeguro(); }catch(e){} break; } }catch(e){} },20000);
/* o cartão do quadro mostra a causa quando concluído */
{ const _it=mpItem; mpItem=function(r,hj){ let h=_it(r,hj); const k=r.c.exec&&r.c.exec.causa; if(k&&r.fase==='co') h=h.replace('<div class="mp-ft">',`<div class="mp-meta"><span class="mp-imp">causa: ${esc(k)}</span></div><div class="mp-ft">`); return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="mz-css">
#mz-ov .dbmodal{z-index:970}.mz-box{max-width:520px}.mz-cs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.mz-c{min-height:50px;padding:8px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);font:inherit;font-size:14.5px;font-weight:700;color:var(--ink);cursor:pointer;text-align:left}
.mz-c:hover{border-color:var(--teal)}.mz-c[aria-pressed="true"]{border:2px solid var(--ok-ink);background:var(--ok-tint);color:var(--ok-ink)}
@media (max-width:480px){ .mz-cs{grid-template-columns:minmax(0,1fr)} }
</style>`);
/* ===FIM MANZ=== */
/* ===================== LEITOR DE CÓDIGO DE BARRAS (06/10): códigos das linhas para o coletor (laser, lê só barras) ===================== */
/* O leitor funciona como teclado: digita o código e dá Enter. CH-<LINHA> abre o chamado daquela linha (no modo tablet, troca a linha);
   RA-<nº> abre o rancho no diário de bordo. */
const CB_LIB='https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js';
S.cb={modo:'qr',ultimo:null};
try{ S.cb.modo=localStorage.getItem('painel.qrmodo')==='barras'?'barras':'qr'; }catch(e){}
function cbSlug(l){ return String(l||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function cbCodLinha(l){ return 'CH-'+cbSlug(l); }
function cbLinhaDe(cod){ const s=String(cod||'').toUpperCase().replace(/^CH-?/,''); return manLinhas().find(l=>cbSlug(l)===s)||''; }
async function cbLib(){ if(window.JsBarcode) return; await carregarScript(CB_LIB); }
function cbSvg(cod,alt){ return `<svg class="cb-svg" data-cb="${esc(cod)}" data-cb-h="${alt||70}" role="img" aria-label="Código de barras ${esc(cod)}"></svg>`; }
async function cbPinta(){ const els=[...document.querySelectorAll('svg.cb-svg[data-cb]:not([data-ok])')]; if(!els.length) return; try{ await cbLib(); }catch(e){ els.forEach(x=>x.outerHTML='<div class="sub">Não consegui carregar o gerador de código de barras. Recarregue a página.</div>'); return; }
  els.forEach(el=>{ try{ window.JsBarcode(el,el.dataset.cb,{format:'CODE128',height:+el.dataset.cbH||70,width:2,displayValue:true,fontSize:14,margin:8,background:'#ffffff'}); el.dataset.ok='1'; }catch(e){} }); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); setTimeout(cbPinta,0); return x; }; }

/* ---------- tela QR das linhas: opção "Código de barras (leitor)" ---------- */
{ const _vq=vManQr; vManQr=function(){ const h=_vq(); const L=linhasOrd(), U=S.cb.ultimo;
  const seg=`<div class="cb-top"><div class="seg" role="group" aria-label="Tipo de código"><button data-act="cb-modo" data-v="qr" aria-pressed="${S.cb.modo==='qr'}">QR · celular</button><button data-act="cb-modo" data-v="barras" aria-pressed="${S.cb.modo==='barras'}">Código de barras · leitor</button></div>
    ${S.cb.modo==='barras'?`<div class="cb-teste ${U?(U.ok?'ok':'err'):''}">${ic('grid',18,2)}<span>${U?(U.ok?'Leu <b>'+esc(U.cod)+'</b> → '+esc(U.txt):'Leu <b>'+esc(U.cod)+'</b>, mas não é um código do painel'):'Teste o leitor: bipe qualquer código desta página.'}</span></div>`:''}</div>`;
  if(S.cb.modo!=='barras') return h.replace('<div class="man-qrs" id="man-qrs">',seg+'<div class="man-qrs" id="man-qrs">');
  const cards=L.map(l=>`<div class="man-qr cb-card"><div class="man-qr-t">CHAMADO DE MANUTENÇÃO</div><b>${esc(l)}</b>${cbSvg(cbCodLinha(l),80)}<small>Bipe com o leitor no computador do painel</small></div>`).join('');
  return h.replace(/<button class="btn" data-act="man-qr-imp">[\s\S]*?<\/button>/,`<button class="btn" data-act="cb-pdf">${ic('baixar',18,2)}Baixar PDF dos códigos</button>`)
    .replace(/<div class="man-qrs" id="man-qrs">[\s\S]*$/,seg+`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong);margin-bottom:12px">O leitor laser lê só código de barras (não lê QR). Ele funciona no computador que está com o painel aberto: bipou o código da linha, abre o chamado dela. No modo tablet, troca a linha.</div><div class="man-qrs cb-grid">${cards}</div>`); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cb-modo"],[data-act="cb-pdf"]'); if(!b) return;
  if(b.dataset.act==='cb-modo'){ S.cb.modo=b.dataset.v; try{ localStorage.setItem('painel.qrmodo',S.cb.modo); }catch(e){} render(); return; }
  cbPdf(); });
async function cbPdf(){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } try{ await cbLib(); }catch(e){ toast('Não consegui carregar o gerador de código de barras.'); return; }
  const L=linhasOrd(), pdf=new window.jspdf.jsPDF('p','mm','a4'), W=210, cw=95, ch=66, mx=(W-2*cw)/2, my=10;
  L.forEach((l,i)=>{ const k=i%8; if(i&&k===0) pdf.addPage(); const x=mx+(k%2)*cw, y=my+Math.floor(k/2)*ch;
    pdf.setDrawColor(150); pdf.setLineDashPattern([1.5,1.5],0); pdf.rect(x+3,y+3,cw-6,ch-6); pdf.setLineDashPattern([],0);
    pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.setTextColor(31,56,100); pdf.text('CHAMADO DE MANUTENÇÃO',x+cw/2,y+11,{align:'center'});
    pdf.setFontSize(18); pdf.setTextColor(0,0,0); pdf.text(l,x+cw/2,y+20,{align:'center'});
    const cv=document.createElement('canvas'); window.JsBarcode(cv,cbCodLinha(l),{format:'CODE128',height:90,width:3,displayValue:true,fontSize:22,margin:10,background:'#ffffff'});
    const iw=78, ih=iw*cv.height/cv.width; pdf.addImage(cv.toDataURL('image/png'),'PNG',x+(cw-iw)/2,y+24,iw,Math.min(ih,34));
    pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(90,90,90); pdf.text('Bipe com o leitor no computador do painel',x+cw/2,y+ch-7,{align:'center'}); pdf.setTextColor(0,0,0); });
  await manBaixar(pdf,'Codigos_barras_linhas.pdf','PDF com '+L.length+' códigos de barras gerado. Abra e imprima.'); }

/* ---------- o que o leitor digitar ---------- */
S.cb.buf=''; S.cb.t=0; S.cb.inicio=null;
document.addEventListener('keydown',ev=>{ if(ev.ctrlKey||ev.altKey||ev.metaKey) return; const agora=performance.now(), gap=agora-S.cb.t; S.cb.t=agora;
  if(ev.key==='Enter'){ const cod=S.cb.buf; S.cb.buf=''; if(((cod.length>=4&&(/^(CH|RA|EQ|OP)-/i.test(cod)||/^CX[A-Z0-9]{8}$/i.test(cod)||/CRACHA/i.test(cod)||/(rancho|chamado|equip)=/i.test(cod)))||crPorAdesivo(cod))&&gap<(S.view==='mantotem'?400:120)){ const a=document.activeElement;
      if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')&&typeof a.value==='string'&&a.value.toUpperCase().endsWith(cod.toUpperCase())){ a.value=a.value.slice(0,a.value.length-cod.length); a.dispatchEvent(new Event('input',{bubbles:true})); }
      ev.preventDefault(); ev.stopPropagation(); cbLeu(cod); } return; }
  if(ev.key&&ev.key.length===1){ if(gap>(S.view==='mantotem'?300:80)) S.cb.buf=''; else if(S.cb.buf&&gap<50) ev.stopImmediatePropagation(); /* rajada do leitor: não dispara os atalhos do teclado (N, A, P, F) */ S.cb.buf+=ev.key; if(S.cb.buf.length>40) S.cb.buf=S.cb.buf.slice(-40); } },true);
function cbLeu(cod){ cod=String(cod).toUpperCase(); { const ad=crPorAdesivo(cod); if(ad){ crColetor(ad.codigo||ad._id); return; } } /* crachá de adesivo (código de barras próprio da empresa) */ const mcr=cod.match(/^CX([A-Z0-9]{8})$/)||cod.match(/CRACHA\W*([A-Z0-9]{8})$/); if(mcr){ crColetor(mcr[1]); return; } const naTela=S.view==='manqr'&&S.cb.modo==='barras';
  if(cod.startsWith('CH-')){ const l=cbLinhaDe(cod); if(!l){ S.cb.ultimo={cod,ok:false}; toast('Código '+cod+' não é de nenhuma linha.'); if(naTela) render(); return; }
    if(naTela){ S.cb.ultimo={cod,ok:true,txt:'abre o chamado da '+l}; render(); toast('Leitor funcionando: '+l+'.'); return; }
    if(typeof tabOn==='function'&&tabOn()&&linhasOrd().includes(l)){ tabSet(l); go('linhatv'); toast('Tablet: '+l); return; }
    if(!viewOk('manch')){ toast('Seu acesso não inclui abrir chamados.'); return; }
    if(S.view==='linhatv'&&typeof manLtvForm==='function'){ manNovo(l); S.man.novo=false; if(S.paradas.some(p=>p.linha===l&&!p.fim)) S.man.f.impacto='parou'; S.man.ltv=l; render(); return; }
    manNovo(l); S.man.cur=null; go('manch'); setTimeout(()=>{ const x=$('#man-form'); x&&x.scrollIntoView({block:'start'}); const ta=document.querySelector('[data-man="defeito"]'); ta&&ta.focus(); },80); toast('Chamado da '+l); return; }
  if(cod.startsWith('RA-')){ const n=cod.slice(3).replace(/\D/g,''); if(naTela){ S.cb.ultimo={cod,ok:true,txt:'abre o rancho '+n}; render(); return; }
    if(!viewOk('diario')){ toast('Seu acesso não inclui o diário de bordo.'); return; } go('diario'); setTimeout(()=>{ if(!dbAbrirRancho(n)) toast('Rancho '+n+' não encontrado.'); },120); return; } }
document.head.insertAdjacentHTML('beforeend',`<style id="cb-css">
.cb-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 14px}.cb-top .seg button{height:40px}
.cb-teste{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:var(--sunken);color:var(--ink-2);font-size:14px;border:1.5px dashed var(--line)}
.cb-teste.ok{background:var(--ok-tint);color:var(--ok-ink);border-style:solid;border-color:var(--ok)}.cb-teste.err{background:var(--crit-tint);color:var(--crit-ink);border-style:solid;border-color:var(--crit)}
.cb-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important}.cb-card b{font-size:22px}.cb-svg{max-width:100%;height:auto}
</style>`);
/* ===FIM CB=== */
/* ===================== APAGAR OS (07/10): a responsável apaga chamados de teste ===================== */
/* Só a dona (ou cargo com tudo). Apaga a OS, a parada que ela abriu, as fotos e devolve ao estoque as peças baixadas. */
S.ax={conf:null,ap:false};
function axPode(){ try{ return dbMaster(); }catch(e){ return !!(S.acs&&S.acs.dono); } }
{ const _md=manDetalhe; manDetalhe=function(c){ let h=_md.apply(this,arguments); if(!axPode()||!c) return h;
  const conf=S.ax.conf===c.numero, par=c.paradaId&&S.paradas.find(p=>p._id===c.paradaId), E=c.exec||{}, nf=(c.foto?1:0)+(c.fotos||[]).length, pcs=E.pecasBaixa?(E.pecas||[]).filter(p=>+p.qtd>0).length:0;
  const bt=`<button class="btn sec ax-del" data-act="ax-conf" data-n="${c.numero}">${ic('lixo',18,2)}Apagar OS</button>`;
  h=h.replace('<button class="btn sec" data-act="man-imprimir">',bt+'<button class="btn sec" data-act="man-imprimir">');
  if(!conf) return h;
  const itens=['a OS some de todas as telas, indicadores e do histórico'];
  if(par) itens.push('a parada da '+esc(par.linha)+' que ela abriu também é apagada');
  if(nf) itens.push(nf===1?'a foto é apagada':nf+' fotos são apagadas');
  if(pcs) itens.push('as peças que saíram do estoque voltam para o saldo');
  const box=`<section class="card ax-box" role="alertdialog" aria-labelledby="ax-t"><h2 id="ax-t" style="margin:0 0 6px">Apagar a OS ${manNum(c.numero)} de vez?</h2><div class="sub" style="margin:0 0 10px">Use para chamados de teste ou abertos por engano. Não dá para desfazer.</div><ul class="ax-ul">${itens.map(x=>'<li>'+x+'</li>').join('')}</ul>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn sec" data-act="ax-x">Voltar</button><button class="btn ax-sim" data-act="ax-sim" data-n="${c.numero}" ${S.ax.ap?'disabled':''}>${ic('lixo',18,2)}${S.ax.ap?'Apagando…':'Sim, apagar a OS '+manNum(c.numero)}</button></div></section>`;
  const i=h.indexOf('<section class="card">'); return i<0?box+h:h.slice(0,i)+box+h.slice(i); }; }
async function axApagar(n){ const c=manDoc(n); if(!c||!S.db) return; S.ax.ap=true; render();
  try{ const E=c.exec||{};
    if(c.paradaId){ try{ await S.db.doc('paradas/'+c.paradaId).delete(); S.paradas=S.paradas.filter(p=>p._id!==c.paradaId); }catch(e){} }
    for(const f of [c.foto,...(c.fotos||[])].filter(Boolean)){ try{ await S.db.doc('chamfotos/'+f).delete(); }catch(e){} }
    if(E.pecasBaixa){ for(const p of (E.pecas||[])){ if(!(+p.qtd>0)) continue; await S.db.collection('pecasmov').add({cod:p.cod||'',desc:p.desc||'',un:p.un||'un',qtd:Math.abs(+p.qtd),tipo:'ajuste',obs:'OS '+manNum(c.numero)+' apagada',os:c.numero,em:new Date().toISOString(),por:S.uid||null}); } }
    await S.db.doc('chamados/'+c._id).delete();
    S.chamados=(S.chamados||[]).filter(x=>x._id!==c._id); S.ax.conf=null; S.man.cur=null; S.man.ed=null; toast('OS '+manNum(n)+' apagada.');
  }catch(e){ erro(e); }
  S.ax.ap=false; render(); window.scrollTo(0,0); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ax-"]'); if(!b||!axPode()) return; const a=b.dataset.act;
  if(a==='ax-conf'){ S.ax.conf=+b.dataset.n; render(); window.scrollTo(0,0); return; }
  if(a==='ax-x'){ S.ax.conf=null; render(); return; }
  if(a==='ax-sim'){ axApagar(+b.dataset.n); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="man-voltar"],[data-act="man-abrir"]'); if(b) S.ax.conf=null; },true);
document.head.insertAdjacentHTML('beforeend',`<style id="ax-css">
.ax-del{color:var(--crit-ink)}.ax-del:hover{border-color:var(--crit)}
.ax-box{border:2px solid var(--crit);background:var(--crit-tint)}.ax-ul{margin:0;padding-left:20px;color:var(--ink-2);line-height:1.6}
.ax-sim{background:var(--crit-ink)!important;border-color:var(--crit-ink)!important;color:#fff!important}
</style>`);
/* ===FIM APAGAR=== */
/* ===================== MATERIAIS PARA COMPRAS (07/10): cadastro com marca, referência e fotos; lista para o Compras ===================== */
/* Sem entrada de nota por enquanto: a aba Peças vira "Materiais". Cada material em config/manut.pecas ganha
   {marca,ref,espec,forn,onde,obs,fotos:[ids],ativo}. Fotos em pecafotos/{id} = {d:dataURL,em,por,cod}.
   O saldo e as entradas continuam lá embaixo (fechados), para quando tiver nota. */
VIEWS.manpecas.nome='Materiais'; VIEWS.manpecas.mob='Materiais'; CRUMB.manpecas='Materiais da manutenção';
S.mt={busca:'',ed:null,f:null,fotos:{},lista:[],verLista:false,salv:false,conf:null};
try{ S.mt.lista=JSON.parse(localStorage.getItem('painel.mtlista')||'[]')||[]; }catch(e){}
function mtSalvaLista(){ try{ localStorage.setItem('painel.mtlista',JSON.stringify(S.mt.lista)); }catch(e){} }
function mtCat(){ return mxPecasCat().filter(p=>!p.solta&&p.ativo!==false); }
function mtDe(cod){ return (S.mx.cfg.pecas||[]).find(p=>p.cod===cod); }
async function mtFoto(id){ if(S.mt.fotos[id]) return S.mt.fotos[id]; if(S.mt.fotos[id]===''&&id in S.mt.fotos) return ''; S.mt.fotos[id]=null; try{ const g=await S.db.doc('pecafotos/'+id).get(); S.mt.fotos[id]=g.exists?(g.data().d||''):''; }catch(e){ S.mt.fotos[id]=''; } rerenderSeguro(); return S.mt.fotos[id]; }
function mtImg(id,cls){ if(!id) return `<div class="${cls} mt-sem">${ic('foto',26,1.8)}</div>`; const d=S.mt.fotos[id]; if(d===undefined) mtFoto(id); return d?`<img class="${cls}" src="${d}" alt="">`:`<div class="${cls} mt-sem">${d===null?'…':ic('foto',26,1.8)}</div>`; }
function mtNaLista(cod){ return S.mt.lista.find(x=>x.cod===cod); }

/* ---------- tela ---------- */
{ const _vp=vManPecas; vManPecas=function(){ const X=S.mx, T=S.mt; if(!X.lido) return _vp();
  const cat=mtCat(), q=mxNorm(T.busca), lst=q?cat.filter(p=>mxNorm([p.cod,p.desc,p.marca,p.ref,p.espec,p.forn,p.onde].join(' ')).includes(q)):cat, nL=T.lista.length;
  const card=p=>{ const na=mtNaLista(p.cod), fs=p.fotos||[];
    return `<article class="mt-card"><button class="mt-ft" data-act="mt-ed" data-c="${esc(p.cod)}" aria-label="Abrir ${esc(p.desc)}">${mtImg(fs[0],'mt-img')}${fs.length>1?`<span class="mt-nf">${fs.length} fotos</span>`:''}</button>
      <div class="mt-bd"><b class="mt-d">${esc(p.desc)}</b>${p.marca||p.ref?`<div class="mt-mr">${p.marca?'<span class="pill">'+esc(p.marca)+'</span>':''}${p.ref?'<span class="num">Ref. '+esc(p.ref)+'</span>':''}</div>`:'<div class="mt-mr"><span class="mt-falta">sem marca/referência</span></div>'}
        ${p.espec?`<div class="mt-l">${esc(p.espec)}</div>`:''}${p.onde?`<div class="mt-l mt-mu">Usa em: ${esc(p.onde)}</div>`:''}${p.forn?`<div class="mt-l mt-mu">Fornecedor: ${esc(p.forn)}</div>`:''}
        <div class="mt-rd"><span class="num mt-mu">${esc(p.cod)}${p.cons30?' · usou '+p.cons30+' '+esc(p.un||'')+' em 30 dias':''}</span>
          <button class="btn ${na?'':'sec'} mt-add" data-act="mt-lista" data-c="${esc(p.cod)}" aria-pressed="${!!na}">${na?ic('check',16,2.6)+'Na lista':ic('mais',16,2.6)+'Pedir'}</button></div></div></article>`; };
  const lista=T.verLista?mtListaCard():'';
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Materiais</h1><div class="sub">Cadastro com marca, referência e foto, para o Compras pedir exatamente o que a manutenção usa.</div></div>
   <div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="mt-ver-lista" aria-pressed="${T.verLista}">${ic('lote',18,2)}Lista para compras${nL?` <span class="mt-bdg">${nL}</span>`:''}</button><button class="btn" data-act="mt-novo">${ic('mais',18,2.4)}Novo material</button></div></div>
   ${lista}
   <section class="card mt-sec"><div class="head" style="align-items:center"><h2>${cat.length} materia${cat.length===1?'l':'is'}</h2><label class="eq-q" style="max-width:340px;flex:1">${ic('lupa',18,2)}<input class="txt" id="mt-q" placeholder="Procurar por nome, marca, referência…" value="${esc(T.busca)}"></label></div>
    ${lst.length?`<div class="mt-grid">${lst.map(card).join('')}</div>`:cat.length?'<div class="empty">Nada encontrado.</div>':`<div class="empty">Nenhum material ainda. Clique em <b>Novo material</b> e tire a foto da peça, da etiqueta ou da caixa.</div>`}</section>
   <details class="card mt-est" ${T.estAb?'open':''}><summary><b>Estoque e lançamentos</b><span class="sub" style="margin:0"> · para quando tiver entrada de nota</span></summary>${mtEst(_vp()).replace(/<section class="card mx-new"><div class="label" style="margin-bottom:8px">CADASTRAR PEÇA[\s\S]*?<\/section><\/div>/,'</div>')}</details>`; }; }

function mtEst(h){ const i=h.indexOf('<datalist id="mx-pdl">'); return i<0?'':h.slice(i); }
document.addEventListener('toggle',ev=>{ if(ev.target.classList&&ev.target.classList.contains('mt-est')) S.mt.estAb=ev.target.open; },true);
function mtListaCard(){ const L=S.mt.lista; if(!L.length) return `<section class="card mt-lc"><div class="head"><h2>Lista para compras</h2></div><div class="empty">Clique em <b>Pedir</b> nos materiais para montar a lista.</div></section>`;
  return `<section class="card mt-lc"><div class="head" style="align-items:center"><h2>Lista para compras</h2><button class="eq-lk del" data-act="mt-limpar">${ic('lixo',15,2)}Limpar lista</button></div>
   <div class="mt-ll">${L.map((x,i)=>{ const p=mtDe(x.cod)||{desc:x.cod}; return `<div class="mt-li">${mtImg((p.fotos||[])[0],'mt-th')}<div class="mt-lt"><b>${esc(p.desc)}</b><span>${[p.marca,p.ref?'Ref. '+p.ref:''].filter(Boolean).map(esc).join(' · ')||'<i>sem marca</i>'}</span></div>
     <label class="mx-in"><span>qtd</span><input class="txt num" type="number" min="0" step="any" data-mt-q="${i}" value="${esc(x.qtd)}"></label><span class="mt-mu">${esc(p.un||'un')}</span><input class="txt mt-lo" data-mt-o="${i}" placeholder="Obs. (urgente, para a OS…)" value="${esc(x.obs||'')}"><button class="eq-lk del" data-act="mt-tira" data-i="${i}" aria-label="Tirar da lista">${ic('lixo',15,2)}</button></div>`; }).join('')}</div>
   <div class="mt-la"><button class="btn" data-act="mt-pdf">${ic('baixar',18,2)}Baixar PDF com fotos</button><button class="btn sec" data-act="mt-zap">${ic('whats',18,2)}WhatsApp</button><button class="btn sec" data-act="mt-copiar">Copiar texto</button></div></section>`; }

/* ---------- formulário (novo / editar) ---------- */
function mtModal(){ const F=S.mt.f; if(!F) return ''; const eqs=mxEquips().map(e=>e.nome).filter((v,i,a)=>a.indexOf(v)===i);
  const inp=(k,lb,ph,st)=>`<label class="mt-fl" ${st?`style="${st}"`:''}><span class="label">${lb}</span><input class="txt" data-mt-f="${k}" value="${esc(F[k]||'')}" placeholder="${esc(ph||'')}" ${k==='onde'?'list="mt-eqdl"':''}></label>`;
  return `<div class="dbmodal eq-modal" data-mt-fundo="1"><div class="dbmbox eq-box mt-box" role="dialog" aria-modal="true" aria-labelledby="mt-t">
   <div class="mt-bx"><div class="eyebrow">MATERIAIS</div><h2 id="mt-t" style="margin:4px 0 14px">${S.mt.ed?esc(F.desc||'Material'):'Novo material'}</h2>
   <div class="mt-fts">${(F.fotos||[]).map((id,i)=>`<div class="mt-fi">${mtImg(id,'mt-fimg')}<button type="button" class="mt-fx" data-act="mt-foto-x" data-i="${i}" aria-label="Tirar foto">✕</button></div>`).join('')}${(F.fotos||[]).length<4?`<label class="mt-fadd">${ic('foto',24,2)}<span>${S.mt.salv==='foto'?'Enviando…':'Foto'}</span><input type="file" accept="image/*" capture="environment" id="mt-foto-in" hidden></label>`:''}</div>
   <div class="sub" style="font-size:12px;margin:6px 0 14px">Até 4 fotos: a peça, a etiqueta/plaqueta com a referência, a caixa.</div>
   <datalist id="mt-eqdl">${eqs.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
   <div class="mt-g">${inp('desc','DESCRIÇÃO *','Ex.: Rolamento rígido de esferas','grid-column:1/-1')}${inp('marca','MARCA','Ex.: SKF')}${inp('ref','REFERÊNCIA / MODELO','Ex.: 6205-2RS')}${inp('espec','MEDIDAS / ESPECIFICAÇÃO','Ex.: 25×52×15 mm, vedado','grid-column:1/-1')}${inp('onde','ONDE USA','Equipamento ou linha')}${inp('forn','FORNECEDOR','Onde costuma comprar')}${inp('cod','CÓDIGO','Deixe vazio para gerar')}<div class="mt-g2">${inp('un','UN.','un')}${inp('min','MÍNIMO','0')}</div>${inp('obs','OBSERVAÇÃO PARA O COMPRAS','Ex.: só original; similar não serve','grid-column:1/-1')}</div>
   <div class="eq-err" id="mt-err"></div></div>
   <div class="eq-mf">${S.mt.ed?(S.mt.conf?`<span class="mt-cf">Tirar do cadastro? <button class="btn warn" data-act="mt-tirar-ok">Tirar</button><button class="eq-lk" data-act="mt-tirar-x">Não</button></span>`:`<button class="eq-lk del" style="margin:0" data-act="mt-tirar">${ic('lixo',15,2)}Tirar do cadastro</button>`):'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="mt-x">Cancelar</button><button class="btn" data-act="mt-salvar" ${S.mt.salv?'disabled':''}>${ic('check',18,2.4)}Salvar</button></div></div></div></div>`; }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ let el=document.getElementById('mt-ov'); const h=S.mt.f&&S.view==='manpecas'?mtModal():'';
    if(!h){ if(el) el.remove(); return x; } if(!el){ el=document.createElement('div'); el.id='mt-ov'; document.body.appendChild(el); }
    const a=document.activeElement, k=a&&a.dataset&&a.dataset.mtF, pos=k&&a.selectionStart; el.innerHTML=h; if(k){ const n=el.querySelector(`[data-mt-f="${k}"]`); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } } }catch(e){ console.warn(e); } return x; }; }
{ const _rs=rerenderSeguro; rerenderSeguro=function(){ const a=document.activeElement; if(a&&a.dataset&&(a.dataset.mtF!=null||a.dataset.mtQ!=null||a.dataset.mtO!=null||a.id==='mt-q')) return; return _rs.apply(this,arguments); }; }

document.addEventListener('input',ev=>{ const t=ev.target, T=S.mt; if(!t.dataset) return;
  if(t.dataset.mtF!=null&&T.f){ T.f[t.dataset.mtF]=t.value; return; }
  if(t.dataset.mtQ!=null){ const x=T.lista[+t.dataset.mtQ]; if(x){ x.qtd=t.value; mtSalvaLista(); } return; }
  if(t.dataset.mtO!=null){ const x=T.lista[+t.dataset.mtO]; if(x){ x.obs=t.value; mtSalvaLista(); } return; }
  if(t.id==='mt-q'){ T.busca=t.value; const p=t.selectionStart; render(); const n=$('#mt-q'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } } });
document.addEventListener('change',async ev=>{ const t=ev.target; if(t.id!=='mt-foto-in') return; const f=t.files&&t.files[0]; if(!f||!S.mt.f) return; S.mt.salv='foto'; render();
  try{ const d=await mxComprime(f), id='pf-'+mxId(); await S.db.doc('pecafotos/'+id).set({d,em:new Date().toISOString(),por:S.uid||null,cod:S.mt.f.cod||null}); S.mt.fotos[id]=d; S.mt.f.fotos=[...(S.mt.f.fotos||[]),id]; }catch(e){ toast('Não consegui salvar a foto.'); }
  S.mt.salv=false; render(); });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mt-"]'), T=S.mt;
  if(!b){ if(ev.target&&ev.target.dataset&&ev.target.dataset.mtFundo){ T.f=null; T.ed=null; T.conf=null; render(); } return; } const a=b.dataset.act;
  try{
  if(a==='mt-novo'){ T.ed=null; T.conf=null; T.f={desc:'',marca:'',ref:'',espec:'',onde:'',forn:'',cod:'',un:'un',min:'',obs:'',fotos:[]}; render(); setTimeout(()=>{ const n=document.querySelector('[data-mt-f="desc"]'); n&&n.focus(); },50); return; }
  if(a==='mt-ed'){ const p=mtDe(b.dataset.c); if(!p) return; T.ed=p.cod; T.conf=null; T.f=Object.assign({desc:'',marca:'',ref:'',espec:'',onde:'',forn:'',un:'un',obs:'',fotos:[]},JSON.parse(JSON.stringify(p)),{min:p.min?String(p.min):''}); render(); return; }
  if(a==='mt-x'){ T.f=null; T.ed=null; T.conf=null; render(); return; }
  if(a==='mt-foto-x'){ const id=(T.f.fotos||[])[+b.dataset.i]; T.f.fotos=T.f.fotos.filter((_,i)=>i!==+b.dataset.i); render(); if(id&&!(T.ed&&((mtDe(T.ed)||{}).fotos||[]).includes(id))){ try{ await S.db.doc('pecafotos/'+id).delete(); }catch(e){} } return; }
  if(a==='mt-tirar'){ T.conf=true; render(); return; } if(a==='mt-tirar-x'){ T.conf=false; render(); return; }
  if(a==='mt-tirar-ok'){ const cod=T.ed; await mxGrava(cf=>{ const x=cf.pecas.find(p=>p.cod===cod); if(x){ x.ativo=false; x.tiradoEm=new Date().toISOString(); } }); T.lista=T.lista.filter(x=>x.cod!==cod); mtSalvaLista(); T.f=null; T.ed=null; T.conf=false; toast('Material tirado do cadastro.'); render(); return; }
  if(a==='mt-salvar'){ const F=T.f, err=document.getElementById('mt-err'), d=String(F.desc||'').trim(); if(!d){ if(err) err.textContent='Escreva a descrição.'; return; }
    const ed=T.ed, cod=ed||String(F.cod||'').trim()||('P'+Date.now().toString(36).toUpperCase().slice(-5));
    if(!ed&&(S.mx.cfg.pecas||[]).some(p=>p.cod===cod&&p.ativo!==false)){ if(err) err.textContent='Já existe um material com o código '+cod+'.'; return; }
    const dados={cod,desc:d,marca:String(F.marca||'').trim(),ref:String(F.ref||'').trim(),espec:String(F.espec||'').trim(),onde:String(F.onde||'').trim(),forn:String(F.forn||'').trim(),un:String(F.un||'').trim()||'un',min:+String(F.min||'').replace(',','.')||0,obs:String(F.obs||'').trim(),fotos:F.fotos||[],ativo:true};
    T.salv=true; render();
    await mxGrava(cf=>{ const i=cf.pecas.findIndex(p=>p.cod===cod); if(i>=0) cf.pecas[i]=Object.assign({},cf.pecas[i],dados,{editEm:new Date().toISOString()}); else cf.pecas.push(Object.assign(dados,{em:new Date().toISOString(),por:S.uid||null})); });
    T.salv=false; T.f=null; T.ed=null; toast((ed?'Material salvo: ':'Material cadastrado: ')+d+'.'); render(); return; }
  if(a==='mt-lista'){ const c=b.dataset.c; if(mtNaLista(c)) T.lista=T.lista.filter(x=>x.cod!==c); else { T.lista.push({cod:c,qtd:'1',obs:''}); toast('Na lista para compras ('+T.lista.length+').'); } mtSalvaLista(); render(); return; }
  if(a==='mt-ver-lista'){ T.verLista=!T.verLista; render(); return; }
  if(a==='mt-tira'){ T.lista.splice(+b.dataset.i,1); mtSalvaLista(); render(); return; }
  if(a==='mt-limpar'){ T.lista=[]; mtSalvaLista(); render(); return; }
  if(a==='mt-copiar'){ const t=mtTexto(); try{ await navigator.clipboard.writeText(t); toast('Lista copiada.'); }catch(e){ copiarAntigo(t,()=>toast('Lista copiada.')); } return; }
  if(a==='mt-zap'){ window.open('https://wa.me/?text='+encodeURIComponent(mtTexto()),'_blank','noopener'); return; }
  if(a==='mt-pdf'){ b.disabled=true; await mtPdf(); b.disabled=false; return; }
  }catch(e){ T.salv=false; erro(e); render(); } });

/* ---------- saída para o Compras ---------- */
function mtTexto(){ const L=S.mt.lista; return '*Pedido de materiais · Manutenção Colafix* ('+dm(hojeStr())+')\n\n'+L.map((x,i)=>{ const p=mtDe(x.cod)||{desc:x.cod}; return (i+1)+'. *'+p.desc+'* — '+(x.qtd||'?')+' '+(p.un||'un')+
  (p.marca?'\n   Marca: '+p.marca:'')+(p.ref?'\n   Ref.: '+p.ref:'')+(p.espec?'\n   '+p.espec:'')+(p.forn?'\n   Fornecedor: '+p.forn:'')+(p.obs?'\n   Obs.: '+p.obs:'')+(x.obs?'\n   ⚠ '+x.obs:''); }).join('\n\n')+'\n\nCódigos: '+L.map(x=>x.cod).join(', '); }
async function mtPdf(){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } const L=S.mt.lista; if(!L.length) return;
  const rz={}; for(const x of L){ const p=mtDe(x.cod); const id=p&&(p.fotos||[])[0]; if(!id) continue; const d=await mtFoto(id); if(d){ try{ const im=new Image(); im.src=d; await im.decode(); rz[id]=im.naturalWidth/im.naturalHeight; }catch(e){} } }
  const pdf=new window.jspdf.jsPDF('p','mm','a4'), W=210, M=14; let y=16;
  const cab=()=>{ pdf.setFont('helvetica','bold'); pdf.setFontSize(15); pdf.setTextColor(31,56,100); pdf.text('Pedido de materiais · Manutenção',M,y); pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5); pdf.setTextColor(90,90,90); pdf.text('COLAFIX · '+dm(hojeStr())+' · '+L.length+' ite'+(L.length>1?'ns':'m'),W-M,y,{align:'right'}); y+=4; pdf.setDrawColor(31,56,100); pdf.setLineWidth(.6); pdf.line(M,y,W-M,y); y+=6; };
  cab();
  L.forEach((x,i)=>{ const p=mtDe(x.cod)||{desc:x.cod,cod:x.cod}, H=42; if(y+H>285){ pdf.addPage(); y=16; cab(); }
    pdf.setDrawColor(210); pdf.setLineWidth(.2); pdf.roundedRect(M,y,W-2*M,H-4,2,2);
    const f=(p.fotos||[])[0]&&S.mt.fotos[p.fotos[0]]; if(f){ try{ const r=rz[p.fotos[0]]||4/3; let iw=34, ih=iw/r; if(ih>34){ ih=34; iw=ih*r; } pdf.addImage(f,'JPEG',M+2+(34-iw)/2,y+2+(34-ih)/2,iw,ih); }catch(e){} } else { pdf.setFillColor(242,242,242); pdf.rect(M+2,y+2,34,34,'F'); pdf.setFontSize(8); pdf.setTextColor(150); pdf.text('sem foto',M+19,y+20,{align:'center'}); }
    const tx=M+41, tw=W-M-tx-34; pdf.setTextColor(0); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text(pdf.splitTextToSize((i+1)+'. '+p.desc,tw).slice(0,2),tx,y+7);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5); let ly=y+(pdf.splitTextToSize(p.desc,tw).length>1?17:13);
    [['Marca',p.marca],['Ref.',p.ref],['Espec.',p.espec],['Fornecedor',p.forn],['Obs.',[p.obs,x.obs].filter(Boolean).join(' · ')]].filter(r=>r[1]).forEach(([k,v])=>{ if(ly>y+H-6) return; pdf.setTextColor(110); pdf.text(k+':',tx,ly); pdf.setTextColor(0); pdf.text(pdf.splitTextToSize(String(v),tw-20)[0],tx+20,ly); ly+=4.6; });
    pdf.setTextColor(110); pdf.setFontSize(8); pdf.text('Código '+p.cod,tx,y+H-7);
    pdf.setFillColor(234,240,249); pdf.roundedRect(W-M-30,y+4,27,20,2,2,'F'); pdf.setTextColor(31,56,100); pdf.setFont('helvetica','bold'); pdf.setFontSize(18); pdf.text(String(x.qtd||'?'),W-M-16.5,y+15,{align:'center'}); pdf.setFontSize(8.5); pdf.setFont('helvetica','normal'); pdf.text(p.un||'un',W-M-16.5,y+21,{align:'center'});
    y+=H; });
  pdf.setTextColor(0); await manBaixar(pdf,'Pedido_materiais_'+hojeStr()+'.pdf','PDF do pedido gerado com '+L.length+' ite'+(L.length>1?'ns':'m')+'.'); }

document.head.insertAdjacentHTML('beforeend',`<style id="mt-css">
.mt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.mt-card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}
.mt-ft{position:relative;display:block;padding:0;border:0;background:var(--sunken);cursor:pointer;aspect-ratio:4/3}.mt-img{width:100%;height:100%;object-fit:cover;display:block}
.mt-sem{display:flex;align-items:center;justify-content:center;color:var(--faint);width:100%;height:100%}
.mt-nf{position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:999px}
.mt-bd{padding:12px 14px 12px;display:flex;flex-direction:column;gap:5px;flex:1}.mt-d{font-size:15.5px;line-height:1.3}
.mt-mr{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--ink-2)}.mt-falta{font-size:12px;color:var(--warn-ink);font-style:italic}
.mt-l{font-size:13px;color:var(--ink-2)}.mt-mu{color:var(--muted);font-size:12.5px}
.mt-rd{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:8px}.mt-add{height:38px!important;min-height:38px!important;padding:0 14px}
.mt-bdg{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:999px;background:var(--crit);color:#fff;font-size:12px;font-weight:800;margin-left:4px}
.mt-lc{border:2px solid var(--teal)}.mt-ll{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.mt-li{display:grid;grid-template-columns:52px minmax(0,1fr) auto auto minmax(0,220px) auto;gap:12px;align-items:center;padding:8px 12px;border-top:1px solid var(--line-2)}.mt-li:first-child{border-top:0}
.mt-th{width:52px;height:52px;border-radius:8px;object-fit:cover;background:var(--sunken)}div.mt-th{display:flex}.mt-lt{display:flex;flex-direction:column;min-width:0}.mt-lt span{font-size:12.5px;color:var(--muted)}
.mt-li .mx-in input{width:76px}.mt-lo{height:40px}.mt-la{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.mt-est>summary{cursor:pointer;list-style:revert;padding:2px 0}.mt-est[open]>summary{margin-bottom:12px}
#mt-ov .dbmodal{z-index:960}.mt-box{max-width:640px}.mt-bx{padding:22px 24px 6px;overflow:auto}
.mt-fts{display:flex;gap:10px;flex-wrap:wrap}.mt-fi{position:relative}.mt-fimg{width:96px;height:96px;border-radius:12px;object-fit:cover;background:var(--sunken)}div.mt-fimg{display:flex}
.mt-fx{position:absolute;top:-6px;right:-6px;width:26px;height:26px;border-radius:50%;border:0;background:var(--crit-ink);color:#fff;font-size:12px;cursor:pointer}
.mt-fadd{width:96px;height:96px;border:2px dashed var(--line);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--teal-strong);font-weight:700;font-size:13px;cursor:pointer}.mt-fadd:hover{border-color:var(--teal)}
.mt-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mt-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mt-fl{display:flex;flex-direction:column;gap:5px;min-width:0}
.mt-cf{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--crit-ink)}
@media (max-width:700px){ .mt-sec>.head{flex-wrap:wrap}.mt-sec>.head .eq-q{max-width:none!important;flex:1 1 100%!important} .mt-li{grid-template-columns:52px minmax(0,1fr) auto;row-gap:8px}.mt-li .mx-in{grid-column:2}.mt-li>.mt-mu{display:none}.mt-lo{grid-column:1/-1}.mt-li>.eq-lk{grid-row:1;grid-column:3}
  .mt-g{grid-template-columns:minmax(0,1fr)}.mt-g>*{grid-column:auto!important}.mt-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mt-bd{padding:10px}.mt-d{font-size:14px}.mt-rd{flex-direction:column;align-items:stretch}.mt-bx{padding:18px 16px 6px} }
</style>`);
/* ===FIM MATERIAIS=== */
/* ===================== MANUTENÇÃO · CONFIABILIDADE (07/10): papéis, cancelamento, diagnóstico, QR do equipamento, histórico ===================== */
/* Mesma estrutura de dados: chamados/os-NNNNN é o chamado e a OS; config/manut guarda equipamentos, preventivas e materiais. */
function manErro(e,msg){ const c=(e&&e.code)||''; console.warn('[manutenção]',msg,c,e&&e.message);
  if(c==='sem-permissao'||c==='permission-denied') return toast('Você não possui permissão para esta operação. Fale com o administrador.');
  if(/unavailable|network|tempo|deadline/.test(c)) return toast(msg+' Verifique sua conexão e tente novamente.');
  toast(msg+' Tente novamente.'); }
/* quem atende: administrador ou quem tem o módulo Manutenção. Produção/Paradas: abre e acompanha. Só ver: nada grava. */
function manPodeAtender(){ try{ if(S.acs&&S.acs.dono) return true; if(typeof soVer==='function'&&soVer()) return false; const p=acsP(); return !!p&&(p.tudo||(p.mods||[]).includes('manut')); }catch(e){ return false; } }
const MAN_ACOES_ATENDER=['man-st','man-salvar-at','mm-assumir','mm-concluir','mx-p-add','mx-p-x','mx-pv-gerar','mx-pv-salvar','mx-pv-del','mx-pv-conf','mx-pv-ed','mx-eq-novo','mx-eq-salvar','mx-eq-del','mx-eq-conf','mx-eq-sug','mx-eq-ed','mx-pc-novo','mx-pc-cad','mx-ent','mzl-salvar','mz-ok','mcx-ok'];
/* antes de qualquer outro ouvinte (fase de captura na janela) */
window.addEventListener('click',ev=>{ const b=ev.target&&ev.target.closest&&ev.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act;
  if(MAN_ACOES_ATENDER.includes(a)&&!manPodeAtender()){ ev.stopImmediatePropagation(); ev.preventDefault(); toast('Você não possui permissão para esta ação. Ela é da equipe de manutenção.'); } },true);

/* ---------- cancelar com motivo ---------- */
S.mcx=null;
{ const _ms=manStatus; manStatus=async function(c,st){ if(st==='Cancelada'&&c&&c.status!=='Cancelada'&&!c._cxOk){ S.mcx={n:c.numero,motivo:''}; render(); setTimeout(()=>{ const t=document.getElementById('mcx-txt'); t&&t.focus(); },60); return; }
  return _ms.apply(this,arguments); }; }
function mcxModal(){ const Z=S.mcx, c=Z&&manDoc(Z.n); if(!c) return '';
  return `<div class="dbmodal eq-modal" data-mcx-fundo="1"><div class="dbmbox eq-box sm mz-box" role="dialog" aria-modal="true" aria-labelledby="mcx-t">
   <div class="eyebrow">CANCELAR OS ${manNum(c.numero)} · ${esc(c.linha||'')}</div><h2 id="mcx-t" style="margin:4px 0 2px">${esc(String(c.defeito||'').slice(0,80))}</h2>
   <div class="sub" style="margin:0 0 12px">A OS continua no histórico, marcada como cancelada.${c.paradaId?' A parada da linha ligada a ela é encerrada agora.':''}</div>
   <label style="display:block"><span class="label">MOTIVO DO CANCELAMENTO *</span><textarea class="txt" id="mcx-txt" rows="2" style="margin-top:6px" placeholder="Ex.: chamado aberto em duplicidade">${esc(Z.motivo)}</textarea></label>
   <div class="eq-err" id="mcx-err"></div>
   <div class="eq-mf" style="border:0;padding:14px 0 0"><button class="btn sec" data-act="mcx-x">Voltar</button><button class="btn" data-act="mcx-ok" style="background:var(--crit-ink)">Cancelar OS</button></div></div></div>`; }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ let el=document.getElementById('mcx-ov'); const h=S.mcx?mcxModal():'';
    if(!h){ if(el) el.remove(); return x; } if(!el){ el=document.createElement('div'); el.id='mcx-ov'; document.body.appendChild(el); }
    const t=document.getElementById('mcx-txt'), foco=t&&document.activeElement===t; el.innerHTML=h; if(foco){ const n=document.getElementById('mcx-txt'); n&&n.focus(); } }catch(e){} return x; }; }
document.addEventListener('input',ev=>{ if(ev.target.id==='mcx-txt'&&S.mcx) S.mcx.motivo=ev.target.value; });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mcx-"]'), f=ev.target.closest&&ev.target.closest('[data-mcx-fundo]');
  if(!b){ if(f&&ev.target===f){ S.mcx=null; render(); } return; } const Z=S.mcx; if(!Z) return;
  if(b.dataset.act==='mcx-x'){ S.mcx=null; render(); return; }
  if(b.dataset.act==='mcx-ok'){ const c=manDoc(Z.n); if(!c) return; const m=String(Z.motivo||'').trim(); if(m.length<3){ const e=document.getElementById('mcx-err'); if(e) e.textContent='Informe o motivo do cancelamento.'; return; }
    b.disabled=true; b.textContent='Cancelando…'; c._cxOk=true; c._motivoCancel=m.slice(0,300); try{ await manStatus(c,'Cancelada'); } finally { delete c._cxOk; delete c._motivoCancel; } S.mcx=null; render(); } });
/* rerenderSeguro não apaga o que se digita nos modais */
{ const _rs=rerenderSeguro; rerenderSeguro=function(){ const a=document.activeElement; if(a&&(a.id==='mcx-txt'||a.id==='mz-tec'||a.id==='mz-diag'||a.id==='mx-p-u'||a.id==='mx-p-o'||a.id==='mx-pv-r')) return; return _rs.apply(this,arguments); }; }

/* ---------- detalhe da OS: diagnóstico e causa no atendimento; quem não é da manutenção só acompanha ---------- */
{ const _md=manDetalhe; manDetalhe=function(c){ let h=_md.apply(this,arguments); if(!c) return h; const E=c.exec||{}, ed=S.man.ed||{}; const v=k=>ed[k]!=null?ed[k]:(E[k]||'');
  const extra=`<label style="display:block;margin-top:10px"><span class="label">DIAGNÓSTICO</span><textarea class="txt" rows="2" data-man-e="diagnostico" placeholder="O que foi encontrado">${esc(v('diagnostico'))}</textarea></label>
   <div class="two" style="gap:12px;margin-top:10px"><label><span class="label">CAUSA</span><select class="txt" data-man-e="causa"><option value="">—</option>${(c.prevId?['Preventiva feita','Preventiva com troca de peça','Preventiva com problema encontrado']:MZ_CAUSAS).map(t=>`<option ${v('causa')===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label><span></span></div>`;
  h=h.replace('<label style="display:block;margin-top:10px"><span class="label">SERVIÇOS EXECUTADOS / PROCEDIMENTOS</span>',extra+'<label style="display:block;margin-top:10px"><span class="label">SERVIÇO REALIZADO</span>');
  h=h.replace('<span class="label">PENDÊNCIAS / RECOMENDAÇÕES</span>','<span class="label">OBSERVAÇÕES / PENDÊNCIAS</span>');
  const eqo=c.equipId&&mxEquip(c.equipId);
  const info=`<section class="card"><div class="two" style="gap:10px 18px"><div><div class="label">EQUIPAMENTO</div><div style="margin-top:4px"><b>${esc((eqo&&eqo.nome)||c.equip||'—')}</b>${eqo&&eqo.tag?` <span class="sub" style="display:inline;margin:0">${esc(eqo.tag)}</span>`:''}</div></div>
    <div><div class="label">SETOR / LINHA</div><div style="margin-top:4px"><b>${esc(c.linha||'—')}</b></div></div><div><div class="label">STATUS</div><div style="margin-top:4px"><span class="pill ${manStCor(c.status)}">${esc(c.status||'')}</span>${c.status==='Cancelada'&&c.motivoCancel?` <small class="sub" style="display:inline;margin:0">${esc(c.motivoCancel)}</small>`:''}${c.liberadoEm&&!manFechada(c)?`<small style="display:block;margin-top:4px;color:var(--ok-ink);font-weight:700">✅ Linha liberou a máquina às ${hora(c.liberadoEm)} (${esc(c.liberadoPor||'')}) · falta concluir a OS</small>`:''}</div></div>
    <div><div class="label">RESPONSÁVEL</div><div style="margin-top:4px"><b>${esc(E.tecnico||'—')}</b></div></div></div></section>`;
  const i=h.indexOf('<section class="card">'); if(i>=0) h=h.slice(0,i)+info+h.slice(i);
  if(!manPodeAtender()){
    h=h.replace(/<button[^>]*data-act="(man-st|man-salvar-at|mm-assumir|mx-p-add|mx-p-x|ax-conf)"[^>]*>[\s\S]*?<\/button>/g,'');
    h=h.replace(/<(input|select|textarea)([^>]*?)(data-man-e=|id="mx-p-)/g,'<$1 disabled$2$3');
    h=h.replace('<section class="card man-at">','<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong)">Você acompanha este chamado. O atendimento, o status e os materiais são registrados pela equipe de manutenção.</div><section class="card man-at">');
  }
  return h; }; }

/* ---------- QR do equipamento: ?chamado=Linha&equip=id → o chamado já abre com a máquina escolhida ---------- */
function mxEqLink(e){ const l=encodeURIComponent(e.linha||''), id=encodeURIComponent(e.id); return ((window.claude&&window.claude.link)||(S.cfg&&S.cfg.linkPainel)||LINK_PAINEL)+'?chamado='+l+'&equip='+id+'#chamado='+l+'&equip='+id; }
function mxQrParam(txt){ const m=String(txt||'').match(/[?&#]equip=([^&#]+)/); if(!m) return ''; try{ return decodeURIComponent(m[1]); }catch(e){ return m[1]; } }
S.mx.qrEq=mxQrParam(location.search+'&'+location.hash);
/* quando o formulário do chamado abrir pelo QR, escolhe o equipamento */
setInterval(()=>{ try{ const id=S.mx.qrEq; if(!id||!S.man.f||!S.mx.lido) return; const e=mxEquip(id); S.mx.qrEq='';
    if(!e||e.ativo===false){ toast('O equipamento deste QR não está mais cadastrado. Escolha na lista.'); return; }
    Object.assign(S.man.f,{linha:S.man.f.linha||e.linha,equipId:e.id,equip:e.nome,origem:'qr-equip'}); render(); toast('Equipamento identificado pelo QR: '+e.nome); }catch(e){} },400);
{ const _mf=manForm; manForm=function(){ let h=_mf.apply(this,arguments); const F=S.man.f||{};
  if(F.origem==='qr-equip'&&F.equip) h=h.replace('<div class="label" style="margin:12px 0 6px">LINHA</div>',`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong);margin-top:10px">${ic('engr',16,2)} Equipamento identificado pelo QR: <b>${esc(F.equip)}</b></div><div class="label" style="margin:12px 0 6px">LINHA</div>`);
  return h; }; }
/* escanear de dentro do painel também reconhece o QR do equipamento */
{ const _esc=manEscanear; manEscanear=function(){ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.setAttribute('capture','environment'); i.style.display='none';
  i.onchange=async()=>{ const f=i.files&&i.files[0]; i.remove(); if(!f) return; toast('Lendo o QR…'); let t=null; try{ t=await manLerQr(f); }catch(e){ t=null; }
    const eq=mxQrParam(t); if(!eq){ /* QR de linha: segue o caminho antigo */ return _escLinha(t); }
    const e=mxEquip(eq); if(!e){ toast('Equipamento do QR não encontrado no cadastro.'); return; } if(!viewOk('manch')){ toast('Você não possui permissão para acessar este módulo.'); return; }
    manNovo(e.linha); Object.assign(S.man.f,{equipId:e.id,equip:e.nome,origem:'qr-equip'}); S.man.cur=null;
    if(S.view==='linhatv'){ S.man.novo=false; S.man.ltv=e.linha; render(); } else { go('manch'); setTimeout(()=>{ const x=$('#man-form'); x&&x.scrollIntoView({block:'start'}); const ta=document.querySelector('[data-man="defeito"]'); ta&&ta.focus(); },80); }
    toast('Equipamento identificado: '+e.nome); };
  document.body.appendChild(i); i.click(); };
  function _escLinha(t){ const mr=t&&String(t).match(/rancho=(\d{4,})/); if(mr){ if(!viewOk('diario')){ toast('Seu acesso não inclui o diário de bordo.'); return; } go('diario'); setTimeout(()=>{ if(!dbAbrirRancho(mr[1])) toast('Rancho '+mr[1]+' não encontrado.'); },120); return; }
    const m=t&&String(t).match(/chamado=([^&#]+)/); let l=''; if(m){ try{ l=decodeURIComponent(m[1].replace(/\+/g,' ')); }catch(e){ l=m[1]; } }
    if(!l||!manLinhas().includes(l)){ toast(t?'Este QR não é de chamado, equipamento nem folha de produção.':'Não consegui ler o QR. Chegue mais perto e tente de novo.'); return; }
    if(!viewOk('manch')){ toast('Você não possui permissão para acessar este módulo.'); return; }
    manNovo(l); S.man.cur=null; if(S.view==='linhatv'){ S.man.novo=false; if(S.paradas.some(p=>p.linha===l&&!p.fim)) S.man.f.impacto='parou'; S.man.ltv=l; render(); } else { go('manch'); setTimeout(()=>{ const x=$('#man-form'); x&&x.scrollIntoView({block:'start'}); },80); } } }

/* ---------- equipamentos: QR e histórico de chamados ---------- */
function mxEqChamados(e){ const k=mxNorm(e.nome); return (S.chamados||[]).filter(c=>!c.excluido&&(+c.numero||0)<900000&&(c.equipId===e.id||(!c.equipId&&mxNorm(c.equip)===k&&(!c.linha||!e.linha||c.linha===e.linha)))).sort((a,b)=>String(b.criado).localeCompare(String(a.criado))); }
function mxPrevExec(p){ const xs=(S.chamados||[]).filter(c=>!c.excluido&&c.prevId===p.id&&c.status==='Concluída').sort((a,b)=>String(b.concluidoEm).localeCompare(String(a.concluidoEm))).slice(0,3);
  return xs.length?`<small style="display:block;margin-top:2px">Realizadas: ${xs.map(c=>`${dm(hojeStr(new Date(c.concluidoEm)))} (OS ${manNum(c.numero)}${c.exec&&c.exec.tecnico?' · '+esc(c.exec.tecnico):''})`).join(' · ')}</small>`:''; }
{ const _ve=vManEquip; vManEquip=function(){ let h=_ve.apply(this,arguments); const X=S.mx; if(!X.lido) return h;
  h=h.replace(/<button class="eq-lk" data-act="mx-eq-prev" data-id="([^"]+)">/g,(m,id)=>`<button class="eq-lk" data-act="mx-eq-qr" data-id="${id}">${ic('grid',15,2)}QR</button><button class="eq-lk" data-act="mx-eq-hist" data-id="${id}">${ic('relogio',15,2)}Histórico</button>`+m);
  h=h.replace('<div class="sub">Cadastre as máquinas de cada linha.','<div class="pg-acts" style="display:flex;gap:10px;margin-top:10px"><button class="btn sec" data-act="mx-eq-qrpdf">'+ic('baixar',18,2)+'Baixar QR de todos os equipamentos</button></div><div class="sub">Cadastre as máquinas de cada linha.');
  let painel='';
  if(X.eqQr){ const e=mxEquip(X.eqQr); if(e) painel+=`<section class="card"><div class="head" style="align-items:baseline"><h2>QR do equipamento · ${esc(e.nome)}</h2><button class="lnk" data-act="mx-eq-fecha">Fechar</button></div>
    <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div class="man-qr" style="max-width:240px"><div class="man-qr-t">CHAMADO DE MANUTENÇÃO</div>${manQrSvg(mxEqLink(e),180)}<b>${esc(e.nome)}</b><small>${esc(e.linha||'')}${e.tag?' · '+esc(e.tag):''}</small></div>
    <div class="sub" style="max-width:420px">O operador escaneia com a câmera do celular e o chamado abre com este equipamento já escolhido.<br><small style="word-break:break-all">${esc(mxEqLink(e))}</small><div style="margin-top:10px"><button class="btn" data-act="mx-eq-qrpdf" data-id="${esc(e.id)}">${ic('baixar',18,2)}Baixar PDF para imprimir</button></div></div></div></section>`; }
  if(X.eqHist){ const e=mxEquip(X.eqHist); if(e){ const xs=mxEqChamados(e); painel+=`<section class="card"><div class="head" style="align-items:baseline"><h2>Histórico · ${esc(e.nome)}</h2><button class="lnk" data-act="mx-eq-fecha">Fechar</button></div>
    ${xs.length?xs.slice(0,60).map(c=>`<div class="row" style="grid-template-columns:110px 120px minmax(0,1fr) auto;gap:10px;align-items:start"><button class="lnk" data-act="man-abrir" data-n="${c.numero}" data-ir="1" style="padding:0;text-align:left">OS ${manNum(c.numero)}</button><span class="num" style="color:var(--muted)">${c.criado?dm(hojeStr(new Date(c.criado)))+' '+hora(c.criado):''}</span><span>${esc(String(c.defeito||'').slice(0,120))}${c.exec&&c.exec.causa?`<small style="display:block;color:var(--muted)">causa: ${esc(c.exec.causa)}${c.exec.tecnico?' · '+esc(c.exec.tecnico):''}</small>`:''}</span><span class="pill ${manStCor(c.status)}">${esc(c.status)}</span></div>`).join(''):'<div class="empty">Nenhum chamado para este equipamento ainda.</div>'}</section>`; } }
  if(painel){ const i=h.indexOf('<section class="card mx-new">'); h=i<0?h+painel:h.slice(0,i)+painel+h.slice(i); }
  return h; }; }
async function mxEqQrPdf(id){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } const es=id?[mxEquip(id)].filter(Boolean):mxEquips(); if(!es.length){ toast('Nenhum equipamento cadastrado.'); return; }
  const pdf=new window.jspdf.jsPDF('p','mm','a4'); const W=210, cw=95, ch=135, mx=(W-2*cw)/2, my=12;
  es.forEach((e,i)=>{ const k=i%4; if(i&&k===0) pdf.addPage(); const x=mx+(k%2)*cw, y=my+Math.floor(k/2)*ch;
    pdf.setDrawColor(150); pdf.setLineDashPattern([1.5,1.5],0); pdf.rect(x+3,y+3,cw-6,ch-6); pdf.setLineDashPattern([],0);
    pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(31,56,100); pdf.text('CHAMADO DE MANUTENÇÃO',x+cw/2,y+15,{align:'center'});
    desenharQR(pdf,mxEqLink(e),x+(cw-70)/2,y+20,70); pdf.setTextColor(0,0,0); pdf.setFontSize(17); pdf.text(pdf.splitTextToSize(e.nome,cw-12)[0],x+cw/2,y+102,{align:'center'});
    pdf.setFont('helvetica','normal'); pdf.setFontSize(10); pdf.text((e.linha||'')+(e.tag?' · '+e.tag:''),x+cw/2,y+110,{align:'center'});
    pdfCode128(pdf,'EQ-'+e.id,x+10,y+113,cw-20,9); pdf.setFontSize(7); pdf.setTextColor(90,90,90); pdf.text('EQ-'+e.id+' · QR: celular ou tablet · barras: coletor',x+cw/2,y+126,{align:'center'}); pdf.setTextColor(0,0,0); });
  await manBaixar(pdf,id?'QR_'+String(es[0].nome).replace(/\W+/g,'_')+'.pdf':'QR_equipamentos.pdf','PDF com '+es.length+' QR gerado. Abra e imprima.'); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mx-eq-qr"],[data-act="mx-eq-hist"],[data-act="mx-eq-fecha"],[data-act="mx-eq-qrpdf"]'); if(!b) return; const a=b.dataset.act, X=S.mx;
  if(a==='mx-eq-qr'){ X.eqQr=b.dataset.id; X.eqHist=null; render(); window.scrollTo(0,0); return; }
  if(a==='mx-eq-hist'){ X.eqHist=b.dataset.id; X.eqQr=null; render(); window.scrollTo(0,0); return; }
  if(a==='mx-eq-fecha'){ X.eqQr=null; X.eqHist=null; render(); return; }
  if(a==='mx-eq-qrpdf'){ mxEqQrPdf(b.dataset.id||''); return; } });