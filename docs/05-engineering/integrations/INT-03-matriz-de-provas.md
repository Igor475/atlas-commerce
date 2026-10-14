# INT-03 — Matriz de aceite de integrações (planejada, ainda não executada)

> **Referência de ID:** `RSD-001–022`, `SUPL1-001–015`. Cada execução real precisa apontar commit, ambiente, comando/log higienizado, comportamento observado e limitação; não basta um teste unit ou inspeção visual.

## Resend / Identity Customer

| ID | Cenário | Esperado |
|---|---|---|
| RSD-001 | Default disabled | Sem chamadas à Resend, Identity continua 503 segura |
| RSD-002 | Credencial ausente, formato inválido ou perfil demo | Fail-closed e segredo não logado |
| RSD-003 | Endpoint HTTPS fixo | Sem HTTP nem custom endpoint controlado por cliente |
| RSD-004 | Remetente teste e destinatário diferente do permitido | Negar sem chamada externa |
| RSD-005 | Destinatário permitido/conta do Resend | Fake HTTP aceita; prova real depende opt-in e chave |
| RSD-006 | HTML/texto PT-BR | Escape correto de valores, links determinísticos e seguros |
| RSD-007 | Origem de link controlada por header | Rejeitar spoofing e URLs abertas |
| RSD-008 | Verify e recovery | Finalidade/TTL/use-once do token inalterados |
| RSD-009 | Mesmo outbox/intenção duas vezes | Chave de idempotência estável e sem duplicidade local |
| RSD-010 | Duas instâncias reclamam trabalho | SKIP LOCKED / fencing mantém um dono efetivo |
| RSD-011 | HTTPS 200/201 Resend | Registrar aceitação pelo provedor, NÃO entrega inbox |
| RSD-012 | HTTP 401/403 permanente | Segredo/domínio incorreto -> bloquear e observar sem retry cego |
| RSD-013 | HTTP 409 payload diferente | Conflito não gera nova chave automática |
| RSD-014 | HTTP 409 concorrente | Retry limitado/reconciliável |
| RSD-015 | HTTP 429 | Respeitar Retry-After, não floodar |
| RSD-016 | HTTP 5xx e timeout | Estado incerto seguro; tentativas limitadas |
| RSD-017 | Janela de idempotência >24h | Não reivindicar dedup externa eterna; sem envio cego |
| RSD-018 | Token vencido/invalido antes do dispatch | Não enviar token inútil nem registrar em claro |
| RSD-019 | Outbox/crash/restart | Recuperar sem deixar processamento infinito nem duplicar |
| RSD-020 | Log/trace/erro/resposta | Nenhuma chave/token/link de token/destinatário integral |
| RSD-021 | Sem domínio verificado | Não liberar envio a destinatários arbitrários nem auth pública |
| RSD-022 | Regressões de ID/PGSP/CI/audit | 22 ID, 16 PGSP e gates sem enfraquecimento |

## Supabase L1 (somente leitura)

| ID | Cenário | Esperado |
|---|---|---|
| SUPL1-001 | Falta consentimento remoto | Recusar sem socket remoto |
| SUPL1-002 | Projeto errado ou não confirmado | Recusar; nunca usar ERP |
| SUPL1-003 | Session pooler host/5432 | Endpoint real copiado do Dashboard, não inferido |
| SUPL1-004 | Username e role readonly errados | Recusar prova/resultado |
| SUPL1-005 | TLS inválido/hostname errado | Recusar conexão, sem downgrade |
| SUPL1-006 | Pool máximo/timeout/shutdown | Sem vazamento de conexões |
| SUPL1-007 | `SELECT 1` e metadados | Sem DML/DDL ou leitura PII |
| SUPL1-008 | Sessão read-only mas role DML | ROLE_UNSAFE, não considerar PASS |
| SUPL1-009 | Role superuser/membro/CREATE | ROLE_UNSAFE |
| SUPL1-010 | Data API expõe tabela sensível | Identificar e bloquear próxima etapa, não modificar remoto |
| SUPL1-011 | Supabase indisponível/pausado | Readiness false, live intacto |
| SUPL1-012 | Retorno após falha | Readiness converge sem bypass |
| SUPL1-013 | URL/secrets em logs | Nenhuma exposição, redaction testada |
| SUPL1-014 | CI sem cloud credentials | Passa com DB efêmero; sem banco remoto |
| SUPL1-015 | Authorization e evidências | Só marcar REMOTE PASS com consentimento e execução real |

## Adendo de trilhas independentes — 14/10/2026

Projeto Supabase existente **Atlas Commerce**, ref `bkxrsgryzkgpwgkngieh`, região
`sa-east-1`, conforme responsável e [INT-02.1](INT-02-1-postgresql-ci.md).
Data API desligada nesta data **conforme relato do responsável, não verificado
independentemente**; nenhum teste HTTP ou consulta remota foi feito nesta revisão.

- **L1-SQL estrita: PENDENTE.** SUPL1-001–015 acima e os códigos READONLY_PROVEN,
  ROLE_UNSAFE e demais resultados existentes não mudam. Catálogos remotos
  anteriores e testes locais históricos não comprovam SUPL1-015 nem MRD.
- **MRD: PROPOSTA / NÃO IMPLEMENTADA.** A matriz futura independente
  [MRD-001–016](INT-02-2-diagnostico-mediado-proposta.md#5-matriz-de-testes-futura-tudo-pendente)
  é governada pela [ADR-011](../../04-architecture/adrs/ADR-011-diagnostico-mediado-e-politica-l1.md).
  Todos os casos permanecem PENDENTES / NÃO EXECUTADOS; não substituem SUPL1.
- Aprovação documental, autorização para código, testes locais e autorização
  para provisionamento/prova remota são gates separados. Sem execução nesta tarefa.

## Ordem de saída (registro anterior preservado)

- INT-01: local fake PASS esperado; envio real só após usuário permitir, e-mail recebido não significa auth pública apta.
- INT-02: testes locais, seguida de autorização/referência/remoto READ ONLY, sem DDL. **Não executar duas trilhas na mesma tarefa Codex.**
- INT-03/futuro: migration e runtime write somente com plano e autorização específica; integração UI autenticada requer HOST-01.
