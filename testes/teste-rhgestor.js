/* 30/10 (passeio de gestora de RH): CPF e admissão em branco contam como "Cadastro incompleto"; nas Fichas do mês o botão do grupo
   "Não geradas" conta igual ao do topo (função não cadastrada fica fora dos dois). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/config']={setores:['Linha 1'],fichasDesde:'2000-01'}; D['rh/dados/funcoes/f1']={nome:'Operador',epis:[{nome:'Luva',ca:'1'}],uniformes:[{nome:'Camisa'}]};
 const base={funcao:'Operador',setor:'Linha 1',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:new Date(Date.now()-200*864e5).toISOString().slice(0,10),nascimento:'1990-01-01',telefone:'(51) 99999-0000',cpf:'52998224725'};
 D['rh/dados/funcionarios/a']=Object.assign({},base,{nome:'ANA COMPLETA'}); D['rh/dados/funcionarios/b']=Object.assign({},base,{nome:'BIA SEM CPF',cpf:''});
 D['rh/dados/funcionarios/c']=Object.assign({},base,{nome:'CAIO SEM ADMISSAO',cpf:'11144477735',admissao:''}); D['rh/dados/funcionarios/e']=Object.assign({},base,{nome:'EDU SOLDADOR',cpf:'39053344705',funcao:'Soldador'});
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
 await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(900); const s=await p.evaluate(()=>document.getElementById('view').innerText);
 const linha=n=>(s.split(n)[1]||'').split('\n').slice(0,8).join(' ');
 ok('Sem CPF e sem admissão aparecem como "Cadastro incompleto"; quem está completo não', /Cadastro incompleto/.test(linha('BIA SEM CPF'))&&/Cadastro incompleto/.test(linha('CAIO SEM ADMISSAO'))&&!/Cadastro incompleto/.test(linha('ANA COMPLETA').split('BIA')[0])&&!/Cadastro incompleto/.test(linha('EDU SOLDADOR')), ['BIA SEM CPF','CAIO SEM ADMISSAO','ANA COMPLETA'].map(n=>n+': '+linha(n).slice(0,90)).join(' | '));
 await p.evaluate(()=>__T.go('rhfichas')); await p.click('[data-act="rh-fvmes"]').catch(()=>{}); await H.dorme(1000);
 const bt=await p.evaluate(()=>[...document.querySelectorAll('[data-act="rh-ffaltam"]')].map(b=>b.innerText.trim()));
 ok('Fichas do mês: os dois botões "Gerar" contam igual (3, sem o Edu da função não cadastrada)', bt.length===2&&/Gerar as 3 que faltam/.test(bt[0])&&/Gerar as 3$/.test(bt[1]), JSON.stringify(bt));
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
