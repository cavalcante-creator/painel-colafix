/* RH · Cartão de aniversário (pedido de 13/10, noite)
   Cartão em imagem (1080×1350, bom para WhatsApp e para imprimir) com a logo da Colafix, o nome da pessoa e uma mensagem.
   Abre pelo Início ("Hoje é aniversário de…"), pelo cartão "Aniversários do mês" e pelo perfil da pessoa.
   Também serve para tempo de casa (1, 5, 10… anos). Nada é gravado, só a última mensagem usada (rh/config.anivMsg / casaMsg). */
(function(){
  const C={ab:null,ctx:null,fontes:false};
  const TEMAS={
    festa:{nome:'Festa',fundo:['#FBF4EA','#F4E6D3'],tit:'#1B5C7A',nome2:'#C8102E',txt:'#2B3A42',sub:'#6B7780',conf:['#C8102E','#1B5C7A','#E9A23B','#3E8E6E','#7FB3CF','#F28C8C']},
    azul:{nome:'Azul Colafix',escuro:true,fundo:['#1B5C7A','#0E3346'],tit:'#FFFFFF',nome2:'#FFD27A',txt:'#EAF2F6',sub:'#B8D0DC',conf:['#FFD27A','#FFFFFF','#7FB3CF','#F28C8C','#9ED9BF']},
    rosa:{nome:'Rosa',fundo:['#FDEEF0','#F7D9DE'],tit:'#8E2C48',nome2:'#C8102E',txt:'#3A2A30',sub:'#7D6870',conf:['#C8102E','#E9A23B','#8E2C48','#F7A1B0','#7FB3CF']},
    elegante:{nome:'Elegante',lay:'elegante',escuro:true,fundo:['#1F3A56','#0B1824'],tit:'#D9B26A',nome2:'#FFFFFF',txt:'#D6E0E8',sub:'#D9B26A'},
    moderno:{nome:'Moderno',lay:'moderno',fundo:['#F7F4EE','#F7F4EE'],tit:'#1B5C7A',nome2:'#1B5C7A',txt:'#2B3A42',sub:'#C8102E'},
    bolo:{nome:'Bolo',lay:'bolo',fundo:['#FFF8EE','#FBEBD8'],tit:'#C8102E',nome2:'#1B5C7A',txt:'#2B3A42',sub:'#6B7780',conf:['#C8102E','#1B5C7A','#E9A23B','#3E8E6E','#F28C8C']}};
  const MSG={aniv:'Que o seu novo ano seja cheio de saúde, alegria e conquistas. Obrigado por fazer parte da nossa equipe!',
    casa:'Obrigado por todos esses anos de dedicação e parceria. Que venham muitos outros juntos!'};
  const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const titulo=n=>String(n||'').toLowerCase().split(' ').map(w=>!w||['da','de','do','das','dos','e'].includes(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const nomeCurto=n=>{ const p=titulo(n).split(' ').filter(Boolean), ign=['da','de','do','das','dos','e']; const ult=[...p].reverse().find(w=>!ign.includes(w)); return p.length>1&&ult&&ult!==p[0]?p[0]+' '+ult:(p[0]||''); };

  function fontes(){ if(C.fontes) return; C.fontes=true; try{ const l=document.createElement('link'); l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@400;600;800&display=swap'; document.head.appendChild(l);
    l.onload=()=>{ Promise.all(['400 40px Poppins','800 40px Poppins','40px Pacifico'].map(f=>document.fonts.load(f))).then(()=>desenhar()).catch(()=>{}); }; }catch(e){} }
  const FN=(peso,tam,fam)=>`${peso} ${tam}px ${fam==='script'?'Pacifico, "Segoe Script", cursive':'Poppins, "Segoe UI", system-ui, sans-serif'}`;

  /* abre a janela do cartão para a pessoa (f = cadastro do funcionário) */
  function abrir(ctx,f,tipo){ C.ctx=ctx; const R=ctx.R, hj=ctx.P.hojeStr(); tipo=tipo==='casa'?'casa':'aniv';
    const base=tipo==='aniv'?f.nascimento:f.admissao, anos=/^\d{4}-\d\d-\d\d$/.test(base||'')?(+hj.slice(0,4)-+base.slice(0,4)):0;
    C.ab={id:f._id,tipo,nome:nomeCurto(f.nome),cheio:titulo(f.nome),setor:f.setor||'',funcao:f.funcao||'',info:(R.cfg&&R.cfg.anivInfo)||'funcao',tel:f.telefone||'',anos,dia:base?base.slice(5):hj.slice(5),
      msg:(R.cfg&&R.cfg[tipo==='aniv'?'anivMsg':'casaMsg'])||MSG[tipo],tema:(R.cfg&&R.cfg.anivTema)||'festa',idade:false};
    fontes(); ctx.P.render(); }
  /* 14/10: o RH escolhe o que vai embaixo do nome: a função (padrão), o setor ou nada */
  function subT(A){ return A.info==='nada'?'':A.info==='setor'?(A.setor||''):(A.funcao||''); }
  function faixaSub(g,A,x,y,larg){ const t=subT(A).toUpperCase(); let s=32; g.font=FN(600,s); g.letterSpacing='4px'; while(g.measureText(t).width>larg&&s>20){ s-=2; g.font=FN(600,s); } g.fillText(t,x,y); g.letterSpacing='0px'; }
  function modal(ctx){ const A=C.ab; if(!A) return ''; C.ctx=ctx; const esc=ctx.esc;
    setTimeout(()=>{ desenhar(); minis(); },0);
    return `<div class="rh-modal" data-act="rhc-x-fundo"><div class="rh-mbox rhc-box" role="dialog" aria-modal="true" aria-label="Cartão"><div class="rh-ch"><h2>${A.tipo==='aniv'?'Cartão de aniversário':'Cartão de tempo de casa'} · ${esc(A.cheio)}</h2><button class="lnk" data-act="rhc-x">Fechar</button></div>
      <div class="rhc-g"><div class="rhc-pv"><canvas id="rhc-cv" width="1080" height="1350" aria-label="Prévia do cartão"></canvas></div>
        <div class="rhc-f">
          <label><span class="label">Nome no cartão</span><input class="txt" id="rhc-nome" maxlength="40" value="${esc(A.nome)}"></label>
          <label><span class="label">Mensagem</span><textarea class="txt" id="rhc-msg" rows="5" maxlength="260">${esc(A.msg)}</textarea></label>
          <div><span class="label">Modelo</span><div class="rhc-mods">${Object.entries(TEMAS).map(([k,t])=>`<button data-act="rhc-tema" data-v="${k}" aria-pressed="${A.tema===k}" title="${t.nome}"><canvas class="rhc-mini" data-m="${k}" width="216" height="270" aria-hidden="true"></canvas><span>${t.nome}</span></button>`).join('')}</div></div>
          <div><span class="label">Embaixo do nome</span><div class="seg rhc-info">${[['funcao','Função'+(A.funcao?'':' (sem cadastro)')],['setor','Setor'+(A.setor?'':' (sem cadastro)')],['nada','Não mostrar']].map(([v,l])=>`<button data-act="rhc-info" data-v="${v}" aria-pressed="${A.info===v}">${esc(l)}</button>`).join('')}</div>${subT(A)?`<small class="rhc-infot">Vai sair: ${esc(subT(A))}</small>`:''}</div>
          ${A.tipo==='aniv'&&A.anos>0?`<label class="rhc-ck"><input type="checkbox" id="rhc-idade" ${A.idade?'checked':''}> Mostrar a idade (${A.anos} anos)</label>`:''}
          <div class="rhc-bt"><button class="btn" data-act="rhc-baixar">${ctx.P.ic('baixar',18,2.2)}Baixar imagem</button>
            ${navigator.share?'<button class="btn sec" data-act="rhc-share">Compartilhar (WhatsApp…)</button>':''}
            <button class="btn sec" data-act="rhc-zap">Mandar mensagem no WhatsApp</button><button class="btn sec" data-act="rhc-imp">Imprimir</button></div>
          <div class="sub" style="font-size:12.5px">No celular, "Compartilhar" manda a imagem direto no WhatsApp. No computador, baixe a imagem e anexe na conversa.</div>
        </div></div></div></div>`; }

  /* ---------- desenho ---------- */
  function rnd(seed){ let s=0; for(const ch of seed) s=(s*31+ch.charCodeAt(0))>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
  function quebra(g,txt,larg){ const ls=[]; String(txt||'').split('\n').forEach(par=>{ let l=''; par.split(/\s+/).forEach(w=>{ const t=l?l+' '+w:w; if(g.measureText(t).width>larg&&l){ ls.push(l); l=w; } else l=t; }); ls.push(l); }); return ls; }
  function balao(g,x,y,r,cor){ g.save(); g.fillStyle=cor; g.beginPath(); g.ellipse(x,y,r*0.82,r,0,0,Math.PI*2); g.fill();
    g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x-r*0.3,y-r*0.38,r*0.16,r*0.26,-0.5,0,Math.PI*2); g.fill();
    g.fillStyle=cor; g.beginPath(); g.moveTo(x-9,y+r+10); g.lineTo(x+9,y+r+10); g.lineTo(x,y+r-4); g.fill();
    g.strokeStyle='rgba(60,60,60,.45)'; g.lineWidth=2.5; g.beginPath(); g.moveTo(x,y+r+10); g.bezierCurveTo(x+18,y+r+40,x-18,y+r+70,x+4,y+r+105); g.stroke(); g.restore(); }
  function logoPara(escuro){ const im=document.querySelector('.brand img'); if(!im||!im.complete||!im.naturalWidth) return null; if(!escuro) return im;
    if(C.logoClaro&&C.logoClaro._src===im.src) return C.logoClaro;
    const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const x=c.getContext('2d'); x.drawImage(im,0,0);
    try{ const d=x.getImageData(0,0,c.width,c.height), p=d.data; for(let i=0;i<p.length;i+=4){ const r=p[i],g=p[i+1],b=p[i+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b); if(mx-mn<60&&mx<140){ p[i]=p[i+1]=p[i+2]=255; } } x.putImageData(d,0,0); }catch(e){ return im; }
    c._src=im.src; C.logoClaro=c; return c; }
  /* medidas comuns: título, nome que encolhe até caber, mensagem quebrada em linhas */
  function medir(g,A,larg,tn0,tm0){ let tn=tn0; g.font=FN(800,tn); while(g.measureText(A.nome).width>larg&&tn>56){ tn-=4; g.font=FN(800,tn); }
    let tm=tm0; g.font=FN(400,tm); let ls=quebra(g,A.msg,larg-60); while(ls.length>6&&tm>30){ tm-=2; g.font=FN(400,tm); ls=quebra(g,A.msg,larg-60); } return {tn,tm,ls}; }
  const titTxt=A=>A.tipo==='aniv'?'Feliz aniversário':(A.anos>0?A.anos+(A.anos===1?' ano':' anos')+' de Colafix':'Tempo de casa');
  const diaTxt=A=>{ const d=A.dia.split('-'); return (+d[1])+' de '+MESES[+d[0]-1]; };
  function logoEm(g,escuro,cx,y,lw,lh,esq){ const logo=logoPara(escuro); if(!logo) return; const k=Math.min(lw/logo.width,lh/logo.height), w=logo.width*k, h=logo.height*k; g.drawImage(logo,esq?cx:cx-w/2,y+(lh-h)/2,w,h); }
  function confete(g,r,cores,n,fora){ for(let i=0;i<n;i++){ const x=r()*1080, y=r()*1350; if(fora(x,y)) continue; g.save(); g.translate(x,y); g.rotate(r()*Math.PI); g.fillStyle=cores[i%cores.length]; g.globalAlpha=0.55+r()*0.4;
    if(i%3===0){ g.beginPath(); g.arc(0,0,6+r()*8,0,Math.PI*2); g.fill(); } else g.fillRect(-11,-5,22+r()*12,10); g.restore(); } }
  function fundo(g,T,W,H){ const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,T.fundo[0]); gr.addColorStop(1,T.fundo[1]); g.fillStyle=gr; g.fillRect(0,0,W,H); }
  /* bloco central (título, nome, setor, idade, linha, mensagem), centralizado entre topo0 e base0 */
  function miolo(g,A,T,W,topo0,base0,o){ o=o||{}; const tt=o.tt||(A.tipo==='aniv'?118:104), m=medir(g,A,900,o.tn||132,46);
    const hSet=subT(A)?50:0, hId=A.tipo==='aniv'&&A.idade&&A.anos>0?60:0, fixo=(o.semTit?0:tt+40)+m.tn+hSet+hId+56;
    while(fixo+m.ls.length*m.tm*1.4>base0-topo0&&m.tm>28){ m.tm-=2; g.font=FN(400,m.tm); m.ls=quebra(g,A.msg,840); }
    const hMsg=m.ls.length*m.tm*1.4, total=fixo+hMsg;
    let y=topo0+Math.max(0,(base0-topo0-total)/2); g.textAlign='center';
    if(!o.semTit){ y+=tt; g.fillStyle=T.tit; g.font=FN('',tt,'script'); g.fillText(o.tit||titTxt(A),W/2,y); y+=40; }
    y+=m.tn; g.fillStyle=T.nome2; g.font=FN(o.pesoNome||800,m.tn); if(o.esp) g.letterSpacing=o.esp+'px'; g.fillText(o.maius?A.nome.toUpperCase():A.nome,W/2,y-m.tn*0.12); g.letterSpacing='0px';
    if(hSet){ y+=hSet; g.fillStyle=T.sub; faixaSub(g,A,W/2,y,900); }
    if(hId){ y+=hId; g.fillStyle=T.tit; g.font=FN(600,40); g.fillText(A.anos+' anos',W/2,y); }
    y+=34; if(o.losango){ g.strokeStyle=T.sub; g.lineWidth=2; g.beginPath(); g.moveTo(W/2-150,y); g.lineTo(W/2-18,y); g.moveTo(W/2+18,y); g.lineTo(W/2+150,y); g.stroke(); g.fillStyle=T.sub; g.beginPath(); g.moveTo(W/2,y-10); g.lineTo(W/2+10,y); g.lineTo(W/2,y+10); g.lineTo(W/2-10,y); g.fill(); }
    else { g.strokeStyle=T.nome2; g.globalAlpha=.5; g.lineWidth=4; g.beginPath(); g.moveTo(W/2-70,y); g.lineTo(W/2+70,y); g.stroke(); g.globalAlpha=1; }
    g.fillStyle=T.txt; g.font=FN(400,m.tm); m.ls.forEach((l,i)=>g.fillText(l,W/2,y+22+m.tm+i*(m.tm*1.4))); }
  function rodape(g,A,T,W,H){ g.textAlign='center'; g.fillStyle=T.sub; g.font=FN(400,32); g.fillText(diaTxt(A),W/2,H-140); g.fillStyle=T.tit; g.font=FN(600,40); g.fillText('Com carinho, Equipe Colafix',W/2,H-95); }

  const MODELOS={
    festa(g,A,T,W,H,r){ fundo(g,T,W,H);
      confete(g,r,T.conf,150,(x,y)=>!(x<120||x>960||y<270||y>1290)||(x>290&&x<790&&y>50&&y<210));
      balao(g,110,150,64,T.conf[0]); balao(g,222,95,48,T.conf[1]); balao(g,968,150,66,T.conf[2]); balao(g,862,92,46,T.conf[3%T.conf.length]);
      logoEm(g,T.escuro,W/2,80,360,100); miolo(g,A,T,W,250,1150); rodape(g,A,T,W,H); },
    elegante(g,A,T,W,H,r){ const gr=g.createRadialGradient(W/2,H*0.42,80,W/2,H/2,900); gr.addColorStop(0,T.fundo[0]); gr.addColorStop(1,T.fundo[1]); g.fillStyle=gr; g.fillRect(0,0,W,H);
      g.strokeStyle=T.sub; g.lineWidth=3; g.strokeRect(40,40,W-80,H-80); g.lineWidth=1.2; g.strokeRect(56,56,W-112,H-112);
      [[40,40],[W-40,40],[40,H-40],[W-40,H-40]].forEach(([x,y])=>{ g.fillStyle=T.sub; g.beginPath(); g.moveTo(x,y-14); g.lineTo(x+14,y); g.lineTo(x,y+14); g.lineTo(x-14,y); g.fill(); });
      for(let i=0;i<46;i++){ const x=80+r()*(W-160), y=80+r()*(H-160); if(x>170&&x<910&&y>200&&y<1160) continue; if(x>220&&x<860&&y>1150) continue; if(x>330&&x<750&&y<210) continue; const s=4+r()*12; g.save(); g.translate(x,y); g.globalAlpha=.45+r()*.5; g.fillStyle=T.sub; g.beginPath();
        g.moveTo(0,-s*2); g.quadraticCurveTo(0,0,s*2,0); g.quadraticCurveTo(0,0,0,s*2); g.quadraticCurveTo(0,0,-s*2,0); g.quadraticCurveTo(0,0,0,-s*2); g.fill(); g.restore(); }
      logoEm(g,true,W/2,100,330,92); miolo(g,A,T,W,240,1150,{tn:104,pesoNome:600,maius:true,esp:6,losango:true}); rodape(g,A,T,W,H); },
    moderno(g,A,T,W,H,r){ g.fillStyle=T.fundo[0]; g.fillRect(0,0,W,H);
      g.fillStyle='#1B5C7A'; g.beginPath(); g.moveTo(0,0); g.lineTo(W,0); g.lineTo(W,470); g.lineTo(0,590); g.closePath(); g.fill();
      g.strokeStyle='#C8102E'; g.lineWidth=14; g.beginPath(); g.moveTo(0,604); g.lineTo(W,484); g.stroke();
      logoEm(g,true,80,70,250,72,true);
      g.textAlign='left'; g.fillStyle='#FFFFFF'; const l1=A.tipo==='aniv'?'FELIZ':'PARABÉNS PELOS', l2=A.tipo==='aniv'?'ANIVERSÁRIO':(A.anos>0?A.anos+(A.anos===1?' ANO':' ANOS')+' DE CASA':'TEMPO DE CASA');
      g.font=FN(400,58); g.letterSpacing='6px'; g.fillText(l1,80,280); g.letterSpacing='0px'; let t2=104; g.font=FN(800,t2); while(g.measureText(l2).width>620&&t2>50){ t2-=4; g.font=FN(800,t2); } g.fillText(l2,76,280+t2+6);
      const ini=A.nome.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase(), cx=W-230, cy=500;
      g.fillStyle='#FFFFFF'; g.beginPath(); g.arc(cx,cy,150,0,Math.PI*2); g.fill(); g.strokeStyle='#C8102E'; g.lineWidth=10; g.stroke();
      g.fillStyle='#1B5C7A'; g.font=FN(800,120); g.textAlign='center'; g.textBaseline='middle'; g.fillText(ini,cx,cy+6); g.textBaseline='alphabetic';
      const m=medir(g,A,900,120,46); g.textAlign='left'; let y=760; g.fillStyle=T.nome2; g.font=FN(800,m.tn); g.fillText(A.nome,80,y);
      if(subT(A)){ y+=56; g.fillStyle=T.sub; faixaSub(g,A,82,y,880); }
      if(A.tipo==='aniv'&&A.idade&&A.anos>0){ y+=56; g.fillStyle=T.tit; g.font=FN(600,38); g.fillText(A.anos+' anos',82,y); }
      y+=40; g.fillStyle='#C8102E'; g.fillRect(82,y,90,8); g.fillStyle=T.txt; g.font=FN(400,m.tm); const ls=quebra(g,A.msg,900); ls.forEach((l,i)=>g.fillText(l,80,y+40+m.tm+i*m.tm*1.4));
      g.fillStyle=T.tit; g.font=FN(600,38); g.fillText('Com carinho, Equipe Colafix',80,H-110); g.fillStyle='#6B7780'; g.font=FN(400,30); g.textAlign='right'; g.fillText(diaTxt(A),W-80,H-110);
      g.fillStyle='#C8102E'; g.fillRect(0,H-26,W,26); g.fillStyle='#1B5C7A'; g.fillRect(0,H-26,W*0.62,26); },
    bolo(g,A,T,W,H,r){ fundo(g,T,W,H); confete(g,r,T.conf,130,(x,y)=>!(x<130||x>950||y<230||y>1290)||(x>290&&x<790&&y>40&&y<200));
      logoEm(g,false,W/2,44,300,84);
      const cx=W/2, base=540; g.fillStyle='rgba(0,0,0,.08)'; g.beginPath(); g.ellipse(cx,base+14,250,30,0,0,Math.PI*2); g.fill();
      g.fillStyle='#FFFFFF'; g.beginPath(); g.ellipse(cx,base,240,26,0,0,Math.PI*2); g.fill();
      const cam=(w,h,y,cor,cob)=>{ g.fillStyle=cor; g.beginPath(); g.roundRect?g.roundRect(cx-w/2,y-h,w,h,18):g.rect(cx-w/2,y-h,w,h); g.fill();
        g.fillStyle=cob; g.beginPath(); g.moveTo(cx-w/2,y-h+20); for(let k=0;k<=8;k++){ const x=cx-w/2+k*w/8; g.quadraticCurveTo(x-w/16,y-h+50+(k%2?18:0),x,y-h+22); } g.lineTo(cx+w/2,y-h); g.lineTo(cx-w/2,y-h); g.closePath(); g.fill();
        g.fillStyle='rgba(255,255,255,.7)'; for(let k=0;k<6;k++){ g.beginPath(); g.arc(cx-w/2+40+k*(w-80)/5,y-h*0.42,6,0,Math.PI*2); g.fill(); } };
      cam(380,120,base-6,'#F4A7B9','#C8102E'); cam(270,100,base-126,'#7FB3CF','#FFFFFF');
      const nv=A.tipo==='casa'&&A.anos>0?Math.min(A.anos,5):3;
      for(let k=0;k<nv;k++){ const x=cx-(nv-1)*34+k*68, y0=base-226; g.fillStyle=['#1B5C7A','#E9A23B','#3E8E6E','#7FB3CF','#C8102E'][k%5]; g.fillRect(x-9,y0-80,18,80);
        g.fillStyle='rgba(255,255,255,.6)'; for(let z=0;z<4;z++) g.fillRect(x-9,y0-74+z*20,18,6);
        const gl=g.createRadialGradient(x,y0-104,2,x,y0-104,40); gl.addColorStop(0,'rgba(255,214,102,.9)'); gl.addColorStop(1,'rgba(255,214,102,0)'); g.fillStyle=gl; g.beginPath(); g.arc(x,y0-104,40,0,Math.PI*2); g.fill();
        g.fillStyle='#F5A623'; g.beginPath(); g.ellipse(x,y0-102,10,20,0,0,Math.PI*2); g.fill(); g.fillStyle='#FFE08A'; g.beginPath(); g.ellipse(x,y0-98,5,11,0,0,Math.PI*2); g.fill(); }
      miolo(g,A,T,W,575,1150,{tt:100,tit:A.tipo==='aniv'?'Parabéns!':titTxt(A),tn:108}); rodape(g,A,T,W,H); } };
  function pinta(cv,A,mod){ const g=cv.getContext('2d'), W=1080, H=1350, T=TEMAS[mod]||TEMAS.festa, r=rnd(A.cheio+mod); g.save(); g.textBaseline='alphabetic'; g.letterSpacing='0px'; (MODELOS[T.lay||'festa'])(g,A,T,W,H,r); g.restore(); }
  function desenhar(){ const cv=document.getElementById('rhc-cv'), A=C.ab; if(!cv||!A) return; pinta(cv,A,A.tema); }
  /* miniaturas dos modelos (desenha grande fora da tela e reduz) */
  function minis(){ const A=C.ab; if(!A) return; const big=C.big||(C.big=Object.assign(document.createElement('canvas'),{width:1080,height:1350}));
    document.querySelectorAll('canvas.rhc-mini').forEach(m=>{ pinta(big,A,m.dataset.m); const x=m.getContext('2d'); x.clearRect(0,0,m.width,m.height); x.drawImage(big,0,0,m.width,m.height); }); }

  /* ---------- ações ---------- */
  function ler(){ const A=C.ab; if(!A) return; const v=id=>document.getElementById(id); if(v('rhc-nome')) A.nome=v('rhc-nome').value.trim(); if(v('rhc-msg')) A.msg=v('rhc-msg').value.trim(); if(v('rhc-idade')) A.idade=v('rhc-idade').checked; }
  const nomeArq=()=>'Cartao-'+(C.ab.tipo==='aniv'?'aniversario':'tempo-de-casa')+'-'+C.ab.nome.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'-')+'.png';
  const blob=()=>new Promise(res=>{ desenhar(); document.getElementById('rhc-cv').toBlob(b=>res(b),'image/png'); });
  function guardaMsg(){ const c=C.ctx, A=C.ab, k=A.tipo==='aniv'?'anivMsg':'casaMsg'; if(!c||((c.R.cfg||{})[k]===A.msg&&(c.R.cfg||{}).anivTema===A.tema&&((c.R.cfg||{}).anivInfo||'funcao')===A.info)) return;
    const d={[k]:A.msg,anivTema:A.tema,anivInfo:A.info}; c.P.db().doc('rh/config').set(d,{merge:true}).then(()=>{ if(c.R.cfg) Object.assign(c.R.cfg,d); }).catch(()=>{}); }
  document.addEventListener('input',ev=>{ const t=ev.target; if(C.ab&&t&&/^rhc-/.test(t.id||'')){ ler(); desenhar(); clearTimeout(C.tm); C.tm=setTimeout(minis,600); } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(C.ab&&t&&t.id==='rhc-idade'){ ler(); desenhar(); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rhc-"]'); if(!b||!C.ab) return; const a=b.dataset.act, P=C.ctx.P;
    if(a==='rhc-x'||(a==='rhc-x-fundo'&&ev.target===b)){ C.ab=null; P.render(); return; }
    ler();
    if(a==='rhc-tema'){ C.ab.tema=b.dataset.v; P.render(); return; }
    if(a==='rhc-info'){ C.ab.info=b.dataset.v; P.render(); return; }
    if(a==='rhc-baixar'){ guardaMsg(); C.ctx.baixar(await blob(),nomeArq()); P.toast('Imagem baixada.'); return; }
    if(a==='rhc-share'){ guardaMsg(); try{ const f=new File([await blob()],nomeArq(),{type:'image/png'}); if(navigator.canShare&&navigator.canShare({files:[f]})) await navigator.share({files:[f],text:texto()}); else await navigator.share({text:texto()}); }catch(e){ if(e&&e.name!=='AbortError') P.erro(e); } return; }
    if(a==='rhc-zap'){ guardaMsg(); const tel=String(C.ab.tel||'').replace(/\D/g,''), n=tel?(tel.length<=11?'55'+tel:tel):''; window.open('https://wa.me/'+n+'?text='+encodeURIComponent(texto()),'_blank','noopener'); return; }
    if(a==='rhc-imp'){ guardaMsg(); desenhar(); const url=document.getElementById('rhc-cv').toDataURL('image/png'), w=window.open('','_blank'); if(!w) return P.toast('Libere as janelas (pop-up) para imprimir.');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cartão</title><style>@page{size:A4 portrait;margin:12mm}body{margin:0;display:flex;justify-content:center}img{width:100%;max-width:180mm}</style></head><body><img src="${url}" onload="setTimeout(()=>print(),200)"></body></html>`); w.document.close(); return; } });
  const texto=()=>{ const A=C.ab; return (A.tipo==='aniv'?'🎉 Feliz aniversário, '+A.nome.split(' ')[0]+'! ':'🎉 Parabéns pelos '+A.anos+(A.anos===1?' ano':' anos')+' de Colafix, '+A.nome.split(' ')[0]+'! ')+A.msg+' — Equipe Colafix'; };

  const st=document.createElement('style'); st.textContent=`
  .rhc-box{max-width:1000px}.rhc-g{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:22px;align-items:start}
  .rhc-pv canvas{width:100%;height:auto;display:block;border-radius:14px;box-shadow:0 6px 24px rgba(20,40,52,.18)}
  .rhc-f{display:flex;flex-direction:column;gap:14px}.rhc-f label{display:flex;flex-direction:column;gap:4px}.rhc-f label.rhc-ck{flex-direction:row;align-items:center;gap:8px}.rhc-info{margin-top:6px;flex-wrap:wrap}.rhc-infot{display:block;margin-top:4px;color:var(--muted);font-size:12.5px}
  .rhc-mods{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:4px}.rhc-mods button{font:inherit;font-size:12.5px;display:flex;flex-direction:column;align-items:center;gap:4px;border:2px solid transparent;background:none;border-radius:12px;padding:4px;cursor:pointer;color:var(--ink)}
  .rhc-mods button[aria-pressed="true"]{border-color:var(--teal);background:var(--teal-wash,#e4eef3);font-weight:700}.rhc-mini{width:100%;height:auto;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  @media (max-width:1100px){ .rhc-mods{grid-template-columns:repeat(3,minmax(0,1fr))} }
  .rhc-temas{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.rhc-temas button{font:inherit;display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 12px 6px 6px;cursor:pointer}
  .rhc-temas button[aria-pressed="true"]{border-color:var(--teal);background:var(--teal-wash,#e4eef3);font-weight:700}.rhc-temas i{width:26px;height:26px;border-radius:50%;border:3px solid;display:block}
  .rhc-bt{display:flex;flex-wrap:wrap;gap:10px}
  .rh-cbts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .rh-2c .rh-an{grid-template-columns:50px minmax(0,1fr) auto}.rh-2c .rh-an .rh-anc{grid-column:3;grid-row:1/span 2;align-self:center;font-size:13px}
  @media (max-width:760px){ .rhc-g{grid-template-columns:minmax(0,1fr)} .rhc-pv{max-width:340px;margin:0 auto} }`;
  document.head.appendChild(st);
  window.RHCartao={abrir,modal,_C:C,desenhar};
})();
