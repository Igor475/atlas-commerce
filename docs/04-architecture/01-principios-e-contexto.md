# 01 — Princípios e contexto arquitetural

**Status:** proposta • Referências: RNF-001–012, RN-001–094, SEC-001–038.

## Restrições verificadas do produto

- B2C editorial; um vendedor/empresa. Sem multi-tenant, marketplace, venda internacional ou cobrança real no MVP.
- Produtos físicos, e-books, revistas digitais, kits simples físicos/digitais/mistos. Estoque físico em depósito lógico único, kits com composição imutável no snapshot.
- Preço, frete e cupons calculados no servidor; BRL em centavos; compra e pagamentos sandbox; comprovantes verdadeiros do PSP apenas em modo teste.
- Prévia pública distinta do conteúdo integral privado; entitlement por titular/item/licença; direitos digitais de kit misto dependem de pagamento e **toda** alocação física confirmada.
- Provedor de pagamento ainda não homologado. Candidato Stripe Checkout sandbox requer teste de janela absoluta e autenticidade de eventos.

## Princípios de desenho

1. **Monólito modular com fronteiras verificáveis.** Uma API deployável inicialmente, módulos separados por responsabilidade. Não confundir diretório `modules` com isolamento efetivo.
2. **Uma fonte de verdade transacional:** PostgreSQL para pedidos, reservas, saldo comprometido, estados financeiros, outbox, sessões quando aplicável. Redis/fila nunca é fonte definitiva de pagamento, estoque, idempotência ou autorização.
3. **Consistência local; coordenação distribuída recuperável:** efeitos externos fora das transações. Idempotência + outbox + reconciliação explícita antes de considerar sucesso.
4. **Autorização server-side e least privilege:** cliente não define preço, papel, escopo, saldo, transição nem direito digital. Browser/UI apenas orienta a experiência.
5. **Correção e evidência acima da sofisticação:** escolher worker, ORM, service mesh, WAF e provedores por necessidade mensurável, não por currículo.
6. **Segurança desde a modelagem:** casos de abuso, trust boundaries, dados privados e condições de falha, com risco residual e testes identificáveis.
7. **Operação proporcional:** health, logs redigidos, backups/restore, métricas por resultado, deploy auditável; RPO/RTO e SLO numéricos ainda não inventados.
8. **Acessibilidade:** projeto frontend deve trabalhar para WCAG 2.2 AA com verificação manual e automatizada; não é um status aprovado.

## Qualidades a medir (sem alegar resultado)

| Atributo | Plano de medição/validação | Origens |
|---|---|---|
| Integridade | Testes PostgreSQL real: último SKU, reserva x expiração, cupom, refund concorrente | RNF-002, CA-001, 007, 008, 011–026 |
| Segurança | Testes de BOLA, MFA privilegiado, recuperação, webhook inválido, mídia privada, uploads e logs | SEC-001–038, SA-001–012 |
| Resiliência | Simular perda de conexão/timeout PSP, retry fora de ordem, consumer duplicado e restarts | RNF-003, RN-070 |
| Performance | Baseline p50/p95/p99 para busca, checkout, biblioteca, com ambiente e dados definidos | RNF-006 |
| Acessibilidade | Navegação com teclado, foco, zoom, leitores de tela e checklist WCAG | RNF-009 |
| Operação | Exercício de backup/restore, verificação de alarmes/health e incidentes | RNF-010, SEC-035/036 |

## O que não é escolhido por este documento

Não fixa provedor de hospedagem, detalhes físicos de cache e fila, frequência de jobs, cloud pública, valores de alçadas, ORM, método final de autenticação nem endereços de API. Questões constam de [ADRs](adrs/README.md). A arquitetura proposta é o **baseline inicial**, não uma autorização para alterar contratos existentes.
