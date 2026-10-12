# Plano de sincronização das ADRs e demais índices após a aprovação

> **Situação:** decisão do usuário já registrada em [baseline](BASELINE-ARQUITETURAL-APROVADA-v0.1.md), mas **os outros documentos do GitHub ainda não foram editados por este pacote**. Aplicar revisões localizadas, preservando histórico, IDs, invariantes, diagramas e testes.

## Arquivos existentes que precisam refletir a decisão

| Arquivo | Atualização editorial correta |
|---|---|
| `docs/04-architecture/README.md` | Adicionar link à baseline e quadro de validações; substituir apenas as afirmações genéricas de “sem decisão” por **“direção aprovada, homologação pendente”**, quando aplicável. |
| `docs/04-architecture/STATUS-DECISOES-FASE-03.md` | Separar colunas “direção aprovada”, “detalhe técnico aberto”, “evidência/teste pendente”; não declarar todos os gates concluídos. |
| `docs/04-architecture/adrs/README.md` | Referenciar este termo; usar status explícitos **“Direção aceita; implementação/validações pendentes”** para ADR-001/002/003/005/006/007/008, conforme escopo; ADR-004 preserva “Stripe escolhido, integração não homologada”. |
| `docs/04-architecture/adrs/ADR-001-monolito-modular.md` | Direção aprovada; fronteiras e contratos ainda exigem testes de arquitetura. |
| `docs/04-architecture/adrs/ADR-002-integridade-outbox.md` | Direção aceita para PostgreSQL/outbox/inbox; locking, dispatcher/replay pendentes. |
| `docs/04-architecture/adrs/ADR-003-autenticacao-sessoes.md` | Sessão opaca e política inicial de TTL/MFA aceitas; domínio/ingress, recuperação e prova AUTH pendentes. |
| `docs/04-architecture/adrs/ADR-004-psp-sandbox.md` | Stripe já selecionado; adicionar referência à baseline sem elevar testes ST a “concluídos”. |
| `docs/04-architecture/adrs/ADR-005-midia-e-storage.md` | **Cloudflare R2** escolhido como direção; segurança, buckets, TTL/licença e custos pendentes. |
| `docs/04-architecture/adrs/ADR-006-acesso-dados.md` | Prisma v7 como preferência aprovada **condicionada ao spike**; se falhar, requer justificativa/decisão de troca. |
| `docs/04-architecture/adrs/ADR-007-worker-e-jobs.md` | Outbox durável aprovada; worker separado segue opcional e condicionado à operação. |
| `docs/04-architecture/adrs/ADR-008-controles-operacionais.md` | Vercel para Next.js e **Render Free Web Service para NestJS + Supabase PostgreSQL**; plano do Supabase e estratégia de jobs pendentes; controles de backup/restore e segurança ainda não comprovados. |
| `docs/02-business-requirements/REGRAS-DE-NEGOCIO.md` | Atualizar **somente** DA-006 (Stripe escolhido), DA-013 (licenciamento) e DA-014 (direção demo/hospedagem) quando necessário; preservar RN/CA/RNF. |
| `docs/02-business-requirements/ADENDO-POLITICAS-CRITICAS-v0.2.md` | Onde disser “escolha de PSP aberta”, distinguir fornecedor Stripe decidido e compatibilidade 40/30/5 pendente. Preservar RN-071–094. |
| `docs/03-business-processes/DECISOES-PENDENTES.md` | Refinar o que era escolha de fornecedor/storage/sessão e o que continua aguardando detalhes e testes; manter pendências financeiras/jurídicas. |
| `docs/07-security/security-requirements.md` | DS-001/002/005/006/008/009 agora têm direções de desenho, mas SEC e SA continuam exigindo comprovação; DS-004 permanece integração Stripe não homologada. |
| `docs/README.md` | Indexar baseline aprovada, gates pendentes e Fase 03; corrigir referências antigas a DA-006/DS-004. |

## Instruções para edição manual ou Codex documental futuro

1. Ler **versões atuais no GitHub**, comparar com a baseline e fazer **alterações pontuais**, sem reconstruir arquivos grandes de memória ou de anexos antigos.
2. Em cada ADR, atualizar o campo de status com a ressalva correspondente; preservar a seção “provas necessárias”, as alternativas e os vínculos.
3. Não mudar `RN-001–094`, `SEC-001–038`, `SA-001–012` nem `CA-001–026`; resolver divergências por decisão explícita.
4. Se os diagramas mudarem semanticamente, alterar fonte DOT/Mermaid/BPMN **e** exportações juntas; esta aprovação **não exige redesenhar** diagramas por si só.
5. Revisar links, `git diff --check`, nomes de arquivos modificados e inconsistências de status. Não criar executáveis nem introduzir código.

**Recomendação:** antes da primeira fase de implementação, consolidar o índice/status e registrar como critérios de autorização do Codex a matriz de decisões e os gates acima. Este ZIP contém os arquivos de baseline, ADR-009/010, diagramas e novas validações; não contém versões reconstruídas dos documentos antigos de BRD, SEC ou ADR-001–008.

## Adendo Render — orientação de sincronização (12/10/2026)

**Decisão já aceita:** o fornecedor inicial do backend é a **Render Web Service Free**, sem deploy realizado. O arquivo novo [ADR-009](adrs/ADR-009-selecao-render.md) e a [matriz oficial de status](STATUS-ADR-APROVACAO-2026-10-12.md) têm precedência **sobre frases históricas** que ainda digam “backend não escolhido”. Não eliminar histórico de avaliação de alternativas; atualizá-lo cirurgicamente quando as ADRs forem sincronizadas.

Ao atualizar `docs/04-architecture/adrs/ADR-008-controles-operacionais.md`, `ADR-007-worker-e-jobs.md`, `adrs/README.md`, `STATUS-DECISOES-FASE-03.md` e `docs/README.md`: registrar **direção aprovada, validação pendente**, manter status de Stripe/Prisma/MFA/Cloudflare R2 aprovados apenas como decisões iniciais e referenciar ADR-009 e RENDER-001–016. **Não afirmar que Render Free oferece execução de jobs contínuos ou disponibilidade garantida.**

Ao editar o BRD, em DA-014 substituir apenas a escolha genérica de hospedagem por **“Vercel para frontend; Render Free para backend; Supabase PostgreSQL para banco; demonstração em Stripe test mode; plano do Supabase e segurança/backup sujeitos à verificação”**, sem alterar RN/CA/RNF. Atualizar menções históricas de PSP em DA-006 para Stripe sem reescrever regras da Fase 02.

Este pacote **não sobrescreve os arquivos existentes da Fase 01/02 e ADRs**, para preservar conteúdo que foi evoluído no GitHub. A harmonização desses textos permanece tarefa **documental**, não requisito para criar serviços agora.

## Adendo final — escolhas Render Free e Supabase (12/10/2026)

A decisão mais recente **substitui somente** as pendências de fornecedor banco e plano Render: backend no plano **Render Free** e banco **Supabase PostgreSQL**. Não atualizar o registro original para “Supabase Free aceito” enquanto o responsável não escolher esse plano. Ver [ADR-009](adrs/ADR-009-selecao-render.md) e [ADR-010](adrs/ADR-010-postgresql-supabase.md).

Ao sincronizar os arquivos históricos no GitHub, aplicar **edições cirúrgicas**:

- `docs/04-architecture/adrs/ADR-008-controles-operacionais.md`, `adrs/ADR-006-acesso-dados.md`, `adrs/ADR-007-worker-e-jobs.md` e índices: distinguir fornecedor aprovado de conexão/pool/migrations/jobs pendentes; **não declarar Supabase Auth/Storage adotados**.
- `docs/02-business-requirements/REGRAS-DE-NEGOCIO.md`: DA-014 descreve Render Free e Supabase PostgreSQL para **demo em Stripe test mode**; preservar demais RN/CA/RNF.
- `docs/03-business-processes/DECISOES-PENDENTES.md`: DA-020/DS-008 devem refletir plano escolhido, sem homologar segurança/recovery.
- `docs/07-security/security-requirements.md`: DS-007/008 têm direção de provedor, mas RLS/Data API, TLS, backup, retenção e SA ainda exigem provas.
- `docs/04-architecture/README.md`, `STATUS-DECISOES-FASE-03.md`, `docs/04-architecture/adrs/README.md`, `docs/README.md`: vincular nova ADR-010, SUPABASE-001–016 e plano Render Free. Manter regras de precedência e histórico intactos.

**Atenção:** na inspeção antes deste pacote (commit `0c72d73d9a234754242e1fe5a615c618ce4067b4`), os documentos da baseline aprovada e ADR-009 **ainda não constavam na branch main**. Este ZIP **inclui integralmente a baseline v0.1 atualizada e o pacote Render v0.2 refinado**, para evitar dependência de instalação anterior. Não misturar com ZIP v0.2 no mesmo commit sem revisar diffs.

## Guia adicional após confirmação Vercel e R2 Free (12/10/2026)

Este pacote v0.4 **substitui integralmente o arquivo consolidado v0.3**; não misturar os dois ZIPs sem `git diff`. Além das ADRs novas 009/010 da etapa anterior, contém **atualização integral de ADR-005, ADR-007 e ADR-008** baseada no conteúdo verificado na branch `main` (`0c72d73`). Os demais ADRs antigos não devem ser apagados/recriados.

Quando harmonizar `docs/04-architecture/README.md`, `adrs/README.md`, `STATUS-DECISOES-FASE-03.md`, `docs/README.md`, BRD, políticas e SEC, registrar `Vercel selecionada`, `Cloudflare R2 Free Tier Standard escolhido`, `Render Free`, `Supabase PostgreSQL selecionado, plano ainda pendente`, `Supabase Cron apenas proposta`, sem dizer que houve implantação, pagamentos reais, licenças ou testes concluídos. Preservar IDs RN, CA, SA, SEC, AUTH, DB e ST. Se desejar, preparar patch editorial separado após verificar os blobs atuais no GitHub; este ZIP **não sobrescreve** esses documentos longos.
