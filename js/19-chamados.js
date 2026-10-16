/* Painel Colafix · 19-chamados.js — processo simplificado dos chamados da manutenção.
   - Login próprio "Computador de chamados" (perfil chamados, só o módulo tablet): abre direto na tela de chamados,
     funciona no computador com coletor e no tablet com câmera, sem a parte de ranchos.
   - O gestor da linha passa o crachá → máquina → defeito → parou? → chamado aberto.
   - O técnico passa o crachá → Cheguei → (serviço) → passa o crachá → Terminei: registra causa e serviço e já LIBERA a máquina
     (encerra a parada aberta pelo chamado). Opção config/geral.manLiberaTecnico (padrão: ligado). */
"use strict";
function ttLiberaTec(){ return !(S.cfg&&S.cfg.manLiberaTecnico===false); }
async function ttLiberaPorTecnico(c,p){ try{ if(c.liberadoEm) return false; const agora=new Date().toISOString(); let fechou=false;
    const par=c.paradaId&&(S.paradas||[]).find(x=>x._id===c.paradaId);
    if(par&&!par.fim){ await S.db.doc('paradas/'+par._id).update({fim:agora>par.inicio?agora:par.inicio,porFim:S.uid||null,fimPor:p.nome,fimOrigem:'tablet'}); par.fim=agora; fechou=true; }
    const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Técnico liberou a máquina ao concluir: '+p.nome+(p.codigo?' (crachá)':'')+(fechou?' · parada encerrada':'')}]).slice(-200);
    await S.db.doc('chamados/'+c._id).update({liberadoEm:agora,liberadoPor:p.nome,liberadoCracha:p.codigo||null,liberadoPeloTecnico:true,hist}); Object.assign(c,{liberadoEm:agora,liberadoPor:p.nome,hist}); S.tt.paradaFechada=fechou; return true; }
  catch(e){ console.warn('[chamados] liberar pelo técnico',e); return false; } }
function ttSoChamados(){ try{ return !!(S.acs&&S.acs.doc&&S.acs.doc.perfil==='chamados'); }catch(e){ return false; } }

/* login próprio: só o módulo do tablet (a tela de chamados abre sozinha e não sai dela) */
if(typeof ACS_PERFIS!=='undefined'&&!ACS_PERFIS.chamados) ACS_PERFIS.chamados={nome:'Computador de chamados da manutenção (coletor ou tablet)',mods:['tablet'],locais:[],desc:'Fica no meio da fábrica: o gestor da linha passa o crachá e chama a manutenção; o técnico passa o crachá para começar, terminar e liberar a máquina. Funciona com coletor ou com a câmera do tablet.'};

/* textos da tela: leitor primeiro, câmera como alternativa; técnico "termina e libera" */
{ const _vt=vTotem; vTotem=function(){ let h=_vt.apply(this,arguments); try{
    h=h.replace('Aproxime seu crachá da câmera','Passe seu crachá no leitor').replace('O QR do crachá fica a um palmo da tela, virado para a câmera de cima.','Ou aproxime o QR do crachá da câmera.');
    if(ttSoChamados()) h=h.replace('Para conferir um rancho, mostre o QR da folha de produção.','');
    h=h.replace('Este aparelho não tem câmera disponível. Enquanto isso, chame a manutenção pelo ramal.','Este computador não tem câmera: use o leitor de crachá.');
    if(ttLiberaTec()){ h=h.replace(/>Terminei o conserto</g,'>Terminei · liberar a máquina<').replace(">${T.enviando?'Concluindo…':'Concluir OS'}",'').replace(/>Concluir OS</g,'>Concluir e liberar a máquina<');
      if(S.tt.fase==='fimok') h=h.replace(/(<p>Conserto registrado no nome de [^<]*<\/p>)/,'$1<p><b>Máquina liberada para a produção'+(S.tt.paradaFechada?' · parada encerrada':'')+'.</b></p>'); }
  }catch(e){} return h; }; }
/* ===FIM CHAMADOS=== */
