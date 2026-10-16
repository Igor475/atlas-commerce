# COM-01 — Prontidão comercial para ratificação

**16/10/2026 · PROPOSTO PARA RATIFICAÇÃO · somente documentação e análise.**

Baseline inspecionado: `main`, `79aa79aabaad68aae97483fd6a1baf0b5aea92b1`, árvore limpa antes desta entrega. [Quality 38939037263](https://github.com/Igor475/atlas-commerce/actions/runs/38939037263) confirmado `completed/success` para esse SHA: os 13 jobs passaram. Isso comprova os gates executados naquele commit, não homologação comercial, Supabase, Stripe ou o novo pacote COM.

Os 451 cenários PostgreSQL e 79 testes unitários registrados em [QUSE-06](../quote-consumption/QUSE-06-handoff-e-pendencias.md) são evidência local histórica preservada. Não foram repetidos nesta entrega. MRD e L0 não possuem jobs dedicados nessa execução remota; não se atribui a ela a prova local dessas suítes. As 32 falhas históricas CRLF ficam separadas, sem correção fora de escopo.

## Leitura e decisões

| Documento                                           | Conteúdo                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| [COM-01](COM-01-matriz-de-prontidao.md)             | Estado de 14 componentes, evidências, bloqueios e divergências históricas |
| [COM-02](COM-02-parametros-frete-candidatos.md)     | Três tabelas concretas DEMO; recomendação B ainda não ratificada          |
| [COM-03](COM-03-enderecos-e-privacidade.md)         | Modelo brasileiro candidato, quatro operações propostas e retenção        |
| [COM-04](COM-04-quote-result-e-contratos.md)        | Delta OpenAPI candidato formal, HTTP e casos futuros                      |
| [COM-05](COM-05-checkout-e-idempotencia.md)         | Transição QUSE para checkout comercial; migração, replay e recuperação    |
| [COM-06](COM-06-stripe-embedded-plano-de-provas.md) | Fontes atuais Stripe, dupla SDK/API candidata e provas 40/30/5            |
| [COM-07](COM-07-decisoes-e-roadmap.md)              | Decisões humanas e sequência com gates de entrada/saída                   |

**RATIFICADO** identifica decisão expressa existente; **PROPOSTO** identifica recomendação nova; **PENDENTE** exige decisão ou prova; **BLOQUEADO** impede a ativação indicada. Implementado, testado localmente e aprovado em CI são dimensões separadas. Nenhuma proposta COM autoriza código ou operação remota.

Permanecem ratificados o modelo de entrega, Profile/versionamento, TTL de quote de dez minutos, consumo único e Estratégia A de [ADR-012](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md), além do campo [UXD-16](../contracts/UXD-16-RATIFICACAO-RESPONSAVEL.md). Valores de frete, enums novos, DTOs detalhados, privacidade, compatibilidade Stripe e ativação pública continuam sujeitos aos gates descritos aqui.

## Fontes e precedência

- Negócio: [RN-001–070](../../02-business-requirements/REGRAS-DE-NEGOCIO.md), [adendo RN-071–094](../../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md), [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md).
- Arquitetura: [ADR-002](../../04-architecture/adrs/ADR-002-integridade-outbox.md), [ADR-003](../../04-architecture/adrs/ADR-003-autenticacao-sessoes.md), [ADR-004](../../04-architecture/adrs/ADR-004-psp-sandbox.md), [adendo embedded](../../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md), [ADR-006](../../04-architecture/adrs/ADR-006-acesso-dados.md), [DB-01–05](../../04-architecture/database/DB-01-modelo-logico.md).
- Políticas: [QTE-POL-01–06](../quotes/QTE-POL-05-fluxo-e-matriz-de-decisoes.md); implementação e limites nos índices [CP](../customer-profile/README.md), [CPINT](../customer-profile-integration/README.md), [SHIP](../shipping/README.md), [QUSE](../quote-consumption/README.md), [QTE](../quotes/README.md), [ORD](../orders/README.md), [INV](../inventory/README.md), [PRIC](../pricing/README.md) e [CAT](../catalog/README.md).
- Contratos: [CT-01–10](../contracts/README.md), [OpenAPI ativo](../contracts/openapi/atlas-commerce-api-v1.yaml), [Identity](../contracts/CT-ID-01-identity-customer.md), [SEC](../../07-security/security-requirements.md), [DS-003](../../04-architecture/security/authorization-matrix.md).
- Design: [FD-03](../fd03/README.md), [FD-05 planejada](../fd05/FD-05-00-plano-de-mockups.md), [nove referências prioritárias](../FD-02-referencias-visuais-usuario.md). Preservados P01–P50/A01–A14, direção A e originais; nenhuma identidade final, URL ou tela aprovada por COM.
- Fontes externas oficiais consultadas em **16/10/2026**: links específicos em COM-02/03/06. Documentação pública foi lida; nenhuma credencial, conta de cliente ou API de provedor foi utilizada.

Decisões expressas posteriores prevalecem sobre marcadores históricos anteriores, dentro de seu escopo. Normas não são reescritas para acomodar propostas. Código e testes mostram capacidade local; não ratificam políticas nem demonstram configuração remota. Conflitos de alcance são registrados em COM-01, preservando os documentos originais.

## Limite da entrega

O OpenAPI candidato existe somente no bloco documental de COM-04. O YAML ativo, código, CI, SQL/migrations, FD-03/05, imagens e normas permanecem intactos. Sem implementação, conexões remotas, commit, push ou deploy. L1_SQL_STRICT permanece **PENDENTE**; MRD não o substitui; Stripe e 40/30/5 permanecem **NÃO HOMOLOGADOS**. A conformidade LGPD não está concluída.
