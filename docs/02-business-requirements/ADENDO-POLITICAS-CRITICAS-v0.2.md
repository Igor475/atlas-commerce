# Atlas Commerce — Adendo de Regras de Negócio: Políticas Críticas v0.2

> **ID:** AC-BRD-001-A | **Versão:** 0.2.0 proposta | **Data:** 12/10/2026  
> **Estado:** políticas propostas para aprovação do projeto de portfólio; não implementadas.  
> **Base:** [REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md), v0.1.  
> **Documento operacional:** [POLITICAS-CONSOLIDADAS.md](../03-business-processes/POLITICAS-CONSOLIDADAS.md).

## Regra de precedência

Este adendo **complementa e refina**, sem apagar o documento original, as regras `RN-007`, `RN-027–031`, `RN-035–038`, `RN-041–054` e `RN-058–063`. Quando houver discrepância nas políticas de reserva, pagamentos tardios, reembolsos e kits, aplicar as definições deste adendo **após aprovação formal**, preservando a regra base e registrando seu histórico. Não modificar outros domínios por consequência implícita. O estado `v0.2` é um rascunho de decisão e não torna o BRD v0.1 automaticamente aprovado.

## Novas regras complementares

### Reserva de estoque e tentativa de pagamento

- **RN-071 [MVP]** — A reserva de todas as unidades físicas do pedido nasce na mesma transação da criação do pedido e tem `expires_at` determinado pelo relógio do banco; duração nominal proposta: **40 minutos** desde a criação transacional. Não há renovação automática no MVP.
- **RN-072 [MVP]** — O checkout somente expõe uma sessão de pagamento se o vencimento externo for compatível com a reserva: a janela externa não poderá ultrapassar **30 minutos** desde a criação da sessão e precisa encerrar-se pelo menos **5 minutos antes** de `reservation.expires_at`; falha de compatibilidade impede expor a sessão e exige compensação controlada.
- **RN-073 [MVP]** — Enquanto a reserva estiver `ACTIVE` e não vencida, o sistema pode confirmá-la uma única vez com evidência de pagamento validada; ao concorrer com a expiração, a decisão é serializada no banco e apenas uma transição terminal prevalece.
- **RN-074 [MVP]** — Na expiração (`now >= expires_at`), a reserva ainda `ACTIVE` transita atomicamente para `EXPIRED`, liberando sua disponibilidade uma só vez. O pedido não é marcado `CANCELLED` por suposição: a situação financeira é conciliada, e estados indefinidos passam a `PAYMENT_REVIEW`.
- **RN-075 [MVP]** — Expirar a sessão do provedor (quando suportado) e reconciliar a tentativa são operações externas e recuperáveis; o banco não fica bloqueado aguardando a rede. Um webhook tardio não desfaz `EXPIRED`.
- **RN-076 [MVP]** — Métodos de pagamento com liquidação deliberadamente assíncrona ou vencimentos incompatíveis com a reserva (ex.: boleto e Pix com regras de vencimento específicas) permanecem **fora do MVP inicial** até receberem política de estoque própria. O simulador e o sandbox devem restringir a oferta aos métodos compatíveis.

### Pagamentos aprovados tardiamente

- **RN-077 [MVP]** — É considerado *tardio sem alocação* um pagamento válido recebido/conciliado quando a reserva física do pedido está `EXPIRED`/`RELEASED`, independentemente de quando o webhook chegou. O pagamento deve ser reconhecido financeiramente, mas o pedido fica em `PAYMENT_REVIEW`, sem fulfillment ou concessão automática de direitos do pedido misto.
- **RN-078 [MVP]** — Para pagamento tardio sem alocação, a **compensação padrão do MVP é reembolso integral**, iniciado por comando idempotente e seguido até sucesso comprovado. Reposição/reatribuição excepcional não é automática e exige decisão humana autorizada, nova reserva transacional, disponibilidade demonstrada e aceite do cliente quando aplicável.
- **RN-079 [MVP]** — Pedido exclusivamente digital não usa reserva física. Pagamento confirmado dentro da validade comercial do pedido concede direitos se a oferta/licença permanece elegível; confirmação depois de cancelamento ou encerramento definitivo vai para `PAYMENT_REVIEW` e compensação, sem concessão automática.
- **RN-080 [MVP]** — Webhook autenticado não é evidência de entrega concluída. Confirmar/registrar o pagamento, confirmar alocação, conceder direitos e expedir são efeitos separados, deduplicáveis e rastreáveis.

### Reembolsos e direitos associados

- **RN-081 [MVP]** — Um reembolso possui entidade/processo independente da tentativa original, com identidade, motivo, itens abrangidos, valores em centavos, aprovador (quando aplicável) e estados próprios.
- **RN-082 [MVP]** — O máximo reembolsável no momento da aprovação é `captured_amount − succeeded_refunds − reserved_pending_refunds` (valores por captura, em centavos). Reservas de valores para reembolso devem ser atômicas; rejeições ou falhas externas liberam o saldo comprometido somente após certeza de que não houve devolução no provedor.
- **RN-083 [MVP]** — Reenvios de reembolso compartilham chave idempotente estável no sistema e no provedor quando suportado. Resposta ambígua exige consulta/reconciliação; é proibido criar nova devolução às cegas.
- **RN-084 [MVP]** — Autorização comercial, solicitação ao provedor e confirmação da devolução são eventos distintos. Pedido não é descrito como reembolsado até evidência financeira válida. Não há incremento automático de estoque com o mero sucesso financeiro.
- **RN-085 [MVP]** — O atendimento recebe toda solicitação de arrependimento, inclusive produtos digitais e kits, e aplica o CDC e demais regras cabíveis. Restrições comerciais do MVP não bloqueiam direitos legais; casos difíceis exigem revisão humana registrada, nunca indeferimento automático pela categoria `DIGITAL`.
- **RN-086 [MVP]** — O cálculo proporcional de devolução fora de kits usa valores e alocações do snapshot, com ajuste de frete e descontos segundo a política e a legislação; somatórios por item e pedido não podem superar o montante capturado elegível.
- **RN-087 [MVP]** — Direitos digitais são analisados por item/titular. Estornos totais ou parciais podem gerar suspensão/revogação **somente após decisão autorizada e fundamentada**, nunca exclusivamente por existência de solicitação pendente; licenças e direitos do consumidor prevalecem.

### Kits

- **RN-088 [MVP]** — Kit simples tem uma linha comercial (`kit_sku`) e composição **imutável no snapshot**, com componentes, quantidades, tipo físico/digital e política de comercialização.
- **RN-089 [MVP]** — A venda do kit exige elegibilidade de todos os componentes e reserva **atômica de todas as unidades físicas**. Falha em qualquer componente cancela a tentativa de reserva do kit inteiro sem efeito parcial.
- **RN-090 [MVP]** — Kit é uma unidade comercial indivisível para preço, cupom e devolução padrão do MVP. Não há edição de composição nem reembolso automático de um componente isolado. Exceções de defeito, falta, acordo ou direito legal seguem tratamento excepcional auditado.
- **RN-091 [MVP]** — Para kit misto, o direito digital só pode ser concedido depois do pagamento confirmado **e** da confirmação de toda a alocação física necessária ao mesmo kit. A expedição física pode ocorrer posteriormente; uma falha física anterior à alocação bloqueia a liberação digital automática.
- **RN-092 [MVP]** — O MVP trata a parcela física de um mesmo kit como **uma unidade de expedição**; itens avulsos no mesmo pedido podem seguir em remessas separadas. A falta de parte do kit dispara exceção operacional, não marca o kit como entregue.
- **RN-093 [MVP]** — Na devolução integral autorizada de kit, o valor reembolsável é o preço efetivo do kit no snapshot, sujeito a ajustes legais/comerciais aplicáveis; partes físicas só retornam ao saldo vendável após inspeção e direitos digitais exigem análise individual documentada.
- **RN-094 [MVP]** — Ações de compensação de kits (ajuste de inventário, reembolso e eventual revogação) são operações independentes, ligadas por caso de pós-venda, com progresso e falhas observáveis.

## Interpretações das regras anteriores

| Original | Interpretação refinada neste adendo |
|---|---|
| RN-027/028/031 | Reserva com relógio de banco, limite de 40 min e resolução serial; pago antes de expirar confirma, expirado não reconfirma. |
| RN-046 | Pagamento tardio é reconhecido e entra em revisão; **reembolso integral é a compensação padrão** no MVP. |
| RN-047/048 | O saldo reembolsável desconta reembolsos concluídos **e pendentes reservados**. |
| RN-049/050/054 | Direito digital depende de elegibilidade do pedido/kit e decisão autorizada de suspensão. |
| RN-007/030/038/063 | Kit é indivisível comercialmente; seus componentes físicos e digitais mantêm rastreabilidade por item. |
| RN-059–062 | Arrependimento e devolução têm precedência legal; estorno financeiro e devolução ao estoque são operações distintas. |

## Decisões externas ainda condicionantes

1. **DA-006 (aberta):** o provedor de pagamento sandbox definitivo não foi escolhido; a política de 40/30 min só será homologada após validar os limites reais da integração e os relógios dos eventos.
2. **DA-009 (parcialmente aberta):** alçadas exatas de aprovação, regras fiscais e tratamento jurídico excepcional dependem de definição posterior.
3. **DA-010 (aberta):** emissão fiscal de produção continua fora do MVP.
4. **Licenciamento digital:** validação de termos e direitos do consumidor antes de vendas reais.
5. **Aprovação técnica:** definir isolamento transacional, constraints, outbox, reconciliação, idempotência e proteção contra retries nas próximas ADRs.

## Referências de verificação externa

- Código de Defesa do Consumidor, art. 49: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Decreto 7.962/2013: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions
- Stripe Refunds: https://docs.stripe.com/api/refunds

Este texto é um projeto de produto fictício, não substitui orientação jurídica, nem comprova conformidade técnica, regulatória ou operacional.
