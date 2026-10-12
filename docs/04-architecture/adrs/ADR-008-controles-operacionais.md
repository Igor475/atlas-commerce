# ADR-008 — Segurança operacional, observabilidade e recuperação

> **Estado:** PROPOSTA, não aprovada nem implementada • **Origem:** DS-007/008/009, SEC-028–038, RNF-004/005/010/011/012.

## Contexto

O Atlas Commerce é um projeto de portfólio com Stripe em modo de teste, PostgreSQL e possível storage privado. Não existe ambiente público verificado ou worker aprovado. Segredos de Stripe (test/live e webhook) exigem separação e controle de acesso; dados pessoais, eventos PSP e documentos digitais exigem limites claros de exposição e retenção.

## Alternativas

A. Hospedagem gerenciada para frontend/API/DB com custo proporcional e mecanismos comprovados de backup, restore e monitoramento.  
B. VPS autogerenciada com maior controle, mas responsabilidade integral por patching, TLS, firewall, backups, rotação de segredos e resposta a incidentes.  
C. Cloud distribuída complexa desde o MVP, sem evidência de necessidade — rejeitada como default.

## Direção proposta (sem fixar fornecedor)

1. Ambientes local/teste e eventual deploy público segregados. Stripe **test keys** e webhook secret do destino de teste separados de quaisquer segredos live; sem inserir chaves em Git, documentação ou artefatos.
2. HTTPS para endpoints públicos; CSP/CORS/cookies conforme topologia aprovada na ADR-003; webhooks com raw body e assinatura; rotas de health detalhado/métricas protegidas.
3. Log estruturado com correlação e redaction; não registrar tokens, chaves, assinatura de webhook, URL privada assinada ou PII desnecessária. Auditoria de transições financeiras com IDs estáveis, ator técnico e resultado.
4. Postgres: backups automáticos, restauração exercitada, integridade de objetos do storage e plano para migrations/roll-forward. Valores numéricos RPO/RTO/SLO dependem do host e de requisitos aprovados.
5. Outbox/reconciliação Stripe e expiração não dependem exclusivamente de `setTimeout` ou processos voláteis. Estratégia de worker/jobs depende da ADR-007 e capacidade real de hospedagem.
6. CI com segredos mínimos, pin de dependências críticas, scan e gates pertinentes. Implantação pública exige revisão de segurança, incidente, retenção e licença dos ativos digitais.

## Gate de aprovação

Definir hospedagem e responsabilidades, política de segredos e rotação, estratégia de CI, observabilidade e métricas, retenção e LGPD, política de backups/restauração, alertas de refund incerto e outbox, métodos de hardening e evidência de controles. Referências: SA-011/012, SEC-031–038.

**Não há ambiente ou segurança operacional comprovados nesta fase documental.**
