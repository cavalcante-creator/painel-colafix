/* Lista dos módulos em arquivos separados. Para incluir um módulo novo: crie modulos/<nome>.js e acrescente o nome aqui. */
(function(){ const MODULOS=[ 'onedrive', 'rh-almoco', 'rh-almfoto', 'rh-cartao', 'rh', 'backup', 'melhorias' /* , 'exemplo' */ ];
  MODULOS.forEach(n=>{ const s=document.createElement('script'); s.src='modulos/'+n+'.js'; s.async=false; document.body.appendChild(s); }); })();
