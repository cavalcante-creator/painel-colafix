/* ===================== RH · ALMOÇO (controle pelo Face ID) — pedido de 13/10 =====================
   Hoje o RH imprime a lista do almoço, confere quem assinou e, de quem não assinou, olha no Face ID (Control iD) se
   passou no refeitório. Aqui o próprio relatório do Control iD responde: o RH exporta "Acessos Gerais" em CSV e arrasta
   na tela Almoço. Regras (ajustáveis em rh/config.almoco):
     almoçou  = passagem "Autorizado" no dispositivo REFEITÓRIO entre 10:30 e 14:30
     café     = passagem no REFEITÓRIO antes das 09:30 (só informativo)
     presente = qualquer passagem autorizada no dia (portaria, estacionamento, refeitório)
   Dados (regra rh/{resto=**}: só a dona e quem tem o RH):
     rh/dados/almoco/{AAAA-MM}   dias.{AAAA-MM-DD}.{cpf} = {p:1, a:'12:36', c:'07:10'} · pessoas.{cpf} = {n,e,g} · imp[]
                                 (importar de novo substitui só os dias que vieram no arquivo, sem duplicar)
     rh/dados/almocoaj/{AAAA-MM} aj.{AAAA-MM-DD_cpf} = {v:'sim'|'nao', mot, por, em} · log[] (ajustes feitos à mão; nada é apagado)
   Usado pelo rh.js (tela rhalmoco): window.RHAlmoco.iniciar(ctx) e .render(ctx). */
(function(){
  const A={setor:'',sit:'',jus:null,mes:'',dados:{},aj:{},vis:'dia',dia:'',emp:'',q:'',lendo:false,ult:null,sub:{},ctx:null};
  const PADRAO={disp:'REFEITÓRIO',ini:'10:30',fim:'14:30',cafeAte:'09:30'};
  const pad=n=>String(n).padStart(2,'0');
  const hm=s=>{ const m=String(s||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
  const nrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase();
  const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const mesNome=m=>{ const [a,b]=m.split('-'); return MESES[+b-1]+' de '+a; };
  const diasDoMes=m=>{ const [a,b]=m.split('-').map(Number), n=new Date(a,b,0).getDate(); return Array.from({length:n},(_,i)=>m+'-'+pad(i+1)); };
  const semana=d=>['dom','seg','ter','qua','qui','sex','sáb'][new Date(d+'T12:00').getDay()];
  const titulo=s=>String(s||'').toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());
  function cfg(){ const c=(A.ctx&&A.ctx.R.cfg&&A.ctx.R.cfg.almoco)||{}; return Object.assign({},PADRAO,c); }
  function assinar(m){ const c=A.ctx, P=c.P; if(A.sub[m]) return; A.sub[m]=true;
    P.inscrever('rh-almoco-'+m,()=>P.db().collection('rh/dados/almoco').where('mes','==',m).limit(1),snap=>{ const d=snap.docs[0]; A.dados[m]=d?d.data():{mes:m,dias:{},pessoas:{},imp:[]}; P.rerender(); });
    P.inscrever('rh-almocoaj-'+m,()=>P.db().collection('rh/dados/almocoaj').where('mes','==',m).limit(1),snap=>{ const d=snap.docs[0]; A.aj[m]=d?d.data():{mes:m,aj:{},log:[]}; P.rerender(); }); }

  /* ---------- leitura do CSV do Control iD ---------- */
  function lerCsv(txt){ const L=[]; let row=[], cel='', q=false;
    for(let i=0;i<txt.length;i++){ const ch=txt[i];
      if(q){ if(ch==='"'){ if(txt[i+1]==='"'){ cel+='"'; i++; } else q=false; } else cel+=ch; continue; }
      if(ch==='"') q=true; else if(ch===','||ch===';'){ row.push(cel); cel=''; } else if(ch==='\n'){ row.push(cel); L.push(row); row=[]; cel=''; } else if(ch!=='\r') cel+=ch; }
    if(cel||row.length){ row.push(cel); L.push(row); } return L.filter(r=>r.some(x=>x.trim())); }
  function interpretar(txt){ const L=lerCsv(txt); if(!L.length) throw new Error('Arquivo vazio.');
    const cab=L[0].map(nrm), col=re=>cab.findIndex(h=>re.test(h));
    const iH=col(/^HORA$|DATA E HORA/), iN=col(/NOME/), iC=col(/^CPF$/), iE=col(/^EMPRESA$/), iG=col(/^GRUPO/), iAu=col(/AUTORIZA/), iD=col(/DISPOSITIVO/);
    if(iH<0||iC<0||iD<0) throw new Error('Este arquivo não parece o relatório de acessos do Control iD (faltam as colunas Hora, CPF ou Dispositivo).');
    const C=cfg(), dRef=nrm(C.disp), ini=hm(C.ini), fim=hm(C.fim), cafe=hm(C.cafeAte); const out={}, pes={}; let lidos=0, de='', ate='';
    for(const r of L.slice(1)){ const h=String(r[iH]||'').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}:\d{2})(:\d{2})?/); if(!h) continue;
      if(iAu>=0&&!/^AUTORIZADO$/.test(nrm(r[iAu]))) continue; const cpf=String(r[iC]||'').replace(/\D/g,''); if(!cpf) continue;
      const k=cpf.padStart(11,'0'), d=h[3]+'-'+h[2]+'-'+h[1], t=h[4].padStart(5,'0'), m=hm(t); lidos++; if(!de||d<de) de=d; if(!ate||d>ate) ate=d;
      const x=((out[d]=out[d]||{})[k]=out[d][k]||{p:1});
      (x.t=x.t||[]).push(t+(h[5]||'')+' '+String(r[iD]||'').trim().slice(0,30)); /* todas as passagens do dia, para o detalhe da pessoa */
      if(nrm(r[iD])===dRef){ if(m>=ini&&m<=fim){ if(!x.a||t<x.a) x.a=t; } else if(m<cafe){ if(!x.c||t<x.c) x.c=t; } }
      pes[k]={n:titulo(r[iN]||''),e:iE>=0?String(r[iE]||'').trim():'',g:iG>=0?String(r[iG]||'').trim():''}; }
    Object.values(out).forEach(o=>Object.values(o).forEach(x=>{ if(x.t) x.t.sort(); }));
    if(!lidos) throw new Error('Nenhum acesso autorizado no arquivo.'); return {dias:out,pessoas:pes,lidos,de,ate}; }
  async function importar(file){ const c=A.ctx, P=c.P; A.lendo=true; P.rerender();
    try{ const buf=await file.arrayBuffer(); let txt=new TextDecoder('utf-8',{fatal:false}).decode(buf); if(/�/.test(txt)) txt=new TextDecoder('iso-8859-1').decode(buf);
      const I=interpretar(txt); const porMes={}; Object.keys(I.dias).forEach(d=>{ (porMes[d.slice(0,7)]=porMes[d.slice(0,7)]||[]).push(d); });
      let nd=0; for(const m of Object.keys(porMes)){ const ref=P.db().doc('rh/dados/almoco/'+m), g=await ref.get(), cur=g.exists?g.data():{mes:m,dias:{},pessoas:{},imp:[]};
        const dias=Object.assign({},cur.dias||{}); porMes[m].forEach(d=>{ dias[d]=I.dias[d]; nd++; });
        const pessoas=Object.assign({},cur.pessoas||{}); Object.keys(I.pessoas).forEach(k=>{ if(Object.values(I.dias).some(x=>x[k])) pessoas[k]=I.pessoas[k]; });
        const imp=(cur.imp||[]).concat([{em:new Date().toISOString(),por:c.eu(),arq:file.name,de:porMes[m].sort()[0],ate:porMes[m].sort().slice(-1)[0],n:I.lidos}]).slice(-40);
        await ref.set({mes:m,dias,pessoas,imp,alteradoEm:new Date().toISOString()}); }
      A.ult={arq:file.name,dias:nd,de:I.de,ate:I.ate}; const m0=I.ate.slice(0,7); A.mes=m0; A.dia=I.ate; assinar(m0);
      P.toast('Face ID importado: '+nd+' '+(nd===1?'dia':'dias')+' ('+c.br(I.de)+' a '+c.br(I.ate)+').'); }
    catch(e){ console.warn('[almoço]',e); P.toast(e&&e.message?e.message:'Não consegui ler o arquivo.'); }
    finally{ A.lendo=false; P.rerender(); } }

  /* ---------- situação por pessoa e dia ---------- */
  /* v: sim (almoçou) · nao (veio e não almoçou, sem justificativa) · just (justificado) · fora (não almoça na empresa) · aus (não veio) */
  const JUST_PADRAO=['Almoçou fora (autorizado)','Trouxe almoço / comeu em outro lugar','Serviço externo','Consulta ou atestado','Saiu antes ou chegou depois do almoço','Outro'];
  function foraDe(k){ const f=(cfg().fora||{})[k]; return f&&!f.removido?f:null; }
  function situacao(m,d,k){ const aj=((A.aj[m]||{}).aj||{})[d+'_'+k]; const x=(((A.dados[m]||{}).dias||{})[d]||{})[k];
    let r; if(aj&&aj.v==='just') r={v:'just',j:aj,x}; else if(aj&&!aj.removido) r={v:aj.v==='sim'?'sim':'nao',aj,x}; else if(!x) r={v:'aus',x:null}; else r={v:x.a?'sim':'nao',x};
    if(r.v==='nao'&&foraDe(k)) r.v='fora'; return r; }
  function pessoasDoMes(m){ const c=A.ctx, D=A.dados[m]||{}, P0=D.pessoas||{}, fx={}; (c.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    const ks=new Set(Object.keys(P0)); Object.keys((A.aj[m]||{}).aj||{}).forEach(x=>ks.add(x.split('_')[1]));
    return [...ks].map(k=>{ const p=P0[k]||{}, f=fx[k]; return {k,nome:f?titulo(f.nome):(p.n||'(sem nome)'),emp:p.e||(f?(f.tipo==='PJ'?(f.empresa||'PJ'):'COLAFIX INDUSTRIA E COMERCIO LTDA'):''),setor:f?(f.setor||''):'',cad:!!f,grupo:p.g||''}; })
      .filter(p=>(!A.emp||(A.emp==='-'?!p.emp:p.emp===A.emp))&&(!A.setor||(A.setor==='-'?!p.setor:p.setor===A.setor))) /* a busca por nome filtra na própria tela (almBusca), sem redesenhar */
      .sort((a,b)=>a.nome.localeCompare(b.nome)); }
  const empCurta=e=>!e?'Sem empresa':/COLAFIX/i.test(e)?'Colafix':titulo(e);

  /* ---------- tela ---------- */
  function render(c){ A.ctx=c; const P=c.P, esc=c.esc, h=P.hojeStr(); if(!A.mes) A.mes=h.slice(0,7); assinar(A.mes); assinar(mesAnt(A.mes));
    const D=A.dados[A.mes]; const ds=Object.keys((D&&D.dias)||{}).sort(); if(!A.dia||A.dia.slice(0,7)!==A.mes) A.dia=ds.length?ds[ds.length-1]:(A.mes===h.slice(0,7)?h:A.mes+'-01');
    const C=cfg(), ps=D?pessoasDoMes(A.mes):[], setores=[...new Set((c.R.func||[]).map(f=>f.setor).filter(Boolean))].sort(), emps=[...new Set(Object.values((D&&D.pessoas)||{}).map(p=>p.e))].sort();
    const ultImp=D&&D.imp&&D.imp.length?D.imp[D.imp.length-1]:null, st=D&&ds.length?stats(A.mes):null;
    const topo=`<section class="card alm-top"><div class="alm-h"><div class="alm-mesnav"><button class="btn sec" data-act="alm-mes" data-v="-1" aria-label="Mês anterior">‹</button><div><div class="eyebrow">RH · REFEITÓRIO</div><h2>Almoço · ${esc(mesNome(A.mes))}</h2></div><button class="btn sec" data-act="alm-mes" data-v="1" aria-label="Próximo mês">›</button></div>
      <label class="btn" style="cursor:pointer">${A.lendo?'Lendo…':P.ic('baixar',18,2.2)+'Importar do Face ID'}<input type="file" accept=".csv,text/csv" id="alm-arq" hidden ${A.lendo?'disabled':''}></label></div>
      <div class="sub alm-reg">Almoçou quem passou no <b>${esc(C.disp)}</b> entre ${esc(C.ini)} e ${esc(C.fim)}. ${ultImp?'Dados de '+esc(c.br(ultImp.de))+' a '+esc(c.br(ultImp.ate))+' · importado por '+esc(ultImp.por||'')+' em '+esc(new Date(ultImp.em).toLocaleDateString('pt-BR')):'Ainda não há dados deste mês.'}
        <details><summary>Como exportar do Control iD</summary><ol><li>Relatórios → Acessos → <b>Acessos Gerais</b>.</li><li>Escolha as datas (pode ser o mês todo), Pessoas: Todos, e clique em Listar.</li><li>Exportar → <b>Exportar CSV</b> e arraste o arquivo aqui (ou toque em "Importar do Face ID").</li><li>Importar de novo o mesmo período só atualiza esses dias: não duplica.</li></ol></details></div>
      ${st?`<div class="alm-kpi"><div><span>Almoços no mês</span><b class="num">${st.tot.toLocaleString('pt-BR')}</b><small>${st.dExp} dias de expediente</small></div><div><span>Média por dia</span><b class="num">${st.media}</b><small>${st.ant?varTxt(st.media,st.ant.media)+' que '+mesNome(st.ant.mes).split(' ')[0]:'nos dias de expediente'}</small></div>
        <div><span>Adesão</span><b class="num">${st.ades}%</b><small>de quem estava na empresa almoçou</small></div><div><span>Pessoas que almoçaram</span><b class="num">${st.pessoas}</b><small>${st.semCad?st.semCad+' sem cadastro no RH':'todas no cadastro do RH'}</small></div><div class="${st.semJust?'alm-kw':''}"><span>Sem almoço e sem justificativa</span><b class="num">${st.semJust}</b><small>${st.just} justificados · ${st.fora} não almoçam aqui</small></div></div>`:''}</section>`;
    if(!D||!ds.length&&!Object.keys((A.aj[A.mes]||{}).aj||{}).length) return topo+`<section class="card"><div class="empty" style="padding:24px;text-align:center">Nenhum dado do Face ID em ${esc(mesNome(A.mes))}. Importe o CSV do Control iD.</div></section>`;
    const abas=`<div class="seg" role="group"><button data-act="alm-vis" data-v="dia" aria-pressed="${A.vis==='dia'}">Por dia</button><button data-act="alm-vis" data-v="mes" aria-pressed="${A.vis==='mes'}">Fechamento do mês</button><button data-act="alm-vis" data-v="dir" aria-pressed="${A.vis==='dir'}">Diretoria</button></div>`;
    if(A.vis==='dir') return topo+`<section class="card"><div class="alm-f">${abas}<span style="flex:1"></span><button class="btn" data-act="alm-ppt" ${A.ppt?'disabled':''}>${P.ic('baixar',18,2.2)}${A.ppt?'Gerando…':'Baixar apresentação (PowerPoint)'}</button></div>${vDir(c,st)}</section>`;
    const filtros=`<div class="alm-f">${abas}
      <select class="txt" id="alm-emp" style="max-width:220px"><option value="">Todas as empresas</option>${emps.map(e=>`<option value="${esc(e||'-')}" ${A.emp===(e||'-')?'selected':''}>${esc(empCurta(e))}</option>`).join('')}</select>
      ${setores.length?`<select class="txt" id="alm-setor" style="max-width:200px"><option value="">Todos os setores</option>${setores.map(x=>`<option value="${esc(x)}" ${A.setor===x?'selected':''}>${esc(x)}</option>`).join('')}<option value="-" ${A.setor==='-'?'selected':''}>Sem setor</option></select>`:''}
      <select class="txt" id="alm-sit" style="max-width:240px">${[['','Todas as situações'],['sim','Almoçou'],['nao','Sem almoço e sem justificativa'],['just','Justificado'],['fora','Não almoça na empresa']].map(([v,t])=>`<option value="${v}" ${A.sit===v?'selected':''}>${t}</option>`).join('')}</select>
      <input class="txt" id="alm-q" type="search" autocomplete="off" placeholder="Buscar nome, setor ou CPF" value="${esc(A.q)}" style="max-width:260px"><span class="sub" id="alm-qn"></span>
      ${A.vis==='mes'?`<span style="flex:1"></span><button class="btn sec rh-sm" data-act="alm-xls">${P.ic('baixar',16,2.2)}Excel</button><button class="btn sec rh-sm" data-act="alm-imp">Imprimir</button>`:''}</div>`;
    return topo+`<section class="card">${filtros}${A.vis==='dia'?vDia(c,ds,ps):vMes(c,ds,ps)}</section>`+vPessoa(c,ds)+vJust(c); }
  function mesAnt(m){ const [y,mm]=m.split('-').map(Number), d=new Date(y,mm-2,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  const varTxt=(a,b)=>{ if(!b) return ''; const v=Math.round((a-b)/b*100); return v===0?'igual':(v>0?'▲ '+v+'% a mais':'▼ '+(-v)+'% a menos'); };
  /* números do mês (sempre de todos, sem os filtros da tela) */
  function stats(m){ const D=A.dados[m]; if(!D) return null; const ds=Object.keys(D.dias||{}).sort(); if(!ds.length) return null; const ps=(()=>{ const q=A.q, e=A.emp, se=A.setor; A.q=''; A.emp=''; A.setor=''; const r=pessoasDoMes(m); A.q=q; A.emp=e; A.setor=se; return r; })();
    const pd=ds.map(d=>{ let pres=0, alm=0, caf=0, sj=0, jj=0; ps.forEach(p=>{ const s=situacao(m,d,p.k); if(s.v!=='aus'&&s.v!=='fora') pres++; if(s.v==='sim') alm++; if(s.v==='nao') sj++; if(s.v==='just') jj++; if(s.x&&s.x.c) caf++; }); return {d,pres,alm,caf,sj,jj}; });
    const mx=Math.max(...pd.map(x=>x.pres)), lim=Math.max(5,mx*0.4), exp=pd.filter(x=>x.pres>=lim);
    const tot=pd.reduce((s,x)=>s+x.alm,0), media=exp.length?Math.round(exp.reduce((s,x)=>s+x.alm,0)/exp.length):0, ades=exp.length?Math.round(exp.reduce((s,x)=>s+x.alm,0)/Math.max(1,exp.reduce((s,x)=>s+x.pres,0))*100):0;
    const quem=ps.filter(p=>ds.some(d=>situacao(m,d,p.k).v==='sim')); const porEmp={}; quem.forEach(p=>{ const e=empCurta(p.emp); const x=(porEmp[e]=porEmp[e]||{e,alm:0,pessoas:0}); x.pessoas++; x.alm+=ds.filter(d=>situacao(m,d,p.k).v==='sim').length; });
    const SEM=['seg','ter','qua','qui','sex','sáb']; const porSem=SEM.map(w=>{ const xs=exp.filter(x=>semana(x.d)===w); return {w,m:xs.length?Math.round(xs.reduce((s,x)=>s+x.alm,0)/xs.length):0,n:xs.length}; }).filter(x=>x.n);
    const ajN=Object.values((A.aj[m]||{}).aj||{}).filter(x=>x.v!=='just').length, C=cfg(), valor=+C.valor||0;
    const ant=m===mesAnt(m)?null:(A.dados[mesAnt(m)]&&Object.keys(A.dados[mesAnt(m)].dias||{}).length?statsBase(mesAnt(m)):null);
    const ult=D.imp&&D.imp.length?D.imp[D.imp.length-1]:null;
    return {m,pd,exp,dExp:exp.length,tot,media,ades,pessoas:quem.length,semCad:quem.filter(p=>!p.cad).length,porEmp:Object.values(porEmp).sort((a,b)=>b.alm-a.alm),porSem,ajN,valor,custo:valor?tot*valor:0,ant,
      cafe:pd.reduce((s,x)=>s+x.caf,0),semJust:pd.reduce((s,x)=>s+x.sj,0),just:pd.reduce((s,x)=>s+x.jj,0),fora:ps.filter(p=>foraDe(p.k)).length,de:ds[0],ate:ds[ds.length-1],ult}; }
  function statsBase(m){ const sv=A._stB; if(sv) return null; A._stB=true; try{ const s=stats(m); return s?{mes:m,media:s.media,tot:s.tot,ades:s.ades}:null; } finally{ A._stB=false; } }
  /* ---------- painel da diretoria ---------- */
  const COR={alm:'#1B5C7A',pres:'#C7DCE6',grid:'#E5DFD0'};
  function svgDias(st){ const W=760,H=240,ml=34,mb=28,mt=14, n=st.pd.length, mx=Math.max(10,...st.pd.map(x=>x.pres)), top=Math.ceil(mx/10)*10, bw=Math.min(34,(W-ml-10)/n-6), sx=i=>ml+8+i*((W-ml-16)/n), sy=v=>mt+(H-mt-mb)*(1-v/top);
    const grid=[0,top/2,top].map(v=>`<line x1="${ml}" x2="${W-6}" y1="${sy(v)}" y2="${sy(v)}" stroke="${COR.grid}"/><text x="${ml-6}" y="${sy(v)+4}" text-anchor="end" font-size="11" fill="#6B6558">${v}</text>`).join('');
    const bars=st.pd.map((x,i)=>{ const X=sx(i); return `<g><title>${x.d.slice(8)}/${x.d.slice(5,7)} (${semana(x.d)}): ${x.alm} almoçaram de ${x.pres} na empresa</title><rect x="${X}" y="${sy(x.pres)}" width="${bw}" height="${sy(0)-sy(x.pres)}" rx="4" fill="${COR.pres}"/><rect x="${X+bw*0.18}" y="${sy(x.alm)}" width="${bw*0.64}" height="${Math.max(0,sy(0)-sy(x.alm))}" rx="3" fill="${COR.alm}"/>
      <text x="${X+bw/2}" y="${H-10}" text-anchor="middle" font-size="11" fill="#6B6558">${x.d.slice(8)}</text>${x.pres>=st.pd.reduce((a,y)=>Math.max(a,y.pres),0)*0.4?`<text x="${X+bw/2}" y="${sy(x.alm)-4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1A1A1A">${x.alm}</text>`:''}</g>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Almoços por dia">${grid}${bars}</svg>`; }
  function barrasH(xs,fmt){ const mx=Math.max(1,...xs.map(x=>x.v)); return `<div class="alm-hb">${xs.map(x=>`<div class="alm-hbr" title="${x.t}"><span>${x.l}</span><i><b style="width:${Math.max(2,x.v/mx*100)}%"></b></i><em class="num">${fmt(x)}</em></div>`).join('')}</div>`; }
  function vDir(c,st){ const esc=c.esc; if(!st) return '<div class="empty">Sem dados.</div>'; const R$=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    return `<div class="alm-dir">
      <div class="alm-dc alm-wide"><div class="alm-dh"><h3>Almoços por dia</h3><span class="alm-lg"><i style="background:${COR.alm}"></i>almoçaram <i style="background:${COR.pres}"></i>estavam na empresa</span></div>${svgDias(st)}</div>
      <div class="alm-dc"><h3>Por empresa</h3>${barrasH(st.porEmp.map(x=>({l:esc(x.e),v:x.alm,t:x.pessoas+' pessoas'})),x=>x.v+' <small>· '+x.t+'</small>')}</div>
      <div class="alm-dc"><h3>Média por dia da semana</h3>${barrasH(st.porSem.map(x=>({l:x.w,v:x.m,t:x.n+' dias'})),x=>x.v)}</div>
      <div class="alm-dc"><h3>Custo estimado</h3><label class="sub" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Valor por refeição <input class="txt num" id="alm-valor" inputmode="decimal" placeholder="R$ 0,00" value="${st.valor?String(st.valor).replace('.',','):''}" style="max-width:120px"><button class="btn sec rh-sm" data-act="alm-valor">Salvar</button></label>
        ${st.valor?`<div class="alm-big num">${R$(st.custo)}</div><div class="sub">${st.tot} almoços × ${R$(st.valor)}${st.ant&&st.ant.tot?' · mês anterior: '+R$(st.ant.tot*st.valor):''}</div>`:'<div class="sub" style="margin-top:8px">Informe o valor da refeição para ver o custo do mês (fica guardado para os próximos meses).</div>'}</div>
      <div class="alm-dc"><h3>Observações</h3><ul class="alm-obs"><li>${st.cafe} passagens no refeitório antes das ${esc(cfg().cafeAte)} (café), fora da conta do almoço.</li><li>${st.ajN?st.ajN+' '+(st.ajN===1?'dia corrigido':'dias corrigidos')+' à mão pelo RH.':'Nenhuma correção à mão.'}</li><li>${st.semJust} dias sem almoço e sem justificativa · ${st.just} justificados · ${st.fora} ${st.fora===1?'pessoa não almoça':'pessoas não almoçam'} na empresa.</li><li>Fonte: Face ID (Control iD), ${esc(c.br(st.de))} a ${esc(c.br(st.ate))}.</li></ul></div></div>`; }
  /* ---------- apresentação (PowerPoint) ---------- */
  async function gerarPpt(){ const c=A.ctx, P=c.P, st=stats(A.mes); if(!st) return; A.ppt=true; P.rerender();
    try{ if(!window.PptxGenJS) await c.carregarJs('https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js');
      const pp=new PptxGenJS(); pp.layout='LAYOUT_WIDE'; pp.title='Refeitório · '+mesNome(st.m); pp.company='Colafix';
      const T='1B5C7A', INK='1A1A1A', MU='6B6558', BG='F5F1E8', LT='C7DCE6', F='Segoe UI';
      const logo=document.querySelector('.brand img'), lw=1.6, lh=logo&&logo.naturalWidth?lw*logo.naturalHeight/logo.naturalWidth:0.45;
      const base=(tit,sub)=>{ const s=pp.addSlide(); s.background={color:'FFFFFF'}; s.addShape(pp.ShapeType.rect,{x:0,y:0,w:13.33,h:0.12,fill:{color:T}});
        s.addText(tit,{x:0.6,y:0.35,w:10.5,h:0.7,fontFace:F,fontSize:28,bold:true,color:INK}); if(sub) s.addText(sub,{x:0.6,y:0.98,w:10.5,h:0.4,fontFace:F,fontSize:14,color:MU});
        if(logo&&logo.src) s.addImage({data:logo.src,x:13.33-0.6-lw,y:0.42,w:lw,h:lh});
        s.addText('Refeitório · '+mesNome(st.m)+'  ·  Fonte: Face ID (Control iD)',{x:0.6,y:7.0,w:12,h:0.3,fontFace:F,fontSize:10,color:MU}); return s; };
      /* 1 capa */
      { const s=pp.addSlide(); s.background={color:BG}; s.addShape(pp.ShapeType.rect,{x:0,y:0,w:0.35,h:7.5,fill:{color:T}}); if(logo&&logo.src) s.addImage({data:logo.src,x:0.9,y:0.8,w:2.6,h:2.6*lh/lw});
        s.addText('Refeitório',{x:0.9,y:2.6,w:11,h:1,fontFace:F,fontSize:48,bold:true,color:INK}); s.addText('Controle do almoço · '+mesNome(st.m),{x:0.9,y:3.55,w:11,h:0.6,fontFace:F,fontSize:24,color:T});
        s.addText('Dados do Face ID de '+c.br(st.de)+' a '+c.br(st.ate)+'. Almoço = passagem no refeitório entre '+cfg().ini+' e '+cfg().fim+'.',{x:0.9,y:4.3,w:11,h:0.5,fontFace:F,fontSize:14,color:MU}); }
      /* 2 números */
      { const s=base('Números do mês',st.dExp+' dias de expediente'); const K=[['Almoços no mês',st.tot.toLocaleString('pt-BR'),''],['Média por dia',String(st.media),st.ant?varTxt(st.media,st.ant.media)+' que '+mesNome(st.ant.mes).split(' ')[0]:''],['Adesão',st.ades+'%','de quem estava na empresa'],
          st.valor?['Custo estimado',st.custo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),st.tot+' × '+st.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})]:['Pessoas que almoçaram',String(st.pessoas),'']];
        K.forEach((k,i)=>{ const x=0.6+i*3.08; s.addShape(pp.ShapeType.roundRect,{x,y:1.8,w:2.85,h:2.6,fill:{color:BG},line:{color:BG},rectRadius:0.12});
          s.addText(k[0],{x:x+0.25,y:2.0,w:2.4,h:0.4,fontFace:F,fontSize:14,color:MU}); s.addText(k[1],{x:x+0.25,y:2.5,w:2.4,h:1.0,fontFace:F,fontSize:k[1].length>9?28:44,bold:true,color:T}); if(k[2]) s.addText(k[2],{x:x+0.25,y:3.6,w:2.4,h:0.6,fontFace:F,fontSize:12,color:MU}); });
        s.addText([{text:'Como ler: ',options:{bold:true}},{text:'o almoço é contado pela passagem no leitor de rosto do refeitório. Quem estava na empresa e não passou lá aparece como “não almoçou”. O RH corrige à mão quando o leitor falha.'}],{x:0.6,y:4.9,w:12,h:1,fontFace:F,fontSize:14,color:INK}); }
      /* 3 por dia */
      { const s=base('Almoços por dia','Barras escuras: almoçaram · claras: estavam na empresa'); const lab=st.pd.map(x=>x.d.slice(8)+'/'+x.d.slice(5,7));
        s.addChart(pp.ChartType.bar,[{name:'Estavam na empresa',labels:lab,values:st.pd.map(x=>x.pres)},{name:'Almoçaram',labels:lab,values:st.pd.map(x=>x.alm)}],
          {x:0.6,y:1.5,w:12.1,h:5.3,barGrouping:'clustered',barGapWidthPct:40,chartColors:[LT,T],showLegend:true,legendPos:'b',legendFontSize:12,catAxisLabelFontSize:11,valAxisLabelFontSize:11,valGridLine:{color:'E5DFD0',size:0.5},showValue:true,dataLabelFontSize:9,dataLabelColor:INK,catAxisLabelColor:MU,valAxisLabelColor:MU}); }
      /* 4 empresa e semana */
      { const s=base('Por empresa e por dia da semana',''); s.addText('Almoços por empresa',{x:0.6,y:1.35,w:6,h:0.4,fontFace:F,fontSize:16,bold:true,color:INK});
        s.addChart(pp.ChartType.bar,[{name:'Almoços',labels:st.porEmp.map(x=>x.e).reverse(),values:st.porEmp.map(x=>x.alm).reverse()}] /* a primeira categoria fica embaixo: invertido para a maior ficar em cima */,{x:0.6,y:1.8,w:6,h:4.9,barDir:'bar',chartColors:[T],showValue:true,dataLabelFontSize:12,catAxisLabelFontSize:13,valAxisHidden:true,valGridLine:{style:'none'},catAxisLabelColor:INK});
        s.addText('Média de almoços por dia da semana',{x:6.9,y:1.35,w:6,h:0.4,fontFace:F,fontSize:16,bold:true,color:INK});
        s.addChart(pp.ChartType.bar,[{name:'Média',labels:st.porSem.map(x=>x.w),values:st.porSem.map(x=>x.m)}],{x:6.9,y:1.8,w:5.8,h:4.9,chartColors:[T],showValue:true,dataLabelFontSize:12,catAxisLabelFontSize:13,valAxisHidden:true,valGridLine:{style:'none'},catAxisLabelColor:INK});
        s.addText(st.porEmp.map(x=>x.e+': '+x.pessoas+' pessoas').join('  ·  '),{x:0.6,y:6.6,w:12,h:0.35,fontFace:F,fontSize:11,color:MU}); }
      /* 5 observações */
      { const s=base('Observações',''); const ob=[st.cafe+' passagens no refeitório antes das '+cfg().cafeAte+' (café da manhã), fora da conta do almoço.',st.ajN?st.ajN+' '+(st.ajN===1?'dia foi corrigido':'dias foram corrigidos')+' à mão pelo RH.':'Nenhuma correção à mão no mês.',
          st.semCad?st.semCad+' pessoas que almoçaram ainda não estão no cadastro do RH (prestadores e terceirizados).':'Todas as pessoas que almoçaram estão no cadastro do RH.',st.semJust+' dias sem almoço e sem justificativa; '+st.just+' justificados; '+st.fora+' '+(st.fora===1?'pessoa não almoça':'pessoas não almoçam')+' na empresa (fora da conta da adesão).','Período dos dados: '+c.br(st.de)+' a '+c.br(st.ate)+'.'];
        s.addText(ob.map(t=>({text:t,options:{bullet:true,breakLine:true}})),{x:0.8,y:1.6,w:11.5,h:4.5,fontFace:F,fontSize:20,color:INK,paraSpaceAfter:12,valign:'top'}); }
      await pp.writeFile({fileName:'Refeitorio-'+st.m+'.pptx'}); P.toast('Apresentação baixada.'); }
    catch(e){ console.warn('[almoço] ppt',e); P.toast('Não consegui gerar a apresentação: '+((e&&e.message)||e)); }
    finally{ A.ppt=false; P.rerender(); } }
  function vDia(c,ds,ps){ const esc=c.esc, m=A.mes, d=A.dia;
    const L=ps.map(p=>Object.assign({s:situacao(m,d,p.k)},p)), g=v=>L.filter(x=>x.s.v===v), sim=g('sim'), nao=g('nao'), jus=g('just'), fora=g('fora');
    const tira=`<div class="alm-dias">${ds.map(x=>{ const ss=ps.map(p=>situacao(m,x,p.k).v), n=ss.filter(v=>v==='sim').length, sj=ss.filter(v=>v==='nao').length; return `<button data-act="alm-dia" data-v="${x}" aria-pressed="${x===d}" title="${n} almoçaram · ${sj} sem justificativa"><small>${semana(x)}</small><b>${x.slice(8)}</b><span>${n}</span>${sj?`<em>${sj}</em>`:''}</button>`; }).join('')}</div>`;
    const info=x=>[empCurta(x.emp),x.setor].filter(Boolean).join(' · ')+(x.cad?'':' · sem cadastro no RH');
    const lin=(x,extra,bt)=>`<div class="alm-l" data-b="${esc(almChave(x))}"><div><button class="lnk alm-nm" data-act="alm-pes" data-k="${x.k}">${esc(x.nome)}</button><small>${esc(info(x))}</small>${extra||''}</div>
      <div class="alm-r">${x.s.x&&x.s.x.a?`<span class="num">${esc(x.s.x.a)}</span>`:''}${x.s.x&&x.s.x.c?`<small>café ${esc(x.s.x.c)}</small>`:''}${x.s.aj?`<small title="${esc(x.s.aj.mot||'')}">corrigido por ${esc(x.s.aj.por||'')}</small>`:''}${bt}</div></div>`;
    const jtx=x=>`<span class="alm-jt">${esc(x.s.j.tipo||'Justificado')}${x.s.j.mot?' · '+esc(x.s.j.mot):''}<small> · ${esc(x.s.j.por||'')}</small></span>`;
    const bloco=(cls,tit,xs,mk,vazio)=>!A.sit||A.sit===cls?`<div class="alm-bl ${cls}"><div class="label">${tit} <b>(${xs.length})</b></div>${xs.map(mk).join('')||`<div class="sub">${vazio}</div>`}</div>`:'';
    const esq=bloco('sim','ALMOÇARAM',sim,x=>lin(x,'',`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="nao">não almoçou</button>`),'Ninguém.');
    const dir=bloco('nao','NÃO ALMOÇARAM · SEM JUSTIFICATIVA',nao,x=>lin(x,'',`<button class="btn sec rh-sm" data-act="alm-jus" data-k="${x.k}" data-d="${d}">Justificar</button><button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="sim">almoçou</button>`),'Ninguém. Tudo justificado.')
      +bloco('just','JUSTIFICADOS',jus,x=>lin(x,jtx(x),`<button class="lnk" data-act="alm-jus" data-k="${x.k}" data-d="${d}">alterar</button>`),'Nenhuma justificativa neste dia.')
      +(!A.sit||A.sit==='fora'?`<details class="alm-bl fora" ${A.sit==='fora'?'open':''}><summary class="label">NÃO ALMOÇAM NA EMPRESA <b>(${fora.length})</b></summary>${fora.map(x=>lin(x,`<span class="alm-jt">${esc(foraDe(x.k).mot||'Não almoça na empresa')}</span>`,'')).join('')||'<div class="sub">Ninguém marcado. Para marcar, clique no nome da pessoa.</div>'}</details>`:'');
    return `${tira}<div class="alm-dt"><h3>${esc(c.br(d))} · ${semana(d)}</h3><span class="pill ok">${sim.length} almoçaram</span><span class="pill warn">${nao.length} sem justificativa</span>${jus.length?`<span class="pill">${jus.length} justificados</span>`:''}${fora.length?`<span class="pill">${fora.length} não almoçam aqui</span>`:''}</div>
      <div class="alm-g"><div>${esq}</div><div>${dir}</div></div>`; }
  /* ---------- justificativa (janela) ---------- */
  function vJust(c){ const J=A.jus; if(!J) return ''; const esc=c.esc, aj=((A.aj[J.d.slice(0,7)]||{}).aj||{})[J.d+'_'+J.k], cur=aj&&aj.v==='just'?aj:null; const tipos=cfg().just||JUST_PADRAO;
    if(J.tipo===undefined){ J.tipo=cur?cur.tipo:''; J.mot=cur?cur.mot||'':''; }
    const nome=(pessoasDoMes(A.mes).find(p=>p.k===J.k)||{}).nome||'';
    return `<div class="rh-modal" data-act="alm-jusx-fundo"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Justificar" style="max-width:520px"><div class="rh-ch"><h2>Justificar · ${esc(nome)}</h2><button class="lnk" data-act="alm-jusx">Fechar</button></div>
      <div class="sub" style="margin:-4px 0 10px">${esc(c.br(J.d))} · ${semana(J.d)}. A pessoa continua sem almoço nesse dia, mas não conta como falta sem justificativa.</div>
      <div class="alm-jtipos">${tipos.map(t=>`<button class="${J.tipo===t?'on':''}" data-act="alm-jtipo" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <label style="display:block;margin-top:12px"><span class="label">Observação ${J.tipo==='Outro'?'(diga o motivo)':'(opcional)'}</span><input class="txt" id="alm-jmot" maxlength="120" value="${esc(J.mot||'')}" placeholder="ex.: autorizado pelo supervisor"></label>
      ${J.erro?`<p class="err" style="color:var(--crit-ink)">${esc(J.erro)}</p>`:''}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap">${cur?'<button class="lnk" data-act="alm-jrem" style="color:var(--crit-ink)">Tirar a justificativa</button>':'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="alm-jusx">Cancelar</button><button class="btn" data-act="alm-jsalvar">Salvar</button></div></div></div></div>`; }
  async function gravaAj(k,d,it){ const c=A.ctx, P=c.P, m=d.slice(0,7), ref=P.db().doc('rh/dados/almocoaj/'+m), cur=A.aj[m]||{mes:m,aj:{},log:[]};
    const aj=Object.assign({},cur.aj||{}); if(it) aj[d+'_'+k]=it; else delete aj[d+'_'+k];
    const log=(cur.log||[]).concat([Object.assign({chave:d+'_'+k,por:c.eu(),em:new Date().toISOString()},it||{v:'removido'})]).slice(-500);
    await ref.set({mes:m,aj,log}); A.aj[m]=Object.assign({},cur,{aj,log}); }
  async function marcarFora(k,on){ const c=A.ctx, P=c.P; let mot='';
    if(on){ mot=prompt('Por que não almoça na empresa? (ex.: almoça em casa, traz marmita e come fora, outro turno)'); if(mot===null) return; }
    const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}), fora=Object.assign({},al.fora||{});
    fora[k]=on?{mot:String(mot).trim().slice(0,120),por:c.eu(),em:new Date().toISOString()}:Object.assign({},fora[k]||{},{removido:true,remPor:c.eu(),remEm:new Date().toISOString()});
    al.fora=fora; try{ await P.db().doc('rh/config').set({almoco:al},{merge:true}); if(c.R.cfg) c.R.cfg.almoco=al; P.toast(on?'Marcado: não almoça na empresa. Não aparece mais como falta.':'Volta a contar no almoço.'); P.rerender(); }catch(e){ P.erro(e); } }
  /* ---------- detalhe da pessoa no mês (todas as passagens do Face ID) ---------- */
  const durTxt=(a,b)=>{ const x=hm(a), y=hm(b); if(x==null||y==null||y<=x) return ''; const m=y-x; return m<60?m+' min':Math.floor(m/60)+'h'+pad(m%60); };
  function vPessoa(c,ds){ const k=A.pes; if(!k) return ''; const esc=c.esc, m=A.mes, P0=((A.dados[m]||{}).pessoas||{})[k]||{}, f=(c.R.func||[]).find(x=>String(x.cpf||'').replace(/\D/g,'').padStart(11,'0')===k);
    const nome=f?titulo(f.nome):(P0.n||'(sem nome)'), C=cfg(), dRef=nrm(C.disp);
    const L=ds.map(d=>{ const s=situacao(m,d,k), ts=(s.x&&s.x.t)||[]; const ps=ts.map(x=>({h:x.slice(0,8).trim(),d:x.slice(x.indexOf(' ')+1)}));
      const ref=ps.filter(x=>nrm(x.d)===dRef&&hm(x.h)>=hm(C.ini)&&hm(x.h)<=hm(C.fim)); const ent=ps.find(x=>/ENTRADA/.test(nrm(x.d))), sai=[...ps].reverse().find(x=>/SAIDA/.test(nrm(x.d)));
      return {d,s,ps,ref,ent,sai}; }).filter(x=>x.s.v!=='aus'||x.s.aj||x.s.j);
    const nSim=L.filter(x=>x.s.v==='sim').length, nNao=L.filter(x=>x.s.v==='nao').length, nJ=L.filter(x=>x.s.v==='just').length, fo=foraDe(k), semT=L.some(x=>x.s.x&&!x.s.x.t);
    const sit=x=>x.s.v==='sim'?'<span class="pill ok">almoçou</span>':x.s.v==='just'?'<span class="pill">justificado</span>':x.s.v==='fora'?'<span class="pill">não almoça aqui</span>':'<span class="pill warn">sem justificativa</span>';
    return `<div class="rh-modal" data-act="alm-pesx-fundo"><div class="rh-mbox alm-pm" role="dialog" aria-modal="true" aria-label="Entradas de ${esc(nome)}">
      <div class="rh-ch"><div><h2>${esc(nome)}</h2><div class="sub">${esc([empCurta(P0.e||''),f&&f.setor,c.fCPF(k),f?'':'sem cadastro no RH'].filter(Boolean).join(' · '))}</div></div><button class="lnk" data-act="alm-pesx">Fechar</button></div>
      <div class="alm-pk"><div><b class="num">${nSim}</b><span>almoços</span></div><div><b class="num">${nNao}</b><span>sem justificativa</span></div><div><b class="num">${nJ}</b><span>justificados</span></div><div><b class="num">${L.length}</b><span>dias na empresa</span></div><div><b class="num">${L.filter(x=>x.s.x&&x.s.x.c).length}</b><span>cafés</span></div></div>
      <div class="alm-fora ${fo?'on':''}">${fo?`<b>Não almoça na empresa</b>${fo.mot?' · '+esc(fo.mot):''} <small>(${esc(fo.por||'')})</small> <button class="lnk" data-act="alm-fora" data-k="${k}" data-v="0">voltar a contar</button>`:`<span class="sub">Esta pessoa almoça em outro lugar todo dia?</span> <button class="btn sec rh-sm" data-act="alm-fora" data-k="${k}" data-v="1">Não almoça na empresa</button>`}</div>
      ${semT?'<p class="sub" style="margin:8px 0 0">Para ver todas as passagens destes dias, importe o CSV do Face ID de novo (as importações antigas guardaram só o horário do almoço).</p>':''}
      <div class="alm-pl">${L.map(x=>`<div class="alm-pd ${x.s.v}"><div class="alm-pdh"><b>${esc(c.br(x.d))}</b><small>${semana(x.d)}</small>${sit(x)}
          ${x.ref.length?`<span class="alm-ph">Refeitório ${esc(x.ref[0].h.slice(0,5))}${x.ref.length>1?' → '+esc(x.ref[x.ref.length-1].h.slice(0,5))+' ('+durTxt(x.ref[0].h,x.ref[x.ref.length-1].h)+')':''}</span>`:''}
          ${x.ent||x.sai?`<span class="alm-ph sub">${x.ent?'chegou '+esc(x.ent.h.slice(0,5)):''}${x.ent&&x.sai?' · ':''}${x.sai?'saiu '+esc(x.sai.h.slice(0,5)):''}</span>`:''}
          <span class="alm-pb">${x.s.v==='nao'||x.s.v==='just'?`<button class="lnk" data-act="alm-jus" data-k="${k}" data-d="${x.d}">${x.s.v==='just'?'alterar justificativa':'justificar'}</button>`:''}<button class="lnk" data-act="alm-aj2" data-k="${k}" data-d="${x.d}" data-v="${x.s.v==='sim'?'nao':'sim'}">${x.s.v==='sim'?'marcar não almoçou':'marcar almoçou'}</button></span></div>
        ${x.s.v==='just'?`<div class="alm-paj">Justificado: ${esc(x.s.j.tipo||'')}${x.s.j.mot?' · '+esc(x.s.j.mot):''} (${esc(x.s.j.por||'')})</div>`:''}
        ${x.s.aj&&!x.s.j?`<div class="alm-paj">Corrigido por ${esc(x.s.aj.por||'')} em ${esc(new Date(x.s.aj.em).toLocaleDateString('pt-BR'))}${x.s.aj.mot?': '+esc(x.s.aj.mot):''}</div>`:''}
        ${x.ps.length?`<div class="alm-pt">${x.ps.map(p=>`<span class="${nrm(p.d)===dRef?'r':''}"><b class="num">${esc(p.h)}</b> ${esc(p.d)}</span>`).join('')}</div>`:''}</div>`).join('')||'<div class="empty">Sem passagens neste mês.</div>'}</div></div></div>`; }
  function grade(ds,ps){ return ps.map(p=>{ const v=ds.map(d=>situacao(A.mes,d,p.k)); return {p,v,tot:v.filter(x=>x.v==='sim').length,pres:v.filter(x=>x.v!=='aus').length,sj:v.filter(x=>x.v==='nao').length,jj:v.filter(x=>x.v==='just').length}; }).filter(g=>!A.sit||g.v.some(x=>x.v===A.sit)); }
  function vMes(c,ds,ps){ const esc=c.esc, G=grade(ds,ps);
    const porEmp={}; G.forEach(g=>{ const e=empCurta(g.p.emp); porEmp[e]=(porEmp[e]||0)+g.tot; });
    return `<div class="sub" style="margin:4px 0 10px">✓ almoçou · ✗ sem almoço e sem justificativa · J justificado · – não almoça na empresa · em branco: não veio. Clique num dia ✗ para justificar ou corrigir. Totais: ${Object.entries(porEmp).map(([e,n])=>`<b>${esc(e)}</b> ${n}`).join(' · ')}</div>
      <div class="alm-tw"><table class="alm-t"><thead><tr><th class="alm-n">Pessoa</th>${ds.map(d=>`<th><small>${semana(d)}</small>${d.slice(8)}</th>`).join('')}<th>Almoços</th><th>Sem just.</th><th>Justif.</th><th>Dias na empresa</th></tr></thead>
      <tbody>${G.map(g=>`<tr data-b="${esc(almChave(g.p))}"><td class="alm-n"><button class="lnk alm-nm" data-act="alm-pes" data-k="${g.p.k}">${esc(g.p.nome)}</button><small>${esc(empCurta(g.p.emp))}${g.p.setor?' · '+esc(g.p.setor):''}</small></td>${g.v.map((s,i)=>`<td class="alm-c ${s.v}${s.aj?' aj':''}" data-act="alm-cel" data-k="${g.p.k}" data-d="${ds[i]}" title="${s.j?'Justificado: '+esc((s.j.tipo||'')+(s.j.mot?' · '+s.j.mot:'')):s.aj?'Ajustado: '+esc(s.aj.mot||''):s.x&&s.x.a?'Refeitório '+esc(s.x.a):''}">${s.v==='sim'?'✓':s.v==='nao'?'✗':s.v==='just'?'J':s.v==='fora'?'–':''}</td>`).join('')}<td class="num"><b>${g.tot}</b></td><td class="num">${g.sj||''}</td><td class="num">${g.jj||''}</td><td class="num">${g.pres}</td></tr>`).join('')}</tbody></table></div>`; }
  async function ajustar(k,d,v){ const c=A.ctx, P=c.P, m=d.slice(0,7); const mot=prompt(v==='sim'?'Motivo (ex.: almoçou sem passar o rosto):':'Motivo (ex.: passou no refeitório mas não almoçou):'); if(mot===null) return;
    const ref=P.db().doc('rh/dados/almocoaj/'+m); const cur=A.aj[m]||{mes:m,aj:{},log:[]}; const it={v,mot:String(mot).trim().slice(0,120),por:c.eu(),em:new Date().toISOString()};
    const aj=Object.assign({},cur.aj||{}); aj[d+'_'+k]=it; const log=(cur.log||[]).concat([Object.assign({chave:d+'_'+k},it)]).slice(-500);
    try{ await ref.set({mes:m,aj,log}); P.toast('Ajuste guardado.'); }catch(e){ P.erro(e); } }
  async function excel(){ const c=A.ctx, D=A.dados[A.mes]; const ds=Object.keys(D.dias||{}).sort(), G=grade(ds,pessoasDoMes(A.mes));
    const cab=['Nome','CPF','Empresa','Setor'].concat(ds.map(d=>d.slice(8)+'/'+d.slice(5,7)),['Almoços','Sem justificativa','Justificados','Dias na empresa']);
    const L=[cab].concat(G.map(g=>[g.p.nome,c.fCPF(g.p.k),empCurta(g.p.emp),g.p.setor].concat(g.v.map(s=>s.v==='sim'?1:s.v==='nao'?0:s.v==='just'?'J':s.v==='fora'?'F':''),[g.tot,g.sj,g.jj,g.pres])));
    if(!window.XLSX) await c.carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const ws=XLSX.utils.aoa_to_sheet(L); ws['!cols']=cab.map((_,i)=>({wch:i===0?32:i<4?16:i>=cab.length-2?14:6})); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Almoço '+A.mes);
    c.baixar(new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Almoco-'+A.mes+'.xlsx'); }
  function imprimir(){ const t=document.querySelector('.alm-tw'); if(!t) return; const w=window.open('','_blank'); if(!w) return;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Almoço ${mesNome(A.mes)}</title><style>body{font:11px Arial,sans-serif;margin:12mm}h1{font-size:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:2px 3px;text-align:center}td:first-child,th:first-child{text-align:left}small{display:block;color:#666;font-size:9px}@page{size:A4 landscape;margin:8mm}</style></head><body><h1>Almoço · ${mesNome(A.mes)}</h1>${t.innerHTML}</body></html>`);
    w.document.close(); setTimeout(()=>{ w.print(); },300); }

  /* ---------- eventos ---------- */
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="alm-"]'); if(!b||!A.ctx) return; const a=b.dataset.act, P=A.ctx.P;
    if(a==='alm-mes'){ const [y,m]=A.mes.split('-').map(Number), d=new Date(y,m-1+(+b.dataset.v),1); A.mes=d.getFullYear()+'-'+pad(d.getMonth()+1); A.dia=''; P.rerender(); return; }
    if(a==='alm-vis'){ A.vis=b.dataset.v; P.rerender(); return; }
    if(a==='alm-dia'){ A.dia=b.dataset.v; P.rerender(); return; }
    if(a==='alm-aj'){ ajustar(b.dataset.k,A.dia,b.dataset.v); return; }
    if(a==='alm-cel'){ const s=situacao(A.mes,b.dataset.d,b.dataset.k); if(s.v==='nao'||s.v==='just'){ A.jus={k:b.dataset.k,d:b.dataset.d}; P.rerender(); return; } if(s.v==='aus'&&!s.aj) return; ajustar(b.dataset.k,b.dataset.d,s.v==='sim'?'nao':'sim'); return; }
    if(a==='alm-xls'){ excel().catch(e=>P.erro(e)); return; }
    if(a==='alm-imp'){ imprimir(); return; }
    if(a==='alm-jus'){ A.jus={k:b.dataset.k,d:b.dataset.d}; P.rerender(); setTimeout(()=>{ const i=document.getElementById('alm-jmot'); if(i&&A.jus.tipo) i.focus(); },50); return; }
    if(a==='alm-jusx'||(a==='alm-jusx-fundo'&&ev.target===b)){ A.jus=null; P.rerender(); return; }
    if(a==='alm-jtipo'){ A.jus.tipo=b.dataset.v; A.jus.mot=(document.getElementById('alm-jmot')||{}).value||A.jus.mot; A.jus.erro=''; P.rerender(); return; }
    if(a==='alm-jsalvar'||a==='alm-jrem'){ const J=A.jus; J.mot=String((document.getElementById('alm-jmot')||{}).value||'').trim();
      if(a==='alm-jsalvar'){ if(!J.tipo){ J.erro='Escolha o tipo da justificativa.'; P.rerender(); return; } if(J.tipo==='Outro'&&J.mot.length<3){ J.erro='Escreva o motivo.'; P.rerender(); return; } }
      gravaAj(J.k,J.d,a==='alm-jsalvar'?{v:'just',tipo:J.tipo,mot:J.mot.slice(0,120),por:A.ctx.eu(),em:new Date().toISOString()}:null).then(()=>{ A.jus=null; P.toast(a==='alm-jsalvar'?'Justificativa guardada.':'Justificativa retirada.'); P.rerender(); }).catch(e=>P.erro(e)); return; }
    if(a==='alm-fora'){ marcarFora(b.dataset.k,b.dataset.v==='1'); return; }
    if(a==='alm-pes'){ A.pes=b.dataset.k; P.rerender(); return; }
    if(a==='alm-pesx'||(a==='alm-pesx-fundo'&&ev.target===b)){ A.pes=null; P.rerender(); return; }
    if(a==='alm-aj2'){ ajustar(b.dataset.k,b.dataset.d,b.dataset.v); return; }
    if(a==='alm-ppt'){ gerarPpt(); return; }
    if(a==='alm-valor'){ const v=parseFloat(String((document.getElementById('alm-valor')||{}).value||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
      P.db().doc('rh/config').set({almoco:Object.assign({},(A.ctx.R.cfg&&A.ctx.R.cfg.almoco)||{},{valor:v})},{merge:true}).then(()=>{ if(A.ctx.R.cfg){ A.ctx.R.cfg.almoco=Object.assign({},A.ctx.R.cfg.almoco||{},{valor:v}); } P.toast(v?'Valor da refeição guardado.':'Valor apagado.'); P.rerender(); }).catch(e=>P.erro(e)); return; } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!A.ctx) return;
    if(t.id==='alm-arq'&&t.files&&t.files[0]){ importar(t.files[0]); t.value=''; }
    if(t.id==='alm-emp'){ A.emp=t.value; A.ctx.P.rerender(); }
    if(t.id==='alm-setor'){ A.setor=t.value; A.ctx.P.rerender(); }
    if(t.id==='alm-sit'){ A.sit=t.value; A.ctx.P.rerender(); } });
  /* busca: todas as palavras, sem acento, em qualquer ordem (nome, setor, empresa ou CPF) */
  function almChave(p){ return nrm([p.nome,p.setor,empCurta(p.emp)].join(' '))+' '+p.k; }
  function almBusca(){ const ws=nrm(A.q).split(/\s+/).filter(Boolean), dq=String(A.q||'').replace(/\D/g,''); let n=0, t=0;
    document.querySelectorAll('#view [data-b]').forEach(el=>{ const b=el.dataset.b; const ok=!ws.length||ws.every(w=>b.includes(w))||(dq.length>=3&&b.slice(-11).includes(dq)); el.hidden=!ok; t++; if(ok) n++; });
    const q=document.getElementById('alm-qn'); if(q) q.textContent=ws.length?(n?n+' encontrado'+(n===1?'':'s'):'Ninguém com esse nome neste mês'):''; }
  document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='alm-q'&&A.ctx){ A.q=t.value; almBusca(); } });
  { const P0=window.Painel; if(P0&&P0.rerender){ new MutationObserver(()=>{ if(A.q&&document.getElementById('alm-q')) almBusca(); }).observe(document.getElementById('view')||document.body,{childList:true}); } }
  document.addEventListener('dragover',ev=>{ if(A.ctx&&A.ctx.P.S.view==='rhalmoco') ev.preventDefault(); });
  document.addEventListener('drop',ev=>{ if(!A.ctx||A.ctx.P.S.view!=='rhalmoco') return; const f=ev.dataTransfer&&ev.dataTransfer.files&&ev.dataTransfer.files[0]; if(!f) return; ev.preventDefault(); importar(f); });
  document.head.insertAdjacentHTML('beforeend',`<style id="alm-css">
.alm-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.alm-kpi div{background:var(--surface-2,#f6f4ee);border-radius:12px;padding:10px 14px}.alm-kpi b{display:block;font-size:26px}.alm-kpi span{color:var(--muted);font-size:13px}
.alm-f{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.alm-dias{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px}.alm-dias button{min-width:54px;border:1.5px solid var(--line);background:var(--surface);border-radius:10px;padding:6px 4px;cursor:pointer;font:inherit;display:flex;flex-direction:column;align-items:center}
.alm-dias button[aria-pressed="true"]{border-color:var(--teal);background:var(--teal-wash,#e4eef3)}.alm-dias small{color:var(--muted);font-size:11px}.alm-dias b{font-size:17px}.alm-dias span{font-size:12px;color:var(--ok-ink,#2e6b4b)}
.alm-dt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}.alm-dt h3{margin:0;font-size:18px}
.alm-g{display:grid;grid-template-columns:1fr 1fr;gap:18px}.alm-l{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)}.alm-l small{display:block;color:var(--muted);font-size:12.5px}.alm-r{display:flex;gap:10px;align-items:center;text-align:right}.alm-r small{color:var(--muted)}
.alm-tw{overflow:auto;max-height:70vh;border:1px solid var(--line);border-radius:10px}.alm-t{border-collapse:collapse;font-size:13px;width:100%}.alm-t th,.alm-t td{border-bottom:1px solid var(--line);padding:5px 4px;text-align:center;white-space:nowrap}
.alm-t thead th{position:sticky;top:0;background:var(--surface);z-index:1}.alm-t th small{display:block;color:var(--muted);font-weight:400;font-size:10.5px}.alm-n{text-align:left!important;position:sticky;left:0;background:var(--surface);min-width:220px}.alm-n small{display:block;color:var(--muted);font-size:11.5px}
.alm-c{cursor:pointer;font-weight:800}.alm-c.sim{color:var(--ok-ink,#2e6b4b)}.alm-c.nao{color:var(--crit-ink,#a2453d);background:var(--crit-tint,#fbecea)}.alm-c.aj{box-shadow:inset 0 -3px 0 var(--warn)}.alm-c:hover{background:var(--teal-wash,#e4eef3)}
.alm-top{padding-bottom:18px}.alm-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.alm-mesnav{display:flex;align-items:center;gap:12px}.alm-mesnav h2{margin:2px 0 0;font-size:24px}.alm-mesnav .btn{width:42px;padding:0;font-size:20px}
.alm-reg{margin:10px 0 0;font-size:13.5px}.alm-reg details{margin-top:4px}.alm-reg summary{cursor:pointer;color:var(--teal-strong)}.alm-reg ol{margin:6px 0 0 18px;padding:0}
.alm-kpi div{display:flex;flex-direction:column;gap:2px}.alm-kpi span{font-size:13px;color:var(--muted);order:-1}.alm-kpi b{font-size:34px;color:var(--teal-strong);line-height:1.1}.alm-kpi small{color:var(--muted);font-size:12.5px}
.alm-dir{display:grid;grid-template-columns:1fr 1fr;gap:16px}.alm-dc{border:1px solid var(--line);border-radius:14px;padding:16px 18px;background:var(--surface)}.alm-dc h3{margin:0 0 10px;font-size:16px}.alm-wide{grid-column:1/-1}
.alm-dh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.alm-lg{font-size:12.5px;color:var(--muted);display:flex;gap:8px;align-items:center}.alm-lg i{display:inline-block;width:12px;height:12px;border-radius:3px}
.alm-hb{display:flex;flex-direction:column;gap:10px}.alm-hbr{display:grid;grid-template-columns:110px 1fr 120px;gap:10px;align-items:center;font-size:14px}.alm-hbr i{height:14px;background:var(--surface-2,#f1ede3);border-radius:7px;overflow:hidden}.alm-hbr i b{display:block;height:100%;background:#1B5C7A;border-radius:7px}.alm-hbr em{font-style:normal;font-weight:700}.alm-hbr small{font-weight:400;color:var(--muted)}
.alm-big{font-size:32px;font-weight:800;color:var(--teal-strong);margin-top:10px}.alm-obs{margin:0;padding-left:18px;line-height:1.7}
.alm-kpi{grid-template-columns:repeat(5,minmax(0,1fr))!important}.alm-kpi .alm-kw b{color:var(--warn-ink,#8a5a00)}
.alm-dias em{font-style:normal;font-size:11px;color:var(--warn-ink,#8a5a00);font-weight:700}.alm-dt .pill{margin-right:6px}
.alm-bl{margin-bottom:16px}.alm-bl .label b{color:var(--ink)}.alm-bl.fora summary{cursor:pointer}.alm-jt{display:block;font-size:12.5px;color:var(--teal-strong);margin-top:2px}.alm-jt small{color:var(--muted)}
.alm-jtipos{display:flex;flex-wrap:wrap;gap:8px}.alm-jtipos button{border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}.alm-jtipos button.on{border-color:var(--teal);background:var(--teal-wash,#e4eef3);font-weight:700}
.alm-fora{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--surface-2,#f6f4ee);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.alm-fora.on{background:var(--teal-wash,#e4eef3)}
.alm-pb{margin-left:auto;display:flex;gap:14px}.alm-pdh .alm-pb .lnk{margin-left:0}.alm-pd.just{border-left-color:var(--teal)}.alm-pd.fora{border-left-color:var(--line)}
.alm-c.just{color:var(--teal-strong);background:var(--teal-wash,#e4eef3)}.alm-c.fora{color:var(--muted);font-weight:400}
@media (max-width:1100px){.alm-kpi{grid-template-columns:repeat(3,minmax(0,1fr))!important}}@media (max-width:760px){.alm-kpi{grid-template-columns:1fr 1fr!important}}
.alm-nm{font-weight:700;font-size:inherit;color:inherit;text-align:left;padding:0;text-decoration:none}.alm-nm:hover{color:var(--teal-strong);text-decoration:underline}
.alm-pm{max-width:760px;width:100%;max-height:88vh;overflow:auto}.alm-pk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:4px}.alm-pk div{background:var(--surface-2,#f6f4ee);border-radius:10px;padding:8px 12px}.alm-pk b{display:block;font-size:22px;color:var(--teal-strong)}.alm-pk span{font-size:12.5px;color:var(--muted)}
.alm-pl{display:flex;flex-direction:column;gap:8px;margin-top:12px}.alm-pd{border:1px solid var(--line);border-left:5px solid var(--ok);border-radius:10px;padding:8px 12px}.alm-pd.nao{border-left-color:var(--warn)}
.alm-pdh{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.alm-pdh small{color:var(--muted)}.alm-pdh .lnk{margin-left:auto;font-size:13px}.alm-ph{font-size:13.5px}.alm-paj{font-size:12.5px;color:var(--warn-ink,#8a5a00);margin-top:4px}
.alm-pt{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.alm-pt span{font-size:12.5px;background:var(--surface-2,#f6f4ee);border-radius:8px;padding:3px 8px}.alm-pt span.r{background:var(--teal-wash,#e4eef3)}
@media (max-width:760px){.alm-kpi{grid-template-columns:1fr 1fr}.alm-g{grid-template-columns:1fr}.alm-dir{grid-template-columns:1fr}.alm-hbr{grid-template-columns:90px 1fr 90px}}
</style>`);
  window.RHAlmoco={render,iniciar:c=>{ A.ctx=c; },interpretar,_A:A};
})();
