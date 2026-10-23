/* Oficina sem coletor (23/10): o alarme da tarefa liga a câmera; o QR do crachá do técnico abre direto "Aceitar tarefa".
   Precisa da câmera falsa: python3 -c "exec(open('cam.py').read().split('if __name__')[0]); qr('COLAFIX:CRACHA:TEC00000','/tmp/cr-bruno.y4m',px=320)"
   e CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ if(!fs.existsSync('/tmp/cr-bruno.y4m')) require('child_process').execSync(`python3 -c "exec(open('cam.py').read().split('if __name__')[0]); qr('COLAFIX:CRACHA:TEC00000','/tmp/cr-bruno.y4m',px=320)"`,{cwd:__dirname});
 const {d}=seedManut(); const D=d.docs, iso=new Date(Date.now()-864e5).toISOString();
 D['crachas/TEC00000']={codigo:'TEC00000',nome:'Bruno Lima',linha:'',papel:'tecnico',ativo:true,criadoEm:iso};
 d.users['oficina@painel-colafix.app']={uid:'uOF',pass:'of1234',nome:'Oficina'}; D['perfis/uOF']={nome:'Computador da manutenção',usuario:'oficina'}; D['acessos/uOF']={perfil:'oficina',mods:['tablet'],locais:[],ativo:true};
 const B=await H.abrir({camera:'/tmp/cr-bruno.y4m',decodificador:true,viewport:{width:1600,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'oficina','of1234'); await H.dorme(3500);
 const st=()=>p.evaluate(()=>({f:__T.S().tt.fase,p:__T.S().tt.p&&__T.S().tt.p.nome,acc:__T.S().of.acc}));
 ok('Sem alarme a câmera fica desligada (nada lido)', (await st()).f==='espera');
 await p.evaluate(()=>__T.S().db.doc('chamados/os-00041').set({numero:41,linha:'Pátio',defeito:'Trocar lâmpada',tipo:'eletrico',impacto:'nao',prioridade:'urgente',tarefa:true,origem:'gestor',paraTec:'Bruno Lima',nome:'Marcelo',status:'Aberta',criado:new Date().toISOString()}));
 let s; for(let i=0;i<15;i++){ await H.dorme(1000); s=await st(); if(s.f!=='espera') break; }
 ok('Alarme liga a câmera, o QR do crachá do Bruno abre direto "Aceitar tarefa" da OS 41', s.f==='ofacc'&&s.p==='Bruno Lima'&&s.acc===41, JSON.stringify(s));
 await H.dorme(4000); s=await st(); ok('Continua em "Aceitar tarefa" (não volta para o começo)', s.f==='ofacc', JSON.stringify(s));
 console.log('erros:',B.erros.filter(x=>!/404/.test(x))); console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
