/* Varredura: para cada tipo de login, abre todas as telas que ele pode ver e procura erros, tela vazia e rolagem lateral no celular. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs');
const PERFIS=[['iasmyn','senha123',null],['operador','ope123',null],['tecnico','tec123',null],
 ['almox','x12345',{perfil:'almoxpmx',mods:['premix','almox'],locais:['a3'],contar:true}],['rh','x12345',{perfil:'rh',mods:['rh']}],
 ['chefe','x12345',{perfil:'gestor',mods:['gestor','producao','silos','manut','telas','analise']}],['tvfab','x12345',{perfil:'tvtodas',mods:['tv','telas','cal','analise','producao','silos','manut']}],
 ['tablet','x12345',{perfil:'tablet',mods:['tablet']}],['celalmox','x12345',{perfil:'almoxcel',mods:['almoxcel']}],['fernando','x12345',{perfil:'consulta',mods:['silosver','cal'],linhas:['Linha 1']}],['silos','x12345',{perfil:'silosver',mods:['silosver']}]];
const SEL=process.argv.slice(2); (async()=>{ const {d}=seedManut(); const D=d.docs; const hs=new Date().toISOString().slice(0,10);
 D['ordens/5001'].rancho='123456'; D['ranchos/123456']={numero:'123456',criadoEm:new Date().toISOString(),ordens:[{num:'5001'}],itens:[{c:'MP001',d:'Cimento',um:'kg',q:500}]};
 D['rh/dados/funcionarios/f1']={nome:'ANA SOUZA',cpf:'52998224725',funcao:'Operador',setor:'Linha 1',empresa:'COLAFIX',status:'Ativo',tipo:'CLT'};
 D['chamados/os-00001']={numero:1,linha:'Linha 1',defeito:'teste',impacto:'parou',nome:'Ana',status:'Aberta',criado:new Date().toISOString()};
 PERFIS.forEach(([u,pw,ac],i)=>{ if(!ac) return; const uid='uV'+i; d.users[u+'@painel-colafix.app']={uid,pass:pw,nome:u}; D['perfis/'+uid]={nome:u,usuario:u}; D['acessos/'+uid]=Object.assign({locais:[],ativo:true},ac); });
 const rel=[];
 for(const [u,pw] of PERFIS.filter(x=>!SEL.length||SEL.includes(x[0]))){ for(const vp of [[1366,900],[390,844]]){ const B=await H.abrir({negarCamera:true,viewport:{width:vp[0],height:vp[1]}}); const p=B.page; const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
   await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,u,pw); await H.dorme(3500);
   const telas=await p.evaluate(()=>{ const S=__T.S(); const vs=Object.keys(window.__VIEWS||{}); return vs; });
   const vs=await p.evaluate(()=>{ try{ return __T.views().filter(v=>__T.vo(v)); }catch(e){ return []; } });
   for(const v of vs){ const n0=erros.length; await p.evaluate(v=>__T.go(v),v); await H.dorme(350);
     const r=await p.evaluate(()=>{ const el=document.getElementById('view'); const t=(el&&el.innerText)||''; return {len:t.trim().length,falha:/Não foi possível mostrar|undefined|NaN|\[object Object\]/.test(t),lado:document.documentElement.scrollWidth>innerWidth+2,
        trecho:(t.match(/.{0,30}(Não foi possível mostrar|undefined|NaN|\[object Object\]).{0,30}/)||[''])[0]}; });
     const prob=[]; if(erros.length>n0) prob.push('ERRO JS: '+erros.slice(n0).join(' | ')); if(r.len<15&&v!=='mantotem') prob.push('tela vazia'); if(r.falha) prob.push('texto estranho: '+r.trecho); if(r.lado&&vp[0]<500) prob.push('rolagem lateral no celular');
     if(prob.length) rel.push(`${u} · ${vp[0]<500?'celular':'PC'} · ${v}: ${prob.join(' ; ')}`); }
   rel.push(`(ok) ${u} · ${vp[0]<500?'celular':'PC'}: ${vs.length} telas verificadas`);
   await B.browser.close(); } }
 fs.appendFileSync('/tmp/varredura.txt',rel.join('\n')+'\n'); console.log(rel.filter(x=>!x.startsWith('(ok)')).length+' problema(s)'); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
