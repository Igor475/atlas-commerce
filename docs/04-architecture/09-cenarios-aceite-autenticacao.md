# AC-AUTH-TEST-001 — Cenários de aceitação para autenticação

> **Estado:** PLANO DE TESTES; nenhuma implementação ou evidência existente. IDs `AUTH-001–020` são locais à Fase 03 e **não substituem** os IDs SA e CA da Fase 02.

| ID | Cenário | Resultado verificável | Rastreabilidade |
|---|---|---|---|
| AUTH-001 | Login de cliente ativo | Sessão opaca em cookie protegido; hash no banco; sem token no JSON | SEC-001/007 |
| AUTH-002 | Senha inválida/conta inexistente ou suspensa | Resposta genérica; negar sessão; sem enumeração por status/timing relevante | SEC-001/006/009 |
| AUTH-003 | Tentativas automatizadas login/recovery | Limites proporcionais, observáveis e sem negar usuários legítimos em massa | SEC-009/015 |
| AUTH-004 | Login de operador só com senha | Cria desafio MFA restrito; API administrativa sempre nega | SEC-003/004, SA-002 |
| AUTH-005 | MFA válido / inválido / duplicado / expirado | Sucesso único cria sessão; replay e tentativa vencida negados | SEC-004/008 |
| AUTH-006 | Desafio WebAuthn com RP ID/origem errados e UV ausente | Verificação rejeita resultado; não rebaixar fator silenciosamente | SEC-004 |
| AUTH-007 | Reset de senha com token usado duas vezes | Um único consumo atômico; segundo negado | SEC-008, SA-004 |
| AUTH-008 | Recuperação de senha de operador sem MFA | Senha muda conforme política, mas acesso privilegiado continua exigindo MFA | SEC-004/008 |
| AUTH-009 | Perda de fator MFA privilegiado | Somente fluxo de recovery forte/registrado; e-mail sozinho não dá acesso | SEC-004/005 |
| AUTH-010 | Logout e reutilização da sessão anterior | Cookie antigo não autentica mesmo se cliente o reenviar | SEC-007, SA-003 |
| AUTH-011 | Logout global e sessões em duas abas/dispositivos | Todos os identificadores revogados são negados | SEC-007 |
| AUTH-012 | Expiração absoluta e por inatividade | Verificação no servidor; request de cliente não altera limite absoluto | SEC-007 |
| AUTH-013 | Cookie fixado antes de autenticação | Identificador pós-login é novo; fixação não preserva privilégios | SEC-007 |
| AUTH-014 | Mutações sem CSRF válido, Origin estranho ou content-type inseguro | Negadas mesmo com cookie válido; ações legítimas funcionam | SEC-011 |
| AUTH-015 | Storefront acessa admin / cookie entre subdomínios | Sessões isoladas, sem `Domain` nem confusão de classe | SEC-001/003/007 |
| AUTH-016 | Cliente A consulta pedido ou mídia de B | 403/404 conforme política sem vazamento; B mantém acesso | SEC-002/025/028, SA-001/009 |
| AUTH-017 | Financeiro solicita e aprova seu próprio refund | Regra de segregação nega e audita quando exigida | SEC-003/005/022, SA-002/008 |
| AUTH-018 | Sessão staff sem recent-auth inicia ação sensível | Step-up exigido, sem confiar no boolean do navegador | SEC-005/022 |
| AUTH-019 | Mudança de papel, MFA ou senha com sessão existente | Rotação/revogação apropriada, auditoria e defesa de autoelevação | SEC-003/004/007/030 |
| AUTH-020 | Logs, erros, cache SSR e health | Nenhum token de sessão/MFA/recovery ou dado de outro usuário em logs/cache | SEC-014/030/038, SA-011 |

## Evidência futura por caso

Registrar comando/cenário, commit, ambiente e data, setup de banco real, resultado observado, asserção, trace redigido e limitação. Executar testes de segurança positivos **e negativos**; simular concorrência no uso único de token/sessão; distinguir unitário, integração real e E2E.

**Gate de implementação:** aprovar ADR-003, valores TTL, topologia, MFA/recovery, controles SSR/cookie e matriz de autorização antes de gerar os prompts de código para o Codex.
