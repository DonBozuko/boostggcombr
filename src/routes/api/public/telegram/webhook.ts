import { createFileRoute } from '@tanstack/react-router';
import { createHash, timingSafeEqual } from 'crypto';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const ROUTES: Record<string, { label: string; url: string }> = {
  ig: { label: '📸 Instagram', url: 'https://eliteboostprime.lovable.app/' },
  tk: { label: '🎵 TikTok', url: 'https://eliteboostprime.lovable.app/tiktok' },
  yt: { label: '▶️ YouTube', url: 'https://eliteboostprime.lovable.app/youtube' },
  fb: { label: '🔵 Facebook', url: 'https://eliteboostprime.lovable.app/facebook' },
  tg: { label: '✈️ Telegram', url: 'https://eliteboostprime.lovable.app/telegram' },
  tf: { label: '🌐 Tráfego', url: 'https://eliteboostprime.lovable.app/trafego' },
};

function deriveSecret(key: string) {
  return createHash('sha256').update(`telegram-webhook:${key}`).digest('base64url');
}
function safeEqual(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function humanDelay() { return 2000 + Math.floor(Math.random() * 2000); }

async function tg(method: string, body: unknown) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return null;
  try {
    const r = await fetch(`${GATEWAY_URL}/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    console.error('[telegram]', method, e);
    return null;
  }
}

async function sendTyping(chat_id: number, text: string, extra: Record<string, unknown> = {}) {
  await tg('sendChatAction', { chat_id, action: 'typing' });
  await sleep(humanDelay());
  return tg('sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });
}

function welcomeFor(start: string | null) {
  const r = start && ROUTES[start];
  const ctx = r ? ` Vi que tu veio da vitrine do ${r.label.split(' ')[1]}.` : '';
  return (
    `🔥 Eaí parceiro, aqui é o <b>Fabiano Santiago</b>.${ctx}\n\n` +
    `Bem-vindo à <b>EliteBoost Prime</b> — direto ao ponto, sem enrolação.\n\n` +
    `Me conta: em qual rede tu quer alavancar agora?`
  );
}

function networkKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📸 Instagram', callback_data: 'pick:ig' }, { text: '🎵 TikTok', callback_data: 'pick:tk' }],
        [{ text: '▶️ YouTube', callback_data: 'pick:yt' }, { text: '🔵 Facebook', callback_data: 'pick:fb' }],
        [{ text: '✈️ Telegram', callback_data: 'pick:tg' }, { text: '🌐 Tráfego Web', callback_data: 'pick:tf' }],
      ],
    },
  };
}

function closingFor(key: string) {
  const r = ROUTES[key];
  if (!r) return null;
  return {
    text:
      `Fechou parceiro! ${r.label} é uma das nossas vitrines premium. 💎\n\n` +
      `Toca no botão abaixo, escolhe o pacote e em <b>poucos minutos</b> a entrega começa.\n` +
      `Qualquer dúvida me chama aqui direto — atendimento humano de verdade. 👊`,
    keyboard: {
      reply_markup: {
        inline_keyboard: [[{ text: `🚀 Abrir vitrine ${r.label}`, url: r.url }]],
      },
    },
  };
}

async function handleUpdate(update: any) {
  // /start with optional ?start= parameter
  if (update.message?.text) {
    const text: string = update.message.text;
    const chat_id: number = update.message.chat.id;

    if (text.startsWith('/start')) {
      const arg = text.split(' ')[1] || null;
      await sendTyping(chat_id, welcomeFor(arg));
      await sendTyping(chat_id, '👇 Escolhe a rede aqui de baixo:', networkKeyboard());
      return;
    }

    // generic sondagem fallback
    await sendTyping(
      chat_id,
      `Tô contigo, parceiro. Pra agilizar: qual rede tu quer turbinar?`,
      networkKeyboard(),
    );
    return;
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    const chat_id = cq.message.chat.id;
    const message_id = cq.message.message_id;
    const data: string = cq.data || '';
    await tg('answerCallbackQuery', { callback_query_id: cq.id });

    if (data.startsWith('pick:')) {
      const key = data.slice(5);
      const close = closingFor(key);
      if (close) {
        await sendTyping(chat_id, close.text, close.keyboard);
      }
      return;
    }

    // v151 — botão "✅ Recarga Confirmada": reprocessa pedido travado e grava PROVIDER_RECHARGE_MANUAL.
    if (data.startsWith('recharge:')) {
      const pedidoId = data.slice(9);
      await tg('editMessageReplyMarkup', { chat_id, message_id, reply_markup: { inline_keyboard: [[{ text: '⏳ Reprocessando…', callback_data: 'noop' }]] } });
      try {
        const { reprocessWaitingProvision } = await import('@/lib/reprocess-waiting.server');
        const res = await reprocessWaitingProvision(pedidoId);
        if (res.ok) {
          await tg('sendMessage', {
            chat_id,
            parse_mode: 'HTML',
            text: `✅ <b>Recarga aplicada.</b>\nPedido <code>${pedidoId}</code> despachado via <b>${res.fornecedor}</b> (order ${res.orderId ?? '?'}).`,
          });
        } else {
          await tg('sendMessage', {
            chat_id,
            parse_mode: 'HTML',
            text: `⚠️ Reprocessamento falhou: <code>${res.error}</code>${res.tentativas?.length ? `\n${res.tentativas.join(' | ').slice(0, 400)}` : ''}`,
          });
        }
      } catch (e: any) {
        await tg('sendMessage', { chat_id, text: `❌ Erro interno: ${e?.message ?? String(e)}` });
      }
      return;
    }
  }
}

export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) return new Response('not configured', { status: 503 });

        const expected = deriveSecret(TELEGRAM_API_KEY);
        const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
        if (!safeEqual(got, expected)) return new Response('Unauthorized', { status: 401 });

        const update = await request.json();
        console.log('[telegram] update', JSON.stringify(update).slice(0, 500));
        // Must await: Cloudflare Workers terminate background promises after Response returns
        try {
          await handleUpdate(update);
        } catch (e) {
          console.error('[telegram] handle', e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
