# Registro de decisões e pendências — Fase 02 (v0.2)

> **Estado:** proposta de política do projeto, não homologação de integração nem aprovação de empresa real. Ver [políticas consolidadas](POLITICAS-CONSOLIDADAS.md).

| Referência | Decisão de modelagem proposta | Status | Dependência remanescente |
|---|---|---|---|
| DA-004 — kits | Unidade comercial indivisível; componentes fixos; reserva all-or-nothing; físicos juntos; direitos digitais por componente | Resolvida para MVP | Exceções legais e licenciamento |
| DA-005 / DA-012 — reserva | 40 min; sem extensão; checkout externo até 30 min e término ao menos 5 min antes | Proposta condicionada | Compatibilidade exata com PSP sandbox escolhido |
| DA-006 — PSP | Não selecionado | Aberta | Eventos, limites de sessão, tentativas e reembolso idempotente |
| DA-007 — frete | Simulador determinístico | Aberta em detalhe | Validade da cotação e bases de reembolso |
| DA-008 — leitura/download | Entitlement por item, acesso protegido | Parcial | Termos de licença e modo de distribuição |
| DA-009 — reembolso | Total/parcial para itens avulsos; kit integral padrão; saldo e concorrência; aprovação + comprovação independentes | Parcial | Alçadas e tratamentos jurídico-fiscais específicos |
| DA-010 — fiscal | Fora da integração real do MVP | Mantida | Revisar requisitos de operação real |
| DA-011 — cupom | Um por pedido, reservar e confirmar com checkout/pagamento | Aberta em detalhe | Reversões, múltiplas tentativas e cotação |
| RN-038 / RN-063 — mistos | Fulfillment por item; kit indivisível na venda, física junta | Parcial | Agregação dos estados da remessa |
| RN-041–047 — atraso | Pago sem reserva vigente -> `PAYMENT_REVIEW` + refund integral padrão, sem fulfillment | Resolvida para MVP | Mapeamento de resposta/incerteza do PSP |
| RN-049–054 — acesso | Misto: exige pagamento e alocação física completa; suspensão por decisão autorizada | Resolvida para MVP | Exceções jurídicas/licenciamento |
| RN-058–062 — arrependimento | Solicitação sempre registrável; não negar digitais automaticamente | Parcial | Revisão legal em operação real |

## Critérios para aprovar a política v0.2

- [x] Proposta de regras, transições, concorrência e critérios de aceitação documentada.
- [x] Invariantes explícitas de estoque, cobranças, refund e kits.
- [ ] Confirmar se o PSP escolhido permite expirar sessão externa antes da reserva.
- [ ] Mapear taxonomia real de eventos, assinaturas, retries e estados do PSP.
- [ ] Revisar normas e alçadas de pós-venda antes de qualquer operação real.
- [ ] Aprovar a política parametrizada e atualizar BRD principal.
- [ ] Implementar e executar cenários CA-011–CA-026.

Sem autorização para remover unilateralmente direitos do consumidor ou colocar pagamentos reais em operação.
