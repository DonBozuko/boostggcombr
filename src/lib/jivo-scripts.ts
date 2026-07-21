// Scripts de atendimento Jivo — copiar e colar no chat
// Tom: direto, humano, sem jargão técnico

export const jivoScripts = {
  // Cliente pediu telefone ou parece inseguro na primeira compra
  telefoneSeguro: `Posso te passar nosso contato sim, mas aqui pelo chat consigo te atender na hora e tudo fica registrado pra sua segurança. 🙌

Se preferir, me manda seu WhatsApp que eu te chamo de volta rapidinho.`,

  // Cliente insiste no telefone
  telefoneDireto: `Claro! Me chama no WhatsApp: (seu-numero)

Só me confirma aqui no Jivo quando mandar mensagem, porque às vezes cai no spam.`,

  // Demora de entrega do YouTube
  prazoYoutube: `Fica tranquilo! Seu pedido já está na fila do fornecedor e começa a entrar em até 12h a 72h. YouTube demora um pouco mais pra proteger o canal de bloqueio. Se não começar em 72h, reembolso na hora.`,

  // Primeira compra insegura
  primeiraCompra: `Entendo perfeitamente! Você pode começar com o pacote menor pra testar. O pagamento é via Pix, seguro e instantâneo. Assim que confirmar, o pedido entra na fila e você acompanha por aqui mesmo.`,

  // Pix não caiu ainda
  pixPendente: `Vou verificar agora o status do seu Pix. Qual o nome que aparece na transferência? Às vezes o banco demora 1-2 minutos pra notificar, mas se já saiu da sua conta, está garantido.`,

  // Após venda confirmada
  posVenda: `Show! 🎉 Seu pedido está confirmado. Assim que começar a entregar te aviso aqui. Se precisar de qualquer coisa, é só chamar.

Se quiser, deixa seu e-mail pra eu te enviar o comprovante e o status de entrega.`,
};

// Exemplo de uso: console.log(jivoScripts.telefoneSeguro)
