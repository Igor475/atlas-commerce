# SHIP-01 — Escopo e fronteiras

## Diagnóstico e estratégia

O baseline CP-02 já coordena Profile/Orders/Inventory numa conexão/XID. QTE-01 ainda usa fórmula híbrida artificial e endereço de zona fixa da fixture; isso não implementa a tarifa fixa ratificada. A nova fixture Shipping reaplica as cadeias históricas intactas, acrescenta quatro cadeias e substitui apenas nela o resolver de entrega por Shipping. Os laboratórios antigos permanecem independentes.

Shipping controla política, revisão, zona, opção e tarifa fixa. Profile continua autoridade postal; Catalog controla tipo/composição/publicação; Pricing fornece preço-base; Quotes compõe subtotal/entrega/total; Orders guarda snapshots; Inventory reserva físicos. Fulfillment e remessas não são implementados. Uma cobrança por pedido não impõe uma única remessa; PC-04 de físicos do kit juntos permanece intacta.

## Ratificação e limites

ADR-012 ratifica QTE-DEC-002/003/004/005/006: simulador fixo por zona, uma opção, Profile versionado, quote com TTL de dez minutos, revalidação e unicidade comercial futura. Esta tarefa autoriza somente a implementação técnica local. Zonas/cobertura/CEP existentes, tarifas reais, transportabilidade, embalagem, prazos/calendário e campos postais finais continuam pendentes.

O módulo [Shipping](../../../apps/api/src/modules/shipping/shipping.module.ts) tem provider nulo e factory explícita opt-in, ausente do AppModule. Reutiliza a validação de principal e requisições CP-02; o adapter próprio exige novos ports/marker e não relaxa o adapter CP-02. Sem controllers, startup migrations, db push, Identity comercial, Stripe ou L1. Dados artificiais não aprovam disponibilidade real de CEP ou frete.
