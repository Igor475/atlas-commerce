# Prompt Codex — FD-03: conferência e sincronização exclusivamente documental

Atue como Arquiteto de Produto/UX Sênior e Engenheiro de Software responsável pela consistência documental. O pacote FD-03 está em `docs/05-engineering/fd03/` e contém **somente propostas de UX e diagramas**. **Não desenvolver frontend, backend nem infraestrutura.**

## Inspeção obrigatória

1. Leia HEAD, `git status`, os documentos FD-01, FD-02 e FD-03, RN/PC/SEC/CT, os arquivos de políticas e a matriz DS-003.
2. Verifique se os diagramas e nove referências PNG já publicadas são alcançáveis pelos links. Não duplicar screenshots ou transpor imagens da marca retratada para UI Atlas.
3. Cheque as restrições: `apps/storefront` e `apps/admin` separados; conta para checkout; Stripe Checkout hospedado Test Mode; 40/30/5 condicional; return do navegador não prova pagamento; entitlement; kit misto; single seller; roles e MFA do admin.
4. Classifique conflitos como pendentes e apresente proposta de correção; **não altere regras normativas** para fazê-las caber no sitemap.

## Mudanças estritamente permitidas

- Revisar somente Markdown e fontes DOT dentro de `docs/05-engineering/fd03/` para corrigir erros verificáveis.
- Acrescentar ao índice `docs/05-engineering/README.md` **uma referência breve** a `fd03/README.md`, identificando FD-03 como proposta a aprovar, sem reescrever status F04-03/04/05 ou timeline antiga.
- Se regenerar diagramas por correção verificável, atualizar `.svg` e `.png` correspondentes, sem tocar capturas do usuário.

## Proibido

Não modificar `apps/`, `packages/`, banco, pipelines CI, migrations, contas de provedor, env, contratos HTTP, normas RN/PC/SEC/ADR, `FD-01/02` ou as nove capturas. Não criar logo, design tokens, CSS, wireframes, mockups, app/rota Next real ou cópias pixel-perfect da referência. Não fazer commit/push/deploy automaticamente.

## Validações e entrega

Confirmar integridade dos links relativos e diagramas, coerência entre sitemap e inventário, `git diff --check`; listar arquivos alterados. Se houver lacuna de contrato ou decisão de negócio, marcar **pendente de aprovação**. Relate o diff e não anuncie implementação de interface.
