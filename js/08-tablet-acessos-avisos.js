/* Painel Colafix · 08-tablet-acessos-avisos.js — tablet da parede, crachás, acessos por pessoa, avisos, gestor, TV dividida, RH/almox.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

/* ===FIM MANUTENÇÃO CONFIÁVEL=== */
/* ===================== CRACHÁ + TABLET DA PAREDE (07/10): o funcionário passa o crachá na câmera e abre o chamado ===================== */
/* crachas/{codigo} = {codigo,nome,linha,papel:'operador'|'tecnico',ativo,criadoEm,por}
   QR do crachá = "COLAFIX:CRACHA:<codigo>" (só o código: nada de senha, CPF ou dados pessoais).
   O tablet entra com uma conta própria (cargo "Produção · Tela da linha"); o crachá diz QUEM está usando. */
const TT_ALFA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TT_RE=/^COLAFIX:CRACHA:([A-Z0-9]{6,12})$/;
const TT_DEFEITOS=['Parou / travou','Barulho anormal','Vazamento','Correia / corrente','Elétrico / painel','Sensor / falha de leitura','Aquecendo','Outro'];
const TT_PAPEL={operador:'Operador(a)',tecnico:'Técnico(a) da manutenção'};
S.cr={lista:[],sub:false,f:{nome:'',linha:'',papel:'operador'},conf:null,salv:false};
S.tt={fase:'espera',p:null,linha:'',equipId:'',equip:'',defeito:'',txt:'',ult:0,ocioso:45000,recente:{},msg:'',enviando:false,numero:null,cam:'',linhas:null};
function crCodigo(){ const a=new Uint8Array(8); try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<8;i++) a[i]=Math.floor(Math.random()*256); } return [...a].map(x=>TT_ALFA[x%TT_ALFA.length]).join(''); }
function crQrTexto(cod){ return 'COLAFIX:CRACHA:'+cod; }
function crAssinar(){ if(S.cr.sub||!S.db) return; S.cr.sub=true; inscrever('crachas',()=>S.db.collection('crachas').limit(1000),snap=>{ S.cr.lista=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rerenderSeguro(); }); }
function crDe(cod){ return S.cr.lista.find(c=>c.codigo===cod||c._id===cod)||null; }
/* crachá lido pelo coletor */
function crColetor(cod){ if(S.view==='mantotem'){ S.tt.ult=Date.now(); if(S.tt.fase!=='espera'){ toast('Termine ou cancele o que está na tela antes de passar outro crachá.'); return; } ttLeu('COLAFIX:CRACHA:'+cod); return; }
  const c=crDe(cod);
  if(S.view==='mancrachas'){ S.cr.teste=c?{ok:true,txt:'Leu o crachá de '+c.nome+(c.ativo===false?' (DESATIVADO)':'')}:{ok:false,txt:'Leu '+cod+', mas não é um crachá cadastrado'}; toast(S.cr.teste.txt+'.'); render(); return; }
  toast(c?'Crachá de '+c.nome+' lido. Ele é usado no tablet da parede (modo parede).':'Crachá não reconhecido.'); }
function crPodeGerir(){ return !!(S.acs&&S.acs.dono); }
function ttPodeUsar(){ try{ if(S.acs&&S.acs.dono) return true; const p=acsP(); return !!p&&(p.tudo||['paradas','producao','manut'].some(m=>(p.mods||[]).includes(m))); }catch(e){ return false; } }
/* regra: quem abre e quem conserta se identificam pelo crachá. "Sem crachá" só se a administradora liberar (emergência). */
function ttSemCrachaOk(){ return !!(S.cfg&&S.cfg.totemSemCracha); }
function ttLinhas(){ const m=(location.search+'&'+location.hash).match(/[?&#]linhas=([^&#]+)/); if(m){ let v=''; try{ v=decodeURIComponent(m[1].replace(/\+/g,' ')); }catch(e){ v=m[1]; } const ls=v.split(',').map(x=>x.trim()).filter(x=>linhasOrd().includes(x)); if(ls.length) return ls; }
  const todas=linhasOrd(); if(todas.length) return todas; /* padrão: todas as linhas */
  if(S.tt.linhas) return S.tt.linhas; let l=null; try{ l=JSON.parse(localStorage.getItem('painel.totem.linhas')||'null'); }catch(e){} return (S.tt.linhas=Array.isArray(l)&&l.length?l:['Linha 1','Linha 2']); }

/* ---------- telas no menu ---------- */
Object.assign(VIEWS,{mancrachas:{nome:'Crachás',ic:'equipe',mob:'Crachás'},mantotem:{nome:'Tablet da parede',ic:'tela',mob:'Tablet'}});
Object.assign(CRUMB,{mancrachas:'Crachás (QR dos funcionários)',mantotem:'Tablet da parede'});
{ const M=MODS.find(m=>m.id==='manut'); if(M&&!M.views.includes('mancrachas')) M.views.push('mancrachas'); }
{ const _vo=viewOk; viewOk=function(v){ if(v==='mancrachas') return crPodeGerir(); if(v==='mantotem') return ttPodeUsar(); return _vo.apply(this,arguments); }; }
{ const _mv=manView; manView=function(v){ if(v==='mancrachas'||v==='mantotem') crAssinar(); return v==='mancrachas'?vCrachas():v==='mantotem'?vTotem():_mv(v); }; }
setInterval(()=>{ try{ if(S.db&&S.acs&&S.acs.pronto&&(S.view==='mantotem'||S.view==='mancrachas')) crAssinar(); }catch(e){} },1000);
/* botão para abrir o modo tablet na tela de chamados */
{ const _vc=vManCh; vManCh=function(){ let h=_vc.apply(this,arguments); if(S.man.cur!=null||!ttPodeUsar()) return h; return h.replace('<div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap">','<div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-go="mantotem">'+ic('tela',18,2)+'Modo tablet da parede</button>'); }; }
/* endereço do tablet: ...?totem=1 abre direto no modo parede */
(function(){ if(!/[?&#]totem=1/.test(location.search+'&'+location.hash)) return; let t=0; const tenta=()=>{ if(S.acs&&S.acs.pronto&&acsP()){ if(ttPodeUsar()) go('mantotem'); else toast('Você não possui permissão para acessar este módulo.'); return; } if(++t<120) setTimeout(tenta,500); }; setTimeout(tenta,300); })();

/* ---------- cadastro dos crachás (só a administradora) ---------- */
function vCrachas(){ const F=S.cr.f, LT=linhasOrd(); const xs=S.cr.lista.slice().sort((a,b)=>(a.ativo===false)-(b.ativo===false)||String(a.linha).localeCompare(String(b.linha))||String(a.nome).localeCompare(String(b.nome)));
  const row=c=>`<div class="mx-er" style="${c.ativo===false?'opacity:.55':''}"><span class="mx-eic">${manQrSvg(crQrTexto(c.codigo),34)}</span><div class="mx-en"><b>${esc(c.nome)}</b><small>${esc(TT_PAPEL[c.papel]||c.papel)} · ${esc(c.linha||'todas as linhas')} · código ${esc(c.codigo)}${c.ativo===false?' · DESATIVADO':''}</small></div>
    <div class="mx-ea">${c.ativo===false?'':`<button class="eq-lk" data-act="cr-pdf" data-id="${esc(c._id)}">${ic('baixar',15,2)}Imprimir crachá</button><button class="eq-lk" data-act="cr-novo-cod" data-id="${esc(c._id)}" title="Para crachá perdido: o código antigo para de funcionar">${ic('chaveacesso',15,2)}Novo código</button>`}${S.cr.conf===c._id?`<button class="eq-lk del" data-act="cr-desat" data-id="${esc(c._id)}">Confirmar</button>`:c.ativo===false?`<button class="eq-lk" data-act="cr-reat" data-id="${esc(c._id)}">Reativar</button>`:`<button class="eq-lk del" data-act="cr-conf" data-id="${esc(c._id)}">${ic('lixo',15,2)}Desativar</button>`}</div></div>`;
  return `${banner()}<div class="head"><div><div class="eyebrow">MANUTENÇÃO</div><h1>Crachás</h1><div class="sub">Cada funcionário recebe um QR no crachá. No tablet da parede ele passa o crachá na câmera e o chamado sai no nome dele, já na linha dele. O QR só tem um código: não abre o painel em outro aparelho.</div></div>
   <div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="cr-pdf-todos">${ic('baixar',18,2)}Imprimir todos os crachás</button><button class="btn sec" data-go="mantotem">${ic('tela',18,2)}Abrir modo tablet</button></div></div>
   <section class="card"><label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="cr-semcr" ${ttSemCrachaOk()?'checked':''} style="width:22px;height:22px;margin-top:2px"><span><b>Permitir chamado sem crachá no tablet</b><small style="display:block;color:var(--muted)">Desligado: só abre chamado quem passa o crachá. Ligue só se precisar de uma saída para quem esqueceu o crachá (o chamado fica marcado como "sem crachá").</small></span></label></section>
   <div class="cb-teste ${S.cr.teste?(S.cr.teste.ok?'ok':'err'):''}" style="margin-bottom:14px">${ic('grid',18,2)}<span>${S.cr.teste?esc(S.cr.teste.txt):'Teste o coletor: bipe o código de barras de um crachá impresso.'}</span></div>
   <section class="card mx-new"><div class="label" style="margin-bottom:8px">NOVO CRACHÁ</div><div class="mx-nf"><input class="txt" id="cr-nome" placeholder="Nome como vai aparecer (ex.: Ana Souza)" value="${esc(F.nome)}" maxlength="60"><select class="txt" id="cr-linha"><option value="">Linha…</option>${LT.map(l=>`<option ${F.linha===l?'selected':''}>${esc(l)}</option>`).join('')}<option value="" disabled>──</option><option value="*" ${F.linha==='*'?'selected':''}>Todas (manutenção)</option></select>
    <select class="txt" id="cr-papel"><option value="operador" ${F.papel==='operador'?'selected':''}>Operador(a) da linha</option><option value="tecnico" ${F.papel==='tecnico'?'selected':''}>Técnico(a) da manutenção</option></select><button class="btn" data-act="cr-add" ${S.cr.salv?'disabled':''}>${ic('mais',18,2.4)}${S.cr.salv?'Salvando…':'Criar crachá'}</button></div></section>
   <section class="card"><div class="head" style="align-items:baseline"><h2>Funcionários com crachá</h2><span class="sub" style="margin:0">${xs.filter(c=>c.ativo!==false).length} ativo(s)</span></div>${xs.length?xs.map(row).join(''):'<div class="empty">Nenhum crachá ainda.</div>'}</section>`; }
async function crPdf(cs){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } if(!cs.length){ toast('Nenhum crachá para imprimir.'); return; }
  /* tamanho de crachá padrão (CR80): 85,6 × 54 mm · QR de 30 mm · 10 por folha A4, com linhas de corte */
  const pdf=new window.jspdf.jsPDF('p','mm','a4'); const W=85.6, Hc=54, gx=8, x0=(210-2*W-gx)/2, y0=12, gy=4.5; const logo=(document.querySelector('.brand img')||{}).src;
  cs.forEach((c,i)=>{ const k=i%10; if(i&&k===0) pdf.addPage(); const x=x0+(k%2)*(W+gx), y=y0+Math.floor(k/2)*(Hc+gy);
    pdf.setDrawColor(170); pdf.setLineDashPattern([1,1],0); pdf.roundedRect(x,y,W,Hc,3,3); pdf.setLineDashPattern([],0);
    pdf.setFillColor(20,63,84); pdf.rect(x,y,W,9,'F'); pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(255,255,255); pdf.text('COLAFIX · MANUTENÇÃO',x+4,y+6);
    if(logo&&/^data:image\/png/.test(logo)){ try{ pdf.setFillColor(255,255,255); pdf.roundedRect(x+W-24,y+1.5,21,6,1,1,'F'); pdf.addImage(logo,'PNG',x+W-23.5,y+2,20,5); }catch(e){} }
    /* QR de 30 mm com ~5 mm de margem branca em volta (a faixa de cima e a borda não encostam) */ pdf.setFillColor(255,255,255); pdf.rect(x+W-40,y+9.5,40,Hc-9.5,'F'); desenharQR(pdf,crQrTexto(c.codigo),x+W-35,y+14.5,30);
    pdf.setTextColor(0,0,0); pdf.setFont('helvetica','bold'); pdf.setFontSize(14); const nm=pdf.splitTextToSize(String(c.nome||''),W-44); pdf.text(nm.slice(0,2),x+4,y+18);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9.5); pdf.setTextColor(60,60,60); pdf.text(TT_PAPEL[c.papel]||'',x+4,y+(nm.length>1?31:26)); pdf.text(c.linha&&c.linha!=='*'?c.linha:'Todas as linhas',x+4,y+(nm.length>1?36:31));
    pdfCode128(pdf,crBarras(c.codigo),x+3,y+36,W-45,9); pdf.setFontSize(6.5); pdf.setTextColor(90,90,90); pdf.text(crBarras(c.codigo)+' · QR na câmera do tablet ou barras no coletor',x+4,y+Hc-3.5); pdf.setTextColor(0,0,0); });
  await manBaixar(pdf,cs.length===1?'Cracha_'+String(cs[0].nome).replace(/\W+/g,'_')+'.pdf':'Crachas_manutencao.pdf','PDF com '+cs.length+' crachá(s). Imprima em 100% (sem ajustar à página) para o QR sair com 3 cm.'); }
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='cr-nome') S.cr.f.nome=t.value; });
document.addEventListener('change',async ev=>{ const t=ev.target; if(t.id==='cr-semcr'){ if(!crPodeGerir()){ t.checked=!t.checked; return; } const v=!!t.checked; t.disabled=true;
    try{ await S.db.doc('config/geral').update({totemSemCracha:v}); S.cfg.totemSemCracha=v; toast(v?'Tablet aceita chamado sem crachá (marcado como "sem crachá").':'Tablet exige crachá para abrir chamado.'); }catch(e){ t.checked=!v; manErro(e,'Não foi possível salvar a opção.'); } t.disabled=false; return; }
  if(t.id==='cr-linha') S.cr.f.linha=t.value; if(t.id==='cr-papel') S.cr.f.papel=t.value; });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cr-"]'); if(!b) return; const a=b.dataset.act, C=S.cr;
  if(!crPodeGerir()){ toast('Você não possui permissão para gerenciar crachás.'); return; }
  const c=b.dataset.id&&crDe(b.dataset.id);
  try{
    if(a==='cr-add'){ if(C.salv) return; const nome=String(($('#cr-nome')||{}).value||'').trim().replace(/\s+/g,' '), linha=($('#cr-linha')||{}).value||'', papel=($('#cr-papel')||{}).value||'operador';
      if(nome.length<2){ toast('Escreva o nome.'); return; } if(!linha){ toast('Escolha a linha do funcionário.'); return; }
      if(C.lista.some(x=>x.ativo!==false&&mxNorm(x.nome)===mxNorm(nome))){ toast('Já existe um crachá ativo para '+nome+'.'); return; }
      C.salv=true; render(); const cod=crCodigo(); await S.db.doc('crachas/'+cod).set({codigo:cod,nome,linha,papel,ativo:true,criadoEm:new Date().toISOString(),por:S.uid||null});
      C.f={nome:'',linha:linha,papel}; toast('Crachá de '+nome+' criado. Toque em “Imprimir crachá”.'); }
    else if(a==='cr-pdf'&&c) await crPdf([c]);
    else if(a==='cr-pdf-todos') await crPdf(C.lista.filter(x=>x.ativo!==false).sort((p,q)=>String(p.linha).localeCompare(String(q.linha))||String(p.nome).localeCompare(String(q.nome))));
    else if(a==='cr-conf'){ C.conf=b.dataset.id; }
    else if(a==='cr-desat'&&c){ await S.db.doc('crachas/'+c._id).update({ativo:false,desativadoEm:new Date().toISOString(),desativadoPor:S.uid||null}); C.conf=null; toast('Crachá de '+c.nome+' desativado: ele para de funcionar no tablet.'); }
    else if(a==='cr-reat'&&c){ await S.db.doc('crachas/'+c._id).update({ativo:true}); toast('Crachá reativado.'); }
    else if(a==='cr-novo-cod'&&c){ C.salv=true; const cod=crCodigo(); await S.db.doc('crachas/'+cod).set({codigo:cod,nome:c.nome,linha:c.linha,papel:c.papel,ativo:true,criadoEm:new Date().toISOString(),por:S.uid||null,substitui:c.codigo});
      await S.db.doc('crachas/'+c._id).update({ativo:false,desativadoEm:new Date().toISOString(),substituidoPor:cod}); toast('Novo código para '+c.nome+'. Imprima o crachá novo; o antigo não funciona mais.'); }
  }catch(e){ console.warn('[crachás]',e); manErro(e,'Não foi possível salvar o crachá.'); }
  C.salv=false; render(); });

/* ---------- tablet da parede ---------- */
const ttCam={stream:null,video:null,cv:null,timer:null,det:null,lendo:false,erro:''};
function ttAtivo(){ return S.view==='mantotem'; }
async function ttDetector(){ if(ttCam.det) return ttCam.det;
  if('BarcodeDetector' in window){ try{ const bd=new BarcodeDetector({formats:['qr_code']}); ttCam.det=async c=>{ const r=await bd.detect(c); return r&&r[0]&&r[0].rawValue||''; }; return ttCam.det; }catch(e){} }
  await carregarScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'); if(!window.jsQR) throw new Error('leitor de QR indisponível');
  ttCam.det=async c=>{ const x=c.getContext('2d'); const d=x.getImageData(0,0,c.width,c.height); const q=window.jsQR(d.data,c.width,c.height,{inversionAttempts:'dontInvert'}); return q?q.data:''; }; return ttCam.det; }
async function ttCamLiga(){ if(ttCam.stream||ttCam.lendo) return; ttCam.lendo=true;
  try{ if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw {name:'sem-camera'};
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:(typeof ttEntrega==='function'&&ttEntrega())?'environment':'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    if(!ttAtivo()||!(S.tt.fase==='espera'||((S.tt.fase==='rancho'||S.tt.fase==='pre'||S.tt.fase==='ordem')&&!S.tt.p)||S.tt.fase==='maquina'||S.tt.fase==='volta')){ st.getTracks().forEach(t=>t.stop()); return; }
    ttCam.stream=st; let v=document.getElementById('tt-video'); if(!v){ v=document.createElement('video'); v.id='tt-video'; v.muted=true; v.setAttribute('playsinline',''); v.autoplay=true; document.body.appendChild(v); }
    v.srcObject=st; ttCam.video=v; try{ await v.play(); }catch(e){} ttCam.erro=''; S.tt.cam='ok';
    const det=await ttDetector(); ttCam.cv=ttCam.cv||document.createElement('canvas');
    ttCam.timer=setInterval(async()=>{ if(ttCam.ocupado||!ttCam.video||ttCam.video.readyState<2||Date.now()-(ttCam.tecla||0)<1200) return; ttCam.ocupado=true;
      try{ const vw=ttCam.video.videoWidth, vh=ttCam.video.videoHeight; if(!vw) return; const k=Math.min(1,1280/Math.max(vw,vh)); /* resolução cheia da câmera: reduzir para 800 px fazia o QR um pouco mais longe deixar de ser lido */ ttCam.cv.width=Math.round(vw*k); ttCam.cv.height=Math.round(vh*k);
        ttCam.cv.getContext('2d').drawImage(ttCam.video,0,0,ttCam.cv.width,ttCam.cv.height); const txt=await det(ttCam.cv); if(txt) ttLeu(txt); }
      catch(e){ console.warn('[tablet] leitura',e); } finally{ ttCam.ocupado=false; } },250);
  }catch(e){ console.warn('[tablet] câmera',e); ttCam.erro=e&&e.name==='NotAllowedError'?'A câmera foi bloqueada. Libere a câmera para este site nas configurações do navegador.':e&&e.name==='sem-camera'?'Este aparelho não tem câmera disponível.':'Não consegui ligar a câmera ('+((e&&(e.name||e.message))||'erro')+').'; S.tt.cam='erro'; rerenderTt(); }
  finally{ ttCam.lendo=false; } }
function ttCamDesliga(){ if(ttCam.timer){ clearInterval(ttCam.timer); ttCam.timer=null; } if(ttCam.stream){ ttCam.stream.getTracks().forEach(t=>t.stop()); ttCam.stream=null; } const v=document.getElementById('tt-video'); if(v){ v.srcObject=null; v.remove(); } ttCam.video=null; if(S.tt.cam==='ok') S.tt.cam=''; }
/* leitura do crachá */
function ttLeu(txt){ const T=S.tt; if(T.fase!=='espera') return; const m=String(txt).trim().toUpperCase().match(TT_RE);
  const agora=Date.now(); const chave=m?m[1]:String(txt).slice(0,40); if(T.recente[chave]&&agora-T.recente[chave]<8000) return; T.recente[chave]=agora;
  if(!m){ ttMsg('Este QR não é um crachá do painel.'); return; }
  const c=crDe(m[1]); if(!c){ ttMsg(S.cr.lista.length?'Crachá não reconhecido. Procure o PCP.':'Ainda carregando os crachás… tente de novo em instantes.'); if(!S.cr.lista.length) delete T.recente[chave]; return; }
  if(c.ativo===false){ ttMsg('Este crachá foi desativado. Procure o PCP.'); return; }
  ttBip(); ttInicia({codigo:c.codigo,nome:c.nome,linha:c.linha,papel:c.papel}); }
function ttBip(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const x=ttCam.ac||(ttCam.ac=new A()); const o=x.createOscillator(), g=x.createGain(); o.frequency.value=1250; o.connect(g); g.connect(x.destination); g.gain.setValueAtTime(0.2,x.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,x.currentTime+0.15); o.start(); o.stop(x.currentTime+0.16); }catch(e){} }
function ttMsg(t){ S.tt.msg=t; rerenderTt(); clearTimeout(ttMsg._t); ttMsg._t=setTimeout(()=>{ S.tt.msg=''; rerenderTt(); },5000); }
function ttInicia(p){ const T=S.tt; Object.assign(T,{p,outra:false,linha:'',equipId:'',equip:'',defeito:'',txt:'',msg:'',numero:null,enviando:false,fase:p.papel==='tecnico'?'tecnico':(ttPendentes(p).length?'volta':'maquina'),ult:Date.now()}); ttCamDesliga(); render(); }
/* chamados ainda abertos que este operador pode liberar: na linha dele, ou abertos por ele (crachá ou nome) */
function ttPendentes(p){ if(!p||p.papel==='tecnico') return []; const L=ttLinhas(); return (S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)&&!c.liberadoEm&&(+c.numero||0)<900000&&L.includes(c.linha)&&((p.linha&&p.linha!=='*'&&c.linha===p.linha)||(p.codigo&&c.cracha===p.codigo)||(p.semCracha&&mxNorm(c.nome)===mxNorm(p.nome)))).sort((a,b)=>String(a.criado).localeCompare(String(b.criado))); }
function ttVoltar(){ Object.assign(S.tt,{fase:'espera',p:null,linha:'',equipId:'',equip:'',defeito:'',txt:'',enviando:false,numero:null}); render(); }
function rerenderTt(){ if(!ttAtivo()) return; const a=document.activeElement; if(a&&a.closest&&a.closest('.tt')&&a.matches('input,textarea')) return; render(); }
/* sem toque por um tempo → volta para a espera (o próximo não herda o chamado pela metade) */
setInterval(()=>{ const T=S.tt; if(!ttAtivo()){ if(ttCam.stream) ttCamDesliga(); return; } if(T.fase!=='espera'&&!T.enviando&&Date.now()-T.ult>(T.fase==='ok'||T.fase==='fimok'||T.fase==='voltaok'||T.fase==='rcok'?8000:T.fase==='rancho'?120000:T.ocioso)) ttVoltar(); if((T.fase==='espera'||((T.fase==='rancho'||T.fase==='pre'||T.fase==='ordem')&&!T.p)||T.fase==='maquina'||T.fase==='volta')&&!ttCam.stream&&!ttCam.lendo&&S.tt.cam!=='erro') ttCamLiga(); },500);
['pointerdown','keydown','input'].forEach(t=>document.addEventListener(t,()=>{ S.tt.ult=Date.now(); },true));
document.addEventListener('keydown',()=>{ ttCam.tecla=Date.now(); },true); /* coletor digitando: câmera espera */
/* tela sempre acesa enquanto o modo parede está aberto */
let ttWake=null; async function ttAcorda(){ try{ if(ttAtivo()&&!ttWake&&navigator.wakeLock) { ttWake=await navigator.wakeLock.request('screen'); ttWake.addEventListener('release',()=>{ ttWake=null; }); } }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') ttAcorda(); else if(ttCam.stream) ttCamDesliga(); });
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ const on=ttAtivo(); document.body.classList.toggle('tt-on',on); if(on) ttAcorda(); else if(ttCam.stream) ttCamDesliga(); }catch(e){} return x; }; }
{ const _rs=rerenderSeguro; rerenderSeguro=function(){ if(ttAtivo()&&S.tt.fase!=='espera'&&S.tt.fase!=='tecnico') return; /* (inclui 'fim': não apaga o texto digitado) */ return _rs.apply(this,arguments); }; }

function ttEstadoLinha(l){ const todos=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)&&c.linha===l&&(+c.numero||0)<900000); const ab=todos.filter(c=>!c.liberadoEm);
  const par=(S.paradas||[]).find(p=>p.linha===l&&!p.fim);
  if(!ab.length&&!par&&todos.length) return {c:'ok',t:'Funcionando',s:'liberada pela linha · OS '+todos.map(c=>manNum(c.numero)).join(', ')+' aguardando a manutenção concluir'};
  if(!ab.length) return {c:par?'crit':'ok',t:par?'Parada · '+esc(par.motivo||''):'Funcionando',s:par?'desde '+hora(par.inicio):'nenhum chamado aberto'};
  const k=ab.sort((a,b)=>String(a.criado).localeCompare(String(b.criado)))[0]; const tec=k.exec&&k.exec.tecnico;
  return {c:k.status==='Aberta'?'crit':/Aguardando/.test(k.status)?'warn':'teal',t:k.status==='Aberta'?'Manutenção chamada':k.status==='Em execução'?(tec?esc(tec)+' trabalhando':'Em execução'):esc(k.status),s:'OS '+manNum(k.numero)+' · '+esc(k.equip||String(k.defeito||'').slice(0,40))+' · há '+manIdade(k.criado)+(ab.length>1?' · +'+(ab.length-1)+' chamado(s)':'')}; }
function vTotem(){ const T=S.tt, L=ttLinhas();
  const topo=`<div class="tt-top"><div><b>Chamar manutenção</b><span>${L.map(esc).join(' · ')}</span></div><div class="tt-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div><button class="tt-x" data-act="tt-sair" title="Sair do modo tablet">✕</button></div>`;
  let corpo='';
  if(T.fase==='espera'){ corpo=`<div class="tt-linhas">${L.map(l=>{ const e=ttEstadoLinha(l); return `<div class="tt-ln ${e.c}"><small>${esc(l)}</small><b>${e.t}</b><span>${e.s}</span></div>`; }).join('')}</div>
    <div class="tt-cta"><div class="tt-qr">${ic('grid',64,1.6)}</div><div><h1>Aproxime seu crachá da câmera</h1><p>O QR do crachá fica a um palmo da tela, virado para a câmera de cima.</p><p style="margin-top:8px!important">Para conferir um rancho, mostre o QR da folha de produção.</p>${ttCam.erro?`<p class="tt-err">${esc(ttCam.erro)}${ttSemCrachaOk()?'':' Enquanto isso, chame a manutenção pelo ramal.'}</p>`:''}${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}</div></div>
    <div class="tt-rod">${ttSemCrachaOk()?'<button class="btn sec" data-act="tt-sem">Estou sem crachá</button>':''}<button class="btn sec" data-act="tt-cheia">${ic('tela',18,2)}Tela cheia</button></div>`; }
  else if(T.fase==='volta'){ const xs=ttPendentes(T.p);
    if(!xs.length){ T.fase='maquina'; return vTotem(); }
    corpo=`<div class="tt-ola">Olá, <b>${esc(T.p.nome)}</b></div><h1 class="tt-h">${xs.length>1?'Alguma destas máquinas voltou a funcionar?':'A máquina voltou a funcionar?'}</h1>
    <div class="tt-lst">${xs.map(c=>{ const par=c.paradaId&&(S.paradas||[]).find(x=>x._id===c.paradaId&&!x.fim); return `<div class="tt-ch ${par?'crit':''}"><div><b>OS ${manNum(c.numero)} · ${esc(c.linha)}${c.equip?' · '+esc(c.equip):''}</b><span>${esc(String(c.defeito||'').slice(0,90))}</span><small>${par?'Linha parada há '+manIdade(par.inicio):'Chamado aberto há '+manIdade(c.criado)} · ${esc(c.status)}${c.exec&&c.exec.tecnico?' · '+esc(c.exec.tecnico):''}</small></div><div class="tt-acs"><button class="btn" data-act="tt-voltou" data-n="${c.numero}" style="background:var(--ok-ink);height:72px;font-size:20px" ${T.enviando?'disabled':''}>✅ Voltou a funcionar</button></div></div>`; }).join('')}</div>
    ${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Sair</button><button class="btn sec" data-act="tt-novo-ch">Abrir outro chamado</button></div>`; }
  else if(T.fase==='voltaok'){ corpo=`<div class="tt-box ok"><div class="tt-okic">${ic('check',56,2.6)}</div><h1>Máquina liberada</h1><p>OS ${manNum(T.numero)} · ${esc(T.linha)}${T.equip?' · '+esc(T.equip):''}</p><p>${T.paradaFechada?'A parada da linha foi encerrada agora. ':''}A manutenção conclui a OS com o que foi feito.</p><div class="tt-rod"><button class="btn" data-act="tt-voltar">Pronto</button></div></div>`; }
  else if(T.fase==='sem'){ corpo=`<div class="tt-box"><h1>Sem crachá</h1><p>Escreva seu nome para o chamado sair identificado.</p><input class="txt tt-in" id="tt-nome" maxlength="60" autocomplete="off" value="${esc(T.txtNome||'')}"><div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Voltar</button><button class="btn" data-act="tt-sem-ok">Continuar</button></div></div>`; }
  else if(T.fase==='maquina'){ const sua=L.includes(T.p.linha)&&!T.outra; const ord=sua?[T.p.linha]:L.slice().sort((a,b)=>(b===T.p.linha)-(a===T.p.linha));
    corpo=`<div class="tt-ola">Olá, <b>${esc(T.p.nome)}</b>${T.p.semCracha?' <small>(sem crachá)</small>':''}</div><h1 class="tt-h">Qual máquina?</h1>
    <div class="tt-cols">${ord.map(l=>{ const es=mxEquips(l); return `<section class="tt-col ${l===T.p.linha?'sua':''}"><h2>${esc(l)}${l===T.p.linha?' <small>sua linha</small>':''}</h2><div class="tt-grid">${es.map(e=>`<button class="tt-bt" data-act="tt-eq" data-l="${esc(l)}" data-id="${esc(e.id)}"><b>${esc(e.nome)}</b>${e.tag?`<small>${esc(e.tag)}</small>`:''}</button>`).join('')}<button class="tt-bt q" data-act="tt-eq" data-l="${esc(l)}" data-id=""><b>Não sei qual</b><small>só a linha</small></button></div></section>`; }).join('')}</div>
    <div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button>${sua&&L.length>1?'<button class="btn sec" data-act="tt-outra">É em outra linha</button>':''}</div>`; }
  else if(T.fase==='defeito'){ corpo=`<div class="tt-ola">${esc(T.p.nome)} · <b>${esc(T.linha)}</b>${T.equip?' · '+esc(T.equip):''}</div><h1 class="tt-h">O que está acontecendo?</h1>
    <div class="tt-grid tt-def">${TT_DEFEITOS.map(d=>`<button class="tt-bt" data-act="tt-def" data-v="${esc(d)}" aria-pressed="${T.defeito===d}"><b>${esc(d)}</b></button>`).join('')}</div>
    <label class="tt-lab">Detalhe (opcional)<textarea class="txt tt-in" id="tt-txt" rows="2" maxlength="300" placeholder="Ex.: correia do elevador saiu do lugar">${esc(T.txt)}</textarea></label>
    <div class="tt-rod"><button class="btn sec" data-act="tt-volta-maq">Voltar</button><button class="btn" data-act="tt-def-ok" ${T.defeito||String(T.txt||'').trim()?'':'disabled'}>Continuar</button></div>`; }
  else if(T.fase==='impacto'){ corpo=`<div class="tt-ola">${esc(T.linha)}${T.equip?' · '+esc(T.equip):''} · ${esc(T.defeito||'')}</div><h1 class="tt-h">E a linha?</h1>
    <div class="tt-imp">${Object.keys(MAN_IMP).map(k=>`<button class="tt-bt imp ${MAN_IMP[k][1]}" data-act="tt-imp" data-v="${k}" ${T.enviando?'disabled':''}><b>${k==='parou'?'Parou':k==='reduziu'?'Está produzindo menos':'Continua normal'}</b></button>`).join('')}</div>
    ${T.enviando?'<p class="tt-wait">Enviando o chamado…</p>':''}${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-volta-def" ${T.enviando?'disabled':''}>Voltar</button></div>`; }
  else if(T.fase==='fimok'){ corpo=`<div class="tt-box ok"><div class="tt-okic">${ic('check',56,2.6)}</div><h1>OS ${manNum(T.numero)} concluída</h1><p>Conserto registrado no nome de ${esc(T.p.nome)}.</p><div class="tt-rod"><button class="btn" data-act="tt-voltar">Pronto</button></div></div>`; }
  else if(T.fase==='ok'){ corpo=`<div class="tt-box ok"><div class="tt-okic">${ic('check',56,2.6)}</div><h1>Chamado enviado</h1><p>OS ${manNum(T.numero)} · ${esc(T.linha)}${T.equip?' · '+esc(T.equip):''}</p><p>A manutenção já foi avisada. Acompanhe aqui na tela.</p><div class="tt-rod"><button class="btn" data-act="tt-voltar">Pronto</button></div></div>`; }
  else if(T.fase==='fim'){ const c=manDoc(T.osFim); if(!c){ T.fase='tecnico'; return vTotem(); } const cs=c.prevId?['Preventiva feita','Preventiva com troca de peça','Preventiva com problema encontrado']:MZ_CAUSAS;
    corpo=`<div class="tt-ola">${esc(T.p.nome)} · OS ${manNum(c.numero)} · ${esc(c.linha)}${c.equip?' · '+esc(c.equip):''}</div><h1 class="tt-h">${c.prevId?'Como foi a preventiva?':'O que causou?'}</h1>
    <div class="tt-grid tt-def">${cs.map(k=>`<button class="tt-bt" data-act="tt-causa" data-v="${esc(k)}" aria-pressed="${T.causa===k}"><b>${esc(k)}</b></button>`).join('')}</div>
    <label class="tt-lab">O que foi feito? *<textarea class="txt tt-in" id="tt-serv" rows="2" maxlength="500" placeholder="Ex.: troquei a correia e regulei a tensão">${esc(T.serv||'')}</textarea></label>
    <p class="sub" style="margin:0;font-size:15px">Fica registrado que <b>${esc(T.p.nome)}</b> consertou, pelo crachá.${c.paradaId?' A parada da linha também é encerrada.':''}</p>${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}
    <div class="tt-rod"><button class="btn sec" data-act="tt-fim-volta" ${T.enviando?'disabled':''}>Voltar</button><button class="btn" data-act="tt-fim-ok" ${T.enviando?'disabled':''} style="background:var(--ok-ink)">${T.enviando?'Concluindo…':'Concluir OS'}</button></div>`; }
  else if(T.fase==='tecnico'){ const xs=(S.chamados||[]).filter(c=>!manIgnorar(c)&&!manFechada(c)&&(+c.numero||0)<900000&&L.includes(c.linha)).sort((a,b)=>(b.impacto==='parou')-(a.impacto==='parou')||String(a.criado).localeCompare(String(b.criado)));
    corpo=`<div class="tt-ola">Olá, <b>${esc(T.p.nome)}</b> · ${esc(TT_PAPEL.tecnico)}</div><h1 class="tt-h">${!S._chamLido?'Carregando os chamados…':xs.length?'Qual chamado você está atendendo?':'Nenhum chamado aberto nestas linhas'}</h1>
    <div class="tt-lst">${xs.map(c=>{ const meu=c.exec&&c.exec.tecnico&&mxNorm(c.exec.tecnico)===mxNorm(T.p.nome)&&c.status==='Em execução'; return `<div class="tt-ch ${c.impacto==='parou'?'crit':''}"><div><b>OS ${manNum(c.numero)} · ${esc(c.linha)}${c.equip?' · '+esc(c.equip):''}</b><span>${esc(String(c.defeito||'').slice(0,90))}</span><small>${esc(c.status)} · aberto há ${manIdade(c.criado)}${c.nome?' por '+esc(c.nome):''}${c.liberadoEm?' · ✅ linha liberou às '+hora(c.liberadoEm):''}</small></div><div class="tt-acs">${c.status==='Em execução'?(meu?'<span class="pill teal">você está nele</span>':''):`<button class="btn sec" data-act="tt-cheguei" data-n="${c.numero}" ${T.enviando?'disabled':''}>Cheguei na máquina</button>`}<button class="btn" data-act="tt-fim" data-n="${c.numero}" ${T.enviando?'disabled':''}>Terminei o conserto</button></div></div>`; }).join('')}</div>
    ${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Sair</button><button class="btn sec" data-act="tt-tec-abrir">Abrir um chamado</button></div>`; }
  return `<div class="tt">${topo}${corpo}</div>`; }
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id==='tt-serv'){ S.tt.serv=t.value; return; } if(t.id==='tt-txt'){ S.tt.txt=t.value; const b=document.querySelector('[data-act="tt-def-ok"]'); if(b) b.disabled=!(S.tt.defeito||t.value.trim()); } if(t.id==='tt-nome') S.tt.txtNome=t.value; });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="tt-"]'); if(!b||b.disabled) return; const a=b.dataset.act, T=S.tt; T.ult=Date.now();
  if(a==='tt-sair'){ if(!confirm('Sair do modo tablet da parede?')) return; ttCamDesliga(); ttVoltar(); go(viewOk('manch')?'manch':primeiraView()); return; }
  if(a==='tt-cheia'){ try{ document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen(); }catch(e){} return; }
  if(a==='tt-voltar'){ ttVoltar(); return; }
  if(a==='tt-sem'){ if(!ttSemCrachaOk()) return; ttCamDesliga(); T.fase='sem'; T.txtNome=''; render(); setTimeout(()=>{ const i=$('#tt-nome'); i&&i.focus(); },50); return; }
  if(a==='tt-sem-ok'){ const n=String(T.txtNome||'').trim().replace(/\s+/g,' '); if(n.length<2){ toast('Escreva seu nome.'); return; } ttInicia({codigo:null,nome:n.slice(0,60),linha:'',papel:'operador',semCracha:true}); return; }
  if(a==='tt-outra'){ T.outra=true; render(); return; }
  if(a==='tt-novo-ch'){ T.fase='maquina'; T.msg=''; render(); return; }
  if(a==='tt-voltou'){ const c=manDoc(+b.dataset.n); if(!c||T.enviando) return; T.enviando=true; T.msg=''; render();
    try{ const agora=new Date().toISOString(); let fechou=false;
      const par=c.paradaId&&(S.paradas||[]).find(x=>x._id===c.paradaId);
      if(par&&!par.fim){ await S.db.doc('paradas/'+par._id).update({fim:agora>par.inicio?agora:par.inicio,porFim:S.uid||null,fimPor:T.p.nome,fimOrigem:'tablet'}); par.fim=agora; fechou=true; }
      const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Operador confirmou que a máquina voltou a funcionar: '+T.p.nome+(T.p.codigo?' (crachá)':' (sem crachá)')+(fechou?' · parada encerrada':'')}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({liberadoEm:agora,liberadoPor:T.p.nome,liberadoCracha:T.p.codigo||null,hist}); Object.assign(c,{liberadoEm:agora,liberadoPor:T.p.nome,hist});
      T.enviando=false; T.numero=c.numero; T.linha=c.linha; T.equip=c.equip||''; T.paradaFechada=fechou; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+22000;
      T.fase='voltaok'; T.ult=Date.now(); toast('OS '+manNum(c.numero)+': máquina liberada por '+T.p.nome+'.'); render(); }
    catch(e){ T.enviando=false; console.warn('[tablet] voltou a funcionar',e); T.msg='Não foi possível registrar agora. Verifique a internet e toque de novo.'; render(); }
    return; }
  if(a==='tt-eq'){ T.linha=b.dataset.l; const e=b.dataset.id?mxEquip(b.dataset.id):null; T.equipId=e?e.id:''; T.equip=e?e.nome:''; T.fase='defeito'; render(); return; }
  if(a==='tt-volta-maq'){ T.fase='maquina'; render(); return; }
  if(a==='tt-def'){ T.defeito=T.defeito===b.dataset.v?'':b.dataset.v; render(); return; }
  if(a==='tt-def-ok'){ if(!T.defeito&&!String(T.txt||'').trim()) return; T.fase='impacto'; T.msg=''; render(); return; }
  if(a==='tt-volta-def'){ T.fase='defeito'; render(); return; }
  if(a==='tt-tec-abrir'){ T.fase='maquina'; render(); return; }
  if(a==='tt-imp'){ if(T.enviando) return; T.enviando=true; T.msg=''; render();
    const det=[T.defeito&&T.defeito!=='Outro'?T.defeito:'',String(T.txt||'').trim()].filter(Boolean).join(': ')||'Outro';
    manNovo(T.linha); Object.assign(S.man.f,{linha:T.linha,quando:manAgoraLocal(),defeito:det,impacto:b.dataset.v,nome:T.p.nome,equip:T.equip||'',equipId:T.equipId||'',origem:'tablet',cracha:T.p.codigo||null});
    S.man.novo=false; S.man.cur=null; try{ await manSalvar(); }catch(e){ console.warn('[tablet] chamado',e); }
    const n=S.man.cur; S.man.cur=null; S.man.novo=false; T.enviando=false;
    if(n!=null){ T.numero=n; T.fase='ok'; T.ult=Date.now(); if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+22000; /* quem acabou de chamar não reabre o fluxo por 30 s */ } else { T.msg='Não foi possível enviar o chamado. Verifique a internet e toque de novo. Se a máquina parou, avise a manutenção pelo ramal.'; }
    render(); return; }
  if(a==='tt-fim'){ const c=manDoc(+b.dataset.n); if(!c) return; T.osFim=c.numero; T.causa=(c.exec&&c.exec.causa)||''; T.serv=(c.exec&&c.exec.servicos)||''; T.msg=''; T.fase='fim'; render(); return; }
  if(a==='tt-fim-volta'){ T.fase='tecnico'; T.msg=''; render(); return; }
  if(a==='tt-causa'){ T.causa=b.dataset.v; T.serv=String(($('#tt-serv')||{}).value||T.serv||''); render(); return; }
  if(a==='tt-fim-ok'){ const c=manDoc(T.osFim); if(!c||T.enviando) return; T.serv=String(($('#tt-serv')||{}).value||'').trim();
    if(!T.causa){ T.msg=c.prevId?'Escolha como foi a preventiva.':'Escolha o que causou.'; render(); return; } if(T.serv.length<3){ T.msg='Escreva o que foi feito.'; render(); return; }
    if(!T.p.codigo){ T.msg='Para concluir é preciso passar o crachá.'; render(); return; }
    T.enviando=true; T.msg=''; render();
    try{ const agora=new Date().toISOString(); const E=Object.assign({},c.exec||{},{causa:T.causa,servicos:T.serv,tecnico:T.p.nome,tecnicoCracha:T.p.codigo}); if(!E.inicio) E.inicio=manAgoraLocal();
      const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Conserto concluído no tablet por '+T.p.nome+' (crachá)'}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({exec:E,hist,concluidoPorNome:T.p.nome,concluidoPorCracha:T.p.codigo}); c.exec=E; c.hist=hist;
      c._mzOk=true; try{ await manStatus(c,'Concluída'); } finally { delete c._mzOk; }
      T.enviando=false; if(c.status!=='Concluída'){ T.msg='Não foi possível concluir agora. Verifique a internet e tente de novo.'; render(); return; }
      T.recente[T.p.codigo]=Date.now()+22000; toast('OS '+manNum(c.numero)+' concluída por '+T.p.nome+'.'); T.numero=c.numero; T.fase='fimok'; T.ult=Date.now(); render(); }
    catch(e){ T.enviando=false; console.warn('[tablet] concluir',e); T.msg='Não foi possível concluir agora. Verifique a internet e tente de novo.'; render(); }
    return; }
  if(a==='tt-cheguei'){ const c=manDoc(+b.dataset.n); if(!c||T.enviando) return; T.enviando=true; render();
    try{ const agora=new Date().toISOString(); const E=Object.assign({},c.exec||{}); if(!E.tecnico) E.tecnico=T.p.nome; if(!E.inicio) E.inicio=manAgoraLocal();
      const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Técnico no local: '+T.p.nome+(T.p.codigo?' (crachá)':'')}]).slice(-200);
      await S.db.doc('chamados/'+c._id).update({exec:E,hist,noLocalEm:c.noLocalEm||agora,noLocalPor:T.p.nome}); c.exec=E; c.hist=hist;
      if(c.status!=='Em execução') await manStatus(c,'Em execução');
      T.enviando=false; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+22000; toast('OS '+manNum(c.numero)+': '+T.p.nome+' no local.'); ttVoltar(); }
    catch(e){ T.enviando=false; console.warn('[tablet] cheguei',e); T.msg='Não foi possível registrar agora. Verifique a internet e tente de novo.'; render(); }
    return; } });
document.head.insertAdjacentHTML('beforeend',`<style id="tt-css">
body.tt-on .side,body.tt-on header.top,body.tt-on .bottomnav,body.tt-on nav.tabs{display:none!important}body.tt-on .content{padding:0!important;max-width:none!important}body.tt-on .main{margin:0!important}
.tt{min-height:100vh;display:flex;flex-direction:column;gap:18px;padding:18px 22px 22px;background:var(--ground);box-sizing:border-box;user-select:none;-webkit-user-select:none}
.tt-top{display:flex;align-items:center;gap:16px}.tt-top>div:first-child{flex:1;display:flex;flex-direction:column}.tt-top b{font-size:26px;color:var(--teal-strong)}.tt-top span{color:var(--muted);font-size:15px}
.tt-clk{font-size:40px;font-weight:800;color:var(--ink)}.tt-x{border:0;background:transparent;color:var(--faint);font-size:20px;width:44px;height:44px;cursor:pointer}
.tt-linhas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.tt-ln{border-radius:18px;padding:18px 22px;background:var(--surface);box-shadow:var(--shadow);border-left:10px solid var(--ok);display:flex;flex-direction:column;gap:4px}
.tt-ln small{font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.tt-ln b{font-size:30px;line-height:1.15}.tt-ln span{font-size:15px;color:var(--ink-2)}
.tt-ln.crit{border-left-color:var(--crit);animation:mpviv 1.6s ease-in-out infinite}.tt-ln.crit b{color:var(--crit-ink)}.tt-ln.warn{border-left-color:var(--warn)}.tt-ln.teal{border-left-color:var(--teal)}
.tt-cta{flex:1;display:flex;align-items:center;justify-content:center;gap:28px;text-align:left;padding:10px}.tt-cta h1{font-size:40px;line-height:1.1;margin:0 0 8px}.tt-cta p{font-size:18px;color:var(--ink-2);margin:0;max-width:30ch}
.tt-qr{width:130px;height:130px;border-radius:28px;background:var(--teal-wash);color:var(--teal-strong);display:flex;align-items:center;justify-content:center;animation:mpsino 2.5s ease-in-out infinite}
.tt-err{color:var(--crit-ink)!important;font-weight:700;font-size:18px!important;margin-top:10px!important}.tt-wait{font-size:20px;font-weight:700;color:var(--teal-strong);text-align:center}
.tt-rod{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}.tt-rod .btn{height:60px;min-width:180px;font-size:19px}
.tt-ola{font-size:20px;color:var(--ink-2)}.tt-ola small{color:var(--muted)}.tt-h{font-size:34px;margin:0}
.tt-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;flex:1}.tt-col{background:var(--surface-2);border:1px solid var(--line);border-radius:18px;padding:14px}.tt-col.sua{border:2px solid var(--teal)}
.tt-col h2{margin:0 0 10px;font-size:22px}.tt-col h2 small{font-size:13px;color:var(--teal-strong);font-weight:700;margin-left:6px}
.tt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.tt-bt{min-height:84px;border-radius:16px;border:2px solid var(--line);background:var(--surface);font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;padding:12px 16px;text-align:left;color:var(--ink)}
.tt-bt b{font-size:20px;line-height:1.2}.tt-bt small{font-size:13px;color:var(--muted)}.tt-bt.q{border-style:dashed}.tt-bt[aria-pressed="true"]{border-color:var(--teal-strong);background:var(--teal-wash)}.tt-bt:active{transform:scale(.98)}
.tt-def .tt-bt{min-height:72px}.tt-lab{display:flex;flex-direction:column;gap:6px;font-weight:700;color:var(--ink-2)}.tt-in{font-size:20px!important;min-height:56px}
.tt-imp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.tt-bt.imp{min-height:150px;align-items:center;text-align:center}.tt-bt.imp b{font-size:24px}.tt-bt.imp.crit{border-color:var(--crit);background:var(--crit-tint)}.tt-bt.imp.warn{border-color:var(--warn);background:var(--warn-tint)}.tt-bt.imp.ok{border-color:var(--ok);background:var(--ok-tint)}
.tt-box{margin:auto;max-width:640px;width:100%;background:var(--surface);border-radius:22px;box-shadow:var(--shadow);padding:30px;display:flex;flex-direction:column;gap:12px;text-align:center}.tt-box h1{font-size:34px;margin:0}.tt-box p{font-size:19px;margin:0;color:var(--ink-2)}
.tt-okic{width:110px;height:110px;margin:0 auto;border-radius:999px;background:var(--ok-tint);color:var(--ok-ink);display:flex;align-items:center;justify-content:center}
.tt-lst{display:flex;flex-direction:column;gap:10px}.tt-ch{display:flex;gap:14px;align-items:center;background:var(--surface);border-radius:16px;box-shadow:var(--shadow);padding:14px 18px;border-left:8px solid var(--teal)}.tt-ch.crit{border-left-color:var(--crit)}
.tt-ch>div{flex:1;display:flex;flex-direction:column;gap:2px}.tt-ch b{font-size:20px}.tt-ch span{font-size:16px}.tt-ch small{color:var(--muted);font-size:14px}.tt-ch .btn{height:64px;font-size:19px}.tt-acs{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
#tt-video{position:fixed;right:16px;bottom:16px;width:200px;height:150px;object-fit:cover;border-radius:16px;border:3px solid var(--teal);transform:scaleX(-1);z-index:900;background:#000;box-shadow:var(--shadow)}
body:not(.tt-on) #tt-video{display:none}
@media (max-width:760px){ .tt-imp{grid-template-columns:minmax(0,1fr)} .tt-cta{flex-direction:column;text-align:center} .tt-cta h1{font-size:30px} #tt-video{width:130px;height:100px} }
</style>`);
/* ===FIM CRACHÁ=== */
/* ===================== SILOS · SÓ CONSULTA (07/10): login que só vê o nível dos silos ===================== */
/* Perfil pronto "silosver": um único módulo, uma única tela, nenhum botão que grava. No banco, o perfil é "só ver" (firestore.rules). */
MODS.push({id:'silosver',nome:'Nível dos silos',ic:'silo',views:['silosver']});
VIEWS.silosver={nome:'Nível dos silos',ic:'silo',mob:'Silos'}; CRUMB.silosver='Nível dos silos';
ACS_MODS.splice(ACS_MODS.findIndex(m=>m[0]==='ajustes'),0,['silosver','Só consulta do nível dos silos']);
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.silosver={nome:'Silos (só consulta)',mods:['silosver'],locais:[]}; ACS_PERFIS.outro=_o; }
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('silosver')) EQ_PRONTO_ORD.splice(EQ_PRONTO_ORD.indexOf('ver')>=0?EQ_PRONTO_ORD.indexOf('ver')+1:EQ_PRONTO_ORD.length,0,'silosver'); /* junto dos outros perfis só de ver */
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.silosver='Só olha o nível dos silos (cimento e areia), atualizando sozinho. Não muda nada.';
if(!ACS_SO_VER.includes('silosver')) ACS_SO_VER.push('silosver');
if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.silosver) EQ_MOD.silosver=['silo','Nível dos silos (só consulta)'];
function vSilosVer(){ const ult=saldoPorSilo(), agora=Date.now(); const L=S.cfg.limites||CFG_PADRAO.limites;
  const tanque=s=>{ const u=ult[s.id]; if(!u) return `<div class="sv-t"><div class="sv-tk">${tankSvg(0,'var(--ok)',92,190,1.5)}</div><b class="sv-n">${esc(s.nome)}</b><div class="sv-q" style="color:var(--faint)">—</div><small>de ${s.cap} t · sem medição</small></div>`;
    const p=u.q/s.cap, nv=nivel(p), vel=agora-new Date(u.em).getTime()>24*36e5;
    return `<div class="sv-t ${nv.c}"><div class="sv-tk">${tankSvg(p,nv.fill,92,190,1.5)}</div><b class="sv-n">${esc(s.nome)}</b>
      <div class="sv-q num">${f1(u.q)} <small>t</small></div><div class="sv-p num" style="color:${nv.ink}">${f1(Math.min(p,9.99)*100)}% · ${nv.n}</div><small>de ${s.cap} t</small>
      <small class="sv-h ${vel?'velho':''}">${u.origem==='consumo'||u.origem==='estorno'?'⚙️ automático':'📏 medido'} · ${dia(u.em)==='Hoje'?'hoje '+hora(u.em):dia(u.em).toLowerCase()+' '+hora(u.em)}</small></div>`; };
  const grupo=g=>{ const ss=(S.cfg.silos||[]).filter(s=>s.grupo===g); if(!ss.length) return ''; const tot=ss.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0), cap=ss.reduce((a,s)=>a+(+s.cap||0),0), nv=nivel(cap?tot/cap:0);
    return `<section class="card sv-g"><div class="sv-gh"><h2>${esc(g)}</h2><span class="num"><b style="color:${nv.ink}">${f1(tot)} t</b> de ${cap} t · ${f1(cap?tot/cap*100:0)}%</span></div><div class="sv-ts">${ss.map(tanque).join('')}</div></section>`; };
  const grupos=[...new Set((S.cfg.silos||[]).map(s=>s.grupo))];
  const datas=Object.values(ult).map(u=>new Date(u.em).getTime()).filter(Boolean), maisVelho=datas.length?Math.min(...datas):null;
  const aviso=maisVelho&&agora-maisVelho>24*36e5?`<div class="banner">Algum silo não é atualizado há mais de 24 horas. O número pode não refletir o nível real.</div>`:'';
  const aCaminho=(S.cargas||[]).filter(c=>etapaCarga(c)===0), naFab=(S.cargas||[]).filter(c=>etapaCarga(c)===1);
  let cim=''; if(leitPrecisa('prod')){ try{ cim=cimentoCard(previsaoCimento(),true); }catch(e){} } /* sem as ordens carregadas, o quadro não aparece */
  return `${banner()}<div class="head"><div><div class="eyebrow">SILOS · SÓ CONSULTA</div><h1>Nível dos silos</h1><div class="sub">Atualiza sozinho a cada medição ou apontamento. Normal a partir de ${L.normal}% · crítico abaixo de ${L.atencao}%.</div></div>
    <div class="sv-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div></div>
   ${aviso}${grupos.map(grupo).join('')}
   <div class="two" style="gap:14px">${cim}<section class="card"><div class="label">CARGAS DE CIMENTO</div><div class="sv-car num"><div><b>${aCaminho.length}</b><span>a caminho${aCaminho.length?' · '+f1(aCaminho.reduce((a,c)=>a+(+c.qtd||0),0))+' t':''}</span></div><div><b>${naFab.length}</b><span>na fábrica, aguardando descarga</span></div></div></section></div>`; }
document.head.insertAdjacentHTML('beforeend',`<style id="sv-css">
.sv-clk{font-size:40px;font-weight:800;color:var(--teal-strong)}
.sv-g{padding:18px 20px}.sv-gh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px}.sv-gh h2{margin:0;font-size:20px;letter-spacing:.06em;text-transform:uppercase}.sv-gh span{font-size:16px;color:var(--muted)}.sv-gh b{font-size:22px}
.sv-ts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.sv-t{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:12px 8px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line)}
.sv-t.crit{border-color:var(--crit);background:var(--crit-tint)}.sv-t.warn{border-color:var(--warn)}
.sv-n{font-size:16px;margin-top:6px}.sv-q{font-size:30px;font-weight:800;line-height:1.1}.sv-q small{font-size:15px;font-weight:600}.sv-p{font-size:14px;font-weight:700}.sv-t small{color:var(--muted);font-size:12.5px}.sv-h.velho{color:var(--crit-ink)!important;font-weight:700}
.sv-car{display:flex;flex-direction:column;gap:10px;margin-top:10px}.sv-car div{display:flex;align-items:baseline;gap:10px}.sv-car b{font-size:30px}.sv-car span{color:var(--ink-2)}
@media (max-width:520px){ .sv-ts{grid-template-columns:repeat(2,minmax(0,1fr))} .sv-clk{font-size:28px} }
</style>`);
/* ===FIM SILOS CONSULTA=== */
/* ===================== CONSULTA: SILOS + CALENDÁRIO DE UMA LINHA (07/10) ===================== */
/* Cargo pronto "consulta" = nível dos silos + calendário, só leitura (também no banco).
   acessos/{uid}.linhas = ['Linha 1'] → o calendário dessa pessoa só mostra essa(s) linha(s). Vazio = todas. */
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.consulta={nome:'Silos e calendário (só consulta)',mods:['silosver','cal'],locais:[]}; ACS_PERFIS.outro=_o; }
if(!ACS_SO_VER.includes('consulta')) ACS_SO_VER.push('consulta');
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('consulta')) EQ_PRONTO_ORD.splice(EQ_PRONTO_ORD.indexOf('silosver')>=0?EQ_PRONTO_ORD.indexOf('silosver')+1:EQ_PRONTO_ORD.length,0,'consulta');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.consulta='Só olha o nível dos silos e o calendário (dá para limitar a uma linha). Não muda nada.';
/* linhas liberadas para a pessoa logada (null = todas) */
function acsLinhas(){ const A=S.acs; if(!A||A.dono||!A.doc) return null; const ls=(A.doc.linhas||[]).filter(l=>linhasOrd().includes(l)); return ls.length?ls:null; }
function comLinhas(fn){ const r=acsLinhas(); if(!r) return fn(); const _lo=linhasOrd; linhasOrd=function(){ return _lo().filter(l=>r.includes(l)); };
  try{ if(S.cal&&S.cal.linha!=='todas'&&!r.includes(S.cal.linha)) S.cal.linha=r.length===1?r[0]:'todas'; if(S.cal&&r.length===1) S.cal.linha=r[0]; return fn(); } finally { linhasOrd=_lo; } }
{ const _vc=vCalendario; vCalendario=function(){ const r=acsLinhas(); let h=comLinhas(()=>_vc.apply(this,arguments));
  if(r) h=h.replace('<h1>Calendário</h1>','<h1>Calendário · '+esc(r.join(', '))+'</h1>'); return h; }; }
{ const _ch=calHtml; calHtml=function(){ return comLinhas(()=>_ch.apply(this,arguments)); }; }  /* o arquivo baixado também só leva a(s) linha(s) dela */
/* gravar o cargo não apaga as linhas escolhidas */
{ const _ag=acsGravar; acsGravar=async function(id,f,novo){ const ant=(S.acs.lista||[]).find(x=>x._id===id); const ok=await _ag.apply(this,arguments);
  if(ok&&ant&&ant.linhas&&ant.linhas.length&&f.linhas===undefined){ try{ await S.db.doc('acessos/'+id).update({linhas:ant.linhas}); }catch(e){ console.warn('[equipe] manter linhas',e); } } return ok; }; }
/* Equipe: escolher a linha do calendário no cartão da pessoa */
{ const _ep=eqPessoas; eqPessoas=function(){ const h=_ep.apply(this,arguments); const LT=linhasOrd();
  return h.replace(/(<label class="eq-pc"><span>Cargo<\/span><select[^>]*data-eq-cargo="([^"]+)"[\s\S]*?<\/select><\/label>)/g,(m,lab,id)=>{ const d=(S.acs.lista||[]).find(x=>x._id===id); if(!d) return m;
    const mods=eqModsDe(d); if(!mods.includes('cal')&&!mods.includes('producao')) return m; const sel=(d.linhas||[])[0]||'';
    return lab+`<label class="eq-pc"><span>Calendário</span><select class="txt eq-sel" data-eq-linhas="${esc(id)}"><option value="" ${sel?'':'selected'}>Todas as linhas</option>${LT.map(l=>`<option ${sel===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`; }); }; }
document.addEventListener('change',async ev=>{ const t=ev.target, id=t.dataset&&t.dataset.eqLinhas; if(!id) return; if(!S.acs.dono){ toast('Você não possui permissão para mudar isso.'); return; }
  const d=(S.acs.lista||[]).find(x=>x._id===id); if(!d) return; const v=t.value?[t.value]:[]; t.disabled=true;
  try{ await S.db.doc('acessos/'+id).update({linhas:v,alteradoEm:new Date().toISOString(),alteradoPor:S.uid||null}); d.linhas=v; toast(acsNome(id)+(v.length?' vê só a '+v[0]+' no calendário.':' vê todas as linhas no calendário.')); }
  catch(e){ console.warn('[equipe] linhas',e); erro(e); } t.disabled=false; render(); });
/* ===FIM CONSULTA=== */
/* ===================== AVISOS NO CELULAR (07/10): medição dos silos e silo crítico, grátis, via ntfy ===================== */
/* Sem servidor: o navegador de quem salvou envia o aviso para https://ntfy.sh/<tópico>. Quem recebe instala o app "ntfy"
   (App Store / Play Store) e assina o tópico. config/geral.avisos = {ativo, topico, medicao, critico}.
   O tópico funciona como senha: quem souber o nome recebe os avisos. Por isso ele é longo e aleatório. */
const AV_SERV='https://ntfy.sh';
function avCfg(){ const a=(S.cfg&&S.cfg.avisos)||{}; return a.ativo&&a.topico?a:null; }
function avTopicoNovo(){ const a=new Uint8Array(9); try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<9;i++) a[i]=Math.floor(Math.random()*256); } return 'colafix-silos-'+[...a].map(x=>'abcdefghijkmnpqrstuvwxyz23456789'[x%32]).join(''); }
function avLink(){ try{ return (window.claude&&window.claude.link)||''; }catch(e){ return ''; } }
/* fila no aparelho: se a internet falhar, tenta de novo (até 6 h) */
function avFila(){ try{ return JSON.parse(localStorage.getItem('painel.avisos.fila')||'[]'); }catch(e){ return []; } }
function avFilaGrava(f){ try{ localStorage.setItem('painel.avisos.fila',JSON.stringify(f.slice(-30))); }catch(e){} }
async function avPost(m){ const ct=new AbortController(); const t=setTimeout(()=>ct.abort(),8000);
  try{ const r=await fetch(AV_SERV+'/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m),signal:ct.signal}); if(!r.ok) throw new Error('ntfy '+r.status); return true; }
  finally{ clearTimeout(t); } }
async function avEnviar(m){ const a=avCfg(); if(!a) return false; m=Object.assign({topic:a.topico},m); const link=avLink(); if(link&&!m.click) m.click=link;
  try{ await avPost(m); return true; }catch(e){ console.warn('[avisos] não enviou agora, vai tentar de novo',e&&e.message); const f=avFila(); f.push({m,em:Date.now()}); avFilaGrava(f); return false; } }
setInterval(async()=>{ const f=avFila(); if(!f.length||!navigator.onLine) return; const resta=[];
  for(const x of f){ if(Date.now()-x.em>6*36e5) continue; try{ await avPost(x.m); }catch(e){ resta.push(x); } } avFilaGrava(resta); },30000);
function avLinhaSilo(sid,t){ const s=(S.cfg.silos||[]).find(x=>x.id===sid); if(!s) return null; const p=s.cap?t/s.cap:0, nv=nivel(p); return {txt:`${s.nome}: ${f1(t)} t (${f1(p*100)}% · ${nv.n})`,crit:nv.c==='crit',warn:nv.c==='warn'}; }
/* medição salva (formulário 📏 ou "Nova medição") → um aviso por medição */
const avJa=new Set();
async function avMedicao(id,doc){ const a=avCfg(); if(!a||a.medicao===false||!doc||avJa.has(id)) return; avJa.add(id);
  const sal=saldoPorSilo(); const ls=Object.keys(doc.itens||{}).map(sid=>avLinhaSilo(sid,sal[sid]&&sal[sid].doc&&sal[sid].doc.medicaoId===id?sal[sid].q:+doc.itens[sid])).filter(Boolean); if(!ls.length) return;
  const quem=doc.medidoPor||(S.uid&&S.nomes[S.uid])||''; const crit=ls.some(x=>x.crit);
  await avEnviar({title:(doc.corrige?'Medição corrigida':'Medição dos silos')+(crit?' · atenção: silo crítico':''),message:ls.map(x=>x.txt).join('\n')+(quem?'\nMedido por '+quem:'')+' · '+hora(doc.em||new Date().toISOString()),tags:[crit?'rotating_light':'straight_ruler'],priority:crit?4:3}); }
/* silo que fica crítico pelo consumo dos apontamentos → um aviso por vez que cruza o limite */
{ const _pe=siloProcessarEntrega; siloProcessarEntrega=async function(){ const r=await _pe.apply(this,arguments);
  try{ const a=avCfg(); if(a&&a.critico!==false&&r&&r.ok&&r.sid){ const s=(S.cfg.silos||[]).find(x=>x.id===r.sid); const L=S.cfg.limites||CFG_PADRAO.limites;
      if(s&&s.cap){ const lim=s.cap*1000*L.atencao/100; if(r.antes>=lim&&r.depois<lim){ const l=avLinhaSilo(r.sid,r.depois/1000);
        avEnviar({title:'Silo crítico: '+s.nome,message:l.txt+'\nPelo consumo dos apontamentos. Confira e programe carga.',tags:['rotating_light'],priority:5}); } } } }catch(e){ console.warn('[avisos] crítico',e); }
  return r; }; }
/* ---------- configuração (administradora) e instruções para quem recebe ---------- */
function avCard(){ const a=(S.cfg&&S.cfg.avisos)||{}; const dono=!!(S.acs&&S.acs.dono); if(!dono&&!avCfg()) return '';
  const inst=a.topico?`<ol class="av-ol"><li>No iPhone, instale o app <b>ntfy</b> da App Store (é grátis).</li><li>Abra o ntfy, toque em <b>+</b> e digite o tópico abaixo, sem mudar o servidor (ntfy.sh).</li><li>Toque em <b>Assinar</b> e permita as notificações.</li></ol>
    <div class="av-top"><div class="man-qr" style="max-width:190px;margin:0">${manQrSvg(AV_SERV+'/'+a.topico,150)}<small>abre o tópico no celular</small></div><div><div class="label">TÓPICO</div><div class="av-tn num">${esc(a.topico)}</div><small class="sub" style="margin:0">Quem souber este nome recebe os avisos. Não divulgue fora da equipe.</small></div></div>`:'';
  if(!dono) return `<section class="card"><div class="label">RECEBER AVISOS NO CELULAR</div><div class="sub" style="margin:4px 0 8px">Aviso a cada medição dos silos${a.critico!==false?' e quando um silo fica crítico':''}.</div>${inst}</section>`;
  return `<section class="card"><div class="head" style="align-items:baseline"><div><div class="label">AVISOS NO CELULAR · GRÁTIS (NTFY)</div><div class="sub" style="margin:4px 0 0">Funciona no iPhone e no Android, com o celular bloqueado. Não precisa de servidor nem do plano pago do Firebase.</div></div>
    <label class="av-sw"><input type="checkbox" id="av-ativo" ${a.ativo?'checked':''}> <b>${a.ativo?'Ligado':'Desligado'}</b></label></div>
   ${a.topico?`<div class="av-ops"><label><input type="checkbox" id="av-med" ${a.medicao!==false?'checked':''}> Avisar a cada medição</label><label><input type="checkbox" id="av-cri" ${a.critico!==false?'checked':''}> Avisar quando um silo ficar crítico pelo consumo</label></div>${inst}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn sec" data-act="av-teste" ${a.ativo?'':'disabled'}>Enviar aviso de teste</button><button class="btn sec" data-act="av-novo">Trocar tópico</button></div>`:`<div style="margin-top:12px"><button class="btn" data-act="av-novo">Criar tópico e ligar</button></div>`}</section>`; }
async function avGrava(mud){ const a=Object.assign({},(S.cfg&&S.cfg.avisos)||{},mud); await S.db.doc('config/geral').update({avisos:a}); S.cfg.avisos=a; render(); }
document.addEventListener('change',async ev=>{ const t=ev.target; if(!['av-ativo','av-med','av-cri'].includes(t.id)) return; if(!(S.acs&&S.acs.dono)){ t.checked=!t.checked; return; }
  try{ await avGrava(t.id==='av-ativo'?{ativo:!!t.checked}:t.id==='av-med'?{medicao:!!t.checked}:{critico:!!t.checked}); toast('Avisos atualizados.'); }catch(e){ t.checked=!t.checked; erro(e); } });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="av-"]'); if(!b) return; const a=b.dataset.act; if(!(S.acs&&S.acs.dono)) return;
  if(a==='av-novo'){ if((S.cfg.avisos||{}).topico&&!confirm('Trocar o tópico? Quem já assinou vai precisar assinar o novo.')) return; b.disabled=true;
    try{ await avGrava({topico:avTopicoNovo(),ativo:true}); toast('Tópico criado. Assine no app ntfy do celular.'); }catch(e){ erro(e); } b.disabled=false; return; }
  if(a==='av-teste'){ b.disabled=true; const ok=await avEnviar({title:'Teste do Painel Colafix',message:'Se você recebeu isto, os avisos dos silos estão funcionando.',tags:['white_check_mark']});
    toast(ok?'Aviso de teste enviado. Deve chegar no celular em segundos.':'Não consegui enviar agora (sem internet?). Vai tentar de novo sozinho.'); b.disabled=false; } });
{ const _vs=vSilos; vSilos=function(){ return _vs.apply(this,arguments)+avCard(); }; }
{ const _sv=vSilosVer; vSilosVer=function(){ return _sv.apply(this,arguments)+avCard(); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="av-css">.av-sw{display:flex;gap:8px;align-items:center;cursor:pointer;font-size:15px}.av-sw input,.av-ops input{width:20px;height:20px}
.av-ops{display:flex;flex-direction:column;gap:8px;margin:12px 0}.av-ops label{display:flex;gap:8px;align-items:center;cursor:pointer}
.av-ol{margin:10px 0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:15px}.av-top{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:8px}.av-tn{font-size:20px;font-weight:800;color:var(--teal-strong);word-break:break-all;margin:4px 0}</style>`);
/* ===FIM AVISOS=== */
/* ===================== LOGIN DO TABLET + ADESIVO DE QR PARA O CRACHÁ (08/10) ===================== */
/* Cargo pronto "tablet": só o modo tablet da parede (todas as linhas). Abre chamado e registra o atendimento pelo crachá. */
MODS.push({id:'tablet',nome:'Tablet da parede',ic:'tela',views:['mantotem']});
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.tablet={nome:'Tablet da parede (chamados)',mods:['tablet'],locais:[]}; ACS_PERFIS.outro=_o; }
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('tablet')) EQ_PRONTO_ORD.splice(EQ_PRONTO_ORD.indexOf('manut')>=0?EQ_PRONTO_ORD.indexOf('manut')+1:0,0,'tablet');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.tablet='Tablet na parede das linhas: o operador passa o crachá e abre o chamado; o técnico registra que chegou e que terminou.';
if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.tablet) EQ_MOD.tablet=['tela','Tablet da parede'];
ACS_MODS.splice(ACS_MODS.findIndex(m=>m[0]==='ajustes'),0,['tablet','Tablet da parede (chamados pelo crachá)']);
function ttSoTablet(){ try{ const A=S.acs; if(!A||A.dono) return false; const p=acsP(); return !!p&&(p.mods||[]).length>0&&(p.mods||[]).every(m=>m==='tablet'); }catch(e){ return false; } }
{ const _tp=ttPodeUsar; ttPodeUsar=function(){ try{ const p=acsP(); if(p&&(p.mods||[]).includes('tablet')) return true; }catch(e){} return _tp(); }; }
/* o tablet não sai do modo parede (sem o ✕) */
{ const _vt=vTotem; vTotem=function(){ const h=_vt.apply(this,arguments); return ttSoTablet()?h.replace(/<button class="tt-x"[^>]*>✕<\/button>/,''):h; }; }
/* cartão de acesso do tablet já vem com o endereço do modo parede */
{ const _el=eqLinkDe; eqLinkDe=function(c){ return c&&c.perfil==='tablet'?eqLinkPainel()+'?totem=1':_el.apply(this,arguments); }; }

/* adesivo para colar em qualquer crachá (deitado ou em pé): QR de 25 mm + nome e linha · 30 por folha A4 */
async function crAdesivos(cs){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } if(!cs.length){ toast('Nenhum crachá para imprimir.'); return; }
  const pdf=new window.jspdf.jsPDF('p','mm','a4'); const W=38, H=54, gx=4, gy=4, cols=4, rows=5, x0=(210-cols*W-(cols-1)*gx)/2, y0=(297-rows*H-(rows-1)*gy)/2;
  cs.forEach((c,i)=>{ const k=i%(cols*rows); if(i&&k===0) pdf.addPage(); const x=x0+(k%cols)*(W+gx), y=y0+Math.floor(k/cols)*(H+gy);
    pdf.setDrawColor(170); pdf.setLineDashPattern([1,1],0); pdf.roundedRect(x,y,W,H,2,2); pdf.setLineDashPattern([],0);
    pdf.setFillColor(255,255,255); pdf.rect(x+0.5,y+0.5,W-1,H-1,'F'); desenharQR(pdf,crQrTexto(c.codigo),x+(W-25)/2,y+3.5,25);
    pdf.setTextColor(0,0,0); pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); pdf.text(pdf.splitTextToSize(String(c.nome||''),W-3)[0],x+W/2,y+33,{align:'center'});
    pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5); pdf.setTextColor(70,70,70); pdf.text((c.papel==='tecnico'?'Manutenção':(c.linha&&c.linha!=='*'?c.linha:'Todas as linhas')),x+W/2,y+36.5,{align:'center'});
    pdfCode128(pdf,crBarras(c.codigo),x+1,y+39,W-2,9); pdf.setTextColor(0,0,0); pdf.setFontSize(6.5); pdf.text(crBarras(c.codigo),x+W/2,y+51,{align:'center'}); });
  await manBaixar(pdf,cs.length===1?'Adesivo_QR_'+String(cs[0].nome).replace(/\W+/g,'_')+'.pdf':'Adesivos_QR_crachas.pdf','PDF com '+cs.length+' adesivo(s) de 3,8 × 5,4 cm (QR para o tablet e código de barras para o coletor). Imprima em 100% (sem ajustar à página) e cole no crachá.'); }
{ const _vc=vCrachas; vCrachas=function(){ let h=_vc.apply(this,arguments);
  h=h.replace(/<button class="eq-lk" data-act="cr-pdf" data-id="([^"]+)">/g,(m,id)=>`<button class="eq-lk" data-act="cr-ades" data-id="${id}">${ic('grid',15,2)}Adesivo</button>`+m);
  h=h.replace('<button class="btn sec" data-act="cr-pdf-todos">','<button class="btn" data-act="cr-ades-todos">'+ic('baixar',18,2)+'Adesivos de todos (QR + barras)</button><button class="btn sec" data-act="cr-pdf-todos">');
  h=h.replace('Cada funcionário recebe um QR no crachá.','Cada funcionário recebe um QR no crachá: um <b>adesivo de 3,8 × 5,4 cm</b> (QR para a câmera do tablet e código de barras para o coletor) para colar no crachá que ele já usa, ou um crachá completo.');
  return h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cr-ades"],[data-act="cr-ades-todos"]'); if(!b) return; if(!crPodeGerir()){ toast('Você não possui permissão para gerenciar crachás.'); return; }
  try{ if(b.dataset.act==='cr-ades'){ const c=crDe(b.dataset.id); if(c) await crAdesivos([c]); }
    else await crAdesivos(S.cr.lista.filter(x=>x.ativo!==false).sort((p,q)=>String(p.linha).localeCompare(String(q.linha))||String(p.nome).localeCompare(String(q.nome)))); }
  catch(e){ console.warn('[crachás] adesivo',e); toast('Não foi possível gerar o PDF. Tente de novo.'); } });
/* no menu, "Tablet da parede" aparece só para a conta do tablet (os outros abrem pelo botão em Chamados) */
{ const _mv=modsVis; modsVis=function(){ const r=_mv.apply(this,arguments); let tem=false; try{ const p=acsP(); tem=!!p&&(p.mods||[]).includes('tablet'); }catch(e){} return tem?r:r.filter(m=>m.id!=='tablet'); }; }
/* ===================== CRACHÁ NO COLETOR (08/10): código de barras Code 128 no crachá + leitura pelo coletor ===================== */
/* Coletor laser lê só barras: o crachá leva também "CX"+código em Code 128 (desenhado em vetor no PDF).
   Tabela conferida símbolo por símbolo com a implementação do reportlab. */
const C128=['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
function c128Larg(txt){ const v=[104].concat([...txt].map(c=>c.charCodeAt(0)-32)); let k=v[0]; for(let i=1;i<v.length;i++) k+=v[i]*i; return v.concat([k%103,106]).map(x=>C128[x]).join(''); }
function crBarras(cod){ return 'CX'+cod; }
/* desenha as barras no PDF ocupando a largura w (com 10 módulos de margem branca de cada lado) */
function pdfCode128(pdf,txt,x,y,w,h){ const L=c128Larg(txt), mods=[...L].reduce((a,c)=>a+(+c),0)+20, m=w/mods; let px=x+10*m, barra=true;
  pdf.setFillColor(255,255,255); pdf.rect(x,y,w,h,'F'); pdf.setFillColor(0,0,0);
  for(const c of L){ const n=+c*m; if(barra) pdf.rect(px,y,n,h,'F'); px+=n; barra=!barra; } }
/* ===FIM TABLET LOGIN=== */
/* ===================== GESTOR (08/10): resumo de produção, paradas, manutenção e silos + acesso aos módulos ===================== */
MODS.splice(1,0,{id:'gestor',nome:'Visão do gestor',ic:'grafico',views:['gestao']});
VIEWS.gestao={nome:'Visão do gestor',ic:'grafico',mob:'Gestor'}; CRUMB.gestao='Visão do gestor';
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.gestor={nome:'Gestor (acompanha e age)',mods:['gestor','producao','silos','manut','telas','analise'],locais:[]}; ACS_PERFIS.outro=_o; }
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('gestor')) EQ_PRONTO_ORD.splice(0,0,'gestor');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.gestor='Resumo de produção, paradas, manutenção e silos, todas as TVs em destaque e acesso às telas completas para agir. Celular e PC.';
if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.gestor) EQ_MOD.gestor=['grafico','Visão do gestor'];
ACS_MODS.splice(0,0,['gestor','Visão do gestor (resumo)']);
if(typeof LEIT_CONHECIDOS!=='undefined'&&!LEIT_CONHECIDOS.includes('gestor')){ LEIT_CONHECIDOS.push('gestor'); ['prod','silos','paradas','chamados'].forEach(g=>LEIT_GRUPOS[g].push('gestor')); }
/* quem tem o resumo começa por ele */
{ const _pv=primeiraView; primeiraView=function(){ try{ if(S.acs&&!S.acs.dono&&viewOk('gestao')) return 'gestao'; }catch(e){} return _pv(); }; }
function gTvs(){ let ts=[]; try{ ts=aprTelas(); }catch(e){} if(!ts.length) return '';
  return `<section class="card gs-tv"><div class="gs-tvh"><div><div class="label">TELAS DE TV</div><div class="sub" style="margin:2px 0 0">As telas das TVs, ao vivo e em tamanho pequeno. Toque numa para abrir em tela cheia (Esc volta).</div></div>
    <button class="btn big" data-act="gs-tv-todas">${ic('tv',20,2)}Passar todas as TVs</button></div>
    <div class="gs-tvg">${ts.map(t=>`<div class="gs-tvc" role="button" tabindex="0" data-act="gs-tv" data-k="${esc(t.k)}" style="--c:${t.cor}"><div class="gs-tvp gs-live" data-k="${esc(t.k)}"><div class="gs-in">${typeof spConteudo==='function'?spConteudo(t.k):aprMini(t.k)}</div></div><b>${esc(t.nome)}</b><small>${esc(t.d)}</small><span>${ic('tv',15,2)}Abrir em tela cheia</span></div>`).join('')}</div></section>`; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="gs-tv"],[data-act="gs-tv-todas"]'); if(!b) return; let ts=[]; try{ ts=aprTelas(); }catch(e){}
  if(b.dataset.act==='gs-tv-todas'){ if(ts.length) aprIniciar(ts); return; } const t=ts.find(x=>x.k===b.dataset.k); if(t) aprIniciar([t]); });
function gHoje(iso){ return iso&&hojeStr(new Date(iso))===hojeStr(); }
function gMin(ms){ const m=Math.round(ms/60000); return m<1?'menos de 1 min':m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'); }
function gN(n){ return Math.round(+n||0).toLocaleString('pt-BR'); }
function vGestao(){ const L=linhasOrd(), h=hojeStr(), agora=Date.now(), ini=new Date(); ini.setHours(0,0,0,0); const i0=ini.getTime();
  /* produção de hoje (mesma regra das outras telas: sem anuladas; antecipado conta quando foi registrado) */
  const an=typeof anuladas==='function'?anuladas():new Set(); const prod={}; let tot=0;
  (S.entregas||[]).forEach(e=>{ if(e.anula||an.has(e._id)) return; const t=e.antecipado&&e.registradoEm?e.registradoEm:e.em; if(!gHoje(t)) return; const o=ordById(e.ordem); const l=(o&&o.linha)||e.linha||'—'; prod[l]=(prod[l]||0)+(+e.qtd||0); tot+=+e.qtd||0; });
  const atras=typeof repAtrasadas==='function'?repAtrasadas():[];
  /* paradas: abertas agora e tempo parado hoje */
  const abertas=(S.paradas||[]).filter(p=>!p.fim); const parHoje={}; let parTot=0, nPar=0;
  (S.paradas||[]).forEach(p=>{ const a=Math.max(new Date(p.inicio).getTime(),i0), b=p.fim?new Date(p.fim).getTime():agora; if(b>a){ parHoje[p.linha]=(parHoje[p.linha]||0)+(b-a); parTot+=b-a; nPar++; } });
  /* manutenção */
  const ch=(S.chamados||[]).filter(c=>!manIgnorar(c)&&(+c.numero||0)<900000), ab=ch.filter(c=>!manFechada(c));
  const mParou=ab.filter(c=>c.impacto==='parou'&&!c.liberadoEm), mPeca=ab.filter(c=>/Aguardando/.test(c.status||'')), mExec=ab.filter(c=>c.status==='Em execução'), mConc=ch.filter(c=>c.status==='Concluída'&&gHoje(c.concluidoEm));
  const velho=ab.slice().sort((a,b)=>String(a.criado).localeCompare(String(b.criado)))[0];
  /* silos */
  const sal=saldoPorSilo(), cs=(S.cfg.silos||[]).filter(s=>s.grupo==='Cimento'); const cimT=cs.reduce((a,s)=>a+(sal[s.id]?sal[s.id].q:0),0), cimCap=cs.reduce((a,s)=>a+(+s.cap||0),0);
  const crit=(S.cfg.silos||[]).filter(s=>sal[s.id]&&s.cap&&nivel(sal[s.id].q/s.cap).c==='crit'); let pv=null; try{ pv=previsaoCimento(); }catch(e){}
  const nvC=nivel(cimCap?cimT/cimCap:0);
  /* linhas agora */
  const linha=l=>{ const p=abertas.find(x=>x.linha===l), o=typeof ordemRodando==='function'?ordemRodando(l):null, c=ab.find(x=>x.linha===l);
    if(p) return `<div class="gs-l crit"><b>${esc(l)}</b><span>Parada há ${gMin(agora-new Date(p.inicio).getTime())}</span><small>${esc(p.motivo||'')}${c?' · OS '+manNum(c.numero)+' '+esc(c.status):''}</small></div>`;
    if(o){ const f=entregueDe(o), pc=o.total?Math.min(1,f/o.total):0; return `<div class="gs-l ok"><b>${esc(l)}</b><span>${esc(String(o.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,'').slice(0,34))}</span><div class="gs-bar"><i style="width:${Math.round(pc*100)}%"></i></div><small>Ordem ${esc(o.num)} · ${gN(f)} de ${gN(o.total)} (${Math.round(pc*100)}%)${c?' · chamado aberto':''}</small></div>`; }
    return `<div class="gs-l neu"><b>${esc(l)}</b><span>Sem ordem rodando</span><small>${c?'OS '+manNum(c.numero)+' '+esc(c.status):'—'}</small></div>`; };
  const card=(go,titulo,grande,sub,corpo,cor)=>`<button class="card gs-c ${cor||''}" data-go="${go}"><div class="label">${titulo}</div><div class="gs-n num">${grande}</div><div class="gs-s">${sub}</div>${corpo||''}<span class="gs-ir">Abrir ›</span></button>`;
  const lista=(o,f)=>Object.keys(o).sort((a,b)=>L.indexOf(a)-L.indexOf(b)).map(k=>`<div class="gs-r"><span>${esc(k)}</span><b class="num">${f(o[k])}</b></div>`).join('');
  return `${banner()}<div class="head"><div><div class="eyebrow">VISÃO DO GESTOR</div><h1>Como está a fábrica agora</h1><div class="sub">Atualiza sozinho. Toque num quadro para ver os detalhes e agir.</div></div><div class="gs-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div></div>
   ${gTvs()}
   <section class="card"><div class="label" style="margin-bottom:10px">LINHAS AGORA</div><div class="gs-ls">${L.map(linha).join('')}</div></section>
   <div class="gs-g">
    ${card('programacao','PRODUÇÃO DE HOJE',gN(tot)+' <small>un</small>',atras.length?`<b style="color:var(--crit-ink)">${atras.length} ordem(ns) atrasada(s)</b>`:'nenhuma ordem atrasada',lista(prod,gN),atras.length?'warn':'')}
    ${card('paradas','PARADAS DE HOJE',parTot?gMin(parTot):'0 min',abertas.length?`<b style="color:var(--crit-ink)">${abertas.length} linha(s) parada(s) agora</b>`:nPar+' parada(s) hoje · nenhuma agora',lista(parHoje,gMin),abertas.length?'crit':'')}
    ${card('manch','MANUTENÇÃO',ab.length+' <small>aberto(s)</small>',[mParou.length?`<b style="color:var(--crit-ink)">${mParou.length} com máquina parada</b>`:'',mExec.length?mExec.length+' em execução':'',mPeca.length?mPeca.length+' aguardando peça/terceiros':'',mConc.length+' concluído(s) hoje'].filter(Boolean).join(' · '),velho?`<div class="gs-r"><span>Mais antigo</span><b>OS ${manNum(velho.numero)} · há ${manIdade(velho.criado)}</b></div>`:'',mParou.length?'crit':ab.length?'warn':'')}
    ${!S.siloLido?card('geral','SILOS · CIMENTO','…','carregando o nível dos silos…','',''):card('geral','SILOS · CIMENTO',f1(cimT)+' <small>t</small>',`${f1(cimCap?cimT/cimCap*100:0)}% · ${nvC.n}${crit.length?` · <b style="color:var(--crit-ink)">crítico: ${crit.map(s=>esc(s.nome)).join(', ')}</b>`:''}`,pv?`<div class="gs-r"><span>Programação</span><b>${pv.falta?'falta cimento em '+dm(pv.falta.dia)+' (ordem '+esc(pv.falta.o.num)+')':'o cimento cobre as ordens abertas'}</b></div>`:'',crit.length||(pv&&pv.falta)?'crit':'')}
   </div>`; }
document.head.insertAdjacentHTML('beforeend',`<style id="gs-css">.gs-clk{font-size:40px;font-weight:800;color:var(--teal-strong)}
.gs-ls{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.gs-l{border-radius:14px;padding:12px 14px;background:var(--surface-2);border-left:8px solid var(--line);display:flex;flex-direction:column;gap:3px;min-width:0}
.gs-l.ok{border-left-color:var(--ok)}.gs-l.crit{border-left-color:var(--crit);background:var(--crit-tint)}.gs-l b{font-size:16px}.gs-l span{font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gs-l small{color:var(--muted);font-size:12.5px}
.gs-l.crit span{color:var(--crit-ink)}.gs-bar{height:7px;border-radius:9px;background:var(--line);overflow:hidden;margin:3px 0}.gs-bar i{display:block;height:100%;background:var(--ok)}
.gs-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.gs-c{text-align:left;font:inherit;color:inherit;cursor:pointer;border:1px solid var(--line);display:flex;flex-direction:column;gap:4px}
.gs-c:hover{border-color:var(--teal)}.gs-c.crit{border-left:6px solid var(--crit)}.gs-c.warn{border-left:6px solid var(--warn)}.gs-n{font-size:34px;font-weight:800;line-height:1.1}.gs-n small{font-size:16px;font-weight:600;color:var(--muted)}.gs-s{font-size:14px;color:var(--ink-2)}
.gs-r{align-self:stretch;display:flex;justify-content:space-between;gap:10px;font-size:14px;border-top:1px solid var(--line);padding-top:6px;margin-top:4px}.gs-r span{color:var(--muted)}.gs-ir{margin-top:auto;align-self:flex-end;padding-top:10px;font-size:13px;font-weight:700;color:var(--teal-strong)}
.gs-tv{border:2px solid var(--teal)}.gs-tvh{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px}
.gs-tvg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.gs-tvc{font:inherit;color:inherit;text-align:left;cursor:pointer;border:1px solid var(--line);border-top:5px solid var(--c);border-radius:14px;background:var(--surface-2);padding:10px;display:flex;flex-direction:column;gap:4px}
.gs-tvc:hover{border-color:var(--c)}.gs-tvp{border-radius:8px;overflow:hidden;background:var(--surface);aspect-ratio:16/9}.gs-tvp svg{width:100%;height:100%;display:block}.gs-tvc b{font-size:15px}.gs-tvc small{color:var(--muted);font-size:12px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gs-tvc span{margin-top:auto;padding-top:6px;font-size:13px;font-weight:700;color:var(--teal-strong);display:flex;gap:6px;align-items:center}
@media (max-width:520px){ .gs-clk{font-size:28px} .gs-n{font-size:28px} .gs-ls{grid-template-columns:1fr} .gs-tvg{grid-template-columns:repeat(2,minmax(0,1fr))} .gs-tvc small{display:none} .gs-tvh .btn{width:100%} }</style>`);
/* ===FIM GESTOR=== */
/* ===================== TV DA FÁBRICA: login com todas as telas + TELA DIVIDIDA (08/10) ===================== */
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.tvtodas={nome:'TV da fábrica (todas as telas)',mods:['tv','telas','cal','analise','producao','silos','manut'],locais:[]}; ACS_PERFIS.outro=_o; }
if(!ACS_SO_VER.includes('tvtodas')) ACS_SO_VER.push('tvtodas');
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('tvtodas')) EQ_PRONTO_ORD.splice(EQ_PRONTO_ORD.indexOf('gestor')+1,0,'tvtodas');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.tvtodas='Para a TV da fábrica: todas as telas de TV, uma de cada vez ou com a tela dividida. Só mostra, não muda nada.';
if(typeof EQ_AREA!=='undefined') EQ_AREA.tvtodas='telas';
VIEWS.tvsplit={nome:'Tela dividida',ic:'tv',mob:'Dividida'}; CRUMB.tvsplit='Tela dividida';
{ const _vo=viewOk; viewOk=function(v){ if(v==='tvsplit') return _vo('tvapres'); return _vo.apply(this,arguments); }; }
const SP_LAY={'2':{n:2,nome:'2 lado a lado'},'2v':{n:2,nome:'2 em cima e embaixo'},'3':{n:3,nome:'1 grande + 2'},'4':{n:4,nome:'4 telas'}};
S.split=(()=>{ let o={}; try{ o=JSON.parse(localStorage.getItem('colafix.split')||'{}')||{}; }catch(e){} return {lay:SP_LAY[o.lay]?o.lay:'4',slots:Array.isArray(o.slots)&&o.slots.length?o.slots:['tvfab','manut','silos','monitor'],auto:!!o.auto}; })();
function spSalva(){ try{ localStorage.setItem('colafix.split',JSON.stringify(S.split)); }catch(e){} }
function spTelas(){ try{ return aprTelas(); }catch(e){ return []; } }
/* o que cada tela de TV desenha (as mesmas funções da TV em tela cheia) */
function spRota(v){ return v==='tvfab'?vTvFab():v==='anlrit'?anlView('anlrit'):v==='diario'?vDiario():v==='geral'?vGeral():v==='calendario'?vCalendario():String(v).startsWith('man')?manView(v):''; }
function spConteudo(k){ const t=spTelas().find(x=>x.k===k); if(!t) return '<div class="sp-vz">Tela indisponível neste login</div>';
  const vAnt=S.view, dAnt=S.dbo&&S.dbo.modo, diaAnt=S.dbo&&S.dbo.dia;
  try{ S.view=t.v; if(k==='monitor'&&S.dbo){ S.dbo.modo='monitor'; S.dbo.dia=hojeStr(); } return spRota(t.v); }
  catch(e){ console.warn('[tela dividida]',k,e); return '<div class="sp-vz">Não consegui mostrar esta tela agora</div>'; }
  finally{ S.view=vAnt; if(S.dbo){ S.dbo.modo=dAnt; S.dbo.dia=diaAnt; } } }
function vSplit(){ const P=S.split, L=SP_LAY[P.lay]||SP_LAY['4'], ts=spTelas();
  const slots=[...Array(L.n)].map((_,i)=>P.slots[i]||(ts[i]&&ts[i].k)||'');
  return `<div class="sp sp-${P.lay}">${slots.map((k,i)=>{ const t=ts.find(x=>x.k===k); return `<div class="sp-p" data-i="${i}"><div class="sp-in">${spConteudo(k)}</div>${t?`<span class="sp-tag" style="--c:${t.cor}">${esc(t.nome)}</span>`:''}</div>`; }).join('')}</div>
   <button class="sp-sair" data-act="sp-sair" title="Sair da tela dividida (Esc)">✕ Sair</button>`; }
/* cada parte mostra a tela inteira, reduzida para caber */
function spEscala(){ const W=Math.max(1024,innerWidth), H=Math.max(600,innerHeight);
  document.querySelectorAll('.sp-p').forEach(p=>{ const i=p.querySelector('.sp-in'); if(!i) return; const k=Math.min(p.clientWidth/W,p.clientHeight/H);
    i.style.width=W+'px'; i.style.height=H+'px'; i.style.transform=`scale(${k})`; i.style.left=((p.clientWidth-W*k)/2)+'px'; i.style.top=((p.clientHeight-H*k)/2)+'px'; }); }
let spEra=false;
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ if(S.view==='tvsplit'){ document.body.classList.add('tv','tv-split'); spEra=true; spEscala(); }
    else if(spEra){ spEra=false; document.body.classList.remove('tv-split'); if(!(S.apres&&S.apres.on)) document.body.classList.remove('tv'); } }catch(e){} return x; }; }
addEventListener('resize',()=>{ if(S.view==='tvsplit') spEscala(); });
function spAbrir(){ try{ const el=document.documentElement; if(!document.fullscreenElement&&el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }catch(e){} go('tvsplit'); }
function spSair(){ try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){} go('tvapres'); }
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.view==='tvsplit'){ ev.preventDefault(); spSair(); } });
let spMexeu=0; document.addEventListener('pointermove',()=>{ if(S.view!=='tvsplit') return; document.body.classList.add('sp-mexeu'); clearTimeout(spMexeu); spMexeu=setTimeout(()=>document.body.classList.remove('sp-mexeu'),2500); });
/* escolha na tela "Telas de TV" */
function spCard(){ const P=S.split, ts=spTelas(), L=SP_LAY[P.lay]; if(!ts.length) return '';
  const desenho=k=>{ const b=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="currentColor"/>`; return `<svg viewBox="0 0 48 27" width="48" height="27" aria-hidden="true">${k==='2'?b(0,0,23.5,27)+b(24.5,0,23.5,27):k==='2v'?b(0,0,48,13)+b(0,14,48,13):k==='3'?b(0,0,31,27)+b(32,0,16,13)+b(32,14,16,13):b(0,0,23.5,13)+b(24.5,0,23.5,13)+b(0,14,23.5,13)+b(24.5,14,23.5,13)}</svg>`; };
  return `<section class="card sp-cfg"><div class="label">TELA DIVIDIDA</div><div class="sub" style="margin:4px 0 12px">Várias telas ao mesmo tempo, ao vivo, em tela cheia. Use Esc para sair.</div>
   <div class="sp-lays">${Object.keys(SP_LAY).map(k=>`<button class="sp-lay" data-act="sp-lay" data-v="${k}" aria-pressed="${P.lay===k}">${desenho(k)}<span>${SP_LAY[k].nome}</span></button>`).join('')}</div>
   <div class="sp-slots">${[...Array(L.n)].map((_,i)=>`<label><span class="label">${P.lay==='3'&&i===0?'TELA GRANDE':'PARTE '+(i+1)}</span><select class="txt" data-sp-slot="${i}">${ts.map(t=>`<option value="${esc(t.k)}" ${(P.slots[i]||(ts[i]&&ts[i].k))===t.k?'selected':''}>${esc(t.nome)}</option>`).join('')}</select></label>`).join('')}</div>
   <div class="sp-go"><label class="apr-ck"><input type="checkbox" id="sp-auto" ${P.auto?'checked':''}> Abrir sempre a tela dividida quando esta TV ligar</label><button class="btn big" data-act="sp-abrir">${ic('tv',20,2)}Abrir tela dividida</button></div></section>`; }
{ const _va=vApres; vApres=function(){ const h=_va.apply(this,arguments); const i=h.indexOf('<section class="card apr-cfg">'); return i<0?h+spCard():h.slice(0,i)+spCard()+h.slice(i); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="sp-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='sp-lay'){ S.split.lay=b.dataset.v; spSalva(); render(); return; } if(a==='sp-abrir'){ spAbrir(); return; } if(a==='sp-sair'){ spSair(); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.spSlot!=null){ S.split.slots[+t.dataset.spSlot]=t.value; spSalva(); } if(t.id==='sp-auto'){ S.split.auto=!!t.checked; spSalva(); toast(t.checked?'Esta TV vai abrir direto na tela dividida.':'Esta TV abre normalmente.'); } });
/* TV ligada: abre direto na tela dividida (se marcado neste aparelho) */
(function(){ let n=0; const t=setInterval(()=>{ if(++n>60){ clearInterval(t); return; } try{ if(S.acs&&S.acs.pronto&&acsP()){ clearInterval(t); if(S.split.auto&&viewOk('tvsplit')) go('tvsplit'); } }catch(e){} },500); })();
/* login da TV começa pelas Telas de TV */
{ const _pv=primeiraView; primeiraView=function(){ try{ if(S.acs&&!S.acs.dono&&S.acs.doc&&S.acs.doc.perfil==='tvtodas') return S.split.auto?'tvsplit':'tvapres'; }catch(e){} return _pv(); }; }
document.head.insertAdjacentHTML('beforeend',`<style id="sp-css">
body.tv-split .content{padding:0!important;max-width:none!important}body.tv-split .main{margin:0!important}
.sp{position:fixed;inset:0;z-index:50;display:grid;gap:6px;padding:6px;background:#0E1B24}
.sp-2{grid-template-columns:1fr 1fr}.sp-2v{grid-template-rows:1fr 1fr}.sp-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}.sp-3{grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr}.sp-3 .sp-p:first-child{grid-row:1 / span 2}
.sp-p{position:relative;overflow:hidden;border-radius:10px;background:var(--ground);min-width:0;min-height:0}.sp-in{position:absolute;transform-origin:0 0;overflow:hidden;pointer-events:none}
.sp-tag{position:absolute;left:10px;bottom:8px;background:var(--c);color:#fff;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:999px;opacity:.85}
.sp-vz{display:flex;align-items:center;justify-content:center;height:100%;font-size:28px;color:var(--muted)}
.sp-sair{position:fixed;top:12px;right:12px;z-index:60;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:800;background:rgba(0,0,0,.65);color:#fff;cursor:pointer;opacity:0;transition:opacity .3s}body.sp-mexeu .sp-sair,.sp-sair:focus{opacity:1}
.sp-cfg{border:2px solid var(--teal)}.sp-lays{display:flex;gap:10px;flex-wrap:wrap}.sp-lay{font:inherit;cursor:pointer;border:2px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--muted);min-width:120px}
.sp-lay span{font-size:13px;font-weight:700;color:var(--ink-2)}.sp-lay[aria-pressed="true"]{border-color:var(--teal-strong);color:var(--teal-strong);background:var(--teal-wash)}
.sp-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:14px 0}.sp-slots label{display:flex;flex-direction:column;gap:4px}
.sp-go{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}</style>`);
/* ===FIM TELA DIVIDIDA=== */
/* Visão do gestor: as miniaturas das TVs são as telas de verdade, reduzidas (mesma técnica da tela dividida) */
function gsEscala(){ document.querySelectorAll('.gs-live').forEach(b=>{ const i=b.querySelector('.gs-in'); if(!i) return; const W=1600,H=900,k=b.clientWidth/W; i.style.width=W+'px'; i.style.height=H+'px'; i.style.transform='scale('+k+')'; }); }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ if(S.view==='gestao') gsEscala(); }catch(e){} return x; }; }
addEventListener('resize',()=>{ if(S.view==='gestao') gsEscala(); });
setInterval(()=>{ if(S.view==='gestao') gsEscala(); },500);
document.head.insertAdjacentHTML('beforeend','<style>.gs-live{position:relative;overflow:hidden;background:var(--ground)}.gs-live .gs-in{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;overflow:hidden;padding:18px 22px;box-sizing:border-box}.gs-tvg{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))!important}</style>');
/* ===================== LIBERAÇÕES POR PESSOA (08/10): módulos extras, só ver, telas avulsas e ações ===================== */
/* acessos/{uid}: extras[] (módulos somados ao cargo) · semMods[] (tirados do cargo) · soVerMods[] (módulos só de leitura)
   telas[] (telas avulsas) · acoes{chave:true|false} (ajuste de ações; sem chave = padrão) · bloqCols[] (para as regras do Firestore)
   Sem nada disso, a pessoa continua exatamente como antes. */
const ACX_ACOES=[
  {k:'apontar',mod:'producao',n:'Apontar produção (entregas)'},
  {k:'rancho',mod:'almox',n:'Marcar etapas do rancho (separado, entregue, conferido)'},
  {k:'programar',mod:'producao',n:'Editar programação, ordens, previsões e itens'},
  {k:'paradas',mod:'producao',n:'Registrar e editar paradas'},
  {k:'medir',mod:'silos',n:'Medir silos e registrar cargas'},
  {k:'abrirch',mod:'manut',n:'Abrir chamados de manutenção'},
  {k:'atender',mod:'manut',n:'Atender chamados (status, atendimento, materiais)'},
  {k:'concluir',mod:'manut',n:'Concluir e cancelar OS'},
  {k:'cadman',mod:'manut',n:'Cadastros da manutenção (equipamentos, preventivas, peças)'},
  {k:'apagar',mod:'',n:'Apagar registros'}];
/* quais ações liberam gravar em cada coleção (basta uma delas) */
const ACX_COL={entregas:['apontar'],ordens:['programar','rancho'],previsoes:['programar'],itens:['programar'],paradas:['paradas','abrirch','atender','concluir'],
  medicoes:['medir'],cargas:['medir'],premix:['medir'],silos:['medir','apontar'],silomov:['medir','apontar'],chamados:['abrirch','atender','concluir'],chamfotos:['abrirch','atender'],pecasmov:['atender','cadman']};
function acxDoc(){ const A=S.acs; return A&&!A.dono&&A.doc?A.doc:null; }
/* padrão de ações por cargo (o ajuste por pessoa vence). "Produção (consulta)": vê tudo; abre chamado, registra parada e marca as etapas do rancho (recebeu). */
const ACX_CARGO={producao:{apontar:false,programar:false,medir:false,atender:false,concluir:false,cadman:false,apagar:false}};
function acxPode(k,d){ d=d||acxDoc(); if(!d) return true; const o=Object.assign({},ACX_CARGO[d.perfil]||{},d.acoes||{}); if(o[k]===true) return true; if(o[k]===false) return false; const a=ACX_ACOES.find(x=>x.k===k); return !(a&&a.mod&&(d.soVerMods||[]).includes(a.mod)); }
function acxAlgum(ks,d){ return ks.some(k=>acxPode(k,d)); }
function acxBloqCols(d){ return Object.keys(ACX_COL).filter(c=>!acxAlgum(ACX_COL[c],d)); }
function acxAjustada(d){ return !!d&&(!!ACX_CARGO[d.perfil]||acxPessoal(d)); }
function acxPessoal(d){ return !!d&&!!((d.extras||[]).length||(d.semMods||[]).length||(d.soVerMods||[]).length||(d.telas||[]).length||Object.keys(d.acoes||{}).length); }
/* motivo da recusa (null = pode gravar) */
function acxBloqueio(col,id,op,data){ const d=acxDoc(); if(!d||!acxAjustada(d)) return null; const err={code:'sem-permissao',message:'Sem permissão para esta ação'};
  if(col==='config'&&id==='manut') return acxPode('cadman',d)?null:err;
  let ks=ACX_COL[col]; if(!ks) return null;
  /* marcar etapa do rancho só mexe em rdb/hist/rancho da ordem: basta "rancho" (não precisa poder editar a programação) */
  if(col==='ordens'&&op!=='delete') ks=data&&Object.keys(data).every(k=>['rdb','hist','rancho','alteradoEm','alteradoPor'].includes(k))?['rancho','programar']:['programar'];
  if(col==='chamados'){ if(op==='delete') ks=String(id).startsWith('q-')?['atender']:['apagar'];
    else { const existe=(S.chamados||[]).some(c=>c._id===id); if(!existe||(data&&Object.keys(data).every(k=>['paradaId','foto','fotos','hist','equipId'].includes(k)))) ks=['abrirch','atender']; /* quem abriu completa: parada ligada, foto, equipamento */ else if(data&&['Concluída','Cancelada'].includes(data.status)) ks=['concluir']; else if(data&&data.status) ks=['atender']; /* mudar para outro status = atender */ else ks=['atender','concluir']; /* preencher atendimento (para concluir) */ } }
  if(!acxAlgum(ks,d)) return err;
  if(op==='delete'&&col!=='chamados'&&!acxPode('apagar',d)) return err;
  return null; }
/* todo o painel grava por S.db: a verificação fica na frente de set/update/delete/add */
function acxGuardaDoc(ref,path){ if(!ref||ref._acx) return ref; const seg=String(path||ref.path||'').split('/'), col=seg[0], id=seg[1]||ref.id||'';
  const g=Object.assign({},ref,{_acx:true});
  ['set','update','delete'].forEach(op=>{ const f=ref[op]; if(typeof f!=='function') return; g[op]=function(dados){ const e=acxBloqueio(col,id,op,dados); if(e){ console.warn('[acesso] bloqueado:',op,path); return Promise.reject(e); } return f.apply(ref,arguments); }; });
  return g; }
function acxGuardaQuery(q,col){ if(!q||q._acx) return q; const g=Object.assign({},q,{_acx:true});
  if(typeof q.add==='function') g.add=function(dados){ const e=acxBloqueio(col,'novo-'+Date.now(),'set',dados); if(e) return Promise.reject(e); return q.add.apply(q,arguments); };
  if(typeof q.doc==='function') g.doc=function(id){ const r=q.doc.apply(q,arguments); return acxGuardaDoc(r,col+'/'+(r&&r.id||id)); };
  ['where','orderBy','limit'].forEach(m=>{ if(typeof q[m]==='function') g[m]=function(){ return acxGuardaQuery(q[m].apply(q,arguments),col); }; });
  return g; }
setInterval(()=>{ const db=S.db; if(!db||db._acx) return; const d0=db.doc, c0=db.collection; if(typeof d0!=='function'||typeof c0!=='function') return;
  db.doc=function(p){ return acxGuardaDoc(d0.apply(db,arguments),p); }; db.collection=function(p){ return acxGuardaQuery(c0.apply(db,arguments),p); }; db._acx=true; },200);
/* gravações que não passam por S.db (transações) */
{ const _m=mxGrava; mxGrava=async function(){ if(!acxPode('cadman')&&acxAjustada(acxDoc())) throw {code:'sem-permissao'}; return _m.apply(this,arguments); }; }
{ const _r=siloRegistrarMedicao; siloRegistrarMedicao=async function(){ if(acxAjustada(acxDoc())&&!acxPode('medir')) throw {code:'sem-permissao'}; return _r.apply(this,arguments); }; }
{ const _p=siloProcessarEntrega; siloProcessarEntrega=async function(){ if(acxAjustada(acxDoc())&&!acxAlgum(['apontar','medir'])) return null; return _p.apply(this,arguments); }; }

/* ---------- o que a pessoa vê: módulos do cargo + extras − tirados; telas avulsas ---------- */
{ const _a=acsP; acsP=function(){ const p=_a.apply(this,arguments); const d=acxDoc(); if(!p||!d||!acxAjustada(d)) return p;
  const mods=[...new Set([...(p.mods||[]),...(d.extras||[]),...(d.soVerMods||[])])].filter(m=>!(d.semMods||[]).includes(m)); return Object.assign({},p,{mods}); }; }
/* telas que nunca viram avulsas (só da administradora ou do próprio sistema) */
const ACX_NUNCA=['mancrachas','acessos','paineis','painel','meudia','mantotem','tvsplit'];
function acxModDaTela(v){ const m=MODS.find(x=>(x.views||[]).includes(v)); return m?m.id:''; }
{ const _vo=viewOk; viewOk=function(v){ if(_vo.apply(this,arguments)) return true; const d=acxDoc(); return !!(d&&(d.telas||[]).includes(v)&&VIEWS[v]&&!ACX_NUNCA.includes(v)); }; }
/* as telas avulsas também precisam dos dados do módulo delas */
if(typeof leitPrecisa==='function'){ const _lp=leitPrecisa; leitPrecisa=function(g){ if(_lp(g)) return true; const d=acxDoc(); if(!d||!(d.telas||[]).length) return false;
  const ms=[...new Set(d.telas.map(acxModDaTela).filter(Boolean))]; return ms.some(m=>(LEIT_GRUPOS[g]||[]).includes(m)); }; }
/* aviso nas telas de módulo "só ver" */
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ const d=acxDoc(); const m=acxModDaTela(S.view);
    if(d&&m&&(d.soVerMods||[]).includes(m)){ const el=document.getElementById('view'); if(el&&!el.querySelector('.acx-sover')) el.insertAdjacentHTML('afterbegin',`<div class="banner acx-sover" style="background:var(--teal-wash);color:var(--teal-strong)">${ic('olho',16,2)} Só visualização: você pode ver este módulo, mas não alterar.</div>`); } }catch(e){} return x; }; }

/* ---------- editor (Equipe e cargos → Ajustar acesso) ---------- */
S.acx={};
function acxEstado(id){ if(!S.acx[id]){ const d=(S.acs.lista||[]).find(x=>x._id===id)||{}; S.acx[id]={extras:[...(d.extras||[])],semMods:[...(d.semMods||[])],soVerMods:[...(d.soVerMods||[])],telas:[...(d.telas||[])],acoes:Object.assign({},d.acoes||{}),mudou:false}; } return S.acx[id]; }
function acxPerfil(id){ return ((S.acs.lista||[]).find(x=>x._id===id)||{}).perfil; }
function acxPadrao(id,X,a){ const c=(ACX_CARGO[acxPerfil(id)]||{})[a.k]; return c===false?false:!(a.mod&&X.soVerMods.includes(a.mod)); }
function acxBase(id){ const d=(S.acs.lista||[]).find(x=>x._id===id)||{}; try{ return eqModsDe(d)||[]; }catch(e){ return d.mods||[]; } }
function acxNivel(X,base,k){ if(X.semMods.includes(k)) return 'nao'; if(X.soVerMods.includes(k)) return 'ver'; if(base.includes(k)||X.extras.includes(k)) return 'mexer'; return 'nao'; }
function acxSecao(id){ const X=acxEstado(id), base=acxBase(id); const mods=ACS_MODS.filter(([k])=>MODS.some(m=>m.id===k||(k==='cal'))&&k!=='ajustes');
  const seg=(k,v,t,nv)=>`<button data-act="acx-mod" data-id="${esc(id)}" data-k="${esc(k)}" data-v="${v}" aria-pressed="${nv===v}">${t}</button>`;
  const linhaMod=([k,n])=>{ const nv=acxNivel(X,base,k); return `<div class="acx-row"><span>${esc(n)}${base.includes(k)?' <small class="acx-tag">do cargo</small>':''}</span><div class="seg acx-seg">${seg(k,'nao','—',nv)}${seg(k,'ver','Só ver',nv)}${seg(k,'mexer','Ver e mexer',nv)}</div></div>`; };
  const efet=k=>acxNivel(X,base,k)!=='nao';
  const avulsas=MODS.filter(m=>!efet(m.id)&&(m.views||[]).some(v=>VIEWS[v]&&!ACX_NUNCA.includes(v))&&!['tablet','gestor','silosver','meupainel'].includes(m.id)).map(m=>`<div class="acx-tg"><b>${esc(m.nome)}</b>${(m.views||[]).filter(v=>VIEWS[v]&&!ACX_NUNCA.includes(v)).map(v=>`<label class="ck"><input type="checkbox" data-acx-tela="${esc(v)}" data-id="${esc(id)}" ${X.telas.includes(v)?'checked':''}>${esc(VIEWS[v].nome)}</label>`).join('')}</div>`).join('');
  const dsim={perfil:acxPerfil(id),extras:X.extras,semMods:X.semMods,soVerMods:X.soVerMods,acoes:X.acoes};
  const acoes=ACX_ACOES.map(a=>{ const pad=acxPadrao(id,X,a), aj=X.acoes[a.k]!==undefined, val=acxPode(a.k,dsim);
    return `<label class="ck acx-ac"><input type="checkbox" data-acx-acao="${a.k}" data-id="${esc(id)}" ${val?'checked':''}>${esc(a.n)} <small class="acx-tag ${aj?'aj':''}">${aj?'ajustado':'padrão: '+(pad?'pode':'não pode')}</small></label>`; }).join('');
  return `<section class="card acx" id="acx-${esc(id)}"><div class="label">AJUSTES DESTA PESSOA (ALÉM DO CARGO)</div><div class="sub" style="margin:4px 0 12px">Some módulos, deixe um módulo só para ver, libere telas avulsas ou ajuste ações. Vale só para esta pessoa; o cargo não muda.</div>
   <div class="label" style="margin:10px 0 6px">MÓDULOS</div><div class="acx-mods">${mods.map(linhaMod).join('')}</div>
   ${avulsas?`<div class="label" style="margin:16px 0 6px">TELAS AVULSAS (SEM DAR O MÓDULO INTEIRO)</div><div class="acx-tgs">${avulsas}</div>`:''}
   <div class="label" style="margin:16px 0 6px">AÇÕES</div><div class="acx-acs">${acoes}</div>
   <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="lnk" data-act="acx-limpar" data-id="${esc(id)}">Voltar tudo ao padrão do cargo</button><button class="btn" data-act="acx-salvar" data-id="${esc(id)}" ${X.salv?'disabled':''}>${ic('check',18,2.2)}${X.salv?'Salvando…':'Salvar ajustes'}</button></div></section>`; }
{ const _ae=acsEditor; acsEditor=function(ed){ const h=_ae.apply(this,arguments); if(!ed||ed.novo||!ed.id) return h; return h+acxSecao(ed.id); }; }
/* cartão da pessoa: botão renomeado e selo quando há ajustes */
{ const _ep=eqPessoas; eqPessoas=function(){ let h=_ep.apply(this,arguments); h=h.split('Ajustar telas</button>').join('Ajustar acesso</button>');
  (S.acs.lista||[]).forEach(d=>{ if(acxPessoal(d)) h=h.replace(`data-act="acs-editar" data-id="${d._id}">`,`data-act="acs-editar" data-id="${d._id}"><span class="pill teal" style="margin-right:4px">ajustado</span>`); }); return h; }; }
function acxToggle(arr,k,on){ const i=arr.indexOf(k); if(on&&i<0) arr.push(k); if(!on&&i>=0) arr.splice(i,1); }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="acx-"]'); if(!b) return; if(!S.acs.dono){ toast('Só a administradora ajusta acessos.'); return; }
  const id=b.dataset.id, X=acxEstado(id), base=acxBase(id), a=b.dataset.act;
  if(a==='acx-mod'){ const k=b.dataset.k, v=b.dataset.v;
    acxToggle(X.semMods,k,v==='nao'&&base.includes(k)); acxToggle(X.soVerMods,k,v==='ver'); acxToggle(X.extras,k,v!=='nao'&&!base.includes(k));
    if(v!=='nao') X.telas=X.telas.filter(t=>acxModDaTela(t)!==k); X.mudou=true; render(); return; }
  if(a==='acx-limpar'){ Object.assign(X,{extras:[],semMods:[],soVerMods:[],telas:[],acoes:{},mudou:true}); render(); return; }
  if(a==='acx-salvar'){ X.salv=true; render(); const dados={extras:X.extras,semMods:X.semMods,soVerMods:X.soVerMods,telas:X.telas,acoes:X.acoes};
    dados.bloqCols=acxBloqCols(Object.assign({perfil:acxPerfil(id)},dados));
    try{ await S.db.doc('acessos/'+id).update(Object.assign({},dados,{alteradoEm:new Date().toISOString(),alteradoPor:S.uid||null})); const d=(S.acs.lista||[]).find(x=>x._id===id); if(d) Object.assign(d,dados); X.mudou=false; toast('Ajustes de '+acsNome(id)+' salvos.'); }
    catch(e){ console.warn('[acesso] salvar',e); erro(e); } X.salv=false; render(); return; } });
document.addEventListener('change',ev=>{ const t=ev.target; const id=t.dataset&&t.dataset.id; if(!id||!(t.dataset.acxTela||t.dataset.acxAcao)) return; const X=acxEstado(id);
  if(t.dataset.acxTela){ acxToggle(X.telas,t.dataset.acxTela,t.checked); }
  else { const k=t.dataset.acxAcao, a=ACX_ACOES.find(x=>x.k===k); const pad=acxPadrao(id,X,a); if(t.checked===pad) delete X.acoes[k]; else X.acoes[k]=t.checked; }
  X.mudou=true; render(); });
/* trocar o cargo não apaga os ajustes */
{ const _ag=acsGravar; acsGravar=async function(id,f,novo){ const ant=(S.acs.lista||[]).find(x=>x._id===id); const ok=await _ag.apply(this,arguments);
  if(ok&&ant&&acxPessoal(ant)){ const k=['extras','semMods','soVerMods','telas','acoes','bloqCols'], u={}; k.forEach(x=>{ if(ant[x]!==undefined) u[x]=ant[x]; }); try{ await S.db.doc('acessos/'+id).update(u); }catch(e){ console.warn('[acesso] manter ajustes',e); } } return ok; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="acx-css">.acx{border:1.5px solid var(--teal)}.acx-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.acx-seg button{height:34px;font-size:13px}.acx-tag{font-size:11px;color:var(--muted);font-weight:600}.acx-tag.aj{color:var(--teal-strong)}
.acx-tgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.acx-tg{display:flex;flex-direction:column;gap:4px;background:var(--surface-2);border-radius:10px;padding:10px}
.acx-acs{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:6px}</style>`);
/* quando a regra muda, a administradora atualiza sozinha a lista de bloqueios (usada pelas regras do banco) de quem tem ajuste */
let acxRecalc=false; setInterval(async()=>{ if(acxRecalc||!S.db||!S.acs||!S.acs.dono||!(S.acs.lista||[]).length) return; acxRecalc=true;
  for(const d of S.acs.lista){ if(!acxAjustada(d)){ if((d.bloqCols||[]).length){ try{ await S.db.doc('acessos/'+d._id).update({bloqCols:[]}); d.bloqCols=[]; }catch(e){} } continue; } const nv=acxBloqCols(d); if(JSON.stringify(nv)!==JSON.stringify(d.bloqCols||[])){ try{ await S.db.doc('acessos/'+d._id).update({bloqCols:nv}); d.bloqCols=nv; }catch(e){ console.warn('[acesso] recalcular',e); } } } },3000);
/* ===FIM LIBERAÇÕES=== */
/* ===================== RANCHO PELO QR SEM LOGIN (09/10): aplica os recebimentos no diário de bordo ===================== */
S.rrec=[]; let rrSub=false, rrProc=false;
setInterval(()=>{ try{ if(rrSub||!S.db||!S.acs||!S.acs.pronto||!acsP()) return; if(!(viewOk('diario')||viewOk('ranchos'))||(typeof soVer==='function'&&soVer())) return;
  rrSub=true; inscrever('rancrec',()=>S.db.collection('rancrec').where('status','==','novo').limit(50),snap=>{ S.rrec=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); rrProcessa(); }); }catch(e){} },1500);
setInterval(()=>{ if(S.rrec.length) rrProcessa(); },20000);  /* ordens do rancho podem chegar depois */
async function rrProcessa(){ if(rrProc||!S.db) return; const fs=window.claude&&window.claude._fs&&window.claude._fs(); if(!fs) return; rrProc=true;
  try{ for(const r of S.rrec.slice()){ const os=(S.ordens||[]).filter(o=>String(o.rancho||'')===String(r.rancho)); if(!os.length) continue;
      /* reserva: só um painel aplica cada recebimento */
      let pegou=false; await fs.runTransaction(async t=>{ const ref=fs.doc('rancrec/'+r._id); const g=await t.get(ref); if(!g.exists||g.data().status!=='novo') return; t.update(ref,{status:'aplicando',feitoPor:S.uid||null}); pegou=true; });
      if(!pegou) continue; let n=0, falhou=false;
      for(const x of os){ const rx=Object.assign({},x.rdb||{}); if(rx.ent) continue; rx.ent={em:r.em,por:null,nome:r.nome,origem:'qr'}; if(!rx.sep) rx.sep={em:r.em,por:null};
        if(await dbSalvar(x,rx,'Rancho '+r.rancho+' recebido na linha por '+r.nome+' (QR da folha)',r.rancho)) n++; else falhou=true; }
      await S.db.doc('rancrec/'+r._id).update(falhou&&!n?{status:'novo',feitoPor:null}:{status:'feito',feitoEm:new Date().toISOString(),ordens:n});
      if(n) toast('Rancho '+r.rancho+' recebido na linha por '+r.nome+' (QR).'); } }
  catch(e){ console.warn('[rancho QR]',e); } finally{ rrProc=false; } }
/* ===FIM RANCHO QR=== */
/* ===================== TABLET: CONFERÊNCIA DO RANCHO PELA FOLHA (09/10) ===================== */
/* Na tela de espera do tablet, a pessoa mostra o QR da folha de produção (ou bipa o RA-… no coletor), passa o crachá e confere item a item.
   Grava igual à conferência do diário de bordo (rdb.ent + rdb.conf nas ordens do rancho), com o nome de quem conferiu. */
/* o tablet precisa dos ranchos e das ordens abertas (só isso, para gastar pouca leitura) */
{ const _ap=assinaPorPerfil; assinaPorPerfil=function(db){ _ap.apply(this,arguments); try{ if(!db||!S.acs||!S.acs.pronto||!acsP()||!ttPodeUsar()) return; if(!(S.view==='mantotem'||ttSoTablet())) return; /* só quando o modo tablet está aberto */
    if(!leitPrecisa('prod')&&!_leit.ttOrd){ _leit.ttOrd=true; assinarQ(()=>db.collection('ordens').where('status','==','aberta').limit(1000),'_ordA'); }
    if(!leitPrecisa('diario')&&!_leit.ttRch){ _leit.ttRch=true; assinarQ(()=>db.collection('ranchos').orderBy('criadoEm','desc').limit(150),'ranchos'); } }catch(e){} }; }
function ttRancho(num){ const T=S.tt; num=String(num).replace(/\D/g,''); const os=(S.ordens||[]).filter(o=>String(o.rancho||'')===num);
  if(!os.length){ ttMsg('Rancho '+num+' não encontrado no painel (ou já encerrado).'); return; }
  const o=os.find(x=>!(x.rdb&&x.rdb.conf))||os[0];
  Object.assign(T,{fase:'rancho',p:null,ult:Date.now(),msg:'',enviando:false,rch:{num,oid:o._id,itens:null,modo:'',obs:'',falta:false}}); ttCarregaItens(); render(); }
function ttCarregaItens(){ const R=S.tt.rch; if(!R||R.itens) return; const o=ordById(R.oid); if(!o) return; const r=dbItensRc(o);
  if(r.st==='ok'){ R.itens=r.itens.map(x=>({c:x.c,d:x.d,um:x.um||'',q:+x.q||0,ok:true,qr:+x.q||0})); R.modo='itens'; }
  else if(r.st==='sem'||r.st==='erro'){ R.itens=[]; R.modo='livre'; } else R.modo='lendo'; }
setInterval(()=>{ const T=S.tt; if(ttAtivo()&&T.fase==='rancho'&&T.rch&&!T.rch.itens){ ttCarregaItens(); if(T.rch.itens) render(); } },1000);
/* leitura: folha (QR com rancho= ou RA-) e, na conferência, o crachá de quem confere */
{ const _tl=ttLeu; ttLeu=function(txt){ const T=S.tt, s=String(txt||'').trim(); const mr=s.match(/rancho=(\d{4,})/i)||s.toUpperCase().match(/^RA-?(\d{4,})$/);
  if(mr){ if(T.fase==='espera') ttRancho(mr[1]); return; }
  if(T.fase==='rancho'&&!T.p){ const m=s.toUpperCase().match(TT_RE); if(!m){ ttMsg('Agora passe o seu crachá.'); return; } const c=crDe(m[1]);
    if(!c||c.ativo===false){ ttMsg('Crachá não reconhecido.'); return; } ttBip(); T.p={codigo:c.codigo,nome:c.nome,linha:c.linha,papel:c.papel}; T.ult=Date.now(); ttCamDesliga(); render(); return; }
  return _tl.apply(this,arguments); }; }
/* coletor: RA- da folha e crachá durante a conferência */
{ const _cl=cbLeu; cbLeu=function(cod){ const c=String(cod||'').toUpperCase(); if(S.view==='mantotem'&&/^RA-\d{4,}$/.test(c)){ S.tt.ult=Date.now(); ttLeu(c); return; } return _cl.apply(this,arguments); }; }
{ const _cc=crColetor; crColetor=function(cod){ if(S.view==='mantotem'&&S.tt.fase==='rancho'&&!S.tt.p){ S.tt.ult=Date.now(); ttLeu('COLAFIX:CRACHA:'+cod); return; } return _cc.apply(this,arguments); }; }
function vTtRancho(){ const T=S.tt, R=T.rch, o=R&&ordById(R.oid); if(!R||!o) return '<div class="tt-box"><h1>Rancho não encontrado</h1></div>';
  const irm=dbIrmas(o); const ja=o.rdb&&o.rdb.conf;
  const cab=`<div class="tt-ola">Rancho <b>${esc(R.num)}</b> · ordem(ns) ${irm.map(x=>esc(x.num)).join(', ')} · ${esc(o.linha||'')}</div>`;
  const quem=T.p?`<div class="tt-ola">Conferindo: <b>${esc(T.p.nome)}</b></div>`:`<div class="tt-rcq">${ic('grid',26,2)}<div><b>Passe o seu crachá para conferir</b><span>Câmera ou coletor${ttSemCrachaOk()?' · ou toque em "Estou sem crachá"':''}</span></div></div>`;
  let corpo='';
  if(ja&&!R.refazer) corpo=`<div class="tt-box"><h1>Este rancho já foi conferido</h1><p>${esc(ja.nome||nomeDe(ja.por))} · ${new Date(ja.em).toLocaleDateString('pt-BR')} ${hora(ja.em)}${ja.falta?' · com falta registrada':' · completo'}</p><div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Voltar</button><button class="btn" data-act="tt-rc-refazer">Conferir de novo</button></div></div>`;
  else if(R.modo==='lendo') corpo='<p class="tt-wait">Carregando os itens do rancho…</p>';
  else if(R.modo==='itens') corpo=`<h1 class="tt-h">Confira os itens</h1><div class="sub" style="margin:-6px 0 4px;font-size:16px">Tudo vem marcado como OK. Toque em <b>Diferente</b> no que faltou ou veio a menos.</div>
    <div class="tt-rcl">${R.itens.map((x,i)=>`<div class="tt-rci ${x.ok?'':'dif'}"><div><b>${esc(x.c)}</b><span>${esc(x.d||'')}</span><small>previsto ${fQ(x.q)} ${esc(x.um)}</small></div>
      <div class="tt-rcb"><button data-act="tt-rc-ok" data-i="${i}" aria-pressed="${x.ok}">OK</button><button data-act="tt-rc-dif" data-i="${i}" aria-pressed="${!x.ok}">Diferente</button></div>
      ${x.ok?'':`<label class="tt-rcn">Recebido<input class="txt tt-in" inputmode="decimal" data-rc-q="${i}" value="${esc(String(x.qr))}"> ${esc(x.um)}</label>`}</div>`).join('')}</div>`;
  else corpo=`<h1 class="tt-h">Como chegou o rancho?</h1><div class="sub" style="font-size:16px">Os itens deste rancho não estão no painel. Confirme como chegou.</div>
    <div class="tt-imp" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button class="tt-bt imp ok" data-act="tt-rc-livre" data-v="0" aria-pressed="${!R.falta}"><b>Veio tudo</b></button><button class="tt-bt imp warn" data-act="tt-rc-livre" data-v="1" aria-pressed="${R.falta}"><b>Faltou alguma coisa</b></button></div>`;
  const pode=!(ja&&!R.refazer)&&R.modo!=='lendo';
  return `${cab}${quem}${corpo}${pode?`<label class="tt-lab">Observação ${R.modo==='livre'&&R.falta?'(diga o que faltou) *':'(opcional)'}<textarea class="txt tt-in" id="tt-rc-obs" rows="2" maxlength="300">${esc(R.obs)}</textarea></label>
    ${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button>${!T.p&&ttSemCrachaOk()?'<button class="btn sec" data-act="tt-rc-sem">Estou sem crachá</button>':''}<button class="btn" data-act="tt-rc-salvar" ${T.p&&!T.enviando?'':'disabled'} style="background:var(--ok-ink)">${T.enviando?'Salvando…':'Confirmar conferência'}</button></div>`:''}`; }
{ const _vt=vTotem; vTotem=function(){ const T=S.tt; if(T.fase!=='rancho'&&T.fase!=='rcok') return _vt.apply(this,arguments);
  const L=ttLinhas(); const topo=`<div class="tt-top"><div><b>Conferir rancho</b><span>${L.map(esc).join(' · ')}</span></div><div class="tt-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div>${ttSoTablet()?'':'<button class="tt-x" data-act="tt-sair" title="Sair do modo tablet">✕</button>'}</div>`;
  const corpo=T.fase==='rcok'?`<div class="tt-box ok"><div class="tt-okic">${ic('check',56,2.6)}</div><h1>Rancho ${esc(T.rch.num)} conferido</h1><p>${T.rch.falta?'Com falta registrada: o almoxarifado já vê no diário de bordo.':'Tudo certo. Registrado no diário de bordo.'}</p><p>${esc((T.p&&T.p.nome)||'')}</p><div class="tt-rod"><button class="btn" data-act="tt-voltar">Pronto</button></div></div>`:vTtRancho();
  return `<div class="tt">${topo}${corpo}</div>`; }; }
document.addEventListener('input',ev=>{ const t=ev.target, R=S.tt.rch; if(!R) return; if(t.id==='tt-rc-obs') R.obs=t.value; if(t.dataset&&t.dataset.rcQ!=null){ const x=R.itens[+t.dataset.rcQ]; if(x) x.qr=t.value; } S.tt.ult=Date.now(); });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="tt-rc-"]'); if(!b||b.disabled) return; const T=S.tt, R=T.rch; if(!R) return; const a=b.dataset.act; T.ult=Date.now();
  if(a==='tt-rc-ok'||a==='tt-rc-dif'){ const x=R.itens[+b.dataset.i]; if(!x) return; x.ok=a==='tt-rc-ok'; if(!x.ok&&x.qr===x.q) x.qr=0; if(x.ok) x.qr=x.q; render(); return; }
  if(a==='tt-rc-livre'){ R.falta=b.dataset.v==='1'; render(); return; }
  if(a==='tt-rc-refazer'){ R.refazer=true; render(); return; }
  if(a==='tt-rc-sem'){ const n=prompt('Seu nome:'); if(n&&n.trim().length>1){ T.p={codigo:null,nome:n.trim().slice(0,60),semCracha:true}; ttCamDesliga(); render(); } return; }
  if(a==='tt-rc-salvar'){ if(!T.p||T.enviando) return; const o=ordById(R.oid); if(!o) return; const obs=String(R.obs||'').trim();
    let itens=[], rec=null;
    if(R.modo==='itens'){ for(const x of R.itens){ if(!x.ok){ const q=numIn(String(x.qr)); if(q==null||q<0){ T.msg='Informe quanto chegou de '+x.c+'.'; render(); return; } x.qr=q; } }
      rec=R.itens.map(x=>({c:x.c,q:x.q,qe:null,qr:x.ok?x.q:x.qr}));
      itens=R.itens.map(x=>{ const r0=x.ok?x.q:x.qr, d=x.q-r0; return d>1e-6?{c:x.c,i:x.c+' '+(x.d||''),q:fQ(d)+' '+x.um}:null; }).filter(Boolean); }
    else if(R.falta){ if(obs.length<3){ T.msg='Diga o que faltou na observação.'; render(); return; } itens=[{i:obs,q:''}]; }
    const falta=itens.length>0, agora=new Date().toISOString(), quem=T.p.nome, cr=T.p.codigo||null; T.enviando=true; T.msg=''; render();
    try{ const r=Object.assign({},o.rdb||{}); if(!r.ent) r.ent=Object.assign({em:agora,por:S.uid||null,nome:quem,origem:'tablet'},typeof ttEntrega==='function'&&ttEntrega()?{recebidoPor:quem,entreguePor:(S.nomes[S.uid]||''),origem:'celular'}:{}); if(!r.sep) r.sep={em:agora,por:S.uid||null};
      r.conf={em:agora,por:S.uid||null,falta,itens,obs,nome:quem,cracha:cr,origem:'tablet'}; if(rec) r.conf.rec=rec;
      for(const x of dbIrmas(o)){ if(x===o) continue; const rx=Object.assign({},x.rdb||{}); if(!rx.ent) rx.ent=Object.assign({em:agora,por:S.uid||null,nome:quem,origem:'tablet'},typeof ttEntrega==='function'&&ttEntrega()?{recebidoPor:quem,entreguePor:(S.nomes[S.uid]||''),origem:'celular'}:{}); if(!rx.sep) rx.sep={em:agora,por:S.uid||null}; if(rx.conf&&!R.refazer) continue;
        rx.conf={em:agora,por:S.uid||null,falta:false,itens:[],obs:falta?'Conferido junto com a ordem '+o.num+' (falta registrada nela)':obs,junto:o.num,nome:quem,origem:'tablet'}; await dbSalvar(x,rx,'Rancho '+o.rancho+' conferido junto com a ordem '+o.num+' por '+quem+' (tablet)',o.rancho); }
      const ok=await dbSalvar(o,r,(falta?'Rancho recebido a menos: '+itens.map(x=>x.i+(x.q?' ('+x.q+')':'')).join(', '):'Rancho conferido completo')+' por '+quem+' (tablet)',o.rancho);
      T.enviando=false; if(!ok){ T.msg='Não foi possível salvar. Verifique a internet e tente de novo.'; render(); return; }
      R.falta=falta; if(cr) T.recente[cr]=Date.now()+22000; T.fase='rcok'; T.ult=Date.now(); render(); }
    catch(e){ T.enviando=false; console.warn('[tablet] conferência',e); T.msg='Não foi possível salvar. Verifique a internet e tente de novo.'; render(); }
    return; } });
/* volta sozinho da confirmação */
setInterval(()=>{ const T=S.tt; if(ttAtivo()&&T.fase==='rcok'&&Date.now()-T.ult>8000) ttVoltar(); },700);
document.head.insertAdjacentHTML('beforeend',`<style id="rc-css">.tt-rcq{display:flex;gap:14px;align-items:center;background:var(--teal-wash);color:var(--teal-strong);border-radius:16px;padding:14px 18px}.tt-rcq b{display:block;font-size:20px}.tt-rcq span{font-size:15px}
.tt-rcl{display:flex;flex-direction:column;gap:8px;overflow:auto;max-height:52vh}.tt-rci{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;background:var(--surface);border-radius:14px;padding:12px 14px;border-left:6px solid var(--ok)}
.tt-rci.dif{border-left-color:var(--warn);background:var(--warn-tint)}.tt-rci b{font-size:18px}.tt-rci span{display:block;font-size:15px}.tt-rci small{color:var(--muted);font-size:14px}
.tt-rcb{display:flex;gap:6px}.tt-rcb button{min-width:110px;height:56px;border-radius:12px;border:2px solid var(--line);background:var(--surface);font:inherit;font-size:17px;font-weight:700;cursor:pointer}
.tt-rcb button[aria-pressed="true"]{border-color:var(--teal-strong);background:var(--teal-wash)}.tt-rcn{grid-column:1/-1;display:flex;gap:10px;align-items:center;font-weight:700}.tt-rcn input{max-width:160px}</style>`);
/* ===FIM CONFERÊNCIA RANCHO TABLET=== */
/* ===================== QR E COLETOR EM TUDO (09/10) ===================== */
/* Um leitor só para câmera (QR) e coletor (barras ou QR "digitado"): crachá, folha do rancho, equipamento e linha. */
function lerCodigo(txt){ const s=String(txt||'').trim(); let m;
  if((m=s.match(/[?&#]equip=([^&#\s]+)/i))||(m=s.match(/^EQ-(.+)$/i))){ let id; try{ id=decodeURIComponent(m[1]); }catch(e){ id=m[1]; } const es=(typeof mxEquips==='function'?mxEquips():[])||[];
    const e=es.find(x=>x.id===id)||es.find(x=>String(x.id).toLowerCase()===String(id).toLowerCase()); return {tipo:'equip',id,e,linha:e?e.linha:''}; }
  if((m=s.match(/[?&#]rancho=(\d{4,})/i))||(m=s.toUpperCase().match(/^RA-?(\d{4,})$/))) return {tipo:'rancho',num:m[1]};
  if((m=s.match(/[?&#]chamado=([^&#]+)/i))){ let l; try{ l=decodeURIComponent(m[1].replace(/\+/g,' ')); }catch(e){ l=m[1]; } return {tipo:'linha',linha:l}; }
  if((m=s.toUpperCase().match(/^CH-(.+)$/))){ const l=linhasOrd().find(x=>cbSlug(x)===m[1].replace(/[^A-Z0-9]/g,'')); return {tipo:'linha',linha:l||''}; }
  return null; }
/* painel (coletor): equipamento abre o chamado com a máquina; endereços digitados viram RA-/CH- */
{ const _c=cbLeu; cbLeu=function(cod){ const k=lerCodigo(cod); if(!k) return _c.apply(this,arguments);
  if(S.view==='mantotem'){ S.tt.ult=Date.now(); ttLeu(String(cod)); return; }
  if(k.tipo==='rancho') return _c('RA-'+k.num);
  if(k.tipo==='linha'){ if(!k.linha){ toast('Linha não encontrada.'); return; } return _c('CH-'+cbSlug(k.linha)); }
  if(!k.e){ toast('Equipamento não encontrado no cadastro.'); return; } if(!viewOk('manch')){ toast('Você não possui permissão para acessar este módulo.'); return; }
  manNovo(k.e.linha); Object.assign(S.man.f,{equipId:k.e.id,equip:k.e.nome,origem:'qr-equip'}); S.man.cur=null; go('manch'); toast('Equipamento identificado: '+k.e.nome); }; }
/* tablet: equipamento ou linha antes do crachá (já sai com a máquina escolhida) ou depois (escolhe a máquina) */
{ const _tl=ttLeu; ttLeu=function(txt){ const T=S.tt, k=lerCodigo(txt);
  if(k&&(k.tipo==='equip'||k.tipo==='linha')){
    if(T.fase!=='espera'&&!((T.fase==='maquina'||T.fase==='volta')&&T.p)) return; /* na pergunta "voltou a funcionar?", bipar a máquina = abrir chamado para ela */
    if(k.tipo==='equip'&&!k.e){ ttMsg('Equipamento não encontrado no cadastro.'); return; }
    const linha=k.tipo==='equip'?k.e.linha:k.linha; if(!linha||!ttLinhas().includes(linha)){ ttMsg('Este código é de uma linha que este tablet não atende.'); return; }
    const pre={linha,equipId:k.tipo==='equip'?k.e.id:'',equip:k.tipo==='equip'?k.e.nome:''}; ttBip();
    if(T.fase==='espera'){ Object.assign(T,{fase:'pre',pre,p:null,ult:Date.now(),msg:''}); render(); return; }
    Object.assign(T,{linha:pre.linha,equipId:pre.equipId,equip:pre.equip,fase:'defeito',ult:Date.now()}); ttCamDesliga(); render(); return; }
  if(T.fase==='pre'&&!T.p){ const m=String(txt||'').trim().toUpperCase().match(TT_RE); if(!m) return; const c=crDe(m[1]); if(!c||c.ativo===false){ ttMsg('Crachá não reconhecido.'); return; }
    ttBip(); const pre=T.pre; ttInicia({codigo:c.codigo,nome:c.nome,linha:c.linha,papel:c.papel}); if(c.papel!=='tecnico'){ Object.assign(T,{linha:pre.linha,equipId:pre.equipId,equip:pre.equip,fase:'defeito'}); render(); } return; }
  return _tl.apply(this,arguments); }; }
{ const _cc=crColetor; crColetor=function(cod){ if(S.view==='mantotem'&&S.tt.fase==='pre'&&!S.tt.p){ S.tt.ult=Date.now(); ttLeu('COLAFIX:CRACHA:'+cod); return; } return _cc.apply(this,arguments); }; }
function ttTopo(tit){ const L=ttLinhas(); return `<div class="tt-top"><div><b>${esc(tit)}</b><span>${L.map(esc).join(' · ')}</span></div><div class="tt-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div>${ttSoTablet()?'':'<button class="tt-x" data-act="tt-sair" title="Sair do modo tablet">✕</button>'}</div>`; }
{ const _vt=vTotem; vTotem=function(){ const T=S.tt;
  if(T.fase==='pre'){ const P=T.pre||{}; return `<div class="tt">${ttTopo('Chamar manutenção')}<div class="tt-box"><h1>${esc(P.linha)}${P.equip?' · '+esc(P.equip):''}</h1><p>${P.equip?'Máquina identificada.':'Linha identificada (a máquina você escolhe depois).'}</p>
      <div class="tt-rcq" style="justify-content:center">${ic('grid',26,2)}<div><b>Agora passe o seu crachá</b><span>Câmera ou coletor</span></div></div>${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}
      <div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button>${ttSemCrachaOk()?'<button class="btn sec" data-act="tt-pre-sem">Estou sem crachá</button>':''}</div></div></div>`; }
  let h=_vt.apply(this,arguments); if(T.fase==='maquina') h=h.replace('<h1 class="tt-h">Qual máquina?</h1>','<h1 class="tt-h">Qual máquina?</h1><div class="sub" style="margin:-6px 0 0;font-size:16px">Toque na máquina, ou mostre o QR / bipe o código da etiqueta dela.</div>'); return h; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="tt-pre-sem"]'); if(!b) return; const T=S.tt, P=T.pre; const n=prompt('Seu nome:'); if(!n||n.trim().length<2) return;
  ttInicia({codigo:null,nome:n.trim().slice(0,60),linha:'',papel:'operador',semCracha:true}); Object.assign(T,{linha:P.linha,equipId:P.equipId,equip:P.equip,fase:'defeito'}); render(); });
setInterval(()=>{ const T=S.tt; if(ttAtivo()&&T.fase==='pre'&&Date.now()-T.ult>60000) ttVoltar(); },1000);
/* ===FIM QR E COLETOR=== */
/* ===================== CELULAR DO ALMOX: ENTREGA DE RANCHO (10/10) ===================== */
/* Login próprio (cargo "Celular do almox"): abre direto na tela de entrega, câmera traseira com visor.
   Folha de produção (QR ou nº) → [marcar separado] → crachá de quem recebe → quem recebe toca "Recebi o rancho" (ou confere item a item).
   Grava no diário: entregue na linha, por quem entregou (a conta do celular) e quem recebeu (o crachá). */
MODS.push({id:'almoxcel',nome:'Entrega de rancho',ic:'grid',views:['mantotem']});
{ const _o=ACS_PERFIS.outro; delete ACS_PERFIS.outro; ACS_PERFIS.almoxcel={nome:'Celular do almox (entrega de rancho)',mods:['almoxcel'],locais:[]}; ACS_PERFIS.outro=_o; }
if(typeof EQ_PRONTO_ORD!=='undefined'&&!EQ_PRONTO_ORD.includes('almoxcel')) EQ_PRONTO_ORD.splice(EQ_PRONTO_ORD.indexOf('tablet')+1,0,'almoxcel');
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.almoxcel='Para o celular de quem entrega o rancho: escaneia a folha de produção e o crachá de quem recebe; a pessoa confirma que recebeu.';
if(typeof EQ_MOD!=='undefined'&&!EQ_MOD.almoxcel) EQ_MOD.almoxcel=['grid','Entrega de rancho'];
ACS_MODS.splice(ACS_MODS.findIndex(m=>m[0]==='ajustes'),0,['almoxcel','Entrega de rancho pelo celular']);
if(typeof LEIT_CONHECIDOS!=='undefined'&&!LEIT_CONHECIDOS.includes('almoxcel')) LEIT_CONHECIDOS.push('almoxcel');
function ttEntrega(){ try{ const A=S.acs; if(!A||A.dono) return false; const p=acsP(); return !!p&&(p.mods||[]).includes('almoxcel'); }catch(e){ return false; } }
{ const _tp=ttPodeUsar; ttPodeUsar=function(){ try{ if(ttEntrega()) return true; }catch(e){} return _tp(); }; }
{ const _ts=ttSoTablet; ttSoTablet=function(){ if(ttEntrega()){ const p=acsP(); return (p.mods||[]).every(m=>m==='almoxcel'||m==='tablet'); } return _ts(); }; }
{ const _mv=modsVis; modsVis=function(){ const r=_mv.apply(this,arguments); let tem=false; try{ tem=(acsP().mods||[]).includes('almoxcel'); }catch(e){} return tem?r:r.filter(m=>m.id!=='almoxcel'); }; }
/* leitura no modo entrega: só folha (QR, RA- ou nº); crachá só depois da folha */
{ const _tl=ttLeu; ttLeu=function(txt){ if(!ttEntrega()) return _tl.apply(this,arguments); const T=S.tt, k=lerCodigo(txt), s=String(txt||'').trim().toUpperCase();
  if(k&&k.tipo==='rancho'){ if(T.fase==='espera') ttRancho(k.num); return; }
  if(T.fase==='espera'){ if(TT_RE.test(s)) ttMsg('Escaneie primeiro a folha de produção. O crachá vem depois.'); else if(k) ttMsg('Este código não é de folha de produção.'); else ttMsg('Este QR não é de folha de produção.'); return; }
  return _tl.apply(this,arguments); }; }
const entR={conf:false};
function vEntrega(){ const T=S.tt, nomeEu=(S.uid&&S.nomes[S.uid])||'', topo=`<div class="tt-top"><div><b>Entrega de rancho</b><span>${esc(nomeEu)}</span></div><div class="tt-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div></div>`;
  if(T.fase==='espera') return `<div class="tt tt-cel">${topo}<div class="tt-box"><h1>Escaneie o QR da folha de produção</h1><p>Aponte a câmera para o QR no canto da folha.</p>
      <div class="tt-cman"><input class="txt tt-in" id="tt-rnum" inputmode="numeric" placeholder="ou nº do rancho"><button class="btn" data-act="tt-rnum">Abrir</button></div>${ttCam.erro?`<p class="tt-err">${esc(ttCam.erro)}</p>`:''}${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}</div></div>`;
  if(T.fase==='rcok') return `<div class="tt tt-cel">${topo}<div class="tt-box ok"><div class="tt-okic">${ic('check',56,2.6)}</div><h1>Rancho ${esc(T.rch.num)} entregue</h1><p>Recebido por <b>${esc((T.p&&T.p.nome)||'')}</b>${T.rch.falta?' · com falta registrada':''}.</p><div class="tt-rod"><button class="btn" data-act="tt-voltar">Próximo rancho</button></div></div></div>`;
  if(T.fase!=='rancho') return null;
  const R=T.rch, o=R&&ordById(R.oid); if(!o) return null; if(entR.conf&&T.p) return null; /* conferência item a item: tela do tablet */
  const irm=dbIrmas(o), e=o.rdb||{}, quem=x=>x?(x.nome||nomeDe(x.por)||''):'';
  const est=`<div class="tt-cst">${['sep','ent'].map(k=>`<div class="${e[k]?'ok':''}"><b>${k==='sep'?'Separado':'Entregue'}</b><span>${e[k]?hora(e[k].em)+(quem(e[k])?' · '+esc(quem(e[k])):''):'ainda não'}</span></div>`).join('')}</div>`;
  const cab=`<div class="tt-ola">Rancho <b>${esc(R.num)}</b> · ${irm.map(x=>esc(x.num)).join(', ')} · ${esc([...new Set(irm.map(x=>x.linha))].join(', '))}</div>${est}`;
  let corpo='';
  if(e.ent&&!R.refazer) corpo=`<div class="tt-box"><h1>Este rancho já foi entregue</h1><p>${esc(quem(e.ent))} · ${hora(e.ent.em)}</p><div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Voltar</button><button class="btn sec" data-act="tt-rc-refazer">Entregar de novo</button></div></div>`;
  else if(!T.p) corpo=`${e.sep?'':`<button class="btn sec tt-big" data-act="tt-esep">${ic('check',20,2.4)}Marcar como separado</button>`}
      <div class="tt-rcq">${ic('grid',26,2)}<div><b>Agora escaneie o crachá de quem vai receber</b><span>Câmera ou coletor</span></div></div>${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}<div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button></div>`;
  else { const its=(R.itens||[]); corpo=`<div class="tt-box tt-rec"><p style="margin:0">Entregar para</p><h1>${esc(T.p.nome)}</h1><p>${esc(T.p.linha&&T.p.linha!=='*'?T.p.linha:'')}</p>
      ${its.length?`<div class="tt-ritens">${its.map(x=>`<div><b>${esc(x.c)}</b> ${esc(x.d||'')}<span>${fQ(x.q)} ${esc(x.um)}</span></div>`).join('')}</div>`:''}
      <button class="btn tt-big" data-act="tt-recebi" style="background:var(--ok-ink)" ${T.enviando?'disabled':''}>${T.enviando?'Salvando…':'✅ Recebi o rancho'}</button>
      ${its.length?'<button class="btn sec tt-big" data-act="tt-econf">Conferir item a item</button>':''}${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}
      <div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button></div></div>`; }
  return `<div class="tt tt-cel">${topo}${cab}${corpo}</div>`; }
{ const _vt=vTotem; vTotem=function(){ if(ttEntrega()){ const h=vEntrega(); if(h) return h; } return _vt.apply(this,arguments); }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="tt-rnum"],[data-act="tt-esep"],[data-act="tt-recebi"],[data-act="tt-econf"]'); if(!b||!ttEntrega()) return; const T=S.tt, a=b.dataset.act; T.ult=Date.now();
  if(a==='tt-rnum'){ const n=String((document.getElementById('tt-rnum')||{}).value||'').replace(/\D/g,''); if(n.length<4){ ttMsg('Digite o número do rancho.'); return; } ttRancho(n); return; }
  const o=T.rch&&ordById(T.rch.oid); if(!o) return; const agora=new Date().toISOString(), eu=(S.uid&&S.nomes[S.uid])||'';
  if(a==='tt-esep'){ b.disabled=true; let n=0; for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx.sep) continue; rx.sep={em:agora,por:S.uid||null,origem:'celular'}; if(await dbSalvar(x,rx,'Rancho '+(o.rancho||'')+' separado (celular do almox)',o.rancho)) n++; }
    toast(n?'Rancho '+o.rancho+' separado.':'Não foi possível marcar. Confira a internet.'); render(); return; }
  if(a==='tt-econf'){ entR.conf=true; render(); return; }
  if(a==='tt-recebi'){ if(!T.p||T.enviando) return; T.enviando=true; T.msg=''; render(); let n=0, falhou=false;
    for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx.ent&&!T.rch.refazer) continue; if(!rx.sep) rx.sep={em:agora,por:S.uid||null,origem:'celular'};
      rx.ent={em:agora,por:S.uid||null,nome:T.p.nome,recebidoPor:T.p.nome,cracha:T.p.codigo||null,entreguePor:eu,origem:'celular'};
      if(await dbSalvar(x,rx,'Rancho '+(o.rancho||'')+' entregue na linha por '+eu+' e recebido por '+T.p.nome+(T.p.codigo?' (crachá)':''),o.rancho)) n++; else falhou=true; }
    T.enviando=false; if(!n&&falhou){ T.msg='Não foi possível salvar. Confira a internet e toque de novo.'; render(); return; }
    T.rch.falta=false; if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+15000; T.fase='rcok'; T.ult=Date.now(); render(); return; } });
/* ao voltar para o início, sai da conferência item a item */
{ const _tv=ttVoltar; ttVoltar=function(){ entR.conf=false; return _tv.apply(this,arguments); }; }
/* visor da câmera (traseira) enquanto espera a folha ou o crachá */
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ const on=S.view==='mantotem'&&ttEntrega(); document.body.classList.toggle('tt-ent',on);
    document.body.classList.toggle('tt-mira',on&&(S.tt.fase==='espera'||(S.tt.fase==='rancho'&&!S.tt.p))); }catch(e){} return x; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="almoxcel-css">
body.tt-ent #tt-video{transform:none}
body.tt-ent.tt-mira #tt-video{display:block!important;left:12px;right:12px;bottom:12px;width:auto;height:38vh;border-width:4px}
body.tt-ent.tt-mira .tt-cel{padding-bottom:calc(38vh + 28px)}
.tt-cel{gap:12px}.tt-cel .tt-box h1{font-size:24px}.tt-cel .tt-ola{font-size:17px}
.tt-cman{display:flex;gap:8px;margin-top:14px}.tt-cman input{flex:1}
.tt-cst{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tt-cst div{background:var(--surface);border-radius:12px;padding:10px 12px;border-left:5px solid var(--line)}.tt-cst div.ok{border-left-color:var(--ok)}.tt-cst b{display:block}.tt-cst span{color:var(--muted);font-size:14px}
.tt-big{width:100%;height:64px;font-size:20px;margin-top:10px}.tt-rec h1{font-size:28px;margin:4px 0}
.tt-ritens{max-height:28vh;overflow:auto;text-align:left;margin:10px 0;border-top:1px solid var(--line)}.tt-ritens div{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:15px}
</style>`);

/* Botões de gravar só aparecem para quem pode (cargo "só ver", ajuste por pessoa ou padrão do cargo). O banco já recusa; aqui é para não confundir quem usa. */
const ACX_BOTOES={programar:['.ogcap [data-go="ajustes"]','o-nova-abrir','o-imp-abrir','o-passar','pv-nova','pv-nova-cal','rep-abrir','it-novo','anl-sug','anl-est-rec'],apontar:['md-apt-abrir'],
  rancho:['o-env-alm','o-anexar-rancho','db-mark','db-urg','r-enviado','r-salvar-email','cst-tog','select[data-pri]'],medir:['sm-abrir','abrir-carga','abrir-premix'],
  abrirch:['man-novo','mp-novo','mlt-abrir'],paradas:['parar','ltv-abre'],atender:['mm-assumir'],cadman:['mt-novo','mt-lista','mx-eq-conf','mx-eq-ed','mx-eq-prev','.card.mx-new','.sv-cad']};
{ const sel=x=>/^[.#]|\[/.test(x)?x:`[data-act="${x}"]`;
  const css=Object.keys(ACX_BOTOES).map(k=>ACX_BOTOES[k].map(x=>`body.sem-${k} ${sel(x)}`).join(',')+'{display:none!important}').join('\n')+'\nbody.so-ver #tp-mais,body.so-ver [data-act="tab-on"]{display:none!important}';
  document.head.insertAdjacentHTML('beforeend','<style id="acx-bt">'+css+'</style>');
  let pend=false; const aplica=()=>{ pend=false; let sv=false, d=null; try{ sv=soVer(); d=acxDoc(); }catch(e){}
    Object.keys(ACX_BOTOES).forEach(k=>{ let sem=false; try{ sem=sv||(!!d&&acxAjustada(d)&&!acxPode(k,d)); }catch(e){} document.body.classList.toggle('sem-'+k,sem); });
    document.body.classList.toggle('so-ver',sv);
    document.querySelectorAll('[data-act="mzl-salvar"]').forEach(b=>{ const c=b.closest('section.card'); if(c) c.classList.add('sv-cad'); }); };
  new MutationObserver(()=>{ if(!pend){ pend=true; requestAnimationFrame(aplica); } }).observe(document.body,{childList:true,subtree:true}); }
if(typeof EQ_PRONTO_DESC!=='undefined') EQ_PRONTO_DESC.producao='Vê o Meu dia e a programação. Pode abrir chamado, registrar parada e marcar o rancho; não muda a programação nem aponta.';
/* ===================== CELULAR DO ALMOX: CONFERÊNCIA NA SEPARAÇÃO (13/10) ===================== */
/* Pedido de 13/10: quem separa confere o rancho pelo celular. Crachá de quem confere (antes ou depois da folha)
   → lista com a quantidade que deveria vir e um OK por item → grava rdb.sep com quem conferiu.
   Item sem OK ao concluir = falta (confirma antes). Depois segue a entrega na linha como já era (crachá de quem recebe). */
const cfA={pre:null,em:0};
function cfOrd(){ const T=S.tt, R=T.rch; return R&&ordById(R.oid); }
function cfPrecisa(){ try{ if(!ttEntrega()) return false; const T=S.tt, R=T.rch, o=cfOrd(); if(T.fase!=='rancho'||!o||T.p) return false; if(R.cfSalvo) return false; return dbIrmas(o).some(x=>!(x.rdb&&x.rdb.sep)); }catch(e){ return false; } }
function cfConferindo(){ const R=S.tt.rch; return cfPrecisa()&&!!(R&&R.cfp); }
function cfCracha(txt){ const m=String(txt||'').trim().toUpperCase().match(TT_RE); if(!m) return null; const c=crDe(m[1]); return c&&c.ativo!==false?{codigo:c.codigo,nome:c.nome}:false; }
function cfComeca(p){ const R=S.tt.rch; R.cfp=p; R.ck={}; R.cfConf=false; ttBip(); ttCamDesliga(); S.tt.ult=Date.now(); render(); }
/* leitura: crachá de quem confere (antes da folha fica guardado 2 min; depois da folha abre a lista) */
{ const _tl=ttLeu; ttLeu=function(txt){ if(!ttEntrega()) return _tl.apply(this,arguments); const T=S.tt, c=cfCracha(txt);
  if(c===false){ ttMsg('Crachá não reconhecido.'); return; }
  if(c&&T.fase==='espera'){ cfA.pre=c; cfA.em=Date.now(); ttBip(); render(); return; }
  if(c&&cfPrecisa()){ if(T.rch.cfp) return; cfComeca(c); return; }
  return _tl.apply(this,arguments); }; }
{ const _tr=ttRancho; ttRancho=function(){ const r=_tr.apply(this,arguments); try{ if(cfA.pre&&Date.now()-cfA.em<120000&&cfPrecisa()){ const p=cfA.pre; cfA.pre=null; cfComeca(p); } }catch(e){} return r; }; }
{ const _tv=ttVoltar; ttVoltar=function(){ if(S.tt.fase!=='espera') cfA.pre=null; return _tv.apply(this,arguments); }; }
{ const _cl=ttCamLiga; ttCamLiga=function(){ if(cfConferindo()) return; return _cl.apply(this,arguments); }; }
setInterval(()=>{ if(cfA.pre&&Date.now()-cfA.em>120000){ cfA.pre=null; if(ttAtivo()&&S.tt.fase==='espera') render(); } },5000);
function vCfTopo(){ const nomeEu=(S.uid&&S.nomes[S.uid])||''; return `<div class="tt-top"><div><b>Conferir rancho</b><span>${esc(nomeEu)}</span></div><div class="tt-clk num" data-rtv-clk>${pad(new Date().getHours())}:${pad(new Date().getMinutes())}</div></div>`; }
function vConferencia(){ const T=S.tt, R=T.rch, o=cfOrd(), irm=dbIrmas(o);
  const cab=`<div class="tt-ola">Rancho <b>${esc(R.num)}</b> · ${irm.map(x=>esc(x.num)).join(', ')} · ${esc([...new Set(irm.map(x=>x.linha))].join(', '))}</div>`;
  if(!R.cfp) return `<div class="tt tt-cel">${vCfTopo()}${cab}<div class="tt-rcq">${ic('grid',26,2)}<div><b>Escaneie o crachá de quem vai conferir</b><span>Câmera ou coletor</span></div></div>${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}
    <div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button>${ttSemCrachaOk()?'<button class="btn sec" data-act="cf-sem">Estou sem crachá</button>':''}</div></div>`;
  const quem=`<div class="tt-ola">Conferindo: <b>${esc(R.cfp.nome)}</b></div>`;
  if(R.modo==='lendo'||!R.itens) return `<div class="tt tt-cel">${vCfTopo()}${cab}${quem}<p class="tt-wait">Carregando os itens do rancho…</p><div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button></div></div>`;
  const its=R.itens, n=its.filter((x,i)=>R.ck[i]).length, falt=its.length-n;
  const lista=its.length?`<div class="cf-l">${its.map((x,i)=>`<button class="cf-i ${R.ck[i]?'on':''}" data-act="cf-ok" data-i="${i}" aria-pressed="${!!R.ck[i]}"><span class="cf-t"><b>${esc(x.c)}</b><small>${esc(x.d||'')}</small></span><span class="cf-q num">${fQ(x.q)}<small>${esc(x.um)}</small></span><span class="cf-ok">${R.ck[i]?ic('check',22,3):''}OK</span></button>`).join('')}</div>`
    :`<div class="tt-box"><p>Os itens deste rancho não estão no painel. Confira pelo papel e confirme.</p></div>`;
  const conf=R.cfConf&&falt?`<div class="cf-av"><b>${falt} ${falt===1?'item ficou':'itens ficaram'} sem OK.</b><span>Vão ficar registrados como faltando.</span><div class="tt-rod"><button class="btn sec" data-act="cf-nao">Voltar e conferir</button><button class="btn" data-act="cf-salvar" data-f="1" style="background:var(--warn-ink,#8a5a00)" ${T.enviando?'disabled':''}>${T.enviando?'Salvando…':'Registrar com falta'}</button></div></div>`:'';
  return `<div class="tt tt-cel">${vCfTopo()}${cab}${quem}${its.length?`<div class="cf-n num">${n} de ${its.length} conferidos</div>`:''}${lista}${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}
    ${conf||`<div class="tt-rod"><button class="btn sec" data-act="tt-voltar">Cancelar</button><button class="btn" data-act="cf-salvar" style="background:var(--ok-ink)" ${T.enviando?'disabled':''}>${T.enviando?'Salvando…':'Concluir conferência'}</button></div>`}</div>`; }
{ const _ve=vEntrega; vEntrega=function(){ if(cfPrecisa()) return vConferencia(); const h=_ve.apply(this,arguments);
  if(h&&S.tt.fase==='espera'&&cfA.pre) return h.replace('<h1>Escaneie o QR da folha de produção</h1>',`<div class="tt-ola" style="margin-bottom:8px">Conferente: <b>${esc(cfA.pre.nome)}</b></div><h1>Agora escaneie o QR da folha de produção</h1>`);
  if(h&&S.tt.fase==='espera') return h.replace('<p>Aponte a câmera para o QR no canto da folha.</p>','<p>Aponte a câmera para o QR no canto da folha. Pode passar o crachá de quem vai conferir antes ou depois.</p>');
  return h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="cf-"]'); if(!b||b.disabled||!ttEntrega()) return; const T=S.tt, R=T.rch, a=b.dataset.act; if(!R) return; T.ult=Date.now();
  if(a==='cf-ok'){ const i=+b.dataset.i; R.ck[i]=!R.ck[i]; R.cfConf=false; render(); return; }
  if(a==='cf-nao'){ R.cfConf=false; render(); return; }
  if(a==='cf-sem'){ const n=prompt('Seu nome:'); if(n&&n.trim().length>1) cfComeca({codigo:null,nome:n.trim().slice(0,60),semCracha:true}); return; }
  if(a==='cf-salvar'){ if(!R.cfp||T.enviando) return; const o=cfOrd(); if(!o) return; const its=R.itens||[];
    const sem=its.filter((x,i)=>!R.ck[i]); if(sem.length&&b.dataset.f!=='1'){ R.cfConf=true; render(); return; }
    const agora=new Date().toISOString(), quem=R.cfp.nome, falta=sem.length>0;
    const itens=sem.map(x=>({c:x.c,i:x.c+' '+(x.d||''),q:fQ(x.q)+' '+(x.um||'')}));
    const rec=its.map((x,i)=>({c:x.c,q:+x.q||0,ok:!!R.ck[i]}));
    T.enviando=true; T.msg=''; render(); let n=0, falhou=false;
    for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx.sep) continue;
      rx.sep={em:agora,por:S.uid||null,origem:'celular',conferido:true,nome:quem,cracha:R.cfp.codigo||null,falta,itens};
      if(x===o) rx.sep.rec=rec; else if(x!==o) rx.sep.junto=o.num;
      const txt='Rancho '+(o.rancho||'')+' separado e conferido por '+quem+(R.cfp.codigo?' (crachá)':'')+(falta?' · faltando: '+itens.map(y=>y.c+' ('+y.q+')').join(', '):' · completo')+' (celular do almox)';
      if(await dbSalvar(x,rx,txt,o.rancho)) n++; else falhou=true; }
    T.enviando=false; if(!n&&falhou){ T.msg='Não foi possível salvar. Confira a internet e toque de novo.'; render(); return; }
    R.cfSalvo=true; R.cfFalta=falta; toast(falta?'Separação salva com falta. Agora o crachá de quem vai receber.':'Rancho separado. Agora o crachá de quem vai receber.'); render(); return; } });
document.head.insertAdjacentHTML('beforeend',`<style id="cf-css">
.cf-n{font-weight:700;color:var(--muted);font-size:15px}
.cf-l{display:flex;flex-direction:column;gap:8px}
.cf-i{display:grid;grid-template-columns:minmax(0,1fr) auto 86px;gap:10px;align-items:center;width:100%;text-align:left;background:var(--surface);border:2px solid var(--line);border-left:6px solid var(--line);border-radius:14px;padding:12px;font:inherit;color:inherit;cursor:pointer;min-height:72px}
.cf-i.on{border-color:var(--ok);background:var(--ok-tint,#e7f3ec)}
.cf-t{min-width:0}.cf-t b{display:block;font-size:17px}.cf-t small{display:block;color:var(--muted);font-size:14px;overflow-wrap:anywhere}
.cf-q{font-size:24px;font-weight:800;text-align:right;line-height:1.05}.cf-q small{display:block;font-size:13px;font-weight:600;color:var(--muted)}
.cf-ok{display:flex;align-items:center;justify-content:center;gap:4px;height:52px;border-radius:12px;border:2px solid var(--line);font-weight:800;font-size:18px}
.cf-i.on .cf-ok{background:var(--ok);border-color:var(--ok);color:#fff}
.cf-av{background:var(--warn-tint);border-radius:14px;padding:14px}.cf-av b{display:block;font-size:18px}.cf-av span{display:block;margin-bottom:6px}
</style>`);
/* ===FIM CONFERÊNCIA NA SEPARAÇÃO=== */
/* ===================== CÂMERA DO CELULAR DO ALMOX: SITUAÇÃO E BOTÃO (13/10) ===================== */
/* No Android a câmera às vezes não liga sozinha (pedido de permissão que não apareceu, app instalado como atalho).
   Mostra a situação ("Ligando a câmera…", erro) e um botão "Ligar câmera" que liga com o toque da pessoa. */
const camE={ini:0};
{ const _cl=ttCamLiga; ttCamLiga=function(){ if(!ttCam.stream&&!ttCam.lendo){ camE.ini=Date.now(); setTimeout(()=>{ if(ttAtivo()) rerenderTt(); },8500); } return _cl.apply(this,arguments); }; }
function camSit(){ if(ttCam.stream) return ''; const preso=ttCam.lendo&&Date.now()-camE.ini>8000;
  const txt=S.tt.cam==='erro'&&ttCam.erro?ttCam.erro:preso?'A câmera não ligou. Toque em "Ligar câmera" e, se o celular perguntar, toque em Permitir.':ttCam.lendo?'Ligando a câmera…':'A câmera está desligada.';
  return `<div class="cam-sit"><p class="${S.tt.cam==='erro'||preso?'tt-err':'sub'}">${esc(txt)}</p><button class="btn tt-big" data-act="cam-liga">${ic('tela',20,2.2)}Ligar câmera</button></div>`; }
{ const _ve=vEntrega; vEntrega=function(){ const h=_ve.apply(this,arguments); if(!h) return h; const T=S.tt, precisa=T.fase==='espera'||(T.fase==='rancho'&&!T.p&&!(T.rch&&T.rch.cfp&&cfPrecisa()));
  if(!precisa||ttCam.stream) return h;
  let x=h; if(ttCam.erro) x=x.replace(`<p class="tt-err">${esc(ttCam.erro)}</p>`,''); const i=x.lastIndexOf('</div>'); return x.slice(0,i)+camSit()+x.slice(i); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cam-liga"]'); if(!b) return; S.tt.ult=Date.now();
  if(ttCam.lendo&&Date.now()-camE.ini<8000) return; ttCam.lendo=false; S.tt.cam=''; ttCam.erro=''; ttCamDesliga(); ttCamLiga().then(()=>render()); render(); });
setInterval(()=>{ try{ if(ttAtivo()&&ttEntrega()&&!ttCam.stream&&document.querySelector('.cam-sit')){ const p=document.querySelector('.cam-sit p'); const want=ttCam.lendo&&Date.now()-camE.ini>8000; if(want&&p&&!p.classList.contains('tt-err')) rerenderTt(); } }catch(e){} },1500);
document.head.insertAdjacentHTML('beforeend','<style id="cam-css">.cam-sit{margin-top:6px}.cam-sit p{margin:6px 0 0;font-size:15px}</style>');
/* ===FIM CÂMERA DO CELULAR=== */
/* ===================== CELULAR DO ALMOX: SEM CRACHÁ, SÓ O NOME (13/10) ===================== */
/* Quem confere e quem recebe podem seguir sem crachá: digita o nome (fica registrado como "sem crachá"). */
const scA={k:'',erro:''};
{ const _ok=ttSemCrachaOk; ttSemCrachaOk=function(){ try{ if(ttEntrega()) return false; }catch(e){} return _ok.apply(this,arguments); }; } /* no celular usa o campo abaixo, não o prompt */
function scForm(k,rot){ if(scA.k!==k) return `<button class="btn sec tt-big" data-act="sc-abre" data-k="${k}">Estou sem crachá</button>`;
  return `<div class="sc-f"><label class="tt-lab">${esc(rot)}<input class="txt tt-in" id="sc-nome" autocomplete="off" maxlength="60" placeholder="Nome e sobrenome"></label>${scA.erro?`<p class="tt-err">${esc(scA.erro)}</p>`:''}
    <div class="tt-rod"><button class="btn sec" data-act="sc-x">Voltar</button><button class="btn" data-act="sc-ok" data-k="${k}">Continuar</button></div></div>`; }
{ const _ve=vEntrega; vEntrega=function(){ const h=_ve.apply(this,arguments); if(!h) return h; const T=S.tt;
  if(T.fase==='rancho'&&!T.p&&T.rch&&cfPrecisa()&&!T.rch.cfp){ const i=h.lastIndexOf('<div class="tt-rod">'); return i<0?h:h.slice(0,i)+scForm('cf','Nome de quem vai conferir')+h.slice(i); }
  if(T.fase==='rancho'&&!T.p&&T.rch&&!cfPrecisa()&&/crachá de quem vai receber/.test(h)){ const i=h.lastIndexOf('<div class="tt-rod">'); return i<0?h:h.slice(0,i)+scForm('rec','Nome de quem vai receber')+h.slice(i); }
  return h; }; }
{ const _tv=ttVoltar; ttVoltar=function(){ scA.k=''; scA.erro=''; return _tv.apply(this,arguments); }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="sc-"]'); if(!b||!ttEntrega()) return; const T=S.tt, a=b.dataset.act; T.ult=Date.now();
  if(a==='sc-abre'){ scA.k=b.dataset.k; scA.erro=''; ttCamDesliga(); render(); setTimeout(()=>{ const i=document.getElementById('sc-nome'); if(i) i.focus(); },60); return; }
  if(a==='sc-x'){ scA.k=''; scA.erro=''; render(); return; }
  if(a==='sc-ok'){ const n=String((document.getElementById('sc-nome')||{}).value||'').trim().replace(/\s+/g,' ');
    if(n.length<3){ scA.erro='Escreva o nome da pessoa.'; render(); setTimeout(()=>{ const i=document.getElementById('sc-nome'); if(i) i.focus(); },60); return; }
    const p={codigo:null,nome:n.slice(0,60),semCracha:true}; scA.k=''; scA.erro='';
    if(b.dataset.k==='cf'){ if(T.rch&&cfPrecisa()) cfComeca(p); return; }
    T.p=Object.assign({linha:''},p); ttCamDesliga(); render(); return; } });
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='sc-nome'){ const b=document.querySelector('[data-act="sc-ok"]'); if(b) b.click(); } });
/* a câmera não liga enquanto a pessoa digita o nome */
{ const _cl=ttCamLiga; ttCamLiga=function(){ if(scA.k&&ttEntrega()) return; return _cl.apply(this,arguments); }; }
document.head.insertAdjacentHTML('beforeend','<style id="sc-css">.sc-f{background:var(--surface);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}.sc-f .tt-lab{font-weight:700}</style>');
/* ===FIM SEM CRACHÁ=== */
/* ===================== ENTREGA EM PARTES (13/10) ===================== */
/* No celular do almox, depois do crachá de quem recebe: "Entregar só uma parte" → marca os itens que foram (ex.: só os paletes).
   Grava rdb.entp [{em,por,itens:[códigos],recebidoPor,cracha,entreguePor}] em todas as ordens do rancho. O rancho continua
   "falta entregar" (sem rdb.ent) até sair o resto; quando todos os itens já foram, vira entregue (rdb.ent, parcial:true). */
const epA={on:false,sel:{}};
function epFeitos(o){ const m={}; ((o&&o.rdb&&o.rdb.entp)||[]).forEach(p=>(p.itens||[]).forEach(c=>{ if(!m[c]) m[c]=p; })); return m; }
function epTxt(o){ const ps=(o&&o.rdb&&o.rdb.entp)||[]; if(!ps.length||(o.rdb&&o.rdb.ent)) return ''; const n=new Set(ps.flatMap(p=>p.itens||[])).size;
  return `<div class="dbfsep" style="background:var(--warn-tint)">◐ Entregue em parte: ${n} ${n===1?'item':'itens'} · ${esc(ps.map(p=>hora(p.em)+' '+(p.recebidoPor||'')).join(' · '))} · <b>falta o resto</b></div>`; }
function epCel(o,pode,late){ const ps=(o&&o.rdb&&o.rdb.entp)||[]; if(!ps.length||(o.rdb&&o.rdb.ent)) return ''; if(pode===undefined) return true;
  const n=new Set(ps.flatMap(p=>p.itens||[])).size, ult=ps[ps.length-1];
  return `<td class="dbc ${late?'lt':''}" title="Entregue em parte"><b class="num">${hora(ult.em)}</b><small>em parte (${n} ${n===1?'item':'itens'})</small><small>${esc(ult.recebidoPor||'')}</small>${pode?`<button class="dbb ${late?'lt':''}" data-act="db-mark" data-id="${esc(o._id)}" data-k="ent">Entregue tudo</button>`:''}</td>`; }
{ const _ve=vEntrega; vEntrega=function(){ const h=_ve.apply(this,arguments); if(!h) return h; const T=S.tt, R=T.rch, o=R&&ordById(R.oid);
  if(T.fase!=='rancho'||!T.p||!o||!R.itens||!R.itens.length||(o.rdb&&o.rdb.ent&&!R.refazer)) { return h; }
  const feitos=epFeitos(o);
  if(!epA.on){ const ja=Object.keys(feitos).length; const info=ja?`<p class="sub" style="margin:6px 0 0">Já foram em parte: ${R.itens.filter(x=>feitos[x.c]).map(x=>esc(x.c)).join(', ')}</p>`:'';
    return h.replace('<button class="btn sec tt-big" data-act="tt-econf">','<button class="btn sec tt-big" data-act="ep-abre">Entregar só uma parte</button>'+info+'<button class="btn sec tt-big" data-act="tt-econf">'); }
  const its=R.itens.map((x,i)=>{ const f=feitos[x.c]; return `<button class="cf-i ${f||epA.sel[i]?'on':''}" data-act="ep-it" data-i="${i}" ${f?'disabled':''}><span class="cf-t"><b>${esc(x.c)}</b><small>${esc(x.d||'')}${f?' · já entregue '+hora(f.em):''}</small></span><span class="cf-q num">${fQ(x.q)}<small>${esc(x.um)}</small></span><span class="cf-ok">${f||epA.sel[i]?ic('check',22,3):''}Foi</span></button>`; }).join('');
  const n=Object.values(epA.sel).filter(Boolean).length;
  const corpo=`<div class="tt-box tt-rec" style="text-align:left"><p style="margin:0">Entregar para <b>${esc(T.p.nome)}</b></p><h1 style="font-size:22px">O que foi entregue agora?</h1><div class="cf-l">${its}</div>${T.msg?`<p class="tt-err">${esc(T.msg)}</p>`:''}
    <button class="btn tt-big" data-act="ep-salvar" style="background:var(--ok-ink)" ${n&&!T.enviando?'':'disabled'}>${T.enviando?'Salvando…':'Entregar '+n+' '+(n===1?'item':'itens')}</button><div class="tt-rod"><button class="btn sec" data-act="ep-x">Voltar</button></div></div>`;
  const i=h.indexOf('<div class="tt-box tt-rec">'); return i<0?h:h.slice(0,i)+corpo+'</div>'; }; }
{ const _tv=ttVoltar; ttVoltar=function(){ epA.on=false; epA.sel={}; return _tv.apply(this,arguments); }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="ep-"]'); if(!b||b.disabled||!ttEntrega()) return; const T=S.tt, R=T.rch, a=b.dataset.act; if(!R) return; T.ult=Date.now();
  if(a==='ep-abre'){ epA.on=true; epA.sel={}; render(); return; }
  if(a==='ep-x'){ epA.on=false; epA.sel={}; render(); return; }
  if(a==='ep-it'){ const i=+b.dataset.i; epA.sel[i]=!epA.sel[i]; render(); return; }
  if(a==='ep-salvar'){ const o=ordById(R.oid); if(!o||!T.p||T.enviando) return; const feitos=epFeitos(o);
    const novos=R.itens.filter((x,i)=>epA.sel[i]&&!feitos[x.c]).map(x=>x.c); if(!novos.length) return;
    const tudo=R.itens.every(x=>feitos[x.c]||novos.includes(x.c)); const agora=new Date().toISOString(), eu=(S.uid&&S.nomes[S.uid])||'';
    const parte={em:agora,por:S.uid||null,itens:novos,recebidoPor:T.p.nome,cracha:T.p.codigo||null,entreguePor:eu,origem:'celular'};
    T.enviando=true; T.msg=''; render(); let n=0, falhou=false;
    for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx.ent&&!R.refazer) continue; if(!rx.sep) rx.sep={em:agora,por:S.uid||null,origem:'celular'};
      rx.entp=[...(rx.entp||[]),parte];
      if(tudo) rx.ent={em:agora,por:S.uid||null,nome:T.p.nome,recebidoPor:T.p.nome,cracha:T.p.codigo||null,entreguePor:eu,origem:'celular',parcial:true};
      const txt='Rancho '+(o.rancho||'')+(tudo?' entregue (última parte: ':' entregue em parte (')+novos.join(', ')+') por '+eu+', recebido por '+T.p.nome;
      if(await dbSalvar(x,rx,txt,o.rancho)) n++; else falhou=true; }
    T.enviando=false; if(!n&&falhou){ T.msg='Não foi possível salvar. Confira a internet e toque de novo.'; render(); return; }
    epA.on=false; epA.sel={}; if(tudo){ T.rch.falta=false; T.fase='rcok'; T.ult=Date.now(); render(); return; }
    toast('Entrega em parte registrada. O rancho continua na fila até sair o resto.'); ttVoltar(); return; } });
/* ===FIM ENTREGA EM PARTES=== */
{ const _ve=vEntrega; vEntrega=function(){ const h=_ve.apply(this,arguments); if(!h) return h; const R=S.tt.rch, o=R&&ordById(R.oid); const ps=(o&&o.rdb&&o.rdb.entp)||[];
  if(!ps.length||(o.rdb&&o.rdb.ent)) return h; const n=new Set(ps.flatMap(p=>p.itens||[])).size;
  return h.replace('<div class=""><b>Entregue</b><span>ainda não</span></div>',`<div class="" style="border-left-color:var(--warn)"><b>Entregue</b><span>em parte (${n} ${n===1?'item':'itens'})</span></div>`); }; }
/* ===================== CELULAR DO ALMOX SEM INTERNET (13/10) ===================== */
/* O banco guarda no próprio celular (persistência do Firestore) e envia sozinho quando a internet volta,
   mesmo que o app seja fechado. Aqui o celular não fica preso em "Salvando…": sem internet (ou sem resposta em 6 s)
   a gravação conta como guardada no celular, e o topo avisa quantas ainda faltam enviar. */
const offA={pend:0};
{ const _ou=ordUpd; ordUpd=async function(id,u,msg){ if(!(typeof ttEntrega==='function'&&ttEntrega())||!S.db) return _ou.apply(this,arguments);
  let p; try{ p=S.db.doc('ordens/'+id).update(u); }catch(e){ erro(e); return false; }
  offA.pend++; const fim=()=>{ offA.pend=Math.max(0,offA.pend-1); if(ttAtivo()) rerenderTt(); };
  p.then(fim,e=>{ fim(); console.warn('[almox] gravação',e); toast('Uma gravação foi recusada pelo banco. Confira o rancho no diário.'); });
  const r=await Promise.race([p.then(()=>'ok',()=>'erro'),new Promise(res=>setTimeout(()=>res('fila'),navigator.onLine===false?150:6000))]);
  if(r==='erro') return false; if(r==='fila') toast('Sem internet: guardado no celular. Vai ser enviado quando a internet voltar.'); else if(msg) toast(msg);
  return true; }; }
{ const _ve=vEntrega; vEntrega=function(){ const h=_ve.apply(this,arguments); if(!h) return h; const sem=navigator.onLine===false;
  if(!sem&&!offA.pend) return h;
  const av=`<div class="off-av">${sem?'<b>Sem internet.</b> ':''}${offA.pend?`${offA.pend} ${offA.pend===1?'registro guardado':'registros guardados'} no celular, ${sem?'vão ser enviados quando a internet voltar':'enviando…'}.`:'Pode continuar: o que for registrado fica guardado no celular e é enviado depois.'}</div>`;
  const i=h.indexOf('</div></div>',h.indexOf('tt-top')); return i<0?h:h.slice(0,i+12)+av+h.slice(i+12); }; }
['online','offline'].forEach(t=>window.addEventListener(t,()=>{ try{ if(ttAtivo()) rerenderTt(); }catch(e){} }));
document.head.insertAdjacentHTML('beforeend','<style id="off-css">.off-av{background:var(--warn-tint);border-left:6px solid var(--warn);border-radius:12px;padding:10px 14px;font-size:15px}</style>');
/* ===FIM SEM INTERNET=== */
/* ===================== ETIQUETA DO CRACHÁ (14/10): imagem PNG ou PDF no tamanho da etiquetadora ===================== */
/* A etiquetadora térmica imprime pixel por pixel: o desenho é feito já na resolução dela (203/300 dpi), só preto e branco
   (sem cinza do antisserrilhado, que sai apagado/borrado), com cada quadradinho do QR num número inteiro de pontos.
   O PNG leva a resolução gravada (pHYs) para o programa da etiquetadora abrir no tamanho certo. Configuração lembrada no aparelho. */
const ETQ_PADRAO={w:38,h:54,dpi:203,fmt:'png',txt:true,barras:true}; /* Zebra ZD220 da Colafix (203 dpi); modelo aprovado em 14/10: em pé, QR em cima, nome, linha, barras e o código */
function etqCfg(){ let o={}; try{ o=JSON.parse(localStorage.getItem('colafix.etq3')||'{}')||{}; }catch(e){} return Object.assign({},ETQ_PADRAO,o); }
function etqSalva(c){ try{ localStorage.setItem('colafix.etq3',JSON.stringify(c)); }catch(e){} }
S.cr.etq=null; /* {ids:[...]} quando a janela da etiqueta está aberta */
function etqCanvas(c,cfg){ const px=mm=>Math.round(mm/25.4*cfg.dpi), W=Math.max(40,px(cfg.w)), H=Math.max(40,px(cfg.h)), mg=px(1.5);
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'); g.imageSmoothingEnabled=false; g.fillStyle='#fff'; g.fillRect(0,0,W,H); g.fillStyle='#000';
  const q=qrcode(0,'M'); q.addData(crQrTexto(c.codigo)); q.make(); const n=q.getModuleCount(), qz=2; /* + a margem da etiqueta: área branca de 4 módulos ou mais */
  const deitada=W>=H*1.15, temTxt=!!cfg.txt, temBar=!!cfg.barras;
  const lado=deitada?(temTxt||temBar?Math.min(H-2*mg,Math.round(W*0.55)):Math.min(W,H)-2*mg):Math.min(W-2*mg,Math.round((H-2*mg)*(temTxt||temBar?0.62:1)));
  const mod=Math.max(1,Math.floor(lado/(n+2*qz))), qs=mod*(n+2*qz);
  const qx=deitada?(temTxt||temBar?mg:Math.round((W-qs)/2)):Math.round((W-qs)/2), qy=deitada?Math.round((H-qs)/2):mg;
  for(let r=0;r<n;r++) for(let k=0;k<n;k++) if(q.isDark(r,k)) g.fillRect(qx+(qz+k)*mod,qy+(qz+r)*mod,mod,mod);
  /* área do texto */
  const tx=deitada?qx+qs+mg:mg, ty=deitada?mg:qy+qs, tw=deitada?W-tx-mg:W-2*mg, th=deitada?H-2*mg:H-ty-mg; let y=ty;
  const fit=(t,peso,max)=>{ let s=max; g.font=`${peso} ${s}px Arial, Helvetica, sans-serif`; while(s>8&&g.measureText(t).width>tw){ s--; g.font=`${peso} ${s}px Arial, Helvetica, sans-serif`; } return s; };
  const al=deitada?'left':'center', xT=deitada?tx:W/2; g.textAlign=al; g.textBaseline='top';
  const ctH=temBar?px(3.2):0, barH=temBar?Math.max(px(5),Math.round((th-ctH)*(temTxt?0.42:0.8))):0;
  if(temTxt&&th>10){ const nm=String(c.nome||'').trim(), ln=c.papel==='tecnico'?'Manutenção':(c.linha&&c.linha!=='*'?c.linha:'Todas as linhas');
    const s1=fit(nm,'bold',Math.round(Math.min(px(deitada?6.5:3.6),(th-barH-ctH)*0.5))); g.fillText(nm,xT,y); y+=Math.round(s1*1.18);
    const s2=fit(ln,'bold',Math.round(s1*0.78)); if(y+s2<=ty+th-barH-ctH){ g.fillText(ln,xT,y); y+=Math.round(s2*1.3); } }
  if(temBar&&barH){ const L=c128Larg(crBarras(c.codigo)), mods=[...L].reduce((a,x)=>a+(+x),0)+20, m=Math.max(1,Math.floor(tw/mods)), bw=m*mods, bx=deitada?tx:Math.round((W-bw)/2);
    const by=ty+th-barH-ctH; let p=bx+10*m, bar=true; for(const ch of L){ const w=+ch*m; if(bar) g.fillRect(p,by,w,barH); p+=w; bar=!bar; }
    const ct=crBarras(c.codigo); fit(ct,'bold',Math.round(ctH*0.85)); g.textAlign=deitada?'left':'center'; g.fillText(ct,deitada?bx+10*m:W/2,by+barH+Math.round(ctH*0.12)); }
  /* só preto e branco: o cinza do texto vira preto ou branco */
  const im=g.getImageData(0,0,W,H), d=im.data; for(let i=0;i<d.length;i+=4){ const v=(d[i]+d[i+1]+d[i+2])/3<150?0:255; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; } g.putImageData(im,0,0);
  return cv; }
/* grava a resolução (pontos por metro) no PNG */
function etqPngDpi(bytes,dpi){ const ppm=Math.round(dpi/0.0254); const crcT=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
  const crc=b=>{ let c=0xFFFFFFFF; for(const x of b) c=crcT[(c^x)&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  const ch=new Uint8Array(21), dv=new DataView(ch.buffer); dv.setUint32(0,9); ch.set([112,72,89,115],4); dv.setUint32(8,ppm); dv.setUint32(12,ppm); ch[16]=1; dv.setUint32(17,crc(ch.subarray(4,17)));
  const out=new Uint8Array(bytes.length+21); out.set(bytes.subarray(0,33)); out.set(ch,33); out.set(bytes.subarray(33),54); return out; }
function etqNome(c){ return String(c.nome||'cracha').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\W+/g,'_'); }
async function etqBaixar(cs,cfg){ const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; } if(!cs.length){ toast('Nenhum crachá.'); return; }
  try{
    if(cfg.fmt==='pdf'){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; }
      const pdf=new window.jspdf.jsPDF({orientation:cfg.w>=cfg.h?'l':'p',unit:'mm',format:[cfg.w,cfg.h]});
      cs.forEach((c,i)=>{ if(i) pdf.addPage([cfg.w,cfg.h],cfg.w>=cfg.h?'l':'p'); pdf.addImage(etqCanvas(c,cfg).toDataURL('image/png'),'PNG',0,0,cfg.w,cfg.h,undefined,'NONE'); });
      await dl.save({filename:cs.length===1?'Etiqueta_'+etqNome(cs[0])+'.pdf':'Etiquetas_crachas.pdf',data:pdf.output('blob')});
      toast('PDF com '+cs.length+' etiqueta(s) de '+cfg.w+' × '+cfg.h+' mm, uma por página. Imprima em 100% (tamanho real).'); }
    else { for(let i=0;i<cs.length;i++){ const c=cs[i]; const blob=await new Promise(r=>etqCanvas(c,cfg).toBlob(r,'image/png'));
        const by=etqPngDpi(new Uint8Array(await blob.arrayBuffer()),cfg.dpi);
        await dl.save({filename:'Etiqueta_'+etqNome(c)+'.png',data:new Blob([by],{type:'image/png'})}); if(i<cs.length-1) await new Promise(r=>setTimeout(r,450)); }
      toast(cs.length===1?'Imagem baixada ('+cfg.w+' × '+cfg.h+' mm, '+cfg.dpi+' dpi).':cs.length+' imagens baixadas, uma por crachá. Se o navegador perguntar, permita vários downloads.'); }
  }catch(e){ if(!e||e.code!=='declined'){ console.warn('[etiqueta]',e); toast('Não foi possível gerar a etiqueta. Tente de novo.'); } } }
function etqJanela(){ const E=S.cr.etq; if(!E) return ''; const cfg=etqCfg(), cs=E.ids.map(crDe).filter(Boolean); if(!cs.length) return '';
  let prev=''; try{ prev=etqCanvas(cs[0],cfg).toDataURL('image/png'); }catch(e){}
  const tam=[[38,54],[40,60],[50,30],[60,40],[100,50],[40,25]];
  const seg=(k,ops)=>`<div class="seg">${ops.map(([v,l])=>`<button data-act="etq-set" data-k="${k}" data-v="${v}" aria-pressed="${String(cfg[k])===String(v)}">${l}</button>`).join('')}</div>`;
  return `<section class="card etq" id="etq"><div class="head" style="align-items:flex-start"><div><h2>Etiqueta para a etiquetadora</h2><div class="sub">${cs.length===1?esc(cs[0].nome):cs.length+' crachás'} · desenhada na resolução da etiquetadora, só preto e branco, para o QR sair nítido.</div></div><button class="btn sec" data-act="etq-x" style="height:40px">Fechar</button></div>
   <div class="etq-g"><div class="etq-f">
     <div><span class="label">FORMATO</span>${seg('fmt',[['png','Imagem (PNG)'],['pdf','PDF']])}</div>
     <div><span class="label">TAMANHO DA ETIQUETA (MM)</span><div class="chips" style="margin-top:6px">${tam.map(([w,h])=>`<button class="chip" data-act="etq-tam" data-v="${w}x${h}" aria-pressed="${cfg.w===w&&cfg.h===h}">${w} × ${h}</button>`).join('')}</div>
       <div class="etq-wh"><label>Largura <input class="txt num" id="etq-w" inputmode="decimal" value="${cfg.w}"></label><label>Altura <input class="txt num" id="etq-h" inputmode="decimal" value="${cfg.h}"></label><span class="sub" style="margin:0;font-size:12px">mm, como está no rolo</span></div></div>
     <div><span class="label">RESOLUÇÃO DA ETIQUETADORA</span>${seg('dpi',[['203','203 dpi (8 pontos/mm)'],['300','300 dpi (12 pontos/mm)']])}<div class="sub" style="font-size:12px">A Zebra ZD220 da fábrica é 203 dpi.</div></div>
     <div class="etq-ck"><label><input type="checkbox" id="etq-txt" ${cfg.txt?'checked':''}> Nome e linha</label><label><input type="checkbox" id="etq-bar" ${cfg.barras?'checked':''}> Código de barras (coletor)</label></div>
     <button class="btn big" data-act="etq-ok">${ic('baixar',20,2)}Baixar ${cfg.fmt==='pdf'?'PDF':cs.length>1?cs.length+' imagens':'imagem'}</button>
   </div><div class="etq-pv"><span class="label">COMO VAI SAIR</span><div class="etq-pvb" style="aspect-ratio:${cfg.w}/${cfg.h}">${prev?`<img src="${prev}" alt="Prévia da etiqueta de ${esc(cs[0].nome)}">`:''}</div><small>${cfg.w} × ${cfg.h} mm · ${Math.round(cfg.w/25.4*cfg.dpi)} × ${Math.round(cfg.h/25.4*cfg.dpi)} pontos</small>
     <div class="sub" style="font-size:12px;margin-top:8px">Zebra ZD220: imprima em tamanho real (100%), sem "ajustar à página", com o papel do driver no mesmo tamanho da etiqueta. Se sair claro: Preferências da impressora › Opções › Escurecimento (Darkness) entre 20 e 25 e velocidade 2 ou 3 pol/s.</div></div></div></section>`; }
{ const _vc=vCrachas; vCrachas=function(){ let h=_vc.apply(this,arguments);
  h=h.replace(/<button class="eq-lk" data-act="cr-ades" data-id="([^"]+)">/g,(m,id)=>`<button class="eq-lk" data-act="etq-um" data-id="${id}">${ic('baixar',15,2)}Etiqueta</button>`+m);
  h=h.replace('<button class="btn" data-act="cr-ades-todos">','<button class="btn" data-act="etq-todos">'+ic('baixar',18,2)+'Etiquetas (imagem ou PDF)</button><button class="btn sec" data-act="cr-ades-todos">');
  const i=h.indexOf('<section class="card">'); return S.cr.etq&&i>=0?h.slice(0,i)+etqJanela()+h.slice(i):h; }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="etq-"]'); if(!b) return; const a=b.dataset.act;
  if(a==='etq-um'||a==='etq-todos'){ if(!crPodeGerir()){ toast('Você não possui permissão para gerenciar crachás.'); return; }
    S.cr.etq={ids:a==='etq-um'?[b.dataset.id]:S.cr.lista.filter(x=>x.ativo!==false).sort((p,q)=>String(p.linha).localeCompare(String(q.linha))||String(p.nome).localeCompare(String(q.nome))).map(x=>x._id)}; render();
    setTimeout(()=>{ const e=document.getElementById('etq'); if(e) e.scrollIntoView({behavior:'smooth',block:'start'}); },30); return; }
  if(a==='etq-x'){ S.cr.etq=null; render(); return; }
  const cfg=etqCfg();
  if(a==='etq-set'){ cfg[b.dataset.k]=b.dataset.k==='dpi'?+b.dataset.v:b.dataset.v; etqSalva(cfg); render(); return; }
  if(a==='etq-tam'){ const [w,h]=b.dataset.v.split('x').map(Number); cfg.w=w; cfg.h=h; etqSalva(cfg); render(); return; }
  if(a==='etq-ok'&&S.cr.etq){ b.disabled=true; await etqBaixar(S.cr.etq.ids.map(crDe).filter(Boolean),cfg); b.disabled=false; } });
document.addEventListener('change',ev=>{ const t=ev.target; if(!['etq-w','etq-h','etq-txt','etq-bar'].includes(t.id)) return; const cfg=etqCfg();
  if(t.id==='etq-txt') cfg.txt=t.checked; else if(t.id==='etq-bar') cfg.barras=t.checked; else { const v=parseFloat(String(t.value).replace(',','.')); if(!(v>=15&&v<=150)){ toast('Use um tamanho entre 15 e 150 mm.'); render(); return; } cfg[t.id==='etq-w'?'w':'h']=Math.round(v*10)/10; }
  etqSalva(cfg); render(); });
document.head.insertAdjacentHTML('beforeend',`<style id="etq-css">.etq{border:1.5px solid var(--teal)}.etq-g{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:22px;margin-top:14px}
.etq-f{display:flex;flex-direction:column;gap:16px;min-width:0}.etq-f .seg{margin-top:6px;flex-wrap:wrap}.etq-wh{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}.etq-wh label{display:flex;gap:6px;align-items:center;font-size:13px}.etq-wh .txt{width:84px;height:40px}
.etq-ck{display:flex;gap:18px;flex-wrap:wrap}.etq-ck label{display:flex;gap:8px;align-items:center;cursor:pointer}.etq-ck input{width:20px;height:20px;accent-color:var(--teal)}
.etq-pv{display:flex;flex-direction:column;gap:6px;min-width:0}.etq-pvb{background:#fff;border:1px dashed var(--faint);border-radius:6px;max-width:100%;width:100%;max-height:320px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.etq-pvb img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.etq-pv small{color:var(--muted)}
@media (max-width:860px){.etq-g{grid-template-columns:minmax(0,1fr)}}</style>`);
/* ===FIM ETIQUETA DO CRACHÁ=== */
/* ===================== RANCHO NO CELULAR DO ALMOX · VISUAL DIDÁTICO (14/10) ===================== */
/* Só muda a aparência das telas do celular do almox (cargo almoxcel): passos 1-2-3 no topo, cartão grande do rancho,
   "o que fazer agora" em destaque, barra de progresso da conferência, botão principal grande em cima e Cancelar discreto.
   A lógica (leitura, gravação) não muda. */
function rdPasso(h){ const T=S.tt; if(T.fase==='rcok') return 4; if(T.fase==='espera') return 1; if(/class="cf-l"|crachá de quem vai conferir|Carregando os itens/.test(h)) return 2; return 3; }
function rdPassos(n){ const P=[['1','Folha','Ler o QR'],['2','Conferir','Item a item'],['3','Entregar','Na linha']];
  return `<ol class="rd-pas" aria-label="Passo ${Math.min(n,3)} de 3">${P.map(([k,t,s],i)=>{ const st=i+1<n?'feito':i+1===n?'agora':''; return `<li class="${st}"><span class="rd-n">${st==='feito'?ic('check',16,3):k}</span><b>${t}</b><small>${s}</small></li>`; }).join('')}</ol>`; }
function rdCartao(){ const T=S.tt, R=T.rch; if(!R) return ''; const o=ordById(R.oid); const irm=o?dbIrmas(o):[]; const ls=[...new Set(irm.map(x=>x.linha).filter(Boolean))];
  const prod=o?String(o.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,''):'';
  return `<div class="rd-rc"><div class="rd-rcn"><span>RANCHO</span><b class="num">${esc(R.num)}</b></div><div class="rd-rci">${ls.map(l=>`<span class="rd-ln">${esc(l)}</span>`).join('')}<small>${irm.length>1?'Ordens ':'Ordem '}${irm.map(x=>esc(x.num)).join(', ')}</small>${prod?`<small class="rd-pr">${esc(prod.slice(0,48))}${irm.length>1?' e outras':''}</small>`:''}</div></div>`; }
{ const _vt=vTotem; vTotem=function(){ let h=_vt.apply(this,arguments); try{ if(!ttEntrega()||typeof h!=='string'||h.indexOf('tt-cel')<0) return h;
    const n=rdPasso(h), T=S.tt;
    /* passos logo abaixo do topo */
    const i=h.indexOf('</div></div>',h.indexOf('tt-top')); if(i>=0) h=h.slice(0,i+12)+rdPassos(n)+h.slice(i+12);
    /* cartão grande do rancho no lugar da linha "Rancho X · ordens · linhas" */
    if(T.rch) h=h.replace(/<div class="tt-ola">Rancho <b>[^<]*<\/b>[^<]*<\/div>/,rdCartao());
    /* barra de progresso da conferência */
    h=h.replace(/<div class="cf-n num">(\d+) de (\d+) conferidos<\/div>/,(m,a,b)=>{ const p=+b?Math.round(+a/+b*100):0; return `<div class="rd-prog ${+a===+b?'ok':''}"><div class="rd-progt"><b class="num">${a} de ${b}</b><span>${+a===+b?'Tudo separado. Toque em Concluir separação.':'Toque em OK em cada item que você separou'}</span></div><div class="rd-bar"><i style="width:${p}%"></i></div></div>`; });
    /* "o que fazer agora" */
    h=h.replace(/<div class="tt-rcq">/g,'<div class="tt-rcq rd-agora"><span class="rd-tag">AGORA</span>');
    if(n===1) h=h.replace('<div class="tt-box">','<div class="tt-box rd-agora1"><span class="rd-tag">AGORA</span>');
    h=h.replace('✅ Recebi o rancho',ic('check',22,3)+' Recebi o rancho');
  }catch(e){ console.warn('[rancho celular]',e); } return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="rd-css">
body.tt-ent .tt-cel{gap:14px}
body.tt-ent .tt-top b{font-size:22px}body.tt-ent .tt-clk{font-size:30px}
.rd-pas{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;counter-reset:none}
.rd-pas li{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px 9px;border-radius:12px;background:var(--surface);border:2px solid var(--line);color:var(--muted);text-align:center;min-width:0}
.rd-pas b{font-size:15px;color:inherit}.rd-pas small{font-size:11.5px;line-height:1.2}
.rd-n{width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;background:var(--sunken);color:var(--ink-2)}
.rd-pas li.agora{border-color:var(--teal);background:var(--teal-wash);color:var(--teal-strong)}.rd-pas li.agora .rd-n{background:var(--teal);color:#fff}
.rd-pas li.feito{border-color:var(--ok);color:var(--ok-ink)}.rd-pas li.feito .rd-n{background:var(--ok);color:#fff}
.rd-rc{display:flex;gap:14px;align-items:center;background:var(--teal-strong);color:#fff;border-radius:16px;padding:12px 16px}
.rd-rcn{display:flex;flex-direction:column;line-height:1}.rd-rcn span{font-size:11px;font-weight:800;letter-spacing:.14em;opacity:.8}.rd-rcn b{font-size:34px;font-weight:800;letter-spacing:.02em;margin-top:4px}
.rd-rci{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;min-width:0;flex:1}.rd-ln{background:#fff;color:var(--teal-strong);border-radius:999px;padding:2px 10px;font-weight:800;font-size:14px}
.rd-rci small{flex-basis:100%;font-size:13px;opacity:.9}.rd-rci .rd-pr{opacity:.75;font-size:12px}
.rd-agora{position:relative;background:var(--teal)!important;color:#fff!important;padding:22px 18px 16px!important;border-radius:16px;box-shadow:0 0 0 4px var(--teal-tint);animation:rdpul 2s ease-in-out infinite}
.rd-agora b{font-size:22px!important;line-height:1.25}.rd-agora span:not(.rd-tag){opacity:.9}.rd-agora svg{flex-shrink:0;width:34px;height:34px}
.rd-tag{position:absolute;top:-11px;left:14px;background:var(--warn);color:#2a1f05;font-size:11px;font-weight:900;letter-spacing:.14em;padding:3px 10px;border-radius:999px}
.rd-agora1{position:relative;border:3px solid var(--teal);padding-top:22px}
@keyframes rdpul{0%,100%{box-shadow:0 0 0 4px var(--teal-tint)}50%{box-shadow:0 0 0 9px var(--teal-tint)}}
@media (prefers-reduced-motion:reduce){.rd-agora{animation:none}}
.rd-prog{background:var(--surface);border-radius:14px;padding:12px 14px;border:2px solid var(--line)}.rd-prog.ok{border-color:var(--ok);background:var(--ok-tint)}
.rd-progt{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.rd-progt b{font-size:24px}.rd-progt span{color:var(--muted);font-size:14px}.rd-prog.ok .rd-progt span{color:var(--ok-ink);font-weight:700}
.rd-bar{height:12px;border-radius:999px;background:var(--sunken);overflow:hidden;margin-top:8px}.rd-bar i{display:block;height:100%;background:var(--ok);border-radius:999px;transition:width .25s}
body.tt-ent .cf-i{min-height:84px;border-left-width:8px}body.tt-ent .cf-t b{font-size:15px;color:var(--muted)}body.tt-ent .cf-t small{font-size:17px;color:var(--ink);font-weight:700;margin-top:2px}
body.tt-ent .cf-q{font-size:28px}body.tt-ent .cf-ok{height:60px;font-size:20px}
body.tt-ent .tt-cel .tt-rod{flex-direction:column-reverse;align-items:stretch;gap:10px}
body.tt-ent .tt-cel .tt-rod .btn{width:100%;min-width:0;height:64px;font-size:20px}
body.tt-ent .tt-cel .tt-rod .btn.sec[data-act="tt-voltar"]{height:44px;font-size:16px;background:transparent;border:0;box-shadow:none;color:var(--muted);text-decoration:underline}
body.tt-ent .tt-big{height:68px;font-size:21px}
body.tt-ent .tt-ritens{max-height:none;border-top:0;margin:12px 0;display:flex;flex-direction:column;gap:6px}
body.tt-ent .tt-ritens div{background:var(--surface-2);border:0;border-radius:10px;padding:10px 12px;font-size:16px;align-items:center}
body.tt-ent .tt-ritens span{font-weight:800;font-size:18px;white-space:nowrap}
body.tt-ent .tt-rec h1{font-size:30px}
body.tt-ent .toast{top:calc(env(safe-area-inset-top,0px) + 8px);bottom:auto;left:12px;right:12px;transform:none;max-width:none;font-size:16px;text-align:center}
body.tt-ent.tt-mira #tt-video{left:12px;right:auto;width:calc(100vw - 24px)!important}
</style>`);
/* ===FIM RANCHO NO CELULAR=== */
/* ===================== SÓ RECEBE O QUE FOI SEPARADO (14/10) ===================== */
/* O almox marca na conferência o que separou; quem recebe só recebe esses itens. O que faltou na separação aparece
   como "não separado" e não entra na entrega: o rancho é entregue em parte (rdb.entp) e continua na fila.
   Quando o almox abre o rancho de novo, a conferência pede só o que faltou ("complemento", rdb.sep.comp);
   depois disso, quem recebe recebe o resto e o rancho fecha. */
function srSepDoc(o){ const irm=o?dbIrmas(o):[]; return (irm.find(x=>x.rdb&&x.rdb.sep&&x.rdb.sep.rec)||irm.find(x=>x.rdb&&x.rdb.sep&&x.rdb.sep.itens)||{}).rdb?.sep||null; }
function srFalta(o){ const s=srSepDoc(o); if(!s) return new Set(); const f=new Set();
  if(Array.isArray(s.rec)) s.rec.forEach(r=>{ if(!r.ok) f.add(r.c); }); else (s.itens||[]).forEach(i=>i&&i.c&&f.add(i.c));
  (s.comp||[]).forEach(p=>(p.itens||[]).forEach(c=>f.delete(c))); return f; }
function srCompModo(){ try{ const T=S.tt, R=T.rch, o=R&&ordById(R.oid); if(!ttEntrega()||T.fase!=='rancho'||T.p||!o||R.cfSalvo) return false;
  if(dbIrmas(o).some(x=>!(x.rdb&&x.rdb.sep))) return false; if(o.rdb&&o.rdb.ent&&!R.refazer) return false; return srFalta(o).size>0; }catch(e){ return false; } }
/* conferência do complemento: só os itens que faltaram */
{ const _cp=cfPrecisa; cfPrecisa=function(){ return _cp.apply(this,arguments)||srCompModo(); }; }
{ const _cc=cfComeca; cfComeca=function(p){ const r=_cc.apply(this,arguments); try{ if(srCompModo()){ const R=S.tt.rch, f=srFalta(ordById(R.oid)); (R.itens||[]).forEach((x,i)=>{ if(!f.has(x.c)) R.ck[i]=true; }); render(); } }catch(e){} return r; }; }
{ const _vc=vConferencia; vConferencia=function(){ let h=_vc.apply(this,arguments); if(!srCompModo()) return h; const R=S.tt.rch, f=srFalta(ordById(R.oid));
  const its=R.itens||[], nomes=its.filter(x=>f.has(x.c)).map(x=>esc(x.c+' '+(x.d||''))).join(', ');
  h=h.replace(/<button class="cf-i ([^"]*)" data-act="cf-ok" data-i="(\d+)"([^>]*)>/g,(m,cl,i,rest)=>{ const x=its[+i]; return x&&!f.has(x.c)?`<button class="cf-i on cf-ja" data-act="cf-ok" data-i="${i}" disabled${rest}>`:m; });
  h=h.replace(/(<button class="cf-i on cf-ja"[^>]*>[\s\S]*?<small>)([^<]*)(<\/small>)/g,'$1$2 · já separado antes$3');
  const av=`<div class="sr-av"><b>Faltou na separação: ${f.size} ${f.size===1?'item':'itens'}</b><span>${nomes}</span><span>Separe agora e toque em OK no que conseguiu. Depois entrega o complemento.</span></div>`;
  const k=h.indexOf('<div class="cf-l">')>=0?h.indexOf('<div class="cf-l">'):h.indexOf('<div class="tt-rcq'); return k<0?h:h.slice(0,k)+av+h.slice(k); }; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cf-salvar"]'); if(!b||b.disabled||!srCompModo()) return;
  ev.stopPropagation(); ev.preventDefault(); const T=S.tt, R=T.rch, o=ordById(R.oid); if(!R.cfp||T.enviando||!o) return; const f=srFalta(o), its=R.itens||[];
  const novos=its.filter((x,i)=>f.has(x.c)&&R.ck[i]).map(x=>x.c); if(!novos.length){ T.msg='Toque em OK no que foi separado agora.'; render(); return; }
  const resta=its.filter(x=>f.has(x.c)&&!novos.includes(x.c)), agora=new Date().toISOString();
  const parte={em:agora,por:S.uid||null,nome:R.cfp.nome,cracha:R.cfp.codigo||null,itens:novos};
  T.enviando=true; T.msg=''; render(); let n=0, falhou=false;
  for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(!rx.sep) continue; const sp=Object.assign({},rx.sep);
    sp.comp=[...(sp.comp||[]),parte]; sp.falta=resta.length>0; sp.itens=resta.map(y=>({c:y.c,i:y.c+' '+(y.d||''),q:fQ(y.q)+' '+(y.um||'')}));
    if(Array.isArray(sp.rec)) sp.rec=sp.rec.map(r=>novos.includes(r.c)?Object.assign({},r,{ok:true}):r); rx.sep=sp;
    const txt='Rancho '+(o.rancho||'')+': complemento separado por '+R.cfp.nome+' ('+novos.join(', ')+')'+(resta.length?' · ainda faltando: '+resta.map(y=>y.c).join(', '):' · agora completo')+' (celular do almox)';
    if(await dbSalvar(x,rx,txt,o.rancho)) n++; else falhou=true; }
  T.enviando=false; if(!n&&falhou){ T.msg='Não foi possível salvar. Confira a internet e toque de novo.'; render(); return; }
  R.cfSalvo=true; toast('Complemento separado. Agora o crachá de quem vai receber.'); render(); },true);
/* entrega: lista do que vai (separado), do que já foi e do que não foi separado */
function srListas(o,R){ const f=srFalta(o), feitos=epFeitos(o), its=R.itens||[]; return {f,feitos,vai:its.filter(x=>!f.has(x.c)&&!feitos[x.c]),ja:its.filter(x=>feitos[x.c]),nao:its.filter(x=>f.has(x.c)&&!feitos[x.c])}; }
{ const _ve=vEntrega; vEntrega=function(){ let h=_ve.apply(this,arguments); try{ const T=S.tt, R=T.rch, o=R&&ordById(R.oid);
    if(!h||T.fase!=='rancho'||!T.p||!o||!R.itens||!R.itens.length||(o.rdb&&o.rdb.ent&&!R.refazer)) return h;
    const L=srListas(o,R);
    if(epA.on){ R.itens.forEach((x,i)=>{ if(L.f.has(x.c)&&!L.feitos[x.c]) h=h.replace(new RegExp('<button class="cf-i ([^"]*)" data-act="ep-it" data-i="'+i+'"( ?)>'),`<button class="cf-i sr-nao" data-act="ep-it" data-i="${i}" disabled>`); });
      return h.replace(/(<button class="cf-i sr-nao"[^>]*>[\s\S]*?<small>)([^<]*)(<\/small>)/g,'$1$2 · não separado$3').replace(/(<button class="cf-i sr-nao"[\s\S]*?<span class="cf-ok">)([^<]*)(<\/span>)/g,'$1—$3'); }
    if(!L.nao.length&&!L.ja.length) return h;
    const lin=(x,cl)=>`<div class="${cl}"><b>${esc(x.c)}</b> ${esc(x.d||'')}<span>${fQ(x.q)} ${esc(x.um)}</span></div>`;
    const lst=`<div class="sr-g"><div class="sr-h ok">${ic('check',16,3)} Vai agora (${L.vai.length})</div><div class="tt-ritens">${L.vai.map(x=>lin(x,'')).join('')||'<p class="sub" style="margin:4px 0">Nada separado para entregar agora.</p>'}</div>
      ${L.nao.length?`<div class="sr-h nao">⏳ Fica para depois (${L.nao.length})</div><div class="tt-ritens sr-naol">${L.nao.map(x=>lin(x,'')).join('')}</div><p class="sr-obs">Faltou na separação. Quando o almox separar, abre o rancho de novo e entrega o complemento.</p>`:''}
      ${L.ja.length?`<div class="sr-h ja">Já entregue antes (${L.ja.length})</div><div class="tt-ritens sr-jal">${L.ja.map(x=>lin(x,'')).join('')}</div>`:''}</div>`;
    h=h.replace(/<div class="tt-ritens">[\s\S]*?<\/div><\/div>(\s*<button class="btn tt-big" data-act="tt-recebi")/,(m,b)=>lst+b);
    if(L.nao.length) h=h.replace(/<button class="btn sec tt-big" data-act="tt-econf">[^<]*<\/button>/,'');
    if(L.nao.length) h=h.replace(/(data-act="tt-recebi"[^>]*>)([\s\S]*?)(<\/button>)/,(m,a,t,c)=>a+(/Salvando/.test(t)?t:ic('check',22,3)+` Recebi o separado (${L.vai.length})`)+c).replace(/data-act="tt-recebi"/,L.vai.length?'data-act="tt-recebi"':'data-act="tt-recebi" disabled');
  }catch(e){ console.warn('[só separado]',e); } return h; }; }
/* "Recebi": com item não separado, registra só o separado (entrega em parte) e o rancho continua na fila */
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="tt-recebi"]'); if(!b||!ttEntrega()) return; const T=S.tt, R=T.rch, o=R&&ordById(R.oid); if(!o||!T.p||!R.itens||!R.itens.length) return;
  const L=srListas(o,R); if(!L.nao.length) return; ev.stopPropagation(); ev.preventDefault(); if(b.disabled||T.enviando||!L.vai.length) return;
  const agora=new Date().toISOString(), eu=(S.uid&&S.nomes[S.uid])||'', novos=L.vai.map(x=>x.c);
  const parte={em:agora,por:S.uid||null,itens:novos,recebidoPor:T.p.nome,cracha:T.p.codigo||null,entreguePor:eu,origem:'celular',faltando:L.nao.map(x=>x.c)};
  T.enviando=true; T.msg=''; render(); let n=0, falhou=false;
  for(const x of dbIrmas(o)){ const rx=Object.assign({},x.rdb||{}); if(rx.ent&&!R.refazer) continue; rx.entp=[...(rx.entp||[]),parte];
    const txt='Rancho '+(o.rancho||'')+' entregue em parte (só o separado: '+novos.join(', ')+') por '+eu+', recebido por '+T.p.nome+' · não separado: '+L.nao.map(y=>y.c).join(', ');
    if(await dbSalvar(x,rx,txt,o.rancho)) n++; else falhou=true; }
  T.enviando=false; if(!n&&falhou){ T.msg='Não foi possível salvar. Confira a internet e toque de novo.'; render(); return; }
  toast('Recebido o que foi separado. O que faltou fica na fila para o complemento.'); ttVoltar(); },true);
document.head.insertAdjacentHTML('beforeend',`<style id="sr-css">
.sr-av{background:var(--crit-tint);border:2px solid var(--crit);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:4px}.sr-av b{font-size:18px;color:var(--crit-ink)}.sr-av span{font-size:15px}
.cf-i.cf-ja{opacity:.55}
.sr-g{text-align:left;margin:10px 0}.sr-h{font-weight:800;font-size:15px;margin:12px 0 4px;display:flex;align-items:center;gap:6px}.sr-h.ok{color:var(--ok-ink)}.sr-h.nao{color:var(--crit-ink)}.sr-h.ja{color:var(--muted)}
.sr-naol div{background:var(--crit-tint)!important;text-decoration:line-through;color:var(--crit-ink)}.sr-jal div{opacity:.6}
.tt-box .sr-obs{font-size:14px;color:var(--crit-ink);margin:4px 0 0;line-height:1.35}
.cf-i.sr-nao{opacity:.5;background:var(--crit-tint);border-color:var(--crit)}
</style>`);
/* ===FIM SÓ RECEBE O QUE FOI SEPARADO=== */
/* ===================== SEPARAR ANTES DO CRACHÁ DE QUEM RECEBE (14/10) ===================== */
/* Pedido de 14/10: o almox marca o que separou ANTES de escanear o crachá do operador. Ao abrir o rancho, a separação
   (lista com OK por item) já aparece no nome de quem está logado no celular; nenhum crachá é aceito até tocar em
   "Concluir separação". Só depois o celular pede o crachá de quem vai receber. */
function spEu(){ return (S.uid&&S.nomes&&S.nomes[S.uid])||'Almoxarifado'; }
function spAuto(){ try{ const R=S.tt.rch; if(ttEntrega()&&R&&!R.cfp&&cfPrecisa()) cfComeca({codigo:null,nome:spEu(),conta:true}); }catch(e){ console.warn('[separar]',e); } }
{ const _tr=ttRancho; ttRancho=function(){ const r=_tr.apply(this,arguments); spAuto(); return r; }; }
{ const _r=render; render=function(){ try{ if(S.view==='mantotem'&&S.tt&&S.tt.fase==='rancho'&&S.tt.rch&&!S.tt.rch.cfp&&ttEntrega()&&cfPrecisa()){ S.tt.rch.cfp={codigo:null,nome:spEu(),conta:true}; S.tt.rch.ck=S.tt.rch.ck||{}; } }catch(e){} const x=_r.apply(this,arguments); try{ if(ttEntrega()&&cfConferindo()&&(ttCam.stream||ttCam.timer)) ttCamDesliga(); }catch(e){} return x; }; }
{ const _tl=ttLeu; ttLeu=function(txt){ if(!ttEntrega()) return _tl.apply(this,arguments); const T=S.tt, s=String(txt||'').trim().toUpperCase();
  if(TT_RE.test(s)){ if(T.fase==='espera'){ ttMsg('Escaneie primeiro a folha de produção. O crachá de quem recebe vem depois da separação.'); return; }
    if(cfPrecisa()){ ttMsg('Primeiro marque o que foi separado e toque em "Concluir separação". O crachá de quem recebe vem depois.'); render(); return; } }
  return _tl.apply(this,arguments); }; }
{ const _vc=vConferencia; vConferencia=function(){ let h=_vc.apply(this,arguments); if(!ttEntrega()) return h;
  return h.replace('<b>Conferir rancho</b>','<b>Separar rancho</b>').replace('Conferindo: <b>','Separando: <b>').replace('>Concluir conferência<','>Concluir separação<')
    .replace('Toque em OK em cada item que está certo','Toque em OK em cada item que você separou').replace('Tudo conferido. Toque em Concluir.','Tudo separado. Toque em Concluir separação.')
    .replace(/<div class="tt-rcq[^"]*">[\s\S]*?crachá de quem vai conferir[\s\S]*?<\/div><\/div>/,''); }; }
{ const _rp=rdPassos; rdPassos=function(n){ return _rp.apply(this,arguments).replace('<b>Conferir</b><small>Item a item</small>','<b>Separar</b><small>Marcar o que separou</small>').replace('<b>Entregar</b><small>Na linha</small>','<b>Entregar</b><small>Crachá de quem recebe</small>'); }; }
/* a mensagem de aviso aparece em destaque na tela de separação */
document.head.insertAdjacentHTML('beforeend',`<style id="sp-css">body.tt-ent .tt-cel .tt-err{background:var(--warn-tint);color:var(--warn-ink);border-radius:12px;padding:10px 12px;font-weight:700}</style>`);
/* ===FIM SEPARAR ANTES DO CRACHÁ=== */
/* ===================== ITEM QUE NÃO VAI NO RANCHO (14/10) ===================== */
/* Na separação, cada item tem OK (separado) e "Não vai" (está no rancho mas não se entrega: não vai mesmo ou fica para outro
   momento por decisão do almox). "Não vai" não é falta: não gera complemento e não impede fechar o rancho.
   Grava em rdb.sep.naoVai [códigos] e marca rec[].nv. Item sem marcação nenhuma continua sendo falta. */
function nvCod(o){ const irm=o?dbIrmas(o):[]; const s=new Set(); irm.forEach(x=>((x.rdb&&x.rdb.sep&&x.rdb.sep.naoVai)||[]).forEach(c=>s.add(c))); return s; }
{ const _ds=dbSalvar; dbSalvar=function(o,rdb,txt,rch){ try{ const R=S.tt&&S.tt.rch; if(ttEntrega()&&R&&R.nv&&rdb&&rdb.sep&&R.itens){ const cods=R.itens.filter((x,i)=>R.nv[i]).map(x=>x.c);
      if(cods.length){ const sp=Object.assign({},rdb.sep); sp.naoVai=[...new Set([...(sp.naoVai||[]),...cods])]; if(Array.isArray(sp.rec)) sp.rec=sp.rec.map(r=>cods.includes(r.c)?Object.assign({},r,{nv:true}):r);
        if(Array.isArray(sp.itens)) sp.itens=sp.itens.filter(i=>!cods.includes(i.c)); rdb=Object.assign({},rdb,{sep:sp}); if(txt&&!/não vai:/.test(txt)) txt+=' · não vai: '+cods.join(', '); } } }catch(e){ console.warn('[não vai]',e); }
  return _ds.call(this,o,rdb,txt,rch); }; }
/* a falta não conta o que "não vai" */
{ const _sf=srFalta; srFalta=function(o){ const f=_sf.apply(this,arguments); nvCod(o).forEach(c=>f.delete(c)); return f; }; }
/* separação: botão "Não vai" ao lado de cada item */
{ const _vc=vConferencia; vConferencia=function(){ let h=_vc.apply(this,arguments); try{ const R=S.tt.rch; if(!ttEntrega()||!R||!R.itens) return h; R.nv=R.nv||{};
    h=h.replace(/(<button class="cf-i[^"]*"[^>]*data-act="cf-ok" data-i="(\d+)"[^>]*>)([\s\S]*?)(<\/button>)/g,(m,a,i,mid,c)=>{ if(/disabled/.test(a)) return m; const nv=!!R.nv[i];
      if(nv){ a=a.replace(/class="cf-i[^"]*"/,'class="cf-i cf-nvon"'); mid=mid.replace(/<span class="cf-ok">[\s\S]*?<\/span>$/,'<span class="cf-ok">Não vai</span>'); }
      return `<div class="cf-w">${a}${mid}${c}<button class="cf-nv ${nv?'on':''}" data-act="cf-nv" data-i="${i}" aria-pressed="${nv}">${nv?'↩ Desfazer':'Não vai'}</button></div>`; });
    const nn=Object.values(R.nv).filter(Boolean).length; if(nn) h=h.replace('<div class="cf-l">',`<p class="cf-nvinfo">${nn} ${nn===1?'item marcado':'itens marcados'} como <b>não vai</b>: não é falta e não volta para complemento.</p><div class="cf-l">`);
  }catch(e){ console.warn('[não vai]',e); } return h; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cf-nv"],[data-act="cf-ok"]'); if(!b||!ttEntrega()) return; const R=S.tt.rch; if(!R) return; R.nv=R.nv||{}; const i=+b.dataset.i;
  if(b.dataset.act==='cf-ok'){ if(R.nv[i]){ delete R.nv[i]; R.ck[i]=false; } return; } /* tocar no item "não vai" volta a pendente; o OK normal segue */
  ev.stopPropagation(); if(R.nv[i]){ delete R.nv[i]; R.ck[i]=false; } else { R.nv[i]=true; R.ck=R.ck||{}; R.ck[i]=true; } R.cfConf=false; S.tt.ult=Date.now(); render(); },true);
{ const _tv=ttVoltar; ttVoltar=function(){ try{ if(S.tt.rch) S.tt.rch.nv={}; }catch(e){} return _tv.apply(this,arguments); }; }
/* entrega: "não vai" aparece à parte e não entra no recebimento */
{ const _sl=srListas; srListas=function(o,R){ const L=_sl.apply(this,arguments); const nv=nvCod(o); if(!nv.size) return L; L.nv=(R.itens||[]).filter(x=>nv.has(x.c)); L.vai=L.vai.filter(x=>!nv.has(x.c)); L.nao=L.nao.filter(x=>!nv.has(x.c)); L.ja=L.ja.filter(x=>!nv.has(x.c)); return L; }; }
{ const _ve=vEntrega; vEntrega=function(){ let h=_ve.apply(this,arguments); try{ const T=S.tt, R=T.rch, o=R&&ordById(R.oid); if(!h||T.fase!=='rancho'||!T.p||!o||!R.itens||!R.itens.length) return h;
    const nv=nvCod(o); if(!nv.size) return h; const L=srListas(o,R);
    if(epA.on){ R.itens.forEach((x,i)=>{ if(nv.has(x.c)) h=h.replace(new RegExp('<button class="cf-i ([^"]*)" data-act="ep-it" data-i="'+i+'"( ?)>'),`<button class="cf-i sr-nv" data-act="ep-it" data-i="${i}" disabled>`); }); return h; }
    const lin=x=>`<div><b>${esc(x.c)}</b> ${esc(x.d||'')}<span>${fQ(x.q)} ${esc(x.um)}</span></div>`;
    const bloco=`<div class="sr-h nv">Não vai neste rancho (${L.nv.length})</div><div class="tt-ritens sr-nvl">${L.nv.map(lin).join('')}</div>`;
    if(h.indexOf('class="sr-g"')>=0) h=h.replace(/(<div class="sr-g">[\s\S]*?)(<\/div>\s*<button class="btn tt-big" data-act="tt-recebi")/,(m,a,b)=>a+bloco+b);
    else { h=h.replace(/<div class="tt-ritens">[\s\S]*?<\/div><\/div>(\s*<button class="btn tt-big" data-act="tt-recebi")/,(m,b)=>`<div class="sr-g"><div class="sr-h ok">${ic('check',16,3)} Vai agora (${L.vai.length})</div><div class="tt-ritens">${L.vai.map(lin).join('')}</div>${L.ja.length?`<div class="sr-h ja">Já entregue antes (${L.ja.length})</div><div class="tt-ritens sr-jal">${L.ja.map(lin).join('')}</div>`:''}${bloco}</div>`+b); }
  }catch(e){ console.warn('[não vai]',e); } return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="nv-css">
.cf-w{display:flex;flex-direction:column;gap:4px}.cf-w .cf-i{width:100%}
.cf-nv{align-self:flex-end;border:1.5px solid var(--line);background:var(--surface);color:var(--muted);border-radius:999px;padding:6px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:-2px}
.cf-nv.on{border-color:var(--ink-2);color:var(--ink-2)}
.cf-i.cf-nvon{background:var(--sunken);border-color:var(--line);opacity:.75}.cf-i.cf-nvon .cf-t,.cf-i.cf-nvon .cf-q{text-decoration:line-through}.cf-i.cf-nvon .cf-ok{background:var(--ink-2);border-color:var(--ink-2);color:#fff;font-size:15px}
.cf-nvinfo{margin:0;font-size:14px;color:var(--ink-2);background:var(--sunken);border-radius:10px;padding:8px 12px}
.sr-h.nv{color:var(--muted)}.sr-nvl div{opacity:.6;text-decoration:line-through}.cf-i.sr-nv{opacity:.45}
</style>`);
/* ===FIM ITEM QUE NÃO VAI=== */
/* ===================== QUANTIDADE PARCIAL + SONS + TELA MAIS SIMPLES (14/10) ===================== */
/* Pedido de 14/10: "o almox entregou só 100 kg de cimento branco, não tinha mais". Na separação, "Menos" abre o campo
   da quantidade separada. O que foi separado vai agora; o resto fica como falta (complemento depois).
   Quantidades: rec[].qs (separado na 1ª vez), comp[].qtd {cód: qtd}, entp[].qtd {cód: qtd}. Sem qtd = item inteiro (dados antigos).
   Também: sons em cada passo e menos texto na tela. */
const _r3=x=>Math.round((+x||0)*1000)/1000;
function srQs(o,R,sepOv){ const its=(R&&R.itens)||[], s=sepOv!==undefined?sepOv:srSepDoc(o), nv=nvCod(o); if(sepOv&&sepOv.naoVai) sepOv.naoVai.forEach(c=>nv.add(c));
  const entp=(o&&o.rdb&&o.rdb.entp)||[], m={};
  its.forEach(x=>{ const q=+x.q||0; let sq;
    if(!s||(!s.rec&&!s.itens)) sq=q; else { const r=(s.rec||[]).find(r=>r.c===x.c);
      if(r) sq=r.qs!=null?+r.qs:(r.ok?q:0); else sq=(Array.isArray(s.itens)&&s.itens.some(i=>i&&i.c===x.c))?0:q;
      (s.comp||[]).forEach(p=>{ if(!(p.itens||[]).includes(x.c)) return; sq+=(p.qtd&&p.qtd[x.c]!=null)?+p.qtd[x.c]:Math.max(0,q-sq); }); }
    sq=Math.min(q,_r3(sq)); let eq=0; entp.forEach(p=>{ if(!(p.itens||[]).includes(x.c)) return; eq+=(p.qtd&&p.qtd[x.c]!=null)?+p.qtd[x.c]:Math.max(0,q-eq); }); eq=Math.min(q,_r3(eq));
    const n=nv.has(x.c); m[x.c]={x,q,sq,eq,nv:n,vai:n?0:_r3(Math.max(0,sq-eq)),falta:n?0:_r3(Math.max(0,q-sq))}; });
  return m; }
{ const _sf=srFalta; srFalta=function(o){ const R=S.tt&&S.tt.rch; if(!R||!R.itens||!o||!dbIrmas(o).some(x=>x._id===R.oid)) return _sf.apply(this,arguments);
  const st=srQs(o,R), f=new Set(); for(const c in st) if(st[c].falta>0) f.add(c); return f; }; }
srListas=function(o,R){ const st=srQs(o,R), its=R.itens||[], cp=(x,q,extra)=>Object.assign({},x,{q},extra||{});
  return {f:new Set(its.filter(x=>st[x.c].falta>0).map(x=>x.c)),feitos:epFeitos(o),
    vai:its.filter(x=>st[x.c].vai>0).map(x=>cp(x,st[x.c].vai)),
    ja:its.filter(x=>st[x.c].eq>0&&!st[x.c].nv).map(x=>cp(x,st[x.c].eq)),
    nao:its.filter(x=>st[x.c].falta>0).map(x=>cp(x,st[x.c].falta,{d:(x.d||'')+(st[x.c].sq>0?' · falta o resto':'')})),
    nv:its.filter(x=>st[x.c].nv)}; };
/* grava as quantidades */
{ const _ds=dbSalvar; dbSalvar=function(o,rdb,txt,rch){ try{ const T=S.tt, R=T&&T.rch; if(ttEntrega()&&R&&R.itens&&rdb){ const parc=R.parc||{}, old=(o.rdb||{}).sep;
    if(rdb.sep&&rdb.sep!==old){ const sp=Object.assign({},rdb.sep), pi=c=>{ const i=R.itens.findIndex(x=>x.c===c); return i>=0&&parc[i]!=null?+parc[i]:null; };
      const comp1=old&&sp.comp&&sp.comp.length>((old.comp||[]).length)?sp.comp[sp.comp.length-1]:null;
      if(!old&&Array.isArray(sp.rec)){ sp.rec=sp.rec.map(r=>pi(r.c)!=null?Object.assign({},r,{qs:pi(r.c),ok:true}):r); const ps=sp.rec.filter(r=>r.qs!=null); if(ps.length&&txt) txt+=' · parcial: '+ps.map(r=>r.c+' '+fQ(r.qs)+' de '+fQ(r.q)).join(', '); }
      else if(comp1&&!comp1.qtd){ const st0=srQs(o,R); comp1.qtd={}; (comp1.itens||[]).forEach(c=>{ const v=st0[c], rem=v?v.falta:0, p=pi(c); comp1.qtd[c]=p!=null?Math.min(p,rem):rem; }); }
      const nvs=new Set([...(sp.naoVai||[]),...R.itens.filter((x,i)=>R.nv&&R.nv[i]).map(x=>x.c)]);
      const base=!old?Object.assign({},sp,{rec:R.itens.map((x,i)=>({c:x.c,q:+x.q||0,ok:!!(R.ck&&R.ck[i]),qs:pi(x.c)}))}):sp; const st=srQs(o,R,Object.assign({},base,{naoVai:[...nvs]})), its=R.itens.filter(x=>st[x.c]&&st[x.c].falta>0);
      sp.itens=its.map(x=>({c:x.c,i:x.c+' '+(x.d||''),q:fQ(st[x.c].falta)+' '+(x.um||'')})); sp.falta=its.length>0; rdb=Object.assign({},rdb,{sep:sp}); }
    if(rdb.entp&&rdb.entp.length&&T.p){ const p=rdb.entp[rdb.entp.length-1]; if(!p.qtd){ const st=srQs(o,R); p.qtd={}; (p.itens||[]).forEach(c=>{ p.qtd[c]=st[c]?st[c].vai:0; }); } } } }catch(e){ console.warn('[parcial]',e); }
  return _ds.call(this,o,rdb,txt,rch); }; }
/* ---------- sons ---------- */
function somT(notas){ try{ const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const x=ttCam.ac||(ttCam.ac=new A()); if(x.state==='suspended') x.resume(); let t=x.currentTime;
  notas.forEach(([f,d,tipo])=>{ const o=x.createOscillator(), g=x.createGain(); o.type=tipo||'sine'; o.frequency.value=f; o.connect(g); g.connect(x.destination); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.25,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.start(t); o.stop(t+d+0.02); t+=d*0.9; }); }catch(e){} }
const SOM={ok:()=>somT([[1320,0.09]]),tira:()=>somT([[700,0.08]]),fim:()=>somT([[880,0.12],[1175,0.12],[1568,0.22]]),erro:()=>somT([[220,0.18,'square'],[180,0.25,'square']]),pronto:()=>somT([[784,0.12],[988,0.12],[1175,0.12],[1568,0.35]])};
document.addEventListener('click',ev=>{ if(!ttEntrega()) return; const b=ev.target.closest&&ev.target.closest('[data-act]'); if(!b||b.disabled) return; const a=b.dataset.act, R=S.tt.rch;
  if(a==='cf-ok'){ const i=+b.dataset.i; (R&&R.ck&&R.ck[i])?SOM.tira():SOM.ok(); } else if(a==='cf-nv'||a==='cf-pcok') SOM.ok(); },true);
{ const _tm=ttMsg; ttMsg=function(t){ if(ttEntrega()) SOM.erro(); return _tm.apply(this,arguments); }; }
{ const _ds=dbSalvar; let ult=0; dbSalvar=async function(o,rdb,txt){ const r=await _ds.apply(this,arguments); try{ if(r!==false&&ttEntrega()&&Date.now()-ult>1500){ ult=Date.now(); if(/recebido por|entregue/.test(txt||'')) SOM.pronto(); else if(/separado/.test(txt||'')) SOM.fim(); } }catch(e){} return r; }; }
/* ---------- "Menos": quanto separou ---------- */
{ const _vc=vConferencia; vConferencia=function(){ let h=_vc.apply(this,arguments); try{ const R=S.tt.rch; if(!ttEntrega()||!R||!R.itens) return h; R.parc=R.parc||{}; const its=R.itens;
    h=h.replace(/<div class="cf-w">(<button class="cf-i[^"]*"[^>]*data-act="cf-ok" data-i="(\d+)"[^>]*>)([\s\S]*?<\/button>)(<button class="cf-nv[^"]*"[^>]*>[^<]*<\/button>)<\/div>/g,(m,a,i,mid,nvb)=>{ const x=its[+i]; if(!x) return m;
      if(R.pe===+i) return `<div class="cf-w cf-pew"><div class="cf-pe"><b>${esc(x.d||x.c)}</b><label>Quanto separou? <span>(pedido: ${fQ(x.q)} ${esc(x.um)})</span></label>
        <div class="cf-per"><input class="txt num" id="cf-pq" type="number" inputmode="decimal" step="any" min="0" value="${R.parc[i]!=null?R.parc[i]:''}" placeholder="0"><span>${esc(x.um)}</span></div>
        <div class="cf-peb"><button class="btn" data-act="cf-pcok" data-i="${i}">Pronto</button><button class="btn sec" data-act="cf-pcx">Voltar</button></div></div></div>`;
      if(R.parc[i]!=null){ a=a.replace(/class="cf-i[^"]*"/,'class="cf-i on cf-pcon"'); mid=mid.replace(/<span class="cf-q num">[\s\S]*?<\/span><span class="cf-ok">[\s\S]*?<\/span>/,`<span class="cf-q num">${fQ(R.parc[i])}<small>de ${fQ(x.q)} ${esc(x.um)}</small></span><span class="cf-ok">Menos</span>`); }
      const pcb=`<button class="cf-nv cf-pc ${R.parc[i]!=null?'on':''}" data-act="cf-pc" data-i="${i}">${R.parc[i]!=null?'Mudar':'Menos'}</button>`;
      return `<div class="cf-w">${a}${mid}<div class="cf-bts">${pcb}${nvb}</div></div>`; });
  }catch(e){ console.warn('[parcial]',e); } return h; }; }
document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cf-pc"],[data-act="cf-pcok"],[data-act="cf-pcx"],[data-act="cf-ok"],[data-act="cf-nv"]'); if(!b||!ttEntrega()) return; const R=S.tt.rch; if(!R) return; R.parc=R.parc||{}; const a=b.dataset.act, i=+b.dataset.i;
  if(a==='cf-ok'||a==='cf-nv'){ if(R.parc[i]!=null){ delete R.parc[i]; if(a==='cf-ok'){ R.ck[i]=false; } } return; }
  ev.stopPropagation();
  if(a==='cf-pc'){ R.pe=i; render(); setTimeout(()=>{ const e=document.getElementById('cf-pq'); if(e){ e.focus(); e.select&&e.select(); } },60); return; }
  if(a==='cf-pcx'){ R.pe=null; render(); return; }
  if(a==='cf-pcok'){ const x=R.itens[i], v=parseFloat(String((document.getElementById('cf-pq')||{}).value||'').replace(',','.'));
    if(!(v>0)){ ttMsg('Digite quanto foi separado. Se não separou nada, volte e deixe sem OK.'); return; }
    if(v>=+x.q){ delete R.parc[i]; R.ck[i]=true; } else { R.parc[i]=_r3(v); R.ck[i]=true; } if(R.nv) delete R.nv[i]; R.pe=null; R.cfConf=false; render(); } },true);
document.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&ev.target&&ev.target.id==='cf-pq'){ ev.preventDefault(); const b=document.querySelector('[data-act="cf-pcok"]'); if(b) b.click(); } });
{ const _tv=ttVoltar; ttVoltar=function(){ try{ if(S.tt.rch){ S.tt.rch.parc={}; S.tt.rch.pe=null; } }catch(e){} return _tv.apply(this,arguments); }; }
/* ---------- tela mais simples ---------- */
{ const _vt=vTotem; vTotem=function(){ let h=_vt.apply(this,arguments); try{ if(!ttEntrega()||typeof h!=='string') return h;
    h=h.replace(/<small class="rd-pr">[\s\S]*?<\/small>/,'');                        /* sem o nome do produto no cartão */
    h=h.replace(/<div class="tt-ola">Separando: <b>[^<]*<\/b><\/div>/,'');             /* o nome já está no topo */
    h=h.replace(/<p class="cf-nvinfo">[\s\S]*?<\/p>/,'');
    h=h.replace(/<div class="tt-cst">(?:<div[^>]*><b>[^<]*<\/b><span>[^<]*<\/span><\/div>){2}<\/div>/,'');                /* quadros Separado/Entregue */
    h=h.replace(/<button class="btn sec tt-big" data-act="tt-econf">[^<]*<\/button>/,''); /* "Conferir item a item" */
    h=h.replace(/<p class="sr-obs">[\s\S]*?<\/p>/,'<p class="sr-obs">Fica para depois (complemento).</p>');
    h=h.replace('<button class="btn sec tt-big" data-act="ep-abre">Entregar só uma parte</button>','<button class="lnk tt-ep" data-act="ep-abre">Entregar só uma parte</button>');
  }catch(e){} return h; }; }
document.head.insertAdjacentHTML('beforeend',`<style id="pc-css">
.cf-bts{display:flex;gap:8px;justify-content:flex-end;margin-top:-2px}.cf-bts .cf-nv{margin:0}
.cf-i.cf-pcon{background:var(--warn-tint);border-color:var(--warn)}.cf-i.cf-pcon .cf-ok{background:var(--warn);border-color:var(--warn);color:#2a1f05}
.cf-i.cf-pcon .cf-q small{font-size:12px}
.cf-pe{background:var(--surface);border:3px solid var(--warn);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}
.cf-pe b{font-size:19px}.cf-pe label{font-size:18px;font-weight:700}.cf-pe label span{font-weight:500;color:var(--muted);font-size:15px}
.cf-per{display:flex;align-items:center;gap:10px}.cf-per input{height:64px;font-size:30px;font-weight:800;text-align:right;flex:1;min-width:0}.cf-per span{font-size:20px;font-weight:700;color:var(--muted)}
.cf-peb{display:flex;gap:10px}.cf-peb .btn{flex:1;height:58px;font-size:19px}
.tt-ep{display:block;width:100%;text-align:center;padding:12px 0;font-size:16px}
</style>`);
/* ===FIM QUANTIDADE PARCIAL=== */
