# Avaliação — GitHub Actions com IA

## Tarefa 1 — Integração contínua (CI)

- **Workflow:** `ci.yml`
- Execução do CI: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38755470841)
- Execução corrigida e aprovada: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38756333556)
- Execução com falha: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38758132281)

### Resultado

O pipeline de integração contínua automatiza verificações do projeto e permite identificar falhas durante o desenvolvimento. Após a identificação dos problemas, as correções podem ser validadas por novas execuções do workflow.

## Tarefa 2 — Proteção da branch `main`

### Evidências

- Pull Request: [PR #1](https://github.com/brayanxss/brayanxss.github.io/pull/1)
- Execução do CI com falha: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38758132281)
- Execução do CI aprovada: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38756333556)

### Resultado

O uso de Pull Requests e verificações automatizadas contribui para um fluxo de desenvolvimento mais seguro e organizado. A proteção da branch principal tem como objetivo exigir revisão e validações antes da integração das alterações.

## Tarefa 3 — Revisão de código com IA

- **Workflow:** `.github/workflows/revisao-ia.yml`
- Pull Request com revisão publicada: [PR #41](https://github.com/brayanxss/brayanxss.github.io/pull/41)
- Comentário da IA: [Revisão de segurança](https://github.com/brayanxss/brayanxss.github.io/pull/41#issuecomment-6198835150)

### Análise crítica da resposta da IA

A revisão identificou um possível risco de injeção de prompt (XPIA), relacionado ao processamento do diff do Pull Request pelo modelo. Um contribuidor pode incluir conteúdo malicioso que tente influenciar a análise automatizada. Para reduzir esse risco, o modelo deve tratar o conteúdo do diff como dado não confiável e não obedecer a instruções contidas nele. As conclusões geradas pela IA devem ser analisadas criticamente e validadas tecnicamente.

### Teste de SQL injection

- PR com exemplo vulnerável: [PR #46](https://github.com/brayanxss/brayanxss.github.io/pull/46)
- Comentário da IA identificando o problema: [Ver comentário](https://github.com/brayanxss/brayanxss.github.io/pull/46#issuecomment-6199311943)
- PR com a correção: [PR #47](https://github.com/brayanxss/brayanxss.github.io/pull/47)
- Comentário da IA após a correção: [Ver comentário](https://github.com/brayanxss/brayanxss.github.io/pull/47#issuecomment-6199344535)

### Resultado

O exemplo de teste demonstrou o risco da concatenação direta de valores em consultas SQL. A correção utilizou uma consulta parametrizada com `?` e `.bind(name)`, evitando a inserção direta do valor na instrução SQL. A revisão posterior da IA analisou a alteração. O teste foi realizado em arquivos de demonstração isolados.

### Teste de permissões

- Pull Request: [PR #48](https://github.com/brayanxss/brayanxss.github.io/pull/48)
- Execução do GitHub Actions: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38786210288)

O teste permite analisar o comportamento do workflow diante de uma execução com falha e a importância das permissões necessárias para publicar comentários nos Pull Requests.

## Tarefa 4 — Migrações Cloudflare D1

- **Workflow:** `.github/workflows/migrar.yml`
- Pull Request com migração de teste: [PR #50](https://github.com/brayanxss/brayanxss.github.io/pull/50)
- Execução do workflow: [Ver execução](https://github.com/brayanxss/brayanxss.github.io/actions/runs/38790287444)

### Resultado

O workflow foi configurado para executar após alterações em arquivos dentro de `migrations/**`, na branch `main`. A automação utiliza o Wrangler para aplicar migrações no banco D1 remoto. O filtro por caminhos evita executar esse workflow em alterações que não envolvam arquivos de migração.

## Respostas finais

1. **Por que proteger a branch `main`?**  
   Para organizar o processo de integração, exigir revisão das alterações e reduzir o risco de introduzir erros no código principal.

2. **Qual é o papel da CI?**  
   Automatizar testes e verificações, permitindo identificar problemas rapidamente durante o desenvolvimento.

3. **Quais são os limites da revisão por IA?**  
   A IA pode deixar passar vulnerabilidades, gerar falsos positivos ou ser influenciada por conteúdo não confiável. Por isso, seus resultados devem ser revisados e validados tecnicamente.

4. **Por que automatizar migrações D1?**  
   Para padronizar a aplicação de alterações no banco de dados e integrar esse processo ao fluxo de desenvolvimento, com maior consistência e rastreabilidade.
