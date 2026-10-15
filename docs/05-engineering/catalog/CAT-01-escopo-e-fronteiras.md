# CAT-01 — Escopo e fronteiras

## Diagnóstico inicial

HEAD confirmado igual ao baseline `af091a1bad9ef4c2b360b90fb6701125efc4349e`, main
limpa. Identity Customer/Resend, health, PGSP, L0, L1 e MRD já implementados em
fatias distintas. Não existia módulo Catalog, schema próprio ou testes comerciais.
Prisma 7.10.0, adapter-pg 7.10.0 e pg 8.23.1 já fixados; nenhuma nova dependência.
Node 24.21.0 e pnpm12.11.2 preservados. Documentos RN/PC, DB-01–04, F04-02/05,
CT-01/02/03/06/08, OpenAPI, FD-03-04 e ADR-011 foram confrontados; propostas
documentais não foram tratadas como funcionalidades implantadas.

O OpenAPI exige preço em ProductSummary; Pricing não existe. Resolvido por port
de leitura, adapter indisponível na composição normal e adapter controlado só nos
testes. Busca/facetas/autores/categorias na UX não têm rotas contratadas nesta fatia.

## Arquitetura efetiva

[Catalog](../../../apps/api/src/modules/catalog/catalog.module.ts) é módulo Nest
independente. Domain contém tipos e invariantes simples, application contém
CatalogReader e ports de CatalogRepository/PublicPricing, infrastructure contém
config local e CatalogDatabase Prisma; presentation contém controller, validação,
cursor, limites e filtro RFC9457. Runtime/composition root coordena lifecycle.
AppModule importa Catalog; bootstrap só ganha bind loopback quando Catalog local
está explicitamente habilitado. Composição Identity permanece inalterada/desativada
por padrão, assim como seu código e configuração HTTP.

Catalog possui metadados, associações e publicação editorial. Pricing mantém
autoridade monetária; Inventory terá saldo/reservas; Orders terá snapshots;
Library terá entitlement. Nenhum repository de outro domínio é acessado, nenhum
forwardRef/controller administrativo ou serviço genérico compartilhado foi criado.

## Contratos atendidos e limites

ProductSummary contém somente id, title, productType, price, previewAvailable e
description opcional prevista no OpenAPI. ProductList contém items e nextCursor.
Preço validado em centavos inteiros seguros, BRL, não negativo e origem conhecida
do adapter confiável; origem não é exposta no DTO. Rascunho/retirado/inválido
editorialmente responde 404, sem PII, SKU, IDs editoriais privados ou chaves de mídia.
Metadata editorial publicada **não atesta licença, estoque ou elegibilidade de venda**.

Textos são dados JSON (`application/json`, nosniff), sem HTML renderizado. Futuro
consumidor deve aplicar escaping contextual e não usar innerHTML. Não há frontend.

Listagem aceita apenas limit/cursor, limit20 padrão e máximo100, sem coerção de
frações/zeros à esquerda ou parâmetros duplicados. Ordem total id UUID crescente,
keyset parametrizado e limit+1. Cursor base64url + HMAC-SHA256 vinculado a catalog-v1,
máximo256 caracteres (dentro do teto2048 do contrato), sem PII/SQL. Chave aleatória
por runtime; reinício/outra instância invalida cursor com400. Não é snapshot entre
páginas: inserção posterior pode aparecer; produto retirado não reaparece. Não se
promete estabilidade global de catálogo mutável ou cursor multi-instância.

Rate limit local120/min por socket/IP, mapa máximo1000, sem confiar em forwarded;
concorrência máxima8 e pool2. Respostas no-store; erros minimizados com requestId
gerado no servidor. Limites não substituem CDN/WAF ou proteção distribuída futura.
