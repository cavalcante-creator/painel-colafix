/* Pedido de 29/10: Itens de manutenção — lista do sistema, Marcelo cria/corrige/marca repetido, administradora cadastra,
   oficina escolhe da lista ao pedir peça. Dados inventados no formato do relatório RITE0250 do Focco. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const LINHAS=['Focco3i RITE0250','Relatório de Itens Data: 29/10/2026 10:51:30','Pág.: 001 de 104','Class. do Item..: 10.400.013 - MATERIAIS DE MANUTENCAO','Descrição Técnica do Item Código do',
 'ROLAMENTO NP0082','ROLAMENTO NP0083','ROLAMENTO 6205 2RS NP0100','CORREIA A-42 NP0200','ABRACADEIRA GALVANIZADA','(C) 3/4 NP3447','PARAFUSO SEXTAVADO 8.8 M10X40 NP0300','PARAFUSO SEXTAVADO 8.8 M10X40 NP0301','Pág.: 002 de 104','LUVA NITRILICA G TE0010'];
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['marcelo@painel-colafix.app']={uid:'uMAR',pass:'mar123',nome:'Marcelo Souza'}; D['perfis/uMAR']={nome:'Marcelo Souza',usuario:'marcelo'}; D['acessos/uMAR']={perfil:'gestor',mods:['gestor','producao'],locais:[],ativo:true};
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',area:'Mecânica',ativo:true,adesivo:'777888',criadoEm:new Date().toISOString()};
 d.users['oficina@painel-colafix.app']={uid:'uOF',pass:'of1234',nome:'Oficina'}; D['perfis/uOF']={nome:'Computador da manutenção',usuario:'oficina'}; D['acessos/uOF']={perfil:'oficina',mods:['tablet'],locais:[],ativo:true};
 const erros=[]; let B=await H.abrir({viewport:{width:1440,height:950}}); let p=B.page; p.on('pageerror',e=>erros.push(e.message)); p.on('dialog',x=>x.accept()); await H.preparar(p,d);
 await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4000);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['config/manitens']||{});
 const lidos=await p.evaluate(L=>Painel.itens.lePdfLinhas(L),LINHAS);
 ok('Lê o relatório do Focco: 8 itens, junta a descrição quebrada em 2 linhas e ignora os cabeçalhos', lidos.length===8&&lidos.some(x=>x.c==='NP3447'&&x.d==='ABRACADEIRA GALVANIZADA (C) 3/4')&&lidos.some(x=>x.c==='TE0010'), JSON.stringify(lidos));
 await p.evaluate(()=>__T.go('gxitens')); await H.dorme(1200);
 ok('Marcelo: aba "Itens" no grupo Manutenção', await p.evaluate(()=>[...document.querySelectorAll('.gxg-tabs .gxg-tb')].some(b=>/Itens/.test(b.innerText))));
 await p.evaluate(L=>Painel.itens.importaLidos(L,'itens.pdf'),lidos); await H.dorme(1200);
 let s=await srv(); ok('Importou os 8 itens como "No sistema"', (s.itens||[]).length===8&&s.itens.every(x=>x.st==='ok'), (s.itens||[]).length);
 const kp=await p.evaluate(()=>[...document.querySelectorAll('.mi-kp > div')].map(x=>x.innerText.replace(/\s+/g,' ')).join(' | '));
 ok('Números: 8 no sistema, 2 com descrição incompleta, 4 com a mesma descrição', /No sistema 8/i.test(kp)&&/incompleta 2/i.test(kp)&&/Mesma descrição 4/i.test(kp), kp);
 // incorreto -> item certo para cadastrar
 await p.click('[data-act="mi-tab"][data-v="curta"]'); await H.dorme(500);
 const id82=await p.evaluate(()=>Painel.itens.itens().find(x=>x.c==='NP0082').id);
 await p.click(`[data-act="mi-inc"][data-id="${id82}"]`); await H.dorme(500);
 await p.fill('#mi-med','6206 ZZ'); await p.fill('#mi-marca','skf'); await p.dispatchEvent('#mi-marca','input'); await H.dorme(300);
 const pv=await p.evaluate(()=>document.getElementById('mi-pvd').innerText); ok('Monta a descrição no padrão do sistema', pv==='ROLAMENTO 6206 ZZ SKF', pv);
 await p.click('[data-act="mi-salvar"]'); await H.dorme(1000); s=await srv();
 const novo=s.itens.find(x=>x.d==='ROLAMENTO 6206 ZZ SKF'), velho=s.itens.find(x=>x.c==='NP0082');
 ok('"Está incorreto": o antigo sai de uso e o certo fica "Para cadastrar"', novo&&novo.st==='cad'&&novo.de===velho.id&&velho.st==='inc'&&velho.para===novo.id, JSON.stringify({novo,velho}).slice(0,250));
 // repetido
 const id301=await p.evaluate(()=>Painel.itens.itens().find(x=>x.c==='NP0301').id), id300=await p.evaluate(()=>Painel.itens.itens().find(x=>x.c==='NP0300').id);
 await p.click('[data-act="mi-tab"][data-v="rep"]'); await H.dorme(500); await p.click(`[data-act="mi-rep"][data-id="${id301}"]`); await H.dorme(500);
 await p.click(`[data-act="mi-rpick"][data-id="${id300}"]`); await H.dorme(300); await p.click('[data-act="mi-rok"]'); await H.dorme(900); s=await srv();
 ok('"É repetido": aponta o item certo e sai da lista de escolha', s.itens.find(x=>x.c==='NP0301').st==='rep'&&s.itens.find(x=>x.c==='NP0301').para===id300);
 // novo item com descrição igual a um existente é recusado
 await p.click('[data-act="mi-novo"]'); await H.dorme(400); await p.fill('#mi-oq','correia'); await p.fill('#mi-med','a-42'); await p.dispatchEvent('#mi-med','input'); await H.dorme(300);
 const par=await p.evaluate(()=>document.getElementById('mi-par').innerText); ok('Novo item mostra os parecidos que já existem', /CORREIA A-42/.test(par), par);
 await p.click('[data-act="mi-salvar"]'); await H.dorme(700); ok('Não deixa criar item repetido', (await srv()).itens.filter(x=>/CORREIA A-42/.test(x.d)).length===1);
 await p.click('[data-act="mi-fx"]'); await H.dorme(300);
 ok('Tela do Marcelo: "Lista na oficina" começa desligada', await p.evaluate(()=>{ const b=document.querySelector('[data-act="mi-ofc"][data-v="0"]'); return b&&b.getAttribute('aria-pressed')==='true'; }));
 await p.click('[data-act="mi-ofc"][data-v="1"]'); await H.dorme(900); ok('Marcelo liga a lista na oficina', (await srv()).oficina===true);
 await p.click('[data-act="mi-ofc"][data-v="0"]'); await H.dorme(900); ok('…e desliga', (await srv()).oficina===false);
 // ativo / inativo
 const id200=await p.evaluate(()=>Painel.itens.itens().find(x=>x.c==='NP0200').id);
 await p.click('[data-act="mi-tab"][data-v="todos"]'); await H.dorme(400); await p.click(`[data-act="mi-ina"][data-id="${id200}"]`); await H.dorme(900);
 ok('Inativar um item', (await srv()).itens.find(x=>x.c==='NP0200').ina===true);
 await p.click(`[data-act="mi-ina"][data-id="${id200}"]`); await H.dorme(900); ok('Ativar de novo', !(await srv()).itens.find(x=>x.c==='NP0200').ina);
 await p.fill('#mi-q','parafuso'); await H.dorme(900);
 const bt=await p.evaluate(()=>(document.querySelector('[data-act="mi-inatodos"]')||{}).innerText||''); ok('Botão "Inativar todos do filtro" com a quantidade', /Inativar todos do filtro \(1\)/.test(bt), bt);
 await p.click('[data-act="mi-inatodos"]'); await H.dorme(1000); s=await srv();
 ok('Inativa todos do filtro (só os "no sistema" ativos do filtro)', s.itens.filter(x=>/PARAFUSO/.test(x.d)&&x.st==='ok').every(x=>x.ina)&&!s.itens.find(x=>x.c==='NP0200').ina);
 await p.click('[data-act="mi-at"][data-v="inativos"]'); await H.dorme(600); const ni=await p.evaluate(()=>document.querySelectorAll('.mi-t tbody tr').length); ok('Filtro "Só inativos"', ni===1, ni);
 await p.click('[data-act="mi-atvtodos"]'); await H.dorme(1000); ok('Ativar todos do filtro', (await srv()).itens.every(x=>!x.ina));
 await p.click('[data-act="mi-at"][data-v="todos"]'); await H.dorme(600); await p.click('[data-act="mi-inatodos"]'); await H.dorme(1000); await p.fill('#mi-q',''); await H.dorme(900);
 ok('Marcelo não tem "Cadastrei no sistema" (é da administradora)', !(await p.$('[data-act="mi-caded"]')));
 ok('Sem erros (Marcelo)', !erros.length, erros.join(' | ')); const dados=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
 // administradora cadastra
 B=await H.abrir({viewport:{width:1440,height:950}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,JSON.parse(dados)); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(4000);
 await p.click('#tp-sino'); await H.dorme(500); const sino=await p.evaluate(()=>document.getElementById('tp-pop').innerText); ok('Sino da administradora: "Item para cadastrar no sistema"', /para cadastrar no sistema/i.test(sino), sino.replace(/\n/g,' | ').slice(0,200));
 await p.click('[data-tp="aviso"][data-v="itcad"]'); await H.dorme(1000); ok('O aviso abre a lista "Para cadastrar"', await p.evaluate(()=>__T.S().view==='gxitens'&&__T.S().mi.tab==='cad'));
 await p.click('[data-act="mi-caded"]'); await H.dorme(300); const inp=await p.$('[id^="mi-cod-"]'); await inp.fill('np5200'); await p.click('[data-act="mi-cadok"]'); await H.dorme(1000);
 const s2=await p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs['config/manitens']);
 ok('"Cadastrei no sistema": o novo vira NP5200 e o antigo fica "Substituído"', s2.itens.find(x=>x.c==='NP5200'&&x.st==='ok')&&s2.itens.find(x=>x.c==='NP0082').st==='sub');
 const dados2=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
 // oficina: pedir peça escolhendo da lista
 B=await H.abrir({viewport:{width:1600,height:900}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,JSON.parse(dados2)); await p.goto(H.BASE); await H.entrar(p,'oficina','of1234'); await H.dorme(3500);
 await p.evaluate(()=>{ __T.S().tt.recente={}; }); await p.keyboard.type('777888',{delay:12}); await p.keyboard.press('Enter'); await H.dorme(1100); await p.keyboard.press('4'); await H.dorme(900);
 await p.fill('#of-pt','rolamento 62'); await H.dorme(400);
 ok('Lista desligada (padrão): a oficina pede escrevendo, sem sugestões nem trava', await p.evaluate(()=>!document.getElementById('of-pt').getAttribute('list')&&!document.querySelector('.mi-of')&&!document.querySelector('[data-act="of-peca-ok"]').disabled));
 await p.evaluate(()=>__T.S().db.doc('config/manitens').update({oficina:true})); await H.dorme(1200); await p.fill('#of-pt',''); await p.fill('#of-pt','rolamento 62'); await H.dorme(400);
 ok('Pedir peça: o campo sugere os itens da lista', await p.evaluate(()=>!!document.getElementById('of-pt').getAttribute('list'))); const ops=await p.evaluate(()=>[...document.querySelectorAll('#mi-dl option')].map(o=>o.value));
 ok('Sugestões não mostram item incorreto/repetido', ops.includes('ROLAMENTO 6205 2RS · NP0100')&&ops.includes('ROLAMENTO 6206 ZZ SKF · NP5200')&&!ops.some(v=>/NP0082/.test(v)), JSON.stringify(ops));
 await p.fill('#of-pt','parafuso'); await H.dorme(300); const op2=await p.evaluate(()=>[...document.querySelectorAll('#mi-dl option')].map(o=>o.value)); ok('Item inativo não aparece para pedir', !op2.some(v=>/PARAFUSO/.test(v)), JSON.stringify(op2)); await p.fill('#of-pt','rolamento 62'); await H.dorme(300);
 await p.dispatchEvent('#of-pt','change'); await H.dorme(600);
 ok('Texto fora da lista trava o "Mandar" e pede para escolher', await p.evaluate(()=>{ const b=document.querySelector('[data-act="of-peca-ok"]'); return b&&b.disabled&&/Não achei na lista/.test(document.body.innerText); }));
 await p.fill('#of-pt','ROLAMENTO 6205 2RS · NP0100'); await p.dispatchEvent('#of-pt','change'); await H.dorme(600);
 ok('Escolhido da lista: mostra "Item do sistema NP0100" e libera o Mandar', await p.evaluate(()=>{ const b=document.querySelector('[data-act="of-peca-ok"]'); return b&&!b.disabled&&/Item do sistema NP0100/.test(document.body.innerText); }));
 await p.click('[data-act="ofp-mais"]'); await H.dorme(300); await p.fill('#of-pt1','Graxa especial XYZ'); await p.dispatchEvent('#of-pt1','change'); await H.dorme(500);
 await p.click('[data-act="mi-offora"][data-v="1"]'); await H.dorme(500);
 ok('"Não está na lista" libera e marca para o Marcelo conferir', await p.evaluate(()=>{ const b=document.querySelector('[data-act="of-peca-ok"]'); return b&&!b.disabled&&/Fora da lista/.test(document.body.innerText); }));
 await p.click('[data-act="of-peca-ok"]'); await H.dorme(1500);
 const pp=await p.evaluate(()=>(__T.S().pedpecas||[])[0]); ok('Pedido vai com a descrição completa e o código', pp&&pp.itens[0].t==='ROLAMENTO 6205 2RS · NP0100'&&pp.itens[1].t==='Graxa especial XYZ', JSON.stringify(pp&&pp.itens));
 const dados3=await p.evaluate(()=>localStorage.getItem('__srv')); await B.browser.close();
 // Marcelo troca o item pedido fora da lista pelo item certo
 B=await H.abrir({viewport:{width:1440,height:950}}); p=B.page; p.on('pageerror',e=>erros.push(e.message)); await H.preparar(p,JSON.parse(dados3)); await p.goto(H.BASE); await H.entrar(p,'marcelo','mar123'); await H.dorme(4000);
 await p.evaluate(()=>__T.go('gxpec')); await H.dorme(1500);
 const tg=await p.evaluate(()=>[...document.querySelectorAll('.mi-pc')].map(e=>e.innerText.trim()));
 ok('Pedidos de peça: item da lista mostra o código e o de fora mostra "Trocar pelo item da lista"', tg.some(t=>/item da lista NP0100/.test(t))&&tg.some(t=>/Trocar pelo item da lista/.test(t)), JSON.stringify(tg));
 await p.click('[data-act="mi-trab"]'); await H.dorme(600); await p.fill('#mi-tq','correia'); await H.dorme(900);
 await p.click('[data-act="mi-trpick"]'); await H.dorme(400); await p.click('[data-act="mi-trok"]'); await H.dorme(1200);
 const pd=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('__srv')).docs; const k=Object.keys(d).find(k=>k.startsWith('pedpecas/')&&d[k].itens&&d[k].itens.length===2); return d[k]; });
 ok('Troca grava o item certo, mantém a quantidade e avisa o técnico', pd&&pd.itens[1].t==='CORREIA A-42 · NP0200'&&pd.itens[1].qtd==='1'&&/Troquei "Graxa especial XYZ"/.test(pd.resp[pd.resp.length-1].t)&&/Item trocado/.test(pd.hist[pd.hist.length-1].o), JSON.stringify(pd&&{it:pd.itens,r:pd.resp}).slice(0,300));
 ok('Depois da troca o item aparece com o código', await p.evaluate(()=>[...document.querySelectorAll('.mi-pc')].filter(e=>/NP0200/.test(e.innerText)).length>0));
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(x=>x.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
