# Critérios de decisão — PSP, alçadas financeiras e licenças digitais

> **ID:** AC-MODEL-DEC-003 | **Versão:** 0.1 | **Estado:** proposta para aprovação da Fase 03 | **Data:** 12/10/2026.  
> Este documento **não fecha automaticamente** DA-006, DA-009, DS-003/004 nem a validação jurídica de produtos digitais.

## A. DA-006 / DS-004 — Provedor de pagamentos (pendência 3.1)

**Candidato ao spike:** Stripe Checkout em modo teste/sandbox, somente para meios compatíveis com liquidação e expiração da reserva do MVP. Documentação oficial de `expires_at` informa intervalo entre **30 minutos e 24 horas** após a criação da sessão. Isso sugere viabilidade para sessão de 30 minutos, mas **não prova** compatibilidade no ambiente do projeto, nem com todos os métodos de pagamento.

**Política de negócio mantida:** reserva `40m` a partir do relógio do banco; sessão externa com prazo máximo `30m` desde sua criação; limite de expiração externo **pelo menos 5m antes** de `reservation.expires_at`. A simples configuração de 30m é insuficiente se a sessão for criada **mais de 5m depois** do pedido. É obrigatório computar os dois prazos absolutos e rejeitar sessão incompatível sem expor URL de pagamento.

| Prova exigida para fechar a DA | Aceite objetivo | Situação |
|---|---|---|
| Expiração absoluta | `psp_expires_at <= reservation_expires_at - 5 min` e `psp_expires_at <= session_created_at + 30 min` em teste com atraso artificial de criação | PENDENTE |
| Capacidade do provedor | `expires_at` configurável em sandbox e identificadores persistidos | PENDENTE |
| Métodos aceitos | Permitir somente métodos de confirmação compatível (ex.: cartão em test mode); Pix/boleto e pagamentos assincrônicos não habilitados até política própria | PENDENTE |
| Autenticidade e idempotência | Assinatura no payload original, valor/moeda/IDs, replay, retries idempotentes, eventos fora de ordem | PENDENTE |
| Refund | Idempotência estável com consulta de estado após timeout; não presumir sucesso com `HTTP 2xx` | PENDENTE |
| Segurança e PCI | Checkout hospedado sem PAN/CVV no Atlas, escopo PCI revisado para arquitetura concreta | PENDENTE |

**Alternativa permitida:** provedor fake determinístico local para testes de concorrência, sem apresentar como substituto de homologação de PSP real.

**Critério de bloqueio:** enquanto a seleção não estiver validada, APIs e diagramas podem ser modelados, mas a integração concreta de produção e parâmetros de TTL não podem ser tratados como aprovados.

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

- [x] Definir candidato de PSP para spike sem declarar homologação.
- [x] Propor regras-base de segregação financeira e acesso digital de demonstração.
- [x] Atualizar SQ-05 e BPMNs com autoridades, compensações e estados distintos.
- [ ] Testar integração de PSP e política 40/30/5 em sandbox; registrar evidências.
- [ ] Aprovar matriz de autorização e alçadas em ADR; validar implementação com SA-002/008.
- [ ] Documentar licenças e direitos de cada conteúdo publicável; verificar exigências legais antes da venda real.
- [ ] Validar BPMN editável em modelador externo e diagramas de segurança DFD/STRIDE.
