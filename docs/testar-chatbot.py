#!/usr/bin/env python3
"""Teste do login do chatbot (só leitura do resumo do painel).

Como usar (Python 3, nada para instalar):
    python testar-chatbot.py
Pergunta o e-mail e a senha do login do chatbot (a senha não aparece na tela),
entra no Firebase do painel (projeto painel-colafix-2), lê api/resumo e diz o que tem
e de que horas são os números. Também confere que esse login NÃO lê o resto do banco.
"""
import getpass, json, sys, urllib.request, urllib.error

PROJETO = "painel-colafix-2"
CHAVE_WEB = "AIzaSyCCztFZNJIjun_tSLSaERucMCpb5wi2M_I"  # apiKey pública do config.js (identifica o projeto, não é senha)
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJETO}/databases/(default)/documents/"


def pedir(url, corpo=None, token=None):
    cab = {"Content-Type": "application/json"}
    if token:
        cab["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=json.dumps(corpo).encode() if corpo else None, headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}


def main():
    email = (sys.argv[1] if len(sys.argv) > 1 else input("E-mail do login do chatbot: ")).strip()
    senha = getpass.getpass("Senha do login do chatbot: ")

    st, d = pedir(f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={CHAVE_WEB}",
                  {"email": email, "password": senha, "returnSecureToken": True})
    if st != 200:
        msg = d.get("error", {}).get("message", str(st))
        print("✗ Não entrou:", msg)
        if "INVALID" in msg or "NOT_FOUND" in msg:
            print("  Confira o e-mail e a senha em Authentication › Usuários (projeto painel-colafix-2).")
        if "DISABLED" in msg:
            print("  O usuário está desativado em Authentication.")
        return 1
    token, uid = d["idToken"], d["localId"]
    print("✓ Entrou. UID deste login:", uid)

    st, d = pedir(BASE + "api/resumo", token=token)
    if st == 403:
        print("✗ Sem permissão para ler o resumo (403).")
        print(f"  1) Em Firestore › Dados › apibots tem que existir um documento com o ID exatamente igual a: {uid}")
        print("  2) As regras do repositório (firestore.rules) precisam estar publicadas em Firestore › Regras.")
        return 1
    if st == 404:
        print("✗ O login está liberado, mas o resumo ainda não foi gravado (404).")
        print("  Abra o painel com o login da administradora ou do gestor e espere uns minutos.")
        return 1
    if st != 200:
        print("✗ Erro ao ler o resumo:", st, d.get("error", {}).get("message", ""))
        return 1

    f = d.get("fields", {})
    print("✓ Leu o resumo. Assuntos:")
    for k in ("producao", "manutencao", "silos", "estoque", "pessoas"):
        if k in f:
            em = f.get("em_" + k, {}).get("stringValue", "?")
            tam = len(f[k].get("stringValue", ""))
            print(f"   - {k:<11} calculado em {em}  ({tam} caracteres)")
        else:
            print(f"   - {k:<11} ainda não gravado (abra o painel que tem esse dado)")
    if "producao" in f:
        p = json.loads(f["producao"]["stringValue"])
        t = p.get("totalHoje") or {}
        print(f"   Exemplo: produzido hoje {t.get('toneladas', '?')} t de {t.get('metaToneladas', '?')} t de meta.")

    st, _ = pedir(BASE + "ordens?pageSize=1", token=token)
    if st in (401, 403):
        print("✓ Segurança: este login não lê as ordens (só o resumo), como deve ser.")
    else:
        print("⚠ Atenção: este login conseguiu ler as ordens (resposta", st, "). Publique as regras do repositório.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
