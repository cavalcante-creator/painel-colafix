/* Painel Colafix · 54-pedidos-peca.js (26/10) — Pedidos de peça mais completos.
   Técnico (computador da manutenção / oficina, tela "Pedir peça"): vários itens no mesmo pedido (o que é, quantidade, unidade,
   marca/medida/referência), para qual serviço ou onde vai usar, detalhes e para quando. Em "Seus pedidos" aparece a resposta do Marcelo,
   e o menu avisa "N respostas do Marcelo".
   Marcelo (Visão do gestor › Pedidos de peça): cartão com a lista de itens, para quê, quem pediu, andamento; "Responder" (texto livre
   ou respostas prontas, o técnico vê na oficina) e "Mandar para o compras": escolhe os pedidos → PDF "Pedido de compra · manutenção"
   (padrão dos relatórios, js/34) e mensagem pronta para WhatsApp, e-mail ou copiar. O contato do compras fica em config/geral.comprasContato
   {nome,email,tel}. Mandar marca os pedidos como "Vai comprar" com compras {num,em,por,via}.
   Dados novos em pedpecas: itens[{t,qtd,un,ref}], onde, obs, resp[{em,por,t}], respVista (o técnico viu), compras{}.
   Pedidos antigos (só t/qtd) continuam aparecendo como um item. */
"use strict";
const PPC_UN=['','un','pç','par','m','cm','kg','g','L','cx','rolo','galão','balde','jogo'];
const PPC_RESP=['Tem no almoxarifado, pode retirar lá.','Mande a medida ou uma foto da peça antiga.','Vou pedir para o compras hoje.','Já está pedido, aguarde.','Não vamos comprar agora — use o que tem.'];
const ppcNovoIt=()=>({t:'',qtd:'1',un:'',ref:''});
function ppcItens(p){ if(p&&Array.isArray(p.itens)&&p.itens.length) return p.itens.filter(i=>String(i.t||'').trim()); return p&&p.t?[{t:p.t,qtd:p.qtd||'',un:'',ref:''}]:[]; }
const ppcQtd=i=>[String(i.qtd||'').trim(),i.un||''].filter(Boolean).join(' ');
function ppcItTxt(i){ return String(i.t||'').trim()+(ppcQtd(i)?' — '+ppcQtd(i):'')+(i.ref?' ('+String(i.ref).trim()+')':''); }
function ppcPara(p){ return p.os?'OS '+manNum(p.os)+(p.osTxt?' · '+p.osTxt:''):(p.onde||'estoque da oficina'); }
function ppcRespNova(p){ const r=(p.resp||[]); return r.length&&(!p.respVista||String(p.respVista)<String(r[r.length-1].em)); }

/* ===================== técnico: formulário ===================== */
function ppcP(){ const O=S.of; const P=O.peca||(O.peca={t:'',qtd:'1',os:'',urg:'semana'});
  if(!P.itens){ P.itens=[{t:P.t||'',qtd:P.qtd||'1',un:'',ref:''}]; } if(!P.itens.length) P.itens.push(ppcNovoIt()); if(P.obs==null) P.obs=''; if(P.onde==null) P.onde=''; return P; }
function ppcLe(){ const P=S.of&&S.of.peca; if(!P||!P.itens) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  P.itens.forEach((it,i)=>{ const s=i?String(i):''; const t=v('of-pt'+s), q=v('of-pq'+s), u=v('of-pu'+i), r=v('of-pr'+i); if(t!=null) it.t=t; if(q!=null) it.qtd=q; if(u!=null) it.un=u; if(r!=null) it.ref=r; });
  const o=v('of-po'), ob=v('of-pobs'), ld=v('of-ploc'); if(o!=null) P.os=o; if(ob!=null) P.obs=ob; if(ld!=null) P.onde=ld;
  P.t=P.itens[0]?P.itens[0].t:''; P.qtd=P.itens[0]?P.itens[0].qtd:''; }
{ const _l=ofLe; ofLe=function(){ const r=_l.apply(this,arguments); try{ ppcLe(); }catch(e){} return r; }; }
vOfPeca=function(){ const T=S.tt, P=ppcP(), eu=T.p.nome;
  const servs=ofAb().filter(c=>(c.tarefa||c.prevId)&&ofMeu(c,eu)).concat(ofAb().filter(c=>!c.tarefa&&!c.prevId&&tecEh(c,eu)));
  const meus=ofPeds().filter(p=>ofN(p.porNome)===ofN(eu)).slice(0,8), algum=P.itens.some(i=>String(i.t||'').trim());
  /* abrir a tela = viu as respostas */
  meus.filter(ppcRespNova).forEach(p=>{ const em=new Date().toISOString(); p.respVista=em; try{ S.db.doc('pedpecas/'+p._id).update({respVista:em}); }catch(e){} });
  const lin=(it,i)=>{ const s=i?String(i):''; return `<div class="ofp-it"><span class="ofp-n">${i+1}</span>
      <label class="of-lb ofp-t" for="of-pt${s}">${i?'':'O que é'}<input id="of-pt${s}" class="of-in" maxlength="160" autocomplete="off" value="${esc(it.t)}" placeholder="${i?'Outro item':'Ex.: rolamento 6205 2RS'}"></label>
      <label class="of-lb ofp-q" for="of-pq${s}">${i?'':'Quantidade'}<input id="of-pq${s}" class="of-in" maxlength="20" autocomplete="off" value="${esc(it.qtd)}"></label>
      <label class="of-lb ofp-u" for="of-pu${i}">${i?'':'Unidade'}<select id="of-pu${i}" class="of-in">${PPC_UN.map(u=>`<option value="${u}" ${it.un===u?'selected':''}>${u||'—'}</option>`).join('')}</select></label>
      <label class="of-lb ofp-r" for="of-pr${i}">${i?'':'Marca ou medida'}<input id="of-pr${i}" class="of-in" maxlength="120" autocomplete="off" value="${esc(it.ref)}" placeholder="opcional"></label>
      ${P.itens.length>1?`<button class="ofp-x" data-act="ofp-tira" data-v="${i}" aria-label="Tirar o item ${i+1}">×</button>`:'<span class="ofp-x0"></span>'}</div>`; };
  const meuC=p=>{ const s=OF_PST[p.status]||OF_PST.enviado, its=ppcItens(p), r=p.resp||[];
    return `<div class="of-c ${ppcRespNova(p)?'ofp-nova':''}"><b>${esc(its.map(i=>i.t).join(' · ').slice(0,70))}${its.length===1&&ppcQtd(its[0])?' · '+esc(ppcQtd(its[0])):its.length>1?' · '+its.length+' itens':''}</b><span class="of-s ${s[1]}">${s[0]}${p.status==='comprado'&&p.prev?' · chega '+dm(p.prev):''}${p.status==='nao'&&p.mot?' · '+esc(p.mot):''}</span>
      ${r.length?`<div class="ofp-rs">${r.slice(-2).map(x=>`<p><b>${esc(x.por||'Marcelo')} respondeu às ${ofHm(x.em)}:</b> ${esc(x.t)}</p>`).join('')}</div>`:''}
      <small>${dm(hojeStr(new Date(p.em)))} ${ofHm(p.em)} · ${esc(ppcPara(p))}</small></div>`; };
  const corpo=`<div class="of-pg ofp-pg"><section class="of-col of-pf"><h2 class="ofp-h">O que você precisa?</h2>
     <div class="ofp-its">${P.itens.map(lin).join('')}</div>
     ${P.itens.length<12?`<button class="of-b sec ofp-mais" data-act="ofp-mais">+ Mais um item</button>`:''}
     <div class="of-g2"><label class="of-lb" for="of-po">Para qual serviço<select id="of-po" class="of-in"><option value="">Nenhum serviço aberto</option>${servs.map(c=>`<option value="${c.numero}" ${String(P.os)===String(c.numero)?'selected':''}>OS ${manNum(c.numero)} · ${esc((c.prevId?ofPrevTxt(c):(c.linha||'')+' · '+(c.defeito||'')).slice(0,50))}</option>`).join('')}</select></label>
      ${P.os?'':`<label class="of-lb" for="of-ploc">Onde vai usar<input id="of-ploc" class="of-in" maxlength="80" autocomplete="off" value="${esc(P.onde)}" placeholder="Ex.: Linha 2 · misturador · ou estoque"></label>`}</div>
     <label class="of-lb" for="of-pobs">Detalhes para o Marcelo <small>(opcional)</small><textarea id="of-pobs" class="of-in" rows="2" maxlength="300" placeholder="Ex.: a peça antiga quebrou; tem a medida na caixa da oficina">${esc(P.obs)}</textarea></label>
     <b class="of-lb">Precisa para quando?</b><div class="of-mot">${OF_URG.map(([k,t,cl])=>`<button class="of-b ${P.urg===k?cl:'sec'}" data-act="of-urg" data-v="${k}" aria-pressed="${P.urg===k}">${t}</button>`).join('')}</div>
     ${ofMsg()}<div class="cq-rod"><button class="cq-sec" data-act="of-volta">Voltar (Esc)</button>${ofBt('of-peca-ok',P.itens.filter(i=>String(i.t||'').trim()).length>1?'Mandar '+P.itens.filter(i=>String(i.t||'').trim()).length+' itens para o Marcelo':'Mandar para o Marcelo',null,'',!algum)}</div></section>
    <section class="of-col"><h2>Seus pedidos</h2>${meus.map(meuC).join('')||'<p class="of-vz">Você ainda não pediu nada.</p>'}
     <small class="of-p">O Marcelo vê o pedido no painel dele, pode responder aqui e manda para o compras. Você acompanha o andamento nesta lista.</small></section></div>`;
  return ofPagina('Pedir peça',corpo); };
/* botão do menu (4): avisa resposta nova */
{ const _t=vOfTec; vOfTec=function(){ let h=_t.apply(this,arguments); try{ const T=S.tt; if(T.fase!=='oftec'||S.of.sec) return h; const eu=T.p&&T.p.nome; const n=ofPeds().filter(p=>ofN(p.porNome)===ofN(eu)&&ppcRespNova(p)).length;
    if(n) h=h.replace('escreva o que precisa · vai para o Marcelo',`<b class="ofp-av">${n===1?'1 resposta nova do Marcelo':n+' respostas novas do Marcelo'}</b> · ver em Seus pedidos`); }catch(e){} return h; }; }
function ppcFoca(i){ setTimeout(()=>{ const e=document.getElementById('of-pt'+(i?String(i):'')); e&&e.focus(); },60); }
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ofp-"],[data-act="of-peca-ok"]'); if(!b||!ofOn()||!ttAtivo()||!S.tt||S.tt.fase!=='ofpeca') return;
  const T=S.tt, a=b.dataset.act; ev.preventDefault(); ev.stopImmediatePropagation(); T.ult=Date.now(); ppcLe(); const P=ppcP();
  if(a==='ofp-mais'){ P.itens.push(ppcNovoIt()); render(); ppcFoca(P.itens.length-1); return; }
  if(a==='ofp-tira'){ P.itens.splice(+b.dataset.v,1); if(!P.itens.length) P.itens.push(ppcNovoIt()); render(); return; }
  if(a!=='of-peca-ok'||b.disabled||T.enviando) return;
  const its=P.itens.map(i=>({t:String(i.t||'').trim(),qtd:String(i.qtd||'').trim(),un:i.un||'',ref:String(i.ref||'').trim()})).filter(i=>i.t); if(!its.length) return;
  T.enviando=true; render();
  try{ const agora=new Date().toISOString(), os=P.os?+P.os:null, oc=os?manDoc(os):null, id='pp'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const resumo=its.length===1?its[0].t:its.map(i=>i.t).join('; ');
    const d={t:resumo.slice(0,300),qtd:its.length===1?ppcQtd(its[0]):its.length+' itens',itens:its,onde:oc?'':String(P.onde||'').trim(),obs:String(P.obs||'').trim(),os,osTxt:oc?(oc.prevId?ofPrevTxt(oc):(oc.linha||'')+' · '+(oc.defeito||'')).slice(0,80):'',urg:P.urg||'semana',porNome:T.p.nome,cracha:T.p.codigo||null,por:S.uid||null,em:agora,status:'enviado',hist:[{em:agora,o:'Pedido feito por '+T.p.nome+(its.length>1?' ('+its.length+' itens)':'')}]};
    await S.db.doc('pedpecas/'+id).set(d); S.pedpecas=[Object.assign({_id:id},d)].concat(S.pedpecas||[]);
    if(oc) await ofGrava(oc,{esperaPeca:{id,t:resumo.slice(0,120),em:agora}},'Esperando peça: '+resumo.slice(0,120)+' (pedido de '+T.p.nome+')');
    T.enviando=false; ofOk('Pedido mandado para o Marcelo',(its.length>1?its.length+' itens · ':'')+resumo.slice(0,90)+(its.length===1&&d.qtd?' · '+d.qtd:'')+' · '+ofUrgT(d.urg).toLowerCase(),oc?'A OS '+manNum(oc.numero)+' fica "esperando peça".':'Você acompanha em "Seus pedidos".'); }
  catch(e){ T.enviando=false; console.warn('[peça]',e); T.msg='Não foi possível mandar agora'+(typeof cqErroTxt==='function'?' ('+cqErroTxt(e)+')':'')+'. Toque de novo.'; render(); } },true);
/* Enter num campo de item: vai para o próximo campo / cria outro item */
document.addEventListener('keydown',ev=>{ if(ev.key!=='Enter'||!S.tt||S.tt.fase!=='ofpeca') return; const id=ev.target&&ev.target.id||''; const m=id.match(/^of-pt(\d*)$/); if(!m) return; ev.preventDefault(); ev.stopPropagation();
  const i=+(m[1]||0), q=document.getElementById('of-pq'+(i?String(i):'')); q&&q.focus(); q&&q.select&&q.select(); },true);

/* ===================== Marcelo: Pedidos de peça ===================== */
Object.assign(S.gpc,{sel:S.gpc.sel||new Set(),resp:null,rtx:'',comp:null});
function ppcContato(){ const c=(S.cfg&&S.cfg.comprasContato)||{}; return {nome:c.nome||'',email:c.email||'',tel:c.tel||''}; }
function ppcNum(){ const d=new Date(); return 'MAN-'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes()); }
function ppcCard(p){ const G=S.gpc, s=OF_PST[p.status||'enviado']||OF_PST.enviado, u=OF_URG.find(x=>x[0]===p.urg)||OF_URG[1], ed=G.ed&&G.ed.id===p._id?G.ed:null, its=ppcItens(p), ab=ofPecAberto(p);
  const bts=[['comprar','Vai comprar'],['comprado','Comprado'],['chegou','Chegou'],['nao','Recusar']].filter(([k])=>k!==p.status).map(([k,t])=>`<button class="ppc-lk ${k==='nao'?'del':''}" data-act="gpc-st" data-id="${esc(p._id)}" data-v="${k}">${t}</button>`).join('');
  const st=({enviado:'Novo',visto:(p.resp||[]).length?'Respondido':'Visto',comprar:'Vai comprar'})[p.status||'enviado']||s[0];
  const resp=G.resp===p._id, nm=String(p.porNome||'—');
  return `<article class="gch-c ppc-c ${p.urg==='hoje'&&ab?'crit':''} ${ab?'':'fe'} ${G.sel.has(p._id)?'sel':''}" data-b="${esc((its.map(i=>i.t+' '+(i.ref||'')).join(' ')+' '+(p.porNome||'')+' '+(p.osTxt||'')+' '+(p.onde||'')+' '+(p.os?manNum(p.os):'')).toLowerCase())}">
    <div class="ppc-ck">${ab?`<input type="checkbox" data-ppcsel="${esc(p._id)}" ${G.sel.has(p._id)?'checked':''} aria-label="Escolher para mandar ao compras" title="Escolher para mandar ao compras">`:''}</div>
    <div class="ppc-mn">
     <div class="ppc-who"><span class="ppc-av" aria-hidden="true">${esc(nm[0])}</span><div><b>${esc(nm)}</b><small>${dm(hojeStr(new Date(p.em)))} às ${ofHm(p.em)} · para ${esc(ppcPara(p))}</small></div></div>
     <div class="ppc-tags"><span class="gx-st ${u[2]==='crit'?'atr':u[2]==='pri'?'and':'pen'}">${esc(u[1])}</span><span class="gx-st ${s[1]==='ok'?'ok':s[1]==='crit'?'atr':s[1]==='warn'?'and':'pen'}">${esc(st)}${p.status==='comprado'&&p.prev?' · chega '+dm(p.prev):''}${p.status==='nao'&&p.mot?' · '+esc(p.mot):''}</span>${p.compras?`<span class="gx-st pen">No compras · ${esc(p.compras.num)}</span>`:''}</div>
     <ul class="ppc-its" aria-label="Itens do pedido">${its.map(i=>`<li><span class="ppc-q">${esc(ppcQtd(i)||'—')}</span><span class="ppc-it">${esc(i.t)}${i.ref?`<small>${esc(i.ref)}</small>`:''}</span></li>`).join('')}</ul>
     ${p.obs?`<p class="ppc-ob"><span>Detalhes do técnico</span>${esc(p.obs)}</p>`:''}
     ${(p.resp||[]).length?`<div class="ppc-rs">${p.resp.map(r=>`<p><b>Você respondeu</b> <small>${dm(hojeStr(new Date(r.em)))} ${ofHm(r.em)}</small> ${esc(r.t)}</p>`).join('')}${p.respVista&&String(p.respVista)>=String(p.resp[p.resp.length-1].em)?'<small class="ppc-vi">O técnico já viu.</small>':'<small class="ppc-vi">O técnico vê quando passar o crachá na oficina.</small>'}</div>`:''}
     ${resp?`<div class="gch-cf ppc-rf"><label class="gx-f">Resposta para ${esc(nm.split(' ')[0])}<textarea id="ppc-rt" rows="2" maxlength="300" placeholder="Escreva ou toque numa resposta pronta">${esc(G.rtx)}</textarea></label>
      <div class="ppc-pr">${PPC_RESP.map((t,i)=>`<button class="gx-chip" data-act="gpx-pronta" data-v="${i}">${esc(t)}</button>`).join('')}</div>
      <div class="gch-cfb"><button class="btn sec" data-act="gpx-rcanc">Voltar</button><button class="btn" data-act="gpx-rok" data-id="${esc(p._id)}" ${G.busy?'disabled':''}>Mandar resposta</button></div></div>`:''}
     ${ed?`<div class="gch-cf"><label class="gx-f">${ed.v==='nao'?'Por que está recusando? (o técnico vê)':'Chega quando? (opcional)'}${ed.v==='nao'?`<input id="gpc-mot" maxlength="120" placeholder="Ex.: tem no estoque do almox">`:`<input id="gpc-prev" type="date">`}</label><div class="gch-cfb"><button class="btn sec" data-act="gpc-canc">Voltar</button><button class="btn" data-act="gpc-ok" data-id="${esc(p._id)}" ${G.busy?'disabled':''}>Confirmar</button></div></div>`:''}
    </div>
    <div class="ppc-ac"><button class="btn gx-bs" data-act="gpx-resp" data-id="${esc(p._id)}">Responder</button>${ab?`<button class="btn sec gx-bs" data-act="gpx-um" data-id="${esc(p._id)}">Mandar para o compras</button><button class="btn sec gx-bs" data-act="gpx-ed" data-id="${esc(p._id)}">Editar / incluir itens</button>`:''}
     <div class="ppc-lks">${bts}</div></div></article>`; }
function ppcModal(){ const G=S.gpc, C=G.comp; if(!C) return ''; const ps=C.ids.map(id=>ofPeds().find(p=>p._id===id)).filter(Boolean), k=ppcContato();
  const n=ps.reduce((a,p)=>a+ppcItens(p).length,0);
  return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="ppc-mt"><div class="card gx-mc ppc-m"><h2 id="ppc-mt">Mandar para o compras</h2>
   <p class="sub" style="margin:4px 0 12px">${ps.length} ${ps.length>1?'pedidos':'pedido'} · ${n} ${n>1?'itens':'item'} · número <b>${esc(C.num)}</b></p>
   <table class="ppc-tb"><thead><tr><th>Item</th><th class="r">Qtd.</th><th>Referência</th><th>Para</th></tr></thead><tbody>${ps.map(p=>ppcItens(p).map(i=>`<tr><td>${esc(i.t)}${p.urg==='hoje'?' <b class="ppc-ur">URGENTE</b>':''}</td><td class="r">${esc(ppcQtd(i)||'—')}</td><td>${esc(i.ref||'—')}</td><td>${esc(ppcPara(p))}</td></tr>`).join('')).join('')}</tbody></table>
   <div class="ppc-g3"><label class="gx-f">Quem é do compras<input id="ppc-cn" maxlength="60" value="${esc(C.nome!=null?C.nome:k.nome)}" placeholder="Nome"></label>
    <label class="gx-f">WhatsApp<input id="ppc-ct" maxlength="20" inputmode="tel" value="${esc(C.tel!=null?C.tel:k.tel)}" placeholder="(51) 99999-9999"></label>
    <label class="gx-f">E-mail<input id="ppc-ce" maxlength="80" type="email" value="${esc(C.email!=null?C.email:k.email)}" placeholder="compras@colafix.com"></label></div>
   <label class="gx-f">Observação para o compras <small>(opcional)</small><textarea id="ppc-co" rows="2" maxlength="300" placeholder="Ex.: preferir o fornecedor de sempre; entregar na portaria">${esc(C.obs||'')}</textarea></label>
   <label class="gx-f">Mensagem (dá para mudar)<textarea id="ppc-msg" rows="8">${esc(C.msg!=null?C.msg:ppcMsg(ps,C))}</textarea></label>
   <div class="ppc-mb"><button class="btn" data-act="gpx-pdf">${ic('baixar',16,2)}Baixar PDF</button><button class="btn sec" data-act="gpx-wa">WhatsApp</button><button class="btn sec" data-act="gpx-mail">E-mail</button><button class="btn sec" data-act="gpx-copia">Copiar mensagem</button><span></span><button class="btn sec" data-act="gpx-mfecha">Fechar</button></div>
   <small class="gx-p" style="display:block;margin-top:8px">Ao baixar o PDF ou mandar a mensagem, os pedidos ficam como "Vai comprar" e o técnico vê. No e-mail, anexe o PDF baixado.</small></div></div>`; }
function ppcMsg(ps,C){ const k={nome:C&&C.nome!=null?C.nome:ppcContato().nome}, nome=String(k.nome||'').split(' ')[0];
  let n=0; const ls=[]; ps.forEach(p=>ppcItens(p).forEach(i=>{ n++; ls.push(n+'. '+ppcItTxt(i)+' · para '+ppcPara(p)+(p.urg==='hoje'?' · URGENTE':'')); }));
  const ped=[...new Set(ps.map(p=>p.porNome).filter(Boolean))].join(', ');
  return (nome?'Olá, '+nome+'.':'Olá.')+' Pedido de compra da manutenção '+C.num+' ('+dm(hojeStr())+'/'+new Date().getFullYear()+'):\n\n'+ls.join('\n')+(C.obs?'\n\nObservação: '+C.obs:'')+'\n\nPedido por: '+(ped||'manutenção')+'. Autorizado por: '+gchNome()+'.\nO PDF com a lista vai junto. Qualquer dúvida, fale comigo.'; }
function ppcLeModal(){ const C=S.gpc.comp; if(!C) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  const n=v('ppc-cn'), t=v('ppc-ct'), e=v('ppc-ce'), o=v('ppc-co'), m=v('ppc-msg'); if(n!=null) C.nome=n; if(t!=null) C.tel=t; if(e!=null) C.email=e; if(o!=null) C.obs=o; if(m!=null) C.msg=m; }
async function ppcGuardaContato(){ const C=S.gpc.comp, k=ppcContato(), n={nome:String(C.nome!=null?C.nome:k.nome).trim(),tel:String(C.tel!=null?C.tel:k.tel).trim(),email:String(C.email!=null?C.email:k.email).trim()};
  if(n.nome===k.nome&&n.tel===k.tel&&n.email===k.email) return; try{ await S.db.doc('config/geral').update({comprasContato:n}); S.cfg.comprasContato=n; }catch(e){ console.warn('[compras contato]',e); } }
async function ppcMarca(via){ const G=S.gpc, C=G.comp; if(!C) return; const agora=new Date().toISOString(), por=gchNome(), ps=C.ids.map(id=>ofPeds().find(p=>p._id===id)).filter(Boolean);
  await ppcGuardaContato();
  for(const p of ps){ const vias=((p.compras&&p.compras.num===C.num&&p.compras.via)||[]); if(vias.includes(via)) continue;
    const up={compras:{num:C.num,em:agora,por,via:vias.concat([via])},hist:(p.hist||[]).concat([{em:agora,o:'Mandado para o compras ('+C.num+', '+via+') · '+por}]).slice(-50)};
    if(['enviado','visto'].includes(p.status||'enviado')) Object.assign(up,{status:'comprar',comprarEm:agora,comprarPor:por});
    try{ await S.db.doc('pedpecas/'+p._id).update(up); Object.assign(p,up); }catch(e){ toast('Não foi possível marcar o pedido. Verifique a internet.'); } }
  G.sel.clear(); }
async function ppcPdf(){ const C=S.gpc.comp, ps=C.ids.map(id=>ofPeds().find(p=>p._id===id)).filter(Boolean); let img; try{ img=await gpImgs(); }catch(e){ img={}; }
  let P; try{ P=gpNovo('Pedido de compra · manutenção',C.num+' · '+dm(hojeStr())+'/'+new Date().getFullYear(),img||{}); }catch(e){ toast(e.message||'Gerador de PDF indisponível.'); return false; }
  P.capa(); const k=ppcContato(), nI=ps.reduce((a,p)=>a+ppcItens(p).length,0);
  P.kpis([{t:'Itens',v:String(nI)},{t:'Urgentes',v:String(ps.filter(p=>p.urg==='hoje').reduce((a,p)=>a+ppcItens(p).length,0))},{t:'Pedido por',v:[...new Set(ps.map(p=>String(p.porNome||'').split(' ')[0]).filter(Boolean))].join(', ')||'—'},{t:'Autorizado por',v:gchNome()}]);
  P.secao('Itens para comprar',nI+(nI>1?' itens':' item')); let n=0; const rows=[];
  ps.forEach(p=>ppcItens(p).forEach(i=>{ n++; rows.push([String(n),i.t,String(i.qtd||''),i.un||'',i.ref||'',ppcPara(p),p.urg==='hoje'?'Urgente':ofUrgT(p.urg)]); }));
  P.tabela([{t:'Nº',w:8},{t:'Item',w:52},{t:'Qtd.',w:12,al:'r'},{t:'Un.',w:10},{t:'Marca / medida / ref.',w:36},{t:'Para',w:40},{t:'Quando',w:22}],rows);
  const obs=ps.filter(p=>p.obs).map(p=>'• '+(p.porNome||'')+': '+p.obs); if(C.obs||obs.length){ P.secao('Observações'); if(C.obs) P.texto(C.obs); if(obs.length) P.texto(obs.join('\n'),{fs:8}); }
  P.secao('Aprovação'); { const doc=P.doc, M=P.M, w=(P.cw-4)/2; P.cabe(30); [['Autorizado por (manutenção)',gchNome()],['Recebido pelo compras',C.nome!=null?C.nome:k.nome]].forEach(([t,v],i)=>{ const x=M+i*(w+4), y=P.y;
      P.fc(GPDF.cor.soft); doc.roundedRect(x,y,w,26,1.4,1.4,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); P.tc(GPDF.cor.ink); doc.text(t,x+3,y+5.5);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); if(v) doc.text(String(v),x+3,y+12); P.dc(GPDF.cor.cinza); doc.setLineWidth(.3); doc.line(x+3,y+21,x+w-3,y+21); doc.setFontSize(6.6); P.tc(GPDF.cor.mut); doc.text('ASSINATURA E DATA',x+3,y+24.5); }); P.y+=30; }
  P.fim('Pedido-compra-'+C.num+'.pdf'); return true; }
vGxPecas=function(){ const G=S.gpc, ps=ofPeds(), ab=ps.filter(ofPecAberto), novos=ps.filter(p=>(p.status==='enviado'||p.status==='visto')&&!(p.resp||[]).length&&p.origem!=='gestor');
  ps.filter(p=>(p.status||'enviado')==='enviado'&&!G.vistos.has(p._id)).forEach(p=>{ G.vistos.add(p._id); ofPecMuda(p,'visto',{},true); });
  [...G.sel].forEach(id=>{ const p=ps.find(x=>x._id===id); if(!p||!ofPecAberto(p)) G.sel.delete(id); });
  const m={abertos:ab,compras:ps.filter(p=>p.compras&&ofPecAberto(p)),fim:ps.filter(p=>!ofPecAberto(p)),todos:ps}, xs=(m[G.f]||ab).slice().sort((a,b)=>(a.urg==='hoje'?0:1)-(b.urg==='hoje'?0:1)||String(b.em).localeCompare(String(a.em)));
  const chip=(k,t)=>`<button class="gx-chip" data-act="gpc-f" data-v="${k}" aria-pressed="${G.f===k}">${t} (${m[k].length})</button>`;
  const semComp=ab.filter(p=>!p.compras);
  return `${banner()}${gxCab('MANUTENÇÃO · VISÃO DO GESTOR','Pedidos de peça','<button class="btn" data-act="gpx-novo">+ Novo pedido</button>')}
   <div class="gch-ks"><div class="${novos.length?'crit':''}"><b>${novos.length}</b><span>novos</span></div><div class="${ab.filter(p=>p.urg==='hoje').length?'warn':''}"><b>${ab.filter(p=>p.urg==='hoje').length}</b><span>urgentes em aberto</span></div><div><b>${semComp.length}</b><span>ainda não foram ao compras</span></div><div class="ok"><b>${ps.filter(p=>p.status==='chegou').length}</b><span>chegaram</span></div></div>
   <div class="gch-bar"><div class="gx-chips" role="group" aria-label="Mostrar">${chip('abertos','Em aberto')}${chip('compras','No compras')}${chip('fim','Chegaram ou recusados')}${chip('todos','Todos')}</div>
    <label class="gch-q">${ic('lupa',16,2)}<input placeholder="Buscar: peça, técnico, OS" aria-label="Buscar pedido" data-gchq></label></div>
   ${ab.length?`<div class="ppc-sb ${G.sel.size?'on':''}"><span>${G.sel.size?`<b>${G.sel.size}</b> ${G.sel.size>1?'pedidos escolhidos':'pedido escolhido'} para o compras`:'Marque os pedidos (caixinha à esquerda) para mandar vários juntos ao compras.'}</span>
     <button class="btn sec gx-bs" data-act="gpx-todos">${semComp.length&&semComp.every(p=>G.sel.has(p._id))?'Desmarcar':'Marcar os que não foram ao compras'}</button><button class="btn gx-bs" data-act="gpx-comp" ${G.sel.size?'':'disabled'}>Mandar ${G.sel.size||''} para o compras</button></div>`:''}
   <section class="card gch-lst">${xs.length?xs.map(ppcCard).join(''):`<div class="empty">${G.f==='abertos'?'Nenhum pedido de peça em aberto.':'Nada aqui.'}</div>`}</section>
   <p class="gx-p">Os técnicos pedem no computador da manutenção. Você responde, manda para o compras (PDF e mensagem prontos) e marca o andamento; eles veem na hora em "Seus pedidos".</p>${ppcModal()}${ppeModal()}`; };
S.extViews.gxpec=vGxPecas;
{ const _b=gxnBadges; gxnBadges=function(){ const b=_b.apply(this,arguments); try{ const n=ofPeds().filter(p=>(p.status==='enviado'||p.status==='visto')&&!(p.resp||[]).length&&p.origem!=='gestor').length; if(n) b.gxpec=n; else delete b.gxpec; }catch(e){} return b; }; }
function ppcAbreComp(ids){ const G=S.gpc; G.comp={ids,num:ppcNum(),obs:''}; render(); }
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.hasAttribute||!t.hasAttribute('data-ppcsel')) return; const G=S.gpc, id=t.getAttribute('data-ppcsel'); if(t.checked) G.sel.add(id); else G.sel.delete(id); render(); });
document.addEventListener('input',ev=>{ const id=ev.target&&ev.target.id; if(id==='ppc-rt') S.gpc.rtx=ev.target.value; else if(/^ppc-c[ntoe]$/.test(id||'')){ const C=S.gpc.comp; ppcLeModal(); if(C&&id!=='ppc-msg'&&!C.msgMexida){ const ps=C.ids.map(x=>ofPeds().find(p=>p._id===x)).filter(Boolean); const m=document.getElementById('ppc-msg'); C.msg=ppcMsg(ps,C); if(m) m.value=C.msg; } } else if(id==='ppc-msg'&&S.gpc.comp){ S.gpc.comp.msg=ev.target.value; S.gpc.comp.msgMexida=true; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.gpc&&S.gpc.comp&&document.querySelector('.ppc-m')){ S.gpc.comp=null; render(); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gpx-"]'); if(!b||b.disabled) return; const G=S.gpc, a=b.dataset.act, p=b.dataset.id&&ofPeds().find(x=>x._id===b.dataset.id);
  if(a==='gpx-resp'&&p){ G.resp=G.resp===p._id?null:p._id; G.rtx=''; G.ed=null; render(); setTimeout(()=>{ const i=document.getElementById('ppc-rt'); i&&i.focus(); },50); return; }
  if(a==='gpx-rcanc'){ G.resp=null; G.rtx=''; render(); return; }
  if(a==='gpx-pronta'){ const t=PPC_RESP[+b.dataset.v]||''; const i=document.getElementById('ppc-rt'); G.rtx=(String(i&&i.value||G.rtx||'').trim()?String(i?i.value:G.rtx).trim()+' ':'')+t; if(i){ i.value=G.rtx; i.focus(); } return; }
  if(a==='gpx-rok'&&p){ const i=document.getElementById('ppc-rt'); const t=String(i?i.value:G.rtx||'').trim(); if(!t){ toast('Escreva a resposta.'); return; } G.busy=true; render();
    const agora=new Date().toISOString(), por=gchNome(); const up={resp:(p.resp||[]).concat([{em:agora,por,t}]).slice(-20),hist:(p.hist||[]).concat([{em:agora,o:'Resposta de '+por+': '+t}]).slice(-50)};
    if((p.status||'enviado')==='enviado') Object.assign(up,{status:'visto',vistoEm:agora,vistoPor:por});
    try{ await S.db.doc('pedpecas/'+p._id).update(up); Object.assign(p,up); toast('Resposta mandada. '+String(p.porNome||'O técnico').split(' ')[0]+' vê na oficina.'); G.resp=null; G.rtx=''; }catch(e){ toast('Não foi possível mandar. Verifique a internet.'); }
    G.busy=false; render(); return; }
  if(a==='gpx-um'&&p){ ppcAbreComp([p._id]); return; }
  if(a==='gpx-comp'){ if(!G.sel.size) return; ppcAbreComp([...G.sel]); return; }
  if(a==='gpx-todos'){ const sc=ofPeds().filter(x=>ofPecAberto(x)&&!x.compras); if(sc.length&&sc.every(x=>G.sel.has(x._id))) sc.forEach(x=>G.sel.delete(x._id)); else sc.forEach(x=>G.sel.add(x._id)); render(); return; }
  if(a==='gpx-mfecha'){ G.comp=null; render(); return; }
  if(!G.comp) return; ppcLeModal(); const C=G.comp, msg=String(C.msg!=null?C.msg:ppcMsg(C.ids.map(x=>ofPeds().find(y=>y._id===x)).filter(Boolean),C));
  if(a==='gpx-pdf'){ b.disabled=true; const ok=await ppcPdf(); if(ok){ await ppcMarca('PDF'); toast('PDF do pedido '+C.num+' baixado.'); } b.disabled=false; render(); return; }
  if(a==='gpx-wa'){ let tel=String(C.tel||'').replace(/\D/g,''); if(tel&&tel.length<=11) tel='55'+tel; window.open('https://wa.me/'+(tel||'')+'?text='+encodeURIComponent(msg),'_blank','noopener'); await ppcMarca('WhatsApp'); render(); return; }
  if(a==='gpx-mail'){ const to=String(C.email||'').trim(); location.href='mailto:'+encodeURIComponent(to).replace('%40','@')+'?subject='+encodeURIComponent('Pedido de compra da manutenção '+C.num)+'&body='+encodeURIComponent(msg); await ppcMarca('e-mail'); render(); return; }
  if(a==='gpx-copia'){ try{ await navigator.clipboard.writeText(msg); toast('Mensagem copiada.'); }catch(e){ const t=document.getElementById('ppc-msg'); if(t){ t.select(); try{ document.execCommand('copy'); toast('Mensagem copiada.'); }catch(x){} } } await ppcMarca('copiado'); render(); return; } });
/* sino do técnico não existe; no sino do Marcelo, pedidos já respondidos não contam como "para ver" */
{ const _al=gxAlertas; gxAlertas=function(){ const out=_al.apply(this,arguments); try{ return out.map(a=>{ if(a.go!=='gxpec'||a.c==='crit') return a; const nv=ofPeds().filter(p=>(p.status==='enviado'||p.status==='visto')&&p.urg!=='hoje'&&!(p.resp||[]).length&&p.origem!=='gestor'); if(!nv.length) return null; return Object.assign({},a,{t:nv.length===1?'Pedido de peça: '+String(nv[0].t||'').slice(0,50):nv.length+' pedidos de peça para ver'}); }).filter(Boolean); }catch(e){ return out; } }; }
document.head.insertAdjacentHTML('beforeend',`<style id="ppc-css">
.ofp-pg .of-pf{gap:10px}.ofp-h{margin:0 0 2px}
.ofp-its{display:flex;flex-direction:column;gap:8px}
.ofp-it{display:grid;grid-template-columns:28px minmax(0,2.4fr) minmax(70px,.7fr) minmax(76px,.6fr) minmax(0,1.6fr) 36px;gap:8px;align-items:end}
.ofp-n{width:28px;height:28px;border-radius:50%;background:var(--teal,#2B6A87);color:#fff;display:grid;place-items:center;font-weight:600;font-size:14px;margin-bottom:12px}
.ofp-x{width:36px;height:44px;border:1px solid var(--line,#C9D3DA);background:transparent;border-radius:8px;font-size:22px;color:var(--muted);cursor:pointer;margin-bottom:2px}.ofp-x0{width:36px}
.ofp-mais{align-self:flex-start}
.ofp-nova{border-left:4px solid var(--warn,#C99A2E)}
.ofp-rs{margin:6px 0 2px;padding:8px 10px;border-radius:8px;background:rgba(201,154,46,.12)}.ofp-rs p{margin:0 0 3px;font-size:14px}.ofp-rs p:last-child{margin:0}
.ofp-av{color:var(--warn-ink,#8a6a1f)}
@media(max-width:900px){.ofp-it{grid-template-columns:28px 1fr 1fr 36px}.ofp-it .ofp-t{grid-column:2/4}.ofp-it .ofp-r{grid-column:2/4}}
.ppc-c{display:block}.ppc-top{display:flex;gap:12px;align-items:flex-start}.ppc-hd{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.ppc-ck input{width:22px;height:22px;margin-top:2px;accent-color:var(--teal,#2B6A87);cursor:pointer}
.ppc-tb{width:100%;border-collapse:collapse;margin:10px 0 4px;font-size:14px}.ppc-tb th{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line,#E3E8EC)}
.ppc-tb td{padding:7px 8px;border-bottom:1px solid var(--line,#E3E8EC);vertical-align:top}.ppc-tb .r{text-align:right;white-space:nowrap}.ppc-tb td:first-child{font-weight:500}
.ppc-ob{margin:8px 0 0;font-size:14px}.ppc-ob span,.ppc-rs small{display:block;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.ppc-rs{margin-top:8px;padding:8px 12px;border-radius:8px;background:rgba(43,106,135,.08)}.ppc-rs p{margin:0 0 4px;font-size:14px}.ppc-rs p small{display:inline;text-transform:none;letter-spacing:0;font-weight:400;margin:0 4px}.ppc-rs .ppc-vi{text-transform:none;letter-spacing:0;font-weight:400;margin:2px 0 0}
.ppc-a{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.ppc-pr{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px}.ppc-rf textarea{width:100%}
.ppc-sb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-radius:10px;background:rgba(127,140,150,.08);margin-bottom:12px}.ppc-sb>span{flex:1 1 260px;font-size:14px;color:var(--muted)}.ppc-sb.on{background:rgba(43,106,135,.12)}.ppc-sb.on>span{color:inherit}
.ppc-m{width:min(860px,100%)}.ppc-m .gx-f{display:flex;flex-direction:column;gap:4px;margin-top:10px}.ppc-m textarea{width:100%;font:inherit}
.ppc-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ppc-mb{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}.ppc-mb>span{flex:1}
.ppc-ur{color:var(--crit,#C0392B);font-size:11px;letter-spacing:.04em}
@media(max-width:640px){.ppc-g3{grid-template-columns:1fr}.ppc-tb{font-size:13px}}

.ppc-c.ppc-c{display:grid;grid-template-columns:28px minmax(0,1fr) 220px;gap:6px 16px;align-items:start;padding:16px 14px;border-left:3px solid transparent}
.ppc-c.crit{border-left-color:var(--crit,#C0392B)}.ppc-c.sel{background:rgba(43,106,135,.06)}
.ppc-ck{padding-top:6px}.ppc-ck input{width:20px;height:20px;accent-color:var(--teal,#2B6A87);cursor:pointer}
.ppc-mn{min-width:0;display:flex;flex-direction:column;gap:8px}
.ppc-who{display:flex;align-items:center;gap:10px}.ppc-who b{display:block;font-size:15px;font-weight:600}.ppc-who small{display:block;font-size:12.5px;color:var(--muted)}
.ppc-av{width:32px;height:32px;border-radius:50%;background:rgba(43,106,135,.12);color:var(--teal-strong,#143F54);display:grid;place-items:center;font-weight:600;flex:none}
.ppc-tags{display:flex;gap:6px;flex-wrap:wrap}
.ppc-its{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;border:1px solid var(--line,#E3E8EC);border-radius:10px;overflow:hidden;max-width:640px}
.ppc-its li{display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px;align-items:baseline;padding:8px 12px;border-top:1px solid var(--line,#E3E8EC)}.ppc-its li:first-child{border-top:0}
.ppc-q{font-variant-numeric:tabular-nums;font-weight:600;text-align:right;white-space:nowrap}
.ppc-it{font-size:14.5px;overflow-wrap:anywhere}.ppc-it small{display:block;font-size:12.5px;color:var(--muted)}
.ppc-ac{display:flex;flex-direction:column;gap:6px}.ppc-ac .btn{width:100%;justify-content:center}
.ppc-lks{display:flex;flex-wrap:wrap;gap:2px 10px;justify-content:center;margin-top:2px}
.ppc-lk{border:0;background:transparent;font:inherit;font-size:13px;color:var(--teal-strong,#143F54);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:4px 2px}.ppc-lk.del{color:var(--crit,#C0392B)}
.ppc-c+.ppc-c{border-top:1px solid var(--line,#E3E8EC)}
@media(max-width:900px){.ppc-c.ppc-c{grid-template-columns:28px minmax(0,1fr)}.ppc-ac{grid-column:2;flex-direction:row;flex-wrap:wrap}.ppc-ac .btn{width:auto}.ppc-lks{justify-content:flex-start}}
</style>`);

/* ===================== Marcelo: criar pedido, editar/incluir itens, recusar (pedido de 26/10) ===================== */
if(typeof OF_PST!=='undefined'&&OF_PST.nao) OF_PST.nao[0]='Recusado';
function ppeAbre(p){ const G=S.gpc; G.comp=null; G.resp=null;
  G.pe=p?{id:p._id,itens:ppcItens(p).map(i=>({t:i.t,qtd:String(i.qtd||''),un:i.un||'',ref:i.ref||''})),onde:p.onde||'',os:p.os?String(p.os):'',obs:p.obs||'',urg:p.urg||'semana',mot:''}
        :{id:null,itens:[ppcNovoIt()],onde:'',os:'',obs:'',urg:'semana',mot:''};
  if(!G.pe.itens.length) G.pe.itens.push(ppcNovoIt()); render(); setTimeout(()=>{ const e=document.getElementById(p?'ppe-t'+(G.pe.itens.length-1):'ppe-t0'); e&&e.focus(); },60); }
function ppeLe(){ const E=S.gpc.pe; if(!E) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  E.itens.forEach((it,i)=>{ const t=v('ppe-t'+i), q=v('ppe-q'+i), u=v('ppe-u'+i), r=v('ppe-r'+i); if(t!=null) it.t=t; if(q!=null) it.qtd=q; if(u!=null) it.un=u; if(r!=null) it.ref=r; });
  [['onde','ppe-onde'],['os','ppe-os'],['obs','ppe-obs'],['mot','ppe-mot']].forEach(([k,id])=>{ const x=v(id); if(x!=null) E[k]=x; }); }
function ppeModal(){ const G=S.gpc, E=G.pe; if(!E) return ''; const p=E.id&&ofPeds().find(x=>x._id===E.id);
  const os=(S.chamados||[]).filter(c=>!manFechada(c)&&c.status!=='Cancelada').sort((a,b)=>(+b.numero||0)-(+a.numero||0)).slice(0,60);
  const lin=(it,i)=>`<div class="ppe-it"><span class="ofp-n">${i+1}</span><label class="gx-f">${i?'':'Item'}<input id="ppe-t${i}" maxlength="160" value="${esc(it.t)}" placeholder="${i?'Outro item':'Ex.: rolamento 6205 2RS'}"></label>
    <label class="gx-f">${i?'':'Qtd.'}<input id="ppe-q${i}" maxlength="20" value="${esc(it.qtd)}"></label><label class="gx-f">${i?'':'Un.'}<select id="ppe-u${i}">${PPC_UN.map(u=>`<option value="${u}" ${it.un===u?'selected':''}>${u||'—'}</option>`).join('')}</select></label>
    <label class="gx-f">${i?'':'Marca ou medida'}<input id="ppe-r${i}" maxlength="120" value="${esc(it.ref)}" placeholder="opcional"></label>${E.itens.length>1?`<button class="ppe-x" data-act="gpx-ptira" data-v="${i}" aria-label="Tirar o item ${i+1}">×</button>`:'<span></span>'}</div>`;
  return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="ppe-h"><div class="card gx-mc ppc-m"><h2 id="ppe-h">${p?'Editar pedido de '+esc(String(p.porNome||'').split(' ')[0]||'peça'):'Novo pedido de peça'}</h2>
   <p class="sub" style="margin:4px 0 10px">${p?'Você pode corrigir, incluir ou tirar itens. O técnico vê a lista nova em "Seus pedidos".':'Pedido feito por você. Depois é só mandar para o compras.'}</p>
   <div class="ppe-its">${E.itens.map(lin).join('')}</div>${E.itens.length<20?'<button class="btn sec gx-bs" data-act="gpx-pmais" style="margin-top:8px">+ Mais um item</button>':''}
   <div class="ppc-g3" style="grid-template-columns:1fr 1fr"><label class="gx-f">Para qual serviço<select id="ppe-os"><option value="">Nenhum</option>${os.map(c=>`<option value="${c.numero}" ${String(E.os)===String(c.numero)?'selected':''}>OS ${manNum(c.numero)} · ${esc(((c.linha||'')+' · '+String(c.defeito||'').replace(/^PREVENTIVA:\s*/,'')).slice(0,50))}</option>`).join('')}</select></label>
    <label class="gx-f">Onde vai usar<input id="ppe-onde" maxlength="80" value="${esc(E.onde)}" placeholder="Ex.: Linha 2 · misturador · ou estoque"></label></div>
   <label class="gx-f">Detalhes <small>(opcional)</small><textarea id="ppe-obs" rows="2" maxlength="300">${esc(E.obs)}</textarea></label>
   <div class="gx-f" style="margin-top:10px">Para quando<div class="gx-chips" style="margin-top:4px">${OF_URG.map(([k,t])=>`<button class="gx-chip" data-act="gpx-purg" data-v="${k}" aria-pressed="${E.urg===k}">${t}</button>`).join('')}</div></div>
   ${p?`<label class="gx-f">O que mudou? <small>(opcional · o técnico vê)</small><input id="ppe-mot" maxlength="160" value="${esc(E.mot)}" placeholder="Ex.: incluí a correia que também está gasta"></label>`:''}
   <div class="ppc-mb"><button class="btn" data-act="gpx-psalva" ${G.busy?'disabled':''}>${p?'Salvar o pedido':'Criar o pedido'}</button>${p?'':'<button class="btn sec" data-act="gpx-psalvac">Criar e mandar para o compras</button>'}<span></span><button class="btn sec" data-act="gpx-pfecha">Fechar</button></div></div></div>`; }
async function ppeSalva(comp){ const G=S.gpc, E=G.pe; ppeLe(); const its=E.itens.map(i=>({t:String(i.t||'').trim(),qtd:String(i.qtd||'').trim(),un:i.un||'',ref:String(i.ref||'').trim()})).filter(i=>i.t);
  if(!its.length){ toast('Escreva pelo menos um item.'); return; } G.busy=true; render();
  const agora=new Date().toISOString(), por=gchNome(), osN=E.os?+E.os:null, oc=osN?manDoc(osN):null, resumo=its.length===1?its[0].t:its.map(i=>i.t).join('; ');
  const base={t:resumo.slice(0,300),qtd:its.length===1?ppcQtd(its[0]):its.length+' itens',itens:its,onde:oc?'':String(E.onde||'').trim(),obs:String(E.obs||'').trim(),os:osN,osTxt:oc?(oc.prevId?String(oc.defeito||'').replace(/^PREVENTIVA:\s*/,''):(oc.linha||'')+' · '+(oc.defeito||'')).slice(0,80):'',urg:E.urg||'semana'};
  try{ if(E.id){ const p=ofPeds().find(x=>x._id===E.id); if(!p) throw new Error('sumiu'); const antes=ppcItens(p), novos=its.filter(i=>!antes.some(a=>ofN(a.t)===ofN(i.t))).length, tir=antes.filter(a=>!its.some(i=>ofN(i.t)===ofN(a.t))).length;
      const o='Pedido editado por '+por+(novos?' · '+novos+(novos>1?' itens incluídos':' item incluído'):'')+(tir?' · '+tir+(tir>1?' itens tirados':' item tirado'):'')+(String(E.mot||'').trim()?' ('+String(E.mot).trim()+')':'');
      const up=Object.assign({},base,{editadoEm:agora,editadoPor:por,hist:(p.hist||[]).concat([{em:agora,o}]).slice(-50)});
      if(String(E.mot||'').trim()||novos||tir) up.resp=(p.resp||[]).concat([{em:agora,por,t:String(E.mot||'').trim()||('Mudei a lista: '+(novos?novos+' incluído'+(novos>1?'s':''):'')+(novos&&tir?', ':'')+(tir?tir+' tirado'+(tir>1?'s':''):'')+'.')}]).slice(-20);
      await S.db.doc('pedpecas/'+p._id).update(up); Object.assign(p,up); toast('Pedido salvo.'); G.pe=null; G.busy=false; render(); return; }
    const id='pp'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const d=Object.assign(base,{porNome:por,cracha:null,por:S.uid||null,origem:'gestor',em:agora,status:'visto',vistoEm:agora,vistoPor:por,hist:[{em:agora,o:'Pedido criado por '+por+(its.length>1?' ('+its.length+' itens)':'')}]});
    await S.db.doc('pedpecas/'+id).set(d); S.pedpecas=[Object.assign({_id:id},d)].concat(S.pedpecas||[]);
    if(oc) try{ await S.db.doc('chamados/'+oc._id).update({esperaPeca:{id,t:resumo.slice(0,120),em:agora},hist:(oc.hist||[]).concat([{em:agora,por:S.uid||null,o:'Esperando peça: '+resumo.slice(0,120)+' (pedido de '+por+')'}]).slice(-200)}); }catch(e){}
    G.pe=null; G.busy=false; toast('Pedido criado.'); if(comp){ ppcAbreComp([id]); return; } render(); }
  catch(e){ G.busy=false; toast('Não foi possível salvar. Verifique a internet.'); render(); } }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="gpx-p"],[data-act="gpx-novo"],[data-act="gpx-ed"]'); if(!b||b.disabled) return; const G=S.gpc, a=b.dataset.act;
  if(a==='gpx-pronta'||a==='gpx-pdf') return;
  ev.stopImmediatePropagation();
  if(a==='gpx-novo'){ ppeAbre(null); return; }
  if(a==='gpx-ed'){ const p=ofPeds().find(x=>x._id===b.dataset.id); if(p) ppeAbre(p); return; }
  if(!G.pe) return; ppeLe();
  if(a==='gpx-pmais'){ G.pe.itens.push(ppcNovoIt()); render(); setTimeout(()=>{ const e=document.getElementById('ppe-t'+(G.pe.itens.length-1)); e&&e.focus(); },60); return; }
  if(a==='gpx-ptira'){ G.pe.itens.splice(+b.dataset.v,1); if(!G.pe.itens.length) G.pe.itens.push(ppcNovoIt()); render(); return; }
  if(a==='gpx-purg'){ G.pe.urg=b.dataset.v; render(); return; }
  if(a==='gpx-pfecha'){ G.pe=null; render(); return; }
  if(a==='gpx-psalva'||a==='gpx-psalvac'){ await ppeSalva(a==='gpx-psalvac'); return; } },true);
document.addEventListener('input',ev=>{ if(/^ppe-/.test(ev.target&&ev.target.id||'')) ppeLe(); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.gpc&&S.gpc.pe&&document.querySelector('#ppe-h')){ S.gpc.pe=null; render(); } });
document.head.insertAdjacentHTML('beforeend',`<style id="ppe-css">
.ppe-its{display:flex;flex-direction:column;gap:6px}
.ppe-it{display:grid;grid-template-columns:28px minmax(0,2.4fr) minmax(60px,.6fr) minmax(70px,.6fr) minmax(0,1.5fr) 34px;gap:8px;align-items:end}.ppe-it .ofp-n{margin-bottom:8px}
.ppe-it .gx-f{display:flex;flex-direction:column;gap:4px;margin:0}.ppe-x{width:34px;height:38px;border:1px solid var(--line,#C9D3DA);background:transparent;border-radius:8px;font-size:20px;color:var(--muted);cursor:pointer}
@media(max-width:640px){.ppe-it{grid-template-columns:28px 1fr 1fr 34px}.ppe-it>label:nth-child(2),.ppe-it>label:nth-child(5){grid-column:2/4}}
</style>`);
