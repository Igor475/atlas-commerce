# ADR-012 — Políticas de cotação, entrega e endereços (ADR-QTE)

**Status: RATIFICADO DOCUMENTALMENTE pelo responsável em 15/10/2026, nos limites
abaixo.** Sem autorização de implementação, publicação, DDL ou integração remota.

## Contexto e evidência da decisão

O responsável aprovou expressamente as recomendações QTE-02, incluindo a
**Estratégia A de QTE-DEC-006**, no pedido ADR-QTE recebido em 15/10/2026.
Esse pedido é a fonte da ratificação; a existência de uma proposta ou fixture
anterior não constitui aprovação. Este registro consolida a decisão recebida e
preserva as alternativas históricas nos [cinco QTE-POL](../../05-engineering/quotes/QTE-POL-05-fluxo-e-matriz-de-decisoes.md).

Baseline inspecionado: `main`, `6f2fc6f006205d9c226dc91585ad7ba466c3f67a`, árvore
inicialmente limpa. O [CI 38797825380](https://github.com/Igor475/atlas-commerce/actions/runs/38797825380)
foi consultado: completed/success para esse SHA. Não comprova este novo delta
documental nem checkout comercial. QTE-01/ORD-01 continuam fundações TEST_ONLY.

## Decisões expressamente ratificadas

| Decisão     | Conteúdo ratificado em 15/10/2026                                                                                                                                                                                                                                               | Limite / pendência                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| QTE-DEC-002 | Simulador determinístico, tarifa fixa por zona de destino, uma única opção elegível por zona no MVP, cobrança por pedido com físicos; digital puro sem entrega física                                                                                                           | Valores, zonas concretas, cobertura, prazos, embalagem e calendário não aprovados                                                  |
| QTE-DEC-003 | Customer Profile no monólito modular, separado de credenciais/sessões Identity; identidade/estado de conta por fronteira confiável; Quotes/Orders por ports autorizados; múltiplos endereços e versionamento; snapshot histórico imutável                                       | Campos definitivos, fonte postal, retenção e desenho físico ainda por decidir                                                      |
| QTE-DEC-004 | Quote comercial válida por 10 minutos no relógio PostgreSQL; cotação não reserva; expiração exige nova quote, sem renovação silenciosa; preço/publicação/composição/endereço/entrega revalidados                                                                                | Não altera reserva de 40 minutos ou política Stripe; parâmetros técnicos não viram defaults comerciais implementados               |
| QTE-DEC-005 | Uma quote comercial vinculável a uma única intenção comercial; retries idempotentes por ator/operação/chave e fingerprint canônico; duas chaves não produzem duas compras independentes da mesma quote; recuperar estado persistido em falha ambígua                            | Quote e Order permanecem entidades distintas; unicidade comercial ainda não implementada na fundação local                         |
| QTE-DEC-006 | Estratégia A: entrada QuoteRequest mínima preservada salvo incompatibilidade demonstrada; resultado com subtotal e entrega estruturada; digital com entrega inaplicável; aceite do quoteId vinculado às condições apresentadas/persistidas; sem endpoint separado de descoberta | Múltiplas opções exigem nova aprovação; estimate/dayBasis/startsAtEvent, enums, prazos e versões contratuais não estão homologados |
| QTE-DEC-010 | Minimização, segregação por finalidade, titularidade, retenção fundamentada e preservação de rastreabilidade/snapshots sem exposição desnecessária de PII                                                                                                                       | Prazos legais/operacionais e mecanismos de retenção/descarte requerem revisão específica; não foram inventados                     |

QTE-DEC-001 (DA-007) e QTE-DEC-007 (UXD-16) preservam suas ratificações anteriores,
sem expansão de escopo. QTE-DEC-008/009 permanecem **BLOQUEADOS** para habilitação
comercial/homologação. Aprovação de políticas não prova segurança operacional.

## Consequências e invariantes preservadas

- BRL, inteiros em centavos e cálculo pelo servidor; nenhum total/frete do browser
  é autoridade. Físico: `subtotal.amountCents + delivery.amount.amountCents = total.amountCents`;
  digital: `delivery = null` e `total = subtotal`, sem promoção de frete grátis.
- Endereço/quote vinculados ao titular; IDs isolados não autorizam. Identidade
  real, estado da conta, CSRF/Origin e cookies precisam de suas provas próprias.
- Revalidar depois dos locks, preservar snapshots e recuperar a mesma intenção
  após timeout ambíguo. Faltar preço, política ou endereço físico exige falha segura.
- Carrinho/cotação não reservam. Preparação Orders, reserva Inventory, snapshots
  e fato recuperável permanecem na mesma transação PostgreSQL, sem commits parciais.
  Stripe só depois do commit, com evidência autenticada para confirmação financeira.
- Kit físico junto, reserva all-or-nothing; kit misto não libera entitlement sem
  quitação e alocação física íntegra. Não alterar PC-01–04 ou estados comerciais.
- UXD-16 permanece campo obrigatório, timestamp UTC/RFC3339 real em físico/misto,
  null em digital. Stripe Embedded Test Mode preservado; API/SDK/ui_mode e
  40/30/5 **NÃO HOMOLOGADOS**. L1_SQL_STRICT **PENDENTE**, sem bypass.

Comparações de fixa/atributos/híbrido/provedor, TTL 5/10/15 e HTTP A/B/C continuam
rastreáveis nos QTE-POL. As alternativas não escolhidas não são autorização
para implementação futura. A fórmula híbrida, os pesos/tarifas/prazos e os atores
da fixture TEST_ONLY permanecem apenas evidência técnica local.

## Parâmetros e decisões ainda pendentes

1. Tabela de zonas e seus limites/cobertura; tarifas em centavos, rótulo/identificador
   da única opção, vigência/versionamento e processo autorizado de manutenção.
2. Transportabilidade, peso/dimensões se necessários à elegibilidade, embalagem
   de kits/avulsos, limites do pedido e condições de indisponibilidade.
3. Prazos mínimo/máximo, dias úteis/corridos, marco inicial, calendário/feriados,
   conteúdo da estimativa simulada e tratamento de atraso. Nenhum número presumido.
4. Campos/limites/completude do endereço, normalização e fonte CEP/município/UF,
   endereços especiais e regras de alteração/exclusão/versionamento.
5. Finalidades/bases de tratamento concretas, retenção por cadastro/quote/pedido/
   auditoria, acesso operacional, anonimização/descarte e recuperação de evidências.
6. Tipos/limites de `addressVersion`/`policyVersion`/`optionId`, obrigatoriedades
   internas de `estimate`, vocabulário `dayBasis`/`startsAtEvent` e versão contratual.
7. Compatibilidade de clientes estritos/rollout, eventual 404 de quotes, mapeamento
   de conflitos de consumo, retenção da intenção/fingerprint e recuperação concorrente.
8. Gates de habilitação: Identity comercial, cookies/origens/TLS, L1 e Stripe;
   aprovação separada de implementação/testes, sem operações em provedores aqui.

## Handoff — dependências, sem autorização de código

**ADR-01 — Customer Profile e endereços** é o nome da futura entrega solicitado
pelo responsável, **não uma renumeração da ADR-001 existente**. Primeiro definir
campos/fonte postal/privacidade e modelo versionado. Depois desenhar ownership,
ports autorizados e snapshot transacional, com contrato de identidade/estado de
conta confiável. Provas futuras: BOLA, conta/sessão revogada, versão alterada durante
lock, imutabilidade pós-compra, ausência de PII em logs e retenção coerente.

**SHIP-01 — Entrega e integração Quotes:** depende do port Customer Profile e
dos parâmetros de zona/tarifa/prazo/embalagem aprovados. Projetar política versionada,
única opção, TTL dez minutos, cálculo exato e projeção estruturada, revalidação
em Orders e falha segura. O
[delta contratual candidato](../../05-engineering/quotes/QTE-POL-06-delta-openapi-candidato.md)
precisa de fechamento estrutural antes de qualquer edição do YAML ativo.

**Checkout futuro:** depende das duas entregas e contratos fechados, autorização
real, unicidade comercial por quote, intenção durável e reserva/pedido atômicos.
Testar duas chaves concorrentes, replay após queda, expiração durante lock e
rollback total. Payments somente depois do commit; a integração Stripe exige
ensaio específico. Nenhum gate é encerrado por esta ratificação.

## Rastreabilidade e aceitação

[RN-011/012, RN-015–040, RN-055 e DA-007](../../02-business-requirements/REGRAS-DE-NEGOCIO.md),
[PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md),
[DB-01](../database/DB-01-modelo-logico.md), [DB-02](../database/DB-02-invariantes-e-locking.md),
[ADR-004](ADR-004-psp-sandbox.md) e
[CT-02](../../05-engineering/contracts/CT-02-dtos-validacao.md)/
[CT-03](../../05-engineering/contracts/CT-03-erros-e-idempotencia-http.md) permanecem
fontes de invariantes. A decisão acrescenta a política específica ratificada sem
renumerar RN/PC/CT/testes e sem homologar o restante de fontes ainda propostas.

Critério documental: seis ratificações inequívocas, dois bloqueios mantidos,
parâmetros remanescentes explícitos, delta candidato separado e código/YAML ativo
intactos. Casos QTE-POL-T01–T10 e contratuais do delta continuam **planejados**;
resultados históricos não são novas execuções. FD-03/FD-05 não alterados.
