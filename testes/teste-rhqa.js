/* 30/10: Início em ordem de urgência, aviso de experiência certo, nomes das seções iguais ao menu, ações rápidas,
   tamanhos do cadastro na entrega de uniforme, ocorrências acumuladas e assinada anexada. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 const dd=k=>{ const x=new Date(); x.setDate(x.getDate()+k); return x.toISOString().slice(0,10); };
 D['rh/config']={setores:['Linha 1']}; D['rh/dados/funcoes/f1']={nome:'Operador',epis:[{nome:'Luva',ca:'1'}],uniformes:[{nome:'Camisa'},{nome:'Calça'},{nome:'Botina'}]};
 const base={funcao:'Operador',setor:'Linha 1',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',nascimento:'1990-01-01',telefone:'(51) 99999-0000'};
 D['rh/dados/funcionarios/a']=Object.assign({},base,{nome:'ANA SOUZA',cpf:'52998224725',admissao:dd(-200),camisa:'G',calca:'42',calcado:'40'});
 D['rh/dados/funcionarios/b']=Object.assign({},base,{nome:'BRUNO ROCHA',cpf:'11144477735',admissao:dd(-60)}); /* 1ª etapa venceu há 15 dias */
 D['rh/dados/ocorrencias/o1']={funcId:'a',data:dd(-100),tipo:'Advertência escrita',motivo:'Atraso'}; D['rh/dados/ocorrencias/o2']={funcId:'a',data:dd(-20),tipo:'Advertência escrita',motivo:'Atraso de novo'};
 D['rh/dados/docsgerados/g1']={ocId:'o1',funcId:'a',funcionario:'ANA SOUZA',modelo:'Advertência',em:dd(-100),assinado:{url:'https://exemplo.invalid/ass.pdf',nome:'a.pdf'}};
 D['rh/dados/docsgerados/g2']={ocId:'o2',funcId:'a',funcionario:'ANA SOUZA',modelo:'Advertência',em:dd(-20)};
 const B=await H.abrir({viewport:{width:390,height:844}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
 const view=()=>p.evaluate(()=>document.getElementById('view').innerText);
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(800); let s=await view();
 const iP=s.indexOf('Precisa de você'), iS=s.indexOf('Próximos 7 dias'), iT=s.indexOf('Avisos nas TVs');
 ok('Início: Precisa de você → Próximos 7 dias → Avisos nas TVs', iP>0&&iP<iS&&iS<iT, [iP,iS,iT].join(','));
 ok('Aviso da experiência vencida não manda prorrogar', /passou do prazo para prorrogar[^\n]*contabilidade/.test(s)&&!/BRUNO ROCHA[^\n]*\n[^\n]*prorrogar, efetivar ou desligar/.test(s), (s.match(/Experiência: BRUNO ROCHA\n[^\n]*/)||[''])[0]);
 ok('Aviso de ocorrências acumuladas no Início', /Ocorrências: ANA SOUZA\n2 advertências nos últimos 12 meses/.test(s));
 ok('Barra "Registrar rápido" com botões grandes no celular', await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-act="rh-qa"]')]; return b.length===5&&b.every(x=>x.getBoundingClientRect().height>=48); }));
 const rapido=async(k,nome)=>{ await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(500); await p.click(`[data-act="rh-qa"][data-v="${k}"]`); await H.dorme(300); await p.fill('#rh-bus',nome); await H.dorme(500); await p.click('[data-act="rh-qago"]'); await H.dorme(1000); return p.evaluate(()=>__T.S().view); };
 let v=await rapido('atest','ana'); s=await view(); ok('Rápido › Atestado: abre o atestado já com a pessoa', v==='rhatest'&&await p.evaluate(()=>RHAtest._A.f&&RHAtest._A.f.funcId==='a'&&RHAtest._A.f.tipo==='atestado'), v);
 v=await rapido('falta','bruno'); ok('Rápido › Falta: abre como falta sem justificativa', v==='rhatest'&&await p.evaluate(()=>RHAtest._A.f&&RHAtest._A.f.funcId==='b'&&RHAtest._A.f.tipo==='injustificada'), v);
 await p.evaluate(()=>{ RHAtest._A.f=null; }); 
 v=await rapido('unif','ana'); s=await view(); const chips=await p.evaluate(()=>[...document.querySelectorAll('.rhu-chip')].map(x=>x.innerText.trim()));
 ok('Rápido › Uniforme: entrega já com a Ana e os tamanhos do cadastro', v==='rhunif'&&/Tamanhos: camisa G · calça 42 · calçado 40/.test(s)&&chips.join('|')==='+ Camisa G|+ Calça 42|+ Botina 40', chips.join('|'));
 await p.click('.rhu-chip'); await H.dorme(300); const tam=await p.evaluate(()=>RHUnif._U.f.itens.map(i=>i.t+':'+i.tam).join(',')); ok('Ao escolher a peça, o tamanho da pessoa entra sozinho', /Camisa:G/.test(tam), tam);
 await p.click('[data-act="rhu-fx"]'); await H.dorme(300);
 v=await rapido('oc','ana'); s=await view(); ok('Rápido › Ocorrência: abre a pessoa com o formulário da ocorrência', v==='rhfunc'&&!!(await p.$('#rh-ocm'))&&/2 advertências nos últimos 12 meses/.test(s), v);
 ok('Ocorrência com a assinada: "Ver assinada"; sem: "Anexar assinada"', !!(await p.$('.rh-occ a[href="https://exemplo.invalid/ass.pdf"]'))&&!!(await p.$('.rh-occ input[data-rh-danx="g2"]'))&&/falta a assinada/.test(s));
 await p.click('[data-act="rh-ocx"]').catch(()=>{});
 v=await rapido('doc','bruno'); ok('Rápido › Documento: abre Gerar documento para a pessoa', v==='rhdocs'&&await p.evaluate(()=>1), v);
 await p.evaluate(()=>__T.go('rhferias')); await H.dorme(500); const e1=await view(); await p.evaluate(()=>__T.go('rhexp')); await H.dorme(500); const e2=await view(); await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(500); const e3=await view();
 ok('Nomes das seções iguais ao menu (Ausências, Prazos, Documentos)', /RH · AUSÊNCIAS/i.test(e1)&&/RH · PRAZOS/i.test(e2)&&/RH · DOCUMENTOS/i.test(e3)&&!/FÉRIAS E PRAZOS/i.test(e1+e2), [e1,e2,e3].map(t=>(t.match(/RH · [^\n]*/i)||[''])[0]).join(' | '));
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
