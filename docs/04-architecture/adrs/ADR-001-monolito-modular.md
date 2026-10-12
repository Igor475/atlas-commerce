# ADR-001 — Monólito modular como arquitetura inicial

**Status:** PROPOSTA (direção alinhada ao escopo B2C de um vendedor) • **Data:** 12/10/2026.

## Contexto

Transações fortes de estoque, carrinho, preço, pedido, pagamentos sandbox e direitos digitais necessitam integração cuidadosa e testes. O produto é projeto fictício de portfólio; microsserviços distribuiriam estados antes de comprovação de necessidade.

## Alternativas

A. Monólito modular com NestJS/API: transações locais, interfaces explícitas, deploy simples.  
B. Microsserviços por domínio: autonomia de escala, mas maior custo de consistência, operação e coordenação.  
C. Monólito sem fronteiras: bootstrap rápido, degrada manutenibilidade e autorização.

## Proposta e consequências

**Escolher A inicialmente**, com módulos de identidade, catálogo, preços, inventário, checkout/pedidos, pagamentos, biblioteca, fulfillment e backoffice. Interfaces de aplicação entre módulos; imports e mutações cruzadas proibidos sem contrato. API única; storefront/admin podem ser um ou dois aplicativos — ADR posterior.

**Benefícios:** locks/transações PostgreSQL, menos infraestrutura, testes determinísticos de concorrência, evolução gradual.  
**Custos/riscos:** hot spots de módulo, deploy unitário, necessidade de disciplina de boundaries; extração somente após telemetria e perfil de gargalos.

**Critério para aceitar:** testes de dependência entre módulos e mapa ownership, revisão de contratos; RNF-002/007/011.
