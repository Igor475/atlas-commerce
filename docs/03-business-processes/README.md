# Atlas Commerce — Fase 02: Modelagem de processos e diagramas

> **Identificador:** AC-MODEL-002  
> **Versão:** 0.1.0 — proposta para revisão  
> **Data:** 12/10/2026  
> **Fonte:** [Regras de Negócio v0.1](../02-business-requirements/REGRAS-DE-NEGOCIO.md)  
> **Estado:** Modelos propostos; nenhuma funcionalidade é considerada implementada.

## Objetivo

Representar, de maneira visual e rastreável, os **atores e capacidades**, os **processos de compra e pós-venda**, as **interações críticas** e as **máquinas de estados independentes** do Atlas Commerce. Cada diagrama possui um arquivo-fonte editável e uma exportação em SVG e PNG. Não se deve introduzir uma tecnologia de implementação apenas porque ela consta do desenho conceitual.

### Interpretação das notações

- **UC (casos de uso):** notação gráfica **inspirada em UML**, com atores identificados e casos em elipses. Não é uma declaração de conformidade integral com a especificação UML.
- **PR (processos):** **fluxogramas de negócio** (Graphviz/DOT), não diagramas BPMN formais. Os modelos descritivos BPMN 2.0 estão em [`bpmn/`](bpmn/) e devem ser abertos num editor compatível.
- **SQ (sequências):** passos ordenados entre participantes, escritos em **Mermaid `sequenceDiagram`**, com SVG e PNG independentes para visualização. As exceções resumidas em notas precisam ser refinadas em diagramas condicionais na revisão arquitetural.
- **SM (estados):** representações de estados e transições inspiradas nas máquinas de estados UML. Guardas e políticas devem ser implementadas e testadas explicitamente.

**Semântica fundamental:** `Pedido`, `Tentativa de pagamento`, `Reserva`, `Remessa`, `Direito digital` e `Solicitação de devolução` possuem ciclos de vida **diferentes**. Uma notificação do provedor não pode atualizar todos indiscriminadamente.

## Catálogo dos diagramas

| ID | Diagrama | Fonte editável | Visualização | Regras principais |
|---|---|---|---|---|
| UC-01 | [Casos de uso da loja e do cliente](use-cases/UC-01-loja-e-cliente.md) | [.dot](use-cases/UC-01-loja-e-cliente.dot) | [SVG](use-cases/UC-01-loja-e-cliente.svg) · [PNG](use-cases/UC-01-loja-e-cliente.png) | RN-001, RN-006, RN-009–015, RN-032–039, RN-049–053, RN-059 |
| UC-02 | [Casos de uso do backoffice e integrações](use-cases/UC-02-backoffice-e-integracoes.md) | [.dot](use-cases/UC-02-backoffice-e-integracoes.dot) | [SVG](use-cases/UC-02-backoffice-e-integracoes.svg) · [PNG](use-cases/UC-02-backoffice-e-integracoes.png) | RN-029, RN-039, RN-041–048, RN-059, RN-064–070 |
| PR-01 | [Processo de compra física](processes/PR-01-compra-fisica.md) | [.dot](processes/PR-01-compra-fisica.dot) | [SVG](processes/PR-01-compra-fisica.svg) · [PNG](processes/PR-01-compra-fisica.png) | RN-015–018, RN-023–028, RN-032–046, RN-055–057 |
| PR-02 | [Compra digital, física ou mista](processes/PR-02-compra-digital-e-mista.md) | [.dot](processes/PR-02-compra-digital-e-mista.dot) | [SVG](processes/PR-02-compra-digital-e-mista.svg) · [PNG](processes/PR-02-compra-digital-e-mista.png) | RN-002, RN-007–008, RN-024, RN-030, RN-038, RN-049–055, RN-063 |
| PR-03 | [Pós-venda, devolução e reembolso](processes/PR-03-pos-venda-e-reembolso.md) | [.dot](processes/PR-03-pos-venda-e-reembolso.dot) | [SVG](processes/PR-03-pos-venda-e-reembolso.svg) · [PNG](processes/PR-03-pos-venda-e-reembolso.png) | RN-047–048, RN-054, RN-058–063, RN-065 |
| SQ-01 | [Checkout idempotente com reserva](sequences/SQ-01-checkout-idempotente.md) | [.mmd](sequences/SQ-01-checkout-idempotente.mmd) | [SVG](sequences/SQ-01-checkout-idempotente.svg) · [PNG](sequences/SQ-01-checkout-idempotente.png) | RN-016–023, RN-025–028, RN-032–037 |
| SQ-02 | [Webhook idempotente e fulfillment](sequences/SQ-02-webhook-idempotente.md) | [.mmd](sequences/SQ-02-webhook-idempotente.mmd) | [SVG](sequences/SQ-02-webhook-idempotente.svg) · [PNG](sequences/SQ-02-webhook-idempotente.png) | RN-031, RN-041–050, RN-070 |
| SQ-03 | [Pagamento aprovado após expiração](sequences/SQ-03-pagamento-tardio.md) | [.mmd](sequences/SQ-03-pagamento-tardio.mmd) | [SVG](sequences/SQ-03-pagamento-tardio.svg) · [PNG](sequences/SQ-03-pagamento-tardio.png) | RN-027–028, RN-031, RN-043–046, RN-049 |
| SM-01 | [Estados do pedido](state-machines/SM-01-pedido.md) | [.dot](state-machines/SM-01-pedido.dot) | [SVG](state-machines/SM-01-pedido.svg) · [PNG](state-machines/SM-01-pedido.png) | RN-035–040, RN-046, RN-058, RN-062–063 |
| SM-02 | [Estados da tentativa de pagamento](state-machines/SM-02-tentativa-de-pagamento.md) | [.dot](state-machines/SM-02-tentativa-de-pagamento.dot) | [SVG](state-machines/SM-02-tentativa-de-pagamento.svg) · [PNG](state-machines/SM-02-tentativa-de-pagamento.png) | RN-041–048 |
| SM-03 | [Estados da reserva de estoque](state-machines/SM-03-reserva-de-estoque.md) | [.dot](state-machines/SM-03-reserva-de-estoque.dot) | [SVG](state-machines/SM-03-reserva-de-estoque.svg) · [PNG](state-machines/SM-03-reserva-de-estoque.png) | RN-024–031 |
| SM-04 | [Estados do direito digital](state-machines/SM-04-direito-de-acesso-digital.md) | [.dot](state-machines/SM-04-direito-de-acesso-digital.dot) | [SVG](state-machines/SM-04-direito-de-acesso-digital.svg) · [PNG](state-machines/SM-04-direito-de-acesso-digital.png) | RN-014, RN-049–054 |
| SM-05 | [Estados da remessa física](state-machines/SM-05-remessa-fisica.md) | [.dot](state-machines/SM-05-remessa-fisica.dot) | [SVG](state-machines/SM-05-remessa-fisica.svg) · [PNG](state-machines/SM-05-remessa-fisica.png) | RN-055–057, RN-061, RN-063 |
| SM-06 | [Estados da solicitação de devolução](state-machines/SM-06-solicitacao-de-devolucao.md) | [.dot](state-machines/SM-06-solicitacao-de-devolucao.dot) | [SVG](state-machines/SM-06-solicitacao-de-devolucao.svg) · [PNG](state-machines/SM-06-solicitacao-de-devolucao.png) | RN-059–063 |

### Diagramas BPMN 2.0 (modelos descritivos separados)

| ID | Processo | Modelo BPMN editável | Pré-visualização conceitual |
|---|---|---|---|
| BPMN-01 | Compra física | [Arquivo BPMN](bpmn/BPMN-01-compra-fisica.bpmn) | [PR-01](processes/PR-01-compra-fisica.md) |
| BPMN-02 | Tratamento pós-venda | [Arquivo BPMN](bpmn/BPMN-02-pos-venda.bpmn) | [PR-03](processes/PR-03-pos-venda-e-reembolso.md) |

Os arquivos `.bpmn` contêm **XML BPMN 2.0 e informações BPMN DI** para editores compatíveis. Os SVGs de PR-01 e PR-03 são **fluxogramas conceituais**, não exportações de um editor BPMN; não confundir as notações. Esses BPMNs não são automações executáveis.

## Rastreabilidade e revisão

Os identificadores `RN-XXX`, `RF-XXX` e `CA-XXX` referem-se à especificação v0.1. A matriz inicial para testes está em [MATRIZ-DE-RASTREABILIDADE.md](MATRIZ-DE-RASTREABILIDADE.md). Decisões abertas e pontos que exigem refinamento estão em [DECISOES-PENDENTES.md](DECISOES-PENDENTES.md).

### Critério de revisão desta etapa

- [x] Identificar os atores do cliente e da operação.
- [x] Desenhar fluxos de compra física, digital/mista e pós-venda.
- [x] Ilustrar checkout idempotente, webhook e pagamento tardio.
- [x] Separar estados de pedido, tentativa, reserva, entitlement, remessa e solicitação.
- [x] Gerar fontes editáveis, SVG e PNG independentes.
- [ ] Validar as decisões DA-004, DA-005, DA-006, DA-009 e DA-012 com as políticas escolhidas.
- [ ] Refinar transições e guardas com casos de aceitação negativos e concorrentes.
- [ ] Aprovar a versão e atualizar a rastreabilidade antes da implementação.

## Regeneração das imagens

Os diagramas de casos de uso, processos e estados têm como fonte os `.dot` e são exportáveis com **Graphviz**:

```powershell
# Dentro da raiz do repositório, com Graphviz instalado no PATH:
Get-ChildItem 'docs/03-business-processes' -Recurse -Filter '*.dot' | ForEach-Object {
    dot -Tsvg $_.FullName -o ([IO.Path]::ChangeExtension($_.FullName, '.svg'))
    dot -Tpng -Gdpi=130 $_.FullName -o ([IO.Path]::ChangeExtension($_.FullName, '.png'))
}
```

Para as sequências, os arquivos `.mmd` podem ser colados em blocos `mermaid` no GitHub ou abertos no [Mermaid Live Editor](https://mermaid.live/). Os SVG/PNG fornecidos foram renderizados a partir das mesmas etapas conceituais, mas não pelo CLI Mermaid; ao alterar um `.mmd`, regenere e revise sua visualização para evitar divergência. Editores BPMN 2.0, como Camunda Modeler, podem abrir os `.bpmn`.

## Limites da modelagem

1. As regras de negócio v0.1 são hipóteses de um projeto de portfólio, não requisitos aprovados de cliente real.
2. O processamento físico e digital é assíncrono conceitualmente; a estratégia exata de transações/outbox será decidida em arquitetura.
3. A política de aceitação de pagamentos tardios, reembolsos, expiração de reserva e direitos digitais está pendente de decisões de negócio.
4. As exportações visuais e XML foram verificadas estruturalmente, mas a abertura e edição em ferramentas externas específicas devem ser verificadas no ambiente local.
