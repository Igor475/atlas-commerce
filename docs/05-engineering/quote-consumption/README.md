# QUSE-01 — Consumo único de cotação TEST_ONLY

Prova local da invariante [ADR-012/QTE-DEC-005](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md): uma cotação pertence a uma única intenção confirmada, mesmo com chaves diferentes. Não habilita checkout comercial, HTTP, Payments ou Identity público.

- [Escopo e invariantes](QUSE-01-escopo-e-invariantes.md).
- [Modelo, constraints e migrations](QUSE-02-modelo-e-constraints.md).
- [Concorrência e atomicidade](QUSE-03-concorrencia-e-atomicidade.md).
- [Replay e segurança](QUSE-04-replay-e-seguranca.md).
- [Matriz PostgreSQL de 36 cenários](QUSE-05-matriz-de-testes.md).
- [Handoff, validações e pendências](QUSE-06-handoff-e-pendencias.md).

Comando local: `pnpm --filter @atlas/api quote-consumption:test`. Compila a API, cria PostgreSQL 17 descartável com projeto UUID próprio, aplica/reaplica cadeias históricas intactas e a migration aditiva QUSE, executa testes e verifica a limpeza dos seus recursos. Nunca usar a fixture em dados reais ou provedores.

Status desta entrega: QUSE-001–036 e regressões locais aprovadas; formatação global bloqueada nos 32 CRLF históricos. Ver resultados, tentativas e limites no handoff. Baseline `5c978df7026b0d32738fd29cb2f4f9590c0f1802`, CI de referência `38928779266` aprovado. Esse resultado não aprova o delta QUSE ainda não publicado.
