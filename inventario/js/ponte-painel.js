// ===== Ponte com o Painel Colafix =====
// O programa "Gestão de Almoxarifado" roda igual dentro do painel (módulo Inventário).
// Em vez da planilha do Google e do Apps Script, os dados vêm do banco do painel
// (conferencias, auditorias, recebimentos, alxfila e o cadastro de itens). Só a Conferência: sem Transferências.
// O login é o do painel: a pessoa entra direto, com o cargo que tem em Equipe e cargos.
(function(){
  var P=null; try{ P=(window.parent!==window&&window.parent.Painel&&window.parent.Painel.inv)||null; }catch(e){ P=null; }
  window.PAINEL_INV=P;
  if(!P){ document.addEventListener('DOMContentLoaded',function(){ document.body.innerHTML='<div style="font:16px system-ui,sans-serif;padding:40px;text-align:center;color:#333">Abra o Inventário pelo painel.</div>'; }); return; }
  document.write('<style>#loginScreen{display:none!important}</style>');

  var SUF={a3:'almox3',a30:'almox30',rej:'rejunte',sep:'separação',a1:'almox1',a2:'almox2'};
  var LBL={a3:'Almox 3',a30:'Almox 30',rej:'Rejunte',sep:'Separação',a1:'Almox 1',a2:'Almox 2'};
  var DE_SUF={}; Object.keys(SUF).forEach(function(k){ DE_SUF[SUF[k]]=k; });
  var LBL2ID={}; Object.keys(LBL).forEach(function(k){ LBL2ID[LBL[k]]=k; }); LBL2ID['Rejunte / Área Líquida']='rej';
  function suf(lbl){ return String(lbl||'').replace(/\s+/g,'').toLowerCase(); }
  // chave do programa (CONF-..._COD_almox3[_reconta_123]) → chave do painel (CONF-..._COD_a3[_reconta_123])
  function chavePainel(k){ var m=String(k||'').match(/^([^_]+)_(.+)_(almox30|almox3|rejunte|separação|almox1|almox2)(_reconta_\d+)?$/); if(!m) return String(k||'').replace(/\//g,'-'); return m[1]+'_'+m[2]+'_'+DE_SUF[m[3]]+(m[4]||''); }
  function chavePrograma(k){ var m=String(k||'').match(/^([^_]+)_(.+)_(a30|a3|rej|sep|a1|a2)(_reconta_\d+)?$/); if(!m) return String(k||''); return m[1]+'_'+m[2]+'_'+SUF[m[3]]+(m[4]||''); }
  function p2(n){ return (n<10?'0':'')+n; }
  function dataPt(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d)) return ''; return p2(d.getDate())+'/'+p2(d.getMonth()+1)+'/'+d.getFullYear(); }
  function horaPt(iso){ var d=new Date(iso); if(isNaN(d)) return ''; return p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds()); }
  function diaPt(dia){ var m=String(dia||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m?m[3]+'/'+m[2]+'/'+m[1]:''; }
  function clone(o){ return JSON.parse(JSON.stringify(o||{})); }

  // ---------- registros do painel no formato do programa ----------
  function confProg(c){ var x=clone(c); delete x._id; delete x.hist;
    if(!x.numero) x.numero=c._id;
    if(!x.dataHora){ x.data=x.data||dataPt(c.em)||diaPt(c.dia); x.hora=x.hora||horaPt(c.em); x.dataHora=x.data+' '+x.hora; }
    if(!x.data) x.data=String(x.dataHora).split(' ')[0];
    if(!x.nomeUsuario) x.nomeUsuario=c.porNome||P.nome(c.por)||'—';
    if(!x.usuario) x.usuario=x.nomeUsuario;
    return x; }
  function audProg(a){ var x=clone(a); delete x._id; delete x.hist;
    if(!x.almoxarifado&&x.loc) x.almoxarifado=LBL[x.loc]||x.loc;
    if(!x.auditKey) x.auditKey=chavePrograma(a._id);
    if(!x.dataHora) x.dataHora=dataPt(a.em)+' '+horaPt(a.em);
    if(!x.supervisor) x.supervisor=a.porNome||P.nome(a.por)||'—';
    var iv=x.investigacao; if(iv&&(iv.resolvidoPorNome||iv.resolvidoPor)) iv.resolvidoPor=iv.resolvidoPorNome||P.nome(iv.resolvidoPor)||'—';
    if(iv&&iv.resolvidoEm&&!iv.resolvidoDataHora) iv.resolvidoDataHora=dataPt(iv.resolvidoEm)+' '+horaPt(iv.resolvidoEm);
    return x; }
  function recProg(r){ var x=clone(r); delete x._id; delete x.hist;
    if(!x.id) x.id=r._id;
    if(!x.data) x.data=diaPt(r.dia)||dataPt(r.em);
    if(!x.dataHora) x.dataHora=x.data+' '+horaPt(r.em);
    if(!x.nomeUsuario) x.nomeUsuario=r.porNome||P.nome(r.por)||'—';
    if(x.observacao==null) x.observacao=r.obs||'';
    if(x.apontado) x.apontadoPor=r.apontadoPorNome||P.nome(r.apontadoPor)||'—';
    if(x.apontado&&!x.apontadoDataHora&&r.apontadoEm) x.apontadoDataHora=dataPt(r.apontadoEm)+' '+horaPt(r.apontadoEm);
    return x; }

  // ---------- "planilha" lida do banco do painel ----------
  function linhas(range){
    var aba=String(range).split('!')[0].trim().toUpperCase(); var D=P.dados(); var out=[];
    if(aba==='SALDO'){ var l=(D.base&&D.base.l)||{}; Object.keys(l).forEach(function(c){ var x=l[c]||{}; var nm=x.d||((D.itemDe(c)||{}).descricao)||''; if(nm) out.push([c,nm,String(Math.round(+x.a3||0)),String(Math.round(+x.a30||0))]); }); return out; }
    if(aba==='CAPACIDADE') return [];
    if(aba==='INVENTARIO_ITENS'){ D.itens.forEach(function(i){ var a=i.almox||{}, L=a.locais||[]; var f=function(k){ return L.indexOf(k)>=0?'TRUE':'FALSE'; };
        out.push([String(i.codigo),i.descricao||String(i.codigo),f('a3'),f('a30'),f('rej'),f('sep'),f('a1'),f('a2'),a.un||'',(+a.conv>1)?String(a.conv):'']); }); return out; }
    if(aba==='FILTROS_RAPIDOS'){ var gs=D.grupos.slice(); D.itens.forEach(function(i){ ((i.almox||{}).grupos||[]).forEach(function(g){ if(gs.indexOf(g)<0) gs.push(g); }); });
      out.push(['CODIGO','DESCRICAO'].concat(gs));
      D.itens.forEach(function(i){ var g=(i.almox||{}).grupos||[]; if(!g.length) return; out.push([String(i.codigo),i.descricao||''].concat(gs.map(function(x){ return g.indexOf(x)>=0?'TRUE':''; }))); }); return out; }
    if(aba==='CONFERENCIAS'){ D.conferencias.forEach(function(c){ if(c.excluida) return; out.push([c.numero||c._id,JSON.stringify(confProg(c))]); }); return out; }
    if(aba==='AUDITORIAS'){ D.auditorias.forEach(function(a){ if(a.excluida) return; var x=audProg(a); out.push([x.auditKey,JSON.stringify(x)]); }); return out; }
    if(aba==='AUDITORIAS_ABERTAS'){ D.fila.forEach(function(f){ if(f.estado==='aberta') out.push([chavePrograma(f._id),'{}']); }); return out; }
    if(aba==='RECEBIMENTOS'){ D.recebimentos.forEach(function(r){ out.push([r.id||r._id,JSON.stringify(recProg(r))]); }); return out; }
    return out; }

  var _fetch=window.fetch?window.fetch.bind(window):null;
  function resp(obj){ return new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}}); }
  window.fetch=function(url,opt){
    var u=String(url&&url.url?url.url:url);
    if(u.indexOf('sheets.googleapis.com')>=0){ var m=u.match(/\/values\/([^?]+)/); if(!m) return Promise.resolve(resp({sheets:[]}));
      try{ return Promise.resolve(resp({values:linhas(decodeURIComponent(m[1]))})); }catch(e){ console.error('[ponte] leitura',e); return Promise.reject(e); } }
    if(u.indexOf('script.google.com')>=0){
      if(!opt||String(opt.method||'GET').toUpperCase()!=='POST') return Promise.resolve(resp({registros:[]}));
      var b={}; try{ b=JSON.parse(opt.body||'{}'); }catch(e){}
      var dados=null; try{ dados=b.dados?JSON.parse(b.dados):null; }catch(e){ dados=null; }
      return P.gravar(b.acao,b.id,dados,b.dados||null).then(function(){ return resp({ok:true}); },function(e){ console.error('[ponte] gravar',b.acao,e); throw e; }); }
    return _fetch(url,opt); };
  window.PAINEL_CHAVE={painel:chavePainel,programa:chavePrograma};

  // ---------- perfil do programa a partir do cargo no painel ----------
  function montarPerfil(u){
    var f=u.flags||{}, L=f.locais||[];
    var base=u.perfil&&PERFIS[u.perfil]?Object.assign({},PERFIS[u.perfil]):null;
    var p=base||{label:f.auditar?'Supervisor Sistema':(f.verAud&&!f.contar?'Auditor':'Conferente'),abas:[],podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
      podeConferir:!!f.contar,podeTransferir:false,podeAudit:!!(f.verAud&&!f.contar&&!f.auditar),podeAdmin:false,verTabOp:false};
    if(!base){ if(f.contar||f.receber) p.abas.push('pg-conferencia'); if(f.auditar||f.verAud) p.abas.push('pg-divergencias');
      p.confFiltros=PERFIS.administrador.confFiltros; }
    if(!(p.podeAdmin||p.podeAudit||p.podeAprovar)) Object.assign(p,{confAlmox3:L.indexOf('a3')>=0,confAlmox30:L.indexOf('a30')>=0,confRejunte:L.indexOf('rej')>=0,confSeparacao:L.indexOf('sep')>=0,confAlmox1:L.indexOf('a1')>=0,confAlmox2:L.indexOf('a2')>=0});
    if(!p.podeAdmin&&!p.podeAprovar) p.podeReceberMaterial=!!f.receber;
    // no painel o programa é só a Conferência (Contagem · Recebimento · Auditoria): sem Transferências (pedido de 13/10)
    p.abas=(p.abas||[]).filter(function(a){ return a==='pg-conferencia'||a==='pg-divergencias'; }); p.verTabOp=false;
    return p; }

  var _ver=null;
  async function recarregar(tudo){
    var v=P.versao(); var mud=_ver?v.map(function(x,i){ return x!==_ver[i]; }):v.map(function(){ return true; }); _ver=v;
    if(tudo||mud[6]||mud[7]){ await carregarSheetsData(); await carregarInventarioItens(); }
    if(tudo||mud[0]) await carregarConferenciasSheets();
    if(tudo||mud[1]) await carregarAuditoriasSheets();
    if(tudo||mud[2]) await carregarRecebimentosSheets();
    if(tudo||mud[3]){ _auditoriasAbertasKeys.clear(); await carregarAuditoriasAbertasSheets();
      P.dados().fila.forEach(function(f){ if(f.estado==='descartada') _auditDescartados.add(chavePrograma(f._id)); });
      if(typeof renderDivHistorico==='function') renderDivHistorico(); }
  }

  async function entrar(){
    var u=null; for(var i=0;i<60;i++){ u=P.usuario(); if(u&&P.pronto()) break; await new Promise(function(r){ setTimeout(r,250); }); }
    if(!u){ document.body.innerHTML='<div style="font:16px system-ui,sans-serif;padding:40px;text-align:center;color:#333">Você não tem acesso ao Inventário. Fale com a responsável pelo PCP.</div>'; return; }
    PERFIS.painel=montarPerfil(u);
    _sessionToken=Math.random().toString(36).slice(2)+Date.now().toString(36);
    USUARIO_LOGADO={nome:u.nome,perfil:'painel',usuario:u.usuario,_tok:_sessionToken};
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appScreen').style.display='block';
    if(!u.solo){ var sair=document.querySelector('.topbar button[onclick^="logout"]'); if(sair) sair.style.display='none'; }
    aplicarPermissoes(); setStep(0);
    carregarAuditoriaLocal(); carregarRecebimentosLocal();
    if(typeof renderRecebimentos==='function') renderRecebimentos();
    var ov=document.getElementById('appLoading'); if(ov) ov.style.display='flex';
    try{ await recarregar(true); }catch(e){ console.error('[ponte] carregar',e); }
    if(typeof aplicarVisibilidadeNavGrupos==='function') aplicarVisibilidadeNavGrupos();
    if(ov) ov.style.display='none';
    // o que outra pessoa grava aparece aqui sozinho (sem esperar a atualização de 30 s)
    setInterval(function(){ var pd=P.pedido(); if(pd&&USUARIO_LOGADO){ try{ mudarGrupoNav('conferencia'); confMudarModo(pd); }catch(e){} }
      if(!USUARIO_LOGADO||IS_EDITING) return; recarregar(false).catch(function(e){ console.warn('[ponte]',e); }); },2500);
  }
  window.addEventListener('load',function(){
    // sair do programa = sair do painel (só para quem entra só no Inventário; dentro do painel o botão some)
    var _lo=logout; logout=function(forced){ var u=P.usuario(); if(!(u&&u.solo)) return;
      var pend=Object.keys(CONFERENCIAS).some(function(cod){ var c=CONFERENCIAS[cod]; return (+c.pal3||0)>0||(+c.sac3||0)>0||(+c.pal30||0)>0||(+c.sac30||0)>0||(+c.qtdRasgada||0)>0; });
      if(!forced&&pend&&!confirm('Você tem uma conferência em andamento que ainda não foi salva.\n\nSe sair agora, esses dados serão perdidos. Deseja realmente sair?')) return;
      P.sair(); };
    // "descartar" da fila de auditoria vale para todo mundo (no painel fica em alxfila)
    var _sd=_salvarDescartados, ja=new Set(Array.from(_auditDescartados));
    _salvarDescartados=function(){ _sd(); Array.from(_auditDescartados).forEach(function(k){ if(ja.has(k)) return; ja.add(k); P.gravar('descartarAuditoria',k,null).catch(function(){}); }); };
    entrar();
  });
})();
