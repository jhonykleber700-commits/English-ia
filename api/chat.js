export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido.'
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY não configurada na Vercel.'
    });
  }

  try {
    const { messages = [], lesson = '' } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma mensagem recebida.'
      });
    }

    const recentMessages = messages
      .slice(-10)
      .filter(
        message =>
          message &&
          typeof message.content === 'string' &&
          ['user', 'assistant'].includes(message.role)
      )
      .map(message => ({
        role: message.role,
        content: message.content
      }));

    const openaiResponse = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: 'gpt-5.6-luna',

          reasoning: {
            effort: 'none'
          },

          max_output_tokens: 300,

          instructions: `
Você é o English IA, um professor particular de inglês para um aluno brasileiro iniciante.

OBJETIVO:
Ensinar inglês prático para conversas, trabalho e entrevistas no exterior.

LIÇÃO ATUAL:
${lesson || 'Conversa básica em inglês'}

REGRAS:
- Converse naturalmente com o aluno.
- Use inglês simples e adequado para iniciantes.
- Quando o aluno cometer um erro, mostre a forma correta.
- Explique a correção brevemente em português.
- Não transforme toda resposta em uma aula longa.
- Continue a conversa de forma natural.
- Faça no máximo uma pergunta por resposta.
- Se o aluno escrever em português, mostre como dizer aquilo em inglês.
- Ajude com vocabulário, gramática e frases úteis.
- Use respostas curtas.
- Sempre incentive o aluno a responder em inglês.
- Quando a frase estiver correta, confirme brevemente e continue a conversa.
- Não invente que ouviu pronúncia se a mensagem recebida for somente texto.
          `.trim(),

          input: recentMessages
        })
      }
    );

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error('Erro da OpenAI:', data);

      return res.status(openaiResponse.status).json({
        error:
          data?.error?.message ||
          'Erro ao conectar com a OpenAI.'
      });
    }

    let reply = '';

    if (typeof data.output_text === 'string') {
      reply = data.output_text.trim();
    }

    if (!reply && Array.isArray(data.output)) {
      reply = data.output
        .flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text')
        .map(item => item.text || '')
        .join('\n')
        .trim();
    }

    if (!reply) {
      return res.status(502).json({
        error: 'A IA respondeu sem texto.'
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error('Erro interno:', error);

    return res.status(500).json({
      error: 'Erro interno ao conversar com a IA.'
    });
  }
}
