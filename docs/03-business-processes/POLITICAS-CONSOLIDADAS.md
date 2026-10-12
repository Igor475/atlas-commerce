# Políticas operacionais consolidadas — Fase 02 (proposta v0.2)

> **IDs:** PC-01, PC-02, PC-03, PC-04 | **Versão:** 0.2.0 (para revisão) | **Data:** 12/10/2026  
> **Fonte normativa proposta:** [Adendo RN v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md).  
> **Abrangência:** operação fictícia B2C do Atlas Commerce; sandbox e conteúdo de demonstração.

## Princípios comuns

1. **Fontes de verdade independentes.** Pedido registra compromisso comercial; reserva registra disponibilidade; tentativa de pagamento registra evidência financeira; reembolso registra compensação; fulfillment registra entrega; entitlement registra acesso digital.
2. **Nenhum efeito externo dentro da transação do banco.** Operações locais curtas e atômicas; ao chamar provedor, manter intenção durável e resolver sucesso/falha/indeterminação por idempotência e reconciliação.
3. **No máximo um efeito por identidade de negócio.** Recebimento do mesmo webhook e eventos equivalentes não geram duas confirmações, pedidos, reservas, concessões ou reembolsos.
4. **Todos os valores são inteiros em centavos (BRL).** Operações usam snapshots de pedido e chaves persistentes, sem cálculo monetário com `float`.
5. **Não fingir conclusão.** Reembolso solicitado não é pago; pagamento aprovado não significa entrega; estorno não significa produto apto a retornar ao estoque.

## PC-01 — Reserva de estoque: validade e expiração

**Decisão de produto do MVP:** `reservation_ttl_minutes = 40`, calculada pelo banco a partir da criação do pedido com reserva; não existe extensão automática. O checkout externo deve expirar **até 30 minutos após sua criação**, e pelo menos **5 minutos antes** da reserva. A combinação precisa ser comprovadamente possível no provedor escolhido; se não for, ajustar a política **antes do primeiro código de pagamento**, com decisão versionada.

1. Confirmar uma cotação, uma chave de idempotência e o conjunto de componentes físicos, inclusive de kits.
2. Na **mesma transação**, criar pedido, snapshot, comprometer cupom (se houver), reservar todas as quantidades e registrar `expires_at` (relógio do PostgreSQL). Se faltar uma unidade, rollback total.
3. Após commit, iniciar uma tentativa de pagamento com chave estável. Não exibir um link de pagamento incompatível com o prazo interno. Se a criação falhar/ficar incerta, registrar situação recuperável e sincronizar/invalidar a sessão externa sem perder a reserva.
4. Confirmar a reserva somente ao receber evidência financeira válida **e enquanto a reserva ainda está ACTIVE e antes de `expires_at`**, com atualização condicional serializada junto da expiração.
5. No vencimento, o job altera `ACTIVE -> EXPIRED` atomicamente e libera uma única vez a disponibilidade. O fechamento/reconciliação do pagamento é assíncrono; a janela externa foi configurada para terminar antes da reserva.
6. Pedido sem pagamento comprovado poderá ir a `CANCELLED` **somente com fechamento financeiro comprovado**. Enquanto persistir incerteza, fica em `PAYMENT_REVIEW` para reconciliação, apesar de sua reserva já liberada.
7. `CONFIRMED`, `EXPIRED` e `RELEASED` são terminais; não há `EXPIRED -> CONFIRMED`. O saldo disponível deriva de fatos persistidos, nunca de incrementos duplicados por retries.

**Disputa na fronteira da expiração:** com lock/controle de concorrência sobre a reserva, ou vence a confirmação válida registrada antes do prazo, ou vence a expiração. Se o provedor efetivou pagamento mas o sistema não confirmou o compromisso antes da expiração, o pagamento é reconhecido e compensado, não se decreta automaticamente estoque alocado. A confirmação pode ser desacoplada do webhook por consulta ativa dentro da janela.

**Indicadores:** reservas criadas, expiradas, confirmadas, pagamentos incertos, latência da conciliação, expiradas com cobrança confirmada.

## PC-02 — Pagamentos aprovados sem reserva vigente

### Condições e decisão

| Situação | Ação comercial | Ação financeira | Fulfillment |
|---|---|---|---|
| Pago, reserva ainda ACTIVE/válida | Confirmar reserva e pedido | Registrar `APPROVED` | Iniciar operações conforme itens |
| Pago, reserva `EXPIRED`/`RELEASED` | Marcar `PAYMENT_REVIEW`, sem reativar reserva | Reconhecer cobrança e abrir reembolso integral idempotente | Bloquear entrega e direitos digitais automáticos do pedido |
| Pago, reserva expirada, reembolso comprovado | Encerrar caso por cancelamento compensado | Registrar `REFUND_SUCCEEDED` | Continuar bloqueado |
| Pago, reembolso inconclusivo | Manter revisão aberta | Consultar provedor e retentar **mesmo refund**, nunca duplicar | Bloquear |
| Pago, pedido puramente digital ainda elegível | Confirmar pedido (sem reserva física) | Reconhecer quitação | Conceder entitlement idempotente |
| Pago, pedido puramente digital já cancelado/encerrado | `PAYMENT_REVIEW` | Reembolso por compensação | Sem concessão automática |

**Reconciliação obrigatória:** assinatura/autenticidade do webhook, identidade da tentativa, ID da cobrança, valor, moeda, ordem e estado atual; eventos podem chegar duplicados e fora de ordem. Eventos diferentes relativos à mesma cobrança devem convergir ao mesmo resultado.

**Exceção ao reembolso automático:** realocação após expiração não é habilitada no MVP. Se autorizada numa evolução, exige novo aceite comercial, prova de estoque por transação e decisão humana com trilha de auditoria. Nenhuma aprovação tardia autoriza recriar reserva automaticamente.

## PC-03 — Política de reembolsos

### Motivos e modalidades

- **Integral:** compra cancelada de forma elegível; falta definitiva; compensação de pagamento tardio; exercício de direito de arrependimento quando aplicável.
- **Parcial:** item avulso específico de um pedido maior, diferença de valor autorizada ou solução pós-venda fundamentada, **desde que não incida sobre componente isolado de kit por fluxo automático**.
- **Kit:** reembolso padrão integral da linha do kit; exceção depende de intervenção humana autorizada e do direito aplicável.

### Processo

1. Registrar solicitação e carimbo de data (inclusive para direito de arrependimento), itens e motivo, sem descartar por ser produto digital.
2. Avaliar enquadramento legal/comercial, situação do pedido e permissão/alçada. A avaliação administrativa não pode suprimir direitos assegurados em lei.
3. Calcular reembolso de acordo com preços, descontos, frete e ajustes do snapshot; não construir valores a partir do catálogo atual.
4. **Sob transação/lock do pagamento**, reservar o valor do reembolso em aberto, obedecendo:

   `available_to_refund = captured_cents - succeeded_refund_cents - outstanding_reserved_refund_cents >= requested_cents >= 1`.

5. Registrar `refund_id`, chave de idempotência estável, beneficiário, quem autorizou (ou regra de compensação automática) e intenção a executar.
6. Solicitar reembolso ao provedor fora da transação, com timeout/retentativa segura. Resultado ambíguo permanece `RECONCILIATION_REQUIRED` até consultar provedor.
7. Somente com prova do provedor marcar `SUCCEEDED` e comunicar conclusão. Resultado `FAILED` libera reserva de valor **quando o provedor confirmar que não processou o reembolso**; erro de rede isolado não libera.
8. Estoque físico só retorna à disponibilidade após inspeção de aptidão, na proporção recebida. Direitos digitais exigem decisão separada; não revogar só porque existe solicitação.

**Caso concorrente obrigatório:** numa captura de R$100,00 com R$30,00 já reembolsados, se reembolso de R$50,00 estiver pendente, o próximo pedido só pode reservar até R$20,00. Duas solicitações concorrentes de R$20,00 não podem ambas ser aprovadas.

**Observação jurídica:** o projeto é brasileiro; tratar arrependimento de compras fora do estabelecimento segundo o CDC, art. 49. Não codificar exclusão genérica de produtos digitais; eventuais exceções específicas requerem revisão especializada antes de operação comercial real.

## PC-04 — Kits físicos, digitais e mistos

### Regras de venda

- **Kit comercial simples:** SKU pai de linha única, preço específico do kit e composição fixa em snapshot (`component_sku`, `quantity`, `type`, `edition/license`, caso aplicável).
- **Reserva all-or-nothing:** somar unidades físicas necessárias por SKU (incluindo mesmo SKU presente como item avulso no pedido), validar e reservar tudo numa transação. Um componente em falta impede vender o kit inteiro.
- **Desconto do kit:** valor total é da linha do kit; eventuais rateios internos para relatórios/restituições devem ter fórmula explícita de centavos e soma exata, não alterar preço comercial original.
- **Kit só digital:** não requer estoque físico, mas exige elegibilidade de todos os direitos digitais.
- **Kit misto:** direitos digitais liberados somente após quitação e alocação física íntegra. O acesso é por componente e usuário, mas pertence à aquisição do kit no snapshot.

### Entrega e devolução

- Componentes físicos de um mesmo kit seguem **juntos numa unidade de expedição no MVP**; um pacote com componente ausente não configura entrega completa.
- Itens avulsos fora do kit podem ser expedidos separadamente (com progresso por item).
- Fluxo de devolução comercial padrão: **kit integral**. Solicitação de devolução de parte do kit deve ser acolhida, analisada conforme direitos legais e não recusada apenas por regra comercial simplificada.
- Reposição física só ocorre após retorno e inspeção positiva de cada componente. Digital requer avaliação fundamentada de suspensão/revogação, sem exclusão automatizada.

## Resultados da consolidação

| Questão anterior | Estado após esta proposta | Pendências reais |
|---|---|---|
| DA-004 — kits | **Resolvida como política do MVP** | Contrato/licença e exceções legais de devolução |
| DA-005 / DA-012 — reserva | **Resolvida como proposta parametrizada** (40 min, PSP <=30 min) | Confirmar compatibilidade com sandbox escolhido |
| DA-009 — reembolsos | **Resolvida parcialmente:** modalidades, concorrência, estados e regra padrão | Alçadas e política legal/fiscal detalhadas |
| Pagamento tardio | **Resolvido como política do MVP:** revisão + reembolso integral | Mapeamento técnico de eventos externos e automação |
| DA-006 — provedor | **Em aberto** | Escolher PSP, validar eventos, expiração e estorno |

Consulte [TABELAS-DE-TRANSICAO.md](TABELAS-DE-TRANSICAO.md) e [CENARIOS-DE-ACEITE-v0.2.md](CENARIOS-DE-ACEITE-v0.2.md) para guardas, efeitos e evidências.
