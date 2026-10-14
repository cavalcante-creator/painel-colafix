/* 14/10: etiqueta do crachá para etiquetadora — PNG na resolução da impressora (só preto e branco, com dpi gravado) e PDF do tamanho da etiqueta. */
const H=require('./harness'); const fs=require('fs'); const {execFileSync}=require('child_process'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=H.seed(d=>{ const D=d.docs;
  D['crachas/ANAS2345']={codigo:'ANAS2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true};
  D['crachas/PEDR6789']={codigo:'PEDR6789',nome:'Pedro Técnico da Silva',linha:'*',papel:'tecnico',ativo:true}; });
 const B=await H.abrir({viewport:{width:1400,height:950}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(800);
 ok('Botões de etiqueta aparecem', await p.$('[data-act="etq-todos"]')&&await p.$('[data-act="etq-um"]'));
 await p.click('[data-act="etq-um"][data-id="ANAS2345"]'); await H.dorme(600);
 ok('Janela da etiqueta com prévia', await p.evaluate(()=>!!document.querySelector('#etq .etq-pvb img')));
 await p.screenshot({path:'/tmp/etq-tela.png'});
 const baixa=async()=>{ const [dw]=await Promise.all([p.waitForEvent('download',{timeout:15000}),p.click('[data-act="etq-ok"]')]); const f='/tmp/'+dw.suggestedFilename(); await dw.saveAs(f); return f; };
 const f1=await baixa(); const b=fs.readFileSync(f1);
 const w=b.readUInt32BE(16), h=b.readUInt32BE(20), ph=b.indexOf('pHYs'), ppm=ph>0?b.readUInt32BE(ph+4):0;
 ok('PNG de 50 × 30 mm a 203 dpi = 400 × 240 pontos', /\.png$/.test(f1)&&w===400&&h===240, f1+' '+w+'×'+h);
 ok('PNG leva os 203 dpi gravados', Math.round(ppm*0.0254)===203, 'ppm '+ppm);
 const py=`import cv2,numpy as np,sys
im=cv2.imread(sys.argv[1],cv2.IMREAD_GRAYSCALE); u=np.unique(im)
t,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.copyMakeBorder(im,20,20,20,20,cv2.BORDER_CONSTANT,value=255))
print(len(u),t)`;
 const run=f=>execFileSync('python3',['-c',py,f]).toString().trim();
 let r=run(f1); ok('Só preto e branco (sem cinza) e o QR é lido', r.startsWith('2 ')&&r.endsWith('COLAFIX:CRACHA:ANAS2345'), r);
 /* 300 dpi, 40 × 25, com código de barras */
 await p.click('[data-act="etq-set"][data-k="dpi"][data-v="300"]'); await H.dorme(300); await p.click('[data-act="etq-tam"][data-v="40x25"]'); await H.dorme(300); await p.check('#etq-bar'); await H.dorme(400);
 const f2=await baixa(); const b2=fs.readFileSync(f2); r=run(f2);
 ok('40 × 25 mm a 300 dpi = 472 × 295 pontos, QR lido', b2.readUInt32BE(16)===472&&b2.readUInt32BE(20)===295&&r.endsWith('COLAFIX:CRACHA:ANAS2345'), b2.readUInt32BE(16)+'×'+b2.readUInt32BE(20)+' '+r);
 /* PDF de todos */
 await p.click('[data-act="etq-x"]'); await H.dorme(300); await p.click('[data-act="etq-todos"]'); await H.dorme(500); await p.click('[data-act="etq-set"][data-k="fmt"][data-v="pdf"]'); await H.dorme(400);
 const f3=await baixa(); const t3=fs.readFileSync(f3).toString('latin1');
 ok('PDF de todos: uma página por crachá, no tamanho da etiqueta', /\.pdf$/.test(f3)&&(t3.match(/\/Type \/Page\b/g)||[]).length===2, f3+' páginas '+(t3.match(/\/Type \/Page\b/g)||[]).length);
 ok('A escolha fica lembrada no aparelho', await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('colafix.etq')); return c.dpi===300&&c.w===40&&c.fmt==='pdf'&&c.barras===true; }));
 await p.setViewportSize({width:390,height:844}); await H.dorme(400); const lat=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 ok('No celular não rola para o lado', lat<=2, lat+'px');
 const er=B.erros.filter(x=>!/404/.test(x)); ok('Sem erro de JavaScript', !er.length, er.join(' | '));
 await B.browser.close(); console.log(res.every(x=>x.ok)?'\nTUDO PASSOU':'\nALGO FALHOU'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
