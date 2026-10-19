/* Painel Colafix · 24-silo-auto.js — desconto automático dos silos pelo apontamento: diagnóstico e configuração guiada.
   O desconto já existia (09-silos-final.js: siloProcessarEntrega); só funciona com: silo de cada linha (config/geral.siloConsumo),
   saldo inicial do silo (medição no sistema novo) e kg de cimento do produto (itens.kgCimento). Este quadro mostra o que falta e
   resolve ali mesmo; depois de salvar, os apontamentos que ficaram para trás são descontados (siloReconciliar). */
"use strict";
function saDiag(){ const ls=linhasOrd().filter(usaCimFab), map=S.cfg.siloConsumo||{}, cs=(S.cfg.silos||[]).filter(s=>s.grupo==='Cimento');
  const semSilo=ls.filter(l=>!map[l]), sids=[...new Set(ls.map(l=>map[l]).filter(Boolean))];
  const semSaldo=sids.filter(id=>{ const d=S.siloSaldo[id]; return !d||d.saldoKg==null; });
  const lim=addDias(hojeStr(),-30), an=anuladas(), semKg={};
  (S.entregas||[]).forEach(e=>{ if(e.anula||an.has(e._id)||!e.em||hojeStr(new Date(e.em))<lim) return; const o=ordById(e.ordem), l=(o&&o.linha)||e.linha; if(!l||!usaCimFab(l)) return;
    const cod=o?codigoDe(o):''; if(!cod||kgCimento(cod)>0) return; const k=cod.toUpperCase(); (semKg[k]=semKg[k]||{cod:k,n:0,desc:(itemDe(k)||{}).descricao||''}).n++; });
  const movs=(S.siloMov||[]), ult=movs.find(m=>m.tipo==='consumo'), recus=movs.filter(m=>m.tipo==='recusado'&&m.em>=addDias(hojeStr(),-7)+'T');
  return {ls,map,cs,semSilo,semSaldo,semKg:Object.values(semKg).sort((a,b)=>b.n-a.n),ult,recus,ok:!semSilo.length&&!semSaldo.length&&!Object.keys(semKg).length}; }
function saCard(){ if(!S.siloLido) return ''; const D=saDiag(), pode=siloPodeConfig(), medir=siloPodeMedir();
  if(D.ok){ const u=D.ult; return `<section class="card sa sa-ok"><i class="sa-dot"></i><div><b>Desconto automático funcionando</b><span>${u?`Último desconto: ${esc(new Date(u.em).toLocaleDateString('pt-BR'))} ${hora(u.em)} · ${esc(u.linha||'')} · ${fkg(-u.deltaKg)} do ${esc(siloNome(u.silo))}`:'Cada apontamento desconta do silo da linha: quantidade × kg de cimento do produto.'}${D.recus.length?` · <b style="color:var(--crit-ink)">${D.recus.length} desconto(s) recusado(s) por saldo insuficiente nos últimos 7 dias — registre uma medição</b>`:''}</span></div></section>`; }
  const passos=[];
  if(D.semSilo.length) passos.push(`<div class="sa-p"><b>1. Escolha o silo de cada linha</b><span>Sem isso, o apontamento não sabe de qual silo descontar.</span>
    <div class="sa-g">${D.semSilo.map(l=>`<label><span>${esc(l)}</span>${pode?`<select class="txt" data-sa-linha="${esc(l)}"><option value="">— escolha —</option>${D.cs.map(s=>`<option value="${esc(s.id)}">${esc(s.nome)}</option>`).join('')}<option value="-">Esta linha não usa cimento do silo</option></select>`:'<em>peça a quem configura</em>'}</label>`).join('')}</div>
    ${pode?'<button class="btn sec" data-act="sa-linhas">Salvar silos das linhas</button>':''}</div>`);
  if(D.semSaldo.length) passos.push(`<div class="sa-p"><b>${passos.length+1}. Registre o saldo de partida</b><span>O desconto começa a partir de uma medição feita no painel.</span>
    <div class="sa-g">${D.semSaldo.map(id=>`<div class="sa-s"><span>${esc(siloNome(id))}</span>${medir?`<button class="btn" data-act="sa-medir" data-sa-sel="${esc(id)}">Registrar medição</button>`:'<em>peça a quem mede</em>'}</div>`).join('')}</div></div>`);
  if(D.semKg.length) passos.push(`<div class="sa-p"><b>${passos.length+1}. Informe o kg de cimento destes produtos</b><span>Foram apontados nos últimos 30 dias e não descontaram nada, porque o cadastro não diz quanto cimento leva cada saco.</span>
    <div class="sa-g">${D.semKg.slice(0,12).map(x=>`<label><span>${esc(x.cod)} <small>${esc(x.desc.slice(0,34))} · ${x.n} apont.</small></span><input class="txt" data-sa-kg="${esc(x.cod)}" inputmode="decimal" placeholder="kg por saco" ${pode?'':'disabled'}></label>`).join('')}</div>
    ${pode?'<button class="btn sec" data-act="sa-kg">Salvar kg de cimento</button>':''}</div>`);
  return `<section class="card sa sa-falta"><div class="sa-h"><i class="sa-dot"></i><div><b>O nível dos silos ainda não baixa sozinho</b><span>Falta${passos.length===1?'':'m'} ${passos.length} passo${passos.length===1?'':'s'} para cada apontamento descontar do silo.</span></div></div>${passos.join('')}</section>`; }
/* o quadro entra logo depois do fim real do cabeçalho da tela (conta as divisões abertas dentro dele) */
function saDepoisDoHead(h){ const i=h.indexOf('<div class="head"'); if(i<0) return 0; const re=/<\/?div\b/g; re.lastIndex=i; let d=0, m; while((m=re.exec(h))){ if(m[0]==='<div') d++; else { d--; if(d===0) return h.indexOf('>',m.index)+1; } } return 0; }
{ const _vs=vSilos; vSilos=function(){ const h=_vs.apply(this,arguments), c=saCard(); if(!c) return h; const j=saDepoisDoHead(h); return j>0?h.slice(0,j)+c+h.slice(j):c+h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="sa-medir"],[data-act="sa-linhas"],[data-act="sa-kg"]'); if(!b) return;
  if(b.dataset.act==='sa-medir'){ if(!siloPodeMedir()) return toast('Você não possui permissão para registrar medição.'); const id=b.dataset.saSel; S.siloSel=id; S.sm={silo:id,kg:'',motivo:'Medição física',outro:'',obs:'',salvando:false}; render(); setTimeout(()=>{ const i=document.getElementById('sm-kg'); if(i){ i.focus(); i.scrollIntoView({block:'center'}); } },80); return; } /* ação própria: não confunde com o botão da tela do silo */
  if(!siloPodeConfig()) return;
  try{ if(b.dataset.act==='sa-linhas'){ const m=Object.assign({},S.cfg.siloConsumo||{}), sem=new Set(linhasSemCim()); let n=0;
      document.querySelectorAll('[data-sa-linha]').forEach(x=>{ const l=x.dataset.saLinha; if(x.value==='-'){ sem.add(l); n++; } else if(x.value){ m[l]=x.value; n++; } });
      if(!n) return toast('Escolha o silo de pelo menos uma linha.');
      await S.db.doc('config/geral').set({siloConsumo:m,linhasSemCimento:[...sem]},{merge:true}); S.cfg.siloConsumo=m; S.cfg.linhasSemCimento=[...sem]; toast('Silos das linhas salvos.'); }
    if(b.dataset.act==='sa-kg'){ let n=0, falt=[];
      for(const x of document.querySelectorAll('[data-sa-kg]')){ const v=numIn(x.value); if(!(v>0)) continue; const cod=x.dataset.saKg, it=(S.itens||[]).find(i=>String(i.codigo||'').toUpperCase()===cod);
        if(!it){ falt.push(cod); continue; } await S.db.doc('itens/'+it._id).update({kgCimento:v}); it.kgCimento=v; n++; }
      if(falt.length) toast('Não achei no cadastro de Itens: '+falt.join(', ')+'. Cadastre o item em Ajustes → Itens.'); else if(!n) return toast('Preencha o kg de cimento de pelo menos um produto.'); else toast(n+' produto(s) atualizado(s).'); }
    render(); setTimeout(()=>{ siloReconciliar().catch(()=>{}); },800); /* desconta os apontamentos que ficaram para trás */ }
  catch(e){ erro(e); } },true);
document.head.insertAdjacentHTML('beforeend',`<style id="sa-css">
.sa{display:flex;flex-direction:column;gap:12px;border-left:5px solid var(--warn)!important}.sa-ok{flex-direction:row;align-items:center;gap:12px;border-left-color:var(--ok)!important}
.sa b{display:block;font-size:16px}.sa span{display:block;font-size:14px;color:var(--muted)}.sa-h{display:flex;gap:12px;align-items:center}
.sa-dot{width:12px;height:12px;border-radius:50%;background:var(--warn);flex:none}.sa-ok .sa-dot{background:var(--ok)}
.sa-p{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:12px;background:var(--surface-2)}.sa-p>.btn{align-self:flex-start}
.sa-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:4px 0}.sa-g label,.sa-s{display:flex;flex-direction:column;gap:4px;font-size:14px}.sa-g small{color:var(--muted)}.sa-s .btn{align-self:flex-start}
</style>`);
/* ===FIM SILO AUTO=== */
