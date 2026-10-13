# Atlas Commerce

### E-commerce B2C | Engenharia de Software & Arquitetura de Sistemas

O **Atlas Commerce** é um projeto de portfólio que simula o comércio editorial de **livros físicos, e-books, revistas digitais e kits**, demonstrando como requisitos, regras de negócio, arquitetura, segurança, implementação, testes e operação são conectados e verificados ao longo do ciclo de vida de software.

O objetivo não é apenas construir uma loja virtual: é registrar decisões, trade-offs, cenários de falha, segurança *by design* e evidências reproduzíveis de engenharia. O projeto é fictício; os requisitos são **propostas**, não políticas de uma empresa real.

## Objetivos de engenharia

- Modelar domínios e invariantes de preço, estoque, pagamento, reembolso, conteúdo digital e kits.
- Demonstrar DDD, separação de responsabilidades e monólito modular proporcional ao problema.
- Planejar autenticação, autorização, privacidade e segurança de pagamentos desde a descoberta.
- Documentar processos, máquinas de estados, contratos e fronteiras de confiança.
- Implementar integridade transacional, idempotência, conciliação e processamento recuperável.
- Produzir testes unitários, de integração, E2E, concorrência, segurança e carga.
- Justificar escolhas em ADRs, com CI/CD, observabilidade e deploy de demonstração.

## Escopo funcional

Catálogo editorial; identidade e acesso; carrinho/checkout; preços e cupons; reserva e controle de estoque; pedidos; pagamentos em **sandbox**; direitos digitais; remessa física; pós-venda e backoffice com auditoria. Não haverá marketplace nem coleta direta de dados completos de cartão no MVP.

## Arquitetura pretendida

**Monólito modular**, com stack provisória TypeScript, Next.js, React, NestJS, PostgreSQL, Redis, Docker e GitHub Actions. Arquitetura concreta, serviços externos e fluxos de implantação serão justificados em ADRs, e não presumidos pela lista de tecnologias.

## Documentação versionada

| Artefato | Propósito / estado |
|---|---|
| [Índice e hierarquia de documentos](docs/README.md) | Versões, fontes de referência e como tratar divergências |
| [Regras de negócio — AC-BRD-001 v0.2.1](docs/02-business-requirements/REGRAS-DE-NEGOCIO.md) | RN-001–070; RF, RNF e CA-001–010, incluindo ligações de segurança |
| [Adendo de políticas críticas — v0.2](docs/02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md) | RN-071–094: reservas, pagamentos tardios, refunds e kits |
| [Processos e diagramas — Fase 02](docs/03-business-processes/README.md) | UC, PR, SQ, SM e BPMN; modelos criados, ainda para revisão |
| [Políticas consolidadas — PC-01–04](docs/03-business-processes/POLITICAS-CONSOLIDADAS.md) | Semântica operacional das regras críticas propostas |
| [Tabelas de transição](docs/03-business-processes/TABELAS-DE-TRANSICAO.md) | Guardas e transições de estados |
| [Cenários críticos CA-011–026](docs/03-business-processes/CENARIOS-DE-ACEITE-v0.2.md) | Verificação futura de reserva, atraso, refund e kits |
| [Matriz de rastreabilidade](docs/03-business-processes/MATRIZ-DE-RASTREABILIDADE.md) | RN/CA ↔ SEC/SA ↔ diagramas ↔ evidência futura |
| [Integração com segurança](docs/03-business-processes/INTEGRACAO-SEGURANCA.md) | Interfaces entre processos e controles; lacunas dos desenhos conceituais |
| [Especificação de segurança — AC-SEC-001 v0.2](docs/07-security/security-requirements.md) | SEC-001–038, SA-001–012 e DS-001–009 |
| [Roteiro de segurança](docs/07-security/README.md) | O que deve ser modelado, implementado e comprovado |

Documentos e diagramas são **artefatos de projeto**, não prova de controles implementados, conformidade legal ou testes concluídos. Em políticas de negócio conflitantes, revisar o [índice de precedência](docs/README.md) e registrar a decisão antes de implementar.

## Estado do projeto (12/10/2026)

- [x] Descoberta inicial e BRD v0.1.
- [x] Diagramas e políticas críticas v0.2 **elaborados** (não homologados).
- [x] Especificação de segurança **proposta** e vinculada aos requisitos.
- [ ] Confirmar provedor de pagamentos, alçadas e políticas jurídicas pendentes.
- [ ] Revisar/aprovar requisitos e coerência entre diagramas e transições.
- [ ] Completar DFD/threat model, ADRs e matriz de autorização.
- [ ] Implementar backend, frontend, testes de comportamento e validações de segurança.
- [ ] Exercitar CI/CD, operações, deploy, backup/restore e relatórios de evidência.

## Sobre

Projeto independente e educacional, destinado ao GitHub e LinkedIn. Não oferece pagamentos reais, não declara certificação de segurança e não representa uma solução pronta para produção.

## Desenvolvimento local

O bootstrap técnico usa pnpm Workspaces com `storefront`, `admin` e `api` separados. Consulte [DEVELOPMENT.md](DEVELOPMENT.md) para versões, portas, comandos e limitações atuais.
