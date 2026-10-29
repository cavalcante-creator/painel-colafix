/* Painel Colafix · 73-robo.js (29/10) — "Lys", o robozinho do MODO TREINAMENTO.
   Só aparece com o treinamento ligado (treinoOn(), js/51). Cada login vê as lições das telas que pode abrir (viewOk),
   então o robô é personalizado por cargo/pessoa. Em cada passo o robô explica, destaca onde tocar (anel piscando) e
   ESPERA a pessoa fazer de verdade para seguir (no treino nada é gravado). Pode falar em voz alta (speechSynthesis,
   botão de som; lembrado no aparelho). Lições feitas ficam marcadas por pessoa em localStorage['colafix.robo.<uid>'].
   Lição = {id, nome, sub, tela (view onde começa), pode(), passos:[{t, el, faz, ok, go}]}
     faz: 'clique' (tocar no elemento) · 'digitar' (preencher o campo) · 'mudar' (escolher numa lista) · 'ler' ("Entendi")
     el: seletor CSS (o primeiro visível) · ok(): condição extra que também conclui o passo · go: tela para abrir antes.
   Prefixo `rb`. Teste: teste-robo.js. */
"use strict";
const RB={on:false,l:null,i:0,feito:false,menu:false,quando:0,achou:0,rolou:false,falou:'',som:true,pronto:false,esq:false};
try{ RB.som=localStorage.getItem('colafix.robo.som')!=='0'; }catch(e){}
const rbVis=el=>{ if(!el) return false; const r=el.getBoundingClientRect(); if(!(r.width||r.height)) return false; const cs=getComputedStyle(el); return cs.visibility!=='hidden'&&cs.display!=='none'; };
const rbAcha=sel=>{ if(!sel) return null; try{ return [...document.querySelectorAll(sel)].find(rbVis)||null; }catch(e){ return null; } };
const rbPode=v=>{ try{ return viewOk(v); }catch(e){ return false; } };
const rbNome=()=>{ try{ return String((S.uid&&S.nomes&&S.nomes[S.uid])||'').split(/\s+/)[0]||''; }catch(e){ return ''; } };
/* ---------- as lições ---------- */
const RB_LICOES=[
 {id:'painel',nome:'Conhecer o painel',sub:'Menu, busca, avisos e o seu nome',pode:()=>true,passos:[
   {t:'Oi! Eu sou o Lys e vou te ensinar a usar o painel, passo a passo. Pode tocar à vontade: no treinamento nada é gravado de verdade.',faz:'ler'},
   {t:'Aqui do lado fica o menu, com as telas que você usa no seu trabalho.',el:'#navlist, .side, .botnav',faz:'ler'},
   {t:'Toque na busca. Por ela você acha ordem, rancho, pessoa ou produto digitando só um pedaço do nome.',el:'#tp-busca',faz:'clique'},
   {t:'Digite pelo menos 2 letras ou números. Para fechar a busca, aperte Esc ou toque fora.',el:'#tp-pop',faz:'ler',ok:()=>{ const p=document.getElementById('tp-pop'); return !p||p.hidden; }},
   {t:'Agora toque no sino. Ele mostra o que está precisando da sua atenção.',el:'#tp-sino',faz:'clique'},
   {t:'Tocando num aviso, o painel te leva direto para a tela certa.',el:'#tp-pop',faz:'ler',fim:()=>{ try{ tpFechaPop(); }catch(e){} }},
   {t:'Tocando no seu nome você troca a senha, sai do painel e liga ou desliga o treinamento.',el:'.quem',faz:'ler'}]},
 {id:'apont',nome:'Lançar apontamento',sub:'Dizer quanto saiu de cada ordem',tela:'programacao',pode:()=>rbPode('programacao'),passos:[
   {t:'Esta é a Programação: as ordens de cada linha. Toque em "Lançar apontamento".',el:'[data-act="md-apt-abrir"]',faz:'clique',go:'programacao'},
   {t:'Marque a ordem que foi produzida. Pode marcar mais de uma.',el:'[data-apt-sel]',faz:'clique',ok:()=>!!(S.apt&&S.apt.sel&&S.apt.sel.length)},
   {t:'Agora toque em "Apontar".',el:'[data-act="md-apt-seguir"]',faz:'clique'},
   {t:'Digite quanto saiu: paletes e sacos avulsos, ou a quantidade. O painel faz a conta e mostra o que ainda falta.',el:'[data-apt-id]',faz:'digitar'},
   {t:'Toque em "Lançar apontamentos". Pronto: o pendente da ordem já se atualiza sozinho.',el:'[data-act="md-apt-lancar"]',faz:'clique'}]},
 {id:'ordem',nome:'Criar uma ordem',sub:'Colocar uma ordem nova na programação',tela:'programacao',pode:()=>rbPode('programacao'),passos:[
   {t:'Toque em "Nova ordem".',el:'[data-act="o-nova-abrir"]',faz:'clique',go:'programacao'},
   {t:'Digite o número da ordem que está no sistema.',el:'#o-n-num',faz:'digitar'},
   {t:'Escolha o produto. Comece a digitar o código ou o nome e escolha na lista.',el:'#o-n-produto',faz:'digitar'},
   {t:'Digite a quantidade da ordem.',el:'#o-n-total',faz:'digitar'},
   {t:'Confira a linha e o dia em que ela vai rodar.',el:'#o-n-linha',faz:'ler'},
   {t:'Toque em salvar. A ordem aparece na programação e no calendário.',el:'[data-act="o-nova-salvar"]',faz:'clique'}]},
 {id:'filtros',nome:'Achar ordens com os filtros',sub:'Atrasadas, família, linha e busca',tela:'programacao',pode:()=>rbPode('programacao'),passos:[
   {t:'Os filtros ficam neste quadro. Vamos usar os principais.',el:'.pfil',faz:'ler',go:'programacao'},
   {t:'Toque em "Atrasadas" para ver só as ordens que já passaram do dia e ainda estão abertas.',el:'[data-act="p29-atr"]',faz:'clique'},
   {t:'Agora escolha uma família de produto na lista.',el:'#p29-fam',faz:'mudar'},
   {t:'Para ver tudo de novo, toque em "limpar filtros".',el:'[data-act="o-limpar-filtros"]',faz:'clique'}]},
 {id:'cal',nome:'Usar o calendário',sub:'Ver a semana e as atrasadas',tela:'calendario',pode:()=>rbPode('calendario'),passos:[
   {t:'No calendário cada coluna é um dia e cada faixa é uma linha. Dá para arrastar o cartão de uma ordem para outro dia.',el:'.cc [draggable="true"], .cc',faz:'ler',go:'calendario'},
   {t:'Toque em "Atrasadas" para ver as ordens que passaram do dia.',el:'[data-act="c-atras"]',faz:'clique'},
   {t:'Toque de novo para voltar ao calendário.',el:'[data-act="c-atras"]',faz:'clique'}]},
 {id:'silorec',nome:'Receber areia ou cimento',sub:'Lançar a nota no silo',tela:'silorec',pode:()=>rbPode('silorec'),passos:[
   {t:'Esta tela é para quando chega caminhão de areia ou cimento. Primeiro escolha o material.',el:'[data-act="sr-mat"]',faz:'clique',go:'silorec'},
   {t:'Toque no silo onde descarregou. Se a carga foi dividida, toque nos dois.',el:'[data-act="sr-silo"]',faz:'clique'},
   {t:'Digite o número da nota fiscal.',el:'#sr-nf',faz:'digitar'},
   {t:'Digite a quantidade da nota (em toneladas).',el:'#sr-q',faz:'digitar'},
   {t:'Confira o resumo "Vai entrar" e toque em "Registrar recebimento". O saldo do silo sobe na hora.',el:'[data-act="sr-ok"]',faz:'clique'}]},
 {id:'medicao',nome:'Medir os silos',sub:'Lançar a medição do dia',tela:'medicao',pode:()=>rbPode('medicao'),passos:[
   {t:'Digite quantas toneladas tem no silo. Zero é vazio; em branco é "não medi". O Enter pula para o próximo.',el:'.mcampo',faz:'digitar',go:'medicao'},
   {t:'Confira o nome de quem mediu.',el:'#m-quem',faz:'ler'},
   {t:'Toque em "Salvar medição". A data e a hora entram sozinhas.',el:'#m-salvar',faz:'clique'}]},
 {id:'unif',nome:'Registrar entrega de uniforme',sub:'Avisar o RH do que foi entregue',tela:'rhunif',pode:()=>rbPode('rhunif'),passos:[
   {t:'Toque em "+ Registrar entrega".',el:'[data-act="rhu-novo"]',faz:'clique',go:'rhunif'},
   {t:'Digite o nome de quem recebeu o uniforme.',el:'#rhu-pn',faz:'digitar'},
   {t:'Se a pessoa aparecer na lista, toque nela: o setor vem sozinho. (Se não aparecer, toque em "Pular passo".)',el:'[data-act="rhu-pick"]',faz:'clique'},
   {t:'Escreva a peça entregue (camiseta, calça…).',el:'[data-rhu-i][data-k="t"]',faz:'digitar'},
   {t:'O tamanho e a quantidade.',el:'[data-rhu-i][data-k="tam"]',faz:'digitar'},
   {t:'No dia a dia você toca em "Registrar e abrir o e-mail". Para treinar, toque em "Só registrar".',el:'[data-act="rhu-ok"][data-v="so"]',faz:'clique'}]},
 {id:'unifrh',nome:'Lançar uniforme e desconto',sub:'O que o RH faz com cada entrega',tela:'rhunif',pode:()=>rbPode('rhunif')&&!!(S.acs&&(S.acs.dono||(acsP()&&acsP().mods.includes('rh')))),passos:[
   {t:'Em cada entrega você decide se desconta do salário: Sim ou Não.',el:'.rhu-yn',faz:'clique',go:'rhunif'},
   {t:'Depois de passar para a ficha da pessoa, toque em "Lancei na ficha".',el:'[data-act="rhu-lanc"]',faz:'clique'},
   {t:'Na aba "Relatório" você vê quem pegou o quê no mês, o desconto de cada um e baixa o PDF ou o Excel.',el:'[data-act="rhu-st"][data-v="rel"]',faz:'clique'}]},
 {id:'gxtarefa',nome:'Pedir um serviço à manutenção',sub:'Criar tarefa para os técnicos',tela:'gxch',pode:()=>rbPode('gxch'),passos:[
   {t:'Toque em "Nova tarefa".',el:'[data-act="gch-nova"]',faz:'clique',go:'gxch'},
   {t:'Escreva o que precisa ser feito.',el:'#gch-tx',faz:'digitar'},
   {t:'Escolha onde: uma linha ou um lugar fora das linhas.',el:'#gch-on',faz:'mudar'},
   {t:'Escolha o tipo de serviço.',el:'#gch-tp',faz:'mudar'},
   {t:'Diga a urgência.',el:'[data-act="gch-prio"]',faz:'clique'},
   {t:'Toque em "Enviar para a manutenção". O alarme toca no computador da oficina.',el:'[data-act="gch-salvar"]',faz:'clique'}]}
];
/* ---------- estado guardado por pessoa ---------- */
const rbK=()=>'colafix.robo.'+(S.uid||'x');
function rbFeitas(){ try{ return JSON.parse(localStorage.getItem(rbK())||'{}'); }catch(e){ return {}; } }
function rbMarca(id){ try{ const f=rbFeitas(); f[id]=new Date().toISOString(); localStorage.setItem(rbK(),JSON.stringify(f)); }catch(e){} }
function rbLicoes(){ return RB_LICOES.filter(l=>{ try{ return l.pode(); }catch(e){ return false; } }); }
/* ---------- voz ---------- */
function rbFala(t){ if(!RB.som||!('speechSynthesis' in window)) return; try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(String(t).replace(/["“”]/g,'')); u.lang='pt-BR'; u.rate=1.05;
  const v=speechSynthesis.getVoices().find(x=>/^pt(-|_)BR/i.test(x.lang)); if(v) u.voice=v; speechSynthesis.speak(u); }catch(e){} }
/* ---------- desenho ---------- */
const RB_SVG=`<svg viewBox="0 0 64 64" aria-hidden="true"><line x1="32" y1="4" x2="32" y2="12" stroke="#143F54" stroke-width="3" stroke-linecap="round"/><circle class="rb-ant" cx="32" cy="5" r="4" fill="#E8833A"/>
 <rect x="10" y="12" width="44" height="34" rx="12" fill="#2B7A99"/><rect x="15" y="17" width="34" height="22" rx="8" fill="#0F2E3D"/>
 <g class="rb-olhos"><ellipse cx="25" cy="27" rx="4" ry="4.6" fill="#7FE3F0"/><ellipse cx="39" cy="27" rx="4" ry="4.6" fill="#7FE3F0"/></g>
 <path class="rb-boca" d="M26 34 Q32 38 38 34" stroke="#7FE3F0" stroke-width="2.4" fill="none" stroke-linecap="round"/>
 <rect x="5" y="24" width="6" height="12" rx="3" fill="#143F54"/><rect x="53" y="24" width="6" height="12" rx="3" fill="#143F54"/>
 <rect x="20" y="47" width="24" height="12" rx="5" fill="#2B7A99"/><circle cx="32" cy="53" r="2.6" fill="#E8833A"/></svg>`;
function rbIc(k){ return k==='som'?'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>'
  :k==='mudo'?'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
  :'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'; }
function rbMonta(){ if(document.getElementById('rb')) return; const w=document.createElement('div'); w.id='rb'; w.innerHTML=`<div id="rb-b" hidden></div><button id="rb-bot" type="button" aria-label="Lys, o robô do treinamento" title="Lys · aprender a usar o painel">${RB_SVG}</button>`;
  document.body.appendChild(w); const r=document.createElement('div'); r.id='rb-ring'; r.hidden=true; r.innerHTML='<span>aqui</span>'; document.body.appendChild(r); }
function rbBolha(h,cls){ const b=document.getElementById('rb-b'); if(!b) return; b.hidden=false; b.className=cls||''; b.innerHTML=`<div class="rb-bh"><b>Lys</b><span class="rb-sp"></span><button type="button" class="rb-ib" data-rb="som" title="${RB.som?'Desligar a voz':'Ligar a voz'}">${rbIc(RB.som?'som':'mudo')}</button><button type="button" class="rb-ib" data-rb="x" title="Fechar">${rbIc('x')}</button></div>${h}`; }
function rbFechaBolha(){ const b=document.getElementById('rb-b'); if(b){ b.hidden=true; b.innerHTML=''; } }
/* ---------- menu de lições ---------- */
function rbMenu(saud){ RB.menu=true; RB.l=null; rbAnel(null); const ls=rbLicoes(), f=rbFeitas(), n=rbNome(), feitas=ls.filter(l=>f[l.id]).length;
  const tx=saud?`Oi${n?', '+n:''}! Eu sou o Lys. Vou te ensinar o painel fazendo junto com você. O que você quer aprender?`:'Escolha o que você quer aprender:';
  rbBolha(`<p>${esc(tx)}</p>${ls.length?`<div class="rb-ls">${ls.map((l,i)=>`<button type="button" data-rb="lic" data-v="${l.id}" class="${f[l.id]?'ok':''}"><span class="rb-n">${f[l.id]?'✓':i+1}</span><span><b>${esc(l.nome)}</b><small>${esc(l.sub)} · ${l.passos.length} passos</small></span></button>`).join('')}</div>
    <div class="rb-pg"><i style="width:${ls.length?Math.round(feitas/ls.length*100):0}%"></i></div><small class="rb-ft">${feitas} de ${ls.length} lições feitas</small>`:'<p class="rb-ft">Ainda não tenho lições para as telas do seu acesso.</p>'}`,'rb-menu');
  if(saud) rbFala(tx); }
/* ---------- rodar uma lição ---------- */
function rbComeca(id){ const l=RB_LICOES.find(x=>x.id===id); if(!l) return; RB.l=l; RB.i=0; RB.menu=false; rbPasso(); }
function rbPasso(){ const l=RB.l, p=l&&l.passos[RB.i]; if(!p) return rbFim(); RB.feito=false; RB.quando=Date.now(); RB.achou=0; RB.rolou=false; RB.pronto=false;
  if(p.go&&S.view!==p.go){ try{ go(p.go); }catch(e){} }
  rbDesenha(); rbFala(p.t); }
function rbDesenha(){ const l=RB.l, p=l&&l.passos[RB.i]; if(!p) return; const el=rbAcha(p.el), sumiu=p.el&&!el&&Date.now()-RB.quando>3500;
  const acao=p.faz==='ler'?`<button type="button" class="rb-btn" data-rb="ok">Entendi ›</button>`:p.faz==='digitar'&&RB.pronto?`<button type="button" class="rb-btn" data-rb="ok">Pronto ›</button>`:'';
  const dica=p.faz==='clique'?'Toque onde está piscando.':p.faz==='digitar'?'Digite no campo que está piscando.':p.faz==='mudar'?'Escolha uma opção na lista que está piscando.':'';
  const h=`<div class="rb-lt">${esc(l.nome)} · passo ${RB.i+1} de ${l.passos.length}</div><div class="rb-pg"><i style="width:${Math.round(RB.i/l.passos.length*100)}%"></i></div>
    <p>${esc(p.t)}</p>${sumiu?`<p class="rb-av">Não achei isso nesta tela. Pode ser que não tenha nada para mostrar agora. Toque em "Pular passo" para seguir.</p>`:dica?`<small class="rb-dc">${dica}</small>`:''}
    <div class="rb-ac">${acao}<span class="rb-sp"></span><button type="button" class="lnk" data-rb="pula">Pular passo</button><button type="button" class="lnk" data-rb="para">Parar</button></div>`;
  const b=document.getElementById('rb-b'); const k=RB.i+'|'+!!sumiu+'|'+RB.pronto; if(b&&!b.hidden&&b.dataset.k===k) return; rbBolha(h,'rb-passo'); const b2=document.getElementById('rb-b'); if(b2) b2.dataset.k=k; }
function rbAvanca(pulou){ if(!RB.l||RB.feito) return; RB.feito=true; const p=RB.l.passos[RB.i]; try{ p.fim&&p.fim(); }catch(e){} rbAnel(null);
  const elogio=!pulou&&p.faz!=='ler';
  if(elogio){ const bot=document.getElementById('rb-bot'); if(bot){ bot.classList.remove('feliz'); void bot.offsetWidth; bot.classList.add('feliz'); }
    const b=document.getElementById('rb-b'); if(b&&!b.hidden){ const pp=b.querySelector('p'); if(pp) pp.insertAdjacentHTML('afterbegin','<span class="rb-boa">Isso! </span>'); } }
  setTimeout(()=>{ if(!RB.l) return; RB.i++; rbPasso(); },elogio?900:150); }
function rbFim(){ const l=RB.l; if(!l) return; rbMarca(l.id); RB.l=null; rbAnel(null); const prox=rbLicoes().find(x=>!rbFeitas()[x.id]);
  const tx=`Parabéns! Você aprendeu: ${l.nome}.`;
  rbBolha(`<div class="rb-festa">🎉</div><p><b>${esc(tx)}</b></p><p>Quando quiser, é só fazer de verdade com o treinamento desligado.</p>
    <div class="rb-ac">${prox?`<button type="button" class="rb-btn" data-rb="lic" data-v="${prox.id}">Próxima: ${esc(prox.nome)} ›</button>`:''}<span class="rb-sp"></span><button type="button" class="lnk" data-rb="menu">Outras lições</button></div>`,'rb-fim'); rbFala(tx); }
/* ---------- anel que mostra onde tocar ---------- */
function rbAnel(el){ const r=document.getElementById('rb-ring'); if(!r) return; if(!el){ r.hidden=true; return; } const b=el.getBoundingClientRect(), m=6;
  r.hidden=false; r.style.left=(b.left-m)+'px'; r.style.top=(b.top-m)+'px'; r.style.width=(b.width+m*2)+'px'; r.style.height=(b.height+m*2)+'px'; r.classList.toggle('baixo',b.top<60);
  /* robô e balão saem de cima do que precisa ser tocado */
  const w=document.getElementById('rb'); if(w){ const W=innerWidth, H=innerHeight, cobre=b.right>W-400&&b.bottom>H-360; if(cobre!==RB.esq){ RB.esq=cobre; w.classList.toggle('esq',cobre); } } }
function rbTique(){ if(!treinoOn()||document.body.classList.contains('tv')||!S.uid){ const w=document.getElementById('rb'); if(w) w.hidden=true; rbAnel(null); return; }
  rbMonta(); const w=document.getElementById('rb'); if(w) w.hidden=false;
  if(!RB.l) return; const p=RB.l.passos[RB.i]; if(!p||RB.feito) return; const el=rbAcha(p.el);
  if(el){ if(!RB.rolou){ RB.rolou=true; const r=el.getBoundingClientRect(); if(r.top<180||r.bottom>innerHeight-20) try{ el.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} } rbAnel(el); } else rbAnel(null);
  if(p.ok){ let ok=false; try{ ok=!!p.ok(); }catch(e){} if(ok&&Date.now()-RB.quando>500) return rbAvanca(); }
  if(p.faz==='digitar'&&el){ const tem=String(el.value||'').trim()!==''; if(tem!==RB.pronto){ RB.pronto=tem; } }
  rbDesenha(); }
setInterval(rbTique,300);
/* primeira vez no treinamento (por sessão): o Lys se apresenta */
setTimeout(function rbOi(){ try{ if(!treinoOn()) return; if(!S.uid||!document.getElementById('navlist')&&!document.getElementById('view')) return setTimeout(rbOi,1500);
  if(sessionStorage.getItem('colafix.robo.oi')) return; sessionStorage.setItem('colafix.robo.oi','1'); rbMonta(); rbMenu(true); }catch(e){} },2500);
/* ---------- toques ---------- */
document.addEventListener('click',ev=>{ const t=ev.target;
  const b=t.closest&&t.closest('[data-rb]'); if(b&&b.closest('#rb')){ ev.preventDefault(); ev.stopPropagation(); const a=b.dataset.rb;
    if(a==='som'){ RB.som=!RB.som; try{ localStorage.setItem('colafix.robo.som',RB.som?'1':'0'); }catch(e){} if(!RB.som) try{ speechSynthesis.cancel(); }catch(e){} const bb=document.getElementById('rb-b'); if(bb) delete bb.dataset.k; if(RB.l) rbDesenha(); else if(RB.menu) rbMenu(false); else b.innerHTML=rbIc(RB.som?'som':'mudo'); return; }
    if(a==='x'||a==='para'){ RB.l=null; RB.menu=false; rbAnel(null); rbFechaBolha(); try{ speechSynthesis.cancel(); }catch(e){} return; }
    if(a==='menu'){ rbMenu(false); return; } if(a==='lic'){ rbComeca(b.dataset.v); return; }
    if(a==='ok'||a==='pula'){ rbAvanca(a==='pula'); return; } return; }
  if(t.closest&&t.closest('#rb-bot')){ ev.preventDefault(); ev.stopPropagation(); const bb=document.getElementById('rb-b'); if(bb&&!bb.hidden&&!RB.l){ rbFechaBolha(); RB.menu=false; return; } if(RB.l){ const k=document.getElementById('rb-b'); if(k) delete k.dataset.k; rbDesenha(); rbFala(RB.l.passos[RB.i].t); return; } rbMenu(!RB.menu); return; }
  /* o passo de "tocar": a pessoa tocou no lugar certo */
  if(!RB.l||RB.feito) return; const p=RB.l.passos[RB.i]; if(!p||p.faz!=='clique'||!p.el) return;
  try{ if(t.closest&&t.closest(p.el)) setTimeout(rbAvanca,350); }catch(e){} },true);
document.addEventListener('change',ev=>{ if(!RB.l||RB.feito) return; const p=RB.l.passos[RB.i]; if(!p||!(p.faz==='mudar'||p.faz==='digitar')||!p.el) return;
  try{ if(ev.target.closest&&ev.target.closest(p.el)&&String(ev.target.value||'').trim()!=='') setTimeout(rbAvanca,250); }catch(e){} },true);
document.addEventListener('keydown',ev=>{ if(ev.key!=='Enter'||!RB.l||RB.feito) return; const p=RB.l.passos[RB.i]; if(!p||p.faz!=='digitar'||!p.el) return;
  try{ if(ev.target.closest&&ev.target.closest(p.el)&&String(ev.target.value||'').trim()!=='') setTimeout(rbAvanca,250); }catch(e){} },true);
window.addEventListener('scroll',()=>{ if(RB.l) rbTique(); },true); window.addEventListener('resize',()=>{ if(RB.l) rbTique(); });
window.Painel=window.Painel||{}; window.Painel.robo={licoes:()=>rbLicoes().map(l=>l.id),comeca:rbComeca,menu:()=>rbMenu(false),estado:()=>({l:RB.l&&RB.l.id,i:RB.i})};
document.head.insertAdjacentHTML('beforeend',`<style id="rb-css">
#rb{position:fixed;right:18px;bottom:18px;z-index:99990;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;font-family:Archivo,'Segoe UI',system-ui,sans-serif}
#rb.esq{right:auto;left:18px;align-items:flex-start}#rb>*{pointer-events:auto}
#rb-bot{width:76px;height:76px;border-radius:50%;border:3px solid #fff;background:#E9F4F8;box-shadow:0 8px 24px rgba(15,46,61,.28);padding:6px;cursor:pointer;animation:rbFlut 3s ease-in-out infinite}
#rb-bot svg{width:100%;height:100%;display:block}#rb-bot .rb-olhos{transform-origin:32px 27px;animation:rbPisca 4.5s infinite}#rb-bot .rb-ant{animation:rbAnt 1.6s ease-in-out infinite}
#rb-bot.feliz{animation:rbPula .7s ease}
@keyframes rbFlut{50%{transform:translateY(-5px)}}@keyframes rbPisca{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}@keyframes rbAnt{50%{fill:#FFC07A}}@keyframes rbPula{30%{transform:translateY(-14px) rotate(-6deg)}60%{transform:translateY(0) rotate(4deg)}}
#rb-b{width:min(370px,calc(100vw - 32px));background:#fff;color:#1C2B33;border-radius:16px;box-shadow:0 14px 40px rgba(15,46,61,.28);padding:12px 16px 14px;position:relative;border:1px solid #DCE6EB;max-height:min(70vh,560px);overflow:auto}
#rb-b::after{content:'';position:absolute;right:30px;bottom:-8px;width:16px;height:16px;background:#fff;border-right:1px solid #DCE6EB;border-bottom:1px solid #DCE6EB;transform:rotate(45deg)}#rb.esq #rb-b::after{right:auto;left:30px}
#rb-b p{margin:6px 0;font-size:15.5px;line-height:1.45}.rb-bh{display:flex;align-items:center;gap:6px;margin:-2px -6px 2px 0}.rb-bh b{color:#2B7A99;font-size:13px;letter-spacing:.08em;text-transform:uppercase}.rb-sp{flex:1}
.rb-ib{border:0;background:none;color:#5B6B78;cursor:pointer;padding:4px;border-radius:8px;display:grid;place-items:center}.rb-ib:hover{background:#EEF3F6}
.rb-lt{font-size:12px;color:#5B6B78;font-weight:600}.rb-pg{height:6px;border-radius:9px;background:#E8EEF2;overflow:hidden;margin:6px 0}.rb-pg i{display:block;height:100%;background:linear-gradient(90deg,#2B7A99,#3C8A63);border-radius:9px;transition:width .4s}
.rb-dc{display:block;color:#2B7A99;font-weight:600;font-size:13px}.rb-av{background:#FFF4E5;border-radius:10px;padding:8px 10px;font-size:13.5px!important;color:#8A5A12}
.rb-ac{display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap}.rb-ac .lnk{font-size:13.5px;padding:0}
.rb-btn{border:0;border-radius:10px;background:#143F54;color:#fff;font:inherit;font-weight:700;font-size:14.5px;padding:9px 16px;cursor:pointer}.rb-btn:hover{background:#0F2E3D}
.rb-boa{color:#3C8A63;font-weight:800}.rb-ft{color:#5B6B78;font-size:12.5px}
.rb-ls{display:flex;flex-direction:column;gap:6px;margin:8px 0}.rb-ls button{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #DCE6EB;background:#F7FAFB;border-radius:12px;padding:8px 10px;cursor:pointer;font:inherit;color:inherit}
.rb-ls button:hover{border-color:#2B7A99;background:#EEF6F9}.rb-ls b{display:block;font-size:14.5px}.rb-ls small{color:#5B6B78;font-size:12px}.rb-n{width:28px;height:28px;border-radius:50%;background:#2B7A99;color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px;flex:none}
.rb-ls .ok .rb-n{background:#3C8A63}.rb-festa{font-size:34px;line-height:1;margin-top:4px}
#rb-ring{position:fixed;z-index:99980;border-radius:12px;border:3px solid #E8833A;box-shadow:0 0 0 4px rgba(232,131,58,.25),0 0 0 9999px rgba(15,46,61,.18);pointer-events:none;transition:all .25s ease;animation:rbAnel 1.2s ease-in-out infinite}
#rb-ring span{position:absolute;left:50%;top:-30px;transform:translateX(-50%);background:#E8833A;color:#fff;font:700 12px/1 Archivo,system-ui,sans-serif;padding:5px 9px;border-radius:99px;white-space:nowrap}#rb-ring.baixo span{top:auto;bottom:-30px}
@keyframes rbAnel{50%{box-shadow:0 0 0 10px rgba(232,131,58,.12),0 0 0 9999px rgba(15,46,61,.18)}}
@media (max-width:700px){#rb{right:10px;bottom:76px}#rb.esq{left:10px}#rb-bot{width:60px;height:60px}#rb-b p{font-size:15px}}
[data-theme="dark"] #rb-b{background:#14232B;color:#E6EEF2;border-color:#2A3B44}[data-theme="dark"] #rb-b::after{background:#14232B;border-color:#2A3B44}[data-theme="dark"] .rb-ls button{background:#1A2C35;border-color:#2A3B44}
</style>`);
/* ===FIM ROBÔ=== */
