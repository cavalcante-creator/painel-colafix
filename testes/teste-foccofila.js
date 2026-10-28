/* Robô do Focco (lado do painel): envelopes em pcpfila são lidos com a mesma leitura/gravação da Base de dados. */
const H=require('./harness'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,220):'')); };
(async()=>{ const {d}=H.seed(); const D=d.docs, t=new Date().toISOString();
 D['pcpbase/meta']={em:t,hist:[]}; D['pcpbase/perfil']={}; D['pcpbase/vendas']={}; D['pcpbase/prev']={};
 D['pcpbase/itens']={l:{AC3001:{d:'ARGAMASSA AC3 20KG',sal:1,a3:960,a30:480}},atual:{SALDO:t},em:t};
 const html='<html><body><table><tr><td>COD. ITEM</td><td>DESC. TECNICA</td><td>UM</td><td>LOTE MIN</td><td>LOTE MAX</td><td>LOTE MULT</td><td>ESTQ. SEG</td><td>TEMP. REP</td></tr><tr><td>AC3001</td><td>ARGAMASSA AC3 20KG</td><td>SC</td><td>1.000,00</td><td>5.000,00</td><td>500,00</td><td>2.400,00</td><td>3,00</td></tr></table></body></html>';
 const b64=Buffer.from(html,'latin1').toString('base64');
 D['pcpfila/f1']={nome:'parametros.xls',status:'pendente',partes:1,em:t,tam:html.length,por:'Robô Focco'}; D['pcpfila/f1/partes/0']={n:0,b64};
 D['pcpfila/f2']={nome:'foto.xls',status:'pendente',partes:1,em:new Date(Date.now()+1000).toISOString(),tam:10,por:'Robô Focco'}; D['pcpfila/f2/partes/0']={n:0,b64:Buffer.from('<html><table><tr><td>nada</td></tr></table></html>').toString('base64')};
 const {browser,page:p}=await H.abrir({viewport:{width:1366,height:900}}); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1500);
 await p.evaluate(()=>__T.go('anlbase')); await H.dorme(14000);
 const srv=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 ok('Envelope de Parâmetros lido sozinho e marcado "ok", como Parâmetros do Focco', (srv['pcpfila/f1']||{}).status==='ok'&&/Parâmetros/.test((srv['pcpfila/f1']||{}).lidoComo||''), JSON.stringify(srv['pcpfila/f1']).slice(0,200));
 ok('Gravou na base como a importação manual (histórico com o arquivo e o estoque de segurança do AC3001)', ((srv['pcpbase/meta']||{}).hist||[]).some(h=>(h.arqs||[]).includes('Parâmetros do Focco')), JSON.stringify((srv['pcpbase/meta']||{}).hist).slice(0,200));
 ok('Depois de lido, as partes do envelope são apagadas (fica só o registro)', !srv['pcpfila/f1/partes/0']);
 ok('Arquivo que não é do Focco: marcado "erro" com o motivo, sem gravar nada', (srv['pcpfila/f2']||{}).status==='erro'&&/Não reconheci/.test((srv['pcpfila/f2']||{}).erro||''), JSON.stringify(srv['pcpfila/f2']).slice(0,200));
 const c=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Base de dados mostra o quadro do robô com os dois arquivos', /ROBÔ DO FOCCO/.test(c)&&/parametros\.xls/.test(c)&&/foto\.xls/.test(c), (c.match(/ROBÔ DO FOCCO[\s\S]{0,200}/)||[''])[0].replace(/\n/g,' | '));
 await browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
