/* RH (pedidos de 13/10, 3ª leva): perguntas rápidas no Início, ocorrências e advertências, itens emprestados (lembrete no desligamento),
   calendário de feriados (RH e produção) e ficha de admissão preenchida pelo celular (ficha.html, sem login). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
const iso=d=>d.toISOString().slice(0,10), dias=n=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return iso(d); };
const anos=(a,n)=>{ const d=new Date(); d.setHours(12,0,0,0); d.setFullYear(d.getFullYear()+a); d.setDate(d.getDate()+(n||0)); return iso(d); };
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
(async()=>{ const {d}=seedManut(); const D=d.docs;
  d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
  D['rh/config']={fichasDesde:'2000-01'};
  const F=(id,o)=>D['rh/dados/funcionarios/'+id]=Object.assign({tipo:'CLT',empresa:'COLAFIX',status:'Ativo',funcao:'Operador'},o);
  F('a',{nome:'ANA SOUZA',cpf:'52998224725',setor:'Linha 1',admissao:anos(-3),nascimento:'1990-05-10',telefone:'51 99999-0000',salario:2000});
  F('b',{nome:'BRUNO LIMA',cpf:'11144477735',setor:'Linha 2',admissao:anos(-2)});
  D['rh/dados/modelos/adv']={nome:'Advertência escrita',vale:'CLT',html:'<p>Advertimos <span class="rh-tk" data-k="NOME">Nome</span> pelo ocorrido em <span class="rh-tk" data-k="OCORRENCIA_DATA">Data</span>: <span class="rh-tk" data-k="OCORRENCIA_MOTIVO">Motivo</span>.</p>'};
  const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; p.on('dialog',x=>x.accept());
  await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2800);
  const view=()=>p.evaluate(()=>document.getElementById('view').innerText), srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);

  /* 8 · perguntas rápidas */
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(300);
  await p.click('[data-act="rh-perg"][data-v="aniv"]'); await H.dorme(300); await p.selectOption('#rh-pgm','05'); await H.dorme(300); let t=await p.evaluate(()=>document.querySelector('.rh-perg').innerText);
  const aniv=/Aniversariantes de maio[\s\S]*1 pessoa[\s\S]*10\/05[\s\S]*Ana Souza/.test(t);
  await p.click('[data-act="rh-perg"][data-v="setor"]'); await H.dorme(300); await p.selectOption('#rh-pgs','Linha 2'); await H.dorme(300); const t2=await p.evaluate(()=>document.querySelector('.rh-perg').innerText);
  await p.click('[data-act="rh-perg"][data-v="semnasc"]'); await H.dorme(300); const t3=await p.evaluate(()=>document.querySelector('.rh-perg').innerText);
  await p.click('[data-act="rh-pgimp"]'); await H.dorme(400);
  ok('Perguntas rápidas: aniversariantes do mês escolhido, quem é do setor, quem não tem nascimento (com Imprimir)', aniv&&/Setor Linha 2[\s\S]*Bruno Lima/.test(t2)&&!/Ana Souza/.test(t2)&&/Sem data de nascimento[\s\S]*Bruno Lima[\s\S]*Completar/.test(t3)&&!/Ana Souza/.test(t3), [t,t2,t3].join(' || ').replace(/\n/g,' | ').slice(0,300));

  /* 3 · ocorrências */
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(300); await p.click('[data-act="rh-fusel"]:has-text("ANA SOUZA")'); await H.dorme(250); await p.click('.rh-v2d [data-act="rh-pess"]'); await H.dorme(400);
  await p.click('[data-act="rh-ocnova"]'); await H.dorme(200); await p.selectOption('#rh-oct','Advertência escrita'); await p.fill('#rh-ocd',dias(-1)); await p.fill('#rh-ocm','Faltou sem avisar'); await p.fill('#rh-ocw','Carlos');
  await p.click('[data-act="rh-ocsalvar"]'); await H.dorme(700); let S=await srv(); const oc=Object.entries(S).find(([k])=>k.startsWith('rh/dados/ocorrencias/'));
  const pf=await view();
  ok('Ocorrência registrada no perfil (data, tipo, motivo, testemunha) e na história', oc&&oc[1].funcId==='a'&&oc[1].tipo==='Advertência escrita'&&oc[1].testemunhas==='Carlos'&&/Ocorrências[\s\S]*Advertência escrita[\s\S]*Faltou sem avisar/.test(pf)&&/A HISTÓRIA[\s\S]*Advertência escrita/.test(pf), pf.replace(/\n/g,' | ').slice(0,300));
  await p.click('[data-act="rh-ocdoc"]'); await H.dorme(600); const dg=await view();
  ok('Gerar documento da ocorrência: abre a advertência já com a data e o motivo', /Advertimos[\s\S]*ANA SOUZA[\s\S]*Faltou sem avisar/.test(dg)&&await p.evaluate(()=>__T.S().view==='rhdocs'), dg.replace(/\n/g,' | ').slice(0,300));

  /* 4 · itens emprestados + desligamento */
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(300); await p.click('[data-act="rh-pessx"]').catch(()=>{}); await H.dorme(200); await p.click('[data-act="rh-fusel"]:has-text("BRUNO LIMA")'); await H.dorme(250); await p.click('.rh-v2d [data-act="rh-pess"]'); await H.dorme(400);
  await p.click('[data-act="rh-empnovo"]'); await H.dorme(200); await p.fill('#rh-empi','Armário'); await p.fill('#rh-empo','nº 12'); await p.click('[data-act="rh-empsalvar"]'); await H.dorme(700);
  await p.click('[data-act="rh-empnovo"]'); await H.dorme(200); await p.fill('#rh-empi','Rádio'); await p.click('[data-act="rh-empsalvar"]'); await H.dorme(700);
  const pe=await view();
  await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(300); await p.click('.rh-hero [data-act="rh-deslnovo"]'); await H.dorme(400); await p.selectOption('#rh-desf','b'); await H.dorme(400);
  const dl=await p.evaluate(()=>document.querySelector('.rh-form').innerText);
  await p.click('.rh-devb [data-act="rh-empdev"]'); await H.dorme(700); S=await srv(); const devs=Object.entries(S).filter(([k])=>k.startsWith('rh/dados/emprestimos/')).map(x=>x[1]);
  const dl2=await p.evaluate(()=>document.querySelector('.rh-form').innerText);
  ok('Itens emprestados: anota no perfil e o desligamento lembra o que devolver', /Itens emprestados[\s\S]*2 itens com a pessoa[\s\S]*Armário \(nº 12\)/.test(pe)&&/Antes de sair, precisa devolver:[\s\S]*Armário \(nº 12\)[\s\S]*Rádio/.test(dl)&&devs.filter(x=>x.devolvido).length===1&&!/Armário \(nº 12\)/.test(dl2)&&/Rádio/.test(dl2), dl.replace(/\n/g,' | ').slice(0,260));
  await p.click('[data-act="rh-deslx"]').catch(()=>{});

  /* 6 · feriados */
  const Y=new Date().getFullYear();
  await p.evaluate(()=>__T.go('rhfuncoes')); await H.dorme(200); await p.click('[data-act="rh-cad"][data-v="feriados"]'); await H.dorme(300); const fv=await view();
  await p.fill('#rh-fhd',Y+'-11-27'); await p.fill('#rh-fhn','Ponte da Consciência Negra'); await p.selectOption('#rh-fht','empresa'); await p.click('[data-act="rh-feradd"]'); await H.dorme(700);
  await p.click(`[data-act="rh-ferrem"][data-v="${Y}-09-20"]`); await H.dorme(700); S=await srv(); const fc=S['config/feriados']||{};
  const fer=await p.evaluate(()=>__T.fer()); const fv2=await view();
  ok('Feriados: nacionais calculados (Sexta-feira Santa, Natal), ponte incluída e "a fábrica trabalha" tirado', /Sexta-feira Santa/.test(fv)&&/Natal/.test(fv)&&/Consciência Negra/.test(fv)&&(fc.lista||[]).some(x=>x.data===Y+'-11-27'&&x.tipo==='empresa')&&(fc.tirados||[]).includes(Y+'-09-20')
    &&fer&&fer.f.includes(Y+'-11-27')&&fer.f.includes(Y+'-12-25')&&!fer.f.includes(Y+'-09-20')&&/A fábrica trabalha em: Revolução Farroupilha/.test(fv2), JSON.stringify(fc).slice(0,200)+' '+JSON.stringify(fer&&fer.f.filter(x=>x.startsWith(String(Y)))));
  await p.evaluate(()=>__T.go('rhagenda')); await H.dorme(300); await p.click('[data-act="rh-agdias"][data-v="90"]'); await H.dorme(300); const ag=await view();
  /* férias começando 2 dias antes de domingo ou feriado: aviso da CLT */
  let sx=dias(20); while(new Date(sx+'T12:00:00Z').getUTCDay()!==5) sx=iso(new Date(new Date(sx+'T12:00:00Z').getTime()+864e5));
  await p.evaluate(()=>__T.go('rhfunc')); await H.dorme(200); await p.click('[data-act="rh-fusel"]:has-text("ANA SOUZA")'); await H.dorme(250); await p.click('.rh-v2d [data-act="rh-pess"]'); await H.dorme(300); await p.click('[data-act="rh-fernova"]'); await H.dorme(400);
  await p.fill('#rh-feri',sx); await p.dispatchEvent('#rh-feri','change'); await H.dorme(400); const ff=await view();
  ok('Feriados na agenda do RH e aviso da CLT ao marcar férias numa sexta (2 dias antes do domingo)', /Feriado[\s\S]*Ponte da Consciência Negra|Feriado: /.test(ag)&&/não podem começar nos 2 dias antes de feriado ou do domingo/.test(ff), ag.replace(/\n/g,' | ').slice(0,200));
  await p.click('[data-act="rh-ferx"]').catch(()=>{});

  /* 1 · ficha pelo celular */
  await p.evaluate(()=>__T.go('rhvagas')); await H.dorme(400); await p.click('[data-act="rh-vgv"][data-v="adm"]'); await H.dorme(400); /* "Admissões" agora fica em Admissões e vagas › Em admissão */
  await p.click('.rh-fcel [data-act="rh-convnovo"]'); await H.dorme(300); await p.fill('#rh-convn','Diego'); await p.fill('#rh-convmsg','Oi, {NOME}! Começa segunda às 7h. Traga a carteira de trabalho.'); await p.click('[data-act="rh-convcriar"]'); await H.dorme(700);
  const link=await p.inputValue('#rh-convu'); const tok=(link.match(/c=([a-z0-9]{20})$/)||[])[1]; const temQr=await p.$$eval('.rh-convq svg',x=>x.length);
  S=await srv(); ok('Ficha pelo celular: o RH cria o link (com QR e WhatsApp) e o convite fica guardado', !!tok&&temQr===1&&S['rh/dados/convites/'+tok]&&S['rh/dados/convites/'+tok].nome==='Diego'&&S['rh/dados/convites/'+tok].msg==='Oi, {NOME}! Começa segunda às 7h. Traga a carteira de trabalho.'&&/Oi, Diego! Começa segunda às 7h/.test(await p.evaluate(()=>document.querySelector('.rh-convm').innerText))&&(S['rh/config']||{}).convMsg&&/ficha\.html\?c=/.test(link), link);
  await p.click('[data-act="rh-convx"]'); await H.dorme(200);
  /* o celular do candidato (outro aparelho: banco copiado) */
  const B2=await H.abrir({viewport:{width:390,height:844}}); const q=B2.page; await H.preparar(q,{docs:S,users:{}});
  await q.goto(H.BASE+'ficha.html?c='+tok); await H.dorme(1200); const ola=await q.evaluate(()=>document.body.innerText);
  await q.fill('#nome','Diego Santos Silva'); await q.fill('#cpf','86288366757'); await q.fill('#nascimento','1998-03-04'); await q.fill('#telefone','51988887777');
  await q.fill('#rua','Rua A'); await q.fill('#numero','100'); await q.fill('#bairro','Centro'); await q.selectOption('#camisa','G'); await q.fill('#calcado','41'); await q.fill('#pix','diego@x.com'); await q.fill('#emergNome','Ana, mãe');
  await q.setInputFiles('input[data-doc="RG"]',{name:'rg.png',mimeType:'image/png',buffer:PNG}); await H.dorme(800);
  await q.click('.go'); await H.dorme(400); const er1=await q.evaluate(()=>document.getElementById('er').innerText); await q.check('#ok'); await q.click('.go'); await H.dorme(1500);
  const fim=await q.evaluate(()=>document.body.innerText), S2=await q.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs);
  const fd=S2['rh/dados/fichascand/'+tok], ph=Object.keys(S2).filter(k=>k.startsWith('rh/dados/fichascandarq/'+tok+'-'));
  ok('Celular: abre sem login, mostra o recado do RH, pede a confirmação, envia os dados e a foto do documento', /Olá, Diego!/.test(ola)&&/RECADO DO RH\s*Oi, Diego! Começa segunda às 7h\. Traga a carteira de trabalho\./.test(ola)&&/Marque a confirmação/.test(er1)&&/Ficha enviada/.test(fim)&&fd&&fd.cpf==='86288366757'&&fd.fotos===1&&ph.length===1&&S2[ph[0]].nome==='RG'&&S2[ph[0]].d.length>20, fim.replace(/\n/g,' | ').slice(0,200));
  const e2=B2.erros.filter(x=>!/404|cdnjs/.test(x)); await B2.browser.close();
  /* chega no RH */
  await p.evaluate(s=>{ const o=JSON.parse(localStorage.getItem('__srv')); o.docs=s; localStorage.setItem('__srv',JSON.stringify(o)); window.__mockReconnect&&window.__mockReconnect(); },S2); await H.dorme(900);
  const adm=await view(); await p.evaluate(()=>__T.go('rhinicio')); await H.dorme(400); const ini=await view();
  ok('A ficha aparece em Admissões e no "Precisa de você" do Início', /Fichas pelo celular[\s\S]*Diego Santos Silva[\s\S]*Começar admissão/.test(adm)&&/Ficha preenchida pelo celular: Diego Santos Silva/.test(ini), ini.replace(/\n/g,' | ').slice(0,200));
  await p.click('[data-act="rh-fcver"]'); await H.dorme(300); const mv=await p.evaluate(()=>document.querySelector('.rh-mbox').innerText);
  await p.click('.rh-mbox [data-act="rh-fcusar"]'); await H.dorme(500);
  const pre=await p.evaluate(()=>({n:document.querySelector('[data-rh-f="nome"]').value,c:document.querySelector('[data-rh-f="cpf"]').value,e:document.querySelector('[data-rh-f="endereco"]').value,t:document.querySelector('[data-rh-f="calcado"]').value,h:document.querySelector('.rh-form h2').innerText}));
  await p.fill('[data-rh-f="setor"]','Expedição'); await p.click('[data-act="rh-salvar"]'); await H.dorme(1800); S=await srv();
  const nf=Object.entries(S).find(([k,v])=>k.startsWith('rh/dados/funcionarios/')&&v.cpf==='86288366757'); const nv=nf&&nf[1];
  ok('Começar admissão: cadastro já preenchido; ao salvar guarda a foto, marca o RG entregue e fecha o link', /Ficha de Diego Santos Silva[\s\S]*Chave PIX[\s\S]*diego@x\.com/.test(mv)&&pre.n==='DIEGO SANTOS SILVA'&&pre.c==='862.883.667-57'&&/Rua A, 100 · Centro/.test(pre.e)&&pre.t==='41'&&/Nova admissão/.test(pre.h)
    &&nv&&nv.admRoteiro&&nv.pix==='diego@x.com'&&nv.nascimento==='1998-03-04'&&(nv.admEntregues||[]).some(x=>x.nome==='RG'&&/rhfile=/.test(x.url||''))&&S['rh/dados/fichascand/'+tok].usada===true&&!S['rh/dados/convites/'+tok]&&!Object.keys(S).some(k=>k.startsWith('rh/dados/fichascandarq/')),
    JSON.stringify({pre,ent:nv&&nv.admEntregues,usada:S['rh/dados/fichascand/'+tok]&&S['rh/dados/fichascand/'+tok].usada}).slice(0,300));
  /* link usado: o celular mostra que não vale mais */
  const B3=await H.abrir({viewport:{width:390,height:844}}); const q3=B3.page; await H.preparar(q3,{docs:S,users:{}}); await q3.goto(H.BASE+'ficha.html?c='+tok); await H.dorme(1000);
  const vl=await q3.evaluate(()=>document.body.innerText); await B3.browser.close();
  ok('Link já usado: o celular avisa que não vale mais', /não vale mais/.test(vl), vl.slice(0,120));
  const e=B.erros.concat(e2).filter(x=>!/404|cdnjs/.test(x)); await B.browser.close(); ok('Nenhum erro de JavaScript', !e.length, e.join(' | '));
  const f=res.filter(x=>!x.ok).length; console.log(f?'FALHOU ('+f+')':'PASSOU — '+res.length+' verificações'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); console.log('FALHOU'); process.exit(1); });
