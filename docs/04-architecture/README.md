# AC-ARCH-001 — Fase 03: Arquitetura de Software e Segurança

> **Versão:** 0.4.0 • **Estado:** proposta para revisão — **não implementada, não homologada** • **Data:** 12/10/2026  
> **Baseline lida:** `Igor475/atlas-commerce`, branch `main`, commit `608070a547f79fe0c2e9deaa226ce7a936b33600`.

## Finalidade e contratos de entrada

Conectar os requisitos do Atlas Commerce a um desenho técnico modular, rastreável e proporcional a um **e-commerce editorial B2C fictício, de um só vendedor**, com livros físicos, e-books, revistas digitais e kits. Este material **não** contém código, schema de banco, serviços deployados, promessas de SLA, nem evidências de testes.

**Fontes normativas, que NÃO são substituídas por este pacote:**

1. [AC-BRD-001 v0.2.1 — BRD](../02-business-requirements/REGRAS-DE-NEGOCIO.md): RN-001–070, RF-001–015, RNF-001–012, CA-001–010.
2. [Adendo v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md): RN-071–094.
3. [Políticas PC-01–04](../03-business-processes/POLITICAS-CONSOLIDADAS.md), [transições](../03-business-processes/TABELAS-DE-TRANSICAO.md) e [CA-011–026](../03-business-processes/CENARIOS-DE-ACEITE-v0.2.md).
4. [AC-SEC-001 v0.2](../07-security/security-requirements.md): SEC-001–038, SA-001–012, DS-001–009.
5. [Critérios externos](../03-business-processes/CRITERIOS-DECISOES-EXTERNAS.md) e [decisões pendentes](../03-business-processes/DECISOES-PENDENTES.md).

Se houver conflito, abrir ADR/decisão, **corrigir em todas as fontes** e não implementar a interpretação mais conveniente. Um diagrama não se sobrepõe a uma transição de estado ou a um controle SEC.

## Catálogo — arquivos independentes

| Grupo | Arquivo | Responsabilidade |
|---|---|---|
| Visão | [Princípios e limites](01-principios-e-contexto.md) | Escopo, hipóteses, qualidade e arquitetura alvo |
| Módulos | [Mapa de módulos e contratos](02-modulos-e-fronteiras.md) | Ownership, comunicação e isolamento do monólito |
| Integridade | [Transações e invariantes](03-transacoes-e-consistencia.md) | Estoque, checkout, PSP, refund, kits, outbox |
| Dados | [Modelo lógico e retenção](04-dados-e-persistencia.md) | Agregados e identidade de entidades, sem migrations |
| **ADR-006 (dados)** | [Pacote DB](database/README.md) · [ER-01/02/03](database/README.md) · [provas DB-001–028](database/DB-05-plano-de-validacao.md) | Estratégia de ORM/driver, ledger, locks, migrações e testes concorrentes |
| Operação | [Deploy e observabilidade](05-operacao-e-qualidade.md) | Evolução gradual, operação e evidências |
| C4 | [C4-01 Contexto](c4/C4-01-contexto.md) · [C4-02 Contêineres](c4/C4-02-conteineres.md) · [C4-03 Componentes](c4/C4-03-componentes.md) | Vistas C4 adaptadas e fontes DOT/SVG/PNG separadas |
| Segurança | [Índice](security/README.md) · [matriz de autorização](security/authorization-matrix.md) · [ameaças](security/threat-model.md) | Permissões e risco por fronteira de confiança |
| DFD | [DFD-01 Identidade](security/DFD-01-identidade.md) · [DFD-02 Checkout](security/DFD-02-checkout-pagamento.md) · [DFD-03 Conteúdo digital](security/DFD-03-entitlements.md) | Fontes DOT + SVG + PNG individuais |
| Sequências | [Checkout/compensação](sequences/SEQ-01-pagamento-compensacao.md) · [Refund](sequences/SEQ-02-reembolso.md) | Mermaid textual e guardas; não substituem SQ-01–05 |
| Decisões | [Índice ADR](adrs/README.md) | Registro de alternativas e bloqueios |
| Plano de verificação | [Rastreabilidade e gates](06-rastreabilidade-e-gates.md) · [validação Stripe](07-validacao-stripe.md) · [status de decisões](STATUS-DECISOES-FASE-03.md) | Critérios para avançar à implementação Codex |

Cada `.dot` é uma **fonte editável**, com SVG e PNG derivados do mesmo arquivo usando Graphviz. As imagens são representações arquiteturais com **semântica C4 adaptada** (não uma certificação de conformidade visual C4). Os arquivos `.mmd` são fontes textuais para o renderizador Mermaid, sem imagem exportada neste pacote.

## Decisões e nível de compromisso

**Diretrizes já suportadas pelo escopo:** monólito modular de um vendedor, checkout financeiro em sandbox, banco relacional transacional, isolamento de conteúdos digitais privados, autenticação/autorização no backend. 

**Propostas de design, não contratos implementados:** `apps/storefront`, `apps/admin`, `apps/api`; possível processo de worker; PostgreSQL como fonte de verdade; outbox relacional para efeitos recuperáveis; Redis/fila somente quando houver justificativa de processamento; object storage S3-compatible opcional por integração; observabilidade sem PII.

**Proposta de autenticação em revisão:** sessão opaca/revogável, cookie host-only por origem e MFA antes da sessão administrativa; [ADR-003](adrs/ADR-003-autenticacao-sessoes.md), [contratos](08-contratos-de-autenticacao.md), [cenários AUTH-001–020](09-cenarios-aceite-autenticacao.md) e [DFD-04](security/DFD-04-sessoes-mfa.md). Ainda não aprovada.

**Fornecedor definido:** **Stripe**; Checkout hospedado para o MVP demonstrativo, ainda sem testes de integração. **Decisões abertas:** DS-004 (homologar janela Stripe 40/30/5, métodos, webhooks e refund); DA-009/DS-003 (aprovações e alçadas); DS-001/002 (aprovação da proposta de sessão/MFA, origem, TTL e recovery); DS-005/006 (storage e uploads); DS-007/008 (retenção/ambiente); DS-009 (perfil ASVS); ORM e deploy exatos.

**Proposta de persistência em revisão:** PostgreSQL como fonte de verdade; Prisma ORM v7 + adapter e SQL parametrizado para transações complexas **como candidato ao spike**, mantendo Drizzle/SQL como alternativas até prova. Ver [ADR-006](adrs/ADR-006-acesso-dados.md), [DB-04](database/DB-04-orm-drivers-pool.md) e [DB-05](database/DB-05-plano-de-validacao.md). Não foi criado schema ou migration.

## Critério de saída — Fase 03

- [x] **Proposta documental inicial** de C4, módulos, transações, DFDs, ameaças, autorização e ADRs elaborada.
- [ ] Revisar desenho e ADRs com o projeto, registrar aprovações e atualizar divergências encontradas.
- [x] Selecionar o provedor Stripe como decisão de projeto; sem declarar homologação.
- [ ] Testar em Stripe test mode se o Checkout hospedado admite a política de expiração **absoluta**: reserva 40 min; sessão 30 min (mínimo Stripe); término >=5 min antes da reserva; sem permitir métodos incompatíveis. Consultar [plano de validação Stripe](07-validacao-stripe.md).
- [ ] **Aprovar ADR-003 v0.3** (sessão opaca e MFA administrativo), com topologia/cookies/CSRF, limites e processo de recuperação; vincular aos testes AUTH-001–020 e à matriz DS-003.
- [ ] Validar matriz de papéis/ações, recuperação de sessão, MFA e alçadas; definir responsáveis.
- [ ] Formalizar autorização de uso dos ativos digitais, termos, retenção, limites operacionais e ambiente de deploy.
- [ ] Revisar em modelador os BPMNs legados da Fase 02 e manter fontes/imagens sincronizadas se mudarem.
- [ ] Comparar e validar ORM/adapter e invariantes do banco (DB-001–028), revisar índices/constraints, concorrência e rollback/restore conforme ADR-006.
- [ ] Transformar decisões aprovadas em contratos testáveis para o Codex; **sem iniciar código a partir de ADRs pendentes**.

**Execução futura:** prompts do Codex serão preparados por módulo/etapa quando o usuário solicitar a implementação, baseados no GitHub atualizado, escopo preciso, alterações permitidas, testes e relatório de evidências. **Nenhum prompt de implementação nem código é entregue agora.**

## Refinamento de identidade na versão 0.3

- [ADR-003 aprofundada](adrs/ADR-003-autenticacao-sessoes.md)
- [Contratos de autenticação e estado](08-contratos-de-autenticacao.md)
- [20 casos de aceite AUTH](09-cenarios-aceite-autenticacao.md)
- [DFD-04 de sessões/MFA](security/DFD-04-sessoes-mfa.md)
- [SEQ-03 Login/MFA](sequences/SEQ-03-login-mfa.md) e [SEQ-04 Step-up](sequences/SEQ-04-stepup-recuperacao.md)

O refinamento é **documental e condicional**; não aprova automaticamente DS-001/002/003.

## Refinamento de dados na versão 0.4

- [ADR-006 — persistência e concorrência](adrs/ADR-006-acesso-dados.md)
- [DB-01–05: modelo lógico, locks, migrations, ORM e testes](database/README.md)
- [ER-01 — Catálogo, pedido e estoque](database/ER-01-catalogo-pedidos-estoque.md)
- [ER-02 — Pagamentos, reembolsos e outbox](database/ER-02-pagamentos-reembolsos.md)
- [ER-03 — Identidade e biblioteca](database/ER-03-identidade-biblioteca.md)
- [SEQ-05 Reserva/expiração](sequences/SEQ-05-checkout-reserva-expiracao.md) · [SEQ-06 Refund concorrente](sequences/SEQ-06-refund-concorrente.md)

**Estado:** documentação proposta. Nenhum Prisma/Drizzle/PostgreSQL spike, migration ou teste DB foi executado.
