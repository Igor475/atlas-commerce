# FD-05-03 — Ponte entre Identity Backend e Coleção Viva (documentação)

> **Status: PLANEJAMENTO VISUAL, NÃO MOCKUP NEM CÓDIGO.** Vincular Identity Customer ID-01 às jornadas P16–P20/P29–P31 sem alterar os placeholders Next.js. O Conceito A — Coleção Viva — permanece a referência visual aprovada, não a marca final.

## Telas e contrato de experiência

| Página FD-03 | O que prototipar em FD-05 | Dependência de backend |
|---|---|---|
| P16 Criar conta | e-mail, senha acessível, confirmação neutra, estado aguardando e-mail | register + proteção de abuso e outbox |
| P17 Verificar e-mail | token ausente/inválido/usado/expirado, reenviar e voltar ao login | verify + resend com token one-time |
| P18 Esqueci senha | resultado indistinguível para qualquer e-mail | recovery request |
| P19 Redefinir senha | token inválido, senha, sucesso sem mostrar dados privados | recovery complete + revogação |
| P20 Entrar | campos claros, mostrar senha acessível, feedback seguro, lembrar intenção de checkout | login cliente + CSRF, sessão host-only |
| P29 Meu perfil | campos mínimos do titular e estado de sessão expirada | GET /me e contratos de atualização posteriores |
| P31 Segurança da conta | logout/logout global, sessões revogadas, confirmação apropriada | logout-all; outras ações necessitam contrato |
| P09 Checkout | após login, retomar carrinho com owner correto e Stripe incorporado | sessão de cliente e pedidos futuros; não fazer pagamento nesta entrega |
| A01 Admin staff | bloqueio honesto 'MFA/segurança em preparação' na fase técnica | proibido emitir sessão staff antes de MFA aprovado |

## Exigências de direção visual

- Mesmos fundamentos de hierarquia e tipografia editorial do conceito A, sem copiar VerboVivo; formulários não podem perder legibilidade por estética.
- Layout responsivo real a planejar em 320/375/768/1024/1440 px; teclado, labels, mensagens de erro, foco e touch targets.
- Estados vazios, carregando, revogado, expiração, serviço Free adormecido e perda de conexão.
- Nenhum backend deve ditar uma interface genérica, e nenhum protótipo determina permissão/contrato financeiro.

## Não incluído nesta entrega

Nenhum novo logo, paleta final, fonte licenciada, mockup gerado ou componente implementado. Os artefatos visuais definitivos dependem de FD-05 + revisão humana. As nove capturas do usuário continuam referência de storefront, **não** do painel staff.
