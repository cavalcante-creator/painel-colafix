/* Folha do café (pedido de 03/11): a lista fixa do café (separada em grupos, como a planilha do RH: ADM / EXPEDIÇÃO, PROD/ALMOX/MANUT,
   MOTORISTAS, TERCEIRIZADOS) impressa no mesmo modelo da folha do almoço, com as marcas pretas para conferir pela foto.
   Lista em rh/config.cafe.linhas (linha em MAIÚSCULAS = título do grupo); cada dia em rh/dados/cafefolha/{AAAA-MM-DD}
   {dia, nv:{nome:'Não veio'}, emit:{em,por,n,ver,vs}, foto:{em,por,ass,n,fotos}}. Na foto, o código da folha usa as páginas 4–7
   (o almoço usa 0–3), então a foto do café não é confundida com a do almoço. Tela rhcafe (RH › Ausências › Folha do café). */
(function(){
  const C={dia:null,doc:{},lido:{},ed:null,ff:{},abas:null,wb:null,aba:0,salv:false};
  const PAG=45, BASE=4;
  const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const ehGrupo=s=>{ const t=String(s||'').trim(); return !!t&&/[A-ZÀ-Ú]/.test(t)&&t===t.toUpperCase()&&!/[a-zà-ú]/.test(t); };
  const semPref=s=>String(s||'').replace(/^\s*(motorista|terceiro|terceirizado)s?\s*-\s*/i,'');
  const pad=n=>String(n).padStart(2,'0');
  const hoje=()=>{ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
  const maisDia=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate()); };
  const br=d=>d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
  const DS=['domingo','segunda','terça','quarta','quinta','sexta','sábado'], dsem=d=>DS[new Date(d+'T12:00:00').getDay()];
  const linhas=c=>{ const x=(c.R.cfg&&c.R.cfg.cafe&&c.R.cfg.cafe.linhas)||[]; return Array.isArray(x)?x:[]; };
  const grupos=ls=>{ const G=[]; let g=null; ls.forEach(l=>{ const t=String(l||'').trim(); if(!t) return; if(ehGrupo(t)){ g={g:t,ns:[]}; G.push(g); } else { if(!g){ g={g:'',ns:[]}; G.push(g); } g.ns.push(t); } }); return G.filter(x=>x.ns.length||x.g); };
  const nomes=ls=>grupos(ls).flatMap(g=>g.ns);
  function est(c,d){ let F=C.doc[d]; if(F) return F; F=C.doc[d]={nv:{},tirar:{},resp:null,emit:null,foto:null,carregando:true};
    c.P.db().doc('rh/dados/cafefolha/'+d).get().then(g=>{ const x=g&&g.exists?g.data():{}; F.nv=x.nv||{}; F.tirar=x.tirar||{}; F.resp=x.resp||null; F.emit=x.emit||null; F.foto=x.foto||null; F.carregando=false; c.P.render(); }).catch(()=>{ F.carregando=false; c.P.render(); });
    return F; }
  async function salvar(c,d){ const F=C.doc[d]; try{ await c.P.db().doc('rh/dados/cafefolha/'+d).set({dia:d,nv:F.nv||{},tirar:F.tirar||{},resp:F.resp||null,emit:F.emit||null,foto:F.foto||null,em:new Date().toISOString()}); }catch(e){ c.P.toast('Não foi possível guardar: '+((e&&e.message)||e)); } }
  /* páginas: cada página começa com "Nome | Assinatura"; título de grupo não fica sozinho no pé da página */
  function paginas(c,d){ const F=est(c,d), G=grupos(linhas(c)), rows=[]; G.forEach(g=>{ if(g.g) rows.push({grupo:g.g}); g.ns.filter(n=>!(F.tirar||{})[n]).forEach(n=>rows.push({nome:n,cz:F.nv[n]||''})); });
    for(let i=0;i<4;i++) rows.push({nome:'',cz:''});
    const ps=[]; let pg=[{cab:true}]; rows.forEach((r,i)=>{ const resta=PAG-pg.length; if(resta<=0||(r.grupo&&resta<=1)){ ps.push(pg); pg=[{cab:true}]; } pg.push(r); }); if(pg.length>1) ps.push(pg);
    if(ps.length>4){ return ps.slice(0,4); } return ps; }
  const marcas=()=>{ try{ return localStorage.getItem('colafix.alm.marcas')!=='0'; }catch(e){ return true; } };
  function titulo(c,d){ const F=est(c,d), ns=nomes(linhas(c)).filter(n=>!(F.tirar||{})[n]); return 'CAFÉ - '+br(d)+' - '+(ns.length-ns.filter(n=>F.nv[n]).length); }
  function imprimir(c,d){ const FT=window.RHAlmFoto; if(!FT) return c.P.toast('Carregando… tente de novo em um instante.'); const F=est(c,d);
    if(!nomes(linhas(c)).length) return c.P.toast('Cadastre a lista do café primeiro (Editar a lista).');
    const w=window.open('','_blank'); if(!w) return c.P.toast('Libere as janelas (pop-up) para imprimir.');
    const nv=((F.emit&&F.emit.n)||0)+1, ver=nv%4, ps=paginas(c,d);
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>CAFÉ - ${br(d)}</title><style>${FT.CSS}</style></head><body>${FT.paginas(ps,d,ver,titulo(c,d),!marcas(),{cafe:true,pgBase:BASE})}</body></html>`); w.document.close();
    setTimeout(()=>{ try{ w.focus(); w.print(); }catch(x){} },350);
    const pm={}; ps.forEach((r,i)=>{ pm[i]=r.map(x=>x.nome?{nome:x.nome,cz:x.cz||''}:x.grupo?{grupo:x.grupo}:x.cab?{cab:true}:{nome:'',cz:''}); }); const vs=Object.assign({},(F.emit&&F.emit.vs)||{}); vs[ver]=pm;
    F.emit={em:new Date().toISOString(),por:c.eu?c.eu():'',n:nv,mudou:false,ver,vs}; salvar(c,d); c.P.render(); }
  /* ---------- foto ---------- */
  const ffE=d=>C.ff[d]=C.ff[d]||{res:{},man:{},erros:[],lendo:false};
  function ass(c,d){ const F=est(c,d), R=ffE(d), o=Object.assign({},(F.foto&&F.foto.ass)||{}); Object.keys(R.res).forEach(pg=>R.res[pg].linhas.forEach(l=>{ o[l.nome]=l.s; })); Object.assign(o,R.man); return o; }
  async function lerFotos(c,d,files){ const F=est(c,d), R=ffE(d), FT=window.RHAlmFoto; if(!FT) return; R.lendo=true; R.erros=[]; c.P.render();
    for(const f of files){ try{ const r=await FT.ler(f,dec=>{ const vs=(F.emit&&F.emit.vs)||{}; return dec.dia===d&&dec.pg>=BASE&&vs[dec.ver]?vs[dec.ver][dec.pg-BASE]:null; });
        if(r.pg<BASE){ R.erros.push(f.name+': esta é a folha do almoço. Confira em Ausências › Almoço.'); continue; }
        if(r.dia!==d){ R.erros.push(f.name+': esta foto é da folha do café de '+br(r.dia)+'. Escolha esse dia para conferir.'); continue; }
        if(r.semLista){ R.erros.push(f.name+': esta folha é de uma impressão antiga. Fotografe a folha da última impressão.'); continue; }
        R.res[r.pg-BASE]=r; }catch(e){ console.warn('[café foto]',e); R.erros.push((f.name?f.name+': ':'')+((e&&e.message)||e)); } }
    R.lendo=false; c.P.render(); }
  async function salvarFoto(c,d){ const F=est(c,d), R=ffE(d), a=ass(c,d), fotos=((F.foto&&F.foto.fotos)||[]).slice();
    for(const pg of Object.keys(R.res)){ const r=R.res[pg]; if(!r.blob||!c.guardar) continue; try{ let fl; try{ fl=new File([r.blob],'cafe-'+d+'-'+(+pg+1)+'.jpg',{type:'image/jpeg'}); }catch(e){ fl=r.blob; }
        const g=await c.guardar('Café/'+d.slice(0,7),'Folha café '+d+' folha '+(+pg+1)+'.jpg',fl); fotos[+pg]=(g&&g.url)||''; }catch(e){ console.warn('[café foto] guardar',e); } }
    const n={sim:0,nao:0,duv:0}; Object.values(a).forEach(v=>{ if(n[v]!=null) n[v]++; });
    F.foto={em:new Date().toISOString(),por:c.eu?c.eu():'',ver:F.emit&&F.emit.ver,ass:a,n,fotos:fotos.map(x=>x||'')}; await salvar(c,d); R.res={}; R.man={}; R.erros=[];
    c.P.toast('Conferência do café guardada: '+n.sim+' assinaram.'); c.P.render(); }
  /* Face ID: quem passou no refeitório de manhã (café) no dia, pelo nome */
  function faceCafe(d){ const A=window.RHAlmoco&&window.RHAlmoco._A; const D=A&&A.dados&&A.dados[d.slice(0,7)]; if(!D||!D.dias||!D.dias[d]) return null;
    const P0=D.pessoas||{}, out=[]; Object.keys(D.dias[d]).forEach(k=>{ const x=D.dias[d][k]; out.push({n:(P0[k]||{}).n||'',c:!!(x&&x.c)}); }); return out; }
  function mesma(a,b){ const A=norm(semPref(a)).split(' ').filter(w=>w.length>1&&!['DA','DE','DO','DAS','DOS'].includes(w)), B=norm(b).split(' ').filter(w=>w.length>1&&!['DA','DE','DO','DAS','DOS'].includes(w));
    if(!A.length||!B.length||A[0]!==B[0]) return false; const [p,q]=A.length<=B.length?[A,B]:[B,A]; return p.every(w=>q.includes(w)); }
  /* ---------- conferência pelo Face ID antes de imprimir (igual à folha do almoço, pedido de 03/11) ---------- */
  const fN=s=>norm(s).toLowerCase();
  function pessoas(c,d){ const A=window.RHAlmoco&&window.RHAlmoco._A, m=d.slice(0,7), D=(A&&A.dados&&A.dados[m])||{}, dia=(D.dias||{})[d]||null, P0=D.pessoas||{};
    const func=(c.R.func||[]).filter(f=>!/deslig|inativ/i.test(f.status||'')||(f.desligamento&&f.desligamento>=d));
    const fer=(c.R.fer||[]).filter(x=>x.inicio&&x.inicio<=d&&(x.fim||x.inicio)>=d&&!/cancel/i.test(x.status||''));
    const um=xs=>xs.length===1?xs[0]:null;
    const L=[]; grupos(linhas(c)).forEach(g=>g.ns.forEach(n=>{ const base=semPref(n);
      const f=um(func.filter(x=>mesma(base,x.nome))); let k=f?String(f.cpf||'').replace(/\D/g,''):''; if(k) k=k.padStart(11,'0');
      if(!k||!P0[k]){ const kk=um(Object.keys(P0).filter(x=>mesma(base,P0[x].n||''))); if(kk) k=kk; }
      L.push({nome:n,g:g.g,k,f,fid:!!(k&&P0[k]),passou:!!(k&&dia&&dia[k]),ferias:!!(f&&(fer.some(y=>y.funcId===f._id)||/f[eé]rias/i.test(f.status||'')))}); }));
    return {L,temDia:!!dia}; }
  function conf(c,d){ const esc=c.esc, F=est(c,d), {L,temDia}=pessoas(c,d), brD=br(d); F.tirar=F.tirar||{};
    const LV=L.filter(x=>!F.tirar[x.nome]), n=LV.filter(x=>F.nv[x.nome]).length;
    const ck=(x,mot)=>`<label class="alm-fk ${F.nv[x.nome]?'on':''}"><input type="checkbox" data-cf-nv="${esc(x.nome)}" data-mot="${mot}" ${F.nv[x.nome]?'checked':''}> <span>${esc(x.nome)}</span>${F.nv[x.nome]?`<em>${esc(F.nv[x.nome])}</em>`:''}</label>`;
    let corpo='';
    if(F.carregando) corpo='<div class="sub">Carregando…</div>';
    else if(!temDia&&F.resp!=='sem') corpo=`<div class="alm-fq"><b>O CSV do Face ID de ${esc(brD)} já foi importado?</b><span>Ainda não aparece nenhum registro do Face ID neste dia. Com ele, o painel mostra quem está na lista e não passou na catraca, para você confirmar quem não veio.</span>
        <div class="alm-fa"><label class="btn">Importar o CSV agora<input type="file" accept=".csv,.txt" hidden data-cf-csv="1"></label><button class="btn sec" data-act="cf-sem">Emitir sem conferir pelo Face ID</button></div></div>`;
    else { const nao=LV.filter(x=>x.fid&&!x.passou&&!x.ferias), fer=LV.filter(x=>x.ferias), tir=L.filter(x=>F.tirar[x.nome]);
      corpo=(temDia?`<div class="alm-fg"><b>Na lista, mas não passaram no Face ID em ${esc(brD)} (${nao.length})</b><span>Marque quem realmente não veio. Quem você não marcar fica normal na folha, para assinar.</span>
          ${nao.length?`<div class="alm-fks">${nao.map(x=>ck(x,'Não veio')).join('')}</div>`:'<div class="sub">Todos da lista que têm Face ID passaram na catraca.</div>'}</div>`:'')
        +(fer.length?`<div class="alm-fg"><b>De férias em ${esc(brD)} (${fer.length})</b><span>Marque para sair “Férias” na folha.</span><div class="alm-fks">${fer.map(x=>ck(x,'Férias')).join('')}</div></div>`:'')
        +`<div class="alm-fg"><b>Procurar pessoa na lista</b><span>Digite parte do nome para marcar “não veio” ou tirar a pessoa só da folha deste dia. Terceiros e motoristas sem Face ID são marcados por aqui.</span>
          <input class="txt alm-fbusca" id="cf-fbusca" placeholder="Ex.: Paulo, Terceiro, Motorista…" autocomplete="off" value="${esc(C.fbusca||'')}"><div id="cf-fres">${busca(c,d)}</div></div>`
        +(()=>{ const ja=new Set(nao.concat(fer).map(x=>x.nome)), man=LV.filter(x=>F.nv[x.nome]&&!ja.has(x.nome)); return man.length?`<div class="alm-fg"><b>Marcados por você (${man.length})</b><span>Marcados pela busca.</span><div class="alm-fks">${man.map(x=>`<div class="alm-fk on"><span>${esc(x.nome)}</span><em>${esc(F.nv[x.nome])}</em><button class="lnk" data-act="cf-nvx" data-n="${esc(x.nome)}">Desfazer</button></div>`).join('')}</div></div>`:''; })()
        +(tir.length?`<div class="alm-fg"><b>Tirados da folha deste dia (${tir.length})</b><span>Não saem na impressão de ${esc(brD)}. A lista fixa não muda.</span><div class="alm-fks">${tir.map(x=>`<div class="alm-fk"><span>${esc(x.nome)}</span><button class="lnk" data-act="cf-dev" data-n="${esc(x.nome)}" style="margin-left:auto">Devolver</button></div>`).join('')}</div></div>`:'')
        +(F.emit?`<div class="alm-fe ${F.emit.mudou?'mud':''}">${F.emit.mudou?'<b>Marcação alterada depois de emitida</b> — imprima de novo para a folha ficar certa. ':''}Emitida em ${esc(new Date(F.emit.em).toLocaleDateString('pt-BR'))} às ${esc(new Date(F.emit.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}${F.emit.por?' por '+esc(F.emit.por):''}${F.emit.n>1?' ('+F.emit.n+' vezes)':''}. Pode mudar as marcações e imprimir de novo.</div>`:'')
        +`<div class="alm-fz"><span><b>${LV.length}</b> na folha · <b>${n}</b> marcado${n===1?'':'s'} · <b>${LV.length-n}</b> para assinar${tir.length?' · '+tir.length+' tirado'+(tir.length>1?'s':'')+' da folha':''}</span><button class="btn" data-act="cf-imp">${F.emit?'Imprimir de novo':'Imprimir folha'}</button></div>`; }
    return `<section class="card alm-folha cf-l"><div class="alm-fh"><div><b>Folha de assinatura do café · ${esc(brD)}</b><span>A folha sai normal, para todos assinarem; só quem estiver marcado sai em cinza.</span></div>
      <div class="alm-fa">${!F.carregando&&F.resp==='sem'&&!temDia?'<button class="lnk" data-act="cf-volta">Voltar à pergunta do Face ID</button>':''}<button class="btn sec" data-act="${C.ed?'cf-edx':'cf-ed'}">${C.ed?'Fechar a lista fixa':'Lista fixa ('+nomes(linhas(c)).length+')'}</button></div></div>
      ${C.ed?editor(c):''}${nomes(linhas(c)).length?corpo:'<div class="alm-fq"><b>Ainda não tem a lista do café</b><span>Toque em “Lista fixa” para colar os nomes ou importar a planilha do café (os títulos em MAIÚSCULAS viram os grupos).</span></div>'}</section>`; }
  function busca(c,d){ const esc=c.esc, q=fN(C.fbusca||''); if(q.length<2) return ''; const F=est(c,d), {L}=pessoas(c,d); F.tirar=F.tirar||{};
    const xs=L.filter(x=>fN(x.nome).includes(q)).slice(0,10); if(!xs.length) return '<div class="sub" style="margin-top:6px">Ninguém da lista com esse nome.</div>';
    return `<div class="alm-fbr">${xs.map(x=>{ const tir=F.tirar[x.nome], m=F.nv[x.nome], st=tir?'Tirado desta folha':m||(x.passou?'Passou no Face ID':x.fid?'Não passou no Face ID':'Normal (assina)');
      return `<div class="alm-fbl ${tir?'tir':m?'on':''}"><div><b>${esc(x.nome)}</b><small>${esc(st)}</small></div><div class="alm-fa">${tir?`<button class="btn sec" data-act="cf-dev" data-n="${esc(x.nome)}">Devolver à folha</button>`
        :`${m?`<button class="btn sec" data-act="cf-nvx" data-n="${esc(x.nome)}">Desfazer</button>`:`<button class="btn sec" data-act="cf-nvset" data-n="${esc(x.nome)}">Não veio</button>`}<button class="lnk" data-act="cf-tirar" data-n="${esc(x.nome)}">Tirar desta folha</button>`}</div></div>`; }).join('')}</div>`; }
  /* ---------- tela ---------- */
  function prev(c,d){ const esc=c.esc, F=est(c,d), G=grupos(linhas(c)), ns=nomes(linhas(c)).filter(n=>!(F.tirar||{})[n]), n=ns.filter(x=>F.nv[x]).length;
    return `<div class="alm-pvh"><b>Como vai sair</b><span>${ns.length} na folha · ${n} em cinza · <b>${ns.length-n}</b> para assinar</span></div>
      <div class="alm-pvt cf-pv"><table><thead><tr><th colspan="2">${esc(titulo(c,d))}</th></tr><tr class="hd"><th>Nome</th><th>Assinatura</th></tr></thead><tbody>${G.map(g=>{ const xs=g.ns.filter(n=>!(F.tirar||{})[n]); return xs.length?`${g.g?`<tr class="gr"><td colspan="2">${esc(g.g)}</td></tr>`:''}${xs.map(n=>`<tr class="${F.nv[n]?'cz':''}"><td>${esc(n)}</td><td>${F.nv[n]?esc(F.nv[n]):''}</td></tr>`).join('')}`:''; }).join('')}</tbody></table></div>
      <label class="ck alm-fmk"><input type="checkbox" id="alm-fmk" ${marcas()?'checked':''}> Imprimir com as marcas pretas nos cantos <small>(só servem para "Conferir pela foto")</small></label>
      <button class="btn alm-pvb" data-act="cf-imp" ${ns.length?'':'disabled'}>${F.emit?'Imprimir de novo':'Imprimir folha'}</button>`; }
  /* faixa + janela, iguais às da folha do almoço (pedido de 03/11: "mesmo layout e igual ao almoço"); entra na tela do Almoço */
  function painel(c,d){ C.ctx=c; if(d) C.dia=d; if(!C.dia) C.dia=hoje(); d=C.dia; const esc=c.esc, F=est(c,d), {L,temDia}=pessoas(c,d), LV=L.filter(x=>!(F.tirar||{})[x.nome]), n=LV.filter(x=>F.nv[x.nome]).length;
    try{ if(window.RHAlmoco&&window.RHAlmoco.carregar&&c.almCtx) window.RHAlmoco.carregar(c.almCtx(),d.slice(0,7)); }catch(e){}
    const st=F.carregando?'carregando…':!L.length?'falta montar a lista fixa':!temDia&&F.resp!=='sem'?'falta conferir o Face ID do dia':F.emit?(F.emit.mudou?'alterada depois de emitida — imprima de novo':'emitida às '+new Date(F.emit.em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})):'ainda não emitida';
    const bar=`<section class="card alm-fbar cf-bar"><div><b>Folha de assinatura do café · ${esc(br(d))}</b><span>${LV.length} na folha · ${n} marcado${n===1?'':'s'} · <b>${LV.length-n}</b> para assinar · <em class="${F.emit&&F.emit.mudou?'mud':''}">${esc(st)}</em>${F.foto&&F.foto.n?` · <em>conferida pela foto: ${F.foto.n.sim} assinaram</em>`:''}</span></div><div class="alm-fa">${F.emit&&F.emit.vs?`<label class="btn sec">Conferir pela foto<input type="file" accept="image/*" multiple hidden data-cf-foto="1"></label>`:''}<button class="btn" data-act="cf-abre">Abrir a folha do café</button></div></section>`;
    if(!C.ab) return bar;
    return bar+`<div class="alm-fm" role="dialog" aria-modal="true" aria-label="Folha de assinatura do café"><div class="alm-fmb"><div class="alm-fmh"><div><div class="eyebrow">RH · CAFÉ</div><h2>Folha de assinatura do café · ${esc(br(d))}</h2></div><button class="btn sec" data-act="cf-fecha">Fechar</button></div>
      <div class="alm-fmg"><div class="alm-fml">${foto(c,d)}${conf(c,d)}</div><aside class="alm-fmr">${prev(c,d)}</aside></div></div></div>`; }
  /* tela antiga "Folha do café" (fora do menu): só o dia e a mesma faixa */
  function render(c){ C.ctx=c; if(!C.dia) C.dia=hoje(); const d=C.dia;
    const nav=`<span class="cf-nav"><button class="btn sec rh-sm" data-act="cf-dia" data-v="-1" aria-label="Dia anterior">‹</button><input class="txt" type="date" id="cf-dia" value="${d}"><button class="btn sec rh-sm" data-act="cf-dia" data-v="1" aria-label="Próximo dia">›</button>${d!==hoje()?'<button class="lnk" data-act="cf-hoje">hoje</button>':''}</span>`;
    return c.topo('Folha do café',`${dsem(d)}, ${br(d)} · fica também em Almoço › Por dia`,nav)+painel(c,d); }
  function foto(c,d){ const esc=c.esc, F=est(c,d), R=ffE(d);
    const inp=l=>`<label class="btn ${l?'sec':''}">${l||'Tirar ou escolher a foto'}<input type="file" accept="image/*" multiple hidden data-cf-foto="1"></label>`;
    const cab=`<h2>Conferir pela foto da folha assinada</h2><div class="sub" style="margin:0 0 10px">Uma foto por folha, de frente, com as 4 marcas pretas aparecendo. O painel vê em quais linhas tem assinatura${faceCafe(d)?' e compara com quem passou no refeitório de manhã (Face ID)':''}.</div>`;
    if(!F.emit||!F.emit.vs) return `<section class="alm-ff cf-ff">${cab}<div class="cf-info">Imprima a folha por aqui primeiro: ela sai com as marcas que a foto precisa.</div></section>`;
    if(R.lendo) return `<section class="alm-ff cf-ff">${cab}<div class="cf-info">Lendo a foto…</div></section>`;
    const err=R.erros.length?`<div class="cf-err">${R.erros.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'';
    const a=ass(c,d), ns=Object.keys(a); if(!ns.length) return `<section class="alm-ff cf-ff">${cab}${err}${inp()}</section>`;
    const fc=faceCafe(d), passou=n=>{ if(!fc) return null; const xs=fc.filter(x=>mesma(n,x.n)); return xs.length?xs.some(x=>x.c):null; }; /* null = não está no Face ID do dia (terceiro, motorista…): não compara */
    const g={sim:[],nao:[],duv:[]}; ns.forEach(n=>{ if(g[a[n]]) g[a[n]].push(n); });
    const semFace=fc?g.sim.filter(n=>passou(n)===false):[], semAss=fc?g.nao.filter(n=>passou(n)===true):[];
    const chip=n=>`<button class="cf-c ${a[n]}" data-act="cf-tg" data-n="${esc(n)}" title="Tocar para trocar">${esc(n)}</button>`;
    const bl=(t,xs,s)=>xs.length?`<div class="cf-b"><b>${t} · ${xs.length}</b>${s?`<small>${s}</small>`:''}<div>${xs.map(chip).join('')}</div></div>`:'';
    const lidas=Object.keys(R.res).map(Number).sort(), tot=Object.keys(F.emit.vs[F.emit.ver]||{}).length;
    const pend=tot&&lidas.length&&lidas.length<tot?`<div class="cf-info">Falta a foto da ${Array.from({length:tot},(_,i)=>i).filter(i=>!R.res[i]).map(i=>'folha '+(i+1)).join(', ')}.</div>`:'';
    const salvo=F.foto&&!lidas.length&&!Object.keys(R.man).length?`<div class="cf-info">Conferida em ${esc(new Date(F.foto.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))}${F.foto.por?' por '+esc(F.foto.por):''}.${(F.foto.fotos||[]).map((u,i)=>u?` <a href="${esc(u)}" target="_blank" rel="noopener">Ver foto ${i+1}</a>`:'').join('')}</div>`:'';
    const vistas=lidas.map(p=>`<figure><img src="${R.res[p].vista}" alt="Foto da folha ${p+1}"><figcaption>Folha ${p+1}: verde = assinou · vermelho = em branco · laranja = conferir</figcaption></figure>`).join('');
    return `<section class="alm-ff cf-ff">${cab}${err}${salvo}${pend}<div class="cf-k"><span><b>${g.sim.length}</b> assinaram</span><span><b>${g.nao.length}</b> em branco</span>${g.duv.length?`<span class="w"><b>${g.duv.length}</b> para conferir</span>`:''}</div>
      ${bl('Assinaram, mas não passaram no refeitório de manhã',semFace,'Estavam na empresa pelo Face ID. Pode ser que o leitor do refeitório não pegou.')}${bl('Passaram no refeitório de manhã, mas a linha está em branco',semAss,'Confira na folha: pode ter esquecido de assinar.')}
      ${bl('Traço fraco · confira na folha',g.duv,'Toque no nome: assinou ↔ em branco.')}${bl('Em branco',g.nao.filter(n=>!semAss.includes(n)),'')}
      <details class="cf-d"><summary>Assinaram (${g.sim.length})</summary><div>${g.sim.map(chip).join('')}</div></details>${vistas?`<div class="cf-v">${vistas}</div>`:''}
      <div class="cf-a">${inp(lidas.length?'Mandar outra foto':'Ler outra foto')}${lidas.length||Object.keys(R.man).length?'<button class="btn" data-act="cf-ffsalva">Guardar conferência</button>':''}</div></section>`; }
  function editor(c){ const esc=c.esc, t=C.ed.txt, G=grupos(t.split('\n')), n=G.reduce((a,g)=>a+g.ns.length,0);
    return `<section class="card cf-ed"><h2>Lista do café</h2><div class="sub" style="margin:0 0 10px">Um nome por linha. Linha toda em MAIÚSCULAS vira o título do grupo (ex.: <b>ADM / EXPEDIÇÃO</b>, <b>MOTORISTAS</b>). A mesma lista vale para todos os dias; quem não veio é marcado no dia.</div>
      <div class="cf-edb"><label class="btn sec">Importar a planilha do café (.xlsx)<input type="file" accept=".xlsx,.xls" hidden data-cf-xls="1"></label>${C.abas?`<label class="cf-aba">Aba <select class="txt" id="cf-aba">${C.abas.map((a,i)=>`<option value="${i}" ${i===C.aba?'selected':''}>${esc(a)}</option>`).join('')}</select></label>`:''}</div>
      <textarea class="txt cf-ta" id="cf-ta" rows="18" spellcheck="false">${esc(t)}</textarea>
      <div class="cf-edr"><span class="sub" id="cf-edn">${G.filter(g=>g.g).length} grupos · ${n} nomes</span><span style="flex:1"></span><button class="btn sec" data-act="cf-edx">Cancelar</button><button class="btn" data-act="cf-eds" ${C.salv?'disabled':''}>Salvar lista</button></div></section>`; }
  function abaLinhas(i){ const ws=C.wb.Sheets[C.wb.SheetNames[i]], rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false});
    return rows.map(r=>String((r||[])[0]||'').trim()).filter(t=>t&&!/^caf[eé]\s*-|^nome$|assinatura/i.test(t)&&!/^\d/.test(t)); }
  async function lerXls(c,file){ try{ if(!window.XLSX) await c.carregarJs('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      C.wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); C.abas=C.wb.SheetNames.slice(0,60); C.aba=0; C.ed.txt=abaLinhas(0).join('\n'); c.P.toast('Lista da aba “'+C.abas[0]+'”. Confira e salve.'); c.P.render(); }
    catch(e){ c.P.toast('Não consegui ler a planilha: '+((e&&e.message)||e)); } }
  document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="cf-"]'), c=C.ctx; if(!b||!c) return; const a=b.dataset.act, d=C.dia;
    if(a==='cf-dia'){ C.dia=maisDia(d,+b.dataset.v); c.P.render(); return; }
    if(a==='cf-hoje'){ C.dia=hoje(); c.P.render(); return; }
    if(a==='cf-imp'){ imprimir(c,d); return; }
    if(a==='cf-abre'){ C.ab=true; c.P.render(); return; } if(a==='cf-fecha'){ C.ab=false; c.P.render(); return; }
    if(a==='cf-ed'){ C.ed={txt:linhas(c).join('\n')}; c.P.render(); return; }
    if(a==='cf-edx'){ C.ed=null; C.abas=null; C.wb=null; c.P.render(); return; }
    if(a==='cf-eds'){ const ta=document.getElementById('cf-ta'); if(ta) C.ed.txt=ta.value; const ls=C.ed.txt.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
      if(!grupos(ls).some(g=>g.ns.length)) return c.P.toast('A lista está sem nomes.'); C.salv=true; c.P.render();
      try{ await c.P.db().doc('rh/config').set({cafe:{linhas:ls,em:new Date().toISOString(),por:c.eu?c.eu():''}},{merge:true}); if(c.R.cfg) c.R.cfg.cafe={linhas:ls}; C.ed=null; C.abas=null; C.wb=null; c.P.toast('Lista do café salva: '+nomes(ls).length+' nomes.'); }
      catch(e){ c.P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } C.salv=false; c.P.render(); return; }
    if(a==='cf-sem'||a==='cf-volta'){ const F=est(c,d); F.resp=a==='cf-sem'?'sem':null; salvar(c,d); c.P.render(); return; }
    if(['cf-nvset','cf-nvx','cf-tirar','cf-dev'].includes(a)){ const F=est(c,d), nm=b.dataset.n; F.tirar=F.tirar||{};
      if(a==='cf-nvset') F.nv[nm]='Não veio'; if(a==='cf-nvx') delete F.nv[nm]; if(a==='cf-tirar'){ F.tirar[nm]=true; delete F.nv[nm]; } if(a==='cf-dev') delete F.tirar[nm];
      if(F.emit) F.emit.mudou=true; salvar(c,d); c.P.render(); const i=document.getElementById('cf-fbusca'); if(i&&C.fbusca){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } return; }
    if(a==='cf-tg'){ const n=b.dataset.n, cur=ass(c,d)[n]; ffE(d).man[n]=cur==='sim'?'nao':'sim'; c.P.render(); return; }
    if(a==='cf-ffsalva'){ b.disabled=true; await salvarFoto(c,d); return; } });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&C.ab&&C.ctx){ C.ab=false; C.ctx.P.render(); } });
  document.addEventListener('change',ev=>{ const t=ev.target, c=C.ctx; if(!t||!c) return; const d=C.dia;
    if(t.id==='cf-dia'&&/^\d{4}-\d\d-\d\d$/.test(t.value)){ C.dia=t.value; c.P.render(); return; }
    if(t.dataset&&t.dataset.cfNv!=null){ const F=est(c,d); if(t.checked) F.nv[t.dataset.cfNv]=t.dataset.mot||'Não veio'; else delete F.nv[t.dataset.cfNv]; if(F.emit) F.emit.mudou=true; salvar(c,d); c.P.render(); return; }
    if(t.dataset&&t.dataset.cfFoto){ const fs=[...(t.files||[])]; t.value=''; if(fs.length) lerFotos(c,d,fs); return; }
    if(t.dataset&&t.dataset.cfCsv){ const f=t.files&&t.files[0]; t.value=''; if(!f) return; if(!window.RHAlmoco||!RHAlmoco.importar) return c.P.toast('Abra o Almoço uma vez e tente de novo.');
      RHAlmoco.importar(c.almCtx?c.almCtx():null,f).then(()=>c.P.render()); return; }
    if(t.dataset&&t.dataset.cfXls){ const f=t.files&&t.files[0]; t.value=''; if(f) lerXls(c,f); return; }
    if(t.id==='cf-aba'&&C.wb){ C.aba=+t.value; C.ed.txt=abaLinhas(C.aba).join('\n'); c.P.render(); return; } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(t&&t.id==='cf-fbusca'&&C.ctx){ C.fbusca=t.value; const r=document.getElementById('cf-fres'); if(r) r.innerHTML=busca(C.ctx,C.dia); return; } if(!t||t.id!=='cf-ta'||!C.ed) return; C.ed.txt=t.value; const G=grupos(t.value.split('\n')), el=document.getElementById('cf-edn'); if(el) el.textContent=G.filter(g=>g.g).length+' grupos · '+G.reduce((a,g)=>a+g.ns.length,0)+' nomes'; });
  const css=document.createElement('style'); css.textContent=`
  .cf-nav{display:inline-flex;gap:6px;align-items:center}.cf-nav input{width:auto;height:38px}
  .cf-gr{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:16px;align-items:start}.cf-gr .card{margin:0 0 16px}.cf-bar{margin-top:12px}.alm-fml .cf-ff{margin-bottom:12px}.alm-fml .cf-ed{box-shadow:none;padding:0;margin:10px 0}.cf-l .alm-fks{max-height:none}.cf-l h2,.cf-ff h2,.cf-ed h2{margin:0 0 4px;font-size:17px}
  .cf-ls{display:flex;flex-direction:column}.cf-g{font-size:11.5px;font-weight:600;letter-spacing:.08em;color:var(--muted);padding:12px 0 4px;border-bottom:1px solid var(--line)}
  .cf-p{display:flex;align-items:center;gap:8px;padding:7px 2px;border-bottom:1px solid var(--line);cursor:pointer;font-size:14px}.cf-p span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cf-p small{color:var(--muted);font-size:12.5px}.cf-p.nv span{color:var(--muted);text-decoration:line-through}
  .cf-em{font-size:13px;color:var(--muted);margin:0 0 8px}.cf-em.mud{color:var(--crit);}
  .cf-pvh{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 8px}.cf-pvh span{color:var(--muted);font-size:12.5px}
  .cf-pv table{width:100%;border-collapse:collapse;font-size:13.5px;font-weight:600}.cf-pv th,.cf-pv td{border:1px solid #444!important;padding:3px 8px!important;text-align:left;font-style:normal!important;font-size:13px!important;letter-spacing:0!important;text-transform:none!important;color:#000}.cf-pv td{background:#fff}.cf-pv thead tr:first-child th{background:#D9E2D0;color:#000;text-align:center}.cf-pv tr.hd th{background:#E7E6E6;color:#000;text-align:center}.cf-pv tr.gr td{background:#D9E2D0;color:#000;text-align:left!important;font-weight:700}.cf-pv tr.cz td{background:#BFBFBF;color:#000}.cf-pv td:last-child{width:55%;font-style:italic!important;font-weight:400;text-align:center}.cf-pv tr.gr td:last-child{font-style:normal!important;text-align:left}
  .cf-info{background:var(--sunken);border-radius:10px;padding:10px 12px;font-size:13.5px;margin:0 0 10px}.cf-err{background:var(--crit-tint);color:var(--crit-ink);border-radius:10px;padding:10px 12px;font-size:13.5px;margin:0 0 10px}
  .cf-k{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 10px}.cf-k span{font-size:13.5px;color:var(--muted)}.cf-k b{font-size:20px;color:var(--ink);margin-right:4px}.cf-k .w b{color:var(--warn-ink)}
  .cf-b{margin:0 0 10px}.cf-b>b{display:block;font-size:14px}.cf-b small{display:block;color:var(--muted);font-size:12.5px}.cf-b>div,.cf-d>div{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .cf-c{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}.cf-c.sim{background:var(--ok-tint,#e3f1e8)}.cf-c.nao{background:var(--crit-tint)}.cf-c.duv{background:var(--warn-tint)}
  .cf-v{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin:10px 0}.cf-v img{width:100%;border-radius:8px}.cf-v figcaption{font-size:12px;color:var(--muted)}
  .cf-a{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.cf-edb{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px}.cf-aba{display:flex;gap:6px;align-items:center;font-size:13.5px}.cf-aba select{width:auto}
  .cf-ta{width:100%;font-family:inherit;font-size:14px;line-height:1.5;min-height:360px}.cf-edr{display:flex;gap:8px;align-items:center;margin-top:10px}
  @media (max-width:900px){ .cf-gr{grid-template-columns:minmax(0,1fr)} }`; document.head.appendChild(css);
  window.RHCafe={render,painel,_C:C,_grupos:grupos,_mesma:mesma,_pessoas:pessoas};
})();
