/* Pedidos de 26/10 (js/56): Produção da administradora com as abas Painel · Programação · Calendário · Conferir apontamentos,
   "Relatórios" no grupo Produção com os indicadores, e lateral que rola no notebook. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,300):'')); };
(async()=>{ const {d}=seedManut(); const erros=[];
 const B=await H.abrir({viewport:{width:1366,height:640}}); const p=B.page; p.on('pageerror',e=>erros.push(e.message));
 await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(3500);
 await p.click('#navlist .gxg-gr:has-text("Produção")'); await H.dorme(800);
 const st=()=>p.evaluate(()=>({v:__T.S().view,tabs:[...document.querySelectorAll('#view nav.tabs .tab, nav.tabs .tab')].map(b=>b.innerText.trim()),sub:[...document.querySelectorAll('#navlist .gxg-si')].map(b=>b.innerText.trim()+(b.getAttribute('aria-current')?'*':''))}));
 let s=await st(); ok('Abas da Produção: Painel · Programação · Calendário · Conferir apontamentos', [...new Set(s.tabs)].join('|')==='Painel|Programação|Calendário|Conferir apontamentos', JSON.stringify(s));
 ok('Grupo Produção: Produção · Análise PCP · Relatórios', s.sub.join('|').startsWith('Produção*|Análise PCP|Relatórios'), JSON.stringify(s.sub));
 await p.click('#navlist .gxg-si:has-text("Relatórios")'); await H.dorme(900); s=await st();
 ok('Relatórios abre os indicadores com as abas dele', s.v==='prodind'&&[...new Set(s.tabs)].join('|')==='Indicadores|Indicadores (detalhado)|Produção do ano'&&s.sub.includes('Relatórios*')&&s.sub.includes('Produção'), JSON.stringify(s));
 await p.click('nav.tabs .tab:has-text("detalhado")'); await H.dorme(800); s=await st(); ok('Aba Indicadores (detalhado) continua em Relatórios', s.v==='indicadores'&&s.sub.includes('Relatórios*'), JSON.stringify(s));
 await p.click('#navlist .gxg-si:has-text("Análise PCP")'); await H.dorme(800); s=await st(); ok('Análise PCP abre dentro do grupo Produção', await p.evaluate(()=>__T.S().mod==='analise')&&s.sub.includes('Análise PCP*'), JSON.stringify(s.sub));
 const m=await p.evaluate(()=>{ const nl=document.getElementById('navlist'), aj=[...document.querySelectorAll('.side button,.side a')].pop(); nl.scrollTop=9999; return {rola:nl.scrollHeight>nl.clientHeight?nl.scrollTop>0:true,ajBottom:Math.round(aj.getBoundingClientRect().bottom),h:innerHeight}; });
 ok('Lateral rola e Ajustes fica dentro da tela (1366×640)', m.rola&&m.ajBottom<=m.h, JSON.stringify(m));
 await p.reload(); await H.dorme(3500); const r=await p.evaluate(()=>{ const aj=[...document.querySelectorAll('.side button,.side a')].pop(); return Math.round(aj.getBoundingClientRect().bottom)<=innerHeight; }); ok('Depois de recarregar a lateral continua inteira', r);
 ok('Sem erros no console', !erros.length, erros.join(' | '));
 console.log(res.every(r=>r.ok)?'PASSOU tudo ('+res.length+')':'FALHOU ('+res.filter(r=>!r.ok).length+')'); await B.browser.close(); process.exit(0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
