/* Painel Colafix · 20-chamados-tela.js — tela única do login "Chamados" (protótipo aprovado "Chamados da manutenção").
   Reaproveita a engrenagem do tablet (S.tt, leitura de crachá por coletor/câmera, volta automática) e troca só o desenho e os passos:
   gestor/técnico: máquina → defeito → parou? → aberto · técnico: Começar → (bipa de novo) Terminar → causa (um toque conclui e libera).
   Claro ou escuro por aparelho (localStorage colafix.chEscuro). Grava igual ao tablet (manSalvar, manStatus, ttLiberaPorTecnico). */
"use strict";
const cqEsc=()=>{ try{ return localStorage.getItem('colafix.chEscuro')==='1'; }catch(e){ return false; } };
const cqDefeitos=()=>((S.cfg||{}).manDefeitos&&S.cfg.manDefeitos.length?S.cfg.manDefeitos:TT_DEFEITOS);
const cqCausas=()=>((S.cfg||{}).manCausas&&S.cfg.manCausas.length?S.cfg.manCausas:MZ_CAUSAS);
const cqAbertos=()=>(S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)&&c.status!=='Concluída');
function cqEstado(l){ const xs=cqAbertos().filter(c=>c.linha===l);
  const par=xs.find(c=>c.impacto==='parou'&&!(c.exec&&c.exec.tecnico)), exe=xs.find(c=>c.exec&&c.exec.tecnico), ag=xs.find(c=>!(c.exec&&c.exec.tecnico));
  if(par) return {c:'crit',t:'Máquina parada · aguardando técnico',s:'OS '+manNum(par.numero)+' · '+(par.equip||'')+' · aberto às '+hm(par.criado||par.quando)};
  if(exe) return {c:'info',t:'Em conserto',s:exe.exec.tecnico+(exe.exec.inicio?' desde '+String(exe.exec.inicio).slice(11,16):'')+' · '+(exe.equip||'')};
  if(ag) return {c:'warn',t:'Aguardando técnico',s:'OS '+manNum(ag.numero)+' · '+(ag.equip||'')+' · ainda funciona'};
  return {c:'ok',t:'Funcionando',s:'nenhum chamado aberto'}; }
const cqBt=(act,txt,attrs,cls,sub)=>`<button class="cq-bt ${cls||''}" data-act="${act}" ${attrs||''}><b>${esc(txt)}</b>${sub?`<span>${esc(sub)}</span>`:''}</button>`;
function cqEtapas(n){ return `<ol class="cq-et" aria-label="Etapas">${['Máquina','Defeito','Parou?'].map((t,i)=>`<li class="${i+1<=n?'on':''}${i+1===n?' at':''}"><span>${i+1}</span>${t}</li>`).join('')}</ol>`; }
function cqRod(txt,act,lab){ return `<div class="cq-rod"><span>${txt}</span><button class="cq-sec" data-act="${act||'cq-cancel'}">${lab||'Cancelar'}</button></div>`; }
function vChamados(){ const T=S.tt, L=ttLinhas(), h=new Date(), esc_=cqEsc();
  const logo=esc_?'icons/logo-colafix-escuro.png':((document.querySelector('.brand img')||{}).src||'');
  const quem=T.p?`<div class="cq-pe"><span>${esc(String(T.p.nome||'?')[0])}</span><div><b>${esc(T.p.nome)}</b><small>${T.p.papel==='tecnico'?'Técnico da manutenção':'Gestor'+(T.p.linha?' · '+esc(T.p.linha):'')}</small></div></div>`:'';
  const cab=`<header class="cq-cab"><img class="cq-logo" src="${esc(logo)}" alt="Colafix"><img class="cq-ass" src="icons/assinatura.png" alt="Assinatura da marca"><i class="cq-sep"></i><div class="cq-tt">Chamados da manutenção</div><div class="cq-dir">${quem}<div class="cq-clk" data-rtv-clk>${pad(h.getHours())}:${pad(h.getMinutes())}</div>${ttSoTablet()?'':'<button class="cq-x" data-act="tt-sair" aria-label="Sair">✕</button>'}</div></header>`;
  const msg=T.msg?`<div class="cq-msg">${esc(T.msg)}</div>`:'';
  let c='';
  if(T.fase==='espera'||!T.p){
    c=`<div class="cq-lns">${L.map(l=>{ const e=cqEstado(l); return `<section class="cq-ln ${e.c}${e.c==='crit'?' cq-pisca':''}"><div><h2>${esc(l)}</h2><i></i></div><b>${esc(e.t)}</b><span>${esc(e.s)}</span></section>`; }).join('')}</div>
      <section class="cq-cta"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="12" width="32" height="22" rx="3"/><path d="M14 18v10M18 18v10M22 18v10M27 18v10M31 18v10M35 18v10M4 40h40"/></svg><div><h1>Passe seu crachá no leitor</h1><p>Gestor da linha: abre chamado · Técnico: começa e termina o conserto</p><p class="cq-p2">${ttCam.erro?'Este computador não tem câmera: use o leitor de crachá.':'No tablet, aproxime o QR do crachá da câmera.'}</p>${msg}</div></section>
      <div class="cq-tema">${ttSemCrachaOk()?'<button class="cq-sec" data-act="tt-sem">Estou sem crachá</button>':''}<button class="cq-sec" data-act="cq-tema">${esc_?'Tela clara':'Tela escura'}</button><button class="cq-sec" data-act="cq-cheia">${document.fullscreenElement?'Sair da tela cheia':'Tela cheia'}</button><button class="cq-sec" data-act="cq-sair">Sair</button></div>`; }
  else if(T.fase==='cqlinha'){ c=`<h1 class="cq-h">Em qual linha?</h1><div class="cq-g">${L.map(l=>cqBt('cq-linha',l,`data-l="${esc(l)}"`)).join('')}</div>${msg}${cqRod('Escolha a linha da máquina com problema.')}`; }
  else if(T.fase==='maquina'){ const l=T.linha||T.p.linha||''; if(!l){ T.fase='cqlinha'; return vChamados(); } T.linha=l;
    const es=mxEquips(l); c=`${cqEtapas(1)}<h1 class="cq-h">Qual máquina da <em>${esc(l)}</em>?${L.length>1?' <button class="cq-lk" data-act="cq-trocal">trocar linha</button>':''}</h1>
      <div class="cq-g">${es.map(e=>cqBt('cq-eq',e.nome,`data-id="${esc(e.id)}"`)).join('')}${cqBt('cq-eq',es.length?'Outra máquina':'Linha toda / outra máquina','data-id=""')}</div>${msg}${cqRod(T.p.papel==='tecnico'?'Você está abrindo um chamado como técnico.':'A linha vem do seu crachá.')}`; }
  else if(T.fase==='defeito'){ c=`${cqEtapas(2)}<h1 class="cq-h">O que aconteceu${T.equip?' com <em>'+esc(T.equip)+'</em>':''}?</h1><div class="cq-g">${cqDefeitos().map(d=>cqBt('cq-def',d,`data-v="${esc(d)}"`)).join('')}</div>${msg}${cqRod('Um toque escolhe e já passa para a próxima pergunta.','cq-volta-maq','Voltar')}`; }
  else if(T.fase==='impacto'){ c=`${cqEtapas(3)}<h1 class="cq-h">${T.equip?esc(T.equip):'A máquina'} <em>parou</em>?</h1><div class="cq-g2">${cqBt('cq-imp','Sim, parou','data-v="parou"'+(T.enviando?' disabled':''),'crit','A linha fica marcada como parada até o técnico liberar')}${cqBt('cq-imp','Não, ainda funciona','data-v="reduziu"'+(T.enviando?' disabled':''),'warn','Funciona com problema; o técnico vem assim que puder')}</div>${msg}${cqRod('Ao tocar, o chamado é aberto e a manutenção já vê no painel e na TV.','cq-volta-def','Voltar')}`; }
  else if(T.fase==='ok'){ const ch=manDoc(T.numero); c=`<section class="cq-fim"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg><h1>Chamado aberto · OS ${manNum(T.numero)}</h1><p>${esc(T.linha||'')}${T.equip?' · '+esc(T.equip):''}${T.defeito?' · '+esc(T.defeito):''}${ch&&ch.impacto==='parou'?' · <b class="crit">máquina parada</b>':''}</p><p class="cq-p2">A manutenção já foi avisada. Esta tela volta para o início sozinha.</p></section>`; }
  else if(T.fase==='tecnico'){ const xs=cqAbertos(), meu=c0=>c0.exec&&c0.exec.tecnico&&mxNorm(c0.exec.tecnico)===mxNorm(T.p.nome);
    const peso=c0=>meu(c0)?0:(c0.impacto==='parou'&&!(c0.exec&&c0.exec.tecnico))?1:!(c0.exec&&c0.exec.tecnico)?2:3;
    const ord=xs.slice().sort((a,b)=>peso(a)-peso(b)||String(a.criado||'').localeCompare(String(b.criado||'')));
    const mine=ord.filter(meu);
    c=`<h1 class="cq-h">${mine.length?'Seu conserto em andamento':'Chamados abertos'} <small>· o mais urgente primeiro</small></h1><div class="cq-chs">${ord.length?ord.map(x=>{ const m=meu(x), outro=x.exec&&x.exec.tecnico&&!m, k=m?'info':x.impacto==='parou'?'crit':'warn';
        return `<section class="cq-ch ${k}"><div><div class="cq-chh"><b>${esc(x.linha||'')} · ${esc(x.equip||'máquina')}</b><span>OS ${manNum(x.numero)}</span></div><div class="cq-chd">${esc(x.defeito||'')}</div>
          <div class="cq-chs2 ${k}">${m?'Em conserto · você começou às '+esc(String(x.exec.inicio||'').slice(11,16)):outro?'Em conserto com '+esc(x.exec.tecnico):x.impacto==='parou'?'Máquina parada':'Ainda funciona'} <span>· aberto às ${hm(x.criado||x.quando)}${x.nome?' por '+esc(x.nome):''}</span></div></div>
          ${m?cqBt('cq-terminar','Terminar e liberar a máquina',`data-n="${x.numero}"`,'ok'):outro?'':cqBt('cq-comecar','Começar o conserto',`data-n="${x.numero}"${T.enviando?' disabled':''}`,'pri')}</section>`; }).join(''):'<div class="cq-vz">Nenhum chamado aberto. Tudo funcionando.</div>'}</div>${msg}${cqRod('O técnico também pode abrir um chamado.','cq-abrir','+ Abrir chamado')}`; }
  else if(T.fase==='cqcausa'){ const ch=manDoc(T.osFim); c=`<h1 class="cq-h">Qual foi a causa? <small>· ${esc(ch?(ch.linha||'')+' · '+(ch.equip||''):'')}</small></h1><div class="cq-g">${cqCausas().map(x=>cqBt('cq-causa',x,`data-v="${esc(x)}"${T.enviando?' disabled':''}`)).join('')}</div>${msg}${cqRod('Um toque na causa conclui o chamado e libera a máquina.','cq-volta-tec','Voltar')}`; }
  else if(T.fase==='fimok'){ const ch=manDoc(T.numero), ini=ch&&ch.exec&&ch.exec.inicio, min=ini?Math.max(0,Math.round((Date.now()-new Date(ini).getTime())/6e4)):null;
    c=`<section class="cq-fim"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg><h1>Máquina liberada · OS ${manNum(T.numero)}</h1><p>${esc(ch?(ch.linha||'')+' · '+(ch.equip||''):'')} · causa: ${esc(T.causa||'')}${min!=null?' · '+min+' min de conserto':''}</p><p class="cq-p2">${esc(ch?ch.linha||'':'A linha')} voltou a produzir. Esta tela volta para o início sozinha.</p></section>`; }
  else return null; /* outras fases (sem crachá, ranchos…) usam a tela antiga */
  return `<div class="cq${esc_?' esc':''}">${cab}<main class="cq-main">${c}</main></div>`; }

/* trava do número da OS: se a trava do Firebase falhar (regras antigas sem _travas) ou demorar mais de 4 s,
   segue sem ela — quem chama ainda confere se o número está livre (get) antes de gravar. Trava ocupada de verdade continua respeitada. */
async function manTrava(ref,ttl){ let r;
  try{ r=await Promise.race([ref.acquire({holder:S.uid||('t'+Math.random()),ttlMs:ttl||5000}),new Promise(ok=>setTimeout(()=>ok({acquired:false,erro:'tempo'}),4000))]); }catch(e){ r={acquired:false,erro:String((e&&e.code)||e)}; }
  if(r&&r.erro){ if(!manTrava._avisou){ manTrava._avisou=true; console.warn('[manutenção] trava indisponível ('+r.erro+'): numerando sem trava'); } return {acquired:true,semTrava:true}; }
  return r||{acquired:false}; }
/* motivo legível dos erros do Firebase (antes ficavam num aviso escondido atrás da tela) */
function cqErroTxt(e){ const c=String((e&&e.code)||''), m=String((e&&e.message)||e||'');
  if(/permission|insufficient/i.test(c+m)) return 'sem permissão para gravar: confira o login deste computador';
  if(/unavailable|offline|network|failed to get|timeout|deadline/i.test(c+m)) return 'sem conexão com o Firebase';
  if(/unauthenticated/i.test(c+m)) return 'login expirado: entre de novo';
  return m.slice(0,140)||c; }
{ const _me=manErro; manErro=function(e,msg){ try{ if(S.man) S.man._ultErro=cqErroTxt(e); }catch(x){} return _me.apply(this,arguments); }; }
/* no processo novo quem libera é o técnico: o gestor não cai mais na etapa antiga "a máquina voltou a funcionar?" */
{ const _tp=ttPendentes; ttPendentes=function(p){ if(ttSoChamados()&&ttLiberaTec()) return []; return _tp.apply(this,arguments); }; }
/* rota: no login "Chamados" a tela do tablet é esta */
{ const _vt=vTotem; vTotem=function(){ if(ttSoChamados()){ const h=vChamados(); if(h) return h; } return _vt.apply(this,arguments); }; }
/* técnico: a fase "fim" antiga vira a escolha da causa */
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cq-"]'); if(!b||!ttAtivo()) return; const a=b.dataset.act, T=S.tt; ev.preventDefault();
  const vai=f=>{ T.fase=f; T.msg=''; T.ult=Date.now(); render(); };
  if(a==='cq-tema'){ try{ localStorage.setItem('colafix.chEscuro',cqEsc()?'0':'1'); }catch(e){} render(); return; }
  if(a==='cq-cheia'){ try{ if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }catch(e){ toast('Este navegador não deixou entrar em tela cheia (tecla F11 também funciona).'); } setTimeout(render,250); return; }
  if(a==='cq-sair'){ if(!confirm('Sair do computador de chamados?\n\nPara voltar, será preciso entrar de novo com o usuário e a senha.')) return; ttCamDesliga(); const x=document.createElement('button'); x.dataset.act='sair-conta'; x.hidden=true; document.body.appendChild(x); x.click(); x.remove(); return; }
  if(a==='cq-cancel'){ ttVoltar(); return; }
  if(a==='cq-trocal'||a==='cq-abrir'){ T.linha=''; T.equip=''; T.equipId=''; T.defeito=''; vai('cqlinha'); return; }
  if(a==='cq-linha'){ T.linha=b.dataset.l; vai('maquina'); return; }
  if(a==='cq-eq'){ const e=b.dataset.id?mxEquip(b.dataset.id):null; T.equipId=e?e.id:''; T.equip=e?e.nome:''; vai('defeito'); return; }
  if(a==='cq-volta-maq'){ vai('maquina'); return; } if(a==='cq-volta-def'){ vai('defeito'); return; } if(a==='cq-volta-tec'){ vai('tecnico'); return; }
  if(a==='cq-def'){ T.defeito=b.dataset.v; T.txt=''; vai('impacto'); return; }
  if(a==='cq-imp'){ if(T.enviando) return; T.enviando=true; T.msg=''; render();
    if(S.man.salv&&Date.now()-(S.man._salvDesde||0)>30000) S.man.salv=false; /* salvamento anterior pendurado: destrava */
    manNovo(T.linha); Object.assign(S.man.f,{linha:T.linha,quando:manAgoraLocal(),defeito:T.defeito||'Outro',impacto:b.dataset.v,nome:T.p.nome,equip:T.equip||'',equipId:T.equipId||'',origem:'tablet',cracha:T.p.codigo||null});
    S.man.novo=false; S.man.cur=null; S.man._ultErro=''; S.man._salvDesde=Date.now();
    let estourou=false; const salvar=manSalvar().catch(e=>{ S.man._ultErro=cqErroTxt(e); });
    await Promise.race([salvar,new Promise(r=>setTimeout(()=>{ estourou=true; r(); },window.__cqTempo||25000))]);
    const n=S.man.cur; S.man.cur=null; S.man.novo=false; T.enviando=false;
    if(n!=null){ T.numero=n; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+22000; vai('ok'); }
    else { if(estourou){ S.man.salv=false; } T.msg=estourou?'O Firebase não respondeu em 25 segundos'+(S.man._ultErro?' ('+S.man._ultErro+')':'')+'. Verifique a internet deste computador e toque de novo.':'Não foi possível abrir o chamado'+(S.man._ultErro?': '+S.man._ultErro:'')+'. Toque de novo.'; render(); } return; }
  if(a==='cq-comecar'){ const c=manDoc(+b.dataset.n); if(!c||T.enviando) return; T.enviando=true; render();
    try{ const agora=new Date().toISOString(); const E=Object.assign({},c.exec||{}); if(!E.tecnico) E.tecnico=T.p.nome; if(!E.inicio) E.inicio=manAgoraLocal(); E.tecnicoCracha=T.p.codigo||null;
      const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Conserto começado por '+T.p.nome+(T.p.codigo?' (crachá)':'')}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({exec:E,hist,noLocalEm:c.noLocalEm||agora,noLocalPor:T.p.nome}); c.exec=E; c.hist=hist;
      if(c.status!=='Em execução') await manStatus(c,'Em execução');
      T.enviando=false; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+15000; toast('OS '+manNum(c.numero)+': conserto começado por '+T.p.nome+'.'); ttVoltar(); }
    catch(e){ T.enviando=false; console.warn('[chamados] começar',e); T.msg='Não foi possível registrar agora. Verifique a internet e toque de novo.'; render(); } return; }
  if(a==='cq-terminar'){ T.osFim=+b.dataset.n; T.causa=''; vai('cqcausa'); return; }
  if(a==='cq-causa'){ const c=manDoc(T.osFim); if(!c||T.enviando) return; T.causa=b.dataset.v; T.enviando=true; T.msg=''; render();
    try{ const agora=new Date().toISOString(); const E=Object.assign({},c.exec||{},{causa:T.causa,servicos:'Concluído no computador de chamados · causa: '+T.causa,tecnico:(c.exec&&c.exec.tecnico)||T.p.nome,tecnicoCracha:T.p.codigo||null}); if(!E.inicio) E.inicio=manAgoraLocal();
      const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Conserto concluído por '+T.p.nome+' (causa: '+T.causa+')'}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({exec:E,hist,concluidoPorNome:T.p.nome,concluidoPorCracha:T.p.codigo||null}); c.exec=E; c.hist=hist;
      c._mzOk=true; try{ await manStatus(c,'Concluída'); } finally { delete c._mzOk; }
      if(c.status!=='Concluída'){ T.enviando=false; T.msg='Não foi possível concluir. Verifique a internet e toque de novo.'; render(); return; }
      await ttLiberaPorTecnico(c,T.p); T.enviando=false; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+15000; T.numero=c.numero; toast('OS '+manNum(c.numero)+' concluída · máquina liberada.'); vai('fimok'); }
    catch(e){ T.enviando=false; console.warn('[chamados] concluir',e); T.msg='Não foi possível concluir: '+((e&&e.message)||'verifique a internet')+'.'; render(); } return; }
},true);

document.head.insertAdjacentHTML('beforeend',`<style id="cq-css">
.cq{--pag:#EDF1F4;--card:#FFFFFF;--tx:#143F54;--tx2:#55666F;--linha:#E3E8EC;--cab:#FFFFFF;--ok:#3C8A63;--info:#3F6F93;--warn:#AD8432;--crit:#B5473F;--critbg:#F6E8E6;--pulso:#ECCDC8;--pri:#143F54;--prifg:#FFFFFF;--sombra:0 2px 6px rgba(20,63,84,.08);
  position:fixed;inset:0;z-index:60;background:var(--pag);color:var(--tx);font-family:Archivo,'Segoe UI',system-ui,sans-serif;font-variant-numeric:tabular-nums;display:flex;flex-direction:column;overflow:hidden}
.cq.esc{--pag:#0E1418;--card:#172026;--tx:#EEF2F4;--tx2:#9FB0B9;--linha:#2A363E;--cab:#121A1F;--ok:#5FA884;--info:#6C9AC0;--warn:#C9A55E;--crit:#D2665E;--critbg:#32201F;--pulso:#4E2B29;--pri:#6C9AC0;--prifg:#0E1418;--sombra:none}
.cq-cab{background:var(--cab);height:clamp(70px,10.4vh,112px);flex:none;display:flex;align-items:center;gap:clamp(12px,1.4vw,26px);padding:0 clamp(16px,2.3vw,44px);border-bottom:5px solid #E3312D}
.cq-logo{height:clamp(32px,4.8vh,52px);width:auto}.cq-ass{height:clamp(28px,4.3vh,46px);width:auto}.cq-sep{width:1px;height:52%;background:var(--linha)}.cq-tt{font-size:clamp(20px,3.5vh,38px);font-weight:700;white-space:nowrap}
.cq-dir{margin-left:auto;display:flex;align-items:center;gap:clamp(12px,1.5vw,28px)}.cq-clk{font-size:clamp(30px,5.6vh,60px);font-weight:700}.cq-x{font:inherit;font-size:22px;background:none;border:0;color:var(--tx2);cursor:pointer}
.cq-pe{display:flex;align-items:center;gap:12px;background:var(--pag);border-radius:999px;padding:6px 18px 6px 6px}.cq-pe>span{width:42px;height:42px;border-radius:50%;background:var(--pri);color:var(--prifg);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}.cq-pe b{display:block;font-size:19px}.cq-pe small{font-size:14px;color:var(--tx2)}
.cq-main{flex:1;min-height:0;padding:clamp(14px,3vh,32px) clamp(16px,2.3vw,44px) clamp(12px,2.6vh,28px);display:flex;flex-direction:column;gap:clamp(12px,2.2vh,24px)}
.cq-lns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}.cq-ln{background:var(--card);box-shadow:var(--sombra);border:2px solid transparent;border-radius:16px;padding:16px 20px;display:flex;flex-direction:column;gap:5px}
.cq-ln>div{display:flex;justify-content:space-between;align-items:center}.cq-ln h2{margin:0;font-size:clamp(20px,2.6vh,28px)}.cq-ln i{width:16px;height:16px;border-radius:50%;background:var(--ok)}.cq-ln b{font-size:clamp(17px,2.2vh,24px)}.cq-ln span{font-size:clamp(14px,1.7vh,18px);color:var(--tx2)}
.cq-ln.crit{border-color:var(--crit)}.cq-ln.crit i{background:var(--crit)}.cq-ln.crit b{color:var(--crit)}.cq-ln.warn{border-color:var(--warn)}.cq-ln.warn i{background:var(--warn)}.cq-ln.warn b{color:var(--warn)}.cq-ln.info{border-color:var(--info)}.cq-ln.info i{background:var(--info)}.cq-ln.info b{color:var(--info)}
@keyframes cqPisca{0%,100%{background:var(--critbg)}50%{background:var(--pulso);box-shadow:0 0 0 3px var(--crit)}}.cq-pisca{animation:cqPisca 1.3s ease-in-out infinite;background:var(--critbg)}
.cq-cta{flex:1;min-height:0;background:var(--card);box-shadow:var(--sombra);border-radius:22px;display:flex;align-items:center;justify-content:center;gap:clamp(20px,2.5vw,48px);padding:20px}.cq-cta svg{width:clamp(70px,11vh,120px);height:auto;fill:none;stroke:var(--tx);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
.cq-cta h1{margin:0;font-size:clamp(30px,5.9vh,64px);font-weight:800}.cq-cta p{margin:8px 0 0;font-size:clamp(16px,2.6vh,28px);color:var(--tx2)}.cq-p2{font-size:clamp(14px,2vh,22px)!important}
.cq-tema{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.cq-h{margin:0;font-size:clamp(26px,4.8vh,52px);font-weight:800}.cq-h em{font-style:normal;color:var(--info)}.cq-h small{font-size:clamp(16px,2.4vh,26px);color:var(--tx2);font-weight:500}
.cq-lk{font:inherit;font-size:clamp(14px,2vh,22px);font-weight:500;color:var(--info);background:none;border:0;text-decoration:underline;cursor:pointer}
.cq-et{display:flex;gap:10px;list-style:none;margin:0;padding:0}.cq-et li{display:flex;align-items:center;gap:10px;font-size:clamp(15px,1.9vh,20px);color:var(--tx2)}.cq-et li span{width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--linha);font-weight:800}
.cq-et li.on{color:var(--tx)}.cq-et li.on span{background:var(--pri);color:var(--prifg)}.cq-et li.at{font-weight:700}.cq-et li+li::before{content:"";width:36px;height:2px;background:var(--linha);margin-right:4px}
.cq-g{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));grid-auto-rows:minmax(90px,1fr);gap:16px;overflow:auto}.cq-g2{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:24px}
.cq-bt{font:inherit;cursor:pointer;text-align:left;border:2px solid var(--linha);border-radius:18px;background:var(--card);color:var(--tx);padding:18px 26px;display:flex;flex-direction:column;justify-content:center;gap:6px;box-shadow:var(--sombra);min-height:90px}
.cq-bt b{font-size:clamp(20px,3.3vh,36px);font-weight:800}.cq-bt span{font-size:clamp(14px,1.9vh,20px);opacity:.85}.cq-bt:hover{border-color:var(--info)}.cq-bt:disabled{opacity:.6;cursor:wait}
.cq-bt.crit,.cq-bt.warn,.cq-bt.ok,.cq-bt.pri{border:0;color:#FFFFFF}.cq-bt.crit{background:var(--crit)}.cq-bt.warn{background:var(--warn)}.cq-bt.ok{background:var(--ok)}.cq-bt.pri{background:var(--pri);color:var(--prifg)}.cq-g2 .cq-bt b{font-size:clamp(30px,5.2vh,56px)}
.cq-rod{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:16px}.cq-rod>span{font-size:clamp(14px,1.9vh,20px);color:var(--tx2)}
.cq-sec{font:inherit;font-size:clamp(16px,2.2vh,24px);font-weight:700;color:var(--tx);background:var(--card);border:2px solid var(--linha);border-radius:14px;padding:14px 30px;cursor:pointer;min-height:44px}
.cq-msg{background:var(--critbg);color:var(--crit);border-radius:12px;padding:12px 18px;font-size:clamp(15px,2vh,20px);font-weight:700;margin-top:10px}
.cq-chs{display:flex;flex-direction:column;gap:14px;overflow:auto;min-height:0}.cq-ch{background:var(--card);box-shadow:var(--sombra);border:2px solid var(--warn);border-radius:18px;padding:18px 24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,440px);gap:10px 26px;align-items:center}
.cq-ch.crit{border-color:var(--crit);background:var(--critbg)}.cq-ch.info{border-color:var(--info)}.cq-chh{display:flex;gap:14px;align-items:baseline}.cq-chh b{font-size:clamp(20px,3.1vh,34px)}.cq-chh span{font-size:clamp(14px,1.9vh,20px);color:var(--tx2)}
.cq-chd{font-size:clamp(17px,2.4vh,26px);margin-top:4px}.cq-chs2{font-size:clamp(14px,1.9vh,20px);font-weight:700;margin-top:4px}.cq-chs2 span{font-weight:400;color:var(--tx2)}.cq-chs2.crit{color:var(--crit)}.cq-chs2.warn{color:var(--warn)}.cq-chs2.info{color:var(--info)}
.cq-vz{font-size:clamp(20px,3vh,32px);color:var(--tx2);padding:30px 0}
.cq-fim{flex:1;background:var(--card);box-shadow:var(--sombra);border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:20px}.cq-fim svg{width:clamp(80px,13vh,140px);height:auto;fill:none;stroke:var(--ok);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cq-fim h1{margin:0;font-size:clamp(34px,6.6vh,72px);font-weight:800}.cq-fim p{margin:0;font-size:clamp(18px,3vh,32px);color:var(--tx2)}.cq-fim b.crit{color:var(--crit)}
body:has(.cq) #toast{z-index:100!important;position:fixed}
@media (max-width:820px){.cq-g2{grid-template-columns:1fr}.cq-ch{grid-template-columns:1fr}.cq-tt{display:none}}
</style>`);
if(!document.getElementById('tvn-font')){ try{ const l=document.createElement('link'); l.id='tvn-font'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,400;100,500;100,600;100,700;100,800&display=swap'; document.head.appendChild(l); }catch(e){} }
/* ===FIM CHAMADOS TELA=== */
