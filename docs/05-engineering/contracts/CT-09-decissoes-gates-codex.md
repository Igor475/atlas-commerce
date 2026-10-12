# CT-09 — Aprovações restantes e gate do primeiro prompt Codex

> **Aprovado agora (12/10/2026):** separação física `apps/storefront`, `apps/admin` e `apps/api`, pnpm workspace e monólito modular NestJS. Essa decisão é **independente** da aprovação futura de contratos HTTP específicos.

## Decisões propostas neste pacote (a ratificar antes de implementar o domínio)

| Chave | Proposta F04-02 | Impacto / ação |
|---|---|---|
| CTD-01 | OpenAPI **3.1**, prefixo `/api/v1`, RFC 9457 para erros | validar contratos e controllers; OpenAPI do health fora do prefixo |
| CTD-02 | JSON de money `amountCents` inteiro BRL, cursor estável | confirmar DTOs por recurso sem alterar RN |
| CTD-03 | Endpoints prioritários de [CT-01](CT-01-inventario-http.md) | rotas ainda não implantadas; conferir comportamento de auth/quoting |
| CTD-04 | Evento interno v1 via JSON Schema 2020-12, outbox/inbox | sem promessa de queue externa ou executor 24×7 |
| CTD-05 | Sessões e CSRF com host próprio; Mfa challenge separado | host real/RP ID/CSRF precisam de spike; **não** trocar para Supabase Auth |
| CTD-06 | Manual refund por duas identidades e alçada definida | **bloqueado para implementação final** até alçadas numéricas/hierarquia autorizadas |

## Pode avançar antes da ratificação total?

**Sim, exclusivamente um bootstrap de estrutura sem domínio funcional**: pastas e arquivos de workspace, linters/typecheck, dois Next.js sem negócio, NestJS health/config segura, `packages/contracts` com placeholders inofensivos, CI mínimo. Isso precisa de prompt detalhado e versões revisadas; não autoriza endpoints de checkout, Stripe, webhooks, login, MFA, refunds, R2 nem migration em Supabase real.

## Gates do prompt Codex de bootstrap (F04-03)

- Entrada: commit GitHub atualizado, [F04-01 aceita](../F04-01-estrutura-monorepo.md), [toolchain F04-08](../F04-08-toolchain-ci.md), [safety F04-09](../F04-09-matriz-de-gates.md) e esta documentação.
- Congelar Node/pnpm/Next/Nest/TypeScript **após verificar versões e compatibilidade** no ambiente Codex; documentar no README/lockfile, sem inventar LTS.
- Fazer somente alterações expressas; preservar todos os arquivos BRD/ADR/SEC/diagramas e README do portfólio.
- Não criar banco/projeto Supabase/R2/Render/Vercel nem chamar API externa com chaves. Não ativar Stripe live; sem Docker/microservice/worker inventado.
- Verificar `git diff --check`, `pnpm install --frozen-lockfile` **após gerar o lockfile**, `lint`, `typecheck`, `build`, testes básicos de health/frontend e anti-imports proibidos. Sem false positive por mocks.
- Relatório final com arquivos, comandos/resultados, limitações Free e itens que não foram implementados/testados.

## Próxima sequência planejada

1. Ratificar o contrato HTTP/eventos F04-02 ou solicitar refinamentos.
2. Criar prompt completo de **F04-03 — Bootstrap pelo Codex** (somente estrutura/toolchain e health mínima).
3. Fazer spike Prisma↔Supabase em DB de teste/isolado **com autorização separada**, depois auth/cookie/proxy e locking real.
4. Liberar módulos de negócio em etapas, cumprindo DB/ST/SA/AUTH/CA/infra.

**Não considerar esta especificação um aval para implementar checkout de produção.**
