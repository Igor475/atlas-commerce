# INT-01/INT-02 — Sequência de integração local aprovada

**Status:** plano, **não implementado/não executado**. Orientação após a estabilização de ID-01 (14/10/2026).

## Premissas e decisões

- B2C demonstrativo; única empresa fictícia, sem multitenancy; `apps/api` NestJS é autoridade de Identity, sessão, RBAC e domínio. **Não migrar para Supabase Auth**, Data API ou SMTP.
- Resend para envio **transacional** de verificação/recovery por HTTPS a partir do backend. Sem newsletters, marketing ou destinatários públicos enquanto faltar domínio remetente verificado.
- Supabase PostgreSQL Free é banco candidato de desenvolvimento remoto; **não é automaticamente uma fixture descartável**. Os scripts que só aceitam loopback devem permanecer fechados. L1 remoto é verificação **somente leitura**, sem roles de escrita, migrations ou dados pessoais reais.
- O projeto Supabase correto não apareceu na organização/conta vinculada à consulta atual. **Nunca aproveitar projetos ERP** por proximidade. Ref/organização precisam de confirmação independente antes do L1 real.
- Os serviços Vercel/Render estão no plano, **não ativados nesta etapa**; HTTPS/origens reais e domínio da assinatura do Stripe continuam futuros. Não inventar URL ou conferir cookie público via curl local.

## Sequência com gates

| Etapa | Tipo | Entrega | Restrição |
|---|---|---|---|
| G0 | Estabilização ID-01 | CI Quality aprovado em `0fd36c9`, audit local sem advisories conforme relatório; Windows CRLF permanece | CI Linux não é homologação de produção |
| INT-01a | Local fake | adapter Resend, driver fake, outbox e testes resilientes | nenhuma rede; nenhum envio real |
| INT-01b | Real restrito | envio explícito de uma mensagem para caixa autorizada, verificar eventuais estados | exige API key local e remetente/teste permitido; não habilitar login público |
| INT-02a | Local/config | preparar profile L1, TLS, guards, pool, papel restrito | o `cloud-readonly` atual não pode ser habilitado por editar uma flag genérica |
| INT-02b | Remoto read-only | SELECT 1/metadata/roles/TLS e recuperação | projeto/ref correto e consentimento; nenhum DDL/DML |
| INT-03 futuro | Escrita controlada | papel runtime Identity com privilégios mínimos, migração isolada, backup/restore | decisão/autorização própria. Não executar neste pacote |
| ID-02 futuro | Admin/MFA | staff separado, WebAuthn/RP ID/topologia, step-up | RP ID/host e recuperação ainda não homologados |
| HOST-01 futuro | Browsers TLS | origens exatas, cookies host-only, CSRF, cross-user caches | somente depois de hosts publicados e allowlist controlada |

## Design de e-mail e links

Links verificadores e de recuperação devem ser gerados com origem explícita e allowlisted, não `Host`/`X-Forwarded-Host` arbitrário, nem o host `Render` inferido; o frontend Coleção Viva ainda não tem essas páginas implementadas. Teste envio isolado ≠ fluxo E2E clicável. Tokens não podem ser logados, inseridos em analytics ou repassados por Referer; configurar `Referrer-Policy: no-referrer` ao implementar as páginas. Dados de destinatário e conteúdo sensível são minimizados nos logs e no Resend.

## Riscos por provedor

- **Resend `onboarding@resend.dev`**: testes limitados à caixa registrada e destinos de teste do próprio Resend; enviar a outros usuários requer domínio verificado sob controle de DNS. `vercel.app`/`onrender.com` **não representam DNS gerenciável pelo responsável** para autenticar um remetente.
- **Resend outbox**: aceitar HTTP do provedor ≠ mensagem entregue na caixa. Idempotency key externa tem janela de 24 horas; ledger interno precisa continuar durável após essa janela, e tentativa ambígua não deve ser reenviada cegamente.
- **Supabase Free**: projeto pode suspender por inatividade; conexão, TLS, pool, backup e restore devem ser medidos; a role privilegiada do Dashboard não pode ser usada como credencial de runtime. Não colocar URL de banco em `NEXT_PUBLIC_*`.
- **Vercel/Render temporários**: testar hostnames estáveis de deployments específicos e permitir origens exatas; não usar `*.vercel.app` ou `*.onrender.com` como allowlist, e nunca considerar domínios temporários habilitação automática de WebAuthn.

## Escopo inalterado

RN/PC/SEC/ADR, Stripe Embedded Test Mode (sem prova 40/30/5), R2, P01–P50/A01–A14, direção Coleção Viva, UID-16 ratificado, PGSP e probe fixtures. Sem deploy, Stripe charge, envio e-mail real involuntário nem migration remota.
