/* Painel Colafix · 65-quadro-pessoas.js (27/10) — "Quadro de pessoas" do Marcelo (o quadro branco onde ele aloca
   os funcionários por linha/setor para decidir quem fica e quem sai).
   Visão do gestor › Pessoas › Quadro de pessoas (tela gxqd).
   - Colunas = linhas/setores (dá para criar, renomear, mudar de lugar e apagar). Começa com as linhas do painel + setores comuns.
   - Pessoas: escolhidas da lista do RH (presença do Face ID publicada pelo RH: cadastro ativo, sem CPF) ou digitadas.
   - Arrastar o nome de uma coluna para outra (ou para outra posição na mesma coluna); no celular, tocar no nome e escolher.
   - Cada pessoa: Fica (verde) · Em dúvida (âmbar) · Sai (vermelho), e uma observação curta (ex.: "Empilhadeira").
   - Imprimir/PDF: "Só a distribuição" (para o mural, sem as decisões) ou "Com as decisões".
   Dados: gxquadro/atual {cols:[{id,nome,ps:[{id,n,obs,st}]}], em, por, porNome} — coleção protegida no firestore.rules
   (só a dona e quem tem a Visão do gestor; publicar as regras). */
"use strict";
S.qd={dados:null,sub:false,sel:null,q:'',add:null,ed:null,salv:0,drag:null,rasc:''};
const QD_ST={fica:{t:'Fica',c:'ok'},duv:{t:'Em dúvida',c:'warn'},sai:{t:'Sai',c:'crit'}};
const QD_PADRAO=['Rejunte','Fixcol','Área líquida','Almoxarifado','Expedição','Argamassa geral','Premix','Cargas rejunte'];
function qdId(){ return Math.random().toString(36).slice(2,9); }
function qdPode(){ try{ return !!(S.acs&&S.acs.dono)||viewOk('gxqd'); }catch(e){ return false; } }
function qdIni(){ let ls=[]; try{ ls=linhasOrd().filter(l=>/^linha\s*\d/i.test(l)); }catch(e){} if(!ls.length) ls=['Linha 1','Linha 2','Linha 3'];
  const nomes=[...ls]; QD_PADRAO.forEach(n=>{ if(!nomes.some(x=>qdK(x)===qdK(n))) nomes.push(n); });
  return {cols:nomes.map(n=>({id:qdId(),nome:n,ps:[]}))}; }
function qdK(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }
function qdD(){ if(!S.qd.dados) S.qd.dados=qdIni(); return S.qd.dados; }
function qdAssina(){ if(S.qd.sub||!S.db||!qdPode()) return; S.qd.sub=true;
  inscrever('gxquadro',()=>S.db.collection('gxquadro').doc('atual'),snap=>{ const d=snap&&snap.exists?snap.data():null;
    if(d&&Array.isArray(d.cols)&&!(S.qd.salv&&Date.now()-S.qd.salv<2500)) S.qd.dados={cols:d.cols,em:d.em,porNome:d.porNome}; rerenderSeguro(); }); }
let _qdT=null;
function qdGrava(){ const D=qdD(); S.qd.dados=D; S.qd.salv=Date.now(); clearTimeout(_qdT);
  _qdT=setTimeout(async()=>{ try{ await S.db.collection('gxquadro').doc('atual').set({cols:D.cols,em:new Date().toISOString(),por:(S.user&&S.user.uid)||'',porNome:(typeof gxEu==='function'?gxEu():'')||''}); S.qd.salv=Date.now(); D.em=new Date().toISOString(); D.porNome=(typeof gxEu==='function'?gxEu():'')||''; const el=document.getElementById('qd-salvo'); if(el) el.textContent='Salvo agora'; }
    catch(e){ toast('Não deu para salvar o quadro: '+(e&&e.message||e)); } },500); }
function qdPessoasRH(){ const ds=((S.gxPres&&S.gxPres.docs)||[]).slice().sort((a,b)=>String(b.dia).localeCompare(String(a.dia))); const m=new Map();
  for(const d of ds){ (d.p||[]).concat(d.f||[]).forEach(p=>{ if(p&&p.n&&!m.has(qdK(p.n))) m.set(qdK(p.n),{n:p.n,s:p.s||'',e:p.e||''}); }); if(m.size>20) break; }
  return [...m.values()].sort((a,b)=>a.n.localeCompare(b.n,'pt-BR')); }
function qdOnde(n){ const k=qdK(n); for(const c of qdD().cols){ if(c.ps.some(p=>qdK(p.n)===k)) return c.nome; } return null; }
function qdTot(){ const t={n:0,fica:0,duv:0,sai:0,sem:0}; qdD().cols.forEach(c=>c.ps.forEach(p=>{ t.n++; if(p.st&&t[p.st]!=null) t[p.st]++; else t.sem++; })); return t; }
function qdCard(c,p,i){ const st=QD_ST[p.st];
  return `<div class="qd-p ${p.st?'st-'+p.st:''} ${S.qd.sel===p.id?'sel':''}" draggable="true" data-qdp="${esc(p.id)}" data-qdc="${esc(c.id)}">
    <span class="qd-n">${i+1}</span><button class="qd-nm" data-act="qd-sel" data-v="${esc(p.id)}" title="Mover, marcar ou anotar">${esc(p.n)}${p.obs?`<small>${esc(p.obs)}</small>`:''}</button>
    <span class="qd-sts">${Object.entries(QD_ST).map(([k,v])=>`<button class="qd-st ${v.c} ${p.st===k?'on':''}" data-act="qd-st" data-v="${esc(p.id)}" data-st="${k}" title="${v.t}" aria-label="${v.t}" aria-pressed="${p.st===k}">${k==='fica'?'✓':k==='sai'?'✕':'?'}</button>`).join('')}</span></div>`; }
function qdSelPainel(){ const id=S.qd.sel; if(!id) return ''; let col=null,p=null; qdD().cols.forEach(c=>c.ps.forEach(x=>{ if(x.id===id){ col=c; p=x; } })); if(!p){ S.qd.sel=null; return ''; }
  return `<div class="qd-sp card"><div class="qd-sph"><div><div class="eyebrow">${esc(col.nome)}</div><h3>${esc(p.n)}</h3></div><button class="btn sec" data-act="qd-fecha">Fechar</button></div>
    <label><span>Situação</span><div class="seg">${Object.entries(QD_ST).map(([k,v])=>`<button aria-pressed="${p.st===k}" data-act="qd-st" data-v="${esc(p.id)}" data-st="${k}">${v.t}</button>`).join('')}<button aria-pressed="${!p.st}" data-act="qd-st" data-v="${esc(p.id)}" data-st="">Sem marcar</button></div></label>
    <label><span>Observação</span><input class="txt" id="qd-obs" maxlength="60" placeholder="Ex.: Empilhadeira, Faturamento, Conferente" value="${esc(p.obs||'')}"></label>
    <label><span>Mover para</span><div class="qd-mv">${qdD().cols.map(c=>`<button class="btn sec ${c.id===col.id?'on':''}" data-act="qd-mv" data-v="${esc(c.id)}" ${c.id===col.id?'disabled':''}>${esc(c.nome)}</button>`).join('')}</div></label>
    <div class="qd-spa"><button class="lnk" data-act="qd-sobe">↑ Subir</button><button class="lnk" data-act="qd-desce">↓ Descer</button><span style="flex:1"></span><button class="lnk t-crit" data-act="qd-tira">${S.qd.tira===p.id?'Toque de novo para tirar do quadro':'Tirar do quadro'}</button></div></div>`; }
function qdAddPainel(){ const cid=S.qd.add; if(!cid) return ''; const col=qdD().cols.find(c=>c.id===cid); if(!col){ S.qd.add=null; return ''; }
  const rh=qdPessoasRH(), q=qdK(S.qd.q);
  const lis=rh.filter(p=>!q||q.split(' ').every(w=>qdK(p.n).split(' ').some(x=>x.startsWith(w)))).slice(0,80);
  return `<div class="qd-sp card"><div class="qd-sph"><div><div class="eyebrow">PÔR NA COLUNA</div><h3>${esc(col.nome)}</h3></div><button class="btn sec" data-act="qd-fecha">Fechar</button></div>
    <label><span>Procurar no RH ou digitar o nome</span><input class="txt" id="qd-q" autocomplete="off" placeholder="Nome" value="${esc(S.qd.q)}"></label>
    <div><button class="btn" id="qd-addtxt-b" data-act="qd-addtxt" ${String(S.qd.q||'').trim().length>1?'':'hidden'}>+ Pôr "<span>${esc(String(S.qd.q||'').trim())}</span>" do jeito que digitei</button></div>
    <div class="qd-rh">${rh.length?(lis.length?lis.map(p=>{ const on=qdOnde(p.n); return `<button class="qd-rp ${on?'ja':''}" data-act="qd-addrh" data-v="${esc(p.n)}"><b>${esc(p.n)}</b><small>${esc([p.s,p.e].filter(Boolean).join(' · '))}${on?` · já está em ${esc(on)}`:''}</small></button>`; }).join(''):'<div class="sub">Ninguém com esse nome no RH. Use o botão acima para pôr do jeito que digitou.</div>')
      :'<div class="sub">A lista do RH aparece quando o RH já publicou a presença do Face ID. Por enquanto, digite o nome.</div>'}</div></div>`; }
function vGxQuadro(){ qdAssina(); try{ if(typeof gxpAssina==='function') gxpAssina(); }catch(e){} const D=qdD(), t=qdTot();
  const k=(v,l,c)=>`<div class="qd-k ${c||''}"><b>${v}</b><span>${l}</span></div>`;
  const cols=D.cols.map((c,ci)=>{ const sai=c.ps.filter(p=>p.st==='sai').length, fica=c.ps.filter(p=>p.st==='fica').length;
    return `<section class="qd-c" data-qdcol="${esc(c.id)}"><header>${S.qd.ed===c.id?`<input class="txt qd-cn" id="qd-cn" maxlength="40" value="${esc(c.nome)}"><button class="btn" data-act="qd-cnok">OK</button>`
      :`<button class="qd-ct" data-act="qd-ced" data-v="${esc(c.id)}" title="Renomear">${esc(c.nome)}</button><span class="qd-cc">${c.ps.length}${sai?` · <i class="t-crit">${sai} sai</i>`:''}${fica?` · <i class="t-ok">${fica} fica</i>`:''}</span>`}</header>
      <div class="qd-ps" data-qdcol="${esc(c.id)}">${c.ps.map((p,i)=>qdCard(c,p,i)).join('')||'<div class="qd-vz">Arraste alguém para cá</div>'}</div>
      <footer><button class="lnk" data-act="qd-add" data-v="${esc(c.id)}">+ Pôr pessoa</button><span style="flex:1"></span>
        <button class="lnk" data-act="qd-cesq" data-v="${esc(c.id)}" ${ci===0?'disabled':''} title="Mudar a coluna para a esquerda" aria-label="Mudar a coluna para a esquerda">‹</button><button class="lnk" data-act="qd-cdir" data-v="${esc(c.id)}" ${ci===D.cols.length-1?'disabled':''} title="Mudar a coluna para a direita" aria-label="Mudar a coluna para a direita">›</button>
        <button class="lnk t-crit" data-act="qd-cx" data-v="${esc(c.id)}">${S.qd.cx===c.id?(c.ps.length?'Tem pessoas: tire antes':'Toque de novo'):'Apagar'}</button></footer></section>`; }).join('');
  const quando=D.em?`Salvo ${dm(D.em.slice(0,10))} às ${hora(D.em)}${D.porNome?' por '+esc(D.porNome):''}`:'Ainda não salvo';
  return `${banner()}${gxCab('VISÃO DO GESTOR','Quadro de pessoas',`<button class="btn sec" data-act="qd-imp" data-v="dist">Imprimir só a distribuição</button><button class="btn" data-act="qd-imp" data-v="dec">Imprimir com as decisões</button>`)}
    <div class="sub" style="margin:-6px 0 12px">Arraste os nomes entre as colunas, como no quadro branco. Marque quem fica (✓), quem está em dúvida (?) e quem sai (✕). Só você e a administradora veem este quadro. · <span id="qd-salvo">${quando}</span></div>
    <div class="qd-ks">${k(t.n,'no quadro')}${k(t.fica,'ficam','ok')}${k(t.duv,'em dúvida','warn')}${k(t.sai,'saem','crit')}${k(t.sem,'sem marcar')}<span style="flex:1"></span><button class="btn sec" data-act="qd-col">+ Nova coluna</button></div>
    ${qdSelPainel()}${qdAddPainel()}
    <div class="qd-g">${cols}</div>`; }
/* ---------- impressão (janela própria, A4 deitada) ---------- */
function qdImprimir(dec){ const D=qdD(), t=qdTot(), w=window.open('','_blank'); if(!w){ toast('O navegador bloqueou a janela de impressão. Libere pop-ups para o painel.'); return; }
  let logo=''; try{ logo=(document.querySelector('.brand img')||{}).src||''; }catch(e){}
  const mk=p=>!dec||!p.st?'':p.st==='fica'?'<b class="f">✓ fica</b>':p.st==='sai'?'<b class="s">✕ sai</b>':'<b class="d">? dúvida</b>';
  const box=c=>`<div class="b"><h2>${esc(c.nome)} <small>${c.ps.length}</small></h2><ol>${c.ps.map(p=>`<li class="${dec&&p.st==='sai'?'x':''}"><span>${esc(p.n)}${p.obs?` <i>– ${esc(p.obs)}</i>`:''}</span>${mk(p)}</li>`).join('')||'<li class="v">—</li>'}</ol></div>`;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Quadro de pessoas</title><style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font:11pt Arial,Helvetica,sans-serif;color:#143F54;margin:0}
    .t{display:flex;align-items:center;gap:14px;border-bottom:2px solid #143F54;padding-bottom:6px;margin-bottom:8px}.t img{height:34px}.t h1{font-size:17pt;margin:0}.t p{margin:2px 0 0;color:#5E6E77;font-size:9pt}
    .g{columns:4;column-gap:8mm}.b{break-inside:avoid;margin:0 0 6mm;border-top:3px solid #143F54;padding-top:3px}h2{font-size:12pt;margin:0 0 3px;text-transform:uppercase}h2 small{color:#5E6E77;font-weight:400}
    ol{margin:0;padding-left:20px}li{padding:2px 0;border-bottom:1px solid #E3E8EC;display:flex;justify-content:space-between;gap:6px}li i{color:#5E6E77;font-style:normal;font-size:9pt}li.v{list-style:none;color:#aaa}
    li.x span{text-decoration:line-through;color:#8a8a8a}b{font-size:8.5pt;white-space:nowrap}.f{color:#2F6E4F}.s{color:#B5473F}.d{color:#A86A16}
    .r{margin-top:4mm;font-size:9pt;color:#5E6E77}</style></head><body>
    <div class="t">${logo?`<img src="${logo}" alt="Colafix">`:''}<div><h1>Quadro de pessoas${dec?' · decisões':''}</h1><p>${t.n} pessoas · ${D.cols.length} setores${dec?` · ficam ${t.fica} · em dúvida ${t.duv} · saem ${t.sai}`:''} · ${new Date().toLocaleDateString('pt-BR')}</p></div></div>
    <div class="g">${D.cols.map(box).join('')}</div>${dec?'<div class="r">Documento interno da gestão.</div>':''}
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`); w.document.close(); }
/* ---------- ações ---------- */
function qdAcha(id){ for(const c of qdD().cols){ const i=c.ps.findIndex(p=>p.id===id); if(i>=0) return {c,i,p:c.ps[i]}; } return null; }
function qdMove(pid,cid,pos){ const D=qdD(), a=qdAcha(pid), to=D.cols.find(c=>c.id===cid); if(!a||!to) return; a.c.ps.splice(a.i,1); if(pos==null||pos>to.ps.length) pos=to.ps.length; to.ps.splice(pos,0,a.p); qdGrava(); }
function qdLeObs(){ const i=document.getElementById('qd-obs'); if(i&&S.qd.sel){ const a=qdAcha(S.qd.sel); if(a&&(a.p.obs||'')!==i.value.trim()){ a.p.obs=i.value.trim().slice(0,60); qdGrava(); } } }
function qdPor(n,cid){ const D=qdD(), col=D.cols.find(c=>c.id===cid); n=String(n||'').trim().replace(/\s+/g,' '); if(!col||!n) return;
  const ja=qdOnde(n); if(ja){ toast(n+' já está em '+ja+'. Arraste o nome para mudar de coluna.'); return; }
  col.ps.push({id:qdId(),n,obs:'',st:''}); S.qd.q=''; qdGrava(); toast(n+' entrou em '+col.nome); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-act^="qd-"]'); if(!b||S.view!=='gxqd') return; const a=b.dataset.act, v=b.dataset.v, D=qdD();
  if(a!=='qd-tira') S.qd.tira=null; if(a!=='qd-cx') S.qd.cx=null;
  if(a==='qd-sel'){ qdLeObs(); S.qd.sel=S.qd.sel===v?null:v; S.qd.add=null; render(); return; }
  if(a==='qd-fecha'){ qdLeObs(); S.qd.sel=null; S.qd.add=null; S.qd.q=''; render(); return; }
  if(a==='qd-st'){ const x=qdAcha(v); if(x){ const st=b.dataset.st||''; x.p.st=x.p.st===st&&b.closest('.qd-p')?'':st; qdGrava(); render(); } return; }
  if(a==='qd-mv'){ qdLeObs(); qdMove(S.qd.sel,v); render(); return; }
  if(a==='qd-sobe'||a==='qd-desce'){ const x=qdAcha(S.qd.sel); if(x){ const j=x.i+(a==='qd-sobe'?-1:1); if(j>=0&&j<x.c.ps.length){ x.c.ps.splice(x.i,1); x.c.ps.splice(j,0,x.p); qdGrava(); } render(); } return; }
  if(a==='qd-tira'){ const x=qdAcha(S.qd.sel); if(!x) return; if(S.qd.tira!==x.p.id){ S.qd.tira=x.p.id; render(); return; } x.c.ps.splice(x.i,1); S.qd.sel=null; S.qd.tira=null; qdGrava(); render(); return; }
  if(a==='qd-add'){ qdLeObs(); S.qd.add=v; S.qd.sel=null; S.qd.q=''; render(); setTimeout(()=>{ const i=document.getElementById('qd-q'); if(i) i.focus(); },50); return; }
  if(a==='qd-addrh'){ qdPor(v,S.qd.add); render(); return; }
  if(a==='qd-addtxt'){ const i=document.getElementById('qd-q'); qdPor(i?i.value:S.qd.q,S.qd.add); render(); setTimeout(()=>{ const j=document.getElementById('qd-q'); if(j) j.focus(); },50); return; }
  if(a==='qd-col'){ D.cols.push({id:qdId(),nome:'Nova coluna',ps:[]}); S.qd.ed=D.cols[D.cols.length-1].id; qdGrava(); render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-ced'){ S.qd.ed=v; render(); setTimeout(()=>{ const i=document.getElementById('qd-cn'); if(i){ i.focus(); i.select(); } },50); return; }
  if(a==='qd-cnok'){ const i=document.getElementById('qd-cn'), c=D.cols.find(x=>x.id===S.qd.ed); if(i&&c&&i.value.trim()){ c.nome=i.value.trim().slice(0,40); qdGrava(); } S.qd.ed=null; render(); return; }
  if(a==='qd-cesq'||a==='qd-cdir'){ const i=D.cols.findIndex(c=>c.id===v), j=i+(a==='qd-cesq'?-1:1); if(i>=0&&j>=0&&j<D.cols.length){ const [c]=D.cols.splice(i,1); D.cols.splice(j,0,c); qdGrava(); } render(); return; }
  if(a==='qd-cx'){ const c=D.cols.find(x=>x.id===v); if(!c) return; if(c.ps.length){ S.qd.cx=v; render(); return; } if(S.qd.cx!==v){ S.qd.cx=v; render(); return; } D.cols=D.cols.filter(x=>x.id!==v); S.qd.cx=null; qdGrava(); render(); return; }
  if(a==='qd-imp'){ qdImprimir(v==='dec'); return; }
});
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='qd-q'){ S.qd.q=e.target.value; const bt=document.getElementById('qd-addtxt-b'); if(bt){ const t=e.target.value.trim(); bt.hidden=t.length<2; bt.querySelector('span').textContent=t; } const box=document.querySelector('.qd-rh'); if(!box) return; const q=qdK(e.target.value);
  box.querySelectorAll('.qd-rp').forEach(x=>{ const n=qdK(x.dataset.v); x.style.display=!q||q.split(' ').every(w=>n.split(' ').some(y=>y.startsWith(w)))?'':'none'; }); } });
document.addEventListener('keydown',e=>{ if(S.view!=='gxqd') return; const id=e.target&&e.target.id;
  if(id==='qd-q'&&e.key==='Enter'){ e.preventDefault(); const vis=[...document.querySelectorAll('.qd-rp')].filter(x=>x.style.display!=='none'); if(vis.length===1) qdPor(vis[0].dataset.v,S.qd.add); else qdPor(e.target.value,S.qd.add); render(); setTimeout(()=>{ const j=document.getElementById('qd-q'); if(j) j.focus(); },50); }
  else if(id==='qd-cn'&&e.key==='Enter'){ e.preventDefault(); const b=document.querySelector('[data-act="qd-cnok"]'); if(b) b.click(); }
  else if(id==='qd-obs'&&e.key==='Enter'){ e.preventDefault(); qdLeObs(); render(); }
  else if(e.key==='Escape'&&(S.qd.sel||S.qd.add||S.qd.ed)){ qdLeObs(); S.qd.sel=null; S.qd.add=null; S.qd.ed=null; render(); } });
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='qd-obs') qdLeObs(); });
/* arrastar (computador) */
document.addEventListener('dragstart',e=>{ const p=e.target.closest&&e.target.closest('.qd-p'); if(!p) return; S.qd.drag=p.dataset.qdp; p.classList.add('drag'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',p.dataset.qdp); }catch(x){} });
document.addEventListener('dragend',()=>{ S.qd.drag=null; document.querySelectorAll('.qd-p.drag,.qd-ps.over').forEach(x=>x.classList.remove('drag','over')); document.querySelectorAll('.qd-ins').forEach(x=>x.remove()); });
function qdPos(lista,y){ const cs=[...lista.querySelectorAll('.qd-p:not(.drag)')]; for(let i=0;i<cs.length;i++){ const r=cs[i].getBoundingClientRect(); if(y<r.top+r.height/2) return i; } return cs.length; }
document.addEventListener('dragover',e=>{ if(!S.qd.drag) return; const l=e.target.closest&&e.target.closest('.qd-c'); if(!l) return; e.preventDefault(); const ps=l.querySelector('.qd-ps');
  document.querySelectorAll('.qd-ps.over').forEach(x=>{ if(x!==ps) x.classList.remove('over'); }); ps.classList.add('over');
  document.querySelectorAll('.qd-ins').forEach(x=>x.remove()); const i=qdPos(ps,e.clientY), cs=[...ps.querySelectorAll('.qd-p:not(.drag)')], ln=document.createElement('div'); ln.className='qd-ins';
  if(cs[i]) ps.insertBefore(ln,cs[i]); else ps.appendChild(ln); });
document.addEventListener('drop',e=>{ if(!S.qd.drag) return; const l=e.target.closest&&e.target.closest('.qd-c'); if(!l) return; e.preventDefault(); const ps=l.querySelector('.qd-ps'), pos=qdPos(ps,e.clientY), id=S.qd.drag;
  S.qd.drag=null; qdMove(id,ps.dataset.qdcol,pos); render(); });
/* ---------- registro ---------- */
Object.assign(VIEWS,{gxqd:{nome:'Quadro de pessoas',ic:'equipe',mob:'Quadro'}}); CRUMB.gxqd='Quadro de pessoas';
S.extViews=S.extViews||{}; S.extViews.gxqd=vGxQuadro;
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxqd')){ const i=M.views.indexOf('gxhe'); M.views.splice(i>=0?i+1:M.views.length,0,'gxqd'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxqd')){ const i=GXN_TELAS.indexOf('gxhe'); GXN_TELAS.splice(i>=0?i+1:GXN_TELAS.length,0,'gxqd'); }
try{ const g=GXG.find(x=>x.id==='g-pes'); if(g&&!g.tabs.some(t=>t[0]==='gxqd')){ const i=g.tabs.findIndex(t=>t[0]==='gxhe'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['gxqd','Quadro de pessoas']);
  const f=S.extViews.gxqd; S.extViews.gxqd=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas('gxqd')+h; }catch(e){ return h; } }; } }catch(e){}
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Quadro de pessoas (quem fica e quem sai)','quadro pessoas alocar fica sai cortes distribuição setores','gxqd',()=>go('gxqd')]); }catch(e){}
window.Painel=window.Painel||{}; window.Painel.quadro={dados:()=>qdD(),tot:qdTot};
document.head.insertAdjacentHTML('beforeend',`<style id="qd-css">
.qd-ks{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
.qd-k{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 14px;min-width:96px}.qd-k b{display:block;font-size:22px}.qd-k span{font-size:12px;color:var(--muted)}
.qd-k.ok b{color:var(--ok)}.qd-k.warn b{color:var(--warn)}.qd-k.crit b{color:var(--crit)}
.qd-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;align-items:start}
.qd-c{background:var(--surface);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;min-height:120px}
.qd-c header{display:flex;align-items:center;gap:6px;padding:10px 12px 6px;border-bottom:2px solid var(--teal-strong,#143F54)}
.qd-ct{background:none;border:0;padding:0;font:inherit;font-weight:700;font-size:15px;color:var(--ink,#143F54);text-transform:uppercase;cursor:pointer;text-align:left;flex:1}
.qd-cc{font-size:12px;color:var(--muted);white-space:nowrap}.qd-cc i{font-style:normal}.qd-cn{flex:1;min-width:0}
.qd-ps{padding:6px;display:flex;flex-direction:column;gap:4px;flex:1;min-height:52px;border-radius:8px;transition:background .15s}
.qd-ps.over{background:color-mix(in srgb,var(--teal) 10%,transparent)}
.qd-vz{color:var(--muted);font-size:12px;text-align:center;padding:12px 4px;border:1px dashed var(--line);border-radius:8px}
.qd-p{display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:8px;border:1px solid var(--line);background:var(--ground);cursor:grab;border-left:4px solid transparent}
.qd-p.drag{opacity:.4}.qd-p.sel{outline:2px solid var(--teal)}
.qd-p.st-fica{border-left-color:var(--ok)}.qd-p.st-duv{border-left-color:var(--warn)}.qd-p.st-sai{border-left-color:var(--crit)}
.qd-p.st-sai .qd-nm{text-decoration:line-through;color:var(--muted)}
.qd-n{font-size:12px;color:var(--muted);width:16px;text-align:right}
.qd-nm{flex:1;min-width:0;background:none;border:0;padding:2px 0;font:inherit;text-align:left;cursor:pointer;color:inherit;font-weight:500}
.qd-nm small{display:block;color:var(--muted);font-size:11px;font-weight:400}
.qd-sts{display:flex;gap:2px}.qd-st{width:24px;height:24px;border-radius:6px;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-size:12px;line-height:1;color:var(--muted);padding:0}
.qd-st.ok.on{background:var(--ok);border-color:var(--ok);color:#fff}.qd-st.warn.on{background:var(--warn);border-color:var(--warn);color:#fff}.qd-st.crit.on{background:var(--crit);border-color:var(--crit);color:#fff}
.qd-ins{height:3px;background:var(--teal);border-radius:2px}
.qd-c footer{display:flex;align-items:center;gap:8px;padding:6px 10px 8px;border-top:1px solid var(--line);font-size:13px}
.qd-sp{position:fixed;top:72px;right:16px;bottom:16px;width:min(400px,calc(100vw - 32px));z-index:60;display:flex;flex-direction:column;gap:12px;overflow:auto;box-shadow:0 12px 40px rgba(20,63,84,.22)}.qd-sph{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.qd-sph h3{margin:2px 0 0}
.qd-sp label>span{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}
.qd-mv{display:flex;flex-wrap:wrap;gap:6px}.qd-mv .on{opacity:.5}.qd-spa{display:flex;gap:14px;align-items:center}
.qd-rh{display:grid;gap:6px;overflow:auto;flex:1;align-content:start}
.qd-rp{text-align:left;background:var(--ground);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer;font:inherit;color:inherit}
.qd-rp small{display:block;color:var(--muted);font-size:11px}.qd-rp.ja{opacity:.55}
@media (max-width:700px){.qd-g{grid-template-columns:1fr}.qd-p{cursor:default}}
</style>`);
