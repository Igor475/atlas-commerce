# CPINT-02 — Atomicidade e locks

## Uma conexão e um commit

O adapter abre uma transação Prisma e chama `orders.prepare_profile_quote` por SQL parametrizado. Essa função chama Profile, Quotes, Orders e Inventory no mesmo backend PostgreSQL; nenhuma chamada externa ou commit intermediário existe. A cotação é emitida em transação anterior, sem reservar estoque.

Ordem preservada: autorização/conta → advisory lock de idempotência QTE-01 → Catalog → Pricing → condições artificiais Quotes → endereço Profile protegido → Inventory. A função interna Orders reutiliza os locks já adquiridos. O escritor postal não adquire locks de Catalog/Inventory.

Se o escritor postal vence, Orders espera e recusa a revisão obsoleta. Se Orders vence, o escritor aguarda o commit; sua alteração posterior não invalida retroativamente o snapshot aceito. A edição enquanto Orders aguarda Catalog também é revalidada. Os testes observam espera em `pg_stat_activity` com conexões independentes, sem substituir concorrência SQL por mocks.

## Evidência sanitizada executada

Na execução local de 16/10/2026: PID `594`, XID `2466`; quote `3a2142b8-79e3-4142-836c-936273b42b1f`, preparação `f0ac5b41-98de-c64b-d75f-bcf069960d1f`, endereço artificial `00000000-0000-4000-8000-000000000901`, reserva `0588e8fe-0afb-4a67-9d81-3b15e1a61f95`. Os três `xmin` novos aferidos foram `2466`; as provas dos participantes Catalog/Pricing/Orders/Inventory também coincidiram com o contexto Profile.

Antes: todas as contagens eram zero. Depois: um snapshot postal, uma evidência Profile, uma preparação, uma request, um evento Orders, uma reserva, um evento Inventory e um registro ledger. Esses IDs/PID/XID são específicos daquela execução, não constantes do produto.

Falhas injetadas depois do snapshot e depois da reserva real deixam todas essas contagens em zero. Morte do processo antes do commit também reverte; morte depois do commit sem resposta da aplicação permite recuperar o fato persistido, sem duplicar reserva. Não foi reproduzida perda de ACK TCP.

## Idempotência e privacidade

Mesmo ator/chave/quote recupera a preparação técnica; chave com quote diferente conflita. Edição postal e expiração posteriores não alteram o snapshot histórico. Conta desativada não pode usar replay ou leitura para recuperar PII.

A regra ratificada de uma intenção comercial por cotação permanece requisito. Este delta preserva a idempotência técnica existente por chave; não implementa nem declara constraint comercial definitiva de uso único da quote. Chaves distintas não constituem prova dessa unicidade.
