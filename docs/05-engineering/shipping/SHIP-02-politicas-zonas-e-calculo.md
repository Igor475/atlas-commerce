# SHIP-02 — Políticas, zonas e cálculo

## Modelo interno

`shipping.policy` possui ID estável, propósito TEST_ONLY, flag ativa e ponteiro de versão. `shipping.revision` possui versão positiva, país BR, moeda BRL, limite dimensional explícito da fixture e ciclo DRAFT → SEALED. `shipping.zone` une zona/tarifa/opção: referência à revisão, UUID, CEP inicial/final textual, elegibilidade, uma opção e centavos. Não são necessários quatro CRUDs/tabelas separados para preservar essas autoridades.

Versões começam DRAFT, recebem zonas e são seladas somente com configuração não vazia. Depois não se alteram nem se adicionam zonas/tarifas. Mudança exige revisão nova e ativação explícita. FKs preservam histórico; não há deleção de versões. Desativar a política ou avançar a versão altera somente sua elegibilidade para novas preparações, sem reescrever quotes/snapshots.

Intervalos são fechados nos dois limites, com CEP de oito dígitos e collation C. `00000009` pertence ao primeiro intervalo e `00000010` ao seguinte. O trigger serializa inserções/selo na linha da revisão e recusa qualquer sobreposição, inclusive no limite comum. O resolver exige exatamente uma zona coberta e elegível. Lacuna, ambiguidade, país incompatível, opção diferente, versão incompleta ou política inativa recusam; sintaxe postal não prova existência do CEP.

## Dinheiro e fixtures

`frete = amount_cents[policy_id,version,zone_id,option_id]`, uma vez por pedido. Nenhuma multiplicação por peso/componente, desconto, gratuidade ou fallback. Centavos persistidos BIGINT entre 1 e 9.007.199.254.740.991; intermediários de subtotal/total existentes usam numeric exato. Overflow recusa a operação inteira. Peso/dimensões servem somente à evidência artificial de elegibilidade, não alteram tarifa.

O harness fornece duas faixas artificiais `00000000–00000009` e `00000010–00000019`, opções `TEST_GROUND`, tarifas 777/999 centavos, atributos físicos artificiais e limite dimensional 1000 mm. Não são CEPs declarados existentes/atendidos, cobertura nacional, condições comerciais ou dados reais. Há casos explícitos de um centavo, tarifa máxima e revisão substituta. Não existem seeds de produção.

`estimateFixture` normalmente é null. Só o teste explícito fornece `{purpose: TEST_ONLY, min: 2, max: 4, unit: TEST_ONLY_UNAPPROVED_UNIT}`. Isso comprova persistência da evidência opcional; não define dias úteis/corridos, calendário, marco inicial ou promessa. `estimate/dayBasis/startsAtEvent` continuam pendentes e não viram DTO público.
