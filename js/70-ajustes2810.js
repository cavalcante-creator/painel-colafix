/* Painel Colafix · 70-ajustes2810.js — pedidos de ajuste de 28/10.
   (1) Tela da linha (Tablet da produção › linhatv): sai o "Chamar manutenção" de cada linha (os chamados já são
       abertos no posto e no computador de chamados). No painel da administradora a tela fica só para dizer que a
       linha parou/voltou: saem também "Usar como tablet" e "Escanear QR da linha". O selo da OS aberta continua. */
"use strict";
{ const _vl=vLinhaTv; vLinhaTv=function(){ let h=_vl.apply(this,arguments);
    h=h.replace(/<button class="mm-lbtn"[^>]*data-act="mlt-abrir"[^>]*>[\s\S]*?<\/button>/g,'');
    if(S.acs&&S.acs.dono) h=h.replace(/<button[^>]*data-act="(?:tab-on|man-scan)"[^>]*>[\s\S]*?<\/button>/g,'');
    return h; }; }
/* ===FIM AJUSTES 28/10=== */
