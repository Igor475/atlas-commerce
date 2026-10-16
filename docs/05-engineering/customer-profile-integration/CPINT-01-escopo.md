# CPINT-01 — Escopo e diagnóstico

## Problema e solução

CP-01 usa `atlas_profile_cp01`; QTE/ORD/INV usam `atlas_catalog_cat01`. Operações sequenciais nesses dois bancos não oferecem rollback conjunto. A fixture CP-02 reúne os schemas no mesmo PostgreSQL descartável, preservando os laboratórios isolados.

A cadeia Profile integrada é uma derivação versionada e revisada da migration CP-01, com guard próprio de banco, owner, PostgreSQL 17 e marker CPINT. As migrations históricas não foram reescritas. O harness valida o destino integrado antes de aplicar as cadeias antigas, cujos guards continuam válidos nesse banco.

Quotes guarda referência imutável mínima: ator, endereço, versão, país e CEP. Não copia destinatário nem endereço postal completo. Orders revalida a versão protegida, materializa snapshot postal tipado e imutável e chama os ports existentes de preparação e reserva numa única transação. O digital puro não consulta endereço e não cria snapshot ou reserva física.

## Fronteiras

O principal server-only exige classe CUSTOMER, elegibilidade e evidência `CPINT_TEST_ONLY`. No SQL, `session_user` precisa estar vinculado à mesma conta artificial ativa/verificada. UUID recebido isoladamente não concede autoridade. Replay e leitura revalidam autorização da conta.

A política server-side e os valores de zona, tarifa e prazo continuam artificiais da fixture QTE. Não representam frete comercial, cobertura por CEP ou SHIP-01. Identity continua autoridade comercial de autenticação; a fixture não cria sessão pública nem acessa credenciais Identity.

O módulo integrado não é importado pelo AppModule e não possui controller público. Não altera OpenAPI, QTE-POL-06, regras normativas, ADR-012, frontend, Stripe, L1_SQL_STRICT ou provedores.
