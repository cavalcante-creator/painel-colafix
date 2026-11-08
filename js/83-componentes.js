/* =====================================================================
   PEÇAS COMUNS (nov/2026, padrão vindo do Conectwork) · css/componentes.css
   Funções que montam o HTML das peças, já escapando os textos. Use nas telas novas e nas que forem revisadas:
     const U=Painel.ui;
     U.cartao({tit:'Chamados', ic:'lista', cont:3, corpo:'…', rodape:U.bt('Novo','gx-novo')})
     U.selo('Atrasado','crit') · U.aviso({tom:'warn', tit:'…', txt:'…', bts:'…'}) · U.vazio({tit:'Nada por aqui', txt:'…'})
     U.dados([['Nome','Ana'],['Setor','']]) · U.nums([{r:'Abertos',v:12,tom:'warn',act:'x',dv:'…'}])
     U.pv([{tit:'…',txt:'…',selo:['3 dias','crit'],act:'…',dv:'…'}]) · U.tempo([{t:'Aberto',q:'08/11 07:40',tom:'ok'}])
     U.tabela({cols:[{t:'Pessoa'},{t:'Horas',dir:1,m:'esc'}], linhas:[{c:['Ana','8'],act:'…',dv:'…'}]})
     U.campo({r:'Nome',id:'x-nome',v:'',obr:1,dica:'…',erro:'…'}) · U.chips([['todos','Todos',3,true]],'x-fil')
     U.janela({tit:'…', sub:'…', corpo:'…', rodape:'…', gaveta:true, larga:false, aoFechar:fn}) → {el, fechar}
   Prefixo pc- em tudo (o painel roda no mesmo escopo). Cores só por variável: o tema escuro sai sozinho.
   ===================================================================== */
const PCU_IC={
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warn:'<path d="M12 4 2.8 19.5h18.4L12 4z"/><path d="M12 10v4.5M12 17h.01"/>',
  crit:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16h.01"/>',
  ok:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16 9.6"/>',
  vazio:'<path d="M4 13h4l1.5 2.5h5L16 13h4"/><path d="M5.5 6.5 4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5l-1.5-6.5a1 1 0 0 0-1-.8H6.5a1 1 0 0 0-1 .8z"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>'
};
function pcIc(n,s){ s=s||18; if(PCU_IC[n]) return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PCU_IC[n]}</svg>`;
  try{ return ic(n,s,1.8); }catch(e){ return ''; } }
const PCU_TONS={ok:1,warn:1,crit:1,info:1};
const pcTom=t=>PCU_TONS[t]?t:'';
/* atributos de ação no padrão do painel: data-act e data-v */
const pcAct=(act,dv)=>act?` data-act="${esc(act)}"${dv!=null?` data-v="${esc(dv)}"`:''}`:'';
/* html: valor já em HTML (use para corpo/rodapé montados com estas mesmas funções) */
const pcH=v=>v==null?'':String(v);

const PCU={
  ic:pcIc,
  bt(txt,act,o){ o=o||{}; return `<button type="button" class="btn${o.sec?' sec':''}${o.cls?' '+esc(o.cls):''}"${pcAct(act,o.dv)}${o.id?` id="${esc(o.id)}"`:''}${o.off?' disabled':''}>${o.ic?pcIc(o.ic,16):''}${esc(txt)}</button>`; },
  selo(txt,tom,o){ o=o||{}; return `<span class="pc-selo ${pcTom(tom)}${o.semPonto?' pc-semp':''}">${esc(txt)}</span>`; },
  ini(nome,o){ o=o||{}; const p=String(nome||'?').trim().split(/\s+/).filter(Boolean); const t=((p[0]||'?')[0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase(); return `<span class="pc-ini${o.p?' p':''}" aria-hidden="true">${esc(t)}</span>`; },
  cartao(o){ o=o||{};
    const cab=(o.tit||o.acoes)?`<div class="pc-ch">${o.ic?`<span class="pc-ic ${pcTom(o.tom)}">${pcIc(o.ic,17)}</span>`:''}<h3>${esc(o.tit||'')}</h3>${o.cont!=null?`<span class="pc-cont">${esc(o.cont)}</span>`:''}${pcH(o.acoes)}</div>`:'';
    return `<section class="pc-card${o.cls?' '+esc(o.cls):''}"${o.id?` id="${esc(o.id)}"`:''}>${cab}<div class="pc-cb${o.semPad?' sem':''}">${pcH(o.corpo)}</div>${o.rodape?`<div class="pc-cf">${pcH(o.rodape)}</div>`:''}</section>`; },
  aviso(o){ o=o||{}; const t=pcTom(o.tom)||'info';
    return `<div class="pc-aviso ${t}" role="${t==='crit'?'alert':'status'}">${pcIc(t)}<div class="t">${o.tit?`<strong>${esc(o.tit)}</strong>`:''}${o.txt?esc(o.txt):''}${o.bts?`<div class="pc-av-bt">${pcH(o.bts)}</div>`:''}</div></div>`; },
  vazio(o){ o=o||{}; const ok=o.tom==='ok';
    return `<div class="pc-vazio${ok?' ok':''}"><span class="pc-ic">${pcIc(o.ic||(ok?'ok':'vazio'),24)}</span>${o.tit?`<strong>${esc(o.tit)}</strong>`:''}${o.txt?`<p>${esc(o.txt)}</p>`:''}${o.bts?`<div>${pcH(o.bts)}</div>`:''}</div>`; },
  /* itens: [rótulo, valor, {tudo:true}] — valor vazio aparece "não informado" */
  dados(itens,o){ o=o||{}; return `<dl class="pc-dl${o.c3?' c3':''}">${(itens||[]).map(x=>{ const v=x[1], vz=v==null||v===''; return `<div${x[2]&&x[2].tudo?' class="tudo"':''}><dt>${esc(x[0])}</dt><dd${vz?' class="vz"':''}>${vz?'não informado':esc(v)}</dd></div>`; }).join('')}</dl>`; },
  nums(itens){ return `<div class="pc-nums">${(itens||[]).map(x=>{ const tag=x.act?'button':'div';
    return `<${tag}${x.act?' type="button"':''} class="pc-num ${pcTom(x.tom)}"${pcAct(x.act,x.dv)}><span>${esc(x.r)}</span><b>${esc(x.v)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</${tag}>`; }).join('')}</div>`; },
  /* "Precisa de você": itens [{tit, txt, rot, ic, tom, selo:[texto,tom], act, dv, attr, bt:{t, act, dv, attr}, cls}]; vazio → "Tudo em dia".
     act/dv: a linha inteira é o botão. bt: a linha fica parada e o botão de ação vai à direita (attr = atributos já montados
     pelo código do painel, nunca texto digitado). rot = rótulo pequeno em cima do título. cls = classes a mais na linha. */
  pv(itens,o){ o=o||{}; if(!(itens||[]).length) return `<div class="pc-pv-ok">${pcIc('ok')}${esc(o.vazio||'Tudo em dia. Nada esperando por você.')}</div>`;
    return `<div class="pc-pv">${itens.map(x=>{ const inteira=!x.bt&&(x.act||x.attr), tag=inteira?'button':'div';
      const at=inteira?(x.attr?' '+x.attr:pcAct(x.act,x.dv)):'';
      const bt=x.bt?`<button type="button" class="pc-pvb"${x.bt.attr?' '+x.bt.attr:pcAct(x.bt.act,x.bt.dv)}>${esc(x.bt.t||'Abrir')}</button>`:'';
      return `<${tag}${inteira?' type="button"':''} class="pc-pvi${x.cls?' '+esc(x.cls):''}"${at}><span class="pc-ic ${pcTom(x.tom)}">${pcIc(x.ic||pcTom(x.tom)||'info',17)}</span><span class="t">${x.rot?`<em class="pc-pvr ${pcTom(x.tom)}">${esc(x.rot)}</em>`:''}<strong>${esc(x.tit)}</strong>${x.txt?`<small>${esc(x.txt)}</small>`:''}</span>${x.selo?PCU.selo(x.selo[0],x.selo[1]):''}${bt}</${tag}>`; }).join('')}</div>`; },
  /* linha do tempo: [{t:'o que aconteceu', q:'quando · quem', tom}] */
  tempo(itens){ return `<ol class="pc-tempo">${(itens||[]).map(x=>`<li><span class="b ${pcTom(x.tom)}"></span><div><p>${esc(x.t)}</p>${x.q?`<small>${esc(x.q)}</small>`:''}</div></li>`).join('')}</ol>`; },
  /* tabela: cols [{t, dir, m:'esc'|'tudo', r:'rótulo no celular'}]; linhas [{c:[html ou texto], h:true (já é html), act, dv}] */
  tabela(o){ o=o||{}; const cols=o.cols||[];
    const cls=(c)=>[c.dir?'dir':'',c.m==='esc'?'m-esc':c.m==='tudo'?'m-tudo':''].filter(Boolean).join(' ');
    const th=cols.map(c=>`<th${c.dir?' class="dir"':''}>${esc(c.t)}</th>`).join('');
    const tr=(o.linhas||[]).map(l=>`<tr${l.act?` class="pc-clic"${pcAct(l.act,l.dv)}`:''}>${(l.c||[]).map((v,i)=>{ const c=cols[i]||{}, k=cls(c); return `<td${k?` class="${k}"`:''}${c.r?` data-r="${esc(c.r)}"`:''}>${l.h?pcH(v):esc(v)}</td>`; }).join('')}</tr>`).join('');
    if(!(o.linhas||[]).length) return PCU.vazio({tit:o.vazio||'Nada para mostrar', txt:o.vazioTxt||''});
    return `<div class="pc-rola"><table class="pc-tab${o.resp===false?'':' pc-resp'}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`; },
  campo(o){ o=o||{}; const id=o.id?esc(o.id):''; const v=o.v==null?'':esc(o.v);
    let ctl; if(o.tipo==='select') ctl=`<select${id?` id="${id}"`:''}>${(o.ops||[]).map(x=>{ const a=Array.isArray(x)?x:[x,x]; return `<option value="${esc(a[0])}"${String(a[0])===String(o.v)?' selected':''}>${esc(a[1])}</option>`; }).join('')}</select>`;
    else if(o.tipo==='area') ctl=`<textarea${id?` id="${id}"`:''}${o.ph?` placeholder="${esc(o.ph)}"`:''}>${v}</textarea>`;
    else ctl=`<input${id?` id="${id}"`:''} type="${esc(o.tipo||'text')}" value="${v}"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.im?` inputmode="${esc(o.im)}"`:''}>`;
    return `<label class="pc-campo${o.erro?' erro':''}${o.col?' pc-c'+(+o.col||12):''}"><span>${esc(o.r||'')}${o.obr?' <i>*</i>':''}</span>${ctl}${o.erro?`<em>${esc(o.erro)}</em>`:o.dica?`<em>${esc(o.dica)}</em>`:''}</label>`; },
  /* chips de filtro: [[valor, texto, contagem, ligado]] */
  chips(itens,act){ return `<div class="pc-chips" role="group">${(itens||[]).map(x=>`<button type="button" class="pc-chip" aria-pressed="${x[3]?'true':'false'}"${pcAct(act,x[0])}>${esc(x[1])}${x[2]!=null?`<b>${esc(x[2])}</b>`:''}</button>`).join('')}</div>`; },
  /* janela/gaveta: fica fora do #view (o redesenho da tela não a apaga). Esc fecha; clique no fundo fecha. */
  janela(o){ o=o||{}; const d=document.createElement('dialog');
    d.className='pc-jan'+(o.gaveta?' gaveta':'')+(o.larga?' larga':''); if(o.id) d.id=o.id;
    d.setAttribute('aria-label',o.tit||'');
    d.innerHTML=`<div class="pc-jh"><div class="t"><h2>${esc(o.tit||'')}</h2>${o.sub?`<p class="sub">${esc(o.sub)}</p>`:''}</div><button type="button" class="pc-jx" data-pc-fecha aria-label="Fechar">${pcIc('x',18)}</button></div><div class="pc-jb">${pcH(o.corpo)}</div>${o.rodape?`<div class="pc-jf">${pcH(o.rodape)}</div>`:''}`;
    let fechada=false; const fechar=()=>{ if(fechada) return; fechada=true; try{ d.close(); }catch(e){} d.remove(); try{ o.aoFechar&&o.aoFechar(); }catch(e){} };
    d.addEventListener('close',fechar); d.addEventListener('cancel',e=>{ e.preventDefault(); fechar(); });
    let dn=null; d.addEventListener('pointerdown',e=>{ dn=e.target; });
    d.addEventListener('click',e=>{ if(e.target.closest('[data-pc-fecha]')) return fechar(); if(e.target===d&&dn===d) fechar(); });
    document.body.appendChild(d); try{ d.showModal(); }catch(e){ d.setAttribute('open',''); }
    const f=d.querySelector('.pc-jb input,.pc-jb select,.pc-jb textarea'); if(f&&o.foco!==false) setTimeout(()=>{ try{ f.focus(); }catch(e){} },30);
    return {el:d, fechar}; }
};
try{ window.Painel.ui=PCU; }catch(e){}
