const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,230):'')); };
(async()=>{ const {d}=seedManut(); d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; d.docs['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; d.docs['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 const B=await H.abrir({viewport:{width:1366,height:1000}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs); const toast=()=>p.evaluate(()=>{ const t=document.getElementById('toast'); return t&&!t.hidden?t.innerText:''; });
 const e0=await p.evaluate(()=>({v:__T.S().view,nav:document.getElementById('navlist').innerText.replace(/\n/g,'|')}));
 await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(300);
 ok('RH entra direto no Início do RH', e0.v==='rhinicio', JSON.stringify(e0));
 // cadastro
 await p.click('[data-act="rh-novo"]'); await p.fill('[data-rh-f="nome"]','Ana Souza'); await p.fill('[data-rh-f="cpf"]','123.456.789-00'); await p.click('[data-act="rh-salvar"]'); await H.dorme(300); const t1=await toast();
 await p.fill('[data-rh-f="cpf"]','529.982.247-25'); await p.fill('[data-rh-f="funcao"]','Operador de Produção'); await p.fill('[data-rh-f="setor"]','Linha 1'); await p.fill('[data-rh-f="admissao"]','2024-03-10'); await p.fill('[data-rh-f="camisa"]','M');
 await p.click('[data-act="rh-salvar"]'); await H.dorme(700);
 await p.click('[data-act="rh-novo"]'); await p.fill('[data-rh-f="nome"]','Outra Pessoa'); await p.fill('[data-rh-f="cpf"]','52998224725'); await p.click('[data-act="rh-salvar"]'); await H.dorme(300); const t2=await toast(); await p.click('[data-act="rh-fx"]');
 let s=await srv(); const fun=Object.entries(s).filter(([k])=>k.startsWith('rh/dados/funcionarios/'));
 ok('Cadastro de funcionário: CPF inválido e CPF repetido recusados; salvo com nome em maiúsculas', /CPF inválido/.test(t1)&&/Já existe/.test(t2)&&fun.length===1&&fun[0][1].nome==='ANA SOUZA'&&fun[0][1].cpf==='52998224725'&&fun[0][1].criadoPor==='uRH', `${t1} | ${t2} | ${fun.length} salvo`);
 // função
 await p.evaluate(()=>__T.go('rhfuncoes')); await H.dorme(400); const avisoFunc=/sem EPI\/uniforme/.test(await p.evaluate(()=>document.getElementById('view').innerText));
 await p.click('[data-act="rh-fnovo"][data-n]'); await H.dorme(200);
 await p.fill('[data-rh-it="epis"][data-i="0"][data-c="nome"]','Luva de proteção'); await p.fill('[data-rh-it="epis"][data-i="0"][data-c="ca"]','12345');
 await p.fill('[data-rh-it="uniformes"][data-i="0"][data-c="nome"]','Camisa'); await p.fill('[data-rh-it="uniformes"][data-i="0"][data-c="tam"]','M'); await p.click('[data-act="rh-fsalvar"]'); await H.dorme(600);
 s=await srv(); const fc=Object.values(s).find(x=>x&&x.epis);
 ok('Funções: avisa função sem EPI e salva EPIs (com CA) e uniforme', avisoFunc&&fc&&fc.nome==='Operador de Produção'&&fc.epis[0].ca==='12345'&&fc.uniformes[0].tam==='M', JSON.stringify(fc&&{n:fc.nome,e:fc.epis,u:fc.uniformes}));
 // menu igual ao exemplo (12/10): Dia a dia, Controle de EPI e Retiradas saíram
 const menu=await p.evaluate(()=>[...document.querySelectorAll('#navlist [data-go]')].map(b=>b.innerText.trim()).join('|'));
 ok('Menu do RH igual ao exemplo, com as telas na lateral', menu==='Início|Funcionários|Fichas do mês|Documentos e contratos|Férias e prazos|Funções e EPIs|Terceirizados', menu);
 await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(200); await p.click('[data-act="rh-fgerartela"]'); await H.dorme(400);
 // fichas (sistema original dentro do painel)
 await H.dorme(2500); const fr=p.frames().find(f=>/rh-fichas/.test(f.url()));
 const st=fr?await fr.evaluate(()=>document.getElementById('status-text').textContent):'(sem iframe)';
 ok('Fichas: o sistema original abre no painel e lê o cadastro do RH (sem planilha)', /1 colaborador\(es\) ativo\(s\)/.test(st)&&/base do RH/.test(st), st);
 await fr.evaluate(()=>{ const s=document.getElementById('select-funcionario'); s.selectedIndex=[...s.options].findIndex(o=>/ANA/.test(o.text)); s.dispatchEvent(new Event('change')); }); await fr.click('#btn-gerar'); await H.dorme(800);
 const prev=await fr.evaluate(()=>document.getElementById('preview-wrap').innerText);
 ok('A ficha gerada traz nome, CPF, função, EPI com CA e uniforme', /ANA SOUZA/.test(prev)&&/529\.982\.247-25/.test(prev)&&/Luva de proteção/.test(prev)&&/12345/.test(prev)&&/Camisa/.test(prev), prev.replace(/\n/g,' ').slice(0,180));
 // ficha escaneada
 await fr.evaluate(()=>{ const s=document.getElementById('upload-funcionario'); s.selectedIndex=[...s.options].findIndex(o=>/ANA/.test(o.text)); });
 await fr.setInputFiles('#upload-arquivo','foto-a.png'); await fr.click('#btn-enviar-ficha'); await H.dorme(1500);
 const up=await fr.evaluate(()=>document.getElementById('upload-msg').innerText); s=await srv(); const arq=Object.entries(s).find(([k,v])=>k.startsWith('rh/arquivos/lista/'));
 await fr.click('#btn-atualizar-status-mes'); await H.dorme(800); const stm=await fr.evaluate(()=>(document.body.innerText.match(/\d+ de \d+ já têm ficha escaneada[^\n]*/)||[''])[0]);
 const orig=fs.readFileSync('foto-a.png').toString('base64'); const back=arq?Object.entries(s).filter(([k])=>k.startsWith('rh/arquivos/partes/'+arq[0].split('/').pop())).map(([k,v])=>v.d).join(''):'';
 ok('Ficha escaneada: salva no painel com nome do funcionário e mês, conta no status do mês e o arquivo volta idêntico', /Salvo em/.test(up)&&arq&&/ANA SOUZA - /.test(arq[1].nome)&&/1 de 1/.test(stm)&&back===orig, (arq&&arq[1].nome)+' · '+stm);
 // abrir arquivo pelo link
 const lid=arq[0].split('/').pop(); await p.goto(H.BASE+'?rhfile='+lid); await H.dorme(3500);
 const ban=await p.evaluate(()=>({v:__T.S().view,b:!!document.querySelector('[data-act="rh-arq"]')}));
 ok('Link do arquivo abre o painel na tela das fichas com o botão "Abrir arquivo"', ban.v==='rhfichas'&&ban.b, JSON.stringify(ban));
 // importar CSV
 await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(300); fs.writeFileSync('/tmp/func.csv','Nome;CPF;Função;Setor;Data de admissão;Empresa;Status;Tipo\nCarlos Lima;111.444.777-35;Operador de Produção;Linha 2;05/02/2023;Colafix;Ativo;CLT\nRepetida;529.982.247-25;X;Y;;;Ativo;\nInvalido;000.000.000-00;X;Y;;;Ativo;');
 await p.setInputFiles('#rh-imp','/tmp/func.csv'); await H.dorme(1200); const ti=await toast(); s=await srv(); const nf=Object.keys(s).filter(k=>k.startsWith('rh/dados/funcionarios/')).length;
 ok('Importar lista (CSV/Excel): entra o novo, ignora repetido e CPF inválido', nf===2&&/1 funcionário\(s\) importado/.test(ti)&&/1 já existiam/.test(ti)&&/1 com CPF inválido/.test(ti), ti);
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); await B.browser.close();
 // quem não é do RH
 const C=await H.abrir(); await H.preparar(C.page,d); await C.page.goto(H.BASE); await H.entrar(C.page,'operador','ope123'); await H.dorme(2500);
 const o=await C.page.evaluate(()=>({nav:document.getElementById('navlist').innerText,v:(__T.go('rhfunc'),__T.S().view)}));
 ok('Quem não é do RH não vê o módulo', !/RH/.test(o.nav)&&o.v!=='rhfunc', o.v); await C.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
