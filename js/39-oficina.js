/* Painel Colafix · 39-oficina.js (22/10) — Computador da manutenção (oficina), protótipo aprovado "Computador da manutenção · protótipo".
   Login próprio (cargo "oficina", só o módulo tablet): abre direto nesta tela e fica preso nela (sair só com a senha da trava, 31-trava.js).
   Espera: chamados das linhas · tarefas do Marcelo para aceitar + preventivas · quem está fazendo o quê; alarme na tela
   (chamado novo da linha = vermelho; tarefa urgente do Marcelo = âmbar) até alguém atender/aceitar ou silenciar.
   Técnico passa o crachá (coletor ou QR) → aceita (agora / para depois / não consigo + motivo), começa, termina (feito / em parte / falta peça),
   faz o checklist da preventiva (fase cqchk do 38), entra junto (2º técnico, 31), pede peça e vê o quadro da semana.
   Pedido de peça: coleção pedpecas {t,qtd,os,osTxt,urg,porNome,cracha,em,status,hist}; o Marcelo marca em Pedidos de peça (gxpec):
   enviado → visto → comprar (vai comprar) → comprado (prev) → chegou · ou nao (motivo).
   O chamado da linha continua sendo começado e liberado no posto da linha. Para ver sem o login próprio: ?totem=1&oficina=1. */
"use strict";
registrarPerfil('oficina',{nome:'Computador da manutenção (oficina)',mods:['tablet'],pos:3,desc:'Fica na oficina: avisa com alarme os chamados das linhas e as tarefas urgentes do Marcelo; o técnico passa o crachá para aceitar as tarefas, fazer as preventivas, pedir peça e ver o quadro da semana.'});
function ofOn(){ try{ if(S.acs&&S.acs.doc&&S.acs.doc.perfil==='oficina') return true; return /[?&#]oficina=1/.test(location.search+'&'+location.hash)&&ttPodeUsar(); }catch(e){ return false; } }
{ const _el=eqLinkDe; eqLinkDe=function(c){ return c&&c.perfil==='oficina'?eqLinkPainel()+'?totem=1':_el.apply(this,arguments); }; }
if(typeof TRAVA_PERFIS!=='undefined'&&!TRAVA_PERFIS.includes('oficina')) TRAVA_PERFIS.push('oficina');
S.of=S.of||{vistos:null,alerta:[],cal:new Set(),ultSom:0,ini:Date.now(),acc:null,dev:null,term:null,peca:null,fil:'todos'};
const OF_MOTIVOS=['Falta peça ou material','Precisa de outra equipe','Precisa parar a linha','Não é serviço da manutenção','Estou com outro serviço urgente','Outro'];
const OF_URG=[['hoje','Urgente · máquina parada','crit'],['semana','Esta semana','pri'],['sem','Sem pressa','neu']];
const OF_PST={enviado:['Enviado · ainda não visto','neu'],visto:['Marcelo viu','warn'],comprar:['Marcelo vai comprar','warn'],comprado:['Comprado','ok'],chegou:['Chegou','ok'],nao:['Não vai comprar','crit']};
const ofUrgT=k=>(OF_URG.find(x=>x[0]===k)||OF_URG[1])[1];
const ofN=s=>(typeof mxNorm==='function'?mxNorm(s||''):String(s||'').toLowerCase());
const ofHm=iso=>{ if(!iso) return ''; const d=new Date(iso); return isNaN(d)?String(iso).slice(11,16):pad(d.getHours())+':'+pad(d.getMinutes()); };
function ofMin(iso){ const m=Math.max(0,Math.round((Date.now()-new Date(iso||Date.now()).getTime())/6e4)); return m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'); }
function ofAceito(c){ return !!(c&&c.exec&&c.exec.aceito&&c.exec.aceito.nome); }
function ofTec(c){ return !!(c&&((c.exec&&c.exec.tecnico)||c.status==='Em execução')); }
function ofPend(c){ return !ofAceito(c)&&!ofTec(c); }
function ofMeu(c,nome){ if(!c||!nome) return false; return tecEh(c,nome)||(ofAceito(c)&&ofN(c.exec.aceito.nome)===ofN(nome)); }
const ofAb=()=>(typeof cqAbertos==='function'?cqAbertos():[]).filter(c=>c.status!=='Cancelada');
const ofLinhas=()=>ofAb().filter(c=>!c.tarefa&&!c.prevId&&(+c.numero||0)<900000).sort((a,b)=>(ofTec(a)?1:0)-(ofTec(b)?1:0)||(a.impacto==='parou'?0:1)-(b.impacto==='parou'?0:1)||String(a.criado).localeCompare(String(b.criado)));
const ofTarefas=()=>ofAb().filter(c=>c.tarefa&&!c.prevId).sort((a,b)=>(a.prioridade==='urgente'?0:1)-(b.prioridade==='urgente'?0:1)||String(a.prazo||'9').localeCompare(String(b.prazo||'9'))||String(a.criado).localeCompare(String(b.criado)));
const ofPrevs=()=>ofAb().filter(c=>c.prevId).sort((a,b)=>String(a.criado).localeCompare(String(b.criado)));
const ofChk=c=>!!(c&&c.rotId&&(c.chkItens||[]).length);
function ofPrevTxt(c){ return String(c.defeito||'').replace(/^PREVENTIVA:\s*/,''); }
function ofOnde(c){ return esc(c.linha||'')+(c.local?' · '+esc(c.local):''); }
function ofPeds(){ return (S.pedpecas||[]).filter(p=>!p.removido); }

/* ---------- leituras: pedidos de peça (oficina e gestor) ---------- */
setInterval(()=>{ try{ if(!S.db||!S.acs||!S.acs.pronto||S.of.pecSub) return; if(!(ofOn()||viewOk('gxpec'))) return; S.of.pecSub=true;
  assinarQ(()=>S.db.collection('pedpecas').orderBy('em','desc').limit(120),'pedpecas'); }catch(e){} },1500);

/* ---------- alarme ---------- */
function ofAlarmes(){ const out=[]; ofLinhas().forEach(c=>{ if(!ofTec(c)) out.push({c,k:'linha'}); });
  ofTarefas().forEach(c=>{ if(c.prioridade==='urgente'&&ofPend(c)) out.push({c,k:'tarefa'}); }); return out; }
function ofSomLivre(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return false; const c=S.man._ac||(S.man._ac=new A()); return c.state==='running'; }catch(e){ return false; } }
function ofVigia(){ if(!ofOn()||!ttAtivo()) return; const M=S.of, al=ofAlarmes(), ids=al.map(x=>x.c._id);
  if(M.vistos===null){ M.vistos=new Set(ids); M.alerta=al.filter(x=>Date.now()-new Date(x.c.criado||0).getTime()<30*6e4).map(x=>x.c._id); }
  else al.forEach(x=>{ if(!M.vistos.has(x.c._id)){ M.vistos.add(x.c._id); M.alerta.push(x.c._id); } });
  M.alerta=M.alerta.filter(id=>ids.includes(id)&&!M.cal.has(id));
  const on=M.alerta.length>0;
  if(on&&Date.now()-M.ultSom>2600){ M.ultSom=Date.now(); try{ mm2Sirene(); }catch(e){} }
  else if(!on&&ofLinhas().some(c=>c.impacto==='parou'&&!ofTec(c))&&Date.now()-M.ultSom>60000){ M.ultSom=Date.now(); try{ manBip(); }catch(e){} }
  const ov=document.querySelector('.of-ov'), quer=on&&S.tt.fase==='espera';
  if(!!ov!==quer||(ov&&ov.dataset.id!==M.alerta[0])) render(); }
setInterval(ofVigia,1000);
function ofAlarmeHtml(){ const M=S.of; if(!M.alerta.length||S.tt.fase!=='espera') return ''; const all=ofAlarmes(), x=all.find(a=>a.c._id===M.alerta[0]); if(!x) return ''; const c=x.c, lin=x.k==='linha', livre=ofSomLivre();
  const imp=c.impacto==='parou'?'parou completa':c.impacto==='reduziu'?'parou em parte':'não interferiu', tipo=(typeof mm2Tipo==='function'?mm2Tipo(c):c.defeito||'');
  return `<div class="of-ov ${lin?'lin':'tar'}" data-id="${esc(c._id)}" role="alertdialog" aria-labelledby="of-ovt"><div class="of-ovc">
    <span class="of-ovk">${lin?'CHAMADO NOVO DA LINHA':'TAREFA URGENTE DO MARCELO'}</span>
    <h1 id="of-ovt">${lin?esc(String(c.linha||'').toUpperCase())+' · '+imp.toUpperCase():ofOnde(c)}</h1>
    <p class="of-ovd">${esc(lin?tipo+(c.equip?' · '+c.equip:''):String(c.defeito||'').slice(0,120))}</p>
    <p class="of-ovs">OS ${manNum(c.numero)} · aberto às ${ofHm(c.criado)} por ${esc(c.nome||'—')} · há ${ofMin(c.criado)}${M.alerta.length>1?' · mais '+(M.alerta.length-1)+' esperando':''}</p>
    <p class="of-ovi">${lin?'Vá até o posto da '+esc(c.linha||'linha')+' e passe o crachá lá para começar.':'Passe seu crachá aqui para aceitar a tarefa.'}</p>
    <div class="of-ovb">${livre?'':'<button class="of-b" data-act="of-som">Ativar o som do alarme</button>'}<button class="of-b sec" data-act="of-sil">Silenciar</button></div>
    <small>${livre?'O alarme toca até alguém '+(lin?'começar o chamado no posto':'aceitar a tarefa')+'.':'O navegador só toca o alarme depois de um toque na tela.'}</small></div></div>`; }

/* ---------- desenho ---------- */
function ofCab(sub){ const T=S.tt, h=new Date(), e=cqEsc(); const logo=e?'icons/logo-colafix-escuro.png':((document.querySelector('.brand img')||{}).src||'');
  const cr=T.p&&T.p.codigo?crDe(T.p.codigo):null, area=cr&&cr.area?cr.area:'';
  const quem=T.p?`<div class="cq-pe"><span>${esc(String(T.p.nome||'?')[0])}</span><div><b>${esc(T.p.nome)}</b><small>Técnico${area?' · '+esc(area):' da manutenção'}</small></div></div>`:(ofSomLivre()?'<span class="of-on">● Alarme ligado</span>':'<button class="of-b sm" data-act="of-som">Ligar o som do alarme</button>');
  return `<header class="cq-cab"><img class="cq-logo" src="${esc(logo)}" alt="Colafix"><img class="cq-ass" src="icons/assinatura.png" alt="Assinatura da marca"><i class="cq-sep"></i><div class="cq-tt">${esc(sub||'Manutenção · oficina')}</div><div class="cq-dir">${quem}<div class="cq-clk" data-rtv-clk>${pad(h.getHours())}:${pad(h.getMinutes())}</div></div></header>`; }
function ofPagina(sub,corpo,extra){ return `<div class="cq of${cqEsc()?' esc':''}">${ofCab(sub)}<main class="cq-main">${corpo}</main>${extra||''}</div>`; }
const ofMsg=()=>S.tt.msg?`<div class="cq-msg" role="alert">${esc(S.tt.msg)}</div>`:'';
const ofTag=(t,k)=>`<span class="of-tag ${k||''}">${esc(t)}</span>`;
function ofCardLinha(c,curto){ const t=ofTec(c), k=c.impacto==='parou'&&!t?'crit':c.impacto==='reduziu'?'warn':'';
  const imp=c.impacto==='parou'?ofTag('PAROU','crit cheia'):c.impacto==='reduziu'?ofTag('PAROU EM PARTE','warn'):ofTag('FUNCIONA','');
  return `<div class="of-c ${k}"><div class="of-ch"><b>${esc(c.linha||'')}${c.equip?' · '+esc(c.equip):''}</b>${imp}</div><span>${esc((typeof mm2Tipo==='function'?mm2Tipo(c):'')||c.defeito||'')}</span>
    ${t?`<span class="of-s">Em atendimento com ${esc(tecNomes(c)||'técnico')}${c.exec&&c.exec.inicio?' desde '+esc(String(c.exec.inicio).slice(11,16)):''}</span>`:`<b class="of-s ${k?'crit':''}">${c.impacto==='parou'?'Sem técnico':'Aguardando técnico'} há ${ofMin(c.criado)}${curto?'':' · aberto por '+esc(c.nome||'—')}</b>`}</div>`; }
function ofCardTarefa(c){ const pr=typeof gchPrio==='function'?gchPrio(c.prioridade):['','Normal','warn'], urg=c.prioridade==='urgente', ac=ofAceito(c);
  const st=ofTec(c)?'Com '+esc(tecNomes(c)):ac?'Aceita por '+esc(c.exec.aceito.nome)+' para depois':urg?'<b class="crit">Ninguém aceitou · enviada às '+ofHm(c.criado)+'</b>':(c.paraTec?'Para '+esc(c.paraTec):'Qualquer técnico')+(c.prazo?' · prazo '+dm(c.prazo):'');
  return `<div class="of-c ${urg&&ofPend(c)?'crit':''}"><div class="of-ch"><b>${ofOnde(c)}</b>${ofTag(pr[1].toUpperCase(),urg?'crit cheia':pr[2]==='warn'?'warn':'')}</div><span>${esc(String(c.defeito||'').slice(0,90))}${c.tipo&&typeof gchTipoT==='function'?' · '+esc(gchTipoT(c.tipo).toLowerCase()):''}</span><span class="of-s">${st}</span></div>`; }
function ofCardPrev(c){ const n=(c.chkItens||[]).length, k=c.chk||{}, f=(c.chkItens||[]).filter(i=>k[i.id]&&k[i.id].s).length, atr=String(c.criado||'').slice(0,10)<hojeStr();
  return `<div class="of-c"><div class="of-ch"><b>${esc(ofPrevTxt(c).slice(0,70))}</b>${atr?ofTag('ATRASADA','warn'):''}</div><span class="of-s">${n?n+' itens no checklist · ':''}${ofTec(c)?'com '+esc(tecNomes(c))+(n?' · '+f+' de '+n:''):'ninguém começou'}</span></div>`; }
function ofTecnicos(){ const tecs=(typeof gchTecs==='function'?gchTecs():[]), ab=ofAb();
  return tecs.map(t=>{ const faz=ab.filter(c=>tecEh(c,t.nome)&&!tfConf(c)), dep=ab.filter(c=>!ofTec(c)&&ofAceito(c)&&ofN(c.exec.aceito.nome)===ofN(t.nome));
    const c=faz[0]; return {t,c,dep,txt:c?((c.prevId?'Preventiva · ':'')+(c.linha||'')+(c.equip&&!c.tarefa&&!c.prevId?' · '+c.equip:'')+(c.tarefa||c.prevId?' · '+String(c.prevId?ofPrevTxt(c):c.defeito||'').slice(0,40):'')+(c.exec&&c.exec.inicio?' · há '+ofMin(String(c.exec.inicio).length<=16?new Date(c.exec.inicio).toISOString():c.exec.inicio):'')):'livre'+(dep.length?' · '+dep.length+(dep.length>1?' tarefas aceitas':' tarefa aceita')+' para depois':'')}; })
    .sort((a,b)=>(a.c?0:1)-(b.c?0:1)||String(a.t.nome).localeCompare(String(b.t.nome))); }
function vOfEspera(){ const L=ofLinhas(), TF=ofTarefas().filter(ofPend), PV=ofPrevs(), h=hojeStr();
  const fe=(S.chamados||[]).filter(c=>!manIgnorar(c)&&c.status==='Concluída'&&c.concluidoEm&&hojeStr(new Date(c.concluidoEm))===h).length;
  const semN=L.filter(c=>!ofTec(c)).length+TF.length+PV.filter(c=>!ofTec(c)).length, and=ofAb().filter(ofTec).length, tecs=ofTecnicos();
  const corpo=`<div class="of-cols">
    <section class="of-col"><div class="of-hd"><h2>Chamados das linhas</h2><span>atender no posto da linha</span></div><div class="of-l">${L.map(c=>ofCardLinha(c)).join('')||'<p class="of-vz">Nenhum chamado aberto nas linhas.</p>'}</div></section>
    <section class="of-col"><div class="of-hd"><h2>Do Marcelo · para aceitar</h2><span>aceitar aqui na oficina</span></div><div class="of-l">${TF.map(ofCardTarefa).join('')||'<p class="of-vz">Nenhuma tarefa esperando.</p>'}
      <div class="of-hd of-hd2"><h2>Preventivas de hoje</h2><span>do plano</span></div>${PV.map(ofCardPrev).join('')||'<p class="of-vz">Nenhuma preventiva aberta.</p>'}</div></section>
    <section class="of-col"><div class="of-hd"><h2>Quem está fazendo o quê</h2><span>agora</span></div><div class="of-l">${tecs.slice(0,8).map(x=>`<div class="of-tc"><span class="of-av ${x.c?'on':''}">${esc(String(x.t.nome||'?')[0])}</span><div><b>${esc(String(x.t.nome).split(' ')[0])}${x.t.area?' · '+esc(x.t.area):''}</b><small>${esc(x.txt)}</small></div></div>`).join('')||'<p class="of-vz">Nenhum técnico cadastrado em Crachás.</p>'}</div>
      <div class="of-ks"><div><b class="${semN?'crit':''}">${semN}</b><span>sem ninguém</span></div><div><b>${and}</b><span>em andamento</span></div><div><b class="ok">${fe}</b><span>feitos hoje</span></div></div></section></div>
   <section class="of-cta"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="12" width="32" height="22" rx="3"/><path d="M14 18v10M18 18v10M22 18v10M27 18v10M31 18v10M35 18v10M4 40h40"/></svg><div><h1>Passe seu crachá no leitor ou mostre o QR na câmera</h1><p>Para aceitar as tarefas do Marcelo, começar a preventiva, pedir peça ou terminar o que é seu</p>${ofMsg()}</div>
    <div class="of-camslot" aria-hidden="true"><span>câmera</span></div><div class="of-ctab"><button class="of-b" data-act="of-sem">Quadro da semana</button>${ttSemCrachaOk()?'<button class="of-b sec" data-act="tt-sem">Estou sem crachá</button>':''}</div></section>
   <div class="cq-tema"><button class="cq-sec" data-act="cq-tema">${cqEsc()?'Tela clara':'Tela escura'}</button><button class="cq-sec" data-act="cq-cheia">${document.fullscreenElement?'Sair da tela cheia':'Tela cheia'}</button><button class="cq-sec" data-act="cq-sair">Sair</button></div>`;
  return ofPagina('Manutenção · oficina',corpo,ofAlarmeHtml()); }
const ofBt=(act,txt,n,cls,dis)=>`<button class="of-b ${cls||''}" data-act="${act}" ${n!=null?`data-n="${n}"`:''} ${dis||S.tt.enviando?'disabled':''}>${esc(txt)}</button>`;
function ofPecaDe(c){ const p=ofPeds().filter(x=>x.os===c.numero&&x.status!=='nao')[0]; if(!p) return ''; const s=OF_PST[p.status]||OF_PST.enviado; return `<span class="of-s ${s[1]}">Peça: ${esc(p.t.slice(0,50))} · ${s[0].toLowerCase()}</span>`; }
function vOfTec(){ const T=S.tt, eu=T.p.nome, ab=ofAb();
  const para=ofTarefas().filter(c=>ofPend(c)&&(!c.paraTec||ofN(c.paraTec)===ofN(eu)));
  const meus=ab.filter(c=>(c.tarefa||c.prevId)&&ofMeu(c,eu)).sort((a,b)=>(ofTec(a)?0:1)-(ofTec(b)?0:1));
  const prev=ofPrevs().filter(c=>!ofMeu(c,eu)&&!(c.tarefa&&ofAceito(c))), lin=ofLinhas();
  const linPara=c=>`<div class="of-r ${c.prioridade==='urgente'?'crit':''}"><div><b>${ofOnde(c)} · ${esc(String(c.defeito||'').slice(0,60))}</b><small>${esc(c.prioridade==='urgente'?'Urgente':(typeof gchPrio==='function'?gchPrio(c.prioridade)[1]:'Normal'))}${c.tipo&&typeof gchTipoT==='function'?' · '+esc(gchTipoT(c.tipo).toLowerCase()):''} · ${c.paraTec?'para você':'qualquer técnico'}${c.prazo?' · prazo '+dm(c.prazo):''} · enviada às ${ofHm(c.criado)}</small></div>${ofBt('of-ver','Ver e aceitar',c.numero,c.prioridade==='urgente'?'':'sec')}</div>`;
  const linMeu=c=>{ const t=ofTec(c), chk=ofChk(c), k=c.chk||{}, n=(c.chkItens||[]).length, f=(c.chkItens||[]).filter(i=>k[i.id]&&k[i.id].s).length;
    return `<div class="of-r ${t?'and':'dep'}"><div><b>${c.prevId?esc(ofPrevTxt(c).slice(0,70)):ofOnde(c)+' · '+esc(String(c.defeito||'').slice(0,60))}</b><small>${tfConf(c)?'Feito às '+ofHm(c.feitoTec.em)+(c.feitoTec.obs?' · '+esc(c.feitoTec.obs):''):t?((c.exec&&c.exec.reaberta||[]).length?'<b class="crit">O Marcelo reabriu: '+esc(c.exec.reaberta[c.exec.reaberta.length-1].mot||'não está feito')+'</b> · ':'')+'Em andamento desde '+esc(String((c.exec||{}).inicio||'').slice(11,16))+(chk?' · '+f+' de '+n+' itens':'')+(c.exec&&c.exec.ajudante&&c.exec.ajudante.nome?' · junto com '+esc(tecNomes(c)):''):'Aceita às '+ofHm(c.exec.aceito.em)+' para depois'+(c.prazo?' · prazo '+dm(c.prazo):'')}${(c.exec&&c.exec.partes||[]).length?' · feito em parte':''}</small>${ofPecaDe(c)}</div>
      ${tfConf(c)?'<span class="of-s warn">Esperando o Marcelo conferir</span>':t?(chk?`<button class="of-b ok" data-act="cq-terminar" data-n="${c.numero}">Fazer o checklist</button>`:ofBt('of-term','Terminar',c.numero,'ok')):ofBt('of-comecar','Começar agora',c.numero)}</div>`; };
  const linPrev=c=>{ const outro=ofTec(c), cheio=c.exec&&c.exec.ajudante&&c.exec.ajudante.nome, n=(c.chkItens||[]).length, k=c.chk||{}, f=(c.chkItens||[]).filter(i=>k[i.id]&&k[i.id].s).length;
    return `<div class="of-r"><div><b>${esc(ofPrevTxt(c).slice(0,70))}</b><small>${outro?'Com '+esc(tecNomes(c))+' desde '+esc(String((c.exec||{}).inicio||'').slice(11,16))+(n?' · '+f+' de '+n+' conferidos':''):(n?n+' itens · ':'')+'ninguém começou'}</small></div>
      ${outro?(cheio?'<span class="of-s">dois técnicos</span>':ofBt('of-junto','Entrar junto (2º técnico)',c.numero,'sec')):ofBt('of-comecar','Começar',c.numero,'sec')}</div>`; };
  const corpo=`<div class="of-tg"><div class="of-tl">
     <section class="of-col"><h2>Para você aceitar <small>· do Marcelo</small></h2>${para.map(linPara).join('')||'<p class="of-vz">Nenhuma tarefa nova para você.</p>'}</section>
     <section class="of-col"><h2>Comigo <small>· aceitas por você</small></h2>${meus.map(linMeu).join('')||'<p class="of-vz">Nada com você agora.</p>'}</section></div>
    <div class="of-tl"><section class="of-col"><h2>Preventivas <small>· de hoje e atrasadas</small></h2>${prev.map(linPrev).join('')||'<p class="of-vz">Nenhuma preventiva aberta.</p>'}</section>
     <section class="of-col"><h2>Chamados das linhas</h2>${lin.slice(0,4).map(c=>ofCardLinha(c,true)).join('')||'<p class="of-vz">Nenhum chamado aberto nas linhas.</p>'}<small class="of-p">O chamado da linha é começado e liberado no posto da linha, com o operador junto.</small></section></div></div>
   ${ofMsg()}<div class="cq-rod"><div class="of-rb">${ofBt('of-peca','Pedir peça',null,'')}${ofBt('of-sem','Quadro da semana',null,'sec')}<span>Sem uso por 1 minuto, a tela volta para a fila.</span></div><button class="cq-sec" data-act="of-sai">Sair (Esc)</button></div>`;
  return ofPagina('Manutenção · oficina',corpo); }
function vOfAcc(){ const T=S.tt, c=manDoc(S.of.acc); if(!c||!ofPend(c)){ T.fase='oftec'; return vOfTec(); } const D=S.of.dev, pr=typeof gchPrio==='function'?gchPrio(c.prioridade):['','Normal'];
  const corpo=`<section class="of-big"><span class="of-ovk ${c.prioridade==='urgente'?'crit':''}">TAREFA DO MARCELO · ${esc(pr[1].toUpperCase())} · OS ${manNum(c.numero)}</span><h1 class="cq-h">${ofOnde(c)}</h1><p class="of-tx">${esc(c.defeito||'')}</p>
     <p class="of-s">${c.tipo&&typeof gchTipoT==='function'?esc(gchTipoT(c.tipo))+' · ':''}${c.paraTec?'para '+esc(c.paraTec):'qualquer técnico'}${c.prazo?' · prazo '+dm(c.prazo):''} · enviada por ${esc(c.nome||'Marcelo')} às ${ofHm(c.criado)}${(c.devolvidas||[]).length?' · já devolvida '+(c.devolvidas.length)+'×':''}</p></section>
   ${D?`<h2 class="of-h2">Por que você não consegue?</h2><div class="of-mot">${OF_MOTIVOS.map(m=>`<button class="of-b ${D.mot===m?'':'sec'}" data-act="of-mot" data-v="${esc(m)}" aria-pressed="${D.mot===m}">${esc(m)}</button>`).join('')}</div>
     <label class="of-lb" for="of-dobs">Quer explicar? (opcional)</label><input id="of-dobs" class="of-in" maxlength="160" value="${esc(D.obs||'')}" autocomplete="off">
     ${ofMsg()}<div class="cq-rod"><span>A tarefa volta para o Marcelo com o motivo.</span><div class="of-rb"><button class="cq-sec" data-act="of-dev-volta">Voltar</button>${ofBt('of-dev-ok','Devolver para o Marcelo',null,'crit',!D.mot)}</div></div>`
   :`<div class="of-g3">${ofBt('of-ag','Aceitar e começar agora',c.numero,'ok')}${ofBt('of-ad','Aceitar para depois',c.numero,'')}${ofBt('of-nao','Não consigo fazer',c.numero,'sec')}</div>${ofMsg()}<div class="cq-rod"><span>"Para depois": fica com você e o Marcelo vê que alguém pegou.</span><button class="cq-sec" data-act="of-volta">Voltar (Esc)</button></div>`}`;
  return ofPagina('Aceitar tarefa',corpo); }
function vOfTerm(){ const T=S.tt, R=S.of.term, c=R&&manDoc(R.n); if(!c){ T.fase='oftec'; return vOfTec(); }
  const op=[['feito','Feito','Terminei, está funcionando','ok'],['parte','Feito em parte','Continua comigo; anoto o que fiz','warn'],['peca','Falta peça','Faço o pedido de peça para o Marcelo','crit']];
  const corpo=`<section class="of-big"><span class="of-ovk">TERMINAR · OS ${manNum(c.numero)}</span><h1 class="cq-h">${c.prevId?esc(ofPrevTxt(c)):ofOnde(c)}</h1><p class="of-tx">${esc(c.prevId?'':c.defeito||'')}</p></section>
   <div class="of-g3">${op.map(([k,t,s,cl])=>`<button class="of-op ${R.r===k?'on '+cl:''}" data-act="of-tr" data-v="${k}" aria-pressed="${R.r===k}"><b>${t}</b><span>${s}</span></button>`).join('')}</div>
   <label class="of-lb" for="of-tobs">${R.r==='peca'?'Qual peça falta?':'O que foi feito'} ${R.r==='peca'?'':'(opcional)'}</label><textarea id="of-tobs" class="of-in" rows="2" maxlength="300">${esc(R.obs||'')}</textarea>
   ${ofMsg()}<div class="cq-rod"><span>${R.r==='feito'?'Ao confirmar, a tarefa fica como feita para o Marcelo.':R.r==='parte'?'A tarefa continua com você.':'A tarefa fica "esperando peça".'}</span><div class="of-rb"><button class="cq-sec" data-act="of-volta">Voltar</button>${ofBt('of-term-ok',R.r==='peca'?'Continuar para o pedido':'Confirmar',null,'ok',R.r==='peca'&&!String(R.obs||'').trim())}</div></div>`;
  return ofPagina('Terminar',corpo); }
function vOfPeca(){ const T=S.tt, P=S.of.peca||(S.of.peca={t:'',qtd:'1',os:'',urg:'semana'}), eu=T.p.nome;
  const servs=ofAb().filter(c=>(c.tarefa||c.prevId)&&ofMeu(c,eu)).concat(ofAb().filter(c=>!c.tarefa&&!c.prevId&&tecEh(c,eu)));
  const meus=ofPeds().filter(p=>ofN(p.porNome)===ofN(eu)).slice(0,6);
  const corpo=`<div class="of-pg"><section class="of-col of-pf"><label class="of-lb big" for="of-pt">O que você precisa?</label><textarea id="of-pt" class="of-in" rows="3" maxlength="300" placeholder="Ex.: roldana de 4 polegadas com rolamento para o portão">${esc(P.t)}</textarea>
     <div class="of-g2"><label class="of-lb" for="of-pq">Quantidade<input id="of-pq" class="of-in" maxlength="20" value="${esc(P.qtd)}" autocomplete="off"></label>
      <label class="of-lb" for="of-po">Para qual serviço<select id="of-po" class="of-in"><option value="">Sem serviço (estoque da oficina)</option>${servs.map(c=>`<option value="${c.numero}" ${String(P.os)===String(c.numero)?'selected':''}>OS ${manNum(c.numero)} · ${esc((c.prevId?ofPrevTxt(c):(c.linha||'')+' · '+(c.defeito||'')).slice(0,50))}</option>`).join('')}</select></label></div>
     <b class="of-lb">Precisa para quando?</b><div class="of-mot">${OF_URG.map(([k,t,cl])=>`<button class="of-b ${P.urg===k?cl:'sec'}" data-act="of-urg" data-v="${k}" aria-pressed="${P.urg===k}">${t}</button>`).join('')}</div>
     ${ofMsg()}<div class="cq-rod"><button class="cq-sec" data-act="of-volta">Voltar (Esc)</button>${ofBt('of-peca-ok','Mandar para o Marcelo',null,'',!String(P.t||'').trim())}</div></section>
    <section class="of-col"><h2>Seus pedidos</h2>${meus.map(p=>{ const s=OF_PST[p.status]||OF_PST.enviado; return `<div class="of-c"><b>${esc(p.t.slice(0,60))}${p.qtd?' · '+esc(p.qtd):''}</b><span class="of-s ${s[1]}">${s[0]}${p.status==='comprado'&&p.prev?' · chega '+dm(p.prev):''}${p.status==='nao'&&p.mot?' · '+esc(p.mot):''}</span><small>${dm(hojeStr(new Date(p.em)))} ${ofHm(p.em)}${p.os?' · OS '+manNum(p.os):''}</small></div>`; }).join('')||'<p class="of-vz">Você ainda não pediu nada.</p>'}
     <small class="of-p">O Marcelo recebe o pedido no painel dele e marca: vai comprar, comprado, chegou ou não vai comprar (com o motivo).</small></section></div>`;
  return ofPagina('Pedir peça',corpo); }
function vOfOk(){ const T=S.tt, o=S.of.ok||{}; return ofPagina('Manutenção · oficina',`<section class="cq-fim"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg><h1>${esc(o.t||'Pronto')}</h1><p>${esc(o.d||'')}</p><p class="cq-p2">${esc(o.s||'')}</p><button class="cq-sec" data-act="of-volta">Voltar às minhas tarefas</button></section>`); }
/* quadro da semana: hoje + 4 dias úteis */
function ofSemDias(){ const out=[hojeStr()]; let d=hojeStr(); while(out.length<5){ d=ppUtil(addDias(d,1)); out.push(d); } return out; }
function ofSemItens(d,ate){ const out=[], h=hojeStr();
  try{ ppDoDia(d).forEach(x=>{ if(x.k==='rot') out.push({k:'prev',t:x.r.area+' · '+x.r.per,d:x.r.resp+' · '+ppItens(x.r).length+' itens',q:x.os?tecNomes(x.os):'',ok:x.os&&manFechada(x.os)});
      else if(x.k==='av') out.push({k:'prev',t:x.p.nome||x.p.titulo||x.p.equip||'Preventiva',d:x.p.equip||'',q:x.os?tecNomes(x.os):'',ok:x.os&&manFechada(x.os)});
      else if(x.k==='ag') out.push({k:'tar',t:(x.a.onde||'')+(x.a.local?' · '+x.a.local:'')+' · '+x.a.t,d:x.a.tipo&&typeof gchTipoT==='function'?gchTipoT(x.a.tipo):'',q:x.os?(tecNomes(x.os)||(ofAceito(x.os)?x.os.exec.aceito.nome:'')||x.os.paraTec||''):(x.a.paraTec||''),ok:x.os&&manFechada(x.os)}); }); }catch(e){}
  /* tarefa com prazo: no dia do prazo (fim de semana/feriado cai no dia útil antes; atrasada aparece em hoje) */
  ofTarefas().filter(c=>c.prazo&&(d===h?c.prazo<(ate||'9'):(c.prazo>=d&&c.prazo<(ate||'9')))).forEach(c=>out.push({k:'tar',t:(c.linha||'')+(c.local?' · '+c.local:'')+' · '+(c.defeito||''),d:c.prazo<h?'atrasada · prazo '+dm(c.prazo):'prazo '+dm(c.prazo),q:tecNomes(c)||(ofAceito(c)?c.exec.aceito.nome:'')||c.paraTec||'',ok:false}));
  return out; }
function vOfSem(){ const T=S.tt, f=S.of.fil||'todos', eu=T.p&&T.p.nome, h=hojeStr(), tecs=(typeof gchTecs==='function'?gchTecs():[]).map(t=>t.nome);
  const fs=[['todos','Todos']].concat(eu?[['eu','Só os meus']]:[]).concat(tecs.filter(n=>!eu||ofN(n)!==ofN(eu)).slice(0,6).map(n=>[n,String(n).split(' ')[0]])).concat([['sem','Sem ninguém']]);
  const passa=x=>f==='todos'||(f==='sem'?!x.q:f==='eu'?ofN(x.q).includes(ofN(eu)):ofN(x.q).includes(ofN(f)));
  const DS=ofSemDias(); const cols=DS.map((d,i)=>{ const its=ofSemItens(d,DS[i+1]||addDias(d,1)), vs=its.filter(passa);
    return `<section class="of-sd ${d===h?'hoje':''}"><div class="of-sdh"><b>${d===h?'Hoje · ':''}${ppSemana(d)} ${dm(d)}</b><span>${its.length} ${its.length===1?'serviço':'serviços'}</span></div>
      ${vs.map(x=>`<div class="of-si ${x.ok?'ok':x.k}"><span class="of-sik">${x.k==='prev'?'PREVENTIVA':'TAREFA DO MARCELO'}${x.d?' · '+esc(String(x.d).toUpperCase()):''}</span><b>${esc(String(x.t).slice(0,80))}</b><span class="of-s ${x.ok?'ok':x.q?'':'crit'}">${x.ok?'Feita'+(x.q?' · '+esc(x.q):''):x.q?'Com '+esc(x.q):'Sem ninguém · qualquer técnico'}</span></div>`).join('')||'<p class="of-vz">Nada para este filtro.</p>'}</section>`; }).join('');
  const corpo=`<div class="of-sf" role="group" aria-label="Mostrar">${fs.map(([k,t])=>`<button class="of-chip" data-act="of-sf" data-v="${esc(k)}" aria-pressed="${f===k}">${esc(t)}</button>`).join('')}
     <span class="of-leg"><i class="prev"></i>Preventiva do plano<i class="tar"></i>Tarefa programada<i class="ok"></i>Feita</span></div>
   <div class="of-sem">${cols}</div>
   <div class="cq-rod"><span>Só para ver: quem muda as datas e passa as tarefas é o Marcelo, em Preventivas.</span><button class="cq-sec" data-act="of-volta">Voltar (Esc)</button></div>`;
  return ofPagina('Quadro da semana',corpo); }
function vOficina(){ const T=S.tt; T.ocioso=60000;
  if(T.fase==='tecnico'&&T.p) T.fase='oftec';
  if(T.fase==='espera'||!T.p){ if(T.fase==='ofsem') return vOfSem(); if(T.fase!=='espera'&&T.fase!=='sem') T.fase='espera'; if(T.fase==='espera') return vOfEspera(); return null; }
  if(T.fase==='oftec') return vOfTec(); if(T.fase==='ofacc') return vOfAcc(); if(T.fase==='ofterm') return vOfTerm(); if(T.fase==='ofpeca') return vOfPeca();
  if(T.fase==='ofsem') return vOfSem(); if(T.fase==='ofok') return vOfOk();
  /* checklist da preventiva e "concluída" ficam na tela de chamados (38) */
  const h=typeof vChamados==='function'?vChamados():null; return h?h.replace('>Chamados da manutenção<','>Manutenção · oficina<'):null; }
{ const _vt=vTotem; vTotem=function(){ if(ofOn()){ const h=vOficina(); if(h) return h; } return _vt.apply(this,arguments); }; }

/* ---------- crachá ---------- */
{ const _ti=ttInicia; ttInicia=function(p){ if(!ofOn()) return _ti.apply(this,arguments); const T=S.tt;
    if(p.papel!=='tecnico'){ T.p=null; ttMsg('Este computador é da equipe de manutenção. Para chamar a manutenção, use o posto da linha.'); return; }
    Object.assign(T,{p,outra:false,linha:'',equipId:'',equip:'',defeito:'',txt:'',msg:'',numero:null,enviando:false,fase:'oftec',ult:Date.now()}); Object.assign(S.of,{acc:null,dev:null,term:null,peca:null,ok:null}); ttCamDesliga(); render(); }; }
{ const _tv=ttVoltar; ttVoltar=function(){ if(ofOn()&&S.tt.p&&S.tt.p.codigo&&S.tt.recente) delete S.tt.recente[S.tt.p.codigo]; return _tv.apply(this,arguments); }; }
setInterval(()=>{ const T=S.tt; if(ofOn()&&ttAtivo()&&T.fase==='ofok'&&Date.now()-T.ult>9000){ if(T.p){ T.fase='oftec'; T.ult=Date.now(); render(); } else ttVoltar(); } },700);

/* ---------- gravar ---------- */
function ofVai(f){ const T=S.tt; T.fase=f; T.msg=''; T.ult=Date.now(); render(); }
function ofOk(t,d,s){ S.of.ok={t,d,s}; ofVai('ofok'); }
async function ofGrava(c,up,o){ const agora=new Date().toISOString(), T=S.tt; up.hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o}]).slice(-200); await S.db.doc('chamados/'+c._id).update(up); Object.assign(c,up); }
async function ofComeca(c){ const T=S.tt, agora=new Date().toISOString(), E=Object.assign({},c.exec||{}); if(!E.tecnico) E.tecnico=T.p.nome; if(!E.inicio) E.inicio=manAgoraLocal(); E.tecnicoCracha=T.p.codigo||null;
  if(c.tarefa&&!ofAceito(c)) E.aceito={nome:T.p.nome,cracha:T.p.codigo||null,em:agora};
  await ofGrava(c,{exec:E,noLocalEm:c.noLocalEm||agora,noLocalPor:T.p.nome},(c.prevId&&!c.tarefa?'Preventiva começada':'Tarefa começada')+' por '+T.p.nome+' no computador da manutenção');
  if(c.status!=='Em execução') await manStatus(c,'Em execução'); }
async function ofAcao(a,b){ const T=S.tt, O=S.of; if(!T.p) return; const n=b&&b.dataset.n!=null?+b.dataset.n:null, c=n!=null?manDoc(n):null;
  try{
    if(a==='of-ver'){ O.acc=n; O.dev=null; ofVai('ofacc'); return; }
    if(a==='of-volta'){ O.dev=null; ofVai('oftec'); return; }
    if(a==='of-sai'){ ttVoltar(); return; }
    if(a==='of-nao'){ O.dev={mot:'',obs:''}; ofVai('ofacc'); return; }
    if(a==='of-mot'){ ofLe(); O.dev.mot=b.dataset.v; T.ult=Date.now(); render(); return; }
    if(a==='of-dev-volta'){ O.dev=null; ofVai('ofacc'); return; }
    if(a==='of-urg'){ ofLe(); O.peca.urg=b.dataset.v; T.ult=Date.now(); render(); return; }
    if(a==='of-tr'){ ofLe(); O.term.r=b.dataset.v; T.ult=Date.now(); render(); return; }
    if(a==='of-peca'){ O.peca={t:'',qtd:'1',os:'',urg:'semana'}; ofVai('ofpeca'); setTimeout(()=>{ const i=document.getElementById('of-pt'); i&&i.focus(); },60); return; }
    if(a==='of-term'){ O.term={n,r:'feito',obs:''}; ofVai('ofterm'); return; }
    if(T.enviando) return;
    if(a==='of-ag'||a==='of-ad'||a==='of-comecar'){ if(!c) return; if(a!=='of-comecar'&&!ofPend(c)){ T.msg='Outro técnico já pegou esta tarefa.'; render(); return; }
      T.enviando=true; render();
      if(a==='of-ad'){ const E=Object.assign({},c.exec||{},{aceito:{nome:T.p.nome,cracha:T.p.codigo||null,em:new Date().toISOString(),depois:true}}); await ofGrava(c,{exec:E},'Tarefa aceita por '+T.p.nome+' para depois'); T.enviando=false; toast('OS '+manNum(c.numero)+': aceita para depois. Fica em "Comigo".'); ofVai('oftec'); return; }
      await ofComeca(c); T.enviando=false; toast('OS '+manNum(c.numero)+': começada por '+T.p.nome+'.'); ofVai('oftec'); return; }
    if(a==='of-junto'){ if(!c||tecEh(c,T.p.nome)) return; if(c.exec&&c.exec.ajudante&&c.exec.ajudante.nome){ T.msg='Este serviço já tem dois técnicos.'; render(); return; } T.enviando=true; render();
      const E=Object.assign({},c.exec||{},{ajudante:{nome:T.p.nome,cracha:T.p.codigo||null,em:new Date().toISOString()}}); await ofGrava(c,{exec:E},'Segundo técnico entrou: '+T.p.nome+(T.p.codigo?' (crachá)':''));
      T.enviando=false; toast('OS '+manNum(c.numero)+': você entrou junto com '+(E.tecnico||'o técnico')+'.'); ofVai('oftec'); return; }
    if(a==='of-dev-ok'){ const cc=manDoc(O.acc), D=O.dev; if(!cc||!D||!D.mot) return; ofLe(); T.enviando=true; render();
      const agora=new Date().toISOString(), dv=(cc.devolvidas||[]).concat([{nome:T.p.nome,cracha:T.p.codigo||null,mot:D.mot,obs:String(D.obs||'').trim(),em:agora}]);
      const up={devolvidas:dv,devolvidaEm:agora}; if(cc.paraTec&&ofN(cc.paraTec)===ofN(T.p.nome)) up.paraTec=null;
      await ofGrava(cc,up,'Tarefa devolvida por '+T.p.nome+': '+D.mot+(D.obs?' — '+D.obs:'')); T.enviando=false; O.dev=null;
      ofOk('Tarefa devolvida para o Marcelo','OS '+manNum(cc.numero)+' · '+D.mot,'O Marcelo vê o motivo no painel dele.'); return; }
    if(a==='of-term-ok'){ const R=O.term, cc=R&&manDoc(R.n); if(!cc) return; ofLe(); const obs=String(R.obs||'').trim();
      if(R.r==='peca'){ if(!obs) return; O.peca={t:obs,qtd:'1',os:String(cc.numero),urg:'semana'}; ofVai('ofpeca'); return; }
      T.enviando=true; render(); const agora=new Date().toISOString();
      if(R.r==='parte'){ const E=Object.assign({},cc.exec||{}); E.partes=(E.partes||[]).concat([{nome:T.p.nome,obs,em:agora}]); if(!E.tecnico){ E.tecnico=T.p.nome; E.inicio=manAgoraLocal(); }
        await ofGrava(cc,{exec:E},'Feito em parte por '+T.p.nome+(obs?': '+obs:'')); T.enviando=false; ofOk('Anotado: feito em parte','OS '+manNum(cc.numero)+(obs?' · '+obs:''),'A tarefa continua com você.'); return; }
      if(cc.tarefa){ await tfFeitoTec(cc,T.p,obs); if(cc.paradaId) await ttLiberaPorTecnico(cc,T.p);
        T.enviando=false; ofOk('Feito · OS '+manNum(cc.numero),(cc.linha||'')+' · '+String(cc.defeito||'').slice(0,80),'Fica "esperando o Marcelo conferir". Fecha quando ele confirmar.'); return; }
      const E=Object.assign({},cc.exec||{},{servicos:obs||((cc.prevId&&!cc.tarefa)?'Preventiva feita':'Tarefa concluída')+' no computador da manutenção',tecnico:(cc.exec&&cc.exec.tecnico)||T.p.nome,tecnicoCracha:T.p.codigo||null}); if(!E.inicio) E.inicio=manAgoraLocal();
      await ofGrava(cc,{exec:E,concluidoPorNome:T.p.nome,concluidoPorCracha:T.p.codigo||null},'Concluído por '+T.p.nome+' no computador da manutenção'+(obs?': '+obs:''));
      cc._mzOk=true; cc._ppOk=true; try{ await manStatus(cc,'Concluída'); } finally { delete cc._mzOk; delete cc._ppOk; }
      if(cc.status!=='Concluída'){ T.enviando=false; T.msg='Não foi possível concluir. Verifique a internet e toque de novo.'; render(); return; }
      if(cc.paradaId) await ttLiberaPorTecnico(cc,T.p);
      T.enviando=false; ofOk('Feito · OS '+manNum(cc.numero),(cc.prevId&&!cc.tarefa?ofPrevTxt(cc):(cc.linha||'')+' · '+String(cc.defeito||'').slice(0,80)),'O Marcelo já vê como feita.'); return; }
    if(a==='of-peca-ok'){ ofLe(); const P=O.peca, t=String(P.t||'').trim(); if(!t) return; T.enviando=true; render();
      const agora=new Date().toISOString(), os=P.os?+P.os:null, oc=os?manDoc(os):null, id='pp'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      const d={t,qtd:String(P.qtd||'').trim(),os,osTxt:oc?(oc.prevId?ofPrevTxt(oc):(oc.linha||'')+' · '+(oc.defeito||'')).slice(0,80):'',urg:P.urg||'semana',porNome:T.p.nome,cracha:T.p.codigo||null,por:S.uid||null,em:agora,status:'enviado',hist:[{em:agora,o:'Pedido feito por '+T.p.nome}]};
      await S.db.doc('pedpecas/'+id).set(d); S.pedpecas=[Object.assign({_id:id},d)].concat(S.pedpecas||[]);
      if(oc) await ofGrava(oc,{esperaPeca:{id,t,em:agora}},'Esperando peça: '+t+' (pedido de '+T.p.nome+')');
      T.enviando=false; ofOk('Pedido mandado para o Marcelo',t+(d.qtd?' · '+d.qtd:'')+' · '+ofUrgT(d.urg).toLowerCase(),oc?'A OS '+manNum(oc.numero)+' fica "esperando peça".':'Você acompanha em "Seus pedidos".'); return; }
  }catch(e){ T.enviando=false; console.warn('[oficina]',a,e); T.msg='Não foi possível gravar agora'+(typeof cqErroTxt==='function'?' ('+cqErroTxt(e)+')':'')+'. Toque de novo.'; render(); } }
/* o que foi digitado fica guardado antes de redesenhar */
function ofLe(){ const v=id=>{ const e=document.getElementById(id); return e?e.value:null; }, O=S.of;
  if(O.peca){ const t=v('of-pt'), q=v('of-pq'), o=v('of-po'); if(t!=null) O.peca.t=t; if(q!=null) O.peca.qtd=q; if(o!=null) O.peca.os=o; }
  if(O.term){ const t=v('of-tobs'); if(t!=null) O.term.obs=t; } if(O.dev){ const t=v('of-dobs'); if(t!=null) O.dev.obs=t; } }
document.addEventListener('input',ev=>{ if(!ofOn()||!ttAtivo()) return; const id=ev.target&&ev.target.id; if(!/^of-/.test(id||'')) return; S.tt.ult=Date.now(); ofLe();
  const b=document.querySelector('[data-act="of-peca-ok"]'); if(b&&id==='of-pt') b.disabled=!String(S.of.peca.t||'').trim()||S.tt.enviando;
  const b2=document.querySelector('[data-act="of-term-ok"]'); if(b2&&id==='of-tobs'&&S.of.term&&S.of.term.r==='peca') b2.disabled=!String(S.of.term.obs||'').trim(); });
document.addEventListener('change',ev=>{ if(ofOn()&&ev.target&&ev.target.id==='of-po'){ S.tt.ult=Date.now(); ofLe(); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="of-"]'); if(!b||!ofOn()||!ttAtivo()) return; if(b.disabled) return; ev.preventDefault(); const a=b.dataset.act, T=S.tt; T.ult=Date.now();
  if(a==='of-som'){ try{ const A=window.AudioContext||window.webkitAudioContext; const c=S.man._ac||(S.man._ac=new A()); c.resume&&c.resume(); setTimeout(()=>{ try{ manBip(); }catch(e){} render(); },150); }catch(e){} return; }
  if(a==='of-sil'){ S.of.alerta.forEach(id=>S.of.cal.add(id)); S.of.alerta=[]; render(); return; }
  if(a==='of-sem'){ S.of.fil=T.p?'eu':'todos'; T.fase='ofsem'; T.msg=''; render(); return; }
  if(a==='of-sf'){ S.of.fil=b.dataset.v; render(); return; }
  if(a==='of-volta'&&!T.p){ ttVoltar(); return; }
  ofAcao(a,b); },true);
document.addEventListener('keydown',ev=>{ if(ev.key!=='Escape'||!ofOn()||!ttAtivo()||document.getElementById('trava-m')) return; const T=S.tt;
  if(['ofacc','ofterm','ofpeca','ofok','cqchk'].includes(T.fase)||(T.fase==='ofsem'&&T.p)){ ev.preventDefault(); S.of.dev=null; T.fase='oftec'; T.msg=''; T.ult=Date.now(); render(); return; }
  if(T.fase==='oftec'||T.fase==='ofsem'){ ev.preventDefault(); ttVoltar(); } });

/* ---------- monitor da TV: tarefa aceita já tem dono (para o alarme) ---------- */
{ const _mt=mm2Tec; mm2Tec=function(c){ return _mt.apply(this,arguments)||ofAceito(c); }; }

/* ===================== tarefa do Marcelo: o técnico marca feita, o Marcelo confere e fecha (pedido de 22/10) =====================
   feitoTec {nome,cracha,em,obs} no chamado; continua "Em execução" até o gestor confirmar (gchFeito fecha no nome do técnico,
   com conferidoPor) ou reabrir ("Não está feito" → exec.reaberta[] {mot,por,em}, feitoTec:null). */
function tfConf(c){ return !!(c&&c.tarefa&&c.feitoTec&&c.feitoTec.nome&&!manFechada(c)); }
async function tfFeitoTec(c,p,obs){ const agora=new Date().toISOString(), E=Object.assign({},c.exec||{});
  if(!E.tecnico) E.tecnico=p.nome; if(!E.inicio) E.inicio=manAgoraLocal(); E.tecnicoCracha=p.codigo||null; E.fim=manAgoraLocal(); E.servicos=obs||E.servicos||'Tarefa feita';
  const ft={nome:p.nome,cracha:p.codigo||null,em:agora,obs:obs||''}, hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Tarefa feita por '+p.nome+(obs?': '+obs:'')+' · esperando o gestor conferir'}]).slice(-200);
  await S.db.doc('chamados/'+c._id).update({exec:E,feitoTec:ft,hist}); Object.assign(c,{exec:E,feitoTec:ft,hist}); if(c.status!=='Em execução') await manStatus(c,'Em execução'); }
async function tfReabre(c,mot){ const agora=new Date().toISOString(), nome=(typeof gchNome==='function'?gchNome():'Gestor'), E=Object.assign({},c.exec||{});
  E.reaberta=(E.reaberta||[]).concat([{mot,por:nome,em:agora,feitoPor:c.feitoTec&&c.feitoTec.nome}]); delete E.fim;
  const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Gestor ('+nome+') reabriu: não está feito'+(mot?' — '+mot:'')}]).slice(-200);
  await S.db.doc('chamados/'+c._id).update({exec:E,feitoTec:null,hist}); Object.assign(c,{exec:E,feitoTec:null,hist}); }
/* computador de chamados / posto: tarefa feita não mostra mais "Terminar" */
{ const _vc=vChamados; vChamados=function(){ let h=_vc.apply(this,arguments); if(!h) return h; try{ (S.chamados||[]).filter(tfConf).forEach(c=>{
    h=h.replace(new RegExp('<button class="cq-bt [^"]*" data-act="cq-terminar" data-n="'+c.numero+'"[^>]*>[\\s\\S]*?</button>'),'<div class="cq-vz" style="padding:0;font-size:clamp(16px,2.2vh,22px)">Feita · esperando o gestor conferir</div>'); }); }catch(e){} return h; }; }
/* tela Chamados do gestor: "Para conferir" */
{ const _gl=gchLista; gchLista=function(){ const r=_gl.apply(this,arguments); try{ r.m.conf=(S.chamados||[]).filter(tfConf); if(S.gch.f==='conf') r.xs=r.m.conf.slice().sort((a,b)=>String(a.feitoTec.em).localeCompare(String(b.feitoTec.em))); }catch(e){} return r; }; }
{ const _gs=gchSit; gchSit=function(c){ if(tfConf(c)) return ['Feita por '+c.feitoTec.nome+' às '+ofHm(c.feitoTec.em)+(c.feitoTec.obs?' · '+c.feitoTec.obs:'')+' · falta você conferir','and']; const r=_gs.apply(this,arguments);
    try{ if(!manFechada(c)&&c.exec&&(c.exec.reaberta||[]).length&&c.exec.tecnico) return [r[0]+' · reaberta por você','and']; }catch(e){} return r; }; }
{ const _v=S.extViews.gxch; S.extViews.gxch=function(){ let h=_v.apply(this,arguments); try{ const G=S.gch, n=(S.chamados||[]).filter(tfConf);
    const chip=`<button class="gx-chip" data-act="gch-f" data-v="conf" aria-pressed="${G.f==='conf'}">Para conferir (${n.length})</button>`;
    h=h.replace(/(<button class="gx-chip" data-act="gch-f" data-v="abertos"[^>]*>[^<]*<\/button>)/,'$1'+chip);
    n.forEach(c=>{ const id=esc(c._id);
      h=h.replace(`<button class="btn gch-bf" data-act="gch-feito" data-id="${id}">Marcar como feito</button>`,`<button class="btn gch-bf" data-act="gch-feito" data-id="${id}">Conferi: está feito</button><button class="btn sec gx-bs" data-act="tf-reab" data-id="${id}">Não está feito</button>`);
      if(G.reab===c._id){ const i=h.indexOf(`data-act="tf-reab" data-id="${id}"`), j=i>=0?h.indexOf('</article>',i):-1;
        if(j>=0) h=h.slice(0,j)+`<div class="gch-cf"><label class="gx-f">O que falta? (o técnico vê)<input id="tf-mot" maxlength="160" placeholder="Ex.: o portão ainda arrasta"></label><div class="gch-cfb"><button class="btn sec" data-act="tf-reab-nao">Voltar</button><button class="btn" data-act="tf-reab-ok" data-id="${id}" ${G.busy?'disabled':''}>Devolver para o técnico</button></div></div>`+h.slice(j); } }); }catch(e){} return h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="tf-reab"]'); if(!b) return; const G=S.gch, a=b.dataset.act;
  if(a==='tf-reab'){ G.reab=b.dataset.id; G.feito=null; render(); setTimeout(()=>{ const i=document.getElementById('tf-mot'); i&&i.focus(); },50); return; }
  if(a==='tf-reab-nao'){ G.reab=null; render(); return; }
  if(a==='tf-reab-ok'){ const c=(S.chamados||[]).find(x=>x._id===b.dataset.id); if(!c||G.busy) return; const mot=String((document.getElementById('tf-mot')||{}).value||'').trim(); G.busy=true; render();
    try{ await tfReabre(c,mot); toast('OS '+manNum(c.numero)+' voltou para '+(c.exec.tecnico||'o técnico')+'.'); }catch(e){ toast('Não foi possível gravar. Verifique a internet.'); } G.busy=false; G.reab=null; render(); } });
/* contador e sino do gestor */
{ const _b=gxnBadges; gxnBadges=function(){ const b=_b.apply(this,arguments); try{ const n=(S.chamados||[]).filter(tfConf).length; if(n) b.gxch=(b.gxch||0)+n; }catch(e){} return b; }; }
{ const _al=gxAlertas; gxAlertas=function(){ let out=_al.apply(this,arguments); try{ const xs=(S.chamados||[]).filter(tfConf);
    out=out.filter(a=>!(a.n&&tfConf(manDoc(a.n)))&&!(/passou do prazo|passaram do prazo/.test(a.t||'')&&xs.length&&!(S.chamados||[]).some(c=>c.tarefa&&!manIgnorar(c)&&!manFechada(c)&&!tfConf(c)&&c.prazo&&c.prazo<hojeStr())));
    if(xs.length) out.unshift({c:'warn',t:xs.length===1?'Tarefa '+manNum(xs[0].numero)+' feita por '+xs[0].feitoTec.nome+': falta você conferir':xs.length+' tarefas feitas esperando você conferir',d:xs.slice(0,3).map(c=>(c.linha||'')+' · '+String(c.defeito||'').slice(0,40)).join(' · '),go:'gxch'}); }catch(e){} return out; }; }

/* ===================== lado do Marcelo: Pedidos de peça ===================== */
S.gpc=S.gpc||{f:'abertos',ed:null,busy:false,vistos:new Set()};
const ofPecAberto=p=>['enviado','visto','comprar','comprado'].includes(p.status||'enviado');
function vGxPecas(){ const G=S.gpc, ps=ofPeds(), ab=ps.filter(ofPecAberto), novos=ps.filter(p=>p.status==='enviado'||p.status==='visto');
  /* abrir a tela marca os novos como vistos */
  ps.filter(p=>(p.status||'enviado')==='enviado'&&!G.vistos.has(p._id)).forEach(p=>{ G.vistos.add(p._id); ofPecMuda(p,'visto',{},true); });
  const m={abertos:ab,fim:ps.filter(p=>!ofPecAberto(p)),todos:ps}, xs=(m[G.f]||ab).slice().sort((a,b)=>(a.urg==='hoje'?0:1)-(b.urg==='hoje'?0:1)||String(b.em).localeCompare(String(a.em)));
  const card=p=>{ const s=OF_PST[p.status||'enviado']||OF_PST.enviado, u=OF_URG.find(x=>x[0]===p.urg)||OF_URG[1], ed=G.ed&&G.ed.id===p._id?G.ed:null;
    const bts=[['comprar','Vai comprar'],['comprado','Comprado'],['chegou','Chegou'],['nao','Não vai comprar']].filter(([k])=>k!==p.status).map(([k,t])=>`<button class="btn sec gx-bs ${k==='nao'?'gx-del':''}" data-act="gpc-st" data-id="${esc(p._id)}" data-v="${k}">${t}</button>`).join('');
    return `<article class="gch-c ${p.urg==='hoje'&&ofPecAberto(p)?'crit':''} ${ofPecAberto(p)?'':'fe'}" data-b="${esc((p.t+' '+(p.porNome||'')+' '+(p.osTxt||'')).toLowerCase())}"><div class="gch-l"><div class="gch-h"><b>${esc(p.t)}</b>${p.qtd?`<span class="gch-n">${esc(p.qtd)}</span>`:''}<span class="gx-st ${u[2]==='crit'?'atr':u[2]==='pri'?'and':'pen'}">${esc(u[1])}</span></div>
      <span class="gch-s">Pedido por ${esc(p.porNome||'—')} · ${dm(hojeStr(new Date(p.em)))} ${ofHm(p.em)}${p.os?' · para a OS '+manNum(p.os)+(p.osTxt?' ('+esc(p.osTxt)+')':''):' · estoque da oficina'}</span>
      <span class="gx-st ${s[1]==='ok'?'ok':s[1]==='crit'?'atr':s[1]==='warn'?'and':'pen'} gch-sit">${esc(s[0]==='Enviado · ainda não visto'?'Novo':s[0].replace('Marcelo ',''))}${p.status==='comprado'&&p.prev?' · chega '+dm(p.prev):''}${p.status==='nao'&&p.mot?' · '+esc(p.mot):''}</span></div>
      <div class="gch-a">${bts}</div>
      ${ed?`<div class="gch-cf"><label class="gx-f">${ed.v==='nao'?'Por que não vai comprar?':'Chega quando? (opcional)'}${ed.v==='nao'?`<input id="gpc-mot" maxlength="120" placeholder="Ex.: tem no estoque do almox">`:`<input id="gpc-prev" type="date">`}</label><div class="gch-cfb"><button class="btn sec" data-act="gpc-canc">Voltar</button><button class="btn" data-act="gpc-ok" data-id="${esc(p._id)}" ${G.busy?'disabled':''}>Confirmar</button></div></div>`:''}</article>`; };
  const chip=(k,t)=>`<button class="gx-chip" data-act="gpc-f" data-v="${k}" aria-pressed="${G.f===k}">${t} (${m[k].length})</button>`;
  return `${banner()}${gxCab('MANUTENÇÃO · VISÃO DO GESTOR','Pedidos de peça','')}
   <div class="gch-ks"><div class="${novos.length?'crit':''}"><b>${novos.length}</b><span>novos</span></div><div class="${ab.filter(p=>p.urg==='hoje').length?'warn':''}"><b>${ab.filter(p=>p.urg==='hoje').length}</b><span>urgentes em aberto</span></div><div><b>${ps.filter(p=>p.status==='comprar'||p.status==='comprado').length}</b><span>comprando</span></div><div class="ok"><b>${ps.filter(p=>p.status==='chegou').length}</b><span>chegaram</span></div></div>
   <div class="gch-bar"><div class="gx-chips" role="group" aria-label="Mostrar">${chip('abertos','Em aberto')}${chip('fim','Chegaram ou não vão')}${chip('todos','Todos')}</div>
    <label class="gch-q">${ic('lupa',16,2)}<input placeholder="Buscar: peça, técnico, OS" aria-label="Buscar pedido" data-gchq></label></div>
   <section class="card gch-lst">${xs.length?xs.map(card).join(''):`<div class="empty">${G.f==='abertos'?'Nenhum pedido de peça em aberto.':'Nada aqui.'}</div>`}</section>
   <p class="gx-p">Os técnicos pedem a peça no computador da manutenção, escrevendo o que precisam. Você marca aqui o andamento; eles veem na hora em "Seus pedidos".</p>`; }
async function ofPecMuda(p,st,extra,quieto){ const agora=new Date().toISOString(), por=(typeof gchNome==='function'?gchNome():'Gestor');
  const lab=(OF_PST[st]||[st])[0]; const up=Object.assign({status:st,[st+'Em']:agora,[st+'Por']:por,hist:(p.hist||[]).concat([{em:agora,o:lab+' · '+por}]).slice(-50)},extra||{});
  try{ await S.db.doc('pedpecas/'+p._id).update(up); Object.assign(p,up);
    if(st==='chegou'&&p.os){ const c=manDoc(p.os); if(c&&c.esperaPeca&&c.esperaPeca.id===p._id) await S.db.doc('chamados/'+c._id).update({esperaPeca:Object.assign({},c.esperaPeca,{chegou:agora}),hist:(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Peça chegou: '+p.t}]).slice(-200)}); }
    if(!quieto) toast('Pedido: '+lab.toLowerCase()+'.'); }
  catch(e){ if(!quieto) toast('Não foi possível gravar. Verifique a internet.'); } if(!quieto) render(); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gpc-"]'); if(!b) return; const G=S.gpc, a=b.dataset.act, p=b.dataset.id&&ofPeds().find(x=>x._id===b.dataset.id);
  if(a==='gpc-f'){ G.f=b.dataset.v; render(); return; }
  if(a==='gpc-canc'){ G.ed=null; render(); return; }
  if(a==='gpc-st'&&p){ const v=b.dataset.v; if(v==='nao'||v==='comprado'){ G.ed={id:p._id,v}; render(); setTimeout(()=>{ const i=document.getElementById(v==='nao'?'gpc-mot':'gpc-prev'); i&&i.focus(); },50); return; } ofPecMuda(p,v); return; }
  if(a==='gpc-ok'&&p&&G.ed){ const v=G.ed.v, val=(document.getElementById(v==='nao'?'gpc-mot':'gpc-prev')||{}).value||''; G.ed=null; G.busy=true; await ofPecMuda(p,v,v==='nao'?{mot:val.trim()}:{prev:val||null}); G.busy=false; render(); return; } });
Object.assign(VIEWS,{gxpec:{nome:'Pedidos de peça',ic:'grid',mob:'Peças'}}); CRUMB.gxpec='Pedidos de peça';
S.extViews=S.extViews||{}; S.extViews.gxpec=vGxPecas;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxpec')){ const i=M.views.indexOf('gxch'); M.views.splice(i>=0?i+1:1,0,'gxpec'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxpec')){ const i=GXN_TELAS.indexOf('gxch'); GXN_TELAS.splice(i>=0?i+1:3,0,'gxpec'); }
{ const _b=gxnBadges; gxnBadges=function(){ const b=_b.apply(this,arguments); try{ const n=ofPeds().filter(p=>p.status==='enviado'||p.status==='visto').length; if(n) b.gxpec=n; }catch(e){} return b; }; }
/* avisos do gestor: pedidos de peça novos e tarefas devolvidas */
{ const _al=gxAlertas; gxAlertas=function(){ const out=_al.apply(this,arguments); try{
    const nv=ofPeds().filter(p=>p.status==='enviado'||p.status==='visto'), ur=nv.filter(p=>p.urg==='hoje');
    if(ur.length) out.unshift({c:'crit',t:ur.length===1?'Peça urgente: '+ur[0].t.slice(0,50):ur.length+' pedidos de peça urgentes',d:'Pedido por '+[...new Set(ur.map(p=>p.porNome))].join(', '),go:'gxpec'});
    const ou=nv.filter(p=>p.urg!=='hoje'); if(ou.length) out.push({c:'warn',t:ou.length===1?'Pedido de peça: '+ou[0].t.slice(0,50):ou.length+' pedidos de peça para ver',d:'Do computador da manutenção',go:'gxpec'});
    (S.chamados||[]).filter(c=>c.tarefa&&!c.prevId&&!manFechada(c)&&(c.devolvidas||[]).length&&!ofAceito(c)&&!(c.exec&&c.exec.tecnico)).forEach(c=>{ const d=c.devolvidas[c.devolvidas.length-1];
      out.push({c:'warn',t:'Tarefa '+manNum(c.numero)+' devolvida por '+d.nome,d:d.mot+(d.obs?' — '+d.obs:'')+' · '+String(c.defeito||'').slice(0,40),go:'gxch'}); }); }catch(e){} return out; }; }
/* situação da tarefa na tela Chamados do gestor */
{ const _gs=gchSit; gchSit=function(c){ const r=_gs.apply(this,arguments); try{ if(manFechada(c)) return r;
    if(!(c.exec&&c.exec.tecnico)&&ofAceito(c)) return ['Aceita por '+c.exec.aceito.nome+' para depois'+(c.exec.aceito.em?' · '+ofHm(c.exec.aceito.em):''),'and'];
    if(!(c.exec&&c.exec.tecnico)&&(c.devolvidas||[]).length){ const d=c.devolvidas[c.devolvidas.length-1]; return ['Devolvida por '+d.nome+': '+d.mot,'atr']; }
    if(c.esperaPeca&&!c.esperaPeca.chegou) return [r[0]+' · esperando peça','and']; }catch(e){} return r; }; }

/* ---------- estilo ---------- */
document.head.insertAdjacentHTML('beforeend',`<style id="of-css">
.of .cq-main{gap:clamp(10px,1.8vh,18px)}
.of-on{font-size:clamp(14px,1.7vh,18px);font-weight:700;color:var(--ok)}
.of-b{font:inherit;font-size:clamp(16px,2.1vh,22px);font-weight:700;border-radius:14px;padding:12px 22px;min-height:48px;cursor:pointer;border:2px solid var(--pri);background:var(--pri);color:var(--prifg)}
.of-b.sec{background:var(--card);color:var(--tx);border-color:var(--linha)}.of-b.ok{background:var(--ok);border-color:var(--ok);color:#fff}.of-b.crit{background:var(--crit);border-color:var(--crit);color:#fff}.of-b.warn{background:var(--warn);border-color:var(--warn);color:#fff}.of-b.neu{background:var(--tx2);border-color:var(--tx2);color:#fff}
.of-b.sm{font-size:15px;padding:8px 14px;min-height:40px}.of-b:disabled{opacity:.5;cursor:not-allowed}
.of-cols{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.of-col{background:var(--card);box-shadow:var(--sombra);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto}
.of-col h2{margin:0;font-size:clamp(18px,2.3vh,24px)}.of-col h2 small{font-size:.7em;color:var(--tx2);font-weight:500}
.of-hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.of-hd span{font-size:clamp(12px,1.5vh,15px);color:var(--tx2)}.of-hd2{margin-top:8px}
.of-l{display:flex;flex-direction:column;gap:10px}
.of-c{border-radius:12px;background:var(--pag);padding:12px 14px;display:flex;flex-direction:column;gap:3px;font-size:clamp(14px,1.8vh,17px)}
.of-c.crit{background:var(--critbg);box-shadow:inset 5px 0 0 var(--crit)}.of-c.warn{box-shadow:inset 5px 0 0 var(--warn)}
.of-ch{display:flex;justify-content:space-between;align-items:center;gap:8px}.of-ch b{font-size:clamp(16px,2.1vh,21px)}
.of-tag{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--linha);color:var(--tx2);white-space:nowrap}.of-tag.warn{color:var(--warn)}.of-tag.crit{color:var(--crit)}.of-tag.cheia.crit{background:var(--crit);color:#fff}
.of-s{color:var(--tx2)}.of-s.crit,b.of-s.crit,.of-c b.crit{color:var(--crit)}.of-s.ok{color:var(--ok);font-weight:600}.of-s.warn{color:var(--warn);font-weight:600}
.of-vz{margin:0;color:var(--tx2);font-size:clamp(14px,1.8vh,17px)}.of-p{color:var(--tx2);font-size:clamp(13px,1.6vh,15px)}
.of-tc{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--linha)}.of-tc b{display:block;font-size:clamp(15px,1.9vh,18px)}.of-tc small{color:var(--tx2);font-size:clamp(13px,1.6vh,15px)}
.of-av{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;background:var(--linha);color:var(--tx)}.of-av.on{background:var(--pri);color:var(--prifg)}
.of-ks{margin-top:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.of-ks>div{background:var(--pag);border-radius:12px;padding:10px;display:flex;flex-direction:column}.of-ks b{font-size:clamp(22px,3vh,30px)}.of-ks b.crit{color:var(--crit)}.of-ks b.ok{color:var(--ok)}.of-ks span{font-size:13px;color:var(--tx2)}
.of-cta{flex:none;background:#143F54;color:#fff;border-radius:16px;padding:14px 22px;display:flex;align-items:center;gap:20px}.of-cta svg{width:52px;height:52px;fill:none;stroke:#fff;stroke-width:2.5;flex:none}
.of-cta h1{margin:0;font-size:clamp(20px,3vh,30px)}.of-cta p{margin:2px 0 0;opacity:.85;font-size:clamp(14px,1.8vh,18px)}.of-cta>div:nth-child(2){flex:1}.of-ctab{display:flex;flex-direction:column;gap:8px}.of-cta .of-b{background:#fff;color:#143F54;border-color:#fff}.of-cta .of-b.sec{background:transparent;color:#fff;border-color:#fff}
.of-cta .cq-msg{background:#fff}
.of-tg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:16px}.of-tl{display:flex;flex-direction:column;gap:16px;min-height:0}.of-tl>.of-col{flex:1 1 auto}
.of-r{border-radius:12px;background:var(--pag);padding:12px 14px;display:flex;align-items:center;gap:14px}.of-r>div{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}.of-r b{font-size:clamp(16px,2.2vh,21px)}.of-r small{color:var(--tx2);font-size:clamp(13px,1.7vh,16px)}
.of-r.crit{background:var(--critbg);box-shadow:inset 5px 0 0 var(--crit)}.of-r.and{box-shadow:inset 5px 0 0 var(--ok)}.of-r.dep{box-shadow:inset 5px 0 0 var(--info)}
.of-rb{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.of-rb>span{color:var(--tx2);font-size:clamp(13px,1.7vh,16px)}
.of-big{background:var(--card);box-shadow:var(--sombra);border-radius:18px;padding:20px 26px;display:flex;flex-direction:column;gap:6px}.of-tx{margin:0;font-size:clamp(18px,2.6vh,26px)}
.of-ovk{font-size:clamp(12px,1.6vh,15px);font-weight:700;letter-spacing:.05em;color:var(--tx2)}.of-ovk.crit{color:var(--crit)}
.of-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.of-g3 .of-b{min-height:96px;font-size:clamp(18px,2.6vh,26px)}.of-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.of-op{font:inherit;cursor:pointer;text-align:left;border:2px solid var(--linha);border-radius:16px;background:var(--card);color:var(--tx);padding:16px 20px;display:flex;flex-direction:column;gap:4px;min-height:96px}.of-op b{font-size:clamp(20px,2.8vh,28px)}.of-op span{color:var(--tx2);font-size:clamp(14px,1.8vh,17px)}
.of-op.on.ok{border-color:var(--ok);box-shadow:inset 0 0 0 2px var(--ok)}.of-op.on.warn{border-color:var(--warn);box-shadow:inset 0 0 0 2px var(--warn)}.of-op.on.crit{border-color:var(--crit);box-shadow:inset 0 0 0 2px var(--crit)}
.of-h2{margin:0;font-size:clamp(20px,2.8vh,28px)}.of-mot{display:flex;flex-wrap:wrap;gap:10px}
.of-lb{display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:clamp(15px,1.9vh,18px)}.of-lb.big{font-size:clamp(20px,2.6vh,24px)}
.of-in{font:inherit;font-size:clamp(18px,2.4vh,22px);border:2px solid var(--linha);border-radius:12px;padding:12px 14px;background:var(--card);color:var(--tx);resize:none;font-weight:500}
.of-pg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px}.of-pf{gap:14px}
.of-sf{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.of-chip{font:inherit;font-size:clamp(14px,1.8vh,17px);font-weight:600;border-radius:999px;padding:9px 18px;cursor:pointer;border:1px solid var(--linha);background:var(--card);color:var(--tx)}.of-chip[aria-pressed="true"]{background:var(--pri);color:var(--prifg);border-color:var(--pri)}
.of-leg{margin-left:auto;display:flex;gap:8px;align-items:center;font-size:14px;color:var(--tx2)}.of-leg i{display:inline-block;width:14px;height:14px;border-radius:4px;margin-left:10px}.of-leg i.prev,.of-si.prev{background:#DCEBF2}.of-leg i.tar,.of-si.tar{background:#F6EEDC}.of-leg i.ok,.of-si.ok{background:#E2F0E8}
.of.esc .of-si.prev,.of.esc .of-leg i.prev{background:#1E3542}.of.esc .of-si.tar,.of.esc .of-leg i.tar{background:#3A3220}.of.esc .of-si.ok,.of.esc .of-leg i.ok{background:#1F3A2C}
.of-sem{flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.of-sd{background:var(--card);box-shadow:var(--sombra);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto}.of-sd.hoje{box-shadow:inset 0 5px 0 #E3312D,var(--sombra)}
.of-sdh{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.of-sdh b{font-size:clamp(16px,2.1vh,20px)}.of-sdh span{font-size:13px;color:var(--tx2)}
.of-si{border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:3px}.of-si b{font-size:clamp(14px,1.8vh,17px);line-height:1.2}.of-sik{font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--tx2)}.of-si .of-s{font-size:14px;font-weight:600}
.of-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:4vh 4vw;animation:ofPisca 1.2s ease-in-out infinite}
.of-ov.lin{background:#B5473F}.of-ov.tar{background:#AD8432}@keyframes ofPisca{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
.of-ovc{background:#fff;color:#143F54;border-radius:24px;padding:4vh 4vw;max-width:1100px;width:100%;display:flex;flex-direction:column;gap:1.4vh;text-align:center;align-items:center}
.of-ovc h1{margin:0;font-size:clamp(34px,6.4vh,72px);line-height:1.05}.of-ovd{margin:0;font-size:clamp(20px,3.2vh,34px)}.of-ovs{margin:0;font-size:clamp(15px,2.2vh,22px);color:#55666F}.of-ovi{margin:0;font-size:clamp(18px,2.8vh,28px);font-weight:700}
.of-ov.lin .of-ovk{color:#B5473F}.of-ov.tar .of-ovk{color:#8A6420}.of-ovb{display:flex;gap:12px;margin-top:1vh}.of-ovb .of-b{background:#143F54;border-color:#143F54;color:#fff}.of-ovb .of-b.sec{background:#fff;color:#143F54;border-color:#C9D3DA}.of-ovc small{color:#55666F;font-size:15px}
@media (max-width:1100px){.of-cols,.of-tg,.of-pg{grid-template-columns:1fr}.of-sem{grid-template-columns:repeat(2,minmax(0,1fr))}.of-g3{grid-template-columns:1fr}.of-main{overflow:auto}.of .cq-main{overflow:auto}.of-cta{flex-wrap:wrap}}
</style>`);
/* câmera: dentro da faixa do crachá (antes ficava no canto de baixo, por cima dos botões) */
function ofCamPos(){ const on=ofOn()&&ttAtivo(); document.body.classList.toggle('of-on',on); if(!on) return; const v=document.getElementById('tt-video'), sl=document.querySelector('.of-camslot'); if(!v) return;
  if(!sl){ v.style.cssText=''; return; } const r=sl.getBoundingClientRect(); Object.assign(v.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',right:'auto',bottom:'auto'}); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ ofCamPos(); }catch(e){} return x; }; }
setInterval(()=>{ try{ ofCamPos(); }catch(e){} },500); window.addEventListener('resize',()=>{ try{ ofCamPos(); }catch(e){} });
document.head.insertAdjacentHTML('beforeend',`<style id="of-cam-css">
.of-camslot{flex:none;width:clamp(150px,11vw,210px);aspect-ratio:16/10;border-radius:12px;border:2px solid #3E6A80;background:#0E2E3E;display:flex;align-items:center;justify-content:center;color:#9FC3D3;font-size:13px}
body.of-on #tt-video{border-radius:12px;border:2px solid #9FC3D3;box-shadow:none}
@media (max-width:1100px){.of-camslot{width:150px}}
</style>`);
/* ===FIM OFICINA=== */
