# FD-03-08 — Decisões de UX em aberto (não implementar por inferência)

| ID | Tema | Proposta inicial | Decisão esperada antes de FD-04/05 |
|---|---|---|---|
| UXD-01 | Taxonomia principal | categorias editoriais configuráveis, não obrigatoriamente religiosas | responsáveis validam rótulos/ordem e amostra de catálogo fictício |
| UXD-02 | URLs do Next | mapa candidato do FD-03-01 | rotas finais, slugs, canonical, SEO |
| UXD-03 | Autocomplete | sugestão contextual opcional | dependência de API/index, acessibilidade, privacidade |
| UXD-04 | Filtros específicos | só atributos reais, com facetas contextuais | catálogo e dados disponíveis |
| UXD-05 | Cupom/frete | um cupom simples e frete determinístico simulado | apresentação e detalhes de cotação UX |
| UXD-06 | Preview revista | páginas públicas selecionadas/licenciadas, reader acessível | formato exato de preview, licença e ferramenta de leitura |
| UXD-07 | Confirmação do Stripe | página de acompanhamento via API, estado pending/review | rótulos finais/rotas/refresh seguro e contrato de status |
| UXD-08 | Carrinho anônimo | persistência sem reserva, sem vínculo de dados privados | política de vinculação segura após login e retenção |
| UXD-09 | Newsletter/favoritos/reviews | não implementar por fotografia visual | optar por evolução ou contrato/consentimento específico |
| UXD-10 | Visual do admin | identidade relacionada porém ergonomia própria | mapeamento de papéis, navegação e mockups específicos |
| UXD-11 | Marca Atlas | ausência de fonte/logo/paleta definidos | FD-04 propor 2–3 direções **originais**, aprovar uma |
| UXD-12 | Conteúdo demonstrativo | obras/autores/capas licenciados ou fictícios | política de assets e direitos, não importar das imagens |
| UXD-13 | Mobile/tab | fluxos ainda sem visual responsivo auditado | wireframes/estados e ensaios FD-05 |
| UXD-14 | Auditoria/preço/descontos | nenhum selo, promessa ou promoção sem fonte | revisão de copy honesta e teste mode visualmente identificado |

## Lacunas contratuais e divergências — pendentes de aprovação

| ID | Evidência / lacuna | Proposta de encaminhamento, sem alterar normas ou API |
|---|---|---|
| UXD-15 | CT-01 não inventaria listagem de pedidos, atualização de conta/endereço, cadastro/recovery completos, administração editorial/estoque, auditoria nem observabilidade/replay de A08. Autocomplete/facetas detalhadas também não estão contratados. | Aprovar escopo, operações, DTOs, privacidade e negativos antes de implementar P11/P12/P15/A03–A08 ou busca avançada. Manter páginas conceituais, sem inventar endpoints. |
| UXD-16 | RN-079/PC-02/04 dispensam reserva física no digital puro; CT-02 lista `reservationExpiresAt` e o OpenAPI `CheckoutResult` exige esse campo como `string/date-time` não nulo. A representação contratual da ausência de reserva permanece conflitante/indefinida. | **Pendente de aprovação:** propor ausência explícita de reserva (campo opcional ou nulo, a ratificar) e validade comercial do pedido digital em revisão contratual separada. Não fabricar timestamp/TTL físico nem alterar CT/OpenAPI por este pacote. |
| UXD-17 | DS-003 declara nomes de roles, alçadas, abrangência da dupla aprovação e exceções em aberto; CT-01/06 propõem aprovador distinto no refund manual. | Ratificar DS-003/DA-009 e mapear capabilities por recurso; preservar MFA e negar ações sem política autorizada. ADM-01 continua proposta, sem aprovar poderes ou limites numéricos. |
| UXD-18 | RN-072/PC-01 expressam teto <=30 min; ADR-004 e CT-02 refinam a sessão Stripe para 30 min, compatibilidade temporal ainda não homologada. | Ler o teto em conjunto com o refinamento de 30 min; manter 40/30/5 condicionado a ST. Se a integração provar incompatibilidade, encaminhar decisão normativa versionada, sem encurtar sessão ou mudar RN/PC/ADR nesta revisão. |

## Conferência documental — 13/10/2026

Base: `c7c2f317d0981a9693052e702995abaa0a59b0f3`, main, checkout inicialmente limpo. Erros verificáveis corrigidos: contagem de seis contextos; cobertura P01–P15/A01–A08; reserva física condicional; refinamento temporal explícito; nomes de erro alinhados a CT-03; diagrama administrativo distingue solicitação, aprovação/reserva de saldo e conclusão comprovada. UX-01/ADM-01 são sincronizados com suas fontes DOT; não são prova de execução. As divergências acima continuam **pendentes de aprovação**, sem modificar RN/PC/SEC/ADR/CT, FD-01/02 ou as nove capturas. UXA-001–024 permanecem planejados.

**Validação desta revisão:** 123 links relativos em 16 Markdown sem destino ausente; nove capturas referenciadas com SHA-256 preservado; cobertura dos 15 IDs P e 8 IDs A; quatro DOT analisados, quatro SVG XML válidos com nós/arestas correspondentes e quatro PNG decodificados. UX-01/ADM-01 foram regenerados com Graphviz 14.1.3 (@viz-js/viz 3.25.0) e sharp 0.35.5 já disponíveis no runtime, sem instalar dependências. O verificador emitiu aviso de métrica de caractere não ASCII em IA-01, sem erro de sintaxe; sua exportação original foi preservada e revisada visualmente. `git diff --check`: exit 0. Essa conferência de arquivos não executa os casos UXA nem aprova protótipos, interfaces ou integrações.

## Escopo bloqueado

Aprovação deste mapa **não** é autorização para criar telas. Stripe Test Mode, conta obrigatória, endpoint/políticas RN e proteção R2 continuam imutáveis por decisão visual; uma mudança real exige processo de decisão e atualização de RN/ADR/CT com autorização.

**Acompanhar em:** [FD-03-07](FD-03-07-rastreabilidade-gates.md), [FD-01](../FD-01-direcao-design-frontend-premium.md).
