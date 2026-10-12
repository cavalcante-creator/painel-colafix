# Painel Colafix — instruções para o Claude Code

Sistema interno de uma fábrica (PCP, produção, silos, manutenção, almoxarifado, TVs). JavaScript puro, **sem build**.
Publicado pelo **GitHub Pages** a partir deste repositório (todo commit na `main` vai para o ar em ~1 minuto).
Banco: **Firebase/Firestore**, banco nomeado **`default`**, plano Blaze (custo por leitura: economizar).

## Regras de ouro
1. **Não reescrever** nada que funciona. Mudanças pequenas e testadas.
2. **Módulo novo = arquivo novo** em `modulos/<nome>.js` (copiar `modulos/exemplo.js`) + acrescentar o nome em `modulos/lista.js`. **Não** colocar módulo novo dentro do `index.html`.
3. Usar só a API `window.Painel` (ver abaixo). Precisando de algo do `index.html` que a API não expõe, acrescentar à API (fim do `index.html`, bloco `API PARA MÓDULOS`) — mudança mínima.
4. **Regras do Firestore** (`firestore.rules`): se mudar, **avisar a usuária** que ela precisa colar e publicar no console do Firebase (banco `default`). O arquivo no GitHub não vale sozinho.
5. Leituras: assinar só o necessário (`limit`, filtros, ordem por data). Nunca carregar uma coleção inteira sem limite.
6. Textos da tela em **português do Brasil**, linguagem simples (o pessoal é do chão de fábrica).
7. Antes de terminar: rodar os testes do que foi mexido (abaixo) e dizer o resultado.

## API `window.Painel` (para módulos)
```js
Painel.registrarModulo({
  id: 'estoque', nome: 'Estoque', ic: 'grid',
  telas: { estoque: { nome: 'Estoque', render: () => '<html da tela>' } },
  iniciar: () => { /* assinaturas do banco; roda só para quem tem acesso */ }
});
Painel.db()            // banco (S.db): .collection(c).where/orderBy/limit, .doc('col/id').get/set/update/delete
Painel.inscrever(nome, () => consulta, snap => { ...; Painel.rerender(); })   // escuta com reconexão
Painel.toast(msg) · Painel.erro(e) · Painel.esc(texto) · Painel.ic(nome,tam,traço)
Painel.viewOk(tela) · Painel.acsP() (módulos da pessoa) · Painel.dono() · Painel.soVer()
Painel.hojeStr() · Painel.hora(iso) · Painel.dia(iso) · Painel.dm(data) · Painel.linhas() · Painel.nomeDe(uid) · Painel.S (estado)
```
- O módulo aparece no menu, em **Equipe e cargos → Ajustar acesso** e nas permissões automaticamente.
- Ações por clique: usar `data-act="<id>-..."` e um `document.addEventListener('click', ...)` no próprio arquivo.
- Estilos: usar as classes existentes (`card`, `head`, `eyebrow`, `sub`, `btn`, `btn sec`, `row`, `empty`, `pill`) e as variáveis de cor (`--ground`, `--surface`, `--teal`, `--teal-strong`, `--ok`, `--warn`, `--crit`, `--muted`). **Não existe `--bg`.**

## Módulo RH (`modulos/rh.js`) — regras do negócio
- Dados em `rh/...` (Firestore), protegidos pela regra `rhOk()` (só a dona e quem tem o módulo `rh`). Novas coleções do RH: sempre dentro de `rh/dados/<nome>`.
- **Empresas:** todo **CLT é Colafix** (`empresa:'COLAFIX'`); **PJ é Zenith ou Nexus** (`'ZENITH'`/`'NEXUS'`) ou outra. Razão social/CNPJ/logo ficam em `EMPRESAS_CONHECIDAS` no `modulos/rh-fichas.html`.
- Fichas de EPI/uniforme: sistema original em `modulos/rh-fichas.html` (iframe) falando com o painel por `window.RHAPI` (antigo `google.script.run`). Não usar planilha nem Drive.
- **Vencimentos e avisos:** usar `Painel.registrarAviso(()=>[{nivel:'crit'|'warn', rotulo, titulo, texto, go:'tela'}])` — aparece no quadro "Avisos" do Meu dia. Seguir o modelo de **Terceirizados** (`vTerc`, `tSit`, `tAvisos`): situação Vencido / Vence hoje / Vence em X dias / Em dia, aviso N dias antes (configurável), renovação com histórico.
- **OneDrive** (`modulos/onedrive.js`, `window.OneDrive`): login Microsoft 365 (OAuth + PKCE, sem biblioteca) e arquivos pelo Microsoft Graph. Configuração em `config/geral.onedrive` {ativo, clientId, tenant, pasta, link}. Com ele ligado, as fichas do RH vão para `<pasta>/<AAAA-MM Mês>/`. Reutilizar para backup/relatórios: `OneDrive.enviar(caminho, base64, mime)`, `listar(pasta)`, `buscar(texto)`.
- A tela das fichas fica num iframe **fixo sobre o espaço da tela** (`#rh-fr-slot` + `frSync`) para não recarregar quando o painel redesenha.
- **Telas (desde 12/10, como o exemplo "Painel do RH · exemplos"):** Início · Agenda · Funcionários · Fichas do mês · Documentos e contratos · Férias e prazos · Funções e EPIs · Terceirizados. Quem só tem o RH vê essas telas na barra lateral (`navSolo`, usa `Painel.modsVis()`). "Dia a dia", "Controle de EPI" e "Retiradas" saíram do menu (os dados `presenca`/`retiradas` continuam guardados).
- **Fichas do mês:** situação por pessoa em `rh/dados/fichasmes/{AAAA-MM}` (`impressas.{funcId}`, `assinadas.{funcId}`) + arquivos escaneados da pasta do mês. Duas formas de ver (lista com prévia / por setor), lembrada no aparelho. O gerador continua em `rh-fichas.html`; a ponte painel → ficha é `window.FICHAS` (`preparar({mes,nomes,porSetor,imprimir})`, `previa(nome,mes)`), e a ficha avisa `RHAPI.fichasImpressas` ao imprimir/salvar PDF. A ficha impressa não mudou.
- **Documentos e contratos:** modelos em `rh/dados/modelos` (HTML simples; campos = `<span class="rh-tk" data-k="NOME">`; no Word, `{NOME}`, `{CPF}`…), histórico em `rh/dados/docsgerados`. Salário e jornada ficam no cadastro do funcionário. Não inventar texto de contrato: a RH cadastra os modelos.
- **Documentos — campos perguntados:** `{?Pergunta}` no Word ou o botão "Campo perguntado" (`<span class="rh-tq" data-q="…">`); o painel pergunta na hora de gerar (pergunta com "data"/"dia" vira calendário) e guarda as respostas em `docsgerados.respostas`. Campos de férias (`FERIAS_INICIO`, `FERIAS_FIM`, `FERIAS_DIAS`, `FERIAS_RETORNO`, `PERIODO_AQUISITIVO`) e do PJ (`ULTIMA_TROCA`, `PROXIMA_TROCA`).
- **Férias e prazos (pedido da RH em 12/10):** CLT: períodos de 12 meses pela admissão, 12 meses para conceder; férias em partes (10+20, 15+15 ou 30) em `rh/dados/ferias` (`status` marcada/cancelada/tirada; `anterior:true` = tirada antes do painel). **Ajustar** (linha da pessoa ou ficha da pessoa): a RH diz, período a período, quantos dias já tirou antes do painel (`origem:'ajuste'`, troca o registro anterior daquele período). PJ: troca a cada 3 meses **da última troca** (sem troca, da admissão); `ultimaTroca` + `trocas[]` no cadastro. Avisos **15 dias antes** (`rh/config.prazoAviso`), no Início e no Meu dia. Aviso de demissão: sem cálculo (a RH digita).
- **Experiência 45 + 45:** aba Experiência em Férias e prazos; 1ª etapa até admissão+44, 2ª até +89; `exp.status` no cadastro (prorrogado/efetivado/desligado). Aviso 15 dias antes.
- **Desligamento:** `desligar()` grava `status`, `desligamento`, `desligMotivo`. Data no futuro (aviso trabalhado) → `desligAgendado:true`, continua ativo e vira Desligado sozinho no dia (`aplicarDesligAgendados`). Modelos com `desliga:true` oferecem desligar ao gerar. Quem saiu continua nas fichas do mês da saída.
- **Terceirizados:** `docs[]` {id, nome, validade, arquivo, removido} com aviso 15 dias antes. **Aniversários:** `nascimento` no cadastro; cartão no Início (aniversariantes e 1, 5, 10… anos de casa).
- **Dia a dia (12/10):** **Agenda** (`agendaItens`: tudo o que vence, 30/60/90 dias + "já passou"; "Mandar para o Outlook" baixa um `.ics` com lembrete na véspera) e **Relatório do mês** (admissões, desligamentos, férias, experiência, afastados; imprimir e Excel). **Ficha completa da pessoa** (`R.pess`, busca no Início, nome clicável em Funcionários). **Nova admissão** (cadastro → documentos entregues `admEntregues[]`, lista em `rh/config.docsAdmissao` → contrato → ficha do mês). **Várias pessoas** em Gerar contrato (um documento por pessoa, perguntas valem para todos; modelos que desligam: só um por vez). **Importar planilha** (botão único em Funcionários, antigo "Carga inicial" + "Importar"): cria quem não existe (Nome, CPF válido e Vínculo; CLT = Colafix, PJ com "Empresa (PJ)") e completa quem existe (acha pelo Código ou CPF; nome, CPF e vínculo de quem existe não mudam); prévia antes de gravar; datas do Excel lidas como número de dias, sem fuso.
- Testes do RH: `teste-rh.js`, `teste-rhnovo.js` (telas novas), `teste-rhdiaadia.js` (agenda, relatório, ficha, admissão, lote, carga), `teste-rhprazos.js` (férias e PJ), `teste-rhajuste.js` (ajuste das férias por período), `teste-rhmais.js` (experiência, desligamento, documentos dos terceirizados, aniversários), `teste-terc.js`, `teste-empresa.js`, `teste-onedrive.js` (Microsoft simulada).

## Almoxarifado / rancho
- Etapas do rancho ficam em `ordens.rdb` (`sep`, `ent`, `conf`, `fim`) e são gravadas por `dbSalvar`. A ação de permissão é **"rancho"** (não "programar").
- **Celular do almox** (cargo `almoxcel`, tela `mantotem` em modo entrega): folha (QR/RA-/nº) → separado → crachá de quem recebe → "Recebi o rancho". Grava `rdb.ent` com `entreguePor` e `recebidoPor`. Teste: `teste-almoxcel.js`.

## Permissões e botões (revisão de 12/10)
- **Padrão de ações por cargo:** `ACX_CARGO` (js/08). "Produção (consulta)" (`producao`): vê tudo, abre chamado, registra parada e marca o rancho; **não** programa, não aponta, não mede, não atende. O painel da administradora grava sozinho os `bloqCols` dessas pessoas (as regras do banco já usam `bloqCols`; não precisa publicar regra). Ajuste por pessoa continua vencendo.
- **Botões de gravar só para quem pode:** `ACX_BOTOES` (js/08) liga cada `data-act` a uma ação; o `body` ganha `sem-<ação>` e `so-ver` (cargos só ver: TV, consulta…). Botão novo que grava → acrescentar o `data-act` na ação certa.
- Celular: calendário de consulta vira lista por dia; Equipamentos mostra a lista antes do cadastro. Tempo zero aparece como "menos de 1 min". Teste: `teste-revisao.js`.

## Pedir ajuste (12/10)
- `modulos/melhorias.js`: botão no topo **só da administradora** (`Painel.dono()`); anota o pedido com tela, aparelho, quem pediu e foto pequena da tela (html2canvas, ≤400 KB) em `melhorias/{id}` (`status` aberto/enviado/feito). "Copiar para o Claude" gera o texto numerado e marca como enviado. Prefixo `mlh-` (não usar `aj-`: já é dos Ajustes). Teste: `teste-melhorias.js`.
- **Combinado com a usuária (12/10):** ajustes pequenos podem ir **direto para a `main`** (rodar o teste da parte mexida); mudanças grandes (permissão, regra do banco, cálculo) seguem com pull request e todos os testes.

## Arquivos
| Arquivo | Papel |
|---|---|
| `index.html` (~50 linhas) | só a estrutura da página e a ordem dos scripts |
| `css/painel.css` | estilos principais |
| `js/carregar.js` | junta as partes `js/01..09` **num bloco único** (como sempre foi) e depois carrega `modulos/lista.js`. Parte nova → incluir em `PARTES`, na ordem. |
| `js/01-base-producao.js` | estado (`S`), `render`, telas principais, produção e programação |
| `js/02-diario-calendario.js` | diário de bordo dos ranchos e calendário |
| `js/03-analise.js` · `js/04-analise-paineis-acessos.js` | análise PCP (Curva S etc.), painéis por cargo, acessos, telas de TV |
| `js/05-almox-premix.js` | almoxarifado (contagem, conferência, recebimento) e premix |
| `js/06-manutencao-equipe.js` · `js/07-manutencao-coletor.js` | manutenção (chamados, OS, equipamentos, preventivas, peças, QR) e coletor; equipe e cargos |
| `js/08-tablet-acessos-avisos.js` | tablet da parede, crachás, ajuste de acesso por pessoa, avisos, gestor, TV dividida, almox |
| `js/09-silos-final.js` | silos (saldo/consumo), leituras por perfil, API `window.Painel` e `iniciar()` |
| `js/11-meu-menu.js` | "Meu menu" da administradora (esconder módulos do próprio menu; `perfis/{uid}.menuOculto`) |
| `js/10-tablet-producao.js` | tablet: abrir a ordem pela folha (QR, `RA-`, `OP-`, nº), **apontar produção**, **pedir material** (`pedmat`) e quadro de pedidos no diário |
| `js/00-qrcode.js` | biblioteca de QR |
| `painel-firebase.js` | login, telas sem login (QR de chamado e de rancho), adaptador do banco, PWA |
| `config.js` | chaves do Firebase — **não alterar** |
| `firestore.rules` | regras (publicar no console!) |
| `sw.js` | service worker (`VERSAO`; lista `BASE` dos arquivos guardados para uso sem internet) |
| `modulos/` | módulos em arquivos separados (`lista.js` carrega): `rh`, `onedrive`, `backup`, `melhorias` |
| `testes/` | testes automáticos (Firebase simulado + Chrome); `./lote.sh teste-a teste-b` roda vários |

**Importante:** as partes `js/01..09` compartilham o mesmo escopo (são juntadas por `carregar.js`). Uma função de uma parte pode usar a de outra. Não transformar em `<script>` separados (quebra: funções de partes posteriores não existem durante o carregamento das anteriores).

## Testes
```bash
cd testes && npm i playwright && npx playwright install chromium   # 1ª vez
node teste-login.js        # e o teste do que foi mexido (ex.: teste-manut.js, teste-almox.js, teste-modulos.js)
```
- Cada teste imprime `PASSOU`/`FALHOU`. Rodar no máximo 2–3 em paralelo.
- O teste usa um Firebase simulado (`mock-firebase.js`); o hook `window.__T` (só no teste) dá acesso a `S`, `viewOk`, `salvar`.
- Para um módulo novo, criar `testes/teste-<nome>.js` seguindo `teste-modulos.js`.
- **Varredura geral:** `node teste-varredura.js [usuarios…]` abre todas as telas de cada perfil (PC e celular) e lista erros, tela vazia, texto quebrado e rolagem lateral. Rodar depois de mudanças grandes.
- **Consumo:** `node teste-leituras.js` mede quantos documentos cada login lê ao abrir (não deixar subir sem motivo).
- **Cópia de segurança:** toda coleção nova precisa entrar em `COLECOES`/`SUB` do `modulos/backup.js`.

## Coleções principais
`ordens` `entregas` `paradas` `ranchos` `diario` `medicoes` `cargas` `silos` `silomov` `chamados` (chamado = OS) `config/manut` `crachas` `rancrec` `acessos` (permissões; ajustes por pessoa: `extras semMods soVerMods telas acoes bloqCols`) `config/geral`.

## Entregar
- Commit com mensagem em português explicando o que mudou. Preferir **pull request** para a usuária revisar.
- Dizer em uma frase o que ela precisa fazer (ex.: "publicar o firestore.rules no console") ou "nada a fazer, já está no ar".
