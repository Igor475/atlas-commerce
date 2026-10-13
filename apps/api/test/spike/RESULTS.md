# F04-04 — Evidência técnica do spike isolado

Data: 13/10/2026. **Resultado local: aprovado condicionalmente para a estratégia experimental Prisma v7 + pg.** Não homologa ADR-006, Supabase/Render, módulos comerciais, segurança pública nem CI remoto.

## Base e escopo do checkout

HEAD inicial e base: `1e5eb4434fd2e51c8f9aeb7c8a04514abc97a8a0`, obtido com `git rev-parse HEAD`. `git status --short` inicial: **saída vazia, checkout limpo**. O HEAD atual não era o commit citado no prompt. Não houve commit, push, deploy ou alteração de branch. O status final detalhado fica em [git-status-final.txt](evidence/git-status-final.txt); o resumo de diff dos arquivos já rastreados fica em [diff-stat.txt](evidence/diff-stat.txt), e a lista completa (incluindo novos) em [changed-files.txt](evidence/changed-files.txt).

Alterações: infraestrutura e fixture/testes/scripts Prisma em `apps/api`, dependências exatas API + lockfile, `DEVELOPMENT.md`, permissões de build estritamente necessárias em `pnpm-workspace.yaml`, ignores específicos do client gerado em ESLint/Prettier/API e exclusão da suíte DB da suíte padrão. Os novos arquivos técnicos e logs sanitizados estão dentro da etapa no API. O port não importa Prisma; Prisma e seus tipos permanecem no adapter de infraestrutura. Não há rota pública nova ou composição do spike no AppModule.

A comparação `git diff --exit-code -- apps/storefront apps/admin packages/contracts docs .github/workflows` retornou **0**, sem alterações nessas fronteiras. O client gerado é ignorado pelo Git. A lista completa de arquivos permite conferir o escopo sem confundir arquivos gerados com código versionado.

## Versões, ambiente e fontes

| Componente                | Versão / configuração comprovada                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Host                      | Windows NT 10.0.19045, x64; Docker Desktop 4.89.0 / Engine 29.7.2; Linux containers                                       |
| Toolchain                 | Node 24.21.0 temporário, sem trocar Node global; pnpm 12.11.2 via Corepack; TS 6.0.3; Vitest 5.0.4                        |
| Prisma CLI/client/adapter | 7.10.0, versões diretas exatas; geração ESM `prisma-client` + adapter obrigatório                                         |
| Driver/tipos pg           | 8.23.1 / 8.23.1, exatos                                                                                                   |
| PostgreSQL                | 17.10 (Debian 17.10-1.pgdg12+1), x86_64 Linux, GCC 12.2.0                                                                 |
| Imagem                    | postgres:17.10-bookworm, fixada por digest `sha256:9b18b78397054fce88a9552e9d5a3ad5bb7fd258c5b3cc1c5028e46373d6ea8f`      |
| Pool driver               | max=2 padrão, configurável 1..4; max=1 no teste de saturação; dois clients reais independentes + controle                 |
| Driver timeouts           | acquisition/connection=500 ms, idle=1000 ms, lifetime=60 s, statement=5000 ms, lock=3000 ms, idle-in-transaction=10000 ms |
| TX Prisma                 | READ COMMITTED, maxWait=1000 ms, timeout=10000 ms; sem retry automático                                                   |

Fontes e justificativas em [DEVELOPMENT.md](../../../../DEVELOPMENT.md#f04-04--postgresql-descartável--prisma-7). Metadados oficiais do registry foram consultados com `npm view`; engines Prisma aceitam Node 24 e TS >=5.4; adapter aceita pg ^8.16.3. A compatibilidade **TS6/Node24 foi executada**, não presumida. V8 RC foi deliberadamente excluída da seleção v7. A instalação congelada passou pelas políticas de supply chain do pnpm. Não há alegação de ausência de vulnerabilidades por isso.

## Comandos e códigos de saída

| Comando / etapa                           | Exit final | Evidência                                                                                    |
| ----------------------------------------- | ---------: | -------------------------------------------------------------------------------------------- |
| `pnpm install --lockfile-only`            |          0 | Lockfile resolvido para a API, demais versões diretas preservadas                            |
| `pnpm install --frozen-lockfile`          |          0 | [install-final](evidence/install-final.txt)                                                  |
| `spike:generate` / `spike:validate`       |          0 | [schema-validate](evidence/schema-validate.txt), geração em cada run/build                   |
| `spike:migrate`, banco vazio recriado     |          0 | [migrate-fresh](evidence/migrate-fresh.txt)                                                  |
| `spike:migrate`, segunda aplicação        |          0 | [migrate-repeat](evidence/migrate-repeat.txt): nenhuma migration pendente                    |
| `spike:diff`                              |          0 | [schema-diff](evidence/schema-diff.txt): No difference detected                              |
| `spike:test` x 3 finais                   |    0, 0, 0 | [run-1](evidence/run-1.txt), [run-2](evidence/run-2.txt), [run-3](evidence/run-3.txt)        |
| `pnpm lint`                               |          0 | [gate-lint](evidence/gate-lint.txt) e execução após ajustes finais                           |
| `pnpm typecheck`                          |          0 | [gate-typecheck](evidence/gate-typecheck.txt), [API final](evidence/api-typecheck-final.txt) |
| `pnpm test`                               |          0 | [gate-test](evidence/gate-test.txt): 13 testes padrão, API 10                                |
| `pnpm build`                              |          0 | [gate-build](evidence/gate-build.txt), API regenerado nas runs finais                        |
| `pnpm smoke`                              |          0 | [gate-smoke](evidence/gate-smoke.txt): live=200, ready=503                                   |
| `pnpm check` no checkout Windows, sem DB  |          1 | [gate-check](evidence/gate-check.txt): somente format falhou por CRLF preexistente           |
| `pnpm check`, cópia LF equivalente sem DB |          0 | [gate-check-lf-normalized](evidence/gate-check-lf-normalized.txt): execução integral, EXIT=0 |
| `pnpm format:check`, snapshot LF          |          0 | [format-final](evidence/format-final.txt)                                                    |
| `git diff --check` final                  |          0 | [diff-check](evidence/diff-check.txt)                                                        |

### Particularidade do checkout Windows e validação equivalente

O checkout tem `core.autocrlf=true`: arquivos são LF no índice e CRLF no disco ([eol-baseline](evidence/eol-baseline.txt)). O `pnpm check` original completou lint/tipos/testes/build/smoke sem banco e retornou **1 somente em format**, apontando 37 arquivos preexistentes e fora do escopo ([format-windows-crlf](evidence/format-windows-crlf.txt)). Esses arquivos não foram alterados, nem se mudou a regra Prettier.

Foi criada cópia temporária a partir de HEAD + diff atual, com textos normalizados LF e instalação própria pelo mesmo lockfile. A primeira tentativa com links de node_modules foi recusada pelo pnpm; o archive também preservou CRLF inicialmente. Esses obstáculos de setup estão nos logs de snapshot anteriores, não são falhas concorrentes nem aprovação dos gates. A cópia foi normalizada explicitamente, sem escrever nos originais. [lf-equivalence](evidence/lf-equivalence.txt) comprova equivalência canônica dos 23 arquivos novos/alterados de implementação/configuração, excluindo relatório/evidências. [install-lf-snapshot](evidence/install-lf-snapshot.txt) registra instalação congelada. A execução integral normalizada está em [gate-check-lf-normalized](evidence/gate-check-lf-normalized.txt), incluindo código final; esta é a prova local dos gates em LF. Não se afirma que o checkout Windows CRLF passou em pnpm check.

Para reproduzir todos os gates, use um checkout LF (como Linux/GitHub Actions) ou cópia isolada normalizada. Não enfraquecer endOfLine ou reformatar áreas protegidas como parte desta etapa. Foram preservados também **448 registros preexistentes de pacote/versão/integrity** do lockfile ([lock-preservation](evidence/lock-preservation.txt)); os identificadores de peers recebem jiti, mas as versões existentes não foram atualizadas.

Falhas anteriores, preservadas: instalação congelada inicialmente retornou 1 por scripts Prisma bloqueados; liberados somente engines/CLI no allowBuilds existente, instalação final 0. O primeiro drift-check retornou **2** por representação equivalente do default de TTL, registrada em [schema-diff-initial](evidence/schema-diff-initial.txt). O PostgreSQL normaliza 40 minutos como '00:40:00'::interval; o schema foi alinhado sem alterar regra/TTL ou aplicar DDL adicional. Nenhum teste de concorrência falhou ou foi suprimido/repetido para mascarar bug.

Foram **8 execuções reais da suíte** durante a implementação, todas 16/16: 5 exploratórias (2 no histórico desta sessão e 3 logs [pre-drift-1](evidence/pre-drift-run-1.txt), [2](evidence/pre-drift-run-2.txt), [3](evidence/pre-drift-run-3.txt)) e **3 finais** depois da revisão de schema/runner, **48 verificações finais**. Nenhum caso foi mockado. Sem execução remota deste diff; o CI anterior citado pelo usuário não aprova este spike. Não se alterou workflow, pois a execução de integração desta etapa é local/explicitamente reproduzível.

## Matriz PGSP-01..16

Todos os PASS abaixo são **locais e limitados à fixture**, com casos em [persistence.pg.spec.ts](persistence.pg.spec.ts), executados em cada run final. PGSP-15 não afirma aprovação de GitHub Actions; PGSP-16 não afirma backup/restore comercial.

| Caso    | Resultado | Prova / referência parcial                                                                                                                                                          |
| ------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PGSP-01 | PASS      | Migration em banco vazio, história persistida e CHECK real negando excesso com SQLSTATE 23514                                                                                       |
| PGSP-02 | PASS      | Client gerado, conexão/CRUD real, backend independente, disconnect e zero sessões restantes do client; DB-04                                                                        |
| PGSP-03 | PASS      | Mesmo PID e txid em SQL/ORM; raw enxerga escrita ORM; rollback remove outbox e saldo; SKU com payload de SQL injection é apenas dado                                                |
| PGSP-04 | PASS      | Dois clientes observados bloqueados: 1 reserva, 1 OUT_OF_STOCK, saldo 1 e TTL 2400000 ms; DB-001                                                                                    |
| PGSP-05 | PASS      | SKU B commita enquanto SKU A continua locked por outra TX; DB-002                                                                                                                   |
| PGSP-06 | PASS      | Kits 2 e 3 SKUs insuficientes: zero reserva/linhas/outbox e nenhum compromisso residual; DB-003 parcial                                                                             |
| PGSP-07 | PASS      | Linhas repetidas agregadas, kits em ordem oposta concluídos com locks estáveis e quantidades corretas; DB-004/009                                                                   |
| PGSP-08 | PASS      | Pagamento simulado persistido x expiração antes/depois TTL; um terminal, saldos liberados/alocados uma vez, dedup, trigger nega reconfirmação; DB-005/006 parcial                   |
| PGSP-09 | PASS      | xact_start < expires_at < clock_timestamp pós-espera; resultado EXPIRED/PAYMENT_REVIEW, sem clock cliente; DB-007/008                                                               |
| PGSP-10 | PASS      | Mesma key/fingerprint concorrente retorna mesmo ID e um outbox; payload divergente gera conflito; DB-010/011                                                                        |
| PGSP-11 | PASS      | Captura 10000, succeeded 3000, pending inicial 5000: somente 1 request 2000 aceita; pending final 7000; retry mesmo refund e conflito de cents; DB-014                              |
| PGSP-12 | PASS      | Processo morto depois de commit: fato+outbox sobrevivem; outro processo lê; lease vencida reclama mesmo ID; rollback conjunto em PGSP-03; DB-018/020 parcial                        |
| PGSP-13 | PASS      | Duas TXs sobrepostas usam mesma função de claim do adapter; IDs distintos, mensagem locked é pulada, terceira claim vazia; DB-019                                                   |
| PGSP-14 | PASS      | Pool max=1 falha em aquisição finita sem fato; pg_terminate_backend causa erro e rollback; reconexão funciona; processo morto com TX aberta deixa zero efeito e restart lê baseline |
| PGSP-15 | PASS      | Gates locais, isolamento, lockfile e revisão de fronteiras/segredos; GitHub Actions deste diff NÃO VERIFICADO                                                                       |
| PGSP-16 | PASS      | Migration fresh + reaplicação + drift zero + reset/recriação de baseline descartável; DB-027/028 apenas parcial                                                                     |

## Provas observáveis e benchmarks

Run final 1: clients PID **3275/3276** independentes. PGSP-03: PID **3275**, txid **1227**, raw observa reserved=1 dentro da TX, estado externo volta a 0 após rollback. Último SKU: fulfilled=1, rejected=1, reserved=1, TTL=2400000 ms. Kit insuficiente não persiste nenhum fato/outbox.

PGSP-09, run final 1 (UTC): xact_start **12:32:02.811**, expires_at **12:32:03.804**, instante antes de liberar o lock **12:32:03.816**. O servidor mostrou espera real via pg_blocking_pids; após liberação a operação reavaliou clock_timestamp e expirou. Não se usou now() do início da TX nem relógio enviado por cliente como prova.

Refund: saldo disponível inicial 2000 centavos; duas requests independentes de 2000, uma rejeitada; succeeded+pending final=10000, nenhuma operação SUCCEEDED criada. Outbox: os logs registram IDs de fato/mensagem antes e depois de kill/restart e replay da mesma mensagem, sem publicação externa. No pool: timeout de aquisição, rollback após conexão encerrada, reconexão e subprocesso novo com estado consistente. Falhas de negócio usam códigos estáveis; erros de infraestrutura são sanitizados. Não há SQLSTATE de servidor para aquisição que nem obteve conexão; CHECK confirmou 23514. 40001/40P01 têm classificação unitária para replay integral, **não prova de retry real DB-026**.

| Run final | Amostras reserva | p50 ms | p95 ms | Falha aquisição max=1 ms | Log                         |
| --------- | ---------------: | -----: | -----: | -----------------------: | --------------------------- |
| 1         |               30 |  21.98 |  36.42 |                   591.23 | [run-1](evidence/run-1.txt) |
| 2         |               30 |  21.37 |  31.60 |                   501.76 | [run-2](evidence/run-2.txt) |
| 3         |               30 |  15.29 |  75.50 |                   522.94 | [run-3](evidence/run-3.txt) |

90 amostras finais, 30 por execução; percentis por execução pelo método nearest rank. Reservas sequenciais de SKU distinto, loopback Windows → Docker Linux, incluem round trips/ORM/commit; não incluem seed. A variação de p95 evidencia ruído local. Não são benchmark de carga, capacidade de VUs, p99, SLA, dimensionamento de pool ou evidência de Supavisor/Render. Não há decisão conclusiva de desempenho em nuvem.

## Rastreabilidade DB-001..028 e pendências

Referência: [DB-05](../../../../docs/04-architecture/database/DB-05-plano-de-validacao.md). Nenhum gate normativo foi fechado ou documento normativo alterado.

| IDs DB         | Evidência nesta etapa | Limite                                                                                       |
| -------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| DB-001/002     | PGSP-04/05            | Somente fixture de reserva, sem checkout comercial                                           |
| DB-003/004     | PGSP-06/07            | Estoque/linhas/outbox; pedido/cupom comercial ausentes                                       |
| DB-005/006     | PGSP-08               | Expiração/dedup/terminal; eventos locais, sem webhook Stripe autenticado                     |
| DB-007/008     | PGSP-09               | Relógio pós-lock; não há API que aceite clock cliente                                        |
| DB-009         | PGSP-07               | Ordem estável; sem retry automático ou side effect externo                                   |
| DB-010/011     | PGSP-10               | Identidade fixture por ator/operação/key; não contrato checkout                              |
| DB-012/013     | PGSP-08/09 parcial    | Evento local e PAYMENT_REVIEW; PSP/captura real/compensação integral ausentes                |
| DB-014         | PGSP-11               | Apenas aritmética e compromisso PENDING local                                                |
| DB-015/016/017 | NÃO IMPLEMENTADO      | Envio PSP, reconciliação e conversão pending→succeeded exigem outra etapa                    |
| DB-018         | PGSP-03/12            | Atomicidade local/crash antes de entrega, sem publicador externo                             |
| DB-019         | PGSP-13               | Claim de outbox real com dois owners                                                         |
| DB-020         | PGSP-12 parcial       | Lease/reclaim conserva ID; dedup de efeito externo não existe                                |
| DB-021         | NÃO IMPLEMENTADO      | Inbox/consumer comercial ausente                                                             |
| DB-022/023     | NÃO IMPLEMENTADO      | Entitlements e kits comerciais ausentes                                                      |
| DB-024/025     | NÃO IMPLEMENTADO      | Sessões/recovery/autenticação ausentes                                                       |
| DB-026         | NÃO VERIFICADO em DB  | Apenas classificação unitária SQLSTATE; sem replay automático real                           |
| DB-027/028     | PGSP-16 parcial       | Fixture recriada/migrada; sem expand-contract de produção, dump/restore comercial ou RPO/RTO |

## Segurança, fronteiras e decisão

**Nenhuma conexão ao Supabase real**: não se acessou Dashboard/CLI conectado, credenciais, .env de segredos ou provider. Os guards recusam host remoto/URL incompatível antes da conexão. Conexões de persistência foram apenas ao PostgreSQL loopback descartável. CLI/runtime têm variáveis separadas, mas o mesmo papel fictício trust nesta fixture; TLS, privilégios runtime/migration e Supabase Data API/RLS não foram homologados ou alterados.

**Nenhum side effect externo de negócio**: sem Stripe/PSP, e-mail, R2, serviço cloud, deploy, commit, push ou repo settings. Downloads de tooling/pacotes/imagem e consultas à documentação foram a única atividade de rede externa necessária ao setup. Nenhum dado real foi usado. Logs armazenam somente IDs/timestamps técnicos e configuração não secreta; não contêm URL de conexão/credencial. Errors públicos da fixture não preservam stack/cause brutos. **Nenhuma tela frontend alterada**; a comparação Git também cobre contratos e docs normativos.

Recursos Docker criados foram exclusivamente os de `atlas-f0404-spike`. O volume desse projeto foi recriado para comprovar migration fresh e finalmente removido com o container/rede pelo Compose específico. A imagem baixada permanece no cache Docker; Node temporário permanece no diretório temporário do sistema. Não houve prune nem remoção de volumes de outros projetos.

Recomendação para ADR-006: **aceitação condicional da estratégia para continuar a avaliação**, pois Prisma/SQL compartilham TX, locks/constraints/TTL e pool passaram localmente. Não mudar status oficial. Permanecem gates comerciais DB-001..028 completos, alternativa Drizzle/pg comparativa quando necessária, runtime com papéis mínimos/TLS/pooler, restore verdadeiro, segurança por domínio, observabilidade/carga/limites e conectividade real. Não há motivo observado para substituir Prisma neste spike, nem evidência suficiente para homologar produção/cloud.

Não implementado: módulos comerciais, schemas finais, APIs comerciais, contratos novos, Supabase/Render real, RLS, usuário de runtime separado, Stripe/refund externo, MFA/login/sessões, catálogo/pedidos/checkout, cupom, entitlements, R2, worker, broker, Redis/Kafka, websockets, cron/timers de garantia, consumidor/inbox externo, backup comercial, replay automático integral de TX e comparação executada com Drizzle. O experimento não avança para essas etapas sem nova autorização.

## Identidade dos artefatos finais

Os logs se referem ao HEAD base com alterações ainda não commitadas. Hashes SHA-256 dos artefatos críticos após a revisão:

| Arquivo                                                       | SHA-256                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/api/prisma/schema.prisma`                               | `44b29b445397ca996709965b05db363cb93faed9f7023cc79c233e3e5a930305` |
| `apps/api/prisma/migrations/202610130001_spike/migration.sql` | `b34097634bfd441dda44a7277ea4a52cc27215656a34c9a3a0b5133e726da361` |
| `apps/api/src/infrastructure/persistence/spike-repository.ts` | `d2197ae0991deeec2ce33247116840e9f41e7c1a2671ef07814cad1833b0f5c1` |
| `apps/api/test/spike/persistence.pg.spec.ts`                  | `d249bc1e3f8a92031945becd4269cfc0c7b9b942d963f500a15ab70fb3db9484` |
