const H=require('./harness'); const {seedManut}=require('./manut-seed'); const {execFileSync}=require('child_process');
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
const PY=(...a)=>execFileSync('python3',[__dirname+'/cam.py',...a]).toString().trim();
(async()=>{ const {d}=seedManut(); const D=d.docs; D['ordens/5001'].rancho='123456'; D['ordens/5002'].rancho='123456';
 D['ranchos/123456']={numero:'123456',criadoEm:new Date().toISOString(),ordens:[{num:'5001'},{num:'5002'}],itens:[{c:'MP001',d:'Cimento',um:'kg',q:500}]};
 d.users['tablet@painel-colafix.app']={uid:'uTAB',pass:'tab123',nome:'Tablet'}; D['perfis/uTAB']={nome:'Tablet',usuario:'tablet'}; D['acessos/uTAB']={perfil:'tablet',mods:['tablet'],locais:[],ativo:true};
 D['crachas/ANAS2345']={codigo:'ANAS2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true};
 // ---- impressos (administradora) ----
 let B=await H.abrir(); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.act='fp-ordem'; b.dataset.id='5001'; b.id='fpx'; document.body.appendChild(b); });
 const [d1]=await Promise.all([p.waitForEvent('download'),p.click('#fpx')]); await d1.saveAs('/tmp/folha.png');
 const bf=PY('confere','/tmp/folha.png','46','21','62','9','RA-123456') /* cabeçalho de 13/10: barras embaixo do título, QR grande à direita */; const qf=PY('medir','/tmp/folha.png');
 ok('Folha de produção: código de barras RA- impresso certo + QR do rancho legível', /^OK/.test(bf)&&/rancho=123456'/.test(qf)&&!/#rancho/.test(qf), bf+' · QR '+qf);
 await p.evaluate(()=>__T.go('manequip')); await H.dorme(500);
 const [d2]=await Promise.all([p.waitForEvent('download'),p.click('[data-act="mx-eq-qrpdf"]')]); await d2.saveAs('/tmp/equips.png');
 const ids=['eqmix1','eqens1','eqcmp']; const lidos=[];
 for(let k=0;k<3;k++){ const x=10+(k%2)*95, y=12+Math.floor(k/2)*135; const hit=ids.find(id=>/^OK/.test(PY('confere','/tmp/equips.png',String(x+10),String(y+113),'75','9','EQ-'+id))); lidos.push(hit||'?'); }
 ok('Etiqueta do equipamento: código de barras EQ- impresso certo nas 3 etiquetas', lidos.every(x=>x!=='?')&&new Set(lidos).size===3, lidos.join(', '));
 const banco=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); await B.browser.close();
 // ---- tablet com coletor ----
 B=await H.abrir({negarCamera:true}); p=B.page; await H.preparar(p,banco); await p.goto(H.BASE); await H.entrar(p,'tablet','tab123'); await H.dorme(2800);
 const bip=async c=>{ await p.keyboard.type(c,{delay:6}); await p.keyboard.press('Enter'); await H.dorme(500); };
 const est=()=>p.evaluate(()=>({f:__T.S().tt.fase,l:__T.S().tt.linha,e:__T.S().tt.equipId,pre:__T.S().tt.pre,t:(document.querySelector('.tt')||{}).innerText||''}));
 await bip('EQ-eqmix1'); const a1=await est(); await bip('CXANAS2345'); const a2=await est();
 ok('Tablet: bipa a máquina (EQ-), depois o crachá → vai direto ao defeito com a máquina escolhida', a1.f==='pre'&&/Misturador/.test(a1.t)&&/passe o seu crachá/i.test(a1.t)&&a2.f==='defeito'&&a2.e==='eqmix1'&&a2.l==='Linha 1', JSON.stringify({antes:a1.f,depois:a2.f,maq:a2.e}));
 await p.click('[data-act="tt-def"][data-v="Vazamento"]'); await p.click('[data-act="tt-def-ok"]'); await p.click('[data-act="tt-imp"][data-v="nao"]'); await H.dorme(1500);
 let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const ch=Object.values(s).find(x=>x&&x.origem==='tablet');
 ok('Chamado salvo com a máquina do código e o nome do crachá', ch&&ch.equipId==='eqmix1'&&ch.nome==='Ana Souza', ch&&(ch.equip+' · '+ch.nome));
 await p.click('[data-act="tt-voltar"]').catch(()=>{}); await H.dorme(300); await p.evaluate(()=>{ __T.S().tt.recente={}; __T.S().tt.fase='espera'; });
 await bip('CXANAS2345'); const b1=await est(); await bip('CH-LINHA2'); const b2=await est();
 ok('Tablet: crachá primeiro (com chamado aberto vai para "voltou a funcionar?"), depois bipa a linha (CH-) → abre chamado nessa linha', (b1.f==='maquina'||b1.f==='volta')&&b2.f==='defeito'&&b2.l==='Linha 2'&&!b2.e, JSON.stringify({b1:b1.f,b2:b2.f,linha:b2.l}));
 await p.evaluate(()=>{ __T.S().tt.recente={}; __T.S().tt.fase='espera'; __T.S().tt.p=null; });
 await bip('http://painel.test/?chamado=Linha%201&equip=eqens1'); const c1=await est();
 ok('Tablet: coletor de QR (digita o endereço da etiqueta) também funciona', c1.f==='pre'&&c1.pre&&c1.pre.equipId==='eqens1', JSON.stringify(c1.pre));
 await B.browser.close();
 // ---- painel com coletor ----
 B=await H.abrir(); p=B.page; await H.preparar(p,banco); await p.goto(H.BASE); await H.entrar(p,'operador','ope123'); await H.dorme(2500);
 const bp=async c=>{ await p.keyboard.type(c,{delay:6}); await p.keyboard.press('Enter'); await H.dorme(700); };
 await bp('EQ-eqcmp'); const q1=await p.evaluate(()=>({v:__T.S().view,f:__T.S().man.f}));
 await bp('http://painel.test/?rancho=123456'); const q2=await p.evaluate(()=>({v:__T.S().view,ab:__T.S().dbo&&__T.S().dbo.aberto}));
 ok('Painel: coletor com EQ- abre o chamado com a máquina; com o endereço da folha abre o rancho no diário', q1.v==='manch'&&q1.f&&q1.f.equipId==='eqcmp'&&q2.v==='diario', JSON.stringify({chamado:q1.v,maq:q1.f&&q1.f.equip,rancho:q2.v}));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
