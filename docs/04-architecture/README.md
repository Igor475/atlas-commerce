# AC-ARCH-001 — Fase 03: Arquitetura de Software e Segurança

> **Versão:** 0.1.0 • **Estado:** proposta para revisão — **não implementada, não homologada** • **Data:** 12/10/2026  
> **Baseline lida:** `Igor475/atlas-commerce`, branch `main`, commit `42dcc94dcdb72eba058c16a3f9f48c65f5b34421`.

## Finalidade e contratos de entrada

Conectar os requisitos do Atlas Commerce a um desenho técnico modular, rastreável e proporcional a um **e-commerce editorial B2C fictício, de um só vendedor**, com livros físicos, e-books, revistas digitais e kits. Este material **não** contém código, schema de banco, serviços deployados, promessas de SLA, nem evidências de testes.

**Fontes normativas, que NÃO são substituídas por este pacote:**

1. [AC-BRD-001 v0.2.1 — BRD](../02-business-requirements/REGRAS-DE-NEGOCIO.md): RN-001–070, RF-001–015, RNF-001–012, CA-001–010.
2. [Adendo v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md): RN-071–094.
3. [Políticas PC-01–04](../03-business-processes/POLITICAS-CONSOLIDADAS.md), [transições](../03-business-processes/TABELAS-DE-TRANSICAO.md) e [CA-011–026](../03-business-processes/CENARIOS-DE-ACEITE-v0.2.md).
4. [AC-SEC-001 v0.2](../07-security/security-requirements.md): SEC-001–038, SA-001–012, DS-001–009.
5. [Critérios externos](../03-business-processes/CRITERIOS-DECISOES-EXTERNAS.md) e [decisões pendentes](../03-business-processes/DECISOES-PENDENTES.md).

Se houver conflito, abrir ADR/decisão, **corrigir em todas as fontes** e não implementar a interpretação mais conveniente. Um diagrama não se sobrepõe a uma transição de estado ou a um controle SEC.

## Catálogo — arquivos independentes

| Grupo | Arquivo | Responsabilidade |
|---|---|---|
| Visão | [Princípios e limites](01-principios-e-contexto.md) | Escopo, hipóteses, qualidade e arquitetura alvo |
| Módulos | [Mapa de módulos e contratos](02-modulos-e-fronteiras.md) | Ownership, comunicação e isolamento do monólito |
| Integridade | [Transações e invariantes](03-transacoes-e-consistencia.md) | Estoque, checkout, PSP, refund, kits, outbox |
| Dados | [Modelo lógico e retenção](04-dados-e-persistencia.md) | Agregados e identidade de entidades, sem migrations |
| Operação | [Deploy e observabilidade](05-operacao-e-qualidade.md) | Evolução gradual, operação e evidências |
| C4 | [C4-01 Contexto](c4/C4-01-contexto.md) · [C4-02 Contêineres](c4/C4-02-conteineres.md) · [C4-03 Componentes](c4/C4-03-componentes.md) | Vistas C4 adaptadas e fontes DOT/SVG/PNG separadas |
| Segurança | [Índice](security/README.md) · [matriz de autorização](security/authorization-matrix.md) · [ameaças](security/threat-model.md) | Permissões e risco por fronteira de confiança |
| DFD | [DFD-01 Identidade](security/DFD-01-identidade.md) · [DFD-02 Checkout](security/DFD-02-checkout-pagamento.md) · [DFD-03 Conteúdo digital](security/DFD-03-entitlements.md) | Fontes DOT + SVG + PNG individuais |
| Sequências | [Checkout/compensação](sequences/SEQ-01-pagamento-compensacao.md) · [Refund](sequences/SEQ-02-reembolso.md) | Mermaid textual e guardas; não substituem SQ-01–05 |
| Decisões | [Índice ADR](adrs/README.md) | Registro de alternativas e bloqueios |
| Plano de verificação | [Rastreabilidade e gates](06-rastreabilidade-e-gates.md) | Critérios para avançar à implementação Codex |

Cada `.dot` é uma **fonte editável**, com SVG e PNG derivados do mesmo arquivo usando Graphviz. As imagens são representações arquiteturais com **semântica C4 adaptada** (não uma certificação de conformidade visual C4). Os arquivos `.mmd` são fontes textuais para o renderizador Mermaid, sem imagem exportada neste pacote.

## Decisões e nível de compromisso

**Diretrizes já suportadas pelo escopo:** monólito modular de um vendedor, checkout financeiro em sandbox, banco relacional transacional, isolamento de conteúdos digitais privados, autenticação/autorização no backend. 

**Propostas de design, não contratos implementados:** `apps/storefront`, `apps/admin`, `apps/api`; possível processo de worker; PostgreSQL como fonte de verdade; outbox relacional para efeitos recuperáveis; Redis/fila somente quando houver justificativa de processamento; object storage S3-compatible opcional por integração; observabilidade sem PII.

**Decisões abertas:** DA-006/DS-004 (PSP, sessão 40/30/5 e métodos); DA-009/DS-003 (aprovações e alçadas); DS-001/002 (sessão/MFA); DS-005/006 (storage e uploads); DS-007/008 (retenção/ambiente); DS-009 (perfil ASVS); ORM e deploy exatos.

## Critério de saída — Fase 03

- [x] **Proposta documental inicial** de C4, módulos, transações, DFDs, ameaças, autorização e ADRs elaborada.
- [ ] Revisar desenho e ADRs com o projeto, registrar aprovações e atualizar divergências encontradas.
- [ ] Testar em sandbox se o PSP admite a política de expiração **absoluta**: reserva 40 min; sessão externa até 30 min; término >=5 min antes da reserva; sem permitir métodos incompatíveis.
- [ ] Validar matriz de papéis/ações, recuperação de sessão, MFA e alçadas; definir responsáveis.
- [ ] Formalizar autorização de uso dos ativos digitais, termos, retenção, limites operacionais e ambiente de deploy.
- [ ] Revisar em modelador os BPMNs legados da Fase 02 e manter fontes/imagens sincronizadas se mudarem.
- [ ] Transformar decisões aprovadas em contratos testáveis para o Codex; **sem iniciar código a partir de ADRs pendentes**.

**Execução futura:** prompts do Codex serão preparados por módulo/etapa quando o usuário solicitar a implementação, baseados no GitHub atualizado, escopo preciso, alterações permitidas, testes e relatório de evidências. **Nenhum prompt de implementação nem código é entregue agora.**
