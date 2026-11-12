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
  const PTO='rh/dados/ponto', COL='rh/dados/pjpag', PED='rh/dados/pjnotaped', ENV='rh/dados/pjnotaenv';
  const PAD={modo:'quinzena',corte:15,fds:1.5,pagDias:5,avisaNota:3,tol:5,dentro:false,ini:'07:30',fim:'17:18',intv:72,horasMes:220,dias:30,
    msg:'Olá, {NOME}! Fechamos {PERIODO}: {HORAS} trabalhadas, total de {VALOR}.\nPor favor, emita a nota fiscal de serviço para {EMPRESA} (CNPJ {CNPJ}) e mande por este link:\n{LINK}'};
  const ST={'':['Conferir as horas','warn'],fechado:['Valor fechado','teal'],pedido:['Nota pedida','teal'],chegou:['Nota chegou · conferir','warn'],conferida:['Nota conferida','ok'],pago:['Pago','ok']};
  const J={per:'',docs:{},sub:{},envSub:false,env:{},ab:'',q:'',emp:'',cfgAb:false,mod:null,proc:{},fid:{},carr:{},pto:{},ptoSub:{}};
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
  /* dia que divide a quinzena (Parâmetros, 11/11): 1ª = 1 até o corte, 2ª = corte+1 até o fim do mês; padrão 15 */
  const corteQ=()=>{ const v=+((((C&&C.R&&C.R.cfg)||{}).pjPag)||{}).corte; return v>=10&&v<=20?v:15; };
  function perDe(pid){ const m=String(pid||'').match(/^(\d{4})-(\d{2})(?:-([12]))?$/); if(!m) return null; const y=+m[1], mo=+m[2], q=m[3], f=fimMes(y,mo), b=m[1]+'-'+m[2]+'-', k=corteQ();
    const de=q==='2'?b+pad2(k+1):b+'01', ate=q==='1'?b+pad2(k):b+pad2(f);
    return {pid,de,ate,mes:m[1]+'-'+m[2],txt:(q?(q==='1'?'1 a '+k:(k+1)+' a '+f)+'/'+m[2]+'/'+m[1]:'mês '+m[2]+'/'+m[1])+'',curto:(q?brc(de)+' a '+brc(ate):m[2]+'/'+m[1])}; }
  /* dia do pagamento sugerido = fim do período + N dias (Parâmetros), nunca antes de hoje */
  function pagSug(c,p){ const n=Math.max(0,parseInt(cfg(c).pagDias,10)||0), d=new Date(p.ate+'T12:00:00'); d.setDate(d.getDate()+n); const k=isoD(d), h=hojeS(); return k<h?h:k; }
  function perAtual(c){ const h=new Date(), y=h.getFullYear(), mo=h.getMonth()+1, d=h.getDate(), modo=cfg(c).modo;
    if(modo==='mes'){ const dd=new Date(y,mo-1-(d<=7?1:0),1); return dd.getFullYear()+'-'+pad2(dd.getMonth()+1); }
    /* nos primeiros 7 dias de uma quinzena, mostra a que acabou de fechar */
    if(d<=7){ const dd=new Date(y,mo-2,1); return dd.getFullYear()+'-'+pad2(dd.getMonth()+1)+'-2'; }
    const k=corteQ(); if(d>=k+1&&d<=k+7) return y+'-'+pad2(mo)+'-1';
    return y+'-'+pad2(mo)+'-'+(d<=k?1:2); }
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
    /* antes/depois (11/11): contar ou não o Face ID antes da entrada e depois da saída do horário (cada um separado) */
    if(!cAntes(h)&&ini!=null&&E<ini) E=ini; if(!cDepois(h)&&fim!=null&&S>fim) S=fim;
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
      return `<span class="${q.ok?(ex?'pe':'pm'):'fo'}" title="${q.pto?'Entrada da fábrica · ':''}${esc(nm)}${q.ok?'':q.sec?' · não conta: vale a entrada da fábrica':' · não conta para o horário'}">${esc(q.h)}${(varios||q.pto)&&nm?`<small>${q.pto?'entrada · ':''}${esc(nm.slice(0,18))}</small>`:''}</span>`; }).join(''); };
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
  /* 10/11 ("por enquanto só os Zenith e Nexus"): o Pagamento dos PJ só conta os PJ dessas empresas; para pôr outras, rh/config.pjPag.emps */
  const pjEmps=c=>((((c.R.cfg||{}).pjPag)||{}).emps||['ZENITH','NEXUS']).map(x=>String(x).toUpperCase());
  /* 11/11 ("essa pessoa foi desligada, por que está aqui?"): saiu = situação Desligado/Inativo/Encerrado/Demitido ou desligamento agendado.
     Fica na quinzena só se o último dia é dentro dela ou depois do começo E (passou no Face ID até o último dia, ou o RH já mexeu no pagamento);
     os dias depois do desligamento não contam. Sem data de desligamento não aparece. */
  const SAIU_ST=['DESLIGADO','INATIVO','ENCERRADO','DEMITIDO'];
  const saiuEm=f=>{ const st=String(f.status||'').toUpperCase(); return SAIU_ST.includes(st)||(f.desligAgendado&&f.desligamento)?(f.desligamento||'-'):''; };
  const pjBase=(c,p)=>(c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.nome&&pjEmps(c).includes(String(f.empresa||'').toUpperCase())&&(!f.admissao||f.admissao<=p.ate));
  const pjs=(c,p)=>pjBase(c,p).filter(f=>{ const sd=saiuEm(f); if(!sd) return true; if(sd==='-'||sd<p.de) return false;
      const x=(docP(p.pid).pes||{})[f._id]||{}; if(x.st) return true; const r=calcPessoa(c,f,p,x); return r.comFid>0||r.fil||!!r.fixo; })
    .sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  /* regras da pessoa: as do Pagamento dos PJ (funcionarios.pjPag) valem antes; senão o "Horário diferente" do cadastro (horEsp); senão o padrão */
  /* antes/depois: true = conta; o "dentro" antigo (não conta nenhum dos dois) continua valendo onde não foi escolhido */
  const cAntes=h=>typeof h.antes==='boolean'?h.antes:!h.dentro, cDepois=h=>typeof h.depois==='boolean'?h.depois:!h.dentro;
  const gAD=(g,k)=>typeof g[k]==='boolean'?g[k]:!g.dentro;
  const horDe=(c,f)=>{ const g=cfg(c), x=f.pjPag||{}, he=f.horEsp||{}, tem=v=>v!=null&&v!=='';
    return {ini:x.ini||he.ini||g.ini,fim:x.fim||he.fim||g.fim,intv:tem(x.intv)?+x.intv:+g.intv,tol:tem(x.tol)?+x.tol:+g.tol,dentro:typeof x.dentro==='boolean'?x.dentro:!!g.dentro,antes:typeof x.antes==='boolean'?x.antes:typeof x.dentro==='boolean'?!x.dentro:gAD(g,'antes'),depois:typeof x.depois==='boolean'?x.depois:typeof x.dentro==='boolean'?!x.dentro:gAD(g,'depois'),
      dias:Array.isArray(x.dias)&&x.dias.length?x.dias:Array.isArray(he.dias)&&he.dias.length?he.dias:[1,2,3,4,5],de:{ini:x.ini?'pj':he.ini?'cad':'pad',fim:x.fim?'pj':he.fim?'cad':'pad'}}; };
  const vhDe=(c,f)=>{ const x=f.pjPag||{}; if(+x.vh>0) return +x.vh; const s=num(f.salario); return s>0?s/(+cfg(c).horasMes||220):0; }; /* como a planilha: valor da hora com todas as casas (5000/220 = 22,7272…); só o total vira centavos */
  const empDe=(c,f)=>{ const k=String(f.empresa||'').toUpperCase(); return (c.EMP_DOC||{})[k]||{nome:f.empresa||'',cnpj:''}; };
  /* chave do Face ID: o CPF do cadastro; sem CPF (ou CPF que não aparece), pelo nome */
  function chaveFid(c,f,dados){ const P0=(dados&&dados.pessoas)||{}, cpf=dig(f.cpf).padStart(11,'0');
    if(dig(f.cpf)&&P0[cpf]) return cpf; const n=norm(f.nome); if(!n) return cpf||'';
    const ws=n.split(' '), pu=ws[0]+' '+ws[ws.length-1]; let k1='', k2='';
    let k3='';
    for(const [k,p] of Object.entries(P0)){ const pn=norm(p&&p.n); if(!pn) continue; if(pn===n){ k1=k; break; } const pw=pn.split(' '); if(pw[0]+' '+pw[pw.length-1]===pu) k2=k2?'#':k; else if(quase(ws,pw)) k3=k3?'#':k; }
    return k1||(k2&&k2!=='#'?k2:'')||(k3&&k3!=='#'?k3:'')||(dig(f.cpf)?cpf:''); }
  /* 10/11 ("tem uma diferença de uma letra no Face ID", ex.: NARCISO × NARCIZO): mesmas palavras, cada uma igual ou com 1 letra
     diferente (só palavras de 5 letras ou mais), no máximo 2 letras no nome todo; só vale se houver um candidato */
  function lev1(a,b){ if(a===b) return 0; if(Math.abs(a.length-b.length)>1) return 2; let i=0,j=0,d=0; while(i<a.length&&j<b.length){ if(a[i]===b[j]){ i++; j++; continue; } if(++d>1) return 2; if(a.length>b.length) i++; else if(b.length>a.length) j++; else { i++; j++; } } return d+(a.length-i)+(b.length-j); }
  function quase(a,b){ if(a.length!==b.length||a.length<2) return false; let t=0; for(let i=0;i<a.length;i++){ if(a[i]===b[i]) continue; if(a[i].length<5||b[i].length<5) return false; const d=lev1(a[i],b[i]); if(d>1) return false; t+=d; } return t>0&&t<=2; }
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
  /* Fechamento no último dia útil (10/11): a quinzena é fechada e paga no último dia útil dela (ex.: dia 13 quando 14 e 15 caem
     no fim de semana). Nesse dia, quem veio (ou o dia ainda não acabou) recebe o dia cheio da escala; se saiu mais cedo, a
     diferença é descontada sozinha na quinzena seguinte ("Saiu mais cedo no dia do fechamento"). */
  function fechDia(p){ for(let d=new Date(p.ate+'T12:00:00'); isoD(d)>=p.de; d.setDate(d.getDate()-1)){ const k=isoD(d), w=d.getDay(); if(w!==0&&w!==6&&!ferP(k)) return k; } return p.ate; }
  function fechAnt(c,f,p,h){ const pp=perDe(perMove(p.pid,-1)), D=J.docs[pp.pid], xp=D&&D.pes&&D.pes[f._id], fe=xp&&xp.fech, ch=fe&&fe.cheio; if(!ch||!ch.d||fe.fixo) return null;
    const dd=window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[ch.d.slice(0,7)]; if((!dd&&!ptoMes(ch.d.slice(0,7)))||ch.d>=hojeS()) return null;
    const LT=leitDe(c,f).l, hs=diaPas(c,f,ch.d,LT).hs, a=(xp.aj||{})[ch.d];
    let e=hs[0]||'', s=hs.length>1?hs[hs.length-1]:''; if(a&&(a.e||a.s||a.zero)){ e=a.zero?'':(a.e||e); s=a.zero?'':(a.s||s); }
    if(!e||!s) return null; const real=contaDia(e,s,ch.h||h).m, falta=Math.max(0,(+ch.m||0)-real); if(falta<=0) return null;
    return {d:ch.d,falta,v:Math.round(hDec(falta)*(+fe.vh||0)*100)/100}; }
  /* ---------- Face ID da entrada da fábrica (10/11, "existe um controle de Face ID paralelo, onde o pessoal entra na fábrica para
     trabalhar; o horário de trabalho é por esse e, se não tiver marcação dele, verificar no Face ID"): outro iDSecure, importado
     aqui como CSV "Acessos Gerais" em rh/dados/ponto/{AAAA-MM} (mesmo formato do Face ID do almoço: dias.{dia}.{cpf}={p,t,ar}).
     No dia: 2+ passagens na entrada = vale só a entrada; 1 = junta com o Face ID; nenhuma = vale o Face ID de sempre. ---------- */
  const ptoMes=m=>J.pto[m]||null;
  function diaPas(c,f,d,LT,K){ const m=d.slice(0,7), dF=window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[m]||null, dP=ptoMes(m);
    K=K||{}; if(!('kf' in K)) K.kf=dF?chaveFid(c,f,dF):''; if(!('kp' in K)) K.kp=dP?chaveFid(c,f,dP):'';
    const xF=K.kf&&dF&&dF.dias&&dF.dias[d]&&dF.dias[d][K.kf]||null, xP=K.kp&&dP&&dP.dias&&dP.dias[d]&&dP.dias[d][K.kp]||null;
    const pP=pasDe(xP).map(q=>Object.assign(q,{ok:true,pto:true})), pF=pasDe(xF).map(q=>Object.assign(q,{ok:contaP(q,LT)}));
    let ps, src; if(pP.length>=2){ src='pto'; ps=pP.concat(pF.map(q=>Object.assign(q,{ok:false,sec:true}))); } else if(pP.length===1){ src='mix'; ps=pP.concat(pF); } else { src=pF.length?'fid':''; ps=pF; }
    ps.sort((a,b)=>a.h.localeCompare(b.h)); const hs=ps.filter(q=>q.ok).map(q=>q.h);
    return {ps,hs,src,nFora:ps.filter(q=>!q.ok&&!q.sec).length,pP:pP.length,pF:pF.length}; }
  /* Fixcol (10/11, "os funcionários que trabalham na Fixcol não passam no Face ID; o valor deles é considerado inteiro e depende
     do gestor falar se faltou"): mesma marcação da presença (cadastro filial FIXCOL ou setor em Cadastros › Setores › "Fica na Fixcol").
     Cada dia da escala conta cheio; o RH marca "Faltou" no dia quando o gestor avisar (aj[dia].zero). */
  const ehFil=(c,f)=>{ const sF=(((c.R.cfg)||{}).setoresFilial||[]).map(norm); return f.filial==='FIXCOL'||!!(f.setor&&sF.includes(norm(f.setor))); };
  const SRC_T={pto:'Entrada da fábrica',mix:'Entrada da fábrica + Face ID',fid:'Face ID (sem marcação na entrada)'};
  /* entradas e saídas no meio do dia (11/11, "desconfie de entradas e saídas e entradas"): o dia conta da 1ª à última passagem;
     se no meio a pessoa passou num leitor de SAÍDA e depois num de ENTRADA, o tempo fora entra na conta. Fora do almoço
     (uma saída entre 11:00 e 14:30 de até intervalo + 30 min), cada saída de 5 min ou mais vira "para conferir", com
     "Descontar N min" (aj[dia].descF) ou "Está certo" (aj[dia].okFora). Também desconfia de dia que começa numa saída ou termina numa entrada. */
  const dirP=q=>{ const t=norm((q.disp||'')+' '+(q.area||'')); if(/SAIDA/.test(t)) return 's'; if(/\bENT(RADA)?\b/.test(t)) return 'e'; return ''; };
  function suspDia(ps,h,E,S){ const xs=(ps||[]).filter(q=>q.ok!==false).map(q=>({h:q.h,m:min(q.h),d:dirP(q)})).filter(q=>q.m!=null); const dd=xs.filter(q=>q.d); if(dd.length<2) return null;
    /* 11/11 (foto: "09:17 Estacionamento Ent · 09:17 Saída estacionamento · 11:55 REFEITÓRIO"): só vale a saída seguida LOGO DEPOIS
       de uma entrada (a passagem seguinte, de qualquer leitor); saída e entrada no mesmo minuto é a pessoa passando pelo portão */
    const out=[], iv=+h.intv||0; let alm=null;
    for(let i=0;i<xs.length-1;i++){ if(xs[i].d!=='s'||xs[i+1].d!=='e') continue;
      const a=Math.max(xs[i].m,E!=null?E:-1), b=Math.min(xs[i+1].m,S!=null?S:1e9), g=b-a; if(g<5) continue;
      if(!alm&&a<14*60+30&&b>11*60&&g<=iv+30){ alm={a:xs[i].h,b:xs[i+1].h,m:g}; continue; }
      out.push({a:xs[i].h,b:xs[i+1].h,m:g}); }
    const ini=dd[0].d==='s'&&dd[0].m<=(E!=null?E:dd[0].m)+5, fim=dd[dd.length-1].d==='e'&&dd[dd.length-1].m>=(S!=null?S:dd[dd.length-1].m)-5;
    return out.length||ini||fim?{sai:out,min:out.reduce((t,z)=>t+z.m,0),ini,fim,alm}:(alm?{sai:[],min:0,ini:false,fim:false,alm,soAlm:true}:null); }
  /* linha do dia (11/11, "melhore o visual"): entrada → saída em destaque, a barra do dia (na empresa, saídas no meio e almoço) e as passagens recolhidas */
  const kOfDia=d=>{ const k=[]; if((d.fl&&!d.aj)||(d.sp&&!d.sp.soAlm&&!d.descF&&!d.okFora)) k.push('conf'); if(d.sp&&d.sp.sai&&d.sp.sai.length) k.push('sai'); if(d.aj||d.descF||d.okFora) k.push('cor'); if(!d.hs.length&&d.esc&&!d.fil&&!d.fer&&!d.aus&&d.d<=hojeS()) k.push('sem'); if(d.aus) k.push('aus'); return k; };
  const CALSVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
  function diaVis(d,h,esc){ const ok=d.ps.filter(q=>q.ok), e=ok[0], sa=ok.length>1?ok[ok.length-1]:null, n=d.ps.length;
    const cab=`<div class="pg-es"><span class="pg-e1"><small>entrou</small>${esc(e?e.h:'—')}</span><span class="pg-ar" aria-hidden="true">→</span><span class="pg-e1"><small>saiu</small>${esc(sa?sa.h:'—')}</span>${n>2?`<span class="pg-np">${n} passagens</span>`:''}</div>`;
    let bar=''; const E=d.E, S=d.S;
    if(E!=null&&S!=null&&S>E){ const i0=Math.min(min(h.ini)||E,E)-30, i1=Math.max(min(h.fim)||S,S)+30, W=i1-i0, x=v=>Math.max(0,Math.min(100,(v-i0)/W*100));
      const seg=(a,b,c,t)=>`<i class="${c}" style="left:${x(a).toFixed(2)}%;width:${Math.max(.6,x(b)-x(a)).toFixed(2)}%" title="${esc(t)}"></i>`;
      const sp=d.sp||{}, alm=sp.alm, sai=sp.sai||[];
      bar=`<div class="pg-bar" aria-hidden="true">${seg(min(h.ini),min(h.fim),'hz','Horário '+h.ini+' às '+h.fim)}${seg(E,S,'in','Conta '+hhmm(E)+' às '+hhmm(S))}${alm?seg(min(alm.a),min(alm.b),'al','Almoço '+alm.a+' às '+alm.b):''}${sai.map(z=>seg(min(z.a),min(z.b),d.descF?'sd':d.okFora?'so':'sx','Fora '+z.a+' às '+z.b)).join('')}</div>`; }
    const todas=n>2?`<details class="pg-ps"><summary>ver as ${n} passagens</summary><div class="pjp-chips">${chipsP(d.ps,esc)}</div></details>`:d.ps.some(q=>!q.ok)?`<div class="pjp-chips pg-c2">${chipsP(d.ps,esc)}</div>`:'';
    return cab+bar+todas; }
  function spHtml(d,ed,fa,esc){ const z=d.sp, t=[]; if(z.sai.length) t.push('Saiu e voltou '+(z.sai.length>1?z.sai.length+'×':'')+' · '+hTxt(z.min)+' fora ('+z.sai.map(q=>q.a+'–'+q.b).join(', ')+')'); if(z.ini) t.push('o dia começa numa saída: falta a entrada?'); if(z.fim) t.push('o dia termina numa entrada: falta a saída?');
    const cls=d.descF?'pg-t':d.okFora?'pg-m':'pg-w', st=d.descF?' · descontado '+hTxt(d.descF):d.okFora?' · conferido: está certo':'';
    const bt=!ed?'':d.descF||d.okFora?` <button class="lnk" data-act="pjp-spx" data-d="${d.d}" ${fa} style="display:inline;margin:0">desfazer</button>`
      :`${z.min?` <button class="lnk" data-act="pjp-spd" data-v="${z.min}" data-d="${d.d}" ${fa} style="display:inline;margin:0"><b>Descontar ${hTxt(z.min)}</b></button>`:''} <button class="lnk" data-act="pjp-spok" data-d="${d.d}" ${fa} style="display:inline;margin:0">Está certo</button>`;
    return `<span class="pg-tag ${cls} pg-sp2">⚠ ${esc(t.join(' · '))}${st}</span>${bt}`; }
  /* sábado e domingo trabalhados valem N vezes (Parâmetros, padrão 1,5; 1 = hora normal) */
  const fdsF=c=>{ const v=+cfg(c).fds; return v>=1&&v<=3?v:1.5; };
  const ACX=['Vale-transporte','Ajuda de custo','Diferença da quinzena passada','Outro'];
  /* dia sem passagem já explicado (11/11, melhoria 3): atestado/falta lançados em Atestados e faltas, férias marcadas e
     afastamento do cadastro aparecem no dia em vez de "sem passagem" (não pagam horas: só explicam o dia) */
  function ausDe(c,f,d){ try{ const A=window.RHAtest&&window.RHAtest.cobre({funcId:f._id,cpf:f.cpf},d); if(A){ const T=(window.RHAtest.TIPO&&window.RHAtest.TIPO(A.tipo))||[,'Atestado']; return {k:'at',t:T[1]||'Atestado'}; } }catch(e){}
    const fe=((c.R&&c.R.fer)||[]).find(x=>x.funcId===f._id&&x.status!=='cancelada'&&x.inicio&&x.fim&&x.inicio<=d&&x.fim>=d); if(fe) return {k:'fe',t:'Férias'};
    const af=f.afast; if(af&&af.ini&&af.ini<=d&&(!af.fim||af.fim>=d)) return {k:'af',t:'Afastado'+(af.mot?' · '+af.mot:'')};
    return null; }
  /* conta da pessoa no período */
  function calcPessoa(c,f,p,x){ const dados=(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes])||null, h=horDe(c,f), vh=vhDe(c,f), k=chaveFid(c,f,dados);
    const aj=(x&&x.aj)||{}, out=[], escM=contaDia(h.ini,h.fim,h).m; let tot=0, alerta=0, comFid=0;
    const LT=leitDe(c,f).l, fd=fechDia(p), fil=ehFil(c,f); let cheio=null;
    const pto=ptoMes(p.mes), K={kf:k,kp:pto?chaveFid(c,f,pto):''}; let comPto=0;
    const sdia=saiuEm(f), sdF=sdia&&sdia!=='-'?sdia:'';
    diasDe(p).filter(d=>!sdF||d<=sdF).forEach(d=>{ const DP=diaPas(c,f,d,LT,K), ps=DP.ps, hs=DP.hs, nFora=DP.nFora; if(ps.length) comFid++; if(DP.pP) comPto++;
      let e=hs[0]||'', s=hs.length>1?hs[hs.length-1]:''; const a=aj[d], cor=!!(a&&(a.e||a.s||a.zero)); if(cor){ e=a.zero?'':(a.e||e); s=a.zero?'':(a.s||s); }
      const fp=ferP(d), fer=a&&a.fer?{nome:a.ferNome||(fp&&fp.nome)||'Feriado',pago:!!a.pago,rh:true}:fp?{nome:fp.nome||'Feriado',pago:!!(a&&a.pago),rh:false}:null;
      const r=contaDia(e,s,h), dw=new Date(d+'T12:00:00').getDay(); let fl='', info='', m=r.m;
      let ausK=''; const sp=!cor&&!fil&&hs.length>=2?suspDia(ps,h,r.E,r.S):null, descF=a&&+a.descF>0?+a.descF:0, okFora=!!(a&&a.okFora);
      if(descF&&!cor) m=Math.max(0,m-descF);
      if(fer&&fer.pago) m=Math.max(m,escM);
      const dFil=fil&&!cor&&!fer&&h.dias.includes(dw); if(dFil){ m=escM; info='Fixcol · sem Face ID · dia cheio da escala'; }
      const fF=fdsF(c); let mR=null; if((dw===0||dw===6)&&m>0&&fF!==1&&!dFil){ mR=m; m=Math.round(m*fF); }
      let ehF=false; if(!fil&&d===fd&&!cor&&!fer&&h.dias.includes(new Date(d+'T12:00:00').getDay())&&(hs.length||d>=hojeS())){ ehF=true; m=Math.max(m,escM); cheio={d,m:escM,h:{ini:h.ini,fim:h.fim,intv:h.intv,tol:h.tol,dentro:h.dentro,antes:cAntes(h),depois:cDepois(h)}}; }
      if(ehF) info='Dia do fechamento · pago o dia cheio ('+hTxt(escM)+'); se sair mais cedo, desconta na próxima quinzena';
      else if(!cor&&!dFil&&!fil){ if(sp&&!sp.soAlm&&!descF&&!okFora) alerta++; if(hs.length===1){ fl='Só uma passagem'; alerta++; } else if(fer) info='Feriado · '+fer.nome+(hs.length?' · trabalhou':''); else if(hs.length&&!h.dias.includes(dw)) info='Fora da escala'; else if(!hs.length&&nFora&&h.dias.includes(dw)) info='Só passou em leitor que não conta'; else if(!hs.length&&h.dias.includes(dw)&&d<=hojeS()){ const au=ausDe(c,f,d); info=au?au.t:'Sem passagem'; if(au) ausK=au.k; } }
      out.push({d,dw,hs,ps,nFora,src:DP.src,e,s,E:r.E,S:r.S,m,aj:cor,zero:!!(a&&a.zero),mot:a&&a.mot||'',fl,info,esc:h.dias.includes(dw),fer,fech:ehF,fil:dFil,mR,fF:mR!=null?fF:null,sp,descF,okFora,aus:ausK}); tot+=m; });
    /* horário que não bate (11/11, foto: horário 08:00 às 12:00 e a pessoa sai às 18h → o dia cheio do fechamento dava 2h48):
       saída mais comum nos dias de semana com entrada e saída; se passa 2 h do fim do horário, avisa */
    const sais=out.filter(d=>!d.aj&&!d.fil&&d.esc&&d.dw>0&&d.dw<6&&d.hs.length>=2).map(d=>min(d.hs[d.hs.length-1])).filter(v=>v!=null).sort((a,b)=>a-b);
    const saiT=sais.length>=2?sais[Math.floor(sais.length/2)]:null, fimM=min(h.fim), horCurto=!fil&&saiT!=null&&fimM!=null&&saiT-fimM>120?{fim:h.fim,ini:h.ini,sai:hhmm(saiT),de:h.de.fim}:null;
    const fa0=fechAnt(c,f,p,h);
    const uni=unifDe(c,f,p), ext=(x&&x.dsc&&Array.isArray(x.dsc.x)?x.dsc.x:[]).filter(z=>z&&!z.removido);
    const descs=[].concat(num(x&&x.desc)>0?[{t:(x.descMot||'Desconto lançado'),v:num(x.desc),k:'leg'}]:[],uni.filter(u=>u.st==='ok').map(u=>({t:'Uniforme (entrega de '+brc(u.x.data)+')',v:u.v,k:'u'})),ext.map(z=>({t:z.t,v:num(z.v),k:'x',id:z.id})),fa0&&!(x&&x.fchX)?[{t:'Saiu mais cedo no dia do fechamento ('+brc(fa0.d)+'): '+hTxt(fa0.falta),v:fa0.v,k:'fch'}]:[]);
    const acrs=(x&&x.dsc&&Array.isArray(x.dsc.a)?x.dsc.a:[]).filter(z=>z&&!z.removido).map(z=>({t:z.t,v:num(z.v),id:z.id})), acr=Math.round(acrs.reduce((a,z)=>a+z.v,0)*100)/100;
    const fixo=+((f.pjPag||{}).fixo)||0, desc=Math.round(descs.reduce((a,z)=>a+z.v,0)*100)/100, bruto=fixo>0?fixo:hDec(tot)*vh;
    return {f,k,h,vh,dias:out,min:tot,fixo,bruto,desc,descs,descMot:descs.map(z=>z.t+' '+R$(z.v)).join(' · ').replace(/\u00a0/g,' '),uni,uPend:uni.filter(u=>!u.st).length,acr,acrs,acrMot:acrs.map(z=>z.t+' '+R$(z.v)).join(' · ').replace(/\u00a0/g,' '),valor:Math.max(0,Math.round((bruto-desc+acr)*100)/100),saiu:sdF,horCurto,cheio,fd,alerta,comFid,comPto,kp:K.kp,fil,semFid:!fil&&(!(dados||pto)||!comFid),dados:!!(dados||pto)}; }
  /* ---------- banco ---------- */
  function assina(c,pid){ const P=c.P; unifIni(c); if(!J.sub[pid]){ J.sub[pid]=true;
      P.inscrever('pjp-'+pid,()=>P.db().collection(COL).where('pid','==',pid).limit(1),s=>{ const d=s.docs[0]; J.docs[pid]=d?d.data():{pid,pes:{}}; P.rerender(); }); }
    if(!J.envSub){ J.envSub=true;
      P.inscrever('pjp-env',()=>P.db().collection(ENV).orderBy('em','desc').limit(80),s=>{ s.docs.forEach(d=>{ J.env[d.id]=Object.assign({_id:d.id},d.data()); }); processa(c); P.rerender(); }); }
    const p0=perDe(pid); if(p0&&!J.ptoSub[p0.mes]){ const m=p0.mes; J.ptoSub[m]=true; P.inscrever('pjp-pto-'+m,()=>P.db().collection(PTO).where('mes','==',m).limit(1),s=>{ const d=s.docs[0]; J.pto[m]=d?d.data():null; P.rerender(); }); }
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
      try{ const jp=((J.docs[e.pid]||{}).pes||{})[e.fid]||{}; await grava(c,e.pid,e.fid,jp.st==='pago'?{nota}:{st:'chegou',nota},'Nota '+(nota.num?'nº '+nota.num+' ':'')+'chegou pelo link'); await c.P.db().doc(PED+'/'+e._id).set({usado:true,usadoEm:agora()},{merge:true}); }catch(er){ J.proc[e._id]=false; console.warn('pjp nota',er); } } }
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
  .pjp-cwls{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
  .pjp-cwl{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;font-size:13px;padding:8px 10px;border:1px solid var(--line,#dde3ea);border-radius:10px}
  .pjp-cwl>div{flex:1 1 220px;min-width:0}.pjp-cwl small{flex-basis:100%;color:var(--muted)}
  .pjp-cws select{height:34px;border:1px solid var(--line,#dde3ea);border-radius:8px;background:var(--surface,#fff);color:inherit;font:inherit;font-size:13px;padding:0 8px;max-width:100%}
  .pjp-mod.pjp-cwm{max-width:900px}.pjp-cwm .pjp-cw{margin-top:8px;border:0;padding:0;background:none}.pjp-cwbd{display:inline-block;background:#22D3A6;color:#081638;border-radius:999px;font-size:11.5px;padding:2px 8px;font-weight:700;line-height:1.4}
  .pjp-cwbt{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px 0 6px;border:0;border-radius:12px;cursor:pointer;font:inherit;color:#fff;
    background:linear-gradient(135deg,#0B1A45 0%,#12366D 60%,#1A5CF0 130%);box-shadow:0 2px 6px rgba(11,26,69,.25),inset 0 0 0 1px rgba(255,255,255,.08);transition:transform .12s ease-out,box-shadow .15s}
  .pjp-cwbt:active{transform:scale(.97)}
  @media (hover:hover) and (pointer:fine){.pjp-cwbt:hover{box-shadow:0 4px 14px rgba(26,92,240,.35),inset 0 0 0 1px rgba(255,255,255,.14)}}
  .pjp-cwbt:focus-visible{outline:2px solid #22D3A6;outline-offset:2px}
  .pjp-cwlg{width:28px;height:28px;border-radius:9px;background:#fff;display:grid;place-items:center;flex:none}.pjp-cwlg svg{width:22px;height:22px}
  .pjp-cwwm{font-weight:700;font-size:14.5px;letter-spacing:-.01em;color:#fff}.pjp-cwwm b{color:#4D8DFF;font-weight:700}
  .pjp-cwmh{display:flex;align-items:center;gap:12px;margin:-20px -22px 14px;padding:16px 22px;border-radius:18px 18px 0 0;background:linear-gradient(135deg,#0B1A45 0%,#12366D 70%,#1A5CF0 140%)}
  .pjp-cwmh .pjp-cwlg{width:40px;height:40px;border-radius:12px}.pjp-cwmh .pjp-cwlg svg{width:30px;height:30px}
  .pjp-cwmh .pjp-cwwm{font-size:13px;opacity:.95}.pjp-cwmh h3{margin:0;color:#fff;font-size:18px}.pjp-cwmh>div{flex:1;min-width:0}
  .pjp-cwir{border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
  @media (hover:hover) and (pointer:fine){.pjp-cwir:hover{background:rgba(255,255,255,.18)}}
  .pjp-cwk{flex-direction:column;align-items:stretch;gap:8px}.pjp-cwk.foco{border-top-color:var(--teal,#14627a);box-shadow:inset 3px 0 0 var(--teal,#14627a);padding-left:12px}
  .pjp-cwh{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap}.pjp-cwh>b{font-size:15px}.pjp-cwn{flex:1 1 260px;min-width:0;font-size:13.5px}.pjp-cwn small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
  .pjp-cwab{color:var(--warn-ink,#9a5b00)}.pjp-cwh .pjp-ac{display:flex;gap:6px 12px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .pjp-cwq{margin-top:8px}.pjp-cwp li.pend{flex-wrap:wrap}.pjp-cwp li.pend>i{border-color:var(--warn,#c98a00)!important}.pjp-cwp li.pend b{color:var(--warn-strong,#8a5a00)}.pjp-cwqh{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;font-size:13px}.pjp-cwqh>b{flex:1 1 auto}
  .pjp-cwbus{display:flex;align-items:center;gap:6px;border:1px solid var(--line,#dde3ea);border-radius:10px;padding:0 10px;background:var(--surface,#fff);min-width:min(260px,100%)}
  .pjp-cwbus input{border:0;outline:0;background:transparent;font:inherit;font-size:14px;padding:8px 0;flex:1;min-width:0;color:inherit}.pjp-cwbus:focus-within{border-color:var(--teal,#1a6b80)}
  .pjp-cwq ul{max-height:280px;overflow:auto}.pjp-cwq li.ret>span:first-child,.pjp-cwq li.ret>b{color:var(--muted);text-decoration:line-through}.pjp-cwqa{display:flex;gap:6px;align-items:center;margin-left:auto}
  .pjp-cwq0{color:var(--muted);font-size:12px}.pjp-cwbloq{margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--warn,#c98a00);font-size:14px}.pjp-cwbloq a{font-weight:600}.pjp-cwq ul,.pjp-cwsec ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
  .pjp-cwq li,.pjp-cwsec li{display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap;font-size:13px;padding:5px 0;border-bottom:1px dashed var(--line,#dde3ea)}.pjp-cwq li>span,.pjp-cwsec li>span{flex:1 1 180px;min-width:0}
  .pjp-cwq li small,.pjp-cwsec li small{color:var(--muted);font-size:12px}.pjp-cwsec{font-size:13px}.pjp-cwsec>small{color:var(--muted)}.pjp-cwfo{color:var(--muted);font-size:12px}
  .pjp-cwj{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--surface-2,#f4f6f8);font-size:13px}.pjp-cwj small{display:block;margin-top:4px;color:var(--muted)}
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
  const selo=(t,tom)=>`<span class="pjp-sl ${tom||''}">${t}</span>`;
  /* situação de cada PJ (padrão do Conectwork: selo com ponto + barrinha das etapas) */
  function situ(c,x,r,f){ f=f||{}; const st=x.st||'', i=etIdx(st); let s='';
    const sDs=r.saiu?selo('Desligado em '+brc(r.saiu)+' · conta até esse dia','warn'):'';
    if(st===''&&r.horCurto) s=selo('Horário até '+r.horCurto.fim+'? Sai às '+r.horCurto.sai,'warn'); else if(st===''){ s=!r.fixo&&!r.vh?selo('Falta o valor da hora','crit'):!r.fixo&&!r.min?selo('Sem horas no período','crit'):(r.alerta?selo(r.alerta+' dia'+(r.alerta>1?'s':'')+' para conferir','warn'):'')+(r.uPend?selo('Uniforme para confirmar','warn'):'');
      if(!s) s=selo('Pronto para fechar','info'); }
    else if(st==='fechado') s=selo(f.empresa&&viaCw(c,f)?(sepDe(f._id,x)?'Pronto · nota separada':'Pronto · vai na nota da '+c.titulo(String(f.empresa||''))):'Valor fechado','info');
    else if(st==='pedido') s=selo((pedCw(x)?(x.ped.sep?'Nota separada no Conectwork · esperando a nota da ':'Pedido no Conectwork · esperando a nota da ')+c.titulo((x.ped&&x.ped.emp)||'empresa'):'Esperando a nota')+(x.ped&&x.ped.em?' desde '+brc(String(x.ped.em).slice(0,10)):''),'info');
    else if(st==='chegou') s=x.nota&&x.nota.conf==='ok'?selo('Nota chegou · bate','ok'):x.nota&&x.nota.conf==='dif'?selo('Nota chegou · com diferença','crit'):selo('Nota chegou · conferir','warn');
    else if(st==='conferida') s=selo(x.conf&&x.conf.via==='conectwork-empresa'?'Nota da empresa conferida · pagar a empresa':'Nota conferida · pagar','ok');
    else if(st==='pago') s=selo(x.pago&&x.pago.via==='empresa'?'Pago à '+c.titulo((x.ped&&x.ped.emp)||'empresa')+' · MEI no Conectwork':'Pago','ok');
    const n=st==='pago'?6:i;
    return sDs+s+`<span class="pjp-pg" title="Etapa ${i+1} de 6 · ${c.esc(ETAPAS[i][1])}">${ETAPAS.map((e,k)=>`<i class="${k<n?'f':k===n?'a':''}"></i>`).join('')}</span>`; }
  function acoes(c,pid,f,x,r){ const fa=`data-f="${c.esc(f._id)}"`, st=x.st||'';
    if(st===''){
      if(!r.fixo&&!r.vh) return btn('pjp-ab','Pôr o valor da hora',fa+' data-tab="regras"','');
      if(!r.fixo&&!r.min) return btn('pjp-ab','Ver os dias',fa);
      return btn('pjp-fech','Fechar valor',fa,''); }
    const emN=c.titulo(String(f.empresa||'empresa'));
    if(st==='fechado'&&viaCw(c,f)) return sepDe(f._id,x)?btn('pjp-cwvai','Ver a nota separada',fa,'')+lks(lnk('pjp-cwsepx','voltar para a nota da '+emN,fa),lnk('pjp-reab','mudar o valor',fa))
      :btn('pjp-cwvai','Ver na nota da '+emN,fa,'')+lks(lnk('pjp-cwsepr','nota separada',fa),lnk('pjp-pago','marcar pago',fa),lnk('pjp-reab','mudar o valor',fa),lnk('pjp-fin','e-mail ao financeiro',fa));
    if(st==='fechado') return btn('pjp-ped','Pedir nota',fa,'')+lks(lnk('pjp-pago','marcar pago',fa),lnk('pjp-reab','mudar o valor',fa),lnk('pjp-fin','e-mail ao financeiro',fa));
    if(st==='pedido'&&pedCw(x)&&!x.ped.sep) return lks(lnk('pjp-cwvai','ver na nota da '+c.titulo(x.ped.emp||emN),fa),lnk('pjp-pago','marcar pago',fa),lnk('pjp-pedx','cancelar o pedido',fa));
    if(st==='pedido') return pedCw(x)?btn('pjp-cwok','Nota separada conferida',fa)+lks(lnk('pjp-cwvai','ver no quadro do Conectwork',fa),lnk('pjp-pago','marcar pago',fa),lnk('pjp-pedx','cancelar o pedido',fa))
      :btn('pjp-env','Mandar o link de novo',fa)+lks(lnk('pjp-pago','marcar pago',fa),lnk('pjp-pedx','cancelar o pedido',fa));
    if(st==='chegou') return btn('pjp-nok','Está certa',fa,'')+lks(lnk('pjp-nver','ver a nota',fa),lnk('pjp-pago','marcar pago',fa),lnk('pjp-nnao','pedir outra nota',fa));
    if(st==='conferida') return btn('pjp-pago','Marcar pago',fa,'')+lks(lnk('pjp-nver','ver a nota',fa),lnk('pjp-fin','e-mail ao financeiro',fa));
    if(st==='pago') return btn('pjp-nver','Ver a nota',fa)+lks(lnk('pjp-pagox','desfazer',fa));
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
  .pjp-gcad{margin-left:auto;flex:none;white-space:nowrap}.pjp-gcad+.pjp-gx{margin-left:8px}
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
  .pjp-d.pg-al{background:none;box-shadow:inset 3px 0 var(--warn,#C28A1E)}.pjp-d.pg-aj{box-shadow:inset 3px 0 var(--teal)}.pjp-d.pg-sp .pjp-chips span{background:none;color:var(--muted);font-weight:400;padding:0}
  .pjp-d .pg-tag{font-size:11.5px;font-weight:600;border-radius:999px;padding:1px 8px;display:inline-block;margin-top:3px}
  .pjp-d .pg-tag.pg-w{background:#fff;color:var(--warn-ink,#7A5310)}.pjp-d .pg-tag.pg-t{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)}.pjp-d .pg-tag.pg-m{background:var(--ground);color:var(--muted)}
  .pjp-d .pg-tag.pg-src{margin-left:4px}.pjp-d .pg-tag.pg-pto{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)}.pjp-d .pg-tag.pg-mix{background:var(--ground);color:var(--teal-strong)}.pjp-d .pg-tag.pg-fid{background:var(--warn-tint,#FBF1DD);color:var(--warn-ink,#7A5310)}
  .pjp-fid.pto .pjp-imp{cursor:pointer;color:var(--teal-strong);font-weight:600;font-size:12.5px;text-decoration:underline}.pjp-fid.pto .pjp-imp input{display:none!important}
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
      const kOf=kOfDia; const _kOld=d=>{ const k=[]; if((d.fl&&!d.aj)||(d.sp&&!d.sp.soAlm&&!d.descF&&!d.okFora)) k.push('conf'); if(d.sp&&d.sp.sai&&d.sp.sai.length) k.push('sai'); if(d.aj||d.descF||d.okFora) k.push('cor'); if(!d.hs.length&&d.esc&&!d.fil&&!d.fer&&!d.aus&&d.d<=hojeS()) k.push('sem'); if(d.aus) k.push('aus'); return k; };
      const DLX=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
      const busca=d=>norm([DNL[d.dw],DLX[d.dw],brc(d.d),br(d.d),String(+d.d.slice(8,10)),d.d].join(' '));
      const vis=d=>{ if(J.dsel&&d.d!==J.dsel) return false; const k=kOf(d), q=norm(J.dq||''); if(J.dk&&J.dk!=='*'&&!k.includes(J.dk)) return false; return !q||q.split(' ').every(w=>busca(d).split(' ').some(b=>b===w||(w.length>1&&b.startsWith(w))||(w.includes('/')&&b.startsWith(w)))); };
      const at=d=>`data-pjpd="${d.d}" data-k="${kOf(d).join(' ')}" data-b="${esc(busca(d))}"${vis(d)?'':' hidden'}`;
      const nK=k=>r.dias.filter(d=>kOf(d).includes(k)).length;
      /* procurar o dia em calendário (11/11, "procurar dia pode ser em formato calendário?"): um quadradinho por dia do período,
         na cor da situação; tocar mostra só aquele dia (tocar de novo ou "ver todos" volta) */
      const cel=d=>{ const k=kOf(d), fds=!d.esc&&!d.hs.length&&!d.aj, fut=d.d>hojeS()&&!d.hs.length;
        const st=k.includes('conf')?'cf':k.includes('sem')?'sm':d.aus?'au':d.fer&&!d.hs.length?'fe':fds?'fd':fut?'fu':d.m>0?'ok':'nd';
        const tt={au:d.info||'atestado/férias',cf:'para conferir',sm:'sem passagem',fe:'feriado',fd:'fora da escala',fu:'ainda não chegou',ok:'trabalhou',nd:'sem horas'}[st];
        return `<button type="button" class="pjp-cd ${st}${k.includes('cor')?' cr':''}" data-act="pjp-dcal" data-v="${d.d}" aria-pressed="${J.dsel===d.d}" title="${DLX[d.dw]} ${br(d.d)} · ${tt}${d.m?' · '+hTxt(d.m):''}"><b>${+d.d.slice(8,10)}</b><small>${d.m?hTxt(d.m):st==='sm'?'falta':st==='au'?(d.aus==='fe'?'férias':d.aus==='af'?'afast.':'atest.'):st==='cf'?'conferir':''}</small></button>`; };
      const pd=r.dias[0]?new Date(r.dias[0].d+'T12:00:00').getDay():1, vaz=(pd+6)%7;
      /* escolher o dia no filtro (11/11, "no filtro, em vez de pesquisar, aperto e escolho o dia"): pílula "Escolher o dia" que abre o calendário */
      const pop=J.calAb?`<div class="pjp-calpop" role="dialog" aria-label="Escolher o dia"><div class="pjp-calh"><b>Escolher o dia</b><button type="button" class="pjp-calx" data-act="pjp-calab" aria-label="Fechar">✕</button></div>
          <div class="pjp-calg">${['seg','ter','qua','qui','sex','sáb','dom'].map(x=>`<span class="pjp-cwd">${x}</span>`).join('')}${'<span></span>'.repeat(vaz)}${r.dias.map(cel).join('')}</div>
          <div class="pjp-call"><span><i class="ok"></i>trabalhou</span><span><i class="cf"></i>conferir</span><span><i class="sm"></i>sem passagem</span><span><i class="au"></i>atestado/férias</span><span><i class="fd"></i>fim de semana</span></div></div>`:'';
      const prox=`<button type="button" class="pjp-dk pjp-prox" data-act="pjp-prox" data-f="${esc(f._id)}" title="Pula para o próximo dia para conferir; quando acabar, vai para o próximo PJ">Próximo para conferir →</button>`;
      const ix=J.dsel?r.dias.findIndex(d=>d.d===J.dsel):-1, dAnt=ix>0?r.dias[ix-1].d:'', dPro=ix>=0&&ix<r.dias.length-1?r.dias[ix+1].d:'';
      /* 11/11 ("estou tendo que apertar o x para selecionar outro"): com um dia escolhido, ‹ › passam para o dia de antes/depois e tocar na data abre o calendário para trocar */
      const diaBt=J.dsel?`<span class="pjp-dk pjp-dia on"><button type="button" class="pjp-dnv" data-act="pjp-dcal" data-v="${dAnt}" ${dAnt?'':'disabled'} aria-label="Dia anterior" title="Dia anterior">‹</button><button type="button" data-act="pjp-calab" title="Trocar o dia">${CALSVG} ${DNL[new Date(J.dsel+'T12:00:00').getDay()]} ${brc(J.dsel)} <span class="pjp-car" aria-hidden="true">▾</span></button><button type="button" class="pjp-dnv" data-act="pjp-dcal" data-v="${dPro}" ${dPro?'':'disabled'} aria-label="Próximo dia" title="Próximo dia">›</button><button type="button" class="pjp-diax" data-act="pjp-dcal" data-v="" aria-label="Ver todos os dias">✕</button></span>`
        :`<button type="button" class="pjp-dk pjp-dia" data-act="pjp-calab" aria-expanded="${!!J.calAb}">${CALSVG} Escolher o dia</button>`;
      const filtro=`<div class="pjp-dfil"><div class="pjp-dks">${prox}${diaBt}${[['*','Todos',r.dias.length],['conf','Para conferir',nK('conf')],['sai','Saiu no meio',nK('sai')],['cor','Corrigidos',nK('cor')],['sem','Sem passagem',nK('sem')],['aus','Atestado e férias',nK('aus')]].filter(([k,,n])=>k==='*'||n).map(([k,t,n])=>`<button type="button" class="pjp-dk" data-act="pjp-dk" data-v="${k}" aria-pressed="${!J.dsel&&(J.dk||'*')===k}">${t}<b>${n}</b></button>`).join('')}</div>${pop}</div>
        <p class="pjp-dv" id="pjp-dv" hidden>Nenhum dia com esse filtro.</p>`;
      const lin=r.dias.map(d=>{ const dd=`<div class="pg-dd">${DNL[d.dw]} ${brc(d.d)}</div>`;
        if(!d.hs.length&&!(d.ps&&d.ps.length)&&!d.aj&&!d.esc&&!(d.fer&&(d.fer.rh||d.fer.pago))&&J.edDia!==d.d) return `<div class="pjp-d pg-fds" ${at(d)}>${dd}<div>${d.dw===0||d.dw===6?'fim de semana':'fora da escala'}${ed?` · <button class="lnk" data-act="pjp-dcor" data-d="${d.d}" ${fa}>trabalhou? lançar</button>`:''}</div></div>`;
        const ch=d.aj?`<div class="pjp-chips">${d.zero?'<span>não trabalhou</span>':`<span>${esc(d.e||'—')}</span><span>${esc(d.s||'—')}</span>`}</div><span class="pg-tag pg-t">corrigido · ${esc(d.mot||'à mão')}</span>${d.hs.length?`<small class="ps" style="display:block;font-size:11.5px;color:var(--muted)">${d.src==='pto'||d.src==='mix'?'Entrada da fábrica':'Face ID'}: ${esc(d.hs.join(' · '))}</small>`:''}`
          :d.ps&&d.ps.length?`${diaVis(d,h,esc)}${d.src&&ptoMes(d.d.slice(0,7))?`<span class="pg-tag pg-src pg-${d.src}" title="${d.src==='fid'?'Sem marcação no Face ID da entrada da fábrica neste dia: vale o Face ID de sempre':d.src==='mix'?'Só uma marcação na entrada da fábrica: juntou com o Face ID de sempre':'Vale o Face ID da entrada da fábrica'}">${SRC_T[d.src]}</span>`:''}${d.sp&&!d.sp.soAlm?spHtml(d,ed,fa,esc):''}${d.fl?`<span class="pg-tag pg-w">Só uma passagem · falta a saída</span>`:d.info?`<span class="pg-tag ${d.fer?'pg-f':'pg-m'}">${esc(d.info)}</span>`:''}`
          :d.fil?`<div class="pjp-chips"><span>dia cheio</span></div><span class="pg-tag pg-m">${esc(d.info)}</span>`
          :d.fech?`<div class="pjp-chips"><span>dia do fechamento</span></div><span class="pg-tag pg-m">${esc(d.info)}</span>`
          :d.fer?`<div class="pjp-chips"><span>não trabalhou</span></div><span class="pg-tag pg-f">Feriado · ${esc(d.fer.nome)}</span>`
          :d.aus?`<div class="pjp-chips"><span>sem passagem no Face ID</span></div><span class="pg-tag pg-aus pg-aus-${d.aus}">${esc(d.info)}</span>`
          :`<div class="pjp-chips"><span>sem passagem no Face ID</span></div>`;
        const ferL=d.fer&&ed?`<small class="pg-fl">${d.fer.pago?`feriado pago (${hTxt(escM)}) · <button class="lnk" data-act="pjp-dferp" data-v="0" data-d="${d.d}" ${fa}>não pagar</button>`:`<button class="lnk" data-act="pjp-dferp" data-v="1" data-d="${d.d}" ${fa}>pagar o dia (${hTxt(escM)})</button>`}${d.fer.rh?` · <button class="lnk" data-act="pjp-dferx" data-d="${d.d}" ${fa}>não é feriado</button>`:''}</small>`:d.fer&&d.fer.pago?`<small class="pg-fl">feriado pago</small>`:'';
        const edit=J.edDia===d.d?`<div class="pjp-ed"><label>Entrada<input type="time" id="pjp-ce" value="${esc(d.zero?'':d.e)}"></label><label>Saída<input type="time" id="pjp-cs" value="${esc(d.zero?'':d.s)}"></label>
            <label class="pg-mot">Motivo<input id="pjp-cm" list="pjp-mots" value="${esc(d.mot&&d.aj?d.mot:d.fl?'Esqueceu de passar no Face ID':'')}" maxlength="80" placeholder="por que corrigiu"></label>
            <datalist id="pjp-mots">${MOTS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
            <span style="display:flex;gap:6px;flex-wrap:wrap">${btn('pjp-dsalva','Salvar','data-d="'+d.d+'" '+fa,'')}${btn('pjp-dzero','Não trabalhou (0 h)','data-d="'+d.d+'" '+fa)}${d.fer?'':btn('pjp-dfer','É feriado','data-d="'+d.d+'" '+fa)}${btn('pjp-dcanc','Cancelar')}</span></div>`:'';
        return `<div class="pjp-d ${d.fl&&!d.aj?'pg-al':''} ${d.sp&&!d.sp.soAlm&&!d.descF&&!d.okFora?'pg-al':''} ${d.aj?'pg-aj':''} ${!d.hs.length&&!d.aj&&!d.fil?'pg-sp':''}" ${at(d)}>${dd}<div>${ch}${ferL}</div><div class="pg-cc">${d.m&&d.E!=null?'conta '+hhmm(d.E)+'–'+hhmm(d.S):''}</div><div class="pg-hh">${d.m?hTxt(d.m):'—'}${d.mR!=null?`<small class="pg-fds" title="Sábado e domingo valem ${String(d.fF).replace('.',',')} hora">${hTxt(d.mR)} × ${String(d.fF).replace('.',',')}</small>`:''}</div>
          <div class="pg-cor">${ed?(d.aj?`<button class="lnk" data-act="pjp-diax" data-d="${d.d}" ${fa}>${r.fil?'desfazer':'voltar ao Face ID'}</button>`:d.fil?`<button class="lnk" data-act="pjp-dzero" data-mot="Faltou (o gestor avisou)" data-d="${d.d}" ${fa}><b>Faltou</b></button>`:`<button class="lnk" data-act="pjp-dcor" data-d="${d.d}" ${fa}>${d.fl?'<b>Corrigir</b>':'Corrigir'}</button>`):''}</div>${edit}</div>`; }).join('');
      corpo=`<div class="pjp-mini"><div><span>Dias com passagem</span><b>${comP}</b></div><div><span>Horas</span><b>${r.fixo?'fixo':hTxt(r.min)}</b></div><div class="${r.alerta?'pg-w':''}"><span>Para conferir</span><b>${r.alerta}</b></div><div><span>Corrigidos</span><b>${nAj}</b></div></div>
        ${r.alerta&&ed?(()=>{ const n1=r.dias.filter(d=>d.fl&&!d.aj).length, n2=r.alerta-n1, t=[]; if(n1) t.push(n1+' dia'+(n1>1?'s':'')+' com uma passagem só (falta a saída): toque em <b>Corrigir</b> e digite a hora certa'); if(n2) t.push(n2+' dia'+(n2>1?'s':'')+' em que saiu e voltou ou o dia ficou sem a entrada/saída: <b>Descontar</b> o tempo fora ou <b>Está certo</b>'); return `<div class="pjp-av pjp-avw">${t.join('.<br>')}. <button class="lnk" data-act="pjp-dk" data-v="conf" style="display:inline;margin:0">Ver só esses dias</button></div>`; })():''}
        ${r.saiu?`<div class="pjp-av pjp-avw"><b>Desligado em ${esc(brc(r.saiu))}.</b> Só contam os dias até essa data; os dias depois não aparecem.</div>`:''}
        ${r.horCurto?`<div class="pjp-av pjp-hc"><b>O horário desta pessoa está ${esc(r.horCurto.ini)} às ${esc(r.horCurto.fim)}</b> (${r.horCurto.de==='pj'?'nas Regras desta pessoa':r.horCurto.de==='cad'?'no "Horário diferente" do cadastro':'no horário padrão dos Parâmetros'}), mas ela costuma sair por volta das ${esc(r.horCurto.sai)}. Por isso o dia do fechamento conta só até ${esc(r.horCurto.fim)}. ${btn('pjp-tab','Corrigir o horário','data-v="regras"','')}</div>`:''}
        ${r.fil?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">Trabalha na Fixcol: não passa no Face ID. Cada dia da escala conta cheio; quando o gestor avisar que faltou, toque em <b>Faltou</b> no dia.</div>`:''}
        ${!ed?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">O valor já foi fechado. Para corrigir alguma hora, toque em ${lnk('pjp-reab','mudar o valor',fa).replace('class="lnk"','class="lnk" style="display:inline;margin:0"')} (volta para conferir).</div>`:''}
        ${filtro}<div class="pjp-dl">${lin}</div>
        <p class="ps" style="margin:0;color:var(--muted);font-size:12.5px">Os horários em destaque são a primeira e a última passagem do dia no Face ID. Até ${h.tol} min do horário (${esc(h.ini)} às ${esc(h.fim)}) conta o horário certo; o intervalo de ${h.intv} min sai de cada dia.</p>`; }
    else if(tab==='desc'){ const uT=r.uni.filter(u=>u.st==='ok').reduce((a,u)=>a+u.v,0), oT=r.descs.filter(z=>z.k!=='u').reduce((a,z)=>a+z.v,0);
      const uL=r.uni.map(u=>{ const xa=`data-x="${esc(u.x._id)}" data-q="${esc(u.Q)}" ${fa}`, I=u.I;
        const sit=u.st==='ok'?`<span class="pjp-pill ok">Vai descontar</span>${ed?lnk('pjp-ux','desfazer',xa):''}`:u.st==='falta'?`<span class="pjp-pill teal">Não desta vez · fica para a próxima quinzena</span>${ed?lnk('pjp-ux','desfazer',xa):''}`
          :ed?`${btn('pjp-uok','Descontar',xa,'')}${lnk('pjp-uno','Não descontar agora',xa)}`:`<span class="pjp-pill warn">Não confirmado</span>`;
        return `<div class="pg-ds"><div><b>Uniforme · entrega de ${esc(br(u.x.data))}</b><small>${esc(unifTxt(u.x)||'peças')} · parcela ${u.k||'?'} de ${I.n} · total ${R$(I.V)}${I.rest>0.004&&u.st!=='ok'?' · falta '+R$(I.rest):''}${u.atr?' · <b style="color:var(--warn-ink,#7A5310)">parcela atrasada</b>':''}</small></div><b class="pg-dv">${u.st==='falta'?'—':R$(u.v)}</b><div class="pg-da">${sit}</div></div>`; }).join('');
      const oL=r.descs.filter(z=>z.k!=='u').map(z=>`<div class="pg-ds"><div><b>${esc(z.t)}</b><small>${z.k==='leg'?'lançado antes da aba Descontos':z.k==='fch'?'automático: a quinzena passada pagou o dia cheio':'lançado pelo RH'}</small></div><b class="pg-dv">${R$(z.v)}</b><div class="pg-da">${ed?lnk('pjp-dxx','tirar',`data-id="${esc(z.k==='fch'?'fch':(z.id||'leg'))}" ${fa}`):''}</div></div>`).join('');
      const aL=r.acrs.map(z=>`<div class="pg-ds"><div><b>${esc(z.t)}</b><small>lançado pelo RH</small></div><b class="pg-dv" style="color:var(--ok,#2F7A4E)">+ ${R$(z.v)}</b><div class="pg-da">${ed?lnk('pjp-axx','tirar',`data-id="${esc(z.id)}" ${fa}`):''}</div></div>`).join('');
      corpo=`<div class="pjp-mini"><div><span>Total de descontos</span><b>${R$(r.desc)}</b></div><div><span>Uniforme</span><b>${R$(uT)}</b></div><div><span>Outros</span><b>${R$(oT)}</b></div><div class="${r.uPend?'pg-w':''}"><span>Para confirmar</span><b>${r.uPend}</b></div></div>
        ${!ed?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">O valor já foi fechado. Para mudar os descontos, toque em ${lnk('pjp-reab','mudar o valor',fa).replace('class="lnk"','class="lnk" style="display:inline;margin:0"')}.</div>`:''}
        <div class="pjp-sec"><h4>Uniforme</h4>${uL||'<p class="ps" style="margin:0;color:var(--muted)">Nenhuma parcela de uniforme para esta quinzena.</p>'}
          <p class="ps" style="margin:8px 0 0;color:var(--muted);font-size:12.5px">Vem das entregas de uniforme desta pessoa (RH › Uniformes), em parcelas descontadas no dia 15 e no último dia do mês. Só entra no valor depois que você confirma.</p></div>
        <div class="pjp-sec"><h4>Outros descontos</h4>${oL||'<p class="ps" style="margin:0;color:var(--muted)">Nenhum.</p>'}
          ${ed?`<div class="pjp-ed" style="border-color:var(--line,#E1E7EB)"><label class="pg-mot">O que é<input id="pjp-dxt" list="pjp-dxs" maxlength="80" placeholder="ex.: Vale / adiantamento"></label><datalist id="pjp-dxs">${DXS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
            <label>Valor (R$)<input id="pjp-dxv" inputmode="decimal" placeholder="0,00" style="width:110px"></label>${btn('pjp-dxadd','Acrescentar',fa,'')}</div>`:''}</div>
        <div class="pjp-sec"><h4>Acréscimos · somam no valor ${r.acr?`<span style="font-weight:600;color:var(--ok,#2F7A4E)">+ ${R$(r.acr)}</span>`:''}</h4>${aL||'<p class="ps" style="margin:0;color:var(--muted)">Nenhum.</p>'}
          ${ed?`<div class="pjp-ed" style="border-color:var(--line,#E1E7EB)"><label class="pg-mot">O que é<input id="pjp-axt" list="pjp-axs" maxlength="80" placeholder="ex.: Vale-transporte"></label><datalist id="pjp-axs">${ACX.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
            <label>Valor (R$)<input id="pjp-axv" inputmode="decimal" placeholder="ex.: 5 x 40" style="width:120px"></label>${btn('pjp-axadd','Somar',fa,'')}</div><p class="ps" style="margin:4px 0 0;color:var(--muted);font-size:12.5px">Vale-transporte: pode escrever dias × valor (ex.: 5 x 40 = R$ 200,00).</p>`:''}</div>`; }
    else if(tab==='regras'){ const pj=f.pjPag||{}, he=f.horEsp||{}, tem=v=>v!=null&&v!=='';
      const pad=(v,orig)=>`<small>${orig==='cad'?'do cadastro (horário diferente)':orig==='pj'?'só desta pessoa · padrão: '+esc(v):'padrão: '+esc(v)} · <a href="#" data-act="pjp-cfg" data-fecha="1" class="pjp-plk">mudar o padrão nos Parâmetros</a></small>`;
      corpo=`${x.st?`<div class="pjp-av" style="background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)">O valor desta quinzena já foi fechado: as regras novas valem quando reabrir ou na próxima quinzena.</div>`:''}
        <div class="pjp-sec"><h4>Horário</h4><div class="pjp-rg">
          <label>Entra<input type="time" id="pjp-ri" value="${esc(pj.ini||'')}" placeholder="${esc(h.ini)}">${pad(he.ini||g.ini,h.de.ini==='pj'?'pj':he.ini?'cad':'pad')}</label>
          <label>Sai<input type="time" id="pjp-rf" value="${esc(pj.fim||'')}">${pad(he.fim||g.fim,h.de.fim==='pj'?'pj':he.fim?'cad':'pad')}</label>
          <label>Intervalo (min)<input id="pjp-rint" inputmode="numeric" value="${tem(pj.intv)?esc(pj.intv):''}" placeholder="${esc(g.intv)}">${pad(g.intv,tem(pj.intv)?'pj':'pad')}</label>
          <label>Tolerância (min)<input id="pjp-rtol" inputmode="numeric" value="${tem(pj.tol)?esc(pj.tol):''}" placeholder="${esc(g.tol)}">${pad(g.tol,tem(pj.tol)?'pj':'pad')}</label></div>
          <div class="pjp-rl" style="margin-top:12px">Dias que trabalha<small>dia fora da escala com passagem aparece marcado; dia da escala sem passagem também</small></div>
          <div class="pjp-dw" style="margin-top:6px">${[1,2,3,4,5,6,0].map(i=>`<label><input type="checkbox" data-pjp-dw="${i}" ${h.dias.includes(i)?'checked':''}><span>${DNL[i]}</span></label>`).join('')}</div>
          <div class="pjp-rl" style="margin-top:12px">Face ID fora do horário<small>desmarcado = conta a partir da entrada (${esc(h.ini)}) ou até a saída (${esc(h.fim)}) do horário, mesmo que a pessoa tenha passado antes ou depois</small></div>
          <label class="pjp-ck" style="margin-top:6px"><input type="checkbox" id="pjp-rantes" ${cAntes(h)?'checked':''}> Considerar o Face ID <b>antes</b> do horário de entrada</label>
          <label class="pjp-ck" style="margin-top:6px"><input type="checkbox" id="pjp-rdepois" ${cDepois(h)?'checked':''}> Considerar o Face ID <b>depois</b> do horário de saída</label></div>
        ${(()=>{ const vis=leitVistos(dadosMes(pid)), lt=leitDe(c,f), gl=Array.isArray(g.leit)?g.leit:[], nomes=l=>l.length?l.map(k=>(vis.find(v=>v.k===k)||{n:k}).n).join(', '):'todos os leitores';
          return `<div class="pjp-sec"><h4>Leitores do Face ID que contam</h4><small style="color:var(--muted);display:block;margin:-4px 0 8px">A entrada é a 1ª passagem e a saída é a última, só nos leitores que contam. Ex.: tirar o refeitório. Quando o Face ID da entrada da fábrica (importado no alto da tela) tem marcação no dia, vale ele; sem marcação, vale este.</small>
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
      <div class="pjp-gh"><div class="pjp-av2">${esc(ini2(f.nome))}</div><div><h2>${esc(c.titulo(f.nome))}</h2><small>${esc([emp,f.setor,f.funcao?c.cargo(f.funcao):''].filter(Boolean).join(' · '))}${f.cnpj?' · CNPJ '+esc(fCNPJ(f.cnpj)):''}</small></div><button class="btn sec pjp-sm pjp-gcad" data-act="rh-ed" data-id="${esc(f._id)}" data-go-func="1" title="Abre o cadastro desta pessoa em Funcionários">Abrir o cadastro</button><button class="pjp-gx" data-act="pjp-gx" aria-label="Fechar">✕</button></div>
      <div class="pjp-gs"><span class="pjp-pill ${stC}">${stT}</span><small style="color:var(--muted)">${esc(h.ini)} às ${esc(h.fim)} · intervalo ${h.intv} min · ${h.dias.map(i=>DN[i]).join(', ')}</small></div>
      <div class="pjp-tabs" role="tablist">${[['horas','Horas'],['desc','Descontos e acréscimos'+(r.uPend?' ('+r.uPend+')':'')],['regras','Regras desta pessoa'],['hist','Histórico']].map(([k,t])=>`<button role="tab" class="${tab===k?'on':''}" aria-selected="${tab===k}" data-act="pjp-tab" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="pjp-gb">${corpo}</div>
      ${tab==='horas'||tab==='desc'?`<div class="pjp-tot"><div>Horas (decimal)<b>${r.fixo?'fixo':n2(hDec(r.min))+' h'}</b>${r.fixo?'':`<small>${hTxt(r.min)}</small>`}</div><div>× Valor da hora<b>${r.fixo?'—':r.vh?R$(r.vh):'falta'}</b></div>
        ${r.acr?`<div>+ Acréscimos<b>${R$(r.acr)}</b></div>`:''}<div>− Descontos<b>${r.desc?R$(r.desc):'—'}</b>${tab==='horas'?`<button class="lnk" data-act="pjp-tab" data-v="desc" style="display:inline;margin:0;font-size:12.5px">ver descontos</button>`:''}</div>
        <div>${r.uPend?`<span class="pjp-pill warn">${r.uPend} de uniforme para confirmar</span>`:''}</div>
        <div class="pg-big"><span>Total a pagar</span><b>${R$(r.valor)}</b>${antTxt(r)}</div><div style="grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;align-items:center">${acoes(c,pid,f,x,r).replace(/<br>/g,' ')}</div></div>`:''}
    </aside></div>`; }
  function modal(c){ const M=J.mod, esc=c.esc; if(!M) return ''; if(M.k==='fin') return finModal(c); if(M.k==='cw') return cwModal(c); 
    if(M.k==='cfg'){ const g=cfg(c), k=corteQ(), emV=pjEmps(c), emT=[...new Set(['ZENITH','NEXUS','COLAFIX'].concat((c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.empresa).map(f=>String(f.empresa).toUpperCase())))];
      const nEmp=e=>(c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.status!=='Desligado'&&String(f.empresa||'').toUpperCase()===e).length;
      return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod pjp-par" role="dialog" aria-label="Parâmetros do pagamento dos PJ"><h3>Parâmetros do pagamento</h3><p class="sub">Valem para todos os PJ. O horário e o valor da hora de cada pessoa ficam no detalhe dela (toque no nome › Regras).</p>
        <div class="pjp-box"><h4>Período do pagamento</h4>
          <div class="pjp-g3"><div><label for="pjp-cmodo">Pagar por</label><select id="pjp-cmodo"><option value="quinzena" ${g.modo!=='mes'?'selected':''}>Quinzena</option><option value="mes" ${g.modo==='mes'?'selected':''}>Mês inteiro</option></select></div>
            <div><label for="pjp-ccorte">1ª quinzena vai até o dia</label><input id="pjp-ccorte" inputmode="numeric" value="${k}" ${g.modo==='mes'?'disabled':''}><small>1 a ${k} e ${k+1} ao fim do mês (entre 10 e 20)</small></div>
            <div><label for="pjp-cpag">Pagamento sai</label><input id="pjp-cpag" inputmode="numeric" value="${esc(g.pagDias)}"><small>dias depois do fim do período (vai como data no e-mail ao financeiro)</small></div></div>
          <p class="sub" style="margin:8px 0 0">Mudar o período muda as datas de todas as quinzenas, inclusive as já fechadas: o valor fechado continua guardado, mas confira antes de mudar no meio do mês.</p></div>
        <div class="pjp-box"><h4>Quem entra no pagamento</h4><div class="pjp-emps">${emT.map(e=>`<label class="pjp-ck"><input type="checkbox" data-pjp-cemp="${esc(e)}" ${emV.includes(e)?'checked':''}> ${esc(e==='COLAFIX'?'Colafix (paga direto)':e.charAt(0)+e.slice(1).toLowerCase())} <small>${nEmp(e)} PJ</small></label>`).join('')}</div><small>Só aparecem na tela, nos números e nos relatórios os PJ das empresas marcadas.</small></div>
        <div class="pjp-box"><h4>Horas</h4>
          <div class="pjp-g3"><div><label for="pjp-cini">Horário padrão: entra</label><input type="time" id="pjp-cini" value="${esc(g.ini)}"></div><div><label for="pjp-cfim">Sai</label><input type="time" id="pjp-cfim" value="${esc(g.fim)}"></div><div><label for="pjp-cintv">Intervalo padrão (min)</label><input id="pjp-cintv" inputmode="numeric" value="${esc(g.intv)}"></div></div>
          ${(()=>{ const pr=(c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.pjPag&&f.pjPag.intv!=null&&f.pjPag.intv!==""); return `<p class="ps" style="margin:4px 0 0;color:var(--muted);font-size:12.5px">O intervalo padrão vale para todos os PJ que não têm um intervalo próprio nas Regras desta pessoa.</p>`+(pr.length?`<label class="pjp-box" style="margin-top:6px"><input type="checkbox" id="pjp-cintvt"> Usar o intervalo padrão também para ${pr.length===1?'a pessoa que tem':'as '+pr.length+' pessoas que têm'} intervalo próprio (${esc(pr.map(f=>c.titulo(f.nome)+' '+f.pjPag.intv+' min').join(', '))})</label>`:''); })()}
          <div class="pjp-g3"><div><label for="pjp-ctol">Tolerância (min)</label><input id="pjp-ctol" inputmode="numeric" value="${esc(g.tol)}"><small>até esses minutos vira o horário certo</small></div><div><label for="pjp-chm">Horas por mês</label><input id="pjp-chm" inputmode="numeric" value="${esc(g.horasMes)}"><small>valor da hora = salário ÷ horas</small></div><div><label for="pjp-cfds">Sábado e domingo valem</label><input id="pjp-cfds" inputmode="decimal" value="${esc(String(fdsF(c)).replace('.',','))}"><small>vezes a hora (1,5 = 50% a mais; 1 = normal)</small></div></div>
          <label class="pjp-ck" style="margin-top:10px"><input type="checkbox" id="pjp-cantes" ${gAD(g,'antes')?'checked':''}> Considerar o Face ID <b>antes</b> do horário de entrada</label>
          <label class="pjp-ck" style="margin-top:6px"><input type="checkbox" id="pjp-cdepois" ${gAD(g,'depois')?'checked':''}> Considerar o Face ID <b>depois</b> do horário de saída</label>
          <label style="margin-top:12px">Leitores do Face ID que contam para a entrada e a saída <small style="font-weight:400;color:var(--muted)">(nenhum marcado = todos; ex.: deixe o refeitório de fora)</small></label>${leitCaixas(esc,leitVistos(dadosMes(J.per)),Array.isArray(g.leit)?g.leit:[],'pjp-clt')}</div>
        <div class="pjp-box"><h4>Nota fiscal</h4>
          <div class="pjp-g3"><div><label for="pjp-cdias">Link da nota vale (dias)</label><input id="pjp-cdias" inputmode="numeric" value="${esc(g.dias)}"></div><div><label for="pjp-caviso">Avisar se a nota não chegar em (dias)</label><input id="pjp-caviso" inputmode="numeric" value="${esc(g.avisaNota)}"></div><div></div></div>
          <label for="pjp-cmsg">Mensagem do pedido de nota ({NOME}, {PERIODO}, {HORAS}, {VALOR}, {EMPRESA}, {CNPJ}, {LINK})</label><textarea id="pjp-cmsg" rows="5">${esc(g.msg)}</textarea></div>
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
  /* Pedido de nota pelo Conectwork (10/11, "pedir nota vai para o Conectwork"; escolha: Zenith e Nexus): para os PJ dessas
     prestadoras o "Pedir nota" manda a medição da quinzena da empresa ao Conectwork (nome, horas, valor e o CNPJ do PJ), a
     prestadora prepara a nota de cada PJ lá e o PJ emite pelo Conectwork. O link nota.html continua para as outras empresas.
     Lista em rh/config.conectworkMei (padrão ['NEXUS','ZENITH']). */
  const cwEmps=c=>(((c.R.cfg||{}).conectworkMei)||['NEXUS','ZENITH']).map(x=>String(x).toUpperCase()).filter(k=>k!=='COLAFIX'&&dig(((c.EMP_DOC||{})[k]||{}).cnpj).length===14);
  const viaCw=(c,f)=>cwEmps(c).includes(String(f.empresa||'').toUpperCase());
  const pedCw=x=>!!(x&&x.ped&&x.ped.via==='conectwork');
  const b64u=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  /* nota separada (12/11/2026, "mandar só dele e a empresa fazer um valor só para ele"): o PJ vai numa medição à parte no
     Conectwork (parte = id curto), fora do total da empresa. Junto (padrão): entra na medição da empresa; mandar de novo atualiza. */
  const parteDe=fid=>{ let t=String(fid||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,30); return t.length>=3?t:('pj'+t+'000').slice(0,5); };
  const sepDe=(fid,x)=>!!((x&&x.ped&&x.ped.via==='conectwork'&&x.ped.sep)||(J.cwSep||{})[fid]);
  /* quem entra na nota da empresa (junto): sem valor fechado, valor fechado ou já pedido pelo Conectwork junto.
     Fica fora quem foi em nota separada, quem pediu a nota pelo link (nota própria) e quem já foi pago por fora. */
  const semAc=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const cwJunto=x=>!x.cwFora&&(!x.st||x.st==='fechado'||(pedCw(x)&&!x.ped.sep));
  function cwMedicao(c,pid,empK,opt){ opt=opt||{}; const p=perDe(pid), D=docP(pid), emp=(c.EMP_DOC||{})[empK]||null;
    const rs=pjs(c,p).filter(f=>String(f.empresa||'').toUpperCase()===empK).filter(f=>{ const x=(D.pes||{})[f._id]||{};
      return opt.so?f._id===opt.so:!sepDe(f._id,x)&&cwJunto(x)&&(!opt.soFechados||!!x.st); }).map(f=>{ const x=(D.pes||{})[f._id]||{}, r=calcPessoa(c,f,p,x), fe=x.st&&x.fech;
      return {f,x,min:fe?fe.min:r.min,valor:fe?fe.valor:r.valor,fixo:r.fixo}; });
    /* CNPJ do MEI de cada PJ (10/11/2026): só das prestadoras em rh/config.conectworkMei (padrão: só a NEXUS); no Conectwork
       cada PJ recebe o espelho da nota dele para a prestadora. CNPJ é da empresa do PJ, nunca CPF. */
    const comCnpj=cwEmps(c).includes(empK);
    const itens=rs.filter(o=>o.valor>0).map(o=>{ const i={n:c.titulo(o.f.nome).slice(0,120),h:o.fixo?null:Math.round(hDec(o.min)*100)/100,v:Math.round(o.valor*100)}, cn=dig(o.f.cnpj);
      if(comCnpj&&cn.length===14) i.c=cn; return i; });
    return {emp,rs,itens,abertos:rs.filter(o=>!o.x.st).length,
      payload:Object.assign({v:1,periodo:pid,cnpj:dig(emp&&emp.cnpj),nome:emp?emp.nome:empK,total:itens.reduce((a,i)=>a+i.v,0),ref:'painel-rh:'+pid+':'+empK+(opt.so?':'+parteDe(opt.so):''),itens},opt.so?{parte:parteDe(opt.so)}:{})}; }
  /* quem da empresa entra no pedido: todos com valor; os sem valor fechado são fechados antes de mandar (a medição do período entra uma vez só) */
  function cwPedInfo(c,k,opt){ const M=cwMedicao(c,J.per,k,opt), com=M.rs.filter(o=>o.valor>0);
    return {M,com,abertos:com.filter(o=>!o.x.st),fech:com.filter(o=>o.x.st==='fechado'),ja:com.filter(o=>o.x.st&&o.x.st!=='fechado')}; }
  /* opt.so = fid → nota separada só desse PJ; opt.soFechados → junto, só os que já têm o valor fechado (os outros vão depois) */
  async function cwPedir(c,k,opt){ opt=opt||{}; const P=c.P, I0=cwPedInfo(c,k,opt);
    if(!opt.soFechados) for(const o of I0.abertos) await fechar(c,o.f);
    const I=cwPedInfo(c,k,opt); if(!I.M.itens.length) throw Object.assign(new Error('Nenhum valor para mandar de '+c.titulo(k)+'.'),{aviso:true});
    const url=cwLink(c,I.M.payload); window.__pjpUltimoCw=url; (window.__pjpCwHist=window.__pjpCwHist||[]).push(url);
    /* 12/11 ("diz que foi e não apareceu no Conectwork"): a janela é aberta no próprio toque (opt.win), antes de gravar; aberta depois
       de esperar o banco, o navegador bloqueava. Se ainda assim bloquear, a janela do painel mostra o link para tocar. */
    let w=opt.win&&!opt.win.closed?opt.win:null;
    if(w){ try{ w.location.href=url; }catch(e){ w=null; } }
    if(!w){ try{ w=window.open(url,'_blank'); }catch(e){ w=null; } }
    J.cwLinkBloq=w?'':url; if(w) try{ w.opener=null; }catch(e){}
    const p=perDe(J.per), D=docP(J.per);
    if(!opt.so){ const reg=Object.assign({},(D.cw||{})[k]||{},{em:agora(),por:c.eu(),total:I.M.payload.total,n:I.M.itens.length,conf:null}); D.cw=Object.assign({},D.cw,{[k]:reg}); J.docs[J.per]=D;
      await P.db().doc(COL+'/'+J.per).set({pid:J.per,de:p.de,ate:p.ate,em:agora(),cw:{[k]:reg}},{merge:true}); }
    for(const o of I.com){ const x=pesDe(J.per,o.f._id); if(x.st!=='fechado') continue;
      await grava(c,J.per,o.f._id,{st:'pedido',ped:Object.assign({via:'conectwork',em:agora(),por:c.eu(),valor:x.fech?x.fech.valor:o.valor,mes:p.mes,emp:k},opt.so?{sep:true,parte:parteDe(o.f._id)}:{})},
        (opt.so?'Nota separada pedida pelo Conectwork (':'Nota pedida pelo Conectwork (')+R$(x.fech?x.fech.valor:o.valor)+')'); }
    if(opt.so&&J.cwSep) delete J.cwSep[opt.so];
    return I; }
  /* janela aberta no toque (o navegador só deixa abrir sem esperar nada); o endereço entra depois, em cwPedir */
  const cwJanela=()=>{ try{ const w=window.open('about:blank','_blank'); if(w&&w.document&&w.document.body) w.document.body.innerHTML='<p style="font:16px system-ui;padding:24px">Abrindo o Conectwork…</p>'; return w||null; }catch(e){ return null; } };
  const quando=iso=>{ const d=new Date(iso); return isNaN(d)?'':pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+' às '+pad2(d.getHours())+':'+pad2(d.getMinutes()); };
  function cwVai(c,k){ J.mod={k:'cw'}; J.cwFoco=k||''; J.ab=''; c.P.render(); setTimeout(()=>{ const el=k&&document.getElementById('pjp-cw-'+k); if(el) el.scrollIntoView({block:'nearest'}); },60); }
  /* 12/11 ("direcionar para o login da Colafix no Conectwork"): o link leva ?empresa=<CNPJ da Colafix>; no Conectwork, depois
     do login (ou direto, se já entrou naquele navegador), abre na empresa Colafix sem perguntar. A senha nunca vai no link. */
  const cwBase=(c,rota)=>{ const u=String(((c.R.cfg||{}).conectworkUrl)||CW_URL).replace(/#.*$/,'').replace(/\?.*$/,''), cn=dig(((c.EMP_DOC||{}).COLAFIX||{}).cnpj);
    return u+(cn.length===14?'?empresa='+cn:'')+'#'+rota; };
  const cwLink=(c,payload)=>cwBase(c,'medicoes/importar/'+b64u(JSON.stringify(payload)));
  /* Conectwork num lugar só (12/11, "tem vários botões da Conectwork e confunde; melhorar a lógica"): um quadro por empresa com
     1) a nota da empresa (junto): quem já está pronto, quem falta fechar, mandar / mandar de novo (atualiza a medição);
     2) as notas separadas (cada PJ que a empresa fatura à parte); 3) as etapas da nota e do pagamento à empresa.
     Nas linhas da lista fica só "Ver na nota da Zenith" e o link "nota separada". */
  /* 12/11 ("pode ser um botão que nem o e-mail do financeiro, lá em cima"): o quadro do Conectwork abre numa janela pelo botão
     "Conectwork" ao lado do "E-mail ao financeiro"; o botão mostra quantos estão prontos e ainda não foram. */
  function cwBotao(c,pid,emps){ const ks=emps.filter(k=>cwEmps(c).includes(k)); if(!ks.length) return '';
    const p=perDe(pid), D=docP(pid); let n=0;
    ks.forEach(k=>pjs(c,p).filter(f=>String(f.empresa||'').toUpperCase()===k).forEach(f=>{ const x=pesDe(pid,f._id); if(x.st==='fechado'&&!x.cwFora) n++; }));
    return `<button type="button" class="pjp-cwbt" data-act="pjp-cwabre" title="Notas das prestadoras pelo Conectwork: junto na nota da empresa ou nota separada" aria-label="Conectwork${n?' · '+n+' para mandar':''}">
      <span class="pjp-cwlg">${CW_SIMB}</span><span class="pjp-cwwm">Conect<b>work</b></span>${n?`<span class="pjp-cwbd">${n} para mandar</span>`:''}</button>`;
  }
  /* símbolo do Conectwork (o mesmo do app: faixa azul em losango arredondado com a folha verde-água) */
  const CW_SIMB=`<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="pjpcwA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F63FF"/><stop offset="1" stop-color="#0733C4"/></linearGradient><linearGradient id="pjpcwB" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0A4C8A"/><stop offset=".5" stop-color="#0FA394"/><stop offset="1" stop-color="#24DFB3"/></linearGradient></defs><path d="M70.5 40.1 61.3 30.9Q50 19.6 38.7 30.9L30.9 38.7Q19.6 50 30.9 61.3L38.7 69.1Q50 80.4 61.3 69.1L63.5 66.9" fill="none" stroke="url(#pjpcwA)" stroke-width="21"/><path d="M49.6 66 71 44.6Q74 41.6 78.5 41.2L85.5 40.7Q88.6 40.5 88.4 43.6L87.9 50.6Q87.6 54.8 84.8 57.6L64.4 80.8Z" fill="url(#pjpcwB)" fill-opacity=".94"/></svg>`;
  function cwModal(c){ const pid=J.per, p=perDe(pid), emps=[...new Set(pjs(c,p).map(f=>String(f.empresa||'').toUpperCase()).filter(Boolean))].sort();
    return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod pjp-cwm" role="dialog" aria-label="Conectwork"><div class="pjp-cwmh"><span class="pjp-cwlg">${CW_SIMB}</span><div><span class="pjp-cwwm">Conect<b>work</b></span><h3>Notas das prestadoras</h3></div><button type="button" class="pjp-cwir" data-act="pjp-cwab" title="Abre o Conectwork já na empresa Colafix">Abrir o Conectwork da Colafix ↗</button></div>
      <p class="sub">A Colafix paga a empresa. Cada PJ vai <b>junto</b> na nota da empresa (padrão) ou numa <b>nota separada</b>. Só nome, horas, valor e CNPJ (nunca CPF); no Conectwork você confere e envia.</p>
      ${J.cwLinkBloq?`<div class="pjp-cwbloq" role="alert"><b>O navegador não abriu o Conectwork.</b> Toque aqui para abrir: <a href="${c.esc(J.cwLinkBloq)}" target="_blank" rel="noopener" data-pjp-cwlk>Abrir a medição no Conectwork ↗</a></div>`:''}
      ${cwBloco(c,pid,emps)||'<p>Nenhuma prestadora pelo Conectwork nesta quinzena.</p>'}
      <div class="pjp-ac" style="margin-top:14px;justify-content:flex-end">${btn('pjp-modx','Fechar')}</div></div></div>`; }
  function cwBloco(c,pid,emps){ const esc=c.esc, D=docP(pid), p=perDe(pid), ks=emps.filter(k=>cwEmps(c).includes(k)); if(!ks.length) return '';
    return `<div class="pjp-cw" id="pjp-cw">
      ${ks.map(k=>{ const nm=esc(c.titulo(k)), e='data-e="'+esc(k)+'"', ja=(D.cw||{})[k], conf=J.cwConf===k;
        const todos=pjs(c,p).filter(f=>String(f.empresa||'').toUpperCase()===k).map(f=>{ const x=pesDe(pid,f._id), r=calcPessoa(c,f,p,x); return {f,x,valor:x.st&&x.fech?x.fech.valor:r.valor}; }).filter(o=>o.valor>0);
        const jt=todos.filter(o=>!sepDe(o.f._id,o.x)&&cwJunto(o.x)), pr=jt.filter(o=>o.x.st), ab=jt.filter(o=>!o.x.st);
        const sep=todos.filter(o=>!o.x.cwFora&&sepDe(o.f._id,o.x)), ret=todos.filter(o=>o.x.cwFora), fora=todos.filter(o=>!o.x.cwFora&&!sepDe(o.f._id,o.x)&&!cwJunto(o.x));
        const tot=xs=>R$(xs.reduce((a,o)=>a+o.valor,0)), nome=o=>esc(c.titulo(o.f.nome)), pnome=o=>esc(c.titulo(o.f.nome).split(' ')[0]);
        const mudou=ja&&ja.total!==Math.round(pr.reduce((a,o)=>a+o.valor,0)*100);
        const novos=ja?pr.filter(o=>o.x.st==='fechado').length:0;
        const bts=!jt.length?'':!ja?(pr.length?btn('pjp-cwped',ab.length?(pr.length===1?'Mandar o pronto agora':'Mandar os '+pr.length+' prontos agora'):'Mandar a nota da '+nm,e+(ab.length?' data-so="f"':''),''):'')
            +(ab.length?(conf?btn('pjp-cwped','Confirmar: fechar os '+ab.length+' e mandar todos',e,'crit'):lnk('pjp-cwtodos',ab.length===1?'fechar o que falta e mandar todos':'fechar os '+ab.length+' que faltam e mandar todos',e)):'')
          :(novos||mudou?btn('pjp-cwped','Mandar de novo (atualiza a medição)',e+(ab.length?' data-so="f"':''),''):'')+(ab.length?(conf?btn('pjp-cwped','Confirmar: fechar os '+ab.length+' e mandar todos',e,'crit'):lnk('pjp-cwtodos','fechar os '+ab.length+' que faltam e mandar todos',e)):'');
        /* 12/11 ("coloque a opção de pesquisar e escolher o PJ e um botão de retirar"): a lista fica aberta, com busca (filtra sem
           redesenhar) e, em cada PJ, Retirar (sai desta nota; fica em "Retirados" com "Pôr de volta") e nota separada. */
        const fb=o=>'data-b="'+esc(semAc(c.titulo(o.f.nome)+' '+(o.f.setor||'')+' '+(o.f.funcao||'')))+'"', df=o=>'data-f="'+esc(o.f._id)+'"';
        const quem=(jt.length||ret.length)?`<div class="pjp-cwq"><div class="pjp-cwqh"><b>Quem está na nota da ${nm} (${jt.length})</b><label class="pjp-cwbus"><span aria-hidden="true">⌕</span><input type="search" data-pjp-cwbus="${esc(k)}" placeholder="Procurar PJ pelo nome" aria-label="Procurar PJ na nota da ${nm}"></label></div>
          <ul data-pjp-cwl="${esc(k)}">${jt.map(o=>`<li ${fb(o)}><span>${nome(o)}</span><b>${R$(o.valor)}</b><small>${!o.x.st?'falta fechar o valor':o.x.st==='fechado'?(ja?'pronto · ainda não foi':'pronto'):'já foi na nota'}</small>
            <span class="pjp-cwqa">${!o.x.st?btn('pjp-fech','Fechar o valor',df(o),'sec'):''}${!pedCw(o.x)?lnk('pjp-cwsepr','nota separada',df(o)):''}${btn('pjp-cwret','Retirar',df(o)+' title="Tirar da nota da '+nm+' desta quinzena"','sec')}</span></li>`).join('')}
          ${ret.map(o=>`<li class="ret" ${fb(o)}><span>${nome(o)}</span><b>${R$(o.valor)}</b><small>retirado da nota</small><span class="pjp-cwqa">${btn('pjp-cwvolta','Pôr de volta',df(o),'sec')}</span></li>`).join('')}</ul>
          <small class="pjp-cwq0" hidden>Nenhum PJ com esse nome nesta nota.</small></div>`:'';
        const sepH=sep.length?`<div class="pjp-cwsec"><b>Notas separadas</b> <small>(a ${nm} faz uma nota só com o valor de cada um)</small><ul>${sep.map(o=>{ const env=pedCw(o.x)&&o.x.ped.sep;
            return `<li><span>${nome(o)}</span><b>${R$(o.valor)}</b>${env?`<small>enviada ${esc(quando(o.x.ped.em))}</small>`:btn('pjp-cwsepm',o.x.st?'Mandar só '+pnome(o):'Fechar e mandar só '+pnome(o),e+' data-f="'+esc(o.f._id)+'"','')+lnk('pjp-cwsepx','voltar para a nota da '+nm,'data-f="'+esc(o.f._id)+'"')}</li>`; }).join('')}</ul></div>`:'';
        return `<div class="pjp-cwe pjp-cwk${J.cwFoco===k?' foco':''}" id="pjp-cw-${esc(k)}"><div class="pjp-cwh"><b>${nm}</b>
            <span class="pjp-cwn">${jt.length?`Nota da ${nm}: <b>${pr.length} pronto${pr.length===1?'':'s'}</b> · ${tot(pr)}${ab.length?` · <span class="pjp-cwab">${ab.length} sem valor fechado</span>`:''}`:'Nenhum PJ na nota da '+nm}${ja?`<small>${ja.conf?'Enviada no Conectwork':'Aberta (falta enviar lá)'} ${esc(quando(ja.em))}${ja.por?' por '+esc(ja.por):''} · ${R$(ja.total/100)} (${ja.n} PJ)${novos||mudou?' · <b class="pjp-cwab">tem valor novo: mande de novo</b>':''}</small>`:''}</span>
            <span class="pjp-ac">${bts}</span></div>
          ${quem}${sepH}${fora.length?`<small class="pjp-cwfo">Fora da nota da ${nm}: ${fora.map(nome).join(', ')} (já pagos por fora ou com nota pelo link)</small>`:''}
          ${ja?cwEtapas(c,k,ja):''}</div>`; }).join('')}</div>`; }
  /* 11/11 ("o valor total gera a nota da Nexus para a Colafix e o valor do PJ gera a demanda no Conectwork dele para a Nexus"):
     a Colafix paga só a empresa. Por empresa: 1 medição enviada · 2 nota da empresa para a Colafix conferida · 3 Colafix pagou a empresa.
     A nota de cada MEI para a empresa e o pagamento do MEI são da empresa, no Conectwork (aqui só aparece como acompanhamento). */
  function cwEtapas(c,k,ja){ const esc=c.esc, n=ja.nota, pg=ja.pago, nm=esc(c.titulo(k)), e='data-e="'+esc(k)+'"';
    const pas=(ok,t,s,acao)=>`<li class="${ok?'ok':''}"><i>${ok?'✓':''}</i><div><b>${t}</b>${s?`<small>${s}</small>`:''}</div>${acao||''}</li>`;
    /* 12/11 ("aparece medição enviada mas não funcionou"): o painel não lê o Conectwork; abrir o link não é enviar. O passo 1 só fica
       feito quando a pessoa confirma "Enviei no Conectwork" (cw.<EMP>.conf); até lá, explica o que fazer e deixa abrir de novo. */
    const cf=ja.conf;
    if(!cf) return `<ol class="pjp-cwp"><li class="pend"><i></i><div><b>Falta enviar no Conectwork</b><small>Aberta ${esc(quando(ja.em))}${ja.por?' · '+esc(ja.por):''}, mas ainda não confirmada. No Conectwork, confira e toque em <b>Enviar</b>. Se lá aparecer "Falta registrar o contrato", toque em <b>Registrar o contrato que já existe</b> (só uma vez por empresa).</small></div>
        <span class="pjp-ac">${btn('pjp-cwped','Abrir de novo no Conectwork',e+' data-so="f"','sec')}${btn('pjp-cwconf','Enviei no Conectwork',e,'')}</span></li>
      ${pas(false,'Nota da '+nm+' para a Colafix','depois de enviar a medição','')}${pas(false,'Colafix pagou a '+nm,'','')}</ol>`;
    return `<ol class="pjp-cwp">${pas(true,'Medição enviada no Conectwork','confirmada '+esc(quando(cf.em))+(cf.por?' · '+esc(cf.por):''),lnk('pjp-cwconfx','não chegou? desfazer',e)+' '+lnk('pjp-cwab','ver no Conectwork',''))}
      ${pas(!!n,'Nota da '+nm+' para a Colafix',n?'conferida no Conectwork · '+esc(quando(n.em))+(n.por?' · '+esc(n.por):''):'a '+nm+' emite uma nota só, do valor total ('+R$(ja.total/100)+')',n?lnk('pjp-cwnotax','desfazer',e):btn('pjp-cwnota','Nota conferida',e,'sec'))}
      ${pas(!!pg,'Colafix pagou a '+nm,pg?esc(quando(pg.em))+(pg.por?' · '+esc(pg.por):''):'depois do pagamento, a '+nm+' paga cada MEI pelo Conectwork',pg?lnk('pjp-cwpagox','desfazer',e):n?btn('pjp-cwpago','Marcar pago',e,''):'')}
      ${pas(false,'Notas dos MEIs para a '+nm,'cada MEI recebe a demanda no Conectwork dele; a '+nm+' confere e paga lá','')}</ol>`; }
  async function cwEmpMarca(c,k,campo,val,st,hist){ const p=perDe(J.per), D=docP(J.per), reg=Object.assign({},(D.cw||{})[k]||{},{[campo]:val}); D.cw=Object.assign({},D.cw,{[k]:reg}); J.docs[J.per]=D;
    await c.P.db().doc(COL+'/'+J.per).set({pid:J.per,de:p.de,ate:p.ate,em:agora(),cw:{[k]:{[campo]:val}}},{merge:true});
    for(const f of pjs(c,p).filter(f=>String(f.empresa||'').toUpperCase()===k)){ const x=pesDe(J.per,f._id); if(!x.fech) continue; const up=st(x); if(up) await grava(c,J.per,f._id,up,hist); } }

  /* etapas (10/11, "organizar a aba e deixar funcional"): cada PJ está numa etapa; os cartões das etapas também filtram a lista */
  const ETAPAS=[['','Conferir as horas','e fechar o valor'],['fechado','Pedir a nota','valor fechado'],['pedido','Esperando a nota','o PJ manda pelo link'],['chegou','Conferir a nota','chegou pelo link'],['conferida','Para pagar','nota conferida'],['pago','Pago','']];
  const etIdx=st=>Math.max(0,ETAPAS.findIndex(e=>e[0]===(st||'')));
  /* tela combinada (10/11, escolha da usuária no protótipo "Pagamento dos PJ · opções": o modelo da C, os quadros da B e o detalhe da A)
     1) Próximo passo (o que fazer agora, com o botão)  2) Precisa de você + Resumo da quinzena
     3) Quadros por etapa (acompanhar onde cada PJ está; tocar no título filtra a lista)  4) Lista de todos os PJ (detalhe) */
  const COLS=[{t:'Conferir e fechar',st:['']},{t:'Nota',st:['fechado','pedido','chegou']},{t:'Para pagar',st:['conferida']},{t:'Pago',st:['pago']}];
  const colDe=st=>Math.max(0,COLS.findIndex(c=>c.st.includes(st||'')));
  const diasDesde=iso=>{ if(!iso) return 0; return Math.floor((Date.now()-new Date(iso).getTime())/864e5); };
  /* Face ID atualizado? (10/11, "preciso incluir a última verificação do Face ID para saber se está atualizado")
     robô (rh/dados/robo/faceid: ultima, ok, dispositivos) + última passagem gravada no período + última importação do CSV */
  const hm=iso=>{ const d=new Date(iso); return isNaN(d)?'':pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+' às '+pad2(d.getHours())+':'+pad2(d.getMinutes()); };
  const haTxt=min=>min<1?'agora':min<60?'há '+Math.round(min)+' min':min<48*60?'há '+Math.floor(min/60)+' h'+(Math.round(min%60)?' '+pad2(Math.round(min%60)):''):'há '+Math.floor(min/1440)+' dias';
  function fidInfo(c,p){ const A=window.RHAlmoco&&window.RHAlmoco._A; if(!A) return null;
    if(!A.roboSub){ A.roboSub=true; try{ c.P.db().doc('rh/dados/robo/faceid').onSnapshot(g=>{ A.robo=g.exists?g.data():null; c.P.rerender(); },()=>{}); }catch(e){} }
    const D=A.dados[p.mes]; let ult='';
    if(D&&D.dias) Object.keys(D.dias).filter(d=>d>=p.de&&d<=p.ate).sort().reverse().some(d=>{ let mx=''; Object.values(D.dias[d]||{}).forEach(x=>((x&&x.t)||[]).forEach(t=>{ const h=String(t).slice(0,5); if(/^\d\d:\d\d$/.test(h)&&h>mx) mx=h; })); if(mx){ ult=d+'T'+mx; return true; } return false; });
    const imp=D&&D.imp&&D.imp.length?D.imp.slice().sort((a,b)=>String(a.em).localeCompare(String(b.em))).slice(-1)[0]:null;
    const R=A.robo, out={ult,imp,robo:R,tom:'ok',tit:'',sub:''};
    const minR=R&&R.ultima?(Date.now()-new Date(R.ultima).getTime())/60000:null, fora=R?Object.entries(R.dispositivos||{}).filter(([,x])=>x&&!x.ok).map(([n])=>n):[];
    const ultTxt=ult?'Última passagem registrada: '+brc(ult.slice(0,10))+' às '+ult.slice(11,16):'Nenhuma passagem neste período';
    if(R&&R.ultima){
      if(minR>130){ out.tom='crit'; out.tit='Face ID parado'; out.sub='O robô leu pela última vez '+hm(R.ultima)+' ('+haTxt(minR)+'). Confira o computador do robô ou importe o CSV.'; out.curto='leu '+haTxt(minR); }
      else if(R.ok===false){ out.tom='warn'; out.tit='Face ID com problema'; out.curto=fora.length?'fora do ar: '+fora.join(', '):'leu '+haTxt(minR); out.sub='Leitura '+haTxt(minR)+(fora.length?' · fora do ar: '+fora.join(', '):R.erro?' · '+String(R.erro).slice(0,60):''); }
      else { out.tit='Face ID em dia'; out.sub='Robô leu '+haTxt(minR)+' ('+hm(R.ultima).split(' às ')[1]+')'; out.curto='leu '+haTxt(minR); }
    } else if(imp&&imp.em){ const mi=(Date.now()-new Date(imp.em).getTime())/60000; out.tom=mi>36*60?'warn':'ok'; out.tit=mi>36*60?'Face ID desatualizado':'Face ID importado'; out.sub='CSV importado '+haTxt(mi)+(imp.por?' por '+imp.por:''); out.curto='CSV '+haTxt(mi); }
    else if(ult){ out.tom='warn'; out.tit='Face ID sem data de atualização'; out.sub='Há passagens neste período, mas não dá para saber quando foram lidas.'; }
    else { out.tom='crit'; out.tit='Sem Face ID'; out.sub='Nenhuma leitura nem importação deste mês.'; }
    out.ultTxt=ultTxt; return out; }
  /* situação do Face ID da entrada da fábrica (o CSV importado aqui) */
  function ptoInfo(c,p){ if(!J.roboSub){ J.roboSub=true; try{ c.P.db().doc('rh/dados/robo/entrada').onSnapshot(g=>{ J.robo=g.exists?g.data():null; c.P.rerender(); },()=>{}); }catch(e){} }
    const D=ptoMes(p.mes); let ult=''; if(D&&D.dias) Object.keys(D.dias).filter(d=>d>=p.de&&d<=p.ate).sort().reverse().some(d=>{ let mx=''; Object.values(D.dias[d]||{}).forEach(x=>((x&&x.t)||[]).forEach(t=>{ const h=String(t).slice(0,5); if(/^\d\d:\d\d$/.test(h)&&h>mx) mx=h; })); if(mx){ ult=d+'T'+mx; return true; } return false; });
    const imp=D&&D.imp&&D.imp.length?D.imp.slice().sort((a,b)=>String(a.em).localeCompare(String(b.em))).slice(-1)[0]:null;
    const R=J.robo, ultTx=ult?'última passagem '+brc(ult.slice(0,10))+' às '+ult.slice(11,16):'';
    if(R&&R.ultima){ const mr=(Date.now()-new Date(R.ultima).getTime())/60000;  /* robô da entrada (robo-entrada/), de hora em hora */
      if(mr>130) return {tom:'crit',tit:'Robô da entrada parado',sub:'Leu pela última vez '+hm(R.ultima)+' ('+haTxt(mr)+'). Confira o computador do robô ou importe o CSV.'+(ultTx?' · '+ultTx:''),ult,imp};
      if(R.ok===false) return {tom:'warn',tit:'Robô da entrada com problema',sub:String(R.erro||'erro').slice(0,140)+(ultTx?' · '+ultTx:''),ult,imp};
      return {tom:'ok',tit:'Entrada da fábrica em dia',sub:'Robô leu '+haTxt(mr)+(ultTx?' · '+ultTx:''),ult,imp}; }
    if(!imp&&!ult) return {tom:'warn',tit:'Entrada da fábrica sem importar',sub:'Sem o CSV da entrada, as horas saem do Face ID de sempre.',ult,imp};
    const mi=imp&&imp.em?(Date.now()-new Date(imp.em).getTime())/60000:null;
    return {tom:mi!=null&&mi>36*60?'warn':'ok',tit:'Entrada da fábrica',sub:(imp?'CSV importado '+haTxt(mi)+(imp.por?' por '+imp.por:''):'')+(ult?' · última passagem '+brc(ult.slice(0,10))+' às '+ult.slice(11,16):''),ult,imp}; }
  function ptoPil(c,p){ const esc=c.esc, I=ptoInfo(c,p);
    const tit=I.tom==='ok'?'Entrada em dia':/parado/.test(I.tit)?'Entrada parada':/problema/.test(I.tit)?'Entrada com problema':I.imp||I.ult?'Entrada desatualizada':'Entrada sem importar';
    return `<div class="pjp-fid pto ${I.tom}" role="status" title="${esc(I.tit+' · '+I.sub)}"><span class="pjp-fdot" aria-hidden="true"></span><b>${esc(tit)}</b><label class="pjp-imp">${J.ptoLendo?'lendo…':'importar CSV'}<input type="file" accept=".csv,text/csv" data-pjp-pto="1" hidden ${J.ptoLendo?'disabled':''}></label></div>`; }
  /* importar o CSV "Acessos Gerais" do iDSecure da entrada da fábrica: junta as passagens com as que já estavam (não apaga nada) */
  async function ptoImporta(c,file){ const P=c.P; J.ptoLendo=true; P.rerender();
    try{ if(!window.RHAlmoco||!window.RHAlmoco.interpretar) throw new Error('O módulo do Face ID ainda não carregou. Tente de novo.');
      const buf=await file.arrayBuffer(); let txt=new TextDecoder('utf-8',{fatal:false}).decode(buf); if(/\uFFFD/.test(txt)) txt=new TextDecoder('iso-8859-1').decode(buf);
      const I=window.RHAlmoco.interpretar(txt), porMes={}; Object.keys(I.dias).forEach(d=>{ (porMes[d.slice(0,7)]=porMes[d.slice(0,7)]||[]).push(d); }); let nd=0;
      for(const m of Object.keys(porMes)){ const q=await P.db().collection(PTO).where('mes','==',m).limit(1).get(); const ref=q.docs[0]?q.docs[0].ref:P.db().doc(PTO+'/'+m), cur=q.docs[0]?q.docs[0].data():{mes:m,dias:{},pessoas:{},imp:[]};
        const dias=Object.assign({},cur.dias||{}); porMes[m].forEach(d=>{ const a=dias[d]||{}, b=I.dias[d]||{}, o={}; nd++;
          new Set(Object.keys(a).concat(Object.keys(b))).forEach(k=>{ const x=a[k]||{}, y=b[k]||{}, t=[...new Set((x.t||[]).concat(y.t||[]))].sort(), z={p:1,t}; if(x.ar||y.ar) z.ar=Object.assign({},x.ar||{},y.ar||{}); o[k]=z; }); dias[d]=o; });
        const pessoas=Object.assign({},cur.pessoas||{}); Object.keys(I.pessoas).forEach(k=>{ if(porMes[m].some(d=>I.dias[d]&&I.dias[d][k])) pessoas[k]=I.pessoas[k]; });
        const imp=(cur.imp||[]).concat([{em:new Date().toISOString(),por:c.eu(),arq:file.name,de:porMes[m].sort()[0],ate:porMes[m].sort().slice(-1)[0],n:I.lidos}]).slice(-40);
        const doc={mes:m,dias,pessoas,imp,alteradoEm:new Date().toISOString()}; await ref.set(doc); J.pto[m]=doc; }
      P.toast('Entrada da fábrica importada: '+nd+' '+(nd===1?'dia':'dias')+' ('+br(I.de)+' a '+br(I.ate)+').'); }
    catch(e){ console.warn('[pjpag ponto]',e); P.toast(e&&e.message?e.message:'Não consegui ler o arquivo.'); }
    finally{ J.ptoLendo=false; P.rerender(); } }
  /* comparar com a quinzena passada (11/11, melhoria 4): o valor fechado de lá; sem valor fechado, a conta do Face ID (se carregou) */
  function antDe(c,f,pA,DA,dadosA){ const xa=DA&&DA.pes&&DA.pes[f._id]; let v=null, de='';
    if(xa&&xa.fech&&xa.st){ v=+xa.fech.valor||0; de='fechado'; } else if(dadosA||ptoMes(pA.mes)){ try{ v=calcPessoa(c,f,pA,xa||{}).valor; de='conta'; }catch(e){} }
    if(v==null||!(v>0)) return null; return {v,de,txt:pA.txt}; }
  const difAnt=r=>{ if(!r.ant||!(r.valor>0)) return null; if(r.fd&&hojeS()<r.fd) return null; const dv=Math.round((r.valor-r.ant.v)*100)/100, pc=dv/r.ant.v; return {dv,pc,muda:Math.abs(pc)>=0.2&&Math.abs(dv)>=100}; };
  const antTxt=r=>{ const z=difAnt(r); if(!z) return ''; return `<small class="pjp-ant ${z.muda?(z.dv>0?'up':'dn'):''}" title="Quinzena passada (${r.ant.txt}): ${R$(r.ant.v)}${r.ant.de==='conta'?' · ainda não fechada, pela conta do Face ID':''}">${Math.abs(z.dv)<0.01?'igual à passada':(z.dv>0?'+ ':'− ')+R$(Math.abs(z.dv))+' vs passada'+(z.muda?' ('+(z.dv>0?'+':'−')+Math.round(Math.abs(z.pc)*100)+'%)':'')}</small>`; };
  function render(c){ C=c; const esc=c.esc, U=window.Painel&&window.Painel.ui; if(!J.per) J.per=perAtual(c); const pid=J.per, p=perDe(pid); assina(c,pid); try{ assina(c,perMove(pid,-1)); }catch(e){}
    const D=docP(pid), xs=pjs(c,p);
    const emps=[...new Set(xs.map(f=>String(f.empresa||'').toUpperCase()).filter(Boolean))].sort();
    const q=norm(J.q), ehAt=pid===perAtual(c), col=J.col==null?-1:J.col;
    const pAnt=perDe(perMove(pid,-1)), DA=J.docs[pAnt.pid], dadosA=!!(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[pAnt.mes]);
    const rsT=xs.map(f=>{ const x=(D.pes||{})[f._id]||{}; const r=x.st&&x.fech?Object.assign(calcPessoa(c,f,p,x),{min:x.fech.min,valor:x.fech.valor,bruto:x.fech.bruto,desc:x.fech.desc||0}):calcPessoa(c,f,p,x); r.ant=antDe(c,f,pAnt,DA,dadosA); return {f,x,r}; });
    const sets=[...new Set(rsT.map(({f})=>f.setor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const nConf=rsT.filter(({x,r})=>!x.st&&r.alerta).length;
    const rsF=rsT.filter(({f,x,r})=>(!J.emp||String(f.empresa||'').toUpperCase()===J.emp)&&(!J.set||(f.setor||'')===J.set)&&(!J.conf||(!x.st&&r.alerta))&&(!q||norm(f.nome+' '+(f.setor||'')+' '+(f.empresa||'')).includes(q)))
      .sort((A,B)=>etIdx(A.x.st)-etIdx(B.x.st)||String(A.f.nome).localeCompare(String(B.f.nome),'pt-BR'));
    const rs=rsF.filter(({x})=>col<0||COLS[col].st.includes(x.st||''));
    const okFech=o=>!o.x.st&&(o.r.fixo||(o.r.vh&&o.r.min))&&!o.r.uPend;
    const prontos=rsF.filter(o=>okFech(o)&&!o.r.alerta&&!o.r.horCurto), abrir=rsF.filter(okFech), fechados=rsF.filter(o=>o.x.st==='fechado');
    J._vis=prontos.map(o=>o.f._id).concat(fechados.map(o=>o.f._id));
    const soma=a=>a.reduce((t,o)=>t+o.r.valor,0), totV=soma(rsF), pagoV=soma(rsF.filter(o=>o.x.st==='pago')), totM=rsF.reduce((t,o)=>t+o.r.min,0);
    const nm=o=>c.titulo(o.f.nome), fa=o=>`data-f="${esc(o.f._id)}"`, ini=o=>U?U.ini(nm(o),{p:1}):'';
    const nomes=a=>a.slice(0,3).map(o=>nm(o).split(' ')[0]).join(', ')+(a.length>3?' e mais '+(a.length-3):'');
    /* 1) próximo passo */
    const chegou=rsF.filter(o=>o.x.st==='chegou'), conf=rsF.filter(o=>o.x.st==='conferida'), ped=rsF.filter(o=>o.x.st==='pedido');
    let pp; const cedo=hojeS()<fechDia(p);
    if(prontos.length&&cedo) pp={t:'Quinzena em andamento: o valor fecha em '+brc(fechDia(p)),s:'Até o último dia útil ('+brc(fechDia(p))+') as horas ainda mudam. Para fechar a quinzena que já acabou, vá para a quinzena passada.',b:btn('pjp-per','Ir para a quinzena passada','data-v="-1"','')};
    else if(prontos.length) pp={t:prontos.length===1?'1 PJ pronto para fechar o valor':prontos.length+' PJ prontos para fechar o valor',s:nomes(prontos)+' · '+R$(soma(prontos))+'. Depois de fechar, já dá para pedir a nota.',b:prontos.length===1?btn('pjp-fech','Fechar o valor',fa(prontos[0]),''):btn('pjp-fechtodos','Fechar o valor dos '+prontos.length,'','')};
    else if(fechados.length) pp={t:fechados.length===1?'1 valor fechado: falta pedir a nota':fechados.length+' valores fechados: falta pedir a nota',s:nomes(fechados)+' · '+R$(soma(fechados))+(fechados.every(o=>viaCw(c,o.f))?'. O pedido vai pelo Conectwork.':fechados.some(o=>viaCw(c,o.f))?'. Zenith e Nexus pelo Conectwork; os outros recebem o link pelo WhatsApp.':'. O PJ recebe o link pelo WhatsApp.'),b:fechados.length===1?btn('pjp-ped','Pedir a nota',fa(fechados[0]),''):btn('pjp-pedtodos','Pedir nota aos '+fechados.length,'','')};
    else if(chegou.length) pp={t:chegou.length===1?'1 nota chegou para conferir':chegou.length+' notas chegaram para conferir',s:nomes(chegou)+'. Confira o valor e o CNPJ antes de pagar.',b:btn('pjp-nver','Ver a nota de '+nm(chegou[0]).split(' ')[0],fa(chegou[0]),'')};
    else if(conf.length) pp={t:conf.length===1?'1 nota conferida: falta marcar pago':conf.length+' notas conferidas: falta marcar pago',s:nomes(conf)+' · '+R$(soma(conf))+'.',b:btn('pjp-pago','Marcar pago',fa(conf[0]),'')};
    else if(ped.length) pp={t:'Esperando '+(ped.length===1?'1 nota':ped.length+' notas'),s:nomes(ped)+(ped.every(o=>pedCw(o.x))?'. A nota é emitida e conferida no Conectwork; quando estiver certa lá, marque aqui "nota conferida no Conectwork".':'. Quando a nota chegar pelo link, ela aparece aqui para conferir.'),b:''};
    else if(rsF.length&&rsF.every(o=>o.x.st==='pago')) pp={t:'Tudo pago nesta quinzena',s:rsF.length+' PJ · '+R$(pagoV)+'.',b:'',ok:1};
    else if(!xs.length) pp={t:'Nenhum PJ nesta quinzena',s:'Cadastre em Funcionários as pessoas com vínculo PJ.',b:''};
    else pp={t:'Confira o que precisa de você',s:'Ninguém está pronto para fechar ainda. Resolva os itens abaixo.',b:''};
    /* 2) precisa de você */
    const pv=[];
    rsF.forEach(o=>{ const {x,r}=o, st=x.st||''; let t='', tom='';
      if(st===''){ if(!r.fixo&&!r.vh){ t='Sem valor da hora'+(r.semFid?' e sem passagem no Face ID':''); tom='crit'; } else if(!r.fixo&&!r.min){ t='Sem horas no período'+(r.semFid?' (não passou no Face ID)':''); tom='crit'; }
        else { const a=[]; if(r.alerta) a.push(r.alerta+' dia'+(r.alerta>1?'s':'')+' para conferir (só uma passagem ou saiu e voltou)'); if(r.uPend) a.push('desconto do uniforme para confirmar'); if(r.horCurto) a.push('horário até '+r.horCurto.fim+', mas sai por volta das '+r.horCurto.sai+' · confira as Regras'); { const z=difAnt(r); if(z&&z.muda) a.push('valor '+(z.dv>0?'subiu ':'caiu ')+Math.round(Math.abs(z.pc)*100)+'% em relação à quinzena passada ('+R$(r.ant.v)+' → '+R$(r.valor)+')'); } if(a.length){ t=a.join(' · '); tom='warn'; } } }
      else if(st==='chegou'){ t=x.nota&&x.nota.conf==='dif'?'Nota chegou com diferença':'Nota chegou · conferir'; tom=x.nota&&x.nota.conf==='dif'?'crit':'warn'; }
      else if(st==='conferida'){ t='Nota conferida · falta marcar pago'; tom='info'; }
      else if(st==='pedido'&&x.ped&&diasDesde(x.ped.em)>=(+cfg(c).avisaNota||3)){ t='Pedimos a nota há '+diasDesde(x.ped.em)+' dias e ainda não chegou'; tom='warn'; }
      else if(st==='fechado'&&prontos.length){ t='Valor fechado · falta pedir a nota'; tom='info'; }
      if(t) pv.push({o,t,tom}); });
    /* painel (11/11, "acho que aqui pode ser um dashboard"): números, horas por dia, por empresa e etapas */
    const hj=hojeS(), dUt=diasDe(p).filter(d=>{ const w=new Date(d+'T12:00:00').getDay(); return w>0&&w<6&&!ferP(d); }), dPas=dUt.filter(d=>d<hj);
    const prev=cedo&&dPas.length&&dPas.length<dUt.length?totV*dUt.length/dPas.length:null;
    const nDiasConf=rsF.reduce((t,o)=>t+(!o.x.st?o.r.alerta||0:0),0);
    const escP=o=>o.r.fixo?0:contaDia(o.r.h.ini,o.r.h.fim,o.r.h).m;
    const hDia=diasDe(p).map(d=>{ let m=0,esp=0,al=0; rsF.forEach(o=>{ const z=(o.r.dias||[]).find(y=>y.d===d); if(!z) return; m+=z.m; if(z.esc&&!z.fer&&!z.aus) esp+=escP(o); if(kOfDia(z).includes('conf')&&!o.x.st) al++; }); return {d,w:new Date(d+'T12:00:00').getDay(),m,esp,al,fut:d>=hj}; });
    const hMax=Math.max(1,...hDia.map(x=>Math.max(x.m,x.esp)));
    const DS=['dom','seg','ter','qua','qui','sex','sáb'];
    const gHoras=`<div class="pjp-hb" role="img" aria-label="Horas trabalhadas por dia, todos os PJ">${hDia.map((x,k)=>`<div class="pjp-hbc ${x.w===0||x.w===6?'fds':''} ${x.fut?'fut':''} ${x.al?'al':''}" title="${DS[x.w]} ${brc(x.d)}: ${x.fut&&!x.m?'ainda não chegou':hTxt(x.m)}${x.esp?' · esperado '+hTxt(x.esp):''}${x.al?' · '+x.al+' PJ para conferir':''}">${x.esp?`<b class="pjp-hbe" style="bottom:calc(${Math.round(x.esp/hMax*100)}% + 17px)"></b>`:''}
        <span class="pjp-hbv">${x.m&&k===hDia.findIndex(y=>y.m===hMax)?esc(hTxt(x.m)):''}</span><i style="height:${x.m?Math.max(3,Math.round(x.m/hMax*100)):0}%"></i><small>${+x.d.slice(8,10)}</small></div>`).join('')}</div>
      <table class="pjp-sr"><caption>Horas por dia</caption><tr><th>Dia</th><th>Horas</th></tr>${hDia.map(x=>`<tr><td>${brc(x.d)}</td><td>${hTxt(x.m)}</td></tr>`).join('')}</table>`;
    const porEmp=[...new Set(rsF.map(o=>String(o.f.empresa||'').toUpperCase()))].map(e=>{ const ys=rsF.filter(o=>String(o.f.empresa||'').toUpperCase()===e); return {e,n:ys.length,v:soma(ys),m:ys.reduce((t,o)=>t+o.r.min,0)}; }).sort((a,b)=>b.v-a.v);
    const eMax=Math.max(1,...porEmp.map(x=>x.v));
    const gEmp=porEmp.length?porEmp.map(x=>`<div class="pjp-eb"><div class="pjp-ebt"><b>${esc(x.e||'Sem empresa')}</b><span class="n">${R$(x.v)}</span></div><div class="pjp-ebb"><i style="width:${Math.max(2,Math.round(x.v/eMax*100))}%"></i></div><small>${x.n} PJ · ${hTxt(x.m)}</small></div>`).join(''):'<div class="pjp-kvz">Nenhum PJ</div>';
    const etN=COLS.map((cl,i)=>({i,t:cl.t,n:rsF.filter(o=>cl.st.includes(o.x.st||'')).length}));
    const gEt=rsF.length?`<div class="pjp-etb" role="img" aria-label="${esc(etN.map(x=>x.t+': '+x.n).join(', '))}">${etN.filter(x=>x.n).map(x=>`<i class="k${x.i}" style="flex:${x.n}" title="${esc(x.t)}: ${x.n}"></i>`).join('')}</div>
      <div class="pjp-etl">${etN.map(x=>`<button type="button" class="pjp-etx" data-act="pjp-col" data-v="${x.i}"><i class="k${x.i}"></i><span>${esc(x.t)}</span><b>${x.n}</b></button>`).join('')}</div>`:'<div class="pjp-kvz">Nenhum PJ</div>';
    /* 11/11 (2) últimas quinzenas por empresa: 1 leitura das 6 quinzenas, guardada na memória */
    const hPids=(()=>{ const a=[pid]; for(let n=1;n<6;n++) a.unshift(perMove(a[0],-1)); return a; })(), hK=hPids.join(',');
    if(!J.hist) J.hist={}; if(!J.hist[hK]){ J.hist[hK]={carr:true}; c.P.db().collection(COL).where('pid','in',hPids.slice(0,-1)).get().then(sn=>{ const o={}; sn.docs.forEach(d=>{ const x=d.data(); o[x.pid]=x; }); J.hist[hK]={o}; c.P.rerender(); }).catch(()=>{ J.hist[hK]={o:{},erro:1}; c.P.rerender(); }); }
    const HD=J.hist[hK], empOf=fid=>{ const f=(c.R.func||[]).find(y=>y._id===fid); return f?String(f.empresa||'').toUpperCase()||'OUTRA':'OUTRA'; };
    const hCols=hPids.map(k=>{ const q=perDe(k), por={}; let n=0;
      if(k===pid){ rsF.forEach(o=>{ const e=String(o.f.empresa||'').toUpperCase()||'OUTRA'; por[e]=(por[e]||0)+o.r.valor; }); n=rsF.length; }
      else { const d=HD&&HD.o&&HD.o[k]; Object.entries((d&&d.pes)||{}).forEach(([fid,x])=>{ if(x&&x.fech&&x.st){ const e=empOf(fid); por[e]=(por[e]||0)+(+x.fech.valor||0); n++; } }); }
      return {k,q,por,n,tot:Object.values(por).reduce((a,b)=>a+b,0),atual:k===pid}; });
    const hEmps=[...new Set(hCols.flatMap(x=>Object.keys(x.por)))].sort((a,b)=>a==='OUTRA'?1:b==='OUTRA'?-1:a.localeCompare(b));
    const hMaxV=Math.max(1,...hCols.map(x=>x.tot)), EC=['e0','e1','e2','e3'];
    const gHist=HD&&HD.carr?'<div class="pjp-kvz">Carregando as quinzenas…</div>':`<div class="pjp-qb2" role="img" aria-label="Total pago por quinzena">${hCols.map(x=>`<div class="pjp-qc ${x.atual?'at':''}" title="${esc(x.q.curto)}: ${R$(x.tot)}${x.n?' · '+x.n+' PJ':''}${x.atual&&cedo?' (até agora)':''}${hEmps.map(e=>x.por[e]?' · '+e+' '+R$(x.por[e]):'').join('')}">
        <span class="pjp-qv2 n">${x.tot?esc(R$(x.tot).replace(/,\d\d$/,'')):'—'}</span><div class="pjp-qst" style="height:${x.tot?Math.max(3,Math.round(x.tot/hMaxV*100)):0}%">${hEmps.map((e,i)=>x.por[e]?`<i class="${EC[i%4]}" style="flex:${x.por[e]}"></i>`:'').join('')}</div><small>${esc(x.q.curto.replace(/\/\d{4}/g,''))}${x.atual?'<br>'+(cedo?'até agora':'esta'):''}</small></div>`).join('')}</div>
      <div class="pjp-lg">${hEmps.map((e,i)=>`<span><i class="${EC[i%4]}"></i>${esc(e==='OUTRA'?'Outra':e)}</span>`).join('')}<span class="pjp-lgs">quinzenas passadas: só os valores fechados</span></div>${(()=>{ const fz=hCols.filter(x=>!x.atual&&x.tot>0); return fz.length?`<div class="pjp-hmed">Média das quinzenas fechadas: <b class="n">${R$(fz.reduce((a,x)=>a+x.tot,0)/fz.length)}</b> · ${fz.length} quinzena${fz.length>1?'s':''}</div>`:''; })()}`;
    /* 11/11 (3) quem mais trabalhou: 5 com mais horas, com a passada */
    const top=rsF.filter(o=>o.r.min>0).sort((a,b)=>b.r.min-a.r.min).slice(0,5), tMax=Math.max(1,...top.map(o=>o.r.min));
    const gTop=top.length?top.map(o=>{ const xa=DA&&DA.pes&&DA.pes[o.f._id], am=xa&&xa.fech?+xa.fech.min||0:null;
        return `<button type="button" class="pjp-tp" data-act="pjp-ab" ${fa(o)}><span class="pjp-tpn">${ini(o)}<b>${esc(nm(o))}</b><span class="n">${hTxt(o.r.min)}</span></span><span class="pjp-ebb"><i style="width:${Math.max(2,Math.round(o.r.min/tMax*100))}%"></i></span><small>${esc(String(o.f.empresa||'').toUpperCase())}${am!=null?' · quinzena passada '+hTxt(am):''}</small></button>`; }).join('')
      :'<div class="pjp-kvz">Ninguém com horas ainda</div>';
    const pvLin=({o,t,tom})=>`<div class="pjp-pvi"><span>${ini(o)}</span><div class="pjp-pvt"><button class="pjp-nm" data-act="pjp-ab" ${fa(o)}>${esc(nm(o))}</button><small class="pjp-pvm ${tom}">${esc(t)}</small></div><div class="pjp-qa">${cedo&&!(o.x.st)?btn('pjp-ab','Ver os dias',fa(o)):acoes(c,pid,o.f,o.x,o.r)}</div></div>`;
    const PVG=[['crit','Falta informação','sem isso não dá para fechar'],['warn','Para conferir','dias, uniforme, horário ou nota'],['info','Andamento','próximos passos da nota e do pagamento']];
    const pvH=pv.length?PVG.map(([k,t,sub])=>{ const ys=pv.filter(x=>(x.tom||'info')===k); return ys.length?`<div class="pjp-pvg ${k}"><div class="pjp-pvgh"><i></i><b>${t}</b><span>${ys.length}</span><small>${sub}</small></div>${ys.map(pvLin).join('')}</div>`:''; }).join('')
      :`<div class="pjp-pvok">${U?U.ic('ok',18):''} Nada esperando por você agora.</div>`;
    const dadosOk=!!(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes]);
    const dias=dadosOk?Object.keys(window.RHAlmoco._A.dados[p.mes].dias||{}).filter(d=>d>=p.de&&d<=p.ate).sort():[];
    const av=(t,tom)=>U?U.aviso({tom:tom||'warn',txt:t}):`<div class="pjp-av">${esc(t)}</div>`;
    const avFid=!dadosOk?av('Carregando o Face ID do mês…','info'):!dias.length?av('Ainda não tem Face ID importado de '+p.curto+'. Importe o CSV em Almoço/café (ou espere o robô do Face ID).')
      :dias[dias.length-1]<p.ate&&p.ate<c.P.hojeStr()&&diasDe(p).some(d=>d>dias[dias.length-1]&&![0,6].includes(new Date(d+'T12:00:00').getDay()))?av('O Face ID importado vai até '+brc(dias[dias.length-1])+'; a quinzena vai até '+brc(p.ate)+'. Importe o resto antes de fechar.'):'';
    /* 3) quadros por etapa */
    const quadros=`<div class="pjp-kb">${COLS.map((cl,i)=>{ const ys=rsF.filter(o=>cl.st.includes(o.x.st||''));
      return `<div class="pjp-kc k${i} ${col===i?'on':''}"><button type="button" class="pjp-kh" data-act="pjp-col" data-v="${i}" aria-pressed="${col===i}" title="Mostrar só esta etapa na lista"><b>${esc(cl.t)}</b><span>${ys.length}</span><em class="n">${ys.length?R$(soma(ys)):''}</em></button>
        ${ys.length?ys.map(o=>`<button type="button" class="pjp-kcard" data-act="pjp-ab" ${fa(o)}>${ini(o)}<span class="pjp-kn"><b>${esc(nm(o))}</b><small>${esc(String(o.f.empresa||'').toUpperCase())}${o.r.fixo?' · valor fixo':' · '+hTxt(o.r.min)}</small><span class="pjp-kv n">${R$(o.r.valor)}</span>${situ(c,o.x,o.r,o.f).replace(/<span class="pjp-pg"[\s\S]*$/,'')}</span></button>`).join(''):'<div class="pjp-kvz">Ninguém aqui</div>'}</div>`; }).join('')}</div>`;
    /* 4) lista (detalhe) */
    const linhas=rs.map(({f,x,r})=>{ const st=x.st||'', o={f,x,r};
      return `<tr class="${st==='pago'?'feito':''} ${J.ab===f._id?'aberto':''}"><td class="pjp-tn"><div class="pjp-pes">${U?U.ini(nm(o)):''}<div><button class="pjp-nm" data-act="pjp-ab" ${fa(o)} aria-haspopup="dialog">${esc(nm(o))}</button><small>${esc([String(f.empresa||'').toUpperCase(),f.setor].filter(Boolean).join(' · '))}</small></div></div></td>
        <td class="pjp-st" data-r="Situação">${situ(c,x,r,f)}</td>
        <td class="n pjp-tt" data-r="Total a pagar"><b>${R$(r.valor)}</b><small>${r.fixo?'valor fixo':n2(hDec(r.min))+' h · '+hTxt(r.min)}${r.desc?' · desconto '+R$(r.desc):''}</small>${antTxt(r)}</td>
        <td class="pjp-qa">${acoes(c,pid,f,x,r)}</td></tr>`; }).join('');
    const filtros=J.emp||J.set||J.conf||J.q||col>=0;
    const vazio=!xs.length?['Nenhum PJ ativo','Cadastre em Funcionários as pessoas com vínculo PJ.']:col>=0&&rsF.length?['Ninguém nesta etapa','Toque em "ver todos" para a lista inteira.']:['Nenhum PJ com esse filtro','Mude a busca ou toque em "Limpar filtros".'];
    const FI=fidInfo(c,p), icn=(n,t)=>U?U.ic(n,t||18):'', aba=J.aba||'pv';
    const fidT=FI?[FI.sub,FI.ultTxt+(FI.imp&&FI.robo?' · último CSV '+hm(FI.imp.em):'')].join(' · '):'';
    const MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const pD=+p.de.slice(8,10), pA=+p.ate.slice(8,10), pM=MES[+p.mes.slice(5,7)-1], pY=p.mes.slice(0,4), ehMes=cfg(c).modo==='mes', q2=/-2$/.test(pid);
    const perOps=(()=>{ let k=perAtual(c); for(let n=0;n<2;n++) k=perMove(k,1); const out=[]; for(let n=0;n<26;n++){ out.push(k); k=perMove(k,-1); } if(!out.includes(pid)) out.push(pid); return out; })();
    const perNome=k=>{ const q=perDe(k), mm=MES[+q.mes.slice(5,7)-1], dd=+q.de.slice(8,10), aa=+q.ate.slice(8,10); return ehMes?mm+' de '+q.mes.slice(0,4):dd+' a '+aa+' de '+mm+' de '+q.mes.slice(0,4); };
    const quin=`<div class="pjp-q" aria-label="Período ${esc(p.txt)}"><button class="pjp-qb" data-act="pjp-per" data-v="-1" aria-label="${ehMes?'Mês':'Quinzena'} anterior">‹</button>
          <div class="pjp-qm"><select class="pjp-qsel" data-pjp-qsel aria-label="Escolher o período">${perOps.map(k=>`<option value="${k}" ${k===pid?'selected':''}>${esc(perNome(k))}${k===perAtual(c)?' · atual':''}</option>`).join('')}</select><span class="pjp-qi" aria-hidden="true">${U?U.ic('calendario',16):''}</span><div><small>${ehMes?'Mês':(q2?'2ª quinzena':'1ª quinzena')}${ehAt?' · atual':''}</small><b>${ehMes?esc(pM)+' de '+pY:pD+' a '+pA+' de '+esc(pM)}</b>${ehAt?'':`<button class="pjp-qv" data-act="pjp-per" data-v="0" type="button">voltar para a atual</button>`}</div></div>
          <button class="pjp-qb" data-act="pjp-per" data-v="1" aria-label="${ehMes?'Próximo mês':'Próxima quinzena'}">›</button></div>`;
    const barra=`<div class="pjp-bar">
        ${FI?`<div class="pjp-fid ${FI.tom}" role="status" title="${esc(fidT)}"><span class="pjp-fdot" aria-hidden="true"></span><b>${esc(FI.tit)}</b>${FI.curto?`<small>${esc(FI.curto)}</small>`:''}<button class="lnk" data-act="pjp-fidir" type="button">ver</button></div>`:''}
        ${ptoPil(c,p)}
        </div>`;
    const topoAc=`<div class="pjp-tbt">${btn('pjp-xls','Excel')}${btn('pjp-pdf','PDF')}<button class="btn sec" data-act="pjp-cfg" type="button">${U?U.ic('ajuste',15):''} Parâmetros</button></div>${quin}`;
    return css+css3+c.topo('Pagamento dos PJ','Horas de cada PJ pelo Face ID, o valor a pagar e a nota fiscal.',topoAc,'RH · PAGAMENTO DOS PJ')+
      `<div class="pjp">${barra}${avFid}
      <div class="pjp-abas" role="tablist" aria-label="Partes da tela">${[['pv','Precisa de você',pv.length,'alerta'],['kb','Onde cada PJ está',null,'grid'],['lista','Todos os PJ',rsF.length,'lista']].map(([k,t,n,ic])=>`<button type="button" role="tab" class="pjp-aba" data-act="pjp-aba" data-v="${k}" aria-selected="${aba===k}">${icn(ic,18)}<span>${t}</span>${n!=null?`<b class="${k==='pv'&&n?'al':''}">${n}</b>`:''}</button>`).join('')}</div>
      ${aba==='pv'?`

      <div class="pjp-kpi">
        ${(()=>{ const ant=hCols[hCols.length-2], antV=ant&&ant.tot>0?ant.tot:null, antM=DA&&DA.pes?Object.values(DA.pes).reduce((a,x)=>a+(x&&x.fech&&x.st?+x.fech.min||0:0),0):0;
          const seta=(v,a,fmt)=>{ if(a==null||!(a>0)) return ''; if(cedo) return `<small class="pjp-kd">passada: ${fmt(a)}</small>`; const d=v-a, pc=Math.round(Math.abs(d)/a*100); return `<small class="pjp-kd ${d>0?'up':d<0?'dn':''}">${d>0?'▲':d<0?'▼':'='} ${pc}% vs passada</small>`; };
          return `<div class="pjp-tl"><span>${icn('grafico',16)}Total da quinzena${cedo?' até agora':''}</span><b class="n">${R$(totV)}</b>${prev?`<small>se continuar assim, ${R$(prev)} até ${brc(p.ate)}</small>`:`<small>${rsF.length} PJ</small>`}${seta(totV,antV,R$)}</div>
        <div class="pjp-tl"><span>${icn('check',16)}Já pago</span><b class="n">${R$(pagoV)}</b><small>${rsF.filter(o=>o.x.st==='pago').length} PJ</small></div>
        <div class="pjp-tl"><span>${icn('relogio',16)}Falta pagar</span><b class="n">${R$(totV-pagoV)}</b><small>${rsF.filter(o=>o.x.st!=='pago').length} PJ</small></div>
        <div class="pjp-tl"><span>${icn('equipe',16)}Horas trabalhadas</span><b class="n">${hTxt(totM)}</b><small>${cedo?dPas.length+' de '+dUt.length+' dias úteis':dUt.length+' dias úteis'}</small>${seta(totM,antM||null,hTxt)}</div>
        <div class="pjp-tl ${nDiasConf?'pede':''}"><span>${icn('lista',16)}Dias para conferir</span><b class="n">${nDiasConf}</b><small>${nDiasConf?nConf+' PJ · toque em Próximo para conferir na folha':'nada para conferir'}</small></div>`; })()}
      </div>
      <div class="pjp-dash">
        <section class="pjp-cx pjp-dw"><div class="pjp-ch"><h3>Horas por dia</h3><small>todos os PJ juntos</small></div><div class="pjp-db">${gHoras}<div class="pjp-lg"><span><i class="hb"></i>trabalhado</span><span><i class="hal"></i>dia com algo para conferir</span><span><i class="hes"></i>esperado pela escala</span></div></div></section>
        <section class="pjp-cx"><div class="pjp-ch"><h3>Por empresa</h3></div><div class="pjp-db">${gEmp}</div></section>
        <section class="pjp-cx"><div class="pjp-ch"><h3>Em que etapa</h3></div><div class="pjp-db">${gEt}</div></section>
      </div>
      <div class="pjp-dash pjp-dash2">
        <section class="pjp-cx"><div class="pjp-ch"><h3>Últimas quinzenas</h3><small>total por empresa</small></div><div class="pjp-db">${gHist}</div></section>
        <section class="pjp-cx"><div class="pjp-ch"><h3>Quem mais trabalhou</h3><small>horas nesta quinzena</small></div><div class="pjp-db">${gTop}</div></section>
      </div>
      <section class="pjp-cx"><div class="pjp-ch"><h3>Precisa de você</h3>${pv.length?`<span class="pjp-ct">${pv.length}</span>`:''}${pp.ok?'':`<div class="pjp-ppl" title="${esc(pp.s)}"><small>${esc(pp.t)}</small>${pp.b}</div>`}</div>${pvH}</section>`:''}${aba==='kb'?`
      <section><div class="pjp-sh"><h3>Onde cada PJ está</h3><small>toque no título de uma etapa para ver a lista dela; toque na pessoa para ver os dias</small></div>${quadros}</section>`:''}${aba==='lista'?`
      <section class="pjp-lc">
        <div class="pjp-lt1"><h3>${col<0?'Todos os PJ':esc(COLS[col].t)}</h3><small>${rs.length} PJ · ${R$(soma(rs))}</small>${col>=0?lnk('pjp-col','ver todos','data-v="-1"'):''}<span class="pjp-sp"></span>${cwBotao(c,pid,emps)}${btn('pjp-fin','E-mail ao financeiro')}</div>
        <div class="pjp-lt2"><label class="pjp-busca"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="pjp-q" type="search" placeholder="Buscar PJ, setor ou empresa" aria-label="Buscar PJ" value="${esc(J.q)}"></label>
          <select id="pjp-emp" aria-label="Empresa"><option value="">Todas as empresas</option>${emps.map(e=>`<option value="${esc(e)}" ${J.emp===e?'selected':''}>${esc(e)}</option>`).join('')}</select>
          ${sets.length?`<select id="pjp-set" aria-label="Setor"><option value="">Todos os setores</option>${sets.map(e=>`<option ${J.set===e?'selected':''}>${esc(e)}</option>`).join('')}</select>`:''}
          ${nConf?`<button class="pjp-chip" data-act="pjp-confx" aria-pressed="${!!J.conf}">Só com dia para conferir<b>${nConf}</b></button>`:''}
          ${filtros?`<button class="lnk" data-act="pjp-flimpa">Limpar filtros</button>`:''}</div>
        ${rs.length?`<div class="pjp-tw"><table class="pjp-t"><thead><tr><th>PJ <small>· toque no nome para ver os dias</small></th><th>Situação</th><th class="n">Total a pagar</th><th class="pjp-qa"><span class="pjp-sr">Ações</span></th></tr></thead><tbody>${linhas}</tbody>
          <tfoot><tr><td>Total · ${rs.length} PJ</td><td></td><td class="n pjp-tt" data-r="Total a pagar">${R$(soma(rs))}</td><td></td></tr></tfoot></table></div>`
          :(U?U.vazio({tit:vazio[0],txt:vazio[1]}):`<div class="empty">${esc(vazio[0])}</div>`)}
      </section>`:''}

      </div>`+(J._rsT=rsF,'')+gaveta(c,pid,rsT)+modal(c); }
  const css3=`<style id="pjp-css3">
  .pjp{gap:18px}.pjp .n{font-variant-numeric:tabular-nums;white-space:nowrap}
  .pjp-nav{background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:14px;padding:5px 8px}
  .pjp-pp{display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:var(--teal-strong);color:#fff;border-radius:18px;padding:22px 26px}
  .pjp-pp>div{flex:1 1 320px;min-width:0}.pjp-pp span{font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.7)}
  .pjp-pp h3{margin:4px 0 2px;font-size:22px;font-weight:600;letter-spacing:-.01em;color:#fff}.pjp-pp p{margin:0;color:rgba(255,255,255,.85);font-size:14.5px}
  .pjp-pp .btn{background:#fff!important;color:var(--teal-strong)!important;border-color:#fff!important;height:44px!important;padding:0 20px!important;font-size:15px!important}
  .pjp-pp.ok{background:var(--ok-ink,#2F6047)}
  .pjp-g2{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px;align-items:start}
  @media(max-width:1000px){.pjp-g2{grid-template-columns:1fr}}
  .pjp-cx{background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:16px;box-shadow:var(--shadow);min-width:0}
  .pjp-ch{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line,#E1E7EB)}
  .pjp-ch h3,.pjp-sh h3,.pjp-lt1 h3{margin:0;font-size:16px;font-weight:600}
  .pjp-ct{font-size:12.5px;font-weight:600;background:var(--crit-tint,#F6E3E1);color:var(--crit-ink,#8E3A33);border-radius:999px;padding:1px 9px}
  .pjp-pvi{display:flex;align-items:center;gap:12px;padding:12px 18px;border-top:1px solid var(--line,#E1E7EB);flex-wrap:wrap}.pjp-pvi:first-of-type{border-top:0}
  .pjp-pvt{flex:1 1 200px;min-width:0;display:flex;flex-direction:column;align-items:flex-start}
  .pjp-pvm{font-size:13.5px;margin-top:2px;color:var(--muted)}.pjp-pvm.crit{color:var(--crit-ink,#8E3A33)}.pjp-pvm.warn{color:var(--warn-ink,#7A5310)}.pjp-pvm.info{color:var(--teal-strong)}
  .pjp-pvi .pjp-qa{min-width:0}
  .pjp-pvok{display:flex;align-items:center;gap:8px;padding:18px;color:var(--ok-ink,#2F6047);font-size:14.5px}
  .pjp-rs{margin:0;padding:8px 18px}.pjp-rs div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line,#E1E7EB);font-size:14.5px}.pjp-rs div:last-child{border-bottom:0}
  .pjp-rs dt{color:var(--muted)}.pjp-rs dd{margin:0;font-weight:600}.pjp-rs div:first-child dd{font-size:18px}
  .pjp-rsb{display:flex;gap:8px;flex-wrap:wrap;padding:4px 18px 16px}
  .pjp-sh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}.pjp-sh small{color:var(--muted);font-size:13px}
  .pjp-kb{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start}
  @media(max-width:1100px){.pjp-kb{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.pjp-kb{grid-template-columns:1fr}}
  .pjp-kc{background:var(--surface-2,#EEF2F5);border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0;border:1px solid transparent}
  .pjp-kc.on{border-color:var(--teal-strong);background:var(--teal-tint,#E2ECF1)}
  .pjp-kh{display:flex;align-items:baseline;gap:8px;border:0;background:none;font:inherit;color:inherit;cursor:pointer;padding:4px 6px;text-align:left;border-radius:8px}
  .pjp-kh b{font-size:14.5px;font-weight:600}.pjp-kh span{font-size:13px;color:var(--muted);font-weight:600}.pjp-kh em{margin-left:auto;font-style:normal;font-size:13px;color:var(--muted)}
  .pjp-kh:hover b{text-decoration:underline;text-underline-offset:3px}
  .pjp-kcard{display:flex;align-items:flex-start;gap:10px;background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:12px;padding:10px 12px;font:inherit;color:inherit;text-align:left;cursor:pointer;width:100%}
  .pjp-kcard:hover{border-color:var(--teal)}.pjp-kcard .pc-ini{margin-top:2px}
  .pjp-kn{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:3px}.pjp-kn b{font-weight:600;font-size:14px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pjp-kn small{font-size:12px;color:var(--muted)}
  .pjp-kn .pjp-sl{font-size:11.5px;padding:2px 8px;max-width:100%;white-space:normal;line-height:1.3}
  .pjp-kv{font-weight:600;font-size:15px;margin-top:2px}
  .pjp-kvz{font-size:13px;color:var(--muted);text-align:center;padding:12px 6px;border:1px dashed var(--line,#E1E7EB);border-radius:12px}
  .pjp-kc .pjp-kcard:focus-visible,.pjp-kh:focus-visible{outline:3px solid #9FBFCF;outline-offset:1px}
  .pjp-lc{background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}
  .pjp-lt1{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:16px 18px 10px}.pjp-lt1 small{color:var(--muted);font-size:13px}.pjp-lt1 .lnk{display:inline;margin:0;font-size:13px;background:none;border:0;color:var(--teal);cursor:pointer}
  .pjp-lt2{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 18px 14px}
  .pjp-chip{border:1px solid var(--line,#E1E7EB);background:var(--surface);color:var(--muted);border-radius:999px;padding:6px 13px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
  .pjp-chip b{font-weight:600;opacity:.75}.pjp-chip[aria-pressed="true"]{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}
  .pjp-busca{display:flex;align-items:center;gap:8px;height:38px;border:1px solid var(--line,#E1E7EB);border-radius:10px;padding:0 10px;background:var(--surface);color:var(--muted);min-width:240px}
  .pjp-busca input{border:0;outline:0;background:none;font:inherit;color:var(--ink,inherit);height:100%;flex:1;min-width:0}
  .pjp-busca:focus-within,.pjp-chip:focus-visible,.pjp-lt2 select:focus-visible{outline:3px solid #9FBFCF;outline-offset:1px}
  .pjp-lt2 select{height:38px;border:1px solid var(--line,#E1E7EB);border-radius:10px;padding:0 10px;background:var(--surface);color:inherit;font:inherit;font-size:13.5px}
  .pjp-lt2 .lnk{background:none;border:0;color:var(--teal);cursor:pointer;font:inherit;font-size:13px;padding:0 4px}
  .pjp-lc .pjp-tw{border-top:1px solid var(--line,#E1E7EB)}
  .pjp-lc .pjp-t{font-size:15px}.pjp-lc .pjp-t thead th{background:var(--surface-2,#F6F8FA);padding:10px 12px;border-bottom:1px solid var(--line,#E1E7EB);font-weight:600}
  .pjp-lc .pjp-t thead th small{display:inline;font-weight:400}
  .pjp-lc .pjp-t td{padding:15px 12px;vertical-align:middle}.pjp-lc .pjp-t tbody tr:hover>td{background:var(--surface-2,#F6F8FA)}
  .pjp-lc .pjp-t tr>:first-child{padding-left:18px}.pjp-lc .pjp-t tr>:last-child{padding-right:18px}
  .pjp-lc .pjp-t tfoot td{background:var(--surface-2,#F6F8FA);padding:12px}
  .pjp-lc .pjp-tt b{font-size:16px}.pjp-lc .pjp-tt small{display:block;font-size:12.5px;color:var(--muted);font-weight:400}
  .pjp-pes{display:flex;align-items:center;gap:12px}.pjp-pes .pc-ini{width:40px;height:40px}
  .pjp-nm::after{content:none}
  .pjp-sl{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;padding:3px 10px;border-radius:999px;white-space:nowrap;background:var(--surface-2,#EEF2F5);color:var(--muted)}
  .pjp-sl+.pjp-sl{margin-left:4px}.pjp-sl::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
  .pjp-sl.ok{background:var(--ok-tint,#E3F0E8);color:var(--ok-ink,#2F6047)}.pjp-sl.warn{background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310)}.pjp-sl.crit{background:var(--crit-tint,#F6E3E1);color:var(--crit-ink,#8E3A33)}.pjp-sl.info{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)}
  .pjp-pg{display:flex;gap:3px;margin-top:7px}.pjp-pg i{width:14px;height:3px;border-radius:2px;background:var(--line,#E1E7EB)}.pjp-pg i.f{background:var(--teal)}.pjp-pg i.a{background:var(--teal);opacity:.45}
  .pjp-qa{min-width:200px;text-align:right;white-space:nowrap}.pjp-qa .btn{height:36px;padding:0 14px;font-size:13.5px}
  .pjp-lks{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;margin-top:5px;font-size:12.5px;color:var(--muted)}.pjp-lks .lnk{display:inline!important;margin:0!important}
  .pjp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .pjp-lc .pc-vazio{margin:8px 18px 22px}
  /* cara de app (10/11): barra com a quinzena e o Face ID, cores por etapa, quadros de número */
  .pjp-ppl{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.pjp-ppl small{color:var(--muted);font-size:12.5px}
  .pjp-cwp{list-style:none;margin:6px 0 12px;padding:0 0 0 4px;display:flex;flex-direction:column;gap:2px}.pjp-cwp li{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:13.5px}
  .pjp-cwp li>i{width:22px;height:22px;border-radius:50%;border:2px solid var(--line,#D5DCE1);display:grid;place-items:center;font-style:normal;font-size:12px;flex:none}
  .pjp-cwp li.ok>i{background:var(--k3);border-color:var(--k3);color:#fff}.pjp-cwp li>div{flex:1;min-width:0}.pjp-cwp li small{display:block;color:var(--muted);font-size:12px}
  .pjp-dash.pjp-dash2{grid-template-columns:1fr 1fr;margin-top:0;align-items:start}
  .pjp-qb2{display:flex;align-items:flex-end;gap:10px;height:130px;padding-top:18px}.pjp-qc{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
  .pjp-qst{width:100%;max-width:46px;display:flex;flex-direction:column-reverse;gap:2px;border-radius:4px 4px 0 0;overflow:hidden}.pjp-qst i{display:block;width:100%;min-height:2px}
  .pjp-qc.at .pjp-qst{outline:2px solid var(--teal,#1F6F78);outline-offset:2px}.pjp-qc small{font-size:11px;color:var(--muted);margin-top:6px;text-align:center;line-height:1.25}
  .pjp-qv2{font-size:11.5px;font-weight:600;margin-bottom:4px;white-space:nowrap}
  .pjp .e0{background:#2B6CB0}.pjp .e1{background:#0F766E}.pjp .e2{background:#8A6BBE}.pjp .e3{background:#8A94A0}
  :root[data-theme="dark"] .pjp .e0{background:#7FB0E6}:root[data-theme="dark"] .pjp .e1{background:#5CC4B6}:root[data-theme="dark"] .pjp .e2{background:#B9A3E3}
  .pjp-lg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12.5px;align-items:center}.pjp-lg span{display:inline-flex;align-items:center;gap:6px}.pjp-lg i{width:10px;height:10px;border-radius:3px}.pjp-lgs{color:var(--muted);margin-left:auto}
  .pjp-tp{display:block;width:100%;text-align:left;border:0;background:none;padding:6px 6px 8px;border-radius:10px;font:inherit;color:inherit;cursor:pointer}.pjp-tp:hover{background:var(--surface-2,#F2F5F7)}
  .pjp-tpn{display:flex;align-items:center;gap:8px;font-size:13.5px}.pjp-tpn b{flex:1;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pjp-tpn .n{font-weight:600}
  .pjp-tp .pjp-ebb{display:block;margin:5px 0 3px}.pjp-tp small{color:var(--muted);font-size:12px}
  @media(max-width:1100px){.pjp-dash.pjp-dash2{grid-template-columns:1fr}}
  .pjp-kpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.pjp-kpi .pjp-tl{background:var(--surface,#fff);border:1px solid var(--line,#E1E7EB);padding:14px 16px;position:relative;overflow:hidden}
  .pjp-kpi .pjp-tl b{font-size:28px;font-weight:300;letter-spacing:-.02em;line-height:1.15;color:var(--ink,inherit)}.pjp-kpi .pjp-tl small{color:var(--muted);font-size:12px}
  .pjp-kpi .pjp-tl.pede{border-color:var(--k0)}.pjp-kpi .pjp-tl.pede::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--k0)}.pjp-kpi .pjp-tl.pede b{color:var(--k0);font-weight:400}
  .pjp-kd{font-weight:600}.pjp-kd.up{color:var(--k3)!important}.pjp-kd.dn{color:var(--crit,#B42318)!important}
  .pjp-hbc.al i{background:var(--k0)}.pjp-hbe{position:absolute;left:8%;right:8%;height:0;border-top:2px dotted var(--muted,#8A94A0);pointer-events:none}
  .pjp-lg i.hb{background:var(--teal,#1F6F78)}.pjp-lg i.hal{background:var(--k0)}.pjp-lg i.hes{height:0;border-top:2px dotted var(--muted,#8A94A0);border-radius:0;width:14px}
  .pjp-hmed{margin-top:8px;font-size:13px;color:var(--muted)}.pjp-hmed b{color:var(--ink,inherit);font-weight:600}
  .pjp-pvg{border-top:1px solid var(--line,#E1E7EB)}.pjp-pvg:first-child{border-top:0}.pjp-pvgh{display:flex;align-items:center;gap:8px;padding:10px 18px 4px;font-size:12.5px}
  .pjp-pvgh i{width:8px;height:8px;border-radius:50%;background:var(--muted)}.pjp-pvg.crit .pjp-pvgh i{background:var(--crit,#B42318)}.pjp-pvg.warn .pjp-pvgh i{background:var(--k0)}.pjp-pvg.info .pjp-pvgh i{background:var(--k1)}
  .pjp-pvgh b{text-transform:uppercase;letter-spacing:.05em;font-size:11.5px}.pjp-pvgh span{background:var(--surface-2,#EEF2F5);border-radius:10px;padding:0 7px;font-weight:600;font-size:11.5px}.pjp-pvgh small{color:var(--muted)}
  .pjp-pvg.crit .pjp-pvi{box-shadow:inset 3px 0 0 var(--crit,#B42318)}.pjp-pvg.warn .pjp-pvi{box-shadow:inset 3px 0 0 var(--k0)}
  .pjp-dash{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:12px 0}.pjp-db{padding:12px 16px 14px}.pjp-ch small{color:var(--muted);font-size:12px;margin-left:6px}
  .pjp-hb{display:flex;align-items:flex-end;gap:3px;height:150px;padding-top:16px}.pjp-hbc{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
  .pjp-hbc i{display:block;width:100%;max-width:26px;background:var(--teal,#1F6F78);border-radius:4px 4px 0 0}.pjp-hbc.fds i{opacity:.55}.pjp-hbc:hover i{filter:brightness(1.15)}
  .pjp-hbc small{font-size:10.5px;color:var(--muted);margin-top:4px}.pjp-hbc.fds small{opacity:.6}.pjp-hbc.fut small{opacity:.45}
  .pjp-hbc.fut::after{content:'';position:absolute;bottom:18px;left:15%;right:15%;border-bottom:2px dashed var(--line,#D5DCE1)}
  .pjp-hbv{position:absolute;top:-2px;font-size:11px;font-weight:600;white-space:nowrap}
  .pjp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .pjp-eb{margin-bottom:12px}.pjp-ebt{display:flex;justify-content:space-between;gap:8px;font-size:13.5px}.pjp-ebb{height:8px;background:var(--surface-2,#EEF2F5);border-radius:4px;margin:5px 0 3px;overflow:hidden}
  .pjp-ebb i{display:block;height:100%;background:var(--teal,#1F6F78);border-radius:4px}.pjp-eb small{color:var(--muted);font-size:12px}
  .pjp-etb{display:flex;gap:2px;height:14px;border-radius:7px;overflow:hidden;margin-bottom:12px}.pjp-etb i{display:block;height:100%}
  .pjp-etb .k0,.pjp-etx .k0{background:var(--k0)}.pjp-etb .k1,.pjp-etx .k1{background:var(--k1)}.pjp-etb .k2,.pjp-etx .k2{background:var(--k2)}.pjp-etb .k3,.pjp-etx .k3{background:var(--k3)}
  .pjp-etl{display:flex;flex-direction:column;gap:2px}.pjp-etx{display:flex;align-items:center;gap:8px;border:0;background:none;padding:5px 4px;border-radius:8px;font:inherit;font-size:13.5px;color:inherit;cursor:pointer;text-align:left}
  .pjp-etx:hover{background:var(--surface-2,#F2F5F7)}.pjp-etx i{width:10px;height:10px;border-radius:3px;flex:none}.pjp-etx span{flex:1}
  @media(max-width:1100px){.pjp-kpi{grid-template-columns:repeat(3,minmax(0,1fr))}.pjp-dash{grid-template-columns:1fr 1fr}.pjp-dw{grid-column:1/-1}}
  @media(max-width:700px){.pjp-kpi{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.pjp-kpi .pjp-tl{flex:0 0 72%;scroll-snap-align:start}.pjp-kpi .pjp-tl b{font-size:24px}.pjp-qb2{height:110px}.pjp-qc small{font-size:9.5px}.pjp-dash{grid-template-columns:1fr}.pjp-hb{height:120px}.pjp-hbv{display:none}}
  .pjp{--k0:#B7791F;--k0t:#FBF1DC;--k1:#2B6CB0;--k1t:#E3EDF8;--k2:#0F766E;--k2t:#DDF1EE;--k3:#2F7A4E;--k3t:#E3F0E8}
  :root[data-theme="dark"] .pjp{--k0:#E3B66A;--k0t:#3A2E17;--k1:#7FB0E6;--k1t:#1B2C40;--k2:#5CC4B6;--k2t:#15312E;--k3:#7FC79E;--k3t:#18332A}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .pjp{--k0:#E3B66A;--k0t:#3A2E17;--k1:#7FB0E6;--k1t:#1B2C40;--k2:#5CC4B6;--k2t:#15312E;--k3:#7FC79E;--k3t:#18332A}}
  .pjp-bar{display:flex;align-items:stretch;gap:12px;flex-wrap:wrap}
  .pjp-bar .pjp-nav{background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:14px;padding:6px 8px;box-shadow:var(--shadow)}
  .pjp-fid{flex:1 1 360px;display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:14px;padding:10px 16px;box-shadow:var(--shadow);min-width:0}
  .pjp-fid>div{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}.pjp-fid b{font-size:14.5px}.pjp-fid small{font-size:12.5px;color:var(--muted)}
  .pjp-fid .lnk{background:none;border:0;color:var(--teal);cursor:pointer;font:inherit;font-size:13px;white-space:nowrap}
  .pjp-fdot{width:12px;height:12px;border-radius:50%;flex:none;background:var(--ok,#3E7D5A);box-shadow:0 0 0 4px var(--ok-tint,#E3F0E8)}
  .pjp-fid.warn .pjp-fdot{background:var(--warn,#C28A1E);box-shadow:0 0 0 4px var(--warn-tint,#FBF1DC)}.pjp-fid.crit .pjp-fdot{background:var(--crit,#B5473F);box-shadow:0 0 0 4px var(--crit-tint,#F6E3E1)}
  .pjp-fid.crit{border-color:var(--crit,#B5473F)}.pjp-fid.crit b{color:var(--crit-ink,#8E3A33)}.pjp-fid.warn b{color:var(--warn-ink,#7A5310)}
  .pjp-pp{background:linear-gradient(135deg,var(--teal-strong),#1E5A75)}
  .pjp-ppi{width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.14);display:grid;place-items:center;flex:none;color:#fff}
  .pjp-rs{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px}
  .pjp-tl,.pjp-rs .pjp-tl{background:var(--surface-2,#F6F8FA);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;justify-content:flex-start;gap:4px;min-width:0;border-bottom:0}
  .pjp-tl span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--muted)}.pjp-tl b{font-size:18px;font-weight:600}
  .pjp-tl.pri{background:var(--teal-tint,#E2ECF1)}.pjp-tl.pri span,.pjp-tl.pri b{color:var(--teal-strong)}
  .pjp-tl.ok span{color:var(--ok-ink,#2F6047)}.pjp-tl.warn span{color:var(--warn-ink,#7A5310)}
  .pjp-kc{background:var(--surface);border:1px solid var(--line,#E1E7EB);border-top:4px solid var(--kc,var(--line));box-shadow:var(--shadow)}
  .pjp-kc.k0{--kc:var(--k0);--kt:var(--k0t)}.pjp-kc.k1{--kc:var(--k1);--kt:var(--k1t)}.pjp-kc.k2{--kc:var(--k2);--kt:var(--k2t)}.pjp-kc.k3{--kc:var(--k3);--kt:var(--k3t)}
  .pjp-kc .pjp-kh span{background:var(--kt);color:var(--kc);border-radius:999px;padding:0 8px;font-size:12.5px}
  .pjp-kc.on{background:var(--kt);border-color:var(--kc);border-top-width:4px}
  .pjp-kc .pjp-kcard{background:var(--surface-2,#F6F8FA);border-color:transparent}.pjp-kc .pjp-kcard:hover{border-color:var(--kc)}
  .pjp-kc .pjp-kcard .pc-ini{background:var(--kc)}
  /* lado a lado (10/11, "não ser um módulo abaixo do outro, teria que ser lado a lado"): à esquerda o que fazer, à direita onde cada PJ está e a lista */
  .pjp-2c{display:grid;grid-template-columns:minmax(330px,390px) minmax(0,1fr);gap:18px;align-items:start}
  .pjp-esq{display:flex;flex-direction:column;gap:16px;position:sticky;top:76px;min-width:0}
  .pjp-dir{display:flex;flex-direction:column;gap:18px;min-width:0}
  .pjp-esq .pjp-pp{flex-direction:column;align-items:stretch;gap:12px;padding:20px}.pjp-esq .pjp-pp>div{flex:none}.pjp-esq .pjp-pp .btn{width:100%;justify-content:center}
  .pjp-esq .pjp-ppi{width:40px;height:40px}.pjp-esq .pjp-pp h3{font-size:19px}
  .pjp-esq .pjp-pvi .pjp-qa{width:100%;text-align:left;min-width:0}.pjp-esq .pjp-pvi .pjp-lks{justify-content:flex-start}.pjp-esq .pjp-pvi .pjp-pvt{flex-basis:100%}
  .pjp-esq .pjp-pvi{position:relative;padding-left:58px}.pjp-esq .pjp-pvi>span:first-child{position:absolute;left:18px;top:13px}
  .pjp-dir .pjp-kb{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .pjp-dir .pjp-kh{flex-wrap:wrap;row-gap:0}.pjp-dir .pjp-kh b{font-size:13.5px}.pjp-dir .pjp-kh em{flex-basis:100%;margin-left:0;font-size:12.5px}
  .pjp-dir .pjp-kcard{padding:9px 10px;gap:8px}.pjp-dir .pjp-kcard .pc-ini{display:none}
  @media(max-width:1350px) and (min-width:1181px){.pjp-dir .pjp-kb{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:1180px){.pjp-dir .pjp-kb{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:560px){.pjp-dir .pjp-kb{grid-template-columns:1fr}}
  @media(max-width:1180px){.pjp-2c{grid-template-columns:1fr}.pjp-esq{position:static}.pjp-esq .pjp-pp{flex-direction:row;flex-wrap:wrap;align-items:center}.pjp-esq .pjp-pp .btn{width:auto}.pjp-esq .pjp-pp>div{flex:1 1 240px;min-width:0}}
  /* abas (10/11, "a primeira visão do Precisa de você e um botão lá em cima com Precisa de você / Onde cada PJ está / Todos os PJ") */
  .pjp-tbt{display:flex;gap:8px;flex-wrap:wrap}
  .pjp-abas{display:flex;gap:6px;background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:16px;padding:6px;box-shadow:var(--shadow);overflow-x:auto}
  .pjp-aba{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:10px;border:0;background:none;font:inherit;font-size:15px;font-weight:600;color:var(--muted);padding:12px 16px;border-radius:12px;cursor:pointer;white-space:nowrap;min-width:max-content}
  .pjp-aba:hover{background:var(--surface-2,#F6F8FA);color:var(--ink,inherit)}
  .pjp-aba[aria-selected="true"]{background:var(--teal-strong);color:#fff}
  .pjp-aba b{font-size:12.5px;background:var(--surface-2,#EEF2F5);color:var(--muted);border-radius:999px;padding:1px 9px}
  .pjp-aba b.al{background:var(--crit-tint,#F6E3E1);color:var(--crit-ink,#8E3A33)}
  .pjp-aba[aria-selected="true"] b{background:rgba(255,255,255,.2);color:#fff}
  .pjp-aba:focus-visible{outline:3px solid #9FBFCF;outline-offset:2px}
  @media(max-width:760px){.pjp-aba{flex:0 0 auto;font-size:14px;padding:10px 12px}}
  /* topo enxuto (10/11, "essa parte de cima ficou muito desproporcional; informativos muito grandes"): uma linha só */
  .pjp-bar{align-items:center;gap:10px}
  .pjp-bar .pjp-nav{display:flex;align-items:center;gap:4px;padding:3px;border-radius:12px;box-shadow:none}
  .pjp-bar .pjp-nav>div{min-width:0;display:flex;flex-direction:column;align-items:center;padding:0 6px;line-height:1.2}
  .pjp-bar .pjp-nav b{font-size:14.5px;font-weight:600;white-space:nowrap}.pjp-bar .pjp-nav .lnk{font-size:11.5px;margin:0;padding:0}
  .pjp-nb{width:30px;height:30px;border:0;border-radius:9px;background:var(--surface-2,#F1F4F6);color:var(--muted);font-size:17px;line-height:1;cursor:pointer}
  .pjp-nb:hover{color:var(--ink,inherit)}
  .pjp-bar .pjp-fid{flex:0 1 auto;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;box-shadow:none;min-width:0;max-width:100%;overflow:hidden}
  .pjp-bar .pjp-fid b{font-size:13px;white-space:nowrap}.pjp-bar .pjp-fid small{font-size:12.5px;white-space:nowrap}
  .pjp-bar .pjp-fid small::before{content:"·";margin-right:8px;color:var(--line,#C9D3DA)}
  .pjp-bar .pjp-fid .pjp-fu{overflow:hidden;text-overflow:ellipsis;min-width:0}
  .pjp-bar .pjp-fid .lnk{font-size:12.5px;padding:0 0 0 4px}
  .pjp-bar .pjp-fdot{width:9px;height:9px;box-shadow:0 0 0 3px var(--ok-tint,#E3F0E8)}
  .pjp-bar .pjp-fid.warn .pjp-fdot{box-shadow:0 0 0 3px var(--warn-tint,#FBF1DC)}.pjp-bar .pjp-fid.crit .pjp-fdot{box-shadow:0 0 0 3px var(--crit-tint,#F6E3E1)}
  .pjp-tbt .btn{height:34px!important;padding:0 12px!important;font-size:13px!important}
  .pjp-abas{padding:4px;border-radius:13px;box-shadow:none}.pjp-aba{padding:8px 14px;font-size:14px;border-radius:10px;gap:8px}.pjp-aba svg{width:16px;height:16px}
  .pjp-pp{padding:16px 20px;border-radius:16px;gap:16px}.pjp-pp h3{font-size:18px}.pjp-pp p{font-size:13.5px}.pjp-ppi{width:38px;height:38px;border-radius:11px}
  .pjp-pp .btn{height:40px!important;font-size:14px!important;padding:0 18px!important}
  .pjp-q{display:flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:14px;padding:4px;box-shadow:0 1px 2px rgba(20,40,60,.06)}
  .pjp-qm{position:relative;display:flex;align-items:center;gap:10px;padding:2px 10px 2px 6px;border-radius:10px;cursor:pointer}.pjp-qm:hover{background:var(--ground)}
  .pjp-par{max-width:760px}.pjp-par .pjp-box{margin-top:12px}.pjp-par h4{margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--teal-strong)}
  .pjp-par small{display:block;font-size:11.5px;color:var(--muted);font-weight:400;margin-top:3px}.pjp-par input:disabled{opacity:.5}
  .pjp-emps{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}.pjp-ck{display:flex!important;flex-direction:row!important;gap:8px;align-items:center;color:inherit!important;font-size:14px!important;font-weight:500!important}
  .pjp-emps .pjp-ck{border:1px solid var(--line,#E1E7EB);border-radius:10px;padding:7px 12px}.pjp-emps .pjp-ck small{display:inline;margin:0}.pjp-ck input{width:18px;height:18px}
  .pjp-mod .pjp-box input[type=checkbox]{width:18px;height:18px;padding:0;margin:0;flex:none;accent-color:var(--teal-strong)}
  .pjp-mod .pjp-box .pjp-lt label{display:flex;margin-top:0;color:inherit}.pjp-mod .pjp-box .pjp-lt label small{display:block}
  .pjp-par .pjp-emps .pjp-ck small{white-space:nowrap;color:var(--muted)}.pjp-mod .pjp-box label.pjp-ck{margin-top:10px}
  .pjp-par .pjp-lt{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:6px}.pjp-mod.pjp-par .pjp-box .pjp-lt label{border:1px solid var(--line,#E1E7EB);border-radius:10px;padding:9px 12px;gap:10px;align-items:flex-start;font-size:14px}.pjp-par .pjp-lt label span{display:flex;flex-direction:column}.pjp-par .pjp-lt input{margin-top:2px!important}
  .pjp-d .pg-hh .pg-fds{display:block;font-size:11px;font-weight:500;color:var(--warn-ink,#7A5310)}
  .pjp-av.pjp-hc{background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pjp-av.pjp-hc .btn{height:32px;font-size:13px}
  .pjp-d .pg-tag.pg-sp2{white-space:normal;line-height:1.35}
  .pjp-dfil{position:relative}
  .pjp-dk.pjp-prox{background:var(--teal-strong,#143F54);border-color:var(--teal-strong,#143F54);color:#fff;font-weight:600}
  .pjp-ant{display:block;font-size:11.5px;color:var(--muted);font-weight:500}.pjp-ant.up{color:var(--crit-ink,#8E3A33);font-weight:600}.pjp-ant.dn{color:var(--warn-ink,#7A5310);font-weight:600}
  .pjp-tot .pg-big .pjp-ant{color:rgba(255,255,255,.8)}
  .pjp-d .pg-tag.pg-aus{background:#E9F2FB;color:#1F4E7A}.pjp-d .pg-tag.pg-aus-fe{background:#EAF5EE;color:#2F6B47}
  .pjp-cd.au{background:#E9F2FB}.pjp-cd.au small{color:#1F4E7A;font-weight:600}.pjp-call i.au{background:#E9F2FB;border:1px solid #6B95BF}
  .pjp-calpop{position:absolute;top:calc(100% + 6px);left:0;z-index:20;width:min(380px,100%);border:1px solid var(--line,#E1E7EB);border-radius:14px;padding:12px 14px;background:var(--surface);box-shadow:0 12px 32px rgba(15,35,50,.18)}
  .pjp-calx{margin-left:auto;width:28px;height:28px;border:0;border-radius:8px;background:var(--ground);color:inherit;cursor:pointer}
  .pjp-dia{gap:6px}.pjp-dia svg{flex:none}.pjp-dia.on{padding:0;background:var(--teal-strong,#143F54);border-color:var(--teal-strong,#143F54);color:#fff;overflow:hidden}
  .pjp-dia.on button{border:0;background:none;color:inherit;font:inherit;font-size:13px;height:100%;padding:0 6px 0 11px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.pjp-dia.on .pjp-diax{padding:0 10px 0 6px;opacity:.85}
  .pjp-dia.on .pjp-dnv{padding:0 9px;font-size:17px;line-height:1}.pjp-dia.on .pjp-dnv:disabled{opacity:.35;cursor:default}.pjp-dia.on button:hover:not(:disabled){background:rgba(255,255,255,.14)}.pjp-car{font-size:10px;opacity:.8}
  .pjp-calh{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;flex-wrap:wrap}.pjp-calh b{font-size:14px}.pjp-calh span{font-size:12.5px;color:var(--muted)}
  .pjp-calg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
  .pjp-cwd{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;text-align:center;padding-bottom:2px}
  .pjp-cd{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:46px;border-radius:10px;border:1px solid transparent;background:var(--ground);color:inherit;font:inherit;cursor:pointer;padding:3px 2px;font-variant-numeric:tabular-nums}
  .pjp-cd b{font-size:15px;font-weight:600;line-height:1.1}.pjp-cd small{font-size:10.5px;color:var(--muted);white-space:nowrap}
  .pjp-cd.ok{background:var(--ok-tint,#E3F0E8)}.pjp-cd.ok small{color:var(--ok-ink,#2F6B47)}
  .pjp-cd.cf{background:var(--warn-tint,#FBF1DC)}.pjp-cd.cf small{color:var(--warn-ink,#7A5310);font-weight:600}
  .pjp-cd.sm{background:var(--crit-tint,#F6E3E1)}.pjp-cd.sm small{color:var(--crit-ink,#8E3A33);font-weight:600}
  .pjp-cd.fd,.pjp-cd.fu,.pjp-cd.nd{background:transparent;border-color:var(--line,#E1E7EB)}.pjp-cd.fd b,.pjp-cd.fu b{color:var(--muted);font-weight:500}
  .pjp-cd.fe{background:#EDE7F6}.pjp-cd.cr{box-shadow:inset 0 -3px 0 var(--teal,#2C6E8A)}
  .pjp-cd:hover{border-color:var(--teal,#2C6E8A)}.pjp-cd[aria-pressed=true]{border:2px solid var(--teal-strong,#143F54);box-shadow:0 0 0 3px rgba(20,63,84,.12)}
  .pjp-call{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;color:var(--muted)}.pjp-call i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px;background:var(--ground)}
  .pjp-call i.ok{background:var(--ok-tint,#E3F0E8);border:1px solid var(--ok,#2F7A4E)}.pjp-call i.cf{background:var(--warn-tint,#FBF1DC);border:1px solid var(--warn,#C28A1E)}.pjp-call i.sm{background:var(--crit-tint,#F6E3E1);border:1px solid var(--crit,#B5473F)}.pjp-call i.fd{background:transparent;border:1px solid var(--line,#C9D3DA)}
  @media(max-width:640px){.pjp-cd{min-height:40px}.pjp-cd small{display:none}}
  .pjp-dfil{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .pjp-dq{flex:1 1 240px;display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border:1px solid var(--line,#E1E7EB);border-radius:10px;background:var(--surface);color:var(--muted)}
  .pjp-dq:focus-within{outline:3px solid #9FBFCF;outline-offset:1px}.pjp-dq input{border:0;outline:0;background:none;flex:1;min-width:0;font:inherit;font-size:14px;color:var(--ink,inherit)}
  .pjp-dks{display:flex;gap:6px;flex-wrap:wrap}.pjp-dk{display:inline-flex;gap:6px;align-items:center;height:32px;padding:0 11px;border-radius:999px;border:1px solid var(--line,#E1E7EB);background:var(--surface);color:inherit;font:inherit;font-size:13px;cursor:pointer}
  .pjp-dk b{font-size:11.5px;font-weight:600;background:var(--ground);border-radius:999px;padding:0 7px}.pjp-dk[aria-pressed=true]{background:var(--teal-strong,#143F54);border-color:var(--teal-strong,#143F54);color:#fff}.pjp-dk[aria-pressed=true] b{background:rgba(255,255,255,.18);color:#fff}
  .pjp-dv{margin:0;padding:14px;border:1px dashed var(--line,#E1E7EB);border-radius:12px;color:var(--muted);text-align:center}
  .pjp-d .pg-es{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-variant-numeric:tabular-nums}
  .pjp-d .pg-e1{font-size:16px;font-weight:600}.pjp-d .pg-e1 small{font-size:11px;font-weight:500;color:var(--muted);margin-right:4px;text-transform:uppercase;letter-spacing:.04em}
  .pjp-d .pg-ar{color:var(--muted)}.pjp-d .pg-np{font-size:12px;color:var(--muted)}
  .pjp-d .pg-bar{position:relative;height:8px;border-radius:99px;background:var(--ground);margin:7px 0 4px;max-width:420px;overflow:hidden}
  .pjp-d .pg-bar i{position:absolute;top:0;bottom:0;border-radius:99px}.pjp-d .pg-bar i.hz{background:var(--line,#DCE3E8)}.pjp-d .pg-bar i.in{background:var(--teal,#2C6E8A)}
  .pjp-d .pg-bar i.al{background:repeating-linear-gradient(45deg,#fff 0 3px,var(--line,#C9D3DA) 3px 6px)}.pjp-d .pg-bar i.sx{background:var(--warn,#C28A1E)}.pjp-d .pg-bar i.sd{background:var(--crit,#B5473F)}.pjp-d .pg-bar i.so{background:#9FBFCF}
  .pjp-d details.pg-ps summary{cursor:pointer;font-size:12.5px;color:var(--teal);list-style:none;display:inline-block}.pjp-d details.pg-ps summary::-webkit-details-marker{display:none}.pjp-d details.pg-ps summary::before{content:'▸ '}.pjp-d details.pg-ps[open] summary::before{content:'▾ '}
  .pjp-d details.pg-ps .pjp-chips{margin-top:6px}.pjp-d .pg-c2{margin-top:4px}
  .pjp-d .pg-tag.pg-sp2{display:block;width:fit-content;max-width:100%;background:none;padding:0;font-weight:600}
  .pjp-g .pjp-av.pjp-avw{background:none;border:1px solid var(--line,#E1E7EB);border-left:3px solid var(--warn,#C28A1E);padding:8px 12px;font-size:13px}
  .pjp-qsel{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:16px}.pjp-qv{position:relative;z-index:1}
  .pjp-qm b::after{content:'▾';font-size:11px;color:var(--muted);margin-left:6px}
  .head .rh-acoes{align-self:flex-end}.head .rh-acoes .pjp-tbt{display:flex;gap:8px}
  .pjp-tbt .btn svg{vertical-align:-2px;margin-right:2px}
  .pjp-qi{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--teal-tint,#E2ECF1);color:var(--teal-strong,#143F54);flex:none}
  .pjp-qm>div{display:flex;flex-direction:column;line-height:1.15}
  .pjp-qm small{font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .pjp-qm b{font-size:15px;font-weight:600;white-space:nowrap;color:var(--ink,inherit)}
  .pjp-qv{background:none;border:0;padding:0;margin-top:1px;font:inherit;font-size:11.5px;color:var(--teal);cursor:pointer;text-align:left;text-decoration:underline}
  .pjp-qb{width:32px;height:32px;border-radius:10px;border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center}
  .pjp-qb:hover{background:var(--ground);color:var(--teal-strong)}
  @media(max-width:760px){.pjp-q{width:100%;justify-content:space-between;order:-1}}
  @media(max-width:1100px){.pjp-bar .pjp-fid .pjp-fu{display:none}}
  .pjp-bar .pjp-fid{padding:5px 11px;gap:7px}.pjp-bar .pjp-fid b{font-size:12.5px}.pjp-bar .pjp-fid small{font-size:12px}.pjp-bar .pjp-fid.crit{background:var(--crit-tint,#F6E3E1)}.pjp-bar .pjp-fid.warn{background:var(--warn-tint,#FBF1DC);border-color:transparent}
  .pjp-bar .pjp-fid.pto .pjp-imp{font-size:12px;margin-left:2px}
  @media(max-width:760px){.pjp-bar .pjp-fid{border-radius:12px;flex-wrap:wrap;white-space:normal}.pjp-bar .pjp-fid small{white-space:normal}.pjp-tbt{width:100%}}
  .pjp-mod.pjp-fin{max-width:1100px}
  .pjp-fing{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}@media(max-width:860px){.pjp-fing{grid-template-columns:1fr}}
  .pjp-finl{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto;margin-top:4px}
  .pjp-finl .pjp-ck{display:flex;gap:8px;align-items:flex-start;font-size:13px;cursor:pointer}.pjp-finl .pjp-ck input{width:16px;height:16px;margin:2px 0 0;flex:none}.pjp-finl .pjp-ck small{display:block}.pjp-finl small{color:var(--muted);font-size:12px}
  .pjp-finp{min-width:0}.pjp-finpv{border:1px solid var(--line,#E1E7EB);border-radius:12px;background:#fff;color:#1F2A33;padding:16px;max-height:62vh;overflow:auto}
  .pjp-finpv table{max-width:none}
  @media(max-width:760px){.pjp-fid{flex-basis:100%}.pjp-rs{grid-template-columns:1fr 1fr}.pjp-ppi{display:none}}
  @media(max-width:760px){
    .pjp-pp{padding:18px}.pjp-pp .btn{width:100%;justify-content:center}
    .pjp-busca{min-width:0;flex:1 1 100%}.pjp-lt2 select{flex:1 1 45%;min-width:0}.pjp-lt1,.pjp-lt2{padding-left:12px;padding-right:12px}
    .pjp-pvi .pjp-qa{width:100%;text-align:left}.pjp-pvi .pjp-lks{justify-content:flex-start}
    .pjp-tw{overflow:visible}.pjp-t thead{display:none}.pjp-t,.pjp-t tbody,.pjp-t tfoot{display:block}
    .pjp-lc .pjp-t tr{display:grid;grid-template-columns:1fr auto;gap:8px 12px;border:1px solid var(--line,#E1E7EB);border-radius:12px;padding:12px;margin:0 12px 10px;background:var(--surface)}
    .pjp-lc .pjp-t td{display:block;border:0!important;padding:0!important;text-align:left!important;background:none!important}
    .pjp-t td.pjp-tn,.pjp-t td.pjp-qa{grid-column:1/-1}.pjp-t td:empty{display:none}.pjp-t td[data-r="Total a pagar"]{text-align:right!important}
    .pjp-lc .pjp-t td.pjp-qa{min-width:0;white-space:normal;border-top:1px solid var(--line,#E1E7EB)!important;padding-top:10px!important}.pjp-lks{justify-content:flex-start}
    .pjp-lc .pjp-t tfoot tr{background:var(--surface-2,#F6F8FA)}
  }
  </style>`;
  /* ---------- E-mail ao financeiro (10/11, "temos como automatizar esse e-mail que o RH manda para o financeiro?") ----------
     O mesmo e-mail que o RH escrevia à mão: por empresa, cada PJ com o valor, "ENVIAR TOTAL DE R$ X · a nota fiscal será EMPRESA",
     a folha de cada um igual à planilha (dia, entrada, saída, com a tolerância, total de horas, decimal e o cálculo final) e
     "Depositar em conta EMPRESA". Motivo: pagamento da quinzena ou "desligado antes da data de pagamento habitual".
     O painel copia o e-mail formatado (com as tabelas) e abre o Outlook na internet já com para, cópia e assunto: é só colar (Ctrl+V).
     Para/cópia em rh/config.pjPag.finEmail {para,cc}; cada pessoa enviada ganha pes[fid].fin {em,por,data,mot} e uma linha no histórico. */
  const mails=t=>String(t||'').split(/[;,\s]+/).map(e=>e.trim()).filter(e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  const DSEM=['dom','seg','ter','qua','qui','sex','sáb'];
  const hMin=m=>{ m=Math.round(+m||0); return Math.floor(m/60)+':'+pad2(m%60); };
  const desligadoNo=(f,p)=>f.status==='Desligado'||!!(f.desligamento&&f.desligamento>=p.de&&f.desligamento<=p.ate)||!!f.desligAgendado;
  function finPessoas(c,pid){ const p=perDe(pid), D=docP(pid);
    return pjs(c,p).map(f=>{ const x=(D.pes||{})[f._id]||{}; let r=calcPessoa(c,f,p,x); if(x.st&&x.fech) r=Object.assign({},r,{min:x.fech.min,vh:x.fech.vh,desc:x.fech.desc||0,valor:x.fech.valor,descMot:x.fech.descMot||r.descMot});
      return {f,x,r,emp:String(f.empresa||'').toUpperCase()||'SEM EMPRESA'}; }); }
  function finAbrir(c,fids){ const pid=J.per, p=perDe(pid), os=finPessoas(c,pid), g=cfg(c).finEmail||{};
    const sel={}; (fids&&fids.length?fids:os.filter(o=>o.r.valor>0&&o.x.st!=='pago').map(o=>o.f._id)).forEach(id=>sel[id]=true);
    const desl=os.some(o=>sel[o.f._id]&&desligadoNo(o.f,p));
    J.mod={k:'fin',sel,mot:desl?'desl':'quinzena',data:pagSug(c,perDe(J.per)),para:g.para||'',cc:g.cc||''}; }
  function finGrupos(c,M){ const os=finPessoas(c,J.per).filter(o=>M.sel[o.f._id]); const G={}; os.forEach(o=>(G[o.emp]=G[o.emp]||[]).push(o)); return G; }
  const TD='border:1px solid #BFC9D1;padding:2px 6px;font-family:Calibri,Arial,sans-serif;font-size:11px;';
  function finTabela(c,o,p){ const {f,r}=o, h=r.h, esc=c.esc, nm=String(f.nome||'').toUpperCase();
    const lin=r.dias.map(d=>{ const dt=br(d.d).slice(0,5)+' '+DSEM[d.dw], cinza=d.dw===0||d.dw===6?'background:#F2F2F2;':'';
      const e=d.e?String(d.e).slice(0,5):'00:00', sa=d.s?String(d.s).slice(0,5):'00:00', E=d.m&&d.E!=null?hhmm(d.E):'00:00', S=d.m&&d.S!=null?hhmm(d.S):'00:00';
      return `<tr><td style="${TD}${cinza}white-space:nowrap">${dt}</td><td style="${TD}${cinza}text-align:center">${e}</td><td style="${TD}${cinza}text-align:center">${sa}</td><td style="${TD}${cinza}text-align:center">${E}</td><td style="${TD}${cinza}text-align:center">${S}</td><td style="${TD}${cinza}text-align:right">${hMin(d.m)}</td><td style="${TD}${cinza}text-align:right">${n2(hDec(d.m))}</td></tr>`; }).join('');
    const th=t=>`<td style="${TD}background:#DCE6F1;font-weight:bold">${t}</td>`;
    return `<table style="border-collapse:collapse;margin:6px 0 14px" cellspacing="0" cellpadding="0">
      <tr><td colspan="7" style="${TD}background:#DCE6F1;font-weight:bold">${esc(nm)} · ${esc(String(f.setor||'').toUpperCase())} · Horário: ${esc(h.ini)}hr às ${esc(h.fim)}hr / Intervalo de ${hhmm(+h.intv||0)}</td></tr>
      <tr>${th('Dia')}${th('Entrada')}${th('Saída')}${th('Entrada Tolerância Ajustada')}${th('Saída Tolerância Ajustada')}${th('Total de Horas (desconta '+hhmm(+h.intv||0)+')')}${th('Conversão Decimal')}</tr>${lin}
      <tr><td style="${TD}font-weight:bold">Cálculo final</td><td style="${TD}" colspan="3"></td><td style="${TD}">Total Horas</td><td style="${TD}text-align:right">${hMin(r.min)}</td><td style="${TD}text-align:right">${n2(hDec(r.min))}</td></tr>
      <tr><td style="${TD}" colspan="4"></td><td style="${TD}">${r.fixo?'Valor fixo':'Valor Horas'}</td><td style="${TD}text-align:right">${R$(r.fixo||r.vh)}</td><td style="${TD}"></td></tr>
      ${r.acr?`<tr><td style="${TD}" colspan="4"></td><td style="${TD}">Acréscimo</td><td style="${TD}text-align:right">${R$(r.acr)}</td><td style="${TD}">${esc(r.acrMot||'')}</td></tr>`:''}
      <tr><td style="${TD}" colspan="4"></td><td style="${TD}">Desconto</td><td style="${TD}text-align:right">${R$(r.desc||0)}</td><td style="${TD}">${esc(r.desc?r.descMot||'':'')}</td></tr>
      <tr><td style="${TD}" colspan="4"></td><td style="${TD}background:#DCE6F1;font-weight:bold">Total a Pagar</td><td style="${TD}background:#DCE6F1;font-weight:bold;text-align:right">${R$(r.valor)}</td><td style="${TD}"></td></tr></table>`; }
  function finHtml(c,M){ const esc=c.esc, p=perDe(J.per), G=finGrupos(c,M), dt=br(M.data);
    const motivo=M.mot==='desl'?` <b>devido ser desligado antes da data de pagamento habitual.</b>`:'.';
    const blocos=Object.keys(G).sort().map(emp=>{ const os=G[emp], tot=Math.round(os.reduce((a,o)=>a+o.r.valor,0)*100)/100, nomeE=emp.charAt(0)+emp.slice(1).toLowerCase();
      return `<ul style="margin:8px 0 8px 24px">${os.map(o=>`<li><b>${esc(c.titulo(o.f.nome))}:</b> ${R$(o.r.valor)} de acordo com os dias trabalhados registrados.</li>`).join('')}</ul>
        <p style="margin:10px 0"><b>ENVIAR TOTAL DE ${R$(tot)} · ${emp==='COLAFIX'?'a nota fiscal é do próprio prestador, emitida para a COLAFIX':'a nota fiscal será '+esc(emp)}.</b></p>
        <p style="margin:6px 0">${os.length>1?'As planilhas com o detalhamento dos dias trabalhados seguem':'A planilha com o detalhamento dos dias trabalhados segue'} para conferência.</p>
        ${os.map(o=>finTabela(c,o,p)).join('')}
        <p style="margin:6px 0 18px">${emp==='COLAFIX'?'Depositar na conta de cada prestador (dados bancários no cadastro).':'Depositar em conta '+esc(nomeE.toUpperCase())+'.'}</p>`; }).join('');
    return `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#1F2A33"><p style="margin:0 0 8px"><b>Olá,</b></p>
      <p style="margin:0 0 8px">Conforme os dias trabalhados registrados no Face ID (período de ${esc(p.txt)}), segue o valor ${Object.values(G).flat().length>1?'dos prestadores PJ':'do prestador PJ'} para pagamento no dia ${dt}${motivo}</p>
      ${blocos}<p style="margin:0">Att.,</p><p style="margin:10px 0 0">--<br><b>${esc(c.eu())}</b><br>Gestão de Pessoas</p></div>`; }
  function finTexto(c,M,dias){ const p=perDe(J.per), G=finGrupos(c,M), L=['Olá,','',`Conforme os dias trabalhados registrados no Face ID (período de ${p.txt}), segue o valor ${Object.values(G).flat().length>1?'dos prestadores PJ':'do prestador PJ'} para pagamento no dia ${br(M.data)}${M.mot==='desl'?' devido ser desligado antes da data de pagamento habitual.':'.'}`,''];
    Object.keys(G).sort().forEach(emp=>{ const os=G[emp], tot=Math.round(os.reduce((a,o)=>a+o.r.valor,0)*100)/100;
      os.forEach(o=>L.push('• '+c.titulo(o.f.nome)+': '+R$(o.r.valor)+' de acordo com os dias trabalhados registrados.')); L.push('','ENVIAR TOTAL DE '+R$(tot)+' · '+(emp==='COLAFIX'?'a nota fiscal é do próprio prestador, emitida para a COLAFIX':'a nota fiscal será '+emp)+'.','',
        ...os.flatMap(o=>[c.titulo(o.f.nome)+': '+hMin(o.r.min)+' ('+n2(hDec(o.r.min))+' h) × '+R$(o.r.fixo||o.r.vh)+(o.r.acr?' + '+(o.r.acrMot||'acréscimo '+R$(o.r.acr)):'')+(o.r.desc?' − desconto '+R$(o.r.desc):'')+' = '+R$(o.r.valor)].concat(dias?finDias(o):[])),'',emp==='COLAFIX'?'Depositar na conta de cada prestador (dados bancários no cadastro).':'Depositar em conta '+emp+'.',''); });
    L.push('Att.,','--',c.eu(),'Gestão de Pessoas'); return L.join('\n').replace(/ /g,' '); }
  const finAssunto=(c,M)=>{ const G=finGrupos(c,M); return 'Pagamento PJ · '+Object.keys(G).sort().join(' e ')+' · '+perDe(J.per).txt+(M.mot==='desl'?' · desligamento':''); };
  function finModal(c){ const M=J.mod, esc=c.esc, os=finPessoas(c,J.per), n=os.filter(o=>M.sel[o.f._id]).length, tot=os.filter(o=>M.sel[o.f._id]).reduce((a,o)=>a+o.r.valor,0);
    return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod pjp-fin" role="dialog" aria-label="E-mail ao financeiro"><h3>E-mail ao financeiro</h3><p class="sub">O mesmo e-mail de sempre, montado pelo painel: valor de cada PJ, total por empresa e a folha de cada um. O Outlook abre com o e-mail já escrito. As tabelas formatadas ficam copiadas: se quiser, clique no corpo do e-mail, Ctrl+A e Ctrl+V.</p>
      <div class="pjp-fing"><div class="pjp-box">
        <label for="pjp-fpara">Para (financeiro)</label><input id="pjp-fpara" value="${esc(M.para)}" placeholder="financeiro@…">
        <label for="pjp-fcc">Cópia</label><input id="pjp-fcc" value="${esc(M.cc)}" placeholder="opcional">
        <label for="pjp-fdata">Pagamento no dia</label><input id="pjp-fdata" type="date" value="${esc(M.data)}">
        <label for="pjp-fmot">Motivo</label><select id="pjp-fmot"><option value="quinzena" ${M.mot==='quinzena'?'selected':''}>Pagamento da quinzena</option><option value="desl" ${M.mot==='desl'?'selected':''}>Desligado antes da data de pagamento habitual</option></select>
        <label>Quem entra no e-mail · ${n} PJ · ${R$(tot)}</label><div class="pjp-finl">${os.map(o=>`<label class="pjp-ck"><input type="checkbox" data-pjp-fsel="${esc(o.f._id)}" ${M.sel[o.f._id]?'checked':''}><span>${esc(c.titulo(o.f.nome))} <small>${esc(o.emp)} · ${R$(o.r.valor)}${o.x.st==='pago'?' · pago':''}${desligadoNo(o.f,perDe(J.per))?' · desligado':''}</small></span></label>`).join('')}</div>
      </div><div class="pjp-finp"><div class="pjp-lbl">Como vai sair · ${esc(finAssunto(c,M))}</div><div class="pjp-finpv" id="pjp-finpv">${n?finHtml(c,M):'<p class="sub">Marque pelo menos um PJ.</p>'}</div></div></div>
      <div class="pjp-ac" style="margin-top:14px">${finOlBts(c,n)}</div>${M.semJan?`<p class="sub" style="margin-top:10px">O e-mail já foi copiado. <a href="${esc(M.semJan)}" target="_blank" rel="noopener">Abrir o Outlook</a> e colar (Ctrl+V).</p>`:''}</div></div>`; }
  /* Criar no Outlook pelo login da Microsoft (Graph): o rascunho já sai com as tabelas, sem colar nada */
  const finOl=()=>window.OneDrive&&OneDrive.mail&&OneDrive.mail.ativo()?OneDrive.mail:null;
  function finOlBts(c,n){ const ol=finOl(), d=n?'':'disabled';
    if(!ol) return btn('pjp-modx','Fechar')+btn('pjp-fincp','Só copiar o e-mail',d)+btn('pjp-finok','Copiar e abrir o Outlook',d,'');
    const con=ol.conectado();
    return btn('pjp-modx','Fechar')+btn('pjp-fincp','Só copiar',d)+btn('pjp-finok','Abrir o Outlook e colar',d)
      +(con?btn('pjp-finol','Criar o e-mail no Outlook (com as tabelas)',d,''):btn('pjp-finolc','Conectar o Outlook (uma vez só)','',''))
      +(con?`<div class="sub" style="flex-basis:100%;text-align:right;font-size:12px">Outlook conectado${ol.conta()?' como '+c.esc(ol.conta()):''} · ${lnk('pjp-finols','desconectar')}</div>`
        :`<div class="sub" style="flex-basis:100%;text-align:right;font-size:12px">Conectando o Outlook, o painel cria o e-mail pronto na sua caixa, com as tabelas. Você só confere e clica em Enviar.</div>`); }
  async function finCopia(c,M){ const html=finHtml(c,M), txt=finTexto(c,M);
    try{ if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){ await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([txt],{type:'text/plain'})})]); return 'html'; } }catch(e){}
    try{ await navigator.clipboard.writeText(txt); return 'texto'; }catch(e){}
    return ''; }
  async function finRegistra(c,M){ const pid=J.per, ids=Object.keys(M.sel).filter(k=>M.sel[k]);
    const g=Object.assign({},cfg(c).finEmail||{}), nv={para:M.para,cc:M.cc}; if(g.para!==nv.para||g.cc!==nv.cc){ c.R.cfg.pjPag=Object.assign({},(c.R.cfg||{}).pjPag||{},{finEmail:nv}); await c.P.db().doc('rh/config').set({pjPag:{finEmail:nv}},{merge:true}); }
    for(const id of ids) await grava(c,pid,id,{fin:{em:agora(),por:c.eu(),data:M.data,mot:M.mot}},'E-mail ao financeiro: pagamento em '+br(M.data)+(M.mot==='desl'?' (desligamento)':'')); }
  const finDias=o=>(o.r.dias||[]).filter(d=>d.m>0).map(d=>'   '+br(d.d).slice(0,5)+' '+DSEM[d.dw]+'   '+(d.e?String(d.e).slice(0,5):'--:--')+' às '+(d.s?String(d.s).slice(0,5):'--:--')+'   conta '+hhmm(d.E)+' às '+hhmm(d.S)+'   '+hMin(d.m)+' ('+n2(hDec(d.m))+')');
  function finOwa(c,M){ const q=['to='+encodeURIComponent(mails(M.para).join(';'))]; if(mails(M.cc).length) q.push('cc='+encodeURIComponent(mails(M.cc).join(';'))); q.push('subject='+encodeURIComponent(finAssunto(c,M)));
    const base='https://outlook.office.com/mail/deeplink/compose?'+q.join('&');
    for(const dias of [true,false]){ const u=base+'&body='+encodeURIComponent(finTexto(c,M,dias)); if(u.length<=7800) return u; }
    return 'https://outlook.office.com/mail/deeplink/compose?'+q.join('&'); }
  /* ---------- relatórios ---------- */
  function linhasRel(c){ const pid=J.per, p=perDe(pid), D=docP(pid);
    return pjs(c,p).filter(f=>!J.emp||String(f.empresa||'').toUpperCase()===J.emp).map(f=>{ const x=(D.pes||{})[f._id]||{}; const r=calcPessoa(c,f,p,x); const fe=x.st&&x.fech; return {f,x,r,min:fe?fe.min:r.min,valor:fe?fe.valor:r.valor,desc:fe?fe.desc||0:r.desc,descMot:fe?(fe.descMot||x.descMot||''):r.descMot,bruto:fe?fe.bruto:r.bruto,vh:fe?fe.vh:r.vh,acr:fe?fe.acr||0:r.acr,acrMot:fe?(fe.acrMot||''):r.acrMot}; }); }
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
        t.getCell(3).value='Horário: '+h.ini+'hr às '+h.fim+'hr / Intervalo de '+hhmm(iv)+(!cAntes(h)&&!cDepois(h)?' · não conta fora do horário':!cAntes(h)?' · não conta antes da entrada':!cDepois(h)?' · não conta depois da saída':'')+(o.r.fixo?' · VALOR FIXO':'');
        t.eachCell({includeEmpty:true},cl=>{ cl.font={bold:true}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:CZ}}; cl.border=bd; }); r++;
        const hd=W.getRow(r); hd.values=['Dia','Entrada','Saída','Entrada Tolerância Ajustada','Saída Tolerância Ajustada','Total de Horas (desconta '+hhmm(iv)+' intervalo)','Conversão Decimal','Observação'];
        hd.eachCell(cl=>{ cl.font={bold:true,size:10}; cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:CI}}; cl.alignment={wrapText:true,vertical:'middle'}; cl.border=bd; }); hd.height=30; r++;
        const d0=r;
        o.r.dias.forEach(d=>{ const row=W.getRow(r), dt=new Date(d.d+'T12:00:00');
          row.getCell(1).value=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())); row.getCell(1).numFmt='dd/mm/yyyy ddd';
          row.getCell(2).value=d.zero?0:tFr(d.e); row.getCell(3).value=d.zero?0:tFr(d.e&&d.s?d.s:'');
          const lim=(v,b)=>`AND(${v}>=${tF(b-tol)},${v}<=${tF(b+tol)})`;
          let fD=`IF(B${r}=0,0,IF(${lim('B'+r,ini)},${tF(ini)},B${r}))`, fE=`IF(C${r}=0,0,IF(${lim('C'+r,fim)},${tF(fim)},C${r}))`;
          if(!cAntes(h)) fD=`IF(B${r}=0,0,MAX(${tF(ini)},${fD}))`; if(!cDepois(h)) fE=`IF(C${r}=0,0,MIN(${tF(fim)},${fE}))`;
          row.getCell(4).value={formula:fD,result:d.E!=null&&d.m?d.E/1440:(d.e&&!d.zero?tFr(d.e):0)};
          row.getCell(5).value={formula:fE,result:d.S!=null&&d.m?d.S/1440:0};
          row.getCell(6).value=d.fech||d.fil||d.descF||(d.fer&&d.fer.pago)?d.m/1440:{formula:`IF(E${r}-D${r}<=0,0,MAX(0,E${r}-D${r}-${tF(iv)}))`+(d.mR!=null?'*'+d.fF:''),result:d.m/1440};   /* dia do fechamento e feriado pago: o dia cheio, não a conta das passagens */
          row.getCell(7).value={formula:`F${r}*24`,result:+(d.m/60).toFixed(4)};
          row.getCell(8).value=d.aj?(d.zero?'Não trabalhou':'Corrigido à mão')+(d.mot?': '+d.mot:'')+(d.hs.length?' · Face ID: '+d.hs.join(' '):''):d.fil?'Fixcol · dia cheio (sem Face ID)':d.descF?'Saiu e voltou: descontado '+hTxt(d.descF):d.mR!=null?'Fim de semana × '+String(d.fF).replace('.',','):d.fl?d.fl+' · Face ID: '+d.hs.join(' '):d.hs.length>2?'Face ID: '+d.hs.join(' '):d.info||'';
          [2,3,4,5].forEach(k=>row.getCell(k).numFmt='hh:mm'); row.getCell(6).numFmt='[h]:mm'; row.getCell(7).numFmt='0.00';
          row.eachCell({includeEmpty:true},cl=>{ cl.border=bd; if(d.dw===0||d.dw===6) cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F7F7'}}; if(d.fl&&!d.aj) cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFBF1DC'}}; if(d.aj) cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEAF2F6'}}; }); r++; });
        const d1=r-1, cf=(lab,k,v,fmt,bold)=>{ const row=W.getRow(r); row.getCell(5).value=lab; row.getCell(k).value=v; if(fmt) row.getCell(k).numFmt=fmt; [5,6,7].forEach(j=>{ row.getCell(j).border=bd; if(bold){ row.getCell(j).font={bold:true}; row.getCell(j).fill={type:'pattern',pattern:'solid',fgColor:{argb:CZ}}; } }); return r++; };
        const rT=r; W.getCell('A'+r).value='Cálculo final'; W.getCell('A'+r).font={bold:true};
        cf('Total Horas',6,{formula:`SUM(F${d0}:F${d1})`,result:o.min/1440},'[h]:mm'); W.getCell('G'+rT).value={formula:`F${rT}*24`,result:+(o.min/60).toFixed(4)}; W.getCell('G'+rT).numFmt='0.00'; W.getCell('G'+rT).border=bd;
        const rV=cf(o.r.fixo?'Valor fixo':'Valor Horas',6,o.r.fixo?o.r.fixo:(o.vh||0),FR);
        const rA=o.acr?cf('Acréscimo',6,o.acr,FR):null; if(rA&&o.acrMot) W.getCell('H'+rA).value=o.acrMot;
        const rD=cf('Desconto',6,o.desc||0,FR); if(o.descMot) W.getCell('H'+rD).value=o.descMot;
        cf('Total a Pagar',6,{formula:(o.r.fixo?`F${rV}`:`F${rV}*G${rT}`)+(rA?`+F${rA}`:'')+`-F${rD}`,result:o.valor},FR,true);
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
      const at=xs.filter(([,x])=>x.st==='pedido'&&x.ped&&Date.now()-new Date(x.ped.em)>(+cfg(c).avisaNota||3)*864e5).length; if(at) out.push({nivel:'warn',rotulo:'PJ',titulo:at+' PJ ainda não mandaram a nota',texto:'Pedida há mais de '+(+cfg(c).avisaNota||3)+' dias · '+p.txt,go:'rhpjpag'});
      { const pa=perDe(perAtual(c)), fd=fechDia(pa); if(c.P.hojeStr()===fd){ assina(c,pa.pid); const fz=pjs(c,pa).filter(f=>!((docP(pa.pid).pes||{})[f._id]||{}).st).length; if(fz) out.push({nivel:'warn',rotulo:'PJ',titulo:'Hoje é o dia de fechar a quinzena dos PJ',texto:pa.curto+' · '+fz+' PJ com o valor ainda não fechado',go:'rhpjpag'}); } }
      if(c.P.hojeStr()>p.ate){ const fz=pjs(c,p).filter(f=>!((D.pes||{})[f._id]||{}).st).length; if(fz) out.push({nivel:'warn',rotulo:'PJ',titulo:'Fechar o pagamento dos PJ de '+p.curto,texto:fz+' PJ com o valor ainda não fechado',go:'rhpjpag'}); }
      return out; }catch(e){ return []; } }
  /* ---------- ações ---------- */
  const fDe=id=>(C.R.func||[]).find(f=>f._id===id);
  /* 11/11 ("marquei fechar valor na quinzena passada, por que aparece aqui?"): a tela abre na quinzena ATUAL; fechar antes do último dia útil pergunta antes */
  function fechaCedo(c,n){ const p=perDe(J.per), fd=fechDia(p); if(hojeS()>=fd) return true;
    return confirm('Atenção: esta é a quinzena de '+p.curto+', que ainda não terminou (o valor fecha em '+brc(fd)+').\n\nSe você queria fechar a quinzena passada, cancele e use a seta ‹ ao lado da quinzena.\n\nFechar '+(n>1?'o valor dos '+n+' PJ':'este valor')+' agora mesmo assim?'); }
  async function fechar(c,f){ const pid=J.per, p=perDe(pid), x=pesDe(pid,f._id), r=calcPessoa(c,f,p,x);
    if(!r.fixo&&!r.vh) throw Object.assign(new Error(c.titulo(f.nome)+': falta o valor da hora (abra a pessoa e preencha).'),{aviso:true});
    if(!r.fixo&&!r.min) throw Object.assign(new Error(c.titulo(f.nome)+': não tem horas neste período (confira os dias no Face ID ou corrija à mão).'),{aviso:true});
    if(r.uPend) throw Object.assign(new Error(c.titulo(f.nome)+': confirme o desconto do uniforme na aba Descontos antes de fechar.'),{aviso:true});
    const fech={cheio:r.cheio||null,min:r.min,vh:r.vh,fixo:r.fixo,bruto:r.bruto,desc:r.desc,descMot:r.descMot,descs:r.descs.map(z=>({t:z.t,v:z.v})),acr:r.acr,acrMot:r.acrMot,acrs:r.acrs.map(z=>({t:z.t,v:z.v})),valor:r.valor,dias:r.dias.map(d=>({d:d.d,e:d.E!=null?hhmm(d.E):'',s:d.S!=null?hhmm(d.S):'',m:d.m})),h:r.h,em:agora(),por:c.eu()};
    await grava(c,pid,f._id,{st:'fechado',fech},'Valor fechado: '+(r.fixo?'fixo ':hTxt(r.min)+' × '+R$(r.vh)+' ')+(r.desc?'− '+R$(r.desc)+' ':'')+(r.acr?'+ '+R$(r.acr)+' ':'')+'= '+R$(r.valor)); }
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!C||!t||!t.closest) return; const P=C.P;
    if(t.id==='pjp-cmodo'){ const k=document.getElementById('pjp-ccorte'); if(k) k.disabled=t.value==='mes'; return; }
    if(t.matches&&t.matches('[data-pjp-qsel]')){ if(t.value&&perDe(t.value)){ J.per=t.value; J.ab=''; C.P.render(); } return; }
    if(t.matches&&t.matches('[data-pjp-pto]')){ const fl=t.files&&t.files[0]; t.value=''; if(fl) await ptoImporta(C,fl); return; }
    try{
      if(t.id==='pjp-emp'){ J.emp=t.value; P.render(); return; }
      if(J.mod&&J.mod.k==='fin'&&(t.dataset.pjpFsel||['pjp-fmot','pjp-fdata','pjp-fpara','pjp-fcc'].includes(t.id))){ const M=J.mod;
        if(t.dataset.pjpFsel) M.sel[t.dataset.pjpFsel]=t.checked; else if(t.id==='pjp-fmot') M.mot=t.value; else if(t.id==='pjp-fdata') M.data=t.value||M.data; else if(t.id==='pjp-fpara'){ M.para=t.value; return; } else { M.cc=t.value; return; }
        P.render(); return; }
      if(t.id==='pjp-set'){ J.set=t.value; P.render(); return; }
      if(t.id==='pjp-sit'){ J.sit=t.value; P.render(); return; }
      if(t.dataset.pjpDia){ const f=fDe(t.dataset.f), d=t.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{});
        cur[t.dataset.pjpDia]=t.value||''; if(!cur.e&&!cur.s){ aj[d]=null; } else { cur.por=C.eu(); cur.em=agora(); cur.mot=cur.mot||'corrigido à mão'; aj[d]=cur; }
        await grava(C,J.per,f._id,{aj}); P.render(); return; }
      if(t.dataset.pjpC){ const f=fDe(t.dataset.f); if(pesDe(J.per,f._id).st) return; const k=t.dataset.pjpC; await grava(C,J.per,f._id,{[k]:k==='desc'?num(t.value):String(t.value||'').slice(0,120)}); P.render(); return; }
    }catch(e){ P.erro(e); } });
  document.addEventListener('click',ev=>{ if(!J.calAb||!C) return; const t=ev.target; if(t.closest&&(t.closest('.pjp-calpop')||t.closest('[data-act=pjp-calab]'))) return; J.calAb=false; C.P.render(); },true);
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&J.calAb&&C){ J.calAb=false; C.P.render(); ev.stopPropagation(); } },true);
  function dFiltra(){ const q=norm(J.dq||''), k=J.dk||'*', ws=q?q.split(' '):[]; let n=0;
    document.querySelectorAll('.pjp-dl [data-pjpd]').forEach(el=>{ const b=(el.dataset.b||'').split(' '), ks=(el.dataset.k||'').split(' ');
      const ok=(!J.dsel||el.dataset.pjpd===J.dsel)&&(k==='*'||ks.includes(k))&&ws.every(w=>b.some(x=>x===w||(w.length>1&&x.startsWith(w))||(w.includes('/')&&x.startsWith(w)))); el.hidden=!ok; if(ok) n++; });
    const v=document.getElementById('pjp-dv'); if(v) v.hidden=!!n; }
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.dataset||t.dataset.pjpCwbus==null) return; const q=semAc(t.value).trim().split(/\s+/).filter(Boolean), box=t.closest('.pjp-cwq'); if(!box) return; let n=0;
    box.querySelectorAll('li[data-b]').forEach(li=>{ const ok=q.every(w=>li.dataset.b.includes(w)); li.hidden=!ok; if(ok) n++; }); const z=box.querySelector('.pjp-cwq0'); if(z) z.hidden=!!n; });
  document.addEventListener('click',ev=>{ if(ev.target.closest&&ev.target.closest('[data-pjp-cwlk]')){ J.cwLinkBloq=''; } },true);
  document.addEventListener('input',ev=>{ const t=ev.target; if(t&&t.id==='pjp-dq'){ J.dq=t.value; dFiltra(); return; } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(!C||!t||t.id!=='pjp-q') return; J.q=t.value; clearTimeout(J._qt); J._qt=setTimeout(()=>{ C.P.render(); setTimeout(()=>{ const i=document.getElementById('pjp-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },0); },350); });
  /* "Abrir o cadastro" da gaveta: quem abre o cadastro é o RH (rh-ed); aqui só fecha a gaveta para não voltar aberta */
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('.pjp-gcad'); if(b){ J.ab=''; J.edDia=null; } },true);
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-pjp-fundo]'); if(fu&&ev.target===fu){ J.mod=null; C&&C.P.render(); return; }
    const gf=ev.target.closest&&ev.target.closest('[data-pjp-gf]'); if(gf&&ev.target===gf){ J.ab=''; J.edDia=null; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="pjp-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, c=C;
    if(a==='pjp-wa'){ if(J.mod&&J.mod.k==='ped'){ const m=document.getElementById('pjp-pmsg'); if(m&&m.value!==J.mod.msg){ ev.preventDefault(); J.mod.msg=m.value; const tel=dig(J.mod.tel); window.open((tel?'https://wa.me/'+(tel.length<=11?'55':'')+tel:'https://wa.me/')+'?text='+encodeURIComponent(m.value),'_blank','noopener'); }
        const f=fDe(J.mod.fid); if(f){ const x=pesDe(J.per,f._id); grava(c,J.per,f._id,{ped:Object.assign({},x.ped,{via:(x.ped&&x.ped.via||[]).concat(['whatsapp'])})}).catch(()=>{}); } } window.__pjpUltimoWa=b.href; return; }
    ev.preventDefault();
    try{
      if(a==='pjp-per'){ const v=+b.dataset.v; J.per=v===0?perAtual(c):perMove(J.per,v); J.ab=''; P.render(); return; }
      if(a==='pjp-ab'){ if(J.ab!==b.dataset.f){ J.dq=''; J.dk='*'; J.dsel=''; J.calAb=false; } J.ab=b.dataset.f; J.tab=b.dataset.tab||'horas'; J.edDia=null; P.render(); return; }
      if(a==='pjp-et'){ const v=b.dataset.v; J.sit=J.sit===v?'*':v; P.render(); return; }
      if(a==='pjp-fidir'){ P.go('rhalmoco'); return; }
      if(a==='pjp-fin'){ finAbrir(c,b.dataset.f?[b.dataset.f]:null); P.render(); return; }
      if(a==='pjp-finolc'||a==='pjp-finols'){ const M=J.mod, ol=finOl(); if(!ol) return; const g=id=>(document.getElementById(id)||{}).value; if(M&&M.k==='fin'){ M.para=g('pjp-fpara')??M.para; M.cc=g('pjp-fcc')??M.cc; }
        if(a==='pjp-finols'){ ol.sair(); P.render(); return; }
        try{ await ol.conectar(); P.toast('Outlook conectado'+(ol.conta()?' como '+ol.conta():'')+'. Agora toque em "Criar o e-mail no Outlook".'); }
        catch(e){ P.toast(e.message||String(e)); } P.render(); return; }
      if(a==='pjp-finol'){ const M=J.mod, ol=finOl(); if(!M||M.k!=='fin'||!ol) return; const g=id=>(document.getElementById(id)||{}).value; M.para=g('pjp-fpara')||''; M.cc=g('pjp-fcc')||''; M.data=g('pjp-fdata')||M.data;
        if(!mails(M.para).length) return P.toast('Escreva o e-mail do financeiro em "Para".');
        let w=null; try{ w=window.open('','_blank'); if(w) w.document.write('<p style="font:16px sans-serif;margin:40px">Montando o e-mail no Outlook…</p>'); }catch(e){}
        try{ const r=await ol.rascunho({para:mails(M.para).join(';'),cc:mails(M.cc).join(';'),assunto:finAssunto(c,M),html:finHtml(c,M)});
          window.__pjpFin={html:finHtml(c,M),assunto:finAssunto(c,M),rascunho:r};
          if(w) w.location=r.link; else { M.semJan=r.link; P.render(); P.toast('O e-mail foi criado no Outlook (em Rascunhos). Toque em "Abrir o Outlook" para ver.'); }
          finRegistra(c,M).catch(e=>console.warn(e));
          if(w){ P.toast('E-mail criado no Outlook, com as tabelas. Confira e clique em Enviar.'); J.mod=null; P.render(); }
        }catch(e){ try{ w&&w.close(); }catch(_){}
          const t=String(e&&e.message||e); P.toast(/403|Access|denied|consent|Authorization/i.test(t)?'A Microsoft não deixou o painel criar e-mails nesta conta. Peça para liberar a permissão "Mail.ReadWrite" no aplicativo do painel (Microsoft Entra) ou use "Abrir o Outlook e colar".':'Não deu para criar o e-mail no Outlook: '+t); }
        return; }
      if(a==='pjp-fincp'||a==='pjp-finok'){ const M=J.mod; if(!M||M.k!=='fin') return; const g=id=>(document.getElementById(id)||{}).value; M.para=g('pjp-fpara')||''; M.cc=g('pjp-fcc')||''; M.data=g('pjp-fdata')||M.data;
        if(a==='pjp-finok'&&!mails(M.para).length) return P.toast('Escreva o e-mail do financeiro em "Para".');
        const url=finOwa(c,M), cp=await finCopia(c,M); window.__pjpFin={html:finHtml(c,M),txt:finTexto(c,M),assunto:finAssunto(c,M),url,cp};
        if(a==='pjp-finok'){ let w=null; try{ w=window.open(url,'_blank'); }catch(e){}
          if(!w){ J.mod.semJan=url; P.render(); P.toast('O navegador bloqueou a janela do Outlook. Toque em "Abrir o Outlook" na janela do e-mail.'); finRegistra(c,M).catch(e=>console.warn(e)); return; } }
        finRegistra(c,M).catch(e=>{ console.warn(e); P.toast('O e-mail foi copiado, mas não deu para guardar no histórico: '+(e&&e.message||e)); });
        P.toast(a==='pjp-finok'?(cp==='html'?'O e-mail já vai escrito no Outlook. Para trocar pelas tabelas formatadas: clique no corpo, Ctrl+A e Ctrl+V.':'O e-mail já vai escrito no Outlook (texto simples).'):(cp==='html'?'E-mail copiado com as tabelas. Cole no Outlook (Ctrl+V).':cp?'E-mail copiado (sem as tabelas). Cole no Outlook (Ctrl+V).':'Não deu para copiar sozinho: selecione o e-mail na prévia e copie (Ctrl+C).'));
        J.mod=null; P.render(); return; }
      if(a==='pjp-aba'){ J.aba=b.dataset.v; P.render(); return; }
      if(a==='pjp-col'){ const v=+b.dataset.v; J.col=(v<0||J.col===v)?-1:v; if(J.col>=0) J.aba='lista'; P.render(); return; }
      if(a==='pjp-gx'){ J.ab=''; J.edDia=null; P.render(); return; }
      if(a==='pjp-tab'){ J.tab=b.dataset.v; J.edDia=null; P.render(); return; }
      if(a==='pjp-prox'){ const p=perDe(J.per), lista=J._rsT||[], pend=o=>o&&o.r&&o.r.dias.filter(d=>kOfDia(d).includes('conf')).map(d=>d.d);
        const cur=lista.find(o=>o.f._id===b.dataset.f), dd=cur?pend(cur):[], nx=dd.find(d=>!J.dsel||d>J.dsel);
        if(nx){ J.dsel=nx; J.dk='*'; J.calAb=false; P.render(); setTimeout(()=>{ const el=document.querySelector('.pjp-dl [data-pjpd="'+nx+'"]'); if(el) el.scrollIntoView({block:'nearest',behavior:'smooth'}); },60); return; }
        const i=lista.findIndex(o=>o.f._id===b.dataset.f), ord=lista.slice(i+1).concat(lista.slice(0,Math.max(0,i))), o2=ord.find(o=>!o.x.st&&pend(o).length);
        if(!o2){ J.dsel=''; P.toast('Pronto: nada mais para conferir nesta quinzena.'); P.render(); return; }
        J.ab=o2.f._id; J.tab='horas'; J.dk='*'; J.dq=''; J.calAb=false; J.dsel=pend(o2)[0]; J.edDia=null; P.toast('Agora: '+c.titulo(o2.f.nome)); P.render(); return; }
      if(a==='pjp-calab'){ J.calAb=!J.calAb; P.render(); return; }
      if(a==='pjp-dcal'){ if(b.disabled) return; const v=b.dataset.v||''; J.dsel=v; J.calAb=false; if(v) J.dk='*'; P.render(); setTimeout(()=>{ const el=v&&document.querySelector('.pjp-dl [data-pjpd="'+v+'"]'); if(el) el.scrollIntoView({block:'nearest',behavior:'smooth'}); },60); return; }
      if(a==='pjp-dk'){ if(J.dsel||J.calAb){ J.dsel=''; J.calAb=false; J.dk=b.dataset.v; P.render(); return; } J.dk=(J.dk||'*')===b.dataset.v&&b.dataset.v!=='*'?'*':b.dataset.v; document.querySelectorAll('[data-act=pjp-dk]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===J.dk))); dFiltra(); return; }
      if(a==='pjp-confx'){ J.conf=!J.conf; P.render(); return; }
      if(a==='pjp-flimpa'){ J.emp=''; J.set=''; J.sit='*'; J.col=-1; J.conf=false; J.q=''; P.render(); return; }
      if(a==='pjp-dcor'){ J.edDia=b.dataset.d; P.render(); setTimeout(()=>{ const i=document.getElementById(document.getElementById('pjp-ce')&&!document.getElementById('pjp-ce').value?'pjp-ce':'pjp-cs'); if(i) i.focus(); },30); return; }
      if(a==='pjp-dcanc'){ J.edDia=null; P.render(); return; }
      if(a==='pjp-dsalva'||a==='pjp-dzero'){ const f=fDe(b.dataset.f), d=b.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), g=id=>(document.getElementById(id)||{}).value||'';
        const mot=String(g('pjp-cm')||b.dataset.mot||'').trim().slice(0,80);
        const fk=(o=>o&&o.fer?{fer:true,ferNome:o.ferNome,pago:!!o.pago}:{})(aj[d]);
        if(a==='pjp-dzero') aj[d]=Object.assign(fk,{zero:true,mot:mot||'Não trabalhou neste dia',por:c.eu(),em:agora()});
        else { const e=g('pjp-ce'), sa=g('pjp-cs'); if(!e&&!sa) return P.toast('Digite a entrada e a saída.'); if(e&&sa&&sa<=e) return P.toast('A saída tem que ser depois da entrada.'); aj[d]=Object.assign(fk,{e,s:sa,mot:mot||'corrigido à mão',por:c.eu(),em:agora()}); }
        await grava(c,J.per,f._id,{aj},'Corrigiu '+brc(d)+(a==='pjp-dzero'?': não trabalhou':': '+(aj[d].e||'')+' às '+(aj[d].s||''))+(mot?' ('+mot+')':'')); J.edDia=null; P.render(); return; }
      if(a==='pjp-ppad'){ const f=fDe(b.dataset.f); if(!confirm('Voltar o horário e o valor de '+c.titulo(f.nome)+' para o padrão?')) return; f.pjPag={}; await P.db().doc('rh/dados/funcionarios/'+f._id).update({pjPag:{}}); P.toast('Regras de '+c.titulo(f.nome)+' voltaram ao padrão.'); P.render(); return; }
      if(a==='pjp-modx'){ J.mod=null; P.render(); return; }
      if(a==='pjp-cfg'){ ev.preventDefault&&ev.preventDefault(); if(b.dataset.fecha){ J.ab=''; J.edDia=null; } J.mod={k:'cfg'}; P.render(); return; }
      if(a==='pjp-cfgok'){ const g=id=>document.getElementById(id), o={modo:g('pjp-cmodo').value,ini:g('pjp-cini').value||PAD.ini,fim:g('pjp-cfim').value||PAD.fim,intv:Math.max(0,parseInt(g('pjp-cintv').value,10)||0),tol:Math.max(0,parseInt(g('pjp-ctol').value,10)||0),
          horasMes:Math.max(1,parseInt(g('pjp-chm').value,10)||220),dias:Math.max(2,Math.min(90,parseInt(g('pjp-cdias').value,10)||30)),
          corte:Math.max(10,Math.min(20,parseInt(g('pjp-ccorte').value,10)||15)),fds:(v=>v>=1&&v<=3?v:1.5)(num(g('pjp-cfds').value)),pagDias:Math.max(0,Math.min(60,parseInt(g('pjp-cpag').value,10)||0)),avisaNota:Math.max(1,Math.min(30,parseInt(g('pjp-caviso').value,10)||3)),
          emps:(e=>e.length?e:['ZENITH','NEXUS'])([...document.querySelectorAll('[data-pjp-cemp]')].filter(i=>i.checked).map(i=>i.dataset.pjpCemp)),antes:g('pjp-cantes').checked,depois:g('pjp-cdepois').checked,dentro:!g('pjp-cantes').checked&&!g('pjp-cdepois').checked,leit:[...document.querySelectorAll('[data-pjp-clt]')].filter(i=>i.checked).map(i=>i.dataset.pjpClt),msg:String(g('pjp-cmsg').value||'').slice(0,800)||PAD.msg};
        const ant=cfg(c).modo, antK=corteQ(); o.finEmail=cfg(c).finEmail||null; if(!o.finEmail) delete o.finEmail; c.R.cfg.pjPag=Object.assign({},(c.R.cfg||{}).pjPag||{},o); await P.db().doc('rh/config').set({pjPag:o},{merge:true});
        if((g('pjp-cintvt')||{}).checked){ const pr=(c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.pjPag&&f.pjPag.intv!=null&&f.pjPag.intv!==""); for(const f of pr){ f.pjPag=Object.assign({},f.pjPag,{intv:null}); await P.db().doc('rh/dados/funcionarios/'+f._id).set({pjPag:{intv:null}},{merge:true}); } }
        if(ant!==o.modo||antK!==o.corte) J.per=perAtual(c); J.mod=null; P.toast('Parâmetros do pagamento salvos.'); P.render(); return; }
      if(a==='pjp-psalva'){ const f=fDe(b.dataset.f), g=id=>(document.getElementById(id)||{}).value||'', n0=v=>v===''?null:Math.max(0,parseInt(v,10)||0);
        const dias=[...document.querySelectorAll('[data-pjp-dw]')].filter(i=>i.checked).map(i=>+i.dataset.pjpDw).sort();
        if(!dias.length) return P.toast('Marque pelo menos um dia de trabalho.');
        const fixoOn=(document.querySelector('input[name="pjp-rv"]:checked')||{}).value==='f', gp=cfg(c), antes=document.getElementById('pjp-rantes').checked, depois=document.getElementById('pjp-rdepois').checked;
        const o={ini:g('pjp-ri'),fim:g('pjp-rf'),intv:n0(g('pjp-rint')),tol:n0(g('pjp-rtol')),dias:dias.join(',')==='1,2,3,4,5'&&!(f.horEsp&&f.horEsp.dias)?[]:dias,dentro:null,antes:antes===gAD(gp,'antes')?null:antes,depois:depois===gAD(gp,'depois')?null:depois,
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
        const xs=((x.dsc&&x.dsc.x)||[]).concat([{id:'d'+Date.now().toString(36),t,v,em:agora(),por:c.eu()}]); await grava(c,J.per,f._id,{dsc:Object.assign({},x.dsc||{},{x:xs})},'Desconto acrescentado: '+t+' '+R$(v)); P.render(); return; }
      if(a==='pjp-axadd'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(x.st) return; const t=String((document.getElementById('pjp-axt')||{}).value||'').trim().slice(0,80)||'Vale-transporte', raw=String((document.getElementById('pjp-axv')||{}).value||'');
        const mm=raw.match(/^\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*$/i), v=Math.round((mm?num(mm[1])*num(mm[2]):num(raw))*100)/100;
        if(!(v>0)) return P.toast('Digite o valor do acréscimo (ex.: 200,00 ou 5 x 40).');
        const as=((x.dsc&&x.dsc.a)||[]).concat([{id:'a'+Date.now().toString(36),t,v,em:agora(),por:c.eu()}]); await grava(c,J.per,f._id,{dsc:Object.assign({},x.dsc||{},{a:as})},'Acréscimo: '+t+' '+R$(v)); P.render(); return; }
      if(a==='pjp-axx'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(x.st) return; const id=b.dataset.id, z=((x.dsc&&x.dsc.a)||[]).find(y=>y.id===id), as=((x.dsc&&x.dsc.a)||[]).filter(y=>y.id!==id);
        await grava(c,J.per,f._id,{dsc:Object.assign({},x.dsc||{},{a:as})},'Acréscimo tirado: '+(z?z.t+' '+R$(z.v):'')); P.render(); return; }
      if(a==='pjp-spd'||a==='pjp-spok'||a==='pjp-spx'){ const f=fDe(b.dataset.f), d=b.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{});
        delete cur.descF; delete cur.okFora; if(a==='pjp-spd'){ cur.descF=+b.dataset.v; cur.por=c.eu(); cur.em=agora(); } if(a==='pjp-spok'){ cur.okFora=true; cur.por=c.eu(); cur.em=agora(); }
        aj[d]=Object.keys(cur).filter(k=>!['por','em'].includes(k)).length?cur:null;
        await grava(c,J.per,f._id,{aj},a==='pjp-spd'?'Descontou '+hTxt(+b.dataset.v)+' de saída no meio do dia '+brc(d):a==='pjp-spok'?'Conferiu a saída no meio do dia '+brc(d)+': está certo':'Desfez a conferência da saída de '+brc(d)); P.render(); return; }
      if(a==='pjp-dxx'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(x.st) return; const id=b.dataset.id;
        if(id==='fch'){ await grava(c,J.per,f._id,{fchX:{em:agora(),por:c.eu()}},'Desconto do dia do fechamento tirado'); P.render(); return; }
        if(id==='leg'){ await grava(c,J.per,f._id,{desc:0,descMot:''},'Desconto tirado: '+(x.descMot||'desconto lançado')+' '+R$(x.desc)); P.render(); return; }
        const z=((x.dsc&&x.dsc.x)||[]).find(y=>y.id===id), xs=((x.dsc&&x.dsc.x)||[]).filter(y=>y.id!==id); await grava(c,J.per,f._id,{dsc:Object.assign({},x.dsc||{},{x:xs})},'Desconto tirado: '+(z?z.t+' '+R$(z.v):'')); P.render(); return; }
      if(a==='pjp-diax'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id), aj=Object.assign({},x.aj||{}), o=aj[b.dataset.d]; aj[b.dataset.d]=o&&o.fer?{fer:true,ferNome:o.ferNome,pago:!!o.pago}:null; await grava(c,J.per,f._id,{aj}); P.render(); return; }
      if(a==='pjp-fech'){ if(!fechaCedo(c,1)) return; await fechar(c,fDe(b.dataset.f)); P.render(); return; }
      if(a==='pjp-fechtodos'){ const p=perDe(J.per), vis=J._vis||[], xs=pjs(c,p).filter(f=>!pesDe(J.per,f._id).st&&vis.includes(f._id)); if(!fechaCedo(c,xs.length)) return; const er=[]; b.disabled=true;
        for(const f of xs){ try{ await fechar(c,f); }catch(e){ er.push(e.message); } } P.toast(er.length?(xs.length-er.length)+' fechados. '+er.join(' '):xs.length+' valores fechados.'); P.render(); return; }
      if(a==='pjp-reab'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'',fech:null},'Reaberto para conferir'); P.render(); return; }
      if((a==='pjp-ped'||a==='pjp-cwvai')&&b.dataset.f&&viaCw(c,fDe(b.dataset.f))){ cwVai(c,String(fDe(b.dataset.f).empresa||'').toUpperCase()); return; }
      if(a==='pjp-cwabre'){ cwVai(c,''); return; }
      if(a==='pjp-cwtodos'){ J.cwConf=b.dataset.e; P.render(); return; }
      if(a==='pjp-cwsepr'){ const f=fDe(b.dataset.f); J.cwSep=Object.assign({},J.cwSep,{[f._id]:1}); cwVai(c,String(f.empresa||'').toUpperCase()); P.toast(c.titulo(f.nome).split(' ')[0]+' foi para "Notas separadas". Toque em "Mandar só '+c.titulo(f.nome).split(' ')[0]+'" quando quiser.'); return; }
      if(a==='pjp-cwsepx'){ const f=fDe(b.dataset.f); J.cwSep=Object.assign({},J.cwSep); delete J.cwSep[f._id]; P.render(); return; }
      if(a==='pjp-pedtodos'){ const p=perDe(J.per), xs=pjs(c,p).filter(f=>pesDe(J.per,f._id).st==='fechado'&&(J._vis||[]).includes(f._id)), cw=xs.filter(f=>viaCw(c,f));
        if(cw.length&&!b.dataset.link){ const outros=xs.filter(f=>!viaCw(c,f)), out=[];
          for(const f of outros){ try{ const ped=await pedir(c,J.per,f); out.push({fid:f._id,nome:ped.nome,valor:ped.valor,tel:f.telefone||'',msg:msgDe(c,f,ped)}); }catch(e){ P.erro(e); } }
          if(out.length){ J.mod={k:'lote',xs:out}; P.render(); P.toast('Os das outras empresas recebem o link. Zenith e Nexus: toque em "Conectwork", ao lado do E-mail ao financeiro.'); return; }
          cwVai(c,String(cw[0].empresa||'').toUpperCase()); return; } }
      if(a==='pjp-pedlink'){ const ids=(J.mod&&J.mod.outros)||[]; const out=[]; for(const id of ids){ const f=fDe(id); try{ const ped=await pedir(c,J.per,f); out.push({fid:f._id,nome:ped.nome,valor:ped.valor,tel:f.telefone||'',msg:msgDe(c,f,ped)}); }catch(e){ P.erro(e); } }
        J.mod={k:'lote',xs:out}; P.render(); return; }
      if(a==='pjp-cwret'||a==='pjp-cwvolta'){ const f=fDe(b.dataset.f), k=String(f.empresa||'').toUpperCase(), ret=a==='pjp-cwret';
        await grava(c,J.per,f._id,{cwFora:ret},(ret?'Retirado da nota da ':'Posto de volta na nota da ')+c.titulo(k)+' (Conectwork)'); J.cwFoco=k;
        P.toast(c.titulo(f.nome).split(' ')[0]+(ret?' saiu da nota da '+c.titulo(k)+'. Se a nota já foi aberta no Conectwork, mande de novo para atualizar.':' voltou para a nota da '+c.titulo(k)+'.')); P.render(); return; }
      if(a==='pjp-cwped'){ const k=b.dataset.e, soF=b.dataset.so==='f'; b.disabled=true; J.cwConf=''; const win=cwJanela(); const I=await cwPedir(c,k,Object.assign(soF?{soFechados:true}:{},{win})); J.cwFoco=k;
        P.toast('Nota da '+c.titulo(k)+' aberta no Conectwork ('+I.M.itens.length+' PJ). Confira lá e envie para a '+c.titulo(k)+'.'); P.render(); return; }
      if(a==='pjp-cwsepm'){ const k=b.dataset.e, f=fDe(b.dataset.f); b.disabled=true; const win=cwJanela(); await cwPedir(c,k,{so:f._id,win});
        P.toast('Nota separada de '+c.titulo(f.nome).split(' ')[0]+' aberta no Conectwork. Confira lá e envie para a '+c.titulo(k)+'.'); P.render(); return; }
      if(a==='pjp-cwab'){ const u=cwBase(c,'medicoes'); window.__pjpUltimoCw=u; window.open(u,'_blank','noopener'); return; }
      if(a==='pjp-cwconf'||a==='pjp-cwconfx'){ const k=b.dataset.e, p=perDe(J.per), D=docP(J.per), v=a==='pjp-cwconf'?{em:agora(),por:c.eu()}:null;
        D.cw=Object.assign({},D.cw,{[k]:Object.assign({},(D.cw||{})[k]||{},{conf:v})}); J.docs[J.per]=D;
        await P.db().doc(COL+'/'+J.per).set({pid:J.per,de:p.de,ate:p.ate,em:agora(),cw:{[k]:{conf:v}}},{merge:true});
        P.toast(v?'Medição da '+c.titulo(k)+' marcada como enviada no Conectwork.':'Voltou para "falta enviar".'); P.render(); return; }
      if(a==='pjp-cwnota'){ const k=b.dataset.e; await cwEmpMarca(c,k,'nota',{em:agora(),por:c.eu()},x=>['pedido','chegou'].includes(x.st)?{st:'conferida',conf:{em:agora(),por:c.eu(),via:'conectwork-empresa'}}:null,'Nota da '+c.titulo(k)+' para a Colafix conferida'); P.render(); return; }
      if(a==='pjp-cwnotax'){ const k=b.dataset.e; await cwEmpMarca(c,k,'nota',null,x=>x.st==='conferida'&&x.conf&&x.conf.via==='conectwork-empresa'?{st:'pedido',conf:null}:null,'Nota da '+c.titulo(k)+' desfeita'); P.render(); return; }
      if(a==='pjp-cwpago'){ const k=b.dataset.e; await cwEmpMarca(c,k,'pago',{em:agora(),por:c.eu(),data:P.hojeStr()},x=>x.st&&x.st!=='pago'?{st:'pago',pago:{em:agora(),por:c.eu(),data:P.hojeStr(),de:x.st,via:'empresa'}}:null,'Colafix pagou a '+c.titulo(k)); P.render(); return; }
      if(a==='pjp-cwpagox'){ const k=b.dataset.e; await cwEmpMarca(c,k,'pago',null,x=>x.st==='pago'&&x.pago&&x.pago.via==='empresa'?{st:x.pago.de||'conferida',pago:null}:null,'Pagamento da '+c.titulo(k)+' desfeito'); P.render(); return; }
      if(a==='pjp-cwok'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'conferida',conf:{em:agora(),por:c.eu(),via:'conectwork'}},'Nota conferida no Conectwork'); P.render(); return; }
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
      if(a==='pjp-pedx'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(!confirm('Cancelar o pedido de nota de '+c.titulo(f.nome)+'?'+(pedCw(x)?' No Conectwork, cancele a medição lá também.':' O link deixa de valer.'))) return;
        if(x.ped&&x.ped.t) await P.db().doc(PED+'/'+x.ped.t).set({usado:true,cancelado:true,usadoEm:agora()},{merge:true}); await grava(c,J.per,f._id,{st:'fechado',ped:null},'Pedido de nota cancelado'); P.render(); return; }
      if(a==='pjp-nver'){ const x=pesDe(J.per,b.dataset.f); if(!x.nota) return; const g=await P.db().doc(ENV+'/'+x.nota.t).get(); const e=g.exists?g.data():null; if(!e||!e.d) return P.toast('O arquivo da nota não está mais guardado.');
        const bin=atob(e.d), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); const url=URL.createObjectURL(new Blob([u8],{type:e.tipo||'application/octet-stream'}));
        const w=window.open(url,'_blank'); if(!w){ const l=document.createElement('a'); l.href=url; l.download=e.n||'nota'; document.body.appendChild(l); l.click(); l.remove(); } window.__pjpUltimaNota=e.n; return; }
      if(a==='pjp-nok'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'conferida',conf:{em:agora(),por:c.eu()}},'Nota conferida'); P.render(); return; }
      if(a==='pjp-nnao'){ const f=fDe(b.dataset.f); J.mod={k:'nao',fid:f._id,nome:c.titulo(f.nome)}; P.render(); return; }
      if(a==='pjp-nnaook'){ const f=fDe(b.dataset.f), m=String(document.getElementById('pjp-nmot').value||'').trim(); await grava(c,J.per,f._id,{st:'fechado',ped:null,nota:null},'Pediu outra nota'+(m?': '+m:'')); J.mod=null; P.render(); return; }
      if(a==='pjp-pago'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); if(!x.st||!x.fech) return P.toast('Feche o valor antes de marcar pago.'); await grava(c,J.per,f._id,{st:'pago',pago:{em:agora(),por:c.eu(),data:P.hojeStr(),de:x.st}},'Marcado como pago'+(x.st!=='conferida'?' (antes da nota conferida)':'')); P.render(); return; }
      if(a==='pjp-pagox'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id); await grava(c,J.per,f._id,{st:(x.pago&&x.pago.de)||'conferida',pago:null},'Pago desfeito'); P.render(); return; }
      if(a==='pjp-xls'){ await excel(c); return; } if(a==='pjp-pdf'){ await pdf(c); return; }
    }catch(e){ if(e&&e.aviso) P.toast(e.message); else P.erro(e); } });
  document.addEventListener('keydown',ev=>{ if(ev.key!=='Escape'||!C) return; if(J.mod){ J.mod=null; C.P.render(); } else if(J.edDia){ J.edDia=null; C.P.render(); } else if(J.ab){ J.ab=''; C.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&C&&J.edDia&&ev.target&&['pjp-ce','pjp-cs','pjp-cm'].includes(ev.target.id)){ ev.preventDefault(); const b=document.querySelector('[data-act="pjp-dsalva"]'); if(b) b.click(); } });
  window.RHPJPag={_fin:{finAbrir,finHtml,finTexto,finAssunto},render,avisos,_J:J,_calc:{contaDia,perDe,perMove,lerXml,qsDe,ptoImporta:(f)=>ptoImporta(C,f),diaPas:(f,d)=>diaPas(C,f,d,leitDe(C,f).l)}};
})();
