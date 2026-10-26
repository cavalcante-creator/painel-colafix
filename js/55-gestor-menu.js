/* Painel Colafix · 55-gestor-menu.js (26/10) — menu do Marcelo em 7 itens + busca na lateral (pedido de 26/10).
   1) Telas do mesmo assunto viram um item só, com abas no alto da tela (nenhuma tela sai):
      Início · Produção (Agora · Paradas · Relatórios) · Manutenção (Chamados · Pedidos de peça · Preventivas) ·
      Pessoas (Quem está hoje · Hora extra · Segurança) · Plano de ação · TVs da fábrica · Cadastros (Motivos e equipes · Turnos).
      Na lateral, o grupo aberto mostra as suas telas embaixo. Contadores somam as telas do grupo.
   2) Busca no alto da lateral ("O que você precisa?"): vazia, mostra o que está pendente (Precisa de você);
      digitando, acha telas (com outras palavras: "compras", "face id", "almoço"…), ações ("nova tarefa", "novo pedido de peça",
      "autorizar hora extra"…), chamados abertos (nº ou texto), pedidos de peça, ações do plano e pessoas de hoje. ↑ ↓ e Enter.
   Só para o login do gestor (gxSolo). */
"use strict";
const GXG=[
  {id:'gxinicio'},
  {id:'g-prod',nome:'Produção',ic:'grafico',tabs:[['gxprod','Agora'],['gxpar','Paradas'],['gxdia','Relatórios']]},
  {id:'g-man',nome:'Manutenção',ic:'chave',tabs:[['gxch','Chamados'],['gxpec','Pedidos de peça'],['gxcal','Preventivas']]},
  {id:'g-pes',nome:'Pessoas',ic:'equipe',tabs:[['gxpres','Quem está hoje'],['gxhe','Hora extra'],['gxseg','Segurança']]},
  {id:'gxacoes'},
  {id:'gestao'},
  {id:'g-cad',nome:'Cadastros',ic:'ajuste',tabs:[['gxcad','Motivos e equipes'],['gxturnos','Turnos']]}];
const GXG_VER={gxmes:'gxdia'};
function gxgVok(v){ try{ return !!VIEWS[v]&&viewOk(v); }catch(e){ return false; } }
function gxgDe(v){ v=GXG_VER[v]||v; return GXG.find(g=>g.tabs?g.tabs.some(t=>t[0]===v):g.id===v)||null; }
function gxgTabs(g){ return (g.tabs||[]).filter(t=>gxgVok(t[0])); }
function gxgBtn(g,B,cur){ const curV=GXG_VER[S.view]||S.view;
  if(!g.tabs){ if(!gxgVok(g.id)) return ''; const nome=g.id==='gestao'?'TVs da fábrica':(GXN_ROT[g.id]||VIEWS[g.id].nome);
    return `<button class="navbtn gxn-nb" data-go="${g.id}" ${curV===g.id?'aria-current="page"':''}>${ic(VIEWS[g.id].ic,18)}<span>${esc(nome)}</span>${B[g.id]?`<em class="gxn-bd">${B[g.id]}</em>`:''}</button>`; }
  const ts=gxgTabs(g); if(!ts.length) return ''; const aberto=ts.some(t=>t[0]===curV), n=ts.reduce((a,t)=>a+(+B[t[0]]||0),0);
  return `<button class="navbtn gxn-nb gxg-gr" data-go="${ts[0][0]}" ${aberto?'data-aberto="1"':''} ${aberto&&curV===ts[0][0]?'aria-current="page"':''}>${ic(g.ic,18)}<span>${esc(g.nome)}</span>${n&&!aberto?`<em class="gxn-bd">${n}</em>`:''}</button>`
   +(aberto?`<div class="gxg-sub">${ts.map(([v,t])=>`<button class="navbtn gxg-si" data-go="${v}" ${curV===v?'aria-current="page"':''}><span>${esc(t)}</span>${B[v]?`<em class="gxn-bd">${B[v]}</em>`:''}</button>`).join('')}</div>`:''); }
gxnNav=function(){ const on=gxSolo(); document.body.classList.toggle('gx-solo',on); document.body.classList.toggle('gx-mod',on&&S.mod==='gestor'); if(!on){ const w=$('#gxs'); if(w) w.remove(); return; }
  const nl=$('#navlist'); if(!nl) return; const lb=nl.previousElementSibling; if(lb&&lb.classList.contains('modulo')) lb.textContent='VISÃO DO GESTOR';
  gxsMonta(nl); let B={}; try{ B=gxnBadges(); }catch(e){}
  nl.innerHTML=GXG.map(g=>gxgBtn(g,B)).join('');
  if(S.mod==='gestor'||S.view==='modulos'){ const bn=$('#bottomnav'); if(bn){ const curV=GXN_VER_B(); const it=[['gxinicio','grid','Início'],['gxprod','grafico','Produção'],['gxch','chave','Manutenção'],['gxpres','equipe','Pessoas'],['modulos','grid','Mais']].filter(x=>x[0]==='modulos'||gxgVok(x[0]));
    bn.style.gridTemplateColumns=`repeat(${it.length},minmax(0,1fr))`; bn.innerHTML=it.map(([v,i,t])=>`<button data-go="${v}" ${curV===v?'aria-current="page"':''}>${ic(i,22)}${t}</button>`).join(''); } } };
function GXN_VER_B(){ const g=gxgDe(S.view); if(!g) return S.view; return g.tabs?(gxgTabs(g)[0]||[''])[0]:g.id; }
/* abas no alto das telas de um grupo */
function gxgAbas(v){ const g=gxgDe(v); if(!g||!g.tabs) return ''; const ts=gxgTabs(g); if(ts.length<2) return ''; let B={}; try{ B=gxnBadges(); }catch(e){}
  const cur=GXG_VER[v]||v;
  return `<nav class="gxg-tabs" aria-label="${esc(g.nome)}"><span class="gxg-tt">${ic(g.ic,16)}${esc(g.nome)}</span>${ts.map(([x,t])=>`<button class="gxg-tb" data-go="${x}" ${x===cur?'aria-current="page"':''}>${esc(t)}${B[x]?`<em>${B[x]}</em>`:''}</button>`).join('')}</nav>`; }
GXG.forEach(g=>(g.tabs||[]).concat(g.tabs&&g.tabs.some(t=>t[0]==='gxdia')?[['gxmes']]:[]).forEach(([v])=>{ const f=S.extViews&&S.extViews[v]; if(typeof f!=='function') return;
  S.extViews[v]=function(){ const h=f.apply(this,arguments); try{ if(!gxSolo()) return h; return gxgAbas(v)+h; }catch(e){ return h; } }; }));
/* "Mais" no celular */
gxnModulos=function(){ return `<div class="head"><div><div class="eyebrow">VISÃO DO GESTOR</div><h1>Tudo o que você acompanha</h1></div></div>
  ${GXG.map(g=>{ if(!g.tabs){ if(!gxgVok(g.id)) return ''; return `<section class="card gxg-mc"><button class="gxn-mb" data-go="${g.id}">${ic(VIEWS[g.id].ic,22)}<span>${esc(g.id==='gestao'?'TVs da fábrica':VIEWS[g.id].nome)}</span></button></section>`; }
    const ts=gxgTabs(g); if(!ts.length) return ''; return `<section class="card gxg-mc"><h2 class="gxn-h2">${esc(g.nome)}</h2><div class="gxn-mg">${ts.map(([v,t])=>`<button class="gxn-mb" data-go="${v}">${ic(VIEWS[v].ic,22)}<span>${esc(t)}</span></button>`).join('')}</div></section>`; }).join('')}`; };

/* ---------------- busca na lateral ---------------- */
S.gxs=S.gxs||{q:'',sel:0,ab:false};
const gxsN=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const GXS_TELAS=[
  ['gxinicio','Início','resumo do dia hoje precisa de você pendências'],
  ['gxprod','Produção agora','linhas ordens rancho silos atrasadas programação'],
  ['gxpar','Paradas','máquina parada pareto causa motivo linha parada'],
  ['gxdia','Relatório do dia','pdf e-mail toneladas meta disponibilidade relatório'],
  ['gxmes','Relatório do mês','mensal pdf mês'],
  ['gxch','Chamados e tarefas','manutenção os conserto técnico tarefa conferir'],
  ['gxpec','Pedidos de peça','compras comprar peça material oficina orçamento'],
  ['gxcal','Preventivas','calendário plano preventivo roteiros checklist manutenção programada'],
  ['gxpres','Quem está na empresa','presença face id faltas atrasos chegou almoço pessoas hoje'],
  ['gxhe','Hora extra','autorizar hora extra horas'],
  ['gxseg','Segurança','acidente epi ocorrência desvio inspeção segurança do dia'],
  ['gxacoes','Plano de ação','ações tarefas pendentes prazo'],
  ['gxcad','Cadastros','motivos de parada equipes de manutenção máquinas'],
  ['gxturnos','Turnos','horário expediente almoço turno escala'],
  ['gestao','TVs da fábrica','tv telas monitor painel']];
const GXS_ACOES=[
  ['Nova tarefa para a manutenção','chamado abrir os conserto pedir manutenção','gxch',()=>tpAcao('gx-os')],
  ['Novo pedido de peça','comprar peça compras material','gxpec',()=>{ go('gxpec'); setTimeout(()=>{ try{ ppeAbre(null); }catch(e){} },60); }],
  ['Mandar pedidos de peça para o compras','compras pdf whatsapp','gxpec',()=>{ S.gpc.f='abertos'; go('gxpec'); }],
  ['Nova ação no plano','plano de ação tarefa','gxacoes',()=>tpAcao('gx-acao')],
  ['Autorizar hora extra','hora extra horas','gxhe',()=>{ go('gxhe'); setTimeout(()=>{ const e=document.getElementById('he-q')||document.getElementById('he-mot'); e&&e.focus(); },80); }],
  ['Preencher a segurança de hoje','segurança epi acidente','gxseg',()=>tpAcao('gx-seg')],
  ['Programar preventiva','preventiva agenda planejar dia','gxcal',()=>tpAcao('gx-prev')],
  ['Baixar o relatório do dia (PDF)','pdf relatório imprimir','gxdia',()=>tpAcao('gx-pdf')],
  ['Novo turno','turno horário','gxturnos',()=>{ go('gxturnos'); setTimeout(()=>{ const b=document.querySelector('[data-act="gx-t-novo"]'); b&&b.click(); },80); }]];
function gxsItens(q){ const r=[], ws=gxsN(q).trim().split(/\s+/).filter(Boolean), bate=t=>{ const pal=gxsN(t).split(/[^a-z0-9]+/).filter(Boolean); return ws.every(w=>pal.some(x=>x.startsWith(w)||(/\d/.test(w)&&x.includes(w)))); };
  if(!ws.length){ let al=[]; try{ al=gxAlertas(); }catch(e){} al.slice(0,8).forEach(a=>r.push({g:'Precisa de você',t:a.t,s:a.d||'',c:a.c,run:()=>tpIr(a.n?'gxch:'+a.n:'gx:'+(a.go||'gxinicio'))}));
    if(!r.length) r.push({g:'Precisa de você',t:'Tudo em ordem agora',s:'Nada fora do normal.',run:()=>go('gxinicio')}); return r; }
  GXS_ACOES.forEach(([t,k,v,f])=>{ if(gxgVok(v)&&bate(t+' '+k)) r.push({g:'Fazer',t,s:'',run:f}); });
  GXS_TELAS.forEach(([v,t,k])=>{ if(gxgVok(v==='gxmes'?'gxdia':v)&&bate(t+' '+k)) { const g=gxgDe(v); r.push({g:'Telas',t,s:g&&g.nome?g.nome:'',run:()=>go(v)}); } });
  try{ const n=(q.match(/\d+/)||[])[0]; (S.chamados||[]).filter(c=>!manFechada(c)&&c.status!=='Cancelada'&&(n&&String(c.numero)===String(+n)||bate(['os',manNum(c.numero),c.linha,c.local,c.defeito,c.equip,c.paraTec,c.exec&&c.exec.tecnico].join(' ')))).slice(0,6)
    .forEach(c=>r.push({g:'Chamados abertos',t:'OS '+manNum(c.numero)+' · '+(c.linha||''),s:String(c.defeito||'').slice(0,70),run:()=>tpIr('gxch:'+c.numero)})); }catch(e){}
  try{ if(gxgVok('gxpec')) ofPeds().filter(p=>bate(ppcItens(p).map(i=>i.t+' '+(i.ref||'')).join(' ')+' '+(p.porNome||'')+' peça')).slice(0,5)
    .forEach(p=>r.push({g:'Pedidos de peça',t:ppcItens(p).map(i=>i.t).join(' · ').slice(0,60),s:(p.porNome||'')+' · '+(({enviado:'Novo',visto:'Visto',comprar:'Vai comprar'})[p.status||'enviado']||(OF_PST[p.status]||[''])[0]),run:()=>{ S.gpc.f='todos'; go('gxpec'); gxsFiltra('[data-gchq]',q); }})); }catch(e){}
  try{ if(gxgVok('gxacoes')) (S.gxAcoes||[]).filter(a=>!a.removido&&a.st!=='ok'&&bate((a.t||'')+' '+(a.quem||''))).slice(0,4).forEach(a=>r.push({g:'Plano de ação',t:a.t,s:(a.quem||'')+(a.prazo?' · prazo '+dm(a.prazo):''),run:()=>go('gxacoes')})); }catch(e){}
  try{ if(gxgVok('gxpres')){ const D=gxpDoc(hojeStr()); if(D) (D.p||[]).concat(D.f||[]).filter(x=>bate(x.n+' '+(x.s||''))).slice(0,5).forEach(x=>r.push({g:'Pessoas hoje',t:x.n,s:[x.s,x.c?'chegou '+x.c:(x.m||'não veio')].filter(Boolean).join(' · '),run:()=>{ go('gxpres'); setTimeout(()=>{ const b=[...document.querySelectorAll('[data-act="gxp-pes"]')].find(e=>e.dataset.n===x.n); b&&b.click(); },120); }})); } }catch(e){}
  return r.slice(0,24); }
function gxsFiltra(sel,q){ setTimeout(()=>{ const i=document.querySelector(sel); if(i){ i.value=q; i.dispatchEvent(new Event('input',{bubbles:true})); } },150); }
function gxsMonta(nl){ let w=$('#gxs'); if(w) return; w=document.createElement('div'); w.id='gxs'; w.className='gxs';
  w.innerHTML=`<label class="gxs-q">${ic('lupa',16,2)}<input id="gxs-q" type="search" placeholder="Pesquisar…" autocomplete="off" aria-label="Procurar tela, ação, chamado, peça ou pessoa" aria-controls="gxs-res"></label><div class="gxs-res" id="gxs-res" role="listbox" hidden></div>`;
  nl.parentNode.insertBefore(w,nl); }
function gxsMostra(){ const w=$('#gxs'), res=$('#gxs-res'), i=$('#gxs-q'); if(!w||!res||!i) return; const G=S.gxs; G.q=i.value; const xs=gxsItens(G.q); G.xs=xs; if(G.sel>=xs.length) G.sel=0;
  let ult=''; res.innerHTML=xs.map((x,k)=>{ const h=x.g!==ult?`<div class="gxs-g">${esc(x.g)}</div>`:''; ult=x.g; return h+`<button class="gxs-it ${x.c?'c-'+x.c:''}" role="option" data-gxsi="${k}" ${k===G.sel?'aria-selected="true"':''}><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</button>`; }).join('')||`<p class="gxs-vz">Nada encontrado para "${esc(G.q)}".</p>`;
  res.hidden=false; w.classList.add('on'); document.body.classList.add('gxs-on'); }
function gxsFecha(limpa){ const w=$('#gxs'), res=$('#gxs-res'), i=$('#gxs-q'); if(res) res.hidden=true; if(w) w.classList.remove('on'); document.body.classList.remove('gxs-on'); if(limpa&&i){ i.value=''; S.gxs.q=''; } }
function gxsVai(k){ const x=(S.gxs.xs||[])[k]; if(!x) return; gxsFecha(true); const i=$('#gxs-q'); i&&i.blur(); try{ x.run(); }catch(e){ console.warn('[busca]',e); } }
document.addEventListener('focusin',ev=>{ if(ev.target&&ev.target.id==='gxs-q'){ S.gxs.sel=0; gxsMostra(); } });
document.addEventListener('input',ev=>{ if(ev.target&&ev.target.id==='gxs-q'){ S.gxs.sel=0; gxsMostra(); } });
document.addEventListener('keydown',ev=>{ if(!ev.target||ev.target.id!=='gxs-q') return; const G=S.gxs, n=(G.xs||[]).length;
  if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ ev.preventDefault(); G.sel=n?(G.sel+(ev.key==='ArrowDown'?1:-1)+n)%n:0; gxsMostra(); const s=document.querySelector('.gxs-it[aria-selected="true"]'); s&&s.scrollIntoView({block:'nearest'}); return; }
  if(ev.key==='Enter'){ ev.preventDefault(); gxsVai(G.sel); return; }
  if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); gxsFecha(true); ev.target.blur(); } },true);
document.addEventListener('mousedown',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-gxsi]'); if(b){ ev.preventDefault(); gxsVai(+b.dataset.gxsi); return; } if(!(ev.target.closest&&ev.target.closest('#gxs'))) gxsFecha(false); },true);
/* atalho: tecla G, ou Ctrl+K, põe o foco na busca da lateral */
document.addEventListener('keydown',ev=>{ if(!gxSolo()) return; const t=ev.target, ed=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ ev.preventDefault(); const i=$('#gxs-q'); i&&i.focus(); } });

document.head.insertAdjacentHTML('beforeend',`<style id="gxg-css">
.gxs{position:relative;margin:0 0 10px}
.gxs-q{display:flex;align-items:center;gap:8px;padding:0 10px;height:40px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.75)}
.gxs-q:focus-within{background:#fff;color:#55666F;border-color:#fff}
.gxs-q input{flex:1;min-width:0;border:0;background:transparent;font:inherit;font-size:14px;color:#fff;outline:none}.gxs-q:focus-within input{color:#1D2B33}
.gxs-q input::placeholder{color:rgba(255,255,255,.7)}.gxs-q:focus-within input::placeholder{color:#8a9aa3}
.gxs-res{margin-top:6px;max-height:min(70vh,560px);overflow:auto;background:#fff;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.28);padding:6px;position:relative;z-index:30}
.gxs-g{font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6b7c85;padding:8px 8px 4px}
.gxs-it{display:block;width:100%;text-align:left;border:0;background:transparent;border-radius:8px;padding:7px 8px;cursor:pointer;color:#1D2B33;font:inherit}
.gxs-it b{display:block;font-size:13.5px;font-weight:500;line-height:1.3}.gxs-it small{display:block;font-size:12px;color:#6b7c85;margin-top:1px;line-height:1.3}
.gxs-it:hover,.gxs-it[aria-selected="true"]{background:#E8F0F4}.gxs-it.c-crit b{color:#A83A2E}.gxs-it.c-crit{box-shadow:inset 3px 0 0 #C0392B}.gxs-it.c-warn{box-shadow:inset 3px 0 0 #C99A2E}
.gxs-vz{margin:8px;color:#6b7c85;font-size:13px}
body.gxs-on #navlist{opacity:.35;pointer-events:none}
.gxg-sub{display:flex;flex-direction:column;gap:2px;margin:2px 0 6px 30px;padding-left:10px;border-left:1px solid rgba(255,255,255,.18)}
.gxg-sub .gxg-si{min-height:34px;padding:6px 10px;font-size:13.5px}
.gxg-gr[data-aberto]:not([aria-current]){background:rgba(255,255,255,.06)}
.gxg-tabs{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:0 0 14px;padding:4px;border-radius:12px;background:var(--surface,#fff);border:1px solid var(--line,#E3E8EC);width:max-content;max-width:100%}
.gxg-tt{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:0 10px 0 8px;border-right:1px solid var(--line,#E3E8EC);margin-right:4px}
.gxg-tb{border:0;background:transparent;font:inherit;font-size:14px;font-weight:500;color:var(--ink,#1D2B33);padding:8px 14px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.gxg-tb:hover{background:rgba(43,106,135,.08)}.gxg-tb[aria-current="page"]{background:var(--teal-strong,#143F54);color:#fff}
.gxg-tb em{font-style:normal;font-size:11px;font-weight:600;min-width:18px;height:18px;border-radius:9px;background:#C0392B;color:#fff;display:inline-grid;place-items:center;padding:0 5px}
.gxg-mc{margin-bottom:12px}
@media(max-width:640px){.gxg-tabs{width:100%;overflow-x:auto;flex-wrap:nowrap}.gxg-tt{display:none}.gxg-tb{white-space:nowrap}}
:root[data-theme="dark"] .gxs-res{background:#1b2a32}:root[data-theme="dark"] .gxs-it{color:#e6eef2}:root[data-theme="dark"] .gxs-it:hover,:root[data-theme="dark"] .gxs-it[aria-selected="true"]{background:#24404f}
:root[data-theme="dark"] .gxs-q:focus-within{background:#1b2a32;border-color:#3b5664}:root[data-theme="dark"] .gxs-q:focus-within input{color:#e6eef2}
</style>`);
