const H=require('./harness'); const {seedManut}=require('./manut-seed'); const {execFileSync}=require('child_process'); const fs=require('fs');
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,250):'')); };
const PY=(...a)=>execFileSync('python3',[__dirname+'/cam.py',...a]).toString().trim(); const DIR='/tmp/col'; fs.mkdirSync(DIR,{recursive:true});
(async()=>{ const {d}=seedManut(); d.users['tablet@painel-colafix.app']={uid:'uTAB',pass:'tab123',nome:'Tablet'}; d.docs['perfis/uTAB']={nome:'Tablet',usuario:'tablet'}; d.docs['acessos/uTAB']={perfil:'tablet',mods:['tablet'],locais:[],ativo:true};
 let B=await H.abrir(); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(400);
 for(const [n,l,pp] of [['Ana Souza','Linha 1','operador'],['Bruno Lima','Linha 2','operador'],['Pedro Técnico','*','tecnico']]){ await p.fill('#cr-nome',n); await p.selectOption('#cr-linha',l); await p.selectOption('#cr-papel',pp); await p.click('[data-act="cr-add"]'); await H.dorme(450); }
 let banco=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); const crs=Object.values(banco.docs).filter(x=>x&&x.codigo&&x.papel);
 const ord=crs.slice().sort((a,b)=>String(a.linha).localeCompare(String(b.linha))||String(a.nome).localeCompare(String(b.nome)));
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act="cr-ades-todos"]')]); const ad=DIR+'/adesivos.png'; await dl.saveAs(ad);
 const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('[data-act="cr-pdf-todos"]')]); const cr=DIR+'/crachas.png'; await dl2.saveAs(cr);
 const qa=JSON.parse(PY('medir',ad).replace(/\(/g,'[').replace(/\)/g,']').replace(/'/g,'"')); const qc=JSON.parse(PY('medir',cr).replace(/\(/g,'[').replace(/\)/g,']').replace(/'/g,'"'));
 ok('QR continua legível e no tamanho (adesivo 25 mm, crachá 30 mm)', qa.length===3&&qa.every(([t,mm])=>mm>23.5&&mm<26.5)&&qc.length===3&&qc.every(([t,mm])=>mm>28.5&&mm<31.5), 'adesivo '+qa.map(x=>x[1]).join('/')+' mm · crachá '+qc.map(x=>x[1]).join('/')+' mm');
 // barras: lidas da imagem impressa
 const W=38,Hh=54,gx=4,gy=4,cols=4; const x0=(210-cols*W-(cols-1)*gx)/2, y0=(297-5*Hh-4*gy)/2; const ra=[];
 ord.forEach((c,i)=>{ const x=x0+(i%cols)*(W+gx), y=y0+Math.floor(i/cols)*(Hh+gy); ra.push(c.nome+': '+PY('confere',ad,String(x+1),String(y+39),String(W-2),'9','CX'+c.codigo)); });
 ok('Código de barras do adesivo: as barras impressas formam exatamente o código do crachá', ra.every(x=>/OK/.test(x)), ra.join(' · '));
 const CW=85.6,CH=54,cgx=8,cx0=(210-2*CW-cgx)/2,cy0=12,cgy=4.5; const rc=[];
 ord.forEach((c,i)=>{ const x=cx0+(i%2)*(CW+cgx), y=cy0+Math.floor(i/2)*(CH+cgy); rc.push(c.nome+': '+PY('confere',cr,String(x+3),String(y+36),String(CW-45),'9','CX'+c.codigo)); });
 ok('Código de barras do crachá completo também confere', rc.every(x=>/OK/.test(x)), rc.join(' · '));
 // teste do coletor na tela de crachás + digitação normal não é confundida
 const ana=crs.find(c=>c.nome==='Ana Souza').codigo;
 await p.keyboard.type('CX'+ana,{delay:8}); await p.keyboard.press('Enter'); await H.dorme(400);
 const t1=await p.evaluate(()=>(document.querySelector('.cb-teste')||{}).innerText||'');
 await p.click('#cr-nome'); await p.keyboard.type('CXABCDEFGH',{delay:140}); await p.keyboard.press('Enter'); await H.dorme(300);
 const v1=await p.evaluate(()=>document.getElementById('cr-nome').value);
 ok('Tela de crachás: bipar o crachá mostra de quem é; digitar devagar num campo não é confundido com o coletor', /Leu o crachá de Ana Souza/.test(t1)&&v1==='CXABCDEFGH', `"${t1}" · campo="${v1}"`);
 await B.browser.close();
 // tablet com coletor (sem câmera)
 const T=await H.abrir({negarCamera:true}); const q=T.page; await H.preparar(q,banco); await q.goto(H.BASE); await H.entrar(q,'tablet','tab123'); await H.dorme(2500);
 await q.keyboard.type('CX'+ana,{delay:8}); await q.keyboard.press('Enter'); await H.dorme(500);
 const f1=await q.evaluate(()=>({f:__T.S().tt.fase,t:(document.querySelector('.tt')||{}).innerText||''}));
 ok('Tablet: coletor laser bipa o código de barras do crachá e abre o fluxo da Ana', f1.f==='maquina'&&/Olá, Ana Souza/.test(f1.t), f1.f);
 await q.click('[data-act="tt-voltar"]'); await H.dorme(300);
 const pedro=crs.find(c=>c.nome==='Pedro Técnico').codigo;
 await q.keyboard.type('COLAFIX:CRACHA:'+pedro,{delay:8}); await q.keyboard.press('Enter'); await H.dorme(500);
 const f2=await q.evaluate(()=>({f:__T.S().tt.fase,t:(document.querySelector('.tt')||{}).innerText||''}));
 ok('Tablet: coletor que lê QR também funciona (crachá do técnico)', f2.f==='tecnico'&&/Pedro Técnico/.test(f2.t), f2.f);
 await q.click('[data-act="tt-voltar"]'); await H.dorme(300);
 await q.keyboard.type('CXZZZZ9999',{delay:8}); await q.keyboard.press('Enter'); await H.dorme(400);
 ok('Tablet: código de barras desconhecido é recusado com mensagem', /não reconhecido/.test(await q.evaluate(()=>__T.S().tt.msg||'')));
 console.log('erros:',[...T.erros].filter(x=>!/404|negado/.test(x))); await T.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
