# F04-05 — Preparação de conectividade PostgreSQL/Supabase Free

> **Estado:** escopo de implementação para Codex; não é prova de conexão ao Supabase nem ADR homologada.
> **Data:** 13/10/2026. **Baseline observada:** `0f8972e702215af4f130622a113c1dcdaf07bf22`.

## Objetivo

Evoluir a infraestrutura de persistência após o spike F04-04, **preservando integralmente a fixture PostgreSQL descartável**, para preparar conexão segura NestJS → Prisma 7 (`@prisma/adapter-pg` + `pg`) → Supabase Free e verificar falhas. Não instalar domínio comercial, sessões, webhooks, R2, Stripe, worker nem criar qualquer interface visual.

## Três níveis de trabalho

- **L0 — obrigatório, sem nuvem:** código server-only, configuração fail-closed, TLS/host/pool e testes negativos, read-only fixture e recuperação usando PostgreSQL Docker local descartável. Integrar os 16 testes PGSP ao CI em **job separado** com serviço isolado, sem segredos e sem alterar o job padrão aprovado.
- **L1 — somente com autorização adicional:** conexão **somente leitura** a projeto Supabase de teste dedicado, via conta de diagnóstico com privilégios mínimos e secrets injetados em canal seguro; provar TLS, Supavisor session mode IPv4 (porta `5432`), queries, falhas e autorização. **Sem autorização, L1 = BLOCKED-NO-REMOTE.**
- **L2 — fora do escopo:** qualquer `CREATE`, `ALTER`, `DROP`, migrations, seeds, `GRANT`, `REVOKE`, ativação/desativação da Data API, configuração RLS, conexão a banco com dados reais ou compras de plano. Exige decisão futura, projeto isolado, backups e rollback próprios.

## Guardas críticos

1. Nunca permitir que `apps/api/prisma.config.ts`, `apps/api/scripts/spike-db.mjs`, `SPIKE_DATABASE_URL` e `SPIKE_MIGRATION_URL` da F04-04 aceitem host remoto: o spike original está restrito à fixture de loopback `127.0.0.1:55434`, schema `spike`.
2. Um caminho remoto novo só pode realizar probes **SELECT**; não criar tabelas da fixture no Supabase Free. Nenhum migrator cloud deve ser implementado nesta etapa.
3. Configuração específica da API (não do navegador): modo disabled por default, opção explícita de perfis de teste, timeout finito, pool pequeno parametrizado, singleton por processo, fechamento correto, erros sem URI/segredos. Não adicionar pacote Supabase Auth/Storage.
4. Backend persistente em IPv4: preferir **Supavisor shared session mode :5432**. URL oficial deve ser copiada de `Dashboard > Connect`; host e usuário do pooler não podem ser adivinhados. Conexão direta somente com IPv6 realmente comprovado. Não usar `:6543` transaction mode como fallback automático.
5. TLS: `sslmode=require` apenas criptografa; confirmar cadeia de certificados **e hostname** usando a configuração efetiva de `pg`, sem `rejectUnauthorized: false`, sem desabilitar TLS. Se não for possível validar identidade, não tratar conexão remota como segura.
6. API sem DB continua com `/health/live` 200 e `/health/ready` 503. Nenhum readiness fictício: testar dependência quando realmente habilitada, sem expor detalhes internos.
7. Supabase Free pode pausar por inatividade e Render Free pode dormir; não prometer disponibilidade, cron ou jobs 24×7.

## Entregáveis e aceite

- Adapter/config com testes negativos e isolamento da fixture preservado.
- Documentação local de variáveis sem valores secretos e plano de roles/RLS/Data API **apenas para revisão**.
- CI com PostgreSQL efêmero e 16 testes reais PGSP, se viável; evidência remota após push, não antecipada no relatório local.
- Solução localizada e comprovada para a divergência Prettier CRLF/LF no Windows, se couber sem reformatar documentos alheios; caso contrário, bloquear esse subitem sem ocultar.
- Relatório com 22 casos `SUPCON`, distinção L0/L1 e riscos ainda abertos.

## Fontes do repositório

- [F04-04 resultados](../../apps/api/test/spike/RESULTS.md)
- [ADR-006](../04-architecture/adrs/ADR-006-acesso-dados.md)
- [ADR-010](../04-architecture/adrs/ADR-010-postgresql-supabase.md)
- [Conexão Render/Supabase](../04-architecture/CONEXAO-RENDER-SUPABASE.md)
- [Validação operacional Supabase](../04-architecture/VALIDACAO-OPERACIONAL-SUPABASE.md)
- [DB-05](../04-architecture/database/DB-05-plano-de-validacao.md)
- [Segurança](../07-security/security-requirements.md)

## Fontes oficiais consultadas, 13/10/2026

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits
- https://supabase.com/docs/guides/database/prisma
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/changelog?types=breaking-change
