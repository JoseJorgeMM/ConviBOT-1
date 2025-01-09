import express from 'express';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';

config(); // Carga las variables de entorno

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

app.post('/api/chat', async (req, res) => {
  const { question, conversationHistory } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `Tu nombre es "ConviBOT". Eres un asistente que analiza el texto proporcionado sobre un Manual de Convivencia de la Institución llamada "J.J" para responder preguntas de los usuarios a partir de la informacion este texto. Si la pregunta no es clara, debes guiar al usuario haciendole preguntas para entender mejor su consulta o ayuda a interpretar posibles inferencias, ya que debes ser capaz de contestar cualquier tipo de pregunta.
                      El texto que devuelvas debe ser escrito sin asteriscos o algunos otros signos extraños, ya que este texto será convertido a voz para que un robot lo lea, por tanto, debes escribir las respuestas en texto muy bien para que al ser convertidas a voz, suenen de manera natural.
                      No resumas las informaciones que se extraen del texto de referencia para dar las respuestas al usuario.
                      Siempre debes responder de manera útil, amigable y proactiva.`
          },
          ...conversationHistory,
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      })
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(`data: ${chunk}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

