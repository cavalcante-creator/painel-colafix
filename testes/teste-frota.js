/* Frota (11/11/2026): o sistema da frota dentro do painel. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'), os=require('os'), path=require('path');
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['fernando@painel-colafix.app']={uid:'uFER',pass:'fer123',nome:'Fernando Teste'}; D['perfis/uFER']={nome:'Fernando Teste',usuario:'fernando'}; D['acessos/uFER']={perfil:'outro',mods:['frota'],locais:[],ativo:true};
 /* backup do sistema antigo (formato do botão "Baixar backup"), com usuário e senha que NÃO podem entrar */
 const bk={sistema:'frota-system',origem:'servidor',geradoEm:'2026-11-10T10:00:00.000Z',dados:{
  'frota-caminhoes':[{id:1,placa:'AAA-1111',modelo:'Caminhão Teste A',kmAtual:'100000',status:'Ativo',localConsumo:'COLAFIX',media:'?'},{id:2,placa:'BBB-2222',modelo:'Trator Teste',kmAtual:'5000',status:'Manutencao',localConsumo:'FIXCOL'}],
  'frota-motoristas':[{id:11,nome:'Motorista Um',matricula:'001',status:'Ativo'}],
  'frota-abastecedores':[{id:21,nome:'Abastecedor Um',status:'Ativo'}],
  'frota-compras':[{id:31,data:'2026-11-01',litrosCaminhoes:3000,litrosTratores:1000,observacao:'Carga'}],
  'frota-abastecimentos':[{id:41,motorista:'Motorista Um',placa:'AAA-1111',kmCaminhao:'100000',abastecedor:'Abastecedor Um',data:'2026-11-02',hora:'08:00',litros:'100',tipoUso:'Caminhao',turno:'Manha',totalizador:'1000',requisicao:'5',caminhaoId:1,motoristaId:11,abastecedorId:21},
    {id:42,motorista:'Motorista Um',placa:'AAA-1111',kmCaminhao:'100300',abastecedor:'Abastecedor Um',data:'2026-11-05',hora:'09:00',litros:'100',tipoUso:'Caminhao',turno:'Manha',totalizador:'1100',requisicao:'6'},
    {id:43,motorista:'Motorista Um',placa:'BBB-2222',kmCaminhao:'5000',abastecedor:'Abastecedor Um',data:'2026-11-05',hora:'10:00',litros:'50,5',tipoUso:'Trator/Outro',turno:'Manha',totalizador:'1150',requisicao:'7'}],
  'frota-manutencoes':[{id:51,caminhaoId:2,caminhao:'BBB-2222 - Trator Teste',km:'5000',servico:'Troca de oleo, Filtro',observacao:'-',data:'2026-11-03'}],
  'frota-usuarios':[{id:1,usuario:'admin',senha:'123',nome:'Administrador',perfil:'Administrador'}]}};
 const arq=path.join(os.tmpdir(),'backup-frota-teste.json'); fs.writeFileSync(arq,JSON.stringify(bk));
 let B=await H.abrir({viewport:{width:1440,height:900}}); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'fernando','fer123'); await H.dorme(3500);
 const menu=await p.evaluate(()=>document.getElementById('navlist').innerText+' | '+document.getElementById('view').innerText.slice(0,200));
 ok('Fernando (só o módulo Frota) entra e vê a Frota', /Frota/.test(menu), menu.replace(/\n/g,' '));
 await p.evaluate(()=>__T.go('frotacad')); await H.dorme(800); await p.click('[data-act="fr-cad"][data-v="imp"]'); await H.dorme(400);
 await p.setInputFiles('#fr-impf',arq); await H.dorme(800);
 let s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Prévia do backup: 2 caminhões, 3 abastecimentos e os usuários com senha ficam de fora', /Caminhões\s+2\s+2/.test(s)&&/Abastecimentos\s+3\s+3/.test(s)&&/1 usuários do sistema antigo ficaram de fora/.test(s), (s.match(/O QUÊ[\s\S]{0,400}/)||[s.slice(0,300)])[0].replace(/\n/g,' | '));
 await p.click('[data-act="fr-imp-ok"]'); await H.dorme(1500);
 let ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const fr=k=>Object.entries(ds).filter(([x])=>x.startsWith('frota/dados/'+k+'/'));
 ok('Gravou no painel com id "i<id antigo>" e sem senha', fr('caminhoes').length===2&&fr('abastecimentos').length===3&&ds['frota/dados/abastecimentos/i41']&&ds['frota/dados/abastecimentos/i41'].caminhaoId==='i1'&&!Object.keys(ds).some(k=>k.startsWith('frota/dados/usuarios'))&&!JSON.stringify(fr('caminhoes')).includes('senha'), Object.keys(ds).filter(k=>k.startsWith('frota')).join(','));
 await p.setInputFiles('#fr-impf',arq); await H.dorme(800); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Trazer de novo: tudo "já estava" (não repete)', /Caminhões\s+2\s+0\s+2/.test(s), (s.match(/O QUÊ[\s\S]{0,200}/)||[''])[0].replace(/\n/g,' | ')); await p.click('[data-act="fr-imp-x"]');
 await p.evaluate(()=>__T.go('frota')); await H.dorme(800); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Painel: saldo COLAFIX 2.800 L, FIXCOL 949,5 L e total 3.749,5 L', /Saldo COLAFIX\s*2\.800 L/.test(s)&&/Saldo FIXCOL\s*949,5 L/.test(s)&&/3\.749,5\s*L/.test(s), s.slice(0,400).replace(/\n/g,' | '));
 ok('Painel: média do AAA-1111 = 300 km ÷ 100 L = 3,00 km/L', /3,00 km\/L/.test(s), (s.match(/MÉDIA[\s\S]{0,120}/)||[''])[0].replace(/\n/g,' '));
 /* novo abastecimento */
 await p.evaluate(()=>__T.go('frotaabs')); await H.dorme(800); 
 await p.selectOption('[data-fr="fa.caminhaoId"]','i1'); await H.dorme(400);
 const km=await p.inputValue('[data-fr="fa.kmCaminhao"]'); ok('Escolher o caminhão sugere o último km (100300)', km==='100300', km);
 await p.selectOption('[data-fr="fa.motoristaId"]','i11'); await p.selectOption('[data-fr="fa.abastecedorId"]','i21'); await H.dorme(300);
 await p.fill('[data-fr="fa.kmCaminhao"]','100700'); await p.fill('[data-fr="fa.litros"]','200,5'); await p.fill('[data-fr="fa.requisicao"]','8'); await p.fill('[data-fr="fa.totalizador"]','900');
 await p.click('[data-act="fr-abs-ok"]'); await H.dorme(800); ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 ok('Totalizador menor que o último (1150) é recusado', fr('abastecimentos').length===3);
 await p.fill('[data-fr="fa.totalizador"]','1350'); await p.click('[data-act="fr-abs-ok"]'); await H.dorme(1200); ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 const novo=fr('abastecimentos').map(x=>x[1]).find(x=>!x.imp);
 ok('Registra o abastecimento: AAA-1111, 200,5 L, COLAFIX, motorista e quem lançou', novo&&novo.placa==='AAA-1111'&&novo.litros===200.5&&novo.tipoUso==='Caminhao'&&novo.motorista==='Motorista Um'&&novo.porNome==='Fernando Teste', JSON.stringify(novo));
 /* tanque */
 await p.evaluate(()=>__T.go('frotatq')); await H.dorme(800); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tanque: saldo COLAFIX 2.599,5 L e extrato com o abastecimento', /Saldo COLAFIX\s*2\.599,5 L/.test(s)&&/Saída · abastecimento/.test(s), s.slice(0,300).replace(/\n/g,' | '));
 await p.fill('[data-fr="fc.litrosCaminhoes"]','5000'); await p.click('[data-act="fr-cp-ok"]'); await H.dorme(700); ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 ok('Compra que passa dos 8.000 L do tanque é recusada', fr('compras').length===1);
 await p.fill('[data-fr="fc.litrosCaminhoes"]','4000'); await p.fill('[data-fr="fc.observacao"]','Nota 123'); await p.click('[data-act="fr-cp-ok"]'); await H.dorme(900); ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 ok('Compra de 4.000 L lançada', fr('compras').length===2&&fr('compras').some(([,x])=>x.litrosCaminhoes===4000&&x.observacao==='Nota 123'));
 /* caminhão */
 await p.evaluate(()=>__T.go('frotacam')); await H.dorme(700); await p.fill('[data-fr="fk.placa"]','xx1'); await p.fill('[data-fr="fk.modelo"]','Novo'); await p.click('[data-act="fr-cam-ok"]'); await H.dorme(500);
 ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); ok('Placa inválida é recusada', fr('caminhoes').length===2);
 await p.fill('[data-fr="fk.placa"]','cdd1e23'); await p.click('[data-act="fr-cam-ok"]'); await H.dorme(900); ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
 ok('Caminhão CDD1E23 (placa Mercosul) cadastrado', fr('caminhoes').some(([,x])=>x.placa==='CDD1E23'));
 s=await p.evaluate(()=>document.getElementById('view').innerText); ok('Lista mostra a média e o km atual vindos dos abastecimentos (100.700)', /100\.700/.test(s)&&/km\/L/.test(s));
 /* manutenção */
 await p.evaluate(()=>__T.go('frotaman')); await H.dorme(700); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Manutenção importada aparece com os serviços separados', /Troca de óleo/.test(s)&&/Filtro/.test(s));
 await p.selectOption('[data-fr="fm.caminhaoId"]','i1'); await p.fill('[data-fr="fm.km"]','100700'); await p.click('[data-act="fr-man-sv"][data-v="Pneus"]'); await H.dorme(200); await p.click('[data-act="fr-man-ok"]'); await H.dorme(900);
 ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const mn=fr('manutencoes').map(x=>x[1]).find(x=>!x.imp);
 ok('Manutenção registrada com Troca de óleo e Pneus', mn&&mn.servicos.join(',')==='Troca de oleo,Pneus'&&mn.caminhao.startsWith('AAA-1111'), JSON.stringify(mn));
 /* relatórios */
 await p.evaluate(()=>{ __frota.rel.per='tudo'; __T.go('frotarel'); }); await H.dorme(800); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Relatório (tudo): abastecido 451 L em 4 abastecimentos e diesel comprado 8.000 L', /abastecido\s*451 L/i.test(s)&&/4 abastecimentos/.test(s)&&/8\.000 L/.test(s), s.slice(0,500).replace(/\n/g,' | '));
 await p.click('[data-act="fr-rel-tipo"][data-v="veic"]'); await H.dorme(400); s=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Consumo por veículo: AAA-1111 com 700 km rodados', /AAA-1111[\s\S]{0,80}700/.test(s), (s.match(/AAA-1111[\s\S]{0,120}/)||[''])[0].replace(/\n/g,' '));
 /* apagar */
 await p.evaluate(()=>__T.go('frotaabs')); await H.dorme(600); await p.click('[data-act="fr-del"][data-v="abastecimentos:i43"]'); await H.dorme(200); await p.click('[data-act="fr-del"][data-v="abastecimentos:i43"]'); await H.dorme(800);
 ds=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); ok('Apagar (dois toques) marca o abastecimento como removido', ds['frota/dados/abastecimentos/i43'].removido===true);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close();
 const rg=fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8');
 ok('Regras: frota fora da regra geral e com frotaOk()', /'horaextra', 'frota'\]/.test(rg)&&/match \/frota\/\{resto=\*\*\}/.test(rg)&&/function frotaOk/.test(rg));
 const bkp=fs.readFileSync(path.join(__dirname,'..','modulos','backup.js'),'utf8'); ok('Cópia de segurança inclui frota/dados', /'frota\/dados':\['caminhoes'/.test(bkp));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
