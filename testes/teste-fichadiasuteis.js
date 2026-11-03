/* 03/11 "na folha do EPI pode tirar os sábados, domingos e feriados?": a folha do EPI só tem os dias úteis do mês
   (sem sábado, domingo e feriado do calendário do painel); a de uniforme continua com todos os dias. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[]};
 D['rh/config']={fichasDesde:'2000-01'}; D['rh/dados/funcoes/f1']={nome:'Mecânico',epis:[{nome:'Luva',ca:'111'}],uniformes:[{nome:'Camisa',tam:'G'}]};
 D['rh/dados/funcionarios/a']={nome:'ANA TESTE',cpf:'52998224725',funcao:'Mecânico',setor:'Geral',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2024-01-10'};
 const B=await H.abrir({viewport:{width:1366,height:1000}}); const p=B.page; p.on('dialog',x=>x.accept()); await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
 await p.evaluate(()=>__T.go('rhfichas')); await p.click('[data-act="rh-fvgerar"]'); await H.dorme(2500); const fr=p.frames().find(f=>/rh-fichas/.test(f.url()));
 const dias=await fr.evaluate(()=>{ const i=document.getElementById('input-mes'); i.value='2026-11'; i.dispatchEvent(new Event('change')); const s=document.getElementById('select-tipo-ficha'); s.value='AMBAS'; s.dispatchEvent(new Event('change'));
   document.getElementById('btn-gerar').click(); const g=sel=>[...document.querySelectorAll('#preview-wrap '+sel+' .data-cell')].map(x=>x.innerText.trim());
   return {epi:g('.page-epi'),uni:g('.page-uniforme'),h:getComputedStyle(document.querySelector('#preview-wrap .page-epi table')).getPropertyValue('--row-h')}; });
 const fds=['01','07','08','14','15','21','22','28','29'];
 ok('Folha do EPI de novembro/2026: sem sábados e domingos', dias.epi.length>0&&!dias.epi.some(x=>fds.includes(x.slice(0,2))), dias.epi.join(' '));
 ok('Sem o feriado de Finados (02/11)', !dias.epi.includes('02/11')&&dias.epi.includes('03/11'), dias.epi.slice(0,3).join(' '));
 ok('Linhas mais altas (mesma altura de tabela)', parseFloat(dias.h)>4.2, dias.h);
 ok('Folha de uniforme continua com os 30 dias', dias.uni.length===30, String(dias.uni.length));
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs|fonts/.test(x)).slice(0,3)); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error(e); process.exit(1); });
