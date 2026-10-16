# QTE-POL-01 — Política de entrega proposta

**15/10/2026 · QTE-DEC-002 RATIFICADO · somente documentação.** Modelo fixo por zona,
uma opção elegível por zona e cobrança por pedido físico/misto aprovados pelo
responsável em 15/10/2026; ver [ADR-012 / ADR-QTE](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md). Nenhuma tarifa,
zona concreta, promessa logística ou implementação foi aprovada.
O índice e a matriz do pacote estão em [QTE-POL-05](QTE-POL-05-fluxo-e-matriz-de-decisoes.md).

## Evidência e limites

[RN-015–023, RN-055 e DA-007](../../02-business-requirements/REGRAS-DE-NEGOCIO.md)
exigem cálculo no servidor, condições visíveis antes da confirmação e entrega
somente para componentes físicos. A categoria **simulador determinístico no MVP**
já foi escolhida; a DA-007 não escolhe fórmula, tarifas ou cobertura.
[PC-04](../../03-business-processes/POLITICAS-CONSOLIDADAS.md) exige físicos de um
kit juntos na mesma unidade de expedição; permite expedições separadas de avulsos.
Uma tarifa por pedido não deve ser confundida com uma única remessa obrigatória.

A [implementação QTE-01](QTE-03-entrega-e-tempo.md) usa atributos e endereço
artificiais, `TEST_ZONE`, `TEST_GROUND`, tarifa-base e preço por grama. Os valores
do teste, seu prazo e seus pesos não são dados logísticos reais nem política
aprovada. Digital puro não chama o port de entrega e usa entrega inaplicável,
não um benefício de frete grátis. Nenhum desconto ou cupom passa a existir.

## Comparação de modelos — histórico da proposta QTE-02

Notação exclusivamente simbólica: `z` é uma zona configurada a partir do destino;
`o` é uma opção elegível; `v` é a versão da política; `W` é o peso físico total em
gramas; `D` são dimensões/embalagem validadas. Todas as tabelas e constantes abaixo
dependem de aprovação. Nenhum intervalo de CEP, preço ou prazo real é definido.

| Modelo                     | Fonte e entradas                                                                                                         | Fórmula determinística candidata e arredondamento                                                                                                                  | Faixas de destino e kits                                                                                                                         | Indisponibilidade                                                                                                | Manutenção e riscos                                                                                                       | Impacto backend / frontend                                                                                   | Testes necessários                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Tarifa fixa por faixa      | Tabela versionada do simulador aprovada pelo responsável; CEP normalizado, zona, opção e composição física               | `frete = C[v,z,o]`, inteiro em centavos, sem arredondamento; nunca receber `C` do browser                                                                          | Intervalos de CEP disjuntos com limites explícitos; taxa por pedido elegível, não por componente; kit físico junto, digital não acrescenta frete | Zona ausente/ambígua, política inativa, endereço incompleto ou conjunto não transportável recusam cotação física | Baixo custo; simplifica custos e não representa transportadora real; precisa revisar tabela e limites de elegibilidade    | Resolver zona e condições no servidor; mostrar tarifa e prazo simulados, com uma opção inicial               | Limites inclusivos/exclusivos, buracos/sobreposição, versão, kit+avulso, digital sem chamada, overflow e ausência de fallback |
| Atributos físicos e região | Cadastro autorizado por SKU, embalagem e tabela regional versionada; peso, dimensões, destino, composição                | `frete = T[v,z,o,banda(W,D)]`; tarifas das bandas já em centavos; limites inteiros, sem float                                                                      | Matriz região × banda; soma de físicos repetidos por SKU; embalagem do kit precisa ser definida, não soma ingênua das dimensões                  | Atributos ausentes, embalagem desconhecida ou banda excedida bloqueiam                                           | Custo médio/alto de cadastro; peso volumétrico não pode ser inventado; dependência de dados hoje artificiais              | Port de atributos físicos e cálculo de embalagem; UI explica restrições, sem editar pesos ou tarifa          | Fronteiras de banda, embalagem, SKU repetido, atributos faltantes, dimensões extremas, consistência de versões                |
| Híbrido base+peso+região   | Mesmas fontes anteriores, base regional e coeficiente racional aprovados                                                 | `frete = B[v,z,o] + ceil(W × N[v,z,o] / Q[v,z,o])`, `Q > 0`; fração exata, arredondar uma vez a parcela agregada para cima ao centavo                              | Zonas explícitas; consolidar todos os físicos antes do cálculo, preservar expedição conjunta do kit                                              | Sem dados, coeficiente inválido, opção inelegível ou limite excedido: recusar                                    | Flexível, mas mais parâmetros e possível custo incoerente por embalagem; sem vantagem comprovada para iniciar o portfólio | Cálculo exato e versionado; apresentar somente preço final e condições, não fórmula controlável pelo cliente | Fracionários, arredondamento agregado vs por linha, overflow intermediário, kits mistos, mudança de coeficiente               |
| Provedor logístico futuro  | Resposta autenticada do adapter, cadastro de origem/embalagem e destino mínimos; versão do contrato e validade da oferta | Atlas normaliza o valor exato do provedor para centavos; mesma resposta persistida → mesma projeção; recusar precisão não suportada, sem arredondamento silencioso | Cobertura e unidades de expedição vêm do contrato comprovado, não de zonas inventadas                                                            | Timeout/resposta ambígua, oferta expirada ou sem serviço: indisponível; sem substituir por tarifa fictícia       | Alto custo operacional, privacidade e dependência externa; a chamada externa não é determinística entre momentos          | Adapter futuro, snapshot da oferta e revalidação; UI compara opções reais somente após integração aprovada   | Contrato externo, expiração, timeout, replay, redaction, cobertura, divergência de preço e falha parcial                      |

No quarto modelo, o determinismo limita-se à normalização da **mesma evidência**;
uma nova consulta pode mudar preço/prazo. A integração não é parte do MVP aprovado
nem desta entrega. Não chamar transportador enquanto mantém locks PostgreSQL.

## Decisão ratificada — QTE-DEC-002

**RATIFICADO pelo responsável em 15/10/2026:** iniciar com tarifa fixa por faixa de destino, uma opção simulada
elegível por faixa e uma cobrança de entrega por pedido físico/misto. É verificável
sem promover pesos artificiais a cadastro comercial. O port de condições mantém
uma fronteira para evoluir para bandas/híbrido/provedor; não requer microsserviço.

Essa decisão orienta a futura política, não a fórmula local existente. Não
autoriza remover as guardas de atributos da fixture QTE-01. Para implementá-la,
aprovar previamente tabela de zonas, tarifas, prazo, unidade do prazo, marco
inicial, calendário e limites de transportabilidade/embalagem. Ausência de
qualquer condição obrigatória impede ativação física; não assumir atendimento
nacional ou preenchimento automático dos intervalos não cadastrados.

O prazo deve ser apresentado como **estimativa simulada**, sem garantia de
transportadora. Dias úteis/corridos, feriados e início após confirmação financeira
são decisões abertas. Nenhum número DEMO é necessário nesta proposta. Valores
futuros de demonstração precisam de identificação explícita DEMO e aprovação.

O servidor resolve zona por regra não ambígua, valida endereço e composição,
retorna opção, valor BRL, condições, versão e validade; não retorna PII desnecessária.
Pricing continua dono dos preços dos produtos; Quotes compõe o total usando
condições confiáveis de entrega. Falta de preço ou condição física recusa tudo.
Valores intermediários exatos e total ficam dentro do limite inteiro seguro
existente; zero não é aprovação de promoção/gratuidade.

Aceitação futura: mesmos dados/versão produzem mesmo resultado; alteração de
versão requer nova cotação; digitais nunca consultam entrega; físicos inelegíveis
não recebem total final; kit insuficiente não gera reserva parcial no checkout.
O frete não certifica estoque. A [validade](QTE-POL-03-ttl-e-revalidacao.md) e a
[seleção HTTP proposta](QTE-POL-04-contratos-http-propostos.md) são decisões separadas.
