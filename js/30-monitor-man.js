/* Painel Colafix · 30-monitor-man.js — Monitor da manutenção (protótipo do Posto, telas 10 e 11, 21/10).
   Substitui o conteúdo da tela 'manmon': quadro Aguardando técnico · Em atendimento · Fechados hoje.
   Chamado novo (sem técnico) → a tela inteira pisca em vermelho e o alarme toca e repete até alguém atender
   (o técnico bipa no posto → exec.tecnico) ou até tocarem em "Silenciar e ver chamados".
   O navegador só libera som depois de um toque: sem som liberado aparece "Ativar alarme".
   Conta fixa da TV: cargo "TV da oficina (manutenção)" (tvman), que já abre aqui em tela cheia. */
"use strict";
S.mm2=S.mm2||{vistos:null,alerta:[],cal:new Set(),ultSom:0,ini:Date.now()};
function mm2Abertos(){ return (S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.excluido&&!manFechada(c)&&!c.prevId&&(+c.numero||0)<900000); }
function mm2Tec(c){ return !!(c.exec&&c.exec.tecnico)||c.status==='Em execução'; }
function mm2Imp(c){ return c.impacto==='parou'?['parou completa','crit']:c.impacto==='reduziu'?['parou em parte','warn']:['não interferiu','neu']; }
function mm2Tipo(c){ return c.tipo==='eletrico'?'Elétrico':c.tipo==='mecanico'?'Mecânico':(/el[ée]tric/i.test(c.defeito||'')?'Elétrico':/mec[aâ]nic/i.test(c.defeito||'')?'Mecânico':String(c.defeito||'').slice(0,40)); }
function mm2SomLivre(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return false; const c=S.man._ac||(S.man._ac=new A()); return c.state==='running'; }catch(e){ return false; } }
/* sirene: dois tons alternados, alto, ~1,6 s */
function mm2Sirene(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const c=S.man._ac||(S.man._ac=new A()); if(c.state!=='running') return;
  for(let i=0;i<4;i++){ const o=c.createOscillator(), g=c.createGain(), t=c.currentTime+i*0.4; o.type='square'; o.frequency.value=i%2?660:990; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.45,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+0.36); o.start(t); o.stop(t+0.38); } }catch(e){} }
/* quais chamados estão "tocando": abertos sem técnico, que chegaram depois que a tela abriu (ou há menos de 30 min) e não foram silenciados */
function mm2Vigia(){ if(S.view!=='manmon') return; const ab=mm2Abertos(), M=S.mm2, ids=ab.map(c=>c._id);
  if(M.vistos===null){ M.vistos=new Set(ids); M.alerta=ab.filter(c=>!mm2Tec(c)&&Date.now()-new Date(c.criado||0).getTime()<30*6e4).map(c=>c._id); }
  else { ab.forEach(c=>{ if(!M.vistos.has(c._id)){ M.vistos.add(c._id); if(!mm2Tec(c)) M.alerta.push(c._id); } }); }
  M.alerta=M.alerta.filter(id=>{ const c=ab.find(x=>x._id===id); return c&&!mm2Tec(c)&&!M.cal.has(id); });
  const on=M.alerta.length>0; document.body.classList.toggle('mm2-al',on);
  if(on&&Date.now()-M.ultSom>2600){ M.ultSom=Date.now(); mm2Sirene(); }
  /* depois de silenciado: máquina parada sem técnico ainda dá um bipe por minuto */
  else if(!on&&ab.some(c=>c.impacto==='parou'&&!mm2Tec(c))&&Date.now()-M.ultSom>60000){ M.ultSom=Date.now(); try{ manBip(); }catch(e){} }
  const tem=!!document.querySelector('.mm2-ov'); if(on!==tem||(on&&document.querySelector('.mm2-ov')&&document.querySelector('.mm2-ov').dataset.id!==M.alerta[0])) render(); }
setInterval(mm2Vigia,1000);
function mm2Card(c,col){ const [it,ic2]=mm2Imp(c), agora=Date.now(), ab=new Date(c.criado||c.quando||0).getTime();
  if(col==='fe'){ return `<article class="mm2-c fe"><div class="mm2-ch"><b>${esc(c.linha||'')} · ${manNum(c.numero)}</b><span class="mm2-tag ${ic2}">${it}</span></div><span class="mm2-s">${esc(mm2Tipo(c))} · ${hora(c.criado)} → ${c.concluidoEm?hora(c.concluidoEm):'—'}${c.liberadoPor?' · liberado por '+esc(c.liberadoPor):''}</span></article>`; }
  const exe=col==='ex', ini=c.exec&&c.exec.inicio?String(c.exec.inicio).slice(11,16):'';
  return `<article class="mm2-c ${col==='ag'&&c.impacto==='parou'?'crit':''}"><div class="mm2-ch"><b>${esc(c.linha||'')} · ${manNum(c.numero)}</b><span class="mm2-tag ${ic2} cheia">${it}</span></div>
    <span class="mm2-t">${esc(mm2Tipo(c))}${c.equip?' · '+esc(c.equip):''}</span><span class="mm2-s">Aberto ${hora(c.criado)} por ${esc(c.nome||'—')}${exe&&c.exec.tecnico?' · técnico '+esc(c.exec.tecnico):''}</span>
    <b class="mm2-w ${exe?'info':'crit'}">${exe?'atendendo'+(ini?' desde '+ini:'')+' · '+ltvMin(agora-new Date(c.exec&&c.exec.inicio?c.exec.inicio:c.criado).getTime()):'esperando há '+ltvMin(agora-ab)}</b></article>`; }
function vMonMan(){ const h=hojeStr(), ab=mm2Abertos(), ag=ab.filter(c=>!mm2Tec(c)).sort((a,b)=>(a.impacto==='parou'?0:1)-(b.impacto==='parou'?0:1)||String(a.criado).localeCompare(String(b.criado))), ex=ab.filter(mm2Tec);
  const fe=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.prevId&&c.status==='Concluída'&&c.concluidoEm&&hojeStr(new Date(c.concluidoEm))===h).sort((a,b)=>String(b.concluidoEm).localeCompare(String(a.concluidoEm)));
  /* máquina parada hoje: chamados "parou completa" (abertura até liberação/conclusão, dentro de hoje) */
  const t0=new Date(h+'T00:00:00').getTime(); let par=0; (S.chamados||[]).filter(c=>!manIgnorar(c)&&!c.prevId&&c.impacto==='parou').forEach(c=>{ const a=Math.max(t0,new Date(c.criado||0).getTime()), b=c.liberadoEm?new Date(c.liberadoEm).getTime():c.concluidoEm?new Date(c.concluidoEm).getTime():Date.now(); if(b>a) par+=(b-a)/6e4; });
  const livre=mm2SomLivre(), lg=(document.querySelector('.brand img')||{}).src||'', agora=new Date(), M=S.mm2, al=M.alerta.map(id=>ab.find(c=>c._id===id)).filter(Boolean)[0];
  const tv=document.body.classList.contains('ltv-k');
  const quadro=`<div class="mm2"><header class="mm2-cab">${lg?`<img class="jan-logo" src="${esc(lg)}" alt="Colafix">`:''}<i></i><b class="mm2-tt">Manutenção · chamados</b>
     <div class="mm2-dir">${livre&&S.man.som!==false?'<span class="mm2-on">● Alarme ligado</span>':`<button class="mm2-at" data-act="mm2-ativar">Ativar alarme</button>`}<span class="mm2-mut">Atualiza sozinho</span>
     <button class="mm2-bt" data-act="mx-tv">${tv?'Sair da tela cheia':'Tela cheia'}</button><b class="mm2-clk" data-rtv-clk>${pad(agora.getHours())}:${pad(agora.getMinutes())}</b></div></header>
    <div class="mm2-ks"><div class="crit"><b>${ag.length}</b><span>aguardando técnico</span></div><div class="info"><b>${ex.length}</b><span>em atendimento</span></div><div class="ok"><b>${fe.length}</b><span>fechados hoje</span></div><div class="warn"><b>${gxDurMm(par)}</b><span>máquina parada hoje</span></div></div>
    <div class="mm2-cols"><section><h2>Aguardando técnico <span class="crit">${ag.length}</span></h2><div class="mm2-l">${ag.map(c=>mm2Card(c,'ag')).join('')||'<p class="mm2-vz">Nenhum chamado esperando.</p>'}</div><p class="mm2-p">Para começar: bipe o crachá no posto da linha.</p></section>
     <section><h2>Em atendimento <span class="info">${ex.length}</span></h2><div class="mm2-l">${ex.map(c=>mm2Card(c,'ex')).join('')||'<p class="mm2-vz">Ninguém atendendo agora.</p>'}</div><p class="mm2-p">Fecha quando o operador libera a máquina.</p></section>
     <section><h2>Fechados hoje <span class="ok">${fe.length}</span></h2><div class="mm2-l">${fe.slice(0,8).map(c=>mm2Card(c,'fe')).join('')||'<p class="mm2-vz">Nenhum fechado hoje.</p>'}</div></section></div>
    ${!livre?`<div class="mm2-som"><b>O som está desligado neste computador.</b> O navegador só deixa tocar depois de um clique. <button class="mm2-at" data-act="mm2-ativar">Ativar alarme</button></div>`:''}</div>`;
  if(!al) return quadro;
  const [it]=mm2Imp(al);
  return quadro+`<div class="mm2-ov" data-id="${esc(al._id)}" role="alertdialog" aria-labelledby="mm2-ovt"><header><b>MANUTENÇÃO</b><span>${livre?'Alarme tocando · repete até alguém atender':'Alarme sem som · toque em "Ativar alarme"'}</span><b class="mm2-clk">${pad(agora.getHours())}:${pad(agora.getMinutes())}</b></header>
   <main><div class="mm2-onda"><i></i><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 3 42h42L24 6z"/><path d="M24 19v11M24 36v.5"/></svg></div>
    <h1 id="mm2-ovt">CHAMADO NOVO</h1><div class="mm2-ln">${esc(String(al.linha||'').toUpperCase())} · ${it.toUpperCase()}</div>
    <div class="mm2-sel"><span class="b">${esc(mm2Tipo(al).toUpperCase())}</span><span>${manNum(al.numero)} · aberto ${hora(al.criado)} por ${esc(al.nome||'—')}</span></div>
    <p>Vá até o posto da ${esc(al.linha||'linha')} e bipe seu crachá para começar.${M.alerta.length>1?' · mais '+(M.alerta.length-1)+' chamado(s) esperando':''}</p></main>
   <footer><span>O alarme para sozinho quando o técnico bipa no posto.</span><div>${!livre?'<button class="mm2-at" data-act="mm2-ativar">Ativar alarme</button>':''}<button class="mm2-sil" data-act="mm2-sil">Silenciar e ver chamados</button></div></footer></div>`; }
function gxDurMm(m){ m=Math.round(m||0); return m<1?'0 min':m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'); }
S.extViews=S.extViews||{}; S.extViews.manmon=vMonMan;
if(VIEWS.manmon){ VIEWS.manmon.nome='Monitor da manutenção'; } CRUMB.manmon='Monitor da manutenção';
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.tvman='Monitor da manutenção (TV ou monitor da oficina): quadro dos chamados em tela cheia. Quando abre chamado, a tela pisca em vermelho e o alarme toca até alguém atender. Só mostra, não muda nada.';
try{ if(ACS_PERFIS.tvman) ACS_PERFIS.tvman.nome='Monitor da manutenção (TV com alarme)'; }catch(e){}
document.addEventListener('click',ev=>{ try{ if(S.man._ac&&S.man._ac.state==='suspended') S.man._ac.resume().then(()=>render()).catch(()=>{}); }catch(e){}
  const b=ev.target.closest&&ev.target.closest('[data-act^="mm2-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='mm2-ativar'){ S.man.som=true; try{ localStorage.setItem('painel.mansom','1'); }catch(e){} try{ const A=window.AudioContext||window.webkitAudioContext; const c=S.man._ac||(S.man._ac=new A()); c.resume().then(()=>{ mm2Sirene(); render(); }); }catch(e){} return; }
  if(a==='mm2-sil'){ S.mm2.alerta.forEach(id=>S.mm2.cal.add(id)); S.mm2.alerta=[]; document.body.classList.remove('mm2-al'); render(); return; } },true);
document.head.insertAdjacentHTML('beforeend',`<style id="mm2-css">
.mm2{--c:#FFFFFF;--l:#E3E8EC;--tx:#143F54;--tx2:#55666F;--ok:#3C8A63;--info:#3F6F93;--warn:#AD8432;--crit:#B5473F;font-family:Archivo,'Segoe UI',system-ui,sans-serif;color:var(--tx);display:flex;flex-direction:column;gap:14px;font-variant-numeric:tabular-nums}
body.ltv-k .mm2{position:fixed;inset:0;z-index:50;background:#EDF1F4;padding:0 0 16px;overflow:auto}
.mm2-cab{background:var(--c);border-bottom:5px solid #E3312D;display:flex;align-items:center;gap:18px;padding:12px 24px;flex-wrap:wrap;border-radius:14px}body.ltv-k .mm2-cab{border-radius:0}
.mm2-cab img{height:34px}.mm2-cab>i{width:1px;height:36px;background:var(--l)}.mm2-tt{font-size:24px}.mm2-dir{margin-left:auto;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.mm2-on{color:var(--ok);font-weight:700;font-size:15px}.mm2-mut{color:var(--tx2);font-size:14px}.mm2-clk{font-size:34px}
.mm2-at{font:inherit;font-weight:800;font-size:16px;background:#B5473F;color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer}.mm2-bt{font:inherit;font-weight:700;font-size:15px;background:#fff;color:var(--tx);border:2px solid var(--l);border-radius:10px;padding:8px 14px;cursor:pointer}
.mm2-ks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:0 24px}body:not(.ltv-k) .mm2-ks,body:not(.ltv-k) .mm2-cols{padding:0}
.mm2-ks>div{background:var(--c);border-radius:14px;padding:12px 18px;border-top:5px solid var(--l)}.mm2-ks .crit{border-top-color:var(--crit)}.mm2-ks .info{border-top-color:var(--info)}.mm2-ks .ok{border-top-color:var(--ok)}.mm2-ks .warn{border-top-color:var(--warn)}
.mm2-ks b{display:block;font-size:34px}.mm2-ks span{font-size:16px;color:var(--tx2)}
.mm2-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:0 24px}.mm2-cols>section{background:var(--l);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:300px}
.mm2-cols h2{margin:2px 6px;font-size:19px;display:flex;justify-content:space-between}.mm2-cols h2 .crit{color:var(--crit)}.mm2-cols h2 .info{color:var(--info)}.mm2-cols h2 .ok{color:var(--ok)}
.mm2-l{display:flex;flex-direction:column;gap:10px}.mm2-c{background:var(--c);border:2px solid var(--l);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:5px}.mm2-c.crit{border-color:var(--crit)}.mm2-c.fe{border:0;padding:10px 14px;gap:3px}
.mm2-ch{display:flex;justify-content:space-between;align-items:center;gap:8px}.mm2-ch b{font-size:20px}.mm2-c.fe .mm2-ch b{font-size:17px}.mm2-t{font-size:17px;font-weight:700}.mm2-s{font-size:15px;color:var(--tx2)}.mm2-w{font-size:16px}.mm2-w.crit{color:var(--crit)}.mm2-w.info{color:var(--info)}
.mm2-tag{font-size:14px;font-weight:700;border-radius:999px;padding:3px 10px;color:var(--tx2)}.mm2-tag.cheia.crit{background:var(--crit);color:#fff}.mm2-tag.cheia.warn{background:#F3EAD7;color:#7A5A1C}.mm2-tag.cheia.neu{background:#EEF2F4}.mm2-c.fe .mm2-tag.crit{color:var(--crit)}.mm2-c.fe .mm2-tag.warn{color:#7A5A1C}
.mm2-p{margin:auto 6px 4px;font-size:14px;color:var(--tx2)}.mm2-vz{margin:6px;color:var(--tx2)}
.mm2-som{margin:0 24px;background:#F6E8E6;border:2px solid var(--crit);border-radius:12px;padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
@keyframes mm2pisca{0%,100%{background:#B5473F}50%{background:#E3312D}}@keyframes mm2onda{0%{transform:scale(.8);opacity:1}100%{transform:scale(1.6);opacity:0}}
.mm2-ov{position:fixed;inset:0;z-index:2000;color:#fff;font-family:Archivo,'Segoe UI',system-ui,sans-serif;display:flex;flex-direction:column;animation:mm2pisca .9s ease-in-out infinite;background:#B5473F}
.mm2-ov header,.mm2-ov footer{flex:none;display:flex;align-items:center;gap:20px;padding:14px 28px;background:rgba(0,0,0,.18);flex-wrap:wrap}.mm2-ov header b:first-child{font-size:24px;letter-spacing:.06em}.mm2-ov header span{font-size:20px;font-weight:700}.mm2-ov header .mm2-clk{margin-left:auto}
.mm2-ov main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center;padding:20px}
.mm2-onda{position:relative;width:140px;height:140px;display:flex;align-items:center;justify-content:center}.mm2-onda i{position:absolute;inset:0;border-radius:50%;border:6px solid #fff;animation:mm2onda 1.2s ease-out infinite}.mm2-onda svg{width:96px;height:96px;fill:none;stroke:#fff;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}
.mm2-ov h1{margin:0;font-size:clamp(48px,8vw,110px);font-weight:800;line-height:1}.mm2-ln{font-size:clamp(32px,5vw,72px);font-weight:800;line-height:1.05}
.mm2-sel{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}.mm2-sel span{font-size:clamp(18px,2.4vw,30px);font-weight:700;background:rgba(0,0,0,.22);border-radius:999px;padding:10px 28px}.mm2-sel .b{background:#fff;color:#B5473F;font-weight:800}
.mm2-ov p{margin:0;font-size:clamp(18px,2.2vw,28px);font-weight:700}.mm2-ov footer{justify-content:space-between}.mm2-ov footer span{font-size:18px}.mm2-ov footer div{display:flex;gap:10px}
.mm2-sil{font:inherit;font-size:20px;font-weight:800;color:#B5473F;background:#fff;border:0;border-radius:14px;padding:12px 26px;cursor:pointer}.mm2-ov .mm2-at{background:#7A1E19}
body.mm2-al #mp-aviso{display:none}
@media (max-width:900px){.mm2-ks{grid-template-columns:repeat(2,minmax(0,1fr))}.mm2-cols{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.mm2-ov,.mm2-onda i{animation:none}}
</style>`);
