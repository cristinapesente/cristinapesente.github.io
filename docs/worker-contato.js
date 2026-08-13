// Cloudflare Worker — recebe o formulário de contato do portfólio e manda
// o e-mail de verdade via Resend. Existe porque o site é HTML estático (GitHub
// Pages): não tem servidor próprio para guardar a chave da API em segredo, e a
// chave NUNCA pode ir no index.html (é secreta, ao contrário do token do Web3Forms).
//
// Substitui o Web3Forms porque ele estava aceitando o envio (respondia como se
// tivesse dado certo) e o e-mail não chegava — nem na caixa de entrada, nem no
// spam. O Resend dá erro de verdade quando algo falha, então dá para saber.
//
// Publicar: dash.cloudflare.com → Workers & Pages → Create → cole este arquivo
// no editor → Deploy. Depois, Settings → Variables and Secrets → adicionar
// RESEND_API_KEY como Secret (não como texto puro). Veja o passo a passo
// completo em contato-CONFIGURAR.md.

const ORIGEM_PERMITIDA = 'https://cristinapesente.github.io';
const PARA = 'ccpesente@gmail.com';

function comCors(res) {
  res.headers.set('Access-Control-Allow-Origin', ORIGEM_PERMITIDA);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return comCors(new Response(null, { status: 204 }));
    }
    if (req.method !== 'POST') {
      return comCors(Response.json({ erro: 'Método não permitido.' }, { status: 405 }));
    }

    let corpo;
    try { corpo = await req.json(); } catch { corpo = {}; }
    const { nome, email, mensagem, honeypot } = corpo || {};

    // Campo invisível preenchido = bot. Finge sucesso para não ensinar o bot a se adaptar.
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
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          // Enquanto o domínio não estiver verificado no Resend, o remetente
          // TEM que ser onboarding@resend.dev — veja contato-CONFIGURAR.md.
          from: 'Portfólio <onboarding@resend.dev>',
          to: PARA,
          reply_to: emailSeguro,
          subject: `Contato pelo portfólio — ${nomeSeguro}`,
          text: `Nome: ${nomeSeguro}\nE-mail: ${emailSeguro}\n\n${mensagemSegura}`,
        }),
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
  },
};
