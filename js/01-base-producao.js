/* Painel Colafix · 01-base-producao.js — estado, telas principais, produção e programação.
   Todos os arquivos js/ compartilham o mesmo escopo global, na ordem do index.html. */
"use strict";

// ---------------- ícones ----------------
const P = {
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  silo:'<path d="M6.5 3.5h11v10.5l-3.5 4h-4l-3.5-4z"/><path d="M7.5 15.5l-1 5M16.5 15.5l1 5"/>',
  rota:'<circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="6" r="2"/><path d="M7.5 18h6a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7h6"/>',
  pausa:'<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
  play:'<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
  relogio:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  mais:'<path d="M12 5v14M5 12h14"/>',
  copiar:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  seta:'<path d="M9 6l6 6-6 6"/>',
  ajuste:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  zap:'<path d="M4.5 19.5l1.2-3.6A7.8 7.8 0 1 1 8.4 18.4z"/><path d="M9.3 8.8c.2 2.6 2.4 5 5.3 5.6l1-1.3-1.9-1-.8.8c-1-.4-1.9-1.3-2.3-2.3l.8-.8-1-1.9z"/>',
  folha:'<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>',
  premix:'<path d="M4 8h16l-2 11H6z"/><path d="M8 8V5h8v3"/>',
  baixar:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  lista:'<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1.1"/><circle cx="4.8" cy="12" r="1.1"/><circle cx="4.8" cy="17.5" r="1.1"/>',
  fila:'<path d="M4 5.5h16M4 10.5h16M4 15.5h9"/><path d="M16 15l2.5 2.5L16 20"/>',
  calendario:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  caixa:'<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9"/>',
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  grafico:'<path d="M4 20.5h16"/><rect x="5.5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="6" width="3" height="12" rx="1"/><rect x="15.5" y="13" width="3" height="5" rx="1"/>',
  fabrica:'<path d="M3.5 20.5V10l5 3V10l5 3V6.5h7v14z"/><path d="M7 17h2M12 17h2M17 17h1"/>'
};
const ic = (n,s=20,w=1.75) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;

// ---------------- configuração padrão (do documento do projeto) ----------------
const CFG_PADRAO = {
  silos:[
    {id:'c1',grupo:'Cimento',nome:'Silo Pequeno',cap:30},
    {id:'c2',grupo:'Cimento',nome:'Silo Grande',cap:70},
    {id:'c3',grupo:'Cimento',nome:'Silo Reserva',cap:30},
    {id:'a1',grupo:'Areia',nome:'Silo Verde',cap:60},
    {id:'a2',grupo:'Areia',nome:'Silo Grande',cap:90},
    {id:'a3',grupo:'Areia',nome:'Silo Reserva',cap:60},
    {id:'a4',grupo:'Areia',nome:'Moega',cap:20}
  ],
  produtos:[{id:'ac3',nome:'AC3',kgSaco:4,sacosPremix:100}],
  linhas:['Linha 1','Linha 2','Linha 3'],
  motivos:['Falta de cimento','Falta de areia','Falta de matéria-prima','Manutenção','Energia','Equipamento','Problema operacional','Outros'],
  limites:{normal:50,atencao:25},
  linhasOrdem:['Linha 1','Linha 2','Linha 3','Área líquida','Rejunte M1','Rejunte M2','Rejunte M3','Fixcol'],
  paletes:{'Linha 1':88,'Linha 2':88,'Linha 3':88},
  paleteProd:{}
};

// ---------------- estado ----------------
const S = {
  view:'meudia', mod:'inicio', cim:{per:'30'}, db:null, dbOk:null, user:null, uid:null, nomes:{},
  cfg: JSON.parse(JSON.stringify(CFG_PADRAO)),
  medicoes:[], premix:[], cargas:[], paradas:[],
  med:{v:{}, pm:{}, obs:'', corrige:null},
  hist:{per:'hoje', tipos:{medicao:true,premix:true,carga:true,parada:true}},
  siloSel:'c1', carga:{nota:'',qtd:'',sit:'caminho'}, parar:{linha:null,motivo:null,obs:''},
  premixForm:{}, abrirPremix:false, abrirCarga:false, abrirParar:false,
  salvando:false, horaMan:{}, hp:null,
  ordens:[], entregas:[], itens:[], ranchos:[], previsoes:[], pv:{f:null,conf:{}},
  rch:{dia:null,linha:'',msgs:[],lendo:false,busca:'',editEmail:false,fora:new Set()},
  it:{linha:'todas',busca:'',aberto:null,novo:false,f:{},inativos:false},
  fp:{aberto:false,dia:null,linha:''},
  diario:[], ind:{per:'semana',linha:''},
  cal:{ini:null,sab:false,fech:false,sel:null,drag:null,md:null,ml:null,busca:'',linha:'todas'},
  apt:{aberto:false,passo:'escolher',sel:[],v:{},gravando:false,linha:'todas',data:'',atras:true,busca:''},
  ord:{linha:'todas',mostrar:'abertas',busca:'',de:'',ate:'',aberta:null,painel:'entrega',f:{},nf:{},pf:{},nova:false,confCancel:null},
  imp:{aberto:false,texto:'',prev:null},
  zap:{aberto:false,salva:false}, folhas:{aberto:false, semana:'proxima', porDia:2, sabado:false, gerando:false}
};
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f1 = n => n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const f0 = n => Math.floor(n).toLocaleString('pt-BR');
const pad = n => String(n).padStart(2,'0');
const hora = iso => { const d=new Date(iso); return pad(d.getHours())+':'+pad(d.getMinutes()); };
const ini0 = d => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
function dia(iso){ const d=ini0(iso), h=ini0(new Date()); const k=Math.round((h-d)/864e5); return k===0?'Hoje':k===1?'Ontem':pad(new Date(iso).getDate())+'/'+pad(new Date(iso).getMonth()+1); }
function dur(ms){ const m=Math.max(0,Math.round(ms/6e4)); if(m<60) return m+' min'; const h=Math.floor(m/60); return h+'h'+pad(m%60); }
function numBR(s){ if(s==null) return null; s=String(s).trim(); if(s==='') return null; const n=parseFloat(s.replace(/\./g,'').replace(',','.')); return isNaN(n)?null:n; }
function numIn(s){ s=String(s==null?'':s).replace(/[^0-9.,\-]/g,''); if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?null:n; }
function numQ(s){ s=String(s==null?'':s).replace(/[^0-9.,]/g,'');
  if(s.includes(',')&&s.includes('.')&&s.lastIndexOf('.')>s.lastIndexOf(',')) s=s.replace(/,/g,'');
  else if(!s.includes('.')&&/^\d{1,3}(,\d{3}){2,}$/.test(s)) s=s.replace(/,/g,'');
  else if(!s.includes(',')&&/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  return numIn(s); }
function qtdTxt(n){ n=Math.round(n*1000)/1000; return String(n).replace('.',','); }
/* se colarem a quantidade em sacos no campo Paletes, converte em paletes + avulsos */
function palParaSacos(v,pp,pend){ if(!(pp>0&&v>0)) return null; const lim=Math.max(pend||0,pp); if(v*pp<=lim*1.5||v>lim*1.5) return null; const n=Math.floor(v/pp+1e-9); return {pal:n,av:Math.round((v-n*pp)*1000)/1000,q:v}; }
function corrigirPal(t){ if(!t) return;
  if(t.id==='o-pal'){ const O=S.ord, o=ordById(O.aberta); if(!o) return; const pp=numQ(O.f.porPal!=null?O.f.porPal:(paleteDe(o)||''))||0; const r=palParaSacos(numQ(O.f.pal||''),pp,o.total-entregueDe(o)); if(!r) return;
    O.f.pal=r.pal?String(r.pal):''; O.f.av=r.av?qtdTxt(r.av):''; const a=$('#o-pal'), b=$('#o-av'); if(a) a.value=O.f.pal; if(b) b.value=O.f.av; const res=$('#o-ent-res'); if(res) res.innerHTML=entRes(o); entCompAtualiza(o);
    toast(`${fq(r.q)} ${uP(o)} = ${r.pal} palete${r.pal===1?'':'s'}${r.av?' + '+fq(r.av)+' '+uP(o):''}`); return; }
  if(t.dataset&&t.dataset.aptId&&t.dataset.aptK==='pal'){ const id=t.dataset.aptId, o=S.ordens.find(x=>x._id===id); if(!o) return; const v=S.apt.v[id]||{}; const pp=numQ(v.pp!=null?v.pp:(paleteDe(o)||''))||0; const r=palParaSacos(numQ(v.pal||''),pp,o.total-entregueDe(o)); if(!r) return;
    v.pal=r.pal?String(r.pal):''; v.av=r.av?qtdTxt(r.av):''; S.apt.v[id]=v; t.value=v.pal; const b=document.querySelector(`[data-apt-id="${CSS.escape(id)}"][data-apt-k="av"]`); if(b) b.value=v.av; const res=document.querySelector(`[data-apt-res="${CSS.escape(id)}"]`); if(res) res.innerHTML=aptRes(o);
    toast(`${fq(r.q)} ${uP(o)} = ${r.pal} palete${r.pal===1?'':'s'}${r.av?' + '+fq(r.av)+' '+uP(o):''}`); } }
document.addEventListener('paste',ev=>{ const t=ev.target; setTimeout(()=>corrigirPal(t),0); });
document.addEventListener('change',ev=>corrigirPal(ev.target));
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,3200); }
function localVal(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes()); }
function horaCampo(key, rotulo){ const h=S.horaMan[key]||{};
  return `<div class="hora-box"><label><input type="checkbox" data-hora-tog="${key}" ${h.on?'checked':''}> ${rotulo||'Informar outra data e hora'}</label>${h.on?`<input type="datetime-local" id="hora-${key}" data-hora-val="${key}" value="${esc(h.val||localVal(new Date()))}" max="${localVal(new Date())}" aria-label="Data e hora do registro">`:`<span style="color:var(--muted)">${ic('relogio',14)} agora, automático</span>`}</div>`; }
function horaDe(key){ const h=S.horaMan[key]; const agora=new Date();
  if(!h||!h.on) return {iso:agora.toISOString(),manual:false};
  const d=new Date(h.val||localVal(agora)); if(isNaN(d)) return {erro:'Data e hora inválidas.'};
  if(d.getTime()>agora.getTime()+120000) return {erro:'A data e hora não podem estar no futuro.'};
  return {iso:d.toISOString(),manual:true}; }
function marcaManual(doc,h){ if(h.manual){ doc.horaManual=true; doc.registradoEm=new Date().toISOString(); } return doc; }
const nomeDe = id => (id && S.nomes[id]) || (id ? 'Alguém' : '—');

function nivel(p){
  const L=S.cfg.limites||CFG_PADRAO.limites;
  if(p*100>=L.normal) return {n:'Normal',c:'ok',fill:'var(--ok)',ink:'var(--ok-ink)'};
  if(p*100>=L.atencao) return {n:'Atenção',c:'warn',fill:'var(--warn)',ink:'var(--warn-ink)'};
  return {n:'Crítico',c:'crit',fill:'var(--crit)',ink:'var(--crit-ink)'};
}
function fillPath(p){
  if(p<=0) return ''; if(p>1) p=1;
  const y=Math.max(10,134-p*130);
  if(y<=108) return `M7 ${y.toFixed(1)} H65 V108 L44 133 H28 L7 108 Z`;
  const t=(y-108)/26, l=7+21*t, r=65-21*t;
  return `M${l.toFixed(1)} ${y.toFixed(1)} H${r.toFixed(1)} L44 133 H28 Z`;
}
function tankSvg(p,cor,w,h,sw){
  return `<svg width="${w}" height="${h}" viewBox="0 0 72 150" aria-hidden="true">
  <path d="M12 104 L9 150 M60 104 L63 150" fill="none" stroke="var(--leg)" stroke-width="${sw+0.5}"/>
  <path d="M6 12 Q6 4 14 4 H58 Q66 4 66 12 V108 L44 134 H28 L6 108 Z" fill="var(--tank)"/>
  <path d="${fillPath(p)}" fill="${cor}"/>
  <path d="M6 12 Q6 4 14 4 H58 Q66 4 66 12 V108 L44 134 H28 L6 108 Z" fill="none" stroke="var(--tank-line)" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
}

// ---------------- dados derivados ----------------
function corrigidas(){ const s=new Set(); S.medicoes.forEach(m=>{ if(m.corrige) s.add(m.corrige); }); return s; }
function validas(){ const c=corrigidas(); return S.medicoes.filter(m=>!c.has(m._id)).sort((a,b)=>b.em.localeCompare(a.em)); }
function ultimoPorSilo(){
  const out={}; const vs=validas();
  S.cfg.silos.forEach(s=>{ const m=vs.find(m=>m.itens && m.itens[s.id]!=null); if(m) out[s.id]={q:m.itens[s.id],em:m.em}; });
  return out;
}
function premixAtual(){ const out={}; const ps=[...S.premix].sort((a,b)=>b.em.localeCompare(a.em));
  S.cfg.produtos.forEach(p=>{ const d=ps.find(x=>x.valores && x.valores[p.id]!=null); if(d) out[p.id]={n:d.valores[p.id],em:d.em,porLinha:(d.porLinha&&d.porLinha[p.id])||null}; }); return out; }
function porLinhaTxt(pl){ if(!pl) return ''; return Object.keys(pl).map(l=>esc(l)+': '+pl[l]).join(' · '); }
// grade de premix: produto x linha
function pgKey(pid,li){ return pid+'|'+li; }
function premixGrid(form,prefix){
  const L=S.cfg.linhas;
  return `<div style="overflow-x:auto"><table class="rtab pgrid"><thead><tr><th>Produto</th>${L.map(l=>`<th style="text-align:center">${esc(l)}</th>`).join('')}<th style="text-align:right">Total</th></tr></thead><tbody>
  ${S.cfg.produtos.map(p=>`<tr><th scope="row">${esc(p.nome)}<small style="display:block;margin:0">${p.sacosPremix} sacos/premix</small></th>
  ${L.map((l,li)=>`<td><div class="field"><input class="mcampo" id="${prefix}-${p.id}-${li}" data-pg="${prefix}" data-p="${p.id}" data-l="${li}" inputmode="numeric" autocomplete="off" placeholder="—" value="${esc(form[pgKey(p.id,li)]||'')}" aria-label="Premix de ${esc(p.nome)} na ${esc(l)}" style="height:44px;font-size:18px;padding-right:10px"></div></td>`).join('')}
  <td class="num" id="${prefix}-tot-${p.id}" style="text-align:right;white-space:nowrap">${pgTotal(form,p)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function pgSoma(form,p){ let s=0,alg=false; S.cfg.linhas.forEach((l,li)=>{ const n=parseInt(form[pgKey(p.id,li)],10); if(!isNaN(n)){ s+=n; alg=true; } }); return alg?s:null; }
function pgTotal(form,p){ const s=pgSoma(form,p); return s==null?'<span style="color:var(--faint)">—</span>':`<b>${s}</b> <small>= ${f0(s*p.sacosPremix)} sacos</small>`; }
function pgMontar(form){ const valores={}, porLinha={};
  S.cfg.produtos.forEach(p=>{ S.cfg.linhas.forEach((l,li)=>{ const n=parseInt(form[pgKey(p.id,li)],10); if(!isNaN(n)){ (porLinha[p.id]=porLinha[p.id]||{})[l]=n; valores[p.id]=(valores[p.id]||0)+n; } }); });
  return {valores,porLinha}; }
function etapaCarga(c){ const e=c.etapas||{}; return e.descarregado?2:e.chegou?1:0; }
function ultimoMedidor(){ const m=validas().find(x=>x.medidoPor); return m?m.medidoPor:'Titio'; }
function medidorDe(m){ return (m&&m.medidoPor)||(m&&S.nomes[m.por])||''; }
function ultimaMedicao(){ return validas()[0]; }

// ---------------- navegação ----------------
const VIEWS = {
  geral:{nome:'Visão geral',ic:'grid',mob:'Início'},
  silos:{nome:'Silos',ic:'silo'},
  cargas:{nome:'Cargas',ic:'rota'},
  cimento:{nome:'Paradas por cimento',ic:'pausa',mob:'Paradas'},
  historico:{nome:'Histórico',ic:'relogio'},
  paradas:{nome:'Paradas',ic:'pausa'},
  meudia:{nome:'Meu dia',ic:'sol',mob:'Hoje'},
  indicadores:{nome:'Indicadores',ic:'grafico',mob:'Números'},
  programacao:{nome:'Programação',ic:'lista',mob:'Ordens'},
  calendario:{nome:'Calendário',ic:'calendario',mob:'Semana'},
  itens:{nome:'Itens',ic:'caixa'},
  ranchos:{nome:'Ranchos',ic:'folha'},
  diario:{nome:'Diário de bordo',ic:'lista',mob:'Diário'},
  aprogramar:{nome:'Previsão',ic:'fila',mob:'Previsão'},
  tvfab:{nome:'TV da fábrica',ic:'tv',mob:'TV'}
};
const MODS = [
  {id:'inicio',nome:'Meu dia',ic:'sol',views:['meudia']},
  {id:'silos',nome:'Silos',ic:'silo',views:['geral','silos','cargas','cimento','historico']},
  {id:'producao',nome:'Produção',ic:'fabrica',views:['programacao','calendario','ranchos','diario','paradas','indicadores','tvfab']}
];
const CRUMB = {diario:'Diário de bordo',tvfab:'TV da fábrica',geral:'Visão geral',silos:'Silos',cargas:'Cargas de cimento',cimento:'Paradas por falta de cimento',paradas:'Paradas',meudia:'Meu dia',indicadores:'Indicadores',programacao:'Programação',calendario:'Calendário',itens:'Itens',ranchos:'Ranchos',aprogramar:'Previsão',historico:'Histórico',medicao:'Nova medição',ajustes:'Ajustes',modulos:'Módulos'};
function modDe(v){ if(v==='medicao') return 'silos'; const m=MODS.find(m=>m.views.includes(v)); return m?m.id:null; }
function go(v){ if(v==='aprogramar'){ v='programacao'; S.ord.filaAb=true; } if(v==='ranchos'&&rchGav()){ v='programacao'; S.rchGav=true; } if(S.acs&&S.acs.pronto&&!viewOk(v)){ /* sem permissão para esta tela: continua no painel (nunca expulsa) e avisa se foi um toque da pessoa */
    try{ if(acsP()&&window.event&&window.event.type==='click') setTimeout(()=>toast('Você não possui permissão para acessar este módulo.'),0); }catch(e){} v=primeiraView(); } S.view=v; const m=modDe(v); if(m) S.mod=m; render(); window.scrollTo(0,0); }
function modAtual(){ return MODS.find(m=>m.id===S.mod)||MODS[0]; }
function abas(){ const m=modAtual(); if(!modDe(S.view)||mTabs(m).length<2) return '';
  return `<nav class="tabs" aria-label="${esc(m.nome)}">${mTabs(m).map(v=>`<button class="tab" data-go="${v}" ${S.view===v?'aria-current="page"':''}>${ic(VIEWS[v].ic,18)}${VIEWS[v].nome}${v==='aprogramar'&&(prevAtivas().length+aProgramar().length)?` <span class="pill warn num" style="padding:1px 8px">${prevAtivas().length+aProgramar().length}</span>`:''}</button>`).join('')}</nav>`; }
function renderNav(){
  const m=modAtual();
  $('#navlist').innerHTML = modsVis().map(x=>`<button class="navbtn" data-mod="${x.id}" ${S.mod===x.id&&S.view!=='ajustes'&&S.view!=='itens'&&S.view!=='acessos'?'aria-current="page"':''}>${ic(x.ic)}${x.nome}</button>`).join('');
  $('#nav-ajustes').innerHTML = ic('ajuste')+'Ajustes';
  $('#mob-aj').innerHTML = ic('ajuste',22);
  acsNavAjusta();
  if(S.view==='ajustes'||S.view==='itens'||S.view==='acessos') $('#nav-ajustes').setAttribute('aria-current','page'); else $('#nav-ajustes').removeAttribute('aria-current');
  const bn=$('#bottomnav'); bn.style.gridTemplateColumns=`repeat(${mTabs(m).length},minmax(0,1fr))`;
  bn.innerHTML = mTabs(m).map(v=>`<button data-go="${v}" ${S.view===v?'aria-current="page"':''}>${ic(VIEWS[v].ic,22)}${VIEWS[v].mob||VIEWS[v].nome}</button>`).join('');
  const chip=$('#mob-brand span'); if(chip){ chip.outerHTML=`<button class="mob-mod" data-go="modulos" aria-label="Trocar de módulo" style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:var(--teal-tint);color:var(--teal-strong);white-space:nowrap">${esc(m.nome)} ▾</button>`; }
  else { const b=$('#mob-brand .mob-mod'); if(b) b.innerHTML=esc(m.nome)+' ▾'; }
  $('#crumb').innerHTML = (S.view==='itens'||S.view==='acessos'?'Ajustes <span style="margin:0 8px">/</span>':'')+(modDe(S.view)&&mViews(m).length>1?esc(m.nome)+' <span style="margin:0 8px">/</span>':'')+'<b>'+CRUMB[S.view]+'</b>';
}
function vModulos(){
  return `<div class="head"><div><div class="eyebrow">MÓDULOS</div><h1>Trocar de módulo</h1></div></div>
  <div class="modgrid">${modsVis().map(x=>`<button class="modbtn" data-mod="${x.id}" ${S.mod===x.id?'aria-current="page"':''}>${ic(x.ic,26)}${x.nome}</button>`).join('')}</div>`;
}
function tick(){
  const d=new Date();
  $('#rel-d').textContent = d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short',year:'numeric'});
  $('#rel-h').textContent = pad(d.getHours())+':'+pad(d.getMinutes());
}

// ---------------- telas ----------------
function banner(){
  if(S.dbOk===false) return `<div class="banner">Não foi possível conectar ao armazenamento compartilhado. Você pode navegar, mas os registros não serão salvos. Recarregue a página para tentar de novo.${S.dbErro?` <small style="opacity:.75">(código: ${esc(S.dbErro.k)} · ${esc(S.dbErro.code)})</small>`:(S.dbMotivo?` <small style="opacity:.75">(${esc(S.dbMotivo)})</small>`:'')}</div>`;
  if(S.dbErro) return `<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong)">Reconectando ao armazenamento… <small style="opacity:.75">(${esc(S.dbErro.k)} · ${esc(S.dbErro.code)})</small></div>`;
  if(S.dbOk===null) return `<div class="banner" style="background:var(--teal-wash);color:var(--teal-strong)">Conectando ao armazenamento…</div>`;
  return '';
}
function legenda(){ const L=S.cfg.limites; return `<div class="legend"><span><i style="background:var(--ok)"></i>Normal ≥ ${L.normal}%</span><span><i style="background:var(--warn)"></i>Atenção ${L.atencao}–${L.normal}%</span><span><i style="background:var(--crit)"></i>Crítico &lt; ${L.atencao}%</span></div>`; }

function vGeral(){
  const ult=saldoPorSilo(), um=ultimaMedicao(); /* saldo atual (consumo automático + medições) */
  const grupos=['Cimento','Areia'].map(g=>{
    const ss=S.cfg.silos.filter(s=>s.grupo===g);
    const tot=ss.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0), cap=ss.reduce((a,s)=>a+s.cap,0);
    const tanks=ss.map(s=>{
      const u=ult[s.id];
      if(!u) return `<div class="tank"><div class="base">${tankSvg(0,'var(--ok)',66,140,1.5)}</div><div class="nm">${esc(s.nome)}</div><div class="q" style="color:var(--faint)">—</div><div class="cap">de ${s.cap} t</div><div class="pct"><span class="pill dash">sem medição</span></div></div>`;
      const p=u.q/s.cap, nv=nivel(p);
      return `<div class="tank"><div class="base">${tankSvg(p,nv.fill,66,140,1.5)}</div>
      <div class="nm">${esc(s.nome)}</div><div class="q num">${f1(u.q)}<small>t</small></div>
      <div class="cap">de ${s.cap} t${u.q===0?' · vazio':''}</div>
      <div class="pct num" style="color:${nv.ink}">${f1(p*100)}%<small>${nv.n}</small></div>
      <div class="hr num">${siloOrigemCurta(u)}${dia(u.em)==='Hoje'?hora(u.em):dia(u.em)+' '+hora(u.em)}</div></div>`;
    }).join('');
    return `<div class="grupo"><div class="gh"><span style="display:flex;align-items:center;gap:8px"><b style="color:var(--ink)">${g.toUpperCase()}</b>${g==='Cimento'?`<button class="zapbtn" data-act="abrir-zap" aria-label="Enviar medição no WhatsApp" title="Enviar no WhatsApp">${ic('zap',20,1.9)}</button>`:''}</span><span class="num"><b style="letter-spacing:0">${f1(tot)} t</b> de ${cap} t</span></div><div class="tanks">${tanks}</div></div>`;
  });
  // rende
  const cimSilos=S.cfg.silos.filter(s=>s.grupo==='Cimento');
  const cim=cimSilos.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0);
  const pa=premixAtual();
  const prods=S.cfg.produtos.map(p=>{
    const porCim = p.kgSaco>0 ? cim*1000/p.kgSaco : 0;
    const pm=pa[p.id];
    const sp = pm ? pm.n*p.sacosPremix : null;
    const usa = sp!=null ? sp*p.kgSaco/1000 : null;
    return `<tr><th scope="row">${esc(p.nome)}</th>
      <td class="num">≈ ${f0(porCim)} <small>${p.kgSaco} kg/saco</small></td></tr>`;
  }).join('');
  const aCaminho=S.cargas.filter(c=>etapaCarga(c)===0), naFab=S.cargas.filter(c=>etapaCarga(c)===1);
  const prox = aCaminho.length ? `Próxima: <b>NF ${esc(aCaminho.sort((a,b)=>(a.etapas.caminho||'').localeCompare(b.etapas.caminho||''))[0].nota)} a caminho</b>` : 'Nenhuma carga a caminho';
  const ativas=S.paradas.filter(p=>!p.fim);
  const atividades=eventos().slice(0,6);
  // lista compacta (celular)
  const lista=['Cimento','Areia'].map(g=>{ const ss=S.cfg.silos.filter(s=>s.grupo===g);
    const tot=ss.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0), cap=ss.reduce((a,s)=>a+s.cap,0);
    return `<div class="sl-g"><div class="gh"><span style="display:flex;align-items:center;gap:8px"><b>${g.toUpperCase()}</b>${g==='Cimento'?`<button class="zapbtn" data-act="abrir-zap" aria-label="Enviar medição no WhatsApp" title="Enviar no WhatsApp">${ic('zap',20,1.9)}</button>`:''}</span><span class="num" style="color:var(--muted)"><b style="color:var(--ink-2);letter-spacing:0">${f1(tot)} t</b> de ${cap} t</span></div>
    ${ss.map(s=>{ const u=ult[s.id]; if(!u) return `<div class="sl-r"><div class="n">${esc(s.nome)}<small>de ${s.cap} t · sem medição</small></div><div class="t num" style="color:var(--faint)">—</div><div></div><div class="bar"></div></div>`;
      const p=u.q/s.cap, nv=nivel(p);
      return `<div class="sl-r"><div class="n">${esc(s.nome)}<small>de ${s.cap} t · ${siloOrigemCurta(u).toLowerCase()}${dia(u.em)==='Hoje'?hora(u.em):dia(u.em)+' '+hora(u.em)}</small></div><div class="t num">${f1(u.q)} t</div><div class="pc num" style="color:${nv.ink}">${u.q===0?'vazio':f1(p*100).replace(',0','')+'%'}</div><div class="bar"><i style="width:${Math.min(100,p*100)}%;background:${nv.fill}"></i></div></div>`; }).join('')}</div>`; }).join('');
  // faixa de resumo
  const capCim=cimSilos.reduce((a,s)=>a+s.cap,0), nvCim=nivel(capCim?cim/capCim:0);
  const criticos=S.cfg.silos.filter(s=>ult[s.id]&&nivel(ult[s.id].q/s.cap).c==='crit').map(s=>s.nome+(ult[s.id].q===0?' vazio':''));
  const carTxt=aCaminho.length?`${aCaminho.length===1?'NF '+esc(aCaminho[0].nota)+' a caminho':aCaminho.length+' a caminho'}`:(naFab.length?'':'Nenhuma a caminho');
  const resumo=`<div class="resumo" aria-label="Resumo">
    <div><div class="k">Cimento</div><div class="v num ${um?nvCim.c:''}">${um?f1(cim)+' t':'—'} <small>de ${capCim} t</small></div></div>
    <div><div class="k">Silos críticos</div><div class="v ${criticos.length?'crit':'ok'}">${!um?'—':criticos.length?esc(criticos.join(' · ')):'Nenhum'}</div></div>
    <div><div class="k">Cargas de cimento</div><div class="v">${carTxt}${naFab.length?`${carTxt?' · ':''}${naFab.length} na fábrica`:''}</div></div>
    <div><div class="k">Linhas</div><div class="v ${ativas.length?'crit':'ok'}">${ativas.length?ativas.map(p=>esc(p.linha)).join(', ')+(ativas.length===1?' parada':' paradas'):'Todas produzindo'}</div></div>
  </div>`;
  return `${banner()}
  ${resumo}
  <section class="card" aria-label="Silos">
    <div class="head" style="padding-bottom:18px;border-bottom:1px solid var(--line-2);align-items:center">
      <div><h2>Silos</h2><div class="sub" style="margin-bottom:6px">${um?`Última medição <b style="color:var(--ink)">${dia(um.em).toLowerCase()} às ${hora(um.em)}</b> · ${Object.keys(um.itens||{}).length} de ${S.cfg.silos.length} silos · por ${esc(nomeDe(um.por))}`:'Nenhuma medição registrada ainda. Faça a primeira.'}</div>${legenda()}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="abrir-folhas" style="height:56px">${ic('folha',20,1.9)}Folhas da semana</button><button class="btn big" data-go="medicao">${ic('mais',22,2.2)}Nova medição</button></div>
    </div>
    ${S.zap.aberto?zapPainel():''}${S.folhas.aberto?folhasPainel():''}
    <div class="silos-wrap">${grupos[0]}<div class="gdiv"></div>${grupos[1]}</div><div class="silos-lista">${lista}</div>
    <div class="rende" style="display:block">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">
        <span><span class="label" style="color:var(--teal)">CIMENTO RENDE</span> <b class="num" style="font-size:16px;margin-left:6px">${f1(cim)} t</b> <span style="font-size:12px">nos silos de cimento</span></span>
        <span class="num">${prox}${naFab.length?` · ${naFab.length} na fábrica`:''}</span>
      </div>
      <div style="overflow-x:auto;margin-top:10px"><table class="rtab">
        <thead><tr><th>Produto</th><th title="Se todo o cimento fosse para este produto. Sem desconto de sobra no silo.">Sacos pelo cimento</th></tr></thead>
        <tbody>${prods}</tbody></table></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px">
        <span style="font-size:12px">“Sacos pelo cimento” considera todo o cimento indo para aquele produto.</span>
        <button class="btn sec" data-act="abrir-premix" style="height:40px">${ic('premix',18,1.9)}Atualizar premix</button>
      </div>
    </div>
    ${S.abrirPremix?premixPainel():''}
  </section>
  <div class="two topo">
    <section class="card" aria-label="Paradas agora">
      <div class="head" style="align-items:baseline"><h2>Paradas agora</h2><button class="lnk" data-go="paradas">Ver paradas</button></div>
      ${ativas.length?ativas.map(p=>`<div class="row" style="grid-template-columns:minmax(0,1fr) auto"><div><b>${esc(p.linha)}</b> · ${esc(p.motivo)}<div class="sub num" style="margin:0">desde ${hora(p.inicio)} · há ${dur(Date.now()-new Date(p.inicio))}</div></div><span class="pill crit">Parada</span></div>`).join(''):`<div class="row" style="grid-template-columns:auto minmax(0,1fr)"><span class="pill ok">Produzindo</span><span style="color:var(--muted)">Todas as linhas produzindo.</span></div>`}
    </section>
    <section class="card" aria-label="Atividade recente">
      <div class="head" style="align-items:baseline"><h2>Atividade recente</h2><button class="lnk" data-go="historico">Ver histórico</button></div>
      <div style="margin-top:8px">${atividades.length?atividades.map(evRow).join(''):`<div class="empty">Ainda não há registros.</div>`}</div>
    </section>
  </div>`;
}
function segundaDe(ref){ const d=ini0(ref); const w=(d.getDay()+6)%7; d.setDate(d.getDate()-w); return d; }
function diasFolhas(){ const f=S.folhas; const base=segundaDe(new Date()); if(f.semana==='proxima') base.setDate(base.getDate()+7);
  const n=f.sabado?6:5; return Array.from({length:n},(_,i)=>{ const d=new Date(base); d.setDate(base.getDate()+i); return d; }); }
const fmtD = d => pad(d.getDate())+'/'+pad(d.getMonth()+1);
function zapTexto(){
  const ult=ultimoPorSilo(), um=ultimaMedicao(); if(!um) return '';
  const d=new Date(um.em); const wd=d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','');
  const L=[`*COLAFIX · Silos*`, `${wd} ${pad(d.getDate())}/${pad(d.getMonth()+1)} · ${hora(um.em)}`];
  ['Cimento','Areia'].forEach(g=>{ const ss=S.cfg.silos.filter(s=>s.grupo===g);
    const tot=ss.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0), cap=ss.reduce((a,s)=>a+s.cap,0);
    L.push('', `*${g.toUpperCase()}* — ${f1(tot)} t de ${cap} t`);
    ss.forEach(s=>{ const u=ult[s.id];
      if(!u){ L.push(`⚪ ${s.nome}: não medido`); return; }
      const p=u.q/s.cap, nv=nivel(p); const bola=nv.c==='ok'?'🟢':nv.c==='warn'?'🟡':'🔴';
      const quando=u.em!==um.em?` _(medido ${dia(u.em).toLowerCase()} ${hora(u.em)})_`:'';
      L.push(`${bola} ${s.nome}: ${f1(u.q)} t (${Math.round(p*100)}%)${u.q===0?' · vazio':''}${quando}`); }); });
  const cam=S.cargas.filter(c=>etapaCarga(c)===0), fab=S.cargas.filter(c=>etapaCarga(c)===1);
  const nf=c=>'NF '+c.nota+(c.qtd!=null?' ('+f1(c.qtd)+' t)':'');
  if(cam.length||fab.length){ L.push(''); if(cam.length) L.push('🚚 A caminho: '+cam.map(nf).join(', ')); if(fab.length) L.push('🏭 Na fábrica: '+fab.map(nf).join(', ')); }
  if(um.obs) L.push('', 'Obs.: '+um.obs);
  const quem=medidorDe(um); if(quem) L.push('', 'Medido por '+quem);
  return L.join('\n');
}
const IMG_COR={bg:'#F5F1E8',card:'#FFFFFF',ink:'#1A1A1A',ink2:'#4A463D',muted:'#6B6558',line:'#E5DFD0',teal:'#1B5C7A',tank:'#EDE7DA',tankLine:'#6B6558',leg:'#A39C8C',wash:'#F7F4EC',
  ok:'#6A9C7E',okInk:'#3F7D5C',warn:'#D2A857',warnInk:'#8A6326',crit:'#C0665D',critInk:'#A2453D'};
const FONTE='"Segoe UI",system-ui,-apple-system,Roboto,sans-serif';
function carregaImg(src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; }); }
async function gerarImagemSilos(){
  const ult=ultimoPorSilo(), um=ultimaMedicao(); if(!um) return null;
  const C=IMG_COR, W=1720, M=48; const cv=document.createElement('canvas'); cv.width=W; cv.height=2600; const x=cv.getContext('2d');
  const txt=(t,X,Y,sz,cor,peso,al,esp)=>{ x.font=`${peso||400} ${sz}px ${FONTE}`; x.fillStyle=cor; x.textAlign=al||'left'; x.textBaseline='alphabetic'; if('letterSpacing' in x) x.letterSpacing=(esp||0)+'px'; x.fillText(t,X,Y); if('letterSpacing' in x) x.letterSpacing='0px'; };
  const largura=(t,sz,peso)=>{ x.font=`${peso||400} ${sz}px ${FONTE}`; return x.measureText(t).width; };
  const rr=(X,Y,w,h,r,cor)=>{ x.beginPath(); x.roundRect?x.roundRect(X,Y,w,h,r):x.rect(X,Y,w,h); x.fillStyle=cor; x.fill(); };
  x.fillStyle=C.bg; x.fillRect(0,0,W,cv.height);
  // cabeçalho
  let y=M; const logo=await carregaImg((document.querySelector('.brand img')||{}).src||'');
  if(logo){ const h=60, w=logo.width*h/logo.height; x.drawImage(logo,M,y,w,h); }
  const d=new Date(um.em); const wd=d.toLocaleDateString('pt-BR',{weekday:'long'});
  txt('MEDIÇÃO DOS SILOS',W-M,y+20,20,C.teal,700,'right',3);
  txt(`${wd}, ${pad(d.getDate())}/${pad(d.getMonth()+1)} · ${hora(um.em)}`,W-M,y+58,32,C.ink,700,'right');
  y+=96;
  const tanque=(cx,top,sc,p,cor)=>{ x.save(); x.translate(cx-36*sc,top); x.scale(sc,sc);
    x.strokeStyle=C.leg; x.lineWidth=2; x.stroke(new Path2D('M12 104 L9 150 M60 104 L63 150'));
    const corpo=new Path2D('M6 12 Q6 4 14 4 H58 Q66 4 66 12 V108 L44 134 H28 L6 108 Z'); x.fillStyle=C.tank; x.fill(corpo);
    const fp=fillPath(p); if(fp){ x.fillStyle=cor; x.fill(new Path2D(fp)); }
    x.strokeStyle=C.tankLine; x.lineWidth=1.6; x.lineJoin='round'; x.stroke(corpo); x.restore(); };
  const grupos=['Cimento','Areia'].map(g=>S.cfg.silos.filter(s=>s.grupo===g));
  const nTot=grupos.reduce((a,ss)=>a+Math.max(ss.length,1),0), GAP=24, inner=W-2*M-GAP;
  const sc=1.3, th=150*sc, cardH=110+th+216+30; let gx=M; const cardTop=y;
  grupos.forEach((ss,gi)=>{ const g=gi?'Areia':'Cimento'; const cw=inner*Math.max(ss.length,1)/nTot;
    const tot=ss.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0), cap=ss.reduce((a,s)=>a+s.cap,0);
    rr(gx,cardTop,cw,cardH,20,C.card);
    let yy=cardTop+56; txt(g.toUpperCase(),gx+28,yy,24,C.ink,700,'left',3);
    const t1=f1(tot)+' t', t2=' de '+cap+' t'; const w2=largura(t2,24,400);
    txt(t2,gx+cw-28,yy,24,C.muted,400,'right'); txt(t1,gx+cw-28-w2,yy,24,C.ink2,700,'right');
    yy+=30; x.fillStyle=C.line; x.fillRect(gx+28,yy,cw-56,2); yy+=24;
    const colW=(cw-40)/ss.length, x0=gx+20;
    ss.forEach((s,i)=>{ const cx=x0+colW*i+colW/2, u=ult[s.id];
      const p=u?u.q/s.cap:0, nv=nivel(p); const cor=u?(nv.c==='ok'?C.ok:nv.c==='warn'?C.warn:C.crit):C.ok; const ink=nv.c==='ok'?C.okInk:nv.c==='warn'?C.warnInk:C.critInk;
      tanque(cx,yy,sc,u?p:0,cor);
      let ty=yy+th+46; txt(s.nome.toUpperCase(),cx,ty,20,C.ink,700,'center',1.2);
      ty+=62;
      if(u){ const q=f1(u.q); const wq=largura(q,54,700), wt=largura('t',26,700); txt(q,cx-(wq+wt+4)/2,ty,54,C.ink,700,'left'); txt('t',cx-(wq+wt+4)/2+wq+4,ty,26,C.ink2,700,'left'); }
      else txt('—',cx,ty,54,C.muted,700,'center');
      ty+=36; txt('de '+s.cap+' t'+(u&&u.q===0?' · vazio':''),cx,ty,20,C.muted,400,'center');
      ty+=40; if(u){ const pc=f1(p*100)+'%', nm=' '+nv.n; const a1=largura(pc,26,700), a2=largura(nm,20,600); txt(pc,cx-(a1+a2)/2,ty,26,ink,700,'left'); txt(nm,cx-(a1+a2)/2+a1,ty,20,ink,600,'left'); }
      else txt('sem medição',cx,ty,20,C.muted,600,'center');
      ty+=32; if(u) txt(u.em===um.em?'Medido '+hora(u.em):'Medido '+dia(u.em).toLowerCase()+' '+hora(u.em),cx,ty,18,C.muted,400,'center');
    });
    gx+=cw+GAP; });
  y=cardTop+cardH+24;
  // rende + cargas (faixa inteira)
  const cimSilos=S.cfg.silos.filter(s=>s.grupo==='Cimento'); const cim=cimSilos.reduce((a,s)=>a+(ult[s.id]?ult[s.id].q:0),0);
  const cam=S.cargas.filter(c=>etapaCarga(c)===0), fab=S.cargas.filter(c=>etapaCarga(c)===1);
  const nf=c=>'NF '+c.nota+(c.qtd!=null?' ('+f1(c.qtd)+' t)':'');
  const linhasCarga=[]; if(cam.length) linhasCarga.push('A caminho: '+cam.map(nf).join(', ')); if(fab.length) linhasCarga.push('Na fábrica: '+fab.map(nf).join(', ')); if(!linhasCarga.length) linhasCarga.push('Nenhuma carga a caminho');
  const prods=S.cfg.produtos; const rH=136;
  rr(M,y,W-2*M,rH,20,C.wash); x.strokeStyle=C.line; x.lineWidth=2; x.beginPath(); x.roundRect?x.roundRect(M,y,W-2*M,rH,20):x.rect(M,y,W-2*M,rH); x.stroke();
  let yy=y+54; txt('CIMENTO RENDE',M+28,yy,21,C.teal,700,'left',3); const wr=largura('CIMENTO RENDE',21,700)+3*13;
  txt(f1(cim)+' t',M+28+wr+18,yy,30,C.ink,700,'left');
  linhasCarga.forEach((l,i)=>txt(l,W-M-28,yy+i*32,21,cam.length||fab.length?C.ink2:C.muted,cam.length||fab.length?600:400,'right'));
  yy+=52; const pw=(W-2*M-56)/Math.max(prods.length,1);
  prods.forEach((p,i)=>{ const sx=M+28+pw*i; const sc2=p.kgSaco>0?cim*1000/p.kgSaco:0;
    const wn=largura(p.nome,21,600); txt(p.nome,sx,yy,21,C.ink2,600,'left'); txt('≈ '+f0(sc2)+' sacos',sx+wn+14,yy,24,C.ink,700,'left'); });
  y+=rH+30;
  const quem=medidorDe(um); txt((quem?'Medido por '+quem+' · ':'')+'Painel de Operação COLAFIX',W/2,y+10,19,C.muted,400,'center'); y+=40;
  const out=document.createElement('canvas'); out.width=W; out.height=Math.ceil(y); out.getContext('2d').drawImage(cv,0,0);
  const blob=await new Promise(r=>out.toBlob(r,'image/png'));
  return {url:out.toDataURL('image/png'), blob, nome:`silos-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`};
}
async function prepararImagem(){ S.zap.img=null; S.zap.gerando=true; render(); try{ S.zap.img=await gerarImagemSilos(); }catch(e){ console.error(e); S.zap.img=null; } S.zap.gerando=false; render(); }
function zapNum(){ let d=String(S.cfg.zapNumero||'').replace(/\D/g,''); if(!d) return ''; if(d.length<=11) d='55'+d.replace(/^0+/,''); return d; }
function zapLink(texto){ const n=zapNum(); return 'https://wa.me/'+n+(texto?'?text='+encodeURIComponent(texto):''); }
function zapPainel(){ const z=S.zap, t=zapTexto();
  return `<div style="margin-top:16px;padding:16px 18px;border-radius:10px;border:1.5px solid var(--teal);background:var(--surface)">
  <div class="head" style="align-items:center"><div class="label">${z.salva?'MEDIÇÃO SALVA · ENVIAR NO WHATSAPP':'ENVIAR NO WHATSAPP'}</div><button class="lnk" data-act="fechar-zap">Fechar</button></div>
  ${!t?'<div class="sub" style="margin:10px 0 0">Nenhuma medição registrada ainda.</div>':`
  <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;align-items:flex-start">
    <div style="flex:0 1 300px;min-width:200px">${z.img?`<img src="${z.img.url}" alt="Imagem da medição dos silos" style="width:100%;border-radius:10px;border:1px solid var(--line);display:block">`:`<div class="sub" style="margin:0;padding:40px 10px;text-align:center;border:1px dashed var(--faint);border-radius:10px">${z.gerando?'Gerando imagem…':'Não foi possível gerar a imagem.'}</div>`}</div>
    <div style="flex:1 1 260px;display:flex;flex-direction:column;gap:10px">
      <button class="btn big" data-act="zap-enviar" ${z.img?'':'disabled'}>${ic('zap',22,1.9)}Enviar no WhatsApp</button>
      <button class="btn sec" data-act="zap-salvar" ${z.img?'':'disabled'}>${ic('folha',18,1.9)}Salvar imagem</button>
      <button class="btn sec" data-act="zap-copiar-img" ${z.img?'':'disabled'} title="Para colar no WhatsApp Web">Copiar imagem</button>
      ${z.passo?`<div style="padding:12px 14px;border-radius:10px;background:var(--ok-tint);color:var(--ok-ink);font-size:14px"><b>${z.passo==='copiada'?'Imagem copiada.':'Imagem salva.'}</b> ${z.passo==='copiada'?'Vá para a aba do WhatsApp Web, abra o grupo, clique na caixa de mensagem, aperte <b>Ctrl+V</b> e depois <b>Enter</b>.':'No WhatsApp, abra a conversa e anexe a imagem pela galeria (📎).'}
        <a class="btn" href="${zapLink('')}" target="_blank" rel="noopener" style="text-decoration:none;margin-top:10px;display:flex">${ic('zap',20,1.9)}Abrir WhatsApp</a></div>`:''}
      <span style="font-size:12px;color:var(--muted)">“Enviar no WhatsApp” manda a imagem direto quando o celular permite. Senão, copia ou salva a imagem e abre o WhatsApp${zapNum()?' na conversa cadastrada em Ajustes':''} para você colar ou anexar.</span>
      <details style="margin-top:4px"><summary class="lnk" style="cursor:pointer">Enviar como texto</summary>
        <textarea class="txt num" id="zap-txt" readonly rows="${Math.min(16,t.split('\n').length+1)}" style="width:100%;margin-top:10px;font-size:14px;line-height:1.45;resize:vertical">${esc(t)}</textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><a class="btn sec" href="${zapLink(t)}" target="_blank" rel="noopener" style="text-decoration:none">Abrir WhatsApp</a><button class="btn sec" data-act="copiar-zap">Copiar texto</button></div>
      </details>
    </div>
  </div>`}</div>`;
}
function folhasPainel(){ const f=S.folhas, ds=diasFolhas();
  return `<div style="margin-top:16px;padding:16px 18px;border-radius:10px;border:1.5px solid var(--teal);background:var(--surface)">
  <div class="head" style="align-items:center"><div class="label">FOLHAS DE CONTAGEM PARA IMPRIMIR</div><button class="lnk" data-act="fechar-folhas">Fechar</button></div>
  <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:12px;align-items:flex-end">
   <div><div class="label" style="margin-bottom:6px">SEMANA</div><div class="chips"><button class="chip" data-act="f-semana" data-k="atual" aria-pressed="${f.semana==='atual'}">Esta semana</button><button class="chip" data-act="f-semana" data-k="proxima" aria-pressed="${f.semana==='proxima'}">Próxima semana</button></div></div>
   <div><div class="label" style="margin-bottom:6px">FOLHAS POR DIA</div><div class="chips">${[1,2,3].map(n=>`<button class="chip" data-act="f-pordia" data-k="${n}" aria-pressed="${f.porDia===n}">${n}</button>`).join('')}</div></div>
   <label class="hora-box" style="min-height:36px"><input type="checkbox" id="f-sab" data-folha-sab ${f.sabado?'checked':''}> Incluir sábado</label>
  </div>
  <div class="sub num" style="margin-top:12px">${ds.length*f.porDia} folhas · ${fmtD(ds[0])} a ${fmtD(ds[ds.length-1])} · ${ds.map(fmtD).join(', ')}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px"><span class="sub" style="margin:0;font-size:12px">PDF em A4 deitado, uma folha por página. Ao abrir, o arquivo já chama a impressão.</span>
  <button class="btn" data-act="gerar-folhas" ${f.gerando?'disabled':''}>${ic('baixar',18,2)}${f.gerando?'Gerando…':'Gerar PDF para imprimir'}</button></div></div>`; }
const FOTOS = {"img1": {"d": "data:image/jpeg;base64,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", "w": 305, "h": 274}, "img2": {"d": "data:image/jpeg;base64,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", "w": 306, "h": 256}, "img3": {"d": "data:image/jpeg;base64,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", "w": 220, "h": 261}, "img4": {"d": "data:image/jpeg;base64,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", "w": 264, "h": 323}, "img5": {"d": "data:image/jpeg;base64,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", "w": 360, "h": 194}};
const FOTO_SILO = {c1:'img1',c2:'img3',c3:'img1',a1:'img2',a2:'img4',a3:'img1',a4:'img5'};
const DIAS_SEM = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
function desenharFolha(doc,d){
  const cfg=S.cfg; doc.setDrawColor(40); doc.setTextColor(20); doc.setLineWidth(0.35);
  // data
  doc.rect(197,10,26,11); doc.rect(223,10,64,11);
  doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text('DATA:',200,17.5);
  doc.setFont('helvetica','normal'); doc.text(pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(),226,17.5);
  doc.setFontSize(9); doc.text(DIAS_SEM[d.getDay()],284,17.5,{align:'right'});
  const item=(s,x,y)=>{
    const fk=FOTO_SILO[s.id]; doc.setLineWidth(0.35); doc.rect(x,y,40,38);
    if(fk&&FOTOS[fk]){ const f=FOTOS[fk]; const sc=Math.min(36/f.w,34/f.h); const w=f.w*sc,h=f.h*sc; doc.addImage(f.d,'JPEG',x+20-w/2,y+19-h/2,w,h); }
    const tx=x+46;
    doc.rect(tx,y,82,9); doc.setFont('helvetica','normal'); doc.setFontSize(12); doc.text(s.nome.toUpperCase(),tx+41,y+6.3,{align:'center'});
    const ty=y+13, c1=38,c2=22,c3=22;
    [[ 'CAPACIDADE', String(s.cap).replace('.',',') ],[ 'QUANTIDADE','' ]].forEach((r,i)=>{ const yy=ty+i*11;
      doc.rect(tx,yy,c1,11); doc.rect(tx+c1,yy,c2,11); doc.rect(tx+c1+c2,yy,c3,11);
      doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.text(r[0],tx+c1/2,yy+6.8,{align:'center'});
      if(r[1]){ doc.setFontSize(11); doc.text(r[1],tx+c1+c2/2,yy+7,{align:'center'}); }
      doc.setFontSize(8); doc.text('TONS',tx+c1+c2+c3/2,yy+6.8,{align:'center'}); });
  };
  const col=(g,x)=>{ doc.setLineWidth(0.35); doc.rect(x,25,128,9); doc.setFont('helvetica','italic'); doc.setFontSize(13); doc.text(g.toUpperCase(),x+64,31.2,{align:'center'}); };
  col('Cimento',12); col('Areia',157);
  const cim=cfg.silos.filter(s=>s.grupo==='Cimento'), are=cfg.silos.filter(s=>s.grupo==='Areia');
  cim.slice(0,3).forEach((s,i)=>item(s,12,38+i*41)); are.slice(0,3).forEach((s,i)=>item(s,157,38+i*41));
  const resto=[...cim.slice(3),...are.slice(3)];
  resto.forEach((s,i)=>item(s,84+i*145-(resto.length>1?72:0),38+3*41));
}
async function gerarFolhas(){
  const f=S.folhas; if(f.gerando) return;
  if(!window.jspdf){ toast('Não foi possível carregar o gerador de PDF. Recarregue a página.'); return; }
  const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
  f.gerando=true; rerenderSeguro();
  try{
    const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const ds=diasFolhas(); let n=0;
    ds.forEach(d=>{ for(let i=0;i<f.porDia;i++){ if(n++) doc.addPage('a4','landscape'); desenharFolha(doc,d); } });
    doc.setProperties({title:'Folhas de contagem dos silos '+fmtD(ds[0])+' a '+fmtD(ds[ds.length-1])});
    doc.autoPrint({variant:'non-conform'});
    const nome='Folhas_Silos_'+fmtD(ds[0]).replace('/','-')+'_a_'+fmtD(ds[ds.length-1]).replace('/','-')+'.pdf';
    try{ await dl.save({filename:nome,data:doc.output('blob')}); toast('PDF com '+n+' folhas gerado. Abra e imprima.'); }catch(e){ if(e&&e.code!=='declined') toast('Não foi possível baixar o arquivo.'); }
  }catch(e){ toast('Não foi possível gerar as folhas.'); }
  f.gerando=false; rerenderSeguro();
}
function premixPainel(){
  const pa=premixAtual();
  const ult=S.cfg.produtos.filter(p=>pa[p.id]).map(p=>esc(p.nome)+' '+pa[p.id].n+(pa[p.id].porLinha?' ('+porLinhaTxt(pa[p.id].porLinha)+')':'')).join(' · ');
  return `<div style="margin-top:14px;padding:16px 18px;border-radius:10px;border:1.5px solid var(--teal);background:var(--surface)">
    <div class="head" style="align-items:center"><div class="label">ATUALIZAR PREMIX LÁ EM CIMA · por linha</div><button class="lnk" data-act="fechar-premix">Fechar</button></div>
    ${ult?`<div class="sub num" style="font-size:12px">Última contagem: ${ult}</div>`:''}
    <div style="margin-top:8px">${premixGrid(S.premixForm,'pmx')}</div>
    <div class="sub" style="font-size:12px">Deixe em branco a linha que não foi contada.</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px">${horaCampo('pmx')}<button class="btn" data-act="salvar-premix">${ic('check',20,2.2)}Salvar premix</button></div>
  </div>`;
}
function pmxRes(p,v){ const n=parseInt(v,10); return isNaN(n)?'':'= '+f0(n*p.sacosPremix)+' sacos'; }

// ---------- nova medição ----------
function vMedicao(){
  const ult=saldoPorSilo();
  const corr = S.med.corrige ? S.medicoes.find(m=>m._id===S.med.corrige) : null;
  const grupo=g=>{
    const ss=S.cfg.silos.filter(s=>s.grupo===g);
    return `<section class="card" aria-label="${g}" style="padding:18px 22px 8px"><div class="head" style="align-items:baseline;padding-bottom:6px"><b style="letter-spacing:.14em;font-size:13px">${g.toUpperCase()}</b><span class="sub" style="margin:0;font-size:12px">${ss.length} silos</span></div>
    ${ss.map(s=>{ const u=ult[s.id]; return `<div class="row mrow">
      <span id="mt-${s.id}">${medTank(s)}</span>
      <div style="min-width:0"><div style="font-size:16px;font-weight:600">${esc(s.nome)}</div><div class="num" style="font-size:12px;color:var(--muted)">de ${s.cap} t${u?` · sistema ${f1(u.q)} t (${dia(u.em)} ${hora(u.em)})`:''}</div></div>
      <div class="field"><input class="mcampo" id="m-${s.id}" data-silo="${s.id}" inputmode="decimal" autocomplete="off" placeholder="—" value="${esc(S.med.v[s.id]||'')}" aria-label="${esc(s.nome)} em toneladas"><span class="u">t</span></div>
      <div class="res" id="mr-${s.id}">${medRes(s)}</div></div>`; }).join('')}</section>`;
  };
  const pa=premixAtual();
  return `${banner()}
  <div class="head"><div><div class="eyebrow">SILOS</div><h1>${corr?'Corrigir medição':'Nova medição'}</h1>
  <div class="sub">${corr?`Corrigindo a medição de ${dia(corr.em).toLowerCase()} às ${hora(corr.em)}. A original fica guardada no histórico.`:'Em branco = não medido · <b style="color:var(--ink)">0</b> = medido e vazio · Enter vai para o próximo'}</div></div>
  <div class="sub" style="padding:10px 14px;border-radius:10px;background:var(--sunken);color:var(--ink-2)">${ic('relogio',16)} Data e hora registradas <b>automaticamente</b> ao salvar</div></div>
  <div class="med-grid">${grupo('Cimento')}${grupo('Areia')}</div>
  ${(S.med.pmAberto||Object.values(S.med.pm||{}).some(v=>String(v).trim()!==''))?`<section class="card" aria-label="Premix" style="padding:18px 22px 10px">
    <div class="head" style="align-items:baseline;padding-bottom:6px"><b style="letter-spacing:.14em;font-size:13px">PREMIX LÁ EM CIMA · POR LINHA</b><span class="sub" style="margin:0;font-size:12px">opcional</span></div>
    ${premixGrid(S.med.pm,'mp')}
  </section>`:`<div><button class="btn sec" data-act="med-premix" style="height:44px">${ic('mais',18,2)}Informar premix <span style="font-weight:500;color:var(--muted)">(opcional)</span></button></div>`}
  <div style="display:grid;grid-template-columns:minmax(160px,240px) minmax(0,1fr);gap:14px;align-items:start" class="med-extra">
  <label style="display:flex;flex-direction:column;gap:6px"><span class="label">MEDIDO POR</span><input class="txt" id="m-quem" autocomplete="off" value="${esc(S.med.quem!=null?S.med.quem:ultimoMedidor())}" style="height:48px"></label>
  <label style="display:flex;flex-direction:column;gap:6px"><span class="label">OBSERVAÇÃO (OPCIONAL)</span><textarea class="txt" id="m-obs" rows="2" placeholder="Ex.: medição feita com o silo em descarga">${esc(S.med.obs)}</textarea></label></div>
  <div class="card" style="padding:14px 18px">${horaCampo('med','A medição foi feita em outro horário (informar data e hora)')}</div>
  <div class="savebar"><div><div class="num" style="font-size:16px;font-weight:700" id="m-resumo"></div><div class="sub" style="margin:0" id="m-resumo2"></div></div>
  <div style="display:flex;gap:14px;align-items:center"><button class="lnk" data-act="cancelar-med" style="color:var(--muted)">Cancelar</button><button class="btn big" id="m-salvar" data-act="salvar-med">${ic('check',22,2.2)}${corr?'Salvar correção':'Salvar medição'}</button></div></div>`;
}
function medTank(s){ const n=numIn(S.med.v[s.id]); const p=n==null?0:n/s.cap; return tankSvg(p,nivel(p).fill,24,50,4); }
function medRes(s){
  const raw=S.med.v[s.id]; const n=numIn(raw);
  if(raw==null||String(raw).trim()===''||n==null) return '';
  if(n===0) return '<span class="pill neu">Vazio</span>';
  const p=n/s.cap, nv=nivel(p);
  const extra = n>s.cap ? ' <span class="pill warn" title="Acima da capacidade">acima</span>' : '';
  return `<span class="num" style="font-weight:700;color:${nv.ink}">${f1(p*100)}% <small style="font-size:11px">${nv.n}</small></span>${extra}`;
}
function medAtualizaResumo(){
  const n=S.cfg.silos.filter(s=>numIn(S.med.v[s.id])!=null).length, nao=S.cfg.silos.length-n;
  const r=$('#m-resumo'), r2=$('#m-resumo2'), b=$('#m-salvar'); if(!r) return;
  r.textContent = n+' de '+S.cfg.silos.length+' silos preenchidos';
  r2.textContent = n===0 ? 'Preencha ao menos um silo para salvar' : nao===0 ? 'Todos os silos serão registrados' : (nao===1?'1 silo será registrado como não medido':nao+' silos serão registrados como não medidos');
  b.disabled = n===0 || S.salvando || !S.db;
}

// ---------- silos detalhe ----------
function vSilos(){
  const s=S.cfg.silos.find(x=>x.id===S.siloSel)||S.cfg.silos[0];
  const ult=saldoPorSilo();
  const serie=validas().filter(m=>m.itens&&m.itens[s.id]!=null).map(m=>({em:m.em,q:m.itens[s.id],por:m.por,obs:m.obs})).reverse();
  const recentes=serie.slice(-60);
  const chips=S.cfg.silos.map(x=>{ const u=ult[x.id]; const p=u?u.q/x.cap:0; const nv=nivel(p);
    return `<button class="opt" aria-pressed="${x.id===s.id}" data-silo-sel="${x.id}" style="flex:1 1 130px;min-height:0;padding:10px 12px"><span style="font-size:12px">${esc(x.nome)} <small style="display:inline">${x.grupo}</small></span><span class="bar" style="display:block"><i style="width:${u?Math.min(100,p*100):0}%;background:${nv.fill}"></i></span></button>`; }).join('');
  // gráfico
  let chart='<div class="empty">Ainda não há medições deste silo.</div>';
  if(recentes.length){
    const W=1000,H=280,X0=48,X1=W-16,Y0=16,Y1=H-34;
    const t0=new Date(recentes[0].em).getTime(), t1=new Date(recentes[recentes.length-1].em).getTime(); const span=Math.max(t1-t0,36e5);
    const x=t=>X0+(recentes.length===1?0.5:(t-t0)/span)*(X1-X0), y=q=>Y1-Math.min(q,s.cap)/s.cap*(Y1-Y0);
    const pts=recentes.map(r=>[x(new Date(r.em).getTime()),y(r.q),r]);
    let g='';
    [0,.25,.5,.75,1].forEach(f=>{ const yy=Y1-f*(Y1-Y0); g+=`<line x1="${X0}" x2="${X1}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${X0-8}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--muted)">${f1(s.cap*f)}</text>`; });
    const descargas=S.cargas.filter(c=>c.etapas&&c.etapas.descarregado).map(c=>new Date(c.etapas.descarregado).getTime()).filter(t=>t>=t0&&t<=t1);
    if(s.grupo==='Cimento') descargas.forEach(t=>{ const xx=x(t); g+=`<line x1="${xx}" x2="${xx}" y1="${Y0}" y2="${Y1}" stroke="var(--warn-ink)" stroke-width="1.5" stroke-dasharray="4 4"/>`; });
    g+=`<path d="${pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')}" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round"/>`;
    g+=pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="var(--teal)" stroke="var(--surface)" stroke-width="2"><title>${dia(p[2].em)} ${hora(p[2].em)} — ${f1(p[2].q)} t</title></circle>`).join('');
    g+=`<text x="${X0}" y="${H-10}" font-size="11" fill="var(--muted)">${dia(recentes[0].em)} ${hora(recentes[0].em)}</text><text x="${X1}" y="${H-10}" font-size="11" fill="var(--muted)" text-anchor="end">${dia(recentes[recentes.length-1].em)} ${hora(recentes[recentes.length-1].em)}</text>`;
    chart=`<div style="overflow-x:auto"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nível do ${esc(s.nome)} nas últimas medições, em toneladas">${g}</svg></div>
    <div class="legend" style="margin-top:6px"><span><i style="background:var(--teal)"></i>Nível medido (t)</span>${s.grupo==='Cimento'?'<span><i style="background:transparent;border-top:2px dashed var(--warn-ink);height:0;border-radius:0"></i>Carga descarregada</span>':''}</div>`;
  }
  const u=ult[s.id]; const nv=u?nivel(u.q/s.cap):null;
  const zeros=serie.filter(r=>r.q===0).length;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">SILOS</div><h1>${esc(s.nome)}</h1><div class="sub">${s.grupo} · capacidade ${s.cap} t</div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">${siloPodeMedir()?`<button class="btn" data-act="sm-abrir" data-silo="${s.id}">📏 Registrar medição</button>`:''}<button class="btn sec" data-act="export" data-kind="silo">${ic('baixar',18,2)}Exportar medições</button></div></div>
  ${siloFormHtml(s)}
  <div style="display:flex;gap:8px;flex-wrap:wrap" role="group" aria-label="Escolher silo">${chips}</div>
  <section class="card">
    <div style="display:flex;gap:36px;flex-wrap:wrap;margin-bottom:16px">
      <div><div class="label">AGORA</div><div class="num" style="margin-top:4px"><span style="font-size:28px;font-weight:700">${u?f1(u.q)+' t':'—'}</span>${u?` <span style="font-weight:700;color:${nv.ink}">${f1(u.q/s.cap*100)}% ${nv.n}</span>`:''}</div><div class="sub" style="margin:0;font-size:12px">${siloAgoraSub(s,u)}</div></div>
      <div><div class="label">MEDIÇÕES</div><div class="num" style="font-size:28px;font-weight:700;margin-top:4px">${serie.length}</div></div>
      <div><div class="label">VEZES MEDIDO VAZIO</div><div class="num" style="font-size:28px;font-weight:700;margin-top:4px">${zeros}</div></div>
    </div>
    ${chart}
  </section>
  <section class="card"><div class="label" style="margin-bottom:6px">MEDIÇÕES DO ${esc(s.nome).toUpperCase()}</div>
  ${serie.length?serie.slice().reverse().slice(0,40).map(r=>{ const nv=nivel(r.q/s.cap); return `<div class="row num" style="grid-template-columns:150px 90px minmax(0,1fr)"><span style="color:var(--ink-2)">${dia(r.em)} · ${hora(r.em)}</span><b style="text-align:right">${f1(r.q)} t</b><span style="color:${nv.ink};font-weight:700">${f1(r.q/s.cap*100)}% <small style="font-weight:600">${r.q===0?'Vazio':nv.n}</small> <small style="color:var(--muted);font-weight:400">· ${esc(nomeDe(r.por))}${r.obs?' · '+esc(r.obs):''}</small></span></div>`; }).join(''):'<div class="empty">Sem medições.</div>'}
  </section>`;
}

// ---------- cargas ----------
const ETAPAS=['A caminho','Chegou','Descarregado'], EKEY=['caminho','chegou','descarregado'];
function vCargas(){
  const hoje=ini0(new Date()).getTime();
  const andamento=S.cargas.filter(c=>etapaCarga(c)<2).sort((a,b)=>(a.criadaEm||'').localeCompare(b.criadaEm||''));
  const desc=S.cargas.filter(c=>etapaCarga(c)===2 && new Date(c.etapas.descarregado).getTime()>=hoje).sort((a,b)=>b.etapas.descarregado.localeCompare(a.etapas.descarregado));
  const aCam=andamento.filter(c=>etapaCarga(c)===0).length, naFab=andamento.length-aCam;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">CARGAS</div><h1>Cargas de cimento</h1><div class="sub">Número da nota e um toque em cada etapa. A hora é registrada automaticamente.</div></div>
  <button class="btn big" data-act="abrir-carga">${ic('mais',22,2.2)}Nova carga</button></div>
  ${S.abrirCarga?novaCargaPainel():''}
  <div class="num" style="display:flex;gap:26px;flex-wrap:wrap;padding:14px 20px;border-radius:10px;background:var(--sunken);font-size:14px;color:var(--ink-2)">
    <span><b style="font-size:18px;color:var(--ink)">${andamento.length}</b> em andamento</span><span><b style="font-size:18px;color:var(--ink)">${aCam}</b> a caminho</span><span><b style="font-size:18px;color:var(--ink)">${naFab}</b> na fábrica</span><span><b style="font-size:18px;color:var(--ink)">${desc.length}</b> descarregada${desc.length===1?'':'s'} hoje</span></div>
  <div class="label" style="letter-spacing:.14em">EM ANDAMENTO</div>
  ${andamento.length?andamento.map(cargaCard).join(''):'<div class="card empty">Nenhuma carga em andamento. Toque em “Nova carga” quando receber a nota.</div>'}
  <section class="card"><div class="head" style="align-items:baseline"><div class="label">DESCARREGADAS HOJE</div><button class="lnk" data-act="ch-ir">Ver histórico completo ↓</button></div>
  ${desc.length?desc.map(c=>{ const e=c.etapas; return `<div class="row num" style="grid-template-columns:150px minmax(0,1fr) auto"><div><b>NF ${esc(c.nota)}</b><div class="sub" style="margin:0;font-size:12px">${c.qtd!=null?f1(c.qtd)+' t':'quantidade não informada'}</div></div>
  <span style="font-size:13px;color:var(--ink-2)">${e.caminho?'Registrada '+hora(e.caminho)+' → ':''}${e.chegou?'Chegou '+hora(e.chegou)+' → ':''}Descarregado ${hora(e.descarregado)}</span>${e.chegou?`<span class="pill neu">Na fábrica ${dur(new Date(e.descarregado)-new Date(e.chegou))}</span>`:''}</div>`; }).join(''):'<div class="empty">Nenhuma descarga hoje.</div>'}</section>
  ${cargasHist()}`;
}
S.chist={q:'',per:'30',de:'',ate:'',n:150};
function cRef(c){ const e=c.etapas||{}; return e.descarregado||e.chegou||e.caminho||c.criadaEm||''; }
function cargasFiltro(){ const H=S.chist, h=hojeStr(); let de='',ate='';
  if(H.per==='hoje'){ de=ate=h; } else if(H.per==='7'){ de=addDias(h,-6); ate=h; } else if(H.per==='30'){ de=addDias(h,-29); ate=h; } else if(H.per==='mes'){ de=h.slice(0,8)+'01'; ate=h; } else if(H.per==='datas'){ de=H.de||''; ate=H.ate||''; }
  const q=buscaNorm(H.q||'').trim();
  const ids=new Set(S.cargas.map(c=>c._id)); const todas=S.cargas.concat((S.cargasAnt||[]).filter(c=>!ids.has(c._id)));
  return todas.filter(c=>{ const r=cRef(c); if(!r) return false; const d=hojeStr(new Date(r)); if(de&&d<de) return false; if(ate&&d>ate) return false;
    if(q){ const e=c.etapas||{}; const txt=buscaNorm(['nf '+c.nota,c.nota,c.qtd!=null?f1(c.qtd):'',dm(d),dataBR(d),nomeDe(c.por),nomeDe(c['por_descarregado']),nomeDe(c['por_chegou']),c.obs||''].join(' ')); if(!q.split(/\s+/).every(t=>txt.includes(t))) return false; }
    return true; }).sort((a,b)=>cRef(b).localeCompare(cRef(a))); }
function cargasHist(){ const H=S.chist, xs=cargasFiltro(); const tot=xs.reduce((a,c)=>a+(+c.qtd||0),0);
  const tf=xs.map(c=>{ const e=c.etapas||{}; return e.chegou&&e.descarregado?new Date(e.descarregado)-new Date(e.chegou):null; }).filter(x=>x!=null&&x>=0); const med=tf.length?tf.reduce((a,b)=>a+b,0)/tf.length:null;
  const per=[['hoje','Hoje'],['7','7 dias'],['30','30 dias'],['mes','Este mês'],['tudo','Tudo'],['datas','Escolher datas']];
  const vis=xs.slice(0,H.n);
  return `<section class="card" id="ch-sec"><div class="head" style="align-items:baseline"><h2>Histórico de cargas</h2><button class="btn sec" data-act="ch-csv" style="height:38px" ${xs.length?'':'disabled'}>${ic('baixar',16,2)}Baixar planilha (CSV)</button></div>
   <div class="chf"><input class="txt" id="ch-q" type="search" placeholder="Pesquisar NF, data (dd/mm), quantidade ou pessoa" value="${esc(H.q)}" aria-label="Pesquisar cargas">
    <div class="seg" role="group" aria-label="Período">${per.map(([k,l])=>`<button data-act="ch-per" data-v="${k}" aria-pressed="${H.per===k}">${l}</button>`).join('')}</div>
    ${H.per==='datas'?`<span class="chd"><input type="date" class="txt" id="ch-de" value="${esc(H.de)}" aria-label="De"> até <input type="date" class="txt" id="ch-ate" value="${esc(H.ate)}" aria-label="Até"></span>`:''}</div>
   <div class="rsm num" style="margin:10px 0 6px"><span>Cargas <b>${xs.length}</b></span><span>Toneladas <b>${f1(tot)}</b></span>${med!=null?`<span>Tempo médio na fábrica <b>${dur(med)}</b></span>`:''}</div>
   ${xs.length?`<div class="chw"><table class="cht"><thead><tr><th>Data</th><th>NF</th><th class="r">Qtd (t)</th><th>A caminho</th><th>Chegou</th><th>Descarregado</th><th>Na fábrica</th><th>Situação</th><th>Registrado por</th></tr></thead><tbody>
    ${vis.map(c=>{ const e=c.etapas||{}, et=etapaCarga(c), d=hojeStr(new Date(cRef(c))); const hc=k=>e[k]?hora(e[k])+(hojeStr(new Date(e[k]))!==d?' <small>'+dm(hojeStr(new Date(e[k])))+'</small>':'')+(c['manual_'+k]?' <small title="Horário informado manualmente">✎</small>':''):'<span style="color:var(--faint)">—</span>';
      return `<tr><td class="num">${dm(d)}<small>${esc(['dom','seg','ter','qua','qui','sex','sáb'][new Date(d+'T12:00').getDay()])}</small></td><td class="num"><b>${esc(c.nota)}</b></td><td class="num r">${c.qtd!=null?f1(c.qtd):'—'}</td><td class="num">${hc('caminho')}</td><td class="num">${hc('chegou')}</td><td class="num">${hc('descarregado')}</td><td class="num">${e.chegou&&e.descarregado?dur(new Date(e.descarregado)-new Date(e.chegou)):'—'}</td><td><span class="pill ${et===2?'ok':et===1?'warn':'neu'}">${et===2?'Descarregada':et===1?'Na fábrica':'A caminho'}</span></td><td>${esc(nomeDe(c.por))}</td></tr>`; }).join('')}
   </tbody></table></div>${S.cargas.length>=1000&&!S.chist.fimAnt?`<div class="sub" style="text-align:center;margin-top:8px;font-size:12px">O painel mostra as 1.000 cargas mais recentes. <button class="lnk" data-act="ch-ant">Carregar cargas mais antigas</button></div>`:''}${xs.length>vis.length?`<div style="text-align:center;margin-top:10px"><button class="btn sec" data-act="ch-mais" style="height:38px">Mostrar mais (${xs.length-vis.length})</button></div>`:''}`:`<div class="empty">Nenhuma carga ${H.q?'encontrada para essa pesquisa':'nesse período'}.</div>`}
  </section>`; }
document.addEventListener('click',async ev=>{ const b=ev.target.closest('[data-act^="ch-"]'); if(!b||b.disabled) return; const H=S.chist, act=b.dataset.act;
  if(act==='ch-ir'){ const x=$('#ch-sec'); x&&x.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(act==='ch-per'){ H.per=b.dataset.v; H.n=150; if(H.per==='datas'&&!H.de){ H.de=addDias(hojeStr(),-29); H.ate=hojeStr(); } render(); return; }
  if(act==='ch-mais'){ H.n+=300; render(); return; }
  if(act==='ch-ant'){ if(!S.db) return; const all=S.cargas.concat(S.cargasAnt||[]); const min=all.map(c=>c.criadaEm).filter(Boolean).sort()[0]; if(!min) return; b.disabled=true; b.textContent='Carregando…';
    try{ const snap=await S.db.collection('cargas').where('criadaEm','<',min).orderBy('criadaEm','desc').limit(1000).get(); const xs=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); S.cargasAnt=(S.cargasAnt||[]).concat(xs); if(xs.length<1000) H.fimAnt=true; toast(xs.length?xs.length+' cargas antigas carregadas.':'Não há cargas mais antigas.'); H.per='tudo'; }catch(e){ erro(e); } render(); return; }
  if(act==='ch-csv'){ const xs=cargasFiltro(); const dl=await window.claude?.use?.('downloads'); if(!dl){ toast('Download indisponível nesta visualização.'); return; }
    const f=iso=>iso?dataBR(hojeStr(new Date(iso)))+' '+hora(iso):''; const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const lin=[['Data','NF','Quantidade (t)','A caminho','Chegou','Descarregado','Minutos na fabrica','Situacao','Registrado por'].join(';')].concat(xs.map(c=>{ const e=c.etapas||{}, et=etapaCarga(c); return [dataBR(hojeStr(new Date(cRef(c)))),c.nota,c.qtd!=null?String(c.qtd).replace('.',','):'',f(e.caminho),f(e.chegou),f(e.descarregado),e.chegou&&e.descarregado?Math.round((new Date(e.descarregado)-new Date(e.chegou))/6e4):'',et===2?'Descarregada':et===1?'Na fabrica':'A caminho',nomeDe(c.por)].map(q).join(';'); }));
    try{ await dl.save({filename:'Cargas_cimento_'+hojeStr()+'.csv',data:new Blob(['\ufeff'+lin.join('\r\n')],{type:'text/csv'})}); toast(xs.length+' cargas exportadas.'); }catch(e){ if(!e||e.code!=='declined') toast('Não foi possível baixar.'); } return; }
});
document.addEventListener('input',ev=>{ const t=ev.target; if(t.id!=='ch-q') return; S.chist.q=t.value; S.chist.n=150; clearTimeout(S.chist._t); S.chist._t=setTimeout(()=>{ const pos=t.selectionStart; render(); const n=$('#ch-q'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },250); });
document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='ch-de'||t.id==='ch-ate'){ S.chist[t.id==='ch-de'?'de':'ate']=t.value; render(); } });
function cargaCard(c){
  const at=etapaCarga(c), e=c.etapas||{};
  const trilha=ETAPAS.map((n,i)=>{ const h=e[EKEY[i]]; const est=i===at?'atual':i<at?(h?'feito':'pulado'):'futuro';
    const dot={atual:'width:16px;height:16px;background:var(--teal);box-shadow:0 0 0 5px rgba(27,92,122,.18)',feito:'width:12px;height:12px;background:var(--teal)',pulado:'width:10px;height:10px;background:var(--surface);border:2px dashed var(--faint)',futuro:'width:10px;height:10px;background:var(--surface);border:2px solid var(--line)'}[est];
    const a=i===0?'transparent':(i<=at?'var(--teal)':'var(--line)'), b=i===2?'transparent':(i<at?'var(--teal)':'var(--line)');
    return `<div class="et"><div class="l"><i class="a" style="background:${a}"></i><i class="b" style="background:${b}"></i><span class="dot" style="${dot}"></span></div><div class="n" style="${est==='atual'?'font-weight:700;color:var(--teal-strong)':est==='feito'?'font-weight:600':'color:var(--muted)'}">${n}</div><div class="h num">${h?hora(h):est==='pulado'?'não registrado':''}</div></div>`; }).join('');
  const ref=e[EKEY[at]];
  return `<article class="card carga"><div><div class="num" style="font-size:18px;font-weight:700">NF ${esc(c.nota)}</div><div class="sub" style="margin:2px 0 0;font-size:12px">${c.qtd!=null?f1(c.qtd)+' t':'Quantidade não informada'}</div></div>
  <div class="trilha">${trilha}</div>
  <div class="cside"><div class="tempo" style="text-align:right"><div class="sub" style="margin:0;font-size:12px">${at===0?'A caminho há':'Na fábrica há'}</div><div class="num" style="font-size:22px;font-weight:700">${ref?dur(Date.now()-new Date(ref)):'—'}</div></div>
  <button class="btn" data-act="etapa" data-id="${c._id}" data-k="${EKEY[at+1]}">${ETAPAS[at+1]}${ic('seta',18,2.2)}</button>
  <button class="lnk" data-act="outra-hora" data-tipo="etapa" data-id="${c._id}" data-k="${EKEY[at+1]}" style="color:var(--muted)">${ETAPAS[at+1]} em outro horário</button>
  ${at===0?`<button class="lnk" data-act="etapa" data-id="${c._id}" data-k="descarregado" style="color:var(--muted)">Já foi descarregado</button>`:''}</div>${hpPainel('etapa',c._id)}</article>`;
}
function hpPainel(tipo,id){ const hp=S.hp; if(!hp||hp.tipo!==tipo||hp.id!==id) return '';
  return `<div class="hora-box" style="grid-column:1/-1;padding:12px 14px;border-radius:10px;background:var(--surface-2)"><span>Informe quando aconteceu:</span><input type="datetime-local" id="hp-val" value="${esc(hp.val)}" max="${localVal(new Date())}" aria-label="Data e hora"><button class="btn" data-act="hp-ok" style="height:40px">Confirmar</button><button class="lnk" data-act="hp-cancelar">Cancelar</button></div>`; }
function novaCargaPainel(){
  const f=S.carga;
  return `<section class="card" aria-label="Nova carga" style="border:1.5px solid var(--teal)">
  <div class="head" style="align-items:baseline"><h2>Nova carga</h2><button class="lnk" data-act="fechar-carga">Fechar</button></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:14px">
   <label style="display:flex;flex-direction:column;gap:6px"><span class="label">NÚMERO DA NOTA</span><input class="txt num" id="c-nota" inputmode="numeric" autocomplete="off" value="${esc(f.nota)}" style="height:54px;font-size:22px;font-weight:700"></label>
   <label style="display:flex;flex-direction:column;gap:6px"><span class="label">QUANTIDADE (OPCIONAL)</span><div class="field"><input id="c-qtd" inputmode="decimal" autocomplete="off" placeholder="—" value="${esc(f.qtd)}"><span class="u">t</span></div></label>
  </div>
  <div class="label" style="margin:16px 0 8px">SITUAÇÃO AGORA</div>
  <div class="opts" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${ETAPAS.map((n,i)=>`<button class="opt" data-act="c-sit" data-k="${EKEY[i]}" aria-pressed="${f.sit===EKEY[i]}">${n}<small>${['Nota recebida, ainda não chegou','Caminhão na fábrica','Descarga concluída'][i]}</small></button>`).join('')}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px">${horaCampo('carga')}<button class="btn big" data-act="salvar-carga">${ic('check',22,2.2)}Registrar carga</button></div></section>`;
}

// ---------- paradas ----------
function vParadas(){
  const hoje=ini0(new Date()).getTime();
  const ativas=S.paradas.filter(p=>!p.fim);
  const deHoje=S.paradas.filter(p=>new Date(p.inicio).getTime()>=hoje||!p.fim).sort((a,b)=>b.inicio.localeCompare(a.inicio));
  const porMotivo={}; let total=0;
  deHoje.forEach(p=>{ const ms=(p.fim?new Date(p.fim):new Date())-new Date(p.inicio); porMotivo[p.motivo]=(porMotivo[p.motivo]||0)+ms; total+=ms; });
  const max=Math.max(1,...Object.values(porMotivo));
  const cards=linhasParada().map(l=>{ const a=ativas.find(p=>p.linha===l); const ult=S.paradas.filter(p=>p.linha===l&&p.fim).sort((x,y)=>y.fim.localeCompare(x.fim))[0];
    return `<article class="lcard ${a?'parada':''}"><div class="head" style="align-items:center"><b style="font-size:19px">${esc(l)}</b><span class="pill ${a?'crit':'ok'}">${a?'Parada':'Produzindo'}</span></div>
    <div><div class="num" style="font-size:21px;font-weight:700">${a?'Parada há '+dur(Date.now()-new Date(a.inicio)):'Produzindo'}</div><div class="sub" style="margin:2px 0 0;font-size:13px">${a?'Desde '+hora(a.inicio)+' · '+esc(a.motivo):ult?'Última parada: '+esc(ult.motivo)+' ('+dia(ult.fim)+' '+hora(ult.fim)+')':'Sem paradas registradas'}</div>${(()=>{ const r=ordemRodando(l); return r?`<div class="sub num" style="margin:6px 0 0;font-size:12px">${ic('lista',13)} Ordem ${esc(r.num)} · ${esc(codigoDe(r))} · pendente ${fq(r.total-entregueDe(r))}</div>`:''; })()}</div>
    ${a?`<button class="btn" data-act="voltou" data-id="${a._id}">${ic('play',20,2)}Voltou a produzir</button><button class="lnk" data-act="outra-hora" data-tipo="voltou" data-id="${a._id}" style="align-self:flex-start">Voltou em outro horário</button>${hpPainel('voltou',a._id)}`:`<button class="btn warn" data-act="parar" data-linha="${esc(l)}">${ic('pausa',20,2)}Parar linha</button>`}</article>`; }).join('');
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Paradas de produção</h1><div class="sub">Linha + motivo. Início, volta e duração são automáticos.</div></div></div>
  ${S.abrirParar?pararPainel():''}
  ${parSemMotivo()}
  <div class="linhas">${cards}</div>
  <div class="two">
   <section class="card"><div class="label" style="margin-bottom:4px">PARADAS DE HOJE</div>
   ${deHoje.length?deHoje.map(p=>S.parEd===p._id?parEdForm(p):`<div class="row num" style="grid-template-columns:90px minmax(0,1fr) auto auto"><b>${esc(p.linha)}</b><span>${p.motivo==='A definir'?'<span class="pill warn">sem motivo</span>':esc(p.motivo)}<br><small style="color:var(--muted)">${hora(p.inicio)} → ${p.fim?hora(p.fim):'em andamento'}${p.ordem?' · ordem '+esc(p.ordem):''}${p.obs?' · '+esc(p.obs):''}${(p.edits||[]).length?' · editada':''}</small></span><span class="pill ${p.fim?'neu':'crit'}">${dur((p.fim?new Date(p.fim):new Date())-new Date(p.inicio))}</span><button class="lnk" data-act="par-ed" data-id="${esc(p._id)}" style="padding:0 2px">Editar</button></div>`).join(''):'<div class="empty">Nenhuma parada hoje.</div>'}</section>
   <section class="card"><div class="label">TEMPO PARADO HOJE</div><div class="num" style="margin-top:6px"><span style="font-size:28px;font-weight:700">${dur(total)}</span> <span class="sub">${deHoje.length} parada${deHoje.length===1?'':'s'}</span></div>
   ${Object.keys(porMotivo).sort((a,b)=>porMotivo[b]-porMotivo[a]).map(m=>`<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(m)}</span><b class="num">${dur(porMotivo[m])}</b></div><div class="bar"><i style="width:${porMotivo[m]/max*100}%"></i></div></div>`).join('')}</section>
  </div>`;
}
function parEdForm(p){ const lv=iso=>iso?localVal(new Date(iso)):'';
  return `<div class="pared"><div class="label" style="margin-bottom:8px">EDITAR PARADA</div><div class="pared-g">
   <label><span class="sub">Linha</span><select class="txt" id="pe-linha">${linhasParada().map(l=>`<option ${l===p.linha?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
   <label><span class="sub">Motivo</span><select class="txt" id="pe-motivo">${[...new Set([...(S.cfg.motivos||[]),p.motivo])].map(m=>`<option ${m===p.motivo?'selected':''}>${esc(m)}</option>`).join('')}</select></label>
   <label><span class="sub">Parou em</span><input class="txt" type="datetime-local" id="pe-ini" value="${lv(p.inicio)}" max="${localVal(new Date())}"></label>
   <label><span class="sub">Voltou em ${p.fim?'':'<small>(vazio = ainda parada)</small>'}</span><input class="txt" type="datetime-local" id="pe-fim" value="${lv(p.fim)}" max="${localVal(new Date())}"></label>
   <label><span class="sub">Ordem</span><input class="txt num" id="pe-ordem" value="${esc(p.ordem||'')}" placeholder="opcional"></label>
   <label style="grid-column:1/-1"><span class="sub">Observação</span><input class="txt" id="pe-obs" value="${esc(p.obs||'')}" placeholder="opcional"></label></div>
   <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px"><button class="btn sec" data-act="par-ed-x" style="height:40px">Cancelar</button><button class="btn" data-act="par-ed-salvar" data-id="${esc(p._id)}" style="height:40px">${ic('check',16,2.2)}Salvar</button></div></div>`; }
function pararPainel(){
  const f=S.parar; const ativas=new Set(S.paradas.filter(p=>!p.fim).map(p=>p.linha));
  return `<section class="card" aria-label="Parar linha" style="border:1.5px solid var(--crit)">
  <div class="head" style="align-items:baseline"><h2>Parar linha</h2><button class="lnk" data-act="fechar-parar">Fechar</button></div>
  <div class="sub" style="margin-top:2px">${ic('relogio',15)} Início com a hora atual — ou informe abaixo o horário em que parou e, se já voltou, o horário da volta</div>
  <div class="label" style="margin:16px 0 8px">QUAL LINHA?</div>
  <div class="opts" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">${linhasParada().map(l=>`<button class="opt" data-act="p-linha" data-v="${esc(l)}" aria-pressed="${f.linha===l}" ${ativas.has(l)?'disabled style="opacity:.5;cursor:not-allowed"':''}>${esc(l)}${ativas.has(l)?'<small>já parada</small>':''}</button>`).join('')}</div>
  ${f.linha?(()=>{ const h=hojeStr(); const os=ordAbertas().filter(o=>o.linha===f.linha&&dataEf(o)<=h); return os.length?`<div class="label" style="margin:16px 0 8px">ORDEM QUE ESTAVA RODANDO</div><div class="opts" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${os.map(o=>`<button class="opt" data-act="p-ordem" data-v="${esc(o._id)}" aria-pressed="${f.ordem===o._id}">${esc(o.num)}<small>${esc(codigoDe(o))} · ${esc(nomeCurto(o))}</small></button>`).join('')}<button class="opt" data-act="p-ordem" data-v="" aria-pressed="${!f.ordem}">Nenhuma<small>parada sem ordem</small></button></div>`:''; })():''}
  <div class="label" style="margin:16px 0 8px">MOTIVO</div>
  <div class="opts" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${S.cfg.motivos.map(m=>`<button class="opt" data-act="p-motivo" data-v="${esc(m)}" aria-pressed="${f.motivo===m}">${esc(m)}</button>`).join('')}<button class="opt" data-act="p-motivo" data-v="A definir" aria-pressed="${f.motivo==='A definir'}" style="border-style:dashed">Ainda não sei<small>o PCP escolhe o motivo depois</small></button></div>
  <label style="display:flex;flex-direction:column;gap:6px;margin-top:14px"><span class="label">OBSERVAÇÃO (OPCIONAL)</span><input class="txt" id="p-obs" value="${esc(f.obs)}" autocomplete="off"></label>
  <div class="label" style="margin:16px 0 6px">HORÁRIOS</div><div style="display:flex;flex-direction:column;gap:6px">${horaCampo('parar','A linha parou em outro horário')}${horaCampo('pararFim','A linha já voltou — informar a hora da volta')}</div>
  <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px"><button class="btn big" data-act="salvar-parada" ${f.linha&&f.motivo?'':'disabled'}>${ic('pausa',22,2)}Registrar parada</button></div></section>`;
}

// ---------- histórico ----------
const TIPO={medicao:{r:'Medição',bg:'var(--teal-tint)',fg:'var(--teal)',ic:'silo'},premix:{r:'Premix',bg:'var(--teal-wash)',fg:'var(--teal-strong)',ic:'premix'},carga:{r:'Carga',bg:'var(--sunken)',fg:'var(--warn-ink)',ic:'rota'},parada:{r:'Parada',bg:'var(--crit-tint)',fg:'var(--crit-ink)',ic:'pausa'},voltou:{r:'Voltou',bg:'var(--ok-tint)',fg:'var(--ok-ink)',ic:'play'}};
function eventos(){
  const ev=[]; const corr=corrigidas();
  S.medicoes.forEach(m=>{ const it=m.itens||{}; const n=Object.keys(it).length; const vaz=S.cfg.silos.filter(s=>it[s.id]===0).map(s=>s.nome);
    ev.push({t:'medicao',grp:'medicao',em:m.em,titulo:(m.corrige?'Correção de medição':'Medição dos silos'),manual:!!m.horaManual,det:`${n} de ${S.cfg.silos.length} silos${vaz.length?' · vazio: '+vaz.join(', '):''}${m.obs?' · '+m.obs:''}${m.medidoPor?' · medido por '+m.medidoPor+' · lançado por '+nomeDe(m.por):' · '+nomeDe(m.por)}`,id:m._id,corrigida:corr.has(m._id),alerta:vaz.length>0}); });
  S.premix.forEach(p=>{ const v=p.valores||{}, pl=p.porLinha||{}; ev.push({t:'premix',grp:'premix',em:p.em,manual:!!p.horaManual,titulo:'Premix atualizado',det:S.cfg.produtos.filter(x=>v[x.id]!=null).map(x=>x.nome+' '+v[x.id]+(pl[x.id]?' ('+Object.keys(pl[x.id]).map(l=>l+': '+pl[x.id][l]).join(', ')+')':'')+' = '+f0(v[x.id]*x.sacosPremix)+' sacos').join(' · ')+' · '+nomeDe(p.por)}); });
  S.cargas.forEach(c=>{ const e=c.etapas||{}; EKEY.forEach((k,i)=>{ if(e[k]) ev.push({t:'carga',grp:'carga',em:e[k],manual:!!c['manual_'+k],titulo:`Carga NF ${c.nota} — ${ETAPAS[i].toLowerCase()}`,det:(c.qtd!=null?f1(c.qtd)+' t':'')+(k==='descarregado'&&e.chegou?' · ficou '+dur(new Date(e.descarregado)-new Date(e.chegou))+' na fábrica':'')}); }); });
  S.paradas.forEach(p=>{ ev.push({t:'parada',grp:'parada',em:p.inicio,manual:!!p.horaManual,titulo:`${p.linha} parou`,det:'Motivo: '+p.motivo+(p.obs?' · '+p.obs:''),alerta:true});
    if(p.fim) ev.push({t:'voltou',grp:'parada',em:p.fim,manual:!!p.fimManual,titulo:`${p.linha} voltou a produzir`,det:p.motivo,dur:'Parada de '+dur(new Date(p.fim)-new Date(p.inicio))}); });
  return ev.sort((a,b)=>b.em.localeCompare(a.em));
}
function evRow(e){ const T=TIPO[e.t];
  return `<div class="ev"><div class="t num">${hora(e.em)}<small>${dia(e.em)}</small></div><div class="ic" style="background:${T.bg};color:${T.fg}">${ic(T.ic,17,1.9)}</div>
  <div style="min-width:0"><div class="tg" style="color:${T.fg}">${T.r}${e.manual?'<span class="manual" title="Data e hora informadas manualmente">hora informada</span>':''}${e.corrigida?' · <span style="color:var(--muted)">corrigida</span>':''}</div><div class="tt" style="${e.corrigida?'text-decoration:line-through;color:var(--muted)':''}">${esc(e.titulo)}</div><div class="dd num">${esc(e.det)}</div></div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${e.dur?`<span class="pill crit num">${esc(e.dur)}</span>`:''}${e.t==='medicao'&&!e.corrigida&&S.view==='historico'?`<button class="lnk" data-act="corrigir" data-id="${e.id}">Corrigir</button>`:''}</div></div>`; }
function periodo(){ const h=ini0(new Date()).getTime(); const p=S.hist.per;
  if(p==='hoje') return [h,Infinity]; if(p==='ontem') return [h-864e5,h]; if(p==='7') return [h-6*864e5,Infinity]; return [h-29*864e5,Infinity]; }
function vHistorico(){
  const [a,b]=periodo();
  const todos=eventos().filter(e=>{ const t=new Date(e.em).getTime(); return t>=a&&t<b; });
  const vis=todos.filter(e=>S.hist.tipos[e.grp]);
  const par=S.paradas.filter(p=>{ const t=new Date(p.inicio).getTime(); return t>=a&&t<b; });
  const porM={}; let tot=0; par.forEach(p=>{ const ms=(p.fim?new Date(p.fim):new Date())-new Date(p.inicio); porM[p.motivo]=(porM[p.motivo]||0)+ms; tot+=ms; });
  const mx=Math.max(1,...Object.values(porM));
  const vazios=[]; S.medicoes.forEach(m=>{ const t=new Date(m.em).getTime(); if(t<a||t>=b) return; S.cfg.silos.forEach(s=>{ if(m.itens&&m.itens[s.id]===0) vazios.push(s.nome+' · '+dia(m.em)+' '+hora(m.em)); }); });
  const desc=S.cargas.filter(c=>c.etapas&&c.etapas.descarregado&&(t=>t>=a&&t<b)(new Date(c.etapas.descarregado).getTime()));
  const perLbl={hoje:'Hoje',ontem:'Ontem','7':'Últimos 7 dias','30':'Últimos 30 dias'}[S.hist.per];
  return `${banner()}
  <div class="head"><div><div class="eyebrow">HISTÓRICO</div><h1>Linha do tempo</h1><div class="sub">Tudo o que foi registrado, em ordem. Nada é apagado: correções ficam ao lado do original.</div></div>
  <button class="btn sec" data-act="export" data-kind="hist">${ic('baixar',18,2)}Exportar período (CSV)</button></div>
  <div class="card" style="padding:14px 18px"><div class="chips"><span class="label">PERÍODO</span>${[['hoje','Hoje'],['ontem','Ontem'],['7','7 dias'],['30','30 dias']].map(([k,l])=>`<button class="chip" data-act="h-per" data-k="${k}" aria-pressed="${S.hist.per===k}">${l}</button>`).join('')}
  <span style="width:12px"></span><span class="label">MOSTRAR</span>${[['medicao','Medições'],['premix','Premix'],['carga','Cargas'],['parada','Paradas']].map(([k,l])=>`<button class="chip" data-act="h-tipo" data-k="${k}" aria-pressed="${!!S.hist.tipos[k]}">${l}</button>`).join('')}</div></div>
  <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:20px;align-items:start" class="hist-grid">
   <section class="card" style="padding:16px 18px"><div class="head" style="align-items:baseline;padding-bottom:6px"><div class="label">${perLbl.toUpperCase()}</div><span class="sub num" style="margin:0">${vis.length} eventos</span></div>
   ${vis.length?vis.map(evRow).join(''):'<div class="empty">Nada registrado neste período.</div>'}</section>
   <aside class="card"><h2>Resumo do período</h2><div class="sub" style="margin:2px 0 14px">${perLbl}</div>
    <div style="border-top:1px solid var(--line-2);padding-top:14px"><div class="label">PARADAS</div><div class="num" style="margin-top:4px"><b style="font-size:24px">${dur(tot)}</b> <span class="sub">${par.length} parada${par.length===1?'':'s'}</span></div>
    ${Object.keys(porM).sort((x,y)=>porM[y]-porM[x]).map(m=>`<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(m)}</span><b class="num">${dur(porM[m])}</b></div><div class="bar"><i style="width:${porM[m]/mx*100}%"></i></div></div>`).join('')}</div>
    <div style="border-top:1px solid var(--line-2);padding-top:14px;margin-top:16px"><div class="label">SILOS MEDIDOS VAZIOS</div><div style="margin-top:6px;font-size:13px">${vazios.length?vazios.map(v=>`<div style="color:var(--crit-ink)">${esc(v)}</div>`).join(''):'<span class="sub">Nenhum</span>'}</div></div>
    <div style="border-top:1px solid var(--line-2);padding-top:14px;margin-top:16px"><div class="label">CARGAS DESCARREGADAS</div><div class="num" style="margin-top:4px"><b style="font-size:24px">${desc.length}</b></div>
    ${desc.map(c=>`<div class="sub num" style="margin:2px 0 0;font-size:12px">NF ${esc(c.nota)}${c.etapas.chegou?' · '+dur(new Date(c.etapas.descarregado)-new Date(c.etapas.chegou))+' na fábrica':''}</div>`).join('')}</div>
   </aside></div>
  <style>@media (max-width:980px){.hist-grid{grid-template-columns:minmax(0,1fr)!important}}</style>`;
}

// ---------- ajustes ----------
function vAjustes(){
  const c=S.cfg;
  return `${banner()}
  <div class="head"><div><div class="eyebrow">AJUSTES</div><h1>Cadastros e configurações</h1><div class="sub">Valem para todos que usam o painel. Registros antigos não mudam.</div></div></div>
  ${ajAbas('ajustes')}
  <section class="card"><h2>Silos e capacidades</h2>
   ${c.silos.map(s=>`<div class="row" style="grid-template-columns:minmax(0,1fr) 140px"><span><b>${esc(s.nome)}</b> <span class="sub">· ${s.grupo}</span></span><div class="field"><input id="aj-cap-${s.id}" inputmode="decimal" value="${s.cap}" style="height:44px;font-size:17px" aria-label="Capacidade ${esc(s.nome)}"><span class="u">t</span></div></div>`).join('')}</section>
  <section class="card"><h2>Produtos</h2><div class="sub" style="margin-bottom:10px">Para calcular quantos sacos o cimento e o premix rendem.</div>
   <div class="cfg-prod label" style="margin-bottom:6px"><span>NOME</span><span>KG CIMENTO/SACO</span><span>SACOS/PREMIX</span><span></span></div>
   <div id="aj-prods">${c.produtos.map((p,i)=>prodRow(p,i)).join('')}</div>
   <button class="lnk" data-act="aj-add-prod">+ Adicionar produto</button></section>
  <div class="two">
   <section class="card"><h2>Linhas de produção</h2><div class="sub" style="margin-bottom:8px">Uma por linha.</div><textarea class="txt" id="aj-linhas" rows="4">${esc(c.linhas.join('\n'))}</textarea></section>
   <section class="card"><h2>Motivos de parada</h2><div class="sub" style="margin-bottom:8px">Um por linha.</div><textarea class="txt" id="aj-motivos" rows="8">${esc(c.motivos.join('\n'))}</textarea></section>
  </div>
  <section class="card"><h2>Ordens de produção</h2><div class="sub" style="margin-bottom:10px">Linhas e máquinas que aparecem na Programação e no Calendário, o palete padrão de cada linha e quantos sacos cada linha faz por dia (o dia fica vermelho no calendário quando passa disso). Linha sem palete lança a quantidade direto.</div>
   <div class="two" style="gap:16px"><label style="display:flex;flex-direction:column;gap:6px"><span class="label">LINHAS E MÁQUINAS</span><textarea class="txt" id="aj-lord" rows="8">${esc((c.linhasOrdem||[]).join('\n'))}</textarea></label>
   <div style="display:flex;flex-direction:column;gap:14px"><label style="display:flex;flex-direction:column;gap:6px"><span class="label">PALETE POR LINHA (linha = sacos ou fardos)</span><textarea class="txt num" id="aj-pal" rows="3">${esc(Object.keys(c.paletes||{}).map(k=>k+' = '+c.paletes[k]).join('\n'))}</textarea></label>
   <label style="display:flex;flex-direction:column;gap:6px"><span class="label">HORÁRIO DE FUNCIONAMENTO</span><input class="txt num" id="aj-exped" value="${esc(c.expediente||EXPED_PADRAO)}" placeholder="08:00-12:00, 13:15-18:00"><span class="sub" style="margin:0;font-size:12px">Períodos de trabalho separados por vírgula. O intervalo de almoço fica fora da conta do horário estimado.</span></label>
   <div style="display:flex;flex-direction:column;gap:6px"><span class="label">LINHAS QUE NÃO USAM O CIMENTO DOS SILOS</span><div class="chips">${linhasOrd().map(l=>`<button class="chip" data-act="aj-semcim" data-v="${esc(l)}" aria-pressed="${linhasSemCim().includes(l)}">${esc(l)}</button>`).join('')}</div><span class="sub" style="margin:0;font-size:12px">Ficam fora da previsão de quando o cimento acaba.</span></div>
   <label style="display:flex;flex-direction:column;gap:6px"><span class="label">CAPACIDADE POR DIA (linha = sacos)</span><textarea class="txt num" id="aj-capac" rows="3" placeholder="Linha 2 = 8000">${esc(Object.keys(c.capacidade||{}).map(k=>k+' = '+c.capacidade[k]).join('\n'))}</textarea></label><div class="sub" style="margin:0;font-size:12px">O palete de cada produto fica em Produção → Itens.</div></div></div></section>
  <section class="card"><h2>E-mail do almoxarifado</h2><div class="sub" style="margin-bottom:10px">Para onde vão os ranchos do dia (aba Ranchos). Pode colocar mais de um separado por vírgula.</div>
   <input class="txt" id="aj-almox" type="email" autocomplete="off" placeholder="almox@colafix.com" value="${esc(c.emailAlmox||'')}" style="max-width:420px" aria-label="E-mail do almoxarifado"></section>
  <section class="card"><h2>WhatsApp</h2><div class="sub" style="margin-bottom:10px">Número para onde o botão do WhatsApp manda a medição (com DDD). Deixe em branco para escolher a conversa na hora. Grupos não podem ser abertos direto por link, só conversas com um número.</div>
   <div class="field" style="max-width:320px"><input class="txt num" id="aj-zap" inputmode="tel" autocomplete="off" placeholder="ex.: (11) 99999-9999" value="${esc(c.zapNumero||'')}" aria-label="Número do WhatsApp"></div></section>
  <section class="card"><h2>Limites de cor dos silos</h2><div class="sub" style="margin-bottom:10px">Provisórios, até vocês definirem com base na operação.</div>
   <div style="display:flex;gap:16px;flex-wrap:wrap"><label style="display:flex;flex-direction:column;gap:6px"><span class="label">NORMAL A PARTIR DE (%)</span><input class="txt num" id="aj-normal" inputmode="numeric" value="${c.limites.normal}" style="width:140px"></label>
   <label style="display:flex;flex-direction:column;gap:6px"><span class="label">ATENÇÃO A PARTIR DE (%)</span><input class="txt num" id="aj-atencao" inputmode="numeric" value="${c.limites.atencao}" style="width:140px"></label></div></section>
  <div style="display:flex;justify-content:flex-end"><button class="btn big" data-act="aj-salvar">${ic('check',22,2.2)}Salvar ajustes</button></div>`;
}
function prodRow(p,i){ return `<div class="cfg-prod" style="margin-bottom:8px" data-prod="${i}"><input class="txt" id="aj-pn-${i}" value="${esc(p.nome)}" aria-label="Nome do produto"><input class="txt num" id="aj-pk-${i}" inputmode="decimal" value="${p.kgSaco}" aria-label="kg por saco"><input class="txt num" id="aj-ps-${i}" inputmode="numeric" value="${p.sacosPremix}" aria-label="sacos por premix"><button class="lnk" data-act="aj-rm-prod" data-i="${i}" aria-label="Remover" style="color:var(--crit-ink)">✕</button></div>`; }

// ---------- paradas por falta de cimento ----------
function ehCimento(motivo){ return /cimento/i.test(motivo||''); }
function cimentoEm(t){ // último nível conhecido de cada silo de cimento até o instante t
  const vs=validas().filter(m=>m.em<=t); const out=[]; let tot=0, alg=false, maisVelha=null;
  S.cfg.silos.filter(s=>s.grupo==='Cimento').forEach(s=>{ const m=vs.find(m=>m.itens&&m.itens[s.id]!=null);
    if(m){ alg=true; tot+=m.itens[s.id]; out.push(esc(s.nome)+' '+f1(m.itens[s.id])+' t'); if(!maisVelha||m.em<maisVelha) maisVelha=m.em; } else out.push(esc(s.nome)+' —'); });
  return {tot:alg?tot:null, det:out.join(' · '), em:maisVelha};
}
function cargasEm(t){ const cam=[], fab=[]; let ult=null;
  S.cargas.forEach(c=>{ const e=c.etapas||{};
    if(e.caminho&&e.caminho<=t&&!(e.chegou&&e.chegou<=t)&&!(e.descarregado&&e.descarregado<=t)) cam.push(c);
    else if(e.chegou&&e.chegou<=t&&!(e.descarregado&&e.descarregado<=t)) fab.push(c);
    if(e.descarregado&&e.descarregado<=t&&(!ult||e.descarregado>ult.etapas.descarregado)) ult=c; });
  return {cam,fab,ult};
}
function vCimento(){
  const h=ini0(new Date()).getTime(); const dias={'7':7,'30':30,'90':90}[S.cim.per]||30; const desde=h-(dias-1)*864e5;
  const lista=S.paradas.filter(p=>ehCimento(p.motivo)&&new Date(p.inicio).getTime()>=desde).sort((a,b)=>b.inicio.localeCompare(a.inicio));
  let total=0; const porLinha={};
  lista.forEach(p=>{ const ms=(p.fim?new Date(p.fim):new Date())-new Date(p.inicio); total+=ms; porLinha[p.linha]=(porLinha[p.linha]||0)+ms; });
  const nfs=cs=>cs.map(c=>'NF '+esc(c.nota)+(c.qtd!=null?' ('+f1(c.qtd)+' t)':'')).join(', ');
  const itens=lista.map(p=>{ const c=cimentoEm(p.inicio), g=cargasEm(p.inicio); const ms=(p.fim?new Date(p.fim):new Date())-new Date(p.inicio);
    return `<article class="card" style="padding:18px 20px;${p.fim?'':'border:1.5px solid var(--crit)'}">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><div><b style="font-size:17px">${esc(p.linha)}</b> <span class="sub" style="margin:0">· ${esc(p.motivo)}</span></div><span class="pill ${p.fim?'neu':'crit'} num">${p.fim?'':'em andamento · '}${dur(ms)}</span></div>
    <div class="num" style="font-size:13px;color:var(--muted);margin-top:2px">${dia(p.inicio)} ${hora(p.inicio)} → ${p.fim?(dia(p.fim)===dia(p.inicio)?'':dia(p.fim)+' ')+hora(p.fim):'agora'}${p.obs?' · '+esc(p.obs):''}${p.horaManual?'<span class="manual">hora informada</span>':''}</div>
    <div class="label" style="margin:14px 0 6px">NO MOMENTO DA PARADA</div>
    <div class="row num" style="grid-template-columns:150px minmax(0,1fr)"><span style="color:var(--muted)">Cimento nos silos</span><span>${c.tot!=null?`<b>${f1(c.tot)} t</b> <small style="color:var(--muted)">${c.det} · medido ${dia(c.em).toLowerCase()} ${hora(c.em)}</small>`:'<span class="pill dash">sem medição antes da parada</span>'}</span></div>
    <div class="row num" style="grid-template-columns:150px minmax(0,1fr)"><span style="color:var(--muted)">Cargas</span><span>${g.cam.length?'A caminho: <b>'+nfs(g.cam)+'</b>':'Nenhuma a caminho'}${g.fab.length?' · Na fábrica: <b>'+nfs(g.fab)+'</b>':''}</span></div>
    <div class="row num" style="grid-template-columns:150px minmax(0,1fr)"><span style="color:var(--muted)">Última descarregada</span><span>${g.ult?'NF '+esc(g.ult.nota)+' · '+dia(g.ult.etapas.descarregado).toLowerCase()+' '+hora(g.ult.etapas.descarregado):'—'}</span></div>
    </article>`; }).join('');
  const per=[['7','7 dias'],['30','30 dias'],['90','90 dias']].map(([k,l])=>`<button class="btn sec" data-cimper="${k}" style="height:38px;${S.cim.per===k?'border-color:var(--teal);color:var(--teal)':''}" aria-pressed="${S.cim.per===k}">${l}</button>`).join('');
  return `${banner()}
  <div class="head"><div><div class="eyebrow">SILOS</div><h1>Paradas por falta de cimento</h1><div class="sub">Paradas registradas na Produção com motivo de cimento, e como estavam os silos e as cargas naquela hora.</div></div><div style="display:flex;gap:8px">${per}</div></div>
  <section class="card"><div style="display:flex;gap:32px;flex-wrap:wrap;align-items:baseline">
    <div><div class="label">TEMPO PARADO</div><div class="num" style="font-size:28px;font-weight:700">${dur(total)}</div></div>
    <div><div class="label">PARADAS</div><div class="num" style="font-size:28px;font-weight:700">${lista.length}</div></div>
    ${Object.keys(porLinha).map(l=>`<div><div class="label">${esc(l).toUpperCase()}</div><div class="num" style="font-size:20px;font-weight:700">${dur(porLinha[l])}</div></div>`).join('')}
  </div></section>
  ${lista.length?itens:`<section class="card"><div class="sub" style="margin:0">Nenhuma parada por falta de cimento nos últimos ${dias} dias.</div></section>`}`;
}

// ---------------- render ----------------
function render(){
  { const gt=acsGate(); if(gt){ acsNavVazia(); $('#view').innerHTML=gt; try{ tpAtualiza(); }catch(e){} return; } }
  if(S.view==='ranchos'&&rchGav()){ S.view='programacao'; S.rchGav=true; }
  if(S.view!=='modulos'&&!viewOk(S.view)){ S.view=primeiraView(); const mm=modDe(S.view); if(mm) S.mod=mm; }
  S._div=divergencias();
  renderNav();
  const v=S.view, el=$('#view');
  el.innerHTML = abas() + (S.extViews&&S.extViews[v]?S.extViews[v]():v==='tvsplit'?vSplit():v==='gestao'?vGestao():v==='silosver'?vSilosVer():v==='modulos'?vModulos():v==='cimento'?vCimento():v==='geral'?vGeral():v==='medicao'?vMedicao():v==='silos'?vSilos():v==='cargas'?vCargas():v==='paradas'?vParadas():v==='programacao'?vProgramacao():v==='aprogramar'?vAProgramar():v==='meudia'?vMeuDia()+anlResDiaModal():v==='indicadores'?anlInjeta(vIndicadores(),adeCard()+anlEficiencia()):v==='tvfab'?vTvFab():v==='calendario'?vCalendario():v==='ranchos'?vRanchos():v==='diario'?vDiario():v==='itens'?vItens():v==='historico'?vHistorico():String(v).startsWith('anl')?anlView(v):String(v).startsWith('alx')?alxView(v):String(v).startsWith('man')?manView(v):String(v).startsWith('pmx')?pmxView(v):v==='linhatv'?vLinhaTv():v==='tvapres'?vApres():v==='painel'?vPainel():v==='paineis'?vPaineis():v==='acessos'?vAcessos():anlInjeta(vAjustes(),anlBackupCard()+corAjustes())) + repModal();
  document.body.classList.toggle('dbmon',S.view==='diario'&&S.dbo&&S.dbo.modo==='monitor');
  if(v==='medicao') medAtualizaResumo();
  { const bx=S.rep&&S.rep.aberto&&document.querySelector('.rep.dbmbox'); if(bx&&S.rep.st) bx.scrollTop=S.rep.st; }
  try{ tpAtualiza(); }catch(e){ console.warn('topo',e); }
}
function rerenderSeguro(){ if(S.cal&&S.cal.drag) return; if(S.view==='medicao'||S.view==='ajustes') return; const a=document.activeElement; if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable)&&a.closest('#view')) return; render(); }

// ================= ORDENS DE PRODUÇÃO =================
const ORD_LINHAS_PADRAO=['Linha 1','Linha 2','Linha 3','Área líquida','Rejunte M1','Rejunte M2','Rejunte M3','Fixcol'];
const TURNOS=['Dia todo','Manhã','Tarde'];
const FECH={total:{n:'Entregue total',c:'ok'},sobra:{n:'Com sobra',c:'warn'},falta:{n:'Com falta',c:'crit'},sem:{n:'Sem apontamento',c:'neu'}};
function hojeStr(d){ d=d||new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
/* próximo dia útil: pula domingo, sábado (se a fábrica não trabalha) e feriados (os mesmos da Curva S) */
function amanhaStr(){ let d=addDias(hojeStr(),1); for(let i=0;i<20;i++){ const w=new Date(d+'T12:00:00').getDay(); let sab=false, fer=[]; try{ sab=!!anlCfg().sab; }catch(e){} try{ fer=feriados()||[]; }catch(e){} if(w!==0&&(w!==6||sab)&&!fer.includes(d)) break; d=addDias(d,1); } return d; }
function amanhaLab(){ const a=amanhaStr(); return a===addDias(hojeStr(),1)?'Amanhã':['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][new Date(a+'T12:00:00').getDay()]; }
function dm(s){ if(!s) return '—'; const p=String(s).split('-'); return p.length===3?p[2]+'/'+p[1]:esc(s); }
function dmTxt(s){ if(!s) return '—'; if(s===hojeStr()) return 'Hoje'; if(s===amanhaStr()) return amanhaLab(); return dm(s); }
function fq(n){ return (Math.round((n||0)*100)/100).toLocaleString('pt-BR',{maximumFractionDigits:2}); }
function linhasOrd(){ return (S.cfg.linhasOrdem&&S.cfg.linhasOrdem.length)?S.cfg.linhasOrdem:ORD_LINHAS_PADRAO; }
function codigoDe(o){ const p=String(o.produto||'').trim().toUpperCase(); const m=p.match(/^([A-Z]{1,4}\d{3,5})\b/); return m?m[1]:p.split(' - ')[0].trim(); }
function nomeCurto(o){ const p=String(o.produto||'').trim(); const m=p.match(/^[A-Za-z]{1,4}\d{3,5}\s*[-–—]*\s*(.*)$/); return m&&m[1]?m[1]:p; }
function fardoDe(o){ if(unidDe(o)==='FD') return 0; const it=itemDe(codigoDe(o)); return it&&it.fardo>0?+it.fardo:0; }
function unPorFardo(o){ const it=itemDe(codigoDe(o)); return it&&it.fardo>0?+it.fardo:0; }
function paleteDe(o){ const pp=S.cfg.paleteProd||{}, pl=S.cfg.paletes||{}; const c=codigoDe(o); const it=itemDe(c); if(it&&it.palete>0) return +it.palete;
  if(pp[c]!=null) return +pp[c]||0; if(pl[o.linha]!=null) return +pl[o.linha]||0; return 0; }
function anuladas(){ const s=new Set(); S.entregas.forEach(e=>{ if(e.anula) s.add(e.anula); }); return s; }
function entregasDe(id){ const an=anuladas(); return S.entregas.filter(e=>e.ordem===id&&!e.anula).map(e=>Object.assign({anulada:an.has(e._id)},e)).sort((a,b)=>a.em.localeCompare(b.em)); }
/* apontamento antecipado vale a partir de quando foi registrado (já foi lançado no sistema nessa hora), não do horário previsto */
function entregueAte(o,iso){ let s=0; (o.ant||[]).forEach(a=>s+=+a.qtd||0); entregasDe(o._id).forEach(e=>{ const t=e.antecipado&&e.registradoEm?e.registradoEm:e.em; if(!e.anulada&&(!iso||!t||t<=iso)) s+=+e.qtd||0; }); return s; }
function entregueDe(o){ let s=0; (o.ant||[]).forEach(a=>s+=+a.qtd||0); entregasDe(o._id).forEach(e=>{ if(!e.anulada) s+=+e.qtd||0; }); return s; }
function dataEf(o){ return (o.continuaEm&&o.continuaEm>(o.data||''))?o.continuaEm:(o.data||''); }
/* atrasada = data já passou E não é uma ordem de vários dias que ainda está dentro do prazo (até hoje ou depois) */
function ordAtras(o,h){ h=h||hojeStr(); const d=dataEf(o); return !!d&&d<h&&!(o.ate&&o.ate>=h); }
function stInfo(o,ent){
  if(o.status==='cancelada') return {t:'Cancelada',c:'dash'};
  if(o.status==='encerrada'){ const f=FECH[o.fechamento]||FECH.total; return {t:f.n,c:f.c}; }
  if(o.status==='ignorada') return {t:'Ignorada',c:'dash'};
  if(o.continuaEm&&o.continuaEm>(o.data||'')&&o.continuaEm>hojeStr()) return {t:'Continua '+dm(o.continuaEm),c:'warn'};
  if(ent>0) return {t:'Em produção',c:'prod'};
  return {t:'Liberada',c:'neu'};
}
function ultimaEnt(o){ const es=entregasDe(o._id).filter(e=>!e.anulada&&e.em); return es.length?es[es.length-1].em:null; }
function precisaEns(prodOuOrdem){ const p=typeof prodOuOrdem==='string'?prodOuOrdem:String((prodOuOrdem&&prodOuOrdem.produto)||''); return /REJUNTE\s+(FLEX[IÍ]VEL|SILICONIZADO)/i.test(p)||/^\s*R[FS]\d{3,5}\b/i.test(p); }
function faltaEns(o){ return !!o&&!o._pv&&o.status==='aberta'&&!o.ensaca&&precisaEns(o); }
function pendDe(o){ const h=hojeStr(), am=amanhaStr(), on=addDias(h,-1), r=[];
  if(o._pv){ if(o.data<h) r.push('programação sem nº vencida'); else if(o.data<=am) r.push('sem número'); return r; }
  if(o.status!=='aberta') return r; const d=dataEf(o);
  if(!o.rancho&&d<=am) r.push('sem rancho');
  if(faltaEns(o)) r.push('sem ensacado');
  if(d<h){ const u=ultimaEnt(o); if(!u||u.slice(0,10)<on) r.push(u?'sem apontamento desde '+dm(u.slice(0,10)):ordAtras(o,h)?'atrasada sem apontamento':'sem apontamento'); }
  return r; }
function horaMin(t){ const m=String(t||'').match(/^(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; }
function minHora(m){ m=Math.round(m); const d=Math.floor(m/1440); m-=d*1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')+(d?' (+'+d+'d)':''); }
/* estima início/fim de cada item de um grupo (dia+linha), na ordem de prioridade */
const EXPED_PADRAO='08:00-12:00, 13:15-18:00';
function expediente(){ const txt=S.cfg.expediente||EXPED_PADRAO; const ps=[]; String(txt).split(/[,;\n]+/).forEach(x=>{ const m=x.match(/(\d{1,2}:\d{2})\s*(?:-|–|a|às|as|até)\s*(\d{1,2}:\d{2})/i); if(m){ const i=horaMin(m[1]), f=horaMin(m[2]); if(i!=null&&f!=null&&f>i) ps.push([i,f]); } }); ps.sort((x,y)=>x[0]-y[0]); return ps.length?ps:[[480,720],[795,1080]]; }
/* avança "min" minutos produtivos a partir de t dentro dos períodos de trabalho; devolve {t,passa} */
function avancar(t,min,ps){ let dia=0; for(let g=0;g<400;g++){ for(const [i,f] of ps){ const ini=i+dia*1440, fim=f+dia*1440; if(t<ini) t=ini; if(t>=fim) continue; const cabe=fim-t; if(min<=cabe) return {t:t+min,passa:dia>0}; min-=cabe; t=fim; } dia++; } return {t,passa:true}; }
function estimarGrupo(itens,dia,linha){ const cap=capDe(linha); if(!cap) return {}; const ps=expediente(); const tot=ps.reduce((a,[i,f])=>a+f-i,0); if(!tot) return {}; const porMin=cap/tot;
  const h=hojeStr(); let t=ps[0][0]; if(dia===h){ const n=new Date(); t=Math.max(t,n.getHours()*60+n.getMinutes()); } else if(dia<h) return {};
  const out={}; let passou=false; itens.forEach(o=>{ const q=o._pv?(+o.qtd||0):Math.max(0,o.total-entregueDe(o)); if(!(q>0)) return; const st=avancar(t,0,ps); const a=st.t; const r=avancar(a,q/porMin,ps); t=r.t; passou=passou||st.passa||r.passa; out[seqId(o)]={ini:a,fim:t,passa:passou,dia}; }); return out; }
function difDias(a,b){ return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5); }
function estimarLinha(linha){ const cap=capDe(linha); if(!cap) return {}; const ps=expediente(); const tot=ps.reduce((a,[i,f])=>a+f-i,0); if(!tot) return {}; const porMin=cap/tot;
  const h=hojeStr(), kd=x=>{ const d=dataEf(x); return d<h?h:d; };
  const todos=ordAbertas().concat(prevAtivas()).filter(x=>x.linha===linha); const dias=[...new Set(todos.map(kd))].sort();
  const out={}; let carry=-Infinity; S._sobra=S._sobra||{};
  dias.forEach(d=>{ const k=difDias(h,d); if(k>400) return; let ini0=k*1440+ps[0][0]; if(k===0){ const n=new Date(); ini0=Math.max(ini0,n.getHours()*60+n.getMinutes()); }
    const sobra=carry>ini0?carry:0; S._sobra[d+'|'+linha]=sobra?sobra-k*1440:0; let t=Math.max(carry,ini0);
    todos.filter(x=>kd(x)===d).sort(seqCmp).forEach(o=>{ const q=o._pv?(+o.qtd||0):Math.max(0,o.total-entregueDe(o)); if(!(q>0)) return; const a=avancar(t,0,ps).t; const r=avancar(a,q/porMin,ps); t=r.t; out[seqId(o)]={ini:a-k*1440,fim:t-k*1440,passa:t>(k+1)*1440,dia:d}; });
    carry=t; });
  return out; }
function seqCmp(a,b){ const x=a.seq!=null?+a.seq:1e9, y=b.seq!=null?+b.seq:1e9; return x-y||String(a.num).localeCompare(String(b.num)); }
function ordAbertas(){ return S.ordens.filter(o=>o.status==='aberta'&&o.linha); }
function aProgramar(){ return S.ordens.filter(o=>o.status==='aberta'&&!o.linha).sort((a,b)=>(a.dtFim||'').localeCompare(b.dtFim||'')||String(a.num).localeCompare(String(b.num))); }
function ordemRodando(linha){ const h=hojeStr(); const xs=ordAbertas().filter(o=>o.linha===linha&&dataEf(o)<=h);
  if(!xs.length) return null; const ult=o=>{ const es=entregasDe(o._id); return es.length?es[es.length-1].em:''; };
  return xs.sort((a,b)=>ult(b).localeCompare(ult(a))||dataEf(a).localeCompare(dataEf(b)))[0]; }
function sugerirFech(o){ const e=entregueDe(o); if(e<=0) return 'sem'; if(Math.abs(e-o.total)<0.5) return 'total'; return e>o.total?'sobra':'falta'; }
function obsDe(o){ return (o.obsList||[]).filter(x=>!x.removida); }
function histAdd(o,txt){ return (o.hist||[]).concat([{em:new Date().toISOString(),por:S.uid,o:txt}]).slice(-60); }

// ---------- tela: Programação ----------
function buscaNorm(x){ return String(x==null?'':x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function buscaCasa(txt){ const toks=buscaNorm(txt).split(/\s+/).filter(Boolean); return o=>{ if(!toks.length) return true; const hay=buscaNorm([o.num,o.produto,o.ensaca,o.linha,o.obs,...(o.obsList||[]).filter(x=>!x.removida).map(x=>x.t),o._pv?'programacao previsao':''].filter(Boolean).join(' ')); return toks.every(t=>hay.includes(t)); }; }
function vProgramacao(){
  const O=S.ord, h=hojeStr(), L=linhasOrd();
  const abertas=ordAbertas();
  const cont={}; abertas.forEach(o=>cont[o.linha]=(cont[o.linha]||0)+1);
  const paraHoje=abertas.filter(o=>dataEf(o)<=h).length;
  const emProd=abertas.filter(o=>entregueDe(o)>0).length;
  const pend=abertas.reduce((a,o)=>a+Math.max(0,o.total-entregueDe(o)),0);
  const fila=aProgramar().length;
  let xs=S.ordens.filter(o=>o.linha&&o.status!=='ignorada');
  if(O.linha!=='todas') xs=xs.filter(o=>o.linha===O.linha);
  const temData=!!(O.de||O.ate);
  if(O.mostrar==='abertas'||O.mostrar==='pend') xs=xs.filter(o=>o.status==='aberta');
  else if(O.mostrar==='encerradas'&&temData) xs=xs.filter(o=>o.status!=='aberta');
  else if(O.mostrar==='encerradas'){ const lim=new Date(); lim.setDate(lim.getDate()-45); const ls=hojeStr(lim); xs=xs.filter(o=>o.status!=='aberta'&&(o.fimEm?o.fimEm.slice(0,10):dataEf(o))>=ls); }
  const q=O.busca.trim().toLowerCase(); const casa=buscaCasa(O.busca);
  if(q) xs=xs.filter(casa);
  if(temData){ const de=O.de||'0000-00-00', ate=O.ate||'9999-99-99'; xs=xs.filter(o=>{ const ef=dataEf(o); if(o.status==='aberta'){ const d=ef&&ef<h?h:ef; return !!d&&d>=de&&d<=ate; } const ini=[o.data||ef,ef].filter(Boolean).sort()[0]||'', fim=[ef,o.fimEm?o.fimEm.slice(0,10):''].filter(Boolean).sort().pop()||ini; return ini&&ini<=ate&&fim>=de; }); }
  xs.sort(O.mostrar==='encerradas'&&!q&&!temData?(a,b)=>dataEf(b).localeCompare(dataEf(a)):(a,b)=>dataEf(a).localeCompare(dataEf(b))||String(a.linha).localeCompare(String(b.linha))||String(a.num).localeCompare(String(b.num)));
  if(O.mostrar!=='encerradas'){ let ps=prevAtivas(); if(O.linha!=='todas') ps=ps.filter(p=>p.linha===O.linha); if(q) ps=ps.filter(casa); if(temData){ const de=O.de||'0000-00-00', ate=O.ate||'9999-99-99'; ps=ps.filter(p=>{ const d=p.data<h?h:p.data; return d>=de&&d<=ate; }); } xs=xs.concat(ps); }
  if(O.mostrar==='pend') xs=xs.filter(o=>pendDe(o).length);
  const nConc=xs.filter(o=>!o._pv).length, nPlan=xs.length-nConc; if(O.tipo==='conc') xs=xs.filter(o=>!o._pv); else if(O.tipo==='plan') xs=xs.filter(o=>o._pv);
  const nPend=ordAbertas().concat(prevAtivas()).filter(o=>pendDe(o).length).length;
  const agrupar=!(O.mostrar==='encerradas'&&!q&&!temData);
  if(agrupar){ const kd=o=>{ const d=dataEf(o); return (o._pv||o.status==='aberta')&&d<h?h:d; }; xs.sort((a,b)=>kd(a).localeCompare(kd(b))||L.indexOf(a.linha)-L.indexOf(b.linha)||seqCmp(a,b)); }
  const kdG=o=>{ const d=dataEf(o); return (o._pv||o.status==='aberta')&&d<h?h:d; };
  const grp={}; if(agrupar) xs.forEach(o=>{ const k=kdG(o)+'|'+o.linha; (grp[k]=grp[k]||[]).push(o); });
  S._agr=agrupar; S._est={}; S._sobra={}; [...new Set(Object.keys(grp).map(k=>k.split('|')[1]))].forEach(l=>Object.assign(S._est,estimarLinha(l)));
  const foraN=q?Math.max(0,S.ordens.filter(o=>o.status!=='ignorada'&&casa(o)).length+prevAtivas().filter(casa).length-xs.length):0;
  const lim=O.mostrar==='todas'||q?300:400; const cortou=xs.length>lim; xs=xs.slice(0,lim);
  const mostrarLinha=O.linha==='todas'||!!q;
  const hj=hojeStr(), am=amanhaStr(), sg=segundaStr(new Date()), sx=addDias(sg,5);
  const per=O.perOutro?'outro':!temData?'tudo':(O.de===hj&&O.ate===hj)?'hoje':(O.de===am&&O.ate===am)?'amanha':(O.de===hj&&O.ate===am)?'hojeam':(O.de===sg&&O.ate===sx)?'semana':'outro';
  const perOpts=[['tudo','Todas as datas'],['hoje','Hoje',dm(hj)],['amanha',amanhaLab(),dm(am)],['hojeam','Hoje + '+amanhaLab().toLowerCase()],['semana','Esta semana'],['outro','Escolher datas']];
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Programação</h1><div class="sub">Ordens por linha. Lance as entregas na ordem e o pendente se calcula sozinho.</div></div>
   <div class="pg-acts" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sec" data-act="md-apt-abrir">${ic('check',18,2)}Lançar apontamento</button><button class="btn sec" data-act="fp-abrir">${ic('folha',18,2)}Folhas do dia</button><button class="btn sec" data-act="pv-nova">${ic('mais',18,2.2)}Nova previsão</button><button class="btn" data-act="o-nova-abrir">${ic('mais',20,2.2)}Nova ordem</button></div></div>
  ${S.apt.aberto?aptPainel():''}
  ${S.fp.aberto?fpPainel():''}
  ${S.imp.aberto?impPainel():''}
  ${O.nova?novaPainel():''}
  ${S.pv.f?prevForm():''}
  <div class="rsm num"><span>Abertas <b>${abertas.length}</b></span><span title="Programadas até hoje">Para hoje <b>${paraHoje}</b></span><span title="Sacos/unidades pendentes nas ordens abertas">Pendente <b>${f0(pend)}</b></span><span class="${fila?'warn':''}">Sem linha ${fila?`<button class="lnk" data-go="aprogramar">${fila} ›</button>`:'<b>0</b>'}</span></div>
  ${divPainel()}
  ${(fila||(O.filaAb=false))?`<details class="card pfila" ${O.filaAb?'open':''}><summary><b>Ordens sem linha (${fila})</b> <span class="sub" style="margin:0;display:inline">vieram da importação e ainda não foram programadas</span></summary>${filaImport(true)}</details>`:''}
  <section class="card ofil pfil">
   <div class="pf-r1">
    <label class="srch"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input class="txt" id="o-busca" type="search" placeholder="Buscar nº da ordem, produto ou observação" value="${esc(O.busca)}" aria-label="Buscar ordem ou produto"></label>
    <div class="seg" role="group" aria-label="Mostrar">${[['abertas','Abertas'],['pend','Pendências'+(nPend?' <small class="num">'+nPend+'</small>':'')],['encerradas','Encerradas'],['todas','Todas']].map(([k,l])=>`<button data-act="o-mostrar" data-v="${k}" aria-pressed="${O.mostrar===k}" ${k==='encerradas'?'title="Encerradas nos últimos 45 dias"':''}>${l}</button>`).join('')}</div>
   </div>
   <div class="pf-lin" role="group" aria-label="Linha">${['todas',...L].map(l=>{ const on=O.linha===l, n=l==='todas'?abertas.length:(cont[l]||0); return `<span class="pf-l ${on?'on':''}"><button data-act="o-linha" data-v="${esc(l)}" aria-pressed="${on}">${l==='todas'?'Todas as linhas':esc(l)}<small class="num">${n}</small></button>${l!=='todas'?`<button class="pf-add" data-act="o-nova-linha" data-v="${esc(l)}" title="Nova ordem ou programação na ${esc(l)}" aria-label="Nova ordem na ${esc(l)}">+</button>`:''}</span>`; }).join('')}</div>
   <div class="pf-r3">
    <span class="pf-lab">Período</span>
    <div class="seg" role="group" aria-label="Período">${perOpts.map(([k,l,sm])=>`<button data-act="o-per" data-v="${k}" aria-pressed="${per===k}">${l}${sm?`<small class="num">${sm}</small>`:''}</button>`).join('')}</div>
    <span style="display:inline-flex;gap:10px;align-items:center;margin-left:6px"><span class="pf-lab">Tipo</span>
    <div class="seg" role="group" aria-label="Tipo">${[['todas','Todas',nConc+nPlan,''],['conc','Concretas',nConc,'Ordens com número'],['plan','Planejadas',nPlan,'Previsões sem número de ordem']].map(([k,l,n,t])=>`<button data-act="o-tipo" data-v="${k}" aria-pressed="${(O.tipo||'todas')===k}" ${t?`title="${t}"`:''}>${k==='plan'?'<i class="pf-dot pv"></i>':k==='conc'?'<i class="pf-dot"></i>':''}${l}<small class="num">${n}</small></button>`).join('')}</div></span>
    ${per==='outro'?`<div class="drng on"><input class="txt" id="o-de" type="date" value="${esc(O.de)}" max="${esc(O.ate||'')}" aria-label="Data inicial"><span>até</span><input class="txt" id="o-ate" type="date" value="${esc(O.ate)}" min="${esc(O.de||'')}" aria-label="Data final"></div>`:''}
    <span class="pf-res num">${(()=>{ const _os=xs.filter(o=>!o._pv&&o.num); const _ne=_os.filter(o=>o.ensaca).length; S._nums=[...new Set(_os.flatMap(o=>[String(o.num).trim()].concat(o.ensaca?[String(o.ensaca).trim()]:[])))]; S._numsN=_os.length; S._numsE=_ne; return S._nums.length?`<button class="lnk" data-act="o-copiar-nums" style="display:inline-flex;align-items:center;gap:4px" title="Copia os números das ordens da lista e das ordens de ensacado, separados por vírgula e sem espaço">${ic('copiar',13,2.2)} copiar ${_os.length} nº${_os.length===1?'':'s'}${_ne?' + '+_ne+' ensacado'+(_ne===1?'':'s'):''}</button> · `:''; })()}${xs.length} ${xs.length===1?'item':'itens'}${(O.linha!=='todas'||temData||O.mostrar!=='abertas'||q||(O.tipo&&O.tipo!=='todas'))?` · <button class="lnk" data-act="o-limpar-filtros">limpar filtros</button>`:''}</span>
   </div>
  </section>
  <section class="card ord-card" style="padding:6px 18px 10px">
   <div class="orow ohead" aria-hidden="true"><span>Data</span><span>Ordem</span><span>Produto</span><span class="nr">Total</span><span class="nr">Entregue</span><span class="nr">Pendente</span><span>Situação</span><span></span></div>
   ${xs.length?(()=>{ let last=''; return xs.map(o=>{ let hd=''; if(agrupar){ const k=kdG(o)+'|'+o.linha; if(k!==last){ last=k; hd=grpHead(k,grp[k]); } } return hd+(o._pv?prevOrdRow(o,mostrarLinha):ordRow(o,mostrarLinha)); }).join(''); })():`<div class="empty">${q||temData?'Nenhuma ordem encontrada'+(temData?' no período':'')+'.':O.mostrar==='abertas'?'Nenhuma ordem aberta nesta linha. Programe uma em “A programar” ou crie uma nova ordem.':'Nada para mostrar.'}</div>`}
   ${foraN?`<div class="empty" style="padding:12px">${foraN} ${foraN===1?'outro resultado':'outros resultados'} para “${esc(O.busca.trim())}” fora dos filtros selecionados. <button class="lnk" data-act="o-busca-todos">Buscar em tudo</button></div>`:''}
   ${cortou?`<div class="empty" style="padding:12px">Mostrando as primeiras ${lim}. Use a busca para achar uma ordem específica.</div>`:''}
  </section>`;
}
function grpHead(k,its){ const [d,l]=k.split('|'); const cap=capDe(l); const ab=its.filter(o=>o._pv||o.status==='aberta');
  const pend=ab.reduce((a,o)=>a+(o._pv?(+o.qtd||0):Math.max(0,o.total-entregueDe(o))),0); const over=cap&&pend>cap; const pct=cap?Math.min(100,pend/cap*100):0;
  const h=hojeStr(), sob=(S._sobra||{})[d+'|'+l]||0; const pend0=d===h?ab.filter(o=>!o._pv&&o.total-entregueDe(o)>0):[];
  return `<div class="ogrp ${over?'over':''}"><b>${esc(dmTxt(d))}</b><span class="dot">·</span><b>${esc(l)}</b><span class="dot">·</span><span>${ab.length} ${ab.length===1?'item':'itens'}</span>${(()=>{ const cr=ab.filter(o=>!o._pv&&o.rancho); if(!cr.length) return ''; const ent=cr.filter(o=>{ const r=o.rdb||{}; return r.ent||r.conf; }).length; return `<span class="dot">·</span><span class="ogrch ${ent===cr.length?'ok':''}" title="Ordens com rancho já entregue na linha">${ent===cr.length?'✓ ':''}ranchos entregues ${ent}/${cr.length}</span>`; })()}${sob?`<span class="dot">·</span><span class="ogsob" title="O que sobrou do dia anterior ocupa a linha até esse horário">começa ${sob>=1440?'depois de amanhã':'às '+minHora(sob)} <small>(sobra do dia anterior)</small></span>`:''}${pend0.length?`<button class="lnk ogpass" data-act="o-passar" data-v="${esc(l)}" title="Passa as ordens abertas de hoje desta linha para o próximo dia útil, na frente das que já estão lá">Passar ${pend0.length} p/ ${amanhaLab().toLowerCase()} ›</button>`:''}
   <span class="ogcap num">${cap?`<span class="ogbar"><i style="width:${pct}%"></i></span><b>${f0(pend)}</b> / ${f0(cap)} <small>sc/dia</small>${over?' <span class="pill crit" style="font-size:11px;padding:1px 8px">acima da capacidade</span>':''}`:`<b>${f0(pend)}</b> <small>pendente</small> <button class="lnk" data-go="ajustes" style="padding:0;font-size:12px">definir capacidade</button>`}</span>${corGrp(d,l)}</div>`; }
function diaSeq(o){ const d=dataEf(o), h=hojeStr(); return d<h?h:d; }
function rowDrag(o){ if(!(o._pv||o.status==='aberta')||!o.linha) return ''; return `draggable="true" data-orow="${esc(seqId(o))}" data-ol="${esc(o.linha)}" data-od="${esc(diaSeq(o))}"`; }
function estTxt(o){ const e=(S._est||{})[seqId(o)]; if(!e) return ''; const hj=e.dia===hojeStr(); const tag=d=>d<=0?'hoje':(d===1&&hj?'amanhã':dm(addDias(e.dia,d))); const di=Math.floor(e.ini/1440), df=Math.floor(e.fim/1440); const ps=expediente(), fimDia=ps[ps.length-1][1], iniDia=ps[0][0];
  const tt='Estimativa pela capacidade da linha e horário de funcionamento'+(e.passa?' — não termina no mesmo dia: para no fim do expediente e continua no dia seguinte':'');
  if(di===df) return `<small class="est ${e.passa?'passa':''}" title="${tt}"><span class="estr">${minHora(e.ini%1440)} → ${minHora(e.fim%1440)}</span>${di?`<i>${tag(di)}</i>`:''}</small>`;
  return `<small class="est passa" title="${tt}"><span class="estr">${minHora(e.ini%1440)} → ${minHora(fimDia)}</span><i>${di?tag(di)+' · ':''}continua ${df-di>1?'até '+tag(df)+' '+minHora(e.fim%1440):tag(df)+' '+minHora(iniDia)+' → '+minHora(e.fim%1440)}</i></small>`; }
function pendTags(o){ return S.ord.mostrar==='pend'?pendDe(o).map(t=>`<small class="ptag">${esc(t)}</small>`).join(''):''; }
function seqBtns(o){ if(!(o._pv||o.status==='aberta')) return ''; const sib=irmasCal(o); if(sib.length<2) return ''; const i=sib.findIndex(x=>x===o||(x._id===o._id&&!!x._pv===!!o._pv)); const id=esc(seqId(o));
  return `<span class="oseq" title="Prioridade no dia: ${i+1}º de ${sib.length}"><button data-act="o-seq" data-id="${id}" data-v="-1" ${i===0?'disabled':''} aria-label="Subir prioridade">▲</button><input class="oseqn num" type="text" inputmode="numeric" value="${i+1}" data-seqn="${id}" data-max="${sib.length}" aria-label="Posição na fila (1 = primeiro)" title="Digite a posição: 1 = vai primeiro"><button data-act="o-seq" data-id="${id}" data-v="1" ${i===sib.length-1?'disabled':''} aria-label="Descer prioridade">▼</button></span>`; }
function prevOrdRow(p,mostrarLinha){ const h=hojeStr(), atr=p.data<h;
  return `<div class="orow prev" data-act="o-prev-ir" data-id="${esc(p._id)}" role="button" tabindex="0" ${rowDrag(p)}>
   <span class="od num">${seqBtns(p)}${S._agr&&p.data===diaSeq(p)?'':`<b>${dmTxt(p.data)}</b>`}${estTxt(p)}${p.turno&&p.turno!=='Dia todo'?`<small>${esc(p.turno)}</small>`:''}</span>
   <span class="on num"><span class="pill dash" style="font-size:11px;padding:1px 7px">sem nº</span></span>
   <span class="op"><b>${p.codigo?`<span class="ocod num" data-act="o-copiar" data-v="${esc(p.codigo)}" data-k="cod" title="Copiar o código ${esc(p.codigo)}" role="button" tabindex="0">${esc(p.codigo)}</span>`:''}${esc(nomeCurto({produto:p.produto})||p.produto)}</b><small class="num">programação a confirmar${p.obs?' · '+esc(p.obs):''}${mostrarLinha?' · '+esc(p.linha):''}</small></span>
   <span class="nr num" data-l="Total">${f0(p.qtd||0)}</span>
   <span class="nr num" data-l="Entregue"><span style="color:var(--faint)">—</span></span>
   <span class="nr num" data-l="Pendente">${fq(p.qtd||0)}</span>
   <span class="os"><span class="pill plan">Programação</span>${atr?'<small style="color:var(--crit-ink)">dia já passou</small>':''}${pendTags(p)}</span>
   <span class="ofp pvbts"><button class="fpbtn" data-act="pv-conf" data-id="${esc(p._id)}" title="Informar o número da ordem">${ic('check',14,2.4)}<span>Confirmar nº</span></button><button class="fpbtn" data-act="pv-editar" data-id="${esc(p._id)}" title="Editar a previsão"><span>Editar</span></button><button class="fpbtn" data-act="pv-copiar" data-id="${esc(p._id)}" title="Copiar esta previsão para outro dia ou linha">${ic('copiar',14,2)}<span>Copiar</span></button><button class="fpbtn pvdel" data-act="pv-excluir" data-id="${esc(p._id)}" title="Excluir a previsão"><span>Excluir</span></button></span>
  </div>${pvInline(p)}`; }
function pvInline(p){ const c=S.pv.conf[p._id], cands=prevCandidatas(p); const id=esc(p._id);
  if(c==null) return cands.length?`<div class="pvinl"><span class="pvcand" title="Existe ordem aberta no painel com o mesmo código desta previsão. Se for a ordem desta previsão, clique no número para confirmar a previsão com ele.">${ic('check',13,2.4)} Ordem com o mesmo produto já existe — é esta? Clique para confirmar: ${cands.map(o=>`<button class="lnk" data-act="pv-usar" data-id="${id}" data-v="${esc(o.num)}">Ordem ${esc(o.num)}${o.linha?' (já na '+esc(o.linha)+')':''} · ${f0(o.total)}</button>`).join(' · ')}</span></div>`:'';
  return `<div class="pvinl"><b>Confirmar a previsão:</b><input class="txt num" data-pv-num="${id}" value="${esc(c)}" placeholder="Nº da ordem" inputmode="numeric" style="width:140px;height:38px">${precisaEns(p.produto)?`<input class="txt num" data-pv-ens="${id}" placeholder="Nº do ensacado" title="Obrigatório para rejunte flexível/siliconizado" inputmode="numeric" style="width:150px;height:38px;border-color:var(--warn)">`:''}<button class="btn" data-act="pv-confirmar" data-id="${id}" style="height:38px;padding:0 14px">Confirmar</button><button class="lnk" data-act="pv-conf-x" data-id="${id}" style="color:var(--muted)">Voltar</button>${cands.length?`<span class="pvcand">Chegou do sistema: ${cands.map(o=>`<button class="lnk" data-act="pv-usar" data-id="${id}" data-v="${esc(o.num)}">${esc(o.num)}</button>`).join(' · ')}</span>`:''}</div>`; }
function rchChip(o){ const e=dbEt(o), n=esc(o.rancho), q=v=>v&&v.em?' às '+hora(v.em)+(dm(hojeStr(new Date(v.em)))!==dm(hojeStr())?' de '+dm(hojeStr(new Date(v.em))):'')+(v.por?' por '+nomeDe(v.por):''):'';
  let c,t,tt;
  if(e.conf&&e.conf.falta&&!e.compRec&&!(e.fim&&e.fim.st==='encerrado')){ c='crit'; t='a menos'; tt='Conferido'+q(e.conf)+' · faltou: '+(e.conf.itens||[]).map(x=>x.i+(x.q?' ('+x.q+')':'')).join(', '); }
  else if(e.fim&&e.fim.st==='pendente'){ c='warn'; t='pendente'; tt='Pendente'+q(e.fim)+(e.fim.motivo?' · '+e.fim.motivo:''); }
  else if(e.conf){ c='ok'; t='✓ conferido'; tt='Conferido'+q(e.conf); }
  else if(e.ent){ c='ok'; t='✓ entregue'; tt='Entregue na linha'+q(e.ent)+' · falta a produção conferir'; }
  else if(e.sep){ c='sep'; t='separado'; tt='Separado pelo almox'+q(e.sep)+' · aguardando entrega na linha'; }
  else if(e.env){ c='env'; t='enviado '+dm(hojeStr(new Date(e.env))); tt='Enviado ao almox'+q({em:e.env}); }
  else { c='neu'; t='rancho'; tt='Rancho anexado, ainda não enviado ao almox'; }
  return `<span class="rchn" title="Rancho ${n} · ${esc(tt)}">rancho <span class="num">${n}</span>${c==='neu'?'':` <span class="rchip ${c}">${t}</span>`}</span>`; }
function ordRow(o,mostrarLinha){
  const e=entregueDe(o), si=stInfo(o,e), pen=o.total-e, pct=o.total>0?Math.min(1,e/o.total):0, aberta=S.ord.aberta===o._id, de=dataEf(o), h=hojeStr();
  const atras=o.status==='aberta'&&ordAtras(o,h), rc=o.rancho?ranchoDe(o.rancho):null;
  const rbtn=!o.rancho&&o.status==='aberta'?'<button class="rchbtn" data-act="o-anexar-rancho" data-id="'+esc(o._id)+'" title="Ir para Ranchos e anexar o PDF do rancho">'+ic('mais',12,2.6)+'Anexar rancho</button>':'';
  const rtxt=o.rancho?' · '+rchChip(o):(o.status==='aberta'?' · <span style="color:var(--warn-ink)">sem rancho</span>':'');
  return `<div class="orow ${aberta?'aberta':''} ${o.status!=='aberta'?'fechada':''}" data-act="o-abrir" data-id="${esc(o._id)}" role="button" tabindex="0" aria-expanded="${aberta}" ${rowDrag(o)}>
   <span class="od num">${seqBtns(o)}${S._agr&&o.status==='aberta'&&de===diaSeq(o)?'':`<b>${dmTxt(de)}</b>`}${estTxt(o)}${o.turno&&o.turno!=='Dia todo'?`<small>${esc(o.turno)}</small>`:''}${de!==o.data&&o.data?`<small>desde ${dm(o.data)}</small>`:''}</span>
   <span class="on num"><b data-act="o-copiar" data-v="${esc(o.num)}" title="Copiar o número da ordem" role="button" tabindex="0">${esc(o.num)}</b></span>
   <span class="op"><b><span class="ocod num" data-act="o-copiar" data-v="${esc(codigoDe(o))}" data-k="cod" title="Copiar o código ${esc(codigoDe(o))}" role="button" tabindex="0">${esc(codigoDe(o))}</span>${esc(nomeCurto(o))}</b><small class="num">${[o.ensaca?`<span class="ecop" data-act="o-copiar" data-v="${esc(o.ensaca)}" data-k="ens" title="Copiar a ordem de ensacado" role="button" tabindex="0">ensacado <span class="ecn">${esc(o.ensaca)}</span></span>`:(faltaEns(o)?'<span class="ptag" title="Rejunte flexível/siliconizado precisa da ordem de ensacado">falta ensacado</span>':''),rtxt.replace(/^ · /,''),mostrarLinha?esc(o.linha||''):'',obsDe(o).length?`<span class="obstag" title="${esc(obsDe(o).at(-1).t)}">${obsDe(o).length} obs.</span>`:''].filter(Boolean).join(' · ')}</small></span>
   <span class="nr num" data-l="Total">${f0(o.total)} <small style="display:inline">${uA(o)}</small></span>
   <span class="nr num" data-l="Entregue">${e?fq(e):'<span style="color:var(--faint)">—</span>'}<span class="bar" style="display:block;height:5px;margin-top:4px"><i style="width:${pct*100}%;${e>o.total?'background:var(--warn)':''}"></i></span></span>
   <span class="nr num" data-l="Pendente" style="${pen<0?'color:var(--warn-ink)':''}">${o.status==='aberta'?fq(pen):'<span style="color:var(--faint)">'+fq(pen)+'</span>'}</span>
   <span class="os"><span class="pill ${si.c}">${esc(si.t)}</span>${priTag(o)}${divTag(o)}${atras?'<small style="color:var(--crit-ink)">atrasada</small>':''}${pendTags(o)}</span>
   <span class="ofp">${o.status==='aberta'?envAlmBtn(o):''}${o.status==='aberta'?`<button class="fpbtn cstb ${cesta().has(o._id)?'on':''}" data-act="cst-tog" data-id="${esc(o._id)}" title="${cesta().has(o._id)?'Tirar do e-mail do almox':'Colocar no e-mail do almox'}">${cesta().has(o._id)?'✓ ✉':'+ ✉'}</button>${pmxBtnsOrdem(o)}${dbPode().prod?`<select class="prisel p${dbPri(o)}" data-pri="${esc(o._id)}" title="Prioridade para o almox"><option value="0" ${dbPri(o)?'':'selected'}>Prioridade</option><option value="1" ${dbPri(o)===1?'selected':''}>1 · Muito alta</option><option value="2" ${dbPri(o)===2?'selected':''}>2 · Alta</option><option value="3" ${dbPri(o)===3?'selected':''}>3 · Média</option><option value="4" ${dbPri(o)===4?'selected':''}>4 · Baixa</option></select>`:''}`:''}<button class="fpbtn" data-act="fp-ordem" data-id="${esc(o._id)}" title="Gerar folha de produção da ordem ${esc(o.num)}" aria-label="Gerar folha de produção da ordem ${esc(o.num)}">${ic('folha',16,2)}<span>Folha</span></button>${rc&&rc.asset?`<button class="fpbtn" data-act="r-ver" data-asset="${esc(rc.asset)}" title="Abrir rancho ${esc(o.rancho)}" aria-label="Abrir PDF do rancho ${esc(o.rancho)} da ordem ${esc(o.num)}">${ic('folha',16,2)}<span>Rancho</span></button>`:''}${!(rc&&rc.asset)&&o.status==='aberta'?`<button class="fpbtn rchadd" data-act="o-anexar-rancho" data-id="${esc(o._id)}" title="${o.rancho?'O rancho '+esc(o.rancho)+' ainda não tem PDF. Anexe o PDF':'Anexar o PDF do rancho da ordem '+esc(o.num)}">${ic('mais',16,2.4)}<span>Rancho</span></button>`:''}</span>
  </div>${aberta?ordModal(o):''}`;
}
function pmxCorDoRancho(o){ const r=o.rancho&&ranchoDe(o.rancho); return ((r&&r.itens)||[]).filter(it=>/PREMIX/i.test(it.d||'')&&/^M\d/i.test(it.c||'')); }
function pmxFichaDoRancho(rch,cod){ return (S.pmx.fichas||[]).find(f=>f.status!=='excluida'&&String(f.rancho||'')===String(rch)&&String(f.material||'').toUpperCase().startsWith(String(cod).toUpperCase())); }
function pmxBtnsOrdem(o){ if(o.status!=='aberta'||!viewOk('pmxfichas')) return ''; return pmxCorDoRancho(o).map(it=>{ const f=pmxFichaDoRancho(o.rancho,it.c);
  return f?`<button class="fpbtn pmxok" data-act="o-pmx-ver" data-id="${esc(f._id)}" title="Ficha de premix ${esc(pmxOp(f))} · ${esc(it.d)}">${ic('check',14,2.4)}<span>${esc(pmxOp(f))}</span></button>`
   :`<button class="fpbtn pmxadd" data-act="o-pmx" data-id="${esc(o._id)}" data-c="${esc(it.c)}" title="Gerar a ficha de premix: ${esc(it.d)} · ${fq(+it.q||0)} ${esc(it.um||'')}">${ic('mais',16,2.4)}<span>Premix ${esc(String(it.d).replace(/^PREMIX\s+(COR\s+)?/i,'').replace(/\s+\d+\s*KG$/i,'').slice(0,16))}</span></button>`; }).join(''); }
function palTxt(q,pp,o){ q=Math.round(q*1000)/1000; if(!(pp>0)) return ''; const n=Math.floor(q/pp+1e-9), r=Math.round((q-n*pp)*1000)/1000;
  return `<span style="color:var(--teal-strong)">${n} palete${n===1?'':'s'}${r>0?' + '+fq(r)+' '+uA(o):''}</span> <small style="display:inline;color:var(--muted);font-weight:400">(${(q/pp).toLocaleString('pt-BR',{maximumFractionDigits:1})} pal.)</small>`; }
function boxPos(k){ const p=(S._boxPos||{})[k]; return p&&window.innerWidth>760?`transform:translate(${p.x}px,${p.y}px)`:''; }
(function(){ let d=null, ign=false;
  document.addEventListener('pointerdown',ev=>{ if(window.innerWidth<=760||ev.button!==0) return; const h=ev.target.closest('.ohd,.dbgrip'); if(!h) return; if(ev.target.closest('button,input,select,textarea,a,[data-act^="o-copiar"]')) return;
    const box=h.closest('.obox,.dbmbox'); if(!box) return; const k=box.classList.contains('obox')?'obox':'dbmbox'; S._boxPos=S._boxPos||{}; const p=S._boxPos[k]||{x:0,y:0};
    d={k,box,sx:ev.clientX,sy:ev.clientY,x0:p.x,y0:p.y,mov:false,r:box.getBoundingClientRect()}; box.classList.add('arrastando'); try{ h.setPointerCapture(ev.pointerId); }catch(e){} ev.preventDefault(); });
  document.addEventListener('pointermove',ev=>{ if(!d) return; const dx=ev.clientX-d.sx, dy=ev.clientY-d.sy; if(Math.abs(dx)+Math.abs(dy)>3) d.mov=true;
    const r=d.r; const L=Math.max(120-r.width,Math.min(window.innerWidth-120,r.left+dx)), T=Math.max(0,Math.min(window.innerHeight-60,r.top+dy)); const x=d.x0+(L-r.left), y=d.y0+(T-r.top);
    d.box.style.transform=`translate(${x}px,${y}px)`; S._boxPos[d.k]={x,y}; });
  const fim=()=>{ if(!d) return; d.box.classList.remove('arrastando'); if(d.mov) ign=true; d=null; setTimeout(()=>{ ign=false; },0); };
  document.addEventListener('pointerup',fim); document.addEventListener('pointercancel',fim);
  document.addEventListener('click',ev=>{ if(ign){ ev.stopImmediatePropagation(); ev.preventDefault(); ign=false; } },true);
  document.addEventListener('dblclick',ev=>{ const h=ev.target.closest('.ohd,.dbgrip'); if(!h||ev.target.closest('button,input')) return; const box=h.closest('.obox,.dbmbox'); if(!box) return; const k=box.classList.contains('obox')?'obox':'dbmbox'; if(S._boxPos) delete S._boxPos[k]; box.style.transform=''; });
})();
function ordModal(o){ const e=entregueDe(o), si=stInfo(o,e);
  return `<div class="omodal" data-act="o-fechar-modal"><div class="obox" role="dialog" aria-modal="true" aria-label="Ordem ${esc(o.num)}" style="${boxPos('obox')}">
   <div class="ohd"><div style="min-width:0"><div class="label">ORDEM</div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b class="num" style="font-size:22px" data-act="o-copiar" data-v="${esc(o.num)}" title="Copiar o número da ordem" role="button" tabindex="0">${esc(o.num)}</b><span class="pill ${si.c}">${esc(si.t)}</span></div>
    <div class="sub" style="margin:2px 0 0;font-size:13px">${esc(codigoDe(o))} · ${esc(nomeCurto(o))} · ${esc(o.linha||'sem linha')}</div></div>
    <button class="btn sec" data-act="o-fechar-modal" data-x="1" aria-label="Fechar" style="height:40px;width:40px;padding:0;flex-shrink:0">✕</button></div>
   ${ordDetalhe(o)}</div></div>`; }
function copiarTexto(t,k){ const ok=()=>toast(k==='cod'?'Código '+t+' copiado.':k==='ens'?'Ensacado '+t+' copiado.':'Ordem '+t+' copiada.'); try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,()=>copiarAntigo(t,ok)); return; } }catch(e){} copiarAntigo(t,ok); }
function copiarAntigo(t,ok){ const a=document.createElement('textarea'); a.value=t; a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.select(); try{ document.execCommand('copy'); ok(); }catch(e){ toast('Não foi possível copiar.'); } a.remove(); }
function ordDetalhe(o){
  const es=entregasDe(o._id), e=entregueDe(o), P=S.ord.painel||'entrega';
  const itens=[];
  (o.ant||[]).forEach(a=>itens.push(`<div class="erow"><span>${a.pal!=null?`${fq(a.pal)} × ${fq(a.porPal)}`:(a.qtd<0?'ajuste':'lançamento')} <small>da planilha</small></span><b class="num">${fq(a.qtd)}</b><span></span></div>`));
  es.forEach(x=>itens.push(`<div class="erow ${x.anulada?'anul':''}"><span class="num">${dia(x.em)} ${hora(x.em)} · ${x.pal||x.fardos?[x.pal?`${fq(x.pal)} pal × ${fq(x.porPal)}`:'',x.fardos?`${fq(x.fardos)} fd × ${fq(x.porFardo)}`:'',x.avulso?fq(x.avulso)+' avulsos':''].filter(Boolean).join(' + '):'avulso'} <small>${esc(nomeDe(x.por))}${x.horaManual?' · hora informada':''}${x.antecipado?' · antecipado':''}${x.anulada?' · desfeita':''}${x.obs?' · <span style="color:var(--ink)">'+esc(x.obs)+'</span>':''}</small></span><b class="num">${fq(x.qtd)}</b>${x.anulada||o.status!=='aberta'?'<span></span>':`<button class="lnk" data-act="o-desfazer" data-id="${esc(x._id)}" style="color:var(--muted)">Desfazer</button>`}</div>`));
  const acoes=o.status==='aberta'
   ?`<div class="chips" style="margin-top:14px">${[['entrega','Lançar entrega'],['continua','Continua outro dia'],['dias','Vários dias'+(o.ate?' · até '+dm(o.ate):'')],['encerrar','Encerrar'],['editar','Editar'],['obs','Observações'+(obsDe(o).length?' ('+obsDe(o).length+')':'')]].map(([k,l])=>`<button class="chip" data-act="o-painel" data-v="${k}" aria-pressed="${P===k}">${l}</button>`).join('')}<button class="chip" data-act="fp-ordem" data-id="${esc(o._id)}">${ic('folha',15,2)} Folha (PDF)</button></div>`
   :`<div class="chips" style="margin-top:14px"><button class="chip" data-act="o-painel" data-v="editar" aria-pressed="${P==='editar'}">Editar</button><button class="chip" data-act="o-painel" data-v="obs" aria-pressed="${P==='obs'}">Observações${obsDe(o).length?' ('+obsDe(o).length+')':''}</button><button class="chip" data-act="o-reabrir" data-id="${esc(o._id)}">Reabrir ordem</button><button class="chip" data-act="fp-ordem" data-id="${esc(o._id)}">${ic('folha',15,2)} Folha (PDF)</button></div>`;
  let painel='';
  if(o.status==='aberta'&&P==='entrega') painel=entregaForm(o);
  else if(o.status==='aberta'&&P==='dias') painel=`<div class="opanel"><div class="label">VAI PRODUZIR POR VÁRIOS DIAS?</div><div class="sub" style="margin:4px 0 10px">Começa em ${dm(ateIni(o))}. Escolha o último dia: no Calendário a ordem aparece em todos os dias úteis até lá.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="date" class="txt" id="o-dias-ate" value="${esc(o.ate||'')}" min="${esc(addDias(ateIni(o),1))}" style="width:190px" aria-label="Produz até"><button class="btn" data-act="o-ate" data-id="${esc(o._id)}">${ic('check',18,2.2)}Salvar</button>${o.ate?`<button class="lnk" data-act="o-ate-x" data-id="${esc(o._id)}">Voltar a ser de um dia só</button>`:''}</div>
    ${o.ate?`<div class="sub num" style="margin:8px 0 0;font-size:12.5px">Hoje está de ${dm(ateIni(o))} até ${dm(o.ate)} · ${calDiasUteis(ateIni(o),o.ate,S.cal&&S.cal.sab).length} dias úteis.</div>`:''}</div>`;
  else if(o.status==='aberta'&&P==='continua') painel=`<div class="opanel"><div class="label">EM QUE DIA ELA CONTINUA?</div><div class="sub" style="margin:4px 0 10px">A data programada (${dm(o.data)}) fica guardada.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="date" class="txt" id="o-cont-data" value="${esc(S.ord.f.cont||amanhaStr())}" style="width:190px" aria-label="Continua em"><button class="btn" data-act="o-continua" data-id="${esc(o._id)}">${ic('check',18,2.2)}Confirmar</button></div></div>`;
  else if(o.status==='aberta'&&P==='encerrar'){ const sug=sugerirFech(o), sel=S.ord.f.fech||sug, d=e-o.total;
    painel=`<div class="opanel"><div class="label">ENCERRAR ORDEM</div><div class="sub num" style="margin:4px 0 10px">Entregue ${fq(e)} de ${fq(o.total)}${d?` (${d>0?'+':''}${fq(d)})`:''}. Sugestão: <b>${FECH[sug].n}</b>.</div>
    <div class="opts" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${Object.keys(FECH).map(k=>`<button class="opt" data-act="o-fech" data-v="${k}" aria-pressed="${sel===k}">${FECH[k].n}${k===sug?'<small>sugerido</small>':''}</button>`).join('')}</div>
    <label style="display:flex;flex-direction:column;gap:4px;margin-top:12px"><span class="sub" style="margin:0;font-size:12px">Observação do encerramento (opcional)</span><textarea class="txt" id="o-fech-obs" rows="2" placeholder="Ex.: sobrou 1 palete, faltou embalagem, ordem complementar 380001…">${esc(S.ord.f.fechObs||'')}</textarea></label>
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-top:12px">${ordCancelUI(o)}<button class="btn" data-act="o-encerrar" data-id="${esc(o._id)}">${ic('check',18,2.2)}Encerrar ordem</button></div></div>`; }
  else if(P==='editar') painel=editarForm(o);
  else if(P==='obs') painel=`<div class="opanel"><div class="label">NOVA OBSERVAÇÃO</div><textarea class="txt" id="o-obs-txt" rows="3" placeholder="Ex.: faltou embalagem, trocar bobina, cliente pediu prioridade…" style="margin-top:8px">${esc(S.ord.f.obsTxt||'')}</textarea>
    <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" data-act="o-obs-add" data-id="${esc(o._id)}">${ic('check',18,2.2)}Salvar observação</button></div></div>`;
  const hist=(o.hist||[]).slice(-5).reverse();
  return `<div class="odet">
   <div class="odet-l">
    <div class="sub" style="margin:0 0 8px">${esc(o.produto)}</div>
    <div class="kv num"><span>Linha</span><b>${esc(o.linha||'—')} · ${esc(o.turno||'Dia todo')}</b><span>Programada</span><b>${dm(o.data)}${o.continuaEm&&o.continuaEm>o.data?' · continua '+dm(o.continuaEm):''}${o.ate?' · <span style="color:var(--teal)">vários dias, até '+dm(o.ate)+'</span>':''}</b>${o.dtFim?`<span>Fim no sistema</span><b>${dm(o.dtFim)}</b>`:''}${o.ensaca?`<span>Ordem de ensacado</span><b>${esc(o.ensaca)}</b>`:''}${!o.rancho&&o.status==='aberta'?`<span>Rancho</span><b><span style="color:var(--warn-ink)">sem rancho</span> · <button class="lnk" data-act="o-anexar-rancho" data-id="${esc(o._id)}" style="padding:0">anexar rancho</button></b>`:''}${o.rancho?`<span>Rancho</span><b>${esc(o.rancho)}${(()=>{ const r=ranchoDe(o.rancho); if(!r) return ''; const dt=r.dataRel?String(r.dataRel):(r.criadoEm?dataBR(hojeStr(new Date(r.criadoEm))):''); return dt?` · <span title="${r.dataRel?'Data do rancho (relatório)':'Data em que o rancho foi anexado'}">${esc(dt)}</span>`:''; })()}${(()=>{ const r=ranchoDe(o.rancho); return r&&r.asset?` · <button class="lnk" data-act="r-ver" data-asset="${esc(r.asset)}" style="padding:0">abrir PDF</button>`:(o.status==='aberta'?` · <span style="color:var(--warn-ink)">sem PDF</span> · <button class="lnk" data-act="o-anexar-rancho" data-id="${esc(o._id)}" style="padding:0">anexar PDF</button>`:''); })()}</b>`:''}${o.statusOrig&&o.statusOrig!=='PROGRAMAÇÃO LIBERADA'&&o.status==='aberta'?`<span>Status na planilha</span><b>${esc(o.statusOrig.toLowerCase())}</b>`:''}${(()=>{ const pp=paleteDe(o), e=entregueDe(o), pen=Math.max(0,o.total-e); return `<span>Quantidade</span><b>${f0(o.total)} ${uA(o)}${pp?' = '+palTxt(o.total,pp,o):''}</b>`+(o.status==='aberta'&&e?`<span>Pendente</span><b>${fq(pen)} ${uA(o)}${pp?' = '+palTxt(pen,pp,o):''}</b>`:'')+(pp?'':`<span>Paletes</span><b style="font-weight:400;color:var(--muted)">cadastre as unidades por palete do item para ver em paletes</b>`); })()}${`<span>Unidade</span><b>${unidDe(o)?esc(UNID[unidDe(o)].p):'não cadastrada'}${paleteDe(o)?' · '+paleteDe(o)+' '+uA(o)+' por palete':''}</b>`}</div>
    <div class="label" style="margin:14px 0 4px">ENTREGAS</div>
    ${itens.length?itens.join(''):'<div class="sub" style="margin:0">Nenhuma entrega lançada.</div>'}
    <div class="erow tot"><span>Total entregue</span><b class="num">${fq(e)} de ${fq(o.total)}</b><span></span></div>
    ${obsDe(o).length?`<div class="label" style="margin:14px 0 4px">OBSERVAÇÕES</div>${obsDe(o).slice().reverse().map(x=>`<div class="obsi"><div>${esc(x.t)}</div><small class="num">${dia(x.em)} ${hora(x.em)}${x.por?' · '+esc(nomeDe(x.por)):''} · <button class="lnk" data-act="o-obs-rem" data-id="${esc(o._id)}" data-v="${esc(x.id)}" style="padding:0;font-size:11px;color:var(--muted)">remover</button></small></div>`).join('')}`:''}
    ${hist.length?`<div class="label" style="margin:14px 0 4px">ALTERAÇÕES</div>${hist.map(x=>`<div class="sub num" style="margin:2px 0;font-size:12px">${dia(x.em)} ${hora(x.em)} · ${esc(x.o)}${x.por?' · '+esc(nomeDe(x.por)):''}</div>`).join('')}`:''}
   </div>
   <div class="odet-r">${acoes}${painel}</div>
  </div>`;
}
function entregaForm(o){
  const f=S.ord.f, pp=paleteDe(o);
  const porPal=f.porPal!=null?f.porPal:(pp?String(pp):'');
  return `<div class="opanel"><div class="label">LANÇAR ENTREGA</div>
  ${pp||f.porPal?`<div class="ent-grid">
    <label><span class="sub">Paletes</span><div class="field"><input id="o-pal" class="mcampo" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(f.pal||'')}"></div></label>
    <span class="x">×</span>
    <label><span class="sub">${esc(uP(o))} por palete</span><div class="field"><input id="o-porpal" class="mcampo" inputmode="numeric" autocomplete="off" value="${esc(porPal)}"></div></label>
    <span class="x">+</span>
    <label><span class="sub">${esc(uP(o))} avulsos</span><div class="field"><input id="o-av" class="mcampo" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(f.av||'')}"></div></label>
   </div>`:`<div class="ent-grid" style="grid-template-columns:minmax(0,220px)"><label><span class="sub">Quantidade (${esc(uP(o))})</span><div class="field"><input id="o-av" class="mcampo" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(f.av||'')}"></div></label></div>
   <button class="lnk" data-act="o-usar-pal" style="margin-top:4px">Lançar em paletes</button>`}
  ${fardoDe(o)?`<div class="ent-grid" style="grid-template-columns:minmax(0,220px) auto;align-items:end"><label><span class="sub">Fardos <small>(1 fardo = ${fq(fardoDe(o))} ${esc(uA(o))})</small></span><div class="field"><input id="o-fd" class="mcampo" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(f.fd||'')}"></div></label></div>`:''}
  ${faltaEns(o)?`<div class="ensreq"><label><span class="sub"><b>Ordem de ensacado</b> · obrigatória para rejunte flexível/siliconizado</span><div class="ensrow"><input class="txt num" id="o-ent-ens" inputmode="numeric" autocomplete="off" placeholder="nº da ordem de ensacado" value="${esc(S.ord.f.ens||'')}"><button class="btn sec" data-act="o-ens-salvar" data-id="${esc(o._id)}" style="height:42px">${ic('check',16,2.2)}Salvar ensacado</button></div></label><div class="sub" style="margin:4px 0 0;font-size:11.5px">Pode salvar agora ou junto com a entrega.</div></div>`:''}
  <div class="num" id="o-ent-res" style="margin:10px 0 2px;font-size:15px">${entRes(o)}</div>
  <div id="o-ent-comp">${entCompHtml(o)}</div>
  <input class="txt" id="o-ent-obs" placeholder="Observação do apontamento (opcional)" value="${esc(S.ord.f.entObs||'')}" style="margin-top:8px;height:40px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px"><div style="display:flex;flex-direction:column;gap:4px">${S.ord.antec&&S.ord.antec.on?'':horaCampo('ent','Informar outro dia e hora')}${antecCampo()}</div><button class="btn" data-act="o-lancar" data-id="${esc(o._id)}">${ic('check',18,2.2)}Lançar</button></div></div>`;
}
function proxApont(){ const d=new Date(); const m=d.getHours()*60+d.getMinutes(); if(m<12*60) d.setHours(12,0,0,0); else if(m<17*60+15) d.setHours(17,15,0,0); else { d.setDate(d.getDate()+1); d.setHours(12,0,0,0); } return d; }
function antecCampo(){ const a=S.ord.antec||{}; const agora=new Date(), lim=new Date(agora.getTime()+48*3600e3);
  return `<div class="hora-box"><label><input type="checkbox" id="o-antec-tog" ${a.on?'checked':''}> Apontamento antecipado</label>${a.on?`<input type="datetime-local" id="o-antec-val" value="${esc(a.val||localVal(proxApont()))}" min="${localVal(agora)}" max="${localVal(lim)}" aria-label="Horário previsto do apontamento"><span class="sub" style="margin:0;font-size:12px;flex-basis:100%">Lança agora a quantidade prevista para esse horário. Se a produção real for diferente, desfaça e lance de novo.</span>`:''}</div>`; }
function entCalc(){ const f=S.ord.f; const o=ordById(S.ord.aberta); const pf=o?fardoDe(o):0; const pal=numQ(f.pal||'')||0, pp=numQ(f.porPal!=null?f.porPal:'')||0, av=numQ(f.av||'')||0, fd=pf?(numQ(f.fd||'')||0):0; return {pal,pp,av,fd,pf,q:pal*pp+fd*pf+av}; }
function entExced(o){ const c=entCalc(); if(S.ord.f.compTudo&&c.q>0) return {x:Math.round(c.q*1000)/1000,pend:0,q:c.q,tudo:true}; const pend=Math.max(0,o.total-entregueDe(o)); const x=Math.round((c.q-pend)*1000)/1000; return x>0.0005?{x,pend,q:c.q}:null; }
function entCompHtml(o){ const X=entExced(o); const f=S.ord.f; if(!X) return entCalc().q>0?`<button class="lnk" data-act="o-comp-tudo" data-v="1" style="margin-top:6px">Lançar esta quantidade em ordem complementar</button>`:''; if(!f.comp||!f.comp.length) f.comp=[{n:'',q:''}];
  if(f.comp.length===1&&!f.compQ) f.comp[0].q=qtdTxt(X.x);
  const soma=f.comp.reduce((a,r)=>a+(numQ(r.q)||0),0), ok=Math.abs(soma-X.x)<0.001;
  return `<div class="compbox">${X.tudo?`<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span><b>Lançar ${fq(X.x)} ${esc(uP(o))} em ordem complementar</b> <span class="sub" style="margin:0">(a ordem ${esc(o.num)} não recebe nada)</span></span><button class="lnk" data-act="o-comp-tudo" data-v="0">Voltar: lançar na ${esc(o.num)}</button></div>`:`<div><b>Passou ${fq(X.x)} ${esc(uP(o))} da ordem</b> <span class="sub" style="margin:0">(o pendente era ${fq(X.pend)}). Lance o excedente em ordem complementar:</span></div>`}
   ${f.force?'':`${f.comp.map((r,i)=>`<div class="comprow"><input class="txt num" data-comp="${i}" data-k="n" inputmode="numeric" placeholder="nº da ordem complementar" value="${esc(r.n)}"><input class="txt num" data-comp="${i}" data-k="q" inputmode="decimal" placeholder="quantidade" value="${esc(r.q)}"><span class="sub" style="margin:0">${esc(uP(o))}</span>${f.comp.length>1?`<button class="lnk" data-act="o-comp-rm" data-v="${i}">remover</button>`:''}</div>`).join('')}
   <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><button class="lnk" data-act="o-comp-add">+ outra ordem complementar</button><span class="sub num" id="o-comp-soma" style="margin:0;${ok?'':'color:var(--crit-ink)'}">Distribuído ${fq(soma)} de ${fq(X.x)}</span></div>
   <div class="sub" style="margin:0;font-size:12px">Se a ordem complementar ainda não existe no painel, ela é criada com o mesmo produto e linha. ${X.tudo?'':`A ordem ${esc(o.num)} recebe só ${fq(X.pend)}.`}</div>`}
   ${X.tudo?'':`<label class="sub" style="margin:0;font-size:12px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="o-comp-force" ${f.force?'checked':''}> Lançar tudo nesta ordem mesmo (sem complementar)</label>`}</div>`; }
function entCompAtualiza(o){ const el=$('#o-ent-comp'); if(!el) return; const tem=!!entExced(o), abre=!!el.querySelector('.compbox');
  if(!tem){ const m=entCalc().q>0?'link':''; if((el.querySelector('[data-act="o-comp-tudo"]')?'link':'')!==m||abre) el.innerHTML=entCompHtml(o); return; } /* não recria o link a cada tecla: no celular o toque se perdia */
  if(!abre){ el.innerHTML=entCompHtml(o); return; } const f=S.ord.f; if(f.comp&&f.comp.length===1&&!f.compQ){ const X=entExced(o); f.comp[0].q=qtdTxt(X.x); const i=el.querySelector('[data-comp="0"][data-k="q"]'); if(i) i.value=f.comp[0].q; } entCompSoma(o); }
function entCompSoma(o){ const X=entExced(o), el=$('#o-comp-soma'); if(!X||!el) return; const soma=(S.ord.f.comp||[]).reduce((a,r)=>a+(numQ(r.q)||0),0); el.textContent='Distribuído '+fq(soma)+' de '+fq(X.x); el.style.color=Math.abs(soma-X.x)<0.001?'':'var(--crit-ink)'; }
document.addEventListener('input',ev=>{ const t=ev.target; if(!t.dataset||t.dataset.comp==null) return; const f=S.ord.f; f.comp=f.comp||[]; const r=f.comp[+t.dataset.comp]; if(!r) return;
  if(t.dataset.k==='n'){ t.value=t.value.replace(/\D/g,''); r.n=t.value; } else { t.value=t.value.replace(/[^0-9.,]/g,''); r.q=t.value; f.compQ=true; } const o=ordById(S.ord.aberta); if(o) entCompSoma(o); });
document.addEventListener('change',ev=>{ if(ev.target.id!=='o-comp-force') return; S.ord.f.force=ev.target.checked; const o=ordById(S.ord.aberta); const el=$('#o-ent-comp'); if(o&&el) el.innerHTML=entCompHtml(o); });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="o-comp-tudo"]'); if(!b) return; const f=S.ord.f; f.compTudo=b.dataset.v==='1'; f.force=false; f.comp=[{n:'',q:''}]; f.compQ=false; const o=ordById(S.ord.aberta); const el=$('#o-ent-comp'); if(o&&el){ el.innerHTML=entCompHtml(o); const n=el.querySelector('[data-k="n"]'); n&&n.focus(); } });
document.addEventListener('click',ev=>{ const b=ev.target.closest('[data-act="o-comp-add"],[data-act="o-comp-rm"]'); if(!b) return; const f=S.ord.f; f.comp=f.comp||[]; f.compQ=true;
  if(b.dataset.act==='o-comp-add') f.comp.push({n:'',q:''}); else f.comp.splice(+b.dataset.v,1); const o=ordById(S.ord.aberta); const el=$('#o-ent-comp'); if(o&&el){ el.innerHTML=entCompHtml(o); const ins=el.querySelectorAll('[data-k="n"]'); const last=ins[ins.length-1]; if(b.dataset.act==='o-comp-add'&&last) last.focus(); } });
async function lancarComplementares(o,rows,h,an){ const out=[];
  for(const r of rows){ let co=S.ordens.filter(x=>String(x.num)===r.n).sort((a,b)=>(a.status==='aberta'?0:1)-(b.status==='aberta'?0:1))[0]; let id=co&&co._id;
    if(!co){ const d={num:r.n,produto:o.produto,linha:o.linha,data:dataEf(o)<hojeStr()?hojeStr():dataEf(o),turno:o.turno||'Dia todo',total:r.q,status:'aberta',origem:'complementar',complementarDe:String(o.num),criadaEm:new Date().toISOString(),por:S.uid};
      if(o.ensaca) d.ensaca=o.ensaca; if(o.seq!=null) d.seq=o.seq+0.5; id=S.ordens.some(x=>x._id===r.n)?r.n+'-'+Date.now().toString(36):r.n;
      try{ await S.db.doc('ordens/'+id).set(d); }catch(e){ erro(e); return null; } co=Object.assign({_id:id},d); }
    const e={ordem:id,num:r.n,linha:co.linha||o.linha,em:h.iso,por:S.uid,qtd:Math.round(r.q*1000)/1000,avulso:Math.round(r.q*1000)/1000,complementarDe:String(o.num)}; marcaManual(e,h); if(an){ e.antecipado=true; e.registradoEm=new Date().toISOString(); }
    if(!(await salvar('entregas',e))) return null; out.push({n:r.n,q:r.q,nova:!S.ordens.some(x=>x._id===id)}); }
  return out; }
function entRes(o){ const f=S.ord.f; if(f.porPal==null) f.porPal=paleteDe(o)?String(paleteDe(o)):null; const c=entCalc(); const e=entregueDe(o);
  if(!c.q) return `<span class="sub" style="margin:0">Pendente agora: <b>${fq(o.total-e)} ${esc(uP(o))}</b>${paleteDe(o)&&o.total-e>0?' · '+palTxt(o.total-e,paleteDe(o),o):''}</span>`;
  return `= <b style="font-size:19px">${fq(c.q)} ${esc(uP(o))}</b>${unidDe(o)==='FD'&&unPorFardo(o)?` <span class="sub" style="margin:0">(${fq(c.q*unPorFardo(o))} unidades)</span>`:''} <span class="sub" style="margin:0">· depois disso o pendente fica <b>${fq(o.total-e-c.q)}</b></span>`; }
function editarForm(o){ const f=S.ord.f; const v=k=>f['e_'+k]!=null?f['e_'+k]:(o[k]!=null?o[k]:'');
  return `<div class="opanel"><div class="label">EDITAR ORDEM</div>
  <div class="ed-grid">
   <label><span class="sub">Nº da ordem</span><input class="txt num" id="o-e-num" inputmode="numeric" value="${esc(v('num'))}"></label>
   <label><span class="sub">Linha</span><select class="txt" id="o-e-linha">${linhasOrd().map(l=>`<option ${v('linha')===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
   <label><span class="sub">Data programada</span><input type="date" class="txt" id="o-e-data" value="${esc(v('data'))}"></label>
   <label><span class="sub">Turno</span><select class="txt" id="o-e-turno">${TURNOS.map(t=>`<option ${v('turno')===t?'selected':''}>${t}</option>`).join('')}</select></label>
   <label><span class="sub">Qtde total</span><input class="txt num" id="o-e-total" inputmode="decimal" value="${esc(String(v('total')).replace('.',','))}"></label>
   <label style="grid-column:1/-1"><span class="sub">Produto</span><input class="txt" id="o-e-produto" value="${esc(v('produto'))}"></label>
   <label><span class="sub">Ordem de ensacado</span><input class="txt num" id="o-e-ensaca" inputmode="numeric" placeholder="se houver" value="${esc(v('ensaca'))}"></label>
   <label><span class="sub">Nº do rancho</span><input class="txt num" id="o-e-rancho" inputmode="numeric" placeholder="sai na folha" value="${esc(v('rancho'))}"></label>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px">
   ${o.status==='aberta'?ordCancelUI(o):'<span></span>'}
   <button class="btn" data-act="o-salvar-ed" data-id="${esc(o._id)}">${ic('check',18,2.2)}Salvar</button></div></div>`; }

function ordCancelUI(o){ if(S.ord.confCancel!==o._id) return `<button class="btn warn" data-act="o-cancelar" data-id="${esc(o._id)}" style="height:40px">Cancelar ordem</button>`;
  return `<div class="av crit" style="margin:0;max-width:420px"><b>Cancelar a ordem ${esc(o.num)}?</b><span>Ela sai da programação e fica como cancelada no histórico.</span><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn warn" data-act="o-cancelar" data-id="${esc(o._id)}" style="height:40px">Sim, cancelar</button><button class="btn sec" data-act="o-cancel-nao" style="height:40px">Não</button></div></div>`; }
function prodsDaLinha(l){ const doItem=itensAtivos().filter(i=>(i.linhas||[]).includes(l)).map(i=>i.codigo+' - '+i.descricao);
  const semCad=S.ordens.filter(o=>o.linha===l&&o.produto&&!itemDe(codigoDe(o))).map(o=>o.produto);
  return [...new Set([...doItem,...semCad])].sort(); }
function avisoProdLinha(f){ const cod=codigoDe({produto:f.produto}); if(!cod) return ''; const it=itemDe(cod), l=f.linha||linhasOrd()[0];
  if(!it) return `<span class="sub" style="display:block;margin:4px 0 0;font-size:12px">Item sem cadastro. A ordem será criada assim mesmo.</span>`;
  const ls=it.linhas||[]; if(!ls.length||ls.includes(l)) return '';
  return `<span style="display:block;margin-top:6px;padding:8px 10px;border-radius:8px;background:var(--warn-tint);color:var(--warn-ink);font-size:13px;font-weight:600">Atenção: ${esc(cod)} é da ${esc(ls.join(', '))}, não da ${esc(l)}. Confira a linha antes de criar.</span>`; }
function novaPainel(){ const f=S.ord.nf;
  return `<section class="card" aria-label="Nova ordem" style="border:1.5px solid var(--teal)">
  <div class="head" style="align-items:baseline"><h2>${f.tipo==='prev'?'Nova programação':'Nova ordem'}${f.linha?` <span class="sub" style="display:inline;font-size:15px">· ${esc(f.linha)}</span>`:''}</h2><button class="lnk" data-act="o-nova-fechar">Fechar</button></div>
  <div class="seg" role="group" aria-label="Tipo" style="margin-top:10px"><button data-act="o-nova-tipo" data-v="ordem" aria-pressed="${f.tipo!=='prev'}">Ordem com número</button><button data-act="o-nova-tipo" data-v="prev" aria-pressed="${f.tipo==='prev'}">Programação · sem número, a confirmar</button></div>
  ${f.tipo==='prev'?'<div class="sub" style="font-size:12px;margin-top:6px">Fica marcada como “sem nº” na programação e no calendário. Quando a ordem sair no sistema, confirme com o número.</div>':''}
  <div class="ed-grid" style="margin-top:12px">
   ${f.tipo==='prev'?'':`<label><span class="sub">Nº da ordem</span><input class="txt num" id="o-n-num" inputmode="numeric" value="${esc(f.num||'')}"></label>`}
   <label><span class="sub">Qtde total</span><input class="txt num" id="o-n-total" inputmode="decimal" value="${esc(f.total||'')}"></label>
   <label style="grid-column:1/-1"><span class="sub">Produto (código - descrição)</span><input class="txt" id="o-n-produto" placeholder="AC0005 - ARGAMASSA CINZA AC3 EMB PAPEL 20 KG" value="${esc(f.produto||'')}" list="o-prods"><span id="o-n-aviso">${avisoProdLinha(f)}</span></label>
   <label><span class="sub">Linha</span><select class="txt" id="o-n-linha">${linhasOrd().map(l=>`<option ${f.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
   <label><span class="sub">Data</span><input type="date" class="txt" id="o-n-data" value="${esc(f.data||hojeStr())}"></label>
   <label><span class="sub">Turno</span><select class="txt" id="o-n-turno">${TURNOS.map(t=>`<option ${f.turno===t?'selected':''}>${t}</option>`).join('')}</select></label>
   ${f.tipo==='prev'?`<label><span class="sub">Observação</span><input class="txt" id="o-n-obs" placeholder="opcional" value="${esc(f.obs||'')}"></label>`:`<label><span class="sub">Ordem de ensacado</span><input class="txt num" id="o-n-ensaca" inputmode="numeric" placeholder="se houver" value="${esc(f.ensaca||'')}"></label>`}
  </div>
  <datalist id="o-prods">${prodsDaLinha(f.linha||linhasOrd()[0]).map(p=>`<option value="${esc(p)}">`).join('')}</datalist>
  <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn big" data-act="o-nova-salvar">${ic('check',22,2.2)}${f.tipo==='prev'?'Salvar programação':'Criar ordem'}</button></div></section>`; }

// ---------- importação ----------
function impPainel(){ const I=S.imp, pv=I.prev;
  const lst=(xs,fn,max)=>xs.slice(0,max||12).map(fn).join('')+(xs.length>(max||12)?`<div class="sub" style="font-size:12px;margin:4px 0 0">+ ${xs.length-(max||12)}…</div>`:'');
  return `<section class="card" aria-label="Importar ordens" style="border:1.5px solid var(--teal)">
  <div class="head" style="align-items:baseline"><h2>Importar ordens em aberto do sistema</h2><button class="lnk" data-act="o-imp-fechar">Fechar</button></div>
  <div class="sub" style="margin-top:4px">Use o Ordens_liberadas.csv do sistema (só ordens em aberto). O painel confere nos dois sentidos: o que está no sistema e não no painel, e o que está aberto no painel mas não está mais no sistema.</div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:14px">
   <label class="btn sec" style="cursor:pointer">${ic('baixar',18,2)}Escolher arquivo CSV<input type="file" id="o-imp-file" accept=".csv,.txt,text/csv" style="position:absolute;width:1px;height:1px;opacity:0"></label>
   <span class="sub" style="margin:0">${I.nome?esc(I.nome):'ou cole abaixo'}</span></div>
  <textarea class="txt" id="o-imp-txt" rows="3" placeholder="Cole aqui as linhas com cabeçalho (Ordem, Cód. Item, Descrição, UM, Dt. Inicio, Dt. Fim, Qtde., Qtde. Pendente, Rancho…)" style="margin-top:10px;font-size:13px;font-family:ui-monospace,Consolas,monospace">${esc(I.texto||'')}</textarea>
  ${I.erro?`<div class="banner" style="margin-top:10px">${esc(I.erro)}</div>`:''}
  ${pv?`<div style="margin-top:14px"><div class="label">CONFERÊNCIA COM O SISTEMA</div>
   <div class="resumo" style="margin-top:8px;box-shadow:none;border:1px solid var(--line)">
    <div><div class="k">Abertas no sistema</div><div class="v num">${pv.total}</div></div>
    <div><div class="k">Novas no painel</div><div class="v num ${pv.novas.length?'warn':''}">${pv.novas.length}</div></div>
    <div><div class="k">Abertas no painel, fora do sistema</div><div class="v num ${pv.fora.length?'crit':''}">${pv.fora.length}</div></div>
    <div><div class="k">Encerradas no painel, abertas no sistema</div><div class="v num ${pv.reab.length?'crit':''}">${pv.reab.length}</div></div></div>
   <div class="impgr">
    ${pv.novas.length?`<div><b>Novas → ${pv.novas.filter(x=>!x.ign&&!x.vinc).length} para “A programar”</b>${lst(pv.novas,x=>`<div class="impl num"><span>${esc(x.num)} · ${esc(x.cod)} · ${esc(x.desc)}</span><span>${x.vinc?`<span class="pill neu">ensaca da ${esc(x.vinc)}</span>`:x.ign?'<span class="pill dash">não é de linha</span>':`${f0(x.total)} ${esc((x.um||'').toLowerCase())}`}</span></div>`)}</div>`:''}
    ${pv.fora.length?`<div><b style="color:var(--crit-ink)">Abertas no painel, mas não estão em aberto no sistema</b><div class="sub" style="font-size:12px;margin:2px 0 4px">Provavelmente já foram encerradas no sistema. Ficam sinalizadas na Programação para você encerrar.</div>${lst(pv.fora,o=>`<div class="impl num"><span>${esc(o.num)} · ${esc(codigoDe(o))} · ${esc(o.linha||'fila')}</span><span>pendente no painel ${fq(Math.max(0,o.total-entregueDe(o)))}</span></div>`)}</div>`:''}
    ${pv.reab.length?`<div><b style="color:var(--crit-ink)">Encerradas no painel, mas ainda abertas no sistema</b><div class="sub" style="font-size:12px;margin:2px 0 4px">Falta encerrar no sistema ou a ordem continua. Ficam sinalizadas.</div>${lst(pv.reab,x=>`<div class="impl num"><span>${esc(x.o.num)} · ${esc(codigoDe(x.o))} · ${esc(x.o.linha||'')} · ${esc(stInfo(x.o,entregueDe(x.o)).t.toLowerCase())}</span><span>pendente no sistema ${fq(x.x.pend)}</span></div>`)}</div>`:''}
    ${pv.pend.length?`<div><b>Pendente diferente (apontamento)</b><div class="sub" style="font-size:12px;margin:2px 0 4px">O que foi lançado no painel e o que foi apontado no sistema não batem.</div>${lst(pv.pend,x=>`<div class="impl num"><span>${esc(x.o.num)} · ${esc(codigoDe(x.o))} · ${esc(x.o.linha||'')}</span><span>sistema ${fq(x.x.pend)} · painel ${fq(x.pp)}</span></div>`)}</div>`:''}
    <div class="sub" style="font-size:12px">${pv.atual.length} com quantidade atualizada · ${pv.ranch} com rancho informado pelo sistema · ${pv.unid} itens com unidade preenchida.</div>
   </div>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn big" data-act="o-imp-conf">${ic('check',22,2.2)}${I.gravando?'Gravando…':'Importar e conferir'}</button></div></div>`:''}
  </section>`; }
function numCsv(s){ s=String(s==null?'':s).trim().replace(/^"|"$/g,''); if(!s) return 0; if(s.includes(',')) s=s.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?0:n; }
function dataCsv(s){ s=String(s||'').trim().replace(/^"|"$/g,''); let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(m) return m[3]+'-'+m[2]+'-'+m[1]; m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[0]; return s.slice(0,10); }
function splitCsv(l,sep){ const r=[]; let c='',q=false; for(const ch of l){ if(ch==='"') q=!q; else if(ch===sep&&!q){ r.push(c); c=''; } else c+=ch; } r.push(c); return r.map(x=>x.trim().replace(/^"|"$/g,'')); }
const UM_MAP={PC:'PCT',PCT:'PCT',PT:'PCT',FD:'FD',SC:'SC',UN:'UN',UND:'UN',CX:'CX',BD:'BD',BL:'BD',KG:'KG'};
function parseOrdens(text){
  const ls=String(text||'').split(/\r?\n/).filter(l=>l.trim()); if(ls.length<2) return {erro:'Não encontrei linhas suficientes. Inclua a linha de cabeçalho.'};
  const h0=ls[0]; const sep=h0.includes('\t')?'\t':(h0.includes(';')?';':',');
  const hd=splitCsv(h0,sep).map(x=>x.toLowerCase().trim()); const ix=n=>hd.findIndex(x=>x.includes(n)); const eq=n=>hd.findIndex(x=>x===n);
  const iO=eq('ordem')>=0?eq('ordem'):ix('ordem'), iI=ix('d. item')>=0?ix('d. item'):ix('cód'), iD=ix('descri'), iF=ix('fim'), iIni=ix('inic')>=0?ix('inic'):ix('iníc'), iQ=eq('qtde.')>=0?eq('qtde.'):ix('qtde'), iP=ix('pendente'), iU=eq('um'), iR=ix('rancho'), iPl=ix('planej'), iS=ix('situa');
  if(iO<0||iQ<0) return {erro:'O cabeçalho precisa ter as colunas “Ordem” e “Qtde.”.'};
  const out=[];
  for(let i=1;i<ls.length;i++){ const c=splitCsv(ls[i],sep); const o=String(c[iO]||'').replace(/\D/g,''); if(!o) continue;
    const cod=(iI>=0?c[iI]:'').trim().toUpperCase(), des=(iD>=0?c[iD]:'').replace(/\s+/g,' ').trim();
    out.push({num:o,cod,desc:des,produto:((cod||'')+(cod&&des?' - ':'')+(des||'')).trim(),dtFim:iF>=0?dataCsv(c[iF]):'',dtIni:iIni>=0?dataCsv(c[iIni]):'',total:numCsv(c[iQ]),pend:iP>=0?numCsv(c[iP]):null,
      um:iU>=0?String(c[iU]||'').trim().toUpperCase():'',rancho:iR>=0?String(c[iR]||'').replace(/\D/g,''):'',plan:iPl>=0?String(c[iPl]||'').trim():'',sit:iS>=0?String(c[iS]||'').trim():''}); }
  if(!out.length) return {erro:'Nenhuma ordem encontrada. Confira se o arquivo é o de ordens liberadas.'};
  return {ordens:out};
}
function previaImp(){ const I=S.imp; I.erro=null; I.prev=null; const r=parseOrdens(I.texto); if(r.erro){ I.erro=r.erro; return; }
  const porNum={}, porEns={}; S.ordens.forEach(o=>{ const k=String(o.num); if(!porNum[k]||(o.status==='aberta'&&porNum[k].status!=='aberta')) porNum[k]=o; if(o.ensaca) porEns[String(o.ensaca)]=o; });
  const csv={}; r.ordens.forEach(x=>{ if(!csv[x.num]) csv[x.num]=x; }); const nums=Object.keys(csv);
  const ignCods=new Set(S.ordens.filter(o=>o.status==='ignorada').map(o=>codigoDe(o)));
  const ehEnsaca=x=>/^ENSACADO/i.test(x.desc)&&!x.plan;
  const novas=[], atual=[], sync=[], reab=[], pend=[]; let ranch=0; const unidSet=new Set();
  nums.forEach(n=>{ const x=csv[n]; const o=porNum[n]||porEns[n];
    const um=UM_MAP[x.um]; const it=itemDe(x.cod); if(um&&it&&!it.unidade) unidSet.add(x.cod);
    if(!o){ const nv=Object.assign({},x); if(ignCods.has(x.cod)) nv.ign=true;
      if(ehEnsaca(x)&&x.rancho){ const par=nums.map(k=>csv[k]).find(y=>y.num!==n&&y.rancho===x.rancho&&!ehEnsaca(y))||null; const pp=par?(porNum[par.num]||null):null; if(par) nv.vinc=par.num; }
      novas.push(nv); return; }
    if(porEns[n]&&!porNum[n]) return;
    const u={}; if(Math.abs((+o.total||0)-x.total)>0.001&&x.total>0){ atual.push({o,total:x.total,x}); }
    if(x.rancho&&!o.rancho){ ranch++; }
    sync.push({o,x});
    if(o.status==='encerrada'||o.status==='cancelada') reab.push({o,x});
    else if(o.status==='aberta'&&o.linha&&x.pend!=null){ const pp=Math.max(0,o.total-entregueDe(o)); if(Math.abs(pp-x.pend)>=1) pend.push({o,x,pp}); } });
  const set=new Set(nums); const fora=S.ordens.filter(o=>o.status==='aberta'&&!set.has(String(o.num)));
  I.prev={total:nums.length,nums,novas,atual,sync,fora,reab,pend,ranch,unid:unidSet.size}; }
async function gravarImp(){ const I=S.imp, pv=I.prev; if(!pv||I.gravando) return; if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
  I.gravando=true; render(); const agora=new Date().toISOString(); let falhas=0;
  for(const x of pv.novas){ try{ const d={num:x.num,produto:x.produto,linha:null,data:null,turno:'Dia todo',total:x.total,status:x.vinc?'vinculada':x.ign?'ignorada':'aberta',origem:'csv',dtFim:x.dtFim||null,dtIni:x.dtIni||null,criadaEm:agora,importadoEm:agora,sisEm:agora,por:S.uid};
      if(x.pend!=null) d.pendSistema=x.pend; if(x.rancho) d.rancho=x.rancho; if(x.plan) d.planejador=x.plan; if(x.vinc){ d.vinculadaA=x.vinc; d.hist=[{em:agora,por:S.uid,o:'Ligada como ensaca da ordem '+x.vinc+' (mesmo rancho, importação)'}]; } if(x.ign) d.hist=[{em:agora,por:S.uid,o:'Não é de linha (mesmo item já marcado antes)'}];
      await S.db.doc('ordens/'+x.num).set(d);
      if(x.vinc){ const m=S.ordens.find(o=>String(o.num)===x.vinc&&!o.ensaca); if(m) await S.db.doc('ordens/'+m._id).update({ensaca:x.num,hist:histAdd(m,'Ordem de ensaca '+x.num+' (importação)')}); }
    }catch(e){ falhas++; } }
  for(const {o,x} of pv.sync){ try{ const u={pendSistema:x.pend,sisEm:agora,importadoEm:agora}; if(x.dtFim) u.dtFim=x.dtFim; if(x.dtIni) u.dtIni=x.dtIni; if(x.plan) u.planejador=x.plan;
      const mud=[]; if(Math.abs((+o.total||0)-x.total)>0.001&&x.total>0){ u.total=x.total; mud.push('qtde total '+fq(o.total)+' → '+fq(x.total)); }
      if(x.rancho&&!o.rancho){ u.rancho=x.rancho; mud.push('rancho '+x.rancho); }
      if(mud.length) u.hist=histAdd(o,mud.join(', ')+' (importação)');
      await S.db.doc('ordens/'+o._id).update(u); }catch(e){ falhas++; } }
  const us={}; const rows=(parseOrdens(I.texto).ordens||[]);
  for(const n of pv.nums){ const x=rows.find(y=>y.num===n); const um=x&&UM_MAP[x.um]; const it=x&&itemDe(x.cod); if(um&&it&&!it.unidade&&!us[x.cod]){ us[x.cod]=1; try{ await S.db.doc('itens/'+it._id).update({unidade:um}); it.unidade=um; }catch(e){} } }
  try{ await S.db.doc('sistema/importacao').set({em:agora,por:S.uid,arquivo:I.nome||'colado',nums:pv.nums,total:pv.total}); }catch(e){ falhas++; }
  I.gravando=false; toast(`Importado: ${pv.novas.length} nova${pv.novas.length===1?'':'s'}, ${pv.fora.length} fora do sistema, ${pv.reab.length} encerrada${pv.reab.length===1?'':'s'} no painel mas aberta${pv.reab.length===1?'':'s'} no sistema${falhas?` · ${falhas} com erro`:''}.`);
  if(!falhas){ S.imp={aberto:false,texto:'',prev:null}; S.ord.div=true; } render(); }
// ---------- divergências com o sistema (última importação) ----------
function divergencias(){ const si=S.sisImp; if(!si||!si.nums) return null; const set=new Set(si.nums.map(String));
  const abertasNum=new Set(S.ordens.filter(o=>o.status==='aberta').map(o=>String(o.num)));
  const fora=S.ordens.filter(o=>o.status==='aberta'&&!set.has(String(o.num))&&(o.criadaEm||'')<=si.em);
  const reab=S.ordens.filter(o=>(o.status==='encerrada'||o.status==='cancelada')&&set.has(String(o.num))&&!abertasNum.has(String(o.num))&&(!o.fimEm||o.fimEm<si.em));
  /* só compara o que já tinha sido lançado até a hora da importação: o que foi apontado depois ainda não podia estar no arquivo */
  const pend=S.ordens.filter(o=>o.status==='aberta'&&o.linha&&set.has(String(o.num))&&o.pendSistema!=null&&Math.abs(Math.max(0,o.total-entregueAte(o,si.em))-o.pendSistema)>=1&&Math.abs(Math.max(0,o.total-entregueDe(o))-o.pendSistema)>=1&&!(o.divOk!=null&&+o.divOk===+o.pendSistema));
  return {fora,reab,pend,em:si.em,n:fora.length+reab.length}; }
function divTag(o){ const d=S._div; if(!d) return ''; if(d.fora.includes(o)) return '<span class="pill warn" title="Aberta no painel, mas não veio na última importação do sistema">fora do sistema</span>';
  if(d.reab.includes(o)) return '<span class="pill crit" title="Encerrada no painel, mas ainda aberta no sistema">aberta no sistema</span>';
  if(d.pend.includes(o)) return `<span class="pill warn" title="Pendente no sistema: ${fq(o.pendSistema)}">sistema: ${fq(o.pendSistema)}</span>`; return ''; }
function divPainel(){ const d=S._div; const imp=`<button class="lnk" data-act="o-imp-abrir">${ic('baixar',14,2)} Importar ordens</button>`;
  if(!d) return `<div class="divbar ok"><div class="divh"><span class="num"><span class="divd">Nenhuma importação do sistema ainda.</span></span>${imp}</div></div>`;
  const tot=d.fora.length+d.reab.length+d.pend.length;
  if(!tot) return `<div class="divbar ok"><div class="divh"><span class="divic">${ic('check',11,3)}</span><span class="num"><span class="divd">Painel igual ao sistema na última importação (${esc(dm(hojeStr(new Date(d.em))))} ${hora(d.em)}).</span></span>${imp}</div></div>`;
  const row=(o,extra)=>`<div class="impl num" data-act="o-div-ir" data-id="${esc(o._id)}" role="button" tabindex="0" style="cursor:pointer"><span><b>${esc(o.num)}</b> · ${esc(codigoDe(o))} · ${esc(o.linha||'fila')}</span><span>${extra}</span></div>`;
  const pt=[d.fora.length?`<b>${d.fora.length}</b> fora do sistema`:'',d.reab.length?`<b>${d.reab.length}</b> encerrada${d.reab.length===1?'':'s'} aqui e aberta${d.reab.length===1?'':'s'} lá`:'',d.pend.length?`<b>${d.pend.length}</b> com pendente diferente`:''].filter(Boolean).join(' · ');
  const hrs=(Date.now()-new Date(d.em).getTime())/36e5, idade=hrs<1?'há menos de 1 h':hrs<24?'há '+Math.floor(hrs)+' h':'há '+Math.floor(hrs/24)+' dia'+(Math.floor(hrs/24)===1?'':'s'), velha=hrs>=4;
  return `<div class="divbar ${velha?'velha':''} ${S.ord.div?'on':''}"><div class="divh"><span class="divic">!</span><span class="num"><span class="divt">Conferência com a última importação</span> <span class="divd">(${esc(dm(hojeStr(new Date(d.em))))} ${hora(d.em)} · ${idade})</span>: ${pt}${velha?' <span class="divd">· pode ser só falta de importar de novo</span>':''}</span><button class="lnk" data-act="o-imp-abrir">${ic('baixar',14,2)} Importar ordens</button><button class="lnk" data-act="o-div">${S.ord.div?'Fechar':'Ver'}</button></div>
   ${S.ord.div?`<div class="sub" style="font-size:12px;margin:6px 0 0">O painel não é ligado ao sistema: esta conferência usa o arquivo importado ${idade}. O que foi apontado aqui depois disso não conta como diferença. Se o sistema já foi atualizado, importe de novo para conferir.</div>`:''}
   ${S.ord.div?`<div class="impgr divlist">
    ${d.fora.length?`<div><b style="color:var(--crit-ink)">${d.fora.length} aberta${d.fora.length===1?'':'s'} no painel, fora do sistema</b> <span class="sub" style="font-size:12px">· clique para abrir e encerrar</span>${d.fora.map(o=>row(o,'pendente painel '+fq(Math.max(0,o.total-entregueDe(o))))).join('')}</div>`:''}
    ${d.reab.length?`<div><b style="color:var(--crit-ink)">${d.reab.length} encerrada${d.reab.length===1?'':'s'} no painel, aberta${d.reab.length===1?'':'s'} no sistema</b> <span class="sub" style="font-size:12px">· encerre no sistema ou reabra aqui</span>${d.reab.map(o=>row(o,esc(stInfo(o,entregueDe(o)).t.toLowerCase())+' · sistema '+fq(o.pendSistema||0))).join('')}</div>`:''}
    ${d.pend.length?`<div><b>${d.pend.length} com pendente diferente</b> <span class="sub" style="font-size:12px">· painel × sistema</span>${d.pend.map(o=>{ const dep=entregueDe(o)-entregueAte(o,d.em); return row(o,'sistema '+fq(o.pendSistema)+' · painel '+fq(Math.max(0,o.total-entregueAte(o,d.em)))+(dep>0?' <small>(+'+fq(dep)+' lançado depois)</small>':'')+` <button class="dbb" data-act="o-div-ok" data-id="${esc(o._id)}" title="Já conferi / já arrumei: tirar da lista">✓ Arrumei</button>`); }).join('')}</div>`:''}
   </div>`:''}</div>`; }
// ---------- tela: A programar ----------
function prevAtivas(){ return (S.previsoes||[]).filter(p=>p.status==='prevista').map(p=>{ p._pv=true; return p; }).sort((a,b)=>String(a.data||'').localeCompare(String(b.data||''))||linhasOrd().indexOf(a.linha)-linhasOrd().indexOf(b.linha)); }
function prevCandidatas(p){ return S.ordens.filter(o=>o.status==='aberta'&&codigoDe(o)===p.codigo&&!(S.previsoes||[]).some(x=>x.status==='confirmada'&&String(x.ordem)===String(o.num))).sort((a,b)=>(a.linha?1:0)-(b.linha?1:0)||String(b.num).localeCompare(String(a.num))).slice(0,3); }
function prevForm(){ const f=S.pv.f, L=linhasOrd(); const its=itensAtivos();
  return `<section class="card" style="border:1.5px solid var(--teal)"><div class="head" style="align-items:baseline"><div class="label">${f._id?'EDITAR PREVISÃO':'NOVA PREVISÃO'}</div><button class="lnk" data-act="pv-cancelar">Cancelar</button></div>
   <div class="ed-grid" style="grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)">
    <label><span class="sub">Produto</span><input class="txt" id="pv-prod" list="pv-itens" value="${esc(f.produto||'')}" placeholder="Código ou nome do produto" autocomplete="off"><datalist id="pv-itens">${its.map(i=>`<option value="${esc(i.codigo+' - '+(i.descricao||''))}"></option>`).join('')}</datalist></label>
    <label><span class="sub">Quantidade</span><input class="txt num" id="pv-qtd" inputmode="decimal" value="${esc(f.qtd!=null?String(f.qtd):'')}" placeholder="0"></label>
    <label><span class="sub">Linha</span><select class="txt" id="pv-linha">${L.map(l=>`<option ${f.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
    <label><span class="sub">Dia previsto</span><input type="date" class="txt" id="pv-data" value="${esc(f.data||hojeStr())}"></label>
   </div>
   <label style="display:flex;flex-direction:column;gap:4px;margin-top:10px"><span class="sub" style="margin:0;font-size:12px">Observação (opcional)</span><input class="txt" id="pv-obs" value="${esc(f.obs||'')}" placeholder="Ex.: aguardando pedido do cliente, depende de matéria-prima…"></label>
   <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-act="pv-salvar">${ic('check',18,2.2)}${f._id?'Salvar alterações':'Salvar previsão'}</button></div></section>`; }
function prevRow(p){ const c=S.pv.conf[p._id], cands=prevCandidatas(p), atr=p.data&&p.data<hojeStr();
  return `<div class="pvrow">
   <div class="pvd num"><b>${esc(dm(p.data))}</b><small>${esc(p.linha||'')}</small></div>
   <div class="op" style="min-width:0"><b>${esc(nomeCurto({produto:p.produto})||p.produto)}</b><small class="num">${esc(p.codigo||'')} · ${f0(p.qtd||0)} previstos${atr?' · <span style="color:var(--crit-ink)">dia já passou</span>':''}${p.obs?' · '+esc(p.obs):''}</small>
    ${cands.length&&c==null?`<div class="pvcand">${ic('check',13,2.4)} Chegou do sistema: ${cands.map(o=>`<button class="lnk" data-act="pv-usar" data-id="${esc(p._id)}" data-v="${esc(o.num)}">Ordem ${esc(o.num)}${o.linha?' (já na '+esc(o.linha)+')':''} · ${f0(o.total)}</button>`).join(' · ')}</div>`:''}</div>
   <span class="pill dash">Sem número</span>
   <div class="pvact">${c!=null?`<input class="txt num" data-pv-num="${esc(p._id)}" value="${esc(c)}" placeholder="Nº da ordem" inputmode="numeric" style="width:130px;height:38px">${precisaEns(p.produto)?`<input class="txt num" data-pv-ens="${esc(p._id)}" placeholder="Nº do ensacado" title="Obrigatório para rejunte flexível/siliconizado" inputmode="numeric" style="width:140px;height:38px;border-color:var(--warn)">`:''}<button class="btn" data-act="pv-confirmar" data-id="${esc(p._id)}" style="height:38px;padding:0 14px">Confirmar</button><button class="lnk" data-act="pv-conf-x" data-id="${esc(p._id)}" style="color:var(--muted)">Voltar</button>`
     :`<button class="btn sec" data-act="pv-conf" data-id="${esc(p._id)}" style="height:38px;padding:0 14px">Confirmar ordem</button><button class="lnk" data-act="pv-editar" data-id="${esc(p._id)}">Editar</button><button class="lnk" data-act="pv-copiar" data-id="${esc(p._id)}">Copiar</button><button class="lnk" data-act="pv-excluir" data-id="${esc(p._id)}" style="color:var(--crit-ink)">Excluir</button>`}</div>
  </div>`; }
function vAProgramar(){ const ps=prevAtivas(); const conf=(S.previsoes||[]).filter(p=>p.status==='confirmada').sort((a,b)=>String(b.confEm||'').localeCompare(String(a.confEm||''))).slice(0,8);
  const tot=ps.reduce((a,p)=>a+(+p.qtd||0),0);
  return `${banner()}
  <div class="head"><div><div class="eyebrow">PRODUÇÃO</div><h1>Previsão</h1><div class="sub">Programação prévia: ordens que ainda não têm número e não estão confirmadas. Quando a ordem sair no sistema, confirme com o número e ela entra na programação.</div></div>
   <button class="btn" data-act="pv-nova">${ic('mais',20,2.2)}Nova previsão</button></div>
  ${S.pv.f?prevForm():''}
  <section class="card" style="padding:12px 18px">
   <div class="head" style="align-items:baseline;margin-bottom:4px"><div class="label">PREVISTAS (${ps.length})${ps.length?` · ${f0(tot)} no total`:''}</div><span class="sub" style="margin:0;font-size:12px">Também aparecem tracejadas no Calendário.</span></div>
   ${ps.length?ps.map(prevRow).join(''):`<div class="empty" style="padding:18px">Nenhuma previsão. Use <b>Nova previsão</b> para programar uma ordem que ainda não tem número.</div>`}
   ${conf.length?`<details style="margin-top:8px"><summary class="sub" style="cursor:pointer;font-size:12px">Confirmadas recentemente (${conf.length})</summary>${conf.map(p=>`<div class="impl num"><span>${esc(p.codigo||'')} · ${esc(nomeCurto({produto:p.produto}))} · ${esc(p.linha||'')} ${esc(dm(p.data))}</span><span>virou Ordem ${esc(p.ordem)}</span></div>`).join('')}</details>`:''}
  </section>
  ${filaImport()}`; }
function filaImport(emProg){ const xs=aProgramar(), ign=S.ordens.filter(o=>o.status==='ignorada'), L=linhasOrd(), F=S.ord.pf;
  return `
  ${emProg?'':`<div class="head" style="margin-top:8px"><div><div class="label">VINDAS DA IMPORTAÇÃO, SEM LINHA (${xs.length})</div><div class="sub" style="font-size:13px">Ordens liberadas no sistema que ainda não foram colocadas em nenhuma linha.</div></div><button class="btn sec" data-act="o-imp-abrir2" style="height:40px">${ic('baixar',16,2)}Importar ordens</button></div>
  ${S.imp.aberto?impPainel():''}`}
  <section class="card ord-card" style="padding:6px 18px 10px">
  ${xs.length?xs.map(o=>{ const it=itemDe(codigoDe(o)); if(!F[o._id]&&it&&(it.linhas||[]).length===1) F[o._id]={linha:it.linhas[0]}; const f=F[o._id]||{}; return `<div class="prow">
    <span class="op"><b>${esc(nomeCurto(o))||'Produto não informado'}</b><small class="num">${esc(codigoDe(o))} · Ordem ${esc(o.num)} · ${f0(o.total)}${o.dtFim?' · fim '+dm(o.dtFim):''}${it&&(it.linhas||[]).length?' · roda em '+esc(it.linhas.join(', ')):(it?'':' · item sem cadastro')}</small></span>
    <select class="txt" data-pf="linha" data-id="${esc(o._id)}" aria-label="Linha"><option value="">Linha…</option>${L.map(l=>`<option ${f.linha===l?'selected':''}>${esc(l)}</option>`).join('')}</select>
    <input type="date" class="txt" data-pf="data" data-id="${esc(o._id)}" value="${esc(f.data||(o.dtIni&&o.dtIni>hojeStr()?o.dtIni:hojeStr()))}" aria-label="Data">
    <div style="display:flex;gap:8px;align-items:center"><button class="btn" data-act="o-programar" data-id="${esc(o._id)}" style="height:42px">Programar</button><button class="lnk" data-act="o-ignorar" data-id="${esc(o._id)}" style="color:var(--muted)">Não é de linha</button></div>
   </div>`; }).join(''):'<div class="empty" style="padding:16px">Nenhuma ordem importada esperando linha.</div>'}
  </section>
  ${ign.length?`<section class="card"><div class="label">MARCADAS COMO “NÃO É DE LINHA” (${ign.length})</div><div class="sub" style="margin-bottom:6px">Premix, aditivos e outras que não entram na programação. Não voltam na próxima importação.</div>
   ${ign.slice(0,60).map(o=>`<div class="row" style="grid-template-columns:minmax(0,1fr) auto"><span class="num">${esc(o.num)} · ${esc(o.produto)}</span><button class="lnk" data-act="o-designorar" data-id="${esc(o._id)}">Voltar para a fila</button></div>`).join('')}</section>`:''}`; }

document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act^="pv-"]'); if(!b||b.disabled) return; const act=b.dataset.act, P=S.pv;
  const pv=id=>(S.previsoes||[]).find(x=>x._id===id);
  const lerForm=()=>{ const g=id=>{ const e=$('#'+id); return e?e.value:''; }; Object.assign(P.f,{produto:g('pv-prod'),qtd:g('pv-qtd'),linha:g('pv-linha'),data:g('pv-data'),obs:g('pv-obs')}); };
  if(act==='pv-copiar'){ const p=pv(b.dataset.id); if(!p) return; let d=addDias(p.data||hojeStr(),1); for(let i=0;i<7;i++){ const w=new Date(d+'T12:00:00').getDay(); if(w!==0&&w!==6) break; d=addDias(d,1); }
    P.f={produto:p.produto,qtd:String(p.qtd||''),linha:p.linha,data:d,obs:p.obs||''}; render(); toast('Cópia pronta: ajuste o dia, a linha ou a quantidade e salve.'); setTimeout(()=>{ const e=$('#pv-data'); if(e){ e.scrollIntoView({block:'center',behavior:'smooth'}); e.focus({preventScroll:true}); } },50); return; }
  if(act==='pv-nova-cal'){ P.f={linha:b.dataset.l,data:b.dataset.d}; render(); setTimeout(()=>{ const e=$('#pv-prod'); if(e){ e.scrollIntoView({block:'center',behavior:'smooth'}); e.focus({preventScroll:true}); } },50); return; }
  if(act==='pv-nova'){ P.f={linha:linhasOrd()[0],data:addDias(hojeStr(),1)}; render(); const e=$('#pv-prod'); e&&e.focus(); return; }
  if(act==='pv-cancelar'){ P.f=null; render(); return; }
  if(act==='pv-editar'){ const p=pv(b.dataset.id); if(!p) return; P.f={_id:p._id,produto:p.produto,qtd:p.qtd!=null?String(p.qtd).replace('.',','):'',linha:p.linha,data:p.data,obs:p.obs||''}; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(act==='pv-salvar'){ lerForm(); const f=P.f; const prod=String(f.produto||'').trim().replace(/\s+/g,' '); const qtd=numQ(f.qtd);
    if(!prod){ toast('Informe o produto.'); return; } if(!(qtd>0)){ toast('Informe a quantidade.'); return; } if(!f.data){ toast('Informe o dia previsto.'); return; }
    if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    const d={produto:prod,codigo:codigoDe({produto:prod}),qtd,linha:f.linha,data:f.data,obs:String(f.obs||'').trim()};
    if(P.salvando) return; P.salvando=true; b.disabled=true; b.textContent='Salvando…';
    try{ if(f._id) await S.db.doc('previsoes/'+f._id).update(Object.assign(d,{editEm:new Date().toISOString(),editPor:S.uid}));
      else await S.db.collection('previsoes').add(Object.assign(d,{status:'prevista',criadoEm:new Date().toISOString(),por:S.uid}));
      toast(f._id?'Previsão atualizada.':'Previsão salva · '+d.linha+' · '+dmTxt(d.data)); P.f=null; P.salvando=false; render(); }catch(e){ P.salvando=false; b.disabled=false; b.textContent='Salvar previsão'; erro(e); } return; }
  if(act==='pv-excluir'){ const p=pv(b.dataset.id); if(!p) return; if(P.del!==p._id){ P.del=p._id; b.textContent='Confirmar exclusão'; b.style.fontWeight='800'; return; } P.del=null;
    try{ await S.db.doc('previsoes/'+p._id).update({status:'excluida',exclEm:new Date().toISOString(),exclPor:S.uid}); toast('Previsão excluída.'); }catch(e){ erro(e); } return; }
  if(act==='pv-conf'){ P.conf[b.dataset.id]=''; render(); const e=document.querySelector(`[data-pv-num="${CSS.escape(b.dataset.id)}"]`); e&&e.focus(); return; }
  if(act==='pv-conf-x'){ delete P.conf[b.dataset.id]; render(); return; }
  if(act==='pv-usar'){ P.conf[b.dataset.id]=b.dataset.v; render(); return; }
  if(act==='pv-confirmar'){ const p=pv(b.dataset.id); if(!p) return; const e=document.querySelector(`[data-pv-num="${CSS.escape(p._id)}"]`); const num=String(e?e.value:P.conf[p._id]||'').replace(/\D/g,'');
    if(!num){ toast('Informe o número da ordem.'); e&&e.focus(); return; } if(!S.db){ toast('Sem conexão com o armazenamento.'); return; }
    const eE=document.querySelector(`[data-pv-ens="${CSS.escape(p._id)}"]`); const ens=String(eE?eE.value:'').replace(/\D/g,'');
    if(precisaEns(p.produto)&&!ens){ toast('Rejunte flexível ou siliconizado: informe também a ordem de ensacado.'); eE&&eE.focus(); return; }
    const ex=S.ordens.find(o=>String(o.num)===num&&(o.status==='aberta'||o.status==='ignorada'));
    try{ let msg;
      if(ex&&ex.linha&&ex.status==='aberta'){ msg='Ordem '+num+' já estava programada na '+ex.linha+' · '+dmTxt(dataEf(ex))+'. Previsão confirmada.'; }
      else if(ex){ await S.db.doc('ordens/'+ex._id).update({linha:p.linha,data:p.data,turno:ex.turno||'Dia todo',status:'aberta',continuaEm:null,...(ens?{ensaca:ens}:{}),hist:histAdd(ex,'Programada pela previsão na '+p.linha+' para '+dm(p.data))}); msg='Ordem '+num+' programada na '+p.linha+' · '+dmTxt(p.data)+'.'; }
      else { await S.db.collection('ordens').add({num,produto:p.produto,linha:p.linha,data:p.data,turno:'Dia todo',total:p.qtd,status:'aberta',origem:'previsao',...(ens?{ensaca:ens}:{}),criadaEm:new Date().toISOString(),por:S.uid,hist:[{em:new Date().toISOString(),por:S.uid,o:'Criada a partir da previsão'}]}); msg='Ordem '+num+' criada na '+p.linha+' · '+dmTxt(p.data)+'.'; }
      if(ens){ if(ex&&ex.linha&&ex.status==='aberta'&&!ex.ensaca) await S.db.doc('ordens/'+ex._id).update({ensaca:ens,hist:histAdd(ex,'Ordem de ensacado '+ens)}); await vincularEnsaca(ens,num); }
      await S.db.doc('previsoes/'+p._id).update({status:'confirmada',ordem:num,confEm:new Date().toISOString(),confPor:S.uid}); delete P.conf[p._id]; toast(msg); }catch(err){ erro(err); } return; }
});
document.addEventListener('input',ev=>{ const t=ev.target; if(t.dataset&&t.dataset.pvNum!=null){ S.pv.conf[t.dataset.pvNum]=t.value; } });
document.addEventListener('keydown',ev=>{ const t=ev.target; if(ev.key==='Enter'&&t.dataset&&t.dataset.pvNum!=null){ ev.preventDefault(); const b=document.querySelector(`[data-act="pv-confirmar"][data-id="${CSS.escape(t.dataset.pvNum)}"]`); b&&b.click(); } });

/* arrastar linhas da Programação para mudar a prioridade (e, se soltar em outro dia/linha, mover) */
document.addEventListener('dragstart',ev=>{ const r=ev.target.closest&&ev.target.closest('.orow[data-orow]'); if(!r) return; S.ord.drag={id:r.dataset.orow,l:r.dataset.ol,d:r.dataset.od}; try{ ev.dataTransfer.setData('text/plain',r.dataset.orow); ev.dataTransfer.effectAllowed='move'; }catch(e){} r.classList.add('arrastando'); });