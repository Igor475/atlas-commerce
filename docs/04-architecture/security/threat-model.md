# Modelo de ameaças inicial — STRIDE + cenários de abuso

> **ID:** AC-THR-001 • **Versão:** 0.1 • **Estado:** pré-modelo qualitativo, **não homologado**. Risco abaixo é ordinal (A=alto, M=médio), não pontuação quantitativa. Ameaças, controles e evidências devem ser revisitados depois de escolher APIs, PSP, domínio e hospedagem.

## Escopo e ativos

Ativos: contas/credenciais/sessões, dados pessoais/endereço, catálogo/preços/cupom, saldos físicos e reservas, evidência PSP, refund, entitlements/licenças e arquivos digitais privados, segredos de integração, logs e backups.

Atores: cliente legítimo, visitante malicioso, credencial comprometida, operador abusivo, integração PSP adulterada, worker quebrado, atacante de links/mídia. Trust boundaries detalhadas em [trust-boundaries.md](trust-boundaries.md).

| ID | Categoria STRIDE | Ameaça / superfície | Consequência | Risco inicial | Controles projetados | Prova necessária |
|---|---|---|---|---|---|---|
| TH-001 | S | Sessão de cliente roubada ou refresh reproduzido | Conta/endereços expostos | A | SEC-006–009; revogação e rotação | SA-003/004 |
| TH-002 | E | IDOR/BOLA em pedido/endereço/entitlement | Vazamento e leitura alheia | A | SEC-002/025/028, recurso + titularidade | SA-001/009 |
| TH-003 | E | Conta de catálogo executa refund | Perda financeira | A | SEC-003/005/022, segregação | SA-002/008 |
| TH-004 | T | Preço/frete/cupom adulterado no browser | Subcobrança | A | SEC-010/017–019, cálculo server-side | SA-005, CA-004/007 |
| TH-005 | T/D | Reservas concorrentes para último SKU | Oversell/fraude | A | SEC-018/024, locks/constraints | SA-006, CA-001/011 |
| TH-006 | T | Kit parcialmente reservado por corrida | Violação de venda/composição | A | RN-088–091, transação all-or-nothing | CA-022/024 |
| TH-007 | S/T | Webhook forjado ou assinatura não validada | Pedido pago sem captura | A | SEC-020/021; raw payload e prova | SA-007 |
| TH-008 | R/T | Evento PSP duplicado ou fora de ordem | Efeito duplicado e ledger inconsistente | A | SEC-019–024; inbox + dedup + state guard | CA-003, SA-007 |
| TH-009 | T | Callback tardio tenta reabrir EXPIRED | Venda sem estoque | A | RN-073–078, guards e refund | CA-005/014–016 |
| TH-010 | T/D | Refund concorrente, timeout incerto | Dupla devolução | A | SEC-022/024, saldo reservado, chave | SA-008, CA-018/019 |
| TH-011 | I | Arquivo privado divulgado como prévia/CDN | Vazamento de obra/licença | A | SEC-025–027; segregação storage | SA-009 |
| TH-012 | T/I | URL assinada longa ou compartilhada | Acesso além da janela autorizada | M | TTL curto, auth prévia, sem DRM falso | SA-009 e teste expiração |
| TH-013 | T/E | Upload malicioso/HTML/polyglot | Exploração, conteúdo público indevido | A | SEC-012/013, inspeção e isolamento | SA-010 |
| TH-014 | I/R | Logs/traces com tokens/PII | Vazamento em operação | A | SEC-028–030/032, redaction | SA-011 |
| TH-015 | S/E | Segredo de integração/CI vazado | Ação técnica privilegiada | A | SEC-032–034/038, rotação e least privilege | teste CI/secret scan |
| TH-016 | D | Falha de job antes de notificação/compensação | Inconsistência durável | A | RN-070, SEC-016/024/034, outbox/replay | CA-010 e retry pós-restart |
| TH-017 | I/D | Backup não restaurável ou armazenado abertamente | Perda/exposição de dados | A | SEC-035/036, restore e acesso mínimo | SA-012 |
| TH-018 | E | Admin redefine MFA de outro operador sem processo | Escalada/abuso financeiro | A | SEC-003–005, step-up, auditoria | SA-002/004 e caso específico |

**STRIDE:** S spoofing, T tampering, R repudiation, I information disclosure, D denial of service, E elevation of privilege.

## Risco residual e processo

- Todos os riscos acima permanecem **abertos até evidência**; o texto de mitigação indica intenção, não controle comprovado.
- Não criar falso negativo: ampliar casos com DFD de implementação, avaliação de provedores, SSRF/CSRF, ataque de fila, exfiltração via suporte, dependências e cadeia de suprimentos quando houver superfícies concretas.
- Documentar `owner`, ambiente, teste executado, findings e aceitação explícita dos riscos remanescentes; no portfólio não presumir um comitê de segurança real.
