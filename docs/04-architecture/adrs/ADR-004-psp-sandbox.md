# ADR-004 — Provedor de pagamento sandbox e autoridade financeira

**Status:** ABERTA • DA-006 / DS-004. **Stripe Checkout sandbox é somente candidato a spike**, não seleção definitiva.

## Requisitos mínimos

- Checkout hospedado sem PAN/CVV no Atlas; definir escopo PCI aplicável ao desenho real.
- Métodos com confirmação e expiração compatíveis. Política proposta: reserva física 40m a partir do banco; sessão PSP até 30m; vencimento externo **ao menos 5m antes** da expiração da reserva.
- O limite se calcula por **timestamps absolutos**, mesmo com delay entre reserva e criação de sessão. Exemplo: criar sessão 8 min depois da reserva exigiria prazo externo de no máximo 27 min desde a criação da sessão (40 − 5 − 8), podendo ser incompatível com mínimo do PSP → **não expor URL**.
- Webhook raw body autenticado, referência, moeda/valor/status e eventos duplicados/fora de ordem; refund idempotente estável e consulta de estado em timeout.
- `redirect` não prova pagamento; `HTTP 2xx` na criação nem no refund comprova liquidação; reconciliação em estado incerto.

## Alternativas

A. PSP hosted checkout em sandbox compatível (preferível para minimizar dados).  
B. Simulador determinístico para CI e fluxos sem endpoint externo; **não substitui** prova de sandbox.  
C. Checkout com captura direta de dados completos do cartão: fora do MVP.

## Spike obrigatório antes de fechar

1. Teste de expiração absoluta na criação sem atraso e com delays variados, incluindo o gap de 5 min.
2. Teste de assinatura com payload original, replay, ordem, eventos tardios e tentativas distintas.
3. Refund: chave estável, duplicação, timeout, reconciliação sem saldo duplo; operações em BRL/cents.
4. Meios de pagamento e prazos por método. Pix/boleto/assíncronos desabilitados até política própria.
5. Registrar links e outputs de ambiente de teste **sem credenciais**; atualizar conjuntamente BRD/adendo/PC/CA/SEC se política mudar.

**Critério:** aprovar só com evidência técnica e risco residual explícito. Não inventar nomes de eventos ou limitações reais sem conferir documentação viva do provedor.
