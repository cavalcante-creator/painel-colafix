# Resumo do painel para o chatbot

O painel publica um **resumo** com os números da fábrica num único documento do banco: `api/resumo`, no projeto Firebase `painel-colafix-2`.
O chatbot entra com um **login próprio, só de leitura**, e lê esse documento. Esse login não consegue ver mais nada do banco: nem ordens, nem o RH, nem pessoas.

## O que tem no resumo

O documento tem um campo por assunto. Cada campo é um **texto JSON**: é só dar `JSON.parse` / `json.loads`. Ao lado de cada assunto vem a hora em que ele foi calculado.

| Campo | O que tem | Hora do cálculo |
|---|---|---|
| `producao` | o dia (`dia`); cada linha (`situacao`: Produzindo / Parada / Setup / Sem ordem, a ordem rodando e quanto já foi feito; produzido hoje em sacos e toneladas, meta do dia em toneladas, minutos parada); o total do dia (`disponibilidade` em %); o mês (toneladas, meta até hoje e meta do mês); as paradas abertas; quantas ordens estão atrasadas e quantos sacos faltam nelas; se vai faltar cimento (`faltaCimento`) | `em_producao` |
| `manutencao` | chamados abertos, quantos estão sem técnico, máquinas paradas, a lista dos 40 mais recentes (OS, tipo, linha, equipamento, problema, situação, técnico, quando abriu, urgência e prazo), preventivas atrasadas e pedidos de peça em aberto | `em_manutencao` |
| `silos` | cada silo: material, toneladas, capacidade, % de ocupação e quando foi atualizado | `em_silos` |
| `estoque` | itens para **agir hoje** (zerados com venda ou que acabam em até 1 dia) e para **esta semana** (acabam em até 7 dias), com código, produto, estoque, dias até acabar (`ruptura`), pedidos em carteira e linha | `em_estoque` |
| `pessoas` | **só números** do dia: vieram, estão na empresa agora, almoçaram, chegaram depois do horário, não vieram, sem registro, férias, afastados ou de folga, esperados. Sem nomes e sem CPF (LGPD). | `em_pessoas` |

### Quando o resumo é atualizado

- O resumo é calculado pelo painel que está **aberto**: o da administradora, o do gestor e o de quem tem a Análise PCP.
- Cada assunto é regravado quando muda, no máximo a cada 5 minutos, e pelo menos a cada 15 minutos.
- Se ninguém estiver com o painel aberto, o resumo para na última hora gravada.

O chatbot deve conferir o `em_<assunto>`. Se tiver mais de 30 minutos, a resposta deve avisar, por exemplo: "números de 14:20, o painel não está aberto agora".

Cada assunto só aparece depois que algum painel com aquele dado for aberto:

- `pessoas` precisa do painel do gestor ou do RH;
- `estoque` precisa do painel de quem tem a Análise PCP.

## Como ler (passo a passo)

São duas chamadas HTTPS:

1. **Entrar:** `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=CHAVE_WEB`
   - corpo: `{"email": "...", "password": "...", "returnSecureToken": true}`
   - a resposta traz `idToken`, que vale 1 hora, e `refreshToken`.
2. **Ler o resumo:** `GET https://firestore.googleapis.com/v1/projects/painel-colafix-2/databases/(default)/documents/api/resumo`
   - cabeçalho: `Authorization: Bearer <idToken>`
   - cada campo vem como `fields.<nome>.stringValue`.

A `CHAVE_WEB` é a `apiKey` do projeto novo (`painel-colafix-2`) que está no `config.js` do painel. Ela identifica o projeto, não é senha. O e-mail e a senha do login do chatbot são segredo: ficam numa variável de ambiente do chatbot, nunca no código nem em mensagem.

### Python

```python
import json, os, time, requests

PROJETO = "painel-colafix-2"
CHAVE = os.environ["PAINEL_CHAVE_WEB"]          # apiKey do config.js (projeto painel-colafix-2)
EMAIL = os.environ["PAINEL_BOT_EMAIL"]          # login do chatbot (só leitura)
SENHA = os.environ["PAINEL_BOT_SENHA"]
_token = {"id": None, "ate": 0}

def token():
    if _token["id"] and time.time() < _token["ate"] - 60:
        return _token["id"]
    r = requests.post(f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={CHAVE}",
                      json={"email": EMAIL, "password": SENHA, "returnSecureToken": True}, timeout=15)
    r.raise_for_status()
    d = r.json()
    _token.update(id=d["idToken"], ate=time.time() + int(d["expiresIn"]))
    return _token["id"]

def resumo():
    url = f"https://firestore.googleapis.com/v1/projects/{PROJETO}/databases/(default)/documents/api/resumo"
    r = requests.get(url, headers={"Authorization": f"Bearer {token()}"}, timeout=15)
    r.raise_for_status()
    f = r.json().get("fields", {})
    out = {}
    for k in ("producao", "manutencao", "silos", "estoque", "pessoas"):
        if k in f:
            out[k] = json.loads(f[k]["stringValue"])
            out[k]["_calculadoEm"] = f.get("em_" + k, {}).get("stringValue")
    return out

if __name__ == "__main__":
    r = resumo()
    p = r.get("producao")
    if p:
        print("Produzido hoje:", p["totalHoje"]["toneladas"], "t de", p["totalHoje"]["metaToneladas"], "t")
```

### Node.js (18 ou mais novo)

```js
const PROJETO = 'painel-colafix-2';
const { PAINEL_CHAVE_WEB: CHAVE, PAINEL_BOT_EMAIL: EMAIL, PAINEL_BOT_SENHA: SENHA } = process.env;
let tk = { id: null, ate: 0 };

async function token() {
  if (tk.id && Date.now() < tk.ate - 60e3) return tk.id;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CHAVE}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: SENHA, returnSecureToken: true }) });
  if (!r.ok) throw new Error('Login do chatbot recusado: ' + r.status);
  const d = await r.json(); tk = { id: d.idToken, ate: Date.now() + d.expiresIn * 1000 }; return tk.id;
}

async function resumo() {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents/api/resumo`,
    { headers: { Authorization: 'Bearer ' + await token() } });
  if (!r.ok) throw new Error('Resumo não lido: ' + r.status);
  const f = (await r.json()).fields || {}, out = {};
  for (const k of ['producao', 'manutencao', 'silos', 'estoque', 'pessoas'])
    if (f[k]) out[k] = Object.assign(JSON.parse(f[k].stringValue), { _calculadoEm: (f['em_' + k] || {}).stringValue });
  return out;
}

resumo().then(r => console.log(JSON.stringify(r, null, 2)));
```

### Dicas para o chatbot

- Leia o resumo uma vez a cada 1 a 5 minutos e guarde na memória. Ler a cada pergunta gasta a cota de leituras do Firebase à toa.
- Ao usar um modelo de linguagem: mande o JSON do assunto da pergunta e peça para responder **só com esses números**, dizendo a hora do cálculo.
- Erros:
  - **403** = o login não está liberado em `apibots` ou as regras não foram publicadas.
  - **404** = o resumo ainda não foi gravado: nenhum painel publicou desde que as regras entraram.

## O que a administradora faz uma vez (no console do Firebase, projeto painel-colafix-2)

1. **Publicar as regras:** colar o `firestore.rules` do repositório em Firestore › Regras e Publicar.
2. **Criar o login do chatbot:**
   - em Authentication › Usuários › Adicionar usuário, use um e-mail só para isso, por exemplo `chatbot@painel-colafix.app`, e uma senha forte;
   - **não** crie cargo nem acesso para ele em Equipe e cargos;
   - copie o **UID** que aparece na lista.
3. **Liberar a leitura do resumo para ele:** em Firestore › Dados, crie a coleção `apibots` com um documento cujo **ID é o UID copiado**, com um campo `nome` = `Chatbot do gestor`.
4. **Passar ao gestor:** o e-mail e a senha do chatbot, por um canal seguro (pessoalmente ou num gerenciador de senhas, não por WhatsApp), e a `apiKey` do projeto novo, que está no `config.js`.
5. **Para cortar o acesso:** apagar o documento em `apibots` ou desativar o usuário em Authentication.

## Testar o login do chatbot

`docs/testar-chatbot.py` (Python 3, nada para instalar): `python testar-chatbot.py`. Ele pergunta o e-mail e a senha (a senha não aparece), entra, lê o resumo e diz o que falta: login errado, UID que não está em `apibots`, regras não publicadas ou resumo ainda não gravado. No fim confere que o login não lê o resto do banco.
