/* RH: corrigir desligamento (agendar/cancelar) e modelos com campos automáticos (distrato, assinatura com a empresa). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const hoje=new Date().toISOString().slice(0,10), mais=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
(async()=>{ const {d}=seedManut(x=>x); const D=d.docs;
 D['rh/dados/funcionarios/r1']={nome:'RICHARD DOS SANTOS CANABARRO',tipo:'PJ',empresa:'ZENITH',cnpj:'69025372000179',status:'Desligado',admissao:'2026-08-26',desligamento:hoje,desligMotivo:'Notificação de rescisão - com prazo',setor:'PRODUÇÃO',funcao:'AJUDANTE DE PRODUÇÃO'};
 D['rh/dados/modelos/m1']={nome:'Distrato antigo',vale:'ZENITH',html:'<p>CONTRATADO: <span class="rh-tk" data-k="RAZAO_PJ"></span>, inscrita no CNPJ nº <span class="rh-tk" data-k="CNPJ_PJ"></span>.</p><p>serviços prestados até <span class="rh-tq" data-q="data3"></span>.</p><p>Gravataí, <span class="rh-tq" data-q="data4"></span>.</p><p>____________</p><p>Contratante</p>'};
 const B=await H.abrir({viewport:{width:1500,height:950}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(1200);
 await p.evaluate(()=>{ const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value==='Desligado')); if(s){ s.value='Desligado'; s.dispatchEvent(new Event('change',{bubbles:true})); } }); await H.dorme(800);
 ok('Na lista, quem foi marcado como desligado tem "Ainda não foi desligado?"', await p.evaluate(()=>!!document.querySelector('[data-act="rh-desfaz"][data-id="r1"]')));
 await p.click('[data-act="rh-desfaz"][data-id="r1"]'); await H.dorme(400); await p.fill('#rh-dsdata',mais(3)); await p.click('[data-act="rh-desagenda"][data-id="r1"]'); await H.dorme(1200);
 const ag=await p.evaluate(()=>{ const x=window.__rhFunc?null:null; return null; });
 const st=await p.evaluate(()=>{ const t=document.getElementById('view').innerText; return t; });
 await p.evaluate(()=>{ const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value==='Desligado')); if(s){ s.value='todos'; s.dispatchEvent(new Event('change',{bubbles:true})); } }); await H.dorme(800);
  const linha=await p.evaluate(()=>{ const tr=[...document.querySelectorAll('#view tr')].find(r=>/RICHARD/.test(r.innerText)); return tr?tr.innerText.replace(/\n/g,' | '):''; });
 ok('"Agendar" deixa ativo e mostra "sai em" com a data escolhida', /Ativo|atividade/.test(linha)&&linha.includes('sai em '+mais(3).split('-').reverse().join('/')), linha);
 p.once('dialog',dl=>dl.accept()); await p.click('[data-act="rh-desfaz"][data-id="r1"]'); await H.dorme(300); await p.click('[data-act="rh-descancela"][data-id="r1"]'); await H.dorme(1200);
 const l2=await p.evaluate(()=>{ const tr=[...document.querySelectorAll('#view tr')].find(r=>/RICHARD/.test(r.innerText)); return tr?tr.innerText.replace(/\n/g,' | '):''; });
 ok('"Cancelar desligamento" volta a ativo sem data de saída', /Ativo/.test(l2)&&!/sai em/.test(l2), l2);
 // modelos: ajustar campos automaticamente
 await p.evaluate(()=>__T.go('rhdocs')); await H.dorme(1000);
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/^Modelos/.test(x.innerText.trim())); if(b) b.click(); }); await H.dorme(700);
 await p.click('[data-act="rh-ded"][data-id="m1"]'); await H.dorme(700); await p.click('[data-act="rh-dauto"]'); await H.dorme(700);
 const ks=await p.evaluate(()=>[...document.querySelectorAll('.rh-tk')].map(s=>s.dataset.k).concat([...document.querySelectorAll('.rh-tq')].map(s=>'?'+s.dataset.q)));
 ok('"Ajustar campos automaticamente": [data3] vira "Pago até", [data4] vira a data de hoje, e a assinatura "Contratante" ganha a empresa', ks.includes('PAGO_ATE')&&ks.includes('DATA_HOJE')&&ks.includes('EMPRESA')&&!ks.some(k=>/^\?data/.test(k)), ks.join(', '));
 // valores do distrato: pago até o fim do mês anterior, saldo do dia 1º até o desligamento
 const v=await p.evaluate(()=>window.rhAutoCampos?true:false);
 ok('Função de reconhecimento disponível para os importadores do Word', v);
 await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
