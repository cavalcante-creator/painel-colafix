/* RH · Cartão de aniversário (pedido de 13/10, noite)
   Cartão em imagem (1080×1350, bom para WhatsApp e para imprimir) com a logo da Colafix, o nome da pessoa e uma mensagem.
   Abre pelo Início ("Hoje é aniversário de…"), pelo cartão "Aniversários do mês" e pelo perfil da pessoa.
   Também serve para tempo de casa (1, 5, 10… anos). Nada é gravado, só a última mensagem usada (rh/config.anivMsg / casaMsg). */
(function(){
  const C={ab:null,ctx:null,fontes:false};
  const TEMAS={
    festa:{nome:'Festa',fundo:['#FBF4EA','#F4E6D3'],tit:'#1B5C7A',nome2:'#C8102E',txt:'#2B3A42',sub:'#6B7780',conf:['#C8102E','#1B5C7A','#E9A23B','#3E8E6E','#7FB3CF','#F28C8C']},
    azul:{nome:'Azul Colafix',fundo:['#1B5C7A','#0E3346'],tit:'#FFFFFF',nome2:'#FFD27A',txt:'#EAF2F6',sub:'#B8D0DC',conf:['#FFD27A','#FFFFFF','#7FB3CF','#F28C8C','#9ED9BF']},
    rosa:{nome:'Rosa',fundo:['#FDEEF0','#F7D9DE'],tit:'#8E2C48',nome2:'#C8102E',txt:'#3A2A30',sub:'#7D6870',conf:['#C8102E','#E9A23B','#8E2C48','#F7A1B0','#7FB3CF']}};
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
    C.ab={id:f._id,tipo,nome:nomeCurto(f.nome),cheio:titulo(f.nome),setor:f.setor||'',tel:f.telefone||'',anos,dia:base?base.slice(5):hj.slice(5),
      msg:(R.cfg&&R.cfg[tipo==='aniv'?'anivMsg':'casaMsg'])||MSG[tipo],tema:(R.cfg&&R.cfg.anivTema)||'festa',idade:false};
    fontes(); ctx.P.render(); }
  function modal(ctx){ const A=C.ab; if(!A) return ''; C.ctx=ctx; const esc=ctx.esc;
    setTimeout(desenhar,0);
    return `<div class="rh-modal" data-act="rhc-x-fundo"><div class="rh-mbox rhc-box" role="dialog" aria-modal="true" aria-label="Cartão"><div class="rh-ch"><h2>${A.tipo==='aniv'?'Cartão de aniversário':'Cartão de tempo de casa'} · ${esc(A.cheio)}</h2><button class="lnk" data-act="rhc-x">Fechar</button></div>
      <div class="rhc-g"><div class="rhc-pv"><canvas id="rhc-cv" width="1080" height="1350" aria-label="Prévia do cartão"></canvas></div>
        <div class="rhc-f">
          <label><span class="label">Nome no cartão</span><input class="txt" id="rhc-nome" maxlength="40" value="${esc(A.nome)}"></label>
          <label><span class="label">Mensagem</span><textarea class="txt" id="rhc-msg" rows="5" maxlength="260">${esc(A.msg)}</textarea></label>
          <div><span class="label">Cores</span><div class="rhc-temas">${Object.entries(TEMAS).map(([k,t])=>`<button data-act="rhc-tema" data-v="${k}" aria-pressed="${A.tema===k}" title="${t.nome}"><i style="background:linear-gradient(135deg,${t.fundo[0]},${t.fundo[1]});border-color:${t.nome2}"></i>${t.nome}</button>`).join('')}</div></div>
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
  function desenhar(){ const cv=document.getElementById('rhc-cv'), A=C.ab; if(!cv||!A) return; const g=cv.getContext('2d'), W=1080, H=1350, T=TEMAS[A.tema]||TEMAS.festa, r=rnd(A.cheio+A.tema);
    const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,T.fundo[0]); gr.addColorStop(1,T.fundo[1]); g.fillStyle=gr; g.fillRect(0,0,W,H);
    /* confete só nas beiradas (não passa por cima do texto) */
    for(let i=0;i<150;i++){ const x=r()*W, y=r()*H; if(!(x<120||x>960||y<270||y>1290)) continue; g.save(); g.translate(x,y); g.rotate(r()*Math.PI); g.fillStyle=T.conf[i%T.conf.length]; g.globalAlpha=0.55+r()*0.4;
      if(i%3===0){ g.beginPath(); g.arc(0,0,6+r()*8,0,Math.PI*2); g.fill(); } else g.fillRect(-11,-5,22+r()*12,10); g.restore(); }
    balao(g,110,150,64,T.conf[0]); balao(g,222,95,48,T.conf[1]); balao(g,968,150,66,T.conf[2]); balao(g,862,92,46,T.conf[3%T.conf.length]);
    /* faixa branca com a logo */
    const logo=document.querySelector('.brand img');
    g.save(); g.fillStyle='rgba(255,255,255,.96)'; const lw=380, lh=118, lx=(W-lw)/2, ly=70; g.beginPath(); g.roundRect?g.roundRect(lx,ly,lw,lh,59):g.rect(lx,ly,lw,lh); g.fill(); g.restore();
    if(logo&&logo.complete&&logo.naturalWidth){ const k=Math.min((lw-70)/logo.naturalWidth,(lh-36)/logo.naturalHeight); const w=logo.naturalWidth*k, h=logo.naturalHeight*k; g.drawImage(logo,(W-w)/2,ly+(lh-h)/2,w,h); }
    g.textAlign='center'; g.textBaseline='alphabetic';
    /* bloco do meio, centralizado na altura */
    const tit=A.tipo==='aniv'?'Feliz aniversário':(A.anos>0?A.anos+(A.anos===1?' ano':' anos')+' de Colafix':'Tempo de casa'), tt=A.tipo==='aniv'?118:104;
    let tn=132; g.font=FN(800,tn); while(g.measureText(A.nome).width>900&&tn>60){ tn-=4; g.font=FN(800,tn); }
    let tm=48; g.font=FN(400,tm); let ls=quebra(g,A.msg,820); while(ls.length>6&&tm>32){ tm-=2; g.font=FN(400,tm); ls=quebra(g,A.msg,820); }
    const hSet=A.setor?50:0, hId=A.tipo==='aniv'&&A.idade&&A.anos>0?60:0, hMsg=ls.length?ls.length*tm*1.4:0;
    const total=tt+40+tn+hSet+hId+56+hMsg, topo0=250, base0=1150; let y=topo0+Math.max(0,(base0-topo0-total)/2)+tt;
    g.fillStyle=T.tit; g.font=FN('',tt,'script'); g.fillText(tit,W/2,y);
    y+=40+tn; g.fillStyle=T.nome2; g.font=FN(800,tn); g.fillText(A.nome,W/2,y-tn*0.12);
    if(hSet){ y+=hSet; g.fillStyle=T.sub; g.font=FN(600,34); g.fillText(A.setor.toUpperCase(),W/2,y); }
    if(hId){ y+=hId; g.fillStyle=T.tit; g.font=FN(600,40); g.fillText(A.anos+' anos',W/2,y); }
    y+=34; g.strokeStyle=T.nome2; g.globalAlpha=.5; g.lineWidth=4; g.beginPath(); g.moveTo(W/2-70,y); g.lineTo(W/2+70,y); g.stroke(); g.globalAlpha=1;
    g.fillStyle=T.txt; g.font=FN(400,tm); ls.forEach((l,i)=>g.fillText(l,W/2,y+22+tm+i*(tm*1.4)));
    /* rodapé */
    const d=A.dia.split('-'); g.fillStyle=T.sub; g.font=FN(400,32); g.fillText((+d[1])+' de '+MESES[+d[0]-1],W/2,H-140);
    g.fillStyle=T.tit; g.font=FN(600,40); g.fillText('Com carinho, Equipe Colafix',W/2,H-95); }

  /* ---------- ações ---------- */
  function ler(){ const A=C.ab; if(!A) return; const v=id=>document.getElementById(id); if(v('rhc-nome')) A.nome=v('rhc-nome').value.trim(); if(v('rhc-msg')) A.msg=v('rhc-msg').value.trim(); if(v('rhc-idade')) A.idade=v('rhc-idade').checked; }
  const nomeArq=()=>'Cartao-'+(C.ab.tipo==='aniv'?'aniversario':'tempo-de-casa')+'-'+C.ab.nome.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'-')+'.png';
  const blob=()=>new Promise(res=>{ desenhar(); document.getElementById('rhc-cv').toBlob(b=>res(b),'image/png'); });
  function guardaMsg(){ const c=C.ctx, A=C.ab, k=A.tipo==='aniv'?'anivMsg':'casaMsg'; if(!c||((c.R.cfg||{})[k]===A.msg&&(c.R.cfg||{}).anivTema===A.tema)) return;
    const d={[k]:A.msg,anivTema:A.tema}; c.P.db().doc('rh/config').set(d,{merge:true}).then(()=>{ if(c.R.cfg) Object.assign(c.R.cfg,d); }).catch(()=>{}); }
  document.addEventListener('input',ev=>{ const t=ev.target; if(C.ab&&t&&/^rhc-/.test(t.id||'')){ ler(); desenhar(); } });
  document.addEventListener('change',ev=>{ const t=ev.target; if(C.ab&&t&&t.id==='rhc-idade'){ ler(); desenhar(); } });
  document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="rhc-"]'); if(!b||!C.ab) return; const a=b.dataset.act, P=C.ctx.P;
    if(a==='rhc-x'||(a==='rhc-x-fundo'&&ev.target===b)){ C.ab=null; P.render(); return; }
    ler();
    if(a==='rhc-tema'){ C.ab.tema=b.dataset.v; P.render(); return; }
    if(a==='rhc-baixar'){ guardaMsg(); C.ctx.baixar(await blob(),nomeArq()); P.toast('Imagem baixada.'); return; }
    if(a==='rhc-share'){ guardaMsg(); try{ const f=new File([await blob()],nomeArq(),{type:'image/png'}); if(navigator.canShare&&navigator.canShare({files:[f]})) await navigator.share({files:[f],text:texto()}); else await navigator.share({text:texto()}); }catch(e){ if(e&&e.name!=='AbortError') P.erro(e); } return; }
    if(a==='rhc-zap'){ guardaMsg(); const tel=String(C.ab.tel||'').replace(/\D/g,''), n=tel?(tel.length<=11?'55'+tel:tel):''; window.open('https://wa.me/'+n+'?text='+encodeURIComponent(texto()),'_blank','noopener'); return; }
    if(a==='rhc-imp'){ guardaMsg(); desenhar(); const url=document.getElementById('rhc-cv').toDataURL('image/png'), w=window.open('','_blank'); if(!w) return P.toast('Libere as janelas (pop-up) para imprimir.');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cartão</title><style>@page{size:A4 portrait;margin:12mm}body{margin:0;display:flex;justify-content:center}img{width:100%;max-width:180mm}</style></head><body><img src="${url}" onload="setTimeout(()=>print(),200)"></body></html>`); w.document.close(); return; } });
  const texto=()=>{ const A=C.ab; return (A.tipo==='aniv'?'🎉 Feliz aniversário, '+A.nome.split(' ')[0]+'! ':'🎉 Parabéns pelos '+A.anos+(A.anos===1?' ano':' anos')+' de Colafix, '+A.nome.split(' ')[0]+'! ')+A.msg+' — Equipe Colafix'; };

  const st=document.createElement('style'); st.textContent=`
  .rhc-box{max-width:1000px}.rhc-g{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:22px;align-items:start}
  .rhc-pv canvas{width:100%;height:auto;display:block;border-radius:14px;box-shadow:0 6px 24px rgba(20,40,52,.18)}
  .rhc-f{display:flex;flex-direction:column;gap:14px}.rhc-f label{display:flex;flex-direction:column;gap:4px}.rhc-f label.rhc-ck{flex-direction:row;align-items:center;gap:8px}
  .rhc-temas{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.rhc-temas button{font:inherit;display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 12px 6px 6px;cursor:pointer}
  .rhc-temas button[aria-pressed="true"]{border-color:var(--teal);background:var(--teal-wash,#e4eef3);font-weight:700}.rhc-temas i{width:26px;height:26px;border-radius:50%;border:3px solid;display:block}
  .rhc-bt{display:flex;flex-wrap:wrap;gap:10px}
  .rh-cbts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .rh-2c .rh-an{grid-template-columns:50px minmax(0,1fr) auto}.rh-2c .rh-an .rh-anc{grid-column:3;grid-row:1/span 2;align-self:center;font-size:13px}
  @media (max-width:760px){ .rhc-g{grid-template-columns:minmax(0,1fr)} .rhc-pv{max-width:340px;margin:0 auto} }`;
  document.head.appendChild(st);
  window.RHCartao={abrir,modal,_C:C,desenhar};
})();
