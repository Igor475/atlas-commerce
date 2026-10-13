# ID-03 — Matriz de aceitação Identity de clientes (ID-001–036)

> **Status: TODOS PLANEJADOS, NÃO EXECUTADOS.** Um resultado PASS precisa de comando, ambiente, SHA, resultado observado e referência de teste; BLOCKED precisa justificativa. As evidências existentes PGSP F04-04/F04-05 **não** comprovam este novo módulo.

| ID | Cenário verificável / resultado esperado |
|---|---|
| ID-001 | Bootstrap sem configurações Identity: build/test/health anteriores intactos; readiness não finge banco pronto. |
| ID-002 | Migrations Identity aplicadas só em PostgreSQL descartável e idempotentes em ambiente de teste. |
| ID-003 | Separação de schema/cliente Identity não altera fixture `spike` nem suas migrations. |
| ID-004 | Cadastro válido cria conta `PENDING_VERIFICATION`, nunca `ACTIVE` por default. |
| ID-005 | E-mail já existente/cadastro repetido/recovery respondem de forma neutra sem enumeração. |
| ID-006 | Senha nunca aparece em DB plaintext, logs, HTTP response, eventos ou error telemetry. |
| ID-007 | Senha: Argon2id/rehash parametrizado, verificação correta e falha segura. |
| ID-008 | Verificação de email válida ativa conta com token forte, TTL e finalidade correta. |
| ID-009 | Duas verificações simultâneas do mesmo token: somente uma transição; replay negado. |
| ID-010 | Token de propósito errado, inválido, usado ou vencido nunca habilita conta/reset. |
| ID-011 | Conta pendente, suspensa/desativada ou senha incorreta não recebe sessão. |
| ID-012 | Login ativo emite cookie HttpOnly/Secure/host-only conforme perfil real; nenhum token JSON. |
| ID-013 | Login rotaciona identificador (session fixation) e guarda apenas hash no PostgreSQL. |
| ID-014 | Cliente com token revogado/expirado recebe negação mesmo reutilizando cookie antigo. |
| ID-015 | Expiração absoluta vs inatividade no servidor, inclusive avançando relógio de teste. |
| ID-016 | Logout revoga sessão no DB; limpeza de cookie sozinha não caracteriza sucesso. |
| ID-017 | Logout-all invalida simultaneamente sessões de dois dispositivos. |
| ID-018 | Sessão CUSTOMER enviada ao admin ou STAFF endpoint nunca obtém privilégios. |
| ID-019 | Senha staff/MFA pendente não cria sessão administrativa via login público da ID-01. |
| ID-020 | Mutações sem Origin válido, CSRF válido ou Content-Type permitido negadas. |
| ID-021 | Contexto CSRF pré-login não permite fixar sessão nem contornar revogação. |
| ID-022 | Início de recovery não revela existência de conta e aplica limites de abuso. |
| ID-023 | Recovery válido troca Argon2id atomically e revoga sessões prévias. |
| ID-024 | Recovery concorrente/duplicado é consumido uma vez e não troca senha novamente. |
| ID-025 | Reset de cliente não altera MFA de staff nem concede capacidade privilegiada. |
| ID-026 | Limites por identidade/IP com concorrência real e sem depender de memória Render. |
| ID-027 | Origem forjada, trusted-proxy inválido, CORS amplo ou cookie inseguro são rejeitados. |
| ID-028 | `GET /me` devolve apenas campos próprios mínimos; resposta no-store e sem cross-account cache. |
| ID-029 | Mass assignment: `role`,`isAdmin`,`status`, campos desconhecidos e tamanho excessivo negados. |
| ID-030 | Resposta RFC9457 e logs sem email completo, hash, senha, sessão, reset token, URL de DB. |
| ID-031 | Perda/reinício de PostgreSQL causa indisponibilidade explícita, nunca autentica sem DB. |
| ID-032 | Falha de e-mail: outbox pendente, sem afirmar entrega; API pública bloqueada se dependência não homologada. |
| ID-033 | Reativação/retry de email outbox não duplica token ativo nem muda account ACTIVE sem prova. |
| ID-034 | `pnpm lint`, `typecheck`, `test`, `build`, `check`, `smoke`, `diff --check` executados e reportados. |
| ID-035 | CI PostgreSQL descartável comprova concorrência auth, preservando 16 PGSP e cleanup. |
| ID-036 | Amostra de HTTP real/proxy local valida atributos Set-Cookie, CSRF, classe e cache. |

## Níveis de evidência

- **Unit**: validação de DTO, códigos de erro, política de senha, contrato de cookie/CSRF, redução de dados.
- **Integration PostgreSQL real**: registro, unicidade, tokens, revogação, recuperação, concorrência e contadores de abuso em duas transações independentes.
- **HTTP integration**: NestJS + cookie jar + Origin + CSRF; sem atalhos que chamem service privado para simular autenticação.
- **E2E real de domínio/host**: somente após topologia Vercel↔Render, TLS e provedor de e-mail homologados; não marcar como feito com localhost.
- **CI**: job com banco **descartável e escopo próprio**, sem chaves Supabase e sem `db push` no banco compartilhado. Preservar PGSP 16/16 e gates existentes.

## Casos de falha prioritários

Teste de replay do mesmo token em concorrência, duas sessões independentes antes de logout-all, troca de senha simultânea com validação de sessão, login inválido e existente com respostas não enumeráveis, uso de cookie CUSTOMER na origem admin, falha de PostgreSQL, recuperação enviada sem provedor e tentativa de assumir role pelo payload.

**Critério de encerramento:** nenhum 503/401 de dependência vira sucesso falso; nenhum segredo emitido em JSON/log; nenhum login de staff permitido sem MFA completo e decisão específica; descrever explicitamente cases BLOCKED por host, Stripe, e-mail ou Supabase L1.
