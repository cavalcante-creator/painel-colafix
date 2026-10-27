/* ===================== CÓPIA DE SEGURANÇA (só a administradora) =====================
   Exportar: baixa um arquivo .json com TODAS as coleções do painel (inclusive arquivos guardados e o RH).
   Importar: grava esse arquivo num projeto Firebase NOVO (mudança de projeto). Não importa logins/permissões
   (acessos, pedidos): as pessoas são recriadas em Equipe e cargos. Os nomes (perfis) vão junto para o histórico. */
(function(){ const P=window.Painel; if(!P) return;
  const COLECOES=['config','presenca','checkop','pedpecas','pmxentregas','perdas','horaextra','ordens','entregas','entregasarq','previsoes','itens','paradas','ranchos','rancrec','diario','alxfila','medicoes','cargas','premix','silos','silomov',
    'chamados','chamfotos','pecasmov','pecafotos','crachas','conferencias','auditorias','recebimentos','pmxfichas','pmxrec','pmxbaixas','pcpbase','pcpsnap','pcpvendas',
    'ritplano','ritfech','sistema','perfis','acessos','pedidos','_arquivos','_arquivos_p','pedmat','pcpavisos','gxacoes','gxseg','apontpend','melhorias','exemplo'];
  const SUB={'rh':{docs:['config'],sub:{'rh/dados':['funcionarios','funcoes','retiradas','terceiros','presenca','fichasmes','modelos','docsgerados','ferias','ocorrencias','emprestimos','convites','fichascand','almoco','almocoaj','almocofolha','epis','vagasab','candidatos','uniformes'],'rh/arquivos':['lista','partes']}}};
  const NAO_IMPORTA=['pedidos']; /* acessos entram (13/10/2026): as pessoas aparecem em Equipe como "sem login" e, ao recriar o login, herdam cargo e ajustes */
  const B={st:'',prog:'',ult:null,imp:null};
  const fs=()=>window.claude&&window.claude._fs&&window.claude._fs();
  /* datas do Firestore viram {"__ts": milissegundos} no arquivo */
  const ida=v=>{ if(v&&typeof v==='object'){ if(typeof v.toMillis==='function') return {__ts:v.toMillis()}; if(Array.isArray(v)) return v.map(ida); const o={}; for(const k in v) o[k]=ida(v[k]); return o; } return v; };
  const volta=v=>{ if(v&&typeof v==='object'){ if(Object.keys(v).length===1&&typeof v.__ts==='number'){ const T=window.firebase&&firebase.firestore&&firebase.firestore.Timestamp; return T?T.fromMillis(v.__ts):new Date(v.__ts).toISOString(); } if(Array.isArray(v)) return v.map(volta); const o={}; for(const k in v) o[k]=volta(v[k]); return o; } return v; };
  async function lerColecao(path){ const q=await P.db().collection(path).get(); const o={}; q.docs.forEach(d=>{ o[d.id]=ida(d.data()); }); return o; }
  async function exportar(){ B.st='exportando'; B.prog='Lendo os dados…'; P.render(); const out={painel:'Painel Colafix',versao:1,exportadoEm:new Date().toISOString(),por:(P.S.nomes||{})[P.S.uid]||'',colecoes:{}}; let n=0;
    try{ for(const c of COLECOES){ B.prog='Lendo '+c+'…'; P.render(); try{ out.colecoes[c]=await lerColecao(c); n+=Object.keys(out.colecoes[c]).length; }catch(e){ console.warn('[backup]',c,e); out.colecoes[c]={__erro:String(e&&e.message||e)}; } }
      for(const raiz in SUB){ for(const dc of SUB[raiz].docs){ try{ const g=await P.db().doc(raiz+'/'+dc).get(); if(g.exists){ out.colecoes[raiz]=out.colecoes[raiz]||{}; out.colecoes[raiz][dc]=ida(g.data()); n++; } }catch(e){} }
        for(const base in SUB[raiz].sub) for(const c of SUB[raiz].sub[base]){ const p=base+'/'+c; B.prog='Lendo '+p+'…'; P.render(); try{ out.colecoes[p]=await lerColecao(p); n+=Object.keys(out.colecoes[p]).length; }catch(e){ out.colecoes[p]={__erro:String(e&&e.message||e)}; } } }
      const txt=JSON.stringify(out); const nome='painel-colafix-copia-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')+'.json';
      const u=URL.createObjectURL(new Blob([txt],{type:'application/json'})); const a=document.createElement('a'); a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000);
      B.ult={nome,docs:n,tam:txt.length,em:new Date().toISOString(),erros:Object.entries(out.colecoes).filter(([k,v])=>v&&v.__erro).map(([k])=>k)};
      try{ localStorage.setItem('painel.ultimaCopia',JSON.stringify(B.ult)); }catch(e){}
      P.toast('Cópia baixada: '+n.toLocaleString('pt-BR')+' registros.'); }
    catch(e){ console.warn('[backup]',e); P.toast('Não foi possível terminar a cópia: '+(e.message||e)); }
    B.st=''; B.prog=''; P.render(); }
  async function importar(arq){ let dados; try{ dados=JSON.parse(await arq.text()); }catch(e){ P.toast('Arquivo inválido.'); return; }
    if(!dados||dados.painel!=='Painel Colafix'||!dados.colecoes){ P.toast('Este arquivo não é uma cópia do Painel Colafix.'); return; }
    const tot=Object.entries(dados.colecoes).filter(([k])=>!NAO_IMPORTA.includes(k)).reduce((a,[k,v])=>a+(v&&!v.__erro?Object.keys(v).length:0),0);
    if(prompt('Importar '+tot.toLocaleString('pt-BR')+' registros da cópia de '+new Date(dados.exportadoEm).toLocaleString('pt-BR')+' NESTE projeto?\nUse só num projeto NOVO (o que já existir com o mesmo código será substituído).\n\nPara confirmar, digite IMPORTAR')!=='IMPORTAR') return;
    const F=fs(); if(!F){ P.toast('Banco indisponível.'); return; } B.st='importando'; let n=0; P.render();
    /* grava em lotes (até 400 registros ou ~6 MB); se o banco recusar um lote, tenta um por um e segue, para não perder o resto */
    let lote=[], bytes=0; const recus={}; let ok=0, primeiroErro='';
    const envia=async()=>{ if(!lote.length) return; const xs=lote; lote=[]; bytes=0;
      try{ const b=F.batch(); xs.forEach(([p,d])=>b.set(F.doc(p),volta(d))); await b.commit(); ok+=xs.length; }
      catch(e){ console.warn('[backup] lote recusado, tentando um por um',e); for(const [p,d] of xs){ try{ await F.doc(p).set(volta(d)); ok++; }catch(e2){ const c=p.split('/').slice(0,-1).join('/'); recus[c]=(recus[c]||0)+1; if(!primeiroErro) primeiroErro=(e2&&(e2.code||e2.message))||'erro'; console.warn('[backup] recusado',p,e2&&e2.code); } } }
      B.prog=(ok+Object.values(recus).reduce((a,x)=>a+x,0)).toLocaleString('pt-BR')+' de '+tot.toLocaleString('pt-BR')+'…'; P.render(); };
    try{ for(const [c,docs] of Object.entries(dados.colecoes)){ if(NAO_IMPORTA.includes(c)||!docs||docs.__erro) continue;
        for(const [id,d0] of Object.entries(docs)){ const d=c==='perfis'&&d0&&typeof d0==='object'?Object.assign({},d0,{importado:true}):d0, tam=JSON.stringify(d||{}).length;
          if(lote.length&&bytes+tam>6000000) await envia(); lote.push([c+'/'+id,d]); bytes+=tam; n++; if(lote.length>=400) await envia(); } }
      await envia(); const nr=Object.values(recus).reduce((a,x)=>a+x,0);
      if(!nr) P.toast(ok.toLocaleString('pt-BR')+' registros importados. Em Equipe e cargos, toque em "Recriar login" em cada pessoa.');
      else alert(ok.toLocaleString('pt-BR')+' registros importados.\n\n'+nr+' o banco recusou ('+primeiroErro+'):\n'+Object.entries(recus).map(([c,x])=>'• '+c+': '+x).join('\n')+'\n\nConfira se as regras novas (firestore.rules) estão publicadas no Firebase e importe de novo (o que já entrou não duplica).'); }
    catch(e){ console.warn('[backup] importar',e); P.toast('A importação parou em '+n+' registros: '+(e.message||e)); }
    B.st=''; B.prog=''; P.render(); }
  function tela(){ if(!P.dono()) return '<section class="card"><div class="empty">Só a administradora.</div></section>';
    let ult=B.ult; if(!ult){ try{ ult=JSON.parse(localStorage.getItem('painel.ultimaCopia')||'null'); }catch(e){} }
    return `<div class="head"><div><div class="eyebrow">ADMINISTRAÇÃO</div><h1>Cópia de segurança</h1><div class="sub">Guarde uma cópia de todos os dados do painel no seu computador ou no OneDrive. Faça pelo menos uma vez por semana.</div></div></div>
      <section class="card"><div class="label">EXPORTAR TUDO</div><div class="sub" style="margin:4px 0 12px">Produção, ordens, entregas, paradas, ranchos, silos, manutenção, crachás, almoxarifado, premix, análise, RH e os arquivos guardados no painel.</div>
        <button class="btn" data-act="bk-exp" ${B.st?'disabled':''}>${P.ic('baixar',18,2)}${B.st==='exportando'?'Exportando…':'Baixar cópia completa'}</button>
        ${B.prog?`<div class="sub" style="margin:10px 0 0">${P.esc(B.prog)}</div>`:''}
        ${ult?`<div class="sub" style="margin:12px 0 0">Última cópia neste aparelho: <b>${new Date(ult.em).toLocaleString('pt-BR')}</b> · ${Number(ult.docs).toLocaleString('pt-BR')} registros · ${(ult.tam/1048576).toFixed(1)} MB${ult.erros&&ult.erros.length?` · <span style="color:var(--crit-ink)">não leu: ${P.esc(ult.erros.join(', '))}</span>`:''}</div>`:''}</section>
      <section class="card"><div class="label">IMPORTAR NUM PROJETO NOVO</div><div class="sub" style="margin:4px 0 12px">Use só depois de trocar o painel para um projeto Firebase novo. Os logins e permissões não vão: recrie as pessoas em Equipe e cargos.</div>
        <label class="btn sec" style="cursor:pointer">${P.ic('mais',18,2)}Escolher arquivo da cópia<input type="file" id="bk-imp" accept=".json,application/json" hidden ${B.st?'disabled':''}></label></section>`; }
  P.registrarModulo({ id:'backup', nome:'Cópia de segurança', ic:'baixar', telas:{ backup:{ nome:'Cópia de segurança', mob:'Cópia', render:tela } } });
  document.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="bk-exp"]'); if(b&&P.dono()&&!B.st) exportar(); });
  document.addEventListener('change',ev=>{ const t=ev.target; if(t.id==='bk-imp'&&t.files&&t.files[0]&&P.dono()){ importar(t.files[0]); t.value=''; } });
  /* lembrete no Meu dia: sem cópia há mais de 7 dias */
  P.registrarAviso(()=>{ if(!P.dono()) return []; let u=null; try{ u=JSON.parse(localStorage.getItem('painel.ultimaCopia')||'null'); }catch(e){} const d=u?Math.floor((Date.now()-new Date(u.em))/864e5):null;
    return d===null||d>7?[{nivel:'warn',rotulo:'Backup',titulo:'Faça uma cópia de segurança',texto:d===null?'Nenhuma cópia feita neste aparelho ainda.':'Última cópia há '+d+' dias.',go:'backup'}]:[]; });
})();
