# QTE-03 — Entrega e tempo

`quotes.resolve_fixture_delivery` é o port SQL de condições de entrega com
adapter exclusivo TEST_ONLY. A emissão digital não o chama, inclusive para
revista e kit só digital. Os testes substituem temporariamente o adapter por
uma falha para comprovar essa ausência de chamada e o ramo físico correspondente.

Físico exige endereço do ator completo/elegível, opção existente, política ativa
e atributos físicos explícitos de cada SKU/componente. Ausência de qualquer
componente, dimensões fora do limite, zona não atendida ou dados insuficientes
recusam a cotação. Não se inventam atributos quando ausentes no Catalog: a tabela
separada `fixture_physical` contém apenas dados artificiais dos testes.

O cenário artificial usa TEST_ZONE, TEST_GROUND, 500 g e dimensões de 100 mm
explicitamente fornecidos pelo teste, tarifa 100 centavos + 1 centavo por grama,
e prazo de 2–4 dias. Esses números não representam produto, CEP, transportadora,
tarifa, endereço real ou promessa logística. A fórmula é determinística;
componentes físicos e avulsos repetidos são consolidados por SKU/quantidade.

Não há seed de valores comerciais. A DA-007 autoriza a categoria simulador,
não esses valores, prazos ou atributos. Qualquer uso comercial exige aprovação
e integração segura de endereços/atributos reais.

## Validade

`clock_timestamp()` PostgreSQL é observado depois dos locks; `expires_at` deriva
da duração explicitamente configurada na fixture, sem DEFAULT. O intervalo
1–3600 segundos é apenas limite técnico do laboratório, não TTL aprovado. Testes
usam 600, 7 e 1 segundo para provar cálculos e fronteiras. A composição normal
fica fechada enquanto TTL comercial e políticas reais não forem aprovados.

Uma cotação expirada permanece legível ao titular como snapshot histórico, mas
não alimenta intenção nova. Replay de preparação já concluída recupera o fato
persistido, sem segunda reserva. Prazo de cotação, TTL da reserva física e
compatibilidade temporal Stripe são conceitos distintos. UXD-16 permanece
inalterada: reserva física/mista real; null para digital, sem prazo artificial.

Recuperação de schema neste laboratório consiste em destruir somente o projeto
Docker criado e reconstruir pelas migrations. Não há down migration ou plano de
aplicação remota autorizado. Atualizações comerciais futuras precisam de revisão
de compatibilidade, retenção/endereço, contratos e aprovação próprias.
