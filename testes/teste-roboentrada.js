/* Robô da entrada da fábrica (robo-entrada/robo-entrada.js) com iDSecure e Firestore simulados. Só node. Dados inventados. */
const fs=require('fs'), path=require('path'), os=require('os'), https=require('https'), http=require('http'), {execSync,spawn}=require('child_process'), crypto=require('crypto');
const res=[]; const ok=(n,c,d)=>{ res.push(!!c); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const T=fs.mkdtempSync(path.join(os.tmpdir(),'roboent-')), SRC=path.join(__dirname,'..','robo-entrada','robo-entrada.js');
  fs.copyFileSync(SRC,path.join(T,'robo-entrada.js'));
  execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${T}/k.pem -out ${T}/c.pem -days 2 -subj /CN=idsecure 2>/dev/null`);
  const {privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048}); fs.writeFileSync(path.join(T,'chave-servico.json'),JSON.stringify({client_email:'robo@teste',private_key:privateKey.export({type:'pkcs8',format:'pem'})}));
  const hoje=new Date(), dd=n=>{ const d=new Date(hoje); d.setDate(d.getDate()-n); return d; }, br=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(), iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const csv='Código;Hora;Nome do usuário;RG;CPF;Grupo;Empresa;Departamento;Empresa Visitada;Autorização;Detalhes;Matrícula;Dispositivo;Área;Operador\n'+
    `1;${br(dd(1))} 07:31:00;CARLOS PEREIRA TESTE;;111.222.333-44;;ZENITH;;;Autorizado;;;ENTRADA FABRICA;Portaria;\n`+
    `2;${br(dd(1))} 17:25:00;CARLOS PEREIRA TESTE;;111.222.333-44;;ZENITH;;;Autorizado;;;ENTRADA FABRICA;Portaria;\n`+
    `3;${br(dd(1))} 12:00:00;CARLOS PEREIRA TESTE;;111.222.333-44;;ZENITH;;;Negado;;;ENTRADA FABRICA;Portaria;\n`;
  let pedRel=null, logins=0;
  const ids=https.createServer({key:fs.readFileSync(T+'/k.pem'),cert:fs.readFileSync(T+'/c.pem')},(q,r)=>{ let b=''; q.on('data',x=>b+=x); q.on('end',()=>{
    if(q.url.startsWith('/api/login')){ logins++; const j=JSON.parse(b); if(j.username==='rh'&&j.password==='segredo'){ r.writeHead(200,{'Content-Type':'application/json'}); return r.end(JSON.stringify({accessToken:'TK1'})); } r.writeHead(401); return r.end('{}'); }
    if(q.url.startsWith('/api/report/csv/global')){ pedRel={auth:q.headers.authorization,body:JSON.parse(b)}; r.writeHead(200,{'Content-Type':'text/csv'}); return r.end(Buffer.from(csv,'latin1')); }
    r.writeHead(404); r.end(); }); });
  const DB={}; const ptoM=iso(dd(1)).slice(0,7);
  DB['rh/dados/ponto/'+ptoM]={fields:{mes:{stringValue:ptoM},dias:{mapValue:{fields:{'2000-01-01':{mapValue:{fields:{}}}}}},imp:{arrayValue:{values:[]}}}};
  const fsv=http.createServer((q,r)=>{ let b=''; q.on('data',x=>b+=x); q.on('end',()=>{
    if(q.url==='/token'){ r.writeHead(200,{'Content-Type':'application/json'}); return r.end(JSON.stringify({access_token:'FS'})); }
    const m=q.url.match(/documents\/(.+)$/); const p=m&&decodeURIComponent(m[1]); if(q.headers.authorization!=='Bearer FS'){ r.writeHead(403); return r.end(); }
    if(q.method==='GET'){ if(!DB[p]){ r.writeHead(404); return r.end('{}'); } r.writeHead(200); return r.end(JSON.stringify(DB[p])); }
    if(q.method==='PATCH'){ DB[p]=JSON.parse(b); r.writeHead(200); return r.end(b); } r.writeHead(400); r.end(); }); });
  await new Promise(x=>ids.listen(0,x)); await new Promise(x=>fsv.listen(0,x));
  const F={projeto:'p',chave:'chave-servico.json',base:'http://127.0.0.1:'+fsv.address().port+'/v1',tokenUrl:'http://127.0.0.1:'+fsv.address().port+'/token'};
  const cfg=x=>fs.writeFileSync(path.join(T,'config.json'),JSON.stringify(Object.assign({idsecure:{url:'https://127.0.0.1:'+ids.address().port,usuario:'rh',senha:'segredo'},pasta:path.join(T,'pasta'),dias:3,firebase:F},x||{})));
  fs.mkdirSync(path.join(T,'pasta')); cfg();
  const roda=()=>new Promise(r=>{ const c=spawn(process.execPath,['robo-entrada.js'],{cwd:T,stdio:'pipe'}); c.on('exit',x=>r(x)); });
  const R=require(path.join(T,'robo-entrada.js')), lerDoc=p=>DB[p]?R.vDec({mapValue:{fields:DB[p].fields}}):null;
  let st=await roda(), P=lerDoc('rh/dados/ponto/'+ptoM), d1=iso(dd(1));
  ok('Entra no iDSecure e pede o relatório com o token, do período (hora do relógio)', pedRel&&pedRel.auth==='Bearer TK1'&&pedRel.body.end>pedRel.body.start&&pedRel.body.cols.length===15, JSON.stringify(pedRel&&{a:pedRel.auth,s:pedRel.body.start,e:pedRel.body.end}));
  ok('Grava em rh/dados/ponto no formato do painel (só autorizados) e mantém o que já estava', st===0&&P&&P.dias[d1]&&P.dias[d1]['11122233344'].t.join()==='07:31:00 ENTRADA FABRICA,17:25:00 ENTRADA FABRICA'&&('2000-01-01' in P.dias)&&P.imp.slice(-1)[0].auto===true, JSON.stringify(P&&P.dias[d1]));
  const S=lerDoc('rh/dados/robo/entrada'); ok('Status do robô em rh/dados/robo/entrada', S&&S.ok===true&&S.passagens===2&&/iDSecure/.test(S.origem), JSON.stringify(S));
  ok('Guardou o certificado do iDSecure na 1ª conexão', fs.existsSync(path.join(T,'entrada-certificado.txt')));
  /* roda de novo: não duplica */
  await roda(); P=lerDoc('rh/dados/ponto/'+ptoM); ok('Rodar de novo não repete passagens', P.dias[d1]['11122233344'].t.length===2, P.dias[d1]['11122233344'].t.join());
  /* CSV na pasta */
  fs.writeFileSync(path.join(T,'pasta','manual.csv'),csv.replace(/07:31:00/,'07:31:00').replace('17:25:00','18:02:00'));
  await roda(); P=lerDoc('rh/dados/ponto/'+ptoM);
  ok('CSV deixado na pasta entra e vai para "enviados"', P.dias[d1]['11122233344'].t.length===3&&fs.readdirSync(path.join(T,'pasta','enviados')).length===1&&!fs.existsSync(path.join(T,'pasta','manual.csv')), P.dias[d1]['11122233344'].t.join());
  /* certificado mudou: para sem mandar a senha */
  fs.writeFileSync(path.join(T,'entrada-certificado.txt'),'AA:BB'); const l0=logins; st=await roda();
  const S2=lerDoc('rh/dados/robo/entrada'); ok('Certificado diferente: para, não manda a senha e marca o erro no status', logins===l0&&S2.ok===false&&/certificado/i.test(S2.erro), S2.erro);
  /* senha errada */
  fs.unlinkSync(path.join(T,'entrada-certificado.txt')); cfg({idsecure:{url:'https://127.0.0.1:'+ids.address().port,usuario:'rh',senha:'errada'}}); await roda();
  ok('Senha errada vira erro claro no status', /Não entrou no iDSecure/.test(lerDoc('rh/dados/robo/entrada').erro), lerDoc('rh/dados/robo/entrada').erro);
  ids.close(); fsv.close();
  console.log(res.every(Boolean)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(x=>!x).length+')'); })().catch(e=>{ console.error(e); process.exit(1); });
