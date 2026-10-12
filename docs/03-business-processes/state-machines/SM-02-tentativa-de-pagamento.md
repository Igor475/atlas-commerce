# SM — Estados da tentativa de pagamento

> **Versão:** 0.2 — políticas consolidadas (em revisão)  
> **Origem:** [Adendo de regras v0.2](../../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md)  
> **Regras:** RN-041–048, RN-080–084  
> **Estado:** modelo proposto, não implementado.

A tentativa não possui estados `PARTIALLY_REFUNDED`/`REFUNDED` na v0.2. A cobrança aprovada permanece como evidência histórica; devoluções pertencem ao processo `SM-07`. Falha/timeout externo sem prova é um estado de reconciliação operacional e não significa pagamento `FAILED`.

![Estados da tentativa de pagamento](SM-02-tentativa-de-pagamento.svg)

**Arquivos:** [Fonte editável `.dot`](SM-02-tentativa-de-pagamento.dot) · [SVG](SM-02-tentativa-de-pagamento.svg) · [PNG](SM-02-tentativa-de-pagamento.png)  
**Guardas e efeitos:** [Tabelas de transição](../TABELAS-DE-TRANSICAO.md).  
**Voltar:** [Índice Fase 02](../README.md)

As setas representam transições de negócio; detalhes transacionais e implementação serão decididos na Fase 03.
