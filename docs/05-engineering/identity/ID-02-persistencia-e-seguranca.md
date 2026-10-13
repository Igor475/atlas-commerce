# ID-02 — Persistência, segurança e preparação operacional de Identity

> **Status:** ARQUITETURA PROPOSTA PARA IMPLEMENTAÇÃO LIMITADA EM BANCO DESCARTÁVEL. Não executar migrations no projeto Supabase remoto, não reaproveitar schema `spike` como modelo de domínio.

## Modelo lógico e integridade

| Entidade lógica | Invariantes mínimos |
|---|---|
| `customer_account` | ID opaco; e-mail normalizado segundo política explícita; unicidade case-insensitive comprovada; status; timestamps e auditoria mínima. Sem autoatribuição privilegiada |
| `password_credential` | hash **Argon2id** com parâmetros e versão, sem plaintext e sem log; atualização atômica com revogação na recuperação |
| `auth_session` | ID público aleatório >=256 bits, **somente HMAC/hash no banco**, classe `CUSTOMER`, criada/atividade/expiração absoluta e ociosidade, revogação, metadados minimizados, índices |
| `account_token` | token aleatório forte, hash, purpose `VERIFY_EMAIL`/`RESET_PASSWORD`, TTL, versão, single-use, índice de integridade, transição concorrente com lock/UPDATE condicional |
| `auth_security_event` | ação, hora do DB, sujeito opcional, resultado/código e correlação; nada de token/senha/IP inteiro em excesso |
| `email_outbox` | intenção durável, deduplicação, entrega não presumida, tentativa/erro sem segredo em logs; adapter fake somente em testes |
| `auth_abuse_window` (se necessário) | contadores compartilhados entre instâncias, TTL/índices, fairness; **não** confiar apenas em memória do processo Render Free |

Projetar índices, FK, unicidade, constraints e comportamento concorrente com migrations **isoladas da fixture `spike`**. Prisma v7 requer adapter e `pg.Pool` limitado; usar estratégia de schema/config/migrations que não reinterprete a migration experimental. Caso o setup atual não suporte isolamento seguro, interromper e documentar alternativa antes de alterar `schema.prisma` original.

## Sessão e cookies

- Cookies host-only `__Host-` com `Secure`, `HttpOnly`, `Path=/`, sem `Domain`, `SameSite` apropriado e **classe por contexto**; apenas ambiente com TLS/ingress validado pode habilitar modo público. No ambiente `localhost`, documentação de exceções restrita e rastreável, sem desativar segurança de deploy.
- Validar conflito de nome `__Host-atlas_session` (proposta OpenAPI) vs `__Host-atlas-session` (ADR). Escolher nome efetivo com contrato coerente e teste de host; não tentar emitir ambos para contornar divergência.
- Sessões de clientes têm **parâmetros iniciais 12h absoluta/30min inativa** segundo baseline, configuráveis e medidos pelo servidor; não permitir sliding sem limite absoluto. Staff 8h/15min é referência **futura**, não implementada aqui.
- O token de sessão é secret, emitido após login, **nunca** no JSON, URL, localStorage ou logs. Persistir somente hash protegido. Login gera ID novo (session fixation), logout revoga no DB, não apenas cookie. Logout-all invalida múltiplos clientes/navegadores.
- Calcular elegibilidade em tempo confiável do banco; comportamento após revogação deve negar mesmo se cookie antigo reaparece. Considerar concorrência logout/request e read-after-write.

## Registro, senha e recuperação

- Argon2id com memória/custo medidos no ambiente; rehash evolutivo. Política de senha baseada em orientação atual e documentação existente, sem composições arbitrárias; senhas comprometidas só se integração/estratégia segura comprovada, nunca enviar senha a serviço não aprovado.
- Não revelar que e-mail existe em register, recovery e reenvio; mesmo resultado público e telemetria segura. Login não diferencia conta suspensa/inexistente/senha incorreta ao cliente; registrar código interno protegido.
- Tokens aleatórios com finalidade e TTL, consumo único **transacional**; concorrência com dois clientes reais. Após reset, revogar sessões conforme política; **não** remover MFA staff.
- Ausência de provedor de e-mail via HTTPS: fluxo de entrega **não funcional no ambiente público**, e nenhum token é devolvido ao HTTP para compensar; testes podem usar adapter fake em ambiente isolado sem segredo real.

## Controles de abuso e segurança de fronteira

- Rate limit distribuído/persistido apropriado a Render Free (não depender só de timers/cache em memória); proteção proporcional por IP confiável (trusted proxy explicitamente configurado) + identidade normalizada sob HMAC, com limite de cardinalidade/retensão. Não bloquear toda a população por um IP compartilhado de modo indiscriminado.
- CSRF mesmo para login/logout/register e operações cookie-auth: contexto de pré-login não reutilizável como privilégio e token vinculado à sessão/origem; Origin/Referer validado, content-type restrito, CORS deny-by-default. `SameSite` e CORS isoladamente não bastam.
- Limitar payloads, normalizar Unicode com critério, validar campos, usar queries parametrizadas/Prisma seguro; sem SQL interpolado, redirecionamentos externos livres ou injeção de header/cookie.
- Telemetria sem password, hash, raw token, sessão, email completo, webhook secret, URL DB, PII desnecessária. `Cache-Control: no-store` para auth/`/me`, erros RFC9457 e requestId gerado/normalizado pelo servidor.
- Nenhum bypass de staff com flag `isAdmin`, `role=ADMIN`, cookie cliente, querystring ou falha de MFA. Negar toda sessão staff nesta etapa, inclusive login staff com senha correta.

## Ambiente e rollout

- `local`/`ci`: PostgreSQL descartável, migration explícita, testes positivos/negativos; `pnpm check`/lint/build/test + PGSP 16/16 preservados.
- `demo`: **não ativar** auth se banco identity, provedor e-mail, TLS, proxies e host/cookie/CSRF não homologados. Configuração inválida falha de modo explícito e seguro; health live permanece honesto e readiness considera dependências configuradas.
- `production` comercial: fora do escopo, exigir governança de segredos, monitoração, backup/restore, privacidade/legal, MFA, DDoS/abuso e homologações específicas.

## Referências vinculantes

[ADR-003](../../04-architecture/adrs/ADR-003-autenticacao-sessoes.md), [CT-04](../contracts/CT-04-sessoes-csrf-e-webhook.md), [F04-06](../F04-06-topologia-identidade.md), [segurança](../../07-security/security-requirements.md), [AUTH](../../04-architecture/09-cenarios-aceite-autenticacao.md).
