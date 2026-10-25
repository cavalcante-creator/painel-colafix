/* ===================== RH · VAGAS E CANDIDATOS (pedido 34, 24/10) =====================
   Tela "Vagas" do RH (rhvagas, antes de Cadastros): vagas abertas e os candidatos de cada uma, etapa por etapa, até a admissão.
   Dados (regra rh/{resto=**}: só a dona e quem tem o RH):
     rh/dados/vagasab/{id}     {funcao,setor,qtd,tipo:'CLT'|'PJ',motivo:'aumento'|'substituicao',substitui,obs,status:'aberta'|'pausada'|'fechada',abertaEm,em,porNome,fechadaEm}
     rh/dados/candidatos/{id}  {vagaId,nome,tel,email,origem,etapa,entrevista:'AAAA-MM-DDTHH:MM',obs,cv:{url,nome},hist:[{em,de,para,porNome,obs}],em,porNome}
   Etapas: novo → triagem → entrevista → aprovado → admitido (ou reprovado / desistiu). "Começar admissão" abre a Nova admissão do RH
   já com nome, telefone, função, setor e vínculo (ctx.admIni), e marca o candidato como admitido.
   Usado pelo rh.js: window.RHVagas.render(ctx) · .avisos(ctx). */
(function(){
  const COLV='rh/dados/vagasab', COLC='rh/dados/candidatos';
  const ET=[['novo','Novos'],['triagem','Triagem'],['entrevista','Entrevista'],['aprovado','Aprovados']], FIM=[['admitido','Admitido'],['reprovado','Não passou'],['desistiu','Desistiu']];
  const ETN=Object.fromEntries(ET.concat(FIM)), ORIG=['Indicação','Site / redes','Placa na portaria','Agência','Banco de currículos','Outro'];
  const V={vagas:[],cands:[],lido:false,sub:false,sel:null,vf:null,cf:null,cx:null,st:'abertas',q:''};
  const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function assina(c){ if(V.sub) return; V.sub=true; const P=c.P;
    P.inscrever('rh-vagas',()=>P.db().collection(COLV).limit(300),s=>{ V.vagas=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); V.lido=true; P.rerender(); });
    P.inscrever('rh-cands',()=>P.db().collection(COLC).limit(2000),s=>{ V.cands=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); P.rerender(); }); }
  const candsDe=v=>V.cands.filter(x=>x.vagaId===v._id);
  const vagaTit=v=>(v.funcao||'Vaga')+(v.setor?' · '+v.setor:'');
  const fone=t=>String(t||'').replace(/\D/g,'');
  const dtx=s=>{ if(!s) return ''; const d=new Date(s); return isNaN(d)?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
  function formVaga(c){ const F=V.vf, e=c.esc, fs=(c.funcoes?c.funcoes():[]), ss=(c.setores?c.setores():[]);
    return `<div class="dbmodal" data-rhv-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Vaga" style="max-width:620px"><div style="padding:20px 22px">
      <div class="head" style="align-items:baseline"><h2 style="margin:0">${F._id?'Editar vaga':'Nova vaga'}</h2><button class="lnk" data-act="rhv-vx">Fechar</button></div>
      <div class="rhv-fg"><label><span>Função</span><input class="txt" id="rhv-fn" list="rhv-fnl" value="${e(F.funcao||'')}" placeholder="Ex.: Operador de produção"><datalist id="rhv-fnl">${fs.map(x=>`<option value="${e(x)}">`).join('')}</datalist></label>
        <label><span>Setor</span><input class="txt" id="rhv-st" list="rhv-stl" value="${e(F.setor||'')}"><datalist id="rhv-stl">${ss.map(x=>`<option value="${e(x)}">`).join('')}</datalist></label>
        <label><span>Quantas pessoas</span><input class="txt" id="rhv-qt" inputmode="numeric" value="${e(String(F.qtd||1))}"></label>
        <label><span>Vínculo</span><select class="txt" id="rhv-tp">${['CLT','PJ'].map(x=>`<option ${F.tipo===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label><span>Motivo</span><select class="txt" id="rhv-mo"><option value="aumento" ${F.motivo!=='substituicao'?'selected':''}>Aumento de quadro</option><option value="substituicao" ${F.motivo==='substituicao'?'selected':''}>Substituir alguém</option></select></label>
        <label><span>Substitui <small>(se for o caso)</small></span><input class="txt" id="rhv-sb" value="${e(F.substitui||'')}"></label>
        <label class="rhv-w"><span>Observação</span><input class="txt" id="rhv-ob" maxlength="200" value="${e(F.obs||'')}" placeholder="Ex.: turno da tarde, precisa ter CNH"></label></div>
      <div class="rhv-ac"><button class="btn" data-act="rhv-vok">${F._id?'Salvar':'Abrir vaga'}</button></div></div></div></div>`; }
  function formCand(c){ const F=V.cf, e=c.esc;
    return `<div class="dbmodal" data-rhv-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Candidato" style="max-width:620px"><div style="padding:20px 22px">
      <div class="head" style="align-items:baseline"><h2 style="margin:0">${F._id?'Candidato':'Novo candidato'}</h2><button class="lnk" data-act="rhv-cx">Fechar</button></div>
      <div class="rhv-fg"><label class="rhv-w"><span>Nome</span><input class="txt" id="rhv-cn" value="${e(F.nome||'')}"></label>
        <label><span>Telefone / WhatsApp</span><input class="txt" id="rhv-ct" inputmode="tel" value="${e(F.tel||'')}"></label>
        <label><span>E-mail <small>(opcional)</small></span><input class="txt" id="rhv-ce" value="${e(F.email||'')}"></label>
        <label><span>Como chegou</span><select class="txt" id="rhv-co"><option value="">—</option>${ORIG.map(x=>`<option ${F.origem===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label><span>Entrevista <small>(dia e hora)</small></span><input class="txt" type="datetime-local" id="rhv-cv" value="${e(F.entrevista||'')}"></label>
        <label class="rhv-w"><span>Observação</span><textarea class="txt" id="rhv-cb" rows="2" maxlength="600">${e(F.obs||'')}</textarea></label>
        <label class="rhv-w"><span>Currículo <small>(foto ou PDF, opcional)</small>${F.cv&&F.cv.url?` · <a href="${e(F.cv.url)}" target="_blank" rel="noopener">ver o que está guardado</a>`:''}</span><input type="file" id="rhv-cf" accept="image/*,application/pdf,.doc,.docx"></label></div>
      <div class="rhv-ac"><button class="btn" data-act="rhv-cok" ${V.salv?'disabled':''}>${V.salv?'Salvando…':F._id?'Salvar':'Pôr na vaga'}</button></div></div></div></div>`; }
  function cartao(c,x){ const e=c.esc, w=fone(x.tel), i=ET.findIndex(t=>t[0]===x.etapa), prox=ET[i+1];
    return `<div class="rhv-cd"><button class="rhv-cn" data-act="rhv-ced" data-id="${e(x._id)}"><b>${e(x.nome)}</b><small>${e(x.origem||'')}${x.entrevista?' · entrevista '+dtx(x.entrevista):''}</small></button>
      ${x.obs?`<span class="rhv-ob">${e(x.obs.slice(0,90))}</span>`:''}
      <div class="rhv-bs">${w?`<a class="lnk" href="https://wa.me/${w.length<=11?'55'+w:w}" target="_blank" rel="noopener">WhatsApp</a>`:''}${x.cv&&x.cv.url?`<a class="lnk" href="${e(x.cv.url)}" target="_blank" rel="noopener">Currículo</a>`:''}
        ${x.etapa==='aprovado'?`<button class="btn" data-act="rhv-adm" data-id="${e(x._id)}">Começar admissão</button>`:prox?`<button class="btn sec" data-act="rhv-et" data-id="${e(x._id)}" data-v="${prox[0]}">${prox[0]==='aprovado'?'Aprovar':'→ '+prox[1]}</button>`:''}
        <button class="lnk" data-act="rhv-et" data-id="${e(x._id)}" data-v="reprovado">Não passou</button><button class="lnk" data-act="rhv-et" data-id="${e(x._id)}" data-v="desistiu">Desistiu</button></div></div>`; }
  function render(c){ assina(c); const e=c.esc, h=c.P.hojeStr();
    if(!V.lido) return `<section class="card"><div class="empty">Carregando as vagas…</div></section>`;
    const ab=V.vagas.filter(v=>v.status!=='fechada'), vis=(V.st==='abertas'?ab:V.vagas.filter(v=>v.status==='fechada')).sort((a,b)=>String(b.abertaEm||b.em).localeCompare(String(a.abertaEm||a.em)));
    const and=V.cands.filter(x=>ET.some(t=>t[0]===x.etapa)), em7=and.filter(x=>x.entrevista&&x.entrevista.slice(0,10)>=h&&x.entrevista.slice(0,10)<=c.addDias(h,7)), adm=V.cands.filter(x=>x.etapa==='admitido'&&(x.admEm||'').slice(0,7)===h.slice(0,7));
    if(V.sel&&!V.vagas.some(v=>v._id===V.sel)) V.sel=null; if(!V.sel&&vis[0]) V.sel=vis[0]._id; const v=V.vagas.find(x=>x._id===V.sel);
    const lst=vis.map(x=>{ const cs=candsDe(x), adm=cs.filter(y=>y.etapa==='admitido').length; return `<button class="rhv-v ${x._id===V.sel?'on':''}" data-act="rhv-sel" data-id="${e(x._id)}"><b>${e(vagaTit(x))}</b><small>${x.qtd>1?x.qtd+' vagas · ':''}${e(x.tipo||'CLT')} · aberta em ${e(c.br(String(x.abertaEm||x.em||'').slice(0,10)))}${x.status==='pausada'?' · pausada':''}</small><span>${ET.map(t=>`<i title="${t[1]}">${cs.filter(y=>y.etapa===t[0]).length}</i>`).join('')}${adm?`<em>${adm} admitido${adm>1?'s':''}</em>`:''}</span></button>`; }).join('');
    const det=v?(()=>{ const cs=candsDe(v), q=String(V.q||'').toLowerCase(), f=cs.filter(x=>!q||String(x.nome).toLowerCase().includes(q)), adm=cs.filter(y=>y.etapa==='admitido').length;
      return `<section class="card rhv-d"><div class="rhv-dh"><div><div class="eyebrow">${v.motivo==='substituicao'?'SUBSTITUIÇÃO'+(v.substitui?' DE '+e(String(v.substitui).toUpperCase()):''):'AUMENTO DE QUADRO'} · ${e(v.tipo||'CLT')}</div><h2 style="margin:2px 0 0">${e(vagaTit(v))}</h2><div class="sub" style="margin:2px 0 0">${adm} de ${v.qtd||1} preenchida${(v.qtd||1)>1?'s':''}${v.obs?' · '+e(v.obs):''}</div></div>
        <div class="rhv-bs"><button class="btn" data-act="rhv-cnovo">+ Candidato</button><button class="btn sec" data-act="rhv-ved">Editar</button>${v.status==='fechada'?`<button class="btn sec" data-act="rhv-vst" data-v="aberta">Reabrir</button>`:`<button class="btn sec" data-act="rhv-vst" data-v="${v.status==='pausada'?'aberta':'pausada'}">${v.status==='pausada'?'Retomar':'Pausar'}</button><button class="btn sec" data-act="rhv-vst" data-v="fechada">${V.cx==='fechar'?'Confirmar: fechar':'Fechar vaga'}</button>`}</div></div>
        ${adm>=(v.qtd||1)&&v.status!=='fechada'?'<div class="banner" style="margin:10px 0 0">A vaga já está preenchida. Pode fechar.</div>':''}
        ${cs.length>6?`<input class="txt" id="rhv-q" placeholder="Procurar candidato" value="${e(V.q||'')}" style="margin-top:10px">`:''}
        <div class="rhv-k">${ET.map(t=>{ const xs=f.filter(x=>x.etapa===t[0]); return `<div class="rhv-col"><div class="rhv-ch"><b>${t[1]}</b><span>${xs.length}</span></div>${xs.map(x=>cartao(c,x)).join('')||'<div class="rhv-vz">—</div>'}</div>`; }).join('')}</div>
        ${f.some(x=>FIM.some(t=>t[0]===x.etapa))?`<details class="rhv-fim"><summary>Encerrados (${f.filter(x=>FIM.some(t=>t[0]===x.etapa)).length})</summary>${f.filter(x=>FIM.some(t=>t[0]===x.etapa)).map(x=>`<div class="rhv-fr"><b>${e(x.nome)}</b><span>${e(ETN[x.etapa])}${(x.hist||[]).length?' · '+e(c.br(String(x.hist[x.hist.length-1].em).slice(0,10))):''}</span>${x.etapa!=='admitido'?`<button class="lnk" data-act="rhv-et" data-id="${e(x._id)}" data-v="triagem">Voltar para a triagem</button>`:''}</div>`).join('')}</details>`:''}</section>`; })()
      :`<section class="card"><div class="empty">${V.st==='abertas'?'Nenhuma vaga aberta. Toque em "+ Nova vaga".':'Nenhuma vaga fechada.'}</div></section>`;
    const k=(n,l,cl)=>`<div class="${cl||''}"><b class="num">${n}</b><span>${l}</span></div>`;
    return c.topo('Vagas e candidatos','Vagas abertas e cada candidato até a admissão.',`<button class="btn" data-act="rhv-vnova">+ Nova vaga</button>`)
      +`<div class="rh-fk rhv-n">${k(ab.length,'vagas abertas')}${k(and.length,'candidatos em andamento')}${k(em7.length,'entrevistas nos próximos 7 dias',em7.length?'warn':'')}${k(adm.length,'admitidos este mês','')}</div>
      ${em7.length?`<section class="card rhv-ag"><b>Próximas entrevistas</b>${em7.sort((a,b)=>a.entrevista.localeCompare(b.entrevista)).map(x=>{ const vv=V.vagas.find(y=>y._id===x.vagaId); return `<span><em>${dtx(x.entrevista)}</em> ${e(x.nome)}${vv?' · '+e(vagaTit(vv)):''}</span>`; }).join('')}</section>`:''}
      <div class="rhv-g"><section class="card rhv-l"><div class="seg">${[['abertas','Abertas'],['fechadas','Fechadas']].map(([a,b])=>`<button class="${V.st===a?'on':''}" aria-pressed="${V.st===a}" data-act="rhv-st" data-v="${a}">${b}</button>`).join('')}</div>${lst||'<div class="sub" style="margin:10px 0 0">—</div>'}</section>${det}</div>
      ${V.vf?formVaga(c):''}${V.cf?formCand(c):''}`; }
  function avisos(c){ const h=c.P.hojeStr(); return V.cands.filter(x=>ET.some(t=>t[0]===x.etapa)&&x.entrevista&&x.entrevista.slice(0,10)===h).map(x=>({nivel:'warn',rotulo:'Entrevista hoje',titulo:x.nome+' · '+x.entrevista.slice(11,16),texto:'Vagas e candidatos',go:'rhvagas'})); }
  let C=null; const g=i=>{ const x=document.getElementById(i); return x?x.value:null; };
  function leV(){ const F=V.vf; if(!F) return; [['rhv-fn','funcao'],['rhv-st','setor'],['rhv-qt','qtd'],['rhv-tp','tipo'],['rhv-mo','motivo'],['rhv-sb','substitui'],['rhv-ob','obs']].forEach(([i,k])=>{ const v=g(i); if(v!=null) F[k]=v; }); }
  function leC(){ const F=V.cf; if(!F) return; [['rhv-cn','nome'],['rhv-ct','tel'],['rhv-ce','email'],['rhv-co','origem'],['rhv-cv','entrevista'],['rhv-cb','obs']].forEach(([i,k])=>{ const v=g(i); if(v!=null) F[k]=v; }); }
  document.addEventListener('input',ev=>{ if(ev.target&&ev.target.id==='rhv-q'&&C){ V.q=ev.target.value; const p=ev.target.selectionStart; C.P.render(); const n=document.getElementById('rhv-q'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } } });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-rhv-fundo]'); if(fu&&ev.target===fu){ V.vf=null; V.cf=null; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rhv-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, db=P.db(), agora=new Date().toISOString(), eu=C.eu();
    leV(); leC(); const v=V.vagas.find(x=>x._id===V.sel);
    if(a==='rhv-st'){ V.st=b.dataset.v; V.sel=null; P.render(); return; } if(a==='rhv-sel'){ V.sel=b.dataset.id; V.cx=null; P.render(); return; }
    if(a==='rhv-vnova'){ V.vf={qtd:1,tipo:'CLT',motivo:'aumento'}; P.render(); setTimeout(()=>{ const i=document.getElementById('rhv-fn'); i&&i.focus(); },60); return; }
    if(a==='rhv-ved'&&v){ V.vf=Object.assign({},v); P.render(); return; } if(a==='rhv-vx'){ V.vf=null; P.render(); return; } if(a==='rhv-cx'){ V.cf=null; P.render(); return; }
    if(a==='rhv-vok'){ const F=V.vf; if(!String(F.funcao||'').trim()) return P.toast('Diga a função da vaga.'); const d={funcao:String(F.funcao).trim(),setor:String(F.setor||'').trim(),qtd:Math.max(1,parseInt(F.qtd,10)||1),tipo:F.tipo||'CLT',motivo:F.motivo||'aumento',substitui:String(F.substitui||'').trim(),obs:String(F.obs||'').trim()};
      try{ if(F._id){ await db.doc(COLV+'/'+F._id).update(Object.assign(d,{alteradoEm:agora,alteradoPor:eu})); Object.assign(V.vagas.find(x=>x._id===F._id)||{},d); }
        else { const n=id(); Object.assign(d,{status:'aberta',abertaEm:agora,em:agora,porNome:eu}); await db.doc(COLV+'/'+n).set(d); V.vagas.push(Object.assign({_id:n},d)); V.sel=n; V.st='abertas'; }
        V.vf=null; P.toast('Vaga salva.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhv-vst'&&v){ const st=b.dataset.v; if(st==='fechada'&&V.cx!=='fechar'){ V.cx='fechar'; P.render(); return; } V.cx=null;
      try{ const d={status:st}; if(st==='fechada') d.fechadaEm=agora; await db.doc(COLV+'/'+v._id).update(d); Object.assign(v,d); P.toast(st==='fechada'?'Vaga fechada.':st==='pausada'?'Vaga pausada.':'Vaga aberta.'); if(st==='fechada'){ V.st='fechadas'; } }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhv-cnovo'&&v){ V.cf={vagaId:v._id,etapa:'novo'}; P.render(); setTimeout(()=>{ const i=document.getElementById('rhv-cn'); i&&i.focus(); },60); return; }
    if(a==='rhv-ced'){ const x=V.cands.find(y=>y._id===b.dataset.id); if(x){ V.cf=Object.assign({},x); P.render(); } return; }
    if(a==='rhv-cok'){ const F=V.cf; if(String(F.nome||'').trim().length<3) return P.toast('Escreva o nome do candidato.'); const fi=document.getElementById('rhv-cf'), file=fi&&fi.files&&fi.files[0];
      const d={nome:String(F.nome).trim(),tel:String(F.tel||'').trim(),email:String(F.email||'').trim(),origem:F.origem||'',entrevista:F.entrevista||'',obs:String(F.obs||'').trim()};
      V.salv=true; P.render();
      try{ const n=F._id||id(); if(file){ try{ const r=await C.guardar('Candidatos/'+d.nome.replace(/[\\/:*?"<>|]+/g,' ').trim(),file.name,file); if(r&&r.url) d.cv={url:r.url,nome:file.name}; }catch(e){ P.toast('Não consegui guardar o currículo; o resto foi salvo.'); } }
        if(F._id){ await db.doc(COLC+'/'+n).update(d); Object.assign(V.cands.find(x=>x._id===n)||{},d); }
        else { Object.assign(d,{vagaId:F.vagaId,etapa:'novo',hist:[{em:agora,de:'',para:'novo',porNome:eu}],em:agora,porNome:eu}); await db.doc(COLC+'/'+n).set(d); V.cands.push(Object.assign({_id:n},d)); }
        V.cf=null; P.toast('Candidato salvo.'); }catch(e){ P.erro(e); } V.salv=false; P.render(); return; }
    if(a==='rhv-et'){ const x=V.cands.find(y=>y._id===b.dataset.id), para=b.dataset.v; if(!x) return; const hist=(x.hist||[]).concat([{em:agora,de:x.etapa,para,porNome:eu}]);
      try{ await db.doc(COLC+'/'+x._id).update({etapa:para,hist}); x.etapa=para; x.hist=hist; P.toast(x.nome+': '+ETN[para]+'.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhv-adm'){ const x=V.cands.find(y=>y._id===b.dataset.id), vv=x&&V.vagas.find(y=>y._id===x.vagaId); if(!x) return; const hist=(x.hist||[]).concat([{em:agora,de:x.etapa,para:'admitido',porNome:eu}]);
      try{ await db.doc(COLC+'/'+x._id).update({etapa:'admitido',hist,admEm:agora}); x.etapa='admitido'; x.hist=hist; x.admEm=agora; }catch(e){ return P.erro(e); }
      C.admIni({nome:x.nome,telefone:x.tel||'',email:x.email||'',funcao:vv&&vv.funcao||'',setor:vv&&vv.setor||'',tipo:vv&&vv.tipo||'CLT'}); return; } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&(V.vf||V.cf)&&C){ V.vf=null; V.cf=null; C.P.render(); } });
  window.RHVagas={render:c=>{ C=c; return render(c); },avisos:c=>{ C=C||c; try{ assina(c); return avisos(c); }catch(e){ return []; } },_V:V};
  document.head.insertAdjacentHTML('beforeend',`<style id="rhv-css">
.rhv-n{margin-bottom:14px}.rhv-g{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}@media(max-width:900px){.rhv-g{grid-template-columns:1fr}}
.rhv-l .seg{margin-bottom:10px}.rhv-v{display:block;width:100%;text-align:left;border:1px solid var(--line,#D5DDE3);background:var(--surface,#fff);border-radius:12px;padding:10px 12px;margin-top:8px;cursor:pointer;font:inherit;color:inherit}
.rhv-v.on{border-color:var(--teal,#2B6A87);box-shadow:0 0 0 2px rgba(43,106,135,.18)}.rhv-v b,.rhv-v small{display:block}.rhv-v small{color:var(--muted);font-size:12px;margin-top:2px}
.rhv-v span{display:flex;gap:4px;margin-top:6px;align-items:center}.rhv-v i{font-style:normal;font-size:11px;min-width:22px;text-align:center;padding:1px 4px;border-radius:6px;background:rgba(127,140,150,.15)}.rhv-v em{font-style:normal;font-size:11px;color:var(--ok,#2F8C5A);font-weight:600;margin-left:4px}
.rhv-dh{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start}.rhv-bs{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rhv-k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}@media(max-width:1200px){.rhv-k{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.rhv-k{grid-template-columns:1fr}}
.rhv-col{background:rgba(127,140,150,.08);border-radius:12px;padding:8px;min-height:80px}.rhv-ch{display:flex;justify-content:space-between;padding:2px 4px 6px;font-size:13px}.rhv-ch span{color:var(--muted)}.rhv-vz{color:var(--muted);text-align:center;padding:10px}
.rhv-cd{background:var(--surface,#fff);border:1px solid var(--line,#D5DDE3);border-radius:10px;padding:8px 10px;margin-bottom:8px}.rhv-cn{display:block;width:100%;text-align:left;border:0;background:none;padding:0;cursor:pointer;font:inherit;color:inherit}.rhv-cn b,.rhv-cn small{display:block}.rhv-cn small{color:var(--muted);font-size:12px}
.rhv-ob{display:block;font-size:12px;color:var(--muted);margin-top:4px}.rhv-cd .rhv-bs{margin-top:6px;gap:6px 10px}.rhv-cd .btn{height:32px;padding:0 10px;font-size:13px}
.rhv-fim{margin-top:12px}.rhv-fim summary{cursor:pointer;color:var(--muted)}.rhv-fr{display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--line,#E3E8EC);flex-wrap:wrap}.rhv-fr span{color:var(--muted);font-size:13px;flex:1}
.rhv-ag{display:flex;flex-direction:column;gap:4px;margin-bottom:14px}.rhv-ag em{font-style:normal;font-weight:600;margin-right:6px}
.rhv-fg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.rhv-fg label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}.rhv-fg small{font-weight:400;color:var(--muted)}.rhv-w{grid-column:span 2}@media(max-width:600px){.rhv-fg{grid-template-columns:1fr}.rhv-w{grid-column:auto}}
.rhv-ac{margin-top:14px;display:flex;justify-content:flex-end}
</style>`);
})();
