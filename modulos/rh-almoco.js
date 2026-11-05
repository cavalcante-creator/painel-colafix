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
  /* 03/11: almoço e café controlados igual. A.ref = 'alm' | 'cafe'. No café, cfg() devolve os valores, justificativas,
     "não toma café na empresa", ausências e "sem leitura" próprios do café (chaves …Cafe em rh/config.almoco); o fim da janela é cafeAte. */
  const JUST_CAFE=['Tomou café fora (autorizado)','Chegou depois do café','Serviço externo','Consulta ou atestado','Outro'];
  const RC=()=>A.ref==='cafe', RFL=()=>RC()?'c':'a', RK=k=>RC()?({fora:'foraCafe',ausencias:'ausenciasCafe',semLeitura:'semLeituraCafe',valor:'valorCafe',valorDesc:'valorDescCafe',just:'justCafe'})[k]||k:k;
  const ajK=(d,k)=>(RC()?'cafe:':'')+d+'_'+k;
  function refCom(r,fn){ const sv=A.ref; A.ref=r; try{ return fn(); } finally{ A.ref=sv; } }
  function cfgBase(){ const c=(A.ctx&&A.ctx.R.cfg&&A.ctx.R.cfg.almoco)||{}; return Object.assign({},PADRAO,c); }
  function cfg(){ const b=cfgBase(); if(!RC()) return b; return Object.assign({},b,{fim:b.cafeAte||'09:30',ini:'05:00',fora:b.foraCafe||{},ausencias:b.ausenciasCafe||[],semLeitura:b.semLeituraCafe||{},valor:b.valorCafe,valorDesc:b.valorDescCafe,just:b.justCafe||JUST_CAFE}); }
  function cfgGrava(c,up){ const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}); Object.keys(up).forEach(k=>al[RK(k)]=up[k]); return c.P.db().doc('rh/config').set({almoco:al},{merge:true}).then(()=>{ if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; }); }
  const cfgLe=(c,k)=>(((c.R.cfg&&c.R.cfg.almoco)||{})[RK(k)]);
  /* troca as palavras do almoço pelas do café no que a tela mostra (fora da folha de assinatura, que já tem as suas) */
  function fxCafe(h){ if(!RC()||typeof h!=='string') return h; const keep=[]; h=h.replace(/<!--nofx-->[\s\S]*?<!--\/nofx-->/g,m=>{ keep.push(m); return '\u0001'+(keep.length-1)+'\u0002'; }).replace(/Almoço\/café/g,'\u0003');
    const T=[[/ALMOÇARAM/g,'TOMARAM CAFÉ'],[/Almoçaram/g,'Tomaram café'],[/almoçaram/g,'tomaram café'],[/ALMOÇOU/g,'TOMOU CAFÉ'],[/Almoçou/g,'Tomou café'],[/almoçou/g,'tomou café'],[/NÃO ALMOÇAM/g,'NÃO TOMAM CAFÉ'],[/ALMOÇAM/g,'TOMAM CAFÉ'],[/almoçam/g,'tomam café'],[/Almoça/g,'Toma café'],[/almoça/g,'toma café'],[/almoçar/g,'tomar café'],[/ALMOÇOS/g,'CAFÉS'],[/Almoços/g,'Cafés'],[/almoços/g,'cafés'],[/ALMOÇO/g,'CAFÉ'],[/Almoço/g,'Café'],[/almoço/g,'café'],[/Valor da refeição/g,'Valor do café'],[/valor da refeição/g,'valor do café'],[/da refeição/g,'do café'],[/ refeições/g,' cafés']];
    T.forEach(([a,b])=>{ h=h.replace(a,b); }); return h.replace(/\u0003/g,'Almoço/café').replace(/\u0001(\d+)\u0002/g,(_,i)=>keep[+i]); }
  const fxDeep=v=>!RC()?v:typeof v==='string'?fxCafe(v):Array.isArray(v)?Object.assign(v.map(fxDeep),Object.fromEntries(Object.entries(v).filter(([k])=>isNaN(k)))):v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fxDeep(x)])):v;
  function fxDoc(doc){ if(!RC()||!doc||doc.__fx) return doc; doc.__fx=true; ['text','splitTextToSize','getTextWidth'].forEach(f=>{ const o=doc[f]; if(typeof o==='function') doc[f]=function(t,...r){ return o.call(this,fxDeep(t),...r); }; }); return doc; }
  const arqRef=n=>RC()?n.replace(/^Almoco/,'Cafe').replace(/^Refeitorio/,'Cafe'):n;
  function cfgOld(){ const c=(A.ctx&&A.ctx.R.cfg&&A.ctx.R.cfg.almoco)||{}; return Object.assign({},PADRAO,c); }
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
  function interpretar(txt){ const L=lerCsv(txt); if(!L.length) throw new Error('Arquivo vazio.'); const cfg=cfgBase;
    const cab=L[0].map(nrm), col=re=>cab.findIndex(h=>re.test(h));
    const iH=col(/^HORA$|DATA E HORA/), iN=col(/NOME/), iC=col(/^CPF$/), iE=col(/^EMPRESA$/), iG=col(/^GRUPO/), iAu=col(/AUTORIZA/), iD=col(/DISPOSITIVO/), iAr=col(/^AREA$/);
    if(iH<0||iC<0||iD<0) throw new Error('Este arquivo não parece o relatório de acessos do Control iD (faltam as colunas Hora, CPF ou Dispositivo).');
    const C=cfg(), dRef=nrm(C.disp), ini=hm(C.ini), fim=hm(C.fim), cafe=hm(C.cafeAte); const out={}, pes={}; let lidos=0, de='', ate='';
    for(const r of L.slice(1)){ const h=String(r[iH]||'').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}:\d{2})(:\d{2})?/); if(!h) continue;
      if(iAu>=0&&!/^AUTORIZADO$/.test(nrm(r[iAu]))) continue; const cpf=String(r[iC]||'').replace(/\D/g,''); if(!cpf) continue;
      const k=cpf.padStart(11,'0'), d=h[3]+'-'+h[2]+'-'+h[1], t=h[4].padStart(5,'0'), m=hm(t); lidos++; if(!de||d<de) de=d; if(!ate||d>ate) ate=d;
      const x=((out[d]=out[d]||{})[k]=out[d][k]||{p:1});
      (x.t=x.t||[]).push(t+(h[5]||'')+' '+String(r[iD]||'').trim().slice(0,30)); /* todas as passagens do dia, para o detalhe da pessoa */
      if(iAr>=0){ const ar=String(r[iAr]||'').trim().slice(0,30); if(ar) (x.ar=x.ar||{})[t+(h[5]||'')]=ar; } /* área do Control iD de cada passagem (05/11: o PJ escolhe quais leitores contam) */
      if(nrm(r[iD])===dRef){ if(m>=ini&&m<=fim){ if(!x.a||t<x.a) x.a=t; } else if(m<cafe){ if(!x.c||t<x.c) x.c=t; } }
      pes[k]={n:titulo(r[iN]||''),e:iE>=0?String(r[iE]||'').trim():'',g:iG>=0?String(r[iG]||'').trim():''}; }
    Object.values(out).forEach(o=>Object.values(o).forEach(x=>{ if(x.t) x.t.sort(); }));
    if(!lidos) throw new Error('Nenhum acesso autorizado no arquivo.'); return {dias:out,pessoas:pes,lidos,de,ate}; }
  /* reimportar JUNTA as passagens com as que já estavam no dia (um arquivo parcial não apaga o almoço já lido) e refaz almoço/café */
  function juntaDia(antes,novo){ if(!antes) return novo; const C=cfgBase(), dRef=nrm(C.disp), ini=hm(C.ini), fim=hm(C.fim), cafe=hm(C.cafeAte), out={};
    new Set(Object.keys(antes).concat(Object.keys(novo))).forEach(k=>{ const a=antes[k]||{}, b=novo[k]||{}, t=[...new Set((a.t||[]).concat(b.t||[]))].sort(); const x={p:1}; if(a.ar||b.ar) x.ar=Object.assign({},a.ar||{},b.ar||{});
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
  function situacao(m,d,k){ const aj=((A.aj[m]||{}).aj||{})[ajK(d,k)]; const x=(((A.dados[m]||{}).dias||{})[d]||{})[k];
    let r; if(aj&&aj.v==='just') r={v:'just',j:aj,x}; else if(aj&&!aj.removido) r={v:aj.v==='sim'?'sim':'nao',aj,x}; else if(!x) r={v:'aus',x:null}; else r={v:x[RFL()]?'sim':'nao',x};
    if(r.v==='nao'&&foraDe(k)) r.v='fora';
    if(r.v==='nao'&&!r.aj&&almEmCurso(d)) r.v='pend'; /* almoço ainda não terminou hoje */
    if(r.v==='nao'&&!r.aj){ const sl=semLeit(d); if(sl) r={v:'just',x:r.x,sl:true,j:{tipo:'Refeitório sem leitura',mot:sl.mot||(RC()?'O Face ID do refeitório não registrou o café neste dia':'O Face ID do refeitório não registrou o almoço neste dia'),por:sl.por||''}}; }
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
  function pessoasDoMes(m,semLista){ const c=A.ctx, D=A.dados[m]||{}, P0=D.pessoas||{}, fx={}; (c.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    const ks=new Set(Object.keys(P0)); Object.keys((A.aj[m]||{}).aj||{}).forEach(x=>{ if(/^cafe:/.test(x)===RC()) ks.add(x.split('_')[1]); });
    return [...ks].map(k=>{ const p=P0[k]||{}, f=fx[k]; return {k,nome:f?titulo(f.nome):(p.n||(/^nome:/.test(k)?k.slice(5):'(sem nome)')),emp:p.e||(f?(f.tipo==='PJ'?(f.empresa||'PJ'):'COLAFIX INDUSTRIA E COMERCIO LTDA'):''),setor:f?(f.setor||''):'',cad:!!f,grupo:p.g||''}; })
      .filter(p=>(!A.emp||(A.emp==='-'?!p.emp:p.emp===A.emp))&&(!A.setor||(A.setor==='-'?!p.setor:p.setor===A.setor))) /* a busca por nome filtra na própria tela (almBusca), sem redesenhar */
      .filter((p,i,a)=>{ if(semLista) return true; if(!a._ks) a._ks={v:cafeKs(m)}; const ks=a._ks.v; return !ks||ks.has(p.k); }) /* 03/11: só quem está na lista da folha (café ou almoço) */
      .sort((a,b)=>a.nome.localeCompare(b.nome)); }
  /* CPFs das pessoas da lista fixa do café (ligadas pelo cadastro ou pelo Face ID); null = lista vazia (não filtra) */
  const nomeK=n=>'nome:'+String(n||'').trim().replace(/_/g,' ');
  function cafeKs(m){ const sv=FK; FK=RC()?'cafe':'alm'; try{ if(!listaFolha().length) return null; const d=(A.dia&&A.dia.slice(0,7)===m)?A.dia:m+'-28'; return new Set(folhaPessoas0(A.ctx,d).L.map(x=>x.k||nomeK(x.nome))); } finally{ FK=sv; } }
  const empCurta=e=>!e?'Sem empresa':/COLAFIX/i.test(e)?'Colafix':titulo(e);

  /* ---------- tela ---------- */
  function render(c){ A.ctx=c; if(c.fixo==='pont') return refCom('alm',()=>render0(c));
    const h0=render0(c), seg=`<div class="seg alm-ref" role="group" aria-label="Refeição"><button data-act="alm-ref" data-v="alm" aria-pressed="${!RC()}">Almoço</button><button data-act="alm-ref" data-v="cafe" aria-pressed="${RC()}">Café</button></div>`;
    return fxCafe(h0).replace('<label class="btn" style="cursor:pointer">',seg+'<label class="btn" style="cursor:pointer">'); }
  function render0(c){ A.ctx=c; const P=c.P, esc=c.esc, h=P.hojeStr(); if(!A.mes) A.mes=h.slice(0,7); assinar(A.mes); assinar(mesAnt(A.mes));
    if(c.fixo) A.vis=c.fixo; else if(A.vis==='pont'||A.vis==='dir') A.vis='dia'; /* 30/10: Pontualidade e Diretoria são telas próprias */
    const D=A.dados[A.mes]; const ds=Object.keys((D&&D.dias)||{}).sort(); if(!A.dia||A.dia.slice(0,7)!==A.mes) A.dia=ds.length?ds[ds.length-1]:(A.mes===h.slice(0,7)?h:A.mes+'-01');
    const C=cfg(), ps=D?pessoasDoMes(A.mes):[], setores=[...new Set((c.R.func||[]).map(f=>f.setor).filter(Boolean))].sort(), emps=[...new Set(Object.values((D&&D.pessoas)||{}).map(p=>p.e))].sort();
    const ultImp=D&&D.imp&&D.imp.length?D.imp[D.imp.length-1]:null, st=D&&ds.length?stats(A.mes):null;
    const topo=`<section class="card alm-top"><div class="alm-h"><div class="alm-mesnav"><button class="btn sec" data-act="alm-mes" data-v="-1" aria-label="Mês anterior">‹</button><div><div class="eyebrow">${c.fixo?'RH · RELATÓRIOS':'RH · AUSÊNCIAS'}</div><h2>${c.fixo==='pont'?'Pontualidade':c.fixo==='dir'?'Almoço · diretoria':'Almoço/café'} · ${esc(mesNome(A.mes))}</h2></div><button class="btn sec" data-act="alm-mes" data-v="1" aria-label="Próximo mês">›</button></div>
      <label class="btn" style="cursor:pointer">${A.lendo?'Lendo…':P.ic('baixar',18,2.2)+'Importar do Face ID'}<input type="file" accept=".csv,text/csv" id="alm-arq" hidden ${A.lendo?'disabled':''}></label></div>
      <div class="sub alm-reg">${A.vis==='pont'?'Chegada, saída e faltas de cada pessoa pelo Face ID. ':(RC()?`Tomou café quem passou no <b>${esc(C.disp)}</b> antes das ${esc(C.fim)}. `:`Almoçou quem passou no <b>${esc(C.disp)}</b> entre ${esc(C.ini)} e ${esc(C.fim)}. `)}${roboTxt(c)}${ultImp?'Dados de '+esc(c.br(ultImp.de))+' a '+esc(c.br(ultImp.ate))+' · importado por '+esc(ultImp.por||'')+' em '+esc(new Date(ultImp.em).toLocaleDateString('pt-BR')):ds.length?'Dados de '+esc(c.br(ds[0]))+' a '+esc(c.br(ds[ds.length-1]))+'.':'Ainda não há dados deste mês.'}
        <details><summary>Como exportar do Control iD</summary><ol><li>Relatórios → Acessos → <b>Acessos Gerais</b>.</li><li>Escolha as datas (pode ser o mês todo), Pessoas: Todos, e clique em Listar.</li><li>Exportar → <b>Exportar CSV</b> e arraste o arquivo aqui (ou toque em "Importar do Face ID").</li><li>Importar de novo o mesmo período só atualiza esses dias: não duplica.</li></ol></details></div>
      ${st&&A.vis!=='dia'&&A.vis!=='pont'&&A.vis!=='nota'?`<div class="alm-kpi"><div><span>Almoços no mês</span><b class="num">${st.tot.toLocaleString('pt-BR')}</b><small>${st.dExp} dias de expediente</small></div><div><span>Média por dia</span><b class="num">${st.media}</b><small>${st.ant?varTxt(st.media,st.ant.media)+' que '+mesNome(st.ant.mes).split(' ')[0]:'nos dias de expediente'}</small></div>
        <div><span>Adesão</span><b class="num">${st.ades}%</b><small>de quem estava na empresa almoçou</small></div><div><span>Pessoas que almoçaram</span><b class="num">${st.pessoas}</b><small>${st.semCad?st.semCad+' sem cadastro no RH':'todas no cadastro do RH'}</small></div><div class="${st.semJust?'alm-kw':''}"><span>Faltas sem justificativa</span><b class="num">${st.semJust}</b><small>vezes que alguém veio e não almoçou · ${st.just} justificadas · ${st.fora} não almoçam aqui</small></div></div>`:''}</section>`;
    if(!D||!ds.length&&!Object.keys((A.aj[A.mes]||{}).aj||{}).length) return topo+`<section class="card"><div class="empty"><b>Nenhum dado do Face ID em ${esc(mesNome(A.mes))}</b><span>Importe o CSV "Acessos Gerais" do Control iD (o robô do Face ID também manda sozinho, quando está ligado). As ausências no almoço já podem ser programadas.</span><span class="rh-vzb"><button class="btn sec" data-act="alm-aus">${P.ic('mais',16,2.4)}Ausência no almoço</button><label class="btn" for="alm-arq" style="cursor:pointer">${P.ic('baixar',16,2.2)}Importar do Face ID</label></span></div></section>`+vAus(c);
    const abas=c.fixo?'':`<div class="seg" role="group"><button data-act="alm-vis" data-v="dia" aria-pressed="${A.vis==='dia'}">Por dia</button><button data-act="alm-vis" data-v="mes" aria-pressed="${A.vis==='mes'}">Fechamento do mês</button></div>`; /* 30/10: Pontualidade e Diretoria viraram telas próprias (Relatórios) */
    if(A.vis==='pont') return topo+`<section class="card">${abas?`<div class="alm-f">${abas}</div>`:''}<div class="alm-f alm-f2">
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
    return topo+(c.fixo?'':vNotaMes(c))+`<section class="card">${filtros}${vMes(c,ds,ps)}</section>`+vPessoa(c,ds)+vJust(c)+vAus(c); }
  function mesAnt(m){ const [y,mm]=m.split('-').map(Number), d=new Date(y,mm-2,1); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
  const varTxt=(a,b)=>{ if(!b) return ''; const v=Math.round((a-b)/b*100); return v===0?'igual':(v>0?'▲ '+v+'% a mais':'▼ '+(-v)+'% a menos'); };
  /* números do mês (sempre de todos, sem os filtros da tela) */
  function stats(m){ const D=A.dados[m]; if(!D) return null; const ds=Object.keys(D.dias||{}).sort(); if(!ds.length) return null; const ps=(()=>{ const q=A.q, e=A.emp, se=A.setor; A.q=''; A.emp=''; A.setor=''; const r=pessoasDoMes(m); A.q=q; A.emp=e; A.setor=se; return r; })();
    const pd=ds.map(d=>{ let pres=0, alm=0, caf=0, sj=0, jj=0; ps.forEach(p=>{ const s=situacao(m,d,p.k); if(s.v!=='aus'&&s.v!=='fora') pres++; if(s.v==='sim') alm++; if(s.v==='nao') sj++; if(s.v==='just') jj++; if(s.x&&s.x.c) caf++; }); return {d,pres,alm,caf,sj,jj}; });
    const mx=Math.max(...pd.map(x=>x.pres)), lim=Math.max(5,mx*0.4), exp=pd.filter(x=>x.pres>=lim);
    const tot=pd.reduce((s,x)=>s+x.alm,0), media=exp.length?Math.round(exp.reduce((s,x)=>s+x.alm,0)/exp.length):0, ades=exp.length?Math.round(exp.reduce((s,x)=>s+x.alm,0)/Math.max(1,exp.reduce((s,x)=>s+x.pres,0))*100):0;
    const quem=ps.filter(p=>ds.some(d=>situacao(m,d,p.k).v==='sim')); const porEmp={}; quem.forEach(p=>{ const e=empCurta(p.emp); const x=(porEmp[e]=porEmp[e]||{e,alm:0,pessoas:0}); x.pessoas++; x.alm+=ds.filter(d=>situacao(m,d,p.k).v==='sim').length; });
    const SEM=['seg','ter','qua','qui','sex','sáb']; const porSem=SEM.map(w=>{ const xs=exp.filter(x=>semana(x.d)===w); return {w,m:xs.length?Math.round(xs.reduce((s,x)=>s+x.alm,0)/xs.length):0,n:xs.length}; }).filter(x=>x.n);
    const ajN=Object.entries((A.aj[m]||{}).aj||{}).filter(([kk,x])=>x.v!=='just'&&/^cafe:/.test(kk)===RC()).length, C=cfg(), valor=+C.valor||0;
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
      const D=P.pdf.novo(fxCafe('Almoço · '+mesNome(st.m)),'Refeitório pelo Face ID · dados de '+br(st.de)+' a '+br(st.ate),img), doc=fxDoc(D.doc), M=D.M;
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
      doc.setProperties({title:'Almoço '+mesNome(st.m)}); D.fim(arqRef('Almoco-')+st.m+'.pdf'); P.toast('Relatório em PDF baixado.'); }
    catch(e){ console.warn('[almoço] pdf',e); P.toast('Não consegui gerar o PDF: '+((e&&e.message)||e)); }
    finally{ A.pdf=false; P.rerender(); } }
  /* ---------- apresentação (PowerPoint) ---------- */
  /* PowerPoint (03/11: "não está baixando"): tenta 3 endereços do gerador, um depois do outro; endereço que falhou não fica "preso" na página */
  const PPT_URLS=['https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js','https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js','https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'];
  function pptUm(src){ return new Promise((ok,er)=>{ [...document.scripts].filter(x=>x.src===src&&!window.PptxGenJS).forEach(x=>x.remove()); const sc=document.createElement('script'); sc.src=src; const t=setTimeout(()=>{ sc.remove(); er(new Error('demorou')); },20000);
    sc.onload=()=>{ clearTimeout(t); window.PptxGenJS?ok():er(new Error('carregou sem o gerador')); }; sc.onerror=()=>{ clearTimeout(t); sc.remove(); er(new Error('não carregou')); }; document.head.appendChild(sc); }); }
  async function pptCarrega(){ for(const u of PPT_URLS){ try{ await pptUm(u); if(window.PptxGenJS) return; }catch(e){ console.warn('[almoço] ppt',u,e&&e.message); } }
    throw new Error('o gerador de PowerPoint não carregou (internet ou bloqueio da rede). Tente de novo ou use o Relatório em PDF.'); }
  async function gerarPpt(){ const c=A.ctx, P=c.P, st=stats(A.mes); if(!st) return; A.ppt=true; P.rerender();
    try{ if(!window.PptxGenJS) await pptCarrega();
      const pp=new PptxGenJS(); if(RC()){ const ad=pp.addSlide.bind(pp); pp.addSlide=(...a)=>{ const sl=ad(...a); ['addText','addTable','addChart','addNotes'].forEach(f=>{ const o=sl[f]; if(typeof o==='function') sl[f]=(...b)=>o.apply(sl,fxDeep(b)); }); return sl; }; } pp.layout='LAYOUT_WIDE'; pp.title='Refeitório · '+mesNome(st.m); pp.company='Colafix';
      const T='1B5C7A', INK='1A1A1A', MU='6B6558', BG='F5F1E8', LT='C7DCE6', F='Segoe UI';
      const lg0=document.querySelector('.brand img'), logo=lg0&&/^data:image\//.test(lg0.src||'')?lg0:null, lw=1.6, lh=logo&&logo.naturalWidth?lw*logo.naturalHeight/logo.naturalWidth:0.45;
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
        s.addChart(pp.ChartType.bar,[{name:'Almoços',labels:st.porEmp.map(x=>String(x.e||'Sem empresa')).reverse(),values:st.porEmp.map(x=>x.alm).reverse()}] /* a primeira categoria fica embaixo: invertido para a maior ficar em cima */,{x:0.6,y:1.8,w:6,h:4.9,barDir:'bar',chartColors:[T],showValue:true,dataLabelFontSize:12,catAxisLabelFontSize:13,valAxisHidden:true,valGridLine:{style:'none'},catAxisLabelColor:INK});
        s.addText('Média de almoços por dia da semana',{x:6.9,y:1.35,w:6,h:0.4,fontFace:F,fontSize:16,bold:true,color:INK});
        s.addChart(pp.ChartType.bar,[{name:'Média',labels:st.porSem.map(x=>String(x.w||'')),values:st.porSem.map(x=>x.m)}],{x:6.9,y:1.8,w:5.8,h:4.9,chartColors:[T],showValue:true,dataLabelFontSize:12,catAxisLabelFontSize:13,valAxisHidden:true,valGridLine:{style:'none'},catAxisLabelColor:INK});
        s.addText(st.porEmp.map(x=>(x.e||'Sem empresa')+': '+x.pessoas+' pessoas').join('  ·  '),{x:0.6,y:6.6,w:12,h:0.35,fontFace:F,fontSize:11,color:MU}); }
      /* 5 observações */
      { const s=base('Observações',''); const ob=[st.cafe+' passagens no refeitório antes das '+cfg().cafeAte+' (café da manhã), fora da conta do almoço.',st.ajN?st.ajN+' '+(st.ajN===1?'dia foi corrigido':'dias foram corrigidos')+' à mão pelo RH.':'Nenhuma correção à mão no mês.',
          st.semCad?st.semCad+' pessoas que almoçaram ainda não estão no cadastro do RH (prestadores e terceirizados).':'Todas as pessoas que almoçaram estão no cadastro do RH.',st.semJust+' dias sem almoço e sem justificativa; '+st.just+' justificados; '+st.fora+' '+(st.fora===1?'pessoa não almoça':'pessoas não almoçam')+' na empresa (fora da conta da adesão).','Período dos dados: '+c.br(st.de)+' a '+c.br(st.ate)+'.'];
        s.addText(ob.map(t=>({text:t,options:{bullet:true,breakLine:true}})),{x:0.8,y:1.6,w:11.5,h:4.5,fontFace:F,fontSize:20,color:INK,paraSpaceAfter:12,valign:'top'}); }
      await pp.writeFile({fileName:arqRef('Refeitorio-')+st.m+'.pptx'}); P.toast('Apresentação baixada.'); }
    catch(e){ console.warn('[almoço] ppt',e); P.toast('Não consegui gerar a apresentação: '+((e&&e.message)||e)); }
    finally{ A.ppt=false; P.rerender(); } }
  function vDia(c,ds,ps,st){ const esc=c.esc, m=A.mes, d=A.dia;
    const L=ps.map(p=>Object.assign({s:situacao(m,d,p.k)},p)), g=v=>L.filter(x=>x.s.v===v), sim=g('sim'), nao=g('nao'), jus=g('just'), fora=g('fora'), pend=g('pend'), emCurso=almEmCurso(d);
    const tira=`<div class="alm-dias">${ds.map(x=>{ const ss=ps.map(p=>situacao(m,x,p.k).v), n=ss.filter(v=>v==='sim').length, sj=ss.filter(v=>v==='nao').length; return `<button data-act="alm-dia" data-v="${x}" aria-pressed="${x===d}" title="${n} almoçaram · ${sj} sem justificativa"><small>${semana(x)}</small><b>${x.slice(8)}</b><span>${n}</span>${sj?`<em>${sj}</em>`:''}</button>`; }).join('')}</div>`;
    const info=x=>[empCurta(x.emp),x.setor].filter(Boolean).join(' · ')+(x.cad?'':' · sem cadastro no RH');
    const lin=(x,extra,bt)=>`<div class="alm-l" data-b="${esc(almChave(x))}"><div><button class="lnk alm-nm" data-act="alm-pes" data-k="${x.k}">${esc(x.nome)}</button><small>${esc(info(x))}</small>${extra||''}</div>
      <div class="alm-r">${x.s.x&&x.s.x[RFL()]?`<span class="num">${esc(x.s.x[RFL()])}</span>`:''}<!--nofx-->${RC()?(x.s.x&&x.s.x.a?`<small>almoço ${esc(x.s.x.a)}</small>`:''):(x.s.x&&x.s.x.c?`<small>café ${esc(x.s.x.c)}</small>`:'')}<!--/nofx-->${x.s.aj?`<small title="${esc(x.s.aj.mot||'')}">corrigido por ${esc(x.s.aj.por||'')}</small>`:''}${bt}</div></div>`;
    const jtx=x=>`<span class="alm-jt">${esc(x.s.j.tipo||'Justificado')}${x.s.j.mot?' · '+esc(x.s.j.mot):''}<small> · ${esc(x.s.j.por||'')}</small></span>`;
    const bloco=(cls,tit,xs,mk,vazio)=>!A.sit||A.sit===cls?`<div class="alm-bl ${cls}"><div class="label">${tit} <b>(${xs.length})</b></div>${xs.map(mk).join('')||`<div class="sub">${vazio}</div>`}</div>`:'';
    const blPend=pend.length?bloco('pend','AINDA NÃO ALMOÇARAM · ALMOÇO ATÉ '+esc(cfg().fim||'14:30'),pend,x=>lin(x,'',`<button class="lnk" data-act="alm-jus" data-k="${x.k}" data-d="${d}">justificar</button>`),''):'';
    const blSim=bloco('sim','ALMOÇARAM',sim,x=>lin(x,'',`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="nao">não almoçou</button>`),'Ninguém.');
    const blNao=bloco('nao','NÃO ALMOÇARAM · SEM JUSTIFICATIVA',nao,x=>lin(x,'',`<button class="btn sec rh-sm" data-act="alm-jus" data-k="${x.k}" data-d="${d}">Justificar</button><button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="sim">almoçou</button>`),'Ninguém. Tudo justificado.'), blJus=bloco('just','JUSTIFICADOS',jus,x=>lin(x,jtx(x),`<button class="lnk" data-act="alm-jus" data-k="${x.k}" data-d="${d}">alterar</button>`),'Nenhuma justificativa neste dia.'), blMais=(!A.sit||A.sit==='fora'?`<details class="alm-bl fora" ${A.sit==='fora'?'open':''}><summary class="label">NÃO ALMOÇAM NA EMPRESA <b>(${fora.length})</b></summary>${fora.map(x=>lin(x,`<span class="alm-jt">${esc(foraDe(x.k).mot||'Não almoça na empresa')}</span>`,'')).join('')||'<div class="sub">Ninguém marcado. Para marcar, clique no nome da pessoa.</div>'}</details>`:'')
      +(!A.sit?`<details class="alm-bl aus"><summary class="label">AUSÊNCIAS PROGRAMADAS <b>(${ausAtivas().length})</b></summary>${ausLista(c,null)}</details>`:'');
    /* RH revisado (opção 2): o dia em destaque — tira dos dias, números do dia e três colunas */
    const pres=L.filter(x=>x.s.v!=='aus'&&x.s.v!=='fora').length, pc=pres?Math.round(sim.length/pres*100):0, R$=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const kpi=`<div class="alm-v2k"><div><span>Almoçaram${emCurso?' até agora':''}</span><b class="num">${sim.length} <small>de ${pres} na empresa</small></b>${(()=>{ if(!cafeKs(m)) return ''; const LS=listaDia(c,d); return `<small class="alm-fxk">${LS.total-LS.marc} na folha para assinar${LS.ausentes.length?` · ${LS.ausentes.length} da folha sem Face ID hoje`:''}</small>`; })()}<i class="alm-v2b"><em style="width:${pc}%"></em></i></div>
      <div class="${nao.length?'w':''}"><span>Sem justificativa</span><b class="num">${nao.length}</b><small>${emCurso?pend.length+' ainda não almoçaram · até '+esc(cfg().fim||'14:30'):nao.length?'vão para o desconto':'tudo certo neste dia'}</small></div>
      <div><span>Justificados</span><b class="num">${jus.length}</b><small>${jus.length?esc([...new Set(jus.map(x=>(x.s.j&&x.s.j.tipo)||'Justificado'))].slice(0,3).join(' · ')):'nenhum'}${fora.length?' · '+fora.length+' não almoçam aqui':''}</small></div>
      <div><span>Almoços no mês</span><b class="num">${st?st.tot.toLocaleString('pt-BR'):0}</b><small>${st&&st.valor?'custo '+R$(st.custo)+(st.vdesc?' · descontos '+R$(st.descontos):''):'informe o valor da refeição em Cadastros › Configurações'}</small></div></div>`;
    const blSim2=!A.sit||A.sit==='sim'?`<div class="alm-bl sim alm-v2s"><div class="label">ALMOÇARAM <b>(${sim.length})</b></div>${sim.map(x=>lin(x,'',`<button class="lnk" data-act="alm-aj" data-k="${x.k}" data-v="nao">não almoçou</button>`)).join('')||'<div class="sub">Ninguém.</div>'}</div>`:'';
    const blSf=(()=>{ if(!cafeKs(m)||(A.sit&&A.sit!=='nao')) return ''; const sf=listaDia(c,d).ausentes.filter(x=>situacao(m,d,x.k).v==='aus'); if(!sf.length) return '';
      return `<div class="alm-bl nao alm-sf"><div class="label">NA FOLHA E SEM FACE ID HOJE <b>(${sf.length})</b></div><div class="sub" style="font-size:12.5px;margin:-2px 0 6px">Estão na folha para assinar. Marque se almoçou, justifique ou diga que não veio.</div>${sf.map(x=>`<div class="alm-l" data-b="${esc(nrm(x.nome))}"><div><b class="alm-fxn">${esc(x.nome)}</b><small>${esc(x.motivo)}</small></div><div class="alm-r"><button class="btn sec rh-sm" data-act="alm-jus" data-k="${esc(x.k)}" data-d="${d}">Justificar</button><button class="lnk" data-act="alm-aj" data-k="${esc(x.k)}" data-v="sim">almoçou</button><button class="lnk" data-act="alm-fxnv" data-n="${esc(x.nome)}">não veio</button></div></div>`).join('')}</div>`; })();
    const col1=(pend.length?blPend:'')+(pend.length?(nao.length?blNao:''):blNao)+blSf+blJus;
    return `${tira}${RC()?'':avisoParcial(c,m,d)+avisoSemRef(c,m,d)}<div class="alm-dt"><h3>${esc(c.br(d))} · ${semana(d)}</h3><span class="pill ok">${sim.length} almoçaram${emCurso?' até agora':''}</span>${emCurso?`<span class="pill">${pend.length} ainda não almoçaram · almoço até ${esc(cfg().fim||'14:30')}</span>`:''}${nao.length||!emCurso?`<span class="pill warn">${nao.length} sem justificativa</span>`:''}${jus.length?`<span class="pill">${jus.length} justificados</span>`:''}${fora.length?`<span class="pill">${fora.length} não almoçam aqui</span>`:''}</div>${kpi}
      ${contaFolha(c,m,d)}${emCurso?`<div class="alm-emcurso">Almoço em andamento: quem ainda não passou no refeitório só vira “sem justificativa” depois das ${esc(cfg().fim||'14:30')}.</div>`:''}
      <div class="alm-v2g"><div class="alm-v2c">${col1}</div><div class="alm-v2c">${blSim2}</div><div class="alm-v2c alm-v2r">${folhasPaineis(c,d)}${blMais.replace('<details class="alm-bl aus">','<details class="alm-bl aus" open>')}</div></div>${foraLista(c,m,d)}`; }
  /* ---------- 03/11: quem passou no Face ID no dia e não está na lista da folha (não conta no almoço/café) ---------- */
  function foraLista(c,m,d){ const ks=cafeKs(m); if(!ks) return ''; const esc=c.esc, dia=((A.dados[m]||{}).dias||{})[d]||{};
    const L=pessoasDoMes(m,true).filter(p=>dia[p.k]&&!ks.has(p.k)).map(p=>Object.assign({x:dia[p.k]},p,{nome:titulo(String(p.nome).toLowerCase())}));
    A.fx=A.fx||{q:'',e:'',s:''}; const F=A.fx, emps=[...new Set(L.map(p=>empCurta(p.emp)||'Sem empresa'))].sort();
    if(F.e&&!emps.includes(F.e)) F.e='';
    const hr=x=>{ const t=(x.t||[]).map(v=>String(v).slice(0,5)).sort(); return t.length?t[0]+(t.length>1?' – '+t[t.length-1]:''):''; };
    const rows=L.map(p=>{ const r=p.x[RFL()], e=empCurta(p.emp)||'Sem empresa', b=nrm(p.nome+' '+e+' '+(p.setor||'')+' '+p.k);
      return `<div class="alm-l alm-fxr" data-fxb="${esc(b)}" data-fxe="${esc(e)}" data-fxs="${r?'sim':'nao'}"><div><b class="alm-fxn">${esc(p.nome)}</b><small>${esc([e,p.setor].filter(Boolean).join(' · '))}${p.cad?'':' · sem cadastro no RH'}</small></div>
        <div class="alm-r">${r?`<span class="pill ok">almoçou ${esc(r)}</span>`:'<span class="pill">não almoçou</span>'}${hr(p.x)?`<small>na empresa ${esc(hr(p.x))}</small>`:''}<button class="btn sec rh-sm" data-act="alm-fxadd" data-n="${esc(p.nome)}">Pôr na lista</button></div></div>`; }).join('');
    const nSim=L.filter(p=>p.x[RFL()]).length;
    const LS=listaDia(c,d), semFid=LS.ausentes, nT=LS.total;
    const sfH=semFid.length?`<details class="alm-bl alm-fx alm-fx2" ${A.fx2Ab?'open':''}><summary class="label" data-act="alm-fx2ab">NA LISTA DA FOLHA E NÃO PASSARAM NO FACE ID HOJE <b>(${semFid.length})</b> <small>· ${nT} na folha · ${LS.marc} marcados na folha · ${nT-LS.marc} para assinar</small></summary>
      <div class="sub" style="margin:4px 0 10px">Estão na folha para assinar, mas não contam no “de N” do alto (que é quem passou no Face ID hoje). Se não vieram, marque “não veio” na folha; se o nome não está ligado ao Face ID, toque no nome na lista fixa para ligar.</div>
      <div class="alm-fxl">${semFid.map(x=>`<div class="alm-l"><div><b>${esc(x.nome)}</b><small>${x.motivo}</small></div></div>`).join('')}</div></details>`:'';
    return `<details class="alm-bl alm-fx" ${A.fxAb?'open':''}><summary class="label" data-act="alm-fxab">PASSARAM NO FACE ID E NÃO ESTÃO NA LISTA DA FOLHA <b>(${L.length})</b>${L.length?` <small>· ${nSim} almoçaram · ${L.length-nSim} não almoçaram</small>`:''}</summary>
      <div class="sub" style="margin:4px 0 10px">Essas pessoas não contam nos números do dia, no fechamento nem no desconto. Para contar, toque em “Pôr na lista”.</div>
      ${L.length?`<div class="alm-fxf"><input class="txt" id="alm-fxq" type="search" placeholder="Procurar por nome, empresa, setor ou CPF" value="${esc(F.q)}" aria-label="Procurar">
        <select class="txt" id="alm-fxe" aria-label="Empresa"><option value="">Todas as empresas</option>${emps.map(e=>`<option ${F.e===e?'selected':''}>${esc(e)}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Situação">${[['','Todos'],['sim','Almoçaram'],['nao','Não almoçaram']].map(([v,t])=>`<button data-act="alm-fxs" data-v="${v}" aria-pressed="${F.s===v}">${t}</button>`).join('')}</div>
        <span class="sub" id="alm-fxn"></span></div><div class="alm-fxl">${rows}</div>`:'<div class="sub">Ninguém fora da lista neste dia.</div>'}</details>${sfH}`; }
  /* quem está na lista da folha (do almoço ou do café, conforme a escolha) e não passou no Face ID no dia */
  function listaDia(c,d){ const sv=FK; fkUsa(RC()?'cafe':'alm'); try{ const F=folhaEst(c,d), L=folhaPessoas0(c,d).L.filter(x=>!(F.tirar||{})[x.nome]);
      const mk=x=>!!fMarca(F,x), marc=L.filter(mk).length;
      const aus=L.filter(x=>!x.passou&&!mk(x)).map(x=>({nome:x.nome,k:x.k||nomeK(x.nome),ligado:!!x.k,motivo:x.ferias?'de férias':!x.k?'não está ligado a ninguém do Face ID (terceiro, motorista ou nome diferente)':!x.fid?'sem passagem no Face ID neste mês':'não passou no Face ID hoje'}));
      return {total:L.length,marc,ausentes:aus,passou:L.filter(x=>x.passou&&!mk(x)).map(x=>({nome:x.nome,k:x.k}))}; } finally{ fkUsa(sv); } }
  /* 03/11: a conta da folha fecha — para assinar = almoçaram + ainda não/sem justificativa + justificados + … + não passaram no Face ID */
  function contaFolha(c,m,d){ if(!cafeKs(m)) return ''; const esc=c.esc, LS=listaDia(c,d), T=LS.total-LS.marc; const n={sim:0,pend:0,nao:0,just:0,outro:0};
    LS.passou.forEach(x=>{ const v=x.k?situacao(m,d,x.k).v:'outro'; n[n[v]!=null?v:'outro']++; }); let sf=0; LS.ausentes.forEach(x=>{ const v=situacao(m,d,x.k).v; if(v==='sim'||v==='just'||v==='nao') n[v]++; else sf++; });
    const it=[[n.sim,'almoçaram','ok'],[n.pend,'ainda não almoçaram',''],[n.nao,'sem justificativa','warn'],[n.just,'justificados',''],[n.outro,'outros que passaram no Face ID',''],[sf,'na folha e sem Face ID (para marcar)','crit']].filter(x=>x[0]);
    return `<div class="alm-conta"><span class="alm-ctt">Folha para assinar <b class="num">${T}</b></span><span class="alm-cteq">=</span>${it.map((x,i)=>`${i?'<span class="alm-cteq">+</span>':''}${x[2]==='crit'?`<button class="alm-cti ${x[2]}" data-act="alm-fx2go"><b class="num">${x[0]}</b> ${x[1]}</button>`:`<span class="alm-cti ${x[2]}"><b class="num">${x[0]}</b> ${x[1]}</span>`}`).join('')}${LS.marc?`<span class="alm-ctm">· ${LS.marc} marcados na folha (não veio, férias, não almoça) e ${LS.total} nomes na lista</span>`:''}</div>`; }
  function fxFiltra(){ const F=A.fx||{}, ws=nrm(F.q).split(/\s+/).filter(Boolean), dq=String(F.q||'').replace(/\D/g,''); let n=0, t=0;
    document.querySelectorAll('#view .alm-fxr').forEach(el=>{ const b=el.dataset.fxb||''; const ok=(!ws.length||ws.every(w=>b.includes(w))||(dq.length>=3&&b.includes(dq)))&&(!F.e||el.dataset.fxe===F.e)&&(!F.s||el.dataset.fxs===F.s); el.hidden=!ok; t++; if(ok) n++; });
    const q=document.getElementById('alm-fxn'); if(q) q.textContent=(F.q||F.e||F.s)?n+' de '+t:''; }
  document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='alm-fxq'){ A.fx=A.fx||{}; A.fx.q=t.value; fxFiltra(); } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='alm-fxe'){ A.fx=A.fx||{}; A.fx.e=t.value; fxFiltra(); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="alm-fx"]'); if(!b||!A.ctx) return; const c=A.ctx, P=c.P, a=b.dataset.act;
    if(a==='alm-fxab'){ ev.preventDefault(); A.fxAb=!A.fxAb; b.parentElement.open=A.fxAb; return; }
    if(a==='alm-fx2go'){ const sf=document.querySelector('.alm-sf'); if(sf){ sf.scrollIntoView({behavior:'smooth',block:'start'}); sf.classList.add('alm-pisca'); setTimeout(()=>sf.classList.remove('alm-pisca'),1600); return; } A.fx2Ab=true; const el=document.querySelector('.alm-fx2'); if(el){ el.open=true; el.scrollIntoView({behavior:'smooth',block:'start'}); } return; }
    if(a==='alm-fxnv'){ const sv=FK; fkUsa(RC()?'cafe':'alm'); try{ const F=folhaEst(c,A.dia); F.nv[b.dataset.n]='Não veio'; if(F.emit) F.emit.mudou=true; await folhaSalvar(c,A.dia); } finally{ fkUsa(sv); } P.toast(b.dataset.n+': marcado “não veio” na folha.'); P.render(); return; }
    if(a==='alm-fx2ab'){ ev.preventDefault(); A.fx2Ab=!A.fx2Ab; b.parentElement.open=A.fx2Ab; return; }
    if(a==='alm-fxs'){ A.fx=A.fx||{}; A.fx.s=b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); fxFiltra(); return; }
    if(a==='alm-fxadd'){ const nm=b.dataset.n, cafe=RC(); b.disabled=true;
      try{ const cfg0=(c.R.cfg||{}), cur=cafe?((cfg0.cafe||{}).lista||listaCafe()):(((cfg0.almoco||{}).listaFolha)||[]), ns=[...cur];
        if(!ns.some(x=>fMesma(semPref(x),nm))) ns.push(nm);
        if(cafe){ const cf=Object.assign({},cfg0.cafe||{},{lista:ns,em:new Date().toISOString(),por:c.eu?c.eu():''}); await P.db().doc('rh/config').set({cafe:cf},{merge:true}); c.R.cfg=c.R.cfg||{}; c.R.cfg.cafe=cf; }
        else { const al=Object.assign({},cfg0.almoco||{},{listaFolha:ns}); await P.db().doc('rh/config').set({almoco:al},{merge:true}); c.R.cfg=c.R.cfg||{}; c.R.cfg.almoco=al; }
        if(A.folha) A.folha.rasc=null; P.toast(nm+' entrou na lista da folha '+(cafe?'do café':'do almoço')+'.'); P.render(); }
      catch(e){ b.disabled=false; P.toast('Não foi possível pôr na lista: '+((e&&e.message)||e)); } return; } });
  { const v0=document.getElementById('view'); if(v0) new MutationObserver(()=>{ if(document.querySelector('#view .alm-fxr')&&A.fx&&(A.fx.q||A.fx.e||A.fx.s)) fxFiltra(); }).observe(v0,{childList:true}); }
  try{ document.head.insertAdjacentHTML('beforeend','<style id="alm-fx-css">.alm-fx{margin-top:14px}.alm-fx>summary{cursor:pointer;list-style:none;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.alm-fx>summary::before{content:"▸";margin-right:4px}.alm-fx[open]>summary::before{content:"▾"}.alm-fxf{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.alm-fxf #alm-fxq{flex:1 1 260px;min-width:200px}.alm-fxf select{width:auto}.alm-fxl{columns:2 520px;column-gap:18px}.alm-fxl .alm-l{break-inside:avoid}.alm-fxr[hidden]{display:none}.alm-conta{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 14px;margin:10px 0;font-size:14px}.alm-ctt{font-weight:600}.alm-ctt b{font-size:20px;margin-left:4px}.alm-cteq{color:var(--muted);font-weight:600}.alm-cti{display:inline-flex;gap:5px;align-items:baseline;padding:3px 10px;border-radius:999px;background:var(--surface-2,#f1f3f5);border:0;font:inherit;color:inherit}.alm-cti b{font-size:16px}.alm-cti.ok{background:#E3F1E7}.alm-cti.warn{background:#FBEBDD}.alm-cti.crit{background:#F6E2E0;cursor:pointer;text-decoration:underline dotted}.alm-pisca{box-shadow:0 0 0 3px var(--crit)}.alm-sf{border-left:3px solid var(--crit)}.alm-ctm{color:var(--muted);font-size:12.5px;flex-basis:100%}</style>'); }catch(e){}
  /* ---------- justificativa (janela) ---------- */
  function vJust(c){ const J=A.jus; if(!J) return ''; const esc=c.esc, aj=((A.aj[J.d.slice(0,7)]||{}).aj||{})[ajK(J.d,J.k)], cur=aj&&aj.v==='just'?aj:null; const tipos=cfg().just||JUST_PADRAO;
    if(J.tipo===undefined){ J.tipo=cur?cur.tipo:''; J.mot=cur?cur.mot||'':''; }
    const nome=(pessoasDoMes(A.mes).find(p=>p.k===J.k)||{}).nome||'';
    return `<div class="rh-modal" data-act="alm-jusx-fundo"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Justificar" style="max-width:520px"><div class="rh-ch"><h2>Justificar · ${esc(nome)}</h2><button class="lnk" data-act="alm-jusx">Fechar</button></div>
      <div class="sub" style="margin:-4px 0 10px">${esc(c.br(J.d))} · ${semana(J.d)}. A pessoa continua sem almoço nesse dia, mas não conta como falta sem justificativa.</div>
      <div class="alm-jtipos">${tipos.map(t=>`<button class="${J.tipo===t?'on':''}" data-act="alm-jtipo" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <label style="display:block;margin-top:12px"><span class="label">Observação ${J.tipo==='Outro'?'(diga o motivo)':'(opcional)'}</span><input class="txt" id="alm-jmot" maxlength="120" value="${esc(J.mot||'')}" placeholder="ex.: autorizado pelo supervisor"></label>
      ${J.erro?`<p class="err" style="color:var(--crit-ink)">${esc(J.erro)}</p>`:''}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap">${cur?'<button class="lnk" data-act="alm-jrem" style="color:var(--crit-ink)">Tirar a justificativa</button>':'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="alm-jusx">Cancelar</button><button class="btn" data-act="alm-jsalvar">Salvar</button></div></div></div></div>`; }
  async function gravaAj(k,d,it){ const c=A.ctx, P=c.P, m=d.slice(0,7), ref=P.db().doc('rh/dados/almocoaj/'+m), cur=A.aj[m]||{mes:m,aj:{},log:[]};
    const aj=Object.assign({},cur.aj||{}); if(it) aj[ajK(d,k)]=it; else delete aj[ajK(d,k)];
    const log=(cur.log||[]).concat([Object.assign({chave:ajK(d,k),ref:RFL(),por:c.eu(),em:new Date().toISOString()},it||{v:'removido'})]).slice(-500);
    await ref.set({mes:m,aj,log}); A.aj[m]=Object.assign({},cur,{aj,log}); }
  async function marcarFora(k,on){ const c=A.ctx, P=c.P; let mot='';
    if(on){ mot=prompt(RC()?'Por que não toma café na empresa? (ex.: toma café em casa, chega depois do café, outro turno)':'Por que não almoça na empresa? (ex.: almoça em casa, traz marmita e come fora, outro turno)'); if(mot===null) return; }
    const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}), fora=Object.assign({},al[RK('fora')]||{});
    fora[k]=on?{mot:String(mot).trim().slice(0,120),por:c.eu(),em:new Date().toISOString()}:Object.assign({},fora[k]||{},{removido:true,remPor:c.eu(),remEm:new Date().toISOString()});
    al[RK('fora')]=fora; try{ await P.db().doc('rh/config').set({almoco:al},{merge:true}); if(c.R.cfg) c.R.cfg.almoco=al; P.toast(fxCafe(on?'Marcado: não almoça na empresa. Não aparece mais como falta.':'Volta a contar no almoço.')); P.rerender(); }catch(e){ P.erro(e); } }
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
  async function gravaAus(lista){ const c=A.ctx, P=c.P, al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}); al[RK('ausencias')]=lista.slice(-300);
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
  async function ajustar(k,d,v){ const c=A.ctx, P=c.P, m=d.slice(0,7); const mot=prompt(fxCafe(v==='sim'?'Motivo (ex.: almoçou sem passar o rosto):':'Motivo (ex.: passou no refeitório mas não almoçou):')); if(mot===null) return;
    const ref=P.db().doc('rh/dados/almocoaj/'+m); const cur=A.aj[m]||{mes:m,aj:{},log:[]}; const it={v,mot:String(mot).trim().slice(0,120),por:c.eu(),em:new Date().toISOString()};
    const aj=Object.assign({},cur.aj||{}); aj[ajK(d,k)]=it; const log=(cur.log||[]).concat([Object.assign({chave:ajK(d,k),ref:RFL()},it)]).slice(-500);
    try{ await ref.set({mes:m,aj,log}); P.toast('Ajuste guardado.'); }catch(e){ P.erro(e); } }
  /* ---------- relatórios no padrão (30/10): os filtros da tela (empresa, setor, situação e busca) valem no PDF e no Excel ---------- */
  function qOk(p){ const ws=nrm(A.q).split(/\s+/).filter(Boolean), dq=String(A.q||'').replace(/\D/g,''), b=almChave(p); return !ws.length||ws.every(w=>b.includes(w))||(dq.length>=3&&b.slice(-11).includes(dq)); }
  const SIT_NOME={sim:'Almoçou',nao:'Sem almoço e sem justificativa',just:'Justificado',fora:'Não almoça na empresa'};
  const almFiltros=()=>[A.emp&&'Empresa: '+(A.emp==='-'?'sem empresa':empCurta(A.emp)),A.setor&&'Setor: '+(A.setor==='-'?'sem setor':A.setor),A.sit&&'Situação: '+(SIT_NOME[A.sit]||A.sit),A.q&&'Busca: '+A.q].filter(Boolean);
  async function mesPdf(){ const c=A.ctx, P=c.P, D=A.dados[A.mes]; if(!D) return; const ds=Object.keys(D.dias||{}).sort(), G=grade(ds,pessoasDoMes(A.mes)).filter(g=>qOk(g.p)), vd=+cfg().valorDesc||0, R$=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const s=k=>G.reduce((a,g)=>a+g[k],0); if(!window.RHRel) return P.toast('O gerador de relatórios ainda não carregou.');
    try{ await RHRel.pdf(fxDeep({tit:'Almoço · fechamento de '+mesNome(A.mes),sub:'Refeitório pelo Face ID · '+(ds.length?c.br(ds[0])+' a '+c.br(ds[ds.length-1]):'sem dados'),filtros:almFiltros(),arq:arqRef('Almoco-fechamento-')+A.mes,
      kpis:[{t:'Pessoas',v:String(G.length),s:'na lista',c:'pet'},{t:'Almoços',v:s('tot').toLocaleString('pt-BR'),s:ds.length+' dias com Face ID',c:'teal'},{t:'Sem justificativa',v:String(s('sj')),s:vd?'desconto '+R$(s('sj')*vd):'veio e não almoçou',c:s('sj')?'crit':'ok'},{t:'Justificados',v:String(s('jj')),s:'médico, saiu cedo, ausência…',c:'cinza'}],
      partes:[{secao:'Por pessoa',nota:'dias na empresa = dias com passagem no Face ID',cols:[{t:'Nome',w:52},{t:'Empresa',w:24},{t:'Setor',w:24},{t:'Na empresa',w:16,al:'r'},{t:'Almoços',w:15,al:'r'},{t:'Sem just.',w:15,al:'r'},{t:'Justif.',w:13,al:'r'}].concat(vd?[{t:'Desconto',w:20,al:'r'}]:[]),
        rows:G.map(g=>{ const r=[g.p.nome,empCurta(g.p.emp),g.p.setor||'—',String(g.pres),String(g.tot),String(g.sj),String(g.jj)].concat(vd?[g.sj?R$(g.sj*vd):'—']:[]); if(g.sj) r._cor={5:'crit'}; return r; })
          .concat(G.length?[Object.assign(['Total','','',String(s('pres')),String(s('tot')),String(s('sj')),String(s('jj'))].concat(vd?[R$(s('sj')*vd)]:[]),{_tot:1})]:[]),vazio:'Ninguém com estes filtros.'}],assina:'Conferido por (RH)'})); }catch(e){ P.toast(String(e&&e.message||e)); } }
  async function excel(){ const c=A.ctx, D=A.dados[A.mes]; const ds=Object.keys(D.dias||{}).sort(), G=grade(ds,pessoasDoMes(A.mes)).filter(g=>qOk(g.p));
    const cab=['Nome','CPF','Empresa','Setor'].concat(ds.map(d=>d.slice(8)+'/'+d.slice(5,7)),['Almoços','Sem justificativa','Justificados','Dias na empresa'].concat(+cfg().valorDesc?['Desconto (R$)']:[]));
    const L=[cab].concat(G.map(g=>[g.p.nome,c.fCPF(g.p.k),empCurta(g.p.emp),g.p.setor].concat(g.v.map(s=>s.v==='sim'?1:s.v==='nao'?0:s.v==='just'?'J':s.v==='fora'?'F':''),[g.tot,g.sj,g.jj,g.pres].concat(+cfg().valorDesc?[Math.round(g.sj*(+cfg().valorDesc)*100)/100]:[]))));
    if(window.RHRel) return RHRel.xls(arqRef('Almoco-')+A.mes,fxDeep([['Almoço '+A.mes,L]]),fxDeep({tit:'Almoço · '+mesNome(A.mes),sub:'1 = almoçou · 0 = sem almoço e sem justificativa · J = justificado · F = não almoça na empresa',filtros:almFiltros()}));
    if(!window.XLSX) await c.carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const ws=XLSX.utils.aoa_to_sheet(fxDeep(L)); ws['!cols']=cab.map((_,i)=>({wch:i===0?32:i<4?16:i>=cab.length-2?14:6})); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,fxCafe('Almoço '+A.mes));
    c.baixar(new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),arqRef('Almoco-')+A.mes+'.xlsx'); }
  function imprimir(){ const t=document.querySelector('.alm-tw'); if(!t) return; const w=window.open('','_blank'); if(!w) return;
    w.document.write(fxCafe(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Almoço ${mesNome(A.mes)}</title><style>body{font:11px Arial,sans-serif;margin:12mm}h1{font-size:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:2px 3px;text-align:center}td:first-child,th:first-child{text-align:left}small{display:block;color:#666;font-size:9px}@page{size:A4 landscape;margin:8mm}</style></head><body><h1>Almoço · ${mesNome(A.mes)}</h1>${t.innerHTML}</body></html>`));
    w.document.close(); setTimeout(()=>{ w.print(); },300); }

  /* ---------- eventos ---------- */
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="alm-"]'); if(!b||!A.ctx) return; const a=b.dataset.act, P=A.ctx.P;
    if(a==='alm-mes'){ const [y,m]=A.mes.split('-').map(Number), d=new Date(y,m-1+(+b.dataset.v),1); A.mes=d.getFullYear()+'-'+pad(d.getMonth()+1); A.dia=''; P.rerender(); return; }
    if(a==='alm-ref'){ A.ref=b.dataset.v==='cafe'?'cafe':'alm'; A.pes=null; A.jus=null; P.render(); return; }
    if(a==='alm-vis'){ A.vis=b.dataset.v; P.rerender(); return; }
    if(a==='alm-dia'){ A.dia=b.dataset.v; P.rerender(); return; }
    if(a==='alm-semleit'){ const d=b.dataset.d, on=b.dataset.v==='1', c=A.ctx, al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}), sl=Object.assign({},al[RK('semLeitura')]||{});
      if(on) sl[d]={por:c.eu(),em:new Date().toISOString(),mot:'O Face ID do refeitório não registrou o almoço neste dia'}; else if(sl[d]) sl[d]=Object.assign({},sl[d],{removido:true,removidoPor:c.eu(),removidoEm:new Date().toISOString()});
      al[RK('semLeitura')]=sl; P.db().doc('rh/config').set({almoco:al},{merge:true}).then(()=>{ if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; P.toast(on?'Dia marcado como refeitório sem leitura.':'Marcação desfeita.'); P.rerender(); }).catch(e=>{ console.warn('[almoço] sem leitura',e); P.toast('Não foi possível salvar.'); }); return; }
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
      cfgGrava(A.ctx,up).then(()=>{ P.toast('Valores guardados: '+(RC()?'café ':'refeição ')+(v?v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—')+' · desconto por falta '+(vd?vd.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—')+'.'); P.rerender(); }).catch(e=>P.erro(e)); return; } });
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
  /* 03/11: a folha do café usa o MESMO código da folha do almoço (lista fixa, conferência pelo Face ID, impressão, foto).
     FK = tipo ativo ('alm'|'cafe'); o estado de cada tipo (fol, folha, ff, folhaAb, fbusca, _wb) é trocado em A por fkUsa. */
  let FK='alm'; const FKS={alm:{},cafe:{}};
  function fkUsa(k){ if(!k||k===FK) return; const s0=FKS[FK]; ['fol','folha','ff','folhaAb','fbusca','_wb'].forEach(x=>{ s0[x]=A[x]; A[x]=FKS[k][x]; }); FK=k; }
  const fkCafe=()=>FK==='cafe', FW=()=>fkCafe()?'café':'almoço', FWU=()=>fkCafe()?'CAFÉ':'ALMOÇO';
  const cafeGrupo=n=>{ const t=String(n||'').trim(); return !!t&&t===t.toUpperCase()&&(/\//.test(t)||/^(ADM|PROD|MOTORISTAS?|TERCEIRIZAD[OA]S?|EXPEDI)/.test(t)); };
  function listaCafe(){ const cf=((A.ctx&&A.ctx.R.cfg&&A.ctx.R.cfg.cafe)||{}); if(Array.isArray(cf.lista)) return cf.lista; return (Array.isArray(cf.linhas)?cf.linhas:[]).map(x=>String(x||'').trim()).filter(x=>x&&!cafeGrupo(x)); }
  const listaFolha=()=>{ if(fkCafe()) return listaCafe(); const l=cfg().listaFolha; return Array.isArray(l)&&l.length?l:LISTA_BASE; };
  const folhaCol=()=>'rh/dados/'+(fkCafe()?'cafefolha':'almocofolha')+'/';
  const semPref=n=>String(n||'').replace(/^\s*(terceiros?|motorista)\s*-\s*/i,'');
  /* 05/11 ("deixe tudo conectado: quando desliga a pessoa pode tirar ela da lista"): quem saiu não entra na folha
     (desligado com saída antes do dia), mesmo antes de a lista fixa ser limpa; e o desligamento tira o nome das listas. */
  const deslDe=(f,d)=>!!f&&(/deslig|inativ|demiti|encerr/i.test(f.status||'')||(!!f.desligamento&&!f.desligAgendado))&&(!f.desligamento||f.desligamento<d);
  function flSaiu(c,nome,d){ const fs=c.R.func||[], b=semPref(nome); if(fs.some(f=>!deslDe(f,d)&&!/deslig|inativ/i.test(f.status||'')&&fMesma(b,titulo(f.nome||'')))) return null;
    return fs.find(f=>deslDe(f,d)&&fMesma(b,titulo(f.nome||'')))||null; }
  async function tiraDasListas(c,f){ c=c||A.ctx; if(!c||!f||!f.nome) return 0; if(!A.ctx) A.ctx=c; const P=c.P, nm=titulo(f.nome);
    const outros=(c.R.func||[]).filter(x=>x._id!==f._id&&!/deslig|inativ/i.test(x.status||'')&&!x.desligamento);
    const sai=n=>fMesma(semPref(n),nm)&&!outros.some(a=>fMesma(semPref(n),titulo(a.nome||'')));
    const cf=c.R.cfg||{}, al=Object.assign({},cf.almoco||{}), lA=Array.isArray(al.listaFolha)?al.listaFolha:[], nA=lA.filter(n=>!sai(n));
    const sv=FK; FK='cafe'; let lC; try{ lC=listaCafe(); } finally{ FK=sv; } const nC=lC.filter(n=>!sai(n)), tirou=(lA.length-nA.length)+(lC.length-nC.length);
    if(!tirou) return 0; const log={n:nm,em:new Date().toISOString(),por:c.eu?c.eu():'',mot:'Desligado'+(f.desligamento?' em '+f.desligamento:'')};
    const up={}; if(nA.length!==lA.length){ al.listaFolha=nA; al.listaTirados=(al.listaTirados||[]).concat([log]).slice(-100); up.almoco=al; }
    if(nC.length!==lC.length){ up.cafe=Object.assign({},cf.cafe||{},{lista:nC}); }
    try{ await P.db().doc('rh/config').set(up,{merge:true}); if(c.R.cfg){ if(up.almoco) c.R.cfg.almoco=up.almoco; if(up.cafe) c.R.cfg.cafe=up.cafe; }
      [A.folha,FKS.alm.folha,FKS.cafe.folha].forEach(x=>{ if(x) x.rasc=null; }); return tirou; }catch(e){ console.warn('[folha] tirar da lista',e); return 0; } }
  function folhaPessoas(c,d){ return refCom(fkCafe()?'cafe':'alm',()=>folhaPessoas0(c,d)); }
  function folhaPessoas0(c,d){ const m=d.slice(0,7), Dm=A.dados[m]||{}, dia=(Dm.dias||{})[d]||null, P0=Dm.pessoas||{};
    const fx={}; (c.R.func||[]).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); if(k) fx[k.padStart(11,'0')]=f; });
    /* a folha tem SÓ quem está na lista fixa (pedido de 22/10); Face ID e cadastro só servem para ligar o CPF a esses nomes */
    const L=[]; const add=(nome,k,f,ord)=>{ const j=L.find(x=>fMesma(semPref(x.nome),semPref(nome))||(k&&x.k===k)); if(j){ if(k&&!j.k) j.k=k; if(f&&!j.f) j.f=f; return; } if(ord==null) return; L.push({nome:String(nome).trim(),k:k||'',f:f||null,ord}); };
    listaFolha().forEach((n,i)=>{ if(String(n).trim()&&!flSaiu(c,n,d)) add(String(n).trim(),'',null,i); }); /* nomes e ordem da planilha (quem já saiu fica fora) */
    Object.keys(P0).forEach(k=>add(fx[k]?fx[k].nome:(P0[k].n||''),k,fx[k]||null));
    (c.R.func||[]).filter(f=>!/deslig|inativ/i.test(f.status||'')&&(!f.desligamento||f.desligamento>=d)&&(!f.admissao||f.admissao<=d)).forEach(f=>{ const k=String(f.cpf||'').replace(/\D/g,''); add(f.nome,k?k.padStart(11,'0'):'',f); });
    const fer=(c.R.fer||c.R.ferias||[]).filter(x=>x.inicio&&x.inicio<=d&&(x.fim||x.inicio)>=d&&!/cancel/i.test(x.status||''));
    L.forEach(x=>{ x.fid=!!(x.k&&P0[x.k]); x.passou=!!(x.k&&dia&&dia[x.k]); x.ferias=!!(x.f&&fer.some(y=>y.funcId===x.f._id)); x.prog=x.k&&!fkCafe()?ausDe(x.k,d):null; x.fora=!!foraDe(x.k||nomeK(x.nome)); }); /* 05/11: vale também no café e para quem não tem CPF (terceiro/motorista: chave nome:) */
    L.sort((a,b)=>(a.ord!=null?a.ord:1e6)-(b.ord!=null?b.ord:1e6)||a.nome.localeCompare(b.nome,'pt-BR'));
    return {L,temDia:!!dia}; }
  function folhaEst(c,d){ A.fol=A.fol||{}; let F=A.fol[d]; if(F) return F; F=A.fol[d]={nv:{},desm:{},tirar:{},resp:null,emit:null,carregando:true};
    c.P.db().doc(folhaCol()+d).get().then(g=>{ const x=g&&g.exists?g.data():{}; F.nv=x.nv||{}; F.desm=x.desm||{}; F.tirar=x.tirar||{}; F.resp=x.resp||null; F.emit=x.emit||null; F.foto=x.foto||null; F.carregando=false; c.P.rerender(); }).catch(()=>{ F.carregando=false; }); return F; }
  async function folhaSalvar(c,d){ const F=A.fol[d]; if(!F) return; try{ await c.P.db().doc(folhaCol()+d).set({dia:d,nv:F.nv,desm:F.desm||{},tirar:F.tirar||{},resp:F.resp||null,emit:F.emit||null,foto:F.foto||null,em:new Date().toISOString(),por:(c.P.S&&c.P.S.perfil&&c.P.S.perfil.nome)||''}); }catch(e){ c.P.toast('Não foi possível guardar a marcação: '+((e&&e.message)||e)); } }
  const PROG_T='Não almoça (programado)';
  const fMarca=(F,x)=>F.nv[x.nome]||(x.prog&&!(F.desm||{})[x.nome]?PROG_T:'')||(x.fora&&!(F.desm||{})[x.nome]?(fkCafe()?'Não toma café na empresa':'Não almoça na empresa'):''); /* o que sai na folha para essa pessoa */
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
  async function flForaGrava(c,d,nome,on){ const P=c.P, caf=fkCafe(), FKey=caf?'foraCafe':'fora'; let k=nomeK(nome); try{ const x=folhaPessoas(c,d).L.find(y=>y.nome===String(nome).trim()); if(x) k=x.k||nomeK(x.nome); }catch(e){}
    let mot=''; if(on){ mot=prompt((caf?'Por que '+semPref(nome)+' não toma café na empresa? (ex.: toma café em casa, chega depois)':'Por que '+semPref(nome)+' não almoça na empresa? (ex.: almoça em casa, traz marmita e come fora, outro turno)')+'\nPode deixar em branco.',''); if(mot===null) return; }
    const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{}), fora=Object.assign({},al[FKey]||{});
    fora[k]=on?{mot:String(mot).trim().slice(0,120),nome:semPref(nome),por:c.eu(),em:new Date().toISOString()}:Object.assign({},fora[k]||{},{removido:true,remPor:c.eu(),remEm:new Date().toISOString()});
    al[FKey]=fora; try{ await P.db().doc('rh/config').set({almoco:al},{merge:true}); if(c.R.cfg) c.R.cfg.almoco=al;
      P.toast(on?semPref(nome)+(caf?': não toma café na empresa. Sai na folha com esse aviso e não conta como falta.':': não almoça na empresa. Sai na folha com esse aviso e não conta como falta.'):semPref(nome)+(caf?' volta a contar no café.':' volta a contar no almoço.')); P.render(); }catch(e){ P.erro(e); } }
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset||t.dataset.almfltp==null||!A.ctx) return; const r=flRasc(), i=+t.dataset.almfltp; if(r[i]==null) return;
    r[i]=t.value+semPref(r[i]); A.ctx.P.toast('Agora é “'+r[i]+'”. Clique em “Salvar lista fixa”.'); A.ctx.P.render(); });
  /* 05/11 ("seria melhor clicar e arrastar"): segurar o ⋮⋮ do nome e arrastar muda a ordem da lista (mouse e dedo) */
  (function(){ let D=null; const linhas=()=>D?[...D.ul.querySelectorAll('.alm-flr')].filter(l=>!l.hidden):[], idx=l=>+((l.querySelector('.alm-flg')||{}).dataset||{}).i;
    const limpa=()=>{ if(!D) return; D.ul.querySelectorAll('.alm-dpa,.alm-dpb,.alm-drag').forEach(l=>l.classList.remove('alm-dpa','alm-dpb','alm-drag')); document.body.classList.remove('alm-arrastando'); clearInterval(D.rol); };
    document.addEventListener('pointerdown',ev=>{ const g=ev.target.closest&&ev.target.closest('.alm-flg'); if(!g||!A.ctx||(ev.button!=null&&ev.button>0)) return; const li=g.closest('.alm-flr'), ul=li&&li.parentElement; if(!ul) return;
      ev.preventDefault(); D={from:+g.dataset.i,to:+g.dataset.i,li,ul,y:ev.clientY,vel:0}; li.classList.add('alm-drag'); document.body.classList.add('alm-arrastando'); try{ g.setPointerCapture(ev.pointerId); }catch(e){}
      D.rol=setInterval(()=>{ if(D&&D.vel){ D.ul.scrollTop+=D.vel; marca(D.y); } },30); });
    function marca(y){ const ls=linhas(); if(!ls.length) return; ls.forEach(l=>l.classList.remove('alm-dpa','alm-dpb')); let alvo=null;
      for(const l of ls){ const r=l.getBoundingClientRect(); if(y<r.top+r.height/2){ alvo=l; break; } }
      if(alvo){ alvo.classList.add('alm-dpa'); D.to=idx(alvo); } else { const u=ls[ls.length-1]; u.classList.add('alm-dpb'); D.to=idx(u)+1; } }
    document.addEventListener('pointermove',ev=>{ if(!D) return; ev.preventDefault(); D.y=ev.clientY; const r=D.ul.getBoundingClientRect(); D.vel=ev.clientY<r.top+36?-12:ev.clientY>r.bottom-36?12:0; marca(ev.clientY); });
    const fim=ev=>{ if(!D) return; const {from}=D; let to=D.to; limpa(); const P=A.ctx&&A.ctx.P; D=null; if(!P) return; const r=flRasc(); if(to>from) to--;
      if(to!==from&&r[from]!=null){ const [x]=r.splice(from,1); r.splice(to,0,x); A.folha.vinc=null; P.render(); } };
    document.addEventListener('pointerup',fim); document.addEventListener('pointercancel',()=>{ limpa(); D=null; }); })();
  function listaEditor(c,d){ const esc=c.esc, F=A.folha, r=flRasc(), mud=flMudou(), sug=flSugestoes(c,d), cont={};
    r.forEach(n=>{ const t=flTipo(n); cont[t]=(cont[t]||0)+1; });
    /* 05/11: chave de cada nome (CPF ligado pela folha, senão nome:) para marcar "não almoça/toma café na empresa" direto na lista */
    const FKey=fkCafe()?'foraCafe':'fora', foraM=cfgBase()[FKey]||{}, LK={}; try{ folhaPessoas(c,d).L.forEach(x=>{ LK[x.nome]=x.k||nomeK(x.nome); }); }catch(e){}
    const kDe=n=>LK[String(n).trim()]||nomeK(n), foraN=n=>{ const f=foraM[kDe(n)]; return f&&!f.removido?f:null; }, FW2=fkCafe()?'toma café':'almoça';
    const saiu=r.map(n=>flSaiu(c,n,d)), nSaiu=saiu.filter(Boolean).length;
    const saiuH=i=>saiu[i]?`<span class="alm-flsai">Desligado${saiu[i].desligamento?' em '+c.br(saiu[i].desligamento):''} · não sai na folha</span>`:'';
    const foraH=(n,i)=>{ const f=foraN(n); return f?`<span class="alm-flfo on">Não ${FW2} na empresa${f.mot?' · '+esc(f.mot):''} <button class="lnk" data-act="alm-fl-fora" data-i="${i}" data-on="0">desfazer</button></span>`:`<button class="lnk alm-flfo" data-act="alm-fl-fora" data-i="${i}" data-on="1">não ${FW2} na empresa</button>`; };
    const cs=flCands(c,d), ids=r.map(n=>flIdent(n,cs)), ter=r.map((n,i)=>i).filter(i=>flTipo(r[i])!=='Funcionário'), qt=k=>ter.filter(i=>ids[i].k===k||(k==='cad'&&ids[i].k==='fid')).length;
    const idH=(x,i)=>{ const bt=(k,t,ti)=>`<button class="alm-fid ${k}" data-act="alm-fl-vin" data-i="${i}" title="${esc(ti||'Procurar no cadastro')}">${t} <u>${k==='ok'?'trocar':'procurar'}</u></button>`;
      if(x.k==='cad'||x.k==='fid') return bt('ok',(x.k==='cad'?'Cadastrado':'No Face ID')+(flEmp(x.emp)?' · '+esc(flEmp(x.emp)):'')+(x.st?' · '+x.st:''),x.n);
      if(x.k==='prov') return `<span class="alm-fidw">${bt('prov','Provável: '+esc(x.n)+(flEmp(x.emp)?' · '+esc(flEmp(x.emp)):''))}<button class="lnk alm-fidu" data-act="alm-fl-usa" data-i="${i}" data-n="${esc(x.n)}">usar nome completo</button></span>`;
      if(x.k==='varios') return bt('prov',x.q+' parecidos',x.ns.join(', '));
      return bt('sem','Sem cadastro'); };
    const row=(n,i)=>`<li class="alm-flr" data-b="${esc(fNorm(n))}" data-tp="${flTipo(n)}" data-id="${ids[i].k}"><span class="alm-fln"><span class="alm-flg" data-i="${i}" title="Segure e arraste para mudar a ordem" aria-hidden="true">⋮⋮</span>${i+1}</span><div class="alm-flnm"><button class="alm-flin" data-act="alm-fl-vin" data-i="${i}" data-v="${esc(n)}" title="Tocar para procurar no cadastro ou corrigir o nome">${esc(n)}</button><div class="alm-flmeta">${idH(ids[i],i)}${saiuH(i)||foraH(n,i)}</div></div><select class="alm-flt t-${flTipo(n).toLowerCase()}" data-almfltp="${i}" aria-label="Tipo de ${esc(semPref(n))}" title="Trocar o tipo">${FL_TIPOS.map(([v,t])=>`<option value="${v}" ${flTipo(n)===t?'selected':''}>${t}</option>`).join('')}</select>
      <button class="alm-flb pr" data-act="alm-fl-vin" data-i="${i}" aria-label="Procurar no cadastro" title="Procurar no cadastro e no Face ID">⌕</button><button class="alm-flb" data-act="alm-fl-up" data-i="${i}" ${i?'':'disabled'} aria-label="Subir">↑</button><button class="alm-flb" data-act="alm-fl-dn" data-i="${i}" ${i<r.length-1?'':'disabled'} aria-label="Descer">↓</button><button class="alm-flb x" data-act="alm-fl-x" data-i="${i}" aria-label="Tirar da lista">×</button>${F.vinc===i?flVinHtml(c,d,i):''}</li>`;
    return `<div class="alm-fl"><div class="alm-flh"><div><b>Lista fixa · ${r.length} nomes</b><span>${Object.keys(cont).map(t=>cont[t]+' '+t.toLowerCase()+(cont[t]>1?(t==='Funcionário'?'s':'s'):'')).join(' · ')} · só essas pessoas saem na folha, nesta ordem</span></div>
        <em class="${mud?'mud':'ok'}">${mud?'Alterações ainda não salvas':'Salva'}</em></div>
      <div class="alm-fla"><select class="txt" id="alm-fltp" aria-label="Tipo">${FL_TIPOS.map(([v,t])=>`<option value="${v}" ${F.tp===v?'selected':''}>${t}</option>`).join('')}</select><input class="txt" id="alm-flnovo" placeholder="Nome para acrescentar" autocomplete="off"><button class="btn" data-act="alm-fl-add">+ Acrescentar</button></div>
      <div class="alm-fa"><input class="txt alm-flq" id="alm-flq" placeholder="Procurar na lista…" autocomplete="off" data-almflq><label class="btn sec" style="cursor:pointer">Importar da planilha (.xlsx)<input type="file" accept=".xlsx,.xls" data-alm-fxls hidden></label>
        ${(F.abas||[]).length>1?`<label class="alm-faba">Aba <select class="txt" data-alm-faba>${F.abas.map((a,i)=>`<option value="${i}" ${i===(F.aba||0)?'selected':''}>${esc(a)}</option>`).join('')}</select></label>`:''}
        <button class="btn sec" data-act="alm-fl-colar">${F.colar?'Fechar o colar':'Colar do Excel'}</button></div>
      ${F.colar?`<div class="alm-flc"><textarea class="txt" id="alm-flt" rows="5" placeholder="Cole aqui a coluna de nomes (um por linha)"></textarea><div class="alm-fa"><button class="btn sec" data-act="alm-fl-acr">Acrescentar no fim</button><button class="btn sec" data-act="alm-fl-poe">Trocar a lista inteira</button></div></div>`:''}
      ${ter.length?`<div class="alm-flid"><b>Terceiros e motoristas da lista (${ter.length}):</b> <span class="ok">${qt('cad')} cadastrados ou no Face ID</span> · <span class="prov">${qt('prov')+qt('varios')} prováveis</span> · <span class="sem">${qt('sem')} sem cadastro</span></div>`:''}
      ${nSaiu?`<div class="alm-flsaib"><span><b>${nSaiu} ${nSaiu===1?'pessoa desligada continua':'pessoas desligadas continuam'} na lista.</b> Já não saem na folha; tire da lista para ficar limpa.</span><button class="btn sec" data-act="alm-fl-tirasai">Tirar ${nSaiu===1?'da lista':'as '+nSaiu+' da lista'}</button></div>`:''}
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
    if(a==='alm-fl-tirasai'){ const d=A.dia, n0=r.length; for(let j=r.length-1;j>=0;j--) if(flSaiu(A.ctx,r[j],d)) r.splice(j,1); P.toast((n0-r.length)+' tirado(s) da lista. Clique em “Salvar lista fixa”.'); P.render(); return; }
    if(a==='alm-fl-fora'){ flForaGrava(A.ctx,A.dia,r[i],b.dataset.on==='1'); return; }
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
    return `<section class="card alm-folha"><div class="alm-fh"><div><b>Folha de assinatura do ${FW()} · ${esc(brD)}</b><span>A folha sai normal, para todos assinarem; só quem estiver marcado sai em cinza.</span></div>
      <div class="alm-fa">${!F.carregando&&F.resp==='sem'&&!temDia?'<button class="lnk" data-act="alm-fvolta">Voltar à pergunta do Face ID</button>':''}<button class="btn sec" data-act="alm-flista">${(A.folha||{}).ed?'Fechar a lista fixa':'Lista fixa ('+listaFolha().length+')'}</button></div></div>
      ${(A.folha||{}).ed?listaEditor(c,d):''}
      ${corpo}</section>`; }
  /* 03/11: as marcas pretas e o código só servem para "Conferir pela foto"; dá para imprimir sem (lembrado no aparelho) */
  const almMarcas=()=>{ try{ return localStorage.getItem('colafix.alm.marcas')!=='0'; }catch(e){ return true; } };
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||t.id!=='alm-fmk') return; try{ localStorage.setItem('colafix.alm.marcas',t.checked?'1':'0'); }catch(e){} if(A.ctx) A.ctx.P.toast(t.checked?'A folha sai com as marcas para conferir pela foto.':'A folha sai sem as marcas (não dá para conferir pela foto).'); });
  function folhaPrevia(c,d){ const esc=c.esc, F=folhaEst(c,d), L=folhaPessoas(c,d).L.filter(x=>!(F.tirar||{})[x.nome]), n=L.filter(x=>fMarca(F,x)).length;
    return `<div class="alm-pvh"><b>Como vai sair</b><span>${L.length} na folha · ${n} em cinza · <b>${L.length-n}</b> para assinar</span></div>
      <div class="alm-pvt"><table><thead><tr><th>${FWU()} - ${esc(c.br(d))} - ${L.length-n}</th><th>Assinatura</th></tr></thead><tbody>${L.map(x=>{ const m=fMarca(F,x); return `<tr class="${m?'cz':''}"><td>${esc(x.nome)}</td><td>${m?esc(m):''}</td></tr>`; }).join('')}</tbody></table></div>
      <label class="ck alm-fmk"><input type="checkbox" id="alm-fmk" ${almMarcas()?'checked':''}> Imprimir com as marcas pretas nos cantos <small>(só servem para "Conferir pela foto")</small></label>
      <button class="btn alm-pvb" data-act="alm-folha">${F.emit?'Imprimir de novo':'Imprimir folha'}</button>`; }
  function folhaPainel(c,d){ const esc=c.esc, F=folhaEst(c,d), {L,temDia}=folhaPessoas(c,d), LV=L.filter(x=>!(F.tirar||{})[x.nome]), n=LV.filter(x=>fMarca(F,x)).length;
    const st=F.carregando?'carregando…':!temDia&&F.resp!=='sem'?'falta conferir o Face ID do dia':F.emit?(F.emit.mudou?'alterada depois de emitida — imprima de novo':'emitida às '+new Date(F.emit.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})):'ainda não emitida';
    const K=FK, bar=`<section class="card alm-fbar${fkCafe()?' cf-bar':''}"><div><b>Folha de assinatura do ${FW()} · ${esc(c.br(d))}</b><span>${LV.length} na folha · ${n} marcado${n===1?'':'s'} · <b>${LV.length-n}</b> para assinar · <em class="${F.emit&&F.emit.mudou?'mud':''}">${esc(st)}</em>${F.foto&&F.foto.n?` · <em>conferida pela foto: ${F.foto.n.sim} assinaram</em>`:''}</span></div><div class="alm-fa">${F.emit&&F.emit.vs?`<label class="btn sec">Conferir pela foto<input type="file" accept="image/*" multiple hidden data-alm-ffoto="1" data-k="${K}"></label>`:''}<button class="btn" data-act="alm-fabre" data-k="${K}">Abrir a folha ${fkCafe()?'do café':'de assinatura'}</button></div></section>`;
    if(!A.folhaAb) return bar;
    return bar+`<div class="alm-fm" role="dialog" aria-modal="true" aria-label="Folha de assinatura do ${FW()}"><div class="alm-fmb"><div class="alm-fmh"><div><div class="eyebrow">RH · ${FWU()}</div><h2>Folha de assinatura${fkCafe()?' do café':''} · ${esc(c.br(d))}</h2></div><button class="btn sec" data-act="alm-ffecha" data-k="${K}">Fechar</button></div>
      <div class="alm-fmg"><div class="alm-fml">${fotoBloco(c,d)}${folhaCard(c,d)}</div><aside class="alm-fmr">${folhaPrevia(c,d)}</aside></div></div></div>`; }
  /* as duas faixas (almoço e café) na tela do dia; depois volta ao tipo que está em uso (A.fkAt) */
  function folhasPaineis(c,d){ let h=''; try{ fkUsa('alm'); h+=refCom('alm',()=>folhaPainel(c,d)); fkUsa('cafe'); h+=refCom('cafe',()=>folhaPainel(c,d)); } finally { fkUsa(A.fkAt||'alm'); } return '<!--nofx-->'+h+'<!--/nofx-->'; }
  function folhaBusca(c,d){ const esc=c.esc, q=fNorm(A.fbusca||''); if(q.length<2) return ''; const F=folhaEst(c,d), {L}=folhaPessoas(c,d); F.tirar=F.tirar||{};
    const xs=L.filter(x=>fNorm(x.nome).includes(q)).slice(0,10); if(!xs.length) return '<div class="sub" style="margin-top:6px">Ninguém da lista com esse nome.</div>';
    return `<div class="alm-fbr">${xs.map(x=>{ const tir=F.tirar[x.nome], m=fMarca(F,x), st=tir?'Tirado desta folha':m||(x.passou?'Passou no Face ID':'Normal (assina)');
      return `<div class="alm-fbl ${tir?'tir':m?'on':''}"><div><b>${esc(x.nome)}</b><small>${esc(st)}</small></div><div class="alm-fa">${tir?`<button class="btn sec" data-act="alm-fdev" data-n="${esc(x.nome)}">Devolver à folha</button>`
        :`${F.nv[x.nome]?`<button class="btn sec" data-act="alm-fnvx" data-n="${esc(x.nome)}">Desfazer “${esc(F.nv[x.nome])}”</button>`:m?'':`<button class="btn sec" data-act="alm-fnvset" data-n="${esc(x.nome)}">Não veio</button>`}<button class="btn sec" data-act="alm-ftirar" data-n="${esc(x.nome)}">Tirar desta folha</button>`}</div></div>`; }).join('')}</div>`; }
  /* folha impressa com as marcas para ler pela foto (modulos/rh-almfoto.js); o que foi impresso fica em emit.vs[versão][folha] */
  function folhaDoc(c,d){ const F=folhaEst(c,d), L=folhaPessoas(c,d).L.filter(x=>!(F.tirar||{})[x.nome]), mk=x=>fMarca(F,x), n=L.filter(mk).length, brB=d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4), FT=window.RHAlmFoto;
    const nv=((F.emit&&F.emit.n)||0)+1, ver=nv%4, ps=FT.pagsDe(L,mk);
    return {nv,ver,ps,html:`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${FWU()} - ${brB}</title><style>${FT.CSS}</style></head><body>${FT.paginas(ps,d,ver,FWU()+' - '+brB+' - '+(L.length-n),!almMarcas(),fkCafe()?{pgBase:4}:undefined)}</body></html>`}; }
  function folhaImprimir(c,d){ const F=folhaEst(c,d); if(!window.RHAlmFoto){ c.P.toast('Carregando… tente de novo em um instante.'); return; } const w=window.open('','_blank'); if(!w){ c.P.toast('Libere as janelas (pop-up) para imprimir.'); return; }
    const D=folhaDoc(c,d); w.document.write(D.html); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(x){} },350);
    const pm={}; D.ps.forEach((r,i)=>{ pm[i]=r.filter(x=>x.nome); }); const vs=Object.assign({},(F.emit&&F.emit.vs)||{}); vs[D.ver]=pm;
    F.emit={em:new Date().toISOString(),por:(c.P.S&&c.P.S.perfil&&c.P.S.perfil.nome)||'',n:D.nv,mudou:false,ver:D.ver,vs}; folhaSalvar(c,d); c.P.rerender(); }
  /* ---------- conferir pela foto da folha assinada (23/10) ---------- */
  function ffEst(d){ A.ff=A.ff||{}; return A.ff[d]=A.ff[d]||{res:{},man:{},erros:[],lendo:false}; }
  function ffAss(c,d){ const F=folhaEst(c,d), R=ffEst(d), o={}; const sv=(F.foto&&F.foto.ass)||{}; Object.keys(sv).forEach(n=>o[n]=sv[n]);
    Object.keys(R.res).forEach(pg=>R.res[pg].linhas.forEach(l=>{ o[l.nome]=l.s; })); Object.keys(R.man).forEach(n=>o[n]=R.man[n]); return o; }
  async function ffLer(c,d,files){ const F=folhaEst(c,d), R=ffEst(d), FT=window.RHAlmFoto; if(!FT) return; R.lendo=true; R.erros=[]; c.P.render();
    for(const f of files){ try{ const r=await FT.ler(f,dec=>{ const vs=(F.emit&&F.emit.vs)||{}; const B=fkCafe()?4:0; return dec.dia===d&&dec.pg>=B&&vs[dec.ver]?vs[dec.ver][dec.pg-B]:null; });
        if(!fkCafe()&&r.pg>=4){ R.erros.push(f.name+': esta é a folha do café. Abra a folha do café para conferir.'); continue; }
        if(fkCafe()&&r.pg<4){ R.erros.push(f.name+': esta é a folha do almoço. Abra a folha do almoço para conferir.'); continue; }
        if(r.dia!==d){ R.erros.push(f.name+': esta foto é da folha de '+c.br(r.dia)+'. Abra esse dia para conferir.'); continue; }
        if(r.semLista){ R.erros.push(f.name+': esta folha é de uma impressão antiga. Fotografe a folha da última impressão.'); continue; }
        R.res[r.pg-(fkCafe()?4:0)]=r; }catch(e){ console.warn('[almoço foto]',e); R.erros.push((f.name?f.name+': ':'')+((e&&e.message)||e)); } }
    R.lendo=false; A.folhaAb=true; c.P.render(); }
  function fotoBloco(c,d){ const esc=c.esc, F=folhaEst(c,d), R=ffEst(d), m=d.slice(0,7), FT=window.RHAlmFoto;
    const inp=lbl=>`<label class="btn ${lbl?'sec':''} alm-ffb">${lbl||'Tirar ou escolher a foto'}<input type="file" accept="image/*" multiple hidden data-alm-ffoto="1"></label>`;
    const cab=`<div class="alm-ffh"><b>Conferir pela foto da folha assinada</b><span>O painel vê em quais linhas tem assinatura e compara com o Face ID. Uma foto por folha, de frente, com as 4 marcas pretas aparecendo.</span></div>`;
    if(!F.emit||!F.emit.vs) return `<section class="alm-ff">${cab}<div class="alm-ffe">Imprima a folha por aqui primeiro: ela sai com as marcas que a foto precisa.</div></section>`;
    const tot=Object.keys(F.emit.vs[F.emit.ver]||{}).length, lidas=Object.keys(R.res).map(Number).sort(), ass=ffAss(c,d), nomes=Object.keys(ass);
    if(R.lendo) return `<section class="alm-ff">${cab}<div class="alm-ffe">Lendo a foto…</div></section>`;
    const err=R.erros.length?`<div class="alm-ffx">${R.erros.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'';
    if(!nomes.length) return `<section class="alm-ff">${cab}${err}<div class="alm-ffa">${inp()}</div></section>`;
    const {L,temDia}=folhaPessoas(c,d), kDe=n=>{ const x=L.find(y=>y.nome===n); return x&&x.k||''; }, sv=n=>{ const k=kDe(n); if(!k||!temDia) return ''; if(fkCafe()){ const x=(((A.dados[m]||{}).dias||{})[d]||{})[k]; return x?(x.c?'sim':'nao'):''; } return refCom('alm',()=>situacao(m,d,k).v); };
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
      ${fkCafe()?grupo('Assinaram, mas não passaram no refeitório de manhã',semFace,'Pode ser que o leitor do refeitório não pegou.'):grupo('Assinaram, mas não passaram no refeitório',semFace,'Pode ser que o Face ID não pegou. Se almoçou mesmo, conte o almoço.',n=>chip(n,`<button class="btn sec rh-sm" data-act="alm-ffconta" data-n="${esc(n)}">Contar o almoço</button>`))}
      ${grupo(fkCafe()?'Passaram no refeitório de manhã, mas a linha está em branco':'Passaram no refeitório, mas a linha está em branco',semAss,'Confira na folha: pode ter esquecido de assinar.')}
      ${grupo('Traço fraco · confira na folha',g.duv,'Toque no nome: assinou ↔ em branco.')}
      ${grupo('Em branco',g.nao.filter(n=>!semAss.includes(n)),'')}
      <details class="alm-ffd"><summary>Assinaram (${g.sim.length})</summary><div>${g.sim.map(n=>chip(n)).join('')}</div></details>
      ${vistas?`<div class="alm-ffv">${vistas}</div>`:''}
      <div class="alm-ffa">${inp(lidas.length?'Mandar outra foto':'Ler outra foto')}${mudou?`<button class="btn" data-act="alm-ffsalva">Guardar conferência</button>`:''}</div></section>`; }
  function ffFile(blob,nome){ try{ return new File([blob],nome,{type:'image/jpeg'}); }catch(e){ blob.name=nome; return blob; } }
  async function ffSalvar(c,d){ const F=folhaEst(c,d), R=ffEst(d), ass=ffAss(c,d), fotos=((F.foto&&F.foto.fotos)||[]).slice();
    try{ for(const pg of Object.keys(R.res)){ const r=R.res[pg]; if(!r.blob||!c.guardar) continue; try{ const g=await c.guardar((fkCafe()?'Café/':'Almoço/')+d.slice(0,7),'Folha '+FW()+' '+d+' folha '+(+pg+1)+'.jpg',ffFile(r.blob,'folha-'+d+'-'+(+pg+1)+'.jpg')); fotos[+pg]=(g&&g.url)||''; }catch(e){ console.warn('[almoço foto] guardar',e); } }
      const n={sim:0,nao:0,duv:0}; Object.values(ass).forEach(v=>{ if(n[v]!=null) n[v]++; });
      F.foto={em:new Date().toISOString(),por:c.eu?c.eu():'',ver:F.emit&&F.emit.ver,ass,n,fotos:fotos.map(x=>x||'')}; await folhaSalvar(c,d); R.res={}; R.man={}; R.erros=[];
      c.P.toast('Conferência pela foto guardada: '+n.sim+' assinaram.'); c.P.render(); }catch(e){ c.P.toast('Não foi possível guardar: '+((e&&e.message)||e)); } }
  function folhaAbaNomes(i){ const wb=A._wb; if(!wb) return []; const ws=wb.Sheets[wb.SheetNames[i]], rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false});
    return [...new Set(rows.map(r=>String((r||[])[0]||'').trim()).filter(n=>n&&!/almo[cç]o|caf[eé]\s*-|assinatura|^\d|^nome$/i.test(n)&&!cafeGrupo(n)&&/[a-zà-ú]{2,}[^a-zà-ú]+[a-zà-ú]{2,}/i.test(n)))]; }
  async function folhaXls(c,file){ try{ if(!window.XLSX) await new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
      A._wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); A.folha.abas=A._wb.SheetNames.slice(0,60); A.folha.aba=0; const ns=folhaAbaNomes(0); A.folha.rasc=ns;
      c.P.toast(ns.length+' nomes lidos da aba “'+A._wb.SheetNames[0]+'”. Se não for o dia certo, escolha outra aba. Depois, “Salvar lista fixa”.'); c.P.render(); }
    catch(e){ console.warn('[almoço folha]',e); c.P.toast('Não consegui ler a planilha.'); } }
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!A.ctx||!t.dataset) return; const c=A.ctx, d=A.dia;
    if(t.dataset.almFnv!=null){ const F=folhaEst(c,d); if(t.checked) F.nv[t.dataset.almFnv]=t.dataset.mot||'Não veio'; else delete F.nv[t.dataset.almFnv]; if(F.emit) F.emit.mudou=true; folhaSalvar(c,d); (c.P.render||c.P.rerender)(); } /* caixinha em foco: redesenha já */
    if(t.dataset.almFprog!=null){ const F=folhaEst(c,d); F.desm=F.desm||{}; if(t.checked) delete F.desm[t.dataset.almFprog]; else F.desm[t.dataset.almFprog]=true; if(F.emit) F.emit.mudou=true; folhaSalvar(c,d); (c.P.render||c.P.rerender)(); } /* caixinha em foco: redesenha já */
    if(t.dataset.almFxls!=null&&t.files&&t.files[0]) folhaXls(c,t.files[0]);
    if(t.dataset.almFfoto!=null&&t.files&&t.files.length){ if(t.dataset.k){ fkUsa(t.dataset.k); A.fkAt=t.dataset.k; } const fs=[...t.files]; t.value=''; ffLer(c,d,fs); }
    if(t.dataset.almFaba!=null&&A._wb){ A.folha.aba=+t.value; const ns=folhaAbaNomes(A.folha.aba); A.folha.rasc=ns; c.P.toast(ns.length+' nomes da aba “'+A._wb.SheetNames[A.folha.aba]+'”.'); c.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&A.folhaAb&&A.ctx){ A.folhaAb=false; A.ctx.P.render(); } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||t.id!=='alm-fbusca'||!A.ctx) return; A.fbusca=t.value; const r=document.getElementById('alm-fres'); if(r) r.innerHTML=folhaBusca(A.ctx,A.dia); });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="alm-f"]'); if(!b||!A.ctx) return; const a=b.dataset.act; if(b.dataset.k&&(a==='alm-fabre'||a==='alm-ffecha')){ fkUsa(b.dataset.k); A.fkAt=b.dataset.k; } if(!['alm-folha','alm-flista','alm-flsalva','alm-fimp','alm-fsem','alm-fvolta','alm-fadd','alm-fnvset','alm-fnvx','alm-ftirar','alm-fdev','alm-fabre','alm-ffecha','alm-fbase','alm-fftg','alm-ffconta','alm-ffsalva'].includes(a)) return;
    const c=A.ctx, P=c.P, d=A.dia; A.folha=A.folha||{}; const F=folhaEst(c,d);
    if(a==='alm-folha') return folhaImprimir(c,d);
    if(a==='alm-fftg'){ const R=ffEst(d), n=b.dataset.n, at=ffAss(c,d)[n]; R.man[n]=at==='sim'?'nao':'sim'; P.render(); return; }
    if(a==='alm-ffsalva') return ffSalvar(c,d);
    if(a==='alm-ffconta'){ const n=b.dataset.n, x=folhaPessoas(c,d).L.find(y=>y.nome===n); if(!x||!x.k) return P.toast('Não achei o CPF desta pessoa.');
      try{ await refCom('alm',()=>gravaAj(x.k,d,{v:'sim',mot:'Assinou a folha do almoço',por:c.eu(),em:new Date().toISOString()})); P.toast('Almoço contado para '+n+'.'); P.render(); }catch(e){ P.toast('Não foi possível gravar: '+((e&&e.message)||e)); } return; }
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
    if(fkCafe()){ try{ const cf=Object.assign({},(c.R.cfg&&c.R.cfg.cafe)||{},{lista:ns,em:new Date().toISOString(),por:c.eu?c.eu():''}); await P.db().doc('rh/config').set({cafe:cf},{merge:true}); c.R.cfg=c.R.cfg||{}; c.R.cfg.cafe=cf; A.folha.rasc=null; P.toast('Lista fixa do café salva: '+ns.length+' nomes.'); P.render(); }catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } return; }
    try{ const al=Object.assign({},(c.R.cfg&&c.R.cfg.almoco)||{},{listaFolha:ns}); await P.db().doc('rh/config').set({almoco:al},{merge:true}); if(c.R.cfg) c.R.cfg.almoco=al; else c.R.cfg={almoco:al}; A.folha.rasc=null; P.toast('Lista fixa salva: '+ns.length+' nomes.'); P.render(); }catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } });
  try{ document.head.insertAdjacentHTML('beforeend','<style id="alm-folha-css">.alm-sref{background:#FBEBDD;border:2px solid #D9792B;border-radius:12px;padding:12px 16px;margin:10px 0;font-size:14.5px;line-height:1.5}.alm-sref.ok{background:#E6EEF3;border-color:#3F6F93}.alm-sref-b{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px}.alm-sref-b span{font-size:13px;color:var(--muted)}.alm-parc{background:#F6E8E6;border:2px solid var(--crit);color:var(--ink,#143F54);border-radius:12px;padding:12px 16px;margin:10px 0;font-size:14.5px;line-height:1.5}.alm-parc b{color:var(--crit)}.alm-emcurso{font-size:13.5px;color:var(--teal-strong);background:var(--teal-wash);padding:8px 12px;border-radius:10px;margin:6px 0 10px}.alm-bl.pend{background:var(--surface-2)}.alm-vals{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.alm-vals label{display:flex;flex-direction:column;gap:3px}.alm-vals input{max-width:150px}.alm-cl{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:8px}.alm-fbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0}.alm-fbar b{font-size:16px}.alm-fbar>div>span{display:block;font-size:13.5px;color:var(--muted);margin-top:2px}.alm-fbar em{font-style:normal}.alm-fbar em.mud{color:var(--warn-ink);font-weight:600}.alm-fm{position:fixed;inset:0;z-index:900;background:rgba(14,20,24,.45);display:flex;align-items:stretch;justify-content:center;padding:24px}.alm-fmb{background:var(--ground,#EDF1F4);border-radius:18px;width:min(1320px,100%);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}.alm-fmh{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 22px;background:var(--surface);border-bottom:1px solid var(--line)}.alm-fmh h2{margin:0;font-size:20px}.alm-fmg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px;padding:16px;overflow:hidden}.alm-fml{overflow:auto;min-height:0}.alm-fml>.alm-folha{margin:0}.alm-fml>.alm-folha>.alm-fh>div:first-child{display:none}.alm-fmr{display:flex;flex-direction:column;gap:10px;min-height:0;background:var(--surface);border-radius:14px;padding:14px;border:1px solid var(--line)}.alm-pvh b{display:block;font-size:16px}.alm-pvh span{font-size:13.5px;color:var(--muted)}.alm-pvh span b{display:inline;font-size:inherit}.alm-pvt{flex:1;min-height:0;overflow:auto;border:1px solid #000}.alm-pvt table{width:100%;border-collapse:collapse;font-family:Calibri,Carlito,Arial,sans-serif}.alm-pvt th,.alm-pvt td{border:.5pt solid #000;padding:2px 6px;font-size:13px;font-weight:700;white-space:nowrap}.alm-pvt th{background:#BFBFBF;font-style:italic;position:sticky;top:0}.alm-pvt td+td{font-weight:400;font-style:italic;font-size:12px;text-align:center;color:#333;width:44%}.alm-pvt tr.cz td{background:#BFBFBF}.alm-pvb{width:100%;height:52px!important;font-size:16px!important}@media (max-width:900px){.alm-fm{padding:0}.alm-fmb{border-radius:0}.alm-fmg{grid-template-columns:1fr;overflow:auto}.alm-fmr{max-height:70vh}}.alm-folha{display:flex;flex-direction:column;gap:12px;margin:10px 0}.alm-fh{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.alm-fh b{display:block;font-size:16px}.alm-fh span,.alm-fg>span,.alm-fq>span{display:block;font-size:13.5px;color:var(--muted)}.alm-fa{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.alm-fl{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line)}.alm-fl textarea{width:100%;font:inherit;font-size:14px}.alm-flh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.alm-flh b{font-size:16px}.alm-flh span{display:block;font-size:13px;color:var(--muted)}.alm-flh em{font-style:normal;font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap}.alm-flh em.ok{background:var(--ok-tint,#E2F0E8);color:var(--ok,#2F6F4F)}.alm-flh em.mud{background:var(--warn-tint,#F6EEDC);color:var(--warn-ink,#7A5410)}.alm-fla{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:8px}.alm-flq{max-width:260px}.alm-flc{display:flex;flex-direction:column;gap:8px}.alm-fll{list-style:none;margin:0;padding:0;max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.alm-flnm{display:flex;flex-direction:column;min-width:0}.alm-fid{font:inherit;font-size:11.5px;padding:0 6px 2px;color:var(--muted);background:none;border:0;text-align:left;cursor:pointer}.alm-fid u{opacity:.75}.alm-fidw{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.alm-fidu{font-size:11.5px}.alm-fid.ok{color:var(--ok,#2F6F4F)}.alm-fid.prov{color:var(--warn-ink,#7A5410)}.alm-fid.sem{color:var(--crit)}.alm-fid .lnk{font-size:11.5px}.alm-flid{font-size:13px}.alm-flid .ok{color:var(--ok,#2F6F4F);font-weight:600}.alm-flid .prov{color:var(--warn-ink,#7A5410);font-weight:600}.alm-flid .sem{color:var(--crit);font-weight:600}.alm-flfx{display:flex;gap:6px;flex-wrap:wrap}.alm-flch{font:inherit;font-size:13px;border:1px solid var(--line);border-radius:999px;padding:5px 12px;background:var(--surface);color:inherit;cursor:pointer}.alm-flch[aria-pressed=true]{background:var(--teal-strong,#143F54);color:#fff;border-color:transparent}.alm-flr[hidden]{display:none}.alm-flv{grid-column:1/-1;background:var(--surface-2);border-radius:10px;padding:10px;margin:4px 0 6px;display:flex;flex-direction:column;gap:6px}.alm-flv input{height:40px!important;font-size:15px!important}.alm-flvr{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto}.alm-flvo{font:inherit;text-align:left;display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.alm-flvo:hover{border-color:var(--teal-strong,#143F54)}.alm-flvo small{font-size:12px;color:var(--muted)}.alm-flb.pr{font-size:17px}.alm-flin{cursor:text}.alm-flr{display:grid;grid-template-columns:48px minmax(0,1fr) auto 34px 34px 34px 34px;gap:6px;align-items:center;padding:4px 8px;border-bottom:1px solid var(--line)}.alm-flr:last-child{border-bottom:0}.alm-fln{font-size:12.5px;color:var(--muted);text-align:right;display:flex;align-items:center;justify-content:flex-end;gap:4px}.alm-flg{cursor:grab;touch-action:none;user-select:none;font-size:15px;letter-spacing:-3px;color:var(--muted);padding:8px 6px 8px 2px;border-radius:6px;line-height:1}.alm-flg:hover{background:var(--surface-2);color:var(--ink,#143F54)}.alm-flr.alm-drag{opacity:.45;background:var(--surface-2)}.alm-flr.alm-dpa{box-shadow:inset 0 3px 0 var(--teal-strong,#143F54)}.alm-flr.alm-dpb{box-shadow:inset 0 -3px 0 var(--teal-strong,#143F54)}body.alm-arrastando,body.alm-arrastando *{cursor:grabbing!important;user-select:none!important}.alm-flin{font:inherit;font-size:14.5px;text-align:left;padding:5px 6px 1px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.alm-flin:hover,.alm-flin:focus-visible{background:var(--surface-2);text-decoration:underline}.alm-flt{font:inherit;font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:999px;border:1px solid transparent;background:var(--surface-2);color:var(--muted);cursor:pointer;max-width:120px}.alm-flt:hover,.alm-flt:focus-visible{border-color:var(--line)}.alm-flsai{font-size:11.5px;color:var(--crit-ink,#8A2B22);font-weight:600;padding:0 6px}.alm-flsaib{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;background:var(--crit-tint,#F6E8E6);font-size:13.5px}.alm-flmeta{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline}.alm-flfo,.lnk.alm-flfo{font-size:11.5px;color:var(--muted);padding:0 6px;font-weight:400;text-decoration:underline;text-decoration-color:var(--line)}.lnk.alm-flfo:hover{color:var(--teal-strong)}.alm-flfo.on{color:#5B4A7A;font-weight:600}.alm-flfo.on .lnk{font-size:11.5px;font-weight:400}.alm-flt.t-motorista{background:#E3EEF3;color:#1F5568}.alm-flt.t-terceiro{background:#F6EEDC;color:#7A5410}.alm-flb{font:inherit;width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}.alm-flb:disabled{opacity:.3;cursor:default}.alm-flb.x{color:var(--crit)}.alm-fls b{display:block;font-size:14px}.alm-fls span{font-size:12.5px;color:var(--muted)}.alm-fls>div{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.alm-flsg{font:inherit;font-size:13px;border:1px dashed var(--line);border-radius:10px;background:var(--surface);padding:5px 10px;cursor:pointer;text-align:left;color:inherit}.alm-flsg small{display:block;font-size:11px;color:var(--muted)}.alm-flf{display:flex;gap:8px;flex-wrap:wrap}@media (max-width:700px){.alm-fla{grid-template-columns:1fr}}.alm-fq,.alm-fg{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:12px;background:var(--surface-2)}.alm-fq b,.alm-fg b{font-size:15px}.alm-fks{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;margin-top:4px}.alm-fk{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-size:14px}.alm-fk input{width:18px;height:18px}.alm-fk.on{background:#E3E6E9;border-color:#9AA5AD}.alm-fk .lnk{margin-left:8px}.alm-fk em{margin-left:auto;font-size:12px;color:var(--muted)}.alm-fe{font-size:13.5px;color:var(--muted);padding:8px 12px;border-radius:10px;background:var(--surface-2)}.alm-fe.mud{background:var(--warn-tint);color:var(--warn-ink)}.alm-fe b{color:inherit}.alm-fbusca{max-width:420px;height:46px!important;font-size:16px!important}.alm-fbr{display:flex;flex-direction:column;gap:6px;margin-top:8px}.alm-fbl{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface)}.alm-fbl b{display:block;font-size:15px}.alm-fbl small{font-size:12.5px;color:var(--muted)}.alm-fbl.on{background:#E3E6E9}.alm-fbl.tir{opacity:.7;border-style:dashed}.alm-fbl .btn{height:36px;padding:0 12px;font-size:13.5px}.alm-faba{display:flex;align-items:center;gap:6px;font-size:14px}.alm-fz{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.alm-fz span{font-size:14px}#alm-fsel{min-width:260px}.alm-ff{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--surface);border:1px solid var(--line);margin-bottom:12px}.alm-ffh b{display:block;font-size:16px}.alm-ffh span{display:block;font-size:13.5px;color:var(--muted)}.alm-ffe{font-size:13.5px;color:var(--muted);padding:8px 12px;border-radius:10px;background:var(--surface-2)}.alm-ffx{font-size:13.5px;padding:8px 12px;border-radius:10px;background:var(--crit-tint,#F6E8E6);color:var(--crit-ink,#8A2B22)}.alm-ffa{display:flex;gap:8px;flex-wrap:wrap}.alm-ffb{cursor:pointer}.alm-ffk{display:flex;gap:16px;flex-wrap:wrap;font-size:14px}.alm-ffk b{font-size:22px;margin-right:4px}.alm-ffk .w b{color:var(--warn-ink,#7A5410)}.alm-ffg{display:flex;flex-direction:column;gap:4px}.alm-ffg b{font-size:14.5px}.alm-ffg small{font-size:12.5px;color:var(--muted)}.alm-ffg>div,.alm-ffd>div{display:flex;flex-wrap:wrap;gap:6px}.alm-ffc{display:inline-flex;align-items:center;gap:6px;padding:3px 4px 3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);font-size:13.5px}.alm-ffc.sim{background:var(--ok-tint,#E2F0E8)}.alm-ffc.duv{background:var(--warn-tint,#F6EEDC)}.alm-ffc .lnk{font-size:13.5px;padding:2px 4px}.alm-ffd summary{cursor:pointer;font-size:14px;margin-bottom:6px}.alm-ffv{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.alm-ffv figure{margin:0}.alm-ffv img{width:100%;border-radius:8px;border:1px solid var(--line)}.alm-ffv figcaption{font-size:12px;color:var(--muted)}</style>'); }catch(e){}
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
  /* 03/11 (Juliana): afastado (cadastro afast {ini,fim,mot} ou situação "Afastado") e horário diferente (horEsp {dias,ini,fim,obs}, ex.: aprendiz)
     não entram como "não veio": viram 'Afastado', 'Folga' (dia em que não trabalha) ou 'Mais tarde' (hoje, antes do horário dela). */
  const afastDe=(f,d)=>{ const a=f.afast; if(a&&a.ini&&a.ini<=d&&(!a.fim||a.fim>=d)) return a; if(/afast/i.test(f.status||'')) return {mot:(a&&a.mot)||''}; return null; };
  const jornadaDe=f=>{ const j=f&&f.horEsp; return j&&typeof j==='object'&&(Array.isArray(j.dias)&&j.dias.length||j.ini)?j:null; }; /* f.jornada é o texto do contrato: o horário diferente fica em f.horEsp */
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
      (R.func||[]).filter(f=>!/deslig|inativ|encerr|demit|rescis/i.test(f.status||'')||(f.desligamento&&f.desligamento>=d)).filter(f=>(!f.desligamento||f.desligamento>=d)&&(!f.admissao||f.admissao<=d)&&!fora(f)).forEach(f=>{
        const k=String(f.cpf||'').replace(/\D/g,'').padStart(11,'0'); if(vistos.has(k)||vistos.has('f:'+f._id)||ps.some(p=>prMesma(p.n,f.nome))) return;
        const af=afastDe(f,d); if(af){ fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:'Afastado',mt:af.mot||'',ate:af.fim||''}); return; }
        const jo=jornadaDe(f), wdd=new Date(d+'T12:00').getDay();
        if(jo&&Array.isArray(jo.dias)&&jo.dias.length&&!jo.dias.includes(wdd)){ fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:'Folga',mt:'não trabalha neste dia'}); return; }
        if(jo&&jo.ini&&d===P.hojeStr()&&(new Date().getHours()*60+new Date().getMinutes())<hm(jo.ini)+30){ fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:'Mais tarde',mt:'entra às '+jo.ini}); return; }
        const fer=ferias.some(y=>y.funcId===f._id), vi=fer?null:(VI||(VI=prVisto(d))), u=vi&&vi.ult[k]||'', lim2=prMenos(d,14);
        /* sem passar no Face ID há mais de 2 semanas (ou nunca, com 2 semanas de dados): provavelmente saiu e o cadastro não foi atualizado */
        if(vi&&vi.dias>=8&&(!f.admissao||f.admissao<lim2)&&(!u||u<lim2)){ fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:'Sumiu',u}); return; }
        const at=fer?null:atDe({funcId:f._id,cpf:f.cpf},d);
        fs.push({n:titulo(f.nome),s:f.setor||'',e:prEmp(f,null),m:fer?'Férias':at?(window.RHAtest?RHAtest.TIPO(at.tipo)[1]:'Atestado'):'Sem registro'}); });
      fs.sort((a,b)=>a.n.localeCompare(b.n,'pt-BR')); }
    const C=cfgBase(); return {dia:d,exp,lim:limT,alm:[C.ini,C.fim],p:ps,f:fs}; }
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
  function turnoDe(c,setor,d,f){ const jo=jornadaDe(f); if(jo&&jo.ini&&jo.fim) return {ini:jo.ini,fim:jo.fim,nome:'horário da pessoa'}; const pc=pontoCfg(), T=((c.P.S&&c.P.S.cfg&&c.P.S.cfg.turnos)||[]).filter(t=>t&&t.ini&&t.fim), wd=new Date(d+'T12:00').getDay();
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
        const tu=turnoDe(c,o.setor,d,f), ini=hm(tu.ini), fim=hm(tu.fim), ch=hm(t[0].h);
        if(ch>ini+tol) o.atr.push({d,h:t[0].h,esp:tu.ini,min:ch-ini});
        const sds=t.filter(z=>ehSaida(z.d)), u=(sds.length?sds[sds.length-1]:t[t.length-1]); const um=hm(u.h);
        if((d<hj||agora>fim+60)&&um<fim-tol&&um>ch) o.sai.push({d,h:u.h,esp:tu.fim,min:fim-um,leitor:ehSaida(u.d)}); });
      r.f.filter(x=>x.m==='Sem registro').forEach(x=>{ const f=(R.func||[]).find(y=>titulo(y.nome)===x.n); if(!f) return; const k=String(f.cpf||'').replace(/\D/g,'').padStart(11,'0')||('f:'+f._id); pes(k,f,null).falt.push(d); }); });
    return {m,dias:dExp,pes:out}; }
  /* carrega o mês (o almoço só assina quando a tela abre) */
  function carregar(c,m){ A.ctx=A.ctx||c; assinar(m); return new Promise(res=>{ const t0=Date.now(); const ver=()=>{ if((A.dados[m]&&A.aj[m])||Date.now()-t0>9000) return res(!!A.dados[m]); setTimeout(ver,150); }; ver(); }); }
  /* números do mês por pessoa, para o fechamento da folha (rh.js) */
  function fechamento(c,m){ A.ctx=A.ctx||c; const D=A.dados[m]; if(!D) return null; const ds=Object.keys(D.dias||{}).sort(); const sv={mes:A.mes,q:A.q,emp:A.emp,setor:A.setor,sit:A.sit};
    const umaRef=r=>refCom(r,()=>{ let G=[]; try{ A.mes=m; A.q=''; A.emp=''; A.setor=''; A.sit=''; G=grade(ds,pessoasDoMes(m)); } finally{ Object.assign(A,sv); } const vd=+cfg().valorDesc||0, o={}; G.forEach(g=>{ o[g.p.k]={nome:g.p.nome,emp:empCurta(g.p.emp),alm:g.tot,sj:g.sj,jj:g.jj,desc:g.sj*vd}; }); return {vd,o}; });
    const a=umaRef('alm'), cf=umaRef('cafe');
    return {m,valorDesc:a.vd,alm:a.o,cafe:cf.o,valorDescCafe:cf.vd,ponto:pontoMes(c,m)}; }
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
    const det=o=>A.pontAb===o.k?`<tr class="alm-pdet"><td colspan="6"><div class="alm-pdg">
        <div><b>Atrasos (${o.atr.length})</b>${o.atr.map(x=>`<span>${dl(x.d)} · chegou ${x.h} <small>(horário ${x.esp}, +${x.min} min)</small></span>`).join('')||'<span class="sub">nenhum</span>'}</div>
        <div><b>Saídas antes (${o.sai.length})</b>${o.sai.map(x=>`<span>${dl(x.d)} · ${x.leitor?'saiu':'última passagem'} ${x.h} <small>(até ${x.esp}, −${x.min} min)</small></span>`).join('')||'<span class="sub">nenhuma</span>'}</div>
        <div><b>Faltas sem registro (${o.falt.length})</b>${o.falt.map(d=>`<span>${dl(d)}</span>`).join('')||'<span class="sub">nenhuma</span>'}</div></div></td></tr>`:'';
    const cfgH=A.pontCfg?`<div class="alm-pcfg"><label><span class="label">Entrada</span><input class="txt" type="time" id="alm-pini" value="${esc(pc.ini)}"></label><label><span class="label">Saída</span><input class="txt" type="time" id="alm-pfim" value="${esc(pc.fim)}"></label><label><span class="label">Tolerância (min)</span><input class="txt" type="number" min="0" max="60" id="alm-ptol" value="${esc(pc.tol)}"></label><button class="btn rh-sm" data-act="alm-pcfgok">Salvar horário</button><button class="lnk" data-act="alm-pcfg">Cancelar</button>
        <div class="sub" style="flex-basis:100%;margin:0;font-size:12.5px">Vale para quem não tem turno da linha cadastrado (Visão do gestor › Turnos usa o setor = nome da linha).</div></div>`:'';
    return `<div class="alm-pk"><div><span>Pessoas que chegaram atrasadas</span><b class="num">${nAtr}</b><small>${tot('atr')} atrasos no mês</small></div><div><span>Saídas antes do horário</span><b class="num">${tot('sai')}</b><small>última passagem antes do fim</small></div>
        <div class="${tot('falt')?'w':''}"><span>Faltas sem registro</span><b class="num">${tot('falt')}</b><small>dia de expediente sem passar no Face ID (sem férias)</small></div><div><span>Dias de expediente</span><b class="num">${X.dias.length}</b><small>horário padrão ${esc(pc.ini)}–${esc(pc.fim)} · tolerância ${esc(pc.tol)} min · <button class="lnk" data-act="alm-pcfg">mudar</button></small></div></div>${cfgH}
      <div class="alm-pbar"><label class="ck"><input type="checkbox" data-act="alm-ptodos" ${A.pontTodos?'checked':''}> Mostrar também quem está em dia</label><span style="flex:1"></span><button class="btn sec rh-sm" data-act="alm-pxls">Excel</button><button class="btn rh-sm" data-act="alm-ppdf">Baixar PDF</button></div>
      ${L.length?`<div class="rh-tw"><table class="rh-t alm-ptab"><colgroup><col><col style="width:120px"><col style="width:110px"><col style="width:90px"><col style="width:140px"><col style="width:240px"></colgroup>
        <thead><tr><th>Pessoa</th><th class="r">Atrasos</th><th class="r">Saídas antes</th><th class="r">Faltas</th><th class="r">Dias no Face ID</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
        ${L.slice(0,lim).map(o=>{ const mn=o.atr.reduce((a,x)=>a+x.min,0); return `<tr data-b="${esc(almChave(o))}"${A.pontAb===o.k?' class="ab"':''}><td><button class="lnk alm-nm" data-act="alm-pab" data-k="${esc(o.k)}">${esc(o.nome)}</button><small>${esc([o.setor,o.emp].filter(Boolean).join(' · ')||'sem setor')}</small></td>
          <td class="num r">${o.atr.length?`<b>${o.atr.length}</b><small>${mn} min no mês</small>`:'<span class="z">—</span>'}</td><td class="num r">${o.sai.length?`<b>${o.sai.length}</b>`:'<span class="z">—</span>'}</td><td class="num r">${o.falt.length?`<span class="pill crit">${o.falt.length}</span>`:'<span class="z">—</span>'}</td><td class="num r">${o.dias}</td>
          <td class="ac"><button class="btn sec rh-sm" data-act="alm-pab" data-k="${esc(o.k)}">${A.pontAb===o.k?'Fechar':'Ver dias'}</button>${o.funcId&&(o.atr.length>=3||o.falt.length)?`<button class="btn sec rh-sm" data-act="rh-presoc" data-id="${o.funcId}">Ocorrência</button>`:''}</td></tr>${det(o)}`; }).join('')}</tbody></table></div>
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
  .card>.alm-f2:first-child{border-top:0;padding-top:0;margin-top:0}.alm-fmk{display:flex;gap:8px;align-items:flex-start;margin:10px 0 8px;font-size:13.5px}.alm-fmk small{display:block;color:var(--muted);font-size:12px}.alm-ptab{width:100%;table-layout:fixed;border-collapse:collapse}.alm-ptab th{text-align:left;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.alm-ptab th.r,.alm-ptab td.r{text-align:right}.alm-ptab td{vertical-align:middle;padding:10px 12px;border-bottom:1px solid var(--line)}.alm-ptab td:first-child .alm-nm{font-weight:600;text-align:left}.alm-ptab td small{display:block;font-size:12px;color:var(--muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.alm-ptab td.r b{font-size:16px;font-weight:600}.alm-ptab .alm-pdg b{font-size:14px}.alm-ptab .z{color:var(--muted)}.alm-ptab td.ac{text-align:right;white-space:nowrap}.alm-ptab td.ac .btn{margin-left:6px}.alm-ptab tr.ab>td{background:var(--teal-wash);border-bottom:0}.alm-ptab .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  @media (max-width:760px){ .alm-ptab colgroup,.alm-ptab th:nth-child(5),.alm-ptab td:nth-child(5){display:none} .alm-ptab td.ac{white-space:normal} }
  .alm-pt{width:100%}.alm-pt td{vertical-align:middle}.alm-pdet td{background:var(--teal-wash)}.alm-pdg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.alm-pdg>div{display:flex;flex-direction:column;gap:3px;font-size:13px}.alm-pdg small{color:var(--muted)}
  @media (max-width:900px){ .alm-pk,.alm-pdg{grid-template-columns:repeat(2,minmax(0,1fr))} }
  </style>`); }catch(e){}
  /* ---------- SOLICITADO × NOTA (04/11, "a parte mais importante: quantos almoços e cafés foram solicitados e quantos vêm na nota") ----------
     Solicitado = pessoas da folha do dia (lista fixa − marcados "Não veio"/férias/tirados), o mesmo número do título da folha impressa.
     Na nota = o que o restaurante cobrou, digitado pelo RH por dia (ou só o total do mês). Guardado em rh/dados/almoconota/{AAAA-MM}
     {dias:{d:{a,c}}, tot:{a,c}, nf, obs, em, por}. As folhas do mês vêm de uma consulta só por coleção (almocofolha/cafefolha, campo dia). */
  const NOTA={};
  function notaEst(c,m){ let N=NOTA[m]; if(N) return N; N=NOTA[m]={ok:false,doc:{dias:{},tot:{}},fol:{alm:{},cafe:{}}};
    const db=c.P.db(), q=col=>db.collection('rh/dados/'+col).where('dia','>=',m+'-01').where('dia','<=',m+'-31').get();
    Promise.all([db.doc('rh/dados/almoconota/'+m).get().catch(()=>null),q('almocofolha').catch(()=>null),q('cafefolha').catch(()=>null)]).then(([g,a,b])=>{
      const x=g&&g.exists?g.data():{}; N.doc={dias:x.dias||{},tot:x.tot||{},nf:x.nf||'',obs:x.obs||'',em:x.em||'',por:x.por||''};
      [a,b].forEach((s,i)=>{ ((s&&s.docs)||[]).forEach(dd=>{ N.fol[i?'cafe':'alm'][dd.id]=dd.data(); }); }); N.ok=true; c.P.rerender(); });
    return N; }
  function notaSol(c,d,k){ const N=NOTA[d.slice(0,7)], sv=FK; fkUsa(k);
    try{ A.fol=A.fol||{}; if(!A.fol[d]){ const x=(N&&N.fol[k][d])||{}; A.fol[d]={nv:x.nv||{},desm:x.desm||{},tirar:x.tirar||{},resp:x.resp||null,emit:x.emit||null,foto:x.foto||null,carregando:false}; }
      const F=A.fol[d]; if(!listaFolha().length) return null; const L=folhaPessoas(c,d).L.filter(x=>!(F.tirar||{})[x.nome]);
      return {n:L.length-L.filter(x=>fMarca(F,x)).length,emit:!!F.emit}; }
    finally{ fkUsa(sv); } }
  function notaDias(c,m){ const N=NOTA[m], h=c.P.hojeStr(), [y,mm]=m.split('-').map(Number), ult=new Date(y,mm,0).getDate(), D=A.dados[m]||{}, out=[];
    for(let i=1;i<=ult;i++){ const d=m+'-'+pad(i); if(d>h) break; const wd=new Date(d+'T12:00').getDay(); let fer=false; try{ fer=!!(c.P.feriadoDe&&c.P.feriadoDe(d)); }catch(e){}
      const tem=(N&&(N.fol.alm[d]||N.fol.cafe[d]||N.doc.dias[d]))||((D.dias||{})[d]&&Object.keys(D.dias[d]).length>=5); if(tem||(wd>0&&wd<6&&!fer)) out.push(d); }
    return out; }
  const nN=v=>v===''||v==null||isNaN(+v)?null:+v;
  function notaDados(c,m){ const N=notaEst(c,m), ds=notaDias(c,m), rows=ds.map(d=>{ const a=notaSol(c,d,'alm'), cf=notaSol(c,d,'cafe'), z=N.doc.dias[d]||{}; return {d,a,cf,na:nN(z.a),nc:nN(z.c)}; });
    const sm=(k)=>rows.reduce((s,r)=>s+(r[k]&&r[k].n||0),0), sn=k=>rows.reduce((s,r)=>s+(r[k]||0),0), temD=k=>rows.some(r=>r[k]!=null);
    const sq=(k,kn)=>rows.reduce((s,r)=>s+(r[kn]!=null&&r[k]?r[k].n:0),0), qd=kn=>rows.filter(r=>r[kn]!=null).length;
    const T={sa:sm('a'),sc:sm('cf'),na:nN(N.doc.tot.a),nc:nN(N.doc.tot.c),totA:true,totC:true};
    T.saC=T.totA||!temD('na')?T.sa:sq('a','na'); T.scC=T.totC||!temD('nc')?T.sc:sq('cf','nc'); T.qa=qd('na'); T.qc=qd('nc');
    return {N,rows,T}; }
  function difTxt(sol,nota,curto){ if(sol==null||nota==null) return {t:'',cl:''}; const df=nota-sol; if(!df) return {t:curto?'bate':'Bate',cl:'ok'};
    return df>0?{t:curto?'+'+df:df+' a mais na nota',cl:'crit'}:{t:curto?String(df):(-df)+' a menos na nota',cl:'warn'}; }
  function vNota(c){ const P=c.P, esc=c.esc, m=A.mes, X=notaDados(c,m), N=X.N, T=X.T, semLA=!refCom('alm',()=>{ const s=FK; fkUsa('alm'); try{ return listaFolha().length; } finally{ fkUsa(s); } }), semLC=!(listaCafe().length);
    if(!N.ok) return `<div class="empty"><b>Carregando as folhas do mês…</b></div>`;
    const dA=difTxt(T.saC,T.na), dC=difTxt(T.scC,T.nc), nos=(q,tot)=>tot?'total do mês':q?'nos '+q+(q>1?' dias':' dia')+' com nota':'', wd=d=>['dom','seg','ter','qua','qui','sex','sáb'][new Date(d+'T12:00').getDay()];
    const k=(t,v,s,cl)=>`<div class="${cl?'nt-'+cl:''}"><span>${t}</span><b class="num">${v==null?'—':Number(v).toLocaleString('pt-BR')}</b><small>${s}</small></div>`;
    const inp=(d,f,v)=>`<input class="txt nt-in" type="number" min="0" inputmode="numeric" data-nt="${d}|${f}" value="${v==null?'':v}" aria-label="${f==='a'?'Almoços':'Cafés'} na nota em ${c.br(d)}">`;
    const cel=(sol,nota)=>{ const x=difTxt(sol&&sol.n,nota,true); return `<td class="nt-df ${x.cl}">${x.t}</td>`; };
    const solC=s=>s?`<td class="num">${s.n}${s.emit?'':' <small title="A folha deste dia ainda não foi impressa: número da lista agora">*</small>'}</td>`:`<td class="nt-mut">—</td>`;
    return `<!--nofx--><div class="nt-top"><div><b>Solicitado × nota do restaurante</b><div class="sub">Solicitado = pessoas na folha de assinatura do dia (lista fixa menos quem foi marcado "Não veio", férias ou tirado), o mesmo número do título da folha. Digite quanto veio na nota de cada dia.</div></div>
      <span style="flex:1"></span><button class="btn sec rh-sm" data-act="alm-ntxls">Excel</button><button class="btn rh-sm" data-act="alm-ntpdf">Baixar PDF</button></div>
      ${semLA||semLC?`<div class="alm-parc">${semLA?'A folha do <b>almoço</b> ainda não tem lista fixa. ':''}${semLC?'A folha do <b>café</b> ainda não tem lista fixa. ':''}Sem lista não dá para saber quantos foram solicitados: monte a lista em Por dia › Abrir a folha.</div>`:''}
      <div class="alm-kpi nt-k">${k('Almoços solicitados',T.sa,'pessoas nas folhas do mês')}${k('Almoços na nota',T.na,T.totA?'total do mês digitado':'soma dos dias')}${k('Diferença no almoço',T.na==null?null:T.na-T.saC,dA.t?dA.t+' · '+nos(T.qa,T.totA):'digite a nota',dA.cl)}
        ${k('Cafés solicitados',T.sc,'pessoas nas folhas do mês')}${k('Cafés na nota',T.nc,T.totC?'total do mês digitado':'soma dos dias')}${k('Diferença no café',T.nc==null?null:T.nc-T.scC,dC.t?dC.t+' · '+nos(T.qc,T.totC):'digite a nota',dC.cl)}</div>
      <div class="nt-cab"><label>Nº da nota <input class="txt" data-ntc="nf" value="${esc(N.doc.nf||'')}" style="max-width:160px"></label>
        <label>A nota veio só com o total? Almoços <input class="txt nt-in" type="number" min="0" data-ntc="ta" value="${N.doc.tot.a==null?'':esc(N.doc.tot.a)}"></label><label>Cafés <input class="txt nt-in" type="number" min="0" data-ntc="tc" value="${N.doc.tot.c==null?'':esc(N.doc.tot.c)}"></label>
        <label style="flex:1;min-width:220px">Observação <input class="txt" data-ntc="obs" value="${esc(N.doc.obs||'')}" placeholder="ex.: nota 1234 conferida com o restaurante"></label></div>
      <div class="nt-tw"><table class="nt-t"><thead><tr><th rowspan="2">Dia</th><th colspan="3">Almoço</th><th colspan="3">Café</th></tr><tr><th>Solicitado</th><th>Na nota</th><th>Diferença</th><th>Solicitado</th><th>Na nota</th><th>Diferença</th></tr></thead><tbody>
      ${X.rows.map(r=>`<tr><td><b>${c.br(r.d).slice(0,5)}</b> <small>${wd(r.d)}</small></td>${solC(r.a)}<td>${inp(r.d,'a',r.na)}</td>${cel(r.a,r.na)}${solC(r.cf)}<td>${inp(r.d,'c',r.nc)}</td>${cel(r.cf,r.nc)}</tr>`).join('')||'<tr><td colspan="7" class="nt-mut">Nenhum dia de expediente ainda neste mês.</td></tr>'}
      </tbody><tfoot><tr><td>Total</td><td class="num">${T.sa}</td><td class="num">${T.na==null?'—':T.na}</td><td class="nt-df ${dA.cl}">${difTxt(T.saC,T.na,true).t}</td><td class="num">${T.sc}</td><td class="num">${T.nc==null?'—':T.nc}</td><td class="nt-df ${dC.cl}">${difTxt(T.scC,T.nc,true).t}</td></tr></tfoot></table></div>
      <div class="sub">* folha ainda não impressa: o número é o da lista agora. Enter passa para o dia de baixo. ${N.doc.em?'Nota atualizada'+(N.doc.por?' por '+esc(N.doc.por):'')+' em '+esc(new Date(N.doc.em).toLocaleDateString('pt-BR'))+'.':''}</div><!--/nofx-->`; }
  async function notaGrava(c,m){ const N=NOTA[m]; if(!N) return; N.doc.em=new Date().toISOString(); N.doc.por=(c.P.S&&c.P.S.perfil&&c.P.S.perfil.nome)||'';
    try{ await c.P.db().doc('rh/dados/almoconota/'+m).set(Object.assign({mes:m},N.doc)); }catch(e){ c.P.toast('Não foi possível guardar a nota: '+((e&&e.message)||e)); } }
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset||!A.ctx) return; const m=A.mes, N=NOTA[m]; if(!N) return;
    if(t.dataset.nt){ const [d,f]=t.dataset.nt.split('|'); const z=N.doc.dias[d]=Object.assign({},N.doc.dias[d]); const v=nN(t.value); if(v==null) delete z[f]; else z[f]=v; if(!Object.keys(z).length) delete N.doc.dias[d]; notaGrava(A.ctx,m); A.ctx.P.rerender(); return; }
    if(t.dataset.ntc){ const k=t.dataset.ntc; if(k==='nf'||k==='obs') N.doc[k]=t.value.trim(); else { const v=nN(t.value), f=k==='ta'?'a':'c'; N.doc.tot=Object.assign({},N.doc.tot); if(v==null) delete N.doc.tot[f]; else N.doc.tot[f]=v; } notaGrava(A.ctx,m); A.ctx.P.rerender(); } });
  document.addEventListener('keydown',ev=>{ const t=ev.target; if(ev.key!=='Enter'||!t||!t.dataset||!t.dataset.nt) return; ev.preventDefault(); const f=t.dataset.nt.split('|')[1], xs=[...document.querySelectorAll('[data-nt$="|'+f+'"]')], i=xs.indexOf(t); (xs[i+1]||t).focus(); if(xs[i+1]) xs[i+1].select(); else t.blur(); });
  function notaTab(c){ const X=notaDados(c,A.mes), br=d=>c.br(d), f=(s)=>s?String(s.n):'—', g=v=>v==null?'':String(v), df=(s,v)=>difTxt(s&&s.n,v,true).t;
    return {X,rows:X.rows.map(r=>[br(r.d),f(r.a),g(r.na),df(r.a,r.na),f(r.cf),g(r.nc),df(r.cf,r.nc)])}; }
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="alm-ntpdf"],[data-act="alm-ntxls"]'); if(!b||!A.ctx) return; ev.stopPropagation(); const c=A.ctx, P=c.P, Q=notaTab(c), T=Q.X.T, N=Q.X.N;
    const cab=['Dia','Almoço solicitado','Almoço na nota','Diferença','Café solicitado','Café na nota','Diferença'], tot=['Total',String(T.sa),g0(T.na),difTxt(T.saC,T.na,true).t,String(T.sc),g0(T.nc),difTxt(T.scC,T.nc,true).t];
    function g0(v){ return v==null?'':String(v); }
    if(!window.RHRel) return P.toast('O gerador de relatórios ainda não carregou.');
    if(b.dataset.act==='alm-ntxls') return RHRel.xls('Almoco-cafe-nota-'+A.mes,[['Solicitado x nota',[cab].concat(Q.rows,[tot])]],{tit:'Almoço e café · solicitado × nota · '+mesNome(A.mes),sub:N.doc.nf?'Nota '+N.doc.nf:'',filtros:[]});
    const dA=difTxt(T.saC,T.na), dC=difTxt(T.scC,T.nc), cor=x=>x.cl==='crit'?'crit':x.cl==='warn'?'warn':x.cl==='ok'?'ok':'cinza';
    try{ await RHRel.pdf({tit:'Almoço e café · solicitado × nota',sub:mesNome(A.mes)+(N.doc.nf?' · nota '+N.doc.nf:''),filtros:[],arq:'Almoco-cafe-nota-'+A.mes,kpiCols:3,
      kpis:[{t:'Almoços solicitados',v:String(T.sa),s:'pessoas nas folhas',c:'pet'},{t:'Almoços na nota',v:g0(T.na)||'—',s:T.totA?'total do mês':'soma dos dias',c:'pet'},{t:'Diferença no almoço',v:T.na==null?'—':String(T.na-T.saC),s:dA.t,c:cor(dA)},
        {t:'Cafés solicitados',v:String(T.sc),s:'pessoas nas folhas',c:'teal'},{t:'Cafés na nota',v:g0(T.nc)||'—',s:T.totC?'total do mês':'soma dos dias',c:'teal'},{t:'Diferença no café',v:T.nc==null?'—':String(T.nc-T.scC),s:dC.t,c:cor(dC)}],
      partes:[{secao:'Dia a dia',nota:'solicitado = pessoas na folha de assinatura do dia',cols:[{t:'Dia',w:14},{t:'Almoço solicitado',w:16,al:'r'},{t:'Almoço na nota',w:16,al:'r'},{t:'Diferença',w:14,al:'r'},{t:'Café solicitado',w:16,al:'r'},{t:'Café na nota',w:16,al:'r'},{t:'Diferença',w:14,al:'r'}],
        rows:Q.rows.concat([Object.assign(tot,{_tot:true})]),vazio:'Nenhum dia.'}].concat(N.doc.obs?[{secao:'Observação',texto:N.doc.obs}]:[]),assina:'Conferido por (RH)'}); }catch(e){ P.toast(String(e&&e.message||e)); } },true);
  try{ document.head.insertAdjacentHTML('beforeend',`<style id="alm-nota-css">
  .nt-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin:6px 0 12px}.nt-top .sub{max-width:760px}
  .nt-k{grid-template-columns:repeat(3,minmax(0,1fr))!important}.nt-k .nt-crit b{color:var(--crit)}.nt-k .nt-warn b{color:var(--warn)}.nt-k .nt-ok b{color:var(--ok)}
  .nt-cab{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin:12px 0}.nt-cab label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
  .nt-tw{overflow-x:auto}.nt-t{width:100%;border-collapse:collapse;font-size:14px}.nt-t th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;padding:6px 8px;text-align:center;border-bottom:1px solid var(--line,#dde4e9)}
  .nt-t td{padding:4px 8px;border-bottom:1px solid var(--line,#eef2f5);text-align:center}.nt-t td:first-child{text-align:left;white-space:nowrap}.nt-t td small{color:var(--muted)}
  .nt-t tfoot td{font-weight:700;border-top:2px solid var(--line,#dde4e9)}.nt-t .nt-in,.nt-cab .nt-in{width:96px!important;max-width:96px;text-align:right;padding:6px 8px}
  .nt-card{margin-bottom:14px}.nt-l{display:grid;grid-template-columns:110px repeat(3,minmax(0,1fr));gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line,#eef2f5)}
  .nt-l>div{display:flex;flex-direction:column;gap:2px}.nt-l span{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.nt-l small{font-size:12px;color:var(--muted)}.nt-l b.num{font-size:24px}
  .nt-l .nt-crit b.num{color:var(--crit)}.nt-l .nt-warn b.num{color:var(--warn)}.nt-l .nt-ok b.num{color:var(--ok)}.nt-l .nt-in{width:120px!important;max-width:120px;font-size:18px;text-align:right}
  .nt-nf{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}.nt-nf .txt{width:160px}.nt-dd{margin-top:8px}.nt-dd summary{cursor:pointer;color:var(--teal-strong,#1f6e80);font-size:13px}.nt-dd .nt-t{max-width:360px;margin-top:6px}
  @media (max-width:700px){ .nt-l{grid-template-columns:1fr 1fr} .nt-l>b{grid-column:1/-1} }
  .nt-df.crit{color:var(--crit);font-weight:700}.nt-df.warn{color:var(--warn);font-weight:700}.nt-df.ok{color:var(--ok)}.nt-mut{color:var(--muted)}
  @media (max-width:700px){ .nt-k{grid-template-columns:repeat(2,minmax(0,1fr))!important} }
  </style>`); }catch(e){}
  /* 04/11 (2º pedido): a nota do restaurante é MENSAL — sem aba: quadro no alto do Fechamento do mês com solicitado (folhas) × nota do mês */
  function vNotaMes(c){ const esc=c.esc, m=A.mes, X=notaDados(c,m), N=X.N, T=X.T; if(!N.ok) return '';
    const semLA=!refCom('alm',()=>{ const s=FK; fkUsa('alm'); try{ return listaFolha().length; } finally{ fkUsa(s); } }), semLC=!listaCafe().length;
    const ln=(nm,f,sol,nota,sem)=>{ const x=difTxt(sol,nota); return `<div class="nt-l"><b>${nm}</b><div><span>Solicitados</span><b class="num">${sem?'—':sol.toLocaleString('pt-BR')}</b><small>${sem?'sem lista fixa na folha':'pessoas nas folhas do mês'}</small></div>
      <div><span>Na nota</span><input class="txt nt-in" type="number" min="0" inputmode="numeric" data-ntc="${f}" value="${nota==null?'':nota}" aria-label="${nm} na nota do mês"></div>
      <div class="nt-${x.cl||'mut'}"><span>Diferença</span><b class="num">${nota==null||sem?'—':(nota-sol>0?'+':'')+(nota-sol)}</b><small>${nota==null?'digite o que veio na nota':sem?'':x.t}</small></div></div>`; };
    const ds=X.rows.filter(r=>(r.a&&r.a.n)||(r.cf&&r.cf.n)), nao=ds.filter(r=>(r.a&&!r.a.emit)||(r.cf&&!r.cf.emit)).length;
    return `<!--nofx--><section class="card nt-card"><div class="nt-top"><div><div class="eyebrow">NOTA DO RESTAURANTE · ${esc(mesNome(m).toUpperCase())}</div><b>Solicitado × nota</b><div class="sub">Solicitado = pessoas na folha de assinatura de cada dia (lista fixa menos quem foi marcado "Não veio", férias ou tirado), somado no mês.</div></div>
      <label class="nt-nf">Nº da nota <input class="txt" data-ntc="nf" value="${esc(N.doc.nf||'')}"></label></div>
      ${ln('Almoço','ta',T.sa,nN(N.doc.tot.a),semLA)}${ln('Café','tc',T.sc,nN(N.doc.tot.c),semLC)}
      <details class="nt-dd"><summary>Ver o solicitado dia a dia (${ds.length} dias${nao?' · '+nao+' com folha ainda não impressa':''})</summary><table class="nt-t"><thead><tr><th>Dia</th><th>Almoço</th><th>Café</th></tr></thead><tbody>${ds.map(r=>`<tr><td>${c.br(r.d).slice(0,5)}</td><td class="num">${r.a?r.a.n+(r.a.emit?'':'*'):'—'}</td><td class="num">${r.cf?r.cf.n+(r.cf.emit?'':'*'):'—'}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="num">${T.sa}</td><td class="num">${T.sc}</td></tr></tfoot></table><div class="sub">* folha ainda não impressa: número da lista agora.</div></details></section><!--/nofx-->`; }
  window.RHAlmoco={tiraDasListas,_folhaDoc:(c,d)=>folhaDoc(c||A.ctx,d||A.dia),publicar,carregar,fechamento,_prDia:prDia,ausencia:P=>{ const h=P.hojeStr(); A.vis='dia'; A.pes=null; A.aus={k:'',fixo:false,tipo:'dia',data:h,dias:[],de:h,ate:'',mot:''}; P.go('rhalmoco'); },render,iniciar:c=>{ A.ctx=c; },interpretar,_fk:()=>FK,importar:(c,f)=>{ if(c&&!A.ctx) A.ctx=c; return importar(f); },_A:A};
})();
