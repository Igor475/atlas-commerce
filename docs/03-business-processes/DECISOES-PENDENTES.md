# Registro de decisões e pendências — Fase 02 (v0.5: seleção Stripe)

> **Estado:** proposta de portfólio — sem homologação de PSP, alçadas de produção ou aprovação jurídica.  
> Consulte [políticas](POLITICAS-CONSOLIDADAS.md), [segurança](../07-security/security-requirements.md) e [critérios de decisão](CRITERIOS-DECISOES-EXTERNAS.md).

| Referência | Decisão de modelagem proposta | Status | Dependência remanescente |
|---|---|---|---|
| DA-004 — kits | Unidade comercial indivisível; composição imutável, reserva all-or-nothing e físicos juntos; digital por componente | Resolvida como política proposta MVP | Licenças/exceções legais; SEC-017/018/025 |
| DA-005 / DA-012 — reserva | 40 min pelo banco, sessão externa até 30 min, encerrada pelo menos 5 min antes da reserva | Proposta condicionada | Stripe Checkout exige expiração mínima de 30 min; validar criação até 5 min após reserva com margem operacional e resposta tardia; DS-004 |
| DA-006 — PSP | **Stripe escolhido pelo projeto**; Stripe Checkout hospedado em modo de teste é a integração-alvo, sem homologação técnica | Fornecedor definido; integração condicionada | Testar sessão 30 min mínimo, janela absoluta 40/30/5, cartões/métodos elegíveis, eventos, assinatura, refunds e idempotência; SEC-020/023 |
| DA-007 — frete | Simulador determinístico | Aberta em detalhe | Validade da cotação e ajuste de refund |
| DA-008 — leitura/download | Entitlement por item e titular; demonstração apenas com conteúdo próprio/autorizado | Parcial | Licença por obra/edição, prévia, duração, revogação e DS-005/006 |
| DA-009 — reembolso | Total/parcial avulso; kit integral padrão; saldo reservado e reembolso provado no PSP | Parcial | Matriz de alçadas em proposta DS-003; revisão jurídico-fiscal |
| DA-010 — fiscal | Emissão fiscal real fora do MVP | Mantida | Revisão antes de operação comercial |
| DA-011 — cupom | Um por pedido e consistência com reserva/pagamento | Aberta em detalhe | Reversão e concorrência de múltiplas tentativas |
| RN-038 / RN-063 — mistos | Fulfillment por item; kit indivisível comercialmente e físicos expedidos juntos | Parcial | Agregação de estados/logística; SEC-025 |
| RN-041–047 / RN-077–080 — atraso | Pago sem reserva → `PAYMENT_REVIEW`, bloqueio + refund integral idempotente | Resolvida como proposta MVP | Mapear eventos do PSP; DA-006/DS-004 |
| RN-049–054 / RN-091 — acesso | Kit misto: pagamento + alocação física completa antes do direito digital | Resolvida como proposta MVP | Licenças e DS-005; exceções jurídicas |
| RN-058–062 / RN-085–087 — arrependimento | Solicitações inclusive digitais são recebidas e avaliadas, sem indeferimento automático | Parcial | Revisão legal aplicável |
| DA-016 / DS-001/002 | Sessões, refresh e MFA de backoffice | Aberta | Arquitetura de autenticação e testes SA-003/004 |
| DA-017 / DS-003 | Proposta: solicitante de refund manual diferente do aprovador, MFA e permissão granular | Aberta para ADR | Matriz autorizativa, alçadas e testes SA-001/002/008 |
| DA-018 / DS-004 | Stripe selecionado; integração com webhook validado, replay, refund idempotente e políticas temporais | Aberta para prova técnica | Spike Stripe test mode e evidências em [plano](../04-architecture/07-validacao-stripe.md) |
| DA-019 / DS-005/006 | Privacidade de mídia, storage e uploads | Aberta | Controle de downloads, parser e licença |
| DA-020 / DS-008 | CI, TLS, secrets, restore e monitoramento | Aberta | Infraestrutura real e evidências |
| DA-021 / DS-009 | Perfil OWASP ASVS verificável | Aberta | Mapear requisitos aos testes aplicáveis |

## Correções de modelagem (sem implementar)

- [x] SQ-05: a confirmação externa passa por Pagamentos, com validação e deduplicação antes de liberar direitos/entrega; `.mmd`, `.md`, `.svg` e `.png` atualizados.
- [x] BPMN-01/02: modelos conceituais refeitos com fluxos de resultado financeiro, compensação, direito de arrependimento, refund ambíguo e inspeção física; fonte BPMN DI e prévias novas.
- [ ] Validar BPMN 2.0 no modelador externo escolhido; XML local foi analisado estruturalmente, não executado.
- [x] Selecionar fornecedor: Stripe.
- [ ] Validar Stripe Checkout em modo de teste, incluindo expiração absoluta 40/30/5, métodos elegíveis, assinatura de webhooks e refunds; fornecedor escolhido não é homologação.
- [ ] Aprovar matriz financeira e rever obrigações jurídicas/licenças para comércio real.
- [ ] Implementar e executar CA-011–026 e SA-001–012 com evidências.

**Os números de regras RN/SEC/SA não foram modificados.** Não confundir proposta de decisão com homologação ou teste concluído.
