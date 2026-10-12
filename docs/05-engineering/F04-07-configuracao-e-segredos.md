# F04-07 — Contrato de ambientes, configuração e segredos

> **Status:** catálogo de conceitos de configuração, **não** arquivo `.env` e não configuração executada. Valores e nomes finais são definidos no bootstrap. Nunca publicar tokens, secrets, keys, strings de conexão ou credenciais.

## Ambientes

| Ambiente | Responsabilidade | Restrições |
|---|---|---|
| `local` | desenvolvimento/integração isolados, fixtures licenciadas/fictícias | banco separado, Stripe teste e R2 dev opcional; nunca dados reais compartilhados |
| `ci` | lint, typecheck, testes de unidade/contrato/integração em DB efêmero | secrets mínimos, curta duração, sem acesso ao banco do demo por padrão |
| `demo` | Vercel Hobby, Render Free, Supabase Free, R2 Free | **não comercial**, Stripe Test Mode; rotinas/limites free, sem SLA |
| `production` futuro | ainda não autorizado | planos, domínios, LGPD/fiscal, backup/worker/PCI e aprovação independentes |

## Escopo de configuração a documentar no código depois

| Serviço | Quem pode ler | Nunca expor |
|---|---|---|
| Supabase `DATABASE_URL` runtime TLS/pooler | Render/NestJS apenas | Vercel bundle, browser, logs, Git, URL em erros |
| Supabase conexão migration | Pipeline autorizado/restrito | processo do browser; credencial de runtime com DDL indiscriminado |
| Stripe Secret/Test + webhook secret destino | Payments backend | cliente, telemetry, docs; test/live misturados |
| Cloudflare R2 account/endpoint/bucket/key | Backend storage adapter | `NEXT_PUBLIC_`, URL pública de objeto integral e signed URLs nos logs |
| Sessão/CSRF/MFA encryption | NestJS Identity | browser, repo, build Vercel, auditoria |
| API HTTP de e-mail | Backend worker/notification | SMTP assumido funcional no Render Free; chave no Git |
| URL pública de API | Config não secreta validada | não confundir com URL de DB/serviço interno |

## Política operacional

- Validar env e segredos **no startup** do módulo dependente (fail-fast controlado), sem log de valor; não exigir credencial Stripe/R2 em testes unitários de módulo sem integração.
- Separar segredos por ambiente e privilégios mínimos; rotação e revogação acompanhadas por execução controlada, sem impressão.
- Deploy seguro com checklist de `Origin`, `Host`, proxies confiáveis, TLS e redirects; Vercel e Render podem gerar URLs temporárias de preview, não adicioná-las automaticamente como origin autorizado.
- Backups do Supabase Free exigem export controlado fora da Render Free, criptografia e restore com evidência; estado do R2 pode precisar de rotina independente.
- Evitar uso de serviços pagos/assinaturas de provedores automaticamente no Codex; provisionamento real requer comando e decisão explícitos.

Referências: [ADR-008](../04-architecture/adrs/ADR-008-controles-operacionais.md), [ADR-009](../04-architecture/adrs/ADR-009-selecao-render.md), [ADR-010](../04-architecture/adrs/ADR-010-postgresql-supabase.md), [segurança](../07-security/security-requirements.md).
