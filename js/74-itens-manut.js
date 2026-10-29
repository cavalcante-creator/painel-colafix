/* Painel Colafix · 74-itens-manut.js (29/10) — Itens de manutenção (materiais para pedir compra).
   Pedido: "o Marcelo quer colocar os itens para o pessoal poder selecionar e não ter o perigo de pedirem errado sem
   descrição completa; alguns estão com a descrição incorreta ou repetidos: o Marcelo cria item novo para ser cadastrado
   no sistema ou marca que está incorreto e coloca um novo". Quem cadastra no Focco é a administradora.
   Tela gxitens (Visão do gestor › Manutenção › Itens; a administradora também abre):
     - "Importar lista do sistema": PDF do Focco RITE0250 "Relatório de Itens" (descrição + código NP/NE/TE…) ou Excel
       (colunas Código e Descrição). Junta pelo código: novo entra "No sistema"; quem já existe tem a descrição atualizada;
       item que estava "Para cadastrar" e aparece no sistema com a mesma descrição vira "No sistema" sozinho.
     - Abas: Todos · Para cadastrar · Descrição incompleta (1 palavra ou muito curta) · Mesma descrição (possíveis repetidos) · Fora de uso.
     - "+ Novo item": o que é + medida/modelo + marca + material/cor + unidade → descrição montada no padrão do sistema
       (MAIÚSCULAS, sem acento), mostra os parecidos que já existem. Fica "Para cadastrar no sistema".
     - "Está incorreto": descrição errada/incompleta → cria o item certo (Para cadastrar) e o antigo sai da lista de escolha;
       "É repetido" → aponta o item certo, o repetido sai da lista. "Desfazer" volta.
     - Administradora: "Cadastrei no sistema" com o código novo → No sistema; o antigo (se era correção) fica "Substituído".
       Aviso no sino da administradora: "N itens para cadastrar no sistema".
   Oficina › Pedir peça: o campo "O que é" sugere os itens (No sistema e Para cadastrar); item fora da lista pede
   confirmação ("Não está na lista") antes de mandar. Dados: config/manitens {itens:[{id,c,d,u,st,de,para,mot,obs,em,por,porNome,cadEm,cadPor}],imp}
   st: ok (no sistema) · cad (para cadastrar) · inc (incorreto) · rep (repetido) · sub (substituído). Regras: config/* (grava()). Prefixo `mi`. */
"use strict";
S.mi={d:null,sub:false,tab:'todos',q:'',lim:150,fm:null,inc:null,imp:null,cod:{},sel:null};
const MI_ST={ok:['No sistema','ok'],cad:['Para cadastrar','warn'],inc:['Incorreto','crit'],rep:['Repetido','crit'],sub:['Substituído','neu']};
const MI_UN=['UN','PC','PAR','JG','KIT','M','CM','KG','G','L','ML','CX','RL','GL','BD','FD','PCT','CJ'];
const miN=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
const miK=s=>miN(s).replace(/[^A-Z0-9]/g,'');
const miId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const miItens=()=>((S.mi.d&&S.mi.d.itens)||[]);
const miUsa=x=>x.st==='ok'||x.st==='cad';
const miCurta=x=>x.st==='ok'&&(String(x.d||'').trim().split(/\s+/).length<2||String(x.d||'').trim().length<10);
function miPode(){ try{ return !!(S.acs&&S.acs.dono)||viewOk('gxitens'); }catch(e){ return false; } }
const miDono=()=>!!(S.acs&&S.acs.dono);
function miAssina(){ if(S.mi.sub||!S.db) return; S.mi.sub=true;
  S.db.doc('config/manitens').onSnapshot(s=>{ S.mi.d=s.exists?(s.data()||{}):{itens:[]}; if(!Array.isArray(S.mi.d.itens)) S.mi.d.itens=[]; rerenderSeguro(); },e=>{ console.warn('[itens]',e); S.mi.d=S.mi.d||{itens:[]}; }); }
async function miGrava(muda,msg){ const ref=S.db.doc('config/manitens'); const g=await ref.get(); const d=g.exists?(g.data()||{}):{}; d.itens=Array.isArray(d.itens)?d.itens:[];
  muda(d); d.em=new Date().toISOString(); d.por=S.uid||null; await ref.set(d); S.mi.d=d; if(msg) toast(msg); render(); }
const miEu=()=>{ try{ return (typeof gxEu==='function'&&gxEu())||(S.nomes&&S.nomes[S.uid])||''; }catch(e){ return ''; } };
/* ---------- busca (todas as palavras, sem acento, código ou descrição) ---------- */
function miBusca(q,xs,lim){ const ws=miN(q).split(/\s+/).filter(Boolean); if(!ws.length) return xs.slice(0,lim||xs.length);
  const r=[]; for(const x of xs){ const h=miN(x.d+' '+(x.c||'')); if(ws.every(w=>h.includes(w))){ r.push(x); if(lim&&r.length>=lim) break; } } return r; }
function miParecidos(desc,fora){ const ws=miN(desc).split(/\s+/).filter(w=>w.length>1); if(ws.length<1) return [];
  return miItens().filter(x=>miUsa(x)&&x.id!==fora).map(x=>{ const h=miN(x.d); const n=ws.filter(w=>h.includes(w)).length; return {x,n}; }).filter(o=>o.n>=Math.min(2,ws.length)).sort((a,b)=>b.n-a.n).slice(0,6).map(o=>o.x); }
/* ---------- importar a lista do sistema (PDF RITE0250 ou Excel) ---------- */
const MI_CAB=/^(RITE0250|Relatório de Itens|Relatorio de Itens|Focco3i|Data:|Pág\.|Pag\.|Empresa\.|Pasta dos|Class\. do|Tipo do Item|Almoxarifado\.|Itens\.\.|Planejadores|Data do Cadastro|Descrição Técnica|Descricao Tecnica|Parâmetros|Parametros|Código do|Codigo do)/i;
function miLePdfLinhas(linhas){ const out=[]; let buf=[];
  linhas.forEach(l=>{ l=String(l||'').trim(); if(!l||MI_CAB.test(l)) return; const m=l.match(/^(.*?)\s*\b([A-Z]{2,3}\d{3,6})$/);
    if(m){ const d=buf.concat([m[1]]).join(' ').replace(/\s+/g,' ').trim(); buf=[]; if(d) out.push({c:m[2],d}); } else if(buf.length<3) buf.push(l); else buf=[l]; });
  return out; }
async function miLeArquivo(f){ const nome=f.name||'', buf=await f.arrayBuffer();
  if(/\.pdf$/i.test(nome)||f.type==='application/pdf'){ const pgs=await textoPaginasPdf(buf); return miLePdfLinhas(pgs.join('\n').split('\n')); }
  try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }catch(e){}
  if(!window.XLSX) throw new Error('Não consegui abrir a planilha. Confira a internet.');
  const wb=XLSX.read(buf,{type:'array'}), out=[];
  wb.SheetNames.forEach(sn=>{ const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:''}); let hc=-1,hd=-1,hu=-1,ini=0;
    for(let i=0;i<Math.min(rows.length,15);i++){ const r=rows[i].map(v=>miN(v)); const c=r.findIndex(v=>/^COD/.test(v)), d=r.findIndex(v=>/DESCR/.test(v)); if(c>=0&&d>=0){ hc=c; hd=d; hu=r.findIndex(v=>/^(UN|UNID|UNIDADE)/.test(v)); ini=i+1; break; } }
    if(hc<0) return; rows.slice(ini).forEach(r=>{ const c=String(r[hc]||'').trim(), d=String(r[hd]||'').replace(/\s+/g,' ').trim(); if(c&&d) out.push({c,d,u:hu>=0?String(r[hu]||'').trim().toUpperCase():''}); }); });
  return out; }
function miPrevia(lidos){ const porC=new Map(miItens().filter(x=>x.c).map(x=>[x.c,x])), cadK=new Map(miItens().filter(x=>x.st==='cad').map(x=>[miK(x.d),x]));
  const r={novos:[],muda:[],igual:0,cadOk:[],lidos:lidos.length}; const vistos=new Set();
  lidos.forEach(l=>{ if(vistos.has(l.c)) return; vistos.add(l.c); const x=porC.get(l.c);
    if(!x){ const pc=cadK.get(miK(l.d)); if(pc) r.cadOk.push({x:pc,c:l.c}); else r.novos.push(l); }
    else if(miN(x.d)!==miN(l.d)) r.muda.push({x,d:l.d}); else r.igual++; });
  return r; }
async function miImporta(){ const P=S.mi.imp; if(!P||!P.prev) return; const pv=P.prev, agora=new Date().toISOString(), eu=miEu();
  await miGrava(d=>{ const porId=new Map(d.itens.map(x=>[x.id,x]));
    pv.novos.forEach(l=>{ const x={id:miId(),c:l.c,d:l.d,st:'ok'}; if(l.u) x.u=l.u; d.itens.push(x); });
    pv.muda.forEach(m=>{ const x=porId.get(m.x.id); if(x){ x.d=m.d; x.atuEm=agora; } });
    pv.cadOk.forEach(m=>{ const x=porId.get(m.x.id); if(!x) return; x.st='ok'; x.c=m.c; x.cadEm=agora; x.cadPor='(lista do sistema)'; if(x.de){ const a=porId.get(x.de); if(a){ a.st='sub'; a.para=x.id; } } });
    d.imp={em:agora,por:eu,arq:P.arq||'',n:pv.lidos}; },'Lista importada: '+pv.novos.length+' novos, '+pv.muda.length+' com a descrição atualizada'+(pv.cadOk.length?', '+pv.cadOk.length+' já cadastrados no sistema':'')+'.');
  S.mi.imp=null; render(); }
/* ---------- descrição montada (padrão do sistema) ---------- */
function miMonta(F){ return miN([F.oq,F.med,F.marca,F.mat].map(v=>String(v||'').trim()).filter(Boolean).join(' ')).replace(/\s+/g,' ').trim(); }
/* ---------- tela ---------- */
function miGrupos(){ const g=new Map(); miItens().filter(x=>x.st==='ok').forEach(x=>{ const k=miK(x.d); if(!k) return; (g.get(k)||g.set(k,[]).get(k)).push(x); });
  return [...g.values()].filter(v=>v.length>1).sort((a,b)=>b.length-a.length); }
function vGxItens(){ miAssina(); const M=S.mi; if(!M.d) return `${gxCab('MANUTENÇÃO','Itens de manutenção')}<section class="card"><div class="empty">Carregando…</div></section>`;
  const xs=miItens(), nOk=xs.filter(x=>x.st==='ok').length, cad=xs.filter(x=>x.st==='cad'), curt=xs.filter(miCurta), fora=xs.filter(x=>x.st==='inc'||x.st==='rep'||x.st==='sub'), grp=miGrupos(), dono=miDono();
  const tabs=[['todos','Todos',xs.length],['cad','Para cadastrar',cad.length],['curta','Descrição incompleta',curt.length],['rep','Mesma descrição',grp.reduce((a,v)=>a+v.length,0)],['fora','Fora de uso',fora.length]];
  let lista=M.tab==='cad'?cad:M.tab==='curta'?curt:M.tab==='fora'?fora:M.tab==='rep'?grp.flat():xs.slice().sort((a,b)=>(a.st==='cad'?0:1)-(b.st==='cad'?0:1)||String(a.d).localeCompare(String(b.d),'pt-BR'));
  lista=miBusca(M.q,lista); const tot=lista.length; lista=lista.slice(0,M.lim);
  const lin=x=>{ const s=MI_ST[x.st]||MI_ST.ok, alvo=x.para?xs.find(y=>y.id===x.para):null, ant=x.de?xs.find(y=>y.id===x.de):null, ed=M.cod[x.id]!=null;
    return `<tr class="mi-${x.st}"><td class="num mi-c">${esc(x.c||'—')}</td><td><b>${esc(x.d)}</b>${x.u?` <small class="mi-u">${esc(x.u)}</small>`:''}
        ${ant?`<small>corrige ${esc(ant.c||'')} · “${esc(ant.d)}”</small>`:''}${alvo?`<small>${x.st==='rep'?'use':'trocado por'} ${esc(alvo.c||'(novo)')} · “${esc(alvo.d)}”</small>`:''}${x.mot&&x.st!=='ok'?`<small>${esc(x.mot)}</small>`:''}${x.obs?`<small>${esc(x.obs)}</small>`:''}
        ${x.st==='cad'?`<small>pedido por ${esc(x.porNome||'—')} · ${x.em?dm(hojeStr(new Date(x.em))):''}</small>`:''}</td>
      <td><span class="pill ${s[1]}">${s[0]}</span></td>
      <td class="mi-ac">${x.st==='ok'?`<button class="lnk" data-act="mi-inc" data-id="${esc(x.id)}">Está incorreto</button><button class="lnk" data-act="mi-rep" data-id="${esc(x.id)}">É repetido</button>`
        :x.st==='cad'?(dono?(ed?`<span class="mi-cod"><input class="txt" id="mi-cod-${esc(x.id)}" placeholder="Código no sistema" value="${esc(M.cod[x.id])}"><button class="btn mi-sm" data-act="mi-cadok" data-id="${esc(x.id)}">Salvar</button></span>`
            :`<button class="btn mi-sm" data-act="mi-caded" data-id="${esc(x.id)}">Cadastrei no sistema</button><button class="lnk" data-act="mi-copia" data-id="${esc(x.id)}">Copiar descrição</button>`):'<small>esperando a administradora cadastrar</small>')+`<button class="lnk mi-del" data-act="mi-tira" data-id="${esc(x.id)}">Tirar</button>`
        :(x.st==='inc'||x.st==='rep')?`<button class="lnk" data-act="mi-volta" data-id="${esc(x.id)}">Desfazer</button>`:''}</td></tr>`; };
  const grupos=M.tab==='rep'?(()=>{ const ids=new Set(lista.map(x=>x.id)); return grp.filter(v=>v.some(x=>ids.has(x.id))).slice(0,60).map(v=>`<tbody class="mi-g"><tr class="mi-gh"><td colspan="4">${v.length} itens com a descrição “${esc(v[0].d)}”${v[0].d.split(/\s+/).length<2?' — falta a medida/modelo':''}</td></tr>${v.map(lin).join('')}</tbody>`).join(''); })():'';
  return `${gxCab('MANUTENÇÃO','Itens de manutenção',`<button class="btn sec" data-act="mi-imp">${ic('folha',16,2)}Importar lista do sistema</button><button class="btn" data-act="mi-novo">${ic('mais',16,2.2)}Novo item</button>`)}
    <div class="sub mi-sub">A lista que o pessoal da manutenção usa para pedir peça. Item novo ou corrigido fica "Para cadastrar" até a administradora cadastrar no sistema.${M.d.imp?` Última lista do sistema: ${esc(dm(hojeStr(new Date(M.d.imp.em))))}${M.d.imp.por?' por '+esc(M.d.imp.por):''} (${M.d.imp.n} itens).`:''}</div>
    <div class="mi-kp"><div><span>No sistema</span><b>${nOk}</b></div><div class="${cad.length?'warn':''}"><span>Para cadastrar</span><b>${cad.length}</b></div><div class="${curt.length?'crit':''}"><span>Descrição incompleta</span><b>${curt.length}</b></div><div><span>Mesma descrição</span><b>${grp.reduce((a,v)=>a+v.length,0)}</b></div></div>
    ${!xs.length?`<section class="card mi-vz"><h2>Comece pela lista do sistema</h2><p>No Focco, tire o <b>Relatório de Itens (RITE0250)</b> da classificação <b>10.400.013 · Materiais de manutenção</b> e salve em PDF (ou exporte em Excel com as colunas Código e Descrição). Depois toque em <b>Importar lista do sistema</b>.</p><button class="btn" data-act="mi-imp">Importar lista do sistema</button></section>`:`
    <section class="card mi-l"><div class="mi-tb"><div class="seg" role="group" aria-label="Mostrar">${tabs.map(([k,t,n])=>`<button class="${M.tab===k?'on':''}" aria-pressed="${M.tab===k}" data-act="mi-tab" data-v="${k}">${t}<small class="num"> ${n}</small></button>`).join('')}</div>
      <label class="mi-bq">${ic('lupa',16,2)}<input class="txt" id="mi-q" type="search" placeholder="Buscar código ou descrição" value="${esc(M.q)}"></label></div>
      ${M.tab==='curta'?'<div class="mi-dica">Itens sem a medida ou o modelo na descrição: quem pede não sabe qual é. Toque em <b>Está incorreto</b> e escreva a descrição completa.</div>':M.tab==='rep'?'<div class="mi-dica">Itens no sistema com a mesma descrição. Se forem o mesmo item, marque <b>É repetido</b> no que sobra; se forem diferentes, falta a medida: <b>Está incorreto</b>.</div>':''}
      ${tot?`<div class="mi-tw"><table class="mi-t"><thead><tr><th>Código</th><th>Descrição</th><th>Situação</th><th></th></tr></thead>${M.tab==='rep'?grupos:`<tbody>${lista.map(lin).join('')}</tbody>`}</table></div>
        ${tot>M.lim?`<div class="mi-mais"><button class="btn sec" data-act="mi-mais">Mostrar mais (${tot-M.lim} restantes)</button></div>`:''}`:`<div class="empty">${M.q?'Nada encontrado.':M.tab==='cad'?'Nenhum item esperando cadastro.':'Nada aqui.'}</div>`}</section>`}
    ${M.fm?miForm():''}${M.inc?miIncForm():''}${M.imp?miImpForm():''}`; }
function miForm(){ const F=M_F(), d=miMonta(F), par=d.length>=3?miParecidos(d,F.de):[];
  const ant=F.de?miItens().find(x=>x.id===F.de):null;
  return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="mi-ft"><div class="card gx-mc mi-fm"><h2 id="mi-ft">${ant?'Descrição certa do item':'Novo item'}</h2>
    ${ant?`<div class="mi-old"><span>Está incorreto:</span> <b>${esc(ant.c)} · ${esc(ant.d)}</b></div>`:'<p class="mi-p">Descreva o item completo: quem pedir vai escolher por esta descrição.</p>'}
    <div class="mi-g2"><label class="gx-f">O que é *<input id="mi-oq" maxlength="40" value="${esc(F.oq)}" placeholder="Ex.: ROLAMENTO"></label>
      <label class="gx-f">Medida ou modelo *<input id="mi-med" maxlength="60" value="${esc(F.med)}" placeholder="Ex.: 6205 2RS"></label></div>
    <div class="mi-g3"><label class="gx-f">Marca <small>(opcional)</small><input id="mi-marca" maxlength="30" value="${esc(F.marca)}" placeholder="Ex.: SKF"></label>
      <label class="gx-f">Material ou cor <small>(opcional)</small><input id="mi-mat" maxlength="30" value="${esc(F.mat)}" placeholder="Ex.: INOX"></label>
      <label class="gx-f">Unidade<select id="mi-un">${MI_UN.map(u=>`<option ${F.u===u?'selected':''}>${u}</option>`).join('')}</select></label></div>
    <label class="gx-f">Onde usa <small>(opcional, não vai na descrição)</small><input id="mi-obs" maxlength="80" value="${esc(F.obs)}" placeholder="Ex.: motor do elevador de canecas da Linha 2"></label>
    <div class="mi-pv"><span>Vai ficar assim no sistema</span><b id="mi-pvd">${esc(d||'—')}</b><small id="mi-pvn">${d.length} letras${d.length>60?' · o sistema pode cortar depois de 60':''}</small></div>
    <div id="mi-par">${miParHtml(par)}</div>
    <div class="gx-ac"><button class="btn sec" data-act="mi-fx">Cancelar</button><button class="btn" data-act="mi-salvar">${ant?'Trocar pelo item certo':'Mandar para cadastrar'}</button></div></div></div>`; }
function miParHtml(par){ return par.length?`<div class="mi-par"><b>Já existe parecido — confira antes:</b>${par.map(x=>`<span><em>${esc(x.c||'novo')}</em> ${esc(x.d)}${x.st==='cad'?' <small>(para cadastrar)</small>':''}</span>`).join('')}</div>`:''; }
const M_F=()=>S.mi.fm;
function miIncForm(){ const I=S.mi.inc, x=miItens().find(y=>y.id===I.id); if(!x) return ''; const cand=I.q?miBusca(I.q,miItens().filter(y=>miUsa(y)&&y.id!==x.id),8):miParecidos(x.d,x.id);
  return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="mi-rt"><div class="card gx-mc mi-fm"><h2 id="mi-rt">É repetido de qual item?</h2>
    <div class="mi-old"><span>Repetido:</span> <b>${esc(x.c)} · ${esc(x.d)}</b></div><p class="mi-p">Escolha o item certo. O repetido sai da lista de escolha do pessoal.</p>
    <label class="gx-f">Buscar o item certo<input id="mi-rq" value="${esc(I.q||'')}" placeholder="Código ou descrição"></label>
    <div class="mi-cands">${cand.map(y=>`<button type="button" class="${I.para===y.id?'on':''}" data-act="mi-rpick" data-id="${esc(y.id)}"><em>${esc(y.c||'novo')}</em> ${esc(y.d)}</button>`).join('')||'<div class="empty">Busque pelo código ou pela descrição.</div>'}</div>
    <div class="gx-ac"><button class="btn sec" data-act="mi-rx">Cancelar</button><button class="btn" data-act="mi-rok" ${I.para?'':'disabled'}>Marcar como repetido</button></div></div></div>`; }
function miImpForm(){ const P=S.mi.imp;
  return `<div class="gx-modal" role="dialog" aria-modal="true" aria-labelledby="mi-it"><div class="card gx-mc mi-fm"><h2 id="mi-it">Importar a lista do sistema</h2>
    <p class="mi-p">PDF do <b>Relatório de Itens (RITE0250)</b> do Focco ou planilha Excel com as colunas <b>Código</b> e <b>Descrição</b>. Nada é apagado: o painel junta pelo código.</p>
    <label class="btn sec mi-file">${ic('folha',16,2)}${P.lendo?'Lendo…':'Escolher o arquivo'}<input type="file" id="mi-arq" accept=".pdf,.xlsx,.xls,.csv" hidden></label>${P.arq?` <small>${esc(P.arq)}</small>`:''}
    ${P.erro?`<div class="mi-dica crit">${esc(P.erro)}</div>`:''}
    ${P.prev?`<div class="mi-kp sm"><div><span>Lidos</span><b>${P.prev.lidos}</b></div><div class="ok"><span>Novos</span><b>${P.prev.novos.length}</b></div><div><span>Descrição mudou</span><b>${P.prev.muda.length}</b></div><div><span>Já cadastrados (eram "para cadastrar")</span><b>${P.prev.cadOk.length}</b></div></div>
      ${P.prev.lidos?'':'<div class="mi-dica crit">Não achei itens neste arquivo. Confira se é o Relatório de Itens com a descrição e o código.</div>'}
      ${P.prev.novos.length?`<div class="mi-amo"><small>Exemplos:</small>${P.prev.novos.slice(0,5).map(l=>`<span><em>${esc(l.c)}</em> ${esc(l.d)}</span>`).join('')}</div>`:''}`:''}
    <div class="gx-ac"><button class="btn sec" data-act="mi-ix">Cancelar</button><button class="btn" data-act="mi-iok" ${P.prev&&P.prev.lidos?'':'disabled'}>Importar</button></div></div></div>`; }
/* ---------- ações ---------- */
function miLeForm(){ const F=S.mi.fm; if(!F) return; const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  [['mi-oq','oq'],['mi-med','med'],['mi-marca','marca'],['mi-mat','mat'],['mi-un','u'],['mi-obs','obs']].forEach(([i,k])=>{ const x=v(i); if(x!=null) F[k]=x; }); }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.id) return;
  if(t.id==='mi-q'){ S.mi.q=t.value; S.mi.lim=150; clearTimeout(S.mi._t); S.mi._t=setTimeout(()=>{ render(); const i=document.getElementById('mi-q'); if(i){ i.focus(); const n=i.value.length; try{ i.setSelectionRange(n,n); }catch(e){} } },300); return; }
  if(t.id==='mi-rq'&&S.mi.inc){ S.mi.inc.q=t.value; clearTimeout(S.mi._t); S.mi._t=setTimeout(()=>{ render(); const i=document.getElementById('mi-rq'); if(i){ i.focus(); const n=i.value.length; try{ i.setSelectionRange(n,n); }catch(e){} } },300); return; }
  if(/^mi-(oq|med|marca|mat)$/.test(t.id)&&S.mi.fm){ miLeForm(); const d=miMonta(S.mi.fm), a=document.getElementById('mi-pvd'), n=document.getElementById('mi-pvn'), p=document.getElementById('mi-par');
    if(a) a.textContent=d||'—'; if(n) n.textContent=d.length+' letras'+(d.length>60?' · o sistema pode cortar depois de 60':''); if(p) p.innerHTML=d.length>=3?miParHtml(miParecidos(d,S.mi.fm.de)):''; }
  if(t.id&&t.id.startsWith('mi-cod-')) S.mi.cod[t.id.slice(7)]=t.value; });
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||t.id!=='mi-arq'||!S.mi.imp) return; const f=t.files&&t.files[0]; if(!f) return; const P=S.mi.imp; P.arq=f.name; P.lendo=true; P.erro=''; P.prev=null; render();
  try{ const lidos=await miLeArquivo(f); P.prev=miPrevia(lidos); }catch(e){ console.warn('[itens] importar',e); P.erro='Não consegui ler o arquivo: '+(e&&e.message||e); } P.lendo=false; render(); });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mi-"]'); if(!b||!miPode()) return; const a=b.dataset.act, M=S.mi, id=b.dataset.id, agora=new Date().toISOString(), eu=miEu();
  const x=id?miItens().find(y=>y.id===id):null;
  try{
  if(a==='mi-tab'){ M.tab=b.dataset.v; M.lim=150; render(); return; } if(a==='mi-mais'){ M.lim+=300; render(); return; }
  if(a==='mi-imp'){ M.imp={}; render(); return; } if(a==='mi-ix'){ M.imp=null; render(); return; } if(a==='mi-iok'){ b.disabled=true; await miImporta(); return; }
  if(a==='mi-novo'){ M.fm={oq:'',med:'',marca:'',mat:'',u:'UN',obs:''}; render(); setTimeout(()=>{ const i=document.getElementById('mi-oq'); i&&i.focus(); },50); return; }
  if(a==='mi-inc'&&x){ const w=String(x.d).split(/\s+/); M.fm={de:x.id,oq:w[0]||'',med:w.slice(1).join(' '),marca:'',mat:'',u:x.u||'UN',obs:''}; render(); setTimeout(()=>{ const i=document.getElementById('mi-med'); i&&i.focus(); },50); return; }
  if(a==='mi-fx'){ M.fm=null; render(); return; }
  if(a==='mi-salvar'&&M.fm){ miLeForm(); const F=M.fm, d=miMonta(F); if(!String(F.oq||'').trim()||!String(F.med||'').trim()) return toast('Preencha "O que é" e "Medida ou modelo": é isso que deixa a descrição completa.');
    if(miItens().some(y=>miUsa(y)&&y.id!==F.de&&miK(y.d)===miK(d))) return toast('Já existe um item com esta descrição. Busque por ele na lista.');
    const nid=miId(); await miGrava(D=>{ D.itens.push({id:nid,c:'',d,u:F.u||'UN',st:'cad',obs:String(F.obs||'').trim(),de:F.de||'',em:agora,por:S.uid||null,porNome:eu});
      if(F.de){ const o=D.itens.find(y=>y.id===F.de); if(o){ o.st='inc'; o.para=nid; o.mot='Descrição incompleta ou errada'; o.incEm=agora; o.incPor=eu; } } },F.de?'Item marcado como incorreto. O certo foi para a lista "Para cadastrar".':'Item mandado para cadastrar no sistema.'); M.fm=null; render(); return; }
  if(a==='mi-rep'&&x){ M.inc={id:x.id,q:'',para:''}; render(); return; } if(a==='mi-rx'){ M.inc=null; render(); return; }
  if(a==='mi-rpick'){ M.inc.para=id; render(); return; }
  if(a==='mi-rok'&&M.inc&&M.inc.para){ const I=M.inc; await miGrava(D=>{ const o=D.itens.find(y=>y.id===I.id); if(o){ o.st='rep'; o.para=I.para; o.mot='Repetido'; o.incEm=agora; o.incPor=eu; } },'Marcado como repetido: sai da lista de escolha.'); M.inc=null; render(); return; }
  if(a==='mi-volta'&&x){ await miGrava(D=>{ const o=D.itens.find(y=>y.id===x.id); if(!o) return; const novo=o.st==='inc'&&o.para?D.itens.find(y=>y.id===o.para&&y.st==='cad'):null;
      if(novo) D.itens=D.itens.filter(y=>y!==novo); o.st='ok'; delete o.para; delete o.mot; },'Voltou para a lista.'); return; }
  if(a==='mi-tira'&&x){ if(!confirm('Tirar "'+x.d+'" da lista para cadastrar?')) return; await miGrava(D=>{ D.itens=D.itens.filter(y=>y.id!==x.id); if(x.de){ const o=D.itens.find(y=>y.id===x.de); if(o&&o.st==='inc'){ o.st='ok'; delete o.para; delete o.mot; } } },'Tirado da lista.'); return; }
  if(a==='mi-caded'&&x&&miDono()){ M.cod[x.id]=''; render(); setTimeout(()=>{ const i=document.getElementById('mi-cod-'+x.id); i&&i.focus(); },40); return; }
  if(a==='mi-copia'&&x){ try{ await navigator.clipboard.writeText(x.d); toast('Descrição copiada. Cole no cadastro do sistema.'); }catch(e){ toast(x.d); } return; }
  if(a==='mi-cadok'&&x&&miDono()){ const c=String((document.getElementById('mi-cod-'+x.id)||{}).value||'').trim().toUpperCase(); if(!c) return toast('Digite o código que o sistema deu ao item.');
    if(miItens().some(y=>y.c===c&&y.id!==x.id&&y.st==='ok')) return toast('Já existe um item com o código '+c+'.');
    await miGrava(D=>{ const o=D.itens.find(y=>y.id===x.id); if(!o) return; o.st='ok'; o.c=c; o.cadEm=agora; o.cadPor=eu; if(o.de){ const v=D.itens.find(y=>y.id===o.de); if(v){ v.st='sub'; v.para=o.id; } } },'Cadastrado: '+c+' já aparece para o pessoal escolher.'); delete M.cod[x.id]; return; }
  }catch(e){ console.warn('[itens]',e); toast('Não foi possível salvar: '+(e&&e.message||e)); } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&(S.mi.fm||S.mi.inc||S.mi.imp)){ S.mi.fm=null; S.mi.inc=null; if(S.mi.imp&&!S.mi.imp.lendo) S.mi.imp=null; render(); }
  if(ev.key==='Enter'&&ev.target&&ev.target.id&&ev.target.id.startsWith('mi-cod-')){ const b=document.querySelector(`[data-act="mi-cadok"][data-id="${ev.target.id.slice(7)}"]`); if(b){ ev.preventDefault(); b.click(); } } });
/* ---------- registro: Visão do gestor › Manutenção › Itens (a administradora também vê) ---------- */
Object.assign(VIEWS,{gxitens:{nome:'Itens de manutenção',ic:'peca',mob:'Itens'}}); CRUMB.gxitens='Itens de manutenção';
S.extViews=S.extViews||{}; S.extViews.gxitens=function(){ let a=''; try{ if(typeof gxSolo==='function'&&gxSolo()) a=gxgAbas('gxitens'); }catch(e){} return a+vGxItens(); };
{ const M=MODS.find(m=>m.id==='gestor'); if(M&&!M.views.includes('gxitens')){ const i=M.views.indexOf('gxpec'); M.views.splice(i>=0?i+1:M.views.length,0,'gxitens'); } }
if(typeof GXN_TELAS!=='undefined'&&!GXN_TELAS.includes('gxitens')) GXN_TELAS.push('gxitens');
try{ const g=GXG.find(x=>x.id==='g-man'); if(g&&!g.tabs.some(t=>t[0]==='gxitens')){ const i=g.tabs.findIndex(t=>t[0]==='gxpec'); g.tabs.splice(i>=0?i+1:g.tabs.length,0,['gxitens','Itens']); } }catch(e){}
try{ if(typeof GXS_ACOES!=='undefined'&&Array.isArray(GXS_ACOES)) GXS_ACOES.push(['Itens de manutenção (lista para pedir peça)','itens materiais manutenção peça cadastro compra repetido incorreto','gxitens',()=>go('gxitens')]); }catch(e){}
/* aviso no sino da administradora: itens para cadastrar no sistema */
{ const _ta=tpAvisos; tpAvisos=function(){ const xs=_ta.apply(this,arguments); try{ if(miDono()){ if(!S.mi.sub) miAssina(); const n=miItens().filter(x=>x.st==='cad').length; if(n) xs.push({n,t:n>1?'Itens para cadastrar no sistema':'Item para cadastrar no sistema',s:'Pedidos do Marcelo: cadastrar no Focco e informar o código',acao:'itcad',c:'warn'}); } }catch(e){} return xs; }; }
{ const _ir=tpIr; tpIr=function(acao){ if(acao==='itcad'){ S.tp.pop=null; try{ tpFechaPop(); }catch(e){} S.mi.tab='cad'; go('gxitens'); return; } return _ir.apply(this,arguments); }; }
/* ---------- oficina › Pedir peça: escolher da lista ---------- */
function miOpc(x){ return x.d+(x.c?' · '+x.c:' · aguardando cadastro'); }
function miAchaTxt(t){ t=String(t||'').trim(); if(!t) return null; const m=t.match(/·\s*([A-Z]{2,3}\d{3,6})\s*$/); const xs=miItens();
  if(m){ const x=xs.find(y=>y.c===m[1]&&miUsa(y)); if(x) return x; } const k=miK(t.replace(/·\s*aguardando cadastro\s*$/,'')); return xs.find(y=>miUsa(y)&&miK(y.d)===k)||null; }
function miDl(q){ const xs=miItens().filter(miUsa); return miBusca(q,xs,40).map(x=>`<option value="${esc(miOpc(x))}"></option>`).join(''); }
if(typeof vOfPeca==='function'){ const _vp=vOfPeca; vOfPeca=function(){ let h=_vp.apply(this,arguments); try{ miAssina(); if(!miItens().length) return h; const P=S.of&&S.of.peca, its=(P&&P.itens)||[]; let pend=0;
    its.forEach((it,i)=>{ const s=i?String(i):'', t=String(it.t||'').trim(), x=miAchaTxt(t), id='of-pt'+s;
      h=h.replace(`id="${id}" class="of-in"`,`id="${id}" class="of-in" list="mi-dl${s}"`);
      const aviso=!t?'':x?`<div class="mi-of ok">✓ ${x.c?'Item do sistema '+esc(x.c):'Item novo, aguardando cadastro'}${x.u?' · '+esc(x.u):''}</div>`:it.miFora?`<div class="mi-of fora">Fora da lista — o Marcelo vai conferir a descrição. <button class="lnk" data-act="mi-ofdesf" data-v="${i}">Escolher da lista</button></div>`
        :`<div class="mi-of warn">Não achei na lista. Escolha uma das sugestões ou <button class="lnk" data-act="mi-offora" data-v="${i}">não está na lista</button></div>`;
      if(t&&!x&&!it.miFora) pend++;
      const k=`<label class="of-lb ofp-t" for="${id}">`; const j=h.indexOf(k); if(j>=0){ const e=h.indexOf('</label>',j); if(e>=0) h=h.slice(0,e+8)+`<datalist id="mi-dl${s}">${miDl(t)}</datalist>`+aviso+h.slice(e+8); } });
    if(pend) h=h.replace(/(<button[^>]*data-act="of-peca-ok")/,'$1 disabled title="Escolha os itens da lista"');
    return h; }catch(e){ console.warn('[itens] pedir peça',e); return h; } }; }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t||!t.id||!/^of-pt\d*$/.test(t.id)) return; miAssina(); if(!miItens().length) return; const s=t.id.slice(5); let dl=document.getElementById('mi-dl'+s);
  if(!dl){ dl=document.createElement('datalist'); dl.id='mi-dl'+s; t.insertAdjacentElement('afterend',dl); } if(t.getAttribute('list')!==dl.id) t.setAttribute('list',dl.id); dl.innerHTML=miDl(t.value); });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.id||!/^of-pt\d*$/.test(t.id)||!miItens().length) return; const P=S.of&&S.of.peca; if(!P||!P.itens) return; const i=+(t.id.slice(5)||0), it=P.itens[i]; if(!it) return;
  it.t=t.value; it.miFora=false; const x=miAchaTxt(t.value); if(x&&x.u){ const un=String(x.u).toLowerCase().replace('pc','pç').replace('un','un'); if(typeof PPC_UN!=='undefined'&&PPC_UN.includes(un)&&!it.un) it.un=un; } setTimeout(()=>{ try{ render(); }catch(e){} },0); });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="mi-offora"],[data-act="mi-ofdesf"]'); if(!b) return; ev.preventDefault(); ev.stopPropagation(); const P=S.of&&S.of.peca; if(!P||!P.itens) return; try{ ppcLe(); }catch(e){}
  const it=P.itens[+b.dataset.v]; if(!it) return; if(b.dataset.act==='mi-offora'){ it.miFora=true; } else { it.miFora=false; it.t=''; } render(); },true);
document.head.insertAdjacentHTML('beforeend',`<style id="mi-css">
.mi-sub{margin:-6px 0 14px}.mi-kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.mi-kp>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 16px;display:flex;flex-direction:column}
.mi-kp span{font-size:11.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}.mi-kp b{font-size:24px}.mi-kp .warn{box-shadow:inset 4px 0 0 var(--warn)}.mi-kp .crit{box-shadow:inset 4px 0 0 var(--crit)}.mi-kp .ok b{color:var(--ok)}
.mi-kp.sm{margin:12px 0}.mi-kp.sm b{font-size:20px}@media (max-width:760px){.mi-kp{grid-template-columns:1fr 1fr}}
.mi-tb{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}.mi-tb .seg{margin:0!important;flex-wrap:wrap}
.mi-bq{position:relative;display:flex;align-items:center;flex:0 1 320px;min-width:220px}.mi-bq svg{position:absolute;left:12px;color:var(--muted)}.mi-bq input{width:100%;padding-left:36px;height:40px}
.mi-dica{background:var(--ground);border-radius:10px;padding:8px 12px;font-size:13.5px;margin-bottom:10px}.mi-dica.crit{background:#F8E1DE;color:#7A2A20}
.mi-tw{overflow-x:auto}.mi-t{width:100%;border-collapse:collapse;font-size:14px}.mi-t th{text-align:left;font-size:12px;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}
.mi-t td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.mi-t td small{display:block;color:var(--muted);font-size:12px}.mi-c{white-space:nowrap;font-weight:600}.mi-u{display:inline!important;font-size:11px!important;background:var(--ground);border-radius:5px;padding:0 5px}
.mi-t tr.mi-inc td,.mi-t tr.mi-rep td,.mi-t tr.mi-sub td{opacity:.65}.mi-t tr.mi-inc b,.mi-t tr.mi-rep b{text-decoration:line-through}
.mi-ac{white-space:nowrap;text-align:right}.mi-ac .lnk{margin-left:12px;padding:0;font-size:13px}.mi-del{color:var(--crit-ink,var(--crit))!important}.mi-sm{height:32px;padding:0 12px;font-size:13px}
.mi-cod{display:inline-flex;gap:6px}.mi-cod input{width:130px;height:32px}.mi-gh td{background:var(--ground);font-weight:700;font-size:13px}.mi-mais{display:flex;justify-content:center;margin-top:12px}
.mi-vz h2{margin:0 0 6px}.mi-vz p{margin:0 0 12px;max-width:720px}
.mi-fm{max-width:640px;display:flex;flex-direction:column;gap:12px}.mi-fm h2{margin:0}.mi-p{margin:0;color:var(--muted);font-size:14px}.mi-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mi-g3{display:grid;grid-template-columns:1fr 1fr 110px;gap:10px}
@media (max-width:640px){.mi-g2,.mi-g3{grid-template-columns:1fr}}
.mi-old{background:#F8E1DE;color:#7A2A20;border-radius:10px;padding:8px 12px;font-size:14px}.mi-pv{background:var(--ground);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}.mi-pv span{font-size:11.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em}.mi-pv b{font-size:17px;letter-spacing:.02em}.mi-pv small{color:var(--muted)}
.mi-par{border:1px solid var(--warn);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:3px;font-size:13.5px}.mi-par em,.mi-cands em,.mi-amo em{font-style:normal;font-weight:700;margin-right:6px}
.mi-cands{display:flex;flex-direction:column;gap:4px;max-height:260px;overflow:auto}.mi-cands button{text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:7px 10px;font:inherit;cursor:pointer;color:inherit}.mi-cands button.on{border-color:var(--teal-strong);box-shadow:inset 3px 0 0 var(--teal-strong)}
.mi-file{display:inline-flex;gap:6px;align-items:center;cursor:pointer}.mi-amo{display:flex;flex-direction:column;gap:2px;font-size:13px;background:var(--ground);border-radius:10px;padding:8px 12px}
.mi-of{font-size:13px;margin-top:4px;font-weight:600}.mi-of.ok{color:var(--ok,#3C8A63)}.mi-of.warn{color:var(--warn-ink,#8A6A1F)}.mi-of.fora{color:var(--crit-ink,#B5473F)}.mi-of .lnk{padding:0;font-size:13px}
</style>`);
window.Painel=window.Painel||{}; window.Painel.itens={lePdfLinhas:miLePdfLinhas,previa:miPrevia,importaLidos:async(l,arq)=>{ S.mi.imp={arq:arq||"teste",prev:miPrevia(l)}; await miImporta(); },itens:miItens};
/* ===FIM ITENS=== */
