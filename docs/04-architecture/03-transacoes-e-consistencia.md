# 03 — Transações, estados, idempotência e consistência

**Fontes de verdade:** [PC-01–04](../03-business-processes/POLITICAS-CONSOLIDADAS.md) e [transições](../03-business-processes/TABELAS-DE-TRANSICAO.md). Este texto especializa, **não substitui**, as guardas.

## T-01 Checkout e reserva física

1. Receber intenção com ator autenticado, idempotency key no escopo `(ator, operação, request fingerprint)` e cotação válida do servidor.
2. Em **uma transação PostgreSQL**, validar catálogo/publicação, preços/cupom, kit e todas quantidades físicas; criar snapshot imutável, pedido, reserva e prazo pelo **relógio do banco**; assegurar unicidade/constraints; registrar intenção de trabalho recuperável.
3. `COMMIT` antes de chamar PSP; PSP recebe tentativa estável. Um retry idêntico resolve o mesmo resultado. Payload conflitante com a mesma key é recusado, não tratado como compra nova.
4. **Stripe Checkout hospedado**, em modo de teste no MVP, cria sessão **somente** se a janela absoluta satisfaz: `stripe_expires_at <= reservation.expires_at - 5 min` e, pela política MVP, `stripe_expires_at = stripe_created_at + 30 min`. A Stripe documenta mínimo de 30 min. Logo, uma sessão criada >5 min após a reserva é incompatível com a política atual; não expor URL e reconciliar/expirar a sessão aberta se necessário.
5. Se a criação externa falhar ou retornar estado ambíguo, não criar nova tentativa cega: reconciliar por ID/chave estável e registrar compensação.

## T-02 Confirmação, disputa com expiração e pagamento tardio

- Uma notificação externa chega a **Payments** (não Checkout), é autenticada no *raw body* segundo o PSP, tem ID, valor, moeda, referência, ordem e duplicidade checados. Redirect do browser não é prova.
- O fato financeiro validado é persistido de forma idempotente. Com reserva `ACTIVE`, `now < expires_at` e disponibilidade intacta, **um único commit** confirma alocação `CONFIRMED` e transição permitida do pedido, registrando intenções de fulfillment.
- Expiração e confirmação concorrentes devem serializar a decisão de uma reserva. `EXPIRED`/`RELEASED` são terminais. Não há reabertura por webhook posterior.
- Pagamento real no PSP e reserva já expirada → `PAYMENT_REVIEW`, **nenhum fulfillment nem digital de pedido misto**, comando de refund integral idempotente e conciliação até desfecho. O compromisso físico não reaparece.
- Pago digital puro elegível não usa reserva; entitlement único somente após verificação dos demais requisitos. Pagamento após encerramento comercial exige revisão/compensação.

## T-03 Reembolso e pós-venda

- Caso comercial de atendimento não é o mesmo estado da operação financeira. Receber solicitação inclusive de conteúdo digital sem recusa automática; revisão jurídica e autorização separadas do PSP.
- Sob lock/constraints por captura: `captured_cents - succeeded_refunds_cents - pending_reserved_refunds_cents >= requested_cents >= 1`.
- Persistir `refund_id`, justificativa, aprovação/regras, chave estável e intenção antes da chamada externa. Resposta de rede ambígua preserva saldo reservado (`RECONCILIATION_REQUIRED`); reenvio com mesma chave e consulta ao PSP.
- `SUCCEEDED` apenas com fato comprovado; liberar saldo do pedido `FAILED` somente com comprovação de não execução. Reembolso não aumenta estoque. Inspeção física e decisão sobre revogação digital são processos distintos.

## T-04 Kits

- Kit é **uma linha comercial** no pedido, composição e preço imutáveis, componentes rastreáveis. Todos SKUs físicos do pedido, incluindo itens avulsos iguais a componentes de kit, reservados com somatório e atomicidade.
- Sem estoque de um componente → rollback de **toda** reserva do kit/pedido como especificado. Kit misto digital somente após pagamento válido e **toda** alocação física confirmada. Componentes físicos de um kit formam uma unidade de expedição no MVP.

## Processamento recuperável

- **Outbox transacional** (proposta): intenção persistida na transação local, entregue *at least once* a consumidores idempotentes. Confirmar via inbox/constraint por `(provider,event_id)` e operação. Não presumir *exactly once* do broker.
- Duplicatas, reordenação e queda de processo são cenários normais; o retry recupera da persistência, não de um contador em memória.
- Filas e Redis, se adotados, são mecanismos de entrega/otimização, não autoridade de pagamento nem reserva. Evitar acoplamento a plataforma paga antes do ADR operacional.

## Questões a validar antes da implementação

- Esquema de chaves, índices e estratégia de lock; datas UTC e comparação com relógio do PostgreSQL.
- Persistência da tentativa PSP e do `raw body` **com minimização de dados e proteção adequada**; política de retenção de eventos.
- Semântica de expiração de pagamento por método, limites sandbox, evento tardio e refund com timeout.
- Eventual necessidade de reconciliação polling e SLA operacional; coordenação de jobs/worker.

## Casos de teste vinculados

CA-001/002/003/004/005/007/008/010/011–026; SA-005/006/007/008/009; SEC-016–025, SEC-030/034. Todos **a implementar e evidenciar**.
