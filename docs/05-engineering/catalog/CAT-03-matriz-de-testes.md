# CAT-03 — Matriz CAT-001–CAT-030

IDs novos, sem renumerar API/PGSP/MRD/L1. Baseline main af091a1, delta local sem
commit, 15/10/2026; Node24.21.0/pnpm12.11.2/Prisma7.10.0/PG17.10 Docker Windows.
[Suíte HTTP/PostgreSQL real](../../../apps/api/test/catalog/catalog.integration.ts),
[resultados e evidências](../../../apps/api/test/catalog/RESULTS.md).

| ID      | Prova realmente executada                                                          | Resultado                        |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| CAT-001 | Composição default fechada, modo remoto/produção recusados                         | PASS local                       |
| CAT-002 | Migration própria e runtime sem leitura bruta/escrita/flags elevadas               | PASS local                       |
| CAT-003 | Migration reaplicada, um histórico e dados preservados                             | PASS local                       |
| CAT-004 | URL/destino errado recusados e SQL em banco postgres aborta antes de schema        | PASS local                       |
| CAT-005 | SKU UNIQUE, FKs e identidade estável no PostgreSQL                                 | PASS local                       |
| CAT-006 | Quantidade0/negativa/fracionária/excessiva e kit incompleto recusados              | PASS local                       |
| CAT-007 | Uma obra, três edições/formatos e ISBN anulável                                    | PASS local                       |
| CAT-008 | Dois autores, sem duplicar obra                                                    | PASS local                       |
| CAT-009 | Categorias planas e associação única                                               | PASS local                       |
| CAT-010 | Hierarquia inexistente, FK/associação editorial inválida recusadas                 | PASS local                       |
| CAT-011 | Kit físico publicado e tipos dos componentes conferidos                            | PASS local                       |
| CAT-012 | Kit digital publicado e tipos dos componentes conferidos                           | PASS local                       |
| CAT-013 | Kit misto publicado e tipos dos componentes conferidos                             | PASS local                       |
| CAT-014 | Self/ciclo/nested/duplicata/sealed recusados; duas conexões publicação vs edição   | PASS local                       |
| CAT-015 | Publicados listados por HTTP sem cookie                                            | PASS local                       |
| CAT-016 | Retirados/rascunhos/obra inválida/componentes e kits ocultos                       | PASS local                       |
| CAT-017 | Ausente/privado/inválido retornam404 minimizado                                    | PASS local                       |
| CAT-018 | Keyset determinístico, inserção/retirada entre páginas, sem duplicação             | PASS local                       |
| CAT-019 | Cursor inválido/adulterado/de outra instância recusado                             | PASS local                       |
| CAT-020 | limit e query estritos, campos extras/duplicados/excesso recusados                 | PASS local                       |
| CAT-021 | Respostas HTTP validadas em OpenAPI3.1/Ajv2020, 182 refs; negativos                | PASS local                       |
| CAT-022 | DTO allowlist, JSON/nosniff, texto preservado sem HTML renderizado                 | PASS local                       |
| CAT-023 | Pricing controlado, BRL/centavos de origem de teste conhecida                      | PASS local                       |
| CAT-024 | Pricing ausente/missingprice retorna503, nunca DTO falso                           | PASS local                       |
| CAT-025 | Dinheiro negativo/fracionário/overflow/moeda/origem inválidos recusados            | PASS local                       |
| CAT-026 | previewAvailable=false, sem download/publicação administrativos                    | PASS local                       |
| CAT-027 | Lock PostgreSQL real causa timeout503; recuperação e zero sessões após close       | PASS local                       |
| CAT-028 | SQL injection/query inválida/mass assignment/abuso recusados                       | PASS local                       |
| CAT-029 | Diff protegido vazio, schemas Identity/spike ausentes na fixture; Identity fechado | PASS local                       |
| CAT-030 | EXPLAIN e gates locais executados; formatação histórica/CI remoto separados        | PARCIAL agregado: ver resultados |

O arquivo de integração contém 30 testes aprovados. CAT-030 agregado **não** implica
CI remoto aprovado nem formatação global aprovada; o teste isolado registra somente
suas provas locais. Regressões anteriores são executadas separadamente, sem editar
seus critérios. Não há teste remoto marcado PASS por skip.
