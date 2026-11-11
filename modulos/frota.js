/* Frota (11/11/2026): o sistema da frota (caminhões, motoristas, abastecimentos, tanque de diesel, manutenções e relatórios)
   dentro do painel. Antes era um sistema à parte (React + servidor próprio, login e senha próprios).
   Dados em frota/dados/<caminhoes|motoristas|abastecedores|abastecimentos|compras|manutencoes> e frota/config {cap, aviso}.
   Quem vê: quem tem o módulo "frota" (e a administradora). Regras: match /frota/** (frotaOk). Apagar = removido:true.
   Uso do diesel: tipoUso 'Caminhao' = COLAFIX · 'Trator/Outro' = FIXCOL (os mesmos valores do sistema antigo, para importar o backup). */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone) P.icone('caminhao','<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>');
  const BASE='frota/dados/', COLS=['caminhoes','motoristas','abastecedores','abastecimentos','compras','manutencoes'];
  const F={on:false,lido:{},caminhoes:[],motoristas:[],abastecedores:[],abastecimentos:[],compras:[],manutencoes:[],cfg:{cap:8000,aviso:2000},
    fa:null,fc:null,fk:null,fm:null,fp:null,fb:null,qa:{q:'',d:'',u:''},qm:{q:'',s:''},qc:{q:'',st:''},rel:{per:'mes',de:'',ate:'',cam:'',tipo:'resumo'},cad:'mot',del:'',imp:null,salv:false};
  window.__frota=F;
  const esc=P.esc, hoje=()=>P.hojeStr();
  const SERV=['Troca de oleo','Filtro','Pneus','Freio','Outro'], servN=s=>s==='Troca de oleo'?'Troca de óleo':s;
  const STC={Ativo:'ok',Manutencao:'warn',Parado:'crit',Inativo:'crit'}, stN=s=>s==='Manutencao'?'Manutenção':(s||'Ativo');
  const usoN=u=>u==='Trator/Outro'?'FIXCOL':'COLAFIX', usoDoLocal=l=>l==='FIXCOL'?'Trator/Outro':'Caminhao';
  /* número como o sistema antigo: "1.234,5", "1234.5", "5,000" */
  function num(v){ if(typeof v==='number') return Number.isFinite(v)?v:0; const t=String(v==null?'':v).trim(); if(!t) return 0;
    const n=/^\d{1,3}(,\d{3})+$/.test(t)?t.replace(/,/g,''):/^\d{1,3}(\.\d{3})+$/.test(t)?t.replace(/\./g,''):t.includes(',')?t.replace(/\./g,'').replace(',','.'):t;
    const x=Number(n); return Number.isFinite(x)?x:0; }
  const fN=(n,c)=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:c||0,maximumFractionDigits:c==null?2:c});
  const fL=n=>fN(n)+' L', br=d=>d&&/^\d{4}-\d\d-\d\d/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):(d||'-');
  const dataN=d=>{ d=String(d||''); if(/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d.slice(6)+'-'+d.slice(3,5)+'-'+d.slice(0,2); return d.slice(0,10); };
  const addD=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  const vivos=k=>F[k].filter(x=>!x.removido);
  const pode=()=>!P.soVer();
  const eu=()=>(P.S.nomes||{})[P.S.uid]||P.nomeDe(P.S.uid)||'';
  const novoId=()=>'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const camTxt=c=>c?c.placa+(c.modelo?' · '+c.modelo:''):'-';
  const camDe=id=>F.caminhoes.find(c=>c._id===id||String(c.idAntigo)===String(id));
  const absDe=placa=>vivos('abastecimentos').filter(a=>a.placa===placa);
  /* média km/L do caminhão (igual ao sistema antigo): ordena pelo km e soma km rodado ÷ litros do abastecimento seguinte */
  function media(placa,xs){ const r=(xs||absDe(placa)).map(a=>({k:num(a.kmCaminhao),l:num(a.litros)})).filter(a=>a.k>0&&a.l>0).sort((a,b)=>a.k-b.k);
    if(r.length<2) return null; let km=0,l=0; for(let i=1;i<r.length;i++){ const d=r[i].k-r[i-1].k; if(d>0){ km+=d; l+=r[i].l; } } return km>0&&l>0?{km,l,m:km/l}:null; }
  const kmDe=c=>Math.max(num(c.kmAtual),...absDe(c.placa).map(a=>num(a.kmCaminhao)),0);
  function saldo(){ const s={cC:0,cT:0,uC:0,uT:0}; vivos('compras').forEach(c=>{ s.cC+=num(c.litrosCaminhoes); s.cT+=num(c.litrosTratores); });
    vivos('abastecimentos').forEach(a=>{ if(a.tipoUso==='Trator/Outro') s.uT+=num(a.litros); else s.uC+=num(a.litros); });
    s.C=s.cC-s.uC; s.T=s.cT-s.uT; s.tot=s.C+s.T; return s; }
  const ultTot=ex=>vivos('abastecimentos').filter(a=>a._id!==ex).reduce((m,a)=>Math.max(m,num(a.totalizador)),0);
  const ord=xs=>xs.slice().sort((a,b)=>((b.data||'')+(b.hora||'')).localeCompare((a.data||'')+(a.hora||'')));

  /* ---------- banco ---------- */
  function carregar(){ if(F.on||!P.db()) return; F.on=true;
    COLS.forEach(k=>P.inscrever('frota-'+k,()=>P.db().collection(BASE+k).limit(k==='abastecimentos'?12000:3000),s=>{ F[k]=s.docs.map(d=>Object.assign({_id:d.id},d.data())); F.lido[k]=true; P.rerender(); }));
    P.db().doc('frota/config').get().then(g=>{ if(g.exists) F.cfg=Object.assign(F.cfg,g.data()); P.rerender(); }).catch(()=>{}); }
  const lido=()=>COLS.every(k=>F.lido[k]);
  async function grava(k,id,o){ if(!pode()) throw new Error('Seu acesso é só para ver.'); o=Object.assign({},o,{alteradoEm:new Date().toISOString(),alteradoPor:P.S.uid,alteradoPorNome:eu()});
    if(!id){ id=novoId(); o.em=o.alteradoEm; o.por=P.S.uid; o.porNome=eu(); }
    await P.db().collection(BASE+k).doc(id).set(o,{merge:true});
    const L=F[k], i=L.findIndex(x=>x._id===id); if(i<0) L.unshift(Object.assign({_id:id},o)); else L[i]=Object.assign({},L[i],o); return id; }
  async function apaga(k,id){ await grava(k,id,{removido:true,removidoEm:new Date().toISOString(),removidoPor:eu()}); }
  /* ---------- peças (visual de 11/11: painel com o tanque em destaque, placa como etiqueta, listas por dia, formulários na gaveta) ---------- */
  const U=()=>P.ui||null;
  const icn=(n,s)=>{ try{ return P.ic(n,s||18); }catch(e){ return ''; } };
  const topo=(ey,tit,sub,ac)=>`<div class="head fr-head"><div><div class="eyebrow">FROTA · ${esc(ey)}</div><h1>${esc(tit)}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>${ac?`<div class="fr-ac">${ac}</div>`:''}</div>`;
  const selo=(t,tom)=>`<span class="fr-selo ${tom||''}">${esc(t)}</span>`;
  const placa=p=>`<span class="fr-pl"><i>BR</i><b>${esc(p||'—')}</b></span>`;
  const usoT=u=>`<span class="fr-uso ${u==='Trator/Outro'?'f':'c'}">${usoN(u)}</span>`;
  const bt=(t,act,v,sec,extra)=>`<button class="btn${sec?' sec':''}" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:''}${extra||''}>${t}</button>`;
  const lk=(t,act,v,cls)=>`<button class="lnk ${cls||''}" data-act="${act}" data-v="${esc(v)}">${t}</button>`;
  const delBt=(k,id)=>pode()?(F.del===k+':'+id?lk('Confirmar: apagar','fr-del',k+':'+id,'fr-crit'):lk('Apagar','fr-del',k+':'+id,'fr-mut')):'';
  const campo=(r,html,cls)=>`<label class="fr-f ${cls||''}"><span>${r}</span>${html}</label>`;
  const inp=(f,k,v,tp,ex)=>`<input data-fr="${f}.${k}" type="${tp||'text'}" value="${esc(v==null?'':v)}"${ex||''}>`;
  const sel=(f,k,v,ops,ex)=>`<select data-fr="${f}.${k}"${ex||''}>${ops.map(o=>{ const [val,t]=Array.isArray(o)?o:[o,o]; return `<option value="${esc(val)}"${String(val)===String(v==null?'':v)?' selected':''}>${esc(t)}</option>`; }).join('')}</select>`;
  const vazio=(t,s)=>`<div class="fr-vz">${icn('caminhao',30)}<b>${esc(t)}</b>${s?`<span>${esc(s)}</span>`:''}</div>`;
  const carregando=()=>`<div class="fr-card">${vazio('Carregando os dados da frota…')}</div>`;
  const card=(tit,corpo,o)=>{ o=o||{}; return `<section class="fr-card${o.cls?' '+o.cls:''}">${tit?`<div class="fr-ch">${o.ic?`<span class="fr-chi">${icn(o.ic,17)}</span>`:''}<h3>${esc(tit)}</h3>${o.cont!=null?`<span class="fr-cont">${esc(o.cont)}</span>`:''}<span class="fr-chr">${o.ac||''}</span></div>`:''}${corpo}</section>`; };
  const nums=xs=>`<div class="fr-nums">${xs.map(x=>`<div class="fr-n ${x.tom||''}"${x.go?` data-go="${x.go}" role="button"`:''}><small>${esc(x.r)}</small><b>${x.v}</b>${x.s?`<span>${x.s}</span>`:''}</div>`).join('')}</div>`;
  const seg=(itens,act,atual)=>`<div class="fr-seg">${itens.map(([k,t])=>`<button class="${String(atual)===String(k)?'on':''}" data-act="${act}" data-v="${esc(k)}">${t}</button>`).join('')}</div>`;
  const busca=(id,v,ph)=>`<label class="fr-bus"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="${id}" type="search" placeholder="${esc(ph)}" value="${esc(v)}"></label>`;
  /* gaveta à direita (fica dentro da tela: o redesenho mantém o que foi digitado, que está em F) */
  const gaveta=(k,tit,sub,corpo,rod)=>F.dw!==k?'':`<div class="fr-dwbg" data-act="fr-dwx"></div><aside class="fr-dw" role="dialog" aria-label="${esc(tit)}"><header><div><h2>${esc(tit)}</h2>${sub?`<p>${sub}</p>`:''}</div><button class="fr-dwc" data-act="fr-dwx" aria-label="Fechar">×</button></header><div class="fr-dwb">${corpo}</div><footer>${rod}</footer></aside>`;
  const grupo=(t,html)=>`<div class="fr-gp"><div class="fr-gpt">${esc(t)}</div><div class="fr-fs">${html}</div></div>`;
  const barras=(xs,o)=>{ o=o||{}; if(!xs.length||!xs.some(x=>x.v)) return `<div class="fr-sv">Nada no período.</div>`; const mx=Math.max(1,...xs.map(x=>x.v)), med=xs.reduce((s,x)=>s+x.v,0)/xs.length;
    return `<div class="fr-bars">${o.media?`<div class="fr-bmed" style="bottom:calc(${(med/mx*100).toFixed(1)}% * .82 + 22px)"><span>média ${fN(med,0)}</span></div>`:''}${xs.map(x=>`<div class="fr-bar${x.hj?' hj':''}" title="${esc(x.t+': '+fN(x.v)+' L')}"><em>${x.v?fN(x.v,0):''}</em><i style="height:${(x.v/mx*82).toFixed(1)}%"></i><small>${esc(x.t)}</small></div>`).join('')}</div>`; };
  const DSEM=['dom','seg','ter','qua','qui','sex','sáb'], MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const diaTxt=d=>{ const h=hoje(); if(d===h) return 'Hoje'; if(d===addD(h,-1)) return 'Ontem'; const x=new Date(d+'T12:00'); return DSEM[x.getDay()].replace(/^./,c=>c.toUpperCase())+', '+br(d).slice(0,5); };
  /* tanque: barra com COLAFIX, FIXCOL e o vazio, marca do aviso */
  function tanque(s,claro){ const cap=F.cfg.cap||8000, av=F.cfg.aviso||2000, pc=v=>Math.max(0,Math.min(100,v/cap*100));
    const c=pc(Math.max(0,s.C)), t=Math.min(100-c,pc(Math.max(0,s.T)));
    return `<div class="fr-tk${claro?' fr-esc':''}"><div class="fr-tkb"><i class="c" style="width:${c.toFixed(1)}%"></i><i class="f" style="width:${t.toFixed(1)}%"></i><u style="left:${pc(av).toFixed(1)}%" title="Aviso para pedir diesel: ${fL(av)}"></u></div>
      <div class="fr-tkl"><span><i class="c"></i>COLAFIX ${fL(s.C)}</span><span><i class="f"></i>FIXCOL ${fL(s.T)}</span><span><i class="v"></i>Livre ${fL(Math.max(0,cap-s.tot))}</span></div></div>`; }

  /* ---------- Painel ---------- */
  function vPainel(){ carregar(); if(!lido()) return topo('PAINEL','Frota')+carregando();
    const s=saldo(), cap=F.cfg.cap||8000, cams=vivos('caminhoes'), at=cams.filter(c=>(c.status||'Ativo')==='Ativo'), mn=cams.filter(c=>c.status==='Manutencao');
    const abs=vivos('abastecimentos'), hj=hoje(), dHj=abs.filter(a=>dataN(a.data)===hj), lHj=dHj.reduce((t,a)=>t+num(a.litros),0);
    const dias=[]; for(let i=6;i>=0;i--){ const d=addD(hj,-i); dias.push({t:i===0?'hoje':DSEM[new Date(d+'T12:00').getDay()]+' '+br(d).slice(0,2),hj:i===0,v:abs.filter(a=>dataN(a.data)===d).reduce((t,a)=>t+num(a.litros),0)}); }
    const pct=Math.max(0,Math.round(s.tot/cap*100)), baixo=s.tot<=(F.cfg.aviso||2000), neg=s.C<0||s.T<0;
    const rk=cams.map(c=>({c,m:media(c.placa)})).filter(x=>x.m).sort((a,b)=>b.m.m-a.m.m);
    const mf=(()=>{ let k=0,l=0; rk.forEach(x=>{ k+=x.m.km; l+=x.m.l; }); return l?k/l:null; })();
    const est=neg?['crit','Saldo negativo','Confira se alguma compra de diesel não foi lançada.']:baixo?['warn','Fazer novo pedido de diesel','Cabem '+fL(Math.max(0,cap-s.tot))+' no tanque.']:['ok','Tanque em dia','Aviso para pedir diesel em '+fL(F.cfg.aviso||2000)+'.'];
    const hero=`<section class="fr-hero"><div class="fr-hl"><div class="fr-hk">TANQUE DE DIESEL</div><div class="fr-hv"><b>${fN(s.tot)}</b><span>L</span><em>de ${fN(cap)} L · ${pct}%</em></div>${tanque(s,1)}
        <div class="fr-hst ${est[0]}"><i></i><b>${est[1]}</b><span>${est[2]}</span>${est[0]!=='ok'?`<button class="fr-hbt" data-go="frotatq">Abrir o tanque</button>`:''}</div></div>
      <div class="fr-hr"><div class="fr-ht" data-go="frotaabs" role="button"><small>Abastecido hoje</small><b>${fL(lHj)}</b><span>${dHj.length} abastecimento${dHj.length===1?'':'s'}</span></div>
        <div class="fr-ht" data-go="frotacam" role="button"><small>Caminhões ativos</small><b>${at.length}</b><span>de ${cams.length} cadastrados</span></div>
        <div class="fr-ht"><small>Média da frota</small><b>${mf?fN(mf,2):'—'}</b><span>km/L</span></div>
        <div class="fr-ht${mn.length?' w':''}" data-go="frotacam" role="button"><small>Em manutenção</small><b>${mn.length}</b><span>${mn.length?mn.map(c=>c.placa).slice(0,3).join(', '):'nenhum'}</span></div></div></section>`;
    const saldos=`<div class="fr-sl"><div><small>Saldo COLAFIX</small> <b class="${s.C<0?'neg':''}">${fL(s.C)}</b></div><div><small>Saldo FIXCOL</small> <b class="${s.T<0?'neg':''}">${fL(s.T)}</b></div><div><small>Usado</small> <b>${fL(s.uC+s.uT)}</b></div><div><small>Comprado</small> <b>${fL(s.cC+s.cT)}</b></div></div>`;
    const rkH=rk.length?rk.slice(0,8).map((x,i)=>{ const mx=rk[0].m.m; return `<div class="fr-rk${i===0?' top':''}${i===rk.length-1&&rk.length>2?' low':''}"><span class="fr-rkn">${i+1}</span>${placa(x.c.placa)}<span class="fr-rkm">${esc(x.c.modelo||'')}</span><span class="fr-rkb"><i style="width:${(x.m.m/mx*100).toFixed(0)}%"></i></span><b>${fN(x.m.m,2)} km/L</b></div>`; }).join(''):`<div class="fr-sv">A média aparece depois de 2 abastecimentos com km de cada caminhão.</div>`;
    const ult=ord(abs).slice(0,6);
    return topo('PAINEL','Frota','Caminhões, diesel e manutenções · '+DSEM[new Date(hj+'T12:00').getDay()]+', '+br(hj),pode()?bt('+ Abastecimento','fr-novo','abs')+bt('+ Compra de diesel','fr-novo','cp',1):'')+hero+saldos+
    `<div class="fr-g2">${card('Consumo nos últimos 7 dias',barras(dias,{media:1}),{ic:'grafico',ac:`<span class="fr-mut">litros</span>`})}${card('Média dos caminhões',rkH,{ic:'caminhao',ac:`<span class="fr-mut">km/L</span>`})}</div>
    <div class="fr-g2 fr-g2b">${card('Últimos abastecimentos',ult.length?ult.map(a=>linhaAbs(a,1)).join('')+`<button class="fr-mais" data-go="frotaabs">Ver todos os abastecimentos</button>`:`<div class="fr-sv">Nenhum abastecimento ainda.</div>`,{ic:'lista',cls:'fr-lc'})}
      ${card('Em manutenção',(mn.length?mn.map(c=>`<div class="fr-mnr">${placa(c.placa)}<span>${esc(c.modelo||'')}</span>${selo('Manutenção','warn')}</div>`).join(''):`<div class="fr-sv ok">Nenhum caminhão em manutenção.</div>`)+`<button class="fr-mais" data-go="frotaman">${vivos('manutencoes').length} manutenções registradas · ver</button>`,{ic:'ajuste',cont:mn.length||null})}</div>`+gavetas(); }

  /* ---------- Abastecimentos ---------- */
  function linhaAbs(a,curto){ return `<div class="fr-ab${curto?' cu':''}"><span class="fr-abh">${esc(a.hora||'')}${curto?`<small>${esc(br(dataN(a.data)).slice(0,5))}</small>`:''}</span>
      <span class="fr-abp">${placa(a.placa)}<small>${esc(a.caminhao||'')}</small></span>
      <span class="fr-abm"><b>${esc(a.motorista||'-')}</b><small>${curto?'':'abasteceu '+esc(a.abastecedor||'-')+(a.turno?' · '+esc(a.turno==='Manha'?'manhã':String(a.turno).toLowerCase()):'')}</small></span>
      ${curto?'':`<span class="fr-abk"><small>km</small>${a.kmCaminhao?fN(num(a.kmCaminhao),0):'-'}</span><span class="fr-abk"><small>bomba</small>${a.totalizador?fN(num(a.totalizador),0):'-'}</span><span class="fr-abk"><small>req.</small>${esc(a.requisicao||'-')}</span>`}
      ${usoT(a.tipoUso)}<span class="fr-abl">${fL(num(a.litros))}</span>
      ${curto?'':`<span class="fr-acs">${pode()?lk('Editar','fr-abs-ed',a._id):''}${delBt('abastecimentos',a._id)}</span>`}</div>`; }
  function tabAbs(xs){ return xs.map(a=>`<tr><td data-r="Data">${br(dataN(a.data))}<small>${esc(a.hora||'')}</small></td><td data-r="Caminhão">${placa(a.placa)}<small>${esc(a.caminhao||'')}</small></td><td data-r="Motorista">${esc(a.motorista||'-')}</td><td class="n" data-r="Km">${a.kmCaminhao?fN(num(a.kmCaminhao),0):'-'}</td><td class="n" data-r="Litros"><b>${fL(num(a.litros))}</b></td><td data-r="Uso">${usoT(a.tipoUso)}</td></tr>`).join(''); }
  function gavAbs(){ const f=F.fa||(F.fa=faNovo()), ed=f._id, cam=camDe(f.caminhaoId), uT=ultTot(ed), kmU=cam?Math.max(0,...absDe(cam.placa).filter(a=>a._id!==ed).map(a=>num(a.kmCaminhao))):0;
    const tot=num(f.totalizador), kmV=num(f.kmCaminhao);
    const corpo=grupo('Quando',campo('Data',inp('fa','data',f.data,'date'))+campo('Hora',inp('fa','hora',f.hora,'time'))+campo('Turno',sel('fa','turno',f.turno,[['Manha','Manhã'],'Tarde','Noite']),'w2'))+
      grupo('Caminhão e pessoas',campo('Caminhão',sel('fa','caminhaoId',f.caminhaoId,[['','Escolha o caminhão']].concat(vivos('caminhoes').map(c=>[c._id,camTxt(c)]))),'w2')+
        campo('Motorista',sel('fa','motoristaId',f.motoristaId,[['','Escolha']].concat(vivos('motoristas').filter(m=>(m.status||'Ativo')==='Ativo'||m._id===f.motoristaId).map(m=>[m._id,m.nome+(m.matricula?' · '+m.matricula:'')]))),'w2')+
        campo('Abastecedor',sel('fa','abastecedorId',f.abastecedorId,[['','Escolha']].concat(vivos('abastecedores').filter(m=>(m.status||'Ativo')==='Ativo'||m._id===f.abastecedorId).map(m=>[m._id,m.nome]))),'w2'))+
      grupo('Bomba e caminhão',campo('Km do caminhão'+(kmU?` <em>último ${fN(kmU,0)}</em>`:''),inp('fa','kmCaminhao',f.kmCaminhao,'text',' inputmode="numeric"'))+campo('Litros',inp('fa','litros',f.litros,'text',' inputmode="decimal" placeholder="0,0"'))+
        campo('Totalizador da bomba'+(uT?` <em>último ${fN(uT,0)}</em>`:''),inp('fa','totalizador',f.totalizador,'text',' inputmode="numeric"'))+campo('Requisição',inp('fa','requisicao',f.requisicao,'text',' inputmode="numeric"'))+
        campo('Uso do diesel'+(cam?' <em>pelo caminhão</em>':''),sel('fa','tipoUso',cam?usoDoLocal(cam.localConsumo):f.tipoUso,[['Caminhao','COLAFIX'],['Trator/Outro','FIXCOL']],cam?' disabled':''),'w2'))+
      (uT&&tot&&tot<uT?`<div class="fr-msg ${ed?'warn':'crit'}">O totalizador (${fN(tot,0)}) está menor que o último registrado (${fN(uT,0)}).${ed?' Como é uma correção, dá para salvar.':' Confira o número da bomba.'}</div>`:'')+
      (kmU&&kmV&&kmV<kmU?`<div class="fr-msg warn">O km (${fN(kmV,0)}) está menor que o último deste caminhão (${fN(kmU,0)}).</div>`:'');
    return gaveta('abs',ed?'Corrigir abastecimento':'Novo abastecimento','Sai do saldo do tanque (COLAFIX ou FIXCOL).',corpo,bt(F.salv?'Salvando…':ed?'Salvar correção':'Registrar abastecimento','fr-abs-ok')+bt('Cancelar','fr-abs-x',null,1)); }
  function vAbs(){ carregar(); if(!lido()) return topo('ABASTECIMENTOS','Abastecimentos')+carregando();
    const q=F.qa, t=q.q.toLowerCase();
    const xs=ord(vivos('abastecimentos').filter(a=>(!q.d||dataN(a.data)===q.d)&&(!q.u||a.tipoUso===q.u)&&(!t||[a.placa,a.caminhao,a.motorista,a.abastecedor,a.requisicao].join(' ').toLowerCase().includes(t))));
    const lit=xs.reduce((s,a)=>s+num(a.litros),0), lC=xs.filter(a=>a.tipoUso!=='Trator/Outro').reduce((s,a)=>s+num(a.litros),0);
    const vis=xs.slice(0,300), gs=[]; vis.forEach(a=>{ const d=dataN(a.data); let g=gs[gs.length-1]; if(!g||g.d!==d){ g={d,xs:[]}; gs.push(g); } g.xs.push(a); });
    return topo('ABASTECIMENTOS','Abastecimentos','Cada abastecimento sai do saldo do tanque (COLAFIX ou FIXCOL).',pode()?bt('+ Novo abastecimento','fr-novo','abs'):'')+
    `<div class="fr-tool">${busca('fr-qa',q.q,'Placa, motorista, abastecedor ou requisição')}<input class="fr-dt" type="date" data-frq="qa.d" value="${esc(q.d)}" aria-label="Dia">${seg([['','Todos'],['Caminhao','COLAFIX'],['Trator/Outro','FIXCOL']],'fr-qa-u',q.u)}${q.q||q.d||q.u?lk('Limpar filtros','fr-qa-x',''):''}</div>`+
    nums([{r:'Abastecimentos',v:fN(xs.length,0)},{r:'Litros',v:fL(lit)},{r:'COLAFIX',v:fL(lC)},{r:'FIXCOL',v:fL(lit-lC)}])+
    (gs.length?gs.map(g=>`<section class="fr-card fr-dia"><div class="fr-dh"><b>${esc(diaTxt(g.d))}</b><span>${esc(br(g.d))}</span><em>${g.xs.length} · ${fL(g.xs.reduce((s,a)=>s+num(a.litros),0))}</em></div>${g.xs.map(a=>linhaAbs(a)).join('')}</section>`).join('')+(xs.length>300?`<div class="fr-sv">Mostrando os 300 mais recentes. Use os filtros ou os Relatórios para ver o resto.</div>`:''):`<div class="fr-card">${vazio('Nenhum abastecimento encontrado.',q.q||q.d||q.u?'Tente limpar os filtros.':'Toque em "+ Novo abastecimento".')}</div>`)+gavetas(); }

  /* ---------- Tanque ---------- */
  function gavCp(){ const f=F.fc||(F.fc={data:hoje(),litrosCaminhoes:'',litrosTratores:'',observacao:''}), ed=f._id, s=saldo(), cap=F.cfg.cap||8000;
    const corpo=`<div class="fr-msg">Hoje o tanque tem <b>${fL(s.tot)}</b> e cabem <b>${fL(Math.max(0,cap-s.tot))}</b>.</div>`+grupo('Compra',campo('Data',inp('fc','data',f.data,'date'),'w2')+campo('Litros para COLAFIX',inp('fc','litrosCaminhoes',f.litrosCaminhoes,'text',' inputmode="decimal"'))+campo('Litros para FIXCOL',inp('fc','litrosTratores',f.litrosTratores,'text',' inputmode="decimal"'))+campo('Observação (nota, fornecedor…)',inp('fc','observacao',f.observacao),'w2'));
    return gaveta('cp',ed?'Corrigir compra de diesel':'Compra de diesel','Entra no saldo do tanque.',corpo,bt(F.salv?'Salvando…':ed?'Salvar correção':'Lançar compra','fr-cp-ok')+bt('Cancelar','fr-cp-x',null,1)); }
  function vTq(){ carregar(); if(!lido()) return topo('TANQUE','Tanque de diesel')+carregando();
    const s=saldo(), cap=F.cfg.cap||8000;
    const mov=[]; vivos('compras').forEach(c=>mov.push({d:dataN(c.data),h:'00:00',t:'Entrada · compra',o:c.observacao&&c.observacao!=='-'?c.observacao:'',C:num(c.litrosCaminhoes),T:num(c.litrosTratores)}));
    vivos('abastecimentos').forEach(a=>{ const l=num(a.litros); mov.push({d:dataN(a.data),h:a.hora||'00:00',t:'Saída · abastecimento',o:(a.placa||'')+(a.requisicao?' · req. '+a.requisicao:''),C:a.tipoUso==='Trator/Outro'?0:-l,T:a.tipoUso==='Trator/Outro'?-l:0}); });
    mov.sort((a,b)=>(a.d+a.h).localeCompare(b.d+b.h)); let run=0; mov.forEach(m=>{ run+=m.C+m.T; m.s=run; }); mov.reverse();
    const pct=Math.max(0,Math.round(s.tot/cap*100)), cps=ord(vivos('compras'));
    const sv=v=>`<span class="${v<0?'fr-neg':v>0?'fr-pos':'fr-mut'}">${v?(v>0?'+':'')+fN(v):'·'}</span>`;
    return topo('TANQUE','Tanque de diesel','Capacidade '+fL(cap)+' · aviso para pedir diesel em '+fL(F.cfg.aviso||2000)+' · '+lk('mudar','fr-go','frotacad'),pode()?bt('+ Compra de diesel','fr-novo','cp'):'')+
    `<section class="fr-card fr-tqc"><div class="fr-tqh"><div><small>Saldo total</small><b>${fL(s.tot)}</b><span>${pct}% do tanque</span></div>${tanque(s)}</div>`+
    nums([{r:'Saldo COLAFIX',v:fL(s.C),s:'comprado '+fL(s.cC)+' · usado '+fL(s.uC),tom:s.C<0?'crit':''},{r:'Saldo FIXCOL',v:fL(s.T),s:'comprado '+fL(s.cT)+' · usado '+fL(s.uT),tom:s.T<0?'crit':''},{r:'Cabem no tanque',v:fL(Math.max(0,cap-s.tot)),tom:s.tot<=(F.cfg.aviso||2000)?'warn':''}])+`</section>`+
    `<div class="fr-g2">${card('Compras',cps.length?cps.map(c=>`<div class="fr-cpr"><span class="fr-cpd"><b>${br(dataN(c.data)).slice(0,2)}</b><small>${esc(MES[+dataN(c.data).slice(5,7)-1]||'').slice(0,3)}</small></span><span class="fr-cpo"><b>${fL(num(c.litrosCaminhoes)+num(c.litrosTratores))}</b><small>COLAFIX ${fN(num(c.litrosCaminhoes))} · FIXCOL ${fN(num(c.litrosTratores))}${c.observacao&&c.observacao!=='-'?' · '+esc(c.observacao):''}</small></span><span class="fr-acs">${pode()?lk('Editar','fr-cp-ed',c._id):''}${delBt('compras',c._id)}</span></div>`).join(''):vazio('Nenhuma compra lançada.'),{ic:'baixar',cont:cps.length})}
    ${card('Extrato do tanque',mov.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Movimento</th><th class="n">COLAFIX</th><th class="n">FIXCOL</th><th class="n">Saldo</th></tr></thead><tbody>${mov.slice(0,200).map(m=>`<tr><td data-r="Data">${br(m.d)}${m.h!=='00:00'?`<small>${esc(m.h)}</small>`:''}</td><td data-r="Movimento">${esc(m.t)}<small>${esc(m.o)}</small></td><td class="n" data-r="COLAFIX">${sv(m.C)}</td><td class="n" data-r="FIXCOL">${sv(m.T)}</td><td class="n" data-r="Saldo"><b>${fL(m.s)}</b></td></tr>`).join('')}</tbody></table></div>${mov.length>200?'<div class="fr-sv">Mostrando os 200 últimos movimentos.</div>':''}`:vazio('Sem movimentos.'),{ic:'lista'})}</div>`+gavetas(); }

  /* ---------- Caminhões ---------- */
  function gavCam(){ const f=F.fk||(F.fk={placa:'',modelo:'',kmAtual:'',status:'Ativo',localConsumo:'COLAFIX'}), ed=f._id;
    const corpo=grupo('Caminhão',campo('Placa',inp('fk','placa',f.placa,'text',' placeholder="ABC-1234" maxlength="8" style="text-transform:uppercase"'))+campo('Km atual',inp('fk','kmAtual',f.kmAtual,'text',' inputmode="numeric"'))+campo('Modelo',inp('fk','modelo',f.modelo),'w2'))+
      grupo('Uso',campo('Situação',sel('fk','status',f.status,['Ativo',['Manutencao','Manutenção'],'Parado']))+campo('Diesel sai de',sel('fk','localConsumo',f.localConsumo,['COLAFIX','FIXCOL'])));
    return gaveta('cam',ed?'Editar caminhão':'Novo caminhão','A média e o km atual vêm dos abastecimentos.',corpo,bt(F.salv?'Salvando…':ed?'Salvar':'Cadastrar caminhão','fr-cam-ok')+bt('Cancelar','fr-cam-x',null,1)); }
  function vCam(){ carregar(); if(!lido()) return topo('CAMINHÕES','Caminhões')+carregando();
    const q=F.qc, t=q.q.toLowerCase(), todos=vivos('caminhoes');
    const xs=todos.filter(c=>(!q.st||(c.status||'Ativo')===q.st)&&(!t||(c.placa+' '+(c.modelo||'')).toLowerCase().includes(t))).sort((a,b)=>String(a.placa).localeCompare(String(b.placa)));
    const n=s=>todos.filter(c=>(c.status||'Ativo')===s).length;
    return topo('CAMINHÕES','Caminhões','A média (km/L) e o km atual vêm dos abastecimentos.',pode()?bt('+ Novo caminhão','fr-novo','cam'):'')+
    `<div class="fr-tool">${busca('fr-qc',q.q,'Placa ou modelo')}${seg([['','Todos '+todos.length],['Ativo','Ativos '+n('Ativo')],['Manutencao','Manutenção '+n('Manutencao')],['Parado','Parados '+n('Parado')]],'fr-qc-st',q.st)}</div>`+
    (xs.length?`<div class="fr-cams">${xs.map(c=>{ const m=media(c.placa), u=ord(absDe(c.placa))[0], st=c.status||'Ativo';
      return `<article class="fr-cc ${STC[st]||''}"><header>${placa(c.placa)}${selo(stN(st),STC[st])}</header><div class="fr-ccm">${esc(c.modelo||'')}<small>diesel ${esc(c.localConsumo||'COLAFIX')}</small></div>
        <div class="fr-ccn"><div><small>Km atual</small><b>${fN(kmDe(c),0)}</b></div><div><small>Média</small><b>${m?fN(m.m,2)+' km/L':'a calcular'}</b></div><div><small>Último</small><b>${u?br(dataN(u.data)).slice(0,5):'—'}</b><span>${u?fL(num(u.litros)):''}</span></div></div>
        <footer>${lk('Relatório','fr-cam-rel',c._id)}${pode()?lk('Editar','fr-cam-ed',c._id):''}${delBt('caminhoes',c._id)}</footer></article>`; }).join('')}</div>`:`<div class="fr-card">${vazio('Nenhum caminhão.',pode()?'Toque em "+ Novo caminhão".':'')}</div>`)+gavetas(); }

  /* ---------- Manutenções ---------- */
  function gavMan(){ const f=F.fm||(F.fm={data:hoje(),caminhaoId:'',km:'',servicos:['Troca de oleo'],observacao:''}), ed=f._id;
    const corpo=grupo('Serviço',campo('Data',inp('fm','data',f.data,'date'))+campo('Km',inp('fm','km',f.km,'text',' inputmode="numeric"'))+campo('Caminhão',sel('fm','caminhaoId',f.caminhaoId,[['','Escolha o caminhão']].concat(vivos('caminhoes').map(c=>[c._id,camTxt(c)]))),'w2')+
      `<div class="fr-f w2"><span>O que foi feito</span><div class="fr-chips">${SERV.map(s=>`<button class="fr-chip${f.servicos.includes(s)?' on':''}" data-act="fr-man-sv" data-v="${esc(s)}">${esc(servN(s))}</button>`).join('')}</div></div>`+campo('Observação',inp('fm','observacao',f.observacao),'w2'));
    return gaveta('man',ed?'Corrigir manutenção':'Nova manutenção','Serviço feito num caminhão.',corpo,bt(F.salv?'Salvando…':ed?'Salvar correção':'Registrar manutenção','fr-man-ok')+bt('Cancelar','fr-man-x',null,1)); }
  function vMan(){ carregar(); if(!lido()) return topo('MANUTENÇÕES','Manutenções')+carregando();
    const q=F.qm, t=q.q.toLowerCase();
    const xs=ord(vivos('manutencoes').filter(m=>(!q.s||servDe(m).includes(q.s))&&(!t||[m.caminhao,m.servico,m.observacao,m.km].join(' ').toLowerCase().includes(t))));
    const gs=[]; xs.slice(0,300).forEach(m=>{ const k=dataN(m.data).slice(0,7); let g=gs[gs.length-1]; if(!g||g.k!==k){ g={k,xs:[]}; gs.push(g); } g.xs.push(m); });
    return topo('MANUTENÇÕES','Manutenções','Serviços feitos nos caminhões cadastrados.',pode()?bt('+ Nova manutenção','fr-novo','man'):'')+
    `<div class="fr-tool">${busca('fr-qm',q.q,'Caminhão, serviço ou observação')}${seg([['','Todos']].concat(SERV.map(s=>[s,servN(s)])),'fr-qm-s',q.s)}</div>`+
    (gs.length?gs.map(g=>`<section class="fr-card fr-dia"><div class="fr-dh"><b>${esc((MES[+g.k.slice(5,7)-1]||'').replace(/^./,c=>c.toUpperCase()))} de ${g.k.slice(0,4)}</b><em>${g.xs.length} serviço${g.xs.length===1?'':'s'}</em></div>${g.xs.map(m=>{ const c=m.caminhaoId&&camDe(m.caminhaoId), pl=c?c.placa:String(m.caminhao||'').split(' - ')[0], mo=c?c.modelo:String(m.caminhao||'').split(' - ')[1]||'';
      return `<div class="fr-mr"><span class="fr-cpd"><b>${br(dataN(m.data)).slice(0,2)}</b><small>${esc(DSEM[new Date(dataN(m.data)+'T12:00').getDay()]||'')}</small></span><span class="fr-abp">${placa(pl)}<small>${esc(mo)}${m.km?' · '+fN(num(m.km),0)+' km':''}</small></span>
        <span class="fr-msv">${servDe(m).map(s=>selo(servN(s),'info')).join('')}${m.observacao&&m.observacao!=='-'?`<small>${esc(m.observacao)}</small>`:''}</span><span class="fr-acs">${pode()?lk('Editar','fr-man-ed',m._id):''}${delBt('manutencoes',m._id)}</span></div>`; }).join('')}</section>`).join(''):`<div class="fr-card">${vazio('Nenhuma manutenção.',pode()?'Toque em "+ Nova manutenção".':'')}</div>`)+gavetas(); }

  /* ---------- Relatórios ---------- */
  function vRel(){ carregar(); if(!lido()) return topo('RELATÓRIOS','Relatórios')+carregando();
    const r=F.rel, R=relDados();
    const fil=`<div class="fr-tool fr-relf">${seg(PER,'fr-rel-per',r.per)}${r.per==='datas'?`<label class="fr-f fr-in"><span>De</span><input type="date" data-frq="rel.de" value="${esc(R.de)}"></label><label class="fr-f fr-in"><span>Até</span><input type="date" data-frq="rel.ate" value="${esc(R.ate)}"></label>`:''}
      <label class="fr-f fr-in"><span>Caminhão</span><select data-frq="rel.cam"><option value="">Todos os caminhões</option>${vivos('caminhoes').map(c=>`<option value="${esc(c._id)}"${r.cam===c._id?' selected':''}>${esc(camTxt(c))}</option>`).join('')}</select></label></div>
      <div class="fr-tabs">${TIPOS.map(([k,t])=>`<button class="${r.tipo===k?'on':''}" data-act="fr-rel-tipo" data-v="${k}">${t}</button>`).join('')}</div>`;
    const tab=(cols,rows,vz)=>rows.length?`<div class="fr-tw"><table class="fr-t"><thead><tr>${cols.map(c=>`<th${c[1]?' class="n"':''}>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:vazio(vz);
    let corpo='';
    if(r.tipo==='resumo') corpo=nums([{r:'Abastecido',v:fL(R.lit),s:R.abs.length+' abastecimentos'},{r:'COLAFIX',v:fL(R.lC)},{r:'FIXCOL',v:fL(R.lT)},{r:'Diesel comprado',v:fL(R.cmp),s:R.comp.length+' compras'},{r:'Km rodado',v:fN(R.kmT,0)+' km',s:R.mG?'média '+fN(R.mG,2)+' km/L':''},{r:'Manutenções',v:R.man.length}])+
      `<div class="fr-g2">${card('Consumo por '+(R.sem?'semana':'dia'),barras(R.serie,{media:1}),{ic:'grafico',ac:'<span class="fr-mut">litros</span>'})}${card('Caminhões que mais abasteceram',R.veic.length?R.veic.slice(0,10).map((v,i)=>`<div class="fr-rk"><span class="fr-rkn">${i+1}</span>${placa(v.c.placa)}<span class="fr-rkm">${esc(v.c.modelo||'')}</span><span class="fr-rkb"><i style="width:${(v.l/R.veic[0].l*100).toFixed(0)}%"></i></span><b>${fL(v.l)}</b></div>`).join(''):`<div class="fr-sv">Nada no período.</div>`,{ic:'caminhao'})}</div>`;
    if(r.tipo==='abs') corpo=card('Abastecimentos',tab([['Data'],['Caminhão'],['Motorista'],['Km',1],['Litros',1],['Uso']],R.abs.length?[tabAbs(R.abs.slice(0,500))]:[],'Nenhum abastecimento no período.')+(R.abs.length>500?'<div class="fr-sv">Mostrando 500. O Excel tem todos.</div>':''),{cont:R.abs.length});
    if(r.tipo==='veic') corpo=card('Consumo por veículo',tab([['Caminhão'],['Abastecimentos',1],['Litros',1],['Km rodado',1],['Média',1]],R.veic.map(v=>`<tr><td data-r="Caminhão">${placa(v.c.placa)}<small>${esc(v.c.modelo||'')}</small></td><td class="n" data-r="Abast.">${v.n}</td><td class="n" data-r="Litros">${fL(v.l)}</td><td class="n" data-r="Km">${fN(v.km,0)}</td><td class="n" data-r="Média"><b>${v.m?fN(v.m,2)+' km/L':'-'}</b></td></tr>`),'Nada no período.'));
    if(r.tipo==='comp') corpo=card('Compras de diesel',tab([['Data'],['COLAFIX',1],['FIXCOL',1],['Total',1],['Observação']],R.comp.map(c=>`<tr><td data-r="Data">${br(dataN(c.data))}</td><td class="n" data-r="COLAFIX">${fL(num(c.litrosCaminhoes))}</td><td class="n" data-r="FIXCOL">${fL(num(c.litrosTratores))}</td><td class="n" data-r="Total"><b>${fL(num(c.litrosCaminhoes)+num(c.litrosTratores))}</b></td><td data-r="Obs.">${esc(c.observacao&&c.observacao!=='-'?c.observacao:'')}</td></tr>`),'Nenhuma compra no período.'));
    if(r.tipo==='man') corpo=card('Manutenções',tab([['Data'],['Caminhão'],['Km',1],['Serviços'],['Observação']],R.man.map(m=>`<tr><td data-r="Data">${br(dataN(m.data))}</td><td data-r="Caminhão">${esc(m.caminhao||'-')}</td><td class="n" data-r="Km">${m.km?fN(num(m.km),0):'-'}</td><td data-r="Serviços">${servDe(m).map(s=>selo(servN(s),'info')).join(' ')}</td><td data-r="Obs.">${esc(m.observacao&&m.observacao!=='-'?m.observacao:'')}</td></tr>`),'Nenhuma manutenção no período.'));
    return topo('RELATÓRIOS','Relatórios',esc(perTxt(R)+(R.cam?' · '+R.cam.placa:'')),bt('Excel','fr-rel-xls',null,1)+bt('Baixar PDF','fr-rel-pdf'))+fil+corpo; }

  /* ---------- Cadastros ---------- */
  function gavPes(t){ const fk=t==='mot'?'fp':'fb', f=F[fk]||(F[fk]={nome:'',matricula:'',status:'Ativo'});
    const corpo=grupo(t==='mot'?'Motorista':'Abastecedor',campo('Nome',inp(fk,'nome',f.nome),'w2')+(t==='mot'?campo('Matrícula',inp(fk,'matricula',f.matricula)):'')+campo('Situação',sel(fk,'status',f.status,['Ativo','Inativo'])));
    return gaveta(t,(f._id?'Editar ':'Novo ')+(t==='mot'?'motorista':'abastecedor'),'',corpo,bt(F.salv?'Salvando…':f._id?'Salvar':'Cadastrar','fr-pes-ok',t)+bt('Cancelar','fr-pes-x',t,1)); }
  function vCad(){ carregar(); if(!lido()) return topo('CADASTROS','Cadastros')+carregando();
    const ab=[['mot','Motoristas',vivos('motoristas').length],['aba','Abastecedores',vivos('abastecedores').length],['tq','Tanque'],['imp','Trazer do sistema antigo']];
    let c='';
    if(F.cad==='mot'||F.cad==='aba'){ const k=F.cad==='mot'?'motoristas':'abastecedores', xs=vivos(k).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
      c=card(F.cad==='mot'?'Motoristas':'Abastecedores',xs.length?xs.map(m=>{ const nA=vivos('abastecimentos').filter(a=>(F.cad==='mot'?a.motorista:a.abastecedor)===m.nome).length;
        return `<div class="fr-pr">${U()?U().ini(m.nome):''}<span class="fr-prn"><b>${esc(m.nome)}</b><small>${F.cad==='mot'&&m.matricula?'matrícula '+esc(m.matricula)+' · ':''}${nA} abastecimento${nA===1?'':'s'}</small></span>${selo(m.status||'Ativo',STC[m.status||'Ativo'])}<span class="fr-acs">${pode()?lk('Editar','fr-pes-ed',F.cad+':'+m._id):''}${delBt(k,m._id)}</span></div>`; }).join(''):vazio('Ninguém cadastrado.'),
        {cont:xs.length,ac:pode()?bt(F.cad==='mot'?'+ Novo motorista':'+ Novo abastecedor','fr-novo',F.cad):''}); }
    if(F.cad==='tq') c=card('Tanque de diesel',`<div class="fr-fs fr-fs2">${campo('Capacidade do tanque (L)',`<input id="fr-cap" inputmode="numeric" value="${esc(F.cfg.cap||8000)}">`)}${campo('Avisar para pedir diesel com (L)',`<input id="fr-avi" inputmode="numeric" value="${esc(F.cfg.aviso||2000)}">`)}</div>
      <div class="fr-sv">O aviso aparece no Painel da frota e no Meu dia quando o saldo total chega nesse número.</div>${pode()?`<div class="fr-bts">${bt('Salvar','fr-cfg-ok')}</div>`:''}`,{ic:'ajuste'});
    if(F.cad==='imp'){ const I=F.imp;
      c=card('Trazer os dados do sistema antigo da frota',`<ol class="fr-steps"><li>No sistema antigo, abra <b>Configurações</b> e toque em <b>Baixar backup do servidor</b>.</li><li>Escolha aqui o arquivo <b>backup-frota-….json</b>.</li><li>Confira o que vai entrar e toque em <b>Gravar no painel</b>.</li></ol>
        <p class="fr-sv">Pode trazer de novo depois: o que já veio é atualizado, sem repetir. <b>Os usuários e senhas do sistema antigo não entram</b> — aqui cada pessoa entra com o login do painel.</p>
        ${pode()?`<label class="btn sec fr-file">Escolher o arquivo do backup<input type="file" accept=".json,application/json" id="fr-impf" hidden></label>`:''}
        ${I&&I.erro?`<div class="fr-msg crit">${esc(I.erro)}</div>`:''}
        ${I&&I.L?`<div class="fr-imp"><div class="fr-sv">Arquivo: <b>${esc(I.nome)}</b>${I.em?' · gerado em '+esc(br(String(I.em).slice(0,10))):''}</div><div class="fr-tw"><table class="fr-t"><thead><tr><th>O quê</th><th class="n">No arquivo</th><th class="n">Novos</th><th class="n">Já estavam (atualiza)</th></tr></thead><tbody>
          ${COLS.map(k=>{ const xs=I.L[k]||[], ja=xs.filter(x=>F[k].some(y=>y._id==='i'+x.id)).length; return `<tr><td>${esc({caminhoes:'Caminhões',motoristas:'Motoristas',abastecedores:'Abastecedores',abastecimentos:'Abastecimentos',compras:'Compras de diesel',manutencoes:'Manutenções'}[k])}</td><td class="n">${xs.length}</td><td class="n"><b>${xs.length-ja}</b></td><td class="n">${ja}</td></tr>`; }).join('')}</tbody></table></div>
          ${I.us?`<div class="fr-sv">${I.us} usuários do sistema antigo ficaram de fora (com senha).</div>`:''}
          <div class="fr-bts">${bt(I.st==='gravando'?'Gravando… '+(I.prog||''):'Gravar no painel','fr-imp-ok')}${bt('Cancelar','fr-imp-x',null,1)}</div></div>`:''}
        ${I&&I.st==='ok'?`<div class="fr-msg ok">Pronto: ${I.n} registros gravados.</div>`:''}`,{ic:'baixar'}); }
    return topo('CADASTROS','Cadastros da frota')+`<div class="fr-tabs">${ab.map(([k,t,n])=>`<button class="${F.cad===k?'on':''}" data-act="fr-cad" data-v="${k}">${t}${n!=null?` <span>${n}</span>`:''}</button>`).join('')}</div>`+c+gavetas(); }
  function gavetas(){ return F.dw==='abs'?gavAbs():F.dw==='cp'?gavCp():F.dw==='cam'?gavCam():F.dw==='man'?gavMan():F.dw==='mot'||F.dw==='aba'?gavPes(F.dw):''; }
  /* ---------- gravar (lógica do sistema antigo) ---------- */
  const faNovo=()=>{ const d=new Date(); return {data:hoje(),hora:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),caminhaoId:'',motoristaId:'',abastecedorId:'',kmCaminhao:'',litros:'',requisicao:'',totalizador:'',turno:d.getHours()<12?'Manha':d.getHours()<18?'Tarde':'Noite',tipoUso:'Caminhao'}; };
  async function absOk(){ const f=F.fa; if(!f||F.salv) return; const obr=[['data','a data'],['hora','a hora'],['caminhaoId','o caminhão'],['motoristaId','o motorista'],['abastecedorId','o abastecedor'],['kmCaminhao','o km'],['litros','os litros'],['totalizador','o totalizador'],['requisicao','a requisição']];
    const falta=obr.filter(([k])=>!String(f[k]||'').trim()).map(x=>x[1]); if(falta.length) return P.toast('Falta preencher: '+falta.join(', ')+'.');
    if(num(f.litros)<=0) return P.toast('Os litros precisam ser maiores que zero.');
    const cam=camDe(f.caminhaoId), mot=F.motoristas.find(m=>m._id===f.motoristaId), ab=F.abastecedores.find(m=>m._id===f.abastecedorId);
    const uT=ultTot(f._id); if(uT&&num(f.totalizador)<uT&&!f._id) return P.toast('O totalizador não pode ser menor que o último registrado ('+fN(uT,0)+'). Confira o número da bomba.');
    const kmU=cam?Math.max(0,...absDe(cam.placa).filter(a=>a._id!==f._id).map(a=>num(a.kmCaminhao))):0;
    if(kmU&&num(f.kmCaminhao)<kmU&&!confirm('O km ('+fN(num(f.kmCaminhao),0)+') está menor que o último deste caminhão ('+fN(kmU,0)+'). Salvar assim mesmo?')) return;
    const uso=cam?usoDoLocal(cam.localConsumo):f.tipoUso, s=saldo(), antes=f._id?num((F.abastecimentos.find(a=>a._id===f._id)||{}).litros):0, sl=(uso==='Trator/Outro'?s.T:s.C)+antes;
    if(num(f.litros)>sl&&!confirm('O saldo '+usoN(uso)+' do tanque é '+fL(sl)+' e o abastecimento é de '+fL(num(f.litros))+'. O saldo vai ficar negativo. Salvar assim mesmo?')) return;
    const o={data:f.data,hora:f.hora,caminhaoId:f.caminhaoId,placa:cam?cam.placa:'-',caminhao:cam?cam.modelo||'':'-',motoristaId:f.motoristaId,motorista:mot?mot.nome:'-',abastecedorId:f.abastecedorId,abastecedor:ab?ab.nome:'-',
      kmCaminhao:String(Math.round(num(f.kmCaminhao))),litros:num(f.litros),requisicao:String(f.requisicao).trim(),totalizador:String(Math.round(num(f.totalizador))),turno:f.turno,tipoUso:uso};
    F.salv=true; P.render(); try{ await grava('abastecimentos',f._id,o); P.toast(f._id?'Abastecimento corrigido.':'Abastecimento registrado: '+fL(o.litros)+' · '+o.placa+'.'); F.fa=faNovo(); F.dw=''; }catch(e){ P.erro(e); } F.salv=false; P.render(); }
  async function cpOk(){ const f=F.fc; if(!f||F.salv) return; const c=num(f.litrosCaminhoes), t=num(f.litrosTratores);
    if(!f.data||c+t<=0) return P.toast('Informe a data e pelo menos uma quantidade de diesel.');
    const s=saldo(), at=f._id?F.compras.find(x=>x._id===f._id):null, antes=at?num(at.litrosCaminhoes)+num(at.litrosTratores):0, cap=F.cfg.cap||8000;
    if(s.tot-antes+c+t>cap) return P.toast('A compra passa da capacidade do tanque ('+fL(cap)+'). Hoje ele tem '+fL(s.tot-antes)+' e cabem '+fL(Math.max(0,cap-s.tot+antes))+'.');
    F.salv=true; P.render(); try{ await grava('compras',f._id,{data:f.data,litrosCaminhoes:c,litrosTratores:t,observacao:String(f.observacao||'').trim()||'-'}); P.toast(f._id?'Compra corrigida.':'Compra lançada: '+fL(c+t)+'.'); F.fc=null; F.dw=''; }catch(e){ P.erro(e); } F.salv=false; P.render(); }
  const placaOk=p=>/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(p);
  async function camOk(){ const f=F.fk; if(!f||F.salv) return; const pl=String(f.placa||'').toUpperCase().replace(/\s/g,'');
    if(!placaOk(pl)) return P.toast('Placa inválida. Use o formato ABC-1234 ou ABC1D23.');
    const pn=pl.replace('-',''); if(vivos('caminhoes').some(c=>c._id!==f._id&&String(c.placa).toUpperCase().replace('-','')===pn)) return P.toast('Já existe um caminhão com a placa '+pl+'.');
    if(!String(f.modelo||'').trim()) return P.toast('Informe o modelo do caminhão.');
    const at=f._id?F.caminhoes.find(c=>c._id===f._id):null;
    F.salv=true; P.render(); try{ await grava('caminhoes',f._id,{placa:pl,modelo:String(f.modelo).trim(),kmAtual:String(Math.round(num(f.kmAtual))),status:f.status,localConsumo:f.localConsumo});
      if(at&&at.placa!==pl){ for(const a of vivos('abastecimentos').filter(a=>a.placa===at.placa)) await grava('abastecimentos',a._id,{placa:pl}); }
      P.toast(f._id?'Caminhão salvo.':'Caminhão '+pl+' cadastrado.'); F.fk=null; F.dw=''; }catch(e){ P.erro(e); } F.salv=false; P.render(); }
  const servDe=m=>Array.isArray(m.servicos)?m.servicos:String(m.servico||'').split(',').map(s=>s.trim()).filter(Boolean);
  async function manOk(){ const f=F.fm; if(!f||F.salv) return; if(!f.data||!f.caminhaoId||!String(f.km||'').trim()||!f.servicos.length) return P.toast('Informe a data, o caminhão, o km e pelo menos um serviço.');
    const c=camDe(f.caminhaoId); F.salv=true; P.render();
    try{ await grava('manutencoes',f._id,{data:f.data,caminhaoId:f.caminhaoId,caminhao:c?c.placa+' - '+(c.modelo||''):'-',km:String(Math.round(num(f.km))),servicos:f.servicos.slice(),servico:f.servicos.join(', '),observacao:String(f.observacao||'').trim()||'-'}); P.toast(f._id?'Manutenção corrigida.':'Manutenção registrada.'); F.fm=null; F.dw=''; }catch(e){ P.erro(e); } F.salv=false; P.render(); }
  const PER=[['hoje','Hoje'],['7d','7 dias'],['mes','Este mês'],['mesp','Mês passado'],['30d','30 dias'],['ano','Este ano'],['tudo','Tudo'],['datas','Escolher datas']];
  const TIPOS=[['resumo','Resumo'],['abs','Abastecimentos'],['veic','Consumo por veículo'],['comp','Compras de diesel'],['man','Manutenções']];
  function perDe(){ const r=F.rel, h=hoje(); const m1=h.slice(0,8)+'01';
    switch(r.per){ case 'hoje': return [h,h]; case '7d': return [addD(h,-6),h]; case '30d': return [addD(h,-29),h]; case 'ano': return [h.slice(0,4)+'-01-01',h];
      case 'mesp': { const a=addD(m1,-1); return [a.slice(0,8)+'01',a]; } case 'tudo': return ['0000-00-00','9999-99-99']; case 'datas': return [r.de||m1,r.ate||h]; default: return [m1,h]; } }
  function relDados(){ const [de,ate]=perDe(), cam=F.rel.cam?camDe(F.rel.cam):null, dentro=d=>{ d=dataN(d); return d>=de&&d<=ate; };
    const abs=ord(vivos('abastecimentos').filter(a=>dentro(a.data)&&(!cam||a.placa===cam.placa)));
    const comp=ord(vivos('compras').filter(c=>dentro(c.data))), man=ord(vivos('manutencoes').filter(m=>dentro(m.data)&&(!cam||m.caminhaoId===cam._id||String(m.caminhao||'').startsWith(cam.placa))));
    const lit=abs.reduce((s,a)=>s+num(a.litros),0), lC=abs.filter(a=>a.tipoUso!=='Trator/Outro').reduce((s,a)=>s+num(a.litros),0);
    const veic=(cam?[cam]:vivos('caminhoes')).map(c=>{ const xs=abs.filter(a=>a.placa===c.placa); if(!xs.length) return null; const ks=xs.map(a=>num(a.kmCaminhao)).filter(k=>k>0), m=media(c.placa,xs);
      return {c,n:xs.length,l:xs.reduce((s,a)=>s+num(a.litros),0),km:ks.length>1?Math.max(...ks)-Math.min(...ks):0,m:m?m.m:null}; }).filter(Boolean).sort((a,b)=>b.l-a.l);
    const kmT=veic.reduce((s,v)=>s+v.km,0), mm=veic.filter(v=>v.m), mG=mm.length?(()=>{ let k=0,l=0; mm.forEach(v=>{ const x=media(v.c.placa,abs.filter(a=>a.placa===v.c.placa)); if(x){ k+=x.km; l+=x.l; } }); return l?k/l:null; })():null;
    const dias=Math.round((new Date((ate>'9'?hoje():ate)+'T12:00')-new Date((de<'1'?(abs.length?dataN(abs[abs.length-1].data):hoje()):de)+'T12:00'))/864e5)+1, sem=dias>45;
    const g={}; abs.forEach(a=>{ const d=dataN(a.data), k=sem?(()=>{ const x=new Date(d+'T12:00'); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x.toISOString().slice(0,10); })():d; g[k]=(g[k]||0)+num(a.litros); });
    const serie=Object.keys(g).sort().slice(-31).map(k=>({t:(sem?'sem ':'')+br(k).slice(0,5),v:g[k]}));
    const cmp=comp.reduce((s,c)=>s+num(c.litrosCaminhoes)+num(c.litrosTratores),0);
    return {de,ate,cam,abs,comp,man,lit,lC,lT:lit-lC,veic,kmT,mG,serie,sem,cmp}; }
  const perTxt=R=>R.de<'1'?'Todo o período':R.de===R.ate?br(R.de):br(R.de)+' a '+br(R.ate);
  function relTabs(R){ return {
    abs:{t:'Abastecimentos',cols:['Data','Hora','Placa','Modelo','Motorista','Km','Litros','Uso','Totalizador','Requisição','Abastecedor'],rows:R.abs.map(a=>[br(dataN(a.data)),a.hora||'',a.placa||'',a.caminhao||'',a.motorista||'',num(a.kmCaminhao)||'',num(a.litros),usoN(a.tipoUso),num(a.totalizador)||'',a.requisicao||'',a.abastecedor||''])},
    veic:{t:'Consumo por veículo',cols:['Placa','Modelo','Abastecimentos','Litros','Km rodado','Média km/L'],rows:R.veic.map(v=>[v.c.placa,v.c.modelo||'',v.n,Math.round(v.l*100)/100,v.km,v.m?Math.round(v.m*100)/100:''])},
    comp:{t:'Compras de diesel',cols:['Data','COLAFIX (L)','FIXCOL (L)','Total (L)','Observação'],rows:R.comp.map(c=>[br(dataN(c.data)),num(c.litrosCaminhoes),num(c.litrosTratores),num(c.litrosCaminhoes)+num(c.litrosTratores),c.observacao&&c.observacao!=='-'?c.observacao:''])},
    man:{t:'Manutenções',cols:['Data','Caminhão','Km','Serviços','Observação'],rows:R.man.map(m=>[br(dataN(m.data)),m.caminhao||'',num(m.km)||'',servDe(m).map(servN).join(', '),m.observacao&&m.observacao!=='-'?m.observacao:''])} }; }
  async function relXls(){ const R=relDados(), T=relTabs(R), ks=F.rel.tipo==='resumo'?['veic','abs','comp','man']:[F.rel.tipo];
    if(!window.PainelXls) return P.toast('O gerador de Excel ainda está carregando. Tente de novo em instantes.');
    try{ await window.PainelXls.gerar('Frota-'+R.de+'-'+R.ate,ks.map(k=>[T[k].t,[T[k].cols].concat(T[k].rows)]),{tit:'Frota · '+(F.rel.tipo==='resumo'?'Relatório':T[F.rel.tipo].t),sub:perTxt(R),filtros:R.cam?['Caminhão: '+R.cam.placa]:[]}); }catch(e){ P.toast(String(e&&e.message||e)); } }
  async function relPdf(){ const R=relDados(), T=relTabs(R); if(!window.RHRel) return P.toast('O gerador de PDF ainda não carregou. Recarregue a página.');
    const ks=F.rel.tipo==='resumo'?['veic','comp','man']:[F.rel.tipo], larg={Data:12,Hora:8,Placa:11,Km:10,Litros:11,Uso:11};
    try{ await RHRel.pdf({tit:'Frota · '+(F.rel.tipo==='resumo'?'Resumo':T[F.rel.tipo].t),sub:perTxt(R),filtros:R.cam?['Caminhão: '+R.cam.placa]:[],arq:'Frota-'+R.de+'-'+R.ate,assina:'Responsável pela frota',kpiCols:3,
      kpis:[{t:'Abastecido',v:fL(R.lit),s:R.abs.length+' abastecimentos'},{t:'COLAFIX · FIXCOL',v:fL(R.lC)+' · '+fL(R.lT)},{t:'Diesel comprado',v:fL(R.cmp)},{t:'Km rodado',v:fN(R.kmT,0)+' km'},{t:'Média',v:R.mG?fN(R.mG,2)+' km/L':'-'},{t:'Manutenções',v:String(R.man.length)}],
      partes:ks.map(k=>({secao:T[k].t,cols:T[k].cols.map(c=>({t:c,w:larg[c]||Math.max(12,c.length*2.2)})),rows:T[k].rows.slice(0,800).map(r=>r.map(v=>typeof v==='number'?fN(v):v)),vazio:'Nada no período.'})) }); }catch(e){ P.toast(String(e&&e.message||e)); } }
  async function pesOk(t){ const fk=t==='mot'?'fp':'fb', k=t==='mot'?'motoristas':'abastecedores', f=F[fk]; if(!f||F.salv) return;
    const nome=String(f.nome||'').trim().replace(/\s+/g,' '); if(nome.length<2) return P.toast('Informe o nome.');
    if(vivos(k).some(m=>m._id!==f._id&&String(m.nome).toLowerCase()===nome.toLowerCase())) return P.toast(nome+' já está cadastrado.');
    const at=f._id?F[k].find(m=>m._id===f._id):null; F.salv=true; P.render();
    try{ const o={nome,status:f.status||'Ativo'}; if(t==='mot') o.matricula=String(f.matricula||'').trim(); await grava(k,f._id,o);
      if(at&&at.nome!==nome){ const ch=t==='mot'?'motorista':'abastecedor'; for(const a of vivos('abastecimentos').filter(a=>a[ch]===at.nome)) await grava('abastecimentos',a._id,{[ch]:nome}); }
      P.toast(f._id?'Salvo.':nome+' cadastrado.'); F[fk]=null; F.dw=''; }catch(e){ P.erro(e); } F.salv=false; P.render(); }
  /* backup do sistema antigo: {sistema:'frota-system', dados:{'frota-caminhoes':[...]…}} ou as listas direto */
  async function impLer(arq){ F.imp={nome:arq.name}; let j; try{ j=JSON.parse(await arq.text()); }catch(e){ F.imp.erro='Este arquivo não é um backup válido (não deu para ler o JSON).'; return P.render(); }
    const d=j&&j.dados||j||{}, pega=k=>Array.isArray(d['frota-'+k])?d['frota-'+k]:Array.isArray(d[k])?d[k]:[];
    const L={}; COLS.forEach(k=>{ L[k]=pega(k).filter(x=>x&&x.id!=null); });
    if(!COLS.some(k=>L[k].length)) { F.imp.erro='Não achei caminhões, abastecimentos nem compras neste arquivo. Confira se é o backup do sistema da frota.'; return P.render(); }
    F.imp.L=L; F.imp.em=j.geradoEm||''; F.imp.us=pega('usuarios').length; P.render(); }
  const iId=v=>v==null||v===''?'':'i'+v;
  function impNorm(k,x){ const o=Object.assign({},x); delete o.id; delete o.senha; o.idAntigo=x.id; o.imp=true;
    ['caminhaoId','motoristaId','abastecedorId'].forEach(c=>{ if(o[c]!=null&&o[c]!=='') o[c]=iId(o[c]); });
    if(o.data) o.data=dataN(o.data); if(k==='manutencoes'&&!Array.isArray(o.servicos)) o.servicos=servDe(o);
    Object.keys(o).forEach(c=>{ if(o[c]===undefined) delete o[c]; }); return o; }
  async function impOk(){ const I=F.imp; if(!I||!I.L||I.st==='gravando') return; if(!pode()) return P.toast('Seu acesso é só para ver.');
    I.st='gravando'; let n=0; const tot=COLS.reduce((s,k)=>s+I.L[k].length,0), agora=new Date().toISOString(); P.render();
    try{ for(const k of COLS){ const xs=I.L[k]; for(let i=0;i<xs.length;i+=400){ const fsx=window.claude&&window.claude._fs&&window.claude._fs(), lote=xs.slice(i,i+400).map(x=>[BASE+k+'/i'+x.id,Object.assign(impNorm(k,x),{impEm:agora,impPor:eu()})]);
        if(fsx&&fsx.batch){ const b=fsx.batch(); lote.forEach(([pt,o])=>b.set(fsx.doc(pt),o,{merge:true})); await b.commit(); } else { for(const [pt,o] of lote) await P.db().doc(pt).set(o,{merge:true}); } n+=Math.min(400,xs.length-i); I.prog=n+' de '+tot; P.render(); } }
      I.st='ok'; I.n=n; I.L=null; P.toast('Dados da frota trazidos: '+n+' registros.'); }catch(e){ I.st=''; I.erro='Parou no meio ('+n+' de '+tot+' gravados): '+(e&&e.message||e)+'. Pode escolher o arquivo de novo: o que já veio não repete.'; }
    P.render(); }
  /* ---------- registro ---------- */
  P.registrarModulo({ id:'frota', nome:'Frota', ic:'caminhao',
    telas:{ frota:{nome:'Painel',mob:'Frota',render:vPainel}, frotaabs:{nome:'Abastecimentos',render:vAbs}, frotatq:{nome:'Tanque',render:vTq}, frotacam:{nome:'Caminhões',render:vCam},
      frotaman:{nome:'Manutenções',render:vMan}, frotarel:{nome:'Relatórios',render:vRel}, frotacad:{nome:'Cadastros',render:vCad} },
    iniciar:()=>{ if(!P.dono()) carregar(); } });
  P.registrarAviso(()=>{ if(!lido()) return []; const s=saldo(), xs=[];
    if(s.C<0||s.T<0) xs.push({nivel:'crit',rotulo:'Frota',titulo:'Saldo negativo no tanque de diesel',texto:(s.C<0?'COLAFIX '+fL(s.C)+' ':'')+(s.T<0?'FIXCOL '+fL(s.T):'')+' · confira as compras lançadas',go:'frotatq'});
    else if(s.tot<=(F.cfg.aviso||2000)) xs.push({nivel:'warn',rotulo:'Frota',titulo:'Fazer novo pedido de diesel',texto:'O tanque está com '+fL(s.tot)+'.',go:'frotatq'});
    return xs; });

  /* ---------- eventos ---------- */
  const setF=(path,v)=>{ const [o,k]=path.split('.'); if(!F[o]) return; F[o][k]=v; };
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t) return;
    if(t.dataset&&t.dataset.fr){ setF(t.dataset.fr,t.value); return; }
    const bq={'fr-qa':'qa','fr-qc':'qc','fr-qm':'qm'}[t.id]; if(bq){ F[bq].q=t.value; const pos=t.selectionStart; P.render(); const x=document.getElementById(t.id); if(x){ x.focus(); try{ x.setSelectionRange(pos,pos); }catch(e){} } } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.dataset) return;
    if(t.dataset.fr){ setF(t.dataset.fr,t.value); if(t.dataset.fr==='fa.caminhaoId'){ const c=camDe(t.value); if(c){ const ks=absDe(c.placa).map(a=>num(a.kmCaminhao)).filter(k=>k>0); F.fa.kmCaminhao=String(ks.length?Math.max(...ks):num(c.kmAtual)||''); F.fa.tipoUso=usoDoLocal(c.localConsumo); } }
      if(t.tagName==='SELECT') P.render(); return; }
    if(t.dataset.frq){ const [o,k]=t.dataset.frq.split('.'); F[o][k]=t.value; P.render(); return; }
    if(t.id==='fr-impf'&&t.files&&t.files[0]) impLer(t.files[0]); });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&F.dw){ F.dw=''; P.render(); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="fr-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v;
    if(a!=='fr-del') F.del='';
    try{ switch(a){
      case 'fr-go': P.go(v); return;
      case 'fr-abs-ok': return absOk(); case 'fr-abs-x': F.fa=faNovo(); F.dw=''; break;
      case 'fr-abs-ed': { const x=F.abastecimentos.find(y=>y._id===v); if(!x) return; const cam=x.caminhaoId&&camDe(x.caminhaoId)||F.caminhoes.find(c=>c.placa===x.placa), m=x.motoristaId&&F.motoristas.find(y=>y._id===x.motoristaId)||F.motoristas.find(y=>y.nome===x.motorista), ab=x.abastecedorId&&F.abastecedores.find(y=>y._id===x.abastecedorId)||F.abastecedores.find(y=>y.nome===x.abastecedor);
        F.fa={_id:x._id,data:dataN(x.data),hora:x.hora||'',caminhaoId:cam?cam._id:'',motoristaId:m?m._id:'',abastecedorId:ab?ab._id:'',kmCaminhao:String(x.kmCaminhao||''),litros:String(num(x.litros)).replace('.',','),requisicao:String(x.requisicao||''),totalizador:String(x.totalizador||''),turno:x.turno||'Manha',tipoUso:x.tipoUso||'Caminhao'};
        F.dw='abs'; if(P.S.view!=='frotaabs') P.go('frotaabs'); else P.render(); return; }
      case 'fr-cp-ok': return cpOk(); case 'fr-cp-x': F.fc=null; F.dw=''; break;
      case 'fr-cp-ed': { const x=F.compras.find(y=>y._id===v); if(!x) return; F.fc={_id:x._id,data:dataN(x.data),litrosCaminhoes:String(num(x.litrosCaminhoes)).replace('.',','),litrosTratores:String(num(x.litrosTratores)).replace('.',','),observacao:x.observacao&&x.observacao!=='-'?x.observacao:''}; F.dw='cp'; break; }
      case 'fr-cam-ok': return camOk(); case 'fr-cam-x': F.fk=null; F.dw=''; break;
      case 'fr-cam-ed': { const x=F.caminhoes.find(y=>y._id===v); if(!x) return; F.fk={_id:x._id,placa:x.placa,modelo:x.modelo||'',kmAtual:String(x.kmAtual||''),status:x.status||'Ativo',localConsumo:x.localConsumo||'COLAFIX'}; F.dw='cam'; break; }
      case 'fr-cam-rel': F.rel.cam=v; F.rel.tipo='veic'; P.go('frotarel'); return;
      case 'fr-man-ok': return manOk(); case 'fr-man-x': F.fm=null; F.dw=''; break;
      case 'fr-man-sv': { const s=F.fm.servicos, i=s.indexOf(v); if(i<0) s.push(v); else s.splice(i,1); break; }
      case 'fr-man-ed': { const x=F.manutencoes.find(y=>y._id===v); if(!x) return; const c=x.caminhaoId&&camDe(x.caminhaoId)||F.caminhoes.find(c=>(c.placa+' - '+(c.modelo||''))===x.caminhao);
        F.fm={_id:x._id,data:dataN(x.data),caminhaoId:c?c._id:'',km:String(x.km||''),servicos:servDe(x).slice(),observacao:x.observacao&&x.observacao!=='-'?x.observacao:''}; F.dw='man'; break; }
      case 'fr-del': { if(F.del!==v){ F.del=v; break; } const [k,id]=v.split(':'); F.del=''; await apaga(k,id); P.toast('Apagado.'); break; }
      case 'fr-qa-x': F.qa={q:'',d:'',u:''}; break;
      case 'fr-qa-u': F.qa.u=v; break; case 'fr-qc-st': F.qc.st=v; break; case 'fr-qm-s': F.qm.s=v; break;
      case 'fr-dwx': F.dw=''; break;
      case 'fr-novo': { const fk={abs:'fa',cp:'fc',cam:'fk',man:'fm',mot:'fp',aba:'fb'}[v]; if(!fk) return; if(F[fk]&&F[fk]._id) F[fk]=null; if(v==='abs'&&!F.fa) F.fa=faNovo(); F.dw=v; break; }
      case 'fr-rel-per': F.rel.per=v; break; case 'fr-rel-tipo': F.rel.tipo=v; break;
      case 'fr-rel-xls': return relXls(); case 'fr-rel-pdf': return relPdf();
      case 'fr-cad': F.cad=v; break;
      case 'fr-pes-ok': return pesOk(v); case 'fr-pes-x': F[v==='mot'?'fp':'fb']=null; F.dw=''; break;
      case 'fr-pes-ed': { const [t,id]=v.split(':'), k=t==='mot'?'motoristas':'abastecedores', x=F[k].find(y=>y._id===id); if(!x) return; F[t==='mot'?'fp':'fb']={_id:x._id,nome:x.nome||'',matricula:x.matricula||'',status:x.status||'Ativo'}; F.dw=t; break; }
      case 'fr-cfg-ok': { const cap=Math.round(num(document.getElementById('fr-cap').value)), avi=Math.round(num(document.getElementById('fr-avi').value));
        if(cap<=0) return P.toast('Informe a capacidade do tanque.'); if(avi<0||avi>=cap) return P.toast('O aviso precisa ser menor que a capacidade.');
        await P.db().doc('frota/config').set({cap,aviso:avi,em:new Date().toISOString(),por:eu()},{merge:true}); F.cfg.cap=cap; F.cfg.aviso=avi; P.toast('Tanque salvo.'); break; }
      case 'fr-imp-ok': return impOk(); case 'fr-imp-x': F.imp=null; break;
    } }catch(e){ P.erro(e); } P.render(); });
  document.head.insertAdjacentHTML('beforeend',`<style id="fr-css">
  .fr-head{align-items:flex-end}.fr-ac{display:flex;gap:8px;flex-wrap:wrap}
  .fr-card{background:var(--pc-sup);border-radius:18px;box-shadow:var(--pc-sombra);padding:18px 20px;margin-bottom:16px;min-width:0}
  .fr-ch{display:flex;align-items:center;gap:10px;margin:0 0 12px}.fr-ch h3{margin:0;font-size:15px;font-weight:600}.fr-chi{display:inline-flex;width:30px;height:30px;border-radius:9px;align-items:center;justify-content:center;background:var(--pc-info-bg);color:var(--pc-info)}
  .fr-cont{font-size:12px;background:var(--pc-sup2);color:var(--pc-txt2);border-radius:999px;padding:2px 9px}.fr-chr{margin-left:auto;display:flex;gap:8px;align-items:center}
  .fr-mut{color:var(--pc-txt2)!important;font-size:12px}.fr-sv{color:var(--pc-txt2);font-size:13px;padding:6px 0}.fr-sv.ok{color:var(--pc-ok)}
  .fr-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.fr-g2b{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
  /* placa */
  .fr-pl{display:inline-flex;align-items:stretch;border:1.5px solid var(--pc-txt);border-radius:6px;overflow:hidden;font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1;background:var(--pc-sup);vertical-align:middle;flex:none}
  .fr-pl i{font-style:normal;font-size:8px;font-weight:700;background:#1e4fa8;color:#fff;padding:5px 3px;display:flex;align-items:center;letter-spacing:.5px}.fr-pl b{font-size:13px;font-weight:700;padding:4px 7px;letter-spacing:.8px;color:var(--pc-txt)}
  .fr-selo{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;background:var(--pc-sup2);color:var(--pc-txt2);white-space:nowrap}.fr-selo::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
  .fr-selo.ok{background:var(--pc-ok-bg);color:var(--pc-ok)}.fr-selo.warn{background:var(--pc-warn-bg);color:var(--pc-warn)}.fr-selo.crit{background:var(--pc-crit-bg);color:var(--pc-crit)}.fr-selo.info{background:var(--pc-info-bg);color:var(--pc-info)}.fr-msv .fr-selo::before{display:none}
  .fr-uso{font-size:11px;font-weight:600;letter-spacing:.4px;padding:3px 8px;border-radius:6px;white-space:nowrap}.fr-uso.c{background:#e3effb;color:#1b5a9c}.fr-uso.f{background:#e6f4e4;color:#2f7a2b}
  :root[data-theme="dark"] .fr-uso.c{background:#173350;color:#9cc8f2}:root[data-theme="dark"] .fr-uso.f{background:#1d3a1c;color:#9fd69b}
  /* herói do painel */
  .fr-hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:24px;background:linear-gradient(135deg,#0d2533 0%,#143f54 60%,#1b5068 100%);color:#fff;border-radius:22px;padding:24px 26px;margin-bottom:14px;box-shadow:0 10px 30px rgba(13,37,51,.18)}
  .fr-hk{font-size:11px;letter-spacing:1.4px;opacity:.7;font-weight:600}.fr-hv{display:flex;align-items:baseline;gap:6px;margin:6px 0 14px;flex-wrap:wrap}.fr-hv b{font-size:46px;font-weight:300;letter-spacing:-1px;line-height:1}.fr-hv span{font-size:20px;opacity:.8}.fr-hv em{font-style:normal;opacity:.65;margin-left:8px;font-size:14px}
  .fr-hst{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.08);font-size:13px}.fr-hst i{width:9px;height:9px;border-radius:50%;background:#5fd38d;box-shadow:0 0 0 4px rgba(95,211,141,.2)}.fr-hst.warn i{background:#ffbf47;box-shadow:0 0 0 4px rgba(255,191,71,.22)}.fr-hst.crit i{background:#ff6b6b;box-shadow:0 0 0 4px rgba(255,107,107,.22)}
  .fr-hst span{opacity:.75}.fr-hbt{margin-left:auto;border:0;background:#fff;color:#143f54;font:inherit;font-weight:600;border-radius:9px;padding:6px 12px;cursor:pointer}
  .fr-hr{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fr-ht{background:rgba(255,255,255,.08);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}.fr-ht[data-go]{cursor:pointer}.fr-ht[data-go]:hover{background:rgba(255,255,255,.13)}
  .fr-ht small{font-size:12px;opacity:.7}.fr-ht b{font-size:26px;font-weight:300}.fr-ht span{font-size:12px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fr-ht.w b{color:#ffcf73}
  .fr-tk{width:100%}.fr-tkb{position:relative;height:20px;border-radius:10px;background:var(--pc-sup2);display:flex;overflow:hidden}.fr-tk.fr-esc .fr-tkb{background:rgba(255,255,255,.12)}
  .fr-tkb i{display:block;height:100%}.fr-tkb i.c{background:#4ea3e0}.fr-tkb i.f{background:#7cc96f}.fr-tkb u{position:absolute;top:-3px;bottom:-3px;width:2px;background:#ffbf47;border-radius:2px}
  .fr-tkl{display:flex;gap:16px;flex-wrap:wrap;margin-top:9px;font-size:12px;color:var(--pc-txt2)}.fr-tk.fr-esc .fr-tkl{color:rgba(255,255,255,.8)}.fr-tkl span{display:inline-flex;align-items:center;gap:6px}.fr-tkl i{width:9px;height:9px;border-radius:3px;display:inline-block}.fr-tkl i.c{background:#4ea3e0}.fr-tkl i.f{background:#7cc96f}.fr-tkl i.v{background:var(--pc-linha)}.fr-tk.fr-esc .fr-tkl i.v{background:rgba(255,255,255,.25)}
  .fr-sl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--pc-linha);border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:var(--pc-sombra)}.fr-sl>div{background:var(--pc-sup);padding:12px 16px;display:flex;flex-direction:column}.fr-sl small{font-size:12px;color:var(--pc-txt2)}.fr-sl b{font-size:18px;font-weight:500}.fr-sl b.neg,.fr-neg{color:var(--pc-crit)}.fr-pos{color:var(--pc-ok)}
  /* números */
  .fr-nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}.fr-card .fr-nums{margin:16px 0 0}
  .fr-n{background:var(--pc-sup);border-radius:16px;padding:14px 16px;box-shadow:var(--pc-sombra);border:1px solid transparent}.fr-card .fr-n{box-shadow:none;background:var(--pc-sup2)}.fr-n[data-go]{cursor:pointer}
  .fr-n small{display:block;color:var(--pc-txt2);font-size:12px}.fr-n b{display:block;font-size:26px;font-weight:300;margin:4px 0 2px;letter-spacing:-.5px}.fr-n span{font-size:12px;color:var(--pc-txt2)}
  .fr-n.warn{border-color:var(--pc-warn);background:var(--pc-warn-bg)}.fr-n.crit{border-color:var(--pc-crit);background:var(--pc-crit-bg)}.fr-n.crit b{color:var(--pc-crit)}
  /* gráfico */
  .fr-bars{position:relative;display:flex;align-items:flex-end;gap:8px;height:190px;padding-top:6px}.fr-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0}
  .fr-bar i{display:block;width:72%;max-width:46px;background:var(--pc-info-bg);border-radius:8px 8px 3px 3px;min-height:3px}.fr-bar.hj i{background:var(--pc-pri)}
  .fr-bar em{font-style:normal;font-size:11px;color:var(--pc-txt2);white-space:nowrap;margin-bottom:4px}.fr-bar.hj em{color:var(--pc-txt);font-weight:600}.fr-bar small{font-size:11px;color:var(--pc-txt2);margin-top:6px;white-space:nowrap}.fr-bar.hj small{color:var(--pc-txt);font-weight:600}
  .fr-bmed{position:absolute;left:0;right:0;border-top:1.5px dashed var(--pc-warn);opacity:.8;pointer-events:none}.fr-bmed span{position:absolute;right:0;top:-17px;font-size:10px;color:var(--pc-warn);background:var(--pc-sup);padding:0 4px}
  .fr-rk{display:grid;grid-template-columns:22px auto minmax(0,1fr) minmax(60px,1.1fr) auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--pc-linha);font-size:13px}.fr-rk:first-of-type{border-top:0}
  .fr-rkn{color:var(--pc-txt2);font-size:12px;text-align:center}.fr-rkm{color:var(--pc-txt2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fr-rkb{height:8px;border-radius:5px;background:var(--pc-sup2)}.fr-rkb i{display:block;height:100%;border-radius:5px;background:var(--pc-pri)}
  .fr-rk.top .fr-rkb i{background:var(--pc-ok)}.fr-rk.low .fr-rkb i{background:var(--pc-warn)}.fr-rk b{font-weight:500;white-space:nowrap}
  .fr-mais{display:block;width:100%;margin-top:10px;border:0;background:var(--pc-sup2);color:var(--pc-txt);font:inherit;font-size:13px;padding:9px;border-radius:10px;cursor:pointer}.fr-mais:hover{background:var(--pc-info-bg)}
  .fr-mnr{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--pc-linha)}.fr-mnr:first-of-type{border-top:0}.fr-mnr>span:nth-child(2){flex:1;color:var(--pc-txt2);font-size:13px}
  /* listas */
  .fr-tool{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
  .fr-bus{display:flex;align-items:center;gap:8px;flex:1;min-width:240px;background:var(--pc-sup);border:1px solid var(--pc-linha);border-radius:12px;padding:0 12px;color:var(--pc-txt2)}.fr-bus input{border:0;outline:0;background:none;flex:1;min-height:40px;font:inherit;color:var(--pc-txt)}
  .fr-bus:focus-within{border-color:var(--pc-pri);box-shadow:0 0 0 3px var(--pc-foco)}
  .fr-dt,.fr-in select,.fr-in input{min-height:40px;padding:0 11px;border:1px solid var(--pc-linha);border-radius:12px;background:var(--pc-sup);color:var(--pc-txt);font:inherit}
  .fr-seg{display:inline-flex;flex-wrap:wrap;gap:2px;background:var(--pc-sup2);padding:3px;border-radius:12px}.fr-seg button{border:0;background:none;padding:7px 13px;border-radius:9px;cursor:pointer;color:var(--pc-txt2);font:inherit;font-size:13px}.fr-seg button.on{background:var(--pc-sup);color:var(--pc-txt);box-shadow:0 1px 3px rgba(0,0,0,.12);font-weight:600}
  .fr-dia{padding:6px 20px 10px}.fr-dh{display:flex;align-items:baseline;gap:10px;padding:10px 0 8px;border-bottom:1px solid var(--pc-linha)}.fr-dh b{font-size:15px}.fr-dh span{color:var(--pc-txt2);font-size:13px}.fr-dh em{margin-left:auto;font-style:normal;color:var(--pc-txt2);font-size:13px}
  .fr-ab{display:grid;grid-template-columns:52px minmax(130px,auto) minmax(0,1fr) repeat(3,minmax(60px,auto)) auto 92px auto;gap:14px;align-items:center;padding:11px 0;border-top:1px solid var(--pc-linha)}.fr-dh+.fr-ab{border-top:0}
  .fr-ab.cu{grid-template-columns:44px minmax(110px,auto) minmax(0,1fr) auto 84px}.fr-lc .fr-ab:first-of-type{border-top:0}
  .fr-abh{font-size:13px;color:var(--pc-txt2);font-variant-numeric:tabular-nums}.fr-abh small{display:block;font-size:11px}
  .fr-abp{display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:0}.fr-abp small,.fr-abm small{font-size:12px;color:var(--pc-txt2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
  .fr-abm{min-width:0;display:flex;flex-direction:column}.fr-abm b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fr-abk{font-size:13px;text-align:right;font-variant-numeric:tabular-nums}.fr-abk small{display:block;font-size:10px;color:var(--pc-txt2);text-transform:uppercase;letter-spacing:.5px}
  .fr-abl{font-size:16px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .fr-acs{white-space:nowrap;text-align:right}.fr-acs .lnk{margin-left:10px}.fr-crit{color:var(--pc-crit)!important;font-weight:600}
  .fr-cpr,.fr-mr,.fr-pr{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--pc-linha)}.fr-cpr:first-of-type,.fr-pr:first-of-type,.fr-dh+.fr-mr{border-top:0}
  .fr-mr{grid-template-columns:48px 230px minmax(0,1fr) auto}.fr-pr{grid-template-columns:auto minmax(0,1fr) auto auto}
  .fr-cpd{display:flex;flex-direction:column;align-items:center;background:var(--pc-sup2);border-radius:10px;padding:5px 0;line-height:1.1}.fr-cpd b{font-size:17px}.fr-cpd small{font-size:11px;color:var(--pc-txt2)}
  .fr-cpo,.fr-prn{display:flex;flex-direction:column;min-width:0}.fr-cpo small,.fr-prn small{font-size:12px;color:var(--pc-txt2)}.fr-prn b{font-weight:500}
  .fr-msv{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.fr-msv small{flex-basis:100%;color:var(--pc-txt2);font-size:12px}
  /* caminhões */
  .fr-cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;margin-bottom:16px}
  .fr-cc{background:var(--pc-sup);border-radius:18px;box-shadow:var(--pc-sombra);padding:16px 18px;display:flex;flex-direction:column;gap:10px;border-top:4px solid var(--pc-ok)}.fr-cc.warn{border-top-color:var(--pc-warn)}.fr-cc.crit{border-top-color:var(--pc-crit)}
  .fr-cc header{display:flex;justify-content:space-between;align-items:center;gap:8px}.fr-ccm{font-weight:500}.fr-ccm small{display:block;font-weight:400;font-size:12px;color:var(--pc-txt2)}
  .fr-ccn{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:var(--pc-sup2);border-radius:12px;padding:10px}.fr-ccn small{display:block;font-size:11px;color:var(--pc-txt2)}.fr-ccn b{font-size:14px;font-weight:600}.fr-ccn span{display:block;font-size:11px;color:var(--pc-txt2)}
  .fr-cc footer{margin-top:auto;display:flex;gap:14px;border-top:1px solid var(--pc-linha);padding-top:10px}.fr-cc footer .lnk:first-child{margin-right:auto}
  /* tanque */
  .fr-tqh{display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px;align-items:center}.fr-tqh>div:first-child{display:flex;flex-direction:column}.fr-tqh small{font-size:12px;color:var(--pc-txt2)}.fr-tqh b{font-size:34px;font-weight:300;letter-spacing:-.5px}.fr-tqh span{font-size:12px;color:var(--pc-txt2)}.fr-tqc .fr-tkb{height:26px;border-radius:13px}
  /* tabelas */
  .fr-tw{overflow-x:auto}.fr-t{width:100%;border-collapse:collapse;font-size:13px}.fr-t th{text-align:left;font-size:11px;font-weight:500;color:var(--pc-txt2);text-transform:uppercase;letter-spacing:.4px;padding:8px;border-bottom:1px solid var(--pc-linha);white-space:nowrap}
  .fr-t td{padding:9px 8px;border-bottom:1px solid var(--pc-linha);vertical-align:middle}.fr-t tr:last-child td{border-bottom:0}.fr-t td small{display:block;color:var(--pc-txt2);font-size:11px;margin-top:2px}.fr-t .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .fr-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 16px;border-bottom:1px solid var(--pc-linha)}.fr-tabs button{border:0;background:none;padding:10px 14px;cursor:pointer;color:var(--pc-txt2);font:inherit;border-bottom:2px solid transparent;margin-bottom:-1px}.fr-tabs button.on{color:var(--pc-txt);border-bottom-color:var(--pc-pri);font-weight:600}.fr-tabs button span{font-size:11px;background:var(--pc-sup2);border-radius:999px;padding:1px 7px;margin-left:4px}
  .fr-relf{align-items:flex-end}.fr-in{flex-direction:column}.fr-in>span{font-size:12px;color:var(--pc-txt2)}
  /* formulários e gaveta */
  .fr-f{display:flex;flex-direction:column;gap:5px;min-width:0}.fr-f>span{font-size:12px;color:var(--pc-txt2);font-weight:500}.fr-f>span em{font-style:normal;color:var(--pc-info);font-weight:400}
  .fr-f input,.fr-f select{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--pc-linha);border-radius:10px;background:var(--pc-sup);color:var(--pc-txt);font:inherit;font-size:14px;min-height:42px}
  .fr-f input:focus,.fr-f select:focus{outline:0;border-color:var(--pc-pri);box-shadow:0 0 0 3px var(--pc-foco)}.fr-f select:disabled{opacity:.7}
  .fr-fs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.fr-fs2{max-width:560px;margin-bottom:8px}.fr-f.w2{grid-column:1/-1}
  .fr-gp{margin-bottom:18px}.fr-gpt{font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--pc-txt2);margin-bottom:8px}
  .fr-bts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.fr-msg{margin:4px 0 12px;padding:10px 12px;border-radius:10px;font-size:13px;background:var(--pc-info-bg);color:var(--pc-txt)}.fr-msg.crit{background:var(--pc-crit-bg);color:var(--pc-crit)}.fr-msg.warn{background:var(--pc-warn-bg);color:var(--pc-warn)}.fr-msg.ok{background:var(--pc-ok-bg);color:var(--pc-ok)}
  .fr-chips{display:flex;gap:6px;flex-wrap:wrap}.fr-chip{border:1px solid var(--pc-linha);background:var(--pc-sup);border-radius:999px;padding:7px 13px;cursor:pointer;color:inherit;font:inherit;font-size:13px}.fr-chip.on{background:var(--pc-pri);border-color:var(--pc-pri);color:#fff}
  .fr-dwbg{position:fixed;inset:0;background:rgba(10,25,35,.38);z-index:900;animation:frFd .15s}
  .fr-dw{position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);background:var(--pc-sup);z-index:901;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(0,0,0,.18);animation:frIn .2s ease-out}
  .fr-dw header{display:flex;align-items:flex-start;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--pc-linha)}.fr-dw h2{margin:0;font-size:19px;font-weight:600}.fr-dw header p{margin:4px 0 0;color:var(--pc-txt2);font-size:13px}
  .fr-dwc{margin-left:auto;border:0;background:var(--pc-sup2);width:34px;height:34px;border-radius:10px;font-size:20px;cursor:pointer;color:var(--pc-txt)}
  .fr-dwb{flex:1;overflow:auto;padding:18px 22px}.fr-dw footer{display:flex;gap:8px;padding:14px 22px;border-top:1px solid var(--pc-linha);background:var(--pc-sup)}.fr-dw footer .btn:first-child{flex:1}
  @keyframes frIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}@keyframes frFd{from{opacity:0}}
  .fr-vz{display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 10px;color:var(--pc-txt2);text-align:center}.fr-vz svg{opacity:.5}.fr-vz b{color:var(--pc-txt);font-weight:500}.fr-vz span{font-size:13px}
  .fr-steps{margin:0 0 10px;padding-left:20px;line-height:1.8;font-size:14px}.fr-file{display:inline-flex;cursor:pointer;margin:6px 0}.fr-imp{margin-top:12px}
  @media (max-width:1100px){ .fr-ab{grid-template-columns:48px minmax(120px,auto) minmax(0,1fr) auto 84px auto}.fr-ab .fr-abk{display:none} }
  @media (max-width:900px){ .fr-hero,.fr-g2,.fr-g2b{grid-template-columns:1fr}.fr-sl{grid-template-columns:1fr 1fr} }
  @media (max-width:640px){ .fr-hero{padding:18px}.fr-hv b{font-size:38px}.fr-card{padding:14px}.fr-dia{padding:4px 14px 8px}
    .fr-ab,.fr-ab.cu{grid-template-columns:auto minmax(0,1fr) auto;row-gap:4px}.fr-abh{display:none}.fr-abm{grid-column:1/3;grid-row:2}.fr-ab .fr-uso{grid-column:3;grid-row:2;justify-self:end}.fr-abl{grid-column:3;grid-row:1}.fr-ab .fr-acs{grid-column:1/-1;text-align:left}.fr-ab .fr-acs .lnk{margin:0 14px 0 0}
    .fr-abp{flex-direction:row;align-items:center;gap:8px}.fr-mr{grid-template-columns:44px minmax(0,1fr)}.fr-mr .fr-msv,.fr-mr .fr-acs{grid-column:2}.fr-mr .fr-acs{text-align:left}.fr-mr .fr-acs .lnk{margin:0 14px 0 0}
    .fr-tqh{grid-template-columns:1fr}.fr-rk{grid-template-columns:18px auto minmax(0,1fr) auto}.fr-rkb{display:none}.fr-pr{grid-template-columns:auto minmax(0,1fr) auto}.fr-pr .fr-acs{grid-column:2/-1;text-align:left}.fr-pr .fr-acs .lnk{margin:0 14px 0 0}
    .fr-t thead{display:none}.fr-t tr{display:block;border-bottom:1px solid var(--pc-linha);padding:8px 0}.fr-t td{display:flex;justify-content:space-between;gap:10px;border:0;padding:3px 0;text-align:right}.fr-t td[data-r]::before{content:attr(data-r);color:var(--pc-txt2);font-size:12px;text-align:left}.fr-t td small{display:inline;margin-left:6px} }
  </style>`);
})();
