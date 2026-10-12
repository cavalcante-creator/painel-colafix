/* ===================== MÓDULO RH (09/10) =====================
   Controle de funcionários + Controle de EPI e Uniforme, tudo cadastrado no painel (sem planilha e sem Drive).
   Dados (só quem tem o módulo RH lê/grava — regra própria no firestore.rules):
     rh/config                         textos das declarações das fichas
     rh/dados/funcionarios/{id}        cadastro dos funcionários
     rh/dados/funcoes/{id}             EPIs (com CA) e uniformes de cada função
     rh/dados/retiradas/{id}           entregas de EPI/uniforme
     rh/arquivos/lista/{id} + rh/arquivos/partes/{id_n}   PDFs gerados e fichas escaneadas (em pedaços)
   As fichas usam o sistema original (modulos/rh-fichas.html) por uma ponte: window.RHAPI. */
(function(){ const P=window.Painel; if(!P) return;
  const R={pres:{},dia:P.hojeStr(),diaVer:'dia',terc:[],ft:null,tfil:'ativos',func:[],funcoes:[],ret:[],cfg:{},lido:{},f:null,ff:null,fr:null,filtro:{q:'',st:'ativos',setor:'',emp:'',tipo:''},mes:P.hojeStr().slice(0,7),salv:false,arqAbrir:null};
  const COL={pres:'rh/dados/presenca',terc:'rh/dados/terceiros',func:'rh/dados/funcionarios',funcoes:'rh/dados/funcoes',ret:'rh/dados/retiradas',lista:'rh/arquivos/lista',partes:'rh/arquivos/partes'};
  const ST=['Ativo','Férias','Afastado','Desligado'];
  /* empresas: todo CLT é Colafix; PJ é Zenith ou Nexus (ou outra) */
  const EMP_PJ=[['ZENITH','Zenith'],['NEXUS','Nexus']], EMP_NOME={COLAFIX:'Colafix',ZENITH:'Zenith',NEXUS:'Nexus'};
  const empNome=e=>EMP_NOME[e]||e||'';
  const empPadrao=(tipo,txt)=>{ if(tipo!=='PJ') return 'COLAFIX'; const n=String(txt||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); return /ZENITH/.test(n)?'ZENITH':/NEXUS/.test(n)?'NEXUS':n.trim(); };
  const esc=P.esc, eu=()=>(P.S.uid&&P.S.nomes[P.S.uid])||'', agora=()=>new Date().toISOString();
  const dig=s=>String(s||'').replace(/\D/g,''), norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const fCPF=c=>{ c=dig(c); return c.length===11?c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):c; };
  const cpfOk=c=>{ c=dig(c); if(c.length!==11||/^(\d)\1+$/.test(c)) return false; let s=0; for(let i=0;i<9;i++) s+=+c[i]*(10-i); let d=(s*10)%11%10; if(d!==+c[9]) return false; s=0; for(let i=0;i<10;i++) s+=+c[i]*(11-i); d=(s*10)%11%10; return d===+c[10]; };
  const br=d=>d&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
  const mesLabel=m=>{ const n=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']; const [y,mm]=String(m).split('-'); return (n[+mm-1]||'')+' '+y; };
  const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const linkArq=i=>location.origin+location.pathname+'?rhfile='+encodeURIComponent(i);

  /* ---------- leitura ---------- */
  function iniciar(){ const sub=(k,mk)=>P.inscrever('rh-'+k,mk,snap=>{ R[k]=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); R.lido[k]=true; P.rerender(); });
    sub('func',()=>P.db().collection(COL.func).limit(3000)); sub('funcoes',()=>P.db().collection(COL.funcoes).limit(500));
    sub('ret',()=>P.db().collection(COL.ret).orderBy('data','desc').limit(1500)); sub('terc',()=>P.db().collection(COL.terc).limit(1000));
    { const ini=new Date(); ini.setDate(1); ini.setMonth(ini.getMonth()-2); const de=ini.toISOString().slice(0,10);
      P.inscrever('rh-pres',()=>P.db().collection(COL.pres).where('data','>=',de).limit(120),snap=>{ snap.docs.forEach(d=>{ const x=d.data(); if(!R.presSujo||R.presSujo!==x.data) R.pres[x.data]=x; }); R.lido.pres=true; P.rerender(); }); }
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

  /* ---------- ponte para o sistema de fichas (as mesmas funções que o Apps Script tinha) ---------- */
  const DIAS=d=>d?br(d):'';
  /* OneDrive ligado: as fichas vão para lá (pasta por mês); senão ficam no painel */
  const OD=()=>window.OneDrive&&window.OneDrive.ativo()?window.OneDrive:null;
  const pastaMes=m=>{ const l=mesLabel(m); return m+' '+l.charAt(0).toUpperCase()+l.slice(1).split(' ')[0]; };
  const odData=iso=>iso?br(String(iso).slice(0,10)):'';
  window.RHAPI={
    getDadosPlanilha: async()=>{ const [f,fu,re,cf]=await Promise.all([P.db().collection(COL.func).limit(3000).get(),P.db().collection(COL.funcoes).limit(500).get(),P.db().collection(COL.ret).limit(5000).get(),P.db().doc('rh/config').get()]);
      const FU=f.docs.map(d=>d.data()), FC=fu.docs.map(d=>d.data()), RE=re.docs.map(d=>d.data()), C=cf.exists?cf.data():{};
      const colab=[['Nome','CPF','Função','Setor','Data de admissão','Empresa','Status','Tipo']].concat(FU.map(x=>[x.nome,fCPF(x.cpf),x.funcao||'',x.setor||'',DIAS(x.admissao),x.empresa||'',x.status==='Desligado'?'Inativo':'Ativo',x.tipo==='PJ'?'PJ':'CLT']));
      const cab=(p,s)=>{ const h=['Função']; for(let n=1;n<=9;n++) h.push(p+' '+n,s+' '+n); return h; };
      const linha=(nome,its,k)=>{ const r=[nome]; for(let n=0;n<9;n++){ const x=its[n]; r.push(x?x.nome:'',x?(x[k]||''):''); } return r; };
      const epi=[cab('EPI','CA')].concat(FC.map(x=>linha(x.nome,x.epis||[],'ca')));
      const uni=[cab('Uniforme','Tamanho')].concat(FC.map(x=>linha(x.nome,x.uniformes||[],'tam')));
      const reg=[['Funcionário','Mês/Ano referência','EPI','CA','Quantidade','Data da retirada','Responsável pela entrega','Confirmação do funcionário','CPF','Observação']].concat(RE.map(x=>[x.funcionario,x.mes?x.mes.slice(5,7)+'/'+x.mes.slice(0,4):'',x.item,x.ca||'',x.qtd,DIAS(x.data),x.responsavel||'',x.confirmacao||'',fCPF(x.cpf),x.obs||'']));
      const modelo=[[C.declUniforme||'',C.declEpi||'']];
      return {colaboradores:colab,epi,uniforme:uni,registros:reg,fichaModelo:modelo}; },
    salvarLotePdfNoDrive: async(mesAno,b64,nome)=>{ nome=nome||('Fichas '+mesLabel(mesAno)+'.pdf'); const od=OD(); if(od){ const r=await od.enviar(pastaMes(mesAno)+'/'+nome,b64,'application/pdf'); return {url:(r&&r.webUrl)||'',nome}; } const i=await salvarArquivo({nome:nome||('Fichas '+mesLabel(mesAno)+'.pdf'),mes:mesAno,mime:'application/pdf',tipo:'lote'},b64); return {url:linkArq(i),nome}; },
    salvarFichaEscaneada: async(mesAno,nomeFunc,b64,mime,ext)=>{ const ml=mesLabel(mesAno); const nome=nomeFunc+' - '+ml.charAt(0).toUpperCase()+ml.slice(1)+'.'+(ext||'pdf');
      const od=OD(); if(od){ const r=await od.enviar(pastaMes(mesAno)+'/'+nome,b64,mime||'application/pdf'); return {url:(r&&r.webUrl)||'',nome}; }
      const i=await salvarArquivo({nome,mes:mesAno,mime:mime||'application/pdf',tipo:'escaneada',funcionario:nomeFunc},b64); return {url:linkArq(i),nome}; },
    listarArquivosDoMes: async(mesAno)=>{ const od=OD(); if(od) return (await od.listar(pastaMes(mesAno))).filter(x=>x.file).map(x=>({nome:x.name,url:x.webUrl})); return (await listaArquivos(a=>a.tipo==='escaneada'&&a.mes===mesAno)).map(a=>({nome:a.nome,url:linkArq(a._id)})); },
    buscarFichasNoDrive: async(termo,op)=>{ const t=norm(termo); op=op||{}; const od=OD();
      if(od){ const pm=op.mesAno?pastaMes(op.mesAno):''; return (await od.buscar(termo)).filter(x=>x.file&&(!op.apenasPdf||/\.pdf$/i.test(x.name))&&(!pm||((x.parentReference||{}).name||'')===pm))
        .map(x=>({url:x.webUrl,nome:x.name,pasta:(x.parentReference||{}).name||'',modificado:odData(x.lastModifiedDateTime)})); } return (await listaArquivos(a=>norm(a.nome).includes(t)&&(!op.mesAno||a.mes===op.mesAno)&&(!op.apenasPdf||/pdf/.test(a.mime||''))))
      .map(a=>({url:linkArq(a._id),nome:a.nome,pasta:mesLabel(a.mes||''),modificado:br((a.em||'').slice(0,10))})); },
    abrirPastaDoMes: async()=>location.origin+location.pathname,
    getLinkPastaFichas: async()=>location.origin+location.pathname };

  /* ---------- telas ---------- */
  const topo=(t,s,acoes)=>`<div class="head"><div><div class="eyebrow">RH</div><h1>${t}</h1>${s?`<div class="sub">${s}</div>`:''}</div>${acoes?`<div style="display:flex;gap:10px;flex-wrap:wrap">${acoes}</div>`:''}</div>`;
  const opts=(xs,v)=>xs.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  const unicos=k=>[...new Set(R.func.map(x=>x[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const corSt=s=>s==='Ativo'?'ok':s==='Desligado'?'neu':'warn';
  function vFunc(){ return bannerTerc()+vFunc0(); }
  function vFunc0(){ const F=R.filtro, q=norm(F.q);
    let xs=R.func.filter(x=>(F.st==='ativos'?x.status!=='Desligado':F.st==='todos'?true:x.status===F.st)&&(!F.setor||x.setor===F.setor)&&(!F.emp||x.empresa===F.emp)&&(!F.tipo||x.tipo===F.tipo)&&(!q||norm(x.nome).includes(q)||dig(x.cpf).includes(dig(F.q)||'#')||norm(x.funcao).includes(q)));
    xs.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    const cnt=s=>R.func.filter(x=>x.status===s).length;
    return topo('Funcionários','Controle de funcionários: cadastro, situação e o que cada um usa.',`<button class="btn" data-act="rh-novo">${P.ic('mais',18,2.4)}Novo funcionário</button><label class="btn sec" style="cursor:pointer">${P.ic('baixar',18,2)}Importar (Excel/CSV)<input type="file" id="rh-imp" accept=".xlsx,.xls,.csv" hidden></label><button class="btn sec" data-act="rh-csv">Exportar</button>`)
      +(R.f?formFunc():'')
      +`<div class="rh-cnt">${ST.map(s=>`<div><b class="num">${cnt(s)}</b><span>${s}</span></div>`).join('')}</div>
      <section class="card"><div class="rh-fil"><input class="txt" id="rh-q" placeholder="Buscar nome, CPF ou função" value="${esc(F.q)}">
        <select class="txt" data-rh-fil="st"><option value="ativos" ${F.st==='ativos'?'selected':''}>Em atividade</option>${ST.map(s=>`<option ${F.st===s?'selected':''}>${s}</option>`).join('')}<option value="todos" ${F.st==='todos'?'selected':''}>Todos</option></select>
        <select class="txt" data-rh-fil="setor"><option value="">Todos os setores</option>${opts(unicos('setor'),F.setor)}</select>
        <select class="txt" data-rh-fil="emp"><option value="">Todas as empresas</option>${unicos('empresa').map(e=>`<option value="${esc(e)}" ${F.emp===e?'selected':''}>${esc(empNome(e))}</option>`).join('')}</select>
        <select class="txt" data-rh-fil="tipo"><option value="">CLT e PJ</option>${opts(['CLT','PJ'],F.tipo)}</select></div>
      ${!R.lido.func?'<div class="empty">Carregando…</div>':xs.length?`<div style="overflow-x:auto"><table class="rh-t"><thead><tr><th>Nome</th><th>CPF</th><th>Função</th><th>Setor</th><th>Empresa</th><th>Admissão</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(x=>`<tr><td><b>${esc(x.nome)}</b>${x.tipo==='PJ'?' <span class="pill neu">PJ</span>':''}</td><td class="num">${esc(fCPF(x.cpf))}</td><td>${esc(x.funcao||'')}</td><td>${esc(x.setor||'')}</td><td>${esc(empNome(x.empresa))}</td><td class="num">${br(x.admissao)}</td>
          <td><span class="pill ${corSt(x.status)}">${esc(x.status||'')}</span>${x.status==='Desligado'&&x.desligamento?`<small style="display:block;color:var(--muted)">${br(x.desligamento)}</small>`:''}</td><td><button class="lnk" data-act="rh-ed" data-id="${x._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>
        <div class="sub" style="margin:8px 0 0">${xs.length} funcionário(s)</div>`:'<div class="empty">Nenhum funcionário com esses filtros.</div>'}</section>`; }
  function formFunc(){ const f=R.f, fs=R.funcoes.map(x=>x.nome).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const i=(k,l,t,ex)=>`<label><span class="label">${l}</span><input class="txt" data-rh-f="${k}" type="${t||'text'}" value="${esc(f[k]||'')}" ${ex||''}></label>`;
    return `<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>${f._id?'Editar':'Novo'} funcionário</h2><button class="lnk" data-act="rh-fx">Fechar</button></div>
      <div class="rh-g">${i('nome','Nome completo *')}${i('cpf','CPF *','text','inputmode="numeric" maxlength="14"')}
        <label><span class="label">Função</span><input class="txt" data-rh-f="funcao" list="rh-funcoes" value="${esc(f.funcao||'')}"><datalist id="rh-funcoes">${fs.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
        ${i('setor','Setor')}
        <label><span class="label">Vínculo</span><select class="txt" data-rh-f="tipo">${opts(['CLT','PJ'],f.tipo||'CLT')}</select></label>
        ${(f.tipo||'CLT')==='CLT'?`<label><span class="label">Empresa</span><input class="txt" value="Colafix (todo CLT)" disabled></label>`
          :`<label><span class="label">Empresa (PJ) *</span><select class="txt" data-rh-f="empresaSel">${EMP_PJ.map(([k,n])=>`<option value="${k}" ${(f.empresaSel||f.empresa)===k?'selected':''}>${n}</option>`).join('')}<option value="OUTRA" ${f.empresaSel==='OUTRA'||(f.empresa&&!EMP_PJ.some(x=>x[0]===f.empresa)&&f.empresa!=='COLAFIX')?'selected':''}>Outra…</option></select></label>
             ${f.empresaSel==='OUTRA'||(!f.empresaSel&&f.empresa&&!EMP_PJ.some(x=>x[0]===f.empresa)&&f.empresa!=='COLAFIX')?`<label><span class="label">Nome da outra empresa *</span><input class="txt" data-rh-f="empresaOutra" value="${esc(f.empresaOutra||(EMP_PJ.some(x=>x[0]===f.empresa)||f.empresa==='COLAFIX'?'':f.empresa||''))}"></label>`:''}`}
        ${i('admissao','Admissão','date')}
        <label><span class="label">Situação</span><select class="txt" data-rh-f="status">${opts(ST,f.status||'Ativo')}</select></label>
        ${f.status==='Desligado'?i('desligamento','Data do desligamento','date'):''}
        ${i('telefone','Telefone','tel')}${i('camisa','Tamanho da camisa')}${i('calca','Tamanho da calça')}${i('calcado','Número do calçado')}</div>
      <label style="display:block;margin-top:10px"><span class="label">Observações</span><textarea class="txt" data-rh-f="obs" rows="2">${esc(f.obs||'')}</textarea></label>
      ${f.alteradoEm?`<div class="sub" style="margin:8px 0 0;font-size:12px">Última alteração: ${new Date(f.alteradoEm).toLocaleString('pt-BR')}${f.alteradoNome?' · '+esc(f.alteradoNome):''}</div>`:''}
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-fx">Cancelar</button><button class="btn" data-act="rh-salvar" ${R.salv?'disabled':''}>${R.salv?'Salvando…':'Salvar'}</button></div></section>`; }
  function vFuncoes(){ const ff=R.ff, semCad=unicos('funcao').filter(n=>!R.funcoes.some(x=>norm(x.nome)===norm(n)));
    const lin=(arr,k,ph)=>{ const xs=(arr||[]).concat([{}]).slice(0,9); return xs.map((x,i)=>`<div class="rh-it"><input class="txt" data-rh-it="${k}" data-i="${i}" data-c="nome" placeholder="${k==='epis'?'EPI':'Peça do uniforme'} ${i+1}" value="${esc(x.nome||'')}"><input class="txt" data-rh-it="${k}" data-i="${i}" data-c="${k==='epis'?'ca':'tam'}" placeholder="${ph}" value="${esc(x[k==='epis'?'ca':'tam']||'')}" style="max-width:150px"></div>`).join(''); };
    return topo('Funções: EPI e uniforme','O que cada função recebe. É daqui que as fichas puxam os itens e o CA.',`<button class="btn" data-act="rh-fnovo">${P.ic('mais',18,2.4)}Nova função</button>`)
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
  function vRet(){ const m=R.mes, xs=R.ret.filter(x=>x.mes===m), fr=R.fr, ativos=R.func.filter(x=>x.status!=='Desligado').sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const fsel=fr&&R.func.find(x=>x._id===fr.funcId), fc=fsel&&R.funcoes.find(x=>norm(x.nome)===norm(fsel.funcao)), itens=fc?(fr.tipo==='Uniforme'?(fc.uniformes||[]):(fc.epis||[])):[];
    return topo('Retiradas de EPI e uniforme','Registro do que cada funcionário retirou. Aparece nas fichas do mês.',`<input class="txt" type="month" id="rh-mes" value="${esc(m)}" style="height:40px"><button class="btn" data-act="rh-rnovo">${P.ic('mais',18,2.4)}Registrar retirada</button>`)
      +(fr?`<section class="card rh-form"><div class="head" style="align-items:baseline"><h2>Registrar retirada</h2><button class="lnk" data-act="rh-rfx">Fechar</button></div><div class="rh-g">
        <label><span class="label">Funcionário *</span><select class="txt" data-rh-r="funcId"><option value="">Escolha…</option>${ativos.map(x=>`<option value="${x._id}" ${fr.funcId===x._id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>
        <label><span class="label">Tipo</span><select class="txt" data-rh-r="tipo">${opts(['EPI','Uniforme'],fr.tipo||'EPI')}</select></label>
        <label><span class="label">Item *</span><input class="txt" data-rh-r="item" list="rh-itens" value="${esc(fr.item||'')}"><datalist id="rh-itens">${itens.map(x=>`<option value="${esc(x.nome)}">`).join('')}</datalist></label>
        <label><span class="label">${fr.tipo==='Uniforme'?'Tamanho':'CA'}</span><input class="txt" data-rh-r="ca" value="${esc(fr.ca||'')}"></label>
        <label><span class="label">Quantidade *</span><input class="txt" data-rh-r="qtd" type="number" min="1" value="${esc(fr.qtd||'1')}"></label>
        <label><span class="label">Data *</span><input class="txt" data-rh-r="data" type="date" value="${esc(fr.data||P.hojeStr())}"></label>
        <label><span class="label">Responsável pela entrega</span><input class="txt" data-rh-r="responsavel" value="${esc(fr.responsavel||eu())}"></label>
        <label><span class="label">Confirmação do funcionário</span><select class="txt" data-rh-r="confirmacao">${opts(['','Assinado','Pendente'],fr.confirmacao||'')}</select></label></div>
        <label style="display:block;margin-top:10px"><span class="label">Observação</span><input class="txt" data-rh-r="obs" value="${esc(fr.obs||'')}"></label>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="btn sec" data-act="rh-rfx">Cancelar</button><button class="btn" data-act="rh-rsalvar" ${R.salv?'disabled':''}>Salvar</button></div></section>`:'')
      +`<section class="card">${xs.length?`<div style="overflow-x:auto"><table class="rh-t"><thead><tr><th>Data</th><th>Funcionário</th><th>Item</th><th>CA / tam.</th><th>Qtd</th><th>Responsável</th><th>Confirmação</th><th></th></tr></thead><tbody>
        ${xs.map(x=>`<tr><td class="num">${br(x.data)}</td><td>${esc(x.funcionario)}</td><td>${esc(x.item)} <small style="color:var(--muted)">${esc(x.tipo||'')}</small></td><td>${esc(x.ca||'')}</td><td class="num">${esc(x.qtd)}</td><td>${esc(x.responsavel||'')}</td><td>${esc(x.confirmacao||'')}</td><td><button class="lnk" data-act="rh-rdel" data-id="${x._id}" style="color:var(--crit-ink)">Apagar</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">Nenhuma retirada em ${mesLabel(m)}.</div>`}</section>`; }
  function odBarra(){ const c=(P.S.cfg||{}).onedrive||{}, O=window.OneDrive; if(!O) return ''; const dono=P.dono();
    let barra='';
    if(O.ativo()) barra=O.conectado()?`<div class="banner" style="background:var(--ok-tint);color:var(--ok-ink);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>☁️ As fichas estão sendo salvas no <b>OneDrive</b>${O.conta()?' de '+esc(O.conta()):''} · pasta <b>${esc(c.link?'compartilhada da equipe':(c.pasta||'Fichas EPI e Uniforme'))}</b>, separada por mês.</span><button class="lnk" data-act="od-sair">Desconectar</button></div>`
      :`<div class="banner" style="background:var(--warn-tint);color:var(--warn-ink);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>☁️ As fichas são salvas no <b>OneDrive</b>. Conecte sua conta Microsoft da empresa neste aparelho para enviar e consultar.</span><button class="btn" data-act="od-con">Conectar ao OneDrive</button></div>`;
    const cf=dono?`<details class="card od-cfg" ${c.clientId?'':'open'}><summary><b>OneDrive (Microsoft 365)</b> · ${O.ativo()?'ligado':'desligado (fichas ficam no painel)'}</summary>
      <div class="sub" style="margin:8px 0 10px">Endereço de retorno para cadastrar no Microsoft Entra (tipo <b>Aplicativo de página única / SPA</b>):<br><code style="user-select:all">${esc(O.retorno())}</code></div>
      <div class="rh-g"><label><span class="label">ID do aplicativo (cliente) *</span><input class="txt" id="od-cli" value="${esc(c.clientId||'')}" placeholder="00000000-0000-0000-0000-000000000000"></label>
        <label><span class="label">ID do diretório (locatário)</span><input class="txt" id="od-ten" value="${esc(c.tenant||'')}" placeholder="vazio = qualquer conta da empresa"></label>
        <label><span class="label">Pasta no OneDrive de quem conectar</span><input class="txt" id="od-pas" value="${esc(c.pasta||'Fichas EPI e Uniforme')}"></label>
        <label><span class="label">Ou link de uma pasta compartilhada da equipe</span><input class="txt" id="od-lnk" value="${esc(c.link||'')}" placeholder="https://empresa-my.sharepoint.com/…"></label></div>
      <label class="ck" style="margin-top:10px"><input type="checkbox" id="od-ati" ${c.ativo?'checked':''}> Salvar as fichas no OneDrive</label>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-act="od-salvar">Salvar configuração</button></div></details>`:'';
    return barra+cf; }
  function vFichas(){ return topo('Fichas de EPI e uniforme','Gerar, imprimir e guardar as fichas do mês, e as fichas escaneadas.')+odBarra()
      +(R.arqAbrir?`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong);display:flex;justify-content:space-between;gap:10px;align-items:center"><span>Arquivo pronto para abrir.</span><span><button class="btn" data-act="rh-arq">Abrir arquivo</button> <button class="lnk" data-act="rh-arqx">Fechar</button></span></div>`:'')
      +`<section class="card rh-fr"><div id="rh-fr-slot"></div></section>`; }
  /* o sistema de fichas fica num quadro fixo, posicionado sobre o espaço da tela: os redesenhos do painel não o recarregam (não perde a prévia) */
  let frm=null;
  function frEl(){ if(!frm){ frm=document.createElement('iframe'); frm.src='modulos/rh-fichas.html'; frm.title='Fichas de EPI e uniforme'; frm.className='rh-frx'; document.body.appendChild(frm); } return frm; }
  function frSync(){ const slot=document.getElementById('rh-fr-slot'); if(!(P.S.view==='rhfichas'&&slot)){ if(frm) frm.style.display='none'; return; }
    const f=frEl(), r=slot.getBoundingClientRect(); Object.assign(f.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'}); }
  setInterval(frSync,200); addEventListener('resize',frSync); addEventListener('scroll',frSync,true);

  /* ---------- terceirizados: prazo do contrato ---------- */
  const diasAte=d=>Math.round((new Date(d+'T12:00:00')-new Date(P.hojeStr()+'T12:00:00'))/864e5);
  function tSit(x){ if(x.status==='Encerrado') return {c:'neu',t:'Encerrado',n:9}; if(!x.fim) return {c:'neu',t:'Sem vencimento',n:8}; const d=diasAte(x.fim), av=+x.aviso>0?+x.aviso:30;
    if(d<0) return {c:'crit',t:'Vencido há '+(-d)+' dia'+(d===-1?'':'s'),n:0,d}; if(d===0) return {c:'crit',t:'Vence hoje',n:1,d}; if(d<=av) return {c:'warn',t:'Vence em '+d+' dia'+(d===1?'':'s'),n:2,d}; return {c:'ok',t:'Em dia · vence em '+d+' dias',n:3,d}; }
  function tAvisos(){ return R.terc.filter(x=>x.status!=='Encerrado'&&x.fim).map(x=>({x,s:tSit(x)})).filter(o=>o.s.c==='crit'||o.s.c==='warn').sort((a,b)=>a.s.d-b.s.d); }
  P.registrarAviso(()=>tAvisos().map(o=>({nivel:o.s.c,rotulo:o.s.d<0?'Vencido':o.s.d===0?'Vence hoje':'Atenção',titulo:'Contrato de terceirizado: '+o.x.nome,texto:o.s.t+' ('+br(o.x.fim)+')'+(o.x.empresa?' · '+o.x.empresa:''),go:'rhterc'})));
  function bannerTerc(){ const xs=tAvisos(); if(!xs.length) return ''; const v=xs.filter(o=>o.s.c==='crit').length;
    return `<div class="banner" style="background:${v?'var(--crit-tint)':'var(--warn-tint)'};color:${v?'var(--crit-ink)':'var(--warn-ink)'};display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span><b>Contratos de terceirizados:</b> ${v?v+' vencido(s)':''}${v&&xs.length-v?' · ':''}${xs.length-v?(xs.length-v)+' vencendo':''}</span><button class="lnk" data-go="rhterc">Ver terceirizados</button></div>`; }
  function vTerc(){ const F=R.tfil; let xs=R.terc.filter(x=>F==='todos'?true:F==='ativos'?x.status!=='Encerrado':F==='aviso'?['crit','warn'].includes(tSit(x).c):x.status==='Encerrado');
    xs=xs.map(x=>({x,s:tSit(x)})).sort((a,b)=>a.s.n-b.s.n||(a.s.d||0)-(b.s.d||0)||String(a.x.nome).localeCompare(String(b.x.nome),'pt-BR'));
    const nAv=tAvisos().length;
    return topo('Terceirizados','Prestadores de serviço e o prazo de cada contrato. Avisa no Meu dia quando estiver perto de vencer.',`<button class="btn" data-act="rh-tnovo">${P.ic('mais',18,2.4)}Novo terceirizado</button>`)
      +(R.ft?formTerc():'')
      +`<section class="card"><div class="seg" style="margin-bottom:12px">${[['ativos','Ativos'],['aviso','Vencendo ou vencidos'+(nAv?' ('+nAv+')':'')],['encerrados','Encerrados'],['todos','Todos']].map(([k,l])=>`<button data-act="rh-tfil" data-v="${k}" aria-pressed="${F===k}">${l}</button>`).join('')}</div>
      ${!R.lido.terc?'<div class="empty">Carregando…</div>':xs.length?`<div style="overflow-x:auto"><table class="rh-t"><thead><tr><th>Nome</th><th>Empresa</th><th>Serviço</th><th>Início</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead><tbody>
        ${xs.map(({x,s})=>`<tr><td><b>${esc(x.nome)}</b>${x.telefone?`<small style="display:block;color:var(--muted)">${esc(x.telefone)}</small>`:''}</td><td>${esc(x.empresa||'')}${x.cnpj?`<small style="display:block;color:var(--muted)">${esc(x.cnpj)}</small>`:''}</td><td>${esc(x.servico||'')}${x.setor?`<small style="display:block;color:var(--muted)">${esc(x.setor)}</small>`:''}</td>
          <td class="num">${br(x.inicio)}</td><td class="num"><b>${br(x.fim)}</b>${(x.renovacoes||[]).length?`<small style="display:block;color:var(--muted)">${x.renovacoes.length} renovação(ões)</small>`:''}</td><td><span class="pill ${s.c}">${esc(s.t)}</span></td>
          <td style="white-space:nowrap">${x.status!=='Encerrado'?`<button class="lnk" data-act="rh-tren" data-id="${x._id}">Renovar</button> · `:''}<button class="lnk" data-act="rh-ted" data-id="${x._id}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum terceirizado aqui.</div>'}</section>`; }
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

  /* ---------- Dia a dia: presença, faltas, atrasos e horas extras (rh/dados/presenca/{AAAA-MM-DD}) ---------- */
  const PST=[['P','Presente'],['F','Falta'],['AT','Atestado'],['FO','Folga'],['FE','Férias'],['AF','Afastado']];
  const pNome=k=>(PST.find(x=>x[0]===k)||['','?'])[1];
  function presPadrao(f){ return f.status==='Férias'?'FE':f.status==='Afastado'?'AF':'P'; }
  function presDe(dia,f){ const d=R.pres[dia], it=d&&d.itens&&d.itens[f._id]; return Object.assign({st:presPadrao(f),atraso:0,saida:0,he:0,obs:''},it||{}); }
  const hm=min=>{ min=Math.round(+min||0); return min?Math.floor(min/60)+'h'+String(min%60).padStart(2,'0'):'—'; };
  let presT=null;
  function presGrava(dia){ R.presSujo=dia; clearTimeout(presT); presT=setTimeout(async()=>{ const d=R.pres[dia]; try{ await P.db().doc(COL.pres+'/'+dia).set({data:dia,itens:d.itens,lancado:true,alteradoEm:agora(),alteradoPor:P.S.uid||null,alteradoNome:eu()}); R.presSujo=null; }catch(e){ P.erro(e); } },600); }
  function presSet(dia,fid,campo,val){ const d=R.pres[dia]||(R.pres[dia]={data:dia,itens:{}}); d.itens=d.itens||{}; const f=R.func.find(x=>x._id===fid); d.itens[fid]=Object.assign(presDe(dia,f),d.itens[fid]||{},{[campo]:val}); d.lancado=true; presGrava(dia); }
  function presResumo(dia){ const atv=R.func.filter(f=>f.status!=='Desligado'), c={}; PST.forEach(x=>c[x[0]]=0); let atr=0,he=0; atv.forEach(f=>{ const p=presDe(dia,f); c[p.st]++; if(+p.atraso) atr++; he+=+p.he||0; }); return {c,atr,he,tot:atv.length,lancado:!!(R.pres[dia]&&R.pres[dia].lancado)}; }
  function vDia(){ const dia=R.dia, ver=R.diaVer, atv=R.func.filter(f=>f.status!=='Desligado').sort((a,b)=>String(a.setor||'').localeCompare(String(b.setor||''),'pt-BR')||a.nome.localeCompare(b.nome,'pt-BR'));
    const rs=presResumo(dia), dd=R.pres[dia];
    const cab=topo('Dia a dia','Presença, faltas, atrasos e horas extras. Todos começam como presentes: marque só o que foi diferente.',`<div class="seg">${[['dia','Folha do dia'],['mes','Resumo do mês']].map(([k,l])=>`<button data-act="rh-dver" data-v="${k}" aria-pressed="${ver===k}">${l}</button>`).join('')}</div>`);
    if(ver==='mes') return cab+vMes();
    return cab+`<section class="card"><div class="rh-fil" style="align-items:center"><button class="btn sec" data-act="rh-ddia" data-v="-1">‹</button><input class="txt" type="date" id="rh-dia" value="${esc(dia)}" style="max-width:180px"><button class="btn sec" data-act="rh-ddia" data-v="1">›</button>
        <button class="lnk" data-act="rh-dhoje">Hoje</button><span class="sub" style="margin:0 0 0 auto">${dd&&dd.lancado?'Lançado'+(dd.alteradoNome?' por '+esc(dd.alteradoNome):'')+(dd.alteradoEm?' às '+P.hora(dd.alteradoEm):''):'<b style="color:var(--warn-ink)">Ainda não lançado</b>'}</span></div>
      <div class="rh-cnt" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:6px 0 12px"><div><b class="num">${rs.c.P}</b><span>presentes</span></div><div><b class="num" style="color:${rs.c.F?'var(--crit-ink)':'inherit'}">${rs.c.F}</b><span>faltas</span></div><div><b class="num">${rs.c.AT+rs.c.FO+rs.c.FE+rs.c.AF}</b><span>atestado, folga, férias, afastado</span></div><div><b class="num">${rs.atr}</b><span>atrasos · ${String(Math.round(rs.he*10)/10).replace('.',',')} h extra</span></div></div>
      ${!R.lido.func?'<div class="empty">Carregando…</div>':atv.length?`<div style="overflow-x:auto"><table class="rh-t rh-pt"><thead><tr><th>Funcionário</th><th>Situação</th><th>Atraso (min)</th><th>Saída antecipada (min)</th><th>Hora extra (h)</th><th>Observação</th></tr></thead><tbody>
        ${atv.map(f=>{ const p=presDe(dia,f); return `<tr class="st-${p.st}"><td><b>${esc(f.nome)}</b><small style="display:block;color:var(--muted)">${esc(f.setor||'')}${f.funcao?' · '+esc(f.funcao):''}</small></td>
          <td><div class="rh-pst">${PST.map(([k,l])=>`<button data-act="rh-pst" data-f="${f._id}" data-v="${k}" aria-pressed="${p.st===k}" title="${l}">${l}</button>`).join('')}</div></td>
          <td><input class="txt rh-pn" inputmode="numeric" data-rh-p="atraso" data-f="${f._id}" value="${+p.atraso||''}"></td><td><input class="txt rh-pn" inputmode="numeric" data-rh-p="saida" data-f="${f._id}" value="${+p.saida||''}"></td>
          <td><input class="txt rh-pn" inputmode="decimal" data-rh-p="he" data-f="${f._id}" value="${+p.he?String(+p.he).replace('.',','):''}"></td><td><input class="txt" data-rh-p="obs" data-f="${f._id}" value="${esc(p.obs||'')}" placeholder="—"></td></tr>`; }).join('')}</tbody></table></div>`:'<div class="empty">Nenhum funcionário em atividade.</div>'}
      <div class="sub" style="margin:10px 0 0">Salva sozinho a cada alteração.</div></section>`; }
  function vMes(){ const m=R.dia.slice(0,7), dias=Object.keys(R.pres).filter(d=>d.slice(0,7)===m&&R.pres[d].lancado).sort();
    const linhas=R.func.filter(f=>f.status!=='Desligado'||dias.some(d=>R.pres[d].itens&&R.pres[d].itens[f._id])).map(f=>{ const t={F:0,AT:0,FO:0,atraso:0,saida:0,he:0,ndAtr:0};
      dias.forEach(d=>{ const p=presDe(d,f); if(t[p.st]!=null) t[p.st]++; t.atraso+=+p.atraso||0; t.saida+=+p.saida||0; t.he+=+p.he||0; if(+p.atraso) t.ndAtr++; }); return {f,t}; }).sort((a,b)=>a.f.nome.localeCompare(b.f.nome,'pt-BR'));
    return `<section class="card"><div class="rh-fil" style="align-items:center"><input class="txt" type="month" id="rh-dmes" value="${esc(m)}" style="max-width:200px"><span class="sub" style="margin:0">${dias.length} dia(s) lançado(s) em ${mesLabel(m)}</span><button class="btn sec" data-act="rh-dcsv" style="margin-left:auto">Exportar (Excel/CSV)</button></div>
      ${linhas.length?`<div style="overflow-x:auto"><table class="rh-t"><thead><tr><th>Funcionário</th><th>Faltas</th><th>Atestados</th><th>Folgas</th><th>Atrasos</th><th>Saídas antecipadas</th><th>Horas extras</th></tr></thead><tbody>
        ${linhas.map(({f,t})=>`<tr><td><b>${esc(f.nome)}</b><small style="display:block;color:var(--muted)">${esc(f.setor||'')}</small></td><td class="num" style="${t.F?'color:var(--crit-ink);font-weight:800':''}">${t.F}</td><td class="num">${t.AT}</td><td class="num">${t.FO}</td><td class="num">${t.ndAtr?t.ndAtr+'× · '+hm(t.atraso):'—'}</td><td class="num">${hm(t.saida)}</td><td class="num">${t.he?String(Math.round(t.he*10)/10).replace('.',',')+' h':'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nada lançado neste mês.</div>'}</section>`; }

  /* ---------- controle de EPI: o que cada funcionário já recebeu da sua função ---------- */
  function epiDe(f){ const fc=R.funcoes.find(x=>norm(x.nome)===norm(f.funcao)); if(!fc) return null;
    const its=(fc.epis||[]).map(x=>({tipo:'EPI',nome:x.nome,ca:x.ca||''})).concat((fc.uniformes||[]).map(x=>({tipo:'Uniforme',nome:x.nome,ca:x.tam||''})));
    return its.map(it=>{ const rs=R.ret.filter(r=>r.funcId===f._id&&norm(r.item)===norm(it.nome)).sort((a,b)=>String(b.data).localeCompare(String(a.data))); return Object.assign({},it,{ult:rs[0]||null}); }); }
  function epiPend(){ let n=0, pes=0; R.func.filter(f=>f.status!=='Desligado').forEach(f=>{ const xs=epiDe(f); if(!xs) return; const k=xs.filter(x=>!x.ult).length; n+=k; if(k) pes++; }); return {n,pes}; }
  function vControleEpi(){ const F=R.cfil||(R.cfil={so:'pend',setor:''}); const atv=R.func.filter(f=>f.status!=='Desligado'&&(!F.setor||f.setor===F.setor)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const linhas=atv.map(f=>({f,xs:epiDe(f)})).filter(o=>F.so!=='pend'||!o.xs||o.xs.some(x=>!x.ult)); const pd=epiPend();
    return topo('Controle de EPI e uniforme','O que cada funcionário já recebeu da sua função, com a data da última entrega.',`<button class="btn" data-go="rhret">${P.ic('mais',18,2.4)}Registrar retirada</button>`)
      +`<div class="rh-cnt" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><b class="num" style="color:${pd.n?'var(--crit-ink)':'var(--ok-ink)'}">${pd.n}</b><span>itens nunca entregues</span></div><div><b class="num">${pd.pes}</b><span>pessoas com pendência</span></div><div><b class="num">${atv.length}</b><span>funcionários em atividade</span></div></div>
      <section class="card"><div class="rh-fil"><div class="seg">${[['pend','Só com pendência'],['todos','Todos']].map(([k,l])=>`<button data-act="rh-cfil" data-v="${k}" aria-pressed="${F.so===k}">${l}</button>`).join('')}</div>
        <select class="txt" data-rh-cset><option value="">Todos os setores</option>${opts(unicos('setor'),F.setor)}</select></div>
      ${linhas.length?linhas.map(({f,xs})=>`<div class="rh-epi"><div class="rh-epih"><b>${esc(f.nome)}</b><small>${esc(f.funcao||'sem função')} · ${esc(f.setor||'')}</small></div>
        ${!xs?`<div class="rh-epis"><span class="rh-chip warn">${f.funcao?'Função sem EPI cadastrado':'Funcionário sem função'} · <button class="lnk" data-go="${f.funcao?'rhfuncoes':'rhfunc'}">resolver</button></span></div>`
        :`<div class="rh-epis">${xs.map(x=>`<span class="rh-chip ${x.ult?'ok':'crit'}">${esc(x.nome)}${x.ca?' <small>('+esc(x.ca)+')</small>':''} · ${x.ult?br(x.ult.data):'<b>nunca recebeu</b> <button class="lnk" data-act="rh-epireg" data-f="'+f._id+'" data-t="'+x.tipo+'" data-i="'+esc(x.nome)+'" data-c="'+esc(x.ca)+'">Registrar</button>'}</span>`).join('')}</div>`}</div>`).join('')
        :`<div class="empty">${F.so==='pend'?'Ninguém com EPI pendente. Tudo entregue.':'Nenhum funcionário.'}</div>`}</section>`; }
  /* ---------- Painel do RH (tela inicial) ---------- */
  function vInicio(){ const cnt=s=>R.func.filter(x=>x.status===s).length, m=P.hojeStr().slice(0,7), retM=R.ret.filter(x=>x.mes===m), atv=R.func.filter(x=>x.status!=='Desligado');
    const comRet=new Set(retM.map(x=>x.funcId)), semRet=atv.filter(f=>!comRet.has(f._id)), pd=epiPend(), ta=tAvisos();
    const fSem=unicos('funcao').filter(n=>{ const fc=R.funcoes.find(x=>norm(x.nome)===norm(n)); return !fc||!((fc.epis||[]).length+(fc.uniformes||[]).length); }), semFunc=atv.filter(f=>!f.funcao);
    const av=[].concat(ta.map(o=>({c:o.s.c,t:'Contrato de terceirizado: '+o.x.nome,s:o.s.t+' ('+br(o.x.fim)+')',go:'rhterc'})),
      pd.n?[{c:'warn',t:pd.n+' EPI/uniforme nunca entregue(s)',s:pd.pes+' pessoa(s) com pendência',go:'rhepi'}]:[],
      fSem.length?[{c:'warn',t:'Função sem EPI cadastrado',s:fSem.slice(0,4).join(', ')+(fSem.length>4?'…':''),go:'rhfuncoes'}]:[],
      semFunc.length?[{c:'warn',t:semFunc.length+' funcionário(s) sem função',s:semFunc.slice(0,3).map(f=>f.nome).join(', '),go:'rhfunc'}]:[]);
    const hj=P.hojeStr(), rp=presResumo(hj), util=[1,2,3,4,5].includes(new Date(hj+'T12:00:00').getDay());
    if(util&&!rp.lancado&&new Date().getHours()>=9) av.unshift({c:'warn',t:'Lançar a presença de hoje',s:'A folha do dia ainda não foi lançada',go:'rhdia'});
    const atalho=(go,icn,t,sub)=>`<button class="rh-at" data-go="${go}">${P.ic(icn,26,2.2)}<b>${t}</b><span>${sub}</span></button>`;
    return topo('Painel do RH',P.hojeStr().split('-').reverse().join('/')+' · o que precisa de atenção hoje.')
      +`<div class="rh-cnt">${ST.map(st=>`<div><b class="num">${cnt(st)}</b><span>${st}</span></div>`).join('')}</div>
      <section class="card"><div class="label" style="margin-bottom:8px">AVISOS</div>${av.length?av.map(a=>`<div class="md-avi ${a.c==='crit'?'crit':'warn'}"><span class="pill ${a.c==='crit'?'crit':'warn'}">${a.c==='crit'?'Urgente':'Atenção'}</span><div><b>${esc(a.t)}</b><small>${esc(a.s)}</small></div><button class="lnk" data-go="${a.go}">Abrir</button></div>`).join(''):'<div class="empty">Nada pendente. Tudo em dia.</div>'}</section>
      <section class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><div class="label">PRESENÇA DE HOJE</div><button class="lnk" data-go="rhdia">${rp.lancado?'Ver folha do dia':'Lançar agora'}</button></div>
        <div class="rh-cnt" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:10px 0 0"><div><b class="num">${rp.c.P}</b><span>presentes</span></div><div><b class="num" style="color:${rp.c.F?'var(--crit-ink)':'inherit'}">${rp.c.F}</b><span>faltas</span></div><div><b class="num">${rp.c.AT}</b><span>atestados</span></div><div><b class="num">${rp.c.FO+rp.c.FE+rp.c.AF}</b><span>folga, férias, afastado</span></div></div></section>
      <div class="two" style="gap:14px;align-items:start"><section class="card"><div class="label">EPI E UNIFORME · ${mesLabel(m).toUpperCase()}</div>
        <div class="rh-cnt" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:10px 0"><div><b class="num">${retM.length}</b><span>retiradas no mês</span></div><div><b class="num">${comRet.size} de ${atv.length}</b><span>pessoas atendidas</span></div></div>
        ${semRet.length?`<div class="sub" style="margin:0">Sem retirada no mês: ${semRet.slice(0,6).map(f=>esc(f.nome)).join(', ')}${semRet.length>6?' e mais '+(semRet.length-6):''}</div>`:''}</section>
      <section class="card"><div class="label" style="margin-bottom:10px">ATALHOS</div><div class="rh-ats">${atalho('rhdia','check','Dia a dia','presença, faltas, horas')}${atalho('rhret','mais','Registrar retirada','EPI ou uniforme entregue')}${atalho('rhepi','check','Controle de EPI','quem já recebeu o quê')}${atalho('rhfichas','baixar','Fichas do mês','gerar, imprimir, escaneadas')}${atalho('rhfunc','equipe','Funcionários','cadastro e situação')}${atalho('rhterc','sino','Terceirizados','prazo dos contratos')}</div></section></div>`; }

  P.registrarModulo({ id:'rh', nome:'RH', ic:'equipe', telas:{
      rhinicio:{nome:'Painel do RH',mob:'Início',render:vInicio}, rhdia:{nome:'Dia a dia',mob:'Dia',render:vDia}, rhepi:{nome:'Controle de EPI',mob:'EPI',render:vControleEpi},
      rhfunc:{nome:'Funcionários',mob:'Funcionários',render:vFunc}, rhfichas:{nome:'Fichas de EPI e uniforme',mob:'Fichas',render:vFichas},
      rhret:{nome:'Retiradas',mob:'Retiradas',render:vRet}, rhfuncoes:{nome:'Funções (EPI e uniforme)',mob:'Funções',render:vFuncoes}, rhterc:{nome:'Terceirizados',mob:'Terceiros',render:()=>bannerTerc()+vTerc()} }, iniciar });
  P.registrarPerfil('rh',{ nome:'RH (funcionários, terceirizados, EPI e uniforme)', mods:['rh'], soVer:true, pos:2, desc:'Só o módulo RH: funcionários, terceirizados (prazo dos contratos), EPI e uniforme e as fichas. Não vê nem muda nada da fábrica.' });

  /* ---------- ações ---------- */
  const val=(sel)=>{ const o={}; document.querySelectorAll(sel).forEach(e=>{ const k=e.dataset.rhF||e.dataset.rhR||e.dataset.rhFf; o[k]=e.value; }); return o; };
  const lerItens=()=>{ const o={epis:[],uniformes:[]}; document.querySelectorAll('[data-rh-it]').forEach(e=>{ const k=e.dataset.rhIt, i=+e.dataset.i; o[k][i]=o[k][i]||{}; o[k][i][e.dataset.c]=e.value.trim(); }); ['epis','uniformes'].forEach(k=>o[k]=o[k].filter(x=>x&&x.nome)); return o; };
  const grava=async(path,d)=>P.db().doc(path).set(Object.assign(d,{alteradoEm:agora(),alteradoPor:P.S.uid||null,alteradoNome:eu()}),{merge:true});
  document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='rh-q'){ R.filtro.q=t.value; clearTimeout(R._t); R._t=setTimeout(()=>{ P.render(); const n=document.getElementById('rh-q'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } },250); } });
  document.addEventListener('change',async ev=>{ const t=ev.target;
    if(t.dataset&&t.dataset.rhFil){ R.filtro[t.dataset.rhFil]=t.value; P.render(); return; }
    if(t.dataset&&t.dataset.rhCset!=null){ (R.cfil=R.cfil||{so:'pend',setor:''}).setor=t.value; P.render(); return; }
    if(t.dataset&&(t.dataset.rhF==='status'||t.dataset.rhF==='tipo'||t.dataset.rhF==='empresaSel')&&R.f){ Object.assign(R.f,val('[data-rh-f]')); P.render(); return; }
    if(t.dataset&&(t.dataset.rhR==='funcId'||t.dataset.rhR==='tipo'||t.dataset.rhR==='item')&&R.fr){ Object.assign(R.fr,val('[data-rh-r]'));
      if(t.dataset.rhR==='item'){ const f=R.func.find(x=>x._id===R.fr.funcId), fc=f&&R.funcoes.find(x=>norm(x.nome)===norm(f.funcao)); const it=fc&&(R.fr.tipo==='Uniforme'?fc.uniformes:fc.epis||[]).find(x=>norm(x.nome)===norm(R.fr.item)); if(it) R.fr.ca=it.ca||it.tam||''; }
      P.render(); return; }
    if(t.id==='rh-mes'){ R.mes=t.value||R.mes; P.render(); return; }
    if(t.id==='rh-dia'&&t.value){ R.dia=t.value; P.render(); return; }
    if(t.id==='rh-dmes'&&t.value){ R.dia=t.value+'-01'; P.render(); return; }
    if(t.dataset&&t.dataset.rhP){ const k=t.dataset.rhP; presSet(R.dia,t.dataset.f,k,k==='obs'?t.value.trim().slice(0,200):Math.max(0,+String(t.value).replace(',','.')||0)); P.render(); return; }
    if(t.id==='rh-imp'&&t.files&&t.files[0]){ await importar(t.files[0]); t.value=''; } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rh-"],[data-act^="od-"]'); if(!b) return; const a=b.dataset.act;
    try{
      if(a==='rh-novo'){ R.f={status:'Ativo',tipo:'CLT'}; P.render(); return; }
      if(a==='rh-ed'){ R.f=Object.assign({},R.func.find(x=>x._id===b.dataset.id)); R.f.cpf=fCPF(R.f.cpf); P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fx'){ R.f=null; P.render(); return; }
      if(a==='rh-salvar'){ const v=Object.assign({},R.f,val('[data-rh-f]')); v.nome=String(v.nome||'').trim().replace(/\s+/g,' ').toUpperCase(); v.cpf=dig(v.cpf);
        if(v.nome.length<3) return P.toast('Escreva o nome completo.'); if(!cpfOk(v.cpf)) return P.toast('CPF inválido. Confira os números.');
        if(R.func.some(x=>x._id!==v._id&&dig(x.cpf)===v.cpf)) return P.toast('Já existe um funcionário com este CPF.');
        if(v.tipo==='PJ'){ const sel=v.empresaSel||(EMP_PJ.some(x=>x[0]===v.empresa)?v.empresa:'ZENITH'); if(sel==='OUTRA'){ v.empresa=String(v.empresaOutra||'').trim().toUpperCase(); if(v.empresa.length<2) return P.toast('Escreva o nome da empresa do PJ.'); } else v.empresa=sel; }
        else v.empresa='COLAFIX'; delete v.empresaSel; delete v.empresaOutra;
        if(v.status!=='Desligado') v.desligamento=''; const iD=v._id||id(); delete v._id; R.salv=true; P.render();
        try{ await grava(COL.func+'/'+iD,Object.assign(v,R.f._id?{}:{criadoEm:agora(),criadoPor:P.S.uid||null})); R.f=null; P.toast('Funcionário salvo.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-csv'){ const L=[['Nome','CPF','Função','Setor','Empresa','Vínculo','Admissão','Situação','Desligamento','Telefone','Camisa','Calça','Calçado']].concat(R.func.map(x=>[x.nome,fCPF(x.cpf),x.funcao,x.setor,x.empresa,x.tipo,br(x.admissao),x.status,br(x.desligamento),x.telefone,x.camisa,x.calca,x.calcado]));
        const csv='\ufeff'+L.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n'); const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const l=document.createElement('a'); l.href=u; l.download='funcionarios.csv'; l.click(); return; }
      if(a==='rh-fnovo'){ R.ff={nome:b.dataset.n||'',epis:[],uniformes:[]}; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-fed'){ R.ff=JSON.parse(JSON.stringify(R.funcoes.find(x=>x._id===b.dataset.id))); P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-ffx'){ R.ff=null; P.render(); return; }
      if(a==='rh-fsalvar'){ const nome=String((document.querySelector('[data-rh-ff="nome"]')||{}).value||'').trim(); if(nome.length<2) return P.toast('Escreva o nome da função.');
        if(R.funcoes.some(x=>x._id!==R.ff._id&&norm(x.nome)===norm(nome))) return P.toast('Essa função já existe.');
        const it=lerItens(); if(it.epis.length>9||it.uniformes.length>9) return P.toast('No máximo 9 itens de cada.'); const iD=R.ff._id||id();
        await grava(COL.funcoes+'/'+iD,{nome,epis:it.epis,uniformes:it.uniformes}); R.ff=null; P.toast('Função salva.'); P.render(); return; }
      if(a==='rh-fdel'){ if(!confirm('Apagar a função '+R.ff.nome+'?')) return; await P.db().doc(COL.funcoes+'/'+R.ff._id).delete(); R.ff=null; P.render(); return; }
      if(a==='rh-decl'){ await P.db().doc('rh/config').set({declUniforme:document.getElementById('rh-du').value.trim(),declEpi:document.getElementById('rh-de').value.trim(),alteradoEm:agora()},{merge:true}); P.toast('Textos salvos.'); return; }
      if(a==='rh-rnovo'){ R.fr={tipo:'EPI',qtd:'1',data:P.hojeStr(),responsavel:eu()}; P.render(); return; }
      if(a==='rh-rfx'){ R.fr=null; P.render(); return; }
      if(a==='rh-rsalvar'){ const v=Object.assign({},R.fr,val('[data-rh-r]')); const f=R.func.find(x=>x._id===v.funcId);
        if(!f) return P.toast('Escolha o funcionário.'); if(!String(v.item||'').trim()) return P.toast('Informe o item.'); if(!(+v.qtd>0)) return P.toast('Informe a quantidade.'); if(!v.data) return P.toast('Informe a data.');
        R.salv=true; P.render(); try{ await grava(COL.ret+'/'+id(),{funcId:f._id,funcionario:f.nome,cpf:f.cpf,mes:v.data.slice(0,7),tipo:v.tipo,item:v.item.trim(),ca:(v.ca||'').trim(),qtd:+v.qtd,data:v.data,responsavel:(v.responsavel||'').trim(),confirmacao:v.confirmacao||'',obs:(v.obs||'').trim(),em:agora(),por:P.S.uid||null});
          R.mes=v.data.slice(0,7); R.fr=null; P.toast('Retirada registrada.'); } finally{ R.salv=false; P.render(); } return; }
      if(a==='rh-rdel'){ const x=R.ret.find(y=>y._id===b.dataset.id); if(!x||!confirm('Apagar a retirada de '+x.item+' de '+x.funcionario+'?')) return; await P.db().doc(COL.ret+'/'+x._id).delete(); return; }
      if(a==='rh-tnovo'){ R.ft={status:'Ativo',aviso:30}; P.render(); window.scrollTo(0,0); return; }
      if(a==='rh-ted'){ R.ft=JSON.parse(JSON.stringify(R.terc.find(x=>x._id===b.dataset.id))); if(R.ft.cpf) R.ft.cpf=fCPF(R.ft.cpf); P.render(); window.scrollTo(0,0); return; }
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
      if(a==='od-con'){ b.disabled=true; try{ await window.OneDrive.conectar(); P.toast('OneDrive conectado.'); recarregaFichas(); }catch(e){ P.toast(e.message||'Não foi possível conectar ao OneDrive.'); } finally{ P.render(); } return; }
      if(a==='od-sair'){ window.OneDrive.sair(); P.toast('OneDrive desconectado neste aparelho.'); P.render(); return; }
      if(a==='od-salvar'){ if(!P.dono()) return; const v=k=>String((document.getElementById(k)||{}).value||'').trim(); const c={clientId:v('od-cli'),tenant:v('od-ten'),pasta:v('od-pas')||'Fichas EPI e Uniforme',link:v('od-lnk'),ativo:!!(document.getElementById('od-ati')||{}).checked};
        if(c.ativo&&!/^[0-9a-f-]{36}$/i.test(c.clientId)) return P.toast('Cole o ID do aplicativo (36 caracteres) para ligar o OneDrive.');
        await P.db().doc('config/geral').update({onedrive:c}); P.S.cfg.onedrive=c; P.toast('Configuração do OneDrive salva.'); P.render(); recarregaFichas(); return; }
      if(a==='rh-dver'){ R.diaVer=b.dataset.v; P.render(); return; }
      if(a==='rh-ddia'){ const d=new Date(R.dia+'T12:00:00'); d.setDate(d.getDate()+(+b.dataset.v)); R.dia=d.toISOString().slice(0,10); P.render(); return; }
      if(a==='rh-dhoje'){ R.dia=P.hojeStr(); P.render(); return; }
      if(a==='rh-pst'){ presSet(R.dia,b.dataset.f,'st',b.dataset.v); P.render(); return; }
      if(a==='rh-dcsv'){ const m=R.dia.slice(0,7), dias=Object.keys(R.pres).filter(d=>d.slice(0,7)===m&&R.pres[d].lancado).sort(); const L=[['Data','Funcionário','CPF','Setor','Situação','Atraso (min)','Saída antecipada (min)','Hora extra (h)','Observação']];
        dias.forEach(d=>R.func.forEach(f=>{ const it=R.pres[d].itens&&R.pres[d].itens[f._id]; if(!it&&f.status==='Desligado') return; const p=presDe(d,f); L.push([br(d),f.nome,fCPF(f.cpf),f.setor||'',pNome(p.st),+p.atraso||0,+p.saida||0,String(+p.he||0).replace('.',','),p.obs||'']); }));
        const csv='\ufeff'+L.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(';')).join('\r\n'); const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const l=document.createElement('a'); l.href=u; l.download='presenca-'+m+'.csv'; l.click(); return; }
      if(a==='rh-cfil'){ (R.cfil=R.cfil||{so:'pend',setor:''}).so=b.dataset.v; P.render(); return; }
      if(a==='rh-epireg'){ R.fr={funcId:b.dataset.f,tipo:b.dataset.t,item:b.dataset.i,ca:b.dataset.c,qtd:'1',data:P.hojeStr(),responsavel:eu()}; P.go('rhret'); window.scrollTo(0,0); return; }
      if(a==='rh-arq'){ b.disabled=true; await abrirArquivo(R.arqAbrir); return; }
      if(a==='rh-arqx'){ R.arqAbrir=null; P.render(); return; }
    }catch(e){ console.warn('[RH]',e); P.erro(e); } });
  function recarregaFichas(){ try{ if(frm) frm.contentWindow.location.reload(); }catch(e){} }
  /* importar a lista de funcionários uma vez (Excel ou CSV com cabeçalho: Nome, CPF, Função, Setor, Data de admissão, Empresa, Status, Tipo) */
  async function importar(file){ try{ let rows;
      if(/\.csv$/i.test(file.name)){ const t=await file.text(); const sep=t.split('\n')[0].includes(';')?';':','; rows=t.split(/\r?\n/).filter(Boolean).map(l=>l.split(sep).map(c=>c.replace(/^"|"$/g,'').trim())); }
      else { if(!window.XLSX) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); });
        const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}); const ws=wb.Sheets[wb.SheetNames.find(n=>/colab|funcion/i.test(n))||wb.SheetNames[0]]; rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,dateNF:'dd/mm/yyyy'}); }
      const hi=rows.findIndex(r=>r.some(c=>norm(c)==='NOME')&&r.some(c=>norm(c)==='CPF')); if(hi<0) return P.toast('Não achei as colunas Nome e CPF.');
      const H=rows[hi].map(norm), c=n=>H.findIndex(h=>h===norm(n)); const iN=c('Nome'),iC=c('CPF'),iF=c('Função'),iS=c('Setor'),iA=c('Data de admissão'),iE=c('Empresa'),iSt=c('Status'),iT=c('Tipo');
      const iso=v=>{ const m=String(v||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); return m?(m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):''; };
      let n=0,dup=0,inv=0; const ja=new Set(R.func.map(x=>dig(x.cpf)));
      for(const r of rows.slice(hi+1)){ const nome=String(r[iN]||'').trim(); if(!nome) continue; const cpf=dig(r[iC]); if(!cpfOk(cpf)){ inv++; continue; } if(ja.has(cpf)){ dup++; continue; } ja.add(cpf);
        const st=norm(r[iSt]); await grava(COL.func+'/'+id(),{nome:nome.toUpperCase(),cpf,funcao:iF>=0?String(r[iF]||'').trim():'',setor:iS>=0?String(r[iS]||'').trim():'',admissao:iA>=0?iso(r[iA]):'',empresa:empPadrao(norm(r[iT])==='PJ'?'PJ':'CLT',iE>=0?r[iE]:''),
          status:st==='ATIVO'||!st?'Ativo':/DESLIG|INATIV/.test(st)?'Desligado':/AFAST/.test(st)?'Afastado':/FERIAS/.test(st)?'Férias':'Ativo',tipo:norm(r[iT])==='PJ'?'PJ':'CLT',criadoEm:agora(),criadoPor:P.S.uid||null,origem:'importação'}); n++; }
      P.toast(n+' funcionário(s) importado(s)'+(dup?' · '+dup+' já existiam':'')+(inv?' · '+inv+' com CPF inválido (ignorados)':'')+'.'); }
    catch(e){ console.warn('[RH] importar',e); P.toast('Não consegui ler o arquivo.'); } }
  document.head.insertAdjacentHTML('beforeend',`<style>
  .rh-cnt{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.rh-cnt div{background:var(--surface);border-radius:12px;padding:10px 14px;box-shadow:var(--shadow)}.rh-cnt b{font-size:24px;display:block}.rh-cnt span{color:var(--muted);font-size:13px}
  .rh-fil{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.rh-fil .txt{height:40px;flex:0 1 auto;width:auto;max-width:none}.rh-fil #rh-q{flex:1 1 240px}
  .rh-t{width:100%;border-collapse:collapse;font-size:14px}.rh-t th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px;border-bottom:1px solid var(--line)}.rh-t td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  .rh-form{border:1.5px solid var(--teal)}.rh-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}.rh-g label{display:flex;flex-direction:column;gap:4px}
  .rh-epi{padding:10px 0;border-top:1px solid var(--line)}.rh-epi:first-of-type{border-top:0}.rh-epih b{margin-right:8px}.rh-epih small{color:var(--muted)}.rh-epis{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .rh-chip{border-radius:999px;padding:4px 10px;font-size:13px;border:1px solid var(--line);background:var(--surface-2)}.rh-chip.ok{border-color:var(--ok);background:var(--ok-tint)}.rh-chip.crit{border-color:var(--crit);background:var(--crit-tint);color:var(--crit-ink)}.rh-chip.warn{border-color:var(--warn);background:var(--warn-tint)}
  .rh-ats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.rh-at{font:inherit;text-align:left;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:4px;color:var(--teal-strong)}.rh-at b{color:var(--ink);font-size:15px}.rh-at span{color:var(--muted);font-size:12.5px}.rh-at:hover{border-color:var(--teal)}
  .rh-pst{display:flex;flex-wrap:wrap;gap:4px}.rh-pst button{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:5px 8px;cursor:pointer}
  .rh-pst button[aria-pressed="true"]{background:var(--teal-strong);border-color:var(--teal-strong);color:#fff}.rh-pt tr.st-F td{background:var(--crit-tint)}.rh-pt tr.st-AT td,.rh-pt tr.st-FO td,.rh-pt tr.st-FE td,.rh-pt tr.st-AF td{background:var(--warn-tint)}
  .rh-pn{max-width:90px}.rh-pt td{vertical-align:middle}
  .rh-it{display:flex;gap:8px;margin-bottom:6px}#rh-fr-slot{width:100%;height:calc(100vh - 220px);min-height:620px}.rh-frx{position:fixed;z-index:3;border:0;border-radius:12px;background:#fff;display:none}
  .od-cfg summary{cursor:pointer}.od-cfg[open] summary{margin-bottom:6px}
  @media (max-width:640px){ .rh-cnt{grid-template-columns:repeat(2,minmax(0,1fr))} }</style>`);
})();
