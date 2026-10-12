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
  const R={terc:[],ft:null,tfil:'ativos',func:[],funcoes:[],cfg:{},lido:{},f:null,ff:null,filtro:{q:'',st:'ativos',setor:'',emp:'',tipo:''},salv:false,arqAbrir:null,
    fm:{},esc:{},fv:'mes',fmes:P.hojeStr().slice(0,7),ffil:{sit:'todas',q:'',setor:'',n:60},fsel:null,prev:{},
    modelos:[],docs:[],dv:'modelos',dm:null,dprev:false,dg:{funcId:'',modeloId:'',extra:{},resp:{},feriasId:'',guardar:true},dgReg:{},
    fer:[],pzv:'ferias',pzfil:'atencao',ffer:null,fpj:null,fdesl:null,tdoc:null,tdf:null,
    pess:null,adm:null,carga:null,agv:'agenda',agDias:30,relMes:P.hojeStr().slice(0,7),buscaIni:''};
  const COL={terc:'rh/dados/terceiros',func:'rh/dados/funcionarios',funcoes:'rh/dados/funcoes',fm:'rh/dados/fichasmes',modelos:'rh/dados/modelos',docs:'rh/dados/docsgerados',ferias:'rh/dados/ferias',lista:'rh/arquivos/lista',partes:'rh/arquivos/partes'};
  const ST=['Ativo','Férias','Afastado','Desligado'];
  /* empresas: todo CLT é Colafix; PJ é Zenith ou Nexus (ou outra) */
  const EMP_PJ=[['ZENITH','Zenith'],['NEXUS','Nexus']], EMP_NOME={COLAFIX:'Colafix',ZENITH:'Zenith',NEXUS:'Nexus'};
  /* razão social e CNPJ para os documentos — os mesmos de EMPRESAS_CONHECIDAS em modulos/rh-fichas.html */
  const EMP_DOC={COLAFIX:{nome:'COLFIX INDUSTRIA E COMERCIO LTDA - EPP',cnpj:'08.813.381/0001-30'},ZENITH:{nome:'ZENITH SOLUÇÕES INDUSTRIAIS LTDA',cnpj:'62.944.495/0001-93'},NEXUS:{nome:'NEXUS MANUTENÇÕES LTDA',cnpj:'67.927.237/0001-93'}};
  const empNome=e=>EMP_NOME[e]||e||'';
  const empPadrao=(tipo,txt)=>{ if(tipo!=='PJ') return 'COLAFIX'; const n=String(txt||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase(); return /ZENITH/.test(n)?'ZENITH':/NEXUS/.test(n)?'NEXUS':n.trim(); };
  const esc=P.esc, eu=()=>(P.S.uid&&P.S.nomes&&P.S.nomes[P.S.uid])||'', agora=()=>new Date().toISOString();
  const dig=s=>String(s||'').replace(/\D/g,''), norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase();
  const fCPF=c=>{ c=dig(c); return c.length===11?c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):c; };
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
  function iniciar(){ const sub=(k,mk)=>P.inscrever('rh-'+k,mk,snap=>{ R[k]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); R.lido[k]=true; P.rerender(); if(k==='func') setTimeout(()=>aplicarDesligAgendados(),0); });
    sub('func',()=>P.db().collection(COL.func).limit(3000)); sub('funcoes',()=>P.db().collection(COL.funcoes).limit(500)); sub('terc',()=>P.db().collection(COL.terc).limit(1000));
    sub('modelos',()=>P.db().collection(COL.modelos).limit(200)); sub('docs',()=>P.db().collection(COL.docs).orderBy('em','desc').limit(300)); sub('fer',()=>P.db().collection(COL.ferias).limit(3000));
    P.inscrever('rh-fm',()=>P.db().collection(COL.fm).orderBy('mes','desc').limit(14),snap=>{ snap.docs.forEach(d=>{ R.fm[d.id]=d.data(); }); R.lido.fm=true; P.rerender(); });
    P.inscrever('rh-cfg',()=>P.db().collection('rh').limit(5),snap=>{ const d=snap.docs.find(x=>x.id==='config'); R.cfg=d?d.data():{}; P.rerender(); });
    const m=location.search.match(/[?&]rhfile=([^&]+)/); if(m){ R.arqAbrir=decodeURIComponent(m[1]); P.go('rhfichas'); } }

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
      const colab=[['Nome','CPF','Função','Setor','Data de admissão','Empresa','Status','Tipo']].concat(FU.map(x=>[x.nome,fCPF(x.cpf),x.funcao||'',x.setor||'',DIAS(x.admissao),x.empresa||'',x.status==='Desligado'&&!(okIso(x.desligamento)&&x.desligamento.slice(0,7)>=P.hojeStr().slice(0,7))?'Inativo':'Ativo',x.tipo==='PJ'?'PJ':'CLT']));
      const cab=(p,s)=>{ const h=['Função']; for(let n=1;n<=9;n++) h.push(p+' '+n,s+' '+n); return h; };
      const linha=(nome,its,k)=>{ const r=[nome]; for(let n=0;n<9;n++){ const x=its[n]; r.push(x?x.nome:'',x?(x[k]||''):''); } return r; };
      const epi=[cab('EPI','CA')].concat(FC.map(x=>linha(x.nome,x.epis||[],'ca')));
      const uni=[cab('Uniforme','Tamanho')].concat(FC.map(x=>linha(x.nome,x.uniformes||[],'tam')));
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
  function fichasGerar(o){ R.fv='gerar'; P.go('rhfichas'); fichasRodar(F=>F.preparar(Object.assign({mes:R.fmes},o))); }
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
  P.registrarAviso(()=>tAvisos().map(o=>({nivel:o.s.c,rotulo:o.s.d<0?'Vencido':o.s.d===0?'Vence hoje':'Atenção',titulo:'Contrato de terceirizado: '+o.x.nome,texto:o.s.t+' ('+br(o.x.fim)+')'+(o.x.empresa?' · '+o.x.empresa:''),go:'rhterc'})));
  function avisosRH(){ const av=[];
    tAvisos().forEach(({x,s})=>{ const d=s.d; av.push({c:s.c,r:d<0?'Vencido':d===0?'Vence hoje':'Atenção',t:'Contrato: '+x.nome,s:(d<0?'venceu há '+(-d)+' dia'+(d===-1?'':'s'):d===0?'vence hoje':'vence em '+d+' dia'+(d===1?'':'s'))+' ('+br(x.fim).slice(0,5)+')',act:`data-act="rh-ted" data-go-terc="1" data-id="${x._id}"`,l:'Abrir'}); });
    const porF={}; ativos().filter(f=>f.funcao&&semEpi(f)).forEach(f=>{ const k=norm(f.funcao); (porF[k]=porF[k]||{nome:f.funcao,n:0}).n++; });
    Object.values(porF).sort((a,b)=>b.n-a.n).forEach(o=>av.push({c:'warn',r:'Atenção',t:'Função "'+o.nome+'" sem EPI cadastrado',s:'a ficha de '+o.n+(o.n===1?' pessoa':' pessoas')+' sai sem itens',act:`data-act="rh-fsemepi" data-n="${esc(o.nome)}"`,l:'Resolver'}));
    avisosPrazo().forEach(a=>av.push(a));
    ativos().forEach(f=>{ const fl=admFaltam(f); if(fl.length&&okIso(f.admissao)&&f.admissao>=addDias(P.hojeStr(),-90)) av.push({c:'warn',r:'Atenção',t:'Admissão: '+f.nome,s:'falta entregar '+plural(fl.length,'documento','documentos')+': '+fl.slice(0,3).join(', ')+(fl.length>3?'…':''),act:`data-act="rh-admabrir" data-id="${f._id}"`,l:'Abrir'}); });
    tDocAvisos().forEach(({x,d,s})=>av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'Documento: '+d.nome+' · '+x.nome,s:s.t.toLowerCase()+(okIso(d.validade)?' ('+br(d.validade).slice(0,5)+')':''),act:`data-act="rh-tdoc" data-go-terc="1" data-id="${x._id}"`,l:'Abrir'}));
    const semFunc=ativos().filter(f=>!f.funcao);
    if(semFunc.length) av.push({c:'warn',r:'Atenção',t:semFunc.length+(semFunc.length===1?' funcionário sem função':' funcionários sem função'),s:'a ficha não tem itens: '+semFunc.slice(0,3).map(f=>f.nome).join(', ')+(semFunc.length>3?'…':''),act:'data-go="rhfunc"',l:'Resolver'});
    return av; }
  function barra(c,tot){ const p=n=>tot?(n/tot*100).toFixed(2):0; return `<div class="rh-bar" role="img" aria-label="${c.ass} assinadas, ${c.imp} falta assinar, ${c.nao} não geradas"><i class="ok" style="width:${p(c.ass)}%"></i><i class="warn" style="width:${p(c.imp)}%"></i></div>`; }
  function vInicio(){ const m=P.hojeStr().slice(0,7), cnt=s=>R.func.filter(x=>x.status===s).length, nT=R.terc.filter(x=>x.status!=='Encerrado').length;
    escCarregar(m); const fr=fResumo(m), av=avisosRH(), h=new Date().getHours(), saud=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite', nome=(eu().split(' ')[0]||'');
    const d=new Date(P.hojeStr()+'T12:00:00'), sub=DIAS_SEM[d.getDay()]+', '+d.getDate()+' de '+MESES[d.getMonth()]+' · o que precisa de atenção';
    const at=(go,t,s,ex)=>`<button class="rh-at" ${go?`data-go="${go}"`:''} ${ex||''}><b>${t}</b><span>${s}</span></button>`;
    return topo(esc(saud+(nome?', '+nome:'')),sub,`<button class="btn" data-act="rh-fabrir">Abrir fichas de ${mesNome(m)}</button>`)
      +cartaoBusca()+`<div class="rh-kpi">${[[cnt('Ativo'),'em atividade'],[cnt('Férias'),'de férias'],[cnt('Afastado'),cnt('Afastado')===1?'afastado':'afastados'],[nT,'terceirizados']].map(([n,l])=>`<div><b class="num">${n}</b><span>${l}</span></div>`).join('')}</div>
      <div class="rh-2"><section class="card"><div class="rh-ch"><h2>Fichas de ${mesNome(m)}</h2><button class="lnk" data-act="rh-fabrir">Ver todas</button></div>
          ${!R.lido.func?'<div class="empty">Carregando…</div>':fr.tot?`${barra(fr.c,fr.tot)}<div class="rh-fn"><div><b class="num ok">${fr.c.ass}</b><span>assinadas e anexadas</span></div><div><b class="num warn">${fr.c.imp}</b><span>impressas, falta assinar</span></div><div><b class="num crit">${fr.c.nao}</b><span>ainda não geradas</span></div></div>`:'<div class="empty">Nenhum funcionário em atividade.</div>'}</section>
        <section class="card"><h2>Avisos</h2>${av.length?av.map(a=>`<div class="rh-av"><span class="pill ${a.c==='crit'?'crit':'warn'}">${esc(a.r)}</span><div><b>${esc(a.t)}</b><small>${esc(a.s)}</small></div><button class="lnk" ${a.act}>${a.l}</button></div>`).join(''):'<div class="empty">Nada pendente. Tudo em dia.</div>'}</section></div>
      ${cartaoAniv()}<section class="card"><h2>Atalhos</h2><div class="rh-ats">${at('','Gerar fichas do mês','todas de uma vez, em PDF','data-act="rh-fgerartela"')}${at('','Anexar fichas assinadas','foto ou PDF escaneado','data-act="rh-fanexar"')}${at('','Nova admissão','cadastro, documentos, contrato e ficha','data-act="rh-admnova"')}${at('rhagenda','Agenda','tudo o que vence, com Outlook')}${at('','Relatório do mês','para a contabilidade','data-act="rh-agrel"')}${at('rhterc','Terceirizados','prazo dos contratos')}</div></section>`; }

  /* ---------- Fichas do mês ---------- */
  function vFichas(){ const m=R.fmes, hoje=P.hojeStr().slice(0,7); escCarregar(m);
    const ban=(R.arqAbrir?`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong);display:flex;justify-content:space-between;gap:10px;align-items:center"><span>Arquivo pronto para abrir.</span><span><button class="btn" data-act="rh-arq">Abrir arquivo</button> <button class="lnk" data-act="rh-arqx">Fechar</button></span></div>`:'');
    const EY='RH · FICHAS DE EPI E UNIFORME';
    if(R.fv==='gerar') return topo('Gerar e imprimir','Mesmas opções e filtros de hoje. A ficha impressa não muda.',`<button class="btn sec" data-act="rh-fvmes">‹ Fichas de ${mesNome(m)}</button>`,EY)+odBarra()+ban+`<div id="rh-fr-slot"></div>`;
    frEl(); const fr=fResumo(m), faltam=fr.xs.filter(o=>o.s.k==='nao'||(o.s.k==='semepi'&&!o.s.i));
    const ant=mesMais(m,-1), prox=mesMais(m,1);
    const acoes=`<button class="btn sec" data-act="rh-fmes" data-v="-1">‹ ${cap(mesNome(ant))}</button>${m<hoje?`<button class="btn sec" data-act="rh-fmes" data-v="1">${cap(mesNome(prox))} ›</button>`:''}
      ${faltam.length?`<button class="btn" data-act="rh-ffaltam">Gerar ${faltam.length===1?'a que falta':'as '+faltam.length+' que faltam'}</button>`:''}
      ${R.fmodo==='setor'?'<button class="btn sec" data-act="rh-fimptodas" data-setor="1">Imprimir por setor</button>':'<button class="btn sec" data-act="rh-fimptodas">Imprimir todas</button>'}
      <button class="btn sec" data-act="rh-fvgerar" title="Todas as opções e filtros (vínculo, empresa, setor, função), fichas escaneadas e busca">Gerar e imprimir</button>`;
    const sub=fr.tot?`${fr.c.ass} de ${fr.tot} assinadas · ${fr.c.imp} falta assinar · ${fr.c.nao} não geradas`:'';
    const seg=`<div class="seg rh-modo" role="group" aria-label="Como mostrar">${[['lista','Lista'],['setor','Por setor']].map(([k,l])=>`<button data-act="rh-fmodo" data-v="${k}" aria-pressed="${R.fmodo===k}">${l}</button>`).join('')}</div>`;
    return topo(mesTitulo(m),sub,acoes,EY)+odBarra()+ban+(!R.lido.func?'<section class="card"><div class="empty">Carregando…</div></section>':!fr.tot?'<section class="card"><div class="empty">Nenhum funcionário em atividade. Cadastre em Funcionários.</div></section>':R.fmodo==='setor'?vFichasSetor(fr,seg):vFichasLista(fr,m,seg)); }
  function vFichasLista(fr,m,seg){ const F=R.ffil, q=norm(F.q), qd=dig(F.q);
    const cnt={todas:fr.tot,nao:fr.c.nao,imp:fr.c.imp,ass:fr.c.ass};
    const grupo=s=>s.k==='semepi'?(s.i?'imp':'nao'):s.k;
    let xs=fr.xs.filter(o=>(F.sit==='todas'||grupo(o.s)===F.sit)&&(!F.setor||(o.f.setor||'Sem setor')===F.setor)&&(!q||norm(o.f.nome).includes(q)||(qd&&dig(o.f.cpf).includes(qd))));
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
  function vFunc(){ if(R.pess&&!R.f&&!R.fdesl) return vPessoa(); return bannerTerc()+vFunc0(); }
  function vFunc0(){ const F=R.filtro, q=norm(F.q);
    let xs=R.func.filter(x=>(F.st==='ativos'?x.status!=='Desligado':F.st==='todos'?true:x.status===F.st)&&(!F.setor||x.setor===F.setor)&&(!F.emp||x.empresa===F.emp)&&(!F.tipo||x.tipo===F.tipo)&&(!q||norm(x.nome).includes(q)||dig(x.cpf).includes(dig(F.q)||'#')||norm(x.funcao).includes(q)));
    xs.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    const cnt=s=>R.func.filter(x=>x.status===s).length;
    return topo('Funcionários','Cadastro, situação e o que cada um usa.',`<button class="btn" data-act="rh-admnova">${P.ic('mais',18,2.4)}Nova admissão</button><button class="btn sec" data-act="rh-novo">Novo funcionário</button><button class="btn sec" data-act="rh-carga">Carga inicial</button><label class="btn sec" style="cursor:pointer">${P.ic('baixar',18,2)}Importar (Excel/CSV)<input type="file" id="rh-imp" accept=".xlsx,.xls,.csv" hidden></label><button class="btn sec" data-act="rh-csv">Exportar</button>`)
      +(R.carga?vCarga():'')+(R.adm&&!R.f?vAdm():'')+(R.fdesl?formDesl():'')+(R.f?formFunc():'')
      +`<div class="rh-kpi">${ST.map(s=>`<div><b class="num">${cnt(s)}</b><span>${s}</span></div>`).join('')}</div>
      <section class="card"><div class="rh-fil"><input class="txt" id="rh-q" placeholder="Buscar nome, CPF ou função" value="${esc(F.q)}">
        <select class="txt" data-rh-fil="st"><option value="ativos" ${F.st==='ativos'?'selected':''}>Em atividade</option>${ST.map(s=>`<option ${F.st===s?'selected':''}>${s}</option>`).join('')}<option value="todos" ${F.st==='todos'?'selected':''}>Todos</option></select>
        <select class="txt" data-rh-fil="setor"><option value="">Todos os setores</option>${opts(unicos('setor'),F.setor)}</select>
        <select class="txt" data-rh-fil="emp"><option value="">Todas as empresas</option>${unicos('empresa').map(e=>`<option value="${esc(e)}" ${F.emp===e?'selected':''}>${esc(empNome(e))}</option>`).join('')}</select>
        <select class="txt" data-rh-fil="tipo"><option value="">CLT e PJ</option>${opts(['CLT','PJ'],F.tipo)}</select></div>
      ${!R.lido.func?'<div class="empty">Carregando…</div>':xs.length?`<div class="rh-tw"><table class="rh-t"><thead><tr><th>Nome</th><th>CPF</th><th>Função</th><th>Setor</th><th>Empresa</th><th>Admissão</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(x=>`<tr><td><button class="rh-nm" data-act="rh-pess" data-id="${x._id}">${esc(x.nome)}</button>${x.tipo==='PJ'?' <span class="pill neu">PJ</span>':''}</td><td class="num">${esc(fCPF(x.cpf))}</td><td>${esc(x.funcao||'')}</td><td>${esc(x.setor||'')}</td><td>${esc(empNome(x.empresa))}</td><td class="num">${br(x.admissao)}</td>
          <td><span class="pill ${corSt(x.status)}">${esc(x.status||'')}</span>${x.status==='Desligado'&&x.desligamento?`<small style="display:block;color:var(--muted)">${br(x.desligamento)}${x.desligMotivo?' · '+esc(x.desligMotivo):''}</small>`:x.desligAgendado&&okIso(x.desligamento)?`<small style="display:block;color:var(--crit-ink)">sai em ${br(x.desligamento)}</small>`:expInfo(x)?`<small style="display:block;color:var(--muted)">em experiência</small>`:''}</td><td><button class="lnk" data-act="rh-ed" data-id="${x._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>
        <div class="sub" style="margin:8px 0 0">${xs.length} funcionário(s)</div>`:'<div class="empty">Nenhum funcionário com esses filtros.</div>'}</section>`; }
  function formFunc(){ const f=R.f, fs=R.funcoes.map(x=>x.nome).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const i=(k,l,t,ex)=>`<label><span class="label">${l}</span><input class="txt" data-rh-f="${k}" type="${t||'text'}" value="${esc(f[k]==null?'':f[k])}" ${ex||''}></label>`;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>${f.admNova?'Nova admissão · cadastro':(f._id?'Editar':'Novo')+' funcionário'}</h2><button class="lnk" data-act="rh-fx">Fechar</button></div>
      <div class="rh-g">${i('nome','Nome completo *')}${i('cpf','CPF *','text','inputmode="numeric" maxlength="14"')}
        <label><span class="label">Função</span><input class="txt" data-rh-f="funcao" list="rh-funcoes" value="${esc(f.funcao||'')}"><datalist id="rh-funcoes">${fs.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
        ${i('setor','Setor')}
        <label><span class="label">Vínculo</span><select class="txt" data-rh-f="tipo">${opts(['CLT','PJ'],f.tipo||'CLT')}</select></label>
        ${(f.tipo||'CLT')==='CLT'?`<label><span class="label">Empresa</span><input class="txt" value="Colafix (todo CLT)" disabled></label>`
          :`<label><span class="label">Empresa (PJ) *</span><select class="txt" data-rh-f="empresaSel">${EMP_PJ.map(([k,n])=>`<option value="${k}" ${(f.empresaSel||f.empresa)===k?'selected':''}>${n}</option>`).join('')}<option value="OUTRA" ${f.empresaSel==='OUTRA'||(f.empresa&&!EMP_PJ.some(x=>x[0]===f.empresa)&&f.empresa!=='COLAFIX')?'selected':''}>Outra…</option></select></label>
             ${f.empresaSel==='OUTRA'||(!f.empresaSel&&f.empresa&&!EMP_PJ.some(x=>x[0]===f.empresa)&&f.empresa!=='COLAFIX')?`<label><span class="label">Nome da outra empresa *</span><input class="txt" data-rh-f="empresaOutra" value="${esc(f.empresaOutra||(EMP_PJ.some(x=>x[0]===f.empresa)||f.empresa==='COLAFIX'?'':f.empresa||''))}"></label>`:''}`}
        ${i('admissao','Admissão','date')}${i('nascimento','Nascimento','date')}
        <label><span class="label">Situação</span><select class="txt" data-rh-f="status">${opts(ST,f.status||'Ativo')}</select></label>
        ${f.status==='Desligado'?i('desligamento','Data do desligamento','date')+`<label><span class="label">Motivo do desligamento</span><input class="txt" data-rh-f="desligMotivo" list="rh-motivos2" value="${esc(f.desligMotivo||'')}"><datalist id="rh-motivos2">${MOTIVOS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label>`:''}
        ${i('telefone','Telefone','tel')}${i('camisa','Tamanho da camisa')}${i('calca','Tamanho da calça')}${i('calcado','Número do calçado')}
        <label><span class="label">Salário (para os contratos)</span><input class="txt" data-rh-f="salario" inputmode="decimal" placeholder="R$ 0,00" value="${esc(f.salario!=null&&f.salario!==''?brl(f.salario):'')}"></label>${i('jornada','Jornada (para os contratos)','text','placeholder="ex.: 44 horas semanais"')}</div>
      <label style="display:block;margin-top:10px"><span class="label">Observações</span><textarea class="txt" data-rh-f="obs" rows="2">${esc(f.obs||'')}</textarea></label>
      ${f.desligAgendado&&okIso(f.desligamento)&&f.status!=='Desligado'?`<div class="banner" style="background:var(--crit-tint);color:var(--crit-ink);margin:12px 0 0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>Desligamento marcado para <b>${br(f.desligamento)}</b>${f.desligMotivo?' · '+esc(f.desligMotivo):''}. Até lá continua ativo.</span><button class="lnk" data-act="rh-desagx" data-id="${f._id}">Cancelar desligamento</button></div>`:''}
      ${f._id?docsDaPessoa(f._id):''}
      ${f.alteradoEm?`<div class="sub" style="margin:8px 0 0;font-size:12px">Última alteração: ${new Date(f.alteradoEm).toLocaleString('pt-BR')}${f.alteradoNome?' · '+esc(f.alteradoNome):''}</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap">${f._id&&f.status!=='Desligado'&&!f.desligAgendado?`<button class="lnk" data-act="rh-desl" data-id="${f._id}" style="color:var(--crit-ink)">Desligar…</button>`:'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="rh-fx">Cancelar</button><button class="btn" data-act="rh-salvar" ${R.salv?'disabled':''}>${R.salv?'Salvando…':'Salvar'}</button></div></div></section>`; }
  function docsDaPessoa(fid){ const xs=R.docs.filter(d=>d.funcId===fid);
    return `<div class="rh-docs"><div class="rh-ch"><span class="label">DOCUMENTOS</span><button class="lnk" data-act="rh-dgpara" data-id="${fid}">Gerar documento</button></div>
      ${xs.length?xs.slice(0,8).map(d=>`<div class="rh-dl"><div><b>${esc(d.modelo||'Documento')}</b><small>gerado em ${dmIso(d.em)}/${String(d.em||'').slice(0,4)}${d.porNome?' por '+esc(d.porNome):''}</small></div>${d.assinado?`<button class="lnk" data-act="rh-dver" data-id="${d._id}">Ver assinado</button>`:anexar(`data-rh-danx="${d._id}"`,'Anexar assinado','lnk')}</div>`).join(''):'<div class="sub" style="margin:4px 0 0">Nenhum documento gerado ainda.</div>'}</div>`; }

  /* ---------- Funções e EPIs ---------- */
  function vFuncoes(){ const ff=R.ff, semCad=unicos('funcao').filter(n=>!R.funcoes.some(x=>norm(x.nome)===norm(n)));
    const lin=(arr,k,ph)=>{ const xs=(arr||[]).concat([{}]).slice(0,9); return xs.map((x,i)=>`<div class="rh-it"><input class="txt" data-rh-it="${k}" data-i="${i}" data-c="nome" placeholder="${k==='epis'?'EPI':'Peça do uniforme'} ${i+1}" value="${esc(x.nome||'')}"><input class="txt" data-rh-it="${k}" data-i="${i}" data-c="${k==='epis'?'ca':'tam'}" placeholder="${ph}" value="${esc(x[k==='epis'?'ca':'tam']||'')}" style="max-width:150px"></div>`).join(''); };
    return topo('Funções e EPIs','O que cada função recebe. É daqui que as fichas puxam os itens e o CA.',`<button class="btn" data-act="rh-fnovo">${P.ic('mais',18,2.4)}Nova função</button>`)
      +(semCad.length?`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink)">Funções usadas por funcionários e ainda sem EPI/uniforme: ${semCad.map(n=>`<button class="lnk" data-act="rh-fnovo" data-n="${esc(n)}">${esc(n)}</button>`).join(', ')}</div>`:'')
      +(ff?`<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>${ff._id?'Editar':'Nova'} função</h2><button class="lnk" data-act="rh-ffx">Fechar</button></div>
        <label><span class="label">Nome da função *</span><input class="txt" data-rh-ff="nome" value="${esc(ff.nome||'')}"></label>
        <div class="two" style="gap:16px;margin-top:12px;align-items:start"><div><div class="label" style="margin-bottom:6px">EPIs (com CA)</div>${lin(ff.epis,'epis','CA')}</div><div><div class="label" style="margin-bottom:6px">Uniforme (com tamanho)</div>${lin(ff.uniformes,'uniformes','Tamanho')}</div></div>
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px">${ff._id?'<button class="lnk" data-act="rh-fdel" style="color:var(--crit-ink)">Apagar função</button>':'<span></span>'}<div style="display:flex;gap:10px"><button class="btn sec" data-act="rh-ffx">Cancelar</button><button class="btn" data-act="rh-fsalvar">Salvar</button></div></div></section>`:'')
      +`<section class="card">${R.funcoes.length?R.funcoes.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(x=>`<div class="row" style="grid-template-columns:minmax(0,1fr) auto;align-items:start"><div><b>${esc(x.nome)}</b>
          <small style="display:block;color:var(--muted)">EPI: ${(x.epis||[]).map(e=>esc(e.nome)+(e.ca?' (CA '+esc(e.ca)+')':'')).join(', ')||'—'}</small><small style="display:block;color:var(--muted)">Uniforme: ${(x.uniformes||[]).map(e=>esc(e.nome)+(e.tam?' ('+esc(e.tam)+')':'')).join(', ')||'—'}</small></div>
          <button class="lnk" data-act="rh-fed" data-id="${x._id}">Editar</button></div>`).join(''):'<div class="empty">Nenhuma função cadastrada.</div>'}</section>`
      +`<section class="card"><div class="label">TEXTOS DAS FICHAS</div><div class="sub" style="margin:4px 0 10px">Declarações impressas nas fichas. Em branco = texto padrão do sistema.</div>
        <label><span class="label">Declaração do uniforme</span><textarea class="txt" id="rh-du" rows="4">${esc(R.cfg.declUniforme||'')}</textarea></label>
        <label style="display:block;margin-top:10px"><span class="label">Declaração de EPI</span><textarea class="txt" id="rh-de" rows="4">${esc(R.cfg.declEpi||'')}</textarea></label>
        <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-act="rh-decl">Salvar textos</button></div></section>`; }
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
    return topo('Terceirizados','Prestadores de serviço, o prazo de cada contrato e os documentos (certidões, ASO, NR, seguro). Avisa no Meu dia quando estiver perto de vencer.',`<button class="btn" data-act="rh-tnovo">${P.ic('mais',18,2.4)}Novo terceirizado</button>`)
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
  const CAMPOS=[['NOME','Nome'],['CPF','CPF'],['FUNCAO','Função'],['SETOR','Setor'],['ADMISSAO','Admissão'],['VINCULO','Vínculo'],['EMPRESA','Empresa'],['CNPJ','CNPJ'],
    ['SALARIO','Salário'],['SALARIO_EXTENSO','Salário por extenso'],['JORNADA','Jornada'],['TELEFONE','Telefone'],['CIDADE','Cidade'],['DATA_HOJE','Data de hoje'],
    ['FERIAS_INICIO','Início das férias'],['FERIAS_FIM','Fim das férias'],['FERIAS_DIAS','Dias de férias'],['FERIAS_RETORNO','Volta das férias'],['PERIODO_AQUISITIVO','Período aquisitivo'],
    ['ULTIMA_TROCA','Última troca (PJ)'],['PROXIMA_TROCA','Próxima troca (PJ)'],['EXP_FIM_1','Fim da 1ª etapa (experiência)'],['EXP_FIM_2','Fim da experiência'],['DESLIGAMENTO','Data do desligamento']];
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
    return {NOME:f.nome||'',CPF:fCPF(f.cpf),FUNCAO:g('funcao')||'',SETOR:g('setor')||'',ADMISSAO:br(g('admissao')),VINCULO:f.tipo==='PJ'?'PJ':'CLT',
      EMPRESA:e?e.nome:empNome(f.empresa),CNPJ:e?e.cnpj:'',SALARIO:sal!=null?brl(sal):'',SALARIO_EXTENSO:sal!=null?extenso(sal):'',JORNADA:g('jornada')||'',TELEFONE:g('telefone')||'',
      CIDADE:R.cfg.cidade||'Gravataí',DATA_HOJE:dataExt(),
      FERIAS_INICIO:fer?br(fer.inicio):'',FERIAS_FIM:fer?br(fer.fim):'',FERIAS_DIAS:fer?String(fer.dias):'',FERIAS_RETORNO:fer?br(fer.retorno):'',PERIODO_AQUISITIVO:fer?br(fer.aquisitivo)+' a '+br(fer.aquisitivoFim):'',
      ULTIMA_TROCA:pb?br(pb):'',PROXIMA_TROCA:pb?br(addMeses(pb,3)):'',EXP_FIM_1:f.tipo!=='PJ'&&okIso(f.admissao)?br(expFim1(f)):'',EXP_FIM_2:f.tipo!=='PJ'&&okIso(f.admissao)?br(expFim2(f)):'',
      DESLIGAMENTO:okIso(f.desligamento)?br(f.desligamento):okIso(R.dg.deslData)?br(R.dg.deslData):''}; }
  const EX_FER={inicio:'2026-11-03',fim:'2026-11-22',dias:20,retorno:'2026-11-23',aquisitivo:'2025-03-10',aquisitivoFim:'2026-03-09'};
  const EXEMPLO={nome:'MARIA DA SILVA',cpf:'00000000000',funcao:'Operadora de produção',setor:'Linha 1',admissao:'2024-03-10',tipo:'CLT',empresa:'COLAFIX',salario:2150,jornada:'44 horas semanais',telefone:'(51) 90000-0000'};
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
    return topo('Modelos de documento','Cadastre o padrão uma vez. Os campos entre chaves são preenchidos com os dados do funcionário.',seg+`<label class="btn sec" style="cursor:pointer">Importar do Word (.docx)<input type="file" id="rh-docx" accept=".docx" hidden></label><button class="btn" data-act="rh-dnovo">Novo modelo</button>`,EY)
      +`<div class="rh-dg"><section class="card rh-dlist">${!R.lido.modelos?'<div class="empty">Carregando…</div>':ms.length?ms.map(x=>`<button class="rh-dm ${dm&&dm._id===x._id?'sel':''}" data-act="rh-ded" data-id="${x._id}"><b>${esc(x.nome)}</b><small>${esc(valeNome(x.vale))}${x.alteradoEm?' · atualizado em '+dmIso(x.alteradoEm):''}</small></button>`).join(''):'<div class="empty">Nenhum modelo ainda. Clique em <b>Novo modelo</b> ou importe um arquivo do Word.</div>'}</section>
      ${dm?`<section class="card rh-ded"><div class="rh-g2"><label><span class="label">Nome do modelo</span><input class="txt" id="rh-dnome" value="${esc(dm.nome||'')}" placeholder="ex.: Contrato de trabalho · CLT"></label>
          <label><span class="label">Vale para</span><select class="txt" id="rh-dvale">${VALE.map(([k,l])=>`<option value="${k}" ${(dm.vale||'TODOS')===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
        <label class="ck" style="margin-top:10px"><input type="checkbox" id="rh-ddesl" ${modeloDesliga(dm)?'checked':''}> Este documento desliga o funcionário (aviso de demissão, rescisão): ao gerar, oferece marcar como desligado</label>
        <div class="label" style="margin:12px 0 6px">Campos (toque para inserir no texto)</div><div class="rh-tks">${CAMPOS.map(([k,l])=>`<button class="rh-tkb" data-act="rh-dtk" data-k="${k}">${esc(l)}</button>`).join('')}</div>
        <div class="rh-edw"><div class="rh-tb" role="toolbar" aria-label="Formatação"><button data-act="rh-dfmt" data-v="bold" title="Negrito"><b>N</b></button><button data-act="rh-dfmt" data-v="italic" title="Itálico"><i>I</i></button><button data-act="rh-dfmt" data-v="titulo">Título</button><button data-act="rh-dfmt" data-v="clausula">Cláusula numerada</button><button data-act="rh-dfmt" data-v="pergunta" title="Algo que muda a cada documento (datas, motivo…): o painel pergunta na hora de gerar">Campo perguntado</button></div>
          <div class="rh-ed" id="rh-ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto do modelo" data-ph="Escreva o texto do documento. Para o nome, CPF, função etc., toque no campo acima. O que muda a cada vez (datas, trabalhado ou indenizado…) vai em Campo perguntado.">${paraEditor(dm.html||'')}</div></div>
        <div class="rh-dfoot">${dm._id?'<button class="lnk" data-act="rh-ddel" style="color:var(--crit-ink)">Apagar modelo</button>':'<span></span>'}<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="rh-dprev">Ver com dados de exemplo</button><button class="btn" data-act="rh-dsalvar" ${R.salv?'disabled':''}>Salvar modelo</button></div></div></section>`
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
        <div class="rh-dbt"><button class="btn" data-act="rh-dgo" data-v="imprimir" ${f&&md?'':'disabled'}>Imprimir</button><button class="btn sec" data-act="rh-dgo" data-v="pdf" ${f&&md?'':'disabled'}>Salvar PDF</button><button class="btn sec" data-act="rh-dgo" data-v="word" ${f&&md?'':'disabled'}>Baixar em Word</button></div>
        <div class="sub" style="font-size:12.5px;margin:10px 0 0">Fica guardado no histórico do funcionário (quem gerou e quando). Depois de assinado, anexe a cópia escaneada aqui embaixo ou no cadastro.</div>
        ${f&&docs.length?`<div class="rh-sep"></div><div class="label" style="margin-bottom:4px">Já gerados para ${esc(f.nome)}</div>${docs.slice(0,6).map(d=>`<div class="rh-dl"><div><b>${esc(d.modelo||'Documento')}</b><small>${dmIso(d.em)}/${String(d.em||'').slice(0,4)}${d.porNome?' · '+esc(d.porNome):''}</small></div>${d.assinado?`<button class="lnk" data-act="rh-dver" data-id="${d._id}">Ver assinado</button>`:anexar(`data-rh-danx="${d._id}"`,'Anexar assinado','lnk')}</div>`).join('')}`:''}</section>
      <section class="rh-page rh-pageg" aria-label="Documento">${f&&md?docCorpo(f,md,true)+assinaturas(f):`<div class="empty">${f?'Escolha o modelo.':'Escolha o funcionário para ver o documento preenchido.'}</div>`}</section></div>`; }
  function edSync(){ const ed=document.getElementById('rh-ed'); if(ed&&R.dm) R.dm.html=limpar(ed.innerHTML); const n=document.getElementById('rh-dnome'); if(n&&R.dm) R.dm.nome=n.value; const v=document.getElementById('rh-dvale'); if(v&&R.dm) R.dm.vale=v.value; const dd=document.getElementById('rh-ddesl'); if(dd&&R.dm&&R.dm.deslUser) R.dm.desliga=dd.checked; }
  function inserirNoEditor(html){ const ed=document.getElementById('rh-ed'); if(!ed) return; ed.focus(); const sel=getSelection();
    if(!sel.rangeCount||!ed.contains(sel.anchorNode)){ const r=document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
    /* inserção feita à mão: o insertHTML do navegador quebra a linha antes de um campo */
    const r=sel.getRangeAt(0); r.deleteContents(); const tp=document.createElement('template'); tp.innerHTML=html; const fr=tp.content, ult=fr.lastChild; if(!ult) return;
    r.insertNode(fr); const nr=document.createRange(); nr.setStartAfter(ult); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); edSync(); }
  const ferSel=f=>R.fer.find(x=>x._id===R.dg.feriasId&&x.funcId===f._id&&x.status!=='cancelada')||null;
  const docCorpo=(f,md,marcar)=>montar(md.html||'',valores(f,R.dg.extra,ferSel(f)),marcar,R.dg.resp);
  /* saída: imprimir, PDF, Word */
  function docCompleto(f,md){ return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(md.nome+' - '+f.nome)}</title><style>@page{size:A4;margin:22mm 20mm}${DOC_CSS}</style></head><body>${docCorpo(f,md,false)}${assinaturas(f)}</body></html>`; }
  function imprimirDoc(html){ const fr=document.createElement('iframe'); fr.setAttribute('aria-hidden','true'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
    const d=fr.contentWindow.document; d.open(); d.write(html); d.close(); setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ P.erro(e); } setTimeout(()=>fr.remove(),60000); },300); }
  const carregarJs=src=>new Promise((ok,er)=>{ if([...document.scripts].some(s=>s.src===src)) return ok(); const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>er(new Error('Não consegui carregar '+src.split('/').pop()+'. Confira a internet.')); document.head.appendChild(s); });
  function baixar(blob,nome){ const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); }
  /* nome de arquivo simples: sem "·" nem caracteres que o Windows não aceita */
  const nomeArq=s=>String(s).replace(/\s*[·•]\s*/g,' - ').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim();
  const pdfDoc=(f,md)=>pdfPartes([docCorpo(f,md,false)+assinaturas(f)],nomeArq(md.nome+' - '+f.nome)+'.pdf');
  async function pdfPartes(partes,nome){ if(!window.html2canvas) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!(window.jspdf&&window.jspdf.jsPDF)) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'}); let pg=0;
    for(const parte of partes){ const box=document.createElement('div'); box.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:83px 76px;box-sizing:border-box';
      box.innerHTML=`<style>${DOC_CSS.replace(/body\{/,'.rh-pdf{')}</style><div class="rh-pdf">${parte}</div>`; document.body.appendChild(box);
      try{ const cv=await window.html2canvas(box,{scale:2,backgroundColor:'#ffffff',logging:false});
        const pxPag=Math.floor(cv.width*297/210); for(let y=0;y<cv.height;y+=pxPag){ const c=document.createElement('canvas'); c.width=cv.width; c.height=Math.min(pxPag,cv.height-y); c.getContext('2d').drawImage(cv,0,y,cv.width,c.height,0,0,cv.width,c.height);
          if(pg) pdf.addPage('a4','portrait'); pdf.addImage(c.toDataURL('image/jpeg',0.9),'JPEG',0,0,210,c.height*210/cv.width); pg++; } } finally{ box.remove(); } }
    baixar(pdf.output('blob'),nome); }
  function wordDoc(f,md){ const h=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(md.nome)}</title><style>@page{size:21cm 29.7cm;margin:2.2cm 2cm}${DOC_CSS}</style></head><body>${docCorpo(f,md,false)}${assinaturas(f)}</body></html>`;
    baixar(new Blob(['﻿',h],{type:'application/msword'}),nomeArq(md.nome+' - '+f.nome)+'.doc'); }
  async function registrarDoc(f,md,acao){ const G=R.dg;
    if(modeloDesliga(md)&&f.status!=='Desligado'&&G.desligar!==false){ const qd=qDeslig(perguntasDe(md.html)), dt=G.deslData||(qd&&G.resp[qd])||P.hojeStr(); if(okIso(dt)&&!(f.desligAgendado&&f.desligamento===dt)){ const fut=await desligar(f,dt,md.nome); P.toast(fut?f.nome+' continua ativo e sai em '+br(dt)+'.':f.nome+' marcado como desligado em '+br(dt)+'.'); } }
    if(G.guardar){ const up={}; Object.entries(G.extra).forEach(([k,v])=>{ if(v==null||v==='') return; if(k==='salario'){ const n=numBR(v); if(n!=null) up.salario=n; } else up[k]=String(v).trim(); });
      if(Object.keys(up).length){ await grava(COL.func+'/'+f._id,up); Object.assign(f,up); G.extra={}; } }
    const fe=ferSel(f), resp={}; perguntasDe(md.html).forEach(q=>{ resp[q]=String(G.resp[q]||'').trim(); });
    const chave=f._id+'|'+md._id+'|'+JSON.stringify([valores(f,G.extra,fe),resp]); if(G.reg===chave) return; G.reg=chave;
    await P.db().doc(COL.docs+'/'+id()).set(Object.assign({funcId:f._id,funcionario:f.nome,modeloId:md._id,modelo:md.nome,acao,em:agora(),por:P.S.uid||null,porNome:eu()},fe?{feriasId:fe._id}:{},Object.keys(resp).length?{respostas:resp}:{})); }

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
  const addMeses=(s,n)=>{ const [y,m,d]=s.split('-').map(Number); const ult=new Date(Date.UTC(y,m-1+n+1,0,12)).getUTCDate(); return isoD(new Date(Date.UTC(y,m-1+n,Math.min(d,ult),12))); };
  const okIso=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
  const ferDe=f=>R.fer.filter(x=>x.funcId===f._id&&x.status!=='cancelada');
  function periodos(f){ if(f.tipo==='PJ'||!okIso(f.admissao)) return []; const hj=P.hojeStr(), out=[], fs=ferDe(f);
    for(let k=0;k<80;k++){ const ini=addMeses(f.admissao,12*k); if(ini>hj) break; const fim=addDias(addMeses(f.admissao,12*(k+1)),-1), lim=addDias(addMeses(f.admissao,12*(k+2)),-1);
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
  function pjSit(f){ const b=pjBase(f); if(!b) return {c:'neu',t:'Sem data de admissão',n:9}; const prox=addMeses(b,3), d=diasAte(prox);
    if(d<0) return {c:'crit',t:'Troca atrasada há '+plural(-d,'dia','dias'),n:0,prox,d}; if(d===0) return {c:'crit',t:'Troca hoje',n:1,prox,d};
    if(d<=PZ_AVISO()) return {c:'warn',t:'Troca em '+plural(d,'dia','dias'),n:2,prox,d}; return {c:'ok',t:'Em dia',n:3,prox,d}; }
  const clts=()=>ativos().filter(f=>f.tipo!=='PJ'), pjs=()=>ativos().filter(f=>f.tipo==='PJ');
  /* avisos de prazo: Início do RH e quadro "Avisos" do Meu dia */
  function avisosPrazo(){ const av=[], hj=P.hojeStr();
    clts().forEach(f=>{ const s=sitFer(f); if(s.c==='crit'||s.c==='warn') av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'Férias: '+f.nome,s:(s.d<0?'o prazo para conceder venceu em ':'conceder até ')+br(s.p.lim)+' · faltam '+plural(s.p.saldo,'dia','dias')+' de férias',act:`data-act="rh-pzabrir" data-v="ferias"`,l:'Abrir',go:'rhferias'}); });
    ferProximas().filter(x=>x.inicio>=hj&&diasAte(x.inicio)<=PZ_AVISO()&&!temAviso(x)).forEach(x=>{ const d=diasAte(x.inicio); av.push({c:'warn',r:'Atenção',t:'Aviso de férias: '+x.funcionario,s:'as férias começam '+(d===0?'hoje':'em '+br(x.inicio))+' e o aviso ainda não foi gerado',act:`data-act="rh-dgfer" data-id="${x._id}"`,l:'Gerar',go:'rhferias'}); });
    emExp().forEach(({f,s})=>{ if(s.c==='crit'||s.c==='warn') av.push({c:s.c,r:s.c==='crit'?'Vencido':'Atenção',t:'Experiência: '+f.nome,s:s.t.toLowerCase()+' ('+br(s.fim)+') · prorrogar, efetivar ou desligar',act:`data-act="rh-pzabrir" data-v="exp"`,l:'Abrir',go:'rhferias'}); });
    pjs().forEach(f=>{ const s=pjSit(f); if(s.c==='crit'||s.c==='warn') av.push({c:s.c,r:s.c==='crit'?'Atrasada':'Atenção',t:'Troca do PJ: '+f.nome,s:'próxima troca '+br(s.prox)+' · '+s.t.toLowerCase(),act:`data-act="rh-pzabrir" data-v="pj"`,l:'Abrir',go:'rhferias'}); });
    return av; }
  P.registrarAviso(()=>avisosPrazo().map(a=>({nivel:a.c,rotulo:a.r,titulo:a.t,texto:a.s,go:a.go})));

  function vFerias(){ const EY='RH · FÉRIAS E PRAZOS', nf=clts().filter(f=>['crit','warn'].includes(sitFer(f).c)).length, np=pjs().filter(f=>['crit','warn'].includes(pjSit(f).c)).length, ne=emExp().filter(o=>['crit','warn'].includes(o.s.c)).length;
    const seg=`<div class="seg" role="group" aria-label="Prazos">${[['ferias','Férias (CLT)'+(nf?' · '+nf:'')],['exp','Experiência'+(ne?' · '+ne:'')],['pj','Troca dos PJ'+(np?' · '+np:'')]].map(([k,l])=>`<button data-act="rh-pzv" data-v="${k}" aria-pressed="${R.pzv===k}">${l}</button>`).join('')}</div>`;
    return topo('Férias e prazos',R.pzv==='pj'?'PJ trocam a cada 3 meses, contando da última troca. Avisa '+PZ_AVISO()+' dias antes.':R.pzv==='exp'?'Contrato de experiência 45 + 45 dias: prorrogue, efetive ou desligue. Avisa '+PZ_AVISO()+' dias antes de cada fim.':'Férias dos CLT pela data de admissão. Avisa '+PZ_AVISO()+' dias antes do prazo para conceder e das férias sem aviso.',seg,EY)
      +(!R.lido.func||!R.lido.fer?'<section class="card"><div class="empty">Carregando…</div></section>':R.pzv==='pj'?vPJ():R.pzv==='exp'?vExp():vFeriasCLT()); }
  function vFeriasCLT(){ const hj=P.hojeStr(), F=R.pzfil;
    let xs=clts().map(f=>({f,s:sitFer(f)})); const nAt=xs.filter(o=>['crit','warn'].includes(o.s.c)).length; if(F==='atencao') xs=xs.filter(o=>['crit','warn'].includes(o.s.c));
    xs.sort((a,b)=>a.s.n-b.s.n||(a.s.d||0)-(b.s.d||0)||a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    const venc=clts().reduce((n,f)=>n+periodos(f).filter(p=>p.completo&&p.saldo>0&&p.lim<hj).length,0), prox=ferProximas();
    return (R.ffer?formFerias():'')
      +(prox.length?`<section class="card"><h2>Férias marcadas</h2><div class="rh-tw"><table class="rh-t"><thead><tr><th>Funcionário</th><th>Férias</th><th>Volta</th><th>Aviso de férias</th><th></th></tr></thead><tbody>
        ${prox.map(x=>{ const ag=x.inicio<=hj; return `<tr><td><b>${esc(x.funcionario)}</b><small style="display:block;color:var(--muted)">período ${br(x.aquisitivo)} a ${br(x.aquisitivoFim)}</small></td><td class="num">${br(x.inicio)} a ${br(x.fim)} <small style="color:var(--muted)">· ${plural(+x.dias,'dia','dias')}</small>${ag?' <span class="pill ok">em férias</span>':''}</td><td class="num">${br(x.retorno)}</td>
          <td>${temAviso(x)?'<span class="pill ok">Gerado</span>':`<button class="btn rh-sm" data-act="rh-dgfer" data-id="${x._id}">Gerar aviso</button>`}</td><td class="rh-ac">${ag?'':`<button class="lnk" data-act="rh-fercanc" data-id="${x._id}" style="color:var(--crit-ink)">Desmarcar</button>`}</td></tr>`; }).join('')}</tbody></table></div></section>`:'')
      +`<section class="card"><div class="rh-chips">${[['atencao','Precisam de atenção · '+nAt],['todos','Todos os CLT · '+clts().length]].map(([k,l])=>`<button class="rh-chip2" data-act="rh-pzfil" data-v="${k}" aria-pressed="${F===k}">${l}</button>`).join('')}
          ${venc?`<button class="lnk" data-act="rh-feranteriores" style="margin-left:auto">${venc===1?'Marcar como já tirado o período vencido':'Marcar como já tirados os '+venc+' períodos vencidos'} (antes do painel)</button>`:''}</div>
        ${xs.length?`<div class="rh-tw"><table class="rh-t rh-tf"><thead><tr><th>Funcionário</th><th>Admissão</th><th>Período em aberto</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(({f,s})=>{ const p=s.p; return `<tr><td><b>${esc(f.nome)}</b><small>${esc([f.funcao,f.setor].filter(Boolean).join(' · '))}</small></td><td class="num">${br(f.admissao)||'—'}</td>
          <td class="num">${p?`${br(p.ini)} a ${br(p.fim)}<small>${p.completo?(p.saldo?'faltam '+plural(p.saldo,'dia','dias')+' · conceder até '+br(p.lim):'tirado'):'em aquisição · completa em '+br(p.fim)}</small>`:'—'}</td>
          <td><span class="pill ${s.c}">${esc(s.t)}</span></td>
          <td class="rh-ac">${s.p?`<button class="btn sec rh-sm" data-act="rh-fernova" data-id="${f._id}">Marcar férias</button>`:`<button class="lnk" data-act="rh-ed" data-go-func="1" data-id="${f._id}">Informar admissão</button>`}${s.p&&s.p.completo&&s.p.saldo?` <button class="lnk" data-act="rh-ferant" data-id="${f._id}" data-p="${s.p.ini}" title="Para férias tiradas antes de usar o painel">Já tirou</button>`:''}</td></tr>`; }).join('')}</tbody></table></div>`
        :`<div class="empty">${F==='atencao'?'Nenhum prazo de férias perto de vencer.':'Nenhum CLT em atividade.'}</div>`}</section>`; }
  function formFerias(){ const g=R.ffer, f=R.func.find(x=>x._id===g.funcId); if(!f) return ''; const ps=periodos(f).filter(p=>p.saldo>0), p=ps.find(x=>x.ini===g.aquisitivo)||ps.find(x=>x.completo)||ps[0];
    if(p&&g.aquisitivo!==p.ini) g.aquisitivo=p.ini; const dias=+g.dias||0, fim=okIso(g.inicio)&&dias>0?addDias(g.inicio,dias-1):'', ret=fim?addDias(fim,1):'';
    const hist=ferDe(f).slice().sort((a,b)=>String(b.inicio||b.aquisitivo).localeCompare(String(a.inicio||a.aquisitivo)));
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Marcar férias de ${esc(f.nome)}</h2><button class="lnk" data-act="rh-ferx">Fechar</button></div>
      ${p?`<div class="rh-g"><label><span class="label">Período aquisitivo</span><select class="txt" id="rh-ferp">${ps.map(x=>`<option value="${x.ini}" ${x.ini===p.ini?'selected':''}>${br(x.ini)} a ${br(x.fim)} · faltam ${x.saldo} dias${x.completo?'':' (em aquisição)'}</option>`).join('')}</select></label>
        <label><span class="label">Início das férias</span><input class="txt" type="date" id="rh-feri" value="${esc(g.inicio||'')}"></label>
        <label><span class="label">Quantos dias</span><input class="txt" type="number" min="1" max="${p.saldo}" id="rh-ferd" inputmode="numeric" value="${esc(g.dias||'')}"></label></div>
        <div class="rh-chips" style="margin:10px 0 0">${[10,15,20,30].filter(n=>n<=p.saldo).map(n=>`<button class="rh-chip2" data-act="rh-ferdias" data-v="${n}" aria-pressed="${dias===n}">${n} dias</button>`).join('')}${p.saldo<30&&![10,15,20].includes(p.saldo)?`<button class="rh-chip2" data-act="rh-ferdias" data-v="${p.saldo}" aria-pressed="${dias===p.saldo}">O que falta: ${p.saldo} dias</button>`:''}</div>
        <div class="sub" style="margin:10px 0 0">${fim?`Termina em <b>${br(fim)}</b> e volta ao trabalho em <b>${br(ret)}</b>.`:'Escolha o início e quantos dias.'}${!p.completo?' Este período ainda não se completou ('+br(p.fim)+').':''}</div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-ferx">Cancelar</button><button class="btn" data-act="rh-fersalvar" ${R.salv?'disabled':''}>Marcar férias</button></div>`
      :'<div class="empty">Nenhum período com dias de férias em aberto.</div>'}
      ${hist.length?`<div class="rh-docs"><span class="label">JÁ MARCADAS OU TIRADAS</span>${hist.slice(0,8).map(x=>`<div class="rh-dl"><div><b>${x.anterior?'Tiradas antes do painel':br(x.inicio)+' a '+br(x.fim)}</b><small>${plural(+x.dias,'dia','dias')} · período ${br(x.aquisitivo)} a ${br(x.aquisitivoFim)}${x.porNome?' · '+esc(x.porNome):''}</small></div>${x.anterior?'':temAviso(x)?'<span class="pill ok">Aviso gerado</span>':`<button class="lnk" data-act="rh-dgfer" data-id="${x._id}">Gerar aviso</button>`}</div>`).join('')}</div>`:''}</section>`; }
  function vPJ(){ let xs=pjs().map(f=>({f,s:pjSit(f)})).sort((a,b)=>a.s.n-b.s.n||(a.s.d||0)-(b.s.d||0)||a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    return (R.fpj?formPJ():'')+`<section class="card">${xs.length?`<div class="rh-tw"><table class="rh-t rh-tf"><thead><tr><th>PJ</th><th>Contando de</th><th>Próxima troca</th><th>Situação</th><th></th></tr></thead><tbody>
      ${xs.map(({f,s})=>`<tr><td><b>${esc(f.nome)}</b><small>${esc([f.funcao,empNome(f.empresa)].filter(Boolean).join(' · '))}</small></td><td class="num">${pjBase(f)?br(pjBase(f)):'—'}<small>${okIso(f.ultimaTroca)?'última troca':'admissão'}</small></td><td class="num"><b>${s.prox?br(s.prox):'—'}</b></td>
        <td><span class="pill ${s.c}">${esc(s.t)}</span></td><td class="rh-ac"><button class="btn sec rh-sm" data-act="rh-pjtroca" data-id="${f._id}">Registrar troca</button> <button class="lnk" data-act="rh-dgpara" data-id="${f._id}">Gerar documento</button></td></tr>`).join('')}</tbody></table></div>`
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
  function formDesl(){ const g=R.fdesl, f=R.func.find(x=>x._id===g.funcId); if(!f) return '';
    return `<section class="card rh-form" style="border-color:var(--crit)"><div class="head" style="align-items:baseline"><h2>Desligar ${esc(f.nome)}</h2><button class="lnk" data-act="rh-deslx">Fechar</button></div>
      <div class="rh-g"><label><span class="label">Data do desligamento</span><input class="txt" type="date" id="rh-desd" value="${esc(g.data||P.hojeStr())}"></label>
        <label style="grid-column:span 2"><span class="label">Motivo</span><input class="txt" id="rh-desm" list="rh-motivos" value="${esc(g.motivo||'')}" placeholder="escolha ou escreva"><datalist id="rh-motivos">${MOTIVOS.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label></div>
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
  P.registrarAviso(()=>tDocAvisos().map(o=>({nivel:o.s.c,rotulo:o.s.c==='crit'?'Vencido':'Atenção',titulo:'Documento de terceirizado: '+o.x.nome,texto:o.d.nome+' · '+o.s.t.toLowerCase()+(okIso(o.d.validade)?' ('+br(o.d.validade)+')':''),go:'rhterc'})));
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
    const lin=(o,t)=>`<div class="rh-an ${o.hoje?'hoje':''}"><span class="num">${o.dia}/${P.hojeStr().slice(5,7)}</span><b>${esc(titulo(o.f.nome))}</b><small>${t}${o.hoje?' · <b>hoje</b> 🎉':''}</small></div>`;
    return `<section class="card"><h2>Aniversários de ${mm}</h2><div class="rh-2c">${nasc.length?`<div><div class="label" style="margin-bottom:4px">ANIVERSARIANTES</div>${nasc.map(o=>lin(o,esc(o.f.setor||'')+(o.f.setor?' · ':'')+o.idade+' anos')).join('')}</div>`:''}
      ${casa.length?`<div><div class="label" style="margin-bottom:4px">TEMPO DE CASA</div>${casa.map(o=>lin(o,plural(o.anos,'ano','anos')+' de casa')).join('')}</div>`:''}</div></section>`; }

  /* ===================== DIA A DIA DO RH (12/10, 4ª parte) =====================
     Agenda (tudo o que vence, em ordem de data, com envio para o Outlook), relatório do mês para a contabilidade,
     ficha completa da pessoa, admissão em um passo, documentos em lote e planilha de carga inicial. */
  const bissexto=y=>(y%4===0&&y%100!==0)||y%400===0;
  const naData=(y,md)=>{ if(md==='02-29'&&!bissexto(y)) md='02-28'; return y+'-'+md; };
  function proxAniv(iso){ const hj=P.hojeStr(), y=+hj.slice(0,4), md=iso.slice(5); let d=naData(y,md); if(d<hj) d=naData(y+1,md); return d; }
  const DIA_CURTO=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const TIPO_AG={ferias:'Férias',exp:'Experiência',pj:'Troca do PJ',contrato:'Contrato',doc:'Documento',aniv:'Aniversário',casa:'Tempo de casa',desl:'Desligamento',adm:'Admissão'};

  /* ---------- Agenda ---------- */
  function agendaItens(){ const it=[], add=(data,tipo,t,s,c,act,uid)=>{ if(okIso(data)) it.push({data,tipo,t,s:s||'',c:c||'neu',act:act||'',uid}); };
    const pz=v=>`data-act="rh-pzabrir" data-v="${v}"`, pe=f=>`data-act="rh-pess" data-id="${f._id}"`;
    ativos().forEach(f=>{
      if(f.tipo!=='PJ'){ const sf=sitFer(f); if(sf.p&&sf.p.completo&&sf.p.saldo>0) add(sf.p.lim,'ferias','Prazo para dar as férias de '+f.nome,'faltam '+plural(sf.p.saldo,'dia','dias')+' do período '+br(sf.p.ini)+' a '+br(sf.p.fim),sf.c==='ok'?'neu':sf.c,pz('ferias'),'fer-'+f._id+'-'+sf.p.ini);
        const e=expInfo(f); if(e){ if(e.etapa===1) add(e.f1,'exp','Fim da 1ª etapa da experiência de '+f.nome,'prorrogar, efetivar ou desligar',e.c==='ok'?'neu':e.c,pz('exp'),'exp1-'+f._id); add(e.f2,'exp','Fim da experiência de '+f.nome,'efetivar ou desligar',e.etapa===2&&e.c!=='ok'?e.c:'neu',pz('exp'),'exp2-'+f._id); } }
      else { const s=pjSit(f); if(s.prox) add(s.prox,'pj','Troca do PJ '+f.nome,'3 meses da '+(okIso(f.ultimaTroca)?'última troca':'admissão'),s.c==='ok'?'neu':s.c,pz('pj'),'pj-'+f._id+'-'+s.prox); }
      if(f.desligAgendado&&okIso(f.desligamento)) add(f.desligamento,'desl','Último dia de '+f.nome,f.desligMotivo||'desligamento marcado','warn',pe(f),'desl-'+f._id);
      if(okIso(f.nascimento)){ const d=proxAniv(f.nascimento); add(d,'aniv','Aniversário de '+titulo(f.nome),(+d.slice(0,4)-+f.nascimento.slice(0,4))+' anos','neu',pe(f),'aniv-'+f._id+'-'+d.slice(0,4)); }
      if(okIso(f.admissao)){ const d=proxAniv(f.admissao), a=+d.slice(0,4)-+f.admissao.slice(0,4); if(a===1||(a>0&&a%5===0)) add(d,'casa',plural(a,'ano','anos')+' de casa de '+titulo(f.nome),f.setor||'','neu',pe(f),'casa-'+f._id+'-'+d.slice(0,4)); } });
    const vivo=id=>R.func.some(f=>f._id===id&&f.status!=='Desligado');
    R.fer.filter(x=>!x.anterior&&x.status!=='cancelada'&&vivo(x.funcId)).forEach(x=>{ const av=temAviso(x);
      add(x.inicio,'ferias','Começam as férias de '+x.funcionario,plural(+x.dias,'dia','dias')+' · volta '+br(x.retorno)+(av?'':' · aviso de férias ainda não gerado'),av?'neu':'warn',av?pz('ferias'):`data-act="rh-dgfer" data-id="${x._id}"`,'feri-'+x._id);
      add(x.retorno,'ferias','Volta das férias de '+x.funcionario,'','neu',pz('ferias'),'ferr-'+x._id); });
    R.terc.filter(x=>x.status!=='Encerrado').forEach(x=>{ const s=tSit(x); if(x.fim) add(x.fim,'contrato','Fim do contrato de '+x.nome,x.empresa||'',s.c==='ok'?'neu':s.c,`data-act="rh-ted" data-go-terc="1" data-id="${x._id}"`,'terc-'+x._id+'-'+x.fim);
      tDocs(x).forEach(d=>{ const ds=docSit(d); if(okIso(d.validade)) add(d.validade,'doc','Vence '+d.nome+' de '+x.nome,'terceirizado',ds.c==='ok'?'neu':ds.c,`data-act="rh-tdoc" data-go-terc="1" data-id="${x._id}"`,'tdoc-'+x._id+'-'+d.id); }); });
    return it.sort((a,b)=>a.data.localeCompare(b.data)||a.t.localeCompare(b.t)); }
  function agendaJanela(){ const hj=P.hojeStr(), ate=addDias(hj,R.agDias), xs=agendaItens();
    return {atras:xs.filter(x=>x.data<hj&&(x.c==='crit'||x.c==='warn')),prox:xs.filter(x=>x.data>=hj&&x.data<=ate)}; }
  function vAgenda(){ const EY='RH · AGENDA', seg=`<div class="seg" role="group" aria-label="Agenda">${[['agenda','Agenda'],['rel','Relatório do mês']].map(([k,l])=>`<button data-act="rh-agv" data-v="${k}" aria-pressed="${R.agv===k}">${l}</button>`).join('')}</div>`;
    if(R.agv==='rel') return topo('Relatório do mês','Admissões, desligamentos, férias e experiência do mês, pronto para mandar para a contabilidade.',seg,EY)+vRelatorio();
    if(!R.lido.func) return topo('Agenda','',seg,EY)+'<section class="card"><div class="empty">Carregando…</div></section>';
    const {atras,prox}=agendaJanela(), hj=P.hojeStr();
    const lin=x=>{ const d=dU(x.data); return `<div class="rh-ag ${x.c}"><div class="rh-agd"><b>${String(d.getUTCDate()).padStart(2,'0')}/${x.data.slice(5,7)}</b><small>${x.data===hj?'hoje':DIA_CURTO[d.getUTCDay()]}</small></div>
      <div><span class="rh-agt">${esc(TIPO_AG[x.tipo]||'')}</span><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</div>${x.act?`<button class="lnk" ${x.act}>Abrir</button>`:'<span></span>'}</div>`; };
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

  /* ---------- Relatório do mês ---------- */
  function relDados(m){ const ini=m+'-01', fim=addDias(addMeses(ini,1),-1), em=s=>okIso(s)&&s>=ini&&s<=fim;
    const saiu=f=>okIso(f.desligamento)&&f.desligamento<=fim&&(f.status==='Desligado'||f.desligAgendado);
    const quadro=R.func.filter(f=>(!okIso(f.admissao)||f.admissao<=fim)&&!saiu(f));
    return {ini,fim,quadro,adm:R.func.filter(f=>em(f.admissao)).sort((a,b)=>a.admissao.localeCompare(b.admissao)),
      desl:R.func.filter(f=>em(f.desligamento)&&(f.status==='Desligado'||f.desligAgendado)).sort((a,b)=>a.desligamento.localeCompare(b.desligamento)),
      fer:R.fer.filter(x=>!x.anterior&&x.status!=='cancelada'&&okIso(x.inicio)&&x.inicio<=fim&&x.fim>=ini).sort((a,b)=>a.inicio.localeCompare(b.inicio)),
      exp:R.func.filter(f=>f.exp&&['prorrogado','efetivado'].includes(f.exp.status)&&String(f.exp.em||'').slice(0,7)===m),
      afast:R.func.filter(f=>f.status==='Afastado')}; }
  const REL_T=[['adm','Admissões',['Nome','CPF','Função','Setor','Vínculo','Admissão'],f=>[f.nome,fCPF(f.cpf),f.funcao||'',f.setor||'',f.tipo==='PJ'?'PJ · '+empNome(f.empresa):'CLT',br(f.admissao)]],
    ['desl','Desligamentos',['Nome','CPF','Função','Data','Motivo'],f=>[f.nome,fCPF(f.cpf),f.funcao||'',br(f.desligamento)+(f.status!=='Desligado'?' (aviso trabalhado)':''),f.desligMotivo||'']],
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
  function vPessoa(){ const f=R.func.find(x=>x._id===R.pess); if(!f) return '<section class="card"><div class="empty">Funcionário não encontrado.</div></section>';
    const linha=(l,v)=>v?`<div class="rh-pd"><span>${l}</span><b>${v}</b></div>`:'';
    const sf=f.tipo!=='PJ'?sitFer(f):null, e=expInfo(f), pj=f.tipo==='PJ'?pjSit(f):null, hj=P.hojeStr();
    const fers=ferDe(f).slice().sort((a,b)=>String(b.inicio||b.aquisitivo).localeCompare(String(a.inicio||a.aquisitivo)));
    const meses=[0,1,2,3,4,5].map(k=>mesMais(hj.slice(0,7),-k)).filter(m=>!okIso(f.admissao)||m>=f.admissao.slice(0,7));
    const falt=admFaltam(f);
    return `<div class="head"><div><div class="eyebrow">RH · FUNCIONÁRIO</div><h1>${esc(f.nome)}</h1><div class="sub">${esc([f.funcao,f.setor,f.tipo==='PJ'?'PJ · '+empNome(f.empresa):'CLT · Colafix'].filter(Boolean).join(' · '))}</div></div>
        <div class="rh-acoes"><button class="btn sec" data-act="rh-pessx">‹ Funcionários</button><button class="btn sec" data-act="rh-ed" data-id="${f._id}">Editar</button><button class="btn sec" data-act="rh-dgpara" data-id="${f._id}">Gerar documento</button>${f.tipo!=='PJ'&&f.status!=='Desligado'&&sf&&sf.p?`<button class="btn sec" data-act="rh-fernova" data-id="${f._id}" data-go-fer="1">Marcar férias</button>`:''}</div></div>
      <div class="rh-pg"><section class="card"><div class="rh-ch"><h2>Dados</h2><span class="pill ${corSt(f.status)}">${esc(f.status||'')}</span></div>
          ${linha('CPF',esc(fCPF(f.cpf)))}${linha('Admissão',okIso(f.admissao)?br(f.admissao)+' · '+tempoTxt(f.admissao)+' de casa':'')}${linha('Nascimento',okIso(f.nascimento)?br(f.nascimento)+' · '+tempoDe(f.nascimento).a+' anos':'')}
          ${linha('Telefone',esc(f.telefone||''))}${linha('Salário',f.salario!==''&&f.salario!=null?esc(brl(f.salario)):'')}${linha('Jornada',esc(f.jornada||''))}
          ${linha('Uniforme',esc([f.camisa?'camisa '+f.camisa:'',f.calca?'calça '+f.calca:'',f.calcado?'calçado '+f.calcado:''].filter(Boolean).join(' · ')))}
          ${f.status==='Desligado'?linha('Desligamento',br(f.desligamento)+(f.desligMotivo?' · '+esc(f.desligMotivo):'')):f.desligAgendado?linha('Sai em',br(f.desligamento)+(f.desligMotivo?' · '+esc(f.desligMotivo):'')):''}
          ${f.obs?`<div class="sub" style="margin:8px 0 0">${esc(f.obs)}</div>`:''}</section>
        <section class="card"><h2>Prazos</h2>
          ${sf?`<div class="rh-pd"><span>Férias</span><b><span class="pill ${sf.c}">${esc(sf.t)}</span></b></div>${sf.p?`<div class="sub" style="margin:-2px 0 8px;font-size:12.5px">período ${br(sf.p.ini)} a ${br(sf.p.fim)} · ${sf.p.completo?(sf.p.saldo?'faltam '+plural(sf.p.saldo,'dia','dias')+' · conceder até '+br(sf.p.lim):'tirado'):'em aquisição'}</div>`:''}`:''}
          ${e?`<div class="rh-pd"><span>Experiência</span><b><span class="pill ${e.c}">${esc(e.t)}</span></b></div><div class="sub" style="margin:-2px 0 8px;font-size:12.5px">1ª etapa até ${br(e.f1)} · 2ª até ${br(e.f2)}</div>`:f.exp&&f.exp.status==='efetivado'?linha('Experiência','efetivado'):''}
          ${pj?`<div class="rh-pd"><span>Troca do PJ</span><b><span class="pill ${pj.c}">${esc(pj.t)}</span></b></div>${pj.prox?`<div class="sub" style="margin:-2px 0 8px;font-size:12.5px">próxima troca ${br(pj.prox)}</div>`:''}`:''}
          ${falt.length?`<div class="rh-pd"><span>Admissão</span><b><span class="pill warn">${plural(falt.length,'documento faltando','documentos faltando')}</span></b></div><div class="sub" style="margin:-2px 0 8px;font-size:12.5px">${esc(falt.join(', '))} · <button class="lnk" data-act="rh-admabrir" data-id="${f._id}">abrir a admissão</button></div>`:''}
          ${!sf&&!e&&!pj&&!falt.length?'<div class="sub" style="margin:0">Nenhum prazo.</div>':''}</section>
        <section class="card"><h2>Fichas de EPI e uniforme</h2>${meses.map(m=>{ const s=fSit(f,m); return `<div class="rh-pd"><span>${esc(cap(mesLabel(m)))}</span><b><span class="pill ${s.c}">${esc(s.t)}</span></b></div>`; }).join('')}
          <div style="margin-top:8px"><button class="lnk" data-act="rh-fabrir">Abrir as fichas do mês</button></div></section>
        ${f.tipo!=='PJ'?`<section class="card"><h2>Férias</h2>${fers.length?fers.slice(0,8).map(x=>`<div class="rh-dl"><div><b>${x.anterior?'Tiradas antes do painel':br(x.inicio)+' a '+br(x.fim)}</b><small>${plural(+x.dias,'dia','dias')} · período ${br(x.aquisitivo)} a ${br(x.aquisitivoFim)}${x.status==='cancelada'?' · desmarcada':''}</small></div>${!x.anterior&&x.status!=='cancelada'?(temAviso(x)?'<span class="pill ok">Aviso gerado</span>':`<button class="lnk" data-act="rh-dgfer" data-id="${x._id}">Gerar aviso</button>`):''}</div>`).join(''):'<div class="sub" style="margin:0">Nenhuma férias registrada.</div>'}</section>`:''}
        <section class="card rh-pgw">${docsDaPessoa(f._id).replace('class="rh-docs"','class="rh-docs" style="margin:0;padding:0;border:0"')}</section></div>`; }
  function buscaPessoas(q){ q=norm(q); const d=dig(q); if(q.length<2) return []; return R.func.filter(f=>norm(f.nome).includes(q)||(d.length>=3&&dig(f.cpf).includes(d))).sort((a,b)=>(a.status==='Desligado')-(b.status==='Desligado')||a.nome.localeCompare(b.nome,'pt-BR')).slice(0,6); }
  function cartaoBusca(){ const xs=buscaPessoas(R.buscaIni);
    return `<section class="card rh-bus"><label class="rh-busl"><span class="label">BUSCAR FUNCIONÁRIO</span><input class="txt" id="rh-bus" placeholder="nome ou CPF" value="${esc(R.buscaIni)}" autocomplete="off"></label>
      ${R.buscaIni.length>=2?(xs.length?`<div class="rh-busr">${xs.map(f=>`<button class="rh-busi" data-act="rh-pess" data-id="${f._id}"><b>${esc(f.nome)}</b><small>${esc([f.funcao,f.setor,f.status==='Desligado'?'desligado':''].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>`:'<div class="sub" style="margin:8px 0 0">Ninguém com esse nome ou CPF.</div>'):''}</section>`; }

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
  const CARGA=[['id','Código (não mexer)'],['nome','Nome'],['cpf','CPF'],['tipo','Vínculo'],['funcao','Função'],['setor','Setor'],['admissao','Admissão'],['nascimento','Nascimento'],['salario','Salário'],['jornada','Jornada'],
    ['telefone','Telefone'],['camisa','Camisa'],['calca','Calça'],['calcado','Calçado'],['ultimaTroca','PJ: data da última troca'],['ferAte','Férias tiradas até o período que terminou em'],['exp','Experiência (prorrogado ou efetivado)']];
  const CARGA_FIXO=['id','nome','cpf','tipo'], CARGA_DATA=['admissao','nascimento','ultimaTroca','ferAte'];
  function cargaLinhas(){ return [CARGA.map(c=>c[1])].concat(R.func.filter(f=>f.status!=='Desligado').sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(f=>CARGA.map(([k])=>k==='id'?f._id:k==='cpf'?fCPF(f.cpf):k==='tipo'?(f.tipo==='PJ'?'PJ':'CLT'):k==='salario'?(f.salario!==''&&f.salario!=null?brl(f.salario).replace('R$ ',''):''):CARGA_DATA.includes(k)?br(f[k]||''):k==='exp'?(f.exp&&['prorrogado','efetivado'].includes(f.exp.status)?f.exp.status:''):(f[k]||'')))); }
  async function cargaBaixar(){ const L=cargaLinhas(); try{ if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }catch(e){}
    if(window.XLSX&&window.XLSX.utils){ const ws=XLSX.utils.aoa_to_sheet(L); ws['!cols']=CARGA.map(([k])=>({wch:k==='id'?16:k==='nome'?32:k==='ferAte'?22:16})); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Funcionários');
      const ins=XLSX.utils.aoa_to_sheet([['Como preencher'],['Preencha só o que falta. Datas como 10/03/2024. Salário como 2.150,00.'],['Não mude a coluna "Código". Nome, CPF e vínculo não são alterados pela planilha.'],['Férias: a data em que terminou o último período aquisitivo já tirado (ex.: 09/03/2025). Os períodos até essa data ficam como "já tirados".'],['Experiência: escreva prorrogado ou efetivado, se for o caso.'],['PJ: data da última troca. A próxima fica 3 meses depois.']]); ins['!cols']=[{wch:110}]; XLSX.utils.book_append_sheet(wb,ins,'Como preencher');
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
    else { if(!window.XLSX) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''}); }
    const hi=rows.findIndex(r=>r.some(c=>norm(c)==='NOME')&&r.some(c=>norm(c)==='CPF')); if(hi<0) throw new Error('Não achei as colunas Nome e CPF. Use a planilha baixada aqui.');
    const H=rows[hi].map(norm), col={}; CARGA.forEach(([k,l])=>{ col[k]=H.indexOf(norm(l)); });
    const linhas=[], nao=[]; let nmud=0, nfer=0;
    rows.slice(hi+1).forEach(r=>{ const cel=k=>col[k]>=0?r[col[k]]:''; if(!String(cel('nome')||'').trim()&&!String(cel('cpf')||'').trim()) return;
      const f=R.func.find(x=>x._id===String(cel('id')).trim())||R.func.find(x=>dig(x.cpf)&&dig(x.cpf)===dig(cel('cpf'))); if(!f){ nao.push(String(cel('nome')||cel('cpf'))); return; }
      const up={}, mud=[], erros=[]; let ferAte='';
      CARGA.forEach(([k,l])=>{ if(CARGA_FIXO.includes(k)) return; const raw=cel(k); if(raw==null||String(raw).trim()==='') return;
        if(CARGA_DATA.includes(k)){ const d=dataCel(raw); if(d.erro){ erros.push(l+': '+d.erro); return; } if(k==='ferAte'){ ferAte=d.v; return; } if(k==='ultimaTroca'&&f.tipo!=='PJ') return; if(d.v!==(f[k]||'')){ up[k]=d.v; mud.push(l); } return; }
        if(k==='salario'){ const n=typeof raw==='number'?raw:numBR(raw); if(n==null){ erros.push('Salário: '+raw); return; } if(n!==f.salario){ up.salario=n; mud.push(l); } return; }
        if(k==='exp'){ const s=norm(raw); const st=/PRORROG/.test(s)?'prorrogado':/EFETIV/.test(s)?'efetivado':''; if(!st){ erros.push(l+': '+raw); return; } if(f.tipo!=='PJ'&&(!f.exp||f.exp.status!==st)){ up.exp={status:st,em:agora(),porNome:eu()}; mud.push('Experiência: '+st); } return; }
        const v=String(raw).trim(); if(v!==String(f[k]||'')){ up[k]=v; mud.push(l); } });
      if(ferAte&&f.tipo!=='PJ'){ const adm=up.admissao||f.admissao; const ps=okIso(adm)?periodos(Object.assign({},f,{admissao:adm})).filter(p=>p.completo&&p.saldo>0&&p.fim<=ferAte):[]; if(ps.length){ mud.push('Férias: '+plural(ps.length,'período tirado','períodos tirados')); nfer+=ps.length; } linhas.push({f,up,mud,erros,fer:ps}); }
      else linhas.push({f,up,mud,erros,fer:[]});
      nmud+=Object.keys(up).length; });
    return {linhas:linhas.filter(o=>o.mud.length||o.erros.length),nao,nmud,nfer,lidas:linhas.length}; }
  function vCarga(){ const g=R.carga, p=g.prev;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><div><div class="eyebrow">CARGA INICIAL</div><h2 style="margin:2px 0 0">Completar os cadastros por planilha</h2></div><button class="lnk" data-act="rh-cargax">Fechar</button></div>
      <div class="rh-ap"><span class="rh-apn">1</span><div><b>Baixe a planilha</b><small>Já vem com todos os funcionários. Preencha nascimento, salário, jornada, última troca do PJ, até quando já tirou férias…</small><div style="margin-top:6px"><button class="btn sec rh-sm" data-act="rh-cargabaixar">Baixar planilha (Excel)</button></div></div></div>
      <div class="rh-ap"><span class="rh-apn">2</span><div><b>Envie a planilha preenchida</b><small>O painel mostra o que vai mudar antes de gravar. Só o que está preenchido muda; nada é apagado.</small><div style="margin-top:6px"><label class="btn sec rh-sm" style="cursor:pointer">Escolher arquivo<input type="file" id="rh-cargaf" accept=".xlsx,.xls,.csv" hidden></label></div></div></div>
      ${p?`<div class="rh-sep"></div><div class="rh-ch"><b>${p.linhas.filter(o=>o.mud.length).length} pessoa(s) com alterações · ${p.lidas} encontrada(s) na planilha</b>${p.nao.length?`<span class="pill warn">${p.nao.length} não encontrada(s)</span>`:''}</div>
        ${p.nao.length?`<div class="sub" style="margin:0 0 8px;font-size:12.5px">Não encontrados (confira o CPF): ${esc(p.nao.slice(0,8).join(', '))}${p.nao.length>8?'…':''}</div>`:''}
        ${p.linhas.length?`<div class="rh-tw" style="max-height:340px;overflow:auto"><table class="rh-t"><thead><tr><th>Funcionário</th><th>O que muda</th><th>Problemas</th></tr></thead><tbody>${p.linhas.map(o=>`<tr><td><b>${esc(o.f.nome)}</b></td><td>${esc(o.mud.join(', ')||'—')}</td><td style="color:var(--crit-ink)">${esc(o.erros.join(' · '))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="sub">Nada para mudar.</div>'}
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn" data-act="rh-cargaok" ${p.linhas.some(o=>o.mud.length)&&!R.salv?'':'disabled'}>Gravar as alterações</button></div>`:''}</section>`; }
  async function cargaAplicar(){ const p=R.carga.prev; let n=0, nf=0;
    for(const o of p.linhas){ if(Object.keys(o.up).length){ await grava(COL.func+'/'+o.f._id,Object.assign({},o.up)); n++; }
      for(const per of o.fer){ await P.db().doc(COL.ferias+'/'+id()).set({funcId:o.f._id,funcionario:o.f.nome,aquisitivo:per.ini,aquisitivoFim:per.fim,dias:per.saldo,anterior:true,status:'tirada',origem:'carga',em:agora(),por:P.S.uid||null,porNome:eu()}); nf++; } }
    return {n,nf}; }

  /* ---------- registro do módulo ---------- */
  const TELAS={ rhinicio:{nome:'Início',mob:'Início',render:vInicio}, rhagenda:{nome:'Agenda',mob:'Agenda',render:vAgenda}, rhfunc:{nome:'Funcionários',mob:'Funcionários',render:vFunc}, rhfichas:{nome:'Fichas do mês',mob:'Fichas',render:vFichas},
    rhdocs:{nome:'Documentos e contratos',mob:'Documentos',render:vDocs}, rhferias:{nome:'Férias e prazos',mob:'Prazos',render:vFerias}, rhfuncoes:{nome:'Funções e EPIs',mob:'Funções',render:vFuncoes}, rhterc:{nome:'Terceirizados',mob:'Terceiros',render:()=>bannerTerc()+vTerc()} };
  Object.values(TELAS).forEach(t=>{ const r=t.render; t.render=()=>{ queueMicrotask(navSolo); queueMicrotask(pvAjusta); return r(); }; });
  P.registrarModulo({ id:'rh', nome:'RH', ic:'equipe', telas:TELAS, iniciar });
  P.registrarPerfil('rh',{ nome:'RH (funcionários, fichas, documentos, terceirizados)', mods:['rh'], soVer:true, pos:2, desc:'Só o módulo RH: funcionários, fichas de EPI e uniforme do mês, documentos e contratos, funções e EPIs e terceirizados. Não vê nem muda nada da fábrica.' });
  /* quem só tem o RH vê as telas do RH na barra lateral (como no exemplo), no lugar da lista de módulos */
  function navSolo(){ const ms=P.modsVis?P.modsVis():[], solo=ms.length===1&&ms[0]==='rh'&&!!TELAS[P.S.view]; document.body.classList.toggle('rh-solo',solo); if(!solo) return;
    const nl=document.getElementById('navlist'); if(!nl) return; const h=Object.keys(TELAS).filter(v=>P.viewOk(v)).map(v=>`<button class="navbtn" data-go="${v}" ${P.S.view===v?'aria-current="page"':''}>${esc(TELAS[v].nome)}</button>`).join('');
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
    if(t.id==='rh-ferd'&&R.ffer){ R.ffer.dias=t.value; clearTimeout(R._fd); R._fd=setTimeout(()=>{ P.render(); const n2=document.getElementById('rh-ferd'); if(n2){ n2.focus(); } },500); }
    if(t.id==='rh-pjo'&&R.fpj) R.fpj.obs=t.value;
    if(t.dataset&&t.dataset.rhDx){ R.dg.extra[t.dataset.rhDx]=t.value; clearTimeout(R._dx); R._dx=setTimeout(()=>{ const a=document.activeElement, k=a&&a.dataset&&a.dataset.rhDx, pos=a&&a.selectionStart; P.render(); if(k){ const n=document.querySelector('[data-rh-dx="'+k+'"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } } },400); } });
  /* no editor, Enter cria parágrafo normal */
  document.addEventListener('focusin',ev=>{ if(ev.target&&ev.target.id==='rh-ed') try{ document.execCommand('defaultParagraphSeparator',false,'p'); }catch(e){} });
  /* os botões do editor não tiram o cursor do texto */
  document.addEventListener('mousedown',ev=>{ if(ev.target.closest&&ev.target.closest('.rh-tb button,.rh-tkb')) ev.preventDefault(); });
  document.addEventListener('change',async ev=>{ const t=ev.target;
    try{
      if(t.dataset&&t.dataset.rhFil){ R.filtro[t.dataset.rhFil]=t.value; P.render(); return; }
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
      if(t.id==='rh-docx'&&t.files&&t.files[0]){ const file=t.files[0]; t.value=''; await importarWord(file); return; }
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
      /* fichas do mês */
      if(a==='rh-fabrir'){ R.fmes=P.hojeStr().slice(0,7); R.fv='mes'; P.go('rhfichas'); return; }
      if(a==='rh-fgerartela'){ R.fmes=P.hojeStr().slice(0,7); R.fv='gerar'; P.go('rhfichas'); fichasRodar(()=>{ try{ const d=frm.contentWindow.document, i=d.getElementById('input-mes'); if(i&&i.value!==R.fmes){ i.value=R.fmes; i.dispatchEvent(new Event('change')); } }catch(e){} }); return; }
      if(a==='rh-fanexar'){ R.fmes=P.hojeStr().slice(0,7); R.fv='mes'; R.fmodo='lista'; R.ffil.sit='imp'; P.go('rhfichas'); return; }
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
      if(a==='rh-ed'){ R.f=Object.assign({},R.func.find(x=>x._id===b.dataset.id)); R.f.cpf=fCPF(R.f.cpf); R.carga=null; if(b.dataset.goFunc) P.go('rhfunc'); else P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fx'){ R.f=null; P.render(); return; }
      if(a==='rh-salvar'){ const v=Object.assign({},R.f,val('[data-rh-f]')); v.nome=String(v.nome||'').trim().replace(/\s+/g,' ').toUpperCase(); v.cpf=dig(v.cpf);
        if(v.nome.length<3) return P.toast('Escreva o nome completo.'); if(!cpfOk(v.cpf)) return P.toast('CPF inválido. Confira os números.');
        if(R.func.some(x=>x._id!==v._id&&dig(x.cpf)===v.cpf)) return P.toast('Já existe um funcionário com este CPF.');
        if(v.tipo==='PJ'){ const sel=v.empresaSel||(EMP_PJ.some(x=>x[0]===v.empresa)?v.empresa:'ZENITH'); if(sel==='OUTRA'){ v.empresa=String(v.empresaOutra||'').trim().toUpperCase(); if(v.empresa.length<2) return P.toast('Escreva o nome da empresa do PJ.'); } else v.empresa=sel; }
        else v.empresa='COLAFIX'; delete v.empresaSel; delete v.empresaOutra;
        if(String(v.salario||'').trim()){ const n=numBR(v.salario); if(n==null) return P.toast('Salário inválido. Ex.: 2.150,00'); v.salario=n; } else v.salario='';
        v.jornada=String(v.jornada||'').trim();
        if(v.status==='Desligado') v.desligAgendado=false; else if(!v.desligAgendado){ v.desligamento=''; v.desligMotivo=''; } const iD=v._id||id(); delete v._id; R.salv=true; P.render();
        const adm=!!v.admNova; delete v.admNova; if(adm){ v.admRoteiro=true; v.admEntregues=v.admEntregues||[]; }
        try{ await grava(COL.func+'/'+iD,Object.assign(v,R.f._id?{}:{criadoEm:agora(),criadoPor:P.S.uid||null})); R.f=null; if(adm){ R.adm={id:iD}; R.pess=null; P.toast('Cadastro salvo. Agora os documentos, o contrato e a ficha.'); } else P.toast('Funcionário salvo.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-csv'){ const L=[['Nome','CPF','Função','Setor','Empresa','Vínculo','Admissão','Situação','Desligamento','Telefone','Camisa','Calça','Calçado','Nascimento','Motivo do desligamento']].concat(R.func.map(x=>[x.nome,fCPF(x.cpf),x.funcao,x.setor,x.empresa,x.tipo,br(x.admissao),x.status,br(x.desligamento),x.telefone,x.camisa,x.calca,x.calcado,br(x.nascimento),x.desligMotivo||'']));
        const csv='﻿'+L.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n'); baixar(new Blob([csv],{type:'text/csv'}),'funcionarios.csv'); return; }
      /* funções */
      if(a==='rh-fnovo'){ R.ff={nome:b.dataset.n||'',epis:[],uniformes:[]}; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fed'){ R.ff=JSON.parse(JSON.stringify(R.funcoes.find(x=>x._id===b.dataset.id))); P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-ffx'){ R.ff=null; P.render(); return; }
      if(a==='rh-fsalvar'){ const nome=String((document.querySelector('[data-rh-ff="nome"]')||{}).value||'').trim(); if(nome.length<2) return P.toast('Escreva o nome da função.');
        if(R.funcoes.some(x=>x._id!==R.ff._id&&norm(x.nome)===norm(nome))) return P.toast('Essa função já existe.');
        const it=lerItens(); if(it.epis.length>9||it.uniformes.length>9) return P.toast('No máximo 9 itens de cada.'); const iD=R.ff._id||id();
        await grava(COL.funcoes+'/'+iD,{nome,epis:it.epis,uniformes:it.uniformes}); R.ff=null; R.prev={}; P.toast('Função salva.'); P.render(); try{ const F=fichasApi(); if(F) F.recarregar(); }catch(e){} return; }
      if(a==='rh-fdel'){ if(!confirm('Apagar a função '+R.ff.nome+'?')) return; await P.db().doc(COL.funcoes+'/'+R.ff._id).delete(); R.ff=null; P.render(); return; }
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
        const md=R.modelos.filter(m=>valePara(m,f)).find(m=>camposDe(m.html).some(k=>CAMPOS_FER.includes(k)))||R.modelos.find(m=>/FERIAS/.test(norm(m.nome)));
        R.dg={funcId:f._id,modeloId:md?md._id:'',extra:{},resp:{},feriasId:x._id,guardar:true}; R.dv='gerar'; P.go('rhdocs');
        if(!md) setTimeout(()=>P.toast('Cadastre o modelo do aviso de férias em Documentos e contratos (use os campos de férias).'),100); return; }
      /* férias e prazos */
      if(a==='rh-expprorr'){ const f=R.func.find(x=>x._id===b.dataset.id), s=f&&expInfo(f); if(!s) return; if(!confirm('Prorrogar a experiência de '+f.nome+' até '+br(s.f2)+'?')) return;
        await grava(COL.func+'/'+f._id,{exp:{status:'prorrogado',em:agora(),porNome:eu()}}); P.toast('Experiência prorrogada até '+br(s.f2)+'.'); return; }
      if(a==='rh-expefet'){ const f=R.func.find(x=>x._id===b.dataset.id); if(!f||!confirm('Efetivar '+f.nome+'? Sai da lista de experiência.')) return;
        await grava(COL.func+'/'+f._id,{exp:{status:'efetivado',em:agora(),porNome:eu()}}); P.toast(f.nome+' efetivado.'); return; }
      if(a==='rh-desl'){ const f=R.func.find(x=>x._id===b.dataset.id); if(!f) return; const s=expInfo(f); R.fdesl={funcId:f._id,data:P.hojeStr(),motivo:b.dataset.exp?(s&&s.d>0?'Rescisão antecipada da experiência (pelo empregador)':'Término do contrato de experiência'):''}; R.f=null; if(b.dataset.exp) P.render(); else P.go('rhfunc'); window.scrollTo(0,0); return; }
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
      if(a==='rh-agv'){ R.agv=b.dataset.v; P.render(); return; }
      if(a==='rh-agrel'){ R.agv='rel'; R.relMes=P.hojeStr().slice(0,7); P.go('rhagenda'); return; }
      if(a==='rh-agdias'){ R.agDias=+b.dataset.v||30; P.render(); return; }
      if(a==='rh-ics'){ const xs=agendaJanela().prox; if(!xs.length) return; baixar(new Blob([icsTexto(xs)],{type:'text/calendar'}),'Agenda-RH-Colafix.ics'); P.toast(plural(xs.length,'compromisso','compromissos')+' no arquivo. Abra o arquivo para mandar para o Outlook.'); return; }
      if(a==='rh-relmes'){ R.relMes=mesMais(R.relMes,+b.dataset.v); P.render(); return; }
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
      if(a==='rh-cargaok'){ if(!R.carga||!R.carga.prev) return; const np=R.carga.prev.linhas.filter(o=>o.mud.length).length; if(!confirm('Gravar as alterações de '+plural(np,'pessoa','pessoas')+'?')) return;
        R.salv=true; P.render(); try{ const r=await cargaAplicar(); R.carga=null; P.toast(plural(r.n,'cadastro atualizado','cadastros atualizados')+(r.nf?' · '+plural(r.nf,'período de férias','períodos de férias')+' marcado(s) como já tirado(s)':'')+'.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-pzabrir'){ R.pzv=b.dataset.v||'ferias'; P.go('rhferias'); return; }
      if(a==='rh-pzv'){ R.pzv=b.dataset.v; P.render(); return; }
      if(a==='rh-pzfil'){ R.pzfil=b.dataset.v; P.render(); return; }
      if(a==='rh-fernova'){ R.ffer={funcId:b.dataset.id,inicio:'',dias:''}; R.pzv='ferias'; if(b.dataset.goFer) P.go('rhferias'); else P.render(); window.scrollTo(0,0); return; }
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
        R.salv=true; P.render(); try{ await grava(COL.func+'/'+f._id,{ultimaTroca:g.data,trocas:(f.trocas||[]).concat([{data:g.data,obs:g.obs||'',em:agora(),porNome:eu()}]).slice(-40)});
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
  async function importarWord(file){ try{ P.toast('Lendo '+file.name+'…'); if(!window.mammoth) await carregarJs('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
      const r=await window.mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()}); const html=limpar(r.value||''); if(!html.replace(/<[^>]+>/g,'').trim()) return P.toast('O arquivo está vazio.');
      const n=camposDe(html).length; R.dm={nome:file.name.replace(/\.docx$/i,''),vale:'TODOS',html}; R.dv='modelos'; P.render();
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
  .rh-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.rh-kpi div{background:var(--surface);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}.rh-kpi b{font-size:30px;line-height:1.1;display:block;font-weight:800}.rh-kpi span{color:var(--muted);font-size:14px}
  .rh-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.rh-2>.card{margin:0}.rh-2+.card{margin-top:16px}
  .card h2{font-size:17px;margin:0 0 12px}.rh-ch{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:12px}.rh-ch h2{margin:0}
  .rh-bar{display:flex;height:12px;border-radius:999px;background:var(--sunken);overflow:hidden}.rh-bar i{display:block;height:100%}.rh-bar i.ok{background:var(--ok)}.rh-bar i.warn{background:var(--warn)}
  .rh-fn{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px;text-align:center}.rh-fn b{font-size:26px;display:block;font-weight:800}.rh-fn b.ok{color:var(--ok-ink)}.rh-fn b.warn{color:var(--warn-ink)}.rh-fn b.crit{color:var(--crit-ink)}.rh-fn span{color:var(--muted);font-size:13px}
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
  .rh-sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.rh-set{margin:0;display:flex;flex-direction:column}.rh-sp{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}.rh-sp+.rh-sp{margin-top:6px}.rh-ok{color:var(--ok-ink);font-weight:800;font-size:13px}.rh-wide{width:100%;justify-content:center;margin-top:auto}.rh-set .rh-wide{margin-top:14px}
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
  .rh-ag b{display:block}.rh-ag small{display:block;color:var(--muted);font-size:12.5px}.rh-agt{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.rh-ag.crit .rh-agt{color:var(--crit-ink)}.rh-ag.warn .rh-agt{color:var(--warn-ink)}.rh-ag.crit{box-shadow:inset 4px 0 0 var(--crit);padding-left:10px}.rh-ag.warn{box-shadow:inset 4px 0 0 var(--warn);padding-left:10px}
  .rh-pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start}.rh-pg>.card{margin:0}.rh-pgw{grid-column:1/-1}.rh-pd{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line)}.rh-pd:first-of-type{border-top:0}.rh-pd span{color:var(--muted)}.rh-pd b{text-align:right}
  .rh-nm{font:inherit;font-weight:800;color:var(--ink);background:none;border:0;padding:0;cursor:pointer;text-align:left}.rh-nm:hover{color:var(--teal);text-decoration:underline}
  .rh-bus{padding:14px 18px}.rh-busl{display:flex;flex-direction:column;gap:6px}.rh-busr{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:10px}.rh-busi{font:inherit;text-align:left;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);padding:10px 12px;cursor:pointer;color:var(--ink)}.rh-busi:hover{border-color:var(--teal)}.rh-busi b{display:block}.rh-busi small{color:var(--muted)}
  .rh-ap{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--line)}.rh-ap b{display:block}.rh-ap small{display:block;color:var(--muted)}.rh-apn{width:30px;height:30px;border-radius:50%;background:var(--teal-wash);color:var(--teal-strong);font-weight:800;display:flex;align-items:center;justify-content:center}.rh-ap.ok .rh-apn{background:var(--ok);color:#fff}
  .rh-adoc{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 14px;margin-top:8px}.rh-lsel{max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px 10px;display:flex;flex-direction:column;gap:2px}
  .rh-dfoot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
  .rh-gg{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:16px;align-items:start}.rh-gg>.card{margin:0}.rh-sep{border-top:1px solid var(--line);margin:12px 0}
  .rh-amar{background:#FFF8E6!important;border-color:#E3B341!important;color:#1A1A1A}.rh-dbt{display:flex;flex-direction:column;gap:10px;margin-top:6px}.rh-dbt .btn{justify-content:center;width:100%}
  .rh-page{background:#fff;color:#111;border-radius:6px;box-shadow:var(--shadow);padding:44px 48px;font-family:"Times New Roman",Georgia,serif;font-size:16px;line-height:1.7}.rh-page h1,.rh-page h2,.rh-page h3{text-align:center;font-size:17px;margin:0 0 16px;letter-spacing:.02em}.rh-page p{margin:0 0 12px}
  .rh-v{background:#FFF1CC;border-bottom:1.5px solid #C99A2E;padding:0 3px}.rh-falta{color:#A2453D;background:#FBE4E1;padding:0 3px}.rh-page .rh-ass{display:flex;gap:30px;margin-top:56px}.rh-page .rh-ass div{flex:1;border-top:1px solid #111;text-align:center;padding-top:4px;font-family:"Segoe UI",system-ui,sans-serif;font-size:13px}.rh-page .empty{font-family:"Segoe UI",system-ui,sans-serif}
  .rh-modal{position:fixed;inset:0;z-index:60;background:rgba(20,40,52,.5);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto}.rh-mbox{background:var(--surface);border-radius:16px;padding:20px;max-width:820px;width:100%}.rh-mbox .rh-page{box-shadow:none;border:1px solid var(--line)}
  .od-cfg summary{cursor:pointer}.od-cfg[open] summary{margin-bottom:6px}
  @media (min-width:861px){ body.rh-solo #view>nav.tabs{display:none} }
  @media (max-width:1100px){ .rh-fg,.rh-dg,.rh-gg{grid-template-columns:minmax(0,1fr)} .rh-busca{margin-left:0;flex:1 1 220px}.rh-busca .txt{flex:1;width:auto} }
  @media (max-width:760px){ .rh-2{grid-template-columns:minmax(0,1fr)} .rh-kpi{grid-template-columns:repeat(2,minmax(0,1fr))} .rh-g2{grid-template-columns:minmax(0,1fr)} .rh-page{padding:24px 18px;font-size:15px} .rh-tf thead{display:none}.rh-tf,.rh-tf tbody{display:block}.rh-tf tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 10px;align-items:center;padding:12px 6px;border-bottom:1px solid var(--line)}.rh-tf td{border:0;padding:0}.rh-tf td:nth-child(1){grid-column:1/-1}.rh-tf td:nth-child(2){display:none}.rh-tf tr.sel{background:var(--teal-wash)} .rh-acoes .btn{flex:1 1 auto;justify-content:center} }</style>`);
})();
