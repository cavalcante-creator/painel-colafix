/* Painel Colafix · 03-analise.js — análise PCP (previsto × realizado, curva S, base).
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

async function moverOrdem(id,linha,data){ const o=ordById(id); if(!o) return;
  if(o.status!=='aberta'){ toast('Só dá para mover ordens abertas.'); return; }
  if(!linha&&!o.linha){ toast('Escolha a linha.'); return; }
  const u={}, mud=[];
  if(linha&&linha!==o.linha){ u.linha=linha; mud.push(o.linha?o.linha+' → '+linha:'programada na '+linha); }
  if(data&&(data!==dataEf(o)||!o.linha)){
    if(!o.linha||!o.data){ u.data=data; u.continuaEm=null; mud.push('dia '+dm(data)); }
    else if(entregueDe(o)>0&&data>o.data){ u.continuaEm=data; mud.push('continua '+dm(data)); }
    else { u.data=data; u.continuaEm=null; mud.push(dm(dataEf(o))+' → '+dm(data)); }
  }
  if(!mud.length) return;
  if(!o.turno) u.turno='Dia todo';
  u.hist=histAdd(o,(o.linha?'Movida no calendário: ':'Programada no calendário: ')+mud.join(', '));
  Object.assign(o,u); S.cal.sel=null; render();
  await ordUpd(o._id,u,'Ordem '+o.num+': '+mud.join(', '));
}
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="cal-html"]'); if(b) calHtml(); });
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="c-"]'); if(!b||b.disabled) return; const act=b.dataset.act, C=S.cal;
  if(act==='c-sem'){ C.ini=addDias(C.ini,+b.dataset.v); render(); return; }
  if(act==='c-linha'){ C.linha=b.dataset.v; render(); return; }
  if(act==='c-atras'){ C.soAtras=!C.soAtras; render(); return; }
  if(act==='c-limpar'){ C.busca=''; render(); return; }
  if(act==='c-ir'){ C.ini=segundaStr(new Date(b.dataset.v+'T12:00:00')); render(); return; }
  if(act==='c-hoje'){ C.ini=segundaStr(new Date()); render(); return; }
  if(act==='c-sab'){ C.sab=!C.sab; render(); return; }
  if(act==='c-fech'){ C.fech=!C.fech; render(); return; }
  if(calRO()&&['c-seq','c-sel','c-mover','c-ver','c-fechar'].includes(act)) return;
  if(act==='c-seq'){ moverSeq(b.dataset.id,+b.dataset.v); return; }
  if(act==='c-sel'){ C.sel=C.sel===b.dataset.id?null:b.dataset.id; C.md=null; C.ml=null; render(); if(C.sel) window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(act==='c-fechar'){ C.sel=null; render(); return; }
  if(act==='c-ate'||act==='c-ate-x'){ const o=ordById(b.dataset.id); if(!o) return; const v=act==='c-ate-x'?'':String(($('#c-ate')||{}).value||'');
    if(v&&v<=ateIni(o)){ toast('O último dia tem que ser depois de '+dm(ateIni(o))+'.'); return; }
    ordUpd(o._id,{ate:v||null,hist:histAdd(o,v?'Produz até '+dm(v)+' (vários dias)':'Voltou a ser de um dia só')},v?'Ordem '+o.num+' aparece no calendário até '+dmTxt(v).toLowerCase()+'.':'Ordem '+o.num+' volta a ocupar só um dia.').then(ok=>{ if(ok){ o.ate=v||null; render(); } }); return; }
  if(act==='c-mover'){ moverOrdem(b.dataset.id,($('#c-ml')||{}).value,($('#c-md')||{}).value); return; }
  if(act==='c-ver'){ const o=ordById(b.dataset.id); if(!o) return; C.sel=null; if(!o.linha){ go('aprogramar'); return; } S.ord.linha=o.linha; S.ord.mostrar=o.status==='aberta'?'abertas':'todas'; S.ord.busca=''; S.ord.aberta=o._id; S.ord.painel='entrega'; S.ord.f={}; go('programacao'); return; }
});
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='c-md') S.cal.md=t.value; if(t.id==='c-ml') S.cal.ml=t.value; });
document.addEventListener('dragstart',ev=>{ const c=ev.target.closest&&ev.target.closest('[data-card]'); if(!c) return; if(calRO()){ ev.preventDefault(); return; } S.cal.drag=c.dataset.card; { const z0=c.closest('[data-drop-d]'); S.cal.dragDe=z0?z0.dataset.dropL+'|'+z0.dataset.dropD:null; } try{ ev.dataTransfer.setData('text/plain',c.dataset.card); ev.dataTransfer.effectAllowed='move'; }catch(e){} c.classList.add('arrastando'); document.body.classList.add('cal-arrastando'); });
document.addEventListener('dragend',ev=>{ S.cal.drag=null; document.body.classList.remove('cal-arrastando'); document.querySelectorAll('.arrastando,.over,.ins-a,.ins-d').forEach(x=>x.classList.remove('arrastando','over','ins-a','ins-d')); });
document.addEventListener('dragover',ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop-d]'); if(!z||!S.cal.drag||z.dataset.dropD==='fila') return; ev.preventDefault(); try{ ev.dataTransfer.dropEffect='move'; }catch(e){} if(!z.classList.contains('over')){ document.querySelectorAll('.over').forEach(x=>x.classList.remove('over')); z.classList.add('over'); }
  const t=ev.target.closest('[data-card]'); document.querySelectorAll('.ins-a,.ins-d').forEach(x=>{ if(x!==t) x.classList.remove('ins-a','ins-d'); });
  if(t&&t.dataset.card!==S.cal.drag){ const r=t.getBoundingClientRect(), antes=ev.clientY<r.top+r.height/2; t.classList.toggle('ins-a',antes); t.classList.toggle('ins-d',!antes); } });
document.addEventListener('dragleave',ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop-d]'); if(z&&!z.contains(ev.relatedTarget)) z.classList.remove('over'); });
document.addEventListener('drop',ev=>{ const z=ev.target.closest&&ev.target.closest('[data-drop-d]'); if(!z||z.dataset.dropD==='fila') return; ev.preventDefault(); let id=S.cal.drag; try{ id=ev.dataTransfer.getData('text/plain')||id; }catch(e){}
  S.cal.drag=null; document.body.classList.remove('cal-arrastando'); z.classList.remove('over'); if(!id) return;
  const alvo=ev.target.closest('[data-card]'); let lista=null;
  if(alvo&&alvo.dataset.card!==id){ const r=alvo.getBoundingClientRect(), antes=ev.clientY<r.top+r.height/2;
    lista=[...z.querySelectorAll('[data-card]')].map(x=>x.dataset.card).filter(x=>x!==id); const i=lista.indexOf(alvo.dataset.card); lista.splice(antes?i:i+1,0,id); }
  document.querySelectorAll('.ins-a,.ins-d').forEach(x=>x.classList.remove('ins-a','ins-d'));
  const mesma=S.cal.dragDe===z.dataset.dropL+'|'+z.dataset.dropD; S.cal.dragDe=null;
  reordenarCal(id,z.dataset.dropL,z.dataset.dropD,mesma,lista); });
async function reordenarCal(id,linha,dia,mesma,lista){
  if(!mesma){ if(String(id).startsWith('pv:')){ const p=itemSeq(id); if(p&&S.db){ try{ await S.db.doc('previsoes/'+p._id).update({linha,data:dia}); p.linha=linha; p.data=dia; toast('Programação movida: '+linha+' · '+dmTxt(dia)); }catch(e){ erro(e); } } } else await moverOrdem(id,linha,dia); }
  if(!lista) return; const mud=[]; lista.forEach((x,i)=>{ const o=itemSeq(x); if(o&&o.seq!==i+1){ o.seq=i+1; mud.push([x,o,i+1]); } }); if(!mud.length) return; render();
  let ok=true; for(const [x,o,sq] of mud){ if(String(x).startsWith('pv:')){ try{ await S.db.doc('previsoes/'+o._id).update({seq:sq}); }catch(e){ ok=false; erro(e); } } else ok=(await ordUpd(o._id,{seq:sq}))&&ok; }
  if(ok&&mesma) toast('Sequência do dia atualizada.'); }
document.addEventListener('keydown',ev=>{ if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&ev.target.classList.contains('ccard')){ ev.preventDefault(); ev.target.click(); } });

// ---------------- ações ----------------
document.addEventListener('click',async ev=>{
  const md=ev.target.closest('[data-mod]'); if(md){ const m=MODS.find(x=>x.id===md.dataset.mod); S.mod=m.id; go(mViews(m)[0]||primeiraView()); return; }
  const cp=ev.target.closest('[data-cimper]'); if(cp){ S.cim.per=cp.dataset.cimper; render(); return; }
  const g=ev.target.closest('[data-go]'); const ia=ev.target.closest('[data-act]'); if(g&&!(ia&&ia!==g&&g.contains(ia))){ if(g.dataset.go==='medicao'&&!S.med.corrige){ S.med={v:{},pm:{},obs:'',corrige:null}; } go(g.dataset.go); return; }
  const ss=ev.target.closest('[data-silo-sel]'); if(ss){ S.siloSel=ss.dataset.siloSel; render(); return; }
  const b=ev.target.closest('[data-act]'); if(!b||b.disabled) return;
  const act=b.dataset.act;
  if(act==='abrir-zap'){ S.zap={aberto:true,salva:false}; S.folhas.aberto=false; prepararImagem(); return; }
  if(act==='zap-enviar'){ const im=S.zap.img; if(!im) return;
    // 1) compartilhar direto (celular): abre a lista de apps com a imagem
    try{ const f=new File([im.blob],im.nome,{type:'image/png'}); if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f]}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
    // 2) copiar a imagem e abrir o WhatsApp
    let copiou=false; try{ await navigator.clipboard.write([new ClipboardItem({'image/png':im.blob})]); copiou=true; }catch(e){}
    if(copiou){ let w=null; try{ w=window.open(zapLink(''),'_blank'); if(w) w.opener=null; }catch(e){} S.zap.passo='copiada'; render(); toast(w?'Imagem copiada. No WhatsApp: abra o grupo, Ctrl+V e Enter.':'Imagem copiada. Toque em “Abrir WhatsApp”.'); return; }
    // 3) salvar a imagem e mostrar o botão para abrir o WhatsApp
    const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Não foi possível enviar a imagem nesta visualização.'); return; }
    try{ await dl.save({filename:im.nome,data:im.blob}); S.zap.passo='salva'; render(); }catch(e){} return; }
  if(act==='zap-salvar'){ const im=S.zap.img; if(!im) return;
    const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Não foi possível salvar a imagem nesta visualização.'); return; }
    try{ await dl.save({filename:im.nome,data:im.blob}); }catch(e){} return; }
  if(act==='zap-copiar-img'){ const im=S.zap.img; if(!im) return;
    try{ await navigator.clipboard.write([new ClipboardItem({'image/png':im.blob})]); S.zap.passo='copiada'; render(); toast('Imagem copiada. Cole no WhatsApp (Ctrl+V).'); }catch(e){ toast('Não consegui copiar a imagem aqui. Use “Salvar imagem”.'); } return; }
  if(act==='fechar-zap'){ S.zap.aberto=false; render(); return; }
  if(act==='copiar-zap'){ const ta=$('#zap-txt'); if(!ta) return; let ok=false;
    try{ await navigator.clipboard.writeText(ta.value); ok=true; }catch(e){ try{ ta.focus(); ta.select(); ok=document.execCommand('copy'); }catch(_){} }
    toast(ok?'Texto copiado. Cole no WhatsApp.':'Não consegui copiar. Selecione o texto e copie manualmente.'); if(!ok){ ta.focus(); ta.select(); } return; }
  if(act==='abrir-folhas'){ S.zap.aberto=false; S.folhas.aberto=true; render(); return; }
  if(act==='fechar-folhas'){ S.folhas.aberto=false; render(); return; }
  if(act==='f-semana'){ S.folhas.semana=b.dataset.k; render(); return; }
  if(act==='f-pordia'){ S.folhas.porDia=+b.dataset.k; render(); return; }
  if(act==='gerar-folhas'){ gerarFolhas(); return; }
  if(act==='med-premix'){ S.med.pmAberto=true; render(); const f=$('[data-pg="mp"]'); f&&f.focus(); return; }
  if(act==='abrir-premix'){ S.abrirPremix=true; S.premixForm={}; render(); const f=$('[data-pg="pmx"]'); f&&f.focus(); return; }
  if(act==='fechar-premix'){ S.abrirPremix=false; render(); return; }
  if(act==='salvar-premix'){ const {valores,porLinha}=pgMontar(S.premixForm);
    if(!Object.keys(valores).length){ toast('Digite a quantidade de premix.'); return; }
    const h=horaDe('pmx'); if(h.erro){ toast(h.erro); return; }
    if(await salvar('premix',marcaManual({em:h.iso,por:S.uid,valores,porLinha},h))){ S.abrirPremix=false; S.horaMan.pmx=null; toast('Premix salvo · '+dia(h.iso)+' '+hora(h.iso)); render(); } return; }
  if(act==='cancelar-med'){ S.med={v:{},pm:{},obs:'',corrige:null}; go('geral'); return; }
  if(act==='salvar-med'){ const itens={}; S.cfg.silos.forEach(s=>{ const n=numIn(S.med.v[s.id]); if(n!=null&&n>=0) itens[s.id]=Math.round(n*10)/10; });
    if(!Object.keys(itens).length) return;
    const h=horaDe('med'); if(h.erro){ toast(h.erro); return; }
    const em=h.iso; const doc={em,por:S.uid,itens,caps:Object.fromEntries(S.cfg.silos.map(s=>[s.id,s.cap]))};
    if(S.med.obs.trim()) doc.obs=S.med.obs.trim(); { const q=(S.med.quem!=null?S.med.quem:ultimoMedidor()).trim(); if(q) doc.medidoPor=q; } if(S.med.corrige) doc.corrige=S.med.corrige; marcaManual(doc,h);
    S.salvando=true; medAtualizaResumo();
    const ok=await salvar('medicoes',doc);
    const pg=pgMontar(S.med.pm);
    if(ok && Object.keys(pg.valores).length) await salvar('premix',marcaManual({em,por:S.uid,valores:pg.valores,porLinha:pg.porLinha},h));
    S.salvando=false;
    if(ok){ const n=Object.keys(itens).length; S.med={v:{},pm:{},obs:'',corrige:null}; S.horaMan.med=null; toast(`Medição salva · ${dia(em)} ${hora(em)} · ${n} de ${S.cfg.silos.length} silos`); S.zap={aberto:true,salva:true}; S.folhas.aberto=false; go('geral'); setTimeout(prepararImagem,1200); } else medAtualizaResumo();
    return; }
  if(act==='corrigir'){ const m=S.medicoes.find(x=>x._id===b.dataset.id); if(!m) return; S.med={v:{},pm:{},obs:'',corrige:m._id,quem:m.medidoPor!=null?m.medidoPor:null}; Object.keys(m.itens||{}).forEach(k=>S.med.v[k]=String(m.itens[k]).replace('.',',')); go('medicao'); return; }
  if(act==='md-folhas-sem'){ S.zap.aberto=false; S.folhas.aberto=true; go('geral'); return; }
  if(act==='md-nova-ordem'){ const O=S.ord; O.linha='todas'; O.mostrar='abertas'; O.busca=''; O.aberta=null; O.nova=true; O.nf={linha:linhasOrd()[0],data:hojeStr(),turno:'Dia todo'}; go('programacao'); const n=$('#o-n-num'); n&&n.focus(); return; }
  if(act==='md-apt-abrir'){ S.apt={aberto:true,passo:'escolher',sel:[],v:{},gravando:false,linha:'todas',data:hojeStr(),atras:true,busca:''}; S.horaMan.apt=null; S.ord.nova=false; go('programacao'); setTimeout(()=>{ const p=document.querySelector('[data-act="md-apt-fechar"]'); p&&p.closest('section').scrollIntoView({behavior:'smooth',block:'start'}); },30); return; }
  if(act==='md-apt-fechar'){ S.apt.aberto=false; render(); return; }
  if(act==='md-apt-todas'){ S.apt.sel=[...new Set([...S.apt.sel,...aptOrdens().map(o=>o._id)])]; render(); return; }
  if(act==='md-apt-linha'){ S.apt.linha=b.dataset.v; render(); return; }
  if(act==='md-apt-nenhuma'){ S.apt.sel=[]; render(); return; }
  if(act==='md-apt-seguir'){ if(!S.apt.sel.length) return; S.apt.passo='lancar'; render(); const f=document.querySelector('[data-apt-id]'); f&&f.focus(); return; }
  if(act==='md-apt-voltar'){ S.apt.passo='escolher'; render(); return; }
  if(act==='md-apt-lancar'){ const A=S.apt; if(A.gravando) return; const xs=ordAbertas().filter(o=>A.sel.includes(o._id)).map(o=>({o,c:aptQ(o)})).filter(x=>x.c.q>0);
    if(!xs.length){ toast('Informe a quantidade de pelo menos uma ordem.'); return; }
    { const semE=xs.filter(({o})=>faltaEns(o)&&!String((A.v[o._id]||{}).ens||'').replace(/\D/g,'')); if(semE.length){ toast('Informe a ordem de ensacado '+(semE.length===1?'da ordem ':'das ordens ')+semE.map(x=>x.o.num).join(', ')+'.'); const x=document.querySelector(`[data-apt-id="${CSS.escape(semE[0].o._id)}"][data-apt-k="ens"]`); x&&x.focus(); return; } }
    const h=horaDe('apt'); if(h.erro){ toast(h.erro); return; }
    for(const {o} of xs){ if(faltaEns(o)){ const ens=String(A.v[o._id].ens).replace(/\D/g,''); if(await ordUpd(o._id,{ensaca:ens,hist:histAdd(o,'Ordem de ensacado '+ens)})){ o.ensaca=ens; await vincularEnsaca(ens,o.num); } } }
    A.gravando=true; render(); let ok=0, tot=0;
    for(const {o,c} of xs){ const d={ordem:o._id,num:o.num,linha:o.linha,em:h.iso,por:S.uid,qtd:Math.round(c.q*1000)/1000}; if(c.pal){ d.pal=c.pal; d.porPal=c.pp; } if(c.fd){ d.fardos=c.fd; d.porFardo=c.pf; } if(c.av) d.avulso=c.av; { const ob=String((A.obs||{})[o._id]||'').trim(); if(ob) d.obs=ob.slice(0,500); } marcaManual(d,h); if(await salvar('entregas',d)){ ok++; tot+=d.qtd; } }
    A.gravando=false; if(ok===xs.length){ S.apt={aberto:false,passo:'escolher',sel:[],v:{},gravando:false,linha:'todas',data:'',atras:true,busca:''}; S.horaMan.apt=null; toast(`${ok} apontamento${ok===1?'':'s'} lançado${ok===1?'':'s'} · ${fq(tot)} no total`); }
    else toast(`${ok} de ${xs.length} lançados. Confira os que faltaram e tente de novo.`);
    render(); return; }
  if(act==='md-folha-busca'){ abrirBuscaFolha(); return; }
  if(act==='md-nf'){ S.abrirCarga=true; S.carga={nota:'',qtd:'',sit:'caminho'}; S.horaMan.carga=null; go('cargas'); const n=$('#c-nota'); n&&n.focus(); return; }
  if(act==='abrir-carga'){ S.abrirCarga=true; S.carga={nota:'',qtd:'',sit:'caminho'}; render(); const n=$('#c-nota'); n&&n.focus(); return; }
  if(act==='fechar-carga'){ S.abrirCarga=false; render(); return; }
  if(act==='c-sit'){ S.carga.sit=b.dataset.k; document.querySelectorAll('[data-act="c-sit"]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===S.carga.sit)); return; }
  if(act==='salvar-carga'){ const nota=S.carga.nota.trim(); if(!nota){ toast('Informe o número da nota.'); $('#c-nota').focus(); return; }
    if(S.cargas.some(c=>c.nota===nota && etapaCarga(c)<2)){ toast('Já existe uma carga em andamento com a NF '+nota+'.'); return; }
    const h=horaDe('carga'); if(h.erro){ toast(h.erro); return; }
    const em=h.iso; const et={}; et[S.carga.sit]=em; const q=numIn(S.carga.qtd);
    const doc={nota,etapas:et,criadaEm:em,por:S.uid}; if(q!=null) doc.qtd=q; if(h.manual){ doc['manual_'+S.carga.sit]=true; doc.registradoEm=new Date().toISOString(); }
    if(await salvar('cargas',doc)){ S.abrirCarga=false; S.horaMan.carga=null; toast('Carga NF '+nota+' registrada · '+dia(em)+' '+hora(em)); render(); } return; }
  if(act==='outra-hora'){ S.hp={tipo:b.dataset.tipo,id:b.dataset.id,k:b.dataset.k,val:localVal(new Date())}; render(); return; }
  if(act==='hp-cancelar'){ S.hp=null; render(); return; }
  if(act==='hp-ok'){ const hp=S.hp; if(!hp) return; const d=new Date(($('#hp-val')||{}).value||hp.val);
    if(isNaN(d)){ toast('Data e hora inválidas.'); return; } if(d.getTime()>Date.now()+120000){ toast('A data e hora não podem estar no futuro.'); return; }
    const iso=d.toISOString(); S.hp=null;
    if(hp.tipo==='etapa'){ const c=S.cargas.find(x=>x._id===hp.id); if(!c||!S.db) return;
      try{ await S.db.doc('cargas/'+c._id).update({etapas:{[hp.k]:iso},['por_'+hp.k]:S.uid,['manual_'+hp.k]:true}); toast('NF '+c.nota+': '+ETAPAS[EKEY.indexOf(hp.k)].toLowerCase()+' · '+dia(iso)+' '+hora(iso)); }catch(e){ erro(e); } }
    else { const p=S.paradas.find(x=>x._id===hp.id); if(!p||!S.db) return; if(iso<p.inicio){ toast('A volta não pode ser antes do início da parada ('+hora(p.inicio)+').'); S.hp=hp; return; }
      try{ await S.db.doc('paradas/'+p._id).update({fim:iso,porFim:S.uid,fimManual:true}); toast(p.linha+' voltou · '+dia(iso)+' '+hora(iso)+' · parada de '+dur(new Date(iso)-new Date(p.inicio))); }catch(e){ erro(e); } }
    render(); return; }
  if(act==='etapa'){ const c=S.cargas.find(x=>x._id===b.dataset.id); if(!c||!S.db) return; const k=b.dataset.k; const em=new Date().toISOString();
    try{ await S.db.doc('cargas/'+c._id).update({etapas:{[k]:em},['por_'+k]:S.uid}); toast('NF '+c.nota+': '+ETAPAS[EKEY.indexOf(k)].toLowerCase()+' às '+hora(em)); }catch(e){ erro(e); } return; }
  if(act==='parar'){ S.abrirParar=true; S.parar={linha:b.dataset.linha,motivo:null,obs:'',ordem:(ordemRodando(b.dataset.linha)||{})._id||null}; render(); window.scrollTo(0,0); return; }
  if(act==='par-ed'){ S.parEd=b.dataset.id; render(); return; }
  if(act==='par-ed-x'){ S.parEd=null; render(); return; }
  if(act==='par-ed-salvar'){ const p=S.paradas.find(x=>x._id===b.dataset.id); if(!p||!S.db) return; const g=id=>(($('#'+id)||{}).value||'').trim();
    const ini=g('pe-ini')?new Date(g('pe-ini')):null, fim=g('pe-fim')?new Date(g('pe-fim')):null; const agora=Date.now()+120000;
    if(!ini||isNaN(ini)){ toast('Informe quando a linha parou.'); return; } if(ini.getTime()>agora||(fim&&fim.getTime()>agora)){ toast('Os horários não podem estar no futuro.'); return; }
    if(fim&&fim<=ini){ toast('A volta precisa ser depois do início.'); return; }
    const linha=g('pe-linha')||p.linha; if(!fim&&S.paradas.some(x=>x._id!==p._id&&x.linha===linha&&!x.fim)){ toast(linha+' já tem outra parada em andamento.'); return; }
    const u={linha,motivo:g('pe-motivo')||p.motivo,inicio:ini.toISOString(),fim:fim?fim.toISOString():null,obs:g('pe-obs')||null,ordem:g('pe-ordem').replace(/\D/g,'')||null};
    const antes={linha:p.linha,motivo:p.motivo,inicio:p.inicio,fim:p.fim||null,obs:p.obs||null,ordem:p.ordem||null};
    if(JSON.stringify(antes)===JSON.stringify(u)){ S.parEd=null; render(); return; }
    u.edits=(p.edits||[]).concat([{em:new Date().toISOString(),por:S.uid||null,antes}]).slice(-20);
    try{ await S.db.doc('paradas/'+p._id).update(u); S.parEd=null; toast('Parada atualizada · '+linha+' '+hora(u.inicio)+' → '+(u.fim?hora(u.fim):'em andamento')); render(); }catch(e){ erro(e); } return; }
  if(act==='fechar-parar'){ S.abrirParar=false; render(); return; }
  if(act==='p-linha'){ S.parar.linha=b.dataset.v; S.parar.ordem=(ordemRodando(b.dataset.v)||{})._id||null; render(); return; }
  if(act==='p-motivo'){ S.parar.motivo=b.dataset.v; render(); return; }
  if(act==='salvar-parada'){ const f=S.parar; if(!f.linha||!f.motivo) return; if(!(S.horaMan.pararFim&&S.horaMan.pararFim.on)&&S.paradas.some(p=>p.linha===f.linha&&!p.fim)){ toast(f.linha+' já está parada.'); return; }
    const h=horaDe('parar'); if(h.erro){ toast(h.erro); return; }
    const em=h.iso; const doc={linha:f.linha,motivo:f.motivo,inicio:em,fim:null,por:S.uid};
    { const z=S.horaMan.pararFim; if(z&&z.on){ const h2=horaDe('pararFim'); if(h2.erro){ toast(h2.erro); return; } if(h2.iso<=em){ toast('A hora da volta precisa ser depois do início da parada.'); return; } doc.fim=h2.iso; doc.porFim=S.uid; doc.fimManual=true; } } if(f.obs.trim()) doc.obs=f.obs.trim(); { const oo=f.ordem&&ordById(f.ordem); if(oo){ doc.ordem=String(oo.num); doc.ordemId=oo._id; } } marcaManual(doc,h);
    if(await salvar('paradas',doc)){ S.abrirParar=false; S.horaMan.parar=null; S.horaMan.pararFim=null; toast(doc.fim?f.linha+' parada de '+hora(em)+' às '+hora(doc.fim)+' ('+dur(new Date(doc.fim)-new Date(em))+') · '+f.motivo:f.linha+' parada às '+hora(em)+' · '+f.motivo); render(); } return; }
  if(act==='voltou'){ const p=S.paradas.find(x=>x._id===b.dataset.id); if(!p||!S.db) return; const em=new Date().toISOString();
    try{ await S.db.doc('paradas/'+p._id).update({fim:em,porFim:S.uid}); toast(p.linha+' voltou às '+hora(em)+' · parada de '+dur(new Date(em)-new Date(p.inicio))); }catch(e){ erro(e); } return; }
  if(act==='h-per'){ S.hist.per=b.dataset.k; render(); return; }
  if(act==='h-tipo'){ S.hist.tipos[b.dataset.k]=!S.hist.tipos[b.dataset.k]; render(); return; }
  if(act==='export'){ exportar(b.dataset.kind); return; }
  if(act==='aj-add-prod'){ lerProdsDoForm(); S.cfg.produtos.push({id:'p'+Date.now().toString(36),nome:'',kgSaco:0,sacosPremix:0}); render(); return; }
  if(act==='aj-rm-prod'){ lerProdsDoForm(); S.cfg.produtos.splice(+b.dataset.i,1); render(); return; }
  if(act==='aj-semcim'){ const l=b.dataset.v; const cur=linhasSemCim().slice(); const i=cur.indexOf(l); if(i>=0) cur.splice(i,1); else cur.push(l); S.cfg.linhasSemCimento=cur; b.setAttribute('aria-pressed',String(i<0));
    if(S.db){ try{ await S.db.doc('config/geral').update({linhasSemCimento:cur}); toast(l+(i<0?' não usa':' usa')+' o cimento dos silos'); }catch(e){ erro(e); } } return; }
  if(act==='aj-salvar'){ salvarAjustes(); return; }
});
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.dataset.silo){ const s=S.cfg.silos.find(x=>x.id===t.dataset.silo); let v=t.value.replace(/[^0-9.,]/g,'').replace(/\./g,','); const pp=v.split(','); if(pp.length>2) v=pp[0]+','+pp.slice(1).join(''); if(v!==t.value) t.value=v; S.med.v[s.id]=v; $('#mr-'+s.id).innerHTML=medRes(s); $('#mt-'+s.id).innerHTML=medTank(s); medAtualizaResumo(); return; }
  if(t.dataset.pg){ const v=t.value.replace(/[^0-9]/g,''); if(v!==t.value) t.value=v; const form=t.dataset.pg==='mp'?S.med.pm:S.premixForm; form[pgKey(t.dataset.p,t.dataset.l)]=v;
    const p=S.cfg.produtos.find(x=>x.id===t.dataset.p); const el=$('#'+t.dataset.pg+'-tot-'+p.id); if(el) el.innerHTML=pgTotal(form,p); return; }
  if(t.dataset.horaVal){ S.horaMan[t.dataset.horaVal]=Object.assign(S.horaMan[t.dataset.horaVal]||{},{val:t.value}); return; }
  if(t.id==='hp-val'&&S.hp){ S.hp.val=t.value; return; }
  if(t.id==='m-obs'){ S.med.obs=t.value; return; }
  if(t.id==='m-quem'){ S.med.quem=t.value; return; }
  if(t.id==='c-nota'){ S.carga.nota=t.value; return; }
  if(t.id==='c-qtd'){ S.carga.qtd=t.value; return; }
  if(t.id==='p-obs'){ S.parar.obs=t.value; return; }
});
document.addEventListener('change',ev=>{ const t=ev.target;
  if(t.dataset&&t.dataset.folhaSab!==undefined){ S.folhas.sabado=t.checked; render(); return; }
  if(t.dataset&&t.dataset.horaTog){ const k=t.dataset.horaTog; const cur=S.horaMan[k]||{}; S.horaMan[k]={on:t.checked,val:cur.val||localVal(new Date())};
    if(k==='parar'||k==='pararFim'){ render(); const f=$('#hora-'+k); f&&f.focus(); return; }
    const box=t.closest('.hora-box'); if(box) box.outerHTML=horaCampo(k, k==='med'?'A medição foi feita em outro horário (informar data e hora)':k==='parar'?'A linha parou em outro horário':undefined); const f=$('#hora-'+k); f&&f.focus(); } });
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter') return; const t=ev.target; if(!t.classList||!t.classList.contains('mcampo')) return;
  ev.preventDefault(); const els=[...document.querySelectorAll('input.mcampo')]; const i=els.indexOf(t); if(els[i+1]) els[i+1].focus(); else t.blur();
});
function lerProdsDoForm(){ S.cfg.produtos=S.cfg.produtos.map((p,i)=>{ const n=$('#aj-pn-'+i); if(!n) return p; return {id:p.id,nome:n.value.trim(),kgSaco:numIn($('#aj-pk-'+i).value)||0,sacosPremix:parseInt($('#aj-ps-'+i).value,10)||0}; }); }
async function salvarAjustes(){
  lerProdsDoForm();
  const c=JSON.parse(JSON.stringify(S.cfg));
  c.silos.forEach(s=>{ const v=numIn($('#aj-cap-'+s.id).value); if(v&&v>0) s.cap=v; });
  c.produtos=c.produtos.filter(p=>p.nome);
  c.linhas=$('#aj-linhas').value.split('\n').map(x=>x.trim()).filter(Boolean);
  c.motivos=$('#aj-motivos').value.split('\n').map(x=>x.trim()).filter(Boolean);
  c.zapNumero=($('#aj-zap').value||'').trim();
  { const ea=$('#aj-almox'); if(ea) c.emailAlmox=(ea.value||'').trim(); }
  const lo=$('#aj-lord'); if(lo){ c.linhasOrdem=lo.value.split('\n').map(x=>x.trim()).filter(Boolean);
    const kv=(el,up)=>{ const o={}; (el.value||'').split('\n').forEach(l=>{ const m=l.split('='); if(m.length===2){ const k=m[0].trim(), v=parseFloat(m[1].replace(',','.')); if(k&&!isNaN(v)) o[up?k.toUpperCase():k]=v; } }); return o; };
    c.paletes=kv($('#aj-pal'),false); c.capacidade=kv($('#aj-capac'),false); { const ex=$('#aj-exped'); if(ex){ const v=ex.value.trim(); c.expediente=v||EXPED_PADRAO; } } if(!c.linhasOrdem.length){ toast('Informe ao menos uma linha ou máquina para as ordens.'); return; } }
  const n=parseInt($('#aj-normal').value,10), a=parseInt($('#aj-atencao').value,10);
  if(isNaN(n)||isNaN(a)||a>=n){ toast('O limite de Atenção precisa ser menor que o de Normal.'); return; }
  c.limites={normal:n,atencao:a};
  if(!c.linhas.length||!c.motivos.length){ toast('Informe ao menos uma linha e um motivo.'); return; }
  if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
  try{ c.alteradoEm=new Date().toISOString(); c.alteradoPor=S.uid; await S.db.doc('config/geral').set(c); S.cfg=c; toast('Ajustes salvos.'); render(); }catch(e){ erro(e); }
}
async function salvar(col,doc){
  if(!S.db){ toast('Sem conexão com o armazenamento. O registro não foi salvo.'); return false; }
  try{ await S.db.collection(col).add(doc); return true; }catch(e){ erro(e); return false; }
}
function erro(e){ const c=e&&e.code; console.warn('[painel] erro ao gravar',c,e&&e.message);
  if(c==='sem-permissao'||c==='permission-denied'){ toast('Você não possui permissão para salvar isso. Fale com o administrador.'); return; }
  toast(c==='quota_exceeded'?'O armazenamento do teste está cheio. Avise o responsável.':c==='resource-exhausted'?'A cota grátis diária do Firebase acabou. O painel volta sozinho por volta das 4h da manhã.':c==='resource_exhausted'?'Muitas ações seguidas. Aguarde alguns segundos e tente de novo.':'Não foi possível salvar. Verifique a conexão e tente de novo.'); }

async function exportar(kind){
  let linhas;
  if(kind==='silo'){ const s=S.cfg.silos.find(x=>x.id===S.siloSel); linhas=[['data','hora','silo','toneladas','capacidade','percentual','registrado_por','observacao']];
    validas().filter(m=>m.itens&&m.itens[s.id]!=null).forEach(m=>{ const d=new Date(m.em); linhas.push([d.toLocaleDateString('pt-BR'),hora(m.em),s.nome,f1(m.itens[s.id]),s.cap,f1(m.itens[s.id]/s.cap*100),nomeDe(m.por),m.obs||'']); }); }
  else { const [a,b]=periodo(); linhas=[['data','hora','tipo','evento','detalhe']];
    eventos().filter(e=>{ const t=new Date(e.em).getTime(); return t>=a&&t<b&&S.hist.tipos[e.grp]; }).reverse().forEach(e=>{ linhas.push([new Date(e.em).toLocaleDateString('pt-BR'),hora(e.em),TIPO[e.t].r+(e.manual?' (hora informada)':''),e.titulo+(e.corrigida?' (corrigida)':''),(e.det||'')+(e.dur?' · '+e.dur:'')]); }); }
  const csv='﻿'+linhas.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const dl=await window.claude?.use?.('downloads');
  if(!dl){ toast('Exportação indisponível nesta visualização.'); return; }
  try{ await dl.save({filename:(kind==='silo'?'medicoes-silo':'historico')+'-'+new Date().toISOString().slice(0,10)+'.csv',data:csv}); }catch(e){ /* recusado pelo usuário */ }
}

// ================= ANÁLISE PCP (módulo) =================
// Prefixo "anl" em funções, ações (data-act="anl-…") e estado (S.anl). Não usar nomes fora do prefixo.
const ANL_DOCS=['meta','itens','perfil','vendas','prev'];
const ANL_LIN={'L1':'Linha 1','L2':'Linha 2','L3':'Linha 3','AREA LIQUIDA':'Área líquida','MQ 1':'Rejunte M1','MAQ 2':'Rejunte M2','FIXCOL':'Fixcol'};
const ANL_XLSX='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const ANL_ABAS=['SALDO','PERFIL','PARAMETROS','EXTRATO','PREVISAO','HIST_PREVISAO','HISTORICO_ESTOQUE','CAPACIDADE','LINHAS'];
/* sob encomenda automático: exportação (códigos RE…) e produtos Quero Quero */
function anlEncAuto(c,d){ return /^RE\d/i.test(String(c||''))||/QUERO\s*-?\s*QUERO/i.test(String(d||((itemDe(c)||{}).descricao)||'')); }
function anlCfg(){ const a=(S.cfg&&S.cfg.analise)||{}; return {horiz:a.horiz||15, sab:!!a.sab, prev:a.prev!==false, janela:a.janela||60, enc:Array.isArray(a.enc)?a.enc:[], insumos:Array.isArray(a.insumos)?a.insumos:[]}; }
function anlUtil(iso){ const w=new Date(iso+'T12:00:00').getDay(); return w!==0&&(w!==6||anlCfg().sab)&&!(typeof feriados==='function'&&feriados().includes(iso)); }
function anlUteisEntre(a,b){ let n=0,d=a; for(let g=0;g<800&&d<b;g++){ if(anlUtil(d)) n++; d=addDias(d,1); } return n; }
function anlN(n){ return Math.round(n||0).toLocaleString('pt-BR'); }
function anlK(n){ const a=Math.abs(n||0); if(a>=10000) return (n/1000).toLocaleString('pt-BR',{maximumFractionDigits:0})+'k'; if(a>=1000) return (n/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+'k'; return anlN(n); }

// ---------- leitura da planilha BASE DE DADOS PCP (.xlsx) ----------
function anlNorm(s){ return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim().toUpperCase(); }
function anlNum(v){ if(v==null||v==='') return 0; if(typeof v==='number') return isFinite(v)?v:0; if(typeof v==='boolean') return 0; let s=String(v).trim(); if(!s) return 0; if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?0:n; }
function anlData(v){ if(v==null||v==='') return '';
  if(typeof v==='number'){ if(v<20000||v>80000) return ''; const d=new Date(Math.round((v-25569)*864e5)); return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()); }
  if(v instanceof Date) return isNaN(v)?'':hojeStr(v);
  const s=String(v).trim(); let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3]+'-'+pad(+m[2])+'-'+pad(+m[1]);
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m?m[1]+'-'+m[2]+'-'+m[3]:''; }
function anlComp(v){ if(typeof v==='string'){ const m=v.trim().match(/^(\d{1,2})\/(\d{4})$/); if(m) return m[2]+'-'+pad(+m[1]); } const d=anlData(v); return d?d.slice(0,7):''; }
function anlCarimbo(rows){ for(const r of (rows||[]).slice(0,2)) for(const c of (r||[])){ const m=String(c==null?'':c).match(/Atualizado:?\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i); if(m) return m[3]+'-'+m[2]+'-'+m[1]+'T'+pad(+(m[4]||0))+':'+(m[5]||'00'); } return ''; }
function anlCols(hdr,spec){ const H=(hdr||[]).map(anlNorm), o={};
  for(const k in spec){ const nomes=spec[k][0], fb=spec[k][1]; let i=-1;
    for(const n of nomes){ i=H.indexOf(anlNorm(n)); if(i>=0) break; }
    if(i<0) for(const n of nomes){ const nn=anlNorm(n); i=H.findIndex(h=>h&&h.startsWith(nn)); if(i>=0) break; }
    o[k]=i>=0?i:fb; }
  return o; }
function anlCod(v){ return String(v==null?'':v).trim().toUpperCase(); }
const anlOkCod=k=>/^[A-Z]{1,4}\d{3,6}$/.test(k);
function anlNumBR(v){ if(typeof v==='number') return isFinite(v)?v:0; const s=String(v==null?'':v).trim().replace(/\s/g,''); if(!s) return 0; const n=parseFloat(s.replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; }
// --- partes vindas da planilha antiga (carga inicial: traz também os históricos) ---
function anlPartesXlsx(wb,XL){
  const aba=nome=>{ const k=wb.SheetNames.find(n=>anlNorm(n)===nome); return k?XL.utils.sheet_to_json(wb.Sheets[k],{header:1,raw:true,defval:null,blankrows:false}):null; };
  const P={}, fontes=[];
  const sal=aba('SALDO');
  if(sal){ const c=anlCols(sal[0],{cod:[['CODIGO'],0],d:[['DESCRICAO'],1],a3:[['ALMOX 3'],2],a30:[['ALMOX 30'],3]}); const l={};
    sal.slice(1).forEach(r=>{ const k=anlCod(r[c.cod]); if(anlOkCod(k)) l[k]={d:String(r[c.d]||'').trim(),a3:anlNum(r[c.a3]),a30:anlNum(r[c.a30])}; });
    P.saldo={atual:anlCarimbo(sal),l}; fontes.push(['Saldo',Object.keys(l).length,P.saldo.atual]); }
  const per=aba('PERFIL');
  if(per){ const c=anlCols(per[0],{rel:[['DATA RELATORIO'],0],cod:[['ITEM'],1],t:[['TIPO'],2],f:[['DATA FIM'],5],q:[['QUANTIDADE'],6]}); const l=[]; let rel='';
    per.slice(1).forEach(r=>{ const k=anlCod(r[c.cod]), t=anlNorm(r[c.t]), f=anlData(r[c.f]), q=anlNum(r[c.q]); if(!anlOkCod(k)||!t||!f||!q) return; l.push([k,t,f,q]); const rr=anlData(r[c.rel]); if(rr>rel) rel=rr; });
    P.perfil={atual:anlCarimbo(per),rel,l}; fontes.push(['Perfil',l.length,P.perfil.atual]); }
  const par=aba('PARAMETROS');
  if(par) { P.param=anlParamLinhas(par,false); P.param.atual=anlCarimbo(par); fontes.push(['Parâmetros',Object.keys(P.param.l).length,P.param.atual]); }
  const cap=aba('CAPACIDADE');
  if(cap){ const c=anlCols(cap[0],{cod:[['CODIGO'],0],c30:[['CAPACIDADE ALMOX 30'],2],c3:[['CAPACIDADE ALMOX 3'],3]}); const l={};
    cap.slice(1).forEach(r=>{ const k=anlCod(r[c.cod]); if(anlOkCod(k)) l[k]={c30:anlNum(r[c.c30]),c3:anlNum(r[c.c3])}; }); P.cap={atual:anlCarimbo(cap),l}; fontes.push(['Capacidade do almox',Object.keys(l).length,'']); }
  const lin=aba('LINHAS');
  if(lin){ const H=(lin[0]||[]).map(anlNorm); const cc=H.indexOf('CODIGO')>=0?H.indexOf('CODIGO'):0, cp=H.indexOf('PESO'); const l={};
    lin.slice(1).forEach(r=>{ const k=anlCod(r[cc]); if(!anlOkCod(k)) return; const ln=[]; H.forEach((h,i)=>{ if(ANL_LIN[h]){ const v=r[i]; if(v===true||/^(TRUE|VERDADEIRO|SIM|1|X)$/i.test(String(v==null?'':v).trim())) ln.push(ANL_LIN[h]); } }); l[k]={ln,peso:cp>=0?anlNum(r[cp]):0}; });
    P.lin={atual:'',l}; fontes.push(['Linhas por item',Object.keys(l).length,'']); }
  const ext=aba('EXTRATO');
  if(ext){ P.ext=anlExtLinhas(ext,false); P.ext.atual=anlCarimbo(ext); fontes.push(['Extrato (produzido e faturado)',P.ext.rows.length,P.ext.atual]); }
  const hp=aba('HIST_PREVISAO'), mes={};
  if(hp){ const c=anlCols(hp[0],{comp:[['COMPETENCIA'],0],cod:[['ITEM'],1],p:[['PREVISTO'],3]});
    hp.slice(1).forEach(r=>{ const cp=anlComp(r[c.comp]), k=anlCod(r[c.cod]); if(!cp||!anlOkCod(k)) return; (mes[cp]=mes[cp]||{})[k]=(mes[cp][k]||0)+anlNum(r[c.p]); }); }
  const pv=aba('PREVISAO');
  if(pv){ const c=anlCols(pv[0],{cod:[['ITEM'],0],p:[['PREVISTO'],2]}); const at=anlCarimbo(pv); const cp=at?at.slice(0,7):''; const tmp={};
    pv.slice(1).forEach(r=>{ const k=anlCod(r[c.cod]); if(anlOkCod(k)) tmp[k]=(tmp[k]||0)+anlNum(r[c.p]); }); if(cp&&!mes[cp]) mes[cp]=tmp; }
  if(Object.keys(mes).length){ P.histPrev={mes}; fontes.push(['Previsão mensal',Object.keys(mes).sort().map(k=>k.slice(5)+'/'+k.slice(0,4)).join(', '),'']); }
  const he=aba('HISTORICO_ESTOQUE'), est={};
  if(he){ const c=anlCols(he[0],{comp:[['COMPETENCIA'],0],cod:[['CODIGO'],1],a3:[['ALMOX 3'],3],a30:[['ALMOX 30'],4]});
    he.slice(1).forEach(r=>{ const cp=anlComp(r[c.comp]), k=anlCod(r[c.cod]); if(!cp||!anlOkCod(k)) return; (est[cp]=est[cp]||{})[k]=anlNum(r[c.a3])+anlNum(r[c.a30]); });
    if(Object.keys(est).length){ P.histEst={est}; fontes.push(['Estoque do início do mês',Object.keys(est).sort().map(k=>k.slice(5)+'/'+k.slice(0,4)).join(', '),'']); } }
  return {tipo:'planilha',nome:'Planilha BASE DE DADOS PCP (carga inicial)',partes:P,fontes};
}
// PARAMETROS: linhas (planilha ou tabela do Focco). br=true → números no formato 1.234,56
function anlParamLinhas(rows,br){ const hi=Math.max(0,rows.findIndex(r=>(r||[]).some(c=>/LOTE MIN/.test(anlNorm(c)))));
  const c=anlCols(rows[hi],{cod:[['COD. ITEM','COD ITEM','CODIGO','ITEM'],0],d:[['DESC. TECNICA','DESC TECNICA','DESCRICAO'],1],um:[['UM'],2],lmin:[['LOTE MIN'],3],lmax:[['LOTE MAX'],4],lmult:[['LOTE MULT'],5],seg:[['ESTQ. SEG','ESTQ SEG','ESTOQUE SEGURANCA'],6],trep:[['TEMP. REP','TEMP REP'],7],cmed:[['CONS. MEDIO','CONS MEDIO','CONSUMO MEDIO'],11]});
  const N=br?anlNumBR:anlNum, l={};
  rows.slice(hi+1).forEach(r=>{ const k=anlCod(r[c.cod]); if(!anlOkCod(k)) return; l[k]={d:String(r[c.d]||'').trim(),um:anlCod(r[c.um]),lmin:N(r[c.lmin]),lmax:N(r[c.lmax]),lmult:N(r[c.lmult]),seg:N(r[c.seg]),trep:N(r[c.trep]),cmed:N(r[c.cmed])}; });
  return {l}; }
// EXTRATO: só EPP (produzido) e NFS (faturado)
function anlExtLinhas(rows,br){ const hi=Math.max(0,rows.findIndex(r=>(r||[]).some(c=>anlNorm(c)==='LCTO')));
  const c=anlCols(rows[hi],{d:[['DATA','DT'],1],sg:[['SIGLA'],3],q:[['QTDE'],5],cod:[['COD. ITEM','COD ITEM','CODIGO','ITEM'],12]});
  const N=br?anlNumBR:anlNum, out=[]; let ini='', ate='';
  rows.slice(hi+1).forEach(r=>{ const sg=anlNorm(r[c.sg]); if(sg!=='EPP'&&sg!=='NFS') return; const k=anlCod(r[c.cod]), d=anlData(r[c.d]), q=Math.abs(N(r[c.q])); if(!anlOkCod(k)||!d||!q) return; out.push([k,d,sg==='EPP'?0:1,q]); if(d>ate) ate=d; if(!ini||d<ini) ini=d; });
  return {rows:out,ini,ate}; }
// arquivos .xls do Focco (tabela HTML) — Parâmetros ou Extrato
function anlTabelaHtml(txt){ const doc=new DOMParser().parseFromString(txt,'text/html'); const rows=[];
  doc.querySelectorAll('tr').forEach(tr=>{ rows.push([...tr.querySelectorAll('td,th')].map(td=>td.textContent.replace(/ /g,' ').trim())); }); return rows; }
function anlPartesTabela(rows,nome,br){
  const tem=re=>rows.slice(0,6).some(r=>(r||[]).some(c=>re.test(anlNorm(c))));
  if(tem(/^LCTO$/)){ const e=anlExtLinhas(rows,br); e.atual=new Date().toISOString().slice(0,16); return {tipo:'extrato',nome:'Extrato do Focco',partes:{ext:e},fontes:[['Extrato (produzido e faturado)',e.rows.length,e.ini&&e.ate?'movimentos de '+dm(e.ini)+' a '+dm(e.ate):'']]}; }
  if(tem(/LOTE MIN/)){ const p=anlParamLinhas(rows,br); p.atual=new Date().toISOString().slice(0,16); return {tipo:'param',nome:'Parâmetros do Focco',partes:{param:p},fontes:[['Parâmetros (estoque de segurança e lotes)',Object.keys(p.l).length,'']]}; }
  return {erro:'Não reconheci "'+nome+'" como Extrato nem como Parâmetros.'}; }
// relatórios em PDF do Focco
function anlPartesPdf(pags,nome){ const t=pags.join('\n');
  if(/RPRE0301/.test(t)){ const r=anlPdfPrevisao(pags); return r.erro?r:{tipo:'previsao',nome:'Previsão do Focco (RPRE0301)',partes:{prevMes:r},fontes:[['Itens com previsão',Object.keys(r.l).length,''],['Total previsto',anlN(Object.values(r.l).reduce((a,v)=>a+v,0)),''],['Exemplos',Object.keys(r.l).slice(0,4).map(k=>k+': '+anlN(r.l[k])).join(' · '),'']]}; }
  if(/RPLA0300/.test(t)){ const r=anlPdfPerfil(pags); return r.erro?r:{tipo:'perfil',nome:'Perfil do Focco (RPLA0300)',partes:{perfil:{atual:r.atual,rel:r.rel,l:r.l},paramP:{l:r.par}},fontes:[['Perfil (carteira, previsão semanal e ordens)',r.l.length,'']]}; }
  if(/REST0331|Almoxarifado:/i.test(t)){ const r=anlPdfSaldo(pags); return r.erro?r:{tipo:'saldo',nome:'Saldo em estoque do Focco',partes:{saldo:r},fontes:[['Saldo (almox 3 e 30)',Object.keys(r.l).length,'']]}; }
  return {erro:'Não reconheci o PDF "'+nome+'" (esperava Saldo, Perfil RPLA0300 ou Previsão RPRE0301).'}; }
const ANL_NUMRE=/^-?[\d.]+,\d+$/;
function anlPdfData(t){ const m=t.match(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/); if(!m) return ''; let hh=+(m[4]||0); const mm=+(m[5]||0), d=m[3]+'-'+m[2]+'-'+m[1];
  /* o Focco imprime a hora em 12h (sem AM/PM): relatório de hoje com hora que ainda não chegou de manhã é da tarde */ const ag=new Date(); if(m[4]&&d===hojeStr()&&hh<12&&(hh+12)*60+mm<=ag.getHours()*60+ag.getMinutes()) hh+=12;
  return d+'T'+pad(hh)+':'+pad(mm); }
// Saldo dos itens (FoccoERP REST0331): soma almox 3 + 30 (avarias e outros ficam de fora, como no script da planilha)
function anlPdfSaldo(pags){ const l={}; let cur=null, desc=false, n=0;
  const linhas=pags.join('\n').split('\n').map(s=>s.trim()).filter(Boolean);
  for(const s of linhas){
    const tk=s.split(' ');
    if(/^[A-Z]{1,4}\d{3,6}$/.test(tk[0])&&tk.length>=8&&tk.slice(-4).every(x=>ANL_NUMRE.test(x))&&/^\d+$/.test(tk[tk.length-5])){
      cur=tk[0]; l[cur]={d:tk.slice(1,-6).join(' '),a3:0,a30:0,seg:anlNumBR(tk[tk.length-4])}; desc=true; n++; continue; }
    const m=s.match(/^Almoxarifado:\s*(\d+)\b.*?\s(-?[\d.]+,\d+)\s+(-?[\d.]+,\d+)$/);
    if(m&&cur){ desc=false; const q=anlNumBR(m[3]); if(m[1]==='3') l[cur].a3+=q; else if(m[1]==='30') l[cur].a30+=q; continue; }
    if(desc&&cur&&!/^(FOCCOERP|Relat|Data|P[áa]g|Tmp|C[óo]d\.|Rep Seg|Total Geral)/i.test(s)&&s.length<60) l[cur].d+=' '+s;
    if(/^(FOCCOERP|Relat)/.test(s)) desc=false; }
  if(!n) return {erro:'Não encontrei itens neste PDF de saldo.'};
  const at=anlPdfData(pags[0]||''); const me=(pags[0]||'').match(/Empresa\s*:?\s*0*(\d{1,2})\b/i); return {atual:at,l,emp:me?String(+me[1]):null}; }
// Perfil de itens (Focco3i RPLA0300): movimentos com data fim e quantidade; o sinal vem do estoque projetado
function anlPdfPerfil(pags){ const out=[], par={}; let cur=null, est=null, rel='', n=0;
  const at=anlPdfData(pags[0]||'');
  const linhas=pags.join('\n').split('\n').map(s=>s.trim()).filter(Boolean);
  const TIPOS=/^(DC|DP|DD|DE|DI|OFA|OFP|OCP|OCL|AVR)\b/;
  for(const s of linhas){
    let m=s.match(/^Item:\s*([A-Z]{1,4}\d{3,6})\s+(.*?)\s+UM:\s*(\S+)/);
    if(m){ if(m[1]!==cur){ cur=m[1]; est=null; par[cur]={d:m[2].trim(),um:m[3]}; n++; } continue; }
    if(!cur) continue;
    const P=par[cur], num=re=>{ const x=s.match(re); return x?anlNumBR(x[1]):null; };
    if(/Est\. Segurança:/.test(s)){ P.seg=num(/Est\. Segurança:\s*(-?[\d.]+,\d+)/); P.trep=num(/Tempo Reposição:\s*(\d+)/); continue; }
    if(/Lote Min[ií]mo:/.test(s)){ P.lmin=num(/Lote Min[ií]mo:\s*([\d.]+,\d+)/); P.lmult=num(/Lote Múltiplo:\s*([\d.]+,\d+)/); P.lmax=num(/Lote Máximo:\s*([\d.]+,\d+)/); continue; }
    if(/Consumo Médio:/.test(s)){ P.cmed=num(/Consumo Médio:\s*([\d.]+,\d+)/); const ei=num(/Estoque Inicial:\s*(-?[\d.]+,\d+)/); if(est==null&&ei!=null) est=ei; continue; }
    if(!TIPOS.test(s)) continue;
    const tk=s.split(' '), t=tk[0]; const iq=tk.findIndex((x,i)=>i>0&&ANL_NUMRE.test(x)&&!/^\d{2}\/\d{2}\/\d{4}$/.test(x)); if(iq<0) continue;
    const datas=tk.slice(1,iq).filter(x=>/^\d{2}\/\d{2}\/\d{4}$/.test(x)); if(!datas.length) continue;
    const f=anlData(datas[datas.length-1]); const q=anlNumBR(tk[iq]); const ie=tk.findIndex((x,i)=>i>iq&&ANL_NUMRE.test(x)); const ep=ie>0?anlNumBR(tk[ie]):null;
    let sq; if(est!=null&&ep!=null&&Math.abs(ep-est-q)<0.6) sq=q; else if(est!=null&&ep!=null&&Math.abs(ep-est+q)<0.6) sq=-q; else sq=/^(DC|DP|DD)$/.test(t)?-q:/^(DE|DI)$/.test(t)?0:q;
    if(ep!=null) est=ep; const tt=(t==='DD'&&/^OFP/.test(tk[1]||''))?'DDP':t; /* DD de ordem planejada: não conta, como a OFP */ if(sq) out.push([cur,tt,f,Math.round(sq*1000)/1000]); if(f>rel&&false) rel=f; }
  if(!n) return {erro:'Não encontrei itens neste PDF de perfil.'};
  return {atual:at,rel:at.slice(0,10),l:out,par}; }
// Previsão (RPRE0301) — leitura provisória, sem arquivo de exemplo: linha começa com o código, tem a UM e depois previsto e realizado.
// A tela mostra o resultado e deixa escolher a competência antes de gravar.
function anlPdfPrevisao(pags){ const UM=/^(SC|UN|CX|BD|FD|KG|PC|PCT|TON|LT|MT|M2|GL|FR)$/; const l={}; let pend=null, n=0;
  const linhas=pags.join('\n').split('\n').map(s=>s.trim()).filter(Boolean);
  const pega=(cod,tk)=>{ let iu=-1; for(let i=tk.length-1;i>=0;i--){ if(UM.test(tk[i])&&tk.slice(i+1).some(x=>ANL_NUMRE.test(x)||/^-?\d+$/.test(x))){ iu=i; break; } } if(iu<0) return false;
    const ns=tk.slice(iu+1).filter(x=>ANL_NUMRE.test(x)||/^-?[\d.]+$/.test(x)).map(anlNumBR); if(!ns.length) return false; l[cod]=(l[cod]||0)+ns[0]; n++; return true; };
  for(const s of linhas){ let tk=s.split(' '); if(/^\d{1,3}$/.test(tk[0])&&/^[A-Z]{1,4}\d{3,6}$/.test(tk[1]||'')) tk=tk.slice(1);
    if(/^[A-Z]{1,4}\d{3,6}$/.test(tk[0])){ pend=pega(tk[0],tk)?null:tk[0]; continue; }
    if(pend&&pega(pend,tk)) pend=null; }
  if(!n) return {erro:'Não consegui ler este PDF de previsão. Me mande o arquivo para eu ajustar a leitura.'};
  const t=pags.slice(0,1).join('\n'); let comp='';
  let m=t.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(?:a|até|-|\|)\s*(\d{2})\/(\d{2})\/(\d{4})/); if(m) comp=m[3]+'-'+m[2];
  if(!comp){ m=t.match(/(?:Compet[êe]ncia|M[êe]s(?:\/Ano)?)[^\d]{0,12}(\d{1,2})\/(\d{4})/i); if(m) comp=m[2]+'-'+pad(+m[1]); }
  const at=anlPdfData(t); if(!comp) comp=(at||hojeStr()).slice(0,7);
  return {comp,l,atual:at,teste:true}; }

// ---------- junta as partes com o que já está no painel ----------
// base = S.anl.base (docs atuais); meses = {'AAAA-MM': doc de pcpvendas}; devolve os documentos a gravar
function anlMontar(partes,base,meses,agora){
  const em=agora||new Date().toISOString(), h=em.slice(0,10);
  const I0=(base.itens&&base.itens.l)||{}, L={}; for(const k in I0) L[k]=Object.assign({},I0[k]);
  const atual=Object.assign({},(base.itens&&base.itens.atual)||{});
  const docs={}, res=[];
  const P=partes;
  if(P.saldo){ for(const k in L){ if(L[k].sal){ L[k].a3=0; L[k].a30=0; delete L[k].emp; } }
    for(const k in P.saldo.l){ const s=P.saldo.l[k]; L[k]=Object.assign(L[k]||{},{a3:s.a3,a30:s.a30,sal:1}); if(s.d) L[k].d=s.d; if(s.emp) L[k].emp=s.emp; }
    atual.SALDO=P.saldo.atual||em.slice(0,16); if(P.saldo.empAt) atual.SALDO_E=P.saldo.empAt; else delete atual.SALDO_E; }
  if(P.paramP){ for(const k in P.paramP.l){ const p=P.paramP.l[k]; if(!L[k]) L[k]={}; const o=L[k]; if(!o.d&&p.d) o.d=p.d; if(p.um&&!o.um) o.um=p.um; ['lmin','lmax','lmult','seg','trep','cmed'].forEach(f=>{ if(p[f]!=null&&o[f]==null){ const v=Math.round(p[f]*1000)/1000; if(v) o[f]=v; } }); } }
  if(P.param){ for(const k in P.param.l){ const p=P.param.l[k]; if(!L[k]) L[k]={}; const o=L[k]; if(!o.d&&p.d) o.d=p.d; if(p.um) o.um=p.um; ['lmin','lmax','lmult','seg','trep','cmed'].forEach(f=>{ const v=Math.round((p[f]||0)*1000)/1000; if(v) o[f]=v; else delete o[f]; }); } atual.PARAMETROS=P.param.atual||em.slice(0,16); }
  if(P.cap){ for(const k in P.cap.l){ if(!L[k]) L[k]={}; const c=P.cap.l[k]; if(c.c30) L[k].c30=c.c30; if(c.c3) L[k].c3=c.c3; } atual.CAPACIDADE=P.cap.atual||em.slice(0,16); }
  if(P.lin){ for(const k in P.lin.l){ if(!L[k]) L[k]={}; const c=P.lin.l[k]; if(c.ln&&c.ln.length) L[k].ln=c.ln; if(c.peso) L[k].peso=c.peso; } }
  // não guardar parâmetros de itens que nunca aparecem (ex.: matérias-primas) — só os que têm saldo, perfil, capacidade ou linha
  const perfilL=P.perfil?P.perfil.l:((base.perfil&&base.perfil.l)||[]); const noPerfil=new Set(perfilL.map(x=>x[0]));
  for(const k in L){ const o=L[k]; if(!o.sal&&!noPerfil.has(k)&&!o.c30&&!o.c3&&!(o.ln&&o.ln.length)) delete L[k]; else { if(!o.a3) o.a3=0; if(!o.a30) o.a30=0; } }
  if(P.saldo||P.param||P.cap||P.lin) docs.itens={em,atual,l:L};
  if(P.perfil) docs.perfil={em,atual:P.perfil.atual||em.slice(0,16),rel:P.perfil.rel||'',l:P.perfil.l};
  // previsão e estoque do início do mês (históricos que antes ficavam na planilha)
  const pv0=base.prev||{}; const prev={em,mes:Object.assign({},pv0.mes||{}),est:Object.assign({},pv0.est||{}),estEm:Object.assign({},pv0.estEm||{}),mesEm:Object.assign({},pv0.mesEm||{})}; let mudouPrev=false;
  if(P.histPrev){ for(const cp in P.histPrev.mes){ prev.mes[cp]=P.histPrev.mes[cp]; prev.mesEm[cp]='planilha'; } mudouPrev=true; }
  if(P.fechEst){ for(const cp in P.fechEst){ prev.est[cp]=P.fechEst[cp].m; prev.estEm[cp]='fechamento '+P.fechEst[cp].emps.join('+'); res.push('Estoque do início de '+cp.slice(5)+'/'+cp.slice(0,4)+' gravado pelo saldo de fechamento.'); } mudouPrev=true; }
  if(P.histEst){ for(const cp in P.histEst.est){ prev.est[cp]=P.histEst.est[cp]; prev.estEm[cp]='planilha'; } mudouPrev=true; }
  if(P.prevMes){ prev.mes[P.prevMes.comp]=P.prevMes.l; prev.mesEm[P.prevMes.comp]=em.slice(0,10); mudouPrev=true; res.push('Previsão de '+P.prevMes.comp.slice(5)+'/'+P.prevMes.comp.slice(0,4)+' atualizada.'); }
  if(P.saldo){ const sd=(P.saldo.atual||em).slice(0,10), cp=sd.slice(0,7);
    if(!prev.est[cp]){ const m={}; for(const k in P.saldo.l){ const s=P.saldo.l[k]; m[k]=(s.a3||0)+(s.a30||0); } prev.est[cp]=m; prev.estEm[cp]=sd; mudouPrev=true; res.push('Primeiro saldo de '+cp.slice(5)+'/'+cp.slice(0,4)+' guardado como estoque do início do mês.'); } }
  if(mudouPrev) docs.prev=prev;
  // vendas: detalhe diário por mês (coleção pcpvendas) + resumo em pcpbase/vendas
  const mesesOut={};
  if(P.ext&&P.ext.rows.length){ const e=P.ext; const tocados={};
    e.rows.forEach(([k,d])=>{ tocados[d.slice(0,7)]=1; });
    Object.keys(tocados).forEach(cp=>{ const old=(meses[cp]&&meses[cp].d)||{}, nd={};
      // mantém os dias fora do período do arquivo; os dias do período são substituídos pelo arquivo (sem duplicar)
      for(const k in old) for(const dd in old[k]){ const iso=cp+'-'+dd; if(iso>=e.ini&&iso<=e.ate) continue; (nd[k]=nd[k]||{})[dd]=old[k][dd]; }
      mesesOut[cp]={d:nd,em}; });
    e.rows.forEach(([k,d,i,q])=>{ const cp=d.slice(0,7), dd=d.slice(8,10); const m=mesesOut[cp].d; ((m[k]=m[k]||{})[dd]=m[k][dd]||[0,0])[i]+=q; });
    for(const cp in mesesOut){ const m=mesesOut[cp].d; for(const k in m) for(const dd in m[k]) m[k][dd]=[Math.round(m[k][dd][0]*100)/100,Math.round(m[k][dd][1]*100)/100]; }
    const V0=base.vendas||{}; const todos=Object.assign({},meses,mesesOut);
    const mensal={}; for(const k in (V0.mensal||{})) mensal[k]=Object.assign({},V0.mensal[k]);
    for(const cp in mesesOut){ for(const k in mensal) delete mensal[k][cp]; const m=mesesOut[cp].d; for(const k in m){ let a=0,b=0; for(const dd in m[k]){ a+=m[k][dd][0]; b+=m[k][dd][1]; } (mensal[k]=mensal[k]||{})[cp]=[Math.round(a*100)/100,Math.round(b*100)/100]; } }
    const ate=[V0.ate||'',e.ate].sort().pop(), ini=[V0.ini||e.ini,e.ini].filter(Boolean).sort()[0];
    const lim=addDias(ate,-150), diario={};
    for(const cp in todos){ if(cp+'-31'<lim) continue; const m=todos[cp].d||{}; for(const k in m) for(const dd in m[k]){ const iso=cp+'-'+dd; if(iso<=lim||iso>ate) continue; (diario[k]=diario[k]||{})[iso]=m[k][dd]; } }
    docs.vendas={em,atual:P.ext.atual||em.slice(0,16),ini,ate,mensal,diario};
    res.push('Vendas e produção de '+dm(e.ini)+' a '+dm(e.ate)+' ('+Object.keys(mesesOut).length+' mês(es) atualizados, sem duplicar).'); }
  return {docs,meses:mesesOut,res};
}

// ---------- motor: projeção por item ----------
function anlPalete(c,l){ return paleteDe({produto:c,linha:l}); }
function anlLinhasDe(c,it){ const L=linhasOrd(); const pi=itemDe(c); let ls=(pi&&(pi.linhas||[]).length)?pi.linhas:((it&&it.ln)||[]); return ls.filter(l=>L.includes(l)); }
function anlUn(c,it){ const u=UNID[unidCod(c)]||UNID[(it&&it.um)||'']; return u?u.a:((it&&it.um)||'un.').toLowerCase(); }
function anlLote(q,it,c,l){ let mult=it.lmult>=1?it.lmult:0; if(!mult){ const p=anlPalete(c,l); if(p>0) mult=p; }
  let x=mult?Math.ceil(q/mult-1e-9)*mult:Math.ceil(q); if(it.lmin>0&&x<it.lmin) x=mult?Math.ceil(it.lmin/mult-1e-9)*mult:it.lmin;
  const n=it.lmax>0?Math.ceil(x/it.lmax-1e-9):1; return {q:x,n,max:it.lmax||0,mult}; }
function anlDados(){ const A=S.anl; if(A._c) return A._c; A._c=anlCalc(); Promise.resolve().then(()=>{ A._c=null; }); return A._c; } // vale só durante uma renderização
function anlCalc(){
  const B=S.anl.base, I=B.itens; if(!I||!I.l) return null;
  const C=anlCfg(), h=hojeStr();
  const dias=[]; { let d=h; for(let g=0;g<200&&dias.length<C.horiz;g++){ if(anlUtil(d)) dias.push(d); d=addDias(d,1); } }
  const n=dias.length;
  const ix=iso=>{ if(!iso||iso<=dias[0]) return 0; for(let i=0;i<n;i++) if(dias[i]>=iso) return i; return -1; };
  const P={}; let perfFim=''; ((B.perfil&&B.perfil.l)||[]).forEach(([c,t,f,q])=>{ (P[c]=P[c]||[]).push({t,f,q}); const fe=t==='DP'?addDias(f,6):f; if(fe>perfFim) perfFim=fe; });
  const V=B.vendas||{}; const ate=V.ate||addDias(h,-1); const jIni=addDias(ate,-C.janela+1); const nUt=Math.max(1,anlUteisEntre(jIni,addDias(ate,1)));
  const an=anuladas(); const OP={}, ordCod={};
  S.ordens.forEach(o=>{ const c=codigoDe(o); ordCod[o._id]=c; if(o.status==='aberta') (OP[c]=OP[c]||[]).push(o); });
  const sAt=I.atual&&I.atual.SALDO; const t0=sAt?new Date(sAt).toISOString():(I.em||'');
  const pos={}; S.entregas.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em||e.em<=t0) return; const c=ordCod[e.ordem]; if(c) pos[c]=(pos[c]||0)+(+e.qtd||0); });
  const PV={}; if(C.prev) (S.previsoes||[]).forEach(p=>{ if(p.status==='prevista'&&p.codigo) (PV[p.codigo]=PV[p.codigo]||[]).push(p); });
  const enc=new Set(C.enc), sDia=sAt?sAt.slice(0,10):'', pDia=((B.perfil||{}).atual||'').slice(0,10);
  const itens=[];
  Object.keys(I.l).forEach(c=>{
    const it=I.l[c]||{}; if(!it.sal) return; const ehEnc=enc.has(c)||anlEncAuto(c,it.d); const dd=(V.diario||{})[c]||{};
    // faturado (NFS do extrato) depois do dia do saldo: sai do saldo; o que foi faturado depois do Perfil também baixa a carteira
    let fatPos=0, fatCons=0; if(sDia) for(const k in dd){ if(k>sDia&&k<=h){ const q=dd[k][1]||0; fatPos+=q; if(!pDia||k>pDia) fatCons+=q; } }
    const base=(it.a3||0)+(it.a30||0), ps=pos[c]||0, saldo=base+ps-fatPos, seg=ehEnc?0:(it.seg||0);
    let vend=0; for(const k in dd){ if(k>=jIni&&k<=ate) vend+=dd[k][1]||0; }
    let media=vend/nUt, fonte='vendas'; if(!(media>0)&&it.cmed>0){ media=it.cmed/21; fonte='parametro'; } if(!(media>0)){ media=0; fonte=''; }
    const dC=new Array(n).fill(0), dP=new Array(n).fill(0), dM=new Array(n).fill(0);
    const pl=P[c]||[]; let atras=0, cart=0;
    pl.forEach(x=>{ if(!(x.q<0)) return; const q=-x.q;
      if(x.t==='DC'||x.t==='DD'){ const i=ix(x.f); if(x.f<h) atras+=q; if(i>=0){ dC[i]+=q; cart+=q; } }
      else if(x.t==='DP'){ const ws=[]; for(let k=0;k<7;k++){ const d=addDias(x.f,k); if(anlUtil(d)) ws.push(d); } if(!ws.length) return; const sh=q/ws.length; ws.forEach(d=>{ if(d<h) return; const i=dias.indexOf(d); if(i>=0) dP[i]+=sh; }); } });
    { let rc=fatCons; atras=Math.max(0,atras-fatCons); for(const A of [dC,dP]) for(let i=0;i<n&&rc>0;i++){ const x=Math.min(A[i],rc); A[i]-=x; rc-=x; } cart=dC.reduce((a,v)=>a+v,0); }
    const temPerfil=pl.length>0;
    if(!ehEnc) for(let i=0;i<n;i++){ if(!perfFim||dias[i]>perfFim) dM[i]=media; }
    const sup=new Array(n).fill(0), supL=dias.map(()=>[]), fila=[], depois=[];
    (OP[c]||[]).forEach(o=>{ const q=Math.max(0,(+o.total||0)-entregueDe(o)); if(!(q>0)) return; const d=dataEf(o);
      if(!o.linha||!d){ fila.push({o,q}); return; } const i=ix(d); if(i<0){ depois.push({o,q,d}); return; } sup[i]+=q; supL[i].push({t:'o',o,q}); });
    (PV[c]||[]).forEach(p=>{ const q=+p.qtd||0; if(!(q>0)) return; const i=ix(p.data); if(i<0) return; sup[i]+=q; supL[i].push({t:'p',p,q}); });
    let s=saldo, s2=saldo, minS=saldo, iR=-1, iS=-1, iR0=-1, demT=0; const proj=[];
    for(let i=0;i<n;i++){ const sai=dC[i]+dP[i]+dM[i]; demT+=sai; s+=sup[i]-sai; s2-=sai; proj.push({d:dias[i],ent:sup[i],sai,c:dC[i],p:dP[i],m:dM[i],s});
      if(s<minS) minS=s; if(iR<0&&s<-0.5) iR=i; if(iS<0&&seg>0&&s<seg-0.5) iS=i; if(iR0<0&&s2<-0.5) iR0=i; }
    const semGiro=ehEnc?(!(demT>0)&&!(saldo<0)):(!(demT>0)&&!(media>0)&&!(saldo<0));
    const firme=i=>!perfFim||dias[i]<=perfFim; // dentro do período do Perfil = demanda do sistema; depois = média de vendas
    const st=semGiro?'sem':(iR>=0&&firme(iR))?'falta':(iS>=0&&firme(iS))?'seg':(iR>=0||iS>=0)?'tend':'ok';
    const alvo=(iS>=0&&(iR<0||iS<iR))?iS:iR; /* primeiro dia com problema */ const need=(minS<seg-0.5)?(Math.max(seg,0)-minS):0;
    const linhas=anlLinhasDe(c,it);
    const acoes=[], lotes=[];
    if(need>0&&alvo>=0){
      // 1) ordens que chegam tarde → antecipar para o dia do problema; 2) ordens na fila sem linha → programar; 3) o resto vira lotes novos
      const sa=proj.map(p=>p.s), soma=(i0,q)=>{ for(let j=i0;j<n;j++) sa[j]+=q; };
      const cobre=()=>sa.every(v=>v>=Math.max(seg,0)-0.5);
      const tarde=[]; (OP[c]||[]).forEach(o=>{ const d=dataEf(o); if(!o.linha||!d) return; const i=ix(d); if(i>Math.max(alvo,1)||i<0){ /* ordem de hoje ou do próximo dia útil não entra como 'antecipar' */ const q=Math.max(0,(+o.total||0)-entregueDe(o)); if(q>0) tarde.push({o,q,d,i}); } });
      tarde.sort((x,y)=>x.d.localeCompare(y.d)).forEach(x=>{ if(cobre()) return; acoes.push({t:'antecipar',o:x.o,q:x.q,de:x.d,ate:dias[alvo]}); if(x.i>=0) soma(x.i,-x.q); soma(alvo,x.q); });
      fila.forEach(x=>{ if(cobre()) return; acoes.push({t:'programar',o:x.o,q:x.q,ate:dias[alvo]}); soma(alvo,x.q); });
      const mx=it.lmax>0?it.lmax:Infinity;
      for(let g=0;g<40;g++){ const i=sa.findIndex(v=>v<Math.max(seg,0)-0.5); if(i<0) break; const def=Math.max(seg,0)-Math.min(...sa.slice(i)); let q=anlLote(def,it,c,linhas[0]).q; /* lote cobre a necessidade restante do período, limitado ao lote máximo (como as OFP do sistema) */ if(q>mx) q=mx; if(!(q>0)) break; lotes.push({i,d:dias[i],q}); soma(i,q); }
      if(lotes.length){ const tot=lotes.reduce((x,l)=>x+l.q,0); acoes.push({t:'nova',q:tot,lotes,ate:lotes[0].d,q1:lotes[0].q}); }
    }
    itens.push({c,d:it.d||((itemDe(c)||{}).descricao)||'',it,un:anlUn(c,it),base,pos:ps,fat:fatPos,enc:ehEnc,saldo,seg,media,fonte,atras,cart,proj,sup,supL,fila,depois,iR,iS,iR0,alvo,minS,need,st,acoes,lotes,linhas,temPerfil,firmeAte:perfFim,
      prazo:alvo>=0?dias[alvo]:null,cob:media>0?saldo/media:null,ordens:OP[c]||[]});
  });
  const rk={falta:0,seg:1,tend:2,ok:3,sem:4};
  itens.sort((a,b)=>rk[a.st]-rk[b.st]||(a.alvo<0?99:a.alvo)-(b.alvo<0?99:b.alvo)||b.need-a.need||a.c.localeCompare(b.c));
  const R={dias,ix,itens,por:{},perfFim,ate,jIni,nUt,t0,h,sDia};
  itens.forEach(x=>R.por[x.c]=x);
  R.carga=anlCarga(R);
  return R;
}
// ---------- carga das linhas: programado + previsões + sugestões (pelo prazo) ----------
function anlCarga(R){
  const L=linhasOrd(), n=Math.min(10,R.dias.length), D=R.dias.slice(0,n), cell={};
  L.forEach(l=>cell[l]=D.map(()=>({prog:0,prev:0,sug:0,its:[]})));
  S.ordens.forEach(o=>{ if(o.status!=='aberta'||!o.linha||!cell[o.linha]) return; const q=Math.max(0,(+o.total||0)-entregueDe(o)); if(!(q>0)) return; const i=R.ix(dataEf(o)); if(i<0||i>=n) return; cell[o.linha][i].prog+=q; cell[o.linha][i].its.push({t:'o',o,q}); });
  (S.previsoes||[]).forEach(p=>{ if(p.status!=='prevista'||!cell[p.linha]) return; const q=+p.qtd||0; if(!(q>0)) return; const i=R.ix(p.data); if(i<0||i>=n) return; cell[p.linha][i].prev+=q; cell[p.linha][i].its.push({t:'p',p,q}); });
  const alocs=[], naoCabe=[], semCap=[], fila=[];
  R.itens.forEach((x,pri)=>{ const a=x.acoes.find(a=>a.t==='nova'); if(!a) return; a.sugLinha=x.linhas[0]||''; a.sugDia=null;
    const ls=x.linhas.filter(l=>capDe(l)>0&&cell[l]); if(!ls.length){ semCap.push({x,a}); return; }
    a.lotes.forEach((lt,k)=>{ if(lt.i<n) fila.push({x,a,lt,k,ls,pri}); }); });
  fila.sort((p,q)=>p.lt.i-q.lt.i||p.pri-q.pri);
  const txt=z=>z.t==='o'?z.o.produto:z.t==='p'?(z.p.produto||z.p.codigo):(z.x.c+' - '+(z.x.d||''));
  const custo=its=>{ const xs=its.map(z=>({produto:txt(z)})); return corAvaliar(corSugerida(xs)).n; };
  fila.forEach(f=>{ let rest=f.lt.q; const parts=[]; const livre=(l,i)=>{ const c=cell[l][i]; return capDe(l)-c.prog-c.prev-c.sug; };
    const cz=corDe(f.x.c+' - '+(f.x.d||'')); const porCor=cz&&f.ls.some(l=>corAtiva(l));
    // ordem de tentativa: sem cor = dia a dia (linha com mais folga); com cor = até o prazo, primeiro onde a cor soma menos limpezas
    let cands=[]; for(let i=0;i<n;i++) f.ls.forEach(l=>{ const v=livre(l,i); if(v>0.5) cands.push({l,i,v,dl:porCor&&corAtiva(l)&&i<=f.lt.i?custo(cell[l][i].its.concat([{t:'s',x:f.x}]))-custo(cell[l][i].its):0}); });
    cands.sort((a,b)=>{ const pa=a.i<=f.lt.i?0:1, pb=b.i<=f.lt.i?0:1; return pa-pb||(pa===0&&porCor?a.dl-b.dl:0)||a.i-b.i||b.v-a.v; });
    f.lt.limpas=0; const usados=new Set();
    for(const k of cands){ if(rest<=0.5) break; if(usados.has(k.i)) continue; const fr=livre(k.l,k.i); if(fr<=0.5) continue; usados.add(k.i);
      const q=Math.min(rest,fr); cell[k.l][k.i].sug+=q; cell[k.l][k.i].its.push({t:'s',x:f.x,q}); parts.push({l:k.l,i:k.i,q}); rest-=q; if(k.dl>0) f.lt.limpas+=k.dl; }
    parts.sort((a,b)=>a.i-b.i);
    f.lt.parts=parts; f.lt.tarde=parts.some(p=>p.i>f.lt.i)||rest>0.5; if(parts.length){ f.lt.linha=parts[0].l; f.lt.dia=D[parts[0].i]; }
    if(f.k===0&&parts.length){ f.a.sugLinha=parts[0].l; f.a.sugDia=D[parts[0].i]; }
    if(rest>0.5) naoCabe.push({x:f.x,a:f.a,lt:f.lt,rest}); alocs.push(f); });
  return {D,n,cell,alocs,naoCabe,semCap,L};
}

// ---------- telas ----------
S.anl={base:{},lidos:{},f:'agir',linha:'',busca:'',item:null,sug:null,imp:{lendo:false,arqs:[],grav:false},comp:null,mf:'todos',mbusca:'',mlinha:''};
const ANL_ST={falta:{t:'Falta',c:'crit'},seg:{t:'Abaixo do seg.',c:'warn'},tend:{t:'Tendência',c:'warn'},ok:{t:'Coberto',c:'ok'},sem:{t:'Sem giro',c:'neu'}};
const ANL_DIAS=['dom','seg','ter','qua','qui','sex','sáb'];
function anlQuando(iso){ if(!iso) return '—'; const h=hojeStr(); if(iso<=h) return 'hoje'; if(iso===addDias(h,1)) return 'amanhã'; return dm(iso); }
function anlPill(x){ const dR=x.iR>=0?x.proj[x.iR].d:null, dS=x.iS>=0?x.proj[x.iS].d:null; const q=anlQuando(x.st==='falta'?dR:x.st==='seg'?dS:x.prazo);
  if(x.st==='falta') return `<span class="pill crit">${dR<=hojeStr()?'Falta já':'Falta '+q}</span>`;
  if(x.st==='seg') return `<span class="pill warn">Abaixo do seg. ${q}</span>`;
  if(x.st==='tend') return `<span class="pill dash" title="Depois do período do Perfil a conta usa a média de vendas">Tendência: ${x.iR>=0?'falta':'abaixo do seg.'} ${q}</span>`;
  if(x.enc&&(x.st==='ok'||x.st==='sem')) return `<span class="pill neu">Sob encomenda</span>`;
  if(x.st==='ok') return `<span class="pill ok">Coberto</span>`;
  return `<span class="pill neu">Sem giro</span>`; }
function anlFrescor(){ const B=S.anl.base, I=B.itens||{}, a=I.atual||{}, V=B.vendas||{}, P=B.prev||{}, h=hojeStr();
  const idade=iso=>iso?anlUteisEntre(iso.slice(0,10),h):99;
  const ch=(rot,iso,lim,txt)=>{ if(!iso) return `<span class="velho">${rot}: sem dados</span>`; const v=idade(iso)>lim; return `<span class="${v?'velho':''}" title="${v?'Desatualizado':''}">${rot} <b>${txt||(dm(iso.slice(0,10))+(iso.length>10?' '+iso.slice(11,16):''))}</b></span>`; };
  const pf=B.perfil||{}; const comps=Object.keys(P.mes||{}).sort(); const cp=h.slice(0,7);
  return `<div class="anl-fresh">${ch('Saldo',a.SALDO,1)}${ch('Perfil',pf.atual,1)}${ch('Vendas até',V.ate,2,dm(V.ate))}${ch('Parâmetros',a.PARAMETROS,30)}<span class="${(P.mes||{})[cp]?'':'velho'}">Previsão <b>${(P.mes||{})[cp]?cp.slice(5)+'/'+cp.slice(0,4):'do mês não importada'}</b></span><button class="lnk" data-go="anlbase">Atualizar base</button></div>`; }
function anlVazio(){ return `<section class="card anl-vazio"><div class="label">A BASE AINDA NÃO FOI CARREGADA</div>
  <p class="sub" style="max-width:640px">A análise cruza o que vem do FoccoERP (saldo, perfil, parâmetros, extrato e previsão) com a programação deste painel. Para começar, vá em <b>Base de dados</b> e arraste os arquivos. Na primeira vez, arraste também a planilha BASE DE DADOS PCP (.xlsx) para trazer o histórico.</p>
  <button class="btn" data-go="anlbase">${ic('baixar',18,2)}Ir para Base de dados</button></section>`; }
function anlHead(tit,sub,dir){ return `<div class="head"><div><div class="eyebrow">ANÁLISE PCP</div><h1>${tit}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>${dir||''}</div>`; }
function anlAcaoTxt(x,a){ const u=x.un, q=anlQuando(a.ate);
  if(a.t==='antecipar') return `Antecipar a ordem <b class="num">${esc(a.o.num)}</b> (${anlN(a.q)} ${u}) de ${dm(a.de)} para ${q==='hoje'?'hoje':'até '+q}`;
  if(a.t==='programar') return `Programar a ordem <b class="num">${esc(a.o.num)}</b> (${anlN(a.q)} ${u}), que está na fila sem linha, ${q==='hoje'?'hoje':'até '+q}`;
  const n=a.lotes.length; return n>1?`Programar <b class="num">${n} lotes</b> (${anlN(a.q)} ${u} no período). O 1º, de ${anlN(a.q1)} ${u}, ${q==='hoje'?'para hoje':'até '+q}`:`Programar <b class="num">${anlN(a.q)} ${u}</b> ${q==='hoje'?'para hoje':'até '+q}`; }
function anlAcaoBtn(x,a){ if(a.t==='nova') return `<button class="fpbtn" data-act="anl-sug" data-c="${esc(x.c)}">${ic('mais',14,2.2)}Criar previsão</button>`;
  return `<button class="fpbtn" data-act="anl-ordem" data-id="${esc(a.o._id)}">${a.t==='antecipar'?'Abrir ordem':'Programar'}</button>`; }
function anlFiltra(R){ const A=S.anl, q=anlNorm(A.busca);
  return R.itens.filter(x=>{ if(A.f==='agir'&&!(x.st==='falta'||x.st==='seg')) return false; if(['falta','seg','tend','ok'].includes(A.f)&&x.st!==A.f) return false; if(A.f==='todos'&&x.st==='sem') return false;
    if(A.linha&&!x.linhas.includes(A.linha)) return false; if(q&&!anlNorm(x.c+' '+x.d).includes(q)) return false; return true; }); }
function anlFiltros(R,n){ const A=S.anl, cnt=k=>R.itens.filter(x=>k==='agir'?(x.st==='falta'||x.st==='seg'):k==='todos'?x.st!=='sem':x.st===k).length;
  const ops=[['agir','Precisa agir'],['falta','Falta'],['seg','Abaixo do seg.'],['tend','Tendência'],['ok','Coberto'],['todos','Todos']];
  return `<section class="card ofil"><div class="frow"><span class="flab">MOSTRAR</span><div class="fline"><div class="seg">${ops.map(([k,l])=>`<button data-act="anl-f" data-v="${k}" aria-pressed="${A.f===k}">${l} <small class="num">${cnt(k)}</small></button>`).join('')}</div></div></div>
   <div class="frow"><span class="flab">LINHA</span><div class="fline"><select class="txt" id="anl-linha" style="height:40px;width:auto;min-width:170px"><option value="">Todas as linhas</option>${linhasOrd().map(l=>`<option ${A.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select>
    <span class="fcount num">${n} ${n===1?'item':'itens'}</span><label class="srch">${ic('lupa',16,2)}<input class="txt" id="anl-busca" value="${esc(A.busca)}" placeholder="Buscar código ou produto" autocomplete="off"></label></div></div></section>`; }

function anlView(v){ const R=anlDados(); let h='';
  if(v==='anlbase') h=vAnlBase(R);
  else if(v==='anlrit') h=vRit();
  else if(!R) h=anlHead(ANL_T[v]||'Análise PCP','')+(S.anl.lidos.itens||S.dbOk===false?anlVazio():'<div class="empty">Carregando a base…</div>');
  else h=v==='anlres'?vAnlRes(R):v==='anlnec'?vAnlNec(R):v==='anlproj'?vAnlProj(R):v==='anllin'?vAnlLin(R):v==='anlapt'?vAnlApt(R):v==='anlest'?vAnlEst(R):v==='anlace'?vAnlAce(R):vAnlMes(R);
  return banner()+h+(S.anl.item&&R?anlModal(R):''); }
const ANL_T={anlres:'Resumo',anlnec:'Necessidades',anlproj:'Projeção de estoque',anllin:'Carga das linhas',anlmes:'Previsão mensal',anlrit:'Previsto × Realizado',anlest:'Estoques',anlapt:'Painel × sistema',anlace:'Acerto da projeção',anlbase:'Base de dados'};

// --- Resumo ---
function vAnlRes(R){ const its=R.itens, h=hojeStr(), n3=R.dias[Math.min(2,R.dias.length-1)];
  const falta=its.filter(x=>x.st==='falta'), f3=falta.filter(x=>x.prazo<=n3), seg=its.filter(x=>x.st==='seg');
  const segHoje=its.filter(x=>x.seg>0&&x.saldo<x.seg&&x.st!=='sem').length;
  const atr=its.filter(x=>x.atras>0&&x.atras>x.saldo); const atrQ=atr.reduce((a,x)=>a+Math.min(x.atras,x.atras-x.saldo),0);
  const ords=[]; its.forEach(x=>{ if(x.st==='falta'||x.st==='seg') x.acoes.forEach(a=>{ if(a.t!=='nova') ords.push({x,a}); }); });
  const acts=[]; its.forEach(x=>{ if(x.st==='falta'||x.st==='seg') x.acoes.forEach(a=>acts.push({x,a})); });
  acts.sort((p,q)=>p.a.ate.localeCompare(q.a.ate)||(p.x.st===q.x.st?0:p.x.st==='falta'?-1:1));
  const M=anlMesDados(R,h.slice(0,7));
  const C=R.carga, L=C.L.filter(l=>capDe(l)>0), nd=Math.min(5,C.n);
  return `${anlHead('Resumo','O que precisa de ação, cruzando a base do sistema com a programação do painel.')}
  ${anlFrescor()}
  <div class="resumo">
   <div><div class="k">Falta prevista</div><div class="v crit num">${falta.length} ${falta.length===1?'item':'itens'}</div><small class="sub" style="margin:0;font-size:12px">${f3.length} até ${anlQuando(n3)}</small></div>
   <div><div class="k">Abaixo do est. de segurança</div><div class="v warn num">${segHoje} hoje</div><small class="sub" style="margin:0;font-size:12px">+${seg.length} ${seg.length===1?'vai ficar':'vão ficar'} no período</small></div>
   <div><div class="k">Carteira sem estoque</div><div class="v ${atr.length?'crit':'ok'} num">${atr.length} ${atr.length===1?'item':'itens'}</div><small class="sub" style="margin:0;font-size:12px">${anlN(atrQ)} em pedidos vencidos</small></div>
   <div><div class="k">Ordens a mexer</div><div class="v ${ords.length?'warn':'ok'} num">${ords.length}</div><small class="sub" style="margin:0;font-size:12px">antecipar ou programar</small></div>
  </div>
  <div class="md-grid">
   <section class="card"><div class="head" style="align-items:baseline"><div class="label">O QUE FAZER · POR PRAZO</div><button class="lnk" data-go="anlnec">Ver todos os itens</button></div>
    ${acts.length?acts.slice(0,14).map(({x,a})=>`<div class="anl-act">
      <span class="anl-dt ${a.ate<=h?'crit':''} num"><b>${anlQuando(a.ate)}</b><small>${x.st==='falta'?'falta':'seg.'}</small></span>
      <span class="op" data-act="anl-item" data-c="${esc(x.c)}" role="button" tabindex="0"><b>${esc(x.d||x.c)}</b><small class="num">${esc(x.c)} · ${anlAcaoTxt(x,a)}</small></span>
      ${anlAcaoBtn(x,a)}</div>`).join(''):'<div class="empty">Nada urgente: todos os itens com demanda estão cobertos no período.</div>'}
    ${acts.length>14?`<div style="padding-top:8px"><button class="lnk" data-go="anlnec">Mais ${acts.length-14} ações em Necessidades</button></div>`:''}</section>
   <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
    <section class="card"><div class="head" style="align-items:baseline"><div class="label">CARGA DAS LINHAS · ${nd} DIAS</div><button class="lnk" data-go="anllin">Detalhe</button></div>
     ${L.length?L.map(l=>{ const cap=capDe(l); return `<div class="anl-mini"><b>${esc(l)}</b><div class="anl-mdias">${C.cell[l].slice(0,nd).map((c,i)=>{ const p=(c.prog+c.prev)/cap, t=(c.prog+c.prev+c.sug)/cap; return `<span title="${dm(C.D[i])}: programado ${anlN(c.prog+c.prev)} + sugerido ${anlN(c.sug)} de ${anlN(cap)}"><i class="anl-bb"><i class="p" style="height:${Math.min(100,p*100)}%"></i><i class="s" style="height:${Math.max(0,Math.min(100,t*100)-Math.min(100,p*100))}%"></i></i><small>${ANL_DIAS[new Date(C.D[i]+'T12:00:00').getDay()]}</small></span>`; }).join('')}</div></div>`; }).join('')+`<div class="legend" style="margin-top:8px"><span><i style="background:var(--teal)"></i>Programado</span><span><i class="anl-hatch"></i>Sugerido pela análise</span></div>`
      :'<div class="sub" style="margin:0">Nenhuma linha com capacidade por dia cadastrada. <button class="lnk" data-go="anllin">Cadastrar</button></div>'}${anlCimentoHtml(R,true)}</section>
    <section class="card"><div class="head" style="align-items:baseline"><div class="label">MÊS · FATURADO × PREVISTO</div><button class="lnk" data-go="anlmes">Detalhe</button></div>
     ${M?`<div class="anl-mes1"><div><span class="sub" style="margin:0;font-size:12px">Faturado até ${dm(M.ate)}</span><b class="num">${M.prev?Math.round(M.fat/M.prev*100):0}%</b><small class="num">${anlN(M.fat)} de ${anlN(M.prev)}</small></div>
      <div><span class="sub" style="margin:0;font-size:12px">No ritmo atual, fecha em</span><b class="num ${M.projPct>=100?'ok':M.projPct>=80?'warn':'crit'}">${M.projPct}%</b><small class="num">${M.du} de ${M.dt} dias úteis</small></div></div>`:'<div class="sub" style="margin:0">Sem previsão importada para este mês.</div>'}</section>
   </div></div>`; }

// --- Necessidades ---
function vAnlNec(R){ const xs=anlFiltra(R);
  return `${anlHead('Necessidades','Cada item com saldo, demanda e o que fazer. Clique para ver a projeção dia a dia.',`<button class="btn sec" data-act="anl-xls" data-v="nec" style="height:42px">${ic('baixar',16,2)}Exportar Excel</button>`)}
  ${anlFrescor()}${anlFiltros(R,xs.length)}
  <section class="card" style="padding:6px 18px 10px">
   <div class="anl-r ohead"><span>Situação</span><span>Produto</span><span class="nr">Saldo</span><span class="nr">Venda/dia</span><span>O que fazer</span></div>
   ${xs.length?xs.slice(0,200).map(x=>{ const a=x.acoes[0]; return `<div class="anl-r" data-act="anl-item" data-c="${esc(x.c)}" role="button" tabindex="0">
     <span class="anl-st">${anlPill(x)}${x.st==='ok'&&x.iR0>=0?'<small>pela programação</small>':''}</span>
     <span class="op"><b>${esc(x.d||x.c)}</b><small class="num">${esc(x.c)}${x.linhas.length?' · '+esc(x.linhas.join(', ')):''}</small></span>
     <span class="nr num" data-l="Saldo"><b>${anlN(x.saldo)}</b><small>${x.seg?'seg. '+anlN(x.seg):'sem seg.'}</small></span>
     <span class="nr num" data-l="Venda/dia"><b>${x.media?anlN(x.media):'—'}</b><small>${x.cob!=null?'cobre '+(x.cob>=99?'99+':Math.floor(x.cob))+' d':'—'}</small></span>
     <span class="anl-ac">${a?`<span>${anlAcaoTxt(x,a)}${x.acoes.length>1?` <small>+${x.acoes.length-1}</small>`:''}</span>${anlAcaoBtn(x,a)}`:`<span class="sub" style="margin:0;font-size:12.5px">${x.st==='tend'?'Pela média de vendas. Ainda sem pedido no sistema.':x.atras>0?'Carteira vencida coberta pelo saldo.':'Nada a fazer.'}</span>`}</span>
    </div>`; }).join(''):'<div class="empty">Nenhum item com esses filtros.</div>'}
  </section>`; }

// --- Projeção (mapa de calor) ---
function vAnlProj(R){ const xs=anlFiltra(R).slice(0,80), D=R.dias, h=hojeStr();
  return `${anlHead('Projeção de estoque','Saldo previsto no fim de cada dia útil: saldo + ordens e previsões programadas − carteira, previsão semanal do sistema e média de vendas.')}
  ${anlFiltros(R,xs.length)}
  <div class="legend"><span><i style="background:var(--crit-tint);outline:1px solid var(--crit)"></i>Falta (negativo)</span><span><i style="background:var(--warn-tint);outline:1px solid var(--warn)"></i>Abaixo do seg.</span><span><i style="background:var(--surface);outline:1px solid var(--line)"></i>Coberto</span><span>▲ entra produção</span><span><i style="border-top:2px dashed var(--faint);height:0;width:14px;border-radius:0"></i>depois de ${dm(R.perfFim)} a demanda é a média de vendas</span></div>
  <div class="calscroll"><table class="anl-hm"><thead><tr><th class="anl-hi">Item</th>${D.map(d=>{ const dt=new Date(d+'T12:00:00'); return `<th class="${d===h?'hoje':''} ${R.perfFim&&d>R.perfFim?'med':''}">${ANL_DIAS[dt.getDay()]}<small>${dm(d)}</small></th>`; }).join('')}</tr></thead>
   <tbody>${xs.map(x=>`<tr><th class="anl-hi" data-act="anl-item" data-c="${esc(x.c)}" role="button" tabindex="0"><b>${esc(x.c)}</b><small>${esc((x.d||'').slice(0,34))}</small></th>${x.proj.map((p,i)=>{ const cl=p.s<-0.5?'f':(x.seg>0&&p.s<x.seg-0.5)?'s':''; const tip=`${x.c} · ${dm(p.d)}\nEntra: ${anlN(p.ent)}\nSai: ${anlN(p.sai)} (carteira ${anlN(p.c)} · previsão ${anlN(p.p)} · média ${anlN(p.m)})\nSaldo: ${anlN(p.s)} ${x.un}`;
      return `<td class="${cl} ${R.perfFim&&p.d>R.perfFim?'med':''}" title="${esc(tip)}">${p.ent>0?'<i>▲</i>':''}${anlK(p.s)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
  ${xs.length?'':'<div class="empty">Nenhum item com esses filtros.</div>'}`; }

// --- Carga das linhas ---
function vAnlLin(R){ const C=R.carga, h=hojeStr(); const L=C.L.filter(l=>capDe(l)>0||C.cell[l].some(c=>c.prog+c.prev>0));
  const lotes=C.alocs.slice().sort((a,b)=>a.lt.i-b.lt.i);
  const U=anlMontUlt();
  return `${anlHead('Carga das linhas','Próximos '+C.n+' dias úteis. O programado vem das ordens e previsões do painel. O sugerido são os lotes que a análise encaixou na capacidade livre, por ordem de prazo.',`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${U?`<button class="lnk" data-act="anl-mont-desf" ${S.anl.desf===U.id?'style="color:var(--crit-ink)"':''}>${S.anl.desf===U.id?'Confirmar: excluir as '+U.n+' previsões da última montagem':'Desfazer última montagem ('+U.n+')'}</button>`:''}${lotes.length&&!S.anl.mont?`<button class="btn" data-act="anl-mont">${ic('calendario',18,2)}Montar semana no calendário</button>`:''}</div>`)}
  ${anlCorAviso(C)}
  ${anlMontPainel(R)}
  <div class="calscroll"><div class="anl-cg" style="grid-template-columns:150px repeat(${C.n},minmax(92px,1fr))">
   <div class="ch ch0">Linha</div>${C.D.map(d=>`<div class="ch ${d===h?'hoje':''}">${ANL_DIAS[new Date(d+'T12:00:00').getDay()].toUpperCase()}<small>${dm(d)}</small></div>`).join('')}
   ${L.map(l=>{ const cap=capDe(l); return `<div class="cl"><b>${esc(l)}</b><small class="num">${cap?anlN(cap)+'/dia':'sem capacidade'}</small></div>${C.cell[l].map((c,i)=>{ const tot=c.prog+c.prev+c.sug;
      const pc=cap?Math.round(tot/cap*100):null; const w=v=>cap?Math.min(100,v/cap*100):0;
      return `<div class="cc ${C.D[i]===h?'hoje':''}" title="${esc(c.its.map(z=>z.t==='o'?'Ordem '+z.o.num+' · '+codigoDe(z.o)+': '+anlN(z.q):z.t==='p'?'Previsão '+z.p.codigo+': '+anlN(z.q):'Sugestão '+z.x.c+': '+anlN(z.q)).join('\n'))}">
        ${cap?`<div class="anl-cb"><i class="p" style="width:${w(c.prog)}%"></i><i class="v" style="width:${w(c.prev)}%"></i><i class="s" style="width:${Math.max(0,Math.min(100-w(c.prog)-w(c.prev),w(c.sug)))}%"></i></div><b class="num ${pc>100?'anl-over':''}">${pc}%</b><small class="num">${tot<cap?'livre '+anlN(cap-tot):tot>cap?'passa '+anlN(tot-cap):'cheia'}</small>`:(tot?`<b class="num">${anlN(tot)}</b><small>programado</small>`:'<small>—</small>')}${anlCorCel(l,c)}</div>`; }).join('')}`; }).join('')}
  </div></div>
  <div class="legend"><span><i style="background:var(--teal)"></i>Ordens programadas</span><span><i style="background:var(--teal-tint);outline:1px dashed var(--teal)"></i>Previsões</span><span><i class="anl-hatch"></i>Sugerido pela análise</span></div>
  <div class="two"><section class="card cim"><div class="label">CIMENTO × PROGRAMADO + SUGERIDO</div>${anlCimentoHtml(R,false)}</section>
   <section class="card"><div class="label" style="margin-bottom:6px">CAPACIDADE POR DIA DAS LINHAS</div>${linhasOrd().map(l=>`<div class="anl-cap"><b>${esc(l)}</b><input class="txt num" id="anl-cap-${esc(l).replace(/[^A-Za-z0-9]/g,'_')}" inputmode="numeric" value="${capDe(l)||''}" placeholder="por dia"><button class="fpbtn" data-act="anl-cap" data-l="${esc(l)}">Salvar</button></div>`).join('')}
    <div class="sub" style="margin:6px 0 0;font-size:12px">Na unidade do que a linha produz (sacos, unidades…). É a mesma capacidade dos Ajustes, usada também na Programação.</div></section></div>
  <div class="two">
   <section class="card"><div class="label" style="margin-bottom:6px">LOTES SUGERIDOS (${lotes.length})</div>
    ${lotes.length?lotes.map(f=>`<div class="anl-act"><span class="anl-dt ${f.lt.tarde?'crit':''} num"><b>${f.lt.dia?dm(f.lt.dia):'—'}</b><small>${esc(f.lt.linha||'')}</small></span>
      <span class="op" data-act="anl-item" data-c="${esc(f.x.c)}" role="button" tabindex="0"><b>${esc(f.x.d||f.x.c)}</b><small class="num">${esc(f.x.c)} · ${anlN(f.lt.q)} ${f.x.un} · precisa até ${anlQuando(f.lt.d)}${f.lt.tarde?' · <span style="color:var(--crit-ink)">não cabe antes do prazo</span>':''}${f.lt.parts&&f.lt.parts.length>1?' · dividido em '+f.lt.parts.length+' partes':''}</small></span>
      <button class="fpbtn" data-act="anl-sug" data-c="${esc(f.x.c)}" data-k="${f.k}">${ic('mais',14,2.2)}Criar previsão</button></div>`).join(''):'<div class="empty">Nenhum lote novo a encaixar nos próximos dias.</div>'}</section>
   <section class="card"><div class="label" style="margin-bottom:6px">PRECISAM DE PRODUÇÃO EM LINHA SEM CAPACIDADE CADASTRADA (${C.semCap.length})</div>
    <div class="sub" style="margin:0 0 8px;font-size:12.5px">Cadastre a capacidade por dia dessas linhas em <button class="lnk" data-go="ajustes" style="padding:0">Ajustes</button> para a análise conseguir encaixar os lotes.</div>
    ${C.semCap.length?C.semCap.slice(0,40).map(({x,a})=>`<div class="impl" data-act="anl-item" data-c="${esc(x.c)}" role="button" tabindex="0" style="cursor:pointer"><span class="num"><b>${esc(x.c)}</b> · ${esc((x.d||'').slice(0,40))}</span><span class="num">${esc(x.linhas.join(', ')||'sem linha')} · ${anlN(a.q)} ${x.un}</span></div>`).join(''):'<div class="empty" style="padding:12px">Nenhum.</div>'}</section>
  </div>
  ${anlInsCard(R)}`; }

// --- Previsão do mês ---
function anlMesDados(R,cp){ const P=S.anl.base.prev||{}, V=S.anl.base.vendas||{}; const pm=(P.mes||{})[cp]; if(!pm) return null;
  const est=(P.est||{})[cp]||{}, h=hojeStr(), cur=cp===h.slice(0,7);
  const ini=cp+'-01', fim=addDias(new Date(+cp.slice(0,4),+cp.slice(5,7),0).toISOString().slice(0,10),0);
  const ultimo=hojeStr(new Date(+cp.slice(0,4),+cp.slice(5,7),0));
  const ate=cur?(V.ate&&V.ate.slice(0,7)===cp?V.ate:addDias(h,-1)):ultimo;
  const dt=anlUteisEntre(ini,addDias(ultimo,1)), du=Math.max(1,Math.min(dt,anlUteisEntre(ini,addDias(ate,1))));
  const rows=[]; const cods=new Set(Object.keys(pm)); let tp=0,tf=0,tpr=0;
  cods.forEach(c=>{ const prev=pm[c]||0; const mm=((V.mensal||{})[c]||{})[cp]||[0,0]; const prod=mm[0], fat=mm[1]; if(!prev&&!fat) return;
    const x=R&&R.por[c]; const proj=cur?Math.round(fat/du*dt):fat; const pct=prev>0?Math.round(fat/prev*100):null, pp=prev>0?Math.round(proj/prev*100):null;
    const falta=Math.max(0,prev-fat); const pend=x?x.ordens.reduce((a,o)=>a+Math.max(0,(+o.total||0)-entregueDe(o)),0):0;
    const prodF=cur&&x?Math.max(0,falta-Math.max(0,x.saldo)-pend):null;
    rows.push({c,d:(x&&x.d)||((S.anl.base.itens||{}).l||{})[c]?.d||'',prev,prod,fat,est:est[c]||0,proj,pct,pp,falta,prodF,linhas:x?x.linhas:[],un:x?x.un:'',x});
    tp+=prev; tf+=fat; tpr+=prod; });
  return {cp,cur,rows,prev:tp,fat:tf,prod:tpr,ate,du,dt,projPct:tp?Math.round(tf/du*dt/tp*100):0,estEm:(P.estEm||{})[cp]}; }
function anlGrafMeses(comps,R){ const ds=comps.map(c=>anlMesDados(R,c)).filter(Boolean); if(!ds.length) return '';
  const W=640,H=210,pl=46,pb=26,pt=14, mx=Math.max(1,...ds.map(d=>Math.max(d.prev,d.prod,d.fat)))*1.08; const gw=(W-pl-8)/ds.length, bw=Math.min(28,gw*0.26);
  const y=v=>pt+(H-pt-pb)*(1-v/mx), nm=cp=>['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+cp.slice(5,7)-1];
  const tk=[0,.25,.5,.75,1].map(f=>mx/1.08*f);
  return `<div class="head" style="align-items:baseline;margin-bottom:6px"><div class="label">POR COMPETÊNCIA (TODOS OS ITENS)</div><div class="legend"><span><i style="background:var(--anl-s1)"></i>Produzido</span><span><i style="background:var(--anl-s2)"></i>Faturado</span><span><i style="background:var(--ink);height:2px;border-radius:0"></i>Previsto</span></div></div>
  <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Produzido, faturado e previsto por mês">
   ${tk.map(v=>`<line x1="${pl}" x2="${W-8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${anlK(v)}</text>`).join('')}
   ${ds.map((d,i)=>{ const cx=pl+gw*i+gw/2; const b=(v,x,cor,rot)=>`<rect x="${x}" y="${y(v)}" width="${bw}" height="${Math.max(0,H-pb-y(v))}" rx="3" fill="${cor}"><title>${rot} ${nm(d.cp)}: ${anlN(v)}</title></rect>`;
     return `${b(d.prod,cx-bw-1,'var(--anl-s1)','Produzido')}${b(d.fat,cx+1,'var(--anl-s2)','Faturado')}<line x1="${cx-bw-6}" x2="${cx+bw+6}" y1="${y(d.prev)}" y2="${y(d.prev)}" stroke="var(--ink)" stroke-width="2"><title>Previsto ${nm(d.cp)}: ${anlN(d.prev)}</title></line>
      <text x="${cx}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--muted)">${nm(d.cp)}${d.cur?' (até '+dm(d.ate)+')':''}</text>`; }).join('')}
  </svg>`; }

// --- Base de dados ---
function vAnlBase(R){ const B=S.anl.base, M=B.meta||{}, I=B.itens||{}, a=I.atual||{}, P=B.prev||{}, V=B.vendas||{}, pf=B.perfil||{}, C=anlCfg(), imp=S.anl.imp;
  const comps=o=>Object.keys(o||{}).sort().map(k=>k.slice(5)+'/'+k.slice(2,4)).join(', ')||'—';
  const linha=(n,f,d,obs)=>`<div class="impl"><span><b>${n}</b> <small style="color:var(--muted)">${f}</small></span><span class="num">${d}${obs?' · '+obs:''}</span></div>`;
  const qd=iso=>iso?dm(iso.slice(0,10))+(iso.length>10?' '+iso.slice(11,16):''):'—';
  const nIt=Object.values(I.l||{}).filter(x=>x.sal).length;
  return `${anlHead('Base de dados','Arquivos do FoccoERP que alimentam a análise. Não precisa mais passar pela planilha.')}
  ${anlConfere(R)}
  <section class="card" id="anl-imp-card"><div class="label" style="margin-bottom:8px">IMPORTAR ARQUIVOS</div>
   <label class="anl-drop" id="anl-drop"><input type="file" id="anl-arq" multiple accept=".pdf,.xls,.xlsx,.htm,.html" hidden>
    ${ic('baixar',26,2)}<b>${imp.lendo?'Lendo arquivos…':'Arraste aqui ou clique para escolher'}</b>
    <span class="sub" style="margin:0;font-size:12.5px">Saldo (PDF) · Perfil RPLA0300 (PDF) · Previsão RPRE0301 (PDF) · Parâmetros (XLS) · Extrato (XLS). Pode mandar vários de uma vez. O painel reconhece cada um.</span></label>
   ${imp.arqs.length?`<div class="impgr">${imp.arqs.map(f=>`<div><b>${esc(f.arquivo)}</b>${f.erro?`<div class="av warn" style="margin-top:4px"><span>${esc(f.erro)}</span></div>`:`<div class="sub" style="margin:2px 0 4px;font-size:12.5px">${esc(f.nome)}</div>${f.aviso?`<div class="av warn" style="margin:4px 0"><span>${esc(f.aviso)}</span></div>`:''}${f.partes&&f.partes.saldo?`<label class="impl" style="align-items:center"><span>Usar como <b>estoque do início do mês</b> (saldo de fechamento)<small style="display:block;color:var(--muted);font-size:11.5px">Marque se você tirou este saldo com a data do último dia do mês anterior. Ele não troca o saldo de hoje.</small></span><select class="txt" data-anl-fech="${imp.arqs.indexOf(f)}" style="height:34px;width:auto"><option value="">Não, é o saldo de agora</option>${[0,1].map(k=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+k-0); const cp=d.getFullYear()+'-'+pad(d.getMonth()+1); return `<option value="${cp}" ${f.partes.saldo.fech===cp?'selected':''}>Sim, início de ${cp.slice(5)}/${cp.slice(0,4)}</option>`; }).join('')}</select></label>`:''}${f.partes&&f.partes.saldo&&f.partes.saldo.emp?`<label class="impl" style="align-items:center"><span>Empresa deste saldo${f.partes.saldo.empAuto?' <small style="color:var(--warn-ink)">(confira)</small>':''}</span><select class="txt" data-anl-emp="${imp.arqs.indexOf(f)}" style="height:34px;width:auto">${[...new Set(['1','9',f.partes.saldo.emp])].map(e=>`<option value="${e}" ${f.partes.saldo.emp===e?'selected':''}>Empresa ${e}</option>`).join('')}</select></label>`:''}${f.partes&&f.partes.prevMes?`<label class="impl" style="align-items:center"><span>Competência desta previsão</span><select class="txt" data-anl-comp="${imp.arqs.indexOf(f)}" style="height:34px;width:auto">${[-1,0,1,2].map(k=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+k); const cp=d.getFullYear()+'-'+pad(d.getMonth()+1); return `<option value="${cp}" ${f.partes.prevMes.comp===cp?'selected':''}>${cp.slice(5)}/${cp.slice(0,4)}</option>`; }).join('')}${[-1,0,1,2].some(k=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+k); return d.getFullYear()+'-'+pad(d.getMonth()+1)===f.partes.prevMes.comp; })?'':`<option selected>${f.partes.prevMes.comp}</option>`}</select></label>`:''}${f.fontes.map(r=>`<div class="impl"><span>${esc(r[0])}</span><span class="num">${typeof r[1]==='number'?anlN(r[1])+' linhas':esc(r[1])}${r[2]?' · '+esc(r[2].length>10&&/T/.test(r[2])?qd(r[2]):r[2]):''}</span></div>`).join('')}`}</div>`).join('')}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn sec" data-act="anl-imp-x">Cancelar</button><button class="btn" data-act="anl-gravar" ${imp.grav||!imp.arqs.some(f=>!f.erro)?'disabled':''}>${ic('check',18,2.2)}${imp.grav?'Gravando…':'Atualizar a base'}</button></div>`:''}
  </section>
  <div class="two">
   <section class="card"><div class="label" style="margin-bottom:6px">BASE ATUAL</div>
    ${M.em?`<div class="sub" style="margin:0 0 8px;font-size:12.5px">Última importação ${qd(M.em)}${M.por?' por '+esc(nomeDe(M.por)):''}.</div>`:''}
    ${linha('Saldo','almox 3 + 30',qd(a.SALDO),nIt?anlN(nIt)+' itens':'')}
    ${linha('Perfil','carteira, previsão semanal, ordens',qd(pf.atual),pf.l?anlN(pf.l.length)+' linhas':'')}
    ${linha('Parâmetros','est. segurança e lotes',qd(a.PARAMETROS),'')}
    ${linha('Extrato','produzido e faturado',V.ate?'até '+dm(V.ate):'—',V.ini?'desde '+dm(V.ini):'')}
    ${linha('Previsão mensal','competências',comps(P.mes),'')}
    ${linha('Estoque do início do mês','competências',comps(P.est),'')}
    ${anlEstInfo()}
    ${linha('Capacidade do almox','por item (informativo)',a.CAPACIDADE?'carregada':'—','')}
    ${(M.hist||[]).length?`<details style="margin-top:10px"><summary class="sub" style="cursor:pointer;font-size:12px">Importações anteriores (${M.hist.length})</summary>${M.hist.slice().reverse().map(x=>`<div class="impl"><span>${qd(x.em)} · ${esc(nomeDe(x.por))}</span><span>${esc((x.arqs||[]).join(', '))}</span></div>`).join('')}</details>`:''}
   </section>
   <section class="card"><div class="label" style="margin-bottom:8px">COMO A ANÁLISE CALCULA</div>
    <div class="frow" style="grid-template-columns:130px minmax(0,1fr)"><span class="flab">HORIZONTE</span><div class="seg">${[10,15,20].map(v=>`<button data-act="anl-cfg" data-k="horiz" data-v="${v}" aria-pressed="${C.horiz===v}">${v} dias úteis</button>`).join('')}</div></div>
    <div class="frow" style="grid-template-columns:130px minmax(0,1fr)"><span class="flab">MÉDIA DE VENDAS</span><div class="seg">${[30,60,90].map(v=>`<button data-act="anl-cfg" data-k="janela" data-v="${v}" aria-pressed="${C.janela===v}">${v} dias</button>`).join('')}</div></div>
    <div class="frow" style="grid-template-columns:130px minmax(0,1fr)"><span class="flab">SÁBADO</span><div class="seg"><button data-act="anl-cfg" data-k="sab" data-v="0" aria-pressed="${!C.sab}">Não é dia útil</button><button data-act="anl-cfg" data-k="sab" data-v="1" aria-pressed="${C.sab}">É dia útil</button></div></div>
    <div class="frow" style="grid-template-columns:130px minmax(0,1fr)"><span class="flab">PREVISÕES</span><div class="seg"><button data-act="anl-cfg" data-k="prev" data-v="1" aria-pressed="${C.prev}">Contam como produção</button><button data-act="anl-cfg" data-k="prev" data-v="0" aria-pressed="${!C.prev}">Não contam</button></div></div>
    <details style="margin-top:12px"><summary class="sub" style="cursor:pointer;font-size:13px;font-weight:600">Regras da conta</summary><ul class="anl-regras">
     <li><b>Saldo</b> = almox 3 + almox 30 do relatório de saldo, <b>mais</b> o que foi lançado como entrega no painel depois do horário do saldo.</li>
     <li><b>Saída por dia</b>: pedidos (DC e DD do Perfil) na data de entrega. Pedido vencido cai hoje. Previsão semanal do sistema (DP) é dividida pelos dias úteis da semana. Depois do último dia coberto pelo Perfil entra a média de vendas (NFS) dos últimos ${C.janela} dias.</li>
     <li><b>Entrada por dia</b>: ordens abertas do painel no dia e na linha em que estão programadas (o que falta entregar), e as previsões ${C.prev?'':'(desligado) '}na data prevista. As OFP (sugestões do sistema) não contam. Ordem na fila sem linha não conta até ser programada.</li>
     <li><b>Falta</b> = o saldo previsto fica negativo dentro do período do Perfil. <b>Abaixo do seg.</b> = fica menor que o estoque de segurança. <b>Tendência</b> = só acontece depois, pela média de vendas.</li>
     <li><b>O que fazer</b>, nesta ordem: antecipar ordens que chegam tarde, programar as que estão na fila e, se ainda faltar, lotes novos. Cada lote cobre a necessidade até o fim do período, respeitando lote mínimo e múltiplo e limitado ao lote máximo (como as OFP do sistema).</li>
     <li><b>Carga das linhas</b>: os lotes sugeridos são encaixados na capacidade livre dos Ajustes, na linha do item com mais folga, por ordem de prazo.</li>
     <li><b>Faturado depois do saldo</b> (NFS do Extrato) sai do saldo; se o Perfil é mais antigo, a mesma quantidade baixa a carteira.</li>
     <li><b>Sob encomenda</b>: só conta pedido firme (carteira); não usa média de vendas nem estoque de segurança.</li></ul></details>
    <div class="sub" style="margin:14px 0 0;font-size:12.5px"><b>Sob encomenda automático:</b> códigos RE… (exportação) e produtos Quero Quero. Só contam pedido firme, sem média de vendas e sem estoque de segurança.</div>
    ${C.enc.length?`<div class="label" style="margin:14px 0 4px">SOB ENCOMENDA (${C.enc.length})</div><div class="chips">${C.enc.map(c=>`<button class="chip" data-act="anl-enc" data-c="${esc(c)}" title="Tirar de sob encomenda">${esc(c)} ✕</button>`).join('')}</div>`:''}
   </section></div>
  <section class="card"><div class="head" style="align-items:baseline"><div class="label" style="margin-bottom:6px">ACERTO DA PROJEÇÃO</div><button class="lnk" data-go="anlace">Ver detalhes por item</button></div>${anlAcertoProj()}</section>`; }

// --- detalhe do item (janela) ---
function anlModal(R){ const x=R.por[S.anl.item]; if(!x) return ''; const it=x.it, u=x.un, h=hojeStr();
  const sug=S.anl.sug&&S.anl.sug.c===x.c?S.anl.sug:null; const V=S.anl.base.vendas||{}; const mm=(V.mensal||{})[x.c]||{}; const ms=Object.keys(mm).sort().slice(-6);
  const pl=((S.anl.base.perfil||{}).l||[]).filter(p=>p[0]===x.c);
  const TIP={DC:'Pedido (carteira)',DP:'Previsão semanal',DD:'Demanda dependente',OFA:'Ordem firme',OFP:'Ordem planejada (sugestão do sistema)',DDP:'Consumo de ordem planejada',OCP:'Compra planejada',OCL:'Compra liberada',DE:'DE',DI:'DI'};
  return `<div class="omodal" data-act="anl-fechar"><div class="obox" role="dialog" aria-modal="true" aria-label="${esc(x.c)}">
   <div class="ohd"><div style="min-width:0"><div class="label">ANÁLISE DO ITEM</div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b class="num" style="font-size:22px">${esc(x.c)}</b>${anlPill(x)}</div>
    <div class="sub" style="margin:2px 0 0;font-size:13px">${esc(x.d)}${x.linhas.length?' · '+esc(x.linhas.join(', ')):''}</div>
    ${anlEncAuto(x.c,x.d)?`<span class="sub" style="display:block;padding:4px 0 0;font-size:12.5px;margin:0">Sob encomenda automático (${/^RE\d/i.test(x.c)?'exportação':'Quero Quero'}): não usa média de vendas nem estoque de segurança.</span>`:`<button class="lnk" data-act="anl-enc" data-c="${esc(x.c)}" style="padding:4px 0 0;font-size:12.5px">${x.enc?'Sob encomenda: voltar a tratar como item de estoque':'Marcar como sob encomenda (não usa média de vendas nem estoque de segurança)'}</button>`}</div>
    <button class="btn sec" data-act="anl-fechar" data-x="1" aria-label="Fechar" style="height:40px;width:40px;padding:0;flex-shrink:0">✕</button></div>
   <div style="padding:16px 20px 20px;display:flex;flex-direction:column;gap:16px">
    <div class="anl-kv">
     <div><span>Saldo agora</span><b class="num">${anlN(x.saldo)} ${u}</b><small class="num">A3 ${anlN(it.a3)} · A30 ${anlN(it.a30)}${it.emp&&Object.keys(it.emp).length?' · '+Object.keys(it.emp).sort().map(e=>'E'+e+' '+anlN((+it.emp[e].a3||0)+(+it.emp[e].a30||0))).join(' + '):''}${x.pos?' · +'+anlN(x.pos)+' entregue depois':''}${x.fat?' · −'+anlN(x.fat)+' faturado depois':''}</small></div>
     <div><span>Est. segurança</span><b class="num">${x.seg?anlN(x.seg):'—'}</b><small>${it.lmin||it.lmax?`lote ${anlN(it.lmin||0)} a ${anlN(it.lmax||0)}${it.lmult>=1?' · múlt. '+anlN(it.lmult):''}`:'sem parâmetros'}</small></div>
     <div><span>Venda média/dia</span><b class="num">${x.media?anlN(x.media):'—'}</b><small>${x.fonte==='vendas'?'NFS dos últimos '+anlCfg().janela+' dias':x.fonte==='parametro'?'consumo médio do parâmetro ÷ 21':'sem vendas'}</small></div>
     <div><span>Cobertura</span><b class="num">${x.cob!=null?(x.cob>=99?'99+':x.cob.toFixed(1).replace('.',','))+' dias':'—'}</b><small>dias úteis de venda média</small></div>
     <div><span>Carteira vencida</span><b class="num ${x.atras>x.saldo?'anl-over':''}">${anlN(x.atras)}</b><small>no período: ${anlN(x.cart)}</small></div>
     <div><span>Precisa produzir</span><b class="num">${x.need>0?anlN(x.need):'—'}</b><small>para ficar no seg. até ${dm(R.dias[R.dias.length-1])}</small></div>
    </div>
    ${x.acoes.length?`<div class="opanel" style="margin:0;background:var(--surface-2)"><div class="label" style="margin-bottom:4px">O QUE FAZER</div>${x.acoes.map(a=>`<div class="anl-act sd"><span class="op" style="cursor:default"><span style="font-size:13.5px">${anlAcaoTxt(x,a)}</span>${a.t==='nova'&&a.lotes.length>1?`<small class="num">Lotes: ${a.lotes.map(l=>anlN(l.q)+' até '+anlQuando(l.d)).join(' · ')}</small>`:''}</span>${anlAcaoBtn(x,a)}</div>`).join('')}</div>`:''}
    ${sug?anlSugForm(x,sug):''}
    <div><div class="label">SALDO PREVISTO · ${R.dias.length} DIAS ÚTEIS</div>${anlGrafItem(x,R)}</div>
    <details><summary class="sub" style="cursor:pointer;font-size:13px;font-weight:600">Dia a dia</summary><div style="overflow-x:auto"><table class="rtab"><thead><tr><th>Dia</th><th class="nr">Entra</th><th class="nr">Pedidos</th><th class="nr">Prev. sistema</th><th class="nr">Média</th><th class="nr">Saldo</th></tr></thead><tbody>
     ${x.proj.map((p,i)=>`<tr><th>${ANL_DIAS[new Date(p.d+'T12:00:00').getDay()]} ${dm(p.d)}</th><td class="nr num">${p.ent?anlN(p.ent)+' <small>'+x.supL[i].map(z=>z.t==='o'?'ordem '+esc(z.o.num):'previsão').join(', ')+'</small>':'—'}</td><td class="nr num">${p.c?anlN(p.c):'—'}</td><td class="nr num">${p.p?anlN(p.p):'—'}</td><td class="nr num">${p.m?anlN(p.m):'—'}</td><td class="nr num ${p.s<0?'anl-over':''}"><b>${anlN(p.s)}</b></td></tr>`).join('')}</tbody></table></div></details>
    <div class="two" style="gap:16px">
     <div><div class="label" style="margin-bottom:4px">ORDENS ABERTAS NO PAINEL</div>${x.ordens.length?x.ordens.map(o=>{ const q=Math.max(0,(+o.total||0)-entregueDe(o)); return `<div class="impl" style="cursor:pointer" data-act="anl-ordem" data-id="${esc(o._id)}"><span class="num"><b>${esc(o.num)}</b> · ${o.linha?esc(o.linha)+' · '+dm(dataEf(o)):'<span style="color:var(--warn-ink)">na fila, sem linha</span>'}</span><span class="num">falta ${anlN(q)}</span></div>`; }).join(''):'<div class="sub" style="margin:0;font-size:12.5px">Nenhuma.</div>'}
      ${x.fila.length?'':''}</div>
     <div><div class="label" style="margin-bottom:4px">PRODUZIDO × FATURADO (MÊS)</div>${ms.length?ms.map(m=>`<div class="impl"><span>${m.slice(5)}/${m.slice(2,4)}</span><span class="num">prod. ${anlN(mm[m][0])} · fat. ${anlN(mm[m][1])}</span></div>`).join(''):'<div class="sub" style="margin:0;font-size:12.5px">Sem extrato.</div>'}</div>
    </div>
    ${pl.length?`<details><summary class="sub" style="cursor:pointer;font-size:13px;font-weight:600">Perfil do sistema (${pl.length} linhas)</summary>${pl.map(p=>`<div class="impl"><span>${esc(TIP[p[1]]||p[1])}${p[1]==='OFP'||p[1]==='DDP'?' <small style="color:var(--muted)">(não conta)</small>':''}</span><span class="num">${dm(p[2])} · ${anlN(p[3])}</span></div>`).join('')}</details>`:''}
    ${it.c30||it.c3?`<div class="sub" style="margin:0;font-size:12px">Capacidade do almox (planilha): almox 30 ${anlN(it.c30||0)} · almox 3 ${anlN(it.c3||0)}.</div>`:''}
   </div></div></div>`; }
function anlSugForm(x,f){ const L=linhasOrd(); const ja=prevAtivas().filter(p=>(p.codigo||String(p.produto||'').split(' - ')[0].trim())===x.c).sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  return `<div class="opanel" style="margin:0;border:1.5px solid var(--teal)"><div class="label">CRIAR PREVISÃO NA PRODUÇÃO</div>
   ${ja.length?`<div class="av warn" style="margin:6px 0 4px"><span><b>Já planejado para este item:</b> ${ja.map(p=>dm(p.data)+' · '+esc(p.linha||'')+' · '+anlN(+p.qtd||0)).join(' &nbsp;|&nbsp; ')}</span></div>`:''}
   <div class="ed-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
    <label><span class="sub">Quantidade (${x.un})</span><input class="txt num" id="anl-s-q" inputmode="decimal" value="${esc(f.qtd)}" placeholder="Digite a quantidade"><small class="sub" style="margin:2px 0 0;font-size:11.5px">${f.de?'Sugerido: '+esc(f.de):'Sem necessidade, previsão ou lote para sugerir'}</small></label>
    <label><span class="sub">Linha</span><select class="txt" id="anl-s-l">${L.map(l=>`<option ${f.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
    <label><span class="sub">Dia</span><input type="date" class="txt" id="anl-s-d" value="${esc(f.data)}"></label></div>
   <label style="display:flex;flex-direction:column;gap:4px;margin-top:10px"><span class="sub" style="margin:0;font-size:12px">Observação</span><input class="txt" id="anl-s-o" value="${esc(f.obs)}"></label>
   <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button class="lnk" data-act="anl-sug-x">Cancelar</button><button class="btn" data-act="anl-sug-ok">${ic('check',18,2.2)}Salvar previsão</button></div>
   <div class="sub" style="margin:6px 0 0;font-size:12px">Entra em Produção → Previsão (e tracejada no Calendário). Quando a ordem sair no sistema, confirme com o número.</div></div>`; }
function anlGrafItem(x,R){ const W=640,H=190,pl=48,pr=10,pt=12,pb=24, P=x.proj, n=P.length; if(!n) return '';
  const vals=P.map(p=>p.s).concat([x.saldo,x.seg,0]); const mx=Math.max(...vals)*1.08||1, mn=Math.min(0,...vals)*1.08;
  const X=i=>pl+(W-pl-pr)*(n===1?0.5:i/(n-1)), Y=v=>pt+(H-pt-pb)*(1-(v-mn)/((mx-mn)||1));
  const pts=P.map((p,i)=>X(i)+','+Y(p.s)).join(' ');
  const iF=R.perfFim?P.findIndex(p=>p.d>R.perfFim):-1;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Saldo previsto de ${esc(x.c)}">
   ${iF>0?`<rect x="${X(iF)-((W-pl-pr)/(n-1))/2}" y="${pt}" width="${W-pr-X(iF)+((W-pl-pr)/(n-1))/2}" height="${H-pt-pb}" fill="var(--surface-2)"/><text x="${W-pr-4}" y="${pt+12}" text-anchor="end" font-size="10" fill="var(--muted)">pela média de vendas</text>`:''}
   <line x1="${pl}" x2="${W-pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--crit)" stroke-width="1"/><text x="${pl-6}" y="${Y(0)+4}" text-anchor="end" font-size="10" fill="var(--crit-ink)">0</text>
   ${x.seg>0?`<line x1="${pl}" x2="${W-pr}" y1="${Y(x.seg)}" y2="${Y(x.seg)}" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${pl-6}" y="${Y(x.seg)+4}" text-anchor="end" font-size="10" fill="var(--warn-ink)">seg.</text>`:''}
   ${Math.abs(Y(mx/1.08)-Y(x.seg))>14&&Math.abs(Y(mx/1.08)-Y(0))>14?`<text x="${pl-6}" y="${Y(mx/1.08)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${anlK(mx/1.08)}</text>`:''}
   <polyline points="${pts}" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round"/>
   ${P.map((p,i)=>`<g><circle cx="${X(i)}" cy="${Y(p.s)}" r="${p.ent>0?5:3.5}" fill="${p.s<0?'var(--crit)':(x.seg>0&&p.s<x.seg)?'var(--warn)':'var(--teal)'}" stroke="var(--surface)" stroke-width="2"/>${p.ent>0?`<text x="${X(i)}" y="${Y(p.s)-9}" text-anchor="middle" font-size="10" fill="var(--ink-2)">+${anlK(p.ent)}</text>`:''}<rect x="${X(i)-12}" y="${pt}" width="24" height="${H-pt-pb}" fill="transparent"><title>${dm(p.d)} · saldo ${anlN(p.s)} ${x.un}${p.ent?'\nentra '+anlN(p.ent):''}\nsai ${anlN(p.sai)}</title></rect>${i%Math.ceil(n/8)===0||i===n-1?`<text x="${X(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--muted)">${dm(p.d)}</text>`:''}</g>`).join('')}
  </svg>`; }

// ---------- ações ----------
function anlAbrirOrdem(id){ const o=ordById(id); if(!o) return; S.anl.item=null;
  if(!o.linha){ go('aprogramar'); return; }
  S.ord.linha=o.linha; S.ord.mostrar='abertas'; S.ord.busca=''; S.ord.de=''; S.ord.ate=''; S.ord.aberta=o._id; S.ord.painel='entrega'; S.ord.f={}; go('programacao'); }
function anlAbrirSug(c,k){ const R=anlDados(); const x=R&&R.por[c]; if(!x) return; const a=x.acoes.find(a=>a.t==='nova'); const lt=a?(a.lotes[+k||0]||a.lotes[0]):null;
  const ln=(lt&&lt.linha)||(a&&a.sugLinha)||x.linhas[0]||linhasOrd()[0]; let d=(lt&&lt.dia)||(a&&a.sugDia)||(lt&&lt.d)||amanhaStr(); if(d<hojeStr()) d=hojeStr();
  const pvm=anlPvMes()[c]||0, pln=anlPlanejado()[c]||0, lmin=(x.it&&x.it.lmin)||0; let q='', de='';
  if(lt){ q=lt.q; de='lote sugerido pela análise'; } else if(x.need>0){ q=Math.ceil(x.need); de='necessidade para ficar no estoque de segurança'; }
  else if(pvm-pln>0){ q=Math.ceil(pvm-pln); de='previsão de '+anlPvMesLab()+' ('+anlN(pvm)+')'+(pln?' menos o já planejado ('+anlN(pln)+')':''); }
  else if(lmin>0){ q=Math.ceil(lmin); de='lote mínimo do parâmetro'; }
  S.anl.item=c; S.anl.sug={c,qtd:String(q),de,linha:ln,data:d,obs:'Sugestão da Análise PCP'+(x.prazo?' · precisa até '+dm(x.prazo):'')}; render();
  setTimeout(()=>{ const e=$('#anl-s-q'); if(e){ e.scrollIntoView({block:'center',behavior:'smooth'}); e.focus({preventScroll:true}); e.select&&e.select(); } },60); }
async function anlSalvarSug(){ const f=S.anl.sug; if(!f||f.salvando) return; const g=id=>{ const e=$('#'+id); return e?e.value:''; };
  const qtd=numQ(g('anl-s-q')), linha=g('anl-s-l'), data=g('anl-s-d'), obs=String(g('anl-s-o')||'').trim();
  if(!(qtd>0)){ toast('Informe a quantidade.'); return; } if(!data){ toast('Informe o dia.'); return; } if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
  const x=(anlDados()||{por:{}}).por[f.c]; const d={produto:f.c+' - '+((x&&x.d)||''),codigo:f.c,qtd,linha,data,obs,status:'prevista',origem:'analise',criadoEm:new Date().toISOString(),por:S.uid};
  f.salvando=true; const bt=$('[data-act="anl-sug-ok"]'); if(bt){ bt.disabled=true; bt.lastChild.textContent='Salvando…'; }
  try{ await S.db.collection('previsoes').add(d); S.anl.sug=null; S.anl.item=null; S.anl._c=null; S.anl.salvo={c:f.c,t:Date.now()}; toast('✓ Previsão salva · '+f.c+' · '+anlN(qtd)+' · '+linha+' · '+dmTxt(data)); render(); setTimeout(()=>{ if(S.anl.salvo&&S.anl.salvo.c===f.c){ S.anl.salvo=null; render(); } },6000); }catch(e){ f.salvando=false; erro(e); render(); } }
async function anlCfgSalvar(k,v){ const c=Object.assign({},anlCfg()); if(k==='sab'||k==='prev') c[k]=v==='1'; else c[k]=+v; S.cfg.analise=c; S.anl._c=null; render();
  if(!S.db) return; try{ await S.db.doc('config/geral').update({analise:c}); }catch(e){ erro(e); } }
async function anlLerArquivos(files){ const A=S.anl.imp; A.lendo=true; A.arqs=[]; render();
  for(const f of files){ const nome=f.name||'arquivo'; let r;
    try{ const ext=nome.toLowerCase().split('.').pop(); const buf=await f.arrayBuffer(); const head=new TextDecoder('latin1').decode(new Uint8Array(buf.slice(0,600)));
      if(ext==='pdf'||head.startsWith('%PDF')){ r=anlPartesPdf(await textoPaginasPdf(buf),nome); }
      else if(ext==='csv'){ r={erro:'O CSV de ordens liberadas entra em Produção → Programação → Importar ordens.'}; }
      else if(/<(html|table|tr)\b/i.test(head)){ const txt=new TextDecoder(/utf-8/i.test(head)?'utf-8':'iso-8859-1').decode(new Uint8Array(buf)); r=anlPartesTabela(anlTabelaHtml(txt),nome,true); }
      else { await carregarScript(ANL_XLSX); const XL=window.XLSX; const wb=XL.read(new Uint8Array(buf),{type:'array'});
        if(wb.SheetNames.some(n=>anlNorm(n)==='SALDO')) r=anlPartesXlsx(wb,XL);
        else { const rows=XL.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:null,blankrows:false}); r=anlPartesTabela(rows,nome,true); } }
    }catch(e){ console.warn('anl',e); r={erro:'Não foi possível ler este arquivo.'}; }
    if(r&&r.partes&&r.partes.saldo&&!r.partes.saldo.emp){ const us=A.arqs.filter(f=>f.partes&&f.partes.saldo).map(f=>f.partes.saldo.emp); r.partes.saldo.emp=us.includes('1')?'9':'1'; r.partes.saldo.empAuto=true; }
    if(r&&r.partes){ const B=S.anl.base, qd=x=>dm(String(x).slice(0,10)); const sa=r.partes.saldo&&r.partes.saldo.atual, sbE=(((B.itens||{}).atual||{}).SALDO_E||{}), sb=r.partes.saldo&&sbE[r.partes.saldo.emp]?sbE[r.partes.saldo.emp]:((B.itens||{}).atual||{}).SALDO; if(sa&&sb&&sa<sb) r.aviso='Este saldo é de '+qd(sa)+', mais antigo que o da base atual ('+qd(sb)+').';
      const pa=r.partes.perfil&&r.partes.perfil.atual, pb=(B.perfil||{}).atual; if(pa&&pb&&pa<pb) r.aviso='Este perfil é de '+qd(pa)+', mais antigo que o da base atual ('+qd(pb)+').'; }
    A.arqs.push(Object.assign({arquivo:nome,fontes:[]},r)); }
  A.lendo=false; render(); }
async function anlGravar(){ const A=S.anl.imp; if(!S.db||A.grav) return; const ok=A.arqs.filter(f=>!f.erro); if(!ok.length) return;
  { const es=ok.filter(f=>f.partes&&f.partes.saldo).map(f=>String(f.partes.saldo.fech||'')+'|'+String(f.partes.saldo.emp||'')); const dup0=es.find((e,i)=>es.indexOf(e)!==i), dup=dup0&&dup0.split('|')[1]; if(dup){ toast('Os dois saldos estão marcados como Empresa '+dup+'. Escolha a empresa certa de cada um.'); return; } }
  A.grav=true; render();
  try{ const partes={}; ok.forEach(f=>Object.assign(partes,f.partes));
    { const todos=ok.filter(f=>f.partes&&f.partes.saldo).map(f=>f.partes.saldo); const sals=todos.filter(x=>!x.fech), fech=todos.filter(x=>x.fech); delete partes.saldo; if(sals.length) partes.saldo=anlSaldoJunta(sals,S.anl.base);
      if(fech.length){ const por={}; fech.forEach(x=>{ const g=por[x.fech]=por[x.fech]||{m:{},emps:[]}; g.emps.push('E'+(x.emp||'1')); for(const k in x.l){ g.m[k]=(g.m[k]||0)+(+x.l[k].a3||0)+(+x.l[k].a30||0); } }); partes.fechEst=por; } }
    // meses de vendas que serão tocados + os do período do resumo diário
    const need=new Set(); if(partes.ext){ partes.ext.rows.forEach(r=>need.add(r[1].slice(0,7))); const ate=[(S.anl.base.vendas||{}).ate||'',partes.ext.ate].sort().pop(); for(let d=addDias(ate,-155);d<=ate;d=addDias(d,28)) need.add(d.slice(0,7)); need.add(ate.slice(0,7)); }
    const meses={}; for(const cp of need){ const s=await S.db.doc('pcpvendas/'+cp).get(); if(s.exists) meses[cp]=s.data(); }
    const M=anlMontar(partes,S.anl.base,meses);
    for(const k in M.docs){ const sz=JSON.stringify(M.docs[k]).length; if(sz>250000) throw {code:'grande',message:k}; }
    for(const cp in M.meses) await S.db.doc('pcpvendas/'+cp).set(M.meses[cp]);
    for(const k of ['itens','perfil','prev','vendas']) if(M.docs[k]) await S.db.doc('pcpbase/'+k).set(M.docs[k]);
    const m0=S.anl.base.meta||{}; const hist=(m0.hist||[]).concat([{em:new Date().toISOString(),por:S.uid||null,arqs:ok.map(f=>f.nome)}]).slice(-60);
    await S.db.doc('pcpbase/meta').set({em:new Date().toISOString(),por:S.uid||null,hist});
    for(const k in M.docs) S.anl.base[k]=M.docs[k]; S.anl._c=null; if(partes.saldo) await anlSnapSalvar();
    S.anl.imp={lendo:false,arqs:[],grav:false}; S.anl._c=null; toast('Base atualizada. '+(M.res[0]||'')); render();
  }catch(e){ console.warn('anl gravar',e); A.grav=false; if(e&&e.code==='grande') toast('Os dados ficaram grandes demais para gravar ('+e.message+'). Avise o responsável.'); else erro(e); render(); } }
function anlAssinar(db){ ANL_DOCS.forEach(k=>{ let tent=0; const vai=()=>{ try{ db.doc('pcpbase/'+k).onSnapshot(s=>{ tent=0; S.anl.base[k]=s.exists?s.data():null; S.anl.lidos[k]=true; S.anl._c=null; rerenderSeguro(); },
  e=>{ tent++; if(tent<=5) setTimeout(vai,2000*tent); }); }catch(e){} }; vai(); }); }

document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="anl-"]'); if(!b||b.disabled) return; const act=b.dataset.act, A=S.anl;
  if(act==='anl-fechar'){ if(ev.target!==b&&!b.dataset.x) return; A.item=null; A.sug=null; render(); return; }
  if(act==='anl-item'){ if(ev.target.closest('button')&&ev.target.closest('button')!==b) return; A.item=b.dataset.c; A.sug=null; render(); return; }
  if(act==='anl-f'){ A.f=b.dataset.v; render(); return; }
  if(act==='anl-mf'){ A.mf=b.dataset.v; render(); return; }
  if(act==='anl-comp'){ A.comp=b.dataset.v; render(); return; }
  if(act==='anl-ordem'){ ev.stopPropagation(); anlAbrirOrdem(b.dataset.id); return; }
  if(act==='anl-sug'){ ev.stopPropagation(); anlAbrirSug(b.dataset.c,b.dataset.k); return; }
  if(act==='anl-sug-x'){ A.sug=null; render(); return; }
  if(act==='anl-sug-ok'){ anlSalvarSug(); return; }
  if(act==='anl-cfg'){ anlCfgSalvar(b.dataset.k,b.dataset.v); return; }
  if(act==='anl-imp-x'){ A.imp={lendo:false,arqs:[],grav:false}; render(); return; }
  if(act==='anl-gravar'){ anlGravar(); return; }
  if(act==='anl-xls'){ anlExportar(b.dataset.v); return; }
  if(act==='anl-pvf'){ A.pv[b.dataset.k]=b.dataset.v; render(); return; }
  if(act==='anl-esort'){ const k=b.dataset.k; if(A.es.col===k) A.es.dir*=-1; else { A.es.col=k; A.es.dir=k==='c'||k==='cob'?1:-1; } render(); return; }
  if(act==='anl-es-limpar'){ const ag=A.es&&A.es.agr!==false, mc=!!(A.es&&A.es.mais); A.es={v:2,q:'',vis:'principal',linha:'',cob:'',dp:'',ord:'risco',col:'',dir:1,agr:ag,mais:mc}; render(); return; }
  if(act==='anl-es-vis'){ A.es.vis=b.dataset.v; A.es.col=''; render(); return; }
  if(act==='anl-aptd'){ A.aptDias=+b.dataset.v; render(); return; }
  if(act==='anl-apts'){ A.aptSo=b.dataset.v==='1'; render(); return; }
  if(act==='anl-cap'){ const l=b.dataset.l; const e=document.getElementById('anl-cap-'+l.replace(/[^A-Za-z0-9]/g,'_')); anlSalvarCap(l,e?e.value:''); return; }
  if(act==='anl-enc'){ ev.stopPropagation(); anlEnc(b.dataset.c); return; }
});
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.anl.item&&document.querySelector('.omodal')){ S.anl.item=null; S.anl.sug=null; render(); }
  if((ev.key==='Enter'||ev.key===' ')&&ev.target.dataset&&ev.target.dataset.act==='anl-item'){ ev.preventDefault(); ev.target.click(); } });
document.addEventListener('input',ev=>{ const t=ev.target; if(!['anl-busca','anl-mbusca','anl-pvq','anl-esq'].includes(t.id)) return; if(t.id==='anl-pvq') S.anl.pv.q=t.value; else if(t.id==='anl-esq') S.anl.es.q=t.value; else S.anl[t.id==='anl-busca'?'busca':'mbusca']=t.value; clearTimeout(S.anl._bt);
  S.anl._bt=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#'+t.id); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); });
document.addEventListener('change',ev=>{ const t=ev.target;
  if(t.dataset&&t.dataset.anlPv){ S.anl.pv[t.dataset.anlPv]=t.value; render(); return; }
  if(t.dataset&&t.dataset.anlPvc){ S.anl.pv[t.dataset.anlPvc]=t.checked; render(); return; }
  if(t.dataset&&t.dataset.anlEsc){ S.anl.es[t.dataset.anlEsc]=t.checked; render(); return; }
  if(t.dataset&&t.dataset.anlEs){ S.anl.es[t.dataset.anlEs]=t.value; if(t.dataset.anlEs==='ord') S.anl.es.col=''; render(); return; }
  if(t.id==='anl-linha'){ S.anl.linha=t.value; render(); } if(t.id==='anl-mlinha'){ S.anl.mlinha=t.value; render(); }
  if(t.id==='anl-arq'&&t.files&&t.files.length) anlLerArquivos([...t.files]);
  if(t.dataset&&t.dataset.anlFech!=null){ const f=S.anl.imp.arqs[+t.dataset.anlFech]; if(f&&f.partes&&f.partes.saldo){ f.partes.saldo.fech=t.value||null; render(); } }
  if(t.dataset&&t.dataset.anlEmp!=null){ const f=S.anl.imp.arqs[+t.dataset.anlEmp]; if(f&&f.partes&&f.partes.saldo){ f.partes.saldo.emp=t.value; f.partes.saldo.empAuto=false; render(); } }
  if(t.dataset&&t.dataset.anlComp!=null){ const f=S.anl.imp.arqs[+t.dataset.anlComp]; if(f&&f.partes&&f.partes.prevMes) f.partes.prevMes.comp=t.value; } });
document.addEventListener('dragover',ev=>{ const d=ev.target.closest&&ev.target.closest('#anl-drop'); if(!d) return; ev.preventDefault(); d.classList.add('over'); });
document.addEventListener('dragleave',ev=>{ const d=ev.target.closest&&ev.target.closest('#anl-drop'); if(d) d.classList.remove('over'); });
document.addEventListener('drop',ev=>{ const d=ev.target.closest&&ev.target.closest('#anl-drop'); if(!d) return; ev.preventDefault(); d.classList.remove('over'); const fs=[...(ev.dataTransfer&&ev.dataTransfer.files||[])]; if(fs.length) anlLerArquivos(fs); });

// ---------- registro no painel ----------
P.lupa='<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/>';
P.analise='<path d="M4 20.5h16"/><path d="M5.5 16l4-5 3.5 3 5.5-7.5"/><circle cx="18.5" cy="6.5" r="1.3"/>';
Object.assign(VIEWS,{anlres:{nome:'Resumo',ic:'grid',mob:'Resumo'},anlnec:{nome:'Necessidades',ic:'lista',mob:'Itens'},anlproj:{nome:'Projeção',ic:'analise',mob:'Projeção'},anllin:{nome:'Carga das linhas',ic:'fabrica',mob:'Linhas'},anlmes:{nome:'Previsão',ic:'grafico',mob:'Previsão'},anlrit:{nome:'Previsto × Realizado',ic:'relogio',mob:'Ritmo'},anlest:{nome:'Estoques',ic:'caixa',mob:'Estoques'},anlapt:{nome:'Painel × sistema',ic:'check',mob:'Apont.'},anlace:{nome:'Acerto',ic:'alvo',mob:'Acerto'},anlbase:{nome:'Base de dados',ic:'baixar',mob:'Base'}});
Object.assign(CRUMB,{anlres:'Resumo',anlnec:'Necessidades',anlproj:'Projeção de estoque',anllin:'Carga das linhas',anlmes:'Previsão mensal',anlrit:'Previsto × Realizado',anlest:'Estoques',anlapt:'Painel × sistema',anlace:'Acerto da projeção',anlbase:'Base de dados'});
MODS.push({id:'analise',nome:'Análise PCP',ic:'analise',views:['anlres','anlrit','anlnec','anlest','anlmes','anlproj','anlace','anllin','anlapt','anlbase']});
function anlAvisoMeuDia(){ const R=anlDados(); if(!R) return ''; const n3=R.dias[Math.min(2,R.dias.length-1)]; const xs=R.itens.filter(x=>x.st==='falta'&&x.prazo<=n3); if(!xs.length) return '';
  return `<div class="av crit"><b>Análise PCP: ${xs.length} ${xs.length===1?'item':'itens'} com falta até ${anlQuando(n3)}</b><span>${xs.slice(0,4).map(x=>esc(x.c)).join(', ')}${xs.length>4?'…':''}</span><button class="lnk" data-go="anlres">Ver o que fazer</button></div>`; }

// ---------- Painel × sistema (apontamento) ----------
function anlAptDados(dias){ const V=S.anl.base.vendas||{}, D=V.diario||{}; const fim=V.ate||addDias(hojeStr(),-1); const ini=addDias(fim,-dias+1);
  const an=anuladas(), porCod={}; const lin=(c)=>porCod[c]=porCod[c]||{c,painel:0,sis:0,dia:{}};
  S.entregas.forEach(e=>{ if(e.anula||an.has(e._id)||!e.em) return; const d=hojeStr(new Date(e.em)); if(d<ini||d>fim) return; const o=ordById(e.ordem)||(S.ritOrdX||{})[e.ordem]; if(!o){ if(typeof ritFaltaOrdem==='function') ritFaltaOrdem(e.ordem); return; } const x=lin(codigoDe(o)); const q=+e.qtd||0; x.painel+=q; (x.dia[d]=x.dia[d]||[0,0])[0]+=q; });
  for(const c in D) for(const d in D[c]){ if(d<ini||d>fim) continue; const q=D[c][d][0]||0; if(!q) continue; const x=lin(c); x.sis+=q; (x.dia[d]=x.dia[d]||[0,0])[1]+=q; }
  const rows=Object.values(porCod).map(x=>Object.assign(x,{dif:x.painel-x.sis})).filter(x=>x.painel||x.sis).sort((a,b)=>Math.abs(b.dif)-Math.abs(a.dif));
  return {ini,fim,rows}; }
function vAnlApt(R){ const A=S.anl, dd=A.aptDias||7; const X=anlAptDados(dd); const I=(S.anl.base.itens||{}).l||{};
  const tol=r=>Math.abs(r.dif)<=Math.max(1,0.02*Math.max(r.painel,r.sis));
  let rows=X.rows; if(A.aptSo!==false) rows=rows.filter(r=>!tol(r));
  const tp=X.rows.reduce((a,r)=>a+r.painel,0), ts=X.rows.reduce((a,r)=>a+r.sis,0);
  const ds=[]; for(let d=X.ini;d<=X.fim;d=addDias(d,1)) if(anlUtil(d)) ds.push(d);
  return `${anlHead('Painel × sistema','Compara o que foi lançado como entrega no painel com a produção apontada no Focco (EPP do Extrato), por item. Serve para achar o que ficou sem apontar no sistema, ou apontado a mais.',`<div class="seg">${[7,14,30].map(v=>`<button data-act="anl-aptd" data-v="${v}" aria-pressed="${dd===v}">${v} dias</button>`).join('')}</div>`)}
  <div class="resumo"><div><div class="k">Período</div><div class="v num">${dm(X.ini)} a ${dm(X.fim)}</div><small class="sub" style="margin:0;font-size:12px">até o último dia do Extrato</small></div>
   <div><div class="k">Lançado no painel</div><div class="v num">${anlN(tp)}</div></div><div><div class="k">Apontado no sistema</div><div class="v num">${anlN(ts)}</div></div>
   <div><div class="k">Itens com diferença</div><div class="v num ${X.rows.filter(r=>!tol(r)).length?'warn':'ok'}">${X.rows.filter(r=>!tol(r)).length}</div><small class="sub" style="margin:0;font-size:12px">tolerância de 2%</small></div></div>
  <section class="card" style="padding:6px 18px 10px;overflow-x:auto">
   <div class="head" style="align-items:center;padding:10px 0 4px"><div class="seg"><button data-act="anl-apts" data-v="1" aria-pressed="${A.aptSo!==false}">Só diferenças</button><button data-act="anl-apts" data-v="0" aria-pressed="${A.aptSo===false}">Todos</button></div><span class="sub" style="margin:0;font-size:12px">Passe o mouse no item para ver dia a dia. Diferença de um dia costuma ser apontamento feito no dia seguinte.</span></div>
   <table class="rtab anl-mt"><thead><tr><th>Item</th><th class="nr">Painel</th><th class="nr">Sistema (EPP)</th><th class="nr">Diferença</th><th>Leitura</th></tr></thead><tbody>
   ${rows.map(r=>{ const tip=ds.map(d=>{ const v=r.dia[d]||[0,0]; return dm(d)+': painel '+anlN(v[0])+' · sistema '+anlN(v[1]); }).join('\n');
     const lei=tol(r)?'<span class="pill ok">Bate</span>':!r.sis?'<span class="pill crit">Não apontado</span>':!r.painel?'<span class="pill warn">Só no sistema</span>':r.dif>0?'<span class="pill warn">Falta apontar</span>':'<span class="pill warn">Sistema maior</span>';
     return `<tr title="${esc(tip)}"><th><b class="num">${esc(r.c)}</b><small>${esc(((I[r.c]||{}).d||((itemDe(r.c)||{}).descricao)||'').slice(0,40))}</small></th><td class="nr num">${anlN(r.painel)}</td><td class="nr num">${anlN(r.sis)}</td><td class="nr num ${tol(r)?'':'anl-over'}"><b>${r.dif>0?'+':''}${anlN(r.dif)}</b></td><td>${lei}</td></tr>`; }).join('')}</tbody></table>
   ${rows.length?'':'<div class="empty">Tudo batendo no período.</div>'}
   <div class="sub" style="font-size:12px;margin:10px 0 4px">O sistema só aparece até o dia do último Extrato importado (${dm(X.fim)}). Entregas lançadas depois disso ainda não têm com o que comparar.</div></section>`; }

// ---------- exportar Excel ----------
async function anlExportar(tipo){ const R=anlDados(); if(!R){ toast('Base não carregada.'); return; }
  const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Exportação indisponível nesta visualização.'); return; }
  try{ await carregarScript(ANL_XLSX); }catch(e){ toast('Não foi possível carregar o gerador de Excel.'); return; }
  const XL=window.XLSX, wb=XL.utils.book_new(), h=hojeStr();
  if(tipo==='nec'){ const xs=anlFiltra(R); const rows=[['Código','Produto','Linhas','Situação','Falta a partir de','Saldo','Est. segurança','Venda média/dia','Cobertura (dias)','Carteira vencida','Precisa produzir','O que fazer']];
    xs.forEach(x=>rows.push([x.c,x.d,x.linhas.join(', '),(ANL_ST[x.st]||{}).t,x.prazo?dm(x.prazo):'',Math.round(x.saldo),x.seg,Math.round(x.media),x.cob!=null?Math.round(x.cob*10)/10:'',Math.round(x.atras),Math.round(x.need),x.acoes.map(a=>anlAcaoTxt(x,a).replace(/<[^>]+>/g,'')).join(' | ')]));
    XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(rows),'Necessidades');
    const lt=[['Código','Produto','Lote','Precisa até','Linha sugerida','Dia sugerido']]; R.carga.alocs.forEach(f=>lt.push([f.x.c,f.x.d,f.lt.q,dm(f.lt.d),f.lt.linha||'',f.lt.dia?dm(f.lt.dia):'']));
    XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(lt),'Lotes sugeridos'); }
  else if(tipo==='est'){ if(!S.anl.es) S.anl.es={q:'',st:'',risco:'',cob:'',dp:'',linha:'',ord:'risco',col:'',dir:1}; const rows=[['Código','Produto','Almox 3','Almox 30','Total','Est. segurança','DC (pedidos)','Venda média/dia','Cobertura (dias)','Previsão do mês','Feito no mês','Estoque no começo do mês','Planejado no painel','Giro/mês','Ordens no horizonte','Nec. produzir','Ruptura prevista','Risco','Status']];
    anlEstRows(R).forEach(r=>rows.push([r.c,r.d,r.a3,r.a30,r.tot,r.seg,Math.round(r.dc),Math.round(r.md),r.cob>=999?'':Math.round(r.cob*10)/10,Math.round(r.pvm),Math.round(r.pvF||0),r.pvT==null?'':Math.round(r.pvT),Math.round(r.pln),r.giro==null?'':Math.round(r.giro*100)/100,r.ofa,Math.round(r.nec),r.rupD?dm(r.rupD):'',ANL_RISCO[r.risco].t,r.sit]));
    XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(rows),'Estoques'); }
  else { if(!S.anl.pv){ vAnlMes(R); } const xs=anlPrevFiltra(anlPrevRows(R)); if(!xs.length){ toast('Sem previsão para exportar.'); return; }
    const rows=[['Código','Produto','UM','Competência','Estoque inicial','Demanda prevista','Faturado','Produzido','Nec. produção','Saldo p/ faturar','Status','Atendimento %','Produção %','Cobertura']];
    xs.forEach(r=>rows.push([r.c,r.d,r.um,r.cp.slice(5)+'/'+r.cp.slice(0,4),r.ei,r.prev,r.fat,r.prod,r.nec,r.sf,ANL_PST[r.st].t,Math.round(r.at),Math.round(r.pp),ANL_COB[r.cob].t]));
    XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(rows),'Previsão'); }
  const arr=XL.write(wb,{type:'array',bookType:'xlsx'});
  try{ await dl.save({filename:(tipo==='nec'?'Necessidades_PCP_':tipo==='est'?'Estoques_':'Previsao_mensal_')+h+'.xlsx',data:new Blob([arr])}); }catch(e){ /* recusado */ } }

// ---------- cimento × lotes ----------
function anlCimento(R){ const p=previsaoCimento(); if(!p) return null; const C=R.carga, n=C.n; const kg=c=>kgCimento(c);
  const porDia=C.D.map(()=>({prog:0,sug:0}));
  C.L.forEach(l=>{ if(!usaCimFab(l)) return; C.cell[l].forEach((c,i)=>c.its.forEach(z=>{ const cod=z.t==='o'?codigoDe(z.o):z.t==='p'?z.p.codigo:z.x.c; const t=z.q*kg(cod)/1000; if(!t) return; if(z.t==='s') porDia[i].sug+=t; else porDia[i].prog+=t; })); });
  let acc=0, dia=null, diaProg=null, accP=0; porDia.forEach((d,i)=>{ accP+=d.prog; acc+=d.prog+d.sug; if(diaProg===null&&accP>p.estoque+1e-6) diaProg=i; if(dia===null&&acc>p.estoque+1e-6) dia=i; });
  const prog=porDia.reduce((a,d)=>a+d.prog,0), sug=porDia.reduce((a,d)=>a+d.sug,0);
  return {est:p.estoque,prog,sug,dia:dia!==null?C.D[dia]:null,diaProg:diaProg!==null?C.D[diaProg]:null,aCaminho:p.aCaminho,nCaminho:p.nCaminho,semKg:p.semKg}; }
function anlCimentoHtml(R,compacto){ const c=anlCimento(R); if(!c) return compacto?'':'<div class="sub" style="margin:0">Sem medição dos silos de cimento para comparar.</div>';
  const f=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:1});
  const msg=c.dia?`<b>Com os lotes sugeridos, o cimento acaba ${anlQuando(c.dia)}</b>${c.diaProg?' (só com o já programado: '+anlQuando(c.diaProg)+')':''}. ${c.nCaminho?`Há ${c.nCaminho} carga${c.nCaminho===1?'':'s'} a caminho${c.aCaminho?' ('+f(c.aCaminho)+' t)':''}.`:'Nenhuma carga a caminho.'}`:`Cimento suficiente para o programado e os lotes sugeridos dos próximos ${R.carga.n} dias úteis.`;
  return `<div class="cimmsg" style="${c.dia?'background:var(--crit-tint);color:var(--crit-ink)':''}">${msg}<div class="num" style="margin-top:4px;font-size:12px;opacity:.9">Estoque estimado ${f(c.est)} t · programado usa ${f(c.prog)} t · sugeridos usam ${f(c.sug)} t${c.semKg?' · '+c.semKg+' ordem(ns) sem kg de cimento no cadastro':''}</div></div>`; }

// ---------- capacidade das linhas (editar aqui mesmo) ----------
async function anlSalvarCap(l,v){ const n=numQ(v); if(!(n>0)){ toast('Informe a capacidade por dia.'); return; } const cap=Object.assign({},S.cfg.capacidade||{}); cap[l]=n; S.cfg.capacidade=cap; S.anl._c=null; render();
  if(!S.db) return; try{ await S.db.doc('config/geral').update({capacidade:cap}); toast('Capacidade da '+l+' salva: '+anlN(n)+'/dia.'); }catch(e){ erro(e); } }

// ---------- sob encomenda ----------
async function anlEnc(c){ const C=anlCfg(); const s=new Set(C.enc); if(s.has(c)) s.delete(c); else s.add(c); const nv=Object.assign({},C,{enc:[...s].sort()}); S.cfg.analise=nv; S.anl._c=null; render();
  if(!S.db) return; try{ await S.db.doc('config/geral').update({analise:nv}); toast(s.has(c)?c+' marcado como sob encomenda.':c+' voltou a ser de estoque.'); }catch(e){ erro(e); } }

// ---------- acerto da projeção (fotos diárias) ----------
function anlSnap(R){ const k=Math.min(10,R.dias.length); const p={}, s={};
  const dc={}; R.itens.forEach(x=>{ s[x.c]=Math.round(x.base); if(x.cart>0) dc[x.c]=Math.round(x.cart); if(x.st!=='sem') p[x.c]=x.proj.slice(0,k).map(z=>Math.round(z.s)); });
  return {em:new Date().toISOString(),data:R.sDia||hojeStr(),d:R.dias.slice(0,k),s,p,dc}; }
async function anlSnapSalvar(){ const R=anlCalc(); if(!R||!S.db) return; const sn=anlSnap(R); try{ await S.db.doc('pcpsnap/'+sn.data).set(sn); S.anl.snaps=null; }catch(e){ console.warn('snap',e); } }
async function anlSnapsLer(){ if(S.anl.snaps||S.anl._lendoSnaps||!S.db) return; S.anl._lendoSnaps=true;
  try{ const q=await S.db.collection('pcpsnap').limit(120).get(); S.anl.snaps=q.docs.map(d=>d.data()).sort((a,b)=>String(a.data).localeCompare(String(b.data))); }catch(e){ S.anl.snaps=[]; }
  S.anl._lendoSnaps=false; rerenderSeguro(); }
function anlAcertoProj(){ const sn=S.anl.snaps; if(!sn) { anlSnapsLer(); return '<div class="sub" style="margin:0">Carregando…</div>'; }
  if(sn.length<2) return `<div class="sub" style="margin:0;font-size:12.5px">A cada importação de saldo o painel guarda o saldo previsto dos 5 dias seguintes e, depois, compara com o saldo que veio de verdade. ${sn.length?'Já tem 1 registro; o acerto aparece a partir da próxima importação em outro dia.':'O primeiro registro fica guardado na próxima importação.'}</div>`;
  const por={}; sn.forEach(x=>por[x.data]=x); const erros=[]; let sa=0, sr=0;
  sn.forEach(A=>{ (A.d||[]).forEach((d,k)=>{ let nx=addDias(d,1); for(let g=0;g<5&&!anlUtil(nx);g++) nx=addDias(nx,1); const B=por[nx]; if(!B) return;
    for(const c in A.p){ const pv=A.p[c][k], rv=B.s[c]; if(pv==null||rv==null) continue; const e=pv-rv; sa+=Math.abs(e); sr+=Math.abs(rv); erros.push({c,d,pv,rv,e,h:k+1}); } }); });
  if(!erros.length) return '<div class="sub" style="margin:0;font-size:12.5px">Ainda não há dias com previsão e saldo real para comparar.</div>';
  const pct=sr?Math.round(sa/sr*100):0; const piores=erros.slice().sort((a,b)=>Math.abs(b.e)-Math.abs(a.e)).slice(0,8);
  return `<div class="sub" style="margin:0 0 6px;font-size:12.5px">${anlN(erros.length)} comparações · erro médio de <b>${pct}%</b> do saldo real. Erro grande costuma ser pedido que não entrou no Perfil, produção não apontada ou venda fora do normal.</div>
   ${piores.map(z=>`<div class="impl"><span class="num"><b>${esc(z.c)}</b> · ${dm(z.d)} (D+${z.h})</span><span class="num">previsto ${anlN(z.pv)} · real ${anlN(z.rv)}</span></div>`).join('')}`; }
// acerto da previsão comercial (meses fechados)
function anlAcertoPrev(){ const P=S.anl.base.prev||{}, V=S.anl.base.vendas||{}; const cur=hojeStr().slice(0,7); const comps=Object.keys(P.mes||{}).filter(c=>c<cur).sort().slice(-6);
  if(!comps.length) return ''; const it={}; let tp=0, tf=0, te=0;
  comps.forEach(cp=>{ const pm=P.mes[cp]; for(const c in pm){ const prev=pm[c]||0; const fat=(((V.mensal||{})[c]||{})[cp]||[0,0])[1]; if(!prev&&!fat) continue; const x=it[c]=it[c]||{c,prev:0,fat:0,err:0,n:0}; x.prev+=prev; x.fat+=fat; x.err+=Math.abs(fat-prev); x.n++; tp+=prev; tf+=fat; te+=Math.abs(fat-prev); } });
  const xs=Object.values(it).filter(x=>x.prev>0).sort((a,b)=>b.err-a.err).slice(0,10); const I=(S.anl.base.itens||{}).l||{};
  return `<section class="card"><div class="head" style="align-items:baseline;margin-bottom:6px"><div class="label">ACERTO DA PREVISÃO · ${comps.map(c=>c.slice(5)+'/'+c.slice(2,4)).join(', ')}</div><span class="sub num" style="margin:0;font-size:12.5px">faturado foi ${tp?Math.round(tf/tp*100):0}% do previsto · erro por item ${tp?Math.round(te/tp*100):0}% do previsto</span></div>
   <table class="rtab anl-mt"><thead><tr><th>Item com mais erro</th><th class="nr">Previsto</th><th class="nr">Faturado</th><th class="nr">Faturado / previsto</th></tr></thead><tbody>${xs.map(x=>`<tr><th><b class="num">${esc(x.c)}</b><small>${esc(((I[x.c]||{}).d||'').slice(0,40))}</small></th><td class="nr num">${anlN(x.prev)}</td><td class="nr num">${anlN(x.fat)}</td><td class="nr num">${Math.round(x.fat/x.prev*100)}%</td></tr>`).join('')}</tbody></table>
   <div class="sub" style="font-size:12px;margin:8px 0 0">Soma dos meses fechados. Serve para conversar com o comercial sobre os itens em que a previsão mais erra.</div></section>`; }
// ---------- cartão da rotina no Meu dia ----------
function anlRotCard(){ const M=S.anl.base.meta, h=hojeStr(); const em=M&&M.em; const hj=em&&hojeStr(new Date(em))===h;
  return {n:6,go:'anlbase',m:'Análise',t:'Base do Focco',st:hj?'ok':'pend',d:hj?'Importada às '+hora(em):(em?'Última: '+dia(em).toLowerCase()+' '+hora(em):'Nunca importada'),a:`<button class="lnk" data-go="anlbase">Importar arquivos</button>`}; }

// ================= telas no formato do app "PCP Preditivo" (Previsão e Estoques) =================
const ANL_MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ANL_PST={ATRASADA:{t:'Atrasada',c:'crit'},RISCO:{t:'Risco Fat.',c:'crit'},PRODUCAO:{t:'Em Produção',c:'warn'},CONCLUIDO:{t:'Concluído',c:'ok'},PENDENTE:{t:'Pendente',c:'neu'}};
const ANL_COB={excesso:{t:'Excesso',c:'teal'},adequado:{t:'Adequado',c:'ok'},baixo:{t:'Baixo',c:'warn'},critico:{t:'Crítico',c:'crit'}};
function anlBarPct(p){ p=Math.round(p||0); const c=p>=100?'var(--ok)':p>=50?'var(--warn)':'var(--crit)';
  return `<span class="anl-pb"><i style="width:${Math.min(100,p)}%;background:${c}"></i></span><small class="num">${p}%</small>`; }
function anlKpis(xs){ return `<div class="anl-kpis">${xs.map(k=>`<div class="anl-kpi ${k.c||''}"><div class="v num">${k.v}</div><div class="k">${k.k}</div>${k.s?`<div class="s">${k.s}</div>`:''}</div>`).join('')}</div>`; }

// ---------- Previsão mensal: 1 linha por código + competência (regras do app antigo) ----------
function anlPrevRows(R){ const B=S.anl.base, P=B.prev||{}, V=B.vendas||{}, IL=(B.itens||{}).l||{}; const h=hojeStr(), cur=h.slice(0,7);
  const ult=new Date(+h.slice(0,4),+h.slice(5,7),0).getDate(), diasRest=ult-(+h.slice(8,10));
  const estDe=(c,cp)=>{ const E=P.est||{}; if(E[cp]&&E[cp][c]!=null) return E[cp][c]; const ant=Object.keys(E).filter(k=>k<cp&&E[k][c]!=null).sort(); return ant.length?E[ant[ant.length-1]][c]:0; };
  const out=[];
  Object.keys(P.mes||{}).forEach(cp=>{ const pm=P.mes[cp]; for(const c in pm){ const prev=pm[c]||0; const mm=((V.mensal||{})[c]||{})[cp]||[0,0]; const prod=mm[0], fat=mm[1]; if(!prev&&!fat&&!prod) continue;
    const ei=estDe(c,cp); const nec=Math.max(prev-ei-prod,0), sf=Math.max(prev-fat,0);
    const at=prev>0?Math.min(fat/prev*100,100):0, pp=prev>0?Math.min(prod/prev*100,100):0;
    const cr=prev>0?(ei+prod)/prev:((ei+prod)>0?999:0); const cob=cr>=1.5?'excesso':cr>=1?'adequado':cr>=0.5?'baixo':'critico';
    let st='PENDENTE'; if(nec>0&&prod<prev*0.5) st='ATRASADA'; else if(sf>0&&cp===cur&&diasRest<=5) st='RISCO'; else if(prod>0&&sf>0) st='PRODUCAO'; else if(sf<=0) st='CONCLUIDO';
    const it=IL[c]||{}; const x=R&&R.por[c];
    out.push({c,cp,d:it.d||((itemDe(c)||{}).descricao)||'',um:it.um||(UNID[unidCod(c)]?unidCod(c):''),linhas:x?x.linhas:anlLinhasDe(c,it),ei,prev,fat,prod,nec,sf,at,pp,cob,st,x}); } });
  return out; }
function anlPrevFiltra(rows){ const F=S.anl.pv, q=anlNorm(F.q);
  let xs=rows.filter(r=>{ if(q&&!anlNorm(r.c+' '+r.d).includes(q)) return false; if(F.mes&&r.cp.slice(5,7)!==F.mes) return false; if(F.ano&&r.cp.slice(0,4)!==F.ano) return false;
    if(F.linha&&!r.linhas.includes(F.linha)) return false; if(F.st&&r.st!==F.st) return false; if(F.nec&&!(r.nec>0)) return false; if(F.pend&&!(r.sf>0)) return false; return true; });
  const ord={ATRASADA:0,RISCO:1,PRODUCAO:2,PENDENTE:3,CONCLUIDO:4};
  const cmp={necessidade:(a,b)=>b.nec-a.nec,saldo:(a,b)=>b.sf-a.sf,atendimento:(a,b)=>a.at-b.at,previsto:(a,b)=>b.prev-a.prev,risco:(a,b)=>ord[a.st]-ord[b.st]};
  xs.sort(cmp[F.sort]||((a,b)=>a.c.localeCompare(b.c)||a.cp.localeCompare(b.cp))); return xs; }
function vAnlMes(R){ const A=S.anl; const h=hojeStr();
  if(!A.pv) A.pv={q:'',mes:h.slice(5,7),ano:h.slice(0,4),sort:'',st:'',linha:'',nec:false,pend:false};
  const F=A.pv; const rows=anlPrevRows(R); if(!rows.length) return anlHead('Previsão do mês','')+'<section class="card"><div class="empty">Nenhuma previsão importada. Importe o relatório RPRE0301 em Base de dados.</div></section>';
  const xs=anlPrevFiltra(rows); const anos=[...new Set(rows.map(r=>r.cp.slice(0,4)))].sort();
  const tP=xs.reduce((a,r)=>a+r.prev,0), tPr=xs.reduce((a,r)=>a+r.prod,0), tF=xs.reduce((a,r)=>a+r.fat,0);
  const cur=F.mes&&F.ano&&(F.ano+'-'+F.mes)===h.slice(0,7); const M=cur?anlMesDados(R,h.slice(0,7)):null;
  const chip=(k,v,l,cls)=>`<button class="anl-chip" data-act="anl-pvf" data-k="${k}" data-v="${v}" aria-pressed="${F[k]===v}">${cls?`<i class="${cls}"></i>`:''}${l}</button>`;
  return `${anlHead('Previsão Mensal','Previsto × Estoque inicial × Produzido × Faturado · por código e competência',`<button class="btn sec" data-act="anl-xls" data-v="mes" style="height:42px">${ic('baixar',16,2)}Exportar Excel</button>`)}
  ${anlKpis([{k:'Total previsto',v:anlN(tP),c:'teal'},{k:'Total produzido',v:anlN(tPr),c:'ok'},{k:'Total faturado',v:anlN(tF),c:'s2',s:M?'no ritmo, fecha em '+M.projPct+'%':''},{k:'% Atendimento',v:(tP?Math.round(tF/tP*100):0)+'%',c:'warn'},{k:'% Produção',v:(tP?Math.round(tPr/tP*100):0)+'%',c:'warn'},{k:'Itens pendentes',v:xs.filter(r=>r.sf>0).length,c:'warn'},{k:'Itens críticos',v:xs.filter(r=>r.st==='ATRASADA').length,c:'crit'},{k:'Nec. total produção',v:anlN(xs.reduce((a,r)=>a+r.nec,0)),c:'crit'}])}
  <section class="card"><div class="label" style="margin-bottom:8px">PREVISTO × FATURADO × PRODUZIDO (ITENS FILTRADOS)</div>${anlGrafH([['Previsto',tP,'var(--faint)'],['Faturado',tF,'var(--anl-s2)'],['Produzido',tPr,'var(--anl-s1)']])}</section>
  <section class="card anl-tcard"><div class="anl-th"><div class="label">PREVISÃO MENSAL POR ITEM</div><span class="fcount num">${xs.length}</span></div>
   <div class="anl-fl"><label class="srch" style="max-width:none;margin:0;flex:3 1 260px">${ic('lupa',16,2)}<input class="txt" id="anl-pvq" value="${esc(F.q)}" placeholder="Buscar código ou produto…" autocomplete="off"></label>
    <select class="txt anl-sel" data-anl-pv="mes"><option value="">Mês: Todos</option>${ANL_MESES.map((m,i)=>`<option value="${pad(i+1)}" ${F.mes===pad(i+1)?'selected':''}>${m}</option>`).join('')}</select>
    <select class="txt anl-sel" data-anl-pv="ano"><option value="">Ano: Todos</option>${anos.map(a=>`<option ${F.ano===a?'selected':''}>${a}</option>`).join('')}</select>
    <select class="txt anl-sel" data-anl-pv="sort">${[['','Ordenar: Padrão'],['necessidade','Maior necessidade de produção'],['saldo','Maior saldo a faturar'],['atendimento','Menor atendimento'],['previsto','Maior previsão'],['risco','Maior risco']].map(([v,l])=>`<option value="${v}" ${F.sort===v?'selected':''}>${l}</option>`).join('')}</select></div>
   <div class="anl-cr"><span class="flab">STATUS:</span>${chip('st','','Todos')}${Object.keys(ANL_PST).map(k=>chip('st',k,ANL_PST[k].t,'d-'+ANL_PST[k].c)).join('')}<button class="anl-chip lim" data-act="anl-pvf" data-k="st" data-v="">✕ Limpar</button></div>
   <div class="anl-cr"><span class="flab">LINHA:</span>${chip('linha','','Todas')}${linhasOrd().map(l=>chip('linha',l,esc(l))).join('')}<button class="anl-chip lim" data-act="anl-pvf" data-k="linha" data-v="">✕ Limpar</button></div>
   <div class="anl-cr"><label class="ck"><input type="checkbox" data-anl-pvc="nec" ${F.nec?'checked':''}> Apenas com necessidade de produção</label><label class="ck"><input type="checkbox" data-anl-pvc="pend" ${F.pend?'checked':''}> Apenas pendentes de faturamento</label></div>
   <div class="anl-tw"><table class="anl-t"><thead><tr><th>Código</th><th>Produto</th><th>UM</th>${F.mes&&F.ano?'':'<th>Comp.</th>'}<th class="nr">Estoque inicial</th><th class="nr">Demanda prevista</th><th class="nr">Faturado</th><th class="nr">Produzido</th><th class="nr">Nec. produção</th><th class="nr">Saldo p/ faturar</th><th>Status</th><th>Atendimento %</th><th>Produção %</th><th>Cobertura</th></tr></thead>
   <tbody>${xs.slice(0,400).map(r=>`<tr class="b-${ANL_PST[r.st].c}" ${r.x?`data-act="anl-item" data-c="${esc(r.c)}"`:''}><td class="cd num">${esc(r.c)}</td><td class="pr">${esc(r.d)}</td><td>${esc(r.um)}</td>${F.mes&&F.ano?'':`<td class="num">${r.cp.slice(5)}/${r.cp.slice(0,4)}</td>`}<td class="nr num">${anlN(r.ei)}</td><td class="nr num">${anlN(r.prev)}</td><td class="nr num">${anlN(r.fat)}</td><td class="nr num">${anlN(r.prod)}</td><td class="nr num ${r.nec>0?'t-crit':'t-ok'}"><b>${anlN(r.nec)}</b></td><td class="nr num ${r.sf>0?'t-warn':'t-ok'}"><b>${anlN(r.sf)}</b></td>
     <td><span class="pill ${ANL_PST[r.st].c}"><i class="dot d-${ANL_PST[r.st].c}"></i>${ANL_PST[r.st].t}</span></td><td>${anlBarPct(r.at)}</td><td>${anlBarPct(r.pp)}</td><td><span class="anl-bdg ${ANL_COB[r.cob].c}">${ANL_COB[r.cob].t}</span></td></tr>`).join('')}</tbody></table>
   ${xs.length?'':'<div class="empty">Nenhum item para os filtros selecionados.</div>'}${xs.length>400?`<div class="sub" style="font-size:12px;padding:8px 0">Mostrando 400 de ${xs.length}. Use os filtros.</div>`:''}</div></section>
  ${anlAcertoPrev()}`; }
function anlGrafH(barras){ const W=1100, lh=34, pl=90, pr=90, H=barras.length*lh+26; const mx=Math.max(1,...barras.map(b=>b[1]))*1.05; const X=v=>pl+(W-pl-pr)*v/mx;
  const tk=[0,.25,.5,.75,1].map(f=>mx/1.05*f);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Previsto, faturado e produzido">${tk.map(v=>`<line x1="${X(v)}" x2="${X(v)}" y1="4" y2="${H-22}" stroke="var(--line-2)"/><text x="${X(v)}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--muted)">${anlK(v)}</text>`).join('')}
   ${barras.map(([l,v,c],i)=>`<text x="${pl-10}" y="${8+i*lh+15}" text-anchor="end" font-size="12" fill="var(--ink-2)">${l}</text><rect x="${pl}" y="${6+i*lh}" width="${Math.max(0,X(v)-pl)}" height="22" rx="4" fill="${c}"><title>${l}: ${anlN(v)}</title></rect><text x="${X(v)+6}" y="${8+i*lh+15}" font-size="12" font-weight="700" fill="var(--ink)">${anlN(v)}</text>`).join('')}</svg>`; }

// ---------- Estoques: posição, cobertura, giro e ruptura ----------
function anlPvMes(){ const P=(S.anl.base&&S.anl.base.prev)||{}; return (P.mes||{})[hojeStr().slice(0,7)]||{}; }
function anlPvMesLab(){ const cp=hojeStr().slice(0,7); return ANL_MESES[+cp.slice(5)-1].slice(0,3).toLowerCase(); }
function anlPlanejado(){ const m={}; prevAtivas().forEach(p=>{ const c=p.codigo||String(p.produto||'').split(' - ')[0].trim(); if(c) m[c]=(m[c]||0)+(+p.qtd||0); }); return m; }
function anlEstRows(R){ const pvM=anlPvMes(), pln=anlPlanejado(), cur=hojeStr().slice(0,7), PR={}; try{ anlPrevRows(R).forEach(y=>{ if(y.cp===cur) PR[y.c]=y; }); }catch(e){} const AP={}; try{ (S.entregas||[]).forEach(e=>{ if(e.anula||!e.em||hojeStr(new Date(e.em)).slice(0,7)!==cur) return; const o=ordById(e.ordem)||S.ordens.find(z=>String(z.num)===String(e.num||e.ordem)); const c=o&&codigoDe(o); if(c) AP[c]=(AP[c]||0)+(+e.qtd||0); }); }catch(e){} /* feito: o maior entre o Focco e o apontado no painel no mês */ /* previsão do mês: feito (produzido no mês) e o que já tinha (estoque no início do mês) */
  return R.itens.map(x=>{ const it=x.it; const tot=x.base; const cob=x.media>0?tot/x.media:(tot>0?999:0);
  const ofa=x.ordens.reduce((a,o)=>{ const i=R.ix(dataEf(o)); return a+(o.linha&&i>=0?Math.max(0,(+o.total||0)-entregueDe(o)):0); },0); const atr=x.ordens.some(o=>o.linha&&dataEf(o)&&dataEf(o)<R.h);
  const d=x.alvo>=0?x.alvo+1:null; const conf=x.acoes.some(a=>a.t==='antecipar');
  const risco=d===null?'OK':(conf||d<=3)?'CRITICO':d<=7?'URGENTE':d<=14?'MODERADO':'BAIXO';
  const sit=tot<=0?'ZERADO':(x.seg>0&&tot<x.seg)?'ABAIXO':'OK';
  return {x,c:x.c,d:x.d,a3:it.a3||0,a30:it.a30||0,tot,seg:x.seg,dc:x.cart,md:x.media,cob,giro:tot>0&&x.media>0?x.media*22/tot:null,ofa,atr,nec:x.need,rup:d,rupD:x.prazo,risco,sit,pvm:pvM[x.c]||0,pln:pln[x.c]||0,pvF:Math.max(PR[x.c]?PR[x.c].prod||0:0,AP[x.c]||0),pvT:PR[x.c]?PR[x.c].ei||0:null}; }); }
const ANL_RISCO={CRITICO:{t:'Crítico',c:'crit',o:5},URGENTE:{t:'Urgente',c:'crit',o:4},MODERADO:{t:'Moderado',c:'warn',o:3},BAIXO:{t:'Baixo',c:'teal',o:2},OK:{t:'OK',c:'ok',o:1}};
function anlNecTip(x){ const pr=x.proj||[]; if(!pr.length) return ''; let im=0; pr.forEach((p,i)=>{ if(p.s<pr[im].s) im=i; });
  const ent=pr.slice(0,im+1).reduce((a,p)=>a+p.ent,0), sai=pr.slice(0,im+1).reduce((a,p)=>a+p.sai,0), c=pr.slice(0,im+1).reduce((a,p)=>a+p.c+p.p,0), m=pr.slice(0,im+1).reduce((a,p)=>a+p.m,0);
  const minS=Math.min(x.saldo,pr[im].s);
  return 'Nec. produzir = estoque de segurança − menor saldo projetado no horizonte\n'
   +'Saldo hoje: '+anlN(x.saldo)+' (almox 3 + 30'+(x.pos?' + '+anlN(x.pos)+' apontado depois do saldo':'')+(x.fat?' − '+anlN(x.fat)+' faturado depois':'')+')\n'
   +'Até '+dm(pr[im].d)+': + '+anlN(ent)+' entradas (ordens/previsões) − '+anlN(sai)+' saídas ('+anlN(c)+' carteira DC/DP'+(m?' + '+anlN(m)+' média de vendas':'')+')\n'
   +'Menor saldo: '+anlN(minS)+' em '+dm(pr[im].d)+' · Est. seg.: '+anlN(x.seg)+'\n'
   +(x.need>0?'Necessidade: '+anlN(Math.max(x.seg,0))+' − ('+anlN(minS)+') = '+anlN(x.need):'Saldo não fica abaixo do estoque de segurança → nada a produzir'); }
/* Estoques (06/10): sem intermediários na lista principal, sob encomenda à parte, zerado só com demanda, falta programar em lotes, agrupado por linha */
function anlEstX(r){ const x=r.x, it=x.it||{}; r.int=/^M\d/.test(r.c)||/PREMIX|ENSACAD/i.test(r.d||''); r.enc=!!x.enc; r.dem=(r.dc>0)||(r.md>0)||(r.pvm>0);
  r.falta=(x.lotes||[]).reduce((a,l)=>a+(+l.q||0),0); r.mover=x.acoes.filter(a=>a.t!=='nova').length; const LO=linhasOrd(), lf=((it.ln)||[]).filter(l=>LO.includes(l)), pi0=itemDe(r.c), cl=((pi0&&pi0.linhas)||[]).filter(l=>LO.includes(l)); r.lp=cl.length===1?cl:lf.length?lf:(x.linhas||[]); /* 27/10: item com UMA linha em Ajustes › Itens vale antes do Focco */ /* linha do Focco (onde o item é feito); o cadastro diz onde PODE ser feito */ r.lin0=r.lp[0]||''; r.emp=it.emp||null;
  r.sit2=r.int?'INT':r.enc?(r.dc>r.tot?'ENC_FALTA':'ENC'):!r.dem&&r.tot<=0?'SEMGIRO':!r.dem?'SEMGIRO':r.tot<=0?'ZERADO':(r.seg>0&&r.tot<r.seg)?'ABAIXO':'OK';
  r.agir=!r.int&&((r.rup!==null&&r.rup<=7&&r.dem)||r.sit2==='ZERADO'||r.sit2==='ENC_FALTA'); return r; }
const ANL_SIT={ZERADO:['Zerado','crit'],ABAIXO:['Abaixo seg.','warn'],OK:['OK','ok'],SEMGIRO:['Sem giro','neu'],ENC:['Sob encomenda','teal'],ENC_FALTA:['Pedido sem estoque','crit'],INT:['Intermediário','neu']};
function vAnlEst(R){ const A=S.anl; if(!A.es||A.es.v!==2) A.es={v:2,q:'',vis:'principal',linha:'',cob:'',dp:'',ord:'risco',col:'',dir:1,agr:true,mais:false}; const F=A.es;
  const all=anlEstRows(R).map(anlEstX), q=anlNorm(F.q), B=S.anl.base, at=((B.itens||{}).atual)||{}, V=B.vendas||{};
  const base=all.filter(r=>{ if(q&&!anlNorm(r.c+' '+r.d).includes(q)) return false; if(F.linha==='__sem'&&r.lp.length) return false; if(F.linha&&F.linha!=='__sem'&&!r.lp.includes(F.linha)) return false; if(typeof eswOk==='function'&&!eswOk(r)) return false; return true; });
  const VIS=[['principal','Todos',r=>!r.int&&r.sit2!=='SEMGIRO'],['agir','Precisa agir',r=>r.agir],['ZERADO','Zerado com demanda',r=>r.sit2==='ZERADO'],['ABAIXO','Abaixo do seg.',r=>r.sit2==='ABAIXO'],['OK','OK',r=>r.sit2==='OK'],['enc','Sob encomenda',r=>r.sit2==='ENC'||r.sit2==='ENC_FALTA'],['SEMGIRO','Sem giro',r=>r.sit2==='SEMGIRO'],['INT','Intermediários',r=>r.sit2==='INT']];
  const vf=(VIS.find(v=>v[0]===F.vis)||VIS[0])[2];
  let xs=base.filter(r=>{ if(!q&&!vf(r)) return false; if(q&&F.vis!=='principal'&&!vf(r)) return false;
    const cb=r.cob; if(F.cob==='0'&&!(r.tot<=0&&r.dem)) return false; if(['3','7','15','30'].includes(F.cob)&&!(r.md>0&&cb<=+F.cob)) return false; if(F.cob==='30+'&&!(r.md>0&&cb>30)) return false;
    if(F.dp==='com'&&!(r.dc>0)) return false; if(F.dp==='sem'&&r.dc>0) return false; if(F.dp==='risco'&&!(r.dc>0&&r.dc>r.tot)) return false; return true; });
  const cv=v=>v>=999?9999:v;
  const S1={risco:(a,b)=>(b.agir-a.agir)||ANL_RISCO[b.risco].o-ANL_RISCO[a.risco].o||cv(a.cob)-cv(b.cob),falta:(a,b)=>b.falta-a.falta,cob_asc:(a,b)=>cv(a.cob)-cv(b.cob),est_desc:(a,b)=>b.tot-a.tot,dp_desc:(a,b)=>b.dc-a.dc,codigo:(a,b)=>a.c.localeCompare(b.c)};
  if(F.col){ const k=F.col; xs.sort((a,b)=>{ const va=k==='c'?a.c:cv(a[k]||0), vb=k==='c'?b.c:cv(b[k]||0); return (va<vb?-1:va>vb?1:0)*F.dir; }); } else xs.sort(S1[F.ord]||S1.risco); if(typeof eswXs==='function') eswXs(xs,all);
  const sm=(arr,k)=>arr.reduce((a,r)=>a+(r[k]||0),0), prin=all.filter(r=>!r.int);
  const qd=iso=>iso?dm(String(iso).slice(0,10))+(String(iso).length>10?' '+String(iso).slice(11,16):''):'—';
  const k7=prin.filter(r=>r.rup!==null&&r.rup<=7&&r.dem&&!r.enc);
  const kp=[{k:'Vai faltar em até 7 dias',v:k7.length,s:k7.length?k7.slice(0,3).map(r=>r.c).join(', ')+(k7.length>3?'…':''):'nenhum item',c:k7.length?'crit':'ok'},
   {k:'Zerado com demanda',v:prin.filter(r=>r.sit2==='ZERADO').length,s:'tem pedido, previsão ou venda',c:'crit'},
   {k:'Abaixo do seg.',v:prin.filter(r=>r.sit2==='ABAIXO').length,s:'com estoque, abaixo do mínimo',c:'warn'},
   {k:'Falta programar',v:anlN(sm(prin.filter(r=>!r.enc),'falta')),s:'em lotes, além do já programado',c:'teal'},
   {k:'Saldo de',v:qd(at.SALDO),s:at.SALDO_E?Object.keys(at.SALDO_E).sort().map(e=>'E'+e).join(' + '):'uma empresa',c:'s2'},
   {k:'Extrato até',v:V.ate?dm(V.ate):'—',s:'média de vendas',c:'s2'}];
  const cnt=f=>base.filter(f).length;
  const chips=VIS.map(([k,l,f])=>`<button class="chip" data-act="anl-es-vis" data-v="${k}" aria-pressed="${F.vis===k}">${l} <small class="num">${cnt(f)}</small></button>`).join('');
  const sel=(k,ops)=>`<select class="txt anl-sel" data-anl-es="${k}">${ops.map(([v,l])=>`<option value="${v}" ${F[k]===v?'selected':''}>${l}</option>`).join('')}</select>`;
  const th=(k,l,nr,t)=>`<th class="${nr?'nr':''} srt" data-act="anl-esort" data-k="${k}" ${t?`title="${t}"`:''}>${l}${F.col===k?(F.dir>0?' ↑':' ↓'):''}</th>`;
  const M=F.mais, ncol=11+(M?3:0)+(typeof eswTh==='function'?1:0);
  const row=r=>{ const cb=r.cob>=999?999:r.cob, cc=cb<=3?'var(--crit)':cb<=15?'var(--warn)':'var(--ok)', [st,stc]=ANL_SIT[r.sit2]||['—','neu'];
    const empT=r.emp?Object.keys(r.emp).sort().map(e=>'E'+e+' '+anlN((+r.emp[e].a3||0)+(+r.emp[e].a30||0))).join(' + ')+' · ':'';
    return `<tr class="b-${typeof eswCor==='function'?eswCor(r,stc==='teal'?'ok':stc):(stc==='teal'?'ok':stc)}" data-act="anl-item" data-c="${esc(r.c)}"><td class="cd num">${esc(r.c)}</td><td class="pr" title="${esc(r.d)}">${esc(r.d)}${!F.agr||r.lp.length>1?`<small class="anl-lnt">${r.lp.length?esc(r.lp.join(' · ')):'sem linha'}</small>`:''}</td>
     <td class="nr num" title="${esc(empT+'Almox 3 '+anlN(r.a3)+' · Almox 30 '+anlN(r.a30))}"><b class="t-teal">${anlN(r.tot)}</b>${(()=>{ const es=r.emp?Object.keys(r.emp).sort().filter(e=>(+r.emp[e].a3||0)+(+r.emp[e].a30||0)!==0):[]; return es.length>1?`<small>${es.map(e=>'E'+e+' '+anlN((+r.emp[e].a3||0)+(+r.emp[e].a30||0))).join(' · ')}</small>`:''; })()}</td>
     ${M?`<td class="nr num t-mut">${anlN(r.a3)}</td><td class="nr num t-mut">${anlN(r.a30)}</td>`:''}
     <td class="nr num t-mut">${r.enc?'—':anlN(r.seg)}</td>
     <td class="nr num">${r.dc>0?`<b class="${r.dc>r.tot?'t-crit':''}">${anlN(r.dc)}</b>`:'<span class="t-mut">—</span>'}${r.md>0?`<small>${anlN(r.md)}/d</small>`:''}</td>
     <td>${r.md>0||r.tot<=0?`<span class="anl-pb w"><i style="width:${Math.min(cb,30)/30*100}%;background:${cc}"></i></span><small class="num" style="color:${cc};font-weight:700">${cb>=999?'∞':cb.toFixed(1).replace('.',',')+'d'}</small>`:'<span class="t-mut">sem venda</span>'}</td>
     <td class="nr num">${r.pvm>0?anlN(r.pvm):'<span class="t-mut">—</span>'}${r.pvm>0||r.pvF>0?`<small class="anl-pvf" title="Feito = produzido neste mês (Focco) · Tinha = estoque no começo do mês">feito ${anlN(r.pvF)} · tinha ${r.pvT==null?'—':anlN(r.pvT)}</small>`:''}${r.pln>0?`<small style="color:var(--teal)">plan. ${anlN(r.pln)}</small>`:''}</td>
     ${typeof eswCel==='function'?eswCel(r):''}
     <td class="nr num">${r.ofa>0?anlN(r.ofa):'<span class="t-mut">—</span>'}${r.atr?' <span title="Ordem atrasada" class="t-warn">⏰</span>':''}</td>
     <td class="nr num" title="${esc(anlNecTip(r.x))}" style="cursor:help">${r.falta>0?`<b class="t-crit">${anlN(r.falta)}</b>`:'<span class="t-ok">—</span>'}${r.mover?`<small class="t-warn">+${r.mover} ordem a mover</small>`:''}</td>
     ${M?`<td class="nr"><span class="anl-bdg ${r.giro==null?'neu':r.giro>=1.5?'ok':r.giro>=0.8?'teal':'warn'}">${r.giro==null?'—':r.giro.toFixed(2).replace('.',',')+'x'}</span></td>`:''}
     <td>${r.rup!==null&&!r.enc&&r.dem?`<span class="anl-bdg ${r.rup<=7?'crit':'warn'}">⏰ ${r.rup}d · ${dm(r.rupD)}</span>`:'<span class="t-mut">—</span>'}</td>
     <td><span class="anl-bdg ${stc}">${st}</span></td>
     <td>${S.anl.salvo&&S.anl.salvo.c===r.c?'<span class="anl-plan ok">✓ Salvo</span>':''}<button class="anl-plan" data-act="anl-sug" data-c="${esc(r.c)}" title="Incluir uma previsão (planejada) deste item">+ planejar</button></td></tr>`; };
  let corpo='';
  /* 27/10 (pedido "quando filtrar tem que aparecer a linha, está se misturando"): agrupa por linha também com a coluna ordenada
     (a ordem vale dentro de cada linha) e, com uma linha escolhida, todos os itens ficam no grupo dela (antes iam para a 1ª linha do item). */
  if(F.agr){ const L=linhasOrd(), grp=new Map(), fl=F.linha&&F.linha!=='__sem'?F.linha:''; xs.forEach(r=>{ const k=fl||r.lin0||'__sem'; if(!grp.has(k)) grp.set(k,[]); grp.get(k).push(r); });
    const ord=[...grp.keys()].sort((a,b)=>(a==='__sem')-(b==='__sem')||L.indexOf(a)-L.indexOf(b));
    corpo=ord.map(k=>{ const rs=grp.get(k), f=sm(rs.filter(r=>!r.enc),'falta'), cap=k!=='__sem'?capDe(k):0;
      return `<tr class="anl-gh"><td colspan="${ncol}"><b>${k==='__sem'?'Sem linha cadastrada':esc(k)}</b><span>${rs.length} ${rs.length===1?'item':'itens'}</span>${f>0?`<span>falta programar <b class="t-crit num">${anlN(f)}</b>${cap?` · ≈ ${(f/cap).toFixed(1).replace('.',',')} dia${f/cap>=2?'s':''} de linha (${anlN(cap)}/dia)`:''}</span>`:'<span class="t-ok">nada a programar</span>'}</td></tr>`+rs.map(row).join(''); }).join(''); }
  else corpo=xs.map(row).join('');
  return `<!--esw:a-->${anlHead('Análise de Estoques','Posição · cobertura × demanda · o que falta programar, por linha',`<button class="btn sec" data-act="anl-xls" data-v="est" style="height:42px">${ic('baixar',16,2)}Exportar Excel</button>`)}
  ${anlKpis(kp)}<!--esw:b-->
  <section class="card anl-tcard"><div class="anl-th"><div class="label">MOSTRAR</div><span class="fcount num">${xs.length} ${xs.length===1?'item':'itens'}</span><button class="btn sec" data-act="anl-es-limpar" style="height:36px;margin-left:8px">Limpar</button></div>
   <div class="chips anl-esv">${chips}</div>
   <div class="anl-fl"><label class="srch" style="max-width:none;margin:0;flex:2 1 220px">${ic('lupa',16,2)}<input class="txt" id="anl-esq" value="${esc(F.q)}" placeholder="Buscar código ou produto (procura em tudo)…" autocomplete="off"></label>
    <select class="txt anl-sel" data-anl-es="linha"><option value="">Todas as linhas</option>${linhasOrd().map(l=>`<option value="${esc(l)}" ${F.linha===l?'selected':''}>${esc(l)}</option>`).join('')}<option value="__sem" ${F.linha==='__sem'?'selected':''}>Sem linha cadastrada</option></select>
    ${sel('cob',[['','Toda cobertura'],['0','Zerada (com demanda)'],['3','Até 3 dias'],['7','Até 7 dias'],['15','Até 15 dias'],['30','Até 30 dias'],['30+','Mais de 30 dias']])}${sel('dp',[['','Com e sem pedido'],['com','Com pedido (DC)'],['sem','Sem pedido'],['risco','Pedido maior que o saldo']])}
    ${sel('ord',[['risco','Prioridade'],['falta','Maior falta programar'],['cob_asc','Menor cobertura'],['est_desc','Maior estoque'],['dp_desc','Maior pedido'],['codigo','Código A→Z']])}
    <label class="ck" style="font-size:13px"><input type="checkbox" data-anl-esc="agr" ${F.agr?'checked':''}> Agrupar por linha</label><label class="ck" style="font-size:13px"><input type="checkbox" data-anl-esc="mais" ${F.mais?'checked':''}> Mais colunas</label></div></section><!--esw:c-->
  <section class="card anl-tcard"><div class="anl-tw"><table class="anl-t"><thead><tr>${th('c','Código')}<th>Produto</th>${th('tot','Saldo',1,'E1 + E9 · almox 3 + 30')}${M?th('a3','Almox 3',1)+th('a30','Almox 30',1):''}<th class="nr">Est. seg.</th>${th('dc','Pedidos (DC)',1)}${th('cob','Cobertura')}<th class="nr" title="Previsão do Focco para o mês · embaixo, o já feito no mês, o estoque que já tinha no começo do mês e o planejado no painel">Previsão ${anlPvMesLab()}</th>${typeof eswTh==='function'?eswTh():''}${th('ofa','Em ordem',1,'Saldo das ordens abertas programadas no horizonte')}${th('falta','Falta programar',1,'Lotes novos (respeitando lote mínimo e múltiplo) além do que já está em ordem ou previsão')}${M?'<th class="nr">Giro/mês</th>':''}<th>Ruptura prev.</th><th>Situação</th><th></th></tr></thead>
   <tbody>${corpo}</tbody></table>
   ${xs.length?'':`<div class="empty">Nenhum item${q?' com "'+esc(F.q)+'"':''} nesta visão.${F.vis!=='principal'||F.linha||F.cob||F.dp?' <button class="lnk" data-act="anl-es-limpar">Limpar filtros</button>':''}</div>`}</div></section><!--esw:d-->
  <div class="sub" style="font-size:12px;margin:0 0 8px">Cobertura = saldo ÷ venda média por dia útil (só para itens com venda). Falta programar = lotes novos que a análise sugere para não ficar abaixo do estoque de segurança no horizonte, já descontando ordens abertas e previsões. Premix e ensacado ficam em "Intermediários"; exportação (RE…) e Quero Quero em "Sob encomenda".</div>`; }


// ================= 27/09: backup, arquivo de entregas, montar semana, resumo do dia, eficiência, insumos =================
function anlInjeta(html,card){ if(!card) return html; const i=html.indexOf('<section'); return i<0?html+card:html.slice(0,i)+card+html.slice(i); }
function anlDl(){ return window.claude?.use?.('downloads'); }

// ---------- 1a. backup em Excel ----------
async function anlBackup(){ if(!S.db){ toast('Sem conexão com o armazenamento.'); return; } const dl=await anlDl(); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  S.anl.bkp=true; render();
  try{ await carregarScript(ANL_XLSX); const XL=window.XLSX, wb=XL.utils.book_new();
    const cols=['ordens','entregas','paradas','medicoes','premix','cargas','previsoes','itens','ranchos','diario','conferencias','recebimentos','auditorias']; const res={};
    for(const c of cols){ const q=await S.db.collection(c).limit(1000).get(); res[c]=q.docs.map(d=>Object.assign({_id:d.id},d.data())); }
    const arq=await S.db.collection('entregasarq').limit(500).get(); arq.docs.forEach(d=>(d.data().l||[]).forEach(e=>res.entregas.push(Object.assign({arquivada:d.id},e))));
    const cfg=await S.db.doc('config/geral').get(); res.config=cfg.exists?[Object.assign({_id:'geral'},cfg.data())]:[];
    const plano=v=>{ const s=v==null?'':typeof v==='object'?JSON.stringify(v):v; return typeof s==='string'&&s.length>32000?s.slice(0,32000)+'…':s; };
    for(const c in res){ const xs=res[c]; const ks=[...new Set(xs.flatMap(x=>Object.keys(x)))]; const aoa=[ks].concat(xs.map(x=>ks.map(k=>plano(x[k])))); XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(aoa.length>1?aoa:[['(vazio)']]),c.slice(0,31)); }
    const arr=XL.write(wb,{type:'array',bookType:'xlsx'}); const h=hojeStr();
    await dl.save({filename:'backup_painel_colafix_'+h+'.xlsx',data:new Blob([arr])});
    const em=new Date().toISOString(); S.cfg.backupEm=em; await S.db.doc('config/geral').update({backupEm:em,backupPor:S.uid||null}); toast('Backup salvo.');
  }catch(e){ console.warn('backup',e); if(e&&e.code) erro(e); else toast('O backup não foi salvo.'); }
  S.anl.bkp=false; render(); }

// ---------- 1b. arquivar entregas antigas (1 registro por mês em vez de 1 por entrega) ----------
function anlArqCorte(){ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-01'; } // meses antes do mês passado
async function anlArquivar(){ if(!S.db||S.anl.arq) return; const corte=anlArqCorte();
  const velhas=(S._entViva||[]).filter(e=>e.em&&hojeStr(new Date(e.em))<corte); if(!velhas.length){ toast('Nada para arquivar.'); return; }
  S.anl.arq={feito:0,tot:velhas.length}; render();
  try{ const porMes={}; velhas.forEach(e=>{ const cp=hojeStr(new Date(e.em)).slice(0,7); (porMes[cp]=porMes[cp]||[]).push(e); });
    for(const cp in porMes){ const s=await S.db.doc('entregasarq/'+cp).get(); const m=new Map(); ((s.exists&&s.data().l)||[]).forEach(e=>m.set(e._id,e)); porMes[cp].forEach(e=>m.set(e._id,Object.assign({},e)));
      const l=[...m.values()].sort((a,b)=>String(a.em).localeCompare(String(b.em))); if(JSON.stringify(l).length>240000) throw {code:'grande',message:cp};
      await S.db.doc('entregasarq/'+cp).set({l,em:new Date().toISOString(),por:S.uid||null});
      const chk=await S.db.doc('entregasarq/'+cp).get(); const ids=new Set(((chk.exists&&chk.data().l)||[]).map(e=>e._id)); if(!porMes[cp].every(e=>ids.has(e._id))) throw {code:'conferencia',message:cp}; }
    for(const e of velhas){ await S.db.doc('entregas/'+e._id).delete(); S.anl.arq.feito++; if(S.anl.arq.feito%20===0) render(); }
    const ids=new Set(velhas.map(e=>e._id)); S._entViva=(S._entViva||[]).filter(e=>!ids.has(e._id)); try{ const q=await S.db.collection('entregasarq').limit(500).get(); S._entArq=q.docs.map(d=>Object.assign({_id:d.id},d.data())); }catch(_){}
    toast(velhas.length+' entregas arquivadas em '+Object.keys(porMes).length+' registro(s) mensal(is).');
  }catch(e){ console.warn('arquivar',e); toast(e&&e.code==='conferencia'?'Parei: a conferência do arquivo de '+e.message+' não bateu. Nada foi apagado desse mês.':'Não foi possível arquivar agora. As entregas continuam no lugar.'); }
  S.anl.arq=null; render(); }
function anlBackupCard(){ const c=S.cfg, em=c.backupEm; const dias=em?Math.floor((Date.now()-new Date(em))/864e5):null; const viva=(S._entViva||[]).length, arqN=(S._entArq||[]).reduce((a,d)=>a+((d.l||[]).length),0);
  const corte=anlArqCorte(); const velhas=(S._entViva||[]).filter(e=>e.em&&hojeStr(new Date(e.em))<corte).length; const A=S.anl.arq;
  return `<section class="card"><h2>Backup e arquivo</h2><div class="sub" style="margin-bottom:10px">O banco do painel guarda até 5.000 registros. O backup baixa tudo num Excel; o arquivo junta as entregas antigas em um registro por mês (nada é apagado do histórico).</div>
   <div class="two" style="gap:16px"><div><div class="label">BACKUP</div><div class="sub" style="margin:4px 0 10px">${em?`Último: ${dm(hojeStr(new Date(em)))} (${dias===0?'hoje':dias===1?'ontem':'há '+dias+' dias'})`:'Nenhum backup ainda.'} Recomendado: 1 vez por semana.</div>
    <button class="btn ${dias==null||dias>=7?'':'sec'}" data-act="anl-bkp" ${S.anl.bkp?'disabled':''}>${ic('baixar',18,2)}${S.anl.bkp?'Gerando…':'Baixar backup (Excel)'}</button>${S.acs&&S.acs.dono&&VIEWS.backup?`<button class="btn sec" data-go="backup" style="margin-left:8px">${ic('baixar',18,2)}Cópia completa (.json)</button><div class="sub" style="margin:8px 0 0;font-size:12.5px">A cópia completa (.json) é a que serve para levar tudo para outro projeto do Firebase.</div>`:''}</div>
   <div><div class="label">ENTREGAS</div><div class="sub num" style="margin:4px 0 10px">${viva} registro(s) avulso(s) · ${arqN} já arquivada(s). ${velhas?`<b>${velhas}</b> de antes de ${dm(corte)} podem ser arquivadas.`:'Nada para arquivar agora (ficam avulsas as do mês atual e do anterior).'}</div>
    ${velhas?`<button class="btn sec" data-act="anl-arq" ${A?'disabled':''}>${A?`Arquivando ${A.feito} de ${A.tot}…`:'Arquivar entregas antigas'}</button>`:''}</div></div></section>`; }

// ---------- 2. montar a semana no calendário ----------
function anlMontPlano(R){ const C=R.carga, out=[]; const fim=C.D[Math.min(C.n,10)-1];
  C.alocs.forEach(f=>{ (f.lt.parts||[]).forEach(p=>{ const d=C.D[p.i]; if(!d||d>fim) return; out.push({k:f.x.c+'|'+p.l+'|'+d,c:f.x.c,dsc:f.x.d,un:f.x.un,linha:p.l,data:d,q:Math.round(p.q),ate:f.lt.d,tarde:p.i>f.lt.i}); }); });
  const m=new Map(); out.forEach(r=>{ const o=m.get(r.k); if(o){ o.q+=r.q; o.tarde=o.tarde||r.tarde; } else m.set(r.k,r); });
  return [...m.values()].filter(r=>r.q>0).sort((a,b)=>a.data.localeCompare(b.data)||linhasOrd().indexOf(a.linha)-linhasOrd().indexOf(b.linha)); }
function anlMontUlt(){ const ps=(S.previsoes||[]).filter(p=>p.montagem&&p.status==='prevista'); if(!ps.length) return null; const id=ps.map(p=>p.montagem).sort().pop(); return {id,n:ps.filter(p=>p.montagem===id).length}; }
function anlMontPainel(R){ const M=S.anl.mont; if(!M) return ''; const pl=anlMontPlano(R); if(!M.sel) M.sel=new Set(pl.map(r=>r.k));
  const n=pl.filter(r=>M.sel.has(r.k)).length;
  return `<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><div><div class="label">MONTAR SEMANA NO CALENDÁRIO</div><div class="sub" style="margin:4px 0 0;font-size:13px">Cada lote sugerido vira uma <b>previsão</b> (tracejada no Calendário), na linha e no dia em que a análise encaixou. Depois é só ajustar em Produção → Previsão e confirmar com o número quando a ordem sair.</div></div><button class="lnk" data-act="anl-mont-x">Fechar</button></div>
   ${pl.length?`<div style="max-height:420px;overflow:auto;margin-top:10px">${pl.map(r=>`<label class="impl" style="cursor:pointer;align-items:center"><span class="ck"><input type="checkbox" data-anl-mont="${esc(r.k)}" ${M.sel.has(r.k)?'checked':''}> <b class="num">${dm(r.data)}</b> · ${esc(r.linha)} · <b>${esc(r.c)}</b> ${esc((r.dsc||'').slice(0,34))}${corAtiva(r.linha)?(c=>c?` <span class="corc ${c.g==='E'?'esc':c.g==='X'?'fora':''}">${esc(c.nome)}</span>`:'')(corDe(r.c+' - '+(r.dsc||''))):''}</span><span class="num">${anlN(r.q)} ${r.un} · precisa até ${anlQuando(r.ate)}${r.tarde?' · <span class="t-crit">depois do prazo</span>':''}</span></label>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap">${pl.some(r=>corAtiva(r.linha))?`<label class="ck" style="font-size:13px"><input type="checkbox" data-anl-mont-cor ${M.cor!==false?'checked':''}> Ordenar por cor os dias das linhas ${esc(corCfg().linhas.join(' e '))}</label>`:'<span></span>'}<button class="btn" data-act="anl-mont-ok" ${n&&!M.grav?'':'disabled'}>${ic('check',18,2.2)}${M.grav?'Criando…':'Criar '+n+' previs'+(n===1?'ão':'ões')}</button></div>`:'<div class="empty">Nenhum lote sugerido encaixado nos próximos dias.</div>'}</section>`; }
async function anlMontCriar(){ const R=anlDados(), M=S.anl.mont; if(!R||!M||!S.db) return; const pl=anlMontPlano(R).filter(r=>M.sel.has(r.k)); if(!pl.length) return;
  M.grav=true; render(); const id=new Date().toISOString(); let ok=0;
  try{ for(const r of pl){ await S.db.collection('previsoes').add({produto:r.c+' - '+(r.dsc||''),codigo:r.c,qtd:r.q,linha:r.linha,data:r.data,obs:'Montagem da semana (Análise PCP) · precisa até '+dm(r.ate),status:'prevista',origem:'analise',montagem:id,criadoEm:new Date().toISOString(),por:S.uid}); ok++; }
    S.anl.mont=null; let ords=0;
    if(M.cor!==false){ await new Promise(r=>setTimeout(r,400)); const ks=[...new Set(pl.filter(r=>corAtiva(r.linha)).map(r=>r.linha+'|'+r.data))];
      for(const k of ks){ const [l,d]=k.split('|'); const xs=corLista(l,d); const sug=corSugerida(xs); if(corAvaliar(sug).n<corAvaliar(xs).n){ const lista=sug.map(seqId); await reordenarCal(lista[0],l,d,true,lista); ords++; } } }
    toast(ok+' previsões criadas. Aparecem tracejadas no Calendário.'+(ords?' '+ords+' dia(s) ordenado(s) por cor.':'')); }catch(e){ erro(e); if(M) M.grav=false; }
  render(); }
async function anlMontDesfazer(){ const u=anlMontUlt(); if(!u||!S.db) return; if(S.anl.desf!==u.id){ S.anl.desf=u.id; render(); return; } S.anl.desf=null;
  try{ for(const p of (S.previsoes||[]).filter(p=>p.montagem===u.id&&p.status==='prevista')) await S.db.doc('previsoes/'+p._id).update({status:'excluida',exclEm:new Date().toISOString(),exclPor:S.uid}); toast('Montagem desfeita ('+u.n+' previsões excluídas).'); }catch(e){ erro(e); } render(); }

// ---------- 3. resumo do dia ----------
function anlResDiaTexto(){ const h=hojeStr(), L=linhasOrd(), an=anuladas(); const ini=new Date(h+'T00:00:00').toISOString();
  const hoje=ordensDoDia(h); const entH=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&hojeStr(new Date(e.em))===h);
  const dt=new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'});
  const out=[`*Resumo do dia · Colafix · ${dt}*`,''];
  let tp=0, te=0; const lin=[];
  L.forEach(l=>{ const os=S.ordens.filter(o=>o.linha===l&&(dataEf(o)===h||(o.status!=='aberta'&&o.fimEm&&hojeStr(new Date(o.fimEm))===h&&dataEf(o)===h)));
    const prog=os.reduce((a,o)=>a+Math.max(0,(+o.total||0)-entregueAte(o,ini)),0); const ent=entH.filter(e=>e.linha===l).reduce((a,e)=>a+(+e.qtd||0),0);
    if(!prog&&!ent) return; tp+=prog; te+=ent; lin.push(`• ${l}: ${fq(ent)} de ${fq(prog)}${prog?' ('+Math.round(ent/prog*100)+'%)':''} · ${os.length} ordem(ns)`); });
  out.push('*Produção (entregue × programado)*'); out.push(...(lin.length?lin:['• Nada programado nem entregue hoje.'])); if(lin.length>1) out.push(`Total: ${fq(te)} de ${fq(tp)}`); out.push('');
  { const A=adeOntem(); if(A){ out.push(`*Aderência à programação (${dm(A.d)})*: ${Math.round(A.p.pctO)}% das ordens no dia (${A.p.ok} de ${A.p.n}) · ${Math.round(A.p.pctQ)}% da quantidade`); out.push(''); } }
  const pars=S.paradas.filter(p=>hojeStr(new Date(p.inicio))===h||!p.fim);
  out.push('*Paradas*'); out.push(...(pars.length?pars.map(p=>`• ${p.linha} · ${p.motivo} · ${dur((p.fim?new Date(p.fim):new Date())-new Date(p.inicio))}${p.fim?'':' (ainda parada)'}${p.obs?' · '+p.obs:''}`):['• Nenhuma.'])); out.push('');
  const atr=ordAbertas().filter(o=>ordAtras(o,h)); if(atr.length){ out.push(`*Ordens atrasadas: ${atr.length}*`); out.push(atr.slice(0,8).map(o=>`${o.num} (${o.linha}, ${dm(dataEf(o))})`).join(', ')+(atr.length>8?'…':'')); out.push(''); }
  let d=addDias(h,1); for(let g=0;g<5&&!anlUtil(d);g++) d=addDias(d,1); const am=ordensDoDia(d);
  out.push(`*Próximo dia útil (${dm(d)})*: ${am.length} ordem(ns) em ${new Set(am.map(o=>o.linha)).size} linha(s)${am.filter(o=>!o.rancho).length?' · '+am.filter(o=>!o.rancho).length+' sem rancho':''}`);
  const R=anlDados(); if(R){ const n3=R.dias[Math.min(2,R.dias.length-1)]; const f=R.itens.filter(x=>x.st==='falta'&&x.prazo<=n3); if(f.length){ out.push(''); out.push(`*Falta prevista até ${dm(n3)}*: ${f.slice(0,8).map(x=>x.c).join(', ')}${f.length>8?'…':''}`); } }
  const pc=previsaoCimento(); if(pc){ out.push(''); out.push(`*Cimento*: estoque estimado ${(Math.round(pc.estoque*10)/10).toLocaleString('pt-BR')} t${pc.falta?' · acaba '+dmTxt(pc.falta.dia).toLowerCase()+' (ordem '+pc.falta.o.num+')':' · suficiente para o programado'}`); }
  return out.join('\n'); }
function anlResDiaModal(){ if(!S.anl.resDia) return ''; const t=anlResDiaTexto(); const zn=zapNum();
  return `<div class="omodal" data-act="anl-resdia-x"><div class="obox" role="dialog" aria-modal="true" aria-label="Resumo do dia" style="width:min(720px,100%)">
   <div class="ohd"><div><div class="label">RESUMO DO DIA</div><div class="sub" style="margin:2px 0 0;font-size:13px">Para mandar à gerência. Dá para editar o texto antes.</div></div><button class="btn sec" data-act="anl-resdia-x" data-x="1" aria-label="Fechar" style="height:40px;width:40px;padding:0">✕</button></div>
   <div style="padding:16px 20px 20px"><textarea class="txt num" id="anl-resdia-t" rows="18" style="font-size:13.5px;line-height:1.45">${esc(t)}</textarea>
    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px"><button class="btn sec" data-act="anl-resdia-copiar">Copiar texto</button><button class="btn sec" data-act="anl-resdia-pdf">${ic('baixar',16,2)}Baixar PDF</button><button class="btn" data-act="anl-resdia-zap">${ic('zap',18,2)}Abrir no WhatsApp${zn?'':' (escolher contato)'}</button></div></div></div></div>`; }
async function anlResDiaPdf(){ const t=($('#anl-resdia-t')||{}).value||anlResDiaTexto(); if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } const dl=await anlDl(); if(!dl){ toast('Download indisponível.'); return; }
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}); let y=18; doc.setFont('helvetica','normal');
  t.split('\n').forEach(l=>{ const neg=/^\*.*\*/.test(l); const tx=l.replace(/\*/g,''); doc.setFont('helvetica',neg?'bold':'normal'); doc.setFontSize(neg&&y===18?14:10.5); doc.splitTextToSize(tx||' ',180).forEach(p=>{ if(y>282){ doc.addPage(); y=18; } doc.text(p,15,y); y+=neg&&y===18?8:5.4; }); });
  try{ await dl.save({filename:'resumo_do_dia_'+hojeStr()+'.pdf',data:doc.output('arraybuffer')}); }catch(e){} }

// ---------- 4. eficiência por linha (Indicadores) ----------
function anlEficiencia(){ const [ini,fim,rot]=perInd(), lf=S.ind.linha, h=hojeStr(); const ate=fim>addDias(h,1)?addDias(h,1):fim;
  const du=Math.max(0,anlUteisEntre(ini,ate)); const ps=expediente(), exp=ps.reduce((a,[i,f])=>a+f-i,0); const an=anuladas();
  const t0=new Date(ini+'T00:00:00').getTime(), t1=Math.min(Date.now(),new Date(fim+'T00:00:00').getTime());
  const CR=capRealCalc(linhasOrd()).CAPR; const rows=linhasOrd().filter(l=>!lf||l===lf).map(l=>{ const cap=capDe(l); const prod=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&e.linha===l).filter(e=>{ const d=hojeStr(new Date(e.em)); return d>=ini&&d<fim; }).reduce((a,e)=>a+(+e.qtd||0),0);
    const mot={}; let par=0; S.paradas.filter(p=>p.linha===l).forEach(p=>{ const a=Math.max(t0,new Date(p.inicio).getTime()), b=Math.min(t1,p.fim?new Date(p.fim).getTime():Date.now()); const ms=Math.max(0,b-a); if(!ms) return; par+=ms; mot[p.motivo]=(mot[p.motivo]||0)+ms; });
    const disp=cap*du, uso=disp?prod/disp*100:null, pm=exp*du*6e4, parPct=pm?par/pm*100:null; const top=Object.entries(mot).sort((a,b)=>b[1]-a[1])[0];
    return {l,cap,prod,disp,uso,par,parPct,top}; }).filter(r=>r.prod||r.par||r.cap);
  if(!rows.length) return '';
  const bar=(p,inv)=>{ if(p==null) return '<span class="t-mut">—</span>'; const c=inv?(p>15?'var(--crit)':p>5?'var(--warn)':'var(--ok)'):(p>=85?'var(--ok)':p>=60?'var(--warn)':'var(--crit)'); return `<span class="anl-pb w"><i style="width:${Math.min(100,p)}%;background:${c}"></i></span><b class="num">${Math.round(p)}%</b>`; };
  return `<section class="card"><div class="head" style="align-items:baseline;margin-bottom:6px"><div class="label">EFICIÊNCIA POR LINHA · ${esc(rot).toUpperCase()}</div><span class="sub num" style="margin:0;font-size:12.5px">${du} dia(s) útil(eis) · expediente de ${dur(exp*6e4)} por dia</span></div>
   <div style="overflow-x:auto"><table class="rtab"><thead><tr><th>Linha</th><th class="nr">Capacidade no período</th><th class="nr">Produzido</th><th>Uso da capacidade</th><th class="nr">Real (por dia)</th><th class="nr">Tempo parado</th><th>Parado / expediente</th><th>Maior causa</th></tr></thead><tbody>
   ${rows.map(r=>`<tr><th>${esc(r.l)}</th><td class="nr num">${r.cap?anlN(r.disp):'<span class="t-mut">sem capacidade</span>'}</td><td class="nr num">${anlN(r.prod)}</td><td>${bar(r.uso)}</td><td class="nr num">${CR[r.l]?anlN(CR[r.l])+(r.cap?' <small>'+Math.round(CR[r.l]/r.cap*100)+'% da nominal</small>':''):'<span class="t-mut">—</span>'}</td><td class="nr num">${r.par?dur(r.par):'—'}</td><td>${bar(r.parPct,1)}</td><td>${r.top?esc(r.top[0])+' <small>'+dur(r.top[1])+'</small>':'—'}</td></tr>`).join('')}</tbody></table></div>
   <div class="sub" style="font-size:12px;margin:8px 0 0">Uso da capacidade = entregue ÷ (capacidade nominal × dias úteis). Real = média dos 5 melhores dias de linha cheia dos últimos 20 dias úteis: é a que vale para dizer se o mês cabe. Parado = paradas registradas ÷ expediente. Linha sem capacidade cadastrada mostra só o produzido.</div></section>`; }

// ---------- 5. insumos (embalagem e matéria-prima) ----------
function anlInsumos(){ return ((S.cfg.analise||{}).insumos)||[]; }
function anlInsCalc(R){ const C=R.carga, IL=(S.anl.base.itens||{}).l||{}; return anlInsumos().map(s=>{ const usos={}; (s.usos||[]).forEach(u=>usos[u.p]=+u.q||0);
    const b=IL[s.cod]; const doFocco=b&&b.sal; const est=doFocco?(b.a3||0)+(b.a30||0):(+s.estoque||0);
    const dia=C.D.map(()=>0); C.L.forEach(l=>C.cell[l].forEach((c,i)=>c.its.forEach(z=>{ const cod=z.t==='o'?codigoDe(z.o):z.t==='p'?z.p.codigo:z.x.c; if(usos[cod]) dia[i]+=z.q*usos[cod]; })));
    let acc=0, acaba=null; dia.forEach((v,i)=>{ acc+=v; if(acaba===null&&acc>est+1e-9) acaba=C.D[i]; }); return {s,est,doFocco,uso:acc,acaba}; }); }
function anlInsCard(R){ const xs=anlInsCalc(R), F=S.anl.insF;
  return `<section class="card"><div class="head" style="align-items:baseline"><div class="label">INSUMOS · EMBALAGEM E MATÉRIA-PRIMA</div><button class="lnk" data-act="anl-ins-novo">+ Cadastrar insumo</button></div>
   <div class="sub" style="margin:4px 0 8px;font-size:12.5px">Quanto o programado e os lotes sugeridos dos próximos ${R.carga.n} dias úteis consomem de cada insumo. Quando a ficha técnica do Focco for importada, os consumos passam a vir de lá.</div>
   ${F?`<div class="opanel" style="margin:0 0 10px;background:var(--surface-2)"><div class="ed-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
     <label><span class="sub">Código</span><input class="txt" id="anl-ins-cod" value="${esc(F.cod||'')}" placeholder="ex.: EMB0012"></label><label><span class="sub">Nome</span><input class="txt" id="anl-ins-nome" value="${esc(F.nome||'')}" placeholder="ex.: Saco papel AC3"></label>
     <label><span class="sub">Unidade</span><input class="txt" id="anl-ins-un" value="${esc(F.un||'')}" placeholder="un, kg…"></label><label><span class="sub">Estoque atual</span><input class="txt num" id="anl-ins-est" inputmode="decimal" value="${esc(F.estoque!=null?String(F.estoque):'')}" placeholder="se não vier no Saldo"></label></div>
    <label style="display:flex;flex-direction:column;gap:4px;margin-top:10px"><span class="sub" style="margin:0;font-size:12px">Produtos que usam e quanto por unidade produzida (um por linha, ex.: AC0005=1)</span><textarea class="txt num" id="anl-ins-usos" rows="3" placeholder="AC0005=1&#10;AC0001=1">${esc((F.usos||[]).map(u=>u.p+'='+String(u.q).replace('.',',')).join('\n'))}</textarea></label>
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:10px">${F.id?`<button class="lnk" data-act="anl-ins-del" style="color:var(--crit-ink)">${S.anl.insDel?'Confirmar exclusão':'Excluir insumo'}</button>`:'<span></span>'}<div style="display:flex;gap:10px"><button class="lnk" data-act="anl-ins-x">Cancelar</button><button class="btn" data-act="anl-ins-ok" style="height:40px">Salvar</button></div></div></div>`:''}
   ${xs.length?xs.map(r=>`<div class="impl" style="cursor:pointer" data-act="anl-ins-ed" data-id="${esc(r.s.id)}"><span><b class="num">${esc(r.s.cod||'')}</b> ${esc(r.s.nome||'')} <small class="t-mut">· estoque ${anlN(r.est)} ${esc(r.s.un||'')} ${r.doFocco?'(Saldo do Focco)':'(informado)'}</small></span><span class="num ${r.acaba?'t-crit':''}">usa ${anlN(r.uso)}${r.acaba?' · <b>acaba '+anlQuando(r.acaba)+'</b>':' · suficiente'}</span></div>`).join(''):(F?'':'<div class="sub" style="margin:0;font-size:12.5px">Nenhum insumo cadastrado.</div>')}</section>`; }
async function anlInsSalvar(){ const F=S.anl.insF; if(!F) return; const g=id=>(($('#'+id)||{}).value||'').trim();
  const cod=g('anl-ins-cod').toUpperCase(), nome=g('anl-ins-nome'); if(!cod&&!nome){ toast('Informe o código ou o nome.'); return; }
  const usos=[]; g('anl-ins-usos').split(/[\n;]+/).forEach(x=>{ const m=x.split('='); if(m.length!==2) return; const p=m[0].trim().toUpperCase(), q=numIn(m[1]); if(p&&q>0) usos.push({p,q}); });
  if(!usos.length){ toast('Informe ao menos um produto, no formato AC0005=1.'); return; }
  const e=numIn(g('anl-ins-est')); const it={id:F.id||('i'+Date.now().toString(36)),cod,nome,un:g('anl-ins-un'),estoque:e==null?null:e,estEm:new Date().toISOString(),usos};
  const lista=anlInsumos().filter(x=>x.id!==it.id).concat([it]); const nv=Object.assign({},anlCfg(),{insumos:lista}); S.cfg.analise=nv; S.anl.insF=null; render();
  if(S.db) try{ await S.db.doc('config/geral').update({analise:nv}); toast('Insumo salvo.'); }catch(err){ erro(err); } }
async function anlInsExcluir(){ const F=S.anl.insF; if(!F||!F.id) return; if(!S.anl.insDel){ S.anl.insDel=true; render(); return; } S.anl.insDel=false;
  const nv=Object.assign({},anlCfg(),{insumos:anlInsumos().filter(x=>x.id!==F.id)}); S.cfg.analise=nv; S.anl.insF=null; render(); if(S.db) try{ await S.db.doc('config/geral').update({analise:nv}); toast('Insumo excluído.'); }catch(err){ erro(err); } }

document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="anl-"]'); if(!b||b.disabled) return; const act=b.dataset.act, A=S.anl;
  if(act==='anl-bkp'){ anlBackup(); return; }
  if(act==='anl-arq'){ if(A.arqConf!==true){ A.arqConf=true; b.textContent='Confirmar: arquivar agora'; return; } A.arqConf=false; anlArquivar(); return; }
  if(act==='anl-mont'){ A.mont={sel:null}; render(); return; }
  if(act==='anl-mont-x'){ A.mont=null; render(); return; }
  if(act==='anl-mont-ok'){ anlMontCriar(); return; }
  if(act==='anl-mont-desf'){ anlMontDesfazer(); return; }
  if(act==='anl-resdia'){ A.resDia=true; render(); return; }
  if(act==='anl-resdia-x'){ if(ev.target!==b&&!b.dataset.x) return; A.resDia=false; render(); return; }
  if(act==='anl-resdia-copiar'){ const t=$('#anl-resdia-t'); if(t){ navigator.clipboard&&navigator.clipboard.writeText(t.value).then(()=>toast('Texto copiado.'),()=>{ t.select(); document.execCommand&&document.execCommand('copy'); toast('Texto copiado.'); }); } return; }
  if(act==='anl-resdia-zap'){ const t=$('#anl-resdia-t'); window.open(zapLink(t?t.value:anlResDiaTexto()),'_blank','noopener'); return; }
  if(act==='anl-resdia-pdf'){ anlResDiaPdf(); return; }
  if(act==='anl-ins-novo'){ A.insF={}; A.insDel=false; render(); return; }
  if(act==='anl-ins-ed'){ const s=anlInsumos().find(x=>x.id===b.dataset.id); if(s){ A.insF=JSON.parse(JSON.stringify(s)); A.insDel=false; render(); } return; }
  if(act==='anl-ins-x'){ A.insF=null; render(); return; }
  if(act==='anl-ins-ok'){ anlInsSalvar(); return; }
  if(act==='anl-ins-del'){ anlInsExcluir(); return; }
});
document.addEventListener('change',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.anlMontCor!=null&&S.anl.mont){ S.anl.mont.cor=t.checked; return; } if(!t.dataset||t.dataset.anlMont==null||!S.anl.mont) return; const s=S.anl.mont.sel; if(t.checked) s.add(t.dataset.anlMont); else s.delete(t.dataset.anlMont); render(); });
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.anl.resDia){ S.anl.resDia=false; render(); } });
function anlAvisoBackup(){ if(S.dbOk!==true) return ''; const em=S.cfg.backupEm; const d=em?Math.floor((Date.now()-new Date(em))/864e5):null; if(d!==null&&d<7) return '';
  return `<div class="av warn"><b>${em?'Backup do painel há '+d+' dias':'O painel ainda não tem backup'}</b><span>Baixe um Excel com todos os registros (1 vez por semana).</span><button class="lnk" data-go="ajustes">Fazer backup em Ajustes</button></div>`; }

function anlCorCel(l,c){ if(!corAtiva(l)||c.its.length<2) return ''; const xs=c.its.map(z=>({produto:z.t==='o'?z.o.produto:z.t==='p'?(z.p.produto||z.p.codigo):(z.x.c+' - '+(z.x.d||''))})); const n=corAvaliar(corSugerida(xs)).n;
  return `<small class="anl-cor ${n?'':'ok'}" title="Ordenando o dia por cor (programado + sugerido)">${n?n+'× dolomita':'cores ok'}</small>`; }
function anlCorAviso(C){ const ls=corCfg().linhas.filter(l=>C.L.includes(l)); if(!ls.length) return ''; const sem=ls.filter(l=>!(capDe(l)>0));
  return `<div class="banner" style="background:var(--teal-wash);color:var(--ink-2)"><b>Sequência de cores:</b> nas linhas ${esc(ls.join(' e '))} a análise encaixa cada lote, dentro do prazo, no dia em que a cor dele soma menos limpezas com dolomita. ${sem.length?`<b>${esc(sem.join(' e '))} ainda sem capacidade por dia</b>: sem ela a análise não encaixa lotes nessas linhas (cadastre abaixo).`:''}</div>`; }

// ================= 27/09: sequência de cores (Guia de Sequência de Cores e Limpeza) =================
const COR_CLARAS=['Branco','Platina','Cinza','Cinza Ártico','Marfim Médio','Corda','Palha','Areia','Bege','Marrom Sucupira','Camurça','Canela','Marrom Café'];
const COR_ESCURAS=['Cinza Escuro','Grafite','Preto','Marrom','Castanho','Castor','Chocolate','Ébano'];
const COR_FORA=['Bronce','Azul Piscina'];
// sinônimos (nomes CASA, UY e PV) → cor do guia. Os mais longos primeiro.
const COR_SIN=[
  [/MARROM\s+CAFE|MARROM\s+CAFÉ/,'Marrom Café'],[/MARROM\s+SUCUPIRA/,'Marrom Sucupira'],[/MARFIM\s+M[EÉ]DIO|MARFIM/,'Marfim Médio'],
  [/CINZA\s+ESC(URO)?|GRIS\s+OSCURO|GRIS\s+ESC/,'Cinza Escuro'],[/CINZA\s+[AÁ]RT(ICO)?/,'Cinza Ártico'],[/GRIS\s+CLARO/,'Cinza'],[/\bGRIS\b/,'Cinza Ártico'],[/\bCINZA\b/,'Cinza'],
  [/\bBRANCO\b|\bBLANCO\b/,'Branco'],[/\bCORDA\b/,'Corda'],[/\bPALHA\b|\bMARFIL\b|\bMORFIL\b/,'Palha'],[/\bAREIA\b/,'Areia'],[/\bBEGE\b|\bBEIGE\b|\bBEGÊ\b/,'Bege'],
  [/CAMUR[CÇ]A/,'Camurça'],[/\bCANELA\b/,'Canela'],[/\bPLATINA\b/,'Platina'],[/\bGRAFIT[EO]\b/,'Grafite'],[/\bPRETO\b|\bNEGRO\b/,'Preto'],
  [/\bMARRO[MN]\b/,'Marrom'],[/\bCASTANO\b|\bCASTANHO\b/,'Castanho'],[/\bCASTOR\b/,'Castor'],[/\bCHOCOLATE\b/,'Chocolate'],[/\b[EÉ]BANO\b/,'Ébano'],
  [/\bBRONCE\b|\bBRONZE\b/,'Bronce'],[/\bAZUL\b/,'Azul Piscina']];
const COR_PADRAO={linhas:['Rejunte M1','Rejunte M2'],ordem:'claras',trocaGrupo:true,marromTodas:true,fora:'fim',kgMist:200,kgRosca:50};
function corCfg(){ const c=S.cfg.seqCor||{}; return Object.assign({},COR_PADRAO,c,{linhas:Array.isArray(c.linhas)?c.linhas:COR_PADRAO.linhas}); }
const _corCache=new Map();
function corDe(txt){ txt=String(txt||''); if(_corCache.has(txt)) return _corCache.get(txt);
  const t=txt.toUpperCase().normalize('NFC'); const a=t.split('(')[0]; let nome=null;
  for(const s of [a,t]){ for(const [re,n] of COR_SIN){ if(re.test(s)){ nome=n; break; } } if(nome) break; }
  let r=null; if(nome){ const iC=COR_CLARAS.indexOf(nome), iE=COR_ESCURAS.indexOf(nome); r=iC>=0?{nome,g:'C',pos:iC}:iE>=0?{nome,g:'E',pos:iE}:{nome,g:'X',pos:COR_FORA.indexOf(nome)}; }
  _corCache.set(txt,r); return r; }
function corTxt(x){ return x._pv?(x.produto||x.codigo||''):(x.produto||''); }
// troca a → b: 'nada' (mesma cor) · 'varrer' · 'dolomita'
function corTroca(a,b){ if(!a||!b) return null; if(a.nome===b.nome) return 'nada'; const C=corCfg();
  if(a.g==='X'||b.g==='X') return 'dolomita';
  if(a.g===b.g){ if(b.pos<a.pos) return 'dolomita';
    if(a.g==='E'){ const iM=COR_ESCURAS.indexOf('Marrom'); if(b.pos===iM) return 'dolomita'; if(a.pos>=iM&&C.marromTodas) return 'dolomita'; }
    return 'varrer'; }
  const prim=C.ordem==='escuras'?'E':'C'; if(a.g!==prim) return 'dolomita'; return C.trocaGrupo?'dolomita':'varrer'; }
function corRank(c){ const C=corCfg(); if(!c) return [3,0]; if(c.g==='X') return [C.fora==='fim'?2:2,c.pos]; const prim=C.ordem==='escuras'?'E':'C'; return [c.g===prim?0:1,c.pos]; }
function corLista(l,d){ const h=hojeStr(); return ordAbertas().concat(prevAtivas()).filter(x=>x.linha===l&&(dataEf(x)<h?h:dataEf(x))===d).sort(seqCmp); }
function corAvaliar(xs){ let n=0, ant=null; const passos=xs.map(x=>{ const c=corDe(corTxt(x)); const t=c&&ant?corTroca(ant,c):null; if(t==='dolomita') n++; if(c) ant=c; return {x,c,t}; }); return {n,passos,sem:passos.filter(p=>!p.c).length,fora:passos.filter(p=>p.c&&p.c.g==='X').length}; }
function corSugerida(xs){ return xs.map((x,i)=>({x,i,r:corRank(corDe(corTxt(x)))})).sort((a,b)=>a.r[0]-b.r[0]||a.r[1]-b.r[1]||a.i-b.i).map(o=>o.x); }
function corAtiva(l){ return corCfg().linhas.includes(l); }
function corKg(n){ const C=corCfg(); return n*((+C.kgMist||0)+(+C.kgRosca||0)); }
function corChip(c,t){ if(!c) return `<span class="corc sem" title="Cor não identificada no nome do produto">sem cor</span>`;
  return `${t==='dolomita'?`<span class="cord" title="Limpeza com dolomita antes desta carga">dolomita</span>`:t==='varrer'?'<span class="corv" title="Só varrer o misturador">→</span>':t==='nada'?'<span class="corv">·</span>':''}<span class="corc ${c.g==='E'?'esc':c.g==='X'?'fora':''}" title="${c.g==='X'?'Cor fora do guia':c.g==='E'?'Cores escuras':'Cores claras'}">${esc(c.nome)}</span>`; }
// Programação: linha extra no cabeçalho do dia
function corGrp(d,l){ if(!corAtiva(l)) return ''; const xs=corLista(l,d); if(xs.length<1) return ''; const A=corAvaliar(xs); const sug=corSugerida(xs); const B=corAvaliar(sug);
  const igual=sug.every((x,i)=>x===xs[i]); const key=l+'|'+d;
  return `<div class="corseq"><span class="corlab">Cores</span>${A.passos.map(p=>corChip(p.c,p.t)).join('')}
   <span class="corres ${A.n?'warn':''}">${A.n?`${A.n} limpeza${A.n===1?'':'s'} com dolomita · ${fq(corKg(A.n))} kg`:'sem limpeza com dolomita'}</span>
   ${!igual&&B.n<A.n?`<button class="lnk" data-act="cor-ordenar" data-k="${esc(key)}">Ordenar por cor (${B.n} limpeza${B.n===1?'':'s'})</button>`:''}${A.fora?' <small class="t-mut">cor fora do guia: vai por último</small>':''}</div>`; }
// Calendário: rodapé da célula
function corCal(l,d){ if(!corAtiva(l)) return ''; const xs=corLista(l,d); if(xs.length<2) return ''; const A=corAvaliar(xs); const B=corAvaliar(corSugerida(xs));
  if(!A.n) return `<div class="corcal ok" title="Sequência de cores sem limpeza com dolomita">cores ok</div>`;
  return `<div class="corcal" title="${A.n} limpeza(s) com dolomita na sequência atual${B.n<A.n?' · ordenando por cor: '+B.n:''}">${A.n}× dolomita${B.n<A.n?` <button class="lnk" data-act="cor-ordenar" data-k="${esc(l+'|'+d)}">ordenar</button>`:''}</div>`; }
async function corOrdenar(k){ const [l,d]=k.split('|'); const xs=corLista(l,d); const sug=corSugerida(xs); if(!sug.length) return;
  const A=corAvaliar(xs).n, B=corAvaliar(sug).n; const lista=sug.map(seqId); await reordenarCal(lista[0],l,d,true,lista); toast(`${l} · ${dm(d)}: ordenado por cor (${A} → ${B} limpeza${B===1?'':'s'} com dolomita).`); }
// Ajustes
function corAjustes(){ const C=corCfg(), E=S.corEd||(S.corEd=JSON.parse(JSON.stringify(C))); const L=linhasOrd();
  const seg=(k,ops)=>`<div class="seg">${ops.map(([v,t])=>`<button data-act="cor-set" data-k="${k}" data-v="${v}" aria-pressed="${String(E[k])===String(v)}">${t}</button>`).join('')}</div>`;
  const lista=(xs,cls)=>xs.map((n,i)=>`<span class="corc ${cls}">${i+1}. ${esc(n)}</span>`).join('<span class="corv">→</span>');
  const mud=JSON.stringify(E)!==JSON.stringify(C);
  return `<section class="card"><h2>Sequência de cores e limpeza</h2><div class="sub" style="margin-bottom:12px">Do Guia de Sequência de Cores e Limpeza. Nas linhas marcadas, a Programação e o Calendário mostram as trocas que pedem dolomita (${fq(+E.kgMist||0)} kg no misturador + ${fq(+E.kgRosca||0)} kg na rosca) e oferecem “Ordenar por cor”.</div>
   <div class="label">LINHAS</div><div class="chips" style="margin:6px 0 14px">${L.map(l=>`<button class="chip" data-act="cor-lin" data-l="${esc(l)}" aria-pressed="${E.linhas.includes(l)}">${esc(l)}</button>`).join('')}</div>
   <div class="label">CLARAS</div><div class="corref">${lista(COR_CLARAS,'')}</div>
   <div class="label" style="margin-top:10px">ESCURAS</div><div class="corref">${lista(COR_ESCURAS,'esc')}</div>
   <div class="sub" style="font-size:12.5px;margin:8px 0 14px">No sentido do guia só varre. No sentido contrário, dolomita. Entrar no Marrom, dolomita. Os nomes em espanhol (UY/PV) seguem a tabela de correspondência: Gris Claro = Cinza, Gris = Cinza Ártico, Marfil = Palha…</div>
   <div class="label" style="margin-bottom:6px">REGRAS QUE O GUIA NÃO DIZ <small class="t-mut" style="letter-spacing:0;font-weight:500">(padrão: o lado mais seguro — confirmar com a produção)</small></div>
   <div class="corregras">
    <div><span>Claras e escuras no mesmo dia: qual grupo vem primeiro?</span>${seg('ordem',[['claras','Claras primeiro'],['escuras','Escuras primeiro']])}</div>
    <div><span>Na passagem de um grupo para o outro (no sentido escolhido)</span>${seg('trocaGrupo',[['true','Dolomita'],['false','Só varrer']])}</div>
    <div><span>Do Marrom em diante (Marrom → Castanho → Castor → Chocolate → Ébano)</span>${seg('marromTodas',[['true','Dolomita em toda troca'],['false','Só varrer']])}</div>
    <div><span>Bronce e Azul Piscina (fora do guia)</span><span class="t-mut" style="font-size:13px">vão por último, com dolomita</span></div>
    <div><span>Dolomita por limpeza (kg)</span><span style="display:flex;gap:8px;align-items:center"><input class="txt num" id="cor-kgm" inputmode="decimal" value="${esc(String(E.kgMist))}" style="width:80px;height:38px"> misturador <input class="txt num" id="cor-kgr" inputmode="decimal" value="${esc(String(E.kgRosca))}" style="width:80px;height:38px"> rosca</span></div>
   </div>
   <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px">${mud?'<button class="lnk" data-act="cor-desc">Descartar</button>':''}<button class="btn ${mud?'':'sec'}" data-act="cor-salvar" ${mud?'':'disabled'}>${ic('check',18,2.2)}Salvar sequência</button></div></section>`; }
async function corSalvar(){ const E=S.corEd; if(!E) return; const km=numIn(($('#cor-kgm')||{}).value), kr=numIn(($('#cor-kgr')||{}).value); if(km!=null) E.kgMist=km; if(kr!=null) E.kgRosca=kr;
  const nv={linhas:E.linhas,ordem:E.ordem,trocaGrupo:E.trocaGrupo===true||E.trocaGrupo==='true',marromTodas:E.marromTodas===true||E.marromTodas==='true',fora:'fim',kgMist:+E.kgMist||0,kgRosca:+E.kgRosca||0};
  S.cfg.seqCor=nv; S.corEd=null; render(); if(S.db) try{ await S.db.doc('config/geral').update({seqCor:nv}); toast('Sequência de cores salva.'); }catch(e){ erro(e); } }
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act^="cor-"]'); if(!b||b.disabled) return; const act=b.dataset.act;
  if(act==='cor-ordenar'){ ev.stopPropagation(); corOrdenar(b.dataset.k); return; }
  const E=S.corEd||(S.corEd=JSON.parse(JSON.stringify(corCfg())));
  if(act==='cor-lin'){ const l=b.dataset.l; E.linhas=E.linhas.includes(l)?E.linhas.filter(x=>x!==l):E.linhas.concat([l]); render(); return; }
  if(act==='cor-set'){ const k=b.dataset.k, v=b.dataset.v; E[k]=v==='true'?true:v==='false'?false:v; render(); return; }
  if(act==='cor-desc'){ S.corEd=null; render(); return; }
  if(act==='cor-salvar'){ corSalvar(); return; }
},true);

// ================= 27/09 noite: aderência, acerto da projeção, TV da fábrica =================
P.tv='<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>';
P.alvo='<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>';

// ---------- 1. aderência à programação ----------
// Dia comprometido = o dia em que a ordem estava programada (com linha) na virada daquele dia, pelo histórico de movimentações.
function adeAno(em,dd,mm){ const y=+String(em||hojeStr()).slice(0,4); const c=y+'-'+mm+'-'+dd; const e=hojeStr(new Date(em||Date.now())); return c>addDias(e,200)?(y-1)+'-'+mm+'-'+dd:c<addDias(e,-200)?(y+1)+'-'+mm+'-'+dd:c; }
function adeLinhaTempo(o){ const hs=(o.hist||[]).filter(h=>h&&h.em&&h.o).slice().sort((a,b)=>String(a.em).localeCompare(String(b.em)));
  const ev=[]; let ini;
  hs.forEach(h=>{ const t=String(h.o); let m;
    if(/^Voltou para a fila/.test(t)){ ev.push({em:h.em,d:null}); return; }
    if((m=t.match(/(\d{2})\/(\d{2})\s*→\s*(\d{2})\/(\d{2})/))){ if(ini===undefined&&!ev.length) ini=adeAno(h.em,m[1],m[2]); ev.push({em:h.em,d:adeAno(h.em,m[3],m[4])}); return; }
    if((m=t.match(/(?:dia|continua|para|em)\s+(\d{2})\/(\d{2})/i))){ const prog=/^Programada/.test(t); if(ini===undefined&&!ev.length) ini=prog?null:(o.data||null); ev.push({em:h.em,d:adeAno(h.em,m[1],m[2])}); } });
  const nasc=o.criadaEm||o.importadoEm||(hs[0]&&hs[0].em)||null;
  return [{em:nasc,d:ini===undefined?(ev.length?null:dataEf(o)):ini}].concat(ev); }