import axios from 'axios';

const fetchGroqData = async (question, contextString) => {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `Tu nombre es "ConviBOT". Eres un asistente que analiza el texto proporcionado sobre un Manual de Convivencia de la Institución llamada "J.J" para responder preguntas de los usuarios a partir de la informacion este texto. Si la pregunta no es clara, debes guiar al usuario haciendole preguntas para entender mejor su consulta o ayuda a interpretar posibles inferencias, ya que debes ser capaz de contestar cualquier tipo de pregunta.
                      El texto que devuelvas debe ser escrito sin asteriscos o algunos otros signos extraños, ya que este texto será convertido a voz para que un robot lo lea, por tanto, debes escribir las respuestas en texto muy bien para que al ser convertidas a voz, suenen de manera natural.
                      No resumas las informaciones que se extraen del texto de referencia para dar las respuestas al usuario.
                      Siempre debes responder de manera útil, amigable y proactiva.`
          },
          {
            role: "user",
            content: `Contexto: ${contextString}\n\nPregunta: ${question}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Groq data:', error);
    throw error;
  }
};

export default fetchGroqData;

