// Cloudflare Worker — atende duas rotas do portfólio, ambas via Resend:
//
//   POST /         formulário de contato
//   POST /visita    aviso de visualização (dispara a cada carregamento da página,
//                   exceto quando a própria Cristina acessa com ?eu=1)
//
// Existe porque o site é HTML estático (GitHub Pages): não tem servidor próprio
// para guardar a chave da API em segredo, e ela NUNCA pode ir no index.html.

const ORIGEM_PERMITIDA = 'https://cristinapesente.github.io';
const PARA = 'ccpesente@gmail.com';

function comCors(res) {
  res.headers.set('Access-Control-Allow-Origin', ORIGEM_PERMITIDA);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

async function enviarResend(env, { subject, text, replyTo }) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Portfólio <onboarding@resend.dev>',
      to: PARA,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
    }),
  });
}

async function handleContato(req, env) {
  let corpo;
  try { corpo = await req.json(); } catch { corpo = {}; }
  const { nome, email, mensagem, honeypot } = corpo || {};

  if (honeypot) return comCors(Response.json({ ok: true }));

  if (!email?.trim() || !mensagem?.trim()) {
    return comCors(Response.json({ erro: 'Preencha seu e-mail e a mensagem.' }, { status: 400 }));
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return comCors(Response.json({ erro: 'Confira o e-mail digitado.' }, { status: 400 }));
  }
  if (mensagem.length > 5000) {
    return comCors(Response.json({ erro: 'Mensagem muito longa.' }, { status: 400 }));
  }

  const nomeSeguro = (nome || '').trim().slice(0, 200) || '(não informado)';
  const emailSeguro = email.trim().slice(0, 320);
  const mensagemSegura = mensagem.trim();

  try {
    const r = await enviarResend(env, {
      replyTo: emailSeguro,
      subject: `Contato pelo portfólio — ${nomeSeguro}`,
      text: `Nome: ${nomeSeguro}\nE-mail: ${emailSeguro}\n\n${mensagemSegura}`,
    });

    if (!r.ok) {
      const detalhe = await r.text().catch(() => '');
      console.error('[contato] Resend recusou', r.status, detalhe);
      return comCors(Response.json(
        { erro: 'Não foi possível enviar agora. Tente de novo em instantes.' },
        { status: 502 },
      ));
    }

    return comCors(Response.json({ ok: true }));
  } catch (e) {
    console.error('[contato] falha de rede ao chamar o Resend', e);
    return comCors(Response.json(
      { erro: 'Não foi possível enviar agora. Tente de novo em instantes.' },
      { status: 500 },
    ));
  }
}

async function handleVisita(req, env) {
  // Fire-and-forget do lado do site: sempre responde 204, mesmo se o Resend falhar.
  // Um aviso de visita nunca deve virar erro visível para quem está navegando.
  let corpo;
  try { corpo = await req.json(); } catch { corpo = {}; }

  const cf = req.cf || {};
  const local = [cf.city, cf.region, cf.country].filter(Boolean).join(', ') || 'local desconhecido';
  const referer = req.headers.get('referer') || corpo.referrer || '(acesso direto)';
  const pagina = corpo.pagina || '/';
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    await enviarResend(env, {
      subject: '👀 Alguém visualizou seu portfólio',
      text: `${agora}\n\nPágina: ${pagina}\nOrigem: ${referer}\nLocal aproximado: ${local}`,
    });
  } catch (e) {
    console.error('[visita] falha ao notificar', e);
  }

  return comCors(new Response(null, { status: 204 }));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return comCors(new Response(null, { status: 204 }));
    }
    if (req.method !== 'POST') {
      return comCors(Response.json({ erro: 'Método não permitido.' }, { status: 405 }));
    }

    if (url.pathname === '/visita') return handleVisita(req, env);
    return handleContato(req, env);
  },
};
