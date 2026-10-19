/* ===================== MÓDULO RH (09/10 · novo visual em 12/10) =====================
   Telas (como o exemplo "Painel do RH · exemplos"): Início, Funcionários, Fichas do mês, Documentos e contratos,
   Funções e EPIs, Terceirizados. "Dia a dia", "Controle de EPI" e "Retiradas" saíram do menu em 12/10 (pedido da
   usuária); os dados delas continuam guardados (presenca, retiradas) e estão no histórico do git.
   Dados (só quem tem o módulo RH lê/grava — regra rh/{resto=**} no firestore.rules):
     rh/config                         textos das declarações das fichas · cidade dos documentos
     rh/dados/funcionarios/{id}        cadastro dos funcionários (+ salario, jornada para os contratos)
     rh/dados/funcoes/{id}             EPIs (com CA) e uniformes de cada função
     rh/dados/terceiros/{id}           terceirizados e prazo do contrato
     rh/dados/fichasmes/{AAAA-MM}      situação das fichas do mês: impressas.{funcId}, assinadas.{funcId}
     rh/dados/modelos/{id}             modelos de documento (contratos, termos, declarações)
     rh/dados/docsgerados/{id}         histórico de documentos gerados (quem, quando, assinado anexado, férias, respostas)
     rh/dados/ferias/{id}              férias marcadas ou já tiradas (CLT) · troca dos PJ: ultimaTroca/trocas no cadastro
     no cadastro também: exp {status prorrogado|efetivado|desligado}, nascimento, desligMotivo · terceirizados: docs[] {id,nome,validade,arquivo}
     admissão: admRoteiro, admEntregues[] {nome,em} no cadastro; lista em rh/config.docsAdmissao
     rh/arquivos/lista/{id} + rh/arquivos/partes/{id_n}   PDFs e fichas escaneadas (em pedaços)
   As fichas usam o sistema original (modulos/rh-fichas.html) por uma ponte: window.RHAPI (painel → ficha: window.FICHAS). */
(function(){ const P=window.Painel; if(!P) return;
  const R={cad:'funcoes',terc:[],ft:null,tfil:'ativos',func:[],funcoes:[],epis:[],cadq:{},cfg:{},lido:{},f:null,ff:null,filtro:{q:'',st:'ativos',setor:'',emp:'',tipo:''},salv:false,arqAbrir:null,
    fm:{},esc:{},fv:'mes',fmes:'',ffil:{sit:'todas',q:'',setor:'',n:60},fsel:null,prev:{},
    modelos:[],docs:[],dv:'modelos',dm:null,dprev:false,dg:{funcId:'',modeloId:'',extra:{},resp:{},feriasId:'',guardar:true},dgReg:{},
    fer:[],pzv:'ferias',pzfil:'atencao',ffer:null,fpj:null,fdesl:null,tdoc:null,tdf:null,
    pess:null,adm:null,carga:null,agv:'agenda',agDias:30,relMes:P.hojeStr().slice(0,7),buscaIni:''};
  const COL={terc:'rh/dados/terceiros',func:'rh/dados/funcionarios',funcoes:'rh/dados/funcoes',epis:'rh/dados/epis',fm:'rh/dados/fichasmes',modelos:'rh/dados/modelos',docs:'rh/dados/docsgerados',ferias:'rh/dados/ferias',lista:'rh/arquivos/lista',partes:'rh/arquivos/partes'};
  const ST=['Ativo','Férias','Afastado','Desligado'];
  /* empresas: todo CLT é Colafix; PJ é Zenith ou Nexus (ou outra) */
  const EMP_PJ=[['ZENITH','Zenith'],['NEXUS','Nexus']], EMP_NOME={COLAFIX:'Colafix',ZENITH:'Zenith',NEXUS:'Nexus'};
  /* razão social e CNPJ para os documentos — os mesmos de EMPRESAS_CONHECIDAS em modulos/rh-fichas.html */
  const EMP_DOC={COLAFIX:{nome:'COLFIX INDUSTRIA E COMERCIO LTDA - EPP',cnpj:'08.813.381/0001-30'},ZENITH:{nome:'ZENITH SOLUÇÕES INDUSTRIAIS LTDA',cnpj:'62.944.495/0001-64'} /* 13/10: o certo é -64 (o -93 da planilha não é um CNPJ válido) */,NEXUS:{nome:'NEXUS MANUTENÇÕES LTDA',cnpj:'67.927.237/0001-93'}};
  const empNome=e=>EMP_NOME[e]||e||'';
  const empPadrao=(tipo,txt)=>{ if(tipo!=='PJ') return 'COLAFIX'; const n=String(txt||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase(); return /ZENITH/.test(n)?'ZENITH':/NEXUS/.test(n)?'NEXUS':n.trim(); };
  const esc=P.esc, eu=()=>(P.S.uid&&P.S.nomes&&P.S.nomes[P.S.uid])||'', agora=()=>new Date().toISOString();
  const dig=s=>String(s||'').replace(/\D/g,''), norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase();
  const fCPF=c=>{ c=dig(c); return c.length===11?c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):c; };
  const fCNPJ=c=>{ c=dig(c); return c.length===14?c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):c; };
  const cnpjOk=c=>{ c=dig(c); if(c.length!==14||/^(\d)\1+$/.test(c)) return false; const dv=n=>{ const w=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2]; let s=0; for(let i=0;i<n;i++) s+=+c[i]*w[i]; const r=s%11; return r<2?0:11-r; }; return dv(12)===+c[12]&&dv(13)===+c[13]; };
  /* PJ é identificado pelo CNPJ (pedido de 13/10); CLT pelo CPF */
  const docF=f=>f.tipo==='PJ'&&dig(f.cnpj)?fCNPJ(f.cnpj):fCPF(f.cpf), docRot=f=>f.tipo==='PJ'?'CNPJ':'CPF', docDig=f=>f.tipo==='PJ'&&dig(f.cnpj)?dig(f.cnpj):dig(f.cpf);
  const cpfOk=c=>{ c=dig(c); if(c.length!==11||/^(\d)\1+$/.test(c)) return false; let s=0; for(let i=0;i<9;i++) s+=+c[i]*(10-i); let d=(s*10)%11%10; if(d!==+c[9]) return false; s=0; for(let i=0;i<10;i++) s+=+c[i]*(11-i); d=(s*10)%11%10; return d===+c[10]; };
  const br=d=>d&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
  const dmIso=iso=>{ if(!iso) return ''; const d=new Date(iso); return isNaN(d)?'':String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); };
  const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const DIAS_SEM=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const mesLabel=m=>{ const [y,mm]=String(m).split('-'); return (MESES[+mm-1]||'')+' '+y; };
  const mesNome=m=>MESES[+String(m).split('-')[1]-1]||'';
  const mesTitulo=m=>{ const n=mesNome(m); return n.charAt(0).toUpperCase()+n.slice(1)+' de '+String(m).split('-')[0]; };
  const mesMais=(m,k)=>{ const [y,mm]=m.split('-').map(Number); const d=new Date(y,mm-1+k,1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
  const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
  const titulo=n=>String(n||'').toLowerCase().split(' ').map(w=>!w||['da','de','do','das','dos','e'].includes(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const linkArq=i=>location.origin+location.pathname+'?rhfile='+encodeURIComponent(i);
  const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } }, lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
  R.fmodo=lsGet('rh.fichas.modo')==='setor'?'setor':'lista';
  const ativos=()=>R.func.filter(x=>x.status!=='Desligado');
  const funcaoDe=f=>R.funcoes.find(x=>norm(x.nome)===norm(f&&f.funcao));
  const semEpi=f=>{ const fc=funcaoDe(f); return !fc||!(fc.epis||[]).length; };

  /* ---------- leitura ---------- */
  function iniciar(){ const sub=(k,mk)=>P.inscrever('rh-'+k,mk,snap=>{ R[k]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); R.lido[k]=true; P.rerender(); if(k==='func') setTimeout(()=>aplicarDesligAgendados(),0); if(k==='funcoes'&&!(snap.metadata&&snap.metadata.fromCache)) setTimeout(funcoesPadrao,0); if(k==='modelos'&&!(snap.metadata&&snap.metadata.fromCache)) setTimeout(consertarNomesModelos,0); });
    sub('func',()=>P.db().collection(COL.func).limit(3000)); sub('funcoes',()=>P.db().collection(COL.funcoes).limit(500)); sub('epis',()=>P.db().collection(COL.epis).limit(500)); sub('terc',()=>P.db().collection(COL.terc).limit(1000));
    sub('modelos',()=>P.db().collection(COL.modelos).limit(200)); sub('docs',()=>P.db().collection(COL.docs).orderBy('em','desc').limit(300)); sub('fer',()=>P.db().collection(COL.ferias).limit(3000));
    P.inscrever('rh-fm',()=>P.db().collection(COL.fm).orderBy('mes','desc').limit(14),snap=>{ snap.docs.forEach(d=>{ R.fm[d.id]=d.data(); }); R.lido.fm=true; P.rerender(); });
    P.inscrever('rh-cfg',()=>P.db().collection('rh').limit(5),snap=>{ const d=snap.docs.find(x=>x.id==='config'); R.cfg=d?d.data():{}; R.lido.cfg=true; P.rerender(); setTimeout(funcoesPadrao,0); });
    iniciarMais(); const m=location.search.match(/[?&]rhfile=([^&]+)/); if(m){ R.arqAbrir=decodeURIComponent(m[1]); P.go('rhfichas'); } }

  /* ---------- arquivos (PDF e fichas escaneadas) guardados em pedaços ---------- */
  const PEDACO=900000;
  async function salvarArquivo(meta,b64){ const i=id(), n=Math.ceil(b64.length/PEDACO)||1;
    for(let k=0;k<n;k++) await P.db().doc(COL.partes+'/'+i+'_'+k).set({d:b64.slice(k*PEDACO,(k+1)*PEDACO)});
    await P.db().doc(COL.lista+'/'+i).set(Object.assign({partes:n,tam:Math.round(b64.length*0.75),em:agora(),por:P.S.uid||null,porNome:eu()},meta)); return i; }
  async function abrirArquivo(i){ const g=await P.db().doc(COL.lista+'/'+i).get(); if(!g.exists) throw new Error('Arquivo não encontrado.'); const m=g.data(); let b='';
    for(let k=0;k<m.partes;k++){ const p=await P.db().doc(COL.partes+'/'+i+'_'+k).get(); b+=(p.exists?p.data().d:''); }
    const bin=atob(b), u=new Uint8Array(bin.length); for(let k=0;k<bin.length;k++) u[k]=bin.charCodeAt(k);
    const url=URL.createObjectURL(new Blob([u],{type:m.mime||'application/pdf'})); const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener';
    if(!/^(application\/pdf|image\/)/.test(m.mime||'')) a.download=m.nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
  async function listaArquivos(filtro){ const q=await P.db().collection(COL.lista).limit(2000).get(); return q.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(filtro||(()=>true)); }
  /* abre o que foi guardado: arquivo do painel (?rhfile=) ou link do OneDrive */
  async function abrirUrl(u){ if(!u) return P.toast('Arquivo sem endereço.'); const m=String(u).match(/[?&]rhfile=([^&]+)/); if(m) return abrirArquivo(decodeURIComponent(m[1])); window.open(u,'_blank','noopener'); }
  const lerB64=file=>new Promise((ok,er)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]||''); r.onerror=()=>er(new Error('Não consegui ler o arquivo.')); r.readAsDataURL(file); });

  /* ---------- situação das fichas do mês ---------- */
  const funcPorNome=n=>R.func.find(x=>norm(x.nome)===norm(n));
  async function marcarFichas(mes,campo,itens){ if(!mes||!itens.length) return; const o={};
    itens.forEach(([fid,v])=>{ if(fid) o[fid]=v; }); if(!Object.keys(o).length) return;
    const loc=R.fm[mes]||(R.fm[mes]={mes}); loc[campo]=Object.assign({},loc[campo]||{},o);
    try{ await P.db().doc(COL.fm+'/'+mes).set({mes,[campo]:o,alteradoEm:agora()},{merge:true}); }catch(e){ console.warn('[RH] fichas do mês',e); } P.rerender(); }
  /* fichas escaneadas antes da marcação existir: confere a pasta do mês uma vez por mês (OneDrive ou painel) */
  function escCarregar(m){ if(R.esc[m]||!P.db()) return; R.esc[m]={lista:[],ok:false};
    window.RHAPI.listarArquivosDoMes(m).then(xs=>{ R.esc[m]={lista:xs||[],ok:true}; P.rerender(); },e=>{ console.warn('[RH] escaneadas',e); R.esc[m]={lista:[],ok:true,erro:true}; }); }
  function escDe(m,f){ const E=R.esc[m]; if(!E) return null; const n=norm(f.nome); const a=E.lista.find(x=>norm(x.nome).includes(n)); return a?{url:a.url,em:a.modificado||'',nome:a.nome}:null; }
  function fSit(f,m){ const d=R.fm[m]||{}; const a=(d.assinadas||{})[f._id]||escDe(m,f);
    if(a) return {k:'ass',t:'Assinada'+(a.em?' · '+(/^\d{2}\/\d{2}/.test(a.em)?a.em.slice(0,5):dmIso(a.em)):''),c:'ok',a};
    const i=(d.impressas||{})[f._id];
    if(semEpi(f)) return {k:'semepi',t:'Função sem EPI',c:'crit',i};
    if(i) return {k:'imp',t:'Falta assinar',c:'warn',i};
    return {k:'nao',t:'Não gerada',c:'crit'}; }
  function fResumo(m){ const xs=R.func.filter(f=>noMes(f,m)).map(f=>({f,s:fSit(f,m)})); const c={ass:0,imp:0,nao:0}; xs.forEach(o=>{ c[o.s.k==='semepi'?(o.s.i?'imp':'nao'):o.s.k]++; }); return {xs,c,tot:xs.length}; }

  /* ---------- ponte para o sistema de fichas (as mesmas funções que o Apps Script tinha) ---------- */
  const DIAS=d=>d?br(d):'';
  /* OneDrive ligado: as fichas vão para lá (pasta por mês); senão ficam no painel */
  const OD=()=>window.OneDrive&&window.OneDrive.ativo()?window.OneDrive:null;
  const pastaMes=m=>{ const l=mesLabel(m); return m+' '+l.charAt(0).toUpperCase()+l.slice(1).split(' ')[0]; };
  const odData=iso=>iso?br(String(iso).slice(0,10)):'';
  window.RHAPI={
    getDadosPlanilha: async()=>{ const [f,fu,re,cf]=await Promise.all([P.db().collection(COL.func).limit(3000).get(),P.db().collection(COL.funcoes).limit(500).get(),P.db().collection('rh/dados/retiradas').limit(5000).get(),P.db().doc('rh/config').get()]);
      const FU=f.docs.map(d=>d.data()), FC=fu.docs.map(d=>d.data()), RE=re.docs.map(d=>d.data()), C=cf.exists?cf.data():{};
      const colab=[['Nome','CPF','Função','Setor','Data de admissão','Empresa','Status','Tipo']].concat(FU.map(x=>[x.nome,docF(x),x.funcao||'',x.setor||'',DIAS(x.admissao),x.empresa||'',x.status==='Desligado'&&!(okIso(x.desligamento)&&x.desligamento.slice(0,7)>=P.hojeStr().slice(0,7))?'Inativo':'Ativo',x.tipo==='PJ'?'PJ':'CLT']));
      const cab=(p,s,mx)=>{ const h=['Função']; for(let n=1;n<=mx;n++) h.push(p+' '+n,s+' '+n); return h; };
      const linha=(nome,its,k,mx)=>{ const r=[nome]; for(let n=0;n<mx;n++){ const x=its[n]; r.push(x?x.nome:'',x?(x[k]||''):''); } return r; };
      const epi=[cab('EPI','CA',15)].concat(FC.map(x=>linha(x.nome,x.epis||[],'ca',15)));
      const uni=[cab('Uniforme','Tamanho',9)].concat(FC.map(x=>linha(x.nome,x.uniformes||[],'tam',9)));
      const reg=[['Funcionário','Mês/Ano referência','EPI','CA','Quantidade','Data da retirada','Responsável pela entrega','Confirmação do funcionário','CPF','Observação']].concat(RE.map(x=>[x.funcionario,x.mes?x.mes.slice(5,7)+'/'+x.mes.slice(0,4):'',x.item,x.ca||'',x.qtd,DIAS(x.data),x.responsavel||'',x.confirmacao||'',fCPF(x.cpf),x.obs||'']));
      const modelo=[[C.declUniforme||'',C.declEpi||'']];
      return {colaboradores:colab,epi,uniforme:uni,registros:reg,fichaModelo:modelo}; },
    salvarLotePdfNoDrive: async(mesAno,b64,nome)=>{ nome=nome||('Fichas '+mesLabel(mesAno)+'.pdf'); const od=OD(); if(od){ const r=await od.enviar(pastaMes(mesAno)+'/'+nome,b64,'application/pdf'); return {url:(r&&r.webUrl)||'',nome}; } const i=await salvarArquivo({nome:nome||('Fichas '+mesLabel(mesAno)+'.pdf'),mes:mesAno,mime:'application/pdf',tipo:'lote'},b64); return {url:linkArq(i),nome}; },
    salvarFichaEscaneada: async(mesAno,nomeFunc,b64,mime,ext)=>{ const ml=mesLabel(mesAno); const nome=nomeFunc+' - '+ml.charAt(0).toUpperCase()+ml.slice(1)+'.'+(ext||'pdf');
      const od=OD(); let res;
      if(od){ const r=await od.enviar(pastaMes(mesAno)+'/'+nome,b64,mime||'application/pdf'); res={url:(r&&r.webUrl)||'',nome}; }
      else { const i=await salvarArquivo({nome,mes:mesAno,mime:mime||'application/pdf',tipo:'escaneada',funcionario:nomeFunc},b64); res={url:linkArq(i),nome}; }
      const f=funcPorNome(nomeFunc); if(f) await marcarFichas(mesAno,'assinadas',[[f._id,{em:agora(),url:res.url,nome:res.nome,porNome:eu()}]]);
      return res; },
    listarArquivosDoMes: async(mesAno)=>{ const od=OD(); if(od) return (await od.listar(pastaMes(mesAno))).filter(x=>x.file).map(x=>({nome:x.name,url:x.webUrl,modificado:x.lastModifiedDateTime||''}));
      const q=await P.db().collection(COL.lista).where('mes','==',mesAno).limit(500).get();
      return q.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(a=>a.tipo==='escaneada').map(a=>({nome:a.nome,url:linkArq(a._id),modificado:a.em||''})); },
    /* lista do sistema de fichas: arquivos da pasta + as anexadas marcadas no mês (mesma contagem da tela Fichas do mês) */
    listarEscaneadasDoMes: async(mesAno)=>{ let xs=[]; try{ xs=await window.RHAPI.listarArquivosDoMes(mesAno); }catch(e){ console.warn('[RH] escaneadas',e); }
      const ass=(R.fm[mesAno]||{}).assinadas||{}; Object.keys(ass).forEach(fid=>{ const f=R.func.find(x=>x._id===fid); if(f&&!xs.some(a=>norm(a.nome).includes(norm(f.nome)))) xs.push({nome:f.nome+' - anexada no painel',url:ass[fid].url||'',modificado:ass[fid].em||''}); });
      return xs; },
    buscarFichasNoDrive: async(termo,op)=>{ const t=norm(termo); op=op||{}; const od=OD();
      if(od){ const pm=op.mesAno?pastaMes(op.mesAno):''; return (await od.buscar(termo)).filter(x=>x.file&&(!op.apenasPdf||/\.pdf$/i.test(x.name))&&(!pm||((x.parentReference||{}).name||'')===pm))
        .map(x=>({url:x.webUrl,nome:x.name,pasta:(x.parentReference||{}).name||'',modificado:odData(x.lastModifiedDateTime)})); } return (await listaArquivos(a=>norm(a.nome).includes(t)&&(!op.mesAno||a.mes===op.mesAno)&&(!op.apenasPdf||/pdf/.test(a.mime||''))))
      .map(a=>({url:linkArq(a._id),nome:a.nome,pasta:mesLabel(a.mes||''),modificado:br((a.em||'').slice(0,10))})); },
    abrirPastaDoMes: async()=>location.origin+location.pathname,
    getLinkPastaFichas: async()=>location.origin+location.pathname,
    /* o sistema de fichas avisa quando imprimiu ou salvou o PDF (situação "Falta assinar") */
    fichasImpressas: async(mesAno,nomes)=>{ const em=agora(), quem=eu(); await marcarFichas(mesAno,'impressas',(nomes||[]).map(n=>{ const f=funcPorNome(n); return [f&&f._id,{em,porNome:quem}]; })); } };

  /* ---------- sistema de fichas num quadro fixo (os redesenhos do painel não o recarregam) ---------- */
  let frm=null;
  function frEl(){ if(!frm){ frm=document.createElement('iframe'); frm.src='modulos/rh-fichas.html'; frm.title='Fichas de EPI e uniforme'; frm.className='rh-frx'; document.body.appendChild(frm); } return frm; }
  function frSync(){ const slot=document.getElementById('rh-fr-slot'); if(!(P.S.view==='rhfichas'&&slot)){ if(frm) frm.style.display='none'; return; }
    const f=frEl(), r=slot.getBoundingClientRect(); Object.assign(f.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'}); }
  setInterval(frSync,200); addEventListener('resize',frSync); addEventListener('scroll',frSync,true);
  const fichasApi=()=>{ try{ const w=frm&&frm.contentWindow; return w&&w.FICHAS&&w.FICHAS.pronto()?w.FICHAS:null; }catch(e){ return null; } };
  /* espera o sistema de fichas carregar e então gera (até 25 s) */
  function fichasRodar(fn){ frEl(); const t0=Date.now(); const vai=()=>{ const F=fichasApi(); if(F){ try{ fn(F); }catch(e){ console.warn('[RH] fichas',e); } return; } if(Date.now()-t0>25000) return P.toast('O sistema de fichas não carregou. Recarregue a página.'); setTimeout(vai,300); }; vai(); }
  function fichasGerar(o){ R.fv='gerar'; P.go('rhfichas'); fichasRodar(F=>F.preparar(Object.assign({mes:R.fmes||fichasMesIni()},o))); }
  function prevDe(f,m){ const k=f._id+'|'+m+'|'+(f.alteradoEm||'')+'|'+((funcaoDe(f)||{}).alteradoEm||''); if(R.prev[k]) return R.prev[k];
    const F=fichasApi(); if(F){ const p=F.previa(f.nome,m); if(p){ R.prev={}; R.prev[k]=p; return p; } return null; }
    frEl(); if(!R._prevT) R._prevT=setTimeout(()=>{ R._prevT=null; if(P.S.view==='rhfichas') P.rerender(); },700); return null; }

  /* ---------- pedaços de tela ---------- */
  const topo=(t,s,acoes,ey)=>`<div class="head"><div><div class="eyebrow">${ey||'RH'}</div><h1>${t}</h1>${s?`<div class="sub">${s}</div>`:''}</div>${acoes?`<div class="rh-acoes">${acoes}</div>`:''}</div>`;
  const opts=(xs,v)=>xs.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  const unicos=k=>[...new Set(R.func.map(x=>x[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const corSt=s=>s==='Ativo'?'ok':s==='Desligado'?'neu':'warn';
  const anexar=(attr,txt,cls)=>`<label class="${cls||'btn sec'} rh-anx">${txt}<input type="file" accept="application/pdf,image/*" ${attr} hidden></label>`;
  const vinc=f=>[f.funcao||'sem função',f.tipo==='PJ'?'PJ'+(f.empresa?' · '+empNome(f.empresa):''):'CLT',f.status==='Férias'?'de férias':f.status==='Afastado'?'afastado':''].filter(Boolean).join(' · ');

  /* ---------- Início ---------- */
  const diasAte=d=>Math.round((new Date(d+'T12:00:00')-new Date(P.hojeStr()+'T12:00:00'))/864e5);
  function tSit(x){ if(x.status==='Encerrado') return {c:'neu',t:'Encerrado',n:9}; if(!x.fim) return {c:'neu',t:'Sem vencimento',n:8}; const d=diasAte(x.fim), av=+x.aviso>0?+x.aviso:30;
    if(d<0) return {c:'crit',t:'Vencido há '+(-d)+' dia'+(d===-1?'':'s'),n:0,d}; if(d===0) return {c:'crit',t:'Vence hoje',n:1,d}; if(d<=av) return {c:'warn',t:'Vence em '+d+' dia'+(d===1?'':'s'),n:2,d}; return {c:'ok',t:'Em dia · vence em '+d+' dias',n:3,d}; }
  function tAvisos(){ return R.terc.filter(x=>x.status!=='Encerrado'&&x.fim).map(x=>({x,s:tSit(x)})).filter(o=>o.s.c==='crit'||o.s.c==='warn').sort((a,b)=>a.s.d-b.s.d); }
  /* avisos do RH no Meu dia: só para o pessoal do RH (a administradora vê no Início do RH, pedido de 13/10) */
  const avRH=fn=>P.registrarAviso(()=>P.dono()?[]:fn());
  avRH(()=>tAvisos().map(o=>({nivel:o.s.c,rotulo:o.s.d<0?'Vencido':o.s.d===0?'Vence hoje':'Atenção',titulo:'Contrato de terceirizado: '+o.x.nome,texto:o.s.t+' ('+br(o.x.fim)+')'+(o.x.empresa?' · '+o.x.empresa:''),go:'rhterc'})));
  function avisosRH(){ const av=[];
    tAvisos().forEach(({x,s})=>{ const d=s.d; av.push({c:s.c,r:d<0?'Vencido':d===0?'Vence hoje':'Atenção',t:'Contrato: '+x.nome,s:(d<0?'venceu há '+(-d)+' dia'+(d===-1?'':'s'):d===0?'vence hoje':'vence em '+d+' dia'+(d===1?'':'s'))+' ('+br(x.fim).slice(0,5)+')',act:`data-act="rh-ted" data-go-terc="1" data-id="${x._id}"`,l:'Abrir'}); });
    const porF={}; ativos().filter(f=>f.funcao&&semEpi(f)).forEach(f=>{ const k=norm(f.funcao); (porF[k]=porF[k]||{nome:f.funcao,n:0}).n++; });
    Object.values(porF).sort((a,b)=>b.n-a.n).forEach(o=>av.push({c:'warn',r:'Atenção',t:'Função "'+o.nome+'" sem EPI cadastrado',s:'a ficha de '+o.n+(o.n===1?' pessoa':' pessoas')+' sai sem itens',act:`data-act="rh-fsemepi" data-n="${esc(o.nome)}"`,l:'Resolver'}));
    avisosPrazo().forEach(a=>av.push(a));
    ativos().forEach(f=>{ const fl=admFaltam(f); if(fl.length&&okIso(f.admissao)&&f.admissao>=addDias(P.hojeStr(),-90)) av.push({c:'warn',r:'Atenção',t:'Admissão: '+f.nome,s:'falta entregar '+plural(fl.length,'documento','documentos')+': '+fl.slice(0,3).join(', ')+(fl.length>3?'…':''),act:`data-act="rh-admabrir" data-id="${f._id}"`,l:'Abrir'}); });
    tDocAvisos().forEach(({x,d,s})=>av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'Documento: '+d.nome+' · '+x.nome,s:s.t.toLowerCase()+(okIso(d.validade)?' ('+br(d.validade).slice(0,5)+')':''),act:`data-act="rh-tdoc" data-go-terc="1" data-id="${x._id}"`,l:'Abrir'}));
    const semFunc=ativos().filter(f=>!f.funcao);
    if(semFunc.length) av.push({c:'warn',r:'Atenção',t:semFunc.length+(semFunc.length===1?' funcionário sem função':' funcionários sem função'),s:'a ficha não tem itens: '+semFunc.slice(0,3).map(f=>f.nome).join(', ')+(semFunc.length>3?'…':''),act:'data-go="rhfunc"',l:'Resolver'});
    avisosMais().forEach(a=>av.unshift(a));
    return av; }
  function barra(c,tot){ const p=n=>tot?(n/tot*100).toFixed(2):0; return `<div class="rh-bar" role="img" aria-label="${c.ass} assinadas, ${c.imp} falta assinar, ${c.nao} não geradas"><i class="ok" style="width:${p(c.ass)}%"></i><i class="warn" style="width:${p(c.imp)}%"></i></div>`; }
  const SVG={bolo:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 12V8M12 5.5c.8-.8 1-1.7.5-2.5-.6.8-1.6 1.2-1.6 2.1 0 .6.5 1 1.1 1z"/></svg>',
    gente:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6.1 4.6 1.9 5.3 4.9"/></svg>',
    entra:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M4 12h11M11 8l4 4-4 4"/></svg>',
    praia:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9M4 9a8 8 0 0 1 16 0zM3 21h18"/></svg>',
    lupa2:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    cel:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    alerta:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20zM12 10v4M12 17.5v.01"/></svg>'};
  /* Início em painel (13/10, 2ª versão): faixa de boas-vindas com o resumo do dia, números com gráfico pequeno, a semana, quem merece atenção hoje, avisos e gráficos */
  function barras(xs,tot,vazio){ if(!xs.length) return `<div class="sub" style="margin:0">${vazio||'Sem dados ainda.'}</div>`; const mx=Math.max(1,...xs.map(x=>x[1]));
    return `<div class="rh-bars">${xs.map(([l,n,act])=>`<div class="rh-bl" ${act||''} title="${esc(l)}: ${n}${tot?' ('+Math.round(n/tot*100)+'%)':''}"><span class="rh-bn">${esc(l)}</span><span class="rh-bt"><i style="width:${Math.max(2,n/mx*100).toFixed(1)}%"></i></span><b class="num">${n}</b></div>`).join('')}</div>`; }
  function vInicio(){ const hj=P.hojeStr(), m=hj.slice(0,7), at=ativos(), h=new Date().getHours(), saud=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite', nome=(eu().split(' ')[0]||'');
    const d0=new Date(hj+'T12:00:00'), dataTxt=DIAS_SEM[d0.getDay()]+', '+d0.getDate()+' de '+MESES[d0.getMonth()]+' de '+d0.getFullYear();
    if(!R.lido.func) return `<section class="rh-hero"><div class="rh-hero-t"><span class="rh-hero-d">${dataTxt}</span><h1>${esc(saud+(nome?', '+nome:''))}</h1></div></section><section class="card"><div class="empty">Carregando…</div></section>`;
    const av=avisosRH(), rel=relDados(m), nCLT=at.filter(f=>f.tipo!=='PJ').length, nPJ=at.length-nCLT, ind=indDados();
    const ferAgora=new Set(at.filter(f=>f.status==='Férias').map(f=>f._id)); R.fer.forEach(x=>{ if(!x.anterior&&x.status!=='cancelada'&&okIso(x.inicio)&&x.inicio<=hj&&x.fim>=hj) ferAgora.add(x.funcId); });
    const deFerias=at.filter(f=>ferAgora.has(f._id)), afast=at.filter(f=>f.status==='Afastado').length, exps=clts().map(f=>({f,e:expInfo(f)})).filter(o=>o.e).sort((a,b)=>a.e.fim.localeCompare(b.e.fim));
    const ag=agendaItens(), semana=[...Array(7)].map((_,k)=>addDias(hj,k)), daSemana=ag.filter(x=>x.data>=hj&&x.data<=semana[6]);
    const md=hj.slice(5), anivHoje=at.filter(f=>okIso(f.nascimento)&&f.nascimento.slice(5)===md), casaHoje=at.filter(f=>okIso(f.admissao)&&f.admissao.slice(5)===md&&f.admissao<hj);
    const proxAnivs=at.filter(f=>okIso(f.nascimento)&&f.nascimento.slice(5)!==md).map(f=>({f,d:proxAniv(f.nascimento)})).sort((a,b)=>a.d.localeCompare(b.d)).slice(0,3);
    const novos=at.filter(f=>okIso(f.admissao)&&f.admissao>=addDias(hj,-30)&&f.admissao<=hj).sort((a,b)=>b.admissao.localeCompare(a.admissao));
    const crit=av.filter(a=>a.c==='crit').length;
    const resumo=[av.length?plural(av.length,'aviso','avisos')+(crit?' ('+crit+' urgente'+(crit>1?'s':'')+')':''):'nenhum aviso',daSemana.length?plural(daSemana.length,'coisa','coisas')+' nos próximos 7 dias':'semana tranquila',anivHoje.length?plural(anivHoje.length,'aniversário','aniversários')+' hoje':''].filter(Boolean).join(' · ');
    const av3=(f,cls)=>`<span class="rh-av3 ${cls||''}" title="${esc(titulo(f.nome))}">${esc(iniciais(f.nome).toUpperCase())}</span>`;
    const spark=`<div class="rh-spk" aria-hidden="true">${ind.meses.map((x,i)=>{ const mx=Math.max(1,...ind.meses.map(y=>y.n)), mn=Math.min(...ind.meses.map(y=>y.n)); return `<i style="height:${(18+((x.n-mn)/Math.max(1,mx-mn))*82).toFixed(0)}%${i===11?';background:var(--teal-strong)':''}" title="${esc(cap(mesLabel(x.m)))}: ${x.n}"></i>`; }).join('')}</div>`;
    const tile=(ic,cor,n,l,sub,extra,go)=>`<button class="rh-tile" ${go||''}><span class="rh-tic" style="background:${cor[0]};color:${cor[1]}">${ic}</span><span class="rh-tn num">${n}</span><span class="rh-tl2">${l}</span>${sub?`<small>${sub}</small>`:''}${extra||''}</button>`;
    const TC={feriado:['#E3F0E8','#2F6047'],ferias:['#EAF2F6','#143F54'],exp:['#FBF4E6','#7A5410'],pj:['#EDE8F7','#402C78'],aniv:['#F6E3E1','#8E3A33'],casa:['#E3F0E8','#2F6047'],contrato:['#F5F1E8','#4A453C'],doc:['#F5F1E8','#4A453C'],desl:['#F6E3E1','#8E3A33']};
    const dia=d=>{ const xs=daSemana.filter(x=>x.data===d), dd=dU(d); return `<div class="rh-wd ${d===hj?'hj':''}"><div class="rh-wdh"><b>${d===hj?'Hoje':DIA_CURTO[dd.getUTCDay()]}</b><span class="num">${String(dd.getUTCDate()).padStart(2,'0')}/${d.slice(5,7)}</span></div>
      ${xs.slice(0,3).map(x=>{ const c=TC[x.tipo]||TC.doc; if(x.tipo==='aniv'||x.tipo==='casa'){ const m=x.t.match(/^(\d+) anos? de casa de (.*)$/), nm=x.tipo==='aniv'?x.t.replace(/^Aniversário de\s*/,''):(m?m[2]:x.t);
        return `<button class="rh-wc rh-wcc" ${x.act} style="background:${c[0]};color:${c[1]}" title="${esc(x.t)} · fazer o cartão"><b>${x.tipo==='aniv'?'Aniversário':'Tempo de casa · '+(m?m[1]+(m[1]==='1'?' ano':' anos'):'')}</b><span class="rh-wcn">${esc(nm)}</span><span class="rh-wcb">🎉 Fazer cartão</span></button>`; }
      return `<button class="rh-wc" ${x.act} style="background:${c[0]};color:${c[1]}" title="${esc(x.t+(x.s?' · '+x.s:''))}"><b>${esc(TIPO_AG[x.tipo]||'')}</b>${esc(x.t.replace(/^(Prazo para dar as férias de|Começam as férias de|Volta das férias de|Fim da 1ª etapa da experiência de|Fim da experiência de|Troca do PJ|Aniversário de|Último dia de|Fim do contrato de|Feriado:)\s*/,''))}</button>`; }).join('')}${xs.length>3?`<button class="lnk" data-go="rhagenda" style="font-size:12px">+${xs.length-3}</button>`:''}${xs.length?'':'<span class="rh-wv">—</span>'}</div>`; };
    const porSet={}; at.forEach(f=>{ const k=f.setor||'Sem setor'; porSet[k]=(porSet[k]||0)+1; }); let setores=Object.entries(porSet).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR'));
    if(setores.length>7){ const resto=setores.slice(6).reduce((a,x)=>a+x[1],0); setores=setores.slice(0,6).concat([['Outros setores',resto]]); }
    const faixas=[['Menos de 1 ano',0,1],['1 a 2 anos',1,3],['3 a 4 anos',3,5],['5 a 9 anos',5,10],['10 anos ou mais',10,99]], casa=faixas.map(([l,a,b])=>[l,at.filter(f=>okIso(f.admissao)&&tempoDe(f.admissao).a>=a&&tempoDe(f.admissao).a<b).length]).filter(x=>x[1]);
    const pctC=at.length?Math.round(nCLT/at.length*100):0, tAt=R.terc.filter(x=>x.status!=='Encerrado').length, tV=tAvisos().length;
    const pessoaMini=(f,sub,cls)=>`<button class="rh-pm" data-act="rh-pess" data-id="${f._id}">${av3(f,cls)}<span><b>${esc(titulo(f.nome))}</b><small>${esc(sub)}</small></span></button>`;
    const atl=(ic,t,s,ex)=>`<button class="rh-at2" ${ex}><span class="rh-tic">${ic}</span><span><b>${t}</b><small>${s}</small></span></button>`;
    return `<section class="rh-hero"><div class="rh-hero-t"><span class="rh-hero-d">${dataTxt}</span><h1>${esc(saud+(nome?', '+nome:''))}</h1><p>${esc(resumo)}</p></div>
        <div class="rh-hero-a"><label class="rh-hero-s"><span class="sr">Buscar funcionário</span>${SVG.lupa2}<input id="rh-bus" placeholder="Buscar funcionário por nome, CPF ou CNPJ" value="${esc(R.buscaIni)}" autocomplete="off"></label>
          <div class="rh-hero-b"><button class="btn rh-hb" data-act="rh-admnova">${P.ic('mais',18,2.4)}Nova admissão</button><button class="btn rh-hb2" data-act="rh-deslnovo">Novo desligamento</button><button class="btn rh-hb2" data-go="rhdocs">Gerar documento</button><button class="btn rh-hb2" data-act="rh-almaus">Ausência no almoço</button></div></div>
        ${R.buscaIni.length>=2?(()=>{ const xs=buscaPessoas(R.buscaIni); return `<div class="rh-busr rh-hero-r">${xs.length?xs.map(f=>`<button class="rh-busi" data-act="rh-pess" data-id="${f._id}"><b>${esc(f.nome)}</b><small>${esc([f.funcao,f.setor,f.status==='Desligado'?'desligado':''].filter(Boolean).join(' · '))}</small></button>`).join(''):'<div class="sub" style="margin:0;padding:10px">Ninguém com esse nome ou documento.</div>'}</div>`; })():''}</section>
      <div class="rh-tiles">${tile(SVG.gente,['#EAF2F6','#143F54'],at.length,'no quadro',nCLT+' CLT · '+nPJ+' PJ',spark,'data-go="rhfunc"')}
        ${tile(SVG.entra,['#E3F0E8','#2F6047'],(rel.adm.length?'+'+rel.adm.length:'0'),'entraram em '+mesNome(m),rel.desl.length?plural(rel.desl.length,'saída','saídas')+' no mês':'nenhuma saída no mês','','data-act="rh-agrel"')}
        ${tile(SVG.praia,['#FBF4E6','#7A5410'],deFerias.length,'de férias agora',afast?plural(afast,'afastado','afastados'):'',deFerias.length?`<span class="rh-avs">${deFerias.slice(0,4).map(f=>av3(f)).join('')}</span>`:'','data-act="rh-pzabrir" data-v="mapa"')}
        ${tile(P.ic('relogio',20,2),['#EDE8F7','#402C78'],exps.length,'em experiência',exps[0]?'próximo prazo: '+br(exps[0].e.fim).slice(0,5)+' · '+titulo(exps[0].f.nome).split(' ')[0]:'ninguém agora','','data-act="rh-pzabrir" data-v="exp"')}</div>
      <section class="card rh-week"><div class="rh-ch"><h2>Próximos 7 dias</h2><button class="lnk" data-go="rhagenda">Ver a agenda completa</button></div><div class="rh-wk">${semana.map(dia).join('')}</div></section>
      <div class="rh-3"><section class="card"><div class="rh-ch"><h2>Precisa de você</h2>${av.length?`<span class="pill ${crit?'crit':'warn'}">${av.length}</span>`:''}</div>${av.length?av.slice(0,7).map(a=>`<div class="rh-av ${a.c}"><span class="rh-avi">${SVG.alerta}</span><div><small class="rh-avr">${esc(a.r)}</small><b>${esc(a.t)}</b><small>${esc(a.s)}</small></div><button class="lnk" ${a.act}>${a.l}</button></div>`).join('')+(av.length>7?`<div class="sub" style="margin:8px 0 0;font-size:12.5px">e mais ${av.length-7} na Agenda</div>`:''):'<div class="rh-ok2">'+P.ic('check',22,2.4)+'<b>Tudo em dia.</b><span>Nenhum prazo vencendo.</span></div>'}</section>
        <section class="card rh-hoje"><h2>Pessoas</h2>
          ${anivHoje.length?`<div class="rh-party"><span class="rh-tic" style="background:#F6E3E1;color:#8E3A33">${SVG.bolo}</span><div><b>Hoje é aniversário de ${esc(anivHoje.map(f=>titulo(f.nome).split(' ')[0]).join(' e '))}</b><small>${esc(anivHoje.map(f=>f.setor||'').filter(Boolean).join(' · '))}</small><div class="rh-cbts">${anivHoje.map(f=>`<button class="btn sec rh-sm" data-act="rh-cartao" data-id="${f._id}">🎉 Cartão${anivHoje.length>1?' · '+esc(titulo(f.nome).split(' ')[0]):''}</button>`).join('')}</div></div></div>`:''}
          ${casaHoje.length?`<div class="rh-party" style="background:#EEF6F1"><span class="rh-tic" style="background:#E3F0E8;color:#2F6047">${P.ic('check',20,2)}</span><div><b>${esc(casaHoje.map(f=>titulo(f.nome).split(' ')[0]+' completa '+plural(tempoDe(f.admissao).a,'ano','anos')+' de casa').join(' · '))}</b><small>hoje</small><div class="rh-cbts">${casaHoje.map(f=>`<button class="btn sec rh-sm" data-act="rh-cartao" data-v="casa" data-id="${f._id}">Cartão${casaHoje.length>1?' · '+esc(titulo(f.nome).split(' ')[0]):''}</button>`).join('')}</div></div></div>`:''}
          ${anivHoje.length||casaHoje.length?'':`<div class="label" style="margin:12px 0 6px">PRÓXIMOS ANIVERSÁRIOS</div>${proxAnivs.length?proxAnivs.map(o=>pessoaMini(o.f,br(o.d).slice(0,5)+' · '+(+o.d.slice(0,4)-+o.f.nascimento.slice(0,4))+' anos')).join(''):'<div class="sub" style="margin:0;font-size:13px">Cadastre a data de nascimento para ver aqui.</div>'}`}
          <div class="label" style="margin:14px 0 6px">CHEGARAM NOS ÚLTIMOS 30 DIAS</div>${novos.length?novos.slice(0,3).map(f=>pessoaMini(f,(f.funcao||'')+' · desde '+br(f.admissao).slice(0,5),'novo')).join(''):'<div class="sub" style="margin:0;font-size:13px">Ninguém novo.</div>'}</section>
        <section class="card"><h2>Quadro</h2>
          <div class="rh-stk" title="${nCLT} CLT e ${nPJ} PJ"><i style="width:${pctC}%"></i><i class="pj" style="width:${100-pctC}%"></i></div>
          <div class="rh-stkl"><span><i></i>CLT · ${nCLT}</span><span><i class="pj"></i>PJ · ${nPJ}</span></div>
          <h2 style="margin-top:18px">Por setor</h2>${barras(setores,at.length,'Cadastre os setores.')}
          <h2 style="margin-top:18px">Tempo de casa</h2>${barras(casa,at.length,'Sem datas de admissão.')}</section></div>
      ${cartaoPerg()}${cartaoAniv()}<section class="card"><h2>Atalhos</h2><div class="rh-ats2">${atl(P.ic('mais',20,2.2),'Nova admissão','cadastro, documentos, contrato e ficha','data-act="rh-admnova"')}${atl(P.ic('folha',20,2),'Gerar documento','contratos, avisos e termos','data-go="rhdocs"')}${atl(SVG.cel,'Ficha pelo celular','a pessoa preenche e manda os documentos','data-act="rh-convnovo"')}${atl(P.ic('calendario',20,2),'Mapa de férias','o ano de todo mundo','data-act="rh-pzabrir" data-v="mapa"')}${atl(P.ic('grafico',20,2),'Indicadores','para a diretoria','data-act="rh-agind"')}${atl(P.ic('lista',20,2),'Relatório do mês','para a contabilidade','data-act="rh-agrel"')}${atl(SVG.gente,'Terceirizados',plural(tAt,'contrato ativo','contratos ativos')+(tV?' · '+tV+' vencendo':''),'data-go="rhterc"')}</div></section>`; }

  /* ---------- Fichas do mês ---------- */
  function vFichas(){ if(!R.fmes||R.fmes<FDESDE()) R.fmes=fichasMesIni(); const m=R.fmes, hoje=fichasMesIni(); escCarregar(m);
    const ban=(R.arqAbrir?`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong);display:flex;justify-content:space-between;gap:10px;align-items:center"><span>Arquivo pronto para abrir.</span><span><button class="btn" data-act="rh-arq">Abrir arquivo</button> <button class="lnk" data-act="rh-arqx">Fechar</button></span></div>`:'');
    const EY='RH · FICHAS DE EPI E UNIFORME';
    if(R.fv==='gerar') return topo('Gerar e imprimir','Mesmas opções e filtros de hoje. A ficha impressa não muda.',`<button class="btn sec" data-act="rh-fvmes">‹ Fichas de ${mesNome(m)}</button>`,EY)+odBarra()+ban+`<div id="rh-fr-slot"></div>`;
    frEl(); const fr=fResumo(m), faltam=fr.xs.filter(o=>o.s.k==='nao'||(o.s.k==='semepi'&&!o.s.i));
    const ant=mesMais(m,-1), prox=mesMais(m,1);
    const acoes=`${ant>=FDESDE()?`<button class="btn sec" data-act="rh-fmes" data-v="-1">‹ ${cap(mesNome(ant))}</button>`:''}${m<hoje?`<button class="btn sec" data-act="rh-fmes" data-v="1">${cap(mesNome(prox))} ›</button>`:''}
      ${faltam.length?`<button class="btn" data-act="rh-ffaltam">Gerar ${faltam.length===1?'a que falta':'as '+faltam.length+' que faltam'}</button>`:''}
      ${R.fmodo==='setor'?'<button class="btn sec" data-act="rh-fimptodas" data-setor="1">Imprimir por setor</button>':'<button class="btn sec" data-act="rh-fimptodas">Imprimir todas</button>'}
      <button class="btn sec" data-act="rh-fvgerar" title="Todas as opções e filtros (vínculo, empresa, setor, função), fichas escaneadas e busca">Gerar e imprimir</button>`;
    const sub=(P.hojeStr().slice(0,7)<FDESDE()?'O controle das fichas começa em '+mesNome(FDESDE())+' de '+FDESDE().slice(0,4)+'. ':'')+(fr.tot?`${fr.c.ass} de ${fr.tot} assinadas · ${fr.c.imp} falta assinar · ${fr.c.nao} não geradas`:'');
    const seg=`<div class="seg rh-modo" role="group" aria-label="Como mostrar">${[['lista','Lista'],['setor','Por setor']].map(([k,l])=>`<button data-act="rh-fmodo" data-v="${k}" aria-pressed="${R.fmodo===k}">${l}</button>`).join('')}</div>`;
    return topo(mesTitulo(m),sub,acoes,EY)+odBarra()+ban+(!R.lido.func?'<section class="card"><div class="empty">Carregando…</div></section>':!fr.tot?'<section class="card"><div class="empty">Nenhum funcionário em atividade. Cadastre em Funcionários.</div></section>':R.fmodo==='setor'?vFichasSetor(fr,seg):vFichasLista(fr,m,seg)); }
  function vFichasLista(fr,m,seg){ const F=R.ffil, q=norm(F.q), qd=dig(F.q);
    const cnt={todas:fr.tot,nao:fr.c.nao,imp:fr.c.imp,ass:fr.c.ass};
    const grupo=s=>s.k==='semepi'?(s.i?'imp':'nao'):s.k;
    let xs=fr.xs.filter(o=>(F.sit==='todas'||grupo(o.s)===F.sit)&&(!F.setor||(o.f.setor||'Sem setor')===F.setor)&&(!q||norm(o.f.nome).includes(q)||(qd&&(dig(o.f.cpf).includes(qd)||(o.f.cnpj&&dig(o.f.cnpj).includes(qd))))));
    const ord={nao:0,semepi:0,imp:1,ass:2}; xs.sort((a,b)=>ord[a.s.k]-ord[b.s.k]||a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    if(!R.fsel||!xs.some(o=>o.f._id===R.fsel)) R.fsel=xs[0]?xs[0].f._id:null;
    const sel=xs.find(o=>o.f._id===R.fsel), mais=xs.length>F.n;
    const acao=o=>{ const f=o.f,s=o.s; if(s.k==='ass') return `<button class="lnk" data-act="rh-fver" data-id="${f._id}">Ver escaneada</button>`;
      if(s.k==='semepi') return `<button class="lnk" data-act="rh-fsemepi" data-n="${esc(f.funcao||'')}" data-f="${f._id}">${f.funcao?'Cadastrar EPIs':'Escolher a função'}</button>`;
      if(s.k==='imp') return anexar(`data-rh-anx="${f._id}"`,'Anexar assinada','btn sec rh-sm');
      return `<button class="btn rh-sm" data-act="rh-fger" data-id="${f._id}">Gerar</button>`; };
    const tab=`<section class="card rh-ftab">${xs.length?`<div class="rh-tw"><table class="rh-t rh-tf"><thead><tr><th>Funcionário</th><th>Setor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${xs.slice(0,F.n).map(o=>`<tr data-act="rh-fsel" data-id="${o.f._id}" ${o.f._id===R.fsel?'class="sel"':''}><td><b>${esc(o.f.nome)}</b><small>${esc(vinc(o.f))}</small></td><td>${esc(o.f.setor||'—')}</td><td><span class="pill ${o.s.c}">${esc(o.s.t)}</span></td><td class="rh-ac">${acao(o)}</td></tr>`).join('')}</tbody></table></div>
      ${mais?`<div style="text-align:center;margin-top:10px"><button class="btn sec" data-act="rh-fmais">Mostrar mais (${xs.length-F.n})</button></div>`:''}`:'<div class="empty">Ninguém nesta situação.</div>'}</section>`;
    let pv='';
    if(sel){ const f=sel.f, s=sel.s, p=prevDe(f,m); const quando=s.k==='ass'?'assinada'+(s.a.em?' em '+(/^\d{2}\//.test(s.a.em)?s.a.em.slice(0,5):dmIso(s.a.em)):''):s.i?'gerada em '+dmIso(s.i.em)+' · impressa':'ainda não gerada';
      pv=`<section class="card rh-pvc"><div class="rh-ch"><h2>Ficha de ${esc(titulo(f.nome))}</h2><span class="sub" style="margin:0">${esc(quando)}</span></div>
        <div class="rh-pv">${p?`<iframe title="Prévia da ficha" tabindex="-1" srcdoc="${esc('<!doctype html><html><head><meta charset="utf-8"><style>'+p.css+'</style><style>html,body{margin:0;background:#fff;overflow:hidden}.ficha-page{margin:0!important;box-shadow:none!important}</style></head><body>'+p.html+'</body></html>')}"></iframe>`:'<div class="empty">Preparando a prévia…</div>'}</div>
        <div class="sub" style="margin:10px 0 12px">Frente: uniforme · verso: EPI · igual à ficha de hoje</div>
        <div class="rh-2b"><button class="btn sec" data-act="rh-fimp1" data-id="${f._id}">Imprimir</button>${s.k==='ass'?`<button class="btn" data-act="rh-fver" data-id="${f._id}">Ver escaneada</button>`:anexar(`data-rh-anx="${f._id}"`,'Anexar assinada','btn')}</div></section>`; }
    const chips=`<div class="rh-chips">${[['todas','Todas'],['nao','Não geradas'],['imp','Falta assinar'],['ass','Assinadas']].map(([k,l])=>`<button class="rh-chip2" data-act="rh-fchip" data-v="${k}" aria-pressed="${F.sit===k}">${l} · ${cnt[k]}</button>`).join('')}
      ${F.setor?`<button class="rh-chip2" data-act="rh-fsetorx" aria-pressed="true">Setor: ${esc(F.setor)} ✕</button>`:''}<span class="rh-busca"><label for="rh-fq">Buscar</label><input class="txt" id="rh-fq" placeholder="nome ou CPF" value="${esc(F.q)}"></span>${seg}</div>`;
    return chips+`<div class="rh-fg">${tab}${pv}</div>`; }
  function vFichasSetor(fr,seg){ const g={}; fr.xs.forEach(o=>{ const k=o.f.setor||'Sem setor'; (g[k]=g[k]||[]).push(o); });
    const ks=Object.keys(g).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return `<div class="rh-chips">${seg}</div><div class="rh-sets">${ks.map(k=>{ const xs=g[k], c={ass:0,imp:0,nao:0}; xs.forEach(o=>c[o.s.k==='semepi'?(o.s.i?'imp':'nao'):o.s.k]++);
      const pend=xs.filter(o=>o.s.k!=='ass').sort((a,b)=>({nao:0,semepi:0,imp:1}[a.s.k]-{nao:0,semepi:0,imp:1}[b.s.k])||a.f.nome.localeCompare(b.f.nome,'pt-BR')), resto=xs.length-Math.min(2,pend.length), todas=!pend.length;
      return `<section class="card rh-set"><div class="rh-ch"><h2>${esc(k)}</h2>${todas?'<span class="rh-ok">todas assinadas</span>':`<span class="sub" style="margin:0">${c.ass} de ${xs.length} assinadas</span>`}</div>${barra(c,xs.length)}
        ${todas?`<div class="sub" style="margin:10px 0 0">${xs.length} ficha${xs.length===1?'':'s'} assinada${xs.length===1?'':'s'} e anexada${xs.length===1?'':'s'}.</div>`:pend.slice(0,2).map(o=>`<div class="rh-sp"><span>${esc(titulo(o.f.nome))}</span><span class="pill ${o.s.c}">${esc(o.s.t)}</span></div>`).join('')+(resto>0?`<div class="sub" style="margin:4px 0 0;font-size:13px">e mais ${resto}${pend.length<=2?' assinada'+(resto===1?'':'s'):''}</div>`:'')}
        <button class="btn sec rh-wide" data-act="rh-fsetor" data-v="${esc(k)}">Abrir ${esc(k)}</button></section>`; }).join('')}</div>`; }

  /* ---------- Funcionários ---------- */
  /* Funcionários e Terceirizados no mesmo bloco (pedido de 13/10): Terceirizados é uma aba de Funcionários */
  const fsegH=()=>`<div class="seg" role="group" aria-label="Como ver">${[['lista','Lista'],['setor','Por setor'],['adm','Admissões'],['terc','Terceirizados']].map(([k,l])=>`<button data-act="rh-fview" data-v="${k}" aria-pressed="${(R.fview||'lista')===k}">${l}</button>`).join('')}</div>`;
  function vFunc(){ if(R.pess&&!R.f&&!R.fdesl) return vPessoa(); if(R.fview==='terc') return vTerc(true); return vFunc0(); }
  function vFunc0(){ const F=R.filtro, q=norm(F.q);
    let xs=R.func.filter(x=>(F.st==='ativos'?x.status!=='Desligado':F.st==='todos'?true:x.status===F.st)&&(!F.setor||x.setor===F.setor)&&(!F.emp||x.empresa===F.emp)&&(!F.tipo||x.tipo===F.tipo)&&(!q||norm(x.nome).includes(q)||dig(x.cpf).includes(dig(F.q)||'#')||(x.cnpj&&dig(x.cnpj).includes(dig(F.q)||'#'))||norm(x.funcao).includes(q)));
    xs.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    const cnt=s=>R.func.filter(x=>x.status===s).length;
    const fseg=fsegH();
    if(R.fview==='setor'||R.fview==='adm') return topo('Funcionários',R.fview==='adm'?'Quem está entrando e em que etapa: documentos, contrato e ficha, experiência.':'Quem é quem: as pessoas de cada setor.',fseg+`<button class="btn sec" data-act="rh-deslnovo">Novo desligamento</button><button class="btn" data-act="rh-admnova">${P.ic('mais',18,2.4)}Nova admissão</button>`)
      +(R.fdesl?formDesl():'')+(R.adm&&!R.f?vAdm():'')+(R.f?formFunc():'')+(!R.lido.func?'<section class="card"><div class="empty">Carregando…</div></section>':R.fview==='adm'?cartaoFichasCel()+vQuadroAdm():vOrg());
    return topo('Funcionários','Cadastro, situação e o que cada um usa.',fseg+`<button class="btn sec" data-act="rh-deslnovo">Novo desligamento</button><button class="btn" data-act="rh-admnova">${P.ic('mais',18,2.4)}Nova admissão</button><button class="btn sec" data-act="rh-carga">${P.ic('baixar',18,2)}Importar planilha</button><button class="btn sec" data-act="rh-csv">Exportar</button>`)
      +(R.carga?vCarga():'')+(R.adm&&!R.f?vAdm():'')+(R.fdesl?formDesl():'')+(R.f?formFunc():'')
      +`<div class="rh-kpi">${ST.map(s=>`<div><b class="num">${cnt(s)}</b><span>${s}</span></div>`).join('')}</div>
      <section class="card"><div class="rh-fil"><input class="txt" id="rh-q" placeholder="Buscar nome, CPF, CNPJ ou função" value="${esc(F.q)}">
        <select class="txt" data-rh-fil="st"><option value="ativos" ${F.st==='ativos'?'selected':''}>Em atividade</option>${ST.map(s=>`<option ${F.st===s?'selected':''}>${s}</option>`).join('')}<option value="todos" ${F.st==='todos'?'selected':''}>Todos</option></select>
        <select class="txt" data-rh-fil="setor"><option value="">Todos os setores</option>${opts(unicos('setor'),F.setor)}</select>
        <select class="txt" data-rh-fil="emp"><option value="">Todas as empresas</option>${unicos('empresa').map(e=>`<option value="${esc(e)}" ${F.emp===e?'selected':''}>${esc(empNome(e))}</option>`).join('')}</select>
        <select class="txt" data-rh-fil="tipo"><option value="">CLT e PJ</option>${opts(['CLT','PJ'],F.tipo)}</select></div>
      ${!R.lido.func?'<div class="empty">Carregando…</div>':xs.length?`<div class="rh-tw"><table class="rh-t"><thead><tr><th>Nome</th><th>CPF / CNPJ</th><th>Função</th><th>Setor</th><th>Empresa</th><th>Admissão</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(x=>`<tr><td><button class="rh-nm" data-act="rh-pess" data-id="${x._id}">${esc(x.nome)}</button>${x.tipo==='PJ'?' <span class="pill neu">PJ</span>':''}</td><td class="num">${esc(docF(x))}</td><td>${esc(x.funcao||'')}</td><td>${esc(x.setor||'')}</td><td>${esc(empNome(x.empresa))}</td><td class="num">${br(x.admissao)}</td>
          <td><span class="pill ${corSt(x.status)}">${esc(x.status||'')}</span>${x.status==='Desligado'&&x.desligamento?`<small style="display:block;color:var(--muted)">${br(x.desligamento)}${x.desligMotivo?' · '+esc(x.desligMotivo):''}</small>${deslForm(x)}`:x.desligAgendado&&okIso(x.desligamento)?`<small style="display:block;color:var(--crit-ink)">sai em ${br(x.desligamento)}</small>${deslForm(x)}`:expInfo(x)?`<small style="display:block;color:var(--muted)">em experiência</small>`:''}</td><td><button class="lnk" data-act="rh-ed" data-id="${x._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>
        <div class="sub" style="margin:8px 0 0">${xs.length} funcionário(s)</div>`:'<div class="empty">Nenhum funcionário com esses filtros.</div>'}</section>`; }
  function formFunc(){ const f=R.f, fs=R.funcoes.map(x=>x.nome).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const i=(k,l,t,ex)=>`<label><span class="label">${l}</span><input class="txt" data-rh-f="${k}" type="${t||'text'}" value="${esc(f[k]==null?'':f[k])}" ${ex||''}></label>`;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>${f.admNova?'Nova admissão · cadastro':(f._id?'Editar':'Novo')+' funcionário'}</h2><button class="lnk" data-act="rh-fx">Fechar</button></div>
      <div class="rh-g">${i('nome','Nome completo *')}${(f.tipo||'CLT')==='PJ'?i('cnpj','CNPJ *','text','inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00"'):i('cpf','CPF *','text','inputmode="numeric" maxlength="14"')}
        <label><span class="label">Função</span><input class="txt" data-rh-f="funcao" list="rh-funcoes" value="${esc(f.funcao||'')}"><datalist id="rh-funcoes">${fs.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
        <label><span class="label">Setor <button type="button" class="lnk" data-act="rh-cad" data-go-cad="1" data-v="setores" style="font-size:12px;padding:0">cadastrar</button></span><input class="txt" data-rh-f="setor" list="rh-setores" value="${esc(f.setor||'')}"><datalist id="rh-setores">${[...new Set(setoresCad().concat(unicos('setor')))].map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
        <label><span class="label">Vínculo</span><select class="txt" data-rh-f="tipo">${opts(['CLT','PJ'],f.tipo||'CLT')}</select></label>
        ${(f.tipo||'CLT')==='CLT'?`<label><span class="label">Empresa</span><input class="txt" value="Colafix (todo CLT)" disabled></label>`
          :`<label><span class="label">Empresa (PJ) *</span><select class="txt" data-rh-f="empresaSel">${EMP_PJ.map(([k,n])=>`<option value="${k}" ${(f.empresaSel||f.empresa)===k?'selected':''}>${n}</option>`).join('')}<option value="OUTRA" ${f.empresaSel==='OUTRA'||(f.empresa&&!EMP_PJ.some(x=>x[0]===f.empresa)&&f.empresa!=='COLAFIX')?'selected':''}>Outra…</option></select></label>
             ${f.empresaSel==='OUTRA'||(!f.empresaSel&&f.empresa&&!EMP_PJ.some(x=>x[0]===f.empresa)&&f.empresa!=='COLAFIX')?`<label><span class="label">Nome da outra empresa *</span><input class="txt" data-rh-f="empresaOutra" value="${esc(f.empresaOutra||(EMP_PJ.some(x=>x[0]===f.empresa)||f.empresa==='COLAFIX'?'':f.empresa||''))}"></label>`:''}`}
        ${i('admissao','Admissão','date')}${i('nascimento','Nascimento','date')}
        <label><span class="label">Situação</span><select class="txt" data-rh-f="status">${opts(ST,f.status||'Ativo')}</select></label>
        ${f.status==='Desligado'?i('desligamento','Data do desligamento','date')+`<label><span class="label">Motivo do desligamento</span><input class="txt" data-rh-f="desligMotivo" list="rh-motivos2" value="${esc(f.desligMotivo||'')}"><datalist id="rh-motivos2">${MOTIVOS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label>`:''}
        ${i('telefone','Telefone','tel')}${i('camisa','Tamanho da camisa')}${i('calca','Tamanho da calça')}${i('calcado','Número do calçado')}
        <label><span class="label">Salário (para os contratos)</span><input class="txt" data-rh-f="salario" inputmode="decimal" placeholder="R$ 0,00" value="${esc(f.salario!=null&&f.salario!==''?brl(f.salario):'')}"></label>${i('jornada','Jornada (para os contratos)','text','placeholder="ex.: 44 horas semanais"')}</div>
      <details class="rh-mais" ${['endereco','cep','email','banco','agencia','conta','pix','emergencia'].some(k=>f[k])?'open':''}><summary>Endereço, banco e contato de emergência</summary><div class="rh-g" style="margin-top:8px">${i('endereco','Endereço (rua, nº, bairro, cidade)')}${i('cep','CEP','text','inputmode="numeric" maxlength="9"')}${i('email','E-mail','email')}
        ${i('banco','Banco')}${i('agencia','Agência','text','inputmode="numeric"')}${i('conta','Conta','text','inputmode="numeric"')}${i('pix','Chave PIX')}${i('emergencia','Contato de emergência (nome e telefone)')}</div></details>
      <label style="display:block;margin-top:10px"><span class="label">Observações</span><textarea class="txt" data-rh-f="obs" rows="2">${esc(f.obs||'')}</textarea></label>
      ${f.desligAgendado&&okIso(f.desligamento)&&f.status!=='Desligado'?`<div class="banner" style="background:var(--crit-tint);color:var(--crit-ink);margin:12px 0 0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>Desligamento marcado para <b>${br(f.desligamento)}</b>${f.desligMotivo?' · '+esc(f.desligMotivo):''}. Até lá continua ativo.</span><button class="lnk" data-act="rh-desagx" data-id="${f._id}">Cancelar desligamento</button></div>`:''}
      ${f._id?docsDaPessoa(f._id):''}
      ${f.alteradoEm?`<div class="sub" style="margin:8px 0 0;font-size:12px">Última alteração: ${new Date(f.alteradoEm).toLocaleString('pt-BR')}${f.alteradoNome?' · '+esc(f.alteradoNome):''}</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap">${f._id&&f.status!=='Desligado'&&!f.desligAgendado?`<button class="lnk" data-act="rh-desl" data-id="${f._id}" style="color:var(--crit-ink)">Desligar…</button>`:'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="rh-fx">Cancelar</button><button class="btn" data-act="rh-salvar" ${R.salv?'disabled':''}>${R.salv?'Salvando…':'Salvar'}</button></div></div></section>`; }
  function docsDaPessoa(fid){ const xs=R.docs.filter(d=>d.funcId===fid);
    return `<div class="rh-docs"><div class="rh-ch"><span class="label">DOCUMENTOS</span><button class="lnk" data-act="rh-dgpara" data-id="${fid}">Gerar documento</button></div>
      ${xs.length?xs.slice(0,8).map(d=>`<div class="rh-dl"><div><b>${esc(d.modelo||'Documento')}</b><small>gerado em ${dmIso(d.em)}/${String(d.em||'').slice(0,4)}${d.porNome?' por '+esc(d.porNome):''}</small></div>${d.assinado?`<button class="lnk" data-act="rh-dver" data-id="${d._id}">Ver assinado</button>`:anexar(`data-rh-danx="${d._id}"`,'Anexar assinado','lnk')}</div>`).join(''):'<div class="sub" style="margin:4px 0 0">Nenhum documento gerado ainda.</div>'}${puxaBloco(fid)}${qualBloco(fid)}</div>`; }

  /* ---------- Cadastros do RH (pedido de 13/10): funções e EPIs, setores, configurações ---------- */
  /* Cadastros com cara de sistema (pedido de 13/10): menu à esquerda e cada cadastro numa tabela com busca */
  const CAD_MENU=[['PESSOAS',[['funcoes','Funções'],['setores','Setores']]],['SEGURANÇA',[['epis','EPIs']]],['CALENDÁRIO',[['feriados','Feriados']]],['SISTEMA',[['textos','Textos das fichas'],['config','Configurações']]]];
  const setoresCad=()=>(Array.isArray(R.cfg.setores)?R.cfg.setores:[]).slice().sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const FDESDE=()=>/^\d{4}-\d{2}$/.test(R.cfg.fichasDesde||'')?R.cfg.fichasDesde:'2026-11';
  const fichasMesIni=()=>{ const h=P.hojeStr().slice(0,7), d=FDESDE(); return h<d?d:h; };
  const cadTopo=(t,s,acoes)=>`<div class="rh-cadh"><div><h2>${t}</h2>${s?`<div class="sub">${s}</div>`:''}</div>${acoes?`<div class="rh-acoes">${acoes}</div>`:''}</div>`;
  const cadBusca=(ph)=>`<div class="rh-cadb"><input class="txt" type="search" data-cadq autocomplete="off" placeholder="${esc(ph)}" value="${esc(R.cadq[R.cad]||'')}"><span class="sub" data-cadqn></span></div>`;
  function cadFiltra(){ const i=document.querySelector('[data-cadq]'); if(!i) return; const q=norm(i.value).split(/\s+/).filter(Boolean), rs=[...document.querySelectorAll('.rh-cadc [data-b]')]; let n=0;
    rs.forEach(r=>{ const b=r.dataset.b, ok=q.every(w=>b.includes(w)); r.hidden=!ok; if(ok) n++; }); const c=document.querySelector('[data-cadqn]'); if(c) c.textContent=q.length?plural(n,'encontrado','encontrados'):''; }
  const cadB=(...xs)=>esc(norm(xs.filter(Boolean).join(' ')));
  function vCadastros(){ const k=R.cad||'funcoes'; const nEpiAv=caAvisos().length;
    const cont={funcoes:R.funcoes.length,setores:setoresCad().length,epis:(R.epis||[]).length};
    const nav=CAD_MENU.map(([g,its])=>`<div class="rh-cadg">${g}</div>`+its.map(([v,l])=>`<button class="rh-cn" data-act="rh-cad" data-v="${v}" ${k===v?'aria-current="page"':''}><span>${l}</span>${v==='epis'&&nEpiAv?`<b class="pill warn">${nEpiAv}</b>`:cont[v]!=null?`<small class="num">${cont[v]}</small>`:''}</button>`).join('')).join('');
    const corpo=k==='feriados'?vFeriados():k==='setores'?vSetores():k==='config'?vCfgRH():k==='epis'?vEpis():k==='textos'?vTextos():vFuncoes();
    queueMicrotask(cadFiltra);
    return topo('Cadastros do RH','Tudo o que o RH usa no dia a dia: funções, EPIs, setores, feriados e os textos das fichas.')
      +`<div class="rh-cadl"><nav class="rh-cadn" aria-label="Cadastros">${nav}</nav><div class="rh-cadc">${corpo}</div></div>`; }
  function vSetores(){ const cad=setoresCad(), usados=unicos('setor'), fora=usados.filter(n=>!cad.some(c=>norm(c)===norm(n))), at=R.func.filter(f=>f.status!=='Desligado'), qt=n=>at.filter(f=>norm(f.setor)===norm(n)).length;
    const fcs=n=>[...new Set(at.filter(f=>norm(f.setor)===norm(n)&&f.funcao).map(f=>f.funcao))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return cadTopo('Setores ('+cad.length+')','Aparecem para escolher no cadastro do funcionário, nos filtros, no organograma e nas fichas por setor.','')
      +(fora.length?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>Setores usados nos cadastros e ainda não cadastrados: <b>${esc(fora.join(', '))}</b></span><button class="btn sec rh-sm" data-act="rh-setall">Cadastrar todos</button></div>`:'')
      +`<section class="card"><div class="rh-cadt"><div class="rh-cadnew"><input class="txt" id="rh-setn" placeholder="Nome do setor novo (ex.: Linha 1, Expedição)"><button class="btn" data-act="rh-setadd">${P.ic('mais',18,2.4)}Cadastrar setor</button></div>${cadBusca('Buscar setor ou função')}</div>
        ${cad.length?`<div class="rh-tw"><table class="rh-t rh-ct"><thead><tr><th>Setor</th><th class="num">Pessoas</th><th>Funções no setor</th><th>Vagas abertas</th><th></th></tr></thead><tbody>${cad.map(n=>{ const q=qt(n), fs=fcs(n); return `<tr data-b="${cadB(n,fs.join(' '))}"><td><b>${esc(n)}</b></td><td class="num">${q}</td><td><small class="rh-cl" title="${esc(fs.join(', '))}">${esc(fs.join(', '))||'—'}</small></td>
          <td><input class="txt" type="number" min="0" max="50" data-rh-vaga="${esc(n)}" value="${esc(vagas()[n]||'')}" style="width:80px;height:36px" aria-label="Vagas abertas em ${esc(n)}"></td>
          <td class="rh-cact"><button class="lnk" data-act="rh-setren" data-v="${esc(n)}">Renomear</button>${q?'':`<button class="lnk" data-act="rh-setdel" data-v="${esc(n)}" style="color:var(--crit-ink)">Tirar</button>`}</td></tr>`; }).join('')}</tbody></table></div>`:'<div class="empty">Nenhum setor cadastrado ainda.</div>'}</section>`; }
  function vCfgRH(){ const c=R.cfg, m=FDESDE();
    return cadTopo('Configurações','Valem para todo o RH.','')
      +`<section class="card"><div class="rh-g">
        <label><span class="label">Avisar quantos dias antes (férias, experiência, PJ, terceirizados, CA dos EPIs)</span><input class="txt" id="rh-cpz" type="number" min="1" max="90" value="${esc(c.prazoAviso||15)}"></label>
        <label><span class="label">Cidade (nos documentos)</span><input class="txt" id="rh-ccid" value="${esc(c.cidade||'Cachoeirinha')}"></label>
        <label><span class="label">Fichas do mês: controlar a partir de</span><input class="txt" id="rh-cfd" type="month" value="${esc(m)}"></label></div>
        <label style="display:block;margin-top:12px"><span class="label">Documentos da admissão (um por linha)</span><textarea class="txt" id="rh-cdoc" rows="6">${esc(docsAdm().join('\n'))}</textarea></label>
        <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-act="rh-cfgsalvar">Salvar configurações</button></div></section>`; }
  function vTextos(){ return cadTopo('Textos das fichas','Declarações impressas nas fichas de EPI e de uniforme. Em branco = texto padrão do sistema.','')
      +`<section class="card"><label><span class="label">Declaração do uniforme</span><textarea class="txt" id="rh-du" rows="6">${esc(R.cfg.declUniforme||'')}</textarea></label>
        <label style="display:block;margin-top:12px"><span class="label">Declaração de EPI</span><textarea class="txt" id="rh-de" rows="6">${esc(R.cfg.declEpi||'')}</textarea></label>
        <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-act="rh-decl">Salvar textos</button></div></section>`; }
  /* ---------- catálogo de EPIs (rh/dados/epis): CA, validade do CA, tipo, fabricante, troca ---------- */
  const EPI_TIPOS=['Cabeça','Olhos e rosto','Ouvidos','Respiratório','Mãos e braços','Pés e pernas','Corpo','Trabalho em altura','Outro'];
  const caTxt=ca=>ca?(/^CA\b/i.test(ca)?'':'CA ')+ca:'';
  function caSit(e){ if(!okIso(e.validade)) return {c:'neu',t:'Sem validade',n:3}; const d=diasAte(e.validade);
    if(d<0) return {c:'crit',t:'Vencido',n:0,d}; if(d===0) return {c:'crit',t:'Vence hoje',n:0,d}; if(d<=PZ_AVISO()) return {c:'warn',t:'Vence em '+plural(d,'dia','dias'),n:1,d}; return {c:'ok',t:'Em dia',n:2,d}; }
  const epiUso=nome=>R.funcoes.filter(f=>(f.epis||[]).some(e=>norm(e.nome)===norm(nome)));
  const epiCat=nome=>(R.epis||[]).find(e=>norm(e.nome)===norm(nome));
  const caAvisos=()=>(R.epis||[]).filter(e=>!e.inativo).map(e=>({e,s:caSit(e)})).filter(o=>o.s.c==='crit'||o.s.c==='warn');
  const episSemCad=()=>{ const m={}; R.funcoes.forEach(f=>(f.epis||[]).forEach(e=>{ const k=norm(e.nome); if(k&&!epiCat(e.nome)&&!m[k]) m[k]={nome:e.nome,ca:e.ca||''}; })); return Object.values(m).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')); };
  function vEpis(){ const xs=(R.epis||[]).slice().map(e=>({e,s:caSit(e),u:epiUso(e.nome)})).sort((a,b)=>(a.e.inativo?1:0)-(b.e.inativo?1:0)||a.s.n-b.s.n||a.e.nome.localeCompare(b.e.nome,'pt-BR')), sc=episSemCad();
    return cadTopo('EPIs ('+xs.length+')','O catálogo de EPIs da empresa: CA, validade do CA e onde cada um é usado. Avisa '+PZ_AVISO()+' dias antes do CA vencer.',`<button class="btn" data-act="rh-epinovo">${P.ic('mais',18,2.4)}Novo EPI</button>`)
      +(sc.length?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>${plural(sc.length,'EPI usado nas funções ainda não está','EPIs usados nas funções ainda não estão')} no catálogo: <b>${esc(sc.slice(0,8).map(x=>x.nome).join(', '))}${sc.length>8?'…':''}</b></span><button class="btn sec rh-sm" data-act="rh-epiall">Trazer para o catálogo</button></div>`:'')
      +(R.fe?formEpi():'')
      +`<section class="card"><div class="rh-cadt">${cadBusca('Buscar EPI, CA, tipo ou função')}</div>
        ${xs.length?`<div class="rh-tw"><table class="rh-t rh-ct"><thead><tr><th>EPI</th><th>CA</th><th>Validade do CA</th><th>Tipo</th><th>Usado em</th><th></th></tr></thead><tbody>${xs.map(({e,s,u})=>`<tr data-b="${cadB(e.nome,e.ca,e.tipo,e.fabricante,u.map(f=>f.nome).join(' '))}" class="${e.inativo?'rh-inat':''}">
          <td><button class="rh-nm" data-act="rh-epied" data-id="${e._id}">${esc(e.nome)}</button>${e.fabricante?`<small style="display:block;color:var(--muted)">${esc(e.fabricante)}</small>`:''}${e.inativo?' <span class="pill neu">fora de uso</span>':''}</td>
          <td class="num">${esc(e.ca||'—')}</td><td>${okIso(e.validade)?`<span class="num">${br(e.validade)}</span> `:''}<span class="pill ${s.c}">${esc(s.t)}</span></td><td>${esc(e.tipo||'')}</td>
          <td><small class="rh-cl" title="${esc(u.map(f=>f.nome).join(', '))}">${u.length?plural(u.length,'função','funções')+': '+esc(u.map(f=>f.nome).join(', ')):'—'}</small></td><td class="rh-cact"><button class="lnk" data-act="rh-epied" data-id="${e._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`
          :'<div class="empty">Nenhum EPI no catálogo ainda. Clique em "Novo EPI" ou traga os EPIs que já estão nas funções.</div>'}</section>`; }
  function formEpi(){ const e=R.fe, u=e._id?epiUso(e.nome0||e.nome):[], i=(k,l,t,ex)=>`<label><span class="label">${l}</span><input class="txt" data-rh-fe="${k}" type="${t||'text'}" value="${esc(e[k]||'')}" ${ex||''}></label>`;
    return `<div class="rh-modal" data-act="rh-fex-fundo"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="EPI" style="max-width:640px"><div class="rh-ch"><h2>${e._id?'Editar EPI':'Novo EPI'}</h2><button class="lnk" data-act="rh-fex">Fechar</button></div>
      <div class="rh-g">${i('nome','Nome do EPI *','text','maxlength="80" placeholder="ex.: Luva de vaqueta"')}${i('ca','Número do CA','text','maxlength="20" inputmode="numeric"')}${i('validade','Validade do CA','date')}
        <label><span class="label">Tipo</span><select class="txt" data-rh-fe="tipo"><option value="">—</option>${EPI_TIPOS.map(t=>`<option ${e.tipo===t?'selected':''}>${t}</option>`).join('')}</select></label>
        ${i('fabricante','Fabricante','text','maxlength="60"')}${i('troca','Trocar a cada (dias)','number','min="0" max="999"')}</div>
      <label style="display:block;margin-top:10px"><span class="label">Observação</span><input class="txt" data-rh-fe="obs" maxlength="160" value="${esc(e.obs||'')}"></label>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" data-rh-fe="inativo" ${e.inativo?'checked':''}> Fora de uso (não avisa o vencimento)</label>
      ${u.length?`<div class="sub" style="margin-top:10px">Usado em ${plural(u.length,'função','funções')}: ${esc(u.map(f=>f.nome).join(', '))}. Se mudar o nome ou o CA, o painel atualiza essas funções também.</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap">${e._id?'<button class="lnk" data-act="rh-epidel" style="color:var(--crit-ink)">Apagar do catálogo</button>':'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="rh-fex">Cancelar</button><button class="btn" data-act="rh-episalvar">Salvar</button></div></div></div></div>`; }
  async function epiSalvar(){ const e=R.fe, v=k=>{ const x=document.querySelector(`[data-rh-fe="${k}"]`); return x?(x.type==='checkbox'?x.checked:String(x.value||'').trim()):''; };
    const d={nome:v('nome').replace(/\s+/g,' '),ca:v('ca'),validade:v('validade'),tipo:v('tipo'),fabricante:v('fabricante'),troca:Math.max(0,parseInt(v('troca'),10)||0),obs:v('obs'),inativo:!!v('inativo')};
    if(d.nome.length<2) return P.toast('Escreva o nome do EPI.'); if((R.epis||[]).some(x=>x._id!==e._id&&norm(x.nome)===norm(d.nome))) return P.toast('Esse EPI já está no catálogo.');
    const velho=e._id?(R.epis||[]).find(x=>x._id===e._id):null; await grava(COL.epis+'/'+(e._id||id()),d); let n=0;
    if(velho&&(norm(velho.nome)!==norm(d.nome)||String(velho.ca||'')!==d.ca)){ for(const f of epiUso(velho.nome)){ const epis=(f.epis||[]).map(x=>norm(x.nome)===norm(velho.nome)?Object.assign({},x,{nome:d.nome,ca:d.ca}):x); await grava(COL.funcoes+'/'+f._id,{epis}); n++; } }
    R.fe=null; P.toast('EPI salvo.'+(n?' '+plural(n,'função atualizada','funções atualizadas')+'.':'')); P.render(); if(n) try{ const F=fichasApi(); if(F) F.recarregar(); }catch(e){} }
  /* ---------- setores: renomear (muda também no cadastro das pessoas e nas vagas) ---------- */
  async function setorRenomear(velho){ const novo=String(prompt('Novo nome do setor "'+velho+'":',velho)||'').trim(); if(!novo||novo===velho) return;
    if(setoresCad().some(x=>x!==velho&&norm(x)===norm(novo))) return P.toast('Já existe um setor com esse nome.');
    const ps=R.func.filter(f=>norm(f.setor)===norm(velho)); if(ps.length&&!confirm('Mudar o setor de '+plural(ps.length,'pessoa','pessoas')+' de "'+velho+'" para "'+novo+'"?')) return;
    for(const f of ps) await grava(COL.func+'/'+f._id,{setor:novo});
    const vg=Object.assign({},vagas()); if(vg[velho]!=null){ vg[novo]=vg[velho]; delete vg[velho]; }
    await P.db().doc('rh/config').set({vagas:vg,alteradoEm:agora()},{merge:true}); R.cfg.vagas=vg; await setoresSalvar(setoresCad().map(x=>x===velho?novo:x));
    P.toast('Setor renomeado.'+(ps.length?' '+plural(ps.length,'pessoa atualizada','pessoas atualizadas')+'.':'')); P.render(); }
  async function setoresSalvar(xs){ const u=[...new Set(xs.map(x=>String(x||'').trim()).filter(Boolean))]; await P.db().doc('rh/config').set({setores:u,alteradoEm:agora()},{merge:true}); R.cfg.setores=u; }
  /* ---------- Funções e EPIs ---------- */
  /* ---------- funções, EPIs e uniformes da planilha do EPI (COLFIX_Controle_EPI, 13/10) já entram sozinhos, uma vez ----------
     modulos/rh-epi-padrao.json só tem funções, EPIs, CA, uniformes e as declarações da ficha (nada de pessoas).
     Só acrescenta a função que ainda não existe e só preenche a declaração vazia; depois marca rh/config.funcoesPadrao. */
  let _fpad=false;
  async function funcoesPadrao(){ if(_fpad||!R.lido.cfg||!R.lido.funcoes||R.cfg.funcoesPadrao) return; _fpad=true;
    try{ const r=await fetch('modulos/rh-epi-padrao.json',{cache:'no-cache'}); if(!r.ok) throw new Error('rh-epi-padrao.json '+r.status); const J=await r.json(); let n=0;
      for(const f of (J.funcoes||[])){ if(R.funcoes.some(x=>norm(x.nome)===norm(f.nome))) continue; await grava(COL.funcoes+'/'+id(),{nome:f.nome,epis:f.epis||[],uniformes:f.uniformes||[],origem:'planilha do EPI'}); n++; }
      const up={funcoesPadrao:agora()}; Object.keys(J.decl||{}).forEach(k=>{ if(!R.cfg[k]) up[k]=J.decl[k]; }); await grava('rh/config',up);
      if(n) P.toast(plural(n,'função da planilha do EPI cadastrada','funções da planilha do EPI cadastradas')+' (com EPIs e uniforme).'); }
    catch(e){ _fpad=false; console.warn('[rh] funções padrão',e); } }
  /* ---------- importar a planilha do EPI (COLFIX_Controle_EPI): abas "Base EPIs por Função" e "Base Uniformes por Função" ---------- */
  const FIMP_MAX=9, FIMP_EPI=15; /* a ficha impressa tem até 15 colunas de EPI e 9 de uniforme */
  const fimpLixo=v=>!v||/^CADASTRA/i.test(v)||/^#/.test(v);
  function fimpAba(rows,ehEpi){ const hi=rows.findIndex(r=>norm(r[0])==='FUNCAO'); if(hi<0) return null; const H=rows[hi].map(norm), out={};
    const pares=[]; H.forEach((h,i)=>{ if(/^(EPI|UNIFORME)\s*\d+$/.test(h)){ const prox=H[i+1]||''; pares.push([i,/^(CA|TAMANHO)\b/.test(prox)?i+1:-1]); } });
    rows.slice(hi+1).forEach(r=>{ const nome=String(r[0]||'').trim().replace(/\s+/g,' ').toUpperCase(); if(!nome||fimpLixo(nome)) return; const its=(out[norm(nome)]=out[norm(nome)]||{nome,its:[]}).its;
      pares.forEach(([a,b])=>{ const n=String(r[a]||'').trim().replace(/\s+/g,' '); if(fimpLixo(n)) return; const x=b>=0?String(r[b]||'').trim():''; if(its.some(e=>norm(e.nome)===norm(n))) return; its.push(ehEpi?{nome:n,ca:fimpLixo(x)?'':x}:{nome:n,tam:fimpLixo(x)?'':x}); }); });
    return out; }
  async function fimpLer(file){ if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); const aba=re=>{ const n=wb.SheetNames.find(x=>re.test(norm(x))); return n?XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}):null; };
    const re=aba(/EPI.*FUNC/), ru=aba(/UNIFORME.*FUNC/); if(!re&&!ru) throw new Error('Não achei as abas "Base EPIs por Função" e "Base Uniformes por Função".');
    const E=(re&&fimpAba(re,true))||{}, U=(ru&&fimpAba(ru,false))||{}; const ks=[...new Set([...Object.keys(E),...Object.keys(U)])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const linhas=ks.map(k=>{ const ex=R.funcoes.find(x=>norm(x.nome)===k); const nome=(E[k]||U[k]).nome;
      const junta=(novos,velhos,c)=>novos.map(n=>{ const v=(velhos||[]).find(o=>norm(o.nome)===norm(n.nome)); return n[c]||!v?n:Object.assign({},n,{[c]:v[c]||''}); }); /* tamanho/CA que já estava no painel fica */
      const epis=E[k]?junta(E[k].its,ex&&ex.epis,'ca'):((ex&&ex.epis)||[]), uni=U[k]?junta(U[k].its,ex&&ex.uniformes,'tam'):((ex&&ex.uniformes)||[]);
      const corta=[...epis.slice(FIMP_EPI).map(e=>e.nome),...uni.slice(FIMP_MAX).map(e=>e.nome)];
      const d={epis:epis.slice(0,FIMP_EPI),uniformes:uni.slice(0,FIMP_MAX)}; const igual=ex&&JSON.stringify((ex.epis||[]).map(e=>[e.nome,e.ca||'']))===JSON.stringify(d.epis.map(e=>[e.nome,e.ca||'']))&&JSON.stringify((ex.uniformes||[]).map(e=>[e.nome,e.tam||'']))===JSON.stringify(d.uniformes.map(e=>[e.nome,e.tam||'']));
      return {id:ex?ex._id:null,nome:ex?ex.nome:nome,novo:!ex,igual,d,corta}; });
    let decl={}; const fm=aba(/FICHA/); if(fm) fm.slice(0,15).forEach(r=>r.forEach(c=>{ if(typeof c==='string'&&c.length>200){ if(/uniforme/i.test(c)&&!decl.declUniforme) decl.declUniforme=c.trim(); else if(/EPI/i.test(c)&&!decl.declEpi) decl.declEpi=c.trim(); } }));
    Object.keys(decl).forEach(k=>{ if(R.cfg[k]) delete decl[k]; }); /* declaração que o RH já escreveu no painel não muda */
    const colab=wb.SheetNames.some(x=>/COLABORADOR/.test(norm(x)));
    return {linhas,decl,colab,arq:file.name}; }
  function vFimp(){ const g=R.fimp; if(!g) return ''; const nv=g.linhas.filter(o=>o.novo), mu=g.linhas.filter(o=>!o.novo&&!o.igual), ig=g.linhas.filter(o=>o.igual), ct=g.linhas.filter(o=>o.corta.length);
    const item=o=>`<div class="row" style="grid-template-columns:minmax(0,1fr) auto;align-items:start"><div><b>${esc(o.nome)}</b> ${o.novo?'<span class="pill ok">nova</span>':o.igual?'<span class="pill neu">sem mudança</span>':'<span class="pill warn">atualiza</span>'}
      <small style="display:block;color:var(--muted)">EPI: ${o.d.epis.map(e=>esc(e.nome)+(e.ca?' ('+esc(e.ca)+')':'')).join(', ')||'—'}</small><small style="display:block;color:var(--muted)">Uniforme: ${o.d.uniformes.map(e=>esc(e.nome)).join(', ')||'—'}</small>
      ${o.corta.length?`<small style="display:block;color:var(--crit-ink)">Não cabe na ficha (máximo ${FIMP_EPI} EPIs e ${FIMP_MAX} peças): ${o.corta.map(esc).join(', ')}</small>`:''}</div></div>`;
    return `<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><h2>Importar planilha do EPI</h2><button class="lnk" data-act="rh-fimpx">Fechar</button></div>
      <div class="sub" style="margin-top:4px">${esc(g.arq)} · ${plural(nv.length,'função nova','funções novas')} · ${plural(mu.length,'atualizada','atualizadas')} · ${ig.length} sem mudança${g.decl.declEpi||g.decl.declUniforme?' · declarações da ficha':''}. Nada foi gravado ainda.</div>
      ${ct.length?`<div class="banner" style="background:var(--crit-tint);color:var(--crit-ink);margin-top:10px">${plural(ct.length,'função tem','funções têm')} itens demais: a ficha impressa tem até ${FIMP_EPI} EPIs e ${FIMP_MAX} peças de uniforme, então os itens em vermelho ficam de fora.</div>`:''}
      ${g.colab?'<div class="sub" style="margin-top:8px">A planilha também tem a aba <b>Base Colaboradores</b>: para trazer as pessoas, use <b>Funcionários › Importar planilha</b> com este mesmo arquivo.</div>':''}
      <div style="margin-top:10px;max-height:420px;overflow:auto">${[...nv,...mu,...ig].map(item).join('')}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-fimpx">Cancelar</button><button class="btn" data-act="rh-fimpok" ${(nv.length||mu.length||g.decl.declEpi||g.decl.declUniforme)&&!g.salvando?'':'disabled'}>${g.salvando?'Gravando…':'Gravar '+(nv.length+mu.length)+' funç'+(nv.length+mu.length===1?'ão':'ões')}</button></div></section>`; }
  async function fimpGravar(){ const g=R.fimp; if(!g||g.salvando) return; g.salvando=true; P.render(); let n=0;
    try{ for(const o of g.linhas){ if(o.igual) continue; await grava(COL.funcoes+'/'+(o.id||id()),{nome:o.nome,epis:o.d.epis,uniformes:o.d.uniformes}); n++; }
      if(g.decl.declEpi||g.decl.declUniforme) await grava('rh/config',Object.assign({},g.decl));
      P.toast(plural(n,'função gravada','funções gravadas')+'.'); R.fimp=null; }
    catch(e){ P.erro(e); g.salvando=false; } P.render(); }
  const MAX_EPI=15, MAX_UNI=9; /* a ficha impressa mostra até 15 EPIs (com mais de 9 fica mais apertada) e 9 peças de uniforme */
  const itChips=xs=>xs&&xs.length?`<span class="pill neu num">${xs.length}</span> <small class="rh-cl" title="${esc(xs.map(e=>e.nome).join(', '))}">${esc(xs.map(e=>e.nome).join(', '))}</small>`:'<small style="color:var(--crit-ink)">nenhum</small>';
  function vFuncoes(){ const ff=R.ff, semCad=unicos('funcao').filter(n=>!R.funcoes.some(x=>norm(x.nome)===norm(n))), at=R.func.filter(f=>f.status!=='Desligado'), qt=n=>at.filter(f=>norm(f.funcao)===norm(n)).length;
    const xs=R.funcoes.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return cadTopo('Funções ('+xs.length+')','Cada função com os EPIs (e CA) e o uniforme que vão para a ficha da pessoa.',`<label class="btn sec" style="cursor:pointer">${P.ic('folha',18,2)}Importar planilha do EPI<input type="file" id="rh-fimpf" accept=".xlsx,.xls" hidden></label><button class="btn" data-act="rh-fnovo">${P.ic('mais',18,2.4)}Nova função</button>`)
      +vFimp()
      +(semCad.length?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink)">Funções usadas por funcionários e ainda sem EPI/uniforme: ${semCad.map(n=>`<button class="lnk" data-act="rh-fnovo" data-n="${esc(n)}">${esc(n)}</button>`).join(', ')}</div>`:'')
      +(ff?formFuncao():'')
      +`<section class="card"><div class="rh-cadt">${cadBusca('Buscar função, EPI, CBO ou setor')}</div>
        ${xs.length?`<div class="rh-tw"><table class="rh-t rh-ct"><thead><tr><th>Função</th><th>CBO</th><th class="num">Pessoas</th><th>EPIs</th><th>Uniforme</th><th></th></tr></thead><tbody>${xs.map(x=>`<tr data-b="${cadB(x.nome,x.cbo,x.setor,(x.epis||[]).map(e=>e.nome+' '+(e.ca||'')).join(' '),(x.uniformes||[]).map(e=>e.nome).join(' '))}">
          <td><button class="rh-nm" data-act="rh-fed" data-id="${x._id}">${esc(x.nome)}</button>${x.setor||x.desc?`<small style="display:block;color:var(--muted)" class="rh-cl">${esc([x.setor,x.desc].filter(Boolean).join(' · '))}</small>`:''}</td>
          <td class="num">${esc(x.cbo||'')}</td><td class="num">${qt(x.nome)}</td><td>${itChips(x.epis)}</td><td>${itChips(x.uniformes)}</td><td class="rh-cact"><button class="lnk" data-act="rh-fed" data-id="${x._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma função cadastrada.</div>'}</section>`; }
  function formFuncao(){ const ff=R.ff, cat=(R.epis||[]).filter(e=>!e.inativo).slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const lin=(k,mx,ph2)=>{ const its=(ff[k]||[]).slice(0,mx), xs=its.length<mx?its.concat([{}]):its;
      return xs.map((x,i)=>`<div class="rh-it"><span class="rh-itn num">${i+1}</span><input class="txt" data-rh-it="${k}" data-i="${i}" data-c="nome" ${k==='epis'?'list="rh-epil"':''} placeholder="${k==='epis'?'EPI':'Peça do uniforme'}" value="${esc(x.nome||'')}"><input class="txt" data-rh-it="${k}" data-i="${i}" data-c="${k==='epis'?'ca':'tam'}" placeholder="${ph2}" value="${esc(x[k==='epis'?'ca':'tam']||'')}">${x.nome?`<button class="rh-itx" data-act="rh-itrem" data-k="${k}" data-i="${i}" aria-label="Tirar ${esc(x.nome)}" title="Tirar">×</button>`:'<span></span>'}</div>`).join('')
        +(its.length<mx?`<button class="lnk rh-itadd" data-act="rh-itadd" data-k="${k}">+ Adicionar ${k==='epis'?'EPI':'peça'}</button>`:`<div class="sub" style="font-size:12.5px">Máximo de ${mx} (é o que cabe na ficha impressa).</div>`); };
    const nE=(ff.epis||[]).filter(x=>x.nome).length, nU=(ff.uniformes||[]).filter(x=>x.nome).length, outras=R.funcoes.filter(x=>x._id!==ff._id).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const nP=ff._id?R.func.filter(f=>f.status!=='Desligado'&&norm(f.funcao)===norm(ff.nome0||ff.nome)).length:0;
    return `<div class="rh-modal" data-act="rh-ffx-fundo"><div class="rh-mbox rh-ffm" role="dialog" aria-modal="true" aria-label="Função"><div class="rh-ch"><h2>${ff._id?'Editar função':'Nova função'}</h2><button class="lnk" data-act="rh-ffx">Fechar</button></div>
      <datalist id="rh-epil">${cat.map(e=>`<option value="${esc(e.nome)}">${esc(caTxt(e.ca))}</option>`).join('')}</datalist>
      <div class="rh-g"><label style="grid-column:span 2"><span class="label">Nome da função *</span><input class="txt" data-rh-ff="nome" maxlength="80" value="${esc(ff.nome||'')}"></label>
        <label><span class="label">CBO</span><input class="txt" data-rh-ff="cbo" maxlength="10" inputmode="numeric" placeholder="ex.: 7842-05" value="${esc(ff.cbo||'')}"></label>
        <label><span class="label">Setor</span><select class="txt" data-rh-ff="setor"><option value="">—</option>${setoresCad().map(x=>`<option ${x===ff.setor?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div>
      <label style="display:block;margin-top:10px"><span class="label">O que faz (descrição das atividades)</span><textarea class="txt" data-rh-ff="desc" rows="2" maxlength="600">${esc(ff.desc||'')}</textarea></label>
      ${nP?`<div class="sub" style="margin-top:8px">${plural(nP,'pessoa tem','pessoas têm')} esta função.${ff._id?' Se mudar o nome, o painel muda no cadastro delas também.':''}</div>`:''}
      <div class="rh-ffi"><div><div class="rh-ffh"><span class="label">EPIs · ${nE} de ${MAX_EPI}</span>${cat.length?'':'<small class="sub">Cadastre os EPIs em Cadastros › EPIs para escolher da lista.</small>'}</div>${lin('epis',MAX_EPI,'CA')}</div>
        <div><div class="rh-ffh"><span class="label">Uniforme · ${nU} de ${MAX_UNI}</span></div>${lin('uniformes',MAX_UNI,'Tamanho')}</div></div>
      ${outras.length?`<div class="rh-ffc"><span class="sub">Copiar EPIs e uniforme de:</span><select class="txt" id="rh-ffcopia"><option value="">escolha a função…</option>${outras.map(x=>`<option value="${x._id}">${esc(x.nome)}</option>`).join('')}</select><button class="btn sec rh-sm" data-act="rh-ffcopia">Copiar</button></div>`:''}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap">${ff._id?'<button class="lnk" data-act="rh-fdel" style="color:var(--crit-ink)">Apagar função</button>':'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="rh-ffx">Cancelar</button><button class="btn" data-act="rh-fsalvar">Salvar</button></div></div></div></div>`; }
  /* lê o formulário da função para o estado (antes de redesenhar) */
  function ffLer(){ const ff=R.ff; if(!ff) return; document.querySelectorAll('[data-rh-ff]').forEach(e=>{ ff[e.dataset.rhFf]=e.value; });
    const o={epis:[],uniformes:[]}; document.querySelectorAll('[data-rh-it]').forEach(e=>{ const k=e.dataset.rhIt, i=+e.dataset.i; o[k][i]=o[k][i]||{}; o[k][i][e.dataset.c]=e.value.trim(); });
    ['epis','uniformes'].forEach(k=>{ if(document.querySelector(`[data-rh-it="${k}"]`)) ff[k]=o[k].filter(x=>x&&(x.nome||x.ca||x.tam)); }); }
  function odBarra(){ const c=(P.S.cfg||{}).onedrive||{}, O=window.OneDrive; if(!O) return ''; const dono=P.dono();
    let barra='';
    if(O.ativo()) barra=O.conectado()?`<div class="banner" style="background:var(--ok-tint);color:var(--ok-ink);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>As fichas estão sendo salvas no <b>OneDrive</b>${O.conta()?' de '+esc(O.conta()):''} · pasta <b>${esc(c.link?'compartilhada da equipe':(c.pasta||'Fichas EPI e Uniforme'))}</b>, separada por mês.</span><button class="lnk" data-act="od-sair">Desconectar</button></div>`
      :`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>As fichas são salvas no <b>OneDrive</b>. Conecte sua conta Microsoft da empresa neste aparelho para enviar e consultar.</span><button class="btn" data-act="od-con">Conectar ao OneDrive</button></div>`;
    const cf=dono&&R.fv==='gerar'?`<details class="card od-cfg" ${c.clientId?'':'open'}><summary><b>OneDrive (Microsoft 365)</b> · ${O.ativo()?'ligado':'desligado (fichas ficam no painel)'}</summary>
      <div class="sub" style="margin:8px 0 10px">Endereço de retorno para cadastrar no Microsoft Entra (tipo <b>Aplicativo de página única / SPA</b>):<br><code style="user-select:all">${esc(O.retorno())}</code></div>
      <div class="rh-g"><label><span class="label">ID do aplicativo (cliente) *</span><input class="txt" id="od-cli" value="${esc(c.clientId||'')}" placeholder="00000000-0000-0000-0000-000000000000"></label>
        <label><span class="label">ID do diretório (locatário)</span><input class="txt" id="od-ten" value="${esc(c.tenant||'')}" placeholder="vazio = qualquer conta da empresa"></label>
        <label><span class="label">Pasta no OneDrive de quem conectar</span><input class="txt" id="od-pas" value="${esc(c.pasta||'Fichas EPI e Uniforme')}"></label>
        <label><span class="label">Ou link de uma pasta compartilhada da equipe</span><input class="txt" id="od-lnk" value="${esc(c.link||'')}" placeholder="https://empresa-my.sharepoint.com/…"></label></div>
      <label class="ck" style="margin-top:10px"><input type="checkbox" id="od-ati" ${c.ativo?'checked':''}> Salvar as fichas no OneDrive</label>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-act="od-salvar">Salvar configuração</button></div></details>`:'';
    return barra+cf; }

  /* ---------- Terceirizados: prazo do contrato ---------- */
  function bannerTerc(){ const xs=tAvisos(); if(!xs.length) return ''; const v=xs.filter(o=>o.s.c==='crit').length;
    return `<div class="banner" style="background:${v?'var(--crit-tint)':'var(--warn-tint)'};color:${v?'var(--crit-ink)':'var(--warn-ink)'};display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span><b>Contratos de terceirizados:</b> ${v?v+' vencido(s)':''}${v&&xs.length-v?' · ':''}${xs.length-v?(xs.length-v)+' vencendo':''}</span><button class="lnk" data-go="rhterc">Ver terceirizados</button></div>`; }
  function vTerc(){ const F=R.tfil; let xs=R.terc.filter(x=>F==='todos'?true:F==='ativos'?x.status!=='Encerrado':F==='aviso'?['crit','warn'].includes(tSit(x).c):x.status==='Encerrado');
    xs=xs.map(x=>({x,s:tSit(x)})).sort((a,b)=>a.s.n-b.s.n||(a.s.d||0)-(b.s.d||0)||String(a.x.nome).localeCompare(String(b.x.nome),'pt-BR'));
    const nAv=tAvisos().length;
    return topo('Funcionários','Terceirizados: prestadores de serviço, o prazo de cada contrato e os documentos (certidões, ASO, NR, seguro). Avisa no Meu dia quando estiver perto de vencer.',fsegH()+`<button class="btn" data-act="rh-tnovo">${P.ic('mais',18,2.4)}Novo terceirizado</button>`)
      +(R.tdoc?painelDocsTerc():'')+(R.ft?formTerc():'')
      +`<section class="card"><div class="seg" style="margin-bottom:12px">${[['ativos','Ativos'],['aviso','Vencendo ou vencidos'+(nAv?' ('+nAv+')':'')],['encerrados','Encerrados'],['todos','Todos']].map(([k,l])=>`<button data-act="rh-tfil" data-v="${k}" aria-pressed="${F===k}">${l}</button>`).join('')}</div>
      ${!R.lido.terc?'<div class="empty">Carregando…</div>':xs.length?`<div class="rh-tw"><table class="rh-t"><thead><tr><th>Nome</th><th>Empresa</th><th>Serviço</th><th>Início</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(({x,s})=>`<tr><td><b>${esc(x.nome)}</b>${x.telefone?`<small style="display:block;color:var(--muted)">${esc(x.telefone)}</small>`:''}</td><td>${esc(x.empresa||'')}${x.cnpj?`<small style="display:block;color:var(--muted)">${esc(x.cnpj)}</small>`:''}</td><td>${esc(x.servico||'')}${x.setor?`<small style="display:block;color:var(--muted)">${esc(x.setor)}</small>`:''}</td>
          <td class="num">${br(x.inicio)}</td><td class="num"><b>${br(x.fim)}</b>${(x.renovacoes||[]).length?`<small style="display:block;color:var(--muted)">${x.renovacoes.length} renovação(ões)</small>`:''}</td><td><span class="pill ${s.c}">${esc(s.t)}</span><div style="margin-top:4px">${tDocResumo(x)}</div></td>
          <td style="white-space:nowrap">${x.status!=='Encerrado'?`<button class="lnk" data-act="rh-tren" data-id="${x._id}">Renovar</button> · `:''}<button class="lnk" data-act="rh-tdoc" data-id="${x._id}">Documentos${tDocs(x).length?' ('+tDocs(x).length+')':''}</button> · <button class="lnk" data-act="rh-ted" data-id="${x._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum terceirizado aqui.</div>'}</section>`; }
  function formTerc(){ const f=R.ft; const i=(k,l,t,ex)=>`<label><span class="label">${l}</span><input class="txt" data-rh-t="${k}" type="${t||'text'}" value="${esc(f[k]==null?'':f[k])}" ${ex||''}></label>`;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>${f.renovar?'Renovar contrato de '+esc(f.nome):f._id?'Editar terceirizado':'Novo terceirizado'}</h2><button class="lnk" data-act="rh-tfx">Fechar</button></div>
      ${f.renovar?`<div class="sub" style="margin:0 0 10px">Vencimento atual: <b>${br(f.fimAnterior)}</b>. Informe o novo vencimento.</div><div class="rh-g">${i('fim','Novo vencimento *','date')}${i('obsRen','Observação da renovação')}</div>`
      :`<div class="rh-g">${i('nome','Nome do prestador *')}${i('cpf','CPF (opcional)','text','inputmode="numeric" maxlength="14"')}${i('empresa','Empresa (prestadora) *')}${i('cnpj','CNPJ da empresa (opcional)')}
        ${i('servico','Serviço / função')}${i('setor','Setor onde atua')}${i('inicio','Início do contrato','date')}${i('fim','Vencimento do contrato *','date')}
        ${i('aviso','Avisar quantos dias antes','number','min="1" max="365"')}${i('telefone','Telefone','tel')}${i('valor','Valor mensal (opcional)')}
        <label><span class="label">Situação</span><select class="txt" data-rh-t="status">${opts(['Ativo','Encerrado'],f.status||'Ativo')}</select></label></div>
        <label style="display:block;margin-top:10px"><span class="label">Observações</span><textarea class="txt" data-rh-t="obs" rows="2">${esc(f.obs||'')}</textarea></label>
        ${(f.renovacoes||[]).length?`<div class="sub" style="margin:10px 0 0">Renovações: ${f.renovacoes.map(r=>br(r.de)+' → '+br(r.para)+' ('+esc(r.porNome||'')+')').join(' · ')}</div>`:''}`}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-tfx">Cancelar</button><button class="btn" data-act="rh-tsalvar" ${R.salv?'disabled':''}>${f.renovar?'Renovar':'Salvar'}</button></div></section>`; }

  /* ---------- Documentos e contratos ---------- */
  /* campos que o modelo pode usar; no texto ficam como {NOME}, {CPF}... */
  const CAMPOS=[['NOME','Nome'],['CPF','CPF'],['FUNCAO','Função'],['SETOR','Setor'],['ADMISSAO','Admissão'],['VINCULO','Vínculo'],['EMPRESA','Empresa'],['CNPJ','CNPJ da empresa'],['CNPJ_PJ','CNPJ do PJ'],['RAZAO_PJ','Razão social do PJ (MEI)'],
    ['SALARIO','Salário'],['SALARIO_EXTENSO','Salário por extenso'],['JORNADA','Jornada'],['TELEFONE','Telefone'],['CIDADE','Cidade'],['DATA_HOJE','Data de hoje'],
    ['FERIAS_INICIO','Início das férias'],['FERIAS_FIM','Fim das férias'],['FERIAS_DIAS','Dias de férias'],['FERIAS_RETORNO','Volta das férias'],['PERIODO_AQUISITIVO','Período aquisitivo'],
    ['ULTIMA_TROCA','Última troca (PJ)'],['PROXIMA_TROCA','Próxima troca (PJ)'],['EXP_FIM_1','Fim da 1ª etapa (experiência)'],['EXP_FIM_2','Fim da experiência'],['DESLIGAMENTO','Data do desligamento'],['PAGO_ATE','Pago até (último dia já pago)'],['SALDO_INICIO','Início do saldo a pagar'],
    ['NASCIMENTO','Nascimento'],['ENDERECO','Endereço'],['OCORRENCIA_DATA','Data da ocorrência'],['OCORRENCIA_TIPO','Tipo da ocorrência'],['OCORRENCIA_MOTIVO','Motivo da ocorrência'],['OCORRENCIA_TESTEMUNHAS','Testemunhas da ocorrência'],['SUSPENSAO_DIAS','Dias de suspensão']];
  const CAMPOS_FER=['FERIAS_INICIO','FERIAS_FIM','FERIAS_DIAS','FERIAS_RETORNO','PERIODO_AQUISITIVO'];
  const CAMPO_NOME=k=>(CAMPOS.find(x=>x[0]===k)||[k,k])[1];
  /* o que pode faltar no cadastro (preenche na hora de gerar) */
  const FALTA_CAMPO={SALARIO:'salario',SALARIO_EXTENSO:'salario',JORNADA:'jornada',FUNCAO:'funcao',SETOR:'setor',ADMISSAO:'admissao',TELEFONE:'telefone'};
  const VALE=[['CLT','CLT · Colafix'],['ZENITH','PJ · Zenith'],['NEXUS','PJ · Nexus'],['PJ','PJ · Zenith e Nexus'],['TODOS','Todos']];
  const valeNome=v=>({CLT:'Colafix',ZENITH:'Zenith',NEXUS:'Nexus',PJ:'Zenith e Nexus',TODOS:'todas'})[v]||'todas';
  const valePara=(md,f)=>{ const v=md.vale||'TODOS'; if(v==='TODOS') return true; if(v==='CLT') return f.tipo!=='PJ'; if(v==='PJ') return f.tipo==='PJ'; return f.tipo==='PJ'&&f.empresa===v; };
  function brl(v){ const n=typeof v==='number'?v:numBR(v); if(n==null) return ''; return 'R$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function numBR(t){ if(t==null||t==='') return null; if(typeof t==='number') return isFinite(t)?t:null; let s=String(t).replace(/[^\d,.-]/g,''); if(!s) return null;
    if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); else if(/\.\d{3}$/.test(s)) s=s.replace(/\./g,''); const n=parseFloat(s); return isFinite(n)?Math.round(n*100)/100:null; }
  /* valor por extenso (reais e centavos), como no exemplo: "dois mil, cento e cinquenta reais" */
  const UN=['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const DZ=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const CT=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function ate999(n){ if(!n) return ''; if(n===100) return 'cem'; const c=Math.floor(n/100), r=n%100, p=[]; if(c) p.push(CT[c]); if(r) p.push(r<20?UN[r]:DZ[Math.floor(r/10)]+(r%10?' e '+UN[r%10]:'')); return p.join(' e '); }
  function inteiroExt(n){ if(!n) return 'zero'; const g=[[Math.floor(n/1e6),'mi'],[Math.floor(n%1e6/1000),'mil'],[n%1000,'']].filter(x=>x[0]);
    return g.map(([v,k],i)=>{ const t=k==='mi'?(v===1?'um milhão':ate999(v)+' milhões'):k==='mil'?(v===1?'mil':ate999(v)+' mil'):ate999(v); if(!i) return t; const ult=i===g.length-1; return (ult&&(v<100||v%100===0)?' e ':', ')+t; }).join(''); }
  function extenso(v){ if(v==null) return ''; const r=Math.floor(v+1e-9), c=Math.round((v-r)*100); const p=[];
    if(r) p.push(inteiroExt(r)+(r%1e6===0?' de reais':r===1?' real':' reais')); if(c) p.push(ate999(c)+(c===1?' centavo':' centavos')); return p.join(' e ')||'zero real'; }
  const dataExt=d=>{ d=d||new Date(); return d.getDate()+' de '+MESES[d.getMonth()]+' de '+d.getFullYear(); };
  function valores(f,ex,fer){ ex=ex||{}; const g=k=>ex[k]!=null&&ex[k]!==''?ex[k]:f[k]; const e=EMP_DOC[f.tipo==='PJ'?f.empresa:'COLAFIX'], sal=numBR(g('salario')), pb=f.tipo==='PJ'?pjBase(f):'';
    return Object.assign(ocVals(f),{NOME:f.nome||'',CPF:fCPF(f.cpf),NASCIMENTO:br(f.nascimento),ENDERECO:[f.endereco,f.cep?'CEP '+f.cep:''].filter(Boolean).join(' · '),FUNCAO:g('funcao')||'',SETOR:g('setor')||'',ADMISSAO:br(g('admissao')),VINCULO:f.tipo==='PJ'?'PJ':'CLT',
      EMPRESA:e?e.nome:empNome(f.empresa),CNPJ:e?e.cnpj:'',CNPJ_PJ:f.tipo==='PJ'&&f.cnpj?fCNPJ(f.cnpj):'',RAZAO_PJ:f.tipo==='PJ'&&f.cnpj?fCNPJ(f.cnpj).slice(0,10)+' '+(f.nome||''):(f.nome||''), /* MEI: 8 primeiros números do CNPJ + nome */SALARIO:sal!=null?brl(sal):'',SALARIO_EXTENSO:sal!=null?extenso(sal):'',JORNADA:g('jornada')||'',TELEFONE:g('telefone')||'',
      CIDADE:R.cfg.cidade||'Cachoeirinha',DATA_HOJE:dataExt(),
      FERIAS_INICIO:fer?br(fer.inicio):'',FERIAS_FIM:fer?br(fer.fim):'',FERIAS_DIAS:fer?String(fer.dias):'',FERIAS_RETORNO:fer?br(fer.retorno):'',PERIODO_AQUISITIVO:fer?br(fer.aquisitivo)+' a '+br(fer.aquisitivoFim):'',
      ULTIMA_TROCA:pb?br(pb):'',PROXIMA_TROCA:pb?br(addMeses(pb,3)):'',EXP_FIM_1:f.tipo!=='PJ'&&okIso(f.admissao)?br(expFim1(f)):'',EXP_FIM_2:f.tipo!=='PJ'&&okIso(f.admissao)?br(expFim2(f)):'',
      DESLIGAMENTO:okIso(f.desligamento)?br(f.desligamento):okIso(R.dg.deslData)?br(R.dg.deslData):'',
      ...(()=>{ const dl=okIso(R.dg.deslData)?R.dg.deslData:okIso(f.desligamento)?f.desligamento:''; if(!dl) return {PAGO_ATE:'',SALDO_INICIO:''}; const ini=dl.slice(0,8)+'01'; return {PAGO_ATE:br(addDias(ini,-1)),SALDO_INICIO:br(ini)}; })() }); } /* distrato: pago até o fim do mês anterior; saldo do dia 1º até o desligamento */
  const EX_FER={inicio:'2026-11-03',fim:'2026-11-22',dias:20,retorno:'2026-11-23',aquisitivo:'2025-03-10',aquisitivoFim:'2026-03-09'};
  const EXEMPLO={nome:'MARIA DA SILVA',cpf:'00000000000',nascimento:'1990-04-12',endereco:'Rua das Flores, 120 · Centro · Cachoeirinha',funcao:'Operadora de produção',setor:'Linha 1',admissao:'2024-03-10',tipo:'CLT',empresa:'COLAFIX',salario:2150,jornada:'44 horas semanais',telefone:'(51) 90000-0000'};
  const tkHTML=k=>`<span class="rh-tk" contenteditable="false" data-k="${k}">${esc(CAMPO_NOME(k))}</span>`;
  /* campo perguntado: no Word {?Data de início das férias}; o painel pergunta na hora de gerar */
  const tqHTML=q=>`<span class="rh-tq" contenteditable="false" data-q="${esc(q)}">? ${esc(q)}</span>`;
  const qLimpa=q=>String(q||'').replace(/\s+/g,' ').trim().slice(0,80);
  const qData=q=>/\bDATA\b|\bDIA\b/.test(norm(q))&&!/\bDIAS\b/.test(norm(q));
  /* limpa o HTML (do editor ou do Word): só formatação simples e os campos */
  const TAGS=new Set(['P','BR','B','STRONG','I','EM','U','H1','H2','H3','UL','OL','LI','TABLE','THEAD','TBODY','TR','TD','TH','DIV','SPAN']);
  function limpar(html){ const doc=new DOMParser().parseFromString('<div>'+String(html||'')+'</div>','text/html'), raiz=doc.body.firstChild;
    const chave=t=>{ const n=norm(t).replace(/\s+/g,'_'); const c=CAMPOS.find(([k,l])=>k===n||norm(l).replace(/\s+/g,'_')===n); return c&&c[0]; };
    (function anda(el){ [...el.childNodes].forEach(n=>{
      if(n.nodeType===3){ if(n.nodeValue.includes('\u200B')) n.nodeValue=n.nodeValue.replace(/\u200B/g,''); const t=n.nodeValue; if(!/\{[^{}]{2,82}\}/.test(t)) return; const fr=doc.createDocumentFragment(); let u=0; t.replace(/\{\s*([^{}]{2,82}?)\s*\}/g,(m,x,i)=>{ let s;
        if(x.charAt(0)==='?'){ const q=qLimpa(x.slice(1)); if(q.length<2) return m; s=doc.createElement('span'); s.className='rh-tq'; s.dataset.q=q; }
        else { const k=chave(x); if(!k) return m; s=doc.createElement('span'); s.className='rh-tk'; s.dataset.k=k; }
        fr.appendChild(doc.createTextNode(t.slice(u,i))); fr.appendChild(s); u=i+m.length; return m; }); fr.appendChild(doc.createTextNode(t.slice(u))); n.replaceWith(fr); return; }
      if(n.nodeType!==1){ n.remove(); return; }
      if(/^(SCRIPT|STYLE|IFRAME|OBJECT|IMG|svg|LINK|META)$/i.test(n.tagName)){ n.remove(); return; }
      if(n.tagName==='SPAN'&&n.classList.contains('rh-tk')&&CAMPOS.some(c=>c[0]===n.dataset.k)){ const k=n.dataset.k; [...n.attributes].forEach(a=>n.removeAttribute(a.name)); n.className='rh-tk'; n.dataset.k=k; n.textContent=''; return; }
      if(n.tagName==='SPAN'&&n.classList.contains('rh-tq')){ const q=qLimpa(n.dataset.q); if(q.length<2){ n.remove(); return; } [...n.attributes].forEach(a=>n.removeAttribute(a.name)); n.className='rh-tq'; n.dataset.q=q; n.textContent=''; return; }
      if(!TAGS.has(n.tagName)){ anda(n); n.replaceWith(...n.childNodes); return; }
      const al=(n.style&&n.style.textAlign)||n.getAttribute('align')||''; [...n.attributes].forEach(a=>n.removeAttribute(a.name));
      if(/^(center|right|justify)$/.test(al)&&/^(P|H1|H2|H3|DIV)$/.test(n.tagName)) n.style.textAlign=al;
      if(n.tagName==='SPAN'){ anda(n); n.replaceWith(...n.childNodes); return; }
      anda(n); }); })(raiz);
    return raiz.innerHTML; }
  /* modelo salvo → editor (campos viram etiquetas) */
  function domDe(html){ const doc=new DOMParser().parseFromString('<div>'+limpar(html)+'</div>','text/html'); return doc.body.firstChild; }
  function paraEditor(html){ const r=domDe(html); r.querySelectorAll('span.rh-tk').forEach(s=>{ s.setAttribute('contenteditable','false'); s.textContent=CAMPO_NOME(s.dataset.k); });
    r.querySelectorAll('span.rh-tq').forEach(s=>{ s.setAttribute('contenteditable','false'); s.textContent='? '+s.dataset.q; }); return r.innerHTML; }
  /* modelo + valores → documento pronto (marcar=true realça o que veio do cadastro, como no exemplo) */
  function montar(html,vals,marcar,resp){ resp=resp||{}; const r=domDe(html), doc=r.ownerDocument;
    const troca=(s,v,rot)=>{ if(v&&marcar){ const x=doc.createElement('span'); x.className='rh-v'; x.textContent=v; s.replaceWith(x); } else if(v) s.replaceWith(doc.createTextNode(v)); else { const x=doc.createElement('span'); x.className='rh-falta'; x.textContent='['+rot+']'; s.replaceWith(x); } };
    r.querySelectorAll('span.rh-tk').forEach(s=>troca(s,vals[s.dataset.k],CAMPO_NOME(s.dataset.k)));
    r.querySelectorAll('span.rh-tq').forEach(s=>{ const q=s.dataset.q, v=String(resp[q]==null?'':resp[q]).trim(); troca(s,okIso(v)?br(v):v,q); });
    return r.innerHTML; }
  const camposDe=html=>[...new Set([...domDe(html).querySelectorAll('span.rh-tk')].map(s=>s.dataset.k))];
  const perguntasDe=html=>[...new Set([...domDe(html).querySelectorAll('span.rh-tq')].map(s=>s.dataset.q))];
  const DOC_CSS='body{font-family:"Times New Roman",Georgia,serif;font-size:12pt;line-height:1.6;color:#111;margin:0}h1,h2,h3{text-align:center;font-size:13pt;letter-spacing:.02em;margin:0 0 14px}p{margin:0 0 10px;text-align:justify}.rh-falta{color:#A2453D}.rh-ass{display:flex;gap:40px;margin-top:56px}.rh-ass div{flex:1;border-top:1px solid #111;text-align:center;padding-top:4px;font-family:"Segoe UI",Arial,sans-serif;font-size:10pt}';
  const assinaturas=f=>`<div class="rh-ass"><div>${f.tipo==='PJ'?'Contratante':'Empregadora'}</div><div>${esc(f.nome||'')}</div></div>`;

  function vDocs(){ const EY='RH · DOCUMENTOS E CONTRATOS';
    const seg=`<div class="seg" role="group" aria-label="Documentos">${[['modelos','Modelos'],['gerar','Gerar contrato']].map(([k,l])=>`<button data-act="rh-dv" data-v="${k}" aria-pressed="${R.dv===k}">${l}</button>`).join('')}</div>`;
    const seg2=`<div class="seg" role="group" aria-label="Para quem">${[['','Uma pessoa'],['1','Várias pessoas']].map(([k,l])=>`<button data-act="rh-dlote" data-v="${k}" aria-pressed="${!!R.dg.lote===!!k}">${l}</button>`).join('')}</div>`;
    if(R.dv==='gerar') return topo(R.dg.lote?'Gerar para várias pessoas':'Gerar contrato','',seg2+seg,EY)+(R.dg.lote?vDocLote():vDocGerar());
    const ms=R.modelos.slice().sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR')), dm=R.dm;
    return topo('Modelos de documento','Cadastre o padrão uma vez. Os campos entre chaves são preenchidos com os dados do funcionário.',seg+`<label class="btn sec" style="cursor:pointer">Importar do Word (.docx)<input type="file" id="rh-docx" accept=".docx" multiple hidden></label><button class="btn" data-act="rh-dnovo">Novo modelo</button>`,EY)
      +`<div class="rh-dg"><section class="card rh-dlist">${!R.lido.modelos?'<div class="empty">Carregando…</div>':ms.length?ms.map(x=>`<button class="rh-dm ${dm&&dm._id===x._id?'sel':''}" data-act="rh-ded" data-id="${x._id}"><b>${esc(x.nome)}</b><small>${esc(valeNome(x.vale))}${x.alteradoEm?' · atualizado em '+dmIso(x.alteradoEm):''}</small></button>`).join(''):'<div class="empty">Nenhum modelo ainda. Clique em <b>Novo modelo</b> ou importe um arquivo do Word.</div>'}</section>
      ${dm?`<section class="card rh-ded"><div class="rh-g2"><label><span class="label">Nome do modelo</span><input class="txt" id="rh-dnome" value="${esc(dm.nome||'')}" placeholder="ex.: Contrato de trabalho · CLT"></label>
          <label><span class="label">Vale para</span><select class="txt" id="rh-dvale">${VALE.map(([k,l])=>`<option value="${k}" ${(dm.vale||'TODOS')===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
        <label class="ck" style="margin-top:10px"><input type="checkbox" id="rh-ddesl" ${modeloDesliga(dm)?'checked':''}> Este documento desliga o funcionário (aviso de demissão, rescisão): ao gerar, oferece marcar como desligado</label>
        <div class="label" style="margin:12px 0 6px">Campos (toque para inserir no texto)</div><div class="rh-tks">${CAMPOS.map(([k,l])=>`<button class="rh-tkb" data-act="rh-dtk" data-k="${k}">${esc(l)}</button>`).join('')}</div>
        <div class="rh-edw"><div class="rh-tb" role="toolbar" aria-label="Formatação"><button data-act="rh-dfmt" data-v="bold" title="Negrito"><b>N</b></button><button data-act="rh-dfmt" data-v="italic" title="Itálico"><i>I</i></button><button data-act="rh-dfmt" data-v="titulo">Título</button><button data-act="rh-dfmt" data-v="clausula">Cláusula numerada</button><button data-act="rh-dfmt" data-v="pergunta" title="Algo que muda a cada documento (datas, motivo…): o painel pergunta na hora de gerar">Campo perguntado</button></div>
          <div class="rh-ed" id="rh-ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto do modelo" data-ph="Escreva o texto do documento. Para o nome, CPF, função etc., toque no campo acima. O que muda a cada vez (datas, trabalhado ou indenizado…) vai em Campo perguntado.">${paraEditor(dm.html||'')}</div></div>
        <div class="rh-dfoot">${dm._id?'<button class="lnk" data-act="rh-ddel" style="color:var(--crit-ink)">Apagar modelo</button>':'<span></span>'}<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="rh-dauto" title="Troca nome, CNPJ, endereço, empresa e datas do texto pelos campos certos">Ajustar campos automaticamente</button><button class="btn sec" data-act="rh-dprev">Ver com dados de exemplo</button><button class="btn" data-act="rh-dsalvar" ${R.salv?'disabled':''}>Salvar modelo</button></div></div></section>`
      :`<section class="card"><div class="empty">${ms.length?'Escolha um modelo ao lado para editar.':'Os modelos ficam aqui: contrato de trabalho, de experiência, termo de entrega, declarações.'}</div></section>`}</div>`
      +(R.dprev&&dm?`<div class="rh-modal" data-act="rh-dprevx"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Prévia com dados de exemplo"><div class="rh-ch"><h2>Prévia com dados de exemplo</h2><button class="lnk" data-act="rh-dprevx">Fechar</button></div><div class="rh-page">${montar(dm.html||'',valores(EXEMPLO,{},EX_FER),true)}${assinaturas(EXEMPLO)}</div></div></div>`:''); }
  function vDocGerar(){ const G=R.dg, lim=addDias(P.hojeStr(),-90), fs=R.func.filter(x=>x.status!=='Desligado'||(okIso(x.desligamento)&&x.desligamento>=lim)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')), f=fs.find(x=>x._id===G.funcId)||null;
    const ms=R.modelos.slice().sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR')), cab=f?ms.filter(m=>valePara(m,f)):ms, lista=cab.length?cab:ms;
    if(!lista.some(m=>m._id===G.modeloId)) G.modeloId=lista[0]?lista[0]._id:'';
    const md=ms.find(m=>m._id===G.modeloId);
    if(!ms.length) return `<section class="card"><div class="empty">Primeiro cadastre um modelo em <button class="lnk" data-act="rh-dv" data-v="modelos">Modelos</button>.</div></section>`;
    const usa=md?camposDe(md.html):[], falta=f?[...new Set(usa.filter(k=>FALTA_CAMPO[k]&&!(f[FALTA_CAMPO[k]]!=null&&f[FALTA_CAMPO[k]]!=='')).map(k=>FALTA_CAMPO[k]))]:[];
    const LBL={salario:'Salário',jornada:'Jornada',funcao:'Função',setor:'Setor',admissao:'Admissão',telefone:'Telefone'}, PH={salario:'R$ 0,00',jornada:'ex.: 44 horas semanais'};
    const docs=f?R.docs.filter(d=>d.funcId===f._id):[], qs=md?perguntasDe(md.html):[], usaFer=usa.some(k=>CAMPOS_FER.includes(k));
    const fers=f&&usaFer?ferDe(f).filter(x=>!x.anterior).sort((a,b)=>String(b.inicio).localeCompare(String(a.inicio))):[];
    if(usaFer&&fers.length&&!fers.some(x=>x._id===G.feriasId)) G.feriasId=fers[0]._id;
    const ferHtml=usaFer&&f?(fers.length?`<label class="rh-lb"><span class="label">Férias</span><select class="txt" id="rh-dgfe">${fers.map(x=>`<option value="${x._id}" ${G.feriasId===x._id?'selected':''}>${br(x.inicio)} a ${br(x.fim)} · ${x.dias} dias</option>`).join('')}</select></label>`
      :`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);margin:0 0 10px">Este modelo usa as datas das férias. Marque as férias em <button class="lnk" data-act="rh-pzabrir" data-v="ferias">Férias e prazos</button>.</div>`):'';
    const qHtml=qs.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:6px">Perguntas deste documento</div>${qs.map((q,i)=>`<label class="rh-lb"><span>${esc(q)}</span><input class="txt rh-amar" data-rh-dq="${i}" ${qData(q)?'type="date"':''} value="${esc(G.resp[q]||'')}"></label>`).join('')}`:'';
    return `<div class="rh-gg"><section class="card"><h2>Para quem?</h2>
        <label class="rh-lb"><span class="label">Funcionário</span><select class="txt" id="rh-dgf"><option value="">Escolha…</option>${fs.map(x=>`<option value="${x._id}" ${G.funcId===x._id?'selected':''}>${esc(x.nome)}${x.status==='Desligado'?' (desligado)':''}</option>`).join('')}</select></label>
        <label class="rh-lb"><span class="label">Modelo</span><select class="txt" id="rh-dgm">${lista.map(m=>`<option value="${m._id}" ${G.modeloId===m._id?'selected':''}>${esc(m.nome)}</option>`).join('')}</select></label>
        ${f&&cab.length<ms.length&&!cab.length?'<div class="sub" style="font-size:12.5px">Nenhum modelo marcado para o vínculo desta pessoa; mostrando todos.</div>':''}
        ${ferHtml}${qHtml}
        ${f&&md&&modeloDesliga(md)&&f.status!=='Desligado'?(()=>{ const qd=qDeslig(qs), dt=G.deslData||(qd&&G.resp[qd])||P.hojeStr(); return `<div class="rh-sep"></div><label class="ck"><input type="checkbox" id="rh-dgdesl" ${G.desligar!==false?'checked':''}> Marcar ${esc(f.nome)} como <b>desligado</b> ao gerar${f.desligAgendado&&okIso(f.desligamento)?' (já marcado para '+br(f.desligamento)+')':''}</label>
          ${G.desligar!==false?`<label class="rh-lb" style="margin-top:6px"><span>Data do desligamento</span><input class="txt" type="date" id="rh-dgdd" value="${esc(dt)}"></label>${dt>P.hojeStr()?'<div class="sub" style="font-size:12.5px;margin:0">Continua ativo até essa data.</div>':''}`:''}`; })():f&&f.status==='Desligado'?`<div class="sub" style="font-size:12.5px;margin:8px 0 0">Situação: <b>Desligado</b>${f.desligamento?' em '+br(f.desligamento):''}.</div>`:''}
        ${falta.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:6px">Dados que faltam no cadastro</div>${falta.map(k=>`<label class="rh-lb"><span>${LBL[k]}</span><input class="txt rh-amar" data-rh-dx="${k}" ${k==='admissao'?'type="date"':''} placeholder="${PH[k]||''}" value="${esc(G.extra[k]||'')}"></label>`).join('')}
          <label class="ck" style="margin:6px 0 4px"><input type="checkbox" id="rh-dgg" ${G.guardar?'checked':''}> Guardar no cadastro</label>`:''}
        ${(()=>{ if(!f||!md) return ''; const vb=valores(f,R.dg.extra,ferSel(f)), o=R.dg.over||{}, ks=[...new Set(usa.filter(k=>!FALTA_CAMPO[k]&&(!vb[k]||k in o)))];
          return ks.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:6px">Preencher o que falta</div>${ks.map(k=>`<label class="rh-lb"><span>${esc(CAMPO_NOME(k))}</span><input class="txt rh-amar" data-rh-do="${k}" ${DG_DATA(k)?'type="date"':''} value="${esc(o[k]||'')}" ${dgEditado(f,md)?'disabled title="O texto já foi editado: desfaça as edições para usar os campos"':''}></label>`).join('')}<div class="sub" style="font-size:12.5px;margin:0">Vale só para este documento.${ks.includes('DESLIGAMENTO')?' Com a data do desligamento, o "pago até" e o "início do saldo" saem sozinhos.':''}</div>`:''; })()}
        <div class="rh-sep"></div><div class="rh-dbt" style="margin-bottom:8px"><button class="btn sec" data-act="rh-dged" ${f&&md?'':'disabled'}>${G.edOn?'✓ Concluir edição':'✎ Editar texto'}</button>${f&&md&&dgEditado(f,md)?'<button class="lnk" data-act="rh-dgedx">Desfazer edições</button>':''}</div>
        ${G.edOn?'<div class="banner" style="margin:0 0 8px">Editando: clique no documento e escreva, apague ou corrija. Imprimir, PDF e Word saem com o texto editado.</div>':''}
        <div class="rh-dbt"><button class="btn" data-act="rh-dgo" data-v="imprimir" ${f&&md?'':'disabled'}>Imprimir</button><button class="btn sec" data-act="rh-dgo" data-v="pdf" ${f&&md?'':'disabled'}>Salvar PDF</button><button class="btn sec" data-act="rh-dgo" data-v="word" ${f&&md?'':'disabled'}>Baixar em Word</button></div>
        <div class="sub" style="font-size:12.5px;margin:10px 0 0">Fica guardado no histórico do funcionário (quem gerou e quando). Depois de assinado, anexe a cópia escaneada aqui embaixo ou no cadastro.</div>
        ${f&&docs.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:4px">Já gerados para ${esc(f.nome)}</div>${docs.slice(0,6).map(d=>`<div class="rh-dl"><div><b>${esc(d.modelo||'Documento')}</b><small>${dmIso(d.em)}/${String(d.em||'').slice(0,4)}${d.porNome?' · '+esc(d.porNome):''}</small></div>${d.assinado?`<button class="lnk" data-act="rh-dver" data-id="${d._id}">Ver assinado</button>`:anexar(`data-rh-danx="${d._id}"`,'Anexar assinado','lnk')}</div>`).join('')}`:''}</section>
      <section class="rh-page rh-pageg${G.edOn?' rh-editando':''}" id="rh-dgdoc" aria-label="Documento" ${G.edOn&&f&&md?'contenteditable="true" spellcheck="true"':''}>${f&&md?docCorpo(f,md,true)+assinaDg(f,md):`<div class="empty">${f?'Escolha o modelo.':'Escolha o funcionário para ver o documento preenchido.'}</div>`}</section></div>`; }
  function edSync(){ const ed=document.getElementById('rh-ed'); if(ed&&R.dm) R.dm.html=limpar(ed.innerHTML); const n=document.getElementById('rh-dnome'); if(n&&R.dm) R.dm.nome=n.value; const v=document.getElementById('rh-dvale'); if(v&&R.dm) R.dm.vale=v.value; const dd=document.getElementById('rh-ddesl'); if(dd&&R.dm&&R.dm.deslUser) R.dm.desliga=dd.checked; }
  function inserirNoEditor(html){ const ed=document.getElementById('rh-ed'); if(!ed) return; ed.focus(); const sel=getSelection();
    if(!sel.rangeCount||!ed.contains(sel.anchorNode)){ const r=document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
    /* inserção feita à mão: o insertHTML do navegador quebra a linha antes de um campo */
    const r=sel.getRangeAt(0); r.deleteContents(); const tp=document.createElement('template'); tp.innerHTML=html; const fr=tp.content, ult=fr.lastChild; if(!ult) return;
    r.insertNode(fr); const nr=document.createRange(); nr.setStartAfter(ult); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); edSync(); }
  const ferSel=f=>R.fer.find(x=>x._id===R.dg.feriasId&&x.funcId===f._id&&x.status!=='cancelada')||null;
  const DG_DATA=k=>/^(DESLIGAMENTO|PAGO_ATE|SALDO_INICIO|ADMISSAO|DATA_|FERIAS_INICIO|FERIAS_FIM|FERIAS_RETORNO|NASCIMENTO)/.test(k);
  const dgVals=f=>{ const v=valores(f,R.dg.extra,ferSel(f)), o=R.dg.over||{}; Object.keys(o).forEach(k=>{ const x=String(o[k]==null?'':o[k]).trim(); if(x) v[k]=okIso(x)?br(x):x; });
    const dl=String(o.DESLIGAMENTO||'').trim(); if(okIso(dl)){ const ini=dl.slice(0,8)+'01'; if(!String(o.PAGO_ATE||'').trim()) v.PAGO_ATE=br(addDias(ini,-1)); if(!String(o.SALDO_INICIO||'').trim()) v.SALDO_INICIO=br(ini); } return v; };
  const dgKey=(f,md)=>f._id+'|'+md._id, dgEditado=(f,md)=>!!(R.dg.edHtml&&R.dg.edKey===dgKey(f,md));
  const docCorpo=(f,md,marcar)=>dgEditado(f,md)?(marcar?R.dg.edHtml:R.dg.edHtml.replace(/<span class="rh-v">([\s\S]*?)<\/span>/g,'$1')):montar(md.html||'',dgVals(f),marcar,R.dg.resp);
  const assinaDg=(f,md)=>dgEditado(f,md)?'':assinaturas(f);
  /* saída: imprimir, PDF, Word */
  function docCompleto(f,md){ return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(md.nome+' - '+f.nome)}</title><style>@page{size:A4;margin:22mm 20mm}${DOC_CSS}</style></head><body>${docCorpo(f,md,false)}${assinaDg(f,md)}</body></html>`; }
  function imprimirDoc(html){ const fr=document.createElement('iframe'); fr.setAttribute('aria-hidden','true'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
    const d=fr.contentWindow.document; d.open(); d.write(html); d.close(); setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ P.erro(e); } setTimeout(()=>fr.remove(),60000); },300); }
  const carregarJs=src=>new Promise((ok,er)=>{ if([...document.scripts].some(s=>s.src===src)) return ok(); const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>er(new Error('Não consegui carregar '+src.split('/').pop()+'. Confira a internet.')); document.head.appendChild(s); });
  function baixar(blob,nome){ const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); }
  /* nome de arquivo simples: sem "·" nem caracteres que o Windows não aceita */
  const nomeArq=s=>String(s).replace(/\s*[·•]\s*/g,' - ').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim();
  const pdfDoc=(f,md)=>pdfPartes([docCorpo(f,md,false)+assinaDg(f,md)],nomeArq(md.nome+' - '+f.nome)+'.pdf');
  async function pdfPartes(partes,nome){ if(!window.html2canvas) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!(window.jspdf&&window.jspdf.jsPDF)) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'}); let pg=0;
    for(const parte of partes){ const box=document.createElement('div'); box.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:83px 76px;box-sizing:border-box';
      box.innerHTML=`<style>${DOC_CSS.replace(/body\{/,'.rh-pdf{')}</style><div class="rh-pdf">${parte}</div>`; document.body.appendChild(box);
      try{ const cv=await window.html2canvas(box,{scale:2,backgroundColor:'#ffffff',logging:false});
        const pxPag=Math.floor(cv.width*297/210); for(let y=0;y<cv.height;y+=pxPag){ const c=document.createElement('canvas'); c.width=cv.width; c.height=Math.min(pxPag,cv.height-y); c.getContext('2d').drawImage(cv,0,y,cv.width,c.height,0,0,cv.width,c.height);
          if(pg) pdf.addPage('a4','portrait'); pdf.addImage(c.toDataURL('image/jpeg',0.9),'JPEG',0,0,210,c.height*210/cv.width); pg++; } } finally{ box.remove(); } }
    baixar(pdf.output('blob'),nome); }
  function wordDoc(f,md){ const h=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(md.nome)}</title><style>@page{size:21cm 29.7cm;margin:2.2cm 2cm}${DOC_CSS}</style></head><body>${docCorpo(f,md,false)}${assinaDg(f,md)}</body></html>`;
    baixar(new Blob(['﻿',h],{type:'application/msword'}),nomeArq(md.nome+' - '+f.nome)+'.doc'); }
  async function registrarDoc(f,md,acao){ const G=R.dg;
    if(modeloDesliga(md)&&f.status!=='Desligado'&&G.desligar!==false){ const qd=qDeslig(perguntasDe(md.html)), dt=G.deslData||(qd&&G.resp[qd])||P.hojeStr(); if(okIso(dt)&&!(f.desligAgendado&&f.desligamento===dt)){ const fut=await desligar(f,dt,md.nome); P.toast(fut?f.nome+' continua ativo e sai em '+br(dt)+'.':f.nome+' marcado como desligado em '+br(dt)+'.'); } }
    if(G.guardar){ const up={}; Object.entries(G.extra).forEach(([k,v])=>{ if(v==null||v==='') return; if(k==='salario'){ const n=numBR(v); if(n!=null) up.salario=n; } else up[k]=String(v).trim(); });
      if(Object.keys(up).length){ await grava(COL.func+'/'+f._id,up); Object.assign(f,up); G.extra={}; } }
    const fe=ferSel(f), resp={}; perguntasDe(md.html).forEach(q=>{ resp[q]=String(G.resp[q]||'').trim(); });
    const chave=f._id+'|'+md._id+'|'+JSON.stringify([valores(f,G.extra,fe),resp]); if(G.reg===chave) return; G.reg=chave;
    await P.db().doc(COL.docs+'/'+id()).set(Object.assign({funcId:f._id,funcionario:f.nome,modeloId:md._id,modelo:md.nome,acao,em:agora(),por:P.S.uid||null,porNome:eu()},fe?{feriasId:fe._id}:{},G.ocId?{ocId:G.ocId}:{},Object.keys(resp).length?{respostas:resp}:{})); }

  /* ---------- Férias e prazos (12/10, pedido da RH) ----------
     CLT: períodos de férias contados da admissão (12 meses para adquirir, mais 12 para conceder). As férias podem ser
     marcadas em partes (ex.: 10 + 20, 15 + 15 ou 30 de uma vez). Avisa 15 dias antes do prazo para conceder e das férias
     marcadas que ainda não têm o aviso de férias gerado.
     PJ: troca a cada 3 meses, contada da última troca registrada (sem troca registrada, da admissão). Avisa 15 dias antes.
     Férias: rh/dados/ferias/{id} {funcId, aquisitivo, aquisitivoFim, inicio, dias, fim, retorno, status, anterior?}
     Troca do PJ: no cadastro, ultimaTroca + trocas[] (histórico). */
  const PZ_AVISO=()=>+R.cfg.prazoAviso>0?+R.cfg.prazoAviso:15;
  const isoD=dt=>dt.toISOString().slice(0,10), dU=s=>new Date(s+'T12:00:00Z');
  const addDias=(s,n)=>{ const d=dU(s); d.setUTCDate(d.getUTCDate()+n); return isoD(d); };
  const diasEntre=(a,b)=>Math.round((dU(b)-dU(a))/864e5);
  const addMeses=(s,n)=>{ const [y,m,d]=s.split('-').map(Number); const ult=new Date(Date.UTC(y,m-1+n+1,0,12)).getUTCDate(); return isoD(new Date(Date.UTC(y,m-1+n,Math.min(d,ult),12))); };
  const okIso=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
  const ferDe=f=>R.fer.filter(x=>x.funcId===f._id&&x.status!=='cancelada');
  function periodos(f){ if(f.tipo==='PJ'||!okIso(f.admissao)) return []; const hj=P.hojeStr(), out=[], fs=ferDe(f);
    for(let k=0;k<80;k++){ const ini=addMeses(f.admissao,12*k); if(ini>hj) break; const fim=addDias(addMeses(f.admissao,12*(k+1)),-1), lim=addDias(addMeses(f.admissao,12*(k+2)),-30); /* limite para gozo: começar até 30 dias antes do fim do período concessivo */
      const ps=fs.filter(x=>x.aquisitivo===ini), usados=ps.reduce((a,x)=>a+(+x.dias||0),0); out.push({k,ini,fim,lim,completo:fim<hj,ps,usados,saldo:Math.max(0,30-usados)}); }
    return out; }
  const plural=(n,s,p)=>n+' '+(n===1?s:p);
  function sitFer(f){ const ps=periodos(f); if(!ps.length) return {c:'neu',t:f.tipo==='PJ'?'PJ':'Sem data de admissão',n:9};
    const hj=P.hojeStr(), agora=ferDe(f).find(x=>!x.anterior&&x.inicio<=hj&&x.fim>=hj), ab=ps.find(p=>p.completo&&p.saldo>0);
    if(ab){ const d=diasAte(ab.lim); if(d<0) return {c:'crit',t:'Prazo vencido há '+plural(-d,'dia','dias'),n:0,p:ab,d}; if(d<=PZ_AVISO()) return {c:'warn',t:d===0?'Último dia para conceder':'Conceder em até '+plural(d,'dia','dias'),n:1,p:ab,d};
      return {c:'ok',t:agora?'Em férias até '+br(agora.fim):'Conceder até '+br(ab.lim),n:3,p:ab,d}; }
    if(agora) return {c:'ok',t:'Em férias até '+br(agora.fim),n:2};
    return {c:'ok',t:'Em dia',n:4,p:ps[ps.length-1]}; }
  const ferProximas=()=>{ const hj=P.hojeStr(); return R.fer.filter(x=>!x.anterior&&x.status!=='cancelada'&&x.fim>=hj&&R.func.some(f=>f._id===x.funcId&&f.status!=='Desligado')).sort((a,b)=>String(a.inicio).localeCompare(String(b.inicio))); };
  const temAviso=x=>R.docs.some(d=>d.feriasId===x._id);
  const pjBase=f=>okIso(f.ultimaTroca)?f.ultimaTroca:okIso(f.admissao)?f.admissao:'';
  function pjSit(f){ const b=pjBase(f); if(!b&&!okIso(f.pjProx)) return {c:'neu',t:'Sem data de admissão',n:9}; const prox=okIso(f.pjProx)&&(!okIso(f.ultimaTroca)||f.pjProx>f.ultimaTroca)?f.pjProx:addMeses(b,+f.pjMeses||3), d=diasAte(prox);
    if(d<0) return {c:'crit',t:'Troca atrasada há '+plural(-d,'dia','dias'),n:0,prox,d}; if(d===0) return {c:'crit',t:'Troca hoje',n:1,prox,d};
    if(d<=PZ_AVISO()) return {c:'warn',t:'Troca em '+plural(d,'dia','dias'),n:2,prox,d}; return {c:'ok',t:'Em dia',n:3,prox,d}; }
  const clts=()=>ativos().filter(f=>f.tipo!=='PJ'), pjs=()=>ativos().filter(f=>f.tipo==='PJ');
  /* avisos de prazo: Início do RH e quadro "Avisos" do Meu dia */
  function avisosPrazo(){ const av=[], hj=P.hojeStr();
    clts().forEach(f=>{ const s=sitFer(f); if(s.c==='crit'||s.c==='warn') av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'Férias: '+f.nome,s:(s.d<0?'o prazo para conceder venceu em ':'conceder até ')+br(s.p.lim)+' · faltam '+plural(s.p.saldo,'dia','dias')+' de férias',act:`data-act="rh-pzabrir" data-v="ferias"`,l:'Abrir',go:'rhferias'}); });
    ferProximas().filter(x=>x.inicio>=hj&&diasAte(x.inicio)<=PZ_AVISO()&&!temAviso(x)).forEach(x=>{ const d=diasAte(x.inicio); av.push({c:'warn',r:'Atenção',t:'Aviso de férias: '+x.funcionario,s:'as férias começam '+(d===0?'hoje':'em '+br(x.inicio))+' e o aviso ainda não foi gerado',act:`data-act="rh-dgfer" data-id="${x._id}"`,l:'Gerar',go:'rhferias'}); });
    emExp().forEach(({f,s})=>{ if(s.c==='crit'||s.c==='warn') av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'Experiência: '+f.nome,s:s.t.toLowerCase()+' ('+br(s.fim)+') · prorrogar, efetivar ou desligar',act:`data-act="rh-pzabrir" data-v="exp"`,l:'Abrir',go:'rhferias'}); });
    caAvisos().forEach(({e,s})=>av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'CA do EPI: '+e.nome,s:caTxt(e.ca)+' · '+s.t.toLowerCase()+' ('+br(e.validade)+') · atualize o CA',act:`data-act="rh-cad" data-v="epis" data-go-cad="1"`,l:'Abrir',go:'rhfuncoes'}));
    pjs().forEach(f=>{ const s=pjSit(f); if(s.c==='crit'||s.c==='warn') av.push({c:s.c,r:s.c==='crit'?'Atrasada':'Atenção',t:'Troca do PJ: '+f.nome,s:'próxima troca '+br(s.prox)+' · '+s.t.toLowerCase(),act:`data-act="rh-pzabrir" data-v="pj"`,l:'Abrir',go:'rhferias'}); });
    return av; }
  avRH(()=>avisosPrazo().map(a=>({nivel:a.c,rotulo:a.r,titulo:a.t,texto:a.s,go:a.go})));

  function vFerias(){ const EY='RH · FÉRIAS E PRAZOS', nf=clts().filter(f=>['crit','warn'].includes(sitFer(f).c)).length, np=pjs().filter(f=>['crit','warn'].includes(pjSit(f).c)).length, ne=emExp().filter(o=>['crit','warn'].includes(o.s.c)).length;
    const seg=`<div class="seg" role="group" aria-label="Prazos">${[['ferias','Férias (CLT)'+(nf?' · '+nf:'')],['mapa','Mapa do ano'],['exp','Experiência'+(ne?' · '+ne:'')],['pj','Troca dos PJ'+(np?' · '+np:'')],['nr','Exames e NRs'+(qAtencao().length?' · '+qAtencao().length:'')]].map(([k,l])=>`<button data-act="rh-pzv" data-v="${k}" aria-pressed="${R.pzv===k}">${l}</button>`).join('')}</div>`;
    return topo('Férias e prazos',R.pzv==='nr'?'ASO e treinamentos (NRs) de cada funcionário: avisa 30 dias antes de vencer e quando já venceu.':R.pzv==='mapa'?'Férias de todo mundo no ano, por setor: avisa quando duas pessoas do mesmo setor saem juntas.':R.pzv==='pj'?'PJ trocam a cada 3 meses, contando da última troca. Avisa '+PZ_AVISO()+' dias antes.':R.pzv==='exp'?'Contrato de experiência 45 + 45 dias: prorrogue, efetive ou desligue. Avisa '+PZ_AVISO()+' dias antes de cada fim.':'Férias dos CLT pela data de admissão. Avisa '+PZ_AVISO()+' dias antes do prazo para conceder e das férias sem aviso.',seg,EY)
      +(!R.lido.func||!R.lido.fer?'<section class="card"><div class="empty">Carregando…</div></section>':R.pzv==='pj'?vPJ():R.pzv==='nr'?vQualif():R.pzv==='exp'?vExp():R.pzv==='mapa'?vMapaFer():vFeriasCLT()); }
  /* Mapa de férias do ano (pedido de 13/10) */
  function vMapaFer(){ const Y=R.mapAno||+P.hojeStr().slice(0,4), tri=R.mapZoom==='tri', iniT=R.mapIni||P.hojeStr().slice(0,8)+'01', ini=tri?iniT:Y+'-01-01', fim=tri?addDias(addMeses(iniT,3),-1):Y+'-12-31', nd=diasEntre(ini,fim)+1, pc=d=>(Math.max(0,Math.min(nd,diasEntre(ini,d)))/nd*100);
    const setores=[...new Set(ativos().map(f=>f.setor||'Sem setor'))].sort((a,b)=>a.localeCompare(b,'pt-BR')), fil=R.mapSet&&setores.includes(R.mapSet)?R.mapSet:'';
    const pessoas0=ativos().filter(f=>!fil||(f.setor||'Sem setor')===fil).sort((a,b)=>(a.setor||'').localeCompare(b.setor||'','pt-BR')||a.nome.localeCompare(b.nome,'pt-BR'));
    const barras={}, juntos=[];
    pessoas0.forEach(f=>{ barras[f._id]=f.tipo==='PJ'?[]:ferDe(f).filter(x=>!x.anterior&&okIso(x.inicio)&&x.inicio<=fim&&x.fim>=ini).map(x=>({x,conf:false})); });
    const temAlgo=f=>f.tipo==='PJ'?true:(barras[f._id]||[]).length>0||periodos(f).some(p=>p.completo&&p.saldo>0&&p.lim>=ini&&p.lim<=fim);
    const pessoas=R.mapTodos?pessoas0:pessoas0.filter(temAlgo);
    setores.forEach(st=>{ const ps=pessoas.filter(f=>(f.setor||'Sem setor')===st); for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++) (barras[ps[i]._id]||[]).forEach(a=>(barras[ps[j]._id]||[]).forEach(b=>{ if(a.x.inicio<=b.x.fim&&b.x.inicio<=a.x.fim){ a.conf=b.conf=true; juntos.push(st+': '+titulo(ps[i].nome).split(' ')[0]+' e '+titulo(ps[j].nome).split(' ')[0]+' ('+br(a.x.inicio>b.x.inicio?a.x.inicio:b.x.inicio).slice(0,5)+')'); } })); });
    const linha=f=>{ let h='';
      if(f.tipo==='PJ'){ const ts=(f.trocas||[]).map(t=>t.data).filter(d=>okIso(d)&&d>=ini&&d<=fim); const s=pjSit(f); let p=s.prox; for(let k=0;p&&k<8&&p<=fim;k++,p=addMeses(p,+f.pjMeses||3)) if(p>=ini&&p>P.hojeStr()) ts.push(p);
        h=ts.map(d=>`<i class="rh-mpj" style="left:${pc(d).toFixed(2)}%" title="Troca do PJ ${br(d)}"></i>`).join(''); }
      else { h=barras[f._id].map(o=>`<i class="rh-mb ${o.conf?'conf':''} ${o.x.fim<P.hojeStr()?'foi':o.x.inicio<=P.hojeStr()?'agora':''}" style="left:${pc(o.x.inicio).toFixed(2)}%;width:${Math.max(0.6,pc(addDias(o.x.fim,1))-pc(o.x.inicio)).toFixed(2)}%" title="${esc(titulo(f.nome))}: ${br(o.x.inicio)} a ${br(o.x.fim)} (${plural(+o.x.dias,'dia','dias')})"><span>${br(o.x.inicio).slice(0,5)} – ${br(o.x.fim).slice(0,5)}</span></i>`).join('')
        +periodos(f).filter(p=>p.completo&&p.saldo>0&&p.lim>=ini&&p.lim<=fim).map(p=>`<i class="rh-mlim" style="left:${pc(p.lim).toFixed(2)}%" title="Último dia para dar as férias do período ${br(p.ini)} a ${br(p.fim)}: ${br(p.lim)} · faltam ${plural(p.saldo,'dia','dias')}"></i>`).join(''); }
      return `<div class="rh-mr"><button class="rh-nm" data-act="rh-pess" data-id="${f._id}"><span>${esc(titulo(f.nome))}${f.tipo==='PJ'?' <small>PJ</small>':''}</span><small class="rh-mfn">${esc(f.funcao||'')}</small></button><div class="rh-mt">${h}</div></div>`; };
    const hj=P.hojeStr(), hojePos=hj>=ini&&hj<=fim?`<i class="rh-mhj" style="left:${pc(hj).toFixed(2)}%" title="Hoje"></i>`:'';
    return `<section class="card"><div class="rh-chips" style="margin-bottom:12px">${tri?`<button class="btn sec rh-sm" data-act="rh-mapmes" data-v="-1">‹</button><b style="font-size:18px">${MESES[+ini.slice(5,7)-1].slice(0,3)} a ${MESES[+fim.slice(5,7)-1].slice(0,3)} ${fim.slice(0,4)}</b><button class="btn sec rh-sm" data-act="rh-mapmes" data-v="1">›</button>`:`<button class="btn sec rh-sm" data-act="rh-mapano" data-v="-1">‹ ${Y-1}</button><b style="font-size:18px">${Y}</b><button class="btn sec rh-sm" data-act="rh-mapano" data-v="1">${Y+1} ›</button>`}
        <span class="seg" style="margin-left:8px"><button class="${tri?'':'on'}" aria-pressed="${!tri}" data-act="rh-mapzoom" data-v="">Ano</button><button class="${tri?'on':''}" aria-pressed="${tri}" data-act="rh-mapzoom" data-v="tri">3 meses</button></span>
        <button class="rh-chip2" data-act="rh-maptodos" aria-pressed="${!R.mapTodos}">${R.mapTodos?'Mostrar só quem tem férias ou prazo':'Só quem tem férias ou prazo · '+pessoas.length+' de '+pessoas0.length}</button>
        <span style="width:12px"></span><button class="rh-chip2" data-act="rh-mapset" data-v="" aria-pressed="${!fil}">Todos os setores</button>${setores.map(st=>`<button class="rh-chip2" data-act="rh-mapset" data-v="${esc(st)}" aria-pressed="${fil===st}">${esc(st)}</button>`).join('')}</div>
      ${juntos.length?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink)"><b>Saem juntos no mesmo setor:</b> ${esc([...new Set(juntos)].join(' · '))}</div>`:''}
      ${(()=>{ const todas=pessoas.flatMap(f=>(barras[f._id]||[]).map(o=>({f,x:o.x}))), ag=todas.filter(o=>o.x.inicio<=hj&&o.x.fim>=hj), prox=todas.filter(o=>o.x.inicio>hj&&o.x.inicio<=addDias(hj,30));
        const nomes=xs=>xs.slice(0,4).map(o=>esc(titulo(o.f.nome).split(' ')[0])).join(', ')+(xs.length>4?' e mais '+(xs.length-4):'');
        return `<div class="rh-mres"><div class="ag"><b>${ag.length}</b><span>de férias hoje</span><small>${ag.length?nomes(ag):'ninguém'}</small></div><div class="px"><b>${prox.length}</b><span>saem nos próximos 30 dias</span><small>${prox.length?nomes(prox):'ninguém'}</small></div><div><b>${todas.length}</b><span>férias marcadas em ${Y}</span><small>${juntos.length?[...new Set(juntos)].length+' vez(es) saem juntos no setor':'sem sobreposição no setor'}</small></div></div>`; })()}
      <div class="rh-mapa" style="--cols:${tri?3:12}"><div class="rh-mr rh-mh"><span></span><div class="rh-mt" style="grid-template-columns:repeat(${tri?3:12},1fr)">${tri?[0,1,2].map(k=>{ const m=addMeses(ini,k); return `<span class="${m.slice(0,7)===hj.slice(0,7)?'hj':''}">${MESES[+m.slice(5,7)-1]} ${m.slice(0,4)}</span>`; }).join(''):MESES.map((m,i)=>`<span class="${String(Y)===hj.slice(0,4)&&i===+hj.slice(5,7)-1?'hj':''}">${m.slice(0,3)}</span>`).join('')}</div></div>
        ${pessoas.length?setores.filter(st=>!fil||st===fil).map(st=>{ const ps=pessoas.filter(f=>(f.setor||'Sem setor')===st); return ps.length?`<div class="rh-ms">${esc(st)}</div>${ps.map(linha).join('')}`:''; }).join(''):'<div class="empty">Ninguém em atividade.</div>'}
        <div class="rh-mhjw">${hojePos}</div></div>
      <div class="rh-ml"><span><i class="rh-mb" style="position:static;display:inline-block;width:18px"></i> Férias</span><span><i class="rh-mb conf" style="position:static;display:inline-block;width:18px"></i> Saem juntos no mesmo setor</span><span><i class="rh-mlim" style="position:static;display:inline-block"></i> Último dia para dar as férias</span><span><i class="rh-mpj" style="position:static;display:inline-block"></i> Troca do PJ</span><span class="sub" style="margin:0 0 0 auto">Toque no nome para abrir o perfil · passe o mouse na barra para ver as datas</span></div></section>`; }
  function vFeriasCLT(){ const hj=P.hojeStr(), F=R.pzfil;
    let xs=clts().map(f=>({f,s:sitFer(f)})); const nAt=xs.filter(o=>['crit','warn'].includes(o.s.c)).length; if(F==='atencao') xs=xs.filter(o=>['crit','warn'].includes(o.s.c));
    xs.sort((a,b)=>a.s.n-b.s.n||(a.s.d||0)-(b.s.d||0)||a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    const venc=clts().reduce((n,f)=>n+periodos(f).filter(p=>p.completo&&p.saldo>0&&p.lim<hj).length,0), prox=ferProximas();
    return ffiCard()+(R.fajs?formAjuste():'')+(R.ffer?formFerias():'')
      +(prox.length?`<section class="card"><h2>Férias marcadas</h2><div class="rh-tw"><table class="rh-t"><thead><tr><th>Funcionário</th><th>Férias</th><th>Volta</th><th>Aviso de férias</th><th></th></tr></thead><tbody>
        ${prox.map(x=>{ const ag=x.inicio<=hj; return `<tr><td><b>${esc(x.funcionario)}</b><small style="display:block;color:var(--muted)">período ${br(x.aquisitivo)} a ${br(x.aquisitivoFim)}</small></td><td class="num">${br(x.inicio)} a ${br(x.fim)} <small style="color:var(--muted)">· ${plural(+x.dias,'dia','dias')}</small>${ag?' <span class="pill ok">em férias</span>':''}</td><td class="num">${br(x.retorno)}</td>
          <td>${temAviso(x)?'<span class="pill ok">Gerado</span>':`<button class="btn rh-sm" data-act="rh-dgfer" data-id="${x._id}">Gerar aviso</button>`}</td><td class="rh-ac">${ag?'':`<button class="lnk" data-act="rh-fercanc" data-id="${x._id}" style="color:var(--crit-ink)">Desmarcar</button>`}</td></tr>`; }).join('')}</tbody></table></div></section>`:'')
      +`<section class="card"><div class="rh-chips">${[['atencao','Precisam de atenção · '+nAt],['todos','Todos os CLT · '+clts().length]].map(([k,l])=>`<button class="rh-chip2" data-act="rh-pzfil" data-v="${k}" aria-pressed="${F===k}">${l}</button>`).join('')}
          ${venc?`<button class="lnk" data-act="rh-feranteriores" style="margin-left:auto">${venc===1?'Marcar como já tirado o período vencido':'Marcar como já tirados os '+venc+' períodos vencidos'} (antes do painel)</button>`:''}</div>
        ${xs.length?`<div class="rh-tw"><table class="rh-t rh-tf"><thead><tr><th>Funcionário</th><th>Admissão</th><th>Período em aberto</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(({f,s})=>{ const p=s.p; return `<tr><td><b>${esc(f.nome)}</b><small>${esc([f.funcao,f.setor].filter(Boolean).join(' · '))}</small></td><td class="num">${br(f.admissao)||'—'}</td>
          <td class="num">${p?`${br(p.ini)} a ${br(p.fim)}<small>${p.completo?(p.saldo?'faltam '+plural(p.saldo,'dia','dias')+' · conceder até '+br(p.lim):'tirado'):'em aquisição · completa em '+br(p.fim)}</small>`:'—'}</td>
          <td><span class="pill ${s.c}">${esc(s.t)}</span></td>
          <td class="rh-ac">${s.p?`<button class="btn sec rh-sm" data-act="rh-fernova" data-id="${f._id}">Marcar férias</button>`:`<button class="lnk" data-act="rh-ed" data-go-func="1" data-id="${f._id}">Informar admissão</button>`}${s.p&&s.p.completo&&s.p.saldo?` <button class="lnk" data-act="rh-ferant" data-id="${f._id}" data-p="${s.p.ini}" title="Para férias tiradas antes de usar o painel">Já tirou</button>`:''}${s.p?` <button class="lnk" data-act="rh-fajabrir" data-id="${f._id}" title="Dizer quantos dias de cada período a pessoa já tirou">Ajustar</button>`:''}</td></tr>`; }).join('')}</tbody></table></div>`
        :`<div class="empty">${F==='atencao'?'Nenhum prazo de férias perto de vencer.':'Nenhum CLT em atividade.'}</div>`}</section>`; }
  /* Ajustar períodos: a RH informa, período a período, quantos dias a pessoa já tirou antes do painel */
  function formAjuste(){ const g=R.fajs, f=R.func.find(x=>x._id===g.funcId); if(!f) return ''; const ps=periodos(f), hj=P.hojeStr();
    const ant=p=>p.ps.filter(x=>x.anterior).reduce((a,x)=>a+(+x.dias||0),0), noP=p=>p.usados-ant(p);
    const val=p=>g.v[p.ini]!=null?g.v[p.ini]:String(ant(p));
    return `<section class="card rh-form" id="rh-fajs"><div class="head" style="align-items:baseline"><h2>Ajustar as férias de ${esc(f.nome)}</h2><button class="lnk" data-act="rh-fajx">Fechar</button></div>
      <p class="sub" style="margin:0 0 10px">Admissão em ${br(f.admissao)}. Para cada período, coloque quantos dias a pessoa <b>já tirou antes de usar o painel</b> (0 a 30). As férias marcadas aqui no painel já contam sozinhas.</p>
      <div class="rh-tw"><table class="rh-t"><thead><tr><th>Período aquisitivo</th><th>Dar até</th><th>Marcadas no painel</th><th>Já tirou antes do painel</th><th>Faltam</th></tr></thead><tbody>
      ${ps.map(p=>{ const max=30-noP(p), v=Math.min(max,Math.max(0,parseInt(val(p),10)||0)), falta=Math.max(0,30-noP(p)-v); return `<tr><td class="num"><b>${br(p.ini)} a ${br(p.fim)}</b>${p.completo?'':'<small style="display:block;font-weight:400;color:var(--muted)">em aquisição</small>'}</td><td class="num">${br(p.lim)}${p.completo&&falta&&p.lim<hj?' <span class="pill crit">vencido</span>':''}</td><td class="num">${noP(p)?plural(noP(p),'dia','dias'):'—'}</td>
        <td><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input class="txt" type="number" min="0" max="${max}" inputmode="numeric" style="width:76px" data-rh-aj="${p.ini}" value="${esc(val(p))}">${max>0?`<button class="lnk" data-act="rh-fajtudo" data-p="${p.ini}" data-v="${max}">tirou tudo</button> <button class="lnk" data-act="rh-fajtudo" data-p="${p.ini}" data-v="0">nada</button>`:''}</div></td>
        <td class="num"><b>${plural(falta,'dia','dias')}</b></td></tr>`; }).join('')}</tbody></table></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-fajx">Cancelar</button><button class="btn" data-act="rh-fajsalvar" ${R.salv?'disabled':''}>Salvar ajuste</button></div></section>`; }
  function formFerias(){ const g=R.ffer, f=R.func.find(x=>x._id===g.funcId); if(!f) return ''; const ps=periodos(f).filter(p=>p.saldo>0), p=ps.find(x=>x.ini===g.aquisitivo)||ps.find(x=>x.completo)||ps[0];
    if(p&&g.aquisitivo!==p.ini) g.aquisitivo=p.ini; const dias=+g.dias||0, fim=okIso(g.inicio)&&dias>0?addDias(g.inicio,dias-1):'', ret=fim?addDias(fim,1):'';
    const hist=ferDe(f).slice().sort((a,b)=>String(b.inicio||b.aquisitivo).localeCompare(String(a.inicio||a.aquisitivo)));
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Marcar férias de ${esc(f.nome)}</h2><button class="lnk" data-act="rh-ferx">Fechar</button></div>
      ${p?`<div class="rh-g"><label><span class="label">Período aquisitivo</span><select class="txt" id="rh-ferp">${ps.map(x=>`<option value="${x.ini}" ${x.ini===p.ini?'selected':''}>${br(x.ini)} a ${br(x.fim)} · faltam ${x.saldo} dias${x.completo?'':' (em aquisição)'}</option>`).join('')}</select></label>
        <label><span class="label">Início das férias</span><input class="txt" type="date" id="rh-feri" value="${esc(g.inicio||'')}"></label>
        <label><span class="label">Quantos dias</span><input class="txt" type="number" min="1" max="${p.saldo}" id="rh-ferd" inputmode="numeric" value="${esc(g.dias||'')}"></label></div>
        <div class="rh-chips" style="margin:10px 0 0">${[10,15,20,30].filter(n=>n<=p.saldo).map(n=>`<button class="rh-chip2" data-act="rh-ferdias" data-v="${n}" aria-pressed="${dias===n}">${n} dias</button>`).join('')}${p.saldo<30&&![10,15,20].includes(p.saldo)?`<button class="rh-chip2" data-act="rh-ferdias" data-v="${p.saldo}" aria-pressed="${dias===p.saldo}">O que falta: ${p.saldo} dias</button>`:''}</div>
        <div class="sub" style="margin:10px 0 0">${fim?`Termina em <b>${br(fim)}</b> e volta ao trabalho em <b>${br(ret)}</b>.`:'Escolha o início e quantos dias.'}${!p.completo?' Este período ainda não se completou ('+br(p.fim)+').':''}</div>${ferInicioAviso(g.inicio)}
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-ferx">Cancelar</button><button class="btn" data-act="rh-fersalvar" ${R.salv?'disabled':''}>Marcar férias</button></div>`
      :'<div class="empty">Nenhum período com dias de férias em aberto.</div>'}
      ${hist.length?`<div class="rh-docs"><span class="label">JÁ MARCADAS OU TIRADAS</span>${hist.slice(0,8).map(x=>`<div class="rh-dl"><div><b>${x.anterior?'Tiradas antes do painel':br(x.inicio)+' a '+br(x.fim)}</b><small>${plural(+x.dias,'dia','dias')} · período ${br(x.aquisitivo)} a ${br(x.aquisitivoFim)}${x.porNome?' · '+esc(x.porNome):''}</small></div>${x.anterior?'':temAviso(x)?'<span class="pill ok">Aviso gerado</span>':`<button class="lnk" data-act="rh-dgfer" data-id="${x._id}">Gerar aviso</button>`}</div>`).join('')}</div>`:''}</section>`; }
  function vPJ(){ let xs=pjs().map(f=>({f,s:pjSit(f)})).sort((a,b)=>a.s.n-b.s.n||(a.s.d||0)-(b.s.d||0)||a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    return (R.pjaj?formPJAj():'')+(R.fpj?formPJ():'')+`<section class="card">${xs.length?`<div class="rh-tw"><table class="rh-t rh-tf"><thead><tr><th>PJ</th><th>Contando de</th><th>Próxima troca</th><th>Situação</th><th></th></tr></thead><tbody>
      ${xs.map(({f,s})=>`<tr><td><b>${esc(f.nome)}</b><small>${esc([f.funcao,empNome(f.empresa)].filter(Boolean).join(' · '))}</small></td><td class="num">${pjBase(f)?br(pjBase(f)):'—'}<small>${okIso(f.ultimaTroca)?'última troca':'admissão'}</small></td><td class="num"><b>${s.prox?br(s.prox):'—'}</b></td>
        <td><span class="pill ${s.c}">${esc(s.t)}</span></td><td class="rh-ac"><button class="btn sec rh-sm" data-act="rh-pjtroca" data-id="${f._id}">Registrar troca</button> <button class="btn sec rh-sm" data-act="rh-pjaj" data-id="${f._id}">Ajustar</button> <button class="lnk" data-act="rh-dgpara" data-id="${f._id}">Gerar documento</button></td></tr>`).join('')}</tbody></table></div>`
      :'<div class="empty">Nenhum PJ em atividade.</div>'}</section>`; }
  function formPJ(){ const g=R.fpj, f=R.func.find(x=>x._id===g.funcId); if(!f) return ''; const hs=(f.trocas||[]).slice().reverse();
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Registrar troca de ${esc(f.nome)}</h2><button class="lnk" data-act="rh-pjx">Fechar</button></div>
      <div class="rh-g"><label><span class="label">Data da troca</span><input class="txt" type="date" id="rh-pjd" value="${esc(g.data||P.hojeStr())}"></label><label><span class="label">Observação</span><input class="txt" id="rh-pjo" value="${esc(g.obs||'')}" placeholder="opcional"></label></div>
      <div class="sub" style="margin:10px 0 0">A próxima troca fica para ${okIso(g.data||P.hojeStr())?'<b>'+br(addMeses(g.data||P.hojeStr(),3))+'</b>':'—'}.</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-pjx">Cancelar</button><button class="btn" data-act="rh-pjsalvar" ${R.salv?'disabled':''}>Registrar troca</button></div>
      ${hs.length?`<div class="rh-docs"><span class="label">TROCAS ANTERIORES</span>${hs.slice(0,8).map(t=>`<div class="rh-dl"><div><b>${br(t.data)}</b><small>${esc([t.obs,t.porNome].filter(Boolean).join(' · '))}</small></div></div>`).join('')}</div>`:''}</section>`; }

  /* ---------- Contrato de experiência 45 + 45 (12/10) ----------
     1ª etapa: 45 dias contando o dia da admissão; 2ª etapa (prorrogado): até 90 dias. A RH registra a decisão:
     Prorrogar, Efetivar ou Desligar (exp.status no cadastro). Aviso 15 dias antes de cada fim. Quem terminou a experiência
     há mais de 30 dias sem decisão registrada não aparece (cadastros antigos). */
  const expFim1=f=>addDias(f.admissao,44), expFim2=f=>addDias(f.admissao,89);
  function expInfo(f){ if(f.tipo==='PJ'||!okIso(f.admissao)||f.status==='Desligado') return null; const e=f.exp||{}; if(e.status==='efetivado'||e.status==='desligado') return null;
    const f1=expFim1(f), f2=expFim2(f), hj=P.hojeStr(); if(f1>=addDias(hj,400)) return null;
    if(!e.status&&f2<addDias(hj,-30)) return null; if(e.status==='prorrogado'&&f2<addDias(hj,-30)) return null;
    const etapa=e.status==='prorrogado'?2:1, fim=etapa===1?f1:f2, d=diasAte(fim), qual=etapa===1?'1ª etapa':'Experiência';
    if(d<0) return {etapa,f1,f2,fim,d,c:'crit',t:qual+(etapa===1?' venceu':' terminou')+' há '+plural(-d,'dia','dias'),n:0};
    if(d<=PZ_AVISO()) return {etapa,f1,f2,fim,d,c:'warn',t:d===0?qual+' termina hoje':qual+' termina em '+plural(d,'dia','dias'),n:1};
    return {etapa,f1,f2,fim,d,c:'ok',t:(etapa===1?'1ª etapa':'2ª etapa')+' até '+br(fim),n:2}; }
  const emExp=()=>ativos().map(f=>({f,s:expInfo(f)})).filter(o=>o.s);
  function vExp(){ const xs=emExp().sort((a,b)=>a.s.n-b.s.n||a.s.d-b.s.d||a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    return (R.fdesl?formDesl():'')+`<section class="card">${xs.length?`<div class="rh-tw"><table class="rh-t rh-tf"><thead><tr><th>Funcionário</th><th>Admissão</th><th>Etapas</th><th>Situação</th><th></th></tr></thead><tbody>
      ${xs.map(({f,s})=>`<tr><td><b>${esc(f.nome)}</b><small>${esc([f.funcao,f.setor].filter(Boolean).join(' · '))}</small></td><td class="num">${br(f.admissao)}</td>
        <td class="num">1ª até ${br(s.f1)}<small>2ª até ${br(s.f2)}</small></td><td><span class="pill ${s.c}">${esc(s.t)}</span></td>
        <td class="rh-ac">${s.etapa===1?`<button class="btn sec rh-sm" data-act="rh-expprorr" data-id="${f._id}">Prorrogar</button> `:''}<button class="btn sec rh-sm" data-act="rh-expefet" data-id="${f._id}">Efetivar</button> <button class="lnk" data-act="rh-desl" data-id="${f._id}" data-exp="1" style="color:var(--crit-ink)">Desligar</button></td></tr>`).join('')}</tbody></table></div>`
      :'<div class="empty">Ninguém em contrato de experiência.</div>'}</section>`; }

  /* ---------- Desligamento em um passo ----------
     Pelo documento (modelo marcado "desliga o funcionário") ou direto (Funcionários / Experiência). Grava situação Desligado,
     data e motivo. A pessoa continua nas fichas do mês em que saiu e some a partir do mês seguinte. */
  const MOTIVOS=['Pedido de demissão','Demissão sem justa causa','Demissão por justa causa','Acordo entre as partes','Término do contrato de experiência','Rescisão antecipada da experiência (pelo empregador)','Rescisão antecipada da experiência (pelo empregado)','Fim do contrato (PJ)'];
  const noMes=(x,m)=>x.status!=='Desligado'||(okIso(x.desligamento)&&x.desligamento.slice(0,7)>=m);
  function formDesl(){ const g=R.fdesl, f=R.func.find(x=>x._id===g.funcId);
    if(!f){ const xs=ativos().filter(x=>!x.desligAgendado).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
      return `<section class="card rh-form" style="border-color:var(--crit)"><div class="head" style="align-items:baseline"><h2>Novo desligamento</h2><button class="lnk" data-act="rh-deslx">Fechar</button></div>
        <label><span class="label">Quem vai sair?</span><select class="txt" id="rh-desf"><option value="">Escolha o funcionário…</option>${xs.map(x=>`<option value="${x._id}">${esc(x.nome)}${x.setor?' · '+esc(x.setor):''}${x.tipo==='PJ'?' · PJ':''}</option>`).join('')}</select></label>
        <div class="sub" style="margin:10px 0 0">Depois de escolher, coloque a data e o motivo. Dá para gerar o aviso ou a rescisão na hora.</div></section>`; }
    return `<section class="card rh-form" style="border-color:var(--crit)"><div class="head" style="align-items:baseline"><h2>Desligar ${esc(f.nome)}</h2><button class="lnk" data-act="rh-deslx">Fechar</button></div>
      <div class="rh-g"><label><span class="label">Data do desligamento</span><input class="txt" type="date" id="rh-desd" value="${esc(g.data||P.hojeStr())}"></label>
        <label style="grid-column:span 2"><span class="label">Motivo</span><input class="txt" id="rh-desm" list="rh-motivos" value="${esc(g.motivo||'')}" placeholder="escolha ou escreva"><datalist id="rh-motivos">${MOTIVOS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label></div>${deslDevolver(f)}
      <div class="sub" style="margin:10px 0 0">Fica como <b>Desligado</b> na data (se a data for no futuro, como no aviso trabalhado, continua ativo até lá). Continua nas fichas do mês em que saiu e some a partir do mês seguinte. Para o documento (aviso, rescisão), use <b>Gerar documento</b>.</div>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn sec" data-act="rh-dgpara" data-id="${f._id}">Gerar documento</button><div style="display:flex;gap:10px"><button class="btn sec" data-act="rh-deslx">Cancelar</button><button class="btn" data-act="rh-deslsalvar" style="background:var(--crit);border-color:var(--crit)" ${R.salv?'disabled':''}>Desligar</button></div></div></section>`; }
  /* data no futuro (aviso trabalhado): continua ativo e vira Desligado sozinho no dia (desligAgendado) */
  async function desligar(f,data,motivo){ const fut=data>P.hojeStr(), up=fut?{desligamento:data,desligMotivo:String(motivo||'').trim(),desligAgendado:true}:{status:'Desligado',desligamento:data,desligMotivo:String(motivo||'').trim(),desligAgendado:false};
    if(f.exp&&f.exp.status!=='efetivado'&&expInfo(f)) up.exp=Object.assign({},f.exp,{status:'desligado',em:agora(),porNome:eu()}); else if(!f.exp&&expInfo(f)) up.exp={status:'desligado',em:agora(),porNome:eu()};
    await grava(COL.func+'/'+f._id,up); Object.assign(f,up); return fut; }
  const desligJa={};
  async function aplicarDesligAgendados(){ const hj=P.hojeStr(); for(const f of R.func){ if(f.desligAgendado&&f.status!=='Desligado'&&okIso(f.desligamento)&&f.desligamento<=hj&&!desligJa[f._id]){ desligJa[f._id]=1;
      try{ const up={status:'Desligado',desligAgendado:false}; if(expInfo(f)) up.exp=Object.assign({},f.exp||{},{status:'desligado',em:agora(),porNome:eu()}); await grava(COL.func+'/'+f._id,up); }catch(e){ console.warn('[RH] desligamento marcado',e); } } } }
  const qDeslig=qs=>qs.find(q=>/DESLIG|ULTIMO DIA|RESCIS|TERMINO|FIM DO CONTRATO/.test(norm(q))&&qData(q));
  const modeloDesliga=md=>!!md&&(md.desliga!=null?!!md.desliga:/DEMISS|RESCIS|DESLIG/.test(norm(md.nome)));

  /* ---------- Documentos dos terceirizados (validade + arquivo) ---------- */
  const DOC_TERC=['Certidão negativa de débitos','ASO','Treinamento NR-35','Treinamento NR-10','Treinamento NR-12','Seguro de vida','Contrato social','Ficha de EPI'];
  const tDocs=x=>(x.docs||[]).filter(d=>!d.removido);
  function docSit(d){ if(!okIso(d.validade)) return {c:'neu',t:'Sem validade',n:5}; const n=diasAte(d.validade);
    if(n<0) return {c:'crit',t:'Vencido há '+plural(-n,'dia','dias'),n:0,d:n}; if(n===0) return {c:'crit',t:'Vence hoje',n:1,d:n}; if(n<=PZ_AVISO()) return {c:'warn',t:'Vence em '+plural(n,'dia','dias'),n:2,d:n}; return {c:'ok',t:'Em dia · até '+br(d.validade),n:3,d:n}; }
  function tDocAvisos(){ const av=[]; R.terc.filter(x=>x.status!=='Encerrado').forEach(x=>tDocs(x).forEach(d=>{ const s=docSit(d); if(s.c==='crit'||s.c==='warn') av.push({x,d,s}); })); return av.sort((a,b)=>a.s.d-b.s.d); }
  avRH(()=>tDocAvisos().map(o=>({nivel:o.s.c,rotulo:o.s.c==='crit'?'Vencido':'Atenção',titulo:'Documento de terceirizado: '+o.x.nome,texto:o.d.nome+' · '+o.s.t.toLowerCase()+(okIso(o.d.validade)?' ('+br(o.d.validade)+')':''),go:'rhterc'})));
  function tDocResumo(x){ const ds=tDocs(x); if(!ds.length) return ''; const ss=ds.map(docSit), v=ss.filter(s=>s.c==='crit').length, w=ss.filter(s=>s.c==='warn').length;
    return v?`<span class="pill crit">${plural(v,'documento vencido','documentos vencidos')}</span>`:w?`<span class="pill warn">${plural(w,'documento vencendo','documentos vencendo')}</span>`:`<span class="pill ok">documentos em dia</span>`; }
  function painelDocsTerc(){ const x=R.terc.find(y=>y._id===R.tdoc); if(!x) return ''; const ds=tDocs(x).map(d=>({d,s:docSit(d)})).sort((a,b)=>a.s.n-b.s.n||String(a.d.validade).localeCompare(String(b.d.validade)));
    const g=R.tdf||(R.tdf={nome:'',validade:''});
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Documentos de ${esc(x.nome)}</h2><button class="lnk" data-act="rh-tdocx">Fechar</button></div>
      ${ds.length?ds.map(({d,s})=>`<div class="rh-dl"><div><b>${esc(d.nome)}</b><small>${okIso(d.validade)?'validade '+br(d.validade):'sem validade'}${d.porNome?' · '+esc(d.porNome):''}</small></div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><span class="pill ${s.c}">${esc(s.t)}</span>${d.arquivo?`<button class="lnk" data-act="rh-tdver" data-id="${d.id}">Ver arquivo</button>`:anexar(`data-rh-tdanx="${d.id}"`,'Anexar arquivo','lnk')}<button class="lnk" data-act="rh-tdrem" data-id="${d.id}" style="color:var(--crit-ink)">Tirar</button></div></div>`).join('')
        :'<div class="sub" style="margin:0 0 6px">Nenhum documento ainda.</div>'}
      <div class="rh-sep"></div><div class="label" style="margin-bottom:6px">Novo documento</div>
      <div class="rh-g"><label><span class="label">Documento</span><input class="txt" id="rh-tdn" list="rh-tdlist" value="${esc(g.nome)}" placeholder="ex.: ASO"><datalist id="rh-tdlist">${DOC_TERC.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
        <label><span class="label">Validade</span><input class="txt" type="date" id="rh-tdv" value="${esc(g.validade)}"></label>
        <label><span class="label">Arquivo (opcional)</span><input class="txt" type="file" id="rh-tdf" accept="application/pdf,image/*"></label></div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-act="rh-tdadd" ${R.salv?'disabled':''}>Adicionar documento</button></div></section>`; }
  async function guardarArqRH(pasta,nome,file){ const b64=await lerB64(file), od=OD(), mime=file.type||'application/pdf';
    if(od){ const r=await od.enviar(pasta+'/'+nome,b64,mime); return {url:(r&&r.webUrl)||'',nome}; }
    return {url:linkArq(await salvarArquivo({nome,mime,tipo:'documento'},b64)),nome}; }

  /* ---------- Aniversários e tempo de casa ---------- */
  function aniversarios(){ const hj=P.hojeStr(), m=hj.slice(5,7), ano=+hj.slice(0,4), xs=ativos();
    const nasc=xs.filter(f=>okIso(f.nascimento)&&f.nascimento.slice(5,7)===m).map(f=>({f,dia:f.nascimento.slice(8,10),hoje:f.nascimento.slice(5)===hj.slice(5),idade:ano-+f.nascimento.slice(0,4)})).sort((a,b)=>a.dia.localeCompare(b.dia));
    const casa=xs.filter(f=>okIso(f.admissao)&&f.admissao.slice(5,7)===m).map(f=>({f,dia:f.admissao.slice(8,10),hoje:f.admissao.slice(5)===hj.slice(5),anos:ano-+f.admissao.slice(0,4)})).filter(o=>o.anos===1||(o.anos>0&&o.anos%5===0)).sort((a,b)=>a.dia.localeCompare(b.dia));
    return {nasc,casa}; }
  function cartaoAniv(){ const {nasc,casa}=aniversarios(); if(!nasc.length&&!casa.length) return ''; const mm=MESES[+P.hojeStr().slice(5,7)-1];
    const lin=(o,t,tp)=>`<div class="rh-an ${o.hoje?'hoje':''}"><span class="num">${o.dia}/${P.hojeStr().slice(5,7)}</span><b>${esc(titulo(o.f.nome))}</b><small>${t}${o.hoje?' · <b>hoje</b> 🎉':''}</small><button class="lnk rh-anc" data-act="rh-cartao" data-v="${tp}" data-id="${o.f._id}">cartão</button></div>`;
    return `<section class="card"><h2>Aniversários de ${mm}</h2><div class="rh-2c">${nasc.length?`<div><div class="label" style="margin-bottom:4px">ANIVERSARIANTES</div>${nasc.map(o=>lin(o,esc(o.f.setor||'')+(o.f.setor?' · ':'')+o.idade+' anos','aniv')).join('')}</div>`:''}
      ${casa.length?`<div><div class="label" style="margin-bottom:4px">TEMPO DE CASA</div>${casa.map(o=>lin(o,plural(o.anos,'ano','anos')+' de casa','casa')).join('')}</div>`:''}</div></section>`; }

  /* ===================== DIA A DIA DO RH (12/10, 4ª parte) =====================
     Agenda (tudo o que vence, em ordem de data, com envio para o Outlook), relatório do mês para a contabilidade,
     ficha completa da pessoa, admissão em um passo, documentos em lote e planilha de carga inicial. */
  const bissexto=y=>(y%4===0&&y%100!==0)||y%400===0;
  const naData=(y,md)=>{ if(md==='02-29'&&!bissexto(y)) md='02-28'; return y+'-'+md; };
  function proxAniv(iso){ const hj=P.hojeStr(), y=+hj.slice(0,4), md=iso.slice(5); let d=naData(y,md); if(d<hj) d=naData(y+1,md); return d; }
  const DIA_CURTO=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const TIPO_AG={feriado:'Feriado',ferias:'Férias',exp:'Experiência',pj:'Troca do PJ',contrato:'Contrato',doc:'Documento',aniv:'Aniversário',casa:'Tempo de casa',desl:'Desligamento',adm:'Admissão'};

  /* ---------- Agenda ---------- */
  function agendaItens(){ const it=[], add=(data,tipo,t,s,c,act,uid)=>{ if(okIso(data)) it.push({data,tipo,t,s:s||'',c:c||'neu',act:act||'',uid}); };
    const pz=v=>`data-act="rh-pzabrir" data-v="${v}"`, pe=f=>`data-act="rh-pess" data-id="${f._id}"`;
    ativos().forEach(f=>{
      if(f.tipo!=='PJ'){ const sf=sitFer(f); if(sf.p&&sf.p.completo&&sf.p.saldo>0) add(sf.p.lim,'ferias','Prazo para dar as férias de '+f.nome,'faltam '+plural(sf.p.saldo,'dia','dias')+' do período '+br(sf.p.ini)+' a '+br(sf.p.fim),sf.c==='ok'?'neu':sf.c,pz('ferias'),'fer-'+f._id+'-'+sf.p.ini);
        const e=expInfo(f); if(e){ if(e.etapa===1) add(e.f1,'exp','Fim da 1ª etapa da experiência de '+f.nome,'prorrogar, efetivar ou desligar',e.c==='ok'?'neu':e.c,pz('exp'),'exp1-'+f._id); add(e.f2,'exp','Fim da experiência de '+f.nome,'efetivar ou desligar',e.etapa===2&&e.c!=='ok'?e.c:'neu',pz('exp'),'exp2-'+f._id); } }
      else { const s=pjSit(f); if(s.prox) add(s.prox,'pj','Troca do PJ '+f.nome,'3 meses da '+(okIso(f.ultimaTroca)?'última troca':'admissão'),s.c==='ok'?'neu':s.c,pz('pj'),'pj-'+f._id+'-'+s.prox); }
      if(f.desligAgendado&&okIso(f.desligamento)) add(f.desligamento,'desl','Último dia de '+f.nome,f.desligMotivo||'desligamento marcado','warn',pe(f),'desl-'+f._id);
      if(okIso(f.nascimento)){ const d=proxAniv(f.nascimento); add(d,'aniv','Aniversário de '+titulo(f.nome),(+d.slice(0,4)-+f.nascimento.slice(0,4))+' anos','neu',`data-act="rh-cartao" data-id="${f._id}"`,'aniv-'+f._id+'-'+d.slice(0,4)); }
      if(okIso(f.admissao)){ const d=proxAniv(f.admissao), a=+d.slice(0,4)-+f.admissao.slice(0,4); if(a===1||(a>0&&a%5===0)) add(d,'casa',plural(a,'ano','anos')+' de casa de '+titulo(f.nome),f.setor||'','neu',`data-act="rh-cartao" data-v="casa" data-id="${f._id}"`,'casa-'+f._id+'-'+d.slice(0,4)); } });
    const vivo=id=>R.func.some(f=>f._id===id&&f.status!=='Desligado');
    R.fer.filter(x=>!x.anterior&&x.status!=='cancelada'&&vivo(x.funcId)).forEach(x=>{ const av=temAviso(x);
      add(x.inicio,'ferias','Começam as férias de '+x.funcionario,plural(+x.dias,'dia','dias')+' · volta '+br(x.retorno)+(av?'':' · aviso de férias ainda não gerado'),av?'neu':'warn',av?pz('ferias'):`data-act="rh-dgfer" data-id="${x._id}"`,'feri-'+x._id);
      add(x.retorno,'ferias','Volta das férias de '+x.funcionario,'','neu',pz('ferias'),'ferr-'+x._id); });
    R.terc.filter(x=>x.status!=='Encerrado').forEach(x=>{ const s=tSit(x); if(x.fim) add(x.fim,'contrato','Fim do contrato de '+x.nome,x.empresa||'',s.c==='ok'?'neu':s.c,`data-act="rh-ted" data-go-terc="1" data-id="${x._id}"`,'terc-'+x._id+'-'+x.fim);
      tDocs(x).forEach(d=>{ const ds=docSit(d); if(okIso(d.validade)) add(d.validade,'doc','Vence '+d.nome+' de '+x.nome,'terceirizado',ds.c==='ok'?'neu':ds.c,`data-act="rh-tdoc" data-go-terc="1" data-id="${x._id}"`,'tdoc-'+x._id+'-'+d.id); }); });
    { const y0=+P.hojeStr().slice(0,4); [y0,y0+1].forEach(y=>ferAno(y).forEach(x=>add(x.data,'feriado','Feriado: '+x.nome,ferTipoNome(x.tipo),'neu','data-act="rh-cad" data-go-cad="1" data-v="feriados"','fer-'+x.data))); }
    return it.sort((a,b)=>a.data.localeCompare(b.data)||a.t.localeCompare(b.t)); }
  function agendaJanela(){ const hj=P.hojeStr(), ate=addDias(hj,R.agDias), xs=agendaItens();
    return {atras:xs.filter(x=>x.data<hj&&(x.c==='crit'||x.c==='warn')),prox:xs.filter(x=>x.data>=hj&&x.data<=ate)}; }
  function vAgenda(){ const EY='RH · AGENDA', seg=`<div class="seg" role="group" aria-label="Agenda">${[['agenda','Agenda'],['rel','Relatório do mês'],['ind','Indicadores']].map(([k,l])=>`<button data-act="rh-agv" data-v="${k}" aria-pressed="${R.agv===k}">${l}</button>`).join('')}</div>`;
    if(R.agv==='ind') return topo('Indicadores do RH','Pessoas na Colafix nos últimos 12 meses: quadro, entradas e saídas, tempo de casa, experiência e o que está em dia.',seg+`<button class="btn sec" data-act="rh-indimp">Imprimir / PDF</button>`,EY)+(R.lido.func?vIndicadores():'<section class="card"><div class="empty">Carregando…</div></section>');
    if(R.agv==='rel') return topo('Relatório do mês','Admissões, desligamentos, férias e experiência do mês, pronto para mandar para a contabilidade.',seg,EY)+vRelatorio();
    if(!R.lido.func) return topo('Agenda','',seg,EY)+'<section class="card"><div class="empty">Carregando…</div></section>';
    const {atras,prox}=agendaJanela(), hj=P.hojeStr();
    const lin=x=>{ const d=dU(x.data); return `<div class="rh-ag ${x.c}"><div class="rh-agd"><b>${String(d.getUTCDate()).padStart(2,'0')}/${x.data.slice(5,7)}</b><small>${x.data===hj?'hoje':DIA_CURTO[d.getUTCDay()]}</small></div>
      <div><span class="rh-agt">${esc(TIPO_AG[x.tipo]||'')}</span><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</div>${x.act?`<button class="lnk" ${x.act}>${x.tipo==='aniv'||x.tipo==='casa'?'🎉 Fazer cartão':'Abrir'}</button>`:'<span></span>'}</div>`; };
    const semanas={}; prox.forEach(x=>{ const k=x.data===hj?'Hoje':x.data<=addDias(hj,7)?'Próximos 7 dias':x.data.slice(0,7)===hj.slice(0,7)?'Ainda este mês':cap(mesNome(x.data))+' de '+x.data.slice(0,4); (semanas[k]=semanas[k]||[]).push(x); });
    return topo('Agenda','Tudo o que vence ou acontece, em ordem de data: férias, experiência, troca dos PJ, terceirizados, aniversários.',seg+`<button class="btn" data-act="rh-ics" ${prox.length?'':'disabled'}>Mandar para o Outlook</button>`,EY)
      +`<div class="rh-chips">${[30,60,90].map(n=>`<button class="rh-chip2" data-act="rh-agdias" data-v="${n}" aria-pressed="${R.agDias===n}">Próximos ${n} dias</button>`).join('')}<span class="sub" style="margin:0 0 0 auto;font-size:12.5px">"Mandar para o Outlook" baixa um arquivo: abra e o Outlook guarda tudo com lembrete na véspera.</span></div>`
      +(atras.length?`<section class="card rh-agc" style="border-left:5px solid var(--crit)"><h2>Já passou da data (${atras.length})</h2>${atras.map(lin).join('')}</section>`:'')
      +(prox.length?Object.entries(semanas).map(([k,xs])=>`<section class="card rh-agc"><h2>${esc(k)}</h2>${xs.map(lin).join('')}</section>`).join(''):`<section class="card"><div class="empty">Nada nos próximos ${R.agDias} dias.</div></section>`); }
  function icsTexto(xs){ const e=s=>String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'), te=new TextEncoder();
    const dobra=l=>{ let out='',cur='',n=0; for(const ch of l){ const b=te.encode(ch).length; if(n+b>74){ out+=cur+'\r\n '; cur=''; n=1; } cur+=ch; n+=b; } return out+cur; };
    const st=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'), L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Colafix//Painel RH//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:RH Colafix'];
    xs.forEach(x=>{ const ini=x.data.replace(/-/g,''), fim=addDias(x.data,1).replace(/-/g,''), sem=x.tipo==='aniv'||x.tipo==='casa';
      L.push('BEGIN:VEVENT','UID:rh-'+x.uid+'@painel-colafix','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+ini,'DTEND;VALUE=DATE:'+fim,'SUMMARY:'+e((sem?'':'RH · ')+x.t),'DESCRIPTION:'+e([TIPO_AG[x.tipo],x.s,'Painel de Operação Colafix · RH'].filter(Boolean).join(' · ')),'TRANSP:TRANSPARENT');
      if(!sem) L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+e(x.t),'TRIGGER:-PT15H','END:VALARM'); L.push('END:VEVENT'); });
    L.push('END:VCALENDAR'); return L.map(dobra).join('\r\n')+'\r\n'; }

  /* ---------- Indicadores do RH (pedido de 13/10) ---------- */
  function indDados(){ const hj=P.hojeStr(), ini=addDias(addMeses(hj,-12),1), at=ativos();
    const saiuAte=(f,d)=>okIso(f.desligamento)&&f.desligamento<=d&&(f.status==='Desligado'||(f.desligAgendado&&f.desligamento<=hj));
    const noQuadro=d=>R.func.filter(f=>(!okIso(f.admissao)||f.admissao<=d)&&!saiuAte(f,d)&&(f.status!=='Desligado'||okIso(f.desligamento))).length;
    const meses=[...Array(12)].map((_,i)=>{ const m=mesMais(hj.slice(0,7),i-11), fimM=m===hj.slice(0,7)?hj:addDias(addMeses(m+'-01',1),-1); return {m,n:noQuadro(fimM)}; });
    const ent=R.func.filter(f=>okIso(f.admissao)&&f.admissao>=ini&&f.admissao<=hj), sai=R.func.filter(f=>f.status==='Desligado'&&okIso(f.desligamento)&&f.desligamento>=ini&&f.desligamento<=hj);
    const media=meses.reduce((a,x)=>a+x.n,0)/12||1, rot=Math.round(((ent.length+sai.length)/2)/media*1000)/10;
    const tempos=at.filter(f=>okIso(f.admissao)).map(f=>diasEntre(f.admissao,hj)/365.25), tm=tempos.length?Math.round(tempos.reduce((a,x)=>a+x,0)/tempos.length*10)/10:0, mx=tempos.length?Math.floor(Math.max(...tempos)):0;
    const expFeitas=R.func.filter(f=>f.tipo!=='PJ'&&okIso(f.admissao)&&f.admissao>=addDias(ini,-90)&&expFim2(f)<=hj||(f.exp&&['efetivado','desligado'].includes(f.exp.status)&&String(f.exp.em||'').slice(0,10)>=ini));
    const efet=expFeitas.filter(f=>!(f.status==='Desligado'&&okIso(f.desligamento)&&f.desligamento<=expFim2(f))&&!(f.exp&&f.exp.status==='desligado')).length;
    const motivos={}; sai.forEach(f=>{ const k=f.desligMotivo||'Sem motivo informado'; motivos[k]=(motivos[k]||0)+1; });
    const fv=clts().filter(f=>sitFer(f).c==='crit').length, mF=fichasMesIni(), fr=mF<=hj.slice(0,7)?fResumo(mF):null;
    return {at,clt:at.filter(f=>f.tipo!=='PJ').length,pj:at.filter(f=>f.tipo==='PJ').length,meses,ent,sai,rot,tm,mx,expN:expFeitas.length,efet,motivos:Object.entries(motivos).sort((a,b)=>b[1]-a[1]),fv,fr,mF,tdoc:tDocAvisos().length+tAvisos().length}; }
  function vIndicadores(){ const D=indDados(), mx=Math.max(1,...D.meses.map(x=>x.n));
    const k=(n,l,s,c)=>`<div class="rh-k"><b class="num" ${c?`style="color:${c}"`:''}>${n}</b><span>${l}</span>${s?`<small>${s}</small>`:''}</div>`;
    return `<div class="rh-kpi rh-kpi2 rh-kpi5">${k(D.at.length,'no quadro',D.clt+' CLT · '+D.pj+' PJ')}${k(String(D.rot).replace('.',',')+'%','rotatividade',D.ent.length+' entradas · '+D.sai.length+' saídas')}${k(String(D.tm).replace('.',',')+' anos','tempo médio de casa',D.mx?'mais antigo: '+plural(D.mx,'ano','anos'):'')}${k(D.expN?D.efet+' de '+D.expN:'—','efetivados na experiência',D.expN-D.efet?plural(D.expN-D.efet,'saiu','saíram')+' antes dos 90 dias':'')}${k(D.fv,'férias vencidas',D.fv?'risco de pagar em dobro':'sem risco de pagar em dobro',D.fv?'var(--crit-ink)':'var(--ok-ink,#2F6047)')}</div>
      <div class="rh-dash"><section class="card"><h2>Pessoas no quadro, mês a mês</h2><div class="rh-col">${D.meses.map((x,i)=>`<div title="${esc(cap(mesLabel(x.m)))}: ${x.n}"><span class="num">${x.n}</span><i style="height:${Math.max(3,x.n/mx*100).toFixed(1)}%;${i===11?'background:var(--teal-strong)':''}"></i><small>${MESES[+x.m.slice(5)-1].slice(0,3)}</small></div>`).join('')}</div></section>
        <div style="display:flex;flex-direction:column;gap:16px"><section class="card"><h2>Por que as pessoas saíram</h2>${barras(D.motivos,D.sai.length,'Ninguém saiu nos últimos 12 meses.')}</section>
          <section class="card"><h2>Em dia</h2><div class="rh-pfl">${D.fr?`<div><span>Fichas de EPI de ${mesNome(D.mF)} assinadas</span><b>${D.fr.c.ass} de ${D.fr.tot}</b></div>`:`<div><span>Fichas de EPI</span><small>começam em ${mesNome(D.mF)}</small></div>`}<div><span>Férias vencidas</span><b>${D.fv}</b></div><div><span>Terceirizados vencendo (contrato ou documento)</span><b>${D.tdoc}</b></div></div></section></div></div>`; }
  function indHtml(){ const D=indDados(), L=(a,b)=>`<tr><td>${esc(a)}</td><td style="text-align:right"><b>${esc(b)}</b></td></tr>`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Indicadores do RH</title><style>@page{size:A4;margin:16mm}body{font:10.5pt/1.45 "Segoe UI",Arial,sans-serif;color:#111}h1{font-size:16pt;margin:0}h2{font-size:12pt;margin:18px 0 6px;color:#143F54}table{width:100%;border-collapse:collapse}td{padding:5px 6px;border-bottom:1px solid #ddd}.sub{color:#666}.b{display:inline-block;height:10px;background:#1B5C7A;border-radius:0 3px 3px 0}</style></head><body>
      <h1>Indicadores do RH</h1><div class="sub">${esc(EMP_DOC.COLAFIX.nome)} · últimos 12 meses · gerado em ${br(P.hojeStr())}</div>
      <h2>Resumo</h2><table>${L('No quadro',D.at.length+' ('+D.clt+' CLT · '+D.pj+' PJ)')}${L('Entradas / saídas',D.ent.length+' / '+D.sai.length)}${L('Rotatividade',String(D.rot).replace('.',',')+'%')}${L('Tempo médio de casa',String(D.tm).replace('.',',')+' anos')}${L('Efetivados na experiência',D.expN?D.efet+' de '+D.expN:'—')}${L('Férias vencidas',D.fv)}</table>
      <h2>Quadro mês a mês</h2><table>${D.meses.map(x=>`<tr><td style="width:120px">${esc(cap(mesLabel(x.m)))}</td><td><span class="b" style="width:${Math.round(x.n/Math.max(1,...D.meses.map(y=>y.n))*300)}px"></span> ${x.n}</td></tr>`).join('')}</table>
      <h2>Por que as pessoas saíram</h2>${D.motivos.length?`<table>${D.motivos.map(([m,n])=>L(m,n)).join('')}</table>`:'<div class="sub">Ninguém saiu nos últimos 12 meses.</div>'}</body></html>`; }

  /* ---------- Relatório do mês ---------- */
  function relDados(m){ const ini=m+'-01', fim=addDias(addMeses(ini,1),-1), em=s=>okIso(s)&&s>=ini&&s<=fim;
    const saiu=f=>okIso(f.desligamento)&&f.desligamento<=fim&&(f.status==='Desligado'||f.desligAgendado);
    const quadro=R.func.filter(f=>(!okIso(f.admissao)||f.admissao<=fim)&&!saiu(f));
    return {ini,fim,quadro,adm:R.func.filter(f=>em(f.admissao)).sort((a,b)=>a.admissao.localeCompare(b.admissao)),
      desl:R.func.filter(f=>em(f.desligamento)&&(f.status==='Desligado'||f.desligAgendado)).sort((a,b)=>a.desligamento.localeCompare(b.desligamento)),
      fer:R.fer.filter(x=>!x.anterior&&x.status!=='cancelada'&&okIso(x.inicio)&&x.inicio<=fim&&x.fim>=ini).sort((a,b)=>a.inicio.localeCompare(b.inicio)),
      exp:R.func.filter(f=>f.exp&&['prorrogado','efetivado'].includes(f.exp.status)&&String(f.exp.em||'').slice(0,7)===m),
      afast:R.func.filter(f=>f.status==='Afastado')}; }
  const REL_T=[['adm','Admissões',['Nome','CPF / CNPJ','Função','Setor','Vínculo','Admissão'],f=>[f.nome,docF(f),f.funcao||'',f.setor||'',f.tipo==='PJ'?'PJ · '+empNome(f.empresa):'CLT',br(f.admissao)]],
    ['desl','Desligamentos',['Nome','CPF / CNPJ','Função','Data','Motivo'],f=>[f.nome,docF(f),f.funcao||'',br(f.desligamento)+(f.status!=='Desligado'?' (aviso trabalhado)':''),f.desligMotivo||'']],
    ['fer','Férias',['Nome','Início','Fim','Dias','Volta','Período aquisitivo'],x=>[x.funcionario,br(x.inicio),br(x.fim),String(x.dias),br(x.retorno),br(x.aquisitivo)+' a '+br(x.aquisitivoFim)]],
    ['exp','Experiência',['Nome','Admissão','Situação','Em'],f=>[f.nome,br(f.admissao),f.exp.status==='efetivado'?'Efetivado':'Prorrogado (2ª etapa)',dmIso(f.exp.em)+'/'+String(f.exp.em).slice(0,4)]],
    ['afast','Afastados (situação atual)',['Nome','Função','Setor'],f=>[f.nome,f.funcao||'',f.setor||'']]];
  function relTabela(rows,cab){ return rows.length?`<div class="rh-tw"><table class="rh-t"><thead><tr>${cab.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="sub" style="margin:0">Nenhum.</div>'; }
  function vRelatorio(){ const m=R.relMes, D=relDados(m), clt=D.quadro.filter(f=>f.tipo!=='PJ').length;
    return `<section class="card"><div class="rh-ch" style="flex-wrap:wrap"><div style="display:flex;gap:8px;align-items:center"><button class="btn sec rh-sm" data-act="rh-relmes" data-v="-1">‹</button><h2 style="margin:0">${esc(mesTitulo(m))}</h2>${m<P.hojeStr().slice(0,7)?'<button class="btn sec rh-sm" data-act="rh-relmes" data-v="1">›</button>':''}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec rh-sm" data-act="rh-relimp">Imprimir / PDF</button><button class="btn rh-sm" data-act="rh-relxls">Baixar Excel</button></div></div>
      <div class="rh-kpi" style="margin:4px 0 0">${[[D.quadro.length,'no quadro no fim do mês'],[clt+' / '+(D.quadro.length-clt),'CLT / PJ'],[D.adm.length,D.adm.length===1?'admissão':'admissões'],[D.desl.length,D.desl.length===1?'desligamento':'desligamentos']].map(([n,l])=>`<div><b class="num">${n}</b><span>${l}</span></div>`).join('')}</div></section>`
      +REL_T.map(([k,t,cab,fn])=>`<section class="card"><h2>${t}${D[k].length?' · '+D[k].length:''}</h2>${relTabela(D[k].map(fn),cab)}</section>`).join(''); }
  function relHtml(m){ const D=relDados(m);
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório do RH - ${esc(mesTitulo(m))}</title><style>@page{size:A4;margin:16mm}body{font:10.5pt/1.45 "Segoe UI",Arial,sans-serif;color:#111}h1{font-size:16pt;margin:0}h2{font-size:12pt;margin:18px 0 6px;color:#143F54}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ddd;font-size:9.5pt}th{background:#f2efe7}.sub{color:#666}</style></head><body>
      <h1>Relatório do RH · ${esc(mesTitulo(m))}</h1><div class="sub">${esc(EMP_DOC.COLAFIX.nome)} · gerado em ${br(P.hojeStr())} · ${D.quadro.length} no quadro no fim do mês</div>
      ${REL_T.map(([k,t,cab,fn])=>`<h2>${t} (${D[k].length})</h2>${D[k].length?`<table><tr>${cab.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>${D[k].map(fn).map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`:'<div class="sub">Nenhum.</div>'}`).join('')}</body></html>`; }
  async function relExcel(m){ const D=relDados(m); try{ if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }catch(e){}
    if(window.XLSX&&window.XLSX.utils){ const wb=XLSX.utils.book_new(); REL_T.forEach(([k,t,cab,fn])=>{ const ws=XLSX.utils.aoa_to_sheet([cab].concat(D[k].map(fn))); ws['!cols']=cab.map(()=>({wch:24})); XLSX.utils.book_append_sheet(wb,ws,t.slice(0,31).replace(/[()]/g,'')); });
      const out=XLSX.write(wb,{type:'array',bookType:'xlsx'}); baixar(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Relatorio-RH-'+m+'.xlsx'); return; }
    const L=[]; REL_T.forEach(([k,t,cab,fn])=>{ L.push([t]); L.push(cab); D[k].map(fn).forEach(r=>L.push(r)); L.push([]); });
    baixar(new Blob(['\ufeff'+L.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv'}),'Relatorio-RH-'+m+'.csv'); }

  /* ---------- Ficha completa da pessoa ---------- */
  function tempoDe(iso){ const hj=P.hojeStr(); let a=+hj.slice(0,4)-+iso.slice(0,4), m=+hj.slice(5,7)-+iso.slice(5,7); if(hj.slice(8)<iso.slice(8)) m--; if(m<0){ a--; m+=12; } return {a,m}; }
  const tempoTxt=iso=>{ const t=tempoDe(iso); return [t.a?plural(t.a,'ano','anos'):'',t.m?plural(t.m,'mês','meses'):''].filter(Boolean).join(' e ')||'menos de 1 mês'; };
  /* Perfil da pessoa (pedido de 13/10): cartão com os dados, a história na empresa e férias, EPIs e documentos ao lado */
  const iniciais=n=>{ const p=String(n||'').trim().split(/\s+/).filter(w=>!['DA','DE','DO','DAS','DOS','E'].includes(w.toUpperCase())); return ((p[0]||'')[0]||'')+(p.length>1?(p[p.length-1][0]||''):''); };
  function historia(f){ const ev=[], add=(d,t,s,c)=>{ if(okIso(String(d||'').slice(0,10))) ev.push({d:String(d).slice(0,10),t,s:s||'',c:c||'teal'}); };
    if(okIso(f.admissao)){ const lista=docsAdm(), fe=admFeitos(f).filter(n=>lista.includes(n)).length; add(f.admissao,'Admissão',[f.funcao,f.setor].filter(Boolean).join(' · ')+(f.admRoteiro?' · '+fe+' de '+lista.length+' documentos entregues':''),'ink'); }
    const ex=f.exp||{}; if(ex.status==='prorrogado') add(ex.em,'Experiência prorrogada','2ª etapa até '+br(expFim2(f)),'purple'); if(ex.status==='efetivado') add(ex.em,titulo(f.nome).split(' ')[0]+' foi efetivado(a)','fim do contrato de experiência','ok');
    ferDe(f).filter(x=>!x.anterior&&okIso(x.inicio)).forEach(x=>add(x.inicio,(x.inicio>P.hojeStr()?'Férias marcadas · ':'Férias · ')+plural(+x.dias,'dia','dias'),br(x.inicio)+' a '+br(x.fim)+(temAviso(x)?' · aviso de férias gerado':' · aviso de férias ainda não gerado'),'teal'));
    (f.trocas||[]).forEach(x=>add(x.data,'Troca do PJ',x.obs||'','purple'));
    R.docs.filter(d=>d.funcId===f._id).forEach(d=>add(d.em,d.modelo||'Documento',d.assinado?'gerado e assinado':'gerado','teal'));
    Object.keys(R.fm).forEach(m=>{ const a=((R.fm[m]||{}).assinadas||{})[f._id]; if(a) add(okIso(String(a.em||'').slice(0,10))?a.em:m+'-01','Ficha de EPI de '+mesNome(m)+' assinada','escaneada e guardada','ok'); });
    ocDe(f._id).forEach(x=>add(x.data,x.tipo+(x.dias?' · '+plural(+x.dias,'dia','dias'):''),x.motivo||'',ocCor(x.tipo)==='ok'?'ok':ocCor(x.tipo)==='neu'?'teal':'crit'));
    empDe(f._id).forEach(x=>{ add(x.desde||x.em,'Recebeu: '+empTxt(x),'item emprestado','purple'); if(x.devolvido) add(x.devolvido,'Devolveu: '+empTxt(x),'','ok'); });
    if(okIso(f.desligamento)&&(f.status==='Desligado'||f.desligAgendado)) add(f.desligamento,f.status==='Desligado'?'Desligamento':'Desligamento marcado',f.desligMotivo||'','crit');
    return ev.sort((a,b)=>b.d.localeCompare(a.d)); }
  function vPessoa(){ const f=R.func.find(x=>x._id===R.pess); if(!f) return '<section class="card"><div class="empty">Funcionário não encontrado.</div></section>';
    const linha=(l,v)=>v?`<dt>${l}</dt><dd>${v}</dd>`:'';
    const sf=f.tipo!=='PJ'?sitFer(f):null, e=expInfo(f), pj=f.tipo==='PJ'?pjSit(f):null, hj=P.hojeStr(), m=hj.slice(0,7);
    const falt=admFaltam(f), ev=historia(f), fc=R.funcoes.find(x=>norm(x.nome)===norm(f.funcao)), fs=fSit(f,fichasMesIni());
    const idade=okIso(f.nascimento)?tempoDe(f.nascimento).a:null, cor={teal:'var(--teal)',ok:'var(--ok)',purple:'#5B3FA6',crit:'var(--crit)',ink:'var(--teal-strong)'};
    const chips=[`<span class="pill ${corSt(f.status)}">${esc(f.status||'')}</span>`,`<span class="pill neu">${f.tipo==='PJ'?'PJ · '+esc(empNome(f.empresa)||''):'CLT · Colafix'}</span>`,e?`<span class="pill warn">em experiência</span>`:f.exp&&f.exp.status==='efetivado'?'<span class="pill ok">efetivado(a)</span>':''].join('');
    const p=sf&&sf.p, usados=p?30-p.saldo:0;
    return `<div class="head"><div><div class="eyebrow">RH · FUNCIONÁRIO</div><h1>${esc(f.nome)}</h1><div class="sub">${esc([f.funcao,f.setor].filter(Boolean).join(' · '))}</div></div>
        <div class="rh-acoes"><button class="btn sec" data-act="rh-pessx">‹ Funcionários</button></div></div>
      <div class="rh-pf"><aside class="card rh-pfa"><span class="rh-av2">${esc(iniciais(f.nome).toUpperCase())}</span><b class="rh-pfn">${esc(titulo(f.nome))}</b><div class="rh-pfc">${chips}</div>
          ${okIso(f.admissao)?`<div class="rh-pft"><b>${esc(tempoTxt(f.admissao))}</b><span>de casa · desde ${br(f.admissao)}</span></div>`:''}
          <dl class="rh-pfd">${linha(docRot(f),esc(docF(f)))}${linha('Telefone',esc(f.telefone||''))}${linha('Aniversário',okIso(f.nascimento)?br(f.nascimento).slice(0,5)+' · '+idade+' anos':'')}${linha('Salário',f.salario!==''&&f.salario!=null?esc(brl(f.salario)):'')}${linha('Jornada',esc(f.jornada||''))}${linha('Endereço',esc([f.endereco,f.cep?'CEP '+f.cep:''].filter(Boolean).join(' · ')))}${linha('Banco',esc([f.banco,f.agencia?'ag. '+f.agencia:'',f.conta?'conta '+f.conta:'',f.pix?'PIX '+f.pix:''].filter(Boolean).join(' · ')))}${linha('Emergência',esc(f.emergencia||''))}
            ${linha('Tamanhos',esc([f.camisa?'camisa '+f.camisa:'',f.calca?'calça '+f.calca:'',f.calcado?'calçado '+f.calcado:''].filter(Boolean).join(' · ')))}${f.status==='Desligado'?linha('Saiu em',br(f.desligamento)):f.desligAgendado?linha('Sai em',br(f.desligamento)):''}</dl>
          ${f.obs?`<div class="sub" style="margin:0;font-size:13px;text-align:left">${esc(f.obs)}</div>`:''}
          <div class="rh-pfb"><button class="btn" data-act="rh-dgpara" data-id="${f._id}">Gerar documento</button><button class="btn sec" data-act="rh-ed" data-id="${f._id}">Editar cadastro</button>${okIso(f.nascimento)?`<button class="btn sec" data-act="rh-cartao" data-id="${f._id}">🎉 Cartão de aniversário</button>`:''}</div></aside>
        <section class="card rh-pfh"><div class="eyebrow">A HISTÓRIA ${f.tipo==='PJ'?'DO PJ':'NA COLAFIX'}</div>
          ${falt.length?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);margin:12px 0 0">Admissão: falta ${esc(falt.join(', '))} · <button class="lnk" data-act="rh-admabrir" data-id="${f._id}">abrir a admissão</button></div>`:''}
          ${ev.length?`<div class="rh-tl">${ev.slice(0,14).map((x,i)=>`<div class="rh-tli"><b class="num">${br(x.d)}</b><span class="rh-tld"><i style="background:${cor[x.c]||cor.teal}"></i>${i<Math.min(ev.length,14)-1?'<em></em>':''}</span><div><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</div></div>`).join('')}</div>`:'<div class="empty">Ainda nada registrado.</div>'}</section>
        <div class="rh-pfr">
          ${sf?`<section class="card"><div class="rh-ch"><h2>Férias</h2><span class="pill ${sf.c}">${esc(p&&p.completo&&p.saldo?'faltam '+plural(p.saldo,'dia','dias'):sf.t)}</span></div>
            ${p?`<div class="rh-bt" style="margin:12px 0 6px" title="${usados} de 30 dias"><i style="width:${(usados/30*100).toFixed(1)}%"></i></div><div class="sub" style="margin:0;font-size:13px">Período ${br(p.ini)} a ${br(p.fim)}${p.completo?' · dar até '+br(p.lim):' · em aquisição'}</div>`:''}
            <div class="rh-pfb" style="margin-top:12px">${p&&f.status!=='Desligado'?`<button class="btn sec" data-act="rh-fernova" data-id="${f._id}" data-go-fer="1">Marcar férias</button>`:''}${okIso(f.admissao)?`<button class="lnk" data-act="rh-fajabrir" data-id="${f._id}" data-go-fer="1">Ajustar períodos</button>`:''}</div></section>`:''}
          ${pj?`<section class="card"><div class="rh-ch"><h2>Troca do PJ</h2><span class="pill ${pj.c}">${esc(pj.t)}</span></div>${pj.prox?`<div class="sub" style="margin:8px 0 0">Próxima troca: <b>${br(pj.prox)}</b></div>`:''}<div style="margin-top:10px"><button class="lnk" data-act="rh-pzabrir" data-v="pj">Abrir a troca dos PJ</button></div></section>`:''}
          ${e?`<section class="card"><div class="rh-ch"><h2>Experiência</h2><span class="pill ${e.c}">${esc(e.t)}</span></div><div class="sub" style="margin:8px 0 0">1ª etapa até ${br(e.f1)} · 2ª até ${br(e.f2)}</div><div class="rh-pfb" style="margin-top:10px">${e.etapa===1?`<button class="btn sec rh-sm" data-act="rh-expprorr" data-id="${f._id}">Prorrogar</button>`:''}<button class="btn sec rh-sm" data-act="rh-expefet" data-id="${f._id}">Efetivar</button></div></section>`:''}
          <section class="card"><div class="rh-ch"><h2>EPI e uniforme</h2><span class="pill ${fs.c}">${esc(fs.t)}</span></div>
            ${fc&&((fc.epis||[]).length||(fc.uniformes||[]).length)?`<div class="rh-pfl">${(fc.epis||[]).map(x=>`<div><span>${esc(x.nome)}</span><small>${x.ca?'CA '+esc(x.ca):''}</small></div>`).join('')}${(fc.uniformes||[]).map(x=>`<div><span>${esc(x.nome)}</span><small>uniforme</small></div>`).join('')}</div>`:`<div class="sub" style="margin:8px 0 0">${f.funcao?'A função "'+esc(f.funcao)+'" ainda não tem EPIs cadastrados.':'Sem função no cadastro.'}</div>`}
            <div style="margin-top:8px"><button class="lnk" data-act="rh-fabrir">Abrir as fichas do mês</button></div></section>
          ${cartaoEmp(f)}${cartaoOc(f)}<section class="card">${docsDaPessoa(f._id).replace('class="rh-docs"','class="rh-docs" style="margin:0;padding:0;border:0"')}</section></div></div>`; }
  function buscaPessoas(q){ q=norm(q); const d=dig(q); if(q.length<2) return []; return R.func.filter(f=>norm(f.nome).includes(q)||(d.length>=3&&(dig(f.cpf).includes(d)||(f.cnpj&&dig(f.cnpj).includes(d))))).sort((a,b)=>(a.status==='Desligado')-(b.status==='Desligado')||a.nome.localeCompare(b.nome,'pt-BR')).slice(0,6); }
  function cartaoBusca(){ const xs=buscaPessoas(R.buscaIni);
    return `<section class="card rh-bus"><label class="rh-busl"><span class="label">BUSCAR FUNCIONÁRIO</span><input class="txt" id="rh-bus" placeholder="nome, CPF ou CNPJ" value="${esc(R.buscaIni)}" autocomplete="off"></label>
      ${R.buscaIni.length>=2?(xs.length?`<div class="rh-busr">${xs.map(f=>`<button class="rh-busi" data-act="rh-pess" data-id="${f._id}"><b>${esc(f.nome)}</b><small>${esc([f.funcao,f.setor,f.status==='Desligado'?'desligado':''].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>`:'<div class="sub" style="margin:8px 0 0">Ninguém com esse nome ou CPF.</div>'):''}</section>`; }

  /* ---------- Quadro de admissões e Quem é quem (pedido de 13/10) ---------- */
  function vQuadroAdm(){ const hj=P.hojeStr(), m=fichasMesIni(), lim=addDias(hj,-120), recentes=ativos().filter(f=>f.admRoteiro&&(!okIso(f.admissao)||f.admissao>=lim));
    const contr=f=>R.docs.some(d=>d.funcId===f._id), ficha=f=>['imp','ass'].includes(fSit(f,m).k);
    const docs=recentes.filter(f=>admFaltam(f).length), papel=recentes.filter(f=>!admFaltam(f).length&&(!contr(f)||!ficha(f)));
    const exp=clts().map(f=>({f,e:expInfo(f)})).filter(o=>o.e).sort((a,b)=>a.e.fim.localeCompare(b.e.fim));
    const efet=R.func.filter(f=>f.exp&&f.exp.status==='efetivado'&&String(f.exp.em||'').slice(0,10)>=addDias(hj,-30)).sort((a,b)=>String(b.exp.em).localeCompare(String(a.exp.em)));
    const nome=f=>`<button class="rh-nm" data-act="rh-pess" data-id="${f._id}">${esc(titulo(f.nome))}</button><small>${esc([f.funcao,f.setor].filter(Boolean).join(' · ')||'sem função')}</small>`;
    const col=(t,n,corpo,cls)=>`<section class="rh-kc ${cls||''}"><div class="rh-kh"><b>${t}</b><span>${n}</span></div>${corpo||'<div class="sub" style="margin:4px 0 0;font-size:12.5px">Ninguém nesta etapa.</div>'}</section>`;
    return `<div class="rh-kb">${col('Documentos',docs.length,docs.map(f=>{ const L=docsAdm(), fe=admFeitos(f).filter(n=>L.includes(n)).length, fl=admFaltam(f); return `<article class="rh-kcard">${nome(f)}<div class="rh-bt" style="height:8px;margin:10px 0 6px"><i style="width:${(fe/L.length*100).toFixed(0)}%"></i></div><small>${fe} de ${L.length} · falta ${esc(fl.slice(0,2).join(', '))}${fl.length>2?'…':''}</small><button class="btn sec rh-sm" data-act="rh-admabrir" data-id="${f._id}">Abrir</button></article>`; }).join(''))}
      ${col('Contrato e ficha',papel.length,papel.map(f=>`<article class="rh-kcard">${nome(f)}<small>${contr(f)?'contrato gerado':'falta o contrato'} · ${ficha(f)?'ficha gerada':'falta a ficha de '+mesNome(m)}</small><div class="rh-pfb">${contr(f)?'':`<button class="btn sec rh-sm" data-act="rh-admcontr" data-id="${f._id}">Gerar contrato</button>`}${ficha(f)?'':`<button class="btn sec rh-sm" data-act="rh-fger" data-id="${f._id}">Gerar ficha</button>`}</div></article>`).join(''))}
      ${col('Experiência',exp.length,exp.map(({f,e})=>`<article class="rh-kcard">${nome(f)}<span class="pill ${e.c}" style="align-self:flex-start;margin-top:8px">${esc(e.t)}</span><div class="rh-pfb" style="margin-top:8px">${e.etapa===1?`<button class="btn rh-sm" data-act="rh-expprorr" data-id="${f._id}">Prorrogar</button>`:''}<button class="btn sec rh-sm" data-act="rh-expefet" data-id="${f._id}">Efetivar</button></div></article>`).join(''))}
      ${col('Efetivados (30 dias)',efet.length,efet.map(f=>`<article class="rh-kcard">${nome(f)}<small>efetivado(a) em ${br(String(f.exp.em).slice(0,10))}</small></article>`).join(''),'ok')}</div>`; }
  const vagas=()=>R.cfg.vagas&&typeof R.cfg.vagas==='object'?R.cfg.vagas:{};
  function vOrg(){ const at=ativos(), grupos={}; at.forEach(f=>{ const k=f.setor||'Sem setor'; (grupos[k]=grupos[k]||[]).push(f); });
    const ks=[...new Set(Object.keys(grupos).concat(setoresCad().filter(n=>+vagas()[n]>0)))].sort((a,b)=>(grupos[b]||[]).length-(grupos[a]||[]).length||a.localeCompare(b,'pt-BR'));
    const sel=R.orgSet&&ks.includes(R.orgSet)?R.orgSet:ks[0];
    const av=(f,cls)=>`<span class="rh-av3 ${cls||''}" title="${esc(titulo(f.nome))}">${esc(iniciais(f.nome).toUpperCase())}</span>`;
    const ps=(grupos[sel]||[]).slice().sort((a,b)=>String(a.admissao||'9').localeCompare(String(b.admissao||'9'))), nv=+vagas()[sel]||0;
    return `<div class="rh-org">${ks.map(k=>{ const xs=grupos[k]||[], pj=xs.filter(f=>f.tipo==='PJ').length, ex=xs.filter(f=>expInfo(f)).length, v=+vagas()[k]||0;
        return `<button class="card rh-orgc" data-act="rh-orgset" data-v="${esc(k)}" aria-pressed="${k===sel}"><div class="rh-ch"><b>${esc(k)}</b><span class="num">${xs.length}</span></div><small>${xs.length-pj} CLT${pj?' · '+pj+' PJ':''}${ex?' · '+ex+' em experiência':''}${v?' · '+plural(v,'vaga','vagas'):''}</small><div class="rh-avs">${xs.slice(0,5).map(f=>av(f)).join('')}${xs.length>5?`<span class="rh-av3 mais">+${xs.length-5}</span>`:''}</div></button>`; }).join('')}</div>
      <section class="card"><div class="rh-ch"><h2>${esc(sel||'')}</h2><span class="sub" style="margin:0">toque no nome para abrir o perfil · vagas em Cadastros › Setores</span></div>
        <div class="rh-orgp">${ps.map(f=>{ const e=expInfo(f); return `<button class="rh-orgi ${e?'exp':''}" data-act="rh-pess" data-id="${f._id}">${av(f,e?'exp':'')}<span><b>${esc(titulo(f.nome))}</b><small>${esc(f.funcao||'sem função')} · ${e?'em experiência':okIso(f.admissao)?esc(tempoTxt(f.admissao)):'sem admissão'}${f.tipo==='PJ'?' · PJ':''}</small></span></button>`; }).join('')}${[...Array(nv)].map(()=>'<div class="rh-orgv">vaga aberta</div>').join('')}</div></section>`; }

  /* ---------- Admissão em um passo ---------- */
  const DOCS_ADM_PADRAO=['RG','CPF','Carteira de trabalho (CTPS)','Título de eleitor','Comprovante de residência','Certidão de nascimento ou casamento','Foto 3x4','Dados bancários','ASO admissional'];
  const docsAdm=()=>Array.isArray(R.cfg.docsAdmissao)&&R.cfg.docsAdmissao.length?R.cfg.docsAdmissao:DOCS_ADM_PADRAO;
  const admFeitos=f=>(f.admEntregues||[]).map(x=>x.nome);
  const admFaltam=f=>f.admRoteiro&&f.status!=='Desligado'?docsAdm().filter(n=>!admFeitos(f).includes(n)):[];
  function vAdm(){ const g=R.adm, f=R.func.find(x=>x._id===g.id); if(!f) return '<section class="card rh-form"><div class="empty">Salvando o cadastro…</div></section>';
    const lista=docsAdm(), feitos=admFeitos(f), m=P.hojeStr().slice(0,7), fs=fSit(f,m), contrato=R.docs.some(d=>d.funcId===f._id), passo=(n,t,ok,corpo)=>`<div class="rh-ap ${ok?'ok':''}"><span class="rh-apn">${ok?'✓':n}</span><div><b>${t}</b>${corpo}</div></div>`;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><div><div class="eyebrow">NOVA ADMISSÃO</div><h2 style="margin:2px 0 0">${esc(f.nome)}</h2></div><button class="lnk" data-act="rh-admx">Fechar</button></div>
      ${passo(1,'Cadastro',true,`<small>${esc([f.funcao,f.setor,f.tipo==='PJ'?'PJ':'CLT',okIso(f.admissao)?'admissão '+br(f.admissao):''].filter(Boolean).join(' · '))} · <button class="lnk" data-act="rh-ed" data-id="${f._id}">editar</button></small>`)}
      ${passo(2,'Documentos entregues · '+feitos.filter(n=>lista.includes(n)).length+' de '+lista.length,lista.every(n=>feitos.includes(n)),`<div class="rh-adoc">${lista.map(n=>`<label class="ck"><input type="checkbox" data-rh-admdoc="${esc(n)}" ${feitos.includes(n)?'checked':''}> ${esc(n)}</label>`).join('')}</div>
        ${g.editar?`<label style="display:block;margin-top:8px"><span class="label">Lista de documentos (um por linha · vale para as próximas admissões)</span><textarea class="txt" id="rh-admlista" rows="6">${esc(lista.join('\n'))}</textarea></label><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px"><button class="btn sec rh-sm" data-act="rh-admlx">Cancelar</button><button class="btn rh-sm" data-act="rh-admls">Salvar lista</button></div>`:`<button class="lnk" data-act="rh-adml" style="font-size:12.5px">mudar a lista de documentos</button>`}`)}
      ${passo(3,f.tipo==='PJ'?'Contrato de prestação de serviço':'Contrato de experiência',contrato,`<small>${contrato?'gerado · ':''}<button class="lnk" data-act="rh-admcontr" data-id="${f._id}">${contrato?'gerar de novo':'Gerar contrato'}</button></small>`)}
      ${passo(4,'Ficha de EPI e uniforme de '+mesNome(m),fs.k==='imp'||fs.k==='ass',`<small>${esc(fs.t)} · ${fs.k==='semepi'?`<button class="lnk" data-act="rh-fsemepi" data-n="${esc(f.funcao||'')}" data-f="${f._id}">cadastrar os EPIs da função</button>`:`<button class="lnk" data-act="rh-fger" data-id="${f._id}">Gerar a ficha</button>`}</small>`)}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-pess" data-id="${f._id}">Ver a ficha da pessoa</button><button class="btn" data-act="rh-admx">Concluir</button></div></section>`; }

  /* ---------- Documentos em lote ---------- */
  const ferProx=f=>{ const hj=P.hojeStr(), xs=ferDe(f).filter(x=>!x.anterior&&x.fim>=hj).sort((a,b)=>a.inicio.localeCompare(b.inicio)); return xs[0]||null; };
  function loteProblemas(md,xs){ const usa=camposDe(md.html), usaFer=usa.some(k=>CAMPOS_FER.includes(k)), LBL={salario:'salário',jornada:'jornada',funcao:'função',setor:'setor',admissao:'admissão',telefone:'telefone'};
    return xs.map(f=>{ const p=[...new Set(usa.filter(k=>FALTA_CAMPO[k]&&!(f[FALTA_CAMPO[k]]!=null&&f[FALTA_CAMPO[k]]!=='')).map(k=>LBL[FALTA_CAMPO[k]]))]; if(usaFer&&!ferProx(f)) p.push('férias marcadas'); return {f,p}; }).filter(o=>o.p.length); }
  function vDocLote(){ const G=R.dg, sel=new Set(G.sel||[]), ms=R.modelos.slice().sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    if(!ms.length) return `<section class="card"><div class="empty">Primeiro cadastre um modelo em <button class="lnk" data-act="rh-dv" data-v="modelos">Modelos</button>.</div></section>`;
    if(!ms.some(m=>m._id===G.modeloId)) G.modeloId=ms[0]._id; const md=ms.find(m=>m._id===G.modeloId);
    const todos=ativos().slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')), vis=todos.filter(f=>(!G.lsetor||(f.setor||'Sem setor')===G.lsetor)&&valePara(md,f));
    const xs=todos.filter(f=>sel.has(f._id)), probs=loteProblemas(md,xs), qs=perguntasDe(md.html), desl=modeloDesliga(md), semResp=qs.filter(q=>!String(G.resp[q]||'').trim());
    const pode=xs.length&&!probs.length&&!desl;
    const setores=[...new Set(todos.map(f=>f.setor||'Sem setor'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const f0=xs[0];
    return `<div class="rh-gg"><section class="card"><h2>Várias pessoas</h2>
        <label class="rh-lb"><span class="label">Modelo</span><select class="txt" id="rh-lm">${ms.map(m=>`<option value="${m._id}" ${G.modeloId===m._id?'selected':''}>${esc(m.nome)}</option>`).join('')}</select></label>
        ${desl?'<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);margin:0 0 10px">Este modelo desliga o funcionário: gere um por vez, em "Uma pessoa".</div>':''}
        <label class="rh-lb"><span class="label">Setor</span><select class="txt" id="rh-ls"><option value="">Todos os setores</option>${setores.map(s=>`<option ${G.lsetor===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
        <div class="rh-ch" style="margin:4px 0 4px"><span class="label">${xs.length} escolhido${xs.length===1?'':'s'}</span><span><button class="lnk" data-act="rh-ltodos">marcar os ${vis.length}</button> · <button class="lnk" data-act="rh-llimpa">limpar</button></span></div>
        <div class="rh-lsel">${vis.length?vis.map(f=>`<label class="ck"><input type="checkbox" data-rh-lf="${f._id}" ${sel.has(f._id)?'checked':''}> ${esc(f.nome)} <small style="color:var(--muted)">${esc(f.setor||'')}</small></label>`).join(''):'<div class="sub" style="margin:0">Ninguém neste setor para este modelo.</div>'}</div>
        ${qs.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:6px">Perguntas (valem para todos)</div>${qs.map((q,i)=>`<label class="rh-lb"><span>${esc(q)}</span><input class="txt rh-amar" data-rh-dq="${i}" ${qData(q)?'type="date"':''} value="${esc(G.resp[q]||'')}"></label>`).join('')}`:''}
        ${probs.length?`<div class="banner" style="background:var(--crit-tint);color:var(--crit-ink);margin:10px 0 0"><b>Complete antes:</b> ${probs.map(o=>`<button class="lnk" data-act="rh-ed" data-go-func="1" data-id="${o.f._id}" style="color:inherit">${esc(o.f.nome)}</button> (${esc(o.p.join(', '))})`).join(' · ')}</div>`:''}
        <div class="rh-dbt"><button class="btn" data-act="rh-lgo" data-v="imprimir" ${pode?'':'disabled'}>Imprimir ${xs.length||''}</button><button class="btn sec" data-act="rh-lgo" data-v="pdf" ${pode?'':'disabled'}>Salvar PDF</button><button class="btn sec" data-act="rh-lgo" data-v="word" ${pode?'':'disabled'}>Baixar em Word</button></div>
        <div class="sub" style="font-size:12.5px;margin:10px 0 0">Sai um documento por pessoa, cada um numa página, e fica no histórico de cada uma.${semResp.length?' Responda as perguntas antes.':''}</div></section>
      <section class="rh-page rh-pageg" aria-label="Documento">${f0?montar(md.html||'',valores(f0,{},ferProx(f0)),true,G.resp)+assinaturas(f0)+(xs.length>1?`<div class="sub" style="margin:22px 0 0;font-family:'Segoe UI',sans-serif">e mais ${plural(xs.length-1,'documento','documentos')}, um para cada pessoa escolhida.</div>`:''):'<div class="empty">Marque as pessoas para ver o documento.</div>'}</section></div>`; }
  const partesLote=(md,xs)=>xs.map(f=>montar(md.html,valores(f,{},ferProx(f)),false,R.dg.resp)+assinaturas(f));

  /* ---------- Planilha de carga inicial ---------- */
  const CARGA=[['id','Código (não mexer)'],['nome','Nome'],['cpf','CPF'],['tipo','Vínculo'],['empresa','Empresa (PJ)'],['cnpj','CNPJ (PJ)'],['funcao','Função'],['setor','Setor'],['admissao','Admissão'],['nascimento','Nascimento'],['salario','Salário'],['jornada','Jornada'],
    ['telefone','Telefone'],['camisa','Camisa'],['calca','Calça'],['calcado','Calçado'],['ultimaTroca','PJ: data da última troca'],['ferAte','Férias tiradas até o período que terminou em'],['exp','Experiência (prorrogado ou efetivado)']];
  const CARGA_FIXO=['id','nome','cpf','tipo','empresa','cnpj'], CARGA_DATA=['admissao','nascimento','ultimaTroca','ferAte'];
  function cargaLinhas(){ return [CARGA.map(c=>c[1])].concat(R.func.filter(f=>f.status!=='Desligado').sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(f=>CARGA.map(([k])=>k==='id'?f._id:k==='cpf'?fCPF(f.cpf):k==='tipo'?(f.tipo==='PJ'?'PJ':'CLT'):k==='empresa'?(f.tipo==='PJ'?(f.empresa||''):''):k==='cnpj'?(f.tipo==='PJ'&&f.cnpj?fCNPJ(f.cnpj):''):k==='salario'?(f.salario!==''&&f.salario!=null?brl(f.salario).replace('R$ ',''):''):CARGA_DATA.includes(k)?br(f[k]||''):k==='exp'?(f.exp&&['prorrogado','efetivado'].includes(f.exp.status)?f.exp.status:''):(f[k]||'')))); }
  async function cargaBaixar(){ const L=cargaLinhas(); try{ if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }catch(e){}
    if(window.XLSX&&window.XLSX.utils){ const ws=XLSX.utils.aoa_to_sheet(L); ws['!cols']=CARGA.map(([k])=>({wch:k==='id'?16:k==='nome'?32:k==='ferAte'?22:16})); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Funcionários');
      const ins=XLSX.utils.aoa_to_sheet([['Como preencher'],['Preencha só o que falta. Datas como 10/03/2024. Salário como 2.150,00.'],['Não mude a coluna "Código". De quem já está no painel, nome, CPF e vínculo não são alterados pela planilha.'],['Pessoa nova: escreva numa linha nova, sem código, com Nome, Vínculo (CLT ou PJ) e o documento: CLT com CPF; PJ com CNPJ na coluna "CNPJ (PJ)". CLT é sempre Colafix; PJ: escreva Zenith ou Nexus em Empresa (PJ).'],['Férias: a data em que terminou o último período aquisitivo já tirado (ex.: 09/03/2025). Os períodos até essa data ficam como "já tirados".'],['Experiência: escreva prorrogado ou efetivado, se for o caso.'],['PJ: data da última troca. A próxima fica 3 meses depois.']]); ins['!cols']=[{wch:110}]; XLSX.utils.book_append_sheet(wb,ins,'Como preencher');
      baixar(new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Carga-RH-Colafix.xlsx'); return; }
    baixar(new Blob(['\ufeff'+L.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv'}),'Carga-RH-Colafix.csv'); }
  function csvLinhas(t){ const sep=(t.split(/\r?\n/)[0].match(/;/g)||[]).length>=(t.split(/\r?\n/)[0].match(/,/g)||[]).length?';':','; const out=[]; let row=[],cel='',q=false;
    for(let i=0;i<t.length;i++){ const c=t[i]; if(q){ if(c==='"'){ if(t[i+1]==='"'){ cel+='"'; i++; } else q=false; } else cel+=c; }
      else if(c==='"') q=true; else if(c===sep){ row.push(cel); cel=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n') i++; row.push(cel); out.push(row); row=[]; cel=''; } else cel+=c; }
    if(cel||row.length){ row.push(cel); out.push(row); } return out.map(r=>r.map(x=>x.replace(/^\ufeff/,'').trim())); }
  /* datas do Excel chegam como número de dias desde 30/12/1899 (sem fuso horário); texto dd/mm/aaaa também vale */
  function dataCel(v){ if(v==null||v==='') return {v:''}; if(typeof v==='number'&&isFinite(v)&&v>0) return {v:isoD(new Date(Date.UTC(1899,11,30+Math.round(v),12)))};
    if(v instanceof Date&&!isNaN(v)) return {v:isoD(new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate(),12)))}; const s=String(v).trim(); if(!s) return {v:''};
    let m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if(m){ const y=m[3].length===2?'20'+m[3]:m[3], r=y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'); const d=new Date(r+'T12:00:00Z'); if(!isNaN(d)&&isoD(d)===r) return {v:r}; return {erro:s}; }
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m) return {v:s}; if(/^\d{5}$/.test(s)){ const d=new Date(Date.UTC(1899,11,30+(+s),12)); return {v:isoD(d)}; } return {erro:s}; }
  async function cargaLer(file){ let rows; if(/\.csv$/i.test(file.name)) rows=csvLinhas(await file.text());
    else { if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); const abas=wb.SheetNames.map(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''})); rows=abas.find(rs=>rs.slice(0,15).some(r=>r.some(c=>norm(c)==='NOME')&&r.some(c=>norm(c)==='CPF')))||abas[0]; }
    const hi=rows.findIndex(r=>r.some(c=>norm(c)==='NOME')&&r.some(c=>norm(c)==='CPF')); if(hi<0) throw new Error('Não achei as colunas Nome e CPF. Use a planilha baixada aqui.');
    const H=rows[hi].map(norm), col={}; CARGA.forEach(([k,l])=>{ col[k]=H.indexOf(norm(l)); });
    /* planilha do EPI (aba Base Colaboradores): Tipo = vínculo, Empresa, Data de admissão */ const alt={tipo:['TIPO'],empresa:['EMPRESA'],admissao:['DATA DE ADMISSAO']}; Object.keys(alt).forEach(k=>{ if(col[k]<0) col[k]=H.findIndex(h=>alt[k].includes(h)); });
    const linhas=[], nao=[], cpfsNovos=new Set(); let nmud=0, nfer=0;
    rows.slice(hi+1).forEach(r=>{ const cel=k=>col[k]>=0?r[col[k]]:''; if(!String(cel('nome')||'').trim()&&!String(cel('cpf')||'').trim()) return;
      const cnpjCel=dig(cel('cnpj'))||(dig(cel('cpf')).length===14?dig(cel('cpf')):'');
      let f=R.func.find(x=>x._id===String(cel('id')).trim())||R.func.find(x=>dig(x.cpf)&&dig(x.cpf)===dig(cel('cpf')))||(cnpjCel?R.func.find(x=>dig(x.cnpj)&&dig(x.cnpj)===cnpjCel):null), novo=false;
      if(!f){ const nome=String(cel('nome')||'').trim().replace(/\s+/g,' ').toUpperCase(), tipo=norm(cel('tipo'))==='PJ'?'PJ':'CLT', cpf=tipo==='PJ'&&dig(cel('cpf')).length===14?'':dig(cel('cpf'));
        const pjCpf=tipo==='PJ'&&!cnpjCel&&cpfOk(cpf); /* PJ que veio só com CPF (sem CNPJ na planilha): entra e o RH completa o CNPJ depois */
        const docOk=tipo==='PJ'?(cnpjOk(cnpjCel)||pjCpf):cpfOk(cpf), chave=tipo==='PJ'&&!pjCpf?'J'+cnpjCel:'F'+cpf, rot=tipo==='PJ'?'CNPJ':'CPF';
        if(!nome||!docOk||cpfsNovos.has(chave)){ nao.push((nome||'sem nome')+(!docOk?' ('+rot+' inválido)':' ('+rot+' repetido)')); return; } cpfsNovos.add(chave);
        f={_id:null,nome,cpf:tipo==='PJ'&&!cpfOk(cpf)?'':cpf,cnpj:tipo==='PJ'?cnpjCel:'',tipo,empresa:empPadrao(tipo,cel('empresa')),status:'Ativo'}; novo=true; }
      const up={}, mud=novo?['Pessoa nova ('+f.tipo+(f.tipo==='PJ'&&f.empresa?' · '+f.empresa:'')+')'+(f.tipo==='PJ'&&!f.cnpj?' — sem CNPJ, só CPF':'')]:[], erros=[]; let ferAte='';
      if(!novo&&f.tipo==='PJ'&&cnpjCel&&cnpjCel!==dig(f.cnpj)){ if(cnpjOk(cnpjCel)){ up.cnpj=cnpjCel; mud.push('CNPJ'); } else erros.push('CNPJ inválido'); }
      if(novo&&f.tipo==='PJ'&&!f.empresa) erros.push('PJ sem empresa (Zenith ou Nexus)');
      CARGA.forEach(([k,l])=>{ if(CARGA_FIXO.includes(k)) return; const raw=cel(k); if(raw==null||String(raw).trim()==='') return;
        if(CARGA_DATA.includes(k)){ const d=dataCel(raw); if(d.erro){ erros.push(l+': '+d.erro); return; } if(k==='ferAte'){ ferAte=d.v; return; } if(k==='ultimaTroca'&&f.tipo!=='PJ') return; if(d.v!==(f[k]||'')){ up[k]=d.v; mud.push(l); } return; }
        if(k==='salario'){ const n=typeof raw==='number'?raw:numBR(raw); if(n==null){ erros.push('Salário: '+raw); return; } if(n!==f.salario){ up.salario=n; mud.push(l); } return; }
        if(k==='exp'){ const s=norm(raw); const st=/PRORROG/.test(s)?'prorrogado':/EFETIV/.test(s)?'efetivado':''; if(!st){ erros.push(l+': '+raw); return; } if(f.tipo!=='PJ'&&(!f.exp||f.exp.status!==st)){ up.exp={status:st,em:agora(),porNome:eu()}; mud.push('Experiência: '+st); } return; }
        const v=String(raw).trim(); if(v!==String(f[k]||'')){ up[k]=v; mud.push(l); } });
      if(ferAte&&f.tipo!=='PJ'){ const adm=up.admissao||f.admissao; const ps=okIso(adm)?periodos(Object.assign({},f,{admissao:adm})).filter(p=>p.completo&&p.saldo>0&&p.fim<=ferAte):[]; if(ps.length){ mud.push('Férias: '+plural(ps.length,'período tirado','períodos tirados')); nfer+=ps.length; } linhas.push({f,up,mud,erros,fer:ps,novo}); }
      else linhas.push({f,up,mud,erros,fer:[],novo});
      nmud+=Object.keys(up).length; });
    return {linhas:linhas.filter(o=>o.mud.length||o.erros.length),nao,nmud,nfer,lidas:linhas.length,novos:linhas.filter(o=>o.novo).length}; }
  function vCarga(){ const g=R.carga, p=g.prev;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><div><div class="eyebrow">IMPORTAR PLANILHA</div><h2 style="margin:2px 0 0">Cadastrar e completar por planilha</h2></div><button class="lnk" data-act="rh-cargax">Fechar</button></div>
      <div class="rh-ap"><span class="rh-apn">1</span><div><b>Baixe a planilha</b><small>Já vem com quem está no painel. Complete os dados e acrescente as pessoas novas em linhas no final (Nome, CPF e Vínculo são obrigatórios).</small><div style="margin-top:6px"><button class="btn sec rh-sm" data-act="rh-cargabaixar">Baixar planilha (Excel)</button></div></div></div>
      <div class="rh-ap"><span class="rh-apn">2</span><div><b>Envie a planilha preenchida</b><small>O painel mostra quem é novo e o que vai mudar antes de gravar. Só o que está preenchido muda; nada é apagado.</small><div style="margin-top:6px"><label class="btn sec rh-sm" style="cursor:pointer">Escolher arquivo<input type="file" id="rh-cargaf" accept=".xlsx,.xls,.csv" hidden></label></div></div></div>
      ${p?`<div class="rh-sep"></div><div class="rh-ch"><b>${p.novos?plural(p.novos,'pessoa nova','pessoas novas')+' · ':''}${p.linhas.filter(o=>!o.novo&&o.mud.length).length} com alterações · ${p.lidas} lida(s)</b>${p.nao.length?`<span class="pill warn">${p.nao.length} com problema</span>`:''}</div>
        ${p.nao.length?`<div class="sub" style="margin:0 0 8px;font-size:12.5px">Não vão entrar (confira nome e CPF): ${esc(p.nao.slice(0,8).join(', '))}${p.nao.length>8?'…':''}</div>`:''}
        ${p.linhas.length?`<div class="rh-tw" style="max-height:340px;overflow:auto"><table class="rh-t"><thead><tr><th>Funcionário</th><th>O que muda</th><th>Problemas</th></tr></thead><tbody>${p.linhas.map(o=>`<tr><td><b>${esc(o.f.nome)}</b>${o.novo?' <span class="pill teal">novo</span>':''}</td><td>${esc(o.mud.join(', ')||'—')}</td><td style="color:var(--crit-ink)">${esc(o.erros.join(' · '))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="sub">Nada para mudar.</div>'}
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn" data-act="rh-cargaok" ${p.linhas.some(o=>o.mud.length)&&!R.salv?'':'disabled'}>Gravar as alterações</button></div>`:''}</section>`; }
  async function cargaAplicar(){ const p=R.carga.prev; let n=0, nf=0, nn=0;
    for(const o of p.linhas){ if(o.novo){ const nid=id(); await grava(COL.func+'/'+nid,Object.assign({nome:o.f.nome,cpf:o.f.cpf,cnpj:o.f.cnpj||'',tipo:o.f.tipo,empresa:o.f.empresa,status:'Ativo',criadoEm:agora(),criadoPor:P.S.uid||null,origem:'planilha'},o.up)); o.f._id=nid; o.f.nome=o.f.nome; nn++; }
      else if(Object.keys(o.up).length){ await grava(COL.func+'/'+o.f._id,Object.assign({},o.up)); n++; }
      for(const per of o.fer){ await P.db().doc(COL.ferias+'/'+id()).set({funcId:o.f._id,funcionario:o.f.nome,aquisitivo:per.ini,aquisitivoFim:per.fim,dias:per.saldo,anterior:true,status:'tirada',origem:'carga',em:agora(),por:P.S.uid||null,porNome:eu()}); nf++; } }
    return {n,nf,nn}; }

  /* ===================== MAIS IDEIAS DO RH (13/10) =====================
     Ocorrências e advertências · itens emprestados · perguntas rápidas no Início · feriados · ficha de admissão pelo celular */
  Object.assign(COL,{oc:'rh/dados/ocorrencias',emp:'rh/dados/emprestimos',conv:'rh/dados/convites',fcand:'rh/dados/fichascand',fcarq:'rh/dados/fichascandarq'});
  Object.assign(R,{oc:[],emp:[],fcand:[],conv:[],foc:null,femp:null,perg:null,convM:null,ferAno:+P.hojeStr().slice(0,4)});
  function iniciarMais(){ const sub=(k,mk)=>P.inscrever('rh-'+k,mk,snap=>{ R[k]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); R.lido[k]=true; P.rerender(); });
    sub('oc',()=>P.db().collection(COL.oc).orderBy('data','desc').limit(1000)); sub('emp',()=>P.db().collection(COL.emp).limit(1000));
    sub('fcand',()=>P.db().collection(COL.fcand).orderBy('em','desc').limit(30)); sub('conv',()=>P.db().collection(COL.conv).orderBy('criado','desc').limit(40)); }

  /* ---------- Ocorrências e advertências (só o RH vê) ---------- */
  const OC_TIPOS=['Ocorrência (só anotação)','Advertência verbal','Advertência escrita','Suspensão','Elogio'];
  const ocDe=fid=>R.oc.filter(x=>x.funcId===fid&&!x.removido).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const ocCor=t=>/SUSPENS/.test(norm(t))?'crit':/ADVERT/.test(norm(t))?'warn':/ELOGIO/.test(norm(t))?'ok':'neu';
  const ocPedeDoc=t=>/ADVERT|SUSPENS/.test(norm(t));
  function ocVals(f){ const x=!f._id?{data:'2026-11-05',tipo:'Advertência escrita',motivo:'Chegou atrasado três vezes na semana sem avisar.',testemunhas:'João da Silva',dias:''}:(R.oc.find(o=>o._id===R.dg.ocId&&o.funcId===f._id)||ocDe(f._id)[0]||null);
    return {OCORRENCIA_DATA:x?br(x.data):'',OCORRENCIA_TIPO:x?x.tipo||'':'',OCORRENCIA_MOTIVO:x?x.motivo||'':'',OCORRENCIA_TESTEMUNHAS:x?x.testemunhas||'':'',SUSPENSAO_DIAS:x&&x.dias?String(x.dias):''}; }
  function cartaoOc(f){ const xs=ocDe(f._id), g=R.foc&&R.foc.funcId===f._id?R.foc:null;
    return `<section class="card rh-occ"><div class="rh-ch"><h2>Ocorrências</h2><span class="sub" style="margin:0;font-size:12px">só o RH vê</span></div>
      ${xs.length?xs.slice(0,6).map(x=>{ const gd=R.docs.some(d=>d.ocId===x._id); return `<div class="rh-dl"><div><b><span class="pill ${ocCor(x.tipo)}" style="margin-right:6px">${esc(x.tipo)}</span>${br(x.data)}</b><small>${esc(x.motivo||'')}${x.dias?' · '+plural(+x.dias,'dia','dias'):''}${x.testemunhas?' · testemunha: '+esc(x.testemunhas):''}${gd?' · documento gerado':''}</small></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end">${ocPedeDoc(x.tipo)?`<button class="lnk" data-act="rh-ocdoc" data-id="${x._id}">${gd?'Gerar de novo':'Gerar documento'}</button>`:''}<button class="lnk" data-act="rh-ocrem" data-id="${x._id}" style="color:var(--crit-ink)">Tirar</button></div></div>`; }).join('')+(xs.length>6?`<div class="sub" style="margin:6px 0 0;font-size:12.5px">e mais ${xs.length-6} na história</div>`:'')
        :(g?'':'<div class="sub" style="margin:6px 0 0">Nenhuma ocorrência.</div>')}
      ${g?`<div class="rh-sep"></div><div class="rh-g"><label><span class="label">Data</span><input class="txt" type="date" id="rh-ocd" value="${esc(g.data)}"></label>
          <label><span class="label">Tipo</span><select class="txt" id="rh-oct">${OC_TIPOS.map(t=>`<option ${g.tipo===t?'selected':''}>${t}</option>`).join('')}</select></label>
          <label><span class="label">Dias (se for suspensão)</span><input class="txt" type="number" min="1" max="30" id="rh-ocn" value="${esc(g.dias||'')}"></label></div>
        <label style="display:block;margin-top:10px"><span class="label">O que aconteceu</span><textarea class="txt" id="rh-ocm" rows="3">${esc(g.motivo||'')}</textarea></label>
        <label style="display:block;margin-top:10px"><span class="label">Testemunhas</span><input class="txt" id="rh-ocw" value="${esc(g.testemunhas||'')}" placeholder="nome de quem viu (opcional)"></label>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px"><button class="btn sec rh-sm" data-act="rh-ocx">Cancelar</button><button class="btn rh-sm" data-act="rh-ocsalvar" ${R.salv?'disabled':''}>Salvar ocorrência</button></div>`
        :`<div style="margin-top:10px"><button class="btn sec rh-sm" data-act="rh-ocnova" data-id="${f._id}">Registrar ocorrência</button></div>`}</section>`; }

  /* ---------- Itens emprestados (armário, chave, rádio…): lembrete no desligamento ---------- */
  const EMP_ITENS=['Armário','Chave','Rádio','Ferramenta','Celular da empresa','Crachá','Cartão de acesso','Notebook'];
  const empDe=fid=>R.emp.filter(x=>x.funcId===fid&&!x.removido).sort((a,b)=>String(b.desde||b.em).localeCompare(String(a.desde||a.em)));
  const empPend=fid=>empDe(fid).filter(x=>!x.devolvido);
  const empTxt=x=>x.item+(x.obs?' ('+x.obs+')':'');
  function cartaoEmp(f){ const xs=empDe(f._id), pend=xs.filter(x=>!x.devolvido), dev=xs.filter(x=>x.devolvido), g=R.femp&&R.femp.funcId===f._id?R.femp:null;
    return `<section class="card rh-empc"><div class="rh-ch"><h2>Itens emprestados</h2>${pend.length?`<span class="pill warn">${plural(pend.length,'item','itens')} com a pessoa</span>`:''}</div>
      ${pend.map(x=>`<div class="rh-dl"><div><b>${esc(empTxt(x))}</b><small>desde ${br(String(x.desde||x.em).slice(0,10))}</small></div><button class="lnk" data-act="rh-empdev" data-id="${x._id}">Devolveu</button></div>`).join('')}
      ${!pend.length&&!g?'<div class="sub" style="margin:6px 0 0">Nada com a pessoa.</div>':''}
      ${dev.length?`<details><summary class="sub" style="margin:8px 0 0;font-size:12.5px;cursor:pointer">${plural(dev.length,'item devolvido','itens devolvidos')}</summary>${dev.map(x=>`<div class="sub" style="margin:4px 0 0;font-size:12.5px">${esc(empTxt(x))} · devolvido em ${br(x.devolvido)}</div>`).join('')}</details>`:''}
      ${g?`<div class="rh-sep"></div><div class="rh-g"><label><span class="label">Item</span><input class="txt" id="rh-empi" list="rh-empl" value="${esc(g.item||'')}" placeholder="ex.: Armário"><datalist id="rh-empl">${EMP_ITENS.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
          <label><span class="label">Qual (número, patrimônio)</span><input class="txt" id="rh-empo" value="${esc(g.obs||'')}" placeholder="ex.: nº 12"></label>
          <label><span class="label">Desde</span><input class="txt" type="date" id="rh-empd" value="${esc(g.desde)}"></label></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px"><button class="btn sec rh-sm" data-act="rh-empx">Cancelar</button><button class="btn rh-sm" data-act="rh-empsalvar" ${R.salv?'disabled':''}>Salvar</button></div>`
        :`<div style="margin-top:10px"><button class="btn sec rh-sm" data-act="rh-empnovo" data-id="${f._id}">Emprestar item</button></div>`}</section>`; }
  /* no desligamento: o que a pessoa precisa devolver */
  function deslDevolver(f){ const xs=empPend(f._id); if(!xs.length) return '';
    return `<div class="banner rh-devb" style="background:var(--warn-tint);color:var(--warn-ink);margin:12px 0 0"><b>Antes de sair, precisa devolver:</b>${xs.map(x=>`<div class="rh-devi"><span>${esc(empTxt(x))}</span><button class="lnk" data-act="rh-empdev" data-id="${x._id}">Devolveu</button></div>`).join('')}</div>`; }
  function avisosMais(){ const av=[], hj=P.hojeStr();
    R.func.filter(f=>(f.status==='Desligado'&&okIso(f.desligamento)&&f.desligamento>=addDias(hj,-120))||(f.desligAgendado&&okIso(f.desligamento)&&f.desligamento<=addDias(hj,PZ_AVISO()))).forEach(f=>{ const xs=empPend(f._id); if(!xs.length) return; const saiu=f.status==='Desligado';
      av.push({c:saiu?'crit':'warn',r:'Devolver',t:'Itens com '+f.nome,s:(saiu?'saiu em ':'sai em ')+br(f.desligamento).slice(0,5)+' · '+xs.map(empTxt).join(', '),act:`data-act="rh-pess" data-id="${f._id}"`,l:'Abrir'}); });
    R.fcand.filter(x=>!x.usada).forEach(x=>av.push({c:'warn',r:'Nova',t:'Ficha preenchida pelo celular: '+(x.nome||''),s:'chegou em '+dmIso(x.em)+(x.fotos?' · '+plural(+x.fotos,'foto','fotos')+' de documentos':''),act:`data-act="rh-fcver" data-id="${x._id}"`,l:'Ver'}));
    return av; }

  /* ---------- Feriados (nacionais calculados pelo painel + os cadastrados aqui; valem para o RH e para a produção) ---------- */
  const FER_TIPOS=[['municipal','Municipal (Cachoeirinha)'],['empresa','Ponte / folga da empresa'],['estadual','Estadual'],['outro','Outro']];
  const ferTipoNome=t=>({nacional:'Nacional',estadual:'Estadual',municipal:'Municipal',empresa:'Ponte da empresa',outro:'Outro'})[t]||'Feriado';
  const ferAno=y=>P.feriadosAno?P.feriadosAno(y):[], feriadoDe=iso=>P.feriadoDe?P.feriadoDe(iso):null;
  async function ferSalvar(up){ const c=Object.assign({lista:[],tirados:[]},P.ferCal?P.ferCal():{}); Object.assign(c,up);
    await P.db().doc('config/feriados').set({lista:c.lista,tirados:c.tirados,alteradoEm:agora(),alteradoNome:eu()},{merge:true}); }
  function vFeriados(){ const y=R.ferAno, xs=ferAno(y), C=P.ferCal?P.ferCal():{}, tir=(C.tirados||[]).filter(d=>d.slice(0,4)===String(y)), nac=(P.ferNac?P.ferNac(y):[]).filter(x=>tir.includes(x.data));
    const calc=new Set((P.ferNac?P.ferNac(y):[]).map(x=>x.data)), sug=(P.ferSug?P.ferSug(y):[]).filter(s=>!xs.some(x=>x.data===s.data)), hj=P.hojeStr();
    return cadTopo('Feriados','Feriados e folgas da empresa. Valem para o RH (agenda, férias) e para a programação da produção (dias úteis).','')
      +`<section class="card"><div class="rh-ch"><div style="display:flex;gap:10px;align-items:center"><button class="btn sec rh-sm" data-act="rh-feran" data-v="-1" aria-label="Ano anterior">‹</button><h2 style="margin:0" class="num">${y}</h2><button class="btn sec rh-sm" data-act="rh-feran" data-v="1" aria-label="Próximo ano">›</button></div><span class="sub" style="margin:0">${plural(xs.length,'feriado','feriados')}</span></div>
        <div style="margin-top:10px">${xs.map(x=>{ const d=dU(x.data); return `<div class="row rh-ferl ${x.data<hj?'pass':''}" style="grid-template-columns:110px minmax(0,1fr) auto auto;align-items:center"><span class="num"><b>${br(x.data).slice(0,5)}</b> <small style="color:var(--muted)">${DIA_CURTO[d.getUTCDay()]}</small></span><b>${esc(x.nome)}</b><span class="pill ${x.tipo==='nacional'?'teal':x.tipo==='empresa'?'warn':'neu'}">${esc(ferTipoNome(x.tipo))}</span><button class="lnk" data-act="rh-ferrem" data-v="${x.data}" style="color:var(--crit-ink)">${calc.has(x.data)?'A fábrica trabalha':'Tirar'}</button></div>`; }).join('')}</div>
        ${nac.length?`<div class="sub" style="margin:12px 0 0;font-size:13px">A fábrica trabalha em: ${nac.map(x=>`${esc(x.nome)} (${br(x.data).slice(0,5)}) <button class="lnk" data-act="rh-fervolta" data-v="${x.data}">voltar a ser feriado</button>`).join(' · ')}</div>`:''}
        ${sug.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:6px">MUITAS EMPRESAS FOLGAM (incluir se a Colafix folgar)</div><div class="rh-chips" style="margin:0">${sug.map(s=>`<button class="rh-chip2" data-act="rh-fersug" data-v="${s.data}" data-n="${esc(s.nome)}">+ ${esc(s.nome)} · ${br(s.data).slice(0,5)}</button>`).join('')}</div>`:''}
        <div class="rh-sep"></div><div class="label" style="margin-bottom:6px">NOVO FERIADO OU PONTE</div>
        <div class="rh-g"><label><span class="label">Data</span><input class="txt" type="date" id="rh-fhd"></label><label><span class="label">Nome</span><input class="txt" id="rh-fhn" placeholder="ex.: Aniversário de Cachoeirinha, ponte de Natal"></label>
          <label><span class="label">Tipo</span><select class="txt" id="rh-fht">${FER_TIPOS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label></div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" data-act="rh-feradd">${P.ic('mais',18,2.4)}Incluir</button></div>
        <div class="sub" style="margin:10px 0 0;font-size:12.5px">Os nacionais o painel já sabe sozinho (incluindo Sexta-feira Santa). Cadastre aqui os de Cachoeirinha e as pontes da empresa.</div></section>`; }
  /* CLT, art. 134 §3º: as férias não podem começar nos 2 dias antes de feriado ou do domingo (repouso semanal) */
  function ferInicioAviso(d){ if(!okIso(d)) return ''; const ms=[]; [1,2].forEach(k=>{ const x=addDias(d,k), w=dU(x).getUTCDay(), fe=feriadoDe(x); if(w===0) ms.push('domingo '+br(x).slice(0,5)); if(fe) ms.push(fe.nome+' '+br(x).slice(0,5)); });
    return ms.length?`<div class="banner" style="background:var(--crit-tint);color:var(--crit-ink);margin:10px 0 0"><b>Atenção:</b> pela CLT, as férias não podem começar nos 2 dias antes de feriado ou do domingo (${esc(ms.join(', '))}). Escolha outro dia de início.</div>`:''; }

  /* ---------- Perguntas rápidas (Início): um toque e sai a lista, pronta para imprimir ou mandar ---------- */
  const PERG=[['aniv','Quem faz aniversário em…'],['setor','Quem é do setor…'],['exp','Quem está em experiência?'],['ferias','Quem sai de férias nos próximos 30 dias?'],['ferv','Quem tem férias para tirar?'],['casa','Quem faz aniversário de casa este ano?'],
    ['semnasc','Quem não tem data de nascimento?'],['incomp','Quem está com o cadastro incompleto?'],['pj','Quando é a troca de cada PJ?'],['emp','Quem está com item emprestado?'],['oc','Quem teve ocorrência este ano?']];
  const nomeT=f=>titulo(f&&f.nome||'');
  function pergDados(){ const g=R.perg, k=g.k, hj=P.hojeStr(), ano=+hj.slice(0,4), at=ativos(), por=(a,b)=>a.nome.localeCompare(b.nome,'pt-BR'), fun=id=>R.func.find(f=>f._id===id)||{nome:'',_id:id};
    if(k==='aniv'){ const m=g.mes||hj.slice(5,7), xs=at.filter(f=>okIso(f.nascimento)&&f.nascimento.slice(5,7)===m).sort((a,b)=>a.nascimento.slice(8).localeCompare(b.nascimento.slice(8)));
      return {t:'Aniversariantes de '+MESES[+m-1],cols:['Dia','Nome','Setor','Faz'],rows:xs.map(f=>[f.nascimento.slice(8)+'/'+m,nomeT(f),f.setor||'',(ano-+f.nascimento.slice(0,4))+' anos']),ids:xs.map(f=>f._id),nc:1,sem:at.filter(f=>!okIso(f.nascimento)).length}; }
    if(k==='setor'){ const ss=[...new Set(at.map(f=>f.setor||'Sem setor'))].sort((a,b)=>a.localeCompare(b,'pt-BR')), s=ss.includes(g.setor)?g.setor:ss[0]||''; g.setor=s; const xs=at.filter(f=>(f.setor||'Sem setor')===s).sort(por);
      return {t:'Setor '+s,cols:['Nome','Função','Vínculo','Tempo de casa'],rows:xs.map(f=>[nomeT(f),f.funcao||'',f.tipo==='PJ'?'PJ · '+empNome(f.empresa):'CLT',okIso(f.admissao)?tempoTxt(f.admissao):'']),ids:xs.map(f=>f._id),nc:0,setores:ss}; }
    if(k==='exp'){ const xs=clts().map(f=>({f,e:expInfo(f)})).filter(o=>o.e).sort((a,b)=>a.e.fim.localeCompare(b.e.fim));
      return {t:'Em experiência',cols:['Nome','Setor','Admissão','Fim da 1ª etapa','Fim da experiência','Situação'],rows:xs.map(({f,e})=>[nomeT(f),f.setor||'',br(f.admissao),br(e.f1),br(e.f2),e.t]),ids:xs.map(o=>o.f._id),nc:0}; }
    if(k==='ferias'){ const lim=addDias(hj,30), xs=R.fer.filter(x=>!x.anterior&&x.status!=='cancelada'&&okIso(x.inicio)&&x.fim>=hj&&x.inicio<=lim).sort((a,b)=>a.inicio.localeCompare(b.inicio));
      return {t:'Férias nos próximos 30 dias',cols:['Nome','Setor','Início','Fim','Volta','Dias'],rows:xs.map(x=>{ const f=fun(x.funcId); return [nomeT(f.nome?f:{nome:x.funcionario}),f.setor||'',br(x.inicio)+(x.inicio<=hj?' (já começou)':''),br(x.fim),br(x.retorno||addDias(x.fim,1)),String(x.dias)]; }),ids:xs.map(x=>x.funcId),nc:0}; }
    if(k==='ferv'){ const xs=clts().map(f=>({f,s:sitFer(f)})).filter(o=>o.s.p&&o.s.p.completo&&o.s.p.saldo>0).sort((a,b)=>a.s.p.lim.localeCompare(b.s.p.lim));
      return {t:'Férias para tirar',cols:['Nome','Setor','Período','Dar até','Faltam','Situação'],rows:xs.map(({f,s})=>[nomeT(f),f.setor||'',br(s.p.ini)+' a '+br(s.p.fim),br(s.p.lim),plural(s.p.saldo,'dia','dias'),s.t]),ids:xs.map(o=>o.f._id),nc:0}; }
    if(k==='casa'){ const xs=at.filter(f=>okIso(f.admissao)).map(f=>({f,a:ano-+f.admissao.slice(0,4)})).filter(o=>o.a===1||(o.a>0&&o.a%5===0)).sort((a,b)=>a.f.admissao.slice(5).localeCompare(b.f.admissao.slice(5)));
      return {t:'Aniversário de casa em '+ano+' (1, 5, 10… anos)',cols:['Dia','Nome','Setor','Completa'],rows:xs.map(({f,a})=>[br(f.admissao).slice(0,5),nomeT(f),f.setor||'',plural(a,'ano','anos')]),ids:xs.map(o=>o.f._id),nc:1}; }
    if(k==='semnasc'){ const xs=at.filter(f=>!okIso(f.nascimento)).sort(por); return {t:'Sem data de nascimento',cols:['Nome','Setor','Função'],rows:xs.map(f=>[nomeT(f),f.setor||'',f.funcao||'']),ids:xs.map(f=>f._id),nc:0,ed:1}; }
    if(k==='incomp'){ const falta=f=>[!okIso(f.nascimento)&&'nascimento',!f.funcao&&'função',!f.setor&&'setor',!f.telefone&&'telefone',!okIso(f.admissao)&&'admissão',f.tipo!=='PJ'&&(f.salario===''||f.salario==null)&&'salário'].filter(Boolean);
      const xs=at.map(f=>({f,x:falta(f)})).filter(o=>o.x.length).sort((a,b)=>b.x.length-a.x.length||por(a.f,b.f));
      return {t:'Cadastro incompleto',cols:['Nome','Setor','Falta'],rows:xs.map(({f,x})=>[nomeT(f),f.setor||'',x.join(', ')]),ids:xs.map(o=>o.f._id),nc:0,ed:1}; }
    if(k==='pj'){ const xs=pjs().map(f=>({f,s:pjSit(f)})).sort((a,b)=>String(a.s.prox||'9').localeCompare(String(b.s.prox||'9')));
      return {t:'Troca dos PJ',cols:['Nome','Empresa','Última troca','Próxima troca','Situação'],rows:xs.map(({f,s})=>[nomeT(f),empNome(f.empresa),okIso(f.ultimaTroca)?br(f.ultimaTroca):'—',s.prox?br(s.prox):'—',s.t]),ids:xs.map(o=>o.f._id),nc:0}; }
    if(k==='emp'){ const xs=R.emp.filter(x=>!x.removido&&!x.devolvido).map(x=>({x,f:fun(x.funcId)})).sort((a,b)=>String(a.f.nome).localeCompare(String(b.f.nome),'pt-BR'));
      return {t:'Itens emprestados',cols:['Nome','Item','Desde','Situação'],rows:xs.map(({x,f})=>[nomeT(f),empTxt(x),br(String(x.desde||x.em).slice(0,10)),f.status==='Desligado'?'saiu, falta devolver':f.desligAgendado?'vai sair em '+br(f.desligamento):'trabalhando']),ids:xs.map(o=>o.f._id),nc:0}; }
    if(k==='oc'){ const xs=R.oc.filter(x=>!x.removido&&String(x.data).slice(0,4)===String(ano)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
      return {t:'Ocorrências em '+ano,cols:['Nome','Data','Tipo','O que aconteceu'],rows:xs.map(x=>{ const f=fun(x.funcId); return [nomeT(f.nome?f:{nome:x.funcionario}),br(x.data),x.tipo,x.motivo||'']; }),ids:xs.map(x=>x.funcId),nc:0}; }
    return {t:'',cols:[],rows:[],ids:[]}; }
  const pergTexto=D=>D.t+'\n'+D.rows.map(r=>'• '+r.filter(Boolean).join(' · ')).join('\n')+(D.rows.length?'':'\n(ninguém)');
  function pergHtml(D){ return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(D.t)}</title><style>@page{size:A4;margin:16mm}body{font:10.5pt/1.45 "Segoe UI",Arial,sans-serif;color:#111}h1{font-size:16pt;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;font-size:9pt;color:#555;border-bottom:2px solid #143F54;padding:5px 6px}td{padding:5px 6px;border-bottom:1px solid #ddd}.sub{color:#666}</style></head><body>
    <h1>${esc(D.t)}</h1><div class="sub">${esc(EMP_DOC.COLAFIX.nome)} · ${plural(D.rows.length,'pessoa','pessoas')} · ${br(P.hojeStr())}</div>
    <table><thead><tr>${D.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${D.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`; }
  function cartaoPerg(){ const g=R.perg;
    const chips=`<div class="rh-pgc">${PERG.map(([k,l])=>`<button class="rh-chip2 rh-pgb" data-act="rh-perg" data-v="${k}" aria-pressed="${!!g&&g.k===k}">${esc(l)}</button>`).join('')}</div>`;
    if(!g) return `<section class="card rh-perg"><div class="rh-ch"><h2>Perguntas rápidas</h2><span class="sub" style="margin:0;font-size:12.5px">um toque e sai a lista, pronta para imprimir ou mandar</span></div>${chips}</section>`;
    const D=pergDados();
    const filtro=g.k==='aniv'?`<label class="rh-pgf"><span class="label">Mês</span><select class="txt" id="rh-pgm">${MESES.map((n,i)=>{ const v=String(i+1).padStart(2,'0'); return `<option value="${v}" ${(g.mes||P.hojeStr().slice(5,7))===v?'selected':''}>${cap(n)}</option>`; }).join('')}</select></label>`
      :g.k==='setor'?`<label class="rh-pgf"><span class="label">Setor</span><select class="txt" id="rh-pgs">${(D.setores||[]).map(s=>`<option ${s===g.setor?'selected':''}>${esc(s)}</option>`).join('')}</select></label>`:'';
    return `<section class="card rh-perg"><div class="rh-ch"><h2>Perguntas rápidas</h2><button class="lnk" data-act="rh-pergx">Fechar a lista</button></div>${chips}
      <div class="rh-pgr"><div class="rh-ch" style="flex-wrap:wrap;gap:10px"><div><b style="font-size:17px">${esc(D.t)}</b> <span class="pill neu">${plural(D.rows.length,'pessoa','pessoas')}</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">${filtro}<button class="btn sec rh-sm" data-act="rh-pgimp">Imprimir</button><button class="btn sec rh-sm" data-act="rh-pgcop">Copiar</button><button class="btn sec rh-sm" data-act="rh-pgwa">WhatsApp</button></div></div>
        ${D.rows.length?`<div class="rh-tw"><table class="rh-t"><thead><tr>${D.cols.map(c=>`<th>${esc(c)}</th>`).join('')}${D.ed?'<th></th>':''}</tr></thead><tbody>${D.rows.map((r,i)=>`<tr>${r.map((c,j)=>`<td${j===D.nc?'':' class="'+(/^\d{2}\/\d{2}/.test(c)?'num':'')+'"'}>${j===D.nc&&D.ids[i]?`<button class="rh-nm" data-act="rh-pess" data-id="${D.ids[i]}">${esc(c)}</button>`:esc(c)}</td>`).join('')}${D.ed?`<td><button class="lnk" data-act="rh-ed" data-go-func="1" data-id="${D.ids[i]}">Completar</button></td>`:''}</tr>`).join('')}</tbody></table></div>`
          :'<div class="sub" style="margin:8px 0 0">Ninguém.</div>'}
        ${D.sem?`<div class="sub" style="margin:8px 0 0;font-size:12.5px">${plural(D.sem,'pessoa sem','pessoas sem')} data de nascimento no cadastro.</div>`:''}</div></section>`; }

  /* ---------- Ficha de admissão pelo celular ----------
     O RH cria um link (convite) e manda por WhatsApp; o candidato preenche em ficha.html, sem login, e manda as fotos dos documentos.
     Chega aqui em "Fichas pelo celular"; "Começar admissão" preenche o cadastro, guarda as fotos e marca os documentos entregues. */
  const FC_VALIDADE=15;
  const tokenNovo=()=>{ const a=new Uint8Array(20), c='abcdefghijklmnopqrstuvwxyz0123456789'; (window.crypto||window.msCrypto).getRandomValues(a); return Array.from(a,x=>c[x%36]).join(''); };
  const linkFicha=t=>location.origin+location.pathname.replace(/[^/]*$/,'')+'ficha.html?c='+t;
  function qrSvg(txt,px){ if(typeof qrcode!=='function') return ''; const q=qrcode(0,'M'); q.addData(txt); q.make(); const n=q.getModuleCount(); let d='';
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(q.isDark(r,c)) d+='M'+c+' '+r+'h1v1h-1z'; return `<svg width="${px}" height="${px}" viewBox="-2 -2 ${n+4} ${n+4}" role="img" aria-label="QR do link"><rect x="-2" y="-2" width="${n+4}" height="${n+4}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; }
  const convAberto=x=>!x.usado&&+x.ateMs>Date.now()&&!R.fcand.some(f=>f._id===x._id);
  /* mensagem do link: a RH escreve (fica guardada para as próximas em rh/config.convMsg); {NOME} vira o primeiro nome */
  const CONV_MSG='Olá, {NOME}! Aqui é do RH da Colafix. Seja bem-vindo(a)!\nPreencha sua ficha de admissão pelo celular (leva uns 5 minutos) e mande as fotos dos documentos pelo link abaixo.';
  const msgTexto=x=>{ const n=x.nome?titulo(x.nome).split(' ')[0]:''; return String(x.msg||R.cfg.convMsg||CONV_MSG).replace(n?/\{NOME\}/g:/,?\s*\{NOME\}/g,n).trim(); };
  const msgWa=x=>msgTexto(x)+'\n\n'+linkFicha(x._id);
  function modalConv(){ const g=R.convM; if(!g) return '';
    if(g.fase==='nome') return `<div class="rh-modal"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Ficha pelo celular" style="max-width:520px"><div class="rh-ch"><h2>Ficha pelo celular</h2><button class="lnk" data-act="rh-convx">Fechar</button></div>
      <p class="sub" style="margin:6px 0 12px">O painel cria um link. Você manda pelo WhatsApp e a pessoa preenche no celular: dados, endereço, tamanhos, banco e fotos dos documentos. Vale por ${FC_VALIDADE} dias.</p>
      <label><span class="label">Nome da pessoa (opcional, para a mensagem)</span><input class="txt" id="rh-convn" value="${esc(g.nome||'')}" placeholder="ex.: Bruna"></label>
      <label style="display:block;margin-top:12px"><span class="label">Mensagem (vai no WhatsApp e aparece no topo da ficha) · {NOME} vira o nome da pessoa</span><textarea class="txt" id="rh-convmsg" rows="5" maxlength="700">${esc(g.msg!=null?g.msg:(R.cfg.convMsg||CONV_MSG))}</textarea></label>
      <div class="sub" style="margin:6px 0 0;font-size:12.5px">Dá para escrever, por exemplo, o dia e o horário de começar ou o que trazer no primeiro dia. O link vai no final.</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px"><button class="btn sec" data-act="rh-convx">Cancelar</button><button class="btn" data-act="rh-convcriar" ${R.salv?'disabled':''}>Criar link</button></div></div></div>`;
    const x=R.conv.find(c=>c._id===g.t)||{_id:g.t,nome:g.nome,ateMs:g.ateMs,msg:g.msg}, u=linkFicha(x._id);
    return `<div class="rh-modal"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Link da ficha" style="max-width:560px"><div class="rh-ch"><h2>Link pronto${x.nome?' para '+esc(titulo(x.nome).split(' ')[0]):''}</h2><button class="lnk" data-act="rh-convx">Fechar</button></div>
      <div class="rh-convq">${qrSvg(u,180)}<div><p class="sub" style="margin:0 0 8px">Mande pelo WhatsApp ou mostre o QR para a pessoa ler com a câmera do celular.</p><div class="rh-convm">${esc(msgTexto(x)).replace(/\n/g,'<br>')}</div><input class="txt" id="rh-convu" value="${esc(u)}" readonly onfocus="this.select()">
        <div class="sub" style="margin:6px 0 0;font-size:12.5px">Vale até ${new Date(+x.ateMs).toLocaleDateString('pt-BR')}. Quando chegar, aparece em Funcionários › Admissões e no Início.</div></div></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn sec" data-act="rh-convcop" data-id="${x._id}">Copiar mensagem e link</button><button class="btn" data-act="rh-convwa" data-id="${x._id}">Mandar no WhatsApp</button></div></div></div>`; }
  function cartaoFichasCel(){ const xs=R.fcand.filter(x=>!x.usada), ab=R.conv.filter(convAberto);
    return `<section class="card rh-fcel"><div class="rh-ch"><h2>Fichas pelo celular</h2><button class="btn sec rh-sm" data-act="rh-convnovo">${P.ic('mais',16,2.4)}Mandar ficha pelo celular</button></div>
      ${xs.length?xs.map(x=>`<div class="rh-dl"><div><b>${esc(x.nome||'')}</b><small>chegou em ${dmIso(x.em)}${x.fotos?' · '+plural(+x.fotos,'foto','fotos'):''}${x.telefone?' · '+esc(x.telefone):''}</small></div><div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end"><button class="lnk" data-act="rh-fcver" data-id="${x._id}">Ver</button><button class="btn rh-sm" data-act="rh-fcusar" data-id="${x._id}">Começar admissão</button></div></div>`).join('')
        :'<div class="sub" style="margin:6px 0 0">Nenhuma ficha nova.</div>'}
      ${ab.length?`<div class="label" style="margin:12px 0 4px">ESPERANDO A PESSOA PREENCHER</div>${ab.map(x=>`<div class="rh-dl"><div><b>${esc(x.nome?titulo(x.nome):'Link sem nome')}</b><small>criado em ${dmIso(x.criado)} · vale até ${new Date(+x.ateMs).toLocaleDateString('pt-BR').slice(0,5)}</small></div><div style="display:flex;gap:12px"><button class="lnk" data-act="rh-convver" data-id="${x._id}">Ver link</button><button class="lnk" data-act="rh-convapag" data-id="${x._id}" style="color:var(--crit-ink)">Cancelar</button></div></div>`).join('')}`:''}</section>`; }
  const FC_CAMPOS=[['nome','Nome'],['cpf','CPF'],['nascimento','Nascimento'],['telefone','Telefone'],['email','E-mail'],['cep','CEP'],['rua','Rua'],['numero','Número'],['complemento','Complemento'],['bairro','Bairro'],['cidade','Cidade'],
    ['camisa','Camisa'],['calca','Calça'],['calcado','Calçado'],['banco','Banco'],['agencia','Agência'],['conta','Conta'],['pix','Chave PIX'],['emergNome','Contato de emergência'],['emergTel','Telefone de emergência'],['obs','Observação']];
  const fcEndereco=x=>[[x.rua,x.numero].filter(Boolean).join(', ')+(x.complemento?' - '+x.complemento:''),x.bairro,x.cidade].filter(Boolean).join(' · ');
  function modalFicha(){ const x=R.fcand.find(c=>c._id===R.fcv); if(!x) return '';
    return `<div class="rh-modal"><div class="rh-mbox" role="dialog" aria-modal="true" aria-label="Ficha recebida" style="max-width:640px"><div class="rh-ch"><h2>Ficha de ${esc(x.nome||'')}</h2><button class="lnk" data-act="rh-fcx">Fechar</button></div>
      <dl class="rh-pfd" style="margin-top:10px">${FC_CAMPOS.filter(([k])=>x[k]).map(([k,l])=>`<dt>${l}</dt><dd>${esc(k==='nascimento'?br(x[k]):k==='cpf'?fCPF(x[k]):x[k])}</dd>`).join('')}</dl>
      <div class="sub" style="margin:10px 0 0">${x.fotos?plural(+x.fotos,'foto de documento','fotos de documentos')+' — ficam guardadas no cadastro quando você começar a admissão.':'Sem fotos de documentos.'}</div>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="lnk" data-act="rh-fcapag" data-id="${x._id}" style="color:var(--crit-ink)">Apagar esta ficha</button><button class="btn" data-act="rh-fcusar" data-id="${x._id}">Começar admissão</button></div></div></div>`; }
  async function fichaCandFinalizar(funcId,t,base){ const f=Object.assign({_id:funcId},R.func.find(x=>x._id===funcId)||{},base||{}); let n=0;
    const sn=await P.db().collection(COL.fcarq).where('c','==',t).limit(40).get(), ent=(f.admEntregues||[]).slice(), od=OD();
    for(const d of sn.docs){ const a=d.data(); if(!a.d) continue; const ext=/pdf/.test(a.tipo||'')?'pdf':'jpg', nome=nomeArq((a.nome||'Documento')+' - '+(f.nome||''))+'.'+ext;
      const r=od?await od.enviar('Admissões/'+nomeArq(f.nome||'')+'/'+nome,a.d,a.tipo||'image/jpeg'):null, url=r?(r.webUrl||''):linkArq(await salvarArquivo({nome,mime:a.tipo||'image/jpeg',tipo:'documento'},a.d));
      const nm=a.nome||'Documento', i=ent.findIndex(e=>e.nome===nm); const it={nome:nm,em:agora(),porNome:'pelo celular',url}; if(i>=0) ent[i]=Object.assign({},ent[i],{url}); else ent.push(it); n++;
      await P.db().doc(COL.fcarq+'/'+d.id).delete(); }
    await grava(COL.func+'/'+funcId,{admEntregues:ent,fichaCel:t}); f.admEntregues=ent;
    await P.db().doc(COL.fcand+'/'+t).set({usada:true,funcId,usadaEm:agora(),usadaPor:eu()},{merge:true}); try{ await P.db().doc(COL.conv+'/'+t).delete(); }catch(e){}
    return n; }

  /* ---------- registro do módulo ---------- */
  const TELAS={ rhinicio:{nome:'Início',mob:'Início',render:()=>{ const h=vInicio(), i=h.indexOf('Próximos 7 dias'); if(i<0) return h+avCardRH();
      /* fim do bloco dos 7 dias (conta seções abertas dentro dele) → os avisos entram logo depois, na largura toda */
      let k=h.lastIndexOf('<section',i), d=0, j=k; const re=/<\/?section\b/g; re.lastIndex=k; let m; while((m=re.exec(h))){ if(m[0]==='<section') d++; else { d--; if(d===0){ j=h.indexOf('>',m.index)+1; break; } } }
      return j>k?h.slice(0,j)+avCardRH()+h.slice(j):h+avCardRH(); }}, rhagenda:{nome:'Agenda',mob:'Agenda',render:vAgenda}, rhfunc:{nome:'Funcionários',mob:'Funcionários',render:vFunc}, rhterc:{nome:'Terceirizados',mob:'Terceiros',menu:false,render:()=>{ R.fview='terc'; R.pess=null; queueMicrotask(()=>{ if(P.S.view==='rhterc') P.go('rhfunc'); }); return vTerc(true); }}, rhfichas:{nome:'Fichas do mês',mob:'Fichas',render:vFichas},
    rhdocs:{nome:'Documentos e contratos',mob:'Documentos',render:vDocs}, rhferias:{nome:'Férias e prazos',mob:'Prazos',render:vFerias}, rhalmoco:{nome:'Almoço',mob:'Almoço',render:()=>window.RHAlmoco?window.RHAlmoco.render(almCtx()):'<section class="card">Carregando…</section>'}, rhfuncoes:{nome:'Cadastros',mob:'Cadastros',render:vCadastros} };
  Object.values(TELAS).forEach(t=>{ const r=t.render; t.render=()=>{ queueMicrotask(navSolo); queueMicrotask(pvAjusta); return r()+modalConv()+modalFicha()+(window.RHCartao?RHCartao.modal({P,R,esc,baixar}):''); }; });
  /* tela Almoço (modulos/rh-almoco.js): controle do almoço pelo Face ID */
  const almCtx=()=>({P,R,esc,eu,br,fCPF,carregarJs,baixar});
  /* ---------- Férias pelo relatório do sistema de folha (PDF "Programação de férias", Alleader) ----------
     O RH importa o PDF; o painel guarda em cada funcionário a situação da folha (ferFolha) e cria as férias já programadas.
     Daí em diante os períodos, dias de direito, gozados e o limite para gozo vêm da folha (consideram faltas e afastamentos). */
  const dIso=s=>{ const m=String(s||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m?m[3]+'-'+m[2]+'-'+m[1]:''; };
  const nPt=s=>{ const v=String(s||'').trim(); if(!v||/^[-.]+$/.test(v)) return 0; return +v.replace(/\./g,'').replace(',','.')||0; };
  function rhFolhaParse(linhas){ const R0={dataBase:'',emissao:'',emps:[]}; let cur=null;
    const rest=(r)=>{ const m=String(r).trim().match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\S+)\s+(\S+)/); if(!m) return null;
      const ig=dIso(m[1]); return {inicioGozo:ig,diasGozo:ig?nPt(m[2]):0,abono:ig?nPt(m[3]):0,dir:nPt(m[5]),goz:nPt(m[6]),rest:nPt(m[7]),lim:dIso(m[8]),afast:nPt(m[9]),faltas:nPt(m[10])}; };
    for(const l0 of linhas){ const l=String(l0).replace(/\s+/g,' ').trim(); let m;
      if((m=l.match(/Data base:\s*(\d{2}\/\d{2}\/\d{4})/))) R0.dataBase=dIso(m[1]);
      if((m=l.match(/Emiss[aã]o:\s*(\d{2}\/\d{2}\/\d{4})/))) R0.emissao=dIso(m[1]);
      if((m=l.match(/^(\d{1,6}) (.+?) (\d{2}\/\d{2}\/\d{4}) (\d{2}\/\d{2}\/\d{4}) (\d+) (\d{2}\/12) (\d{2}\/\d{2}\/\d{4}) (\d{2}\/\d{2}\/\d{4}) (.+)$/))){
        const p=rest(m[9]); if(!p) continue; cur={cod:m[1],nome:m[2].trim(),adm:dIso(m[3]),venc:dIso(m[4]),ferVenc:+m[5],ferPro:m[6],periodos:[Object.assign({ini:dIso(m[7]),fim:dIso(m[8])},p)]}; R0.emps.push(cur); continue; }
      if(cur&&(m=l.match(/^(\d{2}\/\d{2}\/\d{4}) (\d{2}\/\d{2}\/\d{4}) (.+)$/))){ const p=rest(m[3]); if(p) cur.periodos.push(Object.assign({ini:dIso(m[1]),fim:dIso(m[2])},p)); continue; } }
    return R0; }
  window.rhFolhaParse=rhFolhaParse;
  async function rhPdfLinhas(file){
    if(!window.pdfjsLib) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload=ok; s.onerror=()=>er(new Error('Não consegui carregar o leitor de PDF (verifique a internet).')); document.head.appendChild(s); });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise, out=[];
    for(let p=1;p<=doc.numPages;p++){ const tc=await (await doc.getPage(p)).getTextContent(), g=new Map();
      tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; const y=Math.round(it.transform[5]/2)*2; (g.get(y)||g.set(y,[]).get(y)).push(it); });
      [...g.keys()].sort((a,b)=>b-a).forEach(y=>out.push(g.get(y).sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str.trim()).join(' '))); }
    return out; }
  function rhLev(a,b){ if(Math.abs(a.length-b.length)>3) return 9; const v=Array(b.length+1).fill(0).map((_,j)=>j);
    for(let i=1;i<=a.length;i++){ let ant=v[0]; v[0]=i; for(let j=1;j<=b.length;j++){ const t=v[j]; v[j]=Math.min(v[j]+1,v[j-1]+1,ant+(a[i-1]===b[j-1]?0:1)); ant=t; } } return v[b.length]; }
  /* cadastros em dobro: um criado pela importação da folha e outro antigo da mesma pessoa (mesma admissão + primeiro nome, ou nome quase igual) */
  function rhDuplos(){ const fs=R.func.filter(f=>f.status!=='Desligado'), out=[];
    fs.filter(f=>f.origem==='folha').forEach(nv=>{ const prim=norm(nv.nome).split(' ')[0];
      const ant=fs.find(x=>x!==nv&&x.origem!=='folha'&&((x.admissao&&x.admissao===nv.admissao&&norm(x.nome).split(' ')[0]===prim)||rhLev(norm(x.nome),norm(nv.nome))<=3));
      if(ant) out.push({nv,ant}); }); return out; }
  async function rhJunta(nvId,antId){ const nv=R.func.find(x=>x._id===nvId), ant=R.func.find(x=>x._id===antId); if(!nv||!ant||R.salv) return;
    if(!confirm('Juntar os cadastros?\n\nFica: '+ant.nome+' (cadastro antigo, com CPF/função/setor)\nRecebe os dados da folha de: '+nv.nome+'\nO cadastro duplicado é apagado.')) return;
    R.salv=true; P.render();
    try{ const up={ferFolha:nv.ferFolha||null,codFolha:nv.codFolha||ant.codFolha||null}; if(!okIso(ant.admissao)&&nv.admissao) up.admissao=nv.admissao; await grava(COL.func+'/'+ant._id,up); Object.assign(ant,up);
      for(const x of R.fer.filter(x=>x.funcId===nv._id)) await P.db().doc(COL.ferias+'/'+x._id).set({funcId:ant._id,funcionario:ant.nome},{merge:true});
      await P.db().doc(COL.func+'/'+nv._id).delete(); R.func=R.func.filter(x=>x!==nv); P.toast('Cadastros juntados: '+ant.nome+' ficou com os dados da folha.'); }
    catch(err){ P.toast('Não foi possível juntar: '+((err&&err.message)||err)); }
    R.salv=false; P.render(); }
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="rh-junta"]'); if(b) rhJunta(b.dataset.nv,b.dataset.ant); });
  function rhFolhaPrevia(dados){ const fsAll=R.func.filter(f=>f.status!=='Desligado'), enc=[], nao=[];
    const parte=n=>{ const w=norm(n).split(' ').filter(Boolean); return w[0]+' '+w[w.length-1]; };
    dados.emps.forEach(e=>{ let f=fsAll.find(x=>norm(x.nome)===norm(e.nome)); const un=c=>c.length===1?c[0]:null;
      if(!f) f=un(fsAll.filter(x=>parte(x.nome)===parte(e.nome)));
      if(!f&&e.adm) f=un(fsAll.filter(x=>x.admissao===e.adm&&norm(x.nome).split(' ')[0]===norm(e.nome).split(' ')[0]));
      if(!f) f=un(fsAll.filter(x=>rhLev(norm(x.nome),norm(e.nome))<=3));
      if(f&&enc.some(o=>o.f===f)) f=null; if(f) enc.push({f,e}); else nao.push(e); });
    R.ffi={dados,enc,nao}; P.render(); }
  window.rhFolhaPreviaLinhas=linhas=>rhFolhaPrevia(rhFolhaParse(linhas));
  window.rhFerDbg=fid=>{ const f=R.func.find(x=>x._id===fid); return f?({periodos:periodos(f).map(p=>({ini:p.ini,fim:p.fim,lim:p.lim,saldo:p.saldo})),sit:sitFer(f)}):null; }; /* conferência (testes) */
  async function rhFolhaAplica(){ const X=R.ffi; if(!X||R.salv) return; R.salv=true; P.render(); let nf=0, np=0;
    try{ for(const {f,e} of X.enc){
        const ferFolha={dataBase:X.dados.dataBase,emissao:X.dados.emissao,cod:e.cod,ferVenc:e.ferVenc,periodos:e.periodos,importadoEm:agora(),por:eu()};
        const up={ferFolha}; if(!okIso(f.admissao)&&e.adm) up.admissao=e.adm; await grava(COL.func+'/'+f._id,up); Object.assign(f,up); nf++;
        const novos=e.periodos.filter(p=>p.inicioGozo&&p.diasGozo>0).map(p=>p.inicioGozo), fs=ferDe(f);
        for(const x of fs.filter(x=>x.origem==='folha'&&!novos.includes(x.inicio))) await P.db().doc(COL.ferias+'/'+x._id).delete();
        for(const p of e.periodos.filter(p=>p.inicioGozo&&p.diasGozo>0)){ if(fs.some(x=>x.inicio===p.inicioGozo)) continue; const dias=Math.round(p.diasGozo);
          await P.db().doc(COL.ferias+'/'+id()).set({funcId:f._id,funcionario:f.nome,aquisitivo:p.ini,aquisitivoFim:p.fim,inicio:p.inicioGozo,dias,fim:addDias(p.inicioGozo,dias-1),retorno:addDias(p.inicioGozo,dias),status:'programada',origem:'folha',em:agora(),por:P.S.uid||null,porNome:eu()}); np++; } }
      P.toast(`Relatório aplicado: ${nf} funcionário(s) atualizados${np?' · '+np+' férias programadas trazidas da folha':''}.`); R.ffi=null; }
    catch(err){ P.toast('Não foi possível aplicar: '+((err&&err.message)||err)); }
    R.salv=false; P.render(); }
  /* períodos e situação: com o relatório, valem os dados da folha */
  { const _per=periodos; periodos=function(f){ const FF=f&&f.ferFolha; if(!f||f.tipo==='PJ'||!FF||!(FF.periodos||[]).length) return _per(f);
      const hj=P.hojeStr(), fs=ferDe(f), emis=FF.emissao||FF.dataBase||'', conta=x=>!x.anterior&&(x.origem==='folha'||String(x.inicio||'')>emis);
      const mk=(k,p)=>{ const ps=fs.filter(x=>x.aquisitivo===p.ini&&conta(x)), usados=ps.reduce((a,x)=>a+(+x.dias||0),0); return {k,ini:p.ini,fim:p.fim,lim:p.lim,completo:p.fim<hj,ps,usados,saldo:Math.max(0,Math.floor((p.rest!=null?+p.rest:30)-usados)),folha:p.folha?p:p.dir!=null?p:null}; };
      const out=FF.periodos.map((p,k)=>mk(k,p)); let ult=FF.periodos[FF.periodos.length-1];
      for(let k=out.length;k<out.length+3;k++){ const ini=addDias(ult.fim,1); if(ini>hj) break; const p={ini,fim:addDias(addMeses(ini,12),-1),lim:addDias(addMeses(ini,24),-30),rest:30}; out.push(mk(k,p)); ult=p; }
      return out; }; }
  { const _sit=sitFer; sitFer=function(f){ const s=_sit(f), fp=s&&s.p&&s.p.folha;
      if(s&&(s.c==='ok'||s.c==='warn')&&s.p&&okIso(s.p.lim)&&s.p.saldo>0&&!(s.p.ps||[]).some(x=>x.inicio>=P.hojeStr())){ const av=addDias(s.p.lim,-30), d=diasAte(av); /* o aviso de férias sai 30 dias antes do início */
        if(d<0) return Object.assign({},s,{c:'crit',t:'Passou do dia de avisar ('+br(av)+') · conceder até '+br(s.p.lim),n:1});
        if(d<=PZ_AVISO()) return Object.assign({},s,{c:'warn',t:'Avisar até '+br(av)+(d===0?' (hoje)':''),n:2}); } if(fp&&(+fp.afast||0)>=30&&s.c==='crit') return {c:'neu',t:'Afastado '+fp.afast+' dias no período · conferir na folha',n:5,p:s.p,d:s.d}; return s; }; }
  function ffiCard(){ const X=R.ffi, com=clts().filter(f=>f.ferFolha), ult=com.reduce((a,f)=>String(f.ferFolha.importadoEm||'')>String(a.importadoEm||'')?f.ferFolha:a,{});
    const topoC=`<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">Sistema de folha</h2><div class="sub" style="margin:2px 0 0">${com.length?`Situação da folha de ${com.length} funcionário(s) · relatório de ${br(ult.emissao)} (data base ${br(ult.dataBase)})`:'Importe o relatório "Programação de férias" do sistema de folha para os prazos usarem os dados oficiais (faltas, afastamentos, dias gozados).'}</div></div>
      <label class="btn" style="cursor:pointer">${P.ic('folha',16,2)}Importar relatório de férias (PDF)<input type="file" id="rh-ffi-file" accept=".pdf,application/pdf" hidden></label></div>`;
    const dup=rhDuplos(), dupH=dup.length?`<div class="banner" style="margin-top:12px"><b>Possíveis cadastros em dobro (${dup.length})</b> — a mesma pessoa foi cadastrada de novo pela importação. Junte para ficar um cadastro só, com os dados da folha:
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${dup.map(({nv,ant})=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span><b>${esc(ant.nome)}</b> (cadastro antigo) e <b>${esc(nv.nome)}</b> (da folha) · admissão ${br(nv.admissao||ant.admissao)}</span><button class="btn rh-sm" data-act="rh-junta" data-nv="${nv._id}" data-ant="${ant._id}" ${R.salv?'disabled':''}>Juntar</button></div>`).join('')}</div></div>`:'';
    if(!X) return topoC+dupH+'</section>';
    const lin=({f,e})=>{ const p0=e.periodos[0], prog=e.periodos.filter(p=>p.inicioGozo), ultP=e.periodos[e.periodos.length-1];
      return `<tr><td><b>${esc(f.nome)}</b>${norm(f.nome)!==norm(e.nome)?`<small style="display:block;color:var(--muted)">na folha: ${esc(e.nome)}</small>`:''}</td><td class="num">${br(p0.ini)} a ${br(p0.fim)}${e.periodos.length>1?`<small style="display:block;color:var(--muted)">+ ${br(ultP.ini)} a ${br(ultP.fim)}</small>`:''}</td>
        <td class="num">${p0.rest} dias${p0.goz?` <small style="color:var(--muted)">(gozou ${p0.goz})</small>`:''}</td><td class="num">${br(p0.lim)}${e.ferVenc?' <span class="pill warn">vencida</span>':''}</td>
        <td>${prog.map(p=>`<span class="pill ok">${br(p.inicioGozo)} · ${p.diasGozo} dias</span>`).join(' ')||'—'}</td><td class="num">${[p0.faltas?p0.faltas+' falta(s)':'',e.periodos.some(p=>p.afast)?Math.max(...e.periodos.map(p=>p.afast))+' dias afastado':''].filter(Boolean).join(' · ')||'—'}</td></tr>`; };
    return topoC+`<div style="margin-top:14px"><div class="label">CONFERÊNCIA · ${X.enc.length} de ${X.dados.emps.length} funcionário(s) encontrados no cadastro · data base ${br(X.dados.dataBase)}</div>
      ${X.nao.length?`<div class="banner" style="margin-top:8px"><div><b>${X.nao.length} não encontrado(s) no cadastro.</b> Marque quem deve ser cadastrado no RH com os dados do relatório (nome, admissão, código na folha); CPF, função e setor você completa depois.</div>
        <div class="rh-ffi-nao">${X.nao.map((e,i)=>`<label class="ck"><input type="checkbox" data-ffi-cad="${i}" ${X.desm&&X.desm[i]?'':'checked'}> ${esc(e.nome)} <small style="color:var(--muted)">· admissão ${br(e.adm)}</small></label>`).join('')}</div>
        <button class="btn" data-act="rh-ffi-cad" style="margin-top:8px" ${R.salv?'disabled':''}>Cadastrar ${X.nao.filter((e,i)=>!(X.desm&&X.desm[i])).length} no RH</button></div>`:''}
      <div class="rh-tw" style="margin-top:8px"><table class="rh-t"><thead><tr><th>Funcionário</th><th>Período aquisitivo</th><th>Saldo</th><th>Limite p/ gozo</th><th>Programadas na folha</th><th>Faltas · afastamento</th></tr></thead><tbody>${X.enc.map(lin).join('')}</tbody></table></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px"><button class="btn sec" data-act="rh-ffi-x">Cancelar</button><button class="btn" data-act="rh-ffi-ok" ${R.salv?'disabled':''}>${R.salv?'Aplicando…':'Aplicar '+X.enc.length+' funcionário(s)'}</button></div></div></section>`; }
  try{ document.head.insertAdjacentHTML('beforeend','<style id="rh-ffi-css">.rh-ffi-nao{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:4px 16px;margin-top:8px}</style>'); }catch(e){}
  async function rhFolhaCadastra(){ const X=R.ffi; if(!X||R.salv) return; const xs=X.nao.filter((e,i)=>!(X.desm&&X.desm[i])); if(!xs.length) return;
    R.salv=true; P.render(); let n=0;
    try{ for(const e of xs){ const fid=id(), doc={nome:e.nome,tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:e.adm||'',codFolha:e.cod,origem:'folha',criadoEm:agora()};
        await grava(COL.func+'/'+fid,doc); if(!R.func.some(x=>x._id===fid)) R.func.push(Object.assign({_id:fid},doc)); n++; }
      P.toast(n+' funcionário(s) cadastrados. Confira a conferência e aplique.'); }
    catch(err){ P.toast('Não foi possível cadastrar: '+((err&&err.message)||err)); }
    R.salv=false; rhFolhaPrevia(X.dados); }
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||t.dataset.ffiCad==null||!R.ffi) return; R.ffi.desm=R.ffi.desm||{}; R.ffi.desm[+t.dataset.ffiCad]=!t.checked; P.render(); });
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="rh-ffi-cad"]'); if(b) rhFolhaCadastra(); });
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="rh-ffi-ok"],[data-act="rh-ffi-x"]'); if(!b) return; if(b.dataset.act==='rh-ffi-x'){ R.ffi=null; P.render(); } else rhFolhaAplica(); });
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||t.id!=='rh-ffi-file'||!t.files||!t.files[0]) return; const fl=t.files[0]; t.value='';
    try{ P.toast('Lendo o relatório…'); const d=rhFolhaParse(await rhPdfLinhas(fl)); if(!d.emps.length){ P.toast('Não encontrei funcionários nesse PDF. É o relatório "Programação de férias" do sistema de folha?'); return; } rhFolhaPrevia(d); }
    catch(err){ P.toast((err&&err.message)||'Não consegui ler o PDF.'); } });

  /* ---------- Avisos nas TVs (publicados pelo RH; ficam em config/feriados.avisos, que o RH grava e as TVs leem) ---------- */
  R.avs=[]; R.avf=null;
  setInterval(()=>{ try{ if(P.db&&P.db()&&!R._avSub&&P.S.uid){ R._avSub=P.db().doc('config/feriados').onSnapshot(d=>{ const x=(d&&d.exists&&d.data())||{}; R.avs=x.avisos||[]; R.avAuto=x.avisosAuto||[]; R.avAnivOff=!!x.avAnivOff; R.avLido=true; P.rerender(); avAnivSync(); },()=>{ R._avSub=null; }); } }catch(e){} },1500);
  /* parabéns automáticos: aniversariantes de hoje e dos próximos 3 dias viram avisos (só no dia) na faixa das TVs */
  function avAnivLista(){ const h=P.hojeStr(), out=[];
    for(let k=0;k<4;k++){ const dia=addDias(h,k), md=dia.slice(5);
      R.func.filter(f=>f.status!=='Desligado'&&okIso(f.nascimento)&&f.nascimento.slice(5)===md).forEach(f=>{ const w=titulo(f.nome).split(' ').filter(Boolean), nm=w.length>1?w[0]+' '+w[w.length-1]:w[0];
        out.push({id:'aniv-'+f._id+'-'+dia,t:'Parabéns, '+nm+'!',sub:'Feliz aniversário!'+(f.setor?' · '+f.setor:''),tipo:'festa',de:dia,ate:dia,auto:'aniv'}); }); }
    return out; }
  async function avAnivSync(){ try{ if(!R.avLido||!R.func.length||R._avAnivEnv) return; const novo=R.avAnivOff?[]:avAnivLista(), atual=(R.avAuto||[]).filter(a=>a.auto==='aniv');
      const chave=xs=>xs.map(a=>a.id+'|'+a.t+'|'+a.sub).sort().join(';'); if(chave(novo)===chave(atual)) return;
      R._avAnivEnv=true; await P.db().doc('config/feriados').set({avisosAuto:novo},{merge:true}); R.avAuto=novo; }catch(e){ console.warn('[RH] parabéns nas TVs',e); } finally{ R._avAnivEnv=false; } }
  setInterval(()=>{ avAnivSync(); },60000);
  const AVT={info:['Informativo','#3F6F93'],seg:['Segurança','#3C8A63'],festa:['Comemoração','#8C5BA8'],atencao:['Atenção','#B5473F']};
  function avCardRH(){ const h=P.hojeStr(), nomeA=a=>a.t.replace(/^Parabéns, |!$/g,'');
    const aniv={on:!R.avAnivOff,hoje:(R.avAuto||[]).filter(a=>a.de===h).map(nomeA),prox:avAnivLista().filter(a=>a.de>h).map(a=>nomeA(a)+' ('+br(a.de).slice(0,5)+')'),act:'rh-avaniv'};
    if(window.avxRender) return window.avxRender({pre:'rh-av',idp:'rh-av-',avisos:R.avs,form:R.avf,linhas:window.avLinhas?window.avLinhas():[],aniv,hoje:h,compacto:true,autoHoje:R.avAnivOff?[]:(R.avAuto||[]).filter(a=>a.de===h)});
    return '<section class="card"><div class="label">AVISOS NAS TVS</div><div class="sub">Atualize a página para ver os avisos.</div></section>'; }
  /* interruptor dos parabéns automáticos (data-avx-aniv: fora do roteador de cliques, que redesenhava antes do change) */
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset||t.dataset.avxAniv!=='rh-avaniv') return; R.avAnivOff=!t.checked;
    try{ await P.db().doc('config/feriados').set({avAnivOff:R.avAnivOff},{merge:true}); R.avAuto=R.avAuto||[]; await avAnivSync(); P.toast(R.avAnivOff?'Parabéns automáticos desligados.':'Parabéns dos aniversariantes vão passar nas TVs.'); }catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } P.render(); });
  async function avSalva(xs,msg){ R.salv=true; P.render(); try{ await P.db().doc('config/feriados').set({avisos:xs},{merge:true}); R.avs=xs; P.toast(msg); R.avf=null; }catch(e){ P.toast('Não foi possível salvar o aviso: '+((e&&e.message)||e)); } R.salv=false; P.render(); }
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-av"]'); if(!b) return; const a=b.dataset.act, h=P.hojeStr();
    const le=()=>{ const g=(i,d)=>{ const e=document.getElementById(i); return e?e.value:d; }; if(R.avf) Object.assign(R.avf,{t:g('rh-av-t',R.avf.t||''),sub:g('rh-av-s',R.avf.sub||''),de:g('rh-av-de',R.avf.de),ate:g('rh-av-ate',R.avf.ate)}); };
    if(a==='rh-avnovo'){ R.avf={tipo:'info',linhas:[],per:'hoje',de:h,ate:h}; P.render(); return; }
    if(a==='rh-aved'){ const x=R.avs.find(y=>y.id===b.dataset.id); if(!x) return; R.avf=Object.assign({},x,{edit:x.id,linhas:(x.linhas||[]).slice(),per:'datas'}); P.render(); return; }
    if(a==='rh-avln'){ le(); const v=b.dataset.v, L=R.avf.linhas||[]; R.avf.linhas=!v?[]:L.includes(v)?L.filter(x=>x!==v):L.concat([v]); P.render(); return; }
    if(a==='rh-avper'){ le(); R.avf.per=b.dataset.v; if(b.dataset.v!=='datas'){ R.avf.de=h; R.avf.ate=window.avxPer?window.avxPer(b.dataset.v,h):h; } P.render(); return; }
    if(a==='rh-avcanc'){ R.avf=null; P.render(); return; }
    if(a==='rh-avtipo'){ le(); R.avf.tipo=b.dataset.v; P.render(); return; }
    if(a==='rh-avok'){ le(); const F=R.avf; if(String(F.t||'').trim().length<3) return P.toast('Escreva o aviso.'); if(F.ate&&F.de&&F.ate<F.de) return P.toast('A data final é antes da inicial.');
      if(F.per&&F.per!=='datas'){ F.de=h; F.ate=window.avxPer?window.avxPer(F.per,h):h; }
      const novo={id:F.edit||id(),t:F.t.trim(),sub:String(F.sub||'').trim(),tipo:F.tipo||'info',linhas:F.linhas||[],de:F.de||h,ate:F.ate||'',por:eu(),em:agora()};
      avSalva(R.avs.filter(x=>(!x.ate||x.ate>=addDias(h,-30))&&x.id!==novo.id).concat([novo]),F.edit?'Aviso atualizado nas TVs.':'Aviso publicado nas TVs.'); return; }
    if(a==='rh-avx'){ const x=R.avs.find(y=>y.id===b.dataset.id); if(!x||!confirm('Remover o aviso "'+x.t+'" das TVs?')) return; avSalva(R.avs.filter(y=>y.id!==x.id),'Aviso removido das TVs.'); } });
  try{ document.head.insertAdjacentHTML('beforeend','<style id="rh-av-css">.rh-avl{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.rh-avl>i{width:10px;height:100%;min-height:40px;border-radius:5px}.rh-avl b{display:block;font-size:16px}.rh-avl small{display:block;color:var(--muted)}.rh-avf{display:flex;flex-direction:column;gap:12px;margin-top:12px;padding:16px;border-radius:12px;background:var(--sunken,#ECE6D8)}.rh-avan{margin-top:12px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,#8C5BA8 9%,transparent)}.rh-avd{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}</style>'); }catch(e){}

  try{ document.head.insertAdjacentHTML('beforeend',`<style id="rh-mapa2">
.rh-mres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:14px}.rh-mres>div{border-radius:14px;padding:12px 16px;background:var(--sunken,#ECE6D8);display:flex;flex-direction:column;gap:2px}
.rh-mres b{font-size:30px;line-height:1}.rh-mres span{font-weight:700}.rh-mres small{color:var(--muted)}.rh-mres .ag{background:color-mix(in srgb,var(--ok,#2F7A55) 14%,transparent)}.rh-mres .ag b{color:var(--ok-ink,#2F7A55)}.rh-mres .px b{color:var(--teal-strong,#1F5E73)}
.rh-mapa{border:1px solid var(--line);border-radius:14px;padding:6px 0 10px;background:var(--surface,#fff)}
.rh-mr{min-height:40px!important;border-bottom:1px solid color-mix(in srgb,var(--line) 60%,transparent)}.rh-mr .rh-nm{display:flex;flex-direction:column;align-items:flex-start;padding:4px 12px;background:none;border:0;cursor:pointer;font:inherit}.rh-mr .rh-nm>span{font-weight:700;font-size:14px}.rh-mfn{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
.rh-mt{position:relative;height:100%;min-height:34px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/var(--cols,12) - 1px),color-mix(in srgb,var(--line) 80%,transparent) calc(100%/var(--cols,12) - 1px),color-mix(in srgb,var(--line) 80%,transparent) calc(100%/var(--cols,12)))}
.rh-mh{position:sticky;top:0;z-index:2;background:var(--surface,#fff);border-bottom:2px solid var(--line)}.rh-mh .rh-mt{display:grid;grid-template-columns:repeat(12,1fr);background:none}.rh-mh .rh-mt span{text-align:center;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px 0}
.rh-mh .rh-mt span.hj{color:#FFFFFF;background:var(--teal-strong,#1F5E73);border-radius:8px}
.rh-ms{margin:10px 12px 4px;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--teal-strong,#1F5E73);background:var(--teal-wash,#E3EEF2);border-radius:999px;padding:4px 12px}
.rh-mb{top:6px!important;height:24px!important;border-radius:7px!important;background:var(--teal,#2B7A94)!important;display:flex;align-items:center;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.12)}.rh-mb>span{font-size:11px;font-weight:700;color:#FFFFFF;white-space:nowrap;padding:0 7px}
.rh-mb.agora{background:var(--ok,#2F7A55)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--ok,#2F7A55) 30%,transparent)}.rh-mb.foi{background:#9AA7AE!important;opacity:1!important}.rh-mb.conf{background:repeating-linear-gradient(135deg,var(--warn,#B7791F) 0 8px,color-mix(in srgb,var(--warn,#B7791F) 80%,#fff) 8px 16px)!important}
.rh-mhj{width:2px!important;background:var(--crit,#B5473F)!important}.rh-mhj::after{content:"hoje";position:absolute;top:-2px;left:4px;font-size:10px;font-weight:700;color:var(--crit,#B5473F)}
@media (max-width:760px){.rh-mres{grid-template-columns:1fr}}
</style>`); }catch(e){}
  /* ---------- desligamento: corrigir quando a pessoa ainda não saiu (agendar para a data certa ou cancelar) ---------- */
  function deslForm(x){ if(R.desfaz!==x._id) return `<button class="lnk rh-dslk" data-act="rh-desfaz" data-id="${x._id}">${x.status==='Desligado'?'Ainda não foi desligado?':'Mudar data ou cancelar'}</button>`;
    return `<div class="rh-dsf"><label><span class="label">Desliga em</span><input class="txt" type="date" id="rh-dsdata" value="${esc(okIso(x.desligamento)&&x.desligamento>P.hojeStr()?x.desligamento:addDias(P.hojeStr(),1))}"></label>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn rh-sm" data-act="rh-desagenda" data-id="${x._id}">Agendar (fica ativo até lá)</button><button class="btn sec rh-sm" data-act="rh-descancela" data-id="${x._id}">Cancelar desligamento</button><button class="lnk" data-act="rh-desfazx">Fechar</button></div></div>`; }
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-des"]'); if(!b) return; const a=b.dataset.act; if(!['rh-desfaz','rh-desfazx','rh-desagenda','rh-descancela'].includes(a)) return;
    if(a==='rh-desfaz'){ R.desfaz=b.dataset.id; P.render(); return; } if(a==='rh-desfazx'){ R.desfaz=null; P.render(); return; }
    const f=R.func.find(x=>x._id===b.dataset.id); if(!f) return;
    try{ if(a==='rh-desagenda'){ const d=(document.getElementById('rh-dsdata')||{}).value; if(!okIso(d)||d<=P.hojeStr()) return P.toast('Escolha uma data a partir de amanhã.');
        const up={status:'Ativo',desligamento:d,desligAgendado:true}; await grava(COL.func+'/'+f._id,up); Object.assign(f,up); P.toast(f.nome+': continua ativo e será desligado em '+br(d)+'.'); }
      else { if(!confirm('Cancelar o desligamento de '+f.nome+'? Volta a ficar ativo, sem data de saída.')) return; const up={status:'Ativo',desligamento:'',desligAgendado:false,desligMotivo:''}; await grava(COL.func+'/'+f._id,up); Object.assign(f,up); P.toast(f.nome+' voltou a ficar ativo.'); }
      R.desfaz=null; P.render(); }catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } });

  /* ---------- modelos: reconhecer sozinho os dados de um documento já preenchido e trocar pelos campos ---------- */
  function autoCampos(html){ let h=String(html||'').replace(/<span class="rh-tk" data-k="([A-Z_0-9]+)"><\/span>/g,'{$1}').replace(/<span class="rh-tq" data-q="([^"]+)"><\/span>/g,(m,q)=>'{?'+q+'}');
    const txt=()=>h.replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
    const D='(\\d{2}\\/\\d{2}\\/\\d{4}|\\{\\?[^{}]+\\})', troca=(re,f)=>{ h=h.replace(re,f); };
    troca(new RegExp('(firmad[oa]s? em\\s*)'+D,'gi'),(m,a)=>a+'{ADMISSAO}');
    troca(new RegExp('(do dia\\s*)'+D+'(\\s*(?:ao|até o|a) dia\\s*)'+D,'gi'),(m,a,d1,b)=>a+'{SALDO_INICIO}'+b+'{DESLIGAMENTO}');
    troca(new RegExp('(a partir de\\s*|último dia(?: de trabalho)?(?: será)?\\s*(?:em\\s*)?)'+D,'gi'),(m,a)=>a+'{DESLIGAMENTO}');
    troca(new RegExp('((?:prestados|trabalhados|devidos|pagos)[^.<]{0,40}?até\\s*)'+D,'gi'),(m,a)=>a+'{PAGO_ATE}');
    troca(/(Gravata[íi]|Cachoeirinha|Porto Alegre|Canoas|Alvorada|Esteio|Sapucaia do Sul)(\s*\/\s*RS)?\s*,\s*(\d{1,2}\s+de\s+[a-zçãéô]+\s+de\s+\d{4}|\{\?[^{}]+\})/gi,(m,c,r)=>c+(r||'')+', {DATA_HOJE}');
    const reEmp=/ZENITH SOLU[ÇC][ÕO]ES INDUSTRIAIS LTDA|NEXUS MANUTEN[ÇC][ÕO]ES LTDA|COL[A]?FIX IND[ÚU]STRIA E COM[ÉE]RCIO LTDA(?:\s*[–-]\s*EPP)?/i;
    let t=txt(); const iE=t.search(reEmp);
    if(iE>=0){ const cn=(t.slice(iE).match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)||[])[0]; h=h.replace(new RegExp(reEmp.source,'gi'),'{EMPRESA}'); if(cn) h=h.split(cn).join('{CNPJ}'); }
    t=txt(); const mC=t.match(/CONTRATAD[OA]\s*:\s*([^,]{4,120}),/i), mE=t.match(/EMPREGAD[OA]\s*:\s*([^,]{4,120}),/i);
    if(mC&&!/\{/.test(mC[1])){ const raw=mC[1].trim(), mm=raw.match(/^(\d{2}\.\d{3}\.\d{3})\s+(.+)$/), nome=(mm?mm[2]:raw).trim(), ini=t.indexOf(mC[0]), tr=t.slice(ini);
      const cn=(tr.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)||[])[0], cpf=(tr.slice(0,400).match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)||[])[0], end=(tr.match(/(?:com sede|residente(?: e domiciliad[oa])?|domiciliad[oa]) n[ao]\s+(.+?),\s*(?:doravante|neste ato|daqui)/i)||[])[1];
      if(mm) h=h.split(raw).join('{RAZAO_PJ}'); if(nome.length>4) h=h.split(nome).join('{NOME}'); if(cn) h=h.split(cn).join('{CNPJ_PJ}'); if(cpf) h=h.split(cpf).join('{CPF}'); if(end&&end.trim().length>6) h=h.split(end.trim()).join('{ENDERECO}'); }
    else if(mE&&!/\{/.test(mE[1])){ const nome=mE[1].trim(), tr=t.slice(t.indexOf(mE[0])), cpf=(tr.slice(0,400).match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)||[])[0]; if(nome.length>4) h=h.split(nome).join('{NOME}'); if(cpf) h=h.split(cpf).join('{CPF}'); }
    /* assinatura: onde só diz "Contratante"/"Empregador", vai o nome da empresa em cima */
    h=h.replace(/(<(p|td)[^>]*>)\s*(Contratante|CONTRATANTE|Empregador[a]?|EMPREGADOR[A]?)\s*(<\/\2>)/g,(m,a,tg,w,z)=>a+'{EMPRESA}<br>'+w+z);
    return h; }
  window.rhAutoCampos=autoCampos;
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="rh-dauto"]'); if(!b||!R.dm) return; const antes=camposDe(R.dm.html||'').length;
    R.dm.html=limpar(autoCampos(R.dm.html||'')); const dep=camposDe(R.dm.html).length; P.render(); P.toast(dep>antes?(dep-antes)+' campo(s) reconhecido(s). Confira e salve o modelo.':'Não encontrei mais dados para trocar por campos.'); });
  try{ document.head.insertAdjacentHTML('beforeend','<style id="rh-doc-css">.rh-dslk{display:block;font-size:12px;margin-top:2px}.rh-dsf{display:flex;flex-direction:column;gap:6px;margin-top:6px;padding:8px;border-radius:10px;background:var(--sunken)}</style>'); }catch(e){}

  /* ---------- puxar dados de um documento já feito (Word ou PDF com texto) para o cadastro, e guardar o arquivo na pessoa ---------- */
  R.pux=null; R.arqP={};
  const D8=s=>String(s||'').replace(/\D/g,'');
  function extraiDados(t){ t=String(t||'').replace(/\s+/g,' '); const o={}, ach=(k,v)=>{ if(v&&!o[k]) o[k]=String(v).trim().replace(/[.;,]+$/,''); };
    const iC=t.search(/CONTRATAD[OA]\s*:|EMPREGAD[OA]\s*:|PRESTADOR(?:A)?\s*:/i), parte=iC>=0?t.slice(iC,iC+900):t;
    const mN=parte.match(/^(?:CONTRATAD[OA]|EMPREGAD[OA]|PRESTADOR(?:A)?)\s*:\s*([^,]{4,120}),/i); if(mN){ const raw=mN[1].trim(), mm=raw.match(/^(\d{2}\.\d{3}\.\d{3})\s+(.+)$/); ach('nome',(mm?mm[2]:raw)); }
    ach('cnpj',(parte.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)||[])[0]); ach('cpf',(parte.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)||[])[0]);
    const mE=parte.match(/(?:com sede|residente(?: e domiciliad[oa])?|domiciliad[oa]|com endereço)\s+n[ao]\s+(.+?)(?:,\s*CEP\s*([\d.\-]{8,10}))?,\s*(?:doravante|neste ato|daqui|e-?mail|telefone|portador)/i);
    if(mE){ ach('endereco',mE[1].replace(/,\s*CEP\s*[\d.\-]{8,10}/i,'')); ach('cep',mE[2]); }
    ach('cep',(parte.match(/CEP\s*:?\s*(\d{2}\.?\d{3}-?\d{3})/i)||[])[1]);
    ach('telefone',(parte.match(/(?:telefone|fone|celular|whats(?:app)?)\s*:?\s*(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/i)||[])[1]);
    ach('nascimento',(parte.match(/nascid[oa] em\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]);
    ach('admissao',(t.match(/(?:firmad[oa]s? em|in[íi]cio (?:em|no dia)|com in[íi]cio em|a partir de)\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]);
    ach('pix',(t.match(/chave\s*(?:PIX)?\s*(?:PIX)?\s*:?\s*([^\s,;]{6,60})/i)||[])[1]);
    const mB=t.match(/Banco\s*:?\s*([A-Za-zÀ-ú .]{2,40}?)\s*[,\-–]\s*Ag[êe]ncia\s*:?\s*([\d\-]+)\s*[,\-–]\s*(?:Conta(?: Corrente)?)\s*:?\s*([\d\-xX.]+)/i);
    if(mB) ach('banco','Banco '+mB[1].trim()+' · Ag. '+mB[2]+' · Conta '+mB[3]);
    return o; }
  window.rhExtraiDados=extraiDados;
  const PUX_ROT={cnpj:'CNPJ',cpf:'CPF',endereco:'Endereço',cep:'CEP',telefone:'Telefone',nascimento:'Nascimento',admissao:'Admissão / início do contrato',banco:'Banco',pix:'PIX'};
  async function textoDoArquivo(file){ const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(ext==='docx'){ if(!window.mammoth) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'); return (await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value||''; }
    if(ext==='pdf') return (await rhPdfLinhas(file)).join('\n');
    throw new Error('Use um arquivo Word (.docx) ou PDF.'); }
  async function puxaDe(fid,file,texto){ const f=R.func.find(x=>x._id===fid); if(!f) return;
    try{ if(file&&file.size>8*1024*1024) return P.toast('Arquivo grande demais (máximo 8 MB).'); if(texto==null){ P.toast('Lendo '+file.name+'…'); texto=await textoDoArquivo(file); }
      const d=extraiDados(texto), cur={cnpj:f.cnpj?fCNPJ(f.cnpj):'',cpf:f.cpf?fCPF(f.cpf):'',endereco:f.endereco||'',cep:f.cep||'',telefone:f.telefone||'',nascimento:br(f.nascimento),admissao:br(f.admissao),banco:f.banco||'',pix:f.pix||''};
      const achados=Object.keys(PUX_ROT).filter(k=>d[k]).map(k=>{ const igual=(k==='cnpj'||k==='cpf'||k==='cep'||k==='telefone')?D8(d[k])===D8(cur[k]):norm(d[k])===norm(cur[k]); return {k,rot:PUX_ROT[k],novo:d[k],atual:cur[k],igual,marcado:!igual&&!cur[k]}; });
      const outroNome=d.nome&&norm(d.nome)!==norm(f.nome)&&!norm(d.nome).includes(norm(f.nome).split(' ')[0])?d.nome:'';
      let arq=null; if(file){ const b64=await new Promise((ok,er)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]); r.onerror=er; r.readAsDataURL(file); }); arq={nome:file.name,b64,mime:file.type||'application/octet-stream'}; }
      R.pux={fid,achados,outroNome,arq}; P.render(); if(!achados.length) P.toast('Não encontrei dados no documento (ele tem texto? foto/escaneado não dá para ler).'); }
    catch(e){ P.toast((e&&e.message)||'Não consegui ler o arquivo.'); } }
  window.rhPuxaTexto=(fid,texto)=>puxaDe(fid,null,texto);
  async function arqsDa(fid,forca){ if(R.arqP[fid]&&!forca) return; R.arqP[fid]=R.arqP[fid]||[]; try{ const q=await P.db().collection(COL.lista).where('funcId','==',fid).limit(50).get(); R.arqP[fid]=q.docs.map(x=>Object.assign({_id:x.id},x.data())).filter(x=>x.tipo==='docpessoa').sort((a,b)=>String(b.em).localeCompare(String(a.em))); P.render(); }catch(e){ console.warn('[RH] documentos guardados',e); } }
  function puxaBloco(fid){ setTimeout(()=>arqsDa(fid),0); const X=R.pux&&R.pux.fid===fid?R.pux:null, gs=R.arqP[fid]||[];
    const lista=gs.length?`<div style="margin-top:8px"><span class="label">GUARDADOS</span>${gs.slice(0,8).map(a=>`<div class="rh-dl"><div><b>${esc(a.nome||'Documento')}</b><small>guardado em ${dmIso(a.em)}/${String(a.em||'').slice(0,4)}${a.porNome?' por '+esc(a.porNome):''}</small></div><button class="lnk" data-act="rh-puxver" data-id="${a._id}">Ver</button></div>`).join('')}</div>`:'';
    const conf=X?`<div class="rh-pux"><b>Dados encontrados no documento</b>${X.outroNome?`<div class="banner" style="margin:6px 0">Atenção: o documento parece ser de <b>${esc(X.outroNome)}</b>.</div>`:''}
      ${X.achados.length?`<table class="rh-t" style="margin-top:6px"><thead><tr><th></th><th>Campo</th><th>No documento</th><th>No cadastro</th></tr></thead><tbody>${X.achados.map((a,i)=>`<tr><td>${a.igual?'<span class="pill ok">igual</span>':`<input type="checkbox" data-pux="${i}" ${a.marcado?'checked':''} aria-label="Trazer ${esc(a.rot)}">`}</td><td>${esc(a.rot)}</td><td><b>${esc(a.novo)}</b></td><td>${a.atual?esc(a.atual):'<span class="sub" style="margin:0">vazio</span>'}</td></tr>`).join('')}</tbody></table>`:'<div class="sub">Nenhum dado reconhecido.</div>'}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap"><button class="btn sec rh-sm" data-act="rh-puxx">Cancelar</button><button class="btn rh-sm" data-act="rh-puxok" ${R.salv?'disabled':''}>${X.achados.some(a=>a.marcado)?'Trazer marcados e guardar o documento':'Só guardar o documento'}</button></div></div>`:'';
    return `<div class="rh-puxw"><label class="lnk" style="cursor:pointer">Puxar dados de um documento já feito<input type="file" data-rh-pux="${fid}" accept=".docx,.pdf" hidden></label>${conf}${lista}</div>`; }
  document.addEventListener('change',ev=>{ const t=ev.target; if(t&&t.dataset){ if(t.dataset.rhPux&&t.files&&t.files[0]){ const f=t.files[0]; t.value=''; puxaDe(t.dataset.rhPux,f); } else if(t.dataset.pux!=null&&R.pux){ R.pux.achados[+t.dataset.pux].marcado=t.checked; P.render(); } } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-pux"]'); if(!b) return; const a=b.dataset.act;
    if(a==='rh-puxx'){ R.pux=null; P.render(); return; }
    if(a==='rh-puxver'){ try{ await abrirArquivo(b.dataset.id); }catch(e){ P.toast((e&&e.message)||'Não consegui abrir.'); } return; }
    if(a==='rh-puxok'){ const X=R.pux, f=X&&R.func.find(x=>x._id===X.fid); if(!f||R.salv) return; R.salv=true; P.render();
      try{ const up={}; X.achados.filter(x=>x.marcado&&!x.igual).forEach(x=>{ const v=x.novo; up[x.k]=(x.k==='cnpj'||x.k==='cpf')?D8(v):(x.k==='admissao'||x.k==='nascimento')?(v.split('/').reverse().join('-')):v; });
        if(Object.keys(up).length){ await grava(COL.func+'/'+f._id,up); Object.assign(f,up); }
        if(X.arq) await salvarArquivo({funcId:f._id,funcionario:f.nome,nome:X.arq.nome,mime:X.arq.mime,tipo:'docpessoa'},X.arq.b64);
        P.toast((Object.keys(up).length?Object.keys(up).length+' dado(s) trazido(s) para o cadastro':'Cadastro mantido')+(X.arq?' · documento guardado':'')+'.'); R.pux=null; await arqsDa(f._id,true); }
      catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } R.salv=false; P.render(); } });
  try{ document.head.insertAdjacentHTML('beforeend','<style id="rh-pux-css">.rh-puxw{margin-top:10px;padding-top:8px;border-top:1px solid var(--line)}.rh-pux{margin-top:8px;padding:12px;border-radius:12px;background:var(--sunken)}</style>'); }catch(e){}

  /* ---------- Exames (ASO) e treinamentos (NRs) dos funcionários, com vencimento ---------- */
  const QTIPOS=[['ASO','ASO periódico',12],['ASO_ADM','ASO admissional',0],['NR-06','NR-06 · EPI',12],['NR-10','NR-10 · eletricidade',24],['NR-11','NR-11 · empilhadeira e transporte',12],['NR-12','NR-12 · máquinas',24],['NR-20','NR-20 · inflamáveis',12],['NR-33','NR-33 · espaço confinado',12],['NR-35','NR-35 · trabalho em altura',24],['BRIG','Brigada de incêndio',12],['OUTRO','Outro',12]];
  const qNome=q=>q.tipo==='OUTRO'?(q.nome||'Outro'):((QTIPOS.find(t=>t[0]===q.tipo)||[0,q.tipo])[1]);
  const quals=f=>(f.qualif||[]).filter(q=>!q.removido);
  function qSit(q){ const h=P.hojeStr(); if(!okIso(q.validade)) return {c:'ok',t:'sem vencimento',d:9999}; const d=diasEntre(h,q.validade);
    return d<0?{c:'crit',t:'Vencido há '+plural(-d,'dia','dias'),d}:d<=30?{c:'warn',t:d===0?'Vence hoje':'Vence em '+plural(d,'dia','dias'),d}:{c:'ok',t:'Em dia até '+br(q.validade),d}; }
  /* o mais recente de cada tipo é o que vale (os anteriores ficam como histórico) */
  const qAtuais=f=>{ const m={}; quals(f).forEach(q=>{ const k=q.tipo==='OUTRO'?'O:'+norm(q.nome||''):q.tipo; if(!m[k]||String(q.data||'')>String(m[k].data||'')) m[k]=q; }); return Object.values(m); };
  const qAtencao=()=>ativos().flatMap(f=>qAtuais(f).map(q=>({f,q,s:qSit(q)}))).filter(o=>o.s.c!=='ok').sort((a,b)=>a.s.d-b.s.d);
  function qualBloco(fid){ const f=R.func.find(x=>x._id===fid); if(!f) return ''; const F=R.qf&&R.qf.fid===fid?R.qf:null, xs=qAtuais(f).sort((a,b)=>qSit(a).d-qSit(b).d);
    const lista=xs.length?xs.map(q=>{ const s=qSit(q); return `<div class="rh-dl"><div><b>${esc(qNome(q))}</b><small>feito em ${br(q.data)}${okIso(q.validade)?' · vence '+br(q.validade):''}</small></div><span style="display:flex;gap:8px;align-items:center"><span class="pill ${s.c==='ok'?'ok':s.c}">${esc(s.t)}</span>${q.arqId?`<button class="lnk" data-act="rh-puxver" data-id="${q.arqId}">Ver</button>`:''}<button class="lnk" data-act="rh-qx" data-f="${fid}" data-id="${q.id}" aria-label="Remover">✕</button></span></div>`; }).join(''):'<div class="sub" style="margin:4px 0 0">Nenhum exame ou treinamento registrado.</div>';
    const tsel=F?F.tipo:'ASO', meses=(QTIPOS.find(t=>t[0]===tsel)||[0,0,12])[2], dt=F&&F.data||P.hojeStr();
    const form=F?`<div class="rh-pux"><div class="rh-g" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        <label><span class="label">Tipo</span><select class="txt" id="rh-q-tipo">${QTIPOS.map(([k,n])=>`<option value="${k}" ${tsel===k?'selected':''}>${n}</option>`).join('')}</select></label>
        ${tsel==='OUTRO'?`<label><span class="label">Qual</span><input class="txt" id="rh-q-nome" value="${esc(F.nome||'')}" placeholder="Ex.: Primeiros socorros"></label>`:''}
        <label><span class="label">Feito em</span><input class="txt" type="date" id="rh-q-data" value="${esc(dt)}"></label>
        <label><span class="label">Vence em ${meses?'<small>(+'+meses+' meses)</small>':''}</span><input class="txt" type="date" id="rh-q-val" value="${esc(F.validade!=null?F.validade:(meses?addDias(addMeses(dt,meses),-1):''))}"></label></div>
      <label class="lnk" style="cursor:pointer;display:inline-block;margin-top:8px">${F.arq?'✓ '+esc(F.arq.nome):'Anexar certificado ou ASO (opcional)'}<input type="file" id="rh-q-arq" accept=".pdf,image/*" hidden></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn sec rh-sm" data-act="rh-qcanc">Cancelar</button><button class="btn rh-sm" data-act="rh-qok" ${R.salv?'disabled':''}>Salvar</button></div></div>`:'';
    if(R.qf&&R.qf.aba&&R.qf.fid===fid&&!R.qf._ab){ R.qf._ab=true; }
    return `<div class="rh-puxw"><div class="rh-ch"><span class="label">EXAMES E TREINAMENTOS</span>${F?'':`<button class="lnk" data-act="rh-qnovo" data-f="${fid}">+ Registrar</button>`}</div>${form}${lista}</div>`; }
  function vQualif(){ const tod=R.qall, xs=tod?ativos().flatMap(f=>qAtuais(f).map(q=>({f,q,s:qSit(q)}))).sort((a,b)=>a.s.d-b.s.d):qAtencao();
    const sem=ativos().filter(f=>!qAtuais(f).some(q=>q.tipo==='ASO'||q.tipo==='ASO_ADM'));
    const reg=R.qf&&R.qf.aba?`<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Registrar exame ou treinamento</h2><button class="lnk" data-act="rh-qcanc">Fechar</button></div>
      <label><span class="label">Funcionário</span><select class="txt" id="rh-q-pess"><option value="">Escolha a pessoa…</option>${ativos().slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(f=>`<option value="${f._id}" ${R.qf.fid===f._id?'selected':''}>${esc(f.nome)}</option>`).join('')}</select></label>${R.qf.fid?qualBloco(R.qf.fid):''}</section>`:'';
    return reg+`<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px"><span></span><button class="btn" data-act="rh-qreg">+ Registrar exame ou treinamento</button></div><div class="rh-chips" style="margin-bottom:10px"><button class="rh-chip2" data-act="rh-qall" data-v="" aria-pressed="${!tod}">Precisam de atenção · ${qAtencao().length}</button><button class="rh-chip2" data-act="rh-qall" data-v="1" aria-pressed="${!!tod}">Todos</button></div>
      ${xs.length?`<div class="rh-tw"><table class="rh-t"><thead><tr><th>Funcionário</th><th>Exame / treinamento</th><th>Feito em</th><th>Vence em</th><th>Situação</th></tr></thead><tbody>${xs.map(({f,q,s})=>`<tr><td><button class="lnk" data-act="rh-pess" data-id="${f._id}"><b>${esc(f.nome)}</b></button><small style="display:block;color:var(--muted)">${esc([f.funcao,f.setor].filter(Boolean).join(' · '))}</small></td><td>${esc(qNome(q))}</td><td class="num">${br(q.data)}</td><td class="num">${okIso(q.validade)?br(q.validade):'—'}</td><td><span class="pill ${s.c==='ok'?'ok':s.c}">${esc(s.t)}</span> <button class="lnk" data-act="rh-qrenova" data-f="${f._id}" data-t="${esc(q.tipo)}" data-n="${esc(q.nome||'')}">Renovar</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${tod?'Nenhum exame ou treinamento registrado ainda.':'Nada vencido nem vencendo nos próximos 30 dias.'}</div>`}
      ${sem.length?`<div class="banner" style="margin-top:12px">${plural(sem.length,'pessoa','pessoas')} sem ASO registrado: ${sem.slice(0,8).map(f=>esc(titulo(f.nome).split(' ')[0])).join(', ')}${sem.length>8?' e mais '+(sem.length-8):''}. Registre no cadastro de cada um (Funcionários → Editar → Exames e treinamentos).</div>`:''}</section>`; }
  avRH(()=>{ const g={}; qAtencao().forEach(o=>{ (g[o.f._id]=g[o.f._id]||{f:o.f,xs:[]}).xs.push(o); }); return Object.values(g).map(({f,xs})=>{ const crit=xs.some(o=>o.s.c==='crit'); return {nivel:crit?'crit':'warn',rotulo:crit?'Vencido':'Atenção',titulo:'Exames/NRs: '+f.nome,texto:xs.map(o=>qNome(o.q)+' · '+o.s.t.toLowerCase()).join(' · '),go:'rhferias'}; }); });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!R.qf) return;
    if(t.id==='rh-q-pess'){ R.qf.fid=t.value; P.render(); return; }
    if(t.id==='rh-q-tipo'){ R.qf.tipo=t.value; R.qf.validade=null; P.render(); } else if(t.id==='rh-q-data'){ R.qf.data=t.value; R.qf.validade=null; P.render(); } else if(t.id==='rh-q-val'){ R.qf.validade=t.value; } else if(t.id==='rh-q-nome'){ R.qf.nome=t.value; }
    else if(t.id==='rh-q-arq'&&t.files&&t.files[0]){ const fl=t.files[0]; if(fl.size>8*1024*1024) return P.toast('Arquivo grande demais (máximo 8 MB).'); const r=new FileReader(); r.onload=()=>{ R.qf.arq={nome:fl.name,mime:fl.type||'application/pdf',b64:String(r.result).split(',')[1]}; P.render(); }; r.readAsDataURL(fl); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-q"]'); if(!b) return; const a=b.dataset.act;
    if(a==='rh-qall'){ R.qall=!!b.dataset.v; P.render(); return; }
    if(a==='rh-qnovo'){ R.qf={fid:b.dataset.f,tipo:'ASO',data:P.hojeStr(),validade:null}; P.render(); return; }
    if(a==='rh-qcanc'){ R.qf=null; P.render(); return; }
    if(a==='rh-qx'){ const f=R.func.find(x=>x._id===b.dataset.f); if(!f||!confirm('Remover este registro?')) return; const qs=(f.qualif||[]).map(q=>q.id===b.dataset.id?Object.assign({},q,{removido:true}):q); await grava(COL.func+'/'+f._id,{qualif:qs}); f.qualif=qs; P.render(); return; }
    if(a==='rh-qok'){ const F=R.qf, f=F&&R.func.find(x=>x._id===F.fid); if(!f||R.salv) return; const g=i=>(document.getElementById(i)||{}).value||'';
      F.data=g('rh-q-data'); F.validade=g('rh-q-val'); if(F.tipo==='OUTRO') F.nome=g('rh-q-nome').trim(); if(!okIso(F.data)) return P.toast('Informe a data em que foi feito.'); if(F.tipo==='OUTRO'&&!F.nome) return P.toast('Diga qual exame ou treinamento.');
      R.salv=true; P.render();
      try{ let arqId=null; if(F.arq) arqId=await salvarArquivo({funcId:f._id,funcionario:f.nome,nome:F.arq.nome,mime:F.arq.mime,tipo:'qualif'},F.arq.b64);
        const q={id:id(),tipo:F.tipo,nome:F.tipo==='OUTRO'?F.nome:'',data:F.data,validade:okIso(F.validade)?F.validade:'',arqId,em:agora(),por:eu()}; const qs=(f.qualif||[]).concat([q]);
        await grava(COL.func+'/'+f._id,{qualif:qs}); f.qualif=qs; R.qf=null; P.toast(qNome(q)+' registrado'+(q.validade?' · vence em '+br(q.validade):'')+'.'); }
      catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } R.salv=false; P.render(); } });

  /* ajuste da troca do PJ: intervalo (meses), próxima troca à mão e remover troca registrada por engano */
  function formPJAj(){ const f=R.func.find(x=>x._id===R.pjaj); if(!f) return ''; const hs=(f.trocas||[]).map((t,i)=>({t,i})).reverse(), s=pjSit(f);
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Ajustar a troca de ${esc(f.nome)}</h2><button class="lnk" data-act="rh-pjajx">Fechar</button></div>
      <div class="rh-g"><label><span class="label">Trocar a cada</span><select class="txt" id="rh-pjm">${[1,2,3,4,6,12].map(m=>`<option value="${m}" ${(+f.pjMeses||3)===m?'selected':''}>${m===1?'1 mês':m+' meses'}</option>`).join('')}</select></label>
        <label><span class="label">Próxima troca em (opcional)</span><input class="txt" type="date" id="rh-pjpx" value="${esc(okIso(f.pjProx)?f.pjProx:'')}"></label></div>
      <div class="sub" style="margin:8px 0 0">Hoje a próxima troca está em <b>${s.prox?br(s.prox):'—'}</b>. Deixe a data em branco para seguir o intervalo a partir da última troca. Ao registrar uma troca, a data marcada à mão deixa de valer.</div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" data-act="rh-pjajok" data-id="${f._id}">Salvar ajuste</button></div>
      ${hs.length?`<div class="label" style="margin-top:14px">TROCAS REGISTRADAS</div>${hs.map(({t,i})=>`<div class="rh-dl"><div><b>${br(t.data)}</b><small>${esc([t.obs,t.porNome].filter(Boolean).join(' · '))}</small></div><button class="lnk" data-act="rh-pjrm" data-id="${f._id}" data-i="${i}" style="color:var(--crit-ink)">Remover</button></div>`).join('')}`:''}</section>`; }
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-pjaj"],[data-act="rh-pjrm"],[data-act^="rh-map"],[data-act="rh-maptodos"],[data-act="rh-qreg"],[data-act="rh-qrenova"]'); if(!b) return; const a=b.dataset.act;
    if(a==='rh-mapzoom'){ R.mapZoom=b.dataset.v; P.render(); return; } if(a==='rh-maptodos'){ R.mapTodos=!R.mapTodos; P.render(); return; }
    if(a==='rh-mapmes'){ R.mapIni=addMeses(R.mapIni||P.hojeStr().slice(0,8)+'01',+b.dataset.v); P.render(); return; }
    if(a==='rh-qreg'){ R.qf={fid:'',tipo:'ASO',data:P.hojeStr(),validade:null,aba:true}; P.render(); return; }
    if(a==='rh-qrenova'){ R.qf={fid:b.dataset.f,tipo:b.dataset.t,nome:b.dataset.n||'',data:P.hojeStr(),validade:null,aba:true}; P.render(); window.scrollTo(0,0); return; }
    if(a==='rh-pjaj'){ R.pjaj=b.dataset.id; R.fpj=null; P.render(); return; } if(a==='rh-pjajx'){ R.pjaj=null; P.render(); return; }
    const f=R.func.find(x=>x._id===b.dataset.id); if(!f) return;
    try{ if(a==='rh-pjajok'){ const up={pjMeses:+(document.getElementById('rh-pjm')||{}).value||3,pjProx:(document.getElementById('rh-pjpx')||{}).value||''}; await grava(COL.func+'/'+f._id,up); Object.assign(f,up); P.toast('Troca de '+f.nome+' ajustada · próxima em '+br(pjSit(f).prox)+'.'); }
      if(a==='rh-pjrm'){ const i=+b.dataset.i, t=(f.trocas||[])[i]; if(!t||!confirm('Remover a troca de '+br(t.data)+'?')) return; const ts=(f.trocas||[]).filter((_,k)=>k!==i), ult=ts.map(x=>x.data).filter(okIso).sort().pop()||''; const up={trocas:ts,ultimaTroca:ult}; await grava(COL.func+'/'+f._id,up); Object.assign(f,up); P.toast('Troca removida.'); }
    }catch(e){ P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } P.render(); });
  /* gerar documento: preencher o que falta (só neste documento) e editar o texto antes de imprimir */
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!R.dg) return;
    if(t.dataset&&t.dataset.rhDo){ R.dg.over=R.dg.over||{}; R.dg.over[t.dataset.rhDo]=t.value; clearTimeout(R._do); R._do=setTimeout(()=>{ const k=t.dataset.rhDo; P.render(); const n=document.querySelector('[data-rh-do="'+k+'"]'); if(n&&n.type!=='date'){ n.focus(); try{ n.setSelectionRange(n.value.length,n.value.length); }catch(e){} } },400); return; }
    if(t.id==='rh-dgdoc'&&R.dg.edOn){ R.dg.edHtml=t.innerHTML; } },true);
  document.addEventListener('change',ev=>{ const t=ev.target; if(t&&(t.id==='rh-dgf'||t.id==='rh-dgm')&&R.dg){ R.dg.over={}; R.dg.edHtml=null; R.dg.edOn=false; } },true);
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="rh-dged"],[data-act="rh-dgedx"]'); if(!b||!R.dg) return;
    const f=R.func.find(x=>x._id===R.dg.funcId), md=R.modelos.find(x=>x._id===R.dg.modeloId); if(!f||!md) return;
    if(b.dataset.act==='rh-dgedx'){ if(!confirm('Desfazer as edições do texto e voltar ao modelo preenchido?')) return; R.dg.edHtml=null; R.dg.edOn=false; P.render(); return; }
    if(R.dg.edOn){ const d=document.getElementById('rh-dgdoc'); if(d) R.dg.edHtml=d.innerHTML; R.dg.edOn=false; P.render(); P.toast('Texto editado. Agora é só imprimir, salvar o PDF ou baixar em Word.'); return; }
    if(!dgEditado(f,md)){ R.dg.edHtml=docCorpo(f,md,true)+assinaturas(f); R.dg.edKey=dgKey(f,md); }
    R.dg.edOn=true; P.render(); setTimeout(()=>{ const d=document.getElementById('rh-dgdoc'); if(d) d.focus(); },50); });
  try{ document.head.insertAdjacentHTML('beforeend','<style id="rh-dged-css">.rh-editando{outline:3px solid var(--teal);outline-offset:4px;cursor:text}.rh-editando:focus{outline-color:var(--teal-strong)}</style>'); }catch(e){}
  /* modelo padrão de Aviso de Férias (CLT art. 135: comunicar com 30 dias de antecedência), criado na primeira vez que precisar */
  async function avisoFeriasPadrao(){ const ja=R.modelos.find(m=>m.padraoFerias); if(ja) return ja._id;
    const txt=`<h2 style="text-align:center">AVISO DE FÉRIAS</h2>
<p>{EMPRESA}, inscrita no CNPJ {CNPJ}, comunica ao(à) empregado(a) <b>{NOME}</b>, CPF {CPF}, função {FUNCAO}, que, nos termos do art. 135 da Consolidação das Leis do Trabalho, suas férias relativas ao período aquisitivo de {PERIODO_AQUISITIVO} serão concedidas de <b>{FERIAS_INICIO}</b> a <b>{FERIAS_FIM}</b>, num total de <b>{FERIAS_DIAS} dias</b>, devendo retornar ao trabalho em <b>{FERIAS_RETORNO}</b>.</p>
<p>Gravataí, {DATA_HOJE}.</p><p>&nbsp;</p>
<table style="width:100%"><tr><td style="width:50%;text-align:center">______________________________<br>{EMPRESA}</td><td style="width:50%;text-align:center">______________________________<br>{NOME}</td></tr></table>
<p>&nbsp;</p><p>Ciente em ____/____/________</p>`;
    const mid=id(); const d={nome:'Aviso de férias (padrão)',html:limpar(txt),padraoFerias:true,criadoEm:agora(),porNome:eu()};
    await P.db().doc(COL.modelos+'/'+mid).set(d); if(!R.modelos.some(m=>m._id===mid)) R.modelos.push(Object.assign({_id:mid},d)); P.toast('Criado o modelo "Aviso de férias (padrão)". Você pode editá-lo em Documentos e contratos → Modelos.'); return mid; }
  P.registrarModulo({ id:'rh', nome:'RH', ic:'equipe', telas:TELAS, iniciar });
  P.registrarPerfil('rh',{ nome:'RH (funcionários, fichas, documentos, terceirizados)', mods:['rh'], soVer:true, pos:2, desc:'Só o módulo RH: funcionários, fichas de EPI e uniforme do mês, documentos e contratos, funções e EPIs e terceirizados. Não vê nem muda nada da fábrica.' });
  /* quem só tem o RH vê as telas do RH na barra lateral (como no exemplo), no lugar da lista de módulos */
  function navSolo(){ const ms=P.modsVis?P.modsVis():[], solo=ms.length===1&&ms[0]==='rh'&&!!TELAS[P.S.view]; document.body.classList.toggle('rh-solo',solo); if(!solo) return;
    const nl=document.getElementById('navlist'); if(!nl) return; const h=Object.keys(TELAS).filter(v=>P.viewOk(v)&&TELAS[v].menu!==false).map(v=>`<button class="navbtn" data-go="${v}" ${P.S.view===v?'aria-current="page"':''}>${esc(TELAS[v].nome)}</button>`).join('');
    if(nl.dataset.rh!==h){ nl.dataset.rh=h; nl.innerHTML=h; } const lb=nl.previousElementSibling; if(lb&&lb.classList.contains('modulo')) lb.textContent='RH'; }
  { const nl=document.getElementById('navlist'); if(nl&&window.MutationObserver) new MutationObserver(()=>{ if(document.body.classList.contains('rh-solo')&&!nl.querySelector('[data-go^="rh"]')){ nl.dataset.rh=''; navSolo(); } }).observe(nl,{childList:true}); }
  /* a prévia da ficha (A4 deitado) é encolhida para caber no cartão */
  function pvAjusta(){ document.querySelectorAll('.rh-pv iframe').forEach(fr=>{ const w=fr.parentElement.clientWidth; if(w) fr.style.transform='scale('+(w/1123)+')'; }); }
  addEventListener('resize',pvAjusta);

  /* ---------- ações ---------- */
  const val=(sel)=>{ const o={}; document.querySelectorAll(sel).forEach(e=>{ const k=e.dataset.rhF||e.dataset.rhFf; o[k]=e.value; }); return o; };
  const lerItens=()=>{ const o={epis:[],uniformes:[]}; document.querySelectorAll('[data-rh-it]').forEach(e=>{ const k=e.dataset.rhIt, i=+e.dataset.i; o[k][i]=o[k][i]||{}; o[k][i][e.dataset.c]=e.value.trim(); }); ['epis','uniformes'].forEach(k=>o[k]=o[k].filter(x=>x&&x.nome)); return o; };
  const grava=async(path,d)=>P.db().doc(path).set(Object.assign(d,{alteradoEm:agora(),alteradoPor:P.S.uid||null,alteradoNome:eu()}),{merge:true});
  const busca=(inp,set)=>{ clearTimeout(R._t); R._t=setTimeout(()=>{ set(); P.render(); const n=document.getElementById(inp); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } },250); };
  document.addEventListener('input',ev=>{ const t=ev.target;
    if(t.id==='rh-q'){ const v=t.value; busca('rh-q',()=>{ R.filtro.q=v; }); }
    if(t.id==='rh-fq'){ const v=t.value; busca('rh-fq',()=>{ R.ffil.q=v; R.ffil.n=60; }); }
    if(t.id==='rh-bus'){ const v=t.value; busca('rh-bus',()=>{ R.buscaIni=v; }); }
    if(t.id==='rh-ed'||t.id==='rh-dnome') edSync();
    if(t.id==='rh-dnome'&&R.dm&&!R.dm.deslUser){ const dd=document.getElementById('rh-ddesl'); if(dd) dd.checked=modeloDesliga(R.dm); }
    if(t.dataset&&t.dataset.rhDq!=null){ const md=R.modelos.find(x=>x._id===R.dg.modeloId), q=md&&perguntasDe(md.html)[+t.dataset.rhDq]; if(q!=null) R.dg.resp[q]=t.value; clearTimeout(R._dx); R._dx=setTimeout(()=>{ const a=document.activeElement, k=a&&a.dataset&&a.dataset.rhDq, pos=a&&a.selectionStart; P.render(); if(k!=null){ const n2=document.querySelector('[data-rh-dq="'+k+'"]'); if(n2){ n2.focus(); try{ n2.setSelectionRange(pos,pos); }catch(e){} } } },400); }
    if(t.dataset&&t.dataset.rhAj&&R.fajs){ R.fajs.v[t.dataset.rhAj]=t.value; const k=t.dataset.rhAj; clearTimeout(R._aj); R._aj=setTimeout(()=>{ P.render(); const n2=document.querySelector('[data-rh-aj="'+k+'"]'); if(n2){ n2.focus(); } },600); }
    if(t.id==='rh-ferd'&&R.ffer){ R.ffer.dias=t.value; clearTimeout(R._fd); R._fd=setTimeout(()=>{ P.render(); const n2=document.getElementById('rh-ferd'); if(n2){ n2.focus(); } },500); }
    if(t.id==='rh-pjo'&&R.fpj) R.fpj.obs=t.value;
    if(t.dataset&&t.dataset.rhDx){ R.dg.extra[t.dataset.rhDx]=t.value; clearTimeout(R._dx); R._dx=setTimeout(()=>{ const a=document.activeElement, k=a&&a.dataset&&a.dataset.rhDx, pos=a&&a.selectionStart; P.render(); if(k){ const n=document.querySelector('[data-rh-dx="'+k+'"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } } },400); } });
  /* no editor, Enter cria parágrafo normal */
  document.addEventListener('focusin',ev=>{ if(ev.target&&ev.target.id==='rh-ed') try{ document.execCommand('defaultParagraphSeparator',false,'p'); }catch(e){} });
  /* os botões do editor não tiram o cursor do texto */
  document.addEventListener('mousedown',ev=>{ if(ev.target.closest&&ev.target.closest('.rh-tb button,.rh-tkb')) ev.preventDefault(); });
  document.addEventListener('input',ev=>{ const t=ev.target; if(t&&t.matches&&t.matches('[data-cadq]')){ R.cadq[R.cad]=t.value; cadFiltra(); } });
  document.addEventListener('change',async ev=>{ const t=ev.target;
    if(t&&t.dataset&&t.dataset.rhIt==='epis'&&t.dataset.c==='nome'){ const e=epiCat(t.value), ca=document.querySelector(`[data-rh-it="epis"][data-i="${t.dataset.i}"][data-c="ca"]`); if(e&&ca&&!ca.value) ca.value=e.ca||''; return; }
    try{
      if(t.dataset&&t.dataset.rhFil){ R.filtro[t.dataset.rhFil]=t.value; P.render(); return; }
      if(t.id==='rh-pgm'&&R.perg){ R.perg.mes=t.value; P.render(); return; }
      if(t.id==='rh-pgs'&&R.perg){ R.perg.setor=t.value; P.render(); return; }
      if(t.id==='rh-desf'&&R.fdesl){ R.fdesl.funcId=t.value; P.render(); return; }
      if(t.dataset&&t.dataset.rhVaga!=null){ const v=Object.assign({},vagas()), n=Math.max(0,Math.min(50,parseInt(t.value,10)||0)); if(n) v[t.dataset.rhVaga]=n; else delete v[t.dataset.rhVaga]; try{ await P.db().doc('rh/config').set({vagas:v,alteradoEm:agora()},{merge:true}); R.cfg.vagas=v; P.toast('Vagas salvas.'); }catch(e){ P.erro(e); } return; }
      if(t.dataset&&(t.dataset.rhF==='status'||t.dataset.rhF==='tipo'||t.dataset.rhF==='empresaSel')&&R.f){ Object.assign(R.f,val('[data-rh-f]')); P.render(); return; }
      if(t.id==='rh-imp'&&t.files&&t.files[0]){ await importar(t.files[0]); t.value=''; return; }
      if(t.id==='rh-dvale') { edSync(); return; }
      if(t.id==='rh-ddesl'&&R.dm){ R.dm.deslUser=true; R.dm.desliga=t.checked; return; }
      if(t.id==='rh-dgf'){ R.dg.funcId=t.value; R.dg.extra={}; R.dg.feriasId=''; R.dg.reg=null; P.render(); return; }
      if(t.id==='rh-dgm'){ R.dg.modeloId=t.value; R.dg.reg=null; P.render(); return; }
      if(t.id==='rh-lm'){ R.dg.modeloId=t.value; R.dg.resp={}; P.render(); return; }
      if(t.id==='rh-ls'){ R.dg.lsetor=t.value; P.render(); return; }
      if(t.dataset&&t.dataset.rhLf){ const s2=new Set(R.dg.sel||[]); if(t.checked) s2.add(t.dataset.rhLf); else s2.delete(t.dataset.rhLf); R.dg.sel=[...s2]; P.render(); return; }
      if(t.dataset&&t.dataset.rhAdmdoc!=null&&R.adm){ const f=R.func.find(x=>x._id===R.adm.id); if(!f) return; const nm=t.dataset.rhAdmdoc, xs=(f.admEntregues||[]).filter(x=>x.nome!==nm);
        if(t.checked) xs.push({nome:nm,em:agora(),porNome:eu()}); f.admEntregues=xs; P.render(); await grava(COL.func+'/'+f._id,{admEntregues:xs}); return; }
      if(t.id==='rh-fimpf'&&t.files&&t.files[0]){ const file=t.files[0]; t.value=''; try{ P.toast('Lendo a planilha…'); R.fimp=await fimpLer(file); P.render(); window.scrollTo(0,0); }catch(e){ P.toast(e.message||'Não consegui ler a planilha.'); } return; }
      if(t.id==='rh-cargaf'&&t.files&&t.files[0]){ const file=t.files[0]; t.value=''; try{ P.toast('Lendo a planilha…'); R.carga.prev=await cargaLer(file); P.render(); }catch(e){ P.toast(e.message||'Não consegui ler a planilha.'); } return; }
      if(t.id==='rh-dgdesl'){ R.dg.desligar=t.checked; P.render(); return; }
      if(t.id==='rh-dgdd'){ R.dg.deslData=t.value; return; }
      if(t.id==='rh-desd'&&R.fdesl){ R.fdesl.data=t.value; return; }
      if(t.id==='rh-desm'&&R.fdesl){ R.fdesl.motivo=t.value; return; }
      if(t.id==='rh-tdn'&&R.tdf){ R.tdf.nome=t.value; return; }
      if(t.id==='rh-tdv'&&R.tdf){ R.tdf.validade=t.value; return; }
      if(t.dataset&&t.dataset.rhTdanx&&t.files&&t.files[0]){ const file=t.files[0], x=R.terc.find(y=>y._id===R.tdoc); t.value=''; if(!x) return; if(file.size>15e6) return P.toast('Arquivo grande demais (máximo 15 MB).');
        const ds=(x.docs||[]).map(d=>Object.assign({},d)), d=ds.find(y=>y.id===t.dataset.rhTdanx); if(!d) return; P.toast('Enviando…');
        d.arquivo=await guardarArqRH('Terceirizados/'+nomeArq(x.nome),nomeArq(d.nome+' - '+x.nome)+'.'+((file.name.split('.').pop()||'pdf').toLowerCase()),file); await grava(COL.terc+'/'+x._id,{docs:ds}); P.toast('Arquivo anexado.'); return; }
      if(t.id==='rh-dgfe'){ R.dg.feriasId=t.value; R.dg.reg=null; P.render(); return; }
      if(t.id==='rh-ferp'&&R.ffer){ R.ffer.aquisitivo=t.value; P.render(); return; }
      if(t.id==='rh-feri'&&R.ffer){ R.ffer.inicio=t.value; P.render(); return; }
      if(t.id==='rh-pjd'&&R.fpj){ R.fpj.data=t.value; P.render(); return; }
      if(t.id==='rh-dgg'){ R.dg.guardar=t.checked; return; }
      if(t.id==='rh-docx'&&t.files&&t.files[0]){ const fs=[...t.files]; t.value=''; if(fs.length>1) await importarWords(fs); else await importarWord(fs[0]); return; }
      if(t.dataset&&t.dataset.rhAnx&&t.files&&t.files[0]){ const file=t.files[0], f=R.func.find(x=>x._id===t.dataset.rhAnx); t.value=''; if(!f) return;
        if(file.size>15e6) return P.toast('Arquivo grande demais (máximo 15 MB).'); P.toast('Enviando a ficha de '+f.nome+'…');
        const ext=(file.name.split('.').pop()||'pdf').toLowerCase(); await window.RHAPI.salvarFichaEscaneada(R.fmes,f.nome,await lerB64(file),file.type||'application/pdf',ext);
        P.toast('Ficha assinada de '+f.nome+' anexada.'); return; }
      if(t.dataset&&t.dataset.rhDanx&&t.files&&t.files[0]){ const file=t.files[0], d=R.docs.find(x=>x._id===t.dataset.rhDanx); t.value=''; if(!d) return;
        if(file.size>15e6) return P.toast('Arquivo grande demais (máximo 15 MB).'); P.toast('Enviando…');
        const ext=(file.name.split('.').pop()||'pdf').toLowerCase(), nome=nomeArq(d.modelo+' - '+d.funcionario+' (assinado)')+'.'+ext, b64=await lerB64(file), od=OD(); let url;
        if(od){ const r=await od.enviar('Documentos/'+nomeArq(d.funcionario)+'/'+nome,b64,file.type||'application/pdf'); url=(r&&r.webUrl)||''; }
        else url=linkArq(await salvarArquivo({nome,mime:file.type||'application/pdf',tipo:'documento',funcId:d.funcId,funcionario:d.funcionario},b64));
        await P.db().doc(COL.docs+'/'+d._id).set({assinado:{url,nome,em:agora(),porNome:eu()}},{merge:true}); P.toast('Documento assinado anexado.'); return; }
    }catch(e){ console.warn('[RH]',e); P.erro(e); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-"],[data-act^="od-"]'); if(!b) return; const a=b.dataset.act;
    if(a==='rh-fsel'&&ev.target.closest('button,label,input,a')) return;
    try{
      /* ocorrências */
      if(a==='rh-ocnova'){ R.foc={funcId:b.dataset.id,data:P.hojeStr(),tipo:'Advertência verbal'}; P.render(); return; }
      if(a==='rh-ocx'){ R.foc=null; P.render(); return; }
      if(a==='rh-ocsalvar'){ const g=R.foc, f=g&&R.func.find(x=>x._id===g.funcId); if(!f) return; const v=k=>{ const e=document.getElementById(k); return e?e.value:''; };
        Object.assign(g,{data:v('rh-ocd'),tipo:v('rh-oct'),dias:v('rh-ocn'),motivo:String(v('rh-ocm')).trim(),testemunhas:String(v('rh-ocw')).trim()});
        if(!okIso(g.data)) return P.toast('Informe a data.'); if(g.motivo.length<3) return P.toast('Escreva o que aconteceu.');
        const dias=/SUSPENS/.test(norm(g.tipo))?Math.max(0,Math.round(+g.dias||0)):0; if(/SUSPENS/.test(norm(g.tipo))&&!dias) return P.toast('Informe quantos dias de suspensão.');
        R.salv=true; P.render(); const nid=id();
        try{ await P.db().doc(COL.oc+'/'+nid).set({funcId:f._id,funcionario:f.nome,data:g.data,tipo:g.tipo,motivo:g.motivo.slice(0,900),testemunhas:g.testemunhas.slice(0,200),dias:dias||'',em:agora(),por:P.S.uid||null,porNome:eu()});
          R.foc=null; P.toast(ocPedeDoc(g.tipo)?'Ocorrência salva. Toque em "Gerar documento" para imprimir.':'Ocorrência salva.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-ocrem'){ const x=R.oc.find(o=>o._id===b.dataset.id); if(!x||!confirm('Tirar esta ocorrência do histórico?')) return; await grava(COL.oc+'/'+x._id,{removido:true}); P.toast('Ocorrência tirada.'); return; }
      if(a==='rh-ocdoc'){ const x=R.oc.find(o=>o._id===b.dataset.id); if(!x) return; const re=/SUSPENS/.test(norm(x.tipo))?/SUSPENS/:/ADVERT/, md=R.modelos.find(m=>re.test(norm(m.nome)))||R.modelos.find(m=>/ADVERT|SUSPENS/.test(norm(m.nome)));
        R.dg={funcId:x.funcId,modeloId:md?md._id:'',extra:{},resp:{},feriasId:'',guardar:true,ocId:x._id}; R.dv='gerar'; R.f=null; R.fdesl=null; P.go('rhdocs'); window.scrollTo(0,0);
        if(!md) setTimeout(()=>P.toast('Cadastre o modelo da advertência em Modelos (use os campos "Data da ocorrência" e "Motivo da ocorrência").'),100); return; }
      /* itens emprestados */
      if(a==='rh-empnovo'){ R.femp={funcId:b.dataset.id,desde:P.hojeStr()}; P.render(); return; }
      if(a==='rh-empx'){ R.femp=null; P.render(); return; }
      if(a==='rh-empsalvar'){ const g=R.femp, f=g&&R.func.find(x=>x._id===g.funcId); if(!f) return; const v=k=>{ const e=document.getElementById(k); return e?String(e.value).trim():''; };
        Object.assign(g,{item:v('rh-empi'),obs:v('rh-empo'),desde:v('rh-empd')}); if(g.item.length<2) return P.toast('Escreva o item (ex.: Armário).');
        R.salv=true; P.render(); try{ await P.db().doc(COL.emp+'/'+id()).set({funcId:f._id,funcionario:f.nome,item:g.item.slice(0,60),obs:g.obs.slice(0,80),desde:okIso(g.desde)?g.desde:P.hojeStr(),devolvido:'',em:agora(),por:P.S.uid||null,porNome:eu()}); R.femp=null; P.toast('Anotado.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-empdev'){ const x=R.emp.find(o=>o._id===b.dataset.id); if(!x) return; await grava(COL.emp+'/'+x._id,{devolvido:P.hojeStr(),devolvidoNome:eu()}); x.devolvido=P.hojeStr(); P.toast(x.item+': devolvido.'); P.render(); return; }
      /* perguntas rápidas */
      if(a==='rh-perg'){ const k=b.dataset.v; R.perg=R.perg&&R.perg.k===k?null:{k,mes:P.hojeStr().slice(5,7),setor:(R.perg&&R.perg.setor)||''}; P.render(); return; }
      if(a==='rh-pergx'){ R.perg=null; P.render(); return; }
      if(a==='rh-pgimp'){ if(R.perg) imprimirDoc(pergHtml(pergDados())); return; }
      if(a==='rh-pgcop'){ if(!R.perg) return; const t=pergTexto(pergDados()); try{ await navigator.clipboard.writeText(t); P.toast('Lista copiada.'); }catch(e){ P.toast('Não consegui copiar.'); } return; }
      if(a==='rh-pgwa'){ if(!R.perg) return; window.open('https://wa.me/?text='+encodeURIComponent(pergTexto(pergDados())),'_blank','noopener'); return; }
      /* feriados */
      if(a==='rh-feran'){ R.ferAno+=+b.dataset.v; P.render(); return; }
      if(a==='rh-feradd'||a==='rh-fersug'){ const C=P.ferCal?P.ferCal():{}, lista=(C.lista||[]).slice(), d=a==='rh-fersug'?b.dataset.v:(document.getElementById('rh-fhd')||{}).value, n=a==='rh-fersug'?b.dataset.n:String((document.getElementById('rh-fhn')||{}).value||'').trim(), t=a==='rh-fersug'?'empresa':(document.getElementById('rh-fht')||{}).value||'municipal';
        if(!okIso(d)) return P.toast('Escolha a data.'); if(n.length<2) return P.toast('Escreva o nome do feriado.');
        const i=lista.findIndex(x=>x.data===d), it={data:d,nome:n.slice(0,60),tipo:t}; if(i>=0) lista[i]=it; else lista.push(it); lista.sort((x,y)=>x.data.localeCompare(y.data));
        await ferSalvar({lista,tirados:(C.tirados||[]).filter(x=>x!==d)}); R.ferAno=+d.slice(0,4); P.toast('Feriado incluído: '+n+' ('+br(d).slice(0,5)+').'); return; }
      if(a==='rh-ferrem'){ const d=b.dataset.v, C=P.ferCal?P.ferCal():{}, nac=(P.ferNac?P.ferNac(+d.slice(0,4)):[]).some(x=>x.data===d)||((P.S.cfg||{}).feriados||[]).includes(d), x=ferAno(+d.slice(0,4)).find(y=>y.data===d);
        if(!confirm((x?x.nome+' ('+br(d)+')':br(d))+(nac?': a fábrica trabalha neste dia?':': tirar do calendário?'))) return;
        await ferSalvar({lista:(C.lista||[]).filter(y=>y.data!==d),tirados:nac?[...new Set((C.tirados||[]).concat([d]))]:(C.tirados||[])}); P.toast('Calendário atualizado.'); return; }
      if(a==='rh-fervolta'){ const C=P.ferCal?P.ferCal():{}; await ferSalvar({tirados:(C.tirados||[]).filter(x=>x!==b.dataset.v)}); P.toast('Voltou a ser feriado.'); return; }
      /* ficha pelo celular */
      if(a==='rh-convnovo'){ R.convM={fase:'nome',nome:''}; P.render(); return; }
      if(a==='rh-convx'){ R.convM=null; P.render(); return; }
      if(a==='rh-convcriar'){ const nm=String((document.getElementById('rh-convn')||{}).value||'').trim().slice(0,60), msg=String((document.getElementById('rh-convmsg')||{}).value||'').trim().slice(0,700)||CONV_MSG, t=tokenNovo(), ateMs=Date.now()+FC_VALIDADE*864e5;
        R.salv=true; P.render(); try{ await P.db().doc(COL.conv+'/'+t).set({nome:nm,msg,docs:docsAdm().filter(n=>!/^ASO\b/i.test(n)),criado:agora(),ateMs,usado:false,porNome:eu(),por:P.S.uid||null}); R.convM={fase:'link',t,nome:nm,ateMs,msg};
          if(msg!==(R.cfg.convMsg||CONV_MSG)){ R.cfg.convMsg=msg; P.db().doc('rh/config').set({convMsg:msg,alteradoEm:agora()},{merge:true}).catch(()=>{}); } } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-convver'){ const x=R.conv.find(c=>c._id===b.dataset.id); if(x) R.convM={fase:'link',t:x._id,nome:x.nome,ateMs:x.ateMs,msg:x.msg}; P.render(); return; }
      if(a==='rh-convcop'){ const x=R.conv.find(c=>c._id===b.dataset.id)||Object.assign({_id:b.dataset.id},R.convM||{}); try{ await navigator.clipboard.writeText(msgWa(x)); P.toast('Mensagem e link copiados.'); }catch(e){ const i=document.getElementById('rh-convu'); if(i){ i.focus(); i.select(); } P.toast('Copie o link selecionado.'); } return; }
      if(a==='rh-convwa'){ const x=R.conv.find(c=>c._id===b.dataset.id)||Object.assign({_id:b.dataset.id},R.convM||{}); window.open('https://wa.me/?text='+encodeURIComponent(msgWa(x)),'_blank','noopener'); return; }
      if(a==='rh-convapag'){ if(!confirm('Cancelar este link? A pessoa não vai mais conseguir mandar a ficha.')) return; await P.db().doc(COL.conv+'/'+b.dataset.id).delete(); P.toast('Link cancelado.'); return; }
      if(a==='rh-fcver'){ R.fcv=b.dataset.id; P.render(); return; }
      if(a==='rh-fcx'){ R.fcv=null; P.render(); return; }
      if(a==='rh-fcapag'){ if(!confirm('Apagar esta ficha e as fotos dela?')) return; const t=b.dataset.id; const sn=await P.db().collection(COL.fcarq).where('c','==',t).limit(40).get();
        for(const d of sn.docs) await P.db().doc(COL.fcarq+'/'+d.id).delete(); await P.db().doc(COL.fcand+'/'+t).delete(); try{ await P.db().doc(COL.conv+'/'+t).delete(); }catch(e){} R.fcv=null; P.toast('Ficha apagada.'); P.render(); return; }
      if(a==='rh-fcusar'){ const x=R.fcand.find(c=>c._id===b.dataset.id); if(!x) return; const ja=R.func.find(f=>dig(f.cpf)&&dig(f.cpf)===dig(x.cpf));
        if(ja&&!confirm(ja.nome+' já está cadastrado com este CPF. Completar o cadastro dele com os dados da ficha?')) return;
        const dados={nome:String(x.nome||'').toUpperCase(),cpf:fCPF(x.cpf),nascimento:okIso(x.nascimento)?x.nascimento:'',telefone:x.telefone||'',email:x.email||'',cep:x.cep||'',endereco:fcEndereco(x),camisa:x.camisa||'',calca:x.calca||'',calcado:x.calcado||'',
          banco:x.banco||'',agencia:x.agencia||'',conta:x.conta||'',pix:x.pix||'',emergencia:[x.emergNome,x.emergTel].filter(Boolean).join(' · '),fichaCand:x._id};
        if(ja){ const v=Object.assign({},ja,{cpf:fCPF(ja.cpf)}); Object.keys(dados).forEach(k=>{ if(k!=='nome'&&k!=='cpf'&&dados[k]) v[k]=dados[k]; }); R.f=v; }
        else R.f=Object.assign({status:'Ativo',tipo:'CLT',admNova:true,admissao:P.hojeStr(),obs:x.obs||''},dados);
        R.fcv=null; R.pess=null; R.adm=null; P.go('rhfunc'); window.scrollTo(0,0); P.toast('Confira os dados, escolha a função e o setor e salve.'); return; }
      /* fichas do mês */
      if(a==='rh-fabrir'){ R.fmes=fichasMesIni(); R.fv='mes'; P.go('rhfichas'); return; }
      if(a==='rh-fgerartela'){ R.fmes=fichasMesIni(); R.fv='gerar'; P.go('rhfichas'); fichasRodar(()=>{ try{ const d=frm.contentWindow.document, i=d.getElementById('input-mes'); if(i&&i.value!==R.fmes){ i.value=R.fmes; i.dispatchEvent(new Event('change')); } }catch(e){} }); return; }
      if(a==='rh-fanexar'){ R.fmes=fichasMesIni(); R.fv='mes'; R.fmodo='lista'; R.ffil.sit='imp'; P.go('rhfichas'); return; }
      if(a==='rh-fvmes'){ R.fv='mes'; P.render(); return; }
      if(a==='rh-fvgerar'){ R.fv='gerar'; P.render(); fichasRodar(()=>{ try{ const i=frm.contentWindow.document.getElementById('input-mes'); if(i&&i.value!==R.fmes){ i.value=R.fmes; i.dispatchEvent(new Event('change')); } }catch(e){} }); return; }
      if(a==='rh-fmes'){ R.fmes=mesMais(R.fmes,+b.dataset.v); R.fsel=null; P.render(); return; }
      if(a==='rh-fmodo'){ R.fmodo=b.dataset.v; lsSet('rh.fichas.modo',R.fmodo); P.render(); return; }
      if(a==='rh-fchip'){ R.ffil.sit=b.dataset.v; R.ffil.n=60; P.render(); return; }
      if(a==='rh-fsetor'){ R.ffil.setor=b.dataset.v; R.ffil.sit='todas'; R.fmodo='lista'; lsSet('rh.fichas.modo','lista'); P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fsetorx'){ R.ffil.setor=''; P.render(); return; }
      if(a==='rh-fmais'){ R.ffil.n+=60; P.render(); return; }
      if(a==='rh-fsel'){ R.fsel=b.dataset.id; P.render(); return; }
      if(a==='rh-fger'){ const f=R.func.find(x=>x._id===b.dataset.id); if(f) fichasGerar({nomes:[f.nome]}); return; }
      if(a==='rh-fimp1'){ const f=R.func.find(x=>x._id===b.dataset.id); if(f) fichasGerar({nomes:[f.nome],imprimir:true}); return; }
      if(a==='rh-ffaltam'){ const xs=fResumo(R.fmes).xs.filter(o=>o.s.k==='nao'||(o.s.k==='semepi'&&!o.s.i)).map(o=>o.f.nome); if(xs.length) fichasGerar({nomes:xs}); return; }
      if(a==='rh-fimptodas'){ const xs=ativos().map(f=>f.nome); if(xs.length) fichasGerar({nomes:xs,porSetor:!!b.dataset.setor,imprimir:true}); return; }
      if(a==='rh-fver'){ const f=R.func.find(x=>x._id===b.dataset.id), s=f&&fSit(f,R.fmes); if(s&&s.a) await abrirUrl(s.a.url); return; }
      if(a==='rh-fsemepi'){ const n=b.dataset.n; if(!n){ const f=R.func.find(x=>x._id===b.dataset.f); R.f=f?Object.assign({},f,{cpf:fCPF(f.cpf),salario:f.salario}):null; P.go('rhfunc'); return; }
        const fc=R.funcoes.find(x=>norm(x.nome)===norm(n)); R.ff=fc?JSON.parse(JSON.stringify(fc)):{nome:n,epis:[],uniformes:[]}; P.go('rhfuncoes'); window.scrollTo(0,0); return; }
      /* funcionários */
      if(a==='rh-novo'){ R.f={status:'Ativo',tipo:'CLT'}; if(b.dataset.goFunc) P.go('rhfunc'); else P.render(); return; }
      if(a==='rh-ed'){ R.f=Object.assign({},R.func.find(x=>x._id===b.dataset.id)); R.f.cpf=fCPF(R.f.cpf); if(R.f.cnpj) R.f.cnpj=fCNPJ(R.f.cnpj); R.carga=null; if(b.dataset.goFunc) P.go('rhfunc'); else P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fx'){ R.f=null; P.render(); return; }
      if(a==='rh-salvar'){ const v=Object.assign({},R.f,val('[data-rh-f]')); v.nome=String(v.nome||'').trim().replace(/\s+/g,' ').toUpperCase(); v.cpf=dig(v.cpf); v.cnpj=dig(v.cnpj);
        if(v.nome.length<3) return P.toast('Escreva o nome completo.');
        if(v.tipo==='PJ'){ if(!cnpjOk(v.cnpj)) return P.toast('CNPJ inválido. Confira os números.'); if(R.func.some(x=>x._id!==v._id&&dig(x.cnpj)===v.cnpj)) return P.toast('Já existe um PJ com este CNPJ.'); }
        else { if(!cpfOk(v.cpf)) return P.toast('CPF inválido. Confira os números.'); if(R.func.some(x=>x._id!==v._id&&dig(x.cpf)===v.cpf)) return P.toast('Já existe um funcionário com este CPF.'); }
        if(v.tipo==='PJ'){ const sel=v.empresaSel||(EMP_PJ.some(x=>x[0]===v.empresa)?v.empresa:'ZENITH'); if(sel==='OUTRA'){ v.empresa=String(v.empresaOutra||'').trim().toUpperCase(); if(v.empresa.length<2) return P.toast('Escreva o nome da empresa do PJ.'); } else v.empresa=sel; }
        else v.empresa='COLAFIX'; delete v.empresaSel; delete v.empresaOutra;
        if(String(v.salario||'').trim()){ const n=numBR(v.salario); if(n==null) return P.toast('Salário inválido. Ex.: 2.150,00'); v.salario=n; } else v.salario='';
        v.jornada=String(v.jornada||'').trim(); v.setor=String(v.setor||'').trim(); if(v.setor&&!setoresCad().some(x=>norm(x)===norm(v.setor))) setoresSalvar(setoresCad().concat([v.setor])).catch(()=>{});
        if(v.status==='Desligado') v.desligAgendado=false; else if(!v.desligAgendado){ v.desligamento=''; v.desligMotivo=''; } const iD=v._id||id(); delete v._id; R.salv=true; P.render();
        const adm=!!v.admNova, fct=v.fichaCand; delete v.admNova; delete v.fichaCand; if(adm){ v.admRoteiro=true; v.admEntregues=v.admEntregues||[]; }
        try{ await grava(COL.func+'/'+iD,Object.assign(v,R.f._id?{}:{criadoEm:agora(),criadoPor:P.S.uid||null}));
          if(fct){ try{ const n=await fichaCandFinalizar(iD,fct,v); if(n) setTimeout(()=>P.toast(plural(n,'foto de documento guardada','fotos de documentos guardadas')+' na admissão.'),1500); }catch(e){ console.warn('[RH] ficha do celular',e); P.toast('Cadastro salvo, mas as fotos da ficha não foram guardadas. Tente abrir a ficha de novo.'); } }
          R.f=null; if(adm){ R.adm={id:iD}; R.pess=null; P.toast('Cadastro salvo. Agora os documentos, o contrato e a ficha.'); } else P.toast('Funcionário salvo.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-csv'){ const L=[['Nome','CPF / CNPJ','Função','Setor','Empresa','Vínculo','Admissão','Situação','Desligamento','Telefone','Camisa','Calça','Calçado','Nascimento','Motivo do desligamento']].concat(R.func.map(x=>[x.nome,docF(x),x.funcao,x.setor,x.empresa,x.tipo,br(x.admissao),x.status,br(x.desligamento),x.telefone,x.camisa,x.calca,x.calcado,br(x.nascimento),x.desligMotivo||'']));
        const csv='﻿'+L.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n'); baixar(new Blob([csv],{type:'text/csv'}),'funcionarios.csv'); return; }
      /* funções */
      if(a==='rh-cad'){ R.cad=b.dataset.v; R.ff=null; R.fe=null; if(b.dataset.goCad){ ev.preventDefault(); P.go('rhfuncoes'); } else P.render(); return; }
      if(a==='rh-setadd'){ const i=document.getElementById('rh-setn'), n=String(i&&i.value||'').trim(); if(!n) return P.toast('Escreva o nome do setor.'); if(setoresCad().some(x=>norm(x)===norm(n))) return P.toast('Esse setor já está cadastrado.'); await setoresSalvar(setoresCad().concat([n])); P.toast('Setor cadastrado.'); P.render(); return; }
      if(a==='rh-setren'){ await setorRenomear(b.dataset.v); return; }
      if(a==='rh-epinovo'){ R.fe={nome:''}; P.render(); return; }
      if(a==='rh-epied'){ const e=(R.epis||[]).find(x=>x._id===b.dataset.id); if(e){ R.fe=JSON.parse(JSON.stringify(e)); R.fe.nome0=e.nome; P.render(); } return; }
      if(a==='rh-fex'||(a==='rh-fex-fundo'&&ev.target===b)){ R.fe=null; P.render(); return; }
      if(a==='rh-episalvar'){ await epiSalvar(); return; }
      if(a==='rh-epidel'){ const u=epiUso(R.fe.nome0||R.fe.nome); if(!confirm('Apagar "'+R.fe.nome+'" do catálogo?'+(u.length?' As '+u.length+' funções que usam continuam com ele.':''))) return; await P.db().doc(COL.epis+'/'+R.fe._id).delete(); R.fe=null; P.toast('EPI apagado do catálogo.'); P.render(); return; }
      if(a==='rh-epiall'){ const xs=episSemCad(); for(const x of xs) await grava(COL.epis+'/'+id(),{nome:x.nome,ca:x.ca,tipo:'',origem:'funções'}); P.toast(plural(xs.length,'EPI trazido','EPIs trazidos')+' para o catálogo.'); P.render(); return; }
      if(a==='rh-itadd'){ ffLer(); const k=b.dataset.k; R.ff[k]=(R.ff[k]||[]).concat([{nome:''}]); P.render(); setTimeout(()=>{ const xs=document.querySelectorAll(`[data-rh-it="${k}"][data-c="nome"]`); const l=[...xs].find(x=>!x.value); if(l) l.focus(); },30); return; }
      if(a==='rh-itrem'){ ffLer(); const k=b.dataset.k, i=+b.dataset.i; R.ff[k]=(R.ff[k]||[]).filter((_,j)=>j!==i); P.render(); return; }
      if(a==='rh-ffcopia'){ const sel=document.getElementById('rh-ffcopia'), src=R.funcoes.find(x=>x._id===(sel&&sel.value)); if(!src) return P.toast('Escolha a função para copiar.'); ffLer();
        ['epis','uniformes'].forEach(k=>{ const cur=(R.ff[k]||[]).filter(x=>x.nome); (src[k]||[]).forEach(x=>{ if(!cur.some(c=>norm(c.nome)===norm(x.nome))) cur.push(Object.assign({},x)); }); R.ff[k]=cur.slice(0,k==='epis'?MAX_EPI:MAX_UNI); }); P.toast('Copiado de '+src.nome+'. Confira e salve.'); P.render(); return; }
      if(a==='rh-ffx-fundo'&&ev.target===b){ R.ff=null; P.render(); return; }
      if(a==='rh-setdel'){ await setoresSalvar(setoresCad().filter(x=>x!==b.dataset.v)); P.render(); return; }
      if(a==='rh-setall'){ const cad=setoresCad(); await setoresSalvar(cad.concat(unicos('setor').filter(n=>!cad.some(c=>norm(c)===norm(n))))); P.toast('Setores cadastrados.'); P.render(); return; }
      if(a==='rh-cfgsalvar'){ const pz=+document.getElementById('rh-cpz').value, cid=document.getElementById('rh-ccid').value.trim(), fd=document.getElementById('rh-cfd').value, docs=document.getElementById('rh-cdoc').value.split('\n').map(x=>x.trim()).filter(Boolean);
        if(!(pz>=1&&pz<=90)) return P.toast('Dias de aviso: de 1 a 90.'); if(fd&&!/^\d{4}-\d{2}$/.test(fd)) return P.toast('Mês inválido.');
        const up={prazoAviso:pz,cidade:cid||'Cachoeirinha',docsAdmissao:docs.length?docs:DOCS_ADM_PADRAO,alteradoEm:agora()}; if(fd) up.fichasDesde=fd;
        await P.db().doc('rh/config').set(up,{merge:true}); Object.assign(R.cfg,up); if(R.fmes<FDESDE()) R.fmes=FDESDE(); P.toast('Configurações salvas.'); P.render(); return; }
      if(a==='rh-fnovo'){ R.ff={nome:b.dataset.n||'',epis:[],uniformes:[]}; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fed'){ R.ff=JSON.parse(JSON.stringify(R.funcoes.find(x=>x._id===b.dataset.id))); R.ff.nome0=R.ff.nome; P.render(); return; }
      if(a==='rh-ffx'){ R.ff=null; P.render(); return; }
      if(a==='rh-fimpx'){ R.fimp=null; P.render(); return; }
      if(a==='rh-fimpok'){ await fimpGravar(); return; }
      if(a==='rh-fsalvar'){ const nome=String((document.querySelector('[data-rh-ff="nome"]')||{}).value||'').trim(); if(nome.length<2) return P.toast('Escreva o nome da função.');
        if(R.funcoes.some(x=>x._id!==R.ff._id&&norm(x.nome)===norm(nome))) return P.toast('Essa função já existe.');
        const it=lerItens(); if(it.epis.length>MAX_EPI) return P.toast('No máximo '+MAX_EPI+' EPIs.'); if(it.uniformes.length>MAX_UNI) return P.toast('No máximo '+MAX_UNI+' peças de uniforme.'); const iD=R.ff._id||id();
        const vv=k=>String((document.querySelector(`[data-rh-ff="${k}"]`)||{}).value||'').trim(), velho=R.ff._id?R.ff.nome0:null;
        await grava(COL.funcoes+'/'+iD,{nome,cbo:vv('cbo'),setor:vv('setor'),desc:vv('desc'),epis:it.epis,uniformes:it.uniformes}); let n=0;
        if(velho&&norm(velho)!==norm(nome)) for(const f of R.func.filter(f=>norm(f.funcao)===norm(velho))){ await grava(COL.func+'/'+f._id,{funcao:nome}); n++; }
        R.ff=null; R.prev={}; P.toast('Função salva.'+(n?' '+plural(n,'pessoa atualizada','pessoas atualizadas')+'.':'')); P.render(); try{ const F=fichasApi(); if(F) F.recarregar(); }catch(e){} return; }
      if(a==='rh-fdel'){ const nP=R.func.filter(f=>f.status!=='Desligado'&&norm(f.funcao)===norm(R.ff.nome0||R.ff.nome)).length; if(!confirm('Apagar a função '+R.ff.nome+'?'+(nP?' '+plural(nP,'pessoa ainda tem','pessoas ainda têm')+' esta função (o cadastro delas não muda, mas a ficha fica sem EPI).':''))) return; await P.db().doc(COL.funcoes+'/'+R.ff._id).delete(); R.ff=null; P.render(); return; }
      if(a==='rh-decl'){ await P.db().doc('rh/config').set({declUniforme:document.getElementById('rh-du').value.trim(),declEpi:document.getElementById('rh-de').value.trim(),alteradoEm:agora()},{merge:true}); P.toast('Textos salvos.'); return; }
      /* terceirizados */
      if(a==='rh-tnovo'){ R.ft={status:'Ativo',aviso:30}; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-ted'){ const x=R.terc.find(y=>y._id===b.dataset.id); if(!x) return; R.ft=JSON.parse(JSON.stringify(x)); if(R.ft.cpf) R.ft.cpf=fCPF(R.ft.cpf); if(b.dataset.goTerc) P.go('rhterc'); else P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-tren'){ const x=R.terc.find(y=>y._id===b.dataset.id); R.ft={_id:x._id,nome:x.nome,renovar:true,fimAnterior:x.fim,fim:''}; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-tfx'){ R.ft=null; P.render(); return; }
      if(a==='rh-tfil'){ R.tfil=b.dataset.v; P.render(); return; }
      if(a==='rh-tsalvar'){ const f=R.ft, v={}; document.querySelectorAll('[data-rh-t]').forEach(e=>v[e.dataset.rhT]=e.value.trim());
        if(f.renovar){ if(!v.fim) return P.toast('Informe o novo vencimento.'); if(f.fimAnterior&&v.fim<=f.fimAnterior) return P.toast('O novo vencimento precisa ser depois de '+br(f.fimAnterior)+'.');
          const x=R.terc.find(y=>y._id===f._id); const ren=(x.renovacoes||[]).concat([{de:f.fimAnterior,para:v.fim,obs:v.obsRen||'',em:agora(),porNome:eu()}]).slice(-50);
          await grava(COL.terc+'/'+f._id,{fim:v.fim,renovacoes:ren,status:'Ativo'}); R.ft=null; P.toast('Contrato renovado até '+br(v.fim)+'.'); P.render(); return; }
        v.nome=v.nome.replace(/\s+/g,' ').toUpperCase(); if(v.nome.length<3) return P.toast('Escreva o nome do prestador.'); if(!v.empresa) return P.toast('Informe a empresa prestadora.'); if(!v.fim) return P.toast('Informe o vencimento do contrato.');
        if(v.cpf&&!cpfOk(v.cpf)) return P.toast('CPF inválido. Confira os números ou deixe em branco.'); v.cpf=dig(v.cpf); if(v.inicio&&v.fim<v.inicio) return P.toast('O vencimento é antes do início.');
        v.aviso=Math.max(1,Math.min(365,+v.aviso||30)); const iD=f._id||id(); R.salv=true; P.render();
        try{ await grava(COL.terc+'/'+iD,Object.assign(v,f._id?{}:{criadoEm:agora(),criadoPor:P.S.uid||null})); R.ft=null; P.toast('Terceirizado salvo.'); } finally{ R.salv=false; P.render(); } return; }
      /* documentos e contratos */
      if(a==='rh-dv'){ edSync(); R.dv=b.dataset.v; P.render(); return; }
      if(a==='rh-dnovo'){ R.dm={nome:'',vale:'TODOS',html:''}; R.dv='modelos'; P.render(); setTimeout(()=>{ const n=document.getElementById('rh-dnome'); if(n) n.focus(); },50); return; }
      if(a==='rh-ded'){ edSync(); const x=R.modelos.find(y=>y._id===b.dataset.id); R.dm=x?JSON.parse(JSON.stringify(x)):null; P.render(); return; }
      if(a==='rh-dtk'){ ev.preventDefault(); inserirNoEditor(tkHTML(b.dataset.k)+'\u200B'); return; }
      if(a==='rh-dfmt'){ ev.preventDefault(); const v=b.dataset.v, ed=document.getElementById('rh-ed'); if(!ed) return;
        if(v==='bold'||v==='italic'){ ed.focus(); document.execCommand(v); edSync(); return; }
        if(v==='titulo'){ ed.focus(); document.execCommand('formatBlock',false,'h2'); edSync(); return; }
        if(v==='pergunta'){ const sel=getSelection(), rg=sel.rangeCount&&ed.contains(sel.anchorNode)?sel.getRangeAt(0).cloneRange():null;
          const q=qLimpa(prompt('O que o painel deve perguntar na hora de gerar?\nEx.: Data de início das férias · Último dia de trabalho · Trabalhado ou indenizado')||''); if(q.length<2) return;
          if(rg){ ed.focus(); sel.removeAllRanges(); sel.addRange(rg); } inserirNoEditor(tqHTML(q)+'\u200B'); return; }
        if(v==='clausula'){ const n=(ed.textContent.match(/Cláusula \d+ª/g)||[]).length+1; inserirNoEditor(`<b>Cláusula ${n}ª</b>\u00a0—\u00a0`); return; } return; }
      if(a==='rh-dprev'){ edSync(); R.dprev=true; P.render(); return; }
      if(a==='rh-dprevx'){ if(ev.target.closest('.rh-mbox')&&!ev.target.closest('[data-act="rh-dprevx"].lnk')) return; R.dprev=false; P.render(); return; }
      if(a==='rh-dsalvar'){ edSync(); const d=R.dm; d.nome=String(d.nome||'').trim(); if(d.nome.length<3) return P.toast('Dê um nome ao modelo.'); if(!String(d.html||'').replace(/<[^>]+>/g,'').trim()&&!/rh-tk/.test(d.html)) return P.toast('O texto do modelo está vazio.');
        if(R.modelos.some(x=>x._id!==d._id&&norm(x.nome)===norm(d.nome))) return P.toast('Já existe um modelo com esse nome.');
        const iD=d._id||id(); R.salv=true; P.render(); try{ await grava(COL.modelos+'/'+iD,Object.assign({nome:d.nome,vale:d.vale||'TODOS',html:limpar(d.html),desliga:modeloDesliga(d)},d._id?{}:{criadoEm:agora(),criadoPor:P.S.uid||null})); d._id=iD; P.toast('Modelo salvo.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-ddel'){ if(!confirm('Apagar o modelo "'+R.dm.nome+'"? Os documentos já gerados continuam no histórico.')) return; await P.db().doc(COL.modelos+'/'+R.dm._id).delete(); R.dm=null; P.render(); return; }
      if(a==='rh-dgpara'){ R.dg={funcId:b.dataset.id,modeloId:'',extra:{},resp:{},feriasId:'',guardar:true}; R.dv='gerar'; R.f=null; R.fdesl=null; P.go('rhdocs'); return; }
      if(a==='rh-dgfer'){ const x=R.fer.find(y=>y._id===b.dataset.id), f=x&&R.func.find(y=>y._id===x.funcId); if(!f) return;
        const nao=m=>/PREVIO|RESCIS|DISTRAT|DESLIG|DEMISS/.test(norm(m.nome)), vs=R.modelos.filter(m=>valePara(m,f)&&!nao(m));
        let md=vs.find(m=>/AVISO DE FERIAS/.test(norm(m.nome)))||vs.find(m=>/FERIAS/.test(norm(m.nome)))||vs.find(m=>camposDe(m.html).some(k=>CAMPOS_FER.includes(k)));
        if(!md){ avisoFeriasPadrao().then(mid=>{ if(R.dg&&R.dg.feriasId===x._id){ R.dg.modeloId=mid; P.render(); } }).catch(e=>P.toast('Não foi possível criar o modelo de aviso de férias: '+((e&&e.message)||e))); }
        R.dg={funcId:f._id,modeloId:md?md._id:'',extra:{},resp:{},feriasId:x._id,guardar:true}; R.dv='gerar'; P.go('rhdocs');
        if(!md) setTimeout(()=>P.toast('Cadastre o modelo do aviso de férias em Documentos e contratos (use os campos de férias).'),100); return; }
      /* férias e prazos */
      if(a==='rh-expprorr'){ const f=R.func.find(x=>x._id===b.dataset.id), s=f&&expInfo(f); if(!s) return; if(!confirm('Prorrogar a experiência de '+f.nome+' até '+br(s.f2)+'?')) return;
        await grava(COL.func+'/'+f._id,{exp:{status:'prorrogado',em:agora(),porNome:eu()}}); P.toast('Experiência prorrogada até '+br(s.f2)+'.'); return; }
      if(a==='rh-expefet'){ const f=R.func.find(x=>x._id===b.dataset.id); if(!f||!confirm('Efetivar '+f.nome+'? Sai da lista de experiência.')) return;
        await grava(COL.func+'/'+f._id,{exp:{status:'efetivado',em:agora(),porNome:eu()}}); P.toast(f.nome+' efetivado.'); return; }
      if(a==='rh-desl'){ const f=R.func.find(x=>x._id===b.dataset.id); if(!f) return; const s=expInfo(f); R.fdesl={funcId:f._id,data:P.hojeStr(),motivo:b.dataset.exp?(s&&s.d>0?'Rescisão antecipada da experiência (pelo empregador)':'Término do contrato de experiência'):''}; R.f=null; if(b.dataset.exp) P.render(); else P.go('rhfunc'); window.scrollTo(0,0); return; }
      if(a==='rh-cartao'){ const f=R.func.find(x=>x._id===b.dataset.id); if(f&&window.RHCartao) RHCartao.abrir({P,R,esc,baixar},f,b.dataset.v); return; }
      if(a==='rh-almaus'){ if(window.RHAlmoco&&RHAlmoco.ausencia) RHAlmoco.ausencia(P); return; }
      if(a==='rh-deslnovo'){ R.fdesl={funcId:'',data:P.hojeStr(),motivo:''}; R.f=null; R.adm=null; R.pess=null; P.go('rhfunc'); window.scrollTo(0,0); return; }
      if(a==='rh-deslx'){ R.fdesl=null; P.render(); return; }
      if(a==='rh-desagx'){ const f=R.func.find(x=>x._id===b.dataset.id); if(!f||!confirm('Cancelar o desligamento marcado de '+f.nome+'?')) return; await grava(COL.func+'/'+f._id,{desligAgendado:false,desligamento:'',desligMotivo:''}); if(R.f&&R.f._id===f._id) Object.assign(R.f,{desligAgendado:false,desligamento:'',desligMotivo:''}); P.toast('Desligamento cancelado.'); P.render(); return; }
      if(a==='rh-deslsalvar'){ const g=R.fdesl, f=g&&R.func.find(x=>x._id===g.funcId); if(!f) return; const di=document.getElementById('rh-desd'), mi=document.getElementById('rh-desm'); if(di) g.data=di.value; if(mi) g.motivo=mi.value;
        if(!okIso(g.data)) return P.toast('Informe a data do desligamento.'); if(okIso(f.admissao)&&g.data<f.admissao) return P.toast('A data é antes da admissão.');
        R.salv=true; P.render(); try{ const fut=await desligar(f,g.data,g.motivo); R.fdesl=null; P.toast(fut?f.nome+' continua ativo e sai em '+br(g.data)+'.':f.nome+' desligado em '+br(g.data)+'.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-tdoc'){ R.tdoc=b.dataset.id; R.tdf={nome:'',validade:''}; R.ft=null; if(b.dataset.goTerc) P.go('rhterc'); else P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-tdocx'){ R.tdoc=null; P.render(); return; }
      if(a==='rh-tdadd'){ const x=R.terc.find(y=>y._id===R.tdoc); if(!x) return; const nm=String((document.getElementById('rh-tdn')||{}).value||'').trim(), vl=(document.getElementById('rh-tdv')||{}).value||'', fi=document.getElementById('rh-tdf'), file=fi&&fi.files&&fi.files[0];
        if(nm.length<2) return P.toast('Escreva qual é o documento.'); if(file&&file.size>15e6) return P.toast('Arquivo grande demais (máximo 15 MB).');
        R.salv=true; P.render(); try{ const d={id:id(),nome:nm,validade:okIso(vl)?vl:'',em:agora(),porNome:eu()};
          if(file) d.arquivo=await guardarArqRH('Terceirizados/'+nomeArq(x.nome),nomeArq(nm+' - '+x.nome)+'.'+((file.name.split('.').pop()||'pdf').toLowerCase()),file);
          await grava(COL.terc+'/'+x._id,{docs:(x.docs||[]).concat([d])}); R.tdf={nome:'',validade:''}; P.toast('Documento adicionado.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-tdrem'){ const x=R.terc.find(y=>y._id===R.tdoc); if(!x) return; const ds=(x.docs||[]).map(d=>Object.assign({},d)), d=ds.find(y=>y.id===b.dataset.id); if(!d||!confirm('Tirar "'+d.nome+'" da lista?')) return;
        d.removido=true; d.removidoEm=agora(); d.removidoPor=eu(); await grava(COL.terc+'/'+x._id,{docs:ds}); return; }
      if(a==='rh-tdver'){ const x=R.terc.find(y=>y._id===R.tdoc), d=x&&tDocs(x).find(y=>y.id===b.dataset.id); if(d&&d.arquivo) await abrirUrl(d.arquivo.url); return; }
      /* agenda e relatório */
      if(a==='rh-fview'){ R.fview=b.dataset.v; R.pess=null; P.render(); return; }
      if(a==='rh-orgset'){ R.orgSet=b.dataset.v; P.render(); return; }
      if(a==='rh-mapano'){ R.mapAno=(R.mapAno||+P.hojeStr().slice(0,4))+(+b.dataset.v); P.render(); return; }
      if(a==='rh-mapset'){ R.mapSet=b.dataset.v; P.render(); return; }
      if(a==='rh-agv'){ R.agv=b.dataset.v; P.render(); return; }
      if(a==='rh-agind'){ R.agv='ind'; P.go('rhagenda'); return; }
      if(a==='rh-agrel'){ R.agv='rel'; R.relMes=P.hojeStr().slice(0,7); P.go('rhagenda'); return; }
      if(a==='rh-agdias'){ R.agDias=+b.dataset.v||30; P.render(); return; }
      if(a==='rh-ics'){ const xs=agendaJanela().prox; if(!xs.length) return; baixar(new Blob([icsTexto(xs)],{type:'text/calendar'}),'Agenda-RH-Colafix.ics'); P.toast(plural(xs.length,'compromisso','compromissos')+' no arquivo. Abra o arquivo para mandar para o Outlook.'); return; }
      if(a==='rh-relmes'){ R.relMes=mesMais(R.relMes,+b.dataset.v); P.render(); return; }
      if(a==='rh-indimp'){ imprimirDoc(indHtml()); return; }
      if(a==='rh-relimp'){ imprimirDoc(relHtml(R.relMes)); return; }
      if(a==='rh-relxls'){ await relExcel(R.relMes); return; }
      /* ficha da pessoa */
      if(a==='rh-pess'){ R.pess=b.dataset.id; R.f=null; R.adm=null; R.buscaIni=''; P.go('rhfunc'); window.scrollTo(0,0); return; }
      if(a==='rh-pessx'){ R.pess=null; P.render(); return; }
      /* admissão */
      if(a==='rh-admnova'){ R.f={status:'Ativo',tipo:'CLT',admNova:true,admissao:P.hojeStr()}; R.pess=null; R.adm=null; P.go('rhfunc'); window.scrollTo(0,0); return; }
      if(a==='rh-admabrir'){ R.adm={id:b.dataset.id}; R.pess=null; R.f=null; P.go('rhfunc'); window.scrollTo(0,0); return; }
      if(a==='rh-admx'){ R.adm=null; P.render(); return; }
      if(a==='rh-adml'){ R.adm.editar=true; P.render(); return; }
      if(a==='rh-admlx'){ R.adm.editar=false; P.render(); return; }
      if(a==='rh-admls'){ const xs=String((document.getElementById('rh-admlista')||{}).value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,40); if(!xs.length) return P.toast('A lista ficou vazia.');
        await P.db().doc('rh/config').set({docsAdmissao:xs,alteradoEm:agora()},{merge:true}); R.cfg.docsAdmissao=xs; R.adm.editar=false; P.toast('Lista de documentos salva.'); P.render(); return; }
      if(a==='rh-admcontr'){ const f=R.func.find(x=>x._id===b.dataset.id); if(!f) return; const ms=R.modelos.filter(m=>valePara(m,f)&&!modeloDesliga(m));
        const md=ms.find(m=>f.tipo==='PJ'?/PRESTA|PJ/.test(norm(m.nome)):/EXPERI/.test(norm(m.nome)))||ms.find(m=>/CONTRATO/.test(norm(m.nome)))||ms[0];
        R.dg={funcId:f._id,modeloId:md?md._id:'',extra:{},resp:{},feriasId:'',guardar:true}; R.dv='gerar'; P.go('rhdocs'); if(!md) setTimeout(()=>P.toast('Cadastre o modelo do contrato em Documentos e contratos.'),100); return; }
      /* documentos em lote */
      if(a==='rh-dlote'){ R.dg.lote=!!b.dataset.v; R.dg.sel=R.dg.sel||[]; R.dg.resp=R.dg.resp||{}; P.render(); return; }
      if(a==='rh-ltodos'){ const md=R.modelos.find(m=>m._id===R.dg.modeloId); if(!md) return; R.dg.sel=ativos().filter(f=>(!R.dg.lsetor||(f.setor||'Sem setor')===R.dg.lsetor)&&valePara(md,f)).map(f=>f._id); P.render(); return; }
      if(a==='rh-llimpa'){ R.dg.sel=[]; P.render(); return; }
      if(a==='rh-lgo'){ const md=R.modelos.find(m=>m._id===R.dg.modeloId); if(!md) return; const xs=ativos().filter(f=>(R.dg.sel||[]).includes(f._id)).sort((x,y)=>x.nome.localeCompare(y.nome,'pt-BR'));
        if(!xs.length) return P.toast('Marque as pessoas.'); if(modeloDesliga(md)) return P.toast('Este modelo desliga o funcionário: gere um por vez.');
        const pr=loteProblemas(md,xs); if(pr.length) return P.toast('Complete o cadastro de: '+pr.map(o=>o.f.nome).join(', '));
        const semResp=perguntasDe(md.html).filter(q=>!String(R.dg.resp[q]||'').trim()); if(semResp.length) return P.toast('Responda: '+semResp.join(' · '));
        const v=b.dataset.v, partes=partesLote(md,xs); b.disabled=true;
        try{ const resp={}; perguntasDe(md.html).forEach(q=>{ resp[q]=String(R.dg.resp[q]||'').trim(); });
          for(const f of xs){ const fe=ferProx(f); await P.db().doc(COL.docs+'/'+id()).set(Object.assign({funcId:f._id,funcionario:f.nome,modeloId:md._id,modelo:md.nome,acao:'lote-'+v,em:agora(),por:P.S.uid||null,porNome:eu()},fe&&camposDe(md.html).some(k=>CAMPOS_FER.includes(k))?{feriasId:fe._id}:{},Object.keys(resp).length?{respostas:resp}:{})); }
          const nome=nomeArq(md.nome+' - '+plural(xs.length,'pessoa','pessoas'));
          if(v==='imprimir') imprimirDoc(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(nome)}</title><style>@page{size:A4;margin:22mm 20mm}${DOC_CSS}.rh-pb{page-break-after:always;break-after:page}</style></head><body>${partes.map((x,i)=>x+(i<partes.length-1?'<div class="rh-pb"></div>':'')).join('')}</body></html>`);
          else if(v==='pdf'){ P.toast('Montando o PDF…'); await pdfPartes(partes,nome+'.pdf'); }
          else baixar(new Blob(['\ufeff',`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(md.nome)}</title><style>@page{size:21cm 29.7cm;margin:2.2cm 2cm}${DOC_CSS}</style></head><body>${partes.join('<br clear=all style="page-break-before:always">')}</body></html>`],{type:'application/msword'}),nome+'.doc');
          P.toast(plural(xs.length,'documento gerado','documentos gerados')+' e guardados no histórico.'); } finally{ b.disabled=false; P.render(); } return; }
      /* carga inicial */
      if(a==='rh-carga'){ R.carga=R.carga?null:{prev:null}; R.f=null; R.adm=null; P.render(); return; }
      if(a==='rh-cargax'){ R.carga=null; P.render(); return; }
      if(a==='rh-cargabaixar'){ await cargaBaixar(); return; }
      if(a==='rh-cargaok'){ if(!R.carga||!R.carga.prev) return; const np=R.carga.prev.linhas.filter(o=>o.mud.length).length, nv=R.carga.prev.novos||0; if(!confirm('Gravar '+(nv?plural(nv,'pessoa nova','pessoas novas')+' e ':'')+'as alterações ('+plural(np,'pessoa','pessoas')+' no total)?')) return;
        R.salv=true; P.render(); try{ const r=await cargaAplicar(); R.carga=null; P.toast((r.nn?plural(r.nn,'pessoa cadastrada','pessoas cadastradas')+' · ':'')+plural(r.n,'cadastro atualizado','cadastros atualizados')+(r.nf?' · '+plural(r.nf,'período de férias','períodos de férias')+' marcado(s) como já tirado(s)':'')+'.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-pzabrir'){ R.pzv=b.dataset.v||'ferias'; P.go('rhferias'); return; }
      if(a==='rh-pzv'){ R.pzv=b.dataset.v; P.render(); return; }
      if(a==='rh-pzfil'){ R.pzfil=b.dataset.v; P.render(); return; }
      if(a==='rh-fernova'){ R.ffer={funcId:b.dataset.id,inicio:'',dias:''}; R.pzv='ferias'; if(b.dataset.goFer) P.go('rhferias'); else P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fajabrir'){ R.fajs={funcId:b.dataset.id,v:{}}; R.ffer=null; R.pzv='ferias'; if(b.dataset.goFer) P.go('rhferias'); else P.render(); setTimeout(()=>{ const el=document.getElementById('rh-fajs'); if(el) el.scrollIntoView({block:'start'}); },60); return; }
      if(a==='rh-fajx'){ R.fajs=null; P.render(); return; }
      if(a==='rh-fajtudo'){ if(R.fajs) R.fajs.v[b.dataset.p]=b.dataset.v; P.render(); return; }
      if(a==='rh-fajsalvar'){ const g=R.fajs, f=g&&R.func.find(x=>x._id===g.funcId); if(!f||R.salv) return;
        document.querySelectorAll('[data-rh-aj]').forEach(i=>{ g.v[i.dataset.rhAj]=i.value; });
        const mud=[]; for(const p of periodos(f)){ if(g.v[p.ini]==null) continue; const ants=p.ps.filter(x=>x.anterior), atual=ants.reduce((a,x)=>a+(+x.dias||0),0), max=30-(p.usados-atual);
          const n=parseInt(g.v[p.ini],10); if(String(g.v[p.ini]).trim()===''||isNaN(n)||n<0) return P.toast('Coloque um número de 0 a 30 em '+br(p.ini)+'.'); if(n>max) return P.toast('No período '+br(p.ini)+' cabem no máximo '+max+' dias (já tem '+(30-max)+' marcados no painel).');
          if(n!==atual) mud.push({p,ants,n}); }
        if(!mud.length){ R.fajs=null; P.render(); return P.toast('Nada mudou.'); }
        R.salv=true; P.render();
        try{ for(const {p,ants,n} of mud){ for(const x of ants) await P.db().doc(COL.ferias+'/'+x._id).delete();
            if(n>0) await P.db().doc(COL.ferias+'/'+id()).set({funcId:f._id,funcionario:f.nome,aquisitivo:p.ini,aquisitivoFim:p.fim,dias:n,anterior:true,status:'tirada',origem:'ajuste',em:agora(),por:P.S.uid||null,porNome:eu()}); }
          R.fajs=null; P.toast('Férias de '+f.nome+' ajustadas.'); }
        catch(e){ P.erro(e); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-ferx'){ R.ffer=null; P.render(); return; }
      if(a==='rh-ferdias'){ if(R.ffer) R.ffer.dias=b.dataset.v; P.render(); return; }
      if(a==='rh-fersalvar'){ const g=R.ffer, f=g&&R.func.find(x=>x._id===g.funcId); if(!f) return; const di=document.getElementById('rh-ferd'); if(di) g.dias=di.value; const ii=document.getElementById('rh-feri'); if(ii) g.inicio=ii.value;
        const p=periodos(f).find(x=>x.ini===g.aquisitivo), dias=Math.round(+g.dias||0);
        if(!p) return P.toast('Escolha o período aquisitivo.'); if(!okIso(g.inicio)) return P.toast('Informe o início das férias.'); if(!(dias>0)) return P.toast('Informe quantos dias.');
        if(dias>p.saldo) return P.toast('Neste período faltam só '+p.saldo+' dias.');
        const fim=addDias(g.inicio,dias-1); if(ferDe(f).some(x=>!x.anterior&&x.inicio<=fim&&x.fim>=g.inicio)) return P.toast('Já tem férias marcadas nessas datas.');
        R.salv=true; P.render(); try{ await P.db().doc(COL.ferias+'/'+id()).set({funcId:f._id,funcionario:f.nome,aquisitivo:p.ini,aquisitivoFim:p.fim,inicio:g.inicio,dias,fim,retorno:addDias(fim,1),status:'marcada',em:agora(),por:P.S.uid||null,porNome:eu()});
          R.ffer=null; P.toast('Férias de '+f.nome+' marcadas: '+br(g.inicio)+' a '+br(fim)+'.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-fercanc'){ const x=R.fer.find(y=>y._id===b.dataset.id); if(!x||!confirm('Desmarcar as férias de '+x.funcionario+' ('+br(x.inicio)+' a '+br(x.fim)+')?')) return;
        await P.db().doc(COL.ferias+'/'+x._id).set({status:'cancelada',canceladaEm:agora(),canceladaPor:eu()},{merge:true}); P.toast('Férias desmarcadas.'); return; }
      if(a==='rh-ferant'){ const f=R.func.find(x=>x._id===b.dataset.id), p=f&&periodos(f).find(x=>x.ini===b.dataset.p); if(!p||!p.saldo) return;
        if(!confirm(f.nome+': marcar os '+p.saldo+' dias do período '+br(p.ini)+' a '+br(p.fim)+' como já tirados (antes do painel)?')) return;
        await P.db().doc(COL.ferias+'/'+id()).set({funcId:f._id,funcionario:f.nome,aquisitivo:p.ini,aquisitivoFim:p.fim,dias:p.saldo,anterior:true,status:'tirada',em:agora(),por:P.S.uid||null,porNome:eu()}); P.toast('Registrado.'); return; }
      if(a==='rh-feranteriores'){ const hj=P.hojeStr(), xs=[]; clts().forEach(f=>periodos(f).filter(p=>p.completo&&p.saldo>0&&p.lim<hj).forEach(p=>xs.push([f,p])));
        if(!xs.length) return; if(!confirm('Marcar '+plural(xs.length,'período vencido','períodos vencidos')+' como férias já tiradas antes de usar o painel?\n\nUse só se essas férias já foram dadas. Os prazos que ainda não venceram continuam aparecendo.')) return;
        for(const [f,p] of xs) await P.db().doc(COL.ferias+'/'+id()).set({funcId:f._id,funcionario:f.nome,aquisitivo:p.ini,aquisitivoFim:p.fim,dias:p.saldo,anterior:true,status:'tirada',em:agora(),por:P.S.uid||null,porNome:eu()});
        P.toast(plural(xs.length,'período registrado','períodos registrados')+' como já tirados.'); return; }
      if(a==='rh-pjtroca'){ R.fpj={funcId:b.dataset.id,data:P.hojeStr(),obs:''}; R.pzv='pj'; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-pjx'){ R.fpj=null; P.render(); return; }
      if(a==='rh-pjsalvar'){ const g=R.fpj, f=g&&R.func.find(x=>x._id===g.funcId); if(!f) return; const di=document.getElementById('rh-pjd'); if(di) g.data=di.value; const oi=document.getElementById('rh-pjo'); if(oi) g.obs=oi.value.trim();
        if(!okIso(g.data)) return P.toast('Informe a data da troca.'); if(g.data>P.hojeStr()) return P.toast('A data da troca não pode ser no futuro.');
        R.salv=true; P.render(); try{ await grava(COL.func+'/'+f._id,{ultimaTroca:g.data,pjProx:'',trocas:(f.trocas||[]).concat([{data:g.data,obs:g.obs||'',em:agora(),porNome:eu()}]).slice(-40)});
          R.fpj=null; P.toast('Troca registrada. Próxima: '+br(addMeses(g.data,3))+'.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-dgo'){ const f=R.func.find(x=>x._id===R.dg.funcId), md=R.modelos.find(x=>x._id===R.dg.modeloId); if(!f||!md) return P.toast('Escolha o funcionário e o modelo.');
        if(camposDe(md.html).some(k=>CAMPOS_FER.includes(k))&&!ferSel(f)) return P.toast('Escolha as férias (ou marque em Férias e prazos).');
        const semResp=perguntasDe(md.html).filter(q=>!String(R.dg.resp[q]||'').trim()); if(semResp.length) return P.toast('Responda: '+semResp.join(' · '));
        const v=b.dataset.v; b.disabled=true;
        try{ await registrarDoc(f,md,v); if(v==='imprimir') imprimirDoc(docCompleto(f,md)); else if(v==='pdf'){ P.toast('Montando o PDF…'); await pdfDoc(f,md); } else wordDoc(f,md); }
        finally{ b.disabled=false; P.render(); } return; }
      if(a==='rh-dver'){ const d=R.docs.find(x=>x._id===b.dataset.id); if(d&&d.assinado) await abrirUrl(d.assinado.url); return; }
      /* OneDrive e arquivos */
      if(a==='od-con'){ b.disabled=true; try{ await window.OneDrive.conectar(); P.toast('OneDrive conectado.'); R.esc={}; recarregaFichas(); }catch(e){ P.toast(e.message||'Não foi possível conectar ao OneDrive.'); } finally{ P.render(); } return; }
      if(a==='od-sair'){ window.OneDrive.sair(); P.toast('OneDrive desconectado neste aparelho.'); P.render(); return; }
      if(a==='od-salvar'){ if(!P.dono()) return; const v=k=>String((document.getElementById(k)||{}).value||'').trim(); const c={clientId:v('od-cli'),tenant:v('od-ten'),pasta:v('od-pas')||'Fichas EPI e Uniforme',link:v('od-lnk'),ativo:!!(document.getElementById('od-ati')||{}).checked};
        if(c.ativo&&!/^[0-9a-f-]{36}$/i.test(c.clientId)) return P.toast('Cole o ID do aplicativo (36 caracteres) para ligar o OneDrive.');
        await P.db().doc('config/geral').update({onedrive:c}); P.S.cfg.onedrive=c; R.esc={}; P.toast('Configuração do OneDrive salva.'); P.render(); recarregaFichas(); return; }
      if(a==='rh-arq'){ b.disabled=true; await abrirArquivo(R.arqAbrir); return; }
      if(a==='rh-arqx'){ R.arqAbrir=null; P.render(); return; }
    }catch(e){ console.warn('[RH]',e); P.erro(e); } });
  function recarregaFichas(){ try{ if(frm) frm.contentWindow.location.reload(); }catch(e){} }
  /* modelo a partir de um arquivo do Word: {NOME}, {CPF}… no texto viram campos */
  /* nome de arquivo que veio de um .zip aberto no Windows sem UTF-8 ("presta├º├úo" em vez de "prestação"): volta ao certo */
  const CP437="\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00a2\u00a3\u00a5\u20a7\u0192\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u2310\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255d\u255c\u255b\u2510\u2514\u2534\u252c\u251c\u2500\u253c\u255e\u255f\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256b\u256a\u2518\u250c\u2588\u2584\u258c\u2590\u2580\u03b1\u00df\u0393\u03c0\u03a3\u03c3\u00b5\u03c4\u03a6\u0398\u03a9\u03b4\u221e\u03c6\u03b5\u2229\u2261\u00b1\u2265\u2264\u2320\u2321\u00f7\u2248\u00b0\u2219\u00b7\u221a\u207f\u00b2\u25a0\u00a0", CP850="\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00f8\u00a3\u00d8\u00d7\u0192\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u00ae\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb\u2591\u2592\u2593\u2502\u2524\u00c1\u00c2\u00c0\u00a9\u2563\u2551\u2557\u255d\u00a2\u00a5\u2510\u2514\u2534\u252c\u251c\u2500\u253c\u00e3\u00c3\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u00a4\u00f0\u00d0\u00ca\u00cb\u00c8\u0131\u00cd\u00ce\u00cf\u2518\u250c\u2588\u2584\u00a6\u00cc\u2580\u00d3\u00df\u00d4\u00d2\u00f5\u00d5\u00b5\u00fe\u00de\u00da\u00db\u00d9\u00fd\u00dd\u00af\u00b4\u00ad\u00b1\u2017\u00be\u00b6\u00a7\u00f7\u00b8\u00b0\u00a8\u00b7\u00b9\u00b3\u00b2\u25a0\u00a0";
  function nomeConserta(s){ s=String(s||''); if(!/[├┬┼╔╚]/.test(s)) return s; /* o Windows usa a tabela 850 (ou a 437) */
    for(const T of [CP850,CP437]){ try{ const b=[]; let ok=true; for(const ch of s){ const c=ch.charCodeAt(0); if(c<128){ b.push(c); continue; } const i=T.indexOf(ch); if(i<0){ ok=false; break; } b.push(128+i); }
      if(!ok) continue; const r=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(b)); if(r&&r!==s) return r; }catch(e){} } return s; }
  let _nmFeito=false;
  async function consertarNomesModelos(){ if(_nmFeito) return; _nmFeito=true; for(const m of R.modelos){ const n=nomeConserta(m.nome); if(n!==m.nome){ try{ await grava(COL.modelos+'/'+m._id,{nome:n}); m.nome=n; }catch(e){ console.warn('[rh] nome do modelo',e); } } } P.rerender(); }
  /* vários arquivos do Word de uma vez: cada um vira um modelo, já salvo (o nome do arquivo é o nome do modelo; quem já existe com o mesmo nome fica como está) */
  async function importarWords(files){ let n=0; const ja=[], ruim=[]; try{ P.toast('Lendo '+files.length+' arquivos do Word…'); if(!window.mammoth) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
      for(const file of files){ const nome=nomeConserta(file.name.replace(/\.docx$/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim()); if(R.modelos.some(x=>norm(x.nome)===norm(nome))){ ja.push(nome); continue; }
        try{ const r=await window.mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()}); const html=limpar(autoCampos(r.value||'')); const txt=html.replace(/<[^>]+>/g,''); if(!txt.trim()){ ruim.push(nome); continue; }
          const semEmp=!/data-k="EMPRESA"/.test(html), vale=/ZENITH SOLU/i.test(txt)&&semEmp?'ZENITH':/NEXUS MANUTEN/i.test(txt)&&semEmp?'NEXUS':/data-k="(CNPJ_PJ|RAZAO_PJ)"/.test(html)?'PJ':/EMPREGAD[OA]|EXPERI[ÊE]NCIA/i.test(txt)?'CLT':'TODOS'; /* os campos já viraram <span data-k> */
          await grava(COL.modelos+'/'+id(),{nome,vale,html,desliga:modeloDesliga({nome}),criadoEm:agora(),criadoPor:P.S.uid||null}); n++; }
        catch(e){ console.warn('[RH] word',file.name,e); ruim.push(nome); } }
      R.dv='modelos'; P.render(); P.toast(plural(n,'modelo cadastrado','modelos cadastrados')+(ja.length?' · já existiam: '+ja.join(', '):'')+(ruim.length?' · não consegui ler: '+ruim.join(', '):'')); }
    catch(e){ console.warn('[RH] word',e); P.toast(e.message&&/carregar/.test(e.message)?e.message:'Não consegui ler os arquivos do Word.'); } }
  async function importarWord(file){ try{ P.toast('Lendo '+file.name+'…'); if(!window.mammoth) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
      const r=await window.mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()}); const html=limpar(autoCampos(r.value||'')); if(!html.replace(/<[^>]+>/g,'').trim()) return P.toast('O arquivo está vazio.');
      const n=camposDe(html).length; R.dm={nome:nomeConserta(file.name.replace(/\.docx$/i,'')),vale:'TODOS',html}; R.dv='modelos'; P.render();
      P.toast(n?n+' campo(s) reconhecido(s). Confira o texto e salve o modelo.':'Texto importado. Toque nos campos acima para colocar nome, CPF etc. e salve.'); }
    catch(e){ console.warn('[RH] word',e); P.toast(e.message&&/carregar/.test(e.message)?e.message:'Não consegui ler o arquivo do Word.'); } }
  /* importar a lista de funcionários uma vez (Excel ou CSV com cabeçalho: Nome, CPF, Função, Setor, Data de admissão, Empresa, Status, Tipo) */
  async function importar(file){ try{ let rows;
      if(/\.csv$/i.test(file.name)){ const t=await file.text(); const sep=t.split('\n')[0].includes(';')?';':','; rows=t.split(/\r?\n/).filter(Boolean).map(l=>l.split(sep).map(c=>c.replace(/^"|"$/g,'').trim())); }
      else { if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}); const ws=wb.Sheets[wb.SheetNames.find(n=>/colab|funcion/i.test(n))||wb.SheetNames[0]]; rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,dateNF:'dd/mm/yyyy'}); }
      const hi=rows.findIndex(r=>r.some(c=>norm(c)==='NOME')&&r.some(c=>norm(c)==='CPF')); if(hi<0) return P.toast('Não achei as colunas Nome e CPF.');
      const H=rows[hi].map(norm), c=n=>H.findIndex(h=>h===norm(n)); const iN=c('Nome'),iC=c('CPF'),iF=c('Função'),iS=c('Setor'),iA=c('Data de admissão'),iE=c('Empresa'),iSt=c('Status'),iT=c('Tipo'),iNa=[c('Nascimento'),c('Data de nascimento')].find(x=>x>=0);
      const iso=v=>{ const m=String(v||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); return m?(m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):''; };
      let n=0,dup=0,inv=0; const ja=new Set(R.func.map(x=>dig(x.cpf)));
      for(const r of rows.slice(hi+1)){ const nome=String(r[iN]||'').trim(); if(!nome) continue; const cpf=dig(r[iC]); if(!cpfOk(cpf)){ inv++; continue; } if(ja.has(cpf)){ dup++; continue; } ja.add(cpf);
        const st=norm(r[iSt]); await grava(COL.func+'/'+id(),{nome:nome.toUpperCase(),cpf,funcao:iF>=0?String(r[iF]||'').trim():'',setor:iS>=0?String(r[iS]||'').trim():'',admissao:iA>=0?iso(r[iA]):'',nascimento:iNa!=null?iso(r[iNa]):'',empresa:empPadrao(norm(r[iT])==='PJ'?'PJ':'CLT',iE>=0?r[iE]:''),
          status:st==='ATIVO'||!st?'Ativo':/DESLIG|INATIV/.test(st)?'Desligado':/AFAST/.test(st)?'Afastado':/FERIAS/.test(st)?'Férias':'Ativo',tipo:norm(r[iT])==='PJ'?'PJ':'CLT',criadoEm:agora(),criadoPor:P.S.uid||null,origem:'importação'}); n++; }
      P.toast(n+' funcionário(s) importado(s)'+(dup?' · '+dup+' já existiam':'')+(inv?' · '+inv+' com CPF inválido (ignorados)':'')+'.'); }
    catch(e){ console.warn('[RH] importar',e); P.toast('Não consegui ler o arquivo.'); } }
  document.head.insertAdjacentHTML('beforeend',`<style>
  .rh-acoes{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .rh-kpi2 .rh-k{background:var(--surface);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow);border:0;text-align:left;font:inherit;color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:2px}.rh-kpi2 .rh-k:hover{outline:2px solid var(--teal-wash)}.rh-kpi2 .rh-k b{font-size:34px;line-height:1.05;font-weight:700}.rh-kpi2 .rh-k span{font-weight:600}.rh-kpi2 .rh-k small{color:var(--muted);font-size:12.5px}
  .rh-dash{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;margin-bottom:16px}.rh-dash .card{margin:0}.rh-bars{display:flex;flex-direction:column;gap:9px;margin-top:8px}.rh-bl{display:grid;grid-template-columns:minmax(90px,150px) minmax(0,1fr) 34px;gap:10px;align-items:center;font-size:13.5px}.rh-bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rh-bt{height:14px;background:var(--surface-2,#efe9dc);border-radius:4px;overflow:hidden}.rh-bt i{display:block;height:100%;background:var(--teal);border-radius:0 4px 4px 0}.rh-bl b{text-align:right}
.rh-pf{display:grid;grid-template-columns:290px minmax(0,1fr) 340px;gap:16px;align-items:start}.rh-pf .card{margin:0}.rh-pfr{display:flex;flex-direction:column;gap:16px}
  .rh-pfa{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}.rh-av2{width:96px;height:96px;border-radius:48px;background:var(--teal-strong);color:#fff;display:grid;place-items:center;font-size:34px;font-weight:700}
  .rh-pfn{font-size:20px}.rh-pfc{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.rh-pft{width:100%;box-sizing:border-box;background:var(--ground);border-radius:12px;padding:12px}.rh-pft b{display:block;font-size:22px;color:var(--teal-strong)}.rh-pft span{font-size:12.5px;color:var(--muted)}
  .rh-pfd{width:100%;margin:0;display:grid;grid-template-columns:auto 1fr;gap:7px 10px;text-align:left;font-size:13.5px}.rh-pfd dt{color:var(--muted)}.rh-pfd dd{margin:0;overflow-wrap:anywhere}
  .rh-pfb{display:flex;gap:8px;flex-wrap:wrap;width:100%}.rh-pfa .rh-pfb{flex-direction:column}.rh-pfa .rh-pfb .btn{width:100%}
  .rh-tl{margin-top:14px}.rh-tli{display:grid;grid-template-columns:86px 18px minmax(0,1fr);gap:12px;min-height:64px}.rh-tli>b{font-size:12.5px;color:var(--muted);text-align:right;padding-top:1px}.rh-tld{display:flex;flex-direction:column;align-items:center}.rh-tld i{width:14px;height:14px;border-radius:7px;flex:none}.rh-tld em{flex:1;width:2px;background:var(--line)}.rh-tli>div b{display:block;font-size:14.5px}.rh-tli>div small{display:block;color:var(--muted);font-size:12.5px;padding-bottom:12px}
  .rh-pfl{display:flex;flex-direction:column;gap:7px;margin-top:10px;font-size:13.5px}.rh-pfl div{display:flex;justify-content:space-between;gap:10px}.rh-pfl small{color:var(--muted)}
  @media (max-width:1150px){ .rh-pf{grid-template-columns:minmax(0,1fr)} }
.rh-mapa{position:relative;overflow-x:auto}.rh-mr{display:grid;grid-template-columns:190px minmax(560px,1fr);align-items:center;min-height:34px}.rh-mr .rh-nm{text-align:left;font-size:13.5px}.rh-mr .rh-nm small{color:var(--muted);font-weight:600}
  .rh-mt{position:relative;height:26px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/12 - 1px),var(--line) calc(100%/12 - 1px),var(--line) calc(100%/12))}
  .rh-mh .rh-mt{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));background:none;height:auto;font-size:11.5px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase}.rh-mh{border-bottom:1px solid var(--line);padding-bottom:6px}
  .rh-ms{font-size:11.5px;font-weight:700;letter-spacing:1.5px;color:var(--teal-strong);text-transform:uppercase;margin:12px 0 2px}
  .rh-mb{position:absolute;top:5px;height:16px;border-radius:4px;background:var(--teal)}.rh-mb.foi{opacity:.45}.rh-mb.conf{background:var(--warn)}
  .rh-mlim{position:absolute;top:7px;width:12px;height:12px;border-radius:6px;background:var(--crit);transform:translateX(-6px)}.rh-mpj{position:absolute;top:2px;width:3px;height:22px;background:#5B3FA6}
  .rh-mhjw{position:absolute;left:190px;right:0;top:0;bottom:0;pointer-events:none}.rh-mhj{position:absolute;top:0;bottom:0;width:2px;background:var(--crit);opacity:.5}
  .rh-ml{display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-top:14px;font-size:12.5px;color:var(--muted)}.rh-ml span{display:flex;gap:6px;align-items:center}.rh-ml .rh-mb{height:10px}
.rh-kb{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start}.rh-kc{background:#EFE9DC;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px}.rh-kc.ok{background:var(--ok-tint,#E3F0E8)}
  .rh-kh{display:flex;justify-content:space-between;font-size:15px}.rh-kh span{color:var(--muted)}.rh-kcard{background:var(--surface);border-radius:12px;padding:12px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:2px}.rh-kcard .rh-nm{text-align:left;font-size:15px}.rh-kcard small{color:var(--muted);font-size:12.5px}.rh-kcard>.btn{margin-top:8px;align-self:flex-start}
  .rh-org{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:16px}.rh-orgc{margin:0;text-align:left;font:inherit;color:inherit;cursor:pointer;border:2px solid transparent;display:flex;flex-direction:column;gap:6px}.rh-orgc[aria-pressed="true"]{border-color:var(--teal)}.rh-orgc small{color:var(--muted);font-size:12.5px}
  .rh-avs{display:flex;margin-top:4px}.rh-av3{width:34px;height:34px;border-radius:17px;background:#EAF2F6;color:var(--teal-strong);display:grid;place-items:center;font-weight:700;font-size:12px;border:2px solid var(--surface);flex:none}.rh-avs .rh-av3+.rh-av3{margin-left:-8px}.rh-av3.mais{background:var(--teal-strong);color:#fff}.rh-av3.exp{background:var(--warn);color:#fff}
  .rh-orgp{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:12px}.rh-orgi{display:flex;gap:10px;align-items:center;text-align:left;background:var(--ground);border:0;border-radius:12px;padding:10px 12px;font:inherit;color:inherit;cursor:pointer}.rh-orgi.exp{background:var(--warn-tint)}.rh-orgi b{display:block;font-size:14px}.rh-orgi small{color:var(--muted);font-size:12px}
  .rh-orgv{border:2px dashed var(--line);border-radius:12px;display:grid;place-items:center;min-height:56px;color:var(--muted);font-size:13px}
  @media (max-width:980px){ .rh-kb{grid-template-columns:repeat(2,minmax(0,1fr))} } @media (max-width:600px){ .rh-kb{grid-template-columns:minmax(0,1fr)} }
.rh-kpi.rh-kpi5{grid-template-columns:repeat(5,minmax(0,1fr))}.rh-kpi5 .rh-k{cursor:default}
  .rh-col{display:flex;gap:8px;align-items:stretch;height:230px;margin-top:12px}.rh-col>div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px}.rh-col span{font-size:11.5px;color:var(--ink-2,#4A453C)}.rh-col i{width:100%;background:var(--teal);border-radius:4px 4px 0 0;display:block}.rh-col small{font-size:11px;color:var(--muted)}
  @media (max-width:900px){ .rh-kpi.rh-kpi5{grid-template-columns:repeat(2,minmax(0,1fr))} }
  .rh-acoes{max-width:100%;min-width:0}.rh-acoes .seg{max-width:100%;overflow-x:auto}
.rh-hero{background:var(--teal-strong);color:#fff;border-radius:18px;padding:26px 30px;margin-bottom:16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,460px);gap:20px;align-items:end;position:relative;overflow:hidden}
  .rh-hero::after{content:"";position:absolute;right:-90px;top:-90px;width:260px;height:260px;border-radius:50%;border:44px solid rgba(255,255,255,.06);pointer-events:none}
  .rh-hero h1{margin:4px 0 6px;font-size:32px;color:#fff}.rh-hero p{margin:0;color:#D6E4EB;font-size:15px}.rh-hero-d{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#BFD7E3}
  .rh-hero-a{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1}.rh-hero-s{display:flex;align-items:center;gap:8px;background:#fff;color:var(--muted);border-radius:12px;padding:0 14px;height:48px}.rh-hero-s input{border:0;outline:0;flex:1;font:inherit;font-size:15px;color:var(--ink,#1A1A1A);background:transparent;min-width:0}
  .rh-hero-b{display:flex;gap:8px;flex-wrap:wrap}.rh-hero-b .btn{flex:1 1 auto;padding:0 12px;font-size:14px}.rh-hb{background:#fff!important;color:var(--teal-strong)!important}.rh-hb2{background:transparent!important;border:1.5px solid rgba(255,255,255,.45)!important;color:#fff!important}
  .rh-hero-r{grid-column:1/-1;background:#fff;color:var(--ink,#1A1A1A);border-radius:12px;padding:6px;position:relative;z-index:1}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .rh-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.rh-tile{background:var(--surface);border:0;border-radius:16px;box-shadow:var(--shadow);padding:16px 18px;display:flex;flex-direction:column;gap:2px;text-align:left;font:inherit;color:inherit;cursor:pointer;position:relative;min-height:150px}.rh-tile:hover{outline:2px solid var(--teal-wash,#D6E4EB)}
  .rh-tic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none;margin-bottom:8px;background:#EAF2F6;color:var(--teal-strong)}.rh-tn{font-size:36px;font-weight:700;line-height:1.05}.rh-tl2{font-weight:600;font-size:14.5px}.rh-tile small{color:var(--muted);font-size:12.5px}
  .rh-spk{position:absolute;right:16px;top:18px;width:96px;height:38px;display:flex;gap:3px;align-items:flex-end}.rh-spk i{flex:1;background:#9FBFCF;border-radius:2px 2px 0 0}.rh-tile .rh-avs{position:absolute;right:16px;top:20px}
  .rh-week{margin-bottom:16px}.rh-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;margin-top:12px}.rh-wd{background:var(--ground);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:6px;min-height:120px}.rh-wd.hj{background:#EAF2F6;outline:2px solid var(--teal)}
  .rh-wdh{display:flex;justify-content:space-between;font-size:13px}.rh-wdh span{color:var(--muted)}.rh-wc{border:0;border-radius:8px;padding:6px 8px;text-align:left;font:inherit;font-size:12px;line-height:1.3;cursor:pointer;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}.rh-wc b{display:block;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;opacity:.85}.rh-wcc{display:flex;flex-direction:column;gap:2px;-webkit-line-clamp:unset}.rh-wcn{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.rh-wcb{margin-top:4px;align-self:flex-start;background:rgba(255,255,255,.75);border-radius:999px;padding:2px 8px;font-weight:700;font-size:11.5px}.rh-wcc:hover .rh-wcb{background:#fff}.rh-wv{color:var(--muted);font-size:13px}
  .rh-3{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr);gap:16px;margin-bottom:16px;align-items:start}.rh-3 .card{margin:0}
  .rh-avr{display:block;font-size:11.5px;font-weight:700;color:var(--warn-ink)}.rh-av.crit .rh-avr{color:var(--crit-ink)}
  .rh-av .rh-avi{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:none;background:var(--warn-tint);color:var(--warn-ink)}.rh-av.crit .rh-avi{background:var(--crit-tint);color:var(--crit-ink)}
  .rh-ok2{display:flex;flex-direction:column;align-items:center;gap:4px;padding:24px 0;color:var(--ok-ink,#2F6047);text-align:center}.rh-ok2 span{color:var(--muted);font-size:13px}
  .rh-party{display:flex;gap:12px;align-items:center;background:#FBF1EF;border-radius:12px;padding:10px 12px;margin-top:10px}.rh-party .rh-tic{margin:0}.rh-party small{display:block;color:var(--muted);font-size:12.5px}
  .rh-pm{display:flex;gap:10px;align-items:center;width:100%;border:0;background:none;padding:6px 0;text-align:left;font:inherit;color:inherit;cursor:pointer}.rh-pm b{display:block;font-size:14px}.rh-pm small{color:var(--muted);font-size:12.5px}.rh-av3.novo{background:#E3F0E8;color:#2F6047}
  .rh-stk{display:flex;height:16px;border-radius:5px;overflow:hidden;margin-top:12px;gap:2px}.rh-stk i{background:var(--teal-strong)}.rh-stk i.pj{background:#9FBFCF}.rh-stkl{display:flex;gap:16px;margin-top:8px;font-size:13px}.rh-stkl span{display:flex;gap:6px;align-items:center}.rh-stkl i{width:12px;height:12px;border-radius:3px;background:var(--teal-strong)}.rh-stkl i.pj{background:#9FBFCF}
  .rh-ats2{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;margin-top:10px}.rh-at2{display:flex;gap:12px;align-items:center;background:var(--ground);border:0;border-radius:12px;padding:12px 14px;text-align:left;font:inherit;color:inherit;cursor:pointer}.rh-at2:hover{background:#EAF2F6}.rh-at2 .rh-tic{margin:0;background:#fff}.rh-at2 b{display:block;font-size:14.5px}.rh-at2 small{color:var(--muted);font-size:12.5px}
  @media (max-width:1150px){ .rh-3{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .rh-3>.card:first-child{grid-column:1/-1} .rh-wk{grid-template-columns:repeat(4,minmax(0,1fr))} }
  @media (max-width:760px){ .rh-hero{grid-template-columns:minmax(0,1fr);padding:20px} .rh-hero h1{font-size:26px} .rh-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px} .rh-tile{min-height:0;padding:14px} .rh-tn{font-size:28px} .rh-3{grid-template-columns:minmax(0,1fr)} .rh-wk{grid-template-columns:repeat(2,minmax(0,1fr))} .rh-spk{display:none} }
  .rh-pgc{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.rh-pgb{height:auto;min-height:40px;padding:6px 14px;text-align:left;line-height:1.25}.rh-pgb[aria-pressed="true"]{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}
  .rh-pgr{margin-top:14px;border-top:1px solid var(--line);padding-top:14px}.rh-pgf{display:flex;flex-direction:column;gap:2px}.rh-pgf .txt{height:36px;min-width:150px}
  .rh-devb b{display:block;margin-bottom:4px}.rh-devi{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:4px 0;border-top:1px solid rgba(122,84,16,.15)}.rh-devi:first-of-type{border-top:0}
  .rh-ferl.pass{opacity:.55}.rh-mais{margin-top:12px;border:1px solid var(--line);border-radius:12px;padding:10px 12px}.rh-mais summary{cursor:pointer;font-weight:700;color:var(--teal-strong)}
  .rh-convm{background:var(--ground);border-radius:10px;padding:10px 12px;font-size:14px;margin:0 0 8px;white-space:normal}.rh-convq{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center;margin-top:10px}.rh-convq svg{border:1px solid var(--line);border-radius:10px;padding:6px;background:#fff}
  @media (max-width:600px){ .rh-convq{grid-template-columns:minmax(0,1fr);justify-items:center} .rh-ferl{grid-template-columns:90px minmax(0,1fr)!important} .rh-ferl .pill{display:none} }
  .rh-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.rh-kpi div{background:var(--surface);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}.rh-kpi b{font-size:30px;line-height:1.1;display:block;font-weight:700}.rh-kpi span{color:var(--muted);font-size:14px}
  .rh-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.rh-2>.card{margin:0}.rh-2+.card{margin-top:16px}
  .card h2{font-size:17px;margin:0 0 12px}.rh-ch{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:12px}.rh-ch h2{margin:0}
  .rh-bar{display:flex;height:12px;border-radius:999px;background:var(--sunken);overflow:hidden}.rh-bar i{display:block;height:100%}.rh-bar i.ok{background:var(--ok)}.rh-bar i.warn{background:var(--warn)}
  .rh-fn{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px;text-align:center}.rh-fn b{font-size:26px;display:block;font-weight:700}.rh-fn b.ok{color:var(--ok-ink)}.rh-fn b.warn{color:var(--warn-ink)}.rh-fn b.crit{color:var(--crit-ink)}.rh-fn span{color:var(--muted);font-size:13px}
  .rh-av{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}.rh-av b{display:block}.rh-av small{display:block;color:var(--muted)}
  .rh-ats{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}.rh-at{font:inherit;text-align:left;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);padding:14px 16px;cursor:pointer;display:flex;flex-direction:column;gap:3px}.rh-at b{color:var(--ink);font-size:16px}.rh-at span{color:var(--muted);font-size:13px}.rh-at:hover{border-color:var(--teal)}
  .rh-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}.rh-chip2{font:inherit;font-weight:700;font-size:14px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:0 14px;height:40px;cursor:pointer}.rh-chip2[aria-pressed="true"]{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}
  .rh-busca{display:flex;align-items:center;gap:8px;margin-left:auto}.rh-busca label{color:var(--muted);font-size:14px}.rh-busca .txt{height:40px;width:220px}.rh-modo{margin-left:4px}
  .rh-fg{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,1fr);gap:16px;align-items:start}.rh-fg>.card{margin:0}
  .rh-tw{overflow-x:auto}.rh-t{width:100%;border-collapse:collapse;font-size:14px}.rh-t th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px;border-bottom:1px solid var(--line)}.rh-t td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
  .rh-tf td small{display:block;color:var(--muted);font-size:12.5px}.rh-tf tr[data-act]{cursor:pointer}.rh-tf tr.sel td{background:var(--teal-wash)}.rh-tf tr:hover td{background:var(--surface-2)}.rh-tf tr.sel:hover td{background:var(--teal-wash)}.rh-ac{text-align:right;white-space:nowrap}
  .rh-sm{height:38px;padding:0 14px;font-size:14px}.rh-anx{cursor:pointer}label.lnk.rh-anx{display:inline}
  .rh-pv{position:relative;width:100%;aspect-ratio:1123/794;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#fff}.rh-pv iframe{position:absolute;left:0;top:0;width:1123px;height:794px;border:0;transform-origin:0 0;pointer-events:none}.rh-pv .empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .rh-2b{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rh-2b .btn{justify-content:center;width:100%}
  .rh-sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.rh-set{margin:0;display:flex;flex-direction:column}.rh-sp{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}.rh-sp+.rh-sp{margin-top:6px}.rh-ok{color:var(--ok-ink);font-weight:700;font-size:13px}.rh-wide{width:100%;justify-content:center;margin-top:auto}.rh-set .rh-wide{margin-top:14px}
  #rh-fr-slot{width:100%;height:calc(100vh - 210px);min-height:620px}.rh-frx{position:fixed;z-index:3;border:0;border-radius:12px;background:var(--ground);display:none}
  .rh-fil{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.rh-fil .txt{height:40px;flex:0 1 auto;width:auto;max-width:none}.rh-fil #rh-q{flex:1 1 240px}
  .rh-form{border:1.5px solid var(--teal)}.rh-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}.rh-g label{display:flex;flex-direction:column;gap:4px}@media (max-width:640px){.rh-g label{grid-column:auto!important}}.rh-it{display:flex;gap:8px;margin-bottom:6px}
  .rh-docs{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.rh-docs .rh-ch{margin-bottom:4px}.rh-dl{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line-2,var(--line))}.rh-dl b{display:block;font-size:14px}.rh-dl small{color:var(--muted);font-size:12.5px}
  .rh-dg{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,2fr);gap:16px;align-items:start}.rh-dg>.card{margin:0}.rh-dlist{padding:8px}
  .rh-dm{font:inherit;display:block;width:100%;text-align:left;border:0;background:none;border-radius:10px;padding:12px 14px;cursor:pointer;color:var(--ink)}.rh-dm b{display:block;font-size:15px}.rh-dm small{color:var(--muted);font-size:12.5px}.rh-dm:hover{background:var(--surface-2)}.rh-dm.sel{background:var(--teal-wash)}
  .rh-g2{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:12px}.rh-g2 label,.rh-lb{display:flex;flex-direction:column;gap:4px}.rh-lb{margin-bottom:10px}.rh-lb>span:not(.label){font-size:13px;color:var(--ink-2)}
  .rh-tks{display:flex;flex-wrap:wrap;gap:6px}.rh-tkb{font:inherit;font-size:13px;border:1px solid var(--teal-tint);background:var(--teal-wash);color:var(--teal-strong);border-radius:999px;padding:5px 11px;cursor:pointer}.rh-tkb:hover{border-color:var(--teal)}
  .rh-edw{border:1.5px solid var(--line);border-radius:12px;margin-top:12px;overflow:hidden}.rh-tb{display:flex;gap:6px;flex-wrap:wrap;padding:8px;background:var(--surface-2);border-bottom:1px solid var(--line)}.rh-tb button{font:inherit;font-size:13px;min-width:38px;height:36px;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:0 10px;cursor:pointer;color:var(--ink)}
  .rh-ed{min-height:380px;max-height:62vh;overflow:auto;padding:22px 24px;background:#fff;color:#111;font-family:"Times New Roman",Georgia,serif;font-size:16px;line-height:1.65;outline:none}.rh-ed:empty::before{content:attr(data-ph);color:#8a8578}.rh-ed h1,.rh-ed h2,.rh-ed h3{text-align:center;font-size:17px;margin:0 0 14px}.rh-ed p{margin:0 0 10px}
  .rh-tk{display:inline-block;background:#E3ECF0;color:#143F54;border-radius:6px;padding:0 6px;font-family:"Segoe UI",system-ui,sans-serif;font-size:.82em;font-weight:700;line-height:1.5;user-select:all}
  .rh-tq{display:inline-block;background:#FFF1CC;color:#7A5410;border-radius:6px;padding:0 6px;font-family:"Segoe UI",system-ui,sans-serif;font-size:.82em;font-weight:700;line-height:1.5;user-select:all}
  .rh-2c{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px 24px}.rh-an{display:grid;grid-template-columns:50px minmax(0,1fr);column-gap:10px;padding:7px 0;border-top:1px solid var(--line)}.rh-an span{grid-row:span 2;color:var(--muted);font-weight:700}.rh-an small{color:var(--muted)}.rh-an.hoje b{color:var(--teal-strong)}
  .rh-ag{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.rh-agc h2+.rh-ag{border-top:0}.rh-agd b{display:block;font-size:16px}.rh-agd small{color:var(--muted);font-size:12px}
  .rh-ag b{display:block}.rh-ag small{display:block;color:var(--muted);font-size:12.5px}.rh-agt{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.rh-ag.crit .rh-agt{color:var(--crit-ink)}.rh-ag.warn .rh-agt{color:var(--warn-ink)}.rh-ag.crit{box-shadow:inset 4px 0 0 var(--crit);padding-left:10px}.rh-ag.warn{box-shadow:inset 4px 0 0 var(--warn);padding-left:10px}
  .rh-pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start}.rh-pg>.card{margin:0}.rh-pgw{grid-column:1/-1}.rh-pd{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line)}.rh-pd:first-of-type{border-top:0}.rh-pd span{color:var(--muted)}.rh-pd b{text-align:right}
  .rh-nm{font:inherit;font-weight:700;color:var(--ink);background:none;border:0;padding:0;cursor:pointer;text-align:left}.rh-nm:hover{color:var(--teal);text-decoration:underline}
  .rh-bus{padding:14px 18px}.rh-busl{display:flex;flex-direction:column;gap:6px}.rh-busr{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:10px}.rh-busi{font:inherit;text-align:left;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);padding:10px 12px;cursor:pointer;color:var(--ink)}.rh-busi:hover{border-color:var(--teal)}.rh-busi b{display:block}.rh-busi small{color:var(--muted)}
  .rh-ap{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--line)}.rh-ap b{display:block}.rh-ap small{display:block;color:var(--muted)}.rh-apn{width:30px;height:30px;border-radius:50%;background:var(--teal-wash);color:var(--teal-strong);font-weight:700;display:flex;align-items:center;justify-content:center}.rh-ap.ok .rh-apn{background:var(--ok);color:#fff}
  .rh-adoc{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 14px;margin-top:8px}.rh-lsel{max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px 10px;display:flex;flex-direction:column;gap:2px}
  .rh-dfoot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
  .rh-gg{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:16px;align-items:start}.rh-gg>.card{margin:0}.rh-sep{border-top:1px solid var(--line);margin:12px 0}
  .rh-amar{background:#FFF8E6!important;border-color:#E3B341!important;color:#1A1A1A}.rh-dbt{display:flex;flex-direction:column;gap:10px;margin-top:6px}.rh-dbt .btn{justify-content:center;width:100%}
  .rh-page{background:#fff;color:#111;border-radius:6px;box-shadow:var(--shadow);padding:44px 48px;font-family:"Times New Roman",Georgia,serif;font-size:16px;line-height:1.7}.rh-page h1,.rh-page h2,.rh-page h3{text-align:center;font-size:17px;margin:0 0 16px;letter-spacing:.02em}.rh-page p{margin:0 0 12px}
  .rh-v{background:#FFF1CC;border-bottom:1.5px solid #C99A2E;padding:0 3px}.rh-falta{color:#A2453D;background:#FBE4E1;padding:0 3px}.rh-page .rh-ass{display:flex;gap:30px;margin-top:56px}.rh-page .rh-ass div{flex:1;border-top:1px solid #111;text-align:center;padding-top:4px;font-family:"Segoe UI",system-ui,sans-serif;font-size:13px}.rh-page .empty{font-family:"Segoe UI",system-ui,sans-serif}
  .rh-modal{position:fixed;inset:0;z-index:60;background:rgba(20,40,52,.5);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}.rh-mbox{background:var(--surface);border-radius:16px;padding:20px;max-width:820px;width:100%}.rh-mbox .rh-page{box-shadow:none;border:1px solid var(--line)}
  .rh-cadl{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}.rh-cadn{position:sticky;top:12px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:2px}
  .rh-cadg{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--muted);padding:10px 10px 4px}.rh-cadg:first-child{padding-top:4px}
  .rh-cn{font:inherit;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;border:0;background:none;border-radius:10px;padding:9px 10px;cursor:pointer;color:var(--ink);font-size:15px}.rh-cn:hover{background:var(--surface-2,#f6f4ee)}
  .rh-cn[aria-current]{background:var(--teal-wash,#e4eef3);color:var(--teal-strong);font-weight:700}.rh-cn small{color:var(--muted);font-size:12.5px}.rh-cn .pill{font-size:11.5px}
  .rh-cadc{min-width:0}.rh-cadc>.card{margin-top:0}.rh-cadc>.banner{margin:0 0 12px}.rh-cadh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin:0 0 12px}.rh-cadh h2{margin:0;font-size:21px}.rh-cadh .sub{margin-top:2px}
  .rh-cadt{display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:12px}.rh-cadb{display:flex;gap:10px;align-items:center;flex:1 1 260px;max-width:420px}.rh-cadb .txt{flex:1}.rh-cadnew{display:flex;gap:10px;flex-wrap:wrap;flex:1 1 360px}.rh-cadnew .txt{flex:1;min-width:200px}
  .rh-ct td{vertical-align:middle}.rh-ct .rh-cl{display:inline-block;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;color:var(--muted)}.rh-cact{text-align:right;white-space:nowrap}.rh-cact .lnk+.lnk{margin-left:12px}.rh-ct tr.rh-inat{opacity:.6}
  .rh-ffm{max-width:960px}.rh-ffi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}.rh-ffh{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:6px;flex-wrap:wrap}
  .rh-ffm .rh-it{display:grid;grid-template-columns:22px minmax(0,1fr) 110px 30px;gap:6px;align-items:center;margin-bottom:6px}.rh-itn{color:var(--muted);font-size:12.5px;text-align:right}.rh-itx{border:0;background:none;font-size:20px;line-height:1;color:var(--crit-ink);cursor:pointer;border-radius:8px;height:32px}.rh-itx:hover{background:var(--crit-tint)}
  .rh-itadd{margin:2px 0 0 28px;font-size:14px}.rh-ffc{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.rh-ffc .txt{max-width:280px}
  @media (max-width:860px){ .rh-cadl{grid-template-columns:minmax(0,1fr)} .rh-cadn{position:static;flex-direction:row;overflow-x:auto;padding:6px;gap:4px} .rh-cadg{display:none} .rh-cn{white-space:nowrap;flex:0 0 auto} .rh-ffi{grid-template-columns:minmax(0,1fr)} .rh-ffm .rh-it{grid-template-columns:20px minmax(0,1fr) 84px 30px} .rh-ct .rh-cl{max-width:160px} }
  .od-cfg summary{cursor:pointer}.od-cfg[open] summary{margin-bottom:6px}
  @media (min-width:861px){ body.rh-solo #view>nav.tabs{display:none} }
  @media (max-width:1100px){ .rh-fg,.rh-dg,.rh-gg{grid-template-columns:minmax(0,1fr)} .rh-busca{margin-left:0;flex:1 1 220px}.rh-busca .txt{flex:1;width:auto} }
  @media (max-width:760px){ .rh-2,.rh-dash{grid-template-columns:minmax(0,1fr)} .rh-kpi{grid-template-columns:repeat(2,minmax(0,1fr))} .rh-g2{grid-template-columns:minmax(0,1fr)} .rh-page{padding:24px 18px;font-size:15px} .rh-tf thead{display:none}.rh-tf,.rh-tf tbody{display:block}.rh-tf tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 10px;align-items:center;padding:12px 6px;border-bottom:1px solid var(--line)}.rh-tf td{border:0;padding:0}.rh-tf td:nth-child(1){grid-column:1/-1}.rh-tf td:nth-child(2){display:none}.rh-tf tr.sel{background:var(--teal-wash)} .rh-acoes .btn{flex:1 1 auto;justify-content:center} }</style>`);
})();
