# Decisões e lacunas de modelagem — Fase 02

> Este documento registra hipóteses e pendências intencionalmente não resolvidas no BRD v0.1; nenhum ponto listado deve ser considerado política de produção aprovada.

| Referência | Pergunta a resolver | Efeito na modelagem |
|---|---|---|
| DA-004 | Kits são indivisíveis em entrega e devolução ou apenas na reserva? | PR-02 e SM-05 precisam esclarecer fulfillment parcial de kits. |
| DA-005 / DA-012 | Qual o TTL da reserva e qual a regra de prorrogação enquanto o pagamento está pendente? | Define temporizadores, ordem das transições de SM-01 e SM-03 e a reconciliação SQ-03. |
| DA-006 | Qual provedor sandbox e quais eventos/estados realmente oferece? | Mapeia estados externos de SQ-02 para SM-02 sem regressão indevida. |
| DA-007 | Qual a fórmula do frete e sua validade na cotação? | Determina dados de snapshot e quando exigir reconfirmação. |
| DA-008 | Leitura online, download ou ambos; licenças e revogações? | Afeta PR-02, UC-01 e SM-04. |
| DA-009 | Quem pode autorizar reembolso/cancelamento, em quais etapas e valores? | PR-03, SM-01, SM-02 e SM-06 precisam de política e limites precisos. |
| DA-010 | Emissão fiscal e tributos fora do MVP real; como apresentar valores em demo? | Evitar alegar conformidade fiscal/produção. |
| DA-011 | Quando um uso de cupom é comprometido, confirmado ou liberado? | SQ-01 e concorrência de campanhas dependem de estratégia transacional. |
| RN-038 / RN-063 | Como marcar pedido misto quando um item é entregue e outro falha? | Precisa matriz de quantidade/fulfillment por item e agregação determinística. |
| RN-041–047 | Como resolver pagamento tardio aprovado sem alocação de estoque? | SQ-03 demanda política de reposição ou reembolso, sempre rastreável. |
| RN-049–054 | Estorno parcial de pedido misto afeta quais direitos digitais? | SM-04 deve operar sobre itens/direitos individualizados e com trilha. |
| RN-058–062 | Como tratar arrependimento e bens digitais conforme o regime jurídico aplicável? | PR-03 e SM-06 requerem validação jurídico-comercial; não inventar exceções. |

## Recomendações para a Fase 03

1. Elaborar uma tabela formal de transições: **estado inicial, comando, guardas, estado final, efeito transacional, auditoria e tratamento de falha**.
2. Delimitar agregados e invariantes (reserva, pedido, tentativa de pagamento, refund, entitlement, remessa), sem presumir microservices.
3. Escolher e documentar estratégia de idempotência, lock/constraint e outbox (ADR).
4. Verificar cada integração externa e modelos de consistência com o provedor escolhido.
5. Revisar as regras de arrependimento e retenção com especialista antes de operar venda real.
