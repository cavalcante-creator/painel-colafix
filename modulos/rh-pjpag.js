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
  const num=v=>{ if(typeof v==='number') return v; const s=String(v||'').replace(/[^\d,.-]/g,''); if(!s) return 0; return /,\d{1,2}$/.test(s)?+s.replace(/\./g,'').replace(',','.'):+s.replace(/,/g,'')||0; };
  const agora=()=>new Date().toISOString();
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
  /* ---------- pessoas ---------- */
  const pjs=(c,p)=>(c.R.func||[]).filter(f=>f&&!f.removido&&f.tipo==='PJ'&&f.nome&&(f.status!=='Desligado'||(f.desligamento&&f.desligamento>=p.de))&&(!f.admissao||f.admissao<=p.ate))
    .sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
  const horDe=(c,f)=>{ const g=cfg(c), x=f.pjPag||{}; return {ini:x.ini||g.ini,fim:x.fim||g.fim,intv:x.intv!=null&&x.intv!==''?+x.intv:+g.intv,tol:+g.tol,dentro:!!g.dentro}; };
  const vhDe=(c,f)=>{ const x=f.pjPag||{}; if(+x.vh>0) return +x.vh; const s=num(f.salario); return s>0?Math.round(s/(+cfg(c).horasMes||220)*100)/100:0; };
  const empDe=(c,f)=>{ const k=String(f.empresa||'').toUpperCase(); return (c.EMP_DOC||{})[k]||{nome:f.empresa||'',cnpj:''}; };
  /* chave do Face ID: o CPF do cadastro; sem CPF (ou CPF que não aparece), pelo nome */
  function chaveFid(c,f,dados){ const P0=(dados&&dados.pessoas)||{}, cpf=dig(f.cpf).padStart(11,'0');
    if(dig(f.cpf)&&P0[cpf]) return cpf; const n=norm(f.nome); if(!n) return cpf||'';
    const ws=n.split(' '), pu=ws[0]+' '+ws[ws.length-1]; let k1='', k2='';
    for(const [k,p] of Object.entries(P0)){ const pn=norm(p&&p.n); if(!pn) continue; if(pn===n){ k1=k; break; } const pw=pn.split(' '); if(pw[0]+' '+pw[pw.length-1]===pu) k2=k2?'#':k; }
    return k1||(k2&&k2!=='#'?k2:'')||(dig(f.cpf)?cpf:''); }
  /* conta da pessoa no período */
  function calcPessoa(c,f,p,x){ const dados=(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes])||null, h=horDe(c,f), vh=vhDe(c,f), k=chaveFid(c,f,dados);
    const aj=(x&&x.aj)||{}, out=[]; let tot=0, alerta=0, comFid=0;
    diasDe(p).forEach(d=>{ const t=k&&dados&&dados.dias&&dados.dias[d]&&dados.dias[d][k]&&dados.dias[d][k].t||[];
      const hs=t.map(s=>String(s).slice(0,5)).filter(s=>/^\d{2}:\d{2}$/.test(s)).sort(); if(hs.length) comFid++;
      let e=hs[0]||'', s=hs.length>1?hs[hs.length-1]:''; const a=aj[d]; if(a&&(a.e||a.s||a.zero)){ e=a.zero?'':(a.e||e); s=a.zero?'':(a.s||s); }
      const r=contaDia(e,s,h), dw=new Date(d+'T12:00:00').getDay(); let fl='';
      if(!(a&&(a.e||a.s||a.zero))){ if(hs.length===1){ fl='Só uma passagem'; alerta++; } }
      out.push({d,dw,hs,e,s,E:r.E,S:r.S,m:r.m,aj:!!(a&&(a.e||a.s||a.zero)),mot:a&&a.mot||'',fl}); tot+=r.m; });
    const fixo=+((f.pjPag||{}).fixo)||0, desc=num(x&&x.desc), bruto=fixo>0?fixo:Math.round(hDec(tot)*vh*100)/100;
    return {f,k,h,vh,dias:out,min:tot,fixo,bruto,desc,valor:Math.max(0,Math.round((bruto-desc)*100)/100),alerta,comFid,semFid:!dados||!comFid,dados:!!dados}; }
  /* ---------- banco ---------- */
  function assina(c,pid){ const P=c.P; if(!J.sub[pid]){ J.sub[pid]=true;
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
    const ped={t,nome:c.titulo(f.nome),pid,fid:f._id,mes:p.mes,de:p.de,ate:p.ate,perTxt:p.txt,min:fe.min,horas:Math.round(hDec(fe.min)*100)/100,vh:fe.vh,fixo:fe.fixo||0,bruto:fe.bruto,desc:fe.desc||0,descMot:x.descMot||'',valor:fe.valor,
      dias:(fe.dias||[]).filter(d=>d&&d.m>0),tomador:{nome:emp.nome||'',cnpj:emp.cnpj||''},prest:{cnpj:fCNPJ(f.cnpj||''),nome:f.razaoPJ||''},
      servico:'Prestação de serviços'+(f.funcao?' de '+c.cargo(f.funcao).toLowerCase():'')+' no período de '+br(p.de)+' a '+br(p.ate),criado:agora(),ateMs,usado:false,porNome:c.eu()};
    await c.P.db().doc(PED+'/'+t).set(ped);
    await grava(c,pid,f._id,{st:'pedido',ped:{t,em:agora(),por:c.eu(),valor:fe.valor,mes:p.mes,ateMs}},'Nota pedida ('+R$(fe.valor)+')');
    return ped; }
  /* ---------- tela ---------- */
  const css=`<style id="pjp-css">
  .pjp-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
  .pjp-per{display:inline-flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--line,#E1E7EB);border-radius:12px;padding:3px}
  .pjp-per b{padding:0 10px;font-size:15px;font-weight:600;white-space:nowrap}
  .pjp-per button{border:0;background:none;height:34px;min-width:34px;border-radius:9px;cursor:pointer;font-size:18px;color:var(--teal-strong)}
  .pjp-per button:hover{background:var(--surface-2,#EEF2F5)}
  .pjp-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}
  .pjp-k>div{background:var(--surface);border-radius:14px;padding:12px 14px;box-shadow:0 1px 2px rgba(20,40,60,.06)}
  .pjp-k small{display:block;font-size:12px;color:var(--muted)}.pjp-k b{display:block;font-size:24px;font-weight:400;margin-top:2px}
  .pjp-av{padding:10px 14px;border-radius:12px;background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310);margin-bottom:10px;font-size:14px}
  .pjp-t{width:100%;border-collapse:collapse;font-size:14px}.pjp-t th{font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);text-align:left;padding:8px;border-bottom:1px solid var(--line,#E1E7EB);font-weight:600}
  .pjp-t td{padding:10px 8px;border-bottom:1px solid var(--line,#E1E7EB);vertical-align:top}.pjp-t td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .pjp-t small{display:block;color:var(--muted);font-size:12.5px}.pjp-nm{font-weight:600;background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--teal-strong);cursor:pointer;text-align:left}
  .pjp-st{display:inline-block;font-size:12.5px;font-weight:600;padding:2px 9px;border-radius:999px;white-space:nowrap}
  .pjp-st.warn{background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310)}.pjp-st.ok{background:var(--ok-tint,#E3F0E8);color:var(--ok-ink,#2F6047)}.pjp-st.teal{background:var(--teal-tint,#E2ECF1);color:var(--teal-strong)}
  .pjp-ac{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.pjp-ac .btn{height:34px;padding:0 12px;font-size:13.5px}
  .pjp-det td{background:var(--surface-2,#F6F8FA);padding:14px}
  .pjp-dg{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px}@media(max-width:1100px){.pjp-dg{grid-template-columns:1fr}}
  .pjp-dias{width:100%;border-collapse:collapse;font-size:13.5px;background:var(--surface);border-radius:10px;overflow:hidden}.pjp-dias th,.pjp-dias td{padding:5px 8px;border-bottom:1px solid var(--line,#E1E7EB);text-align:left}
  .pjp-dias tr.fds td{color:var(--muted)}.pjp-dias tr.al td{background:var(--warn-tint,#FBF1DC)}.pjp-dias tr.aj td:first-child{box-shadow:inset 3px 0 var(--teal)}
  .pjp-dias input[type=time]{width:92px;height:30px;padding:0 4px;font:inherit;border:1px solid var(--line,#E1E7EB);border-radius:7px;background:var(--surface)}
  .pjp-dias .ps{color:var(--muted);font-size:12px}
  .pjp-box{background:var(--surface);border-radius:12px;padding:12px 14px;margin-bottom:10px}.pjp-box h4{margin:0 0 8px;font-size:14px}
  .pjp-box label{display:block;font-size:12.5px;color:var(--muted);margin-top:8px}.pjp-box input,.pjp-box textarea,.pjp-box select{width:100%;height:36px;padding:0 8px;border:1px solid var(--line,#E1E7EB);border-radius:8px;font:inherit;background:var(--surface);color:inherit}
  .pjp-box textarea{height:auto;padding:8px}.pjp-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 8px}
  .pjp-pb{color:var(--crit-ink,#8E3A33);font-size:13px;margin:4px 0 0;padding-left:18px}
  .pjp-fundo{position:fixed;inset:0;background:rgba(10,25,35,.42);z-index:900;display:grid;place-items:center;padding:16px}
  .pjp-mod{background:var(--surface);border-radius:18px;max-width:640px;width:100%;max-height:90vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
  .pjp-mod h3{margin:0 0 4px}.pjp-mod textarea{width:100%;min-height:130px;padding:10px;border:1px solid var(--line,#E1E7EB);border-radius:10px;font:inherit;background:var(--surface);color:inherit}
  .pjp-mod .lk{display:block;word-break:break-all;background:var(--surface-2,#EEF2F5);padding:8px 10px;border-radius:8px;font-size:13px;margin:8px 0}
  .pjp-lote li{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line,#E1E7EB)}.pjp-lote{list-style:none;margin:8px 0;padding:0}
  </style>`;
  const btn=(a,t,extra,cl)=>`<button class="btn ${cl||'sec'}" data-act="${a}" ${extra||''}>${t}</button>`;
  function acoes(c,pid,f,x,r){ const fa=`data-f="${c.esc(f._id)}"`, st=x.st||'';
    if(st==='') return btn('pjp-fech','Fechar valor',fa,'');
    if(st==='fechado') return btn('pjp-reab','Reabrir',fa)+btn('pjp-ped','Pedir nota',fa,'');
    if(st==='pedido') return btn('pjp-pedx','Cancelar pedido',fa)+btn('pjp-env','Mandar de novo',fa,'');
    if(st==='chegou') return btn('pjp-nver','Ver nota',fa)+btn('pjp-nnao','Pedir outra',fa)+btn('pjp-nok','Está certa',fa,'');
    if(st==='conferida') return btn('pjp-nver','Ver nota',fa)+btn('pjp-pago','Marcar pago',fa,'');
    if(st==='pago') return btn('pjp-nver','Ver nota',fa)+btn('pjp-pagox','Desfazer pago',fa);
    return ''; }
  function detalhe(c,pid,r,x){ const esc=c.esc, f=r.f, ed=!(x.st), h=r.h, pj=f.pjPag||{}, fa=`data-f="${esc(f._id)}"`;
    const dn=['dom','seg','ter','qua','qui','sex','sáb'];
    const linhas=r.dias.map(d=>`<tr class="${d.dw===0||d.dw===6?'fds':''} ${d.fl?'al':''} ${d.aj?'aj':''}"><td>${dn[d.dw]} ${brc(d.d)}</td>
      <td class="ps">${d.hs.length?esc(d.hs.join(' · ')):'—'}</td>
      <td>${ed?`<input type="time" data-pjp-dia="e" data-d="${d.d}" ${fa} value="${esc(d.e)}">`:esc(d.e||'—')}</td>
      <td>${ed?`<input type="time" data-pjp-dia="s" data-d="${d.d}" ${fa} value="${esc(d.s)}">`:esc(d.s||'—')}</td>
      <td>${d.m?hTxt(d.m):'—'}${d.E!=null&&d.S!=null&&d.m?`<span class="ps"> (${hhmm(d.E)}–${hhmm(d.S)})</span>`:''}</td>
      <td class="ps">${d.fl?'<b style="color:var(--warn-ink,#7A5310)">'+esc(d.fl)+'</b> ':''}${d.aj?'ajustado'+(d.mot?': '+esc(d.mot):'')+(ed?` <button class="lnk" data-act="pjp-diax" data-d="${d.d}" ${fa}>voltar ao Face ID</button>`:''):''}</td></tr>`).join('');
    const pr=x.nota&&x.nota.probs&&x.nota.probs.length?`<ul class="pjp-pb">${x.nota.probs.map(p=>'<li>'+esc(p)+'</li>').join('')}</ul>`:'';
    return `<tr class="pjp-det"><td colspan="8"><div class="pjp-dg"><div>
      <table class="pjp-dias"><thead><tr><th>Dia</th><th>Passagens no Face ID</th><th>Entrada</th><th>Saída</th><th>Horas</th><th></th></tr></thead><tbody>${linhas}</tbody></table>
      <p class="sub" style="margin:8px 0 0">Entrada e saída a até ${h.tol} min do horário (${h.ini} às ${h.fim}) contam como o horário certo; o intervalo de ${h.intv} min sai de cada dia.${h.dentro?' Não conta antes do início nem depois do fim.':''}${ed?' Para corrigir um dia (esqueceu de passar), digite a entrada ou a saída.':''}</p></div>
      <div>${x.nota?`<div class="pjp-box"><h4>Nota ${x.nota.num?'nº '+esc(x.nota.num):''}</h4><div>${R$(x.nota.valor)} · ${x.nota.conf==='ok'?'<b style="color:var(--ok-ink,#2F6047)">bate com o pedido</b>':x.nota.conf==='dif'?'<b style="color:var(--crit-ink)">tem diferença</b>':'conferir à mão'}</div>${pr}${x.nota.obs?`<small>Recado do PJ: ${esc(x.nota.obs)}</small>`:''}</div>`:''}
      <div class="pjp-box"><h4>Desconto</h4>${ed?`<label>Valor (R$)</label><input data-pjp-c="desc" ${fa} inputmode="decimal" value="${x.desc?esc(n2(x.desc)):''}" placeholder="0,00"><label>Motivo</label><input data-pjp-c="descMot" ${fa} value="${esc(x.descMot||'')}" maxlength="120">`:`<div>${x.desc?R$(x.desc)+(x.descMot?' · '+esc(x.descMot):''):'Sem desconto'}</div>`}</div>
      <div class="pjp-box"><h4>Horário e valor desta pessoa</h4>
        <div class="pjp-g3"><div><label>Entra</label><input type="time" data-pjp-p="ini" value="${esc(pj.ini||'')}" placeholder="${esc(h.ini)}"></div><div><label>Sai</label><input type="time" data-pjp-p="fim" value="${esc(pj.fim||'')}"></div><div><label>Intervalo (min)</label><input data-pjp-p="intv" inputmode="numeric" value="${pj.intv!=null?esc(pj.intv):''}" placeholder="${esc(h.intv)}"></div></div>
        <label>Valor da hora (R$)${!(+pj.vh>0)&&r.vh?' · hoje: salário ÷ '+cfg(c).horasMes:''}</label><input data-pjp-p="vh" inputmode="decimal" value="${+pj.vh>0?esc(n2(pj.vh)):''}" placeholder="${r.vh?esc(n2(r.vh)):'0,00'}">
        <label>Ou valor fixo no período (R$, não conta horas)</label><input data-pjp-p="fixo" inputmode="decimal" value="${+pj.fixo>0?esc(n2(pj.fixo)):''}" placeholder="—">
        <button class="btn sec" style="margin-top:10px" data-act="pjp-psalva" ${fa}>Salvar no cadastro</button></div>
      ${(x.hist||[]).length?`<div class="pjp-box"><h4>Histórico</h4>${x.hist.slice().reverse().map(h=>`<small>${esc(br(h.em.slice(0,10)))} ${esc(h.em.slice(11,16))} · ${esc(h.t)} · ${esc(h.por||'')}</small>`).join('')}</div>`:''}
      </div></div></td></tr>`; }
  function modal(c){ const M=J.mod, esc=c.esc; if(!M) return '';
    if(M.k==='cfg'){ const g=cfg(c);
      return `<div class="pjp-fundo" data-pjp-fundo><div class="pjp-mod" role="dialog" aria-label="Configurar o pagamento dos PJ"><h3>Como o painel faz a conta</h3><p class="sub">Vale para todos os PJ; o horário e o valor da hora de cada pessoa ficam no detalhe dela.</p>
        <div class="pjp-box"><label>Período de pagamento</label><select id="pjp-cmodo"><option value="quinzena" ${g.modo==='quinzena'?'selected':''}>Quinzena (1 a 15 e 16 ao fim do mês)</option><option value="mes" ${g.modo==='mes'?'selected':''}>Mês inteiro</option></select>
          <div class="pjp-g3"><div><label>Horário padrão: entra</label><input type="time" id="pjp-cini" value="${esc(g.ini)}"></div><div><label>Sai</label><input type="time" id="pjp-cfim" value="${esc(g.fim)}"></div><div><label>Intervalo (min)</label><input id="pjp-cintv" inputmode="numeric" value="${esc(g.intv)}"></div></div>
          <div class="pjp-g3"><div><label>Tolerância (min)</label><input id="pjp-ctol" inputmode="numeric" value="${esc(g.tol)}"></div><div><label>Horas por mês (salário ÷)</label><input id="pjp-chm" inputmode="numeric" value="${esc(g.horasMes)}"></div><div><label>Link vale (dias)</label><input id="pjp-cdias" inputmode="numeric" value="${esc(g.dias)}"></div></div>
          <label style="display:flex;gap:8px;align-items:center;color:inherit;font-size:14px;margin-top:12px"><input type="checkbox" id="pjp-cdentro" style="width:20px;height:20px" ${g.dentro?'checked':''}> Não contar o tempo antes do início nem depois do fim do horário</label>
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
  function render(c){ C=c; const esc=c.esc; if(!J.per) J.per=perAtual(c); const pid=J.per, p=perDe(pid); assina(c,pid);
    const D=docP(pid), xs=pjs(c,p), linhas=[], tot={n:0,min:0,val:0,st:{}}; let semFid=0, alerta=0;
    const emps=[...new Set(xs.map(f=>String(f.empresa||'').toUpperCase()).filter(Boolean))].sort();
    const q=norm(J.q);
    const rs=xs.map(f=>{ const x=(D.pes||{})[f._id]||{}; const r=x.st&&x.fech?Object.assign(calcPessoa(c,f,p,x),{min:x.fech.min,valor:x.fech.valor,bruto:x.fech.bruto,desc:x.fech.desc||0}):calcPessoa(c,f,p,x); return {f,x,r}; })
      .filter(({f})=>(!J.emp||String(f.empresa||'').toUpperCase()===J.emp)&&(!q||norm(f.nome+' '+(f.setor||'')+' '+(f.empresa||'')).includes(q)));
    rs.forEach(({f,x,r})=>{ tot.n++; tot.min+=r.min; tot.val+=r.valor; const st=x.st||''; tot.st[st]=(tot.st[st]||0)+1; if(r.semFid&&!r.fixo&&!x.st) semFid++; if(r.alerta&&!x.st) alerta++;
      const [stT,stC]=ST[st]||ST[''], emp=String(f.empresa||'').toUpperCase(), ab=J.ab===f._id;
      linhas.push(`<tr><td><button class="pjp-nm" data-act="pjp-ab" data-f="${esc(f._id)}" aria-expanded="${ab}">${esc(c.titulo(f.nome))}</button><small>${esc([emp,f.setor].filter(Boolean).join(' · '))}</small></td>
        <td><small style="color:inherit">${esc(r.h.ini)} às ${esc(r.h.fim)}</small><small>intervalo ${r.h.intv} min</small></td>
        <td class="n">${r.fixo?'<small>valor fixo</small>':hTxt(r.min)+'<small>'+n2(hDec(r.min))+' h</small>'}</td>
        <td class="n">${r.fixo?'—':r.vh?R$(r.vh):'<b style="color:var(--crit-ink)">sem valor</b>'}</td>
        <td class="n">${r.desc?'− '+R$(r.desc):'—'}</td><td class="n"><b>${R$(r.valor)}</b></td>
        <td><span class="pjp-st ${stC}">${stT}</span>${!st&&r.semFid&&!r.fixo?'<small style="color:var(--crit-ink)">Sem passagem no Face ID</small>':''}${!st&&r.alerta?`<small style="color:var(--warn-ink,#7A5310)">${r.alerta} dia${r.alerta>1?'s':''} para conferir</small>`:''}${x.nota&&x.nota.conf==='dif'?'<small style="color:var(--crit-ink)">Nota com diferença</small>':''}</td>
        <td><div class="pjp-ac">${acoes(c,pid,f,x,r)}</div></td></tr>`+(ab?detalhe(c,pid,r,x):'')); });
    const nAbre=rs.filter(({x})=>!x.st).length, nFech=rs.filter(({x})=>x.st==='fechado').length;
    const dadosOk=!!(window.RHAlmoco&&window.RHAlmoco._A&&window.RHAlmoco._A.dados[p.mes]);
    const dias=dadosOk?Object.keys(window.RHAlmoco._A.dados[p.mes].dias||{}).filter(d=>d>=p.de&&d<=p.ate).sort():[];
    const avFid=!dadosOk?'<div class="pjp-av">Carregando o Face ID do mês…</div>':!dias.length?`<div class="pjp-av">Ainda não tem Face ID importado de ${esc(p.curto)}. Importe o CSV em Almoço/café (ou espere o robô do Face ID).</div>`
      :dias[dias.length-1]<p.ate&&p.ate<c.P.hojeStr()&&diasDe(p).some(d=>d>dias[dias.length-1]&&![0,6].includes(new Date(d+'T12:00:00').getDay()))?`<div class="pjp-av">O Face ID importado vai até ${brc(dias[dias.length-1])}; o período vai até ${brc(p.ate)}. Importe o resto antes de fechar.</div>`:'';
    const acTopo=`${btn('pjp-cfg','Como é feita a conta')}${btn('pjp-xls','Excel')}${btn('pjp-pdf','Baixar PDF','','')}`;
    return css+c.topo('Pagamento dos PJ','Horas pelo Face ID, valor de cada PJ e o pedido da nota fiscal por link. O PJ manda a nota pelo link e o painel confere.',acTopo,'RH · PAGAMENTO DOS PJ')+
      `<div class="pjp-bar"><span class="pjp-per"><button data-act="pjp-per" data-v="-1" aria-label="Período anterior">‹</button><b>${esc(p.txt)}</b><button data-act="pjp-per" data-v="1" aria-label="Próximo período">›</button></span>
        ${pid!==perAtual(c)?btn('pjp-per','Voltar ao atual','data-v="0"'):''}
        <select id="pjp-emp" aria-label="Empresa" style="height:38px;border-radius:10px;border:1px solid var(--line,#E1E7EB);padding:0 8px;background:var(--surface);color:inherit;font:inherit"><option value="">Todas as empresas</option>${emps.map(e=>`<option ${J.emp===e?'selected':''}>${esc(e)}</option>`).join('')}</select>
        <input id="pjp-q" placeholder="Procurar PJ" value="${esc(J.q)}" style="height:38px;border-radius:10px;border:1px solid var(--line,#E1E7EB);padding:0 10px;background:var(--surface);color:inherit;font:inherit;min-width:180px">
        <span style="flex:1"></span>${nAbre?btn('pjp-fechtodos','Fechar o valor de todos ('+nAbre+')','',''):''}${nFech?btn('pjp-pedtodos','Pedir nota a todos os fechados ('+nFech+')','',''):''}</div>
      ${avFid}${semFid?`<div class="pjp-av">${semFid} PJ sem passagem no Face ID no período: confira o CPF no cadastro (o Face ID liga pelo CPF ou pelo nome).</div>`:''}
      <div class="pjp-k"><div><small>PJ no período</small><b>${tot.n}</b></div><div><small>Horas</small><b>${hTxt(tot.min)}</b></div><div><small>Total a pagar</small><b>${R$(tot.val)}</b></div>
        <div><small>Notas pedidas</small><b>${(tot.st.pedido||0)}</b></div><div><small>Notas para conferir</small><b>${(tot.st.chegou||0)}</b></div><div><small>Pagos</small><b>${(tot.st.pago||0)}</b></div></div>
      <section class="card" style="padding:6px 10px">${rs.length?`<table class="pjp-t"><thead><tr><th>PJ</th><th>Horário</th><th style="text-align:right">Horas</th><th style="text-align:right">Valor/hora</th><th style="text-align:right">Desconto</th><th style="text-align:right">Total</th><th>Situação</th><th></th></tr></thead><tbody>${linhas.join('')}</tbody></table>`
        :`<div class="empty">${xs.length?'Nenhum PJ com esse filtro.':'Nenhum PJ ativo no cadastro do RH (Funcionários com vínculo PJ).'}</div>`}</section>`+modal(c); }
  /* ---------- relatórios ---------- */
  function linhasRel(c){ const pid=J.per, p=perDe(pid), D=docP(pid);
    return pjs(c,p).filter(f=>!J.emp||String(f.empresa||'').toUpperCase()===J.emp).map(f=>{ const x=(D.pes||{})[f._id]||{}; const r=calcPessoa(c,f,p,x); const fe=x.st&&x.fech; return {f,x,r,min:fe?fe.min:r.min,valor:fe?fe.valor:r.valor,desc:fe?fe.desc||0:r.desc,bruto:fe?fe.bruto:r.bruto,vh:fe?fe.vh:r.vh}; }); }
  async function excel(c){ const p=perDe(J.per), L=linhasRel(c);
    const res=L.map(o=>[c.titulo(o.f.nome),String(o.f.empresa||'').toUpperCase(),o.f.setor||'',o.r.h.ini+' às '+o.r.h.fim,+(hDec(o.min).toFixed(2)),o.vh||0,o.bruto,o.desc,o.x.descMot||'',o.valor,(ST[o.x.st||'']||ST[''])[0],o.x.nota&&o.x.nota.num||'']);
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
    if(!r.fixo&&!r.vh) throw new Error(c.titulo(f.nome)+': falta o valor da hora (abra a pessoa e preencha).');
    const fech={min:r.min,vh:r.vh,fixo:r.fixo,bruto:r.bruto,desc:r.desc,valor:r.valor,dias:r.dias.map(d=>({d:d.d,e:d.E!=null?hhmm(d.E):'',s:d.S!=null?hhmm(d.S):'',m:d.m})),h:r.h,em:agora(),por:c.eu()};
    await grava(c,pid,f._id,{st:'fechado',fech},'Valor fechado: '+(r.fixo?'fixo ':hTxt(r.min)+' × '+R$(r.vh)+' ')+(r.desc?'− '+R$(r.desc)+' ':'')+'= '+R$(r.valor)); }
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!C||!t||!t.closest) return; const P=C.P;
    try{
      if(t.id==='pjp-emp'){ J.emp=t.value; P.render(); return; }
      if(t.dataset.pjpDia){ const f=fDe(t.dataset.f), d=t.dataset.d, x=pesDe(J.per,f._id); if(x.st) return; const aj=Object.assign({},x.aj||{}), cur=Object.assign({},aj[d]||{});
        cur[t.dataset.pjpDia]=t.value||''; if(!cur.e&&!cur.s){ aj[d]=null; } else { cur.por=C.eu(); cur.em=agora(); cur.mot=cur.mot||'corrigido à mão'; aj[d]=cur; }
        await grava(C,J.per,f._id,{aj}); P.render(); return; }
      if(t.dataset.pjpC){ const f=fDe(t.dataset.f); if(pesDe(J.per,f._id).st) return; const k=t.dataset.pjpC; await grava(C,J.per,f._id,{[k]:k==='desc'?num(t.value):String(t.value||'').slice(0,120)}); P.render(); return; }
    }catch(e){ P.erro(e); } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(!C||!t||t.id!=='pjp-q') return; J.q=t.value; clearTimeout(J._qt); J._qt=setTimeout(()=>{ C.P.render(); setTimeout(()=>{ const i=document.getElementById('pjp-q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } },0); },350); });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-pjp-fundo]'); if(fu&&ev.target===fu){ J.mod=null; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="pjp-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, c=C;
    if(a==='pjp-wa'){ if(J.mod&&J.mod.k==='ped'){ const m=document.getElementById('pjp-pmsg'); if(m&&m.value!==J.mod.msg){ ev.preventDefault(); J.mod.msg=m.value; const tel=dig(J.mod.tel); window.open((tel?'https://wa.me/'+(tel.length<=11?'55':'')+tel:'https://wa.me/')+'?text='+encodeURIComponent(m.value),'_blank','noopener'); }
        const f=fDe(J.mod.fid); if(f){ const x=pesDe(J.per,f._id); grava(c,J.per,f._id,{ped:Object.assign({},x.ped,{via:(x.ped&&x.ped.via||[]).concat(['whatsapp'])})}).catch(()=>{}); } } window.__pjpUltimoWa=b.href; return; }
    ev.preventDefault();
    try{
      if(a==='pjp-per'){ const v=+b.dataset.v; J.per=v===0?perAtual(c):perMove(J.per,v); J.ab=''; P.render(); return; }
      if(a==='pjp-ab'){ J.ab=J.ab===b.dataset.f?'':b.dataset.f; P.render(); return; }
      if(a==='pjp-modx'){ J.mod=null; P.render(); return; }
      if(a==='pjp-cfg'){ J.mod={k:'cfg'}; P.render(); return; }
      if(a==='pjp-cfgok'){ const g=id=>document.getElementById(id), o={modo:g('pjp-cmodo').value,ini:g('pjp-cini').value||PAD.ini,fim:g('pjp-cfim').value||PAD.fim,intv:Math.max(0,parseInt(g('pjp-cintv').value,10)||0),tol:Math.max(0,parseInt(g('pjp-ctol').value,10)||0),
          horasMes:Math.max(1,parseInt(g('pjp-chm').value,10)||220),dias:Math.max(2,Math.min(90,parseInt(g('pjp-cdias').value,10)||30)),dentro:g('pjp-cdentro').checked,msg:String(g('pjp-cmsg').value||'').slice(0,800)||PAD.msg};
        const ant=cfg(c).modo; c.R.cfg.pjPag=o; await P.db().doc('rh/config').set({pjPag:o},{merge:true}); if(ant!==o.modo) J.per=perAtual(c); J.mod=null; P.toast('Configuração do pagamento dos PJ salva.'); P.render(); return; }
      if(a==='pjp-psalva'){ const f=fDe(b.dataset.f), box=b.closest('.pjp-box'), v=k=>box.querySelector(`[data-pjp-p="${k}"]`).value;
        const o={ini:v('ini')||'',fim:v('fim')||'',intv:v('intv')===''?null:Math.max(0,parseInt(v('intv'),10)||0),vh:num(v('vh'))||0,fixo:num(v('fixo'))||0};
        f.pjPag=o; await P.db().doc('rh/dados/funcionarios/'+f._id).set({pjPag:o},{merge:true}); P.toast('Horário e valor de '+c.titulo(f.nome)+' salvos no cadastro.'); P.render(); return; }
      if(a==='pjp-diax'){ const f=fDe(b.dataset.f), x=pesDe(J.per,f._id), aj=Object.assign({},x.aj||{}); aj[b.dataset.d]=null; await grava(c,J.per,f._id,{aj}); P.render(); return; }
      if(a==='pjp-fech'){ await fechar(c,fDe(b.dataset.f)); P.render(); return; }
      if(a==='pjp-fechtodos'){ const p=perDe(J.per), xs=pjs(c,p).filter(f=>!pesDe(J.per,f._id).st&&(!J.emp||String(f.empresa||'').toUpperCase()===J.emp)); const er=[]; b.disabled=true;
        for(const f of xs){ try{ await fechar(c,f); }catch(e){ er.push(e.message); } } P.toast(er.length?(xs.length-er.length)+' fechados. '+er.join(' '):xs.length+' valores fechados.'); P.render(); return; }
      if(a==='pjp-reab'){ const f=fDe(b.dataset.f); await grava(c,J.per,f._id,{st:'',fech:null},'Reaberto para conferir'); P.render(); return; }
      if(a==='pjp-ped'||a==='pjp-env'){ const f=fDe(b.dataset.f); let ped;
        if(a==='pjp-env'){ const x=pesDe(J.per,f._id); const g=await P.db().doc(PED+'/'+x.ped.t).get(); ped=g.exists?Object.assign({t:x.ped.t},g.data()):null; if(!ped) throw new Error('Não achei o pedido. Cancele e peça de novo.'); }
        else ped=await pedir(c,J.per,f);
        J.mod={k:'ped',ped,fid:f._id,tel:f.telefone||'',email:f.email||'',msg:msgDe(c,f,ped)}; P.render(); return; }
      if(a==='pjp-pedtodos'){ const p=perDe(J.per), xs=pjs(c,p).filter(f=>pesDe(J.per,f._id).st==='fechado'&&(!J.emp||String(f.empresa||'').toUpperCase()===J.emp)); b.disabled=true; const out=[];
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
      if(a==='pjp-xls'){ await excel(c); return; } if(a==='pjp-pdf'){ await pdf(c); return; }
    }catch(e){ P.erro(e); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&J.mod&&C){ J.mod=null; C.P.render(); } });
  window.RHPJPag={render,avisos,_J:J,_calc:{contaDia,perDe,perMove,lerXml}};
})();
