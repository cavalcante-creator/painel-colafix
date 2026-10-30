/* ===================== PLANILHA PADRÃO DO PAINEL (30/10) =====================
   Pedido: "todos os PDFs e Excel devem ser bonitos e preparados". Todo Excel do painel sai por aqui, com o mesmo desenho:
     - topo: logo da Colafix (e a da Lys à direita), título, subtítulo, linha "Filtros: … · Emitido em … por …";
     - cabeçalho azul com letra branca, setinhas de filtro, cabeçalho travado ao rolar, linhas alternadas;
     - números de verdade: R$, datas dd/mm/aaaa, inteiros com ponto de milhar, % — dá para somar e ordenar no Excel;
     - linha de TOTAL destacada (a que começa com "Total" ou `tot:true` = soma automática das colunas de número);
     - pronto para imprimir: A4, deitado quando é largo, cabe na largura, cabeçalho repetido e "Página x de y" no rodapé;
     - aba "Sobre" no fim (relatório, filtros, quando e quem gerou, o que tem em cada aba).
   Uso:  PainelXls.gerar(arq, abas, {tit, sub, filtros:[texto]|texto, nota, sobre:false})
         abas = [ [nome, linhas] ]  — linhas[0] é o cabeçalho (linhas de título antes dele viram nota do topo)
              ou [ {nome, cab:[...], linhas:[...], tipos:[...], larg:[...], tot:true|[i], nota, titulo, sub} ]
         tipos (opcional, por coluna): 'txt' | 'int' | 'dec' | 'dec1' | 'rs' | 'pct' | 'pct100' | 'data' | 'hora'
   Sem o ExcelJS (sem internet) sai a planilha simples (SheetJS) e, sem os dois, .csv. Prefixo `px`. */
(function(){
  const EXJ='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js', XLSXJS='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const carrega=src=>new Promise((ok,er)=>{ const ja=[...document.scripts].find(s=>s.src===src); if(ja&&ja.dataset.ok) return ok(); const s=document.createElement('script'); s.src=src; s.onload=()=>{ s.dataset.ok='1'; ok(); }; s.onerror=er; document.head.appendChild(s); });
  const toast=m=>{ try{ window.Painel.toast(m); }catch(e){} };
  const C={pet:'FF143F54',pet2:'FF1B5168',tint:'FFE2ECF1',zeb:'FFF5F8FA',mut:'FF5E6E77',ink:'FF1C2B33',lin:'FFE1E7EB',red:'FFE3312D',neg:'FFB5473F'};
  const FMT={int:'#,##0;[Red]-#,##0',dec:'#,##0.00;[Red]-#,##0.00',dec1:'#,##0.0;[Red]-#,##0.0',rs:'"R$" #,##0.00;[Red]-"R$" #,##0.00',pct:'0.0%',pct100:'0.0"%"',data:'dd/mm/yyyy',hora:'@',txt:'@'};
  const NUM={int:1,dec:1,dec1:1,rs:1,pct:1,pct100:1};
  const N=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const vazio=v=>v==null||v===''||v==='—'||v==='–'||v==='-';
  const limpa=s=>String(s||'Planilha').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim();
  const nomeAba=(n,usados)=>{ let b=String(n||'Planilha').replace(/[\\/?*[\]:]/g,'-').trim().slice(0,31)||'Planilha', x=b, i=2; while(usados.has(N(x))){ x=b.slice(0,28)+' '+i++; } usados.add(N(x)); return x; };
  const filtrosTxt=f=>{ const a=Array.isArray(f)?f.filter(Boolean):f?[f]:[]; return a.length?a.join(' · '):'nenhum (tudo)'; };
  const quem=()=>{ try{ const S=window.Painel&&window.Painel.S; return String((S&&S.uid&&S.nomes&&S.nomes[S.uid])||''); }catch(e){ return ''; } };
  const agora=()=>new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  /* ---------- lê os valores: números em texto ("R$ 1.234,50", "12,5%"), datas ("2026-10-30", "30/10/2026") ---------- */
  const reRS=/^-?\s*R\$\s*-?[\d.]*\d(,\d+)?$/, reBR=/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/, rePct=/^-?[\d.]*\d(,\d+)?\s*%$/;
  const reISO=/^(\d{4})-(\d{2})-(\d{2})$/, reDBR=/^(\d{2})\/(\d{2})\/(\d{4})$/, reHora=/^\d{1,2}:\d{2}(:\d{2})?$/;
  const numBR=s=>{ const t=String(s).replace(/R\$|%|\s/g,''); const neg=/^-/.test(t); const v=+t.replace(/^-/,'').replace(/\./g,'').replace(',','.'); return isNaN(v)?null:(neg?-v:v); };
  const dataDe=v=>{ if(v instanceof Date&&!isNaN(v)) return new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())); let m=reISO.exec(v); if(m) return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])); m=reDBR.exec(v); if(m) return new Date(Date.UTC(+m[3],+m[2]-1,+m[1])); return null; };
  const CODIGO=/^(cod|codigo|cpf|cnpj|matricula|id|tel|telefone|cep|n[º°.]|nro|num|numero|ordem|os|lote|placa|ref|referencia|pis|rg|ctps|serie|item)(\s|$|\.|º)/;
  function tipoCol(cab,vals){ const h=N(cab), vs=vals.filter(v=>!vazio(v)); if(!vs.length) return 'txt';
    if(CODIGO.test(h)&&!/(qtd|quant|valor|total|dias|horas|sacos)/.test(h)) return 'txt';
    if(vs.every(v=>v instanceof Date||(typeof v==='string'&&(reISO.test(v)||reDBR.test(v))))) return 'data';
    if(vs.every(v=>typeof v==='string'&&reHora.test(v))) return 'hora';
    const dinheiro=/r\$|valor|preco|salario|desconto|custo|pago|saldo \(r|parcela|a descontar|total \(r/.test(h);
    const ehNum=v=>typeof v==='number'&&isFinite(v)||typeof v==='string'&&(reRS.test(v.trim())||rePct.test(v.trim())||(reBR.test(v.trim())&&!/^0\d/.test(v.trim())));
    if(!vs.every(ehNum)) return 'txt';
    const ns=vs.map(v=>typeof v==='number'?v:numBR(v));
    if(vs.some(v=>typeof v==='string'&&reRS.test(v.trim()))||dinheiro&&ns.some(n=>!Number.isInteger(n))) return 'rs';
    if(dinheiro&&/r\$/.test(h)) return 'rs';
    if(/%/.test(h)||vs.some(v=>typeof v==='string'&&rePct.test(v.trim()))) return ns.every(n=>Math.abs(n)<=1.5)&&!vs.some(v=>typeof v==='string')?'pct':'pct100';
    if(ns.every(Number.isInteger)) return 'int';
    return ns.every(n=>Math.abs(n*10-Math.round(n*10))<1e-9)?'dec1':'dec'; }
  function valorDe(v,t){ if(vazio(v)) return v==null||v===''?null:v; if(t==='data'){ const d=dataDe(v); return d||v; }
    if(NUM[t]){ if(typeof v==='number') return v; const n=numBR(v); return n==null?v:n; } return typeof v==='object'&&!(v instanceof Date)?String(v):v; }
  /* ---------- organiza cada aba: título de topo, cabeçalho, linhas (dado | total | seção | vazia) ---------- */
  function preparaAba(a){ let o=Array.isArray(a)?{nome:a[0],linhas:(a[1]||[]).slice()}:Object.assign({},a,{linhas:(a.linhas||[]).slice()});
    const cheios=r=>(r||[]).filter(v=>!vazio(v)).length; const topo=[];
    if(!o.cab){ while(o.linhas.length&&cheios(o.linhas[0])<2&&o.linhas.length>1){ const r=o.linhas.shift(); if(cheios(r)) topo.push(r.filter(v=>!vazio(v)).join(' ')); }
      o.cab=(o.linhas.shift()||['(vazio)']).map(v=>v==null?'':String(v)); }
    const n=Math.max(o.cab.length,...o.linhas.map(r=>(r||[]).length),1); while(o.cab.length<n) o.cab.push('');
    const tipo=(r,i,ls)=>{ r=r||[]; const c=cheios(r); if(!c) return 'vazia'; const p=r.find(v=>!vazio(v)); if(/^total/i.test(String(p))) return 'tot';
      if(c===1&&!vazio(r[0])&&typeof r[0]==='string'&&n>1&&(i===0||!cheios(ls[i-1]))) return 'sec'; return 'dado'; };
    o.kind=o.linhas.map((r,i,ls)=>tipo(r,i,ls));
    const dados=o.linhas.filter((r,i)=>o.kind[i]==='dado');
    o.tipos=o.cab.map((h,j)=>(o.tipos&&o.tipos[j])||tipoCol(h,dados.map(r=>r[j])));
    o.topo=topo.concat(o.nota0?[o.nota0]:[]); return o; }
  function larguras(o){ return o.cab.map((h,j)=>{ if(o.larg&&o.larg[j]) return o.larg[j]; const t=o.tipos[j];
    const wh=Math.max(...String(h).split(/\s+/).map(p=>p.length),Math.ceil(String(h).length/2));
    let wv=0; o.linhas.slice(0,400).forEach((r,i)=>{ if(o.kind[i]==='sec') return; const v=r&&r[j]; if(vazio(v)) return; let L;
      if(t==='data') L=10; else if(NUM[t]){ const n=typeof v==='number'?v:numBR(v); L=(n==null?String(v):Math.round(Math.abs(n)).toLocaleString('pt-BR')).length+(t==='rs'?6:t==='int'?1:3); } else L=String(v).length;
      if(L>wv) wv=L; });
    return Math.max(t==='data'?11.5:t==='rs'?12:6,Math.min(t==='txt'?52:22,Math.max(wh,wv)+2)); }); }
  /* ---------- download ---------- */
  function baixa(blob,nome){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nome; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
  async function logos(){ try{ const PP=window.Painel&&window.Painel.pdf; if(PP&&PP.imgs) return await PP.imgs(); }catch(e){} return {}; }
  /* ---------- Excel com cara de relatório (ExcelJS) ---------- */
  async function comExcelJS(XJ,arq,abas,info){ const img=await logos(), wb=new XJ.Workbook(); wb.creator='Painel Colafix'; wb.created=new Date(); try{ wb.calcProperties.fullCalcOnLoad=true; }catch(e){}
    const logoC=img&&img.claro, logoL=img&&img.lys; const idC=logoC?wb.addImage({base64:logoC.d,extension:'png'}):null, idL=logoL?wb.addImage({base64:logoL.d,extension:'png'}):null;
    const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}), fnt=o=>Object.assign({name:'Calibri',size:10,color:{argb:C.ink}},o||{});
    const emit='Emitido em '+agora()+(quem()?' por '+quem():'')+' · Painel Colafix', filt='Filtros: '+filtrosTxt(info.filtros);
    const esc=s=>String(s).replace(/&/g,'&&');
    const usados=new Set(); const resumo=[];
    const faixa=(ws,n,ws0)=>{ const larg=ws.columns.map(c=>c.width||9); const W=Math.max(n,3);
      ws.getRow(1).height=idC!=null||idL!=null?36:6; ws.mergeCells(1,1,1,W);
      if(idC!=null){ const h=30, w=Math.min(150,logoC.w/logoC.h*h); ws.addImage(idC,{tl:{col:0.05,row:0.12},ext:{width:w,height:h}}); }
      if(idL!=null){ const h=32, w=logoL.w/logoL.h*h, px=larg.slice(0,W).map(x=>x*7.2), alvo=Math.max(0,px.reduce((a,b)=>a+b,0)-w-6); let s=0,ci=0; while(ci<W-1&&s+px[ci]<=alvo){ s+=px[ci]; ci++; } ws.addImage(idL,{tl:{col:ci+(alvo-s)/px[ci],row:0.08},ext:{width:w,height:h}}); }
      ws.mergeCells(2,1,2,W); const t=ws.getCell(2,1); t.value={richText:[{text:ws0.tit,font:fnt({bold:true,size:15,color:{argb:C.pet}})}].concat(ws0.sub?[{text:'\n'+ws0.sub,font:fnt({size:9.5,color:{argb:C.mut}})}]:[])};
      t.alignment={vertical:'middle',wrapText:true}; ws.getRow(2).height=ws0.sub?38:24;
      ws.mergeCells(3,1,3,W); const f=ws.getCell(3,1); f.value={richText:[{text:filt,font:fnt({bold:!!(info.filtros&&[].concat(info.filtros).filter(Boolean).length),size:9,color:{argb:C.ink}})},{text:'   ·   '+emit,font:fnt({size:9,color:{argb:C.mut}})}]};
      f.alignment={vertical:'middle'}; f.border={bottom:{style:'medium',color:{argb:C.red}}}; ws.getRow(3).height=18; return 4; };
    for(const a of abas){ const o=preparaAba(a), n=o.cab.length, nome=nomeAba(o.nome,usados), larg=larguras(o), largo=larg.reduce((x,y)=>x+y,0)>100||n>7;
      const ws=wb.addWorksheet(nome,{properties:{tabColor:{argb:resumo.length?C.pet2:C.pet}},views:[{showGridLines:false}],
        pageSetup:{paperSize:9,orientation:largo?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:0.4,right:0.4,top:0.5,bottom:0.6,header:0.2,footer:0.3}},
        headerFooter:{oddFooter:'&L&8'+esc((info.tit||'')+' · '+nome)+'&R&8Página &P de &N'}});
      ws.columns=larg.map(w=>({width:w}));
      let r=faixa(ws,n,{tit:o.titulo||info.tit||nome,sub:o.sub||info.sub||''});
      o.topo.forEach(t=>{ ws.mergeCells(r,1,r,Math.max(n,3)); const c=ws.getCell(r,1); c.value=t; c.font=fnt({italic:true,size:9,color:{argb:C.mut}}); c.alignment={wrapText:true,vertical:'middle'}; r++; });
      ws.getRow(r).height=6; r++;
      const H=r, hr=ws.getRow(H); hr.height=Math.min(48,16+12*Math.max(1,...o.cab.map((h,j)=>Math.ceil(String(h).length/Math.max(4,larg[j]-1))-1)));
      o.cab.forEach((h,j)=>{ const c=hr.getCell(j+1); c.value=h; c.font=fnt({bold:true,size:9.5,color:{argb:'FFFFFFFF'}}); c.fill=fill(C.pet2); c.alignment={vertical:'middle',wrapText:true,horizontal:NUM[o.tipos[j]]?'right':o.tipos[j]==='data'||o.tipos[j]==='hora'?'center':'left',indent:NUM[o.tipos[j]]?0:1}; c.border={bottom:{style:'medium',color:{argb:C.pet}}}; });
      r++; const ini=r; let z=0, ultDado=H, totN=0;
      o.linhas.forEach((ln,i)=>{ const k=o.kind[i], row=ws.getRow(r); ln=ln||[];
        if(k==='vazia'){ row.height=8; z=0; r++; return; }
        if(k==='sec'){ ws.mergeCells(r,1,r,n); const c=row.getCell(1); c.value=String(ln[0]).toUpperCase(); c.font=fnt({bold:true,size:10,color:{argb:C.pet}}); c.fill=fill(C.tint); c.alignment={vertical:'middle',indent:1}; row.height=20; z=0; r++; return; }
        for(let j=0;j<n;j++){ const t=o.tipos[j], c=row.getCell(j+1), v=valorDe(ln[j],t); c.value=v;
          if(v!=null&&typeof v!=='string'&&FMT[t]) c.numFmt=FMT[t];
          c.alignment={vertical:'middle',horizontal:NUM[t]&&typeof v==='number'?'right':t==='data'||t==='hora'?'center':'left',indent:NUM[t]?0:1,wrapText:t==='txt'&&typeof v==='string'&&v.length>larg[j]};
          if(k==='tot'){ c.font=fnt({bold:true,color:{argb:C.pet}}); c.fill=fill(C.tint); c.border={top:{style:'thin',color:{argb:C.pet}},bottom:{style:'medium',color:{argb:C.pet}}}; }
          else { c.font=fnt(j===0?{bold:true}:{}); if(z%2) c.fill=fill(C.zeb); c.border={bottom:{style:'thin',color:{argb:C.lin}}}; } }
        if(k==='tot'){ row.height=20; totN++; } else { z++; ultDado=r; } r++; });
      /* soma automática */
      if(o.tot&&ultDado>=ini){ const row=ws.getRow(r), cols=Array.isArray(o.tot)?o.tot:o.tipos.map((t,j)=>(t==='int'||t==='dec'||t==='dec1'||t==='rs')&&j>0?j:-1).filter(j=>j>=0);
        const L=j=>{ let s='', x=j+1; while(x>0){ const m=(x-1)%26; s=String.fromCharCode(65+m)+s; x=Math.floor((x-1)/26); } return s; };
        for(let j=0;j<n;j++){ const c=row.getCell(j+1); c.font=fnt({bold:true,color:{argb:C.pet}}); c.fill=fill(C.tint); c.border={top:{style:'thin',color:{argb:C.pet}},bottom:{style:'medium',color:{argb:C.pet}}}; }
        row.getCell(1).value='Total'; row.getCell(1).alignment={indent:1};
        cols.forEach(j=>{ const c=row.getCell(j+1), soma=o.linhas.reduce((s,ln,i)=>{ if(o.kind[i]!=='dado') return s; const v=valorDe((ln||[])[j],o.tipos[j]); return s+(typeof v==='number'?v:0); },0);
          c.value={formula:'SUBTOTAL(9,'+L(j)+ini+':'+L(j)+ultDado+')',result:Math.round(soma*100)/100}; c.numFmt=FMT[o.tipos[j]]||FMT.dec; c.alignment={horizontal:'right'}; });
        row.height=20; r++; totN++; }
      if(ultDado>=ini) ws.autoFilter={from:{row:H,column:1},to:{row:ultDado,column:n}};
      ws.views=[{state:'frozen',ySplit:H,xSplit:n>=8&&o.tipos[0]==='txt'?1:0,showGridLines:false,activeCell:'A'+(H+1)}];
      ws.pageSetup.printTitlesRow=H+':'+H;
      [].concat(o.nota||[]).filter(Boolean).forEach((t,i)=>{ const rr=r+1+i; ws.mergeCells(rr,1,rr,Math.max(n,3)); const c=ws.getCell(rr,1); c.value=t; c.font=fnt({italic:true,size:9,color:{argb:C.mut}}); c.alignment={wrapText:true,vertical:'top'}; ws.getRow(rr).height=Math.min(60,14*Math.ceil(String(t).length/120)); });
      if(!o.linhas.length){ ws.mergeCells(r,1,r,Math.max(n,3)); const c=ws.getCell(r,1); c.value='Nada para mostrar com estes filtros.'; c.font=fnt({italic:true,color:{argb:C.mut}}); c.alignment={indent:1}; }
      resumo.push([nome,o.kind.filter(k=>k==='dado').length]); }
    /* aba Sobre */
    if(info.sobre!==false){ const ws=wb.addWorksheet(nomeAba('Sobre',usados),{properties:{tabColor:{argb:'FF9AA9B2'}},views:[{showGridLines:false}],pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0}});
      ws.columns=[{width:22},{width:70},{width:8}]; let r=faixa(ws,3,{tit:info.tit||'Relatório',sub:info.sub||''}); r++;
      const kv=[['Relatório',info.tit||''],['Detalhe',info.sub||''],['Filtros',filtrosTxt(info.filtros)],['Emitido em',agora()],['Por',quem()||'—'],['Arquivo',limpa(arq)+'.xlsx']]
        .concat(resumo.map(([n,q],i)=>[i?'':'Abas',n+' — '+q+(q===1?' linha':' linhas')])).concat(info.nota?[].concat(info.nota).map((t,i)=>[i?'':'Observação',t]):[]);
      kv.forEach(([k,v])=>{ const row=ws.getRow(r++); row.getCell(1).value=k; row.getCell(1).font=fnt({bold:true,color:{argb:C.pet}}); row.getCell(2).value=v; row.getCell(2).font=fnt(); row.getCell(2).alignment={wrapText:true,vertical:'top'}; row.getCell(1).alignment={vertical:'top'};
        [1,2].forEach(j=>row.getCell(j).border={bottom:{style:'thin',color:{argb:C.lin}}}); });
      r++; ws.mergeCells(r,1,r,2); const c=ws.getCell(r,1); c.value='Os números são valores de verdade: dá para somar, filtrar e ordenar. Para imprimir, a página já está ajustada (A4, cabe na largura, cabeçalho repetido).'; c.font=fnt({italic:true,size:9,color:{argb:C.mut}}); c.alignment={wrapText:true}; ws.getRow(r).height=28; }
    const buf=await wb.xlsx.writeBuffer(); return new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }
  /* ---------- sem o ExcelJS: planilha simples (SheetJS) ---------- */
  function simples(X,abas,info){ const wb=X.utils.book_new(), usados=new Set();
    abas.forEach(a=>{ const o=preparaAba(a), larg=larguras(o); const linhas=[[info.tit||o.nome],[info.sub||''],['Filtros: '+filtrosTxt(info.filtros)],[]].concat(o.topo.map(t=>[t]),[o.cab],o.linhas.map(ln=>(ln||[]).map((v,j)=>{ const x=valorDe(v,o.tipos[j]); return x instanceof Date?x.toISOString().slice(0,10).split('-').reverse().join('/'):x; })));
      const ws=X.utils.aoa_to_sheet(linhas); ws['!cols']=larg.map(w=>({wch:w})); X.utils.book_append_sheet(wb,ws,nomeAba(o.nome,usados)); });
    if(info.sobre!==false) X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([[info.tit||'Relatório'],[info.sub||''],['Filtros: '+filtrosTxt(info.filtros)],['Emitido em '+agora()]]),nomeAba('Sobre',usados));
    return new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }
  function csv(abas,info){ const L=[[info.tit||''],[info.sub||''],['Filtros: '+filtrosTxt(info.filtros)],['Emitido em '+agora()],[]];
    abas.forEach(a=>{ const o=preparaAba(a); if(abas.length>1) L.push([o.nome]); L.push(o.cab); o.linhas.forEach(r=>L.push(r||[])); L.push([]); });
    return new Blob(['﻿'+L.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}); }
  /* ---------- principal ---------- */
  async function gerar(arq,abas,info){ info=info||{}; arq=limpa(String(arq||info.tit||'Relatorio').replace(/\.(xlsx|xls|csv)$/i,'')); abas=(abas||[]).filter(Boolean); if(!abas.length) abas=[['Planilha',[['(vazio)']]]];
    let blob=null, nome=arq+'.xlsx', modo='bonito';
    if(!window.ExcelJS){ try{ await carrega(EXJ); }catch(e){} }
    if(window.ExcelJS){ try{ blob=await comExcelJS(window.ExcelJS,arq,abas,info); }catch(e){ console.warn('[planilha] ExcelJS',e); blob=null; } }
    if(!blob){ modo='simples'; if(!(window.XLSX&&window.XLSX.utils)){ try{ await carrega(XLSXJS); }catch(e){} } if(window.XLSX&&window.XLSX.utils) blob=simples(window.XLSX,abas,info); }
    if(!blob){ modo='csv'; blob=csv(abas,info); nome=arq+'.csv'; }
    if(info.salvar) await info.salvar(blob,nome); else baixa(blob,nome);
    window.__xlsUltimo={arq:nome,modo,abas:abas.map(a=>{ const o=preparaAba(a); return {nome:o.nome,cab:o.cab,tipos:o.tipos,n:o.kind.filter(k=>k==='dado').length}; })};
    if(info.toast!==false) toast(modo==='csv'?'Sem internet para o Excel: baixei em .csv ('+nome+').':'Excel baixado: '+nome);
    return nome; }
  window.PainelXls={gerar,preparaAba,tipoCol,filtrosTxt,_valor:valorDe};
})();
