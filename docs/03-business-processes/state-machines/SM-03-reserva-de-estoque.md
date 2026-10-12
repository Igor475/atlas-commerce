# SM — Reserva e expiração de estoque

> **Versão:** 0.2 — políticas consolidadas (em revisão)  
> **Origem:** [Adendo de regras v0.2](../../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md)  
> **Regras:** RN-024–031, RN-071–076  
> **Estado:** modelo proposto, não implementado.

Reserva proposta para 40 minutos calculados no relógio do banco, sem renovação automática. Ao vencer, somente uma transição terminal pode vencer a disputa com a confirmação. Sessão de pagamento externa deve expirar antes; a reconciliação não devolve vida a uma reserva `EXPIRED`.

![Reserva e expiração de estoque](SM-03-reserva-de-estoque.svg)

**Arquivos:** [Fonte editável `.dot`](SM-03-reserva-de-estoque.dot) · [SVG](SM-03-reserva-de-estoque.svg) · [PNG](SM-03-reserva-de-estoque.png)  
**Guardas e efeitos:** [Tabelas de transição](../TABELAS-DE-TRANSICAO.md).  
**Voltar:** [Índice Fase 02](../README.md)

As setas representam transições de negócio; detalhes transacionais e implementação serão decididos na Fase 03.
