/* Painel Colafix · 67-focco-fila.js — arquivos do Focco que chegam pelo robô (robo-focco, pasta C:\FoccoExport).
   O robô só leva o arquivo ("envelope") para pcpfila/{id} (+ pcpfila/{id}/partes/{n} em base64); quem tem a Análise PCP
   com o painel aberto abre o envelope com a MESMA leitura e a MESMA gravação de "Base de dados" (anlLerArquivos + anlGravar). */
"use strict";
const FF={on:false,fila:[],ocupado:false,ult:[]};
function ffPode(){ try{ return !!(S.db&&S.uid&&viewOk('anlbase')&&!(typeof soVer==='function'&&soVer())); }catch(e){ return false; } }
function ffIniciar(){ if(FF.on||!ffPode()) return; FF.on=true;
  S.db.collection('pcpfila').where('status','==','pendente').onSnapshot(q=>{ FF.fila=q.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>String(a.em||'').localeCompare(String(b.em||''))); ffProximo(); },()=>{});
  S.db.collection('pcpfila').orderBy('em','desc').limit(5).onSnapshot(q=>{ FF.ult=q.docs.map(d=>Object.assign({_id:d.id},d.data())); if(S.view==='anlbase') rerenderSeguro(); },()=>{}); }
setInterval(ffIniciar,3000);
function ffEmpDoNome(n){ const m=String(n||'').match(/(?:empresa|emp|filial|^|[^a-z0-9])e?\s*[-_.]?\s*0*(1|9)(?![0-9])/i); const t=String(n||'').toLowerCase(); if(/empresa\s*[-_]?\s*0*9|emp\s*[-_]?\s*0*9|(^|[^a-z0-9])e0*9([^0-9]|$)/.test(t)) return '9'; if(/empresa\s*[-_]?\s*0*1(?![0-9])|emp\s*[-_]?\s*0*1(?![0-9])|(^|[^a-z0-9])e0*1([^0-9]|$)/.test(t)) return '1'; return null; }
async function ffProximo(){ if(FF.ocupado||!FF.fila.length) return; const A=S.anl&&S.anl.imp;
  if(!A||A.lendo||A.grav||(A.arqs||[]).length||!(S.anl.lidos||{}).itens){ setTimeout(ffProximo,15000); return; } /* alguém importando à mão, ou a base ainda carregando: espera */
  const f=FF.fila.shift(); FF.ocupado=true; const ref=S.db.doc('pcpfila/'+f._id);
  try{ await ref.update({status:'processando',pegoPor:S.uid,pegoEm:new Date().toISOString()}); const g=await ref.get(); if(!g.exists||g.data().pegoPor!==S.uid) return; /* outro painel pegou */
    const ps=(await S.db.collection('pcpfila/'+f._id+'/partes').get()).docs.map(d=>d.data()).sort((a,b)=>a.n-b.n);
    if(ps.length!==(+f.partes||ps.length)) throw new Error('arquivo incompleto ('+ps.length+' de '+f.partes+' partes)');
    const bin=atob(ps.map(p=>p.b64).join('')), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
    const arq=new File([u8],f.nome||'focco',{type:f.tipo||'application/octet-stream'});
    await anlLerArquivos([arq]); const r=(S.anl.imp.arqs||[])[0];
    if(!r||r.erro){ const msg=(r&&r.erro)||'não consegui ler'; S.anl.imp={lendo:false,arqs:[],grav:false}; await ref.update({status:'erro',erro:msg,fimEm:new Date().toISOString()}); toast('Arquivo do Focco "'+f.nome+'": '+msg); render(); return; }
    { const sd=r.partes&&r.partes.saldo; if(sd&&sd.empAuto){ const e=ffEmpDoNome(f.nome); /* o PDF não disse a empresa: tenta pelo nome do arquivo; sem certeza, não grava */
        if(e){ sd.emp=e; sd.empAuto=false; } else { const msg='não sei se este saldo é da empresa 1 ou 9: o PDF não mostra a empresa. Salve com "empresa 1" ou "empresa 9" no nome do arquivo.'; S.anl.imp={lendo:false,arqs:[],grav:false}; await ref.update({status:'erro',erro:msg,fimEm:new Date().toISOString()}); toast('Arquivo do Focco "'+f.nome+'": '+msg); render(); return; } } }
    const tipo=(r.nome||r.tipo||'')+(r.partes&&r.partes.saldo&&r.partes.saldo.emp?' · empresa '+r.partes.saldo.emp:''); await anlGravar();
    const ok=!(S.anl.imp.arqs||[]).length&&!S.anl.imp.grav;
    if(!ok){ S.anl.imp={lendo:false,arqs:[],grav:false}; await ref.update({status:'erro',erro:'não foi possível gravar (veja o aviso no painel)',fimEm:new Date().toISOString()}); render(); return; }
    await ref.update({status:'ok',lidoComo:tipo,fimEm:new Date().toISOString()});
    try{ for(const p of (await S.db.collection('pcpfila/'+f._id+'/partes').get()).docs) await p.ref.delete(); }catch(e){} /* o envelope fica só como registro */
    toast('Base do Focco atualizada automaticamente: '+tipo+' ('+f.nome+').'); }
  catch(e){ console.warn('[focco fila]',e); try{ await ref.update({status:'erro',erro:String(e.message||e).slice(0,200),fimEm:new Date().toISOString()}); }catch(x){} }
  finally{ FF.ocupado=false; if(FF.fila.length) setTimeout(ffProximo,1500); } }
/* Base de dados: o que o robô trouxe por último */
{ const _vb=vAnlBase; vAnlBase=function(R){ const h=_vb.apply(this,arguments); if(!FF.ult.length) return h;
    const lin=FF.ult.map(f=>{ const q=new Date(f.fimEm||f.em); const st=f.status==='ok'?`<span class="pill ok">lido: ${esc(f.lidoComo||'ok')}</span>`:f.status==='erro'?`<span class="pill crit">${esc(f.erro||'erro')}</span>`:`<span class="pill warn">${f.status==='processando'?'lendo agora':'esperando o painel abrir'}</span>`;
      return `<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line);font-size:14px;flex-wrap:wrap"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(f.nome||'arquivo')}</b><span class="sub" style="margin:0">${esc(q.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))} ${hora(q.toISOString())}</span><span style="margin-left:auto">${st}</span></div>`; }).join('');
    const card=`<section class="card"><div class="label">ROBÔ DO FOCCO · PASTA C:\\FoccoExport</div><div class="sub" style="margin:4px 0 6px">Arquivos salvos nessa pasta entram aqui sozinhos, com a mesma leitura de quando você arrasta.</div>${lin}</section>`;
    const j=typeof saDepoisDoHead==='function'?saDepoisDoHead(h):0; return j>0?h.slice(0,j)+card+h.slice(j):card+h; }; }
/* ===FIM FOCCO FILA=== */
