# CPINT-03 — Grants e migrations

## Destino exclusivamente descartável

[Compose](../../../apps/api/compose.profile-orders.yml) usa PostgreSQL 17.10 com digest fixado, bind `127.0.0.1:55439`, projeto Docker UUID próprio e banco `atlas_catalog_cat01`. O marker adicional é `atlas.profile_integration=atlas-cpint01-disposable`. O lock local da porta serializa os laboratórios relacionados. O harness aceita somente Docker local e remove apenas recursos do projeto que criou.

As URLs aceitas pelo adapter precisam corresponder exatamente ao host, porta, banco, schema e role locais, com consentimento CP-02. Não recebe secrets remotos. TLS desabilitado limita-se ao laboratório loopback descartável; não é mudança de política Supabase/TLS.

## Cadeias aditivas

- [Profile integrado](../../../apps/api/prisma-profile-integration/profile/migrations/202610160100_integrated_profile/migration.sql): derivação revisada de CP-01 com guard CPINT; autoriza operações específicas e acrescenta prova PID/XID.
- [Referência Quotes](../../../apps/api/prisma-profile-integration/quotes/migrations/202610160101_profile_quote/migration.sql): referência mínima imutável e wrappers autorizados.
- [Snapshot Orders](../../../apps/api/prisma-profile-integration/orders/migrations/202610160102_profile_preparation/migration.sql): snapshot tipado, FKs de titularidade/revisão, evidência e preparação transacional. A FK diferida permite inserir o snapshot antes da preparação, exigindo integridade no commit.

Cada cadeia tem histórico Prisma distinto, owner específico e verificação de reaplicação. Não são migrations de produção.

## Autoridades SQL

| Papel                    | Capacidade exata                                        | Limite                                                |
| ------------------------ | ------------------------------------------------------- | ----------------------------------------------------- |
| Migrators                | DDL de sua cadeia e REFERENCES/USAGE necessários às FKs | Somente fixture com guards; não são runtimes          |
| Executor Profile NOLOGIN | Conta, revisão e ports Profile                          | Consumo autenticado por session_user                  |
| Executor Quotes NOLOGIN  | Assert de conta e leitura mínima Profile                | Sem SELECT/DML geral em Profile; sem snapshot postal  |
| Executor Orders NOLOGIN  | Assert de conta e snapshot Profile com prova            | Sem UPDATE/DELETE geral em Profile                    |
| Runtimes Quotes          | issue_profile/project_profile                           | Sem membership, ownership ou acesso direto às tabelas |
| Runtimes Orders          | prepare_profile_quote/read_profile_preparation          | Sem membership ou ports antigos que contornem Profile |

As funções SECURITY DEFINER têm `search_path=pg_catalog` e execução PUBLIC revogada. CREATE temporariamente concedido ao executor para atribuir ownership de funções é revogado ao fim da migration. Os wrappers internos preservam os guards legados. Somente na fixture integrada, execução direta dos ports antigos pelos runtimes é revogada.

O guard do adapter recusa flags privilegiadas, membership, CREATE/TEMP, ownership, grants de tabelas/colunas/sequences e funções extras de aplicação. Revogações PUBLIC são locais ao banco descartável criado pelo harness, nunca executadas no Supabase ou em banco alheio. A política remota L1 não é alterada.

Snapshots/referências/evidências têm triggers de imutabilidade. O runtime não possui DML direto. Erros estáveis não expõem SQL ou PII; nenhum logger Prisma está habilitado. Não existe chamada externa dentro da transação.
