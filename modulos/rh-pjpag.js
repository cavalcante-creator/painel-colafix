/* ===================== RH · PAGAMENTO DOS PJ (pedido de 04/11) =====================
   Antes: o RH conferia o Face ID e montava à mão a planilha "Horas trabalhadas Zenith / NEXUS" por quinzena
   (entrada e saída do dia, tolerância de 5 min que "encaixa" no horário, menos o intervalo, × valor da hora, − desconto).
   Agora o painel faz a mesma conta pelo Face ID (rh/dados/almoco, o mesmo do Almoço/café), o RH confere e fecha o valor,
   e o PJ recebe um link (nota.html?c=CÓDIGO, sem login) com o período, as horas e o valor, para emitir a nota fiscal e mandar
   por ali. O painel lê o XML da NFS-e (padrão nacional) e confere valor, CNPJ do prestador e da empresa.
   Dados (regra rh/{resto=**}: só a dona e quem tem o RH):
     rh/dados/pjpag/{pid}     pid = AAAA-MM-1 (dias 1 a 15) · AAAA-MM-2 (16 ao fim) · AAAA-MM (mês inteiro)
                              {pid,de,ate,em, pes:{fid:{st,desc,descMot,aj:{dia:{e,s,mot,por,em}},fech,ped,nota,conf,pago,hist[]}}}
                              st: '' (conferindo) · fechado · pedido · chegou · conferida · pago
     rh/dados/pjnotaped/{t}   o pedido que o PJ lê pelo link (regra: get para todos, como os convites)
     rh/dados/pjnotaenv/{t}   o que o PJ manda (regra: só cria, uma vez, enquanto o pedido vale)
     funcionarios/{id}.pjPag  {vh (R$/hora), ini, fim, intv (min), fixo (valor fixo no período, sem horas)}
     rh/config.pjPag          {modo:'quinzena'|'mes', tol, dentro (só conta dentro do horário), ini, fim, intv, horasMes, msg, dias}
     rh/dados/pjpag/{pid}.cw  {EMPRESA:{em,por,total (centavos),n}} — medição mandada ao Conectwork ("Enviar ao Conectwork")
   Usado pelo rh.js: window.RHPJPag.render(ctx) · .avisos(ctx). Prefixo `pjp`. */
(function(){
  const COL='rh/dados/pjpag', PED='rh/dados/pjnotaped', ENV='rh/dados/pjnotaenv';
  const PAD={modo:'quinzena',tol:5,dentro:false,ini:'07:30',fim:'17:18',intv:60,horasMes:220,dias:30,
    msg:'Olá, {NOME}! Fechamos {PERIODO}: {HORAS} trabalhadas, total de {VALOR}.\nPor favor, emita a nota fiscal de serviço para {EMPRESA} (CNPJ {CNPJ}) e mande por este link:\n{LINK}'};
  const ST={'':['Conferir as horas','warn'],fechado:['Valor fechado','teal'],pedido:['Nota pedida','teal'],chegou:['Nota chegou · conferir','warn'],conferida:['Nota conferida','ok'],pago:['Pago','ok']};
  const J={per:'',docs:{},sub:{},envSub:false,env:{},ab:'',q:'',emp:'',cfgAb:false,mod:null,proc:{},fid:{},carr:{}};
  let C=null;
  /* ---------- utilidades ---------- */
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const dig=s=>String(s||'').replace(/\D/g,'');
  const pad2=n=>String(n).padStart(2,'0');
  const isoD=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  const br=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
  const brc=d=>br(d).slice(0,5);
  const min=h=>{ const m=String(h||'').match(/^(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
  const hhmm=m=>m==null?'':pad2(Math.floor(m/60))+':'+pad2(m%60);
  const hTxt=m=>{ m=Math.round(+m||0); return Math.floor(m/60)+'h'+pad2(m%60); };
  const hDec=m=>((+m||0)/60);
  const R$=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const n2=v=>(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  /* aceita vírgula ou ponto: o último separador é o decimal (22,7272 · 22.7272 · 1.234,56 · 1,234.56); só pontos em grupos de 3 (5.000) = milhar */
  const num=v=>{ if(typeof v==='number') return v; let s=String(v||'').replace(/[^\d,.-]/g,''); if(!s) return 0;
    const c=s.lastIndexOf(','), d=s.lastIndexOf('.');
    if(c>=0&&d>=0){ const dec=c>d?',':'.'; s=s.split(dec===','?'.':',').join('').replace(dec,'.'); }
    else if(c>=0) s=s.replace(/,/g,(m,i)=>i===c?'.':'');
    else if(d>=0&&/^-?\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
    else if(d>=0) s=s.replace(/\./g,(m,i)=>i===d?'.':'');
    return +s||0; };
  const agora=()=>new Date().toISOString();
  const hojeS=()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const fCNPJ=s=>{ const d=dig(s); return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):s||''; };
  const cfg=c=>Object.assign({},PAD,((c||C).R.cfg||{}).pjPag||{});
  /* ---------- período ---------- */
  const fimMes=(y,m)=>new Date(y,m,0).getDate();
  function perDe(pid){ const m=String(pid||'').match(/^(\d{4})-(\d{2})(?:-([12]))?$/); if(!m) return null; const y=+m[1], mo=+m[2], q=m[3], f=fimMes(y,mo), b=m[1]+'-'+m[2]+'-';
    const de=q==='2'?b+'16':b+'01', ate=q==='1'?b+'15':b+pad2(f);
    return {pid,de,ate,mes:m[1]+'-'+m[2],txt:(q?(q==='1'?'1 a 15':'16 a '+f)+'/'+m[2]+'/'+m[1]:'mês '+m[2]+'/'+m[1])+'',curto:(q?brc(de)+' a '+brc(ate):m[2]+'/'+m[1])}; }
  function perAtual(c){ const h=new Date(), y=h.getFullYear(), mo=h.getMonth()+1, d=h.getDate(), modo=cfg(c).modo;
    if(modo==='mes'){ const dd=new Date(y,mo-1-(d<=7?1:0),1); return dd.getFullYear()+'-'+pad2(dd.getMonth()+1); }
    /* nos primeiros 7 dias de uma quinzena, mostra a que acabou de fechar */
    if(d<=7){ const dd=new Date(y,mo-2,1); return dd.getFullYear()+'-'+pad2(dd.getMonth()+1)+'-2'; }
    if(d>=16&&d<=22) return y+'-'+pad2(mo)+'-1';
    return y+'-'+pad2(mo)+'-'+(d<=15?1:2); }
  function perMove(pid,k){ const m=pid.match(/^(\d{4})-(\d{2})(?:-([12]))?$/); let y=+m[1], mo=+m[2];
    if(!m[3]){ const d=new Date(y,mo-1+k,1); return d.getFullYear()+'-'+pad2(d.getMonth()+1); }
    let q=+m[3]+k; while(q>2){ q-=2; mo++; } while(q<1){ q+=2; mo--; } const d=new Date(y,mo-1,1); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+q; }
  const diasDe=p=>{ const out=[]; for(let d=new Date(p.de+'T12:00:00'); isoD(d)<=p.ate; d.setDate(d.getDate()+1)) out.push(isoD(d)); return out; };
  /* ---------- a conta do dia (igual à planilha do RH) ----------
     entrada/saída a até `tol` minutos do horário viram o horário certo; fora disso vale a hora real.
     horas = saída − entrada − intervalo (dia sem saída = 0). Com `dentro`, não conta antes do início nem depois do fim. */
  function contaDia(e,s,h){ const ini=min(h.ini), fim=min(h.fim), tol=+h.tol||0, iv=+h.intv||0; let E=min(e), S=min(s);
    if(E==null||S==null||S<=E) return {E,S,m:0};
    if(ini!=null&&Math.abs(E-ini)<=tol) E=ini; if(fim!=null&&Math.abs(S-fim)<=tol) S=fim;
    if(h.dentro){ if(ini!=null&&E<ini) E=ini; if(fim!=null&&S>fim) S=fim; }
    return {E,S,m:Math.max(0,S-E-iv)}; }
  /* ---------- leitores do Face ID (05/11, "diferenciar a coluna Área e o dispositivo: Face ID produção × refeitório") ----------
     cada passagem guarda o dispositivo (no texto de `t`) e a área do Control iD (`ar`, quando o CSV tem a coluna Área).
     `leit` = nomes (normalizados) dos leitores que contam para a entrada/saída; vazio = todos. Padrão em rh/config.pjPag.leit; por pessoa em funcionarios.pjPag.leit. */
  const pasDe=x=>((x&&x.t)||[]).map(z=>{ const m=String(z).match(/^(\d{2}:\d{2})(:\d{2})?\s*(.*)$/); if(!m) return null; const ar=x.ar&&x.ar[m[1]+(m[2]||'')]||'';
    return {h:m[1],disp:m[3]||'',area:ar}; }).filter(Boolean).sort((a,b)=>a.h.localeCompare(b.h));
  const leitDe=(c,f)=>{ const x=(f&&f.pjPag)||{}; if(Array.isArray(x.leit)) return {l:x.leit,de:'pj'}; const g=cfg(c); return {l:Array.isArray(g.leit)?g.leit:[],de:'pad'}; };
  const contaP=(p,l)=>!l.length||l.includes(norm(p.disp))||(!!p.area&&l.includes(norm(p.area)));
  const leitNome=p=>p.area&&norm(p.area)!==norm(p.disp)?p.area+' · '+p.disp:p.disp;
  /* fichas das passagens do dia: hora + leitor; a que não conta fica riscada */
  const chipsP=(ps,esc)=>{ const ok=ps.filter(q=>q.ok), varios=new Set(ps.map(q=>norm(leitNome(q)))).size>1;
    return ps.map(q=>{ const nm=leitNome(q), ex=q===ok[0]||q===ok[ok.length-1];
      return `<span class="${q.ok?(ex?'pe':'pm'):'fo'}" title="${esc(nm)}${q.ok?'':' · não conta para o horário'}">${esc(q.h)}${varios&&nm?`<small>${esc(nm.slice(0,18))}</small>`:''}</span>`; }).join(''); };
  const dadosMes=pid=>{ const p=perDe(pid); return p&&window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes]||null; };
  /* caixinhas dos leitores: os vistos no Face ID do mês + os que já estão escolhidos */
  function leitCaixas(esc,vis,sel,nome){ const ks=vis.map(v=>v.k), xs=vis.concat(sel.filter(k=>!ks.includes(k)).map(k=>({k,n:k,tipo:'?',q:0})));
    if(!xs.length) return '<small style="color:var(--muted)">Nenhum leitor no Face ID deste mês ainda (importe o CSV ou espere o robô).</small>';
    return `<div class="pjp-lt">${xs.map(v=>`<label><input type="checkbox" data-${nome}="${esc(v.k)}" ${sel.includes(v.k)?'checked':''}><span><b>${esc(v.n)}</b><small>${v.tipo==='area'?'área':v.tipo==='disp'?'dispositivo':'não apareceu este mês'}${v.q?' · '+v.q+' passagens':''}</small></span></label>`).join('')}</div>`; }
  /* leitores que aparecem no Face ID do mês: [{k (normalizado), n (como está), tipo 'area'|'disp', q (passagens)}] */
  function leitVistos(dados){ const M={}; Object.values((dados&&dados.dias)||{}).forEach(dia=>Object.values(dia||{}).forEach(x=>pasDe(x).forEach(p=>{
      [['disp',p.disp],['area',p.area]].forEach(([tp,n])=>{ if(!n) return; const k=norm(n); if(!M[k]) M[k]={k,n,tipo:tp,q:0}; M[k].q++; if(tp==='area') M[k].tipo='area'; }); })));
    return Object.values(M).sort((a,b)=>a.tipo===b.tipo?a.n.localeCompare(b.n,'pt-BR'):a.tipo==='area'?-1:1); }
  /* ---------- pessoas ---------- */
  const pjs=(c,p)=>(c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.nome&&(f.status!=='Desligado'||(f.desligamento&&f.desligamento>=p.de))&&(!f.admissao||f.admissao<=p.ate))
    .sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  /* regras da pessoa: as do Pagamento dos PJ (funcionarios.pjPag) valem antes; senão o "Horário diferente" do cadastro (horEsp); senão o padrão */
  const horDe=(c,f)=>{ const g=cfg(c), x=f.pjPag||{}, he=f.horEsp||{}, tem=v=>v!=null&&v!=='';
    return {ini:x.ini||he.ini||g.ini,fim:x.fim||he.fim||g.fim,intv:tem(x.intv)?+x.intv:+g.intv,tol:tem(x.tol)?+x.tol:+g.tol,dentro:typeof x.dentro==='boolean'?x.dentro:!!g.dentro,
      dias:Array.isArray(x.dias)&&x.dias.length?x.dias:Array.isArray(he.dias)&&he.dias.length?he.dias:[1,2,3,4,5],de:{ini:x.ini?'pj':he.ini?'cad':'pad',fim:x.fim?'pj':he.fim?'cad':'pad'}}; };
  const vhDe=(c,f)=>{ const x=f.pjPag||{}; if(+x.vh>0) return +x.vh; const s=num(f.salario); return s>0?s/(+cfg(c).horasMes||220):0; }; /* como a planilha: valor da hora com todas as casas (5000/220 = 22,7272…); só o total vira centavos */
  const empDe=(c,f)=>{ const k=String(f.empresa||'').toUpperCase(); return (c.EMP_DOC||{})[k]||{nome:f.empresa||'',cnpj:''}; };
  /* chave do Face ID: o CPF do cadastro; sem CPF (ou CPF que não aparece), pelo nome */
  function chaveFid(c,f,dados){ const P0=(dados&&dados.pessoas)||{}, cpf=dig(f.cpf).padStart(11,'0');
    if(dig(f.cpf)&&P0[cpf]) return cpf; const n=norm(f.nome); if(!n) return cpf||'';
    const ws=n.split(' '), pu=ws[0]+' '+ws[ws.length-1]; let k1='', k2='';
    for(const [k,p] of Object.entries(P0)){ const pn=norm(p&&p.n); if(!pn) continue; if(pn===n){ k1=k; break; } const pw=pn.split(' '); if(pw[0]+' '+pw[pw.length-1]===pu) k2=k2?'#':k; }
    return k1||(k2&&k2!=='#'?k2:'')||(dig(f.cpf)?cpf:''); }
  /* ---------- descontos (pedido de 04/11): aba "Descontos" da pessoa ----------
     Uniforme: as parcelas do módulo Uniformes (PJ = terceiro, desconto parcelado no dia 15 e no último dia do mês). O RH
     confirma cada parcela da quinzena ("Descontar" grava a parcela como descontada na própria entrega, x.parc.hist, igual
     à aba "Descontos dos terceiros"; "Não descontar agora" passa para a próxima). Outros: o RH lança (vale, ferramenta…)
     em pes[fid].dsc.x [{id,t,v,em,por}]. O desconto antigo digitado (pes.desc) continua contando até o RH tirar. */
  const qsDe=p=>{ const b=p.mes, f=fimMes(+b.slice(0,4),+b.slice(5,7)), out=[]; if(p.de<=b+'-15'&&p.ate>=b+'-15') out.push(b+'-15'); if(p.ate>=b+'-'+pad2(f)) out.push(b+'-'+pad2(f)); return out; };
  const UN=()=>window.RHUnif&&window.RHUnif._parc&&window.RHUnif._U?window.RHUnif:null;
  function unifIni(c){ const U=UN(); if(U&&!J.unifOk&&c.unif){ J.unifOk=true; try{ U.avisos(c.unif()); }catch(e){} } }
  function unifDe(c,f,p){ const U=UN(); if(!U) return []; const n=norm(f.nome), Qs=qsDe(p), out=[];
    (U._U.xs||[]).filter(x=>x&&!x.removido&&(x.fid===f._id||(!x.fid&&norm(x.nome)===n))).forEach(x=>{ let I=null; try{ I=U._parc.parcInfo(x); }catch(e){} if(!I) return;
      Qs.forEach(Q=>{ const h=I.hist.find(y=>y.q===Q); if(h){ out.push({x,I,Q,st:h.st,v:h.st==='ok'?(+h.v||0):0,k:h._k,por:h.por}); return; }
        const pe=I.pend.find(y=>y.q===Q)||(I.pend[0]&&I.pend[0].q<=Q?I.pend[0]:null); if(pe&&!out.some(o=>o.x===x&&!o.st)) out.push({x,I,Q,st:'',v:pe.v,k:pe.k,atr:pe.q<Q}); }); });
    return out; }
  const unifTxt=x=>(x.itens||[]).filter(i=>i&&i.t).map(i=>(Math.max(1,parseInt(i.qtd,10)||1))+'× '+i.t+(i.tam?' '+i.tam:'')).join(', ');
  const DXS=['Vale / adiantamento','Almoço ou café','Ferramenta ou equipamento','Dano ou perda de material','Multa','Outro'];
  /* feriado: o do calendário do painel (Cadastros › Feriados) aparece sozinho; o RH também marca à mão (aj[dia].fer) e diz se paga o dia */
  const ferP=d=>{ try{ return window.Painel&&window.Painel.feriadoDe?window.Painel.feriadoDe(d):null; }catch(e){ return null; } };
  /* conta da pessoa no período */
  function calcPessoa(c,f,p,x){ const dados=(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes])||null, h=horDe(c,f), vh=vhDe(c,f), k=chaveFid(c,f,dados);
    const aj=(x&&x.aj)||{}, out=[], escM=contaDia(h.ini,h.fim,h).m; let tot=0, alerta=0, comFid=0;
    const LT=leitDe(c,f).l;
    diasDe(p).forEach(d=>{ const dx=k&&dados&&dados.dias&&dados.dias[d]&&dados.dias[d][k]||null;
      const ps=pasDe(dx).map(q=>Object.assign(q,{ok:contaP(q,LT)})), hs=ps.filter(q=>q.ok).map(q=>q.h), nFora=ps.length-hs.length; if(ps.length) comFid++;
      let e=hs[0]||'', s=hs.length>1?hs[hs.length-1]:''; const a=aj[d], cor=!!(a&&(a.e||a.s||a.zero)); if(cor){ e=a.zero?'':(a.e||e); s=a.zero?'':(a.s||s); }
      const fp=ferP(d), fer=a&&a.fer?{nome:a.ferNome||(fp&&fp.nome)||'Feriado',pago:!!a.pago,rh:true}:fp?{nome:fp.nome||'Feriado',pago:!!(a&&a.pago),rh:false}:null;
      const r=contaDia(e,s,h), dw=new Date(d+'T12:00:00').getDay(); let fl='', info='', m=r.m;
      if(fer&&fer.pago) m=Math.max(m,escM);
      if(!cor){ if(hs.length===1){ fl='Só uma passagem'; alerta++; } else if(fer) info='Feriado · '+fer.nome+(hs.length?' · trabalhou':''); else if(hs.length&&!h.dias.includes(dw)) info='Fora da escala'; else if(!hs.length&&nFora&&h.dias.includes(dw)) info='Só passou em leitor que não conta'; else if(!hs.length&&h.dias.includes(dw)&&d<=hojeS()) info='Sem passagem'; }
      out.push({d,dw,hs,ps,nFora,e,s,E:r.E,S:r.S,m,aj:cor,zero:!!(a&&a.zero),mot:a&&a.mot||'',fl,info,esc:h.dias.includes(dw),fer}); tot+=m; });
    const uni=unifDe(c,f,p), ext=(x&&x.dsc&&Array.isArray(x.dsc.x)?x.dsc.x:[]).filter(z=>z&&!z.removido);
    const descs=[].concat(num(x&&x.desc)>0?[{t:(x.descMot||'Desconto lançado'),v:num(x.desc),k:'leg'}]:[],uni.filter(u=>u.st==='ok').map(u=>({t:'Uniforme (entrega de '+brc(u.x.data)+')',v:u.v,k:'u'})),ext.map(z=>({t:z.t,v:num(z.v),k:'x',id:z.id})));
    const fixo=+((f.pjPag||{}).fixo)||0, desc=Math.round(descs.reduce((a,z)=>a+z.v,0)*100)/100, bruto=fixo>0?fixo:hDec(tot)*vh;
    return {f,k,h,vh,dias:out,min:tot,fixo,bruto,desc,descs,descMot:descs.map(z=>z.t+' '+R$(z.v)).join(' · ').replace(/\u00a0/g,' '),uni,uPend:uni.filter(u=>!u.st).length,valor:Math.max(0,Math.round((bruto-desc)*100)/100),alerta,comFid,semFid:!dados||!comFid,dados:!!dados}; }
  /* ---------- banco ---------- */
  function assina(c,pid){ const P=c.P; unifIni(c); if(!J.sub[pid]){ J.sub[pid]=true;
      P.inscrever('pjp-'+pid,()=>P.db().collection(COL).where('pid','==',pid).limit(1),s=>{ const d=s.docs[0]; J.docs[pid]=d?d.data():{pid,pes:{}}; P.rerender(); }); }
    if(!J.envSub){ J.envSub=true;
      P.inscrever('pjp-env',()=>P.db().collection(ENV).orderBy('em','desc').limit(80),s=>{ s.docs.forEach(d=>{ J.env[d.id]=Object.assign({_id:d.id},d.data()); }); processa(c); P.rerender(); }); }
    const p=perDe(pid); if(p&&!J.carr[p.mes]&&window.RHAlmoco){ J.carr[p.mes]=true; window.RHAlmoco.carregar(c.alm(),p.mes).then(()=>P.rerender()); } }
  const docP=pid=>J.docs[pid]||{pid,pes:{}};
  const pesDe=(pid,fid)=>(docP(pid).pes||{})[fid]||{};
  async function grava(c,pid,fid,obj,hist){ const p=perDe(pid), D=docP(pid); D.pes=D.pes||{}; const cur=D.pes[fid]||{};
    const novo=Object.assign({},cur,obj); if(hist){ novo.hist=(cur.hist||[]).concat([{t:hist,em:agora(),por:c.eu()}]).slice(-30); } D.pes[fid]=novo; J.docs[pid]=D;
    const up={pid,de:p.de,ate:p.ate,em:agora(),pes:{[fid]:Object.assign({},obj,hist?{hist:novo.hist}:{})}};
    await c.P.db().doc(COL+'/'+pid).set(up,{merge:true}); }
  /* ---------- leitura da nota (XML da NFS-e padrão nacional; também tenta o modelo ABRASF dos municípios) ---------- */
  function lerXml(txt){ let x; try{ x=new DOMParser().parseFromString(String(txt||''),'application/xml'); }catch(e){ return null; } if(!x||x.getElementsByTagName('parsererror').length) return null;
    const all=n=>[...x.getElementsByTagNameNS('*',n)], um=(n,dentro)=>{ const b=dentro?[...dentro.getElementsByTagNameNS('*',n)]:all(n); return b[0]?String(b[0].textContent||'').trim():''; };
    const cont=ns=>{ for(const n of ns){ const e=all(n)[0]; if(e) return e; } return null; };
    const cnpjEm=e=>e?(um('CNPJ',e)||um('Cnpj',e)||um('CPF',e)||um('Cpf',e)):'';
    const prest=cont(['emit','prest','PrestadorServico','Prestador','IdentificacaoPrestador']), toma=cont(['toma','TomadorServico','Tomador','IdentificacaoTomador']);
    const r={num:um('nNFSe')||um('Numero'),valor:num(um('vServ')||um('ValorServicos')||um('vLiq')),liq:num(um('vLiq')||um('ValorLiquidoNfse')),
      prest:dig(cnpjEm(prest)),prestNome:prest?(um('xNome',prest)||um('RazaoSocial',prest)):'',toma:dig(cnpjEm(toma)),tomaNome:toma?(um('xNome',toma)||um('RazaoSocial',toma)):'',
      compet:(um('dCompet')||um('Competencia')).slice(0,10),emissao:(um('dhEmi')||um('DataEmissao')).slice(0,10),desc:um('xDescServ')||um('Discriminacao')};
    return r.num||r.valor||r.prest?r:null; }
  function confere(c,f,ped,r,valorDigitado){ const probs=[], emp=empDe(c,f), esp=+ped.valor||0;
    if(r){ if(Math.abs((r.valor||0)-esp)>0.05) probs.push('Valor da nota '+R$(r.valor)+' (pedido: '+R$(esp)+')');
      if(dig(emp.cnpj)&&r.toma&&r.toma!==dig(emp.cnpj)) probs.push('Nota emitida para outro CNPJ ('+fCNPJ(r.toma)+'); o certo é '+emp.nome+' '+emp.cnpj);
      if(dig(emp.cnpj)&&!r.toma) probs.push('A nota não tem o CNPJ de quem recebe o serviço');
      if(dig(f.cnpj)&&r.prest&&r.prest!==dig(f.cnpj)) probs.push('O CNPJ de quem emitiu ('+fCNPJ(r.prest)+') não é o do cadastro ('+fCNPJ(f.cnpj)+')');
      if(r.compet&&ped.mes&&r.compet.slice(0,7)!==ped.mes) probs.push('Competência da nota '+r.compet.slice(5,7)+'/'+r.compet.slice(0,4)+' (o período é '+ped.mes.slice(5,7)+'/'+ped.mes.slice(0,4)+')');
      return {conf:probs.length?'dif':'ok',probs}; }
    if(valorDigitado&&Math.abs(valorDigitado-esp)>0.05) probs.push('O PJ escreveu o valor '+R$(valorDigitado)+' (pedido: '+R$(esp)+')');
    probs.push('Nota em PDF: confira o valor e os CNPJs abrindo o arquivo'); return {conf:'manual',probs}; }
  /* nota que chegou pelo link → guarda o resumo no período (qualquer RH que estiver com o painel aberto) */
  async function processa(c){ for(const e of Object.values(J.env)){ if(J.proc[e._id]||!e.pid||!e.fid) continue; const D=J.docs[e.pid]; if(!D) { const P=c.P; if(!J.sub[e.pid]) assina(c,e.pid); continue; }
      const x=(D.pes||{})[e.fid]||{}; if(!x.ped||x.ped.t!==e._id||(x.nota&&x.nota.t===e._id)){ J.proc[e._id]=true; continue; }
      J.proc[e._id]=true; const f=(c.R.func||[]).find(y=>y._id===e.fid)||{nome:e.nome||''};
      let r=null; if(e.d&&/xml/i.test(e.tipo||'')){ try{ r=lerXml(decodeURIComponent(escape(atob(e.d)))); }catch(er){ try{ r=lerXml(atob(e.d)); }catch(e2){} } }
      const cf=confere(c,f,x.ped,r,num(e.valor));
      const nota={t:e._id,em:e.em||agora(),num:(r&&r.num)||String(e.num||''),valor:(r&&r.valor)||num(e.valor),tipo:e.tipo||'',n:e.n||'',xml:r||null,conf:cf.conf,probs:cf.probs,obs:e.obs||''};
      try{ await grava(c,e.pid,e.fid,{st:'chegou',nota},'Nota '+(nota.num?'nº '+nota.num+' ':'')+'chegou pelo link'); await c.P.db().doc(PED+'/'+e._id).set({usado:true,usadoEm:agora()},{merge:true}); }catch(er){ J.proc[e._id]=false; console.warn('pjp nota',er); } } }
  /* ---------- pedido de nota ---------- */
  const linkDe=t=>location.origin+location.pathname.replace(/[^/]*$/,'')+'nota.html?c='+t;
  function msgDe(c,f,ped){ const emp=ped.tomador||{}; return String(cfg(c).msg||PAD.msg).replace(/\{NOME\}/g,c.titulo(f.nome).split(' ')[0]).replace(/\{PERIODO\}/g,ped.perTxt).replace(/\{HORAS\}/g,ped.fixo?'valor fixo':hTxt(ped.min))
      .replace(/\{VALOR\}/g,R$(ped.valor)).replace(/\{EMPRESA\}/g,emp.nome||'').replace(/\{CNPJ\}/g,emp.cnpj||'').replace(/\{LINK\}/g,linkDe(ped.t)).replace(/\u00a0/g,' '); }
  async function pedir(c,pid,f){ const p=perDe(pid), x=pesDe(pid,f._id), fe=x.fech; if(!fe) throw new Error('Feche o valor antes de pedir a nota.');
    const t=c.tokenNovo(), emp=empDe(c,f), ateMs=Date.now()+(+cfg(c).dias||30)*864e5;
    const ped={t,nome:c.titulo(f.nome),pid,fid:f._id,mes:p.mes,de:p.de,ate:p.ate,perTxt:p.txt,min:fe.min,horas:Math.round(hDec(fe.min)*100)/100,vh:fe.vh,fixo:fe.fixo||0,bruto:fe.bruto,desc:fe.desc||0,descMot:fe.descMot||x.descMot||'',valor:fe.valor,
      dias:(fe.dias||[]).filter(d=>d&&d.m>0),tomador:{nome:emp.nome||'',cnpj:emp.cnpj||''},prest:{cnpj:fCNPJ(f.cnpj||''),nome:f.razaoPJ||''},
      servico:'Prestação de serviços'+(f.funcao?' de '+c.cargo(f.funcao).toLowerCase():'')+' no período de '+br(p.de)+' a '+br(p.ate),criado:agora(),ateMs,usado:false,porNome:c.eu()};
    await c.P.db().doc(PED+'/'+t).set(ped);
    await grava(c,pid,f._id,{st:'pedido',ped:{t,em:agora(),por:c.eu(),valor:fe.valor,mes:p.mes,ateMs}},'Nota pedida ('+R$(fe.valor)+')');
    return ped; }
  /* ---------- tela (04/11, 2ª versão: "o mais fácil possível", no jeito da planilha e da aba Desconto dos uniformes) ----------
     Uma tabela só, uma linha por PJ, com UM botão: o próximo passo. Tocar no nome abre a "folha" da pessoa igual à planilha
     (Dia · Entrada · Saída · Conta como · Horas) e o "Cálculo final" (horas × valor da hora − desconto = total a pagar). */
  const css=`<style id="pjp-css">
  .pjp{display:flex;flex-direction:column;gap:12px}
  .pjp-rb{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.pjp-sp{flex:1}
  .pjp-cw{margin-top:16px;border:1px solid var(--line,#dde3ea);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;background:var(--surface,#fff)}
  .pjp-cw>div:first-child small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
  .pjp-cwe{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--line,#dde3ea)}
  .pjp-cwe>span{flex:1;min-width:220px}.pjp-cwe small{display:block;font-size:12px;color:var(--muted)}
  .pjp-nav{display:flex;align-items:center;gap:10px}.pjp-nav>div{display:flex;flex-direction:column;line-height:1.2;min-width:150px}
  .pjp-nav span,.pjp-k span,.pjp-lbl{font-size:11.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .pjp-nav b{font-size:17px}.pjp-nav small{font-size:12px;color:var(--muted)}
  .pjp .btn.pjp-sm{height:34px;padding:0 12px;font-size:13.5px}
  .pjp-fil{display:flex;gap:10px;flex-wrap:wrap}.pjp-fil label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);font-weight:600}
  .pjp-fil select,.pjp-fil input{height:36px;border:1px solid var(--line,#E1E7EB);border-radius:9px;padding:0 10px;background:var(--surface);color:inherit;font:inherit;min-width:170px}
  .pjp-k{display:flex;gap:10px;flex-wrap:wrap}.pjp-k>div{background:var(--ground);border-radius:12px;padding:10px 16px;min-width:130px;display:flex;flex-direction:column}
  .pjp-k b{font-size:22px}.pjp-k .dsc{background:var(--teal-strong);color:#fff}.pjp-k .dsc span{color:rgba(255,255,255,.75)}
  .pjp-passos{display:flex;gap:6px;flex-wrap:wrap;font-size:13px;color:var(--muted)}.pjp-passos span{background:var(--ground);border-radius:999px;padding:3px 10px}
  .pjp-passos span b{color:var(--teal-strong);margin-right:4px}
  .pjp-av{padding:10px 14px;border-radius:12px;background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310);font-size:14px}
  .pjp-tw{overflow-x:auto}.pjp-t{width:100%;border-collapse:collapse;font-size:14px}
  .pjp-t th{text-align:left;font-size:12px;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line,#E1E7EB)}
  .pjp-t td{padding:9px 8px;border-bottom:1px solid var(--line,#E1E7EB);vertical-align:top}
  .pjp-t .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.pjp-t small{display:block;color:var(--muted);font-size:12px}
  .pjp-t tfoot td{font-weight:700;border-top:2px solid var(--line,#E1E7EB);border-bottom:0;padding-top:10px}
  .pjp-t tr.feito td{color:var(--muted)}.pjp-t tr.aberto>td{background:var(--surface-2,#F6F8FA)}
  .pjp-nm{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--teal-strong);cursor:pointer;text-align:left}
  .pjp-nm::after{content:" ›";color:var(--muted)}.pjp-nm[aria-expanded=true]::after{content:" ⌄"}
  .pjp-qa{white-space:nowrap;text-align:right}.pjp-qa .btn{height:34px;padding:0 14px;font-size:13.5px}
  .pjp-qa .lnk,.pjp-ps .lnk{display:block;margin:4px 0 0 auto;font-size:12.5px;background:none;border:0;color:var(--teal);cursor:pointer;padding:0}
  .pjp-pill{display:inline-block;font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap}
  .pjp-pill.warn{background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310)}.pjp-pill.ok{background:var(--ok-tint,#E3F0E8);color:var(--ok-ink,#2F6047)}.pjp-pill.teal{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)}.pjp-pill.crit{background:var(--crit-tint,#F6E3E1);color:var(--crit-ink,#8E3A33)}
  .pjp-fl td{padding:0 8px 16px!important;background:var(--surface-2,#F6F8FA)}
  .pjp-folha{background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:12px;overflow:hidden}
  .pjp-fh{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;padding:10px 14px;background:var(--ground);font-size:14px}.pjp-fh b{font-size:15px}
  .pjp-fg{display:grid;grid-template-columns:minmax(0,1fr) 300px}@media(max-width:1000px){.pjp-fg{grid-template-columns:1fr}}
  .pjp-dias{width:100%;border-collapse:collapse;font-size:13.5px}.pjp-dias th{text-align:left;font-size:11.5px;color:var(--muted);font-weight:600;padding:6px 10px;border-bottom:1px solid var(--line,#E1E7EB)}
  .pjp-dias td{padding:5px 10px;border-bottom:1px solid var(--line,#E1E7EB)}.pjp-dias .n{text-align:right;font-variant-numeric:tabular-nums}
  .pjp-dias tr.fds td{color:var(--muted);background:var(--surface-2,#F6F8FA)}.pjp-dias tr.al td{background:var(--warn-tint,#FBF1DC)}
  .pjp-dias input[type=time]{width:96px;height:30px;padding:0 4px;font:inherit;border:1px solid var(--line,#E1E7EB);border-radius:7px;background:var(--surface);color:inherit}
  .pjp-dias .ps{color:var(--muted);font-size:12px}
  .pjp-calc{border-left:1px solid var(--line,#E1E7EB);padding:12px 14px;display:flex;flex-direction:column;gap:2px}@media(max-width:1000px){.pjp-calc{border-left:0;border-top:1px solid var(--line,#E1E7EB)}}
  .pjp-cl{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line,#E1E7EB);font-size:14px}.pjp-cl span{color:var(--muted)}
  .pjp-cl input{width:110px;height:32px;text-align:right;border:1px solid var(--line,#E1E7EB);border-radius:8px;padding:0 8px;font:inherit;background:var(--surface);color:inherit}
  .pjp-cl.tot{border:0;border-radius:10px;background:var(--teal-strong);color:#fff;padding:10px 12px;margin-top:8px;font-size:16px}.pjp-cl.tot span{color:rgba(255,255,255,.8)}
  .pjp-calc details{margin-top:10px;font-size:13px}.pjp-calc summary{cursor:pointer;color:var(--teal);font-weight:600}
  .pjp-calc label{display:block;font-size:12px;color:var(--muted);margin-top:8px}.pjp-calc details input{width:100%;height:34px;padding:0 8px;border:1px solid var(--line,#E1E7EB);border-radius:8px;font:inherit;background:var(--surface);color:inherit}
  .pjp-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 8px}
  .pjp-nota{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--ground);font-size:13.5px}.pjp-nota ul{margin:4px 0 0;padding-left:18px;color:var(--crit-ink,#8E3A33)}
  .pjp-hist{margin-top:10px;font-size:12px;color:var(--muted)}.pjp-hist div{padding:2px 0}
  .pjp-fundo{position:fixed;inset:0;background:rgba(10,25,35,.42);z-index:900;display:grid;place-items:center;padding:16px}
  .pjp-mod{background:var(--surface);border-radius:18px;max-width:640px;width:100%;max-height:90vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
  .pjp-mod h3{margin:0 0 4px}.pjp-mod textarea{width:100%;min-height:130px;padding:10px;border:1px solid var(--line,#E1E7EB);border-radius:10px;font:inherit;background:var(--surface);color:inherit}
  .pjp-mod .lk{display:block;word-break:break-all;background:var(--surface-2,#EEF2F5);padding:8px 10px;border-radius:8px;font-size:13px;margin:8px 0}
  .pjp-mod .pjp-box label{display:block;font-size:12.5px;color:var(--muted);margin-top:8px}.pjp-mod .pjp-box input,.pjp-mod .pjp-box select,.pjp-mod .pjp-box textarea{width:100%;height:36px;padding:0 8px;border:1px solid var(--line,#E1E7EB);border-radius:8px;font:inherit;background:var(--surface);color:inherit}
  .pjp-mod .pjp-box textarea{height:auto;padding:8px}
  .pjp-ac{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
  .pjp-lote li{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line,#E1E7EB)}.pjp-lote{list-style:none;margin:8px 0;padding:0}
  </style>`;
  const btn=(a,t,extra,cl)=>`<button class="btn ${cl==null?'sec':cl} pjp-sm" data-act="${a}" ${extra||''}>${t}</button>`;
  const lnk=(a,t,extra)=>`<button class="lnk" data-act="${a}" ${extra||''}>${t}</button>`;
  /* o próximo passo de cada PJ: um botão (ou a situação) + atalhos pequenos */
  const lks=(...xs)=>`<div class="pjp-lks">${xs.filter(Boolean).join('<span aria-hidden="true">·</span>')}</div>`;
  function acoes(c,pid,f,x,r){ const fa=`data-f="${c.esc(f._id)}"`, st=x.st||'';
    if(st===''){
      if(!r.fixo&&!r.vh) return `<span class="pjp-pill crit">Falta o valor da hora</span>`+btn('pjp-ab','Pôr o valor da hora',fa+' data-tab="regras"','');
      if(!r.fixo&&!r.min) return `<span class="pjp-pill crit">Sem horas no período</span>`+btn('pjp-ab','Ver os dias',fa);
      return (r.uPend?`<span class="pjp-pill warn">uniforme para confirmar</span>`:'')+(r.alerta?`<span class="pjp-pill warn">${r.alerta} dia${r.alerta>1?'s':''} para conferir</span>`:'')+btn('pjp-fech','Fechar valor',fa,''); }
    if(st==='fechado') return btn('pjp-ped','Pedir nota',fa,'')+lks(lnk('pjp-reab','mudar o valor',fa));
    if(st==='pedido') return `<span class="pjp-pill teal">Esperando a nota${x.ped&&x.ped.em?' desde '+brc(String(x.ped.em).slice(0,10)):''}</span>`+lks(lnk('pjp-env','mandar o link de novo',fa),lnk('pjp-pedx','cancelar o pedido',fa));
    if(st==='chegou') return (x.nota&&x.nota.conf==='ok'?'<span class="pjp-pill ok">Nota chegou · bate</span>':x.nota&&x.nota.conf==='dif'?'<span class="pjp-pill crit">Nota chegou · com diferença</span>':'<span class="pjp-pill warn">Nota chegou · conferir</span>')+btn('pjp-nok','Está certa',fa,'')+lks(lnk('pjp-nver','ver a nota',fa),lnk('pjp-nnao','pedir outra nota',fa));
    if(st==='conferida') return btn('pjp-pago','Marcar pago',fa,'')+lks(lnk('pjp-nver','ver a nota',fa));
    if(st==='pago') return `<span class="pjp-pill ok">Pago</span>`+lks(lnk('pjp-nver','ver a nota',fa),lnk('pjp-pagox','desfazer',fa));
    return ''; }
  /* ---------- a pessoa: gaveta à direita (04/11, 3ª versão) ----------
     Abas: Horas (os dias como na planilha, cada um com "Corrigir") · Regras desta pessoa (horário, intervalo, tolerância,
     dias de trabalho, valor da hora ou fixo — gravadas no cadastro, funcionarios.pjPag) · Histórico. */
  const DN=['dom','seg','ter','qua','qui','sex','sáb'], DNL=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MOTS=['Esqueceu de passar no Face ID','O Face ID não leu','Trabalhou fora da fábrica','Saiu mais cedo autorizado','Não trabalhou neste dia'];
  const css2=`<style id="pjp-css2">
  .pjp-gf{position:fixed;inset:0;background:rgba(10,25,35,.38);z-index:850;display:flex;justify-content:flex-end}
  .pjp-g{background:var(--surface);width:min(760px,100%);height:100%;overflow:auto;box-shadow:-20px 0 60px rgba(0,0,0,.18);display:flex;flex-direction:column}
  .pjp-gh{display:flex;gap:14px;align-items:center;padding:18px 22px 12px;position:sticky;top:0;background:var(--surface);z-index:2}
  .pjp-av2{width:46px;height:46px;border-radius:50%;background:var(--teal-tint,#E2ECF1);color:var(--teal-strong);display:grid;place-items:center;font-weight:700;font-size:16px;flex:none}
  .pjp-gh h2{margin:0;font-size:20px}.pjp-gh small{display:block;color:var(--muted);font-size:13px}
  .pjp-gx{margin-left:auto;border:0;background:var(--ground);width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;color:inherit;flex:none}
  .pjp-gs{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:0 22px 10px}.pjp-gs .lnk{display:inline;margin:0}
  .pjp-tabs{display:flex;gap:4px;padding:0 22px;border-bottom:1px solid var(--line,#E1E7EB);position:sticky;top:76px;background:var(--surface);z-index:2}
  .pjp-tabs button{border:0;background:none;padding:10px 12px;font:inherit;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
  .pjp-tabs button.on{color:var(--teal-strong);border-bottom-color:var(--teal-strong)}
  .pjp-gb{padding:16px 22px 24px;display:flex;flex-direction:column;gap:12px}
  .pjp-mini{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pjp-mini div{background:var(--ground);border-radius:10px;padding:8px 12px}
  .pjp-mini span{display:block;font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}.pjp-mini b{font-size:19px}
  .pjp-mini .pg-w{background:var(--warn-tint,#FBF1DC)}.pjp-mini .pg-w b{color:var(--warn-ink,#7A5310)}
  .pjp-dl{display:flex;flex-direction:column;border:1px solid var(--line,#E1E7EB);border-radius:12px;overflow:hidden}
  .pjp-d{display:grid;grid-template-columns:82px minmax(0,1fr) 112px 56px 84px;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid var(--line,#E1E7EB);font-size:14px}
  .pjp-d:first-child{border-top:0}.pjp-d .pg-dd{font-weight:600}.pjp-d .pg-dd small{display:block;font-weight:400;color:var(--muted);font-size:11.5px}
  .pjp-chips{display:flex;gap:4px;flex-wrap:wrap}.pjp-chips span{background:var(--ground);border-radius:6px;padding:1px 7px;font-size:12.5px;font-variant-numeric:tabular-nums}
  .pjp-chips span:first-child,.pjp-chips span:last-child{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong);font-weight:600}
  .pjp-d .pg-cc{font-size:12.5px;color:var(--muted);white-space:nowrap}.pjp-d .pg-hh{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  .pjp-d .pg-cor{text-align:right}.pjp-d .pg-cor .lnk{display:inline;margin:0;font-size:13px}
  .pjp-d.pg-fds{grid-template-columns:82px 1fr;padding:6px 12px;background:var(--surface-2,#F6F8FA);color:var(--muted);font-size:13px}
  .pjp-lt{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;margin-top:6px}.pjp-lt label{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--line,#E1E7EB);border-radius:10px;background:var(--surface);cursor:pointer;font-size:13.5px;font-weight:400}.pjp-lt input{width:18px;height:18px;margin-top:2px}.pjp-lt b{display:block;font-weight:600}.pjp-lt small{display:block;font-size:11.5px;color:var(--muted)}
  .pjp-chips span.pm,.pjp-chips span.fo{background:var(--ground);color:inherit;font-weight:400}.pjp-chips span.pe{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong);font-weight:600}.pjp-chips span.fo{background:none;color:var(--muted);text-decoration:line-through;border:1px dashed var(--line,#E1E7EB)}.pjp-chips span small{display:block;font-size:10px;font-weight:400;opacity:.8;line-height:1.1;text-decoration:none}
  .pjp-d.pg-al{background:var(--warn-tint,#FBF1DC)}.pjp-d.pg-aj{box-shadow:inset 3px 0 var(--teal)}.pjp-d.pg-sp .pjp-chips span{background:none;color:var(--muted);font-weight:400;padding:0}
  .pjp-d .pg-tag{font-size:11.5px;font-weight:600;border-radius:999px;padding:1px 8px;display:inline-block;margin-top:3px}
  .pjp-d .pg-tag.pg-w{background:#fff;color:var(--warn-ink,#7A5310)}.pjp-d .pg-tag.pg-t{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)}.pjp-d .pg-tag.pg-m{background:var(--ground);color:var(--muted)}
  .pjp-ed{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;background:var(--surface);border:1px solid var(--teal);border-radius:10px;padding:10px 12px;margin-top:6px}
  .pjp-ed label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);font-weight:600}
  .pjp-ed input{height:36px;border:1px solid var(--line,#E1E7EB);border-radius:8px;padding:0 8px;font:inherit;background:var(--surface);color:inherit}
  .pjp-ed input[type=time]{width:110px}.pjp-ed .pg-mot{flex:1;min-width:200px}.pjp-ed .pg-mot input{width:100%}
  .pjp-tot{position:sticky;bottom:0;background:var(--surface);border-top:1px solid var(--line,#E1E7EB);padding:12px 22px;display:grid;grid-template-columns:repeat(4,auto) 1fr;gap:4px 18px;align-items:center;font-size:13px;color:var(--muted)}
  .pjp-tot b{display:block;font-size:16px;color:var(--ink,inherit)}.pjp-tot input{width:96px;height:32px;text-align:right;border:1px solid var(--line,#E1E7EB);border-radius:8px;padding:0 8px;font:inherit;background:var(--surface);color:inherit}
  .pjp-tot .pg-big{justify-self:end;background:var(--teal-strong);color:#fff;border-radius:12px;padding:8px 16px;text-align:right}.pjp-tot .pg-big span{color:rgba(255,255,255,.8)}.pjp-tot .pg-big b{color:#fff;font-size:22px}
  .pjp-rg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pjp-rg label,.pjp-rl{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--ink,inherit)}
  .pjp-rg input,.pjp-rv input[type=text],.pjp-rob{height:40px;border:1px solid var(--line,#E1E7EB);border-radius:9px;padding:0 10px;font:inherit;background:var(--surface);color:inherit}
  .pjp-rg small,.pjp-rl small{font-weight:400;color:var(--muted);font-size:12px}
  .pjp-sec{border:1px solid var(--line,#E1E7EB);border-radius:12px;padding:14px}.pjp-sec h4{margin:0 0 10px;font-size:15px}
  .pjp-dw{display:flex;gap:6px;flex-wrap:wrap}.pjp-dw label{display:inline-flex}.pjp-dw input{position:absolute;opacity:0;pointer-events:none}
  .pjp-dw span{display:inline-block;min-width:46px;text-align:center;padding:7px 10px;border:1px solid var(--line,#E1E7EB);border-radius:999px;cursor:pointer;font-weight:600;font-size:13px;color:var(--muted)}
  .pjp-dw input:checked+span{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}
  .pjp-dw input:focus-visible+span{outline:3px solid #9FBFCF}
  .pjp-rv{display:flex;flex-direction:column;gap:8px}.pjp-rv>label{display:flex;gap:10px;align-items:center;font-size:14px;cursor:pointer}.pjp-rv input[type=radio]{width:18px;height:18px}
  .pjp-ck{display:flex;gap:10px;align-items:center;font-size:14px;cursor:pointer}.pjp-ck input{width:18px;height:18px}
  .pjp-hl{display:flex;flex-direction:column}.pjp-hl div{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid var(--line,#E1E7EB);font-size:13.5px}.pjp-hl div span{color:var(--muted)}
.pjp-d .pg-tag.pg-f{background:#EDE7F6;color:#4A3A7A}.pjp-d .pg-fl{display:block;font-size:12.5px;color:var(--muted);margin-top:4px}.pjp-d .pg-fl .lnk{display:inline;margin:0;font-size:12px}
  .pg-ds{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px 14px;align-items:center;padding:10px 0;border-top:1px solid var(--line,#E1E7EB)}.pg-ds:first-of-type{border-top:0}
  .pg-ds small{display:block;color:var(--muted);font-size:12.5px}.pg-ds .pg-dv{font-size:16px;font-variant-numeric:tabular-nums}.pg-ds .pg-da{text-align:right;display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.pg-ds .pg-da .lnk{display:inline;margin:0}
  @media(max-width:640px){.pg-ds{grid-template-columns:1fr auto}.pg-ds .pg-da{grid-column:1/-1;justify-content:flex-start}.pjp-d{grid-template-columns:70px minmax(0,1fr) 54px;}.pjp-d .pg-cc{display:none}.pjp-d .pg-cor{grid-column:1/-1;text-align:left}.pjp-mini{grid-template-columns:repeat(2,1fr)}.pjp-rg{grid-template-columns:1fr 1fr}.pjp-tot{grid-template-columns:1fr 1fr}.pjp-tot .pg-big{grid-column:1/-1;justify-self:stretch}}
  </style>`;
  const ini2=n=>String(n||'').trim().split(/\s+/).filter(Boolean).map((w,i,a)=>i===0||i===a.length-1?w[0]:'').join('').toUpperCase();
  function gaveta(c,pid,rs){ if(!J.ab) return ''; const o=rs.find(z=>z.f._id===J.ab)||(()=>{ const f=(c.R.func||[]).find(y=>y._id===J.ab); if(!f) return null; const x=pesDe(pid,f._id); return {f,x,r:calcPessoa(c,f,perDe(pid),x)}; })(); if(!o) return '';
    const esc=c.esc, {f,x,r}=o, ed=!x.st, h=r.h, fa=`data-f="${esc(f._id)}"`, tab=J.tab||'horas', emp=String(f.empresa||'').toUpperCase(), g=cfg(c);
    const comP=r.dias.filter(d=>d.hs.length||d.aj).length, nAj=r.dias.filter(d=>d.aj).length, escM=contaDia(h.ini,h.fim,h).m;
    let corpo='';
    if(tab==='horas'){
      const lin=r.dias.map(d=>{ const dd=`<div class="pg-dd">${DNL[d.dw]} ${brc(d.d)}</div>`;
        if(!d.hs.length&&!(d.ps&&d.ps.length)&&!d.aj&&!d.esc&&!(d.fer&&(d.fer.rh||d.fer.pago))&&J.edDia!==d.d) return `<div class="pjp-d pg-fds">${dd}<div>${d.dw===0||d.dw===6?'fim de semana':'fora da escala'}${ed?` · <button class="lnk" data-act="pjp-dcor" data-d="${d.d}" ${fa}>trabalhou? lançar</button>`:''}</div></div>`;
        const ch=d.aj?`<div class="pjp-chips">${d.zero?'<span>não trabalhou</span>':`<span>${esc(d.e||'—')}</span><span>${esc(d.s||'—')}</span>`}</div><span class="pg-tag pg-t">corrigido · ${esc(d.mot||'à mão')}</span>${d.hs.length?`<small class="ps" style="display:block;font-size:11.5px;color:var(--muted)">Face ID: ${esc(d.hs.join(' · '))}</small>`:''}`
          :d.ps&&d.ps.length?`<div class="pjp-chips">${chipsP(d.ps,esc)}</div>${d.fl?`<span class="pg-tag pg-w">Só uma passagem · falta a saída</span>`:d.info?`<span class="pg-tag ${d.fer?'pg-f':'pg-m'}">${esc(d.info)}</span>`:''}`
          :d.fer?`<div class="pjp-chips"><span>não trabalhou</span></div><span class="pg-tag pg-f">Feriado · ${esc(d.fer.nome)}</span>`
          :`<div class="pjp-chips"><span>sem passagem no Face ID</span></div>`;
        const ferL=d.fer&&ed?`<small class="pg-fl">${d.fer.pago?`feriado pago (${hTxt(escM)}) · <button class="lnk" data-act="pjp-dferp" data-v="0" data-d="${d.d}" ${fa}>não pagar</button>`:`<button class="lnk" data-act="pjp-dferp" data-v="1" data-d="${d.d}" ${fa}>pagar o dia (${hTxt(escM)})</button>`}${d.fer.rh?` · <button class="lnk" data-act="pjp-dferx" data-d="${d.d}" ${fa}>não é feriado</button>`:''}</small>`:d.fer&&d.fer.pago?`<small class="pg-fl">feriado pago</small>`:'';
        const edit=J.edDia===d.d?`<div class="pjp-ed"><label>Entrada<input type="time" id="pjp-ce" value="${esc(d.zero?'':d.e)}"></label><label>Saída<input type="time" id="pjp-cs" value="${esc(d.zero?'':d.s)}"></label>
            <label class="pg-mot">Motivo<input id="pjp-cm" list="pjp-mots" value="${esc(d.mot&&d.aj?d.mot:d.fl?'Esqueceu de passar no Face ID':'')}" maxlength="80" placeholder="por que corrigiu"></label>
            <datalist id="pjp-mots">${MOTS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
            <span style="display:flex;gap:6px;flex-wrap:wrap">${btn('pjp-dsalva','Salvar','data-d="'+d.d+'" '+fa,'')}${btn('pjp-dzero','Não trabalhou (0 h)','data-d="'+d.d+'" '+fa)}${d.fer?'':btn('pjp-dfer','É feriado','data-d="'+d.d+'" '+fa)}${btn('pjp-dcanc','Cancelar')}</span></div>`:'';
        return `<div class="pjp-d ${d.fl&&!d.aj?'pg-al':''} ${d.aj?'pg-aj':''} ${!d.hs.length&&!d.aj?'pg-sp':''}">${dd}<div>${ch}${ferL}</div><div class="pg-cc">${d.m&&d.E!=null?'conta '+hhmm(d.E)+'–'+hhmm(d.S):''}</div><div class="pg-hh">${d.m?hTxt(d.m):'—'}</div>
          <div class="pg-cor">${ed?(d.aj?`<button class="lnk" data-act="pjp-diax" data-d="${d.d}" ${fa}>voltar ao Face ID</button>`:`<button class="lnk" data-act="pjp-dcor" data-d="${d.d}" ${fa}>${d.fl?'<b>Corrigir</b>':'Corrigir'}</button>`):''}</div>${edit}</div>`; }).join('');
      corpo=`<div class="pjp-mini"><div><span>Dias com passagem</span><b>${comP}</b></div><div><span>Horas</span><b>${r.fixo?'fixo':hTxt(r.min)}</b></div><div class="${r.alerta?'pg-w':''}"><span>Para conferir</span><b>${r.alerta}</b></div><div><span>Corrigidos</span><b>${nAj}</b></div></div>
        ${r.alerta&&ed?`<div class="pjp-av">${r.alerta} dia${r.alerta>1?'s':''} com uma passagem só no Face ID (falta a saída). Toque em <b>Corrigir</b> no dia e digite a hora certa.</div>`:''}
        ${!ed?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">O valor já foi fechado. Para corrigir alguma hora, toque em ${lnk('pjp-reab','mudar o valor',fa).replace('class="lnk"','class="lnk" style="display:inline;margin:0"')} (volta para conferir).</div>`:''}
        <div class="pjp-dl">${lin}</div>
        <p class="ps" style="margin:0;color:var(--muted);font-size:12.5px">Os horários em destaque são a primeira e a última passagem do dia no Face ID. Até ${h.tol} min do horário (${esc(h.ini)} às ${esc(h.fim)}) conta o horário certo; o intervalo de ${h.intv} min sai de cada dia.</p>`; }
    else if(tab==='desc'){ const uT=r.uni.filter(u=>u.st==='ok').reduce((a,u)=>a+u.v,0), oT=r.descs.filter(z=>z.k!=='u').reduce((a,z)=>a+z.v,0);
      const uL=r.uni.map(u=>{ const xa=`data-x="${esc(u.x._id)}" data-q="${esc(u.Q)}" ${fa}`, I=u.I;
        const sit=u.st==='ok'?`<span class="pjp-pill ok">Vai descontar</span>${ed?lnk('pjp-ux','desfazer',xa):''}`:u.st==='falta'?`<span class="pjp-pill teal">Não desta vez · fica para a próxima quinzena</span>${ed?lnk('pjp-ux','desfazer',xa):''}`
          :ed?`${btn('pjp-uok','Descontar',xa,'')}${lnk('pjp-uno','Não descontar agora',xa)}`:`<span class="pjp-pill warn">Não confirmado</span>`;
        return `<div class="pg-ds"><div><b>Uniforme · entrega de ${esc(br(u.x.data))}</b><small>${esc(unifTxt(u.x)||'peças')} · parcela ${u.k||'?'} de ${I.n} · total ${R$(I.V)}${I.rest>0.004&&u.st!=='ok'?' · falta '+R$(I.rest):''}${u.atr?' · <b style="color:var(--warn-ink,#7A5310)">parcela atrasada</b>':''}</small></div><b class="pg-dv">${u.st==='falta'?'—':R$(u.v)}</b><div class="pg-da">${sit}</div></div>`; }).join('');
      const oL=r.descs.filter(z=>z.k!=='u').map(z=>`<div class="pg-ds"><div><b>${esc(z.t)}</b><small>${z.k==='leg'?'lançado antes da aba Descontos':'lançado pelo RH'}</small></div><b class="pg-dv">${R$(z.v)}</b><div class="pg-da">${ed?lnk('pjp-dxx','tirar',`data-id="${esc(z.id||'leg')}" ${fa}`):''}</div></div>`).join('');
      corpo=`<div class="pjp-mini"><div><span>Total de descontos</span><b>${R$(r.desc)}</b></div><div><span>Uniforme</span><b>${R$(uT)}</b></div><div><span>Outros</span><b>${R$(oT)}</b></div><div class="${r.uPend?'pg-w':''}"><span>Para confirmar</span><b>${r.uPend}</b></div></div>
        ${!ed?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">O valor já foi fechado. Para mudar os descontos, toque em ${lnk('pjp-reab','mudar o valor',fa).replace('class="lnk"','class="lnk" style="display:inline;margin:0"')}.</div>`:''}
        <div class="pjp-sec"><h4>Uniforme</h4>${uL||'<p class="ps" style="margin:0;color:var(--muted)">Nenhuma parcela de uniforme para esta quinzena.</p>'}
          <p class="ps" style="margin:8px 0 0;color:var(--muted);font-size:12.5px">Vem das entregas de uniforme desta pessoa (RH › Uniformes), em parcelas descontadas no dia 15 e no último dia do mês. Só entra no valor depois que você confirma.</p></div>
        <div class="pjp-sec"><h4>Outros descontos</h4>${oL||'<p class="ps" style="margin:0;color:var(--muted)">Nenhum.</p>'}
          ${ed?`<div class="pjp-ed" style="border-color:var(--line,#E1E7EB)"><label class="pg-mot">O que é<input id="pjp-dxt" list="pjp-dxs" maxlength="80" placeholder="ex.: Vale / adiantamento"></label><datalist id="pjp-dxs">${DXS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
            <label>Valor (R$)<input id="pjp-dxv" inputmode="decimal" placeholder="0,00" style="width:110px"></label>${btn('pjp-dxadd','Acrescentar',fa,'')}</div>`:''}</div>`; }
    else if(tab==='regras'){ const pj=f.pjPag||{}, he=f.horEsp||{}, tem=v=>v!=null&&v!=='';
      const pad=(v,orig)=>`<small>${orig==='cad'?'do cadastro (horário diferente)':orig==='pj'?'só desta pessoa':'padrão: '+esc(v)}</small>`;
      corpo=`${x.st?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">O valor desta quinzena já foi fechado: as regras novas valem quando reabrir ou na próxima quinzena.</div>`:''}
        <div class="pjp-sec"><h4>Horário</h4><div class="pjp-rg">
          <label>Entra<input type="time" id="pjp-ri" value="${esc(pj.ini||'')}" placeholder="${esc(h.ini)}">${pad(he.ini||g.ini,h.de.ini==='pj'?'pj':he.ini?'cad':'pad')}</label>
          <label>Sai<input type="time" id="pjp-rf" value="${esc(pj.fim||'')}">${pad(he.fim||g.fim,h.de.fim==='pj'?'pj':he.fim?'cad':'pad')}</label>
          <label>Intervalo (min)<input id="pjp-rint" inputmode="numeric" value="${tem(pj.intv)?esc(pj.intv):''}" placeholder="${esc(g.intv)}">${pad(g.intv,tem(pj.intv)?'pj':'pad')}</label>
          <label>Tolerância (min)<input id="pjp-rtol" inputmode="numeric" value="${tem(pj.tol)?esc(pj.tol):''}" placeholder="${esc(g.tol)}">${pad(g.tol,tem(pj.tol)?'pj':'pad')}</label></div>
          <div class="pjp-rl" style="margin-top:12px">Dias que trabalha<small>dia fora da escala com passagem aparece marcado; dia da escala sem passagem também</small></div>
          <div class="pjp-dw" style="margin-top:6px">${[1,2,3,4,5,6,0].map(i=>`<label><input type="checkbox" data-pjp-dw="${i}" ${h.dias.includes(i)?'checked':''}><span>${DNL[i]}</span></label>`).join('')}</div>
          <label class="pjp-ck" style="margin-top:12px"><input type="checkbox" id="pjp-rdentro" ${h.dentro?'checked':''}> Não contar o tempo antes da entrada nem depois da saída</label></div>
        ${(()=>{ const vis=leitVistos(dadosMes(pid)), lt=leitDe(c,f), gl=Array.isArray(g.leit)?g.leit:[], nomes=l=>l.length?l.map(k=>(vis.find(v=>v.k===k)||{n:k}).n).join(', '):'todos os leitores';
          return `<div class="pjp-sec"><h4>Leitores do Face ID que contam</h4><small style="color:var(--muted);display:block;margin:-4px 0 8px">A entrada é a 1ª passagem e a saída é a última, só nos leitores que contam. Ex.: tirar o refeitório.</small>
          <label class="pjp-ck"><input type="radio" name="pjp-rlm" value="pad" ${lt.de==='pad'?'checked':''}> Usar o padrão (${esc(nomes(gl))})</label>
          <label class="pjp-ck"><input type="radio" name="pjp-rlm" value="sel" ${lt.de==='pj'?'checked':''}> Só estes, para esta pessoa:</label>
          ${leitCaixas(esc,vis,lt.de==='pj'?lt.l:gl,'pjp-rlt')}</div>`; })()}
        <div class="pjp-sec"><h4>Valor</h4><div class="pjp-rv">
          <label><input type="radio" name="pjp-rv" value="h" ${+pj.fixo>0?'':'checked'}> Por hora trabalhada · R$ <input type="text" id="pjp-rvh" inputmode="decimal" value="${+pj.vh>0?esc(String(+pj.vh).replace('.',',')):''}" placeholder="${r.vh?esc(n2(r.vh)):'0,00'}" style="width:110px"> por hora ${!(+pj.vh>0)&&r.vh?`<small style="color:var(--muted)">(hoje: salário ÷ ${g.horasMes})</small>`:''}</label>
          <label><input type="radio" name="pjp-rv" value="f" ${+pj.fixo>0?'checked':''}> Valor fixo por ${g.modo==='mes'?'mês':'quinzena'} · R$ <input type="text" id="pjp-rfx" inputmode="decimal" value="${+pj.fixo>0?esc(n2(pj.fixo)):''}" placeholder="0,00" style="width:110px"></label></div></div>
        <div class="pjp-sec"><h4>Observação</h4><input class="pjp-rob" id="pjp-rob" style="width:100%" maxlength="200" value="${esc(pj.obs||'')}" placeholder="ex.: trabalha sábado de manhã, combinado com o Marcelo"></div>
        <div class="pjp-ac">${btn('pjp-ppad','Voltar tudo ao padrão',fa)}${btn('pjp-psalva','Salvar regras',fa,'')}</div>`; }
    else { const hs=(x.hist||[]).slice().reverse();
      corpo=`${x.nota?`<div class="pjp-sec"><h4>Nota ${x.nota.num?'nº '+esc(x.nota.num):''} · ${R$(x.nota.valor)}</h4><div>${x.nota.conf==='ok'?'Bate com o pedido.':x.nota.conf==='dif'?'Tem diferença:':'Em PDF: confira abrindo o arquivo.'}</div>${x.nota.probs&&x.nota.conf!=='ok'?`<ul style="margin:6px 0 0;padding-left:18px;color:var(--crit-ink)">${x.nota.probs.map(p=>'<li>'+esc(p)+'</li>').join('')}</ul>`:''}${x.nota.obs?`<p class="ps">Recado do PJ: ${esc(x.nota.obs)}</p>`:''}<div style="margin-top:8px">${btn('pjp-nver','Ver a nota',fa)}</div></div>`:''}
        <div class="pjp-hl">${hs.length?hs.map(h=>`<div><span>${esc(br(h.em.slice(0,10)).slice(0,5))} ${esc(h.em.slice(11,16))}</span><span style="color:inherit">${esc(h.t)}${h.por?` <small style="color:var(--muted)">· ${esc(h.por)}</small>`:''}</span></div>`).join(''):'<div><span></span><span>Nada ainda nesta quinzena.</span></div>'}</div>`; }
    const [stT,stC]=ST[x.st||'']||ST[''];
    return css2+`<div class="pjp-gf" data-pjp-gf><aside class="pjp-g" role="dialog" aria-label="${esc(c.titulo(f.nome))}">
      <div class="pjp-gh"><div class="pjp-av2">${esc(ini2(f.nome))}</div><div><h2>${esc(c.titulo(f.nome))}</h2><small>${esc([emp,f.setor,f.funcao?c.cargo(f.funcao):''].filter(Boolean).join(' · '))}${f.cnpj?' · CNPJ '+esc(fCNPJ(f.cnpj)):''}</small></div><button class="pjp-gx" data-act="pjp-gx" aria-label="Fechar">✕</button></div>
      <div class="pjp-gs"><span class="pjp-pill ${stC}">${stT}</span><small style="color:var(--muted)">${esc(h.ini)} às ${esc(h.fim)} · intervalo ${h.intv} min · ${h.dias.map(i=>DN[i]).join(', ')}</small></div>
      <div class="pjp-tabs" role="tablist">${[['horas','Horas'],['desc','Descontos'+(r.uPend?' ('+r.uPend+')':'')],['regras','Regras desta pessoa'],['hist','Histórico']].map(([k,t])=>`<button role="tab" class="${tab===k?'on':''}" aria-selected="${tab===k}" data-act="pjp-tab" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="pjp-gb">${corpo}</div>
      ${tab==='horas'||tab==='desc'?`<div class="pjp-tot"><div>Horas (decimal)<b>${r.fixo?'fixo':n2(hDec(r.min))+' h'}</b>${r.fixo?'':`<small>${hTxt(r.min)}</small>`}</div><div>× Valor da hora<b>${r.fixo?'—':r.vh?R$(r.vh):'falta'}</b></div>
        <div>− Descontos<b>${r.desc?R$(r.desc):'—'}</b>${tab==='horas'?`<button class="lnk" data-act="pjp-tab" data-v="desc" style="display:inline;margin:0;font-size:12.5px">ver descontos</button>`:''}</div>
        <div>${r.uPend?`<span class="pjp-pill warn">${r.uPend} de uniforme para confirmar</span>`:''}</div>
        <div class="pg-big"><span>Total a pagar</span><b>${R$(r.valor)}</b></div><div style="grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;align-items:center">${acoes(c,pid,f,x,r).replace(/<br>/g,' ')}</div></div>`:''}
    </aside></div>`; }
  function modal(c){ const M=J.mod, esc=c.esc; if(!M) return '';
    if(M.k==='cfg'){ const g=cfg(c);
      return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod" role="dialog" aria-label="Configurar o pagamento dos PJ"><h3>Como o painel faz a conta</h3><p class="sub">Vale para todos os PJ; o horário e o valor da hora de cada pessoa ficam no detalhe dela.</p>
        <div class="pjp-box"><label>Período de pagamento</label><select id="pjp-cmodo"><option value="quinzena" ${g.modo==='quinzena'?'selected':''}>Quinzena (1 a 15 e 16 ao fim do mês)</option><option value="mes" ${g.modo==='mes'?'selected':''}>Mês inteiro</option></select>
          <div class="pjp-g3"><div><label>Horário padrão: entra</label><input type="time" id="pjp-cini" value="${esc(g.ini)}"></div><div><label>Sai</label><input type="time" id="pjp-cfim" value="${esc(g.fim)}"></div><div><label>Intervalo (min)</label><input id="pjp-cintv" inputmode="numeric" value="${esc(g.intv)}"></div></div>
          <div class="pjp-g3"><div><label>Tolerância (min)</label><input id="pjp-ctol" inputmode="numeric" value="${esc(g.tol)}"></div><div><label>Horas por mês (salário ÷)</label><input id="pjp-chm" inputmode="numeric" value="${esc(g.horasMes)}"></div><div><label>Link vale (dias)</label><input id="pjp-cdias" inputmode="numeric" value="${esc(g.dias)}"></div></div>
          <label style="display:flex;gap:8px;align-items:center;color:inherit;font-size:14px;margin-top:12px"><input type="checkbox" id="pjp-cdentro" style="width:20px;height:20px" ${g.dentro?'checked':''}> Não contar o tempo antes do início nem depois do fim do horário</label>
          <label style="margin-top:12px">Leitores do Face ID que contam para a entrada e a saída <small style="font-weight:400;color:var(--muted)">(nenhum marcado = todos; ex.: deixe o refeitório de fora)</small></label>${leitCaixas(esc,leitVistos(dadosMes(J.per)),Array.isArray(g.leit)?g.leit:[],'pjp-clt')}
          <label>Mensagem do pedido de nota ({NOME}, {PERIODO}, {HORAS}, {VALOR}, {EMPRESA}, {CNPJ}, {LINK})</label><textarea id="pjp-cmsg" rows="5">${esc(g.msg)}</textarea></div>
        <div class="pjp-ac">${btn('pjp-modx','Cancelar')}${btn('pjp-cfgok','Salvar','','')}</div></div></div>`; }
    if(M.k==='ped'){ const lk=linkDe(M.ped.t), tel=dig(M.tel), wa=(tel?'https://wa.me/'+(tel.length<=11?'55':'')+tel:'https://wa.me/')+'?text='+encodeURIComponent(M.msg);
      return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod" role="dialog" aria-label="Pedido de nota"><h3>Pedido de nota · ${esc(M.ped.nome)}</h3><p class="sub">${esc(M.ped.perTxt)} · ${R$(M.ped.valor)}. O link vale ${cfg(c).dias} dias.</p>
        <span class="lk">${esc(lk)}</span><label class="sub">Mensagem</label><textarea id="pjp-pmsg">${esc(M.msg)}</textarea>
        ${tel?'':'<p class="sub" style="color:var(--warn-ink,#7A5310)">Sem telefone no cadastro: o WhatsApp abre para você escolher a pessoa.</p>'}
        <div class="pjp-ac" style="margin-top:12px">${btn('pjp-modx','Fechar')}${btn('pjp-copia','Copiar mensagem')}${M.email?btn('pjp-mail','E-mail'):''}<a class="btn" data-act="pjp-wa" href="${esc(wa)}" target="_blank" rel="noopener">Mandar no WhatsApp</a></div></div></div>`; }
    if(M.k==='lote'){ return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod" role="dialog" aria-label="Pedidos de nota"><h3>${M.xs.length} pedidos de nota criados</h3><p class="sub">Toque em cada um para mandar no WhatsApp (abre a conversa com a mensagem pronta).</p>
        <ul class="pjp-lote">${M.xs.map((p,i)=>`<li><span><b>${esc(p.nome)}</b><small class="sub" style="display:block">${R$(p.valor)}${p.tel?'':' · sem telefone'}</small></span><span><button class="btn sec" data-act="pjp-loteum" data-i="${i}">${p.feito?'Mandado ✓':'Mandar no WhatsApp'}</button></span></li>`).join('')}</ul>
        <div class="pjp-ac">${btn('pjp-modx','Fechar','','')}</div></div></div>`; }
    if(M.k==='nao'){ return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod" role="dialog" aria-label="Pedir outra nota"><h3>Pedir outra nota · ${esc(M.nome)}</h3><p class="sub">O valor volta para "fechado"; confira e peça de novo. Diga o que estava errado (vai no histórico).</p>
        <textarea id="pjp-nmot" placeholder="ex.: nota emitida para o CNPJ errado"></textarea><div class="pjp-ac" style="margin-top:10px">${btn('pjp-modx','Cancelar')}${btn('pjp-nnaook','Voltar para fechado','data-f="'+esc(M.fid)+'"','')}</div></div></div>`; }
    return ''; }
  /* ---------- Enviar ao Conectwork (07/11): a medição da quinzena de cada prestadora (Zenith, Nexus…) ----------
     Abre o Conectwork em #medicoes/importar/<resumo>: lá o RH (ou o admin) da Colafix confere e manda para a prestadora.
     O resumo vai no próprio link (base64url do JSON {v:1, periodo, cnpj da prestadora, nome, total em centavos, ref,
     itens:[{n: nome, h: horas decimais ou null quando é valor fixo, v: centavos}]}): só nome, horas e valor, NUNCA CPF.
     Usa o valor fechado de cada PJ (ou o calculado agora, se ainda não foi fechado). Fica registrado no período
     (cw.{EMPRESA} = {em, por, total, n}). Endereço do Conectwork: rh/config.conectworkUrl (padrão: o do GitHub Pages). */
  const CW_URL='https://conectwork.com.br/';
  const b64u=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function cwMedicao(c,pid,empK){ const p=perDe(pid), D=docP(pid), emp=(c.EMP_DOC||{})[empK]||null;
    const rs=pjs(c,p).filter(f=>String(f.empresa||'').toUpperCase()===empK).map(f=>{ const x=(D.pes||{})[f._id]||{}, r=calcPessoa(c,f,p,x), fe=x.st&&x.fech;
      return {f,x,min:fe?fe.min:r.min,valor:fe?fe.valor:r.valor,fixo:r.fixo}; });
    /* CNPJ do MEI de cada PJ (10/11/2026): só das prestadoras em rh/config.conectworkMei (padrão: só a NEXUS); no Conectwork
       cada PJ recebe o espelho da nota dele para a prestadora. CNPJ é da empresa do PJ, nunca CPF. */
    const comCnpj=(((c.R.cfg||{}).conectworkMei)||['NEXUS']).map(x=>String(x).toUpperCase()).includes(empK);
    const itens=rs.filter(o=>o.valor>0).map(o=>{ const i={n:c.titulo(o.f.nome).slice(0,120),h:o.fixo?null:Math.round(hDec(o.min)*100)/100,v:Math.round(o.valor*100)}, cn=dig(o.f.cnpj);
      if(comCnpj&&cn.length===14) i.c=cn; return i; });
    return {emp,rs,itens,abertos:rs.filter(o=>!o.x.st).length,
      payload:{v:1,periodo:pid,cnpj:dig(emp&&emp.cnpj),nome:emp?emp.nome:empK,total:itens.reduce((a,i)=>a+i.v,0),ref:'painel-rh:'+pid+':'+empK,itens}}; }
  const quando=iso=>{ const d=new Date(iso); return isNaN(d)?'':pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+' às '+pad2(d.getHours())+':'+pad2(d.getMinutes()); };
  const cwLink=(c,payload)=>String(((c.R.cfg||{}).conectworkUrl)||CW_URL).replace(/#.*$/,'')+'#medicoes/importar/'+b64u(JSON.stringify(payload));
  function cwBloco(c,pid,emps){ const esc=c.esc, D=docP(pid), ks=emps.filter(k=>k!=='COLAFIX'&&dig(((c.EMP_DOC||{})[k]||{}).cnpj).length===14); if(!ks.length) return '';
    return `<div class="pjp-cw"><div><b>Conectwork</b><small>Mande a medição da ${cfg(c).modo==='mes'?'mês':'quinzena'} de cada prestadora: nome, horas e valor de cada PJ (sem CPF). Lá você confere e envia para a prestadora.</small></div>
      ${ks.map(k=>{ const M=cwMedicao(c,pid,k), ja=(D.cw||{})[k], conf=J.cwConf===k;
        return `<div class="pjp-cwe"><span><b>${esc(c.titulo(k))}</b> · ${M.itens.length} PJ · ${R$(M.payload.total/100)}${ja?`<small>Enviado em ${esc(quando(ja.em))}${ja.por?' por '+esc(ja.por):''}${ja.total!==M.payload.total?' · o valor mudou depois':''}</small>`:''}
          ${M.abertos&&!conf?`<small style="color:var(--crit-ink)">${M.abertos} ${M.abertos===1?'PJ ainda sem':'PJ ainda sem'} o valor fechado</small>`:''}${conf?`<small style="color:var(--crit-ink)">Toque de novo para enviar com ${M.abertos} sem o valor fechado (vai o valor calculado agora)</small>`:''}</span>
          ${M.itens.length?btn('pjp-cw',(ja?'Enviar de novo':'Enviar ao Conectwork'),'data-e="'+esc(k)+'"',conf||!ja?'':'sec'):'<small>Nenhum valor para enviar</small>'}</div>`; }).join('')}</div>`; }

  /* etapas (10/11, "organizar a aba e deixar funcional"): cada PJ está numa etapa; os cartões das etapas também filtram a lista */
  const ETAPAS=[['','Conferir as horas','e fechar o valor'],['fechado','Pedir a nota','valor fechado'],['pedido','Esperando a nota','o PJ manda pelo link'],['chegou','Conferir a nota','chegou pelo link'],['conferida','Para pagar','nota conferida'],['pago','Pago','']];
  const etIdx=st=>Math.max(0,ETAPAS.findIndex(e=>e[0]===(st||'')));
  function render(c){ C=c; const esc=c.esc; if(!J.per) J.per=perAtual(c); const pid=J.per, p=perDe(pid); assina(c,pid);
    const D=docP(pid), xs=pjs(c,p), linhas=[], tot={n:0,min:0,val:0,desc:0}; let semFid=0, semVh=0;
    const emps=[...new Set(xs.map(f=>String(f.empresa||'').toUpperCase()).filter(Boolean))].sort();
    const q=norm(J.q), ehAt=pid===perAtual(c), sit=J.sit==null?'*':J.sit;
    const rsT=xs.map(f=>{ const x=(D.pes||{})[f._id]||{}; const r=x.st&&x.fech?Object.assign(calcPessoa(c,f,p,x),{min:x.fech.min,valor:x.fech.valor,bruto:x.fech.bruto,desc:x.fech.desc||0}):calcPessoa(c,f,p,x); return {f,x,r}; });
    const sets=[...new Set(rsT.map(({f})=>f.setor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const nConf=rsT.filter(({x,r})=>!x.st&&r.alerta).length;
    /* empresa, setor e pessoa filtram as etapas e a lista; a etapa escolhida filtra só a lista */
    const rsF=rsT.filter(({f,x,r})=>(!J.emp||String(f.empresa||'').toUpperCase()===J.emp)&&(!J.set||(f.setor||'')===J.set)&&(!J.conf||(!x.st&&r.alerta))&&(!q||norm(f.nome+' '+(f.setor||'')+' '+(f.empresa||'')).includes(q)));
    const porEt=ETAPAS.map(([k])=>{ const ys=rsF.filter(({x})=>(x.st||'')===k); return {n:ys.length,v:ys.reduce((a,o)=>a+o.r.valor,0)}; });
    const rs=rsF.filter(({x})=>sit==='*'||(x.st||'')===sit).sort((A,B)=>etIdx(A.x.st)-etIdx(B.x.st)||String(A.f.nome).localeCompare(String(B.f.nome),'pt-BR'));
    J._vis=rs.map(o=>o.f._id);
    const totF={n:rsF.length,min:rsF.reduce((a,o)=>a+o.r.min,0),val:rsF.reduce((a,o)=>a+o.r.valor,0),pago:porEt[5].v};
    let etAnt=-1;
    rs.forEach(({f,x,r})=>{ tot.n++; tot.min+=r.min; tot.val+=r.valor; tot.desc+=r.desc||0; const st=x.st||''; if(r.semFid&&!r.fixo&&!x.st) semFid++; if(!x.st&&!r.fixo&&!r.vh) semVh++;
      const emp=String(f.empresa||'').toUpperCase(), ab=J.ab===f._id, ei=etIdx(st);
      if(sit==='*'&&ei!==etAnt){ etAnt=ei; linhas.push(`<tr class="pjp-gr"><td colspan="6"><b>${ei+1}</b>${esc(ETAPAS[ei][1])}<small>${porEt[ei].n} PJ · ${R$(porEt[ei].v)}</small></td></tr>`); }
      linhas.push(`<tr class="${st==='pago'?'feito':''} ${ab?'aberto':''}"><td class="pjp-tn"><button class="pjp-nm" data-act="pjp-ab" data-f="${esc(f._id)}" aria-haspopup="dialog">${esc(c.titulo(f.nome))}</button><small>${esc([emp,f.setor].filter(Boolean).join(' · '))}</small>${!st&&r.semFid&&!r.fixo?'<small style="color:var(--crit-ink)">Sem passagem no Face ID</small>':''}</td>
        <td class="n" data-r="Horas">${r.fixo?'<small>valor fixo</small>':`<b>${n2(hDec(r.min))} h</b><small>${hTxt(r.min)}</small>`}</td>
        <td class="n" data-r="Valor da hora">${r.fixo?'—':r.vh?R$(r.vh):'<b style="color:var(--crit-ink)">falta</b>'}</td>
        <td class="n" data-r="Desconto">${r.desc?'− '+R$(r.desc):'—'}</td><td class="n pjp-tt" data-r="Total a pagar"><b>${R$(r.valor)}</b></td>
        <td class="pjp-qa">${acoes(c,pid,f,x,r)}</td></tr>`); });
    const okFech=o=>!o.x.st&&(o.r.fixo||(o.r.vh&&o.r.min))&&!o.r.uPend, nAbre=rs.filter(okFech).length, nFech=rs.filter(({x})=>x.st==='fechado').length;
    const dadosOk=!!(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes]);
    const dias=dadosOk?Object.keys(window.RHAlmoco._A.dados[p.mes].dias||{}).filter(d=>d>=p.de&&d<=p.ate).sort():[];
    const avFid=!dadosOk?'<div class="pjp-av">Carregando o Face ID do mês…</div>':!dias.length?`<div class="pjp-av">Ainda não tem Face ID importado de ${esc(p.curto)}. Importe o CSV em Almoço/café (ou espere o robô do Face ID).</div>`
      :dias[dias.length-1]<p.ate&&p.ate<c.P.hojeStr()&&diasDe(p).some(d=>d>dias[dias.length-1]&&![0,6].includes(new Date(d+'T12:00:00').getDay()))?`<div class="pjp-av">O Face ID importado vai até ${brc(dias[dias.length-1])}; a quinzena vai até ${brc(p.ate)}. Importe o resto antes de fechar.</div>`:'';
    const filtros=J.emp||J.set||J.conf||J.q;
    const etapas=`<div class="pjp-et" role="group" aria-label="Etapas do pagamento">${ETAPAS.map(([k,t,sub],i)=>{ const o=porEt[i], on=sit===k;
        return `<button class="pjp-ec ${on?'on':''} ${o.n?'':'vz'} ${i===5?'ok':''}" data-act="pjp-et" data-v="${k}" aria-pressed="${on}"><span class="pjp-en">${i+1}</span><span class="pjp-et1">${esc(t)}</span><b>${o.n}</b><small>${o.n?R$(o.v):esc(sub||'—')}</small></button>`; }).join('')}</div>`;
    const lote=(nAbre>1&&(sit==='*'||sit==='')?btn('pjp-fechtodos','Fechar o valor dos '+nAbre,'',''):'')+(nFech>1&&(sit==='*'||sit==='fechado')?btn('pjp-pedtodos','Pedir nota aos '+nFech+' fechados','',''):'');
    return css+css3+c.topo('Pagamento dos PJ','Horas de cada PJ pelo Face ID, o valor a pagar e a nota fiscal.',btn('pjp-cfg','Como é feita a conta'),'RH · PAGAMENTO DOS PJ')+
      `<div class="pjp"><div class="pjp-rb"><div class="pjp-nav"><button class="btn sec pjp-sm" data-act="pjp-per" data-v="-1" aria-label="Quinzena anterior">‹</button>
          <div><span>${cfg(c).modo==='mes'?'Mês':'Quinzena'}</span><b>${esc(p.txt)}</b>${ehAt?'<small>a quinzena para pagar agora</small>':lnk('pjp-per','voltar para a atual','data-v="0"')}</div>
          <button class="btn sec pjp-sm" data-act="pjp-per" data-v="1" aria-label="Próxima quinzena">›</button></div>
        <div class="pjp-tot1"><span>Total da quinzena</span><b>${R$(totF.val)}</b><small>${totF.n} PJ · ${hTxt(totF.min)}${totF.pago?' · pago '+R$(totF.pago):''}</small></div>
        <span class="pjp-sp"></span>${btn('pjp-xls','Excel')}${btn('pjp-pdf','Baixar PDF')}</div>
      ${etapas}
      <div class="pjp-fil"><label>Empresa<select id="pjp-emp" aria-label="Empresa"><option value="">Todas</option>${emps.map(e=>`<option ${J.emp===e?'selected':''}>${esc(e)}</option>`).join('')}</select></label>
        ${sets.length?`<label>Setor<select id="pjp-set" aria-label="Setor"><option value="">Todos</option>${sets.map(e=>`<option ${J.set===e?'selected':''}>${esc(e)}</option>`).join('')}</select></label>`:''}
        <label class="pjp-fq">Pessoa<input id="pjp-q" type="search" placeholder="Buscar" value="${esc(J.q)}"></label>
        ${nConf?`<label>&nbsp;<button class="btn ${J.conf?'':'sec'} pjp-sm" data-act="pjp-confx" aria-pressed="${!!J.conf}" style="height:36px">Só com dia para conferir (${nConf})</button></label>`:''}
        ${filtros||sit!=='*'?`<label>&nbsp;<button class="lnk" data-act="pjp-flimpa" style="height:36px;margin:0">Limpar filtros</button></label>`:''}</div>
      ${avFid}${semFid?`<div class="pjp-av">${semFid} PJ sem passagem no Face ID: confira o CPF no cadastro (o Face ID liga pelo CPF ou pelo nome).</div>`:''}${semVh?`<div class="pjp-av">${semVh} PJ sem valor da hora: toque em "Pôr o valor da hora" (ou cadastre o salário em Funcionários).</div>`:''}
      ${rs.length?`<div class="pjp-lh"><div><b>${sit==='*'?'Todos os PJ':esc(ETAPAS[etIdx(sit)][1])}</b><small>${tot.n} PJ · ${R$(tot.val)} · toque no nome para ver os dias</small></div><span class="pjp-sp"></span>${lote}</div>
        <div class="pjp-tw"><table class="pjp-t"><thead><tr><th>PJ</th><th class="n">Horas</th><th class="n">Valor da hora</th><th class="n">Desconto</th><th class="n">Total a pagar</th><th class="pjp-qa">Próximo passo</th></tr></thead><tbody>${linhas.join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="n" data-r="Horas">${hTxt(tot.min)}</td><td></td><td class="n" data-r="Desconto">${tot.desc?'− '+R$(tot.desc):'—'}</td><td class="n pjp-tt" data-r="Total a pagar">${R$(tot.val)}</td><td></td></tr></tfoot></table></div>`
        :`<div class="empty">${!xs.length?'Nenhum PJ ativo no cadastro do RH (Funcionários com vínculo PJ).':sit!=='*'&&rsF.length?'Nenhum PJ nesta etapa.':'Nenhum PJ com esse filtro.'}</div>`}
      ${cwBloco(c,pid,emps)}
      </div>`+gaveta(c,pid,rsT)+modal(c); }
  const css3=`<style id="pjp-css3">
  .pjp-tot1{display:flex;flex-direction:column;line-height:1.2;background:var(--teal-strong);color:#fff;border-radius:12px;padding:8px 16px;margin-left:8px}
  .pjp-tot1 span{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.75)}.pjp-tot1 b{font-size:21px}.pjp-tot1 small{font-size:12px;color:rgba(255,255,255,.8)}
  .pjp-et{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
  .pjp-ec{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;border:1px solid var(--line,#E1E7EB);background:var(--surface);border-radius:12px;padding:10px 12px 10px 40px;cursor:pointer;font:inherit;color:inherit;min-height:74px}
  .pjp-ec:hover{border-color:var(--teal)}.pjp-ec.on{border-color:var(--teal-strong);box-shadow:inset 0 0 0 1px var(--teal-strong);background:var(--teal-tint,#E2ECF1)}
  .pjp-ec:focus-visible{outline:3px solid #9FBFCF;outline-offset:2px}
  .pjp-en{position:absolute;left:12px;top:11px;width:20px;height:20px;border-radius:50%;background:var(--ground);color:var(--muted);display:grid;place-items:center;font-size:11.5px;font-weight:700}
  .pjp-ec:not(.vz) .pjp-en{background:var(--teal-strong);color:#fff}.pjp-ec.ok:not(.vz) .pjp-en{background:var(--ok,#3E7D5A)}
  .pjp-et1{font-size:12.5px;font-weight:600;color:var(--muted)}.pjp-ec b{font-size:22px;line-height:1.15}.pjp-ec small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .pjp-ec.vz b{color:var(--muted);font-weight:500}
  .pjp-lh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pjp-lh small{display:block;color:var(--muted);font-size:12.5px}.pjp-lh b{font-size:16px}
  .pjp-t tr.pjp-gr td{background:var(--ground);padding:7px 10px;font-weight:600;font-size:13px;border-bottom:0}
  .pjp-t tr.pjp-gr b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--teal-strong);color:#fff;font-size:11.5px;margin-right:8px}
  .pjp-t tr.pjp-gr small{display:inline;margin-left:10px;font-weight:400}
  .pjp-qa{min-width:220px}.pjp-qa .pjp-pill{display:block;width:fit-content;margin:0 0 6px auto}
  .pjp-lks{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;margin-top:5px;font-size:12.5px;color:var(--muted)}.pjp-lks .lnk{display:inline!important;margin:0!important}
  @media(max-width:1100px){.pjp-et{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:760px){
    .pjp-tot1{margin-left:0;order:3;flex:1 1 100%}.pjp-nav{flex:1}
    .pjp-et{grid-template-columns:repeat(2,minmax(0,1fr))}.pjp-ec{min-height:0}
    .pjp-fil{display:grid;grid-template-columns:1fr 1fr}.pjp-fil .pjp-fq{grid-column:1/-1}.pjp-fil select,.pjp-fil input{min-width:0;width:100%}
    .pjp-tw{overflow:visible}.pjp-t thead{display:none}.pjp-t,.pjp-t tbody,.pjp-t tfoot{display:block}
    .pjp-t tr{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;border:1px solid var(--line,#E1E7EB);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--surface)}
    .pjp-t td{display:block;border:0!important;padding:0!important;text-align:left!important}
    .pjp-t td[data-r]::before{content:attr(data-r);display:block;font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
    .pjp-t td.pjp-tn,.pjp-t td.pjp-qa{grid-column:1/-1}.pjp-t td:empty{display:none}
    .pjp-t td.pjp-qa{min-width:0;border-top:1px solid var(--line,#E1E7EB)!important;padding-top:10px!important}.pjp-qa .pjp-pill{margin:0 0 6px 0}.pjp-lks{justify-content:flex-start}
    .pjp-t tr.pjp-gr{display:block;border:0;padding:6px 2px;background:none;margin:8px 0 4px}.pjp-t tr.pjp-gr td{background:none;padding:0!important}
    .pjp-t tfoot tr{background:var(--ground)}
  }
  </style>`;
  /* ---------- relatórios ---------- */
  function linhasRel(c){ const pid=J.per, p=perDe(pid), D=docP(pid);
    return pjs(c,p).filter(f=>!J.emp||String(f.empresa||'').toUpperCase()===J.emp).map(f=>{ const x=(D.pes||{})[f._id]||{}; const r=calcPessoa(c,f,p,x); const fe=x.st&&x.fech; return {f,x,r,min:fe?fe.min:r.min,valor:fe?fe.valor:r.valor,desc:fe?fe.desc||0:r.desc,descMot:fe?(fe.descMot||x.descMot||''):r.descMot,bruto:fe?fe.bruto:r.bruto,vh:fe?fe.vh:r.vh}; }); }
  /* ---------- Excel igual à planilha do RH (04/11) ----------
     Uma aba por empresa ("Horas Trabalhadas Zenith", "NEXUS"…), um bloco por pessoa como na planilha original:
     NOME | SETOR | Horário…, depois Dia · Entrada · Saída · Entrada Tolerância Ajustada · Saída Tolerância Ajustada ·
     Total de Horas (desconta o intervalo) · Conversão Decimal, com as FÓRMULAS (dá para corrigir no Excel e a conta refaz),
     e o Cálculo final (Total Horas, Valor Horas, Desconto, Total a Pagar). Aba Resumo com o total por pessoa e por setor. */
  const XJS='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  const carregaJs=src=>new Promise((ok,er)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=er; document.head.appendChild(s); });
  const tFr=hm=>{ const m=min(hm); return m==null?0:m/1440; };
  const tF=m=>'TIME('+Math.floor(m/60)+','+(m%60)+',0)';
  async function excelOrig(c){ if(!window.ExcelJS){ try{ await carregaJs(XJS); }catch(e){} } if(!window.ExcelJS) return false;
    const p=perDe(J.per), L=linhasRel(c); if(!L.length) throw new Error('Nenhum PJ para baixar.');
    const wb=new ExcelJS.Workbook(); wb.creator='Painel Colafix'; wb.calcProperties.fullCalcOnLoad=true;
    const AZ='FF143F54', CZ='FFE2ECF1', CI='FFF2F2F2', bd={top:{style:'thin',color:{argb:'FFC9D3D9'}},left:{style:'thin',color:{argb:'FFC9D3D9'}},bottom:{style:'thin',color:{argb:'FFC9D3D9'}},right:{style:'thin',color:{argb:'FFC9D3D9'}}};
    const FR='"R$" #,##0.00';
    /* Resumo */
    const R0=wb.addWorksheet('Resumo',{views:[{showGridLines:false}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9}});
    R0.columns=[{width:34},{width:12},{width:18},{width:24},{width:11},{width:13},{width:14},{width:13},{width:16},{width:24},{width:12}];
    R0.mergeCells('A1:K1'); R0.getCell('A1').value='Pagamento dos PJ · '+p.txt; R0.getCell('A1').font={bold:true,size:15,color:{argb:AZ}};
    R0.mergeCells('A2:K2'); R0.getCell('A2').value='Horas pelo Face ID · emitido em '+new Date().toLocaleString('pt-BR')+(J.emp?' · empresa '+J.emp:''); R0.getCell('A2').font={size:10,color:{argb:'FF5E6E77'}};
    const hdr=['PJ','Empresa','Setor','Horário','Horas','Valor hora','Bruto','Desconto','Total a pagar','Situação','Nº nota'];
    const hr=R0.getRow(4); hr.values=hdr; hr.eachCell(cl=>{ cl.font={bold:true,color:{argb:'FFFFFFFF'}}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:AZ}}; cl.alignment={vertical:'middle',wrapText:true}; cl.border=bd; }); hr.height=22;
    let rr=5; const r1=rr;
    L.forEach(o=>{ const row=R0.getRow(rr); row.values=[c.titulo(o.f.nome),String(o.f.empresa||'').toUpperCase(),o.f.setor||'',o.r.fixo?'valor fixo':o.r.h.ini+' às '+o.r.h.fim+' · int. '+o.r.h.intv+' min',+(hDec(o.min).toFixed(2)),o.r.fixo?null:(o.vh||0),o.bruto,o.desc||0,null,(ST[o.x.st||'']||ST[''])[0],o.x.nota&&o.x.nota.num||''];
      row.getCell(9).value={formula:`G${rr}-H${rr}`,result:o.valor}; row.getCell(5).numFmt='0.00'; [6,7,8,9].forEach(k=>row.getCell(k).numFmt=FR); row.eachCell({includeEmpty:true},cl=>{ cl.border=bd; }); if((rr-r1)%2) row.eachCell({includeEmpty:true},cl=>{ cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F9FA'}}; }); rr++; });
    const rt=R0.getRow(rr); rt.values=['Total']; [5,7,8,9].forEach(k=>{ const col=String.fromCharCode(64+k); rt.getCell(k).value={formula:`SUM(${col}${r1}:${col}${rr-1})`}; rt.getCell(k).numFmt=k===5?'0.00':FR; });
    rt.eachCell({includeEmpty:true},cl=>{ cl.font={bold:true}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:CZ}}; cl.border=bd; });
    R0.autoFilter={from:'A4',to:'K'+(rr-1)}; R0.views=[{state:'frozen',ySplit:4,showGridLines:false}];
    /* total por setor (como a coluna da direita da planilha) */
    const setores=[...new Set(L.map(o=>o.f.setor||'(sem setor)'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    let rs=rr+3; R0.getCell('A'+(rs-1)).value='Total por setor'; R0.getCell('A'+(rs-1)).font={bold:true,color:{argb:AZ}};
    const hs=R0.getRow(rs); hs.values=['Setor','','','','Horas','','','','Total a pagar']; [1,5,9].forEach(k=>{ const cl=hs.getCell(k); cl.font={bold:true,color:{argb:'FFFFFFFF'}}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:AZ}}; }); rs++;
    setores.forEach(st=>{ const row=R0.getRow(rs), lb=st==='(sem setor)'?'':st; row.getCell(1).value=st;
      row.getCell(5).value={formula:`SUMIF(C${r1}:C${rr-1},"${lb.replace(/"/g,'""')}",E${r1}:E${rr-1})`}; row.getCell(5).numFmt='0.00';
      row.getCell(9).value={formula:`SUMIF(C${r1}:C${rr-1},"${lb.replace(/"/g,'""')}",I${r1}:I${rr-1})`}; row.getCell(9).numFmt=FR; [1,5,9].forEach(k=>row.getCell(k).border=bd); rs++; });
    /* uma aba por empresa, um bloco por pessoa (igual à planilha) */
    const porEmp=new Map(); L.forEach(o=>{ const e=String(o.f.empresa||'').toUpperCase()||'SEM EMPRESA'; if(!porEmp.has(e)) porEmp.set(e,[]); porEmp.get(e).push(o); });
    for(const [emp,os] of porEmp){ const nome=(emp==='ZENITH'?'Horas Trabalhadas Zenith':emp==='NEXUS'?'NEXUS':emp).slice(0,31);
      const W=wb.addWorksheet(nome,{pageSetup:{orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9}});
      W.columns=[{width:16},{width:11},{width:11},{width:17},{width:17},{width:20},{width:13},{width:44}];
      let r=1;
      os.forEach(o=>{ const h=o.r.h, ini=min(h.ini), fim=min(h.fim), tol=+h.tol||0, iv=+h.intv||0;
        const t=W.getRow(r); t.getCell(1).value=c.titulo(o.f.nome).toUpperCase(); t.getCell(2).value=String(o.f.setor||'').toUpperCase(); W.mergeCells(`C${r}:H${r}`);
        t.getCell(3).value='Horário: '+h.ini+'hr às '+h.fim+'hr / Intervalo de '+hhmm(iv)+(h.dentro?' · não conta fora do horário':'')+(o.r.fixo?' · VALOR FIXO':'');
        t.eachCell({includeEmpty:true},cl=>{ cl.font={bold:true}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:CZ}}; cl.border=bd; }); r++;
        const hd=W.getRow(r); hd.values=['Dia','Entrada','Saída','Entrada Tolerância Ajustada','Saída Tolerância Ajustada','Total de Horas (desconta '+hhmm(iv)+' intervalo)','Conversão Decimal','Observação'];
        hd.eachCell(cl=>{ cl.font={bold:true,size:10}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:CI}}; cl.alignment={wrapText:true,vertical:'middle'}; cl.border=bd; }); hd.height=30; r++;
        const d0=r;
        o.r.dias.forEach(d=>{ const row=W.getRow(r), dt=new Date(d.d+'T12:00:00');
          row.getCell(1).value=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())); row.getCell(1).numFmt='dd/mm/yyyy ddd';
          row.getCell(2).value=d.zero?0:tFr(d.e); row.getCell(3).value=d.zero?0:tFr(d.e&&d.s?d.s:'');
          const lim=(v,b)=>`AND(${v}>=${tF(b-tol)},${v}<=${tF(b+tol)})`;
          let fD=`IF(B${r}=0,0,IF(${lim('B'+r,ini)},${tF(ini)},B${r}))`, fE=`IF(C${r}=0,0,IF(${lim('C'+r,fim)},${tF(fim)},C${r}))`;
          if(h.dentro){ fD=`IF(B${r}=0,0,MAX(${tF(ini)},${fD}))`; fE=`IF(C${r}=0,0,MIN(${tF(fim)},${fE}))`; }
          row.getCell(4).value={formula:fD,result:d.E!=null&&d.m?d.E/1440:(d.e&&!d.zero?tFr(d.e):0)};
          row.getCell(5).value={formula:fE,result:d.S!=null&&d.m?d.S/1440:0};
          row.getCell(6).value={formula:`IF(E${r}-D${r}<=0,0,MAX(0,E${r}-D${r}-${tF(iv)}))`,result:d.m/1440};
          row.getCell(7).value={formula:`F${r}*24`,result:+(d.m/60).toFixed(4)};
          row.getCell(8).value=d.aj?(d.zero?'Não trabalhou':'Corrigido à mão')+(d.mot?': '+d.mot:'')+(d.hs.length?' · Face ID: '+d.hs.join(' '):''):d.fl?d.fl+' · Face ID: '+d.hs.join(' '):d.hs.length>2?'Face ID: '+d.hs.join(' '):d.info||'';
          [2,3,4,5].forEach(k=>row.getCell(k).numFmt='hh:mm'); row.getCell(6).numFmt='[h]:mm'; row.getCell(7).numFmt='0.00';
          row.eachCell({includeEmpty:true},cl=>{ cl.border=bd; if(d.dw===0||d.dw===6) cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F7F7'}}; if(d.fl&&!d.aj) cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFBF1DC'}}; if(d.aj) cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEAF2F6'}}; }); r++; });
        const d1=r-1, cf=(lab,k,v,fmt,bold)=>{ const row=W.getRow(r); row.getCell(5).value=lab; row.getCell(k).value=v; if(fmt) row.getCell(k).numFmt=fmt; [5,6,7].forEach(j=>{ row.getCell(j).border=bd; if(bold){ row.getCell(j).font={bold:true}; row.getCell(j).fill={type:'pattern',pattern:'solid',fgColor:{argb:CZ}}; } }); return r++; };
        const rT=r; W.getCell('A'+r).value='Cálculo final'; W.getCell('A'+r).font={bold:true};
        cf('Total Horas',6,{formula:`SUM(F${d0}:F${d1})`,result:o.min/1440},'[h]:mm'); W.getCell('G'+rT).value={formula:`F${rT}*24`,result:+(o.min/60).toFixed(4)}; W.getCell('G'+rT).numFmt='0.00'; W.getCell('G'+rT).border=bd;
        const rV=cf(o.r.fixo?'Valor fixo':'Valor Horas',6,o.r.fixo?o.r.fixo:(o.vh||0),FR);
        const rD=cf('Desconto',6,o.desc||0,FR); if(o.descMot) W.getCell('H'+rD).value=o.descMot;
        cf('Total a Pagar',6,{formula:o.r.fixo?`F${rV}-F${rD}`:`F${rV}*G${rT}-F${rD}`,result:o.valor},FR,true);
        r+=1; });
    }
    const buf=await wb.xlsx.writeBuffer(), arq='Pagamento-PJ-'+J.per+'.xlsx', blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=arq; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
    window.__pjpUltimoXls=arq; c.P.toast('Excel baixado: '+arq); return true; }
  async function excel(c){ if(await excelOrig(c)) return;
    /* sem o ExcelJS (sem internet): a planilha simples de sempre */ const p=perDe(J.per), L=linhasRel(c);
    const res=L.map(o=>[c.titulo(o.f.nome),String(o.f.empresa||'').toUpperCase(),o.f.setor||'',o.r.h.ini+' às '+o.r.h.fim,+(hDec(o.min).toFixed(2)),o.vh||0,o.bruto,o.desc,o.descMot||'',o.valor,(ST[o.x.st||'']||ST[''])[0],o.x.nota&&o.x.nota.num||'']);
    const dias=[]; L.forEach(o=>o.r.dias.forEach(d=>{ if(d.hs.length||d.aj) dias.push([c.titulo(o.f.nome),br(d.d),d.hs.join(' '),d.e,d.s,+(hDec(d.m).toFixed(2)),d.aj?'ajustado'+(d.mot?': '+d.mot:''):d.fl||'']); }));
    await window.RHRel.xls('Pagamento-PJ-'+J.per,[{nome:'Resumo',cab:['PJ','Empresa','Setor','Horário','Horas','Valor da hora','Bruto','Desconto','Motivo do desconto','Total a pagar','Situação','Nº da nota'],linhas:res,tipos:['txt','txt','txt','txt','dec','rs','rs','rs','txt','rs','txt','txt'],tot:[4,6,7,9]},
      {nome:'Dias',cab:['PJ','Dia','Passagens no Face ID','Entrada','Saída','Horas','Observação'],linhas:dias,tipos:['txt','data','txt','txt','txt','dec','txt']}],{tit:'Pagamento dos PJ · '+p.txt,sub:'Horas pelo Face ID',filtros:J.emp?['Empresa: '+J.emp]:[]}); }
  async function pdf(c){ const p=perDe(J.per), L=linhasRel(c), tot=L.reduce((a,o)=>a+o.valor,0), tm=L.reduce((a,o)=>a+o.min,0);
    await window.RHRel.pdf({tit:'Pagamento dos PJ',sub:p.txt,filtros:J.emp?['Empresa: '+J.emp]:[],kpis:[{t:'PJ',v:String(L.length)},{t:'Horas',v:hTxt(tm)},{t:'Total a pagar',v:R$(tot)},{t:'Notas conferidas',v:String(L.filter(o=>['conferida','pago'].includes(o.x.st)).length)}],
      partes:[{secao:'Por pessoa',cols:[{t:'PJ',w:46},{t:'Empresa',w:18},{t:'Horas',w:14,al:'r'},{t:'R$/hora',w:16,al:'r'},{t:'Desconto',w:16,al:'r'},{t:'Total',w:20,al:'r'},{t:'Situação',w:26}],
        rows:L.map(o=>[c.titulo(o.f.nome),String(o.f.empresa||'').toUpperCase(),o.r.fixo?'fixo':hTxt(o.min),o.r.fixo?'—':n2(o.vh),o.desc?n2(o.desc):'—',n2(o.valor),(ST[o.x.st||'']||ST[''])[0]]).concat([Object.assign(['Total','',hTxt(tm),'','',n2(tot),''],{_tot:true})])}],arq:'Pagamento-PJ-'+J.per}); }
  /* ---------- avisos (Meu dia e Início do RH) ---------- */
  function avisos(c){ C=C||c; try{ const pid=J.per||perAtual(c); assina(c,pid); const D=docP(pid), p=perDe(pid), xs=Object.entries(D.pes||{}); const out=[];
      const ch=xs.filter(([,x])=>x.st==='chegou').length; if(ch) out.push({nivel:'warn',rotulo:'PJ',titulo:ch+(ch>1?' notas de PJ chegaram':' nota de PJ chegou')+' para conferir',texto:p.txt,go:'rhpjpag'});
      const at=xs.filter(([,x])=>x.st==='pedido'&&x.ped&&Date.now()-new Date(x.ped.em)>3*864e5).length; if(at) out.push({nivel:'warn',rotulo:'PJ',titulo:at+' PJ ainda não mandaram a nota',texto:'Pedida há mais de 3 dias · '+p.txt,go:'rhpjpag'});
      if(c.P.hojeStr()>p.ate){ const fz=pjs(c,p).filter(f=>!((D.pes||{})[f._id]||{}).st).length; if(fz) out.push({nivel:'warn',rotulo:'PJ',titulo:'Fechar o pagamento dos PJ de '+p.curto,texto:fz+' PJ com o valor ainda não fechado',go:'rhpjpag'}); }
      return out; }catch(e){ return []; } }
  /* ---------- ações ---------- */
  const fDe=id=>(C.R.func||[]).find(f=>f._id===id);
  async function fechar(c,f){ const pid=J.per, p=perDe(pid), x=pesDe(pid,f._id), r=calcPessoa(c,f,p,x);
    if(!r.fixo&&!r.vh) throw Object.assign(new Error(c.titulo(f.nome)+': falta o valor da hora (abra a pessoa e preencha).'),{aviso:true});
    if(!r.fixo&&!r.min) throw Object.assign(new Error(c.titulo(f.nome)+': não tem horas neste período (confira os dias no Face ID ou corrija à mão).'),{aviso:true});
    if(r.uPend) throw Object.assign(new Error(c.titulo(f.nome)+': confirme o desconto do uniforme na aba Descontos antes de fechar.'),{aviso:true});
    const fech={min:r.min,vh:r.vh,fixo:r.fixo,bruto:r.bruto,desc:r.desc,descMot:r.descMot,descs:r.descs.map(z=>({t:z.t,v:z.v})),valor:r.valor,dias:r.dias.map(d=>({d:d.d,e:d.E!=null?hhmm(d.E):'',s:d.S!=null?hhmm(d.S):'',m:d.m})),h:r.h,em:agora(),por:c.eu()};
    await grava(c,pid,f._id,{st:'fechado',fech},'Valor fechado: '+(r.fixo?'fixo ':hTxt(r.min)+' × '+R$(r.vh)+' ')+(r.desc?'− '+R$(r.desc)+' ':'')+'= '+R$(r.valor)); }
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!C||!t||!t.closest) return; const P=C.P;
    try{
      if(t.id==='pjp-emp'){ J.emp=t.value; P.render(); return; }
      if(t.id==='pjp-set'){ J.set=t.value; P.render(); return; }
      if(t.id==='pjp-sit'){ J.sit=t.value; P.render(); return; }
      if(t.dataset.pjpDia){ const f=fDe(t.dataset.f), d=t.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{});
        cur[t.dataset.pjpDia]=t.value||''; if(!cur.e&&!cur.s){ aj[d]=null; } else { cur.por=C.eu(); cur.em=agora(); cur.mot=cur.mot||'corrigido à mão'; aj[d]=cur; }
        await grava(C,J.per,f._id,{aj}); P.render(); return; }
      if(t.dataset.pjpC){ const f=fDe(t.dataset.f); if(pesDe(J.per,f._id).st) return; const k=t.dataset.pjpC; await grava(C,J.per,f._id,{[k]:k==='desc'?num(t.value):String(t.value||'').slice(0,120)}); P.render(); return; }
    }catch(e){ P.erro(e); } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(!C||!t||t.id!=='pjp-q') return; J.q=t.value; clearTimeout(J._qt); J._qt=setTimeout(()=>{ C.P.render(); setTimeout(()=>{ const i=document.getElementById('pjp-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },0); },350); });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-pjp-fundo]'); if(fu&&ev.target===fu){ J.mod=null; C&&C.P.render(); return; }
    const gf=ev.target.closest&&ev.target.closest('[data-pjp-gf]'); if(gf&&ev.target===gf){ J.ab=''; J.edDia=null; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="pjp-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, c=C;
    if(a==='pjp-wa'){ if(J.mod&&J.mod.k==='ped'){ const m=document.getElementById('pjp-pmsg'); if(m&&m.value!==J.mod.msg){ ev.preventDefault(); J.mod.msg=m.value; const tel=dig(J.mod.tel); window.open((tel?'https://wa.me/'+(tel.length<=11?'55':'')+tel:'https://wa.me/')+'?text='+encodeURIComponent(m.value),'_blank','noopener'); }
        const f=fDe(J.mod.fid); if(f){ const x=pesDe(J.per,f._id); grava(c,J.per,f._id,{ped:Object.assign({},x.ped,{via:(x.ped&&x.ped.via||[]).concat(['whatsapp'])})}).catch(()=>{}); } } window.__pjpUltimoWa=b.href; return; }
    ev.preventDefault();
    try{
      if(a==='pjp-per'){ const v=+b.dataset.v; J.per=v===0?perAtual(c):perMove(J.per,v); J.ab=''; P.render(); return; }
      if(a==='pjp-ab'){ J.ab=b.dataset.f; J.tab=b.dataset.tab||'horas'; J.edDia=null; P.render(); return; }
      if(a==='pjp-et'){ const v=b.dataset.v; J.sit=J.sit===v?'*':v; P.render(); return; }
      if(a==='pjp-gx'){ J.ab=''; J.edDia=null; P.render(); return; }
      if(a==='pjp-tab'){ J.tab=b.dataset.v; J.edDia=null; P.render(); return; }
      if(a==='pjp-confx'){ J.conf=!J.conf; P.render(); return; }
      if(a==='pjp-flimpa'){ J.emp=''; J.set=''; J.sit='*'; J.conf=false; J.q=''; P.render(); return; }
      if(a==='pjp-dcor'){ J.edDia=b.dataset.d; P.render(); setTimeout(()=>{ const i=document.getElementById(document.getElementById('pjp-ce')&&!document.getElementById('pjp-ce').value?'pjp-ce':'pjp-cs'); if(i) i.focus(); },30); return; }
      if(a==='pjp-dcanc'){ J.edDia=null; P.render(); return; }
      if(a==='pjp-dsalva'||a==='pjp-dzero'){ const f=fDe(b.dataset.f), d=b.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), g=id=>(document.getElementById(id)||{}).value||'';
        const mot=String(g('pjp-cm')).trim().slice(0,80);
        const fk=(o=>o&&o.fer?{fer:true,ferNome:o.ferNome,pago:!!o.pago}:{})(aj[d]);
        if(a==='pjp-dzero') aj[d]=Object.assign(fk,{zero:true,mot:mot||'Não trabalhou neste dia',por:c.eu(),em:agora()});
        else { const e=g('pjp-ce'), sa=g('pjp-cs'); if(!e&&!sa) return P.toast('Digite a entrada e a saída.'); if(e&&sa&&sa<=e) return P.toast('A saída tem que ser depois da entrada.'); aj[d]=Object.assign(fk,{e,s:sa,mot:mot||'corrigido à mão',por:c.eu(),em:agora()}); }
        await grava(c,J.per,f._id,{aj},'Corrigiu '+brc(d)+(a==='pjp-dzero'?': não trabalhou':': '+(aj[d].e||'')+' às '+(aj[d].s||''))+(mot?' ('+mot+')':'')); J.edDia=null; P.render(); return; }
      if(a==='pjp-ppad'){ const f=fDe(b.dataset.f); if(!confirm('Voltar o horário e o valor de '+c.titulo(f.nome)+' para o padrão?')) return; f.pjPag={}; await P.db().doc('rh/dados/funcionarios/'+f._id).update({pjPag:{}}); P.toast('Regras de '+c.titulo(f.nome)+' voltaram ao padrão.'); P.render(); return; }
      if(a==='pjp-modx'){ J.mod=null; P.render(); return; }
      if(a==='pjp-cfg'){ J.mod={k:'cfg'}; P.render(); return; }
      if(a==='pjp-cfgok'){ const g=id=>document.getElementById(id), o={modo:g('pjp-cmodo').value,ini:g('pjp-cini').value||PAD.ini,fim:g('pjp-cfim').value||PAD.fim,intv:Math.max(0,parseInt(g('pjp-cintv').value,10)||0),tol:Math.max(0,parseInt(g('pjp-ctol').value,10)||0),
          horasMes:Math.max(1,parseInt(g('pjp-chm').value,10)||220),dias:Math.max(2,Math.min(90,parseInt(g('pjp-cdias').value,10)||30)),dentro:g('pjp-cdentro').checked,leit:[...document.querySelectorAll('[data-pjp-clt]')].filter(i=>i.checked).map(i=>i.dataset.pjpClt),msg:String(g('pjp-cmsg').value||'').slice(0,800)||PAD.msg};
        const ant=cfg(c).modo; c.R.cfg.pjPag=o; await P.db().doc('rh/config').set({pjPag:o},{merge:true}); if(ant!==o.modo) J.per=perAtual(c); J.mod=null; P.toast('Configuração do pagamento dos PJ salva.'); P.render(); return; }
      if(a==='pjp-psalva'){ const f=fDe(b.dataset.f), g=id=>(document.getElementById(id)||{}).value||'', n0=v=>v===''?null:Math.max(0,parseInt(v,10)||0);
        const dias=[...document.querySelectorAll('[data-pjp-dw]')].filter(i=>i.checked).map(i=>+i.dataset.pjpDw).sort();
        if(!dias.length) return P.toast('Marque pelo menos um dia de trabalho.');
        const fixoOn=(document.querySelector('input[name="pjp-rv"]:checked')||{}).value==='f', gp=cfg(c), dentro=document.getElementById('pjp-rdentro').checked;
        const o={ini:g('pjp-ri'),fim:g('pjp-rf'),intv:n0(g('pjp-rint')),tol:n0(g('pjp-rtol')),dias:dias.join(',')==='1,2,3,4,5'&&!(f.horEsp&&f.horEsp.dias)?[]:dias,dentro:dentro===!!gp.dentro?null:dentro,
          vh:fixoOn?0:num(g('pjp-rvh'))||0,fixo:fixoOn?num(g('pjp-rfx'))||0:0,obs:String(g('pjp-rob')).trim().slice(0,200),em:agora(),por:c.eu()};
        { const lm=(document.querySelector('input[name="pjp-rlm"]:checked')||{}).value, ls=[...document.querySelectorAll('[data-pjp-rlt]')].filter(i=>i.checked).map(i=>i.dataset.pjpRlt);
          if(lm==='sel'&&!ls.length) return P.toast('Marque pelo menos um leitor, ou escolha "Usar o padrão".'); o.leit=lm==='sel'?ls:null; }
        if(fixoOn&&!o.fixo) return P.toast('Digite o valor fixo.');
        f.pjPag=o; await P.db().doc('rh/dados/funcionarios/'+f._id).set({pjPag:o},{merge:true}); P.toast('Regras de '+c.titulo(f.nome)+' salvas no cadastro.'); J.tab='horas'; P.render(); return; }
      if(a==='pjp-dfer'){ const f=fDe(b.dataset.f), d=b.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{});
        const nm=String((document.getElementById('pjp-cm')||{}).value||'').trim().slice(0,60); Object.assign(cur,{fer:true,ferNome:nm&&!MOTS.includes(nm)?nm:'Feriado',pago:false,por:c.eu(),em:agora()}); aj[d]=cur;
        await grava(c,J.per,f._id,{aj},'Marcou '+brc(d)+' como feriado'); J.edDia=null; P.render(); return; }
      if(a==='pjp-dferp'){ const f=fDe(b.dataset.f), d=b.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{}), pg=b.dataset.v==='1';
        cur.pago=pg; cur.por=c.eu(); cur.em=agora(); aj[d]=cur; await grava(c,J.per,f._id,{aj},'Feriado de '+brc(d)+(pg?': paga o dia':': não paga o dia')); P.render(); return; }
      if(a==='pjp-dferx'){ const f=fDe(b.dataset.f), d=b.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{});
        delete cur.fer; delete cur.ferNome; delete cur.pago; aj[d]=(cur.e||cur.s||cur.zero)?cur:null; await grava(c,J.per,f._id,{aj},'Tirou o feriado de '+brc(d)); P.render(); return; }
      if(a==='pjp-uok'||a==='pjp-uno'||a==='pjp-ux'){ const f=fDe(b.dataset.f), U=UN(); if(!U||pesDe(J.per,f._id).st) return; const ux=(U._U.xs||[]).find(y=>y._id===b.dataset.x), Q=b.dataset.q; if(!ux) return;
        const u=calcPessoa(c,f,perDe(J.per),pesDe(J.per,f._id)).uni.find(z=>z.x===ux&&z.Q===Q);
        if(a==='pjp-ux') await U._parc.tira(ux,Q); else await U._parc.marca(ux,Q,a==='pjp-uok'?'ok':'falta');
        await grava(c,J.per,f._id,{},a==='pjp-uok'?'Desconto do uniforme confirmado: '+R$(u?u.v:0)+' (entrega de '+brc(ux.data)+')':a==='pjp-uno'?'Uniforme (entrega de '+brc(ux.data)+') não descontado nesta quinzena':'Desfez a escolha do uniforme (entrega de '+brc(ux.data)+')'); P.render(); return; }
      if(a==='pjp-dxadd'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(x.st) return; const t=String((document.getElementById('pjp-dxt')||{}).value||'').trim().slice(0,80), v=Math.round(num((document.getElementById('pjp-dxv')||{}).value)*100)/100;
        if(!t) return P.toast('Escreva o que é o desconto.'); if(!(v>0)) return P.toast('Digite o valor do desconto (ex.: 50,00).');
        const xs=((x.dsc&&x.dsc.x)||[]).concat([{id:'d'+Date.now().toString(36),t,v,em:agora(),por:c.eu()}]); await grava(c,J.per,f._id,{dsc:{x:xs}},'Desconto acrescentado: '+t+' '+R$(v)); P.render(); return; }
      if(a==='pjp-dxx'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(x.st) return; const id=b.dataset.id;
        if(id==='leg'){ await grava(c,J.per,f._id,{desc:0,descMot:''},'Desconto tirado: '+(x.descMot||'desconto lançado')+' '+R$(x.desc)); P.render(); return; }
        const z=((x.dsc&&x.dsc.x)||[]).find(y=>y.id===id), xs=((x.dsc&&x.dsc.x)||[]).filter(y=>y.id!==id); await grava(c,J.per,f._id,{dsc:{x:xs}},'Desconto tirado: '+(z?z.t+' '+R$(z.v):'')); P.render(); return; }
      if(a==='pjp-diax'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id), aj=Object.assign({},x.aj||{}), o=aj[b.dataset.d]; aj[b.dataset.d]=o&&o.fer?{fer:true,ferNome:o.ferNome,pago:!!o.pago}:null; await grava(c,J.per,f._id,{aj}); P.render(); return; }
      if(a==='pjp-fech'){ await fechar(c,fDe(b.dataset.f)); P.render(); return; }
      if(a==='pjp-fechtodos'){ const p=perDe(J.per), vis=J._vis||[], xs=pjs(c,p).filter(f=>!pesDe(J.per,f._id).st&&vis.includes(f._id)); const er=[]; b.disabled=true;
        for(const f of xs){ try{ await fechar(c,f); }catch(e){ er.push(e.message); } } P.toast(er.length?(xs.length-er.length)+' fechados. '+er.join(' '):xs.length+' valores fechados.'); P.render(); return; }
      if(a==='pjp-reab'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'',fech:null},'Reaberto para conferir'); P.render(); return; }
      if(a==='pjp-ped'||a==='pjp-env'){ const f=fDe(b.dataset.f); let ped;
        if(a==='pjp-env'){ const x=pesDe(J.per,f._id); const g=await P.db().doc(PED+'/'+x.ped.t).get(); ped=g.exists?Object.assign({t:x.ped.t},g.data()):null; if(!ped) throw new Error('Não achei o pedido. Cancele e peça de novo.'); }
        else ped=await pedir(c,J.per,f);
        J.mod={k:'ped',ped,fid:f._id,tel:f.telefone||'',email:f.email||'',msg:msgDe(c,f,ped)}; P.render(); return; }
      if(a==='pjp-pedtodos'){ const p=perDe(J.per), xs=pjs(c,p).filter(f=>pesDe(J.per,f._id).st==='fechado'&&(J._vis||[]).includes(f._id)); b.disabled=true; const out=[];
        for(const f of xs){ try{ const ped=await pedir(c,J.per,f); out.push({fid:f._id,nome:ped.nome,valor:ped.valor,tel:f.telefone||'',msg:msgDe(c,f,ped)}); }catch(e){ P.erro(e); } }
        J.mod={k:'lote',xs:out}; P.render(); return; }
      if(a==='pjp-loteum'){ const o=J.mod.xs[+b.dataset.i], tel=dig(o.tel), u=(tel?'https://wa.me/'+(tel.length<=11?'55':'')+tel:'https://wa.me/')+'?text='+encodeURIComponent(o.msg); window.__pjpUltimoWa=u; window.open(u,'_blank','noopener'); o.feito=true; P.render(); return; }
      if(a==='pjp-copia'){ const m=document.getElementById('pjp-pmsg').value; J.mod.msg=m; try{ await navigator.clipboard.writeText(m); P.toast('Mensagem copiada.'); }catch(e){ P.toast('Não consegui copiar: selecione o texto e copie.'); } return; }
      if(a==='pjp-mail'){ const m=document.getElementById('pjp-pmsg').value, u='mailto:'+encodeURIComponent(J.mod.email)+'?subject='+encodeURIComponent('Nota fiscal · '+J.mod.ped.perTxt)+'&body='+encodeURIComponent(m); window.__pjpUltimoMail=u; location.href=u; return; }
      if(a==='pjp-pedx'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(!confirm('Cancelar o pedido de nota de '+c.titulo(f.nome)+'? O link deixa de valer.')) return;
        if(x.ped) await P.db().doc(PED+'/'+x.ped.t).set({usado:true,cancelado:true,usadoEm:agora()},{merge:true}); await grava(c,J.per,f._id,{st:'fechado',ped:null},'Pedido de nota cancelado'); P.render(); return; }
      if(a==='pjp-nver'){ const x=pesDe(J.per,b.dataset.f); if(!x.nota) return; const g=await P.db().doc(ENV+'/'+x.nota.t).get(); const e=g.exists?g.data():null; if(!e||!e.d) return P.toast('O arquivo da nota não está mais guardado.');
        const bin=atob(e.d), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); const url=URL.createObjectURL(new Blob([u8],{type:e.tipo||'application/octet-stream'}));
        const w=window.open(url,'_blank'); if(!w){ const l=document.createElement('a'); l.href=url; l.download=e.n||'nota'; document.body.appendChild(l); l.click(); l.remove(); } window.__pjpUltimaNota=e.n; return; }
      if(a==='pjp-nok'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'conferida',conf:{em:agora(),por:c.eu()}},'Nota conferida'); P.render(); return; }
      if(a==='pjp-nnao'){ const f=fDe(b.dataset.f); J.mod={k:'nao',fid:f._id,nome:c.titulo(f.nome)}; P.render(); return; }
      if(a==='pjp-nnaook'){ const f=fDe(b.dataset.f), m=String(document.getElementById('pjp-nmot').value||'').trim(); await grava(c,J.per,f._id,{st:'fechado',ped:null,nota:null},'Pediu outra nota'+(m?': '+m:'')); J.mod=null; P.render(); return; }
      if(a==='pjp-pago'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'pago',pago:{em:agora(),por:c.eu(),data:P.hojeStr()}},'Marcado como pago'); P.render(); return; }
      if(a==='pjp-pagox'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'conferida',pago:null},'Pago desfeito'); P.render(); return; }
      if(a==='pjp-cw'){ const k=b.dataset.e, M=cwMedicao(c,J.per,k);
        if(M.abertos&&J.cwConf!==k){ J.cwConf=k; P.render(); return; }
        J.cwConf=''; const url=cwLink(c,M.payload); window.__pjpUltimoCw=url; window.open(url,'_blank','noopener');
        const p=perDe(J.per), D=docP(J.per), reg={em:agora(),por:c.eu(),total:M.payload.total,n:M.itens.length}; D.cw=Object.assign({},D.cw,{[k]:reg}); J.docs[J.per]=D;
        await P.db().doc(COL+'/'+J.per).set({pid:J.per,de:p.de,ate:p.ate,em:agora(),cw:{[k]:reg}},{merge:true});
        P.toast('Medição de '+c.titulo(k)+' aberta no Conectwork. Confira lá e envie para a prestadora.'); P.render(); return; }
      if(a==='pjp-xls'){ await excel(c); return; } if(a==='pjp-pdf'){ await pdf(c); return; }
    }catch(e){ if(e&&e.aviso) P.toast(e.message); else P.erro(e); } });
  document.addEventListener('keydown',ev=>{ if(ev.key!=='Escape'||!C) return; if(J.mod){ J.mod=null; C.P.render(); } else if(J.edDia){ J.edDia=null; C.P.render(); } else if(J.ab){ J.ab=''; C.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&C&&J.edDia&&ev.target&&['pjp-ce','pjp-cs','pjp-cm'].includes(ev.target.id)){ ev.preventDefault(); const b=document.querySelector('[data-act="pjp-dsalva"]'); if(b) b.click(); } });
  window.RHPJPag={render,avisos,_J:J,_calc:{contaDia,perDe,perMove,lerXml,qsDe}};
})();
