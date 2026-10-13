// Configuração do painel online (Firebase).
// 13/10/2026: o painel passou para o projeto novo "painel-colafix-2" (conta Google da Iasmyn), banco padrão "(default)".
// O projeto antigo ("painel-colafix", banco "default") continua acessível só para tirar a cópia de segurança:
// abra o painel com ?antigo=1 no fim do endereço (ex.: https://cavalcante-creator.github.io/painel-colafix/?antigo=1).
(function () {
  var NOVO = {
    firebase: {
      apiKey: "AIzaSyCCztFZNJIjun_tSLSaERucMCpb5wi2M_I",
      authDomain: "painel-colafix-2.firebaseapp.com",
      projectId: "painel-colafix-2",
      storageBucket: "painel-colafix-2.firebasestorage.app",
      messagingSenderId: "780684561960",
      appId: "1:780684561960:web:7dd704070a5e31a5bfef1d"
    },
    banco: "(default)"                                        // nome do banco no Firestore
  };
  var ANTIGO = {
    firebase: {
      apiKey: "AIzaSyD4HBi6w0-LPIObtr_7ZlTI3A2uE3ZSIaY",
      authDomain: "painel-colafix.firebaseapp.com",
      projectId: "painel-colafix",
      storageBucket: "painel-colafix.firebasestorage.app",
      messagingSenderId: "157670738508",
      appId: "1:157670738508:web:af36f476070c5d273182e9"
    },
    banco: "default"
  };
  var antigo = false;
  try { if (/[?&]antigo=1\b/.test(location.search)) sessionStorage.setItem('painel.antigo', '1'); if (/[?&]antigo=0\b/.test(location.search)) sessionStorage.removeItem('painel.antigo'); antigo = sessionStorage.getItem('painel.antigo') === '1'; } catch (e) { antigo = /[?&]antigo=1\b/.test(location.search); }
  var P = antigo ? ANTIGO : NOVO;
  window.PAINEL_CONFIG = {
    firebase: P.firebase,
    banco: P.banco,
    projetoAntigo: antigo,
    donos: ["iasmyn"],                                          // usuário com acesso total (PCP)
    link: "https://cavalcante-creator.github.io/painel-colafix/" // endereço do site (QR codes)
  };
  if (antigo) document.addEventListener('DOMContentLoaded', function () { var d = document.createElement('div'); d.textContent = 'PROJETO ANTIGO — só para baixar a cópia de segurança (Ajustes › Backup e dados). Para voltar ao painel novo, feche esta aba ou abra o endereço com ?antigo=0.'; d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#8E3A33;color:#fff;font:700 14px system-ui,sans-serif;padding:10px 14px;text-align:center'; document.body.appendChild(d); });
})();
