# SHIP-01 — Motor de tarifa fixa por zonas

Implementação exclusivamente TEST_ONLY em PostgreSQL 17 descartável. Shipping resolve uma zona pela informação postal autorizada, cobra uma tarifa por pedido físico/misto e mantém versões/evidências imutáveis. Digital puro não chama Shipping. Sem checkout público, configuração comercial ou operações em provedores.

- [Escopo e fronteiras](SHIP-01-escopo-e-fronteiras.md)
- [Políticas, zonas e cálculo](SHIP-02-politicas-zonas-e-calculo.md)
- [Integração transacional](SHIP-03-integracao-transacional.md)
- [Segurança e concorrência](SHIP-04-seguranca-e-concorrencia.md)
- [Matriz de testes](SHIP-05-matriz-de-testes.md)
- [Handoff e pendências](SHIP-06-handoff-e-pendencias.md)

Baseline: `main`, `a3a7fd3b792de7ea82a5599bfab806d730a25b21`, árvore inicialmente limpa. [Quality 38904701162](https://github.com/Igor475/atlas-commerce/actions/runs/38904701162) consultado e confirmado `completed/success` nesse SHA. Não comprova o delta SHIP-01 ainda não publicado.

Precedência: [ADR-012](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md), [QTE-POL](../quotes/QTE-POL-05-fluxo-e-matriz-de-decisoes.md) e [CP-02](../customer-profile-integration/README.md), preservados. O [OpenAPI ativo](../contracts/openapi/atlas-commerce-api-v1.yaml) continua intacto.
