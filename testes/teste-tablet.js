const H=require('./harness'); const {seedManut}=require('./manut-seed'); const {execFileSync}=require('child_process'); const fs=require('fs');
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const PY=(...a)=>execFileSync('python3',[__dirname+'/cam.py',...a]).toString(); const DIR='/tmp/tab'; fs.mkdirSync(DIR,{recursive:true});
(async()=>{ const {d}=seedManut(); d.users['tablet@painel-colafix.app']={uid:'uTAB',pass:'tab123',nome:'Tablet'}; d.docs['perfis/uTAB']={nome:'Tablet das linhas',usuario:'tablet'};
 d.docs['acessos/uTAB']={perfil:'tablet',mods:['tablet'],locais:[],ativo:true};
 d.docs['config/manut'].equips.push({id:'eqfx1',linha:'Fixcol',nome:'Envasadora',tag:'FX-01',ativo:true});
 let banco=d;
 // ---- dona: cargos prontos, crachás e adesivos ----
 let B=await H.abrir(); let p=B.page; await H.preparar(p,banco); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>{ __T.S().eq.aba='cargos'; __T.go('acessos'); }); await H.dorme(400); const cg=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Cargos prontos: "Manutenção" e "Tablet da parede (chamados)" lado a lado, visíveis sem expandir', /Manutenção\s*pronto\s*Atende os chamados/.test(cg)&&/Tablet da parede \(chamados\)/.test(cg)&&cg.indexOf('Tablet da parede')<cg.indexOf('Mostrar todos'), cg.slice(cg.indexOf('CARGOS PRONTOS'),cg.indexOf('CARGOS PRONTOS')+420).replace(/\n/g,' | '));
 await p.evaluate(()=>__T.go('mancrachas')); await H.dorme(400);
 for(const [n,l,pp] of [['Ana Souza','Linha 1','operador'],['Pedro Técnico','*','tecnico'],['Júlia Fixcol','Fixcol','operador']]){ await p.fill('#cr-nome',n); await p.selectOption('#cr-linha',l); await p.selectOption('#cr-papel',pp); await p.click('[data-act="cr-add"]'); await H.dorme(450); }
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act="cr-ades-todos"]')]); const png=DIR+'/adesivos.png'; await dl.saveAs(png); const nome=dl.suggestedFilename();
 const lidos=JSON.parse(PY('medir',png).replace(/\(/g,'[').replace(/\)/g,']').replace(/'/g,'"'));
 ok('Adesivo de QR 3 × 4 cm: os 3 QR saem com 25 mm e legíveis', /\.pdf$/.test(nome)&&lidos.length===3&&lidos.every(([t,mm])=>mm>=23.5&&mm<=26.5), lidos.map(([t,mm])=>t.slice(15)+' '+mm+' mm').join(' · '));
 // distância de leitura do adesivo de 25 mm
 const srv0=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); const crs=Object.values(srv0.docs).filter(x=>x&&x.codigo&&x.papel); const ord=crs.slice().sort((a,b)=>String(a.linha).localeCompare(String(b.linha))||String(a.nome).localeCompare(String(b.nome))).map(c=>c.nome);
 PY('adesivo',png,String(ord.indexOf('Ana Souza')),DIR+'/ana.y4m','4.2'); PY('adesivo',png,String(ord.indexOf('Pedro Técnico')),DIR+'/pedro.y4m','4.2');
 const dist=execFileSync('python3',['-c',`
import importlib.util,cv2,numpy as np
s=importlib.util.spec_from_file_location('c','${__dirname}/cam.py'); c=importlib.util.module_from_spec(s); s.loader.exec_module(c)
d=cv2.QRCodeDetector(); out=[]
def fr(p):
  b=open(p,'rb').read(); i=b.index(b'FRAME\\n')+6; y=np.frombuffer(b[i:i+1280*720*3//2],np.uint8).reshape(1080,1280); return cv2.cvtColor(y,cv2.COLOR_YUV2BGR_I420)
for cm in [10,15,20,25,30]:
  px=1280/(2*cm*10*0.613); n=0
  for a,bl in [(0,0.8),(8,1.1),(15,1.4)]:
    c.cena.__defaults__=(a,bl); c.adesivo('${png}',${ord.indexOf('Ana Souza')},'/tmp/tab/d.y4m',px); t,_,_=d.detectAndDecode(fr('/tmp/tab/d.y4m')); n+=bool(t)
  out.append(f'{cm}cm:{n}/3')
print(' '.join(out))`]).toString().trim();
 ok('Adesivo lido pela câmera frontal: garantido de 10 a 20 cm (a um palmo), quase sempre a 25 cm', /10cm:3\/3 15cm:3\/3 20cm:3\/3 25cm:[23]\/3/.test(dist), dist);
 banco=srv0; await B.browser.close();
 // ---- login do tablet ----
 const tablet=async(cam)=>{ const T=await H.abrir({camera:cam,decodificador:true,viewport:{width:1280,height:800}}); await H.preparar(T.page,banco); await T.page.goto(H.BASE); await H.entrar(T.page,'tablet','tab123'); return T; };
 const espera=async(pg,f,ms)=>{ const t0=Date.now(); while(Date.now()-t0<(ms||10000)){ if(await pg.evaluate(f).catch(()=>false)) return true; await H.dorme(200); } return false; };
 let T=await tablet(DIR+'/ana.y4m'); let q=T.page;
 await espera(q,()=>window.__T&&__T.S().view==='mantotem',12000);
 const e0=await q.evaluate(()=>({v:__T.S().view,x:!!document.querySelector('.tt-x'),ln:[...document.querySelectorAll('.tt-ln small')].map(x=>x.innerText)}));
 ok('Login do tablet entra direto no modo parede, com TODAS as linhas e sem botão de sair', e0.v==='mantotem'&&!e0.x&&e0.ln.length===3, 'linhas: '+e0.ln.join(', '));
 await espera(q,()=>__T.S().tt.fase==='maquina',15000); const t1=await q.evaluate(()=>document.querySelector('.tt').innerText);
 ok('Ana (Linha 1) vê só as máquinas da linha dela, com a opção "É em outra linha"', /Olá, Ana Souza/.test(t1)&&/Misturador/.test(t1)&&!/Compressor|Envasadora/.test(t1)&&/É em outra linha/.test(t1), t1.replace(/\n/g,' | ').slice(0,180));
 await q.click('[data-act="tt-outra"]'); await H.dorme(300); const t2=await q.evaluate(()=>document.querySelector('.tt').innerText);
 await q.click('[data-act="tt-eq"][data-id="eqcmp"]'); await q.click('[data-act="tt-def"][data-v="Vazamento"]'); await q.click('[data-act="tt-def-ok"]'); await q.click('[data-act="tt-imp"][data-v="parou"]');
 await espera(q,()=>__T.S().tt.fase==='ok',6000); banco=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv')));
 const ch=Object.values(banco.docs).find(x=>x&&x.origem==='tablet');
 ok('"É em outra linha" mostra todas; chamado aberto na Linha 2 no nome da Ana, com parada', /Compressor/.test(t2)&&/Envasadora/.test(t2)&&ch&&ch.linha==='Linha 2'&&ch.equipId==='eqcmp'&&ch.nome==='Ana Souza'&&!!ch.paradaId, ch&&`OS ${ch.numero} · ${ch.linha} · ${ch.equip} · ${ch.nome}`);
 const tent=[]; for(const v of ['manch','manmon','programacao','silos','ajustes']){ await q.evaluate(v=>__T.go(v),v); await H.dorme(150); tent.push(v+'→'+await q.evaluate(()=>__T.S().view)); }
 ok('O tablet não abre nenhuma outra tela', tent.every(x=>x.endsWith('→mantotem')), tent.join(' '));
 await T.browser.close();
 T=await tablet(DIR+'/pedro.y4m'); q=T.page; await espera(q,()=>window.__T&&__T.S().tt.fase==='tecnico',15000);
 await q.click(`[data-act="tt-cheguei"][data-n="${ch.numero}"]`); await espera(q,()=>__T.S().tt.fase==='espera',6000); await H.dorme(400);
 banco=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv'))); const ch2=Object.values(banco.docs).find(x=>x&&x.numero===ch.numero);
 ok('Técnico registra "cheguei" pelo crachá usando a conta do tablet', ch2.status==='Em execução'&&ch2.exec.tecnico==='Pedro Técnico', ch2.status+' · '+ch2.exec.tecnico);
 await T.browser.close();
 // ---- login da manutenção ----
 B=await H.abrir(); p=B.page; await H.preparar(p,banco); await p.goto(H.BASE+'?area=manutencao'); await H.dorme(800);
 const tl=await p.evaluate(()=>(document.getElementById('lg')||{}).innerText||''); await H.entrar(p,'tecnico','tec123'); await H.dorme(2000);
 const em=await p.evaluate(()=>({v:__T.S().view,nav:document.getElementById('navlist').innerText}));
 await p.evaluate(()=>__T.go('manch')); await H.dorme(400); const vê=/OS 0000/.test(await p.evaluate(()=>document.getElementById('view').innerText));
 ok('Login da manutenção (?area=manutencao): tela de entrada da manutenção, entra no painel dela e vê o chamado do tablet', /anuten/i.test(tl)&&/^man/.test(em.v)&&vê, `tela=${em.v} · menu=${em.nav.replace(/\n/g,'|')}`);
 const card=await p.evaluate(()=>{ try{ return eqLinkDe; }catch(e){ return null; } });
 await B.browser.close();
 console.log('erros:',[...B.erros].filter(x=>!/404/.test(x))); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
