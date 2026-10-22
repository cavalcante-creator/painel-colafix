/* Painel Colafix · 28-posto.js — "Posto da linha": computador no meio das linhas, com coletor (protótipo aprovado
   "Posto das Linhas 1 e 2 · protótipo", 21/10).
   Login próprio (cargo "posto", só o módulo tablet) que abre direto nesta tela. A pessoa passa o crachá e escolhe:
     1 Chamar a manutenção (tela de chamados aprovada: máquina → defeito → parou?)
     2 Apontar produção   (só bipando a folha: OP- ou RA-)
     3 Pedir material     (só bipando a folha; itens do rancho da ordem)
     4 A linha parou / voltou (motivos dos Ajustes + "Ainda não sei")
   Crachá de técnico vai direto para a lista de consertos (igual ao computador de chamados).
   Reaproveita S.tt (crachá pelo coletor, volta sozinha), vChamados e grava igual ao tablet e à Tela da linha.
   Linhas do posto: ?linhas= no endereço, ou "Linhas deste posto" (guardado no aparelho), ou Linha 1 e Linha 2.
   Para ver sem o login próprio (administradora): painel?totem=1&posto=1. */
"use strict";
registrarPerfil('posto',{nome:'Posto da linha (computador com coletor)',mods:['tablet'],pos:2,desc:'Computador no meio das linhas: com o crachá, chama a manutenção, aponta a produção e pede material pela folha, e registra parada da linha.'});
function poOn(){ try{ if(S.acs&&S.acs.doc&&S.acs.doc.perfil==='posto') return true; return /[?&#]posto=1/.test(location.search+'&'+location.hash)&&ttPodeUsar(); }catch(e){ return false; } }
{ const _el=eqLinkDe; eqLinkDe=function(c){ return c&&c.perfil==='posto'?eqLinkPainel()+'?totem=1':_el.apply(this,arguments); }; }
/* linhas deste posto */
function poLinhasSalvas(){ try{ const v=JSON.parse(localStorage.getItem('colafix.posto.linhas')||'null'); return Array.isArray(v)?v:null; }catch(e){ return null; } }
{ const _tl=ttLinhas; ttLinhas=function(){ if(!poOn()) return _tl.apply(this,arguments);
    const todas=linhasOrd(); if(/[?&#]linhas=/.test(location.search+'&'+location.hash)) return _tl.apply(this,arguments);
    const g=(poLinhasSalvas()||['Linha 1','Linha 2']).filter(l=>!todas.length||todas.includes(l)); return g.length?g:(todas.length?todas.slice(0,2):['Linha 1','Linha 2']); }; }

/* depois do crachá: menu (operador) ou lista de consertos (técnico) */
{ const _ti=ttInicia; ttInicia=function(p){ if(!poOn()) return _ti.apply(this,arguments); const T=S.tt;
    Object.assign(T,{p,outra:false,linha:'',equipId:'',equip:'',defeito:'',txt:'',msg:'',numero:null,enviando:false,fase:p.papel==='tecnico'?'potec':'pomenu',ult:Date.now(),po:{},ap:null,pm:null,hub:null}); ttCamDesliga(); render(); }; }
/* com o coletor, bipar de novo é de propósito: ao sair, o mesmo crachá pode entrar na hora (a trava de 8 s é para a câmera) */
{ const _tv=ttVoltar; ttVoltar=function(){ if(poOn()&&S.tt.p&&S.tt.p.codigo&&S.tt.recente) delete S.tt.recente[S.tt.p.codigo]; return _tv.apply(this,arguments); }; }
function poVai(f,extra){ const T=S.tt; T.fase=f; T.msg=''; T.ult=Date.now(); if(extra) Object.assign(T,extra); render(); }
/* chamado (protótipo 21/10): sem escolher máquina; só Elétrico/Mecânico e se a máquina parou completa, em parte ou não interferiu */
const PO_IMP=[['parou','Parou completa','crit'],['reduziu','Parou em parte (semi)','warn'],['nao','Não interferiu · continua funcionando','ok']];
const poImpTxt=v=>({parou:'parou completa',reduziu:'parou em parte',nao:'não interferiu'})[v]||v||'';
function poChamado(linha,imp){ const T=S.tt; T.ch={linha,tipo:'',imp:imp||''}; poVai('poch'); }
/* chamados com o técnico trabalhando, nas linhas do posto: o operador confere e libera */
function poEmAtend(){ const L=ttLinhas(); return cqAbertos().filter(c=>L.includes(c.linha)&&c.exec&&c.exec.tecnico).sort((a,b)=>String(a.criado).localeCompare(String(b.criado))); }
function poMenuAcao(n){ const T=S.tt, L=ttLinhas(); if(!T.p) return;
  if(n===1){ poChamado(L.includes(T.p.linha)?T.p.linha:L[0],''); return; }
  if(n===2||n===3){ T.po={acao:n===2?'ap':'pm'}; T.hub=null; poVai('pofolha'); return; }
  if(n===4){ T.po={parL:''}; poVai('popar'); } }

/* folha bipada: OP-<ordem> ou RA-<rancho> */
function poFolha(cod){ const T=S.tt, L=ttLinhas(); cod=String(cod||'').trim().toUpperCase(); let m, q=null;
  if((m=cod.match(/^OP-?(\d{3,})$/))) q={ordem:m[1]}; else if((m=cod.match(/^RA-?(\d{4,})$/))) q={rancho:m[1]};
  else { const k=typeof lerCodigo==='function'?lerCodigo(cod):null; if(k&&k.tipo==='ordem') q={ordem:k.num}; else if(k&&k.rancho) q={rancho:String(k.rancho)}; }
  if(!q){ ttMsg('Este código não é de uma folha de produção.'); return; }
  T.ult=Date.now(); const abertas=(S.ordens||[]).filter(o=>o.status==='aberta');
  const todas=abertas.filter(o=>q.ordem?String(o.num)===q.ordem:String(o.rancho||'')===q.rancho);
  if(!todas.length){ ttMsg(q.ordem?'Ordem '+q.ordem+' não encontrada no painel (ou já encerrada).':'Rancho '+q.rancho+' não encontrado no painel (ou já encerrado).'); return; }
  const aqui=todas.filter(o=>L.includes(o.linha));
  if(!aqui.length){ ttMsg((q.ordem?'Ordem '+q.ordem:'Rancho '+q.rancho)+' é da '+[...new Set(todas.map(o=>o.linha||'sem linha'))].join(' e ')+'. Bipe uma folha da '+L.join(' ou ')+'.'); return; }
  ttBip(); if(aqui.length>1){ T.po.cands=aqui.map(o=>o._id); T.po.rancho=q.rancho||''; poVai('poesc'); return; }
  poAbreOrdem(aqui[0]._id); }
function poAbreOrdem(id){ const T=S.tt; T.hub={oid:id,cands:[id],rancho:''};
  if(T.po.acao==='ap'){ T.ap={pal:0,av:''}; poVai('poap'); setTimeout(poFoco,60); }
  else { T.pm={cod:'',txt:'',qtd:'',urg:false,um:''}; poVai('popm'); } }

/* ---------- desenho ---------- */
function poCab(tit){ const T=S.tt, h=new Date(), e=cqEsc(); const logo=e?'icons/logo-colafix-escuro.png':((document.querySelector('.brand img')||{}).src||'');
  const quem=T.p?`<div class="cq-pe"><span>${esc(String(T.p.nome||'?')[0])}</span><div><b>${esc(T.p.nome)}</b><small>${T.p.papel==='tecnico'?'Técnico da manutenção':(T.p.semCracha?'sem crachá':'Operador'+(T.p.linha&&T.p.linha!=='*'?' · '+esc(T.p.linha):''))}</small></div></div>`:'';
  return `<header class="cq-cab"><img class="cq-logo" src="${esc(logo)}" alt="Colafix"><img class="cq-ass" src="icons/assinatura.png" alt="Assinatura da marca"><i class="cq-sep"></i><div class="cq-tt">${esc(tit)}</div><div class="cq-dir">${quem}<div class="cq-clk" data-rtv-clk>${pad(h.getHours())}:${pad(h.getMinutes())}</div></div></header>`; }
function poPagina(tit,corpo){ return `<div class="cq po${cqEsc()?' esc':''}">${poCab(tit)}<main class="cq-main">${corpo}</main></div>`; }
const poMsg=()=>S.tt.msg?`<div class="cq-msg" role="alert">${esc(S.tt.msg)}</div>`:'';
function poRod(txt,act,lab){ return `<div class="cq-rod"><span>${txt}</span><button class="cq-sec" data-act="${act||'po-volta'}">${lab||'Voltar (Esc)'}</button></div>`; }
function poParAberta(l){ return (S.paradas||[]).find(p=>p.linha===l&&!p.fim&&!p.anulada)||null; }
function poEstLinha(l){ const par=poParAberta(l);
  const exe=cqAbertos().filter(c=>c.linha===l&&c.exec&&c.exec.tecnico)[0];
  if(exe){ const ini=exe.exec.inicio?String(exe.exec.inicio).slice(11,16):'';
    return {c:'arr',t:'Sendo arrumada · '+tecNomes(exe)+(ini?' desde '+ini:''),s:par?('Parada desde '+hora(par.inicio)+' · '+(par.motivo==='A definir'?'motivo a definir':par.motivo)+' · há '+ltvMin(Date.now()-new Date(par.inicio))):'Chamado '+manNum(exe.numero)+(exe.equip?' · '+exe.equip:'')+' · linha não parada',ch:par?'Chamado '+manNum(exe.numero)+' em atendimento':''}; }
  if(par) return {c:'crit',t:'Parada desde '+hora(par.inicio)+' · '+(par.motivo==='A definir'?'motivo a definir':par.motivo),s:'há '+ltvMin(Date.now()-new Date(par.inicio))+(par.porNome?' · '+par.porNome:'')};
  const ab=cqAbertos().filter(c=>c.linha===l).sort((a,b)=>String(a.criado).localeCompare(String(b.criado)))[0];
  const chTxt=ab?('Chamado '+manNum(ab.numero)+' aberto às '+hm(ab.criado||ab.quando)+' · '+(ab.exec&&ab.exec.tecnico?'em atendimento com '+tecNomes(ab):'aguardando manutenção')):'';
  const o=ordemRodando(l); if(o){ ttEntDaOrdem(o._id); return {c:ab&&ab.impacto==='parou'&&!(ab.exec&&ab.exec.tecnico)?'crit':'ok',t:'Produzindo · ordem '+o.num,s:String(o.produto||'').replace(/^\S+\s+-\s+/,'')+' · '+fQ(entregueDe(o))+' de '+fQ(+o.total||0)+' '+ttUn(o),ch:chTxt}; }
  return {c:ab?(ab.impacto==='parou'&&!(ab.exec&&ab.exec.tecnico)?'crit':'warn'):'ok',t:'Sem ordem programada agora',s:ab?'':'nenhum chamado aberto',ch:chTxt}; }
function poOrdCab(o,folha){ return `<section class="po-ord"><div><small>${folha?'FOLHA BIPADA ✓ · ':''}ORDEM ${esc(o.num)} · ${esc((o.linha||'').toUpperCase())}${o.rancho?' · RANCHO '+esc(o.rancho):''}</small><b>${esc(o.produto||'')}</b></div>${ttProg(o).replace('class="tt-prog"','class="tt-prog po-prog"')}</section>`; }
function vPosto(){ const T=S.tt, L=ttLinhas(), f=T.fase;
  if(f==='sem') return poPagina('Posto · '+L.join(' e '),`<section class="cq-cta po-sem"><div><h1>Sem crachá</h1><p>Escreva seu nome para o que você fizer sair no seu nome.</p>
      <label class="po-lb" for="tt-nome">Seu nome</label><input id="tt-nome" class="po-in po-tx" maxlength="60" autocomplete="off" value="${esc(T.txtNome||'')}">${poMsg()}</div></section>
      <div class="cq-rod"><span>Enter continua · Esc volta</span><div class="po-rbs"><button class="cq-bt pri po-ok" data-act="tt-sem-ok"><b>Continuar (Enter)</b></button><button class="cq-sec" data-act="po-sai">Voltar (Esc)</button></div></div>`);
  if(f==='espera'||!T.p){ const cfg=T.po&&T.po.cfgL;
    return poPagina('Posto · '+L.join(' e '),`<div class="cq-lns">${L.map(l=>{ const e=poEstLinha(l); return `<section class="cq-ln ${e.c}${e.c==='crit'?' cq-pisca':''}"><div><h2>${esc(l)}</h2><i></i></div><b>${esc(e.t)}</b><span>${esc(e.s)}</span>${e.ch?`<em class="po-lch">${esc(e.ch)}</em>`:''}</section>`; }).join('')}</div>
      <section class="cq-cta"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="12" width="32" height="22" rx="3"/><path d="M14 18v10M18 18v10M22 18v10M27 18v10M31 18v10M35 18v10M4 40h40"/></svg><div><h1>Passe seu crachá no leitor</h1><p>Operador: chamar a manutenção, apontar, pedir material ou registrar parada. Técnico da manutenção: começar o atendimento de um chamado.</p>${poMsg()}</div></section>
      ${cfg?`<section class="po-cfg"><b>Linhas deste posto</b><div>${linhasOrd().map(l=>`<label class="ck"><input type="checkbox" data-po-lt="${esc(l)}" ${L.includes(l)?'checked':''}> ${esc(l)}</label>`).join('')}</div><span>Fica guardado neste computador.</span></section>`:''}
      <div class="cq-tema">${ttSemCrachaOk()?'<button class="cq-sec" data-act="tt-sem">Estou sem crachá</button>':''}${ttCam.stream?`<button class="cq-sec" data-act="po-cam">${poCamOff()?'Mostrar câmera':'Esconder câmera'}</button>`:''}<button class="cq-sec" data-act="po-cfgl">${cfg?'Fechar':'Linhas deste posto'}</button><button class="cq-sec" data-act="cq-tema">${cqEsc()?'Tela clara':'Tela escura'}</button><button class="cq-sec" data-act="cq-cheia">${document.fullscreenElement?'Sair da tela cheia':'Tela cheia'}</button><button class="cq-sec" data-act="po-sair">Sair</button></div>`); }
  if(f==='pomenu'){ const nome=String(T.p.nome||'').split(/\s+/)[0]; const par=L.map(poParAberta).filter(Boolean)[0];
    const bt=(n,cls,t,s)=>`<button class="po-op ${cls}" data-act="po-op" data-n="${n}"><span class="po-k">${n}</span><div><b>${t}</b><small>${s}</small></div></button>`;
    return poPagina('Posto · '+L.join(' e '),`<h1 class="cq-h">Olá, ${esc(nome)}. O que você quer fazer?</h1><div class="po-menu">
      ${bt(1,'crit','Chamar a manutenção','abrir chamado · elétrico ou mecânico')}${bt(2,'ok','Apontar produção','quantos saíram · bipa a folha da ordem')}
      ${bt(3,'pri','Pedir material','para o almoxarifado · bipa a folha da ordem')}${bt(4,'warn','A linha parou / voltou',poEmAtend().length?'liberar a máquina depois do conserto · '+poEmAtend().length+' sendo arrumada'+(poEmAtend().length>1?'s':''):par?esc(par.linha)+' está parada há '+ltvMin(Date.now()-new Date(par.inicio)):'registrar parada da linha')}</div>
      ${poMsg()}${poRod('Aperte o número no teclado ou clique. Sem uso por 1 minuto, a tela volta ao início.','po-sai','Sair (Esc)')}`); }
  if(f==='pofolha'){ const ap=T.po.acao==='ap';
    return poPagina(ap?'Apontar produção':'Pedir material',`<ol class="cq-et" aria-label="Etapas"><li class="on"><span>✓</span>Crachá</li><li class="on at"><span>2</span>Folha da ordem</li><li><span>3</span>${ap?'Quantidade':'Material'}</li></ol>
      <section class="cq-cta"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="4" width="28" height="40" rx="2"/><path d="M15 12h18M15 18v8M18 18v8M21 18v8M25 18v8M28 18v8M32 18v8M15 32h18M15 37h12"/></svg><div><h1>Bipe o código de barras da folha</h1><p>Fica no alto da folha de produção, ao lado do QR (começa com OP- ou RA-). Só vale ordem da ${esc(L.join(' ou '))}.</p>${poMsg()}</div></section>
      <div class="cq-rod"><span>Sem a folha não dá para ${ap?'apontar':'pedir material'}. Folha não bipa ou deu erro? Avise o PCP.</span><div class="po-rbs"><button class="cq-bt crit po-pcp" data-act="po-pcp" ${T.enviando?'disabled':''}><b>Deu erro? Avisar o PCP</b></button><button class="cq-sec" data-act="po-volta">Voltar (Esc)</button></div></div>`); }
  if(f==='poesc'){ const cs=(T.po.cands||[]).map(ordById).filter(Boolean);
    return poPagina(T.po.acao==='ap'?'Apontar produção':'Pedir material',`<h1 class="cq-h">Qual ordem? <small>· o rancho ${esc(T.po.rancho||'')} tem mais de uma</small></h1><div class="cq-g">${cs.map(o=>`<button class="cq-bt" data-act="po-ord" data-id="${esc(o._id)}"><b>Ordem ${esc(o.num)} · ${esc(o.linha)}</b><span>${esc(o.produto||'')}</span></button>`).join('')}</div>${poMsg()}${poRod('Escolha a ordem que você está produzindo.')}`); }
  if(f==='poap'){ const o=ttOrd(); if(!o){ T.fase='pofolha'; return vPosto(); }
    const A=T.ap; if(A.pp==null) A.pp=String(ttPP(o)||96); const pp=+A.pp||0, un=ttUn(o), tot=A.pal*pp+(+A.av||0), falta=Math.max(0,(+o.total||0)-entregueDe(o)), pronto=!!S._entOrd[o._id];
    const pode=pronto&&tot>0&&!T.enviando, pend=apPendDe(o._id);
    return poPagina('Apontar produção',`${poOrdCab(o,true)}${otFaixa(o)}<h1 class="cq-h">Quanto saiu agora?</h1>
      <div class="po-q2"><section class="po-box"><div class="po-pph"><span class="po-lb">Paletes</span><label class="po-ppl" for="po-pp">${esc(un)} por palete</label><input id="po-pp" class="po-in po-pp" inputmode="numeric" autocomplete="off" maxlength="4" value="${esc(A.pp)}"><small>padrão ${fQ(ttPP(o)||96)} · pode mudar</small></div><div class="po-pal"><button data-act="po-pal" data-v="-1" aria-label="Menos um palete" ${A.pal?'':'disabled'}>−</button><b>${A.pal}</b><button data-act="po-pal" data-v="1" aria-label="Mais um palete">+</button></div><small class="po-dica">Teclado: setas ↑ e ↓</small></section>
        <section class="po-box"><label class="po-lb" for="po-av">Avulsos (${esc(un)})</label><input id="po-av" class="po-in" inputmode="numeric" autocomplete="off" maxlength="6" value="${esc(A.av||'')}" placeholder="0"><small class="po-dica">Digite o número</small></section></div>
      ${poMsg()}<div class="cq-rod"><button class="cq-sec" data-act="po-volta">Voltar (Esc)</button>
        <div class="po-tot ${tot>falta?'warn':''}">Total: <b>${fQ(tot)} ${esc(un)}</b>${pp&&tot?`<small>${A.pal} palete${A.pal===1?'':'s'} × ${fQ(pp)} + ${fQ(+A.av||0)} avulsos</small>`:''}${!pronto?'<small>Carregando o que já foi apontado…</small>':tot>falta?`<small>Passa do total da ordem em ${fQ(tot-falta)} ${esc(un)} (reprocesso?). O PCP confere antes de entrar na programação.</small>`:''}${pend?`<small>Aguardando o PCP conferir: ${fQ(pend)} ${esc(un)}</small>`:''}</div>
        <button class="cq-bt ok po-ok" data-act="po-ap-ok" ${pode?'':'disabled'}><b>${T.enviando?'Enviando…':'Apontar '+fQ(tot)+' '+esc(un)+' (Enter)'}</b></button></div>`); }
  if(f==='popm'){ const o=ttOrd(); if(!o){ T.fase='pofolha'; return vPosto(); }
    const M=T.pm, rc=o.rancho&&ranchoDe(o.rancho), its=((rc&&rc.itens)||[]).filter(x=>dbVisivel(x)), pend=(S.pedmat||[]).filter(p=>p.ordem===o._id);
    const pode=M.cod&&+M.qtd>0&&!T.enviando&&(M.cod!=='__outro'||String(M.txt||'').trim().length>1);
    return poPagina('Pedir material',`${poOrdCab(o,true).replace(/<div class="tt-prog[\s\S]*<\/section>$/,pend.length?`<div class="po-pend">Já pedido nesta ordem: ${pend.map(p=>esc(p.item)+' ('+fQ(p.qtd)+' '+esc(p.um||'')+', há '+pmIdade(p.em)+')').join(' · ')}</div></section>`:'</section>')}
      <h1 class="cq-h">Qual material? <small>· ${its.length?'itens do rancho desta ordem':'esta ordem não tem rancho anexado'}</small></h1>
      <div class="po-its">${its.map(x=>`<button data-act="po-pmi" data-c="${esc(x.c)}" aria-pressed="${M.cod===x.c}"><b>${esc(x.d||x.c)}</b><span>${esc(x.c)}${x.um?' · '+esc(x.um):''}</span></button>`).join('')}<button class="outro" data-act="po-pmi" data-c="__outro" aria-pressed="${M.cod==='__outro'}"><b>Outro</b><span>escrever qual</span></button></div>
      ${M.cod?`<div class="po-q2">${M.cod==='__outro'?`<section class="po-box"><label class="po-lb" for="po-pmt">Qual material?</label><input id="po-pmt" class="po-in po-tx" maxlength="80" autocomplete="off" value="${esc(M.txt||'')}"></section>`:''}
        <section class="po-box"><label class="po-lb" for="po-pmq">Quantidade${M.um?' ('+esc(M.um)+')':''}</label><input id="po-pmq" class="po-in" inputmode="numeric" autocomplete="off" maxlength="6" value="${esc(M.qtd||'')}" placeholder="0"></section>
        <label class="po-urg ${M.urg?'on':''}"><input type="checkbox" id="po-urg" ${M.urg?'checked':''}> Urgente: a linha vai parar sem esse material</label></div>`:''}
      ${poMsg()}<div class="cq-rod"><button class="cq-sec" data-act="po-volta">Voltar (Esc)</button><button class="cq-bt pri po-ok" data-act="po-pm-ok" ${pode?'':'disabled'}><b>${T.enviando?'Enviando…':'Pedir ao almoxarifado (Enter)'}</b></button></div>`); }
  if(f==='popar'){ const sel=T.po.parL;
    return poPagina('A linha parou / voltou',`<div class="po-par"><div class="po-pls">${L.map(l=>{ const p=poParAberta(l), o=ordemRodando(l), ea=poEmAtend().find(c=>c.linha===l);
        if(ea) return `<section class="po-pl arr"><div><h2>${esc(l)}</h2><em>● sendo arrumada</em></div><span>Chamado ${manNum(ea.numero)} · ${esc(tecNomes(ea))}${ea.exec.inicio?' desde '+esc(String(ea.exec.inicio).slice(11,16)):''}${p?' · parada desde '+hora(p.inicio):''}</span><button class="cq-bt ok" data-act="po-lib" data-n="${ea.numero}" ${T.enviando?'disabled':''}><b>A máquina voltou · liberar</b></button><small>Confira a máquina antes. Fecha o chamado${p?' e a parada':''}. <button class="po-lk" data-act="po-aind" data-n="${ea.numero}">Ainda com problema</button></small></section>`;
        return p?`<section class="po-pl crit"><div><h2>${esc(l)}</h2><em>● parada há ${ltvMin(Date.now()-new Date(p.inicio))}</em></div><span>Desde ${hora(p.inicio)} · ${esc(p.motivo==='A definir'?'motivo a definir':p.motivo)}${p.porNome?' · '+esc(p.porNome):''}</span><button class="cq-bt ok" data-act="po-voltou" data-id="${esc(p._id)}" ${T.enviando?'disabled':''}><b>A ${esc(l)} voltou a produzir</b></button><small>Um clique fecha a parada com a hora de agora</small></section>`
          :`<section class="po-pl ${sel===l?'sel':''}"><div><h2>${esc(l)}${T.p&&T.p.linha===l?' <small class="po-sua">· sua linha</small>':''}</h2><em class="ok">● produzindo</em></div><span>${o?'Ordem '+esc(o.num)+' · '+esc(String(o.produto||'').replace(/^\S+\s+-\s+/,'')):'sem ordem programada agora'}</span><button class="cq-bt crit" data-act="po-parou" data-l="${esc(l)}"><b>A ${esc(l)} parou</b></button>${sel===l?'<small>Escolha o motivo ao lado →</small>':''}</section>`; }).join('')}</div>
      <section class="po-mots">${sel?`<h1 class="cq-h">Por que a ${esc(sel)} parou?</h1><div class="po-mg">${(S.cfg.motivos||[]).map(m=>`<button class="cq-bt" data-act="po-mot" data-v="${esc(m)}" ${T.enviando?'disabled':''}><b>${esc(m)}</b>${/manuten/i.test(m)?'<span>abre o chamado →</span>':''}</button>`).join('')}<button class="cq-bt po-ad" data-act="po-mot" data-v="A definir" ${T.enviando?'disabled':''}><b>Ainda não sei</b></button></div>`
        :`<div class="cq-vz">Toque em “parou” na linha que parou, ou em “voltou” na que voltou a produzir.</div>`}</section></div>
      ${poMsg()}${poRod('Motivos dos Ajustes. “Manutenção” leva direto para abrir o chamado.')}`); }
  if(f==='poch'){ const C=T.ch, pode=C.tipo&&C.imp&&!T.enviando;
    return poPagina('Chamar a manutenção',`<div class="po-chh"><h1 class="cq-h">Abrir chamado da <em>${esc(C.linha)}</em></h1>${L.length>1?`<div class="po-seg" role="group" aria-label="Linha">${L.map(l=>`<button data-act="po-chl" data-l="${esc(l)}" aria-pressed="${C.linha===l}">${esc(l)}</button>`).join('')}</div>`:''}</div>
      <div class="po-ch2"><section class="po-chq"><h2>1 · O problema é…</h2><div class="po-chb">${[['Elétrico','Elétrico'],['Mecânico','Mecânico']].map(([v,t])=>`<button data-act="po-tipo" data-v="${v}" aria-pressed="${C.tipo===v}">${t}</button>`).join('')}</div></section>
        <section class="po-chq"><h2>2 · A máquina…</h2><div class="po-chb">${PO_IMP.map(([v,t,k])=>`<button class="${k}" data-act="po-imp" data-v="${v}" aria-pressed="${C.imp===v}">${t}</button>`).join('')}</div></section></div>
      ${poMsg()}<div class="cq-rod"><span>${C.imp==='parou'&&!C.tipo?'Vindo de “A linha parou”, “Parou completa” já vem marcado. ':''}Depois de abrir, o posto volta para a tela inicial.</span><div class="po-rbs"><button class="cq-bt crit po-ok" data-act="po-ch-ok" ${pode?'':'disabled'}><b>${T.enviando?'Abrindo…':'Abrir chamado (Enter)'}</b></button><button class="cq-sec" data-act="po-volta">Voltar (Esc)</button></div></div>`); }
  if(f==='potec'){ const xs=cqAbertos().filter(c=>!c.liberadoEm).sort((a,b)=>{ const p=c=>c.exec&&c.exec.tecnico?2:c.impacto==='parou'?0:1; return p(a)-p(b)||String(a.criado||'').localeCompare(String(b.criado||'')); });
    return poPagina('Chamados da manutenção',`<h1 class="cq-h">${xs.length?'Qual chamado você vai atender?':'Nenhum chamado aberto'}</h1>
      <div class="po-tecs">${xs.map(c=>{ const com=c.exec&&c.exec.tecnico, meu=com&&tecEh(c,T.p.nome), junto=com&&!meu&&!(c.exec.ajudante&&c.exec.ajudante.nome), k=com?'info':c.impacto==='parou'?'crit':'warn';
        return `<section class="po-tec ${k}"><div class="po-tech"><h2>${esc(c.linha||'')}</h2><em>● ${com?'em atendimento'+(c.exec.inicio?' desde '+esc(String(c.exec.inicio).slice(11,16)):''):'aguardando há '+ltvMin(Date.now()-new Date(c.criado||Date.now()))}</em></div>
          <small>CHAMADO ${manNum(c.numero)}${meu?' · COM VOCÊ':com?' · COM '+esc(String(tecNomes(c)).toUpperCase()):''}</small><b>${esc(c.defeito||'')}${c.impacto?' · '+esc(poImpTxt(c.impacto)):''}</b><span>Aberto às ${hm(c.criado||c.quando)}${c.nome?' por '+esc(c.nome):''}</span>
          ${com?`${junto?`<button class="cq-bt pri" data-act="cq-junto" data-n="${c.numero}" ${T.enviando?'disabled':''}><b>Entrar junto (2º técnico)</b></button><small>Grava você como segundo técnico neste chamado</small>`:''}<div class="po-tecok">Em atendimento · nada a marcar aqui</div><small>Quando a máquina voltar, o operador fecha o chamado e libera a máquina</small>`:`<button class="cq-bt pri" data-act="cq-comecar" data-n="${c.numero}" ${T.enviando?'disabled':''}><b>Começar atendimento</b></button><small>Grava você e a hora de início</small>`}</section>`; }).join('')||'<div class="cq-vz">Tudo funcionando.</div>'}</div>
      ${poMsg()}${poRod('O técnico bipa o crachá aqui, como todo mundo. Esta tela volta sozinha para o início, liberando o posto para as duas linhas.','po-sai','Sair (Esc)')}`); }
  if(f==='pook') return poPagina('Posto · '+L.join(' e '),`<section class="cq-fim"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg><h1>${esc(T.okTit||'')}</h1><p>${esc(T.okTxt||'')}</p><p class="cq-p2">Esta tela volta para o início sozinha.</p></section>
      <div class="cq-rod"><button class="cq-sec" data-act="po-outra">Fazer outra coisa (mesmo crachá)</button><button class="cq-bt pri po-ok" data-act="po-fim"><b>Pronto (Enter)</b></button></div>`);
  /* chamado e técnico: a tela de chamados aprovada, com o título do posto */
  const h=vChamados(); if(h) return h.replace('<div class="cq-tt">Chamados da manutenção</div>','<div class="cq-tt">'+(T.p&&T.p.papel==='tecnico'?'Manutenção · consertos':'Chamar a manutenção')+'</div>').replace('<small>Gestor','<small>Operador');
  return null; }
{ const _vt=vTotem; vTotem=function(){ if(poOn()){ S.tt.ocioso=60000; const h=vPosto(); if(h) return h; } return _vt.apply(this,arguments); }; }
/* câmera: no posto fica no canto esquerdo (não tapa os botões) e pode sumir da tela — continua lendo o QR escondida */
function poCamOff(){ try{ return localStorage.getItem('colafix.posto.cam')==='0'; }catch(e){ return false; } }
function poFoco(){ if(!ttAtivo()||!poOn()) return; const f=S.tt.fase, id=f==='sem'?'tt-nome':f==='poap'?'po-av':f==='popm'?(S.tt.pm&&S.tt.pm.cod==='__outro'&&!String(S.tt.pm.txt||'').trim()?'po-pmt':'po-pmq'):''; const i=id&&document.getElementById(id);
  if(i&&document.activeElement!==i){ i.focus(); try{ const n=i.value.length; i.setSelectionRange(n,n); }catch(e){} } }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ const on=ttAtivo()&&poOn(); document.body.classList.toggle('po-on',on); document.body.classList.toggle('po-camoff',on&&poCamOff()); if(on) setTimeout(poFoco,0); }catch(e){} return x; }; }

/* ---------- leitura pelo coletor ---------- */
{ const _cb=cbLeu; cbLeu=function(cod){ const c=String(cod||'').toUpperCase();
    if(S.view==='mantotem'&&poOn()&&/^(OP-?\d{3,}|RA-?\d{4,})$/.test(c)){ const T=S.tt; T.ult=Date.now();
      if(T.fase==='pofolha'){ poFolha(c); return; }
      if(T.fase==='espera'){ ttMsg('Primeiro passe o seu crachá.'); return; }
      toast('Para usar a folha, escolha Apontar ou Pedir material no menu.'); return; }
    return _cb.apply(this,arguments); }; }
/* QR da folha pela câmera (se o computador tiver) também serve */
{ const _tl=ttLeu; ttLeu=function(txt){ if(poOn()&&S.tt.fase==='pofolha'){ poFolha(txt); return; } return _tl.apply(this,arguments); }; }

/* ---------- gravações ---------- */
async function poApontar(){ const T=S.tt, o=ttOrd(); if(!o||!T.p||T.enviando) return; const pp=+T.ap.pp||0, tot=T.ap.pal*pp+(+T.ap.av||0), falta=Math.max(0,(+o.total||0)-entregueDe(o));
  if(!(tot>0)||!S._entOrd[o._id]) return;
  /* não entra direto na programação: vai para a conferência do PCP (apontpend); o PCP confirma e aí vira apontamento (entregas) */
  T.enviando=true; render(); const d={ordem:o._id,num:o.num,linha:o.linha,produto:o.produto||'',em:new Date().toISOString(),por:S.uid||null,qtd:Math.round(tot*1000)/1000,origem:'posto',operador:T.p.nome,cracha:T.p.codigo||null,status:'pendente',passa:tot>falta?Math.round((tot-falta)*1000)/1000:0};
  if(T.ap.pal&&pp){ d.pal=T.ap.pal; d.porPal=pp; } if(+T.ap.av) d.avulso=+T.ap.av;
  let ok=false; try{ const r=await S.db.collection('apontpend').add(d); ok=true; S.apPend=[Object.assign({_id:r&&r.id},d)].concat(S.apPend||[]); }catch(e){ console.warn('[posto] apontar',e); } T.enviando=false;
  if(!ok){ T.msg='Não foi possível salvar. Confira a internet e tente de novo.'; render(); return; }
  const un=ttUn(o); SOMpo('ok');
  poVai('pook',{okTit:'Apontado: +'+fQ(tot)+' '+un,okTxt:'Ordem '+o.num+' · '+o.linha+' · enviado para o PCP conferir'+(d.passa?' (passa do total em '+fQ(d.passa)+')':'')+' · no nome de '+T.p.nome}); }
async function poPedir(){ const T=S.tt, o=ttOrd(), M=T.pm; if(!o||!T.p||!M||T.enviando) return; const rc=o.rancho&&ranchoDe(o.rancho), it=M.cod!=='__outro'&&((rc&&rc.itens)||[]).find(x=>x.c===M.cod);
  const item=it?(it.c+' '+(it.d||'')).trim():String(M.txt||'').trim(); if(item.length<2){ T.msg='Escreva qual material.'; render(); return; } if(!(+M.qtd>0)) return;
  T.enviando=true; render();
  try{ await S.db.collection('pedmat').add({ordem:o._id,num:o.num,linha:o.linha,rancho:o.rancho||'',item,cod:it?it.c:'',qtd:+M.qtd,um:M.um||'',urgente:!!M.urg,status:'aberto',em:new Date().toISOString(),por:S.uid||null,porNome:T.p.nome,cracha:T.p.codigo||null,origem:'posto'});
    T.enviando=false; SOMpo('ok'); poVai('pook',{okTit:'Pedido enviado ao almoxarifado',okTxt:item+' · '+fQ(+M.qtd)+' '+(M.um||'')+(M.urg?' · URGENTE':'')+' · ordem '+o.num}); }
  catch(e){ T.enviando=false; console.warn('[posto] pedido de material',e); T.msg='Não foi possível enviar. Confira a internet e tente de novo.'; render(); } }
async function poParou(l,motivo){ const T=S.tt; if(T.enviando||!T.p) return; if(poParAberta(l)){ T.msg=l+' já está parada.'; T.po.parL=''; render(); return; }
  const doc={linha:l,motivo,inicio:new Date().toISOString(),fim:null,por:S.uid||null,origem:'posto',porNome:T.p.nome,cracha:T.p.codigo||null}; const r=ordemRodando(l); if(r){ doc.ordem=String(r.num); doc.ordemId=r._id; }
  T.enviando=true; render(); const ok=await salvar('paradas',doc); T.enviando=false;
  if(!ok){ T.msg='Não foi possível salvar. Confira a internet e tente de novo.'; render(); return; }
  SOMpo('ok'); poVai('pook',{okTit:l+' parada às '+hora(doc.inicio),okTxt:(motivo==='A definir'?'Motivo a definir (o PCP completa depois)':motivo)+' · registrada por '+T.p.nome}); }
async function poVoltou(id){ const T=S.tt, p=(S.paradas||[]).find(x=>x._id===id); if(!p||T.enviando||!T.p) return; T.enviando=true; render();
  try{ const em=new Date().toISOString(), todas=(S.paradas||[]).filter(x=>x.linha===p.linha&&!x.fim&&!x.anulada); if(!todas.includes(p)) todas.push(p);
    /* fecha TODAS as paradas abertas da linha (às vezes ficam duas: uma da tela de paradas e outra do chamado) */
    await Promise.all(todas.map(x=>S.db.doc('paradas/'+x._id).update({fim:em>x.inicio?em:x.inicio,porFim:S.uid||null,fimPor:T.p.nome,fimCracha:T.p.codigo||null,fimOrigem:'posto'}).then(()=>{ x.fim=em; })));
    const ini0=todas.map(x=>x.inicio).sort()[0]||p.inicio; T.enviando=false; SOMpo('ok');
    poVai('pook',{okTit:p.linha+' voltou a produzir',okTxt:'Parada de '+dur(new Date(em)-new Date(ini0))+(todas.length>1?' ('+todas.length+' registros fechados)':'')+' ('+(p.motivo==='A definir'?'motivo a definir':p.motivo)+') · fechada por '+T.p.nome}); }
  catch(e){ T.enviando=false; console.warn('[posto] voltou',e); T.msg='Não foi possível salvar. Confira a internet e tente de novo.'; render(); } }
async function poAbrirChamado(){ const T=S.tt, C=T.ch; if(!C||!C.tipo||!C.imp||T.enviando||!T.p) return; T.enviando=true; T.msg=''; render();
  if(S.man.salv&&Date.now()-(S.man._salvDesde||0)>30000) S.man.salv=false;
  manNovo(C.linha); Object.assign(S.man.f,{linha:C.linha,quando:manAgoraLocal(),defeito:C.tipo,impacto:C.imp,nome:T.p.nome,equip:'',equipId:'',origem:'posto',cracha:T.p.codigo||null});
  S.man.novo=false; S.man.cur=null; S.man._ultErro=''; S.man._salvDesde=Date.now();
  let estourou=false; const sv=manSalvar().catch(e=>{ S.man._ultErro=cqErroTxt(e); });
  await Promise.race([sv,new Promise(r=>setTimeout(()=>{ estourou=true; r(); },window.__cqTempo||25000))]);
  const n=S.man.cur; S.man.cur=null; S.man.novo=false; T.enviando=false;
  if(n==null){ if(estourou) S.man.salv=false; T.msg=(estourou?'O Firebase não respondeu em 25 segundos':'Não foi possível abrir o chamado')+(S.man._ultErro?' ('+S.man._ultErro+')':'')+'. Confira a internet e tente de novo.'; render(); return; }
  try{ await S.db.doc('chamados/os-'+manNum(n)).update({tipo:C.tipo==='Elétrico'?'eletrico':'mecanico'}); }catch(e){}
  SOMpo('ok'); poVai('pook',{okTit:'Chamado aberto · '+manNum(n),okTxt:C.linha+' · '+C.tipo+' · '+poImpTxt(C.imp)+' · a manutenção já foi avisada'}); }
async function poLiberar(n){ const T=S.tt, c=manDoc(n); if(!c||T.enviando||!T.p) return; T.enviando=true; render();
  try{ const agora=new Date().toISOString(), E=Object.assign({},c.exec||{},{servicos:(c.exec&&c.exec.servicos)||'Conserto conferido e máquina liberada pelo operador no posto'});
    const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Operador conferiu e liberou a máquina no posto: '+T.p.nome+(T.p.codigo?' (crachá)':'')}]).slice(-200);
    await S.db.doc('chamados/'+c._id).update({exec:E,hist,liberadoEm:agora,liberadoPor:T.p.nome,liberadoCracha:T.p.codigo||null,liberadoPeloOperador:true}); Object.assign(c,{exec:E,hist,liberadoEm:agora,liberadoPor:T.p.nome});
    c._mzOk=true; try{ await manStatus(c,'Concluída'); } finally { delete c._mzOk; }
    if(c.status!=='Concluída'){ /* o fechamento normal não gravou (ex.: ficou preso de uma tentativa anterior): fecha direto */
      delete c._stGrav; const E2=Object.assign({},c.exec||{}); if(!E2.fim) E2.fim=manAgoraLocal().slice(0,16);
      const h2=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:(c.status||'')+' → Concluída (liberado no posto)'}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({status:'Concluída',exec:E2,hist:h2,concluidoEm:agora,concluidoPor:S.uid||null}); Object.assign(c,{status:'Concluída',exec:E2,hist:h2,concluidoEm:agora});
      const pa=c.paradaId&&(S.paradas||[]).find(x=>x._id===c.paradaId); if(pa&&!pa.fim){ await S.db.doc('paradas/'+pa._id).update({fim:agora>pa.inicio?agora:pa.inicio,porFim:S.uid||null,fimPor:T.p.nome}); pa.fim=agora; } }
    { const ag=new Date().toISOString(); await Promise.all((S.paradas||[]).filter(x=>x.linha===c.linha&&!x.fim&&!x.anulada).map(x=>S.db.doc('paradas/'+x._id).update({fim:ag>x.inicio?ag:x.inicio,porFim:S.uid||null,fimPor:T.p.nome,fimCracha:T.p.codigo||null,fimOrigem:'posto'}).then(()=>{ x.fim=ag; }))); }
    T.enviando=false;
    SOMpo('ok'); poVai('pook',{okTit:'Máquina liberada · chamado '+manNum(n)+' fechado',okTxt:(c.linha||'')+' · conserto de '+(c.exec&&c.exec.tecnico||'manutenção')+' · liberado por '+T.p.nome}); }
  catch(e){ T.enviando=false; console.warn('[posto] liberar',e); T.msg='Não foi possível fechar o chamado: '+cqErroTxt(e)+'.'; render(); } }
async function poAinda(n){ const T=S.tt, c=manDoc(n); if(!c||!T.p) return;
  try{ const agora=new Date().toISOString(), hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Operador conferiu no posto: a máquina ainda está com problema ('+T.p.nome+')'}]).slice(-200);
    await S.db.doc('chamados/'+c._id).update({hist,aindaProblemaEm:agora,aindaProblemaPor:T.p.nome}); c.hist=hist; toast('Avisado: a máquina ainda está com problema. O chamado continua aberto.'); }catch(e){ toast('Não foi possível salvar agora.'); } }
async function poAvisarPcp(){ const T=S.tt; if(!T.p||T.enviando) return; T.enviando=true; render();
  try{ await S.db.collection('pcpavisos').add({status:'aberto',em:new Date().toISOString(),por:S.uid||null,nome:T.p.nome,cracha:T.p.codigo||null,linha:T.p.linha&&ttLinhas().includes(T.p.linha)?T.p.linha:ttLinhas().join(' / '),posto:ttLinhas().join(' / '),acao:T.po&&T.po.acao==='pm'?'pedir material':'apontar',msg:T.msg||'',origem:'posto'});
    T.enviando=false; SOMpo('ok'); poVai('pook',{okTit:'PCP avisado',okTxt:'O aviso tocou no painel do PCP: '+T.p.nome+' precisa de ajuda com a folha.'}); }
  catch(e){ T.enviando=false; T.msg='Não foi possível avisar o PCP. Confira a internet.'; render(); } }
function SOMpo(k){ try{ if(typeof SOM!=='undefined'&&SOM[k]) SOM[k](); else ttBip(); }catch(e){} }

/* ---------- cliques ---------- */
function poVolta(){ const T=S.tt, f=T.fase;
  if(f==='pomenu'||f==='tecnico'||f==='potec'||f==='pook'||f==='sem'){ ttVoltar(); return; }
  if(f==='poch'){ poVai('pomenu'); return; }
  if(f==='popar'&&T.po&&T.po.parL){ T.po.parL=''; render(); return; }
  if(f==='poap'||f==='popm'||f==='poesc'||f==='poini'){ T.hub=null; poVai('pofolha'); return; }
  if(['pofolha','popar','cqlinha','maquina'].includes(f)){ poVai('pomenu'); return; }
  if(f==='defeito'){ poVai('maquina'); return; } if(f==='impacto'){ poVai('defeito'); return; } if(f==='cqcausa'){ poVai('tecnico'); return; } }
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act]'); if(!b||!ttAtivo()||!poOn()) return; const T=S.tt;
  /* no posto, "Cancelar" do chamado volta ao menu (não tira o crachá) */
  if(b.dataset.act==='cq-cancel'&&T.p&&['cqlinha','maquina'].includes(T.fase)){ ev.preventDefault(); ev.stopImmediatePropagation(); poVai('pomenu'); } },true);
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="po-"]'); if(!b||b.disabled||!ttAtivo()||!poOn()) return; const T=S.tt, a=b.dataset.act; T.ult=Date.now(); T.msg='';
  if(a==='po-op'){ poMenuAcao(+b.dataset.n); return; }
  if(a==='po-chl'){ T.ch.linha=b.dataset.l; render(); return; }
  if(a==='po-tipo'){ T.ch.tipo=b.dataset.v; render(); return; }
  if(a==='po-imp'){ T.ch.imp=b.dataset.v; render(); return; }
  if(a==='po-ch-ok'){ poAbrirChamado(); return; }
  if(a==='po-lib'){ poLiberar(+b.dataset.n); return; }
  if(a==='po-aind'){ poAinda(+b.dataset.n); return; }
  if(a==='po-pcp'){ poAvisarPcp(); return; }
  if(a==='po-volta'){ poVolta(); return; }
  if(a==='po-sai'||a==='po-fim'){ ttVoltar(); return; }
  if(a==='po-outra'){ T.po={}; poVai('pomenu'); return; }
  if(a==='po-cam'){ try{ localStorage.setItem('colafix.posto.cam',poCamOff()?'1':'0'); }catch(e){} render(); return; }
  if(a==='po-cfgl'){ T.po=T.po||{}; T.po.cfgL=!T.po.cfgL; render(); return; }
  if(a==='po-sair'){ if(!confirm('Sair do posto?\n\nPara voltar, será preciso entrar de novo com o usuário e a senha.')) return; ttCamDesliga(); const x=document.createElement('button'); x.dataset.act='sair-conta'; x.hidden=true; document.body.appendChild(x); x.click(); x.remove(); return; }
  if(a==='po-ord'){ poAbreOrdem(b.dataset.id); return; }
  if(a==='po-pal'){ T.ap.pal=Math.max(0,T.ap.pal+(+b.dataset.v)); render(); return; }
  if(a==='po-ap-ok'){ poApontar(); return; }
  if(a==='po-pmi'){ const o=ttOrd(), c=b.dataset.c, rc=o&&o.rancho&&ranchoDe(o.rancho), it=c!=='__outro'&&((rc&&rc.itens)||[]).find(x=>x.c===c); T.pm.cod=c; T.pm.um=it?(it.um||''):''; render(); return; }
  if(a==='po-pm-ok'){ poPedir(); return; }
  if(a==='po-parou'){ T.po.parL=b.dataset.l; render(); return; }
  if(a==='po-mot'){ if(!T.po.parL) return; if(/manuten/i.test(b.dataset.v)){ poChamado(T.po.parL,'parou'); return; } poParou(T.po.parL,b.dataset.v); return; }
  if(a==='po-voltou'){ poVoltou(b.dataset.id); return; } });
document.addEventListener('input',ev=>{ const t=ev.target; if(!poOn()) return; const T=S.tt; T.ult=Date.now();
  if(t.id==='po-pp'&&T.ap){ const v=t.value.replace(/\D/g,'').slice(0,4); if(v!==t.value) t.value=v; T.ap.pp=v; poAtualiza(); }
  if(t.id==='po-av'&&T.ap){ const v=t.value.replace(/\D/g,'').slice(0,6); if(v!==t.value) t.value=v; T.ap.av=v; poAtualiza(); }
  if(t.id==='po-pmq'&&T.pm){ const v=t.value.replace(/[^\d,.]/g,'').replace(',','.').slice(0,8); if(v!==t.value) t.value=v; T.pm.qtd=v; poAtualiza(); }
  if(t.id==='po-pmt'&&T.pm){ T.pm.txt=t.value; poAtualiza(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!poOn()) return;
  if(t.id==='po-urg'&&S.tt.pm){ S.tt.pm.urg=t.checked; render(); }
  if(t.dataset&&t.dataset.poLt!=null){ const l=t.dataset.poLt; let L=ttLinhas().slice(); L=t.checked?[...new Set(L.concat([l]))]:L.filter(x=>x!==l); if(!L.length){ t.checked=true; toast('O posto precisa de pelo menos uma linha.'); return; }
    L=linhasOrd().filter(x=>L.includes(x)); try{ localStorage.setItem('colafix.posto.linhas',JSON.stringify(L)); }catch(e){} render(); } });
/* digitar não redesenha a tela inteira (o campo não perde o cursor): atualiza só o total e o botão */
function poAtualiza(){ const T=S.tt, o=ttOrd(); if(!o) return;
  if(T.fase==='poap'){ const pp=+T.ap.pp||0, un=ttUn(o), tot=T.ap.pal*pp+(+T.ap.av||0), falta=Math.max(0,(+o.total||0)-entregueDe(o)), pend=apPendDe(o._id), bt=document.querySelector('[data-act="po-ap-ok"]'), tt=document.querySelector('.po-tot');
    if(tt){ tt.classList.toggle('warn',tot>falta); tt.innerHTML=`Total: <b>${fQ(tot)} ${esc(un)}</b>${pp&&tot?`<small>${T.ap.pal} palete${T.ap.pal===1?'':'s'} × ${fQ(pp)} + ${fQ(+T.ap.av||0)} avulsos</small>`:''}${tot>falta?`<small>Passa do total da ordem em ${fQ(tot-falta)} ${esc(un)} (reprocesso?). O PCP confere antes de entrar na programação.</small>`:''}${pend?`<small>Aguardando o PCP conferir: ${fQ(pend)} ${esc(un)}</small>`:''}`; }
    if(bt){ bt.disabled=!(S._entOrd[o._id]&&tot>0&&!T.enviando); bt.innerHTML='<b>Apontar '+fQ(tot)+' '+esc(un)+' (Enter)</b>'; } }
  if(T.fase==='popm'){ const M=T.pm, bt=document.querySelector('[data-act="po-pm-ok"]'); if(bt) bt.disabled=!(M.cod&&+M.qtd>0&&!T.enviando&&(M.cod!=='__outro'||String(M.txt||'').trim().length>1)); } }

/* ---------- teclado (o computador do posto não tem tela de toque) ---------- */
let poTecla={t:0,pend:null};
document.addEventListener('keydown',ev=>{ if(!ttAtivo()||!poOn()||ev.ctrlKey||ev.altKey||ev.metaKey) return; const T=S.tt, f=T.fase, agora=performance.now(), gap=agora-poTecla.t; poTecla.t=agora; T.ult=Date.now();
  if(poTecla.pend&&gap<120){ clearTimeout(poTecla.pend); poTecla.pend=null; } /* rajada do coletor: não é atalho */
  if(ev.key==='Escape'){ ev.preventDefault(); poVolta(); return; }
  if(f==='pomenu'&&/^[1-4]$/.test(ev.key)){ const n=+ev.key; ev.preventDefault(); poTecla.pend=setTimeout(()=>{ poTecla.pend=null; if(S.tt.fase==='pomenu') poMenuAcao(n); },120); return; }
  if(f==='poap'){ if(ev.key==='ArrowUp'||ev.key==='ArrowDown'){ ev.preventDefault(); const o=ttOrd(); if(o&&+T.ap.pp){ T.ap.pal=Math.max(0,T.ap.pal+(ev.key==='ArrowUp'?1:-1)); render(); } return; }
    if(ev.key==='Enter'){ ev.preventDefault(); poApontar(); return; } }
  if(f==='popm'&&ev.key==='Enter'){ ev.preventDefault(); const bt=document.querySelector('[data-act="po-pm-ok"]'); if(bt&&!bt.disabled) poPedir(); return; }
  if(f==='poch'&&ev.key==='Enter'&&!(document.activeElement&&document.activeElement.matches('button'))){ ev.preventDefault(); poAbrirChamado(); return; }
  if(f==='sem'&&ev.key==='Enter'){ ev.preventDefault(); const b=document.querySelector('[data-act="tt-sem-ok"]'); b&&b.click(); return; }
  if(f==='pook'&&ev.key==='Enter'){ ev.preventDefault(); ttVoltar(); return; }
  if(f==='popar'&&!T.po.parL&&/^[1-9]$/.test(ev.key)){ const l=ttLinhas()[+ev.key-1]; if(l){ ev.preventDefault(); const p=poParAberta(l), ea=poEmAtend().find(c=>c.linha===l); if(ea) poLiberar(ea.numero); else if(p) poVoltou(p._id); else { T.po.parL=l; render(); } } } });
/* ---------- painel do PCP: aviso "Deu erro? Avisar o PCP" toca e aparece no topo ---------- */
S.pcpav=[]; let _pcpVistos=null;
function pcpRecebe(){ try{ if(poOn()||!S.acs||!S.acs.pronto) return false; if(S.acs.dono) return true; const d=S.acs.doc; return !!d&&(d.perfil==='pcp'||(acsP().mods||[]).includes('analise')); }catch(e){ return false; } }
setInterval(()=>{ try{ if(S._pcpSub||!S.db||!pcpRecebe()) return; S._pcpSub=true;
  inscrever('pcpavisos',()=>S.db.collection('pcpavisos').where('status','==','aberto').limit(30),snap=>{ const xs=snap.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>String(b.em).localeCompare(String(a.em)));
    const novos=_pcpVistos?xs.filter(x=>!_pcpVistos.has(x._id)):[]; _pcpVistos=new Set(xs.map(x=>x._id)); S.pcpav=xs;
    if(novos.length){ try{ (typeof SOM!=='undefined'&&SOM.erro)?(SOM.erro(),setTimeout(()=>SOM.erro(),600)):ttBip(); }catch(e){} toast('Posto pediu ajuda: '+novos[0].nome+' · '+novos[0].linha); }
    pcpFaixa(); }); }catch(e){} },1000);
function pcpFaixa(){ let el=document.getElementById('pcp-faixa'); const xs=S.pcpav||[]; if(!xs.length){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='pcp-faixa'; document.body.appendChild(el); }
  el.innerHTML=xs.slice(0,3).map(x=>`<div class="pcp-av"><b>Posto pediu ajuda do PCP</b><span>${esc(x.nome||'')} · ${esc(x.linha||'')} · ${esc(x.acao||'')} · ${hora(x.em)}${x.msg?' · “'+esc(x.msg)+'”':''}</span><button data-pcpok="${esc(x._id)}">Visto</button></div>`).join(''); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-pcpok]'); if(!b) return; b.disabled=true;
  try{ await S.db.doc('pcpavisos/'+b.dataset.pcpok).update({status:'visto',vistoEm:new Date().toISOString(),vistoPor:S.uid||null}); }catch(e){ erro(e); b.disabled=false; } });
registrarAviso(()=>(S.pcpav||[]).map(x=>({nivel:'crit',rotulo:'Posto',titulo:'Posto pediu ajuda do PCP · '+(x.linha||''),texto:(x.nome||'')+' · '+(x.acao||'')+' · '+hora(x.em),go:''})));
/* confirmação volta sozinha */
setInterval(()=>{ const T=S.tt; if(ttAtivo()&&poOn()&&T.fase==='pook'&&Date.now()-T.ult>10000) ttVoltar(); },1000);

document.head.insertAdjacentHTML('beforeend',`<style id="po-css">
.po .cq-g{grid-auto-rows:minmax(80px,1fr)}
body.po-on #tt-video{left:16px;right:auto}
body.po-on.po-camoff #tt-video{opacity:0;pointer-events:none}
.po-menu{flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:clamp(12px,2vh,20px)}
.po-op{font:inherit;cursor:pointer;border:0;border-radius:20px;color:#FFFFFF;padding:clamp(14px,2.4vh,26px) clamp(18px,2.2vw,32px);display:flex;align-items:center;gap:clamp(14px,1.8vw,28px);text-align:left;box-shadow:var(--sombra)}
.po-op:hover,.po-op:focus-visible{filter:brightness(1.08);outline:3px solid var(--tx);outline-offset:2px}
.po-op.crit{background:var(--crit)}.po-op.ok{background:var(--ok)}.po-op.pri{background:var(--pri);color:var(--prifg)}.po-op.warn{background:var(--warn)}
.po-k{flex:none;width:clamp(48px,7.5vh,72px);height:clamp(48px,7.5vh,72px);border-radius:14px;border:3px solid currentColor;opacity:.85;display:inline-flex;align-items:center;justify-content:center;font-size:clamp(26px,4.6vh,42px);font-weight:800}
.po-op b{display:block;font-size:clamp(24px,5vh,46px);font-weight:800;line-height:1.1}.po-op small{display:block;font-size:clamp(14px,2.4vh,22px);opacity:.92;margin-top:4px}
.po-ord{background:var(--card);border-radius:18px;padding:clamp(10px,1.8vh,18px) 24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,520px);gap:24px;align-items:center;box-shadow:var(--sombra)}
.po-ord small{font-size:clamp(13px,1.8vh,17px);font-weight:700;letter-spacing:.04em;color:var(--tx2)}.po-ord b{display:block;font-size:clamp(20px,3.6vh,34px);margin-top:2px}
.po-ord .po-prog{background:none;padding:0}.po-ord .tt-progn b{font-size:clamp(20px,3.4vh,30px)}.po-ord .tt-progn span{color:var(--tx2)}.po-ord .tt-progb{background:var(--linha)}.po-ord .tt-progb i{background:var(--ok)}.po-ord .tt-prog small{color:var(--tx2)}
.po-pend{background:var(--critbg);color:var(--tx);border-radius:12px;padding:10px 16px;font-size:clamp(14px,2vh,18px);font-weight:600}
.po-q2{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:18px}
.po-box{background:var(--card);border-radius:20px;padding:clamp(14px,2.4vh,24px) 28px;display:flex;flex-direction:column;justify-content:center;gap:12px;box-shadow:var(--sombra)}
.po-lb{font-size:clamp(18px,2.8vh,24px);font-weight:700}.po-lb small{font-weight:500;color:var(--tx2)}.po-dica{font-size:clamp(13px,1.9vh,17px);color:var(--tx2)}
.po-pal{display:flex;align-items:center;gap:24px}.po-pal button{width:clamp(60px,10vh,84px);height:clamp(60px,10vh,84px);border-radius:50%;border:3px solid var(--pri);background:var(--card);color:var(--tx);font:inherit;font-size:clamp(32px,5.5vh,44px);font-weight:700;cursor:pointer}.po-pal button:disabled{opacity:.35;cursor:default}
.po-pal b{font-size:clamp(48px,9vh,72px);min-width:90px;text-align:center}
.po-in{font:inherit;font-size:clamp(40px,8vh,64px);font-weight:700;color:var(--tx);width:min(100%,300px);height:clamp(70px,12vh,96px);box-sizing:border-box;border:3px solid var(--info);border-radius:16px;padding:0 20px;background:var(--card)}
.po-in.po-tx{width:100%;font-size:clamp(22px,3.6vh,32px)}.po-in:focus{outline:4px solid var(--info);outline-offset:2px}
.po-tot{font-size:clamp(18px,3vh,26px);text-align:center}.po-tot b{font-size:clamp(26px,4.8vh,40px)}.po-tot small{display:block;font-size:clamp(13px,1.9vh,17px);color:var(--tx2)}.po-tot.warn b,.po-tot.warn small{color:var(--warn)}
.po-ok{min-height:0;padding:clamp(12px,2vh,18px) clamp(24px,3vw,40px)}.po-ok b{font-size:clamp(20px,3.6vh,30px)}.cq-bt.po-ok:disabled{opacity:.4;cursor:not-allowed}
.po-its{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:12px;max-height:38vh;overflow:auto}
.po-its button{font:inherit;text-align:left;border:2px solid var(--linha);border-radius:16px;background:var(--card);color:var(--tx);padding:12px 16px;cursor:pointer}.po-its button[aria-pressed="true"]{border:3px solid var(--pri);padding:11px 15px;background:var(--pag)}.po-its button.outro{border-style:dashed}
.po-its b{display:block;font-size:clamp(17px,2.6vh,22px)}.po-its span{font-size:clamp(13px,1.8vh,16px);color:var(--tx2)}
.po-urg{border:3px dashed var(--linha);border-radius:18px;padding:16px 24px;display:flex;align-items:center;gap:16px;font-size:clamp(18px,2.8vh,24px);font-weight:700;cursor:pointer;background:var(--card)}.po-urg.on{border-style:solid;border-color:var(--crit);background:var(--critbg);color:var(--crit)}.po-urg input{width:30px;height:30px;accent-color:var(--crit)}
.po-par{flex:1;min-height:0;display:grid;grid-template-columns:minmax(300px,440px) minmax(0,1fr);gap:22px}
.po-pls{display:flex;flex-direction:column;gap:16px;min-height:0;overflow:auto}
.po-pl{background:var(--card);border:3px solid var(--linha);border-radius:18px;padding:16px 22px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--sombra)}.po-pl.sel{border-color:var(--pri)}.po-pl.crit{border-color:var(--crit);background:var(--critbg)}.po-pl.arr{border-color:#D9792B;background:#FBEBDD}.po-pl.arr em{color:#B85F14;font-style:normal;font-weight:700}.cq.esc .po-pl.arr{border-color:#F0954A;background:#3A2614}.cq.esc .po-pl.arr em{color:#F5A764}.po-lk{font:inherit;background:none;border:0;padding:0;color:var(--tx2);text-decoration:underline;cursor:pointer}
.po-pl>div{display:flex;justify-content:space-between;align-items:center;gap:10px}.po-pl h2{margin:0;font-size:clamp(22px,3.4vh,28px)}.po-pl em{font-style:normal;font-weight:700;color:var(--crit);font-size:clamp(14px,2vh,16px)}.po-pl em.ok{color:var(--ok)}
.po-pl>span{font-size:clamp(14px,2vh,17px);color:var(--tx2)}.po-pl small{font-size:14px;color:var(--tx2)}.po-pl .cq-bt{min-height:0;padding:14px 18px;align-items:center;text-align:center}.po-pl .cq-bt b{font-size:clamp(20px,3.2vh,26px)}
.po-mots{background:var(--card);border-radius:20px;padding:20px 24px;display:flex;flex-direction:column;gap:14px;min-height:0;box-shadow:var(--sombra)}
.po-mg{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));grid-auto-rows:minmax(64px,1fr);gap:12px;overflow:auto}.po-mg .cq-bt{min-height:64px;padding:10px 18px}.po-mg .cq-bt b{font-size:clamp(17px,2.8vh,22px)}.po-mg .po-ad{border-style:dashed;border-color:var(--warn)}
.cq-ln.arr{border-color:#D9792B;background:#FBEBDD}.cq-ln.arr i{background:#D9792B}.cq-ln.arr b,.cq-ln.arr .po-lch{color:#B85F14}.cq.esc .cq-ln.arr{background:#3A2614;border-color:#F0954A}.cq.esc .cq-ln.arr i{background:#F0954A}.cq.esc .cq-ln.arr b,.cq.esc .cq-ln.arr .po-lch{color:#F5A764}
.po-lch{display:block;font-style:normal;font-weight:700;color:var(--crit);font-size:clamp(14px,1.9vh,17px)}
.po-rbs{display:flex;gap:12px;align-items:center;flex:none}.cq-bt.po-pcp{min-height:0;padding:12px 22px}.cq-bt.po-pcp b{font-size:clamp(16px,2.4vh,20px)}
.po-pph{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.po-ppl{margin-left:auto;font-size:clamp(14px,2vh,17px);font-weight:600;color:var(--tx2)}.po-in.po-pp{width:96px;height:52px;font-size:26px;text-align:center;padding:0 8px;border-width:2px}.po-pph small{font-size:14px;color:var(--tx2);width:100%;text-align:right}
.po-sua{font-size:15px;font-weight:700;color:var(--info)}
.cq-bt span{display:block}
.po-chh{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.po-seg{display:flex;background:var(--card);border:2px solid var(--linha);border-radius:14px;padding:4px}.po-seg button{font:inherit;font-size:clamp(17px,2.6vh,22px);font-weight:700;border:0;border-radius:10px;padding:10px 24px;background:transparent;color:var(--tx);cursor:pointer}.po-seg button[aria-pressed="true"]{background:var(--pri);color:var(--prifg)}
.po-lib{background:var(--card);border:3px solid var(--ok);border-radius:18px;padding:12px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}.po-lib>div{flex:1;min-width:260px}.po-lib small{font-size:clamp(13px,1.8vh,15px);font-weight:700;letter-spacing:.04em;color:var(--ok)}.po-lib b{display:block;font-size:clamp(18px,2.8vh,24px)}.po-lib .cq-bt{min-height:0;padding:12px 22px}.po-lib .cq-bt b{font-size:clamp(17px,2.6vh,22px)}
.po-ch2{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:18px}
.po-chq{background:var(--card);border-radius:20px;padding:18px 22px;display:flex;flex-direction:column;gap:12px;min-height:0;box-shadow:var(--sombra)}.po-chq h2{margin:0;font-size:clamp(20px,3.4vh,28px)}
.po-chb{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}.po-chb button{font:inherit;flex:1;min-height:56px;border-radius:18px;border:2px solid var(--linha);background:var(--card);color:var(--tx);font-size:clamp(20px,3.8vh,30px);font-weight:800;cursor:pointer}
.po-chb button:hover{border-color:var(--info)}.po-chb button[aria-pressed="true"]{border-color:var(--pri);background:var(--pri);color:var(--prifg)}.po-chb button.crit[aria-pressed="true"]{border-color:var(--crit);background:var(--crit);color:#FFFFFF}.po-chb button.warn[aria-pressed="true"]{border-color:var(--warn);background:var(--warn);color:#FFFFFF}.po-chb button.ok[aria-pressed="true"]{border-color:var(--ok);background:var(--ok);color:#FFFFFF}
.po-tecs{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:18px;overflow:auto;align-content:start}
.po-tec{background:var(--card);border:3px solid var(--warn);border-radius:20px;padding:18px 22px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--sombra)}.po-tec.crit{border-color:var(--crit)}.po-tec.info{border-color:var(--info)}
.po-tech{display:flex;justify-content:space-between;align-items:center;gap:10px}.po-tech h2{margin:0;font-size:clamp(22px,3.6vh,30px)}.po-tech em{font-style:normal;font-weight:700;font-size:15px;color:var(--warn)}.po-tec.crit .po-tech em{color:var(--crit)}.po-tec.info .po-tech em{color:var(--info)}
.po-tec>small{font-size:14px;font-weight:700;letter-spacing:.04em;color:var(--tx2)}.po-tec>b{font-size:clamp(20px,3.2vh,26px)}.po-tec>span{font-size:16px;color:var(--tx2)}.po-tec .cq-bt{min-height:0;padding:14px;align-items:center;margin-top:6px}.po-tec .cq-bt b{font-size:clamp(20px,3.2vh,24px)}
.po-tecok{margin-top:6px;text-align:center;font-size:clamp(17px,2.6vh,21px);font-weight:700;color:var(--info);background:var(--pag);border-radius:14px;padding:14px}
#pcp-faixa{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:3000;display:flex;flex-direction:column;gap:8px;width:min(720px,calc(100vw - 24px))}
.pcp-av{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 14px;align-items:center;background:#B5473F;color:#FFFFFF;border-radius:14px;padding:12px 16px;box-shadow:0 8px 24px rgba(0,0,0,.25);animation:pcpPisca 1s ease-in-out 4}
.pcp-av b{font-size:17px}.pcp-av span{grid-column:1;font-size:14px;opacity:.95}.pcp-av button{grid-row:1/3;grid-column:2;font:inherit;font-weight:700;border:0;border-radius:10px;padding:10px 18px;background:#FFFFFF;color:#B5473F;cursor:pointer}
@keyframes pcpPisca{50%{background:#E3312D}}
.po-sem{justify-content:flex-start;padding:clamp(20px,4vh,40px) clamp(24px,4vw,60px)}.po-sem>div{width:min(100%,760px);display:flex;flex-direction:column;gap:12px}.po-sem p{margin:0 0 8px}
.po-cfg{background:var(--card);border-radius:14px;padding:12px 18px;display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center;font-size:17px}.po-cfg div{display:flex;flex-wrap:wrap;gap:6px 18px}.po-cfg span{color:var(--tx2);font-size:14px}
@media (max-width:900px){.po-menu{grid-template-columns:1fr;grid-template-rows:none}.po-par{grid-template-columns:1fr}.po-ord{grid-template-columns:1fr}}
</style>`);
/* ===FIM POSTO=== */
