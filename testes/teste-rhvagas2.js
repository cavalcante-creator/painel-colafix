/* 30/10: Admissões e vagas — sem item repetido ao salvar, apagar vaga e candidato, aviso de nome repetido, trocar de vaga,
   ficha pelo celular dentro da vaga (mandar, ver link, chegou, começar admissão com a ficha + função/setor da vaga). */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs;
 d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/config']={setores:['Linha 1','Expedição']}; D['rh/dados/funcoes/fn1']={nome:'Operador de produção',epis:[]};
 const B=await H.abrir({viewport:{width:1440,height:900}}); const p=B.page; let resp=true, dlg=[]; p.on('dialog',x=>{ dlg.push(x.message()); resp?x.accept():x.dismiss(); });
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(3000);
 const srv=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__srv')).docs), view=()=>p.evaluate(()=>document.getElementById('view').innerText), col=async c=>Object.entries(await srv()).filter(([k])=>k.startsWith(c+'/')).map(([k,v])=>Object.assign({_k:k,_id:k.split('/').pop()},v));
 const nova=async(fn,st)=>{ await p.click('[data-act="rhv-vnova"]'); await H.dorme(300); await p.fill('#rhv-fn',fn); await p.fill('#rhv-st',st); await p.click('[data-act="rhv-vok"]'); await H.dorme(800); };
 const cand=async(nm,tel)=>{ await p.click('[data-act="rhv-cnovo"]'); await H.dorme(300); await p.fill('#rhv-cn',nm); if(tel) await p.fill('#rhv-ct',tel); await p.click('[data-act="rhv-cok"]'); await H.dorme(800); };
 await p.evaluate(()=>__T.go('rhvagas')); await H.dorme(1000);
 await nova('Administrador','Administrativo'); await cand('aaza');
 let n=await p.evaluate(()=>({v:document.querySelectorAll('.rhv-v').length,c:document.querySelectorAll('.rhv-cd').length}));
 ok('Salvar não repete: 1 vaga e 1 candidato na tela', n.v===1&&n.c===1, JSON.stringify(n));
 resp=false; await cand('Aaza '); n=await p.evaluate(()=>document.querySelectorAll('.rhv-cd').length); let cs=await col('rh/dados/candidatos');
 ok('Nome repetido na vaga: pergunta e, cancelando, não grava', cs.length===1&&n===1&&dlg.some(m=>/já está nesta vaga/.test(m)), dlg.join(' / ')); resp=true;
 await p.click('[data-act="rhv-cx"]').catch(()=>{}); await H.dorme(300);
 await p.click('[data-act="rhv-ced"]'); await H.dorme(300); await p.click('[data-act="rhv-cdel"]'); await H.dorme(800);
 cs=await col('rh/dados/candidatos'); n=await p.evaluate(()=>document.querySelectorAll('.rhv-cd').length);
 ok('Apagar candidato (na janela do candidato): some da tela e fica guardado como removido', cs.length===1&&cs[0].removido===true&&!!cs[0].removidoPor&&n===0, JSON.stringify(cs.map(c=>[c.nome,c.removido])));
 await cand('Bruno Teste'); await cand('Carla Teste'); await p.click('[data-act="rhv-vdel"]'); await H.dorme(1000);
 let vs=await col('rh/dados/vagasab'); cs=await col('rh/dados/candidatos'); let s=await view();
 ok('Apagar vaga: some da tela e leva os candidatos dela', vs.length===1&&vs[0].removido===true&&cs.filter(c=>!c.removido).length===0&&/Nenhuma vaga aberta/.test(s)&&dlg.some(m=>/os 2 candidatos dela/.test(m)), dlg[dlg.length-1]);
 /* trocar de vaga */
 await nova('Operador de produção','Linha 1'); await nova('Ajudante','Expedição'); await cand('Diego Silva','(51) 98888-7777');
 vs=(await col('rh/dados/vagasab')).filter(v=>!v.removido); const vOp=vs.find(v=>v.funcao==='Operador de produção'), vAj=vs.find(v=>v.funcao==='Ajudante');
 await p.click('[data-act="rhv-ced"]'); await H.dorme(300); await p.selectOption('#rhv-cvg',vOp._id); await p.click('[data-act="rhv-cok"]'); await H.dorme(800);
 cs=(await col('rh/dados/candidatos')).filter(c=>!c.removido); ok('Trocar o candidato de vaga', cs.length===1&&cs[0].vagaId===vOp._id, cs[0]&&cs[0].vagaId);
 /* ficha pelo celular */
 await p.click(`[data-act="rhv-sel"][data-id="${vOp._id}"]`); await H.dorme(500); const did=cs[0]._id;
 await p.click(`[data-act="rhv-ficha"][data-id="${did}"]`); await H.dorme(1000);
 cs=(await col('rh/dados/candidatos')).filter(c=>!c.removido); const tok=cs[0].conv, cv=await col('rh/dados/convites'); s=await view();
 const waBtn=await p.$('[data-act="rh-convwa"]');
 ok('"Mandar ficha": cria o convite, guarda no candidato e abre o link com QR', !!tok&&cv.some(c=>c._id===tok&&c.nome==='Diego Silva')&&/Link pronto/.test(s)&&!!waBtn, tok);
 await p.evaluate(()=>{ window.__abriu=''; window.open=u=>{ window.__abriu=u; return null; }; }); await waBtn.click(); await H.dorme(300); const wurl=await p.evaluate(()=>window.__abriu);
 ok('WhatsApp do link vai direto para o telefone do candidato', /^https:\/\/wa\.me\/5551988887777\?text=/.test(wurl)&&/ficha\.html\?c=/.test(decodeURIComponent(wurl)), wurl.slice(0,80));
 await p.click('[data-act="rh-convx"]'); await H.dorme(400); s=await view();
 ok('Cartão mostra "Ficha enviada · esperando" e "Ver link da ficha"', /Ficha enviada · esperando/i.test(s)&&!!(await p.$(`[data-act="rhv-fver"][data-id="${did}"]`)));
 /* a ficha chega (como o ficha.html grava) */
 await p.evaluate(t=>Painel.db().doc('rh/dados/fichascand/'+t).set({nome:'Diego Silva',cpf:'52998224725',nascimento:'1998-03-04',telefone:'(51) 98888-7777',pix:'diego@x.com',fotos:2,em:new Date().toISOString()}),tok); await H.dorme(1200);
 s=await view(); ok('Quando a ficha chega: "Ficha chegou · 2 fotos" e "Ver ficha"', /Ficha chegou · 2 fotos/i.test(s)&&!!(await p.$(`[data-act="rhv-fler"][data-id="${did}"]`)), (s.match(/Ficha[^\n]*/i)||[''])[0]);
 ok('Ficha ligada ao candidato não aparece no aviso de fichas soltas', !/fichas? pelo celular cheg/i.test(s));
 await p.click(`[data-act="rhv-fler"][data-id="${did}"]`); await H.dorme(500); s=await view(); ok('"Ver ficha" abre a ficha recebida', /Ficha de Diego Silva/.test(s)&&/diego@x\.com/.test(s)); await p.click('[data-act="rh-fcx"]'); await H.dorme(300);
 for(let i=0;i<3;i++){ await p.click(`[data-act="rhv-et"][data-id="${did}"]:not(.lnk)`); await H.dorme(500); }
 await p.click(`[data-act="rhv-adm"][data-id="${did}"]`); await H.dorme(1200);
 const st=await p.evaluate(()=>({v:__T.S().view,h:document.getElementById('view').innerHTML}));
 const fv=await p.evaluate(()=>{ const g=i=>{ const x=document.getElementById(i); return x?x.value:null; }; return [...document.querySelectorAll('#view input,#view select')].map(x=>x.value).join('|'); });
 cs=(await col('rh/dados/candidatos')).filter(c=>!c.removido);
 ok('"Começar admissão" usa a ficha do celular (CPF, PIX) e a função/setor da vaga; candidato admitido', st.v==='rhfunc'&&/529\.982\.247-25/.test(fv)&&/diego@x\.com/.test(fv)&&/Operador de produção/.test(fv)&&/Linha 1/.test(fv)&&cs[0].etapa==='admitido', fv.slice(0,300));
 /* ficha solta (sem candidato) aparece como aviso na tela das vagas */
 await p.evaluate(()=>Painel.db().doc('rh/dados/fichascand/tok2solta').set({nome:'Elisa Souza',cpf:'11144477735',em:new Date().toISOString()})); await p.evaluate(()=>__T.go('rhvagas')); await H.dorme(1000); s=await view();
 ok('Ficha pelo celular sem candidato: aviso na tela das vagas + botão "Ficha pelo celular" no topo', /1 ficha pelo celular chegou/i.test(s)&&/Elisa Souza/.test(s)&&!!(await p.$('[data-act="rh-convnovo"]')), (s.match(/[^\n]*ficha pelo celular cheg[^\n]*/i)||[''])[0]);
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
