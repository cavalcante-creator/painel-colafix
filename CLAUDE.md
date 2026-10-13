# Painel Colafix — instruções para o Claude Code

Sistema interno de uma fábrica (PCP, produção, silos, manutenção, almoxarifado, TVs). JavaScript puro, **sem build**.
Publicado pelo **GitHub Pages** a partir deste repositório (todo commit na `main` vai para o ar em ~1 minuto).
Banco: **Firebase/Firestore**, projeto **`painel-colafix-2`** (desde 13/10/2026, conta Google da Iasmyn), banco padrão **`(default)`** (custo por leitura: economizar). O projeto antigo `painel-colafix` (banco `default`, sem acesso ao console) só abre com `?antigo=1`, para tirar a cópia de segurança.

## Regras de ouro
1. **Não reescrever** nada que funciona. Mudanças pequenas e testadas.
2. **Módulo novo = arquivo novo** em `modulos/<nome>.js` (copiar `modulos/exemplo.js`) + acrescentar o nome em `modulos/lista.js`. **Não** colocar módulo novo dentro do `index.html`.
3. Usar só a API `window.Painel` (ver abaixo). Precisando de algo do `index.html` que a API não expõe, acrescentar à API (fim do `index.html`, bloco `API PARA MÓDULOS`) — mudança mínima.
4. **Regras do Firestore** (`firestore.rules`): se mudar, **avisar a usuária** que ela precisa colar e publicar no console do Firebase (projeto `painel-colafix-2`). O arquivo no GitHub não vale sozinho.
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
- **Telas (desde 12/10, como o exemplo "Painel do RH · exemplos"):** Início · Agenda · Funcionários · Fichas do mês · Documentos e contratos · Férias e prazos · Cadastros · Terceirizados. Quem só tem o RH vê essas telas na barra lateral (`navSolo`, usa `Painel.modsVis()`). "Dia a dia", "Controle de EPI" e "Retiradas" saíram do menu (os dados `presenca`/`retiradas` continuam guardados).
- **Fichas do mês:** situação por pessoa em `rh/dados/fichasmes/{AAAA-MM}` (`impressas.{funcId}`, `assinadas.{funcId}`) + arquivos escaneados da pasta do mês. Duas formas de ver (lista com prévia / por setor), lembrada no aparelho. O gerador continua em `rh-fichas.html`; a ponte painel → ficha é `window.FICHAS` (`preparar({mes,nomes,porSetor,imprimir})`, `previa(nome,mes)`), e a ficha avisa `RHAPI.fichasImpressas` ao imprimir/salvar PDF. A ficha impressa não mudou.
- **Documentos e contratos:** modelos em `rh/dados/modelos` (HTML simples; campos = `<span class="rh-tk" data-k="NOME">`; no Word, `{NOME}`, `{CPF}`…), histórico em `rh/dados/docsgerados`. Salário e jornada ficam no cadastro do funcionário. Não inventar texto de contrato: a RH cadastra os modelos.
- **Documentos — campos perguntados:** `{?Pergunta}` no Word ou o botão "Campo perguntado" (`<span class="rh-tq" data-q="…">`); o painel pergunta na hora de gerar (pergunta com "data"/"dia" vira calendário) e guarda as respostas em `docsgerados.respostas`. Campos de férias (`FERIAS_INICIO`, `FERIAS_FIM`, `FERIAS_DIAS`, `FERIAS_RETORNO`, `PERIODO_AQUISITIVO`) e do PJ (`ULTIMA_TROCA`, `PROXIMA_TROCA`).
- **Férias e prazos (pedido da RH em 12/10):** CLT: períodos de 12 meses pela admissão, 12 meses para conceder; férias em partes (10+20, 15+15 ou 30) em `rh/dados/ferias` (`status` marcada/cancelada/tirada; `anterior:true` = tirada antes do painel). **Ajustar** (linha da pessoa ou ficha da pessoa): a RH diz, período a período, quantos dias já tirou antes do painel (`origem:'ajuste'`, troca o registro anterior daquele período). PJ: troca a cada 3 meses **da última troca** (sem troca, da admissão); `ultimaTroca` + `trocas[]` no cadastro. Avisos **15 dias antes** (`rh/config.prazoAviso`), no Início e no Meu dia. Aviso de demissão: sem cálculo (a RH digita).
- **Experiência 45 + 45:** aba Experiência em Férias e prazos; 1ª etapa até admissão+44, 2ª até +89; `exp.status` no cadastro (prorrogado/efetivado/desligado). Aviso 15 dias antes.
- **Desligamento:** `desligar()` grava `status`, `desligamento`, `desligMotivo`. Data no futuro (aviso trabalhado) → `desligAgendado:true`, continua ativo e vira Desligado sozinho no dia (`aplicarDesligAgendados`). Modelos com `desliga:true` oferecem desligar ao gerar. Quem saiu continua nas fichas do mês da saída.
- **Terceirizados:** `docs[]` {id, nome, validade, arquivo, removido} com aviso 15 dias antes. **Aniversários:** `nascimento` no cadastro; cartão no Início (aniversariantes e 1, 5, 10… anos de casa).
- **Dia a dia (12/10):** **Agenda** (`agendaItens`: tudo o que vence, 30/60/90 dias + "já passou"; "Mandar para o Outlook" baixa um `.ics` com lembrete na véspera) e **Relatório do mês** (admissões, desligamentos, férias, experiência, afastados; imprimir e Excel). **Ficha completa da pessoa** (`R.pess`, busca no Início, nome clicável em Funcionários). **Nova admissão** (cadastro → documentos entregues `admEntregues[]`, lista em `rh/config.docsAdmissao` → contrato → ficha do mês). **Várias pessoas** em Gerar contrato (um documento por pessoa, perguntas valem para todos; modelos que desligam: só um por vez). **Importar planilha** (botão único em Funcionários, antigo "Carga inicial" + "Importar"): cria quem não existe (Nome, CPF válido e Vínculo; CLT = Colafix, PJ com "Empresa (PJ)") e completa quem existe (acha pelo Código ou CPF; nome, CPF e vínculo de quem existe não mudam); prévia antes de gravar; datas do Excel lidas como número de dias, sem fuso.
- Testes do RH: `teste-rh.js`, `teste-rhnovo.js` (telas novas), `teste-rhdiaadia.js` (agenda, relatório, ficha, admissão, lote, carga), `teste-rhprazos.js` (férias e PJ), `teste-rhajuste.js` (ajuste das férias por período), `teste-rhmais.js` (experiência, desligamento, documentos dos terceirizados, aniversários), `teste-terc.js`, `teste-empresa.js`, `teste-onedrive.js` (Microsoft simulada), `teste-rhextras.js` (perguntas, ocorrências, itens, feriados, ficha pelo celular).

- **Pedidos de 13/10:** Início do RH é um **painel** (2ª versão, 13/10): faixa de boas-vindas com resumo do dia, busca e botões; 4 números com ícone (no quadro com mini gráfico de 12 meses, entradas do mês, de férias agora, em experiência); **Próximos 7 dias** em colunas; Precisa de você (avisos); Pessoas (aniversário e tempo de casa hoje, próximos aniversários, quem chegou); Quadro (CLT×PJ, por setor, tempo de casa); atalhos. **Sem as fichas**. **Cadastros** (tela `rhfuncoes`): abas Funções e EPIs · Setores (`rh/config.setores`; setor novo digitado no cadastro entra sozinho) · Configurações (dias de aviso, cidade, documentos da admissão, `fichasDesde`). **Fichas do mês começam em `rh/config.fichasDesde`** (padrão `2026-11`; nos testes o `manut-seed` põe `2000-01`). **Um botão só: Nova admissão** (o "Novo funcionário" saiu; `rh-novo` continua no código). **Novo desligamento** ao lado (Início e Funcionários): `rh-deslnovo` abre `formDesl` sem pessoa, com a lista para escolher (`#rh-desf`). **PJ usa CNPJ** (`cnpj` no cadastro, `cnpjOk`, `docF/docRot`; CLT continua CPF); campo de documento `{CNPJ_PJ}`; planilha tem a coluna "CNPJ (PJ)". Funcionários e Terceirizados não mostram mais o aviso dos terceirizados (fica no Início e no Meu dia). Teste: `teste-rhcad.js`.
- **Ideias do RH feitas em 13/10:** **Perfil da pessoa** (`vPessoa`: cartão com iniciais, tempo de casa, dados; `historia(f)` = linha do tempo com admissão, experiência, férias, trocas do PJ, documentos, fichas assinadas, desligamento; à direita férias, PJ, experiência, EPI da função e documentos). **Mapa do ano** em Férias e prazos (`vMapaFer`, `R.pzv='mapa'`: barras por pessoa e setor, aviso de quem sai junto no mesmo setor, último dia para dar férias, trocas do PJ). Em Funcionários: **Lista · Por setor · Admissões** (`R.fview`; `vOrg` com vagas de `rh/config.vagas` editadas em Cadastros › Setores; `vQuadroAdm` com Documentos → Contrato e ficha → Experiência → Efetivados). **Indicadores** na Agenda (`R.agv='ind'`, `indDados/vIndicadores/indHtml`: quadro, rotatividade 12 meses, tempo médio de casa, efetivados na experiência, férias vencidas, quadro mês a mês, motivos de saída; imprimir/PDF). Aniversários: cartão "Aniversários do mês" no Início e na Agenda (vem do campo Nascimento). Teste: `teste-rhideias.js`.
- **Pedidos de 13/10 (3ª leva):** **Perguntas rápidas** no Início (`cartaoPerg`/`pergDados`: aniversariantes do mês, por setor, experiência, férias, sem nascimento, cadastro incompleto, PJ, itens, ocorrências; Imprimir/Copiar/WhatsApp). **Ocorrências** em `rh/dados/ocorrencias` {funcId,data,tipo,motivo,testemunhas,dias,removido} no perfil e na história; "Gerar documento" abre o modelo de advertência/suspensão com `R.dg.ocId` (campos `{OCORRENCIA_DATA}`, `{OCORRENCIA_MOTIVO}`, `{OCORRENCIA_TIPO}`, `{OCORRENCIA_TESTEMUNHAS}`, `{SUSPENSAO_DIAS}`; também `{NASCIMENTO}`, `{ENDERECO}`). **Itens emprestados** em `rh/dados/emprestimos` {funcId,item,obs,desde,devolvido}; o desligamento mostra o que devolver e o Início avisa quem saiu com item. **Feriados:** `config/feriados` {lista:[{data,nome,tipo}], tirados:[]} + nacionais calculados (Páscoa) + os antigos `config/geral.feriados`; funções no js/04 (`feriadosAno`, `feriadoDe`, `feriados()` usada nos dias úteis da produção), API `Painel.feriadosAno/feriadoDe/ferNac/ferSug/ferCal`; tela Cadastros › Feriados; aparecem na Agenda, no Calendário da produção e no aviso da CLT ao marcar férias (não começar 2 dias antes de feriado/domingo). Regra: o RH grava `config/feriados`. **Ficha pelo celular:** convite `rh/dados/convites/{token 20}` {nome,msg,docs,ateMs,usado} (mensagem editável, `{NOME}`; a última fica em `rh/config.convMsg`; aparece no WhatsApp e no topo da ficha como "Recado do RH"); página pública `ficha.html?c=` (sem login) cria `rh/dados/fichascand/{token}` e fotos `rh/dados/fichascandarq/{token}-{n}`; "Começar admissão" preenche a Nova admissão (`fichaCand`), e ao salvar `fichaCandFinalizar` guarda as fotos (OneDrive `Admissões/<nome>/` ou arquivos do painel), marca `admEntregues` com `url`, marca a ficha `usada` e apaga convite e fotos. Cadastro ganhou endereco, cep, email, banco, agencia, conta, pix, emergencia. Teste: `teste-rhextras.js`.
- **Planilha do EPI (13/10):** Cadastros › Funções e EPIs › **Importar planilha do EPI** (`fimpLer`/`vFimp`/`fimpGravar`) lê as abas "Base EPIs por Função" e "Base Uniformes por Função" (pares EPI n/CA n e Uniforme n/Tamanho; ignora "Cadastrar…"/"Cadastrado"), mostra a prévia (nova/atualiza/sem mudança) e grava em `rh/dados/funcoes`; tamanho/CA que já estava no painel fica; **máximo 9 itens** (a ficha impressa tem 9 linhas; o resto aparece em vermelho na prévia). As declarações da aba "Ficha (Modelo)" vão para `rh/config.declEpi/declUniforme` só se estiverem vazias. **Funcionários › Importar planilha** aceita o mesmo arquivo: acha a aba com Nome e CPF (Base Colaboradores) e lê Tipo, Empresa e Data de admissão; PJ que veio só com CPF entra ("sem CNPJ, só CPF"). **Sem importar:** as 32 funções da planilha (com EPIs, CA e uniforme) e as declarações estão em `modulos/rh-epi-padrao.json` (só funções, **nada de pessoas** — o repositório é público) e entram sozinhas uma vez (`funcoesPadrao`: só acrescenta função que não existe e declaração vazia; marca `rh/config.funcoesPadrao`). Pessoas (CPF) **nunca** vão para o repositório: só pela importação. Nos testes o json responde 404, menos com `EPI_PADRAO=1`. Teste: `teste-rhepi.js` (precisa de `npm i --no-save xlsx@0.18.5`).
- **Ajustes separados por assunto** (js/02, `AJ_GRUPOS`): Produção · Silos e cimento · Almoxarifado · Backup e dados (· Outros). As seções só são escondidas; o "Salvar ajustes" lê todos os campos.

## Projeto Firebase novo (13/10/2026)
- A cópia (Ajustes › Backup) agora importa também `acessos`; os `perfis` importados ganham `importado:true`. Em Equipe e cargos essas pessoas aparecem como **"sem login"** (`eqSemLogin`); **Recriar login** (`eq-recriar`) ou criar alguém com o mesmo usuário (inclusive em "Várias pessoas") herda cargo e ajustes (`eqHerdar`: copia `acessos/{antigo}` para o uid novo com `herdadoDe` e marca o antigo `apagado`, `migradoPara`). Pode usar a mesma senha. Perfis novos gravam `projeto`. Teste: `teste-backup.js`.
- Primeiro acesso: o botão é **"Primeiro acesso"** na tela de entrar (só a dona); se o perfil não gravar (regras ainda não publicadas) a conta é criada mesmo assim.

## Organização dos módulos (pedidos de 13/10, `js/12-organizacao.js`)
- **Produção:** Programação · Calendário · Indicadores. **Almoxarifado** (módulo `premix`): **Fila do almox** (`dbfila`, primeiro) · Diário de bordo (`diario`) · Monitor (`dbmon`) · Fichas · Receitas. **Telas de TV:** Apresentação + TV da fábrica (`tvfab`). **Tablet da produção** (`tabprod`, por enquanto sem uso; no menu só para o cargo da linha/`paradas`/`tabprod`): Tela da linha (`linhatv`, ainda abre para quem tem Produção) e Paradas.
- Permissões mantidas por `viewOk` (diário/fila/monitor: producao, almox, premix; tvfab: tv, telas, producao, analise; paradas: paradas, tabprod). Quem chama `go('diario')` com `S.dbo.modo='fila'` cai na Fila (Meu dia, painéis). A fila usa sempre o dia da entrega (o que roda amanhã aparece hoje). Botão da ordem "Mandar p/ fila do almox" (`envAlmBtn`).
- Layout: filtros da Programação mais baixos e os botões de cada ordem numa linha embaixo do produto (≥1241px); diário cabe em 1366 (tabela fixa); calendário com barra fixa e feriado em cinza. Visão do gestor: quadro de paradas abre a Manutenção. Teste: `teste-organizacao.js`.
- **Celular:** Programação vira cartão por ordem (≤640px); Calendário no celular é sempre a lista por dia (todos os cargos, `window.innerWidth<700`) com barra pequena (`.calm`: semana, linha em lista, "Filtros" com busca/ir para/atrasadas/sábado/encerradas) e dia de hoje destacado.

## Inventário = o programa "Gestão de Almoxarifado" (pedido de 13/10, `js/13-inventario.js` + pasta `inventario/`)
- O módulo Inventário (`almox`) tem uma tela só, `inventario`: o programa da Iasmyn **igual** (mesmo layout e funções), num iframe fixo sobre `#inv-slot` (`invSync`, como as fichas do RH). **Só a Conferência** (Contagem · Recebimento · Auditoria); as **Transferências do programa não entram** (pedido de 13/10).
- Quem só tem o módulo `almox` (conferentes, auditor, supervisor sistema) vê o programa **em tela cheia** (`body.inv-solo`, `invSolo()`); o botão Sair do programa sai do painel. Os outros veem dentro do painel (Sair escondido). Ao sair/trocar de pessoa o iframe é fechado.
- Os dados ficam no banco do painel, nas mesmas coleções das telas antigas: `conferencias`, `auditorias` (id = `num_cod_loc`, guarda `auditKey` do programa), `recebimentos`, `alxfila` (aberta/descartada). Itens = `itens.almox` {locais, grupos, un, conv}; saldo do sistema = `pcpbase/itens`.
- A ponte é `inventario/js/ponte-painel.js`: troca o `fetch` da planilha/Apps Script por `window.Painel.inv` (`usuario`, `pronto`, `dados`, `versao`, `gravar`, `pedido`, `sair`) e entra sozinha com o cargo do painel (`montarPerfil`: contar/receber/auditar/verAud + locais). O que outra pessoa grava aparece em ~2,5 s.
- Os arquivos do programa em `inventario/` são a cópia do original; mudanças lá: mínimas (`state.js`: sem o tempo de sessão no painel; `config-sheets.js`: sem chaves). O e-mail automático (Apps Script) não existe no painel.
- Atalhos antigos `go('alxcont'|'alxconf'|'alxrec'|'alxaud')` abrem o programa na parte certa. Para voltar às telas antigas: `config/geral.invAntigo = true`.
- A varredura lê o conteúdo dentro do iframe. Teste: `teste-inventario.js`.

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
| `js/13-inventario.js` | Inventário = programa "Gestão de Almoxarifado" (pasta `inventario/`) num iframe; ponte `Painel.inv` |
| `js/12-organizacao.js` | organização dos módulos (Almoxarifado, Telas, Tablet da produção) e ajustes de layout de Programação/Diário/Calendário |
| `js/11-meu-menu.js` | "Meu menu" da administradora (esconder módulos do próprio menu; `perfis/{uid}.menuOculto`) |
| `js/10-tablet-producao.js` | tablet: abrir a ordem pela folha (QR, `RA-`, `OP-`, nº), **apontar produção**, **pedir material** (`pedmat`) e quadro de pedidos no diário |
| `js/00-qrcode.js` | biblioteca de QR |
| `painel-firebase.js` | login, telas sem login (QR de chamado e de rancho), adaptador do banco, PWA |
| `config.js` | chaves do Firebase (projeto novo + o antigo com `?antigo=1`) — **não alterar** sem a usuária pedir |
| `firestore.rules` | regras (publicar no console!) |
| `sw.js` | service worker (`VERSAO`; lista `BASE` dos arquivos guardados para uso sem internet) |
| `modulos/` | módulos em arquivos separados (`lista.js` carrega): `rh`, `onedrive`, `backup`, `melhorias` |
| `testes/` | testes automáticos (Firebase simulado + Chrome); `./lote.sh teste-a teste-b` roda vários |

**Importante:** as partes `js/01..09` compartilham o mesmo escopo (são juntadas por `carregar.js`). Uma função de uma parte pode usar a de outra. Não transformar em `<script>` separados (quebra: funções de partes posteriores não existem durante o carregamento das anteriores).

## Testes
```bash
cd testes && npm i playwright && npx playwright install chromium   # 1ª vez (teste-rhepi: npm i --no-save xlsx@0.18.5)
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
