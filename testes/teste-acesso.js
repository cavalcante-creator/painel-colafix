const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const ago=m=>new Date(Date.now()-m*60000).toISOString();
 D['paradas/p1']={linha:'Linha 1',motivo:'Outros',inicio:ago(100),fim:ago(90)};
 D['chamados/os-00001']={numero:1,linha:'Linha 2',defeito:'Compressor',impacto:'nao',nome:'Ana',status:'Aberta',criado:ago(30)};
 D['silos/c1']={saldoKg:6000,medidoKg:6000,medidoEm:ago(10),atualizadoEm:ago(10),origem:'medicao'};
 const srv=pg=>pg.evaluate(()=>JSON.parse(localStorage.getItem('__srv')));
 // ---- administradora ajusta a operadora ----
 let B=await H.abrir(); let p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(1800);
 await p.evaluate(()=>{ __T.S().eq.aba='pessoas'; __T.go('acessos'); }); await H.dorme(400);
 await p.click('[data-act="acs-editar"][data-id="uOPE"]'); await H.dorme(400);
 const temSecao=await p.evaluate(()=>!!document.querySelector('#acx-uOPE'));
 await p.click('[data-act="acx-mod"][data-id="uOPE"][data-k="silos"][data-v="ver"]'); await H.dorme(150);
 await p.check('[data-acx-tela="manch"][data-id="uOPE"]'); await H.dorme(150);
 await p.uncheck('[data-acx-acao="programar"][data-id="uOPE"]'); await H.dorme(150); await p.uncheck('[data-acx-acao="apagar"][data-id="uOPE"]'); await H.dorme(150);
 await p.click('[data-act="acx-salvar"][data-id="uOPE"]'); await H.dorme(700);
 let s=await srv(p); let a=s.docs['acessos/uOPE'];
 ok('Editor "Ajustes desta pessoa" salva módulo extra só-ver, tela avulsa e ações', temSecao&&JSON.stringify(a.soVerMods)==='["silos"]'&&JSON.stringify(a.extras)==='["silos"]'&&JSON.stringify(a.telas)==='["manch"]'&&a.acoes.programar===false&&a.acoes.apagar===false,
   JSON.stringify({extras:a.extras,soVer:a.soVerMods,telas:a.telas,acoes:a.acoes}));
 ok('Para as regras do banco: coleções bloqueadas calculadas certo (ordens liberadas para marcar etapas do rancho)', ['previsoes','itens','medicoes','cargas','premix'].every(c=>a.bloqCols.includes(c))&&!a.bloqCols.includes('ordens')&&!a.bloqCols.includes('entregas')&&!a.bloqCols.includes('chamados')&&!a.bloqCols.includes('silos'), JSON.stringify(a.bloqCols));
 await p.evaluate(()=>{ __T.S().acs.ed=null; __T.go('acessos'); }); await H.dorme(300);
 const selo=await p.evaluate(()=>/ajustado/.test((document.querySelector('[data-act="acs-editar"][data-id="uOPE"]')||{}).innerText||''));
 await p.selectOption('select[data-eq-cargo="uOPE"]','linha'); await H.dorme(700); await p.selectOption('select[data-eq-cargo="uOPE"]','producao'); await H.dorme(900);
 s=await srv(p); a=s.docs['acessos/uOPE'];
 ok('Cartão mostra "ajustado" e trocar o cargo não apaga os ajustes', selo&&a.perfil==='producao'&&JSON.stringify(a.telas)==='["manch"]'&&a.acoes.programar===false, a.perfil+' · '+JSON.stringify(a.telas));
 // técnico: manutenção só ver, mas pode concluir
 await p.click('[data-act="acs-editar"][data-id="uTEC"]'); await H.dorme(400);
 await p.click('[data-act="acx-mod"][data-id="uTEC"][data-k="manut"][data-v="ver"]'); await H.dorme(150); await p.check('[data-acx-acao="concluir"][data-id="uTEC"]'); await H.dorme(150);
 await p.click('[data-act="acx-salvar"][data-id="uTEC"]'); await H.dorme(700);
 d.docs=(await srv(p)).docs; await B.browser.close();
 // ---- operadora ----
 B=await H.abrir(); p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'operador','ope123'); await H.dorme(2500);
 const nav=await p.evaluate(()=>document.getElementById('navlist').innerText.replace(/\n/g,'|'));
 await p.evaluate(()=>{ const d=__T.S().acs.doc; d.telas=(d.telas||[]).concat(['mancrachas']); }); /* mesmo se alguém gravar uma tela proibida */
 const telas=[]; for(const v of ['geral','manch','manequip','manprev','mancrachas']){ await p.evaluate(v=>__T.go(v),v); await H.dorme(200); telas.push(v+'→'+await p.evaluate(()=>__T.S().view)); }
 ok('Vê Silos (extra) e só a tela Chamados da Manutenção (avulsa), não as outras', /Silos/.test(nav)&&/Manutenção/.test(nav)&&telas[0]==='geral→geral'&&telas[1]==='manch→manch'&&!telas[2].endsWith('manequip')&&!telas[3].endsWith('manprev')&&!telas[4].endsWith('mancrachas'), nav+' · '+telas.join(' '));
 await p.evaluate(()=>{ __T.S().siloSel='c1'; __T.go('silos'); }); await H.dorme(400);
 const ban=await p.evaluate(()=>!!document.querySelector('.acx-sover'));
 const r=await p.evaluate(async()=>{ const S=__T.S(), out={};
   const t=async(k,f)=>{ try{ await f(); out[k]='gravou'; }catch(e){ out[k]=e&&e.code||'erro'; } };
   await t('medicao',()=>S.db.collection('medicoes').add({em:new Date().toISOString(),itens:{c1:5}}));
   await t('ordem',()=>S.db.doc('ordens/5001').update({total:5}));
   await t('apagar parada',()=>S.db.doc('paradas/p1').delete());
   await t('apontar',()=>__T.salvar('entregas',{ordem:'5001',num:'5001',linha:'Linha 1',qtd:10,em:new Date().toISOString(),por:S.uid}).then(x=>{ if(!x) throw {code:'falhou'}; }));
   await t('abrir chamado',()=>S.db.doc('chamados/os-00099').set({numero:99,linha:'Linha 1',defeito:'teste',status:'Aberta',criado:new Date().toISOString()}));
   return out; });
 s=await srv(p);
 ok('Só ver em Silos: aviso na tela e medição recusada', ban&&r.medicao==='sem-permissao'&&!Object.keys(s.docs).some(k=>k.startsWith('medicoes/')), JSON.stringify(r));
 ok('Ações bloqueadas recusadas (editar ordem, apagar parada); o resto continua (apontar, abrir chamado)', r.ordem==='sem-permissao'&&r['apagar parada']==='sem-permissao'&&!!s.docs['paradas/p1']&&r.apontar==='gravou'&&r['abrir chamado']==='gravou'&&s.docs['ordens/5001'].total!==5, JSON.stringify(r));
 await p.evaluate(()=>{ const b=document.createElement('button'); b.id='tt1'; document.body.appendChild(b); }); 
 await B.browser.close();
 // ---- técnico: manutenção só ver + concluir ----
 B=await H.abrir(); p=B.page; await H.preparar(p,s); await p.goto(H.BASE); await H.entrar(p,'tecnico','tec123'); await H.dorme(2500);
 const rt=await p.evaluate(async()=>{ const S=__T.S(), out={}; const t=async(k,f)=>{ try{ await f(); out[k]='gravou'; }catch(e){ out[k]=e&&e.code||'erro'; } };
   await t('atender (só ver, sem concluir)',()=>S.db.doc('chamados/os-00001').update({status:'Em execução'}));
   await t('preencher atendimento',()=>S.db.doc('chamados/os-00001').update({exec:{causa:'Desgaste de peça',servicos:'troca',tecnico:'Pedro'}}));
   await t('concluir',()=>S.db.doc('chamados/os-00001').update({status:'Concluída',concluidoEm:new Date().toISOString()}));
   await t('cadastro (equipamento)',()=>S.db.doc('config/manut').update({x:1}));
   return out; });
 s=await srv(p);
 ok('Técnico com Manutenção "só ver" + ação "concluir": preenche e conclui a OS; mudar status e cadastros recusados', rt['atender (só ver, sem concluir)']==='sem-permissao'&&rt['preencher atendimento']==='gravou'&&rt.concluir==='gravou'&&s.docs['chamados/os-00001'].status==='Concluída'&&rt['cadastro (equipamento)']==='sem-permissao', JSON.stringify(rt));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
