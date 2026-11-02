/* Painel Colafix · rh-comunicados.js (31/10) — Gerador de comunicados do RH (RH → Documentos → Comunicados).
   Modelos prontos (Feriado, Regras do ambiente, Lembrete, Aviso geral, Em branco) no mesmo visual dos comunicados da Colafix;
   tudo editável: cabeçalho, blocos (texto, data grande, item com ícone, destaque, atenção, pergunta, horário em destaque, frase final),
   estilo (faixas vermelhas ou fundo cinza), cor e formato (WhatsApp 1080×1350, Story 1080×1920, Quadrado 1080×1080).
   Prévia ao vivo; Baixar imagem (PNG, html2canvas do cdnjs), Enviar (compartilhar do celular), Imprimir, Copiar texto (WhatsApp).
   Na Data grande, mudar a data acerta sozinho a caixa "RETORNO…" para o próximo dia útil.
   Dados: rh/dados/comunicados/{id} {nome, h:{kicker,titulo,sub,agr,ass}, bl:[{tipo,...}], est:'faixa'|'limpo', cor, fmt, em, porNome, removido}
   Usado pelo rh.js: window.RHCom.render(ctx) com ctx = {P, esc, eu, topo}. Prefixo `rc`. */
(function(){
  const COL='rh/dados/comunicados';
  const ASS='DIREÇÃO · COLFIX INDÚSTRIA E COMÉRCIO LTDA';
  const FMT={feed:['WhatsApp / feed',1080,1350],story:['Story / tela em pé',1080,1920],quad:['Quadrado',1080,1080]};
  const CORES=[['#EE1B3A','Vermelho Colafix'],['#143F54','Azul petróleo'],['#2F7D4F','Verde'],['#D9822B','Laranja'],['#222222','Preto']];
  const SV=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC={proibido:['Proibido','<circle cx="12" cy="12" r="9"/><path d="M5.6 18.4 18.4 5.6"/>'],check:['Certo','<circle cx="12" cy="12" r="9"/><path d="m7.5 12.5 3 3 6-7"/>'],
    cafe:['Copa / café','<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M3 21h14"/>'],
    alerta:['Atenção','<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'],relogio:['Horário','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    calendario:['Calendário','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],info:['Informação','<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>'],
    sino:['Aviso','<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'],capacete:['Segurança / EPI','<path d="M4 16a8 8 0 0 1 16 0"/><path d="M2 16h20v2H2z"/><path d="M12 8V5"/>'],
    pessoas:['Equipe','<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 21 19"/>'],
    limpeza:['Limpeza','<path d="M14 3 9 13"/><path d="M5 13h9l-1 8H6z"/><path d="M18 6l1-2M20 9l2-1"/>'],refeicao:['Refeição','<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-2 6 0 8v10"/>'],
    maleta:['Vaga / trabalho','<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'],
    festa:['Festa','<path d="M4 20 9 7l8 8z"/><path d="M14 4v2M19 9h2M17 6l1.5-1.5M12 8c1-1 1-3 0-4M16 12c1-1 3-1 4 0"/>'],
    bolo:['Aniversário','<path d="M4 21h16v-8H4z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M12 13V9M12 6.5a1.2 1.2 0 0 0 1.2-1.2C13.2 4 12 3 12 3s-1.2 1-1.2 2.3A1.2 1.2 0 0 0 12 6.5z"/>'],
    estrela:['Destaque','<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>']};
  const TIPOS={texto:['Texto',[['t','Texto','area']]],data:['Data grande',[['iso','Data','date'],['lin','Depois do mês (ex.: FINADOS)','text']]],
    item:['Item com ícone',[['ic','Ícone','ic'],['tit','Título','text'],['txt','Texto','area'],['tom','Fundo','tom']]],destaque:['Caixa de destaque',[['rot','Rótulo','text'],['txt','Texto grande','text']]],
    alerta:['Atenção',[['rot','Rótulo','text'],['txt','Texto','area']]],pergunta:['Pergunta e resposta',[['ic','Ícone','ic'],['tit','Pergunta','text'],['txt','Resposta','area']]],
    pilula:['Horário ou valor em destaque',[['tit','Título','text'],['txt','Texto','text'],['val','Destaque','text']]],frase:['Frase final',[['t','Frase','area']]],
    dados:['Informações (rótulo: valor)',[['t','Uma por linha, no jeito "Rótulo: valor"','area']]],lista:['Lista (requisitos, nomes…)',[['tit','Título (opcional)','text'],['t','Um item por linha','area']]]};
  const SEM=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const dIso=s=>{ const [y,m,d]=String(s||'').split('-').map(Number); return y?new Date(y,m-1,d):null; };
  const proxUtil=s=>{ const d=dIso(s); if(!d) return null; do d.setDate(d.getDate()+1); while(d.getDay()===0||d.getDay()===6); return d; };
  const fmtLongo=d=>{ const s=SEM[d.getDay()]; return s[0].toUpperCase()+s.slice(1)+', '+String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); };
  const isoDe=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function proxSeg(){ const d=new Date(); do d.setDate(d.getDate()+1); while(d.getDay()!==1); return isoDe(d); }
  const MODELOS={
    feriado:()=>{ const iso='2026-11-02'; return {nome:'Feriado',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO INTERNO',titulo:'FERIADO DE FINADOS',sub:'',agr:'Agradecemos a compreensão.',ass:ASS},
      bl:[{tipo:'texto',t:'Informamos que não haverá expediente na COLAFIX na segunda-feira, em razão do Dia de Finados.'},{tipo:'data',iso,lin:'FINADOS'},{tipo:'destaque',rot:'RETORNO AO EXPEDIENTE',txt:fmtLongo(proxUtil(iso))}]}; },
    regras:()=>({nome:'Regras do ambiente',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO INTERNO',titulo:'USO DO ESCRITÓRIO E DA COPA',sub:'',agr:'',ass:ASS},
      bl:[{tipo:'texto',t:'Para manter o ambiente limpo, organizado e adequado para todos, contamos com a colaboração da equipe.'},
        {tipo:'item',ic:'proibido',tit:'ALIMENTAÇÃO NO ESCRITÓRIO',txt:'Não será mais permitido consumir alimentos ou fazer refeições dentro do escritório, por questões de higiene e conservação do espaço.',tom:'cinza'},
        {tipo:'item',ic:'cafe',tit:'LANCHES RÁPIDOS: USE A COPA',txt:'Quem precisar fazer um lanche rápido deve utilizar a copa ao lado da recepção. Após o uso, deixe o local limpo e organizado para todos.',tom:'rosa'},
        {tipo:'frase',t:'Cada pessoa é responsável por cuidar do ambiente que utiliza. Agradecemos a colaboração de todos!'}]}),
    lembrete:()=>({nome:'Lembrete',est:'limpo',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO',titulo:'ALMOÇO NA EMPRESA',sub:'LEMBRETE IMPORTANTE',agr:'Agradecemos a colaboração de todos.',ass:''},
      bl:[{tipo:'pergunta',ic:'check',tit:'Almoçou na empresa?',txt:'Assine a lista de refeição todos os dias.'},{tipo:'alerta',rot:'ATENÇÃO',txt:'Sem assinatura, será descontado em folha o valor correspondente ao almoço.'},
        {tipo:'pilula',tit:'NÃO VAI ALMOÇAR NA EMPRESA?',txt:'Avise o RH pelo WhatsApp até as',val:'8h30'}]}),
    aviso:()=>({nome:'Aviso geral',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO INTERNO',titulo:'TÍTULO DO AVISO',sub:'',agr:'Agradecemos a compreensão.',ass:ASS},
      bl:[{tipo:'texto',t:'Escreva aqui o aviso para a equipe.'},{tipo:'destaque',rot:'A PARTIR DE',txt:fmtLongo(dIso(proxSeg()))}]}),
    vaga:()=>vagaModelo(null),
    vagasocial:()=>vagaSocial(null),
    aniver:()=>{ const hj=new Date(), m=hj.getMonth(), xs=(C&&C.func?C.func():[]).filter(f=>/^\d{4}-\d{2}-\d{2}$/.test(f.nascimento||'')&&+f.nascimento.slice(5,7)===m+1).sort((a,b)=>a.nascimento.slice(8).localeCompare(b.nascimento.slice(8)));
      const tit=n=>String(n||'').toLowerCase().replace(/(^|\s)\S/g,x=>x.toUpperCase()).replace(/\s(D[aeo]s?|E)\s/g,x=>x.toLowerCase());
      return {nome:'Aniversariantes do mês',est:'limpo',cor:CORES[0][0],fmt:'feed',h:{kicker:'ANIVERSARIANTES',titulo:'DE '+MES[m].toUpperCase(),sub:'',agr:'',ass:''},
      bl:[{tipo:'pergunta',ic:'bolo',tit:'Parabéns!',txt:'Desejamos um ano cheio de saúde, alegria e conquistas.'},
        {tipo:'lista',tit:'',t:xs.length?xs.map(f=>f.nascimento.slice(8)+'/'+f.nascimento.slice(5,7)+' · '+tit(f.nome).split(' ').filter((w,i,a)=>i===0||i===a.length-1).join(' ')).join('\n'):'02/'+String(m+1).padStart(2,'0')+' · Nome da pessoa'},
        {tipo:'frase',t:'Feliz aniversário! Equipe Colafix'}]}; },
    boasvindas:()=>({nome:'Boas-vindas',est:'limpo',cor:CORES[0][0],fmt:'feed',h:{kicker:'BOAS-VINDAS',titulo:'SEJA BEM-VINDO(A)!',sub:'NOVO NA EQUIPE',agr:'Conte com a gente!',ass:''},
      bl:[{tipo:'pergunta',ic:'pessoas',tit:'Nome da pessoa',txt:'Função · Setor'},{tipo:'texto',t:'Hoje chega mais uma pessoa para somar com a equipe. Receba bem, apresente o setor e ajude no que precisar.'}]}),
    epi:()=>({nome:'Uso de EPI',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'SEGURANÇA DO TRABALHO',titulo:'USO OBRIGATÓRIO DE EPI',sub:'',agr:'',ass:ASS},
      bl:[{tipo:'texto',t:'Para a segurança de todos, o uso dos equipamentos de proteção é obrigatório na área de produção.'},
        {tipo:'item',ic:'capacete',tit:'O QUE USAR',txt:'Protetor auricular, óculos de segurança, luvas e calçado de segurança, conforme a sua função.',tom:'cinza'},
        {tipo:'item',ic:'alerta',tit:'EPI DANIFICADO?',txt:'Não use. Peça a troca ao RH ou ao encarregado do setor.',tom:'rosa'},
        {tipo:'frase',t:'Segurança em primeiro lugar. Cuide de você e de quem trabalha ao seu lado.'}]}),
    treino:()=>({nome:'Treinamento ou reunião',est:'faixa',cor:CORES[1][0],fmt:'feed',h:{kicker:'COMUNICADO INTERNO',titulo:'TREINAMENTO',sub:'',agr:'Contamos com a presença de todos.',ass:ASS},
      bl:[{tipo:'texto',t:'Teremos um treinamento para a equipe. Veja as informações abaixo.'},{tipo:'dados',t:'Assunto: Segurança na operação de máquinas\nData: '+fmtLongo(dIso(proxSeg()))+'\nHorário: 14h às 15h\nLocal: Refeitório\nPara quem: Equipe da produção'},
        {tipo:'destaque',rot:'PRESENÇA OBRIGATÓRIA',txt:'Assine a lista no local'}]}),
    coletivas:()=>({nome:'Férias coletivas',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO INTERNO',titulo:'FÉRIAS COLETIVAS',sub:'',agr:'Boas festas e bom descanso!',ass:ASS},
      bl:[{tipo:'texto',t:'Informamos que a COLAFIX terá férias coletivas no fim do ano.'},{tipo:'dados',t:'Último dia de trabalho: Terça-feira, 22/12/2026\nFérias: 23/12/2026 a 05/01/2027'},
        {tipo:'destaque',rot:'RETORNO AO EXPEDIENTE',txt:'Quarta-feira, 06/01/2027'}]}),
    horario:()=>({nome:'Mudança de horário',est:'limpo',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO',titulo:'NOVO HORÁRIO',sub:'A PARTIR DE '+fmtLongo(dIso(proxSeg())).split(', ')[1],agr:'Agradecemos a compreensão.',ass:''},
      bl:[{tipo:'pergunta',ic:'relogio',tit:'O horário vai mudar',txt:'Confira como fica o expediente.'},{tipo:'dados',t:'Segunda a quinta: 7h às 17h\nSexta: 7h às 16h\nAlmoço: 12h às 13h'},
        {tipo:'pilula',tit:'DÚVIDAS?',txt:'Fale com o RH ou com o seu encarregado',val:''}]}),
    festa:()=>({nome:'Confraternização',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'VOCÊ É NOSSO CONVIDADO',titulo:'CONFRATERNIZAÇÃO DE FIM DE ANO',sub:'',agr:'Esperamos todos lá!',ass:ASS},
      bl:[{tipo:'texto',t:'Para comemorar o ano juntos, a COLAFIX convida toda a equipe para a confraternização.'},{tipo:'data',iso:'2026-12-18',lin:'CONFRATERNIZAÇÃO'},{tipo:'dados',t:'Horário: a partir das 17h\nLocal: Área de convivência da fábrica'}]}),
    branco:()=>({nome:'Em branco',est:'faixa',cor:CORES[0][0],fmt:'feed',h:{kicker:'COMUNICADO INTERNO',titulo:'TÍTULO',sub:'',agr:'',ass:ASS},bl:[{tipo:'texto',t:''}]})};
  /* vaga aberta: em branco ou a partir de uma vaga de Admissões e vagas */
  function vagaModelo(v){ const fn=(v&&v.funcao)||'Operador de produção', st=(v&&v.setor)||'Produção', q=+(v&&v.qtd)||1, h6=new Date(); h6.setDate(h6.getDate()+6); const ate=proxUtil(isoDe(h6)), ateTxt=fmtLongo(ate);
    return {nome:'Vaga aberta',est:'faixa',cor:CORES[0][0],fmt:'feed',vagaId:v?v._id:'',vg:v?{_id:v._id,funcao:v.funcao,setor:v.setor,qtd:v.qtd,tipo:v.tipo}:null,h:{kicker:q>1?q+' VAGAS ABERTAS':'VAGA ABERTA',titulo:fn.toUpperCase(),sub:'',agr:'',ass:ASS},
      bl:[{tipo:'texto',t:'A COLAFIX está contratando! Indique quem tem o perfil. Quem já é da casa também pode se candidatar.'},
        {tipo:'dados',t:'Setor: '+st+'\nVínculo: '+((v&&v.tipo)||'CLT')+'\nHorário: Segunda a sexta, 7h às 17h'},
        {tipo:'lista',tit:'REQUISITOS',t:'Ensino fundamental completo\nDisponibilidade de horário\nExperiência na função será um diferencial'}, /* a observação da vaga não entra: pode ter anotação interna */
        {tipo:'destaque',rot:'INTERESSADOS: FALE COM O RH',txt:'Até '+ateTxt[0].toLowerCase()+ateTxt.slice(1)}]}; }
  /* vaga para redes sociais (31/10): estilo "social", fala com quem é de fora (o que oferecemos, como se candidatar) */
  function vagaSocial(v){ const fn=(v&&v.funcao)||'Operador de produção', q=+(v&&v.qtd)||1;
    return {nome:'Vaga para redes sociais',est:'social',cor:CORES[0][0],fmt:'feed',vg:v?{_id:v._id,funcao:v.funcao,setor:v.setor,qtd:v.qtd,tipo:v.tipo}:null,
      h:{kicker:'ESTAMOS CONTRATANDO',titulo:fn.toUpperCase(),sub:q>1?q+' vagas abertas':'',agr:'',ass:''},
      bl:[{tipo:'dados',t:'Local: Cidade - UF\nVínculo: '+((v&&v.tipo)||'CLT')+'\nHorário: Segunda a sexta'},
        {tipo:'lista',tit:'REQUISITOS',t:'Ensino fundamental completo\nDisponibilidade de horário'},
        {tipo:'lista',tit:'OFERECEMOS',t:'Refeição na empresa\nVale-transporte\nUniforme e EPI fornecidos'},
        {tipo:'pilula',tit:'CANDIDATE-SE',txt:'Mande seu currículo pelo WhatsApp',val:'(00) 00000-0000'}]}; }
  const MOD_DESC={vagasocial:'Para Instagram e Facebook, com legenda',vaga:'Função, requisitos e como se candidatar',aniver:'Já com quem faz aniversário no mês',boasvindas:'Para apresentar quem chegou',epi:'Segurança do trabalho',treino:'Data, horário e local',coletivas:'Saída e volta',horario:'Novo expediente',festa:'Convite com data e local',feriado:'Data grande e o dia da volta',regras:'Itens com ícone (pode, não pode)',lembrete:'Pergunta, atenção e horário',aviso:'Texto e uma data em destaque',branco:'Só o cabeçalho'};

  const S={xs:null,ed:null,lendo:false,salv:false}; let C=null;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const logo=()=>((document.querySelector('.brand img')||{}).src||'icons/icon-192.png');

  /* ---------- o comunicado em si (HTML em tamanho real) ---------- */
  function html(o){ const e=C.esc, f=FMT[o.fmt]||FMT.feed, h=o.h||{}, br=s=>e(s||'').replace(/\n/g,'<br>');
    const bl=(o.bl||[]).map(b=>{
      if(b.tipo==='texto') return b.t?`<p class="rcx-p">${br(b.t)}</p>`:'';
      if(b.tipo==='data'){ const d=dIso(b.iso); if(!d) return ''; return `<div class="rcx-dt"><div class="s">${SEM[d.getDay()].toUpperCase()}</div><div class="n">${String(d.getDate()).padStart(2,'0')}</div><div class="l">${MES[d.getMonth()].toUpperCase()}${b.lin?' &nbsp;•&nbsp; '+e(b.lin):''}</div></div>`; }
      if(b.tipo==='item') return `<div class="rcx-it ${b.tom==='rosa'?'rosa':'cinza'}"><i>${SV((IC[b.ic]||IC.info)[1])}</i><div><b>${e(b.tit||'')}</b><p>${br(b.txt)}</p></div></div>`;
      if(b.tipo==='destaque') return `<div class="rcx-ds"><b>${e(b.rot||'')}</b><span>${e(b.txt||'')}</span></div>`;
      if(b.tipo==='alerta') return `<div class="rcx-al"><b>${e(b.rot||'')}</b><p>${br(b.txt)}</p></div>`;
      if(b.tipo==='pergunta') return `<div class="rcx-pg"><i>${SV((IC[b.ic]||IC.check)[1])}</i><div><b>${e(b.tit||'')}</b><p>${br(b.txt)}</p></div></div>`;
      if(b.tipo==='pilula') return `<div class="rcx-pl">${b.tit?`<b>${e(b.tit)}</b>`:''}${b.txt?`<p>${e(b.txt)}</p>`:''}${b.val?`<span>${e(b.val)}</span>`:''}</div>`;
      if(b.tipo==='frase') return b.t?`<div class="rcx-fr">${br(b.t)}</div>`:'';
      if(b.tipo==='dados'){ const ls=String(b.t||'').split('\n').map(x=>x.trim()).filter(Boolean); if(!ls.length) return '';
        return `<div class="rcx-dd">${ls.map(l=>{ const i=l.indexOf(':'); return i>0?`<div><span>${e(l.slice(0,i).trim())}</span><b>${e(l.slice(i+1).trim())}</b></div>`:`<div class="so"><b>${e(l)}</b></div>`; }).join('')}</div>`; }
      if(b.tipo==='lista'){ const ls=String(b.t||'').split('\n').map(x=>x.replace(/^[-•*]\s*/,'').trim()).filter(Boolean); if(!ls.length) return '';
        return `<div class="rcx-ls${ls.length>6?' duas':''}">${b.tit?`<b class="rcx-lt">${e(b.tit)}</b>`:''}<ul>${ls.map(l=>`<li><i>${SV(IC.check[1])}</i><span>${e(l)}</span></li>`).join('')}</ul></div>`; }
      return ''; }).join('');
    const cab=o.est==='limpo'?`<div class="rcx-k">${e(h.kicker||'')}</div>${h.kicker?'<i class="rcx-ln"></i>':''}<div class="rcx-t">${e(h.titulo||'')}</div>${h.sub?`<div class="rcx-sub">${e(h.sub)}</div>`:''}`
      :`<i class="rcx-ln"></i><div class="rcx-k">${e(h.kicker||'')}</div><div class="rcx-t">${e(h.titulo||'')}</div>${h.sub?`<div class="rcx-sub">${e(h.sub)}</div>`:''}`;
    if(o.est==='social') return `<div class="rcx rcx-social" style="--c:${e(o.cor||CORES[0][0])};width:${f[1]}px;height:${f[2]}px"><div class="rcx-top"><span class="rcx-lp"><img class="rcx-logo" src="${logo()}" alt="Colafix"></span>
      ${h.kicker?`<div class="rcx-k">${e(h.kicker)}</div>`:''}<div class="rcx-t">${e(h.titulo||'')}</div>${h.sub?`<div class="rcx-sub">${e(h.sub)}</div>`:''}</div>
      <div class="rcx-card"><div class="rcx-bl">${bl}</div><div class="rcx-pe">${h.agr?`<div class="rcx-agr">${e(h.agr)}</div>`:''}${h.ass?`<div class="rcx-ass">${e(h.ass)}</div>`:''}</div></div></div>`;
    return `<div class="rcx rcx-${o.est==='limpo'?'limpo':'faixa'}" style="--c:${e(o.cor||CORES[0][0])};width:${f[1]}px;height:${f[2]}px"><div class="rcx-card">
      <img class="rcx-logo" src="${logo()}" alt="Colafix"><div class="rcx-cab">${cab}</div><div class="rcx-bl">${bl}</div>
      <div class="rcx-pe">${h.agr?`<div class="rcx-agr">${e(h.agr)}</div>`:''}${h.ass?`<div class="rcx-ass">${e(h.ass)}</div>`:''}</div></div></div>`; }
  const EMO=l=>/local|endere|cidade/i.test(l)?'📍':/hor[aá]rio|turno|jornada/i.test(l)?'🕒':/sal[aá]rio|remunera/i.test(l)?'💰':/v[ií]nculo|contrato/i.test(l)?'📄':/data|dia/i.test(l)?'📅':'▪️';
  function txtSocial(o){ const h=o.h||{}, L=[]; if(h.kicker) L.push('📢 '+h.kicker+'!'); if(h.titulo) L.push('👉 '+h.titulo+(h.sub?' ('+h.sub+')':'')); L.push('');
    (o.bl||[]).forEach(b=>{ const ls=String(b.t||'').split('\n').map(x=>x.replace(/^[-•*]\s*/,'').trim()).filter(Boolean);
      if(b.tipo==='texto'&&b.t) L.push(b.t,'');
      if(b.tipo==='dados'){ ls.forEach(l=>L.push(EMO(l.split(':')[0])+' '+l)); L.push(''); }
      if(b.tipo==='lista'){ if(b.tit) L.push(b.tit.charAt(0)+b.tit.slice(1).toLowerCase()+':'); ls.forEach(l=>L.push('✅ '+l)); L.push(''); }
      if(b.tipo==='pilula') L.push('📲 '+[b.tit&&b.tit.charAt(0)+b.tit.slice(1).toLowerCase()+':',b.txt,b.val].filter(Boolean).join(' '),'');
      if(b.tipo==='destaque'||b.tipo==='alerta') L.push((b.rot||'')+': '+(b.txt||''),''); });
    L.push(h.agr||'Conhece alguém? Marque nos comentários e compartilhe!'); const cid=((o.bl||[]).map(b=>String(b.t||'')).join('\n').match(/Local:\s*([^\n-]+)/i)||[])[1];
    L.push('','#vagas #emprego #trabalho #contratando #colafix'+(cid&&!/cidade/i.test(cid)?' #'+cid.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\W+/g,'').toLowerCase():''));
    return L.join('\n').replace(/\n{3,}/g,'\n\n').trim(); }
  function txtWa(o){ if(o.est==='social') return txtSocial(o); const h=o.h||{}, L=[]; if(h.kicker) L.push('*'+h.kicker+'*'); if(h.titulo) L.push('*'+h.titulo+'*'); if(h.sub) L.push('_'+h.sub+'_'); L.push('');
    (o.bl||[]).forEach(b=>{ if(b.tipo==='texto'&&b.t) L.push(b.t,'');
      if(b.tipo==='data'){ const d=dIso(b.iso); if(d) L.push('📅 *'+fmtLongo(d)+'*'+(b.lin?' · '+b.lin:''),''); }
      if(b.tipo==='item'||b.tipo==='pergunta') L.push('*'+(b.tit||'')+'*',b.txt||'','');
      if(b.tipo==='destaque'||b.tipo==='alerta') L.push('*'+(b.rot||'')+':* '+(b.txt||''),'');
      if(b.tipo==='pilula') L.push('*'+(b.tit||'')+'*',[b.txt,b.val&&'*'+b.val+'*'].filter(Boolean).join(' '),'');
      if(b.tipo==='frase'&&b.t) L.push('*'+b.t+'*','');
      if(b.tipo==='dados'){ String(b.t||'').split('\n').map(x=>x.trim()).filter(Boolean).forEach(l=>{ const i=l.indexOf(':'); L.push(i>0?'*'+l.slice(0,i).trim()+':* '+l.slice(i+1).trim():l); }); L.push(''); }
      if(b.tipo==='lista'){ if(b.tit) L.push('*'+b.tit+'*'); String(b.t||'').split('\n').map(x=>x.replace(/^[-•*]\s*/,'').trim()).filter(Boolean).forEach(l=>L.push('✅ '+l)); L.push(''); } });
    if(h.agr) L.push(h.agr); if(h.ass) L.push('_'+h.ass+'_'); return L.join('\n').replace(/\n{3,}/g,'\n\n').trim(); }

  /* ---------- telas ---------- */
  async function ler(){ if(S.lendo) return; S.lendo=true; try{ const s=await C.P.db().collection(COL).get(); S.xs=(s.docs||[]).map(d=>Object.assign({_id:d.id},d.data())).filter(x=>!x.removido).sort((a,b)=>String(b.em||'').localeCompare(String(a.em||''))); }catch(e){ S.xs=[]; C.P.erro(e); } S.lendo=false; C.P.render(); }
  const ORDEM=['feriado','vaga','vagasocial','lembrete','regras','aviso','aniver','boasvindas','epi','treino','coletivas','horario','festa','branco'];
  const vagaAbertas=()=>{ try{ return ((window.RHVagas&&window.RHVagas._V&&window.RHVagas._V.vagas)||[]).filter(v=>!v.removido&&v.status!=='fechada'); }catch(e){ return []; } };
  function vLista(c){ const e=c.esc, vagasAb=vagaAbertas();
    if(S.xs==null){ ler(); return c.topo('Comunicados','Monte um comunicado, veja como fica e baixe a imagem para o WhatsApp, as TVs ou o mural.','')+'<section class="card">Carregando…</section>'; }
    return c.topo('Comunicados','Monte um comunicado, veja como fica e baixe a imagem para o WhatsApp, as TVs ou o mural.','')+`
      <section class="card"><h2 style="margin:0 0 4px">Novo comunicado</h2><div class="sub" style="margin:0 0 12px">Escolha um modelo para começar; depois dá para mudar tudo.</div>
        ${vagasAb.length?`<div class="rc-vgs"><span class="label">DIVULGAR UMA VAGA ABERTA</span><div>${vagasAb.map(v=>`<span class="rc-vgi"><b>${e(v.funcao||'Vaga')}${v.setor?' · '+e(v.setor):''}</b><button class="btn sec rh-sm" data-act="rc-vaga" data-id="${e(v._id)}">Mural interno</button><button class="btn sec rh-sm" data-act="rc-vaga" data-soc="1" data-id="${e(v._id)}">Redes sociais</button></span>`).join('')}</div></div>`:''}
        <div class="rc-mods">${ORDEM.filter(k=>MODELOS[k]).map(k=>{ const m=MODELOS[k](); return `<button class="rc-mod" data-act="rc-novo" data-v="${k}"><span class="rc-mini">${miniatura(m)}</span><b>${e(m.nome)}</b><small>${e(MOD_DESC[k])}</small></button>`; }).join('')}</div></section>
      <section class="card"><h2 style="margin:0 0 10px">Salvos</h2>${S.xs.length?`<div class="rc-mods">${S.xs.map(x=>`<button class="rc-mod" data-act="rc-abrir" data-id="${e(x._id)}"><span class="rc-mini">${miniatura(x)}</span><b>${e(x.h&&x.h.titulo||x.nome||'Sem título')}</b><small>${x.em?new Date(x.em).toLocaleDateString('pt-BR'):''}${x.porNome?' · '+e(x.porNome):''}</small></button>`).join('')}</div>`:'<div class="sub" style="margin:0">Nenhum comunicado salvo ainda.</div>'}</section>`; }
  function miniatura(o){ const f=FMT[o.fmt]||FMT.feed, s=150/f[1]; return `<span class="rc-mi" style="height:${Math.round(f[2]*s)}px"><span style="transform:scale(${s})">${html(o)}</span></span>`; }
  function campo(k,v,tipo,lab){ const e=C.esc;
    if(tipo==='area') return `<label class="rc-f rc-w"><span>${lab}</span><textarea class="txt" rows="3" data-rc="${k}">${e(v||'')}</textarea></label>`;
    if(tipo==='ic') return `<label class="rc-f"><span>${lab}</span><select class="txt" data-rc="${k}">${Object.keys(IC).map(i=>`<option value="${i}" ${v===i?'selected':''}>${IC[i][0]}</option>`).join('')}</select></label>`;
    if(tipo==='tom') return `<label class="rc-f"><span>${lab}</span><select class="txt" data-rc="${k}"><option value="cinza" ${v!=='rosa'?'selected':''}>Cinza com faixa</option><option value="rosa" ${v==='rosa'?'selected':''}>Rosa claro</option></select></label>`;
    return `<label class="rc-f ${tipo==='date'?'':'rc-w'}"><span>${lab}</span><input class="txt" type="${tipo==='date'?'date':'text'}" data-rc="${k}" value="${e(v||'')}"></label>`; }
  function vEditor(c){ const e=c.esc, o=S.ed, h=o.h||(o.h={}), f=FMT[o.fmt]||FMT.feed;
    const blocos=(o.bl||[]).map((b,i)=>`<div class="rc-b"><div class="rc-bh"><b>${i+1}. ${e((TIPOS[b.tipo]||['?'])[0])}</b><span>
        <button class="lnk" data-act="rc-sobe" data-i="${i}" ${i?'':'disabled'} aria-label="Subir">↑</button><button class="lnk" data-act="rc-desce" data-i="${i}" ${i<o.bl.length-1?'':'disabled'} aria-label="Descer">↓</button>
        <button class="lnk" data-act="rc-dupb" data-i="${i}">Duplicar</button><button class="lnk" data-act="rc-tira" data-i="${i}" style="color:var(--crit-ink)">Tirar</button></span></div>
      <div class="rc-g">${(TIPOS[b.tipo]||['',[]])[1].map(([k,l,t])=>campo('b.'+i+'.'+k,b[k],t,l)).join('')}</div></div>`).join('');
    return c.topo('Comunicados',S.ed._id?'Editando: '+(h.titulo||'sem título'):'Novo comunicado',`<button class="btn sec" data-act="rc-volta">Voltar</button><button class="btn" data-act="rc-salvar" ${S.salv?'disabled':''}>${S.salv?'Salvando…':'Salvar'}</button>`)+`
    ${o.vg?`<div class="rc-vgt"><span>Vaga: <b>${e(o.vg.funcao||'')}</b></span><div class="seg" role="group"><button data-act="rc-vgmodo" data-v="int" aria-pressed="${o.est!=='social'}">Mural interno</button><button data-act="rc-vgmodo" data-v="soc" aria-pressed="${o.est==='social'}">Redes sociais</button></div></div>`:''}
    <div class="rc-ed"><div class="rc-col">
      <section class="card"><h2 style="margin:0 0 10px">Aparência</h2><div class="rc-g">
        <label class="rc-f"><span>Estilo</span><select class="txt" data-rc="est" data-re="1"><option value="faixa" ${o.est!=='limpo'?'selected':''}>Faixas vermelhas (interno)</option><option value="limpo" ${o.est==='limpo'?'selected':''}>Fundo cinza (lembrete)</option><option value="social" ${o.est==='social'?'selected':''}>Redes sociais (topo colorido)</option></select></label>
        <label class="rc-f"><span>Formato</span><select class="txt" data-rc="fmt" data-re="1">${Object.keys(FMT).map(k=>`<option value="${k}" ${o.fmt===k?'selected':''}>${FMT[k][0]}</option>`).join('')}</select></label>
        <div class="rc-f rc-w"><span>Cor</span><div class="rc-cores">${CORES.map(([v,n])=>`<button class="rc-cor" style="background:${v}" data-act="rc-cor" data-v="${v}" aria-pressed="${o.cor===v}" title="${n}" aria-label="${n}"></button>`).join('')}</div></div></div></section>
      <section class="card"><h2 style="margin:0 0 10px">Cabeçalho e rodapé</h2><div class="rc-g">
        ${campo('h.kicker',h.kicker,'text','Em cima (ex.: COMUNICADO INTERNO)')}${campo('h.titulo',h.titulo,'text','Título')}${campo('h.sub',h.sub,'text','Linha abaixo do título (opcional)')}
        ${campo('h.agr',h.agr,'text','Agradecimento (opcional)')}${campo('h.ass',h.ass,'text','Assinatura (opcional)')}</div></section>
      <section class="card"><h2 style="margin:0 0 10px">Blocos</h2>${blocos||'<div class="sub" style="margin:0 0 8px">Nenhum bloco.</div>'}
        <div class="rc-add"><span class="label">ACRESCENTAR</span><div>${Object.keys(TIPOS).map(k=>`<button class="btn sec rh-sm" data-act="rc-add" data-v="${k}">+ ${TIPOS[k][0]}</button>`).join('')}</div></div></section>
      ${o._id?`<button class="lnk" data-act="rc-del" style="color:var(--crit-ink);margin:4px 0 20px">Apagar este comunicado</button>`:''}
    </div><div class="rc-col rc-pcol"><section class="card rc-pcard"><div class="rc-pv" id="rc-pv"><div class="rc-pvs" id="rc-pvs" style="width:${f[1]}px;height:${f[2]}px">${html(o)}</div></div>
      <div class="rc-cabe" id="rc-ex" hidden>Ainda tem dado de exemplo (telefone ou cidade): troque antes de publicar.</div>
      <div class="rc-cabe" id="rc-cabe" hidden>O texto não cabe no formato: encurte, tire um bloco ou use o formato Story.</div>
      <div class="rc-acs"><button class="btn" data-act="rc-png">Baixar imagem</button>${navigator.share?'<button class="btn sec" data-act="rc-share">Enviar (WhatsApp…)</button>':''}<button class="btn sec" data-act="rc-print">Imprimir</button><button class="btn sec" data-act="rc-copiar">${o.est==='social'?'Copiar legenda':'Copiar texto'}</button></div></section></div></div>`; }
  function render(c){ C=c; setTimeout(ajusta,0); return S.ed?vEditor(c):vLista(c); }

  /* ---------- prévia: escala e "não cabe" ---------- */
  function ajusta(){ const pv=document.getElementById('rc-pv'), s=document.getElementById('rc-pvs'); if(!pv||!s||!S.ed) return; const f=FMT[S.ed.fmt]||FMT.feed, k=Math.min(1,pv.clientWidth/f[1]);
    s.style.transform='scale('+k+')'; pv.style.height=Math.round(f[2]*k)+'px';
    const cd=s.querySelector('.rcx-card'), av=document.getElementById('rc-cabe'); if(cd&&av) av.hidden=!naoCabe(cd);
    const ex=document.getElementById('rc-ex'); if(ex) ex.hidden=!/0000-0000|Cidade - UF/.test(JSON.stringify([S.ed.h,S.ed.bl])); }
  function naoCabe(cd){ if(cd.scrollHeight>cd.clientHeight+2) return true; const pb=parseFloat(getComputedStyle(cd).paddingBottom)||0, lim=cd.getBoundingClientRect().bottom-pb*.5*(cd.getBoundingClientRect().height/cd.offsetHeight||1);
    return [...cd.querySelectorAll('.rcx-bl>*,.rcx-pe>*')].some(x=>x.getBoundingClientRect().bottom>lim+1); }
  function atualiza(){ const s=document.getElementById('rc-pvs'); if(s&&S.ed){ const f=FMT[S.ed.fmt]||FMT.feed; s.style.width=f[1]+'px'; s.style.height=f[2]+'px'; s.innerHTML=html(S.ed); ajusta(); } }
  window.addEventListener('resize',()=>{ if(S.ed) ajusta(); });

  /* ---------- imagem ---------- */
  const carregaJs=src=>new Promise((ok,no)=>{ if(window.html2canvas) return ok(); const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
  async function canvas(){ await carregaJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); const f=FMT[S.ed.fmt]||FMT.feed;
    const box=document.createElement('div'); box.style.cssText='position:fixed;left:-30000px;top:0;z-index:-1'; box.innerHTML=html(S.ed); document.body.appendChild(box);
    try{ const im=box.querySelector('img'); if(im&&!im.complete) await new Promise(r=>{ im.onload=im.onerror=r; });
      return await window.html2canvas(box.firstElementChild,{scale:1,width:f[1],height:f[2],backgroundColor:'#ffffff',logging:false,useCORS:true}); }
    finally{ box.remove(); } }
  const nomeArq=()=>('Comunicado - '+((S.ed.h&&S.ed.h.titulo)||'Colafix')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\- ]+/g,'').trim().slice(0,60)+'.png';
  const blobDe=cv=>new Promise(r=>cv.toBlob(r,'image/png'));

  document.addEventListener('input',ev=>{ const t=ev.target; if(!S.ed||!t.dataset||t.dataset.rc==null) return; const k=t.dataset.rc.split('.'), v=t.value;
    if(k[0]==='h') S.ed.h[k[1]]=v; else if(k[0]==='b'){ const b=S.ed.bl[+k[1]]; if(b) b[k[2]]=v;
      if(k[2]==='iso'&&b){ const d=proxUtil(v), ds=S.ed.bl.find(x=>x.tipo==='destaque'&&/RETORNO|VOLTA/i.test(x.rot||'')); if(d&&ds){ ds.txt=fmtLongo(d); const inp=document.querySelector(`[data-rc="b.${S.ed.bl.indexOf(ds)}.txt"]`); if(inp) inp.value=ds.txt; } } }
    else S.ed[k[0]]=v;
    if(t.dataset.re) C.P.render(); else atualiza(); });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rc-"]'); if(!b||!C) return; const a=b.dataset.act, P=C.P, o=S.ed, i=+b.dataset.i;
    if(a==='rc-novo'){ S.ed=MODELOS[b.dataset.v](); P.render(); window.scrollTo(0,0); return; }
    if(a==='rc-abrir'){ const x=(S.xs||[]).find(y=>y._id===b.dataset.id); if(x){ S.ed=clone(x); P.render(); window.scrollTo(0,0); } return; }
    if(a==='rc-volta'){ S.ed=null; P.render(); return; }
    if(a==='rc-vgmodo'&&o.vg){ const soc=b.dataset.v==='soc'; if(soc===(o.est==='social')) return; if(!confirm('Trocar o modelo? O que você mudou neste comunicado será refeito a partir da vaga.')) return;
      const n=soc?vagaSocial(o.vg):vagaModelo(o.vg); n._id=undefined; S.ed=n; P.render(); return; }
    if(a==='rc-vaga'){ const v=vagaAbertas().find(x=>x._id===b.dataset.id); if(v){ S.ed=b.dataset.soc?vagaSocial(v):vagaModelo(v); P.render(); window.scrollTo(0,0); } return; }
    if(!o) return;
    if(a==='rc-cor'){ o.cor=b.dataset.v; P.render(); return; }
    if(a==='rc-add'){ const n={tipo:b.dataset.v}; if(n.tipo==='item'){ n.ic='info'; n.tom='cinza'; } if(n.tipo==='pergunta') n.ic='check'; if(n.tipo==='alerta') n.rot='ATENÇÃO'; if(n.tipo==='data') n.iso=proxSeg();
      o.bl.push(n); P.render(); setTimeout(()=>{ const x=document.querySelectorAll('.rc-b'); if(x.length) x[x.length-1].scrollIntoView({block:'center'}); },60); return; }
    if(a==='rc-tira'){ o.bl.splice(i,1); P.render(); return; }
    if(a==='rc-dupb'){ o.bl.splice(i+1,0,clone(o.bl[i])); P.render(); return; }
    if(a==='rc-sobe'&&i>0){ [o.bl[i-1],o.bl[i]]=[o.bl[i],o.bl[i-1]]; P.render(); return; }
    if(a==='rc-desce'&&i<o.bl.length-1){ [o.bl[i+1],o.bl[i]]=[o.bl[i],o.bl[i+1]]; P.render(); return; }
    if(a==='rc-salvar'){ if(S.salv) return; S.salv=true; P.render(); const id=o._id||('c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
      const d={nome:o.nome||'',h:o.h,bl:o.bl,est:o.est,cor:o.cor,fmt:o.fmt,em:new Date().toISOString(),porNome:C.eu?C.eu():''};
      try{ await P.db().doc(COL+'/'+id).set(d); o._id=id; S.xs=null; P.toast('Comunicado salvo.'); }catch(e){ P.erro(e); } S.salv=false; P.render(); return; }
    if(a==='rc-del'){ if(!confirm('Apagar este comunicado?')) return; try{ await P.db().doc(COL+'/'+o._id).set({removido:true,removidoEm:new Date().toISOString()},{merge:true}); S.ed=null; S.xs=null; P.toast('Comunicado apagado.'); }catch(e){ P.erro(e); } P.render(); return; }
    if(a==='rc-copiar'){ const t=txtWa(o); try{ await navigator.clipboard.writeText(t); }catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e2){} ta.remove(); }
      P.toast('Texto copiado: é só colar no WhatsApp.'); return; }
    if(a==='rc-png'||a==='rc-share'||a==='rc-print'){ P.toast('Preparando a imagem…');
      try{ const cv=await canvas(), nm=nomeArq();
        if(a==='rc-print'){ const w=window.open('','_blank'); if(!w) return P.toast('O navegador bloqueou a janela de impressão.'); w.document.write(`<title>${C.esc(nm)}</title><style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center}img{max-width:100%;max-height:100vh}</style><img src="${cv.toDataURL('image/png')}" onload="setTimeout(()=>print(),200)">`); w.document.close(); return; }
        const bl=await blobDe(cv);
        if(a==='rc-share'){ const fl=new File([bl],nm,{type:'image/png'}); if(navigator.canShare&&navigator.canShare({files:[fl]})){ try{ await navigator.share({files:[fl],text:(o.h&&o.h.titulo)||''}); }catch(e){} return; } }
        const u=URL.createObjectURL(bl), l=document.createElement('a'); l.href=u; l.download=nm; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); P.toast('Imagem baixada.'); }
      catch(e){ P.erro(e); } return; } });

  window.RHCom={naoCabe,render,_S:S,html:o=>html(o),txtWa,MODELOS,deVaga:(v,soc)=>{ S.ed=soc?vagaSocial(v):vagaModelo(v); }};
  document.head.insertAdjacentHTML('beforeend',`<style id="rc-css">
/* editor */
.rc-mods{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.rc-mod{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer;font:inherit;color:inherit}
.rc-mod:hover{border-color:var(--teal,#2B6A87)}.rc-mod b{font-size:14px}.rc-mod small{color:var(--muted);font-size:12px}
.rc-mi{display:block;width:150px;overflow:hidden;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.12);pointer-events:none}.rc-mi>span{display:block;transform-origin:0 0}
.rc-ed{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.rc-col{display:flex;flex-direction:column;gap:16px;min-width:0}.rc-col>.card{margin:0}.rc-pcol{position:sticky;top:12px}
.rc-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rc-f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}.rc-f.rc-w{grid-column:1/-1}.rc-f textarea{resize:vertical}
.rc-b{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:10px}.rc-bh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}.rc-bh span{display:flex;gap:10px}
.rc-add div{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.rc-vgs{margin:0 0 14px;padding:12px;border-radius:10px;background:var(--teal-wash,#EAF2F6)}.rc-vgs>div{display:flex;flex-direction:column;gap:8px;margin-top:8px}.rc-vgi{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.rc-vgi b{margin-right:auto;font-size:14px}
.rc-vgt{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 14px;border-radius:10px;background:var(--teal-wash,#EAF2F6)}
.rc-cores{display:flex;gap:8px}.rc-cor{width:32px;height:32px;border-radius:50%;border:3px solid transparent;cursor:pointer}.rc-cor[aria-pressed="true"]{border-color:var(--ink,#222);box-shadow:0 0 0 2px #fff inset}
.rc-pv{position:relative;overflow:hidden;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.12)}.rc-pvs{transform-origin:0 0;position:absolute;left:0;top:0}
.rc-cabe{margin-top:10px;padding:8px 12px;border-radius:8px;background:var(--warn-tint,#FBF1DE);color:var(--warn-ink,#8A5A10);font-size:13px;font-weight:600}
.rc-acs{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.rc-acs .btn{flex:1 1 auto}
@media (max-width:900px){ .rc-ed{grid-template-columns:minmax(0,1fr)} .rc-pcol{position:static;order:-1} .rc-g{grid-template-columns:minmax(0,1fr)} .rc-acs .btn{min-height:46px} }
/* o comunicado (tamanho real; não depende do tema do painel) */
.rcx{position:relative;box-sizing:border-box;font-family:"DejaVu Sans","Segoe UI",Arial,Helvetica,sans-serif;color:#222;background:#fff;padding:56px 54px;display:flex;text-align:center;line-height:1.3}
.rcx *{box-sizing:border-box}.rcx p{margin:0}
.rcx-faixa{border-top:20px solid var(--c);border-bottom:20px solid var(--c);padding:36px 54px}.rcx-limpo{background:#F5F5F5}
.rcx-card{flex:1;display:flex;flex-direction:column;align-items:center;border-radius:40px;padding:26px 70px 46px;overflow:hidden;background:#fff}
.rcx-faixa .rcx-card{border:2px solid #E2E2E2}
.rcx-logo{height:56px;width:auto;margin-bottom:6px}
.rcx-cab{display:flex;flex-direction:column;align-items:center;width:100%;margin-top:28px}
.rcx-ln{display:block;width:100%;height:9px;border-radius:5px;background:var(--c);margin:20px 0 36px}
.rcx-faixa .rcx-k{font-size:40px;font-weight:800;letter-spacing:1px;color:#222}.rcx-faixa .rcx-t{font-size:36px;font-weight:800;color:var(--c);margin-top:6px;letter-spacing:.5px}
.rcx-limpo .rcx-k{font-size:32px;font-weight:800;color:var(--c);letter-spacing:1px}.rcx-limpo .rcx-ln{width:240px;height:12px;margin:22px 0 54px}.rcx-limpo .rcx-t{font-size:52px;font-weight:800;color:#111;letter-spacing:1px}
.rcx-sub{font-size:26px;font-weight:800;color:var(--c);margin-top:8px;letter-spacing:.5px}
.rcx-bl{flex:1;width:100%;display:flex;flex-direction:column;justify-content:space-evenly;align-items:center;gap:24px;padding:24px 0}
.rcx-p{font-size:25px;color:#555;max-width:700px;line-height:1.55}
.rcx-dt{width:740px;background:#F5F5F5;border:2px solid #E2E2E2;border-radius:36px;padding:46px 20px 50px;position:relative}
.rcx-dt::before{content:"";position:absolute;left:-2px;right:-2px;top:-12px;height:22px;border-radius:12px;background:var(--c)}
.rcx-dt .s{font-size:28px;font-weight:800;letter-spacing:1px}.rcx-dt .n{font-size:110px;font-weight:900;color:var(--c);line-height:1.05;margin:8px 0 4px}.rcx-dt .l{font-size:28px;font-weight:800;letter-spacing:.5px}
.rcx-it{width:820px;display:flex;gap:30px;text-align:left;border-radius:36px;padding:34px 40px}.rcx-it.cinza{background:#F5F5F5;border:2px solid #E2E2E2;border-left:18px solid var(--c)}
.rcx-it.rosa{background:#FDF1F3;border:2px solid #F7BFCA}.rcx-it i,.rcx-pg i{flex:0 0 84px;width:84px;height:84px;color:var(--c);display:block}.rcx-it svg,.rcx-pg svg{width:100%;height:100%}
.rcx-it b{display:block;font-size:28px;font-weight:800;color:var(--c);margin-bottom:12px}.rcx-it p{font-size:22px;line-height:1.75;color:#222}
.rcx-ds{width:740px;background:#FDF1F3;border:2px solid #F7BFCA;border-radius:36px;padding:38px 20px}.rcx-ds b{display:block;font-size:26px;font-weight:800;color:var(--c);letter-spacing:.5px}.rcx-ds span{display:block;font-size:34px;font-weight:800;margin-top:14px}
.rcx-al{width:840px;background:#FBEAEC;border-radius:30px;padding:34px 30px}.rcx-al b{display:block;font-size:27px;font-weight:800;color:var(--c);letter-spacing:.5px}.rcx-al p{font-size:26px;margin-top:12px;line-height:1.55}
.rcx-pg{width:820px;display:flex;align-items:center;gap:34px;text-align:left}.rcx-pg i{flex-basis:96px;width:96px;height:96px}.rcx-pg b{display:block;font-size:36px;font-weight:800;color:#111}.rcx-pg p{font-size:32px;color:#555;margin-top:8px;line-height:1.4}
.rcx-pl b{display:block;font-size:30px;font-weight:800;color:#111;letter-spacing:.5px}.rcx-pl p{font-size:28px;color:#555;margin-top:12px}.rcx-pl span{display:inline-block;min-width:390px;margin-top:20px;padding:12px 40px;border-radius:16px;background:var(--c);color:#fff;font-size:38px;font-weight:800}
.rcx-fr{width:740px;border-top:2px solid #E2E2E2;padding-top:28px;font-size:24px;font-weight:800;line-height:1.6}
.rcx-dd{width:780px;background:#F5F5F5;border:2px solid #E2E2E2;border-radius:30px;padding:16px 40px;text-align:left}
.rcx-dd>div{display:flex;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:2px solid #E6E6E6;font-size:25px}.rcx-dd>div:last-child{border-bottom:0}
.rcx-dd span{color:var(--c);font-weight:800;text-transform:uppercase;letter-spacing:.4px;font-size:21px;padding-top:4px;flex:0 0 auto}.rcx-dd b{font-weight:800;text-align:right}.rcx-dd .so b{text-align:center;width:100%}
.rcx-ls{width:780px;text-align:left}.rcx-ls .rcx-lt{display:block;font-size:26px;font-weight:800;color:var(--c);letter-spacing:.5px;margin-bottom:14px;text-align:center}
.rcx-ls ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}.rcx-ls.duas ul{grid-template-columns:1fr 1fr;column-gap:30px}
.rcx-ls li{display:flex;align-items:center;gap:16px;font-size:25px;font-weight:600;background:#FDF1F3;border-radius:18px;padding:11px 22px}.rcx-ls li i{flex:0 0 34px;width:34px;height:34px;color:var(--c)}.rcx-ls li svg{width:100%;height:100%}
.rcx-ls.duas li{font-size:22px;padding:12px 18px}
.rcx-social{flex-direction:column;padding:0;background:var(--c)}
.rcx-top{position:relative;overflow:hidden;color:#fff;padding:44px 70px 48px}.rcx-top::before,.rcx-top::after{content:"";position:absolute;border-radius:50%;background:rgba(255,255,255,.1)}
.rcx-top::before{width:420px;height:420px;right:-140px;top:-170px}.rcx-top::after{width:240px;height:240px;left:-90px;bottom:-130px}
.rcx-lp{position:relative;display:inline-block;background:#fff;border-radius:999px;padding:14px 36px}.rcx-lp .rcx-logo{height:50px;margin:0;display:block}
.rcx-social .rcx-k{position:relative;font-size:30px;font-weight:800;letter-spacing:4px;margin-top:26px;opacity:.95}.rcx-social .rcx-t{position:relative;font-size:58px;font-weight:900;line-height:1.05;margin-top:10px}
.rcx-social .rcx-sub{position:relative;color:#fff;font-size:30px;font-weight:700;opacity:.95;margin-top:12px;letter-spacing:0}
.rcx-social .rcx-card{margin:0 40px 40px;border-radius:40px;padding:22px 50px 34px}.rcx-social .rcx-bl{padding:6px 0;gap:14px}
.rcx-social .rcx-ls li{padding:9px 20px;font-size:24px}.rcx-social .rcx-dd{padding:6px 36px}.rcx-social .rcx-dd>div{padding:12px 0}
.rcx-pe{width:100%}.rcx-agr{font-size:24px;color:#555}.rcx-ass{font-size:19px;font-weight:800;color:#333;margin-top:30px;letter-spacing:.3px}
</style>`);
})();
