# COM-05 — Handoff QUSE para checkout comercial

**PROPOSTO · 16/10/2026.** Não implementa checkout, pedido comercial, Payments ou migration. [QUSE-01–06](../quote-consumption/README.md) comprova invariantes TEST_ONLY; [COM-01](COM-01-matriz-de-prontidao.md) distingue esse resultado da homologação comercial.

## Preservar a garantia comprovada

| Invariante existente              | Evidência e condição futura                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Uma intenção por quote            | UNIQUE persistente em Orders, consumo referenciado e guardas de integridade; não substituir por cache/lock em memória                           |
| Replay por ator/chave/fingerprint | Reautorizar conta/titularidade; mesma intenção recupera resultado durável; corpo ou chave incompatível conflita sem novos efeitos               |
| Atomicidade                       | Shipping → CPINT → Quotes/Orders/Inventory no mesmo contexto transacional; snapshots, reserva e consumo integralmente confirmados ou revertidos |
| Revalidação                       | Após locks, clock DB e versões atuais; quote não reserva saldo nem renova automaticamente seus dez minutos                                      |
| Isolamento                        | Provas QUSE de duas/três conexões e quote independente preservadas; disputa de última unidade/kit continua all-or-nothing                       |

Referências: [QUSE-02](../quote-consumption/QUSE-02-modelo-e-constraints.md), [QUSE-03](../quote-consumption/QUSE-03-concorrencia-e-atomicidade.md), [QUSE-04](../quote-consumption/QUSE-04-replay-e-seguranca.md), [CPINT-02](../customer-profile-integration/CPINT-02-atomicidade-e-locks.md), [SHIP-03](../shipping/SHIP-03-integracao-transacional.md), [DB-02](../../04-architecture/database/DB-02-invariantes-e-locking.md).

## Adequação comercial futura

1. Validar a sessão Identity real; ator deriva do servidor. Integrar ports de Profile com a identidade de cliente, sem importar contas/credenciais artificiais. Definir schema/transação comercial comum ou resolver explicitamente a incompatibilidade antes de prometer atomicidade entre bancos distintos.
2. Autenticar, validar estrutura/CSRF/Origin, limitar abuso e normalizar chave/corpo. Fingerprint deve incluir a intenção canônica aplicável, com versão do contrato; não permitir que PII desnecessária, timestamps voláteis ou ordem irrelevante de propriedades mudem o replay.
3. Sob transação/locks na ordem aprovada, recuperar intenção existente antes de criar outra; conferir titularidade, quote atual, composição, endereço/versão, política, preço, saldo e clock DB. Persistir snapshots comerciais, reserva física, intenção/consumo e referência estável PaymentAttempt/solicitação de trabalho no mesmo commit.
4. Somente depois do commit executar Stripe. Sem rede, e-mail ou consulta postal enquanto mantém locks. Um mecanismo durável de despacho, coerente com [ADR-002](../../04-architecture/adrs/ADR-002-integridade-outbox.md), deve permitir recuperação se o processo morrer antes da chamada.
5. Atualizar prontidão da sessão em transação curta. Resultado indeterminado preserva tentativa/intenção, agenda reconciliação e não gera nova compra. Cliente recebe projeção autorizada de 201 pronto ou 202 pendente/reconciliação conforme CT-10, ainda sujeito à implementação e testes futuros.

Um replay recupera a mesma **identidade e efeitos**; a projeção pode refletir estado atual da tentativa, conforme contrato ratificado, sem reproduzir clientSecret expirado indefinidamente. A política deve distinguir resultado de criação e consulta atual, sem reexecutar mutação. Não desativar conta/CSRF ou autorizar outro titular para facilitar recuperação.

## Migrações e dados anteriores — revisão obrigatória

| Etapa candidata                            | Aceite/condição de interrupção                                                                                                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventariar dados/schema alvo              | Saber quais tabelas são fixture e quais fatos seriam comerciais. Não renomear preparação TEST_ONLY para pedido definitivo nem reutilizar senha/role do harness                                                          |
| Analisar duplicatas e evidência incompleta | Contar quotes com múltiplas intenções, chaves conflitantes, owner ausente, snapshots/consumo inconsistentes. Qualquer ambiguidade bloqueia migração; não escolher vencedor silenciosamente                              |
| Propor backfill revisado por humano        | Somente fatos completos e inequívocos; registrar origem migrada. Nunca fabricar PID/XID original, pagamento, reserva ou titularidade. Dados não recuperáveis exigem decisão de descarte/quarentena, não SQL improvisado |
| Desenhar schema e rollout                  | Constraints/FKs/UNIQUE/guardas para estado completo, ordem de deployment compatível, análise de locks/volume e estratégia de interrupção. Aprovar migration específica antes de criá-la/aplicá-la                       |
| Exercitar em clone descartável autorizado  | Aplicação/reaplicação, dados legados incompatíveis, crash antes/depois commit, restore e rollback operacional. Rollback de aplicação não pode perder unicidade nem repetir efeito financeiro já enviado                 |
| Ativar comercialmente                      | Somente com evidência do schema/role/infra e gates HTTP/Payments; executar SQL remoto requer autorização separada                                                                                                       |

O backfill local QUSE já recusa evidência incompleta e duplicatas; não é autorização para migration comercial. [DB-03](../../04-architecture/database/DB-03-migrations-e-recuperacao.md) e [DB-05](../../04-architecture/database/DB-05-plano-de-validacao.md) permanecem superiores ao plano.

## Retenção e estados

Intenção e unicidade não expiram com a quote de dez minutos. A expiração de reserva/Session também não libera nova compra pela mesma quote. Retenção de fingerprint/chaves, evidência e eventual tombstone requer [COM-03](COM-03-enderecos-e-privacidade.md), incluindo backup/restore; a poda de chave pelo PSP não define a política Atlas. Nunca apagar a única barreira a replay financeiro sem substituição durável comprovada.

Preservar SM-01 e transições normativas em [PC-01–04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md). PENDING_PAYMENT não é PAID; PAYMENT_REVIEW registra fato financeiro/operacional que exige tratamento, sem liberar fulfillment. CANCELLED exige encerramento financeiro seguro; reserva RELEASED/EXPIRED não retorna CONFIRMED. `payment.sessionStatus` é prontidão da Session, não novo estado financeiro SM-02.

Pagamento válido tardio sem alocação física → PAYMENT_REVIEW e compensação integral idempotente no MVP. Kit misto não recebe acesso digital antes de pagamento comprovado **e** alocação física integral. Digital puro não recebe TTL de reserva fictício; liberação depende do fato financeiro e entitlement elegível. Pedido digital já cancelado exige revisão/compensação aplicável, não reativação automática.

## Falhas ambíguas, HTTP e operação

| Falha                                      | Recuperação candidata segura                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Processo morre antes do commit             | Ausência de intenção confirmada verificada no DB; retry autorizado com mesma chave, sem supor que ACK ausente prova rollback     |
| Commit ocorreu, resposta local perdida     | Consultar por ator/chave/quote; recuperar único conjunto de efeitos, sem criar nova preparação                                   |
| Session criada, ACK PSP perdido            | PaymentAttempt estável e mesma chave externa; reconciliação autenticada. Não trocar chave nem concluir falha só por timeout      |
| PSP key podada ou estado não conciliável   | Bloquear recriação automática; investigar usando referências persistidas, registrar revisão e decisão autorizada                 |
| Webhook chega antes da resposta da Session | Vincular pelo PaymentAttempt/metadados confiáveis e IDs reais, persistir inbox e conciliar; não depender de sequência de chegada |
| Pausa/restart Free                         | Trabalho durável, lease/retry limitado e scanner de pendências; recuperação independe da memória do processo                     |

HTTP proposto em [COM-04](COM-04-quote-result-e-contratos.md): outra chave para quote consumida → 409 STATE_CONFLICT; mesma chave/outro corpo → 409 IDEMPOTENCY_CONFLICT; vencimento/recotação → 422; condição indeterminada depois de commit → mesma intenção pendente, sem orientar nova compra. Nenhuma dessas respostas foi implementada por COM.

Observabilidade futura mínima: correlação opaca de intenção/attempt/evento, etapa, resultado, duração e contagem de conflitos, pendências antigas, lease vencida, reconciliação/refund. Não registrar chave bruta, fingerprint correlacionável sem necessidade, endereço, cookie, raw payload, clientSecret ou segredo. Replay operacional é ação autorizada/auditada, não endpoint público de debug.

Aceite: preservar provas QUSE/SHIP/CPINT e executar equivalentes no schema comercial aprovado; falhas em cada fronteira, efeitos únicos após restart, titularidade com sessão real, retenção/restore e HTTP aprovados. [COM-D05/06/08](COM-07-decisoes-e-roadmap.md) PENDENTES. Não existe migração ou checkout comercial entregue.
