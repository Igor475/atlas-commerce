# Tabelas de transição e invariantes — políticas críticas v0.2

> **Estado:** especificação conceitual para testes e futura arquitetura. Estados adicionais sugeridos não são migrações aplicadas. Ver [políticas](POLITICAS-CONSOLIDADAS.md).

## Reserva (`SM-03`)

| Origem | Comando/evento | Guarda transacional (relógio do banco) | Destino | Efeito |
|---|---|---|---|---|
| (não existe) | `Reserve` | Estoque suficiente para todos SKUs físicos, sem conflito | `ACTIVE` | Cria reserva, comprometimento e prazo `+40m` junto do pedido |
| `ACTIVE` | `ConfirmPaymentAllocation` | Evidência válida, `now < expires_at`, saldo comprometido íntegro | `CONFIRMED` | Converte a reserva em alocação do pedido, 1 vez |
| `ACTIVE` | `Expire` | `now >= expires_at` | `EXPIRED` | Libera comprometimento, 1 vez; agenda conciliação |
| `ACTIVE` | `Release` | Cancelamento seguro + quitação ou anulação externa comprovada | `RELEASED` | Libera comprometimento, 1 vez |
| `CONFIRMED`, `EXPIRED`, `RELEASED` | Repetição de comando | Já terminal | Mesmo estado | No-op idempotente, registra observabilidade sem alterar saldo |
| `EXPIRED` / `RELEASED` | `ConfirmPaymentAllocation` | Sempre falsa | Sem transição | Abre `PAYMENT_REVIEW` em caso de cobrança aprovada |

## Pedido (`SM-01`)

| Origem | Comando/evento | Guarda | Destino | Efeito |
|---|---|---|---|---|
| `PENDING_PAYMENT` | `PaymentConfirmed` | Sem físicos ou todas reservas confirmadas, demais elegibilidades satisfeitas | `PAID` | Agendar fulfillment idempotente |
| `PENDING_PAYMENT` | `PaymentConfirmed` | Sem reserva válida/valor divergente/estado comercial incompatível | `PAYMENT_REVIEW` | Reconciliação e, sem alocação física, refund padrão |
| `PENDING_PAYMENT` | `PaymentClosedUnpaid` | Estado externo negativo final confirmado | `CANCELLED` | Liberar reserva ACTIVE se ainda houver |
| `PENDING_PAYMENT` | `ReserveExpired` | Estado externo indeterminado | `PAYMENT_REVIEW` | Bloquear fulfillment e conciliar |
| `PAYMENT_REVIEW` | `RefundSucceededAfterLatePayment` | Estorno integral confirmado, sem fulfillment | `CANCELLED` | Encerrar compensação e notificar |
| `PAYMENT_REVIEW` | `PaymentClosedUnpaid` | Ausência definitiva de cobrança comprovada | `CANCELLED` | Encerrar pendência |
| `PAID` | `StartFulfillment` | Elegibilidade e efeitos idempotentes | `IN_FULFILLMENT` | Criar tarefas físicas/digitais |
| `IN_FULFILLMENT` | `ItemCompleted` | Restam itens não entregues | `PARTIALLY_FULFILLED` | Atualizar progresso por item |
| `IN_FULFILLMENT` / `PARTIALLY_FULFILLED` | `AllCompleted` | Todos itens/benefícios concluídos | `FULFILLED` | Concluir pedido |
| Qualquer estado após captura | `RefundRequest` | Direito/comercial autorizado | Estado existente + `refund_case` | Processar pós-venda separado; não eliminar histórico |

**Nota:** pedido concluído pode sofrer devolução/reembolso: o estado do pedido não retrocede artificialmente a `CANCELLED`. O caso pós-venda possui status próprio. `CANCELLED` após pagamento tardio é permitido somente quando **nenhum fulfillment ocorreu** e a compensação integral está comprovada.

## Tentativa de pagamento (`SM-02`) e reembolso (`SM-07`)

| Entidade | Origem | Evento | Destino | Guarda / efeito |
|---|---|---|---|---|
| Tentativa | `CREATED` | Solicitação enviada | `PENDING` | Identidade estável com PSP |
| Tentativa | `PENDING` | Provedor confirma cobrança | `APPROVED` | Validar origem, valor, moeda, ID do pedido |
| Tentativa | `PENDING` | Recusa confirmada | `FAILED` | Fato final verificável |
| Tentativa | `PENDING` | Cancelamento confirmado | `CANCELLED` | Fato final verificável |
| Tentativa | `PENDING` | Timeout/evento inconclusivo | `PENDING` + sinalização de revisão | **Não** presumir falha ou cancelar financeiramente por timeout |
| Reembolso | (não existe) | Registrar solicitação | `REQUESTED` | Preservar momento, motivo e itens |
| Reembolso | `REQUESTED` | Autorizar e reservar saldo | `APPROVED` | Direito/alçada, saldo disponível e transação atômica |
| Reembolso | `REQUESTED` | Indeferir fundamentadamente | `REJECTED` | Apenas quando cabível perante a legislação |
| Reembolso | `APPROVED` | Enviar ao PSP | `SUBMITTED` | Idempotência persistente, sem novo débito duplicado |
| Reembolso | `SUBMITTED` | PSP responde pendente | `PENDING` | Manter valor comprometido |
| Reembolso | `SUBMITTED`/`PENDING` | PSP confirma sucesso | `SUCCEEDED` | Marcar como devolvido 1 vez |
| Reembolso | `SUBMITTED`/`PENDING` | Resposta ambígua | `RECONCILIATION_REQUIRED` | Consultar PSP antes de nova operação |
| Reembolso | `SUBMITTED`/`PENDING`/`RECONCILIATION_REQUIRED` | PSP confirma falha definitiva | `FAILED` | Liberar reserva financeira só após certeza |
| Reembolso | `RECONCILIATION_REQUIRED` | PSP comprova sucesso | `SUCCEEDED` | Não criar segundo refund |

**Invariante financeiro:** `0 <= succeeded_refunds + outstanding_reserved_refunds <= captured_total` por captura e moeda; `SUCCEEDED` permanece histórico e não reduz `captured_total` registrado.

## Direitos digitais, kits e pós-venda

| Fonte | Evento | Pré-condição | Efeito permitido |
|---|---|---|---|
| Item digital avulso | Pagamento válido | Pedido elegível | Criar entitlement idempotente |
| Componente digital de kit misto | Pagamento válido | Reserva de **todos** componentes físicos `CONFIRMED` | Criar entitlement idempotente por componente/titular |
| Direito `ACTIVE` | Pedido de reembolso | Solicitação ainda aberta | Nenhuma suspensão automática |
| Direito `ACTIVE` | Decisão autorizada e fundamentada | Política/legalidade verificadas | `SUSPENDED` ou `REVOKED` com auditoria |
| Kit físico em logística | Falta de um componente | Preparação incompleta | Abrir exceção; não marcar kit entregue |
| Kit em devolução | Aprovação de devolução integral | Caso e valor referenciam kit completo | Iniciar reembolso e retorno físico em processos separados |
| Kit físico retornado | Inspeção positiva do SKU/componente | Quantidade real recebida e vendável | Incrementar inventário apenas da quantidade inspecionada |

## Interleavings concorrentes a testar

- Webhook pago e job de expiração disputam a mesma reserva na marca dos 40 minutos.
- Dois reembolsos disputam os últimos R$20 disponíveis de uma captura.
- Duas compras disputam o último componente de um kit.
- Primeiro envio ao provedor de reembolso sofre timeout, mas o PSP processou; um retry não duplica.
- Pagamento válido chega para pedido misto após a reserva física expirou.
- Cancelamento e pagamento aprovado chegam em ordem invertida e nunca apagam fatos financeiros.
