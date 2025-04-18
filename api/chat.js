// api/chat.js
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const { history } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      res.status(400).json({ error: 'El historial está vacío o malformado.' });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: history,
      max_tokens: 1000,
    });

    const response = completion.choices?.[0]?.message?.content || 'No se recibió respuesta de la IA.';
    res.status(200).json({ response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Ocurrió un error procesando la solicitud.' });
  }
};
