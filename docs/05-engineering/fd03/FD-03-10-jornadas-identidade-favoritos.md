# FD-03-10 — Jornadas complementares: identidade, favoritos, ofertas e conta

> **Estado:** fluxos de UX propostos para arquitetura de navegação ratificada; backend e contratos adicionais NÃO implementados.

## J05 — Cadastro, verificação e retorno ao checkout

1. Visitante inicia carrinho; o carrinho não bloqueia estoque. Ao iniciar pagamento, se não autenticado, navegador apresenta identificação.
2. **Criar conta** (P16): campos mínimos necessários, consentimentos distintos; backend cria conta conforme política de verificação a contratar. Não tratar cadastro como e-mail verificado.
3. **Verificação e-mail** (P17): estado pendente, reenviar com limitação, token vencido/usado/ausente, mensagem acessível; sem revelar existência da conta.
4. Login (P20) somente com política de conta habilitada; sessão opaca HttpOnly no contexto storefront, CSRF e rate limit; nada de credenciais em localStorage.
5. Ao concluir identidade, restabelecer carrinho/intenção com verificação de ownership, preço/estoque e idempotência. **Não executar Checkout automaticamente em nome de usuário recém-logado** sem revalidar intenção/consentimento.
6. Erros: e-mail indisponível via API HTTPS no ambiente Render Free; exibir transição segura e evitar sucesso falso.

## J06 — Recuperação de acesso e proteção

P18 → pedido de recuperação com mensagem neutra, mesmo que a conta não exista → link com token de uso único de duração limitada → P19 redefinição sem revelar token em analytics/log/URL externa → revogação/rotação de sessões conforme ADR-003 → confirmação e login seguro. Reenvio e rate limit devem ser definidos por AUTH/SEC; não inventar endpoints apenas pelo sitemap.

## J07 — Favoritos

Lista P21 separada de carrinho; pode servir a visitante localmente como rascunho **somente se política de armazenamento/consentimento for aprovada**. Favorito não reserva estoque, não garante desconto/lançamento, não prova preço ou produto publicado. Após login, mesclagem de listas precisa de algoritmo idempotente, autorização por conta e teste de conta cruzada. API de wishlist, retenção e privacidade são novas decisões, **não estão aprovadas apenas por tela**.

## J08 — Ofertas e lançamentos

Ofertas P22 devem depender de preço anterior auditável, janela efetiva e regras de promoção aprovadas, nunca um selo de porcentagem inventado. Lançamentos P23 exigem data ou critério editorial real. P24–P27 só mostram coleções/autores/assuntos publicados, evitando “mais vendidos”, estrelas e quantidades falsas. Se não houver itens válidos, mostrar curadoria neutra e sem promoções.

## J09 — Conta, endereços, pedidos e biblioteca

- P29–P31: informações próprias e edição protegida por sessão/CSRF; senha e gestão de sessão com autenticação recente se aplicável.
- P30: endereços próprios, validação CEP, frete **simulado**; sem dados sensíveis de outra pessoa.
- P32–P34/P38: pedidos somente por titular, faturamento/test mode e status comercial distintos, retorno do Stripe sem criar pagamento. Solicitação de devolução recebida e analisada conforme direito do consumidor; não mentir que refund foi concluído.
- P35: direitos digitais próprios, link R2 temporário, arquivo completo privado; kit misto só após alocação física integral + quitação.

## J10 — Assistência e casos de falha

404 (P45) sem enumeração; indisponibilidade (P46) trata Render Free/Supabase Free com mensagem neutra e reexecução segura; sessão expirada solicita novo login mantendo intenção; conteúdo indisponível não expõe original R2; Stripe indisponível deixa intento persistido sem duplicar pedido ou cobrança.

## Transversal — Desktop, mobile, teclado e acessibilidade

Todos os contextos devem ter: foco visível, mensagens associadas a campos, controle por teclado, `aria-live` moderado em mudanças de status, dados sem dependência exclusiva de cor, zoom/reflow, opção de retornar ao contexto após auth, formulários sem ações inesperadas. Meta WCAG 2.2 AA, validar em FD-05; as nove imagens são apenas desktop, não prova de mobile.

**Rastreabilidade:** FD-03-01/02/03/06; ADR-003; DS-003; CT-01/03/04/06; SEC-001–038; PC-01–04; AUTH/SA. Campos exatos e mensagens finais aguardam contrato/validação.
