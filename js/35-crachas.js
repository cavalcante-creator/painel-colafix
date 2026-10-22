/* Painel Colafix · 35-crachas.js (22/10)
   Crachás: especialidade do técnico (Mecânica, Elétrica, Apoio…), editar o crachá sem trocar o código,
   APAGAR (além de desativar) e impressão com o nome sempre inteiro (letra diminui para caber) e a especialidade. */
"use strict";
const CR_AREAS=['Mecânica','Elétrica','Mecânica e elétrica','Serralheria','Predial','Apoio / limpeza','Apoio / elétrica'];
S.cr.ed=null; S.cr.apagar=null;
function crAreaTxt(c){ return String(c&&c.area||'').trim(); }
/* "CARLOS RANNA - ELETRICA" → nome "CARLOS RANNA" e área "Elétrica" (para quem escreveu a área no nome) */
function crSeparaArea(nome){ const m=String(nome||'').match(/^(.*?)\s+-\s+(.+)$/); if(!m) return null; const resto=m[2].trim(), n=mxNorm(resto).replace(/\s*\/\s*/g,' / ');
  const ach=CR_AREAS.find(a=>mxNorm(a).replace(/\s*\/\s*/g,' / ')===n)||(/mec/.test(n)&&/el[eé]tr/.test(n)?'Mecânica e elétrica':/^mec/.test(n)?'Mecânica':/^el[eé]tr/.test(n)?'Elétrica':null);
  return {nome:m[1].trim(),area:ach||resto.replace(/^./,x=>x.toUpperCase()).replace(/(\/\s*)(\S)/g,(a,b,c)=>b+c.toUpperCase())}; }
function crAreaSel(id,val,papel){ const v=String(val||''), outra=v&&!CR_AREAS.includes(v);
  return `<select class="txt" id="${id}" aria-label="Especialidade" ${papel==='operador'?'disabled title="Só para técnico da manutenção"':''}><option value="">Especialidade…</option>${CR_AREAS.map(a=>`<option ${a===v?'selected':''}>${esc(a)}</option>`).join('')}<option value="__outra" ${outra?'selected':''}>Outra…</option></select>
   <input class="txt crx-outra" id="${id}-o" placeholder="Qual especialidade?" maxlength="30" value="${outra?esc(v):''}" ${outra?'':'hidden'}>`; }
function crAreaLer(id){ const s=document.getElementById(id); if(!s||s.disabled) return ''; if(s.value==='__outra') return String((document.getElementById(id+'-o')||{}).value||'').trim().slice(0,30); return s.value||''; }

/* ---------- tela: especialidade no novo crachá, editar e apagar em cada um ---------- */
{ const _v=vCrachas; vCrachas=function(){ let h=_v.apply(this,arguments); const C=S.cr;
  /* novo crachá: especialidade depois do papel */
  h=h.replace(/(<select class="txt" id="cr-papel">[\s\S]*?<\/select>)/,m=>m+crAreaSel('crx-area',C.f.area||'',C.f.papel||'operador'));
  /* cada linha: área no texto + Editar / Apagar */
  C.lista.forEach(c=>{ const id=esc(c._id), area=crAreaTxt(c);
    if(area) h=h.replace(`${esc(TT_PAPEL[c.papel]||c.papel)} · ${esc(c.linha||'todas as linhas')} · código ${esc(c.codigo)}`,`${esc(TT_PAPEL[c.papel]||c.papel)} · <b class="crx-ar">${esc(area)}</b> · ${esc(c.linha&&c.linha!=='*'?c.linha:'todas as linhas')} · código ${esc(c.codigo)}`);
    const acts=C.apagar===c._id?`<span class="crx-conf">Apagar de vez?</span><button class="eq-lk del" data-act="crx-apagar-ok" data-id="${id}">Sim, apagar</button><button class="eq-lk" data-act="crx-apagar-x">Não</button>`
      :`<button class="eq-lk" data-act="crx-ed" data-id="${id}">${ic('editar',15,2)}Editar</button><button class="eq-lk del" data-act="crx-apagar" data-id="${id}" title="Apaga o crachá. Os chamados antigos continuam com o nome.">${ic('lixo',15,2)}Apagar</button>`;
    const re=new RegExp('(<div class="mx-ea">[\\s\\S]*?data-id="'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"[\\s\\S]*?)(</div></div>)');
    h=h.replace(re,(m,a,b)=>a+acts+b);
  });
  /* janela de edição */
  if(C.ed){ const c=crDe(C.ed); if(c){ const sug=!crAreaTxt(c)?crSeparaArea(c.nome):null, nm=C.edF?C.edF.nome:(sug?sug.nome:c.nome), ar=C.edF?C.edF.area:(crAreaTxt(c)||(sug?sug.area:'')), ln=C.edF?C.edF.linha:(c.linha||''), pa=C.edF?C.edF.papel:(c.papel||'operador');
    h+=`<div class="crx-m" role="dialog" aria-modal="true" aria-labelledby="crx-t"><div class="crx-c"><h2 id="crx-t">Editar crachá</h2><p class="sub">O código continua o mesmo: o crachá que já está com a pessoa continua funcionando. Reimprima só se mudou o que aparece nele.</p>
      ${sug?`<p class="crx-dica">Separei a especialidade que estava no nome ("${esc(sug.area)}"). Confira antes de salvar.</p>`:''}
      <label for="crx-n">Nome que aparece no crachá</label><input class="txt" id="crx-n" maxlength="60" value="${esc(nm)}">
      <div class="crx-g"><div><label for="crx-p">Função</label><select class="txt" id="crx-p"><option value="operador" ${pa==='operador'?'selected':''}>Operador(a) da linha</option><option value="tecnico" ${pa==='tecnico'?'selected':''}>Técnico(a) da manutenção</option></select></div>
       <div><label for="crx-l">Linha</label><select class="txt" id="crx-l">${linhasOrd().map(l=>`<option ${ln===l?'selected':''}>${esc(l)}</option>`).join('')}<option value="*" ${ln==='*'||!ln?'selected':''}>Todas (manutenção)</option></select></div></div>
      <label for="crx-ea">Especialidade (técnico)</label><div class="crx-row">${crAreaSel('crx-ea',ar,pa)}</div>
      <div class="crx-b"><button class="btn sec" data-act="crx-ed-x">Cancelar</button><button class="btn" data-act="crx-ed-ok" data-id="${esc(c._id)}">Salvar</button></div></div></div>`; } }
  return h; }; }
document.addEventListener('change',ev=>{ const t=ev.target; if(!t||!t.id) return;
  if(t.id==='crx-area'||t.id==='crx-ea'){ const o=document.getElementById(t.id+'-o'); if(o){ o.hidden=t.value!=='__outra'; if(!o.hidden) o.focus(); } if(t.id==='crx-area') S.cr.f.area=t.value==='__outra'?'':t.value; }
  if(t.id==='cr-papel'){ const a=document.getElementById('crx-area'); if(a) a.disabled=t.value==='operador'; }
  if(t.id==='crx-p'){ const a=document.getElementById('crx-ea'); if(a) a.disabled=t.value==='operador'; } });
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="crx-"],[data-act="cr-add"]'); if(!b) return; const a=b.dataset.act, C=S.cr;
  if(!crPodeGerir()){ toast('Você não possui permissão para gerenciar crachás.'); return; }
  if(a==='cr-add'){ /* criação com a especialidade (substitui a do 08) */ ev.stopImmediatePropagation(); ev.preventDefault(); if(C.salv) return;
    const nome=String(($('#cr-nome')||{}).value||'').trim().replace(/\s+/g,' '), linha=($('#cr-linha')||{}).value||'', papel=($('#cr-papel')||{}).value||'operador', area=papel==='tecnico'?crAreaLer('crx-area'):'';
    if(nome.length<2){ toast('Escreva o nome.'); return; } if(!linha){ toast('Escolha a linha do funcionário.'); return; }
    if(C.lista.some(x=>x.ativo!==false&&mxNorm(x.nome)===mxNorm(nome))){ toast('Já existe um crachá ativo para '+nome+'.'); return; }
    C.salv=true; render(); try{ const cod=crCodigo(); await S.db.doc('crachas/'+cod).set({codigo:cod,nome,linha,papel,area:area||null,ativo:true,criadoEm:new Date().toISOString(),por:S.uid||null});
      C.f={nome:'',linha,papel,area:C.f.area||''}; toast('Crachá de '+nome+' criado. Toque em “Imprimir crachá”.'); }catch(e){ manErro(e,'Não foi possível salvar o crachá.'); } C.salv=false; render(); return; }
  ev.preventDefault();
  if(a==='crx-ed'){ C.ed=b.dataset.id; C.edF=null; C.apagar=null; render(); setTimeout(()=>{ const i=document.getElementById('crx-n'); i&&i.focus(); },40); return; }
  if(a==='crx-ed-x'){ C.ed=null; C.edF=null; render(); return; }
  if(a==='crx-ed-ok'){ const c=crDe(b.dataset.id); if(!c) return; const nome=String(($('#crx-n')||{}).value||'').trim().replace(/\s+/g,' '), papel=($('#crx-p')||{}).value||'operador', linha=($('#crx-l')||{}).value||'*', area=papel==='tecnico'?crAreaLer('crx-ea'):'';
    if(nome.length<2){ toast('Escreva o nome.'); return; } if(C.lista.some(x=>x._id!==c._id&&x.ativo!==false&&mxNorm(x.nome)===mxNorm(nome))){ toast('Já existe outro crachá ativo para '+nome+'.'); return; }
    b.disabled=true; try{ await S.db.doc('crachas/'+c._id).update({nome,papel,linha,area:area||null,alteradoEm:new Date().toISOString(),alteradoPor:S.uid||null}); Object.assign(c,{nome,papel,linha,area:area||null}); C.ed=null; C.edF=null; toast('Crachá de '+nome+' salvo.'); }
    catch(e){ manErro(e,'Não foi possível salvar.'); } b.disabled=false; render(); return; }
  if(a==='crx-apagar'){ C.apagar=b.dataset.id; render(); return; }
  if(a==='crx-apagar-x'){ C.apagar=null; render(); return; }
  if(a==='crx-apagar-ok'){ const c=crDe(b.dataset.id); if(!c) return; b.disabled=true; try{ await S.db.doc('crachas/'+c._id).delete(); C.lista=C.lista.filter(x=>x._id!==c._id); toast('Crachá de '+c.nome+' apagado.'); }
    catch(e){ manErro(e,'Não foi possível apagar.'); } C.apagar=null; render(); return; } },true);
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'&&S.cr&&S.cr.ed&&S.view==='mancrachas'){ S.cr.ed=null; render(); } });

/* ---------- impressão: nome inteiro (letra diminui), especialidade em destaque ---------- */
crPdf=async function(cs){ if(!window.jspdf){ toast('Gerador de PDF indisponível. Recarregue a página.'); return; } if(!cs.length){ toast('Nenhum crachá para imprimir.'); return; }
  const pdf=new window.jspdf.jsPDF('p','mm','a4'); const CW=87, CH=55, F=0.5, W=CW-2*F, Hc=CH-2*F, gx=8, x0=(210-2*CW-gx)/2, y0=(297-5*CH)/2; const logo=(document.querySelector('.brand img')||{}).src;
  const TW=W-43; /* largura do texto à esquerda do QR */
  cs.forEach((c,i)=>{ const k=i%10; if(i&&k===0) pdf.addPage(); const cx0=x0+(k%2)*(CW+gx), cy0=y0+Math.floor(k/2)*CH, x=cx0+F, y=cy0+F;
    const temCima=k<2, temBaixo=k>=8||i+2>=cs.length||k+2>=10; pdf.setDrawColor(150); pdf.setLineWidth(0.2);
    [[cx0,cy0,-1,-1],[cx0+CW,cy0,1,-1],[cx0,cy0+CH,-1,1],[cx0+CW,cy0+CH,1,1]].forEach(([mx,my,sx,sy])=>{ pdf.line(mx+sx*0.8,my,mx+sx*2.8,my); if(sy<0?temCima:temBaixo) pdf.line(mx,my+sy*0.8,mx,my+sy*2.8); });
    if(logo&&/^data:image\/png/.test(logo)){ try{ pdf.addImage(logo,'PNG',x+4,y+4,24,6); }catch(e){} } else { pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.setTextColor(227,49,45); pdf.text('Colafix',x+4,y+9); }
    desenharQR(pdf,crQrTexto(c.codigo),x+W-35,y+(Hc-30)/2-1,30);
    /* nome: até 2 linhas, letra de 14 até 9 pt para caber inteiro */
    const nome=String(c.nome||'').trim(); pdf.setFont('helvetica','bold'); let fs=14, nm=[];
    for(;fs>=9;fs-=0.5){ pdf.setFontSize(fs); nm=pdf.splitTextToSize(nome,TW); if(nm.length<=2&&nm.every(l=>pdf.getTextWidth(l)<=TW+.2)) break; }
    if(nm.length>2) nm=[nm[0],nm.slice(1).join(' ')];
    const lh=fs*0.36; pdf.setTextColor(0,0,0); pdf.text(nm,x+4,y+16,{lineHeightFactor:1.05}); let yy=y+16+(nm.length-1)*lh*1.05+5.2;
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(70,70,70); pdf.text(c.papel==='tecnico'?'Técnico(a) da manutenção':(TT_PAPEL[c.papel]||''),x+4,yy);
    const area=crAreaTxt(c), sub=c.papel==='tecnico'?(area||(c.linha&&c.linha!=='*'?c.linha:'Todas as linhas')):(c.linha&&c.linha!=='*'?c.linha:'Todas as linhas');
    yy+=4.6; pdf.setFont('helvetica','bold'); pdf.setFontSize(c.papel==='tecnico'&&area?10:8.5); pdf.setTextColor(20,63,84); const st=pdf.splitTextToSize(sub,TW)[0]; pdf.text(st,x+4,yy);
    pdfCode128(pdf,crBarras(c.codigo),x+3,y+37.5,W-45,8); pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5); pdf.setTextColor(90,90,90); pdf.text(crBarras(c.codigo)+' · QR na câmera ou barras no coletor',x+4,y+Hc-3.2); pdf.setTextColor(0,0,0); });
  await manBaixar(pdf,cs.length===1?'Cracha_'+String(cs[0].nome).replace(/\W+/g,'_')+'.pdf':'Crachas_manutencao.pdf','PDF com '+cs.length+' crachá(s). Imprima em 100% (sem ajustar à página): corte nas marcas (8,7 × 5,5 cm) e cole por cima do crachá de 8,6 × 5,4 cm.'); };

document.head.insertAdjacentHTML('beforeend',`<style id="crx-css">
.crx-ar{color:var(--teal-strong)}.crx-conf{font-size:13px;font-weight:600;color:var(--crit);align-self:center}
.crx-outra{max-width:180px}
.crx-m{position:fixed;inset:0;z-index:2000;background:rgba(14,30,40,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.crx-c{background:var(--surface);color:var(--ink);border-radius:16px;padding:22px 24px;width:min(520px,100%);display:flex;flex-direction:column;gap:8px;max-height:92vh;overflow:auto}
.crx-c h2{margin:0;font-size:20px}.crx-c label{font-size:13px;font-weight:600;color:var(--muted);margin-top:6px}.crx-c .txt{width:100%;box-sizing:border-box}
.crx-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.crx-g>div{display:flex;flex-direction:column;gap:4px}.crx-row{display:flex;gap:8px;flex-wrap:wrap}.crx-row .txt{flex:1 1 160px}
.crx-dica{margin:0;padding:8px 12px;border-radius:10px;background:var(--warn-tint);color:var(--warn-ink);font-size:13.5px}
.crx-b{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
@media (max-width:520px){.crx-g{grid-template-columns:1fr}}
</style>`);
