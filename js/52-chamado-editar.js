/* Painel Colafix · 52-chamado-editar.js (26/10) — pedido da usuária:
   1) Editar e prorrogar chamados: o Marcelo (Visão do gestor), a administradora e quem abriu o chamado podem mudar o que fazer,
      onde, tipo de serviço, para quem, prazo e urgência de um chamado aberto (mesma janela da "Nova tarefa", em modo edição),
      e prorrogar o prazo com um toque (+1 dia, +3 dias, +1 semana). Tudo vai para a linha do tempo (hist) com o motivo.
   2) Detalhe da OS mais claro: cartão "O que fazer" com a descrição em destaque e os dados (onde, tipo, urgência, prazo, para quem,
      técnico, quem abriu), com Editar e Prorrogar no próprio cartão.
   3) "Baixar OS para imprimir" no padrão dos outros relatórios (faixa azul com as logos, quadros e rodapé de js/34), com os mesmos dados da OS. */
"use strict";
function gceNome(){ try{ return nomeDe(S.uid)||'—'; }catch(e){ return '—'; } }
function gcePode(c){ try{ if(!c||manFechada(c)||c.status==='Cancelada') return false; if(S.acs&&S.acs.dono) return true; if(viewOk('gxch')) return true; return !!S.uid&&c.por===S.uid; }catch(e){ return false; } }
const gceDia=s=>s?dm(s):'sem prazo';
function gcePrazoTxt(c){ if(!c.prazo) return ''; const h=hojeStr(); if(manFechada(c)) return 'Prazo '+dm(c.prazo);
  const d=Math.round((new Date(c.prazo+'T12:00')-new Date(h+'T12:00'))/864e5); return d<0?'Passou do prazo há '+(-d)+' dia'+(d===-1?'':'s'):d===0?'Prazo é hoje':'Faltam '+d+' dia'+(d===1?'':'s'); }
/* ---------- abrir a edição: a janela da "Nova tarefa" em modo edição ---------- */
function gceAbre(n){ const c=manDoc(+n); if(!c||!gcePode(c)) return; const L=linhasOrd(), noL=L.includes(c.linha)||GCH_LOCAIS.includes(c.linha);
  const tp=GCH_TIPOS.find(([k,t])=>k===c.tipo||t.toLowerCase()===String(c.tipo||'').toLowerCase());
  S.gch.nova=false; S.gch.fm={_id:c._id,_n:c.numero,texto:c.defeito||'',onde:noL?c.linha:'__outro',local:noL?(c.local||''):(c.linha||''),tipo:tp?tp[0]:'',prio:c.prioridade||(c.impacto==='parou'?'urgente':'normal'),prazo:c.prazo||'',tec:c.paraTec||'',parou:false,mot:''};
  render(); setTimeout(()=>{ const t=document.getElementById('gch-tx'); t&&t.focus(); },50); }
{ const _f=gchForm; gchForm=function(){ let h=_f.apply(this,arguments); const F=S.gch.fm; if(!F||!F._id) return h;
  h=h.replace('>Nova tarefa para a manutenção</h2>','>Editar chamado · OS '+manNum(F._n)+'</h2>').replace(/<label class="gch-ck">[\s\S]*?<\/label>/,'');
  const pz=`<div class="gce-pz"><span>Prorrogar o prazo:</span>${[[1,'+1 dia'],[3,'+3 dias'],[7,'+1 semana']].map(([d,t])=>`<button type="button" class="gx-chip" data-act="gce-mais" data-v="${d}">${t}</button>`).join('')}${F.prazo?'':'<small>(sem prazo: conta a partir de hoje)</small>'}</div>
    <label class="gx-f">Motivo da mudança <small>(aparece na linha do tempo)</small><input id="gce-mot" maxlength="160" value="${esc(F.mot||'')}" placeholder="Ex.: esperando a peça chegar"></label>`;
  h=h.replace('<div class="gx-ac gch-fb">',pz+'<div class="gx-ac gch-fb">');
  return h.replace(/data-act="gch-salvar"([^>]*)>[^<]*</,`data-act="gce-salvar"$1>${S.gch.busy?'Salvando…':'Salvar alterações'}<`); }; }
function gceLe(){ gchLe(); const m=document.getElementById('gce-mot'); if(m&&S.gch.fm) S.gch.fm.mot=m.value; }
function gceMais(d){ gceLe(); const F=S.gch.fm, h=hojeStr(); const base=F.prazo&&F.prazo>=h?F.prazo:h; F.prazo=addDias(base,d); render(); }
async function gceSalvar(){ const G=S.gch, F=G.fm; if(!F||!F._id||G.busy) return; gceLe(); const c=(S.chamados||[]).find(x=>x._id===F._id); if(!c) return;
  const texto=String(F.texto||'').trim(), outro=F.onde==='__outro', onde=outro?String(F.local||'').trim():F.onde, local=outro?'':String(F.local||'').trim();
  if(!texto){ toast('Escreva o que precisa ser feito.'); return; } if(!onde){ toast(outro?'Escreva qual é o lugar.':'Escolha onde é o serviço.'); return; }
  const novo={defeito:texto,linha:onde,local:local||null,tipo:F.tipo||null,prioridade:F.prio||'normal',prazo:F.prazo||null,paraTec:F.tec||null};
  if(!c.tarefa&&!F.tipo) delete novo.tipo; /* chamado da linha sem tipo de serviço: mantém o que veio */
  const nomes={defeito:'O que fazer',linha:'Onde',local:'Detalhe do lugar',tipo:'Tipo',prioridade:'Urgência',prazo:'Prazo',paraTec:'Para quem'};
  const fmt=(k,v)=>v==null||v===''?'—':k==='prazo'?dm(v):k==='prioridade'?gchPrio(v)[1]:k==='tipo'?(gchTipoT(v)||v):String(v);
  const muda=Object.keys(novo).filter(k=>String(c[k]==null?'':c[k])!==String(novo[k]==null?'':novo[k]));
  if(!muda.length){ toast('Nada mudou.'); G.fm=null; render(); return; }
  const agora=new Date().toISOString(), mot=String(F.mot||'').trim();
  const desc=muda.map(k=>k==='prazo'&&c.prazo&&novo.prazo&&novo.prazo>c.prazo?'prazo prorrogado de '+dm(c.prazo)+' para '+dm(novo.prazo):k==='defeito'?'o que fazer mudou':nomes[k].toLowerCase()+' de '+fmt(k,c[k])+' para '+fmt(k,novo[k]));
  const up={}; muda.forEach(k=>{ up[k]=novo[k]; });
  if(c.tarefa&&(muda.includes('local')||muda.includes('tipo'))) up.equip=(novo.local?novo.local+' · ':'')+'Tarefa'+(novo.tipo?' · '+gchTipoT(novo.tipo):'');
  if(muda.includes('paraTec')&&c.exec&&c.exec.aceito&&c.exec.aceito.nome&&novo.paraTec&&c.exec.aceito.nome!==novo.paraTec&&!(c.exec&&c.exec.tecnico)){ up.exec=Object.assign({},c.exec); delete up.exec.aceito; }
  up.hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Editado por '+gceNome()+': '+desc.join(' · ')+(mot?' (motivo: '+mot+')':'')}]).slice(-200);
  if(muda.includes('prazo')) up.prazoAntes=(c.prazoAntes||[]).concat([{de:c.prazo||null,para:novo.prazo||null,em:agora,por:gceNome(),mot:mot||null}]).slice(-30);
  G.busy=true; render();
  try{ await S.db.doc('chamados/'+c._id).update(up); Object.assign(c,up); G.fm=null; toast('OS '+manNum(c.numero)+' atualizada.'); }
  catch(e){ console.warn('[editar chamado]',e); toast('Não foi possível salvar. Confira a internet e tente de novo.'); }
  G.busy=false; render(); }
async function gceProrroga(n,d){ const c=manDoc(+n); if(!c||!gcePode(c)||S.gch.busy) return; const h=hojeStr(), base=c.prazo&&c.prazo>=h?c.prazo:h, novo=addDias(base,+d), agora=new Date().toISOString();
  const up={prazo:novo,prazoAntes:(c.prazoAntes||[]).concat([{de:c.prazo||null,para:novo,em:agora,por:gceNome(),mot:null}]).slice(-30),
    hist:(c.hist||[]).concat([{em:agora,por:S.uid||null,o:(c.prazo?'Prazo prorrogado de '+dm(c.prazo)+' para '+dm(novo):'Prazo marcado para '+dm(novo))+' por '+gceNome()}]).slice(-200)};
  S.gch.busy=true; render();
  try{ await S.db.doc('chamados/'+c._id).update(up); Object.assign(c,up); toast('Prazo da OS '+manNum(c.numero)+': '+dm(novo)+'.'); }catch(e){ toast('Não foi possível prorrogar. Confira a internet.'); }
  S.gch.busy=false; render(); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gce-"]'); if(!b) return; const a=b.dataset.act; ev.preventDefault();
  if(a==='gce-abrir'){ gceAbre(b.dataset.n); return; } if(a==='gce-mais'){ gceMais(+b.dataset.v); return; }
  if(a==='gce-salvar'){ gceSalvar(); return; } if(a==='gce-pr'){ gceProrroga(b.dataset.n,b.dataset.v); return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.gch.fm&&S.gch.fm._id&&!S.gch.nova){ S.gch.fm=null; render(); } });
['input','change'].forEach(t=>document.addEventListener(t,ev=>{ if(ev.target&&ev.target.id==='gce-mot'&&S.gch.fm) S.gch.fm.mot=ev.target.value; },true));
/* a janela de edição aparece na tela de Chamados do gestor e no detalhe da OS */
const gceModal=()=>S.gch.fm&&S.gch.fm._id&&!S.gch.nova?gchForm():'';
{ const _v=S.extViews.gxch||vGxChamados; S.extViews.gxch=function(){ let h=_v.apply(this,arguments);
  h=h.replace(/<button class="btn sec gx-bs" data-act="man-abrir" data-n="(\d+)" data-ir="1">Ver detalhes<\/button>/g,(m,n)=>{ const c=manDoc(+n); return m+(gcePode(c)?`<button class="btn sec gx-bs" data-act="gce-abrir" data-n="${n}">Editar / prorrogar</button>`:''); });
  return h+gceModal(); }; }
/* ---------- detalhe da OS: cartão "O que fazer" ---------- */
function gceSecao(h,marca){ const i=h.indexOf(marca); if(i<0) return null; const k=h.lastIndexOf('<section',i); if(k<0) return null; const re=/<\/?section\b/g; re.lastIndex=k; let m, d=0;
  while((m=re.exec(h))){ if(m[0]==='<section') d++; else { d--; if(d===0) return [k,h.indexOf('>',m.index)+1]; } } return null; }
function gceCartao(c){ const E=c.exec||{}, pr=c.tarefa?gchPrio(c.prioridade):null, imp=MAN_IMP[c.impacto], eqo=c.equipId&&typeof mxEquip==='function'&&mxEquip(c.equipId), pode=gcePode(c), pzt=gcePrazoTxt(c);
  const atr=!manFechada(c)&&c.prazo&&c.prazo<hojeStr();
  const it=(l,v,cl)=>v?`<div class="gce-i ${cl||''}"><span>${l}</span><b>${v}</b></div>`:'';
  const tec=E.tecnico?esc(tecNomes(c))+(E.inicio?` <small>desde ${String(E.inicio).slice(0,10)===hojeStr()?'':esc(dm(String(E.inicio).slice(0,10)))+' '}${esc(String(E.inicio).slice(11,16))}</small>`:''):(E.aceito&&E.aceito.nome?esc(E.aceito.nome)+' <small>aceitou'+(E.aceito.depois?' para depois':'')+'</small>':'<i class="gce-mut">ninguém ainda</i>');
  return `<section class="card gce-c">
    <div class="gce-top"><div><div class="label">${c.tarefa?'O QUE FAZER':c.prevId?'PREVENTIVA':'PROBLEMA'}</div><p class="gce-o">${esc(c.defeito||'—')}</p>
      <div class="gce-tags"><span class="pill ${manStCor(c.status)}">${esc(c.status||'')}</span>${pr?`<span class="pill ${pr[2]==='crit'?'crit':pr[2]==='warn'?'warn':'neu'}">${pr[1]}</span>`:imp?`<span class="pill ${imp[1]}">${esc(imp[0])}</span>`:''}${c.tarefa?'<span class="pill neu">Tarefa do gestor</span>':''}${pzt?`<span class="pill ${atr?'crit':'neu'}">${esc(pzt)}</span>`:''}${c.feitoTec&&c.feitoTec.nome&&!manFechada(c)?`<span class="pill ok">Feita por ${esc(c.feitoTec.nome)} · falta conferir</span>`:''}</div></div>
      ${pode?`<div class="gce-acs"><button class="btn" data-act="gce-abrir" data-n="${c.numero}">${ic('editar',16,2)}Editar</button><div class="gce-pr"><span>Prorrogar</span>${[[1,'+1 dia'],[3,'+3 dias'],[7,'+1 semana']].map(([d,t])=>`<button class="gx-chip" data-act="gce-pr" data-n="${c.numero}" data-v="${d}" ${S.gch.busy?'disabled':''}>${t}</button>`).join('')}</div></div>`:''}</div>
    <div class="gce-g">${it('Onde',esc(c.linha||'—')+(c.local?' · '+esc(c.local):''))}${it('Equipamento',!c.tarefa?esc((eqo&&eqo.nome)||c.equip||'')+(eqo&&eqo.tag?' <small>'+esc(eqo.tag)+'</small>':''):'')}${it('Tipo de serviço',c.tipo?esc(gchTipoT(c.tipo)||c.tipo):'')}
      ${it('Prazo',c.prazo?esc(dm(c.prazo))+((c.prazoAntes||[]).length?' <small>prorrogado '+(c.prazoAntes.length)+'×</small>':''):'',atr?'crit':'')}${it('Para quem',c.tarefa?esc(c.paraTec||'Qualquer técnico'):'')}${it('Técnico',tec)}
      ${it('Aberto por',esc(c.nome||'—')+(c.criado?' <small>'+esc(dm(hojeStr(new Date(c.criado))))+' às '+esc(hora(c.criado))+'</small>':''))}${c.status==='Cancelada'&&c.motivoCancel?it('Motivo do cancelamento',esc(c.motivoCancel)):''}
      ${c.liberadoEm&&!manFechada(c)?it('Máquina liberada',esc(hora(c.liberadoEm))+(c.liberadoPor?' · '+esc(c.liberadoPor):''),'ok'):''}</div></section>`; }
{ const _md=manDetalhe; manDetalhe=function(c){ let h=_md.apply(this,arguments); if(!c) return h; try{
    const r=gceSecao(h,'<div class="label">EQUIPAMENTO</div>'); const card=gceCartao(c);
    if(r) h=h.slice(0,r[0])+card+h.slice(r[1]); else { const i=h.indexOf('<section class="card">'); if(i>=0) h=h.slice(0,i)+card+h.slice(i); }
  }catch(e){ console.warn('[detalhe OS]',e); } return h+gceModal(); }; }
/* ---------- OS em PDF no padrão dos relatórios (mesmos dados da OS) ---------- */
manPdfOs=async function(o){ let img; try{ img=await gpImgs(); }catch(e){ img={}; } let P; try{ P=gpNovo('Ordem de serviço · OS '+manNum(o.numero),'Manutenção · '+(o.linha||'')+(o.local?' · '+o.local:'')+' · '+(o.status||''),img||{}); }catch(e){ toast(e.message||'Gerador de PDF indisponível.'); return; }
  const doc=P.doc, C=GPDF.cor, M=P.M, E=o.exec||{}, f=s=>s?dm(String(s).slice(0,10))+' '+String(s).slice(11,16):'';
  P.capa();
  const cel=(t,v,x,y,w,h)=>{ P.fc(C.soft); doc.roundedRect(x,y,w,h,1.4,1.4,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(6.4); P.tc(C.mut); doc.text(String(t).toUpperCase(),x+2.5,y+4.2);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); P.tc(C.ink); doc.text(doc.splitTextToSize(String(v==null?'':v),w-5).slice(0,Math.max(1,Math.floor((h-6)/3.8))),x+2.5,y+8.6); };
  const linha=(xs,h)=>{ h=h||12; P.cabe(h+2); const g=2.5, tot=xs.reduce((a,x)=>a+(x[2]||1),0), uw=(P.cw-g*(xs.length-1))/tot; let x=M; xs.forEach(([t,v,k])=>{ const w=uw*(k||1); cel(t,v,x,P.y,w,h); x+=w+g; }); P.y+=h+2.5; };
  const ck=(on,t,x,y)=>{ P.dc(C.mut); doc.setLineWidth(.25); doc.rect(x,y-2.7,2.9,2.9); if(on){ P.fc(C.pet); doc.rect(x+.55,y-2.15,1.8,1.8,'F'); } doc.setFont('helvetica',on?'bold':'normal'); doc.setFontSize(8.2); P.tc(C.ink); doc.text(t,x+4.2,y); return x+4.2+doc.getTextWidth(t)+5.5; };
  const cks=(t,ops,sel,cols)=>{ const per=cols||ops.length, rows=Math.ceil(ops.length/per), h=6+rows*5.6; P.cabe(h+2); P.fc(C.soft); doc.roundedRect(M,P.y,P.cw,h,1.4,1.4,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(6.4); P.tc(C.mut); if(t) doc.text(String(t).toUpperCase(),M+2.5,P.y+4.2);
    ops.forEach((op,i)=>{ const r=Math.floor(i/per), c=i%per, x=cols?M+2.5+c*(P.cw-5)/per:null; const y=P.y+(t?9.2:5.6)+r*5.6; if(cols) ck(sel(op),op,x,y); else { /* em sequência */ } });
    if(!cols){ let x=M+2.5; ops.forEach(op=>{ x=ck(sel(op),op,x,P.y+(t?9.2:5.6)); }); } P.y+=h+2.5; };
  const area=(t,txt,hMin)=>{ doc.setFont('helvetica','normal'); doc.setFontSize(9); const ls=doc.splitTextToSize(String(txt||''),P.cw-5); const h=Math.max(hMin||12,7+ls.length*4); P.cabe(h+2); cel(t,'',M,P.y,P.cw,h); P.tc(C.ink); doc.text(ls,M+2.5,P.y+8.6); P.y+=h+2.5; };
  const sec=(t,n,h)=>{ P.cabe(h||30); P.secao(t,n); };
  sec('1. Abertura do chamado','OS '+manNum(o.numero));
  linha([['Linha / local',(o.linha||'')+(o.local?' · '+o.local:''),1.2],['Data / horário da ocorrência',f(o.quando)],['Aberta em',o.criado?dm(o.criado.slice(0,10))+' '+hora(o.criado):'']]);
  linha([['Solicitante',o.nome||''],['Equipamento / sistema',o.equip||'',1.6]]);
  if(o.tarefa||o.prazo) linha([['Prazo',o.prazo?dm(o.prazo):''],['Para quem',o.paraTec||(o.tarefa?'Qualquer técnico':'')],['Urgência',o.tarefa?gchPrio(o.prioridade)[1]:'']]);
  cks('Impacto na produção',Object.keys(MAN_IMP).map(k=>MAN_IMP[k][0]),t=>MAN_IMP[o.impacto]&&MAN_IMP[o.impacto][0]===t);
  cks('Status',MAN_ST,t=>o.status===t,3);
  sec('2. Defeito / descrição do problema'); area('Descrição',o.defeito,14);
  sec('3. Tipo'); cks('Tipo de manutenção',MAN_TIPO,t=>E.tipo===t,6); linha([['Equipamento / sistema',o.equip||'',2],['Patrimônio / TAG','']]);
  sec('4. Serviços executados / procedimentos');
  if(E.diagnostico||E.causa) linha([['Diagnóstico',E.diagnostico||'',2],['Causa',E.causa||'']],14);
  area('Serviço realizado',E.servicos,18);
  sec('5. Materiais / peças utilizados'); { const ms=String(E.materiais||'').split('\n').map(z=>z.trim()).filter(Boolean); while(ms.length<4) ms.push('');
    P.tabela([{t:'Item',w:10},{t:'Descrição',w:90},{t:'Qtd.',w:18,al:'r'},{t:'Unid.',w:18}],ms.slice(0,12).map((m,i)=>{ const q=m.match(/[—-]\s*([\d.,]+)\s*([a-zA-Z]*)\s*$/); return [String(i+1).padStart(2,'0'),q?m.slice(0,q.index).trim():m,q?q[1]:'',q?q[2]:'']; })); }
  sec('6. Condição após a manutenção'); cks('',MAN_COND,t=>E.condicao===t,3);
  sec('7. Horas de serviço'); { const tot=E.inicio&&E.fim?((new Date(E.fim)-new Date(E.inicio))/36e5):null; linha([['Início',f(E.inicio)],['Término',f(E.fim)],['Total de horas',tot!=null&&tot>=0?tot.toFixed(2).replace('.',','):''],['Técnico responsável',E.tecnico?(typeof tecNomes==='function'?tecNomes(o):E.tecnico):'',1.6]]); }
  sec('8. Segurança'); cks('Condições verificadas?',['Sim','Não','N/A'],()=>false); cks('',['Desenergização','Bloqueio / LOTO','Ausência de tensão','EPI','Isolamento / sinalização','Permissão de Trabalho','Outros:'],()=>false,4);
  sec('9. Pendências / recomendações'); area('Observações / pendências',E.pendencias,12);
  sec('10. Aprovação do serviço'); { P.cabe(40); const w=(P.cw-4)/2; [['Responsável pela execução',E.tecnico?(typeof tecNomes==='function'?tecNomes(o):E.tecnico):''],['Responsável pela produção','']].forEach(([t,n],i)=>{ const x=M+i*(w+4), y=P.y;
      P.fc(C.soft); doc.roundedRect(x,y,w,36,1.4,1.4,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); P.tc(C.ink); doc.text(t,x+3,y+5.5);
      [['Nome',n,13],['Assinatura','',23],['Data','',32]].forEach(([l,v,yy])=>{ doc.setFont('helvetica','normal'); doc.setFontSize(6.6); P.tc(C.mut); doc.text(l.toUpperCase(),x+3,y+yy-4.6); P.dc(C.cinza); doc.setLineWidth(.3); doc.line(x+3,y+yy,x+w-3,y+yy); P.tc(C.ink); doc.setFontSize(8.5); if(v) doc.text(String(v),x+3,y+yy-1); }); });
    P.y+=40; }
  P.texto('Preencher todos os campos aplicáveis e anexar evidências quando necessário.',{fs:7.5});
  P.fim('OS_'+manNum(o.numero)+'_'+String(o.linha||'').replace(/[^\w]+/g,'_')+'.pdf'); toast('OS '+manNum(o.numero)+' em PDF. Abra e imprima.'); };
document.head.insertAdjacentHTML('beforeend',`<style id="gce-css">
.gce-c{border-left:4px solid var(--teal,#2B6A87)}
.gce-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}.gce-top>div:first-child{flex:1 1 380px;min-width:0}
.gce-o{font-size:22px;line-height:1.3;font-weight:600;margin:6px 0 10px;white-space:pre-wrap;overflow-wrap:anywhere}
.gce-tags{display:flex;gap:6px;flex-wrap:wrap}
.gce-acs{display:flex;flex-direction:column;gap:8px;align-items:flex-end}.gce-pr{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.gce-pr span{font-size:12px;color:var(--muted)}
.gce-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line,#E3E8EC)}
.gce-i{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:10px;background:rgba(127,140,150,.08)}.gce-i span{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.gce-i b{font-size:15px;font-weight:600}.gce-i small{font-weight:400;color:var(--muted);font-size:12px}.gce-i.crit{background:rgba(192,57,43,.1)}.gce-i.crit b{color:var(--crit-ink,#93413F)}.gce-i.ok{background:rgba(47,140,90,.1)}
.gce-mut{color:var(--muted);font-weight:400;font-style:normal}
.gce-pz{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:-2px 0 10px}.gce-pz span{font-size:13px;color:var(--muted)}.gce-pz small{color:var(--muted)}
@media(max-width:640px){.gce-acs{align-items:stretch;width:100%}.gce-pr{justify-content:flex-start}.gce-o{font-size:19px}}
</style>`);
/* ---------- prévia da OS na tela (26/10): mesmo padrão e mesmos dados do PDF novo (antes era a tabela antiga com faixas azuis) ---------- */
manSheet=function(o){ const E=o.exec||{}, f=s=>s?dm(String(s).slice(0,10))+' '+String(s).slice(11,16):'', v=x=>x==null||x===''?'&nbsp;':esc(String(x));
  const tec=E.tecnico?(typeof tecNomes==='function'?tecNomes(o):E.tecnico):'';
  const cel=(t,x,k)=>`<div class="gce-os-cel" style="flex:${k||1} 1 0"><span>${esc(t)}</span><b>${v(x)}</b></div>`;
  const lin=xs=>`<div class="gce-os-lin">${xs.map(x=>cel(x[0],x[1],x[2])).join('')}</div>`;
  const ck=(on,t)=>`<span class="gce-os-ck${on?' on':''}"><i></i>${esc(t)}</span>`;
  const cks=(t,ops,sel,cols)=>`<div class="gce-os-cel gce-os-cks">${t?`<span>${esc(t)}</span>`:''}<div class="gce-os-ckg"${cols?` style="grid-template-columns:repeat(${cols},minmax(0,1fr))"`:''}>${ops.map(op=>ck(sel(op),op)).join('')}</div></div>`;
  const area=(t,x,h)=>`<div class="gce-os-cel gce-os-area" style="min-height:${h||54}px"><span>${esc(t)}</span><b>${v(x)}</b></div>`;
  const sec=(t,n)=>`<div class="gce-os-sec"><b>${esc(t)}</b>${n?`<small>${esc(n)}</small>`:''}</div>`;
  const ms=String(E.materiais||'').split('\n').map(z=>z.trim()).filter(Boolean); while(ms.length<4) ms.push('');
  const tot=E.inicio&&E.fim?((new Date(E.fim)-new Date(E.inicio))/36e5):null;
  const ass=(t,n)=>`<div class="gce-os-ass"><b>${esc(t)}</b>${[['Nome',n],['Assinatura',''],['Data','']].map(([l,x])=>`<span>${l}</span><div>${v(x)}</div>`).join('')}</div>`;
  return `<div class="gce-os">
  <div class="gce-os-capa"><img src="icons/logo-colafix-escuro.png" alt="Colafix" onerror="this.style.display='none'"><div><b>Ordem de serviço · OS ${esc(manNum(o.numero))}</b><small>Manutenção · ${esc(o.linha||'')}${o.local?' · '+esc(o.local):''} · ${esc(o.status||'')}</small></div></div>
  ${sec('1. Abertura do chamado','OS '+manNum(o.numero))}
  ${lin([['Linha / local',(o.linha||'')+(o.local?' · '+o.local:''),1.2],['Data / horário da ocorrência',f(o.quando)],['Aberta em',o.criado?dm(o.criado.slice(0,10))+' '+hora(o.criado):'']])}
  ${lin([['Solicitante',o.nome||''],['Equipamento / sistema',o.equip||'',1.6]])}
  ${o.tarefa||o.prazo?lin([['Prazo',o.prazo?dm(o.prazo):''],['Para quem',o.paraTec||(o.tarefa?'Qualquer técnico':'')],['Urgência',o.tarefa?gchPrio(o.prioridade)[1]:'']]):''}
  ${cks('Impacto na produção',Object.keys(MAN_IMP).map(k=>MAN_IMP[k][0]),t=>!!MAN_IMP[o.impacto]&&MAN_IMP[o.impacto][0]===t)}
  ${cks('Status',MAN_ST,t=>o.status===t,3)}
  ${sec('2. Defeito / descrição do problema')}${area('Descrição',o.defeito,60)}
  ${sec('3. Tipo')}${cks('Tipo de manutenção',MAN_TIPO,t=>E.tipo===t,6)}${lin([['Equipamento / sistema',o.equip||'',2],['Patrimônio / TAG','']])}
  ${sec('4. Serviços executados / procedimentos')}${E.diagnostico||E.causa?lin([['Diagnóstico',E.diagnostico||'',2],['Causa',E.causa||'']]):''}${area('Serviço realizado',E.servicos,72)}
  ${sec('5. Materiais / peças utilizados')}<table class="gce-os-tb"><thead><tr><th style="width:9%">Item</th><th>Descrição</th><th style="width:14%;text-align:right">Qtd.</th><th style="width:14%">Unid.</th></tr></thead><tbody>${ms.slice(0,12).map((m,i)=>{ const q=m.match(/[—-]\s*([\d.,]+)\s*([a-zA-Z]*)\s*$/); return `<tr><td>${String(i+1).padStart(2,'0')}</td><td>${v(q?m.slice(0,q.index).trim():m)}</td><td style="text-align:right">${q?esc(q[1]):''}</td><td>${q?esc(q[2]):''}</td></tr>`; }).join('')}</tbody></table>
  ${sec('6. Condição após a manutenção')}${cks('',MAN_COND,t=>E.condicao===t,3)}
  ${sec('7. Horas de serviço')}${lin([['Início',f(E.inicio)],['Término',f(E.fim)],['Total de horas',tot!=null&&tot>=0?tot.toFixed(2).replace('.',','):''],['Técnico responsável',tec,1.6]])}
  ${sec('8. Segurança')}${cks('Condições verificadas?',['Sim','Não','N/A'],()=>false)}${cks('',['Desenergização','Bloqueio / LOTO','Ausência de tensão','EPI','Isolamento / sinalização','Permissão de Trabalho','Outros:'],()=>false,4)}
  ${sec('9. Pendências / recomendações')}${area('Observações / pendências',E.pendencias,48)}
  ${sec('10. Aprovação do serviço')}<div class="gce-os-asg">${ass('Responsável pela execução',tec)}${ass('Responsável pela produção','')}</div>
  <p class="gce-os-rod">Preencher todos os campos aplicáveis e anexar evidências quando necessário.</p></div>`; };
document.head.insertAdjacentHTML('beforeend',`<style id="gce-os-css">
.man-sheet:has(.gce-os){background:#fff;padding:0;border:1px solid var(--line,#E3E8EC);border-radius:10px;overflow:hidden}
.gce-os{font:13px/1.35 Archivo,system-ui,sans-serif;color:#1D2B33;background:#fff;padding:0 18px 16px}
.gce-os-capa{display:flex;align-items:center;gap:16px;background:#143F54;color:#fff;margin:0 -18px 6px;padding:14px 18px}.gce-os-capa img{height:30px;width:auto}
.gce-os-capa b{display:block;font-size:18px;font-weight:600}.gce-os-capa small{display:block;font-size:12px;opacity:.8;margin-top:2px}
.gce-os-sec{display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-left:4px solid #E3312D;padding:2px 0 2px 10px;margin:16px 0 8px}.gce-os-sec b{font-size:14px;font-weight:600;color:#143F54}.gce-os-sec small{color:#55666F;font-size:12px}
.gce-os-lin{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.gce-os-cel{background:#F3F6F8;border-radius:6px;padding:7px 10px;min-width:150px;margin-bottom:8px}.gce-os-lin .gce-os-cel{margin-bottom:0}
.gce-os-cel>span{display:block;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#55666F}
.gce-os-cel>b{display:block;font-weight:400;font-size:13px;margin-top:2px;white-space:pre-wrap;overflow-wrap:anywhere}
.gce-os-ckg{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:5px}.gce-os-ckg[style]{display:grid}
.gce-os-ck{display:inline-flex;align-items:center;gap:6px;font-size:12.5px}.gce-os-ck i{width:12px;height:12px;border:1px solid #55666F;border-radius:2px;flex:none;position:relative}
.gce-os-ck.on{font-weight:600}.gce-os-ck.on i::after{content:"";position:absolute;inset:2px;background:#143F54}
.gce-os-tb{width:100%;border-collapse:collapse;font-size:12.5px}.man-sheet .gce-os-tb th,.gce-os-tb th{border:0;background:#143F54;color:#fff;font-weight:600;text-align:left;padding:6px 8px;font-size:11px}
.man-sheet .gce-os-tb td,.gce-os-tb td{border:0;padding:6px 8px;border-bottom:1px solid #E3E8EC}.gce-os-tb tr:nth-child(even) td{background:#F8FAFB}
.gce-os-asg{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gce-os-ass{background:#F3F6F8;border-radius:6px;padding:9px 12px}.gce-os-ass>b{display:block;font-weight:600;font-size:12.5px;margin-bottom:4px}
.gce-os-ass>span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#55666F;margin-top:8px}.gce-os-ass>div{border-bottom:1px solid #C9D3DA;min-height:20px;font-size:13px}
.gce-os-rod{color:#55666F;font-size:11.5px;margin:12px 0 0}
@media(max-width:640px){.gce-os{padding:0 12px 12px}.gce-os-capa{margin:0 -12px 6px}.gce-os-asg{grid-template-columns:1fr}.gce-os-ckg[style]{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
</style>`);
