# ADR-007 — Jobs duráveis e worker opcional

**Status:** ABERTA; não existe worker implementado.

## Problema

Conciliação PSP, expiration, notificações e outbox devem sobreviver a quedas, atrasos e retries. Plano de hospedagem/orçamento ainda não confirmado.

## Alternativas

- Worker separado com fila quando infraestrutura, volume e custo permitirem.
- Scheduler/dispatcher no processo API com jobs duráveis em PostgreSQL e lease/lock seguros, indicado apenas se o modelo de hospedagem garantir execução suficiente.
- Cron externo com API autenticada e dedup persistente (não delegar garantia de idempotência ao cron).

## Diretriz de decisão

Escolher a alternativa mínima que permita disparar, detectar atraso, recuperar e deduplicar. **Nunca** usar timer em memória como única fonte de expiração/cobrança. Documentar lock owner, leasing, heartbeat quando necessário, tolerância a paralelismo e métricas de backlog.

## Gate

Simular crash, replay, eventos fora de ordem, dupla execução e restart. Demonstrar operação na hospedagem selecionada; métricas e alertas de stuck outbox, refund incerto, expiração atrasada. Aplicar SEC-016/024/034/035.
