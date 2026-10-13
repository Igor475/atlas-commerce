# Desenvolvimento local

Este repositório contém o **bootstrap técnico** do Atlas Commerce e um **spike F04-04 isolado de persistência**. Não há domínio comercial, banco de produção, autenticação, Stripe, R2, filas, checkout ou interface final implementados.

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
- `GET /health/ready`: responde deliberadamente `503` com `DEPENDENCIES_NOT_CONFIGURED`. O banco experimental não está conectado à composição HTTP; a API não anuncia readiness falsa.

O processo escuta `0.0.0.0`, aceita `PORT` entre `1` e `65535` e habilita graceful shutdown do NestJS. A configuração não lê nem registra segredos.

## Limitações deliberadas

- As páginas Next são placeholders acessíveis e descartáveis. Elas exibem apenas o aviso de que não representam o design final.
- Nenhum provider Free foi provisionado ou acessado; hosts, cookies, CORS, domínio e proxy continuam não validados.
- Prisma/pg estão restritos ao experimento F04-04. Nenhum SDK de pagamento, storage, autenticação, e-mail ou fila foi instalado.
- A próxima UI comercial depende das etapas FD-02/03/04/05 e de aprovação humana, conforme `docs/05-engineering/FD-01-direcao-design-frontend-premium.md`.
- Integração Supabase/Render real exige autorização própria e novos gates; o spike local não a homologa.

## F04-04 — PostgreSQL descartável / Prisma 7

Experimento técnico em `apps/api/src/infrastructure/persistence`, sem módulos comerciais, rotas ou alteração dos health checks. O port `SpikePort` não exporta Prisma. O adapter usa SQL parametrizado e ORM no mesmo `tx`; o client gerado permanece ignorado pelo Git. Build/typecheck/test geram o client **sem exigir banco ou DATABASE_URL**. A API não aplica migrations nem ativa o spike durante startup.

Versões exatas: `prisma`, `@prisma/client` e `@prisma/adapter-pg` **7.10.0**; `pg` e `@types/pg` **8.23.1**. O registry declara Node `^20.19 || ^22.12 || >=24.0` e TypeScript `>=5.4.0`; Node 24.21.0/TS 6.0.3 foram exercitados nos gates, não apenas inferidos. O adapter aceita pg `^8.16.3`. Selecionada a linha estável v7, sem atualizar para v8 RC. O pnpm permite scripts somente dos engines/CLI Prisma e do pacote previamente autorizado; lint/format ignoram apenas o código gerado. A resolução transitiva introduz `jiti`, alterando identificadores de peers de ESLint/Vite no lockfile sem atualizar suas versões.

Fontes oficiais consultadas em 13/10/2026: [upgrade Prisma v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [pool Prisma v7](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool), [pool pg](https://node-postgres.com/apis/pool), [Prisma 7.10.0 no registry](https://registry.npmjs.org/prisma/7.10.0), [client 7.10.0](https://registry.npmjs.org/@prisma/client/7.10.0), [adapter 7.10.0](https://registry.npmjs.org/@prisma/adapter-pg/7.10.0), [pg 8.23.1](https://registry.npmjs.org/pg/8.23.1), [PostgreSQL — locking](https://www.postgresql.org/docs/17/explicit-locking.html), [relógio PostgreSQL](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).

### Execução explícita e isolada

Pré-requisitos: toolchain fixada e Docker Desktop/Compose ativo. Na raiz:

```powershell
pnpm install --frozen-lockfile
docker compose -f apps/api/compose.spike.yml up -d --wait
pnpm --filter @atlas/api spike:validate
pnpm --filter @atlas/api spike:generate
pnpm --filter @atlas/api spike:migrate
pnpm --filter @atlas/api spike:migrate # prova de reaplicação sem migrations pendentes
pnpm --filter @atlas/api spike:diff # schema representável pelo Prisma sem drift
pnpm --filter @atlas/api spike:test
pnpm check
git diff --check
```

`spike:migrate` e `spike:test` ativam explicitamente o ambiente descartável, com alvo local construído internamente; não é necessário copiar URL nem criar .env. O Compose tem nome fixo `atlas-f0404-spike`, porta **127.0.0.1:55434**, banco `atlas_spike_f0404`, usuário técnico fictício `atlas_spike`, schema `spike` e autenticação trust **exclusivamente local**. Não reutilizar esse Compose em rede compartilhada/produção. A imagem é PostgreSQL 17.10; o digest observado consta no relatório técnico.

Variáveis opcionais para o experimento (nenhuma é lida por health/live):

| Variável              | Uso / limites                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `SPIKE_POOL_MAX`      | 1..4, padrão 2 conexões por client/processo                                                                    |
| `SPIKE_DATABASE_URL`  | Runtime: somente o alvo descartável fixo, sem senha ou parâmetros extras; ausente usa alvo interno pelo runner |
| `SPIKE_MIGRATION_URL` | CLI separado do runtime, limitado ao mesmo banco descartável; geração/validação funcionam sem URL              |
| `SPIKE_DISPOSABLE`    | Opt-in técnico `1`, definido apenas nos comandos explícitos                                                    |

Os runners removem configuração ambiente `PG*`, `DEBUG` e `DATABASE_URL` do subprocesso. A ativação direta rejeita PG/DEBUG ambiente; não carrega arquivos .env. URLs remotas, senha, porta/banco/schema divergentes são recusados antes da conexão e sem imprimir o valor. Runtime/CLI usam o mesmo usuário **somente nesta fixture local trust**; segregação de papéis, TLS real e pooler serão provas futuras. Nenhuma conexão Supabase é permitida pelo guard deste spike.

O pool pg tem aquisição/conexão 500 ms, idle 1000 ms, lifetime 60 s, statement 5000 ms, lock 3000 ms e idle-in-transaction 10000 ms. A TX Prisma usa READ COMMITTED, maxWait 1000 ms e timeout 10000 ms. Estes valores são experimentais; não dimensionam réplicas nem produção. O client é reutilizável por processo, com dono lazy e cleanup explícito `onApplicationShutdown`/`closeProcessSpikeDatabase`; a composição HTTP continua sem ativá-lo. Testes usam clients independentes e encerram todos.

### Concorrência e fronteiras da prova

A suíte separada `test/spike/*.pg.spec.ts` exige PostgreSQL real e migrations já aplicadas. A suíte padrão continua sem banco. Barreiras/latches coordenam TXs; `pg_stat_activity`/`pg_blocking_pids` provam espera de duas conexões. Polling com deadline observa o estado do servidor; sleeps não são a prova. O caso TTL reduz **somente o prazo da fixture** para cruzar a fronteira em um segundo e demonstra xact_start anterior e clock_timestamp posterior. A reserva normal continua sendo de 40 minutos.

Fixture mínima: saldo SKU, reserva/linhas, evento simulado persistido, outbox com lease, captura e refund PENDING. CHECKs e trigger são SQL customizado versionado (não representados integralmente pelo Prisma diff). UNIQUE/FKs têm nomes e ações alinhados ao schema. CHECKs/UNIQUE/FKs e trigger protegem saldos e terminais, além das guardas transacionais. Linhas são agregadas e locks ordenados. A confirmação lê o tempo após todos os locks de negócio. Outbox usa SKIP LOCKED exclusivamente para claim; reexecução conserva o ID, sem implementar consumidor externo/exactly-once.

Falhas 40001/40P01 são sinalizadas como `TX_REPLAY_REQUIRED` para replay da **TX inteira**; não há retry automático neste spike. As corridas não são mascaradas. O teste contábil nunca envia refund nem marca SUCCEEDED; succeeded/pending iniciais são dados fictícios declarados. Recovery do PSP, inbox comercial, reconciliação externa e autenticação são ausentes.

### Destruição segura da fixture

Encerre testes antes. O comando abaixo remove **apenas** container/rede/volume do projeto Compose nomeado neste arquivo. Nunca use prune, remoção global de volumes ou comandos de outros projetos:

```powershell
docker compose -f apps/api/compose.spike.yml down --volumes
```

Para restaurar a baseline vazia, execute novamente up, spike:migrate e spike:test. A suíte também trunca apenas as sete tabelas fixas de `spike` entre casos, preservando histórico de migrations. Isso é reset de fixture, **não backup/restore comercial ou prova completa DB-027/028**. Se Docker/PostgreSQL não estiver disponível, reporte BLOCKED; não substitua por mocks.

Resultados, matriz PGSP, rastreabilidade parcial DB-001..028 e limitações: [relatório técnico F04-04](apps/api/test/spike/RESULTS.md). Não alterar status oficial da ADR-006 com base neste experimento.

### Nota para checkout Windows / finais de linha

Com core.autocrlf=true, arquivos LF no índice podem aparecer como CRLF no disco. Nesta etapa, pnpm check completou os gates funcionais sem banco, mas format:check apontou 37 arquivos preexistentes por finais de linha. A validação de formatação passou em cópia temporária normalizada LF, preservando o checkout original e a regra Prettier. Para reprodução integral, usar checkout LF/cópia isolada equivalente; não reformatar frontends, contratos ou workflows como parte do spike. O relatório distingue códigos do checkout Windows e da cópia LF.
