/* Painel Colafix · rh-tarefas.js (31/10) — "Minha agenda" do RH (pedido: a Juliana organizar o dia a dia).
   Tela rhtarefas · Tarefas e calendário: tarefas com checklist, hora, prioridade, categoria, pessoa e repetição
     (todo dia, dia útil, semana, mês: ao concluir, cria a próxima); visões Dia (atrasadas, do dia, prazos do painel, pedidos
     com prazo, sem data, feitas), Semana e Mês (calendário; tocar no dia abre o dia). Cada pessoa vê só as próprias tarefas.
   Tela rhpedidos · Pedidos do pessoal: o que os funcionários pediram ao RH (quem, o quê, por onde chegou, prazo),
     com situação Novo → Fazendo → Pronto → Entregue, "Avisar no WhatsApp" quando fica pronto, "Virar tarefa",
     números (em aberto, atrasados, entregues no mês, tempo médio). O RH todo vê os pedidos.
   Dados (regra rh/{resto=**}): rh/dados/tarefas/{id} {t,data,hora,prio,cat,itens:[{t,ok}],obs,rep,feita,feitaEm,uid,porNome,em,funcId,funcNome,pedidoId,removido}
     rh/dados/pedidos/{id} {quem,funcId,setor,tel,tipo,oque,canal,prazo,st:'novo'|'fazendo'|'pronto'|'entregue',resp,em,porNome,prontoEm,entregueEm,hist,removido}
   Usado pelo rh.js: RHTar.tarefas(ctx) · RHTar.pedidos(ctx) · RHTar.avisos(ctx); ctx = {P,esc,eu,topo,func,prazos,titulo}. Prefixo `rt`. */
(function(){
  const CT='rh/dados/tarefas', CP='rh/dados/pedidos';
  const T={xs:[],ps:[],lidoT:false,lidoP:false,sub:false,vis:'dia',dia:null,sem:0,mes:null,f:null,pf:null,pfil:'aberto',pq:'',salv:false};
  let C=null;
  const CATS=['Admissão','Desligamento','Folha','Férias','Documentos','Benefícios','Saúde e segurança','Pessoal'];
  const REP=[['','Não repete'],['dia','Todo dia'],['util','Todo dia útil'],['semana','Toda semana'],['mes','Todo mês']];
  const PT=['Declaração','Holerite','Férias','Documento','Uniforme / EPI','Benefício','Dúvida','Outro'], CANAIS=['WhatsApp','Pessoalmente','Telefone','E-mail','Outro'];
  const CANAL_TXT={WhatsApp:'pediu pelo WhatsApp',Pessoalmente:'pediu pessoalmente',Telefone:'pediu por telefone','E-mail':'pediu por e-mail',Outro:''};
  const PST=[['novo','Novo','warn'],['fazendo','Fazendo','neu'],['pronto','Pronto para entregar','ok'],['entregue','Entregue','neu']];
  const SEMANA=['domingo','segunda','terça','quarta','quinta','sexta','sábado'], plural=(n,a,b)=>n+' '+(n===1?a:b), SEMN=['dom','seg','ter','qua','qui','sex','sáb'], MESN=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const dIso=s=>{ const [y,m,d]=String(s||'').split('-').map(Number); return new Date(y,(m||1)-1,d||1); };
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const soma=(s,n)=>{ const d=dIso(s); d.setDate(d.getDate()+n); return iso(d); };
  const util=(s,n)=>{ let d=dIso(s), k=0; while(k<n){ d.setDate(d.getDate()+1); if(d.getDay()%6) k++; } return iso(d); };
  const brc=s=>s?s.slice(8,10)+'/'+s.slice(5,7):'';
  const hoje=()=>C.P.hojeStr(), agora=()=>new Date().toISOString(), uid=()=>C.P.S.uid||'';
  const minhas=()=>T.xs.filter(x=>x.uid===uid());
  const novoId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  function proxData(x){ const b=x.data||hoje(); if(x.rep==='dia') return soma(b,1); if(x.rep==='util') return util(b,1); if(x.rep==='semana') return soma(b,7);
    if(x.rep==='mes'){ const d=dIso(b), dia=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+1); const ult=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(dia,ult)); return iso(d); } return ''; }

  function assina(c){ if(T.sub) return; T.sub=true; const P=c.P;
    P.inscrever('rh-tarefas',()=>P.db().collection(CT).limit(3000),s=>{ T.xs=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); T.lidoT=true; P.rerender(); });
    P.inscrever('rh-pedidos',()=>P.db().collection(CP).limit(3000),s=>{ T.ps=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); T.lidoP=true; P.rerender(); }); }
  async function grava(col,id,d,merge){ await C.P.db().doc(col+'/'+id).set(d,merge?{merge:true}:undefined); const xs=col===CT?T.xs:T.ps, i=xs.findIndex(x=>x._id===id);
    if(d.removido){ if(i>=0) xs.splice(i,1); return; } if(i>=0) xs[i]=Object.assign({},merge?xs[i]:{_id:id},d,{_id:id}); else xs.push(Object.assign({_id:id},d)); }

  /* ---------------- visual (31/10: redesenho) ---------------- */
  const CORC={'Admissão':'#2F8C5A','Desligamento':'#8A5A44','Folha':'#2B6A87','Férias':'#C47814','Documentos':'#6B4FA0','Benefícios':'#1F8A8A','Saúde e segurança':'#C0392B','Pessoal':'#5B6770'};
  const PAL=['#2B6A87','#2F8C5A','#6B4FA0','#C47814','#1F8A8A','#8A5A44','#B5476B','#5B6770'];
  /* temas da agenda (31/10, "ficou muito masculino"): cada pessoa escolhe; fica salvo no aparelho */
  const TEMAS=[['rose','Rosé','#D5668C'],['lavanda','Lavanda','#8E6CC8'],['pessego','Pêssego','#DE7F58'],['petroleo','Azul','#143F54']];
  const temaDe=()=>'petroleo'; /* 31/10: a usuária pediu as cores originais; os temas suaves continuam no código, desligados */
  const corTema=()=>(TEMAS.find(x=>x[0]===temaDe())||TEMAS[0])[2];
  const seletorTema=()=>''; const _seletorTemaDesligado=()=>`<div class="rt-temas" role="group" aria-label="Cor da agenda">${TEMAS.map(([k,l,c])=>`<button data-act="rt-tema" data-v="${k}" style="--t:${c}" aria-pressed="${temaDe()===k}" title="${l}" aria-label="Cor ${l}"></button>`).join('')}</div>`;
  const hashC=s=>{ let h=0; for(const ch of String(s||'')) h=(h*31+ch.charCodeAt(0))>>>0; return PAL[h%PAL.length]; };
  const corDe=c=>c?(CORC[c]||hashC(c)):'#8C969C';
  const ini=n=>String(n||'?').trim().split(/\s+/).filter((w,i,a)=>i===0||i===a.length-1).map(w=>w[0]).join('').toUpperCase();
  const av=(n,cls)=>`<span class="rt-av ${cls||''}" style="--a:${hashC(n)}" aria-hidden="true">${C.esc(ini(n))}</span>`;
  const SVGI=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICT={aniv:'<path d="M4 21h16v-8H4z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M12 13V9"/>',ferias:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    exp:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',feriado:'<path d="M5 21V4h11l-2 4 2 4H5"/>',doc:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',pessoa:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pedido:'<path d="M4 5h16v11H8l-4 4z"/>',rep:'<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',flag:'<path d="M5 21V4h12l-2 4 2 4H5"/>',mais:'<path d="M12 5v14M5 12h14"/>'};
  const icTipo=t=>ICT[{aniv:'aniv',casa:'aniv',ferias:'ferias',exp:'exp',feriado:'feriado',pj:'doc',contrato:'doc',doc:'doc',adm:'pessoa',desl:'pessoa'}[t]||'exp'];
  const cumpr=()=>{ const h=new Date().getHours(); return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'; };

  /* ---------------- tarefas ---------------- */
  const ordT=(a,b)=>(a.hora||'99').localeCompare(b.hora||'99')||((b.prio==='alta')-(a.prio==='alta'))||String(a.em||'').localeCompare(String(b.em||''));
  function cartaoT(x,compacto){ const e=C.esc, its=x.itens||[], ok=its.filter(i=>i.ok).length, atr=!x.feita&&x.data&&x.data<hoje(), cor=corDe(x.cat);
    const chips=[x.cat&&`<span class="rt-tag" style="--c:${cor}">${e(x.cat)}</span>`,x.prio==='alta'&&`<span class="rt-tag rt-imp">${SVGI(ICT.flag)}importante</span>`,
      atr&&`<span class="rt-tag rt-late">desde ${brc(x.data)}</span>`,compacto&&x.hora&&`<span class="rt-meta">${e(x.hora)}</span>`,x.data&&T.vis!=='dia'&&!atr&&`<span class="rt-meta">${brc(x.data)}</span>`,
      x.funcNome&&`<span class="rt-pess">${av(x.funcNome,'sm')}${e(x.funcNome)}</span>`,x.rep&&`<span class="rt-meta rt-rp">${SVGI(ICT.rep)}${e((REP.find(r=>r[0]===x.rep)||['',''])[1].toLowerCase())}</span>`].filter(Boolean).join('');
    return `<div class="rt-t ${x.feita?'feita':''}" style="--c:${cor}"><button class="rt-ck" data-act="rt-ok" data-id="${e(x._id)}" aria-pressed="${!!x.feita}" aria-label="${x.feita?'Desmarcar':'Concluir'}: ${e(x.t)}">${SVGI('<path d="m5 12.5 4.5 4.5L19 7.5"/>')}</button>
      <div class="rt-tb"><button class="rt-tt" data-act="rt-ed" data-id="${e(x._id)}">${e(x.t)}</button>${chips?`<div class="rt-chips">${chips}</div>`:''}
        ${its.length?`<div class="rt-cl"><div class="rt-clb"><span style="width:${Math.round(ok/its.length*100)}%"></span></div><small>${ok} de ${its.length}</small></div>`:''}
        ${its.length&&!x.feita&&!compacto?`<div class="rt-its">${its.map((it,i)=>`<label><input type="checkbox" data-rt-it="${e(x._id)}" data-i="${i}" ${it.ok?'checked':''}><span>${e(it.t)}</span></label>`).join('')}</div>`:''}</div></div>`; }
  function prazosDe(d){ try{ return (C.prazos?C.prazos():[]).filter(x=>x.data===d); }catch(e){ return []; } }
  function anel(f,t){ const r=34, c=2*Math.PI*r, p=t?f/t:0;
    return `<div class="rt-ring" role="img" aria-label="${f} de ${t} feitas"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="${r}" class="bg"/><circle cx="42" cy="42" r="${r}" class="fg" stroke-dasharray="${(c*p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/></svg><div><b>${t?f+'/'+t:'—'}</b><small>${t&&f===t?'tudo feito':'feitas'}</small></div></div>`; }
  function faixaSemana(sel){ const hj=hoje(), d0=dIso(sel); d0.setDate(d0.getDate()-((d0.getDay()+6)%7)); const ms=minhas();
    return `<nav class="rt-strip" aria-label="Dias da semana">${[...Array(7)].map((_,i)=>{ const d=iso(new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+i)), n=ms.filter(x=>x.data===d&&!x.feita).length, dt=dIso(d);
      return `<button class="rt-sd ${d===sel?'on':''} ${d===hj?'hj':''}" data-act="rt-abredia" data-v="${d}" aria-current="${d===sel?'date':'false'}"><small>${SEMN[dt.getDay()]}</small><b>${dt.getDate()}</b><i>${n?'<em></em>'.repeat(Math.min(n,3)):''}</i></button>`; }).join('')}</nav>`; }
  /* layout B (31/10, escolha da usuária): calendário do mês fixo à esquerda (+ pedidos e prazos do dia), o dia escolhido à direita em lista leve */
  function miniCal(sel){ const e=C.esc, hj=hoje(), m=T.mm||sel.slice(0,7), d1=dIso(m+'-01'), ini=soma(m+'-01',-((d1.getDay()+6)%7)), cel=[...Array(42)].map((_,i)=>soma(ini,i)), [y,mm]=m.split('-').map(Number), ms=minhas();
    const ant=iso(new Date(y,mm-2,1)).slice(0,7), prx=iso(new Date(y,mm,1)).slice(0,7), pzM={}; try{ (C.prazos?C.prazos():[]).forEach(x=>{ if(x.data&&x.data.slice(0,7)===m) pzM[x.data]=1; }); }catch(er){}
    return `<section class="rt-mcal" aria-label="Calendário"><div class="rt-mch"><button class="rt-mnav" data-act="rt-mm" data-v="${ant}" aria-label="Mês anterior">‹</button><b>${MESN[mm-1][0].toUpperCase()+MESN[mm-1].slice(1)} ${y}</b><button class="rt-mnav" data-act="rt-mm" data-v="${prx}" aria-label="Próximo mês">›</button></div>
      <div class="rt-mg">${['S','T','Q','Q','S','S','D'].map(s=>`<i class="rt-mw">${s}</i>`).join('')}${cel.map(d=>{ const ab=ms.filter(x=>x.data===d&&!x.feita).length, pz=pzM[d]||T.ps.some(p=>p.st!=='entregue'&&p.prazo===d);
        return `<button class="rt-md ${d.slice(0,7)!==m?'fora':''} ${d===hj?'hj':''} ${d===sel?'on':''}" data-act="rt-abredia" data-v="${d}" aria-label="${brc(d)}${ab?', '+ab+' a fazer':''}" ${d===sel?'aria-current="date"':''}>${+d.slice(8)}<span>${ab?'<em></em>':''}${pz?'<em class="p"></em>':''}</span></button>`; }).join('')}</div>
      <div class="rt-mleg"><span><em></em>tarefas</span><span><em class="p"></em>prazo do painel</span>${sel!==hj||m!==hj.slice(0,7)?`<button class="lnk" data-act="rt-hoje">Hoje</button>`:''}</div></section>`; }
  function linhaB(x,comHora){ const e=C.esc, its=x.itens||[], ok=its.filter(i=>i.ok).length, atr=!x.feita&&x.data&&x.data<hoje(), cor=corDe(x.cat);
    const meta=[atr&&`<span class="rt-mlate">atrasada desde ${brc(x.data)}</span>`,x.cat&&`<span class="rt-mcat" style="--c:${cor}">${e(x.cat)}</span>`,x.prio==='alta'&&`<span class="rt-mimp">${SVGI(ICT.flag)}importante</span>`,
      x.funcNome&&`<span class="rt-pess">${av(x.funcNome,'sm')}${e(x.funcNome)}</span>`,x.rep&&`<span class="rt-meta rt-rp">${SVGI(ICT.rep)}${e((REP.find(r=>r[0]===x.rep)||['',''])[1].toLowerCase())}</span>`,its.length&&`<span class="rt-meta">${ok} de ${its.length}</span>`].filter(Boolean).join('');
    return `<div class="rt-r ${x.feita?'feita':''}" style="--c:${cor}">${comHora?`<time>${e(x.hora||'')}</time>`:''}<button class="rt-ck" data-act="rt-ok" data-id="${e(x._id)}" aria-pressed="${!!x.feita}" aria-label="${x.feita?'Desmarcar':'Concluir'}: ${e(x.t)}">${SVGI('<path d="m5 12.5 4.5 4.5L19 7.5"/>')}</button>
      <div class="rt-tb"><button class="rt-tt" data-act="rt-ed" data-id="${e(x._id)}">${e(x.t)}</button>${meta?`<div class="rt-chips">${meta}</div>`:''}
        ${its.length&&!x.feita?`<div class="rt-its">${its.map((it,i)=>`<label><input type="checkbox" data-rt-it="${e(x._id)}" data-i="${i}" ${it.ok?'checked':''}><span>${e(it.t)}</span></label>`).join('')}</div>`:''}</div></div>`; }
  function vDia(){ const e=C.esc, d=T.dia||hoje(), hj=hoje(), ms=minhas(), doDia=ms.filter(x=>x.data===d).sort(ordT), pend=doDia.filter(x=>!x.feita), feitas=doDia.filter(x=>x.feita);
    const atras=d===hj?ms.filter(x=>!x.feita&&x.data&&x.data<hj).sort((a,b)=>a.data.localeCompare(b.data)):[], sem=d===hj?ms.filter(x=>!x.feita&&!x.data).sort(ordT):[];
    const pz=prazosDe(d), pds=T.ps.filter(p=>p.st!=='entregue'&&p.prazo===d), dt=dIso(d), ab=T.ps.filter(p=>p.st!=='entregue'), atP=ab.filter(p=>p.prazo&&p.prazo<hj).length;
    const rot=d===hj?'Hoje':d===soma(hj,1)?'Amanhã':d===soma(hj,-1)?'Ontem':'';
    const comHora=pend.filter(x=>x.hora), semHora=pend.filter(x=>!x.hora), tot=doDia.length, pct=tot?Math.round(feitas.length/tot*100):0;
    const grupo=(tit,xs,cls,extra,ch)=>xs.length?`<div class="rt-g ${cls||''}"><div class="rt-gh"><h3>${tit}</h3><span class="rt-cnt">${xs.length}</span>${extra||''}</div>${xs.map(x=>linhaB(x,ch)).join('')}</div>`:'';
    return `<div class="rt-b">
      <aside class="rt-bl">${miniCal(d)}
        <section class="rt-bx"><div class="rt-bxh"><h3>Pedidos do pessoal</h3><button class="lnk" data-go="rhpedidos">Ver todos</button></div>
          ${ab.length?`<p class="rt-bxs">${plural(ab.length,'pedido do pessoal em aberto','pedidos do pessoal em aberto')}${atP?` · <b class="rt-red">${plural(atP,'atrasado','atrasados')}</b>`:''}</p>
          ${ab.slice().sort((a,b)=>String(a.prazo||'9').localeCompare(String(b.prazo||'9'))).slice(0,3).map(p=>`<button class="rt-pi" data-act="rt-pedgo" data-id="${e(p._id)}">${av(p.quem,'sm')}<span><b>${e(p.quem)}</b><small>${e(p.tipo||p.oque||'')}</small></span><span class="rt-pdue">${prazoChip(p)}</span></button>`).join('')}`:'<p class="rt-bxs">Nenhum pedido em aberto.</p>'}</section>
        <section class="rt-bx"><div class="rt-bxh"><h3>Prazos do painel</h3><span class="rt-bxd">${brc(d)}</span></div>
          ${pz.length||pds.length?pz.map(x=>`<div class="rt-pz ${e(x.c)}"><span class="rt-pzi">${SVGI(icTipo(x.tipo))}</span><span class="rt-pzt"><b>${e(x.t)}</b><small>${e(x.s||'')}</small></span>${x.act?`<button class="lnk" ${x.act}>Abrir</button>`:''}</div>`).join('')+
            pds.map(p=>`<div class="rt-pz warn"><span class="rt-pzi">${SVGI(ICT.pedido)}</span><span class="rt-pzt"><b>Pedido de ${e(p.quem)}</b><small>${e(p.oque||p.tipo||'')}</small></span><button class="lnk" data-act="rt-pedgo" data-id="${e(p._id)}">Abrir</button></div>`).join('')
            :'<p class="rt-bxs">Nada do painel neste dia.</p>'}</section></aside>
      <section class="rt-br"><div class="rt-dh"><div class="rt-dtx"><span class="rt-dk">${rot?rot+' · ':''}${SEMANA[dt.getDay()]}</span><h2>${dt.getDate()} de ${MESN[dt.getMonth()]}</h2>
          <p>${tot?`<span class="rt-pg"><span style="width:${pct}%"></span></span>${feitas.length} de ${tot} feitas${pct===100?' · tudo feito':''}`:'Nenhuma tarefa marcada'}</p></div>
          <div class="rt-dnav" role="group" aria-label="Trocar de dia"><button data-act="rt-dia" data-v="-1" aria-label="Dia anterior">‹</button>${d===hj?'<button disabled>Hoje</button>':'<button data-act="rt-hoje">Voltar para hoje</button>'}<button data-act="rt-dia" data-v="1" aria-label="Próximo dia">›</button></div></div>
        <div class="rt-rap2">${SVGI(ICT.mais)}<input id="rt-rap" placeholder="Nova tarefa para ${d===hj?'hoje':brc(d)}" autocomplete="off" aria-label="Nova tarefa"><button class="btn rh-sm" data-act="rt-rap">Adicionar</button></div>
        ${grupo('Atrasadas',atras,'late',`<button class="lnk" data-act="rt-passar">Passar ${atras.length===1?'para':'todas para'} hoje</button>`)}
        ${comHora.length?`<div class="rt-g"><div class="rt-gh"><h3>${d===hj?'Para hoje':'Para '+brc(d)}</h3><span class="rt-cnt">${pend.length}</span></div>${comHora.map(x=>linhaB(x,true)).join('')}${semHora.length?`<div class="rt-sub">A qualquer hora</div>${semHora.map(x=>linhaB(x,true)).join('')}`:''}</div>`
          :grupo(d===hj?'Para hoje':'Para '+brc(d),semHora,'',null,false)}
        ${!pend.length?`<div class="rt-empty">${SVGI('<path d="m5 12.5 4.5 4.5L19 7.5"/>')}<b>${doDia.length?'Tudo feito neste dia.':'Dia livre.'}</b><span>${doDia.length?'Bom trabalho!':'Escreva no campo acima para marcar uma tarefa.'}</span></div>`:''}
        ${grupo('Sem data',sem,'sem')}
        ${feitas.length?`<details class="rt-fts"><summary>Feitas (${feitas.length})</summary>${feitas.map(x=>linhaB(x,false)).join('')}</details>`:''}</section></div>`; }
  function semanaIni(){ const d=dIso(hoje()); d.setDate(d.getDate()-((d.getDay()+6)%7)+T.sem*7); return iso(d); }
  function vSemana(){ const e=C.esc, ini=semanaIni(), hj=hoje(), ms=minhas(), dias=[...Array(7)].map((_,i)=>soma(ini,i));
    return `<section class="rt-bar"><button class="rt-rb dk" data-act="rt-sem" data-v="-1" aria-label="Semana anterior">‹</button><div><b>${brc(ini)} a ${brc(dias[6])}</b><small>${T.sem?`<button class="lnk" data-act="rt-sem" data-v="0">voltar para esta semana</button>`:'esta semana'}</small></div><button class="rt-rb dk" data-act="rt-sem" data-v="1" aria-label="Próxima semana">›</button></section>
      <div class="rt-wk">${dias.map(d=>{ const xs=ms.filter(x=>x.data===d).sort(ordT), pz=prazosDe(d), dt=dIso(d);
        return `<section class="rt-wd ${d===hj?'hj':''}"><button class="rt-wdh" data-act="rt-abredia" data-v="${d}"><small>${SEMN[dt.getDay()]}</small><b>${dt.getDate()}</b></button>
          <div class="rt-wl">${xs.map(x=>`<button class="rt-wi ${x.feita?'feita':''}" style="--c:${corDe(x.cat)}" data-act="rt-ed" data-id="${e(x._id)}">${x.hora?'<i>'+e(x.hora)+'</i>':''}${e(x.t)}</button>`).join('')}
          ${pz.map(x=>`<div class="rt-wp"><span>${SVGI(icTipo(x.tipo))}</span>${e(x.t)}</div>`).join('')}${xs.length||pz.length?'':'<div class="rt-wv">livre</div>'}</div></section>`; }).join('')}</div>`; }
  function vMes(){ const e=C.esc, m=T.mes||hoje().slice(0,7), d1=dIso(m+'-01'), hj=hoje(), ms=minhas(), ini=soma(m+'-01',-((d1.getDay()+6)%7)), cel=[...Array(42)].map((_,i)=>soma(ini,i)), [y,mm]=m.split('-').map(Number);
    const ant=iso(new Date(y,mm-2,1)).slice(0,7), prx=iso(new Date(y,mm,1)).slice(0,7);
    return `<section class="rt-bar"><button class="rt-rb dk" data-act="rt-mes" data-v="${ant}" aria-label="Mês anterior">‹</button><div><b>${MESN[mm-1][0].toUpperCase()+MESN[mm-1].slice(1)} de ${y}</b><small>${m!==hj.slice(0,7)?`<button class="lnk" data-act="rt-mes" data-v="${hj.slice(0,7)}">voltar para este mês</button>`:'este mês'}</small></div><button class="rt-rb dk" data-act="rt-mes" data-v="${prx}" aria-label="Próximo mês">›</button></section>
      <section class="rt-cal"><div class="rt-cg">${['seg','ter','qua','qui','sex','sáb','dom'].map(s=>`<b class="rt-cw">${s}</b>`).join('')}
        ${cel.map(d=>{ const xs=ms.filter(x=>x.data===d).sort(ordT), ab=xs.filter(x=>!x.feita), pz=prazosDe(d).length+T.ps.filter(p=>p.st!=='entregue'&&p.prazo===d).length;
          return `<button class="rt-cd ${d.slice(0,7)!==m?'fora':''} ${d===hj?'hj':''} ${xs.length&&!ab.length?'ok':''}" data-act="rt-abredia" data-v="${d}" aria-label="${brc(d)}: ${ab.length} a fazer"><span class="rt-cn">${+d.slice(8)}</span>${pz?'<em title="Prazo do painel"></em>':''}
            <span class="rt-cx">${ab.slice(0,2).map(x=>`<i style="--c:${corDe(x.cat)}">${e(x.t)}</i>`).join('')}${ab.length>2?`<small>+${ab.length-2}</small>`:''}${xs.length&&!ab.length?'<small class="ok">✓ feito</small>':''}</span>
            <span class="rt-cdots">${ab.slice(0,3).map(x=>`<i style="--c:${corDe(x.cat)}"></i>`).join('')}</span><span class="rt-cc">${ab.length||(xs.length?'✓':'')}</span></button>`; }).join('')}</div>
        <div class="rt-leg"><span><i class="d"></i> prazo do painel</span>${Object.keys(CORC).filter(k=>ms.some(x=>x.cat===k)).map(k=>`<span><i style="--c:${CORC[k]}"></i>${k}</span>`).join('')}</div></section>`; }
  function formT(){ const e=C.esc, f=T.f, fs=(C.func?C.func():[]).map(x=>C.titulo?C.titulo(x.nome):x.nome).sort((a,b)=>a.localeCompare(b,'pt-BR')), cats=[...new Set(CATS.concat(T.xs.map(x=>x.cat).filter(Boolean)))];
    return `<div class="dbmodal" data-rt-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Tarefa" style="max-width:620px"><div class="rt-fm">
      <div class="head" style="align-items:baseline;margin:0"><h2 style="margin:0">${f._id?'Tarefa':'Nova tarefa'}</h2><button class="lnk" data-act="rt-fx">Fechar</button></div>
      <label class="rt-w"><span>O que fazer</span><input class="txt" id="rt-ft" value="${e(f.t||'')}" placeholder="Ex.: Conferir os atestados da semana"></label>
      <div class="rt-g3"><label><span>Dia</span><input class="txt" type="date" id="rt-fd" value="${e(f.data||'')}"></label><label><span>Hora</span><input class="txt" type="time" id="rt-fh" value="${e(f.hora||'')}"></label>
        <label><span>Prioridade</span><select class="txt" id="rt-fp"><option value="">Normal</option><option value="alta" ${f.prio==='alta'?'selected':''}>Importante</option></select></label></div>
      <div class="rt-g3"><label><span>Categoria</span><input class="txt" id="rt-fc" list="rt-cats" value="${e(f.cat||'')}"><datalist id="rt-cats">${cats.map(c=>`<option value="${e(c)}">`).join('')}</datalist></label>
        <label><span>Repetir</span><select class="txt" id="rt-fr">${REP.map(([k,l])=>`<option value="${k}" ${(f.rep||'')===k?'selected':''}>${l}</option>`).join('')}</select></label>
        <label><span>Pessoa (opcional)</span><input class="txt" id="rt-fn" list="rt-fns" value="${e(f.funcNome||'')}"><datalist id="rt-fns">${fs.map(n=>`<option value="${e(n)}">`).join('')}</datalist></label></div>
      <label class="rt-w"><span>Checklist (um item por linha)</span><textarea class="txt" id="rt-fi" rows="4" placeholder="Pedir os documentos&#10;Agendar o exame&#10;Mandar para a contabilidade">${e((f.itens||[]).map(i=>i.t).join('\n'))}</textarea></label>
      <label class="rt-w"><span>Anotações</span><textarea class="txt" id="rt-fo" rows="2">${e(f.obs||'')}</textarea></label>
      <div class="rt-fa">${f._id?`<button class="lnk" data-act="rt-del" style="color:var(--crit-ink)">Apagar</button><button class="lnk" data-act="rt-dup">Duplicar</button>`:''}<span></span><button class="btn sec" data-act="rt-fx">Cancelar</button><button class="btn" data-act="rt-fok" ${T.salv?'disabled':''}>Salvar</button></div></div></div></div>`; }
  function tarefas(c){ C=c; assina(c); const P=c.P, e=c.esc, hj=hoje(), ms=minhas(), atr=ms.filter(x=>!x.feita&&x.data&&x.data<hj).length, pa=T.ps.filter(p=>p.st!=='entregue').length;
    const seg=`<div class="seg" role="group" aria-label="Visão">${[['dia','Dia'],['semana','Semana'],['mes','Mês']].map(([k,l])=>`<button data-act="rt-vis" data-v="${k}" aria-pressed="${T.vis===k}">${l}</button>`).join('')}</div>`;
    return c.topo('Minha agenda',(atr?atr+(atr===1?' tarefa atrasada':' tarefas atrasadas')+' · ':'')+'Suas tarefas, com checklist e calendário. Só você vê.',seletorTema()+seg+`<button class="btn rt-cta" style="--t:${corTema()}" data-act="rt-nova">+ Tarefa</button>`)+`<div class="rt-wrap" data-tema="${temaDe()}">`+
      (pa&&T.vis!=='dia'?`<div class="banner rt-ban"><span><b>${pa}</b> ${pa===1?'pedido do pessoal em aberto':'pedidos do pessoal em aberto'}</span><button class="lnk" data-go="rhpedidos">Ver pedidos</button></div>`:'')+
      (!T.lidoT?'<section class="card"><div class="empty">Carregando…</div></section>':T.vis==='semana'?vSemana():T.vis==='mes'?vMes():vDia())+(T.f?formT():'')+'</div>'; }

  /* ---------------- pedidos do pessoal ---------------- */
  const stDe=k=>PST.find(s=>s[0]===k)||PST[0];
  const CORT={'Declaração':'#2B6A87','Holerite':'#2F8C5A','Férias':'#C47814','Documento':'#6B4FA0','Uniforme / EPI':'#C0392B','Benefício':'#1F8A8A','Dúvida':'#5B6770','Outro':'#8A5A44'};
  function prazoChip(p){ const hj=hoje(); if(p.st==='entregue') return `<span class="rt-due ok">entregue ${brc((p.entregueEm||'').slice(0,10))}</span>`; if(!p.prazo) return '<span class="rt-due">sem prazo</span>';
    const n=Math.round((dIso(p.prazo)-dIso(hj))/864e5); return n<0?`<span class="rt-due late">atrasado ${plural(-n,'dia','dias')}</span>`:n===0?'<span class="rt-due hoje">vence hoje</span>':`<span class="rt-due">até ${brc(p.prazo)}</span>`; }
  function cardP(p){ const e=C.esc, i=PST.findIndex(s=>s[0]===p.st), prox=PST[i+1], w=String(p.tel||'').replace(/\D/g,''), atr=p.st!=='entregue'&&p.prazo&&p.prazo<hoje();
    const nxt={fazendo:'Comecei',pronto:'Ficou pronto',entregue:'Entregue'}, ct=CORT[p.tipo]||'#5B6770';
    return `<article class="rt-pc ${atr?'atr':''}"><div class="rt-pch">${av(p.quem)}<div><b>${e(p.quem||'Sem nome')}</b><small>${[p.setor&&e(p.setor),p.canal&&CANAL_TXT[p.canal]].filter(Boolean).join(' · ')}</small></div>${prazoChip(p)}</div>
      ${p.tipo?`<span class="rt-tag" style="--c:${ct}">${e(p.tipo)}</span>`:''}<p class="rt-po">${e(p.oque||'')}</p>
      ${p.resp?`<p class="rt-pr">${e(p.resp)}</p>`:''}
      <div class="rt-pf">${prox?`<button class="btn rh-sm" data-act="rt-pst" data-id="${e(p._id)}" data-v="${prox[0]}">${nxt[prox[0]]}</button>`:''}
        ${p.st==='pronto'&&w.length>=10?`<button class="btn sec rh-sm rt-wa" data-act="rt-pwa" data-id="${e(p._id)}">Avisar no WhatsApp</button>`:''}
        <span class="rt-pfl">${p.st!=='entregue'&&!T.xs.some(x=>x.pedidoId===p._id&&!x.feita)?`<button class="lnk" data-act="rt-ptar" data-id="${e(p._id)}">Virar tarefa</button>`:''}<button class="lnk" data-act="rt-ped" data-id="${e(p._id)}">Editar</button></span></div></article>`; }
  function pedidos(c){ C=c; assina(c); const e=c.esc, hj=hoje(), m=hj.slice(0,7), ab=T.ps.filter(p=>p.st!=='entregue'), atr=ab.filter(p=>p.prazo&&p.prazo<hj).length, ent=T.ps.filter(p=>p.st==='entregue'&&String(p.entregueEm||'').slice(0,7)===m);
    const dur=ent.map(p=>(new Date(p.entregueEm)-new Date(p.em))/864e5).filter(n=>n>=0), med=dur.length?dur.reduce((a,b)=>a+b,0)/dur.length:null, q=String(T.pq||'').toLowerCase();
    const filtra=xs=>xs.filter(p=>!q||[p.quem,p.oque,p.tipo,p.setor].join(' ').toLowerCase().includes(q));
    const ordA=(a,b)=>((b.prazo&&b.prazo<hj)-(a.prazo&&a.prazo<hj))||String(a.prazo||'9').localeCompare(String(b.prazo||'9'))||String(a.em||'').localeCompare(String(b.em||''));
    if(['novo','fazendo','pronto'].includes(T.pfil)) T.pfil='aberto';
    const stat=(n,l,cls,ic)=>`<div class="rt-st ${cls||''}"><span class="rt-sti">${SVGI(ic)}</span><div><b>${n}</b><small>${l}</small></div></div>`;
    const quadro=`<div class="rt-board">${PST.slice(0,3).map(([k,l,cl])=>{ const xs=filtra(T.ps.filter(p=>p.st===k)).sort(ordA);
        return `<section class="rt-colm rt-c-${k}"><div class="rt-colh"><i></i><h3>${k==='pronto'?'Prontos para entregar':k==='novo'?'Novos':'Fazendo'}</h3><span class="rt-cnt">${xs.length}</span></div>
          ${xs.length?xs.map(cardP).join(''):`<div class="rt-colv">${k==='novo'?'Nenhum pedido novo.':k==='fazendo'?'Nada em andamento.':'Nada esperando entrega.'}</div>`}</section>`; }).join('')}</div>`;
    const entregues=filtra(T.ps.filter(p=>p.st==='entregue')).sort((a,b)=>String(b.entregueEm||'').localeCompare(String(a.entregueEm||'')));
    return c.topo('Pedidos do pessoal','Tudo o que os funcionários pediram ao RH, do pedido até a entrega.',seletorTema()+`<button class="btn rt-cta" style="--t:${corTema()}" data-act="rt-pnovo">+ Pedido</button>`)+
      `<div class="rt-wrap" data-tema="${temaDe()}"><div class="rt-stats">${stat(ab.length,'em aberto','',ICT.pedido)}${stat(atr,atr===1?'atrasado':'atrasados',atr?'crit':'',ICT.exp)}${stat(ent.length,'entregues em '+MESN[+m.slice(5)-1],'ok','<path d="m5 12.5 4.5 4.5L19 7.5"/>')}${stat(med==null?'—':med<1?'no dia':Math.round(med)+(Math.round(med)===1?' dia':' dias'),'tempo médio de entrega','',ICT.rep)}</div>
      <div class="rt-pfil"><div class="seg" role="group" aria-label="Quais pedidos">${[['aberto','Em aberto · '+ab.length],['entregue','Entregues · '+T.ps.filter(p=>p.st==='entregue').length]].map(([k,l])=>`<button data-act="rt-pfil" data-v="${k}" aria-pressed="${T.pfil===k}">${l}</button>`).join('')}</div>
        <input class="txt" id="rt-pbus" placeholder="Buscar por nome ou pedido" value="${e(T.pq||'')}" aria-label="Buscar pedidos"></div>
      ${!T.lidoP?'<section class="card"><div class="empty">Carregando…</div></section>':T.pfil==='entregue'?(entregues.length?`<div class="rt-pl">${entregues.map(cardP).join('')}</div>`:'<section class="card"><div class="empty">Nenhum pedido entregue ainda.</div></section>'):quadro}`+(T.pf?formP():'')+'</div>'; }
  function formP(){ const e=C.esc, f=T.pf, fs=(C.func?C.func():[]);
    return `<div class="dbmodal" data-rt-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Pedido" style="max-width:620px"><div class="rt-fm">
      <div class="head" style="align-items:baseline;margin:0"><h2 style="margin:0">${f._id?'Pedido':'Novo pedido'}</h2><button class="lnk" data-act="rt-fx">Fechar</button></div>
      <label class="rt-w"><span>Quem pediu</span><input class="txt" id="rt-pq" list="rt-pqs" value="${e(f.quem||'')}" placeholder="Nome do funcionário" autocomplete="off"><datalist id="rt-pqs">${fs.map(x=>`<option value="${e(C.titulo?C.titulo(x.nome):x.nome)}">`).join('')}</datalist></label>
      <div class="rt-g3"><label><span>Tipo</span><select class="txt" id="rt-pt">${PT.map(t=>`<option ${f.tipo===t?'selected':''}>${t}</option>`).join('')}</select></label>
        <label><span>Pediu por</span><select class="txt" id="rt-pc">${CANAIS.map(t=>`<option ${f.canal===t?'selected':''}>${t}</option>`).join('')}</select></label>
        <label><span>Prazo</span><input class="txt" type="date" id="rt-pp" value="${e(f.prazo||'')}"></label></div>
      <label class="rt-w"><span>O que pediu</span><textarea class="txt" id="rt-po" rows="3" placeholder="Ex.: Declaração de vínculo para o banco">${e(f.oque||'')}</textarea></label>
      <label class="rt-w"><span>Anotação ou resposta (opcional)</span><textarea class="txt" id="rt-pr" rows="2">${e(f.resp||'')}</textarea></label>
      ${f._id?`<label class="rt-w"><span>Situação</span><select class="txt" id="rt-ps">${PST.map(s=>`<option value="${s[0]}" ${f.st===s[0]?'selected':''}>${s[1]}</option>`).join('')}</select></label>`:''}
      <div class="rt-fa">${f._id?`<button class="lnk" data-act="rt-pdel" style="color:var(--crit-ink)">Apagar</button>`:''}<span></span><button class="btn sec" data-act="rt-fx">Cancelar</button><button class="btn" data-act="rt-pok" ${T.salv?'disabled':''}>Salvar</button></div></div></div></div>`; }
  function avisos(c){ C=C||c; assina(c); const hj=c.P.hojeStr(), out=[];
    T.ps.filter(p=>p.st!=='entregue'&&p.prazo&&p.prazo<hj).forEach(p=>out.push({nivel:'crit',rotulo:'Pedido atrasado',titulo:p.quem+(p.tipo?' · '+p.tipo:''),texto:'prazo era '+brc(p.prazo),go:'rhpedidos'}));
    const at=T.xs.filter(x=>x.uid===c.P.S.uid&&!x.feita&&x.data&&x.data<hj).length; if(at) out.push({nivel:'warn',rotulo:'Minha agenda',titulo:at+(at===1?' tarefa atrasada':' tarefas atrasadas'),texto:'Tarefas e calendário',go:'rhtarefas'});
    return out; }

  /* ---------------- ações ---------------- */
  const v=i=>{ const x=document.getElementById(i); return x?x.value:''; };
  function leT(){ const f=T.f; if(!f) return; const ant=f.itens||[];
    Object.assign(f,{t:v('rt-ft').trim(),data:v('rt-fd'),hora:v('rt-fh'),prio:v('rt-fp'),cat:v('rt-fc').trim(),rep:v('rt-fr'),funcNome:v('rt-fn').trim(),obs:v('rt-fo').trim(),
      itens:v('rt-fi').split('\n').map(s=>s.trim()).filter(Boolean).map(t=>({t,ok:!!(ant.find(i=>i.t===t)||{}).ok}))}); }
  function leP(){ const f=T.pf; if(!f) return; Object.assign(f,{quem:v('rt-pq').trim(),tipo:v('rt-pt'),canal:v('rt-pc'),prazo:v('rt-pp'),oque:v('rt-po').trim(),resp:v('rt-pr').trim()}); if(document.getElementById('rt-ps')) f.st=v('rt-ps'); }
  const pessoa=n=>{ const k=String(n||'').trim().toLowerCase(); return k?(C.func?C.func():[]).find(x=>String(C.titulo?C.titulo(x.nome):x.nome).toLowerCase()===k||String(x.nome).toLowerCase()===k):null; };
  async function rapido(){ const i=document.getElementById('rt-rap'), t=(i&&i.value||'').trim(); if(!t) return; i.value=''; const id=novoId('t');
    try{ await grava(CT,id,{t,data:T.dia||hoje(),hora:'',prio:'',cat:'',itens:[],obs:'',rep:'',feita:false,uid:uid(),porNome:C.eu(),em:agora()}); }catch(e){ C.P.erro(e); } C.P.render(); setTimeout(()=>{ const x=document.getElementById('rt-rap'); if(x) x.focus(); },30); }
  document.addEventListener('keydown',ev=>{ if(ev.target&&ev.target.id==='rt-rap'&&ev.key==='Enter'){ ev.preventDefault(); rapido(); } if(ev.key==='Escape'&&(T.f||T.pf)){ T.f=null; T.pf=null; C&&C.P.render(); } });
  document.addEventListener('input',ev=>{ if(ev.target&&ev.target.id==='rt-pbus'){ T.pq=ev.target.value; const pos=ev.target.selectionStart; C.P.render(); const x=document.getElementById('rt-pbus'); if(x){ x.focus(); try{ x.setSelectionRange(pos,pos); }catch(e){} } } });
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset||!t.dataset.rtIt||!C) return; const x=T.xs.find(y=>y._id===t.dataset.rtIt); if(!x) return;
    const its=(x.itens||[]).map((it,i)=>i===+t.dataset.i?Object.assign({},it,{ok:t.checked}):it); try{ await grava(CT,x._id,{itens:its},true); }catch(e){ C.P.erro(e); }
    if(its.length&&its.every(i=>i.ok)&&!x.feita) C.P.toast('Checklist completo! Toque no círculo para concluir a tarefa.'); C.P.render(); });
  document.addEventListener('click',async ev=>{ if(!C) return; if(ev.target.dataset&&ev.target.dataset.rtFundo){ T.f=null; T.pf=null; C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rt-"]'); if(!b) return; const a=b.dataset.act, P=C.P, id=b.dataset.id;
    if(a==='rt-tema'){ try{ localStorage.setItem('rt-tema',b.dataset.v); }catch(e){} P.render(); return; }
    if(a==='rt-vis'){ T.vis=b.dataset.v; P.render(); return; }
    if(a==='rt-dia'){ T.dia=soma(T.dia||hoje(),+b.dataset.v); T.mm=T.dia.slice(0,7); P.render(); return; }
    if(a==='rt-hoje'){ T.dia=null; T.mm=null; P.render(); return; }
    if(a==='rt-sem'){ T.sem=b.dataset.v==='0'?0:T.sem+(+b.dataset.v); P.render(); return; }
    if(a==='rt-mes'){ T.mes=b.dataset.v; P.render(); return; }
    if(a==='rt-mm'){ T.mm=b.dataset.v; P.render(); return; }
    if(a==='rt-abredia'){ T.dia=b.dataset.v===hoje()?null:b.dataset.v; T.mm=b.dataset.v.slice(0,7); T.vis='dia'; P.render(); window.scrollTo(0,0); return; }
    if(a==='rt-rap'){ rapido(); return; }
    if(a==='rt-passar'){ const hj=hoje(), xs=minhas().filter(x=>!x.feita&&x.data&&x.data<hj); try{ for(const x of xs) await grava(CT,x._id,{data:hj},true); P.toast(xs.length===1?'A tarefa passou para hoje.':xs.length+' tarefas passaram para hoje.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rt-nova'){ T.f={t:'',data:T.vis==='dia'?(T.dia||hoje()):hoje(),hora:'',prio:'',cat:'',rep:'',itens:[],obs:''}; P.render(); setTimeout(()=>{ const x=document.getElementById('rt-ft'); if(x) x.focus(); },40); return; }
    if(a==='rt-ed'){ const x=T.xs.find(y=>y._id===id); if(x){ T.f=JSON.parse(JSON.stringify(x)); P.render(); } return; }
    if(a==='rt-fx'){ T.f=null; T.pf=null; P.render(); return; }
    if(a==='rt-ok'){ const x=T.xs.find(y=>y._id===id); if(!x) return; const f=!x.feita;
      try{ await grava(CT,x._id,{feita:f,feitaEm:f?agora():''},true);
        if(f&&x.rep&&!T.xs.some(y=>y.serie&&y.serie===(x.serie||x._id)&&!y.feita&&y._id!==x._id)){ const n=proxData(x); if(n){ const nid=novoId('t'), cp=Object.assign({},x,{data:n,feita:false,feitaEm:'',em:agora(),serie:x.serie||x._id,itens:(x.itens||[]).map(i=>({t:i.t,ok:false}))}); delete cp._id; await grava(CT,nid,cp); P.toast('Feita! A próxima ficou para '+brc(n)+'.'); } }
        if(f&&x.pedidoId){ const p=T.ps.find(y=>y._id===x.pedidoId); if(p&&p.st!=='pronto'&&p.st!=='entregue') P.toast('Se o pedido de '+p.quem+' ficou pronto, marque em Pedidos do pessoal.'); } }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rt-fok'){ leT(); const f=T.f; if(!f.t) return P.toast('Escreva o que fazer.'); if(T.salv) return; T.salv=true; const fp=pessoa(f.funcNome); const nid=f._id||novoId('t');
      const d={t:f.t,data:f.data||'',hora:f.hora||'',prio:f.prio||'',cat:f.cat||'',rep:f.rep||'',itens:f.itens||[],obs:f.obs||'',funcNome:f.funcNome||'',funcId:fp?fp._id:(f.funcId||''),pedidoId:f.pedidoId||'',feita:!!f.feita,feitaEm:f.feitaEm||'',uid:f.uid||uid(),porNome:f.porNome||C.eu(),em:f.em||agora()};
      if(f.serie) d.serie=f.serie; try{ await grava(CT,nid,d); T.f=null; P.toast('Tarefa salva.'); }catch(e){ P.erro(e); } T.salv=false; P.render(); return; }
    if(a==='rt-del'){ const f=T.f; if(!f||!confirm('Apagar esta tarefa?')) return; try{ await grava(CT,f._id,{removido:true,removidoEm:agora()},true); T.f=null; }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rt-dup'){ leT(); T.f=Object.assign({},T.f,{_id:undefined,feita:false,feitaEm:'',em:'',serie:undefined,itens:(T.f.itens||[]).map(i=>({t:i.t,ok:false}))}); P.toast('Cópia aberta: ajuste e salve.'); P.render(); return; }
    /* pedidos */
    if(a==='rt-pedgo'){ T.pfil='aberto'; P.go('rhpedidos'); return; }
    if(a==='rt-pfil'){ T.pfil=b.dataset.v; P.render(); return; }
    if(a==='rt-pnovo'){ T.pf={quem:'',tipo:PT[0],canal:CANAIS[0],prazo:util(hoje(),2),oque:'',resp:'',st:'novo'}; P.render(); setTimeout(()=>{ const x=document.getElementById('rt-pq'); if(x) x.focus(); },40); return; }
    if(a==='rt-ped'){ const p=T.ps.find(y=>y._id===id); if(p){ T.pf=JSON.parse(JSON.stringify(p)); P.render(); } return; }
    if(a==='rt-pok'){ leP(); const f=T.pf; if(!f.quem) return P.toast('Diga quem pediu.'); if(!f.oque&&f.tipo==='Outro') return P.toast('Escreva o que a pessoa pediu.'); if(T.salv) return; T.salv=true;
      const fp=pessoa(f.quem), nid=f._id||novoId('p'), ant=T.ps.find(y=>y._id===nid), mud=ant&&ant.st!==f.st;
      const d={quem:fp&&C.titulo?C.titulo(fp.nome):f.quem,funcId:fp?fp._id:(f.funcId||''),setor:fp?(fp.setor||''):(f.setor||''),tel:fp?(fp.telefone||''):(f.tel||''),tipo:f.tipo||'',oque:f.oque||'',canal:f.canal||'',prazo:f.prazo||'',resp:f.resp||'',st:f.st||'novo',
        em:f.em||agora(),porNome:f.porNome||C.eu(),hist:(f.hist||[]).concat(mud||!ant?[{em:agora(),st:f.st||'novo',porNome:C.eu()}]:[])};
      if(f.st==='pronto') d.prontoEm=f.prontoEm||agora(); if(f.st==='entregue') d.entregueEm=f.entregueEm||agora();
      try{ await grava(CP,nid,d); T.pf=null; P.toast('Pedido salvo.'); }catch(e){ P.erro(e); } T.salv=false; P.render(); return; }
    if(a==='rt-pst'){ const p=T.ps.find(y=>y._id===id); if(!p) return; const st=b.dataset.v, d={st,hist:(p.hist||[]).concat([{em:agora(),st,porNome:C.eu()}])};
      if(st==='pronto') d.prontoEm=agora(); if(st==='entregue') d.entregueEm=agora();
      try{ await grava(CP,p._id,d,true); P.toast(st==='entregue'?'Pedido entregue.':st==='pronto'?'Pedido pronto. Avise a pessoa.':'Pedido em andamento.');
        if(st==='entregue') for(const x of T.xs.filter(y=>y.pedidoId===p._id&&!y.feita)) await grava(CT,x._id,{feita:true,feitaEm:agora()},true); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rt-pwa'){ const p=T.ps.find(y=>y._id===id); if(!p) return; let w=String(p.tel||'').replace(/\D/g,''); if(w.length<=11) w='55'+w;
      const msg='Olá, '+String(p.quem||'').split(' ')[0]+'! Aqui é do RH da Colafix. O seu pedido ('+(p.oque||p.tipo||'')+') está pronto. Pode passar no RH para retirar.';
      window.open('https://wa.me/'+w+'?text='+encodeURIComponent(msg),'_blank','noopener'); return; }
    if(a==='rt-ptar'){ const p=T.ps.find(y=>y._id===id); if(!p) return; const nid=novoId('t');
      try{ await grava(CT,nid,{t:(p.tipo&&p.tipo!=='Outro'?p.tipo+': ':'')+(p.oque||'Pedido')+' ('+p.quem+')',data:p.prazo||hoje(),hora:'',prio:p.prazo&&p.prazo<=hoje()?'alta':'',cat:'Pessoal',itens:[],obs:'',rep:'',feita:false,uid:uid(),porNome:C.eu(),em:agora(),pedidoId:p._id,funcId:p.funcId||'',funcNome:p.quem||''});
        if(p.st==='novo') await grava(CP,p._id,{st:'fazendo',hist:(p.hist||[]).concat([{em:agora(),st:'fazendo',porNome:C.eu()}])},true); P.toast('Virou tarefa para '+brc(p.prazo||hoje())+' na sua agenda.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rt-pdel'){ const f=T.pf; if(!f||!confirm('Apagar este pedido?')) return; try{ await grava(CP,f._id,{removido:true,removidoEm:agora()},true); T.pf=null; }catch(e){ P.erro(e); } P.render(); return; } });

  window.RHTar={tarefas,pedidos,avisos,_T:T};
  document.head.insertAdjacentHTML('beforeend',`<style id="rt-css">
/* Minha agenda · redesenho 31/10 — topo escuro do painel, cores por categoria, linha do tempo, quadro de pedidos */
.rt-hero{background:radial-gradient(120% 140% at 100% 0%,#1F5A75 0%,#143F54 55%);color:#fff;border-radius:22px;padding:24px 26px 20px;box-shadow:0 10px 30px rgba(20,63,84,.18)}
.rt-hd1{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:26px;align-items:center}
.rt-date{display:flex;align-items:center;gap:14px;padding-right:26px;border-right:1px solid rgba(255,255,255,.16)}.rt-date b{font-size:76px;line-height:.9;font-weight:800;letter-spacing:-3px}
.rt-date span{display:flex;flex-direction:column;font-size:15px;color:#CFE1EA;line-height:1.35}.rt-date em{font-style:normal;font-size:21px;font-weight:700;color:#fff;text-transform:capitalize}
.rt-hmsg h2{margin:0;font-size:22px;color:#fff}.rt-hmsg p{margin:4px 0 0;color:#CFE1EA;font-size:14.5px}
.rt-hnav{display:flex;gap:8px;margin-top:12px;align-items:center}
.rt-rb{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center}
.rt-rb:hover{background:rgba(255,255,255,.18)}.rt-rb:focus-visible,.rt-hj:focus-visible{outline:2px solid #fff;outline-offset:2px}
.rt-rb.dk{border-color:var(--line);background:var(--surface);color:var(--ink)}.rt-rb.dk:hover{background:var(--teal-wash)}
.rt-hj{border:0;border-radius:999px;padding:8px 14px;background:#fff;color:#143F54;font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.rt-ring{position:relative;width:96px;height:96px}.rt-ring svg{width:100%;height:100%}.rt-ring circle{fill:none;stroke-width:8}.rt-ring .bg{stroke:rgba(255,255,255,.14)}.rt-ring .fg{stroke:#7DD3A8;stroke-linecap:round;transition:stroke-dasharray .5s ease}
.rt-ring>div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.rt-ring b{font-size:22px}.rt-ring small{font-size:11px;color:#CFE1EA}
.rt-rap{display:flex;align-items:center;gap:10px;margin-top:18px;background:#fff;border-radius:14px;padding:6px 6px 6px 14px;color:#6B7A82;box-shadow:0 2px 0 rgba(0,0,0,.06)}
.rt-rap svg{width:20px;height:20px;flex:0 0 20px}.rt-rap input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:15px;color:#1B2A33;background:transparent;padding:8px 0}.rt-rap .btn{border-radius:10px}
.rt-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin:14px 0 18px}
.rt-sd{border:1px solid var(--line);background:var(--surface);border-radius:14px;padding:8px 4px 6px;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer;font:inherit;color:var(--ink)}
.rt-sd small{font-size:11.5px;color:var(--muted);text-transform:capitalize}.rt-sd b{font-size:19px}.rt-sd i{display:flex;gap:3px;height:6px}.rt-sd em{width:6px;height:6px;border-radius:50%;background:var(--teal)}
.rt-sd.hj:not(.on) b{color:#D9263F}.rt-sd.on{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}.rt-sd.on small{color:#CFE1EA}.rt-sd.on b{color:#fff}.rt-sd.on em{background:#7DD3A8}
.rt-sd:hover:not(.on){border-color:var(--teal)}
.rt-late-box{background:var(--crit-tint,#FBE9E7);border-radius:18px;padding:14px 16px;margin-bottom:18px}
.rt-lh{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px}.rt-lh h3{margin:0;font-size:16px;color:var(--crit-ink,#A33A2C)}.rt-lh p{margin:2px 0 0;font-size:13px;color:var(--crit-ink,#A33A2C)}
.rt-late-box .rt-t{background:var(--surface)}
.rt-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:18px;align-items:start}
.rt-main{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:18px 20px}
.rt-mh{display:flex;align-items:center;gap:10px;margin-bottom:12px}.rt-mh h3{margin:0;font-size:18px}
.rt-cnt{min-width:24px;height:24px;border-radius:12px;background:var(--teal-wash);color:var(--teal-strong);font-size:12.5px;font-weight:700;display:inline-grid;place-items:center;padding:0 7px}
.rt-tl{position:relative}.rt-tlr{display:grid;grid-template-columns:50px 14px minmax(0,1fr);gap:10px;position:relative;padding-bottom:10px}
.rt-tlr::before{content:"";position:absolute;left:66px;top:18px;bottom:-4px;width:2px;background:var(--line)}.rt-tlr:last-child::before{display:none}
.rt-tlr time{font-size:13px;font-weight:700;color:var(--ink-2);padding-top:13px;text-align:right;font-variant-numeric:tabular-nums}
.rt-tld{width:12px;height:12px;border-radius:50%;background:var(--surface);border:3px solid var(--c);margin-top:15px;position:relative;z-index:1}
.rt-sub{font-size:13px;font-weight:700;color:var(--muted);margin:8px 0 8px}
.rt-lst{display:flex;flex-direction:column;gap:10px}
.rt-t{display:flex;gap:12px;align-items:flex-start;background:var(--surface-2);border-radius:14px;padding:12px 14px;border-left:4px solid var(--c);margin-bottom:0}
.rt-late-box .rt-t+.rt-t,.rt-box .rt-t+.rt-t,.rt-fts .rt-t+.rt-t{margin-top:8px}
.rt-ck{flex:0 0 26px;width:26px;height:26px;border-radius:50%;border:2px solid var(--c);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:transparent;padding:0;transition:background .15s}
.rt-ck svg{width:15px;height:15px}.rt-ck:hover{color:var(--c)}.rt-ck:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.rt-t.feita{opacity:.6}.rt-t.feita .rt-ck{background:var(--c);color:#fff}.rt-t.feita .rt-tt{text-decoration:line-through}
.rt-tb{flex:1;min-width:0}.rt-tt{all:unset;cursor:pointer;font-weight:650;font-size:15px;line-height:1.35;display:block;color:var(--ink)}.rt-tt:focus-visible{outline:2px solid var(--teal)}
.rt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center}
.rt-tag{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent)}
.rt-tag svg{width:12px;height:12px}.rt-imp{--c:#C0392B}.rt-late{--c:#C0392B;background:#C0392B;color:#fff}
.rt-meta{font-size:12.5px;color:var(--muted);display:inline-flex;align-items:center;gap:4px}.rt-rp svg{width:13px;height:13px}
.rt-pess{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--ink-2)}
.rt-av{--a:#2B6A87;width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:var(--a);color:#fff;font-size:13px;font-weight:800;display:inline-grid;place-items:center;letter-spacing:.3px}
.rt-av.sm{width:20px;height:20px;flex-basis:20px;font-size:9.5px}
.rt-cl{display:flex;align-items:center;gap:8px;margin-top:8px}.rt-clb{flex:0 1 120px;height:6px;border-radius:3px;background:var(--line);overflow:hidden}.rt-clb span{display:block;height:100%;background:var(--c)}.rt-cl small{font-size:12px;color:var(--muted)}
.rt-its{display:flex;flex-direction:column;gap:2px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
.rt-its label{display:flex;gap:9px;align-items:center;font-size:13.5px;cursor:pointer;padding:3px 0}.rt-its input{width:17px;height:17px;accent-color:var(--c);margin:0}.rt-its input:checked+span{text-decoration:line-through;color:var(--muted)}
.rt-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:26px 10px;color:var(--muted)}.rt-empty svg{width:34px;height:34px;color:var(--ok-ink,#3F7D5C);background:var(--ok-tint,#E2EEE6);border-radius:50%;padding:8px;margin-bottom:4px}.rt-empty b{color:var(--ink);font-size:15px}
.rt-fts{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.rt-fts summary{cursor:pointer;font-weight:700;color:var(--muted);font-size:14px;margin-bottom:8px}
.rt-side{display:flex;flex-direction:column;gap:14px}.rt-box{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px 18px}.rt-box h3{margin:0 0 8px;font-size:15.5px}.rt-bs{margin:-4px 0 10px;font-size:13px;color:var(--muted)}
.rt-calm{background:var(--teal-wash);border-color:transparent}
.rt-pz{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line-2,var(--line))}.rt-box h3+.rt-pz{border-top:0}
.rt-pzi{width:32px;height:32px;flex:0 0 32px;border-radius:10px;display:grid;place-items:center;background:var(--teal-wash);color:var(--teal)}.rt-pzi svg{width:17px;height:17px}
.rt-pz.crit .rt-pzi{background:var(--crit-tint,#FBE9E7);color:var(--crit-ink,#A33A2C)}.rt-pz.warn .rt-pzi{background:#FBF1DE;color:#8A5A10}
.rt-pzt{flex:1;min-width:0;display:flex;flex-direction:column}.rt-pzt b{font-size:13.5px}.rt-pzt small{font-size:12px;color:var(--muted)}
.rt-pbox{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;background:var(--teal-strong);color:#fff;border-radius:18px;padding:14px 16px}.rt-pbox .rt-pzi{background:rgba(255,255,255,.14);color:#fff}.rt-pbox small{color:#CFE1EA}.rt-pbox:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.rt-go{font-weight:700;font-size:13px;background:#fff;color:#143F54;border-radius:999px;padding:6px 12px}
.rt-ban.banner{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 14px;background:var(--teal-wash);color:var(--teal-strong);border-radius:14px}
.rt-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:12px 16px;margin-bottom:14px}
.rt-bar>div{text-align:center;display:flex;flex-direction:column}.rt-bar b{font-size:18px}.rt-bar small{font-size:12.5px;color:var(--muted)}
.rt-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
.rt-wd{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:10px;min-height:220px;display:flex;flex-direction:column}
.rt-wd.hj{border-color:var(--teal-strong);box-shadow:inset 0 0 0 1px var(--teal-strong)}
.rt-wdh{all:unset;cursor:pointer;display:flex;align-items:baseline;gap:6px;padding:2px 4px 8px;border-bottom:1px solid var(--line);margin-bottom:8px}.rt-wdh small{font-size:12px;color:var(--muted);text-transform:capitalize}.rt-wdh b{font-size:22px}
.rt-wd.hj .rt-wdh b{color:#D9263F}.rt-wl{display:flex;flex-direction:column;gap:6px}
.rt-wi{all:unset;cursor:pointer;font-size:12.5px;line-height:1.3;padding:7px 9px;border-radius:9px;background:color-mix(in srgb,var(--c) 13%,var(--surface));border-left:3px solid var(--c);color:var(--ink);overflow-wrap:anywhere}
.rt-wi i{display:block;font-style:normal;font-weight:800;font-size:11.5px;color:var(--c)}.rt-wi.feita{text-decoration:line-through;opacity:.5}
.rt-wp{display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:var(--muted);line-height:1.3}.rt-wp span{flex:0 0 14px;color:#C47814}.rt-wp svg{width:14px;height:14px}.rt-wv{color:var(--faint,#B3AB99);font-size:12px;padding:4px}
.rt-cal{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:14px}
.rt-cg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.rt-cw{text-align:center;font-size:12px;font-weight:700;color:var(--muted);text-transform:capitalize;padding-bottom:2px}
.rt-cd{position:relative;min-height:104px;border:1px solid var(--line-2,var(--line));border-radius:12px;background:var(--surface);cursor:pointer;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:6px;font:inherit;color:inherit;text-align:left}
.rt-cd:hover{border-color:var(--teal)}.rt-cd.fora{opacity:.38}.rt-cd.ok{background:var(--ok-tint,#E2EEE6)}
.rt-cn{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700}.rt-cd.hj .rt-cn{background:var(--teal-strong);color:#fff}
.rt-cd>em{position:absolute;top:10px;right:10px;width:8px;height:8px;border-radius:50%;background:#C47814}
.rt-cx{display:flex;flex-direction:column;gap:3px}.rt-cx i{font-style:normal;font-size:11.5px;line-height:1.25;padding:3px 6px;border-radius:6px;background:color-mix(in srgb,var(--c) 14%,var(--surface));border-left:3px solid var(--c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rt-cx small{font-size:11px;color:var(--muted);padding-left:4px}.rt-cx small.ok{color:var(--ok-ink,#3F7D5C);font-weight:700}
.rt-cdots,.rt-cc{display:none}
.rt-leg{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;font-size:12.5px;color:var(--muted)}.rt-leg span{display:flex;align-items:center;gap:6px}.rt-leg i{width:10px;height:10px;border-radius:3px;background:var(--c)}.rt-leg i.d{border-radius:50%;background:#C47814}
.rt-fm{padding:20px 22px;display:flex;flex-direction:column;gap:12px}.rt-fm label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}.rt-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.rt-fa{display:flex;align-items:center;gap:12px;margin-top:4px}.rt-fa span{flex:1}
.rt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.rt-st{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px 16px}
.rt-sti{width:42px;height:42px;flex:0 0 42px;border-radius:12px;display:grid;place-items:center;background:var(--teal-wash);color:var(--teal)}.rt-sti svg{width:21px;height:21px}
.rt-st b{display:block;font-size:24px;line-height:1.1}.rt-st small{font-size:12.5px;color:var(--muted)}
.rt-st.crit .rt-sti{background:var(--crit-tint,#FBE9E7);color:var(--crit-ink,#A33A2C)}.rt-st.crit b{color:var(--crit-ink,#A33A2C)}.rt-st.ok .rt-sti{background:var(--ok-tint,#E2EEE6);color:var(--ok-ink,#3F7D5C)}
.rt-pfil{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}.rt-pfil .txt{flex:1;min-width:200px}
.rt-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
.rt-colm{background:var(--surface-2);border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:180px}
.rt-colh{display:flex;align-items:center;gap:8px;padding:2px 4px}.rt-colh h3{margin:0;font-size:15px;flex:1}.rt-colh i{width:10px;height:10px;border-radius:50%}
.rt-c-novo .rt-colh i{background:#C47814}.rt-c-fazendo .rt-colh i{background:#2B6A87}.rt-c-pronto .rt-colh i{background:#2F8C5A}
.rt-colv{font-size:13px;color:var(--muted);text-align:center;padding:22px 8px;border:1.5px dashed var(--line);border-radius:14px}
.rt-pl{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.rt-pc{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 2px rgba(20,63,84,.05)}
.rt-pc.atr{border-color:#E2A39B;box-shadow:inset 3px 0 0 #C0392B}
.rt-pch{display:flex;gap:10px;align-items:center}.rt-pch>div{flex:1;min-width:0}.rt-pch b{display:block;font-size:14.5px}.rt-pch small{display:block;color:var(--muted);font-size:12px}
.rt-pc>.rt-tag{align-self:flex-start}.rt-po{margin:0;font-size:14px;line-height:1.4}.rt-pr{margin:0;font-size:12.5px;color:var(--muted);background:var(--surface-2);border-radius:8px;padding:6px 9px}
.rt-due{font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--surface-2);color:var(--muted);white-space:nowrap}.rt-due.late{background:#C0392B;color:#fff}.rt-due.hoje{background:#FBF1DE;color:#8A5A10}.rt-due.ok{background:var(--ok-tint,#E2EEE6);color:var(--ok-ink,#3F7D5C)}
.rt-pf{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px}.rt-pfl{display:flex;gap:12px;margin-left:auto}.rt-wa{border-color:#25D366!important;color:#128C4A!important}
@media (max-width:1100px){ .rt-grid{grid-template-columns:minmax(0,1fr)} .rt-board{grid-template-columns:minmax(0,1fr)} .rt-stats{grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (max-width:760px){
  .rt-hero{padding:18px 16px 14px;border-radius:18px}.rt-hd1{grid-template-columns:minmax(0,1fr) auto;gap:14px}.rt-date{border:0;padding:0}.rt-date b{font-size:58px}.rt-hmsg{grid-column:1/-1;grid-row:2}.rt-hmsg h2{font-size:19px}.rt-ring{width:78px;height:78px}
  .rt-rap .btn{padding:0 12px}.rt-strip{gap:4px}.rt-sd{border-radius:12px}.rt-sd b{font-size:16px}
  .rt-main{padding:14px}.rt-tlr{grid-template-columns:42px 12px minmax(0,1fr);gap:6px}.rt-tlr::before{left:53px}.rt-ck{flex-basis:30px;width:30px;height:30px}
  .rt-wk{grid-template-columns:minmax(0,1fr)}.rt-wd{min-height:0}
  .rt-cd{min-height:54px;padding:4px;align-items:center}.rt-cx{display:none}.rt-cdots{display:flex;gap:2px;justify-content:center}.rt-cdots i{width:6px;height:6px;border-radius:50%;background:var(--c)}.rt-cn{width:24px;height:24px;font-size:12px}.rt-cd>em{top:4px;right:4px;width:6px;height:6px}
  .rt-g3{grid-template-columns:minmax(0,1fr)}.rt-pfil .seg{max-width:100%;overflow-x:auto}.rt-pl{grid-template-columns:minmax(0,1fr)} }
@media (prefers-reduced-motion:reduce){ .rt-ring .fg,.rt-ck{transition:none} }
/* ---- layout B (31/10) ---- */
.rt-b{display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start}
.rt-bl{position:sticky;top:12px;display:flex;flex-direction:column;gap:14px}
.rt-mcal,.rt-bx{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px}
.rt-mch{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.rt-mch b{font-size:15px}
.rt-mnav{width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer;font-size:17px;line-height:1}.rt-mnav:hover{background:var(--teal-wash)}
.rt-mg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}.rt-mw{font-style:normal;text-align:center;font-size:11px;font-weight:700;color:var(--muted);padding:2px 0 4px}
.rt-md{position:relative;height:36px;border:0;border-radius:9px;background:transparent;color:var(--ink);font:inherit;font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0}
.rt-md:hover{background:var(--teal-wash)}.rt-md.fora{color:var(--faint,#B3AB99)}.rt-md.hj{color:var(--teal-strong);font-weight:800;box-shadow:inset 0 0 0 1.5px var(--teal)}
.rt-md.on{background:var(--teal-strong);color:#fff;font-weight:700;box-shadow:none}.rt-md:focus-visible{outline:2px solid var(--teal);outline-offset:1px}
.rt-md span{display:flex;gap:2px;height:4px}.rt-md em,.rt-mleg em{width:4px;height:4px;border-radius:50%;background:var(--teal)}.rt-md em.p,.rt-mleg em.p{background:#C47814}.rt-md.on em{background:#fff}.rt-md.on em.p{background:#F5C77E}
.rt-mleg{display:flex;align-items:center;gap:12px;margin-top:8px;font-size:11.5px;color:var(--muted)}.rt-mleg span{display:flex;align-items:center;gap:5px}.rt-mleg .lnk{margin-left:auto;font-size:12.5px}
.rt-bxh{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.rt-bxh h3{margin:0;font-size:14.5px}.rt-bxd{font-size:12px;color:var(--muted)}.rt-bxh .lnk{font-size:12.5px}
.rt-bxs{margin:6px 0 4px;font-size:13px;color:var(--muted)}.rt-red{color:var(--crit-ink,#A33A2C)}
.rt-pi{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:7px 0;border-top:1px solid var(--line-2,var(--line))}.rt-pi>span:not(.rt-av):not(.rt-pdue){flex:1;min-width:0;display:flex;flex-direction:column}.rt-pi .rt-av{width:26px;height:26px;flex:0 0 26px;font-size:10.5px}.rt-pi .rt-due{flex:0 0 auto}
.rt-pi b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rt-pi small{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rt-pi:focus-visible{outline:2px solid var(--teal)}
.rt-bx .rt-pz{padding:8px 0}.rt-bx .rt-pzi{width:28px;height:28px;flex-basis:28px;border-radius:8px}
.rt-br{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px 12px;min-width:0}
.rt-dh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.rt-dh h2{margin:0;font-size:21px}.rt-dh p{margin:3px 0 0;font-size:13px;color:var(--muted)}
.rt-pg{border-radius:3px;background:var(--line);overflow:hidden}.rt-pg span{display:block;height:100%;border-radius:3px;background:var(--ok-ink,#3F7D5C)}.rt-dh .rt-pg{width:220px;height:6px;margin:8px 0 0}.rt-dnav{display:flex;gap:8px;align-items:center}
.rt-rap2{display:flex;align-items:center;gap:8px;margin:14px 0 6px;border:1px solid var(--line);border-radius:12px;padding:4px 4px 4px 12px;background:var(--surface-2)}
.rt-rap2:focus-within{border-color:var(--teal);background:var(--surface)}.rt-rap2 svg{width:18px;height:18px;color:var(--muted);flex:0 0 18px}.rt-rap2 input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:14.5px;color:var(--ink);padding:7px 0}
.rt-g{margin-top:14px}.rt-gh{display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--line)}.rt-gh h3{margin:0;font-size:14.5px}.rt-gh .lnk{margin-left:auto;font-size:13px}
.rt-g.late .rt-gh h3{color:var(--crit-ink,#A33A2C)}.rt-g.late .rt-cnt{background:var(--crit-tint,#FBE9E7);color:var(--crit-ink,#A33A2C)}
.rt-r{display:flex;gap:10px;align-items:flex-start;padding:10px 2px;border-bottom:1px solid var(--line-2,var(--line))}.rt-r:last-child{border-bottom:0}
.rt-r time{flex:0 0 42px;font-size:12.5px;font-weight:700;color:var(--ink-2);padding-top:4px;font-variant-numeric:tabular-nums}
.rt-r .rt-ck{flex-basis:22px;width:22px;height:22px;margin-top:1px}.rt-r .rt-ck svg{width:13px;height:13px}.rt-r .rt-tt{font-size:14.5px}.rt-r .rt-chips{margin-top:4px}.rt-r .rt-tag{font-size:11.5px;padding:2px 8px}
.rt-r.feita{opacity:.55}.rt-r.feita .rt-ck{background:var(--c);color:#fff}.rt-r.feita .rt-tt{text-decoration:line-through}
.rt-r .rt-its{border-top:0;padding-top:2px;margin-top:4px}
.rt-br .rt-sub{margin:10px 0 0 52px;font-size:12.5px}.rt-br .rt-empty{padding:30px 10px}.rt-br .rt-fts{margin-top:10px}
@media (max-width:1000px){ .rt-b{grid-template-columns:minmax(0,1fr)} .rt-bl{position:static;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .rt-mcal{grid-row:span 2} }
@media (max-width:760px){ .rt-b{display:flex;flex-direction:column;gap:14px;align-items:stretch} .rt-bl{display:contents} .rt-mcal{order:1} .rt-br{order:2;padding:14px} .rt-bx{order:3} .rt-dh{flex-direction:column} .rt-dh .rt-pg{width:100%} .rt-r .rt-ck{flex-basis:28px;width:28px;height:28px} .rt-md{height:38px} .rt-br .rt-sub{margin-left:0} }

/* ---- temas suaves (31/10) ---- */
.rt-temas{display:flex;gap:6px;align-items:center;padding:0 4px}.rt-temas button{width:22px;height:22px;border-radius:50%;border:2px solid var(--surface);background:var(--t);box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0}
.rt-temas button[aria-pressed="true"]{box-shadow:0 0 0 2px var(--t)}.rt-temas button:focus-visible{outline:2px solid var(--t);outline-offset:2px}
.rt-cta{background:var(--t)!important;border-color:var(--t)!important;border-radius:999px!important}
.rt-wrap{--rt-a:#D5668C;--rt-a2:#F8D7E1;--rt-soft:#FDF0F4;--rt-h1:#FDE6EE;--rt-h2:#FFF2EA;--rt-ink:#4A2B3A;--rt-sub:#8A6876;--rt-coral:#E0637A}
.rt-wrap[data-tema="lavanda"]{--rt-a:#8E6CC8;--rt-a2:#E2D8F5;--rt-soft:#F5F0FC;--rt-h1:#EFE7FB;--rt-h2:#FCEFF6;--rt-ink:#3B2D57;--rt-sub:#7A6C94}
.rt-wrap[data-tema="pessego"]{--rt-a:#DE7F58;--rt-a2:#F8DCCB;--rt-soft:#FFF4EC;--rt-h1:#FFEADB;--rt-h2:#FFF6E6;--rt-ink:#4E3124;--rt-sub:#93705F}
.rt-wrap:not([data-tema="petroleo"]) .rt-hero{background:linear-gradient(135deg,var(--rt-h1) 0%,var(--rt-h2) 100%);color:var(--rt-ink);box-shadow:0 14px 34px color-mix(in srgb,var(--rt-a) 16%,transparent);border-radius:28px;position:relative;overflow:hidden}
.rt-wrap:not([data-tema="petroleo"]) .rt-hero::after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;right:-80px;top:-120px;background:color-mix(in srgb,var(--rt-a) 12%,transparent);pointer-events:none}
.rt-wrap:not([data-tema="petroleo"]) .rt-hero>*{position:relative;z-index:1}
.rt-date b,.rt-hmsg h2,.rt-date em{font-family:Georgia,"Times New Roman",serif}
.rt-date b{font-weight:400;letter-spacing:-2px}.rt-date em{font-style:italic;font-weight:400}.rt-hmsg h2{font-weight:400;font-size:25px}
.rt-wrap:not([data-tema="petroleo"]) .rt-date{border-right-color:color-mix(in srgb,var(--rt-a) 25%,transparent)}
.rt-wrap:not([data-tema="petroleo"]) :is(.rt-date b,.rt-date em,.rt-hmsg h2,.rt-ring b){color:var(--rt-ink)}.rt-wrap:not([data-tema="petroleo"]) .rt-date b{color:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) :is(.rt-date span,.rt-hmsg p,.rt-ring small){color:var(--rt-sub)}
.rt-wrap:not([data-tema="petroleo"]) .rt-rb:not(.dk){border-color:color-mix(in srgb,var(--rt-a) 35%,transparent);background:rgba(255,255,255,.65);color:var(--rt-ink)}
.rt-wrap:not([data-tema="petroleo"]) .rt-rb:not(.dk):hover{background:#fff}
.rt-wrap:not([data-tema="petroleo"]) .rt-hj{background:var(--rt-a);color:#fff}
.rt-wrap:not([data-tema="petroleo"]) .rt-ring .bg{stroke:var(--rt-a2)}.rt-wrap:not([data-tema="petroleo"]) .rt-ring .fg{stroke:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .rt-rap{box-shadow:0 4px 14px color-mix(in srgb,var(--rt-a) 14%,transparent);border-radius:18px}.rt-wrap:not([data-tema="petroleo"]) .rt-rap svg{color:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .btn:not(.sec){background:var(--rt-a);border-color:var(--rt-a);color:#fff;border-radius:999px}
.rt-wrap:not([data-tema="petroleo"]) .btn.sec{border-radius:999px}
.rt-wrap:not([data-tema="petroleo"]) .rt-sd{border-radius:18px;border-color:transparent;background:var(--surface);box-shadow:0 1px 3px rgba(74,43,58,.06)}
.rt-wrap:not([data-tema="petroleo"]) .rt-sd.hj b{color:var(--rt-a)}.rt-wrap:not([data-tema="petroleo"]) .rt-sd em{background:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .rt-sd.on{background:var(--rt-a);border-color:var(--rt-a)}.rt-wrap .rt-sd.on.hj b,.rt-wrap .rt-sd.on b{color:#fff}.rt-wrap:not([data-tema="petroleo"]) .rt-sd.on small{color:#fff;opacity:.85}.rt-wrap:not([data-tema="petroleo"]) .rt-sd.on em{background:#fff}
.rt-wrap:not([data-tema="petroleo"]) .rt-sd:hover:not(.on){border-color:var(--rt-a2)}
.rt-wrap:not([data-tema="petroleo"]) .rt-late-box{background:color-mix(in srgb,var(--rt-coral) 10%,var(--surface));border-radius:24px}
.rt-wrap:not([data-tema="petroleo"]) .rt-lh :is(h3,p){color:color-mix(in srgb,var(--rt-coral) 80%,#5a2030)}
.rt-wrap:not([data-tema="petroleo"]) :is(.rt-main,.rt-box,.rt-bar,.rt-cal,.rt-wd,.rt-st){border-radius:24px;border-color:transparent;box-shadow:0 6px 22px rgba(74,43,58,.06)}
.rt-wrap:not([data-tema="petroleo"]) .rt-t{border-left:0;border-radius:18px;background:color-mix(in srgb,var(--c) 7%,var(--surface));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 16%,transparent)}
.rt-wrap:not([data-tema="petroleo"]) .rt-late-box .rt-t{background:var(--surface)}
.rt-wrap:not([data-tema="petroleo"]) .rt-tag{border-radius:999px}.rt-wrap:not([data-tema="petroleo"]) :is(.rt-late,.rt-due.late){background:var(--rt-coral)}
.rt-wrap:not([data-tema="petroleo"]) .rt-imp{--c:var(--rt-coral)}
.rt-wrap:not([data-tema="petroleo"]) .rt-mh h3,.rt-wrap:not([data-tema="petroleo"]) .rt-box h3{font-family:Georgia,serif;font-weight:400;font-size:20px}
.rt-wrap:not([data-tema="petroleo"]) .rt-cnt{background:var(--rt-soft);color:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .rt-pzi,.rt-wrap:not([data-tema="petroleo"]) .rt-sti{background:var(--rt-soft);color:var(--rt-a);border-radius:14px}
.rt-wrap:not([data-tema="petroleo"]) .rt-pbox{background:linear-gradient(135deg,var(--rt-a),color-mix(in srgb,var(--rt-a) 70%,#fff));border-radius:24px}
.rt-wrap:not([data-tema="petroleo"]) .rt-pbox small{color:#fff;opacity:.9}.rt-wrap:not([data-tema="petroleo"]) .rt-go{color:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .rt-calm{background:var(--rt-soft);box-shadow:none}
.rt-wrap:not([data-tema="petroleo"]) .rt-empty svg{background:var(--rt-soft);color:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .rt-clb{background:var(--rt-a2)}
.rt-wrap:not([data-tema="petroleo"]) .rt-wd.hj{box-shadow:inset 0 0 0 2px var(--rt-a),0 6px 22px rgba(74,43,58,.06)}.rt-wrap:not([data-tema="petroleo"]) .rt-wd.hj .rt-wdh b{color:var(--rt-a)}
.rt-wrap:not([data-tema="petroleo"]) .rt-wdh b,.rt-wrap:not([data-tema="petroleo"]) .rt-bar b{font-family:Georgia,serif;font-weight:400}
.rt-wrap:not([data-tema="petroleo"]) .rt-wi,.rt-wrap:not([data-tema="petroleo"]) .rt-cx i{border-left:0;border-radius:10px}
.rt-wrap:not([data-tema="petroleo"]) .rt-cd{border-radius:16px}.rt-wrap:not([data-tema="petroleo"]) .rt-cd.hj .rt-cn{background:var(--rt-a)}.rt-wrap:not([data-tema="petroleo"]) .rt-cd:hover{border-color:var(--rt-a2)}
.rt-wrap:not([data-tema="petroleo"]) .rt-cd.ok{background:color-mix(in srgb,#5E9C7E 12%,var(--surface))}
.rt-wrap:not([data-tema="petroleo"]) .rt-colm{border-radius:26px}
.rt-wrap:not([data-tema="petroleo"]) .rt-c-novo{background:color-mix(in srgb,#DB8B5E 11%,var(--surface))}.rt-wrap:not([data-tema="petroleo"]) .rt-c-fazendo{background:color-mix(in srgb,#8571C2 11%,var(--surface))}.rt-wrap:not([data-tema="petroleo"]) .rt-c-pronto{background:color-mix(in srgb,#5E9C7E 12%,var(--surface))}
.rt-c-novo .rt-colh i{background:#DB8B5E}.rt-c-fazendo .rt-colh i{background:#8571C2}.rt-c-pronto .rt-colh i{background:#5E9C7E}
.rt-wrap:not([data-tema="petroleo"]) .rt-colh h3{font-family:Georgia,serif;font-weight:400;font-size:18px}
.rt-wrap:not([data-tema="petroleo"]) .rt-pc{border-radius:20px;border-color:transparent;box-shadow:0 4px 16px rgba(74,43,58,.07)}
.rt-wrap:not([data-tema="petroleo"]) .rt-pc.atr{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--rt-coral) 55%,transparent),0 4px 16px rgba(74,43,58,.07)}
.rt-wrap:not([data-tema="petroleo"]) .rt-colv{border-color:color-mix(in srgb,var(--rt-a) 25%,transparent);border-radius:18px}
.rt-wrap:not([data-tema="petroleo"]) .rt-st.crit .rt-sti{background:color-mix(in srgb,var(--rt-coral) 14%,var(--surface));color:var(--rt-coral)}.rt-wrap:not([data-tema="petroleo"]) .rt-st.crit b{color:var(--rt-coral)}
.rt-wrap:not([data-tema="petroleo"]) .rt-st b{font-family:Georgia,serif;font-weight:400;font-size:28px}
/* ---- acabamento "folha" (01/11): uma superfície branca com as duas colunas, tipografia leve ---- */
.rt-b{display:grid;grid-template-columns:310px minmax(0,1fr);gap:0;align-items:stretch;background:var(--surface);border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(20,63,84,.04),0 8px 28px rgba(20,63,84,.05)}
.rt-bl{position:static;gap:0;background:var(--surface-2);border-right:1px solid var(--line);padding:6px 0}
.rt-bl>section{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:16px 20px!important}.rt-bl>section+section{border-top:1px solid var(--line)!important}
.rt-mch b{font-size:15px;font-weight:600}.rt-mnav{border:0;background:transparent;border-radius:8px;width:28px;height:28px;color:var(--ink-2)}.rt-mnav:hover{background:var(--surface)}
.rt-mw{font-weight:500}.rt-md{height:34px;width:34px;margin:0 auto;border-radius:50%;font-size:13px;font-variant-numeric:tabular-nums}
.rt-md.hj:not(.on){box-shadow:none;color:#D9263F;font-weight:700}.rt-md.on{background:var(--teal-strong)}.rt-md:hover:not(.on){background:var(--surface)}
.rt-bxh h3{font-size:13.5px;font-weight:600}.rt-bxs{font-size:12.5px;margin:4px 0 6px}
.rt-pi{border-top:0;padding:7px 0;border-radius:8px}.rt-pi b{font-weight:500}.rt-pdue{flex:0 0 auto;margin-left:auto}
.rt-pdue .rt-due{background:transparent!important;padding:0;font-weight:600;font-size:11.5px}.rt-pdue .rt-due.late{color:var(--crit-ink,#B3362A)}.rt-pdue .rt-due.hoje{color:#9A6512}
.rt-bx .rt-pz{border-top:0;padding:6px 0}.rt-bx .rt-pzi{background:var(--surface);width:28px;height:28px;flex-basis:28px}.rt-bx .rt-pzt b{font-weight:500}
.rt-br{border:0;border-radius:0;padding:26px 32px 18px;background:var(--surface)}
.rt-dh{align-items:flex-start}.rt-dtx{flex:1;min-width:0}.rt-dk{display:block;font-size:13px;font-weight:600;color:var(--teal);text-transform:capitalize;letter-spacing:.2px}
.rt-dh h2{font-size:30px;font-weight:600;letter-spacing:-.6px;margin:2px 0 0;line-height:1.15}
.rt-dh p{display:flex;align-items:center;gap:10px;margin:10px 0 0;font-size:13px;color:var(--muted)}.rt-dh .rt-pg{display:inline-block;width:120px;height:4px;margin:0;border-radius:2px}.rt-dh .rt-pg span{display:block}
.rt-dnav{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;flex:0 0 auto}.rt-dnav button{border:0;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;font-weight:500;padding:7px 12px;cursor:pointer}
.rt-dnav button+button{border-left:1px solid var(--line)}.rt-dnav button:hover:not(:disabled){background:var(--surface-2)}.rt-dnav button:disabled{color:var(--muted);cursor:default}.rt-dnav button:focus-visible{outline:2px solid var(--teal);outline-offset:-2px}
.rt-rap2{margin:20px 0 4px;border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:3px 3px 3px 12px;transition:border-color .15s,box-shadow .15s}
.rt-rap2:focus-within{border-color:var(--teal);box-shadow:0 0 0 3px color-mix(in srgb,var(--teal) 14%,transparent)}.rt-rap2 .btn{border-radius:9px}
.rt-g{margin-top:22px}.rt-gh{border:0;padding:0 0 4px}.rt-gh h3{font-size:13px;font-weight:600;color:var(--muted)}.rt-cnt{background:transparent;color:var(--muted);min-width:0;padding:0;font-weight:500}
.rt-g.late{background:color-mix(in srgb,#D9263F 5%,var(--surface));border-radius:14px;padding:12px 14px 6px;margin-top:18px}.rt-g.late .rt-gh h3,.rt-g.late .rt-cnt{color:var(--crit-ink,#B3362A);background:transparent}
.rt-r{border:0;padding:9px 0;gap:12px;align-items:flex-start}.rt-r:hover .rt-tt{color:var(--teal-strong)}
.rt-r time{flex:0 0 40px;font-size:12.5px;font-weight:500;color:var(--muted);padding-top:3px}
.rt-r .rt-ck{flex:0 0 20px;width:20px;height:20px;border:1.5px solid #AEB9BF;background:transparent;margin-top:1px}.rt-r .rt-ck:hover{border-color:var(--c);color:var(--c)}
.rt-r.feita .rt-ck{background:var(--teal);border-color:var(--teal)}
.rt-r .rt-tt{font-weight:500;font-size:15px;line-height:1.4}.rt-r .rt-chips{gap:12px;margin-top:3px}
.rt-mcat{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted)}.rt-mcat::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--c)}
.rt-mimp{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--crit-ink,#B3362A)}.rt-mimp svg{width:12px;height:12px}
.rt-mlate{font-size:12.5px;color:var(--crit-ink,#B3362A);font-weight:500}
.rt-r .rt-meta{font-size:12.5px}.rt-r .rt-pess{font-size:12.5px;color:var(--muted)}
.rt-r .rt-its{margin-top:6px}.rt-r .rt-its label{font-size:13.5px;color:var(--ink-2)}.rt-r .rt-its input{accent-color:var(--teal)}
.rt-br .rt-sub{margin:10px 0 2px 52px;font-size:12.5px;font-weight:600;color:var(--muted)}
.rt-br .rt-fts{border-top:1px solid var(--line);margin-top:20px;padding-top:12px}.rt-br .rt-fts summary{font-size:13px;font-weight:600}
.rt-br .rt-empty{padding:40px 10px}
@media (max-width:1000px){ .rt-b{grid-template-columns:minmax(0,1fr)} .rt-bl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-right:0;border-bottom:1px solid var(--line)} .rt-bl>.rt-mcal{grid-row:span 2} .rt-bl>section+section{border-top:0!important} }
@media (max-width:760px){ .rt-b{display:flex;flex-direction:column;border-radius:16px} .rt-bl{display:contents} .rt-bl>.rt-mcal{order:1;background:var(--surface-2)!important;border-bottom:1px solid var(--line)!important} .rt-br{order:2;padding:20px 16px 12px} .rt-bl>.rt-bx{order:3;background:var(--surface-2)!important;border-top:1px solid var(--line)!important}
  .rt-dh{flex-direction:column;gap:12px} .rt-dh h2{font-size:26px} .rt-dnav{align-self:stretch} .rt-dnav button{flex:1} .rt-r .rt-ck{flex-basis:24px;width:24px;height:24px} .rt-br .rt-sub{margin-left:0} }
</style>`);
})();
