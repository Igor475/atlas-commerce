# AC-RENDER-TEST-001 — Plano de validação da hospedagem Render

> **Status:** plano de testes, **nenhum teste executado**. A decisão do fornecedor Render já foi tomada; os comportamentos e custos reais de serviços/planos precisam de verificação quando o backend existir.

| ID | Evidência a obter no ambiente futuro | Critério de aceite |
|---|---|---|
| RENDER-001 | Web Service Node recebe `PORT` e escuta `0.0.0.0` | API acessível via HTTPS Render sem porta fixa |
| RENDER-002 | HTTP liveness e readiness em deploy | Rota de readiness falha em dependência obrigatória indisponível, sem divulgar segredos |
| RENDER-003 | Plano Free: inatividade e cold start, **se usado** | Limitações documentadas; nenhuma promessa de latência/SLA ou job contínuo |
| RENDER-004 | Plano contínuo, **se necessário** | Serviço não depende de wake-on-request para fluxos temporais; custos registrados |
| RENDER-005 | Processo reinicia durante outbox pendente | Estado persiste em PostgreSQL; retry idempotente recupera após restart |
| RENDER-006 | Cron/worker executor opcional | Lease, dedup, alarme e execução separada da API medidos |
| RENDER-007 | Expiração durante pausa/restart | Revalidação com relógio DB; sem confirmar reserva expirada, ainda que job esteja atrasado |
| RENDER-008 | Stripe evento válido duplicado/fora de ordem | Assinatura, dedup, registro e processamento recuperável; ST-001–016 |
| RENDER-009 | Falha/timeout no refund externo | Chave estável, saldo pending reservado, reconciliação sem reembolso duplo |
| RENDER-010 | Conectividade do Supabase PostgreSQL | TLS, Supavisor session 5432 (ou ligação direta IPv6 provada) e pool total conforme instâncias; latência, saturação e falhas medidos |
| RENDER-011 | Segredos/test/live e acesso de dashboard | Variáveis privadas/rotações; nenhum segredo em Git, logs ou bundle Vercel |
| RENDER-012 | Tráfego Vercel ↔ Render | Cookie seguro, CORS, CSRF, proxy/origin decididos e AUTH-001–020 executados |
| RENDER-013 | R2 público vs privado | Preview liberada, arquivo integral privado, URLs de duração limitada, SA-009/010 |
| RENDER-014 | Backup/restore e deploy de migration | Restore isolado comprovado, contrato de schema e rollback/roll-forward documentados |
| RENDER-015 | Logs e monitoramento | Alertas para atraso outbox, refund incerto, erro de webhook e readiness; redaction testada |
| RENDER-016 | Orçamento/banda/infraestrutura | Plano, região, gastos estimados/observados, egress e eventuais limites anotados |

## Gates para Codex e deploy

1. **Antes do bootstrap NestJS:** permitir experimentos com configuração de porta, build, health e conexão sob variáveis de ambiente; não registrar segredo real no prompt.
2. **Antes de desenvolver autenticação:** decidir topologia Vercel/Render para cookies e CSRF (ADR-003); domínio próprio não é requisito para iniciar desenvolvimento, mas a estratégia de origens precisa ser coerente.
3. **Antes de Stripe + reservas:** usar Plano Render e processamento recuperável capazes de cumprir as garantias documentadas. Render Free não serve como único executor de cleanup/retry. ST/DB/RENDER devem ser exercitados.
4. **Antes de release público/real:** validações jurídicas, privacidade, restauração, incidentes, observabilidade e credenciais por ambiente; portfólio continua demo em test mode.

**Não executados:** RENDER-001–016, ST-001–016, DB-001–028, SA-001–012 e AUTH-001–020. Nenhum ambiente existente foi auditado para este pacote.

## Ratificação 2026-10-12 — Render Free + Supabase

- **RENDER-001–016 permanecem pendentes**, inclusive pause/resume/cold-start, webhook Stripe assinado, rate limit e fluxos de autenticação. A escolha Free não executa testes.
- A instância Free não garante dispatcher residente em memória, frequência de cleanup ou heartbeat de outbox. Expiração lógica é verificada por guarda DB, enquanto cleanup/retry só têm pontualidade garantida com executor independente comprovado.
- Provar e-mail de verificação/recovery por **HTTPS API**, pois a Render Free bloqueia saída SMTP 25/465/587; jamais usar credenciais em frontend/log.
- Acrescentar [SUPABASE-001–016](VALIDACAO-OPERACIONAL-SUPABASE.md) antes de fechar RENDER-010/014. A validação de banco no Supabase Free inclui projeto pausado, reconexão pooler, restore e quotas.
- Não tratar a Render Free ou o Supabase Free recomendado como infraestrutura apta a vendas e captura financeira real.
