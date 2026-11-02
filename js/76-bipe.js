/* Painel Colafix · 76-bipe.js (01/11) — FOLHAS DO COLETOR: bipou, registrou (pedido: o pessoal não usa o computador dos chamados).
   Coletor sem fio, sem tela, que lê QR e "digita" o código + Enter no computador com o painel aberto (qualquer tela).
   Uma folha A4 por linha (e, se quiser, por máquina cadastrada da linha) com os itens do quadro da fábrica:
     ELE Parada · problema elétrico → abre chamado da manutenção (defeito "Elétrico / painel", máquina parada)
     MEC Parada · problema mecânico → abre chamado ("Mecânico", máquina parada)
     FPR / POP / ALM / PMX Parada · falta de produto / problema OP / almoço / falta premix → pausa a ordem rodando na linha com o motivo
     INI Início de produção → retoma a ordem pausada ou começa a próxima ordem da fila da linha (seqCmp)
     FIM Fim de produção → termina a ordem rodando (ou encerra a pausada)
     RET Retomou produção → volta a rodar a ordem pausada
     DES Desfazer → desfaz o último bipe de ordem (até 15 min); chamado aberto por engano: avisa para cancelar na manutenção
   Código: EV-<EVT>-<LINHA>[-<MAQUINA>] (cbSlug; só letras, números e hífen, igual em teclado americano e ABNT).
   Retorno: aviso grande na tela por 7 s (verde, amarelo ou vermelho) + som. Na tela das folhas (manqr, modo "bipe") só testa.
   Chamado não duplica: se já há chamado aberto da mesma linha/máquina, mostra o número dele. Quem: "Coletor (bipe)".
   FOLHA DA ORDEM (OP-<nº>) no computador marcado como "do coletor" (localStorage colafix.coletorOrdens='1'):
     não começou → começa (encerra a que rodava na linha) · rodando → pausa ("Pausa") · pausada → volta a rodar.
     Bipou um motivo da folha da máquina até 3 min depois da pausa pela folha da ordem → troca o motivo da pausa.
     Nos outros computadores, no posto e no tablet, a folha da ordem continua como antes. */
"use strict";
const EV_TIPOS=[['ELE','Parada','Problema elétrico','crit','Abre chamado da manutenção'],['MEC','Parada','Problema mecânico','crit','Abre chamado da manutenção'],
  ['FPR','Parada','Falta de produto','warn','Pausa a ordem'],['POP','Parada','Problema OP','warn','Pausa a ordem'],['ALM','Parada','Almoço','warn','Pausa a ordem'],
  ['INI','Produção','Início de produção','ok','Começa ou retoma a ordem'],['FIM','Produção','Fim de produção','neu','Termina a ordem'],
  ['PMX','Parada','Falta premix','warn','Pausa a ordem'],['RET','Produção','Retomou produção','ok','Volta a rodar a ordem']];
const EV_MOT={FPR:'Falta de produto',POP:'Problema na OP',ALM:'Almoço',PMX:'Falta de premix'};
const EV_QUEM='Coletor (bipe)', EV_PAUSA_OP='Pausa';
const evColetorOn=()=>{ try{ return localStorage.getItem('colafix.coletorOrdens')==='1'; }catch(e){ return false; } };
S.ev={ult:null,aviso:null,sel:null,teste:null,ocup:false};
const evTipo=k=>EV_TIPOS.find(t=>t[0]===k);
function evEquipKey(e){ return cbSlug(e&&(e.id||e.nome)).slice(0,14); }
function evCod(k,l,e){ return 'EV-'+k+(l?'-'+cbSlug(l):'')+(e?'-'+evEquipKey(e):''); }
function evLer(cod){ const m=String(cod||'').toUpperCase().match(/^EV-([A-Z]{3})(?:-([A-Z0-9]+))?(?:-([A-Z0-9]+))?$/); if(!m) return null;
  if(m[1]==='DES') return {k:'DES'}; const t=evTipo(m[1]); if(!t) return {erro:'Código de evento desconhecido: '+m[1]};
  const l=linhasOrd().find(x=>cbSlug(x)===m[2]); if(!l) return {erro:'A linha deste código não está cadastrada no painel.'};
  let e=null; if(m[3]){ e=(typeof mxEquips==='function'?mxEquips(l):[]).find(x=>evEquipKey(x)===m[3])||null; if(!e) return {erro:'A máquina deste código não está cadastrada na '+l+'.'}; }
  return {k:m[1],t,l,e}; }

/* ---------- som e aviso grande ---------- */
function evSom(bom){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const c=S.ev._ac||(S.ev._ac=new A()); const fs=bom?[880,1320]:[330,220];
  fs.forEach((f,i)=>{ const o=c.createOscillator(), g=c.createGain(); o.frequency.value=f; o.type='sine'; g.gain.setValueAtTime(0.0001,c.currentTime+i*.16); g.gain.exponentialRampToValueAtTime(.35,c.currentTime+i*.16+.02); g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+i*.16+.15); o.connect(g); g.connect(c.destination); o.start(c.currentTime+i*.16); o.stop(c.currentTime+i*.16+.17); }); }catch(e){} }
function evAvisar(c,tit,txt,sub){ S.ev.aviso={c,tit,txt,sub:sub||'',em:Date.now()}; evSom(c==='ok'||c==='info'); evPinta(); clearTimeout(S.ev._tm); S.ev._tm=setTimeout(()=>{ S.ev.aviso=null; evPinta(); },c==='crit'||c==='warn'?9000:7000); }
function evPinta(){ let el=document.getElementById('ev-aviso'); const A=S.ev.aviso; if(!A){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='ev-aviso'; el.setAttribute('role','status'); el.setAttribute('aria-live','assertive'); document.body.appendChild(el); }
  el.className='ev-av '+A.c; el.innerHTML=`<div class="ev-ab"><span class="ev-ai">${A.c==='ok'||A.c==='info'?ic('check',34,2.6):'!'}</span><div><small>${esc(A.sub)}</small><b>${esc(A.tit)}</b><p>${esc(A.txt)}</p></div><button class="ev-ax" data-act="ev-fecha" aria-label="Fechar aviso">×</button></div>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="ev-fecha"]'); if(b){ S.ev.aviso=null; evPinta(); } });

/* ---------- o que cada bipe faz ---------- */
const evNome=(l,e)=>e?e.nome+' · '+l:l;
async function evExecuta(x){ const {k,l,e}=x, nm=evNome(l,e), titulo=x.t?x.t[2]:'';
  if(k==='ELE'||k==='MEC'){ const def=k==='ELE'?'Elétrico / painel':'Mecânico';
    const ja=(S.chamados||[]).find(c=>c.linha===l&&(!e||c.equipId===e.id||c.equip===e.nome)&&!manIgnorar(c)&&!manFechada(c)&&c.status!=='Concluída');
    if(ja) return evAvisar('warn',nm,'Já tem chamado aberto: OS '+manNum(ja.numero)+' · '+(ja.defeito||''),'Não abri outro');
    if(S.man.salv&&Date.now()-(S.man._salvDesde||0)>30000) S.man.salv=false;
    manNovo(l); Object.assign(S.man.f,{linha:l,quando:manAgoraLocal(),defeito:def,impacto:'parou',nome:EV_QUEM,equip:e?e.nome:'',equipId:e?e.id:'',origem:'coletor'}); S.man.novo=false; S.man.cur=null; S.man._salvDesde=Date.now();
    try{ await manSalvar(); }catch(er){ S.man.f=null; return evAvisar('crit',nm,'Não consegui abrir o chamado: '+(er&&er.message||er),'Chame a manutenção'); }
    const n=S.man.cur; S.man.cur=null; S.man.novo=false; const doc=(S.chamados||[]).find(c=>c.linha===l&&c.origem==='coletor'&&c.defeito===def&&Date.now()-new Date(c.criado).getTime()<60000);
    S.ev.ult={k,em:Date.now(),chamado:doc?doc.numero:n};
    return evAvisar('crit',nm,'Chamado aberto'+(doc?' · OS '+manNum(doc.numero):'')+' · '+titulo.toLowerCase(),'Manutenção avisada'); }
  if(EV_MOT[k]){ const o=otAtivaNaLinha(l); const mot=EV_MOT[k]+(e?' · '+e.nome:'');
    if(!o){ const p=otPausadaNaLinha(l), up=p&&otPausada(p);
      if(up&&up.pausa===EV_PAUSA_OP&&Date.now()-new Date(up.fim).getTime()<3*60000){ const antes=otSegs(p).map(x=>Object.assign({},x)), ss=antes.map(x=>Object.assign({},x)); ss[ss.length-1].pausa=mot; ss[ss.length-1].motivo='pausa: '+mot; await otGrava(p,ss); S.ev.ult={k,em:Date.now(),o:p._id,antes};
        return evAvisar('warn',nm,'Motivo da pausa da ordem '+p.num+': '+EV_MOT[k].toLowerCase(),'Motivo registrado'); }
      return evAvisar('warn',nm,p?'A ordem '+p.num+' já estava pausada ('+(otPausada(p).pausa||'')+').':'Nenhuma ordem rodando nesta linha: a parada não foi registrada.',titulo); }
    const antes=otSegs(o).map(s=>Object.assign({},s)); await otPausar(o,mot,EV_QUEM); S.ev.ult={k,em:Date.now(),o:o._id,antes};
    return evAvisar('warn',nm,'Ordem '+o.num+' pausada · '+EV_MOT[k].toLowerCase(),'Parada registrada'); }
  if(k==='RET'||k==='INI'){ const roda=otAtivaNaLinha(l); if(roda) return evAvisar('info',nm,'A ordem '+roda.num+' já está rodando.',titulo);
    const p=otPausadaNaLinha(l);
    if(p){ const antes=otSegs(p).map(s=>Object.assign({},s)); try{ await otRetomar(p,EV_QUEM); }catch(er){ return evAvisar('crit',nm,'Não consegui retomar: '+(er&&er.message||er),titulo); } S.ev.ult={k,em:Date.now(),o:p._id,antes};
      return evAvisar('ok',nm,'Ordem '+p.num+' voltou a rodar','Produção retomada'); }
    if(k==='RET') return evAvisar('warn',nm,'Nada pausado nesta linha para retomar.',titulo);
    const cand=(typeof ordAbertas==='function'?ordAbertas():[]).filter(o=>o.linha===l&&!otSegs(o).length).sort(typeof seqCmp==='function'?seqCmp:(()=>0));
    if(!cand.length) return evAvisar('warn',nm,'Nenhuma ordem programada para esta linha.',titulo);
    const o=cand[0]; await otIniciar(o,new Date().toISOString(),EV_QUEM); S.ev.ult={k,em:Date.now(),o:o._id,antes:[]};
    return evAvisar('ok',nm,'Ordem '+o.num+' começou'+(o.produto?' · '+o.produto:'')+(cand.length>1?' (a próxima da fila; se não for esta, bipe Desfazer)':''),'Produção iniciada'); }
  if(k==='FIM'){ const o=otAtivaNaLinha(l)||otPausadaNaLinha(l); if(!o) return evAvisar('warn',nm,'Nenhuma ordem rodando nesta linha.',titulo);
    const antes=otSegs(o).map(s=>Object.assign({},s));
    if(otAberto(o)) await otTerminar(o,EV_QUEM); else { const ss=antes.map(s=>Object.assign({},s)); ss[ss.length-1].encerrada=true; await otGrava(o,ss); }
    S.ev.ult={k,em:Date.now(),o:o._id,antes}; return evAvisar('ok',nm,'Ordem '+o.num+' terminada','Fim de produção'); }
  if(k==='DES'){ const u=S.ev.ult; if(!u||Date.now()-u.em>15*60000) return evAvisar('warn','Desfazer','Nada para desfazer (só os últimos 15 minutos).','');
    if(u.chamado!=null){ S.ev.ult=null; return evAvisar('warn','Desfazer','O chamado OS '+manNum(u.chamado)+' continua aberto: peça para a manutenção cancelar.','Chamado não se desfaz sozinho'); }
    const o=ordById(u.o); if(!o) return evAvisar('crit','Desfazer','Não achei a ordem para desfazer.','');
    await otGrava(o,u.antes.map(s=>Object.assign({},s))); for(const x of (u.extra||[])){ const ox=ordById(x.o); if(ox) await otGrava(ox,x.antes.map(s=>Object.assign({},s))); } S.ev.ult=null; return evAvisar('ok','Desfeito','O último bipe ('+(({OPP:['','','pausa pela folha da ordem'],OPR:['','','retomada pela folha da ordem'],OPI:['','','começo pela folha da ordem']})[u.k]||evTipo(u.k)||['','',''])[2].toLowerCase()+') foi desfeito na ordem '+o.num+'.',''); } }
async function evBipou(cod){ const x=evLer(cod); if(!x) return false;
  if(S.view==='manqr'&&S.cb.modo==='bipe'){ S.ev.teste=x.erro?{ok:false,cod,txt:x.erro}:{ok:true,cod,txt:x.k==='DES'?'Desfazer o último bipe':evNome(x.l,x.e)+' · '+x.t[2]+' → '+x.t[4].toLowerCase()}; render(); evSom(!x.erro); return true; }
  if(x.erro){ evAvisar('crit','Código não reconhecido',x.erro,cod); return true; }
  if(S.ev.ocup){ evAvisar('warn','Aguarde','Ainda estou registrando o bipe anterior.',''); return true; }
  if(!S.db){ evAvisar('crit','Sem conexão','O painel está sem conexão: o bipe não foi registrado.',''); return true; }
  S.ev.ocup=true; try{ await evExecuta(x); }catch(er){ evAvisar('crit',x.l?evNome(x.l,x.e):'Erro','Não consegui registrar: '+(er&&er.message||er),''); } finally{ S.ev.ocup=false; try{ render(); }catch(e){} } return true; }
async function evOrdem(num){ const o=(S.ordens||[]).find(x=>String(x.num)===String(num)); if(!o) return evAvisar('crit','Ordem '+num,'Não achei esta ordem no painel.','');
  const l=o.linha, nm='Ordem '+o.num+(o.produto?' · '+o.produto:''); if(!l) return evAvisar('warn',nm,'Esta ordem ainda não foi programada em nenhuma linha.','');
  if(o.status&&o.status!=='aberta') return evAvisar('warn',nm,'Esta ordem já foi encerrada.',l);
  const antes=otSegs(o).map(x=>Object.assign({},x));
  if(otAberto(o)){ await otPausar(o,EV_PAUSA_OP,EV_QUEM); S.ev.ult={k:'OPP',em:Date.now(),o:o._id,antes}; return evAvisar('warn',l,nm+' pausada. Para dizer o motivo, bipe o motivo na folha da máquina.','Ordem pausada'); }
  if(otPausada(o)){ try{ await otRetomar(o,EV_QUEM); }catch(er){ const m=String(er&&er.message||er).match(/rodando:(.+)/); return evAvisar('warn',l,m?'A '+l+' está rodando a ordem '+m[1]+': pause ou termine aquela antes.':'Não consegui retomar: '+(er&&er.message||er),nm); }
    S.ev.ult={k:'OPR',em:Date.now(),o:o._id,antes}; return evAvisar('ok',l,nm+' voltou a rodar','Produção retomada'); }
  const outra=otAtivaNaLinha(l,o._id), outraAntes=outra?otSegs(outra).map(x=>Object.assign({},x)):null; await otIniciar(o,new Date().toISOString(),EV_QUEM); S.ev.ult={k:'OPI',em:Date.now(),o:o._id,antes,extra:outra?[{o:outra._id,antes:outraAntes}]:[]};
  return evAvisar('ok',l,nm+' começou'+(outra?' · a ordem '+outra.num+' que rodava foi encerrada':''),'Produção iniciada'); }
{ const _cb=cbLeu; cbLeu=function(cod){ const c=String(cod||'').toUpperCase(); if(/^EV-/.test(c)){ evBipou(c); return; }
    let num=/^OP-?\d{3,}$/.test(c)?c.replace(/\D/g,''):'';
    if(!num&&evColetorOn()&&S.view!=='mantotem'){ /* folha de ordem com rancho: o QR traz o link do rancho (ou RA-<nº>) → a ordem daquele rancho */
      let rn=''; try{ const k=typeof lerCodigo==='function'?lerCodigo(cod):null; if(k&&k.tipo==='rancho') rn=String(k.num); }catch(e){} if(!rn){ const m=c.match(/^RA-?(\d{4,})$/); if(m) rn=m[1]; }
      if(rn){ const os=(S.ordens||[]).filter(o=>String(o.rancho||'').replace(/\D/g,'')===rn.replace(/\D/g,'')&&(!o.status||o.status==='aberta')&&o.linha);
        const o=os.find(x=>otAberto(x))||os.find(x=>otPausada(x))||os.slice().sort(typeof seqCmp==='function'?seqCmp:(()=>0))[0]; if(o) num=String(o.num); } }
    if(num&&evColetorOn()&&S.view!=='mantotem'&&!(typeof p26CampoNum==='function'&&p26CampoNum())){
      if(S.view==='manqr'&&S.cb.modo==='bipe'){ S.ev.teste={ok:true,cod:c,txt:'folha da ordem '+num+' → começa, pausa ou volta a rodar'}; render(); evSom(true); return; }
      if(S.ev.ocup) return evAvisar('warn','Aguarde','Ainda estou registrando o bipe anterior.','');
      S.ev.ocup=true; evOrdem(num).catch(er=>evAvisar('crit','Ordem '+num,'Não consegui registrar: '+(er&&er.message||er),'')).finally(()=>{ S.ev.ocup=false; try{ render(); }catch(e){} }); return; }
    return _cb.apply(this,arguments); }; }

/* ---------- tela das folhas: Manutenção › Códigos das linhas › "Folhas do coletor" ---------- */
function evFolhas(){ const L=linhasOrd(), out=[]; L.forEach(l=>{ out.push({l,e:null}); (typeof mxEquips==='function'?mxEquips(l):[]).forEach(e=>out.push({l,e})); }); return out; }
const evFid=f=>cbSlug(f.l)+(f.e?'-'+evEquipKey(f.e):'');
function evSelec(){ if(!S.ev.sel){ S.ev.sel={}; linhasOrd().forEach(l=>S.ev.sel[cbSlug(l)]=true); } return S.ev.sel; }
function evFolhaHtml(f){ const nome=f.e?f.e.nome:f.l;
  return `<article class="ev-folha"><header><span>FOLHA DO COLETOR</span><h3>${esc(nome)}</h3>${f.e?`<small>${esc(f.l)}</small>`:''}</header><div class="ev-cods">${EV_TIPOS.map(t=>`<div class="ev-cod ${t[3]}"><span class="ev-qr">${manQrSvg(evCod(t[0],f.l,f.e),92)}</span><div><small>${esc(t[1])}</small><b>${esc(t[2])}</b><em>${esc(t[4])}</em></div></div>`).join('')}
    <div class="ev-cod des"><span class="ev-qr">${manQrSvg('EV-DES',92)}</span><div><small>Errou?</small><b>Desfazer</b><em>Desfaz o último bipe de ordem</em></div></div></div></article>`; }
{ const _vq=vManQr; vManQr=function(){ let h=_vq(); const seg='<button data-act="cb-modo" data-v="bipe" aria-pressed="'+(S.cb.modo==='bipe')+'">Folhas do coletor · bipe</button>';
  h=h.replace(/(<button data-act="cb-modo" data-v="barras"[^>]*>[^<]*<\/button>)/,'$1'+seg);
  if(S.cb.modo!=='bipe') return h;
  const F=evFolhas(), sel=evSelec(), T=S.ev.teste, marc=F.filter(f=>sel[evFid(f)]);
  const lista=linhasOrd().map(l=>{ const fs=F.filter(f=>f.l===l); return `<div class="ev-ln"><label class="ev-ck"><input type="checkbox" data-ev-sel="${esc(evFid(fs[0]))}" ${sel[evFid(fs[0])]?'checked':''}><b>${esc(l)}</b></label>${fs.slice(1).map(f=>`<label class="ev-ck sub"><input type="checkbox" data-ev-sel="${esc(evFid(f))}" ${sel[evFid(f)]?'checked':''}>${esc(f.e.nome)}</label>`).join('')}</div>`; }).join('');
  const corpo=`<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong);margin-bottom:12px">Uma folha por linha ou máquina, com um QR para cada item do quadro. O coletor tem que estar ligado a um computador com o painel aberto: o aviso do que foi registrado aparece nesse computador, em letras grandes, com som. <b>Nesta tela os bipes só testam</b>, nada é registrado.</div>
    <label class="ev-pc ${evColetorOn()?'on':''}"><input type="checkbox" data-act="ev-coletor" ${evColetorOn()?'checked':''}><span><b>Este é o computador do coletor</b><small>Ligado: bipar a folha da ordem (OP) começa, pausa ou volta a rodar a ordem. Desligado: a folha da ordem só abre a Programação, como antes. Vale só para este computador.</small></span></label>
    <div class="cb-teste ${T?(T.ok?'ok':'err'):''}">${ic('grid',18,2)}<span>${T?(T.ok?'Leu <b>'+esc(T.cod)+'</b> → '+esc(T.txt):'Leu <b>'+esc(T.cod)+'</b>: '+esc(T.txt)):'Teste o coletor: bipe qualquer QR das folhas abaixo.'}</span></div>
    <div class="ev-grid"><section class="card ev-sel"><h2>Quais folhas</h2><p class="sub" style="margin:0 0 8px">Máquinas aparecem quando estão cadastradas na linha (Manutenção › Máquinas).</p>${lista}
      <button class="btn" data-act="ev-pdf" ${marc.length?'':'disabled'} style="width:100%;margin-top:12px">${ic('baixar',18,2)}Baixar PDF · ${marc.length} ${marc.length===1?'folha':'folhas'}</button></section>
    <div class="ev-prev">${marc.length?marc.slice(0,2).map(evFolhaHtml).join('')+(marc.length>2?`<p class="sub">…e mais ${marc.length-2} no PDF.</p>`:''):'<div class="empty">Marque ao menos uma folha.</div>'}</div></div>`;
  return h.replace(/<button class="btn" data-act="(man-qr-imp|cb-pdf)">[\s\S]*?<\/button>/,'').replace(/<div class="man-qrs[\s\S]*$/,'')+corpo; }; }
document.addEventListener('change',ev=>{ const t=ev.target; if(t&&t.dataset&&t.dataset.act==='ev-coletor'){ try{ localStorage.setItem('colafix.coletorOrdens',t.checked?'1':'0'); }catch(e){} toast(t.checked?'Este computador agora é o do coletor: a folha da ordem começa e pausa a produção.':'A folha da ordem voltou a só abrir a Programação neste computador.'); render(); return; }
  if(!t||!t.dataset||!t.dataset.evSel) return; evSelec()[t.dataset.evSel]=t.checked; render(); });
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="ev-pdf"]'); if(b) evPdf(); },true);
async function evPdf(){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } const sel=evSelec(), F=evFolhas().filter(f=>sel[evFid(f)]); if(!F.length) return;
  const pdf=new window.jspdf.jsPDF('p','mm','a4'), W=210, mx=12, cw=(W-2*mx)/2, top=40, rh=50.5, cor={crit:[192,57,43],warn:[196,120,20],ok:[47,140,90],neu:[91,103,112],des:[120,120,120]};
  F.forEach((f,i)=>{ if(i) pdf.addPage(); const nome=f.e?f.e.nome:f.l;
    pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(31,56,100); pdf.text('COLAFIX · FOLHA DO COLETOR',mx,16);
    pdf.setFontSize(26); pdf.setTextColor(0,0,0); pdf.text(String(nome).toUpperCase()+(f.e?'  ·  '+f.l:''),mx,28);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(90,90,90); pdf.text('Aponte o coletor para o QR do que aconteceu. O aviso aparece no computador do painel.',mx,35);
    const itens=EV_TIPOS.map(t=>({cod:evCod(t[0],f.l,f.e),a:t[1],b:t[2],c:t[4],k:t[3]})).concat([{cod:'EV-DES',a:'Errou?',b:'Desfazer',c:'Desfaz o último bipe de ordem',k:'des'}]);
    itens.forEach((it,j)=>{ const x=mx+(j%2)*cw, y=top+Math.floor(j/2)*rh, cc=cor[it.k]||cor.neu;
      pdf.setDrawColor(200); pdf.setLineWidth(.3); pdf.roundedRect(x+1.5,y+1.5,cw-3,rh-3,3,3); pdf.setFillColor(cc[0],cc[1],cc[2]); pdf.rect(x+1.5,y+1.5,3,rh-3,'F');
      desenharQR(pdf,it.cod,x+8,y+6,38);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(cc[0],cc[1],cc[2]); pdf.text(String(it.a).toUpperCase(),x+50,y+17);
      pdf.setFont('helvetica','bold'); pdf.setFontSize(14); pdf.setTextColor(0,0,0); pdf.text(pdf.splitTextToSize(it.b,cw-56),x+50,y+25);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(100,100,100); pdf.text(pdf.splitTextToSize(it.c,cw-54),x+50,y+38); }); });
  await manBaixar(pdf,'Folhas_do_coletor.pdf','PDF com '+F.length+(F.length===1?' folha':' folhas')+'. Imprima e plastifique.'); }
document.head.insertAdjacentHTML('beforeend',`<style id="ev-css">
.ev-av{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:9999;width:min(720px,calc(100vw - 32px));border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.28);color:#fff;animation:evIn .18s ease-out}
.ev-av.ok,.ev-av.info{background:#2F7D52}.ev-av.warn{background:#B8700F}.ev-av.crit{background:#B3362A}.ev-av.neu{background:#3F4A52}
.ev-ab{display:flex;align-items:center;gap:20px;padding:24px 28px}.ev-ai{flex:0 0 64px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:40px;font-weight:800}
.ev-ab>div{flex:1;min-width:0}.ev-ab small{display:block;font-size:15px;opacity:.9;font-weight:600}.ev-ab b{display:block;font-size:34px;line-height:1.1;margin:2px 0 4px}.ev-ab p{margin:0;font-size:19px;line-height:1.35}
.ev-ax{background:rgba(255,255,255,.16);border:0;color:#fff;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer;align-self:flex-start}
@keyframes evIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}
@media (prefers-reduced-motion:reduce){ .ev-av{animation:none} }
.ev-pc{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:14px;border:1.5px solid var(--line);background:var(--surface);margin:0 0 12px;cursor:pointer}.ev-pc.on{border-color:var(--ok);background:var(--ok-tint)}
.ev-pc input{width:20px;height:20px;margin-top:2px;accent-color:var(--ok)}.ev-pc b{display:block;font-size:15px}.ev-pc small{display:block;color:var(--ink-2);font-size:13px;margin-top:2px}
.ev-grid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start;margin-top:14px}.ev-sel h2{margin:0 0 4px;font-size:16px}
.ev-ln{padding:8px 0;border-top:1px solid var(--line)}.ev-ck{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:14px}.ev-ck.sub{padding-left:24px;color:var(--ink-2)}
.ev-prev{display:flex;flex-direction:column;gap:16px}.ev-folha{background:#fff;color:#111;border:1px solid var(--line);border-radius:12px;padding:18px 20px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.ev-folha header span{font-size:11px;font-weight:700;letter-spacing:1px;color:#1F3864}.ev-folha header h3{margin:2px 0 0;font-size:24px}.ev-folha header small{color:#666}
.ev-cods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.ev-cod{display:flex;gap:12px;align-items:center;border:1px solid #ddd;border-left:5px solid #5B6770;border-radius:10px;padding:8px}
.ev-cod.crit{border-left-color:#C0392B}.ev-cod.warn{border-left-color:#C47814}.ev-cod.ok{border-left-color:#2F8C5A}.ev-cod.des{border-left-color:#999}
.ev-qr svg{width:92px;height:92px;display:block}.ev-cod small{display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#777}.ev-cod b{display:block;font-size:16px}.ev-cod em{display:block;font-style:normal;font-size:12px;color:#666}
@media (max-width:900px){ .ev-grid{grid-template-columns:minmax(0,1fr)} .ev-cods{grid-template-columns:minmax(0,1fr)} }
</style>`);
