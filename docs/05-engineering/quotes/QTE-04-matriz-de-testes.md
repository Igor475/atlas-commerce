# QTE-04 — Matriz de testes

Execução final de 15/10/2026: **QTE-001–030 PASS** em PostgreSQL real, incluindo
a guarda contra desvio pelo port legado. Duas conexões ficaram simultaneamente
em espera observável em QTE-027. Regressões completas executadas separadamente;
ver o [handoff](QTE-05-handoff-e-pendencias.md).

| Caso    | Prova                                                                             |
| ------- | --------------------------------------------------------------------------------- |
| QTE-001 | Composição fechada e produção recusada                                            |
| QTE-002 | Schema/owner e quatro cadeias aplicadas/reaplicadas                               |
| QTE-003 | Migration recusa role e marker incorretos                                         |
| QTE-004 | ACLs: leitura privada, escrita, manutenção e membership negados                   |
| QTE-005 | URLs remotas, parâmetros e argumentos arbitrários recusados                       |
| QTE-006 | Preço vigente exclusivamente Pricing                                              |
| QTE-007 | Quantidades consolidadas e subtotal exato                                         |
| QTE-008 | Soma BRL e preço próprio do kit                                                   |
| QTE-009 | Overflow, tarifa inválida, zero e cupom recusados                                 |
| QTE-010 | Pricing ausente falha sem efeitos                                                 |
| QTE-011 | Preço alterado não muda snapshot; nova cotação recalcula                          |
| QTE-012 | Ebook/revista/kit digital não chamam entrega; físico chama                        |
| QTE-013 | Entrega/endereço congelados; cotar não reserva nem garante estoque                |
| QTE-014 | Kit físico/misto e componentes consolidados                                       |
| QTE-015 | Destino ausente, incompleto, não atendido ou de outro titular                     |
| QTE-016 | Opção inexistente e dados físicos ausentes                                        |
| QTE-017 | Tarifa determinística e snapshot imutável de endereço                             |
| QTE-018 | Política inexistente/inativa falha em físico e digital                            |
| QTE-019 | BOLA e ator SQL forjado recusados                                                 |
| QTE-020 | Isolamento e identidade inativa                                                   |
| QTE-021 | TTL exato medido pelo relógio PostgreSQL                                          |
| QTE-022 | Expiração impede preparação nova                                                  |
| QTE-023 | Replay após expiração não duplica reserva                                         |
| QTE-024 | Integração Quotes/Orders/Inventory com PID/XID/xmin iguais                        |
| QTE-025 | Revalidação após espera de lock e retirada de publicação                          |
| QTE-026 | Entrega alterada ou expiração após espera provocam rollback                       |
| QTE-027 | Duas conexões mesma intenção; falha após reserva desfaz todos os efeitos novos    |
| QTE-028 | Entrada monetária, injeção, privilégio por coluna e indisponibilidade por timeout |
| QTE-029 | Ajv/OpenAPI QuoteRequest/QuoteResult e ausência de controller público             |
| QTE-030 | Fontes protegidas, migrations e normas intactas; gates preservados                |

Quatro unitários adicionais cobrem entradas, couponCode, quantidade, dinheiro e
projeção. QTE-030 é proteção de fontes, não substituto das regressões completas.
