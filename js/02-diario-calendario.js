/* Painel Colafix · 02-diario-calendario.js — diário de bordo dos ranchos e calendário.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

document.addEventListener('dragend',ev=>{ if(!S.ord.drag) return; S.ord.drag=null; document.querySelectorAll('.orow.arrastando,.orow.ins-a,.orow.ins-d').forEach(x=>x.classList.remove('arrastando','ins-a','ins-d')); });
document.addEventListener('dragover',ev=>{ const D=S.ord.drag; if(!D) return; const t=ev.target.closest&&ev.target.closest('.orow[data-orow]'); document.querySelectorAll('.orow.ins-a,.orow.ins-d').forEach(x=>{ if(x!==t) x.classList.remove('ins-a','ins-d'); }); if(!t||t.dataset.orow===D.id) return; ev.preventDefault(); try{ ev.dataTransfer.dropEffect='move'; }catch(e){} const r=t.getBoundingClientRect(), antes=ev.clientY<r.top+r.height/2; t.classList.toggle('ins-a',antes); t.classList.toggle('ins-d',!antes); });
document.addEventListener('drop',ev=>{ const D=S.ord.drag; if(!D) return; const t=ev.target.closest&&ev.target.closest('.orow[data-orow]'); S.ord.drag=null; document.querySelectorAll('.orow.arrastando,.orow.ins-a,.orow.ins-d').forEach(x=>x.classList.remove('arrastando','ins-a','ins-d')); if(!t||t.dataset.orow===D.id) return; ev.preventDefault();
  const r=t.getBoundingClientRect(), antes=ev.clientY<r.top+r.height/2; const alvo=itemSeq(t.dataset.orow); if(!alvo) return;
  const lista=irmasCal(alvo).map(seqId).filter(x=>x!==D.id); const i=lista.indexOf(t.dataset.orow); lista.splice(antes?i:i+1,0,D.id);
  const mesma=D.l===t.dataset.ol&&D.d===t.dataset.od; reordenarCal(D.id,t.dataset.ol,t.dataset.od,mesma,lista); });

function modoTV(on){ document.body.classList.toggle('tv',on); const b=$('#tvbtn'); if(b){ b.setAttribute('aria-pressed',on); b.textContent=on?'SAIR DO MODO TV':'MODO TV'; }
  if(on){ S._temaAntes=document.documentElement.dataset.theme||''; document.documentElement.dataset.theme='dark'; const O=S.ord; S._tvAntes={de:O.de,ate:O.ate,mostrar:O.mostrar,linha:O.linha,view:S.view}; O.de=hojeStr(); O.ate=addDias(hojeStr(),1); O.mostrar='abertas'; go('tvfab'); }
  else { if(S._temaAntes) document.documentElement.dataset.theme=S._temaAntes; else delete document.documentElement.dataset.theme; const a=S._tvAntes; if(a){ Object.assign(S.ord,{de:a.de,ate:a.ate,mostrar:a.mostrar,linha:a.linha}); S._tvAntes=null; } render(); }
  try{ localStorage.setItem('colafix-tv',on?'1':''); }catch(e){} }
document.addEventListener('click',ev=>{ if(ev.target.closest&&ev.target.closest('.oseqn')) ev.stopPropagation(); },true);
document.addEventListener('pointerdown',ev=>{ const t=ev.target.closest&&ev.target.closest('.oseqn'); if(!t) return; const r=t.closest('[draggable]'); if(r) r.setAttribute('draggable','false'); });
document.addEventListener('focusin',ev=>{ if(ev.target.classList&&ev.target.classList.contains('oseqn')){ const r=ev.target.closest('[draggable]'); if(r) r.setAttribute('draggable','false'); ev.target.select(); } });
document.addEventListener('focusout',ev=>{ if(ev.target.classList&&ev.target.classList.contains('oseqn')){ const r=ev.target.closest('[draggable]'); if(r) r.setAttribute('draggable','true'); } });
document.addEventListener('keydown',ev=>{ const t=ev.target; if(!t.classList||!t.classList.contains('oseqn')) return; if(ev.key==='Enter'){ ev.preventDefault(); t.blur(); } else if(ev.key==='Escape'){ t.value=t.defaultValue; t.blur(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t.dataset||!t.dataset.seqn) return; const n=parseInt(String(t.value).replace(/\D/g,''),10); if(!(n>=1)){ t.value=t.defaultValue; return; } moverPara(t.dataset.seqn,n); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="tv"]'); if(!b) return; modoTV(!document.body.classList.contains('tv')); });
setTimeout(()=>{ try{ if(localStorage.getItem('colafix-tv')==='1') modoTV(true); }catch(e){} },300);

// ---------- ações ----------
async function ordUpd(id,u,msg){ if(!S.db){ toast('Sem conexão com o armazenamento.'); return false; } try{ await S.db.doc('ordens/'+id).update(u); if(msg) toast(msg); return true; }catch(e){ erro(e); return false; } }
const ordById=id=>S.ordens.find(o=>o._id===id);
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act^="o-"]'); if(!b||b.disabled) return; const act=b.dataset.act, O=S.ord;
  if(act==='o-anexar-rancho'){ ev.stopPropagation(); const o=ordById(b.dataset.id); const h=hojeStr(); const R=S.rch; R.dia=o&&dataEf(o)>h?dataEf(o):h; R.linha=''; R.busca=''; R.fora=new Set(); R.soSel=false; go('ranchos'); const f=$('#r-file'); if(f){ f.scrollIntoView({block:'center'}); try{ f.click(); }catch(e){} } toast('Escolha o PDF do rancho'+(o?' da ordem '+o.num:'')+'. Ele é ligado às ordens pelo número.'); return; }
  if(act==='o-obs-add'){ const o=ordById(b.dataset.id); if(!o) return; const t=(($('#o-obs-txt')||{}).value||'').trim(); if(!t){ toast('Escreva a observação.'); const x=$('#o-obs-txt'); x&&x.focus(); return; }
    const it={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:t.slice(0,1000),em:new Date().toISOString(),por:S.uid||null};
    if(await ordUpd(o._id,{obsList:(o.obsList||[]).concat([it]).slice(-100)},'Observação salva na ordem '+o.num)){ o.obsList=(o.obsList||[]).concat([it]); O.f.obsTxt=''; render(); } return; }
  if(act==='o-obs-rem'){ const o=ordById(b.dataset.id); if(!o) return; const l=(o.obsList||[]).map(x=>x.id===b.dataset.v?Object.assign({},x,{removida:true,removidaEm:new Date().toISOString(),removidaPor:S.uid||null}):x);
    if(await ordUpd(o._id,{obsList:l},'Observação removida')){ o.obsList=l; render(); } return; }
  if(act==='o-passar'){ ev.stopPropagation(); const l=b.dataset.v, h=hojeStr(), am=amanhaStr(); const kd=x=>{ const d=dataEf(x); return d<h?h:d; };
    const mover=ordAbertas().filter(o=>o.linha===l&&kd(o)===h&&o.total-entregueDe(o)>0).sort(seqCmp); if(!mover.length) return;
    const jaAm=ordAbertas().concat(prevAtivas()).filter(x=>x.linha===l&&kd(x)===am).sort(seqCmp);
    let ok=0; for(const o of mover){ if(await ordUpd(o._id,{continuaEm:am,hist:histAdd(o,'Passou para '+dm(am)+' (não finalizou)')})){ o.continuaEm=am; ok++; } }
    const lista=mover.concat(jaAm).map(seqId); await reordenarCal(lista[0],l,null,true,lista);
    toast(`${ok} ${ok===1?'ordem passou':'ordens passaram'} para amanhã (${dm(am)}) na frente da fila.`); render(); return; }
  if(act==='o-seq'){ ev.stopPropagation(); moverSeq(b.dataset.id,+b.dataset.v); return; }
  if(act==='o-prev-ir'||act==='o-prev-conf'){ ev.stopPropagation(); if(ev.target.closest('[data-act^="pv-"],input,.oseq,[data-act="o-copiar"]')) return; const p=(S.previsoes||[]).find(x=>x._id===b.dataset.id); if(!p) return;
    if(act==='o-prev-conf'){ S.pv.conf[p._id]=''; render(); const e=document.querySelector(`[data-pv-num="${CSS.escape(p._id)}"]`); e&&e.focus(); return; }
    S.pv.f={_id:p._id,produto:p.produto,qtd:p.qtd!=null?String(p.qtd).replace('.',','):'',linha:p.linha,data:p.data,obs:p.obs||''}; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(act==='o-ens-salvar'){ const o=ordById(b.dataset.id); if(!o) return; const ens=String((($('#o-ent-ens')||{}).value)||'').replace(/\D/g,''); if(!ens){ toast('Digite o número da ordem de ensacado.'); const x=$('#o-ent-ens'); x&&x.focus(); return; }
    if(await ordUpd(o._id,{ensaca:ens,hist:histAdd(o,'Ordem de ensacado '+ens)},'Ensacado '+ens+' salvo na ordem '+o.num)){ o.ensaca=ens; O.f.ens=''; await vincularEnsaca(ens,o.num); render(); } return; }
  if(act==='o-copiar-nums'){ const t=(S._nums||[]).join(','); if(!t) return; const n=S._numsN||0, ne=S._numsE||0; const ok=()=>toast(n+(n===1?' ordem':' ordens')+(ne?' + '+ne+' ensacado'+(ne===1?'':'s'):'')+' copiad'+(n+ne===1?'a':'as')+': '+(t.length>60?t.slice(0,60)+'…':t)); try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,()=>copiarAntigo(t,ok)); return; } }catch(e){} copiarAntigo(t,ok); return; }
  if(act==='o-copiar'){ ev.stopPropagation(); copiarTexto(b.dataset.v,b.dataset.k); return; }
  if(act==='o-fechar-modal'){ if(ev.target!==b&&!b.dataset.x) return; O.aberta=null; O.confCancel=null; render(); return; }
  if(act==='o-abrir'){ if(ev.target.closest('[data-act^="db-"],[data-act^="cst-"],select[data-pri]')||ev.target.closest('.odet')||ev.target.closest('[data-act^="fp-"]')||ev.target.closest('[data-act="r-ver"]')) return; O.aberta=O.aberta===b.dataset.id?null:b.dataset.id; O.painel='entrega'; O.f={}; O.antec=null; O.confCancel=null; S.horaMan.ent=null; render(); return; }
  if(act==='o-div'){ O.div=!O.div; render(); return; }
  if(act==='o-div-ok'){ ev.stopPropagation&&ev.stopPropagation(); const o=ordById(b.dataset.id); if(!o) return; if(await ordUpd(o._id,{divOk:o.pendSistema,hist:histAdd(o,'Diferença com o sistema conferida (sistema '+fq(o.pendSistema)+')')},'Ordem '+o.num+' saiu da lista de diferenças.')){ o.divOk=o.pendSistema; render(); } return; }
  if(act==='o-div-ir'){ const o=ordById(b.dataset.id); if(!o) return; const d=S._div; O.busca=''; O.de=''; O.ate=''; O.linha=o.linha||'todas'; O.mostrar=o.status==='aberta'?'abertas':'todas'; O.aberta=o._id; O.f={}; O.painel=(d&&d.fora.includes(o))?'encerrar':o.status==='aberta'?'entrega':'editar'; if(!o.linha){ go('aprogramar'); return; } render(); setTimeout(()=>{ const el=document.querySelector(`.orow[data-id="${CSS.escape(o._id)}"]`); el&&el.scrollIntoView({behavior:'smooth',block:'center'}); },50); return; }
  if(act==='o-linha'){ O.linha=b.dataset.v; O.aberta=null; render(); return; }
  if(act==='o-per'){ const v=b.dataset.v, hj=hojeStr(), am=amanhaStr(), sg=segundaStr(new Date());
    const m={tudo:['',''],hoje:[hj,hj],amanha:[am,am],hojeam:[hj,am],semana:[sg,addDias(sg,5)]}; O.aberta=null;
    O.perOutro=!m[v]; if(m[v]){ [O.de,O.ate]=m[v]; render(); return; } render(); const d=$('#o-de'); if(d){ d.focus(); try{ d.showPicker(); }catch(e){} } return; }
  if(act==='o-datas-limpar'){ O.de=''; O.ate=''; O.perOutro=false; O.aberta=null; render(); return; }
  if(act==='o-mostrar'){ O.mostrar=b.dataset.v; O.aberta=null; render(); return; }
  if(act==='o-tipo'){ O.tipo=b.dataset.v; render(); return; }
  if(act==='o-limpar-filtros'){ O.tipo='todas'; O.linha='todas'; O.mostrar='abertas'; O.de=''; O.ate=''; O.perOutro=false; O.busca=''; O.aberta=null; render(); return; }
  if(act==='o-busca-todos'){ O.linha='todas'; O.mostrar='todas'; O.de=''; O.ate=''; O.aberta=null; render(); return; }
  if(act==='o-painel'){ O.painel=b.dataset.v; O.f={}; O.confCancel=null; render(); return; }
  if(act==='o-usar-pal'){ O.f.porPal='88'; render(); const p=$('#o-pal'); p&&p.focus(); return; }
  if(act==='o-fech'){ O.f.fech=b.dataset.v; render(); return; }
  if(act==='o-imp-abrir'||act==='o-imp-abrir2'){ S.imp={aberto:!S.imp.aberto,texto:'',prev:null}; render(); return; }
  if(act==='o-imp-fechar'){ S.imp={aberto:false,texto:'',prev:null}; render(); return; }
  if(act==='o-imp-conf'){ gravarImp(); return; }
  if(act==='o-nova-linha'){ O.nova=true; O.nf={linha:b.dataset.v,data:hojeStr(),turno:'Dia todo',tipo:O.nf&&O.nf.tipo||'ordem'}; render(); const sct=document.querySelector('[aria-label="Nova ordem"]'); sct&&sct.scrollIntoView({block:'center',behavior:'smooth'}); const n=$(O.nf.tipo==='prev'?'#o-n-produto':'#o-n-num'); n&&n.focus(); return; }
  if(act==='o-nova-tipo'){ O.nf.tipo=b.dataset.v; render(); return; }
  if(act==='o-nova-abrir'){ O.nova=!O.nova; O.nf={linha:O.linha!=='todas'?O.linha:linhasOrd()[0],data:hojeStr(),turno:'Dia todo'}; render(); const n=$('#o-n-num'); n&&n.focus(); return; }
  if(act==='o-nova-fechar'){ O.nova=false; render(); return; }
  if(act==='o-nova-salvar'&&O.nf.tipo==='prev'){ const f=O.nf; const prod=String(f.produto||'').trim().replace(/\s+/g,' '); const qtd=numQ(f.total);
    if(!prod){ toast('Informe o produto.'); return; } if(!(qtd>0)){ toast('Informe a quantidade.'); return; } if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    const d={produto:prod,codigo:codigoDe({produto:prod}),qtd,linha:f.linha||linhasOrd()[0],data:f.data||hojeStr(),turno:f.turno||'Dia todo',obs:String(f.obs||'').trim(),status:'prevista',criadoEm:new Date().toISOString(),por:S.uid};
    try{ await S.db.collection('previsoes').add(d); O.nova=false; toast('Programação sem número salva · '+d.linha+' · '+dmTxt(d.data)); render(); }catch(e){ erro(e); } return; }
  if(act==='o-nova-salvar'){ const f=O.nf; const num=String(f.num||'').replace(/\D/g,''); const total=numIn(String(f.total||'').replace(/\./g,''));
    if(!num){ toast('Informe o número da ordem.'); return; } if(!total||total<=0){ toast('Informe a quantidade total.'); return; }
    if(!(f.produto||'').trim()){ toast('Informe o produto.'); return; }
    if(precisaEns(f.produto)&&!String(f.ensaca||'').replace(/\D/g,'')){ toast('Rejunte flexível ou siliconizado: informe a ordem de ensacado.'); const x=$('#o-n-ensaca'); x&&x.focus(); return; }
    if(S.ordens.some(o=>String(o.num)===num&&o.status==='aberta'&&o.linha)){ toast('A ordem '+num+' já está aberta na programação.'); return; }
    if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    const fila=S.ordens.find(o=>String(o.num)===num&&!o.linha);
    const d={num,produto:f.produto.trim().replace(/\s+/g,' '),linha:f.linha||linhasOrd()[0],data:f.data||hojeStr(),turno:f.turno||'Dia todo',total,status:'aberta',origem:'manual',criadaEm:new Date().toISOString(),por:S.uid};
    if(f.ate&&f.ate>(d.data||'')){ d.ate=f.ate; d.hist=histAdd({},'Vai produzir por vários dias, até '+dm(f.ate)); } /* ordem de vários dias já na criação (o painel de cada ordem também tem "Vários dias") */
    const ens=String(f.ensaca||'').replace(/\D/g,''); if(ens) d.ensaca=ens;
    try{ if(fila) await S.db.doc('ordens/'+fila._id).update(Object.assign(d,{hist:histAdd(fila,'Programada na '+d.linha+' para '+dm(d.data))}));
      else { const id=S.ordens.some(o=>o._id===num)?num+'-'+Date.now().toString(36):num; await S.db.doc('ordens/'+id).set(d); }
      if(ens) await vincularEnsaca(ens,num);
      O.nova=false; toast('Ordem '+num+' criada na '+d.linha+' · '+dmTxt(d.data)); render(); }catch(e){ erro(e); } return; }
  if(act==='o-lancar'){ const o=ordById(b.dataset.id); if(!o) return; const c=entCalc(); if(!(c.q>0)){ toast('Informe paletes ou quantidade.'); return; }
    if(faltaEns(o)){ const ens=String((($('#o-ent-ens')||{}).value)||O.f.ens||'').replace(/\D/g,''); if(!ens){ toast('Informe a ordem de ensacado antes de lançar.'); const x=$('#o-ent-ens'); x&&x.focus(); return; }
      if(!(await ordUpd(o._id,{ensaca:ens,hist:histAdd(o,'Ordem de ensacado '+ens)}))) return; o.ensaca=ens; await vincularEnsaca(ens,o.num); }
    const an=O.antec&&O.antec.on; let h;
    if(an){ const dt=new Date(O.antec.val||localVal(proxApont())); if(isNaN(dt)){ toast('Horário do apontamento antecipado inválido.'); return; } if(dt.getTime()<=Date.now()){ toast('No apontamento antecipado o horário precisa ser futuro. Para um horário que já passou, use "Informar outro dia e hora".'); return; } if(dt.getTime()>Date.now()+48*3600e3){ toast('O apontamento antecipado pode ser de até 48 horas à frente.'); return; } h={iso:dt.toISOString(),manual:false}; }
    else { h=horaDe('ent'); if(h.erro){ toast(h.erro); return; } }
    const X=entExced(o);
    if(X&&!O.f.force){ const rows=(O.f.comp||[]).map(r=>({n:String(r.n||'').replace(/\D/g,''),q:numQ(r.q)||0})).filter(r=>r.n||r.q);
      if(!rows.length||rows.some(r=>!r.n)){ toast('Informe o número da ordem complementar.'); const x=document.querySelector('[data-comp][data-k="n"]'); x&&x.focus(); return; }
      if(rows.some(r=>!(r.q>0))){ toast('Informe a quantidade de cada ordem complementar.'); return; }
      if(rows.some(r=>r.n===String(o.num))){ toast('A ordem complementar tem que ser diferente da '+o.num+'.'); return; }
      if(new Set(rows.map(r=>r.n)).size!==rows.length){ toast('Ordem complementar repetida.'); return; }
      const soma=rows.reduce((a,r)=>a+r.q,0); if(Math.abs(soma-X.x)>0.001){ toast('As complementares somam '+fq(soma)+', mas '+(X.tudo?'a quantidade':'o excedente')+' é '+fq(X.x)+'.'); return; }
      if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
      if(X.pend>0){ const d0={ordem:o._id,num:o.num,linha:o.linha,em:h.iso,por:S.uid,qtd:Math.round(X.pend*1000)/1000,avulso:Math.round(X.pend*1000)/1000,excedenteEm:rows.map(r=>r.n)}; { const ob=(($('#o-ent-obs')||{}).value||'').trim(); if(ob) d0.obs=ob.slice(0,500); } marcaManual(d0,h); if(an){ d0.antecipado=true; d0.registradoEm=new Date().toISOString(); } if(!(await salvar('entregas',d0))) return; }
      const res=await lancarComplementares(o,rows,h,an); if(!res) return;
      await ordUpd(o._id,{hist:histAdd(o,(X.tudo?'Produção de '+fq(X.x)+' lançada em complementar: ':'Excedente de '+fq(X.x)+' lançado em complementar: ')+rows.map(r=>r.n+' ('+fq(r.q)+')').join(', '))});
      O.f={}; O.antec=null; S.horaMan.ent=null; toast(X.tudo?'Lançado em complementar: '+res.map(r=>r.n+' +'+fq(r.q)+(r.nova?' (criada)':'')).join(', '):'Ordem '+o.num+': +'+fq(X.pend)+' (completa) · excedente em '+res.map(r=>r.n+' +'+fq(r.q)+(r.nova?' (criada)':'')).join(', ')); if(!X.tudo) O.painel='encerrar'; render(); return; }
    const d={ordem:o._id,num:o.num,linha:o.linha,em:h.iso,por:S.uid,qtd:Math.round(c.q*1000)/1000}; if(c.pal){ d.pal=c.pal; d.porPal=c.pp; } if(c.fd){ d.fardos=c.fd; d.porFardo=c.pf; } if(c.av) d.avulso=c.av; { const ob=(($('#o-ent-obs')||{}).value||'').trim(); if(ob) d.obs=ob.slice(0,500); } marcaManual(d,h); if(an){ d.antecipado=true; d.registradoEm=new Date().toISOString(); }
    if(await salvar('entregas',d)){ const pen=o.total-entregueDe(o)-d.qtd; O.f={}; O.antec=null; S.horaMan.ent=null; toast(`Ordem ${o.num}: +${fq(d.qtd)}${an?' (antecipado para '+dia(d.em).toLowerCase()+' '+hora(d.em)+')':''} · pendente ${fq(pen)}`);
      if(pen<=0){ O.painel='encerrar'; } render(); } return; }
  if(act==='o-desfazer'){ const x=S.entregas.find(e=>e._id===b.dataset.id); if(!x) return;
    if(await salvar('entregas',{ordem:x.ordem,num:x.num,anula:x._id,em:new Date().toISOString(),por:S.uid,qtd:0})) toast('Entrega de '+fq(x.qtd)+' desfeita. O registro continua no histórico.'); return; }
  if(act==='o-pmx'){ ev.stopPropagation&&ev.stopPropagation(); const o=ordById(b.dataset.id); if(!o) return; const it=pmxCorDoRancho(o).find(x=>x.c===b.dataset.c); if(!it) return;
    const rec=pmxRecAtivas().find(r=>String(r.nome||'').toUpperCase().startsWith(String(it.c).toUpperCase()));
    pmxNovaFicha(rec?rec._id:null); const E=S.pmx.ed; if(!rec) E.material=it.c+' '+it.d; E.qtd=String(+it.q||''); E.rancho=o.rancho; E.ordemRef=String(o.num); E.obs='Rancho '+o.rancho+' · ordem '+o.num+' ('+codigoDe(o)+')';
    render(); toast(rec?'Ficha de '+it.c+' pronta: confira e salve.':'Não achei a receita '+it.c+' cadastrada: escolha a receita na ficha.'); return; }
  if(act==='o-pmx-ver'){ ev.stopPropagation&&ev.stopPropagation(); go('pmxfichas'); if(pmxPodeEd()) pmxAbrirFicha(b.dataset.id); return; }
  if(act==='o-ate'||act==='o-ate-x'){ const o=ordById(b.dataset.id); if(!o) return; const v=act==='o-ate-x'?'':String(($('#o-dias-ate')||{}).value||'');
    if(act==='o-ate'&&!v){ toast('Escolha o último dia.'); return; } if(v&&v<=ateIni(o)){ toast('O último dia tem que ser depois de '+dm(ateIni(o))+'.'); return; }
    if(await ordUpd(o._id,{ate:v||null,hist:histAdd(o,v?'Vai produzir por vários dias, até '+dm(v):'Voltou a ser de um dia só')},v?'Ordem '+o.num+' registrada até '+dm(v)+'.':'Ordem '+o.num+' volta a ser de um dia só.')){ o.ate=v||null; render(); } return; }
  if(act==='o-continua'){ const o=ordById(b.dataset.id); if(!o) return; const d=($('#o-cont-data')||{}).value; if(!d){ toast('Escolha a data.'); return; }
    if(await ordUpd(o._id,{continuaEm:d,hist:histAdd(o,'Continua em '+dm(d))},'Ordem '+o.num+' continua '+dmTxt(d).toLowerCase())){ O.aberta=null; render(); } return; }
  if(act==='o-encerrar'){ const o=ordById(b.dataset.id); if(!o) return; const f=O.f.fech||sugerirFech(o); const fob=(($('#o-fech-obs')||{}).value||'').trim().slice(0,1000);
    const u={status:'encerrada',fechamento:f,fimEm:new Date().toISOString(),porFim:S.uid,hist:histAdd(o,'Encerrada: '+FECH[f].n.toLowerCase()+' ('+fq(entregueDe(o))+' de '+fq(o.total)+')'+(fob?' · obs: '+fob:''))};
    if(fob){ u.fechObs=fob; u.obsList=(o.obsList||[]).concat([{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:'Encerramento: '+fob,em:u.fimEm,por:S.uid||null}]).slice(-100); }
    if(await ordUpd(o._id,u,'Ordem '+o.num+' encerrada · '+FECH[f].n)){ O.aberta=null; render(); } return; }
  if(act==='o-reabrir'){ const o=ordById(b.dataset.id); if(!o) return; if(await ordUpd(o._id,{status:'aberta',hist:histAdd(o,'Reaberta')},'Ordem '+o.num+' reaberta')) render(); return; }
  if(act==='o-cancel-nao'){ O.confCancel=null; render(); return; }
  if(act==='o-cancelar'){ const o=ordById(b.dataset.id); if(!o) return; if(O.confCancel!==o._id){ O.confCancel=o._id; render(); return; }
    if(await ordUpd(o._id,{status:'cancelada',fimEm:new Date().toISOString(),porFim:S.uid,hist:histAdd(o,'Cancelada')},'Ordem '+o.num+' cancelada')){ O.aberta=null; O.confCancel=null; render(); } return; }
  if(act==='o-salvar-ed'){ const o=ordById(b.dataset.id); if(!o) return; const g=id=>($('#'+id)||{}).value;
    const u={linha:g('o-e-linha'),data:g('o-e-data')||o.data,turno:g('o-e-turno'),produto:(g('o-e-produto')||'').trim()||o.produto};
    const nn=String(g('o-e-num')||'').replace(/\D/g,''); if(!nn){ toast('Informe o número da ordem.'); const x=$('#o-e-num'); x&&x.focus(); return; }
    if(nn!==String(o.num)){ const dup=S.ordens.find(x=>x._id!==o._id&&String(x.num)===nn&&x.status==='aberta'); if(dup){ toast('Já existe outra ordem aberta com o número '+nn+(dup.linha?' na '+dup.linha:'')+'.'); return; } u.num=nn; }
    const t=numIn(String(g('o-e-total')||'').replace(/\.(?=\d{3})/g,'')); if(!(t>0)){ toast('Quantidade total inválida.'); return; } u.total=t;
    const ens=String(g('o-e-ensaca')||'').replace(/\D/g,''); if(!ens&&precisaEns(u.produto)){ toast('Rejunte flexível ou siliconizado: a ordem de ensacado é obrigatória.'); const x=$('#o-e-ensaca'); x&&x.focus(); return; } u.ensaca=ens||null; const ran=String(g('o-e-rancho')||'').trim(); u.rancho=ran||null;
    const mud=[]; if(u.num) mud.push('nº '+o.num+' → '+u.num); if(u.linha!==o.linha) mud.push('linha '+(o.linha||'—')+' → '+u.linha); if(u.data!==o.data) mud.push('data '+dm(o.data)+' → '+dm(u.data)); if(u.turno!==(o.turno||'Dia todo')) mud.push('turno → '+u.turno); if(Math.abs(u.total-o.total)>0.0001) mud.push('total '+fq(o.total)+' → '+fq(u.total)); if(u.produto!==o.produto) mud.push('produto alterado'); if((u.ensaca||'')!==(o.ensaca||'')) mud.push('ordem de ensacado → '+(u.ensaca||'nenhuma')); if((u.rancho||'')!==(o.rancho||'')) mud.push('rancho → '+(u.rancho||'nenhum'));
    if(!mud.length){ toast('Nada mudou.'); return; }
    if(u.data!==o.data&&o.continuaEm&&o.continuaEm<=u.data) u.continuaEm=null;
    u.hist=histAdd(o,'Editada: '+mud.join(', '));
    if(await ordUpd(o._id,u,'Ordem '+(u.num||o.num)+' atualizada')){ if(u.num){ o.num=u.num; for(const x of (S.entregas||[]).filter(e=>e.ordem===o._id&&String(e.num)!==u.num)){ try{ await S.db.doc('entregas/'+x._id).update({num:u.num}); }catch(e){} } } if(ens) await vincularEnsaca(ens,o.num); O.painel='entrega'; O.f={}; render(); } return; }
  if(act==='o-programar'){ const o=ordById(b.dataset.id); if(!o) return; const f=O.pf[o._id]||{}; const linha=f.linha, data=f.data||(o.dtIni&&o.dtIni>hojeStr()?o.dtIni:hojeStr());
    if(!linha){ toast('Escolha a linha.'); const s=document.querySelector(`select[data-pf="linha"][data-id="${CSS.escape(o._id)}"]`); s&&s.focus(); return; }
    if(await ordUpd(o._id,{linha,data,turno:'Dia todo',hist:histAdd(o,'Programada na '+linha+' para '+dm(data))},'Ordem '+o.num+' programada na '+linha+' · '+dmTxt(data))){ delete O.pf[o._id]; render(); } return; }
  if(act==='o-ignorar'){ const o=ordById(b.dataset.id); if(!o) return; if(await ordUpd(o._id,{status:'ignorada',hist:histAdd(o,'Marcada como não é de linha')},'Ordem '+o.num+' tirada da fila')) render(); return; }
  if(act==='o-designorar'){ const o=ordById(b.dataset.id); if(!o) return; if(await ordUpd(o._id,{status:'aberta',linha:null,hist:histAdd(o,'Voltou para a fila')},'Ordem '+o.num+' voltou para a fila')) render(); return; }
});
async function vincularEnsaca(ens,num){ const e=S.ordens.find(o=>String(o.num)===ens&&!o.linha&&o.status==='aberta'); if(!e) return;
  try{ await S.db.doc('ordens/'+e._id).update({status:'vinculada',vinculadaA:String(num),hist:histAdd(e,'Ligada como ordem de ensacado da ordem '+num)}); }catch(err){} }
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.ord.aberta&&document.querySelector('.omodal')){ S.ord.aberta=null; render(); } });
document.addEventListener('keydown',ev=>{ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&ev.target.classList.contains('orow')&&ev.target.dataset.act){ ev.preventDefault(); ev.target.click(); } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id!=='c-data'||!t.value) return; S.cal.ini=segundaStr(new Date(t.value+'T12:00:00')); render(); });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='c-busca') return; const C=S.cal; C.busca=t.value; clearTimeout(C._bt); C._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#c-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='apt-data'){ S.apt.data=t.value||hojeStr(); render(); } else if(t.id==='apt-atras'){ S.apt.atras=t.checked; render(); } });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='apt-busca') return; const A=S.apt; A.busca=t.value; clearTimeout(A._bt); A._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#apt-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); });
document.addEventListener('change',ev=>{ const t=ev.target; if(!t.dataset||!t.dataset.aptSel) return; const id=t.dataset.aptSel, A=S.apt; A.sel=A.sel.filter(x=>x!==id); if(t.checked) A.sel.push(id); render(); });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='o-ent-obs'){ S.ord.f.entObs=t.value; return; } if(t.id==='o-fech-obs'){ S.ord.f.fechObs=t.value; return; } if(t.dataset&&t.dataset.aptObs){ S.apt.obs=S.apt.obs||{}; S.apt.obs[t.dataset.aptObs]=t.value; return; } if(!t.dataset||!t.dataset.aptId) return; const id=t.dataset.aptId, k=t.dataset.aptK; const v=t.value.replace(/[^0-9.,]/g,''); if(v!==t.value) t.value=v; const A=S.apt; A.v[id]=Object.assign(A.v[id]||{},{[k]:v}); const o=S.ordens.find(x=>x._id===id); const r=document.querySelector(`[data-apt-res="${CSS.escape(id)}"]`); if(o&&r) r.innerHTML=aptRes(o); });
document.addEventListener('change',ev=>{ const t=ev.target, O=S.ord;
  if(t.id==='o-antec-tog'){ O.antec={on:t.checked,val:(O.antec&&O.antec.val)||localVal(proxApont())}; if(t.checked) S.horaMan.ent=null; render(); return; }
  if(t.id==='o-antec-val'){ O.antec=Object.assign(O.antec||{on:true},{val:t.value}); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id!=='o-de'&&t.id!=='o-ate') return; const O=S.ord; O[t.id==='o-de'?'de':'ate']=t.value||''; if(O.de&&O.ate&&O.de>O.ate){ if(t.id==='o-de') O.ate=O.de; else O.de=O.ate; } O.aberta=null; render(); });
document.addEventListener('input',ev=>{ const t=ev.target, O=S.ord;
  if(t.id==='o-obs-txt'){ O.f.obsTxt=t.value; return; }
  if(t.id==='o-ent-ens'){ const v=t.value.replace(/\D/g,''); if(v!==t.value) t.value=v; O.f.ens=v; return; }
  if(t.id==='db-busca'){ S.dbo.q=t.value; clearTimeout(S.dbo._bt); S.dbo._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#db-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); return; }
  if(t.id==='o-busca'){ O.busca=t.value; clearTimeout(O._bt); O._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#o-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); return; }
  if(t.id==='o-pal'||t.id==='o-porpal'||t.id==='o-av'||t.id==='o-fd'){ const v=t.value.replace(/[^0-9.,]/g,''); if(v!==t.value) t.value=v; O.f[t.id==='o-pal'?'pal':t.id==='o-porpal'?'porPal':t.id==='o-fd'?'fd':'av']=v; const o=ordById(O.aberta); const r=$('#o-ent-res'); if(o&&r) r.innerHTML=entRes(o); if(o) entCompAtualiza(o); return; }
  if(t.id==='o-cont-data'){ O.f.cont=t.value; return; }
  if(t.id==='o-imp-txt'){ S.imp.texto=t.value; S.imp.nome=''; clearTimeout(S.imp._t); S.imp._t=setTimeout(()=>{ previaImp(); const pos=t.selectionStart; render(); const n=$('#o-imp-txt'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },500); return; }
  if(t.id&&t.id.startsWith('o-n-')){ O.nf[t.id.slice(4)]=t.value; if(t.id==='o-n-produto'){ const a=$('#o-n-aviso'); if(a) a.innerHTML=avisoProdLinha(O.nf); } return; }
});
document.addEventListener('change',ev=>{ const t=ev.target, O=S.ord;
  if(t.id==='o-imp-file'&&t.files&&t.files[0]){ const file=t.files[0]; const r=new FileReader();
    r.onload=()=>{ let txt=String(r.result||''); if(txt.includes('\uFFFD')){ const r2=new FileReader(); r2.onload=()=>{ S.imp.texto=String(r2.result||''); S.imp.nome=file.name; previaImp(); render(); }; r2.readAsText(file,'ISO-8859-1'); return; }
      S.imp.texto=txt; S.imp.nome=file.name; previaImp(); render(); };
    r.readAsText(file,'UTF-8'); return; }
  if(t.dataset&&t.dataset.pf){ const id=t.dataset.id; O.pf[id]=Object.assign(O.pf[id]||{},{[t.dataset.pf]:t.value}); return; }
  if(t.id&&t.id.startsWith('o-n-')){ O.nf[t.id.slice(4)]=t.value; if(t.id==='o-n-linha'){ const a=$('#o-n-aviso'); if(a) a.innerHTML=avisoProdLinha(O.nf); const dl=$('#o-prods'); if(dl) dl.innerHTML=prodsDaLinha(O.nf.linha).map(p=>`<option value="${esc(p)}">`).join(''); } if(t.id==='o-n-produto'){ const a=$('#o-n-aviso'); if(a) a.innerHTML=avisoProdLinha(O.nf); } return; }
});

// ================= FOLHA DE PRODUÇÃO (mesmo modelo do Apps Script) =================
function semAcento(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''); }
function dataBR(s){ if(!s) return ''; const p=String(s).split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:String(s); }
function statusFolha(o){ const e=entregueDe(o); if(o.status==='aberta'){ if(o.continuaEm&&o.continuaEm>(o.data||'')) return 'CONTINUAÇÃO (desde '+dataBR(o.data)+')'; return e>0?'EM PRODUÇÃO':'PROGRAMAÇÃO LIBERADA'; } return stInfo(o,e).t.toUpperCase(); }
const LINK_PAINEL='https://claude.ai/artifact/DAXN22FZGyfvxgVkKaA9WB';
function linkRancho(n){ const n2=encodeURIComponent(n); return ((window.claude&&window.claude.link)||(S.cfg&&S.cfg.linkPainel)||LINK_PAINEL)+'?rancho='+n2; }
function desenharQR(pdf,txt,x,y,tam){ if(typeof qrcode!=='function') return; const q=qrcode(0,'M'); q.addData(txt); q.make(); const n=q.getModuleCount(), m=tam/n;
  const qz=Math.max(1,m*4); pdf.setFillColor(255,255,255); pdf.rect(x-qz,y-qz,tam+2*qz,tam+2*qz,'F'); pdf.setFillColor(0,0,0);
  for(let r=0;r<n;r++){ let c=0; while(c<n){ if(q.isDark(r,c)){ let c2=c; while(c2+1<n&&q.isDark(r,c2+1)) c2++; pdf.rect(x+c*m,y+r*m,(c2-c+1)*m+0.02,m+0.02,'F'); c=c2+1; } else c++; } } }
function desenharFolhaProducao(pdf,o,dia,logo){
  const ML=10,LARGURA=190,PAGE_H=297,MB=10,Y_RODAPE=PAGE_H-MB-95;
  const e=entregueDe(o), pend=Math.max(0,o.total-e);
  const produto=o.produto||'', ordem=String(o.num), turno=String(o.turno||'Dia todo').toUpperCase(), qtde=f0(o.total), pendente=fq(pend), status=statusFolha(o), data=dataBR(dia||dataEf(o)), linha=o.linha||'';
  function campo(x,yy,w,h,label,valor){
    pdf.setFontSize(7);pdf.setFont('helvetica','bold');pdf.text(label,x+1,yy-1.2);
    pdf.setDrawColor(180,180,180);pdf.rect(x,yy,w,h);pdf.setDrawColor(0,0,0);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);
    pdf.text(pdf.splitTextToSize(String(valor),w-4),x+3,yy+6);
  }
  let y=6;
  /* cabeçalho (13/10): QR grande à direita, com margem branca, para o celular ler de longe; título e código de barras ao lado */
  const QT=27, QX=ML+LARGURA-QT, QY=4;
  if(logo){ try{ const pr=pdf.getImageProperties(logo); pdf.addImage(logo,'PNG',ML,y,30,(pr.height*30)/pr.width); }catch(err){} }
  pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.text('ORDEM DE PRODUÇÃO',ML+36,y+7);
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text('Ordem '+ordem+(o.rancho?'  ·  Rancho '+o.rancho:''),ML+36,y+12.5);
  const cod=o.rancho?'RA-'+o.rancho:'OP-'+o.num;
  try{ desenharQR(pdf,o.rancho?linkRancho(o.rancho):cod,QX,QY,QT); }catch(err){}
  try{ pdfCode128(pdf,cod,ML+36,y+15,62,9); }catch(err){}
  pdf.setFontSize(6.5);pdf.setTextColor(90,90,90);pdf.text(cod+' · barras: coletor',ML+36,y+27);
  pdf.text(o.rancho?'QR: celular ou tablet':'QR: tablet',QX+QT/2,QY+QT+3,{align:'center'});pdf.setTextColor(0,0,0);
  y=QY+QT+5;
  pdf.setFillColor(44,62,80);pdf.rect(ML,y,LARGURA,9,'F');
  pdf.setTextColor(255,255,255);pdf.setFontSize(10.5);pdf.setFont('helvetica','bold');
  pdf.text('DATA: '+data,ML+5,y+6);pdf.text('LINHA: '+String(linha).toUpperCase(),ML+105,y+6);
  pdf.setTextColor(0,0,0);y+=15;
  const CH=10,GAP=3.6;
  const pal=paleteDe(o);
  const nR=o.rancho||'';
  campo(ML,y,127,CH,'PRODUTO',produto);campo(ML+129,y,61,CH,'ORDEM',ordem);y+=CH+GAP;
  campo(ML,y,55,CH,'TURNO',turno);campo(ML+57,y,62,CH,'QUANTIDADE PROGRAMADA',qtde+(unidDe(o)?' '+UNID[unidDe(o)].p:''));campo(ML+121,y,69,CH,'QUANTIDADE PENDENTE',pendente+(unidDe(o)?' '+UNID[unidDe(o)].p:''));y+=CH+GAP;
  campo(ML,y,90,CH,'STATUS',status);campo(ML+92,y,98,CH,'OPERADOR','');y+=CH+GAP;
  if(pal>0){
    const pF=Math.floor(pend/pal), sR=Math.round(pend%pal);
    campo(ML,y,90,CH,'RANCHO',nR);campo(ML+92,y,98,CH,'SALDO EM PALETES ('+pal+' '+uA(o)+'/pal.)',sR>0?pF+' pal. fechados + '+sR+' '+uA(o):pF+' paletes fechados');
  } else campo(ML,y,LARGURA,CH,'RANCHO',nR);
  y+=CH+4.5;
  const cols=semAcento(linha).toUpperCase().includes('AREA LIQUIDA')
    ?['HORA INICIO','HORA FIM','N PALLETS','FD','RASGADOS','PAL. DANIF.','EMBAL. ADIC.','PARADAS']
    :['HORA INICIO','HORA FIM','N PALLETS',(unidDe(o)?UNID[unidDe(o)].p.toUpperCase():'QTDE')+' (UN)','RASGADOS','PAL. DANIF.','EMBAL. ADIC.','PARADAS'];
  const lC=LARGURA/cols.length,aC=7,aR=5.2;
  pdf.setFillColor(44,62,80);
  for(let i=0;i<cols.length;i++)pdf.rect(ML+i*lC,y,lC,aC,'F');
  pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(7);
  cols.forEach((c,i)=>pdf.text(c,ML+i*lC+1.5,y+4.8));
  pdf.setTextColor(0,0,0);y+=aC;
  pdf.setFont('helvetica','normal');
  for(let r=0;r<9;r++){
    if(r%2===0){pdf.setFillColor(248,249,250);for(let j=0;j<cols.length;j++)pdf.rect(ML+j*lC,y,lC,aR,'F');}
    for(let j=0;j<cols.length;j++)pdf.rect(ML+j*lC,y,lC,aR);y+=aR;
  }
  const yOL=y+5.5,yOB=yOL+3.5,aO=Y_RODAPE-yOB;
  pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);pdf.text('OBSERVAÇÕES:',ML,yOL);
  pdf.setDrawColor(180,180,180);pdf.rect(ML,yOB,LARGURA,aO>20?aO:20);pdf.setDrawColor(0,0,0);
  let yR=Y_RODAPE;
  pdf.setFillColor(235,235,235);pdf.rect(ML,yR,LARGURA,7.5,'F');pdf.rect(ML,yR,LARGURA,7.5);
  pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);pdf.text('STATUS DA ORDEM:',ML+4,yR+5);
  pdf.rect(68,yR+2,3.5,3.5);pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);
  pdf.text('Ordem Finalizada',73,yR+5);pdf.rect(125,yR+2,3.5,3.5);pdf.text('Ordem irá finalizar outro dia',130,yR+5);yR+=20;
  pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);pdf.text('RESP. APONTAMENTO:',ML,yR);pdf.text('ASSINATURA DO OPERADOR:',108,yR);yR+=12;
  pdf.setDrawColor(150,150,150);pdf.line(ML,yR,100,yR);pdf.line(108,yR,200,yR);pdf.setDrawColor(0,0,0);
  pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.text('Nome / Assinatura',ML,yR+4);pdf.text('Nome / Assinatura',108,yR+4);yR+=12;
  pdf.setFillColor(235,235,235);pdf.rect(ML,yR,LARGURA,7,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);pdf.text('APONTAMENTO NO SISTEMA',105,yR+4.8,{align:'center'});yR+=9;
  function linhaAp(hr,yy){
    pdf.rect(ML,yy,LARGURA,7);pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text(hr,ML+2,yy+4.8);
    pdf.text('Apontado:',ML+14,yy+4.8);pdf.rect(ML+34,yy+1.8,3.5,3.5);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Sim',ML+39,yy+4.8);
    pdf.rect(ML+51,yy+1.8,3.5,3.5);pdf.text('Não',ML+56,yy+4.8);
    pdf.setFont('helvetica','bold');pdf.text('Hora:',ML+68,yy+4.8);
    pdf.setDrawColor(180,180,180);pdf.rect(ML+79,yy+0.5,20,6);pdf.text('Data:',ML+101,yy+4.8);
    pdf.rect(ML+111,yy+0.5,22,6);pdf.text('Prod:',ML+135,yy+4.8);
    pdf.rect(ML+145,yy+0.5,20,6);pdf.text('Pend:',ML+167,yy+4.8);
    pdf.rect(ML+177,yy+0.5,13,6);pdf.setDrawColor(0,0,0);
  }
  linhaAp('12:00',yR);yR+=9;linhaAp('17:15',yR);yR+=14;
  pdf.setFillColor(255,249,220);pdf.rect(ML,yR,LARGURA,20,'F');
  pdf.setDrawColor(200,160,0);pdf.rect(ML,yR,LARGURA,20);pdf.setDrawColor(0,0,0);
  pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.text('INSTRUÇÕES PARA CONTROLE DA PRODUÇÃO',ML+4,yR+5);
  pdf.setFont('helvetica','normal');
  ['• As ordens de fabricação devem ser fabricadas até a quantidade final para melhor controle da produção diária.',
   '• Favor entregar esta folha ao responsável às 12:00 e às 17:15 para o apontamento no sistema.',
   '• Sinalizar acima se a ordem foi finalizada ou se sobrou material e continuará no próximo dia.'
  ].forEach((t,idx)=>pdf.text(t,ML+4,yR+9.5+idx*4));
}
async function gerarFolhasProducao(ordens,dia,nome,opts){ opts=opts||{};
  if(!ordens.length){ toast('Nenhuma ordem para gerar.'); return; }
  if(opts.porRancho){ const L=linhasOrd(); ordens=[...ordens].sort((a,b)=>(a.rancho?0:1)-(b.rancho?0:1)||String(a.rancho||'').localeCompare(String(b.rancho||''))||L.indexOf(a.linha)-L.indexOf(b.linha)||String(a.num).localeCompare(String(b.num))); }
  if(!window.jspdf){ toast('Não foi possível carregar o gerador de PDF. Recarregue a página.'); return; }
  const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  const logo=(document.querySelector('.brand img')||{}).src||'';
  const pdf=new window.jspdf.jsPDF('p','mm','a4');
  ordens.forEach((o,i)=>{ if(i) pdf.addPage('a4','p'); desenharFolhaProducao(pdf,o,dia,logo); });
  pdf.setProperties({title:nome.replace(/\.pdf$/,'')});
  let data=pdf.output('blob'), semPdf=0;
  const rid=o=>{ const r=o.rancho&&ranchoDe(o.rancho); return r&&r.asset?r.asset:null; };
  if(ordens.some(rid)){ try{ toast('Juntando o rancho à folha…'); const P=await libPdfLib(); const base=await P.PDFDocument.load(pdf.output('arraybuffer')); const out=await P.PDFDocument.create();
    for(let i=0;i<ordens.length;i++){ const [pg]=await out.copyPages(base,[i]); out.addPage(pg); const id=rid(ordens[i]);
      if(id&&!(ordens[i+1]&&(opts.porRancho||ordens[i+1].linha===ordens[i].linha)&&rid(ordens[i+1])===id)){ try{ const src=await P.PDFDocument.load(await bytesAsset(id),{ignoreEncryption:true}); (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p)); }catch(e){ semPdf++; } } }
    data=new Blob([await out.save()],{type:'application/pdf'}); }catch(e){ toast('Não consegui juntar o rancho. Baixando só a folha.'); } }
  if(opts.blob) return data;
  try{ await dl.save({filename:nome,data}); toast(opts.msg||(ordens.length===1?'Folha da ordem '+ordens[0].num+' gerada.':ordens.length+' folhas geradas em um PDF.')); return true; }
  catch(e){ if(e&&e.code!=='declined') toast('Não foi possível baixar o arquivo.'); }
}
function ordensDoDia(dia,linha){ return ordAbertas().filter(o=>dataEf(o)===dia&&(!linha||o.linha===linha)).sort((a,b)=>linhasOrd().indexOf(a.linha)-linhasOrd().indexOf(b.linha)||seqCmp(a,b)); }
function fpPainel(){ const F=S.fp; const dia=F.dia||hojeStr(); const xs=ordensDoDia(dia,F.linha); const L=linhasOrd();
  return `<section class="card" aria-label="Folhas de produção" style="border:1.5px solid var(--teal)">
  <div class="head" style="align-items:baseline"><h2>Folhas de produção</h2><button class="lnk" data-act="fp-fechar">Fechar</button></div>
  <div class="sub" style="margin-top:4px">Mesma folha do Apps Script: uma página A4 por ordem, pronta para imprimir e entregar na linha.</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:14px">
   <label style="display:flex;flex-direction:column;gap:4px"><span class="sub" style="margin:0;font-size:12px">Dia</span><input type="date" class="txt" id="fp-dia" value="${esc(dia)}" style="width:180px"></label>
   <label style="display:flex;flex-direction:column;gap:4px"><span class="sub" style="margin:0;font-size:12px">Linha</span><select class="txt" id="fp-linha" style="width:190px"><option value="">Todas</option>${L.map(l=>`<option ${F.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
   <button class="btn" data-act="fp-gerar" style="height:46px" ${xs.length?'':'disabled'}>${ic('folha',18,2)}Gerar ${xs.length} folha${xs.length===1?'':'s'}</button>
  </div>
  <div class="sub num" style="margin-top:10px;font-size:12px">${xs.length?xs.map(o=>esc(o.linha)+' · '+esc(o.num)+' '+esc(codigoDe(o))).join('  ·  '):'Nenhuma ordem aberta programada para esse dia'+(F.linha?' nessa linha':'')+'.'}</div>
  </section>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="fp-"]'); if(!b||b.disabled) return; const act=b.dataset.act, F=S.fp;
  if(act==='fp-abrir'){ F.aberto=!F.aberto; if(!F.dia) F.dia=hojeStr(); if(S.ord.linha&&S.ord.linha!=='todas') F.linha=S.ord.linha; render(); return; }
  if(act==='fp-fechar'){ F.aberto=false; render(); return; }
  if(act==='fp-gerar'){ const dia=F.dia||hojeStr(); const _os=ordensDoDia(dia,F.linha); gerarFolhasProducao(_os,dia,'Folhas_Producao_'+dataBR(dia).replace(/\//g,'-')+linhasNome(_os,F.linha)+'.pdf').then(ok=>{ if(ok&&!F.linha) marcarDiario(dia,{folhasEm:new Date().toISOString(),folhasN:_os.length,folhasPor:S.uid}); }); return; }
  if(act==='fp-ordem'){ const o=ordById(b.dataset.id); if(!o) return; const dia=dataEf(o)||hojeStr(); gerarFolhasProducao([o],dia,'Ordem_'+o.num+linhasNome([o])+'_'+dataBR(dia).replace(/\//g,'-')+'.pdf'); return; }
});
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='fp-dia'){ S.fp.dia=t.value; render(); } if(t.id==='fp-linha'){ S.fp.linha=t.value; render(); } });

// ================= RANCHOS =================
const _scripts={};
function carregarScript(src){ if(_scripts[src]) return _scripts[src];
  _scripts[src]=new Promise((ok,falha)=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>ok(); s.onerror=()=>{ delete _scripts[src]; falha(new Error('script')); }; document.head.appendChild(s); });
  return _scripts[src]; }
async function libPdfjs(){ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'); await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  const L=window.pdfjsLib; if(L&&L.GlobalWorkerOptions) L.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; return L; }
async function libPdfLib(){ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'); return window.PDFLib; }
async function textoPaginasPdf(buf){ const L=await libPdfjs(); const doc=await L.getDocument({data:new Uint8Array(buf.slice(0)),isEvalSupported:false}).promise; const out=[];
  for(let p=1;p<=doc.numPages;p++){ const pg=await doc.getPage(p); const tc=await pg.getTextContent(); const linhas={};
    tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; const y=Math.round(it.transform[5]/2.5); (linhas[y]=linhas[y]||[]).push({x:it.transform[4],s:it.str}); });
    out.push(Object.keys(linhas).map(Number).sort((a,b)=>b-a).map(y=>linhas[y].sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim()).join('\n')); }
  try{ doc.destroy(); }catch(e){} return out; }
function lerRancho(paginas){ const porNum={};
  paginas.forEach(txt=>{ const m=txt.match(/Rancho\s*(\d{6,})/i); if(!m) return; const n=m[1]; const r=porNum[n]=porNum[n]||{numero:n,ordens:[]};
    const parte=txt.split(/Demandas/i)[0];
    const re=/([A-Z]{1,4}\d{3,5})\b[^\n]*?\b(\d{5,7})\s+([\d.]+,\d+)\s+(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}\/\d{2}\/\d{2,4})/g; let x;
    while((x=re.exec(parte))){ if(r.ordens.some(o=>o.num===x[2])) continue; const pre=x[0].slice(0,x[0].lastIndexOf(x[2])); const um=(pre.match(/\s([A-Z]{2,3})\s*$/)||[])[1]; r.ordens.push({num:x[2],codigo:x[1],qtd:numCsv(x[3]),dtIni:x[4],dtFim:x[5],um:um||null}); }
    const d=txt.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/); if(d&&!r.dataRel) r.dataRel=d[1]; });
  return Object.values(porNum); }
function lerItensRancho(paginas){ const porNum={}; let atual=null, dem=false;
  paginas.forEach(txt=>{ const m=txt.match(/Rancho\s*(\d{6,})/i); if(m&&m[1]!==atual){ atual=m[1]; dem=false; } if(!atual) return;
    let parte=txt; const k=parte.search(/Demandas/i); if(k>=0){ dem=true; parte=parte.slice(k+8); } else if(!dem) return;
    const ls=parte.split('\n').map(l=>l.trim()).filter(l=>l&&!/Almoxarifado|ELABORA[CÇ][AÃ]O|^Item\s+Descri|Relat[óo]rio|FoccoERP|Data:|P[áa]g\.|\(Rancho|^-{3,}|Total/i.test(l)&&!/^\d+\s*-\s*[A-ZÀ-Ú ]+$/.test(l));
    porNum[atual]=(porNum[atual]||'')+' '+ls.join(' '); });
  const UMS='UN|UND|KG|MT|SC|PCT|PC|PT|FD|CX|LT|L|M2|M3|M|BD|BL|TN|G|ML|RL|GL';
  const out={}; for(const n in porNum){ const t=porNum[n]; const re=/(?:^|\s)([A-Z]{1,3}\d{4,5})\s/g; const pos=[]; let x; while((x=re.exec(t))) pos.push({c:x[1],i:x.index+x[0].indexOf(x[1])});
    out[n]=pos.map((p,j)=>{ let ch=t.slice(p.i+p.c.length,j+1<pos.length?pos[j+1].i:t.length).trim(); const qs=ch.match(/\d{1,3}(?:\.\d{3})*,\d{2,4}(?!\d)/g); if(!qs) return null; const q1=qs[qs.length-1]; ch=ch.replace(q1,' ');
      const ums=[...ch.matchAll(new RegExp('(?:^|\\s)(\\d{1,2})\\s+('+UMS+')(?=\\s|$)','g'))]; let um='', d=ch; if(ums.length){ const u=ums[ums.length-1]; um=u[2]; d=ch.slice(0,u.index)+' '+ch.slice(u.index+u[0].length); }
      return {c:p.c,d:d.replace(/\s+/g,' ').trim(),um,q:numCsv(q1),a:ums.length?+ums[ums.length-1][1]:null}; }).filter(Boolean); }
  return out; }
function ranchoDe(num){ return S.ranchos.find(r=>String(r.numero)===String(num)); }
async function anexarRanchos(files){ const R=S.rch; if(R.lendo) return; if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
  const assets=await window.claude?.use?.('assets');
  R.lendo=true; R.msgs=[]; render(); let ok=0;
  for(const f of files){
    try{
      const buf=await f.arrayBuffer(); let pags;
      try{ pags=await textoPaginasPdf(buf); }catch(e){ R.msgs.push(f.name+': não consegui abrir o PDF.'); continue; }
      const rs=lerRancho(pags); let its={}; try{ its=lerItensRancho(pags); }catch(e){} if(!rs.length){ R.msgs.push(f.name+': não achei o número do rancho. É o Relatório de Requisições (RPRD0306)?'); continue; }
      let asset=null; if(assets){ try{ const up=await assets.upload(new Blob([buf],{type:'application/pdf'}),{type:'application/pdf'}); asset=up.id; }catch(e){ R.msgs.push(f.name+': o PDF não foi guardado ('+((e&&e.code)||'erro')+'). O número do rancho foi ligado às ordens mesmo assim.'); } }
      for(const r of rs){
        const semOrdem=[]; const agora=new Date().toISOString();
        for(const it of r.ordens){ { const um={PC:'PCT',PCT:'PCT',PT:'PCT',FD:'FD',SC:'SC',UN:'UN',UND:'UN',CX:'CX',BD:'BD',BL:'BD',KG:'KG'}[it.um||'']; const item=itemDe(it.codigo); if(um&&item&&!item.unidade){ try{ await S.db.doc('itens/'+item._id).update({unidade:um}); item.unidade=um; }catch(e){} } }
          const alvo=S.ordens.filter(o=>String(o.num)===it.num); if(!alvo.length){ semOrdem.push(it.num); continue; }
          const o=alvo.find(x=>x.status==='aberta')||alvo[0];
          if(String(o.rancho||'')!==r.numero){ try{ await S.db.doc('ordens/'+o._id).update({rancho:r.numero,hist:histAdd(o,'Rancho '+r.numero+' anexado')}); }catch(e){} } }
        const ensMsg=[]; for(const n of semOrdem.slice()){ const it=r.ordens.find(x=>x.num===n)||{};
          let dono=S.ordens.find(o=>String(o.ensaca||'')===n);
          if(!dono){ const cands=r.ordens.filter(x=>x.num!==n).map(x=>S.ordens.find(o=>String(o.num)===x.num&&o.status==='aberta')).filter(o=>o&&faltaEns(o));
            if(cands.length===1){ dono=cands[0]; if(await ordUpd(dono._id,{ensaca:n,hist:histAdd(dono,'Ordem de ensacado '+n+' (rancho '+r.numero+')')})){ dono.ensaca=n; await vincularEnsaca(n,dono.num); } } }
          const pareceEns=/^M\d/i.test(String(it.codigo||''))||/ENSAC/i.test(String(it.desc||it.d||''));
          if(dono||pareceEns){ semOrdem.splice(semOrdem.indexOf(n),1); ensMsg.push(n+' é o ensacado'+(dono?' da '+dono.num:'')); } }
        const ant=ranchoDe(r.numero)||{};
        const d={numero:r.numero,ordens:r.ordens,nome:f.name,dataRel:r.dataRel||null,criadoEm:ant.criadoEm||agora,atualizadoEm:agora,por:S.uid};
        if(asset) d.asset=asset; else if(ant.asset) d.asset=ant.asset; if(its[r.numero]&&its[r.numero].length) d.itens=its[r.numero];
        if(semOrdem.length) d.semOrdem=semOrdem;
        const base=Object.assign({},ant); delete base._id; if(!semOrdem.length) base.semOrdem=null;
        await S.db.doc('ranchos/'+r.numero).set(Object.assign(base,{enviadoEm:ant.enviadoEm||agora,enviadoPor:ant.enviadoPor||S.uid,envAuto:!ant.enviadoEm||!!ant.envAuto},d)); /* anexou = já vai para o almox (eles têm login próprio) */
        ok++; R.msgs.push('Rancho '+r.numero+': '+r.ordens.map(o=>o.num).join(', ')+(ensMsg.length?' · '+ensMsg.join(', '):'')+(semOrdem.length?' · não estão no painel: '+semOrdem.join(', '):'')+(asset?'':' · PDF não guardado'));
      }
    }catch(e){ R.msgs.push(f.name+': erro ao processar.'); }
  }
  R.lendo=false; toast(ok?ok+' rancho'+(ok===1?'':'s')+' anexado'+(ok===1?'':'s')+'.':'Nenhum rancho anexado.'); render(); }
async function bytesAsset(id){ S._pdfCache=S._pdfCache||{}; if(S._pdfCache[id]) return S._pdfCache[id];
  if(window.claude&&window.claude.assetBytes){ const b=await window.claude.assetBytes(id); S._pdfCache[id]=b; return b; }
  let r=null; try{ r=await fetch('/_blob/'+id); }catch(e){ r=null; }
  if(!r||!r.ok){ try{ const a=await window.claude?.use?.('assets'); const l=a&&await a.list(); const it=l&&(l.assets||[]).find(x=>x.id===id); if(it) r=await fetch(it.url); }catch(e){ r=null; } }
  if(!r||!r.ok) throw new Error('fetch'); const b=new Uint8Array(await r.arrayBuffer()); S._pdfCache[id]=b; return b; }
async function verRancho(id,numero){
  let ov=document.getElementById('pdfview'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='pdfview'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Rancho '+numero);
  ov.innerHTML=`<div class="pv-bar"><b>Rancho ${esc(numero||'')}</b><span style="flex:1"></span><button class="btn sec" id="pv-baixar" style="height:40px">${ic('baixar',18,2)}Baixar PDF</button><button class="btn sec" id="pv-fechar" style="height:40px">Fechar</button></div><div class="pv-pags"><div class="empty" id="pv-msg">Carregando o rancho…</div></div>`;
  document.body.appendChild(ov);
  const fechar=()=>{ ov.remove(); document.removeEventListener('keydown',esc_); }; const esc_=e=>{ if(e.key==='Escape') fechar(); };
  document.addEventListener('keydown',esc_); ov.querySelector('#pv-fechar').onclick=fechar; ov.addEventListener('click',e=>{ if(e.target===ov) fechar(); });
  ov.querySelector('#pv-baixar').onclick=async()=>{ const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
    try{ const b=await bytesAsset(id); await dl.save({filename:'Rancho_'+(numero||id)+'.pdf',data:new Blob([b],{type:'application/pdf'})}); }catch(e){ if(!e||e.code!=='declined') toast('Não foi possível baixar o rancho.'); } };
  try{ const b=await bytesAsset(id); const L=await libPdfjs(); const doc=await L.getDocument({data:b.slice(0),isEvalSupported:false}).promise; const box=ov.querySelector('.pv-pags'); box.innerHTML='';
    const larg=Math.min(900,box.clientWidth-24||800);
    for(let i=1;i<=doc.numPages;i++){ const pg=await doc.getPage(i); const v0=pg.getViewport({scale:1}); const esc2=larg/v0.width; const dpr=window.devicePixelRatio||1; const v=pg.getViewport({scale:esc2*dpr});
      const c=document.createElement('canvas'); c.width=v.width; c.height=v.height; c.style.width=(v.width/dpr)+'px'; c.style.height=(v.height/dpr)+'px'; box.appendChild(c);
      await pg.render({canvasContext:c.getContext('2d'),viewport:v}).promise; }
  }catch(e){ const m=ov.querySelector('#pv-msg')||ov.querySelector('.pv-pags'); m.textContent='Não foi possível mostrar o rancho aqui. Use “Baixar PDF”.'; } }
document.addEventListener('click',ev=>{ if(ev.target.closest&&ev.target.closest('select[data-pri]')) ev.stopPropagation(); },true);
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t.matches||!t.matches('select[data-pri]')) return; const o=ordById(t.dataset.pri); if(!o||!dbPode().prod) return; const n=+t.value, agora=new Date().toISOString();
  for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); rx.urg=n?{em:agora,por:S.uid||null,n}:null; await dbSalvar(x,rx,n?'Prioridade '+n+' ('+PRI[n].t+') definida pelo PCP':'Prioridade retirada',o.rancho); }
  toast(n?'Ordem '+o.num+(o.rancho?' (rancho '+o.rancho+')':'')+': prioridade '+n+' · '+PRI[n].t+'.':'Prioridade retirada da ordem '+o.num+'.'); render(); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="cst-tog"]'); if(!b) return; ev.stopPropagation(); const id=b.dataset.id, C=cesta(); const o=ordById(id); if(C.has(id)) C.delete(id); else C.add(id); cestaSalva(); render(); toast(C.has(id)?'Ordem '+(o?o.num:'')+' no e-mail do almox ('+C.size+' selecionada'+(C.size===1?'':'s')+'). Monte o e-mail em Ranchos.':'Ordem '+(o?o.num:'')+' tirada do e-mail.'); },true);
function cestaBanner(){ const n=cestaOrd().length, R=S.rch; if(!n) return ''; const u=cestaOrd().filter(dbUrg).length;
  return `<section class="card cestab ${R.modoCesta?'on':''}"><div><b>✉ Sua seleção para o e-mail: ${n} ${n===1?'ordem':'ordens'}</b>${u?` · <span class="urgt" style="display:inline">${u} com prioridade muito alta</span>`:''}<div class="sub" style="margin:2px 0 0;font-size:12.5px">${R.modoCesta?'O e-mail, o PDF e o "marcar como enviado" abaixo usam só as ordens que você selecionou na Programação (de qualquer dia).':'Você selecionou ordens na Programação. Use a seleção para montar o e-mail com elas.'}</div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${R.modoCesta?'<button class="btn sec" data-act="r-cesta-off" style="height:38px">Voltar para o dia</button>':'<button class="btn" data-act="r-cesta-on" style="height:38px">Usar a seleção no e-mail</button>'}<button class="lnk" data-act="r-cesta-limpar">Limpar seleção</button></div></section>`; }
function cesta(){ if(!S._cesta){ let a=[]; try{ a=JSON.parse(localStorage.getItem('colafix.cesta')||'[]'); }catch(e){} S._cesta=new Set(a); } return S._cesta; }
function cestaSalva(){ try{ localStorage.setItem('colafix.cesta',JSON.stringify([...cesta()])); }catch(e){} }
function cestaOrd(){ return S.ordens.filter(o=>cesta().has(o._id)&&o.status!=='ignorada'); }
function cestaModo(){ return !!(S.rch&&S.rch.modoCesta&&S.view==='ranchos'&&cestaOrd().length); }
function ranchosDoDia(dia,linha){ const L=linhasOrd(); const xs=cestaModo()?cestaOrd().sort((a,b)=>priOrd(a)-priOrd(b)||L.indexOf(a.linha)-L.indexOf(b.linha)||String(a.num).localeCompare(String(b.num))):S.ordens.filter(o=>o.linha&&(o.status==='aberta'||o.status==='encerrada')&&(dataEf(o)===dia||o.data===dia)&&(!linha||o.linha===linha)).sort((a,b)=>L.indexOf(a.linha)-L.indexOf(b.linha)||String(a.num).localeCompare(String(b.num))); const grupos=new Map(), sem=[];
  xs.forEach(o=>{ if(!o.rancho){ sem.push(o); return; } if(!grupos.has(o.rancho)) grupos.set(o.rancho,[]); grupos.get(o.rancho).push(o); });
  return {grupos:[...grupos.entries()].map(([n,os])=>({numero:n,ordens:os,doc:ranchoDe(n)})),sem,total:xs.length}; }
function rJaLinha(o){ const r=o.rdb||{}; if(r.sep||r.ent) return r.ent?'entregue na linha':'já separado'; const rc=o.rancho&&ranchoDe(o.rancho);
  if(rc&&rc.enviadoEm&&hojeStr(new Date(rc.enviadoEm))<dataEf(o)) return 'já enviado em '+dm(hojeStr(new Date(rc.enviadoEm))); return ''; }
function rFora(o){ const R=S.rch; return R.fora.has(o._id)||(!cestaModo()&&!!rJaLinha(o)&&!(R.incl&&R.incl.has(o._id))); }
function rIncl(id,on){ const R=S.rch; R.incl=R.incl||new Set(); if(on){ R.fora.delete(id); R.incl.add(id); } else { R.fora.add(id); R.incl.delete(id); } }
function selDoDia(dia,linha){ const g=ranchosDoDia(dia,linha);
  const grupos=g.grupos.map(r=>Object.assign({},r,{ordens:r.ordens.filter(o=>!rFora(o))})).filter(r=>r.ordens.length);
  const sem=g.sem.filter(o=>!rFora(o)); return {grupos,sem,total:grupos.reduce((a,r)=>a+r.ordens.length,0)+sem.length}; }
function palEmail(o){ const it=itemDe(codigoDe(o)), c=codigoDe(o), pp0=S.cfg.paleteProd||{}; const pp=it&&it.palete>0?+it.palete:(pp0[c]!=null?+pp0[c]||0:0); if(!(pp>0)) return ''; const q=Math.round(o.total*1000)/1000, n=Math.floor(q/pp+1e-9), r=Math.round((q-n*pp)*1000)/1000; return ' ('+(n?n+' palete'+(n===1?'':'s')+' de '+fq(pp)+(r>0?' + '+fq(r)+' '+uA(o):''):fq(r)+' '+uA(o)+', menos de 1 palete')+')'; }
function linhaEmail(o){ return codigoDe(o)+' '+nomeCurto(o)+' · '+fq(o.total)+' '+uA(o)+palEmail(o); }
function totaisEmail(os){ const m={}; os.forEach(o=>{ const u=uA(o); m[u]=(m[u]||0)+(+o.total||0); }); return Object.entries(m).map(([u,q])=>fq(q)+' '+u).join(' + ')+' em '+os.length+(os.length===1?' ordem':' ordens'); }
function linhasNome(os,filtro){ const ls=filtro?[filtro]:[...new Set(os.map(o=>o.linha).filter(Boolean))].sort((a,b)=>linhasOrd().indexOf(a)-linhasOrd().indexOf(b)); return ls.length?'_'+ls.map(l=>semAcento(l).replace(/\s+/g,'')).join('-'):''; }
const PRI_COR={r:'#F4A9A8',a:'#F7DC8E',v:'#AFDDB6'};
function priCor(p){ return p===1?'r':(p===2||p===3)?'a':'v'; }
function emailTexto(dia,g){ const nomeUser=(S.uid&&S.nomes[S.uid])||''; const cm=cestaModo(); const L=linhasOrd();
  const gp=r=>Math.min(...r.ordens.map(priOrd)); const dmin=r=>r.ordens.map(o=>dataEf(o)).sort()[0]||''; const smin=r=>Math.min(...r.ordens.map(o=>o.seq!=null?+o.seq:1e9));
  const gs=g.grupos.slice().sort((a,b)=>gp(a)-gp(b)||dmin(a).localeCompare(dmin(b))||L.indexOf(a.ordens[0].linha)-L.indexOf(b.ordens[0].linha)||smin(a)-smin(b));
  const np=r=>{ const p=gp(r); return p===10?4:p===9?0:p; };
  const pt=r=>{ const p=np(r); return p?PRI[p].t:''; };
  const lin=r=>[...new Set(r.ordens.map(o=>o.linha))].join(', ')+(cm?' · '+dm(dmin(r)):'');
  const n1=gs.filter(r=>np(r)===1).length, nP=gs.filter(r=>np(r)).length;
  const dsem=d=>{ const x=new Date(d+'T12:00:00'); return isNaN(x)?'':DIAS_CAL[x.getDay()].toLowerCase()+' '; };
  const cont=[n1?n1+' muito alta'+(n1===1?'':'s'):'',nP-n1>0?(nP-n1)+' com prioridade':''].filter(Boolean).join(', ');
  const assunto='Separação de ranchos · '+(cm?'seleção do PCP':'entrega '+dsem(dia)+dataBR(dia).slice(0,5)+' até '+dbHoraEnt())+' · '+gs.length+' rancho'+(gs.length===1?'':'s')+(g.sem.length?' + '+g.sem.length+' sem rancho':'')+(cont?' ('+cont+')':'');
  const intro='Seguem em anexo as ordens de produção e os ranchos'+(cm?'':' de '+dataBR(dia))+', para entrega até as '+dbHoraEnt()+'. Separar na ordem abaixo.';
  const tot='Total: '+totaisEmail([...gs.flatMap(r=>r.ordens),...g.sem]);
  const corpo='Olá,\n\n'+intro+'\n\n'+gs.map((r,i)=>(i+1)+'. Rancho '+r.numero+' · '+lin(r)+(pt(r)?' · '+pt(r).toUpperCase():'')+'\n'+r.ordens.map(o=>'   '+o.num+' · '+linhaEmail(o)).join('\n')).join('\n\n')+
    (g.sem.length?'\n\nSem rancho:\n'+g.sem.map(o=>'   '+o.num+' · '+linhaEmail(o)+' · '+o.linha).join('\n'):'')+'\n\n'+tot+'\n\nQualquer dúvida, me avise.'+(nomeUser?'\n'+nomeUser:'');
  const H=x=>String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const dot=k=>'<span style="color:'+PRI_COR[k]+';font-size:17px;line-height:1">&#9679;</span>';
  const F='font-family:Calibri,Arial,sans-serif;font-size:14px;color:#222';
  const td='padding:5px 10px;border-bottom:1px solid #eee;vertical-align:top';
  const linhas=gs.map((r,i)=>{ const p=np(r), k=priCor(p);
    return '<tr style="background:'+(k==='r'?'#FDF1F1':'#fff')+'"><td style="'+td+';white-space:nowrap">'+dot(k)+' <b>'+(i+1)+'</b></td><td style="'+td+';white-space:nowrap"><b>'+H(r.numero)+'</b><br><span style="color:#777;font-size:12px">'+H(lin(r))+'</span></td><td style="'+td+'">'+r.ordens.map(o=>'<b>'+H(o.num)+'</b> · '+H(linhaEmail(o))).join('<br>')+'</td><td style="'+td+';white-space:nowrap;color:#555">'+H(pt(r)||'Normal')+'</td></tr>'; }).join('')
    +(g.sem.length?'<tr><td style="'+td+'">'+dot('v')+'</td><td style="'+td+'"><b>Sem rancho</b></td><td style="'+td+'">'+g.sem.map(o=>'<b>'+H(o.num)+'</b> · '+H(linhaEmail(o))+' · '+H(o.linha)).join('<br>')+'</td><td style="'+td+'"></td></tr>':'');
  const leg='<div style="font-size:12px;color:#666;margin:6px 0 0">'+dot('r')+' Muito alta &nbsp; '+dot('a')+' Alta / Média &nbsp; '+dot('v')+' Normal / Baixa</div>';
  const html='<div style="'+F+'"><p style="margin:0 0 10px">Olá,</p><p style="margin:0 0 12px">'+H(intro)+'</p>'+
    '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;'+F+'"><tr style="background:#F5F5F5;font-size:12px;color:#555"><th style="'+td+';text-align:left">#</th><th style="'+td+';text-align:left">Rancho</th><th style="'+td+';text-align:left">Ordens</th><th style="'+td+';text-align:left">Prioridade</th></tr>'+linhas+'</table>'+leg+
    '<p style="margin:12px 0 0;color:#555">'+H(tot)+'</p><p style="margin:12px 0 0">Qualquer dúvida, me avise.'+(nomeUser?'<br>'+H(nomeUser):'')+'</p></div>';
  const bz={r:'\u{1F534}',a:'\u{1F7E1}',v:'\u{1F7E2}'};
  const zap='*Ranchos – '+(cm?'seleção do PCP':dsem(dia)+dataBR(dia).slice(0,5)+' até '+dbHoraEnt())+'*\n\n'+
    gs.map(r=>bz[priCor(np(r))]+' *'+[...new Set(r.ordens.map(o=>o.linha))].join(', ')+'* · rancho '+r.numero+(np(r)===1?' · prioridade muito alta':'')+'\n'+r.ordens.map(o=>'   '+o.num+' · '+codigoDe(o)+' '+nomeCurto(o)).join('\n')).join('\n')+
    (g.sem.length?'\n'+bz.v+' *Sem rancho*\n'+g.sem.map(o=>'   '+o.num+' · '+codigoDe(o)+' '+nomeCurto(o)+' · '+o.linha).join('\n'):'');
  return {assunto,corpo,html,zap}; }
function copiarRico(html,txt){ let ok=false; const h=e=>{ e.clipboardData.setData('text/html',html); e.clipboardData.setData('text/plain',txt); e.preventDefault(); ok=true; };
  document.addEventListener('copy',h,true); try{ const t=document.createElement('textarea'); t.value='x'; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }catch(e){} document.removeEventListener('copy',h,true); return ok; }
document.addEventListener('click',e=>{ const a=e.target.closest&&e.target.closest('a[data-mail-rico]'); if(!a) return; const R=S.rch, dia=R.dia||hojeStr(); const {corpo,html}=emailTexto(dia,selDoDia(dia,R.linha));
  if(copiarRico(html,corpo)){ a.href=a.href.replace(/&body=[^&]*/,''); setTimeout(()=>toast('O texto do e-mail foi copiado. No Outlook, clique no corpo do e-mail e aperte Ctrl+V.'),50); } },true);
function buscaRanchos(q){ const ql=q.toLowerCase();
  const os=S.ordens.filter(o=>o.status!=='ignorada'&&(String(o.num).includes(ql)||String(o.rancho||'').includes(ql)||String(o.produto||'').toLowerCase().includes(ql)))
    .sort((a,b)=>(a.status==='aberta'?0:1)-(b.status==='aberta'?0:1)||dataEf(b).localeCompare(dataEf(a))).slice(0,40);
  const rs=S.ranchos.filter(r=>String(r.numero).includes(ql)||(r.ordens||[]).some(x=>String(x.num).includes(ql))).slice(0,20);
  const fora=[]; rs.forEach(r=>(r.ordens||[]).forEach(x=>{ if(!S.ordens.some(o=>String(o.num)===String(x.num))&&(String(r.numero).includes(ql)||String(x.num).includes(ql))) fora.push({r,x}); }));
  return `<section class="card"><div class="head" style="align-items:baseline"><div class="label">RESULTADO DA PESQUISA · ${os.length} ${os.length===1?'ordem':'ordens'}</div><button class="lnk" data-act="r-limpar-busca">Limpar</button></div>
  ${os.length?os.map(o=>{ const r=o.rancho&&ranchoDe(o.rancho); const si=stInfo(o,entregueDe(o)); return `<div class="rrow"><div><b class="num">Ordem ${esc(o.num)}</b> <span class="pill ${si.c}">${esc(si.t)}</span>
    <div class="sub num" style="margin:2px 0 0;font-size:12px">${esc(codigoDe(o))} · ${esc(nomeCurto(o))}<br>${o.linha?esc(o.linha)+' · '+dmTxt(dataEf(o)):'Na fila, sem linha'} · ${o.rancho?'rancho '+esc(o.rancho)+(r&&r.enviadoEm?' · enviado ao almox':''):'<span style="color:var(--warn-ink);font-weight:600">sem rancho</span>'}</div></div>
    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;white-space:nowrap">
     <button class="fpbtn" data-act="fp-ordem" data-id="${esc(o._id)}">${ic('folha',16,2)}<span>Folha</span></button>
     ${r&&r.asset?`<button class="lnk" data-act="r-ver" data-asset="${esc(r.asset)}" style="padding:0">Abrir rancho</button>`:''}
     ${o.linha?(()=>{ const R=S.rch, noDia=dataEf(o)===(R.dia||hojeStr()), marcada=noDia&&!R.fora.has(o._id)&&R.soSel; return `<button class="btn ${marcada?'sec':''}" data-act="r-so" data-id="${esc(o._id)}" style="height:32px;padding:0 12px;font-size:12.5px">${marcada?ic('check',14,2.4)+' Selecionada':'Selecionar só esta'}</button>${noDia&&R.soSel&&!marcada?`<button class="lnk" data-act="r-add" data-id="${esc(o._id)}" style="padding:0">+ Adicionar à seleção</button>`:''}`; })():''}</div></div>`; }).join(''):'<div class="empty" style="padding:12px">Nenhuma ordem encontrada no painel.</div>'}
  ${fora.length?`<div class="label" style="margin:14px 0 6px">NO RANCHO, MAS FORA DO PAINEL</div>${fora.map(({r,x})=>`<div class="rrow"><div class="num"><b>Ordem ${esc(x.num)}</b> <span class="sub" style="display:inline;font-size:12px">${esc(x.codigo||'')} · rancho ${esc(r.numero)}</span></div>${r.asset?`<button class="lnk" data-act="r-ver" data-asset="${esc(r.asset)}" style="padding:0">Abrir rancho</button>`:''}</div>`).join('')}<div class="sub" style="font-size:12px;margin-top:6px">Essas ordens aparecem no rancho mas não estão na programação. Importe o CSV ou crie a ordem.</div>`:''}
  </section>`; }

// ================= DIÁRIO DE BORDO DO RANCHO =================
const DB_PRAZO={sep:60,conf:30};
function dbHoraEnt(){ return (S.cfg&&S.cfg.prazoEntregaRancho)||'17:00'; }
function dbPrazoMin(o){ const h=hojeStr(), d0=dataEf(o)||h, d=d0<h?h:d0; const [hh,mm]=dbHoraEnt().split(':').map(Number); const dl=new Date(d+'T'+String(hh).padStart(2,'0')+':'+String(mm||0).padStart(2,'0')+':00'); return Math.round((dl-new Date())/6e4); } /* minutos: separar depois de enviado; conferir depois de entregue */
S.dbo={dia:'',linha:'todas',aberto:null,f:null,so:'',modo:'',pri:''};
function dbMaster(){ const p=acsP(); return !!(S.acs&&S.acs.dono)||!!(p&&p.tudo); }
function dbPode(){ const p=acsP(); return {alm:!!p&&(p.tudo||p.mods.includes('producao')||p.mods.includes('almox')||p.mods.includes('premix')), prod:!!p&&(p.tudo||p.mods.includes('producao'))}; }
function dbMenosAberto(e){ return !!(e.conf&&e.conf.falta&&!e.compRec&&!(e.fim&&e.fim.st==='encerrado')); }
function dbEt(o){ const rc=o.rancho?ranchoDe(o.rancho):null, r=o.rdb||{};
  return {rc, emi:rc&&(rc.criadoEm||rc.atualizadoEm)||null, env:rc&&rc.enviadoEm||null, sep:r.sep||null, ent:r.ent||null, conf:r.conf||null, comp:r.comp||null, compRec:r.compRec||null, fim:r.fim||null}; }
function dbSit(o,e,est){ const agora=Date.now(), min=iso=>(agora-new Date(iso).getTime())/6e4;
  const late={sep:!!(e.env&&!e.sep&&min(e.env)>DB_PRAZO.sep), conf:!!(e.ent&&!e.conf&&min(e.ent)>DB_PRAZO.conf), ent:false};
  if(!e.ent&&est&&est.dia===hojeStr()){ const n=new Date(), m=n.getHours()*60+n.getMinutes(); if(est.ini<1440&&m>=est.ini) late.ent=true; }
  if(!e.ent&&o.rancho&&dbPrazoMin(o)<0) late.ent=true;
  const pend=e.fim&&e.fim.st==='pendente';
  let t,c; if(!o.rancho){ t='Sem rancho'; c='crit'; } else if(e.fim&&e.fim.st==='encerrado'){ t=e.conf&&e.conf.falta&&!e.compRec?'Encerrado (veio a menos)':'Rancho encerrado'; c='ok'; } else if(e.conf&&e.conf.falta){ if(e.compRec){ t='Complemento recebido · almox encerrar'; c='warn'; } else if(e.comp){ t='Complemento a caminho'; c='warn'; } else { t='A menos · aguardando almox'; c='crit'; } } else if(pend){ t='Pendente'; c='warn'; } else if(e.conf){ t='Conferido · almox encerrar'; c='warn'; }
  else if(e.ent){ t=late.conf?'Conferência atrasada':'Aguardando conferência'; c=late.conf?'crit':'warn'; } else if(e.sep){ t=late.ent?'Linha esperando':'Aguardando entrega'; c=late.ent?'crit':'warn'; }
  else if(e.env){ t=late.sep?'Separação atrasada':'Aguardando separação'; c=late.sep||late.ent?'crit':'warn'; } else { t=late.ent?'Linha esperando':'Não enviado ao almox'; c=late.ent?'crit':'neu'; }
  return {t,c,late}; }
function dbCel(o,k,v,late,pode){ const id=esc(o._id);
  if(v){ const iso=typeof v==='string'?v:v.em; const q=typeof v==='string'?'':' · '+esc(nomeDe(v.por)); const falta=(k==='conf'||k==='sep')&&typeof v==='object'&&v.falta;
    return `<td class="dbc ${falta?'mn':'ok'}" title="${esc(dia(iso)+' '+hora(iso))}${q}"><b class="num">${hora(iso)}</b>${dm(hojeStr(new Date(iso)))!==dm(S.dbo.dia)?`<small class="num">${dm(hojeStr(new Date(iso)))}</small>`:''}${typeof v==='string'?'':`<small>${esc(k==='sep'&&v.nome?v.nome:nomeDe(v.por))}</small>`}${k==='sep'&&typeof v==='object'&&v.conferido&&!v.falta?'<small>conferido</small>':''}${falta?`<small><b>${k==='sep'?'faltou':'a menos'}</b></small><span class="dbmi">${(v.itens||[]).slice(0,4).map(x=>`<span><b>${esc(x.c||String(x.i).split(' ')[0])}</b> ${esc(x.q||'')}</span>`).join('')}${(v.itens||[]).length>4?`<span>+${v.itens.length-4} itens</span>`:''}</span>`:''}${k==='ent'&&v.itens&&v.itens.some(x=>x.qe+1e-9<x.q)?`<small class="dbmi"><span><b>${v.itens.filter(x=>x.qe+1e-9<x.q).length}</b> abaixo do pedido</span></small>`:''}${(k==='conf'||k==='ent')&&typeof v==='object'&&(v.rec||v.itens&&v.itens.length||v.obs)?`<button class="lnk dbimp" data-act="db-ver" data-id="${id}" data-k="${k}">${S.dbo.ver===o._id+'|'+k?'fechar':'ver itens'}</button>`:''}${typeof v==='object'&&v.acerto?'<small title="Marcado no acerto de pendências">acerto</small>':''}${k==='sep'?`<button class="lnk dbimp" data-act="db-imp" data-id="${id}" title="Baixar de novo as folhas + rancho (não muda o horário)">imprimir</button>`:''}${pode&&(k==='sep'||k==='ent'||k==='conf')?`<button class="lnk dbx" data-act="db-desf" data-id="${id}" data-k="${k}" title="Desfazer">desfazer</button>`:''}</td>`; }
  if(k==='ent'&&typeof epCel==='function'&&epCel(o)) return epCel(o,pode,late);
  if(!pode) return `<td class="dbc ${late?'lt':''}">${late?'<small><b>atrasado</b></small>':''}</td>`;
  const rot={sep:'Separado',ent:'Entregue',conf:'Conferir'}[k];
  return `<td class="dbc ${late?'lt':''}"><button class="dbb ${late?'lt':''}" data-act="${k==='conf'?'db-conf':'db-mark'}" data-id="${id}" data-k="${k}" ${k==='sep'?'title="Marca todas as ordens deste rancho como separadas"':''}>${rot}</button>${k==='sep'?`<button class="lnk dbimp" data-act="db-imp" data-id="${id}" title="Baixar as folhas de produção + o rancho">${ic('baixar',12,2.2)} imprimir</button>`:''}</td>`; }
function dbFormLivre(o){ const f=S.dbo.f||{falta:false,itens:[{i:'',q:''}],obs:''};
  return `<tr class="dbform"><td colspan="11"><div class="dbfw"><b>Conferência do rancho ${esc(o.rancho||'')} · ${(()=>{ const xs=dbIrmas(o); return xs.length>1?'ordens '+xs.map(x=>esc(x.num)).join(', ')+' (vale para todas)':'ordem '+esc(o.num); })()}</b>
   <div class="seg" role="group" style="margin-top:8px"><button data-act="db-f" data-v="ok" aria-pressed="${!f.falta}">Recebido completo</button><button data-act="db-f" data-v="menos" aria-pressed="${!!f.falta}">Recebido a menos</button></div>
   ${f.falta?`<div class="dbit">${f.itens.map((x,i)=>`<div class="dbirow"><input class="txt" data-dbi="${i}" data-k="i" placeholder="Item que faltou (código ou nome)" value="${esc(x.i)}"><input class="txt num" data-dbi="${i}" data-k="q" placeholder="Qtd. que faltou" inputmode="decimal" value="${esc(x.q)}">${f.itens.length>1?`<button class="lnk" data-act="db-irm" data-v="${i}">remover</button>`:''}</div>`).join('')}<button class="lnk" data-act="db-iadd">+ outro item</button></div>`:''}
   <input class="txt" id="db-obs" placeholder="Observação (opcional)" value="${esc(f.obs||'')}" style="margin-top:8px">
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-act="db-cx" style="height:40px">Cancelar</button>${dbBtFim(o)}</div></div></td></tr>`; }
function dbTitulo(o,tx){ const xs=dbIrmas(o); return `${tx} do rancho ${esc(o.rancho||'')} · ${xs.length>1?'ordens '+xs.map(x=>esc(x.num)).join(', ')+' (vale para todas)':'ordem '+esc(o.num)}`; }
function dbBtFim(o){ const id=esc(o._id); return `<button class="btn" data-act="db-csalvar" data-id="${id}" style="height:40px">${ic('check',16,2.2)}Confirmar conferência</button>`; }
function fQ(n){ return (Math.round((+n||0)*10000)/10000).toLocaleString('pt-BR',{maximumFractionDigits:4}); }
function pQ(v){ v=String(v==null?'':v).trim(); if(!v) return 0; if(v.includes(',')) v=v.replace(/\./g,'').replace(',','.'); else if(/^\d{1,3}(\.\d{3})+$/.test(v)) v=v.replace(/\./g,''); const n=+v; return isFinite(n)&&n>0?n:0; }
const DB_ALMOX_OCULTO=['2']; /* almox 2 (em elaboração fábrica: areia, cimento granel, ensacado...) não passa pelo almox */
function dbVisivel(x){ return x.a==null||!DB_ALMOX_OCULTO.includes(String(x.a)); }
function dbItensRc(o){ const rc=o.rancho&&ranchoDe(o.rancho); if(!rc) return {st:'sem'}; const velho=rc.itens&&rc.itens.length&&rc.itens.every(x=>x.a===undefined)&&rc.asset;
  if(rc.itens&&rc.itens.length&&!velho) return {st:'ok',itens:rc.itens.filter(dbVisivel)}; if(velho&&S._itL&&S._itL[String(rc.numero)]==='erro') return {st:'ok',itens:rc.itens}; if(!rc.asset) return {st:'sem'};
  S._itL=S._itL||{}; const k=String(rc.numero); if(S._itL[k]==='erro') return {st:'erro'}; if(!S._itL[k]){ S._itL[k]='lendo'; carregarItensRancho(rc); } return {st:'lendo'}; }
async function carregarItensRancho(rc){ const k=String(rc.numero);
  try{ const b=await bytesAsset(rc.asset); const pags=await textoPaginasPdf(b); const m=lerItensRancho(pags); const its=m[k]||[]; if(!its.length) throw new Error('vazio'); rc.itens=its; S._itL[k]='ok'; try{ if(S.db) await S.db.doc('ranchos/'+k).update({itens:its}); }catch(e){} }
  catch(e){ S._itL[k]='erro'; }
  const D=S.dbo; if(D.aberto&&D.f&&D.f.modo==='lendo'){ const o=ordById(D.aberto); if(o) D.f=dbNovoF(o,D.f.fm); } if(S.view==='diario') render(); }
function dbNovoF(o,fm){ const R=dbItensRc(o), ent=(o.rdb&&o.rdb.ent&&o.rdb.ent.itens)||[];
  if(R.st==='ok') return {modo:'itens',fm,obs:'',itens:R.itens.map(x=>{ const ei=ent.find(y=>y.c===x.c); const qe=ei?(+ei.qe||0):x.q, ok=ei?!!ei.ok:true; return {c:x.c,d:x.d,um:x.um,q:x.q,qe,ok,qr:ok?qe:0,ent:!!ei}; })};
  if(R.st==='lendo') return {modo:'lendo',fm};
  return fm==='conf'?{modo:'livre',fm,falta:false,itens:[{i:'',q:''}],obs:''}:{modo:'sem',fm,obs:''}; }
function dbForm(o){ const f=S.dbo.f||{}; const id=esc(o._id);
  if(f.modo==='pend') return `<tr class="dbform"><td colspan="11"><div class="dbfw"><b>${dbTitulo(o,'Deixar pendente')}</b><div class="sub" style="margin:6px 0">O rancho fica em aberto (amarelo) até o almox encerrar. Escreva o motivo.</div>
    <input class="txt" id="db-obs" placeholder="Motivo da pendência (ex.: aguardando complemento de embalagem)" value="${esc(f.obs||'')}"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn sec" data-act="db-cx" style="height:40px">Cancelar</button><button class="btn" data-act="db-psalvar" data-id="${id}" style="height:40px">${ic('check',16,2.2)}Deixar pendente</button></div></div></td></tr>`;
  if(f.fm==='conf'&&f.modo==='livre') return dbFormLivre(o);
  const cx=`<button class="btn sec" data-act="db-cx" style="height:40px">Cancelar</button>`;
  const tit=`<b>${dbTitulo(o,f.fm==='ent'?'Entrega na linha':'Conferência')}</b>`;
  if(f.modo==='lendo') return `<tr class="dbform"><td colspan="11"><div class="dbfw">${tit}<div class="empty" style="padding:18px">Lendo os itens do PDF do rancho…</div><div style="display:flex;justify-content:flex-end">${cx}</div></div></td></tr>`;
  if(f.modo==='sem') return `<tr class="dbform"><td colspan="11"><div class="dbfw">${tit}<div class="sub" style="margin:6px 0">Este rancho não tem a lista de itens (sem PDF anexado ou não consegui ler). Dá para confirmar a entrega assim mesmo.</div>
    <input class="txt" id="db-obs" placeholder="Observação (opcional)" value="${esc(f.obs||'')}" style="margin-top:4px"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">${cx}<button class="btn" data-act="db-esalvar" data-id="${id}" style="height:40px">${ic('check',16,2.2)}Confirmar entrega</button></div></div></td></tr>`;
  const E=f.fm==='ent';
  return `<tr class="dbform"><td colspan="11"><div class="dbfw">${tit}
   <div class="sub" style="margin:4px 0 8px;font-size:12.5px">${E?'Marque o que está entregando. Se a quantidade for diferente do pedido, mude no campo.':'Marque o que chegou e ajuste a quantidade recebida. O que faltar em relação ao pedido vira "a menos" automaticamente.'}</div>
   <div class="dbtw"><table class="dbti"><thead><tr><th><input type="checkbox" data-dball ${f.itens.every(x=>x.ok)?'checked':''} aria-label="Marcar todos"></th><th>Item</th><th>Descrição</th><th>UM</th><th class="r">Pedido</th>${E?'':'<th class="r">Entregue</th>'}<th class="r">${E?'Entregando':'Recebido'}</th></tr></thead><tbody>
   ${f.itens.map((x,i)=>`<tr class="${x.ok?'':'off'}"><td><input type="checkbox" data-dbk="${i}" ${x.ok?'checked':''} aria-label="${esc(x.c)}"></td><td class="num"><b>${esc(x.c)}</b></td><td>${esc(x.d)}</td><td>${esc(x.um)}</td><td class="num r" data-l="Pedido:">${fQ(x.q)} ${esc(x.um)}</td>${E?'':`<td class="num r" data-l="Entregue:">${x.ent?fQ(x.ok?x.qe:0):'—'}</td>`}<td class="r"><input class="txt num dbqi" data-dbq="${i}" inputmode="decimal" value="${fQ(E?x.qe:x.qr)}" aria-label="Quantidade ${esc(x.c)}"></td></tr>`).join('')}
   </tbody></table></div>
   <input class="txt" id="db-obs" placeholder="Observação (opcional)" value="${esc(f.obs||'')}" style="margin-top:8px">
   <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px">${cx}${E?`<button class="btn" data-act="db-esalvar" data-id="${id}" style="height:40px">${ic('check',16,2.2)}Confirmar entrega</button>`:dbBtFim(o)}</div></div></td></tr>`; }
function dbVer(o,k){ const r=o.rdb||{}, v=r[k]; if(!v) return ''; const ent=(r.ent&&r.ent.itens)||[]; const rc=o.rancho&&ranchoDe(o.rancho); const base=(rc&&rc.itens)||ent;
  let linhas;
  if(k==='conf'&&v.rec) linhas=v.rec.map(x=>{ const b=base.find(y=>y.c===x.c)||{}; const f=x.q-(x.qr||0); return {c:x.c,d:b.d||'',um:b.um||'',q:x.q,qe:x.qe,qr:x.qr,f}; });
  else if(k==='ent'&&v.itens) linhas=v.itens.map(x=>({c:x.c,d:x.d,um:x.um,q:x.q,qe:x.qe,f:x.q-x.qe}));
  if(linhas){ const oc=new Set(((rc&&rc.itens)||[]).filter(x=>!dbVisivel(x)).map(x=>x.c)); linhas=linhas.filter(x=>!oc.has(x.c)); }
  const tab=linhas?`<div class="dbtw"><table class="dbti"><thead><tr><th>Item</th><th>Descrição</th><th>UM</th><th class="r">Pedido</th><th class="r">Entregue</th>${k==='conf'?'<th class="r">Recebido</th>':''}<th class="r">${k==='conf'?'Faltou':'Diferença'}</th></tr></thead><tbody>
    ${linhas.map(x=>`<tr class="${x.f>1e-6?'dbfal':''}"><td class="num"><b>${esc(x.c)}</b></td><td>${esc(x.d)}</td><td>${esc(x.um)}</td><td class="num r" data-l="Pedido:">${fQ(x.q)} ${esc(x.um)}</td><td class="num r" data-l="Entregue:">${x.qe==null?'—':fQ(x.qe)}</td>${k==='conf'?`<td class="num r" data-l="Recebido:">${fQ(x.qr)}</td>`:''}<td class="num r">${x.f>1e-6?'<b>'+fQ(x.f)+'</b>':'—'}</td></tr>`).join('')}</tbody></table></div>`
   :(v.itens&&v.itens.length?`<div class="dbfo">${v.itens.map(x=>`<div><b>${esc(x.i||x.c)}</b>${x.q?' · faltou '+esc(x.q):''}</div>`).join('')}</div>`:'');
  return `<tr class="dbform"><td colspan="11"><div class="dbfw"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>${k==='conf'?'Conferência':'Entrega na linha'} · rancho ${esc(o.rancho||'')} · ordem ${esc(o.num)} · ${dia(v.em)} ${hora(v.em)}${v.por?' · '+esc(nomeDe(v.por)):''}</b><button class="lnk" data-act="db-ver" data-id="${esc(o._id)}" data-k="${k}">Fechar</button></div>
   ${v.junto?`<div class="sub" style="margin:4px 0">Conferido junto com a ordem <b>${esc(v.junto)}</b>. Os itens estão nela.</div>`:''}${tab}${v.obs?`<div class="sub" style="margin-top:8px">Obs.: ${esc(v.obs)}</div>`:''}</div></td></tr>`; }
function dbModal(){ const D=S.dbo; let h='';
  if(D.aberto){ const o=ordById(D.aberto); if(o) h=dbForm(o); } else if(D.ver){ const [id,k]=D.ver.split('|'); const o=ordById(id); if(o) h=dbVer(o,k); }
  if(!h) return ''; h=h.replace(/^<tr class="dbform"><td colspan="11">/,'').replace(/<\/td><\/tr>$/,'');
  return `<div class="dbmodal" role="dialog" aria-modal="true"><div class="dbmbox" style="${boxPos('dbmbox')}"><div class="dbgrip" title="Arraste para mover a janela · duplo clique volta ao centro">⠿⠿</div>${h}</div></div>`; }
function dbAbrirRancho(num){ num=String(num||'').replace(/\D/g,''); if(!num){ return false; } const D=S.dbo;
  const xs=S.ordens.filter(o=>String(o.rancho||'')===num&&(o.status==='aberta'||o.status==='encerrada')); if(!xs.length) return false;
  const o=xs.find(x=>x.status==='aberta')||xs[0]; const e=dbEt(o), PD=dbPode(); const h=hojeStr(), d=dataEf(o);
  D.dia=o.status==='aberta'&&d<h?h:(o.status==='encerrada'&&o.fimEm?hojeStr(new Date(o.fimEm)):d); D.linha='todas'; D.so=''; D.modo='tabela'; D.aberto=null; D.f=null; D.ver=null;
  if(!e.ent&&PD.alm){ D.aberto=o._id; D.f=dbNovoF(o,'ent'); } else if(e.ent&&!e.conf&&PD.prod){ D.aberto=o._id; D.f=dbNovoF(o,'conf'); } else if(e.conf){ D.ver=o._id+'|conf'; } else if(e.ent){ D.ver=o._id+'|ent'; }
  if(S.view!=='diario') go('diario'); else render(); return true; }
function dbLinkInicial(){ let m=null; try{ m=(location.hash+'&'+location.search+'&'+document.referrer+'&'+(window.name||'')).match(/rancho=(\d{6,})/); }catch(e){} if(!m) return; const num=m[1]; let t=0;
  const tenta=()=>{ if(S.acs&&S.acs.pronto&&!acsGate()&&S.ordens.some(o=>String(o.rancho||'')===num)){ if(viewOk('diario')) dbAbrirRancho(num); try{ history.replaceState(null,'',location.pathname+location.search.replace(/[?&]rancho=\d+/,'')); }catch(e){} return; } if(++t<60) setTimeout(tenta,500); else if(!(S.acs&&S.acs.pronto&&!acsGate())){ t=0; setTimeout(tenta,800); } else toast('Rancho '+num+' não encontrado no painel.'); };
  setTimeout(tenta,300); }
dbLinkInicial(); window.addEventListener('hashchange',dbLinkInicial);
function dbMonStatus(r){ const o=r.o, e=r.e; let c,t,sub='',pisca=false;
    if(!o.rancho){ c='crit'; t='SEM RANCHO'; sub='PCP precisa anexar'; pisca=true; }
    else if(e.fim&&e.fim.st==='encerrado'){ c='ok'; t=e.ent&&!e.ent.acerto?'ENTREGUE '+hora(e.ent.em):'ENTREGUE'; }
    else if(e.conf&&e.conf.falta&&!e.compRec){ c='crit'; t='VEIO A MENOS'; sub=e.comp?'complemento a caminho':'aguardando complemento'; pisca=!e.comp; }
    else if(e.conf){ c='ok'; t='CONFERIDO'; sub='almox encerrar'; }
    else if(e.ent){ c='ok'; t='ENTREGUE '+hora(e.ent.em); sub='produção conferir'; }
    else if(dbPri(o)===1){ c='warn'; t='PRIORIDADE'; sub=(e.sep?'separado':'a separar')+' · PCP pediu'; pisca=true; }
    else { const m=dbPrazoMin(o), H=dbHoraEnt(); sub=e.sep?'separado '+hora(e.sep.em):'a separar';
      if(m<0){ c='crit'; t='ATRASADO'; sub='era até '+H+' · '+sub; pisca=true; } else if(m<=60){ c='warn'; t='FALTAM '+m+' MIN'; sub+=' · até '+H; pisca=true; } else { c='neu'; t='ATÉ '+H; } }
    return {c,t,sub,pisca}; }
function dbMonitor(rows){ const D=S.dbo, agora=new Date(), H=dbHoraEnt(), LT=linhasOrd(), h=hojeStr(), am=amanhaStr();
  if(!document.getElementById('mdfont')){ try{ const l=document.createElement('link'); l.id='mdfont'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'; document.head.appendChild(l); }catch(e){} }
  const feito=r=>!!(r.e.ent||(r.e.fim&&r.e.fim.st==='encerrado'));
  const peso={crit:0,warn:1,neu:2,ok:3};
  const cor={crit:'#D64545',warn:'#E0930F',neu:'#1B5C7A',ok:'#2E9E5B'};
  const tl=t=>t.charAt(0)+t.slice(1).toLowerCase();
  const item=r=>{ const o=r.o, e=r.e, x=dbMonStatus(r); const n=(e.sep?1:0)+(e.ent?1:0)+(e.conf?1:0);
    return `<div class="mei ${x.c} ${x.pisca?'pisca':''} ${feito(r)?'fe':''}"><span class="meb" style="background:${cor[x.c]}"></span><div class="mec">
     <div class="mea"><b>OP ${esc(o.num)}</b><span>${o.rancho?'rancho '+esc(o.rancho):'sem rancho'}</span></div>
     <div class="mep"><b>${esc(codigoDe(o))}</b> · ${esc(nomeCurto(o))} · ${f0(o.total)} ${esc(uA(o))}</div>
     <div class="mef"><span class="mdstp">${[0,1,2].map(k=>`<i class="${n>k?'on':''}"></i>`).join('')}</span>${x.sub?`<span class="mesub">${esc(x.sub)}</span>`:''}</div></div>
     <div class="mest" style="color:${cor[x.c]}">${esc(tl(x.t))}</div></div>`; };
  const porL={}; rows.forEach(r=>{ (porL[r.o.linha]=porL[r.o.linha]||[]).push(r); });
  const ls=Object.keys(porL).sort((a,b)=>LT.indexOf(a)-LT.indexOf(b));
  const pendT=rows.filter(r=>!feito(r)), atras=pendT.filter(r=>dbMonStatus(r).c==='crit').length;
  const body=ls.map(l=>{ const rs=porL[l].slice().sort((a,b)=>(feito(a)?1:0)-(feito(b)?1:0)||priOrd(a.o)-priOrd(b.o)||peso[dbMonStatus(a).c]-peso[dbMonStatus(b).c]||seqCmp(a.o,b.o)); const pior=rs.length?dbMonStatus(rs[0]).c:'ok';
    return `<section class="mecol"><header style="border-top-color:${feito(rs[0])?cor.ok:cor[pior]}"><b>${esc(l)}</b><span>${rs.filter(feito).length}/${rs.length} entregues</span></header>${rs.map(item).join('')}</section>`; }).join('');
  const logo=(document.querySelector('.brand img')||{}).src;
  return `<div class="mdw"><div class="mdh">${logo?`<img class="mdlogo" src="${logo}" alt="Colafix">`:''}<div class="mdtt"><div class="mdt">Ranchos · ${esc(dmTxt(D.dia))}</div><div class="mds">Entrega na linha até <b>${H}</b>${D.dia!==h?' de '+dm(D.dia):''}</div></div>
   <div class="mddia"><button data-act="db-dia" data-v="${h}" aria-pressed="${D.dia===h}">Hoje</button><button data-act="db-dia" data-v="${am}" aria-pressed="${D.dia===am}">${amanhaLab()}</button><input type="date" id="db-data" value="${esc(D.dia)}" aria-label="Escolher dia"></div>
   <div class="mdk"><b>${pendT.length}</b><span>a entregar</span></div><div class="mdk r"><b>${atras}</b><span>atrasados</span></div><div class="mdk g"><b>${rows.length-pendT.length}</b><span>entregues</span></div>
   <div class="mdclock" id="mclock">${hora(agora.toISOString())}</div><button class="mdsair" data-act="db-modo" data-v="tabela" title="Sair (Esc)">✕</button></div>
   ${ls.length?`<div class="megrid" style="--n:${Math.min(ls.length,5)}">${body}</div>`:'<div class="mdvz">Nenhuma ordem programada para '+esc(dmTxt(D.dia).toLowerCase())+'.</div>'}</div>`; }
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.view==='diario'&&S.dbo.modo==='monitor'&&!document.querySelector('.dbmodal')){ S.dbo.modo='tabela'; render(); } });
(function(){ let f=''; try{ f=localStorage.getItem('colafix.monitor')||''; }catch(e){} if(!f) return; let t=0; const tenta=()=>{ if(S.acs&&S.acs.pronto&&S.ordens&&S.ordens.length){ if(viewOk('diario')){ S.dbo.modo='monitor'; S.dbo.dia=hojeStr(); go('diario'); } return; } if(++t<40) setTimeout(tenta,500); }; setTimeout(tenta,500); })();
setInterval(()=>{ const c=document.getElementById('mclock'); if(c) c.textContent=hora(new Date().toISOString()); },15000);
const PRI={1:{t:'Muito alta',c:'crit'},2:{t:'Alta',c:'warn'},3:{t:'Média',c:'neu'},4:{t:'Baixa',c:'neu'}};
function dbPri(o){ const u=dbUrg(o); return u?(+u.n||1):0; }
function priOrd(o){ const p=dbPri(o); return p===4?10:(p||9); }
function priTag(o){ const p=dbPri(o); return p?`<span class="prit p${p}">P${p} · ${PRI[p].t}</span>`:''; }
function dbUrg(o){ if(!o.rancho) return (o.rdb&&o.rdb.urg)||null; return dbIrmas(o).some(x=>x.rdb&&x.rdb.urg)?(dbIrmas(o).find(x=>x.rdb&&x.rdb.urg).rdb.urg):null; }
function dbUrgBtn(o){ if(!dbPode().prod||!o.rancho) return ''; const u=dbPri(o)===1; return `<button class="btn ${u?'':'sec'} dburg ${u?'on':''}" data-act="db-urg" data-id="${esc(o._id)}" title="${u?'Tirar a prioridade':'PCP: avisar o almox que este rancho tem prioridade'}">${u?'✓ Prioridade (tirar)':'Dar prioridade'}</button>`; }
function dbFechar(){ const D=S.dbo; D.aberto=null; D.f=null; D.ver=null; render(); }
document.addEventListener('click',ev=>{ if(ev.target.classList&&ev.target.classList.contains('dbmodal')) dbFechar(); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&(S.dbo.aberto||S.dbo.ver)&&document.querySelector('.dbmodal')) dbFechar(); });
function dbFimHtml(o,e,podeA){ const f=e.fim, id=esc(o._id); let h='';
  if(f) h+=`<small class="dbcp">${f.st==='encerrado'?'Encerrado':'Pendente'} ${hora(f.em)}${f.por?' · '+esc(nomeDe(f.por)):''}${f.st==='pendente'&&f.motivo&&!/^Faltou:/.test(f.motivo)?' · <b>'+esc(f.motivo)+'</b>':''}</small>`;
  if(podeA&&e.conf&&!(f&&f.st==='encerrado')) h+=`<span class="dbfimb">${f?'':`<button class="dbb dbcb" data-act="db-pend" data-id="${id}">Deixar pendente</button>`}<button class="dbb dbcb" data-act="db-encerrar" data-id="${id}">Encerrar rancho</button></span>`;
  return h; }
function vDiario(){ const D=S.dbo, h=hojeStr(); if(!D.dia) D.dia=h; const dia=D.dia, am=amanhaStr(), LT=linhasOrd(); const diaP=typeof dbDiaProd==='function'?dbDiaProd(dia):dia; /* dia da produção (no modo entrega: próximo dia útil) */
  S._est={}; LT.forEach(l=>Object.assign(S._est,estimarLinha(l)));
  const PD=dbPode(), pode=PD.prod, podeA=PD.alm; if(!D.modo) D.modo=PD.prod?'tabela':'fila';
  const dq=String(D.q||'').trim().toLowerCase(), dqCasa=o=>[o.num,o.ensaca,o.rancho,o.produto,o.obs].some(v=>v!=null&&String(v).toLowerCase().includes(dq));
  let xs=S.ordens.filter(o=>o.linha&&(o.status==='aberta'||o.status==='encerrada')).filter(o=>{ if(dq) return dqCasa(o); const d=dataEf(o); const k=o.status==='aberta'&&d<h?h:(o.status==='encerrada'&&o.fimEm?hojeStr(new Date(o.fimEm)):d); return k===diaP||(o.status==='aberta'&&d<=diaP&&dia===h); });
  /* pedido de 13/10: rancho já entregue na linha num dia anterior (ordem que continua ou foi reprogramada) não volta para o diário; só fica se veio a menos e ainda falta o complemento */
  if(!dq) xs=xs.filter(o=>{ const e=dbEt(o), v=e.ent; if(!v) return true; const iso=typeof v==='string'?v:v.em; if(!iso||hojeStr(new Date(iso))>=dia) return true; return dbMenosAberto(e); });
  /* pedido de 14/10: ordem que "passou para amanhã" (continua de um dia anterior) já começou a rodar, então o rancho já foi para a linha:
     não aparece de novo como nova. Só fica se ainda falta algo do rancho (veio a menos, entregue em parte ou separado com falta). "Mostrar" traz de volta. */
  S.dbo._contN=0;
  if(!dq&&!D.cont) xs=xs.filter(o=>{ const cont=o.continuaEm&&o.data&&o.continuaEm>o.data&&dia>o.data; if(!cont) return true; const e=dbEt(o), r=o.rdb||{};
    const falta=dbMenosAberto(e)||(r.entp&&r.entp.length&&!r.ent)||(r.sep&&r.sep.falta&&!r.ent); if(falta) return true; S.dbo._contN++; return false; });
  if(D.linha!=='todas') xs=xs.filter(o=>o.linha===D.linha);
  if(D.pri) xs=xs.filter(o=>D.pri==='sem'?!dbPri(o):String(dbPri(o))===D.pri);
  xs.sort((a,b)=>LT.indexOf(a.linha)-LT.indexOf(b.linha)||seqCmp(a,b));
  const rows=xs.map(o=>{ const e=dbEt(o), est=S._est[o._id], st=dbSit(o,e,est); return {o,e,st,est}; });
  if(D.modo==='monitor') return dbMonitor(rows);
  const fil=D.so?rows.filter(r=>D.so==='pend'?(r.st.c!=='ok'):D.so==='menos'?dbMenosAberto(r.e):D.so==='atraso'?(r.st.c==='crit'):true):rows;
  S._dbFil=fil;
  const cnt={semr:rows.filter(r=>!r.o.rancho).length,sep:rows.filter(r=>r.o.rancho&&!r.e.sep).length,ent:rows.filter(r=>r.e.sep&&!r.e.ent).length,conf:rows.filter(r=>r.e.ent&&!r.e.conf).length,menos:rows.filter(r=>dbMenosAberto(r.e)).length,ok:rows.filter(r=>r.e.conf&&!dbMenosAberto(r.e)&&!(r.e.fim&&r.e.fim.st==='pendente')).length,pend:rows.filter(r=>r.e.fim&&r.e.fim.st==='pendente').length};
  const per=[['hoje','Hoje',h],['amanha',amanhaLab(),am]];
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Diário de bordo do rancho</h1><div class="sub">Cada etapa do rancho com hora e quem fez: enviado ao almox → separado → entregue na linha → conferido pela produção.</div></div>
   <div class="seg" role="group" aria-label="Modo"><button data-act="db-modo" data-v="tabela" aria-pressed="${D.modo==='tabela'}">Diário completo</button><button data-act="db-modo" data-v="monitor" aria-pressed="false" title="Tela cheia para deixar fixo no monitor">${ic('tv',16,2)}Monitor</button><button data-act="db-modo" data-v="fila" aria-pressed="${D.modo==='fila'}">Fila do almox${(()=>{ const n=cnt.sep+cnt.ent+rows.filter(r=>r.e.conf&&r.e.conf.falta&&!r.e.comp).length+new Set(rows.filter(r=>r.o.rancho&&r.e.conf&&!(r.e.fim&&r.e.fim.st==='encerrado')).map(r=>r.o.rancho)).size; return n?` <b class="dbq num">${n}</b>`:''; })()}</button></div></div>
  <div class="rsm num"><span class="${cnt.semr?'warn':''}">Sem rancho <b>${cnt.semr}</b></span><span>Aguardando separação <b>${cnt.sep}</b></span><span>Aguardando entrega <b>${cnt.ent}</b></span><span>Aguardando conferência <b>${cnt.conf}</b></span><span class="${cnt.menos?'warn':''}">A menos sem solução <b>${cnt.menos}</b></span><span class="${cnt.pend?'warn':''}">Pendentes <b>${cnt.pend}</b></span><span>Conferidos <b>${cnt.ok}</b></span></div>
  <section class="card ofil pfil"><div class="pf-r1"><div class="seg" role="group" aria-label="Dia">${per.map(([k,l,d])=>`<button data-act="db-dia" data-v="${d}" aria-pressed="${dia===d}">${l} <small class="num">${dm(d)}</small></button>`).join('')}</div>
   <input type="date" class="txt" id="db-data" value="${esc(dia)}" style="width:auto;height:38px" aria-label="Escolher dia">
   <label class="srch" style="flex:1 1 240px;min-width:200px;max-width:340px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input class="txt" id="db-busca" type="search" placeholder="Pesquisar ordem, produto ou rancho" value="${esc(D.q||'')}" style="height:38px" aria-label="Pesquisar ordem, produto ou rancho"></label>
   <input class="txt num" id="db-rch" inputmode="numeric" placeholder="Abrir rancho nº" style="width:160px;height:38px" aria-label="Abrir rancho pelo número">
   <select class="txt prisel ${D.pri&&D.pri!=='sem'?'p'+D.pri:''}" id="db-pri" style="width:auto;max-width:none;height:38px;font-size:13px" aria-label="Filtrar por prioridade"><option value="">Todas as prioridades</option>${[1,2,3,4].map(n=>`<option value="${n}" ${D.pri===String(n)?'selected':''}>${n} · ${PRI[n].t}</option>`).join('')}<option value="sem" ${D.pri==='sem'?'selected':''}>Sem prioridade</option></select>
   <div class="seg" role="group" aria-label="Mostrar" style="margin-left:auto">${[['','Tudo'],['pend','Pendentes'],['atraso','Atrasados'],['menos','A menos']].map(([k,l])=>`<button data-act="db-so" data-v="${k}" aria-pressed="${D.so===k}">${l}</button>`).join('')}</div></div>
   <div class="pf-lin">${['todas',...LT].map(l=>`<span class="pf-l ${D.linha===l?'on':''}"><button data-act="db-linha" data-v="${esc(l)}">${l==='todas'?'Todas as linhas':esc(l)}</button></span>`).join('')}</div>${dq?`<div class="sub" style="margin:10px 0 0;font-size:13px">Pesquisando “${esc(D.q.trim())}” em todos os dias: <b>${fil.length}</b> ${fil.length===1?'ordem':'ordens'}. <button class="lnk" data-act="db-busca-x">limpar pesquisa</button></div>`:''}</section>
  ${D.modo==='fila'?dbFila(rows,podeA):dbAcertoHtml(fil)+`<section class="card ${dbMaster()?'dbm':''}" style="padding:0;overflow:hidden"><div class="dbw"><table class="dbt"><thead><tr><th>#</th><th>Linha</th><th>Ordem</th><th>Produto</th><th>Rancho</th><th>Anexado</th><th>Enviado almox</th><th>Separado</th><th>Entregue na linha</th><th>Conferido</th><th>Situação</th></tr></thead><tbody>
   ${fil.length?fil.map((r,i)=>{ const o=r.o, e=r.e, st=r.st;
     return `<tr class="st-${st.c}${dbPri(o)===1&&!e.ent?' dbpis':''}"><td class="num">${i+1}</td><td>${esc(o.linha)}</td><td class="num"><b>${esc(o.num)}</b>${dq?`<small>${o.status==='encerrada'?'encerrada':'dia'} ${dm(o.status==='encerrada'&&o.fimEm?hojeStr(new Date(o.fimEm)):dataEf(o))}</small>`:''}${r.est&&o.status==='aberta'?`<small title="Início previsto na linha">início ${minHora(r.est.ini%1440)}${r.est.ini>=1440?' +'+Math.floor(r.est.ini/1440)+'d':''}</small>`:''}</td><td><b>${esc(codigoDe(o))}</b> <span class="dbn">${esc(nomeCurto(o))}</span><small class="dbq2 num">${f0(o.total)} ${esc(uA(o))}${paleteDe(o)?' · '+(Math.round(o.total/paleteDe(o)*10)/10).toLocaleString('pt-BR')+' pal.':''}${entregueDe(o)>0?' · produzido '+fq(entregueDe(o)):''}</small></td>
      <td class="num">${o.rancho?esc(o.rancho):(pode?`<button class="dbb lt" data-act="o-anexar-rancho" data-id="${esc(o._id)}">Anexar</button>`:'—')}</td>
      ${o.rancho?dbCel(o,'emi',e.emi,false,false):'<td class="dbc lt"></td>'}${o.rancho?dbCel(o,'env',e.env,false,false):'<td class="dbc"></td>'}
      ${o.rancho?dbCel(o,'sep',e.sep,r.st.late.sep,podeA):'<td class="dbc"></td>'}${o.rancho?dbCel(o,'ent',e.ent,r.st.late.ent,podeA&&!!e.sep||podeA&&!!e.ent):'<td class="dbc"></td>'}${o.rancho?dbCel(o,'conf',e.conf,r.st.late.conf,pode&&!!e.ent):'<td class="dbc"></td>'}
      <td><span class="pill ${st.c}">${st.t}</span>${e.conf&&e.conf.falta?`<small class="dbmn">${(e.conf.itens||[]).map(x=>esc(x.i)+(x.q?' ('+esc(x.q)+')':'')).join(', ')}${e.conf.obs?' · '+esc(e.conf.obs):''}</small>${dbCompHtml(o,e,podeA,pode)}`:e.conf&&e.conf.obs?`<small class="dbmn" style="color:var(--muted)">${esc(e.conf.obs)}</small>`:''}${dbPri(o)&&!e.ent?'<small class="urgt">'+priTag(o)+'</small>':''}${!e.ent&&o.rancho&&pode?dbUrgBtn(o).replace('btn ','btn dbcb '):''}${dbFimHtml(o,e,podeA)}${dbMaster()&&o.rancho&&!(e.fim&&e.fim.st==='encerrado')?`<button class="lnk dbja" data-act="db-jafeito" data-id="${esc(o._id)}" title="Master: marca separado, entregue, conferido e encerrado de uma vez, para todas as ordens do rancho">✓ já foi feito</button>`:''}</td></tr>`; }).join(''):`<tr><td colspan="11"><div class="empty">Nenhuma ordem ${D.so?'com esse filtro ':''}para ${dmTxt(dia).toLowerCase()}.</div></td></tr>`}
   </tbody></table></div></section>`}${dbModal()}
  <div class="sub" style="font-size:12px">Vermelho = atrasado: separação mais de ${DB_PRAZO.sep} min depois de enviado · conferência mais de ${DB_PRAZO.conf} min depois de entregue · rancho não entregue quando chega o horário previsto da ordem na linha. "Anexado" e "Enviado almox" vêm da aba Ranchos.</div>`; }
function dbIrmas(o){ if(!o.rancho) return [o]; const L=linhasOrd(); const rc=ranchoDe(o.rancho), nums=new Set(((rc&&rc.ordens)||[]).map(x=>String(x.num)));
  const xs=S.ordens.filter(x=>(x.status==='aberta'||x.status==='encerrada')&&(String(x.rancho||'')===String(o.rancho)||(!x.rancho&&nums.has(String(x.num)))));
  if(!xs.includes(o)) xs.push(o); return xs.sort((a,b)=>L.indexOf(a.linha)-L.indexOf(b.linha)||seqCmp(a,b)); }
async function dbImprimir(o){ const xs=dbIrmas(o), rc=o.rancho&&ranchoDe(o.rancho), tem=!!(rc&&rc.asset);
  if(!tem) toast('O rancho '+(o.rancho||'')+' não tem PDF anexado: vai só a folha de produção. Anexe o PDF na aba Ranchos.');
  return gerarFolhasProducao(xs,S.dbo.dia||hojeStr(),'Rancho_'+(o.rancho||o.num)+'_'+xs.map(x=>x.num).join('-').slice(0,60)+'.pdf',{porRancho:true,msg:'PDF pronto: '+xs.length+' '+(xs.length===1?'folha':'folhas')+(tem?' + rancho '+o.rancho:' (sem o PDF do rancho)')+'.'}); }
const DB_ETAPAS=[['sep','já separados'],['ent','já entregues na linha'],['conf','já conferidos (completo)'],['fim','já encerrados (tudo feito)']];
function dbFeito(e,kk){ return kk==='fim'?!!(e.fim&&e.fim.st==='encerrado'):!!e[kk]; }
function dbAcertoFill(r,i,agora){ DB_ETAPAS.slice(0,i+1).forEach(([kk])=>{ if(dbFeito(r,kk)) return; const b={em:agora,por:S.uid||null,acerto:true};
  r[kk]=kk==='conf'?Object.assign(b,{falta:false,itens:[],obs:''}):kk==='fim'?Object.assign(b,{st:'encerrado',antes:r.fim||null}):b; }); return r; }
const DB_CASC={sep:['sep','ent','conf','fim','comp','compRec'],ent:['ent','conf','fim','comp','compRec'],conf:['conf','fim','comp','compRec']};
async function dbDesfazer(o,k,cascata,agora){ const r=Object.assign({},o.rdb||{}); if(!r[k]) return false; const ks=cascata?DB_CASC[k].filter(x=>r[x]):(k==='conf'?['conf','fim'].filter(x=>r[x]):[k]);
  const antes={}; ks.forEach(x=>{ antes[x]=r[x]; r[x]=null; }); /* null e não delete: o update do banco mescla campos e não apagaria a chave */ r.desfeitos=(r.desfeitos||[]).concat([{k,ks,antes,em:agora,por:S.uid||null}]).slice(-20);
  const nm={sep:'separado',ent:'entregue',conf:'conferido',fim:'encerramento/pendência',comp:'complemento enviado',compRec:'complemento recebido'};
  return dbSalvar(o,r,'Rancho: desfeito '+ks.map(x=>nm[x]).join(', ')); }
function dbAcertoAlvos(fil,k){ const i=DB_ETAPAS.findIndex(x=>x[0]===k); return fil.filter(r=>r.o.rancho&&DB_ETAPAS.slice(0,i+1).some(([kk])=>!dbFeito(r.e,kk))); }
function dbAcertoHtml(fil){ if(!dbMaster()) return ''; const D=S.dbo;
  const bts=DB_ETAPAS.map(([k,l])=>{ const n=dbAcertoAlvos(fil,k).length; if(!n) return ''; const c=D.acerto===k;
    return `<button class="btn ${c?'':'sec'}" data-act="db-acerto" data-k="${k}" style="height:36px;font-size:13px">${c?'Confirmar: marcar '+n+' como '+l+'?':'Marcar '+n+' como '+l}</button>${c?'<button class="lnk" data-act="db-acerto-x">cancelar</button>':''}`; }).join('');
  const nm={sep:'separado',ent:'entregue na linha',conf:'conferido'};
  const dfs=['conf','ent','sep'].map(k=>{ const n=fil.filter(r=>r.o.rdb&&r.o.rdb[k]).length; if(!n) return ''; const c=D.desf===k;
    return `<button class="btn ${c?'':'sec'} dbdf" data-act="db-desf-lote" data-k="${k}" style="height:36px;font-size:13px">${c?'Confirmar: desfazer '+nm[k]+' de '+n+'?':'Desfazer '+nm[k]+' ('+n+')'}</button>${c?'<button class="lnk" data-act="db-desf-x">cancelar</button>':''}`; }).join('');
  if(!bts) return '';
  return `<details class="card dbac-d" ${S.dbacAb?'open':''}><summary data-act="dbac-t"><b>Acertar pendências antigas</b> <span class="pill neu">só master</span><span class="rx-chev" aria-hidden="true">›</span></summary><div class="dbac" style="border:0;padding:10px 0 0"><div class="sub" style="margin:0;font-size:12px">Marca as ordens que estão na lista abaixo (respeita dia, linha e filtro), sem imprimir nada. Fica registrado com seu nome e a hora. Para desfazer, use o "desfazer" em cada ordem.</div><div class="dbacb">${bts}</div></div></details>`; }
function dbCompHtml(o,e,podeA,podeP){ const id=esc(o._id), q=v=>hora(v.em)+(v.por?' · '+esc(nomeDe(v.por)):'');
  let h=''; if(e.comp) h+=`<small class="dbcp">Complemento enviado ${q(e.comp)}</small>`; if(e.compRec) h+=`<small class="dbcp">Complemento recebido ${q(e.compRec)}</small>`;
  if(!e.comp&&podeA) h+=`<button class="dbb lt dbcb" data-act="db-comp" data-id="${id}">Complemento enviado</button>`;
  else if(e.comp&&!e.compRec&&podeP) h+=`<button class="dbb dbcb" data-act="db-comprec" data-id="${id}">Recebi o complemento</button>`;
  return h; }
function dbPrecisa(o){ const est=(S._est||{})[o._id]; if(!est||o.status!=='aberta') return null; const n=new Date(); return difDias(hojeStr(),est.dia)*1440+est.ini-(n.getHours()*60+n.getMinutes()); }
function dbPrecTxt(m,o){ if(m==null) return {t:'sem previsão de início',c:'neu'}; if(m<=0) return {t:'linha precisa agora',c:'crit'};
  const est=S._est[o._id], abs=est.ini, d=est.dia, hm=minHora(abs%1440), dd=abs>=1440?addDias(d,Math.floor(abs/1440)):d;
  if(m<60) return {t:'linha precisa em '+Math.round(m)+' min ('+hm+')',c:'crit'};
  if(m<180) return {t:'linha precisa em '+Math.floor(m/60)+'h'+String(Math.round(m%60)).padStart(2,'0')+' ('+hm+')',c:'warn'};
  return {t:'linha precisa às '+hm+(dd!==hojeStr()?' de '+dm(dd):''),c:'neu'}; }
/* 27/10 (pedido 'marcar a data que foi separado'): na fila, o dia junto da hora — o rancho separado ontem continua na fila */
function dbQuando(iso){ if(!iso) return ''; const d=hojeStr(new Date(iso)); return (d===hojeStr()?'hoje':dm(d))+' às '+hora(iso); }
function dbFila(rows,podeA){ const g={};
  rows.filter(r=>r.o.rancho&&!r.e.ent&&r.o.status==='aberta').forEach(r=>{ const k=String(r.o.rancho); (g[k]=g[k]||{num:k,rs:[],e:r.e}).rs.push(r); });
  const gs=Object.values(g).map(x=>{ const ms=x.rs.map(r=>dbPrecisa(r.o)).filter(m=>m!=null); x.m=ms.length?Math.min(...ms):null; x.o=x.rs.find(r=>dbPrecisa(r.o)===x.m)?.o||x.rs[0].o; return x; })
    .sort((a,b)=>priOrd(a.o)-priOrd(b.o)||(a.m==null)-(b.m==null)||(a.m-b.m)||a.num.localeCompare(b.num));
  const encG={}; rows.filter(r=>r.o.rancho&&r.e.conf&&!(r.e.fim&&r.e.fim.st==='encerrado')&&!(r.e.conf.falta&&!r.e.comp)).forEach(r=>{ const k=String(r.o.rancho); (encG[k]=encG[k]||[]).push(r); });
  const compAb=new Set(rows.filter(r=>r.o.rancho&&r.e.conf&&r.e.conf.falta&&!r.e.comp).map(r=>String(r.o.rancho)));
  const enc=Object.entries(encG).filter(([k])=>!compAb.has(k));
  const cp=rows.filter(r=>r.e.conf&&r.e.conf.falta&&!r.e.comp), sr=rows.filter(r=>!r.o.rancho&&r.o.status==='aberta');
  const card=x=>{ const p=dbPrecTxt(x.m,x.o), rc=x.e.rc, o0=x.rs[0].o, ug=dbPri(o0)===1;
    const lins=[...new Set(x.rs.map(r=>r.o.linha))]; const its=(rc&&rc.itens||[]).filter(dbVisivel);
    return `<div class="dbfc ${ug?'crit urg':'neu'}"><div class="dbfh2"><div class="dbfl">${lins.map(esc).join(' · ')}</div>${priTag(o0)}</div>
     <div class="dbfr"><span>Rancho</span> <b class="num">${esc(x.num)}</b></div>
     <table class="dbfot"><thead><tr><th>OP</th><th>Produto</th><th class="r">Qtd</th></tr></thead><tbody>${x.rs.map(r=>`<tr><td class="num"><b>${esc(r.o.num)}</b></td><td><b>${esc(codigoDe(r.o))}</b> ${esc(nomeCurto(r.o))}</td><td class="num r">${f0(r.o.total)} <small>${esc(uA(r.o))}</small></td></tr>`).join('')}</tbody></table>
     ${its.length?`<details class="dbfmat"><summary>Materiais do rancho (${its.length})</summary><table class="dbfot"><thead><tr><th>Código</th><th>Material</th><th class="r">Qtd</th></tr></thead><tbody>${its.map(i=>`<tr><td class="num"><b>${esc(i.c)}</b></td><td>${esc(i.d)}</td><td class="num r">${fQ(i.q)} <small>${esc(i.um)}</small></td></tr>`).join('')}</tbody></table></details>`:''}
     <div class="dbfm num">${rc?`Anexado ${dbQuando(x.e.emi)}${x.e.env?' · enviado ao almox '+dbQuando(x.e.env):' · <b>ainda não enviado ao almox</b>'}${rc.asset?'':' · <b>sem PDF do rancho</b>'}`:'<b>Rancho não está na aba Ranchos</b>'}</div>
     ${dbUrgBtn(o0).replace('dburg','dburg dburgw')}${(()=>{ const sp=x.rs.map(r=>r.e.sep).find(Boolean); return sp?`<div class="dbfsep">✓ Separado ${dbQuando(sp.em)}${sp.por?' · '+esc(nomeDe(sp.por)):''} · <b>falta entregar na linha</b></div>`:''; })()}${typeof epTxt==='function'?epTxt(o0):''}${podeA?`<div class="dbfbs"><button class="btn sec dbfb" data-act="db-imp" data-id="${esc(o0._id)}">${ic('baixar',18,2.2)}Imprimir</button>${x.rs.some(r=>r.e.sep)?`<button class="btn dbfb dbfent" data-act="db-mark" data-id="${esc(o0._id)}" data-k="ent">${ic('check',18,2.2)}Entregue</button>`:`<button class="btn dbfb" data-act="db-mark" data-id="${esc(o0._id)}" data-k="sep">${ic('check',18,2.2)}Separado</button>`}</div>`:''}</div>`; };
  const encH=enc.length?`<section class="card dbfsec"><h2>Para encerrar <span class="num">${enc.length}</span></h2><div class="sub">A produção já conferiu. Confira e encerre o rancho, ou deixe pendente com o motivo.</div>
   <div class="dbfg">${enc.map(([n,rs])=>{ const r0=rs.find(r=>r.e.conf&&(r.e.conf.falta||r.e.conf.rec))||rs[0], e=r0.e, f=e.fim, c=f&&f.st==='pendente'?'warn':'neu';
     return `<div class="dbfc ${c}"><div class="dbfh"><div><div class="eyebrow">RANCHO</div><b class="num dbfn">${esc(n)}</b></div><span class="pill ${c}">${f&&f.st==='pendente'?'pendente':'conferido '+hora(e.conf.em)}</span></div>
      <div class="dbfo">${rs.map(r=>`<div><span class="num"><b>${esc(r.o.num)}</b></span> · ${esc(r.o.linha)} · <b>${esc(codigoDe(r.o))}</b></div>`).join('')}</div>
      <div class="dbfm">${e.conf.falta?'Veio a menos: '+(e.conf.itens||[]).map(x=>esc(x.i)+(x.q?' ('+esc(x.q)+')':'')).join(', ')+(e.compRec?' · complemento recebido':e.comp?' · complemento enviado':''):'Recebido completo'}${f&&f.motivo&&f.st==='pendente'?'<br><b>Pendente:</b> '+esc(f.motivo):''}</div>
      ${podeA?`<div class="dbfbs">${f?'':`<button class="btn sec dbfb" data-act="db-pend" data-id="${esc(r0.o._id)}">Deixar pendente</button>`}<button class="btn dbfb" data-act="db-encerrar" data-id="${esc(r0.o._id)}">${ic('check',18,2.2)}Encerrar</button></div>`:''}</div>`; }).join('')}</div></section>`:'';
  return `${cp.length?`<section class="card dbfsec" style="border:1.5px solid var(--crit)"><h2>Complementos pendentes <span class="num">${cp.length}</span></h2><div class="sub">A produção recebeu a menos. Separe o que faltou e marque quando enviar.</div>
   <div class="dbfg">${cp.map(r=>`<div class="dbfc crit"><div class="dbfh"><div><div class="eyebrow">RANCHO ${esc(r.o.rancho)} · ${esc(r.o.linha)}</div><b class="num">Ordem ${esc(r.o.num)}</b></div><span class="pill crit">a menos há ${Math.max(0,Math.round((Date.now()-new Date(r.e.conf.em).getTime())/6e4))} min</span></div>
    <div class="dbfo">${(r.e.conf.itens||[]).map(x=>`<div><b>${esc(x.i)}</b>${x.q?' · faltou '+esc(x.q):''}</div>`).join('')}${r.e.conf.obs?`<div class="dbn">${esc(r.e.conf.obs)}</div>`:''}</div>
    ${podeA?`<button class="btn dbfb" data-act="db-comp" data-id="${esc(r.o._id)}">${ic('check',18,2.2)}Complemento enviado</button>`:''}</div>`).join('')}</div></section>`:''}
  <section class="card dbfsec"><h2>A separar e entregar <span class="num">${gs.length}</span></h2><div class="sub">O rancho fica aqui até ser marcado como entregue na linha. Urgentes do PCP aparecem primeiro, piscando.</div>
   ${gs.length?`<div class="dbfg">${gs.map(card).join('')}</div>`:`<div class="empty">Nada para separar ${S.dbo.linha!=='todas'?'nessa linha ':''}agora.</div>`}</section>
  ${encH}
  ${sr.length?`<div class="sub" style="font-size:12.5px"><b>${sr.length} ${sr.length===1?'ordem':'ordens'} sem rancho</b> (${sr.map(r=>esc(r.o.num)).join(', ')}): o PCP ainda precisa anexar.</div>`:''}`; }
async function dbSalvar(o,rdb,txt,rch){ const u={rdb,hist:histAdd(o,txt)}; if(rch&&!o.rancho) u.rancho=String(rch); if(await ordUpd(o._id,u)){ o.rdb=rdb; if(u.rancho) o.rancho=u.rancho; return true; } return false; }
setInterval(()=>{ try{ if(S.view==='diario'&&!S.dbo.aberto&&!(document.activeElement&&document.activeElement.matches('input,textarea,select'))) render(); }catch(e){} },60000);
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="db-"]'); if(!b) return; const act=b.dataset.act, D=S.dbo;
  if(act==='db-dia'){ D.dia=b.dataset.v; D.aberto=null; render(); return; }
  if(act==='db-so'){ D.so=b.dataset.v; render(); return; }
  if(act==='db-busca-x'){ D.q=''; render(); return; }
  if(act==='db-acerto-x'){ D.acerto=null; render(); return; }
  if(act==='db-desf-x'){ D.desf=null; render(); return; }
  if(act==='db-desf-lote'){ if(!dbMaster()) return; const k=b.dataset.k; if(D.desf!==k){ D.desf=k; D.acerto=null; render(); return; } D.desf=null;
    const alvos=(S._dbFil||[]).filter(x=>x.o.rdb&&x.o.rdb[k]); let n=0; toast('Desfazendo '+alvos.length+' ordens…');
    for(const x of alvos){ if(await dbDesfazer(x.o,k,true,new Date().toISOString())) n++; } toast('Desfeito em '+n+' '+(n===1?'ordem':'ordens')+'.'); render(); return; }
  if(act==='db-acerto'){ if(!dbMaster()) return; const k=b.dataset.k; if(D.acerto!==k){ D.acerto=k; D.desf=null; render(); return; } D.acerto=null;
    const fil=S._dbFil||[]; const alvos=dbAcertoAlvos(fil,k), i=DB_ETAPAS.findIndex(x=>x[0]===k), agora=new Date().toISOString(); let n=0;
    toast('Marcando '+alvos.length+' ordens…');
    for(const x of alvos){ const r=Object.assign({},x.o.rdb||{}); dbAcertoFill(r,i,agora);
      if(await dbSalvar(x.o,r,'Acerto do diário: marcado como '+({sep:'separado',ent:'entregue na linha',conf:'conferido',fim:'encerrado (tudo feito)'}[k]))) n++; }
    toast(n+' '+(n===1?'ordem marcada':'ordens marcadas')+' como '+DB_ETAPAS[i][1]+'.'); render(); return; }
  if(act==='db-modo'){ D.modo=b.dataset.v; D.aberto=null; try{ localStorage.setItem('colafix.monitor',D.modo==='monitor'?'1':''); }catch(e){} if(D.modo==='monitor'){ D.dia=hojeStr(); D.so=''; try{ document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{}); }catch(e){} } else { try{ document.fullscreenElement&&document.exitFullscreen(); }catch(e){} } render(); return; }
  if(act==='db-linha'){ D.linha=b.dataset.v; render(); return; }
  if(act==='db-f'){ D.f=D.f||{falta:false,itens:[{i:'',q:''}],obs:''}; dbLer(); D.f.falta=b.dataset.v==='menos'; render(); return; }
  if(act==='db-iadd'){ dbLer(); D.f.itens.push({i:'',q:''}); render(); return; }
  if(act==='db-irm'){ dbLer(); D.f.itens.splice(+b.dataset.v,1); render(); return; }
  if(act==='db-cx'){ D.aberto=null; D.f=null; render(); return; }
  const o=ordById(b.dataset.id); if(!o) return; const r=Object.assign({},o.rdb||{}); const agora=new Date().toISOString();
  if(act==='db-imp'){ dbImprimir(o); return; }
  if(act==='db-comp'||act==='db-comprec'){ const k=act==='db-comp'?'comp':'compRec'; r[k]={em:agora,por:S.uid||null};
    if(await dbSalvar(o,r,k==='comp'?'Complemento do rancho enviado pelo almox':'Complemento do rancho recebido na linha')){ toast('Ordem '+o.num+': '+(k==='comp'?'complemento enviado':'complemento recebido')+' às '+hora(agora)); render(); } return; }
  if(act==='db-mark'&&b.dataset.k==='sep'){ const sib=dbIrmas(o); let n=0;
    for(const x of sib){ if(x.rdb&&x.rdb.sep) continue; const rx=Object.assign({},x.rdb||{}); rx.sep={em:agora,por:S.uid||null}; if(await dbSalvar(x,rx,'Rancho '+o.rancho+' separado',o.rancho)) n++; }
    toast(n?'Rancho '+o.rancho+' separado às '+hora(agora)+' ('+n+' '+(n===1?'ordem':'ordens')+').':'Não foi possível marcar. Confira sua permissão (Ajustar acesso → "Marcar etapas do rancho") e a internet.'); render(); return; }
  if(act==='db-mark'&&b.dataset.k==='ent'){ D.aberto=o._id; D.f=dbNovoF(o,'ent'); render(); return; }
  if(act==='db-esalvar'){ dbLer(); const f=D.f||{}; const itens=(f.itens&&f.modo==='itens')?f.itens.map(x=>({c:x.c,d:x.d,um:x.um,q:x.q,qe:x.ok?x.qe:0,ok:!!x.ok})):null; let n=0;
    const dif=itens?itens.filter(x=>x.qe+1e-9<x.q).length:0;
    for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx.ent) continue; rx.ent={em:agora,por:S.uid||null,obs:String(f.obs||'').trim()}; if(itens) rx.ent.itens=itens; if(!rx.sep) rx.sep={em:agora,por:S.uid||null};
      if(await dbSalvar(x,rx,'Rancho '+(o.rancho||'')+' entregue na linha'+(dif?' ('+dif+' itens abaixo do pedido)':''),o.rancho)) n++; }
    D.aberto=null; D.f=null; toast('Rancho '+(o.rancho||o.num)+' entregue na linha às '+hora(agora)+(dif?' · '+dif+' '+(dif===1?'item':'itens')+' abaixo do pedido':'')+'.'); render(); return; }
  if(act==='db-pend'){ D.aberto=o._id; D.f={modo:'pend',fm:'pend',obs:''}; render(); setTimeout(()=>{ const x=$('#db-obs'); x&&x.focus(); },50); return; }
  if(act==='db-psalvar'){ dbLer(); const mot=String((D.f&&D.f.obs)||'').trim(); if(!mot){ toast('Escreva o motivo da pendência.'); return; } let n=0;
    for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(!rx.conf||(rx.fim&&rx.fim.st==='encerrado')) continue; rx.fim={st:'pendente',em:agora,por:S.uid||null,motivo:mot}; if(await dbSalvar(x,rx,'Rancho '+o.rancho+' pendente: '+mot)) n++; }
    D.aberto=null; D.f=null; toast('Rancho '+o.rancho+' ficou pendente.'); render(); return; }
  if(act==='db-urg'){ if(!dbPode().prod) return; const u=dbPri(o)===1; for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); rx.urg=u?null:{em:agora,por:S.uid||null,n:1}; await dbSalvar(x,rx,u?'Prioridade retirada':'Prioridade dada pelo PCP',o.rancho); }
    const qm=o.rancho?'rancho '+o.rancho:'ordem '+o.num; toast(u?'Prioridade retirada ('+qm+').':qm.charAt(0).toUpperCase()+qm.slice(1)+' com prioridade: vai em primeiro no e-mail do almox, na Fila do almox e no Monitor.'); render(); return; }
  if(act==='db-jafeito'){ if(!dbMaster()) return; if(D.jaConf!==o._id){ D.jaConf=o._id; b.textContent='Confirmar: tudo já feito?'; b.style.fontWeight='800'; return; } D.jaConf=null; const i=DB_ETAPAS.length-1; let n=0;
    for(const x of dbIrmas(o)){ const rx=dbAcertoFill(Object.assign({},x.rdb||{}),i,agora); if(await dbSalvar(x,rx,'Acerto do diário: processo já feito (separado, entregue, conferido e encerrado)',o.rancho)) n++; }
    toast('Rancho '+o.rancho+': processo marcado como feito ('+n+' '+(n===1?'ordem':'ordens')+').'); render(); return; }
  if(act==='db-encerrar'){ let n=0; for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(!rx.conf||(rx.fim&&rx.fim.st==='encerrado')) continue; rx.fim={st:'encerrado',em:agora,por:S.uid||null,antes:rx.fim||null}; if(await dbSalvar(x,rx,'Rancho '+o.rancho+' encerrado')) n++; }
    toast('Rancho '+o.rancho+' encerrado.'); render(); return; }
  if(act==='db-mark'){ const k=b.dataset.k; let n=0;
    for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx[k]) continue; rx[k]={em:agora,por:S.uid||null}; if(k==='ent'&&!rx.sep) rx.sep={em:agora,por:S.uid||null}; if(await dbSalvar(x,rx,'Rancho '+(o.rancho||'')+' entregue na linha',o.rancho)) n++; }
    toast(n?'Rancho '+(o.rancho||o.num)+' entregue na linha às '+hora(agora)+' ('+n+' '+(n===1?'ordem':'ordens')+').':'Não foi possível marcar. Confira sua permissão (Ajustar acesso → "Marcar etapas do rancho") e a internet.'); render(); return; }
  if(act==='db-ver'){ const kv=o._id+'|'+b.dataset.k; D.ver=D.ver===kv?null:kv; render(); return; }
  if(act==='db-conf'){ D.aberto=o._id; D.f=dbNovoF(o,'conf'); render(); return; }
  if(act==='db-desf'){ const k=b.dataset.k, M=dbMaster();
    if(!M){ if(k==='sep'&&r.ent){ toast('Desfaça primeiro a entrega na linha.'); return; } if(k==='ent'&&r.conf){ toast('Desfaça primeiro a conferência.'); return; } if(k==='conf'&&r.comp){ toast('Já tem complemento registrado para essa falta.'); return; } }
    const xs=dbIrmas(o); let n=0; for(const x of xs){ if(await dbDesfazer(x,k,M,agora)) n++; }
    toast(n>1?'Desfeito em '+n+' ordens do rancho '+o.rancho+'.':'Desfeito.'); render(); return; }
  if(act==='db-csalvar'){ dbLer(); const f=D.f, fim=b.dataset.fim||'encerrado'; let itens=[], rec=null;
    if(f.modo==='itens'){ rec=f.itens.map(x=>({c:x.c,q:x.q,qe:x.ent?(x.ok?x.qe:0):null,qr:x.ok?x.qr:0}));
      itens=f.itens.map(x=>{ const r0=x.ok?x.qr:0, d=x.q-r0; return d>1e-6?{c:x.c,i:x.c+' '+x.d,q:fQ(d)+' '+x.um}:null; }).filter(Boolean); }
    else { if(f.falta){ itens=f.itens.map(x=>({i:String(x.i||'').trim(),q:String(x.q||'').trim()})).filter(x=>x.i); if(!itens.length){ toast('Informe o item que veio a menos.'); return; } } }
    const obs=String(f.obs||'').trim(); if(b.dataset.fim&&fim==='pendente'&&!itens.length&&!obs){ toast('Escreva o motivo da pendência na observação.'); const ob=$('#db-obs'); ob&&ob.focus(); return; }
    const falta=itens.length>0, fimD={st:fim,em:agora,por:S.uid||null,motivo:fim==='pendente'?(obs||('Faltou: '+itens.map(x=>x.i).join(', '))):''};
    r.conf={em:agora,por:S.uid||null,falta,itens,obs}; if(rec) r.conf.rec=rec; if(b.dataset.fim) r.fim=fimD;
    for(const x of dbIrmas(o)){ if(x===o) continue; const rx=Object.assign({},x.rdb||{}); if(rx.conf||!rx.ent) continue; rx.conf={em:agora,por:S.uid||null,falta:false,itens:[],obs:falta?'Conferido junto com a ordem '+o.num+' (falta registrada nela)':obs,junto:o.num}; if(b.dataset.fim) rx.fim=fimD; await dbSalvar(x,rx,'Rancho '+o.rancho+' conferido junto com a ordem '+o.num,o.rancho); }
    if(await dbSalvar(o,r,(falta?'Rancho recebido a menos: '+itens.map(x=>x.i+(x.q?' ('+x.q+')':'')).join(', '):'Rancho conferido completo')+(b.dataset.fim?' · '+(fim==='encerrado'?'encerrado':'pendente'):''))){ D.aberto=null; D.f=null;
      toast((falta?'Rancho '+o.rancho+' recebido a menos ('+itens.length+' '+(itens.length===1?'item':'itens')+')':'Rancho '+o.rancho+' conferido')+(b.dataset.fim?(fim==='encerrado'?' e encerrado.':' · ficou pendente.'):'. O almox encerra o rancho.')); render(); } return; }
});
function dbLer(){ const D=S.dbo; if(!D.f) return; if(D.f.modo==='itens'){ document.querySelectorAll('[data-dbk]').forEach(x=>{ const it=D.f.itens[+x.dataset.dbk]; if(it) it.ok=x.checked; }); document.querySelectorAll('[data-dbq]').forEach(x=>{ const it=D.f.itens[+x.dataset.dbq]; if(it){ const v=pQ(x.value); if(D.f.fm==='ent') it.qe=v; else it.qr=v; } }); const ob=$('#db-obs'); if(ob) D.f.obs=ob.value; return; } document.querySelectorAll('[data-dbi]').forEach(x=>{ const it=D.f.itens[+x.dataset.dbi]; if(it) it[x.dataset.k]=x.value; }); const ob=$('#db-obs'); if(ob) D.f.obs=ob.value; }
document.addEventListener('change',ev=>{ const t=ev.target;
  if(t.matches&&t.matches('[data-dbk]')){ const tr=t.closest('tr'); tr&&tr.classList.toggle('off',!t.checked); return; }
  if(t.matches&&t.matches('[data-dball]')){ document.querySelectorAll('[data-dbk]').forEach(x=>{ x.checked=t.checked; const tr=x.closest('tr'); tr&&tr.classList.toggle('off',!t.checked); }); return; }
  if(t.matches&&t.matches('[data-dbq]')){ const i=+t.dataset.dbq, k=document.querySelector('[data-dbk="'+i+'"]'); if(k&&pQ(t.value)>0&&!k.checked){ k.checked=true; k.closest('tr').classList.remove('off'); } return; } });
document.addEventListener('keydown',ev=>{ const t=ev.target; if(t.id!=='db-rch'||ev.key!=='Enter') return; const v=t.value.trim(); if(!v) return; if(!dbAbrirRancho(v)) toast('Rancho '+v+' não encontrado.'); });
document.addEventListener('change',ev=>{ if(ev.target.id==='db-pri'){ S.dbo.pri=ev.target.value; render(); return; } if(ev.target.id==='db-data'&&ev.target.value){ S.dbo.dia=ev.target.value; S.dbo.aberto=null; render(); } });

function vRanchos(){ const R=S.rch, dia=R.dia||hojeStr(), gAll=ranchosDoDia(dia,R.linha), g=selDoDia(dia,R.linha), L=linhasOrd(); const em=(S.cfg.emailAlmox||'').trim(), cc=(S.cfg.emailAlmoxCc||'').trim(); const {assunto,corpo}=emailTexto(dia,g);
  const comPdf=g.grupos.filter(r=>r.doc&&r.doc.asset).length, enviados=gAll.grupos.filter(r=>r.doc&&r.doc.enviadoEm).length; const F=R.fora; const ck=o=>`<label class="ck"><input type="checkbox" data-rsel="${esc(o._id)}" ${rFora(o)?'':'checked'} aria-label="Incluir ordem ${esc(o.num)} no e-mail"></label>`;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Ranchos</h1><div class="sub">Anexe o PDF do rancho que você tira do sistema. O painel lê as ordens do rancho, liga cada uma a ele e prepara o envio para o almox.</div></div>
   <label class="btn" style="cursor:pointer">${ic('mais',20,2.2)}${R.lendo?'Lendo…':'Anexar ranchos (PDF)'}<input type="file" id="r-file" accept="application/pdf,.pdf" multiple style="position:absolute;width:1px;height:1px;opacity:0"></label></div>
  ${R.msgs&&R.msgs.length?`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong)">${R.msgs.map(esc).join('<br>')} <button class="lnk" data-act="r-limpar" style="margin-left:8px">Ok</button></div>`:''}
  <section class="card" style="padding:16px 18px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
   <div class="chips"><button class="chip" data-act="r-dia" data-v="${hojeStr()}" aria-pressed="${dia===hojeStr()}">Hoje</button><button class="chip" data-act="r-dia" data-v="${amanhaStr()}" aria-pressed="${dia===amanhaStr()}">${amanhaLab()}</button></div>
   <input type="date" class="txt" id="r-diasel" value="${esc(dia)}" style="width:170px;height:38px" aria-label="Dia">
   <select class="txt" id="r-linha" style="width:170px;height:38px" aria-label="Linha"><option value="">Todas as linhas</option>${L.map(l=>`<option ${R.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select>
   <input class="txt" id="r-busca" type="search" placeholder="Pesquisar ordem, rancho ou produto" value="${esc(R.busca||'')}" style="height:38px;max-width:300px;margin-left:auto" aria-label="Pesquisar ordem, rancho ou produto">
  </div></section>
  ${cestaBanner()}${(R.busca||'').trim()?buscaRanchos(R.busca.trim()):''}
  <div class="resumo"><div><div class="k">Ordens do dia (abertas e encerradas)</div><div class="v num">${gAll.total}</div></div><div><div class="k">Ranchos</div><div class="v num">${gAll.grupos.length} <small>${gAll.grupos.filter(r=>r.doc&&r.doc.asset).length} com PDF</small></div></div><div><div class="k">Sem rancho</div><div class="v num ${gAll.sem.length?'warn':''}">${gAll.sem.length}</div></div><div><div class="k">Enviados ao almox</div><div class="v num ${gAll.grupos.length&&enviados===gAll.grupos.length?'ok':''}">${enviados} de ${gAll.grupos.length}</div></div></div>
  <div class="two topo" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)">
   <section class="card"><div class="head" style="align-items:baseline;margin-bottom:6px"><div class="label">RANCHOS DAS ORDENS DE ${esc(dmTxt(dia).toUpperCase())}</div>${gAll.total?`<div class="sub" style="margin:0;font-size:12px"><b class="num">${g.total}</b> de ${gAll.total} marcadas · <button class="lnk" data-act="r-todas" style="padding:0;font-size:12px">todas</button> · <button class="lnk" data-act="r-nenhuma" style="padding:0;font-size:12px">nenhuma</button></div>`:''}</div>
    ${gAll.grupos.length?gAll.grupos.map(r=>{ const d=r.doc; const todas=r.ordens.every(o=>!rFora(o)); return `<div class="rrow"><div style="flex:1;min-width:0"><label class="ck ckg"><input type="checkbox" data-rgrp="${esc(r.numero)}" ${todas?'checked':''} aria-label="Incluir o rancho ${esc(r.numero)} inteiro"><b class="num">Rancho ${esc(r.numero)}</b></label>${d&&d.enviadoEm?` <span class="pill ok">enviado ${dia===hojeStr(new Date(d.enviadoEm))?hora(d.enviadoEm):dm(d.enviadoEm.slice(0,10))}</span>`:''}${d&&d.asset?'':' <span class="pill warn">sem PDF</span>'}
      <div class="rords">${r.ordens.map(o=>`<div class="ckrow ${rFora(o)?'off':''}">${ck(o)}<span class="num">${esc(o.num)} · ${esc(codigoDe(o))} · ${esc(o.linha)}${o.status!=='aberta'?' · <b>'+esc(stInfo(o,entregueDe(o)).t.toLowerCase())+'</b>':''}</span>${rJaLinha(o)?` <span class="pill ok" title="O material deste rancho já saiu do almox. Não precisa enviar de novo (marque a caixa se quiser mandar mesmo assim).">${esc(rJaLinha(o))}</span>`:''}</div>`).join('')}</div></div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${d&&d.asset?`<button class="lnk" data-act="r-ver" data-asset="${esc(d.asset)}" style="padding:0">Abrir PDF</button>`:''}</div></div>`; }).join(''):'<div class="empty">Nenhuma ordem deste dia tem rancho ainda.</div>'}
    ${gAll.sem.length?`<div class="label" style="margin:16px 0 6px;color:var(--warn-ink)">SEM RANCHO (${gAll.sem.length})</div>${gAll.sem.map(o=>`<div class="ckrow ${rFora(o)?'off':''}" style="padding:6px 0;border-top:1px solid var(--line-2)">${ck(o)}<span><b class="num">${esc(o.num)}</b> <span class="sub" style="display:inline;font-size:12px">${esc(codigoDe(o))} · ${esc(nomeCurto(o))} · ${esc(o.linha)}</span></span></div>`).join('')}<div class="sub" style="font-size:12px;margin-top:8px">Tire o rancho dessas ordens no sistema e anexe aqui.</div>`:''}
   </section>
   <section class="card"><div class="label" style="margin-bottom:8px">ENVIAR PARA O ALMOX POR E-MAIL</div>
    <div class="passos">
     <div class="passo"><span class="pn">1</span><div><b>Baixe o PDF</b><div class="sub" style="margin:2px 0 8px;font-size:12px">Para cada rancho: as folhas das ordens dele e em seguida o rancho.${g.sem.length?' Ordens sem rancho vão no fim, só com a folha.':''}</div>
      <button class="btn" data-act="r-baixar" ${g.total?'':'disabled'} style="width:100%">${ic('baixar',18,2)}Baixar PDF: ${g.total} ${g.total===1?'ordem':'ordens'} + ${comPdf} rancho${comPdf===1?'':'s'}</button></div></div>
     <div class="passo"><span class="pn">2</span><div style="min-width:0;flex:1"><b>Abra o e-mail já preenchido</b>
      ${em?`<div class="sub" style="margin:2px 0 8px;font-size:12px">Para: <b>${esc(em)}</b>${cc?`<br>Cópia: <b>${esc(cc)}</b>`:''} · <button class="lnk" data-act="r-trocar-email" style="font-size:12px;padding:0">${cc?'trocar':'trocar / incluir cópias'}</button></div>`:`<div class="sub" style="margin:2px 0 6px;font-size:12px;color:var(--warn-ink)">Informe o e-mail do almox (fica salvo):</div>`}
      ${!em||R.editEmail?`<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"><label style="display:flex;flex-direction:column;gap:3px"><span class="sub" style="margin:0;font-size:12px">Para</span><input class="txt" id="r-email" type="email" placeholder="almox@colafix.com" value="${esc(em)}" style="height:40px"></label><label style="display:flex;flex-direction:column;gap:3px"><span class="sub" style="margin:0;font-size:12px">Cópia (CC) · separe vários e-mails com vírgula</span><input class="txt" id="r-email-cc" type="text" inputmode="email" placeholder="pcp@colafix.com, supervisor@colafix.com" value="${esc(cc)}" style="height:40px"></label><button class="btn sec" data-act="r-salvar-email" style="height:40px;align-self:flex-start">Salvar</button></div>`:''}
      <a class="btn ${em?'':'sec'}" style="width:100%;text-decoration:none" href="https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(em)}${cc?'&cc='+encodeURIComponent(cc):''}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}" target="_blank" rel="noopener" data-mail-rico="1">${ic('seta',18,2)}Abrir no Outlook</a><div class="sub" style="margin:4px 0 0;font-size:11.5px">Abre o Outlook na web com destinatário e assunto e copia o texto com as bolinhas de prioridade: clique no corpo do e-mail e aperte <b>Ctrl+V</b>. Depois arraste o PDF baixado no passo 1.</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px"><button class="lnk" data-act="r-outlook" title="Baixa um arquivo .eml que abre no Outlook do computador já com o PDF anexado">Outlook do computador (.eml com PDF)</button><a class="lnk" href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(em)}${cc?'&cc='+encodeURIComponent(cc):''}&su=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}" target="_blank" rel="noopener">Gmail</a><button class="lnk" data-act="r-copiar">Copiar texto</button><a class="lnk" href="https://wa.me/?text=${encodeURIComponent(emailTexto(dia,g).zap)}" target="_blank" rel="noopener" title="Abre o WhatsApp com a mensagem pronta: escolha o contato ou grupo">WhatsApp</a><button class="lnk" data-act="r-copiar-zap">Copiar p/ WhatsApp</button></div></div></div>
     <div class="passo"><span class="pn">3</span><div><b>Arraste o PDF baixado para o e-mail e clique em Enviar</b><div class="sub" style="margin:2px 0 0;font-size:12px">O navegador não deixa o painel anexar o arquivo sozinho.</div></div></div>
     <div class="passo"><span class="pn">4</span><div style="flex:1"><b>Marque como enviado</b>
      <button class="btn sec" data-act="r-enviado" ${g.grupos.length?'':'disabled'} style="width:100%;margin-top:8px">${ic('check',18,2.2)}Marcar ${g.grupos.length} rancho${g.grupos.length===1?'':'s'} como enviado${g.grupos.length===1?'':'s'}</button></div></div>
    </div>
    <details style="margin-top:12px"><summary class="sub" style="cursor:pointer;font-size:12px">Ver o texto do e-mail</summary><textarea class="txt" id="r-corpo" rows="8" readonly style="font-size:12.5px;margin-top:8px">${esc('Assunto: '+assunto+'\n\n'+corpo)}</textarea></details>
   </section>
  </div>`; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="r-"]'); if(!b||b.disabled) return; const act=b.dataset.act, R=S.rch;
  if(act==='r-cesta-on'){ R.modoCesta=true; R.fora=new Set(); R.incl=new Set(); render(); return; }
  if(act==='r-cesta-off'){ R.modoCesta=false; R.fora=new Set(); render(); return; }
  if(act==='r-cesta-limpar'){ cesta().clear(); cestaSalva(); R.modoCesta=false; render(); toast('Seleção do e-mail limpa.'); return; }
  if(act==='r-dia'){ R.dia=b.dataset.v; R.fora=new Set(); R.incl=new Set(); R.soSel=false; render(); return; }
  if(act==='r-todas'){ R.fora=new Set(); R.soSel=false; render(); return; }
  if(act==='r-nenhuma'){ const dia=R.dia||hojeStr(); const g=ranchosDoDia(dia,R.linha); R.fora=new Set([...g.grupos.flatMap(r=>r.ordens),...g.sem].map(o=>o._id)); render(); return; }
  if(act==='r-limpar'){ R.msgs=[]; render(); return; }
  if(act==='r-ver'){ const id=b.dataset.asset; const r=S.ranchos.find(x=>x.asset===id); verRancho(id,r?r.numero:''); return; }
  if(act==='r-trocar-email'){ R.editEmail=true; render(); const e=$('#r-email'); e&&e.focus(); return; }
  if(act==='r-salvar-email'){ const v=(($('#r-email')||{}).value||'').trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+/.test(v.split(',')[0].trim())){ toast('Digite um e-mail válido.'); return; } if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    const cc=(($('#r-email-cc')||{}).value||'').split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean); const ruim=cc.find(x=>!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)); if(ruim){ toast('E-mail de cópia inválido: '+ruim); return; } const ccs=cc.join(', ');
    try{ await S.db.doc('config/geral').update({emailAlmox:v,emailAlmoxCc:ccs,alteradoEm:new Date().toISOString(),alteradoPor:S.uid}); S.cfg.emailAlmox=v; S.cfg.emailAlmoxCc=ccs; R.editEmail=false; toast(ccs?'E-mails salvos (com cópia).':'E-mail do almox salvo.'); render(); }catch(e){ erro(e); } return; }
  if(act==='r-so'||act==='r-add'){ const o=S.ordens.find(x=>x._id===b.dataset.id); if(!o) return; const d=dataEf(o);
    rIncl(o._id,true); if(act==='r-add'&&d===(R.dia||hojeStr())){ R.fora.delete(o._id); }
    else { R.dia=d; R.linha=''; const g=ranchosDoDia(d,''); R.fora=new Set([...g.grupos.flatMap(r=>r.ordens),...g.sem].map(x=>x._id).filter(id=>id!==o._id)); }
    R.soSel=true; render(); toast('Ordem '+o.num+' selecionada para o e-mail'+(o.rancho?' (rancho '+o.rancho+')':'')+'. Pesquise outra ordem para adicionar.'); return; }
  if(act==='r-limpar-busca'){ R.busca=''; render(); return; }
  if(act==='r-irdia'){ R.fora=new Set(); R.dia=b.dataset.v; R.linha=''; R.busca=''; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(act==='r-outlook'){ if(b.dataset.busy) return; const dia=R.dia||hojeStr(); const g=selDoDia(dia,R.linha); const os=[...g.grupos.flatMap(r=>r.ordens),...g.sem]; if(!os.length){ toast('Nenhuma ordem selecionada.'); return; }
    const {assunto,corpo,html}=emailTexto(dia,g); const em=(S.cfg.emailAlmox||'').trim(), cc=(S.cfg.emailAlmoxCc||'').trim();
    const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
    b.dataset.busy='1'; const t0=b.innerHTML; b.textContent='Montando o e-mail…';
    try{ const nomePdf='Ordens_e_Ranchos_'+(cestaModo()?'selecao':dataBR(dia).replace(/\//g,'-'))+'.pdf';
      const pdf=await gerarFolhasProducao(os,dia,nomePdf,{porRancho:true,blob:true});
      const b64u=t=>btoa(unescape(encodeURIComponent(t)));
      const wrap=x=>x.replace(/.{1,76}/g,m=>m+'\r\n');
      let pdf64=''; if(pdf){ const u8=new Uint8Array(await pdf.arrayBuffer()); let bin=''; for(let i=0;i<u8.length;i+=0x8000) bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); pdf64=btoa(bin); }
      const bd='----=_Colafix_'+Date.now().toString(36);
      const eml=['X-Unsent: 1','To: '+em,cc?'Cc: '+cc:null,'Subject: =?UTF-8?B?'+b64u(assunto)+'?=','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+bd+'"','','--'+bd,'Content-Type: multipart/alternative; boundary="'+bd+'A"','','--'+bd+'A','Content-Type: text/plain; charset="utf-8"','Content-Transfer-Encoding: base64','',wrap(b64u(corpo.replace(/\n/g,'\r\n'))),'--'+bd+'A','Content-Type: text/html; charset="utf-8"','Content-Transfer-Encoding: base64','',wrap(b64u('<html><body>'+html+'</body></html>')),'--'+bd+'A--',
        pdf64?['--'+bd,'Content-Type: application/pdf; name="'+nomePdf+'"','Content-Disposition: attachment; filename="'+nomePdf+'"','Content-Transfer-Encoding: base64','',wrap(pdf64)].join('\r\n'):null,'--'+bd+'--',''].filter(x=>x!=null).join('\r\n');
      await dl.save({filename:'Email_almox_'+(cestaModo()?'selecao':dataBR(dia).replace(/\//g,'-'))+'.eml',data:new Blob([eml],{type:'message/rfc822'})});
      toast('E-mail baixado. Abra o arquivo .eml: o Outlook abre o e-mail pronto, com destinatário, texto e o PDF anexado. É só clicar em Enviar.');
    }catch(e){ if(!e||e.code!=='declined') toast('Não consegui montar o e-mail. Use "Copiar texto" e "Baixar PDF".'); }
    delete b.dataset.busy; b.innerHTML=t0; return; }
  if(act==='r-copiar-zap'){ const dia=R.dia||hojeStr(); const t=emailTexto(dia,selDoDia(dia,R.linha)).zap; const ok=()=>toast('Mensagem copiada. Cole no WhatsApp (Ctrl+V).'); try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,()=>copiarAntigo(t,ok)); return; } }catch(e){} copiarAntigo(t,ok); return; }
  if(act==='r-copiar'){ const dia=R.dia||hojeStr(); const {assunto,corpo}=emailTexto(dia,selDoDia(dia,R.linha)); const em=(S.cfg.emailAlmox||'').trim(); const txt=(em?'Para: '+em+'\n':'')+'Assunto: '+assunto+'\n\n'+corpo; let ok=false;
    const {html}=emailTexto(dia,selDoDia(dia,R.linha)); if(copiarRico(html,txt)) ok=true; else try{ await navigator.clipboard.writeText(txt); ok=true; }catch(e){ const ta=$('#r-corpo'); if(ta){ ta.focus(); ta.select(); try{ ok=document.execCommand('copy'); }catch(_){} } }
    toast(ok?'E-mail copiado. Cole no seu e-mail e anexe o PDF.':'Selecione o texto e copie manualmente.'); return; }
  if(act==='r-enviado'){ const dia=R.dia||hojeStr(); const g=selDoDia(dia,R.linha); const agora=new Date().toISOString(); let n=0;
    for(const r of g.grupos){ try{ if(r.doc) await S.db.doc('ranchos/'+r.numero).update({enviadoEm:agora,enviadoPor:S.uid}); else await S.db.doc('ranchos/'+r.numero).set({numero:r.numero,ordens:r.ordens.map(o=>({num:String(o.num),codigo:codigoDe(o)})),criadoEm:agora,por:S.uid,enviadoEm:agora,enviadoPor:S.uid}); n++; }catch(e){ erro(e); } }
    if(n) toast(n+' rancho'+(n===1?'':'s')+' marcado'+(n===1?'':'s')+' como enviado'+(n===1?'':'s')+'.'+(cestaModo()?' Seleção do e-mail limpa.':'')); if(cestaModo()){ cesta().clear(); cestaSalva(); R.modoCesta=false; render(); } return; }
  if(act==='r-baixar'){ const dia=R.dia||hojeStr(); const g=selDoDia(dia,R.linha); const os=[...g.grupos.flatMap(r=>r.ordens),...g.sem]; if(!os.length) return;
    const nr=g.grupos.filter(r=>r.doc&&r.doc.asset).length;
    gerarFolhasProducao(os,dia,'Ordens_e_Ranchos_'+dataBR(dia).replace(/\//g,'-')+linhasNome(os,R.linha)+'.pdf',{porRancho:true,msg:'PDF pronto: '+os.length+' '+(os.length===1?'ordem':'ordens')+' de produção e '+nr+' rancho'+(nr===1?'':'s')+'. Anexe no e-mail.'}); return; }
});
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='r-busca') return; S.rch.busca=t.value; clearTimeout(S.rch._bt); S.rch._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#r-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); });
document.addEventListener('change',ev=>{ const t=ev.target;
  if(t.id==='r-file'&&t.files&&t.files.length){ const fs=[...t.files]; t.value=''; anexarRanchos(fs); return; }
  if(t.id==='r-diasel'){ S.rch.dia=t.value; S.rch.fora=new Set(); render(); return; }
  if(t.id==='r-linha'){ S.rch.linha=t.value; S.rch.fora=new Set(); render(); return; }
  if(t.dataset&&t.dataset.rsel){ rIncl(t.dataset.rsel,t.checked); render(); return; }
  if(t.dataset&&t.dataset.rgrp){ const dia=S.rch.dia||hojeStr(); const r=ranchosDoDia(dia,S.rch.linha).grupos.find(x=>String(x.numero)===t.dataset.rgrp); if(r) r.ordens.forEach(o=>rIncl(o._id,t.checked)); render(); return; }
});

// ================= CIMENTO × PROGRAMAÇÃO =================
function kgCimento(cod){ cod=String(cod||'').toUpperCase(); const it=itemDe(cod); if(it&&+it.kgCimento>0) return +it.kgCimento;
  const p=(S.cfg.produtos||[]).find(x=>String(x.nome||'').toUpperCase().startsWith(cod)); return p&&+p.kgSaco>0?+p.kgSaco:0; }
const SEM_CIM_PADRAO=['Fixcol'];
function linhasSemCim(){ return Array.isArray(S.cfg.linhasSemCimento)?S.cfg.linhasSemCimento:SEM_CIM_PADRAO; }
function usaCimFab(linha){ return !linhasSemCim().includes(linha); }
function previsaoCimento(){
  const ult=ultimoPorSilo(); const cs=S.cfg.silos.filter(s=>s.grupo==='Cimento'); const lidos=cs.filter(s=>ult[s.id]);
  if(!lidos.length) return null;
  const base=lidos.map(s=>ult[s.id].em).sort()[0]; const medido=lidos.reduce((a,s)=>a+ult[s.id].q,0);
  const an=anuladas(); let consumido=0;
  S.entregas.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em||e.em<base) return; const o=ordById(e.ordem); const kg=o&&usaCimFab(o.linha||e.linha)?kgCimento(codigoDe(o)):0; consumido+=(+e.qtd||0)*kg/1000; });
  let chegou=0; S.cargas.forEach(c=>{ const d=(c.etapas||{}).descarregado; if(d&&d>base&&+c.qtd>0) chegou+=+c.qtd; });
  const pend=S.cargas.filter(c=>etapaCarga(c)<2); const aCaminho=pend.reduce((a,c)=>a+(+c.qtd||0),0);
  const estoque=Math.max(0,medido-consumido+chegou);
  const L=linhasOrd();
  const abertas=ordAbertas().filter(o=>usaCimFab(o.linha));
  const fila=abertas.map(o=>({o,kg:kgCimento(codigoDe(o))})).filter(x=>x.kg>0).map(x=>({o:x.o,t:Math.max(0,x.o.total-entregueDe(x.o))*x.kg/1000})).filter(x=>x.t>0)
    .sort((a,b)=>dataEf(a.o).localeCompare(dataEf(b.o))||L.indexOf(a.o.linha)-L.indexOf(b.o.linha)||String(a.o.num).localeCompare(String(b.o.num)));
  let acc=0, falta=null; fila.forEach(x=>{ const antes=acc; acc+=x.t; if(!falta&&acc>estoque+0.0001) falta={o:x.o,dia:dataEf(x.o),sacosOk:Math.max(0,Math.floor((estoque-antes)*1000/kgCimento(codigoDe(x.o))))}; });
  const semKg=abertas.filter(o=>/^(AC|AB)\d/.test(codigoDe(o))&&!kgCimento(codigoDe(o))).length;
  return {medido,base,consumido,chegou,estoque,necessario:acc,falta,aCaminho,nCaminho:pend.length,semKg,nOrdens:fila.length};
}
function cimentoCard(p,compacto){
  if(!p) return `<section class="card"><div class="label">CIMENTO × PROGRAMAÇÃO</div><div class="sub" style="margin-top:6px">Sem medição dos silos de cimento ainda.</div></section>`;
  const ok=!p.falta;
  return `<section class="card cim ${ok?'ok':'crit'}"><div class="head" style="align-items:baseline"><div class="label">CIMENTO × PROGRAMAÇÃO</div><span class="pill ${ok?'ok':'crit'}">${ok?'Cobre a programação':'Vai faltar'}</span></div>
   <div class="num" style="margin-top:8px"><span style="font-size:28px;font-weight:700">${f1(p.estoque)} t</span> <span class="sub" style="display:inline">estimado agora</span></div>
   <div class="sub num" style="margin:2px 0 0;font-size:12px">Medido ${f1(p.medido)} t (${dia(p.base).toLowerCase()} ${hora(p.base)})${p.consumido>0.05?` − ${f1(p.consumido)} t usados nas entregas`:''}${p.chegou>0?` + ${f1(p.chegou)} t descarregados`:''}</div>
   ${ok?`<div class="cimmsg">As ordens abertas precisam de <b class="num">${f1(p.necessario)} t</b>. Sobram <b class="num">${f1(p.estoque-p.necessario)} t</b>.</div>`
       :`<div class="cimmsg"><b>Acaba ${dmTxt(p.falta.dia).toLowerCase()}, na ordem ${esc(p.falta.o.num)}</b> (${esc(p.falta.o.linha)} · ${esc(codigoDe(p.falta.o))}). Dá para uns <b class="num">${f0(p.falta.sacosOk)}</b> sacos dela. A programação aberta precisa de <b class="num">${f1(p.necessario)} t</b>.</div>`}
   ${p.nCaminho?`<div class="sub num" style="margin:8px 0 0;font-size:12px">${ic('rota',14)} ${p.nCaminho} carga${p.nCaminho===1?'':'s'} a caminho ou na fábrica${p.aCaminho?' · '+f1(p.aCaminho)+' t':''}</div>`:''}
   ${!compacto&&p.semKg?`<div class="sub" style="margin:6px 0 0;font-size:12px">${p.semKg} ${p.semKg===1?'ordem':'ordens'} de argamassa sem consumo de cimento cadastrado. <button class="lnk" data-go="itens" style="padding:0;font-size:12px">Cadastrar em Itens</button></div>`:''}
  </section>`; }

// ================= MEU DIA =================
function diarioDe(d){ return S.diario.find(x=>x._id===d)||{}; }
async function marcarDiario(d,campos){ if(!S.db) return; const at=diarioDe(d); const doc=Object.assign({},at,campos); delete doc._id; try{ await S.db.doc('diario/'+d).set(doc); }catch(e){} }
function saudacao(){ const h=new Date().getHours(); return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'; }
function linhasParada(){ return linhasOrd(); }
function abrirBuscaFolha(){ const O=S.ord; O.linha='todas'; O.mostrar='todas'; O.busca=''; O.de=''; O.ate=''; O.aberta=null; O.nova=false; S.fp.aberto=false; S.apt.aberto=false; go('programacao'); const n=$('#o-busca'); if(n){ n.focus(); n.scrollIntoView({block:'center'}); } toast('Digite o número da ordem ou o produto e toque em “Folha”.'); }
function aptBate(o){ const A=S.apt, q=(A.busca||'').trim().toLowerCase(); return !q||String(o.num).includes(q)||String(o.produto||'').toLowerCase().includes(q)||String(o.ensaca||'').includes(q); }
function aptOrdens(){ const A=S.apt, d=A.data||hojeStr(); return ordAbertas().filter(o=>(A.linha==='todas'||o.linha===A.linha)&&(dataEf(o)===d||(A.atras&&dataEf(o)<d))&&aptBate(o)).sort((a,b)=>String(a.linha).localeCompare(String(b.linha))||dataEf(a).localeCompare(dataEf(b))||String(a.num).localeCompare(String(b.num))); }
function aptQ(o){ const v=S.apt.v[o._id]||{}; const pp=v.pp!=null?v.pp:(paleteDe(o)?String(paleteDe(o)):''); const pf=fardoDe(o); const pal=numQ(v.pal||'')||0, ppn=numQ(pp)||0, av=numQ(v.av||'')||0, fd=pf?(numQ(v.fd||'')||0):0; return {pal,pp:ppn,ppStr:pp,av,fd,pf,q:pal*ppn+fd*pf+av}; }
function aptPainel(){ const A=S.apt, os=aptOrdens(), sel=new Set(A.sel);
  const head=`<div class="head" style="align-items:baseline"><h2>Lançar apontamento</h2><button class="lnk" data-act="md-apt-fechar">Fechar</button></div>`;
  if(A.passo==='escolher'){ const LT=linhasOrd(), d=A.data||hojeStr();
    const filtros=`<div style="display:flex;flex-direction:column;gap:10px;margin:8px 0 6px;padding:12px 14px;border-radius:10px;background:var(--surface-2)">
     <div class="chips"><span class="label" style="min-width:52px">LINHA</span>${['todas',...LT].map(l=>`<button class="chip" data-act="md-apt-linha" data-v="${esc(l)}" aria-pressed="${A.linha===l}" style="height:32px">${l==='todas'?'Todas':esc(l)}</button>`).join('')}</div>
     <div class="chips"><span class="label" style="min-width:52px">DATA</span><input type="date" class="txt" id="apt-data" value="${esc(d)}" style="width:auto;height:36px"><label class="ck" style="font-size:13px"><input type="checkbox" id="apt-atras" ${A.atras?'checked':''}> Incluir atrasadas</label>
      <span class="label" style="margin-left:12px">ORDEM</span><input class="txt" id="apt-busca" type="search" placeholder="Nº, código ou produto" value="${esc(A.busca||'')}" style="max-width:240px;height:36px"></div></div>`;
    if(!os.length) return `<section class="card" style="border:1.5px solid var(--teal)">${head}${filtros}<div class="empty">Nenhuma ordem aberta com esses filtros.</div>${sel.size?`<div style="display:flex;justify-content:flex-end"><button class="btn" data-act="md-apt-seguir">Apontar ${sel.size} ${sel.size===1?'ordem':'ordens'} ›</button></div>`:''}</section>`; let lin=''; const rows=os.map(o=>{ const e=entregueDe(o); const g=o.linha!==lin?`<div class="label" style="margin:12px 0 4px">${esc(o.linha)}</div>`:''; lin=o.linha;
      return g+`<label class="ckrow" style="padding:6px 0;border-top:1px solid var(--line-2);font-size:13.5px;cursor:pointer"><input type="checkbox" data-apt-sel="${esc(o._id)}" ${sel.has(o._id)?'checked':''} style="width:18px;height:18px;accent-color:var(--teal)"><span style="flex:1;min-width:0"><b>${esc(nomeCurto(o))}</b> <small class="num" style="color:var(--muted)">${esc(codigoDe(o))} · Ordem ${esc(o.num)}${ordAtras(o)?' · <span style="color:var(--crit-ink)">desde '+dm(dataEf(o))+'</span>':''}</small></span><span class="num" style="color:var(--muted);font-size:12px">falta <b style="color:var(--ink)">${fq(Math.max(0,o.total-e))}</b></span></label>`; }).join('');
    return `<section class="card" style="border:1.5px solid var(--teal)">${head}<div class="sub" style="margin:2px 0 0">Filtre e marque as ordens que você vai apontar agora.</div>${filtros}
    <div style="display:flex;gap:14px;margin-bottom:4px"><button class="lnk" data-act="md-apt-todas">Marcar todas${os.length?' ('+os.length+')':''}</button>${sel.size?'<button class="lnk" data-act="md-apt-nenhuma">Limpar</button>':''}</div>${rows}
    <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn" data-act="md-apt-seguir" ${sel.size?'':'disabled'}>Apontar ${sel.size||''} ${sel.size===1?'ordem':'ordens'} ›</button></div></section>`; }
  const xs=ordAbertas().filter(o=>sel.has(o._id)).sort((a,b)=>String(a.linha).localeCompare(String(b.linha))||String(a.num).localeCompare(String(b.num))); let tot=0, n=0;
  const rows=xs.map(o=>{ const c=aptQ(o), e=entregueDe(o); if(c.q>0){ tot+=c.q; n++; } const temPal=!!(paleteDe(o)||c.ppStr);
    return `<div style="padding:10px 0;border-top:1px solid var(--line-2)"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span><b>${esc(nomeCurto(o))}</b> <small class="num" style="color:var(--muted)">${esc(o.linha)} · Ordem ${esc(o.num)}</small></span><span class="num sub" style="margin:0;font-size:12px" data-apt-res="${esc(o._id)}">${aptRes(o)}</span></div>
    ${temPal?`<div class="ent-grid"><label><span class="sub">Paletes</span><div class="field"><input data-apt-id="${esc(o._id)}" data-apt-k="pal" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc((S.apt.v[o._id]||{}).pal||'')}"></div></label><span class="x">×</span><label><span class="sub">${esc(uP(o))} por palete</span><div class="field"><input data-apt-id="${esc(o._id)}" data-apt-k="pp" inputmode="numeric" autocomplete="off" value="${esc(c.ppStr)}"></div></label><span class="x">+</span><label><span class="sub">${esc(uP(o))} avulsos</span><div class="field"><input data-apt-id="${esc(o._id)}" data-apt-k="av" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc((S.apt.v[o._id]||{}).av||'')}"></div></label></div>`
    :`<div class="ent-grid" style="grid-template-columns:minmax(0,220px)"><label><span class="sub">Quantidade (${esc(uP(o))})</span><div class="field"><input data-apt-id="${esc(o._id)}" data-apt-k="av" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc((S.apt.v[o._id]||{}).av||'')}"></div></label></div>`}${c.pf?`<div class="ent-grid" style="grid-template-columns:minmax(0,220px)"><label><span class="sub">Fardos <small>(1 fardo = ${fq(c.pf)} ${esc(uA(o))})</small></span><div class="field"><input data-apt-id="${esc(o._id)}" data-apt-k="fd" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc((S.apt.v[o._id]||{}).fd||'')}"></div></label></div>`:''}${faltaEns(o)?`<div class="ensreq"><label><span class="sub"><b>Ordem de ensacado</b> · obrigatória (rejunte flexível/siliconizado)</span><input class="txt num" data-apt-id="${esc(o._id)}" data-apt-k="ens" inputmode="numeric" autocomplete="off" placeholder="nº da ordem de ensacado" value="${esc((S.apt.v[o._id]||{}).ens||'')}"></label></div>`:''}<input class="txt" data-apt-obs="${esc(o._id)}" placeholder="Observação (opcional)" value="${esc((S.apt.obs||{})[o._id]||'')}" style="margin-top:8px;height:38px"></div>`; }).join('');
  return `<section class="card" style="border:1.5px solid var(--teal)">${head}<div class="sub" style="margin:2px 0 6px">Informe o que foi produzido em cada ordem. Ordens deixadas em branco não são lançadas.</div>${rows}
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px"><div style="display:flex;flex-direction:column;gap:4px"><button class="lnk" data-act="md-apt-voltar" style="padding:0;align-self:flex-start">‹ Escolher outras ordens</button>${horaCampo('apt','Informar outro dia e hora')}</div>
  <button class="btn" data-act="md-apt-lancar" id="md-apt-btn" ${A.gravando?'disabled':''}>${ic('check',18,2.2)}${A.gravando?'Gravando…':'Lançar apontamentos'}</button></div></section>`; }
function aptRes(o){ const c=aptQ(o), e=entregueDe(o); return c.q>0?`= <b style="color:var(--ink)">${fq(c.q)}</b> · pendente fica <b style="color:var(--ink)">${fq(o.total-e-c.q)}</b>`:`pendente agora: <b style="color:var(--ink)">${fq(o.total-e)}</b>`; }
function vMeuDia(op){ op=op||{}; const cgo=!!op.cargo, ok=v=>{ if(!cgo) return true; try{ return viewOk(v); }catch(e){ return false; } }, okGo=g=>ok(g==='silo-geral'?'geral':g==='folhas'?'programacao':g);
  const h=hojeStr(), agora=new Date(); const nome=((S.uid&&S.nomes[S.uid])||'').split(/\s+/)[0];
  // 1 medição
  const um=ultimaMedicao(); const medHoje=um&&hojeStr(new Date(um.em))===h;
  // 2 programação
  const hojeOs=ordensDoDia(h); const atras=ordAbertas().filter(o=>ordAtras(o,h)); const nLin=new Set(hojeOs.map(o=>o.linha)).size;
  // 3 ranchos
  const rg=ranchosDoDia(h,''); const semR=rg.sem.filter(o=>o.status==='aberta').length; const env=rg.grupos.filter(r=>r.doc&&r.doc.enviadoEm).length;
  // 4 folhas
  const di=diarioDe(h);
  // 5 apontamento
  const an=anuladas(); const entHoje=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&hojeStr(new Date(e.em))===h);
  const hm=d=>d.getHours()*60+d.getMinutes(); const agoraM=hm(agora);
  const slot=(lim,desde)=>{ const feito=entHoje.some(e=>hm(new Date(e.em))>=desde); return feito?'ok':agoraM<lim?'futuro':'pend'; };
  const s12=slot(12*60,11*60+30), s17=slot(17*60+15,16*60+45);
  const tot=entHoje.reduce((a,e)=>a+(+e.qtd||0),0);
  const paradas=S.paradas.filter(p=>!p.fim);
  const prev=previsaoCimento();
  const cAnd=S.cargas.filter(c=>etapaCarga(c)<2), cHoje=S.cargas.filter(c=>c.criadaEm&&hojeStr(new Date(c.criadaEm))===h);
  const rot=[
    {n:1,go:'silo-geral',m:'Silos',t:'Medição dos silos',st:medHoje?'ok':'pend',d:medHoje?`Medido às ${hora(um.em)}${um.medidoPor?' por '+esc(um.medidoPor):''}`:(um?'Última: '+dia(um.em).toLowerCase()+' '+hora(um.em):'Nenhuma medição ainda'),chips:cAnd.length||cHoje.length?`<span class="apt">${cAnd.length?cAnd.length+' carga'+(cAnd.length===1?'':'s')+' em andamento':cHoje.length+' NF hoje'}</span>`:'',a:`<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px"><button class="lnk" data-go="medicao" style="padding:0">${medHoje?'Nova medição':'Lançar medição'}</button><button class="lnk" data-act="md-nf" style="padding:0">Informar NF de carga</button>${agora.getDay()===5?`<button class="lnk" data-act="md-folhas-sem" style="padding:0;font-weight:700">Sexta: gerar folhas da semana ›</button>`:''}</div>`},
    {n:2,go:'programacao',m:'Produção',t:'Programação de hoje',st:atras.length?'alerta':hojeOs.length?'ok':'pend',d:hojeOs.length?`${hojeOs.length} ${hojeOs.length===1?'ordem':'ordens'} em ${nLin} linha${nLin===1?'':'s'}`:'Nada programado para hoje',x:atras.length?`${atras.length} atrasada${atras.length===1?'':'s'}`:'',a:`<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px"><button class="lnk" data-go="calendario" style="padding:0">Ver semana</button><button class="lnk" data-act="md-nova-ordem" style="padding:0">+ Nova ordem</button></div>`},
    {n:3,go:'ranchos',m:'Ranchos',t:'Ranchos para o almox',st:!rg.total?'pend':(semR||env<rg.grupos.length)?(semR?'alerta':'pend'):'ok',d:!rg.total?'Sem ordens hoje':semR?`${semR} ${semR===1?'ordem':'ordens'} sem rancho`:rg.grupos.length?`${env} de ${rg.grupos.length} enviado${rg.grupos.length===1?'':'s'}`:'—',x:semR&&rg.grupos.length?`${env} de ${rg.grupos.length} enviados`:'',a:`<button class="lnk" data-act="md-ranchos" data-v="${h}">Abrir ranchos</button>`},
    {n:4,go:'folhas',m:'Folhas',t:'Folhas de produção',st:di.folhasEm?'ok':'futuro',d:di.folhasEm?`Geradas às ${hora(di.folhasEm)} (${di.folhasN||0})`:'Busque a ordem e baixe a folha',a:`<button class="lnk" data-act="md-folha-busca">Buscar folha por ordem ou produto</button>`},
    {n:5,go:'programacao',m:'Programação',t:'Apontamento',st:(s12==='pend'||s17==='pend')?'pend':(s12==='ok'&&s17==='ok')?'ok':'futuro',d:entHoje.length?`${entHoje.length} lançamento${entHoje.length===1?'':'s'} · ${f0(tot)} hoje`:'Nada lançado hoje',chips:`<span class="apt ${s12}">12:00</span><span class="apt ${s17}">17:15</span>`,a:`<button class="lnk" data-act="md-apt-abrir">Lançar entregas</button>`},
    anlRotCard()
  ].filter(r=>okGo(r.go));
  if(cgo){ /* cartões próprios do cargo */
    if(ok('diario')){ const r=pnlRanchos('').filter(x=>x.o.status==='aberta'&&x.o.rancho&&!x.e.ent); const g=new Set(r.map(x=>String(x.o.rancho))).size, sep=new Set(r.filter(x=>x.e.sep).map(x=>String(x.o.rancho))).size, urg=r.filter(x=>dbPri(x.o)===1).length, cp=pnlRanchos('').filter(x=>x.e.conf&&x.e.conf.falta&&!x.e.comp).length;
      rot.push({go:'diario',m:'Almoxarifado',t:'Fila do almox',st:cp||urg?'alerta':g?'pend':'ok',d:g?`${g} rancho${g===1?'':'s'} na fila · ${sep} separado${sep===1?'':'s'}`:'Nada para separar agora',x:cp?`${cp} complemento${cp===1?'':'s'} pendente${cp===1?'':'s'}`:urg?`${urg} urgente${urg===1?'':'s'}`:'',a:`<button class="lnk" data-act="md-fila">Abrir a fila</button>`}); }
    if(ok('pmxfichas')){ const fs=S.pmx.fichas.filter(f=>f.status!=='excluida'&&!pmxEnc(f)); rot.push({go:'pmxfichas',m:'Premix',t:'Fichas de premix',st:fs.length?'pend':'ok',d:fs.length?`${fs.length} ficha${fs.length===1?'':'s'} em produção`:'Nenhuma ficha aberta',a:`<button class="lnk" data-go="pmxfichas">Abrir fichas</button>`}); }
    if(ok('paradas')&&!ok('programacao')){ const pa=S.paradas.filter(p=>!p.fim); rot.push({go:'paradas',m:'Paradas',t:'Paradas',st:pa.length?'alerta':'ok',d:pa.length?`${pa.length} linha${pa.length===1?'':'s'} parada${pa.length===1?'':'s'}`:'Todas produzindo',a:`<button class="lnk" data-go="paradas">Registrar parada</button>`}); }
    rot.forEach((r,i)=>r.n=i+1); }
  const icSt={ok:ic('check',16,2.4),pend:'<i class="dot"></i>',alerta:'!',futuro:ic('relogio',15,2)};
  // linhas de hoje
  const L=linhasOrd(); const blocos=L.map(l=>{ const os=ordAbertas().filter(o=>o.linha===l&&dataEf(o)<=h).concat(hojeOs.filter(o=>o.linha===l&&o.status!=='aberta')).sort((a,b)=>dataEf(a).localeCompare(dataEf(b))||seqCmp(a,b)); const pa=paradas.find(p=>p.linha===l);
    if(!os.length&&!pa) return ''; return `<div class="mdl"><div class="mdl-h"><b>${esc(l)}</b>${pa?`<span class="pill crit">Parada há ${dur(Date.now()-new Date(pa.inicio))} · ${esc(pa.motivo)}</span>`:os.some(o=>o.status==='aberta')?'':'<span class="pill neu">sem ordem aberta</span>'}</div>
    ${os.map(o=>{ const e=entregueDe(o), si=stInfo(o,e), pct=o.total>0?Math.min(1,e/o.total):0; return `<div class="mdo" data-act="md-ordem" data-id="${esc(o._id)}" role="button" tabindex="0">
      <span class="op"><b>${esc(nomeCurto(o))}</b><small class="num">${esc(codigoDe(o))} · ${esc(o.num)}${ordAtras(o,h)?' · <span style="color:var(--crit-ink)">desde '+dm(dataEf(o))+'</span>':''}${o.rancho?'':' · <span style="color:var(--warn-ink)">sem rancho</span>'}</small></span>
      <span class="num mdn">${o.status==='aberta'?'falta <b>'+f0(Math.max(0,o.total-e))+'</b> '+uA(o):''}<span class="bar" style="display:block;height:4px;margin-top:4px"><i style="width:${pct*100}%"></i></span></span>
      <span class="pill ${si.c}">${esc(si.t)}</span>
      <button class="fpbtn" data-act="fp-ordem" data-id="${esc(o._id)}" aria-label="Folha da ordem ${esc(o.num)}">${ic('folha',15,2)}</button></div>`; }).join('')}</div>`; }).join('');
  const amanha=amanhaStr(); const amR=ranchosDoDia(amanha,''); const amSem=amR.sem.length; const fila=aProgramar().length;
  const avisos=[];
  if(atras.length&&ok('programacao')) avisos.push(`<div class="av crit"><b>${atras.length} ${atras.length===1?'ordem':'ordens'} atrasada${atras.length===1?'':'s'}</b><span>${atras.slice(0,4).map(o=>esc(o.num)+' ('+esc(o.linha)+', '+dm(dataEf(o))+')').join(', ')}${atras.length>4?'…':''}</span><button class="lnk" data-act="rep-abrir">Replanejar atrasadas</button></div>`);
  if(S._div&&S._div.n&&ok('programacao')&&!cgo) avisos.push(`<div class="av crit"><b>${S._div.n} divergência${S._div.n===1?'':'s'} com o sistema</b><span>${S._div.fora.length} aberta${S._div.fora.length===1?'':'s'} no painel e fora do sistema · ${S._div.reab.length} encerrada${S._div.reab.length===1?'':'s'} no painel e aberta${S._div.reab.length===1?'':'s'} no sistema.</span><button class="lnk" data-act="md-div">Ver na programação</button></div>`);
  if(fila&&ok('aprogramar')&&!cgo) avisos.push(`<div class="av warn"><b>${fila} ${fila===1?'ordem':'ordens'} a programar</b><span>Vieram da importação e ainda não têm linha.</span><button class="lnk" data-go="aprogramar">Programar</button></div>`);
  if(!cgo||ok('anlres')){ const av=anlAvisoMeuDia(); if(av) avisos.unshift(av); }
  if(!cgo){ const ab=anlAvisoBackup(); if(ab) avisos.push(ab); }
  if(ok('paradas')){ const pm=parAvisoMeuDia(); if(pm) avisos.push(pm); }
  if(ok('pmxfichas')){ const px=pmxAvisoMeuDia(); if(px) avisos.push(px); }
  if(!cgo){ const cf=cadAviso(); if(cf) avisos.push(cf); }
  if(!cgo||(acsP()&&acsP().mods.includes('almox'))){ const ax=alxAvisoMeuDia(); if(ax) avisos.push(ax); }
  if(amSem&&ok('ranchos')) avisos.push(`<div class="av warn"><b>${amanhaLab()}: ${amSem} ${amSem===1?'ordem':'ordens'} sem rancho</b><span>Tire no sistema e anexe para mandar ao almox.</span><button class="lnk" data-act="md-ranchos" data-v="${amanha}">Ranchos de ${amanhaLab().toLowerCase()}</button></div>`);
  return `${banner()}
  ${op.topo||''}<div class="head"><div><div class="eyebrow">${cgo&&op.cargoNome?esc(op.cargoNome.toUpperCase())+' · ':'MEU DIA · '}${esc(agora.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).toUpperCase())}</div><h1>${saudacao()}${(op.nome!=null?op.nome:nome)?', '+esc(op.nome!=null?op.nome:nome):''}</h1><div class="sub">${cgo?'A sua rotina na ordem do dia, só com o que é do seu cargo. O que está pendente fica em amarelo; o que precisa de atenção, em vermelho.':'A rotina do PCP na ordem do dia. O que está pendente fica em amarelo; o que precisa de atenção, em vermelho.'}</div></div>${!cgo||ok('anlres')?`<button class="btn sec" data-act="anl-resdia">${ic('zap',18,2)}Resumo do dia</button>`:''}</div>
  ${rot.length?'':''}<div class="rotina ${rot.length>=6?'seis':''}" ${rot.length&&rot.length<6?`style="grid-template-columns:repeat(${rot.length},minmax(0,1fr))"`:''}>${rot.map(r=>`<div class="rot st-${r.st}" data-act="md-card" data-v="${r.go}" role="link" tabindex="0" title="Abrir ${esc(r.m)}"><div class="rot-h"><span class="rot-n num">${r.n} · ${esc(r.m).toUpperCase()}</span><span class="rot-ic">${icSt[r.st]}</span></div><b>${r.t}</b><div class="rot-d num">${r.d}</div>${r.x?`<div class="rot-x">${r.x}</div>`:''}${r.chips?`<div class="rot-c">${r.chips}</div>`:''}<div class="rot-a">${r.a}</div></div>`).join('')}</div>
  ${op.extra||''}
  <div class="md-grid ${cgo&&!ok('programacao')&&!ok('calendario')?'md-so':''}">
   ${cgo&&!ok('programacao')&&!ok('calendario')&&!ok('tvfab')?'':`<section class="card"><div class="head" style="align-items:baseline"><div class="label">HOJE NAS LINHAS</div>${ok('programacao')?'<button class="lnk" data-go="programacao">Programação completa</button>':''}</div>
    ${blocos||'<div class="empty">Nenhuma ordem para hoje.</div>'}</section>`}
   <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
    ${ok('geral')||ok('silos')?cimentoCard(prev,false):''}
    ${avisos.length?`<section class="card"><div class="label" style="margin-bottom:6px">ATENÇÃO</div>${avisos.join('')}</section>`:''}
    ${cgo&&!ok('paradas')&&!ok('programacao')?'':`<section class="card"><div class="label" style="margin-bottom:6px">PARADAS AGORA</div>${paradas.length?paradas.map(p=>`<div class="row num" style="grid-template-columns:minmax(0,1fr) auto"><span><b>${esc(p.linha)}</b> · ${esc(p.motivo)}${p.ordem?' <small style="color:var(--muted)">· ordem '+esc(p.ordem)+'</small>':''}</span><span class="pill crit">${dur(Date.now()-new Date(p.inicio))}</span></div>`).join(''):'<div class="sub" style="margin:0">Todas as linhas produzindo.</div>'}
     ${ok('paradas')?'<div style="margin-top:8px"><button class="lnk" data-go="paradas">Registrar parada</button></div>':''}</section>`}
   </div>
  </div>${op.depois||''}`;
}
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="md-"],[data-act="p-ordem"]'); if(!b||b.disabled) return; const act=b.dataset.act;
  if(act==='md-fila'){ ev.stopPropagation(); if(S.dbo){ S.dbo.modo='fila'; S.dbo.aberto=null; } go('diario'); return; }
  if(act==='md-card'){ const inn=ev.target.closest('button,a,input,select,label,[data-go]'); if(inn&&inn!==b&&b.contains(inn)) return; const v=b.dataset.v;
    if(v==='silo-geral'){ go('geral'); return; }
    if(v==='ranchos'){ S.rch.dia=hojeStr(); S.rch.fora=new Set(); S.rch.linha=''; go('ranchos'); return; }
    if(v==='folhas'){ abrirBuscaFolha(); return; }
    if(v==='anlbase'){ go('anlbase'); return; }
    if(v==='diario'){ if(S.dbo){ S.dbo.modo='fila'; S.dbo.aberto=null; } go('diario'); return; }
    if(v==='pmxfichas'||v==='paradas'){ go(v); return; }
    if(!viewOk('programacao')) return;
    S.ord.linha='todas'; S.ord.mostrar='abertas'; S.ord.busca=''; go('programacao'); return; }
  if(act==='md-ordem'){ if(ev.target.closest('[data-act^="fp-"]')) return; const o=ordById(b.dataset.id); if(!o) return; S.ord.linha=o.linha; S.ord.mostrar=o.status==='aberta'?'abertas':'todas'; S.ord.busca=''; S.ord.aberta=o._id; S.ord.painel='entrega'; S.ord.f={}; go('programacao'); return; }
  if(act==='md-div'){ S.ord.div=true; S.ord.linha='todas'; S.ord.busca=''; go('programacao'); return; }
  if(act==='md-ranchos'){ S.rch.dia=b.dataset.v; S.rch.fora=new Set(); S.rch.linha=''; go('ranchos'); return; }
  if(act==='md-folhas'){ const h=hojeStr(); const os=ordensDoDia(h); const ok=await gerarFolhasProducao(os,h,'Folhas_Producao_'+dataBR(h).replace(/\//g,'-')+linhasNome(os)+'.pdf'); if(ok) marcarDiario(h,{folhasEm:new Date().toISOString(),folhasN:os.length,folhasPor:S.uid}); return; }
  if(act==='p-ordem'){ S.parar.ordem=b.dataset.v||null; render(); return; }
});
document.addEventListener('keydown',ev=>{ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&(ev.target.classList.contains('mdo')||ev.target.classList.contains('rot'))){ ev.preventDefault(); ev.target.click(); } });

// ================= INDICADORES =================
function perInd(){ const P=S.ind.per, h=hojeStr(); if(P==='datas'){ const a=S.ind.de||h, b=S.ind.ate&&S.ind.ate>=a?S.ind.ate:a; return [a,addDias(b,1),a===b?dm(a):dm(a)+' a '+dm(b)]; } if(P==='hoje') return [h,addDias(h,1),'Hoje']; if(P==='semana'){ const i=segundaStr(new Date()); return [i,addDias(h,1),'Esta semana']; }
  if(P==='passada'){ const i=addDias(segundaStr(new Date()),-7); return [i,addDias(i,7),'Semana passada']; }
  if(P==='mes'){ const d=new Date(); const i=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-01'; return [i,addDias(h,1),'Este mês']; }
  return [addDias(h,-29),addDias(h,1),'Últimos 30 dias']; }
function dataFech(o){ return o.fimEm?hojeStr(new Date(o.fimEm)):(o.novaDataAnt||dataEf(o)); }
function vIndicadores(){
  const I=S.ind, [ini,fim,rot]=perInd(), L=linhasOrd(), lf=I.linha;
  const enc=S.ordens.filter(o=>o.status==='encerrada'&&o.linha&&(!lf||o.linha===lf)).filter(o=>{ const d=dataFech(o); return d>=ini&&d<fim; });
  const cnt={total:0,sobra:0,falta:0,sem:0}; enc.forEach(o=>cnt[o.fechamento||'total']=(cnt[o.fechamento||'total']||0)+1);
  const pc=k=>enc.length?Math.round(cnt[k]/enc.length*100):0;
  const an=anuladas(); const ents=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&(!lf||e.linha===lf)).filter(e=>{ const d=hojeStr(new Date(e.em)); return d>=ini&&d<fim; });
  const sacos=ents.reduce((a,e)=>a+(+e.qtd||0),0);
  const t0=new Date(ini+'T00:00:00').getTime(), t1=Math.min(Date.now(),new Date(fim+'T00:00:00').getTime());
  const par=S.paradas.filter(p=>!lf||p.linha===lf).map(p=>{ const a=Math.max(t0,new Date(p.inicio).getTime()), b=Math.min(t1,p.fim?new Date(p.fim).getTime():Date.now()); return {p,ms:Math.max(0,b-a)}; }).filter(x=>x.ms>0);
  const parMs=par.reduce((a,x)=>a+x.ms,0);
  const porLinha=L.map(l=>{ const xs=enc.filter(o=>o.linha===l); const c={total:0,sobra:0,falta:0,sem:0}; xs.forEach(o=>c[o.fechamento||'total']++); return {l,n:xs.length,c}; }).filter(x=>x.n);
  const maxN=Math.max(1,...porLinha.map(x=>x.n));
  const dias=[]; for(let d=ini; d<fim&&dias.length<62; d=addDias(d,1)) dias.push(d);
  const porHora=I.per==='hoje'; const horas=[]; if(porHora){ const hs=ents.map(e=>new Date(e.em).getHours()); const h0=Math.min(7,...hs), h1=Math.max(18,...hs); for(let x=h0;x<=h1;x++) horas.push(x); }
  const porDia=porHora?horas.map(x=>({d:pad(x)+'h',q:ents.filter(e=>new Date(e.em).getHours()===x).reduce((a,e)=>a+(+e.qtd||0),0)})):dias.map(d=>({d,q:ents.filter(e=>hojeStr(new Date(e.em))===d).reduce((a,e)=>a+(+e.qtd||0),0)}));
  const casaM=buscaCasa(I.bm||''); const entsA=(I.meus&&S.uid?ents.filter(e=>e.por===S.uid):ents).filter(e=>!I.bm||casaM(ordById(e.ordem)||{num:e.num,linha:e.linha}));
  const porMat={}, porOrd={}; entsA.forEach(e=>{ const o=ordById(e.ordem)||{num:e.num,produto:'',linha:e.linha}; const c=codigoDe(o)||'—';
    const m=porMat[c]=porMat[c]||{c,nome:nomeCurto(o),o,q:0,n:0,ords:new Set()}; m.q+=+e.qtd||0; m.n++; m.ords.add(e.num||e.ordem);
    const k=e.ordem||e.num; const r=porOrd[k]=porOrd[k]||{o,num:e.num||o.num,q:0,n:0,ult:''}; r.q+=+e.qtd||0; r.n++; if(e.em>r.ult) r.ult=e.em; });
  const mats=Object.values(porMat).sort((a,b)=>b.q-a.q), ords=Object.values(porOrd).sort((a,b)=>b.ult.localeCompare(a.ult));
  const totA=entsA.reduce((a,e)=>a+(+e.qtd||0),0);
  const maxD=Math.max(1,...porDia.map(x=>x.q)); const idxMax=porDia.findIndex(x=>x.q===maxD&&x.q>0);
  const agr=(k)=>{ const m={}; par.forEach(x=>{ const key=x.p[k]||'—'; m[key]=(m[key]||0)+x.ms; }); return Object.entries(m).sort((a,b)=>b[1]-a[1]); };
  const pm=agr('motivo'), pl=agr('linha'); const maxM=Math.max(1,...pm.map(x=>x[1])), maxL=Math.max(1,...pl.map(x=>x[1]));
  const faltas=enc.filter(o=>o.fechamento==='falta').map(o=>({o,d:o.total-entregueDe(o)})).filter(x=>x.d>0).sort((a,b)=>b.d-a.d).slice(0,10);
  const seg=(c,n)=>['total','sobra','falta','sem'].filter(k=>c[k]).map(k=>`<i class="sg sg-${k}" style="width:${c[k]/n*100}%" title="${FECH[k].n}: ${c[k]}"></i>`).join('');
  const hbar=(rows,max,fmt)=>rows.map(([k,v])=>`<div class="hb"><span class="hb-l">${esc(k)}</span><span class="hb-t"><i style="width:${Math.max(2,v/max*100)}%" title="${esc(k)}: ${fmt(v)}"></i></span><b class="num">${fmt(v)}</b></div>`).join('');
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Indicadores</h1><div class="sub">Como as ordens fecharam, quanto foi lançado e quanto tempo as linhas ficaram paradas.</div></div></div>
  <section class="card" style="padding:14px 18px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
   <div class="chips">${[['hoje','Hoje'],['semana','Esta semana'],['passada','Semana passada'],['mes','Este mês'],['30','30 dias'],['datas','Escolher datas']].map(([k,l])=>`<button class="chip" data-act="i-per" data-v="${k}" aria-pressed="${I.per===k}">${l}</button>`).join('')}</div>${I.per==='datas'?`<div class="drng on"><input class="txt" id="i-de" type="date" value="${esc(ini)}" aria-label="De"><span>até</span><input class="txt" id="i-ate" type="date" value="${esc(addDias(fim,-1))}" aria-label="Até"></div>`:''}
   <select class="txt" id="i-linha" style="width:180px;height:38px;margin-left:auto" aria-label="Linha"><option value="">Todas as linhas</option>${L.map(l=>`<option ${lf===l?'selected':''}>${esc(l)}</option>`).join('')}</select>
  </div></section>
  <div class="resumo">
   <div><div class="k">Ordens encerradas</div><div class="v num">${enc.length} <small>${esc(rot.toLowerCase())}</small></div></div>
   <div><div class="k">Entregue total</div><div class="v num ok">${pc('total')}% <small>${cnt.total} ordens</small></div></div>
   <div><div class="k">Com falta</div><div class="v num ${cnt.falta?'crit':''}">${pc('falta')}% <small>${cnt.falta} ordens</small></div></div>
   <div><div class="k">Tempo parado</div><div class="v num ${parMs?'warn':''}">${dur(parMs)} <small>${par.length} parada${par.length===1?'':'s'}</small></div></div>
  </div>
  <div class="two">
   <section class="card"><div class="label">FECHAMENTO DAS ORDENS POR LINHA</div>
    <div class="legend" style="margin:8px 0 10px">${['total','sobra','falta','sem'].map(k=>`<span><i class="sg-${k}"></i>${FECH[k].n}</span>`).join('')}</div>
    ${porLinha.length?porLinha.map(x=>`<div class="stk"><span class="hb-l">${esc(x.l)}</span><span class="stk-b" style="width:${x.n/maxN*100}%">${seg(x.c,x.n)}</span><b class="num">${x.n}</b></div><div class="stk-d num">${['total','sobra','falta','sem'].filter(k=>x.c[k]).map(k=>FECH[k].n.toLowerCase()+' '+x.c[k]).join(' · ')}</div>`).join(''):'<div class="empty">Nenhuma ordem encerrada no período.</div>'}
   </section>
   <section class="card"><div class="head" style="align-items:baseline"><div class="label">QUANTIDADE LANÇADA ${porHora?'POR HORA':'POR DIA'}</div><b class="num">${f0(sacos)}</b></div>
    <div class="vbars" style="grid-template-columns:repeat(${porDia.length},minmax(0,1fr))">${porDia.map((x,i)=>`<div class="vb" title="${porHora?x.d:dm(x.d)}: ${f0(x.q)}"><span class="vb-v num">${i===idxMax?f0(x.q):''}</span><i style="height:${x.q?Math.max(3,x.q/maxD*100):0}%"></i></div>`).join('')}</div>
    <div class="vbx num"><span>${porHora?porDia[0].d:dm(dias[0])}</span><span>${porHora?porDia[porDia.length-1].d:dm(dias[dias.length-1])}</span></div>
    <div class="sub" style="margin:8px 0 0;font-size:12px">Conta as entregas lançadas no painel${lf?'':' e soma todas as unidades (sacos, fardos, pacotes…); filtre por linha para ver uma só'}. As entregas antigas da planilha não têm data e ficam fora deste gráfico.</div>
   </section>
  </div>
  <section class="card" id="i-apont"><div class="head" style="align-items:center;gap:10px"><div><div class="label">APONTAMENTOS · ${esc(rot.toUpperCase())}${I.bm?' · “'+esc(I.bm.toUpperCase())+'”':''}</div><div class="sub" style="margin:2px 0 0;font-size:12.5px">${entsA.length} lançamento${entsA.length===1?'':'s'} · ${f0(totA)} no total · ${mats.length} ${mats.length===1?'material':'materiais'} · ${ords.length} ${ords.length===1?'ordem':'ordens'}</div></div>
    ${S.uid?`<div class="seg" role="group" aria-label="De quem"><button data-act="i-meus" data-v="0" aria-pressed="${!I.meus}">Todos</button><button data-act="i-meus" data-v="1" aria-pressed="${!!I.meus}">Só os meus</button></div>`:''}</div>
   <div class="fline" style="margin-top:12px"><label class="srch" style="margin-left:0;max-width:340px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input class="txt" id="i-bm" type="search" placeholder="Filtrar material ou ordem (ex.: AC3)" value="${esc(I.bm||'')}" aria-label="Filtrar material ou ordem"></label>
    <div class="seg" role="group" aria-label="Visão"><button data-act="i-vis" data-v="resumo" aria-pressed="${!I.hist}">Resumo</button><button data-act="i-vis" data-v="hist" aria-pressed="${!!I.hist}">Histórico${entsA.length?' ('+entsA.length+')':''}</button></div></div>
   ${entsA.length&&I.hist?`<div class="hist num" style="margin-top:10px"><div class="hrow hhead"><span>Data e hora</span><span>Ordem</span><span>Material</span><span>Como</span><span class="nr">Qtd</span></div>${entsA.slice().sort((a,b)=>String(b.em).localeCompare(String(a.em))).slice(0,400).map(e=>{ const o=ordById(e.ordem)||{num:e.num,produto:'',linha:e.linha}; const como=[e.pal?fq(e.pal)+' pal × '+fq(e.porPal):'',e.fardos?fq(e.fardos)+' fd × '+fq(e.porFardo):'',e.avulso?fq(e.avulso)+' avulsos':''].filter(Boolean).join(' + ')||'—'; return `<div class="hrow"><span>${dm(hojeStr(new Date(e.em)))} ${hora(e.em)}${e.antecipado?' <small>antecipado</small>':''}</span><span><button class="lnk" data-act="i-ordem" data-v="${esc(e.num||o.num)}" style="padding:0">${esc(e.num||o.num)}</button><small>${esc(o.linha||e.linha||'')}</small></span><span><b>${esc(codigoDe(o))}</b> ${esc(nomeCurto(o))}</span><span>${como}<small>${esc(nomeDe(e.por))}</small></span><b class="nr">${fq(e.qtd)} <small style="display:inline">${esc(uA(o))}</small></b></div>`; }).join('')}<div class="hrow htot"><span>Total</span><span></span><span></span><span>${entsA.length} lançamento${entsA.length===1?'':'s'}</span><b class="nr">${fq(totA)}</b></div></div>`:''}
   ${entsA.length&&!I.hist?`<div class="two" style="margin-top:12px;gap:24px">
    <div><div class="label" style="margin-bottom:4px">POR MATERIAL</div>${mats.map(m=>`<div class="row num" style="grid-template-columns:minmax(0,1fr) auto;padding:8px 0;cursor:pointer" data-act="i-mat" data-v="${esc(m.c)}" title="Ver o histórico deste material"><span><b>${esc(m.c)}</b> ${esc(m.nome)}<br><small style="color:var(--muted)">${m.ords.size} ${m.ords.size===1?'ordem':'ordens'} · ${m.n} lançamento${m.n===1?'':'s'}</small></span><b>${fq(m.q)} <small style="color:var(--muted);font-weight:500">${esc(uA(m.o))}</small></b></div>`).join('')}</div>
    <div><div class="label" style="margin-bottom:4px">POR ORDEM</div>${ords.map(r=>`<div class="row num" style="grid-template-columns:70px minmax(0,1fr) auto;padding:8px 0;cursor:pointer" data-act="i-ordem" data-v="${esc(r.num)}" title="Abrir na Programação"><b>${esc(r.num)}</b><span>${esc(codigoDe(r.o))} ${esc(nomeCurto(r.o))}<br><small style="color:var(--muted)">${esc(r.o.linha||'')} · ${r.n} lançamento${r.n===1?'':'s'} · último ${porHora?'':dm(hojeStr(new Date(r.ult)))+' '}${hora(r.ult)}</small></span><b>${fq(r.q)} <small style="color:var(--muted);font-weight:500">${esc(uA(r.o))}</small></b></div>`).join('')}</div>
   </div>`:''}${entsA.length?'':`<div class="empty">${I.meus?'Você não lançou apontamentos':'Nenhum apontamento'}${I.bm?' de “'+esc(I.bm)+'”':''} no período.</div>`}
  </section>
  <div class="two">
   <section class="card"><div class="label" style="margin-bottom:8px">TEMPO PARADO POR MOTIVO</div>${pm.length?hbar(pm,maxM,dur):'<div class="empty">Nenhuma parada no período.</div>'}</section>
   <section class="card"><div class="label" style="margin-bottom:8px">TEMPO PARADO POR LINHA</div>${pl.length?hbar(pl,maxL,dur):'<div class="empty">Nenhuma parada no período.</div>'}</section>
  </div>
  ${faltas.length?`<section class="card"><div class="label" style="margin-bottom:6px">MAIORES FALTAS NO PERÍODO</div>${faltas.map(x=>`<div class="row num" style="grid-template-columns:90px minmax(0,1fr) auto"><b>${esc(x.o.num)}</b><span>${esc(codigoDe(x.o))} · ${esc(nomeCurto(x.o))}<br><small style="color:var(--muted)">${esc(x.o.linha)} · ${dm(dataFech(x.o))} · entregue ${fq(entregueDe(x.o))} de ${fq(x.o.total)}</small></span><span class="pill crit">faltou ${fq(x.d)}</span></div>`).join('')}</section>`:''}`;
}
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="i-per"]'); if(!b) return; if(b.dataset.v==='datas'&&S.ind.per!=='datas'){ const [a,f]=perInd(); S.ind.de=a; S.ind.ate=addDias(f,-1); } S.ind.per=b.dataset.v; render(); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="i-meus"],[data-act="i-ordem"]'); if(!b) return; if(b.dataset.act==='i-meus'){ S.ind.meus=b.dataset.v==='1'; render(); return; } const O=S.ord; O.linha='todas'; O.mostrar='todas'; O.de=''; O.ate=''; O.busca=b.dataset.v; O.aberta=null; go('programacao'); });
document.addEventListener('change',ev=>{ if(ev.target.id==='i-linha'){ S.ind.linha=ev.target.value; render(); } if(ev.target.id==='i-de'||ev.target.id==='i-ate'){ S.ind[ev.target.id==='i-de'?'de':'ate']=ev.target.value; render(); } });
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='i-bm') return; S.ind.bm=t.value; clearTimeout(S.ind._bt); S.ind._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#i-bm'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },300); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="i-vis"],[data-act="i-mat"]'); if(!b) return; if(b.dataset.act==='i-vis') S.ind.hist=b.dataset.v==='hist'; else { S.ind.bm=b.dataset.v; S.ind.hist=true; } render(); const s=$('#i-apont'); s&&s.scrollIntoView({block:'start',behavior:'smooth'}); });

// ================= ITENS (cadastro) =================
function itemDe(cod){ cod=String(cod||'').toUpperCase(); return S.itens.find(i=>(i.codigo||i._id)===cod); }
const UNID={SC:{s:'saco',p:'sacos',a:'sc'},FD:{s:'fardo',p:'fardos',a:'fd'},PCT:{s:'pacote',p:'pacotes',a:'pct'},UN:{s:'unidade',p:'unidades',a:'un'},CX:{s:'caixa',p:'caixas',a:'cx'},BD:{s:'balde',p:'baldes',a:'bd'},KG:{s:'kg',p:'kg',a:'kg'}};
function ehRejunte(cod){ cod=String(cod||'').toUpperCase(); const it=itemDe(cod); const rj=x=>/rejunte/i.test(String(x||'')); if(it&&(rj(it.descricao)||((it.linhas||[]).length&&(it.linhas||[]).every(rj)))) return true;
  const k=S.ordens.length; if(!S._rjMemo||S._rjMemo.k!==k){ const m={}; S.ordens.forEach(o=>{ const c=codigoDe(o); if(rj(o.produto)||rj(o.linha)) m[c]=true; }); S._rjMemo={k,m}; } return !!S._rjMemo.m[cod]; }
function unidCod(cod){ cod=String(cod||'').toUpperCase(); const it=itemDe(cod); if(it&&it.unidade&&UNID[it.unidade]) return it.unidade; if(ehRejunte(cod)) return 'UN'; if(/^(AC|AB|FA|AE)\d/.test(cod)) return 'SC'; return ''; }
function unidDe(o){ return unidCod(codigoDe(o)); }
function uA(o,n){ const u=UNID[unidDe(o)]; return u?u.a:'un.'; }
function uP(o){ const u=UNID[unidDe(o)]; return u?u.p:'unidades'; }
function itensAtivos(){ return S.itens.filter(i=>i.ativo!==false&&i.tipo!=='mp').sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo))); }
function usoItem(cod){ let n=0; S.ordens.forEach(o=>{ if(codigoDe(o)===cod) n++; }); return n; }
function ajAbas(v){ return `<div class="chips" role="tablist" aria-label="Ajustes">${[['ajustes','Configurações gerais'],['itens','Itens'],...(S.acs.dono?[['acessos','Acessos'],['paineis','Painéis por cargo']]:[])].map(([k,l])=>`<button class="chip" role="tab" data-go="${k}" aria-pressed="${v===k}" aria-selected="${v===k}">${l}</button>`).join('')}</div>`; }
function vItens(){
  const I=S.it, L=linhasOrd();
  let xs=[...S.itens];
  if(I.linha!=='todas') xs=xs.filter(i=>(i.linhas||[]).includes(I.linha));
  if(!I.inativos) xs=xs.filter(i=>i.ativo!==false);
  if(I.alx==='alx') xs=xs.filter(i=>alxLocsIt(i).length); else if(I.alx==='mp') xs=xs.filter(i=>i.tipo==='mp'); else if(I.alx==='prod') xs=xs.filter(i=>i.tipo!=='mp');
  const q=I.busca.trim().toLowerCase(); if(q) xs=xs.filter(i=>String(i.codigo).toLowerCase().includes(q)||String(i.descricao||'').toLowerCase().includes(q));
  if(I.falta&&I.falta.length) xs=xs.filter(i=>I.falta.includes(String(i.codigo).toUpperCase()));
  const semCad=I.falta&&I.falta.length?I.falta.filter(c=>!S.itens.some(i=>String(i.codigo).toUpperCase()===c)):[];
  xs.sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo)));
  const cont={}; S.itens.filter(i=>i.ativo!==false).forEach(i=>(i.linhas||[]).forEach(l=>cont[l]=(cont[l]||0)+1));
  const inat=S.itens.filter(i=>i.ativo===false).length;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">AJUSTES</div><h1>Itens</h1><div class="sub">Cadastro dos produtos: unidade (saco, fardo, pacote…), em quais linhas rodam, quantos vão por palete e o cimento por saco. A unidade é preenchida sozinha quando você anexa um rancho; “?” quer dizer unidade suposta, confirme no item.</div></div>
   <button class="btn" data-act="it-novo">${ic('mais',20,2.2)}Novo item</button></div>
  ${ajAbas('itens')}
  ${I.falta&&I.falta.length?`<div class="banner" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px">Mostrando só os itens de ordens abertas <b>sem kg de cimento por saco</b>. Abra cada um e preencha o campo.${semCad.length?' Ainda sem cadastro: '+semCad.map(esc).join(', ')+' (use Novo item).':''}</span><button class="lnk" data-act="it-falta-x">Mostrar todos os itens</button></div>`:''}
  ${I.novo?`<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><h2>Novo item</h2><button class="lnk" data-act="it-fechar">Fechar</button></div>${itemForm(null)}</section>`:''}
  <section class="card" style="padding:16px 18px">
   <div class="chips" role="group" aria-label="Linha">${['todas',...L].map(l=>`<button class="chip" data-act="it-linha" data-v="${esc(l)}" aria-pressed="${I.linha===l}">${l==='todas'?'Todos':esc(l)} <span class="num" style="opacity:.75">${l==='todas'?S.itens.filter(i=>i.ativo!==false).length:(cont[l]||0)}</span></button>`).join('')}</div>
   <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
    <div class="seg">${[['','Todos'],['prod','Produtos'],['alx','Com almoxarifado'],['mp','Matéria-prima e embalagem']].map(([k,t])=>`<button data-act="it-alx" data-v="${k}" aria-pressed="${(I.alx||'')===k}">${t}</button>`).join('')}</div>
    ${inat?`<button class="chip" data-act="it-inativos" aria-pressed="${I.inativos}">Mostrar inativos (${inat})</button>`:''}
    <input class="txt" id="it-busca" type="search" placeholder="Buscar código ou descrição" value="${esc(I.busca)}" style="height:38px;max-width:280px;margin-left:auto" aria-label="Buscar item">
   </div>
  </section>
  <section class="card ord-card" style="padding:6px 18px 10px">
   <div class="irow ohead" aria-hidden="true"><span>Código</span><span>Descrição</span><span>Linhas</span><span class="nr">Unid. · palete</span><span class="nr">Ordens</span></div>
   ${xs.length?xs.map(i=>itemRow(i)).join(''):'<div class="empty">Nenhum item encontrado.</div>'}
  </section>`;
}
function itemRow(i){ const ab=S.it.aberto===i._id; const pl=i.palete||((i.linhas||[]).map(l=>(S.cfg.paletes||{})[l]).find(Boolean));
  return `<div class="irow ${ab?'aberta':''} ${i.ativo===false?'fechada':''}" data-act="it-abrir" data-id="${esc(i._id)}" role="button" tabindex="0" aria-expanded="${ab}">
   <span class="num"><b>${esc(i.codigo)}</b></span>
   <span class="ides">${esc(i.descricao||'')}${i.ativo===false?' <span class="pill dash">inativo</span>':''}</span>
   <span class="ilin">${(i.linhas||[]).map(l=>`<span class="tag">${esc(l)}</span>`).join('')}${alxLocsIt(i).map(l=>`<span class="tag alx">${ALX_LOC[l]||esc(l)}</span>`).join('')}${!(i.linhas||[]).length&&!alxLocsIt(i).length?'<span style="color:var(--faint)">—</span>':''}</span>
   <span class="nr num">${unidCod(i.codigo)?UNID[unidCod(i.codigo)].a+(i.unidade?'':' <small>?</small>'):'<span style="color:var(--warn-ink)">sem unid.</span>'} · ${pl?`${pl}${i.palete?'':' <small>linha</small>'}`:'<span style="color:var(--faint)">—</span>'}${i.fardo?` <small>· fd ${i.fardo}</small>`:''}</span>
   <span class="nr num">${usoItem(i.codigo)||'<span style="color:var(--faint)">0</span>'}</span>
  </div>${ab?`<div class="odet" style="grid-template-columns:minmax(0,1fr)">${itemForm(i)}</div>`:''}`; }
function itemForm(i){ const f=S.it.f; const L=linhasOrd();
  if(!f.linhas) f.linhas=i?[...(i.linhas||[])]:(S.it.linha!=='todas'?[S.it.linha]:[]);
  if(!f.alxLocais) f.alxLocais=i?[...alxLocsIt(i)]:[]; if(!f.alxGrupos) f.alxGrupos=i?[...((i.almox||{}).grupos||[])]:[];
  const v=(k,d)=>f[k]!=null?f[k]:(i&&i[k]!=null?i[k]:d);
  return `<div class="ed-grid" style="margin-top:6px">
   <label><span class="sub">Código</span><input class="txt num" id="it-f-codigo" value="${esc(v('codigo',''))}" ${i?'readonly style="background:var(--surface-2)"':''} placeholder="AC0005" autocomplete="off"></label>
   <label style="grid-column:span 2"><span class="sub">Descrição</span><input class="txt" id="it-f-descricao" value="${esc(v('descricao',''))}" placeholder="ARGAMASSA CINZA AC3 EMB PAPEL 20 KG"></label>
   <label><span class="sub">Unidade</span><select class="txt" id="it-f-unidade"><option value="">${(()=>{ const c=String(v('codigo','')).toUpperCase(); const u=c&&!(i&&i.unidade)?unidCod(c):''; return u?'Automático: '+UNID[u].s:'—'; })()}</option>${Object.keys(UNID).map(k=>`<option value="${k}" ${v('unidade','')===k?'selected':''}>${UNID[k].s[0].toUpperCase()+UNID[k].s.slice(1)} (${UNID[k].a})</option>`).join('')}</select></label>
   <label><span class="sub" id="it-f-pal-lab">${(()=>{ const u=v('unidade','')||unidCod(String(v('codigo','')).toUpperCase()); return (UNID[u]?UNID[u].p[0].toUpperCase()+UNID[u].p.slice(1):'Unidades')+' em 1 palete'; })()}</span><input class="txt num" id="it-f-palete" inputmode="numeric" value="${esc(v('palete','')??'')}" placeholder="ex.: 88 (vazio = padrão da linha)"></label>
   <label><span class="sub" id="it-f-fd-lab">${(()=>{ const u=v('unidade','')||unidCod(String(v('codigo','')).toUpperCase()); return 'Unidades em 1 fardo'; })()}</span><input class="txt num" id="it-f-fardo" inputmode="numeric" value="${esc(v('fardo','')??'')}" placeholder="ex.: 20 (se vai em fardo)"></label>
   <label><span class="sub">Kg de cimento por saco</span><input class="txt num" id="it-f-kgCimento" inputmode="decimal" value="${esc(String(v('kgCimento','')??'').replace('.',','))}" placeholder="se usa cimento"></label>
   <label><span class="sub">Kg de areia por saco</span><input class="txt num" id="it-f-kgAreia" inputmode="decimal" value="${esc(String(v('kgAreia','')??'').replace('.',','))}" placeholder="se usa areia"></label>
  </div>
  <div class="sub" style="margin:12px 0 6px;font-size:12px">Linhas onde roda</div>
  <div class="chips">${L.map(l=>`<button class="chip" data-act="it-lin" data-v="${esc(l)}" aria-pressed="${f.linhas.includes(l)}">${esc(l)}</button>`).join('')}</div>
  <div class="it-alx"><div class="sub" style="margin:0 0 6px;font-size:12px"><b>Almoxarifado</b> — onde o item é contado (Contagem, Recebimento e Auditoria)</div>
   <div class="chips">${ALX_LOCS.map(l=>`<button class="chip" data-act="it-aloc" data-v="${l}" aria-pressed="${f.alxLocais.includes(l)}">${ALX_LOC[l]}</button>`).join('')}</div>
   ${f.alxLocais.length?`<div class="ed-grid" style="margin-top:10px"><label><span class="sub">Contar em unidade própria</span><input class="txt" id="it-f-alxUn" value="${esc(f.alxUn!=null?f.alxUn:((i&&i.almox&&i.almox.un)||''))}" placeholder="vazio = unidade do item (ex.: KG, UN, ROLO)" autocomplete="off"></label>
    <label><span class="sub">Conversão (1 contado = ? na unidade própria)</span><input class="txt num" id="it-f-alxConv" inputmode="decimal" value="${esc(String(f.alxConv!=null?f.alxConv:((i&&i.almox&&i.almox.conv)||'')).replace('.',','))}" placeholder="ex.: 25 (1 saco = 25 kg)"></label></div>
   <div class="sub" style="margin:10px 0 6px;font-size:12px">Filtros rápidos (grupos)</div>
   <div class="chips">${[...new Set([...ALX_GRUPOS,...f.alxGrupos])].map(g=>`<button class="chip" data-act="it-agr" data-v="${esc(g)}" aria-pressed="${f.alxGrupos.includes(g)}">${esc(g)}</button>`).join('')}</div>`:''}</div>
  <label style="display:block;margin-top:12px"><span class="sub" style="font-size:12px">Observação</span><input class="txt" id="it-f-obs" value="${esc(v('obs',''))}" placeholder="opcional"></label>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px">
   ${i?`<button class="btn sec" data-act="it-ativo" data-id="${esc(i._id)}" style="height:40px">${i.ativo===false?'Reativar item':'Desativar item'}</button>`:'<span></span>'}
   <button class="btn" data-act="it-salvar" data-id="${i?esc(i._id):''}">${ic('check',18,2.2)}${i?'Salvar':'Cadastrar item'}</button></div>`; }
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act^="it-"]'); if(!b||b.disabled) return; const act=b.dataset.act, I=S.it;
  if(act==='it-abrir'){ I.aberto=I.aberto===b.dataset.id?null:b.dataset.id; I.f={}; I.novo=false; render(); return; }
  if(act==='it-linha'){ I.linha=b.dataset.v; I.aberto=null; render(); return; }
  if(act==='it-inativos'){ I.inativos=!I.inativos; render(); return; }
  if(act==='it-alx'){ I.alx=b.dataset.v; I.aberto=null; render(); return; }
  if(act==='it-aloc'){ itLerForm(); const l=b.dataset.v; const a=I.f.alxLocais||[]; I.f.alxLocais=a.includes(l)?a.filter(x=>x!==l):[...a,l]; render(); return; }
  if(act==='it-agr'){ itLerForm(); const g=b.dataset.v; const a=I.f.alxGrupos||[]; I.f.alxGrupos=a.includes(g)?a.filter(x=>x!==g):[...a,g]; render(); return; }
  if(act==='it-novo'){ I.novo=!I.novo; I.aberto=null; I.f={}; render(); const c=$('#it-f-codigo'); c&&c.focus(); return; }
  if(act==='it-fechar'){ I.novo=false; I.f={}; render(); return; }
  if(act==='it-lin'){ itLerForm(); const l=b.dataset.v; const a=I.f.linhas||[]; I.f.linhas=a.includes(l)?a.filter(x=>x!==l):[...a,l]; render(); return; }
  if(act==='it-ativo'){ const i=S.itens.find(x=>x._id===b.dataset.id); if(!i||!S.db) return;
    try{ await S.db.doc('itens/'+i._id).update({ativo:i.ativo===false,alteradoEm:new Date().toISOString(),alteradoPor:S.uid}); toast('Item '+i.codigo+(i.ativo===false?' reativado':' desativado')); }catch(e){ erro(e); } return; }
  if(act==='it-salvar'){ itLerForm(); const f=I.f; const id=b.dataset.id; const cod=String(f.codigo||'').trim().toUpperCase().replace(/\s+/g,'');
    if(!cod||!/^[A-Z0-9]{3,12}$/.test(cod)){ toast('Informe um código válido (letras e números).'); return; }
    if(!id&&itemDe(cod)){ toast('O item '+cod+' já está cadastrado.'); return; }
    const desc=String(f.descricao||'').trim().replace(/\s+/g,' '); if(!desc){ toast('Informe a descrição.'); return; }
    const pal=parseInt(String(f.palete||'').replace(/\D/g,''),10); const fdn=parseInt(String(f.fardo||'').replace(/\D/g,''),10);
    const kgc=numIn(String(f.kgCimento!=null?f.kgCimento:'').trim()), kga=numIn(String(f.kgAreia!=null?f.kgAreia:'').trim()); const ai=id?S.itens.find(x=>x._id===id):null; const aLoc=f.alxLocais||alxLocsIt(ai); const aUn=String(f.alxUn!=null?f.alxUn:((ai&&ai.almox&&ai.almox.un)||'')).trim().toUpperCase(); const aCv=numIn(String(f.alxConv!=null?f.alxConv:((ai&&ai.almox&&ai.almox.conv)||'')).trim());
    const alxDados={almox:{locais:ALX_LOCS.filter(l=>aLoc.includes(l)),un:aUn||null,conv:aCv>1?aCv:null,grupos:f.alxGrupos||((ai&&ai.almox&&ai.almox.grupos)||[])},tipo:!(f.linhas||[]).length&&aLoc.length&&aLoc.every(l=>l==='a1'||l==='a2')?'mp':null};
    const d={codigo:cod,descricao:desc.toUpperCase(),linhas:f.linhas||[],unidade:UNID[f.unidade]?f.unidade:null,palete:isNaN(pal)||pal<=0?null:pal,fardo:isNaN(fdn)||fdn<=0?null:fdn,kgCimento:kgc>0?kgc:null,kgAreia:kga>0?kga:null,obs:String(f.obs||'').trim(),alteradoEm:new Date().toISOString(),alteradoPor:S.uid}; Object.assign(d,alxDados);
    if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    try{ if(id) await S.db.doc('itens/'+id).update(d); else await S.db.doc('itens/'+cod).set(Object.assign(d,{ativo:true,criadoEm:d.alteradoEm,origem:'manual'}));
      toast('Item '+cod+(id?' atualizado':' cadastrado')); I.f={}; I.novo=false; I.aberto=null; render(); }catch(e){ erro(e); } return; }
});
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id!=='it-f-unidade') return; const lb=$('#it-f-pal-lab'); if(!lb) return; const cod=String(($('#it-f-codigo')||{}).value||'').toUpperCase(); const u=t.value||unidCod(cod); const bn=UNID[u]?UNID[u].p[0].toUpperCase()+UNID[u].p.slice(1):'Unidades'; lb.textContent=bn+' em 1 palete'; const lf=$('#it-f-fd-lab'); if(lf) lf.textContent='Unidades em 1 fardo'; });
function itLerForm(){ const f=S.it.f; ['codigo','descricao','unidade','palete','fardo','kgCimento','kgAreia','obs','alxUn','alxConv'].forEach(k=>{ const el=$('#it-f-'+k); if(el) f[k]=el.value; }); }
document.addEventListener('input',ev=>{ const t=ev.target;
  if(t.id==='it-busca'){ S.it.busca=t.value; clearTimeout(S.it._bt); S.it._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#it-busca'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); return; }
  if(t.id&&t.id.startsWith('it-f-')) S.it.f[t.id.slice(5)]=t.value;
});
document.addEventListener('keydown',ev=>{ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&ev.target.classList.contains('irow')&&ev.target.dataset.act){ ev.preventDefault(); ev.target.click(); } });

// ================= CALENDÁRIO =================
const DIAS_CAL=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function segundaStr(d){ const x=new Date(d); x.setHours(12,0,0,0); x.setDate(x.getDate()-((x.getDay()+6)%7)); return hojeStr(x); }
function addDias(s,n){ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return hojeStr(d); }
function capDe(l){ const c=(S.cfg.capacidade||{})[l]; return c>0?c:0; }
function vCalendario(){
  const _pc=previsaoCimento(); S._faltaId=_pc&&_pc.falta?_pc.falta.o._id:null;
  const C=S.cal; if(!C.ini) C.ini=segundaStr(new Date());
  S._est={}; S._sobra={}; linhasOrd().forEach(l=>Object.assign(S._est,estimarLinha(l)));
  const nd=C.sab?6:5, dias=[...Array(nd)].map((_,i)=>addDias(C.ini,i)), fim=addDias(C.ini,7), h=hojeStr(), LT=linhasOrd(), L=C.linha==='todas'?LT:LT.filter(l=>l===C.linha);
  const q=(C.busca||'').trim().toLowerCase(); const bate=o=>!q||String(o.num).includes(q)||String(o.produto||'').toLowerCase().includes(q)||String(o.ensaca||'').includes(q);
  const vis=S.ordens.filter(o=>o.linha&&(o.status==='aberta'||(C.fech&&o.status==='encerrada'))&&bate(o));
  const atras=ordAbertas().filter(o=>ordAtras(o,h)&&bate(o)&&L.includes(o.linha)).sort((a,b)=>dataEf(a).localeCompare(dataEf(b)));
  const antes=atras.filter(o=>dataEf(o)<C.ini);
  const cols=`minmax(104px,130px) repeat(${nd},minmax(150px,1fr))`;
  const sel=C.sel?ordById(C.sel):null;
  const naSemana=vis.filter(o=>L.includes(o.linha)&&dataEf(o)>=C.ini&&dataEf(o)<fim).length;
  const fora=q?S.ordens.filter(o=>o.linha&&o.status!=='ignorada'&&bate(o)&&L.includes(o.linha)&&(dataEf(o)<C.ini||dataEf(o)>=fim)&&!(o.status==='aberta'&&dataEf(o)<C.ini)).sort((a,b)=>dataEf(b).localeCompare(dataEf(a))).slice(0,6):[];
  const pendDia=d=>vis.filter(o=>o.status==='aberta'&&L.includes(o.linha)&&ateIni(o)===d).reduce((a,o)=>a+Math.max(0,o.total-entregueDe(o)),0);
  const dLab=s=>{ const d=new Date(s+'T12:00:00'), fe=typeof feriadoDe==='function'?feriadoDe(s):null; return DIAS_CAL[d.getDay()]+' <span class="num">'+dm(s)+'</span>'+(fe?'<small class="cal-fer">Feriado · '+esc(fe.nome)+'</small>':''); };
  const semLab=()=>{ const a=new Date(C.ini+'T12:00:00'), b=new Date(addDias(C.ini,nd-1)+'T12:00:00'); return a.getDate()+(a.getMonth()!==b.getMonth()?' de '+a.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''):'')+' a '+b.getDate()+' de '+b.toLocaleDateString('pt-BR',{month:'long'}); };
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Calendário</h1><div class="sub">${calRO()?'Consulta da programação — só visualização.':'Arraste a ordem para outro dia ou outra linha, ou solte em cima de outra ordem para montar a sequência de produção do dia. No celular, toque na ordem para mover.'}</div></div>
   <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="cal-html" style="height:42px" title="Baixa um arquivo HTML da semana que abre em qualquer navegador, sem login e sem poder alterar">${ic('baixar',18,2)}Baixar calendário</button>${repBtn()}${calRO()?'':`<button class="btn sec" data-act="fp-abrir" style="height:42px">${ic('folha',18,2)}Folhas do dia</button>`}</div></div>
  ${S.fp.aberto?fpPainel():''}
  ${sel?movePainel(sel):''}
  ${S.pv.f&&!calRO()?prevForm():''}
  <section class="card caltool">
   <div class="r1"><button class="btn sec" data-act="c-sem" data-v="-7" aria-label="Semana anterior" style="height:40px;padding:0 14px">‹</button><span class="sem num">${esc(semLab())}</span><button class="btn sec" data-act="c-sem" data-v="7" aria-label="Próxima semana" style="height:40px;padding:0 14px">›</button>
    <button class="chip" data-act="c-hoje" aria-pressed="${C.ini===segundaStr(new Date())}">Esta semana</button>
    <label class="sub" style="margin:0 0 0 auto;display:flex;align-items:center;gap:8px;font-size:13px">Ir para <input type="date" class="txt" id="c-data" value="${esc(C.ini)}" style="width:auto" aria-label="Ir para a semana da data"></label></div>
   <div class="r2"><span class="label">LINHA</span>${['todas',...LT].map(l=>`<button class="chip" data-act="c-linha" data-v="${esc(l)}" aria-pressed="${C.linha===l}">${l==='todas'?'Todas':esc(l)}</button>`).join('')}</div>
   <div class="r2"><span class="label">ORDEM</span><input class="txt" id="c-busca" type="search" placeholder="Nº da ordem, código ou produto" value="${esc(C.busca||'')}" style="max-width:300px" aria-label="Buscar ordem ou produto">
    ${q?`<span class="sub num" style="margin:0;font-size:13px">${naSemana} nesta semana${atras.length?' · '+atras.length+' atrasada'+(atras.length===1?'':'s'):''}</span><button class="lnk" data-act="c-limpar">Limpar</button>`:''}
    <span style="flex:1"></span><button class="chip" data-act="c-atras" aria-pressed="${!!C.soAtras}" style="${atras.length&&!C.soAtras?'border-color:var(--crit);color:var(--crit-ink)':''}">${ic('relogio',14,2)} Atrasadas (${atras.length})</button><button class="chip" data-act="c-sab" aria-pressed="${!!C.sab}">Sábado</button><button class="chip" data-act="c-fech" aria-pressed="${!!C.fech}">Mostrar encerradas</button></div>
   ${fora.length?`<div class="chips" style="gap:6px"><span class="sub" style="margin:0;font-size:12px">Também em outras semanas:</span>${fora.map(o=>`<button class="chip" data-act="c-ir" data-v="${esc(dataEf(o))}" style="height:30px;font-size:12px">Ordem ${esc(o.num)} · ${dm(dataEf(o))} ›</button>`).join('')}</div>`:''}
  </section>
  ${C.soAtras?`<section class="card"><div class="head" style="align-items:baseline"><div class="label">ORDENS ATRASADAS (${atras.length}) · QUALQUER DATA</div><button class="lnk" data-act="c-atras">Voltar ao calendário</button></div>
   ${atras.length?L.filter(l=>atras.some(o=>o.linha===l)).map(l=>`<div style="margin-top:12px"><b style="font-size:13px">${esc(l)}</b><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-top:6px">${atras.filter(o=>o.linha===l).map(o=>calCard(o)).join('')}</div></div>`).join(''):'<div class="empty">Nenhuma ordem atrasada.</div>'}
   <div class="sub" style="font-size:12px;margin-top:10px">Toque em uma ordem para mudar o dia ou a linha.</div></section>`:window.innerWidth<700?`<div class="cal-lst">${dias.map(d=>{
     const doDia=l=>(d===h?atras.filter(o=>o.linha===l&&(C.fech||o.status==='aberta')&&!vis.some(v=>v._id===o._id&&dataEf(v)===d)):[]).concat(vis.filter(o=>o.linha===l&&dataEf(o)===d&&!(o.status==='aberta'&&dataEf(o)<h&&dias.includes(h)))).concat(prevAtivas().filter(p=>p.linha===l&&(p.data===d||(d===h&&p.data<h)))).sort(seqCmp);
     const ls=L.filter(l=>doDia(l).length), p=pendDia(d);
     return `<section class="card ${d===h?'cal-hj':''}"><div class="head" style="align-items:baseline;margin-bottom:6px"><h2 style="font-size:17px">${dLab(d)}${d===h?' <span class="pill teal">hoje</span>':''}</h2>${p?`<span class="sub num" style="margin:0">${f0(p)} pendente</span>`:''}</div>
       ${ls.length?ls.map(l=>`<div class="label" style="margin:10px 0 6px">${esc(l)}</div><div class="cal-lg">${doDia(l).map(o=>o._pv?prevCard(o,0):calCard(o,0)).join('')}</div>`).join(''):'<div class="sub" style="margin:0">Nada programado.</div>'}</section>`; }).join('')}</div>`:`
  <div class="calwrap">
   <div class="calscroll ${calRO()?'calro':''}"><div class="calgrid" style="grid-template-columns:${cols}">
    <div class="ch ch0"></div>${dias.map(d=>{ const p=pendDia(d); return `<div class="ch ${d===h?'hoje':''}">${dLab(d)}${p?`<small class="num">${f0(p)} pendente</small>`:''}</div>`; }).join('')}
    ${L.map(l=>{ const cap=capDe(l);
      const cel=(xs,d,extra)=>{ const pend=xs.filter(o=>o.status==='aberta').reduce((a,o)=>a+Math.max(0,o.total-entregueDe(o)),0); const over=cap&&pend>cap&&!extra;
        const pvs=extra?[]:prevAtivas().filter(p=>p.linha===l&&(p.data===d||(d===h&&p.data<h)));
        xs=xs.concat(pvs).sort(seqCmp); const nab=xs.filter(o=>o._pv||o.status==='aberta').length; let k=0;
        return `<div class="cc ${d===h?'hoje':''} ${extra?'atr':''}" ${extra?'':`data-drop-l="${esc(l)}" data-drop-d="${d}"`}>${xs.map(o=>o._pv?prevCard(o,nab>1?++k:0):calCard(o,nab>1&&o.status==='aberta'?++k:0)).join('')}${extra?'':calContDe(l,d,vis).map(o=>calCont(o,d,C.sab)).join('')}${extra||calRO()?'':`<button class="cadd" data-act="pv-nova-cal" data-l="${esc(l)}" data-d="${d}" title="Incluir uma previsão (planejada, ainda sem ordem) na ${esc(l)} em ${dm(d)}">+ planejar</button>`}${pend?(()=>{ const cr=extra?0:capRealMemo(l); const ar=!over&&cr&&pend>cr*1.02; return `<div class="cfoot num ${over?'over':''} ${ar?'acreal':''}" ${ar?`title="Acima do que a linha tem feito: ${f0(cr)} por dia (média dos melhores dias de linha cheia)"`:''}>${f0(pend)}${cap&&!extra?' / '+f0(cap):''}${ar?`<em>acima do real (${f0(cr)})</em>`:''}</div>`; })():''}${extra?'':corCal(l,d)}</div>`; };
      return `<div class="cl"><b>${esc(l)}</b>${cap?`<small class="num">${f0(cap)}/dia${capRealMemo(l)?' · faz '+f0(capRealMemo(l)):''}</small>`:''}</div>${dias.map(d=>cel((d===h?atras.filter(o=>o.linha===l&&(C.fech||o.status==='aberta')&&!vis.some(v=>v._id===o._id&&dataEf(v)===d)):[]).concat(vis.filter(o=>o.linha===l&&dataEf(o)===d&&!(o.status==='aberta'&&dataEf(o)<h&&dias.includes(h)))),d,false)).join('')}`; }).join('')}
   </div></div>
  </div>`}`;
}
function estPlain(o,dia0){ const e=(S._est||{})[seqId(o)]; if(!e) return ''; const di=Math.floor(e.ini/1440), df=Math.floor(e.fim/1440); const dt=n=>n<=0?'':dm(addDias(e.dia,n))+' '; const ps=expediente(), fimDia=ps[ps.length-1][1], iniDia=ps[0][0];
  if(di===df) return dt(di)+minHora(e.ini%1440)+' → '+minHora(e.fim%1440); return dt(di)+minHora(e.ini%1440)+' → '+minHora(fimDia)+' · continua '+dt(df)+(df-di>1?'até ':minHora(iniDia)+' → ')+minHora(e.fim%1440); }
async function calHtml(){ const C=S.cal; if(!C.ini) C.ini=segundaStr(new Date()); S._est={}; linhasOrd().forEach(l=>Object.assign(S._est,estimarLinha(l)));
  const nd=C.sab?6:5, dias=[...Array(nd)].map((_,i)=>addDias(C.ini,i)), h=hojeStr(), L=linhasOrd();
  const vis=ordAbertas(); const antes=vis.filter(o=>dataEf(o)<C.ini&&dataEf(o)<h);
  const E=x=>String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const DL=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const itensCel=(l,d)=>{ let xs=vis.filter(o=>o.linha===l&&ateIni(o)===d&&!(dataEf(o)<h&&!dias.includes(h))); if(d===h) xs=xs.concat(antes.filter(o=>o.linha===l)); return xs.concat(prevAtivas().filter(p=>p.linha===l&&(p.data===d||(d===h&&p.data<h)))).sort(seqCmp); };
  const pendDe=o=>o._pv?(+o.qtd||0):Math.max(0,o.total-entregueDe(o));
  const card=(o,k)=>{ const est=estPlain(o); const hora=est?`<span class="hr" title="Estimativa pela capacidade da linha">${E(est)}</span>`:'';
    if(o._pv) return `<div class="c pv" data-q="${E(buscaNorm([o.codigo,o.produto].join(' ')))}"><div class="c1">${k?`<span class="sq">${k}</span>`:''}<b class="cd">${E(o.codigo||'—')}</b><span class="q">${f0(o.qtd||0)}</span></div><div class="nm">${E(nomeCurto({produto:o.produto}))}</div><div class="mt"><span class="tg">sem nº de ordem</span>${hora}</div></div>`;
    const e=entregueDe(o), pen=Math.max(0,o.total-e), atr=ordAtras(o,h), pct=o.total>0?Math.min(100,e/o.total*100):0;
    return `<div class="c${atr?' at':''}" data-q="${E(buscaNorm([o.num,o.produto,o.ensaca].join(' ')))}"><div class="c1">${k?`<span class="sq">${k}</span>`:''}<b class="cd">${E(codigoDe(o))}</b><span class="q">${f0(e?pen:o.total)}<small>${E(uA(o))}${e?' faltam':''}</small></span></div>
     <div class="nm">${E(nomeCurto(o))}</div>
     <div class="mt"><span>Ordem ${E(o.num)}</span>${o.ensaca?`<span>ensaca ${E(o.ensaca)}</span>`:''}${o.turno&&o.turno!=='Dia todo'?`<span>${E(o.turno)}</span>`:''}${atr?`<span class="tg at">atrasada · ${dm(dataEf(o))}</span>`:''}${hora}</div>${e?`<div class="pb"><i style="width:${pct}%"></i></div>`:''}</div>`; };
  const cel=(l,d,di)=>{ const xs=itensCel(l,d); let k=0; const n=xs.length, pend=xs.reduce((a,o)=>a+pendDe(o),0), cap=capDe(l);
    const uso=cap?Math.min(100,pend/cap*100):0, over=cap&&pend>cap;
    return `<td class="${d===h?'hj':''}${n?'':' vz'}" data-di="${di}"><div class="dm">${DL[new Date(d+'T12:00:00').getDay()]} ${dm(d)}</div>${n?xs.map(o=>card(o,n>1?++k:0)).join(''):'<div class="nada">—</div>'}
      ${pend?`<div class="cap${over?' ov':''}">${cap?`<div class="cb"><i style="width:${uso}%"></i></div>`:''}<span>${f0(pend)}${cap?` de ${f0(cap)}`:''}</span></div>`:''}</td>`; };
  const tot=dias.map(d=>L.reduce((a,l)=>a+itensCel(l,d).reduce((b,o)=>b+pendDe(o),0),0));
  const nOrd=new Set(), nAt=new Set(); let nPv=0; L.forEach(l=>dias.forEach(d=>itensCel(l,d).forEach(o=>{ if(o._pv) nPv++; else { nOrd.add(o._id); if(dataEf(o)<h) nAt.add(o._id); } })));
  const linhasCom=L.filter(l=>dias.some(d=>itensCel(l,d).length)); const LS=linhasCom.length?linhasCom:L;
  const agora=new Date(); const semTxt=dm(C.ini)+' a '+dm(dias[nd-1]); const fotoTxt=dm(hojeStr(agora))+' às '+hora(agora.toISOString());
  const tit='Programação da produção · '+semTxt+' · emitido '+fotoTxt;
  const logo=(document.querySelector('.brand img')||{}).src||''; const hi=dias.indexOf(h);
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(tit)}</title><style>
:root{--bg:#F5F1E8;--sf:#FFFFFF;--sf2:#F7F4EC;--sk:#ECE6D8;--ink:#1A1A1A;--ink2:#4A463D;--mu:#6B6558;--fa:#B3AB99;--ln:#E5DFD0;--ln2:#F0EBE1;--tl:#1B5C7A;--tls:#143F54;--tlt:#E3ECF0;--tlw:#EEF4F6;--cr:#C0665D;--cri:#A2453D;--crt:#F4E1DE;--ok:#6A9C7E;--wn:#8A6326;--wnt:#F5ECD6;--am:#C99A3E}
@media (prefers-color-scheme:dark){:root{--bg:#15191B;--sf:#1E2427;--sf2:#232A2E;--sk:#2A3237;--ink:#EEF1F2;--ink2:#CBD3D6;--mu:#9FAAAF;--fa:#6E7A80;--ln:#333C41;--ln2:#2B3337;--tl:#5FA3C2;--tls:#8CC2DA;--tlt:#23343D;--tlw:#1F3039;--cr:#C9736A;--cri:#E59C94;--crt:#3A2422;--ok:#6FA585;--wn:#E1C07E;--wnt:#352D1C;--am:#DDB064;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;font:14px/1.4 "Segoe UI",system-ui,-apple-system,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
.num,.q,.cap,.hr,.dh small{font-variant-numeric:tabular-nums}
header{display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:18px 24px;background:var(--sf);border-bottom:1px solid var(--ln);box-shadow:inset 0 4px 0 var(--tls)}
.lo{display:flex;align-items:center;gap:18px;padding-right:20px;border-right:1px solid var(--ln);align-self:stretch}.lo img{height:32px;width:auto;border-radius:4px;background:#fff;padding:2px 4px}
.ti{flex:1;min-width:220px}.ti .ey{font-size:11px;font-weight:700;letter-spacing:.16em;color:var(--tl)}.ti h1{margin:3px 0 0;font-size:24px;line-height:1.15;letter-spacing:-.01em}.ti h1 span{font-weight:400;color:var(--mu)}
.ti p{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0 0;font-size:12.5px;color:var(--mu)}.ti p b{color:var(--ink);font-weight:700}.ti p .em::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ok);margin-right:6px;vertical-align:1px}
.kp{display:flex;border:1px solid var(--ln);border-radius:12px;overflow:hidden;background:var(--sf2)}.kp div{padding:8px 18px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);text-align:center}.kp div+div{border-left:1px solid var(--ln)}.kp b{display:block;font-size:22px;line-height:1.1;letter-spacing:0;color:var(--ink);font-variant-numeric:tabular-nums}.kp .a b{color:var(--cri)}
.pr{height:44px;padding:0 18px;border-radius:10px;border:0;background:var(--tls);color:#fff;font:700 13.5px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px}.pr:hover{background:var(--tl)}
.fl{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;padding:12px 20px}
.fl input[type=search]{flex:1 1 220px;max-width:340px;height:38px;padding:0 12px;border:1.5px solid var(--ln);border-radius:10px;font:inherit;background:var(--sf);color:inherit}
.g{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.g>span{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);margin-right:2px}
.ch{height:32px;padding:0 12px;border-radius:999px;border:1.5px solid var(--ln);background:var(--sf);color:var(--ink2);font:600 12.5px/1 inherit;cursor:pointer;white-space:nowrap}.ch:hover{border-color:var(--tl)}.ch.on{background:var(--tls);border-color:var(--tls);color:#fff}
.ck{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}.ck input{width:16px;height:16px;accent-color:var(--tl)}.n{font-size:12.5px;font-weight:700;color:var(--tls)}
.lg{display:flex;flex-wrap:wrap;gap:14px;padding:0 20px 10px;font-size:12px;color:var(--mu)}.lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.w{overflow-x:auto;padding:0 20px 20px}
table{border-collapse:separate;border-spacing:0;background:var(--sf);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);width:100%;min-width:${150+nd*190}px;table-layout:fixed}
th,td{border-right:1px solid var(--ln2);border-bottom:1px solid var(--ln2);vertical-align:top;padding:8px;text-align:left}
thead th{position:sticky;top:0;z-index:2;background:var(--sf);padding:10px}
.dh{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}.dh span{font-weight:600;letter-spacing:0}.dh small{display:block;margin-top:2px;font-size:11.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mu)}
.dh em{font-style:normal;margin-left:6px;padding:1px 6px;border-radius:999px;background:var(--tl);color:#fff;font-size:9.5px;letter-spacing:.08em;vertical-align:1px}
thead th.hj .dh{color:var(--tls)}thead th.hj{box-shadow:inset 0 -3px 0 var(--tl)}
th.l{position:sticky;left:0;z-index:1;width:150px;background:var(--sf2);font-size:14px}th.l small{display:block;margin-top:2px;font-weight:500;font-size:11.5px;color:var(--mu)}thead th.l{z-index:3}
td.hj{background:var(--tlw)}td.vz .nada{color:var(--fa);text-align:center;padding:10px 0}.dm{display:none}
.c{position:relative;padding:7px 9px 8px;border:1px solid var(--ln);border-radius:9px;margin-bottom:7px;background:var(--sf);break-inside:avoid;transition:box-shadow .12s}.c:hover{box-shadow:0 3px 10px rgba(0,0,0,.08)}
.c1{display:flex;align-items:baseline;gap:6px}.sq{flex-shrink:0;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--tlt);color:var(--tls);font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;align-self:center}
.cd{font-size:13px;letter-spacing:.02em}.q{margin-left:auto;font-size:14px;font-weight:700;white-space:nowrap}.q small{font-size:10.5px;font-weight:600;color:var(--mu);margin-left:3px}
.nm{margin-top:2px;font-size:12px;color:var(--ink2);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mt{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:5px;font-size:11px;color:var(--mu)}.hr{color:var(--tls);font-weight:700}.hr::before{content:"◷ ";font-weight:400}
.tg{font-weight:700;color:var(--wn)}.tg.at{color:var(--cri)}
.c.at{border-color:transparent;background:var(--crt);box-shadow:inset 3px 0 0 var(--cr)}.c.pv{border-style:dashed;background:transparent}
.pb{height:4px;border-radius:2px;background:var(--sk);margin-top:6px;overflow:hidden}.pb i{display:block;height:100%;background:var(--ok)}
.cap{display:flex;align-items:center;gap:8px;margin-top:2px;font-size:11.5px;font-weight:700;color:var(--mu)}.cap span{margin-left:auto;white-space:nowrap}.cb{flex:1;height:5px;border-radius:3px;background:var(--sk);overflow:hidden}.cb i{display:block;height:100%;background:var(--tl)}.cap.ov{color:var(--cri)}.cap.ov .cb i{background:var(--cr)}
footer{padding:0 20px 24px;color:var(--mu);font-size:12px}
@media (max-width:760px){
 header{padding:14px 16px;gap:12px}.lo{border:0;padding:0;align-self:auto}.lo img{height:26px}.ti{flex-basis:100%}.ti h1{font-size:20px}.kp{flex:1}.kp div{flex:1;padding:6px 10px}.kp div{padding:5px 10px}.kp b{font-size:16px}.pr{display:none}
 .fl{padding:10px 16px}.fl input[type=search]{max-width:none}.g{flex-wrap:nowrap;overflow-x:auto;max-width:100%;padding-bottom:2px}.lg{padding:0 16px 8px}
 .w{padding:0 16px 16px;overflow:visible}table,tbody,tr{display:block;min-width:0!important;width:100%;background:transparent;box-shadow:none}thead{display:none}
 tr{margin-bottom:14px;background:var(--sf);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden}
 th.l{display:block;position:static;width:auto;padding:10px 12px;border:0;border-bottom:1px solid var(--ln2)}td{display:block;border:0;border-bottom:1px solid var(--ln2);padding:8px 12px}td.hj{background:transparent}
 .dm{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin:2px 0 6px}td.hj .dm{color:var(--tls)}td.vz{padding:6px 12px}td.vz .nada{display:inline;padding:0;margin-left:6px}td.vz .dm{display:inline}
}
@media print{
 @page{size:A4 landscape;margin:8mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
 body{background:#fff;color:#111;font-size:9px}header{padding:0 0 6px;box-shadow:none;border-bottom:2px solid #143F54}header .lo img{height:22px}.lo{padding-right:10px}.kp div{padding:2px 10px}.ti h1{font-size:15px}.ti .ey{font-size:8px}.ti p{font-size:8.5px}
 .kp div{padding:2px 8px;background:none;border:1px solid #ccc;font-size:8px}.kp b{font-size:12px}
 .fl,.pr,.lg{display:none!important}.w{padding:0;overflow:visible}
 table{min-width:0!important;box-shadow:none;border:1px solid #ccc;border-radius:0}thead{display:table-header-group}thead th{position:static;padding:4px 5px}th.l{position:static;width:90px;font-size:9.5px}table,thead,tbody{display:block}tr{display:grid;grid-template-columns:90px repeat(${nd},minmax(0,1fr));break-inside:auto}thead tr{border-bottom:1px solid #ccc}td,th{display:block;break-inside:auto}.c{break-inside:avoid}
 th,td{padding:4px 5px;border-color:#ddd!important}.dh{font-size:9px}.dh small{font-size:8px}
 .c{margin-bottom:3px;padding:3px 5px;border-radius:4px;border-color:#ddd}.cd{font-size:9.5px}.q{font-size:10px}.q small,.sq{font-size:7.5px}.sq{min-width:13px;height:13px}.nm{font-size:8px;margin-top:0}.mt{font-size:7.5px;margin-top:1px}.pb{display:none}.cap{font-size:8px}
 td.hj,thead th.hj{background:#EEF5F8!important}.c.at{background:#FBEDEA!important}footer{padding:4px 0 0;font-size:8px}
}
</style></head><body>
<header>${logo?`<div class="lo"><img src="${logo}" alt="Colafix"></div>`:''}<div class="ti"><div class="ey">PROGRAMAÇÃO DA PRODUÇÃO</div><h1>Semana <span>${E(semTxt)}</span></h1><p><span class="em">Emitido em <b>${fotoTxt}</b></span><span>Só consulta</span><span>Horários estimados pela capacidade da linha</span></p></div>
<div class="kp"><div><b class="num">${nOrd.size}</b>ordens</div>${nAt.size?`<div class="a"><b class="num">${nAt.size}</b>atrasadas</div>`:''}${nPv?`<div><b class="num">${nPv}</b>sem nº</div>`:''}</div><button class="pr" onclick="window.print()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>Imprimir</button></header>
<div class="fl"><input id="q" type="search" placeholder="Buscar ordem, código ou produto" autocomplete="off">
<div class="g"><span>Dia</span><button class="ch" data-d="*">Semana</button>${dias.map((d,i)=>`<button class="ch" data-d="${i}">${d===h?'Hoje':DIAS_CAL[new Date(d+'T12:00:00').getDay()]} ${dm(d)}</button>`).join('')}</div>
<div class="g"><span>Linha</span><button class="ch" data-l="*">Todas</button>${LS.map(l=>`<button class="ch" data-l="${E(l)}">${E(l)}</button>`).join('')}</div>
<label class="ck"><input type="checkbox" id="at"> Só atrasadas</label><span id="n" class="n"></span></div>
<div class="lg"><span><i style="background:var(--crt);box-shadow:inset 3px 0 0 var(--cr)"></i>Atrasada</span><span><i style="border:1.5px dashed var(--fa)"></i>Programação sem nº de ordem</span><span><i style="background:var(--tlw);border:1px solid var(--tl)"></i>Hoje</span><span>1, 2, 3… sequência no dia · barra = uso da capacidade da linha</span></div>
<div class="w"><table><thead><tr><th class="l"></th>${dias.map((d,i)=>`<th class="${d===h?'hj':''}" data-di="${i}"><div class="dh">${DIAS_CAL[new Date(d+'T12:00:00').getDay()]} <span>${dm(d)}</span>${d===h?'<em>HOJE</em>':''}${tot[i]?`<small>${f0(tot[i])} a produzir</small>`:''}</div></th>`).join('')}</tr></thead><tbody>
${LS.map(l=>`<tr data-l="${E(l)}"><th class="l">${E(l)}${capDe(l)?`<small>${f0(capDe(l))} por dia</small>`:''}</th>${dias.map((d,i)=>cel(l,d,i)).join('')}</tr>`).join('')}</tbody></table></div>
<footer>Emitido em ${fotoTxt}. Ordens atrasadas aparecem no dia de hoje. Para ver mudanças feitas depois desse horário, peça um arquivo novo.</footer>
<script>
(function(){ var L0=${JSON.stringify(C.linha&&C.linha!=='todas'?C.linha:'*')}, sl=new Set(L0==='*'?[]:[L0]), hi=${hi}, mob=window.matchMedia('(max-width:760px)');
 var sd=mob.matches?String(hi>=0?hi:0):'*';
 function norm(t){ return String(t||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase(); }
 function ap(){ var q=norm(document.getElementById('q').value).split(/\\s+/).filter(Boolean), at=document.getElementById('at').checked, n=0;
  document.querySelectorAll('.c').forEach(function(c){ var ok=q.every(function(t){ return c.dataset.q.indexOf(t)>=0; })&&(!at||c.classList.contains('at')); c.style.display=ok?'':'none'; });
  document.querySelectorAll('tbody tr').forEach(function(tr){ var vl=!sl.size||sl.has(tr.dataset.l), tem=false;
   tr.querySelectorAll('td').forEach(function(td){ var vd=sd==='*'||td.dataset.di===sd; td.style.display=vd?'':'none'; var vis=0; td.querySelectorAll('.c').forEach(function(c){ if(c.style.display!=='none') vis++; }); if(vd&&vl){ n+=vis; if(vis) tem=true; }
    var f=td.querySelector('.cap'); if(f) f.style.display=(q.length||at)?'none':''; var z=td.querySelector('.nada'); if(z) z.style.display=(q.length||at)?'none':''; });
   tr.style.display=vl&&(tem||!(q.length||at))?'':'none'; });
  document.querySelectorAll('thead th[data-di]').forEach(function(th){ th.style.display=sd==='*'||th.dataset.di===sd?'':'none'; });
  document.querySelector('table').style.minWidth=sd==='*'?'':'0';
  document.querySelectorAll('.ch[data-l]').forEach(function(b){ b.classList.toggle('on',b.dataset.l==='*'?!sl.size:sl.has(b.dataset.l)); });
  document.querySelectorAll('.ch[data-d]').forEach(function(b){ b.classList.toggle('on',b.dataset.d===sd); });
  document.getElementById('n').textContent=n+(n===1?' item':' itens'); }
 document.addEventListener('click',function(e){ var b=e.target.closest('.ch'); if(!b) return; if(b.dataset.l){ var l=b.dataset.l; if(l==='*') sl.clear(); else if(sl.has(l)) sl.delete(l); else sl.add(l); } if(b.dataset.d) sd=b.dataset.d; ap(); });
 document.getElementById('q').addEventListener('input',ap); document.getElementById('at').addEventListener('change',ap);
 var salvo=null; window.addEventListener('beforeprint',function(){ salvo=sd; sd='*'; ap(); }); window.addEventListener('afterprint',function(){ if(salvo!==null){ sd=salvo; salvo=null; ap(); } });
 ap(); })();
<\/script></body></html>`;
  const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  try{ await dl.save({filename:'Calendario_producao_'+C.ini.split('-').reverse().slice(0,2).join('-')+'.html',data:new Blob([html],{type:'text/html'})}); toast('Calendário baixado. Envie o arquivo — abre em qualquer navegador, sem login.'); }catch(e){ if(!e||e.code!=='declined') toast('Não foi possível baixar o arquivo.'); } }
function cestTxt(o){ const e=(S._est||{})[seqId(o)]; if(!e) return ''; const di=Math.floor(e.ini/1440), df=Math.floor(e.fim/1440); const dt=n=>n<=0?'':dm(addDias(e.dia,n)); const ps=expediente(), fimDia=ps[ps.length-1][1], iniDia=ps[0][0];
  if(di===df) return `<small class="cest num ${e.passa?'passa':''}" title="Previsão pela capacidade e horário de funcionamento">${ic('relogio',11,2.2)}${di?`<em>${dt(di)}</em> `:''}${minHora(e.ini%1440)} → ${minHora(e.fim%1440)}</small>`;
  return `<small class="cest num passa" title="Para às ${minHora(fimDia)} (fim do expediente) e continua no dia seguinte">${ic('relogio',11,2.2)}${di?`<em>${dt(di)}</em> `:''}${minHora(e.ini%1440)} → ${minHora(fimDia)}</small><small class="cest num passa" style="margin-top:0">${ic('relogio',11,2.2)}<em>${dt(df)}</em> ${df-di>1?'até':minHora(iniDia)+' →'} ${minHora(e.fim%1440)}</small>`; }
function prevCard(p,pos){ return `<div class="ccard prev" draggable="true" data-card="pv:${esc(p._id)}" data-go="aprogramar" role="button" tabindex="0" title="Programação sem número: ${esc(p.produto)}">${pos?`<span class="cpos num">${pos}º</span>`:''}<b>${esc(p.codigo||'')}</b> <span class="cn">${esc(nomeCurto({produto:p.produto}))}</span><small class="num">sem nº · ${f0(p.qtd||0)}</small>${cestTxt({_pv:true,_id:p._id})}${calRO()?'':`<button class="pvcp" data-act="pv-copiar" data-id="${esc(p._id)}" title="Copiar esta previsão">${ic('copiar',12,2)} copiar</button><button class="pvcp pvdel" data-act="pv-excluir" data-id="${esc(p._id)}" title="Apagar esta previsão (pede confirmação)">apagar</button>`}</div>`; }
function calCard(o,pos){ const e=entregueDe(o), si=stInfo(o,e), pen=Math.max(0,o.total-e), ab=o.status==='aberta'; const cimF=S._faltaId===o._id;
  return `<div class="ccard st-${si.c} ${S.cal.sel===o._id?'sel':''} ${ab?'':'fech'}" ${ab?`draggable="true" data-card="${esc(o._id)}"`:''} data-act="c-sel" data-id="${esc(o._id)}" role="button" tabindex="0" title="${esc(o.produto)} · ${esc(si.t)}">
   ${cimF?'<span class="cimtag">cimento acaba aqui</span>':''}${pos?`<span class="cpos num" title="Sequência de produção no dia">${pos}º</span>`:''}${ab&&ordAtras(o)?`<span style="float:right;color:var(--crit-ink);display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:700" title="Atrasada desde ${dm(dataEf(o))}">${ic('relogio',12,2.2)}${dm(dataEf(o))}</span>`:''}<b>${esc(codigoDe(o))}</b> <span class="cn">${esc(nomeCurto(o))}</span>
   <small class="num">${esc(o.num)} · ${ab?(e?'falta '+f0(pen):f0(o.total))+' '+uA(o):esc(si.t)}${o.turno&&o.turno!=='Dia todo'?' · '+esc(o.turno):''}</small>
   ${ab?cestTxt(o):''}
   ${e&&ab?`<span class="bar" style="display:block;height:4px;margin-top:4px"><i style="width:${Math.min(100,e/o.total*100)}%"></i></span>`:''}</div>`; }
function ateIni(o){ const h=hojeStr(), d=dataEf(o); return o.status==='aberta'&&d&&d<h?h:d; }
function calDiasUteis(a,b,sab){ const r=[]; let d=a; for(let i=0;i<120&&d<=b;i++){ const w=new Date(d+'T12:00:00').getDay(); if(w!==0&&(w!==6||sab)) r.push(d); d=addDias(d,1); } return r; }
function calContDe(l,d,vis){ return vis.filter(o=>o.linha===l&&o.ate&&o.ate>=d&&ateIni(o)<d); }
function calCont(o,d,sab){ const ds=calDiasUteis(ateIni(o),o.ate,sab), i=ds.indexOf(d); const lab=i>=0?'continua · dia '+(i+1)+' de '+ds.length:'continua';
  return calCard(o,0).replace('draggable="true"','').replace('class="ccard','class="ccard ccont').replace('<b>','<span class="ccontl">↳ '+lab+'</span><b>'); }
function seqId(x){ return x._pv?'pv:'+x._id:x._id; }
function itemSeq(id){ return String(id).startsWith('pv:')?(S.previsoes||[]).find(p=>p._id===id.slice(3)):ordById(id); }
function irmasCal(o){ const h=hojeStr(), k=x=>{ const d=dataEf(x); return d<h?h:d; }; return ordAbertas().concat(prevAtivas()).filter(x=>x.linha===o.linha&&k(x)===k(o)).sort(seqCmp); }
function moverPara(id,pos){ const o=itemSeq(id); if(!o) return; const l=irmasCal(o).map(seqId), i=l.indexOf(id); if(i<0) return; const j=Math.max(0,Math.min(l.length-1,pos-1)); if(j===i){ render(); return; } l.splice(i,1); l.splice(j,0,id); reordenarCal(id,o.linha,null,true,l); }
function moverSeq(id,dir){ const o=itemSeq(id); if(!o) return; const l=irmasCal(o).map(seqId), i=l.indexOf(id), j=i+dir; if(i<0||j<0||j>=l.length) return; l.splice(i,1); l.splice(j,0,id); reordenarCal(id,o.linha,null,true,l); }
function movePainel(o){ const C=S.cal, e=entregueDe(o); const d=C.md||dataEf(o)||hojeStr(), l=C.ml||o.linha||'';
  return `<section class="card" style="border:1.5px solid var(--teal);padding:16px 20px">
  <div class="head" style="align-items:baseline"><div><b>Ordem ${esc(o.num)}</b> <span class="sub" style="display:inline">· ${esc(o.produto)}</span></div><button class="lnk" data-act="c-fechar">Fechar</button></div>
  <div class="sub num" style="margin:4px 0 12px">${o.linha?`${esc(o.linha)} · ${dmTxt(dataEf(o))}`:'Na fila, sem linha'} · total ${f0(o.total)}${e?` · entregue ${fq(e)}`:''}</div>
  ${o.status==='aberta'?`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
   <label style="display:flex;flex-direction:column;gap:4px"><span class="sub" style="margin:0;font-size:12px">Linha</span><select class="txt" id="c-ml" style="width:180px">${linhasOrd().map(x=>`<option ${x===l?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
   <label style="display:flex;flex-direction:column;gap:4px"><span class="sub" style="margin:0;font-size:12px">Dia</span><input type="date" class="txt" id="c-md" value="${esc(d)}" style="width:180px"></label>
   <button class="btn" data-act="c-mover" data-id="${esc(o._id)}" style="height:46px">${ic('check',18,2.2)}Mover</button>
   <label style="display:flex;flex-direction:column;gap:4px"><span class="sub" style="margin:0;font-size:12px">Produz até <small>(vários dias)</small></span><span style="display:flex;gap:6px"><input type="date" class="txt" id="c-ate" value="${esc(o.ate||'')}" min="${esc(ateIni(o))}" style="width:170px"><button class="btn sec" data-act="c-ate" data-id="${esc(o._id)}" style="height:46px">Salvar</button>${o.ate?`<button class="lnk" data-act="c-ate-x" data-id="${esc(o._id)}">tirar</button>`:''}</span></label>
   ${(()=>{ const sib=irmasCal(o); if(sib.length<2) return ''; const i=sib.findIndex(x=>x._id===o._id); return `<span style="display:inline-flex;gap:6px;align-items:center"><span class="sub" style="margin:0;font-size:12px">Sequência ${i+1}º de ${sib.length}</span><button class="btn sec" data-act="c-seq" data-id="${esc(o._id)}" data-v="-1" ${i===0?'disabled':''} style="height:40px;padding:0 12px">↑ Antes</button><button class="btn sec" data-act="c-seq" data-id="${esc(o._id)}" data-v="1" ${i===sib.length-1?'disabled':''} style="height:40px;padding:0 12px">↓ Depois</button></span>`; })()}
   <button class="lnk" data-act="c-ver" data-id="${esc(o._id)}">Abrir na programação</button><button class="lnk" data-act="fp-ordem" data-id="${esc(o._id)}">Folha (PDF)</button></div>`:`<button class="lnk" data-act="c-ver" data-id="${esc(o._id)}">Abrir na programação</button>`}
  </section>`; }
document.head.insertAdjacentHTML('beforeend','<style>.cal-lst .cal-lg{display:grid;gap:8px}.cal-lst .cal-hj{border:1.5px solid var(--teal)}.cal-fer{display:block;font-size:11.5px;font-weight:700;color:var(--warn-ink,#7A5410)}</style>');
{ let w0=window.innerWidth; window.addEventListener('resize',()=>{ const w=window.innerWidth; if((w<700)!==(w0<700)&&S.view==='calendario'&&typeof calRO==='function'&&calRO()) { w0=w; try{ rerenderSeguro(); }catch(e){} } else w0=w; }); }

/* Ajustes separados por assunto (pedido de 13/10): as seções continuam na mesma tela (o "Salvar ajustes" lê todos os campos),
   só mostramos as do assunto escolhido. Seção nova sem assunto conhecido cai em "Outros". */
const AJ_GRUPOS=[['prod','Produção',/Sequência de cores|Linhas de produção|Motivos de parada|Ordens de produção/],['silos','Silos e cimento',/Silos e capacidades|Produtos|Limites de cor|WhatsApp/],
  ['almox','Almoxarifado',/almoxarifado/i],['dados','Backup e dados',/Backup|Trazer os dados/]];
let ajGrupo=(()=>{ try{ return localStorage.getItem('aj-grupo')||'prod'; }catch(e){ return 'prod'; } })();
function ajSeparar(){ if(S.view!=='ajustes') return; const v=document.getElementById('view'); if(!v) return; const abas=v.querySelector(':scope > .chips'); if(!abas) return;
  const secs=[...v.children].filter(e=>e!==abas&&!e.classList.contains('head')&&!e.classList.contains('aj-sub')&&!e.classList.contains('banner'));
  const tem=new Set(); let salvar=null;
  secs.forEach(e=>{ if(e.querySelector('[data-act="aj-salvar"]')&&!e.querySelector('h2')){ salvar=e; return; } const t=(e.querySelector('h2')||{}).innerText||''; const g=(AJ_GRUPOS.find(x=>x[2].test(t))||['outros'])[0]; e.dataset.ajg=g; tem.add(g); });
  if(!tem.has(ajGrupo)) ajGrupo=[...AJ_GRUPOS.map(x=>x[0]),'outros'].find(g=>tem.has(g))||'prod';
  secs.forEach(e=>{ if(e===salvar) e.style.display=['prod','silos','almox'].includes(ajGrupo)?'':'none'; else e.style.display=e.dataset.ajg===ajGrupo?'':'none'; });
  let sub=v.querySelector('.aj-sub'); const html=[...AJ_GRUPOS,['outros','Outros']].filter(g=>tem.has(g[0])).map(([k,l])=>`<button class="chip" data-act="aj-grupo" data-v="${k}" aria-pressed="${ajGrupo===k}">${l}</button>`).join('');
  if(!sub){ sub=document.createElement('div'); sub.className='chips aj-sub'; sub.setAttribute('aria-label','Assunto'); abas.after(sub); }
  if(sub.innerHTML!==html) sub.innerHTML=html; }
{ let pend=false; new MutationObserver(()=>{ if(!pend){ pend=true; requestAnimationFrame(()=>{ pend=false; ajSeparar(); }); } }).observe(document.body,{childList:true,subtree:true}); }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="aj-grupo"]'); if(!b) return; ajGrupo=b.dataset.v; try{ localStorage.setItem('aj-grupo',ajGrupo); }catch(e){} ajSeparar(); });
document.head.insertAdjacentHTML('beforeend','<style>.aj-sub{margin:-6px 0 16px;padding:10px 12px;background:var(--surface);border-radius:12px;border:1px solid var(--line)}.aj-sub .chip{height:36px}</style>');
/* aviso das ordens que continuam de dias anteriores (escondidas do diário) */
{ const _vd=vDiario; vDiario=function(){ let h=_vd.apply(this,arguments); try{ const D=S.dbo, n=D._contN||0; if((!n&&!D.cont)||D.modo==='monitor'||typeof h!=='string') return h;
    const av=`<div class="dbcont">${D.cont?'Mostrando também as ordens que continuam de dias anteriores.':`${n} ${n===1?'ordem continua':'ordens continuam'} de dias anteriores (passou para hoje) e não ${n===1?'aparece':'aparecem'} aqui: o rancho já foi para a linha.`} <button class="lnk" data-act="db-cont">${D.cont?'Esconder':'Mostrar'}</button></div>`;
    const i=h.indexOf('<section'); return i<0?h+av:h.slice(0,i)+av+h.slice(i); }catch(e){ return h; } }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="db-cont"]'); if(!b) return; S.dbo.cont=!S.dbo.cont; render(); });
document.head.insertAdjacentHTML('beforeend','<style id="dbcont-css">.dbcont{font-size:13px;color:var(--muted);background:var(--surface-2);border-radius:10px;padding:8px 12px}.dbcont .lnk{padding:0;margin-left:6px}</style>');
