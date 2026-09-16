# Testes de falha

## 1. Callback sem cookie temporário

Preparação:
Janela anônima, sem cookie `__Host-oauth-tx`.

Request enviado:
`GET /oauth/callback/google?code=teste&state=teste`

Resultado esperado:
HTTP 400, indicando que a transação OAuth está ausente.

Resultado observado:
HTTP 400 — `Transacao OAuth ausente.`

## 2. State alterado

Preparação:
Iniciado um fluxo OAuth válido e alterado o valor do `state` antes do callback.

Request enviado:
Callback OAuth com `state` diferente do armazenado.

Resultado esperado:
HTTP 400 — `State invalido.`

Resultado observado:
HTTP 400 — `State invalido.`

## 3. Reutilização da transação OAuth

Preparação:
Concluído um fluxo OAuth válido e realizada uma nova tentativa de utilizar a mesma transação.

Request enviado:
Repetição do callback OAuth já utilizado.

Resultado esperado:
HTTP 400, indicando que a transação não existe ou não é mais válida.

Resultado observado:
HTTP 400 — `Transacao OAuth ausente.`

## 4. Sessão expirada

Preparação:
Executado no D1:

`UPDATE sessions SET expires_at=0;`

Request enviado:
`GET /api/me`

Resultado esperado:
HTTP 401 — sessão não autenticada.

Resultado observado:
HTTP 401 — `{"authenticated":false}`

## 5. Logout com Origin inválida

Preparação:
Enviada uma requisição POST para `/oauth/logout` com Origin diferente de `PUBLIC_BASE_URL`.

Request enviado:
`POST /oauth/logout` com `Origin: https://example.com`

Resultado esperado:
HTTP 403 — `Origin invalida.`

Resultado observado:
HTTP 403 — `Origin invalida.`

## 6. Reutilização de sessão revogada

Preparação:
Copiado temporariamente o cookie `__Host-session`, executado logout e restaurado o cookie revogado.

Request enviado:
`GET /api/me` utilizando a sessão que havia sido revogada.

Resultado esperado:
HTTP 401 — sessão não autenticada.

Resultado observado:
HTTP 401 — `{"authenticated":false}`
