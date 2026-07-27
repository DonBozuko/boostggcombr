// v156 — Mensagem única de sucesso pós-Pix + filtro idôneo por quantidade
export const CHECKOUT_SUCCESS_TITLE = "🟢 Pagamento aprovado com sucesso!";

// Versão limpa (≤ 200 unidades): sem menção à Caixa Misteriosa/compartilhamento
export const CHECKOUT_SUCCESS_MESSAGE_CLEAN =
  "🟢 PAGAMENTO APROVADO COM SUCESSO! Seu pedido já foi integrado ao nosso sistema de alta velocidade. ⏱️ Tempo Estimado de Entrega: Devido ao alto volume de processamento na rede e para garantir que o envio ocorra de forma 100% segura e orgânica no seu perfil, a inicialização do serviço pode levar alguns minutos.";

// Versão completa (> 200 unidades): inclui bônus da Caixa Misteriosa
export const CHECKOUT_SUCCESS_MESSAGE_FULL =
  "🟢 PAGAMENTO APROVADO COM SUCESSO! Seu pedido e o seu bônus da Caixa Misteriosa já foram integrados ao nosso sistema de alta velocidade! ⏱️ Tempo Estimado de Entrega: Devido ao alto volume de processamento na rede e para garantir que o envio ocorra de forma 100% segura e orgânica no seu perfil, a inicialização do serviço pode levar alguns minutos. Fique tranquilo(a)! Nossa tecnologia está trabalhando em segundo plano e o engajamento será injetado de forma automatizada.";

/** v156 — Retorna a mensagem correta conforme a quantidade do pacote. */
export function getCheckoutSuccessMessage(quantidade: number | null | undefined): string {
  const qty = Number(quantidade ?? 0);
  return qty > 200 ? CHECKOUT_SUCCESS_MESSAGE_FULL : CHECKOUT_SUCCESS_MESSAGE_CLEAN;
}

// Alias legado (default = versão completa) para não quebrar imports antigos.
export const CHECKOUT_SUCCESS_MESSAGE = CHECKOUT_SUCCESS_MESSAGE_FULL;

// v301 — Mensagem única de erro de checkout. Bloqueio precisa explicar o que o
// cliente faz agora, senão ele abandona achando que o site quebrou.
export function checkoutErrorMessage(code?: string | null): string {
  switch (code) {
    case "PROFILE_NOT_FOUND":
      return "Não encontramos esse perfil no Instagram. Confira o @ e tente de novo.";
    case "PROFILE_PRIVATE":
      return "Seu perfil está privado. Deixe público, aguarde 1 minuto e tente de novo — a entrega não funciona em perfil privado.";
    case "INVALID_PACKAGE":
      return "Este pacote está indisponível neste momento. Escolha outra quantidade — não vamos cobrar por algo que não conseguimos entregar agora.";
    default:
      return "Não foi possível gerar o Pix. Tente novamente.";
  }
}
