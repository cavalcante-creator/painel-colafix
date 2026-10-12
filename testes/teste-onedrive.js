const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; d.users['rh@painel-colafix.app']={uid:'uRH',pass:'rh1234',nome:'Paula RH'}; D['perfis/uRH']={nome:'Paula RH',usuario:'rh'}; D['acessos/uRH']={perfil:'rh',mods:['rh'],locais:[],ativo:true};
 D['rh/dados/funcionarios/a']={nome:'ANA SOUZA',cpf:'52998224725',funcao:'Mecânico',setor:'Linha 1',empresa:'COLAFIX',status:'Ativo',tipo:'CLT'};
 D['rh/dados/funcoes/x']={nome:'Mecânico',epis:[{nome:'Luva',ca:'111'}],uniformes:[{nome:'Camisa',tam:'G'}]};
 D['config/geral'].onedrive={ativo:true,clientId:'11111111-2222-3333-4444-555555555555',tenant:'',pasta:'Fichas EPI e Uniforme',link:''};
 // ---- Microsoft simulada ----
 const drive={}; let autorizacoes=0, semToken=0;
 const B=await H.abrir({viewport:{width:1366,height:1000}}); const p=B.page; const ctx=B.ctx;
 await H.preparar(p,d);
 await ctx.route(/\/modulos\/onedrive\.html/,r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(H.RAIZ+'/modulos/onedrive.html','utf8')}));
 await ctx.route('https://login.microsoftonline.com/**',async r=>{ const u=new URL(r.request().url());
   if(u.pathname.endsWith('/authorize')){ autorizacoes++; const dest=u.searchParams.get('redirect_uri')+'?code=CODIGO&state='+u.searchParams.get('state'); return r.fulfill({status:200,contentType:'text/html',body:'<script>location.replace('+JSON.stringify(dest)+')</script>'}); }
   if(u.pathname.endsWith('/token')){ const b=new URLSearchParams(r.request().postData()); const okv=b.get('grant_type')==='authorization_code'?(b.get('code')==='CODIGO'&&b.get('code_verifier')&&b.get('client_id')==='11111111-2222-3333-4444-555555555555'):true;
     return r.fulfill({status:okv?200:400,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(okv?{access_token:'AT1',refresh_token:'RT1',expires_in:3600}:{error:'invalid_grant'})}); } });
 await ctx.route('https://graph.microsoft.com/**',async r=>{ const req=r.request(), u=new URL(req.url()), cors={'access-control-allow-origin':'*'};
   if(req.method()==='OPTIONS') return r.fulfill({status:204,headers:Object.assign({'access-control-allow-headers':'*','access-control-allow-methods':'*'},cors)});
   if(req.headers()['authorization']!=='Bearer AT1'){ semToken++; return r.fulfill({status:401,headers:cors,body:'{}'}); }
   const path=decodeURIComponent(u.pathname.replace('/v1.0',''));
   if(path==='/me') return r.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify({userPrincipalName:'rh@empresa.com.br'})});
   let m;
   if((m=path.match(/^\/me\/drive\/root:\/(.+):\/content$/))&&req.method()==='PUT'){ const pp=m[1]; drive[pp]={b:req.postDataBuffer(),mime:req.headers()['content-type'],em:new Date().toISOString()}; const ps=pp.split('/');
     return r.fulfill({status:201,contentType:'application/json',headers:cors,body:JSON.stringify({name:ps.pop(),webUrl:'https://empresa-my.sharepoint.com/'+encodeURI(pp),parentReference:{name:ps.pop()}})}); }
   if((m=path.match(/^\/me\/drive\/root:\/(.+):\/children$/))){ const pre=m[1]+'/'; const v=Object.keys(drive).filter(k=>k.startsWith(pre)&&!k.slice(pre.length).includes('/')).map(k=>({name:k.slice(pre.length),webUrl:'https://empresa-my.sharepoint.com/'+encodeURI(k),file:{mimeType:drive[k].mime},lastModifiedDateTime:drive[k].em}));
     return v.length?r.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify({value:v})}):r.fulfill({status:404,headers:cors,body:'{}'}); }
   if((m=path.match(/^\/me\/drive\/root:\/(.+):\/search\(q='(.*)'\)$/))){ const q=decodeURIComponent(m[2]).toLowerCase(); const v=Object.keys(drive).filter(k=>k.startsWith(m[1]+'/')&&k.toLowerCase().includes(q)).map(k=>{ const ps=k.split('/'); return {name:ps[ps.length-1],webUrl:'https://empresa-my.sharepoint.com/'+encodeURI(k),file:{},parentReference:{name:ps[ps.length-2]},lastModifiedDateTime:drive[k].em}; });
     return r.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify({value:v})}); }
   return r.fulfill({status:404,headers:cors,body:'{}'}); });
 await p.goto(H.BASE); await H.entrar(p,'rh','rh1234'); await H.dorme(2500);
 await p.evaluate(()=>__T.go('rhfichas')); await H.dorme(1500);
 const b0=await p.evaluate(()=>(document.querySelector('.banner')||{}).innerText||'');
 const [pop]=await Promise.all([p.waitForEvent('popup'),p.click('[data-act="od-con"]')]); await H.dorme(2500);
 const b1=await p.evaluate(()=>(document.querySelector('.banner')||{}).innerText||'');
 ok('RH conecta a conta Microsoft (login oficial com PKCE) e a tela mostra a conta e a pasta', /Conecte sua conta Microsoft/.test(b0)&&autorizacoes===1&&/OneDrive de rh@empresa\.com\.br/.test(b1)&&/Fichas EPI e Uniforme/.test(b1), b1.replace(/\n/g,' '));
 let fr=p.frames().find(f=>/rh-fichas/.test(f.url())); await H.dorme(1500);
 await fr.evaluate(()=>{ const s=document.getElementById('upload-funcionario'); s.selectedIndex=[...s.options].findIndex(o=>/ANA/.test(o.text)); });
 await fr.setInputFiles('#upload-arquivo','foto-a.png'); await fr.click('#btn-enviar-ficha'); await H.dorme(1500);
 const up=await fr.evaluate(()=>document.getElementById('upload-msg').innerHTML); const k=Object.keys(drive)[0]||'';
 const painelArq=await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('__srv')).docs).filter(x=>x.startsWith('rh/arquivos/')).length);
 const mes=new Date().toISOString().slice(0,7);
 ok('Ficha escaneada vai para o OneDrive na pasta do mês, com o mesmo conteúdo, e o painel não guarda cópia', new RegExp('^Fichas EPI e Uniforme/'+mes+' [A-ZÇ][a-zç]+/ANA SOUZA - ').test(k)&&drive[k]&&drive[k].b.equals(fs.readFileSync('foto-a.png'))&&painelArq===0&&/sharepoint\.com/.test(up), k);
 await fr.click('#btn-atualizar-status-mes'); await H.dorme(800); const stm=await fr.evaluate(()=>(document.body.innerText.match(/\d+ de \d+ já têm ficha escaneada[^\n]*/)||[''])[0]);
 await fr.fill('#busca-drive-input, input[id*="busca"]','ana').catch(()=>{}); await fr.click('#btn-buscar-drive').catch(()=>{}); await H.dorme(800);
 const busca=await fr.evaluate(()=>(document.querySelector('.drive-result')||{}).innerText||'');
 ok('Status do mês e busca leem do OneDrive', /1 de 1/.test(stm)&&/ANA SOUZA/.test(busca), stm+' · '+busca);
 // a prévia não se perde quando o painel redesenha
 await fr.evaluate(()=>{ const s=document.getElementById('select-funcionario'); s.selectedIndex=[...s.options].findIndex(o=>/ANA/.test(o.text)); s.dispatchEvent(new Event('change')); }); await fr.click('#btn-gerar'); await H.dorme(700);
 await p.evaluate(()=>{ __T.go('rhfichas'); }); await H.dorme(400); await p.evaluate(()=>{ __T.go('rhfichas'); }); await H.dorme(600);
 fr=p.frames().find(f=>/rh-fichas/.test(f.url())); const prev=await fr.evaluate(()=>document.getElementById('preview-wrap').innerText.length);
 ok('A prévia gerada continua lá depois de o painel redesenhar a tela', prev>200, 'tamanho da prévia: '+prev);
 await p.click('[data-act="od-sair"]'); await H.dorme(500); const b2=await p.evaluate(()=>(document.querySelector('.banner')||{}).innerText||'');
 await fr.setInputFiles('#upload-arquivo','foto-b.png'); await fr.click('#btn-enviar-ficha'); await H.dorme(1200); const up2=await fr.evaluate(()=>document.getElementById('upload-msg').innerText);
 ok('Desconectado: pede para conectar e o envio é recusado com aviso claro', /Conectar ao OneDrive/.test(b2)&&/Conecte o OneDrive/.test(up2)&&Object.keys(drive).length===1, up2);
 console.log('erros:',B.erros.filter(x=>!/404|cdnjs|401/.test(x))); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
