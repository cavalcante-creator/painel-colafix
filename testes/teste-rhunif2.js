/* Pedido de 29/10: Uniformes — preço das peças e desconto pelo RH, relatório de quem pegou (Excel/PDF) e a tela do Marcelo. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,400):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const hj=new Date(), iso=new Date(hj.getTime()-hj.getTimezoneOffset()*6e4).toISOString().slice(0,10), em=new Date().toISOString();
 d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Stefani RH'}; D['perfis/uRH']={nome:'Stefani RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 D['rh/config']={setores:['Manutenção','Linha 1']};
 D['rh/dados/funcionarios/f1']={nome:'CARLOS RANNAN DA SILVA',setor:'Manutenção',funcao:'Mecânico',status:'Ativo',tipo:'CLT',empresa:'COLAFIX'};
 D['rh/dados/uniformes/u1']={nome:'Carlos Rannan da Silva',fid:'f1',setor:'Manutenção',data:iso,per:'Manhã',itens:[{t:'Camiseta',tam:'GG',qtd:2},{t:'Calça',tam:'44',qtd:1}],sol:'10102',obs:'',em,por:'uDONA',porNome:'Iasmyn',st:'novo'};
 D['rh/dados/uniformes/u2']={nome:'Carla Souza',fid:'',setor:'Linha 1',data:iso,per:'Tarde',itens:[{t:'Camiseta',tam:'M',qtd:1}],sol:'',obs:'',em,por:'uDONA',porNome:'Iasmyn',st:'novo'};
 const erros=[]; let B=await H.abrir({viewport:{width:1440,height:950}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message));
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3500);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 const txt=s=>p.evaluate(s=>(document.querySelector(s)||{}).innerText||'',s);
 await p.evaluate(()=>__T.go('rhunif')); await H.dorme(1500);
 let t=await txt('.rhu-l'); ok('RH: sem preço cadastrado, o desconto pede os preços', /sem preço/.test(t)&&/cadastre o preço das peças/.test(t), t.replace(/\n/g,' | ').slice(0,300));
 await p.click('[data-act="rhu-prab"]'); await H.dorme(500);
 await p.fill('[data-rhu-pr="Camiseta"]','25,50'); await p.fill('[data-rhu-pr="Calça"]','40'); await p.click('[data-act="rhu-prok"]'); await H.dorme(900);
 const pr=((await srv())['rh/config']||{}).unifPrecos||{};
 ok('Preços guardados em rh/config.unifPrecos', pr.camiseta&&pr.camiseta.v===25.5&&pr.calca&&pr.calca.v===40, JSON.stringify(pr).slice(0,200));
 t=await txt('.rhu-l'); ok('Desconto calculado: Carlos 2×25,50 + 40 = R$ 91,00; Carla R$ 25,50', /R\$\s?91,00/.test(t)&&/R\$\s?25,50/.test(t), t.replace(/\n/g,' | ').slice(0,400));
 // Carla: não descontar
 await p.click('[data-act="rhu-dnao"][data-id="u2"]'); await H.dorme(700);
 ok('"Não descontar" grava na entrega', ((await srv())['rh/dados/uniformes/u2'].desc||{}).nao===true);
 // Carlos: valor do RH
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-act="rhu-ded"]')].find(x=>x.dataset.id==='u1'); b&&b.click(); }); await H.dorme(400);
 await p.fill('#rhu-dv','80,00'); await p.click('[data-act="rhu-dok"]'); await H.dorme(700);
 ok('Valor mudado pelo RH (R$ 80,00) grava na entrega', ((await srv())['rh/dados/uniformes/u1'].desc||{}).v===80);
 // relatório
 await p.click('[data-act="rhu-st"][data-v="rel"]'); await H.dorme(700);
 t=await txt('.rhu-rel'); const kk=await p.evaluate(()=>[...document.querySelectorAll('.rhu-rk > div')].map(d=>d.querySelector('span').innerText.trim().toUpperCase()+'='+d.querySelector('b').innerText.trim()).join(' · '));
 ok('Relatório: 2 pessoas, 2 entregas, 4 peças, R$ 80,00 de desconto, peças por pessoa', /PESSOAS=2/.test(kk)&&/ENTREGAS=2/.test(kk)&&/PEÇAS=4/.test(kk)&&/DESCONTO NO PERÍODO=R\$\s?80,00/.test(kk)&&/2× Camiseta GG/.test(t)&&/1× Calça 44/.test(t), kk);
 await p.click('[data-act="rhu-pdesc"][data-v="sim"][data-k="'+'carla souza'+'"]'); await H.dorme(800);
 t=await txt('.rhu-rel'); ok('Relatório: "Sim" na Carla volta a descontar (R$ 80,00 + R$ 25,50 = R$ 105,50)', /R\$\s?105,50/.test(t)&&!((await srv())['rh/dados/uniformes/u2'].desc), t.replace(/\n/g,' | ').slice(0,300));
 await p.click('[data-act="rhu-pdesc"][data-v="nao"][data-k="f1"]'); await H.dorme(800);
 ok('Relatório: "Não" no Carlos marca as entregas dele como não descontadas', ((await srv())['rh/dados/uniformes/u1'].desc||{}).nao===true);
 await p.click('[data-act="rhu-pdesc"][data-v="sim"][data-k="f1"]'); await H.dorme(800);
 ok('"Sim" de novo no Carlos mantém o valor digitado pelo RH (R$ 80,00)', ((await srv())['rh/dados/uniformes/u1'].desc||{}).v===80&&!((await srv())['rh/dados/uniformes/u1'].desc||{}).nao);
 await p.click('[data-act="rhu-pdesc"][data-v="nao"][data-k="carla souza"]'); await H.dorme(800);
 await p.fill('#rhu-rq','carla'); await H.dorme(900); t=await txt('.rhu-rel'); ok('Busca no relatório filtra a pessoa', /Carla Souza/.test(t)&&!/Carlos Rannan/.test(t), t.replace(/\n/g,' | ').slice(0,200));
 await p.fill('#rhu-rq',''); await H.dorme(800);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(()=>null),p.click('[data-act="rhu-rxls"]')]);
 ok('Excel do relatório baixa', !!dl||!!(await p.evaluate(()=>window.__rhuUltimoXls)), dl?dl.suggestedFilename():await p.evaluate(()=>window.__rhuUltimoXls));
 await p.click('[data-act="rhu-rpdf"]'); await H.dorme(2500);
 const pdfs=await p.evaluate(()=>window.__pdfSalvo||[]); ok('"Baixar PDF" baixa o arquivo no padrão do painel', pdfs.some(n=>/^Uniformes-\d{4}-\d{2}\.pdf$/.test(n)), JSON.stringify(pdfs));
 ok('Sem erros no console (RH)', !erros.length, erros.join(' | ')); await B.browser.close();
 // Marcelo
 B=await H.abrir({viewport:{width:1440,height:950}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4000);
 const vo=await p.evaluate(()=>__T.vo('gxunif')); ok('Marcelo pode abrir Uniformes (Visão do gestor)', vo===true, String(vo));
 await p.evaluate(()=>__T.go('gxunif')); await H.dorme(1500);
 const tv=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Marcelo vê quem pegou o quê, sem desconto', /Uniformes entregues/.test(tv)&&/Carlos Rannan da Silva/.test(tv)&&/Carla Souza/.test(tv)&&!/Desconto|R\$/.test(tv), tv.replace(/\n/g,' | ').slice(0,400));
 const ab=await p.evaluate(()=>[...document.querySelectorAll('#view [data-go], #view .gxg-tab, #view button')].map(b=>b.innerText.trim()).filter(Boolean).join(' | '));
 ok('Aba "Uniformes" no grupo Pessoas do Marcelo', /Uniformes/.test(ab), ab.slice(0,300));
 await p.click('[data-act="rhu-rpdf"]'); await H.dorme(2500);
 const pm=await p.evaluate(()=>window.__pdfSalvo||[]); ok('Marcelo: "Baixar PDF" funciona', pm.some(n=>/^Uniformes-\d{4}-\d{2}\.pdf$/.test(n)), JSON.stringify(pm));
 await p.click('[data-act="rhu-rper"][data-v="tudo"]'); await H.dorme(600); ok('Marcelo: trocar o período funciona', /PESSOAS/i.test(await p.evaluate(()=>document.querySelector('.rhu-rk').innerText))&&await p.evaluate(()=>document.querySelector('[data-act="rhu-rper"][data-v="tudo"]').getAttribute('aria-pressed'))==='true');
 ok('Sem erros no console (Marcelo)', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
