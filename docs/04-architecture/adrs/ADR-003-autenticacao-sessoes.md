# ADR-003 — Sessões opacas, autenticação e MFA do Atlas Commerce

> **Status:** PROPOSTA RECOMENDADA PARA APROVAÇÃO, ainda não aceita nem implementada. **Versão:** 0.3.0 (12/10/2026).  
> **Relacionamentos:** DS-001/002/003; RN-009–014, RN-064–069; SEC-001–011/014/022/028–030; SA-001–004/008/009.  
> **Referência de implementação:** [contrato de autenticação](../08-contratos-de-autenticacao.md), [cenários de aceite](../09-cenarios-aceite-autenticacao.md) e [matriz](../security/authorization-matrix.md).

## Problema e forças arquiteturais

O produto precisa oferecer autenticação para compradores e para funcionários, com revogação imediata no servidor, recuperação de conta, segurança no checkout Stripe e operações administrativas de maior risco. Escolher a tecnologia da sessão sem a topologia web/API definida criaria falsos controles de cookie, CORS e CSRF. A solução deve caber em um monólito NestJS + frontend Next.js e não requer OAuth/OIDC próprio nem microserviços no MVP.

## Alternativas consideradas

| Opção | Benefícios | Custos / riscos | Avaliação |
|---|---|---|---|
| **A. Sessão opaca no servidor com cookie HttpOnly** | Revogação explícita, redução de dados no cliente, simplicidade de autorização | Consulta/validação de sessão no backend; escalar persistência | **Recomendada** |
| B. Access JWT curto + refresh rotativo | API stateless em parte, suporte eventual a outros clientes | Mais estados de revogação/rotação, replay, coordenação entre abas | Adiar até necessidade demonstrada |
| C. Provedor de identidade externo/OIDC | Serviços de identidade gerenciados | Fornecedor, custos, integração com permissões, MFA e recovery | Possível evolução, não necessário ao MVP |

## Decisão arquitetural proposta

1. **Módulo Identity & Access do NestJS** autentica usuário e aplica autorização por recurso/ação. O PostgreSQL mantém sessão revogável, conta/credenciais, tentativas de recuperação, fatores MFA e histórico de segurança. Redis é apenas otimização eventual e nunca autoridade final de revogação.
2. **Cookie host-only** `__Host-atlas-session` (ou nomes separados por superfície) com `Secure; HttpOnly; Path=/; SameSite=Lax` como baseline a validar. **Sem `Domain`**. Em backoffice, `SameSite=Strict` pode ser preferido se compatível com fluxos legítimos. Cookies nunca carregam senha, permissões de autoridade ou tokens Stripe.
3. **Topologia recomendada:** cada frontend usa requisições `/api` de sua **própria origem**, encaminhadas ao NestJS por proxy/reverse proxy controlado. Storefront e administração devem ter sessões e cookies independentes por host, mesmo usando o mesmo backend. Hosts reais, ingress e redirects são definidos na decisão de deploy; não presumir domínio existente. Não compartilhar cookie em domínio pai.
4. O valor da sessão é aleatório criptograficamente (preferir >=256 bits), emitido pelo servidor após autenticação completa. Persistir **hash do identificador** e metadados mínimos, não o token em claro. Gerar/rotacionar em login e mudança de privilégio; revogar no logout, logout global, suspensão da conta e eventos definidos de recuperação. Nunca aceitar ID arbitrário vindo do cliente.
5. Aplicar **expiração absoluta e por inatividade no servidor**; avaliar como valores iniciais, sem homologação: cliente 12h absoluta/30min inatividade, backoffice 8h absoluta/15min inatividade. Atividade só renova prazo inativo dentro do limite absoluto. Riscos e UX poderão ajustar os limites mediante decisão registrada.
6. **CSRF** em operações que alteram estado com sessão em cookie: Origin/Referer seguro e política de token por sessão (synchronizer ou double-submit **assinado e vinculado à sessão**), validação de tipo/método e defesa em profundidade com SameSite. Não declarar que CORS, SameSite ou HttpOnly, isoladamente, bloqueiam CSRF. Endpoint Stripe webhook usa autenticação própria por assinatura raw body, sem CSRF de sessão e sem isenção global.
7. Credenciais locais: **Argon2id** com parâmetros medidos e atualizáveis; requisitos de senha e bloqueio de senhas comprometidas definidos antes da implementação, sem exigir regras artificiais de composição. Não registrar senha, hash, código MFA ou token de recuperação em logs. Evitar enumeração de usuários em login/recovery.
8. **Backoffice exige MFA antes de emitir sessão administrativa plenamente autorizada.** WebAuthn/FIDO2 com user verification é a opção preferida contra phishing; TOTP é alternativa controlada para compatibilidade após decisão de rollout. Qualquer fallback/recovery requer política própria, não downgrade silencioso. E-mail/SMS isolados não devem contornar MFA administrativo.
9. **Estados separados:** senha válida pode criar apenas *desafio MFA pendente*, com token efêmero restrito e finalidade específica, não uma sessão administrativa. Confirmar segundo fator em desafio válido cria/rotaciona a sessão privilegiada. Conta sem MFA configurado deve seguir onboarding protegido, não obter permissões de operador antes do cadastro do fator.
10. **Step-up e segregação** para operações financeiras e alteração de MFA/permissions; exigir autenticação recente e condição de permissão/alçada. Dupla aprovação manual com **identidades diferentes** é proposta sujeita a DS-003, com bypass proibido por flag no cliente. Registrar intentos/decisões de acesso e auditoria minimizada.
11. Recuperação: token forte, uso único, finalidade/TTL, stored hashed; reset de senha **não remove fator MFA** e revoga sessões conforme política. Recuperação de MFA privilegiado requer outro fator/código previamente emitido ou processo excepcional com dupla verificação/auditoria e restrição temporária, nunca apenas caixa de e-mail.
12. Cookies e autenticação de humanos **não são usados** para jobs/Stripe. Webhook Stripe autentica assinatura; jobs usam identidade técnica escopada e fluxo independente (SEC-020/034).

## Parâmetros para ensaio — NÃO aprovados

| Parâmetro | Proposta de partida | Condição de aprovação |
|---|---|---|
| Sessão cliente | 12h absoluta; 30min inativa | UX, risco, testes de expiração e persistência |
| Sessão operador | 8h absoluta; 15min inativa | Segurança operacional e requisitos por papel |
| Desafio MFA pré-sessão | 5min, tentativa limitada | Rate limit/lockout proporcional e replay testados |
| Recent-auth para operação sensível | 5min como valor de avaliação | DS-003, ameaça e usabilidade |
| Recuperação de senha | token de 15min, uso único | Testes de segurança e abuso |
| Sessões simultâneas | permitir sessões por dispositivo, com revogação individual/global | Matriz de eventos de revogação e UI de sessões |

Parâmetros são **configuráveis com limites seguros**; não repassá-los ao Codex como defaults imutáveis antes de aprovação.

## Consequências e trade-offs

- O backend precisa resolver sessão e permissões em cada solicitação sensível, com consultas eficientes, revogação sem inconsistência de cache e auditoria proporcional.
- A estratégia elimina a necessidade de JWT de acesso no browser no MVP, mas não elimina riscos XSS, CSRF, fixação, roubo de cookie ou abuso de recuperação.
- A aplicação deve definir e testar origem, proxy confiável, headers HTTPS, cookies, redirecionamentos e autenticação SSR/CSR, incluindo logout entre abas.
- Não armazenar `sessionId`/refresh JWT em `localStorage` ou `sessionStorage`, nem conceder permissões por estado local do Next.js.

## Gates antes de aceitar a ADR

- [ ] Aprovar topologia de domínios/ingress e política exata de cookies/CSRF para loja e administração.
- [ ] Aprovar limites de sessão e step-up, requisitos de senha, política de MFA/fallback/recovery e bootstrap do primeiro operador.
- [ ] Aprovar matriz DS-003 (quem solicita/aprova refunds; permissões e contas separadas) e segregação de papéis.
- [ ] Definir modelo de sessões/fatores/códigos/challenges com retenção e rotas/contratos sujeitos a testes.
- [ ] Revisar [DFD-04](../security/DFD-04-sessoes-mfa.md), ameaças e [casos AUTH-001–020](../09-cenarios-aceite-autenticacao.md).
- [ ] Após Codex implementar, executar cenários SA-001–004/008 e AUTH com PostgreSQL real; **nenhum teste foi executado nesta fase documental**.

**Status final:** PROPOSTA, não aceitar automaticamente por publicação no GitHub. Fontes técnicas: [OWASP Session](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) e [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html).
