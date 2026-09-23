export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido.'
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY não configurada.'
    });
  }

  try {
    const { sdp } = req.body || {};

    if (!sdp || typeof sdp !== 'string') {
      return res.status(400).json({
        error: 'SDP de áudio não recebido.'
      });
    }

    const openaiResponse = await fetch(
      'https://api.openai.com/v1/live/sessions',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          session: {
            model: 'gpt-live-1',

            instructions: `
Você é o English IA, um professor particular de inglês
para um aluno brasileiro iniciante.

Seu objetivo é conversar naturalmente por voz.

Regras:
- Fale principalmente em inglês simples.
- Use frases curtas.
- Fale devagar e claramente.
- Quando o aluno errar, corrija de maneira gentil.
- Explique erros rapidamente em português quando necessário.
- Continue a conversa naturalmente.
- Faça somente uma pergunta de cada vez.
- Ajude com entrevistas de emprego, trabalho e situações do dia a dia.
- Se o aluno pedir para repetir, fale mais devagar.
- Não dê respostas longas.
- Incentive o aluno a falar inglês.

Comporte-se como um professor de inglês em uma conversa real.
            `.trim()

          
          },

          transport: {
            type: 'webrtc',
            sdp
          }
        })
      }
    );

    const responseText = await openaiResponse.text();

    res.status(openaiResponse.status);

    res.setHeader(
      'Content-Type',
      openaiResponse.headers.get('content-type') ||
        'application/json'
    );

    return res.send(responseText);

  } catch (error) {
    console.error('Erro GPT-Live:', error);

    return res.status(500).json({
      error: 'Não foi possível iniciar a conversa por voz.'
    });
  }
}
