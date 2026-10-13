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
  const A={mes:'',dados:{},aj:{},vis:'dia',dia:'',emp:'',q:'',lendo:false,ult:null,sub:{},ctx:null};
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
    for(const r of L.slice(1)){ const h=String(r[iH]||'').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}:\d{2})/); if(!h) continue;
      if(iAu>=0&&!/^AUTORIZADO$/.test(nrm(r[iAu]))) continue; const cpf=String(r[iC]||'').replace(/\D/g,''); if(!cpf) continue;
      const k=cpf.padStart(11,'0'), d=h[3]+'-'+h[2]+'-'+h[1], t=h[4].padStart(5,'0'), m=hm(t); lidos++; if(!de||d<de) de=d; if(!ate||d>ate) ate=d;
      const x=((out[d]=out[d]||{})[k]=out[d][k]||{p:1});
      if(nrm(r[iD])===dRef){ if(m>=ini&&m<=fim){ if(!x.a||t<x.a) x.a=t; } else if(m<cafe){ if(!x.c||t<x.c) x.c=t; } }
      pes[k]={n:titulo(r[iN]||''),e:iE>=0?String(r[iE]||'').trim():'',g:iG>=0?String(r[iG]||'').trim():''}; }
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
  function situacao(m,d,k){ const aj=((A.aj[m]||{}).aj||{})[d+'_'+k]; const x=(((A.dados[m]||{}).dias||{})[d]||{})[k];
    if(aj) return {v:aj.v==='sim'?'sim':'nao',aj,x}; if(!x) return {v:'aus',x:null}; return {v:x.a?'sim':'nao',x}; }
  function pessoasDoMes(m){ const c=A.ctx, D=A.dados[m]||{}, P0=D.pessoas||{}, fx={}; (c.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    const ks=new Set(Object.keys(P0)); Object.keys((A.aj[m]||{}).aj||{}).forEach(x=>ks.add(x.split('_')[1]));
    return [...ks].map(k=>{ const p=P0[k]||{}, f=fx[k]; return {k,nome:f?titulo(f.nome):(p.n||'(sem nome)'),emp:p.e||(f?(f.tipo==='PJ'?(f.empresa||'PJ'):'COLAFIX INDUSTRIA E COMERCIO LTDA'):''),setor:f?(f.setor||''):'',cad:!!f,grupo:p.g||''}; })
      .filter(p=>(!A.emp||(A.emp==='-'?!p.emp:p.emp===A.emp))&&(!A.q||nrm(p.nome).includes(nrm(A.q))))
      .sort((a,b)=>a.nome.localeCompare(b.nome)); }
  const empCurta=e=>!e?'Sem empresa':/COLAFIX/i.test(e)?'Colafix':titulo(e);

  /* ---------- tela ---------- */
  function render(c){ A.ctx=c; const P=c.P, esc=c.esc, h=P.hojeStr(); if(!A.mes) A.mes=h.slice(0,7); assinar(A.mes); assinar(mesAnt(A.mes));
    const D=A.dados[A.mes]; const ds=Object.keys((D&&D.dias)||{}).sort(); if(!A.dia||A.dia.slice(0,7)!==A.mes) A.dia=ds.length?ds[ds.length-1]:(A.mes===h.slice(0,7)?h:A.mes+'-01');
    const C=cfg(), ps=D?pessoasDoMes(A.mes):[], emps=[...new Set(Object.values((D&&D.pessoas)||{}).map(p=>p.e))].sort();
    const ultImp=D&&D.imp&&D.imp.length?D.imp[D.imp.length-1]:null, st=D&&ds.length?stats(A.mes):null;
    const topo=`<section class="card alm-top"><div class="alm-h"><div class="alm-mesnav"><button class="btn sec" data-act="alm-mes" data-v="-1" aria-label="Mês anterior">‹</button><div><div class="eyebrow">RH · REFEITÓRIO</div><h2>Almoço · ${esc(mesNome(A.mes))}</h2></div><button class="btn sec" data-act="alm-mes" data-v="1" aria-label="Próximo mês">›</button></div>
      <label class="btn" style="cursor:pointer">${A.lendo?'Lendo…':P.ic('baixar',18,2.2)+'Importar do Face ID'}<input type="file" accept=".csv,text/csv" id="alm-arq" hidden ${A.lendo?'disabled':''}></label></div>
      <div class="sub alm-reg">Almoçou quem passou no <b>${esc(C.disp)}</b> entre ${esc(C.ini)} e ${esc(C.fim)}. ${ultImp?'Dados de '+esc(c.br(ultImp.de))+' a '+esc(c.br(ultImp.ate))+' · importado por '+esc(ultImp.por||'')+' em '+esc(new Date(ultImp.em).toLocaleDateString('pt-BR')):'Ainda não há dados deste mês.'}
        <details><summary>Como exportar do Control iD</summary><ol><li>Relatórios → Acessos → <b>Acessos Gerais</b>.</li><li>Escolha as datas (pode ser o mês todo), Pessoas: Todos, e clique em Listar.</li><li>Exportar → <b>Exportar CSV</b> e arraste o arquivo aqui (ou toque em "Importar do Face ID").</li><li>Importar de novo o mesmo período só atualiza esses dias: não duplica.</li></ol></details></div>
      ${st?`<div class="alm-kpi"><div><span>Almoços no mês</span><b class="num">${st.tot.toLocaleString('pt-BR')}</b><small>${st.dExp} dias de expediente</small></div><div><span>Média por dia</span><b class="num">${st.media}</b><small>${st.ant?varTxt(st.media,st.ant.media)+' que '+mesNome(st.ant.mes).split(' ')[0]:'nos dias de expediente'}</small></div>
        <div><span>Adesão</span><b class="num">${st.ades}%</b><small>de quem estava na empresa almoçou</small></div><div><span>Pessoas que almoçaram</span><b class="num">${st.pessoas}</b><small>${st.semCad?st.semCad+' sem cadastro no RH':'todas no cadastro do RH'}</small></div></div>`:''}</section>`;
    if(!D||!ds.length&&!Object.keys((A.aj[A.mes]||{}).aj||{}).length) return topo+`<section class="card"><div class="empty" style="padding:24px;text-align:center">Nenhum dado do Face ID em ${esc(mesNome(A.mes))}. Importe o CSV do Control iD.</div></section>`;
    const abas=`<div class="seg" role="group"><button data-act="alm-vis" data-v="dia" aria-pressed="${A.vis==='dia'}">Por dia</button><button data-act="alm-vis" data-v="mes" aria-pressed="${A.vis==='mes'}">Fechamento do mês</button><button data-act="alm-vis" data-v="dir" aria-pressed="${A.vis==='dir'}">Diretoria</button></div>`;
    if(A.vis==='dir') return topo+`<section class="card"><div class="alm-f">${abas}<span style="flex:1"></span><button class="btn" data-act="alm-ppt" ${A.ppt?'disabled':''}>${P.ic('baixar',18,2.2)}${A.ppt?'Gerando…':'Baixar apresentação (PowerPoint)'}</button></div>${vDir(c,st)}</section>`;
    const filtros=`<div class="alm-f">${abas}
      <select class="txt" id="alm-emp" style="max-width:220px"><option value="">Todas as empresas</option>${emps.map(e=>`<option value="${esc(e||'-')}" ${A.emp===(e||'-')?'selected':''}>${esc(empCurta(e))}</option>`).join('')}</select>
      <input class="txt" id="alm-q" placeholder="Buscar nome" value="${esc(A.q)}" style="max-width:220px">
      ${A.vis==='mes'?`<span style="flex:1"></span><button class="btn sec rh-sm" data-act="alm-xls">${P.ic('baixar',16,2.2)}Excel</button><button class="btn sec rh-sm" data-act="alm-imp">Imprimir</button>`:''}</div>`;
    return topo+`<section class="card">${filtros}${A.vis==='dia'?vDia(c,ds,ps):vMes(c,ds,ps)}</section>`; }
  function mesAnt(m){ const [y,mm]=m.split('-').map(Number), d=new Date(y,mm-2,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  const varTxt=(a,b)=>{ if(!b) return ''; const v=Math.round((a-b)/b*100); return v===0?'igual':(v>0?'▲ '+v+'% a mais':'▼ '+(-v)+'% a menos'); };
  /* números do mês (sempre de todos, sem os filtros da tela) */
  function stats(m){ const D=A.dados[m]; if(!D) return null; const ds=Object.keys(D.dias||{}).sort(); if(!ds.length) return null; const ps=(()=>{ const q=A.q, e=A.emp; A.q=''; A.emp=''; const r=pessoasDoMes(m); A.q=q; A.emp=e; return r; })();
    const pd=ds.map(d=>{ let pres=0, alm=0, caf=0; ps.forEach(p=>{ const s=situacao(m,d,p.k); if(s.v!=='aus') pres++; if(s.v==='sim') alm++; if(s.x&&s.x.c) caf++; }); return {d,pres,alm,caf}; });
    const mx=Math.max(...pd.map(x=>x.pres)), lim=Math.max(5,mx*0.4), exp=pd.filter(x=>x.pres>=lim);
    const tot=pd.reduce((s,x)=>s+x.alm,0), media=exp.length?Math.round(exp.reduce((s,x)=>s+x.alm,0)/exp.length):0, ades=exp.length?Math.round(exp.reduce((s,x)=>s+x.alm,0)/Math.max(1,exp.reduce((s,x)=>s+x.pres,0))*100):0;
    const quem=ps.filter(p=>ds.some(d=>situacao(m,d,p.k).v==='sim')); const porEmp={}; quem.forEach(p=>{ const e=empCurta(p.emp); const x=(porEmp[e]=porEmp[e]||{e,alm:0,pessoas:0}); x.pessoas++; x.alm+=ds.filter(d=>situacao(m,d,p.k).v==='sim').length; });
    const SEM=['seg','ter','qua','qui','sex','sáb']; const porSem=SEM.map(w=>{ const xs=exp.filter(x=>semana(x.d)===w); return {w,m:xs.length?Math.round(xs.reduce((s,x)=>s+x.alm,0)/xs.length):0,n:xs.length}; }).filter(x=>x.n);
    const ajN=Object.keys((A.aj[m]||{}).aj||{}).length, C=cfg(), valor=+C.valor||0;
    const ant=m===mesAnt(m)?null:(A.dados[mesAnt(m)]&&Object.keys(A.dados[mesAnt(m)].dias||{}).length?statsBase(mesAnt(m)):null);
    const ult=D.imp&&D.imp.length?D.imp[D.imp.length-1]:null;
    return {m,pd,exp,dExp:exp.length,tot,media,ades,pessoas:quem.length,semCad:quem.filter(p=>!p.cad).length,porEmp:Object.values(porEmp).sort((a,b)=>b.alm-a.alm),porSem,ajN,valor,custo:valor?tot*valor:0,ant,
      cafe:pd.reduce((s,x)=>s+x.caf,0),de:ds[0],ate:ds[ds.length-1],ult}; }
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
      <div class="alm-dc"><h3>Observações</h3><ul class="alm-obs"><li>${st.cafe} passagens no refeitório antes das ${esc(cfg().cafeAte)} (café), fora da conta do almoço.</li><li>${st.ajN?st.ajN+' '+(st.ajN===1?'dia corrigido':'dias corrigidos')+' à mão pelo RH.':'Nenhuma correção à mão.'}</li><li>Fonte: Face ID (Control iD), ${esc(c.br(st.de))} a ${esc(c.br(st.ate))}.</li></ul></div></div>`; }
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
          st.semCad?st.semCad+' pessoas que almoçaram ainda não estão no cadastro do RH (prestadores e terceirizados).':'Todas as pessoas que almoçaram estão no cadastro do RH.','Período dos dados: '+c.br(st.de)+' a '+c.br(st.ate)+'.'];
        s.addText(ob.map(t=>({text:t,options:{bullet:true,breakLine:true}})),{x:0.8,y:1.6,w:11.5,h:4.5,fontFace:F,fontSize:20,color:INK,paraSpaceAfter:12,valign:'top'}); }
      await pp.writeFile({fileName:'Refeitorio-'+st.m+'.pptx'}); P.toast('Apresentação baixada.'); }
    catch(e){ console.warn('[almoço] ppt',e); P.toast('Não consegui gerar a apresentação: '+((e&&e.message)||e)); }
    finally{ A.ppt=false; P.rerender(); } }
  function vDia(c,ds,ps){ const esc=c.esc, m=A.mes, d=A.dia;
    const L=ps.map(p=>Object.assign({s:situacao(m,d,p.k)},p)), sim=L.filter(x=>x.s.v==='sim'), nao=L.filter(x=>x.s.v==='nao');
    const tira=`<div class="alm-dias">${ds.map(x=>{ const n=ps.filter(p=>situacao(m,x,p.k).v==='sim').length; return `<button data-act="alm-dia" data-v="${x}" aria-pressed="${x===d}"><small>${semana(x)}</small><b>${x.slice(8)}</b><span>${n}</span></button>`; }).join('')}</div>`;
    const lin=(x,bt)=>`<div class="alm-l"><div><b>${esc(x.nome)}</b><small>${esc([empCurta(x.emp),x.setor].filter(Boolean).join(' · '))}${x.cad?'':' · sem cadastro no RH'}</small></div>
      <div class="alm-r">${x.s.x&&x.s.x.a?`<span class="num">${esc(x.s.x.a)}</span>`:''}${x.s.x&&x.s.x.c?`<small>café ${esc(x.s.x.c)}</small>`:''}${x.s.aj?`<small title="${esc(x.s.aj.mot||'')}">ajustado por ${esc(x.s.aj.por||'')}</small>`:''}${bt}</div></div>`;
    return `${tira}<div class="alm-dt"><h3>${esc(c.br(d))} · ${semana(d)}</h3><span class="pill ok">${sim.length} almoçaram</span> <span class="pill warn">${nao.length} vieram e não almoçaram</span></div>
      <div class="alm-g"><div><div class="label">ALMOÇARAM</div>${sim.map(x=>lin(x,`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="nao">não almoçou</button>`)).join('')||'<div class="sub">Ninguém.</div>'}</div>
        <div><div class="label">VIERAM E NÃO PASSARAM NO REFEITÓRIO</div>${nao.map(x=>lin(x,`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="sim">almoçou</button>`)).join('')||'<div class="sub">Ninguém.</div>'}</div></div>`; }
  function grade(ds,ps){ return ps.map(p=>{ const v=ds.map(d=>situacao(A.mes,d,p.k)); return {p,v,tot:v.filter(x=>x.v==='sim').length,pres:v.filter(x=>x.v!=='aus').length}; }); }
  function vMes(c,ds,ps){ const esc=c.esc, G=grade(ds,ps);
    const porEmp={}; G.forEach(g=>{ const e=empCurta(g.p.emp); porEmp[e]=(porEmp[e]||0)+g.tot; });
    return `<div class="sub" style="margin:4px 0 10px">✓ almoçou · ✗ veio e não passou no refeitório · em branco: não veio. Clique num dia para corrigir. Totais: ${Object.entries(porEmp).map(([e,n])=>`<b>${esc(e)}</b> ${n}`).join(' · ')}</div>
      <div class="alm-tw"><table class="alm-t"><thead><tr><th class="alm-n">Pessoa</th>${ds.map(d=>`<th><small>${semana(d)}</small>${d.slice(8)}</th>`).join('')}<th>Almoços</th><th>Dias na empresa</th></tr></thead>
      <tbody>${G.map(g=>`<tr><td class="alm-n"><b>${esc(g.p.nome)}</b><small>${esc(empCurta(g.p.emp))}${g.p.setor?' · '+esc(g.p.setor):''}</small></td>${g.v.map((s,i)=>`<td class="alm-c ${s.v}${s.aj?' aj':''}" data-act="alm-cel" data-k="${g.p.k}" data-d="${ds[i]}" title="${s.aj?'Ajustado: '+esc(s.aj.mot||''):s.x&&s.x.a?'Refeitório '+esc(s.x.a):''}">${s.v==='sim'?'✓':s.v==='nao'?'✗':''}</td>`).join('')}<td class="num"><b>${g.tot}</b></td><td class="num">${g.pres}</td></tr>`).join('')}</tbody></table></div>`; }
  async function ajustar(k,d,v){ const c=A.ctx, P=c.P, m=d.slice(0,7); const mot=prompt(v==='sim'?'Motivo (ex.: almoçou sem passar o rosto):':'Motivo (ex.: passou no refeitório mas não almoçou):'); if(mot===null) return;
    const ref=P.db().doc('rh/dados/almocoaj/'+m); const cur=A.aj[m]||{mes:m,aj:{},log:[]}; const it={v,mot:String(mot).trim().slice(0,120),por:c.eu(),em:new Date().toISOString()};
    const aj=Object.assign({},cur.aj||{}); aj[d+'_'+k]=it; const log=(cur.log||[]).concat([Object.assign({chave:d+'_'+k},it)]).slice(-500);
    try{ await ref.set({mes:m,aj,log}); P.toast('Ajuste guardado.'); }catch(e){ P.erro(e); } }
  async function excel(){ const c=A.ctx, D=A.dados[A.mes]; const ds=Object.keys(D.dias||{}).sort(), G=grade(ds,pessoasDoMes(A.mes));
    const cab=['Nome','CPF','Empresa','Setor'].concat(ds.map(d=>d.slice(8)+'/'+d.slice(5,7)),['Almoços','Dias na empresa']);
    const L=[cab].concat(G.map(g=>[g.p.nome,c.fCPF(g.p.k),empCurta(g.p.emp),g.p.setor].concat(g.v.map(s=>s.v==='sim'?1:s.v==='nao'?0:''),[g.tot,g.pres])));
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
    if(a==='alm-cel'){ const s=situacao(A.mes,b.dataset.d,b.dataset.k); ajustar(b.dataset.k,b.dataset.d,s.v==='sim'?'nao':'sim'); return; }
    if(a==='alm-xls'){ excel().catch(e=>P.erro(e)); return; }
    if(a==='alm-imp'){ imprimir(); return; }
    if(a==='alm-ppt'){ gerarPpt(); return; }
    if(a==='alm-valor'){ const v=parseFloat(String((document.getElementById('alm-valor')||{}).value||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
      P.db().doc('rh/config').set({almoco:Object.assign({},(A.ctx.R.cfg&&A.ctx.R.cfg.almoco)||{},{valor:v})},{merge:true}).then(()=>{ if(A.ctx.R.cfg){ A.ctx.R.cfg.almoco=Object.assign({},A.ctx.R.cfg.almoco||{},{valor:v}); } P.toast(v?'Valor da refeição guardado.':'Valor apagado.'); P.rerender(); }).catch(e=>P.erro(e)); return; } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!A.ctx) return;
    if(t.id==='alm-arq'&&t.files&&t.files[0]){ importar(t.files[0]); t.value=''; }
    if(t.id==='alm-emp'){ A.emp=t.value; A.ctx.P.rerender(); } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='alm-q'&&A.ctx){ A.q=t.value; clearTimeout(A._qt); A._qt=setTimeout(()=>{ A.ctx.P.rerender(); setTimeout(()=>{ const i=document.getElementById('alm-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },0); },300); } });
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
@media (max-width:760px){.alm-kpi{grid-template-columns:1fr 1fr}.alm-g{grid-template-columns:1fr}.alm-dir{grid-template-columns:1fr}.alm-hbr{grid-template-columns:90px 1fr 90px}}
</style>`);
  window.RHAlmoco={render,iniciar:c=>{ A.ctx=c; },interpretar,_A:A};
})();
