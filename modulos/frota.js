/* Frota (11/11/2026): o sistema da frota (caminhões, motoristas, abastecimentos, tanque de diesel, manutenções e relatórios)
   dentro do painel. Antes era um sistema à parte (React + servidor próprio, login e senha próprios).
   Dados em frota/dados/<caminhoes|motoristas|abastecedores|abastecimentos|compras|manutencoes> e frota/config {cap, aviso}.
   Quem vê: quem tem o módulo "frota" (e a administradora). Regras: match /frota/** (frotaOk). Apagar = removido:true.
   Uso do diesel: tipoUso 'Caminhao' = COLAFIX · 'Trator/Outro' = FIXCOL (os mesmos valores do sistema antigo, para importar o backup). */
(function(){ const P=window.Painel; if(!P) return;
  if(P.icone) P.icone('caminhao','<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>');
  const BASE='frota/dados/', COLS=['caminhoes','motoristas','abastecedores','abastecimentos','compras','manutencoes'];
  const F={on:false,lido:{},caminhoes:[],motoristas:[],abastecedores:[],abastecimentos:[],compras:[],manutencoes:[],cfg:{cap:8000,aviso:2000},
    fa:null,fc:null,fk:null,fm:null,fp:null,fb:null,qa:{q:'',d:'',u:''},qt:{q:'',d:'',m:''},tqoc:{},qm:{q:'',s:''},qc:{q:'',st:''},rel:{per:'mes',de:'',ate:'',cam:'',tipo:'resumo'},cad:'mot',del:'',imp:null,salv:false};
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
  /* ---------- peças (11/11, layout de referência do sistema da frota: cartões coloridos com ícone, formulário em cima, tabela embaixo) ---------- */
  const U=()=>P.ui||null;
  const IC={bomba:'<path d="M4 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M3 20h12"/><path d="M6.5 8h5"/><path d="M14 9h1.5a1.5 1.5 0 0 1 1.5 1.5V15a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    tanque:'<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
    chave:'<path d="M14.5 6.5a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.5-6.5a4 4 0 0 1-2-2z"/><path d="m4 20 3.5-3.5"/>',
    pessoa:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5"/>',
    lapis:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    lixo:'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
    seta:'<path d="M7 17 17 7M9 7h8v8"/>', relogio:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    medidor:'<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 3.5-4.5"/><circle cx="12" cy="16" r="1.2"/>', alerta:'<path d="M12 4 2.8 19.5h18.4L12 4z"/><path d="M12 10v4.5M12 17h.01"/>'};
  if(P.icone) Object.keys(IC).forEach(k=>P.icone('fr'+k,IC[k]));
  const icn=(n,s)=>{ try{ return P.ic(IC[n]?'fr'+n:n,s||18); }catch(e){ return ''; } };
  const topo=(ey,tit,sub,ac)=>`<div class="fr-top"><div><div class="fr-ey">FROTA · ${esc(ey)}</div><h1>${esc(tit)}</h1>${sub?`<p>${sub}</p>`:''}</div>${ac?`<div class="fr-ac">${ac}</div>`:''}</div>`;
  const selo=(t,tom)=>`<span class="fr-selo ${tom||''}">${esc(t)}</span>`;
  const placa=p=>`<span class="fr-pl"><i>BR</i><b>${esc(p||'—')}</b></span>`;
  const usoT=u=>`<span class="fr-uso ${u==='Trator/Outro'?'f':'c'}">${usoN(u)}</span>`;
  const bt=(t,act,v,sec,extra)=>`<button class="${sec?'fr-bs':'fr-bp'}" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:''}${extra||''}>${t}</button>`;
  const lk=(t,act,v,cls)=>`<button class="lnk ${cls||''}" data-act="${act}" data-v="${esc(v)}">${t}</button>`;
  const acoes=(edAct,k,id,edV)=>!pode()?'':`<span class="fr-acs"><button class="fr-ib ed" data-act="${edAct}" data-v="${esc(edV||id)}" title="Editar" aria-label="Editar">${icn('lapis',16)}</button>${F.del===k+':'+id?`<button class="fr-ib cf" data-act="fr-del" data-v="${esc(k+':'+id)}">Apagar?</button>`:`<button class="fr-ib x" data-act="fr-del" data-v="${esc(k+':'+id)}" title="Apagar" aria-label="Apagar">${icn('lixo',16)}</button>`}</span>`;
  const campo=(r,html,cls)=>`<label class="fr-f ${cls||''}"><span>${r}</span>${html}</label>`;
  const inp=(f,k,v,tp,ex)=>`<input data-fr="${f}.${k}" type="${tp||'text'}" value="${esc(v==null?'':v)}"${ex||''}>`;
  const sel=(f,k,v,ops,ex)=>`<select data-fr="${f}.${k}"${ex||''}>${ops.map(o=>{ const [val,t]=Array.isArray(o)?o:[o,o]; return `<option value="${esc(val)}"${String(val)===String(v==null?'':v)?' selected':''}>${esc(t)}</option>`; }).join('')}</select>`;
  const vazio=(t,s)=>`<div class="fr-vz">${icn('caminhao',30)}<b>${esc(t)}</b>${s?`<span>${esc(s)}</span>`:''}</div>`;
  const carregando=()=>`<div class="fr-card">${vazio('Carregando os dados da frota…')}</div>`;
  const card=(tit,corpo,o)=>{ o=o||{}; return `<section class="fr-card${o.cls?' '+o.cls:''}">${tit?`<div class="fr-ch">${o.ic?`<span class="fr-ti ${o.cor||'az'}">${icn(o.ic,18)}</span>`:''}<div class="fr-cht"><h3>${esc(tit)}</h3>${o.sub?`<small>${esc(o.sub)}</small>`:''}</div><span class="fr-chr">${o.ac||''}</span></div>`:''}${corpo}</section>`; };
  /* cartão de número: ícone em quadro colorido, rótulo, valor colorido e linha embaixo */
  const kpis=(xs,cls)=>`<div class="fr-kp ${cls||''}">${xs.map(x=>`<div class="fr-k ${x.cor||'az'}"${x.go?` data-go="${x.go}" role="button"`:''}><span class="fr-ti ${x.cor||'az'}">${icn(x.ic||'grafico',20)}</span><div><small>${esc(x.r)}</small><b>${x.v}</b>${x.s?`<span>${x.s}</span>`:''}</div></div>`).join('')}</div>`;
  const busca=(id,v,ph)=>`<label class="fr-f fr-bus"><span>Pesquisar</span><input id="${id}" type="search" placeholder="${esc(ph)}" value="${esc(v)}"></label>`;
  const filtro=(html,limpar)=>`<div class="fr-card fr-fil">${html}${limpar?`<button class="fr-bs fr-lim" data-act="${limpar}" data-v="">Limpar filtros</button>`:''}</div>`;
  const tabela=(cols,rows,vz,o)=>{ o=o||{}; return `<div class="fr-card fr-tc${o.cls?' '+o.cls:''}">${o.cab||''}${rows.length?`<div class="fr-tw"><table class="fr-t${o.esc?' esc':''}"><thead><tr>${cols.map(c=>`<th${c[1]?' class="n"':''}>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>${o.pe||''}`:vazio(vz)}</div>`; };
  const DSEM=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const diasCom=(xs,n,hj)=>{ const r=[]; for(let i=n-1;i>=0;i--){ const d=addD(hj,-i); r.push({d,t:br(d).slice(0,5),v:xs.filter(a=>dataN(a.data)===d).reduce((t,a)=>t+num(a.litros),0)}); } return r; };
  /* gráfico de área (litros por dia) em SVG, com a linha da média */
  function area(xs,o){ o=o||{}; if(!xs.length||!xs.some(x=>x.v)) return `<div class="fr-sv">Nada no período.</div>`;
    const W=520,H=190,L=40,R=10,T=14,B=26, w=W-L-R, h=H-T-B, mx=Math.max(1,...xs.map(x=>x.v))*1.12, n=xs.length, X=i=>L+(n<2?w/2:i*w/(n-1)), Y=v=>T+h-v/mx*h;
    const pts=xs.map((x,i)=>X(i).toFixed(1)+','+Y(x.v).toFixed(1)).join(' '), med=xs.reduce((s,x)=>s+x.v,0)/n, gr=[0,.25,.5,.75,1];
    const passo=Math.max(1,Math.ceil(n/8));
    return `<svg class="fr-area" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(o.tit||'Consumo')}">
      ${gr.map(g=>`<line x1="${L}" x2="${W-R}" y1="${(T+h*g).toFixed(1)}" y2="${(T+h*g).toFixed(1)}" class="g"/><text x="${L-6}" y="${(T+h*g+3).toFixed(1)}" class="ax" text-anchor="end">${fN(mx*(1-g),0)}</text>`).join('')}
      <polygon points="${X(0).toFixed(1)},${T+h} ${pts} ${X(n-1).toFixed(1)},${T+h}" class="ar"/><polyline points="${pts}" class="ln"/>
      <line x1="${L}" x2="${W-R}" y1="${Y(med).toFixed(1)}" y2="${Y(med).toFixed(1)}" class="md"/>
      ${xs.map((x,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(x.v).toFixed(1)}" r="${x.hj?4.5:3}" class="pt${x.hj?' hj':''}"><title>${esc(x.t+': '+fN(x.v)+' L')}</title></circle>${i%passo===0||i===n-1?`<text x="${X(i).toFixed(1)}" y="${H-6}" class="ax" text-anchor="middle">${esc(x.t)}</text>`:''}`).join('')}
    </svg><div class="fr-leg"><span><i class="ln"></i>Litros abastecidos</span><span><i class="md"></i>Média ${fN(med,0)} L</span></div>`; }
  /* rosca COLAFIX × FIXCOL */
  function rosca(a,b,tit){ const t=a+b, p=t?a/t*100:0;
    return `<div class="fr-rosca"><div class="fr-rd" style="--p:${p.toFixed(1)}%"><div><b>${fN(t,0)}</b><small>litros</small></div></div><div class="fr-rl"><div><i class="c"></i><span>COLAFIX</span><b>${fL(a)}</b><em>${fN(p,0)}%</em></div><div><i class="f"></i><span>FIXCOL</span><b>${fL(b)}</b><em>${fN(t?100-p:0,0)}%</em></div><div class="fr-rt"><span>Total</span><b>${fL(t)}</b></div></div></div>`; }
  function spark(vs){ if(vs.length<2) return ''; const W=240,H=60, mx=Math.max(1,...vs), X=i=>i*W/(vs.length-1), Y=v=>H-4-v/mx*(H-10); const pts=vs.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
    return `<svg class="fr-sp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polygon points="0,${H} ${pts} ${W},${H}"/><polyline points="${pts}"/></svg>`; }
  const varTxt=(a,b)=>{ if(!b) return a?'<span class="fr-up">novo no período</span>':'<span class="fr-eq">sem alteração</span>'; const p=(a-b)/b*100; return Math.abs(p)<.5?'<span class="fr-eq">sem alteração</span>':`<span class="${p>0?'fr-up':'fr-dn'}">${p>0?'+':'−'} ${fN(Math.abs(p),1)}%</span> <span class="fr-vs">vs período anterior</span>`; };
  /* tanque: barra de ocupação com COLAFIX, FIXCOL e livre */
  function ocupa(s){ const cap=F.cfg.cap||8000, av=F.cfg.aviso||2000, pc=v=>Math.max(0,Math.min(100,v/cap*100)), c=pc(Math.max(0,s.C)), t=Math.min(100-c,pc(Math.max(0,s.T)));
    return `<div class="fr-oc"><div class="fr-och"><b>Ocupação do tanque</b><span>${fN(pc(s.tot),0)}%</span></div><div class="fr-ocb"><i class="c" style="width:${c.toFixed(1)}%"></i><i class="f" style="width:${t.toFixed(1)}%"></i><u style="left:${pc(av).toFixed(1)}%" title="Aviso para pedir diesel: ${fL(av)}"></u></div>
      <div class="fr-ocl"><span><i class="c"></i>COLAFIX ${fL(s.C)}</span><span><i class="f"></i>FIXCOL ${fL(s.T)}</span><span><i class="v"></i>Livre ${fL(Math.max(0,cap-s.tot))}</span><span><i class="a"></i>Aviso em ${fL(av)}</span></div></div>`; }
  const autonomia=s=>{ const hj=hoje(), a30=vivos('abastecimentos').filter(a=>{ const d=dataN(a.data); return d>addD(hj,-30)&&d<=hj; }).reduce((t,a)=>t+num(a.litros),0), md=a30/30; return {md,dias:md>0?Math.max(0,s.tot)/md:null}; };

  /* ---------- Painel ---------- */
  function vPainel(){ carregar(); if(!lido()) return topo('PAINEL','Painel')+carregando();
    const s=saldo(), cap=F.cfg.cap||8000, cams=vivos('caminhoes'), at=cams.filter(c=>(c.status||'Ativo')==='Ativo'), mn=cams.filter(c=>c.status==='Manutencao');
    const abs=vivos('abastecimentos'), hj=hoje(), dHj=abs.filter(a=>dataN(a.data)===hj), lHj=dHj.reduce((t,a)=>t+num(a.litros),0), agora=new Date();
    const d7=diasCom(abs,7,hj); d7[6].hj=true; d7[6].t='hoje';
    const rk=cams.map(c=>({c,m:media(c.placa)})).filter(x=>x.m).sort((a,b)=>b.m.m-a.m.m), mf=(()=>{ let k=0,l=0; rk.forEach(x=>{ k+=x.m.km; l+=x.m.l; }); return l?k/l:null; })();
    const baixo=s.tot<=(F.cfg.aviso||2000), neg=s.C<0||s.T<0, au=autonomia(s);
    const c30=vivos('compras').filter(c=>dataN(c.data)>addD(hj,-30)), c60=vivos('compras').filter(c=>{ const d=dataN(c.data); return d>addD(hj,-60)&&d<=addD(hj,-30); }), tc=xs=>xs.reduce((t,c)=>t+num(c.litrosCaminhoes)+num(c.litrosTratores),0);
    const semC=[]; for(let i=7;i>=0;i--){ const a=addD(hj,-7*i-6), b=addD(hj,-7*i); semC.push(tc(vivos('compras').filter(c=>{ const d=dataN(c.data); return d>=a&&d<=b; }))); }
    const u7=abs.filter(a=>dataN(a.data)>addD(hj,-7)), uC=u7.filter(a=>a.tipoUso!=='Trator/Outro').reduce((t,a)=>t+num(a.litros),0), uT=u7.reduce((t,a)=>t+num(a.litros),0)-uC;
    const wid=`<div class="fr-wid"><div><small>Data e hora</small><b>${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}</b><span>${DSEM[agora.getDay()]}, ${br(hj)}</span></div>
      <div><small>Autonomia do tanque</small><b>${au.dias!=null?fN(au.dias,0)+' dias':'—'}</b><span>${au.md?'gasto médio '+fL(au.md)+'/dia':'sem consumo em 30 dias'}</span></div>
      <div><small>Média da frota</small><b>${mf?fN(mf,2)+' km/L':'—'}</b><span>${rk.length} caminhões com média</span></div></div>`;
    const alerta=neg?`<div class="fr-al crit">${icn('alerta',22)}<div><b>Saldo negativo no tanque</b><span>${s.C<0?'COLAFIX está com '+fL(s.C)+'. ':''}${s.T<0?'FIXCOL está com '+fL(s.T)+'. ':''}Confira se alguma compra de diesel não foi lançada.</span></div><button class="fr-bs" data-go="frotatq">Abrir o tanque</button></div>`
      :baixo?`<div class="fr-al warn">${icn('alerta',22)}<div><b>Fazer novo pedido de diesel</b><span>O tanque está com ${fL(s.tot)} (aviso em ${fL(F.cfg.aviso||2000)}). Cabem ${fL(Math.max(0,cap-s.tot))}.</span></div><button class="fr-bp" data-act="fr-go" data-v="frotatq">Lançar compra</button></div>`:'';
    const rkH=rk.length?rk.slice(0,6).map((x,i)=>`<div class="fr-rk${i===0?' top':''}${i===rk.length-1&&rk.length>2?' low':''}"><span class="fr-rkn">${i+1}º</span>${placa(x.c.placa)}<span class="fr-rkm">${esc(x.c.modelo||'')}</span><span class="fr-rkb"><i style="width:${(x.m.m/rk[0].m.m*100).toFixed(0)}%"></i></span><b>${fN(x.m.m,2)} km/L</b></div>`).join('')
      :`<div class="fr-sv">Ainda não há abastecimentos suficientes para calcular a média (precisa de 2 com km por caminhão).</div>`;
    const ult=ord(abs).slice(0,6);
    return topo('PAINEL','Painel','Resumo geral de abastecimento, tanque, frota e manutenções.',wid)+
      kpis([{r:'Caminhões ativos',v:fN(at.length,0),s:cams.length+' cadastrados',ic:'caminhao',cor:'az',go:'frotacam'},{r:'Abastecido hoje',v:fL(lHj),s:dHj.length+' lançamento'+(dHj.length===1?'':'s'),ic:'bomba',cor:'vd',go:'frotaabs'},
        {r:'Saldo total no tanque',v:fL(s.tot),s:fN(Math.max(0,s.tot/cap*100),0)+'% de '+fL(cap),ic:'tanque',cor:baixo?'lj':'rx',go:'frotatq'},{r:'Saldo COLAFIX',v:fL(s.C),s:fL(s.uC)+' consumidos',ic:'caminhao',cor:s.C<0?'vm':'vd',go:'frotatq'},{r:'Saldo FIXCOL',v:fL(s.T),s:fL(s.uT)+' consumidos',ic:'chave',cor:s.T<0?'vm':'lj',go:'frotatq'}])+
      alerta+
      card('Ranking de média dos caminhões',rkH,{ic:'grafico',sub:'Os caminhões mais econômicos pela média de km/L',ac:`<button class="fr-pill" data-go="frotacam">Ver todos</button>`})+
      (mn.length?`<div class="fr-mnc"><b>Veículos em manutenção</b><span>${mn.length} veículo${mn.length===1?'':'s'} marcado${mn.length===1?'':'s'} para acompanhamento: ${mn.map(c=>placa(c.placa)).join(' ')}</span><button class="lnk" data-go="frotaman">ver manutenções</button></div>`:'')+
      `<div class="fr-g3">${card('Consumo nos últimos 7 dias',area(d7,{tit:'Consumo nos últimos 7 dias'}),{sub:'Litros por dia'})}
        ${card('Consumo por categoria',rosca(uC,uT),{sub:'Últimos 7 dias'})}
        ${card('Diesel comprado',`<div class="fr-dc"><b>${fL(tc(c30))}</b><span>Comprado nos últimos 30 dias</span><p>${varTxt(tc(c30),tc(c60))}</p>${spark(semC)}<small>compras por semana · 8 semanas</small></div>`,{})}</div>`+
      card('Últimos abastecimentos',ult.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Motorista</th><th>Caminhão</th><th class="n">Litros</th><th class="n">Km</th><th>Local</th></tr></thead><tbody>${ult.map(a=>`<tr><td data-r="Data">${br(dataN(a.data))}<small>${esc(a.hora||'')}</small></td><td data-r="Motorista">${esc(a.motorista||'-')}</td><td data-r="Caminhão">${placa(a.placa)}</td><td class="n" data-r="Litros"><b>${fL(num(a.litros))}</b></td><td class="n" data-r="Km">${a.kmCaminhao?fN(num(a.kmCaminhao),0)+' km':'-'}</td><td data-r="Local">${usoT(a.tipoUso)}</td></tr>`).join('')}</tbody></table></div>
        <div class="fr-pe"><button class="lnk fr-vt" data-go="frotaabs">Ver todos os abastecimentos →</button></div>`:vazio('Nenhum abastecimento ainda.'),{}); }

  /* ---------- Abastecimentos ---------- */
  function formAbs(){ if(!pode()) return ''; const f=F.fa||(F.fa=faNovo()), ed=f._id, cam=camDe(f.caminhaoId), uT=ultTot(ed), kmU=cam?Math.max(0,...absDe(cam.placa).filter(a=>a._id!==ed).map(a=>num(a.kmCaminhao))):0;
    const tot=num(f.totalizador), kmV=num(f.kmCaminhao);
    return `<div class="fr-card fr-form${ed?' fr-ed':''}">${ed?`<div class="fr-edt">${icn('lapis',16)} Corrigindo o abastecimento de ${esc(br(dataN(f.data)))}</div>`:''}<div class="fr-fs c5">
      ${campo('Motorista',sel('fa','motoristaId',f.motoristaId,[['','Selecione']].concat(vivos('motoristas').filter(m=>(m.status||'Ativo')==='Ativo'||m._id===f.motoristaId).map(m=>[m._id,m.nome+(m.matricula?' · '+m.matricula:'')]))))}
      ${campo('Caminhão',sel('fa','caminhaoId',f.caminhaoId,[['','Selecione']].concat(vivos('caminhoes').map(c=>[c._id,camTxt(c)]))))}
      ${campo('Km do caminhão',inp('fa','kmCaminhao',f.kmCaminhao,'text',' inputmode="numeric" placeholder="Digite apenas números"'),'',)}
      ${campo('Quem abasteceu',sel('fa','abastecedorId',f.abastecedorId,[['','Selecione']].concat(vivos('abastecedores').filter(m=>(m.status||'Ativo')==='Ativo'||m._id===f.abastecedorId).map(m=>[m._id,m.nome]))))}
      ${campo('Data',inp('fa','data',f.data,'date'))}
      ${campo('Hora',inp('fa','hora',f.hora,'time'))}
      ${campo('Litros abastecidos',inp('fa','litros',f.litros,'text',' inputmode="decimal" placeholder="0,0"'))}
      ${campo('Turno',sel('fa','turno',f.turno,[['Manha','Manhã'],'Tarde','Noite']))}
      ${campo('Requisição',inp('fa','requisicao',f.requisicao,'text',' inputmode="numeric" placeholder="Número da requisição"'))}
      ${campo('Local de consumo',sel('fa','tipoUso',cam?usoDoLocal(cam.localConsumo):f.tipoUso,[['Caminhao','COLAFIX'],['Trator/Outro','FIXCOL']],cam?' disabled title="Vem do cadastro do caminhão"':''))}
      ${campo('Totalizador da bomba',inp('fa','totalizador',f.totalizador,'text',' inputmode="numeric" placeholder="Digite apenas números"'))}
      <div class="fr-f fr-dica">${kmU?`<span>Último km deste caminhão: <b>${fN(kmU,0)}</b></span>`:''}${uT?`<span>Último totalizador: <b>${fN(uT,0)}</b></span>`:''}</div>
      <div class="fr-f fr-fb">${bt(F.salv?'Salvando…':ed?'Salvar correção':'Lançar','fr-abs-ok')}${ed?bt('Cancelar','fr-abs-x',null,1):''}</div></div>
      ${uT&&tot&&tot<uT?`<div class="fr-msg ${ed?'warn':'crit'}">O totalizador (${fN(tot,0)}) está menor que o último registrado (${fN(uT,0)}).${ed?' Como é uma correção, dá para salvar.':' Confira o número da bomba.'}</div>`:''}
      ${kmU&&kmV&&kmV<kmU?`<div class="fr-msg warn">O km (${fN(kmV,0)}) está menor que o último deste caminhão (${fN(kmU,0)}).</div>`:''}</div>`; }
  const linhaTab=a=>`<tr><td data-r="Data">${br(dataN(a.data))}</td><td data-r="Hora">${esc(a.hora||'')}</td><td data-r="Motorista"><b>${esc(a.motorista||'-')}</b></td><td data-r="Placa">${placa(a.placa)}</td><td class="n" data-r="Km">${a.kmCaminhao?fN(num(a.kmCaminhao),0)+' km':'-'}</td><td class="n" data-r="Litros"><b>${fL(num(a.litros))}</b></td><td data-r="Local">${usoT(a.tipoUso)}</td><td data-r="Turno">${esc(a.turno==='Manha'?'Manhã':a.turno||'')}</td><td data-r="Abastecedor">${esc(a.abastecedor||'-')}</td><td data-r="Requisição">${esc(a.requisicao||'-')}</td><td class="n" data-r="Totalizador">${a.totalizador?fN(num(a.totalizador),0):'-'}</td><td class="fr-tda">${acoes('fr-abs-ed','abastecimentos',a._id)}</td></tr>`;
  function tabAbs(xs){ return xs.map(a=>`<tr><td data-r="Data">${br(dataN(a.data))}<small>${esc(a.hora||'')}</small></td><td data-r="Caminhão">${placa(a.placa)}<small>${esc(a.caminhao||'')}</small></td><td data-r="Motorista">${esc(a.motorista||'-')}</td><td class="n" data-r="Km">${a.kmCaminhao?fN(num(a.kmCaminhao),0):'-'}</td><td class="n" data-r="Litros"><b>${fL(num(a.litros))}</b></td><td data-r="Uso">${usoT(a.tipoUso)}</td></tr>`).join(''); }
  function vAbs(){ carregar(); if(!lido()) return topo('ABASTECIMENTOS','Abastecimentos')+carregando();
    const q=F.qa, t=q.q.toLowerCase();
    const xs=ord(vivos('abastecimentos').filter(a=>(!q.d||dataN(a.data)===q.d)&&(!q.u||a.tipoUso===q.u)&&(!t||[a.placa,a.caminhao,a.motorista,a.abastecedor,a.requisicao].join(' ').toLowerCase().includes(t))));
    const lit=xs.reduce((s,a)=>s+num(a.litros),0), lC=xs.filter(a=>a.tipoUso!=='Trator/Outro').reduce((s,a)=>s+num(a.litros),0);
    return topo('ABASTECIMENTOS','Abastecimentos','Lançamento dos abastecimentos feitos na frota. Cada um sai do saldo do tanque.')+formAbs()+
      filtro(busca('fr-qa',q.q,'Motorista, placa, abastecedor ou requisição')+`<label class="fr-f"><span>Data</span><input type="date" data-frq="qa.d" value="${esc(q.d)}"></label><label class="fr-f"><span>Local de consumo</span><select data-frq="qa.u"><option value="">Todos</option><option value="Caminhao"${q.u==='Caminhao'?' selected':''}>COLAFIX</option><option value="Trator/Outro"${q.u==='Trator/Outro'?' selected':''}>FIXCOL</option></select></label>`,'fr-qa-x')+
      tabela([['Data'],['Hora'],['Motorista'],['Placa'],['Km',1],['Litros',1],['Local'],['Turno'],['Abastecedor'],['Requisição'],['Totalizador',1],['Ações']],xs.slice(0,300).map(linhaTab),'Nenhum abastecimento encontrado.',
        {cab:`<div class="fr-tch"><b>${fN(xs.length,0)} abastecimento${xs.length===1?'':'s'}</b><span>${fL(lit)} · COLAFIX ${fL(lC)} · FIXCOL ${fL(lit-lC)}</span></div>`,pe:xs.length>300?'<div class="fr-sv fr-pe">Mostrando os 300 mais recentes. Use os filtros ou os Relatórios para ver o resto.</div>':''}); }

  /* ---------- Tanque ---------- */
  const tqOc=k=>!!(F.tqoc&&F.tqoc[k]);
  const secao=(k,tit,sub,corpo)=>`<section class="fr-card fr-sec${tqOc(k)?' oc':''}"><div class="fr-sech"><div><h3>${esc(tit)}</h3><small>${esc(sub)}</small></div><button class="fr-pill" data-act="fr-oc" data-v="${k}">${tqOc(k)?'Mostrar':'Ocultar'}</button></div>${tqOc(k)?'':corpo}</section>`;
  function vTq(){ carregar(); if(!lido()) return topo('TANQUE','Tanque')+carregando();
    const s=saldo(), cap=F.cfg.cap||8000, f=F.fc||(F.fc={data:hoje(),litrosCaminhoes:'',litrosTratores:'',observacao:''}), ed=f._id, q=F.qt||(F.qt={q:'',d:'',m:''}), t=q.q.toLowerCase();
    const mov=[]; vivos('compras').forEach(c=>mov.push({d:dataN(c.data),h:'',t:'Entrada · compra',o:c.observacao&&c.observacao!=='-'?c.observacao:'',C:num(c.litrosCaminhoes),T:num(c.litrosTratores)}));
    vivos('abastecimentos').forEach(a=>{ const l=num(a.litros); mov.push({d:dataN(a.data),h:a.hora||'',t:'Saída · abastecimento',o:(a.placa||'')+(a.motorista?' · '+a.motorista:''),C:a.tipoUso==='Trator/Outro'?0:-l,T:a.tipoUso==='Trator/Outro'?-l:0}); });
    mov.sort((a,b)=>(a.d+(a.h||'00:00')).localeCompare(b.d+(b.h||'00:00'))); let run=0; mov.forEach(m=>{ run+=m.C+m.T; m.s=run; }); mov.reverse();
    const mf=mov.filter(m=>(!q.d||m.d===q.d)&&(!q.m||(q.m==='e'?m.C+m.T>0:m.C+m.T<0))&&(!t||(m.t+' '+m.o).toLowerCase().includes(t)));
    const cps=ord(vivos('compras')).filter(c=>(!q.d||dataN(c.data)===q.d)&&q.m!=='s'&&(!t||String(c.observacao||'').toLowerCase().includes(t)));
    const sv=(v,cls)=>`<span class="${v<0?'fr-neg':v>0?'fr-pos'+(cls||''):'fr-mut'}">${v?(v>0?'+':'−')+fN(Math.abs(v))+' L':'·'}</span>`;
    const tq=(r,v,s,ic,cor)=>`<div class="fr-tqk ${cor}"><span class="fr-ti ${cor}">${icn(ic,20)}</span><div><b class="fr-tqn">${esc(r)}</b><b class="vv">${v}</b><small>${s}</small></div></div>`;
    return topo('TANQUE','Tanque','Controle do tanque físico de '+fL(cap)+' separado por finalidade. '+lk('mudar a capacidade','fr-go','frotacad'))+
      `<div class="fr-tqs">${tq('Capacidade',fL(cap),'Limite físico do tanque','tanque','az')}${tq('Saldo COLAFIX',fL(s.C),'Consumido: '+fL(s.uC),'caminhao',s.C<0?'vm':'vd')}${tq('Saldo FIXCOL',fL(s.T),'Consumido: '+fL(s.uT),'chave',s.T<0?'vm':'lj')}${tq('Saldo total',fL(s.tot),'Disponível no tanque','bomba',s.tot<=(F.cfg.aviso||2000)?'lj':'az')}</div>`+
      `<div class="fr-card">${ocupa(s)}</div>`+
      (pode()?`<div class="fr-card fr-form${ed?' fr-ed':''}">${ed?`<div class="fr-edt">${icn('lapis',16)} Corrigindo a compra de ${esc(br(dataN(f.data)))}</div>`:''}<div class="fr-fs c5">${campo('Data da compra',inp('fc','data',f.data,'date'))}${campo('Litros para COLAFIX',inp('fc','litrosCaminhoes',f.litrosCaminhoes,'text',' inputmode="decimal" placeholder="5000"'))}${campo('Litros para FIXCOL',inp('fc','litrosTratores',f.litrosTratores,'text',' inputmode="decimal" placeholder="3000"'))}${campo('Observação',inp('fc','observacao',f.observacao,'text',' placeholder="Opcional"'))}<div class="fr-f fr-fb">${bt(F.salv?'Salvando…':ed?'Salvar correção':'Registrar','fr-cp-ok')}${ed?bt('Cancelar','fr-cp-x',null,1):''}</div></div>
        <div class="fr-sv">Hoje cabem ${fL(Math.max(0,cap-s.tot))} no tanque.</div></div>`:'')+
      secao('fil','Filtros','Use para consultar compras e movimentações do tanque.',`<div class="fr-fil sem">${busca('fr-qt',q.q,'Movimento ou observação')}<label class="fr-f"><span>Data</span><input type="date" data-frq="qt.d" value="${esc(q.d)}"></label><label class="fr-f"><span>Movimento</span><select data-frq="qt.m"><option value="">Todos</option><option value="e"${q.m==='e'?' selected':''}>Entrada</option><option value="s"${q.m==='s'?' selected':''}>Saída</option></select></label><button class="fr-bs fr-lim" data-act="fr-qt-x" data-v="">Limpar filtros</button></div>`)+
      secao('cp','Compras de diesel','Entradas registradas no tanque.',cps.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th class="n">COLAFIX</th><th class="n">FIXCOL</th><th class="n">Total</th><th>Observação</th><th>Ações</th></tr></thead><tbody>${cps.map(c=>`<tr><td data-r="Data">${br(dataN(c.data))}</td><td class="n" data-r="COLAFIX">${fL(num(c.litrosCaminhoes))}</td><td class="n" data-r="FIXCOL">${fL(num(c.litrosTratores))}</td><td class="n" data-r="Total"><b>${fL(num(c.litrosCaminhoes)+num(c.litrosTratores))}</b></td><td data-r="Obs.">${esc(c.observacao&&c.observacao!=='-'?c.observacao:'')}</td><td class="fr-tda">${acoes('fr-cp-ed','compras',c._id)}</td></tr>`).join('')}</tbody></table></div>`:vazio('Nenhuma compra lançada.'))+
      secao('ex','Extrato de movimentações','Entradas e saídas do diesel, como uma conta corrente do tanque.',mf.length?`<div class="fr-tw"><table class="fr-t"><thead><tr><th>Data</th><th>Hora</th><th>Movimento</th><th class="n">COLAFIX</th><th class="n">FIXCOL</th><th class="n">Total</th><th class="n">Saldo</th><th>Observação</th></tr></thead><tbody>${mf.slice(0,200).map(m=>`<tr class="${m.C+m.T>0?'fr-ent':''}"><td data-r="Data">${br(m.d)}</td><td data-r="Hora">${esc(m.h||'-')}</td><td data-r="Movimento"><b>${esc(m.t)}</b></td><td class="n" data-r="COLAFIX">${sv(m.C)}</td><td class="n" data-r="FIXCOL">${sv(m.T,' lj')}</td><td class="n" data-r="Total">${sv(m.C+m.T)}</td><td class="n" data-r="Saldo"><b>${fL(m.s)}</b></td><td data-r="Obs.">${esc(m.o)}</td></tr>`).join('')}</tbody></table></div>${mf.length>200?'<div class="fr-sv">Mostrando os 200 últimos movimentos.</div>':''}`:vazio('Sem movimentos.')); }

  /* ---------- Caminhões ---------- */
  function vCam(){ carregar(); if(!lido()) return topo('CAMINHÕES','Caminhões')+carregando();
    const f=F.fk||(F.fk={placa:'',modelo:'',kmAtual:'',status:'Ativo',localConsumo:'COLAFIX'}), ed=f._id, q=F.qc, t=q.q.toLowerCase(), todos=vivos('caminhoes');
    const xs=todos.filter(c=>(!q.st||(c.status||'Ativo')===q.st)&&(!t||(c.placa+' '+(c.modelo||'')).toLowerCase().includes(t))).sort((a,b)=>String(a.placa).localeCompare(String(b.placa)));
    const n=s=>todos.filter(c=>(c.status||'Ativo')===s).length;
    return topo('CAMINHÕES','Caminhões','Cadastro dos veículos da frota. A média (km/L) e o km atual vêm dos abastecimentos.')+
      kpis([{r:'Cadastrados',v:fN(todos.length,0),ic:'caminhao',cor:'az'},{r:'Ativos',v:fN(n('Ativo'),0),ic:'caminhao',cor:'vd'},{r:'Em manutenção',v:fN(n('Manutencao'),0),ic:'chave',cor:'lj'},{r:'Parados',v:fN(n('Parado'),0),ic:'alerta',cor:'vm'}],'c4')+
      (pode()?`<div class="fr-card fr-form${ed?' fr-ed':''}">${ed?`<div class="fr-edt">${icn('lapis',16)} Editando o caminhão ${esc(f.placa)}</div>`:''}<div class="fr-fs c6">${campo('Placa',inp('fk','placa',f.placa,'text',' placeholder="ABC-1234" maxlength="8" style="text-transform:uppercase"'))}${campo('Modelo',inp('fk','modelo',f.modelo,'text',' placeholder="Ex: Volvo FH"'))}${campo('Km atual',inp('fk','kmAtual',f.kmAtual,'text',' inputmode="numeric" placeholder="Digite apenas números"'))}${campo('Status',sel('fk','status',f.status,['Ativo',['Manutencao','Manutenção'],'Parado']))}${campo('Local do diesel',sel('fk','localConsumo',f.localConsumo,['COLAFIX','FIXCOL']))}<div class="fr-f fr-fb">${bt(F.salv?'Salvando…':ed?'Salvar':'Cadastrar','fr-cam-ok')}${ed?bt('Cancelar','fr-cam-x',null,1):''}</div></div></div>`:'')+
      filtro(busca('fr-qc',q.q,'Placa ou modelo')+`<label class="fr-f"><span>Status</span><select data-frq="qc.st"><option value="">Todos</option>${['Ativo','Manutencao','Parado'].map(s=>`<option value="${s}"${q.st===s?' selected':''}>${stN(s)}</option>`).join('')}</select></label>`,'fr-qc-x')+
      tabela([['Placa'],['Modelo'],['Km atual',1],['Status'],['Local diesel'],['Média',1],['Último abastecimento'],['Ações']],xs.map(c=>{ const m=media(c.placa), u=ord(absDe(c.placa))[0], st=c.status||'Ativo';
        return `<tr><td data-r="Placa">${placa(c.placa)}</td><td data-r="Modelo"><b>${esc(c.modelo||'')}</b></td><td class="n" data-r="Km atual">${fN(kmDe(c),0)} km</td><td data-r="Status">${selo(stN(st),STC[st])}</td><td data-r="Local">${usoT(usoDoLocal(c.localConsumo))}</td><td class="n" data-r="Média"><b>${m?fN(m.m,2)+' km/L':'a calcular'}</b></td><td data-r="Último">${u?br(dataN(u.data))+' · '+fL(num(u.litros)):'-'}</td><td class="fr-tda">${lk('Relatório','fr-cam-rel',c._id,'fr-rl')}${acoes('fr-cam-ed','caminhoes',c._id)}</td></tr>`; }),'Nenhum caminhão.'); }

  /* ---------- Manutenções ---------- */
  function vMan(){ carregar(); if(!lido()) return topo('MANUTENÇÕES','Manutenções')+carregando();
    const f=F.fm||(F.fm={data:hoje(),caminhaoId:'',km:'',servicos:['Troca de oleo'],observacao:''}), ed=f._id, q=F.qm, t=q.q.toLowerCase();
    const xs=ord(vivos('manutencoes').filter(m=>(!q.s||servDe(m).includes(q.s))&&(!t||[m.caminhao,m.servico,m.observacao,m.km].join(' ').toLowerCase().includes(t))));
    const mes=hoje().slice(0,7), dm=vivos('manutencoes').filter(m=>dataN(m.data).slice(0,7)===mes), cnt={}; vivos('manutencoes').forEach(m=>servDe(m).forEach(s=>cnt[s]=(cnt[s]||0)+1)); const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    return topo('MANUTENÇÕES','Manutenções','Registro de serviços feitos nos caminhões cadastrados.')+
      kpis([{r:'Registradas',v:fN(vivos('manutencoes').length,0),ic:'chave',cor:'az'},{r:'Neste mês',v:fN(dm.length,0),ic:'relogio',cor:'vd'},{r:'Em manutenção agora',v:fN(vivos('caminhoes').filter(c=>c.status==='Manutencao').length,0),ic:'caminhao',cor:'lj',go:'frotacam'},{r:'Serviço mais feito',v:top?esc(servN(top[0])):'—',s:top?top[1]+' vezes':'',ic:'grafico',cor:'rx'}],'c4')+
      (pode()?`<div class="fr-card fr-form${ed?' fr-ed':''}">${ed?`<div class="fr-edt">${icn('lapis',16)} Corrigindo a manutenção de ${esc(br(dataN(f.data)))}</div>`:''}<div class="fr-fs c4">${campo('Data',inp('fm','data',f.data,'date'))}${campo('Caminhão cadastrado',sel('fm','caminhaoId',f.caminhaoId,[['','Selecione']].concat(vivos('caminhoes').map(c=>[c._id,camTxt(c)]))))}${campo('Km do caminhão',inp('fm','km',f.km,'text',' inputmode="numeric" placeholder="120000"'))}
        <div class="fr-f fr-sv2"><span>Serviços</span><div class="fr-chips">${SERV.map(s=>`<button class="fr-chip${f.servicos.includes(s)?' on':''}" data-act="fr-man-sv" data-v="${esc(s)}"><i></i>${esc(servN(s))}</button>`).join('')}</div></div>
        ${campo('Observação',inp('fm','observacao',f.observacao,'text',' placeholder="Opcional"'),'w2')}<div class="fr-f fr-fb w2">${bt(F.salv?'Salvando…':ed?'Salvar correção':'Cadastrar','fr-man-ok')}${ed?bt('Cancelar','fr-man-x',null,1):''}</div></div></div>`:'')+
      filtro(busca('fr-qm',q.q,'Caminhão, serviço ou km')+`<label class="fr-f"><span>Serviço</span><select data-frq="qm.s"><option value="">Todos</option>${SERV.map(s=>`<option value="${esc(s)}"${q.s===s?' selected':''}>${esc(servN(s))}</option>`).join('')}</select></label>`,'fr-qm-x')+
      tabela([['Data'],['Caminhão'],['Km',1],['Serviços'],['Observação'],['Ações']],xs.slice(0,300).map(m=>{ const c=m.caminhaoId&&camDe(m.caminhaoId), pl=c?c.placa:String(m.caminhao||'').split(' - ')[0], mo=c?c.modelo:String(m.caminhao||'').split(' - ')[1]||'';
        return `<tr><td data-r="Data">${br(dataN(m.data))}</td><td data-r="Caminhão">${placa(pl)}<small>${esc(mo)}</small></td><td class="n" data-r="Km">${m.km?fN(num(m.km),0)+' km':'-'}</td><td data-r="Serviços"><span class="fr-msv">${servDe(m).map(s=>selo(servN(s),'info')).join('')}</span></td><td data-r="Obs.">${esc(m.observacao&&m.observacao!=='-'?m.observacao:'')}</td><td class="fr-tda">${acoes('fr-man-ed','manutencoes',m._id)}</td></tr>`; }),'Nenhuma manutenção registrada ainda.'); }

  /* ---------- Relatórios ---------- */
  function vRel(){ carregar(); if(!lido()) return topo('RELATÓRIOS','Relatórios')+carregando();
    const r=F.rel, R=relDados(), s=saldo(), au=autonomia(s);
    const ant=(()=>{ if(R.de<'1') return null; const n=Math.round((new Date(R.ate+'T12:00')-new Date(R.de+'T12:00'))/864e5)+1, a=addD(R.de,-n), b=addD(R.de,-1), cam=R.cam, ab=vivos('abastecimentos').filter(x=>{ const d=dataN(x.data); return d>=a&&d<=b&&(!cam||x.placa===cam.placa); });
      return {lit:ab.reduce((t,x)=>t+num(x.litros),0),n:ab.length,cmp:vivos('compras').filter(x=>{ const d=dataN(x.data); return d>=a&&d<=b; }).reduce((t,c)=>t+num(c.litrosCaminhoes)+num(c.litrosTratores),0),man:vivos('manutencoes').filter(x=>{ const d=dataN(x.data); return d>=a&&d<=b; }).length}; })();
    const vt=(a,b)=>ant?varTxt(a,b):'';
    const fil=`<div class="fr-card fr-tabs2">${TIPOS.map(([k,t])=>`<button class="${r.tipo===k?'on':''}" data-act="fr-rel-tipo" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="fr-card fr-fil fr-relf"><div class="fr-f"><span>Período</span><div class="fr-seg">${PER.map(([k,t])=>`<button class="${r.per===k?'on':''}" data-act="fr-rel-per" data-v="${k}">${t}</button>`).join('')}</div></div>
      ${r.per==='datas'?`<label class="fr-f"><span>Data inicial</span><input type="date" data-frq="rel.de" value="${esc(R.de)}"></label><label class="fr-f"><span>Data final</span><input type="date" data-frq="rel.ate" value="${esc(R.ate)}"></label>`:''}
      <label class="fr-f"><span>Veículo</span><select data-frq="rel.cam"><option value="">Todos</option>${vivos('caminhoes').map(c=>`<option value="${esc(c._id)}"${r.cam===c._id?' selected':''}>${esc(camTxt(c))}</option>`).join('')}</select></label></div>`;
    const tab=(cols,rows,vz)=>rows.length?`<div class="fr-tw"><table class="fr-t esc"><thead><tr>${cols.map(c=>`<th${c[1]?' class="n"':''}>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:vazio(vz);
    let corpo='';
    if(r.tipo==='resumo'){ const mx=R.serie.reduce((m,x)=>x.v>m.v?x:m,{v:0,t:''}), maxAb=R.abs.reduce((m,a)=>num(a.litros)>num(m.litros||0)?a:m,{}), ult=R.abs.slice(0,5);
      corpo=kpis([{r:'Total abastecido',v:fL(R.lit),s:vt(R.lit,ant&&ant.lit)||fN(R.abs.length,0)+' abastecimentos',ic:'bomba',cor:'az'},{r:'Diesel comprado',v:fL(R.cmp),s:vt(R.cmp,ant&&ant.cmp)||fN(R.comp.length,0)+' compras',ic:'tanque',cor:'vd'},{r:'Média geral',v:R.mG?fN(R.mG,2)+' km/L':'—',s:fN(R.kmT,0)+' km rodados',ic:'medidor',cor:'rx'},{r:'Abastecimentos',v:fN(R.abs.length,0),s:vt(R.abs.length,ant&&ant.n),ic:'caminhao',cor:'lj'},{r:'Manutenções',v:fN(R.man.length,0),s:vt(R.man.length,ant&&ant.man),ic:'chave',cor:'vd'}],'cen')+
        `<div class="fr-g3 a">${card('Consumo de combustível por '+(R.sem?'semana':'dia'),area(R.serie,{tit:'Consumo'}),{sub:'Litros'})}${card('Consumo por veículo',R.veic.length?R.veic.slice(0,8).map(v=>`<div class="fr-rk sm">${placa(v.c.placa)}<span class="fr-rkb"><i style="width:${(v.l/R.veic[0].l*100).toFixed(0)}%"></i></span><b>${fL(v.l)}</b></div>`).join(''):`<div class="fr-sv">Nada no período.</div>`,{sub:'Litros'})}
          ${card('Últimos abastecimentos',ult.length?ult.map(a=>`<div class="fr-ua"><span class="fr-ti az">${icn('caminhao',16)}</span><div><b>${esc(a.placa||'-')}</b><small>${esc(a.motorista||'')}</small></div><div class="r"><b>${fL(num(a.litros))}</b><small>${esc(br(dataN(a.data)))} ${esc(a.hora||'')}</small></div></div>`).join(''):`<div class="fr-sv">Nada no período.</div>`,{})}</div>
        <div class="fr-g2 b">${card('Análise do período',`<div class="fr-an"><div><b>${fL(mx.v)}</b><small>Maior consumo (${R.sem?'semana':'dia'}) ${esc(mx.t)}</small></div><div><b>${maxAb.litros?fL(num(maxAb.litros)):'—'}</b><small>Maior abastecimento${maxAb.placa?' · '+esc(maxAb.placa):''}</small></div><div><b>${fL(R.lit/Math.max(1,R.abs.length))}</b><small>Média por abastecimento</small></div></div>`,{})}
          <section class="fr-card fr-prev"><h3>Previsão de autonomia</h3><b>${au.dias!=null?fN(au.dias,1)+' dias':'—'}</b><small>Saldo ${fL(s.tot)} / média ${au.md?fL(au.md):'—'} por dia (últimos 30 dias)</small></section></div>
        <div class="fr-g2 c">${card('Distribuição por local de consumo',rosca(R.lC,R.lT),{})}${card('Média de consumo (km/L)',R.veic.filter(v=>v.m).length?`<div class="fr-vb">${R.veic.filter(v=>v.m).slice(0,10).map(v=>{ const mx=Math.max(...R.veic.map(x=>x.m||0)); return `<div><em>${fN(v.m,2)}</em><i style="height:${(v.m/mx*100).toFixed(0)}%"></i><small>${esc(v.c.placa)}</small></div>`; }).join('')}</div>`:`<div class="fr-sv">A média aparece depois de 2 abastecimentos com km.</div>`,{})}</div>`+
        card('Detalhamento dos abastecimentos',tab([['Data/hora'],['Veículo'],['Motorista'],['Local'],['Litros',1],['Km',1],['Abastecedor']],R.abs.slice(0,200).map(a=>`<tr><td data-r="Data">${br(dataN(a.data))} ${esc(a.hora||'')}</td><td data-r="Veículo">${placa(a.placa)}</td><td data-r="Motorista">${esc(a.motorista||'-')}</td><td data-r="Local">${usoT(a.tipoUso)}</td><td class="n" data-r="Litros"><b>${fL(num(a.litros))}</b></td><td class="n" data-r="Km">${a.kmCaminhao?fN(num(a.kmCaminhao),0)+' km':'-'}</td><td data-r="Abastecedor">${esc(a.abastecedor||'-')}</td></tr>`),'Nenhum abastecimento no período.'),{}); }
    if(r.tipo==='abs') corpo=card('Abastecimentos',tab([['Data'],['Caminhão'],['Motorista'],['Km',1],['Litros',1],['Uso']],R.abs.length?[tabAbs(R.abs.slice(0,500))]:[],'Nenhum abastecimento no período.')+(R.abs.length>500?'<div class="fr-sv">Mostrando 500. O Excel tem todos.</div>':''),{sub:fN(R.abs.length,0)+' abastecimentos · '+fL(R.lit)});
    if(r.tipo==='veic') corpo=card('Consumo por veículo',tab([['Caminhão'],['Abastecimentos',1],['Litros',1],['Km rodado',1],['Média',1]],R.veic.map(v=>`<tr><td data-r="Caminhão">${placa(v.c.placa)}<small>${esc(v.c.modelo||'')}</small></td><td class="n" data-r="Abast.">${v.n}</td><td class="n" data-r="Litros">${fL(v.l)}</td><td class="n" data-r="Km">${fN(v.km,0)}</td><td class="n" data-r="Média"><b>${v.m?fN(v.m,2)+' km/L':'-'}</b></td></tr>`),'Nada no período.'),{});
    if(r.tipo==='comp') corpo=card('Compras de diesel',tab([['Data'],['COLAFIX',1],['FIXCOL',1],['Total',1],['Observação']],R.comp.map(c=>`<tr><td data-r="Data">${br(dataN(c.data))}</td><td class="n" data-r="COLAFIX">${fL(num(c.litrosCaminhoes))}</td><td class="n" data-r="FIXCOL">${fL(num(c.litrosTratores))}</td><td class="n" data-r="Total"><b>${fL(num(c.litrosCaminhoes)+num(c.litrosTratores))}</b></td><td data-r="Obs.">${esc(c.observacao&&c.observacao!=='-'?c.observacao:'')}</td></tr>`),'Nenhuma compra no período.'),{sub:'Total '+fL(R.cmp)});
    if(r.tipo==='man') corpo=card('Manutenções',tab([['Data'],['Caminhão'],['Km',1],['Serviços'],['Observação']],R.man.map(m=>`<tr><td data-r="Data">${br(dataN(m.data))}</td><td data-r="Caminhão">${esc(m.caminhao||'-')}</td><td class="n" data-r="Km">${m.km?fN(num(m.km),0):'-'}</td><td data-r="Serviços"><span class="fr-msv">${servDe(m).map(s=>selo(servN(s),'info')).join('')}</span></td><td data-r="Obs.">${esc(m.observacao&&m.observacao!=='-'?m.observacao:'')}</td></tr>`),'Nenhuma manutenção no período.'),{});
    return topo('RELATÓRIOS','Relatórios','Escolha o relatório e filtre só o que precisa · '+esc(perTxt(R)+(R.cam?' · '+R.cam.placa:'')),bt('Baixar Excel','fr-rel-xls',null,1)+bt('Baixar PDF','fr-rel-pdf'))+fil+corpo; }

  /* ---------- Cadastros ---------- */
  function vCad(){ carregar(); if(!lido()) return topo('CADASTROS','Cadastros')+carregando();
    const ab=[['mot','Motoristas',vivos('motoristas').length],['aba','Abastecedores',vivos('abastecedores').length],['tq','Tanque'],['imp','Trazer do sistema antigo']];
    let c='';
    if(F.cad==='mot'||F.cad==='aba'){ const k=F.cad==='mot'?'motoristas':'abastecedores', fk=F.cad==='mot'?'fp':'fb', f=F[fk]||(F[fk]={nome:'',matricula:'',status:'Ativo'}), xs=vivos(k).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
      c=(pode()?`<div class="fr-card fr-form${f._id?' fr-ed':''}">${f._id?`<div class="fr-edt">${icn('lapis',16)} Editando ${esc(f.nome)}</div>`:''}<div class="fr-fs c4">${campo('Nome',inp(fk,'nome',f.nome,'text',' placeholder="Nome completo"'),'w2')}${F.cad==='mot'?campo('Matrícula',inp(fk,'matricula',f.matricula)):''}${campo('Status',sel(fk,'status',f.status,['Ativo','Inativo']))}<div class="fr-f fr-fb">${bt(F.salv?'Salvando…':f._id?'Salvar':'Cadastrar','fr-pes-ok',F.cad)}${f._id?bt('Cancelar','fr-pes-x',F.cad,1):''}</div></div></div>`:'')+
        tabela([['Nome']].concat(F.cad==='mot'?[['Matrícula']]:[]).concat([['Status'],['Abastecimentos',1],['Ações']]),xs.map(m=>{ const nA=vivos('abastecimentos').filter(a=>(F.cad==='mot'?a.motorista:a.abastecedor)===m.nome).length;
          return `<tr><td data-r="Nome"><span class="fr-nm">${U()?U().ini(m.nome):''}<b>${esc(m.nome)}</b></span></td>${F.cad==='mot'?`<td data-r="Matrícula">${esc(m.matricula||'-')}</td>`:''}<td data-r="Status">${selo(m.status||'Ativo',STC[m.status||'Ativo'])}</td><td class="n" data-r="Abast.">${nA}</td><td class="fr-tda">${acoes('fr-pes-ed',k,m._id,F.cad+':'+m._id)}</td></tr>`; }),'Ninguém cadastrado.'); }
    if(F.cad==='tq') c=card('Tanque de diesel',`<div class="fr-fs c4">${campo('Capacidade do tanque (L)',`<input id="fr-cap" inputmode="numeric" value="${esc(F.cfg.cap||8000)}">`)}${campo('Avisar para pedir diesel com (L)',`<input id="fr-avi" inputmode="numeric" value="${esc(F.cfg.aviso||2000)}">`)}${pode()?`<div class="fr-f fr-fb">${bt('Salvar','fr-cfg-ok')}</div>`:''}</div>
      <div class="fr-sv">O aviso aparece no Painel da frota e no Meu dia quando o saldo total chega nesse número.</div>`,{ic:'tanque'});
    if(F.cad==='imp'){ const I=F.imp;
      c=card('Trazer os dados do sistema antigo da frota',`<ol class="fr-steps"><li>No sistema antigo, abra <b>Configurações</b> e toque em <b>Baixar backup do servidor</b>.</li><li>Escolha aqui o arquivo <b>backup-frota-….json</b>.</li><li>Confira o que vai entrar e toque em <b>Gravar no painel</b>.</li></ol>
        <p class="fr-sv">Pode trazer de novo depois: o que já veio é atualizado, sem repetir. <b>Os usuários e senhas do sistema antigo não entram</b> — aqui cada pessoa entra com o login do painel.</p>
        ${pode()?`<label class="fr-bs fr-file">Escolher o arquivo do backup<input type="file" accept=".json,application/json" id="fr-impf" hidden></label>`:''}
        ${I&&I.erro?`<div class="fr-msg crit">${esc(I.erro)}</div>`:''}
        ${I&&I.L?`<div class="fr-imp"><div class="fr-sv">Arquivo: <b>${esc(I.nome)}</b>${I.em?' · gerado em '+esc(br(String(I.em).slice(0,10))):''}</div><div class="fr-tw"><table class="fr-t"><thead><tr><th>O quê</th><th class="n">No arquivo</th><th class="n">Novos</th><th class="n">Já estavam (atualiza)</th></tr></thead><tbody>
          ${COLS.map(k=>{ const xs=I.L[k]||[], ja=xs.filter(x=>F[k].some(y=>y._id==='i'+x.id)).length; return `<tr><td>${esc({caminhoes:'Caminhões',motoristas:'Motoristas',abastecedores:'Abastecedores',abastecimentos:'Abastecimentos',compras:'Compras de diesel',manutencoes:'Manutenções'}[k])}</td><td class="n">${xs.length}</td><td class="n"><b>${xs.length-ja}</b></td><td class="n">${ja}</td></tr>`; }).join('')}</tbody></table></div>
          ${I.us?`<div class="fr-sv">${I.us} usuários do sistema antigo ficaram de fora (com senha).</div>`:''}
          <div class="fr-bts">${bt(I.st==='gravando'?'Gravando… '+(I.prog||''):'Gravar no painel','fr-imp-ok')}${bt('Cancelar','fr-imp-x',null,1)}</div></div>`:''}
        ${I&&I.st==='ok'?`<div class="fr-msg ok">Pronto: ${I.n} registros gravados.</div>`:''}`,{ic:'tanque',cor:'vd'}); }
    return topo('CADASTROS','Cadastros','Motoristas, abastecedores, tanque e dados do sistema antigo.')+`<div class="fr-card fr-tabs2">${ab.map(([k,t,n])=>`<button class="${F.cad===k?'on':''}" data-act="fr-cad" data-v="${k}">${t}${n!=null?` <span>${n}</span>`:''}</button>`).join('')}</div>`+c; }
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
    const bq={'fr-qa':'qa','fr-qc':'qc','fr-qm':'qm','fr-qt':'qt'}[t.id]; if(bq){ F[bq].q=t.value; const pos=t.selectionStart; P.render(); const x=document.getElementById(t.id); if(x){ x.focus(); try{ x.setSelectionRange(pos,pos); }catch(e){} } } });
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
      case 'fr-qc-x': F.qc={q:'',st:''}; break; case 'fr-qm-x': F.qm={q:'',s:''}; break; case 'fr-qt-x': F.qt={q:'',d:'',m:''}; break;
      case 'fr-oc': F.tqoc=F.tqoc||{}; F.tqoc[v]=!F.tqoc[v]; break;
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
    } }catch(e){ P.erro(e); } P.render(); if(/-ed$/.test(a)) try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){} });
  document.head.insertAdjacentHTML('beforeend',`<style id="fr-css">
  /* Frota · layout do sistema de referência: cartões brancos com sombra azulada, ícones em quadros coloridos, números fortes, botão em degradê azul */
  #view:has(.fr-top){--fr-az:#2563eb;--fr-azc:#e9f0ff;--fr-vd:#059669;--fr-vdc:#e6f9f0;--fr-lj:#ea580c;--fr-ljc:#fff1e6;--fr-rx:#6d5dfc;--fr-rxc:#f1edff;--fr-vm:#dc2626;--fr-vmc:#fdecec;--fr-tx:#0f1f3d;--fr-tx2:#5b6b86;--fr-ln:#e5ebf5;--fr-sup:#fff;--fr-sup2:#f5f8fe;--fr-sb:0 1px 2px rgba(16,40,90,.05),0 10px 28px rgba(37,99,235,.07)}
  :root[data-theme="dark"] #view:has(.fr-top){--fr-azc:#16264a;--fr-vdc:#0f2e24;--fr-ljc:#3a2312;--fr-rxc:#241f4a;--fr-vmc:#3a1717;--fr-tx:#e8eefb;--fr-tx2:#9aabc6;--fr-ln:#24324c;--fr-sup:#121c2e;--fr-sup2:#18243a;--fr-az:#5b8cff;--fr-vd:#34d399;--fr-lj:#fb923c;--fr-rx:#a399ff;--fr-vm:#f87171;--fr-sb:0 1px 2px rgba(0,0,0,.3)}
  .fr-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;margin:4px 0 20px}.fr-top h1{margin:2px 0 4px;font-size:32px;font-weight:800;letter-spacing:-.5px;color:var(--fr-tx)}.fr-top p{margin:0;color:var(--fr-tx2);font-weight:500}
  .fr-ey{font-size:11px;font-weight:700;letter-spacing:1.2px;color:var(--fr-tx2)}.fr-ac{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .fr-wid{display:flex;gap:12px;flex-wrap:wrap}.fr-wid>div{background:var(--fr-sup);border:1px solid var(--fr-ln);border-radius:14px;padding:12px 16px;min-width:190px;box-shadow:var(--fr-sb)}
  .fr-wid small{display:block;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--fr-tx2)}.fr-wid b{display:block;font-size:22px;font-weight:800;color:var(--fr-tx);margin:2px 0}.fr-wid span{font-size:12px;color:var(--fr-tx2);font-weight:500}
  .fr-card{background:var(--fr-sup);border:1px solid var(--fr-ln);border-radius:18px;box-shadow:var(--fr-sb);padding:20px 22px;margin-bottom:18px;min-width:0;color:var(--fr-tx)}
  .fr-ch{display:flex;align-items:center;gap:14px;margin:0 0 14px}.fr-cht{flex:1;min-width:0}.fr-ch h3{margin:0;font-size:18px;font-weight:800;color:var(--fr-tx)}.fr-ch small{display:block;color:var(--fr-tx2);font-weight:500;font-size:13px;margin-top:2px}.fr-chr{display:flex;gap:8px;align-items:center}
  .fr-ti{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;flex:none}.fr-ti.az{background:var(--fr-azc);color:var(--fr-az)}.fr-ti.vd{background:var(--fr-vdc);color:var(--fr-vd)}.fr-ti.lj{background:var(--fr-ljc);color:var(--fr-lj)}.fr-ti.rx{background:var(--fr-rxc);color:var(--fr-rx)}.fr-ti.vm{background:var(--fr-vmc);color:var(--fr-vm)}
  .fr-pill{border:0;background:var(--fr-azc);color:var(--fr-az);font:inherit;font-weight:700;font-size:13px;padding:8px 16px;border-radius:999px;cursor:pointer}
  .fr-bp{border:0;background:linear-gradient(135deg,#2563eb,#6d5dfc);color:#fff;font:inherit;font-weight:700;font-size:14px;padding:11px 22px;border-radius:12px;cursor:pointer;box-shadow:0 8px 20px rgba(37,99,235,.28);min-height:44px}.fr-bp:hover{filter:brightness(1.06)}
  .fr-bs{border:0;background:var(--fr-azc);color:var(--fr-az);font:inherit;font-weight:700;font-size:14px;padding:11px 20px;border-radius:12px;cursor:pointer;min-height:44px}
  .fr-kp{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-bottom:18px}.fr-kp.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
  .fr-k{display:flex;align-items:center;gap:14px;background:var(--fr-sup);border:1px solid var(--fr-ln);border-radius:18px;padding:18px;box-shadow:var(--fr-sb);min-width:0}.fr-k[data-go]{cursor:pointer;transition:transform .15s}.fr-k[data-go]:hover{transform:translateY(-2px)}
  .fr-k>div{min-width:0;flex:1;text-align:center}.fr-k small{display:block;font-size:13px;font-weight:700;color:var(--fr-tx2)}.fr-k b{display:block;font-size:26px;font-weight:800;letter-spacing:-.5px;margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fr-k span{font-size:12px;font-weight:600;color:var(--fr-tx2)}
  .fr-k.az b{color:var(--fr-az)}.fr-k.vd b{color:var(--fr-vd)}.fr-k.lj b{color:var(--fr-lj)}.fr-k.rx b{color:var(--fr-rx)}.fr-k.vm b{color:var(--fr-vm)}
  .fr-kp.cen .fr-k{flex-direction:column;text-align:center;gap:8px}.fr-kp.cen .fr-k small{font-size:15px;color:var(--fr-tx)}
  .fr-up{color:var(--fr-vd);font-weight:700}.fr-dn{color:var(--fr-vm);font-weight:700}.fr-eq{color:var(--fr-vd);font-weight:700}.fr-vs{color:var(--fr-tx2)}
  .fr-al{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-radius:16px;padding:16px 20px;margin-bottom:18px;border:1px solid}.fr-al>div{flex:1;min-width:220px}.fr-al b{display:block;font-weight:800}.fr-al span{font-size:13px;font-weight:500}
  .fr-al.warn{background:var(--fr-ljc);border-color:#fdba74;color:#9a3412}.fr-al.crit{background:var(--fr-vmc);border-color:#fca5a5;color:#991b1b}:root[data-theme="dark"] .fr-al.warn{color:#fdba74}:root[data-theme="dark"] .fr-al.crit{color:#fca5a5}
  .fr-mnc{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;background:var(--fr-sup);border:1px solid var(--fr-ln);border-left:5px solid var(--fr-lj);border-radius:14px;padding:14px 20px;margin-bottom:18px;box-shadow:var(--fr-sb)}.fr-mnc b{font-weight:800}.fr-mnc span{flex:1;color:var(--fr-tx2);font-size:13px;font-weight:500}
  .fr-g3{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1.25fr) minmax(0,.9fr);gap:18px}.fr-g3.a{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)}
  .fr-g2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.fr-g2.b{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}.fr-g2.c{grid-template-columns:minmax(0,1fr) minmax(0,1.6fr)}
  .fr-g3>.fr-card,.fr-g2>.fr-card,.fr-g2>section{margin-bottom:18px}
  .fr-area{width:100%;height:200px;display:block}.fr-area .g{stroke:var(--fr-ln);stroke-width:1}.fr-area .ax{fill:var(--fr-tx2);font-size:11px;font-weight:600}.fr-area .ar{fill:rgba(37,99,235,.12)}.fr-area .ln{fill:none;stroke:var(--fr-az);stroke-width:2.5;stroke-linejoin:round}
  .fr-area .md{stroke:#94a3b8;stroke-width:1.5;stroke-dasharray:5 4}.fr-area .pt{fill:var(--fr-sup);stroke:var(--fr-az);stroke-width:2}.fr-area .pt.hj{fill:var(--fr-az)}
  .fr-leg{display:flex;gap:18px;font-size:12px;font-weight:700;color:var(--fr-tx2);margin-top:6px}.fr-leg i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px}.fr-leg i.ln{background:var(--fr-az)}.fr-leg i.md{background:repeating-linear-gradient(90deg,#94a3b8 0 5px,transparent 5px 9px)}
  .fr-rosca{display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding:6px 0}.fr-rd{width:150px;height:150px;border-radius:50%;background:conic-gradient(var(--fr-az) 0 var(--p),var(--fr-lj) var(--p) 100%);display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 10px 24px rgba(37,99,235,.18)}
  .fr-rd>div{width:96px;height:96px;border-radius:50%;background:var(--fr-sup);display:flex;flex-direction:column;align-items:center;justify-content:center}.fr-rd b{font-size:20px;font-weight:800}.fr-rd small{font-size:11px;color:var(--fr-tx2);font-weight:600}
  .fr-rl{flex:1;min-width:160px;display:flex;flex-direction:column;gap:10px}.fr-rl>div{display:grid;grid-template-columns:14px 1fr auto auto;gap:8px;align-items:center;font-size:13px}.fr-rl i{width:12px;height:12px;border-radius:3px}.fr-rl i.c{background:var(--fr-az)}.fr-rl i.f{background:var(--fr-lj)}
  .fr-rl span{font-weight:700;color:var(--fr-tx2)}.fr-rl b{font-weight:800}.fr-rl em{font-style:normal;color:var(--fr-tx2);font-weight:600;min-width:38px;text-align:right}.fr-rl .fr-rt{grid-template-columns:1fr auto;border-top:1px solid var(--fr-ln);padding-top:10px}
  .fr-dc b{display:block;font-size:38px;font-weight:800;color:var(--fr-az);letter-spacing:-1px}.fr-dc>span{color:var(--fr-tx2);font-weight:600;font-size:13px}.fr-dc p{margin:14px 0 6px;font-size:14px}.fr-dc small{color:var(--fr-tx2);font-size:11px;font-weight:600}
  .fr-sp{width:100%;height:64px;display:block;margin-top:8px}.fr-sp polygon{fill:rgba(37,99,235,.12)}.fr-sp polyline{fill:none;stroke:var(--fr-az);stroke-width:2.5;stroke-linejoin:round}
  .fr-rk{display:grid;grid-template-columns:34px auto minmax(0,1fr) minmax(80px,1.2fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--fr-ln);font-size:14px}.fr-rk:first-of-type{border-top:0}
  .fr-rk.sm{grid-template-columns:auto minmax(60px,1fr) auto}.fr-rkn{font-weight:800;color:var(--fr-tx2);text-align:center}.fr-rk.top .fr-rkn{color:var(--fr-vd)}.fr-rkm{color:var(--fr-tx2);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fr-rkb{display:block;width:100%;min-width:60px;height:10px;border-radius:6px;background:var(--fr-sup2)}.fr-rkb i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#2563eb,#60a5fa)}.fr-rk.top .fr-rkb i{background:linear-gradient(90deg,#059669,#34d399)}.fr-rk.low .fr-rkb i{background:linear-gradient(90deg,#ea580c,#fb923c)}.fr-rk b{font-weight:800;white-space:nowrap}
  .fr-pl{display:inline-flex;align-items:stretch;border:1.5px solid var(--fr-tx);border-radius:6px;overflow:hidden;font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1;background:#fff;vertical-align:middle;flex:none}
  .fr-pl i{font-style:normal;font-size:8px;font-weight:700;background:#1e4fa8;color:#fff;padding:5px 3px;display:flex;align-items:center}.fr-pl b{white-space:nowrap;font-size:13px;font-weight:700;padding:4px 7px;letter-spacing:.8px;color:#0f1f3d}
  .fr-selo{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:4px 11px;border-radius:999px;background:var(--fr-sup2);color:var(--fr-tx2);white-space:nowrap}
  .fr-selo.ok{background:var(--fr-vdc);color:var(--fr-vd)}.fr-selo.warn{background:var(--fr-ljc);color:var(--fr-lj)}.fr-selo.crit{background:var(--fr-vmc);color:var(--fr-vm)}.fr-selo.info{background:var(--fr-azc);color:var(--fr-az)}
  .fr-uso{font-size:11px;font-weight:800;letter-spacing:.4px;padding:4px 10px;border-radius:999px;white-space:nowrap}.fr-uso.c{background:var(--fr-azc);color:var(--fr-az)}.fr-uso.f{background:var(--fr-ljc);color:var(--fr-lj)}
  /* formulários (em cima, como no sistema de referência) */
  .fr-form{padding:20px 22px}.fr-fs{display:grid;gap:14px 16px;align-items:end}.fr-fs.c4{grid-template-columns:repeat(4,minmax(0,1fr))}.fr-fs.c5{grid-template-columns:repeat(5,minmax(0,1fr))}.fr-fs.c6{grid-template-columns:repeat(6,minmax(0,1fr))}
  .fr-f{display:flex;flex-direction:column;gap:6px;min-width:0}.fr-f>span{font-size:13px;font-weight:700;color:var(--fr-tx)}.fr-f.w2{grid-column:span 2}
  .fr-f input,.fr-f select{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--fr-ln);border-radius:12px;background:var(--fr-sup);color:var(--fr-tx);font:inherit;font-size:14px;font-weight:600;min-height:44px}
  .fr-f input::placeholder{color:#94a3b8;font-weight:500}.fr-f input:focus,.fr-f select:focus{outline:0;border-color:var(--fr-az);box-shadow:0 0 0 4px rgba(37,99,235,.14)}.fr-f select:disabled{opacity:.75}
  .fr-fb{flex-direction:row;gap:8px}.fr-fb .fr-bp{flex:1}.fr-dica{font-size:12px;color:var(--fr-tx2);gap:2px;font-weight:500}.fr-dica b{color:var(--fr-tx)}
  .fr-ed{border-color:var(--fr-az);box-shadow:0 0 0 3px rgba(37,99,235,.12),var(--fr-sb)}.fr-edt{display:flex;align-items:center;gap:8px;color:var(--fr-az);font-weight:800;margin-bottom:14px}
  .fr-msg{margin:14px 0 0;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;background:var(--fr-azc);color:var(--fr-tx)}.fr-msg.crit{background:var(--fr-vmc);color:var(--fr-vm)}.fr-msg.warn{background:var(--fr-ljc);color:var(--fr-lj)}.fr-msg.ok{background:var(--fr-vdc);color:var(--fr-vd)}
  .fr-sv2{grid-column:span 4}.fr-chips{display:flex;gap:8px;flex-wrap:wrap}.fr-chip{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--fr-ln);background:var(--fr-sup);border-radius:12px;padding:9px 14px;cursor:pointer;color:var(--fr-tx);font:inherit;font-weight:700;font-size:13px}
  .fr-chip i{width:16px;height:16px;border-radius:5px;border:1.5px solid #94a3b8;display:inline-block}.fr-chip.on{border-color:var(--fr-az);background:var(--fr-azc);color:var(--fr-az)}.fr-chip.on i{background:var(--fr-az) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E") center/12px no-repeat;border-color:var(--fr-az)}
  .fr-fil{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;padding:16px 22px}.fr-fil.sem{padding:0;border:0;box-shadow:none;margin:0}.fr-fil .fr-f{flex:1;min-width:170px}.fr-fil .fr-bus{flex:2;min-width:240px}.fr-lim{flex:0 0 auto;min-width:150px}
  /* tabelas */
  .fr-tc{padding:0;overflow:hidden}.fr-tch{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:16px 22px 0}.fr-tch b{font-weight:800}.fr-tch span{color:var(--fr-tx2);font-weight:600;font-size:13px}
  .fr-tw{overflow-x:auto}.fr-t{width:100%;border-collapse:collapse;font-size:14px}.fr-t th{text-align:left;font-size:13px;font-weight:700;color:var(--fr-tx2);padding:14px 14px;border-bottom:1px solid var(--fr-ln);white-space:nowrap;background:var(--fr-sup2)}
  .fr-tc .fr-t th:first-child,.fr-tc .fr-t td:first-child{padding-left:22px}.fr-t td{padding:13px 14px;border-bottom:1px solid var(--fr-ln);vertical-align:middle;font-weight:600}.fr-t tr:last-child td{border-bottom:0}.fr-t tbody tr:hover td{background:var(--fr-sup2)}
  .fr-t td small{display:block;color:var(--fr-tx2);font-size:12px;font-weight:500;margin-top:3px}.fr-t .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.fr-t b{font-weight:800}
  .fr-t.esc th{background:#0f2a5c;color:#fff;font-size:12px;letter-spacing:.5px;text-transform:uppercase;border:0}.fr-t.esc{border-radius:12px;overflow:hidden}
  .fr-tda{white-space:nowrap;text-align:right}.fr-acs{display:inline-flex;gap:4px}.fr-ib{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;border-radius:10px;border:0;background:none;cursor:pointer;font:inherit;font-weight:700;font-size:12px}
  .fr-ib.ed{color:var(--fr-az)}.fr-ib.x{color:var(--fr-vm)}.fr-ib:hover{background:var(--fr-sup2)}.fr-ib.cf{background:var(--fr-vm);color:#fff;padding:0 10px}.fr-rl.lnk,.fr-tda .lnk{margin-right:6px;font-weight:700}
  .fr-pe{padding:12px 22px 16px;text-align:right}.fr-vt{font-weight:800}.fr-ent td{background:rgba(5,150,105,.04)}
  .fr-nm{display:inline-flex;align-items:center;gap:10px}.fr-neg{color:var(--fr-vm);font-weight:800}.fr-pos{color:var(--fr-vd);font-weight:800}.fr-pos.lj{color:var(--fr-lj)}.fr-mut{color:var(--fr-tx2)}.fr-msv{display:inline-flex;flex-wrap:wrap;gap:6px}
  /* tanque */
  .fr-tqs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:18px}
  .fr-tqk{position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;background:var(--fr-sup);border:1px solid var(--fr-ln);border-left:5px solid;border-radius:18px;padding:22px 20px;box-shadow:var(--fr-sb)}
  .fr-tqk::after{content:"";position:absolute;right:-30px;top:-40px;width:120px;height:120px;border-radius:50%;opacity:.5}.fr-tqk>div{position:relative;z-index:1;min-width:0}
  .fr-tqk .fr-tqn{display:block;font-size:18px;font-weight:800;color:var(--fr-tx)}.fr-tqk .vv{display:block;font-size:30px;font-weight:800;letter-spacing:-.5px;white-space:nowrap}.fr-tqk small{font-size:12px;font-weight:700;color:var(--fr-tx2)}
  .fr-tqk.az{border-left-color:var(--fr-az)}.fr-tqk.az .vv{color:var(--fr-az)}.fr-tqk.az::after{background:var(--fr-azc)}.fr-tqk.vd{border-left-color:var(--fr-vd)}.fr-tqk.vd .vv{color:var(--fr-vd)}.fr-tqk.vd::after{background:var(--fr-vdc)}
  .fr-tqk.lj{border-left-color:var(--fr-lj)}.fr-tqk.lj .vv{color:var(--fr-lj)}.fr-tqk.lj::after{background:var(--fr-ljc)}.fr-tqk.vm{border-left-color:var(--fr-vm)}.fr-tqk.vm .vv{color:var(--fr-vm)}.fr-tqk.vm::after{background:var(--fr-vmc)}
  .fr-oc .fr-och{display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px}.fr-och b{font-weight:800}.fr-och span{font-weight:800;color:var(--fr-az)}
  .fr-ocb{position:relative;height:22px;border-radius:11px;background:var(--fr-sup2);display:flex;overflow:hidden}.fr-ocb i{display:block;height:100%}.fr-ocb i.c{background:linear-gradient(90deg,#1e3a8a,#2563eb)}.fr-ocb i.f{background:linear-gradient(90deg,#ea580c,#fb923c)}.fr-ocb u{position:absolute;top:0;bottom:0;width:3px;background:#facc15}
  .fr-ocl{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;font-size:13px;font-weight:600;color:var(--fr-tx2)}.fr-ocl span{display:inline-flex;align-items:center;gap:6px}.fr-ocl i{width:10px;height:10px;border-radius:3px}.fr-ocl i.c{background:#2563eb}.fr-ocl i.f{background:#ea580c}.fr-ocl i.v{background:var(--fr-ln)}.fr-ocl i.a{background:#facc15}
  .fr-sec .fr-sech{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.fr-sec.oc .fr-sech{margin:0}.fr-sech h3{margin:0;font-size:18px;font-weight:800}.fr-sech small{color:var(--fr-tx2);font-weight:500}
  /* relatórios */
  .fr-tabs2{display:flex;gap:8px;flex-wrap:wrap;padding:12px}.fr-tabs2 button{border:0;background:var(--fr-azc);color:var(--fr-tx);font:inherit;font-weight:700;padding:10px 16px;border-radius:12px;cursor:pointer}.fr-tabs2 button.on{background:linear-gradient(135deg,#2563eb,#6d5dfc);color:#fff;box-shadow:0 6px 16px rgba(37,99,235,.28)}.fr-tabs2 button span{opacity:.75;font-size:12px;margin-left:4px}
  .fr-seg{display:flex;flex-wrap:wrap;gap:4px;background:var(--fr-sup2);padding:4px;border-radius:12px}.fr-seg button{border:0;background:none;padding:8px 12px;border-radius:9px;cursor:pointer;color:var(--fr-tx2);font:inherit;font-weight:700;font-size:13px}.fr-seg button.on{background:var(--fr-sup);color:var(--fr-az);box-shadow:0 2px 6px rgba(37,99,235,.15)}
  .fr-relf .fr-f:first-child{flex:3}
  .fr-ua{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--fr-ln)}.fr-ua:first-of-type{border-top:0}.fr-ua .fr-ti{width:34px;height:34px;border-radius:50%}.fr-ua b{font-weight:800;display:block}.fr-ua small{color:var(--fr-tx2);font-size:12px;font-weight:600}.fr-ua .r{text-align:right}.fr-ua .r b{color:var(--fr-az)}
  .fr-an{display:grid;grid-template-columns:repeat(3,1fr)}.fr-an>div{padding:4px 16px;border-left:1px solid var(--fr-ln)}.fr-an>div:first-child{border:0;padding-left:0}.fr-an b{display:block;font-size:28px;font-weight:800;color:var(--fr-az)}.fr-an small{color:var(--fr-tx2);font-weight:600;font-size:13px}
  .fr-prev{background:linear-gradient(135deg,var(--fr-ljc),var(--fr-sup))}.fr-prev h3{margin:0 0 10px;font-size:18px;font-weight:800}.fr-prev b{display:block;font-size:32px;font-weight:800;color:#c2410c}.fr-prev small{color:#c2410c;font-weight:700}
  .fr-vb{display:flex;align-items:flex-end;gap:18px;height:200px;padding-top:24px;overflow-x:auto}.fr-vb>div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:48px}.fr-vb i{display:block;width:34px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#34d399,#10b981);min-height:4px}
  .fr-vb em{font-style:normal;font-weight:800;font-size:13px;margin-bottom:4px}.fr-vb small{font-size:11px;font-weight:700;color:var(--fr-tx2);margin-top:6px;white-space:nowrap}
  .fr-vz{display:flex;flex-direction:column;align-items:center;gap:6px;padding:30px 10px;color:var(--fr-tx2);text-align:center}.fr-vz svg{opacity:.5}.fr-vz b{color:var(--fr-tx);font-weight:700}.fr-vz span{font-size:13px}
  .fr-sv{color:var(--fr-tx2);font-size:13px;font-weight:500;padding:6px 0}.fr-steps{margin:0 0 10px;padding-left:20px;line-height:1.9;font-size:14px}.fr-file{display:inline-flex;cursor:pointer;margin:6px 0}.fr-imp{margin-top:12px}.fr-bts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
  @media (max-width:1300px){ .fr-kp{grid-template-columns:repeat(3,minmax(0,1fr))}.fr-fs.c6{grid-template-columns:repeat(3,minmax(0,1fr))}.fr-fs.c5{grid-template-columns:repeat(3,minmax(0,1fr))}.fr-tqs{grid-template-columns:repeat(2,minmax(0,1fr))}.fr-g3,.fr-g3.a{grid-template-columns:1fr 1fr}.fr-g3>:first-child{grid-column:1/-1} }
  @media (max-width:900px){ .fr-g2,.fr-g2.b,.fr-g2.c,.fr-g3,.fr-g3.a{grid-template-columns:1fr}.fr-kp,.fr-kp.c4{grid-template-columns:1fr 1fr}.fr-fs.c4,.fr-fs.c5,.fr-fs.c6{grid-template-columns:1fr 1fr}.fr-sv2{grid-column:1/-1}.fr-wid>div{min-width:0;flex:1} }
  @media (max-width:640px){ .fr-top h1{font-size:26px}.fr-card{padding:16px}.fr-k{padding:14px;gap:10px}.fr-k b{font-size:20px}.fr-tqs{grid-template-columns:1fr}.fr-an{grid-template-columns:1fr}.fr-an>div{border:0;padding:6px 0}
    .fr-t thead{display:none}.fr-t tr{display:block;border-bottom:1px solid var(--fr-ln);padding:10px 16px}.fr-t td{display:flex;justify-content:space-between;gap:10px;border:0;padding:4px 0!important;text-align:right}.fr-t td[data-r]::before{content:attr(data-r);color:var(--fr-tx2);font-size:12px;font-weight:600;text-align:left}.fr-t td small{display:inline;margin:0 0 0 6px} }
  </style>`);
})();
