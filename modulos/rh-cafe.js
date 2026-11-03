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
  function est(c,d){ let F=C.doc[d]; if(F) return F; F=C.doc[d]={nv:{},emit:null,foto:null,carregando:true};
    c.P.db().doc('rh/dados/cafefolha/'+d).get().then(g=>{ const x=g&&g.exists?g.data():{}; F.nv=x.nv||{}; F.emit=x.emit||null; F.foto=x.foto||null; F.carregando=false; c.P.render(); }).catch(()=>{ F.carregando=false; c.P.render(); });
    return F; }
  async function salvar(c,d){ const F=C.doc[d]; try{ await c.P.db().doc('rh/dados/cafefolha/'+d).set({dia:d,nv:F.nv||{},emit:F.emit||null,foto:F.foto||null,em:new Date().toISOString()}); }catch(e){ c.P.toast('Não foi possível guardar: '+((e&&e.message)||e)); } }
  /* páginas: cada página começa com "Nome | Assinatura"; título de grupo não fica sozinho no pé da página */
  function paginas(c,d){ const F=est(c,d), G=grupos(linhas(c)), rows=[]; G.forEach(g=>{ if(g.g) rows.push({grupo:g.g}); g.ns.forEach(n=>rows.push({nome:n,cz:F.nv[n]||''})); });
    for(let i=0;i<4;i++) rows.push({nome:'',cz:''});
    const ps=[]; let pg=[{cab:true}]; rows.forEach((r,i)=>{ const resta=PAG-pg.length; if(resta<=0||(r.grupo&&resta<=1)){ ps.push(pg); pg=[{cab:true}]; } pg.push(r); }); if(pg.length>1) ps.push(pg);
    if(ps.length>4){ return ps.slice(0,4); } return ps; }
  function titulo(c,d){ const F=est(c,d), ns=nomes(linhas(c)); return 'CAFÉ - '+br(d)+' - '+(ns.length-ns.filter(n=>F.nv[n]).length); }
  function imprimir(c,d){ const FT=window.RHAlmFoto; if(!FT) return c.P.toast('Carregando… tente de novo em um instante.'); const F=est(c,d);
    if(!nomes(linhas(c)).length) return c.P.toast('Cadastre a lista do café primeiro (Editar a lista).');
    const w=window.open('','_blank'); if(!w) return c.P.toast('Libere as janelas (pop-up) para imprimir.');
    const nv=((F.emit&&F.emit.n)||0)+1, ver=nv%4, ps=paginas(c,d);
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>CAFÉ - ${br(d)}</title><style>${FT.CSS}</style></head><body>${FT.paginas(ps,d,ver,titulo(c,d),false,{cafe:true,pgBase:BASE})}</body></html>`); w.document.close();
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
  /* ---------- tela ---------- */
  function render(c){ C.ctx=c; const esc=c.esc, P=c.P; if(!C.dia) C.dia=hoje(); const d=C.dia, F=est(c,d), ls=linhas(c), G=grupos(ls), ns=nomes(ls);
    try{ if(window.RHAlmoco&&window.RHAlmoco.carregar&&c.almCtx) window.RHAlmoco.carregar(c.almCtx(),d.slice(0,7)); }catch(e){}
    const nvN=ns.filter(n=>F.nv[n]).length;
    const nav=`<span class="cf-nav"><button class="btn sec rh-sm" data-act="cf-dia" data-v="-1" aria-label="Dia anterior">‹</button><input class="txt" type="date" id="cf-dia" value="${d}"><button class="btn sec rh-sm" data-act="cf-dia" data-v="1" aria-label="Próximo dia">›</button>${d!==hoje()?'<button class="lnk" data-act="cf-hoje">hoje</button>':''}</span>`;
    const head=c.topo('Folha do café',`${dsem(d)}, ${br(d)} · ${ns.length} na lista${nvN?' · '+nvN+' não vieram':''} · <b>${ns.length-nvN}</b> para assinar`,nav+`<button class="btn sec" data-act="cf-ed">Editar a lista</button><button class="btn" data-act="cf-imp" ${ns.length?'':'disabled'}>${F.emit?'Imprimir de novo':'Imprimir folha'}</button>`);
    if(C.ed) return head+editor(c);
    if(!ns.length) return head+`<section class="card"><div class="empty"><b>Ainda não tem a lista do café</b><span>Cole os nomes ou importe a planilha do café (uma aba por dia; os títulos em MAIÚSCULAS viram os grupos).</span><span><button class="btn" data-act="cf-ed">Montar a lista</button></span></div></section>`;
    const emit=F.emit?`<div class="cf-em ${F.emit.mudou?'mud':''}">${F.emit.mudou?'<b>Marcação mudou depois de impressa</b> — imprima de novo.':'Impressa em '+esc(new Date(F.emit.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))+(F.emit.por?' por '+esc(F.emit.por):'')+'.'}</div>`:'';
    const lista=G.map(g=>`${g.g?`<div class="cf-g">${esc(g.g)}</div>`:''}${g.ns.map(n=>`<label class="cf-p${F.nv[n]?' nv':''}"><span>${esc(n)}</span><input type="checkbox" data-cf-nv="${esc(n)}" ${F.nv[n]?'checked':''}> <small>Não veio</small></label>`).join('')}`).join('');
    const prev=`<div class="cf-pv"><div class="cf-pvh"><b>Como vai sair</b><span>com as marcas pretas para conferir pela foto</span></div><table><thead><tr><th colspan="2">${esc(titulo(c,d))}</th></tr><tr class="hd"><th>Nome</th><th>Assinatura</th></tr></thead><tbody>${G.map(g=>`${g.g?`<tr class="gr"><td colspan="2">${esc(g.g)}</td></tr>`:''}${g.ns.map(n=>`<tr class="${F.nv[n]?'cz':''}"><td>${esc(n)}</td><td>${F.nv[n]?esc(F.nv[n]):''}</td></tr>`).join('')}`).join('')}</tbody></table></div>`;
    return head+`<div class="cf-gr"><section class="card cf-l"><h2>Quem não veio hoje?</h2><div class="sub" style="margin:0 0 8px">Marque antes de imprimir: sai em cinza com "Não veio" e o número do título desconta.</div>${emit}<div class="cf-ls">${lista}</div></section>
      <div class="cf-r">${foto(c,d)}<section class="card">${prev}</section></div></div>`; }
  function foto(c,d){ const esc=c.esc, F=est(c,d), R=ffE(d);
    const inp=l=>`<label class="btn ${l?'sec':''}">${l||'Tirar ou escolher a foto'}<input type="file" accept="image/*" multiple hidden data-cf-foto="1"></label>`;
    const cab=`<h2>Conferir pela foto da folha assinada</h2><div class="sub" style="margin:0 0 10px">Uma foto por folha, de frente, com as 4 marcas pretas aparecendo. O painel vê em quais linhas tem assinatura${faceCafe(d)?' e compara com quem passou no refeitório de manhã (Face ID)':''}.</div>`;
    if(!F.emit||!F.emit.vs) return `<section class="card cf-ff">${cab}<div class="cf-info">Imprima a folha por aqui primeiro: ela sai com as marcas que a foto precisa.</div></section>`;
    if(R.lendo) return `<section class="card cf-ff">${cab}<div class="cf-info">Lendo a foto…</div></section>`;
    const err=R.erros.length?`<div class="cf-err">${R.erros.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'';
    const a=ass(c,d), ns=Object.keys(a); if(!ns.length) return `<section class="card cf-ff">${cab}${err}${inp()}</section>`;
    const fc=faceCafe(d), passou=n=>{ if(!fc) return null; const xs=fc.filter(x=>mesma(n,x.n)); return xs.length?xs.some(x=>x.c):null; }; /* null = não está no Face ID do dia (terceiro, motorista…): não compara */
    const g={sim:[],nao:[],duv:[]}; ns.forEach(n=>{ if(g[a[n]]) g[a[n]].push(n); });
    const semFace=fc?g.sim.filter(n=>passou(n)===false):[], semAss=fc?g.nao.filter(n=>passou(n)===true):[];
    const chip=n=>`<button class="cf-c ${a[n]}" data-act="cf-tg" data-n="${esc(n)}" title="Tocar para trocar">${esc(n)}</button>`;
    const bl=(t,xs,s)=>xs.length?`<div class="cf-b"><b>${t} · ${xs.length}</b>${s?`<small>${s}</small>`:''}<div>${xs.map(chip).join('')}</div></div>`:'';
    const lidas=Object.keys(R.res).map(Number).sort(), tot=Object.keys(F.emit.vs[F.emit.ver]||{}).length;
    const pend=tot&&lidas.length&&lidas.length<tot?`<div class="cf-info">Falta a foto da ${Array.from({length:tot},(_,i)=>i).filter(i=>!R.res[i]).map(i=>'folha '+(i+1)).join(', ')}.</div>`:'';
    const salvo=F.foto&&!lidas.length&&!Object.keys(R.man).length?`<div class="cf-info">Conferida em ${esc(new Date(F.foto.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))}${F.foto.por?' por '+esc(F.foto.por):''}.${(F.foto.fotos||[]).map((u,i)=>u?` <a href="${esc(u)}" target="_blank" rel="noopener">Ver foto ${i+1}</a>`:'').join('')}</div>`:'';
    const vistas=lidas.map(p=>`<figure><img src="${R.res[p].vista}" alt="Foto da folha ${p+1}"><figcaption>Folha ${p+1}: verde = assinou · vermelho = em branco · laranja = conferir</figcaption></figure>`).join('');
    return `<section class="card cf-ff">${cab}${err}${salvo}${pend}<div class="cf-k"><span><b>${g.sim.length}</b> assinaram</span><span><b>${g.nao.length}</b> em branco</span>${g.duv.length?`<span class="w"><b>${g.duv.length}</b> para conferir</span>`:''}</div>
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
    if(a==='cf-ed'){ C.ed={txt:linhas(c).join('\n')}; c.P.render(); return; }
    if(a==='cf-edx'){ C.ed=null; C.abas=null; C.wb=null; c.P.render(); return; }
    if(a==='cf-eds'){ const ta=document.getElementById('cf-ta'); if(ta) C.ed.txt=ta.value; const ls=C.ed.txt.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
      if(!grupos(ls).some(g=>g.ns.length)) return c.P.toast('A lista está sem nomes.'); C.salv=true; c.P.render();
      try{ await c.P.db().doc('rh/config').set({cafe:{linhas:ls,em:new Date().toISOString(),por:c.eu?c.eu():''}},{merge:true}); if(c.R.cfg) c.R.cfg.cafe={linhas:ls}; C.ed=null; C.abas=null; C.wb=null; c.P.toast('Lista do café salva: '+nomes(ls).length+' nomes.'); }
      catch(e){ c.P.toast('Não foi possível salvar: '+((e&&e.message)||e)); } C.salv=false; c.P.render(); return; }
    if(a==='cf-tg'){ const n=b.dataset.n, cur=ass(c,d)[n]; ffE(d).man[n]=cur==='sim'?'nao':'sim'; c.P.render(); return; }
    if(a==='cf-ffsalva'){ b.disabled=true; await salvarFoto(c,d); return; } });
  document.addEventListener('change',ev=>{ const t=ev.target, c=C.ctx; if(!t||!c) return; const d=C.dia;
    if(t.id==='cf-dia'&&/^\d{4}-\d\d-\d\d$/.test(t.value)){ C.dia=t.value; c.P.render(); return; }
    if(t.dataset&&t.dataset.cfNv!=null){ const F=est(c,d); if(t.checked) F.nv[t.dataset.cfNv]='Não veio'; else delete F.nv[t.dataset.cfNv]; if(F.emit) F.emit.mudou=true; salvar(c,d); c.P.render(); return; }
    if(t.dataset&&t.dataset.cfFoto){ const fs=[...(t.files||[])]; t.value=''; if(fs.length) lerFotos(c,d,fs); return; }
    if(t.dataset&&t.dataset.cfXls){ const f=t.files&&t.files[0]; t.value=''; if(f) lerXls(c,f); return; }
    if(t.id==='cf-aba'&&C.wb){ C.aba=+t.value; C.ed.txt=abaLinhas(C.aba).join('\n'); c.P.render(); return; } });
  document.addEventListener('input',ev=>{ const t=ev.target; if(!t||t.id!=='cf-ta'||!C.ed) return; C.ed.txt=t.value; const G=grupos(t.value.split('\n')), el=document.getElementById('cf-edn'); if(el) el.textContent=G.filter(g=>g.g).length+' grupos · '+G.reduce((a,g)=>a+g.ns.length,0)+' nomes'; });
  const css=document.createElement('style'); css.textContent=`
  .cf-nav{display:inline-flex;gap:6px;align-items:center}.cf-nav input{width:auto;height:38px}
  .cf-gr{display:grid;grid-template-columns:minmax(280px,380px) minmax(0,1fr);gap:16px;align-items:start}.cf-gr .card{margin:0 0 16px}.cf-l h2,.cf-ff h2,.cf-ed h2{margin:0 0 4px;font-size:17px}
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
  window.RHCafe={render,_C:C,_grupos:grupos,_mesma:mesma};
})();
