# INV-03 — Concorrência, tempo e recuperação

READ COMMITTED com locks por linha e constraints atende às operações locais; não
se usa SERIALIZABLE global, lock global ou SKIP LOCKED para inferir disponibilidade.
Reserva adquire intenção idempotente e depois todos os saldos em ordem UUID. Falta
em qualquer SKU aborta intenção, reserva, linhas, ledger e evento. SKUs distintos
não esperam lock de saldo alheio. Replay com mesmo fingerprint retorna resultado
persistido; mesma chave/conteúdo diferente ou referência comercial duplicada recusa
sem efeito. Fingerprint inclui referência, linhas de origem, composição e físicos.

| Comando interno | Guarda                                                              | Efeito atômico                                                 |
| --------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Reserve         | Composição autorizada e todo saldo disponível                       | ACTIVE; reserved_active aumenta; ledger RESERVE; evento ACTIVE |
| Confirm         | Decisão confiável, ACTIVE e clock_timestamp após locks < expires_at | CONFIRMED; reservado diminui, allocated aumenta; ledger/evento |
| Expire          | ACTIVE e clock_timestamp após locks >= expires_at                   | EXPIRED; reservado diminui uma vez; ledger/evento              |
| Release         | Decisão confiável de cancelamento/encerramento seguro e ACTIVE      | RELEASED; reservado diminui uma vez; ledger/evento             |
| Replay terminal | Estado já terminal                                                  | Mesmo estado, sem repetir saldo/evento                         |
| Confirm tardio  | EXPIRED/RELEASED ou ACTIVE vencida                                  | REFUSED; fato durável CONFIRMATION_REFUSED; nenhuma alocação   |

Transição adquire primeiro reserva e depois saldos ordenados. O relógio é lido
**após todos os locks**; não se usa `now()` de transação longa como instante da
decisão. Reserva nasce após locks com expires_at = clock_timestamp + 40 minutos.
CONFIRMED não expira nem libera por TTL; EXPIRED/RELEASED nunca confirmam.
Recusa financeira fica para futuro Payments/Orders, sem PAYMENT_REVIEW/refund aqui.

Cada chamada SQL de negócio é uma única transação/autocommit envolvendo a função
inteira. SQLSTATE 40001/40P01 retenta essa operação integral no máximo três vezes,
com espera limitada; nenhuma chamada externa entra na transação. Timeout/conexão
ambígua não causa retry cego: chamador deve repetir a mesma intenção. Constraints
e fingerprint sobrevivem a restart. A suíte demonstra 40001 real controlado por
trigger de teste/sequence não transacional; não se afirma deadlock espontâneo.

Não há lote/claim/lease ou scheduler de expiração: operação interna por reserva,
idempotente e recuperável, sem promessa de execução pontual em hospedagem gratuita.
Reservas vencidas ainda ACTIVE conservam compromisso até expiração explícita;
confirmação vencida sempre recusa. É conservador em disponibilidade e evita oversell.

Eventos Inventory persistem no mesmo commit, com identidade estável para consumidor
futuro deduplicar. São fatos internos, não publicação do envelope CT-05 aprovado,
nem broker/dispatcher genérico. Consumidor, ordenação, versão do envelope, claims e
retention exigem nova integração aprovada. Queda antes de commit desfaz tudo; após
commit não perde ledger/evento. Nenhuma garantia exactly-once externa é alegada.

Provas usam conexões independentes, barreiras pg_stat_activity/locks reais e relógio
PostgreSQL. Testes de vencimento posicionam created_at/expires_at somente por owner
da fixture, mantendo diferença 40 minutos; não há override de TTL no runtime.
