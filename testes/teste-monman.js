/* Monitor da manutenção (js/30-monitor-man.js): quadro + alarme que pisca e toca até alguém atender. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,260):'')); };
(async()=>{ const {d}=seedManut(); const D=d.docs; const t=Date.now(), ago=m=>new Date(t-m*60000).toISOString();
 d.users['oficina@painel-colafix.app']={uid:'uOF',pass:'of1234',nome:'TV Oficina'}; D['perfis/uOF']={nome:'TV Oficina',usuario:'oficina'}; D['acessos/uOF']={perfil:'tvman',mods:['manut'],locais:[],ativo:true};
 D['chamados/os-00010']={numero:10,linha:'Linha 2',defeito:'Elétrico',tipo:'eletrico',impacto:'reduziu',nome:'Carlos',status:'Em execução',criado:ago(60),exec:{tecnico:'Bruno Lima',inicio:new Date(t-40*6e4-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16)}};
 D['chamados/os-00009']={numero:9,linha:'Linha 1',defeito:'Mecânico',impacto:'nao',nome:'Ana',status:'Concluída',criado:ago(120),concluidoEm:ago(90),liberadoPor:'Ana'};
 const B=await H.abrir({viewport:{width:1366,height:768}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'oficina','of1234'); await H.dorme(3500);
 let s=await p.evaluate(()=>({v:__T.S().view,t:document.getElementById('view').innerText}));
 ok('Conta da oficina abre o Monitor da manutenção com as 3 colunas', s.v==='manmon'&&/Aguardando técnico/.test(s.t)&&/Em atendimento/.test(s.t)&&/Fechados hoje/.test(s.t), s.v+' '+s.t.slice(0,160).replace(/\n/g,'|'));
 ok('Em atendimento: chamado 00010 com o técnico; fechados hoje: 00009', /Linha 2 · 00010/.test(s.t)&&/técnico Bruno Lima/.test(s.t)&&/Linha 1 · 00009/.test(s.t), s.t.slice(0,500).replace(/\n/g,'|'));
 /* chamado novo */
 await p.evaluate(()=>__T.S().db.doc('chamados/os-00011').set({numero:11,linha:'Linha 1',defeito:'Mecânico',tipo:'mecanico',impacto:'parou',nome:'Ana Souza',status:'Aberta',criado:new Date().toISOString()})); await H.dorme(2500);
 let ov=await p.evaluate(()=>{ const o=document.querySelector('.mm2-ov'); return o?{t:o.innerText,an:getComputedStyle(o).animationName,pos:getComputedStyle(o).position}:null; });
 ok('Chamado novo: a tela inteira pisca em vermelho com "CHAMADO NOVO · LINHA 1 · PAROU COMPLETA · MECÂNICO"', ov&&/CHAMADO NOVO/.test(ov.t)&&/LINHA 1 · PAROU COMPLETA/.test(ov.t)&&/MECÂNICO/.test(ov.t)&&/Ana Souza/.test(ov.t)&&ov.an==='mm2pisca'&&ov.pos==='fixed', JSON.stringify(ov&&{an:ov.an,t:ov.t.slice(0,160)}));
 /* som: ativar e conferir que a sirene toca de novo sozinha */
 await p.evaluate(()=>{ window.__nOsc=0; const A=window.AudioContext||window.webkitAudioContext; const o=A.prototype.createOscillator; A.prototype.createOscillator=function(){ window.__nOsc++; return o.apply(this,arguments); }; });
 const at=await p.$('[data-act="mm2-ativar"]'); if(at) await at.click(); await H.dorme(6500);
 const so=await p.evaluate(()=>({n:window.__nOsc,st:__T.S().man._ac&&__T.S().man._ac.state,txt:(document.querySelector('.mm2-ov')||{}).innerText||''}));
 ok('Alarme toca e repete sozinho (sirene a cada ~2,6 s) enquanto ninguém atende', so.n>=8&&/repete até alguém atender/.test(so.txt), JSON.stringify({n:so.n,st:so.st}));
 /* técnico bipa no posto → exec.tecnico → alarme para */
 await p.evaluate(()=>__T.S().db.doc('chamados/os-00011').update({exec:{tecnico:'Bruno Lima',inicio:new Date().toISOString().slice(0,16)},status:'Em execução'})); await H.dorme(2500);
 s=await p.evaluate(()=>({ov:!!document.querySelector('.mm2-ov'),al:document.body.classList.contains('mm2-al'),t:document.getElementById('view').innerText}));
 ok('Quando o técnico começa, o alarme para e o chamado passa para "Em atendimento"', !s.ov&&!s.al&&/Linha 1 · 00011/.test(s.t), JSON.stringify({ov:s.ov,al:s.al}));
 /* silenciar */
 await p.evaluate(()=>__T.S().db.doc('chamados/os-00012').set({numero:12,linha:'Linha 2',defeito:'Elétrico',tipo:'eletrico',impacto:'nao',nome:'Carlos',status:'Aberta',criado:new Date().toISOString()})); await H.dorme(2500);
 const ov2=await p.evaluate(()=>!!document.querySelector('.mm2-ov')); await p.click('[data-act="mm2-sil"]'); await H.dorme(2500);
 s=await p.evaluate(()=>({ov:!!document.querySelector('.mm2-ov'),t:document.getElementById('view').innerText}));
 ok('"Silenciar e ver chamados" volta ao quadro com o chamado esperando', ov2&&!s.ov&&/Linha 2 · 00012/.test(s.t)&&/esperando há/.test(s.t), JSON.stringify({ov2,ov:s.ov}));
 const errs=(B.erros||[]).filter(x=>!/favicon|fonts\.g|Failed to load resource/i.test(x)); ok('Sem erros no console', !errs.length, errs.join(' | '));
 await B.browser.close(); const f=res.filter(x=>!x.ok).length; console.log(res.length-f+' de '+res.length+' passaram'); process.exit(f?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
