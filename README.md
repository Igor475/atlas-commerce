# Atlas Commerce

### E-commerce B2C | Engenharia de Software & Arquitetura de Sistemas

O **Atlas Commerce** é um projeto de E-commerce B2C desenvolvido com foco na aplicação prática de princípios de **Engenharia de Software, Arquitetura de Software, Design de Sistemas e boas práticas de desenvolvimento Full Stack**.

A plataforma simula uma operação de comércio eletrônico do segmento editorial, contemplando a comercialização de livros físicos, e-books, revistas digitais e kits de produtos.

Mais do que desenvolver uma loja virtual funcional, o objetivo é demonstrar o ciclo completo de construção de um software, desde a **análise de requisitos e modelagem das regras de negócio até a implementação, testes, segurança, observabilidade e implantação**.

## Objetivos do projeto

- Aplicar metodologias e princípios de Engenharia de Software.
- Documentar requisitos funcionais, não funcionais e regras de negócio.
- Modelar processos, fluxos, casos de uso e diagramas arquiteturais.
- Projetar uma arquitetura modular, escalável e de fácil manutenção.
- Aplicar Domain-Driven Design (DDD), princípios SOLID e separação de responsabilidades.
- Desenvolver interfaces modernas, responsivas e acessíveis.
- Implementar práticas de segurança, integridade de dados e controle de acesso.
- Adotar testes automatizados, CI/CD e práticas de DevOps.
- Documentar decisões arquiteturais, trade-offs e evolução técnica do sistema.

## Escopo funcional

O projeto prevê os seguintes domínios:

- **Catálogo:** produtos físicos e digitais, categorias, autores e publicações.
- **Identidade e acesso:** autenticação, contas de clientes e permissões.
- **Carrinho e checkout:** composição de compras, cálculo de preços e descontos.
- **Estoque:** disponibilidade, reservas e movimentações.
- **Pedidos:** processamento, histórico e acompanhamento.
- **Pagamentos:** integração, confirmação, conciliação e reembolsos.
- **Produtos digitais:** biblioteca, direitos de acesso e distribuição protegida.
- **Administração:** gerenciamento operacional e auditoria.

## Arquitetura e tecnologias

A arquitetura será planejada a partir dos requisitos de negócio, priorizando um **monólito modular**, separação de domínios, consistência transacional, segurança e evolução sustentável.

As tecnologias previstas incluem TypeScript, Next.js, React, NestJS, PostgreSQL, Redis, Docker e GitHub Actions. As escolhas definitivas serão justificadas por decisões arquiteturais documentadas (ADRs).

## Documentação

A documentação técnica é parte fundamental do projeto e será mantida versionada junto ao código-fonte.

| Documento | Descrição |
|---|---|
| [Regras de Negócio](docs/02-business-requirements/REGRAS-DE-NEGOCIO.md) | Especificação inicial do domínio e das regras de negócio. |
| [Políticas Críticas v0.2](docs/02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md) | Complemento das regras de reservas, pagamentos, reembolsos e kits. |
| [Processos e Diagramas](docs/03-business-processes/README.md) | Casos de uso, processos, sequências e máquinas de estados. |
| [Políticas Consolidadas](docs/03-business-processes/POLITICAS-CONSOLIDADAS.md) | Definições operacionais das políticas críticas do E-commerce. |

Novos documentos, diagramas e decisões arquiteturais serão adicionados conforme a evolução do projeto.

## Status do desenvolvimento

**Fase atual: Análise e documentação de negócio.**

- [x] Especificação inicial das regras de negócio (v0.1).
- [ ] Modelagem dos processos e diagramas.
- [ ] Definição da arquitetura e decisões técnicas.
- [ ] Estruturação do ambiente de desenvolvimento.
- [ ] Implementação do backend.
- [ ] Implementação do frontend.
- [ ] Testes, segurança e validação de performance.
- [ ] Implantação e documentação final.

## Sobre o projeto

Este é um projeto independente, desenvolvido para fins educacionais e de portfólio profissional, com o objetivo de demonstrar conhecimentos em **Engenharia de Software, Arquitetura de Sistemas e Desenvolvimento Full Stack**.

As funcionalidades, tecnologias e decisões arquiteturais serão evoluídas e documentadas progressivamente, buscando refletir práticas aplicáveis ao desenvolvimento de sistemas reais.