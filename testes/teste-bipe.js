/* 01/11: Folhas do coletor (QR) — bipou, registrou: chamado (elétrico/mecânico), pausas com motivo, retomar, começar, terminar,
   desfazer, sem duplicar chamado, código desconhecido, linha sem ordem; na tela das folhas só testa; PDF das folhas. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const ag=new Date(Date.now()-3600e3).toISOString();
 D['ordens/o1']={num:'5001',linha:'Linha 2',status:'aberta',produto:'Argamassa AC-I',qtd:100};
 D['ordens/o2']={num:'5002',linha:'Linha 1',status:'aberta',produto:'Rejunte',qtd:50,prodSeg:[{ini:ag,por:'Ana'}]};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3000);
 const bip=async c=>{ await p.keyboard.type(c,{delay:6}); await p.keyboard.press('Enter'); await H.dorme(1300); };
 const av=()=>p.evaluate(()=>{ const x=document.getElementById('ev-aviso'); return x?x.className+' | '+x.innerText.replace(/\s+/g,' '):''; });
 const ord=async id=>(await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs))['ordens/'+id];
 const chs=async()=>Object.entries(await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs)).filter(([k])=>k.startsWith('chamados/')).map(([k,v])=>v);
 /* tela das folhas */
 await p.evaluate(()=>__T.go('manqr')); await H.dorme(800); await p.click('[data-act="cb-modo"][data-v="bipe"]'); await H.dorme(800);
 await p.click('[data-act="evb-lay"][data-v="folha"]'); await p.click('[data-act="evb-fmt"][data-v="qr"]'); await H.dorme(500);
 let s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tela "Folhas do coletor": lista as linhas e máquinas e mostra a folha com os 10 QR', /Folhas do coletor/.test(s)&&/Quais folhas/.test(s)&&/Misturador/.test(s)&&(await p.$$('.ev-folha .ev-cod')).length>=10&&/Problema elétrico[\s\S]*Desfazer/.test(s));
 const c0=(await chs()).length; await bip('EV-ELE-LINHA1'); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Na tela das folhas o bipe só testa (não abre chamado)', /Leu EV-ELE-LINHA1 → Linha 1 · Problema elétrico → abre chamado/.test(s)&&(await chs()).length===c0, (s.match(/Leu[^\n]*/)||[''])[0]);
 const lsVazia=await p.evaluate(()=>{ const docs=JSON.parse(localStorage.getItem('__srv')).docs; const comOrdem=new Set(Object.entries(docs).filter(([k,v])=>k.startsWith('ordens/')&&(v.prodSeg||[]).length||v.status==='aberta').map(([k,v])=>v.linha));
   return [...document.querySelectorAll('.ev-ln > .ev-ck b')].map(b=>b.textContent).find(l=>!comOrdem.has(l)); });
 /* uso real, em outra tela */
 await p.evaluate(()=>__T.go('inicio')); await H.dorme(600);
 await bip('EV-FPR-LINHA1'); let a=await av(), o2=await ord('o2'); const u2=o2.prodSeg[o2.prodSeg.length-1];
 ok('Falta de produto: pausa a ordem rodando com o motivo e mostra o aviso grande', u2.fim&&u2.pausa==='Falta de produto'&&u2.fimPor==='Coletor (bipe)'&&/warn/.test(a)&&/Ordem 5002 pausada · falta de produto/.test(a), a);
 await bip('EV-RET-LINHA1'); a=await av(); o2=await ord('o2');
 ok('Retomou produção: a ordem volta a rodar', o2.prodSeg.length===2&&!o2.prodSeg[1].fim&&/ok/.test(a)&&/voltou a rodar/.test(a), a);
 await bip('EV-DES'); a=await av(); o2=await ord('o2');
 ok('Desfazer: desfaz o último bipe de ordem', o2.prodSeg.length===1&&o2.prodSeg[0].pausa==='Falta de produto'&&/Desfeito/.test(a), a);
 const todos=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const prox=Object.entries(todos).filter(([k,v])=>k.startsWith('ordens/')&&v.linha==='Linha 2'&&v.status==='aberta'&&!(v.prodSeg||[]).length).map(([k,v])=>Object.assign({_id:k.slice(7)},v)).sort((a,b)=>((a.seq!=null?+a.seq:1e9)-(b.seq!=null?+b.seq:1e9))||String(a.num).localeCompare(String(b.num)))[0]._id;
 await bip('EV-INI-LINHA2'); a=await av(); let o1=await ord(prox);
 ok('Início de produção: começa a próxima ordem da fila da linha', (o1.prodSeg||[]).length===1&&!o1.prodSeg[0].fim&&new RegExp('Ordem '+o1.num+' começou').test(a), a);
 await bip('EV-FIM-LINHA2'); a=await av(); o1=await ord(prox);
 ok('Fim de produção: termina a ordem', o1.prodSeg[0].fim&&/terminada/.test(a), a);
 await bip('EV-ELE-LINHA1-EQMIX1'); await H.dorme(1500); a=await av(); let cs=await chs(); const ch=cs.find(c=>c.origem==='coletor');
 ok('Problema elétrico na máquina: abre chamado da manutenção (Elétrico, parou, Misturador)', ch&&ch.linha==='Linha 1'&&ch.defeito==='Elétrico / painel'&&ch.impacto==='parou'&&ch.equip==='Misturador'&&ch.nome==='Coletor (bipe)'&&/crit/.test(a)&&/Chamado aberto · OS/.test(a), a);
 await bip('EV-MEC-LINHA1-EQMIX1'); a=await av(); ok('Não duplica chamado aberto da mesma máquina', (await chs()).filter(c=>c.origem==='coletor').length===1&&/Já tem chamado aberto: OS/.test(a), a);
 await bip('EV-DES'); a=await av(); ok('Desfazer depois de chamado: avisa para cancelar na manutenção', /pe[çc]a para a manutenção cancelar|Nada para desfazer/.test(a), a);
  await p.evaluate(()=>__T.go('inicio')); await H.dorme(400);
 await bip('EV-ALM-'+lsVazia.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')); a=await av(); ok('Linha sem ordem rodando: avisa que a parada não foi registrada', /Nenhuma ordem rodando/.test(a)&&/warn/.test(a), a);
 await bip('EV-XYZ-LINHA1'); a=await av(); ok('Código desconhecido: aviso vermelho', /crit/.test(a)&&/desconhecido/.test(a), a);
 await bip('EV-ALM-LINHAX'); a=await av(); ok('Linha que não existe: aviso vermelho', /não está cadastrada/.test(a), a);
 /* PDF */
 await p.evaluate(()=>__T.go('manqr')); await H.dorme(600); await p.evaluate(()=>{ window.__toasts=[]; const t=window.toast; }); 
 const pdfOk=await p.evaluate(async()=>{ try{ let nome=''; const j=window.jspdf.jsPDF.prototype.save; window.jspdf.jsPDF.prototype.save=function(n){ nome=n; }; const mb=window.manBaixar; await document.querySelector('[data-act="ev-pdf"]').click(); await new Promise(r=>setTimeout(r,1500)); return document.body.innerText.includes('Imprima e plastifique')||nome; }catch(e){ return 'erro '+e.message; } });
 ok('Baixar PDF das folhas', pdfOk===true||/Folhas_do_coletor/.test(String(pdfOk)), pdfOk);
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
