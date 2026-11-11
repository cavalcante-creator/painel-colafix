/* Frota (11/11/2026): o sistema da frota (caminhões, motoristas, abastecimentos, tanque de diesel, manutenções e relatórios)
   dentro do painel. Antes era um sistema à parte (React + servidor próprio, login e senha próprios).
   Dados em frota/dados/<caminhoes|motoristas|abastecedores|abastecimentos|compras|manutencoes> e frota/config {cap, aviso}.
   Quem vê: quem tem o módulo "frota" (e a administradora). Regras: match /frota/** (frotaOk). Apagar = removido:true.
   Uso do diesel: tipoUso 'Caminhao' = COLAFIX · 'Trator/Outro' = FIXCOL (os mesmos valores do sistema antigo, para importar o backup). */
if(typeof P==='object'&&P&&!P.caminhao) P.caminhao='<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>';
(function(){ const P=window.Painel; if(!P) return;
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

  /* ---------- peças ---------- */
  const topo=(ey,tit,sub,ac)=>`<div class="head"><div><div class="eyebrow">FROTA · ${esc(ey)}</div><h1>${esc(tit)}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>${ac?`<div class="fr-ac">${ac}</div>`:''}</div>`;
  const pill=(t,tom)=>`<span class="pill ${tom||''}">${esc(t)}</span>`;
  const bt=(t,act,v,sec,extra)=>`<button class="btn${sec?' sec':''}" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:''}${extra||''}>${t}</button>`;
  const lk=(t,act,v,cls)=>`<button class="lnk ${cls||''}" data-act="${act}" data-v="${esc(v)}">${t}</button>`;
  const delBt=(k,id)=>pode()?(F.del===k+':'+id?lk('Confirmar: apagar','fr-del',k+':'+id,'fr-crit'):lk('Apagar','fr-del',k+':'+id,'fr-mut')):'';
  const campo=(r,html,cls)=>`<label class="fr-f ${cls||''}"><span>${r}</span>${html}</label>`;
  const inp=(f,k,v,tp,ex)=>`<input data-fr="${f}.${k}" type="${tp||'text'}" value="${esc(v==null?'':v)}"${ex||''}>`;
  const sel=(f,k,v,ops,ex)=>`<select data-fr="${f}.${k}"${ex||''}>${ops.map(o=>{ const [val,t]=Array.isArray(o)?o:[o,o]; return `<option value="${esc(val)}"${String(val)===String(v==null?'':v)?' selected':''}>${esc(t)}</option>`; }).join('')}</select>`;
  const vazio=t=>`<div class="empty">${esc(t)}</div>`;
  const carregando=()=>`<section class="card">${vazio('Carregando os dados da frota…')}</section>`;
  const nums=xs=>`<div class="fr-nums">${xs.map(x=>`<div class="fr-n ${x.tom||''}"${x.go?` data-go="${x.go}" role="button"`:''}><small>${esc(x.r)}</small><b>${x.v}</b>${x.s?`<span>${x.s}</span>`:''}</div>`).join('')}</div>`;
  const barras=(xs,un)=>{ const mx=Math.max(1,...xs.map(x=>x.v)); return xs.length?`<div class="fr-bars">${xs.map(x=>`<div class="fr-bar" title="${esc(x.t+': '+fN(x.v)+' '+(un||''))}"><em>${x.v?fN(x.v,0):''}</em><i style="height:${Math.round(x.v/mx*100)}%"></i><small>${esc(x.t)}</small></div>`).join('')}</div>`:vazio('Nada no período.'); };
  const hbar=(xs,fmt)=>{ const mx=Math.max(1,...xs.map(x=>x.v)); return xs.map(x=>`<div class="fr-hb"><span>${esc(x.t)}</span><div><i style="width:${Math.max(2,Math.round(x.v/mx*100))}%"></i></div><b>${fmt?fmt(x.v):fN(x.v)}</b></div>`).join(''); };

  /* ---------- Painel ---------- */
  function vPainel(){ carregar(); if(!lido()) return topo('PAINEL','Frota')+carregando();
    const s=saldo(), cams=vivos('caminhoes'), at=cams.filter(c=>(c.status||'Ativo')==='Ativo'), mn=cams.filter(c=>c.status==='Manutencao');
    const abs=vivos('abastecimentos'), hj=hoje(), lHj=abs.filter(a=>dataN(a.data)===hj).reduce((t,a)=>t+num(a.litros),0);
    const dias=[]; for(let i=6;i>=0;i--){ const d=addD(hj,-i); dias.push({t:br(d).slice(0,5),v:abs.filter(a=>dataN(a.data)===d).reduce((t,a)=>t+num(a.litros),0)}); }
    const pct=Math.max(0,Math.min(100,Math.round(s.tot/(F.cfg.cap||8000)*100))), baixo=s.tot<=(F.cfg.aviso||2000);
    const rk=cams.map(c=>({c,m:media(c.placa)})).filter(x=>x.m).sort((a,b)=>b.m.m-a.m.m);
    const ult=ord(abs).slice(0,8);
    return topo('PAINEL','Frota','Caminhões, diesel e manutenções · '+br(hj),pode()?bt('+ Abastecimento','fr-go','frotaabs')+bt('+ Compra de diesel','fr-go','frotatq',1):'')+
    (s.C<0||s.T<0?`<section class="card fr-alerta crit"><b>Saldo negativo no tanque</b><span>${s.C<0?'COLAFIX está com '+fL(s.C)+'. ':''}${s.T<0?'FIXCOL está com '+fL(s.T)+'. ':''}Confira se alguma compra de diesel não foi lançada.</span><button class="btn sec" data-go="frotatq">Abrir o tanque</button></section>`:
     baixo?`<section class="card fr-alerta warn"><b>Fazer novo pedido de diesel</b><span>O tanque está com ${fL(s.tot)} (aviso em ${fL(F.cfg.aviso||2000)}). Cabem ${fL(Math.max(0,(F.cfg.cap||8000)-s.tot))}.</span><button class="btn sec" data-go="frotatq">Lançar compra</button></section>`:'')+
    nums([{r:'Caminhões ativos',v:at.length,s:'de '+cams.length+' cadastrados',go:'frotacam'},{r:'Abastecido hoje',v:fL(lHj),s:abs.filter(a=>dataN(a.data)===hj).length+' abastecimentos',go:'frotaabs'},
      {r:'Saldo no tanque',v:fL(s.tot),s:pct+'% de '+fL(F.cfg.cap||8000),tom:baixo?'warn':'',go:'frotatq'},{r:'Saldo COLAFIX',v:fL(s.C),tom:s.C<0?'crit':'',go:'frotatq'},{r:'Saldo FIXCOL',v:fL(s.T),tom:s.T<0?'crit':'',go:'frotatq'}])+
    `<div class="fr-g2"><section class="card"><div class="label">CONSUMO NOS ÚLTIMOS 7 DIAS (L)</div>${barras(dias,'L')}</section>
      <section class="card"><div class="label">TANQUE</div><div class="fr-tq"><div class="fr-tqb"><i style="height:${pct}%" class="${baixo?'warn':''}"></i><b>${pct}%</b></div>
        <div>${hbar([{t:'COLAFIX',v:Math.max(0,s.C)},{t:'FIXCOL',v:Math.max(0,s.T)}],fL)}<div class="sub" style="margin-top:8px">Consumo total: COLAFIX ${fL(s.uC)} · FIXCOL ${fL(s.uT)}<br>Diesel comprado: ${fL(s.cC+s.cT)}</div></div></div></section></div>
    <div class="fr-g2"><section class="card"><div class="label">MÉDIA DOS CAMINHÕES (km/L)</div>${rk.length?hbar(rk.slice(0,10).map(x=>({t:camTxt(x.c),v:x.m.m})),v=>fN(v,2)+' km/L'):vazio('A média aparece depois de 2 abastecimentos com km de cada caminhão.')}</section>
      <section class="card"><div class="label">EM MANUTENÇÃO</div>${mn.length?mn.map(c=>`<div class="row"><b>${esc(camTxt(c))}</b>${pill('Manutenção','warn')}</div>`).join(''):vazio('Nenhum caminhão em manutenção.')}
        <div class="sub" style="margin-top:10px">${vivos('manutencoes').length} manutenções registradas · <button class="lnk" data-go="frotaman">ver</button></div></section></div>
    <section class="card"><div class="label">ÚLTIMOS ABASTECIMENTOS</div>${ult.length?tabAbs(ult,true):vazio('Nenhum abastecimento ainda.')}</section>`; }

  /* ---------- Abastecimentos ---------- */
  const faNovo=()=>{ const d=new Date(); return {data:hoje(),hora:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),caminhaoId:'',motoristaId:'',abastecedorId:'',kmCaminhao:'',litros:'',requisicao:'',totalizador:'',turno:d.getHours()<12?'Manha':d.getHours()<18?'Tarde':'Noite',tipoUso:'Caminhao'}; };
  function tabAbs(xs,curto){ return `<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Caminhão</th><th>Motorista</th><th class="n">Km</th><th class="n">Litros</th><th>Uso</th>${curto?'':'<th class="n">Totalizador</th><th>Requisição</th><th>Abastecedor</th><th></th>'}</tr></thead><tbody>${xs.map(a=>`<tr>
      <td data-r="Data">${br(dataN(a.data))}<small>${esc(a.hora||'')}${a.turno?' · '+esc(a.turno==='Manha'?'Manhã':a.turno):''}</small></td><td data-r="Caminhão"><b>${esc(a.placa||'-')}</b><small>${esc(a.caminhao||'')}</small></td><td data-r="Motorista">${esc(a.motorista||'-')}</td>
      <td class="n" data-r="Km">${a.kmCaminhao?fN(num(a.kmCaminhao),0):'-'}</td><td class="n" data-r="Litros"><b>${fL(num(a.litros))}</b></td><td data-r="Uso">${usoN(a.tipoUso)}</td>
      ${curto?'':`<td class="n" data-r="Totalizador">${a.totalizador?fN(num(a.totalizador),0):'-'}</td><td data-r="Requisição">${esc(a.requisicao||'-')}</td><td data-r="Abastecedor">${esc(a.abastecedor||'-')}</td>
      <td class="fr-acs">${pode()?lk('Editar','fr-abs-ed',a._id):''}${delBt('abastecimentos',a._id)}</td>`}</tr>`).join('')}</tbody></table></div>`; }
  function vAbs(){ carregar(); if(!lido()) return topo('ABASTECIMENTOS','Abastecimentos')+carregando();
    const f=F.fa||(F.fa=faNovo()), ed=f._id, cam=camDe(f.caminhaoId), uT=ultTot(ed), kmU=cam?Math.max(0,...absDe(cam.placa).filter(a=>a._id!==ed).map(a=>num(a.kmCaminhao))):0;
    const tot=num(f.totalizador), kmV=num(f.kmCaminhao);
    const form=!pode()?'':`<section class="card fr-form${ed?' fr-ed':''}"><div class="label">${ed?'CORRIGIR ABASTECIMENTO':'NOVO ABASTECIMENTO'}</div><div class="fr-fs">
      ${campo('Data',inp('fa','data',f.data,'date'))}${campo('Hora',inp('fa','hora',f.hora,'time'))}
      ${campo('Caminhão',sel('fa','caminhaoId',f.caminhaoId,[['','Escolha']].concat(vivos('caminhoes').map(c=>[c._id,camTxt(c)]))),'w2')}
      ${campo('Motorista',sel('fa','motoristaId',f.motoristaId,[['','Escolha']].concat(vivos('motoristas').filter(m=>(m.status||'Ativo')==='Ativo'||m._id===f.motoristaId).map(m=>[m._id,m.nome+(m.matricula?' · '+m.matricula:'')]))),'w2')}
      ${campo('Abastecedor',sel('fa','abastecedorId',f.abastecedorId,[['','Escolha']].concat(vivos('abastecedores').filter(m=>(m.status||'Ativo')==='Ativo'||m._id===f.abastecedorId).map(m=>[m._id,m.nome]))),'w2')}
      ${campo('Km do caminhão'+(kmU?` <em>último: ${fN(kmU,0)}</em>`:''),inp('fa','kmCaminhao',f.kmCaminhao,'text',' inputmode="numeric"'))}
      ${campo('Litros',inp('fa','litros',f.litros,'text',' inputmode="decimal" placeholder="0,0"'))}
      ${campo('Totalizador da bomba'+(uT?` <em>último: ${fN(uT,0)}</em>`:''),inp('fa','totalizador',f.totalizador,'text',' inputmode="numeric"'))}
      ${campo('Requisição',inp('fa','requisicao',f.requisicao,'text',' inputmode="numeric"'))}
      ${campo('Turno',sel('fa','turno',f.turno,[['Manha','Manhã'],'Tarde','Noite']))}
      ${campo('Uso do diesel',sel('fa','tipoUso',cam?usoDoLocal(cam.localConsumo):f.tipoUso,[['Caminhao','COLAFIX'],['Trator/Outro','FIXCOL']],cam?' disabled':''))}</div>
      ${uT&&tot&&tot<uT?`<div class="fr-msg ${ed?'warn':'crit'}">O totalizador (${fN(tot,0)}) está menor que o último registrado (${fN(uT,0)}).${ed?' Como é uma correção, dá para salvar.':' Confira o número da bomba.'}</div>`:''}
      ${kmU&&kmV&&kmV<kmU?`<div class="fr-msg warn">O km (${fN(kmV,0)}) está menor que o último deste caminhão (${fN(kmU,0)}).</div>`:''}
      <div class="fr-bts">${bt(F.salv?'Salvando…':ed?'Salvar correção':'Registrar abastecimento','fr-abs-ok')}${ed?bt('Cancelar','fr-abs-x',null,1):''}</div></section>`;
    const q=F.qa, t=q.q.toLowerCase();
    const xs=ord(vivos('abastecimentos').filter(a=>(!q.d||dataN(a.data)===q.d)&&(!q.u||a.tipoUso===q.u)&&(!t||[a.placa,a.caminhao,a.motorista,a.abastecedor,a.requisicao].join(' ').toLowerCase().includes(t))));
    return topo('ABASTECIMENTOS','Abastecimentos','Cada abastecimento sai do saldo do tanque (COLAFIX ou FIXCOL).')+form+
    `<section class="card"><div class="fr-fil"><input id="fr-qa" type="search" placeholder="Buscar placa, motorista, abastecedor ou requisição" value="${esc(q.q)}">
      <input type="date" data-frq="qa.d" value="${esc(q.d)}"><select data-frq="qa.u"><option value="">Todos os usos</option><option value="Caminhao"${q.u==='Caminhao'?' selected':''}>COLAFIX</option><option value="Trator/Outro"${q.u==='Trator/Outro'?' selected':''}>FIXCOL</option></select>
      ${q.q||q.d||q.u?lk('Limpar filtros','fr-qa-x',''):''}<span class="sub">${xs.length} abastecimentos · ${fL(xs.reduce((s,a)=>s+num(a.litros),0))}</span></div>
      ${xs.length?tabAbs(xs.slice(0,300))+(xs.length>300?`<div class="sub">Mostrando os 300 mais recentes. Use os filtros ou os Relatórios para ver o resto.</div>`:''):vazio('Nenhum abastecimento encontrado.')}</section>`; }
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
    F.salv=true; P.render(); try{ await grava('abastecimentos',f._id,o); P.toast(f._id?'Abastecimento corrigido.':'Abastecimento registrado: '+fL(o.litros)+' · '+o.placa+'.'); F.fa=faNovo(); }catch(e){ P.erro(e); } F.salv=false; P.render(); }

  /* ---------- Tanque ---------- */
  function vTq(){ carregar(); if(!lido()) return topo('TANQUE','Tanque de diesel')+carregando();
    const s=saldo(), cap=F.cfg.cap||8000, f=F.fc||(F.fc={data:hoje(),litrosCaminhoes:'',litrosTratores:'',observacao:''}), ed=f._id;
    const mov=[]; vivos('compras').forEach(c=>mov.push({d:dataN(c.data),h:'00:00',t:'Entrada · compra',o:c.observacao&&c.observacao!=='-'?c.observacao:'',C:num(c.litrosCaminhoes),T:num(c.litrosTratores)}));
    vivos('abastecimentos').forEach(a=>{ const l=num(a.litros); mov.push({d:dataN(a.data),h:a.hora||'00:00',t:'Saída · abastecimento',o:(a.placa||'')+(a.requisicao?' · req. '+a.requisicao:''),C:a.tipoUso==='Trator/Outro'?0:-l,T:a.tipoUso==='Trator/Outro'?-l:0}); });
    mov.sort((a,b)=>(a.d+a.h).localeCompare(b.d+b.h)); let run=0; mov.forEach(m=>{ run+=m.C+m.T; m.s=run; }); mov.reverse();
    const pct=Math.max(0,Math.min(100,Math.round(s.tot/cap*100)));
    return topo('TANQUE','Tanque de diesel','Capacidade '+fL(cap)+' · aviso para pedir diesel em '+fL(F.cfg.aviso||2000)+' · '+lk('mudar','fr-go','frotacad')+'')+
    nums([{r:'Saldo total',v:fL(s.tot),s:pct+'% do tanque · cabem '+fL(Math.max(0,cap-s.tot)),tom:s.tot<=(F.cfg.aviso||2000)?'warn':''},{r:'Saldo COLAFIX',v:fL(s.C),s:'comprado '+fL(s.cC)+' · usado '+fL(s.uC),tom:s.C<0?'crit':''},{r:'Saldo FIXCOL',v:fL(s.T),s:'comprado '+fL(s.cT)+' · usado '+fL(s.uT),tom:s.T<0?'crit':''}])+
    (pode()?`<section class="card fr-form${ed?' fr-ed':''}"><div class="label">${ed?'CORRIGIR COMPRA':'COMPRA DE DIESEL'}</div><div class="fr-fs">${campo('Data',inp('fc','data',f.data,'date'))}
      ${campo('Litros para COLAFIX',inp('fc','litrosCaminhoes',f.litrosCaminhoes,'text',' inputmode="decimal"'))}${campo('Litros para FIXCOL',inp('fc','litrosTratores',f.litrosTratores,'text',' inputmode="decimal"'))}
      ${campo('Observação (nota, fornecedor…)',inp('fc','observacao',f.observacao),'w2')}</div><div class="fr-bts">${bt(F.salv?'Salvando…':ed?'Salvar correção':'Lançar compra','fr-cp-ok')}${ed?bt('Cancelar','fr-cp-x',null,1):''}</div></section>`:'')+
    `<div class="fr-g2"><section class="card"><div class="label">COMPRAS</div>${vivos('compras').length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th class="n">COLAFIX</th><th class="n">FIXCOL</th><th class="n">Total</th><th>Observação</th><th></th></tr></thead><tbody>${ord(vivos('compras')).map(c=>`<tr><td data-r="Data">${br(dataN(c.data))}</td><td class="n" data-r="COLAFIX">${fL(num(c.litrosCaminhoes))}</td><td class="n" data-r="FIXCOL">${fL(num(c.litrosTratores))}</td><td class="n" data-r="Total"><b>${fL(num(c.litrosCaminhoes)+num(c.litrosTratores))}</b></td><td data-r="Obs.">${esc(c.observacao&&c.observacao!=='-'?c.observacao:'')}</td><td class="fr-acs">${pode()?lk('Editar','fr-cp-ed',c._id):''}${delBt('compras',c._id)}</td></tr>`).join('')}</tbody></table></div>`:vazio('Nenhuma compra lançada.')}</section>
    <section class="card"><div class="label">EXTRATO DO TANQUE</div>${mov.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Movimento</th><th class="n">COLAFIX</th><th class="n">FIXCOL</th><th class="n">Saldo</th></tr></thead><tbody>${mov.slice(0,200).map(m=>`<tr><td data-r="Data">${br(m.d)}${m.h!=='00:00'?`<small>${esc(m.h)}</small>`:''}</td><td data-r="Movimento">${esc(m.t)}<small>${esc(m.o)}</small></td><td class="n ${m.C<0?'fr-neg':m.C>0?'fr-pos':''}" data-r="COLAFIX">${m.C?(m.C>0?'+':'')+fN(m.C):''}</td><td class="n ${m.T<0?'fr-neg':m.T>0?'fr-pos':''}" data-r="FIXCOL">${m.T?(m.T>0?'+':'')+fN(m.T):''}</td><td class="n" data-r="Saldo"><b>${fL(m.s)}</b></td></tr>`).join('')}</tbody></table></div>${mov.length>200?'<div class="sub">Mostrando os 200 últimos movimentos.</div>':''}`:vazio('Sem movimentos.')}</section></div>`; }
  async function cpOk(){ const f=F.fc; if(!f||F.salv) return; const c=num(f.litrosCaminhoes), t=num(f.litrosTratores);
    if(!f.data||c+t<=0) return P.toast('Informe a data e pelo menos uma quantidade de diesel.');
    const s=saldo(), at=f._id?F.compras.find(x=>x._id===f._id):null, antes=at?num(at.litrosCaminhoes)+num(at.litrosTratores):0, cap=F.cfg.cap||8000;
    if(s.tot-antes+c+t>cap) return P.toast('A compra passa da capacidade do tanque ('+fL(cap)+'). Hoje ele tem '+fL(s.tot-antes)+' e cabem '+fL(Math.max(0,cap-s.tot+antes))+'.');
    F.salv=true; P.render(); try{ await grava('compras',f._id,{data:f.data,litrosCaminhoes:c,litrosTratores:t,observacao:String(f.observacao||'').trim()||'-'}); P.toast(f._id?'Compra corrigida.':'Compra lançada: '+fL(c+t)+'.'); F.fc=null; }catch(e){ P.erro(e); } F.salv=false; P.render(); }

  /* ---------- Caminhões ---------- */
  const placaOk=p=>/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(p);
  function vCam(){ carregar(); if(!lido()) return topo('CAMINHÕES','Caminhões')+carregando();
    const f=F.fk||(F.fk={placa:'',modelo:'',kmAtual:'',status:'Ativo',localConsumo:'COLAFIX'}), ed=f._id, q=F.qc, t=q.q.toLowerCase();
    const xs=vivos('caminhoes').filter(c=>(!q.st||(c.status||'Ativo')===q.st)&&(!t||(c.placa+' '+(c.modelo||'')).toLowerCase().includes(t))).sort((a,b)=>String(a.placa).localeCompare(String(b.placa)));
    return topo('CAMINHÕES','Caminhões','A média (km/L) e o km atual vêm dos abastecimentos.')+
    (pode()?`<section class="card fr-form${ed?' fr-ed':''}"><div class="label">${ed?'EDITAR CAMINHÃO':'NOVO CAMINHÃO'}</div><div class="fr-fs">${campo('Placa',inp('fk','placa',f.placa,'text',' placeholder="ABC-1234" maxlength="8" style="text-transform:uppercase"'))}
      ${campo('Modelo',inp('fk','modelo',f.modelo),'w2')}${campo('Km atual',inp('fk','kmAtual',f.kmAtual,'text',' inputmode="numeric"'))}
      ${campo('Situação',sel('fk','status',f.status,['Ativo',['Manutencao','Manutenção'],'Parado']))}${campo('Diesel sai de',sel('fk','localConsumo',f.localConsumo,['COLAFIX','FIXCOL']))}</div>
      <div class="fr-bts">${bt(F.salv?'Salvando…':ed?'Salvar':'Cadastrar caminhão','fr-cam-ok')}${ed?bt('Cancelar','fr-cam-x',null,1):''}</div></section>`:'')+
    `<section class="card"><div class="fr-fil"><input id="fr-qc" type="search" placeholder="Buscar placa ou modelo" value="${esc(q.q)}"><select data-frq="qc.st"><option value="">Todas as situações</option>${['Ativo','Manutencao','Parado'].map(s=>`<option value="${s}"${q.st===s?' selected':''}>${stN(s)}</option>`).join('')}</select><span class="sub">${xs.length} caminhões</span></div>
      ${xs.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Placa</th><th>Modelo</th><th>Situação</th><th>Diesel</th><th class="n">Km atual</th><th class="n">Média</th><th>Último abastecimento</th><th></th></tr></thead><tbody>${xs.map(c=>{ const m=media(c.placa), u=ord(absDe(c.placa))[0];
        return `<tr><td data-r="Placa"><b>${esc(c.placa)}</b></td><td data-r="Modelo">${esc(c.modelo||'')}</td><td data-r="Situação">${pill(stN(c.status),STC[c.status||'Ativo'])}</td><td data-r="Diesel">${esc(c.localConsumo||'COLAFIX')}</td><td class="n" data-r="Km atual">${fN(kmDe(c),0)}</td>
        <td class="n" data-r="Média"><b>${m?fN(m.m,2)+' km/L':'a calcular'}</b></td><td data-r="Último">${u?br(dataN(u.data))+' · '+fL(num(u.litros)):'-'}</td><td class="fr-acs">${lk('Relatório','fr-cam-rel',c._id)}${pode()?lk('Editar','fr-cam-ed',c._id):''}${delBt('caminhoes',c._id)}</td></tr>`; }).join('')}</tbody></table></div>`:vazio('Nenhum caminhão.')}</section>`; }
  async function camOk(){ const f=F.fk; if(!f||F.salv) return; const pl=String(f.placa||'').toUpperCase().replace(/\s/g,'');
    if(!placaOk(pl)) return P.toast('Placa inválida. Use o formato ABC-1234 ou ABC1D23.');
    const pn=pl.replace('-',''); if(vivos('caminhoes').some(c=>c._id!==f._id&&String(c.placa).toUpperCase().replace('-','')===pn)) return P.toast('Já existe um caminhão com a placa '+pl+'.');
    if(!String(f.modelo||'').trim()) return P.toast('Informe o modelo do caminhão.');
    const at=f._id?F.caminhoes.find(c=>c._id===f._id):null;
    F.salv=true; P.render(); try{ await grava('caminhoes',f._id,{placa:pl,modelo:String(f.modelo).trim(),kmAtual:String(Math.round(num(f.kmAtual))),status:f.status,localConsumo:f.localConsumo});
      if(at&&at.placa!==pl){ for(const a of vivos('abastecimentos').filter(a=>a.placa===at.placa)) await grava('abastecimentos',a._id,{placa:pl}); }
      P.toast(f._id?'Caminhão salvo.':'Caminhão '+pl+' cadastrado.'); F.fk=null; }catch(e){ P.erro(e); } F.salv=false; P.render(); }

  /* ---------- Manutenções ---------- */
  const servDe=m=>Array.isArray(m.servicos)?m.servicos:String(m.servico||'').split(',').map(s=>s.trim()).filter(Boolean);
  function vMan(){ carregar(); if(!lido()) return topo('MANUTENÇÕES','Manutenções')+carregando();
    const f=F.fm||(F.fm={data:hoje(),caminhaoId:'',km:'',servicos:['Troca de oleo'],observacao:''}), ed=f._id, q=F.qm, t=q.q.toLowerCase();
    const xs=ord(vivos('manutencoes').filter(m=>(!q.s||servDe(m).includes(q.s))&&(!t||[m.caminhao,m.servico,m.observacao,m.km].join(' ').toLowerCase().includes(t))));
    return topo('MANUTENÇÕES','Manutenções','Serviços feitos nos caminhões cadastrados.')+
    (pode()?`<section class="card fr-form${ed?' fr-ed':''}"><div class="label">${ed?'CORRIGIR MANUTENÇÃO':'NOVA MANUTENÇÃO'}</div><div class="fr-fs">${campo('Data',inp('fm','data',f.data,'date'))}
      ${campo('Caminhão',sel('fm','caminhaoId',f.caminhaoId,[['','Escolha']].concat(vivos('caminhoes').map(c=>[c._id,camTxt(c)]))),'w2')}${campo('Km',inp('fm','km',f.km,'text',' inputmode="numeric"'))}
      <div class="fr-f w4"><span>Serviços</span><div class="fr-chips">${SERV.map(s=>`<button class="fr-chip${f.servicos.includes(s)?' on':''}" data-act="fr-man-sv" data-v="${esc(s)}">${esc(servN(s))}</button>`).join('')}</div></div>
      ${campo('Observação',inp('fm','observacao',f.observacao),'w4')}</div><div class="fr-bts">${bt(F.salv?'Salvando…':ed?'Salvar correção':'Registrar manutenção','fr-man-ok')}${ed?bt('Cancelar','fr-man-x',null,1):''}</div></section>`:'')+
    `<section class="card"><div class="fr-fil"><input id="fr-qm" type="search" placeholder="Buscar caminhão, serviço ou observação" value="${esc(q.q)}"><select data-frq="qm.s"><option value="">Todos os serviços</option>${SERV.map(s=>`<option value="${esc(s)}"${q.s===s?' selected':''}>${esc(servN(s))}</option>`).join('')}</select><span class="sub">${xs.length} manutenções</span></div>
      ${xs.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Caminhão</th><th class="n">Km</th><th>Serviços</th><th>Observação</th><th></th></tr></thead><tbody>${xs.slice(0,300).map(m=>`<tr><td data-r="Data">${br(dataN(m.data))}</td><td data-r="Caminhão"><b>${esc(m.caminhao||'-')}</b></td><td class="n" data-r="Km">${m.km?fN(num(m.km),0):'-'}</td><td data-r="Serviços">${servDe(m).map(s=>pill(servN(s))).join(' ')}</td><td data-r="Obs.">${esc(m.observacao&&m.observacao!=='-'?m.observacao:'')}</td><td class="fr-acs">${pode()?lk('Editar','fr-man-ed',m._id):''}${delBt('manutencoes',m._id)}</td></tr>`).join('')}</tbody></table></div>`:vazio('Nenhuma manutenção.')}</section>`; }
  async function manOk(){ const f=F.fm; if(!f||F.salv) return; if(!f.data||!f.caminhaoId||!String(f.km||'').trim()||!f.servicos.length) return P.toast('Informe a data, o caminhão, o km e pelo menos um serviço.');
    const c=camDe(f.caminhaoId); F.salv=true; P.render();
    try{ await grava('manutencoes',f._id,{data:f.data,caminhaoId:f.caminhaoId,caminhao:c?c.placa+' - '+(c.modelo||''):'-',km:String(Math.round(num(f.km))),servicos:f.servicos.slice(),servico:f.servicos.join(', '),observacao:String(f.observacao||'').trim()||'-'}); P.toast(f._id?'Manutenção corrigida.':'Manutenção registrada.'); F.fm=null; }catch(e){ P.erro(e); } F.salv=false; P.render(); }

  /* ---------- Relatórios ---------- */
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
  function vRel(){ carregar(); if(!lido()) return topo('RELATÓRIOS','Relatórios')+carregando();
    const r=F.rel, R=relDados();
    const fil=`<section class="card fr-relf"><div class="fr-seg">${PER.map(([k,t])=>`<button class="${r.per===k?'on':''}" data-act="fr-rel-per" data-v="${k}">${t}</button>`).join('')}</div>
      ${r.per==='datas'?`<label class="fr-f"><span>De</span><input type="date" data-frq="rel.de" value="${esc(R.de)}"></label><label class="fr-f"><span>Até</span><input type="date" data-frq="rel.ate" value="${esc(R.ate)}"></label>`:''}
      <label class="fr-f"><span>Caminhão</span><select data-frq="rel.cam"><option value="">Todos</option>${vivos('caminhoes').map(c=>`<option value="${esc(c._id)}"${r.cam===c._id?' selected':''}>${esc(camTxt(c))}</option>`).join('')}</select></label></section>
      <div class="fr-tabs">${TIPOS.map(([k,t])=>`<button class="${r.tipo===k?'on':''}" data-act="fr-rel-tipo" data-v="${k}">${t}</button>`).join('')}</div>`;
    let corpo='';
    if(r.tipo==='resumo') corpo=nums([{r:'Abastecido',v:fL(R.lit),s:R.abs.length+' abastecimentos'},{r:'COLAFIX',v:fL(R.lC)},{r:'FIXCOL',v:fL(R.lT)},{r:'Diesel comprado',v:fL(R.cmp),s:R.comp.length+' compras'},{r:'Km rodado',v:fN(R.kmT,0)+' km',s:R.mG?'média '+fN(R.mG,2)+' km/L':''},{r:'Manutenções',v:R.man.length}])+
      `<div class="fr-g2"><section class="card"><div class="label">CONSUMO POR ${R.sem?'SEMANA':'DIA'} (L)</div>${barras(R.serie,'L')}</section><section class="card"><div class="label">CAMINHÕES QUE MAIS ABASTECERAM</div>${R.veic.length?hbar(R.veic.slice(0,10).map(v=>({t:v.c.placa,v:v.l})),fL):vazio('Nada no período.')}</section></div>`;
    if(r.tipo==='abs') corpo=`<section class="card">${R.abs.length?tabAbs(R.abs.slice(0,500),true)+(R.abs.length>500?'<div class="sub">Mostrando 500. O Excel tem todos.</div>':''):vazio('Nenhum abastecimento no período.')}</section>`;
    if(r.tipo==='veic') corpo=`<section class="card">${R.veic.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Caminhão</th><th class="n">Abastecimentos</th><th class="n">Litros</th><th class="n">Km rodado</th><th class="n">Média</th></tr></thead><tbody>${R.veic.map(v=>`<tr><td data-r="Caminhão"><b>${esc(v.c.placa)}</b><small>${esc(v.c.modelo||'')}</small></td><td class="n" data-r="Abast.">${v.n}</td><td class="n" data-r="Litros">${fL(v.l)}</td><td class="n" data-r="Km">${fN(v.km,0)}</td><td class="n" data-r="Média"><b>${v.m?fN(v.m,2)+' km/L':'-'}</b></td></tr>`).join('')}</tbody></table></div>`:vazio('Nada no período.')}</section>`;
    if(r.tipo==='comp') corpo=`<section class="card">${R.comp.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th class="n">COLAFIX</th><th class="n">FIXCOL</th><th class="n">Total</th><th>Observação</th></tr></thead><tbody>${R.comp.map(c=>`<tr><td data-r="Data">${br(dataN(c.data))}</td><td class="n" data-r="COLAFIX">${fL(num(c.litrosCaminhoes))}</td><td class="n" data-r="FIXCOL">${fL(num(c.litrosTratores))}</td><td class="n" data-r="Total"><b>${fL(num(c.litrosCaminhoes)+num(c.litrosTratores))}</b></td><td data-r="Obs.">${esc(c.observacao&&c.observacao!=='-'?c.observacao:'')}</td></tr>`).join('')}</tbody></table></div>`:vazio('Nenhuma compra no período.')}</section>`;
    if(r.tipo==='man') corpo=`<section class="card">${R.man.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Caminhão</th><th class="n">Km</th><th>Serviços</th><th>Observação</th></tr></thead><tbody>${R.man.map(m=>`<tr><td data-r="Data">${br(dataN(m.data))}</td><td data-r="Caminhão">${esc(m.caminhao||'-')}</td><td class="n" data-r="Km">${m.km?fN(num(m.km),0):'-'}</td><td data-r="Serviços">${esc(servDe(m).map(servN).join(', '))}</td><td data-r="Obs.">${esc(m.observacao&&m.observacao!=='-'?m.observacao:'')}</td></tr>`).join('')}</tbody></table></div>`:vazio('Nenhuma manutenção no período.')}</section>`;
    return topo('RELATÓRIOS','Relatórios',esc(perTxt(R)+(R.cam?' · '+R.cam.placa:'')),bt('Excel','fr-rel-xls',null,1)+bt('Baixar PDF','fr-rel-pdf'))+fil+corpo; }
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

  /* ---------- Cadastros (motoristas, abastecedores, importar, tanque) ---------- */
  function vCad(){ carregar(); if(!lido()) return topo('CADASTROS','Cadastros')+carregando();
    const ab=[['mot','Motoristas ('+vivos('motoristas').length+')'],['aba','Abastecedores ('+vivos('abastecedores').length+')'],['tq','Tanque'],['imp','Trazer do sistema antigo']];
    let c='';
    if(F.cad==='mot'||F.cad==='aba'){ const k=F.cad==='mot'?'motoristas':'abastecedores', fk=F.cad==='mot'?'fp':'fb', f=F[fk]||(F[fk]={nome:'',matricula:'',status:'Ativo'}), xs=vivos(k).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
      c=(pode()?`<section class="card fr-form${f._id?' fr-ed':''}"><div class="label">${f._id?'EDITAR':'NOVO'} ${F.cad==='mot'?'MOTORISTA':'ABASTECEDOR'}</div><div class="fr-fs">${campo('Nome',inp(fk,'nome',f.nome),'w2')}${F.cad==='mot'?campo('Matrícula',inp(fk,'matricula',f.matricula)):''}${campo('Situação',sel(fk,'status',f.status,['Ativo','Inativo']))}</div>
        <div class="fr-bts">${bt(F.salv?'Salvando…':f._id?'Salvar':'Cadastrar','fr-pes-ok',F.cad)}${f._id?bt('Cancelar','fr-pes-x',F.cad,1):''}</div></section>`:'')+
        `<section class="card">${xs.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Nome</th>${F.cad==='mot'?'<th>Matrícula</th>':''}<th>Situação</th><th class="n">Abastecimentos</th><th></th></tr></thead><tbody>${xs.map(m=>`<tr><td data-r="Nome"><b>${esc(m.nome)}</b></td>${F.cad==='mot'?`<td data-r="Matrícula">${esc(m.matricula||'-')}</td>`:''}<td data-r="Situação">${pill(m.status||'Ativo',STC[m.status||'Ativo'])}</td>
          <td class="n" data-r="Abast.">${vivos('abastecimentos').filter(a=>(F.cad==='mot'?a.motorista:a.abastecedor)===m.nome).length}</td><td class="fr-acs">${pode()?lk('Editar','fr-pes-ed',F.cad+':'+m._id):''}${delBt(k,m._id)}</td></tr>`).join('')}</tbody></table></div>`:vazio('Ninguém cadastrado.')}</section>`; }
    if(F.cad==='tq') c=`<section class="card fr-form"><div class="label">TANQUE DE DIESEL</div><div class="fr-fs">${campo('Capacidade do tanque (L)',`<input id="fr-cap" inputmode="numeric" value="${esc(F.cfg.cap||8000)}">`)}${campo('Avisar para pedir diesel com (L)',`<input id="fr-avi" inputmode="numeric" value="${esc(F.cfg.aviso||2000)}">`)}</div>
      <div class="sub">O aviso aparece no Painel da frota e no Meu dia quando o saldo total chega nesse número.</div>${pode()?`<div class="fr-bts">${bt('Salvar','fr-cfg-ok')}</div>`:''}</section>`;
    if(F.cad==='imp'){ const I=F.imp;
      c=`<section class="card"><div class="label">TRAZER OS DADOS DO SISTEMA ANTIGO DA FROTA</div>
        <p class="sub">No sistema antigo, abra <b>Configurações</b> e toque em <b>Baixar backup do servidor</b> (ou do local). Escolha aqui o arquivo <b>backup-frota-….json</b>. O painel mostra o que vai entrar antes de gravar.
        Pode trazer de novo depois: o que já veio é atualizado, sem repetir. <b>Os usuários e senhas do sistema antigo não entram</b> — aqui cada pessoa entra com o login do painel.</p>
        ${pode()?`<label class="btn sec fr-file">Escolher o arquivo do backup<input type="file" accept=".json,application/json" id="fr-impf" hidden></label>`:''}
        ${I&&I.erro?`<div class="fr-msg crit">${esc(I.erro)}</div>`:''}
        ${I&&I.L?`<div class="fr-imp"><div class="sub">Arquivo: <b>${esc(I.nome)}</b>${I.em?' · gerado em '+esc(br(String(I.em).slice(0,10))):''}</div><div class="fr-tw"><table class="fr-t"><thead><tr><th>O quê</th><th class="n">No arquivo</th><th class="n">Novos</th><th class="n">Já estavam (atualiza)</th></tr></thead><tbody>
          ${COLS.map(k=>{ const xs=I.L[k]||[], ja=xs.filter(x=>F[k].some(y=>y._id==='i'+x.id)).length; return `<tr><td>${esc({caminhoes:'Caminhões',motoristas:'Motoristas',abastecedores:'Abastecedores',abastecimentos:'Abastecimentos',compras:'Compras de diesel',manutencoes:'Manutenções'}[k])}</td><td class="n">${xs.length}</td><td class="n"><b>${xs.length-ja}</b></td><td class="n">${ja}</td></tr>`; }).join('')}</tbody></table></div>
          ${I.us?`<div class="sub">${I.us} usuários do sistema antigo ficaram de fora (com senha).</div>`:''}
          <div class="fr-bts">${bt(I.st==='gravando'?'Gravando… '+(I.prog||''):'Gravar no painel','fr-imp-ok')}${bt('Cancelar','fr-imp-x',null,1)}</div></div>`:''}
        ${I&&I.st==='ok'?`<div class="fr-msg ok">Pronto: ${I.n} registros gravados.</div>`:''}</section>`; }
    return topo('CADASTROS','Cadastros da frota')+`<div class="fr-tabs">${ab.map(([k,t])=>`<button class="${F.cad===k?'on':''}" data-act="fr-cad" data-v="${k}">${t}</button>`).join('')}</div>`+c; }
  async function pesOk(t){ const fk=t==='mot'?'fp':'fb', k=t==='mot'?'motoristas':'abastecedores', f=F[fk]; if(!f||F.salv) return;
    const nome=String(f.nome||'').trim().replace(/\s+/g,' '); if(nome.length<2) return P.toast('Informe o nome.');
    if(vivos(k).some(m=>m._id!==f._id&&String(m.nome).toLowerCase()===nome.toLowerCase())) return P.toast(nome+' já está cadastrado.');
    const at=f._id?F[k].find(m=>m._id===f._id):null; F.salv=true; P.render();
    try{ const o={nome,status:f.status||'Ativo'}; if(t==='mot') o.matricula=String(f.matricula||'').trim(); await grava(k,f._id,o);
      if(at&&at.nome!==nome){ const ch=t==='mot'?'motorista':'abastecedor'; for(const a of vivos('abastecimentos').filter(a=>a[ch]===at.nome)) await grava('abastecimentos',a._id,{[ch]:nome}); }
      P.toast(f._id?'Salvo.':nome+' cadastrado.'); F[fk]=null; }catch(e){ P.erro(e); } F.salv=false; P.render(); }
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
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="fr-"]'); if(!b) return; const a=b.dataset.act, v=b.dataset.v;
    if(a!=='fr-del') F.del='';
    try{ switch(a){
      case 'fr-go': P.go(v); return;
      case 'fr-abs-ok': return absOk(); case 'fr-abs-x': F.fa=faNovo(); break;
      case 'fr-abs-ed': { const x=F.abastecimentos.find(y=>y._id===v); if(!x) return; const cam=x.caminhaoId&&camDe(x.caminhaoId)||F.caminhoes.find(c=>c.placa===x.placa), m=x.motoristaId&&F.motoristas.find(y=>y._id===x.motoristaId)||F.motoristas.find(y=>y.nome===x.motorista), ab=x.abastecedorId&&F.abastecedores.find(y=>y._id===x.abastecedorId)||F.abastecedores.find(y=>y.nome===x.abastecedor);
        F.fa={_id:x._id,data:dataN(x.data),hora:x.hora||'',caminhaoId:cam?cam._id:'',motoristaId:m?m._id:'',abastecedorId:ab?ab._id:'',kmCaminhao:String(x.kmCaminhao||''),litros:String(num(x.litros)).replace('.',','),requisicao:String(x.requisicao||''),totalizador:String(x.totalizador||''),turno:x.turno||'Manha',tipoUso:x.tipoUso||'Caminhao'};
        if(P.S.view!=='frotaabs') P.go('frotaabs'); else { P.render(); window.scrollTo(0,0); } return; }
      case 'fr-cp-ok': return cpOk(); case 'fr-cp-x': F.fc=null; break;
      case 'fr-cp-ed': { const x=F.compras.find(y=>y._id===v); if(!x) return; F.fc={_id:x._id,data:dataN(x.data),litrosCaminhoes:String(num(x.litrosCaminhoes)).replace('.',','),litrosTratores:String(num(x.litrosTratores)).replace('.',','),observacao:x.observacao&&x.observacao!=='-'?x.observacao:''}; window.scrollTo(0,0); break; }
      case 'fr-cam-ok': return camOk(); case 'fr-cam-x': F.fk=null; break;
      case 'fr-cam-ed': { const x=F.caminhoes.find(y=>y._id===v); if(!x) return; F.fk={_id:x._id,placa:x.placa,modelo:x.modelo||'',kmAtual:String(x.kmAtual||''),status:x.status||'Ativo',localConsumo:x.localConsumo||'COLAFIX'}; window.scrollTo(0,0); break; }
      case 'fr-cam-rel': F.rel.cam=v; F.rel.tipo='veic'; P.go('frotarel'); return;
      case 'fr-man-ok': return manOk(); case 'fr-man-x': F.fm=null; break;
      case 'fr-man-sv': { const s=F.fm.servicos, i=s.indexOf(v); if(i<0) s.push(v); else s.splice(i,1); break; }
      case 'fr-man-ed': { const x=F.manutencoes.find(y=>y._id===v); if(!x) return; const c=x.caminhaoId&&camDe(x.caminhaoId)||F.caminhoes.find(c=>(c.placa+' - '+(c.modelo||''))===x.caminhao);
        F.fm={_id:x._id,data:dataN(x.data),caminhaoId:c?c._id:'',km:String(x.km||''),servicos:servDe(x).slice(),observacao:x.observacao&&x.observacao!=='-'?x.observacao:''}; window.scrollTo(0,0); break; }
      case 'fr-del': { if(F.del!==v){ F.del=v; break; } const [k,id]=v.split(':'); F.del=''; await apaga(k,id); P.toast('Apagado.'); break; }
      case 'fr-qa-x': F.qa={q:'',d:'',u:''}; break;
      case 'fr-rel-per': F.rel.per=v; break; case 'fr-rel-tipo': F.rel.tipo=v; break;
      case 'fr-rel-xls': return relXls(); case 'fr-rel-pdf': return relPdf();
      case 'fr-cad': F.cad=v; break;
      case 'fr-pes-ok': return pesOk(v); case 'fr-pes-x': F[v==='mot'?'fp':'fb']=null; break;
      case 'fr-pes-ed': { const [t,id]=v.split(':'), k=t==='mot'?'motoristas':'abastecedores', x=F[k].find(y=>y._id===id); if(!x) return; F[t==='mot'?'fp':'fb']={_id:x._id,nome:x.nome||'',matricula:x.matricula||'',status:x.status||'Ativo'}; window.scrollTo(0,0); break; }
      case 'fr-cfg-ok': { const cap=Math.round(num(document.getElementById('fr-cap').value)), avi=Math.round(num(document.getElementById('fr-avi').value));
        if(cap<=0) return P.toast('Informe a capacidade do tanque.'); if(avi<0||avi>=cap) return P.toast('O aviso precisa ser menor que a capacidade.');
        await P.db().doc('frota/config').set({cap,aviso:avi,em:new Date().toISOString(),por:eu()},{merge:true}); F.cfg.cap=cap; F.cfg.aviso=avi; P.toast('Tanque salvo.'); break; }
      case 'fr-imp-ok': return impOk(); case 'fr-imp-x': F.imp=null; break;
    } }catch(e){ P.erro(e); } P.render(); });

  document.head.insertAdjacentHTML('beforeend',`<style id="fr-css">
  .fr-ac{display:flex;gap:8px;flex-wrap:wrap}.fr-nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
  .fr-n{background:var(--surface);border-radius:16px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.05),0 4px 14px rgba(0,0,0,.04)}.fr-n[data-go]{cursor:pointer}.fr-n small{display:block;color:var(--muted);font-size:12px}.fr-n b{display:block;font-size:26px;font-weight:400;margin:4px 0 2px}.fr-n span{font-size:12px;color:var(--muted)}
  .fr-n.warn{box-shadow:inset 4px 0 0 var(--warn)}.fr-n.crit{box-shadow:inset 4px 0 0 var(--crit)}.fr-n.crit b{color:var(--crit)}
  .fr-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:16px}.fr-g2>.card{margin:0}
  .fr-alerta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-left:6px solid var(--warn)}.fr-alerta.crit{border-left-color:var(--crit)}.fr-alerta span{flex:1;min-width:200px;color:var(--muted)}
  .fr-bars{display:flex;align-items:flex-end;gap:6px;height:170px;padding-top:18px}.fr-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0;position:relative}
  .fr-bar i{display:block;width:70%;max-width:42px;background:var(--teal);border-radius:6px 6px 2px 2px;min-height:2px}.fr-bar em{font-style:normal;font-size:11px;color:var(--muted);white-space:nowrap}.fr-bar small{font-size:11px;color:var(--muted);margin-top:4px;white-space:nowrap}
  .fr-hb{display:grid;grid-template-columns:minmax(90px,160px) 1fr auto;gap:10px;align-items:center;padding:5px 0;font-size:13px}.fr-hb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fr-hb div{background:var(--line);border-radius:6px;height:10px}.fr-hb i{display:block;height:100%;background:var(--teal);border-radius:6px}
  .fr-tq{display:grid;grid-template-columns:70px 1fr;gap:16px;align-items:center}.fr-tqb{position:relative;height:140px;border:2px solid var(--line);border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center}.fr-tqb i{position:absolute;left:0;right:0;bottom:0;background:var(--teal);opacity:.35}.fr-tqb i.warn{background:var(--warn)}.fr-tqb b{position:relative;font-size:18px}
  .fr-form .fr-fs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.fr-f{display:flex;flex-direction:column;gap:4px;min-width:0}.fr-f>span{font-size:12px;color:var(--muted);font-weight:500}.fr-f>span em{font-style:normal;color:var(--teal-strong,var(--teal))}
  .fr-f input,.fr-f select,.fr-fil input,.fr-fil select{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:inherit;font:inherit;font-size:14px;min-height:40px}.fr-fil input,.fr-fil select{width:auto}.fr-f input:focus,.fr-f select:focus,.fr-fil input:focus,.fr-fil select:focus{outline:2px solid var(--teal);outline-offset:1px}.fr-f select:disabled{opacity:.7}.fr-f.w2{grid-column:span 2}.fr-f.w4{grid-column:1/-1}.fr-ed{box-shadow:inset 4px 0 0 var(--teal)}
  .fr-bts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.fr-msg{margin-top:10px;padding:8px 12px;border-radius:10px;font-size:13px;background:var(--surface-2,rgba(0,0,0,.04))}.fr-msg.crit{color:var(--crit)}.fr-msg.warn{color:var(--warn)}.fr-msg.ok{color:var(--ok)}
  .fr-chips{display:flex;gap:6px;flex-wrap:wrap}.fr-chip{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 12px;cursor:pointer;color:inherit;font:inherit}.fr-chip.on{background:var(--teal);border-color:var(--teal);color:#fff}
  .fr-fil{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.fr-fil input[type=search]{flex:1;min-width:220px}
  .fr-tw{overflow-x:auto}.fr-t{width:100%;border-collapse:collapse;font-size:13px}.fr-t th{text-align:left;font-size:11px;font-weight:500;color:var(--muted);text-transform:uppercase;padding:8px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
  .fr-t td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.fr-t td small{display:block;color:var(--muted);font-size:11px}.fr-t .n{text-align:right;white-space:nowrap}.fr-acs{white-space:nowrap;text-align:right}.fr-acs .lnk{margin-left:8px}
  .fr-crit{color:var(--crit)!important;font-weight:600}.fr-mut{color:var(--muted)!important}.fr-neg{color:var(--crit)}.fr-pos{color:var(--ok)}
  .fr-relf{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}.fr-relf .fr-f{min-width:160px}
  .fr-seg{display:flex;flex-wrap:wrap;gap:4px;background:var(--line);padding:4px;border-radius:12px}.fr-seg button{border:0;background:none;padding:7px 12px;border-radius:9px;cursor:pointer;color:inherit;font:inherit}.fr-seg button.on{background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.12);font-weight:600}
  .fr-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 14px;border-bottom:1px solid var(--line)}.fr-tabs button{border:0;background:none;padding:9px 14px;cursor:pointer;color:var(--muted);font:inherit;border-bottom:2px solid transparent;margin-bottom:-1px}.fr-tabs button.on{color:inherit;border-bottom-color:var(--teal);font-weight:600}
  .fr-file{display:inline-flex;cursor:pointer}.fr-imp{margin-top:12px}
  @media (max-width:760px){ .fr-form .fr-fs{grid-template-columns:1fr 1fr}.fr-f.w2{grid-column:1/-1}.fr-tq{grid-template-columns:56px 1fr}
    .fr-t thead{display:none}.fr-t tr{display:block;border-bottom:1px solid var(--line);padding:8px 0}.fr-t td{display:flex;justify-content:space-between;gap:10px;border:0;padding:3px 0;text-align:right}.fr-t td[data-r]::before{content:attr(data-r);color:var(--muted);font-size:12px;text-align:left}.fr-t td small{display:inline;margin-left:6px}.fr-acs{justify-content:flex-end!important} }
  </style>`);
})();
