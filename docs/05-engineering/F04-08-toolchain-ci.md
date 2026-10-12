# F04-08 — Toolchain, versionamento e pipeline de qualidade

> **Estado:** pipeline planejado, **nenhum workflow ou script implementado/testado**. pnpm workspaces é uma recomendação (requer `pnpm-workspace.yaml` na raiz); não escolher versões numéricas no escuro. Verificar versões oficiais suportadas no momento do bootstrap e congelar lockfile.

## Ferramentas propostas

- **pnpm workspace** para `apps/*`, `packages/*`; Node.js LTS compatível com a versão estável de Next/Nest/Prisma selecionada; TypeScript estrito.
- **Biome ou ESLint + Prettier**, apenas um conjunto coerente após comparação; não instalar duas ferramentas conflitantes por estética. Escolher regras que detectem imports proibidos, `any` injustificado e dependências cíclicas.
- **Vitest/Jest** conforme suporte do Nest/Next e decorators do ambiente; **Playwright** para E2E de jornada real e visão responsiva. Banco PostgreSQL real em testes transacionais, evitando mocks que escondem o bug.
- **OpenAPI** gerado/validado a partir de contrato backend, com diffs de compatibilidade e cliente tipado quando apropriado; frontend não importa classes de domínio.
- CI em **GitHub Actions**, com permissões mínimas, versões pinadas de actions, segredos restritos e jobs independentes. Não implantar automaticamente `main` antes de gates mínimos.

## Pipeline de verificação proposto

| Gate | Primeira entrega de Codex | Ao entrar funcionalidade crítica |
|---|---|---|
| Repo install/reprodutibilidade | pnpm frozen-lockfile, scripts de build por app | nenhuma dependência sem justificativa e licença |
| Types e lint | TypeScript strict, política imports, lint/format consistente | sem supressões desnecessárias ou ciclos |
| Testes unitários | smoke de cada app e domínio inicial | regras de estado/erro/idempotência por módulo |
| Integração DB | conectar DB de teste isolado quando necessário | DB-001–028 e migrations com rollback verificado |
| Autenticação | contratos e mock de rede apenas no bootstrap | AUTH-001–020, CSRF, WebAuthn/recovery e sessão |
| Stripe/R2 | clients não inicializados se sem chave no CI | ST/R2 específicos, webhooks raw, retry/timeout |
| Segurança | secrets scan e dependências | SA-001–012 e OWASP ASVS aplicável |
| E2E | renders e health estático real, sem pagamentos | CA-001–026, jornadas, acessibilidade WCAG 2.2 AA |
| Infraestrutura | documentação de env/deploy | RENDER/SUPABASE/VCL/JOB/restore com prova |

## Política de pull request / publicação

- Um escopo por PR/commit, diffs pequenos; `README`, ADR e contrato atualizados quando decisão efetiva mudar.
- `git diff --check`, formatação, lint, typecheck, builds e testes aplicáveis. Relatar execução **de verdade** (com comando, código de saída e ambiente), nunca “tudo verde” presumido.
- Testes com segregação de dados; arquivo `.env.example` só nomes e exemplos claramente falsos; `.env` real fora do Git.
- Build de packages compartilhados determinístico e sem importar dependências de runtime backend para frontend; review do resultado público do bundle.
- Versão de OpenAPI/schemas/eventos mantida estável; breaking change exige revisão e compatibilidade.

Fontes úteis (não são evidência de execução): https://pnpm.io/workspaces/ · https://docs.nestjs.com/modules · https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites
