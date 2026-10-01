# Desenho Assinado

Página que recebe um número inteiro entre 1 e 100 e devolve uma figura em SVG, assinada com o e-mail verificado da conta Google autenticada.

Nome: brayanxss
RA: 2026109342
URL: https://brayanxss-github-io.pages.dev/

## Reaproveitamento do projeto

Este projeto reaproveita a interface e a estrutura visual do site anterior, adaptadas para a atividade "Desenho Assinado".

## Funcionamento

O navegador autentica o usuário com Google Identity Services e recebe um `id_token`.
Ao gerar o desenho, `public/script.js` envia o número e o token para `POST /api/desenho`.
A Pages Function valida o token usando o endpoint `https://oauth2.googleapis.com/tokeninfo?id_token=...`, confere `aud` com a variável `GOOGLE_CLIENT_ID` e exige `email_verified` como verdadeiro.
O servidor obtém o e-mail diretamente do token e executa `gerarDesenho(numero, email)`.

A função de geração fica em `lib/desenho.js`, fora da área pública, e não existe `public/desenho.js`.

## Cloudflare Pages

Framework preset: `None`
Build command: vazio
Build output directory: `public`

Configure no projeto do Cloudflare Pages a variável de ambiente:

`GOOGLE_CLIENT_ID=<seu Client ID Web do Google>`

O mesmo Client ID deve ser colocado no atributo `data-client_id` de `public/index.html`.
Em Google Cloud Console, a origem autorizada deve incluir:

`https://brayanxss-github-io.pages.dev`

## Estrutura

```text
public/index.html
public/style.css
public/script.js
lib/desenho.js
functions/api/desenho.js
evidencias/exemplo.svg
README.md
```

## Evidência

O RA termina em `42`, portanto a evidência deve ser gerada no site publicado usando o número `42` e uma conta Google com e-mail verificado. Depois do login, baixe o SVG gerado e salve-o como `evidencias/exemplo.svg` antes do commit final.
