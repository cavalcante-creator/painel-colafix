/* Painel Colafix · 37-gestor-chamados.js (22/10)
   Chamados do gestor: o Marcelo cria tarefas para a manutenção (de linha ou fora das linhas: prédio, pátio, portaria…),
   acompanha quem assumiu e marca como feito. As tarefas são chamados normais (coleção chamados, tarefa:true),
   então aparecem para os técnicos no computador de chamados, no posto, no monitor e na Manutenção.
   O técnico assume ("Começar o conserto") e pode terminar; o gestor também pode marcar como feito. */
"use strict";
S.gch=S.gch||{f:'abertos',nova:false,feito:null,canc:null,busy:false};
const GCH_TIPOS=[['eletrico','Elétrico'],['mecanico','Mecânico'],['predial','Predial'],['serralheria','Serralheria'],['hidraulico','Hidráulico'],['limpeza','Limpeza / organização'],['outro','Outro']];
const GCH_LOCAIS=['Prédio / escritório','Pátio','Portaria','Almoxarifado','Refeitório','Oficina','Vestiário / banheiros','Estacionamento'];
const GCH_PRIO=[['urgente','Urgente','crit','toca o alarme na TV da manutenção'],['normal','Normal','warn','fazer assim que der'],['espera','Pode esperar','pen','quando sobrar tempo']];
const gchTipoT=k=>(GCH_TIPOS.find(x=>x[0]===k)||[])[1]||'';
const gchPrio=k=>GCH_PRIO.find(x=>x[0]===k)||GCH_PRIO[1];
const gchEhLinha=l=>linhasOrd().includes(l);
function gchNome(){ try{ return nomeDe(S.uid)||'Gestor'; }catch(e){ return 'Gestor'; } }
function gchTecs(){ try{ if(typeof crAssinar==='function') crAssinar(); }catch(e){} return ((S.cr&&S.cr.lista)||[]).filter(c=>c.papel==='tecnico'&&c.ativo!==false).sort((a,b)=>String(a.nome).localeCompare(String(b.nome))); }
function gchSit(c){ const E=c.exec||{};
  if(c.status==='Cancelada') return ['Cancelado','pen'];
  if(manFechada(c)) return ['Feito'+(c.concluidoPorNome?' · '+c.concluidoPorNome:'')+(c.concluidoEm?' · '+dm(hojeStr(new Date(c.concluidoEm)))+' '+hora(c.concluidoEm):''),'ok'];
  if(E.tecnico) return ['Com '+tecNomes(c)+(E.inicio?' desde '+(String(E.inicio).slice(0,10)===hojeStr()?'':dm(String(E.inicio).slice(0,10))+' ')+String(E.inicio).slice(11,16):''),'and'];
  return ['Aguardando técnico'+(c.paraTec?' · para '+c.paraTec:''),c.impacto==='parou'||c.prioridade==='urgente'?'atr':'pen']; }
function gchAtrasada(c){ return !manFechada(c)&&c.prazo&&c.prazo<hojeStr(); }
function gchLista(){ const f=S.gch.f, d30=new Date(Date.now()-30*864e5).toISOString();
  const xs=(S.chamados||[]).filter(c=>!c.excluido&&!c.prevId&&(+c.numero||0)<900000);
  const abertos=xs.filter(c=>!manIgnorar(c)&&!manFechada(c));
  const m={abertos, minhas:xs.filter(c=>c.tarefa&&c.por===S.uid&&c.status!=='Cancelada'&&(!manFechada(c)||String(c.concluidoEm||'')>=d30)), feitos:xs.filter(c=>c.status==='Concluída'&&String(c.concluidoEm||'')>=d30), todos:xs.filter(c=>!manFechada(c)||String(c.concluidoEm||c.criado||'')>=d30)};
  const peso=c=>manFechada(c)?9:(c.impacto==='parou'&&!(c.exec&&c.exec.tecnico))?0:c.prioridade==='urgente'&&!(c.exec&&c.exec.tecnico)?1:gchAtrasada(c)?2:!(c.exec&&c.exec.tecnico)?3:4;
  return {m, xs:(m[f]||m.abertos).slice().sort((a,b)=>peso(a)-peso(b)||(manFechada(a)?String(b.concluidoEm||'').localeCompare(String(a.concluidoEm||'')):String(a.criado||'').localeCompare(String(b.criado||''))))}; }

function vGxChamados(){ const G=S.gch, {m,xs}=gchLista(), ab=m.abertos, ag=ab.filter(c=>!(c.exec&&c.exec.tecnico)), ex=ab.filter(c=>c.exec&&c.exec.tecnico), atr=ab.filter(gchAtrasada);
  const card=c=>{ const [st,k]=gchSit(c), pr=c.tarefa?gchPrio(c.prioridade):null, fech=manFechada(c);
    const onde=esc(c.linha||'')+(c.local?' · '+esc(c.local):''), oq=c.defeito||'';
    const conf=G.feito===c._id?`<div class="gch-cf"><label class="gx-f">O que foi feito (opcional)<input id="gch-obs" maxlength="200" placeholder="Ex.: trocado o disjuntor do portão"></label><div class="gch-cfb"><button class="btn sec" data-act="gch-feito-nao">Voltar</button><button class="btn" data-act="gch-feito-ok" data-id="${esc(c._id)}" ${G.busy?'disabled':''}>Confirmar: está feito</button></div></div>`:'';
    return `<article class="gch-c ${fech?'fe':k==='atr'?'crit':''}" data-b="${esc((oq+' '+(c.linha||'')+' '+(c.local||'')+' '+((c.exec||{}).tecnico||'')+' '+manNum(c.numero)).toLowerCase())}">
      <div class="gch-l"><div class="gch-h"><b>${onde}</b><span class="gch-n">OS ${manNum(c.numero)}</span>${c.tarefa?`<span class="gx-st gch-tf">Tarefa</span>`:''}${pr?`<span class="gx-st ${pr[2]==='crit'?'atr':pr[2]==='warn'?'and':'pen'}">${pr[1]}</span>`:c.impacto==='parou'?'<span class="gx-st atr">Máquina parada</span>':''}${gchAtrasada(c)?`<span class="gx-st atr">Passou do prazo</span>`:''}</div>
        <p class="gch-o">${esc(oq)}</p>
        <span class="gch-s">${c.tipo?esc(gchTipoT(c.tipo)||c.tipo)+' · ':''}${c.equip&&!c.tarefa?esc(c.equip)+' · ':''}aberto ${dm(hojeStr(new Date(c.criado||Date.now())))} ${hora(c.criado)} por ${esc(c.nome||'—')}${c.prazo?' · prazo '+dm(c.prazo):''}</span>
        <span class="gx-st ${k} gch-sit">${esc(st)}</span></div>
      <div class="gch-a">${fech?'':`<button class="btn gch-bf" data-act="gch-feito" data-id="${esc(c._id)}">Marcar como feito</button>`}<button class="btn sec gx-bs" data-act="man-abrir" data-n="${c.numero}" data-ir="1">Ver detalhes</button>${!fech&&c.tarefa&&c.por===S.uid?`<button class="btn sec gx-bs gx-del" data-act="gch-canc" data-id="${esc(c._id)}">${G.canc===c._id?'Toque de novo para cancelar':'Cancelar'}</button>`:''}</div>${conf}</article>`; };
  const chip=(k,t)=>`<button class="gx-chip" data-act="gch-f" data-v="${k}" aria-pressed="${G.f===k}">${t} (${m[k].length})</button>`;
  return `${banner()}${gxCab('MANUTENÇÃO · VISÃO DO GESTOR','Chamados e tarefas',`<button class="btn" data-act="gch-nova">${ic('mais',18,2)}Nova tarefa para a manutenção</button>`)}
   <div class="gch-ks"><div class="${ag.length?'crit':''}"><b>${ag.length}</b><span>aguardando técnico</span></div><div><b>${ex.length}</b><span>em andamento</span></div><div class="${atr.length?'warn':''}"><b>${atr.length}</b><span>passaram do prazo</span></div><div class="ok"><b>${m.feitos.length}</b><span>feitos em 30 dias</span></div></div>
   <div class="gch-bar"><div class="gx-chips" role="group" aria-label="Mostrar">${chip('abertos','Abertos')}${chip('minhas','Minhas tarefas')}${chip('feitos','Feitos')}${chip('todos','Todos')}</div>
    <label class="gch-q">${ic('lupa',16,2)}<input id="gch-q" placeholder="Buscar: o que, onde, técnico, nº" aria-label="Buscar chamado" data-gchq></label></div>
   <section class="card gch-lst">${xs.length?xs.map(card).join(''):`<div class="empty">${G.f==='abertos'?'Nenhum chamado aberto. Tudo em dia.':'Nada aqui.'}</div>`}</section>
   <p class="gx-p">As tarefas aparecem para a manutenção no computador de chamados, no posto das linhas e no monitor. O técnico assume ao tocar em "Começar"; quando terminar, ele mesmo conclui — ou você marca como feito aqui.</p>
   ${G.nova?gchForm():''}`; }

function gchForm(){ const F=S.gch.fm||(S.gch.fm={onde:'',tipo:'',prio:'normal',prazo:addDias(hojeStr(),2),tec:'',texto:'',local:'',parou:false}), L=linhasOrd(), tecs=gchTecs();
  const linha=gchEhLinha(F.onde);
  return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="gch-ft"><div class="card gx-mc"><h2 id="gch-ft">Nova tarefa para a manutenção</h2>
   <label class="gx-f">O que precisa ser feito<textarea id="gch-tx" rows="2" maxlength="300" placeholder="Ex.: consertar o portão da portaria que não fecha">${esc(F.texto)}</textarea></label>
   <div class="gx-f3"><label class="gx-f">Onde<select id="gch-on"><option value="">Escolha…</option><optgroup label="Linhas">${L.map(l=>`<option ${F.onde===l?'selected':''}>${esc(l)}</option>`).join('')}</optgroup><optgroup label="Fora das linhas">${GCH_LOCAIS.map(l=>`<option ${F.onde===l?'selected':''}>${esc(l)}</option>`).join('')}<option value="__outro" ${F.onde==='__outro'?'selected':''}>Outro lugar…</option></optgroup></select></label>
    <label class="gx-f">${F.onde==='__outro'?'Qual lugar':'Detalhe do lugar (opcional)'}<input id="gch-lc" maxlength="60" value="${esc(F.local)}" placeholder="${F.onde==='__outro'?'Ex.: caixa d’água':'Ex.: máquina, portão 2, sala do PCP'}"></label></div>
   <div class="gx-f3"><label class="gx-f">Tipo de serviço<select id="gch-tp"><option value="">Escolha…</option>${GCH_TIPOS.map(([k,t])=>`<option value="${k}" ${F.tipo===k?'selected':''}>${t}</option>`).join('')}</select></label>
    <label class="gx-f">Para quem<select id="gch-tc"><option value="">Qualquer técnico</option>${tecs.map(t=>`<option value="${esc(t.nome)}" ${F.tec===t.nome?'selected':''}>${esc(t.nome)}${t.area?' · '+esc(t.area):''}</option>`).join('')}</select></label>
    <label class="gx-f">Prazo<input id="gch-pz" type="date" value="${esc(F.prazo||'')}"></label></div>
   <div class="gx-f">Urgência<div class="gch-pr" role="radiogroup">${GCH_PRIO.map(([k,t,c,s])=>`<button type="button" role="radio" class="gch-pb ${c}" data-act="gch-prio" data-v="${k}" aria-checked="${F.prio===k}"><b>${t}</b><span>${s}</span></button>`).join('')}</div></div>
   ${linha?`<label class="gch-ck"><input type="checkbox" id="gch-pa" ${F.parou?'checked':''}> A ${esc(F.onde)} está parada por causa disso (marca a parada da linha)</label>`:''}
   <div class="gx-ac gch-fb"><button class="btn sec" data-act="gch-canc-f">Cancelar</button><button class="btn" data-act="gch-salvar" ${S.gch.busy?'disabled':''}>${S.gch.busy?'Enviando…':'Enviar para a manutenção'}</button></div></div></div>`; }
function gchLe(){ const F=S.gch.fm; if(!F) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  const t=v('gch-tx'); if(t!=null) F.texto=t; const o=v('gch-on'); if(o!=null) F.onde=o; const l=v('gch-lc'); if(l!=null) F.local=l; const tp=v('gch-tp'); if(tp!=null) F.tipo=tp;
  const tc=v('gch-tc'); if(tc!=null) F.tec=tc; const pz=v('gch-pz'); if(pz!=null) F.prazo=pz; const pa=document.getElementById('gch-pa'); F.parou=!!(pa&&pa.checked&&gchEhLinha(F.onde)); }

async function gchSalvar(){ const G=S.gch, F=G.fm; gchLe(); if(G.busy) return; if(!S.db){ toast('Sem conexão com o servidor.'); return; }
  const texto=String(F.texto||'').trim(), outro=F.onde==='__outro', onde=outro?String(F.local||'').trim():F.onde, local=outro?'':String(F.local||'').trim();
  if(!texto){ toast('Escreva o que precisa ser feito.'); return; } if(!onde){ toast(outro?'Escreva qual é o lugar.':'Escolha onde é o serviço.'); return; }
  G.busy=true; render(); const agora=new Date().toISOString(), nome=gchNome(), ln=gchEhLinha(onde), parou=!!(F.parou&&ln);
  const base={linha:onde,local:local||null,quando:manAgoraLocal(),defeito:texto,tipo:F.tipo||null,impacto:parou?'parou':'nao',prioridade:parou?'urgente':(F.prio||'normal'),prazo:F.prazo||null,paraTec:F.tec||null,
    tarefa:true,nome,equip:(local?local+' · ':'')+'Tarefa'+(F.tipo?' · '+gchTipoT(F.tipo):''),equipId:null,cracha:null,status:'Aberta',criado:agora,por:S.uid||null,origem:'gestor',
    hist:[{em:agora,por:S.uid||null,o:'Tarefa criada pelo gestor ('+nome+')'+(F.tec?' para '+F.tec:'')+(F.prazo?' · prazo '+dm(F.prazo):'')}]};
  try{ let n=(S.chamados||[]).reduce((mx,c)=>Math.max(mx,(+c.numero||0)<900000?(+c.numero||0):0),0)+1, doc=null;
    for(let i=0;i<60&&!doc;i++,n++){ const ref=S.db.doc('chamados/os-'+manNum(n)); const r=await manTrava(ref,5000); if(!r.acquired) continue; const g=await ref.get(); if(g.exists&&g.data()&&g.data().numero) continue; doc=Object.assign({numero:n},base); await ref.set(doc); }
    if(!doc) throw new Error('Não consegui reservar o número. Tente de novo.');
    if(parou){ const abp=(S.paradas||[]).find(p=>p.linha===onde&&!p.fim); let pid=abp?abp._id:null;
      if(!pid){ const ref=await S.db.collection('paradas').add({linha:onde,motivo:'Manutenção',inicio:agora,fim:null,por:S.uid||null,obs:'OS '+manNum(doc.numero)+' · '+texto.slice(0,80),os:doc.numero}); pid=ref&&ref.id; }
      if(pid){ await S.db.doc('chamados/os-'+manNum(doc.numero)).update({paradaId:pid}); doc.paradaId=pid; } }
    if(!(S.chamados||[]).some(c=>c.numero===doc.numero)) S.chamados=[Object.assign({_id:'os-'+manNum(doc.numero)},doc)].concat(S.chamados||[]);
    G.nova=false; G.fm=null; G.f='abertos'; toast('Tarefa enviada para a manutenção · OS '+manNum(doc.numero)+'.'); }
  catch(e){ console.warn('[chamados do gestor] salvar',e); try{ manErro(e,'Não foi possível enviar a tarefa.'); }catch(_){ toast('Não foi possível enviar a tarefa.'); } }
  G.busy=false; render(); }

async function gchFeito(id){ const G=S.gch, c=(S.chamados||[]).find(x=>x._id===id); if(!c||G.busy||manFechada(c)) return;
  const obs=String((document.getElementById('gch-obs')||{}).value||'').trim(), nome=gchNome(), agora=new Date().toISOString();
  G.busy=true; render();
  try{ const E=Object.assign({},c.exec||{}); E.servicos=obs||E.servicos||'Marcado como feito pelo gestor'; if(!E.fim) E.fim=manAgoraLocal(); if(!E.inicio) E.inicio=E.fim;
    const ft=c.feitoTec&&c.feitoTec.nome?c.feitoTec:null; /* técnico já marcou como feita: o gestor só confere */
    const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:(ft?'Conferido e fechado pelo gestor ('+nome+') · feito por '+ft.nome:'Marcado como feito pelo gestor ('+nome+')')+(obs?': '+obs:'')}]).slice(-200);
    const up=ft?{exec:E,hist,concluidoPorNome:ft.nome,concluidoPorCracha:ft.cracha||null,conferidoPor:nome,conferidoEm:agora}:{exec:E,hist,concluidoPorNome:nome,feitoPeloGestor:true};
    await S.db.doc('chamados/'+c._id).update(up); Object.assign(c,up);
    c._mzOk=true; try{ await manStatus(c,'Concluída'); } finally { delete c._mzOk; }
    if(c.status==='Concluída'&&!c.liberadoEm&&c.impacto==='parou'){ try{ await S.db.doc('chamados/'+c._id).update({liberadoEm:agora,liberadoPor:nome}); c.liberadoEm=agora; c.liberadoPor=nome; }catch(e){} }
    G.feito=null; toast('OS '+manNum(c.numero)+(ft?' conferida e fechada.':' marcada como feita.')); }
  catch(e){ console.warn('[chamados do gestor] feito',e); toast('Não foi possível marcar como feito. Verifique a internet.'); }
  G.busy=false; render(); }

document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gch-"]'); if(!b) return; const a=b.dataset.act, G=S.gch;
  if(a==='gch-f'){ G.f=b.dataset.v; G.feito=null; render(); return; }
  if(a==='gch-nova'){ G.nova=true; G.fm=null; render(); setTimeout(()=>{ const t=document.getElementById('gch-tx'); t&&t.focus(); },50); return; }
  if(a==='gch-canc-f'){ G.nova=false; G.fm=null; render(); return; }
  if(a==='gch-prio'){ gchLe(); G.fm.prio=b.dataset.v; render(); return; }
  if(a==='gch-salvar'){ gchSalvar(); return; }
  if(a==='gch-feito'){ G.feito=b.dataset.id; render(); setTimeout(()=>{ const t=document.getElementById('gch-obs'); t&&t.focus(); },50); return; }
  if(a==='gch-feito-nao'){ G.feito=null; render(); return; }
  if(a==='gch-feito-ok'){ gchFeito(b.dataset.id); return; }
  if(a==='gch-canc'){ const id=b.dataset.id; if(G.canc!==id){ G.canc=id; render(); setTimeout(()=>{ if(G.canc===id){ G.canc=null; render(); } },5000); return; }
    const c=(S.chamados||[]).find(x=>x._id===id); G.canc=null; if(c){ c._motivoCancel='Cancelada pelo gestor'; manStatus(c,'Cancelada'); } return; } });
document.addEventListener('click',ev=>{ if(ev.target.classList&&ev.target.classList.contains('gx-modal')&&document.getElementById('gch-ft')){ S.gch.nova=false; S.gch.fm=null; render(); } });
/* "Onde" muda o formulário (outro lugar / linha parada) sem perder o que foi digitado */
document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='gch-on'){ gchLe(); render(); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.gch.nova){ S.gch.nova=false; S.gch.fm=null; render(); } });
/* busca sem redesenhar */
document.addEventListener('input',ev=>{ if(!(ev.target&&ev.target.hasAttribute&&ev.target.hasAttribute('data-gchq'))) return; const q=String(ev.target.value||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/\s+/).filter(Boolean);
  document.querySelectorAll('.gch-c[data-b]').forEach(r=>{ const t=r.dataset.b.normalize('NFD').replace(/[̀-ͯ]/g,''); r.hidden=!q.every(w=>t.includes(w)); }); });

/* ---------- registro: tela "Chamados" na Visão do gestor ---------- */
Object.assign(VIEWS,{gxch:{nome:'Chamados',ic:'chave',mob:'Chamados'}}); CRUMB.gxch='Chamados e tarefas';
S.extViews=S.extViews||{}; S.extViews.gxch=vGxChamados;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxch')){ const i=M.views.indexOf('gxpar'); M.views.splice(i>=0?i+1:1,0,'gxch'); } }
{ const i=GXN_TELAS.indexOf('gxpar'); if(!GXN_TELAS.includes('gxch')) GXN_TELAS.splice(i>=0?i+1:2,0,'gxch'); }
{ const _b=gxnBadges; gxnBadges=function(){ const b=_b.apply(this,arguments); try{ const n=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)&&!c.prevId&&(+c.numero||0)<900000&&!(c.exec&&c.exec.tecnico)).length; if(n) b.gxch=n; }catch(e){} return b; }; }

/* avisos do gestor: tarefa que não é urgente não vira "sem técnico há…"; prazo vencido vira aviso */
{ const _al=gxAlertas; gxAlertas=function(){ let out=_al.apply(this,arguments); try{
    const tf=n=>{ const c=manDoc(n); return c&&c.tarefa&&c.prioridade!=='urgente'&&c.impacto!=='parou'; };
    out=out.filter(a=>!(a.n&&tf(a.n)));
    const h=hojeStr(), atr=(S.chamados||[]).filter(c=>c.tarefa&&!manIgnorar(c)&&!manFechada(c)&&c.prazo&&c.prazo<h);
    if(atr.length) out.push({c:'warn',t:atr.length===1?'Tarefa '+manNum(atr[0].numero)+' passou do prazo':atr.length+' tarefas da manutenção passaram do prazo',d:atr.slice(0,3).map(c=>(c.linha||'')+' · '+String(c.defeito||'').slice(0,40)).join(' · '),go:'gxch'}); }catch(e){} return out; }; }

/* ---------- lado do técnico ---------- */
/* computador de chamados: tarefa termina sem perguntar a causa (não é máquina quebrada) */
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cq-terminar"]'); if(!b) return; const c=manDoc(+b.dataset.n); if(!c||!c.tarefa) return;
  ev.stopPropagation(); ev.preventDefault(); const T=S.tt; if(!T||!T.p||T.enviando) return; T.enviando=true; T.msg=''; render();
  try{ /* tarefa do gestor: o técnico marca como feita e ela só fecha quando o gestor confere (feitoTec) */
    await tfFeitoTec(c,T.p,'');
    if(c.paradaId) await ttLiberaPorTecnico(c,T.p);
    T.enviando=false; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+15000; T.numero=c.numero; T.causa=''; toast('OS '+manNum(c.numero)+' · tarefa feita, esperando o gestor conferir.'); T.fase='fimok'; T.ult=Date.now(); render(); }
  catch(e){ T.enviando=false; console.warn('[chamados] concluir tarefa',e); T.msg='Não foi possível concluir: '+((e&&e.message)||'verifique a internet')+'.'; render(); } },true);
/* textos da tela de chamados para as tarefas */
{ const _vc=vChamados; vChamados=function(){ let h=_vc.apply(this,arguments); if(!h) return h; try{ const T=S.tt;
    const tfs=(S.chamados||[]).filter(c=>c.tarefa&&!manFechada(c));
    tfs.forEach(c=>{ const k='data-n="'+c.numero+'"';
      h=h.replace(new RegExp('(data-act="cq-terminar" '+k+'[^>]*><b>)Terminar e liberar a máquina'),'$1Terminar a tarefa');
      h=h.replace(/<section class="cq-ch[\s\S]*?<\/section>/g,s=>s.includes('>OS '+manNum(c.numero)+'<')?s.replace(/>(Ainda funciona|Máquina parada) </,'>'+(c.impacto==='parou'?'Linha parada · ':'')+'Tarefa do gestor · '+gchPrio(c.prioridade)[1].toLowerCase()+(c.prazo?' · prazo '+dm(c.prazo):'')+(c.paraTec?' · para '+esc(c.paraTec):'')+' <').replace('Começar o conserto','Começar a tarefa'):s); });
    if(T&&T.fase==='fimok'){ const c=manDoc(T.numero); if(c&&c.tarefa) h=h.replace(/<h1>Máquina liberada · OS (\d+)<\/h1><p>[\s\S]*?<\/p><p class="cq-p2">[\s\S]*?<\/p>/,`<h1>Tarefa feita · OS $1</h1><p>${esc(c.linha||'')}${c.local?' · '+esc(c.local):''} · ${esc(String(c.defeito||'').slice(0,80))}</p><p class="cq-p2">Ela fecha quando o gestor conferir. Esta tela volta para o início sozinha.</p>`); }
  }catch(e){} return h; }; }
/* monitor da manutenção: tarefa mostra a urgência; só a urgente toca o alarme */
{ const _mi=mm2Imp; mm2Imp=function(c){ if(c&&c.tarefa&&c.impacto!=='parou'){ const p=gchPrio(c.prioridade); return ['tarefa · '+p[1].toLowerCase(),p[2]==='crit'?'crit':p[2]==='warn'?'warn':'neu']; } return _mi.apply(this,arguments); }; }
{ const _mt=mm2Tipo; mm2Tipo=function(c){ if(c&&c.tarefa) return String(c.defeito||'').slice(0,70); return _mt.apply(this,arguments); }; }

/* ---------- estilo ---------- */
{ const st=document.createElement('style'); st.id='gch-css'; st.textContent=`
.gch-ks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.gch-ks>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:2px;box-shadow:inset 0 4px 0 var(--line)}
.gch-ks>div b{font-size:30px;font-weight:700;line-height:1.1}.gch-ks>div span{font-size:13px;color:var(--muted)}
.gch-ks>.crit{box-shadow:inset 0 4px 0 var(--crit)}.gch-ks>.crit b{color:var(--crit)}.gch-ks>.warn{box-shadow:inset 0 4px 0 var(--warn)}.gch-ks>.ok{box-shadow:inset 0 4px 0 var(--ok)}
.gch-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}.gch-bar .gx-chips{margin:0}
.gch-q{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:0 12px;background:var(--surface);min-height:42px;flex:0 1 340px;color:var(--muted)}
.gch-q input{border:0;background:none;font:inherit;font-size:15px;color:var(--ink,inherit);flex:1;min-width:0;outline:none}
.gch-lst{display:flex;flex-direction:column;gap:0;padding:4px 18px}
.gch-c{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)}.gch-c:last-child{border-bottom:0}
.gch-c.crit{box-shadow:inset 4px 0 0 var(--crit);padding-left:12px}.gch-c.fe{opacity:.75}
.gch-l{flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:4px}
.gch-h{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}.gch-h b{font-size:16px}.gch-n{font-size:13px;color:var(--muted)}
.gch-tf{background:#E3EEF3;color:#1F5568}
.gch-o{margin:0;font-size:15px;line-height:1.4}.gch-s{font-size:13px;color:var(--muted)}.gch-sit{align-self:flex-start;margin-top:2px}
.gch-a{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.gch-bf{background:var(--ok);border-color:var(--ok)}
.gch-cf{flex:1 1 100%;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end;background:var(--sunken,#F3F6F8);border-radius:12px;padding:10px 14px}.gch-cf .gx-f{flex:1 1 280px;margin:0}.gch-cfb{display:flex;gap:8px}
.gch-pr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.gch-pb{font:inherit;text-align:left;display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:10px;border:2px solid var(--line);background:var(--surface);color:inherit;cursor:pointer}
.gch-pb b{font-size:15px}.gch-pb span{font-size:12px;font-weight:500;color:var(--muted)}
.gch-pb[aria-checked="true"].crit{border-color:var(--crit);background:rgba(181,71,63,.08)}.gch-pb[aria-checked="true"].warn{border-color:var(--warn);background:rgba(173,132,50,.1)}.gch-pb[aria-checked="true"].pen{border-color:var(--teal-strong,#143F54);background:rgba(20,63,84,.06)}
.gch-ck{display:flex;gap:10px;align-items:center;margin-top:12px;font-size:14px}.gch-ck input{width:20px;height:20px}
.gch-fb{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
@media (max-width:760px){.gch-ks{grid-template-columns:repeat(2,minmax(0,1fr))}.gch-pr{grid-template-columns:1fr}.gch-q{flex:1 1 100%}}
:root[data-theme="dark"] .gch-tf{background:#1E3A48;color:#CFE3EC}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .gch-tf{background:#1E3A48;color:#CFE3EC}}
`; document.head.appendChild(st); }
