# Registro de decisões e pendências — Fase 02 (v0.3: integração de segurança)

> **Estado:** proposta para portfólio; não homologação de PSP, não aprovação jurídica. Referências: [políticas](POLITICAS-CONSOLIDADAS.md), [segurança](../07-security/security-requirements.md) e [índice](../README.md).

| Referência | Decisão de modelagem proposta | Status | Dependência remanescente |
|---|---|---|---|
| DA-004 — kits | Unidade comercial indivisível; componentes fixos; reserva all-or-nothing; físicos juntos; direitos digitais por componente | Resolvida como proposta MVP | Exceções legais e licenciamento; SEC-017/018/025 |
| DA-005 / DA-012 — reserva | 40 min; sem extensão; checkout externo até 30 min e término ao menos 5 min antes | Proposta condicionada | DA-006/DS-004; validar capacidade do PSP |
| DA-006 — PSP | Não selecionado | Aberta | Eventos, limites da sessão, assinatura, webhook, refund, PCI; SEC-020/023 |
| DA-007 — frete | Simulador determinístico | Aberta em detalhe | Validade da cotação e bases de refund |
| DA-008 — leitura/download | Entitlement por item, acesso protegido | Parcial | Licenças, DS-005/006, SEC-025–027 |
| DA-009 — reembolso | Total/parcial avulso; kit integral padrão; saldo e concorrência; aprovação e comprovação distintas | Parcial | Alçadas DS-003, regras jurídico-fiscais e SEC-022 |
| DA-010 — fiscal | Fora da integração real do MVP | Mantida | Revisão antes de operação comercial real |
| DA-011 — cupom | Um por pedido, reservar/confirmar com checkout/pagamento | Aberta em detalhe | Reversões, múltiplas tentativas e cotação |
| RN-038 / RN-063 — mistos | Fulfillment por item; kit indivisível na venda; físicos juntos | Parcial | Agregação de estados da remessa e SEC-025 |
| RN-041–047 / RN-077–080 — atraso | Pago sem reserva vigente -> `PAYMENT_REVIEW` + refund integral padrão, sem fulfillment | Resolvida como proposta MVP | Mapear eventos reais PSP; DA-006/DS-004 |
| RN-049–054 / RN-091 — acesso | Misto exige pagamento + alocação física completa; suspensão por decisão autorizada | Resolvida como proposta MVP | Exceções jurídicas/licenciamento e DS-005 |
| RN-058–062 / RN-085–087 — arrependimento | Solicitação sempre registrável; nunca negar digitais automaticamente | Parcial | Revisão legal para operação real |
| DA-016 / DS-001/002 | Sessões, refresh, MFA privilegiado | Aberta | Arquitetura de autenticação, recuperação e testes SA-003/004 |
| DA-017 / DS-003 | Matriz de autorização, segregação financeira | Aberta | Operações por recurso, alçadas e testes SA-001/002/008 |
| DA-018 / DS-004 | Assinatura, eventos, replay e idempotência PSP | Aberta | Escolha do provedor; compatibilidade da política de TTL |
| DA-019 / DS-005/006 | Storage de conteúdo digital e uploads | Aberta | Risco de URL temporária, mídia privada e parser |
| DA-020 / DS-008 | CI, TLS, secrets, backups e observabilidade | Aberta | Ambiente do deploy e evidências SA-011/012 |
| DA-021 / DS-009 | Escopo de verificação OWASP ASVS | Aberta | Perfil de requisitos e mapeamento de casos |

## Critérios para aprovação documental

- [x] Propostas de regras, transições, concorrência e CA-011–026 documentadas.
- [x] Mapa SEC/SA, domínios, cenários e decisões DS acrescentado.
- [ ] Confirmar que o PSP escolhido admite expiração externa compatível e refund idempotente.
- [ ] Mapear eventos, assinatura, retries, conciliação e estados reais do PSP.
- [ ] Resolver controles DS-001–009 relevantes e modelar DFDs/trust boundaries.
- [ ] Atualizar SQ-05 e exportações (Pagamentos como autoridade da quitação); revisar BPMN-01/02.
- [ ] Validar alçadas, retenção, licença e obrigações jurídicas antes de operação real.
- [ ] Aprovar política, matrizes e requisitos condicionados em ADR/registro.
- [ ] Implementar e executar CA-011–026 e SA-001–012; guardar evidências reproduzíveis.

**Não** tratar um checkbox documental como conformidade ou prova de operação segura.
