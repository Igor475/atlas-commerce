# DB-02 — Contrato transacional, invariantes e locks

> **Estado:** estratégia proposta a provar com PostgreSQL real. Nenhum SQL aqui deve ser aplicado em produção sem schema, plano de migração e autorização.

## Conjunto mínimo de invariantes

| ID lógico | Invariante | Mecanismo candidato | Cenários |
|---|---|---|---|
| INV-STOCK-01 | `on_hand >= reserved_active + allocated >= 0` para cada SKU | CHECK + UPDATE condicionado na transação | DB-001/002/004 |
| INV-STOCK-02 | Confirmar `ACTIVE -> CONFIRMED` apenas antes do vencimento, uma vez | lock/UPDATE guardado, hora DB depois do lock | DB-005–008 |
| INV-STOCK-03 | Kit/itens físicos inteiros ou rollback, somando SKU repetido | ordenar SKUs; reservar todos no mesmo commit | DB-003/009 |
| INV-IDEM-01 | Mesma chave+fingerprint = mesma intenção/resultado; diferente fingerprint = conflito | unique + materialização do resultado | DB-010/011 |
| INV-PSP-01 | Provedor/evento/captura reconhecidos no máximo uma vez localmente | unique IDs, transições monotônicas/inbox | DB-012/013 |
| INV-REF-01 | `captured - succeeded_refunds - pending_reserved_refunds >= 0` | lock da captura + reserva monetária transacional | DB-014–017 |
| INV-OUTBOX-01 | Outbox criada no mesmo commit que o fato e entregue at-least-once | insert transacional, claim seguro | DB-018–021 |
| INV-DIGITAL-01 | Direito digital de kit misto apenas após pagamento e alocação física integral | consulta estado + concessão única com FK/unique | DB-022/023 |
| INV-SESSION-01 | Session/recovery revogado/usado não volta a ACTIVE | update condicional, hash e TTL | DB-024/025 |

## T-01 — Checkout com estoque

1. Autenticar e validar cotação/cupom; deduplicar intenção de checkout por `(ator, operação, idempotency_key)` e fingerprint.
2. Consolidar todas as linhas físicas por SKU e **ordenar IDs** antes da aquisição de locks, evitando deadlocks por ordem variável.
3. Abrir **uma transação curta**; revalidar preços/cupom e atualizar/proteger saldos com operação condicional. Se faltar uma unidade de qualquer SKU, abortar **todas** as linhas, cupom, pedido e outbox desta tentativa.
4. Criar snapshot/pedido/reservas e `expires_at` obtido do banco; inserir intenção recuperável. Só após COMMIT iniciar a operação Stripe.
5. Para sessão externa respeitar as condições da ADR-004: duração mínima documentada Stripe de 30 minutos; `stripe_expires_at <= reservation.expires_at - 5 min`. Uma sessão incompatível nunca é exposta.

## T-02 — Confirmação versus expiração

- Um webhook assinado não torna o pedido automaticamente elegível. Pagamentos persiste evidência financeira, Inventory disputa transição da reserva com o job de expiração, Orders evolui somente após guarda.
- **Tempo sutil:** `CURRENT_TIMESTAMP`/`now()` representam o começo da transação. Uma operação que espera em lock pode avaliar prazo antigo se reutilizar `now()`. Projetar validação temporal com tempo do **banco no instante da decisão após o lock** (ex.: `clock_timestamp()` dentro da instrução/etapa adequada; testar sua volatilidade/semântica), e não timestamp escolhido pelo cliente.
- `EXPIRED`/`RELEASED` nunca migram a `CONFIRMED`; cobrança tardia comprovada vai a `PAYMENT_REVIEW` e **refund integral idempotente**, sem fulfillment. Timeout do PSP não prova ausência de captura.
- Dois jobs expiradores só podem liberar `reserved_active` **uma vez**; recomputação/ledger precisa reconciliar projeções sob eventual falha.

## T-03 — Reembolso concorrente

- Captura de R$100,00: se R$30,00 já devolvidos e R$50,00 pendentes reservados, **só R$20,00** restam. Duas solicitações concorrentes de R$20,00 não podem ambas reservar.
- Toda reserva financeira e transição da `RefundOperation` é atômica por captura+moeda. Refund aprovado ≠ devolvido; `PENDING/RECONCILIATION_REQUIRED` continua comprometendo montante.
- Só o estado remoto comprovado permite marcar `SUCCEEDED`, ou `FAILED` e liberar compromisso quando a ausência de devolução estiver comprovada. Resposta de rede ambígua usa a **mesma chave** do Stripe e reconciliação.

## T-04 — Outbox, inbox e jobs

- `FOR UPDATE SKIP LOCKED` é candidato a distribuir *claims* de mensagens duráveis entre workers, com lease/reclaim, owner e reexecução segura. **Nunca** inferir inventário disponível por SKIP LOCKED, pois linhas ignoradas permanecem desconhecidas.
- Ack/deleção após processamento externo com resultado comprovado e inbox/constraint; tarefas podem duplicar e reordenar. Mensagem poison usa política de retry/backoff e intervenção auditada.
- Não manter transação aberta enquanto envia e-mail, chama Stripe ou emite URL de arquivo.

## Isolamento, deadlocks e retry

- Comparar `READ COMMITTED` com locks/update condicional versus `SERIALIZABLE` nos casos compostos; não ativar `SERIALIZABLE` global sem análise.
- Projetar limites de tempo e retentativas **somente para transações locais puras e idempotentes** com jitter/backoff. Falhas `40001` e `40P01` exigem replay **da transação inteira**, não de um UPDATE isolado; falha de negócio (estoque insuficiente) não merece retry automático.
- Um retry não deve recriar pedido, cobrança Stripe, cupom, devolução ou entitlement. Observar lock wait, deadlock, pool saturation e as versões do servidor/driver.

**Referências:** [transições da Fase 02](../../03-business-processes/TABELAS-DE-TRANSICAO.md), [ADR-002](../adrs/ADR-002-integridade-outbox.md), [ADR-004 Stripe](../adrs/ADR-004-psp-sandbox.md), [DB-05](DB-05-plano-de-validacao.md).
