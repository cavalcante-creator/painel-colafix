/* ===================== RH · ENTREGAS DE UNIFORME (pedido de 27/10) =====================
   Antes: a administradora abria a solicitação no sistema (Focco) e mandava um e-mail para o RH com funcionário, setor,
   data/período, itens e o nº da solicitação. Agora ela registra no painel (tela "Uniformes" do RH, rhunif) e o painel:
     1) guarda a entrega para o RH CONFERIR (30/10: "Lancei na ficha" virou "Conferido"; st:'lancado' = conferido) (antes: o RH lança, não entra sozinho na ficha);
     2) abre o e-mail já pronto (mesmo texto de antes) para os destinatários guardados em rh/config.unifEmail {para, cc}.
   Dados (regra rh/{resto=**}: só a dona e quem tem o RH — não precisou mudar regra):
     rh/dados/uniformes/{id} {nome,fid,setor,funcao,data,per:'Manhã'|'Tarde',itens:[{t,tam,qtd}],sol,obs,em,por,porNome,
                              st:'novo'|'lancado',lancEm,lancPor,emailEm,emailN,removido,removidoEm,removidoPor}
   Usado pelo rh.js: window.RHUnif.render(ctx) · .avisos(ctx) · .novo(). Prefixo `rhu`. */
(function(){
  const COL='rh/dados/uniformes';
  const PECAS=['Camiseta','Camiseta manga longa','Camisa polo','Calça','Bermuda','Jaqueta','Moletom','Boné','Botina','Avental'];
  const TAMS=['PP','P','M','G','GG','XG','XGG','EG','36','38','40','42','44','46','48','50'];
  const U={xs:[],lido:false,sub:false,f:null,st:'conf',cx:null,cfg:false,salvando:false,rel:{per:'mes',de:'',ate:'',q:'',tipo:'',setor:'',desc:''},qf:{modo:'q',de:'',ate:'',q:'',setor:'',sit:''},q:'',dEd:null,precos:false};
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
  function descLinha(c,x){ if(!c.rh) return ''; const e=c.esc, pr=precosDe(c), d=descDe(x,pr), nao=d.tipo==='nao';
    if(U.dEd===x._id){ const k=descCalc(x,pr); return `<div class="rhu-dx2"><span class="rhu-dl">Valor do desconto</span><span class="rhu-prv">R$ <input class="txt" id="rhu-dv" inputmode="decimal" value="${d.tipo==='rh'?e(String(d.v).replace('.',',')):k.v!=null?e(String(k.v).replace('.',',')):''}" placeholder="0,00"></span>
      <div class="rhu-dbt"><button class="btn rhu-sm" data-act="rhu-dok" data-id="${e(x._id)}">Salvar</button>${k.v!=null&&d.tipo==='rh'?`<button class="lnk" data-act="rhu-dcalc" data-id="${e(x._id)}">Voltar ao preço das peças (${brl(k.v)})</button>`:''}<button class="lnk" data-act="rhu-dx">Cancelar</button></div></div>`; }
    const val=nao?'—':d.v==null?'sem preço':brl(d.v), sub=nao?'não será descontado':d.tipo==='rh'?'valor digitado pelo RH':d.v==null?'cadastre o preço das peças':d.falta&&d.falta.length?'sem preço: '+d.falta.join(', '):'pelo preço das peças';
    const terc=ehTerc(c,x), pq=!nao&&terc?parcCaixa(c,x):'';
    const box=`<div class="rhu-dbox ${nao?'nao':d.v==null?'semp':''}"><span class="rhu-dl">Descontar?</span>
      <div class="rhu-yn" role="group" aria-label="Descontar do salário"><button class="${!nao?'on':''}" aria-pressed="${!nao}" data-act="rhu-dsim" data-id="${e(x._id)}">Sim</button><button class="${nao?'on nao':''}" aria-pressed="${nao}" data-act="rhu-dnao" data-id="${e(x._id)}">Não</button></div>
      <b class="rhu-dv">${e(val)}</b><small>${e(sub)}</small>${nao?'':d.v==null?`<button class="lnk" data-act="rhu-prab">Cadastrar preços</button>`:`<button class="lnk" data-act="rhu-ded" data-id="${e(x._id)}">Mudar o valor</button>`}${!terc&&!nao&&d.v>0?`<button class="lnk" data-act="rhu-qterc" data-id="${e(x._id)}" data-v="1">É terceiro? Parcelar</button>`:''}</div>`;
    return pq?`<div class="rhu-dcol">${box}${pq}</div>`:box; }
  /* ---------- DESCONTO PARCELADO DOS TERCEIROS (pedido de 30/10, planilha "Descontos Uniforme TERCEIROS") ----------
     Como o RH fazia na planilha: total = peças × preço, dividido em parcelas descontadas na quinzena (dia 15 e último dia
     do mês); cada parcela marcada "ok - dd/mm", "FALTA" (não descontou: vai para a próxima quinzena) ou "descontado total".
     No painel, a entrega de TERCEIRO (sem cadastro CLT, PJ ou terceirizado do RH; o RH pode trocar: x.terc) ganha
     x.parc = {n, ini, hist:[{q:'AAAA-MM-DD', st:'ok'|'falta', v, por, em, quit}]}. Sem x.parc, vale a sugestão pelo valor
     (até R$ 40 = 1x, até R$ 70 = 2x, até R$ 120 = 4x, acima = 8x), começando na quinzena da entrega.
     Aba "Descontos dos terceiros" (U.st='desc'): o que descontar em cada quinzena, marcar descontado / não descontou,
     atrasadas, saldo de cada pessoa, PDF e Excel para a folha, e "Trazer da planilha" (só o que falta descontar). ---------- */
  const pad2=n=>String(n).padStart(2,'0'), r2=v=>Math.round((+v||0)*100)/100;
  const fimMes=(a,m0)=>new Date(a,m0+1,0).getDate();
  /* datas de desconto: dia 15 e o último dia do mês */
  function qDe(d){ const [a,m,dd]=String(d).slice(0,10).split('-').map(Number); return dd<=15?`${a}-${pad2(m)}-15`:`${a}-${pad2(m)}-${pad2(fimMes(a,m-1))}`; }
  function qProx(q){ const [a,m,dd]=q.split('-').map(Number); if(dd===15) return `${a}-${pad2(m)}-${pad2(fimMes(a,m-1))}`; const n=new Date(a,m,15); return `${n.getFullYear()}-${pad2(n.getMonth()+1)}-15`; }
  function qAnt(q){ const [a,m,dd]=q.split('-').map(Number); if(dd!==15) return `${a}-${pad2(m)}-15`; const p=new Date(a,m-1,0); return `${p.getFullYear()}-${pad2(p.getMonth()+1)}-${pad2(p.getDate())}`; }
  const qAtual=c=>qDe(c.P.hojeStr());
  const parcSug=V=>V<=40?1:V<=70?2:V<=120?4:8;
  /* é terceiro? escolha do RH (x.terc) · cadastro do RH (PJ = terceiro) · lista de terceirizados · sem cadastro = terceiro */
  function ehTerc(c,x){ if(x.terc===true||x.terc===false) return x.terc; const R=(c&&c.R)||{}, n=pk(x.nome);
    const f=(x.fid&&(R.func||[]).find(y=>y._id===x.fid))||(R.func||[]).find(y=>y&&!y.removido&&pk(y.nome)===n);
    if(f) return f.tipo==='PJ'; if((R.terc||[]).some(t=>t&&pk(t.nome)===n)) return true; return !x.fid; }
  /* a conta das parcelas de uma entrega: pago, o que falta e a agenda das parcelas que faltam */
  function parcInfo(c,x){ const d=descDe(x,precosDe(c)); if(d.tipo==='nao'||d.v==null||!(d.v>0)) return null;
    const V=r2(d.v), P=x.parc||{}, n=Math.max(1,parseInt(P.n,10)||parcSug(V)), ini=P.ini||qDe(x.data||c.P.hojeStr());
    const hist=(P.hist||[]).filter(h=>h&&h.q).slice().sort((a,b)=>a.q.localeCompare(b.q));
    let k=0; hist.forEach(h=>{ if(h.st==='ok') h._k=++k; });
    const nOk=k, pago=r2(hist.filter(h=>h.st==='ok').reduce((a,h)=>a+(+h.v||0),0)), rest=r2(Math.max(0,V-pago)), vp=r2(V/n), pend=[];
    if(rest>0.004){ const m=Math.max(1,n-nOk), us=new Set(hist.map(h=>h.q)); let q=ini, falta=rest;
      for(let i=0;i<m&&falta>0.004;i++){ while(us.has(q)) q=qProx(q); const v=i===m-1?r2(falta):r2(Math.min(vp,falta)); pend.push({q,v,k:nOk+i+1}); falta=r2(falta-v); us.add(q); q=qProx(q); } }
    return {V,n,ini,hist,pago,rest,pend,vp,nOk,proprio:!!x.parc,fim:pend.length?pend[pend.length-1].q:null}; }
  const parcTxt=I=>I.n===1?'à vista (1×)':I.n+'× de '+brl(I.vp);
  /* caixa da entrega de terceiro no cartão (no lugar do Sim/Não simples) */
  function parcCaixa(c,x){ const e=c.esc, I=parcInfo(c,x); if(!I) return '';
    const st=I.rest<=0.004?'<span class="pill ok">Descontado tudo</span>':I.pend.some(p=>p.q<qAtual(c))?'<span class="pill crit">Parcela atrasada</span>':'';
    return `<div class="rhu-pq"><div class="rhu-pqh"><span class="rhu-dl">Desconto parcelado · terceiro</span>${st}</div>
      <label class="rhu-pqn"><span>Parcelas</span><select class="txt" data-rhu-qn="${e(x._id)}" aria-label="Número de parcelas">${[1,2,3,4,5,6,8,10,12].concat(I.n>12||[7,9,11].includes(I.n)?[I.n]:[]).sort((a,b)=>a-b).map(n=>`<option value="${n}" ${n===I.n?'selected':''}>${n}×</option>`).join('')}</select></label>
      <small>${e(parcTxt(I))} · ${I.nOk} de ${I.n} descontada${I.nOk===1?'':'s'}${I.rest>0.004?' · falta '+brl(I.rest):''}${I.pend.length?' · próxima '+e(br(I.pend[0].q).slice(0,5)):''}</small>
      <div class="rhu-dbt"><button class="lnk" data-act="rhu-qver" data-id="${e(x._id)}">Ver parcelas</button><button class="lnk" data-act="rhu-qterc" data-id="${e(x._id)}" data-v="0">Não é terceiro</button></div></div>`; }
  /* quinzena: o que cai nela (pendente ou já marcado) e as atrasadas (só na quinzena atual) */
  function qDados(c,Q){ const qa=qAtual(c), L=[], atras=[], ps=new Map();
    U.xs.filter(x=>!x.removido&&ehTerc(c,x)).forEach(x=>{ const I=parcInfo(c,x); if(!I) return;
      const h=I.hist.find(y=>y.q===Q); if(h) L.push({x,I,q:Q,v:h.st==='ok'?+h.v||0:0,st:h.st,k:h._k||'',quit:!!h.quit});
      const p=I.pend.find(y=>y.q===Q); if(p) L.push({x,I,q:Q,v:p.v,st:'pend',k:p.k});
      if(Q===qa) I.pend.filter(y=>y.q<Q).forEach(y=>atras.push({x,I,q:y.q,v:y.v,st:'pend',k:y.k}));
      const kk=pesKey(x); if(!ps.has(kk)) ps.set(kk,{nome:c.titulo(x.nome||''),setor:x.setor||'',V:0,pago:0,rest:0,xs:[],atr:false,prox:null,fim:null}); const g=ps.get(kk);
      g.V=r2(g.V+I.V); g.pago=r2(g.pago+I.pago); g.rest=r2(g.rest+I.rest); g.xs.push({x,I}); if(I.pend.some(y=>y.q<qa)) g.atr=true;
      if(I.pend.length){ if(!g.prox||I.pend[0].q<g.prox) g.prox=I.pend[0].q; if(!g.fim||I.fim>g.fim) g.fim=I.fim; } });
    const ord=(a,b)=>String(a.x.nome).localeCompare(String(b.x.nome),'pt-BR')||String(a.x.data).localeCompare(String(b.x.data));
    L.sort(ord); atras.sort(ord);
    const pes=[...ps.values()].sort((a,b)=>(b.rest>0)-(a.rest>0)||a.nome.localeCompare(b.nome,'pt-BR'));
    return {Q,qa,L,atras,pes,aDesc:r2(L.filter(l=>l.st!=='falta').reduce((a,l)=>a+l.v,0)),feito:r2(L.filter(l=>l.st==='ok').reduce((a,l)=>a+l.v,0)),
      falta:r2(L.filter(l=>l.st==='pend').reduce((a,l)=>a+l.v,0)),nPes:new Set(L.filter(l=>l.st!=='falta').map(l=>pesKey(l.x))).size,
      saldo:r2(pes.reduce((a,g)=>a+g.rest,0)),nAberto:pes.filter(g=>g.rest>0.004).length}; }
  /* filtros da aba Descontos (30/10): uma quinzena ou um período, situação, setor e busca — valem na tela, no PDF e no Excel */
  const QSIT={pend:'A descontar',ok:'Descontadas',falta:'Não descontou',atr:'Atrasadas'};
  function qOkX(x){ const f=U.qf, ws=norm(f.q).split(' ').filter(Boolean);
    return (!ws.length||ws.every(w=>norm([x.nome,x.setor,itensOk(x).map(i=>i.t).join(' ')].join(' ')).includes(w)))&&(!f.setor||(f.setor==='-'?!x.setor:norm(x.setor)===norm(f.setor))); }
  function qVista(c){ const f=U.qf, qa=qAtual(c), per=f.modo==='per', qs=[];
    if(per){ let a=qDe(f.de||qa), b=qDe(f.ate||qa); if(a>b) [a,b]=[b,a]; for(let i=0;i<96&&a<=b;i++){ qs.push(a); a=qProx(a); } } else qs.push(U.qSel||qa);
    let L=[], atras=[]; qs.forEach(Q=>{ const D=qDados(c,Q); L=L.concat(D.L); if(!per) atras=atras.concat(D.atras); });
    const base=qDados(c,qs[qs.length-1]); L=L.filter(l=>qOkX(l.x)); atras=atras.filter(l=>qOkX(l.x));
    if(f.sit==='atr') L=[]; else if(f.sit) L=L.filter(l=>l.st===f.sit); if(f.sit&&f.sit!=='atr'&&f.sit!=='pend') atras=[];
    if(per) L.sort((a,b)=>a.q.localeCompare(b.q)||String(a.x.nome).localeCompare(String(b.x.nome),'pt-BR'));
    const pes=base.pes.filter(g=>g.xs.some(({x})=>qOkX(x)));
    const filtros=[per?'Período: '+br(qs[0])+' a '+br(qs[qs.length-1]):'Quinzena de '+br(qs[0]),f.sit&&'Situação: '+QSIT[f.sit],f.setor&&'Setor: '+(f.setor==='-'?'sem setor':f.setor),f.q&&'Busca: '+f.q].filter(Boolean);
    const vale=L.filter(l=>l.st!=='falta').concat(atras);
    return {Q:qs[0],Qf:qs[qs.length-1],qs,per,qa,L,atras,pes,filtros,aDesc:r2(vale.reduce((a,l)=>a+l.v,0)),feito:r2(L.filter(l=>l.st==='ok').reduce((a,l)=>a+l.v,0)),
      nPes:new Set(vale.map(l=>pesKey(l.x))).size,saldo:r2(pes.reduce((a,g)=>a+g.rest,0)),nAberto:pes.filter(g=>g.rest>0.004).length}; }
  function qFilHtml(c){ const e=c.esc, f=U.qf, sets=[...new Set(U.xs.filter(x=>ehTerc(c,x)).map(x=>x.setor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const sel=(k,l,ops)=>`<label><span>${l}</span><select class="txt" data-rhu-qf="${k}">${ops.map(([v,t])=>`<option value="${e(v)}" ${f[k]===v?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;
    return `<div class="rr-fil">${sel('modo','Ver',[['q','Uma quinzena'],['per','Um período']])}${f.modo==='per'?`<label><span>De</span><input class="txt" type="date" data-rhu-qf="de" value="${e(f.de)}"></label><label><span>Até</span><input class="txt" type="date" data-rhu-qf="ate" value="${e(f.ate)}"></label>`:''}
      ${sel('sit','Situação',[['','Todas']].concat(Object.entries(QSIT)))}${sel('setor','Setor',[['','Todos']].concat(sets.map(x=>[x,x]),[['-','Sem setor']]))}<label><span>Pessoa ou peça</span><input class="txt" type="search" id="rhu-qq" value="${e(f.q)}" placeholder="Buscar"></label></div>`
      +(window.RHRel?RHRel.barra({chips:[{t:'Situação',v:f.sit&&QSIT[f.sit]},{t:'Setor',v:f.setor&&(f.setor==='-'?'sem setor':f.setor)},{t:'Busca',v:f.q}],limpar:'rhu-qflimpa'}):''); }
  const pcCurto=x=>itensOk(x).map(i=>(Math.max(1,parseInt(i.qtd,10)||1))+'× '+i.t).join(', ');
  function qLinha(c,l,atr){ const e=c.esc, x=l.x, id=e(x._id), q=e(l.q);
    const acao=l.st==='pend'?`<button class="btn rhu-sm" data-act="rhu-qok" data-id="${id}" data-q="${q}">Descontado</button><button class="btn sec rhu-sm" data-act="rhu-qfal" data-id="${id}" data-q="${q}">Não descontou</button>`
      :`<span class="pill ${l.st==='ok'?'ok':'warn'}">${l.st==='ok'?(l.quit?'Descontado o resto':'Descontado'):'Não descontou · vai para a próxima'}</span><button class="lnk" data-act="rhu-qdes" data-id="${id}" data-q="${q}">Desfazer</button>`;
    return `<tr class="${l.st}">${U.qf.modo==='per'?`<td class="rhu-qd">${e(br(l.q).slice(0,5))}</td>`:''}<td><b>${e(c.titulo(x.nome||''))}</b><small>${e(x.setor||'')}${x.setor?' · ':''}entrega ${e(br(x.data))}</small></td><td>${e(pcCurto(x))}</td>
      <td class="c">${l.st==='falta'?'—':(l.k||'?')+' de '+l.I.n}${atr?`<small>era ${e(br(l.q).slice(0,5))}</small>`:''}</td><td class="n"><b>${l.st==='falta'?'—':brl(l.v)}</b></td><td class="rhu-qa">${acao}</td></tr>`; }
  function descHtml(c){ const e=c.esc; if(!U.qSel) U.qSel=qAtual(c); const D=qVista(c), Q=D.Q, ehAt=Q===D.qa;
    const tab=(ls,atr)=>`<div class="rhu-tw"><table class="rhu-t rhu-qt"><thead><tr>${D.per?'<th>Quinzena</th>':''}<th>Pessoa</th><th>Peças</th><th class="c">Parcela</th><th class="n">Valor</th><th></th></tr></thead><tbody>${ls.map(l=>qLinha(c,l,atr)).join('')}</tbody></table></div>`;
    const pend=D.L.filter(l=>l.st==='pend').length;
    return `<div class="rhu-rel"><div class="rhu-rb">${D.per?`<div class="rhu-qnav"><div><span>Período</span><b>${e(br(D.Q).slice(0,5))} a ${e(br(D.Qf))}</b><small>${D.qs.length} quinzenas</small></div></div>`:`<div class="rhu-qnav"><button class="btn sec rhu-sm" data-act="rhu-qnav" data-v="-1" aria-label="Quinzena anterior">‹</button>
          <div><span>Quinzena</span><b>${e(br(Q))}</b>${ehAt?'<small>a próxima data de desconto</small>':`<button class="lnk" data-act="rhu-qnav" data-v="0">voltar para a atual</button>`}</div>
          <button class="btn sec rhu-sm" data-act="rhu-qnav" data-v="1" aria-label="Próxima quinzena">›</button></div>`}
        <span class="rhu-rsp"></span><label class="btn sec rhu-sm rhu-qimp">Trazer da planilha<input type="file" id="rhu-qarq" accept=".xlsx,.xls" hidden></label>
        <button class="btn sec rhu-sm" data-act="rhu-qxls">Excel</button><button class="btn rhu-sm" data-act="rhu-qpdf">Baixar PDF</button></div>${qFilHtml(c)}
      <div class="rhu-rk"><div class="dsc"><span>${D.per?'Descontar no período':'Descontar nesta quinzena'}</span><b>${brl(D.aDesc)}</b></div><div><span>Pessoas</span><b>${D.nPes}</b></div><div><span>Já marcado</span><b>${brl(D.feito)}</b></div><div><span>Ainda devem (todas)</span><b>${brl(D.saldo)}</b></div></div>
      ${D.L.length?tab(D.L,false):`<div class="empty">${!U.lido?'Carregando…':U.qf.sit||U.qf.q||U.qf.setor?'Nenhuma parcela com estes filtros.':D.per?'Nenhuma parcela de uniforme no período.':'Nenhuma parcela de uniforme nesta quinzena.'}</div>`}
      ${pend>1&&!D.per?`<div class="rhu-rb"><span class="rhu-rsp"></span><button class="btn sec rhu-sm" data-act="rhu-qtodos" data-q="${e(Q)}">Marcar as ${pend} como descontadas</button></div>`:''}
      ${D.atras.length?`<div class="rhu-qat"><div class="label">ATRASADAS · parcelas de quinzenas que já passaram e não foram marcadas (${D.atras.length})</div>${tab(D.atras,true)}</div>`:''}
      <div class="label" style="margin-top:6px">SALDO DE CADA PESSOA</div>
      ${D.pes.length?`<div class="rhu-tw"><table class="rhu-t"><thead><tr><th>Pessoa</th><th class="n">Total</th><th class="n">Descontado</th><th class="n">Falta</th><th>Próxima</th><th>Termina</th><th></th></tr></thead><tbody>
        ${D.pes.map(g=>`<tr class="${g.rest>0.004?'':'feito'}"><td><b>${e(g.nome)}</b><small>${g.xs.map(({x,I})=>e(br(x.data).slice(0,5))+': '+e(pcCurto(x))+' · '+e(parcTxt(I))).join('<br>')}</small></td>
          <td class="n">${brl(g.V)}</td><td class="n">${brl(g.pago)}</td><td class="n"><b>${g.rest>0.004?brl(g.rest):'—'}</b></td>
          <td>${g.prox?e(br(g.prox).slice(0,5))+(g.atr?' <span class="pill crit">atrasada</span>':''):'<span class="pill ok">quitado</span>'}</td><td>${g.fim?e(br(g.fim)):'—'}</td>
          <td class="rhu-qa">${g.xs.filter(({I})=>I.rest>0.004).map(({x,I})=>`<button class="lnk" data-act="rhu-qquit" data-id="${e(x._id)}">${U.cx==='q'+x._id?'Confirmar: descontar '+brl(I.rest)+' agora':'Descontar o resto agora'}</button>`).join('')}</td></tr>`).join('')}</tbody></table></div>`
        :`<div class="empty">Nenhum terceiro com desconto de uniforme.</div>`}
      ${U.qVer?qVerHtml(c):''}${U.imp?impHtml(c):''}</div>`; }
  /* janela com a agenda de uma entrega: parcelas descontadas, não descontadas e as que faltam */
  function qVerHtml(c){ const e=c.esc, x=U.xs.find(y=>y._id===U.qVer); if(!x){ U.qVer=null; return ''; } const I=parcInfo(c,x); if(!I) return '';
    const ls=I.hist.map(h=>({q:h.q,t:h.st==='ok'?'Descontada'+(h.quit?' (o resto)':''):'Não descontou',v:h.st==='ok'?brl(h.v):'—',k:h.st==='ok'?h._k+'ª':'',cls:h.st,por:h.por}))
      .concat(I.pend.map(p=>({q:p.q,t:p.q<qAtual(c)?'Atrasada':'A descontar',v:brl(p.v),k:p.k+'ª',cls:p.q<qAtual(c)?'atr':'pend'})));
    return `<div class="dbmodal" data-rhu-qfundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Parcelas do uniforme" style="max-width:560px"><div class="rhu-fm">
      <div class="head" style="align-items:baseline;margin:0"><div><h2 style="margin:0">${e(c.titulo(x.nome||''))}</h2><div class="sub" style="margin:2px 0 0">Entrega de ${e(br(x.data))} · ${e(pcCurto(x))} · total ${brl(I.V)} · ${e(parcTxt(I))}</div></div><button class="lnk" data-act="rhu-qverx">Fechar</button></div>
      <div class="rhu-tw"><table class="rhu-t"><thead><tr><th>Quinzena</th><th>Parcela</th><th>Situação</th><th class="n">Valor</th></tr></thead><tbody>${ls.map(l=>`<tr class="${l.cls}"><td>${e(br(l.q))}</td><td>${e(l.k)}</td><td>${e(l.t)}${l.por&&l.por!=='planilha'?`<small>${e(l.por)}</small>`:l.por==='planilha'?'<small>da planilha</small>':''}</td><td class="n">${e(l.v)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Descontado ${brl(I.pago)}</td><td>Falta</td><td class="n">${brl(I.rest)}</td></tr></tfoot></table></div>
      <label class="rhu-pqn"><span>Começa na quinzena</span><input class="txt" type="date" data-rhu-qini="${e(x._id)}" value="${e(I.ini)}"></label>
      <small style="color:var(--muted)">A data vira o dia 15 ou o último dia do mês. Parcela marcada "Não descontou" passa para a quinzena seguinte.</small></div></div></div>`; }
  /* grava a agenda de uma entrega (sempre o objeto inteiro, com n e início fixados) */
  async function parcGrava(c,x,muda){ const I=parcInfo(c,x); if(!I) return; const P0={n:I.n,ini:I.ini,hist:(x.parc&&x.parc.hist||[]).map(h=>Object.assign({},h))};
    muda(P0); P0.hist=P0.hist.filter(Boolean).map(h=>{ const o=Object.assign({},h); delete o._k; return o; });
    await c.P.db().doc(COL+'/'+x._id).update({parc:P0}); x.parc=P0; }
  async function qMarca(c,x,Q,st,quit){ const I=parcInfo(c,x); if(!I) return; const eu=c.eu(), agora=new Date().toISOString();
    const p=I.pend.find(y=>y.q===Q), v=quit?I.rest:(p?p.v:Math.min(I.vp,I.rest));
    await parcGrava(c,x,P=>{ P.hist=P.hist.filter(h=>h.q!==Q); P.hist.push(st==='ok'?{q:Q,st:'ok',v:r2(v),por:eu,em:agora,quit:!!quit}:{q:Q,st:'falta',v:0,por:eu,em:agora}); }); }
  /* ---------- trazer da planilha do RH (abas com Nome · camiseta · calça · botina · boné · Total · Parcela · 1ª a 8ª parcela
     · Itens/Valores). Só entra o que ainda falta descontar; a aba mais recente vem marcada, as outras o RH escolhe. ---------- */
  const PEC_PLAN=[['camiseta','Camiseta'],['calca','Calça'],['botina','Botina'],['bone','Boné']];
  function planLer(abas,hoje){ const H=new Date(hoje+'T12:00:00'), out=[], precos={};
    /* preços das peças (colunas Itens · Valores) de todas as abas, antes de conferir as contas */
    abas.forEach(({linhas})=>{ const cab=((linhas||[])[0]||[]).map(v=>norm(v)), iIt=cab.indexOf('itens'), iVl=cab.indexOf('valores'); if(iIt<0||iVl<0) return;
      linhas.slice(1).forEach(r=>{ const t=norm(r[iIt]), v=+r[iVl]; if(t&&v>0&&!precos[t]) precos[t]=v; }); });
    const dataDe=s=>{ const m=String(s).match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/); if(!m) return null; let a=m[3]?+(m[3].length===2?'20'+m[3]:m[3]):H.getFullYear();
      let d=new Date(a,+m[2]-1,+m[1]); if(!m[3]&&d-H>45*864e5) d=new Date(a-1,+m[2]-1,+m[1]); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
    abas.forEach(({nome:aba,linhas})=>{ if(!linhas||!linhas.length) return; const cab=(linhas[0]||[]).map(v=>norm(v));
      const col=t=>cab.findIndex(h=>h===t||h.startsWith(t)), iN=col('nome'), iT=col('total'), iP=cab.findIndex(h=>/^parcela/.test(h)), iPs=cab.map((h,i)=>/parcela$/.test(h)&&/^\d/.test(h)?i:-1).filter(i=>i>=0);
      const iQ=PEC_PLAN.map(([k])=>col(k));
      if(iN<0||iT<0) return;
      linhas.slice(1).forEach((r,li)=>{ const nome=String(r[iN]||'').trim(); if(!nome) return; const total=r2(r[iT]); if(!(total>0)) return;
        const parX=+r[iP]||0, par=r2(parX); const n=parX>0?Math.max(1,Math.round(total/parX)):1; const qt={}; PEC_PLAN.forEach(([k],j)=>{ const q=parseInt(r[iQ[j]],10); if(q>0) qt[k]=q; });
        const pagos=[]; let quit=false, ult=false, faltaM=false;
        iPs.forEach(i=>{ const s=String(r[i]==null?'':r[i]).trim(), ns=norm(s); if(/^ok/.test(ns)){ const d=dataDe(s); pagos.push(d||null); }
          else if(/descontado total|desconto finalizado|quitad/.test(ns)) quit=true; else if(/ultima/.test(ns)) ult=true; else if(/falta/.test(ns)) faltaM=true; });
        /* parcela da planilha pode ter mais de 2 casas (151,70 ÷ 8 = 18,9625): pagas todas = terminou; diferença de centavos não conta */
        const nPg=pagos.length, pagoV=nPg>=n?total:r2(Math.min(total,nPg*(parX>0?parX:total))), rest0=quit?0:r2(Math.max(0,total-pagoV)), rest=rest0<0.05?0:rest0;
        const conta=r2(PEC_PLAN.reduce((a,[k])=>a+(qt[k]||0)*(precos[k]||0),0));
        out.push({aba,linha:li+2,nome,qt,total,par:par>0?par:total,n,pagos:pagos.filter(Boolean).sort(),nPg,rest,quit,ult,faltaM,conta,difConta:conta>0&&Math.abs(conta-total)>0.009}); }); });
    /* aba mais recente = a que tem a data de desconto mais nova */
    const ultData={}; out.forEach(o=>{ const m=o.pagos[o.pagos.length-1]; if(m&&(!ultData[o.aba]||m>ultData[o.aba])) ultData[o.aba]=m; });
    const recente=Object.keys(ultData).sort((a,b)=>ultData[b].localeCompare(ultData[a]))[0]||null;
    return {linhas:out.filter(o=>o.rest>0.004),todas:out.length,quitadas:out.filter(o=>o.rest<=0.004).length,precos,recente,ultData}; }
  async function planArquivo(c,f){ try{ if(!window.XLSX) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); }); }catch(e){}
    if(!window.XLSX||!window.XLSX.read) return c.P.toast('Não consegui abrir a planilha (confira a internet).');
    const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}), abas=wb.SheetNames.map(n=>({nome:n,linhas:XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true})}));
    impAbre(c,abas,f.name); }
  function impAbre(c,abas,arq){ const L=planLer(abas,c.P.hojeStr()); if(!L.todas) return c.P.toast('Não achei as colunas Nome e Total nessa planilha.');
    const ja=new Set(U.xs.filter(x=>x.imp).map(x=>x.imp)); L.linhas.forEach(o=>{ o.k=pk(o.aba+'|'+o.linha+'|'+o.nome); o.ja=ja.has(o.k); o.on=!o.ja&&o.aba===L.recente; });
    U.imp={arq,...L}; U.st='desc'; c.P.render(); }
  function impHtml(c){ const e=c.esc, I=U.imp, abas=[...new Set(I.linhas.map(o=>o.aba))], on=I.linhas.filter(o=>o.on);
    return `<div class="dbmodal" data-rhu-qfundo="1"><div class="dbmbox" role="dialog" aria-modal="true" aria-label="Trazer da planilha" style="max-width:900px"><div class="rhu-fm">
      <div class="head" style="align-items:baseline;margin:0"><div><h2 style="margin:0">Trazer da planilha</h2><div class="sub" style="margin:2px 0 0">${e(I.arq||'')} · ${I.todas} linhas lidas · ${I.quitadas} já terminadas (não entram) · ${I.linhas.length} ainda com desconto a fazer</div></div><button class="lnk" data-act="rhu-qimpx">Fechar</button></div>
      <div class="rhu-imp">${abas.map(a=>{ const xs=I.linhas.filter(o=>o.aba===a); return `<div class="rhu-impa"><div class="label">ABA ${e(a)}${a===I.recente?' · a mais recente':''}${I.ultData[a]?' · último desconto '+e(br(I.ultData[a])):''}</div>
        ${xs.map(o=>`<label class="rhu-impl ${o.ja?'ja':''}"><input type="checkbox" data-rhu-qimp="${e(o.k)}" ${o.on?'checked':''} ${o.ja?'disabled':''}>
          <span class="rhu-impn"><b>${e(c.titulo(o.nome))}</b><small>${PEC_PLAN.filter(([k])=>o.qt[k]).map(([k,t])=>o.qt[k]+'× '+t).join(', ')||'sem peças na linha'}${o.difConta?` · <em>a conta das peças dá ${brl(o.conta)}</em>`:''}</small></span>
          <span class="rhu-impv">${brl(o.total)} · ${o.n}×<small>${o.nPg} descontada${o.nPg===1?'':'s'} · falta ${brl(o.rest)}${o.ja?' · já trazida':''}</small></span></label>`).join('')}</div>`; }).join('')}</div>
      <div class="sub" style="margin:0">Cada linha marcada vira uma entrega de terceiro já conferida, com as parcelas que já foram descontadas (com a data) e as que faltam a partir desta quinzena. As linhas das abas antigas podem já ter continuado em outra aba: confira antes de marcar.</div>
      <div class="rhu-ac"><button class="btn sec" data-act="rhu-qimpx">Cancelar</button><button class="btn" data-act="rhu-qimpok" ${on.length&&!U.salvando?'':'disabled'}>Trazer ${on.length} ${on.length===1?'linha':'linhas'}</button></div></div></div></div>`; }
  async function impGrava(c){ const I=U.imp; if(!I) return; const P=c.P, db=P.db(), eu=c.eu(), agora=new Date().toISOString(), qa=qAtual(c); let n=0;
    const pr=Object.assign({},precosDe(c)||{}); let prNovo=false; PEC_PLAN.forEach(([k,t])=>{ if(I.precos[k]>0&&!(pr[pk(t)]&&+pr[pk(t)].v>0)){ pr[pk(t)]={n:t,v:I.precos[k]}; prNovo=true; } });
    for(const o of I.linhas.filter(o=>o.on&&!o.ja)){ const m=o.nome.replace(/\s+/g,' ').trim().match(/^(.*?)\s+-\s+(.+)$/); /* "RICHARD - SEPARAÇÃO" = nome - setor */
      const nome=c.titulo(m?m[1]:o.nome.replace(/\s+/g,' ').trim()), setorP=m?c.titulo(m[2]):'', nn=pk(nome), f=(c.R.func||[]).find(y=>y&&!y.removido&&pk(y.nome)===nn);
      /* a data da planilha vira a quinzena (30/10 → fim do mês; 15/10 → 15) quando não repete; desconto semanal antigo fica com a data dele */
      const usQ=new Set(), hist=o.pagos.map((d,i)=>{ let q=qDe(d); if(usQ.has(q)) q=d; usQ.add(q); return {q,st:'ok',v:r2(i===o.n-1?o.total-o.par*(o.n-1):o.par),por:'planilha',em:agora,dia:d}; });
      /* parcela marcada "ok" sem data: conta como descontada numa quinzena anterior */
      let qx=qAnt(qa); for(let i=hist.length;i<o.nPg;i++){ while(hist.some(h=>h.q===qx)) qx=qAnt(qx); hist.push({q:qx,st:'ok',v:r2(o.par),por:'planilha',em:agora}); qx=qAnt(qx); }
      const d={nome,fid:f?f._id:'',setor:f&&f.setor||setorP,funcao:f&&f.funcao||'',data:o.pagos[0]||P.hojeStr(),per:'',itens:PEC_PLAN.filter(([k])=>o.qt[k]).map(([k,t])=>({t,tam:'',qtd:o.qt[k]})),sol:'',
        obs:'Trazido da planilha'+(I.arq?' "'+I.arq+'"':'')+' (aba '+o.aba+', linha '+o.linha+')',em:agora,por:P.S.uid||'',porNome:eu,st:'lancado',lancEm:agora,lancPor:'planilha',
        origem:'planilha',imp:o.k,terc:true,desc:{nao:false,v:o.total,por:eu,em:agora},parc:{n:o.n,ini:qa,hist}};
      if(!d.itens.length) d.itens=[{t:'Uniforme',tam:'',qtd:1}];
      const nid=id(); await db.doc(COL+'/'+nid).set(d); if(!U.xs.some(x=>x._id===nid)) U.xs.unshift(Object.assign({_id:nid},d)); n++; }
    if(prNovo){ await db.doc('rh/config').set({unifPrecos:pr},{merge:true}); c.R.cfg=c.R.cfg||{}; c.R.cfg.unifPrecos=pr; }
    U.imp=null; P.toast(n+' '+(n===1?'pessoa trazida':'linhas trazidas')+' da planilha'+(prNovo?' · preços das peças guardados':'')+'.'); }
  /* PDF e Excel da quinzena (para a folha / para a prestadora) */
  function qLinhasExp(c,D){ return D.L.filter(l=>l.st!=='falta').concat(D.atras).map(l=>[br(l.q).slice(0,5),c.titulo(l.x.nome||''),l.x.setor||'',pcCurto(l.x),br(l.x.data),(l.k||'?')+' de '+l.I.n,r2(l.v),l.st==='ok'?'descontado':l.q<D.qa&&!D.per?'atrasada ('+br(l.q).slice(0,5)+')':l.q<D.qa?'atrasada':'a descontar']); }
  const qNomeArq=D=>'Desconto-uniforme-terceiros-'+(D.per?D.Q+'_a_'+D.Qf:D.Q);
  async function qExcel(c){ const D=qVista(c), cab=['Quinzena','Pessoa','Setor','Peças','Entrega','Parcela','Valor (R$)','Situação'], ls=qLinhasExp(c,D);
    const sal=[['Pessoa','Total (R$)','Descontado (R$)','Falta (R$)','Próxima','Termina']].concat(D.pes.map(g=>[g.nome,g.V,g.pago,g.rest,g.prox?br(g.prox):'quitado',g.fim?br(g.fim):'']));
    const nome=qNomeArq(D);
    if(window.RHRel) return RHRel.xls(nome,[[(D.per?'Período':'Quinzena '+br(D.Q).replace(/\//g,'-')),[cab].concat(ls,[[],['Total','','','','','',r2(ls.reduce((a,r)=>a+r[6],0)),'']])],['Saldo por pessoa',sal]],{tit:'Desconto de uniforme · terceiros',sub:'RH',filtros:D.filtros});
    try{ if(!window.XLSX) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); }); }catch(e){}
    let blob, arq; const tot=[[],['Total','','','','','',r2(ls.reduce((a,r)=>a+r[6],0)),'']];
    if(window.XLSX&&window.XLSX.utils){ const wb=XLSX.utils.book_new(); [['Quinzena '+br(D.Q).replace(/\//g,'-'),[cab].concat(ls,tot)],['Saldo por pessoa',sal]].forEach(([n,a])=>{ const ws=XLSX.utils.aoa_to_sheet(a); ws['!cols']=a[0].map((h,i)=>({wch:i===0||i===2?30:14})); XLSX.utils.book_append_sheet(wb,ws,n.slice(0,31)); });
      blob=new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); arq=nome+'.xlsx'; }
    else { const L=[cab].concat(ls,tot,[[],['Saldo por pessoa']],sal); blob=new Blob(['﻿'+L.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv'}); arq=nome+'.csv'; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=arq; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); window.__rhuUltimoXls=arq; }
  async function qPdf(c){ const PP=window.Painel&&window.Painel.pdf; if(!PP) return c.P.toast('O gerador de PDF ainda não carregou. Tente de novo.');
    try{ try{ await PP.carregar(); }catch(e){}
      if(!(window.jspdf&&window.jspdf.jsPDF)) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); }).catch(()=>{});
      const D=qVista(c), img=await PP.imgs(), P=PP.novo('Desconto de uniforme · terceiros',(D.per?'Período de '+br(D.Q)+' a '+br(D.Qf):'Quinzena de '+br(D.Q))+' · RH',img); P.capa();
      P.texto('Filtros: '+(D.filtros.slice(1).join(' · ')||'nenhum (tudo)'),{fs:8,c:D.filtros.length>1?'ink':'mut',b:D.filtros.length>1});
      P.secao(D.per?'Resumo do período':'Resumo da quinzena');
      P.kpis([{t:'Descontar',v:brl(D.aDesc),s:D.nPes+' pessoa'+(D.nPes===1?'':'s'),c:'crit'},{t:'Já marcado',v:brl(D.feito),s:'como descontado',c:'ok'},
        {t:'Atrasadas',v:String(D.atras.length),s:D.atras.length?brl(D.atras.reduce((a,l)=>a+l.v,0)):'nenhuma',c:D.atras.length?'warn':'ok'},{t:'Ainda devem',v:brl(D.saldo),s:D.nAberto+' pessoa'+(D.nAberto===1?'':'s')+' no total',c:'pet'}],4);
      const cols=(D.per?[{t:'Quinzena',w:16}]:[]).concat([{t:'Pessoa',w:40},{t:'Peças',w:46},{t:'Entrega',w:18},{t:'Parcela',w:16},{t:'Valor',w:18,al:'r'},{t:'Situação',w:24}]);
      const rows=qLinhasExp(c,D).map(r=>{ const o=(D.per?[r[0]]:[]).concat([r[1],r[3],r[4],r[5],brl(r[6]),r[7]]); const k=o.length-1; o._cor={[k]:r[7]==='descontado'?'ok':/atrasada/.test(r[7])?'crit':'warn'}; return o; });
      P.secao(D.per?'Parcelas do período':'Parcelas desta quinzena',D.per?'':'descontar na folha de '+br(D.Q));
      if(!rows.length) P.vazio('Nenhuma parcela com estes filtros.'); else { rows.push(Object.assign((D.per?['Total']:[]).concat([D.per?'':'Total','','','',brl(qLinhasExp(c,D).reduce((a,r)=>a+r[6],0)),'']),{_tot:1})); P.tabela(cols,rows); }
      const nf=D.L.filter(l=>l.st==='falta'); if(nf.length){ P.secao('Não descontaram nesta quinzena','a parcela passa para a próxima'); P.tabela([{t:'Pessoa',w:60},{t:'Peças',w:70},{t:'Entrega',w:32}],nf.map(l=>[c.titulo(l.x.nome||''),pcCurto(l.x),br(l.x.data)])); }
      const ab=D.pes.filter(g=>g.rest>0.004); if(ab.length){ P.secao('Saldo de cada pessoa','o que ainda falta descontar');
        P.tabela([{t:'Pessoa',w:50},{t:'Total',w:22,al:'r'},{t:'Descontado',w:24,al:'r'},{t:'Falta',w:22,al:'r'},{t:'Próxima',w:22},{t:'Termina',w:22}],ab.map(g=>{ const r=[g.nome,brl(g.V),brl(g.pago),brl(g.rest),g.prox?br(g.prox).slice(0,5):'—',g.fim?br(g.fim):'—']; if(g.atr) r._cor={4:'crit'}; return r; })); }
      const doc=P.doc; P.cabe(24); P.y+=12; P.dc([28,43,51]); doc.setLineWidth(.3); const w=(P.cw-16)/2; doc.line(P.M,P.y,P.M+w,P.y); doc.line(P.M+w+16,P.y,P.M+P.cw,P.y);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); P.tc([85,102,111]); doc.text('Responsável pelo RH',P.M+w/2,P.y+4,{align:'center'}); doc.text('Data',P.M+w+16+w/2,P.y+4,{align:'center'}); P.y+=8;
      const nome=qNomeArq(D)+'.pdf'; P.fim(nome); window.__rhuUltimoPdf=nome; c.P.toast('PDF baixado: '+nome); }
    catch(e){ c.P.erro?c.P.erro(e):c.P.toast(String(e&&e.message||e)); } }
  /* aviso no Início do RH: parcelas da quinzena perto do dia e atrasadas */
  function qAvisos(c){ try{ const D=qDados(c,qAtual(c)), out=[], dias=Math.round((new Date(D.Q+'T12:00:00')-new Date(c.P.hojeStr()+'T12:00:00'))/864e5), pend=D.L.filter(l=>l.st==='pend');
      if(D.atras.length) out.push({nivel:'crit',rotulo:'Uniforme',titulo:D.atras.length===1?'1 parcela de uniforme atrasada (terceiros)':D.atras.length+' parcelas de uniforme atrasadas (terceiros)',texto:'De quinzenas que já passaram e não foram marcadas.',go:'rhunif'});
      if(pend.length&&dias<=3) out.push({nivel:'warn',rotulo:'Uniforme',titulo:'Desconto de uniforme dos terceiros: '+brl(pend.reduce((a,l)=>a+l.v,0))+' em '+br(D.Q).slice(0,5),texto:pend.length+' parcela'+(pend.length===1?'':'s')+' para descontar nesta quinzena.',go:'rhunif'});
      return out; }catch(e){ return []; } }
  document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!C) return;
    if(t.dataset&&t.dataset.rhuQf){ const k=t.dataset.rhuQf; U.qf[k]=t.value; if(k==='modo'&&t.value==='per'&&!U.qf.de){ const qa=qAtual(C); U.qf.de=qAnt(qAnt(qAnt(qAnt(qa)))); U.qf.ate=qa; } C.P.render(); return; }
    if(t.id==='rhu-qarq'){ const f=t.files&&t.files[0]; t.value=''; if(f) try{ await planArquivo(C,f); }catch(e){ C.P.toast('Não consegui ler a planilha: '+(e&&e.message||e)); } return; }
    if(t.dataset&&t.dataset.rhuQimp&&U.imp){ const o=U.imp.linhas.find(y=>y.k===t.dataset.rhuQimp); if(o) o.on=t.checked; const b=document.querySelector('[data-act="rhu-qimpok"]'); if(b){ const n=U.imp.linhas.filter(y=>y.on).length; b.disabled=!n; b.textContent='Trazer '+n+' '+(n===1?'linha':'linhas'); } return; }
    const qn=t.dataset&&t.dataset.rhuQn, qi=t.dataset&&t.dataset.rhuQini; if(!qn&&!qi) return; const x=U.xs.find(y=>y._id===(qn||qi)); if(!x) return;
    try{ if(qn){ const I=parcInfo(C,x), n=Math.max(1,parseInt(t.value,10)||1); if(I&&n<I.nOk) return C.P.toast('Já foram descontadas '+I.nOk+' parcelas: escolha '+I.nOk+' ou mais.'); await parcGrava(C,x,P=>{ P.n=n; }); C.P.toast('Desconto em '+n+'×.'); }
      else if(t.value){ await parcGrava(C,x,P=>{ P.ini=qDe(t.value); }); C.P.toast('Começa na quinzena de '+br(qDe(t.value))+'.'); } }catch(e){ C.P.erro(e); } C.P.render(); });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-rhu-qfundo]'); if(fu&&ev.target===fu){ U.qVer=null; U.imp=null; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rhu-q"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P;
    if(a==='rhu-qflimpa'){ U.qf=Object.assign(U.qf,{q:'',setor:'',sit:''}); P.render(); return; }
    if(a==='rhu-qnav'){ const v=+b.dataset.v; U.qSel=v===0?qAtual(C):v<0?qAnt(U.qSel||qAtual(C)):qProx(U.qSel||qAtual(C)); P.render(); return; }
    if(a==='rhu-qxls'){ qExcel(C); return; } if(a==='rhu-qpdf'){ qPdf(C); return; }
    if(a==='rhu-qverx'){ U.qVer=null; P.render(); return; } if(a==='rhu-qimpx'){ U.imp=null; P.render(); return; }
    if(a==='rhu-qimpok'){ if(U.salvando) return; U.salvando=true; b.disabled=true; try{ await impGrava(C); }catch(e){ P.erro(e); } finally{ U.salvando=false; } P.render(); return; }
    if(a==='rhu-qtodos'){ const D=qDados(C,b.dataset.q), ls=D.L.filter(l=>l.st==='pend'); let n=0; for(const l of ls){ try{ await qMarca(C,l.x,l.q,'ok'); n++; }catch(e){ P.erro(e); break; } } P.toast(n+' parcela'+(n===1?'':'s')+' marcada'+(n===1?'':'s')+' como descontada'+(n===1?'':'s')+'.'); P.render(); return; }
    const x=U.xs.find(y=>y._id===b.dataset.id); if(!x) return;
    if(a==='rhu-qver'){ U.qVer=x._id; if(U.st!=='desc'){ U.st='desc'; } P.render(); return; }
    try{
      if(a==='rhu-qok'){ await qMarca(C,x,b.dataset.q,'ok'); P.toast(C.titulo(x.nome||'')+': parcela descontada.'); }
      else if(a==='rhu-qfal'){ await qMarca(C,x,b.dataset.q,'falta'); P.toast(C.titulo(x.nome||'')+': não descontou, a parcela passa para a próxima quinzena.'); }
      else if(a==='rhu-qdes'){ await parcGrava(C,x,Pq=>{ Pq.hist=Pq.hist.filter(h=>h.q!==b.dataset.q); }); P.toast('Desfeito.'); }
      else if(a==='rhu-qquit'){ if(U.cx!=='q'+x._id){ U.cx='q'+x._id; P.render(); setTimeout(()=>{ if(U.cx==='q'+x._id){ U.cx=null; P.render(); } },4000); return; } U.cx=null;
        const I=parcInfo(C,x), Q=U.qSel||qAtual(C), us=new Set(I.hist.map(h=>h.q)); let q=Q; while(us.has(q)) q=qProx(q); await qMarca(C,x,q,'ok',true); P.toast(C.titulo(x.nome||'')+': descontado o resto ('+brl(I.rest)+') na quinzena de '+br(q)+'.'); }
      else if(a==='rhu-qterc'){ await C.P.db().doc(COL+'/'+x._id).update({terc:b.dataset.v==='1'}); x.terc=b.dataset.v==='1'; P.toast(b.dataset.v==='1'?'Marcado como terceiro: desconto parcelado.':'Não é terceiro: desconto de uma vez, como os funcionários.'); }
    }catch(e){ P.erro(e); } P.render(); });
  /* ---------- relatório de quem pegou (pedido de 29/10): por período, por pessoa e entrega a entrega; imprimir e Excel.
     O RH vê também o desconto; o Marcelo (Visão do gestor) vê só quem pegou o quê. ---------- */
  const ymd=d=>{ const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return z.toISOString().slice(0,10); };
  function relPer(){ const r=U.rel, h=new Date(); if(r.per==='datas') return {de:r.de||'0000-00-00',ate:r.ate||'9999-99-99'};
    if(r.per==='mesant'){ const a=new Date(h.getFullYear(),h.getMonth()-1,1), b=new Date(h.getFullYear(),h.getMonth(),0); return {de:ymd(a),ate:ymd(b)}; }
    if(r.per==='tudo') return {de:'0000-00-00',ate:'9999-99-99'};
    return {de:ymd(new Date(h.getFullYear(),h.getMonth(),1)),ate:ymd(new Date(h.getFullYear(),h.getMonth()+1,0))}; }
  function relDados(c){ const {de,ate}=relPer(), ws=norm(U.rel.q).split(' ').filter(Boolean), pr=precosDe(c);
    const R0=U.rel, xs=U.xs.filter(x=>x.data>=de&&x.data<=ate&&(!ws.length||ws.every(w=>norm([x.nome,x.setor,x.sol,itensOk(x).map(i=>i.t).join(' ')].join(' ')).includes(w)))
        &&(!R0.tipo||(R0.tipo==='terc')===!!ehTerc(c,x))&&(!R0.setor||(R0.setor==='-'?!x.setor:norm(x.setor)===norm(R0.setor)))&&(!c.rh||!R0.desc||(R0.desc==='nao')===!!(x.desc&&x.desc.nao))).sort((a,b)=>String(a.data).localeCompare(String(b.data))||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    const by=new Map(); xs.forEach(x=>{ const k=x.fid||pk(x.nome); if(!by.has(k)) by.set(k,{nome:c.titulo(x.nome||''),setor:x.setor||'',n:0,pc:new Map(),desc:0,semPreco:false,xs:[]}); const g=by.get(k); g.n++; g.xs.push(x); if(x.setor) g.setor=x.setor;
      itensOk(x).forEach(i=>{ const t=[String(i.t).trim(),String(i.tam||'').trim()].filter(Boolean).join(' '); g.pc.set(t,(g.pc.get(t)||0)+(Math.max(1,parseInt(i.qtd,10)||1))); });
      if(c.rh){ const d=descDe(x,pr); if(d.v==null) g.semPreco=true; else g.desc+=d.v; } });
    const ps=[...by.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return {de,ate,xs,ps,pecas:xs.reduce((a,x)=>a+itensOk(x).reduce((s,i)=>s+(Math.max(1,parseInt(i.qtd,10)||1)),0),0),desc:ps.reduce((a,g)=>a+g.desc,0)}; }
  const pcTxt=g=>[...g.pc.entries()].map(([t,q])=>q+' '+t).join(', ');
  /* a pessoa no período: todas descontadas (sim), nenhuma (nao) ou umas sim, outras não (parcial) */
  const pesSit=g=>{ const n=g.xs.filter(x=>x.desc&&x.desc.nao).length; return n===0?'sim':n===g.xs.length?'nao':'parc'; };
  const pesKey=x=>x.fid||pk(x.nome);
  function relHtml(c){ const e=c.esc, D=relDados(c), r=U.rel;
    const per=[['mes','Este mês'],['mesant','Mês passado'],['tudo','Tudo'],['datas','Escolher datas']];
    return `<div class="rhu-rel"><div class="rhu-rb"><div class="seg" role="group" aria-label="Período">${per.map(([k,t])=>`<button class="${r.per===k?'on':''}" aria-pressed="${r.per===k}" data-act="rhu-rper" data-v="${k}">${t}</button>`).join('')}</div>
        ${r.per==='datas'?`<span class="rhu-rdt"><input class="txt" type="date" id="rhu-rde" value="${e(r.de)}"><span>até</span><input class="txt" type="date" id="rhu-rate" value="${e(r.ate)}"></span>`:''}
        <span class="rhu-rsp"></span><button class="btn sec rhu-sm" data-act="rhu-rxls">${c.P.ic?c.P.ic('folha',15,2):''}Excel</button><button class="btn rhu-sm" data-act="rhu-rpdf">${c.P.ic?c.P.ic('folha',15,2):''}Baixar PDF</button></div>
      ${relFilHtml(c)}<div class="rhu-rk"><div><span>Pessoas</span><b>${D.ps.length}</b></div><div><span>Entregas</span><b>${D.xs.length}</b></div><div><span>Peças</span><b>${D.pecas}</b></div>${c.rh?`<div class="dsc"><span>Desconto no período</span><b>${brl(D.desc)}</b></div>`:''}</div>
      ${D.ps.length?`<div class="rhu-tw"><table class="rhu-t"><thead><tr><th>Funcionário</th><th>Peças</th><th class="n">Entregas</th>${c.rh?'<th class="c">Descontar?</th><th class="n">Desconto</th>':''}</tr></thead><tbody>
        ${D.ps.map(g=>{ const st=c.rh?pesSit(g):'', k=e(pesKey(g.xs[0]));
          return `<tr><td><b>${e(g.nome)}</b><small>${e(g.setor||'sem setor')}</small></td><td><span class="rhu-ri">${[...g.pc.entries()].map(([t,q])=>`<span>${q}× ${e(t)}</span>`).join('')}</span><small>${g.xs.map(x=>e(br(x.data).slice(0,5))).join(' · ')}</small></td><td class="n">${g.n}</td>
            ${c.rh?`<td class="c"><div class="rhu-yn sm" role="group" aria-label="Descontar ${e(g.nome)}"><button class="${st==='sim'?'on':''}" data-act="rhu-pdesc" data-k="${k}" data-v="sim">Sim</button><button class="${st==='nao'?'on nao':''}" data-act="rhu-pdesc" data-k="${k}" data-v="nao">Não</button></div>${st==='parc'?'<small>algumas entregas</small>':''}</td>
            <td class="n"><b>${st==='nao'?'—':brl(g.desc)}</b>${g.semPreco?'<small>falta preço</small>':''}</td>`:''}</tr>`; }).join('')}</tbody>
        ${c.rh?`<tfoot><tr><td>Total</td><td>${D.pecas} peças</td><td class="n">${D.xs.length}</td><td></td><td class="n">${brl(D.desc)}</td></tr></tfoot>`:''}</table></div>`
        :`<div class="empty">${U.lido?'Nenhuma entrega no período.':'Carregando…'}</div>`}</div>`; }
  function relLinhas(c){ const D=relDados(c), pr=precosDe(c);
    const res=[['Funcionário','Setor','Entregas','Peças'].concat(c.rh?['Desconto (R$)']:[])].concat(D.ps.map(g=>[g.nome,g.setor,g.n,pcTxt(g)].concat(c.rh?[Math.round(g.desc*100)/100]:[])));
    const det=[['Data','Período','Funcionário','Setor','Peça','Tamanho','Qtd','Nº solicitação','Conferido pelo RH','Entregue por'].concat(c.rh?['Desconto da entrega (R$)']:[])];
    D.xs.forEach(x=>{ const d=c.rh?descDe(x,pr):null; itensOk(x).forEach((i,k)=>det.push([br(x.data),x.per||'',c.titulo(x.nome||''),x.setor||'',i.t,i.tam||'',Math.max(1,parseInt(i.qtd,10)||1),x.sol||'',x.st==='lancado'?'sim':'não',x.porNome||''].concat(c.rh?[k===0?(d.v==null?'':d.v):'']:[]))); });
    return {D,res,det}; }
  const relFiltros=c=>{ const r=U.rel; return [r.tipo&&'Quem: '+(r.tipo==='terc'?'terceiros':'funcionários'),r.setor&&'Setor: '+(r.setor==='-'?'sem setor':r.setor),c.rh&&r.desc&&'Desconto: '+(r.desc==='nao'?'não descontados':'descontados'),r.q&&'Busca: '+r.q].filter(Boolean); };
  function relFilHtml(c){ const e=c.esc, r=U.rel, sets=[...new Set(U.xs.map(x=>x.setor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const sel=(k,l,ops)=>`<label><span>${l}</span><select class="txt" data-rhu-rf="${k}">${ops.map(([v,t])=>`<option value="${e(v)}" ${r[k]===v?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;
    return `<div class="rr-fil">${sel('tipo','Quem',[['','Todos'],['func','Funcionários'],['terc','Terceiros']])}${sel('setor','Setor',[['','Todos']].concat(sets.map(x=>[x,x]),[['-','Sem setor']]))}${c.rh?sel('desc','Desconto',[['','Todos'],['sim','Descontados'],['nao','Não descontados']]):''}</div>`
      +(window.RHRel?RHRel.barra({chips:[{t:'Quem',v:r.tipo&&(r.tipo==='terc'?'terceiros':'funcionários')},{t:'Setor',v:r.setor&&(r.setor==='-'?'sem setor':r.setor)},{t:'Desconto',v:c.rh&&r.desc&&(r.desc==='nao'?'não descontados':'descontados')},{t:'Busca',v:r.q}],limpar:'rhu-rflimpa'}):''); }
  const nomePer=D=>D.de==='0000-00-00'?'todas as datas':br(D.de)+' a '+br(D.ate);
  async function relExcel(c){ const {D,res,det}=relLinhas(c), nome='Uniformes-'+(D.de==='0000-00-00'?'todos':D.de.slice(0,7));
    if(window.RHRel) return RHRel.xls(nome,[['Por pessoa',res],['Entregas',det]],{tit:'Entregas de uniforme',sub:'Período: '+nomePer(D),filtros:relFiltros(c)});
    try{ if(!window.XLSX) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); }); }catch(e){}
    let blob, arq;
    if(window.XLSX&&window.XLSX.utils){ const wb=XLSX.utils.book_new(); [['Por pessoa',res],['Entregas',det]].forEach(([n,a])=>{ const ws=XLSX.utils.aoa_to_sheet(a); ws['!cols']=a[0].map((h,i)=>({wch:i===0||/Peça|Funcion/.test(h)?30:14})); XLSX.utils.book_append_sheet(wb,ws,n); });
      blob=new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); arq=nome+'.xlsx'; }
    else { const L=[['Por pessoa']].concat(res,[[],['Entregas']],det); blob=new Blob(['﻿'+L.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv'}); arq=nome+'.csv'; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=arq; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); window.__rhuUltimoXls=arq; }
  /* PDF no padrão do painel (Painel.pdf = o mesmo gerador dos relatórios do gestor e do comercial): baixa o arquivo */
  async function relPdf(c){ const PP=window.Painel&&window.Painel.pdf; if(!PP) return c.P.toast('O gerador de PDF ainda não carregou. Tente de novo.');
    const bt=document.querySelector('[data-act="rhu-rpdf"]'); if(bt){ bt.disabled=true; bt.dataset.tx=bt.innerHTML; bt.textContent='Gerando PDF…'; }
    try{ try{ await PP.carregar(); }catch(e){}
      const D=relDados(c), pr=precosDe(c), img=await PP.imgs(), per=nomePer(D);
      if(!(window.jspdf&&window.jspdf.jsPDF)) await new Promise((ok,er)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=ok; s.onerror=er; document.head.appendChild(s); }).catch(()=>{});
      const P=PP.novo('Entregas de uniforme','Período: '+per+' · '+(c.rh?'RH':'Visão do gestor'),img); P.capa();
      { const fs=relFiltros(c); P.texto('Filtros: '+(fs.join(' · ')||'nenhum (tudo)'),{fs:8,c:fs.length?'ink':'mut',b:!!fs.length}); }
      P.secao('Resumo do período');
      const nNao=c.rh?D.ps.filter(g=>pesSit(g)==='nao').length:0;
      P.kpis([{t:'Pessoas',v:String(D.ps.length),s:'receberam uniforme',c:'pet'},{t:'Entregas',v:String(D.xs.length),s:D.xs.filter(x=>x.st!=='lancado').length+' falta conferir',c:D.xs.some(x=>x.st!=='lancado')?'warn':'ok'},
        {t:'Peças',v:String(D.pecas),s:'entregues no período',c:'teal'}].concat(c.rh?[{t:'Desconto total',v:brl(D.desc),s:nNao?nNao+' pessoa'+(nNao>1?'s':'')+' sem desconto':'todas descontadas',c:'crit'}]:[]),c.rh?4:3);
      P.secao('Por pessoa',c.rh?'Descontar = decisão do RH':'');
      if(!D.ps.length) P.vazio('Nenhuma entrega no período.');
      else { const cols=[{t:'Funcionário',w:34},{t:'Setor',w:18},{t:'Peças',w:42},{t:'Entregas',w:14,al:'r'}].concat(c.rh?[{t:'Descontar',w:15},{t:'Desconto',w:17,al:'r'}]:[]);
        const rows=D.ps.map(g=>{ const st=c.rh?pesSit(g):'', r=[g.nome,g.setor||'—',pcTxt(g),String(g.n)].concat(c.rh?[st==='sim'?'Sim':st==='nao'?'Não':'Parcial',st==='nao'?'—':brl(g.desc)]:[]); if(c.rh) r._cor={4:st==='sim'?'ok':st==='nao'?'crit':'warn'}; return r; });
        if(c.rh) rows.push(Object.assign(['Total','',D.pecas+' peças',String(D.xs.length),'',brl(D.desc)],{_tot:1}));
        P.tabela(cols,rows); }
      if(D.xs.length){ P.secao('Entrega a entrega','em ordem de pessoa e data');
        const cols=[{t:'Data',w:15},{t:'Funcionário',w:30},{t:'Peças',w:46},{t:'Solicitação',w:16},{t:'Conferido',w:12}].concat(c.rh?[{t:'Desconto',w:17,al:'r'}]:[]);
        const xs=D.ps.flatMap(g=>g.xs);
        const rows=xs.map(x=>{ const d=c.rh?descDe(x,pr):null, r=[br(x.data)+(x.per?' '+x.per.slice(0,1)+'.':''),c.titulo(x.nome||''),itensOk(x).map(i=>(Math.max(1,parseInt(i.qtd,10)||1))+'× '+i.t+(i.tam?' '+i.tam:'')).join(', '),x.sol?'Nº '+x.sol:'—',x.st==='lancado'?'sim':'não']
            .concat(c.rh?[d.tipo==='nao'?'não descontar':d.v==null?'sem preço':brl(d.v)]:[]); r._cor={4:x.st==='lancado'?'ok':'warn'}; if(c.rh&&d.tipo==='nao') r._cor[5]='crit'; return r; });
        P.tabela(cols,rows); }
      if(c.rh){ const doc=P.doc; P.cabe(24); P.y+=12; P.dc([28,43,51]); doc.setLineWidth(.3); const w=(P.cw-16)/2; doc.line(P.M,P.y,P.M+w,P.y); doc.line(P.M+w+16,P.y,P.M+P.cw,P.y);
        doc.setFont('helvetica','normal'); doc.setFontSize(8); P.tc([85,102,111]); doc.text('Responsável pelo RH',P.M+w/2,P.y+4,{align:'center'}); doc.text('Data',P.M+w+16+w/2,P.y+4,{align:'center'}); P.y+=8; }
      const nome='Uniformes-'+(D.de==='0000-00-00'?'todos':D.de===D.ate.slice(0,8)+'01'&&D.de.slice(0,7)===D.ate.slice(0,7)?D.de.slice(0,7):D.de+'_a_'+D.ate)+'.pdf';
      P.fim(nome); window.__rhuUltimoPdf=nome; c.P.toast('PDF baixado: '+nome); }
    catch(e){ c.P.erro?c.P.erro(e):c.P.toast(String(e&&e.message||e)); }
    finally{ const b=document.querySelector('[data-act="rhu-rpdf"]'); if(b){ b.disabled=false; if(b.dataset.tx) b.innerHTML=b.dataset.tx; } } }
  /* tela do Marcelo (Visão do gestor › Pessoas › Uniformes): só o relatório, sem desconto. Lê rh/dados/uniformes
     (regra nova no firestore.rules: quem tem a Visão do gestor só LÊ as entregas de uniforme). */
  function ctxGestor(){ const P=window.Painel; const tit=s=>String(s||'').toLowerCase().replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase()).replace(/\s(D[aeo]s?|E)\s/g,m=>m.toLowerCase());
    return {P,esc:P.esc,titulo:tit,eu:()=>{ try{ return (P.S&&P.S.nomes&&P.S.nomes[P.S.uid])||''; }catch(e){ return ''; } },R:{cfg:{},func:[],funcoes:[]},rh:false,gestor:true}; }
  function gestor(){ const c=ctxGestor(); C=c; assina(c);
    return `<div class="head"><div><div class="eyebrow">PESSOAS</div><h1>Uniformes entregues</h1><div class="sub">Quem pegou uniforme e quais peças, por período.</div></div></div>
      <section class="card rhu-l"><div class="rhu-tb"><span></span><label class="rhu-bq"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input class="txt" id="rhu-rq" type="search" placeholder="Buscar pessoa, setor ou peça" value="${c.esc(U.rel.q)}"></label></div>${relHtml(c)}</section>`; }
  function render(c){ c.rh=true; assina(c); const e=c.esc, P=c.P, pend=U.xs.filter(x=>x.st!=='lancado'), ws=norm(U.q||'').split(' ').filter(Boolean);
    const xs=(U.st==='conf'?pend:U.xs).filter(x=>!ws.length||ws.every(w=>norm([x.nome,x.setor,x.sol,itensOk(x).map(i=>i.t).join(' ')].join(' ')).includes(w)));
    const mes=P.hojeStr().slice(0,7), doMes=U.xs.filter(x=>String(x.data||'').slice(0,7)===mes), pr=precosDe(c);
    const kMes=doMes.reduce((a,x)=>a+itensOk(x).reduce((s,i)=>s+(Math.max(1,parseInt(i.qtd,10)||1)),0),0), dMes=doMes.reduce((a,x)=>{ const d=descDe(x,pr); return a+(d.v||0); },0);
    const card=x=>{ const lan=x.st==='lancado', pode=P.dono()||x.por===P.S.uid, ini=c.titulo(x.nome||'').split(' ').filter(Boolean), sig=((ini[0]||'?')[0]+(ini.length>1?ini[ini.length-1][0]:'')).toUpperCase();
      return `<article class="rhu-c ${lan?'ok':''}">
        <div class="rhu-ch"><span class="rhu-av">${e(sig)}</span><div class="rhu-cn"><b>${e(c.titulo(x.nome||''))}</b><small>${e(x.setor||'sem setor')} · ${e(br(x.data))}${x.per?' · '+e(x.per):''}</small></div>
          ${lan?`<span class="pill ok">Conferido</span>`:`<span class="pill warn">Falta conferir</span>`}</div>
        <div class="rhu-cb"><div class="rhu-cm"><span class="rhu-ri">${itensOk(x).map(i=>`<span>${e(itTxt(i))}</span>`).join('')}</span>
            <small>${x.sol?'Solicitação Nº '+e(x.sol):'Sem nº da solicitação'} · entregue por ${e(x.porNome||'—')} · ${e(hm(x.em))}${x.emailEm?' · e-mail aberto':''}${x.obs?' · '+e(x.obs):''}</small></div>
          ${descLinha(c,x)}</div>
        <div class="rhu-cf">${lan?`<small>Conferido por ${e(x.lancPor==='planilha'?'planilha':x.lancPor||'')} · ${e(hm(x.lancEm))}</small><button class="lnk" data-act="rhu-volta" data-id="${e(x._id)}">Desfazer</button>`
            :`<button class="btn rhu-sm" data-act="rhu-lanc" data-id="${e(x._id)}">${P.ic?P.ic('check',15,2.4):''}Conferido</button>`}
          <span class="rhu-rsp"></span><button class="lnk" data-act="rhu-mail" data-id="${e(x._id)}">E-mail de novo</button>${pode?`<button class="lnk rhu-del" data-act="rhu-del" data-id="${e(x._id)}">${U.cx===x._id?'Confirmar: apagar':'Apagar'}</button>`:''}</div></article>`; };
    return c.topo('Entregas de uniforme','Quem entregou registra aqui: o RH confere a entrega e decide o desconto.',`<button class="btn sec" data-act="rhu-prab">Preço das peças</button><button class="btn" data-act="rhu-novo">+ Registrar entrega</button>`)
      +`<div class="rhu-kp"><div class="${pend.length?'warn':''}"><span>Falta conferir</span><b>${pend.length}</b></div><div><span>Entregas no mês</span><b>${doMes.length}</b></div><div><span>Peças no mês</span><b>${kMes}</b></div><div><span>Desconto no mês</span><b>${brl(dMes)}</b></div></div>
      <section class="card rhu-l"><div class="rhu-tb"><div class="seg" role="group" aria-label="Mostrar">${[['conf','Para conferir ('+pend.length+')'],['todas','Todas'],['rel','Relatório'],['desc','Descontos dos terceiros']].map(([a,b])=>`<button class="${U.st===a?'on':''}" aria-pressed="${U.st===a}" data-act="rhu-st" data-v="${a}">${b}</button>`).join('')}</div>
        ${U.st==='desc'?'':`<label class="rhu-bq"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input class="txt" id="${U.st==='rel'?'rhu-rq':'rhu-lq'}" type="search" placeholder="Buscar pessoa, setor ou peça" value="${e(U.st==='rel'?U.rel.q:(U.q||''))}"></label>`}</div>
        ${U.st==='desc'?descHtml(c):U.st==='rel'?relHtml(c):xs.length?`<div class="rhu-cs">${xs.map(card).join('')}</div>`:`<div class="empty">${!U.lido?'Carregando…':ws.length?'Nada encontrado na busca.':U.st==='conf'?'Nenhuma entrega esperando o RH. Tudo conferido.':'Nenhuma entrega registrada ainda. Toque em "+ Registrar entrega".'}</div>`}</section>`
      +(U.f?form(c):'')+(U.precos?precosForm(c):''); }
  function avisos(c){ const xs=U.xs.filter(x=>x.st!=='lancado'), qv=c&&c.R&&!c.gestor?qAvisos(c):[]; if(!xs.length) return qv;
    return qv.concat([{nivel:'warn',rotulo:'Uniforme',titulo:xs.length===1?'1 entrega de uniforme para conferir':xs.length+' entregas de uniforme para conferir',texto:xs.slice(0,3).map(x=>c.titulo(x.nome||'')).join(', '),go:'rhunif'}]); }
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
    if(t.id==='rhu-rq'||t.id==='rhu-lq'||t.id==='rhu-qq'){ if(t.id==='rhu-rq') U.rel.q=t.value; else if(t.id==='rhu-qq') U.qf.q=t.value; else U.q=t.value; const iid=t.id; clearTimeout(_rq); _rq=setTimeout(()=>{ C.P.render(); const i=document.getElementById(iid); if(i){ i.focus(); const n=i.value.length; try{ i.setSelectionRange(n,n); }catch(e){} } },350); } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!C) return; if(t.dataset&&t.dataset.rhuRf){ U.rel[t.dataset.rhuRf]=t.value; C.P.render(); return; } if(t.id==='rhu-rde'||t.id==='rhu-rate'){ U.rel[t.id==='rhu-rde'?'de':'ate']=t.value; C.P.render(); } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='rhu-dv'){ const b=document.querySelector('[data-act="rhu-dok"]'); if(b){ ev.preventDefault(); b.click(); } return; }
    if(!U.f) return; if(ev.key==='Escape'){ U.f=null; C&&C.P.render(); }
    if(ev.key==='Enter'&&ev.target&&ev.target.id==='rhu-pn'){ const b=document.querySelector('[data-act="rhu-pick"]'); if(b){ ev.preventDefault(); b.click(); } } });
  document.addEventListener('click',async ev=>{ const fu=ev.target.closest&&ev.target.closest('[data-rhu-fundo]'); if(fu&&ev.target===fu){ le(); U.f=null; U.precos=false; C&&C.P.render(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="rhu-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, db=P.db(), agora=new Date().toISOString(), eu=C.eu(); le(); const F=U.f;
    if(a==='rhu-novo'){ novo(C); return; }
    /* relatório */
    if(a==='rhu-rper'){ U.rel.per=b.dataset.v; if(U.rel.per==='datas'&&!U.rel.de){ U.rel.de=P.hojeStr().slice(0,8)+'01'; U.rel.ate=P.hojeStr(); } P.render(); return; }
    if(a==='rhu-rxls'){ relExcel(C); return; } if(a==='rhu-rflimpa'){ Object.assign(U.rel,{tipo:'',setor:'',desc:'',q:''}); P.render(); return; } if(a==='rhu-rpdf'){ relPdf(C); return; }
    /* preços e desconto (só o RH) */
    if(a==='rhu-prab'){ U.precos=true; P.render(); return; } if(a==='rhu-prx'){ U.precos=false; P.render(); return; }
    if(a==='rhu-prok'){ const pr=Object.assign({},precosDe(C)||{}); document.querySelectorAll('[data-rhu-pr]').forEach(i=>{ const t=i.dataset.rhuPr, v=numBR(i.value); pr[pk(t)]={n:t,v:v>0?v:0}; });
      const nn=String(g('rhu-prn')||'').trim(), nv=numBR(g('rhu-prnv')); if(nn) pr[pk(nn)]={n:nn,v:nv>0?nv:0};
      try{ await db.doc('rh/config').set({unifPrecos:pr},{merge:true}); C.R.cfg=C.R.cfg||{}; C.R.cfg.unifPrecos=pr; U.precos=false; P.toast('Preços guardados. O desconto das entregas já usa os preços novos.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-pdesc'){ const D=relDados(C), g=D.ps.find(y=>pesKey(y.xs[0])===b.dataset.k); if(!g) return; const nao=b.dataset.v==='nao'; let n=0;
      for(const x of g.xs){ const cur=!!(x.desc&&x.desc.nao); if(cur===nao) continue; const d=nao?{nao:true,v:(x.desc&&x.desc.v!=null&&!x.desc.nao?x.desc.v:(x.desc&&x.desc.v!=null?x.desc.v:null)),por:eu,em:agora}:(x.desc&&x.desc.v!=null?{nao:false,v:x.desc.v,por:eu,em:agora}:null);
        try{ await db.doc(COL+'/'+x._id).update({desc:d}); x.desc=d; n++; }catch(e){ P.erro(e); break; } }
      P.toast(nao?g.nome+': não será descontado'+(g.xs.length>1?' (as '+g.xs.length+' entregas do período)':'')+'.':g.nome+': será descontado.'); P.render(); return; }
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
    if(a==='rhu-dok'||a==='rhu-dnao'||a==='rhu-dcalc'||a==='rhu-dsim'){ let d;
      if(a==='rhu-dsim'&&!(x.desc&&x.desc.nao)) return;
      if(a==='rhu-dnao') d={nao:true,v:(x.desc&&x.desc.v!=null&&!x.desc.nao?x.desc.v:(x.desc&&x.desc.v!=null?x.desc.v:null)),por:eu,em:agora}; else if(a==='rhu-dcalc') d=null; else if(a==='rhu-dsim') d=x.desc&&x.desc.v!=null?{nao:false,v:x.desc.v,por:eu,em:agora}:null; else { const v=numBR(g('rhu-dv')); if(v==null||v<0) return P.toast('Digite o valor do desconto (ex.: 25,90).'); d={nao:false,v,por:eu,em:agora}; }
      try{ await db.doc(COL+'/'+x._id).update({desc:d}); x.desc=d; U.dEd=null; P.toast(a==='rhu-dnao'?'Esta entrega não será descontada.':a==='rhu-dsim'?'Esta entrega será descontada.':a==='rhu-dcalc'?'Desconto pelo preço das peças.':'Desconto guardado.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-mail'){ abreEmail(C,x,preJanela(C)); try{ const up={emailEm:agora,emailN:(x.emailN||0)+1}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); }catch(e){} P.render(); return; }
    if(a==='rhu-lanc'){ try{ const up={st:'lancado',lancEm:agora,lancPor:eu}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); P.toast('Entrega conferida.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-volta'){ try{ const up={st:'novo',lancEm:null,lancPor:null}; await db.doc(COL+'/'+x._id).update(up); Object.assign(x,up); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rhu-del'){ if(U.cx!==x._id){ U.cx=x._id; P.render(); setTimeout(()=>{ if(U.cx===x._id){ U.cx=null; P.render(); } },4000); return; } U.cx=null;
      try{ await db.doc(COL+'/'+x._id).update({removido:true,removidoEm:agora,removidoPor:eu}); U.xs=U.xs.filter(y=>y!==x); P.toast('Entrega apagada.'); }catch(e){ P.erro(e); } P.render(); return; } });
  window.RHUnif={render:c=>{ C=c; return render(c); },gestor,_parc:{qDe,qProx,qAnt,parcInfo:(x)=>parcInfo(C,x),planLer,impAbre:(abas,arq)=>impAbre(C,abas,arq),qDados:Q=>qDados(C,Q),ehTerc:x=>ehTerc(C,x)},avisos:c=>{ C=C||c; try{ assina(c); return avisos(c); }catch(e){ return []; } },novo:()=>{ if(C) novo(C); },texto,_U:U};
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
.rhu-kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.rhu-kp>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 18px;display:flex;flex-direction:column;gap:2px}
.rhu-kp span{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}.rhu-kp b{font-size:26px;line-height:1.15}.rhu-kp .warn{border-color:var(--warn);box-shadow:inset 4px 0 0 var(--warn)}
@media (max-width:760px){.rhu-kp{grid-template-columns:1fr 1fr}}
.rhu-tb{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}.rhu-tb .seg{margin:0!important}
.rhu-bq{position:relative;display:flex;align-items:center;flex:0 1 320px;min-width:220px}.rhu-bq svg{position:absolute;left:12px;color:var(--muted)}.rhu-bq input{width:100%;padding-left:36px;height:40px}
.rhu-cs{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:12px}@media (max-width:640px){.rhu-cs{grid-template-columns:1fr}}
.rhu-c{border:1px solid var(--line);border-radius:14px;background:var(--surface);display:flex;flex-direction:column;overflow:hidden}.rhu-c.ok{opacity:.8}
.rhu-ch{display:flex;align-items:center;gap:12px;padding:14px 16px 10px}.rhu-av{width:40px;height:40px;border-radius:50%;background:var(--teal-strong);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px;flex:none}
.rhu-cn{display:flex;flex-direction:column;min-width:0;flex:1}.rhu-cn b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rhu-cn small{color:var(--muted);font-size:12.5px}
.rhu-cb{display:flex;gap:12px;padding:0 16px 12px;align-items:stretch;flex-wrap:wrap}.rhu-cm{flex:1 1 200px;display:flex;flex-direction:column;gap:6px;min-width:0}.rhu-cm small{color:var(--muted);font-size:12px}
.rhu-dbox{flex:0 0 190px;background:var(--ground);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:3px}.rhu-dbox.nao{opacity:.85}.rhu-dbox small{color:var(--muted);font-size:11.5px}.rhu-dbox .lnk{align-self:flex-start;padding:0;font-size:12.5px}
.rhu-dl{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em}.rhu-dv{font-size:18px}.rhu-dbox.semp .rhu-dv{font-size:14px;color:var(--warn-ink,var(--warn))}
.rhu-yn{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;align-self:flex-start;background:var(--surface)}.rhu-yn button{border:0;background:none;font:inherit;font-weight:700;font-size:13px;padding:5px 14px;cursor:pointer;color:var(--muted)}
.rhu-yn button.on{background:var(--ok,#3C8A63);color:#fff}.rhu-yn button.on.nao{background:var(--crit,#B5473F)}.rhu-yn.sm button{padding:3px 10px;font-size:12px}
.rhu-dx2{flex:0 0 230px;background:var(--ground);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}.rhu-dx2 input{width:110px;height:36px;text-align:right}.rhu-dbt{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rhu-cf{display:flex;gap:12px;align-items:center;padding:10px 16px;border-top:1px solid var(--line);margin-top:auto;flex-wrap:wrap}.rhu-cf small{color:var(--muted);font-size:12px}.rhu-rsp{flex:1}
.rhu-cf .btn{display:inline-flex;gap:6px;align-items:center}
.rhu-rk .dsc{background:var(--teal-strong)!important;color:#fff}.rhu-rk .dsc span{color:rgba(255,255,255,.75)!important}
.rhu-t .c{text-align:center}.rhu-t tfoot td{font-weight:700;border-top:2px solid var(--line);border-bottom:0;padding-top:10px}.rhu-t td .rhu-ri span{font-size:12.5px}
.rhu-rb .btn{display:inline-flex;gap:6px;align-items:center}
.rhu-rel{display:flex;flex-direction:column;gap:12px}.rhu-rb{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.rhu-rq{width:240px;max-width:100%}.rhu-rdt{display:inline-flex;gap:6px;align-items:center}
.rhu-rk{display:flex;gap:10px;flex-wrap:wrap}.rhu-rk div{background:var(--ground);border-radius:12px;padding:10px 16px;min-width:130px;display:flex;flex-direction:column}.rhu-rk b{font-size:22px}.rhu-rk span{font-size:11.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.rhu-tw{overflow-x:auto}.rhu-t{width:100%;border-collapse:collapse;font-size:14px}.rhu-t th{text-align:left;font-size:12px;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}.rhu-t td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.rhu-t .n{text-align:right;white-space:nowrap}.rhu-t small{display:block;color:var(--muted);font-size:12px}
.rhu-l{display:flex;flex-direction:column;gap:0}.rhu-l .seg{margin-bottom:10px;align-self:flex-start}
.rhu-r{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;padding:12px 0;border-top:1px solid var(--line);align-items:start}.rhu-r.ok{opacity:.75}
.rhu-rd{display:flex;flex-direction:column}.rhu-rd b{font-size:18px}.rhu-rd small,.rhu-rm small{color:var(--muted);font-size:12.5px}
.rhu-rm{display:flex;flex-direction:column;gap:3px;min-width:0}.rhu-ri{display:flex;gap:6px;flex-wrap:wrap}.rhu-ri span{background:var(--ground);border-radius:7px;padding:2px 8px;font-size:13px}
.rhu-rs{display:flex;flex-direction:column;align-items:flex-end;gap:5px}.rhu-rs small{color:var(--muted);font-size:12px}.rhu-ra{display:flex;gap:12px}.rhu-del{color:var(--crit-ink,var(--crit))}.rhu-sm{height:34px;padding:0 12px}
/* desconto parcelado dos terceiros */
.rhu-dcol{flex:0 0 230px;display:flex;flex-direction:column;gap:8px}.rhu-dcol .rhu-dbox{flex:none}
.rhu-pq{background:var(--ground);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;border-left:3px solid var(--teal)}.rhu-pq small{color:var(--muted);font-size:11.5px;line-height:1.4}
.rhu-pqh{display:flex;gap:6px;align-items:center;justify-content:space-between;flex-wrap:wrap}.rhu-pqh .pill{font-size:11px}
.rhu-pqn{display:flex!important;flex-direction:row!important;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);font-weight:600}.rhu-pqn select{height:32px;padding:0 8px;width:auto}.rhu-pqn input{height:36px;width:auto}
.rhu-pq .rhu-dbt .lnk{padding:0;font-size:12.5px}
.rhu-qnav{display:flex;align-items:center;gap:10px}.rhu-qnav>div{display:flex;flex-direction:column;align-items:center;min-width:130px}.rhu-qnav span{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em}.rhu-qnav b{font-size:20px}.rhu-qnav small{font-size:11.5px;color:var(--muted)}.rhu-qnav .lnk{font-size:12px;padding:0}
.rhu-qd{font-weight:600;white-space:nowrap}
.rhu-qnav .btn{width:38px;justify-content:center;font-size:20px;padding:0}.rhu-qimp{cursor:pointer;display:inline-flex;align-items:center}
.rhu-qt td{vertical-align:middle}.rhu-qa{white-space:nowrap;text-align:right}.rhu-qa .btn{margin-left:6px}.rhu-qa .lnk{margin-left:8px}
.rhu-t tr.ok td,.rhu-t tr.feito td{opacity:.72}.rhu-t tr.falta td{background:color-mix(in srgb,var(--warn) 7%,transparent)}.rhu-t tr.atr td:first-child{color:var(--crit-ink,var(--crit));font-weight:600}
.rhu-qat{border:1.5px solid var(--crit);border-radius:12px;padding:10px 12px}.rhu-qat .label{color:var(--crit-ink,var(--crit));margin-bottom:6px}
.rhu-imp{display:flex;flex-direction:column;gap:14px;max-height:56vh;overflow:auto;padding-right:4px}.rhu-impa{display:flex;flex-direction:column;gap:4px}
.rhu-impl{display:grid!important;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 4px;border-bottom:1px solid var(--line);color:inherit!important;font-size:14px!important;font-weight:400!important;cursor:pointer}.rhu-impl.ja{opacity:.55}
.rhu-impl input{width:18px;height:18px}.rhu-impn,.rhu-impv{display:flex;flex-direction:column;min-width:0}.rhu-impv{text-align:right;font-weight:600}.rhu-impn small,.rhu-impv small{color:var(--muted);font-size:12px;font-weight:400}.rhu-impn em{color:var(--warn-ink,var(--warn));font-style:normal;font-weight:600}
@media (max-width:640px){.rhu-qa{white-space:normal}.rhu-qa .btn{margin:4px 4px 0 0}.rhu-dcol{flex:1 1 100%}}
@media (max-width:640px){.rhu-r{grid-template-columns:48px minmax(0,1fr)}.rhu-rs{grid-column:1/-1;align-items:flex-start}.rhu-2{grid-template-columns:1fr}}
</style>`);
})();
