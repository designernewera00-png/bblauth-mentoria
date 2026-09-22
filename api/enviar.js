/* =================================================================
   POST /api/enviar — recebe o formulário do pop up e manda por e-mail
   (Vercel Function + Resend)

   Variável de ambiente no Vercel:
     RESEND_API_KEY  chave da API do Resend
     WEBHOOK_URL     URL do webhook do Make que recebe cada lead

   Remetente: sem domínio verificado no Resend, só dá pra enviar de
   onboarding@resend.dev e apenas para o e-mail dono da conta. Quando
   um domínio for verificado, troque REMETENTE por algo como
   "Site Bruna Blauth <contato@seudominio.com.br>".
   ================================================================= */

var DESTINO = 'brunablauth10@gmail.com';
var REMETENTE = 'Site Bruna Blauth <onboarding@resend.dev>';

var TREINAMENTOS = { 'individual': 'Individual', 'em-grupo': 'Em grupo' };

var LETRAS = /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/;
var EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function texto(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function escaparHtml(s) {
  return s.replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* repete no servidor as mesmas regras do formulário: o navegador
   pode ser contornado, o servidor não */
function validar(corpo) {
  var dados = {
    nome: texto(corpo.nome, 120),
    whatsapp: texto(corpo.whatsapp, 20),
    email: texto(corpo.email, 160),
    area: texto(corpo.area, 200),
    objetivo: texto(corpo.objetivo, 1000),
    treinamento: TREINAMENTOS[corpo.treinamento] || '',
    /* UTMs dos campos ocultos: opcionais, vêm vazias no acesso direto */
    utm_source: texto(corpo.utm_source, 200),
    utm_medium: texto(corpo.utm_medium, 200),
    utm_campaign: texto(corpo.utm_campaign, 200),
    utm_term: texto(corpo.utm_term, 200),
    utm_content: texto(corpo.utm_content, 200)
  };

  var digitos = dados.whatsapp.replace(/\D/g, '');

  if (!dados.nome || !LETRAS.test(dados.nome) || dados.nome.replace(/ /g, '').length < 2) return null;
  if (!/^[1-9]{2}\d{8,9}$/.test(digitos) || (digitos.length === 11 && digitos.charAt(2) !== '9')) return null;
  if (!EMAIL.test(dados.email)) return null;
  if (!dados.area || !dados.objetivo || !dados.treinamento) return null;

  return dados;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  var corpo = req.body;
  if (typeof corpo === 'string') {
    try { corpo = JSON.parse(corpo); } catch (e) { corpo = null; }
  }
  if (!corpo || typeof corpo !== 'object') {
    return res.status(400).json({ ok: false, erro: 'Dados inválidos.' });
  }

  /* campo-isca invisível: pessoas não preenchem, robôs sim.
     Responde "ok" pro robô não perceber e não envia nada. */
  if (corpo.site) {
    return res.status(200).json({ ok: true });
  }

  var dados = validar(corpo);
  if (!dados) {
    return res.status(400).json({ ok: false, erro: 'Confira os campos do formulário.' });
  }

  var chave = process.env.RESEND_API_KEY;
  if (!chave) {
    console.error('RESEND_API_KEY não configurada no Vercel.');
    return res.status(500).json({ ok: false, erro: 'Envio indisponível no momento.' });
  }

  var linhas = [
    ['Nome', dados.nome],
    ['WhatsApp', dados.whatsapp],
    ['E-mail', dados.email],
    ['Área de atuação', dados.area],
    ['Principal objetivo', dados.objetivo],
    ['Treinamento', dados.treinamento]
  ];

  /* no e-mail, só as UTMs que vieram preenchidas */
  [
    ['UTM source', dados.utm_source],
    ['UTM medium', dados.utm_medium],
    ['UTM campaign', dados.utm_campaign],
    ['UTM term', dados.utm_term],
    ['UTM content', dados.utm_content]
  ].forEach(function (l) { if (l[1]) linhas.push(l); });

  var digitos = dados.whatsapp.replace(/\D/g, '');
  var linkZap = 'https://wa.me/55' + digitos;

  var html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#000;max-width:560px">' +
      '<h2 style="margin:0 0 16px;color:#a41034;font-size:20px">Novo interessado na Mentoria Abdômen Lucrativo</h2>' +
      '<table cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%">' +
        linhas.map(function (l) {
          return '<tr>' +
            '<td style="border-bottom:1px solid #eee;color:#666;white-space:nowrap;vertical-align:top">' + l[0] + '</td>' +
            '<td style="border-bottom:1px solid #eee"><strong>' + escaparHtml(l[1]).replace(/\n/g, '<br>') + '</strong></td>' +
          '</tr>';
        }).join('') +
      '</table>' +
      '<p style="margin:20px 0 0">' +
        '<a href="' + linkZap + '" style="display:inline-block;background:#a41034;color:#fff;text-decoration:none;padding:12px 18px;border-radius:4px">Chamar no WhatsApp</a>' +
      '</p>' +
      '<p style="margin:16px 0 0;color:#999;font-size:12px">Enviado pelo formulário do site. Responder este e-mail responde direto para a pessoa.</p>' +
    '</div>';

  var textoPuro =
    'Novo interessado na Mentoria Abdômen Lucrativo\n\n' +
    linhas.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n') +
    '\n\nWhatsApp: ' + linkZap;

  /* dispara o webhook junto com o e-mail; se ele falhar, o lead
     continua chegando por e-mail e a pessoa vê a tela de sucesso */
  var webhook = enviarWebhook(dados, linkZap);

  try {
    var resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + chave,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [DESTINO],
        reply_to: dados.email,
        subject: 'Novo lead da mentoria: ' + dados.nome,
        html: html,
        text: textoPuro
      })
    });

    /* espera o webhook terminar: no Vercel a função é encerrada
       assim que a resposta sai */
    await webhook;

    if (!resposta.ok) {
      console.error('Resend recusou o envio:', resposta.status, await resposta.text());
      return res.status(502).json({ ok: false, erro: 'Não foi possível enviar agora.' });
    }

    return res.status(200).json({ ok: true });
  } catch (erro) {
    await webhook;
    console.error('Falha ao falar com o Resend:', erro);
    return res.status(502).json({ ok: false, erro: 'Não foi possível enviar agora.' });
  }
};

/* manda o lead em JSON para WEBHOOK_URL (webhook do Make).
   A URL fica só no Vercel: quem tem ela consegue mandar dados pro
   cenário, então não vai pro código. Sem ela, não faz nada.
   Nunca lança erro. */
async function enviarWebhook(dados, linkZap) {
  var url = process.env.WEBHOOK_URL;
  if (!url) {
    console.warn('WEBHOOK_URL não configurada no Vercel; lead não enviado ao Make.');
    return;
  }

  try {
    var resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: dados.nome,
        whatsapp: dados.whatsapp,
        email: dados.email,
        area: dados.area,
        objetivo: dados.objetivo,
        treinamento: dados.treinamento,
        link_whatsapp: linkZap,
        utm_source: dados.utm_source,
        utm_medium: dados.utm_medium,
        utm_campaign: dados.utm_campaign,
        utm_term: dados.utm_term,
        utm_content: dados.utm_content,
        origem: 'Site Mentoria Abdômen Lucrativo',
        enviado_em: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!resposta.ok) {
      console.error('Webhook recusou o lead:', resposta.status, await resposta.text());
    }
  } catch (erro) {
    console.error('Falha ao chamar o webhook:', erro);
  }
}
