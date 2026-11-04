/* RH: assinar documento pelo gov.br (04/11). O painel faz o PDF e o link (assinar.html); a pessoa assina fora (no gov.br)
   e manda de volta; o painel confere e guarda. Aqui a "assinatura do gov.br" é feita com o openssl (certificado de teste
   com o mesmo nome de emissor) num PDF com atualização incremental, como o assinador faz. Nomes inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const {execSync}=require('child_process'); const fs=require('fs'); const os=require('os'); const path=require('path');
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const PDF0=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n186\n%%EOF\n','latin1');
/* assina como o assinador: acrescenta no fim um dicionário /Sig com /ByteRange e /Contents (CMS destacado, SHA-256) */
function assina(orig,cn){ const dir=fs.mkdtempSync(path.join(os.tmpdir(),'asn-')), q=f=>path.join(dir,f), sh=c=>execSync(c,{cwd:dir,stdio:'pipe'});
  sh(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.pem -days 30 -subj "/O=Gov-Br/CN=AC Final do Governo Federal do Brasil v1"`);
  sh(`openssl req -newkey rsa:2048 -nodes -keyout eu.key -out eu.csr -subj "/O=Gov-Br/CN=${cn}"`);
  sh(`openssl x509 -req -in eu.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out eu.pem -days 30`);
  const Z=16384, pre=Buffer.from('\n5 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /ETSI.CAdES.detached /ByteRange [0 ##########A ##########B ##########C] /Contents ','latin1');
  const post=Buffer.from(' >>\nendobj\n%%EOF\n','latin1'); let f=Buffer.concat([orig,pre,Buffer.from('<'+'0'.repeat(Z)+'>','latin1'),post]);
  const b=orig.length+pre.length, c=b+Z+2, d=f.length-c, put=(tag,n)=>{ const s=f.toString('latin1'), i=s.indexOf(tag); f=Buffer.concat([f.subarray(0,i),Buffer.from(String(n).padEnd(tag.length,' '),'latin1'),f.subarray(i+tag.length)]); };
  put('##########A',b); put('##########B',c); put('##########C',d);
  fs.writeFileSync(q('cont.bin'),Buffer.concat([f.subarray(0,b),f.subarray(c)]));
  sh(`openssl cms -sign -binary -in cont.bin -signer eu.pem -inkey eu.key -certfile ca.pem -outform DER -md sha256 -out sig.der`);
  const hx=fs.readFileSync(q('sig.der')).toString('hex').toUpperCase(); const s=f.toString('latin1'); const i=s.indexOf('<'+'0'.repeat(Z)); f=Buffer.concat([f.subarray(0,i+1),Buffer.from(hx,'latin1'),f.subarray(i+1+hx.length)]);
  return f; }
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
  D['rh/dados/funcionarios/a1']={nome:'JOAO PEREIRA TESTE',tipo:'PJ',empresa:'ZENITH',cpf:'11122233344',status:'Ativo',admissao:'2025-03-10',setor:'PRODUÇÃO',funcao:'OPERADOR',telefone:'(51) 99999-0000'};
  D['rh/dados/modelos/m1']={nome:'TERMO DE TESTE',html:'<p>Termo.</p>'};
  D['rh/dados/docsgerados/g1']={funcId:'a1',funcionario:'JOAO PEREIRA TESTE',modeloId:'m1',modelo:'TERMO DE TESTE',em:'2026-11-04T10:00:00Z',porNome:'juliana',html:'<p>Termo do Joao.</p>'};
  const B=await H.abrir({viewport:{width:1500,height:950}}); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message)); p.on('dialog',x=>x.accept());
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
  await p.evaluate(b64=>{ window.RHAssina._A.pdfFn=async()=>new Blob([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],{type:'application/pdf'}); },PDF0.toString('base64'));
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(1000);
  await p.click('[data-act="rh-fusel"]:has-text("JOAO PEREIRA")'); await H.dorme(400); await p.click('[data-act="rh-fab"][data-v="docs"]'); await H.dorme(900);
  const t0=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Documento gerado tem "Assinar pelo gov.br"', /Assinar pelo gov\.br/.test(t0), t0.replace(/\n/g,' | ').slice(0,300));
  await p.click('[data-act="asn-abre"]'); await H.dorme(500);
  const m0=await p.evaluate(()=>(document.getElementById('asn-mw')||{}).innerText||'');
  ok('Janela explica os 3 passos e traz o WhatsApp do cadastro', /Assinar pelo gov\.br/.test(m0)&&/conta prata ou ouro/.test(m0)&&await p.inputValue('#asn-tel')==='(51) 99999-0000', m0.replace(/\n/g,' | '));
  await p.click('[data-act="asn-criar"]'); await H.dorme(2000);
  let S=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const tok=Object.keys(S).find(k=>k.startsWith('rh/dados/assinped/')).split('/').pop(); const ped=S['rh/dados/assinped/'+tok];
  ok('Cria o pedido (código de 20, PDF em pedaços, resumo do PDF) e marca o documento como enviado', /^[a-z0-9]{20}$/.test(tok)&&ped.partes===1&&ped.tam===PDF0.length&&ped.sha===require('crypto').createHash('sha256').update(PDF0).digest('hex')&&!!S['rh/dados/assinpdf/'+tok+'-0']&&S['rh/dados/docsgerados/g1'].ass.st==='enviado', JSON.stringify(ped).slice(0,240));
  const lk=await p.evaluate(()=>document.getElementById('asn-link').innerText);
  await p.click('[data-act="asn-wa"]'); const wa=await p.evaluate(()=>decodeURIComponent(window.__asnUltimoWa||''));
  ok('Link assinar.html e WhatsApp com a mensagem para a pessoa', lk.endsWith('assinar.html?c='+tok)&&/^https:\/\/wa\.me\/5551999990000\?text=Olá, Joao!/.test(wa)&&wa.includes('TERMO DE TESTE')&&wa.includes(lk), wa.slice(0,200));
  await p.click('[data-act="asn-x"]'); await H.dorme(600);
  const t1=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Lista mostra "Esperando assinatura"', /Esperando assinatura/.test(t1));
  /* a pessoa, no celular, sem login */
  const B2=await H.abrir({viewport:{width:390,height:844}}); const q=B2.page; const erros2=[]; q.on('pageerror',e=>erros2.push(e.message));
  await H.preparar(q,{docs:S,users:{}}); await q.goto(H.BASE+'assinar.html?c='+tok); await H.dorme(1500);
  const a0=await q.evaluate(()=>document.body.innerText);
  ok('Página da pessoa: olá, o documento e os 3 passos com o botão do assinador gov.br', /Olá, Joao!/.test(a0)&&/TERMO DE TESTE/.test(a0)&&/Baixe o documento/.test(a0)&&/Assine no gov\.br/.test(a0)&&/Mande o documento assinado/.test(a0)&&await q.getAttribute('a.gov','href')==='https://assinador.iti.br/', a0.replace(/\n/g,' | ').slice(0,300));
  const [dl]=await Promise.all([q.waitForEvent('download',{timeout:8000}).catch(()=>null),q.click('#baixa')]); let baixado=null; if(dl){ const pt=await dl.path(); baixado=fs.readFileSync(pt); }
  ok('Baixar o documento devolve o mesmo PDF que o RH mandou', baixado&&Buffer.compare(baixado,PDF0)===0&&dl.suggestedFilename()==='TERMO DE TESTE - Joao Pereira Teste.pdf', dl&&dl.suggestedFilename());
  await q.setInputFiles('#arq',{name:'termo.pdf',mimeType:'application/pdf',buffer:PDF0}); await H.dorme(800);
  const a1=await q.evaluate(()=>document.getElementById('chk').innerText+' | '+document.getElementById('env').disabled);
  ok('Arquivo sem assinatura: avisa e não deixa mandar', /ainda não está assinado/.test(a1)&&/true$/.test(a1), a1);
  const assinado=assina(PDF0,'JOAO PEREIRA TESTE');
  await q.setInputFiles('#arq',{name:'termo_assinado.pdf',mimeType:'application/pdf',buffer:assinado}); await H.dorme(1200);
  const a2=await q.evaluate(()=>document.getElementById('chk').innerText+' | '+document.getElementById('env').disabled);
  ok('Arquivo assinado: lê quem assinou e libera o envio', /Assinado por JOAO PEREIRA TESTE pelo gov\.br/.test(a2)&&/false$/.test(a2), a2);
  await q.click('#env'); await H.dorme(1500);
  const a3=await q.evaluate(()=>document.body.innerText); const S2=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  ok('Mandar: guarda o arquivo em pedaços e mostra "Documento enviado"', /Documento enviado/.test(a3)&&S2['rh/dados/assinenv/'+tok]&&S2['rh/dados/assinenv/'+tok].partes===1&&!!S2['rh/dados/assinenvp/'+tok+'-0'], a3.replace(/\n/g,' | ').slice(0,200));
  /* volta ao RH: o painel confere e guarda */
  await p.evaluate(s=>{ const o=JSON.parse(localStorage.getItem('__srv')); o.docs=s; localStorage.setItem('__srv',JSON.stringify(o)); window.__mockReconnect&&window.__mockReconnect(); },S2); await H.dorme(3500);
  const S3=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), g=S3['rh/dados/docsgerados/g1'];
  ok('Painel confere: mesmo documento, assinado pela pessoa, certificado do gov.br, hash confere → "Assinado pelo gov.br"', g.assinado&&g.assinado.gov&&g.assinado.gov.ok===true&&g.assinado.gov.mesmo===true&&g.assinado.gov.ass[0].gov===true&&g.assinado.gov.ass[0].digOk===true&&/^2026-/.test(g.assinado.gov.ass[0].quando)&&g.ass.st==='assinado'&&S3['rh/dados/assinped/'+tok].usado===true, JSON.stringify(g.assinado&&g.assinado.gov).slice(0,400));
  ok('Guarda o PDF assinado nos arquivos do RH e apaga os pedaços', Object.keys(S3).some(k=>k.startsWith('rh/arquivos/lista/')&&/assinado gov\.br/.test(S3[k].nome))&&!S3['rh/dados/assinpdf/'+tok+'-0']&&!S3['rh/dados/assinenvp/'+tok+'-0']);
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(800); await p.click('[data-act="rh-fusel"]:has-text("JOAO PEREIRA")'); await H.dorme(300); await p.click('[data-act="rh-fab"][data-v="docs"]'); await H.dorme(900);
  const t2=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Lista mostra "✓ Assinado pelo gov.br", Validar e Ver assinado', /✓ Assinado pelo gov\.br/.test(t2)&&/Validar/.test(t2)&&/Ver assinado/.test(t2), t2.replace(/\n/g,' | ').slice(0,300));
  /* conferência: outra pessoa assinou e o documento mudou */
  const c2=await p.evaluate(async([a,b])=>{ const u=Uint8Array.from(atob(a),c=>c.charCodeAt(0)); const r=await window.RHAssina._confere({R:{func:[{_id:'a1',nome:'JOAO PEREIRA TESTE'}]}},{tam:u.length+5,sha:'x',funcId:'a1',nome:'Joao'},Uint8Array.from(atob(b),c=>c.charCodeAt(0))); return r; },[PDF0.toString('base64'),assina(Buffer.from(PDF0.toString('latin1').replace('595 842','612 792'),'latin1'),'MARIA OUTRA PESSOA').toString('base64')]);
  ok('Confere e aponta: assinado por outra pessoa e documento diferente', c2.ok===false&&c2.probs.some(x=>/MARIA OUTRA PESSOA/.test(x))&&c2.probs.some(x=>/não começa igual/.test(x)), JSON.stringify(c2.probs));
  /* apagar o documento gerado (dois toques) */
  await p.click('[data-act="rh-dgdel"][data-id="g1"]'); await H.dorme(300); await p.click('[data-act="rh-dgdel"][data-id="g1"]:has-text("Confirmar")'); await H.dorme(900);
  const S4=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), t4=await p.evaluate(()=>document.getElementById('view').innerText);
  ok('Apagar o documento gerado (dois toques): some da lista e fica marcado removido', S4['rh/dados/docsgerados/g1'].removido===true&&!/Assinado pelo gov\.br/.test(t4), t4.replace(/\n/g,' | ').slice(0,200));
  ok('Nenhum erro de JavaScript', !erros.length&&!erros2.length, erros.concat(erros2).join(' | '));
  await B2.fechar?.(); await B.fechar?.(); const f=res.filter(r=>!r.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU tudo ('+res.length+')'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
