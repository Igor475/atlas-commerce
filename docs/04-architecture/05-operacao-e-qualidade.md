# 05 — Implantação, confiabilidade, segurança operacional e qualidade

**Status:** guia de trade-offs — nenhum ambiente de produção foi criado ou auditado.

## Topologia de deploy inicial (condicional)

- `storefront` e `admin` como duas interfaces distintas ou um frontend unificado, decidido por ADR; edge/CDN somente para estáticos públicos.
- `api` como um serviço NestJS modular; readiness exige conectividade real com dependências mandatórias, liveness não consulta rede externa cara.
- `PostgreSQL`: dados transacionais, `outbox`, inbox, sessões/identidades (caso escolhido); pool dimensionado com métricas e limites reais.
- `object storage`: prévias públicas isoladas de arquivos integrais privados, URL temporária após autorização. CORS não autoriza acesso.
- `worker` separado e Redis/queue **somente** se a hospedagem e a taxa de jobs os justificarem. Alternativa: scheduler confiável e jobs duráveis em banco, com lock/lease + observabilidade. Não usar memória volátil como garantia de entrega.

## Telemetria e operações

| Sinal | Instrumentação necessária | Segurança operacional |
|---|---|---|
| Checkout | tempo cotação/reserva, tentativas idempotentes, rejects e expirações | IDs opacos, sem token/PII no log |
| Pagamentos | PSP retries, autenticidade, latência de conciliação, pagamentos tardios, refunds incertos | Webhook bruto só quando justificado e protegido |
| Inventário | concorrência, tempo de lock, reserva confirmada/expirada, inconsistências | trilha auditável de ajuste |
| Mídia | autorização negada, erro de URL assinada, arquivo indisponível, downloads | nunca logar URL assinada/token |
| Operação | liveness/readiness, fila/outbox pendente, backup/restore, falhas de integração | alertas acionáveis, mínimo privilégio |

## Qualidade e validação futura

- CI: `lint`, typecheck, testes, audit de dependências e de segredos; revisão de permissões do workflow e lockfile. Nenhum escaneamento executado agora.
- Testes de arquitetura: proibir imports entre infra e domínio ao contrário, ciclos e acesso direto a internals de outro módulo.
- E2E: CA-001–026, SA-001–012, incluindo falhas de concorrência e PSP fake/sandbox.
- Perf: baseline p50/p95/p99 sob cenários e volume definidos; não prometer capacidade sem carga medida.
- Backup/restore: testar restauração em ambiente segregado, integridade das referências digitais e dados; RPO/RTO dependem de fornecedor e decisão documentada.
- Deploy: TLS, secrets segregados, produção sem debug/cors amplo, migrações com plano de rollback/roll-forward; política de release e observabilidade.

**Bloqueios de release real:** escolha/contrato PSP, autorizações de conteúdo, fiscal/jurídico quando aplicável, retenção/LGPD, testes de segurança e restore. O projeto permanece uma demonstração/sandbox.

## Decisão operacional relacionada

[ADR-008 — Controles operacionais](adrs/ADR-008-controles-operacionais.md) documenta o baseline proposto de ambientes, backups, monitoramento, retenção e segurança do deploy; permanece **proposta** até avaliação do ambiente real.
