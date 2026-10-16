# COM-02 — Parâmetros de frete candidatos

**CANDIDATO DEMO — NÃO RATIFICADO · 16/10/2026.** As três alternativas abaixo são simulações de portfólio, sem transportadora ou promessa de entrega real. O responsável deve escolher e aprovar valores e condições separadamente.

Não se reabre [QTE-DEC-002/ADR-012](../../04-architecture/adrs/ADR-012-politicas-cotacao-entrega-enderecos.md): tarifa fixa por zona, uma opção elegível por zona, uma cobrança por pedido físico/misto, política versionada, revalidação e digital sem frete físico. A fórmula artificial da fixture não é convertida em tarifa comercial.

## Alternativas concretas

Limites de CEP inclusivos, preservando oito dígitos. São intervalos **numéricos sintéticos**, não afirmações sobre cidades, UFs, existência de CEP ou cobertura nacional. O [buscador de faixas dos Correios](https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php), consultado em 16/10/2026, é fonte para uma futura conferência geográfica; essa conferência por localidade não foi executada aqui. Não associar Z1/Z2/Z3 a estados por inferência.

| Alternativa CANDIDATO DEMO — NÃO RATIFICADO | Zona | Faixa numérica de CEP | Tarifa BRL (centavos) | Estimativa simulada | Base          |
| ------------------------------------------- | ---- | --------------------- | --------------------- | ------------------- | ------------- |
| A — uniforme                                | A1   | 01000000–99999999     | R$ 19,90 (1990)       | 5–10 dias           | CALENDAR_DAYS |
| B — três zonas, recomendada                 | B1   | 01000000–19999999     | R$ 12,90 (1290)       | 3–5 dias            | BUSINESS_DAYS |
| B — três zonas, recomendada                 | B2   | 20000000–59999999     | R$ 19,90 (1990)       | 5–8 dias            | BUSINESS_DAYS |
| B — três zonas, recomendada                 | B3   | 60000000–99999999     | R$ 29,90 (2990)       | 8–12 dias           | BUSINESS_DAYS |
| C — cobertura limitada                      | C1   | 01000000–09999999     | R$ 9,90 (990)         | 2–4 dias            | BUSINESS_DAYS |
| C — cobertura limitada                      | C2   | 20000000–29999999     | R$ 14,90 (1490)       | 4–7 dias            | BUSINESS_DAYS |
| C — cobertura limitada                      | C3   | 70000000–79999999     | R$ 19,90 (1990)       | 6–9 dias            | BUSINESS_DAYS |

Cada alternativa é uma política independente; não combinar linhas A/B/C em uma política ativa. Lacunas da alternativa C e CEP inferior a 01000000 são indisponíveis. Estar no intervalo não dispensa validação postal, endereço, atributos físicos ou elegibilidade.

**Valores comuns CANDIDATO DEMO — NÃO RATIFICADO:** `optionId: demo-standard`, `label: Entrega simulada Atlas`, `simulated: true`, `policyVersion: 1` para a primeira versão eventualmente aprovada. Não existe cadastro ativo desses valores. O servidor escolhe a única opção; o browser não envia tarifa ou escolhe uma opção inexistente.

## Prazo e calendário candidatos

`startsAtEvent: PAYMENT_CONFIRMED` significa confirmação financeira autenticada e aceitação transacional do pedido como PAID, com alocação física integral aplicável. Não significa retorno de navegador, criação de Session, conclusão visual ou início da reserva.

Contagem proposta: dia seguinte ao marco, sem contar o dia zero. Fuso `America/Sao_Paulo`; não se inventa horário de corte. Em dias corridos, sábados, domingos e feriados contam. Em dias úteis, contar segunda a sexta, excluindo feriados legais nacionais e os locais de origem/destino que a política aprovada exigir. Ponto facultativo não é automaticamente feriado. A origem e a lista versionada de feriados precisam ser aprovadas; não há calendário completo validado nesta entrega. Ausência de calendário obrigatório impede ativação dessa política, sem fallback silencioso para dias corridos.

As unidades/enums e a relação `minDays <= maxDays` são propostas de [COM-04](COM-04-quote-result-e-contratos.md). Não converter essa estimativa em data garantida de transportadora. Alteração de calendário, marco ou prazo altera versão e invalida quote para nova preparação.

## Transportabilidade, kits e embalagem

**CANDIDATO DEMO — NÃO RATIFICADO:** embalagem `DEMO_BOX`, dimensões internas de 400 × 300 × 200 mm, massa bruta máxima de 10.000 g e até 20 unidades físicas expandidas por pedido. Não aprovar a adequação desses limites a produtos reais. Atributos devem vir de cadastro autorizado, nunca de payload do cliente.

O candidato inicial admite somente conjuntos com classe de acondicionamento previamente verificada para essa caixa. Somar pesos ou comparar a maior dimensão de um SKU não comprova que o conjunto cabe; faltando massa bruta, dimensões ou evidência de acondicionamento, recusar entrega física. Não calcular peso volumétrico nem cobrar taxa adicional por inferência.

Consolidar SKUs físicos, incluindo componentes repetidos em kits; partes digitais não acrescentam frete. Componentes físicos de cada kit ficam juntos, conforme [PC-04](../../03-business-processes/processes/PC-04-kits.md). Avulsos podem ter expedição separada segundo PC-04, mas o MVP candidato só aceita conjuntos cobertos pela embalagem aprovada; múltiplos volumes não aprovados são indisponíveis, sem multiplicar a tarifa por SKU. A cobrança única por pedido não elimina as regras de expedição.

## Indisponibilidade e versionamento

Recusar cotação física quando faltar endereço próprio elegível, CEP normalizado/validado conforme política, zona única, política ativa, atributos físicos, acondicionamento, calendário exigido ou total BRL seguro. Zona ambígua, faixa sobreposta, limite excedido e dados desconhecidos não recebem tarifa padrão. Digital puro retorna `delivery: null`, sem consultar Shipping; isso não é promoção de frete grátis.

Publicação futura proposta: revisar tabela completa e calendário com o responsável; validar intervalos disjuntos, tarifas inteiras não negativas e limites; gerar nova versão imutável com vigência; ativar atomicamente uma única versão; preservar a anterior para snapshots e auditoria. Quote armazena versão usada; checkout revalida a atual após locks e exige recotação quando houver divergência. Rollback de configuração ativa nova decisão rastreável, sem sobrescrever a versão antiga ou atualizar snapshots pagos.

## Recomendação e aceite

**Recomendo B, ainda PROPOSTA:** três faixas e uma opção mantêm simplicidade e permitem demonstrar variação de preço/prazo, limites, revalidação e UX de indisponibilidade sem algoritmos logísticos fictícios. A tem menor manutenção, mas pouca variedade; C exercita buracos de cobertura, com mais recusas e explicação ao usuário. Nenhuma delas representa tarifa de mercado.

Aceite futuro: limites inferior/superior de cada faixa, vizinhos e lacunas; recusa de sobreposição; mesmo dado/versão → mesmo resultado; digital sem chamada; kit misto com uma cobrança e acondicionamento conjunto; ausência de atributo/calendário; mudança de versão entre quote e checkout; nenhuma reserva parcial; total exato. Aprovação deve abranger tabela, rótulo/ID, base de dias, marco, calendário, origem e embalagem. [COM-D01](COM-07-decisoes-e-roadmap.md) permanece PENDENTE.
