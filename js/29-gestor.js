/* Painel Colafix · 29-gestor.js — login do gestor (Marcelo), protótipo "Relatório do dia do gestor" (22/10).
   Módulo "Visão do gestor" ganha: Início · Produção · Relatórios (dia e mês) · Plano de ação · Segurança ·
   Preventivas (calendário) · Turnos · TVs (a tela antiga 'gestao').
   Tudo o que dá vem do painel (apontamentos, paradas, chamados, preventivas, Curva S); o gestor só preenche
   a segurança do dia (gxseg/{AAAA-MM-DD}) e o plano de ação (gxacoes). Turnos em config/geral.turnos. */
"use strict";
S.gx=S.gx||{dia:hojeStr(),cp:hojeStr().slice(0,7),rl:'',acf:'abertas',acNova:false,turno:null,cal:hojeStr().slice(0,7),calDia:null,segDia:hojeStr()};
S.gxAcoes=S.gxAcoes||[]; S.gxSeg=S.gxSeg||{};
const GX_VIEWS=['gxinicio','gxprod','gxdia','gxmes','gxacoes','gxseg','gxcal','gxturnos','gestao'];
const gxEu=()=>String((S.uid&&S.nomes&&S.nomes[S.uid])||'');
const gxN=(n,d)=>(+n||0).toLocaleString('pt-BR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const gxT=t=>gxN(t,1);
const gxPct=(a,b)=>b>0?Math.round(a/b*100):null;
const gxDur=m=>{ m=Math.round(m||0); return m<1?'0 min':m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'); };
const GX_DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const GX_DIAS_L=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
function gxDiaTxt(d){ const x=new Date(d+'T12:00:00'); return GX_DIAS_L[x.getDay()].replace(/^./,c=>c.toUpperCase())+', '+dm(d)+'/'+d.slice(0,4); }
function gxMesTxt(cp){ return ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][+cp.slice(5,7)-1]+' de '+cp.slice(0,4); }
function gxDiaLocal(iso){ return iso?hojeStr(new Date(iso)):''; }
function gxSetup(p){ return /setup|troca de produto|limpeza programada/i.test(String(p&&p.motivo||'')); }

/* ---------- assinaturas (só para quem tem o módulo) ---------- */
let _gxSub=false;
function gxAssina(){ if(_gxSub||!S.db) return; _gxSub=true;
  inscrever('gxacoes',()=>S.db.collection('gxacoes').orderBy('em','desc').limit(300),snap=>{ S.gxAcoes=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(a=>!a.removido); rerenderSeguro(); });
  inscrever('gxseg',()=>S.db.collection('gxseg').orderBy('data','desc').limit(70),snap=>{ const o={}; snap.docs.forEach(d=>{ const x=d.data(); if(x&&x.data) o[x.data]=Object.assign({_id:d.id},x); }); S.gxSeg=o; rerenderSeguro(); }); }

/* ---------- turnos (config/geral.turnos) ---------- */
const GX_TURNO_PADRAO={id:'padrao',nome:'Turno normal',ini:'07:30',fim:'18:00',intv:0,dias:[1,2,3,4,5],linhas:[]};
function gxTurnos(){ const t=S.cfg.turnos; return Array.isArray(t)&&t.length?t:[GX_TURNO_PADRAO]; }
function gxTurnoMin(t){ const a=horaMin(t.ini), b=horaMin(t.fim); if(a==null||b==null) return 0; let d=b-a; if(d<0) d+=1440; return Math.max(0,d-(+t.intv||0)); }
/* turno da linha no dia (linhas vazias = todas as linhas) */
function gxTurnoDe(l,d){ const w=new Date(d+'T12:00:00').getDay(); return gxTurnos().filter(t=>(t.dias||[]).includes(w)&&(!(t.linhas||[]).length||t.linhas.includes(l))); }
function gxTurnoMinDia(l,d){ return gxTurnoDe(l,d).reduce((a,t)=>a+gxTurnoMin(t),0); }

/* ---------- números de um dia ---------- */
function gxEntregasDia(d){ const xs=ritEntregas(d.slice(0,7)), an=new Set(xs.filter(e=>e.anula).map(e=>e.anula));
  return xs.filter(e=>!e.anula&&!e.anulada&&!an.has(e._id)&&gxDiaLocal(e.antecipado&&e.registradoEm?e.registradoEm:e.em)===d); }
function gxOrd(id){ return ordById(id)||(S.ritOrdX||{})[id]||null; }
function gxKgDe(o){ try{ return ritKg(codigoDe(o)); }catch(e){ return 20; } }
function gxTipo(l){ return /rejunte/i.test(l)?'Rejunte':/fixcol/i.test(l)?'Fixcol':/l[ií]quid/i.test(l)?'Área líquida':'Argamassa'; }
let _gxRit={k:'',D:null,t:0};
function gxRit(cp){ const k=cp+'|'+(S.entregas||[]).length+'|'+(S.ordens||[]).length+'|'+((S._ritEnt||{})[cp]||[]).length+'|'+(S.paradas||[]).length; if(_gxRit.k===k&&_gxRit.D&&Date.now()-_gxRit.t<20000) return _gxRit.D;
  let D=null; try{ D=ritDados(cp); }catch(e){ console.warn('[gestor] curva',e); } _gxRit={k,D,t:Date.now()}; return D; }
/* meta do dia por linha (Curva S: meta do mês ÷ dias úteis), em sacos e toneladas */
function gxMetaDia(d){ const D=gxRit(d.slice(0,7)), out={}; if(!D||!D.dias.includes(d)) return out;
  D.its.forEach(x=>{ for(const l in x.dv){ const q=x.prev*x.dv[l]/D.n; const o=out[l]=out[l]||{sc:0,t:0}; o.sc+=q; o.t+=q*(x.kg||20)/1000; } }); return out; }
function gxParadasDia(d){ const t0=new Date(d+'T00:00:00').getTime(), t1=Math.min(Date.now(),new Date(d+'T23:59:59').getTime()), out=[];
  (S.paradas||[]).forEach(p=>{ if(!p.inicio||p.anulada) return; const a=Math.max(t0,new Date(p.inicio).getTime()), b=Math.min(t1,p.fim?new Date(p.fim).getTime():Date.now()); if(b<=a) return; out.push({p,min:(b-a)/6e4,ab:!p.fim,setup:gxSetup(p)}); });
  return out.sort((a,b)=>String(a.p.inicio).localeCompare(String(b.p.inicio))); }
function gxDados(d){ const L=linhasOrd(), h=hojeStr(), ents=gxEntregasDia(d), meta=gxMetaDia(d), par=gxParadasDia(d);
  const lin={}; L.forEach(l=>lin[l]={l,sc:0,t:0,mSc:(meta[l]||{}).sc||0,mT:(meta[l]||{}).t||0,par:0,turno:gxTurnoMinDia(l,d),ords:0,ordsOk:0});
  ents.forEach(e=>{ const o=gxOrd(e.ordem); if(!o){ ritFaltaOrdem(e.ordem); return; } const l=e.linha||o.linha; const x=lin[l]; if(!x) return; const q=+e.qtd||0; x.sc+=q; x.t+=q*gxKgDe(o)/1000; });
  par.forEach(z=>{ if(!z.setup&&lin[z.p.linha]) lin[z.p.linha].par+=z.min; });
  L.forEach(l=>{ const os=(S.ordens||[]).filter(o=>o.linha===l&&!['cancelada','excluida','vinculada'].includes(o.status)&&(dataEf(o)===d||(o.data<=d&&o.ate&&o.ate>=d))); lin[l].ords=os.length; lin[l].ordsOk=os.filter(o=>o.status==='concluida'||entregueDe(o)>=(+o.total||0)).length; });
  const xs=L.map(l=>lin[l]).filter(x=>x.sc||x.mT||x.par||x.ords);
  xs.forEach(x=>{ const tm=x.turno||0; const pm=Math.min(x.par,tm||x.par); x.disp=tm?Math.max(0,1-pm/tm):null; });
  const tot={sc:0,t:0,mT:0,par:0,turno:0}; xs.forEach(x=>{ tot.sc+=x.sc; tot.t+=x.t; tot.mT+=x.mT; tot.par+=x.par; if(x.turno){ tot.turno+=x.turno; } });
  const dispL=xs.filter(x=>x.disp!=null); tot.disp=dispL.length?dispL.reduce((a,x)=>a+x.disp*x.turno,0)/dispL.reduce((a,x)=>a+x.turno,0):null;
  const tipos={}; xs.forEach(x=>{ const k=gxTipo(x.l); tipos[k]=(tipos[k]||0)+x.t; });
  /* manutenção do dia */
  const chs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&(+c.numero||0)<900000);
  const corr=chs.filter(c=>!c.prevId&&(gxDiaLocal(c.criado)===d||(d===h&&!manFechada(c))));
  const prev=chs.filter(c=>c.prevId&&(gxDiaLocal(c.criado)===d||gxDiaLocal(c.concluidoEm)===d||(d===h&&!manFechada(c))));
  let prevAtr=0; try{ if(d===h&&typeof mxPrevStatus==='function') prevAtr=mxPrevStatus().filter(x=>x.st==='atrasada').length; }catch(e){}
  const seg=S.gxSeg[d]||null;
  return {d,lin:xs,tot,tipos,par,corr,prev,prevAtr,seg,ents}; }

/* ---------- peças de tela ---------- */
function gxCab(eye,tit,dir){ return `<div class="head gx-head"><div><div class="eyebrow">${eye}</div><h1>${tit}</h1></div>${dir?`<div class="gx-hd">${dir}</div>`:''}</div>`; }
function gxK(t,v,s,c,bar){ return `<div class="gx-k ${c||''}"><small>${t}</small><b>${v}</b>${s?`<span>${s}</span>`:''}${bar!=null?`<div class="gx-bar"><i style="width:${Math.max(0,Math.min(100,bar))}%"></i></div>`:''}</div>`; }
function gxCor(p){ return p==null?'':p>=95?'ok':p>=80?'warn':'crit'; }
function gxSt(c){ if(c.status==='Concluída') return '<span class="gx-st ok">Concluída</span>'; if(c.exec&&c.exec.tecnico||c.status==='Em execução') return '<span class="gx-st and">Em andamento</span>'; return '<span class="gx-st pen">'+esc(c.status||'Aberta')+'</span>'; }
function gxTabsRel(on){ return `<nav class="gx-rt" aria-label="Relatórios"><button class="${on==='gxdia'?'on':''}" data-go="gxdia" ${on==='gxdia'?'aria-current="page"':''}>Relatório do dia</button><button class="${on==='gxmes'?'on':''}" data-go="gxmes" ${on==='gxmes'?'aria-current="page"':''}>Relatório do mês</button></nav>`; }

/* ---------- alertas do Início ---------- */
function gxAlertas(){ const h=hojeStr(), agora=Date.now(), out=[];
  (S.paradas||[]).filter(p=>!p.fim&&!p.anulada&&!gxSetup(p)).forEach(p=>out.push({c:'crit',t:p.linha+' parada há '+ltvMin(agora-new Date(p.inicio).getTime()),d:(p.motivo||'motivo a definir')+(p.porNome?' · '+p.porNome:''),go:'gxprod'}));
  (S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&!manFechada(c)&&!c.prevId&&!(c.exec&&c.exec.tecnico)).forEach(c=>{ const m=(agora-new Date(c.criado).getTime())/6e4; if(c.impacto==='parou'||m>15) out.push({c:c.impacto==='parou'?'crit':'warn',t:'Chamado '+manNum(c.numero)+' sem técnico há '+ltvMin(agora-new Date(c.criado).getTime()),d:(c.linha||'')+' · '+(c.defeito||'')+(c.impacto==='parou'?' · máquina parada':''),n:c.numero}); });
  try{ const pa=typeof mxPrevStatus==='function'?mxPrevStatus().filter(x=>x.st==='atrasada'):[]; if(pa.length) out.push({c:'warn',t:pa.length+' preventiva'+(pa.length>1?'s':'')+' atrasada'+(pa.length>1?'s':''),d:pa.slice(0,3).map(x=>x.p.tarefa).join(' · '),go:'gxcal'}); }catch(e){}
  const av=S.gxAcoes.filter(a=>a.st!=='ok'&&a.prazo&&a.prazo<h); if(av.length) out.push({c:'warn',t:av.length+' ação'+(av.length>1?'ões':'')+' do plano com prazo vencido',d:av.slice(0,3).map(a=>a.t).join(' · '),go:'gxacoes'});
  try{ const at=repAtrasadas(); if(at.length) out.push({c:'warn',t:at.length+' ordem'+(at.length>1?'ns':'')+' atrasada'+(at.length>1?'s':''),d:gxN(at.reduce((a,o)=>a+Math.max(0,(+o.total||0)-entregueDe(o)),0))+' sacos com data vencida',go:'gxprod'}); }catch(e){}
  try{ const pv=previsaoCimento(); if(pv&&pv.falta) out.push({c:'crit',t:'Falta cimento em '+dm(pv.falta.dia),d:'Ordem '+pv.falta.o.num+' · confira as cargas',go:'gxprod'}); }catch(e){}
  try{ let n=0; linhasOrd().forEach(l=>corLista(l,h).filter(x=>!x._pv).forEach(o=>{ if(tvnRanSit(o).c==='crit') n++; })); if(n) out.push({c:'warn',t:n+' rancho'+(n>1?'s':'')+' atrasado'+(n>1?'s':''),d:'O almoxarifado ainda não entregou',go:'gxprod'}); }catch(e){}
  return out.sort((a,b)=>(a.c==='crit'?0:1)-(b.c==='crit'?0:1)); }

/* ---------- linhas agora ---------- */
function gxLinhaAgora(l){ const agora=Date.now(), p=(S.paradas||[]).find(x=>x.linha===l&&!x.fim&&!x.anulada), o=ordemRodando(l), c=(S.chamados||[]).find(x=>x.linha===l&&!manIgnorar(x)&&!manFechada(x)&&!x.prevId);
  if(p&&!gxSetup(p)) return {c:'crit',st:'Parada '+ltvMin(agora-new Date(p.inicio).getTime()),t:p.motivo||'motivo a definir',s:c?'Chamado '+manNum(c.numero)+(c.exec&&c.exec.tecnico?' · com '+c.exec.tecnico:' · sem técnico'):(o?'OP '+o.num:''),o};
  if(p) return {c:'info',st:'Setup',t:p.motivo,s:o?'OP '+o.num:'',o};
  if(o){ const f=entregueDe(o), tt=+o.total||0; return {c:'ok',st:'Produzindo',t:'OP '+o.num+' · '+String(o.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,''),s:gxN(f)+' de '+gxN(tt)+' '+(typeof ttUn==='function'?ttUn(o):'sc'),pc:tt?Math.min(100,f/tt*100):0,o}; }
  return {c:'neu',st:'Sem ordem',t:'Nada rodando agora',s:''}; }
function gxLinhasHtml(){ return `<div class="gx-ls">${linhasOrd().map(l=>{ const x=gxLinhaAgora(l); return `<div class="gx-l ${x.c}"><div class="gx-lh"><b>${esc(l)}</b><span class="gx-st ${x.c==='ok'?'ok':x.c==='crit'?'atr':x.c==='info'?'and':'pen'}">${esc(x.st)}</span></div><span class="gx-lt">${esc(x.t||'')}</span>${x.pc!=null?`<div class="gx-bar"><i style="width:${x.pc.toFixed(0)}%"></i></div>`:''}<small>${esc(x.s||'')}</small></div>`; }).join('')}</div>`; }

/* ================= INÍCIO ================= */
function vGxInicio(){ gxAssina(); const h=hojeStr(), D=gxDados(h), al=gxAlertas(), agora=new Date();
  const nome=gxEu().split(' ')[0];
  const sau=agora.getHours()<12?'Bom dia':agora.getHours()<18?'Boa tarde':'Boa noite';
  const L=linhasOrd(), rod=L.filter(l=>gxLinhaAgora(l).c==='ok').length, par=L.filter(l=>gxLinhaAgora(l).c==='crit').length;
  const chAb=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&!manFechada(c)), semT=chAb.filter(c=>!(c.exec&&c.exec.tecnico)).length;
  const pc=gxPct(D.tot.t,D.tot.mT), seg=D.seg;
  /* esperado até agora: meta do dia × fração do turno já passada */
  const ini=horaMin(GX_TURNO_PADRAO.ini), fim=horaMin(GX_TURNO_PADRAO.fim), mn=agora.getHours()*60+agora.getMinutes(), fr=Math.max(0,Math.min(1,(mn-ini)/(fim-ini)));
  const chs=chAb.filter(c=>!c.prevId).sort((a,b)=>(a.impacto==='parou'?0:1)-(b.impacto==='parou'?0:1)||String(a.criado).localeCompare(String(b.criado))).slice(0,6);
  let pv=[]; try{ pv=typeof mxPrevStatus==='function'?mxPrevStatus().filter(x=>['atrasada','hoje','aberta','semana'].includes(x.st)).slice(0,6):[]; }catch(e){}
  const D2=gxRit(h.slice(0,7)); let mes='';
  if(D2){ const k=ritStats(D2,{}); const kg=k.kg||20, T=k.T*kg/1000, R=k.ra*kg/1000, Pa=k.pa*kg/1000;
    mes=`<div class="gx-mes"><b>${gxT(R)} t</b><span>de ${gxT(T)} t</span></div><div class="gx-bar big"><i style="width:${T?Math.min(100,R/T*100).toFixed(0):0}%"></i><em style="left:${T?Math.min(100,Pa/T*100).toFixed(0):0}%"></em></div>
      <div class="gx-sub2">Feito ${gxPct(R,T)||0}% · esperado até hoje ${gxPct(Pa,T)||0}%</div><p class="gx-p">${k.rem?`Faltam ${gxT(Math.max(0,T-R))} t em ${k.rem} dia${k.rem>1?'s':''} út${k.rem>1?'eis':'il'}: ${gxT(Math.max(0,T-R)/k.rem)} t por dia.`:'Mês fechado.'}</p>`; }
  else mes='<div class="empty">A previsão do mês ainda não foi importada na Curva S.</div>';
  const ac=S.gxAcoes.filter(a=>a.st!=='ok').sort((a,b)=>String(a.prazo||'9').localeCompare(String(b.prazo||'9'))).slice(0,6);
  return `${banner()}<div class="head gx-head"><div><div class="eyebrow">${gxDiaTxt(h).toUpperCase()} · AO VIVO</div><h1>${sau}${nome?', '+esc(nome):''}</h1></div>
     <div class="gx-hd"><button class="btn sec" data-go="manprev">${ic('cal2',18,2)}Programar preventiva</button><button class="btn sec" data-act="gx-ac-nova">${ic('mais',18,2)}Nova ação</button><button class="btn" data-go="gxdia">${ic('folha',18,2)}Relatório do dia</button></div></div>
   <section class="card gx-al"><div class="gx-ch"><h2>Precisa de você (${al.length})</h2><span class="gx-mut">Só o que saiu do normal. O resto anda sozinho.</span></div>
     ${al.length?al.map(a=>`<div class="gx-ali ${a.c}"><div><b>${esc(a.t)}</b><span>${esc(a.d||'')}</span></div>${a.n?`<button class="btn sec" data-act="man-abrir" data-n="${a.n}" data-ir="1">Ver chamado</button>`:a.go?`<button class="btn sec" data-go="${a.go}">Ver</button>`:''}</div>`).join(''):'<div class="gx-ok">Tudo em ordem. Nada precisa de você agora.</div>'}</section>
   <section class="gx-ks">
     ${gxK('Produção até agora',gxT(D.tot.t)+' t',D.tot.mT?'esperado agora: '+gxT(D.tot.mT*fr)+' t':gxN(D.tot.sc)+' sacos')}
     ${gxK('Meta do dia',D.tot.mT?gxT(D.tot.mT)+' t':'—',pc!=null?pc+'% feito':'sem meta (Curva S)',gxCor(pc),pc)}
     ${gxK('Linhas rodando',rod+' de '+L.length,par?par+' parada'+(par>1?'s':''):'nenhuma parada',par?'crit':'')}
     ${gxK('Paradas hoje',gxDur(D.tot.par),D.par.filter(z=>!z.setup).length+' parada(s) · setup não conta')}
     ${gxK('Chamados abertos',String(chAb.length),semT?semT+' sem técnico':'todos com técnico',semT?'warn':'')}
     ${gxK('Segurança',seg?(+seg.ocorr?seg.ocorr+' ocorrência'+(+seg.ocorr>1?'s':''):'Sem ocorrências'):'Não preenchido',seg?(seg.pessoas?seg.pessoas+' pessoas':'')+(seg.epi!=null&&seg.epi!==''?' · EPI '+seg.epi+'%':''):'preencher hoje',seg?(+seg.ocorr?'crit':'ok'):'warn')}
   </section>
   <div class="gx-g2">
     <section class="card"><div class="gx-ch"><h2>Linhas agora</h2><button class="lnk" data-go="gxprod">Ver produção</button></div>${gxLinhasHtml()}</section>
     <section class="card"><div class="gx-ch"><h2>Chamados de manutenção</h2><span class="gx-mut">a produção abre, a equipe atende</span></div>
       ${chs.length?`<div class="gx-lista">${chs.map(c=>`<button class="gx-li" data-act="man-abrir" data-n="${c.numero}" data-ir="1"><div><b>${manNum(c.numero)} · ${esc(c.linha||'')}</b><span>${esc(c.defeito||'')} · há ${ltvMin(Date.now()-new Date(c.criado).getTime())}${c.exec&&c.exec.tecnico?' · '+esc(c.exec.tecnico):''}</span></div>${c.impacto==='parou'&&!(c.exec&&c.exec.tecnico)?'<span class="gx-st atr">Máquina parada</span>':gxSt(c)}</button>`).join('')}</div>`:'<div class="gx-ok">Nenhum chamado aberto.</div>'}
       <div class="gx-ac"><button class="lnk" data-go="manch">Todos os chamados</button></div></section>
     <section class="card"><div class="gx-ch"><h2>Preventivas da semana</h2><button class="lnk" data-go="gxcal">Ver calendário</button></div>
       ${pv.length?`<div class="gx-lista">${pv.map(x=>`<div class="gx-li"><div><b>${x.p.prox?dm(x.p.prox):'—'} · ${esc(x.p.tarefa)}</b><span>${esc((x.e&&x.e.nome)||'')}${x.p.resp?' · '+esc(x.p.resp):''}</span></div><span class="gx-st ${x.st==='atrasada'?'atr':x.st==='aberta'?'and':'pen'}">${x.st==='atrasada'?'Atrasada':x.st==='aberta'?'OS aberta':x.st==='hoje'?'Hoje':'Esta semana'}</span></div>`).join('')}</div>`:'<div class="gx-ok">Nenhuma preventiva para esta semana.</div>'}</section>
     <section class="card"><div class="gx-ch"><h2>Produção do mês</h2><span class="gx-mut">Curva S</span></div>${mes}<div class="gx-ac"><button class="lnk" data-go="gxmes">Ver relatório do mês</button></div></section>
     <section class="card"><div class="gx-ch"><h2>Plano de ação</h2><span class="gx-mut">${S.gxAcoes.filter(a=>a.st!=='ok').length} aberta(s)</span></div>
       ${ac.length?`<div class="gx-lista">${ac.map(a=>`<label class="gx-chk"><input type="checkbox" data-gxac-ok="${esc(a._id)}"><span><b>${esc(a.t)}</b><small>${esc(a.quem||'')}${a.prazo?' · até '+dm(a.prazo):''}</small></span>${gxAcSt(a)}</label>`).join('')}</div>`:'<div class="gx-ok">Nenhuma ação aberta.</div>'}
       <div class="gx-ac"><button class="lnk" data-go="gxacoes">Ver todas</button></div></section>
   </div>
   ${S.gx.acNova?gxAcForm():''}`; }

/* ================= PRODUÇÃO ================= */
function vGxProd(){ gxAssina(); const h=hojeStr(), D=gxDados(h), L=linhasOrd(), agora=Date.now();
  const al=gxAlertas().filter(a=>a.go==='gxprod'||/parada/.test(a.t));
  const R=gxRit(h.slice(0,7)); let rit='<div class="empty">A previsão do mês ainda não foi importada na Curva S.</div>';
  if(R){ const ls=R.LS, sel=ls.includes(S.gx.rl)?S.gx.rl:''; const k=ritStats(R,sel?{l:sel}:{}), kg=k.kg||20, t=v=>gxT(v*kg/1000);
    rit=`<div class="gx-chips" role="group" aria-label="Linha">${[''].concat(ls).map(l=>`<button class="gx-chip" data-act="gx-rl" data-v="${esc(l)}" aria-pressed="${sel===l}">${l?esc(l):'Total'}</button>`).join('')}</div>
     <div class="gx-ks4">${gxK('Previsto até hoje',t(k.pa)+' t',gxN(k.pa)+' sacos')}${gxK('Realizado',t(k.ra)+' t',gxN(k.ra)+' sacos')}${gxK('Desvio',(k.dev>=0?'+':'')+t(k.dev)+' t',k.pa?Math.round(k.ratio*100)+'% do previsto':'',k.dev>=0?'ok':k.ratio>=.95?'warn':'crit')}${gxK('Precisa por dia',t(k.need)+' t',k.rem+' dia(s) útil(eis) sobrando')}</div>
     <div class="gx-bar big"><i style="width:${k.T?Math.min(100,k.ra/k.T*100).toFixed(0):0}%"></i><em style="left:${k.T?Math.min(100,k.pa/k.T*100).toFixed(0):0}%"></em></div>
     <div class="gx-sub2">Feito ${gxPct(k.ra,k.T)||0}% da meta do mês (${t(k.T)} t) · esperado hoje ${gxPct(k.pa,k.T)||0}% · ${esc(ritSt(k).t)}</div>`; }
  /* silos */
  let sil=''; try{ const sal=saldoPorSilo(), gr={}; (S.cfg.silos||[]).forEach(s=>{ (gr[s.grupo||'Outros']=gr[s.grupo||'Outros']||[]).push(s); });
    sil=Object.keys(gr).map(g=>{ const tot=gr[g].reduce((a,s)=>a+(sal[s.id]?sal[s.id].q:0),0); return `<div class="gx-sg"><b>${esc(g.toUpperCase())} · ${gxN(tot)} t</b>${gr[g].map(s=>{ const q=sal[s.id]?sal[s.id].q:0, p=s.cap?q/s.cap:0, nv=nivel(p); return `<div class="gx-sl"><span>${esc(s.nome)}</span><div class="gx-bar"><i class="${nv.c}" style="width:${Math.min(100,p*100).toFixed(0)}%"></i></div><b>${gxN(q)} t</b><small>de ${gxN(s.cap||0)}</small></div>`; }).join('')}</div>`; }).join('');
    const pv=previsaoCimento(); if(pv) sil+=`<p class="gx-p">${pv.falta?'<b class="crit">Falta cimento em '+dm(pv.falta.dia)+' (ordem '+esc(pv.falta.o.num)+')</b>':'O cimento cobre as ordens abertas.'}</p>`; }catch(e){ sil='<div class="empty">Silos ainda carregando…</div>'; }
  /* diário de bordo (ranchos de hoje) */
  let rs=[]; try{ L.forEach(l=>corLista(l,h).filter(x=>!x._pv).forEach(o=>rs.push({o,s:tvnRanSit(o)}))); }catch(e){}
  const cnt=k=>rs.filter(r=>k==='atr'?r.s.c==='crit'&&!r.s.ent:k==='ent'?r.s.ent:k==='env'?(r.s.env||r.s.sep)&&r.s.c!=='crit':!r.s.ent&&!r.s.env&&!r.s.sep&&r.s.c!=='crit').length;
  const parM={}; D.par.filter(z=>!z.setup).forEach(z=>{ const k=z.p.motivo||'Sem motivo'; parM[k]=(parM[k]||0)+z.min; });
  let atr=[]; try{ atr=repAtrasadas(); }catch(e){}
  return `${banner()}${gxCab('PRODUÇÃO · VISÃO DO GESTOR',gxDiaTxt(h)+' · ao vivo',`<button class="btn sec" data-go="gxdia">Relatório do dia</button><button class="btn" data-go="gxmes">Relatório do mês</button>`)}
   <div class="gx-g2">
    <section class="card gx-al"><div class="gx-ch"><h2>O que precisa de atenção</h2><span class="gx-mut">paradas, atrasos, ranchos e cimento</span></div>${al.length?al.map(a=>`<div class="gx-ali ${a.c}"><div><b>${esc(a.t)}</b><span>${esc(a.d||'')}</span></div></div>`).join(''):'<div class="gx-ok">Nada fora do normal agora.</div>'}</section>
    <section class="card"><div class="gx-ch"><h2>Ritmo do mês</h2><span class="gx-mut">previsto × realizado · ${gxMesTxt(h.slice(0,7))}</span></div>${rit}</section>
   </div>
   <section class="card"><div class="gx-ch"><h2>Todas as linhas</h2><span class="gx-mut">ordem atual, andamento e situação</span></div>${gxLinhasHtml()}</section>
   <div class="gx-g3">
    <section class="card"><div class="gx-ch"><h2>Silos</h2><span class="gx-mut">toneladas agora</span></div>${sil}</section>
    <section class="card"><div class="gx-ch"><h2>Diário de bordo</h2><button class="lnk" data-go="diario">ranchos de hoje</button></div>
      <div class="gx-ks4 sm">${gxK('a separar',String(cnt('sep')))}${gxK('enviados',String(cnt('env')))}${gxK('entregues',String(cnt('ent')),'','ok')}${gxK('atrasados',String(cnt('atr')),'',cnt('atr')?'crit':'')}</div>
      ${rs.filter(r=>!r.s.ent).slice(0,6).map(r=>`<div class="gx-r"><span>OP ${esc(r.o.num)} · ${esc(r.o.linha)}</span><b class="${r.s.c==='crit'?'crit':''}">${esc(r.s.t)}</b></div>`).join('')}</section>
    <section class="card"><div class="gx-ch"><h2>Paradas hoje</h2><span class="gx-mut">${gxDur(D.tot.par)} · ${D.par.filter(z=>!z.setup).length} parada(s)</span></div>
      ${Object.keys(parM).length?Object.entries(parM).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<div class="gx-r"><span>${esc(m)}</span><b>${gxDur(v)}</b></div>`).join(''):'<div class="gx-ok">Nenhuma parada hoje.</div>'}
      <p class="gx-p">Setup não conta como parada.</p></section>
   </div>
   <section class="card"><div class="gx-ch"><h2>Ordens atrasadas</h2><span class="gx-mut">data vencida e saldo a produzir</span></div>
    ${atr.length?`<div class="gx-tb"><table><thead><tr><th>OP</th><th>Linha</th><th>Produto</th><th>Era para</th><th class="n">Saldo</th></tr></thead><tbody>${atr.slice(0,15).map(o=>`<tr><td>${esc(o.num)}</td><td>${esc(o.linha)}</td><td>${esc(String(o.produto||'').slice(0,50))}</td><td>${dm(dataEf(o))}</td><td class="n">${gxN(Math.max(0,(+o.total||0)-entregueDe(o)))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="gx-ok">Nenhuma ordem atrasada.</div>'}</section>`; }

/* ================= RELATÓRIO DO DIA ================= */
function gxDiaHtml(D,pdf){ const T=D.tot, pc=gxPct(T.t,T.mT), corr=D.corr, prev=D.prev, seg=D.seg, h=hojeStr();
  const cC=corr.filter(c=>c.status==='Concluída').length, pC=prev.filter(c=>c.status==='Concluída').length;
  const tipos=Object.entries(D.tipos).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]), cores=['#143F54','#3F6F93','#9FB7C8','#AD8432','#5FA884'];
  let acc=0; const grad=tipos.map(([k,v],i)=>{ const a=acc; acc+=T.t?v/T.t*100:0; return `${cores[i%5]} ${a.toFixed(1)}% ${acc.toFixed(1)}%`; }).join(',');
  const mx=Math.max(1,...D.lin.map(x=>Math.max(x.t,x.mT)));
  const acs=S.gxAcoes.filter(a=>a.st!=='ok'||(a.feitoEm&&gxDiaLocal(a.feitoEm)===D.d)).slice(0,12);
  return `<section class="gx-ks">
     ${gxK('Produção do dia',gxT(T.t)+' t',gxN(T.sc)+' sacos · '+D.lin.filter(x=>x.sc).length+' linha(s)')}
     ${gxK('Meta do dia',T.mT?gxT(T.mT)+' t':'—',pc!=null?pc+'% atingido':'sem meta da Curva S',gxCor(pc),pc)}
     ${gxK('Disponibilidade',T.disp!=null?gxN(T.disp*100,1)+'%':'—','tempo rodando ÷ turno',T.disp!=null?(T.disp>=.95?'ok':T.disp>=.85?'warn':'crit'):'',T.disp!=null?T.disp*100:null)}
     ${gxK('Paradas',gxDur(T.par),D.par.filter(z=>!z.setup).length+' parada(s)'+(T.turno?' · '+gxN(T.par/T.turno*100,1)+'% do turno':''),T.par>0?'crit':'')}
     ${gxK('Corretiva',corr.length+' OS',cC+' concluída(s) · '+(corr.length-cC)+' em aberto')}
     ${gxK('Preventiva',prev.length+' OS',pC+' concluída(s)'+(D.prevAtr?' · '+D.prevAtr+' atrasada(s)':''),D.prevAtr?'warn':'')}
     ${gxK('Segurança',seg?(+seg.ocorr?seg.ocorr+' ocorrência(s)':'Sem ocorrências'):'Não preenchido',seg?(seg.pessoas?seg.pessoas+' pessoas':'')+(seg.epi!==''&&seg.epi!=null?' · EPI '+seg.epi+'%':''):'',seg?(+seg.ocorr?'crit':'ok'):'')}
   </section>
   <div class="gx-g2">
    <section class="card gx-w2"><div class="gx-ch"><h2>Produção por linha</h2><span class="gx-auto">do painel</span></div>
     ${D.lin.length?`<div class="gx-leg"><span><i style="background:#143F54"></i>Realizado</span><span><i style="background:#C9D3DA"></i>Meta</span></div>
     <div class="gx-barras">${D.lin.map(x=>{ const p=gxPct(x.t,x.mT); return `<div class="gx-bc"><div class="gx-bp"><div><b>${gxT(x.t)}</b><i style="height:${(x.t/mx*100).toFixed(0)}%;background:#143F54"></i></div><div><span>${x.mT?gxT(x.mT):'—'}</span><i style="height:${(x.mT/mx*100).toFixed(0)}%;background:#C9D3DA"></i></div></div><b>${esc(x.l)}</b><span class="${gxCor(p)}">${p!=null?p+'%':'—'}</span></div>`; }).join('')}</div>
     <div class="gx-tb"><table><thead><tr><th>Linha</th><th class="n">Realizado (t)</th><th class="n">Sacos</th><th class="n">Meta (t)</th><th class="n">Atingido</th><th>Ordens do dia</th></tr></thead><tbody>
      ${D.lin.map(x=>`<tr><td>${esc(x.l)}</td><td class="n">${gxT(x.t)}</td><td class="n">${gxN(x.sc)}</td><td class="n">${x.mT?gxT(x.mT):'—'}</td><td class="n">${x.mT?gxPct(x.t,x.mT)+'%':'—'}</td><td>${x.ords?x.ordsOk+' de '+x.ords+' concluída(s)':'—'}</td></tr>`).join('')}
      <tr class="gx-tot"><td>Total</td><td class="n">${gxT(T.t)}</td><td class="n">${gxN(T.sc)}</td><td class="n">${T.mT?gxT(T.mT):'—'}</td><td class="n">${pc!=null?pc+'%':'—'}</td><td>${D.lin.reduce((a,x)=>a+x.ordsOk,0)} de ${D.lin.reduce((a,x)=>a+x.ords,0)}</td></tr></tbody></table></div>`:'<div class="empty">Sem produção e sem meta neste dia.</div>'}</section>
    <section class="card"><div class="gx-ch"><h2>Produção por tipo</h2><span class="gx-auto">do painel</span></div>
     ${tipos.length?`<div class="gx-pz"><div class="gx-pie" role="img" aria-label="${esc(tipos.map(([k,v])=>k+' '+gxPct(v,T.t)+'%').join(', '))}" style="background:conic-gradient(${grad})"><div><b>${gxT(T.t)}</b><small>toneladas</small></div></div>
      <div class="gx-pl">${tipos.map(([k,v],i)=>`<div><i style="background:${cores[i%5]}"></i><span>${esc(k)}</span><b>${gxT(v)} t</b><small>${gxPct(v,T.t)}%</small></div>`).join('')}</div></div>`:'<div class="empty">Sem produção neste dia.</div>'}</section>
    <section class="card"><div class="gx-ch"><h2>Disponibilidade das linhas</h2><span class="gx-auto">do painel</span></div>
     ${D.lin.filter(x=>x.disp!=null).map(x=>`<div class="gx-sl"><span>${esc(x.l)}</span><div class="gx-bar"><i class="${x.disp>=.95?'ok':x.disp>=.85?'warn':'crit'}" style="width:${(x.disp*100).toFixed(0)}%"></i></div><b>${gxN(x.disp*100,1)}%</b><small>${gxDur(x.par)} parada</small></div>`).join('')||'<div class="empty">Nenhuma linha com turno neste dia.</div>'}
     <p class="gx-p">Turno da linha (Cadastros › Turnos) menos o tempo parado. Setup não conta.</p></section>
    <section class="card gx-w2"><div class="gx-ch"><h2>Paradas de produção</h2><span class="gx-auto">do painel</span></div>
     ${D.par.length?`<div class="gx-tb"><table><thead><tr><th>Início</th><th>Fim</th><th>Linha</th><th>Motivo</th><th class="n">Tempo</th></tr></thead><tbody>${D.par.map(z=>`<tr${z.setup?' class="gx-mut"':''}><td>${hora(z.p.inicio)}</td><td>${z.p.fim?hora(z.p.fim):'<b class="crit">aberta</b>'}</td><td>${esc(z.p.linha)}</td><td>${esc(z.p.motivo||'')}${z.setup?' (setup, não conta)':''}${z.p.obs?' · '+esc(String(z.p.obs).slice(0,60)):''}</td><td class="n">${gxDur(z.min)}</td></tr>`).join('')}
      <tr class="gx-tot"><td colspan="4">Total (sem setup)</td><td class="n crit">${gxDur(T.par)}</td></tr></tbody></table></div>`:'<div class="gx-ok">Nenhuma parada neste dia.</div>'}</section>
    <section class="card"><div class="gx-ch"><h2>Manutenção corretiva</h2><span class="gx-auto">chamados</span></div>
     ${corr.length?`<div class="gx-tb"><table><thead><tr><th>OS</th><th>Onde</th><th>Defeito</th><th>Situação</th></tr></thead><tbody>${corr.map(c=>`<tr><td>${manNum(c.numero)}</td><td>${esc(c.linha||'')}${c.equip?' · '+esc(c.equip):''}</td><td>${esc(c.defeito||'')}</td><td>${gxSt(c)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="gx-ok">Nenhum chamado neste dia.</div>'}
     ${pdf?'':'<div class="gx-ac"><button class="btn sec" data-act="gx-novaos">+ Nova OS corretiva</button></div>'}</section>
    <section class="card"><div class="gx-ch"><h2>Manutenção preventiva</h2><span class="gx-auto">preventivas</span></div>
     ${prev.length?`<div class="gx-tb"><table><thead><tr><th>OS</th><th>Onde</th><th>Serviço</th><th>Situação</th></tr></thead><tbody>${prev.map(c=>`<tr><td>${manNum(c.numero)}</td><td>${esc(c.equip||c.linha||'')}</td><td>${esc(String(c.defeito||'').replace(/^PREVENTIVA:\s*/i,''))}</td><td>${gxSt(c)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="gx-ok">Nenhuma preventiva neste dia.</div>'}
     ${pdf?'':'<div class="gx-ac"><button class="btn sec" data-go="manprev">+ Programar preventiva</button></div>'}</section>
    <section class="card"><div class="gx-ch"><h2>Segurança do trabalho</h2><span class="gx-mao">você preenche</span></div>
     ${seg?`<div class="gx-segg">${[['Ocorrências',seg.ocorr,+seg.ocorr?'crit':'ok'],['Pessoas presentes',seg.pessoas],['Uso de EPI',seg.epi!==''&&seg.epi!=null?seg.epi+'%':'—'],['Desvios',seg.desvios,+seg.desvios?'warn':''],['Inspeções feitas',seg.insp!==''&&seg.insp!=null?seg.insp+'%':'—']].map(([t,v,c])=>`<div class="${c||''}"><small>${t}</small><b>${v===''||v==null?'—':esc(String(v))}</b></div>`).join('')}</div>${seg.obs?`<p class="gx-p">${esc(seg.obs)}</p>`:''}`:'<div class="empty">Ainda não preenchido.</div>'}
     ${pdf?'':`<div class="gx-ac"><button class="btn sec" data-act="gx-seg-ir" data-d="${D.d}">Preencher segurança</button></div>`}</section>
    <section class="card"><div class="gx-ch"><h2>Plano de ação</h2><span class="gx-mao">você preenche</span></div>
     ${acs.length?`<div class="gx-tb"><table><thead><tr><th>O que fazer</th><th>Quem</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>${acs.map(a=>`<tr><td>${esc(a.t)}</td><td>${esc(a.quem||'')}</td><td>${a.prazo?dm(a.prazo):'—'}</td><td>${gxAcSt(a)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="gx-ok">Nenhuma ação aberta.</div>'}
     ${pdf?'':'<div class="gx-ac"><button class="btn sec" data-act="gx-ac-nova">+ Nova ação</button></div>'}</section>
   </div>`; }
function vGxDia(){ gxAssina(); const d=S.gx.dia||hojeStr(), h=hojeStr(), D=gxDados(d), cp=d.slice(0,7);
  /* dias anteriores do mês: produção ÷ meta */
  const R=gxRit(cp), dias=(R?R.dias:[]).filter(x=>x<=h);
  const hist=dias.map(x=>{ const z=gxDados(x); const p=gxPct(z.tot.t,z.tot.mT); return `<button class="gx-hd1 ${gxCor(p)}" data-act="gx-dia" data-d="${x}" aria-pressed="${x===d}" aria-label="${dm(x)}: ${p!=null?p+'% da meta':'sem meta'}"><span class="gx-hb"><i style="height:${Math.min(100,p||0)}%"></i></span><b>${p!=null?p+'%':'—'}</b><small>${GX_DIAS[new Date(x+'T12:00:00').getDay()]} ${x.slice(8)}</small></button>`; }).join('');
  const resp=gxEu();
  return `${banner()}${gxCab('RELATÓRIOS · FÁBRICA DE ARGAMASSA E REJUNTE','Relatório do dia',`<button class="btn" data-act="gx-pdf-dia">${ic('baixar',18,2)}Baixar PDF do dia</button>`)}
   ${gxTabsRel('gxdia')}
   <div class="gx-dn"><button class="btn sec" data-act="gx-dia-mv" data-v="-1" aria-label="Dia anterior">‹</button><label><span>DIA</span><input type="date" id="gx-dia" value="${d}" max="${h}"></label><button class="btn sec" data-act="gx-dia-mv" data-v="1" aria-label="Próximo dia" ${d>=h?'disabled':''}>›</button>
     <div class="gx-mut">${gxDiaTxt(d)}${resp?' · Responsável '+esc(resp):''}<br><span class="gx-auto">do painel</span> vem sozinho · <span class="gx-mao">você preenche</span> segurança e plano de ação</div></div>
   ${dias.length?`<section class="card"><div class="gx-ch"><h2>Dias anteriores · ${gxMesTxt(cp).split(' ')[0]}</h2><span class="gx-mut">Produção ÷ meta do dia. Clique num dia para abrir.</span></div><div class="gx-hist">${hist}</div></section>`:''}
   ${gxDiaHtml(D,false)}`; }

/* ================= RELATÓRIO DO MÊS ================= */
function gxMesDados(cp){ const R=gxRit(cp), h=hojeStr(); if(!R) return null; const dias=R.dias, ate=dias.filter(d=>d<=h);
  const porDia=dias.map(d=>{ if(d>h) return {d,fut:true}; const z=gxDados(d); return {d,t:z.tot.t,m:z.tot.mT,par:z.tot.par,disp:z.tot.disp,lin:z.lin}; });
  const lin={}; porDia.filter(x=>!x.fut).forEach(x=>x.lin.forEach(y=>{ const o=lin[y.l]=lin[y.l]||{l:y.l,t:0,mAte:0,par:0,turno:0}; o.t+=y.t; o.mAte+=y.mT; o.par+=Math.min(y.par,y.turno||y.par); o.turno+=y.turno||0; }));
  const metaMes={}; R.its.forEach(x=>{ for(const l in x.dv){ metaMes[l]=(metaMes[l]||0)+x.prev*x.dv[l]*(x.kg||20)/1000; } });
  Object.keys(metaMes).forEach(l=>{ if(!lin[l]) lin[l]={l,t:0,mAte:0,par:0,turno:0}; lin[l].mMes=metaMes[l]; });
  const L=linhasOrd(), ls=Object.values(lin).sort((a,b)=>L.indexOf(a.l)-L.indexOf(b.l));
  const tot={t:0,mAte:0,mMes:0,par:0,turno:0}; ls.forEach(x=>{ tot.t+=x.t; tot.mAte+=x.mAte; tot.mMes+=x.mMes||0; tot.par+=x.par; tot.turno+=x.turno; });
  const parM={}; const t0=new Date(cp+'-01T00:00:00').getTime(), t1=Math.min(Date.now(),new Date(dias[dias.length-1]+'T23:59:59').getTime()+86400000*2);
  (S.paradas||[]).forEach(p=>{ if(!p.inicio||p.anulada||gxSetup(p)) return; const a=Math.max(t0,new Date(p.inicio).getTime()), b=Math.min(t1,p.fim?new Date(p.fim).getTime():Date.now()); if(b<=a||gxDiaLocal(p.inicio).slice(0,7)!==cp) return; const k=p.motivo||'Sem motivo'; parM[k]=(parM[k]||0)+(b-a)/6e4; });
  const nPar=(S.paradas||[]).filter(p=>p.inicio&&!p.anulada&&!gxSetup(p)&&gxDiaLocal(p.inicio).slice(0,7)===cp).length;
  const chs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&gxDiaLocal(c.criado).slice(0,7)===cp), corr=chs.filter(c=>!c.prevId), prev=chs.filter(c=>c.prevId);
  let MZ=null; try{ MZ=mzDados(cp); }catch(e){}
  const segs=Object.values(S.gxSeg).filter(s=>s.data&&s.data.slice(0,7)===cp), ocorr=segs.reduce((a,s)=>a+(+s.ocorr||0),0), desv=segs.reduce((a,s)=>a+(+s.desvios||0),0);
  const ultOc=Object.values(S.gxSeg).filter(s=>+s.ocorr>0).map(s=>s.data).sort().pop();
  return {cp,R,dias,ate,porDia,ls,tot,parM,nPar,corr,prev,MZ,segs,ocorr,desv,ultOc,rem:dias.filter(d=>d>h).length}; }
function gxMesHtml(M){ const T=M.tot, pc=gxPct(T.t,T.mAte), disp=T.turno?1-T.par/T.turno:null, cC=M.corr.filter(c=>c.status==='Concluída').length, pC=M.prev.filter(c=>c.status==='Concluída').length;
  const mx=Math.max(1,...M.porDia.map(x=>Math.max(x.t||0,x.m||0)));
  /* curva S: acumulados */
  let ra=0, pa=0; const pts=M.porDia.map(x=>{ pa+=x.m!=null?x.m:(T.mMes/M.dias.length); if(!x.fut) ra+=x.t||0; return {pa,ra:x.fut?null:ra}; });
  const W=600, Hh=180, my=Math.max(1,T.mMes,pa,ra), X=i=>(i/(Math.max(1,pts.length-1))*W).toFixed(1), Y=v=>(Hh-v/my*Hh).toFixed(1);
  const lp=pts.map((p,i)=>X(i)+','+Y(p.pa)).join(' '), lr=pts.filter(p=>p.ra!=null).map((p,i)=>X(i)+','+Y(p.ra)).join(' ');
  const parT=Object.values(M.parM).reduce((a,v)=>a+v,0), mxP=Math.max(1,...Object.values(M.parM));
  const diasSem=M.ultOc?Math.floor((new Date(hojeStr()+'T12:00:00')-new Date(M.ultOc+'T12:00:00'))/864e5):null;
  return `<section class="gx-ks">
    ${gxK('Produção do mês',gxT(T.t)+' t','de '+gxT(T.mMes)+' t · '+(gxPct(T.t,T.mMes)||0)+'% do mês')}
    ${gxK('Meta até hoje',gxT(T.mAte)+' t',pc!=null?pc+'% atingido':'',gxCor(pc),pc)}
    ${gxK('Disponibilidade',disp!=null?gxN(disp*100,1)+'%':'—','média das linhas',disp!=null?(disp>=.95?'ok':disp>=.85?'warn':'crit'):'')}
    ${gxK('Paradas',gxDur(parT),M.nPar+' parada(s) no mês')}
    ${gxK('Corretivas',M.corr.length+' OS',cC+' concluída(s)'+(M.MZ&&M.MZ.rep!=null?' · '+gxDur(M.MZ.rep)+' em média':''))}
    ${gxK('Preventivas',M.prev.length?gxPct(pC,M.prev.length)+'%':'—',pC+' de '+M.prev.length+' concluída(s)')}
    ${gxK('Segurança',M.ocorr?M.ocorr+' ocorrência(s)':'0 acidentes',(diasSem!=null?diasSem+' dias sem acidente · ':'')+M.desv+' desvio(s)',M.ocorr?'crit':'ok')}
    ${gxK('Dias úteis',M.ate.length+' de '+M.dias.length,M.rem?'faltam '+gxT(Math.max(0,T.mMes-T.t))+' t: '+gxT(Math.max(0,T.mMes-T.t)/M.rem)+' t/dia':'mês fechado')}
   </section>
   <div class="gx-g2">
    <section class="card gx-w2"><div class="gx-ch"><h2>Produção por dia</h2><span class="gx-mut">toneladas · traço = meta do dia</span></div>
     <div class="gx-pd">${M.porDia.map(x=>{ const p=gxPct(x.t,x.m); return `<div class="gx-pdc" title="${dm(x.d)}: ${x.fut?'ainda não chegou':gxT(x.t)+' t de '+gxT(x.m)+' t'}"><div class="gx-pdb">${x.fut?'':`<i class="${gxCor(p)}" style="height:${((x.t||0)/mx*100).toFixed(0)}%"></i>`}<em style="bottom:${((x.m||0)/mx*100).toFixed(0)}%"></em></div><small>${x.d.slice(8)}</small></div>`; }).join('')}</div>
     <div class="gx-leg"><span><i class="ok"></i>95% da meta ou mais</span><span><i class="warn"></i>80 a 95%</span><span><i class="crit"></i>abaixo de 80%</span></div></section>
    <section class="card gx-w2"><div class="gx-ch"><h2>Curva S do mês</h2><span class="gx-mut">realizado acumulado × planejado</span></div>
     <svg class="gx-cs" viewBox="-4 -6 ${W+8} ${Hh+12}" role="img" aria-label="Realizado acumulado ${gxT(ra)} t contra planejado ${gxT(T.mAte)} t até hoje"><polyline points="${lp}" fill="none" stroke="#9FB7C8" stroke-width="3" stroke-dasharray="6 5"/><polyline points="${lr}" fill="none" stroke="#143F54" stroke-width="4"/></svg>
     <div class="gx-leg"><span><i style="background:#143F54"></i>Realizado acumulado</span><span><i style="background:#9FB7C8"></i>Planejado (meta do mês)</span></div></section>
    <section class="card gx-w2"><div class="gx-ch"><h2>Por linha</h2></div><div class="gx-tb"><table><thead><tr><th>Linha</th><th class="n">Meta do mês (t)</th><th class="n">Meta até hoje</th><th class="n">Realizado (t)</th><th class="n">Atingido</th><th class="n">Disponib.</th></tr></thead><tbody>
     ${M.ls.map(x=>`<tr><td>${esc(x.l)}</td><td class="n">${gxT(x.mMes||0)}</td><td class="n">${gxT(x.mAte)}</td><td class="n">${gxT(x.t)}</td><td class="n">${x.mAte?gxN(x.t/x.mAte*100,1)+'%':'—'}</td><td class="n">${x.turno?gxN((1-x.par/x.turno)*100,1)+'%':'—'}</td></tr>`).join('')}
     <tr class="gx-tot"><td>Total</td><td class="n">${gxT(T.mMes)}</td><td class="n">${gxT(T.mAte)}</td><td class="n">${gxT(T.t)}</td><td class="n">${pc!=null?gxN(T.t/T.mAte*100,1)+'%':'—'}</td><td class="n">${disp!=null?gxN(disp*100,1)+'%':'—'}</td></tr></tbody></table></div></section>
    <section class="card gx-w2"><div class="gx-ch"><h2>Paradas por causa</h2><span class="gx-mut">${gxDur(parT)} no mês · setup não conta</span></div>
     ${Object.keys(M.parM).length?Object.entries(M.parM).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="gx-sl"><span>${esc(k)}</span><div class="gx-bar"><i class="crit" style="width:${(v/mxP*100).toFixed(0)}%"></i></div><b>${gxDur(v)}</b><small>${gxPct(v,parT)}%</small></div>`).join(''):'<div class="gx-ok">Nenhuma parada no mês.</div>'}</section>
   </div>`; }
function vGxMes(){ gxAssina(); const h=hojeStr(), cp=S.gx.cp||h.slice(0,7), M=gxMesDados(cp);
  const meses=[]; for(let i=0;i<12;i++){ const d=new Date(+h.slice(0,4),+h.slice(5,7)-1-i,1); meses.push(d.getFullYear()+'-'+pad(d.getMonth()+1)); }
  return `${banner()}${gxCab('RELATÓRIOS · '+gxMesTxt(cp).toUpperCase(),'Relatório do mês',`<label class="gx-sel"><span class="gx-sr">Mês</span><select id="gx-mes">${meses.map(m=>`<option value="${m}" ${m===cp?'selected':''}>${gxMesTxt(m)}</option>`).join('')}</select></label><button class="btn" data-act="gx-pdf-mes" ${M?'':'disabled'}>${ic('baixar',18,2)}Baixar PDF do mês</button>`)}
   ${gxTabsRel('gxmes')}
   ${M?gxMesHtml(M):'<section class="card"><div class="empty">A previsão deste mês não foi importada na Curva S (Análise › Base de dados). Sem ela não há meta para comparar.</div></section>'}`; }

/* ---------- PDF (janela de impressão, A4) ---------- */
function gxPdf(tit,corpo){ const w=window.open('','_blank'); if(!w){ toast('O navegador bloqueou a janela do PDF. Permita janelas deste site.'); return; }
  const css=document.getElementById('gx-css'), logo=(document.querySelector('.brand img')||{}).src||'';
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(tit)}</title><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&display=swap" rel="stylesheet">
   <style>:root{--surface:#fff;--surface-2:#F4F7F9;--line:#E3E8EC;--muted:#55666F;--ok:#3C8A63;--warn:#AD8432;--crit:#B5473F;--teal-strong:#143F54;--ink-2:#2D4552}
   @page{size:A4;margin:10mm}body{font-family:Archivo,'Segoe UI',Arial,sans-serif;color:#143F54;margin:0;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
   .card{border:1px solid #E3E8EC;border-radius:10px;padding:10px 12px;break-inside:avoid;background:#fff}.empty{color:#55666F}button,.gx-ac{display:none!important}
   .pdh{display:flex;align-items:center;gap:14px;border-bottom:3px solid #E3312D;padding-bottom:8px;margin-bottom:10px}.pdh img{height:30px}.pdh h1{margin:0;font-size:20px}.pdh small{color:#55666F}
   ${css?css.textContent.replace(/@media[^{]*\{[\s\S]*$/,''):''}
   .gx-ks{grid-template-columns:repeat(4,1fr)!important}.gx-g2{grid-template-columns:1fr 1fr!important}.gx-k b{font-size:20px}</style></head><body>
   <div class="pdh">${logo?`<img src="${logo}" alt="Colafix">`:''}<div><h1>${esc(tit)}</h1><small>Colafix · gerado em ${new Date().toLocaleString('pt-BR')}${gxEu()?' · Responsável '+esc(gxEu()):''}</small></div></div>
   ${corpo}<script>setTimeout(()=>print(),700)<\/script></body></html>`); w.document.close(); }

/* ================= PLANO DE AÇÃO ================= */
function gxAcSt(a){ const h=hojeStr(); if(a.st==='ok') return '<span class="gx-st ok">Concluída</span>'; if(a.prazo&&a.prazo<h) return '<span class="gx-st atr">Atrasada</span>'; if(a.st==='and') return '<span class="gx-st and">Em andamento</span>'; return '<span class="gx-st pen">Pendente</span>'; }
const GX_ORIG=['Parada','Chamado','Segurança','Reunião','Qualidade','Outro'];
function gxAcForm(a){ a=a||{}; const ed=!!a._id; return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="gx-af-t"><div class="card gx-mc"><h2 id="gx-af-t">${ed?'Editar ação':'Nova ação'}</h2>
   <label class="gx-f">O que fazer<input id="gx-af-o" maxlength="160" value="${esc(a.t||'')}" placeholder="Ex.: trocar o sensor da ensacadeira da Linha 2"></label>
   <div class="gx-f3"><label class="gx-f">Quem<input id="gx-af-q" maxlength="60" value="${esc(a.quem||'')}" placeholder="Manutenção, Produção, nome…" list="gx-af-ql"></label><datalist id="gx-af-ql">${['Manutenção','Produção','PCP','Almoxarifado','Qualidade','Segurança','Suprimentos','RH'].map(x=>`<option value="${x}">`).join('')}</datalist>
    <label class="gx-f">Prazo<input id="gx-af-p" type="date" value="${esc(a.prazo||addDias(hojeStr(),2))}"></label>
    <label class="gx-f">Situação<select id="gx-af-s">${[['pen','Pendente'],['and','Em andamento'],['ok','Concluída']].map(([k,t])=>`<option value="${k}" ${(a.st||'pen')===k?'selected':''}>${t}</option>`).join('')}</select></label>
    <label class="gx-f">Origem<select id="gx-af-g">${GX_ORIG.map(x=>`<option ${a.origem===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
   <label class="gx-f">Comentário<textarea id="gx-af-c" rows="2" maxlength="500">${esc(a.obs||'')}</textarea></label>
   <div class="gx-ac2">${ed?`<button class="btn sec gx-del" data-act="gx-ac-del" data-id="${esc(a._id)}">Tirar esta ação</button>`:''}<span style="flex:1"></span><button class="btn sec" data-act="gx-ac-x">Cancelar</button><button class="btn" data-act="gx-ac-salvar" data-id="${esc(a._id||'')}">Salvar</button></div></div></div>`; }
function vGxAcoes(){ gxAssina(); const f=S.gx.acf, h=hojeStr(), xs=S.gxAcoes.filter(a=>f==='todas'?true:f==='ok'?a.st==='ok':f==='atr'?a.st!=='ok'&&a.prazo&&a.prazo<h:a.st!=='ok')
   .sort((a,b)=>(a.st==='ok')-(b.st==='ok')||String(a.prazo||'9').localeCompare(String(b.prazo||'9')));
  const n=k=>S.gxAcoes.filter(a=>k==='ok'?a.st==='ok':k==='atr'?a.st!=='ok'&&a.prazo&&a.prazo<h:k==='todas'?true:a.st!=='ok').length;
  const ed=S.gx.acEd?S.gxAcoes.find(a=>a._id===S.gx.acEd):null;
  return `${banner()}${gxCab('GESTÃO','Plano de ação',`<button class="btn" data-act="gx-ac-nova">${ic('mais',18,2)}Nova ação</button>`)}
   <div class="gx-chips" role="group" aria-label="Mostrar">${[['abertas','Abertas'],['atr','Atrasadas'],['ok','Concluídas'],['todas','Todas']].map(([k,t])=>`<button class="gx-chip" data-act="gx-acf" data-v="${k}" aria-pressed="${f===k}">${t} (${n(k)})</button>`).join('')}</div>
   <section class="card">${xs.length?`<div class="gx-tb"><table><thead><tr><th>O que fazer</th><th>Quem</th><th>Prazo</th><th>Origem</th><th>Situação</th><th></th></tr></thead><tbody>
    ${xs.map(a=>`<tr><td><b>${esc(a.t)}</b>${a.obs?`<br><small class="gx-mut">${esc(a.obs)}</small>`:''}</td><td>${esc(a.quem||'')}</td><td>${a.prazo?dm(a.prazo):'—'}</td><td>${esc(a.origem||'')}</td><td>
      <select class="gx-ss" data-gxac-st="${esc(a._id)}" aria-label="Situação de ${esc(a.t)}">${[['pen','Pendente'],['and','Em andamento'],['ok','Concluída']].map(([k,t])=>`<option value="${k}" ${(a.st||'pen')===k?'selected':''}>${t}</option>`).join('')}</select>${a.st!=='ok'&&a.prazo&&a.prazo<h?' <span class="gx-st atr">Atrasada</span>':''}</td>
      <td><button class="btn sec gx-bs" data-act="gx-ac-ed" data-id="${esc(a._id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma ação aqui.</div>'}</section>
   <p class="gx-p">Ação não concluída continua aparecendo nos dias seguintes. Prazo vencido vira “Atrasada” e aparece no Início.</p>
   ${S.gx.acNova?gxAcForm(ed||{}):''}`; }

/* ================= SEGURANÇA ================= */
function vGxSeg(){ gxAssina(); const d=S.gx.segDia||hojeStr(), s=S.gxSeg[d]||{}, cp=d.slice(0,7), xs=Object.values(S.gxSeg).filter(x=>x.data&&x.data.slice(0,7)===cp).sort((a,b)=>b.data.localeCompare(a.data));
  const ult=Object.values(S.gxSeg).filter(x=>+x.ocorr>0).map(x=>x.data).sort().pop(), dias=ult?Math.floor((new Date(hojeStr()+'T12:00:00')-new Date(ult+'T12:00:00'))/864e5):null;
  const fld=(id,t,v,suf)=>`<label class="gx-f">${t}<input id="${id}" inputmode="numeric" value="${esc(v==null?'':String(v))}" ${suf?`aria-describedby="${id}-s"`:''}>${suf?`<small id="${id}-s">${suf}</small>`:''}</label>`;
  return `${banner()}${gxCab('GESTÃO','Pessoas e segurança')}
   <section class="gx-ks">${gxK('Dias sem acidente',dias!=null?String(dias):'—',ult?'última ocorrência '+dm(ult):'nenhuma ocorrência registrada',dias!=null&&dias<30?'warn':'ok')}${gxK('Ocorrências no mês',String(xs.reduce((a,x)=>a+(+x.ocorr||0),0)),gxMesTxt(cp))}${gxK('Desvios no mês',String(xs.reduce((a,x)=>a+(+x.desvios||0),0)))}${gxK('Dias preenchidos',String(xs.length),'neste mês')}</section>
   <section class="card"><div class="gx-ch"><h2>Segurança do dia</h2><label class="gx-sel"><span class="gx-sr">Dia</span><input type="date" id="gx-seg-d" value="${d}" max="${hojeStr()}"></label></div>
    <div class="gx-f5">${fld('gx-s-oc','Ocorrências',s.ocorr!=null?s.ocorr:0)}${fld('gx-s-pe','Pessoas presentes',s.pessoas)}${fld('gx-s-ep','Uso de EPI (%)',s.epi!=null?s.epi:100)}${fld('gx-s-de','Desvios',s.desvios!=null?s.desvios:0)}${fld('gx-s-in','Inspeções feitas (%)',s.insp!=null?s.insp:100)}</div>
    <label class="gx-f">Observação (o que aconteceu, desvio encontrado…)<textarea id="gx-s-ob" rows="2" maxlength="600">${esc(s.obs||'')}</textarea></label>
    <div class="gx-ac2"><span class="gx-mut">${s.em?'Salvo por '+esc(s.porNome||'')+' em '+new Date(s.em).toLocaleString('pt-BR'):'Ainda não preenchido.'}</span><span style="flex:1"></span><button class="btn" data-act="gx-seg-salvar">Salvar</button></div></section>
   <section class="card"><div class="gx-ch"><h2>${gxMesTxt(cp).replace(/^./,c=>c.toUpperCase())}</h2></div>${xs.length?`<div class="gx-tb"><table><thead><tr><th>Dia</th><th class="n">Ocorrências</th><th class="n">Pessoas</th><th class="n">EPI</th><th class="n">Desvios</th><th class="n">Inspeções</th><th>Observação</th></tr></thead><tbody>
    ${xs.map(x=>`<tr><td><button class="lnk" data-act="gx-seg-d" data-d="${x.data}">${dm(x.data)}</button></td><td class="n ${+x.ocorr?'crit':''}">${x.ocorr||0}</td><td class="n">${x.pessoas||'—'}</td><td class="n">${x.epi!==''&&x.epi!=null?x.epi+'%':'—'}</td><td class="n">${x.desvios||0}</td><td class="n">${x.insp!==''&&x.insp!=null?x.insp+'%':'—'}</td><td>${esc(String(x.obs||'').slice(0,80))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum dia preenchido neste mês.</div>'}</section>`; }

/* ================= CALENDÁRIO DE PREVENTIVAS ================= */
function gxPrevMes(cp){ const P=((S.mx&&S.mx.cfg&&S.mx.cfg.prev)||[]).filter(p=>p.ativo!==false), h=hojeStr(), ini=cp+'-01', ult=new Date(+cp.slice(0,4),+cp.slice(5,7),0).getDate(), fim=cp+'-'+pad(ult), out={};
  const add=(d,x)=>{ (out[d]=out[d]||[]).push(x); };
  /* feitas: OS de preventiva concluídas no mês */
  (S.chamados||[]).filter(c=>c.prevId&&!manIgnorar(c)&&c.status==='Concluída'&&gxDiaLocal(c.concluidoEm).slice(0,7)===cp).forEach(c=>{ const p=P.find(x=>x.id===c.prevId); add(gxDiaLocal(c.concluidoEm),{st:'ok',t:(p&&p.tarefa)||String(c.defeito||'').replace(/^PREVENTIVA:\s*/i,''),p,os:c}); });
  P.forEach(p=>{ const os=typeof mxOsPrev==='function'?mxOsPrev(p):null, fr=Math.max(1,+p.freq||30); if(!p.prox) return;
    let d=p.prox; if(os&&p.osDe) add(p.osDe>=ini&&p.osDe<=fim?p.osDe:(p.osDe<ini?ini:fim),{st:os.exec&&os.exec.tecnico?'and':(p.osDe<h?'atr':'pen'),t:p.tarefa,p,os});
    for(let i=0;i<60&&d<=fim;i++){ if(d>=ini&&!(os&&p.osDe===d)) add(d,{st:d<h?'atr':'pen',t:p.tarefa,p}); d=addDias(d,fr); } });
  return out; }
function vGxCal(){ gxAssina(); const cp=S.gx.cal||hojeStr().slice(0,7), h=hojeStr(), M=gxPrevMes(cp), y=+cp.slice(0,4), m=+cp.slice(5,7), ult=new Date(y,m,0).getDate(), w0=(new Date(y,m-1,1).getDay()+6)%7;
  const all=[].concat(...Object.values(M)), n=k=>all.filter(x=>x.st===k).length, temEq=typeof mxEquips==='function'&&mxEquips().length;
  const cel=[]; for(let i=0;i<w0;i++) cel.push('<div class="gx-cd vz"></div>');
  for(let i=1;i<=ult;i++){ const d=cp+'-'+pad(i), it=M[d]||[]; cel.push(`<div class="gx-cd${d===h?' hoje':''}${S.gx.calDia===d?' sel':''}"><div class="gx-cdh"><b>${i}</b>${d>=h&&temEq?`<button class="gx-add" data-act="gx-cal-add" data-d="${d}" aria-label="Agendar preventiva no dia ${i}" title="Agendar neste dia">+</button>`:''}</div>${it.slice(0,4).map(x=>`<span class="gx-ce ${x.st}" title="${esc(x.t)}">${esc(x.t)}</span>`).join('')}${it.length>4?`<small>+${it.length-4}</small>`:''}</div>`); }
  const X=S.mx||{}, F=X.pv||{};
  const form=S.gx.calDia&&temEq?`<section class="card gx-calf"><div class="gx-ch"><h2>Agendar preventiva · ${dm(S.gx.calDia)}</h2><button class="btn sec" data-act="gx-cal-x">Fechar</button></div>
     <div class="gx-f3"><label class="gx-f">Máquina<select id="gx-pv-e"><option value="">Escolha…</option>${manLinhas().map(l=>{ const es=mxEquips().filter(e=>e.linha===l); return es.length?`<optgroup label="${esc(l)}">${es.map(e=>`<option value="${esc(e.id)}">${esc(e.nome)}</option>`).join('')}</optgroup>`:''; }).join('')}</select></label>
      <label class="gx-f">Serviço<input id="gx-pv-t" maxlength="120" placeholder="Ex.: lubrificar rolamentos"></label>
      <label class="gx-f">Quem faz<input id="gx-pv-r" maxlength="60" placeholder="Equipe mecânica, elétrica, nome…" list="gx-pv-rl"></label><datalist id="gx-pv-rl">${['Equipe mecânica','Equipe elétrica','Terceirizado'].map(x=>`<option value="${x}">`).join('')}</datalist>
      <label class="gx-f">Repetir<select id="gx-pv-f">${[['7','Toda semana'],['15','A cada 15 dias'],['30','Todo mês'],['90','A cada 3 meses'],['180','A cada 6 meses'],['365','Todo ano']].map(([k,t])=>`<option value="${k}" ${k==='30'?'selected':''}>${t}</option>`).join('')}</select></label></div>
     <div class="gx-ac2"><span class="gx-mut">No dia, a OS abre sozinha na fila da manutenção. Ao concluir, a próxima data é marcada.</span><span style="flex:1"></span><button class="btn" data-act="gx-cal-salvar">Agendar</button></div></section>`:'';
  const ant=(()=>{ const d=new Date(y,m-2,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); })(), prx=(()=>{ const d=new Date(y,m,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); })();
  return `${banner()}${gxCab('MANUTENÇÃO','Calendário de preventivas',`<button class="btn sec" data-go="manprev">Lista de preventivas</button>${temEq?`<button class="btn" data-act="gx-cal-add" data-d="${h}">${ic('mais',18,2)}Agendar preventiva</button>`:''}`)}
   ${temEq?'':`<section class="card"><div class="empty">Cadastre as máquinas primeiro para agendar preventivas. <button class="lnk" data-go="manequip">Ir para Máquinas</button></div></section>`}
   ${form}
   <section class="card"><div class="gx-ch"><div class="gx-mn"><button class="btn sec gx-bs" data-act="gx-cal-mv" data-v="${ant}" aria-label="Mês anterior">‹</button><h2>${gxMesTxt(cp).replace(/^./,c=>c.toUpperCase())}</h2><button class="btn sec gx-bs" data-act="gx-cal-mv" data-v="${prx}" aria-label="Próximo mês">›</button></div>
     <span class="gx-mut">${n('ok')} feita(s) · ${n('and')} fazendo · ${n('pen')} a fazer · ${n('atr')} atrasada(s)</span></div>
    <div class="gx-cal"><div class="gx-cw">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>`<span>${x}</span>`).join('')}</div><div class="gx-cg">${cel.join('')}</div></div>
    <div class="gx-leg"><span><i class="ok"></i>Feita</span><span><i class="and"></i>Fazendo</span><span><i class="pen"></i>A fazer</span><span><i class="atr"></i>Atrasada</span></div></section>`; }

/* ================= TURNOS ================= */
function vGxTurnos(){ const ts=gxTurnos(), sel=ts.find(t=>t.id===S.gx.turno)||null, L=linhasOrd(), h=hojeStr(), pode=!(typeof soVer==='function'&&soVer());
  const diasTxt=d=>{ const o=(d||[]).slice().sort(); return !o.length?'nenhum dia':o.join()==='1,2,3,4,5'?'seg a sex':o.map(i=>GX_DIAS[i].toLowerCase()).join(', '); };
  const hm2=m=>Math.floor(m/60)+' h'+(m%60?' '+pad(m%60):'');
  const E=S.gx.tEd;
  return `${banner()}${gxCab('CADASTROS','Turnos',pode?`<button class="btn" data-act="gx-t-novo">${ic('mais',18,2)}Novo turno</button>`:'')}
   <p class="gx-p">O turno de cada linha define quanto tempo ela tem no dia. É dele que sai a disponibilidade (tempo rodando ÷ tempo do turno). Turno sem linhas marcadas vale para todas.</p>
   <div class="gx-g2">
    <section class="card"><h2>Turnos cadastrados</h2><div class="gx-lista">${ts.map(t=>`<button class="gx-tu" data-act="gx-t-sel" data-id="${esc(t.id)}" aria-pressed="${sel&&sel.id===t.id}"><span><b>${esc(t.nome||'Sem nome')}</b><small>${esc(t.ini)} às ${esc(t.fim)}${+t.intv?' · intervalo '+t.intv+' min':''} · ${diasTxt(t.dias)}</small><small>${(t.linhas||[]).length?esc(t.linhas.join(' · ')):'Todas as linhas'}</small></span><b class="gx-tm">${hm2(gxTurnoMin(t))}</b></button>`).join('')}</div>
     ${!Array.isArray(S.cfg.turnos)||!S.cfg.turnos.length?'<p class="gx-p">Este é o turno padrão (ainda não salvo). Edite e salve para valer.</p>':''}
     <h2 style="margin-top:14px">Tempo de cada linha hoje</h2>${L.map(l=>{ const tt=gxTurnoDe(l,h); return `<div class="gx-r"><span><b>${esc(l)}</b><br><small class="gx-mut">${tt.length?tt.map(t=>esc(t.nome)+' · '+t.ini+' às '+t.fim).join(' + '):'Sem turno hoje'}</small></span><b>${tt.length?gxTurnoMinDia(l,h)+' min':'—'}</b></div>`; }).join('')}</section>
    <section class="card">${E?`<h2>${E.id&&ts.some(t=>t.id===E.id&&Array.isArray(S.cfg.turnos)&&S.cfg.turnos.length)?'Editar turno':'Novo turno'}</h2>
      <label class="gx-f">Nome do turno<input id="gx-t-n" maxlength="40" value="${esc(E.nome||'')}"></label>
      <div class="gx-f3"><label class="gx-f">Começa<input id="gx-t-i" type="time" value="${esc(E.ini||'07:30')}"></label><label class="gx-f">Termina<input id="gx-t-f" type="time" value="${esc(E.fim||'18:00')}"></label><label class="gx-f">Intervalo (min)<input id="gx-t-v" type="number" min="0" step="5" value="${esc(String(E.intv||0))}"></label></div>
      <div class="gx-f"><span id="gx-t-dl">Dias da semana</span><div class="gx-chips" role="group" aria-labelledby="gx-t-dl">${[1,2,3,4,5,6,0].map(i=>`<button class="gx-chip" data-act="gx-t-dia" data-v="${i}" aria-pressed="${(E.dias||[]).includes(i)}">${GX_DIAS[i]}</button>`).join('')}</div></div>
      <div class="gx-f"><span id="gx-t-ll">Linhas que trabalham neste turno (nenhuma marcada = todas)</span><div class="gx-chips" role="group" aria-labelledby="gx-t-ll">${L.map(l=>`<button class="gx-chip" data-act="gx-t-lin" data-v="${esc(l)}" aria-pressed="${(E.linhas||[]).includes(l)}">${esc(l)}</button>`).join('')}</div></div>
      <div class="gx-tot2"><span>Tempo disponível por dia<br><small>fim − início − intervalo</small></span><b>${hm2(gxTurnoMin(E))}</b></div>
      <div class="gx-ac2">${E.id&&ts.length>1?`<button class="btn sec gx-del" data-act="gx-t-del">Excluir turno</button>`:''}<span style="flex:1"></span><button class="btn sec" data-act="gx-t-x">Cancelar</button><button class="btn" data-act="gx-t-salvar">Salvar</button></div>`
    :sel?`<h2>${esc(sel.nome)}</h2><p class="gx-p">${esc(sel.ini)} às ${esc(sel.fim)} · ${diasTxt(sel.dias)} · ${hm2(gxTurnoMin(sel))} por dia</p>${pode?`<button class="btn" data-act="gx-t-ed">Editar</button>`:''}`:'<h2>Nenhum turno escolhido</h2><p class="gx-p">Escolha um turno na lista ou crie um novo.</p>'}</section>
   </div>`; }
function gxTLer(){ const E=S.gx.tEd; if(!E) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  const n=v('gx-t-n'), i=v('gx-t-i'), f=v('gx-t-f'), iv=v('gx-t-v'); if(n!=null) E.nome=n.trim(); if(i) E.ini=i; if(f) E.fim=f; if(iv!=null) E.intv=Math.max(0,Math.round(+iv||0)); }
async function gxTSalvar(lista){ try{ await S.db.doc('config/geral').update({turnos:lista}); S.cfg.turnos=lista; toast('Turnos salvos.'); return true; }catch(e){ console.warn('[gestor] turnos',e); toast('Não foi possível salvar os turnos.'); return false; } }

/* ================= registro do módulo ================= */
Object.assign(VIEWS,{gxinicio:{nome:'Início',ic:'grid',mob:'Início'},gxprod:{nome:'Produção',ic:'grafico',mob:'Produção'},gxdia:{nome:'Relatórios',ic:'folha',mob:'Relatórios'},gxmes:{nome:'Relatório do mês',ic:'folha',mob:'Mês'},
  gxacoes:{nome:'Plano de ação',ic:'lista',mob:'Ações'},gxseg:{nome:'Pessoas e segurança',ic:'equipe',mob:'Segurança'},gxcal:{nome:'Calendário de preventivas',ic:'cal2',mob:'Preventivas'},gxturnos:{nome:'Turnos',ic:'relogio',mob:'Turnos'}});
if(VIEWS.gestao){ VIEWS.gestao.nome='TVs'; VIEWS.gestao.mob='TVs'; }
Object.assign(CRUMB,{gxinicio:'Início do gestor',gxprod:'Produção · visão do gestor',gxdia:'Relatório do dia',gxmes:'Relatório do mês',gxacoes:'Plano de ação',gxseg:'Pessoas e segurança',gxcal:'Calendário de preventivas',gxturnos:'Turnos',gestao:'TVs'});
S.extViews=S.extViews||{}; Object.assign(S.extViews,{gxinicio:vGxInicio,gxprod:vGxProd,gxdia:vGxDia,gxmes:vGxMes,gxacoes:vGxAcoes,gxseg:vGxSeg,gxcal:vGxCal,gxturnos:vGxTurnos});
{ const M=MODS.find(m=>m.id==='gestor'); if(M){ M.views=GX_VIEWS.slice(); } }
if(typeof TELA_SEM_MENU!=='undefined') TELA_SEM_MENU.gxmes=1;
/* gestor começa pelo Início novo */
{ const _pv=primeiraView; primeiraView=function(){ try{ if(S.acs&&!S.acs.dono&&viewOk('gxinicio')) return 'gxinicio'; }catch(e){} return _pv(); }; }

/* ================= ações ================= */
function gxV(id){ const e=document.getElementById(id); return e?String(e.value||'').trim():''; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gx-"]'); if(!b) return; const a=b.dataset.act, G=S.gx;
  if(a==='gx-rl'){ G.rl=b.dataset.v; render(); return; }
  if(a==='gx-dia'){ G.dia=b.dataset.d; render(); return; }
  if(a==='gx-dia-mv'){ const d=addDias(G.dia||hojeStr(),+b.dataset.v); if(d<=hojeStr()){ G.dia=d; render(); } return; }
  if(a==='gx-pdf-dia'){ const d=G.dia||hojeStr(); gxPdf('Relatório do dia · '+gxDiaTxt(d),gxDiaHtml(gxDados(d),true)); return; }
  if(a==='gx-pdf-mes'){ const M=gxMesDados(G.cp||hojeStr().slice(0,7)); if(M) gxPdf('Relatório do mês · '+gxMesTxt(M.cp),gxMesHtml(M)); return; }
  if(a==='gx-novaos'){ try{ manNovo(''); }catch(e){} go('manch'); return; }
  if(a==='gx-seg-ir'){ G.segDia=b.dataset.d||hojeStr(); go('gxseg'); return; }
  if(a==='gx-seg-d'){ G.segDia=b.dataset.d; render(); return; }
  if(a==='gx-seg-salvar'){ const d=G.segDia||hojeStr(), num=id=>{ const v=gxV(id); return v===''?'':Math.max(0,Math.round(+v.replace(',','.')||0)); };
    const doc={data:d,ocorr:num('gx-s-oc'),pessoas:num('gx-s-pe'),epi:num('gx-s-ep'),desvios:num('gx-s-de'),insp:num('gx-s-in'),obs:gxV('gx-s-ob').slice(0,600),em:new Date().toISOString(),por:S.uid||null,porNome:gxEu()};
    if(doc.epi!==''&&doc.epi>100) doc.epi=100; if(doc.insp!==''&&doc.insp>100) doc.insp=100;
    b.disabled=true; try{ await S.db.doc('gxseg/'+d).set(doc); S.gxSeg[d]=doc; toast('Segurança de '+dm(d)+' salva.'); }catch(e){ console.warn('[gestor] seg',e); toast('Não foi possível salvar. Confira a internet.'); } b.disabled=false; render(); return; }
  if(a==='gx-ac-nova'){ G.acNova=true; G.acEd=null; render(); setTimeout(()=>{ const i=document.getElementById('gx-af-o'); i&&i.focus(); },50); return; }
  if(a==='gx-ac-ed'){ G.acNova=true; G.acEd=b.dataset.id; render(); return; }
  if(a==='gx-ac-x'){ G.acNova=false; G.acEd=null; render(); return; }
  if(a==='gx-acf'){ G.acf=b.dataset.v; render(); return; }
  if(a==='gx-ac-salvar'){ const t=gxV('gx-af-o'); if(!t){ toast('Escreva o que precisa ser feito.'); return; }
    const st=gxV('gx-af-s')||'pen', id=b.dataset.id, doc={t:t.slice(0,160),quem:gxV('gx-af-q').slice(0,60),prazo:gxV('gx-af-p'),st,origem:gxV('gx-af-g'),obs:gxV('gx-af-c').slice(0,500)};
    b.disabled=true; try{ if(id){ const old=S.gxAcoes.find(x=>x._id===id)||{}; if(st==='ok'&&old.st!=='ok') doc.feitoEm=new Date().toISOString(); if(st!=='ok') doc.feitoEm=null; await S.db.doc('gxacoes/'+id).update(Object.assign(doc,{alteradoEm:new Date().toISOString()})); }
      else { Object.assign(doc,{em:new Date().toISOString(),por:S.uid||null,porNome:gxEu()}); if(st==='ok') doc.feitoEm=doc.em; const r=await S.db.collection('gxacoes').add(doc); S.gxAcoes.unshift(Object.assign({_id:r&&r.id},doc)); }
      G.acNova=false; G.acEd=null; toast('Ação salva.'); }catch(e){ console.warn('[gestor] acao',e); toast('Não foi possível salvar. Confira a internet.'); b.disabled=false; return; } render(); return; }
  if(a==='gx-ac-del'){ const id=b.dataset.id; if(!gxConfirma('Tirar esta ação do plano?')) return; try{ await S.db.doc('gxacoes/'+id).update({removido:true,removidoEm:new Date().toISOString()}); S.gxAcoes=S.gxAcoes.filter(x=>x._id!==id); G.acNova=false; G.acEd=null; toast('Ação tirada.'); }catch(e){ toast('Não foi possível tirar agora.'); } render(); return; }
  if(a==='gx-cal-mv'){ G.cal=b.dataset.v; G.calDia=null; render(); return; }
  if(a==='gx-cal-add'){ G.calDia=b.dataset.d; render(); setTimeout(()=>{ const i=document.getElementById('gx-pv-e'); i&&i.focus(); },50); return; }
  if(a==='gx-cal-x'){ G.calDia=null; render(); return; }
  if(a==='gx-cal-salvar'){ const e=gxV('gx-pv-e'), t=gxV('gx-pv-t'), f=Math.round(+gxV('gx-pv-f')||30), r=gxV('gx-pv-r'), p=G.calDia; if(!e||!t){ toast('Escolha a máquina e escreva o serviço.'); return; }
    b.disabled=true; try{ await mxGrava(cf=>{ cf.prev=cf.prev||[]; cf.prev.push({id:mxId(),equip:e,tarefa:t.slice(0,120),freq:f,prox:p,resp:r||null,ativo:true,em:new Date().toISOString(),por:S.uid||null}); }); G.calDia=null; toast('Preventiva agendada para '+dm(p)+'.'); }catch(e2){ console.warn('[gestor] prev',e2); toast('Não foi possível agendar agora.'); b.disabled=false; return; } render(); return; }
  if(a==='gx-t-sel'){ G.turno=b.dataset.id; G.tEd=null; render(); return; }
  if(a==='gx-t-novo'){ G.tEd={id:'t'+Date.now().toString(36),nome:'Novo turno',ini:'06:00',fim:'14:00',intv:60,dias:[1,2,3,4,5],linhas:[],novo:true}; render(); return; }
  if(a==='gx-t-ed'){ const t=gxTurnos().find(x=>x.id===G.turno); if(t){ G.tEd=JSON.parse(JSON.stringify(t)); render(); } return; }
  if(a==='gx-t-x'){ G.tEd=null; render(); return; }
  if(a==='gx-t-dia'||a==='gx-t-lin'){ gxTLer(); const E=G.tEd; if(!E) return; const k=a==='gx-t-dia'?'dias':'linhas', v=a==='gx-t-dia'?+b.dataset.v:b.dataset.v; E[k]=E[k]||[]; E[k]=E[k].includes(v)?E[k].filter(x=>x!==v):E[k].concat([v]); render(); return; }
  if(a==='gx-t-salvar'){ gxTLer(); const E=G.tEd; if(!E) return; if(!E.nome){ toast('Dê um nome ao turno.'); return; } if(!gxTurnoMin(E)){ toast('Confira o horário: o turno ficou sem tempo.'); return; } if(!(E.dias||[]).length){ toast('Marque pelo menos um dia da semana.'); return; }
    const base=(Array.isArray(S.cfg.turnos)&&S.cfg.turnos.length?S.cfg.turnos:[GX_TURNO_PADRAO]).map(t=>Object.assign({},t)); const x={id:E.id,nome:E.nome,ini:E.ini,fim:E.fim,intv:+E.intv||0,dias:E.dias.slice().sort(),linhas:(E.linhas||[]).slice()};
    const i=base.findIndex(t=>t.id===x.id); if(i>=0) base[i]=x; else base.push(x); b.disabled=true; if(await gxTSalvar(base)){ G.tEd=null; G.turno=x.id; } render(); return; }
  if(a==='gx-t-del'){ const E=G.tEd; if(!E||!gxConfirma('Excluir o turno "'+E.nome+'"?')) return; const base=gxTurnos().filter(t=>t.id!==E.id); if(!base.length) return; if(await gxTSalvar(base)){ G.tEd=null; G.turno=null; } render(); return; }
});
let _gxConf={k:'',t:0};
function gxConfirma(t){ const n=Date.now(); if(_gxConf.k===t&&n-_gxConf.t<5000){ _gxConf={k:'',t:0}; return true; } _gxConf={k:t,t:n}; toast(t+' Clique de novo para confirmar.'); return false; }
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t) return; const G=S.gx;
  if(t.id==='gx-dia'&&t.value){ G.dia=t.value>hojeStr()?hojeStr():t.value; render(); return; }
  if(t.id==='gx-mes'){ G.cp=t.value; render(); return; }
  if(t.id==='gx-seg-d'&&t.value){ G.segDia=t.value; render(); return; }
  if(t.dataset&&t.dataset.gxacOk){ const id=t.dataset.gxacOk; try{ await S.db.doc('gxacoes/'+id).update({st:'ok',feitoEm:new Date().toISOString()}); const a=S.gxAcoes.find(x=>x._id===id); if(a){ a.st='ok'; a.feitoEm=new Date().toISOString(); } toast('Ação concluída.'); }catch(e){ toast('Não foi possível salvar.'); } render(); return; }
  if(t.dataset&&t.dataset.gxacSt){ const id=t.dataset.gxacSt, st=t.value; try{ await S.db.doc('gxacoes/'+id).update({st,feitoEm:st==='ok'?new Date().toISOString():null}); const a=S.gxAcoes.find(x=>x._id===id); if(a){ a.st=st; } toast('Situação salva.'); }catch(e){ toast('Não foi possível salvar.'); } render(); return; }
});
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.gx.acNova&&document.querySelector('.gx-modal')){ S.gx.acNova=false; S.gx.acEd=null; render(); } });

/* ================= estilo ================= */
document.head.insertAdjacentHTML('beforeend',`<style id="gx-css">
.gx-head{align-items:flex-end;flex-wrap:wrap;gap:12px}.gx-hd{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-left:auto}
.gx-mut{color:var(--muted);font-size:13px}.gx-p{color:var(--muted);font-size:13.5px;margin:8px 0 0;line-height:1.45}.gx-sr{position:absolute;left:-9999px}
.gx-ch{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.gx-ch h2,.gx-g2>.card>h2,.gx-g3>.card>h2{margin:0;font-size:18px}
.gx-auto{font-size:12px;font-weight:600;color:#3F6F93;background:#E6EEF3;border-radius:999px;padding:3px 10px;white-space:nowrap}.gx-mao{font-size:12px;font-weight:600;color:#8A5A12;background:#F6EEDC;border-radius:999px;padding:3px 10px;white-space:nowrap}
.gx-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:14px}.gx-ks4{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:10px 0}.gx-ks4.sm .gx-k b{font-size:24px}
.gx-k{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:0}
.gx-k small{font-size:11.5px;font-weight:700;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}.gx-k b{font-size:28px;font-weight:700;line-height:1.1}.gx-k span{font-size:13px;color:var(--muted)}
.gx-k.ok b{color:var(--ok)}.gx-k.warn b{color:var(--warn)}.gx-k.crit b{color:var(--crit)}
.gx-bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;position:relative;flex:1;min-width:40px}.gx-bar i{display:block;height:100%;border-radius:99px;background:var(--ok)}
.gx-k.warn .gx-bar i,.gx-bar i.warn{background:var(--warn)}.gx-k.crit .gx-bar i,.gx-bar i.crit{background:var(--crit)}.gx-bar i.neu{background:#9FB7C8}
.gx-bar.big{height:14px;margin:10px 0 4px;overflow:visible}.gx-bar.big em{position:absolute;top:-4px;bottom:-4px;width:3px;background:#143F54;border-radius:2px}
.gx-sub2{font-size:13.5px;color:var(--muted)}.gx-mes{display:flex;align-items:baseline;gap:8px}.gx-mes b{font-size:30px}.gx-mes span{color:var(--muted)}
.gx-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px;margin-bottom:14px}.gx-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px}
.gx-w2{grid-column:1/-1}.gx-g2>.card,.gx-g3>.card{min-width:0;margin:0}
.gx-al .gx-ali{display:flex;align-items:center;gap:12px;justify-content:space-between;border-left:6px solid var(--warn);background:var(--surface-2);border-radius:10px;padding:10px 12px;margin-top:8px}
.gx-ali.crit{border-left-color:var(--crit);background:var(--crit-tint,#F6E8E6)}.gx-ali div{display:flex;flex-direction:column;gap:2px;min-width:0}.gx-ali b{font-size:15px}.gx-ali span{font-size:13px;color:var(--muted)}
.gx-ok{color:var(--ok);font-weight:600;padding:8px 0}
.gx-ls{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.gx-l{border-radius:12px;padding:10px 12px;background:var(--surface-2);border-left:6px solid var(--line);display:flex;flex-direction:column;gap:4px;min-width:0}
.gx-l.ok{border-left-color:var(--ok)}.gx-l.crit{border-left-color:var(--crit)}.gx-l.info{border-left-color:#3F6F93}.gx-lh{display:flex;justify-content:space-between;gap:8px;align-items:center}.gx-lt{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gx-l small{color:var(--muted);font-size:12.5px}
.gx-st{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap}.gx-st.ok{background:#E2F0E8;color:#2F6F4F}.gx-st.and{background:#F6EEDC;color:#8A5A12}.gx-st.atr{background:#F6E8E6;color:#9C3B34}.gx-st.pen{background:#EEF2F4;color:#55666F}
.gx-lista{display:flex;flex-direction:column;gap:6px}.gx-li{font:inherit;color:inherit;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--surface)}
button.gx-li{cursor:pointer}button.gx-li:hover{border-color:var(--teal)}.gx-li div{display:flex;flex-direction:column;min-width:0}.gx-li span{font-size:13px;color:var(--muted)}
.gx-chk{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;cursor:pointer}.gx-chk input{width:20px;height:20px;flex:none}.gx-chk>span{flex:1;display:flex;flex-direction:column;min-width:0}.gx-chk small{color:var(--muted)}
.gx-ac{display:flex;justify-content:flex-end;margin-top:8px}.gx-ac2{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
.gx-r{display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:7px 0;border-bottom:1px solid var(--line)}.gx-r:last-child{border-bottom:0}
.gx-p .crit,.gx-r b.crit,.gx-tb .crit,.gx-tb td.n.crit,.gx-sg .crit{color:var(--crit)}
.gx-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.gx-chip{font:inherit;font-size:14px;font-weight:600;border-radius:999px;padding:0 14px;min-height:40px;border:2px solid var(--line);background:var(--surface);color:var(--ink-2,#2D4552);cursor:pointer}.gx-chip[aria-pressed="true"]{background:#143F54;border-color:#143F54;color:#fff}
.gx-sg{margin-bottom:10px}.gx-sg>b{display:block;font-size:13px;letter-spacing:.04em;color:var(--muted);margin-bottom:4px}
.gx-sl{display:grid;grid-template-columns:minmax(90px,1fr) minmax(60px,2fr) auto auto;gap:8px;align-items:center;font-size:14px;padding:4px 0}.gx-sl small{color:var(--muted);font-size:12px;min-width:44px;text-align:right}
.gx-tb{overflow-x:auto}.gx-tb table{width:100%;border-collapse:collapse;font-size:14px}.gx-tb th{font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--muted);text-transform:uppercase;text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}
.gx-tb td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.gx-tb .n{text-align:right;font-variant-numeric:tabular-nums}.gx-tot td{font-weight:700;border-bottom:0}tr.gx-mut td{color:var(--muted)}
.gx-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin:6px 0}.gx-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:5px;background:#9FB7C8}
.gx-leg i.ok{background:var(--ok)}.gx-leg i.warn,.gx-leg i.and{background:var(--warn)}.gx-leg i.crit,.gx-leg i.atr{background:var(--crit)}.gx-leg i.pen{background:#9FB7C8}
.gx-barras{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:14px;align-items:end;margin:8px 0 12px}.gx-bc{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font-size:13px;min-width:0}
.gx-bp{display:flex;gap:6px;align-items:flex-end;height:180px;border-bottom:1px solid var(--line);width:100%;justify-content:center}.gx-bp>div{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;gap:3px;font-size:12px}
.gx-bp i{display:block;width:28px;border-radius:5px 5px 0 0;min-height:2px}.gx-bc>span.ok{color:var(--ok);font-weight:700}.gx-bc>span.warn{color:var(--warn);font-weight:700}.gx-bc>span.crit{color:var(--crit);font-weight:700}
.gx-pz{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.gx-pie{width:160px;height:160px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}.gx-pie>div{width:98px;height:98px;border-radius:50%;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center}.gx-pie b{font-size:22px}.gx-pie small{font-size:12px;color:var(--muted)}
.gx-pl{display:flex;flex-direction:column;gap:8px;flex:1;min-width:150px;font-size:14px}.gx-pl div{display:flex;gap:8px;align-items:center}.gx-pl i{width:12px;height:12px;border-radius:3px;flex:none}.gx-pl span{flex:1}.gx-pl small{color:var(--muted);width:40px;text-align:right}
.gx-segg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gx-segg div{background:var(--surface-2);border-radius:10px;padding:10px}.gx-segg small{font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase}.gx-segg b{display:block;font-size:24px}.gx-segg .ok b{color:var(--ok)}.gx-segg .crit b{color:var(--crit)}.gx-segg .warn b{color:var(--warn)}
.gx-rt{display:flex;gap:4px;border-bottom:2px solid var(--line);margin-bottom:14px}.gx-rt button{font:inherit;font-size:15px;font-weight:600;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-2px;padding:8px 14px;color:var(--muted);cursor:pointer}.gx-rt button.on{color:#143F54;border-bottom-color:#E3312D}
.gx-dn{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}.gx-dn label{display:flex;flex-direction:column;font-size:12px;font-weight:700;color:var(--muted)}.gx-dn input,.gx-sel select,.gx-sel input{font:inherit;font-size:16px;font-weight:600;border:2px solid var(--line);border-radius:10px;padding:6px 10px;background:var(--surface);color:inherit}
.gx-dn .gx-mut{margin-left:8px;line-height:1.6}
.gx-hist{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}.gx-hd1{font:inherit;color:inherit;flex:none;width:56px;display:flex;flex-direction:column;align-items:center;gap:3px;border:2px solid var(--line);border-radius:10px;padding:6px 4px;background:var(--surface);cursor:pointer}
.gx-hd1[aria-pressed="true"]{border-color:#143F54;background:#E6EEF3}.gx-hb{width:18px;height:46px;background:var(--line);border-radius:5px;display:flex;align-items:flex-end;overflow:hidden}.gx-hb i{display:block;width:100%;background:#9FB7C8}
.gx-hd1.ok .gx-hb i{background:var(--ok)}.gx-hd1.warn .gx-hb i{background:var(--warn)}.gx-hd1.crit .gx-hb i{background:var(--crit)}.gx-hd1 b{font-size:12.5px}.gx-hd1 small{font-size:11px;color:var(--muted)}
.gx-pd{display:flex;gap:4px;align-items:flex-end;height:200px;border-bottom:1px solid var(--line)}.gx-pdc{flex:1;min-width:10px;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%}.gx-pdb{flex:1;width:100%;position:relative;display:flex;align-items:flex-end;justify-content:center}
.gx-pdb i{display:block;width:70%;border-radius:4px 4px 0 0;background:#9FB7C8}.gx-pdb i.ok{background:var(--ok)}.gx-pdb i.warn{background:var(--warn)}.gx-pdb i.crit{background:var(--crit)}.gx-pdb em{position:absolute;left:5%;right:5%;height:2px;background:#143F54}.gx-pdc small{font-size:11px;color:var(--muted)}
.gx-cs{width:100%;height:200px}
.gx-f{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--muted);min-width:0;margin-top:10px}.gx-f input,.gx-f select,.gx-f textarea{font:inherit;font-size:16px;font-weight:500;color:var(--ink,#143F54);border:2px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);min-height:44px;box-sizing:border-box;width:100%}
.gx-f small{font-weight:500}.gx-f3{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0 12px}.gx-f5{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0 12px}
.gx-modal{position:fixed;inset:0;background:rgba(14,30,40,.45);z-index:900;display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;overflow:auto}.gx-mc{width:min(720px,100%);margin:0}.gx-mc h2{margin:0}
.gx-del{color:var(--crit)!important}.gx-ss{font:inherit;font-size:14px;border:2px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface);color:inherit}.gx-bs{height:36px;min-height:36px;padding:0 12px}
.gx-tu{font:inherit;color:inherit;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;border:2px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--surface);cursor:pointer}.gx-tu[aria-pressed="true"]{border-color:#143F54;background:#F4F7F9}
.gx-tu span{display:flex;flex-direction:column;gap:2px;min-width:0}.gx-tu small{font-size:13px;color:var(--muted)}.gx-tm{font-size:20px}.gx-tot2{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#E6EEF3;border-radius:12px;padding:12px 14px;font-size:14px;color:#2D5C7C;margin-top:12px}.gx-tot2 b{font-size:22px;color:#143F54}
.gx-mn{display:flex;align-items:center;gap:8px}.gx-cal{overflow-x:auto}.gx-cw,.gx-cg{display:grid;grid-template-columns:repeat(7,minmax(110px,1fr));gap:4px;min-width:780px}.gx-cw span{font-size:12px;font-weight:700;color:var(--muted);text-align:center;padding:4px}
.gx-cd{min-height:96px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;display:flex;flex-direction:column;gap:3px;background:var(--surface);min-width:0}.gx-cd.vz{background:transparent;border:0}.gx-cd.hoje{border:2px solid #E3312D}.gx-cd.sel{background:#E6EEF3}
.gx-cdh{display:flex;justify-content:space-between;align-items:center}.gx-add{font:inherit;font-weight:700;width:26px;height:26px;border-radius:7px;border:1px solid var(--line);background:var(--surface-2);cursor:pointer;color:#143F54}
.gx-ce{font-size:11.5px;font-weight:600;border-radius:5px;padding:2px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#EEF2F4;color:#55666F;border-left:3px solid #9FB7C8}.gx-ce.ok{background:#E2F0E8;color:#2F6F4F;border-left-color:var(--ok)}.gx-ce.and{background:#F6EEDC;color:#8A5A12;border-left-color:var(--warn)}.gx-ce.atr{background:#F6E8E6;color:#9C3B34;border-left-color:var(--crit)}
.gx-cd small{font-size:11px;color:var(--muted)}.gx-calf{border:2px solid #143F54}
@media (max-width:640px){.gx-g2,.gx-g3{grid-template-columns:minmax(0,1fr)}.gx-k b{font-size:22px}.gx-ks{grid-template-columns:repeat(2,minmax(0,1fr))}.gx-hd{margin-left:0;width:100%}.gx-hd .btn{flex:1}.gx-bp{height:130px}.gx-bp i{width:18px}.gx-dn .gx-mut{margin-left:0}}
</style>`);

/* ================= PARADAS (22/10, "o que faltou") ================= */
const GX_CAUSAS=['Mecânica','Elétrica','Operacional','Falta de material','Qualidade / dosagem','Outra'];
S.gx.parDias=S.gx.parDias||30;
function gxCausaAuto(p){ const m=String(p.motivo||''); return p.causa||(/el[ée]tric/i.test(m)?'Elétrica':/manuten|mec[aâ]nic|quebr/i.test(m)?'Mecânica':/falta/i.test(m)?'Falta de material':/dosag|qualid/i.test(m)?'Qualidade / dosagem':''); }
function vGxPar(){ gxAssina(); const n=S.gx.parDias, h=hojeStr(), ini=addDias(h,-(n-1)), t0=new Date(ini+'T00:00:00').getTime(), agora=Date.now();
  const xs=(S.paradas||[]).filter(p=>p.inicio&&!p.anulada&&!gxSetup(p)&&gxDiaLocal(p.inicio)>=ini).map(p=>{ const a=Math.max(t0,new Date(p.inicio).getTime()), b=p.fim?new Date(p.fim).getTime():agora; return {p,min:Math.max(0,(b-a)/6e4),causa:gxCausaAuto(p)}; }).sort((a,b)=>String(b.p.inicio).localeCompare(String(a.p.inicio)));
  const tot=xs.reduce((a,x)=>a+x.min,0), por=(f)=>{ const o={}; xs.forEach(x=>{ const k=f(x)||'Sem classificar'; o[k]=(o[k]||0)+x.min; }); return Object.entries(o).sort((a,b)=>b[1]-a[1]); };
  const pareto=(t,arr,cor)=>{ const mx=Math.max(1,...arr.map(x=>x[1])); let ac=0; return `<section class="card"><div class="gx-ch"><h2>${t}</h2></div>${arr.length?arr.map(([k,v])=>{ ac+=v; return `<div class="gx-sl"><span>${esc(k)}</span><div class="gx-bar"><i class="${cor}" style="width:${(v/mx*100).toFixed(0)}%"></i></div><b>${gxDur(v)}</b><small>${gxPct(ac,tot)}% acum.</small></div>`; }).join(''):'<div class="gx-ok">Nenhuma parada no período.</div>'}</section>`; };
  /* horas paradas por semana (segunda a domingo) */
  const sem={}; xs.forEach(x=>{ const d=new Date(gxDiaLocal(x.p.inicio)+'T12:00:00'); d.setDate(d.getDate()-((d.getDay()+6)%7)); const k=hojeStr(d); sem[k]=(sem[k]||0)+x.min; });
  const sk=Object.keys(sem).sort(), mxs=Math.max(1,...Object.values(sem));
  const hoje=xs.filter(x=>gxDiaLocal(x.p.inicio)===h);
  return `${banner()}${gxCab('PRODUÇÃO · PARADAS','Paradas',`<div class="gx-chips" role="group" aria-label="Período" style="margin:0">${[[7,'7 dias'],[30,'30 dias'],[60,'60 dias']].map(([k,t])=>`<button class="gx-chip" data-act="gx-par-n" data-v="${k}" aria-pressed="${n===k}">${t}</button>`).join('')}</div>`)}
   <section class="gx-ks">${gxK('Tempo parado',gxDur(tot),'últimos '+n+' dias · sem setup',tot?'crit':'')}${gxK('Paradas',String(xs.length),gxN(xs.length/Math.max(1,n),1)+' por dia')}${gxK('Abertas agora',String(xs.filter(x=>!x.p.fim).length),'',xs.some(x=>!x.p.fim)?'crit':'ok')}${gxK('Hoje',gxDur(hoje.reduce((a,x)=>a+x.min,0)),hoje.length+' parada(s)')}${gxK('Sem classificar',String(xs.filter(x=>!x.causa).length),'escolha a causa na lista',xs.some(x=>!x.causa)?'warn':'ok')}</section>
   <div class="gx-g3">${pareto('Por causa',por(x=>x.causa),'crit')}${pareto('Por motivo',por(x=>x.p.motivo),'warn')}${pareto('Por linha',por(x=>x.p.linha),'neu')}</div>
   <section class="card"><div class="gx-ch"><h2>Horas paradas por semana</h2><span class="gx-mut">semana começando na segunda</span></div>
    ${sk.length?`<div class="gx-pd" style="height:160px">${sk.map(k=>`<div class="gx-pdc" title="Semana de ${dm(k)}: ${gxDur(sem[k])}"><div class="gx-pdb"><i class="crit" style="height:${(sem[k]/mxs*100).toFixed(0)}%"></i></div><small>${dm(k)}</small></div>`).join('')}</div>`:'<div class="gx-ok">Nenhuma parada no período.</div>'}</section>
   <section class="card"><div class="gx-ch"><h2>Todas as paradas</h2><span class="gx-mut">classifique a causa · "Virar ação" leva para o plano de ação</span></div>
    ${xs.length?`<div class="gx-tb"><table><thead><tr><th>Dia</th><th>Início</th><th>Fim</th><th>Linha</th><th>Motivo</th><th class="n">Tempo</th><th>Quem apontou</th><th>Causa</th><th></th></tr></thead><tbody>
     ${xs.slice(0,200).map(x=>`<tr><td>${dm(gxDiaLocal(x.p.inicio))}</td><td>${hora(x.p.inicio)}</td><td>${x.p.fim?hora(x.p.fim):'<b class="crit">aberta</b>'}</td><td>${esc(x.p.linha||'')}</td><td>${esc(x.p.motivo||'')}${x.p.obs?`<br><small class="gx-mut">${esc(String(x.p.obs).slice(0,70))}</small>`:''}</td><td class="n">${gxDur(x.min)}</td><td>${esc(x.p.porNome||nomeDe(x.p.por)||'')}</td>
      <td><select class="gx-ss" data-gxpar-c="${esc(x.p._id)}" aria-label="Causa da parada de ${hora(x.p.inicio)} na ${esc(x.p.linha||'')}"><option value="">—</option>${GX_CAUSAS.map(c=>`<option ${x.causa===c?'selected':''}>${c}</option>`).join('')}</select>${x.causa&&!x.p.causa?'<br><small class="gx-mut">sugerida</small>':''}</td>
      <td><button class="btn sec gx-bs" data-act="gx-par-acao" data-id="${esc(x.p._id)}">Virar ação</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="gx-ok">Nenhuma parada no período.</div>'}</section>
   ${S.gx.acNova?gxAcForm(S.gx.acPre||{}):''}`; }

/* ================= CADASTROS ================= */
function gxEquipes(){ const e=S.cfg.manEquipes; return Array.isArray(e)&&e.length?e:['Equipe mecânica','Equipe elétrica','Terceirizado']; }
function vGxCad(){ const pode=!(typeof soVer==='function'&&soVer()), mot=S.cfg.motivos||[], eq=gxEquipes(), L=linhasOrd(), nEq=(typeof mxEquips==='function'?mxEquips().length:0);
  const lista=(id,t,sub,xs,ph)=>`<section class="card"><div class="gx-ch"><h2>${t}</h2><span class="gx-mut">${sub}</span></div>
    <div class="gx-lista">${xs.map((x,i)=>`<div class="gx-li"><span>${esc(x)}</span>${pode?`<button class="btn sec gx-bs gx-del" data-act="gx-cad-x" data-k="${id}" data-i="${i}" aria-label="Tirar ${esc(x)}">Tirar</button>`:''}</div>`).join('')||'<div class="empty">Nada cadastrado.</div>'}</div>
    ${pode?`<div class="gx-ac2"><input class="gx-in" id="gx-cad-${id}" maxlength="50" placeholder="${ph}" aria-label="Novo item em ${t}"><button class="btn" data-act="gx-cad-add" data-k="${id}">Acrescentar</button></div>`:''}</section>`;
  return `${banner()}${gxCab('CADASTROS','Cadastros do gestor')}
   <div class="gx-g2">
    ${lista('motivos','Motivos de parada','aparecem no posto, na tela de paradas e na TV',mot,'Ex.: Falta de embalagem')}
    ${lista('equipes','Equipes de manutenção','usadas em "Quem faz" das preventivas',eq,'Ex.: Equipe de solda')}
    <section class="card"><div class="gx-ch"><h2>Máquinas</h2><span class="gx-mut">${nEq} cadastrada(s)</span></div><p class="gx-p">O cadastro de máquinas fica na Manutenção (linha, nome, código e QR). É dele que saem as preventivas e o histórico de cada máquina.</p><div class="gx-ac"><button class="btn" data-go="manequip">Abrir Máquinas</button></div></section>
    <section class="card"><div class="gx-ch"><h2>Turnos e metas</h2></div><p class="gx-p">O tempo de cada linha vem dos Turnos. A meta de cada linha vem da Curva S (previsão do mês dividida pelos dias úteis), em Análise › Curva S.</p><div class="gx-ac2"><button class="btn sec" data-go="gxturnos">Turnos</button><button class="btn sec" data-go="anlrit">Curva S</button></div></section>
   </div>`; }
async function gxCadGrava(k,arr){ const campo=k==='motivos'?'motivos':'manEquipes'; try{ await S.db.doc('config/geral').update({[campo]:arr}); S.cfg[campo]=arr; toast('Salvo.'); }catch(e){ console.warn('[gestor] cadastro',e); toast('Não foi possível salvar.'); } }

/* ================= ENVIAR POR E-MAIL (o texto do dia, pelo programa de e-mail do computador) ================= */
function gxEmailDia(d){ const D=gxDados(d), T=D.tot, L=[];
  L.push('Relatório do dia · '+gxDiaTxt(d)); L.push('');
  L.push('Produção: '+gxT(T.t)+' t ('+gxN(T.sc)+' sacos)'+(T.mT?' · meta '+gxT(T.mT)+' t · '+gxPct(T.t,T.mT)+'%':''));
  if(T.disp!=null) L.push('Disponibilidade: '+gxN(T.disp*100,1)+'%'); L.push('Paradas: '+gxDur(T.par)+' ('+D.par.filter(z=>!z.setup).length+')');
  L.push(''); L.push('Por linha:'); D.lin.forEach(x=>L.push('- '+x.l+': '+gxT(x.t)+' t'+(x.mT?' de '+gxT(x.mT)+' t ('+gxPct(x.t,x.mT)+'%)':'')+(x.par?' · parada '+gxDur(x.par):'')));
  if(D.par.length){ L.push(''); L.push('Paradas:'); D.par.filter(z=>!z.setup).forEach(z=>L.push('- '+hora(z.p.inicio)+' '+z.p.linha+' · '+(z.p.motivo||'')+' · '+gxDur(z.min)+(z.p.fim?'':' (aberta)'))); }
  L.push(''); L.push('Manutenção: '+D.corr.length+' corretiva(s), '+D.prev.length+' preventiva(s)');
  const s=D.seg; L.push('Segurança: '+(s?(+s.ocorr?s.ocorr+' ocorrência(s)':'sem ocorrências')+(s.pessoas?' · '+s.pessoas+' pessoas':''):'não preenchido'));
  const ac=S.gxAcoes.filter(a=>a.st!=='ok'); if(ac.length){ L.push(''); L.push('Plano de ação (abertas):'); ac.slice(0,10).forEach(a=>L.push('- '+a.t+(a.quem?' · '+a.quem:'')+(a.prazo?' · até '+dm(a.prazo):''))); }
  return L.join('\n'); }

/* ---------- registro das telas novas ---------- */
Object.assign(VIEWS,{gxpar:{nome:'Paradas',ic:'pausa',mob:'Paradas'},gxcad:{nome:'Cadastros',ic:'ajuste',mob:'Cadastros'}});
Object.assign(CRUMB,{gxpar:'Paradas',gxcad:'Cadastros do gestor'}); Object.assign(S.extViews,{gxpar:vGxPar,gxcad:vGxCad});
{ const M=MODS.find(m=>m.id==='gestor'); if(M){ const v=M.views; if(!v.includes('gxpar')) v.splice(v.indexOf('gxprod')+1,0,'gxpar'); if(!v.includes('gxcad')) v.splice(v.indexOf('gestao'),0,'gxcad'); } }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gx-par-"],[data-act^="gx-cad-"],[data-act="gx-email"]'); if(!b) return; const a=b.dataset.act, G=S.gx;
  if(a==='gx-par-n'){ G.parDias=+b.dataset.v; render(); return; }
  if(a==='gx-par-acao'){ const p=(S.paradas||[]).find(x=>x._id===b.dataset.id); if(!p) return; G.acPre={t:'Resolver: '+(p.motivo||'parada')+' na '+(p.linha||''),origem:'Parada',obs:'Parada de '+dm(gxDiaLocal(p.inicio))+' às '+hora(p.inicio)+(p.obs?' · '+p.obs:'')}; G.acNova=true; G.acEd=null; render(); return; }
  if(a==='gx-cad-add'){ const k=b.dataset.k, i=document.getElementById('gx-cad-'+k), v=String(i&&i.value||'').trim(); if(!v) return; const arr=(k==='motivos'?(S.cfg.motivos||[]):gxEquipes()).slice(); if(arr.some(x=>x.toLowerCase()===v.toLowerCase())){ toast('Já existe.'); return; } arr.push(v); await gxCadGrava(k,arr); render(); return; }
  if(a==='gx-cad-x'){ const k=b.dataset.k, i=+b.dataset.i, arr=(k==='motivos'?(S.cfg.motivos||[]):gxEquipes()).slice(), x=arr[i]; if(x==null||!gxConfirma('Tirar "'+x+'"?')) return; arr.splice(i,1); await gxCadGrava(k,arr); render(); return; }
  if(a==='gx-email'){ const d=G.dia||hojeStr(), txt=gxEmailDia(d); const assunto='Relatório do dia · '+dm(d)+'/'+d.slice(0,4);
    try{ await navigator.clipboard.writeText(txt); }catch(e){}
    location.href='mailto:?subject='+encodeURIComponent(assunto)+'&body='+encodeURIComponent(txt.slice(0,1800)); toast('Abrindo o e-mail com o resumo (o texto também foi copiado). Para mandar o PDF, use "Baixar PDF do dia" e anexe.'); return; }
},true);
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset||!t.dataset.gxparC) return; const id=t.dataset.gxparC, v=t.value;
  try{ await S.db.doc('paradas/'+id).update({causa:v||null,causaPor:gxEu()||null}); const p=(S.paradas||[]).find(x=>x._id===id); if(p) p.causa=v||null; toast('Causa salva.'); }catch(e){ toast('Não foi possível salvar a causa.'); } });
/* "Nova ação" vinda da parada já preenchida; ao fechar o formulário, some o pré-preenchimento */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="gx-ac-x"],[data-act="gx-ac-salvar"],[data-act="gx-ac-nova"]'); if(b&&b.dataset.act!=='gx-ac-salvar') S.gx.acPre=null; if(b&&b.dataset.act==='gx-ac-salvar') setTimeout(()=>{ S.gx.acPre=null; },0); },true);
/* "Quem faz" das preventivas usa as equipes cadastradas; botão de e-mail no relatório do dia */
{ const _d=vGxDia; vGxDia=function(){ return _d().replace('<button class="btn" data-act="gx-pdf-dia">','<button class="btn sec" data-act="gx-email">'+ic('copiar',18,2)+'Enviar por e-mail</button><button class="btn" data-act="gx-pdf-dia">'); }; S.extViews.gxdia=vGxDia; }
{ const _c=vGxCal; vGxCal=function(){ return _c().replace(/<datalist id="gx-pv-rl">[\s\S]*?<\/datalist>/,'<datalist id="gx-pv-rl">'+gxEquipes().map(x=>`<option value="${esc(x)}">`).join('')+'</datalist>'); }; S.extViews.gxcal=vGxCal; }
document.head.insertAdjacentHTML('beforeend','<style>.gx-in{font:inherit;font-size:16px;border:2px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);color:inherit;flex:1;min-width:160px;min-height:44px;box-sizing:border-box}</style>');
