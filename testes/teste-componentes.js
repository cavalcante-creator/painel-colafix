/* Peças comuns (css/componentes.css + js/83-componentes.js = Painel.ui): carregadas, texto escapado, janela e gaveta
   (Esc, ✕, fundo), tema escuro só pelas variáveis, tabela vira cartão no celular. SHOT=1 grava a vitrine em /tmp/sh. */
const H=require('./harness'); const {seedManut}=require('./manut-seed'); const fs=require('fs'); const res=[];
const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,200):'')); };
const VITRINE=()=>{ const U=Painel.ui; const v=document.getElementById('view');
  v.innerHTML=`<div class="pc-pilha" id="pc-vit">
   <div><div class="eyebrow">PEÇAS DO PAINEL</div><h1>Vitrine</h1></div>
   ${U.nums([{r:'Aguardando técnico',v:3,tom:'crit',act:'pcv-n',dv:'a',s:'o mais antigo há 40 min'},{r:'Em atendimento',v:2},{r:'Fechados hoje',v:7,tom:'ok'},{r:'Máquina parada',v:'1 h 20',tom:'warn'}])}
   ${U.aviso({tom:'warn',tit:'2 notas esperando conferência',txt:'Confira antes de marcar como pago.',bts:U.bt('Conferir agora','pcv-a',{sec:1})})}
   <div class="pc-g2">
    ${U.cartao({tit:'Precisa de você',ic:'relogio',cont:2,corpo:U.pv([{tit:'Chamado 00031 · Linha 2',txt:'Parou completa · aberto há 40 min',tom:'crit',selo:['Urgente','crit'],act:'pcv-pv',dv:'31'},{tit:'3 férias para marcar',txt:'Prazo até 30/11',tom:'warn',selo:['Este mês','warn']}])})}
    ${U.cartao({tit:'Dados da pessoa',ic:'lista',corpo:U.dados([['Nome','Ana <b>Souza</b>'],['Setor','Produção'],['Admissão','12/03/2024'],['Celular','']]),rodape:U.bt('Editar','pcv-ed',{sec:1})})}
   </div>
   ${U.cartao({tit:'Pessoas',ic:'lista',cont:2,semPad:1,acoes:U.chips([['t','Todos',2,true],['p','Pendentes',1]],'pcv-ch'),corpo:U.tabela({cols:[{t:'Pessoa'},{t:'Setor',m:'esc'},{t:'Horas',dir:1,r:'Horas'},{t:'Situação'}],linhas:[{h:1,act:'pcv-l',dv:'1',c:[`<div class="pc-cel">${U.ini('Ana Souza')}<div><strong>Ana Souza</strong><small>Auxiliar de produção</small></div></div>`,'Produção','96,80',U.selo('Em dia','ok')]},{h:1,c:[`<div class="pc-cel">${U.ini('Bruno Lima')}<div><strong>Bruno Lima</strong><small>Mecânico</small></div></div>`,'Manutenção','80,00',U.selo('Falta a nota','warn')]}]})})}
   <div class="pc-g2">
    ${U.cartao({tit:'Formulário',ic:'ajuste',corpo:`<div class="pc-form">${U.campo({r:'O que fazer',id:'pcv-t',obr:1,col:12,ph:'Ex.: trocar a correia'})}${U.campo({r:'Linha',id:'pcv-ln',tipo:'select',ops:['Linha 1','Linha 2'],col:6})}${U.campo({r:'Prazo',id:'pcv-pz',tipo:'date',col:6,erro:'Escolha uma data a partir de hoje.'})}</div>`})}
    ${U.cartao({tit:'Histórico',ic:'relogio',corpo:U.tempo([{t:'Chamado aberto',q:'08/11 07:40 · Posto da linha',tom:'crit'},{t:'Bruno começou o conserto',q:'08/11 07:52'},{t:'Máquina liberada',q:'08/11 08:30 · operador',tom:'ok'}])})}
   </div>
   <div class="pc-g2">${U.cartao({tit:'Lista vazia',corpo:U.vazio({tit:'Nenhum pedido de peça',txt:'Quando um técnico pedir uma peça, ela aparece aqui.'})})}${U.cartao({tit:'Tudo certo',corpo:U.pv([])})}</div>
  </div>`; };
(async()=>{ const {d}=seedManut(x=>x); const B=await H.abrir({viewport:{width:1366,height:900}}); const p=B.page; await H.preparar(p,d); await p.goto(H.BASE); await H.entrar(p,'iasmyn','senha123'); await H.dorme(2000);
 ok('componentes.css carregado e Painel.ui pronto', await p.evaluate(()=>[...document.styleSheets].some(s=>/componentes\.css/.test(s.href||''))&&!!(window.Painel&&Painel.ui&&Painel.ui.cartao)));
 ok('Variáveis --pc-* vêm das cores do painel', await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--pc-pri').trim().length>0));
 await p.evaluate(VITRINE); await H.dorme(300);
 ok('Texto é escapado (o <b> do nome aparece como texto)', await p.evaluate(()=>/Ana <b>Souza<\/b>/.test(document.querySelector('.pc-dl').innerText)&&!document.querySelector('.pc-dl b')));
 ok('Valor vazio aparece "não informado"', await p.evaluate(()=>[...document.querySelectorAll('.pc-dl dd.vz')].some(x=>/não informado/.test(x.textContent))));
 ok('Botões levam data-act e data-v', await p.evaluate(()=>!!document.querySelector('button.pc-num[data-act="pcv-n"][data-v="a"]')&&!!document.querySelector('tr.pc-clic[data-act="pcv-l"]')));
 ok('Precisa de você vazio diz "Tudo em dia"', await p.evaluate(()=>/Tudo em dia/.test(document.querySelector('.pc-pv-ok').textContent)));
 ok('Precisa de você com botão de ação à direita (linha parada, botão com os atributos do painel)', await p.evaluate(()=>{ const d=document.createElement('div'); d.innerHTML=Painel.ui.pv([{tit:'Férias: Ana',txt:'vence em 3 dias',rot:'Atenção',tom:'warn',cls:'rh-av',bt:{t:'Abrir',attr:'data-act="rh-pzabrir" data-id="f1"'}}]); const l=d.querySelector('div.pc-pvi.rh-av'), b=l&&l.querySelector('button.pc-pvb[data-act="rh-pzabrir"][data-id="f1"]'); return !!b&&b.textContent==='Abrir'&&/Atenção/.test(l.innerText); }));
 ok('Selo sem pontinho não usa a classe "sp" (é a tela dividida do painel)', await p.evaluate(()=>!/\bsp\b/.test(Painel.ui.selo('Tarefa','',{semPonto:1}))&&getComputedStyle((()=>{ const d=document.createElement('div'); d.innerHTML=Painel.ui.selo('Tarefa','',{semPonto:1}); document.body.appendChild(d); return d.firstChild; })()).position!=='fixed'));
 ok('Campo com erro mostra a mensagem em vermelho', await p.evaluate(()=>{ const c=document.querySelector('.pc-campo.erro em'); return !!c&&getComputedStyle(c).color!==getComputedStyle(document.querySelector('.pc-campo:not(.erro) span')).color; }));
 const sh=process.env.SHOT; if(sh){ fs.mkdirSync('/tmp/sh',{recursive:true}); await p.evaluate(VITRINE); await p.screenshot({path:'/tmp/sh/vitrine-claro.png',fullPage:true}); }
 // tema escuro: fundo do cartão muda só pelas variáveis
 await p.evaluate(VITRINE); const corClaro=await p.evaluate(()=>getComputedStyle(document.querySelector('.pc-card')).backgroundColor);
 await p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark')); await H.dorme(200);
 await p.evaluate(VITRINE); const corEsc=await p.evaluate(()=>getComputedStyle(document.querySelector('.pc-card')).backgroundColor);
 ok('Tema escuro troca as cores sem regra própria', corClaro!==corEsc, corClaro+' → '+corEsc);
 if(sh){ await p.evaluate(VITRINE); await p.screenshot({path:'/tmp/sh/vitrine-escuro.png',fullPage:true}); }
 await p.evaluate(()=>document.documentElement.removeAttribute('data-theme'));
 // janela
 await p.evaluate(()=>{ window.__fechou=0; window.__J=Painel.ui.janela({tit:'Nova tarefa',sub:'Para a manutenção',corpo:Painel.ui.campo({r:'O que fazer',id:'pcj-t'}),rodape:Painel.ui.bt('Cancelar',null,{sec:1})+Painel.ui.bt('Salvar','pcj-ok'),aoFechar:()=>{ window.__fechou++; }}); }); await H.dorme(200);
 ok('Janela abre por cima, fora do #view, com o foco no 1º campo', await p.evaluate(()=>{ const d=document.querySelector('dialog.pc-jan'); return !!d&&d.open&&!document.getElementById('view').contains(d)&&document.activeElement&&document.activeElement.id==='pcj-t'; }));
 await p.keyboard.press('Escape'); await H.dorme(200);
 ok('Esc fecha a janela e chama aoFechar uma vez', await p.evaluate(()=>!document.querySelector('dialog.pc-jan')&&window.__fechou===1));
 await p.evaluate(()=>{ Painel.ui.janela({tit:'Ficha',gaveta:true,corpo:'<p>oi</p>'}); }); await H.dorme(300);
 ok('Gaveta encosta na direita e ocupa a altura toda', await p.evaluate(()=>{ const r=document.querySelector('dialog.pc-jan.gaveta').getBoundingClientRect(); return Math.abs(r.right-innerWidth)<2&&r.height>=innerHeight-2; }));
 if(sh) await p.screenshot({path:'/tmp/sh/vitrine-gaveta.png'});
 await p.click('dialog.pc-jan [data-pc-fecha]'); await H.dorme(200);
 ok('✕ fecha a gaveta', await p.evaluate(()=>!document.querySelector('dialog.pc-jan')));
 await p.evaluate(()=>{ Painel.ui.janela({tit:'Fundo'}); }); await H.dorme(200); await p.mouse.click(8,450); await H.dorme(200);
 ok('Clique no fundo fecha a janela', await p.evaluate(()=>!document.querySelector('dialog.pc-jan')));
 // celular
 await p.setViewportSize({width:390,height:844}); await H.dorme(400); await p.evaluate(VITRINE); await H.dorme(300);
 await p.evaluate(VITRINE); ok('Celular: tabela vira cartão (sem cabeçalho, coluna marcada some)', await p.evaluate(()=>{ const th=document.querySelector('.pc-tab thead'), esc=document.querySelector('.pc-tab td.m-esc'); return getComputedStyle(th).display==='none'&&getComputedStyle(esc).display==='none'&&getComputedStyle(document.querySelector('.pc-tab tbody tr')).display==='grid'; }));
 ok('Celular: nada passa da largura da tela', await p.evaluate(()=>{ const v=document.getElementById('pc-vit'); return v.scrollWidth<=v.clientWidth+1; }));
 if(sh){ await p.evaluate(VITRINE); await p.screenshot({path:'/tmp/sh/vitrine-celular.png',fullPage:true}); }
 { const er=B.erros.filter(e=>!/Failed to load resource/.test(e)); ok('Sem erro na página', !er.length, er.join(' | ')); }
 await B.browser.close(); const f=res.filter(r=>!r.ok); console.log(f.length?`FALHOU (${f.length})`:`PASSOU (${res.length})`); process.exit(f.length?1:0); })().catch(e=>{ console.error('ERRO',e); process.exit(1); });
