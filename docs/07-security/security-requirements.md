# Atlas Commerce — Especificação de Requisitos de Segurança

> **Identificador:** AC-SEC-001  
> **Versão:** 0.2.0 — sincronização com políticas críticas da Fase 02  
> **Data:** 12/10/2026  
> **Estado:** Planejado; nenhum controle declarado implementado ou verificado  
> **Referência:** `docs/02-business-requirements/REGRAS-DE-NEGOCIO.md` (AC-BRD-001, v0.2.1)  
> **Localização no repositório:** `docs/07-security/security-requirements.md`  
> **Complementos obrigatórios de leitura:** `docs/02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md` e `docs/03-business-processes/POLITICAS-CONSOLIDADAS.md`

## 1. Objetivo e limites

Este documento especializa os requisitos de segurança do Atlas Commerce, um e-commerce B2C fictício de livros físicos, e-books, revistas digitais e kits. Complementa regras de negócio, não as substitui, e foi organizado com base na skill fornecida `engenharia-software-pragmatica` (arquivos `SKILL.md` e referências de segurança, arquitetura, dados, filas e operação).

**Regras de interpretação:**

- **[MVP]** controle obrigatório para disponibilizar a funcionalidade indicada em um ambiente demonstrativo conectado à Internet. **[COND]** aplicar somente se a superfície existir ou se a análise de risco justificar. **[EVOL]** evolução após MVP sem reduzir os controles obrigatórios do MVP.
- **P0:** alta prioridade ligada à proteção de conta, dados, pagamentos, pedidos, estoque ou administração. **P1:** prioridade média/condicional, sem compromisso automático de entrega.
- **Proposto** não é sinônimo de **implementado**, **testado**, **configurado** ou **efetivo**. A evidência deve distinguir código, ambiente, provedor, processo e runtime.
- Não há multi-tenant, marketplace, transação monetária real nem armazenamento de cartão no MVP. Requisitos de tenants, payout, fraude bancária e PCI aplicáveis à operação real serão reavaliados se o escopo mudar.
- Evitar controle indiscriminado: a decisão arquitetural deverá justificar mecanismos específicos, inclusive MFA, CAPTCHAs, WAF, circuit breakers, criptografia adicional e revisão dupla, pelo risco identificado.

### 1.1 Fontes relacionadas e prioridade dos contratos

- A [especificação de negócio AC-BRD-001 v0.2.1](../02-business-requirements/REGRAS-DE-NEGOCIO.md) mantém RN-001–070 e CA-001–010.
- O [adendo AC-BRD-001-A v0.2](../02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md) apresenta RN-071–094. Sua operação é descrita em [PC-01–04](../03-business-processes/POLITICAS-CONSOLIDADAS.md), [transições](../03-business-processes/TABELAS-DE-TRANSICAO.md) e [CA-011–026](../03-business-processes/CENARIOS-DE-ACEITE-v0.2.md).
- Este documento **não substitui nem enfraquece** regras de negócio/segurança ou direitos legais. Em conflito, registrar decisão em DA/DS/ADR e **não implementar com base em suposição**.
- Valores de TTL e fluxo do PSP são **propostas condicionadas à DA-006 / DS-004**. Não declarar o pagamento sandbox homologado sem verificar capacidades reais.

## 2. Ativos, fronteiras e atores

| Ativo / operação | Risco principal | Fronteira a avaliar |
|---|---|---|
| Conta, credenciais e sessões | Sequestro, replay, escalonamento de privilégio | Browser → API → provedor de e-mail |
| Pedidos, endereços e histórico | IDOR/BOLA, vazamento de PII | Cliente → API → banco; atendimento → backoffice |
| Preços, cupons e estoque | Manipulação, race condition, abuso | Carrinho/checkout → domínio → PostgreSQL |
| Pagamentos, reembolsos e reconciliação | Evento falso, duplicidade, fraude | Provedor → webhook → API → workers |
| Biblioteca e arquivos digitais | Download indevido, links compartilhados | API → object storage/CDN → browser |
| Catálogo, capas e PDFs de prévia | Upload malicioso, XSS, parser/SSRF | Backoffice → upload/processamento → storage |
| Credenciais técnicas e infraestrutura | Vazamento, abuso de privilégios | CI/CD → infraestrutura; API → serviços externos |
| Logs, relatórios e exportações | Vazamento secundário e acesso excessivo | App → observabilidade; backoffice → arquivo/export |

A modelagem de ameaças detalhada será produzida em `docs/07-security/threat-model.md`, com ativos, atores, caminhos de ataque, probabilidade/impacto qualitativos, controles e risco residual.

## 3. Requisitos de segurança detalhados

### 3.1 Identidade, sessões e autorização

| ID | Obrigação verificável | Pri. / Fase | Ligação de domínio |
|---|---|---|---|
| SEC-001 | O servidor deve autenticar cada operação privada, rejeitando credenciais ausentes, inválidas, expiradas ou revogadas. | P0 / MVP | RN-009, RN-010 |
| SEC-002 | O servidor deve autorizar ação e recurso por titularidade e permissão, inclusive em listas, buscas, downloads, exportações e mudanças de estado; IDs e controles do frontend não autorizam. | P0 / MVP | RN-009, RN-014, RN-039, RN-064 |
| SEC-003 | O backoffice deve adotar permissões granulares e mínimo privilégio para catálogo, estoque, atendimento, financeiro e administração, com matriz de ações aprovada. | P0 / MVP | RN-029, RN-064–066 |
| SEC-004 | Contas privilegiadas devem exigir MFA adequado ao risco; cadastro, recuperação, mudança e revogação de fatores não podem permitir bypass. | P0 / MVP | RN-013, RN-064 |
| SEC-005 | Operações financeiras/administrativas de alto impacto devem avaliar reautenticação recente, step-up, limites por função e/ou dupla aprovação conforme risco e volume; decisões documentadas. | P1 / COND | RN-029, RN-047, RN-064 |
| SEC-006 | Senhas gerenciadas pela aplicação devem usar função apropriada (ex.: Argon2id com custo parametrizado), nunca plaintext, hash rápido genérico ou armazenamento reversível. | P0 / MVP | RN-013 |
| SEC-007 | O sistema deve definir criação, rotação/renovação, expiração, revogação, logout e invalidação das sessões; cookies de autenticação devem ter atributos adequados. | P0 / MVP | RN-009, RN-013 |
| SEC-008 | Tokens de verificação, recuperação e convites devem possuir entropia, TTL, finalidade específica, proteção contra replay e uso único onde necessário. | P0 / MVP | RN-013 |
| SEC-009 | Cadastro, login, recuperação e reenvio devem mitigar brute force, credential stuffing e enumeração de contas com respostas seguras e controles de abuso proporcionais. | P0 / MVP | RN-013 |

### 3.2 Interface pública, entradas e integrações

| ID | Obrigação verificável | Pri. / Fase | Ligação de domínio |
|---|---|---|---|
| SEC-010 | Validar no servidor path/query/body/header, tamanhos, tipos, limites de paginação e campos permitidos; impedir mass assignment e uso inseguro de consultas/comandos. | P0 / MVP | RN-017, RN-032 |
| SEC-011 | Proteger superfícies de navegador de XSS e, quando houver credenciais enviadas automaticamente, CSRF; configurar CORS, cookies e headers relevantes conforme arquitetura. | P0 / MVP | RN-009, RN-014 |
| SEC-012 | Uploads de capas, PDFs e mídia editorial devem ter autorização, limites de tamanho/quantidade, validação de tipo/conteúdo, nomes seguros e isolamento de arquivos privados. | P0 / MVP, se uploads | RN-006, RN-051 |
| SEC-013 | Qualquer URL de origem externa processada pelo servidor deve prevenir SSRF e acesso a redes internas/metadata, inclusive por redirects, DNS e protocolos não permitidos. | P1 / COND | Catálogo, importação/preview |
| SEC-014 | Rotas de administração, documentação técnica, health detalhado, métricas, debug, jobs e endpoints internos devem ter exposição e autorização próprias; CORS não substitui autorização. | P0 / MVP | RN-064–066 |
| SEC-015 | Operações públicas suscetíveis a abuso devem ter limites aplicáveis por identidade/contexto, além de proteção de infraestrutura quando exigida; IP informado por proxy só é confiável sob configuração verificada. | P0 / MVP | Cadastro, login, checkout |
| SEC-016 | Chamadas externas devem ter timeout e regras claras de retry/idempotência e falha segura; falha externa não pode autorizar operação de negócio indevida. | P0 / MVP | RN-037, RN-070 |

### 3.3 Checkout, preços, estoque, pagamentos e reembolsos

| ID | Obrigação verificável | Pri. / Fase | Ligação de domínio |
|---|---|---|---|
| SEC-017 | Total, itens, descontos, frete, elegibilidade e moeda do checkout devem ser derivados e validados no servidor; modificações do browser jamais determinam a cobrança. | P0 / MVP | RN-016–023, RN-032 |
| SEC-018 | Resgate de cupom e reserva de estoque devem preservar limites e invariantes por transação/constraint/operação atômica sob concorrência, inclusive kits; relógio do banco e disputa confirmação/expiração obedecem RN-071–076. | P0 / MVP | RN-019–021, RN-024–031, RN-071–076, RN-089 |
| SEC-019 | Chaves de idempotência de checkout devem ter escopo (ator/operação), corpo/identidade da tentativa e política de retenção; repetição idêntica não pode criar efeitos adicionais. | P0 / MVP | RN-033–034 |
| SEC-020 | Webhooks devem validar autenticidade conforme integração escolhida (ex.: assinatura sobre payload original), identificar provedor/conta, conferir pedido/valor/moeda e tratar replay, duplicidade e ordem; 2xx por evento repetido pressupõe verificação de autenticidade e persistência segura conforme contrato PSP. | P0 / MVP | RN-041–045, RN-077, RN-080 |
| SEC-021 | Estados de pedido, pagamento e reserva só evoluem por transições verificadas; pagamento válido sem alocação fica em `PAYMENT_REVIEW`, sem reativar reserva ou iniciar fulfillment/direitos de pedido misto; aplicar compensação RN-078. | P0 / MVP | RN-031, RN-035–038, RN-041–046, RN-073–080, RN-091 |
| SEC-022 | Solicitação/aprovação/execução de reembolso exige identidade, permissão financeira apropriada, limites por captura considerando saldo pendente reservado, chave idempotente estável, trilha de auditoria; timeout ambíguo não autoriza segunda devolução. | P0 / MVP | RN-047–048, RN-058–063, RN-081–087, RN-090, RN-093 |
| SEC-023 | Integração de pagamento deverá utilizar sandbox e fluxo hospedado ou equivalente sem coletar PAN/CVV no Atlas; avaliar escopo PCI DSS conforme desenho efetivo da integração. | P0 / MVP | Restrição de escopo, RN-041–048 |
| SEC-024 | Conciliação, expiração, compensação e replay toleram reexecução sem conceder estoque ou acesso indevido. Operações externas não correm dentro da transação local; estado ambíguo deve permanecer rastreável até confirmação. | P0 / MVP | RN-027–031, RN-043–046, RN-070, RN-071–084, RN-094 |

### 3.4 Conteúdo digital e dados pessoais

| ID | Obrigação verificável | Pri. / Fase | Ligação de domínio |
|---|---|---|---|
| SEC-025 | Direito digital é autorizado por usuário, item, licença e estado antes de cada entrega protegida; kit misto requer pagamento comprovado e alocação física integral, nunca mera confirmação da cobrança ou URL conhecida. | P0 / MVP | RN-014, RN-049–054, RN-079, RN-087, RN-091 |
| SEC-026 | URLs temporárias devem ser emitidas apenas após autorização, com validade curta e escopo apropriado. Uma URL assinada pode ser reutilizada/compartilhada enquanto válida; não representa DRM nem revogação instantânea. | P0 / MVP | RN-051–052 |
| SEC-027 | Prévias públicas e mídias completas devem ter recursos e políticas de armazenamento separados; não promover arquivo comercial privado a conteúdo de CDN público. | P0 / MVP | RN-006, RN-051 |
| SEC-028 | Endereços, contatos, histórico, relatórios e exports devem ter controle de acesso por função/finalidade e compartilhamento minimizado com integrações de frete/atendimento. | P0 / MVP | RN-009, RN-039, RN-067–069 |
| SEC-029 | Dados pessoais devem ter inventário, finalidade, retenção, exclusão/anonimização quando cabíveis e tratamento rastreável de solicitações; conservação legal prevalece quando aplicável. | P0 / MVP | RN-067, RN-069 |
| SEC-030 | Logs, traces, analytics, mensagens de erro, filas e relatórios não podem conter tokens, segredos nem dados pessoais/financeiros desnecessários; eventos críticos devem manter correlação sem expor o conteúdo sensível. | P0 / MVP | RN-040, RN-065, RN-069 |

### 3.5 Infraestrutura, operações, ciclo de desenvolvimento e evidências

| ID | Obrigação verificável | Pri. / Fase | Ligação de domínio |
|---|---|---|---|
| SEC-031 | Produção pública deve utilizar transporte seguro para browser e dependências conforme risco, com validação de certificado e política adequada de HTTPS/TLS; configuração local pode ser distinta. | P0 / MVP público | RNF-001 |
| SEC-032 | Segredos/chaves devem permanecer fora de código, bundles, Git e logs, com isolamento por ambiente, privilégio mínimo, processo de rotação e resposta a vazamento. | P0 / MVP | RN-066, RNF-001 |
| SEC-033 | Infraestrutura e CI/CD devem restringir permissões, tokens de pipeline, artefatos e deploys; escanear dependências e segredos, avaliar scripts de instalação e definir triagem de achados. | P0 / MVP público | RNF-001, RNF-011 |
| SEC-034 | Workers, filas e reprocessamento devem validar mensagens, restringir consumidores e replay, proteger payloads e persistir deduplicação/idempotência conforme criticidade. | P0 / MVP, se workers | RN-043, RN-070 |
| SEC-035 | Backup e restore de banco, mídia e configurações críticas devem ter procedimentos documentados e restauração exercitada; RPO/RTO serão definidos conforme criticidade e orçamento. | P0 / MVP público | RNF-010 |
| SEC-036 | Incidentes devem possuir processo de detecção, contenção, revogação, investigação, recuperação e comunicação; logs de segurança e alertas devem ser acionáveis. | P1 / MVP público | RN-065, RNF-004 |
| SEC-037 | Revisões devem testar segurança por comportamento, inclusive casos negativos e legítimos, distinguindo evidência do código, da configuração, da infraestrutura e do provedor. | P0 / MVP | RNF-001, RNF-008 |
| SEC-038 | A configuração de produção deve evitar defaults inseguros (debug, CORS amplo, cookies fracos, secrets de desenvolvimento, rotas operacionais abertas) e rejeitar configuração crítica inválida quando necessário. | P0 / MVP público | RNF-001, RNF-010 |

### 3.6 Requisitos de aplicação das políticas críticas da Fase 02 (sem duplicar IDs)

| Política | Condição obrigatória de segurança | IDs existentes | Cenários de negócio |
|---|---|---|---|
| PC-01 (reserva) | Tempo do banco, transição atômica, 40 min propostos, sessão PSP até 30 min e encerramento 5 min antes; recusar incompatibilidade | SEC-016, SEC-018, SEC-020, SEC-021, SEC-024 | CA-011–014 |
| PC-02 (pagamento tardio) | Aceitar fato financeiro válido, mas impedir entrega/benefício sem alocação; compensar integralmente via reembolso idempotente no MVP | SEC-020–025 | CA-015–017, CA-024 |
| PC-03 (refund) | Autorização financeira distinta, saldo atomizado (`captured - succeeded - reserved_pending`), chave estável e reconciliação em timeout | SEC-003, SEC-005, SEC-022, SEC-024, SEC-030 | CA-018–021 |
| PC-04 (kits) | Validar composição imutável e reserva all-or-nothing; entitlements só após alocação integral; não automatizar estorno parcial do kit | SEC-017, SEC-018, SEC-021, SEC-022, SEC-025 | CA-022–026 |

**Contrato de autoridade do pagamento:** resposta de navegador, redirect, `2xx` de criação de sessão e webhook não verificado não são prova de quitação. A validação/conciliação ocorre no contexto de Pagamentos; componentes de checkout e fulfillment consomem resultados persistidos e autorizados.

**Risco de desenhos:** as sequências SQ-01–SQ-05 são conceituais. A SQ-05 já representa o provedor notificando o módulo Pagamentos, que autentica e valida assinatura, identidade, valor e moeda, deduplica e persiste os eventos financeiros. A confirmação do pagamento não dispensa a validação transacional da reserva; fulfillment e direitos digitais dependem das condições de negócio aplicáveis, inclusive alocação física completa no kit misto. O detalhamento arquitetural, a implementação e os testes permanecem pendentes para a Fase 03.

## 4. Cenários de aceitação de segurança iniciais

| Caso | Dado / ação de teste | Resultado obrigatório | Requisitos |
|---|---|---|---|
| SA-001 — IDOR em pedidos | Cliente A solicita pedido/endereço de cliente B por ID conhecido | Servidor nega sem divulgar conteúdo; acesso de B ao próprio recurso segue válido | SEC-001, 002, 028 |
| SA-002 — Backoffice e privilégio | Operador de catálogo tenta reembolsar pedido | Operação negada e auditável; operador financeiro autorizado segue fluxo legítimo | SEC-003, 005, 022 |
| SA-003 — Sessão revogada | Conta faz logout global e reutiliza refresh token anterior | Renovação negada; demais sessões legítimas observam política de revogação | SEC-007 |
| SA-004 — Reset repetido | Mesmo token de recuperação é usado duas vezes | Primeira ação válida é atômica; reaproveitamento é negado | SEC-008 |
| SA-005 — Preço adulterado | Cliente modifica preço/total/cupom no corpo do checkout | Servidor recalcula ou recusa; nenhum pedido usa valor manipulado | SEC-010, 017 |
| SA-006 — Estoque último SKU | Dois checkouts concorrem pela última unidade física ou componente de kit | No máximo a capacidade vendável é reservada, sem estoque negativo | SEC-018, 024 |
| SA-007 — Webhook falso/duplicado | Evento sem assinatura válida, repetido ou fora de ordem | Falso é recusado; repetição não duplica compra, estoque ou direito digital | SEC-020, 021, 024 |
| SA-008 — Reembolso repetido | Duas solicitações concorrentes tentam superar saldo reembolsável | Limite monetário preservado; não há duplo reembolso autorizado | SEC-022, 024 |
| SA-009 — Biblioteca de outro cliente | Cliente A tenta arquivo adquirido somente por B | Servidor nega acesso; o acesso válido de B permanece funcional | SEC-025–027 |
| SA-010 — Upload editorial | Operador tenta PDF/arquivo acima do limite ou tipo não permitido | Upload negado/isolado; arquivo aceito é tratado com segurança | SEC-012, 027 |
| SA-011 — Exposição de logs | Simular login e falha de pagamento com token/dados pessoais no request | Resposta e telemetria não expõem tokens/segredos e minimizam PII | SEC-030 |
| SA-012 — Recuperação operacional | Restaurar backup em ambiente controlado com dependências documentadas | Integridade e funcionamento mínimo comprovados, com tempos registrados | SEC-035 |

**Critério de prova:** registrar comando/ambiente, resultado, data, evidência e limitação. Testes não foram executados nesta fase documental.

### 4.1 Cruzamento com os casos CA-011–CA-026 existentes

Os testes de segurança SA-001–012 não substituem os cenários CA-011–026. Os mesmos testes automatizados **podem** fornecer evidência para ambos quando verificarem suas condições de aceitação; relacionar casos e arquivos de teste de modo explícito, sem presumir cobertura.

- **SA-006 / SA-007** ↔ CA-011–017 e CA-022–024 (TTL, concorrência, webhook e pagamento tardio).
- **SA-008** ↔ CA-018–021 e CA-025–026 (refund e compensação de kit).
- **SA-009** ↔ CA-024 (direitos de kit misto; autorização de biblioteca).
- **SA-002** ↔ CA-018–021 (alçada de reembolso e trilha auditável).

## 5. Rastreabilidade de regras de negócio

| Módulo | Regras do domínio | Requisitos de segurança prioritários | Artefato posterior |
|---|---|---|---|
| Identidade/Clientes | RN-009–014 | SEC-001–009, SEC-028–030 | Matriz de autorização; testes de acesso |
| Catálogo/Uploads | RN-001–008 | SEC-010–015, SEC-027 | Modelo de ameaças de mídia |
| Preço/Cupons/Carrinho | RN-015–023 | SEC-010, SEC-015, SEC-017–019 | Testes de manipulação e concorrência |
| Inventário/Kits | RN-024–031, RN-071–076, RN-088–094 | SEC-017–018, SEC-021–025 | PC-01/04; CA-011–014, CA-022–026 |
| Checkout/Pedidos | RN-032–040 | SEC-001–003, SEC-017–021 | Fluxos/diagramas e E2E |
| Pagamentos/Reembolsos | RN-041–048, RN-058–063, RN-077–087 | SEC-020–024, SEC-030 | PC-02/03; CA-015–021; contrato webhook |
| Biblioteca digital | RN-049–054, RN-079, RN-087, RN-091 | SEC-021, SEC-025–027 | SA-009; CA-024; autorização de mídia |
| Backoffice/Privacidade | RN-064–070 | SEC-003–005, SEC-028–038 | Threat model, CI, runbooks |

## 6. Decisões de segurança ainda abertas

| ID | Decisão pendente | Critério de escolha / consequência |
|---|---|---|
| DS-001 | Estratégia de sessão e refresh | Separação browser/API, cookies, rotação, revogação e CSRF conforme integração |
| DS-002 | MFA de backoffice | TOTP/WebAuthn, recovery codes, step-up e emergência sem bypass inseguro |
| DS-003 | Matriz de permissão | Papéis, ações, segregação financeira e riscos de acúmulo de privilégios |
| DS-004 | Provedor e modelo de pagamento | Depende de DA-006: sandbox/checkout incorporado ([adendo ADR-004](../04-architecture/adrs/ADR-004-ADENDO-UI-EMBEDDED.md)), validade externa até 30 min e 5 min de folga, assinatura/eventos, idempotência de refund, escopo PCI e falhas |
| DS-005 | Storage e distribuição digital | Buckets, isolamento, presigned URLs e política de revogação prática |
| DS-006 | Política de uploads | Formatos aceitos, tamanhos, inspeção, processamento e armazenamento |
| DS-007 | Retenção e privacidade | Campos, finalidades, requisitos legais, backups e ciclo de exclusão |
| DS-008 | Controles de produção e evidências | Hospedagem, proxies, TLS, WAF, secrets, CI/CD, RPO/RTO, alertas e restore |
| DS-009 | Perfil ASVS e escopo de teste | Selecionar requisitos OWASP ASVS aplicáveis por risco; não alegar certificação |

## 7. Entregáveis por fase

| Etapa | Entrega de segurança | Condição de conclusão |
|---|---|---|
| Regras de negócio (atual) | Requisitos SEC, casos SA, ativos e decisões DS | Texto revisado, conflitos e premissas assinalados |
| Diagramas e processos | DFD, fronteiras de confiança, abusos de conta/checkout/webhook/arquivo | Atores, entradas, fluxos e riscos identificáveis |
| Arquitetura e ADRs | Matriz de autorização, desenho de sessão/MFA, contrato de webhook, políticas de storage | Decisões justificadas e ameaças relevantes mitigadas ou aceitas explicitamente |
| Backend e frontend | Controles aplicáveis implementados com testes de comportamento | Evidências unitárias, integração, E2E e segurança conforme risco |
| Infraestrutura e release | Configuração segura, revisão de CI/secrets, backups/restore, runbook, observabilidade | Controles testados ou claramente marcados **não verificados** |

## 8. Referências e limites

- Skill do projeto `engenharia-software-pragmatica`: critérios pragmáticos de escopo, segurança, integridade, evidência e risco; **não é certificação nem prova de proteção**.
- OWASP ASVS 5.0.0: https://owasp.org/www-project-application-security-verification-standard/ — base para selecionar verificações específicas, com IDs oficiais apenas quando mapeados e revisados.
- OWASP API Security: https://owasp.org/API-Security/ — riscos de APIs a considerar.
- PCI SSC: https://www.pcisecuritystandards.org/ — determinar escopo e obrigações de pagamento segundo integração efetiva, sem alegar conformidade pelo uso de sandbox.
- LGPD e orientações da ANPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm e https://www.gov.br/anpd/pt-br.

**Estado de verificação:** documento elaborado a partir de arquivos e documentação, sem código-fonte do Atlas Commerce implementado ou ambiente de execução. Não é uma auditoria de aplicação.

## 9. Pendências para design e evidência

1. Não criar um threat model “aprovado” sem verificar DFDs e fronteiras de confiança. Seus arquivos de desenho são entregáveis **futuros**, não controles implantados.
2. Resolver DA-006/DS-004 **antes** de consolidar a janela da sessão externa no código. Se incompatível com os 40/30/5 minutos propostos, atualizar simultaneamente adendo, políticas, tabelas, diagramas e casos CA.
3. Documentar matriz real de autorização (incluindo operações financeiras), estratégia de sessão/MFA, armazenamento/entitlement, retenção e continuidade em artefatos separados.
4. Conferir coerência entre Mermaid/DOT, exportações e tabelas. Na Fase 03, refinar os contratos arquiteturais, a persistência e a integração do fluxo já corrigido da SQ-05 e verificar sua correspondência com a implementação e os testes.
5. Testar cenários CA e SA no backend real e nos contratos PSP; não afirmar “segurança robusta verificada” nesta etapa.
