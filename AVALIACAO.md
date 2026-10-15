# Avaliação — GitHub Actions com IA

## Tarefa 1 — CI
- Workflow: `ci.yml`
- Evidência: execução de CI com os checks aprovados.
- Link: [Adicionar link da execução](COLE_AQUI_O_LINK)

## Tarefa 2 — Proteção da branch main
- Evidência: [Adicionar link do teste de proteção da branch](COLE_AQUI_O_LINK)
- Observação: registrar o resultado do teste de bloqueio de push direto e da exigência de Pull Request.

## Tarefa 3 — Revisão de código com IA
- Workflow: `.github/workflows/revisao-ia.yml`
- Pull Request com revisão publicada: [PR nº 41](https://github.com/brayanxss/brayanxss.github.io/pull/41)
- Comentário da IA: [Revisão de segurança](https://github.com/brayanxss/brayanxss.github.io/pull/41#issuecomment-6198835150)

### Análise crítica da resposta da IA
A IA identificou um risco de injeção de prompt (XPIA), pois o diff do Pull Request é incluído no prompt enviado ao modelo. O conteúdo alterado por um contribuidor pode conter instruções maliciosas que tentem influenciar a revisão. A recomendação é instruir o modelo a tratar o diff como dado não confiável e nunca seguir instruções contidas nele. O achado deve ser verificado tecnicamente, pois a saída da IA não é prova definitiva de vulnerabilidade.

### Teste de SQL injection
- PR com a vulnerabilidade de teste: [Adicionar link]
- Comentário da IA identificando o problema: [Adicionar link]
- PR com a correção: [Adicionar link]
- Comentário da IA confirmando a correção: [Adicionar link]

### Teste de permissão
- Execução com permissão de escrita removida: [Adicionar link do log de erro]
- Evidência de que a permissão foi restaurada: [Adicionar link]

## Tarefa 4 — Migrações D1
- Workflow: `migrar.yml`
- Evidência de migração aplicada no D1 remoto: [Adicionar link]
- Evidência de execução sem alterações em `migrations/`: [Adicionar link]

## Respostas finais

1. **Por que proteger a branch main?** Para impedir alterações diretas sem revisão e verificações automatizadas.
2. **Qual é o papel da CI?** Executar testes e verificações automaticamente antes da integração das mudanças.
3. **Quais são os limites da revisão por IA?** A IA pode deixar passar problemas, produzir falsos positivos ou ser manipulada por conteúdo não confiável. Os achados precisam de validação independente.
4. **Por que automatizar migrações D1?** Para aplicar alterações de banco de dados de forma consistente e rastreável após mudanças aprovadas.
