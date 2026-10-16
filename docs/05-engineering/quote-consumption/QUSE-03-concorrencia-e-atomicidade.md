# QUSE-03 — Concorrência e atomicidade

## Sequência efetiva

`orders.prepare_consumed_quote` autoriza Profile/Orders e lê a quote do titular; adquire o mesmo advisory de idempotência QTE/CPINT; lê request por chave com FOR UPDATE. Replay compara quote/fingerprint e exige consumo durável. Intenção nova adquire advisory próprio por quote, verifica ausência de request e chama o coordenador SHIP-01 completo. Insere consumo antes de retornar; a aplicação confirma a transação depois disso.

Ordem: conta/principal → chave → quote → Catalog/Pricing → ponte de política Quotes → endereço Profile → política/revisão Shipping → atributos físicos → Inventory. Reentradas dos ports antigos usam o mesmo advisory de chave e a mesma conexão. Não há I/O externo dentro da transação. Um hash de advisory pode colidir e gerar contenção adicional; não permite sucesso duplicado, pois UNIQUE/FKs continuam obrigatórias. Não há lock global deliberado.

O snapshot postal, evidências Profile/Quotes/Shipping, preparação, reserva/ledger/eventos e consumo compartilham commit. Expiração é reavaliada pelo fluxo existente depois dos locks, inclusive espera em estoque. Conta revogada antes de replay recusa; revogação concorrente aguarda o lock de autorização e passa a valer depois da transação protegida.

## Provas executáveis

[QUSE-010/011](../../../apps/api/test/quote-consumption/quote-consumption.integration.ts): conexão vencedora executa o port dentro de BEGIN e mantém resultado provisório não confirmado. Outras conexões, com chaves diferentes, aguardam; o teste observa `pg_stat_activity` e `pg_locks` advisory não concedidos. Depois de COMMIT, há um vencedor e conflitos P0001 controlados, com uma única preparação/reserva/conjunto de efeitos. Polling apenas observa a barreira; não escolhe a ordem por sleeps.

QUSE-012 usa quotes de SKUs distintos: a segunda confirma enquanto a primeira permanece aberta. Isso prova ausência de serialização global; não promete independência quando ambas precisam do mesmo estoque.

QUSE-029 compara PID/XID dos participantes e xmin dos fatos. QUSE-030/031 injetam falhas depois do snapshot, da reserva/evidência Shipping e da inserção do consumo. QUSE-032 observa espera de estoque atravessando expiração e timeout de advisory, recusando sem fatos parciais.

Morte de processo antes/depois de commit é uma simulação de ausência de resposta da aplicação; **não prova perda real do ACK TCP**. Nova conexão recupera o resultado confirmado pela mesma intenção.
