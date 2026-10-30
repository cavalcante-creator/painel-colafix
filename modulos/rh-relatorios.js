/* ===================== RH · RELATÓRIOS NO PADRÃO DO PAINEL (30/10) =====================
   Regra para todo relatório do RH: PDF que BAIXA (não janela de impressão) no padrão do painel — faixa azul com as logos,
   quadros de números, tabelas com cabeçalho repetido, rodapé com a página — e Excel com as mesmas colunas. Os dois dizem
   quais FILTROS foram usados (o relatório sai com o que está na tela). Usado por rh.js, rh-almoco.js e rh-uniformes.js:
     RHRel.pdf({tit, sub, filtros:[texto], kpis:[{t,v,s,c}], kpiCols, partes:[{secao,nota,cols,rows,vazio,texto,hbar}], arq, assina})
     RHRel.xls(arq, abas:[[nome, linhas]], {tit, sub, filtros})   → .xlsx (ou .csv sem internet), com a aba "Sobre"
     RHRel.barra({chips:[{k,t,v}], limpar}) → faixa "Filtros: … · Limpar" (o próprio módulo trata data-act)
   Precisa só do Painel.pdf (js/34) e carrega o jsPDF e o SheetJS do cdnjs quando faltam. Prefixo `rr`. */
(function(){
  const JSPDF='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', XLSXJS='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const carrega=src=>new Promise((ok,er)=>{ if([...document.scripts].some(s=>s.src===src&&s.dataset.ok)) return ok(); const s=document.createElement('script'); s.src=src; s.onload=()=>{ s.dataset.ok='1'; ok(); }; s.onerror=er; document.head.appendChild(s); });
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=m=>{ try{ window.Painel.toast(m); }catch(e){} };
  function baixa(blob,nome){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nome; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
  const filtrosTxt=f=>(f&&f.length?f.join(' · '):'nenhum (tudo)');
  /* PDF no padrão do painel */
  async function pdf(o){ const PP=window.Painel&&window.Painel.pdf; if(!PP) throw new Error('O painel ainda está carregando. Tente de novo em instantes.');
    if(!(window.jspdf&&window.jspdf.jsPDF)){ try{ await carrega(JSPDF); }catch(e){} }
    if(!(window.jspdf&&window.jspdf.jsPDF)) throw new Error('O gerador de PDF não carregou. Confira a internet e tente de novo.');
    const img=await PP.imgs(), P=PP.novo(o.tit,o.sub||'',img); P.capa();
    P.texto('Filtros: '+filtrosTxt(o.filtros),{fs:8,c:o.filtros&&o.filtros.length?'ink':'mut',b:!!(o.filtros&&o.filtros.length)});
    if(o.kpis&&o.kpis.length){ P.secao(o.resumo||'Resumo'); P.kpis(o.kpis,o.kpiCols||Math.min(4,o.kpis.length)); }
    (o.partes||[]).forEach(p=>{ if(p.secao) P.secao(p.secao,p.nota||'');
      if(p.texto) P.texto(p.texto,{c:p.cor||'mut'});
      if(p.hbar){ if(p.hbar.length) P.hbar(p.hbar,p.hopt||{}); else P.vazio(p.vazio||'Nada para mostrar.'); }
      if(p.cols){ if(p.rows&&p.rows.length) P.tabela(p.cols,p.rows); else P.vazio(p.vazio||'Nenhum.'); } });
    if(o.assina!==false){ const doc=P.doc; P.cabe(24); P.y+=12; P.dc([28,43,51]); doc.setLineWidth(.3); const w=(P.cw-16)/2; doc.line(P.M,P.y,P.M+w,P.y); doc.line(P.M+w+16,P.y,P.M+P.cw,P.y);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); P.tc([85,102,111]); doc.text(o.assina||'Responsável pelo RH',P.M+w/2,P.y+4,{align:'center'}); doc.text('Data',P.M+w+16+w/2,P.y+4,{align:'center'}); P.y+=8; }
    const arq=String(o.arq||'Relatorio-RH').replace(/[\\/:*?"<>|]+/g,'-').replace(/\.pdf$/i,'')+'.pdf';
    P.fim(arq); window.__rrUltimoPdf=arq; toast('PDF baixado: '+arq); return arq; }
  /* Excel com a aba "Sobre" (título, filtros, quando) */
  async function xls(arq,abas,info){ info=info||{}; if(!(window.XLSX&&window.XLSX.utils)){ try{ await carrega(XLSXJS); }catch(e){} }
    const sobre=[[info.tit||'Relatório do RH'],[info.sub||''],['Filtros: '+filtrosTxt(info.filtros)],['Gerado em '+new Date().toLocaleString('pt-BR')]];
    arq=String(arq||'Relatorio-RH').replace(/[\\/:*?"<>|]+/g,'-').replace(/\.(xlsx|csv)$/i,'');
    if(window.XLSX&&window.XLSX.utils){ const wb=XLSX.utils.book_new(), add=(n,a)=>{ const ws=XLSX.utils.aoa_to_sheet(a.length?a:[['(vazio)']]); ws['!cols']=(a[0]||['']).map((h,i)=>{ const mx=Math.max(String(h==null?'':h).length,...a.slice(1,200).map(r=>String(r[i]==null?'':r[i]).length)); return {wch:Math.min(48,Math.max(8,mx+2))}; }); XLSX.utils.book_append_sheet(wb,ws,String(n).replace(/[\\/?*[\]:]/g,'-').slice(0,31)); };
      abas.forEach(([n,a])=>add(n,a)); add('Sobre',sobre);
      baixa(new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),arq+'.xlsx'); window.__rrUltimoXls=arq+'.xlsx'; toast('Excel baixado: '+arq+'.xlsx'); return arq+'.xlsx'; }
    const L=sobre.concat([[]]); abas.forEach(([n,a])=>{ L.push([n]); a.forEach(r=>L.push(r)); L.push([]); });
    baixa(new Blob(['﻿'+L.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv'}),arq+'.csv'); window.__rrUltimoXls=arq+'.csv'; toast('Sem internet para o Excel: baixei em .csv ('+arq+'.csv).'); return arq+'.csv'; }
  /* faixa dos filtros ativos (o módulo põe data-act no "Limpar") */
  function barra(o){ const ch=(o.chips||[]).filter(c=>c&&c.v); if(!ch.length) return '';
    return `<div class="rr-on" role="status"><span>Filtros:</span>${ch.map(c=>`<b>${esc(c.t)}: ${esc(c.v)}</b>`).join('')}${o.limpar?`<button class="lnk" data-act="${esc(o.limpar)}">Limpar filtros</button>`:''}<small>o PDF e o Excel saem com estes filtros</small></div>`; }
  /* botões padrão: PDF e Excel lado a lado */
  const botoes=(pdfAct,xlsAct,extra)=>`<span class="rr-bt">${extra||''}${xlsAct?`<button class="btn sec rh-sm" data-act="${esc(xlsAct)}">Excel</button>`:''}${pdfAct?`<button class="btn rh-sm" data-act="${esc(pdfAct)}">Baixar PDF</button>`:''}</span>`;
  window.RHRel={pdf,xls,barra,botoes,filtrosTxt};
  document.head.insertAdjacentHTML('beforeend',`<style id="rr-css">
.rr-on{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;background:var(--ground);border-radius:10px;padding:7px 12px;margin:8px 0}.rr-on>span{color:var(--muted);font-weight:600}.rr-on b{background:var(--surface);border:1px solid var(--line);border-radius:99px;padding:2px 10px;font-weight:600;font-size:12.5px}.rr-on .lnk{padding:0;font-size:12.5px}.rr-on small{color:var(--muted);font-size:11.5px;margin-left:auto}
.rr-bt{display:inline-flex;gap:8px;flex-wrap:wrap;align-items:center}
.rr-fil{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:8px 0 12px}.rr-fil label{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}.rr-fil select,.rr-fil input{height:38px;min-width:150px;max-width:240px;text-transform:none;letter-spacing:0;font-weight:500}
</style>`);
})();
