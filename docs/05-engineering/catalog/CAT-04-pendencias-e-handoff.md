# CAT-04 — Pendências e handoff

## Gates abertos

1. **Pricing real não implementado/autorizado:** port existe, normal falha503.
   Adapter de preço fictício controlado é exclusivo dos testes, não catálogo público.
2. Inventory/reservas e Orders/snapshot ainda pendentes. Publicação editorial não
   certifica saldo, logística, licença, aptidão para compra nem preço final.
3. R2/prévias/entitlement pendentes; previewAvailable=false sem promessa de acesso.
4. Busca, autocomplete, facetas, autores e categorias não têm novos contratos HTTP;
   nenhuma rota dessas foi criada. Administração exigirá STAFF/MFA e contratos.
5. L1_SQL_STRICT permanece PENDENTE. Supabase remoto e MRD não foram modificados
   nem utilizados como prova comercial. Data API/TLS remotos não verificados aqui.
6. Job catalog-integration preparado no Quality; execução remota deste delta não
   realizada. Somente publicação autorizada posteriormente permitirá prova GitHub.
7. Gate global de formatação histórico deve ser relatado separado, sem editar
   os32 arquivos CRLF fora do escopo ou desativar controles.

## Divergência contratual identificada — proposta, não aplicada

CT-03 prevê400 INVALID_REQUEST para validação. OpenAPI lista200/429/503 em listagem
e200/404/429/503 no detalhe, sem400, embora aceite parâmetros. Implementação rejeita
query inválida por400 application/problem+json. Proposta mínima: acrescentar somente
a resposta400 referenciando ProblemDetails nas duas operações Catalog. **Pendente
de revisão**, sem alterar o YAML normativo nesta tarefa e sem expandir rotas.

UUID é a representação local dos IDs opacos; cursor tem teto256 dentro do2048
contratado, assinatura por processo e invalidade após reinício. Se houver serviço
multi-instância, definir gestão/rotação da chave e compatibilidade antes de liberar.
Não criar secret real em env nesta entrega. Categoria plana, kits não aninhados e
composição publicada imutável são decisões técnicas do CAT-01 local; evolução
requer revisão, não nova regra comercial inferida do sitemap.

## Comandos autorizados somente na fixture local

```text
pnpm install --frozen-lockfile
pnpm --filter @atlas/api catalog:validate
pnpm --filter @atlas/api catalog:test
```

catalog:test gera clients/build, cria projeto Docker próprio, aplica e reaplica
migration, testa e limpa. catalog:migrate é um comando separado, só funciona quando
a fixture dedicada já existe; recusa banco/role/marker/versão errados. Nunca usar
URL Supabase, db push ou seeds automáticos. Fixtures estão nos testes, não no startup.
Não há credencial real, publicação ou integração externa nesses comandos.

## CI e compatibilidade

Job novo usa os mesmos SHA de Actions, Node24.21.0, Corepack/pnpm fixado,
frozen-lockfile e contents:read. Carrega somente a imagem PG17 por digest e roda
o harness local, sem secrets ou CLI remoto. Jobs anteriores preservados. Alterações
em scripts package.json só acrescentam geração do client Catalog aos gates e
comandos específicos; versões/dependências/lockfile permanecem idênticos.

Estado final depende das [evidências](../../../apps/api/test/catalog/RESULTS.md),
não da presença de documentos. Mesmo com testes locais aprovados, CAT-01 **não está
homologado para produção**. Não avançar para Pricing, Inventory, providers ou UI
sem nova autorização. Nenhum commit/push/deploy nesta tarefa.
