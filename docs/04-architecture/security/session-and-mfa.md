# DS-001/002 — Desenho de sessão e MFA (opções, não implementação)

## Baseline recomendado para avaliação

1. Navegador autentica contra API em conexão protegida. Avaliar cookie `HttpOnly`, `Secure`, `SameSite` coerente com domínios e proxy, sessão persistida/rotacionável no servidor, sem armazenar credencial de longa duração em `localStorage`.
2. A escolha final entre sessão opaca, cookies de refresh + token de acesso ou outro padrão exige ADR e definição de **topologia web/API**. Cookies enviados automaticamente impõem proteção CSRF proporcional a método e SameSite.
3. Argon2id ou função de password hashing apropriada com parâmetros medidos; antiforça bruta e antienumeração; não expor existência de conta.
4. Logout de dispositivo e global revogam credenciais persistentes; rotação atômica e detecção de replay onde aplicável; não aceitar refresh revogado.
5. Reset de senha usa token por propósito/TTL/uso único, hash armazenado quando adequado, canal verificado, expira sessões conforme política. MFA recovery não pode contornar autorização sem trilha.
6. Backoffice privilegiado exige MFA; step-up separado para permissão financeira/gerência de MFA quando decisão DS-003 o exigir.

## Ameaças a exercitar

- CSRF em ações de mudança/checkout usando cookies, origens inesperadas, XSS, fixação de sessão, refresh replay, token de reset reutilizado, enumeração de contas, alteração de e-mail e sessão roubada.
- Sem acesso à conta A por ator B mesmo com ID válido; URLs `download` revalidadas por entitlement.

## Pontos de decisão

- Se storefront e API estiverem em sites diferentes, avaliar credenciais cross-site, `SameSite=None; Secure`, CORS estrito, CSP e token CSRF. Preferir topologia de mesmo site quando disponível, sem assumir que é escolhida.
- Sessão única versus múltiplos dispositivos, renovação, TTL absoluto/inatividade, expiração administrativa, tratamento de alteração de senha.
- Política de MFA e backup codes, provisioning/admin recovery, criptografia de segredos TOTP e rotação de chaves. Não gerar valores nem caminhos de implementação sem ADR aprovado.

**Cenários:** SA-001–004; SEC-001–011. **Status:** nenhum teste executado.
