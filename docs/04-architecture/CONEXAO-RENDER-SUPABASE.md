# AC-DEPLOY-DB-001 — Contrato de conexão Render Free → Supabase PostgreSQL

> **Estado:** arquitetura proposta sobre provedores escolhidos; sem credenciais, deploy, schema ou testes. Supabase Free é recomendação, não decisão explícita.

## Topologia e ownership

| Área | Decisão / limite |
|---|---|
| Cliente/Next.js | **Nunca** conectar diretamente ao PostgreSQL com credencial privilegiada, tampouco publicar DATABASE_URL/SUPABASE_SECRET. Toda autorização de negócio pertence ao NestJS. |
| API | NestJS na Render **Free** → Prisma v7 + `@prisma/adapter-pg` → TLS → **Supabase PostgreSQL**. |
| Transporte inicial | Preferir **Supavisor shared session mode `5432`**, especialmente sem IPv6 direto comprovado. Host, usuário e CA são fornecidos pelo Supabase Dashboard; não inventar. |
| Migrations | Pipeline/CLI com credencial de deploy separada. Direct IPv6 recomendado para ferramentas nativas se houver conectividade; caso contrário validar session pooler `5432`. |
| Dados críticos | Pedido/estoque/outbox/inbox/sessão/refund/entitlement permanecem no banco, com guardas/locks server-side. |
| Auth | **NestJS Identity**, não Supabase Auth. Sessão opaca por cookie host-only/CSRF conforme ADR-003. |
| Mídia | Cloudflare R2; Supabase Storage não faz parte da baseline. |
| Jobs | Não confiar em scheduler in-process Render Free; definir executor externo com lease/outbox quando autorizado. |

## Strings de conexão — sem segredos reais

O Supabase Dashboard > **Connect** fornece o usuário e o host corretos. São formatos **ilustrativos**, não copiar como valor funcional:

- Direto IPv6: `postgresql://<user>:<password>@db.<project-ref>.supabase.co:5432/postgres` (se rede IPv6 suportada).
- Session pooler IPv4: `postgresql://<db-role>.<project-ref>:<password>@<pooler-host>:5432/postgres`.
- Transaction pooler IPv4: `postgresql://<db-role>.<project-ref>:<password>@<pooler-host>:6543/postgres` — **não usar por padrão** em backend NestJS persistente.

### Variáveis conceituais (NÃO criar valores neste documento)

`DATABASE_URL` — conexão da **identidade runtime mínima**, somente ambiente backend Render/CI protegido.  
`MIGRATION_DATABASE_URL` — segredo protegido do pipeline de migration, com privilégios de alteração de schema, usado apenas no contexto controlado.  
`DATABASE_SSL_ROOT_CERT` (ou caminho/certificado equivalente, **somente se driver e deploy suportarem de modo seguro**) — verificar cadeia e hostname, sem desabilitar SSL.  
`DATABASE_POOL_MAX` — proposta conservadora para avaliação, **valor numérico a medir**, nunca presumir que defaults adequem-se ao plano Free.

> Não é uma prescrição de nomes para Prisma config; o projeto só formalizará `.env.example`/adapter depois do spike. Nenhum segredo deve ser colocado em Markdown, prompt do Codex, Git ou frontend.

## Permissões, RLS e schema

- Runtime é usuário dedicado com apenas operações necessárias; migration usa credenciais diferentes. Evitar superuser no app.
- Antes da DDL, determinar quais schemas estão expostos à Data API do Supabase. Preferir tabelas de negócio em schemas privados/não expostos ou Data API desativada quando não usada; em schemas expostos ativar RLS/grants pertinentes e validar com papéis `anon`/`authenticated` que acesso indevido é negado.
- Como o navegador não chama Data API diretamente, autorização principal ocorre no NestJS com verificações de titularidade/recurso e transações. RLS pode complementar defesa em profundidade se desenho e papéis permitirem.
- Retenção e backups seguem APP-14, política SEC e ADR-010. Nenhum token Stripe/R2/MFA em eventos de audit/log.

## Conexão, desempenho e falhas

- Cold start Render Free pode abrir nova conexão; tratar reconexão com tempo limite, backoff limitado e resposta segura se Supabase Free estiver pausado. Não tentar manter serviço ativo artificialmente para simular SLA.
- Testar timeout, DNS IPv4/IPv6, certificados, prepared statements, sessão/transaction pooling, número total de conexões (app+jobs+admin+migrations), `FOR UPDATE` e reconciliação.
- Investigar com Supabase Advisors quando houver schema, checar índices/constraints e negar exposição indevida de tabelas.
- Para ports 25/465/587 bloqueados pela Render Free, verificação de e-mail deve usar provedor com API HTTPS aprovada ou ficar pendente na demonstração; não alegar e-mail pronto.

## Dependências e provas

[ADR-010](adrs/ADR-010-postgresql-supabase.md) · [ADR-006](adrs/ADR-006-acesso-dados.md) · [DB-001–028](database/DB-05-plano-de-validacao.md) · [SUPABASE-001–016](VALIDACAO-OPERACIONAL-SUPABASE.md) · [RENDER-001–016](VALIDACAO-OPERACIONAL-RENDER.md).
