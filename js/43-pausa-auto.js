/* Painel Colafix · 43-pausa-auto.js (23/10) — pausa AUTOMÁTICA da ordem pelos Turnos (pedido: "tem que ser prático para o dia a dia,
   levar em consideração quando param para ir embora").
   Pelo turno da linha (config/geral.turnos: ini, fim, intv em min, almIni = hora que começa o almoço, dias, linhas; feriado não tem expediente):
   - ordem rodando no começo do almoço → pausa sozinha ("Almoço"); no fim do almoço → volta a rodar sozinha;
   - ordem rodando no fim do expediente → pausa sozinha ("Fim do expediente"); no começo do próximo dia de trabalho → volta a rodar.
   Só mexe no que foi pausado automaticamente (auto:true); pausa feita pelo operador fica como ele deixou.
   As horas vêm da escala (não do relógio de quem grava), então dois computadores calculam a mesma coisa: pode rodar no posto e na administradora.
   Se o computador ficou desligado, recupera ao ligar (pausa na hora certa, no passado). Desliga com config/geral.otAutoPausa=false. */
"use strict";
function otAutoOn(){ return !(S.cfg&&S.cfg.otAutoPausa===false); }
function otDiaStr(t){ const x=new Date(t); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate()); }
/* trechos de trabalho do dia d na linha l: [{a,b,alm}] em ms (alm = começa depois do almoço) */
function otTrechos(l,d){ let fer=false; try{ fer=!!(typeof feriadoDe==='function'&&feriadoDe(d)); }catch(e){} if(fer) return [];
  const wd=new Date(d+'T12:00:00').getDay(), z=new Date(d+'T00:00:00').getTime(), out=[];
  (typeof gxTurnos==='function'?gxTurnos():[]).filter(t=>(t.dias||[]).includes(wd)&&(!(t.linhas||[]).length||t.linhas.includes(l))).forEach(t=>{
    const s=horaMin(t.ini); let e=horaMin(t.fim); if(s==null||e==null) return; if(e<=s) e+=1440; const iv=+t.intv||0;
    if(iv>0){ let a=horaMin(t.almIni); if(a==null||a<s||a+iv>e){ a=horaMin('11:30'); if(a<s||a+iv>e) a=s+Math.round((e-s-iv)/2); }
      out.push({a:z+s*6e4,b:z+a*6e4,alm:false},{a:z+(a+iv)*6e4,b:z+e*6e4,alm:true}); }
    else out.push({a:z+s*6e4,b:z+e*6e4,alm:false}); });
  return out; }
/* intervalos sem trabalho (pausas) entre de e ate: [{a,b,mot}] */
function otPausasEscala(l,de,ate){ const tr=[]; let d=otDiaStr(de-2*864e5); const fim=ate+12*864e5;
  for(let i=0;i<40&&new Date(d+'T00:00:00').getTime()<=fim;i++){ tr.push(...otTrechos(l,d)); const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+1); d=otDiaStr(x.getTime()); }
  tr.sort((x,y)=>x.a-y.a); const m=[]; tr.forEach(t=>{ const u=m[m.length-1]; if(u&&t.a<=u.b){ if(t.b>u.b) u.b=t.b; } else m.push(Object.assign({},t)); });
  const ps=[]; for(let i=0;i+1<m.length;i++){ const a=m[i].b, b=m[i+1].a; if(b>a) ps.push({a,b,mot:m[i+1].alm&&b-a<6*36e5?'Almoço':'Fim do expediente'}); }
  return ps.filter(p=>p.b>de-864e5&&p.a<ate+864e5); }
/* novos segmentos da ordem seguindo a escala (null = nada a mudar) */
function otAutoSegs(o,agora){ if(!o||(o.status&&o.status!=='aberta')) return null; const ss=otSegs(o); if(!ss.length) return null;
  const l=o.linha; if(!l) return null; let segs=ss.map(x=>Object.assign({},x)), mudou=false;
  for(let k=0;k<30;k++){ const u=segs[segs.length-1];
    if(!u.fim){ const ini=new Date(u.ini).getTime(); const p=otPausasEscala(l,ini,agora).find(x=>x.a>ini&&x.a<=agora); if(!p) break;
      u.fim=new Date(p.a).toISOString(); u.fimPor='Automático (turno)'; u.pausa=p.mot; u.auto=true; u.motivo='pausa automática: '+p.mot; mudou=true; continue; }
    if(u.pausa&&u.auto&&!u.encerrada){ const f=new Date(u.fim).getTime(); const p=otPausasEscala(l,f-6e4,agora).find(x=>Math.abs(x.a-f)<6e4); if(!p||p.b>agora) break;
      if((S.ordens||[]).some(x=>x.linha===l&&x._id!==o._id&&otSegs(x).some(s=>new Date(s.ini).getTime()>=f))){ u.encerrada=true; u.motivo+=' · outra ordem começou'; mudou=true; break; }
      segs.push({ini:new Date(p.b).toISOString(),por:'Automático (turno)',volta:true,auto:true}); mudou=true; continue; }
    break; }
  return mudou?segs:null; }
let _otAutoOcup=false;
async function otAutoRoda(){ if(_otAutoOcup||!S.db||!S.acs||!S.acs.pronto||!otAutoOn()) return; let quem=false, L=null;
  try{ if(typeof poOn==='function'&&poOn()&&!(typeof nxOn==='function'&&nxOn())){ quem=true; L=ttLinhas(); } else if(S.acs.dono) quem=true; }catch(e){}
  if(!quem) return; _otAutoOcup=true; const agora=Date.now();
  try{ for(const o of (S.ordens||[]).filter(x=>(!x.status||x.status==='aberta')&&Array.isArray(x.prodSeg)&&x.prodSeg.length&&(!L||L.includes(x.linha)))){ const ns=otAutoSegs(o,agora); if(ns){ try{ await otGrava(o,ns); }catch(e){ console.warn('[pausa automática]',e); } } } }
  finally{ _otAutoOcup=false; } }
setInterval(()=>{ otAutoRoda().then(()=>{ try{ if(typeof ttAtivo==='function'&&ttAtivo()) rerenderSeguro(); }catch(e){} }); },30000);
setTimeout(()=>otAutoRoda(),6000);
/* o que vem a seguir na escala (para mostrar no posto) */
function otProxEscala(l){ const ag=Date.now(), ps=otPausasEscala(l,ag,ag+3*864e5); const p=ps.find(x=>x.b>ag); if(!p) return ''; const hm=t=>hora(new Date(t).toISOString());
  return p.a<=ag?(p.mot==='Almoço'?'almoço até '+hm(p.b):'fora do expediente · volta '+(otDiaStr(p.b)===otDiaStr(ag+864e5)?'amanhã ':otDiaStr(p.b)===otDiaStr(ag)?'':dm(otDiaStr(p.b))+' ')+'às '+hm(p.b))
    :(p.mot==='Almoço'?'almoço '+hm(p.a)+'–'+hm(p.b):'fim do expediente '+hm(p.a)); }
{ const _ot=otTela; otTela=function(){ let h=_ot.apply(this,arguments); if(!otAutoOn()) return h;
  const t=ttLinhas().map(l=>{ const x=otProxEscala(l); return x?l+': '+x:''; }).filter(Boolean).join(' · ');
  return h.replace('<p class="ot-dica">',`<p class="ot-dica ot-auto"><b>Pausa automática pelo turno:</b> a ordem para sozinha no almoço e no fim do expediente e volta sozinha depois.${t?' Próximo: '+esc(t)+'.':''} Se pararam antes ou voltaram depois, use os botões.</p><p class="ot-dica">`); }; }
/* espera do posto: deixa claro quando foi a pausa automática */
{ const _e=poEstLinha; poEstLinha=function(l){ const e=_e.apply(this,arguments); try{ const p=otPausadaNaLinha(l), u=p&&otPausada(p); if(u&&u.auto&&e&&e.c==='warn'){ const x=otProxEscala(l); e.s=e.s+(x?' · '+x:'')+' · volta sozinha'; } }catch(er){} return e; }; }
document.head.insertAdjacentHTML('beforeend','<style id="ota-css">.ot-dica.ot-auto{background:rgba(63,111,147,.12);border-radius:12px;padding:10px 14px;opacity:1}</style>');
