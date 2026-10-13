# Desenvolvimento local

Este repositório contém somente o **bootstrap técnico** do Atlas Commerce. Não há domínio comercial, banco, autenticação, Stripe, R2, filas, checkout ou interface final implementados.

## Toolchain fixada

| Ferramenta |    Versão |
| ---------- | --------: |
| Node.js    | `24.21.0` |
| pnpm       | `12.11.2` |
| Next.js    |  `16.4.0` |
| React      |  `19.3.0` |
| NestJS     |  `12.1.3` |
| TypeScript |   `6.0.3` |
| ESLint     | `10.12.0` |
| Prettier   |  `3.9.10` |
| Vitest     |   `5.0.4` |

Node 24 é a linha LTS ativa e `24.21.0` satisfaz o piso `24.15.0` dos schematics do Nest 12. O pnpm fica fixado pelo campo `packageManager`; dependências diretas usam versões exatas e a resolução completa fica registrada em `pnpm-lock.yaml`. O lint usa ESLint 10 com `typescript-eslint`; `eslint-config-next` foi deliberadamente omitido porque seu grafo atual traz o advisory `GHSA-vfj7-8cjw-p6xm`, sem versão corrigida. O build do Next continua executando a checagem TypeScript e a configuração raiz proíbe imports da implementação da API pelos frontends.

Referências consultadas em 12/10/2026: [releases do Node.js](https://nodejs.org/en/about/previous-releases), [requisitos do Next.js](https://nextjs.org/docs/app/getting-started/installation), [migração e requisitos do NestJS 12](https://docs.nestjs.com/migration-guide), [compatibilidade do pnpm](https://pnpm.io/installation), [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict) e [flat config do ESLint](https://eslint.org/docs/latest/use/configure/configuration-files).

## Aplicações e portas

| Aplicação             | Caminho           |                       Porta local |
| --------------------- | ----------------- | --------------------------------: |
| Loja técnica          | `apps/storefront` |                            `3000` |
| Administração técnica | `apps/admin`      |                            `3001` |
| API NestJS            | `apps/api`        | `3002` (`PORT` pode sobrescrever) |

Instale e execute:

```powershell
corepack enable
corepack install
pnpm install --frozen-lockfile
pnpm dev
```

Verificação completa:

```powershell
pnpm check
git diff --check
```

Comandos individuais: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm smoke` e `pnpm format:check`.

## Health da API

- `GET /health/live`: responde `200` com `{ "status": "ok" }`; não consulta dependências externas.
- `GET /health/ready`: responde deliberadamente `503` com `DEPENDENCIES_NOT_CONFIGURED`. Banco e demais integrações ainda não existem, portanto a API não anuncia readiness falsa.

O processo escuta `0.0.0.0`, aceita `PORT` entre `1` e `65535` e habilita graceful shutdown do NestJS. A configuração não lê nem registra segredos.

## Limitações deliberadas

- As páginas Next são placeholders acessíveis e descartáveis. Elas exibem apenas o aviso de que não representam o design final.
- Nenhum provider Free foi provisionado ou acessado; hosts, cookies, CORS, domínio e proxy continuam não validados.
- Nenhum SDK de banco, pagamento, storage, autenticação, e-mail ou fila foi instalado.
- A próxima UI comercial depende das etapas FD-02/03/04/05 e de aprovação humana, conforme `docs/05-engineering/FD-01-direcao-design-frontend-premium.md`.
- O próximo gate de backend sugerido é um spike isolado PostgreSQL/Prisma/Supabase em banco de teste, mediante autorização própria.
