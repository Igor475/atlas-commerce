# F04-01 — Estrutura física proposta do monorepo

> **Status:** RECOMENDAÇÃO PARA APROVAÇÃO, não estrutura já criada no GitHub. A arquitetura **NestJS monólito modular + Next.js** está aceita; a escolha de **dois frontends fisicamente separados** é proposta para facilitar isolamento de sessões e ambientes.

## Layout projetado

```text
atlas-commerce/
├── apps/
│   ├── storefront/                   # Next.js: loja, cadastro, checkout demo e biblioteca
│   ├── admin/                        # Next.js: backoffice, MFA, catálogo/estoque/financeiro
│   └── api/                          # NestJS: ÚNICO backend modular deployável
│       ├── src/
│       │   ├── bootstrap/            # composição de módulos / config / HTTP
│       │   ├── modules/
│       │   │   ├── identity/
│       │   │   ├── catalog/
│       │   │   ├── pricing/
│       │   │   ├── inventory/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── library/
│       │   │   ├── fulfillment/
│       │   │   ├── returns/
│       │   │   ├── backoffice-audit/
│       │   │   └── integration/
│       │   └── infrastructure/       # composição adapters, observabilidade, DB
│       └── test/                     # integração/E2E e concorrência com DB real
├── packages/
│   ├── contracts/                    # DTO/validation schemas de transporte públicos
│   └── tooling/                      # config lint/ts/test compartilhada se útil
├── docs/
│   ├── 02-business-requirements/
│   ├── 03-business-processes/
│   ├── 04-architecture/
│   ├── 05-engineering/               # esta fase
│   └── 07-security/
├── .github/workflows/                # futuro CI, sem workflow criado aqui
├── pnpm-workspace.yaml               # futuro bootstrap Codex, não incluído no ZIP
├── package.json                      # scripts root, versões fixadas futuramente
├── pnpm-lock.yaml                    # único lockfile fixado futuramente
└── README.md                         # apresentação pública já existente
```

**Não criar** `apps/worker` nesta primeira entrega de código. A ADR-007 exige primeiro provar cron/dispatcher recuperáveis e custos; incluir uma app worker posteriormente requer adendo de implantação. Não criar microsserviços, gateway artificial, cache obrigatório, pacotes por domínio ou bibliotecas 'common' com entidades de negócio.

## Decisão sobre frontends

| Opção | Prós | Custos / mitigação | Estado |
|---|---|---|---|
| **A — Storefront e admin separados** | Host e cookie separados, áreas de deploy/routing isoladas, segurança operacional explícita | Dois builds Vercel e manutenção de componentes separados; bibliotecas UI só após necessidade real | **Recomendada para aprovação** |
| B — Uma app Next.js com grupos de rotas | Build/deploy único, compartilhamento UI mais simples | Mesmo host/cookie por padrão e maior cuidado com escopo de sessão, cache e rotas | Alternativa se custo/manutenção real justificar |

Os endereços/domínios **não** estão definidos; duas apps separadas em Vercel Hobby podem usar hosts distintos de demo, sujeitos à elegibilidade e à validação técnica. O proxy da API deve preservar origem, cookies e redirecionamentos; não pressupor que rewrites, sozinhos, resolvem todas as questões de `Set-Cookie`, CSRF, cache e OAuth/WebAuthn.

## Convenções de pacotes

- Um **pnpm workspace**, com `pnpm-workspace.yaml`; versões de Node.js/pnpm/TS/Nest/Next/Prisma serão fixadas após checar compatibilidade. `Corepack` é hipótese de bootstrap a confirmar.
- `packages/contracts` contém apenas contratos **publicáveis aos clientes** e tipos validados, sem importar `@prisma/client`, entity de domínio, credencial, server-only helper ou material de segurança.
- `packages/tooling` compartilha regras de lint/format/typecheck/test **se necessário**; não forçar dependências de runtime ou publicar pacote NPM.
- Import por nomes de workspace e exports declarados, com verificações anti-ciclo; evitar importar por caminho `../../apps/api/src`.
- Storefront/admin falam com API por canal HTTP público/versionado. Não importam serviços Nest, Prisma ou SDK privado de Stripe/R2.

## Dependências de deploy

- **Vercel Hobby:** dois projetos potenciais com respectivos root directories (`apps/storefront`, `apps/admin`) **apenas após testar** build pnpm/monorepo e regras do Hobby; nenhum deploy criado agora.
- **Render Free:** um Web Service NestJS sob `apps/api`; build/start command e Node runtime fixados após verificação; filesystem efêmero, spindown e sem worker residente confiável.
- **Supabase Free:** PostgreSQL acessado somente pela API, TLS e pooler compatível (ADR-010); sem Supabase Auth/Storage por inferência.
- **R2 Free Standard:** conteúdo integral privado e prévias autorizadas; SDK e secret no backend.
- **Stripe:** Checkout hospedado *test mode*; webhook autentica raw body e não o cookie browser. Execução assíncrona independente da URL de retorno.

Referências: [ADR-001](../04-architecture/adrs/ADR-001-monolito-modular.md), [ADR-003](../04-architecture/adrs/ADR-003-autenticacao-sessoes.md), [ADR-007](../04-architecture/adrs/ADR-007-worker-e-jobs.md), [F04-06](F04-06-topologia-identidade.md), [mapa MONO-01](diagrams/MONO-01-workspaces.md).
