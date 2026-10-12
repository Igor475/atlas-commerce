# DB-05 — Plano de provas PostgreSQL, ORM e concorrência

> **IDs:** `DB-001–028` • **Estado:** PLANEJADOS; **nenhum teste executado**. Banco real, múltiplas conexões independentes e falhas controladas serão necessários na etapa de spike/Codex aprovada. Não substituir CA, SA, AUTH ou ST.

| ID | Preparação e estímulo | Resultado verificável | Rastreabilidade |
|---|---|---|---|
| DB-001 | Dois clientes reservam a última unidade do mesmo SKU | Uma reserva ACTIVE, outra recusada; disponibilidade não negativa | CA-001/011; SA-006 |
| DB-002 | Reservas paralelas de SKUs distintos | Sem bloqueio global desnecessário; saldos corretos | RNF-002/006 |
| DB-003 | Kit pede 2 exemplares, mas resta 1 | Rollback completo de reserva/pedido/cupom/outbox | CA-022 |
| DB-004 | Linha avulsa e kit contêm o mesmo SKU | Quantidade somada antes de reservar, sem oversell | RN-089 |
| DB-005 | Dois jobs expiram mesma reserva ACTIVE | Uma transição e uma liberação; ledger idempotente | CA-012 |
| DB-006 | Webhook de pagamento disputa job de expiração | Só um estado terminal; nunca EXPIRED→CONFIRMED | CA-014; SA-007 |
| DB-007 | Transação começa antes do TTL, espera lock até depois | Revalidação do **horário atual DB após lock** impede confirmação tardia | RN-073/074 |
| DB-008 | API cliente envia hora anterior à expiração | Servidor ignora relógio do cliente | SEC-018/024 |
| DB-009 | Dois checkouts de kits com SKUs em ordem contrária | Ordem fixa reduz deadlock; eventual erro tem retry seguro | RN-089; RNF-002 |
| DB-010 | Repetir checkout com mesma key e mesmo fingerprint | Mesmo pedido/reserva/resultado sem efeitos adicionais | CA-002 |
| DB-011 | Repetir key com payload diferente | Conflito, nenhum segundo pedido ou cupom | SEC-019 |
| DB-012 | Mesmo evento Stripe duas vezes | Um inbox/evento/captura lógica e um efeito de pedido | CA-003; SA-007 |
| DB-013 | Evento pago chega depois de expirado | PAYMENT_REVIEW, sem fulfillment, intenção de refund estável | CA-015/024 |
| DB-014 | Captura R$100; R$30 succeeded e R$50 pending; duas requests R$20 | No máximo uma reserva de R$20 | CA-018; SA-008 |
| DB-015 | Timeout no envio do refund; retry após reinício | Mesma refund_id/chave Stripe, saldo segue reservado | CA-016/019 |
| DB-016 | Refund SUCCEEDED repetido ou webhooks fora de ordem | Uma conversão pending→succeeded, nenhum segundo débito | SEC-022/024 |
| DB-017 | Resposta externa inconclusiva de refund | Estado RECONCILIATION_REQUIRED; não liberar saldo | RN-083/084 |
| DB-018 | Commit pedido+outbox; processo cai antes do publish | Outbox pendente recuperada após restart, sem perder pedido | CA-010 |
| DB-019 | Dois workers fazem claim da mesma outbox com SKIP LOCKED | Claim de cada mensagem no máximo por um owner simultâneo | SEC-034 |
| DB-020 | Worker morre com lease vencido | Reclaim seguro e efeito externo deduplicado | RN-070 |
| DB-021 | Mensagem enviada duas vezes ao consumer | Inbox impede ação duplicada, telemetria mantém tentativa | SEC-024/034 |
| DB-022 | Kit misto: pagamento válido mas um físico não alocado | Entitlement não criado, fulfillment bloqueado | CA-024; SEC-025 |
| DB-023 | Entitlement repetido para mesmo titular/componente/licença | Uma concessão lógica; acesso estranho negado | CA-023; SA-009 |
| DB-024 | Sessão revogada reutilizada com cookie antigo | API consulta estado final e nega | AUTH-010; SA-003 |
| DB-025 | Token recovery usado em duas transações | Apenas uma consome token e altera credencial | AUTH-007; SA-004 |
| DB-026 | Transação SERIALIZABLE falha em concorrência real | Retry bounded somente transação local, sem side effect externo | RNF-002/003 |
| DB-027 | Migration expand-contract com versões antiga/nova | Compatibilidade durante coexistência, backfill idempotente | RNF-011/012 |
| DB-028 | Backup e restore em ambiente segregado | Estado de pedido/ledger/refund/entitlement íntegro; tempo medido | SA-012; SEC-035 |

## Condições mínimas de execução

- PostgreSQL em versão explicitamente registrada, com **duas ou mais conexões reais independentes**, sincronização por barreiras/latches de teste e controle do estado inicial. Não usar `sleep` como prova principal de corrida.
- Log de execução contém commit, versões de ORM/adapter, isolamento/transação, SQLSTATE, configuração de pool/timeout, casos positivos e negativos e observações sobre carga/latência.
- Testes de PSP devem usar fake determinístico para interleavings e Stripe test mode para contrato externo; banco mockado não substitui decisão de concorrência real.
- Falha de teste não deve acionar efeitos reais. Segredos de banco/Stripe ficam fora do relatório.
- Medir divergência entre projeção de estoque e ledger, refund pendente x captura, outbox stuck e repetição de evento.

## Gate de encerramento

- [ ] DB-001–028 rastreados a suites reais e evidência do ambiente.
- [ ] Limites de pool e locks escolhidos com dados, sem extrapolar VUs não medidos.
- [ ] Migrations/restore verificados, rollback/roll-forward revisados.
- [ ] Versões congeladas e ADR-006 formalmente aceita com riscos conhecidos.

**Nenhuma caixa acima pode ser marcada concluída por esta entrega documental.**
