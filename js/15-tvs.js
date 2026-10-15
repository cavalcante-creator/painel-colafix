/* Painel Colafix · 15-tvs.js — novo layout das telas de TV (aprovado nos protótipos "TVs da fábrica").
   Só leitura, sem filtros nem botões. Claro por padrão; escuro com "Fundo escuro na TV" (data-theme="dark").
   Fonte Archivo, cores sóbrias, cabeçalho com as duas logos, cartões grandes, pisca suave no crítico.
   Os números vêm das mesmas funções das telas antigas (corLista, entregueDe, ritDados/ritStats…). */
"use strict";
const TVN={ri:0,rt0:Date.now()};
function tvnFonte(){ if(document.getElementById('tvn-font')) return; try{ const l=document.createElement('link'); l.id='tvn-font'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,400;100,500;100,600;100,700;100,800&display=swap'; document.head.appendChild(l); }catch(e){} }
function tvnEsc(){ return document.documentElement.getAttribute('data-theme')==='dark'||(document.body.classList.contains('tv')&&typeof tvEscuro==='function'&&tvEscuro()); }
function tvnLogos(){ const claro=(document.querySelector('.brand img')||{}).src||'';
  return `<img class="tvn-logo" src="${tvnEsc()?'icons/logo-colafix-escuro.png':esc(claro)}" alt="Colafix"><img class="tvn-ass" src="icons/assinatura.png" alt="Assinatura da marca">`; }
function tvnStat(v,r,c){ return `<div class="tvn-st"><b class="${c||''}">${v}</b><span>${r}</span></div>`; }
function tvnEtq(c,t){ return `<span class="tvn-etq ${c}">${esc(t)}</span>`; }
function tvnCab(tit,sub,stats,nota){ const h=new Date();
  return `<header class="tvn-cab">${tvnLogos()}<i class="tvn-sep"></i><div class="tvn-tt"><h1>${tit}</h1><div>${sub}</div></div><div class="tvn-sts">${stats}</div>
    <div class="tvn-hr"><b>${pad(h.getHours())}:${pad(h.getMinutes())}</b><span>${nota}</span></div></header>`; }
function tvnPagina(cls,cab,corpo,rod){ tvnFonte(); return `<div class="tvn ${cls}">${cab}<div class="tvn-corpo">${corpo}<footer class="tvn-rod">${rod||''}</footer></div></div>`; }
const hm=iso=>{ const d=new Date(iso); return pad(d.getHours())+':'+pad(d.getMinutes()); };

/* ---------- 1 · Produção do dia ---------- */
function vTvnProd(){ const h=hojeStr(), an=anuladas(), agora=Date.now();
  const pendDe=x=>x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueDe(x)), cod=x=>x._pv?(x.codigo||codigoDe(x)):codigoDe(x);
  const nomeDe=x=>String(x.produto||'').replace(/^[A-Z0-9]+\s*[-—]\s*/,'');
  let totE=0, totP=0, nProd=0, nPar=0, nSet=0, ultG='';
  const cards=linhasOrd().map(l=>{ const xs=corLista(l,h), par=S.paradas.find(p=>p.linha===l&&!p.fim);
    const ents=S.entregas.filter(e=>!e.anula&&!an.has(e._id)&&e.em&&e.linha===l&&hojeStr(new Date(e.em))===h);
    const entH=ents.reduce((a,e)=>a+(+e.qtd||0),0), ult=ents.reduce((a,e)=>e.em>a?e.em:a,''); if(ult>ultG) ultG=ult;
    const ini=new Date(h+'T00:00:00').toISOString(), prog=xs.reduce((a,x)=>a+(x._pv?(+x.qtd||0):Math.max(0,(+x.total||0)-entregueAte(x,ini))),0);
    totE+=entH; totP+=prog; const ab=xs.filter(x=>pendDe(x)>0), cur=ab[0], atras=xs.some(x=>!x._pv&&ordAtras(x,h)&&pendDe(x)>0);
    const setup=par&&/setup|troca|limpez/i.test(par.motivo||'');
    const st=par?(setup?{c:'info',t:'SETUP'}:{c:'crit',t:'PARADA'}):!xs.length?{c:'neu',t:'NADA PROGRAMADO'}:!ab.length?{c:'neu',t:'TUDO PRODUZIDO'}:atras?{c:'warn',t:'ATRASADA'}:(entH>0||(cur&&entregueDe(cur)>0))?{c:'ok',t:'PRODUZINDO'}:{c:'neu',t:'AGUARDANDO INÍCIO'};
    if(st.t==='PRODUZINDO'||st.t==='ATRASADA') nProd++; if(st.c==='crit') nPar++; if(st.c==='info') nSet++;
    let agoraH='';
    if(cur){ const e=cur._pv?0:entregueDe(cur), tot=cur._pv?(+cur.qtd||0):(+cur.total||0), pc=tot?Math.min(100,e/tot*100):0, m=cur._pv?null:tvMat(cur);
      agoraH=`<div class="tvn-cod">${esc(cod(cur))}${!cur._pv&&dbPri(cur)===1?' '+tvnEtq('crit','URGENTE'):''}</div><div class="tvn-nm">${esc(nomeDe(cur))}</div>
        <div class="tvn-qq"><b>${f0(e)}</b><span>de ${f0(tot)}</span></div><div class="tvn-bar"><i class="${st.c}" style="width:${pc}%"></i></div>${m?`<div class="tvn-ran"><i style="background:${m.c}"></i>${esc(m.t)}</div>`:''}`; }
    else agoraH=`<div class="tvn-vz">${xs.length?'Todas as ordens do dia produzidas':'Nada programado hoje'}</div>`;
    const aviso=par?`<div class="tvn-av ${st.c}">${setup?'Setup':'Parada'} registrada às ${hm(par.inicio)} · ${esc(par.motivo||'sem motivo')}</div>`:'';
    const seg=ab[1]?`${esc(cod(ab[1]))} · ${f0(pendDe(ab[1]))}`:'—';
    const tempo=ult?agora-new Date(ult).getTime():0, velho=!par&&ab.length&&ult&&tempo>90*60000;
    return `<section class="tvn-card${st.c==='crit'?' tvn-pisca':''}" aria-label="${esc(l)}"><div class="tvn-ch"><h2>${esc(l)}</h2>${tvnEtq(st.c,st.t)}</div>${agoraH}${aviso}
      <div class="tvn-cf"><span>A seguir: <b>${seg}</b></span><span>No dia: <b>${f0(entH)} de ${f0(prog)}</b></span>
      <span class="tvn-ult${velho?' warn':''}">${ult?'Último apontamento '+hm(ult)+(velho?' · faz tempo':''):'Sem apontamento hoje'}</span></div></section>`; });
  const n=cards.length, cols=Math.max(1,Math.ceil(n/2)), pct=totP?Math.round(totE/totP*100):0;
  const tit=(t=>t.charAt(0).toUpperCase()+t.slice(1))(new Date(h+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}));
  return tvnPagina('tvn-prod',tvnCab('Produção do dia',esc(tit)+' · atualizado pelos apontamentos',tvnStat(pct+'%','FÁBRICA HOJE')+tvnStat(nProd+'/'+n,'PRODUZINDO')+tvnStat(nPar,'PARADA',nPar?'crit':'')+tvnStat(nSet,'EM SETUP'),ultG?'último apontamento '+hm(ultG):'sem apontamento hoje'),
    `<div class="tvn-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${n>cols?2:1},minmax(0,1fr))">${cards.join('')}</div>`,
    ['ok:Produzindo','warn:Atrasada','crit:Parada','info:Setup','neu:Tudo produzido / aguardando'].map(x=>{ const [c,t]=x.split(':'); return `<span class="tvn-lg"><i class="${c}"></i>${t}</span>`; }).join('')); }

/* ---------- 2 · Previsto × Realizado ---------- */
function tvnStC(k){ const s=ritSt(k); return {c:s.c==='neu'?'neu':s.c,t:s.t.toUpperCase()}; }
function tvnCurva(D,k){ const s=k.s, n=s.length, W=1060,H=500,x0=80,x1=930,y0=30,y1=420, cut=D.cut;
  let am=0, ar=0; const pts=s.map(x=>{ am+=x.p; if(!cut||x.d<=cut) ar+=x.r; return {d:x.d,m:am,r:ar,dr:x.r,dp:x.p,f:cut&&x.d>cut}; });
  const ym=Math.max(k.T,k.proj||0,ar)*1.08||1, X=i=>x0+(x1-x0)*(i+1)/n, Y=v=>y1-(y1-y0)*v/ym, ui=pts.filter(p=>!p.f).length-1;
  const passo=ym>200000?50000:ym>80000?20000:ym>30000?10000:ym>8000?2000:ym>2000?500:100;
  let g=''; for(let v=0;v<=ym;v+=passo) g+=`<line x1="${x0}" y1="${Y(v).toFixed(0)}" x2="${x1}" y2="${Y(v).toFixed(0)}" class="g"/><text x="${x0-12}" y="${(Y(v)+6).toFixed(0)}" text-anchor="end" class="t">${f0(v)}</text>`;
  const meta=`M${x0},${Y(0)} `+pts.map((p,i)=>`L${X(i).toFixed(0)},${Y(p.m).toFixed(0)}`).join(' ');
  const real=ui>=0?`M${x0},${Y(0)} `+pts.slice(0,ui+1).map((p,i)=>`L${X(i).toFixed(0)},${Y(p.r).toFixed(0)}`).join(' '):'';
  const area=ui>=0?`M${x0},${Y(0)} `+pts.slice(0,ui+1).map((p,i)=>`L${X(i).toFixed(0)},${Y(p.m).toFixed(0)}`).join(' ')+' '+pts.slice(0,ui+1).map((p,i)=>`L${X(ui-i).toFixed(0)},${Y(pts[ui-i].r).toFixed(0)}`).join(' ')+'Z':'';
  const bw=Math.max(6,(x1-x0)/n*0.55), bm=Math.max(...pts.map(p=>Math.max(p.dr,p.dp)),1);
  const bars=pts.slice(0,ui+1).map((p,i)=>{ const hh=Math.min(40,p.dr/bm*40); return `<rect x="${(X(i)-bw/2).toFixed(0)}" y="${(468-hh).toFixed(0)}" width="${bw.toFixed(0)}" height="${hh.toFixed(0)}" rx="3" class="${p.dr>=p.dp?'ok':'crit'}"/>`; }).join('');
  const xs=pts.map((p,i)=>i%2?'':`<text x="${X(i).toFixed(0)}" y="496" text-anchor="middle" class="t">${+p.d.slice(8)}</text>`).join('');
  const pj=ui>=0&&k.proj?`<line x1="${X(ui).toFixed(0)}" y1="${Y(pts[ui].r).toFixed(0)}" x2="${x1}" y2="${Y(k.proj).toFixed(0)}" class="pj"/><text x="${x1+12}" y="${(Y(k.proj)+6).toFixed(0)}" class="v ${k.proj<k.T?'crit':''}">${f0(k.proj)}</text><text x="${x1+12}" y="${(Y(k.proj)+26).toFixed(0)}" class="t">no ritmo atual</text>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Curva do mês: meta, apontado e projeção">${g}
    ${area?`<path d="${area}" class="at"/>`:''}<path d="${meta}" class="mt"/>${real?`<path d="${real}" class="rl"/>`:''}${pj}
    ${ui>=0?`<line x1="${X(ui).toFixed(0)}" y1="${y0}" x2="${X(ui).toFixed(0)}" y2="${y1}" class="hj"/><circle cx="${X(ui).toFixed(0)}" cy="${Y(pts[ui].r).toFixed(0)}" r="9" class="pt"/>`:''}
    <text x="${x1+12}" y="${(Y(k.T)+6).toFixed(0)}" class="v">${f0(k.T)}</text><text x="${x1+12}" y="${(Y(k.T)+26).toFixed(0)}" class="t">meta do mês</text>
    <line x1="${x0}" y1="468" x2="${x1}" y2="468" class="g"/>${bars}${xs}</svg>`; }
function vTvnRit(){ if(!S.rit.cp) S.rit.cp=hojeStr().slice(0,7); let D=null; try{ D=ritDados(S.rit.cp,S.rit.fonte); }catch(e){ console.warn('[TV]',e); }
  const mes=(([y,m])=>['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][+m-1]+' de '+y)(S.rit.cp.split('-'));
  if(!D) return tvnPagina('tvn-rit',tvnCab('Previsto × Realizado',mes,'',''),`<div class="tvn-vz grande">Aguardando a previsão do mês e os apontamentos…</div>`,'');
  const U=ritU(), LS=D.LS.filter(l=>ritStats(D,{l}).T>0);
  if(Date.now()-TVN.rt0>12000){ TVN.ri++; TVN.rt0=Date.now(); } const sel=LS.length?LS[TVN.ri%LS.length]:null;
  const tiles=LS.map(l=>{ const k=ritStats(D,{l}), s=tvnStC(k), p=k.T?Math.round(k.ra/k.T*100):0, e=k.T?Math.min(100,k.pa/k.T*100):0;
    return `<section class="tvn-tl${l===sel?' sel':''}" aria-label="${esc(l)}"><div class="tvn-ch"><b>${esc(l)}</b>${tvnEtq(s.c,s.t)}</div>
      <div class="tvn-pc"><b class="${s.c}">${p}%</b><span>${ritQ(k.ra,k.kg)} de ${ritQ(k.T,k.kg)}</span></div>
      <div class="tvn-bar m"><i class="${s.c}" style="width:${Math.min(100,p)}%"></i><em style="left:${e}%"></em></div>
      <span class="tvn-pr">${k.sal>0?`Precisa <b class="${s.c}">${ritQ(k.need,k.kg)}/dia</b>`:'Meta do mês batida'}</span></section>`; }).join('');
  const kT=ritStats(D,{}), pT=kT.T?Math.round(kT.ra/kT.T*100):0, sT=tvnStC(kT);
  const fam=f=>{ const ls=LS.filter(l=>ritFam(l)===f); if(!ls.length) return ''; const k=ritStats(D,{ls}), p=k.T?Math.round(k.ra/k.T*100):0; return tvnStat(p+'%',f==='arg'?'ARGAMASSAS':'REJUNTES',tvnStC(k).c); };
  let painel='';
  if(sel){ const k=ritStats(D,{l:sel}), s=tvnStC(k), kp=(r,v,c)=>`<div class="tvn-kp"><span>${r}</span><b class="${c||''}">${v}</b></div>`;
    painel=`<section class="tvn-cv"><div class="tvn-cvh"><div class="tvn-ch"><h2>${esc(sel)}</h2>${tvnEtq(s.c,s.t)}<span class="tvn-mut">${LS.indexOf(sel)+1} de ${LS.length} · troca sozinha</span></div>
      <div class="tvn-kps">${kp('META ATÉ HOJE',ritQ(k.pa,k.kg))}${kp('APONTADO',ritQ(k.ra,k.kg))}${kp('DESVIO',(k.dev<0?'−':'+')+ritQ(Math.abs(k.dev),k.kg),k.dev<0?'crit':'ok')}${kp('PRECISA/DIA',k.sal>0?ritQ(k.need,k.kg):'—','warn')}</div></div>
      <div class="tvn-svg">${tvnCurva(D,k)}</div></section>`; }
  const rows=Math.max(1,Math.ceil(LS.length/2));
  return tvnPagina('tvn-rit',tvnCab('Previsto × Realizado',mes+' · '+U+' · atualizado pelos apontamentos',tvnStat(pT+'%','DA META',sT.c)+tvnStat(kT.du+'/'+kT.n,'DIA ÚTIL')+fam('arg')+fam('rej'),'meta '+((S.rit.meta||'liq')==='liq'?'líquida':'comercial')),
    `<div class="tvn-rgrid"><div class="tvn-tls" style="grid-template-rows:repeat(${rows},minmax(0,1fr))">${tiles}</div>${painel}</div>`,
    `<span class="tvn-lg"><i class="lm"></i>meta</span><span class="tvn-lg"><i class="lr"></i>apontado</span><span class="tvn-lg"><i class="lp"></i>no ritmo atual</span><span class="tvn-lg"><i class="lh"></i>onde deveria estar hoje</span>`); }

/* ---------- registro: as telas novas substituem as antigas na lista de Telas de TV ---------- */
VIEWS.tvnprod={nome:'Produção do dia (TV)',ic:'tv',mob:'Produção TV'}; VIEWS.tvnrit={nome:'Previsto × Realizado (TV)',ic:'tv',mob:'Metas TV'};
CRUMB.tvnprod=VIEWS.tvnprod.nome; CRUMB.tvnrit=VIEWS.tvnrit.nome;
[['producao','tvnprod'],['analise','tvnrit']].forEach(([m,v])=>{ const M=MODS.find(x=>x.id===m); if(M&&!M.views.includes(v)) M.views.push(v); });
S.extViews=S.extViews||{}; S.extViews.tvnprod=vTvnProd; S.extViews.tvnrit=vTvnRit;
{ const _sr=spRota; spRota=function(v){ if(v==='tvnprod') return vTvnProd(); if(v==='tvnrit') return vTvnRit(); return _sr.apply(this,arguments); }; }
APR_TELAS.forEach(t=>{ if(t.k==='tvfab') t.v='tvnprod'; if(t.k==='ritmo') t.v='tvnrit'; });
setInterval(()=>{ if(S.view==='tvnrit'&&Date.now()-TVN.rt0>12000) rerenderSeguro(); },1000);

/* ---------- estilos ---------- */
document.head.insertAdjacentHTML('beforeend',`<style id="tvn-css">
.tvn{--pag:#EDF1F4;--card:#FFFFFF;--sombra:0 2px 6px rgba(20,63,84,.08);--tx:#143F54;--tx2:#55666F;--linha:#E3E8EC;--vazio:#DCE3E8;--cab:#FFFFFF;--cabtx:#143F54;--cabtx2:#55666F;--cabsep:#E3E8EC;
  --ok:#3C8A63;--info:#3F6F93;--warn:#AD8432;--crit:#B5473F;--neu:#7D8B93;--critbg:#F6E8E6;--critpulso:#ECCDC8;
  font-family:Archivo,'Segoe UI',system-ui,sans-serif;font-variant-numeric:tabular-nums;background:var(--pag);color:var(--tx);display:flex;flex-direction:column;min-height:calc(100vh - 160px);border-radius:14px;overflow:hidden}
:root[data-theme="dark"] .tvn{--pag:#0E1418;--card:#172026;--sombra:none;--tx:#EEF2F4;--tx2:#9FB0B9;--linha:#26323A;--vazio:#2B3842;--cab:#121A1F;--cabtx:#EEF2F4;--cabtx2:#9FB0B9;--cabsep:#2A363E;
  --ok:#5FA884;--info:#6C9AC0;--warn:#C9A55E;--crit:#D2665E;--critbg:#32201F;--critpulso:#4E2B29}
body.tv .tvn{width:1920px;height:1080px;min-height:0;border-radius:0;margin:0 auto}
body.tv #view:has(> .tvn){padding:0!important;max-width:none!important}
:root[data-theme="dark"] body.tv #view img.tvn-logo{background:none!important;padding:0!important}
.tvn-cab{background:var(--cab);display:flex;align-items:center;gap:26px;padding:0 40px;height:118px;flex:none;border-bottom:5px solid #E3312D}
.tvn-logo{height:54px;width:auto}.tvn-ass{height:48px;width:auto}.tvn-sep{width:1px;height:60px;background:var(--cabsep)}
.tvn-tt{min-width:0}.tvn-tt h1{margin:0;font-size:40px;font-weight:700;color:var(--cabtx);line-height:1.1;white-space:nowrap}.tvn-tt div{font-size:19px;color:var(--cabtx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvn-sts{margin-left:auto;display:flex}.tvn-st{padding:0 22px;border-left:1px solid var(--cabsep)}.tvn-st b{display:block;font-size:50px;font-weight:700;line-height:.95;color:var(--cabtx)}.tvn-st span{font-size:14px;font-weight:600;letter-spacing:.06em;color:var(--cabtx2)}
.tvn-st b.ok{color:var(--ok)}.tvn-st b.warn{color:var(--warn)}.tvn-st b.crit{color:var(--crit)}
.tvn-hr{padding-left:24px;border-left:1px solid var(--cabsep);text-align:right}.tvn-hr b{display:block;font-size:62px;font-weight:700;line-height:.95;color:var(--cabtx)}.tvn-hr span{font-size:14px;color:var(--cabtx2);white-space:nowrap}
.tvn-corpo{flex:1;min-height:0;padding:20px 40px 14px;display:flex;flex-direction:column;gap:16px}
.tvn-rod{display:flex;align-items:center;gap:22px;font-size:16px;color:var(--tx2)}.tvn-lg{display:inline-flex;align-items:center;gap:7px}.tvn-lg i{width:10px;height:10px;border-radius:3px;display:inline-block;background:var(--neu)}
.tvn-lg i.ok{background:var(--ok)}.tvn-lg i.warn{background:var(--warn)}.tvn-lg i.crit{background:var(--crit)}.tvn-lg i.info{background:var(--info)}
.tvn-lg i.lm{width:24px;height:0;border-top:3px dashed var(--tx2);border-radius:0;background:none}.tvn-lg i.lr{width:24px;height:5px;background:var(--info)}.tvn-lg i.lp{width:24px;height:0;border-top:3px dotted var(--info);border-radius:0;background:none}.tvn-lg i.lh{width:3px;height:16px;background:var(--tx)}
.tvn-etq{color:#FFFFFF;font-size:15px;font-weight:700;letter-spacing:.04em;border-radius:8px;padding:6px 12px;white-space:nowrap;background:var(--neu)}
.tvn-etq.ok{background:var(--ok)}.tvn-etq.warn{background:var(--warn)}.tvn-etq.crit{background:var(--crit)}.tvn-etq.info{background:var(--info)}
@keyframes tvnPisca{0%,100%{background:var(--critbg)}50%{background:var(--critpulso);box-shadow:0 0 0 3px var(--crit)}}
.tvn-pisca{animation:tvnPisca 1.3s ease-in-out infinite;border:2px solid var(--crit)!important;background:var(--critbg)!important}
.tvn-grid{flex:1;min-height:0;display:grid;gap:16px}
.tvn-card{background:var(--card);box-shadow:var(--sombra);border:1px solid transparent;border-radius:16px;padding:18px 22px;display:flex;flex-direction:column;gap:12px;min-width:0;overflow:hidden}
.tvn-ch{display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0}.tvn-ch h2{margin:0;font-size:30px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tvn-ch b{font-size:26px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvn-cod{font-size:36px;font-weight:700;line-height:1.05}.tvn-nm{font-size:20px;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvn-qq{display:flex;align-items:baseline;gap:8px}.tvn-qq b{font-size:66px;font-weight:800;line-height:1}.tvn-qq span{font-size:26px;color:var(--tx2)}
.tvn-bar{position:relative;height:14px;background:var(--vazio);border-radius:5px}.tvn-bar i{display:block;height:100%;border-radius:5px;background:var(--info)}
.tvn-bar i.ok{background:var(--ok)}.tvn-bar i.warn{background:var(--warn)}.tvn-bar i.crit{background:var(--crit)}.tvn-bar i.neu{background:var(--neu)}.tvn-bar em{position:absolute;top:-5px;width:3px;height:20px;background:var(--tx);border-radius:2px}
.tvn-ran{display:flex;align-items:center;gap:7px;font-size:19px;font-weight:600;color:var(--tx2)}.tvn-ran i{width:9px;height:9px;border-radius:50%;display:inline-block}
.tvn-av{font-size:20px;font-weight:700;line-height:1.25}.tvn-av.crit{color:var(--crit)}.tvn-av.info{color:var(--info)}
.tvn-vz{font-size:22px;color:var(--tx2);padding:14px 0}.tvn-vz.grande{flex:1;display:flex;align-items:center;justify-content:center;font-size:30px}
.tvn-cf{margin-top:auto;border-top:1px solid var(--linha);padding-top:9px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;font-size:18px;color:var(--tx2)}.tvn-cf b{color:var(--tx)}
.tvn-ult{grid-column:1/-1}.tvn-ult.warn{color:var(--warn);font-weight:700}
.tvn-rgrid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,40%) minmax(0,1fr);gap:16px}
.tvn-tls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-height:0}
.tvn-tl{background:var(--card);box-shadow:var(--sombra);border:2px solid transparent;border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;justify-content:center;gap:7px;min-width:0;overflow:hidden}.tvn-tl.sel{border-color:var(--info)}
.tvn-pc{display:flex;align-items:baseline;gap:10px;min-width:0}.tvn-pc b{font-size:46px;font-weight:800;line-height:1}.tvn-pc b.ok{color:var(--tx)}.tvn-pc b.warn{color:var(--warn)}.tvn-pc b.crit{color:var(--crit)}.tvn-pc span{font-size:19px;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvn-pr{font-size:18px;color:var(--tx2)}.tvn-pr b.warn{color:var(--warn)}.tvn-pr b.crit{color:var(--crit)}.tvn-pr b.ok,.tvn-pr b.neu{color:var(--tx)}
.tvn-cv{background:var(--card);box-shadow:var(--sombra);border-radius:16px;padding:18px 22px;display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0}
.tvn-cvh{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.tvn-cvh .tvn-ch{justify-content:flex-start;gap:14px}.tvn-cvh h2{font-size:36px;font-weight:800}
.tvn-mut{font-size:16px;color:var(--tx2)}.tvn-kps{display:flex;gap:28px}.tvn-kp span{display:block;font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--tx2)}.tvn-kp b{font-size:34px;font-weight:800;line-height:1.05}.tvn-kp b.crit{color:var(--crit)}.tvn-kp b.ok{color:var(--ok)}.tvn-kp b.warn{color:var(--warn)}
.tvn-svg{flex:1;min-height:0}.tvn-svg svg{width:100%;height:100%;display:block}
.tvn-svg .g{stroke:var(--linha);stroke-width:1}.tvn-svg .t{fill:var(--tx2);font-size:16px;font-family:inherit}.tvn-svg .v{fill:var(--tx);font-size:19px;font-weight:700;font-family:inherit}.tvn-svg .v.crit{fill:var(--crit)}
.tvn-svg .mt{fill:none;stroke:var(--tx2);stroke-width:3;stroke-dasharray:10 8}.tvn-svg .rl{fill:none;stroke:var(--info);stroke-width:5;stroke-linejoin:round}.tvn-svg .pj{stroke:var(--info);stroke-width:3;stroke-dasharray:4 7}
.tvn-svg .at{fill:var(--crit);fill-opacity:.13}.tvn-svg .hj{stroke:var(--tx);stroke-opacity:.35;stroke-width:2}.tvn-svg .pt{fill:var(--card);stroke:var(--info);stroke-width:4}.tvn-svg rect.ok{fill:var(--ok)}.tvn-svg rect.crit{fill:var(--crit)}
</style>`);
/* ===FIM TVS=== */
