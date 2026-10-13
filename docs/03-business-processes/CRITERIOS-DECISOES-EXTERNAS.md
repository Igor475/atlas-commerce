# Critérios de decisão — PSP, alçadas financeiras e licenças digitais

> **ID:** AC-MODEL-DEC-003 | **Versão:** 0.2 | **Estado:** Stripe selecionado, integração não homologada | **Data:** 12/10/2026.  
> Este documento registra a **seleção do Stripe para DA-006**, mas **não comprova DS-004**, validação do sandbox, alçadas financeiras nem licenciamento jurídico de produtos digitais.

> **Atualização de apresentação — 13/10/2026:** o [adendo ADR-004](../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md) substitui hosted inicial por Checkout incorporado na página Atlas. As referências hosted abaixo registram a seleção de 12/10/2026 e são **histórico de apresentação**, não o fluxo ativo. Onde o registro dizia não expor link incompatível, o componente agora não recebe client secret nem é montado. Stripe/BRL/Test Mode, cartão inicial, 40/30/5, autoridades, segregação e critérios de prova permanecem iguais; integração não homologada.

## A. DA-006 / DS-004 — Stripe escolhido; integração pendente de validação

**Fornecedor decidido:** **Stripe**, com **Stripe Checkout hospedado (`payment` / compras únicas)** como escolha arquitetural inicial para o MVP demonstrativo. Inicialmente, usar **modo de teste** e restringir meios aos **comprovadamente compatíveis**, com cartão como candidato prioritário; Pix/boleto/assíncronos não entram automaticamente. A documentação oficial define `expires_at` de **30 minutos a 24 horas** após criar a sessão. A seleção do fornecedor é definitiva para este planejamento; capacidades reais, configuração e comportamento da integração **ainda exigem validação**. A conta Stripe, seu país e os meios habilitados serão conferidos no sandbox.

**Política de negócio mantida:** reserva `40m` a partir do relógio do banco; sessão externa com prazo máximo `30m` desde sua criação; limite externo de expiração **pelo menos 5m antes** de `reservation.expires_at`. Como a Stripe impõe duração **mínima de 30m**, a sessão deve ser criada **no máximo 5m após a criação da reserva** (na prática, antes disso para comportar latência e relógios). Comparar prazos absolutos e rejeitar qualquer sessão incompatível **sem expor o link**. Se uma sessão incompatível já existir externamente, registrar a tentativa, solicitar expiração quando ainda estiver `open` e reconciliar seu estado; jamais presumir ausência de cobrança por resposta ambígua.

| Prova exigida para fechar a DA | Aceite objetivo | Situação |
|---|---|---|
| Expiração absoluta | `stripe_expires_at <= reservation_expires_at - 5 min`; `1800s <= stripe_expires_at - stripe_created_at <= 1800s` sob política MVP (sessão exatamente 30 min); testar atrasos de 0/4/5/6 min, limites e timeout | PENDENTE |
| Capacidade Stripe | Sessão hospedada em `mode=payment`, `expires_at` verificado na resposta, `cs_`, `pi_`, valor/moeda BRL centavos e IDs próprios persistidos | PENDENTE |
| Métodos aceitos | Permitir somente métodos de confirmação compatível (ex.: cartão em test mode); Pix/boleto e pagamentos assincrônicos não habilitados até política própria | PENDENTE |
| Autenticidade e idempotência | Assinatura no payload original, valor/moeda/IDs, replay, retries idempotentes, eventos fora de ordem | PENDENTE |
| Refund | Idempotência estável com consulta de estado após timeout; não presumir sucesso com `HTTP 2xx` | PENDENTE |
| Segurança e PCI | Checkout hospedado sem PAN/CVV no Atlas, escopo PCI revisado para arquitetura concreta | PENDENTE |

**Alternativa permitida:** provedor fake determinístico local para testes de concorrência, sem apresentar como substituto de homologação de PSP real.

**Critério de bloqueio:** Stripe está selecionado, mas sem evidência em modo de teste **não** considerar autorizada a integração produtiva nem validada a política 40/30/5. Os fluxos podem ser documentados; Código de integração só segue os gates aprovados em [Fase 03](../04-architecture/07-validacao-stripe.md).

Fontes públicas: [Checkout Session `expires_at`](https://docs.stripe.com/api/checkout/sessions/create), [Refunds](https://docs.stripe.com/api/refunds/create), [Idempotência](https://docs.stripe.com/api/idempotent_requests), [Webhooks](https://docs.stripe.com/webhooks).

## B. DA-009 / DS-003 — Operações financeiras e alçadas (pendência 3.2)

**Matriz proposta para portfólio, sujeita à validação:**

| Ação | Cliente / atendimento | Operador financeiro | Gestor financeiro | Serviço técnico autorizado |
|---|---|---|---|---|
| Abrir solicitação | Cliente abre a própria; atendimento registra conforme permissão | Sim | Sim | Não |
| Consultar status próprio / operacional | Cliente: próprio pedido; atendimento: mínimo necessário | Sob permissão | Sob permissão | Somente integração |
| Aprovar reembolso manual | Não | Solicita, mas **não autoaprova** | Aprova com identidade distinta do solicitante e MFA | Não |
| Executar refund manual | Não | Após aprovação e reserva financeira | Mediante fluxo aprovado | Worker com credencial restrita executa comando persistido |
| Compensação RN-078 | Não | Acompanha exceção | Revisa exceção | Automática, **somente por regra idempotente**, com auditoria |
| Cancelar/reverter refund pendente | Não | Solicitação de revisão | Apenas se o PSP permitir e com trilha | Concilia; não inventa reversão |

**Baseline proposto:** toda devolução manual exige segregação entre solicitante/aprovador (não necessariamente dois cargos diferentes em empresa real), alçada configurável e MFA privilegiado. O valor-limite numérico **não será inventado**: definir após casos de uso e volume. O MVP de demonstração pode trabalhar com duas contas funcionais distintas e cenários SA-002 e SA-008. Ações automáticas `RN-078` **não bypassam validação financeira**: têm permissão técnica específica, auditoria e critérios rígidos.

Invariantes: `captured - succeeded_refunds - reserved_pending_refunds >= amount_requested`; lock/constraint na mesma captura; status incerto não solta saldo; a decisão humana não prova sucesso externo; estoque só sobe após retorno e inspeção.

## C. Licenças, prévias e direito do consumidor (pendência 3.3)

**Decisão de demonstração proposta:** publicar **apenas conteúdos próprios, fictícios ou expressamente licenciados** para catálogo, prévias e arquivos completos. Ativos sem comprovação não são publicáveis. O Atlas não adquire direitos por simplesmente hospedar uma cópia do PDF ou e-book.

| Campo do contrato de licença | O que especificar por obra/edição |
|---|---|
| Titular e prova | Titular dos direitos ou autorização; identificador e localização segura da evidência |
| Usos permitidos | Exibição de capa, prévia, download ou leitura, território e prazo |
| Tipo de entitlement | Direito de acesso por conta/item, vigência e restrições do contrato |
| Expiração/revogação | Condições explícitas e fundamentadas; não revogar automaticamente por solicitação de devolução |
| Cópia de amostra | Artefato diferente do arquivo completo, com permissão específica e proteção de origem |
| Atendimento e arrependimento | Receber todas as solicitações, inclusive digitais; respeitar a lei aplicável com avaliação especializada |
| Retenção de prova | Definir duração e sigilo conforme direitos e obrigações legais |

**Bloqueio de release comercial real:** revisão jurídica de termos/licenças, direito de arrependimento, privacidade/LGPD e obrigações fiscais. Este arquivo **não constitui parecer jurídico** nem define exceção legal universal para produtos digitais.

## D. Checklist de saída para Fase 03

- [x] Selecionar fornecedor Stripe e Checkout hospedado como direção do MVP demonstrativo, sem alegar homologação.
- [x] Propor regras-base de segregação financeira e acesso digital de demonstração.
- [x] Atualizar SQ-05 e BPMNs com autoridades, compensações e estados distintos.
- [ ] Testar integração de PSP e política 40/30/5 em sandbox; registrar evidências.
- [ ] Aprovar matriz de autorização e alçadas em ADR; validar implementação com SA-002/008.
- [ ] Documentar licenças e direitos de cada conteúdo publicável; verificar exigências legais antes da venda real.
- [ ] Validar BPMN editável em modelador externo e diagramas de segurança DFD/STRIDE.
