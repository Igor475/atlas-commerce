# FD-05-00 — Plano de wireframes, mockups e protótipos: Coleção Viva

> **Estado: PLANEJADO, NÃO EXECUTADO.** Direção A aprovada; telas e identidade visual final NÃO aprovadas. FD-03 cobre P01–P50/A01–A14. Este plano conserva todos os IDs e diferencia detalhamento visual de implementação de APIs.

## Objetivo

Produzir uma experiência completa e original de e-commerce editorial, orientada pelas nove capturas do responsável, sem copiar VerboVivo. Especificar e revisar o **design antes de transformar em Next.js**. Cada tela deve existir como artefato individual em desktop e mobile; tablet adicional quando houver alterações significativas de padrão.

## Quatro ondas de produção (todos os IDs com cobertura)

| Onda | Páginas/estados | Entrega obrigatória |
|---|---|---|
| **O1 — Compra e descoberta, piloto visual** | P01–P09; P47, P48 e P49 | Home; catálogo; busca; PDP físico/e-book/revista e leitor de amostra; kit; carrinho; identificação/checkout incorporado; retorno pendente/confirmado/review/expirado e retomada segura |
| **O2 — Identidade e relacionamento** | P10–P13; P15–P21; P29–P36 | Resultado de compra; minha conta; pedidos; biblioteca; entrar/criar/verificar/recuperar/redefinir; favoritos; perfil, endereço, segurança, consentimento e detalhes protegidos |
| **O3 — Descoberta ampliada, apoio e exceções** | P14; P22–P28; P37–P46; P50 | Ofertas verdadeiras quando contratadas; lançamentos; coleções/autores/editoras/temas; comparação opcional; contato, devolução, FAQ, institucional, políticas, acessibilidade, 404/503 e páginas informativas |
| **O4 — Operação administrativa** | A01–A14 | Login/MFA staff; visão operacional; catálogo/mídias; estoque; pedidos/devolução; financeiro/refunds; segurança/auditoria; pendências/jobs somente sob contrato; detalhes e negativas por capability |

**Critério:** grupos com ID podem compartilhar design system e templates, mas **nenhum ID será excluído do inventário nem tratado como endpoint existente**. O design completo inclui páginas candidatas de evolução para consistência do sistema; execução funcional continua condicionada a contratos e autorização.

## Subetapas em cada onda

1. **Wireframe low-fi:** hierarquia, conteúdo, interações, erros, acesso, sem decoração.
2. **Mockup hi-fi:** aplicação do Conceito A com marca original, grid, type scale, imagens próprias/licenciadas e tokens testados.
3. **Protótipo:** fluxo navegável, teclado, estados vazios/erro, troca de dispositivo e interação crítica; sem PSP real.
4. **Revisão humana:** aprovação com evidência por arquivo, tela/viewport/estado; alterações documentadas; só então preparar prompt Codex para frontend.

## Dispositivos e estados

- Larguras-alvo a **testar**: 320, 375, 768, 1024 e 1440 px. Não há evidência de que as referências desktop funcionem em mobile.
- Conteúdo e ações: loading, vazio, nenhum resultado, erro, autenticado/desautenticado, preço/estoque alterado, licença digital negada, indisponibilidade Render/Supabase Free, 40/30/5 quando aplicável, sessão Stripe expirada, `PAYMENT_REVIEW` e refund pendente.
- Validação visual/UX: WCAG 2.2 AA como alvo, teclado/foco, contraste medido, zoom, touch target, leitor de tela, reflow, minimização de PII e ausência de alegações comerciais fictícias.

## Gates do pagamento incorporado

- Pagamento com **Stripe Checkout incorporado**, Test Mode, componente oficial; nunca inputs PAN/CVV Atlas.
- Para físicos, reserva de estoque real 40 min e sessão Stripe de 30 min proposta com buffer 5 min, sujeita a ensaios Stripe. Para digital puro, **nenhuma reserva física**; UXD-16 `reservationExpiresAt: null` continua pendente da ratificação expressa do responsável.
- `clientSecret` da sessão Stripe é somente para inicializar SDK após validação de cliente; nunca confirmação financeira. A UI de retorno consulta status confiável do backend. 3DS pode exigir passo externo.
- Layouts de pagamento não devem simular meios não aprovados nem inventar garantia de disponibilidade dos planos Free.

## Referências por tipo de tela

- Capturas: [FD-02 — nove referências](../FD-02-referencias-visuais-usuario.md), para **linguagem e densidade de conteúdo**, não para copiar assets, marca ou pixels.
- [FD-03 — Inventário estendido](../fd03/FD-03-09-inventario-completo-paginas.md) e [FD-03 — Stripe incorporado](../fd03/FD-03-11-checkout-stripe-incorporado.md).
- [FD-04 — Conceito A ratificado](../fd04/FD-04-09-decisao-conceito-A.md) e [brief refinado](../fd04/FD-04-10-refinamento-criativo-colecao-viva.md).

## Documentação de entrega de cada artefato FD-05

Nome da tela, ID P/A, URL candidata, contrato(s) necessários, referências de composição, estado demonstrado, viewport exato, versão e data, fonte e licença de capas/fotos/fontes, pares de contraste, anotações de interação/responsividade/acessibilidade, decisão humana (aprovado / ajustar / bloqueado) e screenshot **inteiro e separado**. Evitar colagens minúsculas e arquivos executáveis.

**Nenhum mockup, protótipo ou código é produzido por este plano.**
