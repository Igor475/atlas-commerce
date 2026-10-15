# PRIC-04 — Handoff e pendências

## HTTP400 — aprovação separada

[Diff documental proposto](openapi-http400.proposed.patch) acrescenta somente seis
linhas em cada operação GET Catalog:400, application/problem+json e ProblemDetails,
conforme CT-03. Sem rota, parâmetro ou alteração de DTO. OpenAPI ativo permanece
intacto; **aprovação expressa do responsável PENDENTE**. Não é aprovação implícita
pela implementação de Pricing. Validação estrita de Catalog não foi removida.

O patch sem contexto (unified0) foi gerado da versão atual e verificado apenas por
`git apply --check --unidiff-zero`; esse comando não aplica mudanças. Após aprovação,
revalidar baseline/diff antes de aplicar. Cópia candidata foi parseada separadamente;
não é contrato ativo nem nova homologação.

## Execução somente local

```text
pnpm install --frozen-lockfile
pnpm --filter @atlas/api pricing:validate
pnpm --filter @atlas/api pricing:test
```

pricing:test faz build e cria fixture própria, aplica/reaplica Catalog usando seu
runner original, concede apenas REFERENCES para o migrator Pricing, aplica/reaplica
Pricing, executa HTTP/SQL reais e limpa. pricing:migrate exige a fixture integrada
já criada e verificada. Não usar Prisma Migrate diretamente fora do wrapper, nem
URLs de provedores, db push ou seeds no bootstrap.

Job pricing-integration preparado com Actions/Node/pnpm fixados, frozen-lockfile e
contents:read. Só PostgreSQL descartável por digest, sem secrets ou CLI remoto.
Jobs anteriores preservados; execução GitHub deste delta **não realizada**.

## Decisões e dependências abertas

- Gratuidade/zero não autorizada; projeção bloqueada, sem criar política comercial.
- Cotação/checkout precisam recalcular preço conforme RN-016/017; não implementados.
- Promoções/cupons/frete/parcelamento/canais/agendamento fora do escopo.
- Inventory, Orders/snapshots, Stripe, Library/R2 e administração STAFF/MFA pendentes.
- Cursor/publicação permanecem Catalog; integração não aprova prévia ou disponibilidade.
- Supabase/L1_SQL_STRICT PENDENTE; MRD independente e intacto. Sem acesso ao provedor,
  prova TLS remota, Data API verificada ou credencial runtime de produção.
- Formatação histórica32 CRLF é gate separado; não alterar arquivos externos ou
  desativar checks. CI remoto pendente; não inferir homologação com evidência local.

Próximo módulo ou implantação requer nova autorização. Sem commit/push/deploy,
frontend ou alteração de regras normativas nesta entrega.
