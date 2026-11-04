/* Pedidos de 04/11 (Juliana, Férias): aviso de períodos vencidos que não saía, relatório das férias e mapa do ano com visual novo. Dados inventados. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs; const Y=new Date().getFullYear();
  D['rh/dados/funcionarios/p0']={nome:'ANA SOUZA',cpf:'52998224725',funcao:'Ajudante',setor:'Expedição',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2023-03-10',
    ferFolha:{emissao:'2026-10-01',dataBase:'2026-10-01',periodos:[{ini:'2023-03-10',fim:'2024-03-09',lim:'2025-02-07',rest:30,dir:30}]}};
  D['rh/dados/funcionarios/p1']={nome:'BRUNO ROCHA',cpf:'60759545077',funcao:'Operador',setor:'Linha 1',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2022-05-02'};
  D['rh/dados/funcionarios/p2']={nome:'CARLA DIAS',cpf:'11144477735',funcao:'Analista',setor:'PCP',tipo:'CLT',empresa:'COLAFIX',status:'Ativo',admissao:'2024-01-15'};
  D['rh/dados/ferias/f1']={funcId:'p2',funcionario:'CARLA DIAS',inicio:Y+'-03-02',fim:Y+'-03-16',dias:15,retorno:Y+'-03-17',status:'marcada'};
  D['rh/config']=Object.assign({},D['rh/config']||{},{fichasDesde:'2000-01'});
  const B=await H.abrir({viewport:{width:1440,height:950}}); const p=B.page; await H.preparar(p,d); p.on('dialog',dl=>dl.accept());
  await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2500);
  await p.evaluate(()=>__T.go('rhferias')); await H.dorme(900);
  const ant=await p.evaluate(()=>{ const e=document.querySelector('.rh-v2fant'); return e?e.innerText:''; });
  ok('Aparece o aviso de período vencido (pessoa com férias vindas da folha)', /períodos? vencidos?/.test(ant), ant);
  await p.click('[data-act="rh-feranteriores"]'); await H.dorme(1500);
  const dep=await p.evaluate(()=>({av:!!document.querySelector('.rh-v2fant'),t:document.getElementById('view').innerText}));
  ok('Depois de "Marcar como já tirado" o aviso some', !dep.av, dep.av?'ainda aparece':'');
  const n=await p.evaluate(async()=>{ const s=await __T.S().db.collection('rh/dados/ferias').get(); return s.docs.filter(x=>x.data().anterior).length; });
  await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-feranteriores"]'); if(b) b.click(); }); await H.dorme(800);
  const n2=await p.evaluate(async()=>{ const s=await __T.S().db.collection('rh/dados/ferias').get(); return s.docs.filter(x=>x.data().anterior).length; });
  ok('Não grava de novo (o botão sumiu e nada novo foi gravado)', n>=1&&n2===n, n+' / '+n2);
  /* relatório */
  await p.evaluate(()=>{ const b=document.querySelector('[data-act="rh-pzfil"][data-v="todos"]'); if(b) b.click(); }); await H.dorme(600);
  const bt=await p.evaluate(()=>!!document.querySelector('[data-act="rh-ferpdf"]')&&!!document.querySelector('[data-act="rh-ferxls"]'));
  ok('Férias tem os botões do relatório (PDF e Excel)', bt);
  if(bt){ for(const [a,ext] of [['rh-ferpdf','pdf'],['rh-ferxls','xlsx']]){ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:25000}).catch(()=>null),p.click('[data-act="'+a+'"]')]);
      ok('Baixar '+ext.toUpperCase()+' das férias', dl&&new RegExp('^Ferias-.*\\.('+ext+'|csv)$').test(dl.suggestedFilename()), dl?dl.suggestedFilename():'sem download'); } }
  /* mapa */
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/Mapa do ano/.test(x.innerText)); if(b) b.click(); }); await H.dorme(900);
  const m=await p.evaluate(()=>{ const sel=document.getElementById('rh-mapsetsel'), b=document.querySelector('.rh-mb:not([style*="static"])'); return {sel:!!sel,ops:sel?sel.options.length:0,chips:document.querySelectorAll('[data-act="rh-mapset"]').length,it:b?getComputedStyle(b.querySelector('span')).fontStyle:'?',cls:b?b.className:''}; });
  ok('Mapa: setor numa lista (sem a fileira de botões) e barras sem itálico', m.sel&&m.ops>=3&&m.chips===0&&m.it==='normal', JSON.stringify(m));
  await p.selectOption('#rh-mapsetsel','PCP'); await H.dorme(700);
  const so=await p.evaluate(()=>[...document.querySelectorAll('.rh-mapa .rh-mr:not(.rh-mh) .rh-nm>span')].map(x=>x.innerText).join(','));
  ok('Escolher o setor mostra só as pessoas dele', /Carla Dias/i.test(so)&&!/Bruno/i.test(so), so);
  const erros=B.erros.filter(x=>!/404|ERR_FAILED/.test(x)); ok('Sem erros na página', !erros.length, erros.join(' | '));
  const k=res.filter(r=>r.ok).length; console.log(k===res.length?`PASSOU tudo (${k})`:`FALHOU ${res.length-k} de ${res.length}`); await B.browser.close(); process.exit(0);
})().catch(e=>{ console.log('FALHOU erro',e); process.exit(1); });
