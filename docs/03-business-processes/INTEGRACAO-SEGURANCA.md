# Integração da Fase 02 com segurança

> **Identificador:** AC-MODEL-SEC-001 • **Versão:** 0.1.0 • **Status:** cruzamento de modelos propostos com requisitos SEC; sem evidência de implementação.

## Mapa de processos, riscos e segurança

| Artefatos existentes | Fronteira / risco a explicitar na arquitetura | Requisitos SEC | Critérios associados |
|---|---|---|---|
| UC-01 / UC-02 | Separar cliente/operador/PSP; autenticação, escopo administrativo, titularidade | SEC-001–005, SEC-009, SEC-014 | SA-001–004 |
| PR-01 / SQ-01 / SM-03 / PC-01 | Browser não controla preço; idempotência por ator; reserva atômica; tempo do banco e sessão externa compatível | SEC-010, SEC-015–019, SEC-021, SEC-024 | CA-001–002, CA-004, CA-011–014; SA-005–006 |
| SQ-02 / SM-01 / SM-02 | Provedor é ator externo; assinatura, id da cobrança, valor/moeda, replay, deduplicação durável | SEC-016, SEC-020–021, SEC-024, SEC-030 | CA-003, CA-014–017; SA-007 |
| SQ-03 / PC-02 | Aprovação tardia legítima não reativa reserva; refund integral padrão, sem fulfillment de pedido misto | SEC-020–025 | CA-005, CA-015–017, CA-024 |
| PR-03 / SQ-04 / SM-07 / PC-03 | Autorização de refund, snapshot, saldo pendente reservado, timeout, rastreabilidade | SEC-002–005, SEC-022, SEC-024, SEC-030 | CA-008, CA-018–021; SA-002/008 |
| PR-02 / SQ-05 / PC-04 / SM-04/05 | Kit indivisível comercialmente, alocação física all-or-nothing, direitos por item e entrega separada | SEC-017–018, SEC-021, SEC-025–028 | CA-006, CA-022–026; SA-009 |
| BPMN-01 / BPMN-02 | Interfaces financeiras, PII e integrações devem ser revisadas na modelagem final | SEC-020–030 | CA/SA pertinentes |

## Regras de modelagem para evitar divergências

1. **Diagramas são conceituais, não contratos de autorização por si só.** O executável deverá impor permissões no servidor e guards nas transições.
2. **A verdade de pagamento é do contexto de Pagamentos**, não do browser nem do callback de redirect. Onde SQ-05 mostra `Provedor → Checkout`, interpretar somente como atalho visual provisório; corrigir fonte `.mmd` e exportações simultaneamente na revisão arquitetural antes de codificar.
3. **Reserva expirada não é reaberta.** RN-073/074 e tabelas de transição governam a disputa de concorrência.
4. **Kit misto sem alocação física validada não concede digital automaticamente**, ainda que PSP informe pagamento válido.
5. **Refund solicitado não significa concluído** e não credita estoque; a confirmação exige evidência do PSP.
6. **Atraso e TTL são propostas condicionadas:** ver DA-006/DS-004 e a regra 40/30/5 do adendo; a aceitação da integração exige teste em sandbox.
7. **Prévias, mídia comercial, PII e logs** não estão totalmente cobertos pelas figuras atuais: terão DFD, trust boundaries e threat model em artefatos específicos.

## Lacunas explicitamente abertas

- DFDs de autenticação/sessões, catálogo/uploads, checkout, webhook, refund, biblioteca e operações administrativas.
- Matriz de autorização com segregação por ação e recurso; riscos de IDOR, SSRF e abuso de operações privilegiadas.
- Ajuste da fonte SQ-05 e suas exportações, além de revisão dos BPMNs frente às políticas consolidadas.
- Matriz SEC/SA/CA ↔ implementação ↔ evidência, a completar somente após código e testes.

Referências: [BRD](../02-business-requirements/REGRAS-DE-NEGOCIO.md), [adendo](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md), [segurança](../07-security/security-requirements.md), [políticas](POLITICAS-CONSOLIDADAS.md), [transições](TABELAS-DE-TRANSICAO.md) e [rastreabilidade](MATRIZ-DE-RASTREABILIDADE.md).
