/* Plano preventivo (planilha): importar → roteiros agrupados com datas espalhadas → OS com checklist →
   técnico confere no computador de chamados (problema vira chamado, próxima data marcada) → checklist do operador no posto (tecla 5).
   Usa uma planilha pequena montada aqui (mesmas colunas da planilha real). PLANO_XLSX=<arquivo> testa a planilha de verdade (só a leitura).
   Precisa de: npm i --no-save xlsx@0.18.5 */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs');
let XLSX; try{ XLSX=require('xlsx'); }catch(e){ console.log('FALHOU — falta a biblioteca: cd testes && npm i --no-save xlsx@0.18.5'); process.exit(1); }
const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10), hj=loc(new Date());
const addD=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return loc(d); };
const util=d=>{ for(let i=0;i<10;i++){ const w=new Date(d+'T12:00:00').getDay(); if(w!==0&&w!==6) return d; d=addD(d,1); } return d; };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs, t=new Date().toISOString();
 D['config/geral'].linhasOrdem=['Linha 1','Linha 2'];
 D['crachas/ABCD2345']={codigo:'ABCD2345',nome:'Ana Souza',linha:'Linha 1',papel:'operador',ativo:true,adesivo:'000123',criadoEm:t};
 D['crachas/BCDE3456']={codigo:'BCDE3456',nome:'Bruno Lima',linha:'',papel:'tecnico',ativo:true,adesivo:'777888',criadoEm:t};
 d.users['chamados@painel-colafix.app']={uid:'uCH',pass:'ch1234',nome:'Chamados'}; D['perfis/uCH']={nome:'Computador de chamados',usuario:'chamados'}; D['acessos/uCH']={perfil:'chamados',mods:['tablet'],locais:[],ativo:true};
 d.users['posto@painel-colafix.app']={uid:'uPO',pass:'po1234',nome:'Posto'}; D['perfis/uPO']={nome:'Posto',usuario:'posto'}; D['acessos/uPO']={perfil:'posto',mods:['tablet'],locais:[],ativo:true};
 /* planilha no formato da real */
 const H1=['ID','Área','Código do ativo','Ativo','Tarefa','Periodicidade','Frequência (dias)','Responsável','Última execução','Próxima execução','Status','Observações'];
 const L=[['PM-0001','Linha 1','L1-MIS-01','Misturador 1','Verificar folga das pás','Semanal','','Mecânica'],['PM-0002','Linha 1','L1-MIS-01','Misturador 1','Lubrificar mancais','Semanal','','Mecânica'],['PM-0003','Linha 1','L1-ELV-01','Elevador de canecas (Linha 1)','Verificar correia e canecas','Semanal','','Mecânica'],
   ['PM-0004','Linha 1','L1-AUT-01','Painel/CLP (Linha 1)','Reapertar bornes','Mensal','','Elétrica'],['PM-0005','Linha 1','L1-AUT-01','Painel/CLP (Linha 1)','Limpar ventilação do painel','Mensal','','Elétrica'],
   ['PM-0006','Descarga de areia','DSA-ROS-01','Rosca de areia','Verificar desgaste do helicoide','Semanal','','Mecânica'],['PM-0007','Descarga de areia','DSA-ELV-01','Elevador de areia','Verificar alinhamento','Semanal','','Mecânica'],
   ['PM-0008','Linha 2','L2-BAL-01','Balanças (Linha 2)','Aferir células de carga','Trimestral','','Automação',new Date(2026,7,1)],
   ['PM-0009','Linha 1','L1-MIS-01','Misturador 1','Conferir ruído e vazamento','Diária','','Operador'],['PM-0010','Linha 1','L1-ELV-01','Elevador de canecas (Linha 1)','Conferir vazamento de pó','Diária','','Operador'],['PM-0011','Linha 1','L1-VDS-01','Válvula distribuidora','Conferir abertura e fechamento','Diária','','Operador'],
   ['PM-0012','Filtros de manga - Linha 1','L1-FM-01','Filtro de manga 1','Conferir pressão diferencial','Diária','','Operador'],['PM-0013','Descarga de areia','DSA-COM-01','Comportas da moega','Conferir sinal do sensor','Diária','','Operador'],['PM-0014','Linha 2','L2-MIS-01','Misturador (Linha 2)','Conferir ruído','Diária','','Operador']];
 const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([H1,...L]),'Plano'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Área','Código do ativo','Ativo']]),'Ativos');
 const arq='/tmp/teste-plano-preventiva.xlsx'; XLSX.writeFile(wb,arq);
 const lib=fs.readFileSync(require.resolve('xlsx/dist/xlsx.full.min.js'),'utf8'); const erros=[];
 const abre=async(u,s,w)=>{ const B=await H.abrir({viewport:{width:w||1440,height:950}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message)); await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\//,r=>r.fulfill({contentType:'text/javascript',body:lib})); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,u,s); await H.dorme(2800); return {B,p}; };
 const salva=async p=>{ const o=await p.evaluate(()=>{ const S=__T.S(), o={}; (S.chamados||[]).forEach(c=>{ const x=Object.assign({},c); delete x._id; o['chamados/'+c._id]=x; }); return o; }); Object.assign(D,o);
   const pl=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.exists?g.data():null)); if(pl) D['config/manutplano']=pl; };
 /* 1) administradora importa */
 let {B,p}=await abre('iasmyn','senha123');
 await p.evaluate(()=>__T.go('manplano')); await H.dorme(900);
 let tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Tela "Plano preventivo" na Manutenção com "Importar planilha do plano"', /Plano preventivo/.test(tx)&&/Importar planilha do plano/.test(tx), tx.slice(0,160).replace(/\n/g,'|'));
 await p.setInputFiles('[data-pp-arq]',arq); await H.dorme(1800);
 tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Prévia: 14 tarefas, 4 roteiros da manutenção, 6 itens do operador', /Conferir antes de importar/.test(tx)&&/14\s*tarefas lidas/.test(tx)&&/4\s*roteiros da manutenção/.test(tx)&&/6\s*itens do checklist diário do operador/.test(tx), tx.slice(0,700).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/pp-previa.png',fullPage:true});
 await p.click('[data-act="pp-imp-ok"]'); await H.dorme(1500);
 let pl=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.exists?g.data():null));
 const rot=k=>pl&&pl.rot.find(r=>r.area+'|'+r.per+'|'+r.resp===k);
 const rs=rot('Linha 1|Semanal|Mecânica'), re=rot('Linha 1|Mensal|Elétrica'), rd=rot('Descarga de areia|Semanal|Mecânica'), rt=rot('Linha 2|Trimestral|Automação');
 ok('Gravou 4 roteiros com os itens certos (3 + 2 + 2 + 1)', pl&&pl.rot.length===4&&rs&&re&&rd&&rt&&pl.tarefas.filter(x=>x.rot===rs.id).length===3&&pl.tarefas.filter(x=>x.rot===re.id).length===2&&pl.tarefas.filter(x=>!x.rot).length===6, JSON.stringify(pl&&pl.rot.map(r=>[r.area,r.per,r.resp,r.prox])));
 const wk=[rs,rd].map(r=>r.prox), dow=x=>new Date(x+'T12:00:00').getDay();
 ok('Datas espalhadas: semanais em dias úteis diferentes dentro da próxima semana; nada hoje nem no fim de semana', wk[0]!==wk[1]&&wk.every(x=>x>hj&&x<=addD(hj,7)&&dow(x)!==0&&dow(x)!==6)&&dow(re.prox)!==0&&dow(re.prox)!==6&&re.prox>hj, JSON.stringify({wk,men:re.prox}));
 ok('Com "Última execução" (01/08 + 90 dias) a próxima vem da planilha', rt.prox===util('2026-10-30')&&rt.ult==='2026-08-01', rt.prox+' / '+rt.ult);
 tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Lista de roteiros e o checklist do operador de hoje na tela', /Linha 1 · Semanal/.test(tx)&&/Checklist do operador · hoje/.test(tx)&&/0 de 3/.test(tx), tx.slice(0,900).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/pp-plano.png',fullPage:true});
 /* gerar a OS do roteiro semanal da Linha 1 */
 await p.click(`[data-act="pp-gerar"][data-id="${rs.id}"]`); await H.dorme(1800);
 let os=await p.evaluate(id=>{ const c=(__T.S().chamados||[]).find(x=>x.rotId===id); return c&&{n:c.numero,prev:c.prevId,its:(c.chkItens||[]).length,l:c.linha,def:c.defeito}; },rs.id);
 ok('"Gerar OS agora" abre UMA OS com o checklist de 3 itens (preventiva da Linha 1)', os&&os.its===3&&os.prev==='rot-'+rs.id&&os.l==='Linha 1'&&/PREVENTIVA: Linha 1 · Semanal · Mecânica \(3 itens\)/.test(os.def), JSON.stringify(os));
 /* checklist na tela da OS: concluir sem conferir é recusado; marcar itens grava */
 await p.evaluate(n=>{ const b=document.createElement('button'); b.dataset.act='man-abrir'; b.dataset.n=n; b.dataset.ir='1'; document.body.appendChild(b); b.click(); b.remove(); },os.n); await H.dorme(1000);
 tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('A OS mostra o "Checklist da preventiva" com os 3 itens agrupados por máquina', /CHECKLIST DA PREVENTIVA/.test(tx)&&/0 de 3 conferidos/.test(tx)&&/Misturador 1/i.test(tx)&&/Lubrificar mancais/.test(tx), tx.slice(0,500).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/pp-os.png',fullPage:true});
 await p.click('[data-act="man-st"][data-v="Concluída"]'); await H.dorme(800);
 let st=await p.evaluate(n=>__T.S().chamados.find(x=>x.numero===n).status,os.n);
 ok('Concluir com itens sem conferir é recusado', st!=='Concluída', st);
 await p.click(`[data-act="ppk-ok"][data-id="PM-0001"]`); await H.dorme(700);
 let chk=await p.evaluate(n=>__T.S().db.doc('chamados/os-'+String(n).padStart(5,'0')).get().then(g=>g.data().chk),os.n);
 ok('Marcar OK na tela da OS grava no chamado', chk&&chk['PM-0001']&&chk['PM-0001'].s==='ok', JSON.stringify(chk));
 /* roteiro com data de hoje: a OS abre sozinha */
 await p.evaluate(id=>{ __T.go('manplano'); },rd.id); await H.dorme(700);
 await p.evaluate(([id,h])=>{ const i=document.querySelector(`[data-pp-data="${id}"]`); i.value=h; i.dispatchEvent(new Event('change',{bubbles:true})); },[rd.id,hj]); await H.dorme(12000);
 let os2=await p.evaluate(id=>{ const c=(__T.S().chamados||[]).find(x=>x.rotId===id); return c&&{n:c.numero,its:(c.chkItens||[]).length,l:c.linha}; },rd.id);
 ok('Roteiro que vence hoje abre a OS sozinho (Descarga de areia, 2 itens)', os2&&os2.its===2&&os2.l==='Descarga de areia', JSON.stringify(os2));
 /* calendário do gestor mostra os roteiros */
 await p.evaluate(()=>{ __T.S().gx=__T.S().gx||{}; __T.S().gx.cal=null; __T.go('gxcal'); }); await H.dorme(900);
 tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok("Calendário de preventivas mostra os roteiros do plano e a aba do Plano", /Linha 1 · Mensal \(Elétrica\)|Linha 2 · Trimestral|Linha 1 · Semanal/.test(tx)&&/Plano \(roteiros\)/.test(tx), tx.slice(0,600).replace(/\n/g,'|'));
 /* editar, criar e apagar roteiros; editar o checklist do operador; reimportar respeita */
 await p.evaluate(()=>__T.go('manplano')); await H.dorme(700);
 await p.click(`[data-act="ppe-ed"][data-id="${rs.id}"]`); await H.dorme(500);
 await p.fill('[data-ppe-i="0"][data-ppe-k="t"]','Verificar folga das pás e raspadores'); await p.click('[data-act="ppe-x"][data-i="1"]'); await H.dorme(300);
 await p.click('[data-act="ppe-add"]'); await H.dorme(300); await p.fill('[data-ppe-i="2"][data-ppe-k="ativo"]','Ensacadeira 1'); await p.fill('[data-ppe-i="2"][data-ppe-k="t"]','Limpar bico de enchimento'); await p.click('[data-act="ppe-salvar"]'); await H.dorme(1200);
 let pl2=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.data()));
 const its2=id=>pl2.tarefas.filter(t=>t.rot===id).map(t=>t.t);
 ok('Editar roteiro: troca o texto, tira 1 item e acrescenta outro', JSON.stringify(its2(rs.id).sort())===JSON.stringify(['Limpar bico de enchimento','Verificar correia e canecas','Verificar folga das pás e raspadores']), JSON.stringify(its2(rs.id)));
 await p.click('[data-act="ppe-novo"]'); await H.dorme(400); await p.fill('#ppe-area','Pátio'); await p.selectOption('#ppe-per','Mensal'); await p.fill('#ppe-resp','Predial');
 await p.fill('[data-ppe-i="0"][data-ppe-k="ativo"]','Portão'); await p.fill('[data-ppe-i="0"][data-ppe-k="t"]','Lubrificar trilho do portão'); await p.click('[data-act="ppe-salvar"]'); await H.dorme(1200);
 pl2=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.data())); const rn=pl2.rot.find(r=>r.area==='Pátio');
 ok('Novo roteiro "Pátio · Mensal · Predial" com 1 item', rn&&rn.per==='Mensal'&&rn.freq===30&&rn.resp==='Predial'&&its2(rn.id).length===1&&rn.manual, JSON.stringify(rn));
 await p.click(`[data-act="ppe-apagar"][data-id="${re.id}"]`); await H.dorme(300); await p.click(`[data-act="ppe-apagar"][data-id="${re.id}"]`); await H.dorme(1200);
 pl2=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.data()));
 ok('Apagar roteiro (dois toques) tira o roteiro e os itens dele', !pl2.rot.some(r=>r.id===re.id)&&!pl2.tarefas.some(t=>t.rot===re.id)&&(pl2.apagados||[]).includes('PM-0004'), JSON.stringify(pl2.apagados));
 await p.click('[data-act="ppe-op"]'); await H.dorme(400);
 const iOp=await p.evaluate(()=>[...document.querySelectorAll('[data-ppe-k="t"]')].findIndex(e=>/abertura e fechamento/.test(e.value)));
 await p.fill(`[data-ppe-i="${iOp}"][data-ppe-k="t"]`,'Conferir abertura e fechamento da válvula'); await p.click('[data-act="ppe-salvar"]'); await H.dorme(1200);
 pl2=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.data()));
 ok('Editar o checklist do operador (texto de um item)', pl2.tarefas.some(t=>t.id==='PM-0011'&&t.t==='Conferir abertura e fechamento da válvula'&&t.editado&&!t.rot), '');
 await p.setInputFiles('[data-pp-arq]',arq); await H.dorme(1500); await p.click('[data-act="pp-imp-ok"]'); await H.dorme(1500);
 pl2=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.data()));
 ok('Importar a planilha de novo mantém o que foi mexido: apagado não volta, editado e novo ficam', !pl2.rot.some(r=>r.area==='Linha 1'&&r.per==='Mensal')&&pl2.rot.some(r=>r.area==='Pátio')&&its2(rs.id).length===3&&its2(rs.id).includes('Limpar bico de enchimento')&&!pl2.tarefas.some(t=>t.id==='PM-0002')&&pl2.tarefas.some(t=>t.id==='PM-0011'&&/da válvula/.test(t.t))&&pl2.tarefas.filter(t=>t.id==='PM-0011').length===1, JSON.stringify(pl2.rot.map(r=>r.area+'|'+r.per)));
 await p.screenshot({path:'/tmp/pp-edit.png',fullPage:true});
 /* Preventivas do gestor: abas, planejar o dia, tarefa programada abre OS no dia e não entra em Chamados */
 await p.evaluate(()=>{ __T.S().gx.pvTab='cal'; __T.go('gxcal'); }); await H.dorme(800);
 tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('Preventivas tem as abas Calendário · Planejar o dia · Plano (roteiros)', /Calendário/.test(tx)&&/Planejar o dia/.test(tx)&&/Plano \(roteiros\)/.test(tx), tx.slice(0,300).replace(/\n/g,'|'));
 await p.click(`.pp-cdk[data-ppd="${rt.prox}"]`).catch(()=>{}); await H.dorme(700);
 let pv=await p.evaluate(()=>({tab:__T.S().gx.pvTab,dia:__T.S().pp.dia,t:document.getElementById('view').innerText}));
 ok('Tocar no dia do calendário abre "Planejar o dia" com o roteiro daquele dia', pv.tab==='dia'&&/Linha 2 · Trimestral/.test(pv.t)&&/Programar tarefa para/.test(pv.t), JSON.stringify({tab:pv.tab,dia:pv.dia})+' '+pv.t.slice(0,300).replace(/\n/g,'|'));
 await p.click('[data-act="ppg-dia"][data-d="'+hj+'"]').catch(async()=>{ await p.evaluate(h=>{ __T.S().pp.dia=h; __T.render&&__T.render(); },hj); }); await H.dorme(600);
 await p.evaluate(h=>{ __T.S().pp.dia=h; },hj); await p.click('[data-act="ppg-tab"][data-v="dia"]'); await H.dorme(600);
 await p.fill('#ppg-t','Revisar o portão da portaria'); await p.selectOption('#ppg-o','Portaria'); await p.fill('#ppg-l','portão 2'); await p.selectOption('#ppg-tc','Bruno Lima'); await p.click('[data-act="ppg-add"]'); await H.dorme(12000);
 let ag=await p.evaluate(()=>{ const S=__T.S(), a=((S.pp.plano||{}).agenda||[])[0], c=a&&(S.chamados||[]).find(x=>x.agId===a.id); return {a:a&&{dia:a.dia,t:a.t,onde:a.onde,tec:a.paraTec},c:c&&{n:c.numero,prev:c.prevId,tf:c.tarefa,l:c.linha,tec:c.paraTec}}; });
 ok('Tarefa programada para hoje: grava na agenda e a OS abre sozinha (preventiva, para o Bruno)', ag.a&&ag.a.dia===hj&&ag.a.onde==='Portaria'&&ag.c&&/^ag-/.test(ag.c.prev)&&ag.c.tf&&ag.c.l==='Portaria'&&ag.c.tec==='Bruno Lima', JSON.stringify(ag));
 await p.evaluate(()=>__T.go('gxch')); await H.dorme(700); tx=await p.evaluate(()=>document.getElementById('view').innerText);
 ok('A tarefa programada NÃO aparece em Chamados (lá só o imediato)', !/Revisar o portão/.test(tx), tx.slice(0,300).replace(/\n/g,'|'));
 await salva(p); await B.browser.close();
 /* 2) computador de chamados: técnico começa e faz o checklist */
 ({B,p}=await abre('chamados','ch1234',1600));
 const bip=async c=>{ await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(1100); };
 const zera=async()=>{ await p.evaluate(()=>{ const T=__T.S().tt; T.recente={}; Object.assign(T,{fase:'espera',p:null,msg:''}); __T.go('mantotem'); }); await H.dorme(700); };
 await bip('777888'); tx=await p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText);
 ok('Técnico vê a preventiva ("Preventiva do plano · 3 itens", "Começar a preventiva") e a tarefa programada', /Preventiva do plano · 3 itens/.test(tx)&&/Começar a preventiva/.test(tx)&&/Revisar o portão da portaria/.test(tx), tx.slice(0,500).replace(/\n/g,'|'));
 await p.click(`[data-act="cq-comecar"][data-n="${os.n}"]`); await H.dorme(1500); await zera(); await bip('777888');
 const bt=await p.evaluate(n=>{ const b=document.querySelector(`[data-act="cq-terminar"][data-n="${n}"]`); return b?b.innerText:''; },os.n);
 ok('Depois de começar: "Fazer o checklist e concluir"', /Fazer o checklist e concluir/.test(bt), bt);
 await p.click(`[data-act="cq-terminar"][data-n="${os.n}"]`); await H.dorme(700);
 tx=await p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText);
 const dis=await p.evaluate(()=>{ const b=document.querySelector('[data-act="cqk-fim"]'); return b?b.disabled:null; });
 ok('Checklist no computador: já mostra o item conferido antes (1 de 3) e "Concluir" travado', /Checklist/.test(tx)&&/1 de 3/.test(tx)&&dis===true, tx.slice(0,300).replace(/\n/g,'|')+' / '+dis);
 await p.screenshot({path:'/tmp/pp-cq.png'});
 await p.click('[data-act="cqk-pb"][data-id="PM-0003"]'); await H.dorme(700); await p.click('[data-act="cqk-tudo"]'); await H.dorme(700); await p.click('[data-act="cqk-fim"]'); await H.dorme(3000);
 const fim=await p.evaluate(([n,id])=>{ const S=__T.S(), c=S.chamados.find(x=>x.numero===n), pb=S.chamados.find(x=>x.origem==='preventiva-problema'); return {st:c.status,tec:c.exec&&c.exec.tecnico,h:(document.querySelector('.cq-fim h1')||{}).innerText,pb:pb&&{def:pb.defeito,l:pb.linha,eq:pb.equip}}; },[os.n,rs.id]);
 pl=await p.evaluate(()=>__T.S().db.doc('config/manutplano').get().then(g=>g.data()));
 const rs2=pl.rot.find(r=>r.id===rs.id);
 ok('Concluir: OS concluída, "Preventiva concluída" na tela', fim.st==='Concluída'&&fim.tec==='Bruno Lima'&&/Preventiva concluída/.test(fim.h||''), JSON.stringify(fim));
 ok('O item com problema virou chamado para a manutenção (Elevador de canecas)', fim.pb&&/Problema na preventiva: Verificar correia e canecas/.test(fim.pb.def)&&fim.pb.l==='Linha 1'&&/Elevador/.test(fim.pb.eq||''), JSON.stringify(fim.pb));
 ok('Próxima data do roteiro = hoje + 7 (dia útil) e "última" = hoje', rs2.ult===hj&&rs2.prox===util(addD(hj,7))&&!rs2.osDe, JSON.stringify(rs2));
 await salva(p); await B.browser.close();
 /* 3) posto: checklist do dia do operador (tecla 5) */
 ({B,p}=await abre('posto','po1234',1366));
 const bp=async c=>{ await p.keyboard.type(c,{delay:12}); await p.keyboard.press('Enter'); await H.dorme(1000); };
 await bp('000123'); tx=await p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText);
 ok('Menu do posto tem "5 · Checklist do dia · 0 de 5 itens" (Linha 1 + filtro da Linha 1 + descarga)', /Checklist do dia/.test(tx)&&/0 de 5 itens feitos/.test(tx), tx.slice(0,500).replace(/\n/g,'|'));
 await p.screenshot({path:'/tmp/pp-posto-menu.png'});
 await p.keyboard.press('5'); await H.dorme(800);
 let f=await p.evaluate(()=>({f:__T.S().tt.fase,t:(document.querySelector('.cq')||document.body).innerText}));
 ok('Tecla 5 abre o checklist (sem os itens da Linha 2)', f.f==='pochk'&&/Conferir ruído e vazamento/.test(f.t)&&/Conferir pressão diferencial/.test(f.t)&&/Conferir sinal do sensor/.test(f.t)&&!/Conferir ruído\n/.test(f.t)&&(f.t.match(/✓ OK/g)||[]).length===5, f.f+' | '+f.t.slice(0,400).replace(/\n/g,'|'));
 await p.keyboard.press('Enter'); await H.dorme(1500); await p.keyboard.press('p'); await H.dorme(2000);
 await p.keyboard.type('OP-5001',{delay:8}); await H.dorme(500);
 let ck=await p.evaluate(h=>__T.S().db.doc('checkop/'+h).get().then(g=>g.exists?g.data():null),hj);
 const chOp=await p.evaluate(()=>(__T.S().chamados||[]).filter(c=>c.origem==='checklist').map(c=>({d:c.defeito,l:c.linha,n:c.nome})));
 const ks=ck&&ck.it?Object.entries(ck.it).map(([k,v])=>k+':'+v.s):[];
 ok('Enter = OK no 1º item; P = problema no 2º (vira chamado); rajada do coletor não marca nada', ks.length===2&&ks.includes('PM-0009:ok')&&ks.includes('PM-0010:pb')&&chOp.length===1&&/Checklist do operador: Conferir vazamento de pó/.test(chOp[0].d)&&chOp[0].n==='Ana Souza', JSON.stringify({ks,chOp}));
 await p.screenshot({path:'/tmp/pp-posto-chk.png'});
 await p.keyboard.press('Escape'); await H.dorme(600); tx=await p.evaluate(()=>(document.querySelector('.cq')||document.body).innerText);
 ok('Esc volta ao menu com "2 de 5 itens feitos"', /2 de 5 itens feitos/.test(tx), tx.slice(0,400).replace(/\n/g,'|'));
 await B.browser.close();
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 /* planilha de verdade (opcional): só a leitura e a montagem dos roteiros */
 if(process.env.PLANO_XLSX){ const w=XLSX.readFile(process.env.PLANO_XLSX); const m=XLSX.utils.sheet_to_json(w.Sheets['Plano'],{header:1}); console.log('planilha real:',m.length-1,'linhas'); }
 const fa=res.filter(x=>!x.ok).length; console.log(fa?'FALHOU ('+fa+')':'PASSOU tudo ('+res.length+')'); process.exit(fa?1:0); })().catch(e=>{ console.log('FALHOU',e); process.exit(1); });
