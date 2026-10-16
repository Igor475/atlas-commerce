# QUSE-02 — Modelo e constraints

Fonte: [migration aditiva Orders](../../../apps/api/prisma-quote-consumption/migrations/202610160300_quote_consumption/migration.sql), histórico próprio `orders_quse_history`, owner `atlas_orders_migrator`. Schemas Prisma e migrations anteriores permanecem intactos. Prisma deploy controla reaplicação; não há DDL no startup ou db push.

## Modelo mínimo normalizado

`orders.request` já guarda ator, operação, chave, fingerprint canônico, quote, identidade determinística da preparação e resultado. A nova `UNIQUE(quote_id)` protege a cotação inclusive quando um port antigo ignora o advisory. A constraint se aplica à request inteira, portanto também impede múltiplas intenções incompletas persistidas; a API privada nunca confirma uma request incompleta.

`orders.quote_consumption` tem quote como PK, preparation como UNIQUE/FK, propósito TEST_ONLY, origem, horário e PID/XID do registro. FK composta `(preparation_id, quote_id)` referencia a mesma dupla em request. Isso evita duplicar ator/chave/fingerprint e vincula o fato ao resultado durável. As FKs existentes unem request, preparação e titular; o port Quotes valida ownership antes de adquirir locks comerciais.

Trigger imutável recusa UPDATE/DELETE. Trigger de constraint diferido em `orders.preparation` exige, no commit, result_id finalizado, consumo e evidências Quotes/Profile/Shipping da mesma quote. Um grant legado restaurado não permite confirmar preparação sem completar o novo fluxo. UNIQUE é a autoridade da unicidade; advisory reduz trabalho descartado e produz conflito controlado no port novo.

## Dados anteriores e recuperação

A migration trava request/preparation para estabilizar a inspeção. Quote duplicada causa `QUSE_MIGRATION_DUPLICATES` antes de DDL. Request incompleta ou sem evidências coerentes causa `QUSE_LEGACY_REVIEW_REQUIRED`. Não há DELETE, consolidação ou correção silenciosa. A fixture normal começa vazia; duplicatas artificiais são exercitadas em transação descartada.

Preparações antigas únicas e completas recebem vínculo `BACKFILL_TEST_ONLY`. recorded_pid/xid/at descrevem a migration; não pretendem ser o PID/XID histórico original. Os dados originais permanecem intactos. Não se infere autorização de backfill comercial; volume, compatibilidade/rollout, retenção e migração real exigem análise separada.

Reversão do laboratório: destruir somente projeto UUID e reconstruir pelos scripts. Não remover constraint em base comercial nem usar down destrutivo. Nova migration falha fechada e sua transação desfaz o DDL parcial.
