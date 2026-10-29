/* Painel Colafix · 75-maquinas-plano.js (29/10) — cadastrar as máquinas a partir da planilha do plano preventivo.
   Pedido: "nesse excel na coluna do ativo já tem as máquinas e o código (a TAG), pode cadastrar lá?"
   Na tela Máquinas (manequip, Manutenção e Visão do gestor) entra o quadro "Máquinas da planilha do plano":
     - "Trazer do plano preventivo" (quando o plano já foi importado: config/manutplano.ativos {cod,nome,area}) ou
     - "Escolher a planilha" (plano_preventiva_fabrica.xlsx: aba "Ativos" ou "Plano", colunas Área · Código do ativo · Ativo).
   Linha: Área com "Linha N" → "Linha N" (ex.: "Filtros de manga - Linha 1" → Linha 1); outra área vira o próprio nome
   (Descarga de areia, Descarga de cimento). Nome sem o "(Linha N)" do fim. TAG = código do ativo.
   Prévia: novas · já cadastradas (mesma TAG) · ganham a TAG (mesmo nome e linha, sem TAG). Grava em config/manut.equips
   pelo mxGrava (mesmo caminho do cadastro à mão), com origem:'plano'. Prefixo `mq`. Teste: teste-maqplano.js. */
"use strict";
S.mq={prev:null,lendo:false,erro:'',arq:''};
function mqLinha(area){ const m=String(area||'').match(/linha\s*(\d+)/i); return m?'Linha '+m[1]:String(area||'').trim()||'Outra'; }
function mqNome(n,l){ return String(n||'').replace(/\s*\((linha\s*\d+)\)\s*$/i,'').replace(/\s+/g,' ').trim()||String(n||'').trim(); }
function mqPode(){ try{ return manPodeAtender()||(typeof p29Gestor==='function'&&p29Gestor()); }catch(e){ return false; } }
function mqDoPlano(){ const a=(S.pp&&S.pp.plano&&S.pp.plano.ativos)||[]; return a.filter(x=>x&&x.cod&&x.nome).map(x=>({tag:String(x.cod).trim(),nome:x.nome,area:x.area||''})); }
async function mqLePlanilha(f){ try{ await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }catch(e){}
  if(!window.XLSX) throw new Error('não consegui abrir a planilha (confira a internet)');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}), out=[], vistos=new Set(), N=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const ordem=wb.SheetNames.slice().sort((a,b)=>(/ativo/i.test(b)?1:0)-(/ativo/i.test(a)?1:0));
  for(const sn of ordem){ const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:''}); let ia=-1,ic=-1,ie=-1,ini=0;
    for(let i=0;i<Math.min(rows.length,10);i++){ const r=rows[i].map(N); const c=r.findIndex(v=>/codigo do ativo|^tag$|^codigo$/.test(v)), e=r.findIndex(v=>v==='ativo'||v==='maquina'||v==='equipamento');
      if(c>=0&&e>=0){ ic=c; ie=e; ia=r.findIndex(v=>v==='area'||v==='linha'||v==='setor'); ini=i+1; break; } }
    if(ic<0) continue;
    rows.slice(ini).forEach(r=>{ const tag=String(r[ic]||'').trim(), nome=String(r[ie]||'').trim(); if(!tag||!nome||vistos.has(tag)) return; vistos.add(tag); out.push({tag,nome,area:ia>=0?String(r[ia]||'').trim():''}); });
    if(out.length) break; }
  return out; }
function mqPrevia(lidos){ const eqs=(S.mx.cfg.equips||[]).filter(e=>e.ativo!==false), porTag=new Map(eqs.filter(e=>e.tag).map(e=>[String(e.tag).trim().toUpperCase(),e]));
  const r={novas:[],ja:[],tag:[],n:lidos.length};
  lidos.forEach(x=>{ const linha=mqLinha(x.area), nome=mqNome(x.nome,linha), T=x.tag.toUpperCase(); if(porTag.has(T)){ r.ja.push({x,e:porTag.get(T)}); return; }
    const mesmo=eqs.find(e=>!e.tag&&e.linha===linha&&mxNorm(e.nome)===mxNorm(nome)); if(mesmo){ r.tag.push({e:mesmo,tag:x.tag}); return; }
    r.novas.push({tag:x.tag,nome,linha,area:x.area}); });
  return r; }
async function mqGrava(){ const P=S.mq.prev; if(!P) return; const agora=new Date().toISOString();
  await mxGrava(cf=>{ P.novas.forEach(x=>{ if(cf.equips.some(e=>e.ativo!==false&&String(e.tag||'').toUpperCase()===x.tag.toUpperCase())) return; cf.equips.push({id:mxId(),linha:x.linha,nome:x.nome,tag:x.tag,ativo:true,em:agora,origem:'plano',area:x.area||''}); });
    P.tag.forEach(t=>{ const e=cf.equips.find(y=>y.id===t.e.id); if(e&&!e.tag) e.tag=t.tag; }); });
  toast(P.novas.length+' máquina'+(P.novas.length===1?'':'s')+' cadastrada'+(P.novas.length===1?'':'s')+(P.tag.length?' · '+P.tag.length+' ganharam a TAG':'')+'.'); S.mq.prev=null; render(); }
function mqCard(){ if(!mqPode()) return ''; const M=S.mq, doPlano=mqDoPlano(), P=M.prev;
  if(P) return `<section class="card mq-c"><div class="label">MÁQUINAS DA PLANILHA DO PLANO${M.arq?' · '+esc(M.arq):''}</div>
    <div class="mq-k"><div class="ok"><b>${P.novas.length}</b><span>novas para cadastrar</span></div><div><b>${P.tag.length}</b><span>já cadastradas, ganham a TAG</span></div><div><b>${P.ja.length}</b><span>já cadastradas (mesma TAG)</span></div></div>
    ${P.novas.length?`<div class="mq-l">${Object.entries(P.novas.reduce((a,x)=>{ (a[x.linha]=a[x.linha]||[]).push(x); return a; },{})).map(([l,xs])=>`<div><b>${esc(l)} <small>(${xs.length})</small></b><span>${xs.map(x=>`<i>${esc(x.tag)}</i> ${esc(x.nome)}`).join(' · ')}</span></div>`).join('')}</div>`:'<div class="sub" style="margin:6px 0">Todas as máquinas da planilha já estão cadastradas.</div>'}
    <div class="mq-ac"><button class="btn sec" data-act="mq-x">Cancelar</button>${P.novas.length||P.tag.length?`<button class="btn" data-act="mq-ok">Cadastrar ${P.novas.length} máquina${P.novas.length===1?'':'s'}${P.tag.length?' e pôr '+P.tag.length+' TAG'+(P.tag.length>1?'s':''):''}</button>`:''}</div></section>`;
  return `<section class="card mq-c mq-min"><div><div class="label">MÁQUINAS DA PLANILHA DO PLANO</div><div class="sub" style="margin:2px 0 0">A planilha do plano preventivo já tem as máquinas e o código (TAG). Cadastre todas de uma vez: o painel mostra antes o que vai entrar.</div>${M.erro?`<div class="mq-er">${esc(M.erro)}</div>`:''}</div>
    <div class="mq-ac">${doPlano.length?`<button class="btn" data-act="mq-plano">Trazer as ${doPlano.length} do plano preventivo</button>`:''}<label class="btn ${doPlano.length?'sec':''} mq-file">${M.lendo?'Lendo…':'Escolher a planilha'}<input type="file" id="mq-arq" accept=".xlsx,.xls" hidden></label></div></section>`; }
{ const _ve=vManEquip; vManEquip=function(){ const h=_ve.apply(this,arguments); try{ if(!S.mx.lido) return h; const c=mqCard(); if(!c) return h;
    const k=h.indexOf('<div class="mx-eqw'); return k>=0?h.slice(0,k)+c+h.slice(k):h+c; }catch(e){ console.warn('[máquinas] planilha',e); return h; } }; }
document.addEventListener('change',async ev=>{ const t=ev.target; if(!t||t.id!=='mq-arq') return; const f=t.files&&t.files[0]; if(!f) return; const M=S.mq; M.lendo=true; M.erro=''; M.arq=f.name; render();
  try{ const l=await mqLePlanilha(f); if(!l.length){ M.erro='Não achei as colunas "Código do ativo" e "Ativo" nesta planilha.'; } else M.prev=mqPrevia(l); }catch(e){ M.erro='Não consegui ler a planilha: '+(e&&e.message||e); } M.lendo=false; render(); });
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act^="mq-"]'); if(!b) return; if(!mqPode()){ toast('Só a manutenção e o gestor cadastram máquinas.'); return; } const a=b.dataset.act;
  if(a==='mq-plano'){ S.mq.arq='plano preventivo'; S.mq.prev=mqPrevia(mqDoPlano()); render(); return; }
  if(a==='mq-x'){ S.mq.prev=null; render(); return; }
  if(a==='mq-ok'){ b.disabled=true; try{ await mqGrava(); }catch(e){ toast('Não foi possível cadastrar: '+(e&&e.message||e)); b.disabled=false; } } });
window.Painel=window.Painel||{}; window.Painel.maqPlano={previa:mqPrevia,linha:mqLinha,nome:mqNome};
document.head.insertAdjacentHTML('beforeend',`<style id="mq-css">
.mq-c{margin-bottom:14px}.mq-min{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.mq-ac{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px}.mq-file{cursor:pointer}
.mq-er{margin-top:6px;color:var(--crit-ink,var(--crit));font-size:13px}.mq-k{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.mq-k>div{background:var(--ground);border-radius:12px;padding:8px 14px;min-width:150px;display:flex;flex-direction:column}.mq-k b{font-size:22px}.mq-k span{font-size:12px;color:var(--muted)}.mq-k .ok b{color:var(--ok)}
.mq-l{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:10px 12px}.mq-l>div{display:flex;flex-direction:column;gap:2px}.mq-l span{font-size:13px;color:var(--ink-2,inherit);line-height:1.5}.mq-l i{font-style:normal;font-weight:700;font-size:12px;background:var(--ground);border-radius:5px;padding:0 5px}
</style>`);
/* ===FIM MÁQUINAS DO PLANO=== */
