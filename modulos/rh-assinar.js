/* ===================== RH · ASSINAR PELO GOV.BR (pedido de 04/11) =====================
   A assinatura do gov.br só pode ser ligada direto a sistemas de órgãos públicos; então o caminho é guiado:
   o RH toca em "Assinar pelo gov.br" num documento gerado → o painel faz o PDF e um link (assinar.html?c=CÓDIGO, sem login)
   → a pessoa baixa o PDF, assina no assinador do governo (assinador.iti.br) com a conta gov.br e manda o arquivo assinado
   pelo mesmo link → o painel confere (é o mesmo documento? tem assinatura? de quem? do gov.br?) e guarda como "Ver assinado".
   Dados (regras: o pedido e o PDF só são lidos por quem tem o código; o envio só é criado, uma vez, enquanto o pedido vale):
     rh/dados/assinped/{t}        {t,nome,doc,docId,funcId,partes,tam,sha,arq,criado,ateMs,usado,porNome}
     rh/dados/assinpdf/{t}-{k}    {d}  PDF original em pedaços (base64)
     rh/dados/assinenvp/{t}-{k}   {d}  PDF assinado em pedaços (criados antes do assinenv)
     rh/dados/assinenv/{t}        {n,tam,partes,em,ver}
     rh/dados/docsgerados/{id}.ass       {t,st:'enviado',em,por,ateMs}
     rh/dados/docsgerados/{id}.assinado  {url,nome,em,porNome,gov:{ok,probs,ass,t}}  (o mesmo "Ver assinado" do anexar)
   Usado pelo rh.js: RHAssina.botao(ctx,d) · .iniciar(ctx) · .avisos(). Prefixo `asn`. */
(function(){
  const PED='rh/dados/assinped', PDF='rh/dados/assinpdf', ENV='rh/dados/assinenv', ENVP='rh/dados/assinenvp', DOCS='rh/dados/docsgerados', PEDACO=850000;
  const MSG='Olá, {NOME}! O RH da Colafix mandou o documento "{DOC}" para você assinar pelo gov.br. É pelo celular: abra o link, siga os 3 passos e mande o documento assinado de volta.\n{LINK}';
  const A={sub:false,env:{},proc:{},mod:null,pdfFn:null};
  let C=null;
  const agora=()=>new Date().toISOString();
  const dig=s=>String(s||'').replace(/\D/g,'');
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
  const br=iso=>{ const d=String(iso||''); return /^\d{4}-\d{2}-\d{2}/.test(d)?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):''; };
  const b64De=u8=>{ let s=''; for(let i=0;i<u8.length;i+=32768) s+=String.fromCharCode.apply(null,u8.subarray(i,i+32768)); return btoa(s); };
  const deB64=b=>{ const s=atob(b), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; };
  const linkDe=t=>location.origin+location.pathname.replace(/[^/]*$/,'')+'assinar.html?c='+t;
  const vence=d=>!!(d.ass&&d.ass.ateMs&&d.ass.ateMs<Date.now());
  const mesmaPessoa=(a,b)=>{ const x=norm(a).split(' ').filter(Boolean), y=norm(b).split(' ').filter(Boolean); if(!x.length||!y.length) return false;
    if(x.join(' ')===y.join(' ')) return true; return x[0]===y[0]&&x[x.length-1]===y[y.length-1]; };

  /* ---------- botão e situação na lista de documentos ---------- */
  function botao(c,d){ C=c; const e=c.esc, i=`data-id="${e(d._id)}"`;
    if(d.assinado&&d.assinado.gov){ const g=d.assinado.gov, q=(g.probs||[]).join(' · ');
      return `<span class="asn-sel ${g.ok?'ok':'av'}" title="${e(q||'Assinatura do gov.br conferida pelo painel')}">${g.ok?'✓ Assinado pelo gov.br':'Assinado · conferir'}</span><a class="lnk asn-lk" href="https://validar.iti.gov.br/" target="_blank" rel="noopener">Validar</a>`; }
    if(d.assinado) return '';
    if(d.ass&&d.ass.st==='enviado') return vence(d)?`<span class="asn-sel av">O link venceu</span><button class="lnk" data-act="asn-abre" ${i}>Mandar de novo</button>`
      :`<span class="asn-sel">Esperando assinatura</span><button class="lnk" data-act="asn-abre" ${i}>Ver o link</button>`;
    return d.html?`<button class="lnk" data-act="asn-abre" ${i}>Assinar pelo gov.br</button>`:''; }
  const css=`<style id="asn-css">.asn-sel{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:2px 9px;margin-right:8px;background:var(--teal-tint,#E2ECF1);color:var(--teal-strong,#143F54);white-space:nowrap}
  .asn-sel.ok{background:var(--ok-tint,#E3F0E8);color:var(--ok-ink,#2F6047)}.asn-sel.av{background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310)}.asn-lk{margin-right:10px;font-size:13px}
  .asn-f{position:fixed;inset:0;background:rgba(10,25,35,.42);z-index:950;display:grid;place-items:center;padding:16px}
  .asn-m{background:var(--surface,#fff);color:inherit;border-radius:18px;max-width:600px;width:100%;max-height:92vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-size:14.5px}
  .asn-m h3{margin:0 0 2px;font-size:19px}.asn-m .sub{color:var(--muted);margin:0 0 12px}
  .asn-m label{display:block;font-size:12.5px;color:var(--muted);font-weight:600;margin-top:10px}
  .asn-m input,.asn-m textarea{width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1px solid var(--line,#E1E7EB);border-radius:9px;font:inherit;background:var(--surface,#fff);color:inherit}
  .asn-m textarea{min-height:110px}.asn-m .lk{display:block;word-break:break-all;background:var(--surface-2,#EEF2F5);padding:8px 10px;border-radius:8px;font-size:13px;margin:8px 0}
  .asn-ac{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px}.asn-ps{display:flex;gap:10px;margin-top:8px}.asn-ps i{flex:none;width:22px;height:22px;border-radius:11px;background:var(--teal-tint,#E2ECF1);color:var(--teal-strong,#143F54);font-style:normal;font-weight:700;display:grid;place-items:center;font-size:12px}
  .asn-av{margin-top:10px;padding:9px 12px;border-radius:10px;background:var(--warn-tint,#FBF1DC);color:var(--warn-ink,#7A5310);font-size:13.5px}</style>`;
  (function(){ if(document.getElementById('asn-css')) return; const d=document.createElement('div'); d.innerHTML=css; document.head.appendChild(d.firstElementChild); })();

  /* ---------- janela ---------- */
  function fDe(d){ return (C.R.func||[]).find(x=>x._id===d.funcId)||{nome:d.funcionario||''}; }
  function desenha(){ let el=document.getElementById('asn-mw'); if(!A.mod){ if(el) el.remove(); return; }
    if(!el){ el=document.createElement('div'); el.id='asn-mw'; document.body.appendChild(el); }
    const M=A.mod, e=C.esc, d=M.d, f=fDe(d), msgPad=((C.R.cfg||{}).asnMsg)||MSG;
    let corpo='';
    if(M.passo==='criar') corpo=`<p class="sub">${e(d.modelo||'Documento')} · ${e(C.titulo(f.nome||d.funcionario||''))}</p>
      <div class="asn-ps"><i>1</i><span>O painel faz o PDF do documento e um link só desta pessoa.</span></div>
      <div class="asn-ps"><i>2</i><span>A pessoa abre o link no celular, baixa o PDF e assina no <b>gov.br</b> (precisa da conta prata ou ouro).</span></div>
      <div class="asn-ps"><i>3</i><span>Ela manda o arquivo assinado pelo mesmo link. O painel confere e guarda em "Ver assinado".</span></div>
      <label>WhatsApp da pessoa<input id="asn-tel" inputmode="tel" value="${e(M.tel||'')}" placeholder="(51) 99999-0000"></label>
      <label>Mensagem (<b>{NOME}</b>, <b>{DOC}</b> e <b>{LINK}</b> são trocados sozinhos)<textarea id="asn-msg">${e(M.msg!=null?M.msg:msgPad)}</textarea></label>
      <label>O link vale por (dias)<input id="asn-dias" inputmode="numeric" value="${e(M.dias||15)}" style="max-width:120px"></label>
      ${M.erro?`<div class="asn-av">${e(M.erro)}</div>`:''}
      <div class="asn-ac"><button class="btn sec" data-act="asn-x">Cancelar</button><button class="btn" data-act="asn-criar" ${M.ocup?'disabled':''}>${M.ocup?'Preparando o PDF…':'Criar o link'}</button></div>`;
    else { const msg=String(M.msg||msgPad).replace(/\{NOME\}/g,C.titulo(f.nome||'').split(' ')[0]).replace(/\{DOC\}/g,d.modelo||'documento').replace(/\{LINK\}/g,linkDe(M.t)); M.txt=msg;
      corpo=`<p class="sub">${e(d.modelo||'Documento')} · ${e(C.titulo(f.nome||d.funcionario||''))}${M.ateMs?' · o link vale até '+br(new Date(M.ateMs).toISOString()):''}</p>
      <span class="lk" id="asn-link">${e(linkDe(M.t))}</span>
      <label>Mensagem<textarea id="asn-txt">${e(msg)}</textarea></label>
      <p class="sub" style="margin-top:10px">Quando a pessoa mandar o documento assinado, ele aparece aqui na lista como "Assinado pelo gov.br".</p>
      <div class="asn-ac"><button class="btn sec" data-act="asn-copia">Copiar</button><button class="btn sec" data-act="asn-x">Fechar</button><button class="btn" data-act="asn-wa">Mandar no WhatsApp</button></div>`; }
    el.innerHTML=`<div class="asn-f" data-asn-f><div class="asn-m" role="dialog" aria-label="Assinar pelo gov.br"><h3>Assinar pelo gov.br</h3>${corpo}</div></div>`; }
  async function pdfDe(d){ const blob=A.pdfFn?await A.pdfFn(d):await C.pdfDoDoc(d); return new Uint8Array(await blob.arrayBuffer()); }
  async function criar(){ const M=A.mod, d=M.d, f=fDe(d), P=C.P, g=id=>(document.getElementById(id)||{}).value;
    M.tel=g('asn-tel')||''; M.msg=g('asn-msg'); M.dias=Math.max(1,Math.min(60,parseInt(g('asn-dias'),10)||15)); M.erro=''; M.ocup=true; desenha();
    try{ if(!window.AssinLer) throw new Error('O leitor de assinaturas ainda não carregou. Recarregue a página.');
      const u8=await pdfDe(d), sha=await window.AssinLer.sha(u8), b=b64De(u8), t=C.tokenNovo(), n=Math.ceil(b.length/PEDACO)||1, ateMs=Date.now()+M.dias*864e5;
      for(let k=0;k<n;k++) await P.db().doc(PDF+'/'+t+'-'+k).set({d:b.slice(k*PEDACO,(k+1)*PEDACO)});
      const arq=String((d.modelo||'Documento')+' - '+C.titulo(f.nome||'')).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim()+'.pdf';
      await P.db().doc(PED+'/'+t).set({t,nome:C.titulo(f.nome||d.funcionario||''),doc:d.modelo||'Documento',docId:d._id,funcId:d.funcId||'',partes:n,tam:u8.length,sha,arq,criado:agora(),ateMs,usado:false,porNome:C.eu()});
      const ass={t,st:'enviado',em:agora(),por:C.eu(),ateMs}; await P.db().doc(DOCS+'/'+d._id).set({ass},{merge:true}); d.ass=ass;
      if(M.msg&&M.msg!==((C.R.cfg||{}).asnMsg||MSG)){ try{ await P.db().doc('rh/config').set({asnMsg:M.msg},{merge:true}); C.R.cfg=C.R.cfg||{}; C.R.cfg.asnMsg=M.msg; }catch(e){} }
      Object.assign(M,{passo:'link',t,ateMs,ocup:false}); desenha(); P.render(); }
    catch(e){ M.ocup=false; M.erro='Não foi possível criar o link: '+((e&&e.message)||e); desenha(); } }
  async function abre(d){ const f=fDe(d); A.mod={d,tel:f.telefone||'',passo:'criar'};
    if(d.ass&&d.ass.st==='enviado'&&!vence(d)){ try{ const g=await C.P.db().doc(PED+'/'+d.ass.t).get(); if(g.exists&&!g.data().usado) Object.assign(A.mod,{passo:'link',t:d.ass.t,ateMs:d.ass.ateMs}); }catch(e){} }
    desenha(); }
  document.addEventListener('click',async ev=>{ if(!C) return; const fu=ev.target.closest&&ev.target.closest('[data-asn-f]'); if(fu&&ev.target===fu){ A.mod=null; desenha(); return; }
    const b=ev.target.closest&&ev.target.closest('[data-act^="asn-"]'); if(!b) return; ev.preventDefault(); ev.stopPropagation(); const a=b.dataset.act;
    if(a==='asn-abre'){ const d=(C.R.docs||[]).find(x=>x._id===b.dataset.id); if(d) abre(d); return; }
    if(!A.mod) return;
    if(a==='asn-x'){ A.mod=null; desenha(); return; }
    if(a==='asn-criar'){ criar(); return; }
    const txt=(document.getElementById('asn-txt')||{}).value||A.mod.txt||'';
    if(a==='asn-copia'){ try{ await navigator.clipboard.writeText(txt); C.P.toast('Mensagem copiada.'); }catch(e){ C.P.toast('Selecione o texto e copie.'); } return; }
    if(a==='asn-wa'){ const tel=dig(A.mod.tel), u=(tel?'https://wa.me/'+(tel.length<=11?'55':'')+tel:'https://wa.me/')+'?text='+encodeURIComponent(txt); window.__asnUltimoWa=u; window.open(u,'_blank','noopener'); return; } },true);
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&A.mod){ A.mod=null; desenha(); } });

  /* ---------- o documento assinado chegou: conferir e guardar ---------- */
  async function confere(c,ped,u8){ const r=await window.AssinLer.ler(u8), probs=[];
    let mesmo=null; try{ mesmo=u8.length>=ped.tam&&(await window.AssinLer.sha(u8.subarray(0,ped.tam)))===ped.sha; }catch(e){}
    const f=(c.R.func||[]).find(x=>x._id===ped.funcId)||{nome:ped.nome}, as=r.ass, ult=as[as.length-1];
    if(!r.pdf) probs.push('O arquivo não é um PDF.');
    else if(!as.length) probs.push('O arquivo não tem assinatura digital.');
    if(mesmo===false) probs.push('O PDF assinado não começa igual ao que o RH mandou: pode ser outro documento ou ter sido mudado. Confira no Validar.');
    if(as.length){ const dele=as.find(x=>mesmaPessoa(x.nome,f.nome)||(x.cpf&&dig(f.cpf)&&x.cpf===dig(f.cpf)));
      if(!dele) probs.push('Assinado por '+as.map(x=>x.nome||'nome não lido').join(' e ')+' (o cadastro é '+(f.nome||ped.nome)+').');
      if(!as.some(x=>x.gov||x.icp)) probs.push('A assinatura não é do gov.br nem de certificado ICP-Brasil.');
      if(as.some(x=>x.digOk===false)) probs.push('Uma assinatura não confere com o conteúdo do arquivo.');
      if(ult&&!ult.cobre) probs.push('Há mudanças no arquivo depois da última assinatura.'); }
    return {ok:!probs.length,probs,mesmo,ass:as.map(x=>({nome:x.nome,cpf:x.cpf?x.cpf.slice(0,3)+'.***.***-'+x.cpf.slice(-2):'',emissor:x.emissor,gov:x.gov,icp:x.icp,quando:x.quando,digOk:x.digOk}))}; }
  async function processa(c){ const P=c.P;
    for(const e of Object.values(A.env)){ if(A.proc[e._id]) continue; A.proc[e._id]=true;
      try{ const g=await P.db().doc(PED+'/'+e._id).get(); if(!g.exists) continue; const ped=g.data(); if(ped.usado) continue;
        let b=''; for(let k=0;k<(+e.partes||0);k++){ const p=await P.db().doc(ENVP+'/'+e._id+'-'+k).get(); if(!p.exists) throw new Error('falta pedaço'); b+=p.data().d||''; }
        const u8=deB64(b), gov=await confere(c,ped,u8);
        const dg=await P.db().doc(DOCS+'/'+ped.docId).get(), d=dg.exists?Object.assign({_id:dg.id},dg.data()):{_id:ped.docId,modelo:ped.doc,funcionario:ped.nome,funcId:ped.funcId};
        await c.guardaAssinado(d,b,Object.assign(gov,{t:e._id,em:agora(),n:e.n||''}));
        await P.db().doc(DOCS+'/'+ped.docId).set({ass:{t:e._id,st:'assinado',em:agora(),ateMs:ped.ateMs}},{merge:true});
        await P.db().doc(PED+'/'+e._id).set({usado:true,usadoEm:agora()},{merge:true});
        for(let k=0;k<(+ped.partes||0);k++){ try{ await P.db().doc(PDF+'/'+e._id+'-'+k).delete(); }catch(er){} }
        for(let k=0;k<(+e.partes||0);k++){ try{ await P.db().doc(ENVP+'/'+e._id+'-'+k).delete(); }catch(er){} }
        P.toast((gov.ok?'Documento assinado pelo gov.br chegou: ':'Documento assinado chegou (conferir): ')+(ped.doc||'')+' · '+(ped.nome||'')); P.render(); }
      catch(er){ A.proc[e._id]=false; console.warn('[RH] assinatura',er); } } }
  function iniciar(c){ C=c; if(A.sub) return; A.sub=true;
    c.P.inscrever('rh-asnenv',()=>c.P.db().collection(ENV).orderBy('em','desc').limit(30),s=>{ s.docs.forEach(d=>{ A.env[d.id]=Object.assign({_id:d.id},d.data()); }); processa(C||c); }); }
  function avisos(){ if(!C) return []; const lim=Date.now()-5*864e5;
    const xs=(C.R.docs||[]).filter(d=>d.ass&&d.ass.st==='enviado'&&!d.assinado&&!vence(d)&&Date.parse(d.ass.em||0)<lim);
    const cf=(C.R.docs||[]).filter(d=>d.assinado&&d.assinado.gov&&!d.assinado.gov.ok&&!d.assinado.gov.visto);
    const out=[]; if(xs.length) out.push({nivel:'warn',rotulo:'Documentos',titulo:xs.length+(xs.length>1?' documentos esperando':' documento esperando')+' assinatura há mais de 5 dias',texto:xs.slice(0,3).map(d=>(d.modelo||'')+' · '+(C.titulo(d.funcionario||''))).join(' · '),go:'rhdocs'});
    if(cf.length) out.push({nivel:'warn',rotulo:'Documentos',titulo:cf.length+(cf.length>1?' documentos assinados para conferir':' documento assinado para conferir'),texto:cf.slice(0,3).map(d=>(d.modelo||'')+' · '+(C.titulo(d.funcionario||''))).join(' · '),go:'rhdocs'});
    return out; }
  window.RHAssina={botao,iniciar,avisos,_A:A,_confere:(c,ped,u8)=>confere(c,ped,u8)};
})();
