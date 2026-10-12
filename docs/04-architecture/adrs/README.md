# Registro de Decisões Arquiteturais — Fase 03

> **Estado:** propostas sob revisão, salvo decisão de escopo já presente no BRD. NÃO são decisões de implantação final. IDs imutáveis, registrar status e consequências quando aprovadas.

| ADR | Proposta/resolução | Status |
|---|---|---|---|
| [ADR-001](ADR-001-monolito-modular.md) | Monólito modular, API central e separação de domínios | Proposta fundamentada no escopo |
| [ADR-002](ADR-002-integridade-outbox.md) | PostgreSQL e outbox/inbox para efeitos recuperáveis | Proposta; provar sob carga |
| [ADR-003](ADR-003-autenticacao-sessoes.md) | **Sessão opaca com cookie por origem e MFA antes de sessão administrativa** | **Proposta detalhada para aprovação** (DS-001/002; DS-003 ainda aberta) |
| [ADR-004](ADR-004-psp-sandbox.md) | **Stripe selecionado**, Checkout hospedado em modo teste; política 40/30/5 | **Fornecedor decidido**, homologação pendente (DS-004) |
| [ADR-005](ADR-005-midia-e-storage.md) | Mídia privada segregada, entitlement por recurso | Aberta em provedor (DS-005/006) |
| [ADR-006](ADR-006-acesso-dados.md) | Banco transacional e estratégia ORM/query | Aberta (DDL/adapter) |
| [ADR-007](ADR-007-worker-e-jobs.md) | Jobs duráveis com worker condicional | Aberta (infra/operação) |
| [ADR-008](ADR-008-controles-operacionais.md) | Controles de operação e segurança de infraestrutura | Proposta (DS-007/008/009) |

## Formato de aprovação

Cada ADR tem contexto, alternativas, proposta, consequências, riscos e **evidência necessária**. Quando uma for aprovada, registrar data, motivo, responsáveis de revisão e links para o diff/ensaios. Não converter toda a Fase 03 automaticamente em `Accepted`.

**Decisões externas de negócio** permanecem em [CRITERIOS-DECISOES-EXTERNAS.md](../../03-business-processes/CRITERIOS-DECISOES-EXTERNAS.md); não duplicar autoridade comercial aqui.

**Refinamento ADR-003:** [contratos](../08-contratos-de-autenticacao.md) · [cenários AUTH](../09-cenarios-aceite-autenticacao.md) · [DFD-04](../security/DFD-04-sessoes-mfa.md). Publicar documentos não significa aprovar a ADR.
