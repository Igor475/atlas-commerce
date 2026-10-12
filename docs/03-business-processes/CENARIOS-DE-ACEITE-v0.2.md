# Cenários de aceitação das políticas — v0.2

> Esses cenários são contratos verificáveis **a implementar**, não testes já executados. Requerem banco relacional real, PSP sandbox/fake determinístico e relógio de teste controlado (sem `sleep` em testes críticos).

| ID | Política/RNs | Dado | Quando | Então | Evidência necessária |
|---|---|---|---|---|---|
| CA-011 | PC-01 / 071,073 | SKU tem uma unidade vendável | Duas reservas concorrentes | Uma reserva `ACTIVE` e outra rejeição sem inventário negativo | Teste PostgreSQL transacional |
| CA-012 | PC-01 / 071,074 | Reserva `ACTIVE`, relógio chega ao vencimento | Dois jobs expiram a mesma reserva | Apenas uma transição a `EXPIRED` e uma liberação | Teste de concorrência e ledger |
| CA-013 | PC-01 / 072 | PSP oferece sessão com prazo posterior à reserva | Tentar publicar link de pagamento | Link não é exposto e tentativa é encerrada/compensada | Teste integração PSP fake |
| CA-014 | PC-01/02 / 073–078 | Reserva prestes a vencer | Webhook pago e expiração concorrem | Só uma transição terminal; pago sem reserva abre revisão | Teste interleaving controlado |
| CA-015 | PC-02 / 077–078 | Pedido físico, reserva `EXPIRED`, cobrança validada | Chega webhook pago | Pedido `PAYMENT_REVIEW`, sem fulfillment, refund integral idempotente | Teste integração e outbox |
| CA-016 | PC-02 / 078 | Refund integral solicitado e timeout externo | Chega retry/replay | Usa mesmo ID/chave e não duplica devolução | PSP fake com confirmação atrasada |
| CA-017 | PC-02 / 079 | Pedido só digital ainda válido | Pagamento autenticado confirmado | Conceder entitlement uma vez, sem inventário | E2E e teste autorização |
| CA-018 | PC-03 / 082 | Captura R$100; sucesso anterior R$30; refund pendente R$50 | Solicitar dois refunds de R$20 simultâneos | No máximo um aprovado; outro encontra saldo R$0 | Transações reais + métricas |
| CA-019 | PC-03 / 083–084 | PSP devolveu valor, resposta inicial perdeu-se | Retry do comando | Não cria novo reembolso; consulta estado da mesma operação | Teste falha de rede simulada |
| CA-020 | PC-03 / 085,087 | Cliente solicita arrependimento de e-book | Registrar pedido | Solicitação aceita para análise jurídica/comercial; sem rejeição automática | Teste domínio/API |
| CA-021 | PC-03 / 084,086 | Livro físico reembolsado mas não devolvido | Confirmar reembolso | Saldo disponível não aumenta até inspeção | Teste inventário |
| CA-022 | PC-04 / 088–089 | Kit tem 2 livros + 1 e-book; apenas 1 livro em estoque | Confirmar checkout | Kit inteiramente recusado, sem reserva ou cupom parcial | Teste PostgreSQL com rollback |
| CA-023 | PC-04 / 090–091 | Kit misto pago e com reserva física confirmada | Executar entrega digital repetida | Um direito por componente e titular, sem duplicidade | Teste domínio e unicidade |
| CA-024 | PC-04 / 091 | Kit misto teve reserva física expirada | Chega pagamento tardio | Nenhum direito digital do kit é concedido; inicia compensação | Teste integração |
| CA-025 | PC-04 / 090,093 | Cliente solicita devolução de parte de kit | Abrir solicitação | Atendimento registra e analisa exceção legal; sem reembolso automático fracionado | Teste domínio e auditoria |
| CA-026 | PC-04 / 092–094 | Um componente físico de kit não foi preparado | Operação tenta marcar kit entregue | Transição rejeitada; exceção operacional registrada | Teste máquina de estados |

**Critério de aceite global:** sem implementação, o status de todos os cenários permanece **PENDENTE**. O CI da fase de desenvolvimento deverá vincular casos `CA-011..CA-026` a testes de nomes estáveis e evidências executadas.
