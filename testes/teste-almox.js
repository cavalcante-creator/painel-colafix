const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const ord=(num,linha,data,rancho)=>({num,produto:'AC3001 - ARGAMASSA AC3 20KG',linha,data,turno:'Dia todo',total:100,status:'aberta',criadaEm:'2026-10-01T10:00:00.000Z',rancho});
(async()=>{ const base=()=>{ const {d}=seedManut(); const D=d.docs; delete D['ordens/5001']; delete D['ordens/5002'];
   D['ordens/7001']=ord('7001','Linha 1','2026-10-05'); D['ordens/7002']=ord('7002','Linha 1','2026-10-06','777001'); D['ordens/7003']=ord('7003','Linha 2','2026-10-07','777003');
   D['ordens/7004']=ord('7004','Linha 1','2026-10-13'); D['ordens/7005']=ord('7005','Linha 2','2026-10-09');
   d.users['almox@painel-colafix.app']={uid:'uALX',pass:'alx123',nome:'Joana'}; D['perfis/uALX']={nome:'Joana',usuario:'almox'}; D['acessos/uALX']={perfil:'outro',mods:['almox','producao'],locais:['a3'],contar:true,ativo:true};
   return d; };
 const abrir=async(quando,usuario,senha,url)=>{ const B=await H.abrir(); await B.ctx.clock.setFixedTime(new Date(quando)); await H.preparar(B.page,base()); await B.page.goto(H.BASE+(url||'')); if(url){ await B.page.waitForSelector('#rr-ent',{timeout:8000}); await B.page.click('#rr-ent'); } await H.entrar(B.page,usuario,senha); await H.dorme(2800); return B; };
 const ver=p=>p.evaluate(()=>{ __T.go('diario'); return 1; }).then(()=>H.dorme(500)).then(()=>p.evaluate(()=>({t:document.getElementById('view').innerText,dia:__T.S().dbo.dia,ban:(document.querySelector('.db-ent')||{}).innerText||''})));
 const tem=(t,n)=>new RegExp('\\b'+n+'\\b').test(t);
 // segunda 05/10
 let B=await abrir('2026-10-05T10:00:00','almox','alx123'); let r=await ver(B.page);
 ok('Segunda: "Hoje" do almox mostra as ordens de terça (e as de hoje), não as de quarta', tem(r.t,'7002')&&tem(r.t,'7001')&&!tem(r.t,'7003')&&/ordens de produção de terça, 06\/10/.test(r.ban), r.ban);
 const nav=await B.page.evaluate(()=>({nav:document.getElementById('navlist').innerText.replace(/\n/g,'|'),man:['manch','manmon','manequip'].filter(v=>__T.vo(v))}));
 ok('Almoxarifado com Produção não vê nenhuma tela da Manutenção', nav.man.length===0&&!/Manutenção/.test(nav.nav), JSON.stringify(nav));
 await B.page.click('[data-act="db-entrega"]'); await H.dorme(300); r=await B.page.evaluate(()=>({t:document.getElementById('view').innerText}));
 ok('Botão "Ver pelo dia da produção" troca para a produção de hoje', tem(r.t,'7001')&&!tem(r.t,'7002'));
 await B.browser.close();
 // sexta 09/10 (segunda 12/10 é feriado)
 B=await abrir('2026-10-09T10:00:00','almox','alx123'); r=await ver(B.page);
 ok('Sexta: pula sábado, domingo e o feriado de 12/10 → mostra as ordens de terça 13/10', tem(r.t,'7004')&&/terça, 13\/10/.test(r.ban), r.ban);
 await B.browser.close();
 // produção continua pelo dia da produção
 B=await abrir('2026-10-05T10:00:00','operador','ope123'); r=await ver(B.page); const manOp=await B.page.evaluate(()=>__T.vo('manch'));
 ok('Produção continua vendo pelo dia da produção (e segue com Chamados)', tem(r.t,'7001')&&!tem(r.t,'7002')&&/Dia da produção/.test(r.ban)&&manOp, r.ban);
 await B.browser.close();
 // QR da folha (logado no almox): rancho de quarta abre na entrega de terça
 B=await abrir('2026-10-05T10:00:00','almox','alx123','?rancho=777003'); await H.dorme(2500);
 r=await B.page.evaluate(()=>({v:__T.S().view,dia:__T.S().dbo.dia,t:document.getElementById('view').innerText}));
 ok('QR da folha do rancho (logado): abre o diário no dia da entrega certo (terça, véspera da quarta)', r.v==='diario'&&r.dia==='2026-10-06'&&tem(r.t,'7003'), r.v+' · dia '+r.dia);
 // coletor RA- também
 await B.page.evaluate(()=>{ __T.S().dbo.dia='2026-10-05'; }); await B.page.keyboard.type('RA-777001',{delay:6}); await B.page.keyboard.press('Enter'); await H.dorme(700);
 r=await B.page.evaluate(()=>({dia:__T.S().dbo.dia,t:document.getElementById('view').innerText}));
 ok('Coletor RA- (folha de terça) abre na entrega de hoje', r.dia==='2026-10-05'&&tem(r.t,'7002'), 'dia '+r.dia);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
