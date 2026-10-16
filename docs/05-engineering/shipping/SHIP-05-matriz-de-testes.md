# SHIP-05 — Matriz PostgreSQL

Fonte: [SHIP-001–040](../../../apps/api/test/shipping/shipping.integration.ts), PostgreSQL 17 real e conexões independentes. **40/40 PASS em 16/10/2026, somente PostgreSQL descartável local.**

| ID       | Prova executável                                                            | Resultado  |
| -------- | --------------------------------------------------------------------------- | ---------- |
| SHIP-001 | exact local PostgreSQL17 marker and TEST_ONLY composition                   | PASS local |
| SHIP-002 | migration owner and four additive histories are distinct                    | PASS local |
| SHIP-003 | wrong role and marker reject migration before DDL                           | PASS local |
| SHIP-004 | all four chains reapplied without pending or duplicate migrations           | PASS local |
| SHIP-005 | sealed policy, zones and tariff are immutable with complete FK              | PASS local |
| SHIP-006 | remote URL, wrong database, consent, production and CLI args rejected       | PASS local |
| SHIP-007 | CEP remains eight textual digits including leading zeroes                   | PASS local |
| SHIP-008 | covered address resolves exactly one policy zone and option                 | PASS local |
| SHIP-009 | overlapping inclusive ranges including concurrent inserts refused           | PASS local |
| SHIP-010 | configured gap refuses physical quote without zero fallback                 | PASS local |
| SHIP-011 | inclusive endpoints and adjacent ranges resolve without ambiguity           | PASS local |
| SHIP-012 | malformed CEP, unsupported country and unconfigured destination refuse      | PASS local |
| SHIP-013 | inactive or missing Shipping policy cannot quote physical                   | PASS local |
| SHIP-014 | invalid option or incomplete physical eligibility refuses                   | PASS local |
| SHIP-015 | fixed cents charged once per order independent of units and weight          | PASS local |
| SHIP-016 | single cent rate and BRL exact subtotal plus fixed fee                      | PASS local |
| SHIP-017 | fee or combined total overflow rejects without partial quote                | PASS local |
| SHIP-018 | missing tariff and empty policy cannot be activated                         | PASS local |
| SHIP-019 | zero negative fractional or non-BRL tariff rejected                         | PASS local |
| SHIP-020 | deterministic evidence and explicit unapproved estimate fixture             | PASS local |
| SHIP-021 | physical book requires own address and immutable Shipping snapshot          | PASS local |
| SHIP-022 | ebook never calls Shipping and has delivery null                            | PASS local |
| SHIP-023 | digital magazine never calls Shipping or requires postal data               | PASS local |
| SHIP-024 | physical kit plus loose repeated SKU pays once with all physical allocation | PASS local |
| SHIP-025 | mixed kit digital component adds no shipping charge                         | PASS local |
| SHIP-026 | digital kit bypasses Shipping Profile postal and physical reserve           | PASS local |
| SHIP-027 | changed address revision demands re-quote without partial facts             | PASS local |
| SHIP-028 | new version rate or withdrawn zone invalidates old quote preserving history | PASS local |
| SHIP-029 | policy or address changed during observable Catalog wait refuses safely     | PASS local |
| SHIP-030 | ten minute TTL and expiry at or after stock-lock boundary                   | PASS local |
| SHIP-031 | rollback after postal snapshot reserve and process death with recovery      | PASS local |
| SHIP-032 | snapshots and replay remain immutable after policy changes and expiry       | PASS local |
| SHIP-033 | Shipping Profile Orders Inventory and durable records share PID/XID         | PASS local |
| SHIP-034 | foreign address quote and revoked account cannot recover private data       | PASS local |
| SHIP-035 | runtime no DML membership legacy bypass or grants inflation                 | PASS local |
| SHIP-036 | client zone tariff owner and SQL injection cannot set authority             | PASS local |
| SHIP-037 | errors redacted no public Shipping quote checkout or address route          | PASS local |
| SHIP-038 | all preexisting module migrations and normative contracts preserved         | PASS local |
| SHIP-039 | changed price publication or concurrently exhausted kit fails atomically    | PASS local |
| SHIP-040 | CI isolated no secrets with preserved jobs and local owned cleanup          | PASS local |

SHIP-038 verifica hashes de fontes/migrations/normas e SHIP-040 inspeciona isolamento do job. Esses casos não substituem as execuções separadas de CP-01/02, Catalog, Pricing, Inventory, Orders, Quotes, Identity/Resend, PGSP, L0, INT-02, MRD e gates completos, relatadas no handoff. Os ramos digitais bloqueiam os ports Shipping e Profile postal para provar ausência de chamada. Casos de API comercial, Stripe, Supabase ou contratos futuros permanecem fora desta suíte.
