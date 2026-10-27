/* ===================== RH · ENTREGAS DE UNIFORME (pedido de 27/10) =====================
   Antes: a administradora abria a solicitação no sistema (Focco) e mandava um e-mail para o RH com funcionário, setor,
   data/período, itens e o nº da solicitação. Agora ela registra no painel (tela "Uniformes" do RH, rhunif) e o painel:
     1) guarda a entrega para o RH conferir e lançar na ficha (escolha da usuária: o RH lança, não entra sozinho na ficha);
     2) abre o e-mail já pronto (mesmo texto de antes) para os destinatários guardados em rh/config.unifEmail {para, cc}.
   Dados (regra rh/{resto=**}: só a dona e quem tem o RH — não precisou mudar regra):
     rh/dados/uniformes/{id} {nome,fid,setor,funcao,data,per:'Manhã'|'Tarde',itens:[{t,tam,qtd}],sol,obs,em,por,porNome,
                              st:'novo'|'lancado',lancEm,lancPor,emailEm,emailN,removido,removidoEm,removidoPor}
   Usado pelo rh.js: window.RHUnif.render(ctx) · .avisos(ctx) · .novo(). Prefixo `rhu`. */
(function(){
  const COL='rh/dados/uniformes';
  const PECAS=['Camiseta','Camiseta manga longa','Camisa polo','Calça','Bermuda','Jaqueta','Moletom','Boné','Avental'];
  const TAMS=['PP','P','M','G','GG','XG','XGG','EG','36','38','40','42','44','46','48','50'];
  const U={xs:[],lido:false,sub:false,f:null,st:'conf',cx:null,cfg:false,salvando:false};
  let C=null;
  const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const br=d=>d&&/^\d{4}-\d{2}-\d{2}/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'';
  const hm=s=>{ const d=new Date(s); return isNaN(d)?'':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); };
  function assina(c){ if(U.sub) return; U.sub=true; const P=c.P;
    P.inscrever('rh-unif',()=>P.db().collection(COL).orderBy('em','desc').limit(300),s=>{ U.xs=s.docs.map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido); U.lido=true; P.rerender(); }); }
  const cfgMail=c=>Object.assign({para:'',cc:''},(c.R.cfg&&c.R.cfg.unifEmail)||{});
  const itTxt=i=>[String(i.t||'').trim(),String(i.tam||'').trim()].filter(Boolean).join(' ')+' - '+(Math.max(1,parseInt(i.qtd,10)||1))+' un';
  const itensOk=F=>(F.itens||[]).filter(i=>String(i.t||'').trim());
  /* o texto do e-mail, igual ao que a usuária mandava */
  function texto(x){ return ['Funcionário: '+(x.nome||''),'Setor: '+(x.setor||'—'),'Data da entrega: '+br(x.data)+(x.per?' - '+x.per:''),'Itens entregues:']
      .concat(itensOk(x).map(itTxt)).concat(x.sol?['Solicitação registrada no sistema: Nº '+String(x.sol).replace(/^n[ºo°]?\s*/i,'')]:[]).concat(x.obs?['Observação: '+x.obs]:[]).join('\n'); }
  const assunto=x=>'Entrega de uniforme - '+(x.nome||'')+' - '+br(x.data);
  const lista=s=>String(s||'').split(/[;,\s]+/).map(e=>e.trim()).filter(e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  function mailto(c,x){ const M=cfgMail(c), para=lista(M.para), cc=lista(M.cc), q=[];
    if(cc.length) q.push('cc='+cc.join(';')); q.push('subject='+encodeURIComponent(assunto(x))); q.push('body='+encodeURIComponent(texto(x)));
    return 'mailto:'+para.join(';')+'?'+q.join('&'); }
  function abreEmail(c,x){ const a=document.createElement('a'); a.href=mailto(c,x); a.style.display='none'; document.body.appendChild(a); a.click(); a.remove();
    window.__rhuUltimoMail=a.href; /* para o teste conferir */
    if(!lista(cfgMail(c).para).length) c.P.toast('Abri o e-mail sem destinatário: guarde os e-mails do RH em "E-mails do RH" para vir preenchido.'); }
  /* pessoas: cadastro do RH (ativos primeiro) */
  function pessoas(c,q){ const n=norm(q); if(n.length<2) return []; const ws=n.split(' ');
    return (c.R.func||[]).filter(f=>f&&f.nome&&!f.removido&&ws.every(w=>norm(f.nome).includes(w)))
      .sort((a,b)=>((a.status==='Desligado')-(b.status==='Desligado'))||String(a.nome).localeCompare(String(b.nome),'pt-BR')).slice(0,8); }
  function sugHtml(c){ const F=U.f, e=c.esc; if(!F||F.fid) return ''; const xs=pessoas(c,F.nome); if(!xs.length) return String(F.nome||'').trim().length>=3?'<div class="rhu-sv">Não achei no cadastro do RH. Pode seguir com o nome digitado (terceiro, motorista…).</div>':'';
    return xs.map(f=>`<button type="button" class="rhu-si" data-act="rhu-pick" data-id="${e(f._id)}"><b>${e(c.titulo(f.nome))}</b><small>${e([f.setor,f.funcao,f.status==='Desligado'?'desligado':''].filter(Boolean).join(' · ')||'sem setor no cadastro')}</small></button>`).join(''); }
  function form(c){ const F=U.f, e=c.esc, fc=F.fid?c.funcaoDe((c.R.func||[]).find(x=>x._id===F.fid)):null, sug=((fc&&fc.uniformes)||[]).filter(u=>u&&u.nome), M=cfgMail(c);
    const pecas=[...new Set(PECAS.concat(sug.map(u=>u.nome)))];
    const prev={nome:c.titulo(F.nome||'')||'…',setor:F.setor,data:F.data,per:F.per,itens:F.itens,sol:F.sol,obs:F.obs};
    return `<div class="dbmodal" data-rhu-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Registrar entrega de uniforme" style="max-width:860px"><div class="rhu-fm">
      <div class="head" style="align-items:baseline;margin:0"><h2 style="margin:0">Entrega de uniforme</h2><button class="lnk" data-act="rhu-fx">Fechar</button></div>
      <div class="rhu-fg"><div class="rhu-col">
        <label class="rhu-w"><span>Funcionário</span><input class="txt" id="rhu-pn" autocomplete="off" value="${e(F.nome||'')}" placeholder="Digite o nome"></label>
        <div id="rhu-sug" class="rhu-sug">${sugHtml(c)}</div>
        ${F.fid?`<div class="rhu-sel">${c.P.ic('check',14,2.6)} Do cadastro do RH${F.funcao?' · '+e(F.funcao):''} <button class="lnk" data-act="rhu-unpick">trocar</button></div>`:''}
        <div class="rhu-2"><label><span>Setor</span><input class="txt" id="rhu-st" value="${e(F.setor||'')}" list="rhu-stl"><datalist id="rhu-stl">${(c.setores?c.setores():[]).map(x=>`<option value="${e(x)}">`).join('')}</datalist></label>
          <label><span>Data da entrega</span><input class="txt" type="date" id="rhu-dt" value="${e(F.data||'')}"></label></div>
        <div class="rhu-per" role="group" aria-label="Período">${['Manhã','Tarde'].map(p=>`<button type="button" class="${F.per===p?'on':''}" aria-pressed="${F.per===p}" data-act="rhu-per" data-v="${p}">${p}</button>`).join('')}</div>
        <div class="label" style="margin:6px 0 0">ITENS ENTREGUES</div>
        ${sug.length?`<div class="rhu-chips"><span>Uniforme da função:</span>${sug.map((u,i)=>`<button type="button" class="rhu-chip" data-act="rhu-addu" data-i="${i}">+ ${e(u.nome)}${u.tam?' '+e(u.tam):''}</button>`).join('')}</div>`:''}
        <div class="rhu-its">${(F.itens||[]).map((it,i)=>`<div class="rhu-it"><input class="txt" data-rhu-i="${i}" data-k="t" list="rhu-pcl" value="${e(it.t||'')}" placeholder="Peça" aria-label="Peça">
            <input class="txt" data-rhu-i="${i}" data-k="tam" list="rhu-tml" value="${e(it.tam||'')}" placeholder="Tam." aria-label="Tamanho">
            <input class="txt" data-rhu-i="${i}" data-k="qtd" inputmode="numeric" value="${e(String(it.qtd||1))}" aria-label="Quantidade"><span class="rhu-un">un</span>
            <button type="button" class="rhu-ix" data-act="rhu-itx" data-i="${i}" aria-label="Tirar item">×</button></div>`).join('')}</div>
        <datalist id="rhu-pcl">${pecas.map(x=>`<option value="${e(x)}">`).join('')}</datalist><datalist id="rhu-tml">${TAMS.map(x=>`<option value="${x}">`).join('')}</datalist>
        <button type="button" class="lnk" data-act="rhu-itmais" style="align-self:flex-start">+ Mais um item</button>
        <div class="rhu-2"><label><span>Nº da solicitação no sistema</span><input class="txt" id="rhu-sol" inputmode="numeric" value="${e(F.sol||'')}" placeholder="Ex.: 10102"></label>
          <label><span>Observação <small>(opcional)</small></span><input class="txt" id="rhu-ob" maxlength="200" value="${e(F.obs||'')}"></label></div>
      </div><div class="rhu-col">
        <div class="label" style="margin:0">ASSIM VAI O E-MAIL</div>
        <div class="rhu-pv"><div class="rhu-pvh"><span>Para: <b>${lista(M.para).map(e).join('; ')||'<em>sem destinatário</em>'}</b></span>${lista(M.cc).length?`<span>Cópia: <b>${lista(M.cc).map(e).join('; ')}</b></span>`:''}<span>Assunto: <b>${e(assunto(prev))}</b></span></div><pre id="rhu-pvt">${e(texto(prev))}</pre></div>
        <button class="lnk" data-act="rhu-cfg" style="align-self:flex-start">${U.cfg?'Fechar e-mails do RH':'E-mails do RH (para e cópia)'}</button>
        ${U.cfg?`<div class="rhu-cfg"><label><span>Para</span><input class="txt" id="rhu-mp" value="${e(M.para)}" placeholder="email1@colafix.com; email2@colafix.com"></label><label><span>Cópia</span><input class="txt" id="rhu-mc" value="${e(M.cc)}" placeholder="opcional"></label><button class="btn sec" data-act="rhu-cfgok">Guardar e-mails</button><small>Ficam guardados para as próximas entregas.</small></div>`:''}
      </div></div>
      <div class="rhu-ac"><button class="btn" data-act="rhu-ok" data-v="mail" ${U.salvando?'disabled':''}>Registrar e abrir o e-mail</button><button class="btn sec" data-act="rhu-ok" data-v="so" ${U.salvando?'disabled':''}>Só registrar</button></div>
    </div></div></div>`; }
  function render(c){ assina(c); const e=c.esc, P=c.P, pend=U.xs.filter(x=>x.st!=='lancado'), xs=U.st==='conf'?pend:U.xs;
    const card=x=>{ const lan=x.st==='lancado', pode=P.dono()||x.por===P.S.uid;
      return `<div class="rhu-r ${lan?'ok':''}"><div class="rhu-rd"><b>${e(br(x.data).slice(0,5))}</b><small>${e(x.per||'')}</small></div>
        <div class="rhu-rm"><b>${e(c.titulo(x.nome||''))}</b><small>${e(x.setor||'sem setor')}${x.sol?' · solicitação Nº '+e(x.sol):' · sem nº da solicitação'}</small>
          <span class="rhu-ri">${itensOk(x).map(i=>`<span>${e(itTxt(i))}</span>`).join('')}</span>
          <small>Entregue por ${e(x.porNome||'—')} · registrado ${e(hm(x.em))}${x.emailEm?' · e-mail aberto '+e(hm(x.emailEm)):''}${x.obs?' · '+e(x.obs):''}</small></div>
        <div class="rhu-rs">${lan?`<span class="pill ok">Lançado na ficha</span><small>${e(x.lancPor||'')} · ${e(hm(x.lancEm))}</small><button class="lnk" data-act="rhu-volta" data-id="${e(x._id)}">Desfazer</button>`
          :`<span class="pill warn">RH ainda não lançou</span><button class="btn sec rhu-sm" data-act="rhu-lanc" data-id="${e(x._id)}">Lancei na ficha</button>`}
          <span class="rhu-ra"><button class="lnk" data-act="rhu-mail" data-id="${e(x._id)}">E-mail de novo</button>${pode?`<button class="lnk rhu-del" data-act="rhu-del" data-id="${e(x._id)}">${U.cx===x._id?'Confirmar: apagar':'Apagar'}</button>`:''}</span></div></div>`; };
    return c.topo('Entregas de uniforme','Quem entregou registra aqui: o RH confere e lança na ficha, e o e-mail para o RH sai pronto.',`<button class="btn" data-act="rhu-novo">+ Registrar entrega</button>`)
      +`<section class="card rhu-l"><div class="seg" role="group" aria-label="Mostrar">${[['conf','Para o RH lançar ('+pend.length+')'],['todas','Todas']].map(([a,b])=>`<button class="${U.st===a?'on':''}" aria-pressed="${U.st===a}" data-act="rhu-st" data-v="${a}">${b}</button>`).join('')}</div>
        ${xs.length?xs.map(card).join(''):`<div class="empty">${!U.lido?'Carregando…':U.st==='conf'?'Nenhuma entrega esperando o RH.':'Nenhuma entrega registrada ainda. Toque em "+ Registrar entrega".'}</div>`}</section>`
      +(U.f?form(c):''); }
  function avisos(c){ const xs=U.xs.filter(x=>x.st!=='lancado'); if(!xs.length) return [];
    return [{nivel:'warn',rotulo:'Uniforme',titulo:xs.length===1?'1 entrega de uniforme para lançar na ficha':xs.length+' entregas de uniforme para lançar na ficha',texto:xs.slice(0,3).map(x=>c.titulo(x.nome||'')).join(', '),go:'rhunif'}]; }
  function novo(c){ U.f={nome:'',fid:'',setor:'',funcao:'',data:c.P.hojeStr(),per:new Date().getHours()<12?'Manhã':'Tarde',itens:[{t:'',tam:'',qtd:1}],sol:'',obs:''}; U.cfg=!lista(cfgMail(c).para).length; c.P.render(); setTimeout(()=>{ const i=document.getElementById('rhu-pn'); i&&i.focus(); },60); }
  const g=i=>{ const x=document.getElementById(i); return x?x.value:null; };
  function le(){ const F=U.f; if(!F) return; [['rhu-pn','nome'],['rhu-st','setor'],['rhu-dt','data'],['rhu-sol','sol'],['rhu-ob','obs']].forEach(([i,k])=>{ const v=g(i); if(v!=null) F[k]=v; });
    document.querySelectorAll('[data-rhu-i]').forEach(el=>{ const it=F.itens[+el.dataset.rhuI]; if(it) it[el.dataset.k]=el.value; }); }
  function pvAtualiza(){ if(!U.f||!C) return; const el=document.getElementById('rhu-pvt'); if(el){ const F=U.f; el.textContent=texto({nome:C.titulo(F.nome||'')||'…',setor:F.setor,data:F.data,per:F.per,itens:F.itens,sol:F.sol,obs:F.obs}); } }
  document.addEventListener('input',ev=>{ const t=ev.target; if(!U.f||!C||!t||!t.closest||!t.closest('.rhu-fm')) return; le();
    if(t.id==='rhu-pn'){ U.f.fid=''; const s=document.getElementById('rhu-sug'); if(s) s.innerHTML=sugHtml(C); const sel=document.querySelector('.rhu-sel'); if(sel) sel.remove(); }
    pvAtualiza(); });
  document.addEventListener('keydown',ev=>{ if(!U.f) return; if(ev.key==='Escape'){ U.f=null; C&&C.P.render(); }
    if(ev.key==='Enter'&&ev.target&&ev.target.id==='rhu-pn'){ const b=document.querySelector('[data-act="rhu-pick"]'); if(b){ ev.preventDefault(); b.click(); } } });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-rhu-fundo]'); if(fu&&ev.target===fu){ le(); U.f=null; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rhu-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, db=P.db(), agora=new Date().toISOString(), eu=C.eu(); le(); const F=U.f;
    if(a==='rhu-novo'){ novo(C); return; } if(a==='rhu-fx'){ U.f=null; P.render(); return; } if(a==='rhu-st'){ U.st=b.dataset.v; P.render(); return; }
    if(a==='rhu-pick'&&F){ const f=(C.R.func||[]).find(x=>x._id===b.dataset.id); if(f){ Object.assign(F,{fid:f._id,nome:C.titulo(f.nome),setor:f.setor||F.setor||'',funcao:f.funcao||''});
        const fc=C.funcaoDe(f); if(fc&&(fc.uniformes||[]).length&&!F.itens.some(i=>String(i.t||'').trim())) F.itens=[]; if(!F.itens.length) F.itens=[{t:'',tam:'',qtd:1}]; } P.render(); return; }
    if(a==='rhu-unpick'&&F){ F.fid=''; F.funcao=''; P.render(); setTimeout(()=>{ const i=document.getElementById('rhu-pn'); i&&(i.focus(),i.select()); },40); return; }
    if(a==='rhu-per'&&F){ F.per=b.dataset.v; P.render(); return; }
    if(a==='rhu-addu'&&F){ const fc=C.funcaoDe((C.R.func||[]).find(x=>x._id===F.fid)), u=fc&&(fc.uniformes||[])[+b.dataset.i]; if(u){ const vz=F.itens.findIndex(i=>!String(i.t||'').trim()); const it={t:u.nome,tam:u.tam||'',qtd:1}; if(vz>=0) F.itens[vz]=it; else F.itens.push(it); } P.render(); return; }
    if(a==='rhu-itmais'&&F){ F.itens.push({t:'',tam:'',qtd:1}); P.render(); setTimeout(()=>{ const xs=document.querySelectorAll('[data-k="t"]'); xs.length&&xs[xs.length-1].focus(); },40); return; }
    if(a==='rhu-itx'&&F){ F.itens.splice(+b.dataset.i,1); if(!F.itens.length) F.itens=[{t:'',tam:'',qtd:1}]; P.render(); return; }
    if(a==='rhu-cfg'){ U.cfg=!U.cfg; P.render(); return; }
    if(a==='rhu-cfgok'){ const d={para:lista(g('rhu-mp')).join('; '),cc:lista(g('rhu-mc')).join('; ')}; if(!d.para) return P.toast('Escreva pelo menos um e-mail em "Para".');
      try{ await db.doc('rh/config').set({unifEmail:d},{merge:true}); C.R.cfg=C.R.cfg||{}; C.R.cfg.unifEmail=d; U.cfg=false; P.toast('E-mails do RH guardados.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-ok'&&F){ if(U.salvando) return; const nome=C.titulo(String(F.nome||'').trim().replace(/\s+/g,' ')), its=itensOk(F).map(i=>({t:String(i.t).trim(),tam:String(i.tam||'').trim().toUpperCase(),qtd:Math.max(1,parseInt(i.qtd,10)||1)}));
      if(nome.length<3) return P.toast('Escreva o nome de quem recebeu.'); if(!its.length) return P.toast('Diga qual peça foi entregue.'); if(!F.data) return P.toast('Escolha a data da entrega.');
      const d={nome,fid:F.fid||'',setor:String(F.setor||'').trim(),funcao:F.funcao||'',data:F.data,per:F.per||'',itens:its,sol:String(F.sol||'').trim().replace(/^n[ºo°]?\s*/i,''),obs:String(F.obs||'').trim(),em:agora,por:P.S.uid||'',porNome:eu,st:'novo'};
      if(b.dataset.v==='mail'){ d.emailEm=agora; d.emailN=1; }
      U.salvando=true; const nid=id();
      try{ await db.doc(COL+'/'+nid).set(d); if(!U.xs.some(x=>x._id===nid)) U.xs.unshift(Object.assign({_id:nid},d)); U.f=null; U.st='conf';
        if(b.dataset.v==='mail') abreEmail(C,d); P.toast('Entrega registrada'+(b.dataset.v==='mail'?' · e-mail aberto para mandar ao RH.':'. O RH vai ver em Uniformes.')); }
      catch(e){ P.erro(e); } finally{ U.salvando=false; } P.render(); return; }
    const x=U.xs.find(y=>y._id===b.dataset.id); if(!x) return;
    if(a==='rhu-mail'){ abreEmail(C,x); try{ const up={emailEm:agora,emailN:(x.emailN||0)+1}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); }catch(e){} P.render(); return; }
    if(a==='rhu-lanc'){ try{ const up={st:'lancado',lancEm:agora,lancPor:eu}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); P.toast('Marcado como lançado na ficha.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-volta'){ try{ const up={st:'novo',lancEm:null,lancPor:null}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-del'){ if(U.cx!==x._id){ U.cx=x._id; P.render(); setTimeout(()=>{ if(U.cx===x._id){ U.cx=null; P.render(); } },4000); return; } U.cx=null;
      try{ await db.doc(COL+'/'+x._id).update({removido:true,removidoEm:agora,removidoPor:eu}); U.xs=U.xs.filter(y=>y!==x); P.toast('Entrega apagada.'); }catch(e){ P.erro(e); } P.render(); return; } });
  window.RHUnif={render:c=>{ C=c; return render(c); },avisos:c=>{ C=C||c; try{ assina(c); return avisos(c); }catch(e){ return []; } },novo:()=>{ if(C) novo(C); },texto,_U:U};
  document.head.insertAdjacentHTML('beforeend',`<style id="rhu-css">
.rhu-fm{padding:20px 22px;display:flex;flex-direction:column;gap:14px}
.rhu-fg{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:20px}@media (max-width:760px){.rhu-fg{grid-template-columns:1fr}}
.rhu-col{display:flex;flex-direction:column;gap:10px;min-width:0}.rhu-fm label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted);font-weight:600;min-width:0}
.rhu-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rhu-sug{display:flex;flex-direction:column;gap:4px}.rhu-sug:empty{display:none}
.rhu-si{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:7px 10px;cursor:pointer;font:inherit;color:inherit}.rhu-si:hover,.rhu-si:focus{border-color:var(--teal)}.rhu-si small{color:var(--muted);font-size:12px}
.rhu-sv{font-size:12.5px;color:var(--muted)}.rhu-sel{font-size:12.5px;color:var(--ok-ink,var(--ok));display:flex;gap:6px;align-items:center}
.rhu-per{display:flex;gap:6px}.rhu-per button{flex:1;height:40px;border-radius:9px;border:1.5px solid var(--line);background:var(--surface);font:inherit;font-weight:600;color:inherit;cursor:pointer}.rhu-per button.on{border-color:var(--teal-strong);background:var(--teal-strong);color:#fff}
.rhu-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--muted)}.rhu-chip{border:1px dashed var(--teal);background:transparent;color:var(--teal-strong);border-radius:99px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer}
.rhu-its{display:flex;flex-direction:column;gap:6px}.rhu-it{display:grid;grid-template-columns:minmax(0,1fr) 74px 58px auto 30px;gap:6px;align-items:center}.rhu-un{font-size:13px;color:var(--muted)}
.rhu-ix{border:0;background:none;font-size:20px;color:var(--muted);cursor:pointer}
.rhu-pv{border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden}.rhu-pvh{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--muted)}.rhu-pvh b{color:var(--ink,inherit);font-weight:600;word-break:break-word}
.rhu-pv pre{margin:0;padding:12px;font:inherit;font-size:13.5px;white-space:pre-wrap;line-height:1.5}
.rhu-cfg{display:flex;flex-direction:column;gap:8px;background:var(--ground);border-radius:10px;padding:10px 12px}.rhu-cfg small{color:var(--muted);font-size:12px}
.rhu-ac{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.rhu-l{display:flex;flex-direction:column;gap:0}.rhu-l .seg{margin-bottom:10px;align-self:flex-start}
.rhu-r{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;padding:12px 0;border-top:1px solid var(--line);align-items:start}.rhu-r.ok{opacity:.75}
.rhu-rd{display:flex;flex-direction:column}.rhu-rd b{font-size:18px}.rhu-rd small,.rhu-rm small{color:var(--muted);font-size:12.5px}
.rhu-rm{display:flex;flex-direction:column;gap:3px;min-width:0}.rhu-ri{display:flex;gap:6px;flex-wrap:wrap}.rhu-ri span{background:var(--ground);border-radius:7px;padding:2px 8px;font-size:13px}
.rhu-rs{display:flex;flex-direction:column;align-items:flex-end;gap:5px}.rhu-rs small{color:var(--muted);font-size:12px}.rhu-ra{display:flex;gap:12px}.rhu-del{color:var(--crit-ink,var(--crit))}.rhu-sm{height:34px;padding:0 12px}
@media (max-width:640px){.rhu-r{grid-template-columns:48px minmax(0,1fr)}.rhu-rs{grid-column:1/-1;align-items:flex-start}.rhu-2{grid-template-columns:1fr}}
</style>`);
})();
