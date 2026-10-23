/* Painel Colafix · 41-nexus.js (23/10) — checklist do dia no computador da NEXUS (pedido da usuária: o checklist
   diário do plano preventivo é feito pelo pessoal da Nexus, não no posto das linhas).
   Cargo pronto "nexus" (só o módulo tablet, computador com coletor): abre direto numa tela de espera com o andamento do dia;
   quem passa o crachá cai direto no checklist com TODOS os itens do operador (todas as áreas e linhas). Esc/Voltar volta ao início.
   Reaproveita o posto (28) e o checklist (38): mesma leitura de crachá, mesma tela, grava em checkop/{dia}; Problema abre chamado.
   O posto das linhas não tem mais o checklist (tecla 5 sumiu). Sair só com a senha da trava (TRAVA_PERFIS).
   Para ver sem o login próprio (administradora): painel?totem=1&nexus=1. */
"use strict";
registrarPerfil('nexus',{nome:'Checklist do dia · Nexus (computador com coletor)',mods:['tablet'],pos:3,desc:'Computador do pessoal da Nexus: passa o crachá e faz o checklist diário do plano preventivo (OK ou Problema, que vira chamado para a manutenção).'});
function nxOn(){ try{ if(S.acs&&S.acs.doc&&S.acs.doc.perfil==='nexus') return true; return /[?&#]nexus=1/.test(location.search+'&'+location.hash)&&ttPodeUsar(); }catch(e){ return false; } }
{ const _p=poOn; poOn=function(){ return nxOn()||_p.apply(this,arguments); }; }
{ const _el=eqLinkDe; eqLinkDe=function(c){ return c&&c.perfil==='nexus'?eqLinkPainel()+'?totem=1':_el.apply(this,arguments); }; }
if(typeof TRAVA_PERFIS!=='undefined'&&!TRAVA_PERFIS.includes('nexus')) TRAVA_PERFIS.push('nexus');
/* itens: na Nexus todos os do operador; no posto nenhum */
{ const _o=ppOpItens; ppOpItens=function(){ return nxOn()?((S.pp.plano||{}).tarefas||[]).filter(t=>!t.rot&&ppOp(t)):[]; }; }
/* crachá → direto no checklist, no primeiro item que falta */
{ const _ti=ttInicia; ttInicia=function(p){ const r=_ti.apply(this,arguments); if(!nxOn()) return r; const T=S.tt, its=ppOpItens(), k=ppOpDia(), i=its.findIndex(t=>!(k[t.id]&&k[t.id].s));
  T.ckSel=i>=0?i:0; T.fase='pochk'; T.msg=''; T.ult=Date.now(); render(); return r; }; }
{ const _pv=poVolta; poVolta=function(){ if(nxOn()&&S.tt&&S.tt.fase==='pochk'){ ttVoltar(); return; } return _pv.apply(this,arguments); }; }
window.addEventListener('keydown',ev=>{ if(ev.key!=='Escape'||!nxOn()||!S.tt||S.tt.fase!=='pochk'||document.getElementById('trava-m')) return; ev.preventDefault(); ev.stopImmediatePropagation(); ttVoltar(); },true);
/* tela de espera da Nexus */
{ const _vp=vPosto; vPosto=function(){ const T=S.tt; if(!nxOn()||(T.p&&T.fase!=='espera')||T.fase==='sem') return _vp.apply(this,arguments);
  const its=ppOpItens(), k=ppOpDia(), f=its.filter(t=>k[t.id]&&k[t.id].s).length, pb=its.filter(t=>k[t.id]&&k[t.id].s==='pb').length, por={}; its.forEach(t=>{ const a=t.area||'Geral'; (por[a]=por[a]||{n:0,f:0,pb:0}); por[a].n++; if(k[t.id]&&k[t.id].s) por[a].f++; if(k[t.id]&&k[t.id].s==='pb') por[a].pb++; });
  const pc=its.length?Math.round(f/its.length*100):0, quem=[...new Set(its.map(t=>k[t.id]&&k[t.id].por).filter(Boolean))];
  const resumo=!S.pp.plano?'<div class="cq-vz">Carregando o plano…</div>':!its.length?'<div class="cq-vz">O plano preventivo ainda não tem itens de checklist do operador. A manutenção importa a planilha em Manutenção › Plano preventivo.</div>'
    :`<section class="nx-top ${f>=its.length?'ok':''}"><div><b class="nx-n">${f} <small>de ${its.length}</small></b><span>${f>=its.length?'Checklist de hoje completo':'itens feitos hoje'}${pb?' · <em>'+pb+' com problema</em>':''}${quem.length?' · por '+esc(quem.join(', ')):''}</span></div><div class="nx-bar"><i style="width:${pc}%"></i></div></section>
      <div class="nx-areas">${Object.keys(por).map(a=>{ const x=por[a]; return `<div class="nx-a ${x.f>=x.n?'ok':''}"><b>${esc(a)}</b><span>${x.f} de ${x.n}${x.pb?' · '+x.pb+' problema'+(x.pb>1?'s':''):''}</span><div class="nx-bar sm"><i style="width:${x.n?Math.round(x.f/x.n*100):0}%"></i></div></div>`; }).join('')}</div>`;
  return poPagina('Checklist do dia · '+dm(hojeStr()),`${resumo}
    <section class="cq-cta"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="12" width="32" height="22" rx="3"/><path d="M14 18v10M18 18v10M22 18v10M27 18v10M31 18v10M35 18v10M4 40h40"/></svg><div><h1>Passe seu crachá no leitor</h1><p>Abre o checklist do dia. Em cada item: Enter = OK, P = problema (vira chamado para a manutenção).</p>${poMsg()}</div></section>
    <div class="cq-tema">${ttSemCrachaOk()?'<button class="cq-sec" data-act="tt-sem">Estou sem crachá</button>':''}<button class="cq-sec" data-act="cq-tema">${cqEsc()?'Tela clara':'Tela escura'}</button><button class="cq-sec" data-act="cq-cheia">${document.fullscreenElement?'Sair da tela cheia':'Tela cheia'}</button><button class="cq-sec" data-act="po-sair">Sair</button></div>`); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="nx-css">
.nx-top{display:flex;flex-direction:column;gap:12px;padding:20px 24px;border-radius:18px;background:rgba(127,140,150,.12);border:1px solid rgba(127,140,150,.3)}
.nx-top>div:first-child{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}.nx-n{font-size:56px;line-height:1}.nx-n small{font-size:24px;opacity:.7}.nx-top span{font-size:20px;opacity:.85}.nx-top em{font-style:normal;color:#C0392B;font-weight:700}
.nx-bar{height:16px;border-radius:999px;background:rgba(127,140,150,.25);overflow:hidden}.nx-bar i{display:block;height:100%;background:#1F6E80;border-radius:999px}.nx-top.ok .nx-bar i,.nx-a.ok .nx-bar i{background:#2F8C5A}.nx-bar.sm{height:8px}
.nx-areas{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin:12px 0}.nx-a{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:14px;background:rgba(127,140,150,.12);border:1px solid rgba(127,140,150,.3)}.nx-a b{font-size:16px}.nx-a span{font-size:14px;opacity:.8}
</style>`);
