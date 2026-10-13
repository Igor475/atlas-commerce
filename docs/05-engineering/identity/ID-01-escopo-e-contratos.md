# ID-01 — Escopo, fronteiras e contrato mínimo da identidade de clientes

> **Status:** PLANO PARA EXECUÇÃO CONTROLADA PELO CODEX, NÃO IMPLEMENTADO NESTE DOCUMENTO. Não atualizar ADR-003 nem declarar aprovação de staff MFA. A entrega prepara APIs exclusivamente de clientes em teste local, reconciliando contratos antes de código.

## Objetivo e resultado esperado

Tornar `apps/api` capaz de persistir e comprovar **conta de cliente**, verificação de e-mail, login, sessão opaca revogável, leitura `/me`, logout, início/conclusão de recuperação e proteção CSRF/abuso. Cada fluxo deve possuir testes com **duas conexões PostgreSQL reais** onde houver disputa de uso único, sessões ou tokens.

## Inventário candidato de endpoints (`/api/v1`)

| Verbo | Rota candidata | Efeito permitido na ID-01 | Guardas |
|---|---|---|---|
| `GET` | `/auth/csrf` | Inicializa proteção de pré-autenticação/mutação, sob controle de origem | contexto vinculado ao browser, `no-store`, prevenção de fixation |
| `POST` | `/auth/register` | Registra conta `PENDING_VERIFICATION`, gera intenção durável de e-mail | anti-enumeração, Argon2id, política antiabuso, consentimentos necessários definidos |
| `POST` | `/auth/verify-email` | Consome token forte **uma vez**, ativa conta | hash do token, finalidade/TTL, atomicidade |
| `POST` | `/auth/verify-email/resend` | Solicita reenvio idempotente/limitado | resposta neutra, invalidação/rotação do token conforme política |
| `POST` | `/auth/login` | Emite sessão `CUSTOMER` somente para conta elegível | checagem de hash, CSRF+Origin, limites por identidade/IP, sem STAFF |
| `GET` | `/me` | Retorna identidade pública mínima do cliente atual | cookie opaco válido, owner/status, `no-store` |
| `POST` | `/auth/logout` | Revoga sessão no DB; limpa cookie | mesmo com cookie antigo, CSRF, idempotente |
| `POST` | `/auth/logout-all` | Revoga todas as sessões da conta autenticada | CSRF, persistência, opção de reauth/step-up conforme decisão |
| `POST` | `/auth/recovery/request` | Cria solicitação de redefinição em fluxo neutro | antienumeração, token de finalidade específica, controles antiabuso |
| `POST` | `/auth/recovery/complete` | Consome token atomically, altera hash, revoga sessões | senha policy, auditoria redigida, replay negado |

Os nomes/verbos são **propostos nesta etapa para ratificação pelo código/contratos** e **não podem ser tratados como rotas existentes**. O Codex deve registrar os deltas no inventário CT e OpenAPI antes de escrever controllers, e parar caso encontre conflito normativo. Nenhum endpoint de staff, WebAuthn/TOTP, papel financeiro, endereço, pedidos, Stripe ou perfil avançado será exposto por conveniência.

## Estados de domínio

- Conta: `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `DISABLED`.
- Sessão: `ACTIVE`, `REVOKED`, `EXPIRED`, classe fixa `CUSTOMER` nessa entrega.
- Token de verificação/recuperação: `ISSUED`, `CONSUMED`, `EXPIRED`, `INVALIDATED`, propósito único, consumo transacional concorrente.
- Operação de e-mail: intenção persistida/encaminhada/tentada/falha com deduplicação; **não** afirmar entregue se não houver provedor real.

## Contrato de transporte

DTOs de entrada com limites, campos permitidos explicitamente, `password` nunca em response e `email` minimizado. Respostas de login não incluem cookie, senha, hash, token de sessão ou grants; cookie de sessão apenas por `Set-Cookie`. `GET /me` usa `sessionClass: CUSTOMER` e nenhum capability staff. Erros RFC 9457 sem enumeração, incluindo resource/identity indeterminados. As telas P16–P20 e P29/P31 da FD-03 serão consumidores futuros; **não** implementar Next.js agora.

## Limites de função

- Cadastro público **não** atribui staff, refund, admin ou MFA bypass; seeds administrativos automáticos não são permitidos.
- Funcionalidades de login/reset públicas **não** ficam acessíveis em modo demo com e-mail externo não configurado/seguro. Em desenvolvimento e CI, adapter de e-mail de teste é permitido para capturar tokens **apenas no processo de teste**, nunca no HTTP ou no log público.
- Sem status `ACTIVE` a partir do browser; verificação é transição persistida autenticada por token de uso único.
- Reuso de token não reativa conta ou troca senha de novo. Senha inválida e conta inexistente produzem negação equivalente.
- Nenhuma autorização de recurso comercial por UI; módulos futuros validarão titularidade no NestJS.

## Evidência de encerramento

Conforme [ID-03](ID-03-matriz-de-testes.md), exigir testes locais e CI com PostgreSQL descartável, cookies/CSRF/origem, recuperação, rate limit concorrente, replay, negação de staff, vazamento de segredo e estabilidade dos gates antigos F04-03/04/05. A definição de hosts reais, MFA staff e Supabase L1 é posterior, jamais implícita.
