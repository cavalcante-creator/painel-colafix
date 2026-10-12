# Pedidos prontos para o Claude Code (RH)

Cole **um pedido por conversa**. Todos seguem o mesmo padrão (o `CLAUDE.md` explica o resto ao Claude Code).

---

## 1. Contrato de experiência (45 + 45 dias)
No módulo RH (`modulos/rh.js`), em Funcionários, controle o contrato de experiência: pela data de admissão, calcule o fim da 1ª etapa (45 dias) e da 2ª (90 dias). Mostre a situação na lista e no cadastro (Em experiência 1ª etapa / 2ª etapa / Efetivado / Desligado na experiência), com botões "Prorrogar para 2ª etapa", "Efetivar" e "Desligar". Avise no Meu dia 7 dias antes de cada vencimento (`Painel.registrarAviso`, seguindo o modelo de Terceirizados). Crie `testes/teste-experiencia.js` com relógio fixo, rode junto com `teste-rh.js` e abra um pull request.

## 2. ASO e exames periódicos
No módulo RH, crie a tela "Exames (ASO)": por funcionário, tipo (admissional, periódico, retorno, mudança de função, demissional), data, validade (padrão 12 meses, configurável por função) e resultado (apto/inapto). Lista com situação Vencido / Vence em X dias / Em dia e aviso no Meu dia 30 dias antes. Guardar em `rh/dados/exames`. Teste `testes/teste-exames.js`, rode e abra pull request.

## 3. Treinamentos de NR com validade
No módulo RH, crie a tela "Treinamentos": cadastro de treinamentos (NR-11, NR-12, NR-35, NR-10, Brigada etc.) com validade em meses, e registro por funcionário (data, carga horária, instrutor, certificado em PDF guardado como as fichas escaneadas). Lista por setor com quem está vencido ou vencendo; aviso no Meu dia 30 dias antes. Guardar em `rh/dados/treinamentos` e `rh/dados/treinamentos_feitos`. Teste, rode e abra pull request.

## 4. Férias
No módulo RH, crie a tela "Férias": calcule o período aquisitivo de cada CLT pela admissão, mostre o limite para conceder (12 meses após o fim do aquisitivo) e registre as férias tiradas (início, dias, abono). Avise no Meu dia 60 dias antes do limite (risco de férias em dobro). Funcionário com férias em andamento aparece com situação "Férias" automaticamente. Guardar em `rh/dados/ferias`. Teste, rode e abra pull request.

## 5. Documentos dos terceirizados
Na tela Terceirizados do módulo RH, acrescente documentos por terceirizado (certidões, ASO, NR, seguro), cada um com validade e arquivo (PDF/foto guardado como as fichas escaneadas). O terceirizado fica com alerta se qualquer documento estiver vencido; aviso no Meu dia 15 dias antes. Teste, rode e abra pull request.

## 6. EPI com troca periódica
Em Funções (EPI e uniforme) do módulo RH, permita informar a periodicidade de troca de cada EPI (ex.: luva 30 dias, calçado 180 dias). Usando as Retiradas, mostre em uma tela "Trocas de EPI" quem está com EPI vencido ou vencendo, e avise no Meu dia. Teste, rode e abra pull request.

## 7. Aniversariantes e tempo de casa
No módulo RH, acrescente a data de nascimento no cadastro de funcionários e uma tela "Aniversariantes": do mês (nascimento) e tempo de casa (1, 5, 10 anos de admissão). Mostre os do dia no Meu dia como aviso simples. Teste, rode e abra pull request.

## 8. Faltas e atestados
No módulo RH, crie a tela "Faltas e atestados": registro por funcionário (data, tipo: falta, atestado, atraso, saída antecipada; dias/horas; CID opcional; arquivo do atestado). Resumo do mês por funcionário e por setor. Guardar em `rh/dados/ocorrencias`. Teste, rode e abra pull request.
