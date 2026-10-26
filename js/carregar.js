/* Painel Colafix · carregador. Os arquivos js/01..09 são as partes do painel (editar cada uma separadamente).
   Aqui elas são juntadas, na ordem, num bloco único — exatamente como o painel sempre funcionou (as funções de uma
   parte podem usar as de outra). Depois carrega os módulos (modulos/lista.js). Para acrescentar uma parte nova,
   inclua o nome em PARTES, na ordem certa. */
(function(){
  var PARTES=['01-base-producao','02-diario-calendario','03-analise','04-analise-paineis-acessos','05-almox-premix','06-manutencao-equipe','07-manutencao-coletor','08-tablet-acessos-avisos','09-silos-final','10-tablet-producao','11-meu-menu','12-organizacao','13-inventario','14-tv-melhor','15-tvs','16-tvs2','17-tvs3','18-cracha-adesivo','19-chamados','20-chamados-tela','21-avisos','22-manut','23-producao','24-silo-auto','25-silo-mais','26-ajustes','27-ajustes2','28-posto','29-gestor','30-monitor-man','31-trava','32-ordem-tempo','33-gestor-pessoas','34-gestor-pdf','35-crachas','36-topo-tema','37-gestor-chamados','38-plano-preventivo','39-oficina','40-trava-aparelho','41-nexus','42-ordem-pausa','43-pausa-auto','44-chamados-teclado','45-revisao-uso','46-melhorias-uso','47-silo-celular','48-posto-mais','49-sequencia','50-hora-extra','51-treino','52-chamado-editar','53-pedidos2610','54-pedidos-peca'];
  var base=(document.currentScript&&document.currentScript.src||location.href).replace(/[^\/]*$/,'');
  Promise.all(PARTES.map(function(n){ return fetch(base+n+'.js',{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error(n+'.js ('+r.status+')'); return r.text(); }); }))
    .then(function(tx){ var s=document.createElement('script'); s.textContent='(function(){"use strict";\n'+tx.join('\n')+'\n})();\n//# sourceURL=painel-colafix.js'; document.body.appendChild(s);
      var m=document.createElement('script'); m.src='modulos/lista.js'; document.body.appendChild(m); })
    .catch(function(e){ console.error('[painel] carregar',e); var d=document.createElement('div'); d.style.cssText='position:fixed;inset:auto 0 0 0;padding:16px;font:16px system-ui,sans-serif;background:#F8E1DE;color:#7A2A20;z-index:99999';
      d.textContent='Não foi possível carregar o painel ('+e.message+'). Confira a internet e recarregue a página.'; document.body.appendChild(d); });
})();
