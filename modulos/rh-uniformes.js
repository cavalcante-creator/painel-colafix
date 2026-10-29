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
  const U={xs:[],lido:false,sub:false,f:null,st:'conf',cx:null,cfg:false,salvando:false,rel:{per:'mes',de:'',ate:'',q:''},dEd:null,precos:false};
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
  /* Outlook na internet (pedido de 29/10): abre um e-mail novo no outlook.office.com já preenchido. Quem usa o programa do
     computador escolhe "Programa do computador" em "E-mails do RH" (rh/config.unifEmail.modo = 'app' → mailto). */
  const modoMail=c=>cfgMail(c).modo==='app'?'app':'web';
  function owa(c,x){ const M=cfgMail(c), q=[]; q.push('to='+encodeURIComponent(lista(M.para).join(';'))); if(lista(M.cc).length) q.push('cc='+encodeURIComponent(lista(M.cc).join(';')));
    q.push('subject='+encodeURIComponent(assunto(x))); q.push('body='+encodeURIComponent(texto(x))); return 'https://outlook.office.com/mail/deeplink/compose?'+q.join('&'); }
  /* a janela é aberta NA HORA do clique (senão o navegador bloqueia) e recebe o endereço depois de gravar */
  const preJanela=c=>{ if(modoMail(c)!=='web') return null; try{ return window.open('','_blank'); }catch(e){ return null; } };
  function abreEmail(c,x,w){ let url;
    if(modoMail(c)==='web'){ url=owa(c,x); if(w&&!w.closed){ try{ w.opener=null; w.location.href=url; }catch(e){ w=null; } } if(!w){ const ok=window.open(url,'_blank','noopener'); if(!ok) c.P.toast('O navegador bloqueou a janela do Outlook. Permita janelas deste site e toque em "E-mail de novo".'); } }
    else { url=mailto(c,x); const a=document.createElement('a'); a.href=url; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); }
    window.__rhuUltimoMail=url; /* para o teste conferir */
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
        ${U.cfg?`<div class="rhu-cfg"><label><span>Para</span><input class="txt" id="rhu-mp" value="${e(M.para)}" placeholder="email1@colafix.com; email2@colafix.com"></label><label><span>Cópia</span><input class="txt" id="rhu-mc" value="${e(M.cc)}" placeholder="opcional"></label><div class="rhu-per" role="group" aria-label="Abrir o e-mail em">${[['web','Outlook na internet'],['app','Programa do computador']].map(([k,t])=>`<button type="button" class="${(U.modo||modoMail(c))===k?'on':''}" aria-pressed="${(U.modo||modoMail(c))===k}" data-act="rhu-modo" data-v="${k}">${t}</button>`).join('')}</div><button class="btn sec" data-act="rhu-cfgok">Guardar e-mails</button><small>Ficam guardados para as próximas entregas.</small></div>`:''}
      </div></div>
      <div class="rhu-ac"><button class="btn" data-act="rhu-ok" data-v="mail" ${U.salvando?'disabled':''}>Registrar e abrir o e-mail</button><button class="btn sec" data-act="rhu-ok" data-v="so" ${U.salvando?'disabled':''}>Só registrar</button></div>
    </div></div></div>`; }
  /* ---------- desconto (pedido de 29/10): o RH cadastra o preço de cada peça (rh/config.unifPrecos {chave:{n,v}}) e o
     desconto de cada entrega sai sozinho = soma de quantidade × preço. Em cada entrega o RH pode mudar o valor ou
     marcar "Não descontar" (x.desc = {v, nao, por, em}). ---------- */
  const brl=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const numBR=s=>{ const t=String(s==null?'':s).replace(/[R$\s]/g,''); if(!t) return null; const n=+(/,/.test(t)?t.replace(/\./g,'').replace(',','.'):t); return isFinite(n)?Math.round(n*100)/100:null; };
  const pk=t=>norm(t);
  function precosDe(c){ return (c&&c.R&&c.R.cfg&&c.R.cfg.unifPrecos)||null; }
  function precoPeca(pr,t){ const x=pr&&pr[pk(t)]; return x&&+x.v>0?+x.v:null; }
  function descCalc(x,pr){ const its=itensOk(x); let v=0; const falta=[]; its.forEach(i=>{ const u=precoPeca(pr,i.t); if(u==null) falta.push(i.t); else v+=u*(Math.max(1,parseInt(i.qtd,10)||1)); });
    return {v:its.length&&falta.length===its.length?null:Math.round(v*100)/100,falta}; }
  /* valor que vale: "não descontar" = 0 · valor digitado pelo RH · conta pelos preços */
  function descDe(x,pr){ const d=x.desc||{}; if(d.nao) return {v:0,tipo:'nao'}; if(d.v!=null&&d.v!=='') return {v:+d.v,tipo:'rh'}; const k=descCalc(x,pr); return {v:k.v,tipo:'calc',falta:k.falta}; }
  function pecasConhecidas(c){ const st=new Map(); const add=t=>{ t=String(t||'').trim(); if(t&&!st.has(pk(t))) st.set(pk(t),t); };
    PECAS.forEach(add); U.xs.forEach(x=>itensOk(x).forEach(i=>add(i.t))); (c.R.funcoes||[]).forEach(f=>(f.uniformes||[]).forEach(u=>add(u&&u.nome)));
    const pr=precosDe(c)||{}; Object.keys(pr).forEach(k=>{ if(pr[k]&&pr[k].n) add(pr[k].n); }); return [...st.values()].sort((a,b)=>a.localeCompare(b,'pt-BR')); }
  function precosForm(c){ const e=c.esc, pr=precosDe(c)||{};
    return `<div class="dbmodal" data-rhu-fundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Preço das peças" style="max-width:560px"><div class="rhu-fm">
      <div class="head" style="align-items:baseline;margin:0"><div><h2 style="margin:0">Preço das peças</h2><div class="sub" style="margin:2px 0 0">O desconto de cada entrega sai sozinho: quantidade × preço. Deixe em branco a peça que não é descontada.</div></div><button class="lnk" data-act="rhu-prx">Fechar</button></div>
      <div class="rhu-prs">${pecasConhecidas(c).map(t=>`<label class="rhu-pr"><span>${e(t)}</span><span class="rhu-prv">R$ <input class="txt" inputmode="decimal" data-rhu-pr="${e(t)}" value="${pr[pk(t)]&&+pr[pk(t)].v>0?e(String(pr[pk(t)].v).replace('.',',')):''}" placeholder="0,00"></span></label>`).join('')}</div>
      <label class="rhu-w"><span>Outra peça</span><span class="rhu-2"><input class="txt" id="rhu-prn" placeholder="Nome da peça"><span class="rhu-prv">R$ <input class="txt" id="rhu-prnv" inputmode="decimal" placeholder="0,00"></span></span></label>
      <div class="rhu-ac"><button class="btn" data-act="rhu-prok">Guardar preços</button></div></div></div></div>`; }
  function descLinha(c,x){ if(!c.rh) return ''; const e=c.esc, pr=precosDe(c), d=descDe(x,pr);
    if(U.dEd===x._id){ const k=descCalc(x,pr); return `<div class="rhu-de"><span>Desconto</span> R$ <input class="txt" id="rhu-dv" inputmode="decimal" value="${d.tipo==='rh'?e(String(d.v).replace('.',',')):k.v!=null?e(String(k.v).replace('.',',')):''}" placeholder="0,00">
      <button class="btn sec rhu-sm" data-act="rhu-dok" data-id="${e(x._id)}">Salvar</button>${k.v!=null?`<button class="lnk" data-act="rhu-dcalc" data-id="${e(x._id)}">Usar o preço das peças (${brl(k.v)})</button>`:''}<button class="lnk" data-act="rhu-dnao" data-id="${e(x._id)}">Não descontar</button><button class="lnk" data-act="rhu-dx">Cancelar</button></div>`; }
    const tx=d.tipo==='nao'?'Não descontar':d.v==null?'sem preço cadastrado':brl(d.v)+(d.tipo==='rh'?' (valor do RH)':d.falta&&d.falta.length?' (sem preço: '+d.falta.join(', ')+')':'');
    return `<div class="rhu-de ${d.tipo==='nao'?'nao':''}"><span>Desconto</span> <b>${e(tx)}</b> <button class="lnk" data-act="rhu-ded" data-id="${e(x._id)}">${d.tipo==='calc'&&d.v==null?'Informar':'Mudar'}</button>${d.tipo==='calc'&&d.v==null?' · <button class="lnk" data-act="rhu-prab">cadastrar preços</button>':''}</div>`; }
  /* ---------- relatório de quem pegou (pedido de 29/10): por período, por pessoa e entrega a entrega; imprimir e Excel.
     O RH vê também o desconto; o Marcelo (Visão do gestor) vê só quem pegou o quê. ---------- */
  const ymd=d=>{ const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return z.toISOString().slice(0,10); };
  function relPer(){ const r=U.rel, h=new Date(); if(r.per==='datas') return {de:r.de||'0000-00-00',ate:r.ate||'9999-99-99'};
    if(r.per==='mesant'){ const a=new Date(h.getFullYear(),h.getMonth()-1,1), b=new Date(h.getFullYear(),h.getMonth(),0); return {de:ymd(a),ate:ymd(b)}; }
    if(r.per==='tudo') return {de:'0000-00-00',ate:'9999-99-99'};
    return {de:ymd(new Date(h.getFullYear(),h.getMonth(),1)),ate:ymd(new Date(h.getFullYear(),h.getMonth()+1,0))}; }
  function relDados(c){ const {de,ate}=relPer(), ws=norm(U.rel.q).split(' ').filter(Boolean), pr=precosDe(c);
    const xs=U.xs.filter(x=>x.data>=de&&x.data<=ate&&(!ws.length||ws.every(w=>norm([x.nome,x.setor,x.sol,itensOk(x).map(i=>i.t).join(' ')].join(' ')).includes(w)))).sort((a,b)=>String(a.data).localeCompare(String(b.data))||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    const by=new Map(); xs.forEach(x=>{ const k=x.fid||pk(x.nome); if(!by.has(k)) by.set(k,{nome:c.titulo(x.nome||''),setor:x.setor||'',n:0,pc:new Map(),desc:0,semPreco:false,xs:[]}); const g=by.get(k); g.n++; g.xs.push(x); if(x.setor) g.setor=x.setor;
      itensOk(x).forEach(i=>{ const t=[String(i.t).trim(),String(i.tam||'').trim()].filter(Boolean).join(' '); g.pc.set(t,(g.pc.get(t)||0)+(Math.max(1,parseInt(i.qtd,10)||1))); });
      if(c.rh){ const d=descDe(x,pr); if(d.v==null) g.semPreco=true; else g.desc+=d.v; } });
    const ps=[...by.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return {de,ate,xs,ps,pecas:xs.reduce((a,x)=>a+itensOk(x).reduce((s,i)=>s+(Math.max(1,parseInt(i.qtd,10)||1)),0),0),desc:ps.reduce((a,g)=>a+g.desc,0)}; }
  const pcTxt=g=>[...g.pc.entries()].map(([t,q])=>q+' '+t).join(', ');
  function relHtml(c){ const e=c.esc, D=relDados(c), r=U.rel;
    const per=[['mes','Este mês'],['mesant','Mês passado'],['tudo','Tudo'],['datas','Escolher datas']];
    return `<div class="rhu-rel"><div class="rhu-rb"><div class="seg" role="group" aria-label="Período">${per.map(([k,t])=>`<button class="${r.per===k?'on':''}" aria-pressed="${r.per===k}" data-act="rhu-rper" data-v="${k}">${t}</button>`).join('')}</div>
        ${r.per==='datas'?`<span class="rhu-rdt"><input class="txt" type="date" id="rhu-rde" value="${e(r.de)}"> até <input class="txt" type="date" id="rhu-rate" value="${e(r.ate)}"></span>`:''}
        <input class="txt rhu-rq" id="rhu-rq" type="search" placeholder="Buscar pessoa, setor ou peça" value="${e(r.q)}">
        <span style="flex:1"></span><button class="btn sec rhu-sm" data-act="rhu-rxls">Excel</button><button class="btn sec rhu-sm" data-act="rhu-rpdf">Imprimir / PDF</button></div>
      <div class="rhu-rk"><div><b>${D.ps.length}</b><span>pessoas</span></div><div><b>${D.xs.length}</b><span>entregas</span></div><div><b>${D.pecas}</b><span>peças</span></div>${c.rh?`<div><b>${brl(D.desc)}</b><span>de desconto</span></div>`:''}</div>
      ${D.ps.length?`<div class="rhu-tw"><table class="rhu-t"><thead><tr><th>Funcionário</th><th>Setor</th><th class="n">Entregas</th><th>Peças</th>${c.rh?'<th class="n">Desconto</th>':''}</tr></thead><tbody>
        ${D.ps.map(g=>`<tr><td><b>${e(g.nome)}</b></td><td>${e(g.setor||'—')}</td><td class="n">${g.n}</td><td>${e(pcTxt(g))}<small>${g.xs.map(x=>e(br(x.data).slice(0,5))).join(' · ')}</small></td>${c.rh?`<td class="n">${brl(g.desc)}${g.semPreco?'<small>falta preço</small>':''}</td>`:''}</tr>`).join('')}</tbody></table></div>`
        :`<div class="empty">${U.lido?'Nenhuma entrega no período.':'Carregando…'}</div>`}</div>`; }
  function relLinhas(c){ const D=relDados(c), pr=precosDe(c);
    const res=[['Funcionário','Setor','Entregas','Peças'].concat(c.rh?['Desconto (R$)']:[])].concat(D.ps.map(g=>[g.nome,g.setor,g.n,pcTxt(g)].concat(c.rh?[Math.round(g.desc*100)/100]:[])));
    const det=[['Data','Período','Funcionário','Setor','Peça','Tamanho','Qtd','Nº solicitação','Lançado na ficha','Entregue por'].concat(c.rh?['Desconto da entrega (R$)']:[])];
    D.xs.forEach(x=>{ const d=c.rh?descDe(x,pr):null; itensOk(x).forEach((i,k)=>det.push([br(x.data),x.per||'',c.titulo(x.nome||''),x.setor||'',i.t,i.tam||'',Math.max(1,parseInt(i.qtd,10)||1),x.sol||'',x.st==='lancado'?'sim':'não',x.porNome||''].concat(c.rh?[k===0?(d.v==null?'':d.v):'']:[]))); });
    return {D,res,det}; }
  const nomePer=D=>D.de==='0000-00-00'?'todas as datas':br(D.de)+' a '+br(D.ate);
  async function relExcel(c){ const {D,res,det}=relLinhas(c), nome='Uniformes-'+(D.de==='0000-00-00'?'todos':D.de.slice(0,7));
    try{ if(!window.XLSX) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); }); }catch(e){}
    let blob, arq;
    if(window.XLSX&&window.XLSX.utils){ const wb=XLSX.utils.book_new(); [['Por pessoa',res],['Entregas',det]].forEach(([n,a])=>{ const ws=XLSX.utils.aoa_to_sheet(a); ws['!cols']=a[0].map((h,i)=>({wch:i===0||/Peça|Funcion/.test(h)?30:14})); XLSX.utils.book_append_sheet(wb,ws,n); });
      blob=new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); arq=nome+'.xlsx'; }
    else { const L=[['Por pessoa']].concat(res,[[],['Entregas']],det); blob=new Blob(['﻿'+L.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv'}); arq=nome+'.csv'; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=arq; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); window.__rhuUltimoXls=arq; }
  function relPdf(c){ const {D,res,det}=relLinhas(c), e=c.esc, tb=a=>`<table><tr>${a[0].map(h=>`<th>${e(h)}</th>`).join('')}</tr>${a.slice(1).map(r=>`<tr>${r.map((v,i)=>`<td>${e(/^Desconto/.test(a[0][i])&&v!==''&&v!=null?brl(v):v)}</td>`).join('')}</tr>`).join('')}</table>`;
    const w=window.open('','_blank'); if(!w) return c.P.toast('O navegador bloqueou a janela. Permita janelas deste site.');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Entregas de uniforme - ${e(nomePer(D))}</title><style>@page{size:A4;margin:14mm}body{font:10.5pt/1.45 "Segoe UI",Arial,sans-serif;color:#111}h1{font-size:16pt;margin:0}h2{font-size:12pt;margin:18px 0 6px;color:#143F54}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ddd;font-size:9.5pt;vertical-align:top}th{background:#f2efe7}.sub{color:#666}</style></head><body>
      <h1>Entregas de uniforme</h1><div class="sub">${e(nomePer(D))} · ${D.ps.length} pessoas · ${D.xs.length} entregas · ${D.pecas} peças${c.rh?' · desconto total '+brl(D.desc):''}${U.rel.q?' · busca: '+e(U.rel.q):''}</div>
      <h2>Por pessoa</h2>${tb(res)}<h2>Entrega a entrega</h2>${tb(det)}<script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close(); }
  /* tela do Marcelo (Visão do gestor › Pessoas › Uniformes): só o relatório, sem desconto. Lê rh/dados/uniformes
     (regra nova no firestore.rules: quem tem a Visão do gestor só LÊ as entregas de uniforme). */
  function ctxGestor(){ const P=window.Painel; const tit=s=>String(s||'').toLowerCase().replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase()).replace(/\s(D[aeo]s?|E)\s/g,m=>m.toLowerCase());
    return {P,esc:P.esc,titulo:tit,R:{cfg:{},func:[]},rh:false,gestor:true}; }
  function gestor(){ const c=ctxGestor(); C=c; assina(c);
    return `<div class="head"><div><div class="eyebrow">PESSOAS</div><h1>Uniformes entregues</h1><div class="sub">Quem pegou uniforme e quais peças, por período.</div></div></div>
      <section class="card">${relHtml(c)}</section>`; }
  function render(c){ c.rh=true; assina(c); const e=c.esc, P=c.P, pend=U.xs.filter(x=>x.st!=='lancado'), xs=U.st==='conf'?pend:U.xs;
    const card=x=>{ const lan=x.st==='lancado', pode=P.dono()||x.por===P.S.uid;
      return `<div class="rhu-r ${lan?'ok':''}"><div class="rhu-rd"><b>${e(br(x.data).slice(0,5))}</b><small>${e(x.per||'')}</small></div>
        <div class="rhu-rm"><b>${e(c.titulo(x.nome||''))}</b><small>${e(x.setor||'sem setor')}${x.sol?' · solicitação Nº '+e(x.sol):' · sem nº da solicitação'}</small>
          <span class="rhu-ri">${itensOk(x).map(i=>`<span>${e(itTxt(i))}</span>`).join('')}</span>
          <small>Entregue por ${e(x.porNome||'—')} · registrado ${e(hm(x.em))}${x.emailEm?' · e-mail aberto '+e(hm(x.emailEm)):''}${x.obs?' · '+e(x.obs):''}</small>${descLinha(c,x)}</div>
        <div class="rhu-rs">${lan?`<span class="pill ok">Lançado na ficha</span><small>${e(x.lancPor||'')} · ${e(hm(x.lancEm))}</small><button class="lnk" data-act="rhu-volta" data-id="${e(x._id)}">Desfazer</button>`
          :`<span class="pill warn">RH ainda não lançou</span><button class="btn sec rhu-sm" data-act="rhu-lanc" data-id="${e(x._id)}">Lancei na ficha</button>`}
          <span class="rhu-ra"><button class="lnk" data-act="rhu-mail" data-id="${e(x._id)}">E-mail de novo</button>${pode?`<button class="lnk rhu-del" data-act="rhu-del" data-id="${e(x._id)}">${U.cx===x._id?'Confirmar: apagar':'Apagar'}</button>`:''}</span></div></div>`; };
    return c.topo('Entregas de uniforme','Quem entregou registra aqui: o RH confere e lança na ficha, e o e-mail para o RH sai pronto.',`<button class="btn sec" data-act="rhu-prab">Preço das peças</button><button class="btn" data-act="rhu-novo">+ Registrar entrega</button>`)
      +`<section class="card rhu-l"><div class="seg" role="group" aria-label="Mostrar">${[['conf','Para o RH lançar ('+pend.length+')'],['todas','Todas'],['rel','Relatório']].map(([a,b])=>`<button class="${U.st===a?'on':''}" aria-pressed="${U.st===a}" data-act="rhu-st" data-v="${a}">${b}</button>`).join('')}</div>
        ${U.st==='rel'?relHtml(c):xs.length?xs.map(card).join(''):`<div class="empty">${!U.lido?'Carregando…':U.st==='conf'?'Nenhuma entrega esperando o RH.':'Nenhuma entrega registrada ainda. Toque em "+ Registrar entrega".'}</div>`}</section>`
      +(U.f?form(c):'')+(U.precos?precosForm(c):''); }
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
  let _rq=null;
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!C) return;
    if(t.id==='rhu-rq'){ U.rel.q=t.value; clearTimeout(_rq); _rq=setTimeout(()=>{ C.P.render(); const i=document.getElementById('rhu-rq'); if(i){ i.focus(); const n=i.value.length; try{ i.setSelectionRange(n,n); }catch(e){} } },350); } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!C) return; if(t.id==='rhu-rde'||t.id==='rhu-rate'){ U.rel[t.id==='rhu-rde'?'de':'ate']=t.value; C.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='rhu-dv'){ const b=document.querySelector('[data-act="rhu-dok"]'); if(b){ ev.preventDefault(); b.click(); } return; }
    if(!U.f) return; if(ev.key==='Escape'){ U.f=null; C&&C.P.render(); }
    if(ev.key==='Enter'&&ev.target&&ev.target.id==='rhu-pn'){ const b=document.querySelector('[data-act="rhu-pick"]'); if(b){ ev.preventDefault(); b.click(); } } });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-rhu-fundo]'); if(fu&&ev.target===fu){ le(); U.f=null; U.precos=false; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rhu-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, db=P.db(), agora=new Date().toISOString(), eu=C.eu(); le(); const F=U.f;
    if(a==='rhu-novo'){ novo(C); return; }
    /* relatório */
    if(a==='rhu-rper'){ U.rel.per=b.dataset.v; if(U.rel.per==='datas'&&!U.rel.de){ U.rel.de=P.hojeStr().slice(0,8)+'01'; U.rel.ate=P.hojeStr(); } P.render(); return; }
    if(a==='rhu-rxls'){ relExcel(C); return; } if(a==='rhu-rpdf'){ relPdf(C); return; }
    /* preços e desconto (só o RH) */
    if(a==='rhu-prab'){ U.precos=true; P.render(); return; } if(a==='rhu-prx'){ U.precos=false; P.render(); return; }
    if(a==='rhu-prok'){ const pr=Object.assign({},precosDe(C)||{}); document.querySelectorAll('[data-rhu-pr]').forEach(i=>{ const t=i.dataset.rhuPr, v=numBR(i.value); pr[pk(t)]={n:t,v:v>0?v:0}; });
      const nn=String(g('rhu-prn')||'').trim(), nv=numBR(g('rhu-prnv')); if(nn) pr[pk(nn)]={n:nn,v:nv>0?nv:0};
      try{ await db.doc('rh/config').set({unifPrecos:pr},{merge:true}); C.R.cfg=C.R.cfg||{}; C.R.cfg.unifPrecos=pr; U.precos=false; P.toast('Preços guardados. O desconto das entregas já usa os preços novos.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-ded'){ U.dEd=b.dataset.id; P.render(); setTimeout(()=>{ const i=document.getElementById('rhu-dv'); i&&(i.focus(),i.select()); },40); return; }
    if(a==='rhu-dx'){ U.dEd=null; P.render(); return; } if(a==='rhu-fx'){ U.f=null; P.render(); return; } if(a==='rhu-st'){ U.st=b.dataset.v; P.render(); return; }
    if(a==='rhu-pick'&&F){ const f=(C.R.func||[]).find(x=>x._id===b.dataset.id); if(f){ Object.assign(F,{fid:f._id,nome:C.titulo(f.nome),setor:f.setor||F.setor||'',funcao:f.funcao||''});
        const fc=C.funcaoDe(f); if(fc&&(fc.uniformes||[]).length&&!F.itens.some(i=>String(i.t||'').trim())) F.itens=[]; if(!F.itens.length) F.itens=[{t:'',tam:'',qtd:1}]; } P.render(); return; }
    if(a==='rhu-unpick'&&F){ F.fid=''; F.funcao=''; P.render(); setTimeout(()=>{ const i=document.getElementById('rhu-pn'); i&&(i.focus(),i.select()); },40); return; }
    if(a==='rhu-per'&&F){ F.per=b.dataset.v; P.render(); return; }
    if(a==='rhu-addu'&&F){ const fc=C.funcaoDe((C.R.func||[]).find(x=>x._id===F.fid)), u=fc&&(fc.uniformes||[])[+b.dataset.i]; if(u){ const vz=F.itens.findIndex(i=>!String(i.t||'').trim()); const it={t:u.nome,tam:u.tam||'',qtd:1}; if(vz>=0) F.itens[vz]=it; else F.itens.push(it); } P.render(); return; }
    if(a==='rhu-itmais'&&F){ F.itens.push({t:'',tam:'',qtd:1}); P.render(); setTimeout(()=>{ const xs=document.querySelectorAll('[data-k="t"]'); xs.length&&xs[xs.length-1].focus(); },40); return; }
    if(a==='rhu-itx'&&F){ F.itens.splice(+b.dataset.i,1); if(!F.itens.length) F.itens=[{t:'',tam:'',qtd:1}]; P.render(); return; }
    if(a==='rhu-cfg'){ U.cfg=!U.cfg; P.render(); return; }
    if(a==='rhu-modo'){ U.modo=b.dataset.v; const mp=g('rhu-mp'), mc=g('rhu-mc'); P.render(); setTimeout(()=>{ const x=document.getElementById('rhu-mp'), y=document.getElementById('rhu-mc'); if(x&&mp!=null) x.value=mp; if(y&&mc!=null) y.value=mc; },0); return; }
    if(a==='rhu-cfgok'){ const d={para:lista(g('rhu-mp')).join('; '),cc:lista(g('rhu-mc')).join('; '),modo:U.modo||modoMail(C)}; if(!d.para) return P.toast('Escreva pelo menos um e-mail em "Para".');
      try{ await db.doc('rh/config').set({unifEmail:d},{merge:true}); C.R.cfg=C.R.cfg||{}; C.R.cfg.unifEmail=d; U.cfg=false; U.modo=null; P.toast('E-mails do RH guardados.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-ok'&&F){ if(U.salvando) return; const nome=C.titulo(String(F.nome||'').trim().replace(/\s+/g,' ')), its=itensOk(F).map(i=>({t:String(i.t).trim(),tam:String(i.tam||'').trim().toUpperCase(),qtd:Math.max(1,parseInt(i.qtd,10)||1)}));
      if(nome.length<3) return P.toast('Escreva o nome de quem recebeu.'); if(!its.length) return P.toast('Diga qual peça foi entregue.'); if(!F.data) return P.toast('Escolha a data da entrega.');
      const d={nome,fid:F.fid||'',setor:String(F.setor||'').trim(),funcao:F.funcao||'',data:F.data,per:F.per||'',itens:its,sol:String(F.sol||'').trim().replace(/^n[ºo°]?\s*/i,''),obs:String(F.obs||'').trim(),em:agora,por:P.S.uid||'',porNome:eu,st:'novo'};
      if(b.dataset.v==='mail'){ d.emailEm=agora; d.emailN=1; }
      const jan=b.dataset.v==='mail'?preJanela(C):null;
      U.salvando=true; const nid=id();
      try{ await db.doc(COL+'/'+nid).set(d); if(!U.xs.some(x=>x._id===nid)) U.xs.unshift(Object.assign({_id:nid},d)); U.f=null; U.st='conf';
        if(b.dataset.v==='mail') abreEmail(C,d,jan); P.toast('Entrega registrada'+(b.dataset.v==='mail'?' · e-mail aberto para mandar ao RH.':'. O RH vai ver em Uniformes.')); }
      catch(e){ if(jan) try{ jan.close(); }catch(_){} P.erro(e); } finally{ U.salvando=false; } P.render(); return; }
    const x=U.xs.find(y=>y._id===b.dataset.id); if(!x) return;
    if(a==='rhu-dok'||a==='rhu-dnao'||a==='rhu-dcalc'){ let d;
      if(a==='rhu-dnao') d={nao:true,v:null,por:eu,em:agora}; else if(a==='rhu-dcalc') d=null; else { const v=numBR(g('rhu-dv')); if(v==null||v<0) return P.toast('Digite o valor do desconto (ex.: 25,90).'); d={nao:false,v,por:eu,em:agora}; }
      try{ await db.doc(COL+'/'+x._id).update({desc:d}); x.desc=d; U.dEd=null; P.toast(a==='rhu-dnao'?'Esta entrega não será descontada.':a==='rhu-dcalc'?'Desconto pelo preço das peças.':'Desconto guardado.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-mail'){ abreEmail(C,x,preJanela(C)); try{ const up={emailEm:agora,emailN:(x.emailN||0)+1}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); }catch(e){} P.render(); return; }
    if(a==='rhu-lanc'){ try{ const up={st:'lancado',lancEm:agora,lancPor:eu}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); P.toast('Marcado como lançado na ficha.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-volta'){ try{ const up={st:'novo',lancEm:null,lancPor:null}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-del'){ if(U.cx!==x._id){ U.cx=x._id; P.render(); setTimeout(()=>{ if(U.cx===x._id){ U.cx=null; P.render(); } },4000); return; } U.cx=null;
      try{ await db.doc(COL+'/'+x._id).update({removido:true,removidoEm:agora,removidoPor:eu}); U.xs=U.xs.filter(y=>y!==x); P.toast('Entrega apagada.'); }catch(e){ P.erro(e); } P.render(); return; } });
  window.RHUnif={render:c=>{ C=c; return render(c); },gestor,avisos:c=>{ C=C||c; try{ assina(c); return avisos(c); }catch(e){ return []; } },novo:()=>{ if(C) novo(C); },texto,_U:U};
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
.rhu-prs{display:flex;flex-direction:column;gap:4px;max-height:52vh;overflow:auto}.rhu-pr{flex-direction:row!important;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--line);font-size:14px!important;color:inherit!important}
.rhu-prv{display:inline-flex;align-items:center;gap:6px;font-weight:600}.rhu-prv input{width:110px;text-align:right}
.rhu-de{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;margin-top:2px}.rhu-de>span{color:var(--muted)}.rhu-de.nao b{color:var(--muted);font-weight:600}.rhu-de input{width:100px;height:34px}
.rhu-rel{display:flex;flex-direction:column;gap:12px}.rhu-rb{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.rhu-rq{width:240px;max-width:100%}.rhu-rdt{display:inline-flex;gap:6px;align-items:center}
.rhu-rk{display:flex;gap:10px;flex-wrap:wrap}.rhu-rk div{background:var(--ground);border-radius:10px;padding:8px 14px;min-width:110px}.rhu-rk b{display:block;font-size:20px}.rhu-rk span{font-size:12px;color:var(--muted)}
.rhu-tw{overflow-x:auto}.rhu-t{width:100%;border-collapse:collapse;font-size:14px}.rhu-t th{text-align:left;font-size:12px;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}.rhu-t td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.rhu-t .n{text-align:right;white-space:nowrap}.rhu-t small{display:block;color:var(--muted);font-size:12px}
.rhu-l{display:flex;flex-direction:column;gap:0}.rhu-l .seg{margin-bottom:10px;align-self:flex-start}
.rhu-r{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;padding:12px 0;border-top:1px solid var(--line);align-items:start}.rhu-r.ok{opacity:.75}
.rhu-rd{display:flex;flex-direction:column}.rhu-rd b{font-size:18px}.rhu-rd small,.rhu-rm small{color:var(--muted);font-size:12.5px}
.rhu-rm{display:flex;flex-direction:column;gap:3px;min-width:0}.rhu-ri{display:flex;gap:6px;flex-wrap:wrap}.rhu-ri span{background:var(--ground);border-radius:7px;padding:2px 8px;font-size:13px}
.rhu-rs{display:flex;flex-direction:column;align-items:flex-end;gap:5px}.rhu-rs small{color:var(--muted);font-size:12px}.rhu-ra{display:flex;gap:12px}.rhu-del{color:var(--crit-ink,var(--crit))}.rhu-sm{height:34px;padding:0 12px}
@media (max-width:640px){.rhu-r{grid-template-columns:48px minmax(0,1fr)}.rhu-rs{grid-column:1/-1;align-items:flex-start}.rhu-2{grid-template-columns:1fr}}
</style>`);
})();
