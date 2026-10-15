# PRIC-01 — Diagnóstico, escopo e arquitetura

HEAD main igual ao baseline `1727a3820829ba319b7ddfd66165a388618552d5`; working
tree inicialmente limpa, nenhum Pricing posterior encontrado. Catalog possui
PublicPricing/CatalogReader, publicação por view, paginação, validação e DTOs.
Pricing ausente era dependência explícita, não autorização para preço fictício.
Node24.21.0, pnpm12.11.2, Nest12.1.3, Prisma/adapter-pg7.10.0, pg8.23.1 e
PostgreSQL17.10 por digest existente preservados. Nenhuma dependência nova.

RN-015–023, DB-01–05, F04-02/05, CT-01/02/03/06/08, OpenAPI e CAT-01–04 foram
confrontados. Normas e contratos propostos não foram tratados como implementação;
a leitura de preço não autoriza checkout, descontos ou integração com provedores.

## Implementação

[PricingModule](../../../apps/api/src/modules/pricing/pricing.module.ts) exporta
apenas o token de aplicação PUBLIC_BASE_PRICING. Domain valida projeção monetária;
PublicPrices consulta o port privado PriceRepository em lote e recusa respostas
parciais/duplicadas/estranhas. Infrastructure implementa configuração local e
Prisma PostgreSQL. Não existe controller Pricing, nem API administrativa.

CatalogModule importa o módulo público Pricing e injeta seu serviço no contrato
PublicPricing existente. Não importa repository/Prisma interno de Pricing; Pricing
não depende de Catalog para consultar suas tabelas. composeCatalog preserva o
adapter indisponível como default quando chamado sem port, e PricingModule fica
desativado por padrão. Nenhum forwardRef, serviço global ou ciclo foi introduzido.

Catalog continua dono de metadados/publicação/composição. Pricing possui preço-base
e revisões. Inventory terá saldo/reservas; Orders terá snapshots; Library terá
entitlement. Não há price no schema Catalog, concessão digital ou reserva nesta fatia.

## Resposta pública

Mesmas duas rotas GET Catalog; ProductSummary/ProductList preservados. Preço BRL e
centavos inteiros seguros vêm da view Pricing, por um lote limitado aos100 IDs da
página; projeção só retorna currency/amountCents. source/version/intervalos/IDs
administrativos não saem no DTO. Kit tem preço próprio persistido, não soma implícita.
previewAvailable permanecefalse. Produtos privados continuam404 antes de consultar
Pricing. Falta de qualquer preço recusa toda a página503, sem sucesso parcial.

Preço público observado não é cotação, reserva ou promessa para compra futura.
RN-016/017 continuam exigindo recálculo server-side no futuro checkout, não implementado.
