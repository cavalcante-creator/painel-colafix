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
  /* robô do Face ID (robo-faceid.js, num computador da fábrica): status em rh/dados/robo/faceid */
  function roboTxt(c){ if(!A.roboSub){ A.roboSub=true; try{ c.P.db().doc('rh/dados/robo/faceid').onSnapshot(g=>{ A.robo=g.exists?g.data():null; c.P.rerender(); },()=>{}); }catch(e){} }
    const R=A.robo; if(!R||!R.ultima) return ''; const min=(Date.now()-new Date(R.ultima).getTime())/60000, h=new Date(R.ultima).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), dia=new Date(R.ultima).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const fora=Object.entries(R.dispositivos||{}).filter(([,x])=>x&&!x.ok).map(([n])=>n);
    if(min>130) return `<span class="alm-robo crit">Robô do Face ID parado: última leitura ${dia} às ${h}. Confira o computador do robô (ou importe o CSV à mão).</span> `;
    if(!R.ok) return `<span class="alm-robo warn">Robô do Face ID: leitura às ${h} com problema${fora.length?' — fora do ar: '+c.esc(fora.join(', ')):R.erro?' — '+c.esc(String(R.erro).slice(0,80)):''}.</span> `;
    return `<span class="alm-robo ok">✓ Face ID automático: última leitura às ${h}${R.passagens!=null?' ('+R.passagens+' passagens)':''}.</span> `; }
  try{ document.head.insertAdjacentHTML('beforeend','<style id="alm-robo-css">.alm-robo{display:inline-block;font-size:13px;font-weight:600;padding:2px 8px;border-radius:999px;margin-right:4px}.alm-robo.ok{background:var(--ok-tint);color:var(--ok-ink)}.alm-robo.warn{background:var(--warn-tint);color:var(--warn-ink)}.alm-robo.crit{background:var(--crit-tint);color:var(--crit-ink)}</style>'); }catch(e){}
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
  /* reimportar JUNTA as passagens com as que já estavam no dia (um arquivo parcial não apaga o almoço já lido) e refaz almoço/café */
  function juntaDia(antes,novo){ if(!antes) return novo; const C=cfg(), dRef=nrm(C.disp), ini=hm(C.ini), fim=hm(C.fim), cafe=hm(C.cafeAte), out={};
    new Set(Object.keys(antes).concat(Object.keys(novo))).forEach(k=>{ const a=antes[k]||{}, b=novo[k]||{}, t=[...new Set((a.t||[]).concat(b.t||[]))].sort(); const x={p:1};
      if(t.length){ x.t=t; t.forEach(z=>{ const mm=z.match(/^(\d{2}:\d{2})(:\d{2})?\s+(.*)$/); if(!mm) return; const hh=mm[1], mi=hm(hh); if(nrm(mm[3])===dRef){ if(mi>=ini&&mi<=fim){ if(!x.a||hh<x.a) x.a=hh; } else if(mi<cafe){ if(!x.c||hh<x.c) x.c=hh; } } }); }
      else { if(a.a||b.a) x.a=[a.a,b.a].filter(Boolean).sort()[0]; if(a.c||b.c) x.c=[a.c,b.c].filter(Boolean).sort()[0]; }
      out[k]=x; }); return out; }
  /* aviso quando os acessos do dia param antes do almoço (arquivo exportado pela metade, ou o robô gravou só uma parte) */
  function avisoParcial(c,m,d){ const D=((A.dados[m]||{}).dias||{})[d]; if(!D||d>=hojeStr0()) return ''; let ult='', n=0, alm=0;
    Object.values(D).forEach(x=>{ n++; if(x.a) alm++; (x.t||[]).forEach(z=>{ const h=String(z).slice(0,5); if(h>ult) ult=h; }); });
    if(!n||alm||!ult||hm(ult)>=hm(cfg().ini)) return '';
    const imp=((A.dados[m]||{}).imp||[]).filter(i=>i.de<=d&&i.ate>=d).slice(-1)[0];
    return `<div class="alm-parc" role="alert"><b>Os acessos de ${c.esc(c.br(d))} só vão até ${c.esc(ult)}.</b> Por isso ninguém aparece como almoçou: faltou o resto do dia${imp?` (última leitura: ${c.esc(imp.auto?'robô do Face ID':(imp.arq||'arquivo'))}${imp.por&&!imp.auto?' por '+c.esc(imp.por):''} em ${c.esc(new Date(imp.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))})`:''}. No iDSecure, exporte o relatório "Acessos Gerais" do dia inteiro (00:00 a 23:59) e importe de novo — as passagens se juntam, nada se perde.</div>`; }
  /* refeitório sem leitura: o leitor do REFEITÓRIO não registrou o almoço do dia (parou, travou) — ninguém fica "sem justificativa" */
  function semLeit(d){ const x=(cfg().semLeitura||{})[d]; return x&&!x.removido?x:null; }
  function avisoSemRef(c,m,d){ const D=((A.dados[m]||{}).dias||{})[d], sl=semLeit(d); if(!D) return '';
    if(sl) return `<div class="alm-sref ok"><b>Dia marcado: refeitório sem leitura.</b> Quem veio e não tem almoço no Face ID aparece como justificado ("Refeitório sem leitura")${sl.por?' · marcado por '+c.esc(sl.por):''}. Confira pela folha de assinatura e corrija quem não almoçou. <button class="lnk" data-act="alm-semleit" data-v="0" data-d="${d}">Desfazer</button></div>`;
    if(d>=hojeStr0()) return ''; const xs=Object.values(D), n=xs.length, alm=xs.filter(x=>x.a).length; if(n<5||alm>Math.max(1,n*0.1)) return '';
    const ref=xs.reduce((a,x)=>a+(x.t||[]).filter(z=>nrm(String(z).replace(/^\S+\s+/,''))===nrm(cfg().disp)).length,0);
    let ult=''; xs.forEach(x=>(x.t||[]).forEach(z=>{ if(nrm(String(z).replace(/^\S+\s+/,''))===nrm(cfg().disp)){ const h=String(z).slice(0,5); if(h>ult) ult=h; } }));
    return `<div class="alm-sref" role="alert"><b>O refeitório não registrou o almoço de ${c.esc(c.br(d))}.</b> ${n} pessoas passaram na empresa, mas o leitor do ${c.esc(cfg().disp)} ${ref?'só tem passagens até '+c.esc(ult)+' (café)':'não tem nenhuma passagem'} e nenhuma no horário do almoço. O Face ID do refeitório provavelmente parou nesse dia — o arquivo está certo, a leitura é que não aconteceu.
      <div class="alm-sref-b"><button class="btn rh-sm" data-act="alm-semleit" data-v="1" data-d="${d}">Marcar o dia: refeitório sem leitura</button><span>ninguém fica sem justificativa nem com desconto; depois corrija pela folha de assinatura</span></div></div>`; }
  function hojeStr0(){ const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); }
  async function importar(file){ const c=A.ctx, P=c.P; A.lendo=true; P.rerender();
    try{ const buf=await file.arrayBuffer(); let txt=new TextDecoder('utf-8',{fatal:false}).decode(buf); if(/�/.test(txt)) txt=new TextDecoder('iso-8859-1').decode(buf);
      const I=interpretar(txt); const porMes={}; Object.keys(I.dias).forEach(d=>{ (porMes[d.slice(0,7)]=porMes[d.slice(0,7)]||[]).push(d); });
      let nd=0; for(const m of Object.keys(porMes)){ const ref=P.db().doc('rh/dados/almoco/'+m), g=await ref.get(), cur=g.exists?g.data():{mes:m,dias:{},pessoas:{},imp:[]};
        const dias=Object.assign({},cur.dias||{}); porMes[m].forEach(d=>{ dias[d]=juntaDia(dias[d],I.dias[d]); nd++; });
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
  /* o almoço do dia ainda não terminou? (hoje, antes do fim da janela do refeitório) */
  function almEmCurso(d){ const n=new Date(), h=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); if(d!==h) return false; return n.getHours()*60+n.getMinutes()<=hm(cfg().fim||'14:30'); }
  /* atestado/falta registrado pelo RH (modulos/rh-atestados.js, 30/10) */
  const atDe=(p,d)=>{ try{ return window.RHAtest?RHAtest.cobre(p,d):null; }catch(e){ return null; } };
  function situacao(m,d,k){ const aj=((A.aj[m]||{}).aj||{})[d+'_'+k]; const x=(((A.dados[m]||{}).dias||{})[d]||{})[k];
    let r; if(aj&&aj.v==='just') r={v:'just',j:aj,x}; else if(aj&&!aj.removido) r={v:aj.v==='sim'?'sim':'nao',aj,x}; else if(!x) r={v:'aus',x:null}; else r={v:x.a?'sim':'nao',x};
    if(r.v==='nao'&&foraDe(k)) r.v='fora';
    if(r.v==='nao'&&!r.aj&&almEmCurso(d)) r.v='pend'; /* almoço ainda não terminou hoje */
    if(r.v==='nao'&&!r.aj){ const sl=semLeit(d); if(sl) r={v:'just',x:r.x,sl:true,j:{tipo:'Refeitório sem leitura',mot:sl.mot||'O Face ID do refeitório não registrou o almoço neste dia',por:sl.por||''}}; }
    if(r.v==='nao'&&!r.aj){ const at=atDe({cpf:k},d); if(at) r={v:'just',x:r.x,at,j:{tipo:window.RHAtest?RHAtest.TIPO(at.tipo)[1]:'Atestado',mot:(window.RHAtest?RHAtest.durTxt(at):'')+(at.mot?' · '+at.mot:''),por:at.por||''}}; }
    if(r.v==='nao'){ const au=ausDe(k,d); if(au) r={v:'just',x:r.x,aj:r.aj,aus:au,j:{tipo:'Ausência programada',mot:ausTxt(au)+(au.mot?' · '+au.mot:''),por:au.por||''}}; }
    return r; }
  /* ---------- ausência no almoço (programada): um dia ou regra por dia da semana (rh/config.almoco.ausencias) ---------- */
  const SEMN=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  const ausAtivas=()=>(cfg().ausencias||[]).filter(a=>a&&!a.removido);
  function ausVale(a,d){ if(a.tipo==='dia') return a.data===d; if(a.de&&d<a.de) return false; if(a.ate&&d>a.ate) return false; return (a.dias||[]).includes(new Date(d+'T12:00').getDay()); }
  function ausDe(k,d){ return ausAtivas().find(a=>a.cpf===k&&ausVale(a,d))||null; }
  function ausTxt(a){ const br=x=>x?x.slice(8)+'/'+x.slice(5,7)+'/'+x.slice(0,4):''; if(a.tipo==='dia') return 'Só no dia '+br(a.data);
    const ds=(a.dias||[]).slice().sort().map(i=>SEMN[i]); const t=ds.length>1?ds.slice(0,-1).join(', ')+' e '+ds[ds.length-1]:ds[0]||'';
    return 'Toda '+t+(a.de?' · desde '+br(a.de):'')+(a.ate?' · até '+br(a.ate):''); }
  function pessoasDoMes(m){ const c=A.ctx, D=A.dados[m]||{}, P0=D.pessoas||{}, fx={}; (c.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    const ks=new Set(Object.keys(P0)); Object.keys((A.aj[m]||{}).aj||{}).forEach(x=>ks.add(x.split('_')[1]));
    return [...ks].map(k=>{ const p=P0[k]||{}, f=fx[k]; return {k,nome:f?titulo(f.nome):(p.n||'(sem nome)'),emp:p.e||(f?(f.tipo==='PJ'?(f.empresa||'PJ'):'COLAFIX INDUSTRIA E COMERCIO LTDA'):''),setor:f?(f.setor||''):'',cad:!!f,grupo:p.g||''}; })
      .filter(p=>(!A.emp||(A.emp==='-'?!p.emp:p.emp===A.emp))&&(!A.setor||(A.setor==='-'?!p.setor:p.setor===A.setor))) /* a busca por nome filtra na própria tela (almBusca), sem redesenhar */
      .sort((a,b)=>a.nome.localeCompare(b.nome)); }
  const empCurta=e=>!e?'Sem empresa':/COLAFIX/i.test(e)?'Colafix':titulo(e);

  /* ---------- tela ---------- */
  function render(c){ A.ctx=c; const P=c.P, esc=c.esc, h=P.hojeStr(); if(!A.mes) A.mes=h.slice(0,7); assinar(A.mes); assinar(mesAnt(A.mes));
    if(c.fixo) A.vis=c.fixo; else if(A.vis==='pont'||A.vis==='dir') A.vis='dia'; /* 30/10: Pontualidade e Diretoria são telas próprias */
    const D=A.dados[A.mes]; const ds=Object.keys((D&&D.dias)||{}).sort(); if(!A.dia||A.dia.slice(0,7)!==A.mes) A.dia=ds.length?ds[ds.length-1]:(A.mes===h.slice(0,7)?h:A.mes+'-01');
    const C=cfg(), ps=D?pessoasDoMes(A.mes):[], setores=[...new Set((c.R.func||[]).map(f=>f.setor).filter(Boolean))].sort(), emps=[...new Set(Object.values((D&&D.pessoas)||{}).map(p=>p.e))].sort();
    const ultImp=D&&D.imp&&D.imp.length?D.imp[D.imp.length-1]:null, st=D&&ds.length?stats(A.mes):null;
    const topo=`<section class="card alm-top"><div class="alm-h"><div class="alm-mesnav"><button class="btn sec" data-act="alm-mes" data-v="-1" aria-label="Mês anterior">‹</button><div><div class="eyebrow">${c.fixo?'RH · RELATÓRIOS':'RH · AUSÊNCIAS'}</div><h2>${c.fixo==='pont'?'Pontualidade':c.fixo==='dir'?'Almoço · diretoria':'Almoço'} · ${esc(mesNome(A.mes))}</h2></div><button class="btn sec" data-act="alm-mes" data-v="1" aria-label="Próximo mês">›</button></div>
      <label class="btn" style="cursor:pointer">${A.lendo?'Lendo…':P.ic('baixar',18,2.2)+'Importar do Face ID'}<input type="file" accept=".csv,text/csv" id="alm-arq" hidden ${A.lendo?'disabled':''}></label></div>
      <div class="sub alm-reg">Almoçou quem passou no <b>${esc(C.disp)}</b> entre ${esc(C.ini)} e ${esc(C.fim)}. ${roboTxt(c)}${ultImp?'Dados de '+esc(c.br(ultImp.de))+' a '+esc(c.br(ultImp.ate))+' · importado por '+esc(ultImp.por||'')+' em '+esc(new Date(ultImp.em).toLocaleDateString('pt-BR')):'Ainda não há dados deste mês.'}
        <details><summary>Como exportar do Control iD</summary><ol><li>Relatórios → Acessos → <b>Acessos Gerais</b>.</li><li>Escolha as datas (pode ser o mês todo), Pessoas: Todos, e clique em Listar.</li><li>Exportar → <b>Exportar CSV</b> e arraste o arquivo aqui (ou toque em "Importar do Face ID").</li><li>Importar de novo o mesmo período só atualiza esses dias: não duplica.</li></ol></details></div>
      ${st&&A.vis!=='dia'?`<div class="alm-kpi"><div><span>Almoços no mês</span><b class="num">${st.tot.toLocaleString('pt-BR')}</b><small>${st.dExp} dias de expediente</small></div><div><span>Média por dia</span><b class="num">${st.media}</b><small>${st.ant?varTxt(st.media,st.ant.media)+' que '+mesNome(st.ant.mes).split(' ')[0]:'nos dias de expediente'}</small></div>
        <div><span>Adesão</span><b class="num">${st.ades}%</b><small>de quem estava na empresa almoçou</small></div><div><span>Pessoas que almoçaram</span><b class="num">${st.pessoas}</b><small>${st.semCad?st.semCad+' sem cadastro no RH':'todas no cadastro do RH'}</small></div><div class="${st.semJust?'alm-kw':''}"><span>Faltas sem justificativa</span><b class="num">${st.semJust}</b><small>vezes que alguém veio e não almoçou · ${st.just} justificadas · ${st.fora} não almoçam aqui</small></div></div>`:''}</section>`;
    if(!D||!ds.length&&!Object.keys((A.aj[A.mes]||{}).aj||{}).length) return topo+`<section class="card"><div class="empty"><b>Nenhum dado do Face ID em ${esc(mesNome(A.mes))}</b><span>Importe o CSV "Acessos Gerais" do Control iD (o robô do Face ID também manda sozinho, quando está ligado). As ausências no almoço já podem ser programadas.</span><span class="rh-vzb"><button class="btn sec" data-act="alm-aus">${P.ic('mais',16,2.4)}Ausência no almoço</button><label class="btn" for="alm-arq" style="cursor:pointer">${P.ic('baixar',16,2.2)}Importar do Face ID</label></span></div></section>`+vAus(c);
    const abas=c.fixo?'':`<div class="seg" role="group"><button data-act="alm-vis" data-v="dia" aria-pressed="${A.vis==='dia'}">Por dia</button><button data-act="alm-vis" data-v="mes" aria-pressed="${A.vis==='mes'}">Fechamento do mês</button></div>`; /* 30/10: Pontualidade e Diretoria viraram telas próprias (Relatórios) */
    if(A.vis==='pont') return topo+`<section class="card"><div class="alm-f">${abas}</div><div class="alm-f alm-f2">
      <select class="txt" id="alm-emp" style="max-width:220px"><option value="">Todas as empresas</option>${emps.map(e=>`<option value="${esc(e||'-')}" ${A.emp===(e||'-')?'selected':''}>${esc(empCurta(e))}</option>`).join('')}</select>
      ${setores.length?`<select class="txt" id="alm-setor" style="max-width:200px"><option value="">Todos os setores</option>${setores.map(x=>`<option value="${esc(x)}" ${A.setor===x?'selected':''}>${esc(x)}</option>`).join('')}<option value="-" ${A.setor==='-'?'selected':''}>Sem setor</option></select>`:''}
      <input class="txt" id="alm-q" type="search" autocomplete="off" placeholder="Buscar nome, setor ou CPF" value="${esc(A.q)}" style="max-width:260px"><span class="sub" id="alm-qn"></span></div>${vPont(c)}</section>`+vPessoa(c,ds);
    if(A.vis==='dir') return topo+`<section class="card"><div class="alm-f">${abas}<span style="flex:1"></span><button class="btn sec" data-act="alm-pdf" ${A.pdf?'disabled':''}>${P.ic('baixar',18,2.2)}${A.pdf?'Gerando…':'Relatório em PDF'}</button><button class="btn" data-act="alm-ppt" ${A.ppt?'disabled':''}>${P.ic('baixar',18,2.2)}${A.ppt?'Gerando…':'Baixar apresentação (PowerPoint)'}</button></div>${vDir(c,st)}</section>`;
    const filtros=`<div class="alm-f alm-f1">${abas}<span style="flex:1"></span><button class="btn sec rh-sm" data-act="alm-aus">${P.ic('mais',16,2.4)}Ausência no almoço</button>${A.vis==='mes'?`<button class="btn sec rh-sm" data-act="alm-xls">Excel</button><button class="btn rh-sm" data-act="alm-mpdf">Baixar PDF</button><button class="lnk" data-act="alm-imp">Imprimir a grade</button>`:''}</div>
      <div class="alm-f alm-f2">
      <select class="txt" id="alm-emp" style="max-width:220px"><option value="">Todas as empresas</option>${emps.map(e=>`<option value="${esc(e||'-')}" ${A.emp===(e||'-')?'selected':''}>${esc(empCurta(e))}</option>`).join('')}</select>
      ${setores.length?`<select class="txt" id="alm-setor" style="max-width:200px"><option value="">Todos os setores</option>${setores.map(x=>`<option value="${esc(x)}" ${A.setor===x?'selected':''}>${esc(x)}</option>`).join('')}<option value="-" ${A.setor==='-'?'selected':''}>Sem setor</option></select>`:''}
      <select class="txt" id="alm-sit" style="max-width:240px">${[['','Todas as situações'],['sim','Almoçou'],['nao','Sem almoço e sem justificativa'],['just','Justificado'],['fora','Não almoça na empresa']].map(([v,t])=>`<option value="${v}" ${A.sit===v?'selected':''}>${t}</option>`).join('')}</select>
      <input class="txt" id="alm-q" type="search" autocomplete="off" placeholder="Buscar nome, setor ou CPF" value="${esc(A.q)}" style="max-width:260px"><span class="sub" id="alm-qn"></span></div>`;
    if(A.vis==='dia') return topo+`<section class="card alm-v2f">${filtros}</section>`+vDia(c,ds,ps,st)+vPessoa(c,ds)+vJust(c)+vAus(c);
    return topo+`<section class="card">${filtros}${vMes(c,ds,ps)}</section>`+vPessoa(c,ds)+vJust(c)+vAus(c); }
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
    return {m,pd,exp,dExp:exp.length,tot,media,ades,pessoas:quem.length,semCad:quem.filter(p=>!p.cad).length,porEmp:Object.values(porEmp).sort((a,b)=>b.alm-a.alm),porSem,ajN,valor,custo:valor?tot*valor:0,vdesc:+cfg().valorDesc||0,descontos:(+cfg().valorDesc||0)*pd.reduce((s,x)=>s+x.sj,0),ant,
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
      <div class="alm-dc"><h3>Custo e descontos</h3><div class="alm-vals"><label class="sub">Valor da refeição (custo) <input class="txt num" id="alm-valor" inputmode="decimal" placeholder="R$ 0,00" value="${st.valor?String(st.valor).replace('.',','):''}"></label>
        <label class="sub">Desconto por falta não justificada <input class="txt num" id="alm-vdesc" inputmode="decimal" placeholder="R$ 0,00" value="${st.vdesc?String(st.vdesc).replace('.',','):''}"></label><button class="btn sec rh-sm" data-act="alm-valor">Salvar</button></div>
        ${st.valor?`<div class="alm-cl">Custo do mês</div><div class="alm-big num">${R$(st.custo)}</div><div class="sub">${st.tot} almoços × ${R$(st.valor)}${st.ant&&st.ant.tot?' · mês anterior: '+R$(st.ant.tot*st.valor):''}</div>`:'<div class="sub" style="margin-top:8px">Informe o valor da refeição para ver o custo do mês (fica guardado para os próximos meses).</div>'}
        ${st.vdesc?`<div class="alm-cl" style="margin-top:10px">Descontos do mês</div><div class="alm-big num" style="font-size:24px">${R$(st.descontos)}</div><div class="sub">${st.semJust} falta${st.semJust===1?'':'s'} sem justificativa × ${R$(st.vdesc)}</div>`:'<div class="sub" style="margin-top:8px">Informe o desconto por falta não justificada para calcular o desconto de cada pessoa.</div>'}</div>
      <div class="alm-dc"><h3>Observações</h3><ul class="alm-obs"><li>${st.cafe} passagens no refeitório antes das ${esc(cfg().cafeAte)} (café), fora da conta do almoço.</li><li>${st.ajN?st.ajN+' '+(st.ajN===1?'dia corrigido':'dias corrigidos')+' à mão pelo RH.':'Nenhuma correção à mão.'}</li><li>${st.semJust} dias sem almoço e sem justificativa · ${st.just} justificados · ${st.fora} ${st.fora===1?'pessoa não almoça':'pessoas não almoçam'} na empresa.</li><li>Fonte: Face ID (Control iD), ${esc(c.br(st.de))} a ${esc(c.br(st.ate))}.</li></ul></div></div>`; }
  /* ---------- relatório em PDF para a diretoria (A4, 2 páginas) ---------- */
  async function gerarPdf(){ const c=A.ctx, P=c.P, st=stats(A.mes); if(!st) return; A.pdf=true; P.rerender();
    try{ if(!window.jspdf) await c.carregarJs('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      if(!P.pdf) throw new Error('o painel ainda está carregando, tente de novo');
      const img=await P.pdf.imgs(), C=P.pdf.cor, C2=cfg(), R$=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}), br=c.br;
      const D=P.pdf.novo('Almoço · '+mesNome(st.m),'Refeitório pelo Face ID · dados de '+br(st.de)+' a '+br(st.ate),img), doc=D.doc, M=D.M;
      D.capa();
      /* números */
      const pc=st.ades, corA=pc>=85?'ok':pc>=70?'warn':'crit';
      D.kpis([{t:'Almoços no mês',v:st.tot.toLocaleString('pt-BR'),s:st.dExp+' dias de expediente',c:'pet'},
        {t:'Média por dia',v:String(st.media),s:st.ant?varTxt(st.media,st.ant.media).replace(/[▲▼]\s?/g,'')+' que '+mesNome(st.ant.mes).split(' ')[0]:'nos dias de expediente',c:'pet'},
        {t:'Adesão',v:pc+'%',s:'de quem estava na empresa',c:corA},
        st.valor?{t:'Custo do mês',v:R$(st.custo),s:st.tot+' almoços × '+R$(st.valor),c:'teal'}:{t:'Custo do mês',v:'—',s:'sem valor da refeição',c:'cinza'},
        {t:'Sem justificativa',v:String(st.semJust),s:st.semJust?(st.vdesc?'desconto '+R$(st.descontos):'veio e não almoçou'):'nenhuma falta',c:st.semJust?'crit':'ok'},
        {t:'Justificados',v:String(st.just),s:'médico, saiu cedo, ausência…',c:'cinza'},
        {t:'Não almoçam aqui',v:String(st.fora),s:'fora da conta da adesão',c:'cinza'},
        {t:'Pessoas que almoçaram',v:String(st.pessoas),s:st.semCad?st.semCad+' sem cadastro no RH':'todas no cadastro',c:'cinza'}],4);
      /* almoços por dia */
      D.secao('Almoços por dia','barra cinza = na empresa · azul = almoçaram');
      { const h=46; D.cabe(h+16); const top=D.y+3, base=top+h, n=st.pd.length, mx=Math.max(10,...st.pd.map(x=>x.pres)), topo=Math.ceil(mx/10)*10, gw=D.cw/Math.max(1,n), bw=Math.min(9,gw*.7), yy=v=>base-h*v/topo;
        D.dc(C.lin); doc.setLineWidth(.2); [0,.5,1].forEach(f=>{ const v=Math.round(topo*f); doc.line(M,yy(v),M+D.cw,yy(v)); });
        st.pd.forEach((x,i)=>{ const cx=M+gw*i+gw/2, X=cx-bw/2; D.fc(C.cinza); doc.rect(X,yy(x.pres),bw,base-yy(x.pres),'F'); D.fc(x.sj?C.pet:C.pet); doc.rect(X+bw*.15,yy(x.alm),bw*.7,base-yy(x.alm),'F');
          doc.setFont('helvetica','bold'); doc.setFontSize(6.6); D.tc(C.ink); if(x.alm) doc.text(String(x.alm),cx,yy(x.pres)-1.3,{align:'center'});
          doc.setFont('helvetica','normal'); doc.setFontSize(6.6); D.tc(C.mut); doc.text(x.d.slice(8),cx,base+3.6,{align:'center'}); doc.setFontSize(5.6); doc.text(semana(x.d),cx,base+6.6,{align:'center'});
          if(x.sj){ doc.setFont('helvetica','bold'); doc.setFontSize(6); D.tc(C.crit); doc.text(String(x.sj),cx,base+9.8,{align:'center'}); } });
        D.y=base+16; D.legenda([['Na empresa',C.cinza],['Almoçaram',C.pet],['Número vermelho: sem justificativa no dia',C.crit]]); }
      /* por empresa e por dia da semana */
      D.secao('Por empresa');
      D.hbar(st.porEmp.slice(0,6).map(z=>({l:z.e+' · '+z.pessoas+' pessoa'+(z.pessoas===1?'':'s'),v:z.alm,txt:z.alm.toLocaleString('pt-BR')})),{lw:46});
      if(st.porSem.length) D.texto('Média de almoços por dia da semana:  '+st.porSem.map(z=>z.w+' '+z.m).join('   ·   '),{c:'ink'});
      /* quem mais faltou */
      const ds=Object.keys(A.dados[st.m].dias||{}).sort(); const G=(()=>{ const q=A.q,e=A.emp,se=A.setor,si=A.sit; A.q='';A.emp='';A.setor='';A.sit=''; try{ return grade(ds,pessoasDoMes(st.m)); } finally{ A.q=q;A.emp=e;A.setor=se;A.sit=si; } })()
        .filter(g=>g.pres||g.tot).sort((a,b)=>a.p.nome.localeCompare(b.p.nome,'pt-BR'));
      const nomeT=n=>titulo(n);
      const top=G.filter(g=>g.sj).sort((a,b)=>b.sj-a.sj||a.p.nome.localeCompare(b.p.nome,'pt-BR')).slice(0,10);
      D.secao('Quem mais veio e não almoçou (sem justificativa)',top.length?'os '+top.length+' com mais dias':'');
      if(top.length) D.tabela([{t:'Nome',w:70},{t:'Empresa',w:28},{t:'Setor',w:30},{t:'Dias',w:14,al:'r'}].concat(st.vdesc?[{t:'Desconto',w:22,al:'r'}]:[]),
        top.map(g=>[nomeT(g.p.nome),empCurta(g.p.emp),g.p.setor||'—',String(g.sj)].concat(st.vdesc?[R$(g.sj*st.vdesc)]:[])));
      else D.vazio('Ninguém veio e ficou sem almoçar sem justificativa neste mês.');
      /* observações */
      D.secao('Como foi contado');
      ['Almoçou = passagem "Autorizado" no leitor do '+(C2.disp||'REFEITÓRIO')+' entre '+C2.ini+' e '+C2.fim+'. Quem estava na empresa e não passou lá conta como "sem almoço".',
       'Dias de expediente = dias com pelo menos 40% do maior número de pessoas na empresa no mês (sábado, domingo e feriado com pouca gente ficam fora da média e da adesão).',
       st.vdesc?'Desconto = dias na empresa sem almoço e sem justificativa × '+R$(st.vdesc)+'.':'Valor do desconto não informado (RH › Cadastros › Configurações).',
       st.cafe+' passagens no refeitório antes das '+C2.cafeAte+' (café da manhã) não entram na conta do almoço.',
       st.ajN?st.ajN+' '+(st.ajN===1?'dia foi corrigido':'dias foram corrigidos')+' à mão pelo RH.':'Nenhuma correção à mão no mês.',
       st.semCad?st.semCad+' pessoas que almoçaram não estão no cadastro do RH (prestadores e terceirizados).':''].filter(Boolean).forEach(t=>D.texto('•  '+t));
      /* por pessoa */
      D.nova(); D.secao('Almoços por pessoa'+(st.vdesc?' e desconto':''),'em ordem alfabética · '+G.length+' pessoas');
      const sj=G.reduce((a,g)=>a+g.sj,0);
      D.tabela([{t:'Nome',w:58},{t:'Empresa',w:22},{t:'Setor',w:26},{t:'Na empresa',w:17,al:'r'},{t:'Almoços',w:15,al:'r'},{t:'Sem just.',w:15,al:'r'},{t:'Justif.',w:13,al:'r'}].concat(st.vdesc?[{t:'Desconto',w:20,al:'r'}]:[]),
        G.map(g=>Object.assign([nomeT(g.p.nome),empCurta(g.p.emp),g.p.setor||'—',String(g.pres),String(g.tot),g.sj?String(g.sj):'—',g.jj?String(g.jj):'—'].concat(st.vdesc?[g.sj?R$(g.sj*st.vdesc):'—']:[]),{_cor:g.sj?{5:'crit',7:'crit'}:null}))
        .concat([Object.assign(['Total',G.length+' pessoas','','',String(G.reduce((a,g)=>a+g.tot,0)),String(sj),String(G.reduce((a,g)=>a+g.jj,0))].concat(st.vdesc?[R$(sj*st.vdesc)]:[]),{_tot:1})]));
      /* conferência */
      D.cabe(26); D.y+=8; D.dc(C.mut); doc.setLineWidth(.3); const lw=(D.cw-16)/2; doc.line(M,D.y,M+lw,D.y); doc.line(M+lw+16,D.y,M+D.cw,D.y);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); D.tc(C.mut); doc.text('Conferido por (RH)',M,D.y+4.5); doc.text('Data',M+lw+16,D.y+4.5);
      doc.setProperties({title:'Almoço '+mesNome(st.m)}); D.fim('Almoco-'+st.m+'.pdf'); P.toast('Relatório em PDF baixado.'); }
    catch(e){ console.warn('[almoço] pdf',e); P.toast('Não consegui gerar o PDF: '+((e&&e.message)||e)); }
    finally{ A.pdf=false; P.rerender(); } }
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
          st.valor?['Custo do mês',st.custo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),st.tot+' × '+st.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+(st.vdesc?' · descontos '+st.descontos.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'')]:['Pessoas que almoçaram',String(st.pessoas),'']];
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
  function vDia(c,ds,ps,st){ const esc=c.esc, m=A.mes, d=A.dia;
    const L=ps.map(p=>Object.assign({s:situacao(m,d,p.k)},p)), g=v=>L.filter(x=>x.s.v===v), sim=g('sim'), nao=g('nao'), jus=g('just'), fora=g('fora'), pend=g('pend'), emCurso=almEmCurso(d);
    const tira=`<div class="alm-dias">${ds.map(x=>{ const ss=ps.map(p=>situacao(m,x,p.k).v), n=ss.filter(v=>v==='sim').length, sj=ss.filter(v=>v==='nao').length; return `<button data-act="alm-dia" data-v="${x}" aria-pressed="${x===d}" title="${n} almoçaram · ${sj} sem justificativa"><small>${semana(x)}</small><b>${x.slice(8)}</b><span>${n}</span>${sj?`<em>${sj}</em>`:''}</button>`; }).join('')}</div>`;
    const info=x=>[empCurta(x.emp),x.setor].filter(Boolean).join(' · ')+(x.cad?'':' · sem cadastro no RH');
    const lin=(x,extra,bt)=>`<div class="alm-l" data-b="${esc(almChave(x))}"><div><button class="lnk alm-nm" data-act="alm-pes" data-k="${x.k}">${esc(x.nome)}</button><small>${esc(info(x))}</small>${extra||''}</div>
      <div class="alm-r">${x.s.x&&x.s.x.a?`<span class="num">${esc(x.s.x.a)}</span>`:''}${x.s.x&&x.s.x.c?`<small>café ${esc(x.s.x.c)}</small>`:''}${x.s.aj?`<small title="${esc(x.s.aj.mot||'')}">corrigido por ${esc(x.s.aj.por||'')}</small>`:''}${bt}</div></div>`;
    const jtx=x=>`<span class="alm-jt">${esc(x.s.j.tipo||'Justificado')}${x.s.j.mot?' · '+esc(x.s.j.mot):''}<small> · ${esc(x.s.j.por||'')}</small></span>`;
    const bloco=(cls,tit,xs,mk,vazio)=>!A.sit||A.sit===cls?`<div class="alm-bl ${cls}"><div class="label">${tit} <b>(${xs.length})</b></div>${xs.map(mk).join('')||`<div class="sub">${vazio}</div>`}</div>`:'';
    const blPend=pend.length?bloco('pend','AINDA NÃO ALMOÇARAM · ALMOÇO ATÉ '+esc(cfg().fim||'14:30'),pend,x=>lin(x,'',`<button class="lnk" data-act="alm-jus" data-k="${x.k}" data-d="${d}">justificar</button>`),''):'';
    const blSim=bloco('sim','ALMOÇARAM',sim,x=>lin(x,'',`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="nao">não almoçou</button>`),'Ninguém.');
    const blNao=bloco('nao','NÃO ALMOÇARAM · SEM JUSTIFICATIVA',nao,x=>lin(x,'',`<button class="btn sec rh-sm" data-act="alm-jus" data-k="${x.k}" data-d="${d}">Justificar</button><button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="sim">almoçou</button>`),'Ninguém. Tudo justificado.'), blJus=bloco('just','JUSTIFICADOS',jus,x=>lin(x,jtx(x),`<button class="lnk" data-act="alm-jus" data-k="${x.k}" data-d="${d}">alterar</button>`),'Nenhuma justificativa neste dia.'), blMais=(!A.sit||A.sit==='fora'?`<details class="alm-bl fora" ${A.sit==='fora'?'open':''}><summary class="label">NÃO ALMOÇAM NA EMPRESA <b>(${fora.length})</b></summary>${fora.map(x=>lin(x,`<span class="alm-jt">${esc(foraDe(x.k).mot||'Não almoça na empresa')}</span>`,'')).join('')||'<div class="sub">Ninguém marcado. Para marcar, clique no nome da pessoa.</div>'}</details>`:'')
      +(!A.sit?`<details class="alm-bl aus"><summary class="label">AUSÊNCIAS PROGRAMADAS <b>(${ausAtivas().length})</b></summary>${ausLista(c,null)}</details>`:'');
    /* RH revisado (opção 2): o dia em destaque — tira dos dias, números do dia e três colunas */
    const pres=L.filter(x=>x.s.v!=='aus'&&x.s.v!=='fora').length, pc=pres?Math.round(sim.length/pres*100):0, R$=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const kpi=`<div class="alm-v2k"><div><span>Almoçaram${emCurso?' até agora':''}</span><b class="num">${sim.length} <small>de ${pres}</small></b><i class="alm-v2b"><em style="width:${pc}%"></em></i></div>
      <div class="${nao.length?'w':''}"><span>Sem justificativa</span><b class="num">${nao.length}</b><small>${emCurso?pend.length+' ainda não almoçaram · até '+esc(cfg().fim||'14:30'):nao.length?'vão para o desconto':'tudo certo neste dia'}</small></div>
      <div><span>Justificados</span><b class="num">${jus.length}</b><small>${jus.length?esc([...new Set(jus.map(x=>(x.s.j&&x.s.j.tipo)||'Justificado'))].slice(0,3).join(' · ')):'nenhum'}${fora.length?' · '+fora.length+' não almoçam aqui':''}</small></div>
      <div><span>Almoços no mês</span><b class="num">${st?st.tot.toLocaleString('pt-BR'):0}</b><small>${st&&st.valor?'custo '+R$(st.custo)+(st.vdesc?' · descontos '+R$(st.descontos):''):'informe o valor da refeição em Cadastros › Configurações'}</small></div></div>`;
    const blSim2=!A.sit||A.sit==='sim'?`<div class="alm-bl sim alm-v2s"><div class="label">ALMOÇARAM <b>(${sim.length})</b></div>${sim.map(x=>lin(x,'',`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="nao">não almoçou</button>`)).join('')||'<div class="sub">Ninguém.</div>'}</div>`:'';
    const col1=(pend.length?blPend:'')+(pend.length?(nao.length?blNao:''):blNao)+blJus;
    return `${tira}${avisoParcial(c,m,d)}${avisoSemRef(c,m,d)}<div class="alm-dt"><h3>${esc(c.br(d))} · ${semana(d)}</h3><span class="pill ok">${sim.length} almoçaram${emCurso?' até agora':''}</span>${emCurso?`<span class="pill">${pend.length} ainda não almoçaram · almoço até ${esc(cfg().fim||'14:30')}</span>`:''}${nao.length||!emCurso?`<span class="pill warn">${nao.length} sem justificativa</span>`:''}${jus.length?`<span class="pill">${jus.length} justificados</span>`:''}${fora.length?`<span class="pill">${fora.length} não almoçam aqui</span>`:''}</div>${kpi}
      ${emCurso?`<div class="alm-emcurso">Almoço em andamento: quem ainda não passou no refeitório só vira “sem justificativa” depois das ${esc(cfg().fim||'14:30')}.</div>`:''}
      <div class="alm-v2g"><div class="alm-v2c">${col1}</div><div class="alm-v2c">${blSim2}</div><div class="alm-v2c alm-v2r">${folhaPainel(c,d)}${blMais.replace('<details class="alm-bl aus">','<details class="alm-bl aus" open>')}</div></div>`; }
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
  function nomeDe(k){ const f=(A.ctx.R.func||[]).find(x=>String(x.cpf||'').replace(/\D/g,'').padStart(11,'0')===k); if(f) return titulo(f.nome);
    for(const m of Object.keys(A.dados)){ const p=((A.dados[m]||{}).pessoas||{})[k]; if(p&&p.n) return titulo(p.n); } return ''; }
  function ausLista(c,k){ const esc=c.esc, L=ausAtivas().filter(a=>!k||a.cpf===k).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
    return L.map(a=>`<div class="alm-l"><div>${k?'':`<button class="lnk alm-nm" data-act="alm-pes" data-k="${a.cpf}">${esc(a.nome||nomeDe(a.cpf)||'(sem nome)')}</button>`}<span class="alm-jt">${esc(ausTxt(a))}${a.mot?' · '+esc(a.mot):''}<small> · ${esc(a.por||'')}</small></span></div><div class="alm-r"><button class="lnk" data-act="alm-ausrem" data-id="${esc(a.id)}" style="color:var(--crit-ink)">tirar</button></div></div>`).join('')
      ||'<div class="sub">Nenhuma ausência programada. Use o botão "Ausência no almoço".</div>'; }
  function opcoesPessoas(){ const mp={}; Object.keys(A.dados).forEach(m=>Object.entries(((A.dados[m]||{}).pessoas)||{}).forEach(([k,p])=>{ mp[k]=mp[k]||titulo(p.n||''); }));
    (A.ctx.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k.length>=10&&f.status!=='desligado') mp[k.padStart(11,'0')]=titulo(f.nome); });
    return Object.entries(mp).filter(([,n])=>n).sort((a,b)=>a[1].localeCompare(b[1])); }
  function vAus(c){ const U=A.aus; if(!U) return ''; const esc=c.esc, ops=U.fixo?[]:opcoesPessoas(), d1=[1,2,3,4,5,6];
    return `<div class="rh-modal" data-act="alm-ausx-fundo"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Ausência no almoço" style="max-width:540px"><div class="rh-ch"><h2>Ausência no almoço</h2><button class="lnk" data-act="alm-ausx">Fechar</button></div>
      <div class="sub" style="margin:-4px 0 10px">Nos dias marcados a pessoa não aparece como falta: fica como <b>justificada</b> (se almoçar mesmo assim, conta o almoço).</div>
      <label style="display:block"><span class="label">Pessoa</span>${U.fixo?`<div><b>${esc(nomeDe(U.k)||'(sem nome)')}</b></div>`:`<select class="txt" id="alm-auk"><option value="">Escolha…</option>${ops.map(([k,n])=>`<option value="${k}" ${U.k===k?'selected':''}>${esc(n)}</option>`).join('')}</select>`}</label>
      <div class="seg" role="group" style="margin-top:12px"><button data-act="alm-austipo" data-v="dia" aria-pressed="${U.tipo==='dia'}">Só um dia</button><button data-act="alm-austipo" data-v="regra" aria-pressed="${U.tipo==='regra'}">Toda semana</button></div>
      ${U.tipo==='dia'?`<label style="display:block;margin-top:12px"><span class="label">Dia</span><input class="txt" type="date" id="alm-aud" value="${esc(U.data||'')}"></label>`
        :`<div style="margin-top:12px"><span class="label">Em quais dias da semana não almoça</span><div class="alm-jtipos">${d1.map(i=>`<button class="${(U.dias||[]).includes(i)?'on':''}" data-act="alm-ausdia" data-v="${i}">${SEMN[i]}</button>`).join('')}</div></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><label><span class="label">Desde</span><input class="txt" type="date" id="alm-aude" value="${esc(U.de||'')}"></label><label><span class="label">Até (opcional)</span><input class="txt" type="date" id="alm-auate" value="${esc(U.ate||'')}"></label></div>`}
      <label style="display:block;margin-top:12px"><span class="label">Motivo (opcional)</span><input class="txt" id="alm-aumot" maxlength="120" value="${esc(U.mot||'')}" placeholder="ex.: faculdade às terças, acordo com o supervisor"></label>
      ${U.erro?`<p class="err" style="color:var(--crit-ink)">${esc(U.erro)}</p>`:''}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px"><button class="btn sec" data-act="alm-ausx">Cancelar</button><button class="btn" data-act="alm-aussalvar">Salvar</button></div></div></div>`; }
  function lerAus(){ const U=A.aus, v=id=>{ const e=document.getElementById(id); return e?String(e.value||'').trim():null; };
    const k=v('alm-auk'); if(k!==null) U.k=k; const d=v('alm-aud'); if(d!==null) U.data=d; const de=v('alm-aude'); if(de!==null) U.de=de; const at=v('alm-auate'); if(at!==null) U.ate=at; const mt=v('alm-aumot'); if(mt!==null) U.mot=mt; }
  async function gravaAus(lista){ const c=A.ctx, P=c.P, al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}); al.ausencias=lista.slice(-300);
    await P.db().doc('rh/config').set({almoco:al},{merge:true}); if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; }
  async function salvarAus(){ const c=A.ctx, P=c.P, U=A.aus; lerAus(); U.erro='';
    if(!U.k) U.erro='Escolha a pessoa.'; else if(U.tipo==='dia'&&!/^\d{4}-\d\d-\d\d$/.test(U.data||'')) U.erro='Escolha o dia.';
    else if(U.tipo==='regra'&&!(U.dias||[]).length) U.erro='Marque pelo menos um dia da semana.'; else if(U.tipo==='regra'&&U.ate&&U.de&&U.ate<U.de) U.erro='O "até" está antes do "desde".';
    if(U.erro){ P.rerender(); return; }
    const it={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),cpf:U.k,nome:nomeDe(U.k),tipo:U.tipo,mot:String(U.mot||'').slice(0,120),por:c.eu(),em:new Date().toISOString()};
    if(U.tipo==='dia') it.data=U.data; else { it.dias=U.dias.slice().sort(); it.de=U.de||''; it.ate=U.ate||''; }
    try{ await gravaAus((cfg().ausencias||[]).concat([it])); A.aus=null; P.toast('Ausência guardada: '+ausTxt(it)+'.'); P.rerender(); }catch(e){ P.erro(e); } }
  async function tirarAus(id){ const c=A.ctx, P=c.P; if(!confirm('Tirar esta ausência programada? Os dias voltam a contar como falta se não almoçar.')) return;
    const L=(cfg().ausencias||[]).map(a=>a.id===id?Object.assign({},a,{removido:true,remPor:c.eu(),remEm:new Date().toISOString()}):a);
    try{ await gravaAus(L); P.toast('Ausência retirada.'); P.rerender(); }catch(e){ P.erro(e); } }
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
      <div class="alm-fora"><span class="sub">Não almoça em alguns dias (ex.: toda terça) ou num dia só?</span> <button class="btn sec rh-sm" data-act="alm-aus" data-k="${k}">Programar ausência</button>${ausAtivas().some(a=>a.cpf===k)?`<div style="flex-basis:100%">${ausLista(c,k)}</div>`:''}</div>
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
  /* ---------- relatórios no padrão (30/10): os filtros da tela (empresa, setor, situação e busca) valem no PDF e no Excel ---------- */
  function qOk(p){ const ws=nrm(A.q).split(/\s+/).filter(Boolean), dq=String(A.q||'').replace(/\D/g,''), b=almChave(p); return !ws.length||ws.every(w=>b.includes(w))||(dq.length>=3&&b.slice(-11).includes(dq)); }
  const SIT_NOME={sim:'Almoçou',nao:'Sem almoço e sem justificativa',just:'Justificado',fora:'Não almoça na empresa'};
  const almFiltros=()=>[A.emp&&'Empresa: '+(A.emp==='-'?'sem empresa':empCurta(A.emp)),A.setor&&'Setor: '+(A.setor==='-'?'sem setor':A.setor),A.sit&&'Situação: '+(SIT_NOME[A.sit]||A.sit),A.q&&'Busca: '+A.q].filter(Boolean);
  async function mesPdf(){ const c=A.ctx, P=c.P, D=A.dados[A.mes]; if(!D) return; const ds=Object.keys(D.dias||{}).sort(), G=grade(ds,pessoasDoMes(A.mes)).filter(g=>qOk(g.p)), vd=+cfg().valorDesc||0, R$=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const s=k=>G.reduce((a,g)=>a+g[k],0); if(!window.RHRel) return P.toast('O gerador de relatórios ainda não carregou.');
    try{ await RHRel.pdf({tit:'Almoço · fechamento de '+mesNome(A.mes),sub:'Refeitório pelo Face ID · '+(ds.length?c.br(ds[0])+' a '+c.br(ds[ds.length-1]):'sem dados'),filtros:almFiltros(),arq:'Almoco-fechamento-'+A.mes,
      kpis:[{t:'Pessoas',v:String(G.length),s:'na lista',c:'pet'},{t:'Almoços',v:s('tot').toLocaleString('pt-BR'),s:ds.length+' dias com Face ID',c:'teal'},{t:'Sem justificativa',v:String(s('sj')),s:vd?'desconto '+R$(s('sj')*vd):'veio e não almoçou',c:s('sj')?'crit':'ok'},{t:'Justificados',v:String(s('jj')),s:'médico, saiu cedo, ausência…',c:'cinza'}],
      partes:[{secao:'Por pessoa',nota:'dias na empresa = dias com passagem no Face ID',cols:[{t:'Nome',w:52},{t:'Empresa',w:24},{t:'Setor',w:24},{t:'Na empresa',w:16,al:'r'},{t:'Almoços',w:15,al:'r'},{t:'Sem just.',w:15,al:'r'},{t:'Justif.',w:13,al:'r'}].concat(vd?[{t:'Desconto',w:20,al:'r'}]:[]),
        rows:G.map(g=>{ const r=[g.p.nome,empCurta(g.p.emp),g.p.setor||'—',String(g.pres),String(g.tot),String(g.sj),String(g.jj)].concat(vd?[g.sj?R$(g.sj*vd):'—']:[]); if(g.sj) r._cor={5:'crit'}; return r; })
          .concat(G.length?[Object.assign(['Total','','',String(s('pres')),String(s('tot')),String(s('sj')),String(s('jj'))].concat(vd?[R$(s('sj')*vd)]:[]),{_tot:1})]:[]),vazio:'Ninguém com estes filtros.'}],assina:'Conferido por (RH)'}); }catch(e){ P.toast(String(e&&e.message||e)); } }
  async function excel(){ const c=A.ctx, D=A.dados[A.mes]; const ds=Object.keys(D.dias||{}).sort(), G=grade(ds,pessoasDoMes(A.mes)).filter(g=>qOk(g.p));
    const cab=['Nome','CPF','Empresa','Setor'].concat(ds.map(d=>d.slice(8)+'/'+d.slice(5,7)),['Almoços','Sem justificativa','Justificados','Dias na empresa'].concat(+cfg().valorDesc?['Desconto (R$)']:[]));
    const L=[cab].concat(G.map(g=>[g.p.nome,c.fCPF(g.p.k),empCurta(g.p.emp),g.p.setor].concat(g.v.map(s=>s.v==='sim'?1:s.v==='nao'?0:s.v==='just'?'J':s.v==='fora'?'F':''),[g.tot,g.sj,g.jj,g.pres].concat(+cfg().valorDesc?[Math.round(g.sj*(+cfg().valorDesc)*100)/100]:[]))));
    if(window.RHRel) return RHRel.xls('Almoco-'+A.mes,[['Almoço '+A.mes,L]],{tit:'Almoço · '+mesNome(A.mes),sub:'1 = almoçou · 0 = sem almoço e sem justificativa · J = justificado · F = não almoça na empresa',filtros:almFiltros()});
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
    if(a==='alm-semleit'){ const d=b.dataset.d, on=b.dataset.v==='1', c=A.ctx, al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}), sl=Object.assign({},al.semLeitura||{});
      if(on) sl[d]={por:c.eu(),em:new Date().toISOString(),mot:'O Face ID do refeitório não registrou o almoço neste dia'}; else if(sl[d]) sl[d]=Object.assign({},sl[d],{removido:true,removidoPor:c.eu(),removidoEm:new Date().toISOString()});
      al.semLeitura=sl; P.db().doc('rh/config').set({almoco:al},{merge:true}).then(()=>{ if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; P.toast(on?'Dia marcado como refeitório sem leitura.':'Marcação desfeita.'); P.rerender(); }).catch(e=>{ console.warn('[almoço] sem leitura',e); P.toast('Não foi possível salvar.'); }); return; }
    if(a==='alm-aj'){ ajustar(b.dataset.k,A.dia,b.dataset.v); return; }
    if(a==='alm-cel'){ const s=situacao(A.mes,b.dataset.d,b.dataset.k); if(s.v==='nao'||s.v==='just'){ A.jus={k:b.dataset.k,d:b.dataset.d}; P.rerender(); return; } if(s.v==='aus'&&!s.aj) return; ajustar(b.dataset.k,b.dataset.d,s.v==='sim'?'nao':'sim'); return; }
    if(a==='alm-xls'){ excel().catch(e=>P.erro(e)); return; }
    if(a==='alm-imp'){ imprimir(); return; }
    if(a==='alm-mpdf'){ mesPdf(); return; }
    if(a==='alm-jus'){ A.jus={k:b.dataset.k,d:b.dataset.d}; P.rerender(); setTimeout(()=>{ const i=document.getElementById('alm-jmot'); if(i&&A.jus.tipo) i.focus(); },50); return; }
    if(a==='alm-jusx'||(a==='alm-jusx-fundo'&&ev.target===b)){ A.jus=null; P.rerender(); return; }
    if(a==='alm-jtipo'){ A.jus.tipo=b.dataset.v; A.jus.mot=(document.getElementById('alm-jmot')||{}).value||A.jus.mot; A.jus.erro=''; P.rerender(); return; }
    if(a==='alm-jsalvar'||a==='alm-jrem'){ const J=A.jus; J.mot=String((document.getElementById('alm-jmot')||{}).value||'').trim();
      if(a==='alm-jsalvar'){ if(!J.tipo){ J.erro='Escolha o tipo da justificativa.'; P.rerender(); return; } if(J.tipo==='Outro'&&J.mot.length<3){ J.erro='Escreva o motivo.'; P.rerender(); return; } }
      gravaAj(J.k,J.d,a==='alm-jsalvar'?{v:'just',tipo:J.tipo,mot:J.mot.slice(0,120),por:A.ctx.eu(),em:new Date().toISOString()}:null).then(()=>{ A.jus=null; P.toast(a==='alm-jsalvar'?'Justificativa guardada.':'Justificativa retirada.'); P.rerender(); }).catch(e=>P.erro(e)); return; }
    if(a==='alm-fora'){ marcarFora(b.dataset.k,b.dataset.v==='1'); return; }
    if(a==='alm-pes'){ A.pes=b.dataset.k; A.aus=null; P.rerender(); return; }
    if(a==='alm-aus'){ const h=P.hojeStr(), k=b.dataset.k||''; A.aus={k,fixo:!!k,tipo:'dia',data:h,dias:[],de:h,ate:'',mot:''}; P.rerender(); return; }
    if(a==='alm-ausx'||(a==='alm-ausx-fundo'&&ev.target===b)){ A.aus=null; P.rerender(); return; }
    if(a==='alm-austipo'){ lerAus(); A.aus.tipo=b.dataset.v; A.aus.erro=''; P.rerender(); return; }
    if(a==='alm-ausdia'){ lerAus(); const i=+b.dataset.v, L=A.aus.dias||[]; A.aus.dias=L.includes(i)?L.filter(x=>x!==i):L.concat([i]); A.aus.erro=''; P.rerender(); return; }
    if(a==='alm-aussalvar'){ salvarAus(); return; }
    if(a==='alm-ausrem'){ tirarAus(b.dataset.id); return; }
    if(a==='alm-pesx'||(a==='alm-pesx-fundo'&&ev.target===b)){ A.pes=null; P.rerender(); return; }
    if(a==='alm-aj2'){ ajustar(b.dataset.k,b.dataset.d,b.dataset.v); return; }
    if(a==='alm-ppt'){ gerarPpt(); return; }
    if(a==='alm-pdf'){ gerarPdf(); return; }
    if(a==='alm-valor'){ const lv=id=>parseFloat(String((document.getElementById(id)||{}).value||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))||0; const v=lv('alm-valor'), vd=lv('alm-vdesc'), up={valor:v,valorDesc:vd};
      P.db().doc('rh/config').set({almoco:Object.assign({},(A.ctx.R.cfg&&A.ctx.R.cfg.almoco)||{},up)},{merge:true}).then(()=>{ if(A.ctx.R.cfg){ A.ctx.R.cfg.almoco=Object.assign({},A.ctx.R.cfg.almoco||{},up); } P.toast('Valores guardados: refeição '+(v?v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—')+' · desconto por falta '+(vd?vd.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—')+'.'); P.rerender(); }).catch(e=>P.erro(e)); return; } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(A.aus&&t&&/^alm-au/.test(t.id||'')) lerAus(); });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!A.ctx) return;
    if(A.aus&&/^alm-au/.test(t.id||'')){ lerAus(); return; }
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
.alm-c{cursor:pointer;font-weight:700}.alm-c.sim{color:var(--ok-ink,#2e6b4b)}.alm-c.nao{color:var(--crit-ink,#a2453d);background:var(--crit-tint,#fbecea)}.alm-c.aj{box-shadow:inset 0 -3px 0 var(--warn)}.alm-c:hover{background:var(--teal-wash,#e4eef3)}
.alm-top{padding-bottom:18px}.alm-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.alm-mesnav{display:flex;align-items:center;gap:12px}.alm-mesnav h2{margin:2px 0 0;font-size:24px}.alm-mesnav .btn{width:42px;padding:0;font-size:20px}
.alm-reg{margin:10px 0 0;font-size:13.5px}.alm-reg details{margin-top:4px}.alm-reg summary{cursor:pointer;color:var(--teal-strong)}.alm-reg ol{margin:6px 0 0 18px;padding:0}
.alm-kpi div{display:flex;flex-direction:column;gap:2px}.alm-kpi span{font-size:13px;color:var(--muted);order:-1}.alm-kpi b{font-size:34px;color:var(--teal-strong);line-height:1.1}.alm-kpi small{color:var(--muted);font-size:12.5px}
.alm-dir{display:grid;grid-template-columns:1fr 1fr;gap:16px}.alm-dc{border:1px solid var(--line);border-radius:14px;padding:16px 18px;background:var(--surface)}.alm-dc h3{margin:0 0 10px;font-size:16px}.alm-wide{grid-column:1/-1}
.alm-dh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.alm-lg{font-size:12.5px;color:var(--muted);display:flex;gap:8px;align-items:center}.alm-lg i{display:inline-block;width:12px;height:12px;border-radius:3px}
.alm-hb{display:flex;flex-direction:column;gap:10px}.alm-hbr{display:grid;grid-template-columns:110px 1fr 120px;gap:10px;align-items:center;font-size:14px}.alm-hbr i{height:14px;background:var(--surface-2,#f1ede3);border-radius:7px;overflow:hidden}.alm-hbr i b{display:block;height:100%;background:#1B5C7A;border-radius:7px}.alm-hbr em{font-style:normal;font-weight:700}.alm-hbr small{font-weight:400;color:var(--muted)}
.alm-big{font-size:32px;font-weight:700;color:var(--teal-strong);margin-top:10px}.alm-obs{margin:0;padding-left:18px;line-height:1.7}
.alm-kpi{grid-template-columns:repeat(5,minmax(0,1fr))!important}.alm-kpi .alm-kw b{color:var(--warn-ink,#8a5a00)}
.alm-dias em{font-style:normal;font-size:11px;color:var(--warn-ink,#8a5a00);font-weight:700}.alm-dt .pill{margin-right:6px}
.alm-f2{padding-top:12px;border-top:1px solid var(--line)}
.alm-v2f{padding:12px 16px}.alm-v2f .alm-f1{margin:0}.alm-v2f .alm-f2{margin:10px 0 0}
.alm-v2k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0 0 16px}.alm-v2k>div{background:var(--surface);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;box-shadow:var(--shadow)}
.alm-v2k span{font-size:13px;color:var(--muted)}.alm-v2k b{font-size:28px;font-weight:600}.alm-v2k b small{font-size:15px;color:var(--muted);font-weight:500}.alm-v2k>div>small{font-size:12.5px;color:var(--muted)}.alm-v2k .w b{color:var(--crit-ink)}
.alm-v2b{display:block;height:8px;border-radius:4px;background:var(--sunken);overflow:hidden;margin-top:4px}.alm-v2b em{display:block;height:100%;background:var(--ok)}
.alm-v2g{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(300px,.9fr);gap:16px;align-items:start}.alm-v2c{display:flex;flex-direction:column;gap:16px;min-width:0}
.alm-v2c .alm-bl{margin:0}.alm-v2s .alm-l{padding-top:5px;padding-bottom:5px}.alm-bl.sim.alm-v2s{display:block;margin:0;max-height:70vh;overflow:auto}.alm-v2r .alm-fp,.alm-v2r>section{margin:0}
@media (max-width:1250px){ .alm-v2g{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .alm-v2r{grid-column:1/-1} }
@media (max-width:760px){ .alm-v2g{grid-template-columns:minmax(0,1fr)} .alm-v2k{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px} .alm-v2k b{font-size:24px} }
.alm-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
.alm-bl{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--surface)}.alm-bl>.label,.alm-bl>summary{margin-bottom:4px}
.alm-bl.nao{border-color:var(--warn);background:var(--warn-tint,#fbf3e2)}.alm-bl.just{background:var(--teal-wash,#eef4f7);border-color:transparent}
.alm-bl.sim{margin:16px 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:22px}.alm-bl.sim>.label,.alm-bl.sim>.sub{grid-column:1/-1}
.alm-mais .alm-bl{background:var(--surface-2,#f6f4ee);border-color:transparent}.alm-mais summary{cursor:pointer}
.alm-bl .alm-l{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.alm-bl .alm-l>div:first-child{min-width:0}.alm-bl .alm-l .alm-nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.alm-r{flex-wrap:wrap;justify-content:flex-end}.alm-bl.nao .alm-l:last-child,.alm-bl.just .alm-l:last-child{border-bottom:0}
@media (hover:hover){.alm-bl.sim .alm-r .lnk{opacity:0;transition:opacity .15s}.alm-bl.sim .alm-l:hover .alm-r .lnk,.alm-bl.sim .alm-r .lnk:focus{opacity:1}}
.alm-bl.sim .alm-r{gap:8px;flex-wrap:nowrap}.alm-bl.sim .alm-r small{display:none}.alm-bl.sim .alm-r .lnk{font-size:12.5px}.alm-bl.sim .alm-l{padding:6px 0}.alm-bl.sim .alm-l small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:1200px){.alm-bl.sim{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){.alm-g2{grid-template-columns:minmax(0,1fr)}.alm-bl.sim{grid-template-columns:minmax(0,1fr)}.alm-f1 .seg{width:100%}.alm-bl.nao .alm-l,.alm-bl.just .alm-l{grid-template-columns:minmax(0,1fr)}.alm-bl.nao .alm-r,.alm-bl.just .alm-r{justify-content:flex-start}.alm-bl .alm-r small{display:none}.alm-bl .alm-l .alm-nm{white-space:normal}.alm-f2>*{flex:1 1 100%;max-width:none!important}}.alm-bl .label b{color:var(--ink)}.alm-bl.fora summary{cursor:pointer}.alm-jt{display:block;font-size:12.5px;color:var(--teal-strong);margin-top:2px}.alm-jt small{color:var(--muted)}
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

  /* ---------- folha de assinatura do almoço (garantia quando o Face ID falhar) ----------
     A folha sai NORMAL (todos livres para assinar). Antes de emitir, o painel pergunta se o CSV do Face ID do dia já foi importado;
     com ele, mostra quem está na lista e não passou no Face ID — o RH CONFIRMA quem não veio (nada é marcado sozinho).
     O RH também marca à mão. Marcados: linha cinza + "Não veio" (ou "Férias"). Guardado em rh/dados/almocofolha/<dia>. */
  const fNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\b(da|de|do|das|dos|e)\b/g,' ').replace(/\s+/g,' ').trim();
  function fMesma(a,b){ const A1=fNorm(a).split(' ').filter(Boolean), B1=fNorm(b).split(' ').filter(Boolean); if(!A1.length||!B1.length||A1[0]!==B1[0]) return false;
    const [cu,lo]=A1.length<=B1.length?[A1,B1]:[B1,A1]; if(cu.length===1) return lo.length===1; return cu.slice(1).every(t=>lo.includes(t)); }
  const LISTA_BASE=[]; /* 29/10 (LGPD): os nomes reais saíram do código; a lista fixa fica só no banco (rh/config.almoco.listaFolha) */
  const listaFolha=()=>{ const l=cfg().listaFolha; return Array.isArray(l)&&l.length?l:LISTA_BASE; };
  const semPref=n=>String(n||'').replace(/^\s*(terceiros?|motorista)\s*-\s*/i,'');
  function folhaPessoas(c,d){ const m=d.slice(0,7), Dm=A.dados[m]||{}, dia=(Dm.dias||{})[d]||null, P0=Dm.pessoas||{};
    const fx={}; (c.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    /* a folha tem SÓ quem está na lista fixa (pedido de 22/10); Face ID e cadastro só servem para ligar o CPF a esses nomes */
    const L=[]; const add=(nome,k,f,ord)=>{ const j=L.find(x=>fMesma(semPref(x.nome),semPref(nome))||(k&&x.k===k)); if(j){ if(k&&!j.k) j.k=k; if(f&&!j.f) j.f=f; return; } if(ord==null) return; L.push({nome:String(nome).trim(),k:k||'',f:f||null,ord}); };
    listaFolha().forEach((n,i)=>{ if(String(n).trim()) add(String(n).trim(),'',null,i); }); /* nomes e ordem da planilha */
    Object.keys(P0).forEach(k=>add(fx[k]?fx[k].nome:(P0[k].n||''),k,fx[k]||null));
    (c.R.func||[]).filter(f=>!/deslig|inativ/i.test(f.status||'')&&(!f.desligamento||f.desligamento>=d)&&(!f.admissao||f.admissao<=d)).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); add(f.nome,k?k.padStart(11,'0'):'',f); });
    const fer=(c.R.fer||c.R.ferias||[]).filter(x=>x.inicio&&x.inicio<=d&&(x.fim||x.inicio)>=d&&!/cancel/i.test(x.status||''));
    L.forEach(x=>{ x.fid=!!(x.k&&P0[x.k]); x.passou=!!(x.k&&dia&&dia[x.k]); x.ferias=!!(x.f&&fer.some(y=>y.funcId===x.f._id)); x.prog=x.k?ausDe(x.k,d):null; x.fora=!!(x.k&&foraDe(x.k)); });
    L.sort((a,b)=>(a.ord!=null?a.ord:1e6)-(b.ord!=null?b.ord:1e6)||a.nome.localeCompare(b.nome,'pt-BR'));
    return {L,temDia:!!dia}; }
  function folhaEst(c,d){ A.fol=A.fol||{}; let F=A.fol[d]; if(F) return F; F=A.fol[d]={nv:{},desm:{},tirar:{},resp:null,emit:null,carregando:true};
    c.P.db().doc('rh/dados/almocofolha/'+d).get().then(g=>{ const x=g&&g.exists?g.data():{}; F.nv=x.nv||{}; F.desm=x.desm||{}; F.tirar=x.tirar||{}; F.resp=x.resp||null; F.emit=x.emit||null; F.foto=x.foto||null; F.carregando=false; c.P.rerender(); }).catch(()=>{ F.carregando=false; }); return F; }
  async function folhaSalvar(c,d){ const F=A.fol[d]; try{ await c.P.db().doc('rh/dados/almocofolha/'+d).set({dia:d,nv:F.nv,desm:F.desm||{},tirar:F.tirar||{},resp:F.resp||null,emit:F.emit||null,foto:F.foto||null,em:new Date().toISOString(),por:(c.P.S&&c.P.S.perfil&&c.P.S.perfil.nome)||''}); }catch(e){ c.P.toast('Não foi possível guardar a marcação: '+((e&&e.message)||e)); } }
  const PROG_T='Não almoça (programado)';
  const fMarca=(F,x)=>F.nv[x.nome]||(x.prog&&!(F.desm||{})[x.nome]?PROG_T:'')||(x.fora&&!(F.desm||{})[x.nome]?'Não almoça na empresa':''); /* o que sai na folha para essa pessoa */
  /* ---------- lista fixa: editor (pedido de 22/10) ---------- */
  const FL_TIPOS=[['','Funcionário'],['Motorista - ','Motorista'],['Terceiro - ','Terceiro']];
  const flTipo=n=>/^\s*motorista\s*-/i.test(n)?'Motorista':/^\s*terceiros?\s*-/i.test(n)?'Terceiro':'Funcionário';
  function flRasc(){ A.folha=A.folha||{}; if(!Array.isArray(A.folha.rasc)) A.folha.rasc=listaFolha().slice(); return A.folha.rasc; }
  function flMudou(){ const a=flRasc(), b=listaFolha(); return a.length!==b.length||a.some((x,i)=>x!==b[i]); }
  function flSugestoes(c,d){ const r=flRasc(), m=d.slice(0,7), P0=(A.dados[m]||{}).pessoas||{}, dia=((A.dados[m]||{}).dias||{})[d]||{}, out=[], tem=n=>r.some(x=>fMesma(semPref(x),semPref(n)))||out.some(x=>fMesma(x.n,n));
    Object.keys(dia).forEach(k=>{ const n=titulo((P0[k]||{}).n||''); if(n&&!tem(n)) out.push({n,o:'passou no Face ID em '+c.br(d)}); });
    (c.R.func||[]).filter(f=>!/deslig|inativ/i.test(f.status||'')).forEach(f=>{ const n=titulo(f.nome||''); if(n&&!tem(n)) out.push({n,o:'ativo no cadastro'}); });
    return out.slice(0,40); }
  /* quem da lista está cadastrado (pedido de 22/10): cadastro do RH e pessoas do Face ID (mês e mês anterior) */
  function flCands(c,d){ const out=[], m=d.slice(0,7);
    (c.R.func||[]).forEach(f=>{ if(f&&f.nome) out.push({n:titulo(f.nome),src:'cad',emp:f.empresa||f.tipo||'',st:/deslig|inativ/i.test(f.status||'')?'desligado':''}); });
    [m,mesAnt(m)].forEach(mm=>{ const P0=(A.dados[mm]||{}).pessoas||{}; Object.keys(P0).forEach(k=>{ const n=titulo(P0[k].n||''); if(n&&!out.some(x=>fNorm(x.n)===fNorm(n))) out.push({n,src:'fid',emp:P0[k].e||''}); }); });
    return out; }
  function flIdent(n,cs){ const b=semPref(n), ex=cs.filter(x=>fMesma(x.n,b)); if(ex.length) return Object.assign({k:ex.some(x=>x.src==='cad')?'cad':'fid'},ex.find(x=>x.src==='cad')||ex[0]);
    const w=fNorm(b).split(' ').filter(Boolean); if(!w.length) return {k:'sem'};
    const pv=cs.filter(x=>{ const v=fNorm(x.n).split(' '); return v[0]===w[0]&&w.every(t=>v.includes(t)); }), uni=[...new Map(pv.map(x=>[fNorm(x.n),x])).values()];
    if(uni.length===1) return Object.assign({k:'prov'},uni[0]); if(uni.length>1) return {k:'varios',q:uni.length,ns:uni.map(x=>x.n).slice(0,4)}; return {k:'sem'}; }
  const flEmp=e=>{ const x=String(e||'').toUpperCase(); return /ZENITH/.test(x)?'Zenith':/NEXUS/.test(x)?'Nexus':/COLAFIX|CLT/.test(x)?'Colafix':x?titulo(x.toLowerCase()):''; };
  function flVinRes(c,d,q){ const esc=c.esc, w=fNorm(q).split(' ').filter(Boolean); if(!w.length) return '<div class="sub">Digite parte do nome.</div>';
    const xs=flCands(c,d).filter(x=>{ const v=fNorm(x.n); return w.every(t=>v.includes(t)); }).sort((a,b)=>(a.src==='cad'?0:1)-(b.src==='cad'?0:1)||a.n.localeCompare(b.n,'pt-BR')).slice(0,15);
    if(!xs.length) return '<div class="sub">Ninguém no cadastro nem no Face ID com esse nome.</div>';
    return xs.map(x=>`<button class="alm-flvo" data-act="alm-fl-vok" data-n="${esc(x.n)}"><span><b>${esc(x.n)}</b></span><small>${x.src==='cad'?'Cadastro do RH':'Face ID'}${flEmp(x.emp)?' · '+esc(flEmp(x.emp)):''}${x.st?' · '+x.st:''}</small></button>`).join(''); }
  function flVinHtml(c,d,i){ const esc=c.esc, r=flRasc(), q=A.folha.vq!=null?A.folha.vq:fNorm(semPref(r[i])).split(' ')[0]||'';
    return `<div class="alm-flv"><b>Quem é “${esc(r[i])}”? Toque no nome certo</b><span class="sub" style="margin:0">Procure no cadastro do RH e no Face ID. Se a pessoa não estiver em nenhum, digite o nome certo e use “Só corrigir o nome”.</span><input class="txt" id="alm-flvq" value="${esc(q)}" placeholder="Procurar no cadastro e no Face ID" autocomplete="off"><div class="alm-flvr" id="alm-flvr">${flVinRes(c,d,q)}</div><div class="alm-fa"><button class="btn sec" data-act="alm-fl-vtxt">Só corrigir o nome para o que digitei</button><button class="lnk" data-act="alm-fl-vx">Fechar</button></div></div>`; }
  document.addEventListener('input',ev=>{ if(!(ev.target&&ev.target.id==='alm-flvq')||!A.ctx) return; A.folha.vq=ev.target.value; const r=document.getElementById('alm-flvr'); if(r) r.innerHTML=flVinRes(A.ctx,A.dia,ev.target.value); });
  function listaEditor(c,d){ const esc=c.esc, F=A.folha, r=flRasc(), mud=flMudou(), sug=flSugestoes(c,d), cont={};
    r.forEach(n=>{ const t=flTipo(n); cont[t]=(cont[t]||0)+1; });
    const cs=flCands(c,d), ids=r.map(n=>flIdent(n,cs)), ter=r.map((n,i)=>i).filter(i=>flTipo(r[i])!=='Funcionário'), qt=k=>ter.filter(i=>ids[i].k===k||(k==='cad'&&ids[i].k==='fid')).length;
    const idH=(x,i)=>{ const bt=(k,t,ti)=>`<button class="alm-fid ${k}" data-act="alm-fl-vin" data-i="${i}" title="${esc(ti||'Procurar no cadastro')}">${t} <u>${k==='ok'?'trocar':'procurar'}</u></button>`;
      if(x.k==='cad'||x.k==='fid') return bt('ok',(x.k==='cad'?'Cadastrado':'No Face ID')+(flEmp(x.emp)?' · '+esc(flEmp(x.emp)):'')+(x.st?' · '+x.st:''),x.n);
      if(x.k==='prov') return `<span class="alm-fidw">${bt('prov','Provável: '+esc(x.n)+(flEmp(x.emp)?' · '+esc(flEmp(x.emp)):''))}<button class="lnk alm-fidu" data-act="alm-fl-usa" data-i="${i}" data-n="${esc(x.n)}">usar nome completo</button></span>`;
      if(x.k==='varios') return bt('prov',x.q+' parecidos',x.ns.join(', '));
      return bt('sem','Sem cadastro'); };
    const row=(n,i)=>`<li class="alm-flr" data-b="${esc(fNorm(n))}" data-tp="${flTipo(n)}" data-id="${ids[i].k}"><span class="alm-fln">${i+1}</span><div class="alm-flnm"><button class="alm-flin" data-act="alm-fl-vin" data-i="${i}" data-v="${esc(n)}" title="Tocar para procurar no cadastro ou corrigir o nome">${esc(n)}</button>${idH(ids[i],i)}</div><span class="alm-flt t-${flTipo(n).toLowerCase()}">${flTipo(n)}</span>
      <button class="alm-flb pr" data-act="alm-fl-vin" data-i="${i}" aria-label="Procurar no cadastro" title="Procurar no cadastro e no Face ID">⌕</button><button class="alm-flb" data-act="alm-fl-up" data-i="${i}" ${i?'':'disabled'} aria-label="Subir">↑</button><button class="alm-flb" data-act="alm-fl-dn" data-i="${i}" ${i<r.length-1?'':'disabled'} aria-label="Descer">↓</button><button class="alm-flb x" data-act="alm-fl-x" data-i="${i}" aria-label="Tirar da lista">×</button>${F.vinc===i?flVinHtml(c,d,i):''}</li>`;
    return `<div class="alm-fl"><div class="alm-flh"><div><b>Lista fixa · ${r.length} nomes</b><span>${Object.keys(cont).map(t=>cont[t]+' '+t.toLowerCase()+(cont[t]>1?(t==='Funcionário'?'s':'s'):'')).join(' · ')} · só essas pessoas saem na folha, nesta ordem</span></div>
        <em class="${mud?'mud':'ok'}">${mud?'Alterações ainda não salvas':'Salva'}</em></div>
      <div class="alm-fla"><select class="txt" id="alm-fltp" aria-label="Tipo">${FL_TIPOS.map(([v,t])=>`<option value="${v}" ${F.tp===v?'selected':''}>${t}</option>`).join('')}</select><input class="txt" id="alm-flnovo" placeholder="Nome para acrescentar" autocomplete="off"><button class="btn" data-act="alm-fl-add">+ Acrescentar</button></div>
      <div class="alm-fa"><input class="txt alm-flq" id="alm-flq" placeholder="Procurar na lista…" autocomplete="off" data-almflq><label class="btn sec" style="cursor:pointer">Importar da planilha (.xlsx)<input type="file" accept=".xlsx,.xls" data-alm-fxls hidden></label>
        ${(F.abas||[]).length>1?`<label class="alm-faba">Aba <select class="txt" data-alm-faba>${F.abas.map((a,i)=>`<option value="${i}" ${i===(F.aba||0)?'selected':''}>${esc(a)}</option>`).join('')}</select></label>`:''}
        <button class="btn sec" data-act="alm-fl-colar">${F.colar?'Fechar o colar':'Colar do Excel'}</button></div>
      ${F.colar?`<div class="alm-flc"><textarea class="txt" id="alm-flt" rows="5" placeholder="Cole aqui a coluna de nomes (um por linha)"></textarea><div class="alm-fa"><button class="btn sec" data-act="alm-fl-acr">Acrescentar no fim</button><button class="btn sec" data-act="alm-fl-poe">Trocar a lista inteira</button></div></div>`:''}
      ${ter.length?`<div class="alm-flid"><b>Terceiros e motoristas da lista (${ter.length}):</b> <span class="ok">${qt('cad')} cadastrados ou no Face ID</span> · <span class="prov">${qt('prov')+qt('varios')} prováveis</span> · <span class="sem">${qt('sem')} sem cadastro</span></div>`:''}
      <div class="alm-flfx" role="group" aria-label="Mostrar">${[['','Todos'],['ter','Terceiros e motoristas'],['sem','Sem cadastro'],['prov','Prováveis']].map(([k,t])=>`<button class="alm-flch" data-almflf="${k}" aria-pressed="${(F.flf||'')===k}">${t}</button>`).join('')}</div>
      <ol class="alm-fll">${r.map(row).join('')||'<li class="sub">Lista vazia: acrescente nomes ou importe a planilha.</li>'}</ol>
      ${sug.length?`<div class="alm-fls"><b>Não estão na lista (${sug.length})</b><span>Não saem na folha. Toque para acrescentar.</span><div>${sug.map(x=>`<button class="alm-flsg" data-act="alm-fl-sug" data-n="${esc(x.n)}" title="${esc(x.o)}">+ ${esc(x.n)}<small>${esc(x.o)}</small></button>`).join('')}</div></div>`:''}
      <div class="alm-flf"><button class="btn" data-act="alm-flsalva" ${mud?'':'disabled'}>Salvar lista fixa (${r.length})</button>${mud?'<button class="btn sec" data-act="alm-fl-desc">Desfazer alterações</button>':''}</div></div>`; }
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset||t.dataset.almFli==null||!A.ctx) return; const r=flRasc(), i=+t.dataset.almFli, v=t.value.trim(); if(v) r[i]=v; else r.splice(i,1); A.ctx.P.render(); });
  document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='alm-fltp'){ A.folha=A.folha||{}; A.folha.tp=ev.target.value; } });
  function flFiltra(){ const q=fNorm((document.getElementById('alm-flq')||{}).value||''), f=(A.folha||{}).flf||'';
    document.querySelectorAll('.alm-flr').forEach(l=>{ const okf=!f||(f==='ter'?l.dataset.tp!=='Funcionário':f==='sem'?l.dataset.id==='sem':(l.dataset.id==='prov'||l.dataset.id==='varios')); l.hidden=(!!q&&!l.dataset.b.includes(q))||!okf; });
    document.querySelectorAll('[data-almflf]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.almflf===f))); }
  document.addEventListener('input',ev=>{ if(ev.target&&ev.target.dataset&&ev.target.dataset.almflq!=null) flFiltra(); });
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-almflf]'); if(!b) return; A.folha=A.folha||{}; A.folha.flf=b.dataset.almflf; flFiltra(); });
  { const _mo=new MutationObserver(()=>{ if(document.querySelector('.alm-fll')&&(A.folha||{}).flf) flFiltra(); }); try{ _mo.observe(document.body,{childList:true,subtree:true}); }catch(e){} }
  document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='alm-flnovo'){ ev.preventDefault(); const b=document.querySelector('[data-act="alm-fl-add"]'); b&&b.click(); } });
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="alm-fl-"]'); if(!b||!A.ctx) return; const P=A.ctx.P, a=b.dataset.act, r=flRasc(), i=+b.dataset.i, F=A.folha;
    const limpa=t=>[...new Set(String(t||'').split(/\r?\n/).map(x=>x.replace(/\t.*$/,'').trim()).filter(Boolean))];
    const tem=n=>r.some(x=>fNorm(x)===fNorm(n));
    if(a==='alm-fl-add'){ const inp=document.getElementById('alm-flnovo'), nm=String(inp&&inp.value||'').trim(); if(!nm){ P.toast('Digite o nome.'); return; } const full=(F.tp||'')+nm; if(tem(full)){ P.toast('Esse nome já está na lista.'); return; } r.push(full); P.render(); setTimeout(()=>{ const x=document.getElementById('alm-flnovo'); x&&x.focus(); const l=document.querySelector('.alm-fll'); if(l) l.scrollTop=l.scrollHeight; },30); return; }
    if(['alm-fl-x','alm-fl-up','alm-fl-dn','alm-fl-add','alm-fl-poe','alm-fl-desc'].includes(a)) F.vinc=null;
    if(a==='alm-fl-x'){ r.splice(i,1); P.render(); return; }
    if(a==='alm-fl-vin'){ F.vinc=F.vinc===i?null:i; F.vq=null; P.render(); setTimeout(()=>{ const x=document.getElementById('alm-flvq'); if(x){ x.focus(); x.setSelectionRange(x.value.length,x.value.length); } },40); return; }
    if(a==='alm-fl-vx'){ F.vinc=null; P.render(); return; }
    if(a==='alm-fl-vtxt'&&F.vinc!=null){ const j=F.vinc, v=String((document.getElementById('alm-flvq')||{}).value||'').trim(); if(!v){ P.toast('Digite o nome.'); return; }
      const pre=/^\s*(terceiros?|motorista)\s*-/i.test(v)?'':((String(r[j]).match(/^\s*(terceiros?|motorista)\s*-\s*/i)||[''])[0]).replace(/\s*-\s*$/,' - '); r[j]=(pre&&pre.trim()?pre:'')+v; F.vinc=null; F.vq=null; P.render(); return; }
    if(a==='alm-fl-vok'&&F.vinc!=null){ const j=F.vinc, pre=(String(r[j]).match(/^\s*(terceiros?|motorista)\s*-\s*/i)||[''])[0]; r[j]=(pre?pre.replace(/\s*-\s*$/,' - '):'')+b.dataset.n; F.vinc=null; F.vq=null; P.toast('Agora é “'+r[j]+'”. Clique em “Salvar lista fixa”.'); P.render(); return; }
    if(a==='alm-fl-usa'){ const pre=(String(r[i]).match(/^\s*(terceiros?|motorista)\s*-\s*/i)||[''])[0]; r[i]=(pre?pre.replace(/\s*-\s*$/,' - '):'')+b.dataset.n; P.render(); return; }
    if(a==='alm-fl-up'&&i>0){ [r[i-1],r[i]]=[r[i],r[i-1]]; P.render(); return; }
    if(a==='alm-fl-dn'&&i<r.length-1){ [r[i+1],r[i]]=[r[i],r[i+1]]; P.render(); return; }
    if(a==='alm-fl-colar'){ F.colar=!F.colar; P.render(); return; }
    if(a==='alm-fl-acr'||a==='alm-fl-poe'){ const ns=limpa((document.getElementById('alm-flt')||{}).value); if(!ns.length){ P.toast('Cole os nomes primeiro.'); return; }
      if(a==='alm-fl-poe') F.rasc=ns; else ns.forEach(n=>{ if(!tem(n)) r.push(n); }); F.colar=false; P.toast(ns.length+' nomes '+(a==='alm-fl-poe'?'na lista':'acrescentados')+'. Confira e clique em “Salvar lista fixa”.'); P.render(); return; }
    if(a==='alm-fl-sug'){ const n=b.dataset.n; if(!tem(n)) r.push(n); P.render(); return; }
    if(a==='alm-fl-desc'){ F.rasc=listaFolha().slice(); P.render(); return; } });
  function folhaCard(c,d){ const esc=c.esc, F=folhaEst(c,d), {L,temDia}=folhaPessoas(c,d), brD=c.br(d); F.tirar=F.tirar||{};
    const LV=L.filter(x=>!F.tirar[x.nome]), n=LV.filter(x=>fMarca(F,x)).length;
    const ck=(x,mot)=>`<label class="alm-fk ${F.nv[x.nome]?'on':''}"><input type="checkbox" data-alm-fnv="${esc(x.nome)}" data-mot="${mot}" ${F.nv[x.nome]?'checked':''}> <span>${esc(x.nome)}</span>${F.nv[x.nome]?`<em>${esc(F.nv[x.nome])}</em>`:''}</label>`;
    const ckp=x=>{ const on=!(F.desm||{})[x.nome]; return `<label class="alm-fk ${on?'on':''}"><input type="checkbox" data-alm-fprog="${esc(x.nome)}" ${on?'checked':''}> <span>${esc(x.nome)}</span><em>${esc(x.prog?ausTxt(x.prog):'Não almoça na empresa')}</em></label>`; };
    let corpo='';
    if(F.carregando) corpo='<div class="sub">Carregando…</div>';
    else if(!temDia&&F.resp!=='sem') corpo=`<div class="alm-fq"><b>O CSV do Face ID de ${esc(brD)} já foi importado?</b><span>Ainda não aparece nenhum registro do Face ID neste dia. Com ele, o painel mostra quem está na lista e não passou na catraca, para você confirmar quem não veio.</span>
        <div class="alm-fa"><button class="btn" data-act="alm-fimp">Importar o CSV agora</button><button class="btn sec" data-act="alm-fsem">Emitir sem conferir pelo Face ID</button></div></div>`;
    else { const prog=LV.filter(x=>x.prog||x.fora), nao=LV.filter(x=>x.fid&&!x.passou&&!x.ferias&&!x.prog&&!x.fora), fer=LV.filter(x=>x.ferias&&!x.prog&&!x.fora), tir=L.filter(x=>F.tirar[x.nome]);
      corpo=(prog.length?`<div class="alm-fg"><b>Não almoçam hoje (${prog.length})</b><span>Ausência programada e quem não almoça na empresa: já vêm marcados. Desmarque se a pessoa for almoçar hoje.</span><div class="alm-fks">${prog.map(ckp).join('')}</div></div>`:'')
        +(temDia?`<div class="alm-fg"><b>Na lista, mas não passaram no Face ID em ${esc(brD)} (${nao.length})</b><span>Marque quem realmente não veio. Quem você não marcar fica normal na folha, para assinar.</span>
          ${nao.length?`<div class="alm-fks">${nao.map(x=>ck(x,'Não veio')).join('')}</div>`:'<div class="sub">Todos da lista passaram pelo Face ID.</div>'}</div>`:'')
        +(fer.length?`<div class="alm-fg"><b>De férias em ${esc(brD)} (${fer.length})</b><span>Marque para sair “Férias” na folha.</span><div class="alm-fks">${fer.map(x=>ck(x,'Férias')).join('')}</div></div>`:'')
        +`<div class="alm-fg"><b>Procurar pessoa na lista</b><span>Digite parte do nome para marcar “não veio” ou tirar a pessoa só da folha deste dia.</span>
          <input class="txt alm-fbusca" id="alm-fbusca" placeholder="Ex.: Paulo, Terceiro, Motorista…" autocomplete="off" value="${esc(A.fbusca||'')}"><div id="alm-fres">${folhaBusca(c,d)}</div></div>`
        +(()=>{ const ja=new Set(nao.concat(fer).map(x=>x.nome)), man=LV.filter(x=>F.nv[x.nome]&&!ja.has(x.nome)); return man.length?`<div class="alm-fg"><b>Marcados por você (${man.length})</b><span>Marcados pela busca.</span><div class="alm-fks">${man.map(x=>`<div class="alm-fk on"><span>${esc(x.nome)}</span><em>${esc(F.nv[x.nome])}</em><button class="lnk" data-act="alm-fnvx" data-n="${esc(x.nome)}">Desfazer</button></div>`).join('')}</div></div>`:''; })()
        +(tir.length?`<div class="alm-fg"><b>Tirados da folha deste dia (${tir.length})</b><span>Não saem na impressão de ${esc(brD)}. A lista fixa não muda.</span><div class="alm-fks">${tir.map(x=>`<div class="alm-fk"><span>${esc(x.nome)}</span><button class="lnk" data-act="alm-fdev" data-n="${esc(x.nome)}" style="margin-left:auto">Devolver</button></div>`).join('')}</div></div>`:'')
        +(F.emit?`<div class="alm-fe ${F.emit.mudou?'mud':''}">${F.emit.mudou?'<b>Marcação alterada depois de emitida</b> — imprima de novo para a folha ficar certa. ':''}Emitida em ${esc(new Date(F.emit.em).toLocaleDateString('pt-BR'))} às ${esc(new Date(F.emit.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}${F.emit.por?' por '+esc(F.emit.por):''}${F.emit.n>1?' ('+F.emit.n+' vezes)':''}. Pode mudar as marcações e imprimir de novo.</div>`:'')
        +`<div class="alm-fz"><span><b>${LV.length}</b> na folha · <b>${n}</b> marcado${n===1?'':'s'} · <b>${LV.length-n}</b> para assinar${tir.length?' · '+tir.length+' tirado'+(tir.length>1?'s':'')+' da folha':''}</span><button class="btn" data-act="alm-folha">${F.emit?'Imprimir de novo':'Imprimir folha'}</button></div>`; }
    return `<section class="card alm-folha"><div class="alm-fh"><div><b>Folha de assinatura do almoço · ${esc(brD)}</b><span>A folha sai normal, para todos assinarem; só quem estiver marcado sai em cinza.</span></div>
      <div class="alm-fa">${!F.carregando&&F.resp==='sem'&&!temDia?'<button class="lnk" data-act="alm-fvolta">Voltar à pergunta do Face ID</button>':''}<button class="btn sec" data-act="alm-flista">${(A.folha||{}).ed?'Fechar a lista fixa':'Lista fixa ('+listaFolha().length+')'}</button></div></div>
      ${(A.folha||{}).ed?listaEditor(c,d):''}
      ${corpo}</section>`; }
  function folhaPrevia(c,d){ const esc=c.esc, F=folhaEst(c,d), L=folhaPessoas(c,d).L.filter(x=>!(F.tirar||{})[x.nome]), n=L.filter(x=>fMarca(F,x)).length;
    return `<div class="alm-pvh"><b>Como vai sair</b><span>${L.length} na folha · ${n} em cinza · <b>${L.length-n}</b> para assinar</span></div>
      <div class="alm-pvt"><table><thead><tr><th>ALMOÇO - ${esc(c.br(d))} - ${L.length-n}</th><th>Assinatura</th></tr></thead><tbody>${L.map(x=>{ const m=fMarca(F,x); return `<tr class="${m?'cz':''}"><td>${esc(x.nome)}</td><td>${m?esc(m):''}</td></tr>`; }).join('')}</tbody></table></div>
      <button class="btn alm-pvb" data-act="alm-folha">${F.emit?'Imprimir de novo':'Imprimir folha'}</button>`; }
  function folhaPainel(c,d){ const esc=c.esc, F=folhaEst(c,d), {L,temDia}=folhaPessoas(c,d), LV=L.filter(x=>!(F.tirar||{})[x.nome]), n=LV.filter(x=>fMarca(F,x)).length;
    const st=F.carregando?'carregando…':!temDia&&F.resp!=='sem'?'falta conferir o Face ID do dia':F.emit?(F.emit.mudou?'alterada depois de emitida — imprima de novo':'emitida às '+new Date(F.emit.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})):'ainda não emitida';
    const bar=`<section class="card alm-fbar"><div><b>Folha de assinatura do almoço · ${esc(c.br(d))}</b><span>${LV.length} na folha · ${n} marcado${n===1?'':'s'} · <b>${LV.length-n}</b> para assinar · <em class="${F.emit&&F.emit.mudou?'mud':''}">${esc(st)}</em>${F.foto&&F.foto.n?` · <em>conferida pela foto: ${F.foto.n.sim} assinaram</em>`:''}</span></div><div class="alm-fa">${F.emit&&F.emit.vs?`<label class="btn sec">Conferir pela foto<input type="file" accept="image/*" multiple hidden data-alm-ffoto="1"></label>`:''}<button class="btn" data-act="alm-fabre">Abrir a folha de assinatura</button></div></section>`;
    if(!A.folhaAb) return bar;
    return bar+`<div class="alm-fm" role="dialog" aria-modal="true" aria-label="Folha de assinatura do almoço"><div class="alm-fmb"><div class="alm-fmh"><div><div class="eyebrow">RH · ALMOÇO</div><h2>Folha de assinatura · ${esc(c.br(d))}</h2></div><button class="btn sec" data-act="alm-ffecha">Fechar</button></div>
      <div class="alm-fmg"><div class="alm-fml">${fotoBloco(c,d)}${folhaCard(c,d)}</div><aside class="alm-fmr">${folhaPrevia(c,d)}</aside></div></div></div>`; }
  function folhaBusca(c,d){ const esc=c.esc, q=fNorm(A.fbusca||''); if(q.length<2) return ''; const F=folhaEst(c,d), {L}=folhaPessoas(c,d); F.tirar=F.tirar||{};
    const xs=L.filter(x=>fNorm(x.nome).includes(q)).slice(0,10); if(!xs.length) return '<div class="sub" style="margin-top:6px">Ninguém da lista com esse nome.</div>';
    return `<div class="alm-fbr">${xs.map(x=>{ const tir=F.tirar[x.nome], m=fMarca(F,x), st=tir?'Tirado desta folha':m||(x.passou?'Passou no Face ID':'Normal (assina)');
      return `<div class="alm-fbl ${tir?'tir':m?'on':''}"><div><b>${esc(x.nome)}</b><small>${esc(st)}</small></div><div class="alm-fa">${tir?`<button class="btn sec" data-act="alm-fdev" data-n="${esc(x.nome)}">Devolver à folha</button>`
        :`${F.nv[x.nome]?`<button class="btn sec" data-act="alm-fnvx" data-n="${esc(x.nome)}">Desfazer “${esc(F.nv[x.nome])}”</button>`:m?'':`<button class="btn sec" data-act="alm-fnvset" data-n="${esc(x.nome)}">Não veio</button>`}<button class="btn sec" data-act="alm-ftirar" data-n="${esc(x.nome)}">Tirar desta folha</button>`}</div></div>`; }).join('')}</div>`; }
  /* folha impressa com as marcas para ler pela foto (modulos/rh-almfoto.js); o que foi impresso fica em emit.vs[versão][folha] */
  function folhaDoc(c,d){ const F=folhaEst(c,d), L=folhaPessoas(c,d).L.filter(x=>!(F.tirar||{})[x.nome]), mk=x=>fMarca(F,x), n=L.filter(mk).length, brB=d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4), FT=window.RHAlmFoto;
    const nv=((F.emit&&F.emit.n)||0)+1, ver=nv%4, ps=FT.pagsDe(L,mk);
    return {nv,ver,ps,html:`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>ALMOÇO - ${brB}</title><style>${FT.CSS}</style></head><body>${FT.paginas(ps,d,ver,'ALMOÇO - '+brB+' - '+(L.length-n))}</body></html>`}; }
  function folhaImprimir(c,d){ const F=folhaEst(c,d); if(!window.RHAlmFoto){ c.P.toast('Carregando… tente de novo em um instante.'); return; } const w=window.open('','_blank'); if(!w){ c.P.toast('Libere as janelas (pop-up) para imprimir.'); return; }
    const D=folhaDoc(c,d); w.document.write(D.html); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(x){} },350);
    const pm={}; D.ps.forEach((r,i)=>{ pm[i]=r.filter(x=>x.nome); }); const vs=Object.assign({},(F.emit&&F.emit.vs)||{}); vs[D.ver]=pm;
    F.emit={em:new Date().toISOString(),por:(c.P.S&&c.P.S.perfil&&c.P.S.perfil.nome)||'',n:D.nv,mudou:false,ver:D.ver,vs}; folhaSalvar(c,d); c.P.rerender(); }
  /* ---------- conferir pela foto da folha assinada (23/10) ---------- */
  function ffEst(d){ A.ff=A.ff||{}; return A.ff[d]=A.ff[d]||{res:{},man:{},erros:[],lendo:false}; }
  function ffAss(c,d){ const F=folhaEst(c,d), R=ffEst(d), o={}; const sv=(F.foto&&F.foto.ass)||{}; Object.keys(sv).forEach(n=>o[n]=sv[n]);
    Object.keys(R.res).forEach(pg=>R.res[pg].linhas.forEach(l=>{ o[l.nome]=l.s; })); Object.keys(R.man).forEach(n=>o[n]=R.man[n]); return o; }
  async function ffLer(c,d,files){ const F=folhaEst(c,d), R=ffEst(d), FT=window.RHAlmFoto; if(!FT) return; R.lendo=true; R.erros=[]; c.P.render();
    for(const f of files){ try{ const r=await FT.ler(f,dec=>{ const vs=(F.emit&&F.emit.vs)||{}; return dec.dia===d&&vs[dec.ver]?vs[dec.ver][dec.pg]:null; });
        if(r.dia!==d){ R.erros.push(f.name+': esta foto é da folha de '+c.br(r.dia)+'. Abra esse dia para conferir.'); continue; }
        if(r.semLista){ R.erros.push(f.name+': esta folha é de uma impressão antiga. Fotografe a folha da última impressão.'); continue; }
        R.res[r.pg]=r; }catch(e){ console.warn('[almoço foto]',e); R.erros.push((f.name?f.name+': ':'')+((e&&e.message)||e)); } }
    R.lendo=false; A.folhaAb=true; c.P.render(); }
  function fotoBloco(c,d){ const esc=c.esc, F=folhaEst(c,d), R=ffEst(d), m=d.slice(0,7), FT=window.RHAlmFoto;
    const inp=lbl=>`<label class="btn ${lbl?'sec':''} alm-ffb">${lbl||'Tirar ou escolher a foto'}<input type="file" accept="image/*" multiple hidden data-alm-ffoto="1"></label>`;
    const cab=`<div class="alm-ffh"><b>Conferir pela foto da folha assinada</b><span>O painel vê em quais linhas tem assinatura e compara com o Face ID. Uma foto por folha, de frente, com as 4 marcas pretas aparecendo.</span></div>`;
    if(!F.emit||!F.emit.vs) return `<section class="alm-ff">${cab}<div class="alm-ffe">Imprima a folha por aqui primeiro: ela sai com as marcas que a foto precisa.</div></section>`;
    const tot=Object.keys(F.emit.vs[F.emit.ver]||{}).length, lidas=Object.keys(R.res).map(Number).sort(), ass=ffAss(c,d), nomes=Object.keys(ass);
    if(R.lendo) return `<section class="alm-ff">${cab}<div class="alm-ffe">Lendo a foto…</div></section>`;
    const err=R.erros.length?`<div class="alm-ffx">${R.erros.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'';
    if(!nomes.length) return `<section class="alm-ff">${cab}${err}<div class="alm-ffa">${inp()}</div></section>`;
    const {L,temDia}=folhaPessoas(c,d), kDe=n=>{ const x=L.find(y=>y.nome===n); return x&&x.k||''; }, sv=n=>{ const k=kDe(n); return k&&temDia?situacao(m,d,k).v:''; };
    const g={sim:[],nao:[],duv:[]}; nomes.forEach(n=>{ if(g[ass[n]]) g[ass[n]].push(n); });
    const semFace=g.sim.filter(n=>sv(n)&&sv(n)!=='sim'), semAss=g.nao.filter(n=>sv(n)==='sim');
    const chip=(n,extra)=>`<span class="alm-ffc ${ass[n]}"><button class="lnk" data-act="alm-fftg" data-n="${esc(n)}" title="Tocar para trocar">${esc(n)}</button>${extra||''}</span>`;
    const grupo=(t,xs,sub,fn)=>xs.length?`<div class="alm-ffg"><b>${t} · ${xs.length}</b>${sub?`<small>${sub}</small>`:''}<div>${xs.map(fn||(n=>chip(n))).join('')}</div></div>`:'';
    const pend=tot&&lidas.length<tot?`<div class="alm-ffe">Lida${lidas.length===1?'':'s'}: ${lidas.map(p=>'folha '+(p+1)).join(', ')||'nenhuma nesta vez'} de ${tot}. ${Object.keys(R.res).length?'Falta a foto da':'Pode mandar a foto da'} ${Array.from({length:tot},(_,i)=>i).filter(i=>!R.res[i]).map(i=>'folha '+(i+1)).join(', ')}.</div>`:'';
    const vistas=lidas.map(p=>`<figure><img src="${R.res[p].vista}" alt="Foto da folha ${p+1} com as linhas marcadas"><figcaption>Folha ${p+1}: verde = assinou · vermelho = em branco · laranja = conferir</figcaption></figure>`).join('');
    const salvo=F.foto&&!lidas.length&&!Object.keys(R.man).length?`<div class="alm-ffe">Conferida pela foto em ${esc(c.br(F.foto.em.slice(0,10)))} às ${esc(new Date(F.foto.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}${F.foto.por?' por '+esc(F.foto.por):''}.${(F.foto.fotos||[]).map((u,i)=>u?` <a href="${esc(u)}" target="_blank" rel="noopener">Ver foto ${i+1}</a>`:'').join('')}</div>`:'';
    const mudou=lidas.length||Object.keys(R.man).length;
    return `<section class="alm-ff">${cab}${err}${salvo}${pend}
      <div class="alm-ffk"><span><b>${g.sim.length}</b> assinaram</span><span><b>${g.nao.length}</b> em branco</span>${g.duv.length?`<span class="w"><b>${g.duv.length}</b> para conferir</span>`:''}</div>
      ${grupo('Assinaram, mas não passaram no refeitório',semFace,'Pode ser que o Face ID não pegou. Se almoçou mesmo, conte o almoço.',n=>chip(n,`<button class="btn sec rh-sm" data-act="alm-ffconta" data-n="${esc(n)}">Contar o almoço</button>`))}
      ${grupo('Passaram no refeitório, mas a linha está em branco',semAss,'Confira na folha: pode ter esquecido de assinar.')}
      ${grupo('Traço fraco · confira na folha',g.duv,'Toque no nome: assinou ↔ em branco.')}
      ${grupo('Em branco',g.nao.filter(n=>!semAss.includes(n)),'')}
      <details class="alm-ffd"><summary>Assinaram (${g.sim.length})</summary><div>${g.sim.map(n=>chip(n)).join('')}</div></details>
      ${vistas?`<div class="alm-ffv">${vistas}</div>`:''}
      <div class="alm-ffa">${inp(lidas.length?'Mandar outra foto':'Ler outra foto')}${mudou?`<button class="btn" data-act="alm-ffsalva">Guardar conferência</button>`:''}</div></section>`; }
  function ffFile(blob,nome){ try{ return new File([blob],nome,{type:'image/jpeg'}); }catch(e){ blob.name=nome; return blob; } }
  async function ffSalvar(c,d){ const F=folhaEst(c,d), R=ffEst(d), ass=ffAss(c,d), fotos=((F.foto&&F.foto.fotos)||[]).slice();
    try{ for(const pg of Object.keys(R.res)){ const r=R.res[pg]; if(!r.blob||!c.guardar) continue; try{ const g=await c.guardar('Almoço/'+d.slice(0,7),'Folha almoço '+d+' folha '+(+pg+1)+'.jpg',ffFile(r.blob,'folha-'+d+'-'+(+pg+1)+'.jpg')); fotos[+pg]=(g&&g.url)||''; }catch(e){ console.warn('[almoço foto] guardar',e); } }
      const n={sim:0,nao:0,duv:0}; Object.values(ass).forEach(v=>{ if(n[v]!=null) n[v]++; });
      F.foto={em:new Date().toISOString(),por:c.eu?c.eu():'',ver:F.emit&&F.emit.ver,ass,n,fotos:fotos.map(x=>x||'')}; await folhaSalvar(c,d); R.res={}; R.man={}; R.erros=[];
      c.P.toast('Conferência pela foto guardada: '+n.sim+' assinaram.'); c.P.render(); }catch(e){ c.P.toast('Não foi possível guardar: '+((e&&e.message)||e)); } }
  function folhaAbaNomes(i){ const wb=A._wb; if(!wb) return []; const ws=wb.Sheets[wb.SheetNames[i]], rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false});
    return [...new Set(rows.map(r=>String((r||[])[0]||'').trim()).filter(n=>n&&!/almo[cç]o|assinatura|^\d|^nome$/i.test(n)&&/[a-zà-ú]{2,}[^a-zà-ú]+[a-zà-ú]{2,}/i.test(n)))]; }
  async function folhaXls(c,file){ try{ if(!window.XLSX) await new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
      A._wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); A.folha.abas=A._wb.SheetNames.slice(0,60); A.folha.aba=0; const ns=folhaAbaNomes(0); A.folha.rasc=ns;
      c.P.toast(ns.length+' nomes lidos da aba “'+A._wb.SheetNames[0]+'”. Se não for o dia certo, escolha outra aba. Depois, “Salvar lista fixa”.'); c.P.render(); }
    catch(e){ console.warn('[almoço folha]',e); c.P.toast('Não consegui ler a planilha.'); } }
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!A.ctx||!t.dataset) return; const c=A.ctx, d=A.dia;
    if(t.dataset.almFnv!=null){ const F=folhaEst(c,d); if(t.checked) F.nv[t.dataset.almFnv]=t.dataset.mot||'Não veio'; else delete F.nv[t.dataset.almFnv]; if(F.emit) F.emit.mudou=true; folhaSalvar(c,d); (c.P.render||c.P.rerender)(); } /* caixinha em foco: redesenha já */
    if(t.dataset.almFprog!=null){ const F=folhaEst(c,d); F.desm=F.desm||{}; if(t.checked) delete F.desm[t.dataset.almFprog]; else F.desm[t.dataset.almFprog]=true; if(F.emit) F.emit.mudou=true; folhaSalvar(c,d); (c.P.render||c.P.rerender)(); } /* caixinha em foco: redesenha já */
    if(t.dataset.almFxls!=null&&t.files&&t.files[0]) folhaXls(c,t.files[0]);
    if(t.dataset.almFfoto!=null&&t.files&&t.files.length){ const fs=[...t.files]; t.value=''; ffLer(c,d,fs); }
    if(t.dataset.almFaba!=null&&A._wb){ A.folha.aba=+t.value; const ns=folhaAbaNomes(A.folha.aba); A.folha.rasc=ns; c.P.toast(ns.length+' nomes da aba “'+A._wb.SheetNames[A.folha.aba]+'”.'); c.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&A.folhaAb&&A.ctx){ A.folhaAb=false; A.ctx.P.render(); } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||t.id!=='alm-fbusca'||!A.ctx) return; A.fbusca=t.value; const r=document.getElementById('alm-fres'); if(r) r.innerHTML=folhaBusca(A.ctx,A.dia); });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="alm-f"]'); if(!b||!A.ctx) return; const a=b.dataset.act; if(!['alm-folha','alm-flista','alm-flsalva','alm-fimp','alm-fsem','alm-fvolta','alm-fadd','alm-fnvset','alm-fnvx','alm-ftirar','alm-fdev','alm-fabre','alm-ffecha','alm-fbase','alm-fftg','alm-ffconta','alm-ffsalva'].includes(a)) return;
    const c=A.ctx, P=c.P, d=A.dia; A.folha=A.folha||{}; const F=folhaEst(c,d);
    if(a==='alm-folha') return folhaImprimir(c,d);
    if(a==='alm-fftg'){ const R=ffEst(d), n=b.dataset.n, at=ffAss(c,d)[n]; R.man[n]=at==='sim'?'nao':'sim'; P.render(); return; }
    if(a==='alm-ffsalva') return ffSalvar(c,d);
    if(a==='alm-ffconta'){ const n=b.dataset.n, x=folhaPessoas(c,d).L.find(y=>y.nome===n); if(!x||!x.k) return P.toast('Não achei o CPF desta pessoa.');
      try{ await gravaAj(x.k,d,{v:'sim',mot:'Assinou a folha do almoço',por:c.eu(),em:new Date().toISOString()}); P.toast('Almoço contado para '+n+'.'); P.render(); }catch(e){ P.toast('Não foi possível gravar: '+((e&&e.message)||e)); } return; }
    if(a==='alm-fabre'){ A.folhaAb=true; P.render(); return; } if(a==='alm-ffecha'){ A.folhaAb=false; P.render(); return; }
    if(a==='alm-fbase'){ A.folha.rasc=LISTA_BASE.slice(); P.toast('Lista base de 20/10 carregada (67 nomes). Clique em “Salvar lista fixa”.'); P.render(); return; }
    if(a==='alm-flista'){ A.folha.ed=!A.folha.ed; A.folha.rasc=null; A.folha.colar=false; P.render(); return; }
    if(['alm-fnvset','alm-fnvx','alm-ftirar','alm-fdev'].includes(a)){ const nm=b.dataset.n; F.tirar=F.tirar||{};
      if(a==='alm-fnvset') F.nv[nm]='Não veio'; if(a==='alm-fnvx') delete F.nv[nm]; if(a==='alm-ftirar'){ F.tirar[nm]=true; delete F.nv[nm]; } if(a==='alm-fdev') delete F.tirar[nm];
      if(F.emit) F.emit.mudou=true; folhaSalvar(c,d); P.render(); const i=document.getElementById('alm-fbusca'); if(i&&A.fbusca){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } return; }
    if(a==='alm-fimp'){ const i=document.querySelector('.alm-top input[type=file]'); if(i) i.click(); else P.toast('Use “Importar do Face ID” no alto da tela.'); return; }
    if(a==='alm-fsem'){ F.resp='sem'; folhaSalvar(c,d); P.rerender(); return; }
    if(a==='alm-fvolta'){ F.resp=null; folhaSalvar(c,d); P.rerender(); return; }
    if(a==='alm-fadd'){ const v=(document.getElementById('alm-fsel')||{}).value; if(!v) return P.toast('Escolha um nome da lista.'); F.nv[v]='Não veio'; if(F.emit) F.emit.mudou=true; folhaSalvar(c,d); P.rerender(); return; }
    const ns=[...new Set(flRasc().map(x=>String(x).trim()).filter(Boolean))];
    try{ const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{},{listaFolha:ns}); await P.db().doc('rh/config').set({almoco:al},{merge:true}); if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; A.folha.rasc=null; P.toast('Lista fixa salva: '+ns.length+' nomes.'); P.render(); }catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } });
  try{ document.head.insertAdjacentHTML('beforeend','<style id="alm-folha-css">.alm-sref{background:#FBEBDD;border:2px solid #D9792B;border-radius:12px;padding:12px 16px;margin:10px 0;font-size:14.5px;line-height:1.5}.alm-sref.ok{background:#E6EEF3;border-color:#3F6F93}.alm-sref-b{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px}.alm-sref-b span{font-size:13px;color:var(--muted)}.alm-parc{background:#F6E8E6;border:2px solid var(--crit);color:var(--ink,#143F54);border-radius:12px;padding:12px 16px;margin:10px 0;font-size:14.5px;line-height:1.5}.alm-parc b{color:var(--crit)}.alm-emcurso{font-size:13.5px;color:var(--teal-strong);background:var(--teal-wash);padding:8px 12px;border-radius:10px;margin:6px 0 10px}.alm-bl.pend{background:var(--surface-2)}.alm-vals{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.alm-vals label{display:flex;flex-direction:column;gap:3px}.alm-vals input{max-width:150px}.alm-cl{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:8px}.alm-fbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0}.alm-fbar b{font-size:16px}.alm-fbar>div>span{display:block;font-size:13.5px;color:var(--muted);margin-top:2px}.alm-fbar em{font-style:normal}.alm-fbar em.mud{color:var(--warn-ink);font-weight:600}.alm-fm{position:fixed;inset:0;z-index:900;background:rgba(14,20,24,.45);display:flex;align-items:stretch;justify-content:center;padding:24px}.alm-fmb{background:var(--ground,#EDF1F4);border-radius:18px;width:min(1320px,100%);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}.alm-fmh{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 22px;background:var(--surface);border-bottom:1px solid var(--line)}.alm-fmh h2{margin:0;font-size:20px}.alm-fmg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px;padding:16px;overflow:hidden}.alm-fml{overflow:auto;min-height:0}.alm-fml>.alm-folha{margin:0}.alm-fml>.alm-folha>.alm-fh>div:first-child{display:none}.alm-fmr{display:flex;flex-direction:column;gap:10px;min-height:0;background:var(--surface);border-radius:14px;padding:14px;border:1px solid var(--line)}.alm-pvh b{display:block;font-size:16px}.alm-pvh span{font-size:13.5px;color:var(--muted)}.alm-pvh span b{display:inline;font-size:inherit}.alm-pvt{flex:1;min-height:0;overflow:auto;border:1px solid #000}.alm-pvt table{width:100%;border-collapse:collapse;font-family:Calibri,Carlito,Arial,sans-serif}.alm-pvt th,.alm-pvt td{border:.5pt solid #000;padding:2px 6px;font-size:13px;font-weight:700;white-space:nowrap}.alm-pvt th{background:#BFBFBF;font-style:italic;position:sticky;top:0}.alm-pvt td+td{font-weight:400;font-style:italic;font-size:12px;text-align:center;color:#333;width:44%}.alm-pvt tr.cz td{background:#BFBFBF}.alm-pvb{width:100%;height:52px!important;font-size:16px!important}@media (max-width:900px){.alm-fm{padding:0}.alm-fmb{border-radius:0}.alm-fmg{grid-template-columns:1fr;overflow:auto}.alm-fmr{max-height:70vh}}.alm-folha{display:flex;flex-direction:column;gap:12px;margin:10px 0}.alm-fh{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.alm-fh b{display:block;font-size:16px}.alm-fh span,.alm-fg>span,.alm-fq>span{display:block;font-size:13.5px;color:var(--muted)}.alm-fa{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.alm-fl{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line)}.alm-fl textarea{width:100%;font:inherit;font-size:14px}.alm-flh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.alm-flh b{font-size:16px}.alm-flh span{display:block;font-size:13px;color:var(--muted)}.alm-flh em{font-style:normal;font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap}.alm-flh em.ok{background:var(--ok-tint,#E2F0E8);color:var(--ok,#2F6F4F)}.alm-flh em.mud{background:var(--warn-tint,#F6EEDC);color:var(--warn-ink,#7A5410)}.alm-fla{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:8px}.alm-flq{max-width:260px}.alm-flc{display:flex;flex-direction:column;gap:8px}.alm-fll{list-style:none;margin:0;padding:0;max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.alm-flnm{display:flex;flex-direction:column;min-width:0}.alm-fid{font:inherit;font-size:11.5px;padding:0 6px 2px;color:var(--muted);background:none;border:0;text-align:left;cursor:pointer}.alm-fid u{opacity:.75}.alm-fidw{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.alm-fidu{font-size:11.5px}.alm-fid.ok{color:var(--ok,#2F6F4F)}.alm-fid.prov{color:var(--warn-ink,#7A5410)}.alm-fid.sem{color:var(--crit)}.alm-fid .lnk{font-size:11.5px}.alm-flid{font-size:13px}.alm-flid .ok{color:var(--ok,#2F6F4F);font-weight:600}.alm-flid .prov{color:var(--warn-ink,#7A5410);font-weight:600}.alm-flid .sem{color:var(--crit);font-weight:600}.alm-flfx{display:flex;gap:6px;flex-wrap:wrap}.alm-flch{font:inherit;font-size:13px;border:1px solid var(--line);border-radius:999px;padding:5px 12px;background:var(--surface);color:inherit;cursor:pointer}.alm-flch[aria-pressed=true]{background:var(--teal-strong,#143F54);color:#fff;border-color:transparent}.alm-flr[hidden]{display:none}.alm-flv{grid-column:1/-1;background:var(--surface-2);border-radius:10px;padding:10px;margin:4px 0 6px;display:flex;flex-direction:column;gap:6px}.alm-flv input{height:40px!important;font-size:15px!important}.alm-flvr{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto}.alm-flvo{font:inherit;text-align:left;display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.alm-flvo:hover{border-color:var(--teal-strong,#143F54)}.alm-flvo small{font-size:12px;color:var(--muted)}.alm-flb.pr{font-size:17px}.alm-flin{cursor:text}.alm-flr{display:grid;grid-template-columns:34px minmax(0,1fr) auto 34px 34px 34px 34px;gap:6px;align-items:center;padding:4px 8px;border-bottom:1px solid var(--line)}.alm-flr:last-child{border-bottom:0}.alm-fln{font-size:12.5px;color:var(--muted);text-align:right}.alm-flin{font:inherit;font-size:14.5px;text-align:left;padding:5px 6px 1px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.alm-flin:hover,.alm-flin:focus-visible{background:var(--surface-2);text-decoration:underline}.alm-flt{font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--surface-2);color:var(--muted)}.alm-flt.t-motorista{background:#E3EEF3;color:#1F5568}.alm-flt.t-terceiro{background:#F6EEDC;color:#7A5410}.alm-flb{font:inherit;width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.alm-flb:disabled{opacity:.3;cursor:default}.alm-flb.x{color:var(--crit)}.alm-fls b{display:block;font-size:14px}.alm-fls span{font-size:12.5px;color:var(--muted)}.alm-fls>div{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.alm-flsg{font:inherit;font-size:13px;border:1px dashed var(--line);border-radius:10px;background:var(--surface);padding:5px 10px;cursor:pointer;text-align:left;color:inherit}.alm-flsg small{display:block;font-size:11px;color:var(--muted)}.alm-flf{display:flex;gap:8px;flex-wrap:wrap}@media (max-width:700px){.alm-fla{grid-template-columns:1fr}}.alm-fq,.alm-fg{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:12px;background:var(--surface-2)}.alm-fq b,.alm-fg b{font-size:15px}.alm-fks{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;margin-top:4px}.alm-fk{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-size:14px}.alm-fk input{width:18px;height:18px}.alm-fk.on{background:#E3E6E9;border-color:#9AA5AD}.alm-fk .lnk{margin-left:8px}.alm-fk em{margin-left:auto;font-size:12px;color:var(--muted)}.alm-fe{font-size:13.5px;color:var(--muted);padding:8px 12px;border-radius:10px;background:var(--surface-2)}.alm-fe.mud{background:var(--warn-tint);color:var(--warn-ink)}.alm-fe b{color:inherit}.alm-fbusca{max-width:420px;height:46px!important;font-size:16px!important}.alm-fbr{display:flex;flex-direction:column;gap:6px;margin-top:8px}.alm-fbl{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface)}.alm-fbl b{display:block;font-size:15px}.alm-fbl small{font-size:12.5px;color:var(--muted)}.alm-fbl.on{background:#E3E6E9}.alm-fbl.tir{opacity:.7;border-style:dashed}.alm-fbl .btn{height:36px;padding:0 12px;font-size:13.5px}.alm-faba{display:flex;align-items:center;gap:6px;font-size:14px}.alm-fz{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.alm-fz span{font-size:14px}#alm-fsel{min-width:260px}.alm-ff{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--surface);border:1px solid var(--line);margin-bottom:12px}.alm-ffh b{display:block;font-size:16px}.alm-ffh span{display:block;font-size:13.5px;color:var(--muted)}.alm-ffe{font-size:13.5px;color:var(--muted);padding:8px 12px;border-radius:10px;background:var(--surface-2)}.alm-ffx{font-size:13.5px;padding:8px 12px;border-radius:10px;background:var(--crit-tint,#F6E8E6);color:var(--crit-ink,#8A2B22)}.alm-ffa{display:flex;gap:8px;flex-wrap:wrap}.alm-ffb{cursor:pointer}.alm-ffk{display:flex;gap:16px;flex-wrap:wrap;font-size:14px}.alm-ffk b{font-size:22px;margin-right:4px}.alm-ffk .w b{color:var(--warn-ink,#7A5410)}.alm-ffg{display:flex;flex-direction:column;gap:4px}.alm-ffg b{font-size:14.5px}.alm-ffg small{font-size:12.5px;color:var(--muted)}.alm-ffg>div,.alm-ffd>div{display:flex;flex-wrap:wrap;gap:6px}.alm-ffc{display:inline-flex;align-items:center;gap:6px;padding:3px 4px 3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);font-size:13.5px}.alm-ffc.sim{background:var(--ok-tint,#E2F0E8)}.alm-ffc.duv{background:var(--warn-tint,#F6EEDC)}.alm-ffc .lnk{font-size:13.5px;padding:2px 4px}.alm-ffd summary{cursor:pointer;font-size:14px;margin-bottom:6px}.alm-ffv{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.alm-ffv figure{margin:0}.alm-ffv img{width:100%;border-radius:8px;border:1px solid var(--line)}.alm-ffv figcaption{font-size:12px;color:var(--muted)}</style>'); }catch(e){}
  /* ---------- presença para a Visão do gestor (22/10): resumo SEM CPF em presenca/{dia} ----------
     Quem tem o RH (ou a administradora) publica sozinho, só quando muda. O gestor lê presenca/ (regra própria). */
  const PR={map:{},sub:false,ult:0,ocupado:false};
  const ehSaida=s=>/SAIDA/.test(nrm(s));
  function prEmp(f,x){ const e=nrm((f&&f.empresa)||(x&&x.e)||''); if(/ZENITH/.test(e)) return 'Zenith'; if(/NEXUS/.test(e)) return 'Nexus'; if(/COLAFIX|FIXCOL/.test(e)) return 'Colafix'; return e?'Terceiros':'Colafix'; }
  function prHash(o){ const s=JSON.stringify(o); let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+'.'+s.length; }
  const prMenos=(d,n)=>{ const x=new Date(d+'T12:00'); x.setDate(x.getDate()-n); return x.toISOString().slice(0,10); };
  /* último dia em que cada CPF passou no Face ID (meses já carregados), antes do dia d */
  function prVisto(d){ const ult={}; let dias=0; Object.keys(A.dados).forEach(m=>{ const ds=(A.dados[m]||{}).dias||{}; Object.keys(ds).forEach(x=>{ if(x>=d) return; const ks=Object.keys(ds[x]||{}); if(ks.length>=5) dias++; ks.forEach(k=>{ if(!ult[k]||x>ult[k]) ult[k]=x; }); }); }); return {ult,dias}; }
  /* nome do Face ID × nome do cadastro com grafia um pouco diferente (NARCISO/NARCIZO): mesma pessoa */
  function prLev(a,b){ if(Math.abs(a.length-b.length)>1) return 9; let v=[...Array(b.length+1).keys()]; for(let i=1;i<=a.length;i++){ const w=[i]; for(let j=1;j<=b.length;j++) w[j]=Math.min(v[j]+1,w[j-1]+1,v[j-1]+(a[i-1]===b[j-1]?0:1)); v=w; } return v[b.length]; }
  function prMesma(a,b){ if(fMesma(a,b)) return true; const A1=fNorm(a).split(' ').filter(t=>t.length>2), B1=fNorm(b).split(' ').filter(t=>t.length>2); if(A1.length<2||B1.length<2) return false;
    const tk=(x,y)=>x===y||(x.length>=5&&y.length>=5&&x[0]===y[0]&&prLev(x,y)<=1); if(!tk(A1[0],B1[0])) return false;
    const [cu,lo]=A1.length<=B1.length?[A1,B1]:[B1,A1]; return cu.every(t=>lo.some(u=>tk(t,u))); }
  function prDia(c,d,maxP){ const m=d.slice(0,7), Dm=A.dados[m]||{}, dia=(Dm.dias||{})[d]||{}, P0=Dm.pessoas||{}, P=c.P, R=c.R;
    const fx={}; (R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    const tur=((P.S&&P.S.cfg&&P.S.cfg.turnos)||[])[0], ini=hm((tur&&tur.ini)||'07:30'), lim=Math.min(23*60,ini+30), limT=pad(Math.floor(lim/60))+':'+pad(lim%60);
    const ps=[], vistos=new Set();
    Object.keys(dia).forEach(k=>{ const x=dia[k]||{}, pp=P0[k]||{}; let f=fx[k]||null; if(!f&&pp.n){ const cs=(R.func||[]).filter(y=>prMesma(pp.n,y.nome)); if(cs.length===1) f=cs[0]; } const t=(x.t||[]).map(z=>{ const mm=String(z).match(/^(\d{2}:\d{2})(:\d{2})?\s*(.*)$/); return mm?{h:mm[1],d:mm[3]}:null; }).filter(Boolean).sort((a,b)=>a.h.localeCompare(b.h));
      if(!t.length) return; const g=[]; let ab=null; t.forEach(z=>{ if(ehSaida(z.d)){ if(ab!=null){ g.push(ab+'-'+z.h); ab=null; } } else if(ab==null) ab=z.h; }); if(ab!=null) g.push(ab+'-');
      const u=t[t.length-1]; vistos.add(k); if(f) vistos.add('f:'+f._id);
      ps.push({n:titulo(f?f.nome:(pp.n||'Sem nome')),s:(f&&f.setor)||'',e:prEmp(f,pp),c:t[0].h,a:x.a||'',u:u.h,sa:ehSaida(u.d)?1:0,g}); });
    ps.sort((a,b)=>a.n.localeCompare(b.n,'pt-BR'));
    const wd=new Date(d+'T12:00').getDay(); let fer=false; try{ fer=!!(P.feriadoDe&&P.feriadoDe(d)); }catch(e){}
    const exp=d===P.hojeStr()?(wd>0&&wd<6&&!fer):ps.length>=Math.max(5,.4*maxP);
    const fs=[]; let VI=null; if(exp){ const ferias=(R.fer||[]).filter(x=>x.inicio&&x.inicio<=d&&(x.fim||x.inicio)>=d&&!/cancel/i.test(x.status||''));
      const sFil=((R.cfg&&R.cfg.setoresFilial)||[]).map(nrm), fora=f=>f.filial==='FIXCOL'||(f.setor&&sFil.includes(nrm(f.setor)));
      (R.func||[]).filter(f=>!/deslig|inativ|encerr|demit|rescis|afast/i.test(f.status||'')||(f.desligamento&&f.desligamento>=d&&!/afast/i.test(f.status||''))).filter(f=>(!f.desligamento||f.desligamento>=d)&&(!f.admissao||f.admissao<=d)&&!fora(f)).forEach(f=>{
        const k=String(f.cpf||'').replace(/\D/g,'').padStart(11,'0'); if(vistos.has(k)||vistos.has('f:'+f._id)||ps.some(p=>prMesma(p.n,f.nome))) return;
        const fer=ferias.some(y=>y.funcId===f._id), vi=fer?null:(VI||(VI=prVisto(d))), u=vi&&vi.ult[k]||'', lim2=prMenos(d,14);
        /* sem passar no Face ID há mais de 2 semanas (ou nunca, com 2 semanas de dados): provavelmente saiu e o cadastro não foi atualizado */
        if(vi&&vi.dias>=8&&(!f.admissao||f.admissao<lim2)&&(!u||u<lim2)){ fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:'Sumiu',u}); return; }
        const at=fer?null:atDe({funcId:f._id,cpf:f.cpf},d);
        fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:fer?'Férias':at?(window.RHAtest?RHAtest.TIPO(at.tipo)[1]:'Atestado'):'Sem registro'}); });
      fs.sort((a,b)=>a.n.localeCompare(b.n,'pt-BR')); }
    const C=cfg(); return {dia:d,exp,lim:limT,alm:[C.ini,C.fim],p:ps,f:fs}; }
  async function publicar(c){ if(!c||!c.P||PR.ocupado) return; const P=c.P, R=c.R; A.ctx=A.ctx||c; if(!(R.lido&&R.lido.func&&R.lido.fer)) return;
    const hj=P.hojeStr(), d0=(()=>{ const x=new Date(hj+'T12:00'); x.setDate(x.getDate()-15); return x.toISOString().slice(0,10); })();
    [...new Set([hj.slice(0,7),d0.slice(0,7)])].forEach(m=>{ try{ assinar(m); }catch(e){} });
    if(!A.roboSub){ A.roboSub=true; try{ P.db().doc('rh/dados/robo/faceid').onSnapshot(g=>{ A.robo=g.exists?g.data():null; P.rerender(); },()=>{}); }catch(e){} }
    if(!PR.sub){ PR.sub=true; P.inscrever('rh-presenca',()=>P.db().collection('presenca').orderBy('dia','desc').limit(20),snap=>{ snap.docs.forEach(g=>{ PR.map[g.id]=(g.data()||{}).h||''; }); PR.lido=true; }); return; }
    if(!PR.lido) return; const ms=[...new Set([hj.slice(0,7),d0.slice(0,7)])]; if(ms.some(m=>!A.dados[m])) return;
    const dias=[]; ms.forEach(m=>Object.keys((A.dados[m]||{}).dias||{}).forEach(d=>{ if(d>=d0&&d<=hj) dias.push(d); })); if(!dias.length) return;
    const maxP=Math.max(0,...dias.map(d=>Object.keys((A.dados[d.slice(0,7)].dias||{})[d]||{}).length));
    const imp=[].concat(...ms.map(m=>((A.dados[m]||{}).imp||[]))).filter(x=>x&&x.em).sort((a,b)=>String(b.em).localeCompare(String(a.em)))[0]||null;
    const fonte=A.robo&&A.robo.ultima&&(!imp||A.robo.ultima>imp.em)?{em:A.robo.ultima,por:'Robô Face ID'}:imp?{em:imp.em,por:imp.por||''}:null;
    PR.ocupado=true; try{ for(const d of dias.sort()){ const o=prDia(c,d,maxP); const h=prHash([o,d===hj?fonte:null]); if(PR.map[d]===h) continue;
        await P.db().doc('presenca/'+d).set(Object.assign(o,{h,em:new Date().toISOString(),fonte})); PR.map[d]=h; } }
    catch(e){ console.warn('[presença]',e); } finally{ PR.ocupado=false; PR.ult=Date.now(); } }
  /* ---------- Pontualidade pelo Face ID (pedido de 22/10): atrasos, saídas antes do horário e faltas sem registro ----------
     Horário de cada pessoa: turno de config/geral.turnos que tem o setor dela na lista de linhas; senão o horário padrão do RH
     (rh/config.almoco.ponto {ini,fim,tol}); senão o turno sem linhas; senão 07:30–17:30. Tolerância padrão 10 min.
     Chegada = 1ª passagem do dia; saída = última (de preferência num leitor de SAÍDA). Só dias de expediente. */
  const PONTO_PAD={ini:'07:30',fim:'17:30',tol:10};
  const pontoCfg=()=>Object.assign({},PONTO_PAD,cfg().ponto||{});
  const hmT=m=>pad(Math.floor(m/60))+':'+pad(m%60);
  function turnoDe(c,setor,d){ const pc=pontoCfg(), T=((c.P.S&&c.P.S.cfg&&c.P.S.cfg.turnos)||[]).filter(t=>t&&t.ini&&t.fim), wd=new Date(d+'T12:00').getDay();
    const doDia=T.filter(t=>!(Array.isArray(t.dias)&&t.dias.length)||t.dias.includes(wd)), s=nrm(setor);
    const daLinha=s&&doDia.find(t=>(t.linhas||[]).some(l=>nrm(l)===s));
    if(daLinha) return {ini:daLinha.ini,fim:daLinha.fim,nome:daLinha.nome||'turno da linha'};
    if((cfg().ponto||{}).ini) return {ini:pc.ini,fim:pc.fim,nome:'horário padrão do RH'};
    const geral=doDia.find(t=>!(t.linhas||[]).length); if(geral) return {ini:geral.ini,fim:geral.fim,nome:geral.nome||'turno geral'};
    return {ini:pc.ini,fim:pc.fim,nome:'horário padrão'}; }
  function pontoMes(c,m){ const D=A.dados[m]; if(!D) return null; const R=c.R, P=c.P, tol=+pontoCfg().tol||0, hj=P.hojeStr(), agora=new Date().getHours()*60+new Date().getMinutes();
    const ds=Object.keys(D.dias||{}).sort(); if(!ds.length) return {m,dias:[],pes:{}};
    const fx={}; (R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    const maxP=Math.max(1,...ds.map(d=>Object.keys(D.dias[d]||{}).length)), P0=D.pessoas||{}, out={}, dExp=[];
    const pes=(k,f,pp)=>out[k]=out[k]||{k,nome:titulo(f?f.nome:(pp&&pp.n)||'Sem nome'),setor:(f&&f.setor)||'',emp:empCurta((pp&&pp.e)||(f?(f.tipo==='PJ'?(f.empresa||'PJ'):'COLAFIX'):'')),funcId:f?f._id:null,cpf:/^\d{11}$/.test(k)?k:'',dias:0,atr:[],sai:[],falt:[]};
    ds.forEach(d=>{ const r=prDia(c,d,maxP); if(!r.exp) return; dExp.push(d); const dia=D.dias[d]||{};
      Object.keys(dia).forEach(k=>{ const x=dia[k]||{}, f=fx[k]||null; const t=(x.t||[]).map(z=>{ const mm=String(z).match(/^(\d{2}:\d{2})(:\d{2})?\s*(.*)$/); return mm?{h:mm[1],d:mm[3]}:null; }).filter(Boolean).sort((a,b)=>a.h.localeCompare(b.h)); if(!t.length) return;
        const o=pes(k,f,P0[k]); o.dias++; if(atDe({funcId:f?f._id:null,cpf:k},d)) return; /* dia com atestado/declaração: não conta atraso nem saída antes */
        const tu=turnoDe(c,o.setor,d), ini=hm(tu.ini), fim=hm(tu.fim), ch=hm(t[0].h);
        if(ch>ini+tol) o.atr.push({d,h:t[0].h,esp:tu.ini,min:ch-ini});
        const sds=t.filter(z=>ehSaida(z.d)), u=(sds.length?sds[sds.length-1]:t[t.length-1]); const um=hm(u.h);
        if((d<hj||agora>fim+60)&&um<fim-tol&&um>ch) o.sai.push({d,h:u.h,esp:tu.fim,min:fim-um,leitor:ehSaida(u.d)}); });
      r.f.filter(x=>x.m==='Sem registro').forEach(x=>{ const f=(R.func||[]).find(y=>titulo(y.nome)===x.n); if(!f) return; const k=String(f.cpf||'').replace(/\D/g,'').padStart(11,'0')||('f:'+f._id); pes(k,f,null).falt.push(d); }); });
    return {m,dias:dExp,pes:out}; }
  /* carrega o mês (o almoço só assina quando a tela abre) */
  function carregar(c,m){ A.ctx=A.ctx||c; assinar(m); return new Promise(res=>{ const t0=Date.now(); const ver=()=>{ if((A.dados[m]&&A.aj[m])||Date.now()-t0>9000) return res(!!A.dados[m]); setTimeout(ver,150); }; ver(); }); }
  /* números do mês por pessoa, para o fechamento da folha (rh.js) */
  function fechamento(c,m){ A.ctx=A.ctx||c; const D=A.dados[m]; if(!D) return null; const ds=Object.keys(D.dias||{}).sort(); const sv={mes:A.mes,q:A.q,emp:A.emp,setor:A.setor,sit:A.sit};
    let G=[]; try{ A.mes=m; A.q=''; A.emp=''; A.setor=''; A.sit=''; G=grade(ds,pessoasDoMes(m)); } finally{ Object.assign(A,sv); }
    const vd=+cfg().valorDesc||0, alm={}; G.forEach(g=>{ alm[g.p.k]={nome:g.p.nome,emp:empCurta(g.p.emp),alm:g.tot,sj:g.sj,jj:g.jj,desc:g.sj*vd}; });
    return {m,valorDesc:vd,alm,ponto:pontoMes(c,m)}; }
  /* filtros da tela na Pontualidade (empresa, setor; a busca filtra na tela e no PDF/Excel) */
  const pontFil=o=>(!A.emp||(A.emp==='-'?o.emp==='Sem empresa':o.emp===empCurta(A.emp)))&&(!A.setor||(A.setor==='-'?!o.setor:o.setor===A.setor));
  const pontLista=X=>Object.values(X.pes).filter(pontFil);
  function vPont(c){ const esc=c.esc, P=c.P, X0=pontoMes(c,A.mes), pc=pontoCfg(), lim=+A.pontN||40;
    if(!X0||!X0.dias.length) return '<div class="empty">Sem dias de expediente com Face ID neste mês.</div>';
    const X=Object.assign({},X0,{pes:Object.fromEntries(pontLista(X0).map(o=>[o.k,o]))});
    let L=Object.values(X.pes).filter(o=>A.pontTodos||o.atr.length||o.sai.length||o.falt.length);
    const pts=o=>o.falt.length*3+o.atr.length+o.sai.length; L.sort((a,b)=>pts(b)-pts(a)||a.nome.localeCompare(b.nome,'pt-BR'));
    const tot=k=>Object.values(X.pes).reduce((a,o)=>a+o[k].length,0), nAtr=Object.values(X.pes).filter(o=>o.atr.length).length;
    const dl=d=>d.slice(8)+'/'+d.slice(5,7)+' '+semana(d);
    const det=o=>A.pontAb===o.k?`<tr class="alm-pdet"><td colspan="7"><div class="alm-pdg">
        <div><b>Atrasos (${o.atr.length})</b>${o.atr.map(x=>`<span>${dl(x.d)} · chegou ${x.h} <small>(horário ${x.esp}, +${x.min} min)</small></span>`).join('')||'<span class="sub">nenhum</span>'}</div>
        <div><b>Saídas antes (${o.sai.length})</b>${o.sai.map(x=>`<span>${dl(x.d)} · ${x.leitor?'saiu':'última passagem'} ${x.h} <small>(até ${x.esp}, −${x.min} min)</small></span>`).join('')||'<span class="sub">nenhuma</span>'}</div>
        <div><b>Faltas sem registro (${o.falt.length})</b>${o.falt.map(d=>`<span>${dl(d)}</span>`).join('')||'<span class="sub">nenhuma</span>'}</div></div></td></tr>`:'';
    const cfgH=A.pontCfg?`<div class="alm-pcfg"><label><span class="label">Entrada</span><input class="txt" type="time" id="alm-pini" value="${esc(pc.ini)}"></label><label><span class="label">Saída</span><input class="txt" type="time" id="alm-pfim" value="${esc(pc.fim)}"></label><label><span class="label">Tolerância (min)</span><input class="txt" type="number" min="0" max="60" id="alm-ptol" value="${esc(pc.tol)}"></label><button class="btn rh-sm" data-act="alm-pcfgok">Salvar horário</button><button class="lnk" data-act="alm-pcfg">Cancelar</button>
        <div class="sub" style="flex-basis:100%;margin:0;font-size:12.5px">Vale para quem não tem turno da linha cadastrado (Visão do gestor › Turnos usa o setor = nome da linha).</div></div>`:'';
    return `<div class="alm-pk"><div><span>Pessoas que chegaram atrasadas</span><b class="num">${nAtr}</b><small>${tot('atr')} atrasos no mês</small></div><div><span>Saídas antes do horário</span><b class="num">${tot('sai')}</b><small>última passagem antes do fim</small></div>
        <div class="${tot('falt')?'w':''}"><span>Faltas sem registro</span><b class="num">${tot('falt')}</b><small>dia de expediente sem passar no Face ID (sem férias)</small></div><div><span>Dias de expediente</span><b class="num">${X.dias.length}</b><small>horário padrão ${esc(pc.ini)}–${esc(pc.fim)} · tolerância ${esc(pc.tol)} min · <button class="lnk" data-act="alm-pcfg">mudar</button></small></div></div>${cfgH}
      <div class="alm-pbar"><label class="ck"><input type="checkbox" data-act="alm-ptodos" ${A.pontTodos?'checked':''}> Mostrar também quem está em dia</label><span style="flex:1"></span><button class="btn sec rh-sm" data-act="alm-pxls">Excel</button><button class="btn rh-sm" data-act="alm-ppdf">Baixar PDF</button></div>
      ${L.length?`<div class="rh-tw"><table class="rh-t alm-pt"><thead><tr><th>Nome</th><th>Setor · empresa</th><th style="text-align:right">Atrasos</th><th style="text-align:right">Saídas antes</th><th style="text-align:right">Faltas</th><th style="text-align:right">Dias no Face ID</th><th></th></tr></thead><tbody>
        ${L.slice(0,lim).map(o=>`<tr data-b="${esc(almChave(o))}"><td><button class="lnk alm-nm" data-act="alm-pab" data-k="${esc(o.k)}">${esc(o.nome)}</button></td><td>${esc([o.setor,o.emp].filter(Boolean).join(' · ')||'—')}</td>
          <td class="num" style="text-align:right">${o.atr.length?`<b>${o.atr.length}</b> <small>· ${o.atr.reduce((a,x)=>a+x.min,0)} min</small>`:'—'}</td><td class="num" style="text-align:right">${o.sai.length||'—'}</td><td class="num" style="text-align:right">${o.falt.length?`<span class="pill crit">${o.falt.length}</span>`:'—'}</td><td class="num" style="text-align:right">${o.dias}</td>
          <td class="rh-ac"><button class="lnk" data-act="alm-pab" data-k="${esc(o.k)}">${A.pontAb===o.k?'fechar':'ver dias'}</button>${o.funcId&&(o.atr.length>=3||o.falt.length)?` <button class="btn sec rh-sm" data-act="rh-presoc" data-id="${o.funcId}">Ocorrência</button>`:''}</td></tr>${det(o)}`).join('')}</tbody></table></div>
        ${L.length>lim?`<div style="text-align:center;margin-top:10px"><button class="btn sec" data-act="alm-pmais">Mostrar mais (${L.length-lim})</button></div>`:''}`:'<div class="empty">Ninguém atrasou, saiu antes ou faltou sem registro neste mês.</div>'}
      <div class="sub" style="margin:10px 0 0;font-size:12.5px">Chegada = primeira passagem do dia; saída = última passagem (num leitor de saída, quando houver). É um apoio para o RH conferir: o ponto oficial continua sendo o da folha.</div>`; }
  const pontFiltros=()=>almFiltros().filter(t=>!/^Situação/.test(t));
  async function pontoPdf(c){ const X=pontoMes(c,A.mes); if(!X) return; const pc=pontoCfg(), L=pontLista(X).filter(o=>qOk(o)).filter(o=>A.pontTodos||o.atr.length||o.sai.length||o.falt.length).sort((a,b)=>(b.falt.length*3+b.atr.length+b.sai.length)-(a.falt.length*3+a.atr.length+a.sai.length)||a.nome.localeCompare(b.nome,'pt-BR'));
    const T=pontLista(X).filter(o=>qOk(o)), tot=k=>T.reduce((a,o)=>a+o[k].length,0), br=d=>d.slice(8)+'/'+d.slice(5,7);
    if(!window.RHRel) return c.P.toast('O gerador de relatórios ainda não carregou.');
    try{ await RHRel.pdf({tit:'Pontualidade · '+mesNome(A.mes),sub:'Face ID · horário padrão '+pc.ini+'–'+pc.fim+' · tolerância '+pc.tol+' min · '+X.dias.length+' dias de expediente',filtros:pontFiltros().concat(A.pontTodos?[]:['Só quem atrasou, saiu antes ou faltou']),arq:'Pontualidade-'+A.mes,
      kpis:[{t:'Chegaram atrasados',v:String(T.filter(o=>o.atr.length).length),s:tot('atr')+' atrasos no mês',c:tot('atr')?'warn':'ok'},{t:'Saídas antes',v:String(tot('sai')),s:'última passagem antes do fim',c:'cinza'},{t:'Faltas sem registro',v:String(tot('falt')),s:'sem passar no Face ID (sem férias)',c:tot('falt')?'crit':'ok'},{t:'Pessoas',v:String(T.length),s:'com Face ID no mês',c:'pet'}],
      partes:[{secao:'Por pessoa',nota:'em ordem de gravidade',cols:[{t:'Nome',w:50},{t:'Setor · empresa',w:40},{t:'Atrasos',w:20,al:'r'},{t:'Minutos',w:16,al:'r'},{t:'Saídas antes',w:18,al:'r'},{t:'Faltas',w:14,al:'r'},{t:'Dias',w:12,al:'r'}],
        rows:L.map(o=>{ const r=[o.nome,[o.setor,o.emp].filter(Boolean).join(' · ')||'—',String(o.atr.length||'—'),o.atr.length?String(o.atr.reduce((a,x)=>a+x.min,0)):'—',String(o.sai.length||'—'),String(o.falt.length||'—'),String(o.dias)]; if(o.falt.length) r._cor={5:'crit'}; return r; }),vazio:'Ninguém atrasou, saiu antes ou faltou sem registro.'},
        {secao:'Dia a dia',cols:[{t:'Nome',w:50},{t:'Dia',w:16},{t:'O que',w:40},{t:'Horário',w:18},{t:'Esperado',w:18},{t:'Min',w:12,al:'r'}],rows:L.flatMap(o=>o.atr.map(x=>[o.nome,br(x.d),'Atraso',x.h,x.esp,String(x.min)]).concat(o.sai.map(x=>[o.nome,br(x.d),x.leitor?'Saída antes':'Última passagem antes do fim',x.h,x.esp,String(x.min)]),o.falt.map(d=>{ const r=[o.nome,br(d),'Falta sem registro','','','']; r._cor={2:'crit'}; return r; }))),vazio:'Nada no mês.'},
        {texto:'Chegada = primeira passagem do dia; saída = última passagem (num leitor de saída, quando houver). É um apoio para o RH conferir: o ponto oficial continua sendo o da folha.'}],assina:'Conferido por (RH)'}); }catch(e){ c.P.toast(String(e&&e.message||e)); } }
  async function pontoXls(c){ const X=pontoMes(c,A.mes); if(!X) return; const br=d=>d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4), L=pontLista(X).filter(o=>qOk(o)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    if(window.RHRel){ const a1=[['Nome','Setor','Empresa','Dias no Face ID','Atrasos','Minutos de atraso','Saídas antes','Faltas sem registro']].concat(L.map(o=>[o.nome,o.setor,o.emp,o.dias,o.atr.length,o.atr.reduce((a,x)=>a+x.min,0),o.sai.length,o.falt.length]));
      const a2=[['Nome','Dia','O que','Horário','Esperado','Minutos']]; L.forEach(o=>{ o.atr.forEach(x=>a2.push([o.nome,br(x.d),'Atraso',x.h,x.esp,x.min])); o.sai.forEach(x=>a2.push([o.nome,br(x.d),x.leitor?'Saída antes':'Última passagem antes do fim',x.h,x.esp,x.min])); o.falt.forEach(d=>a2.push([o.nome,br(d),'Falta sem registro','','',''])); });
      return RHRel.xls('Pontualidade-'+A.mes,[['Resumo',a1],['Dia a dia',a2]],{tit:'Pontualidade · '+mesNome(A.mes),sub:'Face ID',filtros:pontFiltros()}); }
    if(!window.XLSX) await c.carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb=XLSX.utils.book_new();
    const a1=[['Nome','Setor','Empresa','Dias no Face ID','Atrasos','Minutos de atraso','Saídas antes','Faltas sem registro']].concat(L.map(o=>[o.nome,o.setor,o.emp,o.dias,o.atr.length,o.atr.reduce((a,x)=>a+x.min,0),o.sai.length,o.falt.length]));
    const a2=[['Nome','Dia','O que','Horário','Esperado','Minutos']]; L.forEach(o=>{ o.atr.forEach(x=>a2.push([o.nome,br(x.d),'Atraso',x.h,x.esp,x.min])); o.sai.forEach(x=>a2.push([o.nome,br(x.d),x.leitor?'Saída antes':'Última passagem antes do fim',x.h,x.esp,x.min])); o.falt.forEach(d=>a2.push([o.nome,br(d),'Falta sem registro','','',''])); });
    [['Resumo',a1],['Dia a dia',a2]].forEach(([n,a])=>{ const ws=XLSX.utils.aoa_to_sheet(a); ws['!cols']=a[0].map((h,i)=>({wch:i===0?34:16})); XLSX.utils.book_append_sheet(wb,ws,n); });
    c.baixar(new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Pontualidade-'+A.mes+'.xlsx'); }
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="alm-p"]'); if(!b||!A.ctx) return; const a=b.dataset.act, c=A.ctx, P=c.P;
    if(a==='alm-pab'){ A.pontAb=A.pontAb===b.dataset.k?null:b.dataset.k; P.render(); return; }
    if(a==='alm-ppdf'){ pontoPdf(c); return; }
    if(a==='alm-ptodos'){ A.pontTodos=b.checked; P.render(); return; }
    if(a==='alm-pmais'){ A.pontN=(+A.pontN||40)+60; P.render(); return; }
    if(a==='alm-pcfg'){ A.pontCfg=!A.pontCfg; P.render(); return; }
    if(a==='alm-pxls'){ pontoXls(c).catch(e=>P.erro(e)); return; }
    if(a==='alm-pcfgok'){ const v=id=>String((document.getElementById(id)||{}).value||'').trim(), ini=v('alm-pini'), fim=v('alm-pfim'), tol=Math.max(0,Math.min(60,parseInt(v('alm-ptol'),10)||0));
      if(!/^\d{2}:\d{2}$/.test(ini)||!/^\d{2}:\d{2}$/.test(fim)||hm(fim)<=hm(ini)) return P.toast('Confira os horários de entrada e saída.');
      const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{},{ponto:{ini,fim,tol}}); P.db().doc('rh/config').set({almoco:al},{merge:true}).then(()=>{ if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; A.pontCfg=false; P.toast('Horário padrão salvo.'); P.render(); }).catch(e=>P.erro(e)); return; } });
  try{ document.head.insertAdjacentHTML('beforeend',`<style id="alm-ponto-css">
  .alm-pk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:14px 0}.alm-pk>div{background:var(--sunken);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}
  .alm-pk span{font-size:13px;color:var(--muted)}.alm-pk b{font-size:26px;font-weight:600}.alm-pk small{font-size:12.5px;color:var(--muted)}.alm-pk .w b{color:var(--crit-ink)}
  .alm-pcfg{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding:12px;border-radius:12px;background:var(--teal-wash);margin:0 0 12px}.alm-pcfg label{display:flex;flex-direction:column;gap:2px}.alm-pcfg .txt{width:130px}
  .alm-pbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 8px}
  .alm-pt{width:100%}.alm-pt td{vertical-align:middle}.alm-pdet td{background:var(--teal-wash)}.alm-pdg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.alm-pdg>div{display:flex;flex-direction:column;gap:3px;font-size:13px}.alm-pdg small{color:var(--muted)}
  @media (max-width:900px){ .alm-pk,.alm-pdg{grid-template-columns:repeat(2,minmax(0,1fr))} }
  </style>`); }catch(e){}
  window.RHAlmoco={_folhaDoc:(c,d)=>folhaDoc(c||A.ctx,d||A.dia),publicar,carregar,fechamento,_prDia:prDia,ausencia:P=>{ const h=P.hojeStr(); A.vis='dia'; A.pes=null; A.aus={k:'',fixo:false,tipo:'dia',data:h,dias:[],de:h,ate:'',mot:''}; P.go('rhalmoco'); },render,iniciar:c=>{ A.ctx=c; },interpretar,_A:A};
})();
