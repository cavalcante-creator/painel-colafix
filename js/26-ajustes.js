/* Painel Colafix · 26-ajustes.js — pedidos de ajuste (out/2026): resumo do dia em PDF visual, TVs fora do menu da Produção e dos Silos
   (TV dos silos abre em outra aba), calendário da semana na TV legível, "ENTREGUE NaN:NaN" no monitor do rancho. */
"use strict";
/* ---------- 3 e 6: as TVs ficam só no módulo Telas de TV (continuam funcionando por trás) ---------- */
/* só nos menus da Produção e dos Silos (no módulo Telas de TV elas continuam) */
{ const _mt=mTabs, FORA={producao:['tvfab','tvnmon','tvncal','tvnprod','tvnrit'],silos:['tvnsil']}; mTabs=function(m){ const xs=_mt.apply(this,arguments), id=m&&(m.id||m), f=FORA[id]; return f?xs.filter(v=>!f.includes(v)):xs; }; }
/* abrir uma TV direto, em outra aba: ?tela=silos (a mesma apresentação de Telas de TV) */
(function(){ let k=''; try{ k=new URLSearchParams(location.search).get('tela')||''; }catch(e){} if(!k) return; let n=0;
  const t=setInterval(()=>{ if(++n>120) return clearInterval(t); try{ if(!S.uid||typeof aprTelas!=='function') return; const x=aprTelas().find(y=>y.k===k); if(!x) return; clearInterval(t); aprIniciar([x]); }catch(e){} },500); })();
{ const _vg=vGeral; vGeral=function(){ const h=_vg.apply(this,arguments); const tem=(()=>{ try{ return aprTelas().some(x=>x.k==='silos'); }catch(e){ return false; } })(); if(!tem) return h;
    const bt=`<div class="aj-tvlink"><a class="btn sec" href="?tela=silos" target="_blank" rel="noopener">${ic('tv',18,2)}Abrir a TV dos silos em outra aba</a></div>`; return bt+h; }; }

/* ---------- 5: hora da entrega no monitor do rancho (vinha "NaN:NaN"): corrigido em 16-tvs2.js (tvnRanSit usa e.ent.em) ---------- */

/* ---------- 1: resumo do dia em PDF (uma página A4, visual) ---------- */
function rdDados(){ const h=hojeStr(), an=anuladas(), ini=new Date(h+'T00:00:00').toISOString();
  const entH=(S.entregas||[]).filter(e=>!e.anula&&!an.has(e._id)&&e.em&&hojeStr(new Date(e.em))===h);
  const lin=linhasOrd().map(l=>{ const os=(S.ordens||[]).filter(o=>o.linha===l&&dataEf(o)===h); const prog=os.reduce((a,o)=>a+Math.max(0,(+o.total||0)-entregueAte(o,ini)),0), ent=entH.filter(e=>e.linha===l).reduce((a,e)=>a+(+e.qtd||0),0);
    return {l,prog,ent,n:os.length,conc:os.filter(o=>o.status!=='aberta'||entregueDe(o)>=(+o.total||0)).length}; }).filter(x=>x.prog||x.ent);
  const tp=lin.reduce((a,x)=>a+x.prog,0), te=lin.reduce((a,x)=>a+x.ent,0), nO=lin.reduce((a,x)=>a+x.n,0), nC=lin.reduce((a,x)=>a+x.conc,0);
  const pars=(S.paradas||[]).filter(p=>hojeStr(new Date(p.inicio))===h||!p.fim).map(p=>({l:p.linha,m:p.motivo||'',ms:(p.fim?new Date(p.fim):new Date())-new Date(p.inicio),aberta:!p.fim})).sort((a,b)=>b.ms-a.ms);
  const ch=(S.chamados||[]).filter(c=>!c.excluido&&(typeof manIgnorar!=='function'||!manIgnorar(c))), chAb=ch.filter(c=>!/conclu|cancel/i.test(c.status||'')).length, chHj=ch.filter(c=>c.concluidoEm&&hojeStr(new Date(c.concluidoEm))===h).length;
  const atr=ordAbertas().filter(o=>ordAtras(o,h));
  let d=addDias(h,1); for(let g=0;g<6&&!anlUtil(d);g++) d=addDias(d,1); const am=ordensDoDia(d);
  const sal=saldoPorSilo(), silos=(S.cfg.silos||[]).map(s=>{ const u=sal[s.id], cap=(+s.cap||0)*1000; return {nome:s.nome,grupo:s.grupo,kg:u?u.kg:null,pc:u&&cap?Math.max(0,Math.min(100,u.kg/cap*100)):null}; });
  let ade=null; try{ const A=adeOntem(); if(A) ade={d:A.d,o:Math.round(A.p.pctO),q:Math.round(A.p.pctQ)}; }catch(e){}
  let cim=null; try{ const pc=previsaoCimento(); if(pc) cim={t:Math.round(pc.estoque*10)/10,falta:pc.falta?{dia:pc.falta.dia,num:pc.falta.o.num}:null}; }catch(e){}
  const ords=(S.ordens||[]).filter(o=>dataEf(o)===h||(o.status==='aberta'&&ordAtras(o,h))).map(o=>{ const e=entregueDe(o), t=+o.total||0; return {num:o.num,l:o.linha,prod:String(o.produto||''),e,t,st:o.status!=='aberta'||e>=t&&t>0?'Concluída':ordAtras(o,h)?'Atrasada':e>0?'Em produção':'A iniciar'}; }).sort((a,b)=>linhasOrd().indexOf(a.l)-linhasOrd().indexOf(b.l));
  return {ords,h,lin,tp,te,nO,nC,pars,chAb,chHj,atr,prox:{d,n:am.length,linhas:new Set(am.map(o=>o.linha)).size,semR:am.filter(o=>!o.rancho).length},silos,ade,cim}; }
async function rdPDF(){ if(!window.jspdf){ toast('Não foi possível carregar o gerador de PDF. Recarregue a página.'); return; }
  const D=rdDados(), doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'}), W=210, M=14;
  const NAVY=[20,63,84], VERDE=[60,138,99], VERM=[181,71,63], AMB=[173,132,50], CINZA=[110,122,130], TRILHO=[230,235,239], TX=[28,43,51];
  const n0=x=>Math.round(+x||0).toLocaleString('pt-BR'), hm=ms=>{ const m=Math.round(ms/60000); return m>=60?Math.floor(m/60)+'h'+String(m%60).padStart(2,'0'):m+' min'; };
  const txt=(s,x,y,o)=>doc.text(String(s),x,y,o||{}), cor=c=>doc.setTextColor(c[0],c[1],c[2]), fundo=c=>doc.setFillColor(c[0],c[1],c[2]);
  const dt=new Date(D.h+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  /* cabeçalho */
  fundo(NAVY); doc.rect(0,0,W,30,'F'); fundo([227,49,45]); doc.rect(0,30,W,1.6,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(255,255,255); txt('Resumo do dia',M,15);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); txt('Colafix · '+dt.charAt(0).toUpperCase()+dt.slice(1),M,23);
  doc.setFontSize(9); txt('Gerado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),W-M,23,{align:'right'});
  /* números grandes */
  const pc=D.tp?Math.round(D.te/D.tp*100):null, kp=[['PRODUZIDO HOJE',n0(D.te),pc!=null?pc+'% de '+n0(D.tp)+' programados':'nada programado',pc==null?NAVY:pc>=90?VERDE:pc>=60?AMB:VERM],
    ['ORDENS CONCLUÍDAS',D.nC+' de '+D.nO,D.atr.length?D.atr.length+' atrasada'+(D.atr.length>1?'s':''):'nenhuma atrasada',D.atr.length?VERM:VERDE],
    ['PARADAS HOJE',String(D.pars.length),D.pars.length?hm(D.pars.reduce((a,p)=>a+p.ms,0))+' parado'+(D.pars.some(p=>p.aberta)?' · há linha parada agora':''):'nenhuma parada',D.pars.some(p=>p.aberta)?VERM:D.pars.length?AMB:VERDE],
    ['MANUTENÇÃO',String(D.chAb),D.chAb===1?'chamado aberto · '+D.chHj+' concluído(s) hoje':'chamados abertos · '+D.chHj+' concluído(s) hoje',D.chAb?AMB:VERDE]];
  const bw=(W-2*M-9)/4; kp.forEach(([t,v,s,c],i)=>{ const x=M+i*(bw+3), y=38; fundo([246,248,250]); doc.roundedRect(x,y,bw,30,2.5,2.5,'F'); fundo(c); doc.rect(x,y,1.6,30,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); cor(CINZA); txt(t,x+5,y+7); doc.setFontSize(19); cor(c); txt(v,x+5,y+18); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); cor(TX); txt(doc.splitTextToSize(s,bw-8),x+5,y+24); });
  let y=78; const sec=t=>{ doc.setFont('helvetica','bold'); doc.setFontSize(12); cor(NAVY); txt(t,M,y); doc.setDrawColor(221,227,232); doc.setLineWidth(0.3); doc.line(M,y+2,W-M,y+2); y+=8; };
  /* produção por linha */
  sec('Produção por linha · entregue × programado');
  if(!D.lin.length){ doc.setFont('helvetica','normal'); doc.setFontSize(10); cor(CINZA); txt('Nada programado nem entregue hoje.',M,y); y+=8; }
  D.lin.forEach(x=>{ const p=x.prog?Math.min(1,x.ent/x.prog):x.ent?1:0, bx=M+34, bwid=W-2*M-34-38;
    doc.setFont('helvetica','bold'); doc.setFontSize(10); cor(TX); txt(x.l,M,y+4); fundo(TRILHO); doc.roundedRect(bx,y,bwid,6,1.5,1.5,'F'); const c=x.prog&&x.ent/x.prog>=0.9?VERDE:x.prog&&x.ent/x.prog>=0.6?AMB:x.ent?VERM:CINZA; fundo(c); if(p>0) doc.roundedRect(bx,y,Math.max(2,bwid*p),6,1.5,1.5,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(9); cor(TX); txt(n0(x.ent)+' de '+n0(x.prog)+(x.prog?'  ('+Math.round(x.ent/x.prog*100)+'%)':''),W-M,y+4.5,{align:'right'}); y+=10; });
  y+=2;
  /* paradas e silos lado a lado */
  const y0=y, colW=(W-2*M-8)/2;
  y=y0; doc.setFont('helvetica','bold'); doc.setFontSize(12); cor(NAVY); txt('Paradas de hoje',M,y); doc.setDrawColor(221,227,232); doc.line(M,y+2,M+colW,y+2); y+=8;
  if(!D.pars.length){ doc.setFont('helvetica','normal'); doc.setFontSize(10); cor(VERDE); txt('Nenhuma parada hoje.',M,y); y+=7; }
  const mx=Math.max(1,...D.pars.map(p=>p.ms)); D.pars.slice(0,6).forEach(p=>{ doc.setFont('helvetica','bold'); doc.setFontSize(9); cor(TX); txt(p.l+(p.aberta?' (agora)':''),M,y+3); doc.setFont('helvetica','normal'); doc.setFontSize(8); cor(CINZA); txt(doc.splitTextToSize(p.m,colW-28)[0]||'',M,y+7);
    fundo(p.aberta?VERM:AMB); doc.roundedRect(M+colW-24,y,Math.max(1.5,20*p.ms/mx),3.5,1,1,'F'); doc.setFontSize(8); cor(TX); txt(hm(p.ms),M+colW,y+3,{align:'right'}); y+=11; });
  const yP=y; y=y0; const x2=M+colW+8;
  doc.setFont('helvetica','bold'); doc.setFontSize(12); cor(NAVY); txt('Silos',x2,y); doc.line(x2,y+2,W-M,y+2); y+=8;
  D.silos.forEach(s=>{ doc.setFont('helvetica','bold'); doc.setFontSize(9); cor(TX); txt(s.nome.replace(/\s*\(.*\)$/,''),x2,y+3); fundo(TRILHO); doc.roundedRect(x2+30,y,colW-58,4.5,1.2,1.2,'F');
    if(s.pc!=null){ fundo(s.pc<15?VERM:s.pc<30?AMB:s.grupo==='Areia'?[196,154,85]:[91,107,120]); doc.roundedRect(x2+30,y,Math.max(1.5,(colW-58)*s.pc/100),4.5,1.2,1.2,'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(8); cor(TX); txt(s.kg!=null?(s.kg/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' t'+(s.pc!=null?' · '+Math.round(s.pc)+'%':''):'sem saldo',W-M,y+3.5,{align:'right'}); y+=8; });
  if(D.cim){ doc.setFontSize(8.5); cor(D.cim.falta?VERM:VERDE); txt(doc.splitTextToSize('Cimento: '+D.cim.t.toLocaleString('pt-BR')+' t estimadas'+(D.cim.falta?' · acaba '+dmTxt(D.cim.falta.dia).toLowerCase()+' (ordem '+D.cim.falta.num+')':' · suficiente para a programação'),colW),x2,y+2); y+=8; }
  y=Math.max(y,yP)+4;
  /* amanhã e atrasadas */
  sec('Próximo dia útil e pendências');
  const caixa=(x,w,t,v,s,c)=>{ fundo([246,248,250]); doc.roundedRect(x,y,w,22,2.5,2.5,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); cor(CINZA); txt(t,x+4,y+6); doc.setFontSize(15); cor(c); txt(v,x+4,y+14); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); cor(TX); txt(doc.splitTextToSize(s,w-8)[0],x+4,y+19); };
  const cw=(W-2*M-6)/3;
  caixa(M,cw,'PRÓXIMO DIA ÚTIL · '+dm(D.prox.d),D.prox.n+' ordens',D.prox.linhas+' linha(s)'+(D.prox.semR?' · '+D.prox.semR+' sem rancho':' · todas com rancho'),D.prox.semR?AMB:NAVY);
  caixa(M+cw+3,cw,'ORDENS ATRASADAS',String(D.atr.length),D.atr.length?D.atr.slice(0,4).map(o=>o.num).join(', ')+(D.atr.length>4?'…':''):'nenhuma',D.atr.length?VERM:VERDE);
  caixa(M+2*(cw+3),cw,'ADERÊNCIA'+(D.ade?' · '+dm(D.ade.d):''),D.ade?D.ade.o+'%':'—',D.ade?'das ordens no dia · '+D.ade.q+'% da quantidade':'sem dados de ontem',D.ade?(D.ade.o>=90?VERDE:D.ade.o>=70?AMB:VERM):CINZA);
  y+=30;
  /* ordens de hoje */
  if(D.ords.length){ sec('Ordens de hoje ('+D.ords.length+')'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); cor(CINZA); txt('ORDEM',M,y); txt('LINHA',M+18,y); txt('PRODUTO',M+44,y); txt('ENTREGUE',M+118,y); txt('SITUAÇÃO',W-M-22,y); y+=4;
    const maxL=Math.max(1,Math.floor((285-y)/7)); D.ords.slice(0,maxL).forEach((o,i)=>{ if(i%2===0){ fundo([246,248,250]); doc.rect(M,y-1,W-2*M,7,'F'); }
      const c=o.st==='Concluída'?VERDE:o.st==='Atrasada'?VERM:o.st==='Em produção'?NAVY:CINZA, pcO=o.t?Math.min(1,o.e/o.t):0;
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); cor(TX); txt(String(o.num||''),M+1,y+3.6); doc.setFont('helvetica','normal'); txt(o.l,M+18,y+3.6); txt(doc.splitTextToSize(o.prod.replace(/^[A-Z0-9]+\s*[-—]\s*/,m=>m.replace(/\s*[-—]\s*/,' ')),76)[0]||'',M+44,y+3.6);
      txt(n0(o.e)+' de '+n0(o.t),M+118,y+3.6); fundo(TRILHO); doc.roundedRect(M+142,y+1.2,13,2.6,1,1,'F'); fundo(c); if(pcO>0) doc.roundedRect(M+142,y+1.2,Math.max(1,13*pcO),2.6,1,1,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(8); cor(c); txt(o.st,W-M-22,y+3.6); y+=7; });
    if(D.ords.length>maxL){ doc.setFont('helvetica','normal'); doc.setFontSize(8); cor(CINZA); txt('+ '+(D.ords.length-maxL)+' ordem(ns) — veja a Programação no painel',M,y+3); } }
  doc.setFontSize(8); cor(CINZA); doc.setFont('helvetica','normal'); txt('Painel Colafix · resumo automático do dia · '+new Date().toLocaleString('pt-BR'),W/2,290,{align:'center'});
  const nome='Resumo do dia '+D.h.slice(8)+'-'+D.h.slice(5,7)+'.pdf';
  try{ const b=doc.output('blob'), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); toast('Resumo do dia em PDF baixado ('+nome+').'); }catch(e){ erro(e); } }
/* o botão "Resumo do dia" gera o PDF (o texto para WhatsApp continua dentro, pelo link) */
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="anl-resdia"]'); if(!b||b.dataset.texto) return; ev.preventDefault(); ev.stopImmediatePropagation(); rdPDF(); },true);
{ const _rm=anlResDiaModal; anlResDiaModal=function(){ const h=_rm.apply(this,arguments); return h?h.replace('<div class="label">RESUMO DO DIA</div>','<div class="label">RESUMO DO DIA · TEXTO</div><button class="btn" data-act="rd-pdf" style="margin-top:6px">Baixar o PDF</button>'):h; }; }
document.addEventListener('click',ev=>{ if(ev.target.closest&&ev.target.closest('[data-act="rd-pdf"]')) rdPDF(); });

/* ---------- 4: calendário da semana na TV — texto inteiro, quantidade e letra maior nos outros dias ---------- */
document.head.insertAdjacentHTML('beforeend',`<style id="aj-css">
.aj-tvlink{display:flex;justify-content:flex-end;margin-bottom:10px}
.tvn-cal .tvn-cc:not(.foco){font-size:21px;justify-content:flex-start;padding:12px 16px;gap:10px}
.tvn-cal .tvn-cc:not(.foco) .tvn-cx{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25}
.tvn-cal .tvn-cc:not(.foco) .tvn-cx b{font-size:1.08em}.tvn-cal .tvn-cc:not(.foco) .tvn-pn{display:block;font-size:.86em}.tvn-cal .tvn-cc:not(.foco) .tvn-pq{font-weight:700;color:var(--tx)}.tvn-cal .tvn-cc:not(.foco) .tvn-pqd{display:none}.tvn-pqd{font-style:normal}
.tvn-cal .tvn-cc:not(.foco) .tvn-cx2{display:flex;flex-direction:column;gap:2px;padding-bottom:8px;border-bottom:1px solid var(--linha,rgba(0,0,0,.08))}.tvn-cal .tvn-cc:not(.foco) .tvn-cx2:last-child{border-bottom:0;padding-bottom:0}
</style>`);

/* ---------- 10: silos — liga/desliga o consumo automático, "não leva cimento/areia", onde está sendo consumido, editor em tabela ---------- */
const saAutoOn=()=>!(S.cfg&&S.cfg.siloAutoOff);
{ const _pe=siloProcessarEntrega; siloProcessarEntrega=function(id,e){ if(e&&!e.anula){ if(!saAutoOn()) return Promise.resolve(null); const desde=S.cfg&&S.cfg.siloAutoDesde; if(desde&&String(e.em||'')<desde) return Promise.resolve(null); } return _pe.apply(this,arguments); }; }
{ const _r1=siloReconciliar; siloReconciliar=function(){ return saAutoOn()?_r1.apply(this,arguments):Promise.resolve(); }; }
{ const _r2=smReconciliar; smReconciliar=function(){ return saAutoOn()?_r2.apply(this,arguments):Promise.resolve(); }; siloReconciliarAreia=smReconciliar; }
const saSwitch=()=>siloPodeConfig()?`<label class="aj-sw" title="Ligar ou desligar o consumo automático"><input type="checkbox" data-aj-auto ${saAutoOn()?'checked':''}><span></span><em>Consumo automático ${saAutoOn()?'ligado':'desligado'}</em></label>`:'';
{ const _sc=saCard; saCard=function(){ if(!S.siloLido) return '';
    if(!saAutoOn()) return `<section class="card sa aj-off"><div class="sa-h" style="justify-content:space-between;flex-wrap:wrap"><div style="display:flex;gap:12px;align-items:center"><i class="sa-dot"></i><div><b>Consumo automático desligado</b><span>O nível dos silos só muda por medição e recebimento. O que for apontado enquanto estiver desligado não é descontado depois.</span></div></div>${saSwitch()}</div></section>`;
    const h=_sc.apply(this,arguments); if(!h) return h; return h.replace(/(<section class="card sa [^"]*">)/,'$1<div class="aj-swr">'+saSwitch()+'</div>'); }; }
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||!t.dataset||t.dataset.ajAuto==null||!siloPodeConfig()) return; const on=t.checked;
  if(!on&&!confirm('Desligar o consumo automático? Os apontamentos deixam de baixar o nível dos silos até você ligar de novo.')){ t.checked=true; return; }
  const up=on?{siloAutoOff:false,siloAutoDesde:new Date().toISOString()}:{siloAutoOff:true};
  try{ await S.db.doc('config/geral').set(up,{merge:true}); Object.assign(S.cfg,up); toast(on?'Consumo automático ligado: os próximos apontamentos baixam o nível dos silos.':'Consumo automático desligado.'); render(); }catch(e){ erro(e); } });
/* "Não leva cimento / areia": o produto sai da lista de pendências e não desconta aquele material */
{ const _dg=saDiag; saDiag=function(){ const D=_dg.apply(this,arguments); D.semKg=D.semKg.filter(x=>{ const it=itemDe(x.cod)||{}; if(it.semCimento) delete x.falta.cim; if(it.semAreia) delete x.falta.are; return Object.keys(x.falta).length>0; }); D.ok=!D.semSilo.length&&!D.semSaldo.length&&!D.semKg.length; return D; }; }
{ const _sc2=saCard; saCard=function(){ const h=_sc2.apply(this,arguments); if(!h) return h;
    return h.replace(/(<label><span>kg de (cimento|areia) por saco<\/span><input class="txt" data-sa-kg="([^"]+)" data-m="(kgCimento|kgAreia)"[^>]*><\/label>)/g,(m0,lab,mat,cod,campo)=>lab+`<button class="lnk aj-nl" data-act="aj-naoleva" data-cod="${cod}" data-c="${campo==='kgAreia'?'semAreia':'semCimento'}">Não leva ${mat}</button>`); }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="aj-naoleva"]'); if(!b||!siloPodeConfig()) return; const cod=b.dataset.cod, c=b.dataset.c, it=(S.itens||[]).find(i=>String(i.codigo||'').toUpperCase()===cod);
  if(!it) return toast('Não achei '+cod+' no cadastro de Itens. Cadastre o item em Ajustes → Itens.');
  const up={[c]:true,[c==='semCimento'?'kgCimento':'kgAreia']:null}; try{ await S.db.doc('itens/'+it._id).update(up); Object.assign(it,up); toast(cod+': marcado que não leva '+(c==='semCimento'?'cimento':'areia')+'.'); render(); }catch(e){ erro(e); } });
/* onde está sendo consumido: quadro na tela do silo */
function ajConsumoHtml(s){ const h=hojeStr(), mv=(S.siloMov||[]).filter(m=>m.silo===s.id&&(m.tipo==='consumo'||m.tipo==='estorno')), hj=mv.filter(m=>String(m.em||'').slice(0,10)===h);
  const tot=-hj.reduce((a,m)=>a+(+m.deltaKg||0),0), por=k=>{ const g={}; hj.forEach(m=>{ const x=k(m)||'—'; g[x]=(g[x]||0)-(+m.deltaKg||0); }); return Object.entries(g).filter(x=>x[1]>0.0001).sort((a,b)=>b[1]-a[1]); };
  const bl=(t,xs)=>{ const mx=Math.max(1,...xs.map(x=>x[1])); return `<div class="aj-cg"><span class="aj-ct">${t}</span>${xs.length?xs.slice(0,6).map(([n,v])=>`<div class="aj-cb"><b>${esc(n)}</b><i><u style="width:${(v/mx*100).toFixed(0)}%"></u></i><em>${fkg(v)}</em></div>`).join(''):'<div class="sub">Nada descontado hoje.</div>'}</div>`; };
  const ult=mv.slice(0,10);
  return `<section class="card aj-cons"><div class="aj-chd"><div><div class="label">ONDE ESTÁ SENDO CONSUMIDO</div><div class="sub" style="margin:2px 0 0">Descontos automáticos deste silo pelos apontamentos.</div></div><div class="aj-ctot"><b>${fkg(tot)}</b><span>descontados hoje</span></div></div>
    <div class="aj-cgs">${bl('Por linha (hoje)',por(m=>m.linha))}${bl('Por produto (hoje)',por(m=>m.codigo))}</div>
    ${ult.length?`<div class="aj-ctw"><table class="aj-ct2"><thead><tr><th>Quando</th><th>Linha</th><th>Ordem</th><th>Produto</th><th class="r">Sacos</th><th class="r">kg</th></tr></thead><tbody>${ult.map(m=>`<tr class="${m.tipo==='estorno'?'est':''}"><td>${esc(new Date(m.em).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))} ${hora(m.em)}</td><td>${esc(m.linha||'—')}</td><td>${esc(m.num||'—')}</td><td>${esc(m.codigo||'—')}</td><td class="r">${m.qtd!=null?Math.round(m.qtd).toLocaleString('pt-BR'):'—'}</td><td class="r">${m.tipo==='estorno'?'+':'−'}${fkg(Math.abs(+m.deltaKg||0))}${m.tipo==='estorno'?' <small>desfeito</small>':''}</td></tr>`).join('')}</tbody></table></div>`:''}</section>`; }
{ const _vs=vSilos; vSilos=function(){ let h=_vs.apply(this,arguments); const s=(S.cfg.silos||[]).find(x=>x.id===S.siloSel)||(S.cfg.silos||[])[0]; if(!s) return h; const c=ajConsumoHtml(s);
    const i=h.indexOf('class="card smc"'); const j=i>0?h.indexOf('</section>',i)+10:(h.indexOf('class="card sa ')>0?h.indexOf('</section>',h.indexOf('class="card sa '))+10:0); return j>0?h.slice(0,j)+c+h.slice(j):h+c; }; }
/* editor "Silos de cada linha" em tabela: linhas × silos (cimento e areia), marcar e, com mais de um, a % */
smCfgHtml=function(){ const pode=siloPodeConfig(), R=smRasc(), mats=[SM_MAT.cim,SM_MAT.are].filter(M=>(S.cfg.silos||[]).some(s=>s.grupo===M.grupo)), cols=mats.map(M=>({M,ss:(S.cfg.silos||[]).filter(s=>s.grupo===M.grupo)}));
  const nm=s=>esc(s.nome.replace(/\s*\(.*\)$/,''));
  const cel=(M,l,s)=>{ const v=R[M.k][l], sel=v==='nao'?[]:v, x=sel.find(y=>y.sid===s.id), on=!!x;
    return `<td class="aj-mc ${on?'on':''}"><button class="aj-mk" data-act="smf-tg" data-m="${M.k}" data-l="${esc(l)}" data-sid="${esc(s.id)}" aria-pressed="${on}" ${pode?'':'disabled'} aria-label="${esc(l)} usa ${nm(s)}">${on?'✓':''}</button>${on&&sel.length>1?`<label class="aj-pc"><input class="txt" type="number" min="0" max="100" data-smf-pct="${M.k}|${esc(l)}|${esc(s.id)}" value="${x.pct}" ${pode?'':'disabled'}>%</label>`:''}</td>`; };
  const nao=(M,l)=>{ const v=R[M.k][l]; return `<td class="aj-mc aj-mn ${v==='nao'?'on':''}"><button class="aj-mk" data-act="smf-nao" data-m="${M.k}" data-l="${esc(l)}" aria-pressed="${v==='nao'}" ${pode?'':'disabled'}>${v==='nao'?'✓':''}</button></td>`; };
  return `<section class="card smf"><div class="label">SILOS DE CADA LINHA</div><div class="sub" style="margin:4px 0 10px">Marque de quais silos cada linha puxa. Com mais de um silo do mesmo material, informe a % de cada um.</div>
    <div class="aj-mtw"><table class="aj-mt"><thead><tr><th rowspan="2">Linha</th>${cols.map(c=>`<th colspan="${c.ss.length+1}" class="aj-mg">${c.M.nome}</th>`).join('')}</tr>
      <tr>${cols.map(c=>c.ss.map(s=>`<th>${nm(s)}</th>`).join('')+'<th class="aj-mnh">Não usa</th>').join('')}</tr></thead>
      <tbody>${linhasOrd().map(l=>`<tr><th class="aj-ml">${esc(l)}</th>${cols.map(c=>c.ss.map(s=>cel(c.M,l,s)).join('')+nao(c.M,l)).join('')}</tr>`).join('')}</tbody></table></div>
    ${pode?'<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" data-act="smf-ok">Salvar silos das linhas</button></div>':''}</section>`; };
siloCfgHtml=function(){ return smCfgHtml(); };
document.head.insertAdjacentHTML('beforeend',`<style id="aj-silo-css">
.aj-swr{display:flex;justify-content:flex-end;margin-bottom:-4px}.aj-sw{display:inline-flex;align-items:center;gap:8px;cursor:pointer}.aj-sw input{position:absolute;opacity:0;width:1px;height:1px}
.aj-sw span{width:44px;height:24px;border-radius:12px;background:#C9D2D9;position:relative;transition:background .2s}.aj-sw span::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s}
.aj-sw input:checked+span{background:var(--ok)}.aj-sw input:checked+span::after{left:23px}.aj-sw input:focus-visible+span{outline:3px solid var(--teal-tint)}.aj-sw em{font-style:normal;font-size:13.5px;font-weight:600}
.aj-off{border-left-color:var(--muted)!important}.aj-off .sa-dot{background:var(--muted)}.aj-nl{font-size:13px;align-self:flex-end;margin-bottom:12px}
.aj-cons{display:flex;flex-direction:column;gap:12px}.aj-chd{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.aj-ctot{text-align:right}.aj-ctot b{display:block;font-size:24px}.aj-ctot span{font-size:12.5px;color:var(--muted)}
.aj-cgs{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:760px){.aj-cgs{grid-template-columns:1fr}}.aj-cg{display:flex;flex-direction:column;gap:6px}.aj-ct{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.aj-cb{display:grid;grid-template-columns:110px 1fr 90px;gap:8px;align-items:center;font-size:14px}.aj-cb i{height:10px;border-radius:5px;background:var(--surface-2);overflow:hidden}.aj-cb u{display:block;height:100%;background:var(--teal-strong)}.aj-cb em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums}
.aj-ctw{overflow-x:auto}.aj-ct2{width:100%;border-collapse:collapse;font-size:14px}.aj-ct2 th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}.aj-ct2 td{padding:6px 8px;border-bottom:1px solid var(--line)}.aj-ct2 .r{text-align:right}.aj-ct2 tr.est td{color:var(--muted)}
.aj-mtw{overflow-x:auto}.aj-mt{border-collapse:collapse;min-width:100%}.aj-mt th,.aj-mt td{border:1px solid var(--line);padding:6px 10px;text-align:center;font-size:14px}.aj-mt thead th{background:var(--surface-2);font-weight:600}.aj-mg{font-size:12px!important;letter-spacing:.08em;text-transform:uppercase}
.aj-ml{text-align:left!important;white-space:nowrap}.aj-mc{min-width:96px}.aj-mc.on{background:var(--teal-wash)}.aj-mn.on{background:var(--surface-2)}.aj-mnh{color:var(--muted)}
.aj-mk{width:34px;height:34px;border-radius:8px;border:2px solid var(--line);background:var(--surface);font-size:18px;font-weight:700;color:var(--teal-strong);cursor:pointer}.aj-mc.on .aj-mk{border-color:var(--teal-strong);background:var(--teal-strong);color:#fff}.aj-mn.on .aj-mk{border-color:var(--muted);background:var(--muted)}
.aj-pc{display:flex;align-items:center;gap:3px;justify-content:center;margin-top:4px;font-size:12.5px}.aj-pc input{width:58px;height:30px!important;padding:0 4px!important;text-align:center}
</style>`);

/* ---------- 8: capacidade física dos almoxarifados em paletes (Análise → Estoques) ---------- */
function ajCapDados(R){ let rows=[]; try{ rows=anlEstRows(R).map(anlEstX); }catch(e){ return null; }
  const out={a3:{oc:0,itens:[],sem:[]},a30:{oc:0,itens:[],sem:[]}};
  rows.forEach(r=>{ let pp=0; try{ pp=+paleteDe({produto:r.c})||0; }catch(e){} ['a3','a30'].forEach(k=>{ const q=+r[k]||0; if(q<=0) return; if(!(pp>0)){ out[k].sem.push({c:r.c,d:r.d,q}); return; } const p=Math.ceil(q/pp); out[k].oc+=p; out[k].itens.push({c:r.c,d:r.d,p,q}); }); });
  ['a3','a30'].forEach(k=>out[k].itens.sort((a,b)=>b.p-a.p)); return out; }
function ajCapHtml(R){ const D=ajCapDados(R); if(!D) return ''; const cap=(S.cfg.almoxCap)||{}, pode=!(typeof soVer==='function'&&soVer()), NM={a3:'Almox 3',a30:'Almox 30'};
  const bloco=k=>{ const x=D[k], c=+cap[k]||0, pc=c?x.oc/c*100:null, cor=pc==null?'var(--muted)':pc>=90?'var(--crit)':pc>=75?'var(--warn)':'var(--ok)';
    return `<div class="aj-cap"><div class="aj-caph"><b>${NM[k]}</b>${pc!=null?`<span style="color:${cor}">${Math.round(pc)}% ocupado</span>`:'<span class="sub" style="margin:0">informe a capacidade</span>'}</div>
      <div class="aj-capn"><div><b>${x.oc.toLocaleString('pt-BR')}</b><small>paletes ocupados</small></div><div><b>${c?Math.max(0,c-x.oc).toLocaleString('pt-BR'):'—'}</b><small>paletes livres</small></div>
        <label><small>Capacidade (paletes)</small><input class="txt" type="number" min="0" data-aj-cap="${k}" value="${c||''}" ${pode?'':'disabled'} placeholder="ex.: 400"></label></div>
      <div class="aj-capb"><u style="width:${pc!=null?Math.min(100,pc).toFixed(0):0}%;background:${cor}"></u></div>
      ${x.itens.length?`<div class="aj-capt"><span>Mais ocupam espaço</span>${x.itens.slice(0,6).map(i=>`<div><b>${esc(i.c)}</b><em>${esc(String(i.d||'').slice(0,34))}</em><i>${i.p} pal.</i></div>`).join('')}</div>`:''}
      ${x.sem.length?`<div class="aj-caps">${x.sem.length} item(ns) com estoque aqui sem padrão de palete no cadastro (não entram na conta): ${esc(x.sem.slice(0,5).map(i=>i.c).join(', '))}${x.sem.length>5?'…':''}</div>`:''}</div>`; };
  return `<section class="card aj-capw"><div class="aj-caph0"><div><div class="label">CAPACIDADE FÍSICA DOS ALMOXARIFADOS</div><div class="sub" style="margin:2px 0 0">Estoque atual convertido em paletes (sacos ÷ sacos por palete de cada produto) × quantos paletes cabem em cada almox.</div></div>${pode?'<button class="btn sec" data-act="aj-capok">Salvar capacidades</button>':''}</div>
    <div class="aj-capg">${bloco('a3')}${bloco('a30')}</div></section>`; }
{ const _ve=vAnlEst; vAnlEst=function(R){ const h=_ve.apply(this,arguments); let c=''; try{ c=ajCapHtml(R); }catch(e){ console.warn('[capacidade]',e); } return c+h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="aj-capok"]'); if(!b) return; const v={}; document.querySelectorAll('[data-aj-cap]').forEach(i=>{ const n=Math.round(+i.value||0); if(n>0) v[i.dataset.ajCap]=n; });
  try{ await S.db.doc('config/geral').set({almoxCap:v},{merge:true}); S.cfg.almoxCap=v; toast('Capacidades dos almoxarifados salvas.'); render(); }catch(e){ erro(e); } });
document.head.insertAdjacentHTML('beforeend',`<style id="aj-cap-css">
.aj-capw{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}.aj-caph0{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.aj-capg{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:860px){.aj-capg{grid-template-columns:1fr}}
.aj-cap{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:12px;background:var(--surface-2)}.aj-caph{display:flex;justify-content:space-between;align-items:baseline}.aj-caph b{font-size:17px}.aj-caph span{font-weight:700;font-size:15px}
.aj-capn{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:10px;align-items:end}.aj-capn b{display:block;font-size:26px;font-variant-numeric:tabular-nums}.aj-capn small{font-size:12px;color:var(--muted)}.aj-capn label{display:flex;flex-direction:column;gap:3px}.aj-capn input{height:40px!important}
.aj-capb{height:14px;border-radius:7px;background:var(--surface);overflow:hidden;border:1px solid var(--line)}.aj-capb u{display:block;height:100%}
.aj-capt{display:flex;flex-direction:column;gap:4px;font-size:13.5px}.aj-capt>span{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.aj-capt div{display:grid;grid-template-columns:70px 1fr auto;gap:8px}.aj-capt em{font-style:normal;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aj-capt i{font-style:normal;font-weight:700}
.aj-caps{font-size:12.5px;color:var(--warn-ink);background:var(--warn-tint);padding:6px 10px;border-radius:8px}
</style>`);
