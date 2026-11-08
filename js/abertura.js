/* Painel Colafix · abertura animada (08/11, padrão do Conectwork)
   O "V" se desenha da esquerda para a direita, a folha entra, depois a logo da Colafix e "Painel de Operação".
   ~2,5 s, só na 1ª abertura da sessão (sessionStorage), não bloqueia nada (pointer-events:none) e some sozinha.
   Não aparece: com "reduzir movimento" no aparelho, nas TVs/janelas/totens (?tela ?janela ?totem ?linhas, rodízio
   automático), com ?semAbertura e nos testes automáticos (navigator.webdriver; ?abertura=1 força).
   Tema: segue o botão do topo (localStorage colafix.tema) ou o aparelho. Estilos em css/componentes.css (#abertura). */
(function () {
  var q = location.search, forca = /[?&]abertura=1/.test(q), ja = false;
  try { ja = sessionStorage.getItem('colafix.abertura') === '1'; } catch (e) {}
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tv = /[?&](tela|janela|totem|linhas|semAbertura)=?/.test(q);
  try { if (localStorage.getItem('colafix.apresAuto') === '1') tv = true; } catch (e) {}
  if (!forca && (ja || calmo || tv || navigator.webdriver)) return;
  try { sessionStorage.setItem('colafix.abertura', '1'); } catch (e) {}
  var tema = 'auto'; try { tema = localStorage.getItem('colafix.tema') || 'auto'; } catch (e) {}
  var escuro = tema === 'dark' || (tema !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var logo = escuro ? 'icons/logo-colafix-escuro.png' : ((document.querySelector('.brand img') || {}).src || 'icons/logo-colafix-escuro.png');
  var a = document.createElement('div');
  a.id = 'abertura'; a.className = escuro ? 'ab-esc' : 'ab-clr'; a.setAttribute('aria-hidden', 'true');
  a.innerHTML = '<div class="ab-c"><div class="ab-sim"><img class="ab-corpo" src="icons/v-corpo.png" alt=""><img class="ab-folha" src="icons/v-folha.png" alt=""></div>' +
    '<img class="ab-logo" src="' + logo + '" alt=""><div class="ab-frase">Painel de Operação</div></div>';
  document.body.appendChild(a);
  setTimeout(function () { a.classList.add('sai'); }, 2150);
  setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 2650);
})();
