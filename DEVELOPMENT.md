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

## F04-05 — Probe server-only controlado (L0)

O bootstrap agora possui um probe de conexão **somente leitura**, separado dos guards, client/schema e migrations F04-04. Dependências permanecem Prisma/client/adapter **7.10.0**, pg/types **8.23.1**, Node **24.21.0**, pnpm **12.11.2** e TS **6.0.3**; não foi instalado SDK Supabase ou pacote extra. O adapter Prisma remoto é apenas preparado com as opções do driver; nenhum client/model de fixture é usado para Supabase.

Por padrão, `PERSISTENCE_ENABLED=false` e `PERSISTENCE_PROFILE=disabled`. `DATABASE_URL` ambiente não é usada por inferência; não se carregam .env automaticamente. `/health/live` continua 200 sem consulta DB. Desabilitado, `/health/ready` continua 503 com `DEPENDENCIES_NOT_CONFIGURED`. No profile local explicitamente habilitado, ready só retorna 200 após SELECT e prova de role; indisponibilidade/privilégio indevido retorna 503 `DEPENDENCY_UNAVAILABLE`, sem host/versão/stack/SQL. Esse sinal comprova a dependência técnica do probe, não prontidão comercial de todo o Atlas.

### Reproduzir L0 sem credenciais

Pré-requisitos: toolchain fixada, Docker local ativo, OpenSSL 3 (Git for Windows inclui o executável; Linux pode usar o binário do sistema) e porta loopback 55434 disponível.

```powershell
pnpm install --frozen-lockfile
pnpm --filter @atlas/api connection:test
pnpm check
git diff --check
```

`connection:test` compila a API e cria **somente** o projeto Docker `atlas-f0404-spike-f0405`, utilizando o Compose e digest F04-04 inalterados. Recusa a porta ocupada por outro projeto. Prepara roles/tabela técnicas separadas em `probe_fixture`, gera certificados efêmeros em diretório temporário próprio, habilita TLS apenas no PostgreSQL descartável e executa a suíte `test/connection/probe.integration.ts`. Por fim remove container/rede/volume desse projeto e as chaves/certificados temporários, inclusive na falha. Não usa prune nem dados/volumes de outros projetos. Se for necessária limpeza manual após interrupção externa:

```powershell
docker compose -p atlas-f0404-spike-f0405 -f apps/api/compose.spike.yml down --volumes
```

A role fictícia `atlas_probe_readonly` tem apenas CONNECT, USAGE e SELECT na tabela técnica, sem memberships/superuser/bypassrls/createdb/createrole/replication. PUBLIC perde CREATE/TEMP somente no banco descartável. Os testes desligam readonly de sessão e demonstram DML/DDL negados por privilégios efetivos, não por guard HTTP. Esses comandos SQL estão em `test/connection/readonly-fixture.sql`: não são migrations ou instruções para aplicar em Supabase.

O provider Nest é singleton/lazy: valida toda a configuração antes de criar pool; compartilha probes simultâneos; encerra no shutdown. Usa pg max=2 (1..4 configurável), aquisição/conexão 500 ms, query timeout 2000 ms, statement 1500 ms, idle 1000 ms, lifetime 60 s e idle-in-transaction 3000 ms. Cada prova usa BEGIN READ ONLY, SELECT 1 e metadados de role/grants; falhas descartam a conexão, sem sucesso fictício. Uma consulta posterior reconecta quando o banco volta. Não há retry de mutação, jobs, cron ou garantia de execução residente.

### Variáveis server-only e preparação L1

`apps/api/.env.example` contém nomes e flags desabilitadas, sem URL, senha, token ou certificado real. Não colocar variáveis de DB em NEXT_PUBLIC, browser ou logs.

| Variável                                                                         | Regra                                                                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| PERSISTENCE_ENABLED / PERSISTENCE_PROFILE                                        | false/disabled por padrão; local-disposable exige opt-in; cloud-readonly prepara somente configuração    |
| PERSISTENCE_LOCAL_DISPOSABLE                                                     | 1 apenas para o alvo fixo local e identidade fictícia; definido pelo runner L0                           |
| PERSISTENCE_POOL_MAX                                                             | Inteiro 1..4, padrão 2; não é dimensionamento homologado do Free                                         |
| PERSISTENCE_PROBE_URL                                                            | Futuro segredo de diagnóstico, separado de runtime/migration; não é lido quando desabilitado             |
| PERSISTENCE_ENDPOINT_SOURCE                                                      | dashboard-connect: host/username devem ser fornecidos do Connect do projeto autorizado                   |
| PERSISTENCE_EXPECTED_HOST / PERSISTENCE_EXPECTED_ROLE / PERSISTENCE_TEST_PROJECT | Binding explícito de endpoint, identidade readonly e projeto; nunca inferidos de DATABASE_URL ou SPIKE_* |
| PERSISTENCE_TRANSPORT                                                            | session-ipv4 :5432; direct-ipv6 somente com escolha explícita e PERSISTENCE_IPV6_VERIFIED=true           |
| PERSISTENCE_TLS / PERSISTENCE_CA_FILE                                            | verify-full e arquivo de uma CA pública válida, sem chave privada; não são desabilitados no cloud        |

O parser recusa porta 6543, query parameters na URI (incluindo sslmode), role privilegiada, host divergente, flag inválida, pool fora dos limites, CA inválida/expirada e mistura de profiles. Não há fallback para transaction pooler. O driver recebe campos separados, sem connectionString que possa sobrescrever SSL: `rejectUnauthorized: true`, cadeia CA, TLS >=1.2 e `checkServerIdentity` ligado ao hostname esperado. O default de pool vem de pg em Prisma v7, não do motor Prisma v6.

**L1 permanece bloqueado.** Mesmo uma configuração cloud válida é recusada pela composição HTTP com REMOTE_AUTHORIZATION_REQUIRED antes de qualquer socket. A factory de adapter é apenas preparação para uma futura operação autorizada, sem migrator/cloud CLI. Sem autorização separada de projeto dedicado + identidade read-only + operação SELECT definida, não ativar conexões, não buscar credenciais, não executar migrations, seed, DML ou alteração de grants/RLS/Data API.

Identidades conceituais: runtime futuro terá grants de negócio mínimos; migration terá DDL no processo autorizado; diagnóstico terá somente leitura. O quickstart Prisma do Supabase contém permissões amplas (incluindo createdb/bypassrls) para seu contexto de setup: **não adotadas** para este probe. Nenhum papel real foi criado.

### Checklist passivo de Data API / RLS / grants (futura autorização)

1. Confirmar o projeto dedicado, a identidade e o escopo de SELECT; obter endpoint e CA de canal seguro sem publicar valores.
2. Inventariar schemas/tabelas/views realmente expostos à Data API/GraphQL e as configurações efetivas do projeto. Não assumir exposição ou proteção pelo nome public ou pelo default de projeto novo.
3. Revisar grants de PUBLIC/anon/authenticated/runtime/probe, ownership, memberships e flags privilegiadas; confirmar que diagnóstico não tem DML/DDL/TEMP/SET ROLE privilegiado.
4. Em schema exposto, avaliar RLS habilitada, políticas por recurso, views/security_invoker e funções SECURITY DEFINER acessíveis. Não criar bypass ou mudar políticas para contornar uma negativa.
5. Registrar lacunas para aprovação futura. Não executar DML como teste de permissão em banco remoto compartilhado, nem GRANT/REVOKE/CREATE/ALTER/DROP nesta etapa.

### CI e portabilidade

O workflow Quality mantém seu job checks e acrescenta postgres-integration: Node/ações SHA-pinned/contents:read/frozen install, Compose com projeto `atlas-f0404-spike-ci`, spike:migrate, os 16 PGSP reais e cleanup always apenas desse projeto. **CI remoto PENDENTE** até publicação/execução posterior; esta etapa não faz commit/push.

A divergência EOL do checkout Windows continua um subitem bloqueado: adicionar .gitattributes sozinho não reescreve os arquivos CRLF existentes. Para fazer o format:check global passar seria preciso normalizar também frontends, contracts e outros arquivos protegidos. Não se alterou Prettier/endOfLine, não se ignoraram arquivos para esconder a falha e não se executou renormalização ampla. Os gates e o relatório distinguem o checkout original, a formatação dos arquivos alterados e o Linux CI ainda pendente.

### Fontes oficiais e limites

Consultadas em 13/10/2026: [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres), [pooling/limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), [Prisma Supabase](https://supabase.com/docs/guides/database/prisma), [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement), [pg SSL](https://node-postgres.com/features/ssl), [Prisma v7 pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool), [Data API](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [changelog](https://supabase.com/changelog?types=breaking-change).

A documentação atual confirma session pooler IPv4 para backend persistente, require não validando identidade, e o risco de parâmetros da URL sobrescreverem SSL em pg. O Free pode pausar por baixa atividade numa janela de sete dias; limites reais/pooler/CA/IPv6 só serão comprovados no L1, sem promessa de SLA ou keepalive artificial.

O changelog anuncia mudanças de exposição Data API (default novo desde 30/05/2026, enforcement geral previsto em 30/10/2026): inventariar o estado real, sem alterar o projeto por suposição. Também registra atualização PostgreSQL 15.19/17.11 com correções de CVEs. A imagem **17.10 fixada pelo escopo** permanece apenas no teste descartável; aplicabilidade de cada CVE à imagem não foi auditada e atualização requer avaliação separada, não homologação de produção. O anúncio de ciphers em novembro refere-se às APIs HTTP, não prova mudança na conexão PostgreSQL deste spike.

Relatório completo SUPCON-01..22 e evidências: [F04-05 RESULTS](apps/api/test/connection/RESULTS.md). Nenhum provedor real é modificado, e ADR-006/010/Atlas não são homologados para produção.
