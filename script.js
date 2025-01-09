const MANUAL_DE_CONVIVENCIA_TEXT = `...`;
let documentChunks = [];
let conversationHistory = [];
let ttsEnabled = false;
let speechSynthesis = window.speechSynthesis;
let spanishVoice = null;

function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

documentChunks = chunkText(MANUAL_DE_CONVIVENCIA_TEXT);

function retrieveRelevantContext(question, chunks, topK = 3) {
  const lowercaseQuestion = question.toLowerCase();
  const scoredChunks = chunks.map(chunk => ({
    chunk,
    score: calculateRelevanceScore(lowercaseQuestion, chunk.toLowerCase())
  }));
  return scoredChunks.sort((a, b) => b.score - a.score).slice(0, topK).map(item => item.chunk);
}

function calculateRelevanceScore(query, chunk) {
  const queryTerms = query.split(/\s+/);
  const matchedTerms = queryTerms.filter(term => chunk.includes(term));
  return matchedTerms.length / queryTerms.length;
}

async function sendQuestion() {
  const userInput = document.getElementById('user-input');
  const question = userInput.value.trim();
  if (!question) {
    appendMessage('', 'Por favor, escribe una pregunta.', 'bot-message');
    return;
  }
  appendMessage('', question, 'user-message');
  const botResponseElement = appendMessage('', '', 'typing-indicator');
  userInput.value = '';
  userInput.disabled = true;
  try {
    const relevantContexts = retrieveRelevantContext(question, documentChunks);
    const contextString = relevantContexts.join(' ... ');
    conversationHistory.push({
      role: "user",
      content: question
    });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{
          role: "system",
          content: `Tu nombre es "ConviBOT". Eres un asistente que analiza el texto proporcionado sobre un Manual de Convivencia de la Institución llamada "J.J" para responder preguntas de los usuarios a partir de la informacion este texto. Si la pregunta no es clara, debes guiar al usuario haciendole preguntas para entender mejor su consulta o ayuda a interpretar posibles inferencias, ya que debes ser capaz de contestar cualquier tipo de pregunta.
                    El texto que devuelvas debe ser escrito sin asteriscos o algunos otros signos extraños, ya que este texto será convertido a voz para que un robot lo lea, por tanto, debes escribir las respuestas en texto muy bien para que al ser convertidas a voz, suenen de manera natural.
                    No resumas las informaciones que se extraen del texto de referencia para dar las respuestas al usuario.
                    Siempre debes responder de manera útil, amigable y proactiva.`
        }, ...conversationHistory, {
          role: "user",
          content: `Contexto: ${contextString}\n\nPregunta: ${question}`
        }],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      })
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    botResponseElement.classList.remove('typing-indicator');
    botResponseElement.textContent = '';
    while (true) {
      const {
        done,
        value
      } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsedChunk = JSON.parse(line.slice(6));
            if (parsedChunk.choices && parsedChunk.choices[0].delta.content) {
              const content = parsedChunk.choices[0].delta.content;
              result += content;
              botResponseElement.textContent = result;
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    }
    conversationHistory.push({
      role: "assistant",
      content: result
    });
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    userInput.disabled = false;
    if (ttsEnabled) {
      speakText(result);
    }
  } catch (error) {
    appendMessage('', `Error al procesar la solicitud: ${error.message}`, 'bot-message error');
    console.error('Detalles del error:', error);
    userInput.disabled = false;
  }
}

function appendMessage(sender, message, type = 'normal') {
  const chatContainer = document.getElementById('chat-container');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  const iconElement = document.createElement('div');
  iconElement.classList.add('message-icon');
  const contentElement = document.createElement('div');
  contentElement.classList.add('message-content');
  iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <circle cx="12" cy="16" r="2"/>
            <path d="M12 7V4"/>
            <path d="M8 7V4"/>
            <path d="M16 7V4"/>
        </svg>`;
  if (type === 'user-message') {
    messageElement.classList.add('user-message');
  } else {
    messageElement.classList.add('bot-message');
  }
  contentElement.textContent = message;
  messageElement.appendChild(iconElement);
  messageElement.appendChild(contentElement);
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageElement;
}

function displayWelcomeMessage() {
  const welcomeMessage = "Hola. ¡Bienvenido al Asistente del Manual de Convivencia! Estoy aquí para ayudarte a resolver dudas sobre lo escrito en el manual de convivencia de nuestra institución. ¿En qué puedo ayudarte hoy?";
  appendMessage('', welcomeMessage, 'bot-message');
}

function resetChat() {
  const chatContainer = document.getElementById('chat-container');
  chatContainer.innerHTML = '';
  conversationHistory = [];
  const userInput = document.getElementById('user-input');
  userInput.value = '';
  userInput.disabled = false;
  displayWelcomeMessage();
}

function toggleDarkMode() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  const themeButton = document.querySelector(".action-button[onclick='toggleDarkMode()']");
  if (themeButton) {
    themeButton.textContent = newTheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
  }
}

function shareChat() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) {
    console.error('Chat container not found');
    return;
  }
  const messages = Array.from(chatContainer.getElementsByClassName('message')).map(msg => {
    const contentEl = msg.querySelector('.message-content');
    if (!contentEl) {
      return '';
    }
    const content = contentEl.textContent;
    const isUser = msg.classList.contains('user-message');
    return `${isUser ? 'Usuario' : 'ConviBot'}: ${content}`;
  }).filter(msg => msg).join('\n\n');
  if (navigator.share) {
    navigator.share({
      title: 'Chat del Manual de Convivencia',
      text: messages
    }).catch(err => {
      console.error('Error sharing:', err);
      fallbackToClipboard(messages);
    });
  } else {
    fallbackToClipboard(messages);
  }
}

function fallbackToClipboard(messages) {
  navigator.clipboard.writeText(messages).then(() => {
    alert('Chat copiado al portapapeles');
  }).catch(console.error);
}

let isRecording = false;
let recognition = null;

function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.onresult = function (event) {
      const userInput = document.getElementById('user-input');
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        userInput.value = finalTranscript;
      }
    };
    recognition.onerror = function (event) {
      console.error('Speech recognition error:', event.error);
      stopRecording();
    };
    recognition.onend = function () {
      stopRecording();
    };
  } else {
    console.error('Speech recognition not supported');
  }
}

function toggleRecording() {
  const micButton = document.getElementById('mic-button');
  if (!recognition) {
    initializeSpeechRecognition();
  }
  if (!isRecording) {
    try {
      recognition.start();
      isRecording = true;
      micButton.classList.add('recording');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  } else {
    stopRecording();
  }
}

function stopRecording() {
  const micButton = document.getElementById('mic-button');
  if (recognition) {
    recognition.stop();
  }
  isRecording = false;
  micButton.classList.remove('recording');
}

function initTextToSpeech() {
  speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices();
    spanishVoice = voices.find(voice => voice.lang.includes('es')) || voices[0];
  };
}

function toggleTextToSpeech() {
  const ttsButton = document.getElementById('tts-button');
  ttsEnabled = !ttsEnabled;
  if (ttsEnabled) {
    ttsButton.classList.add('tts-active');
    ttsButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 6v12M6 12h12"/>
                <path d="M16 6a4 4 0 0 1 4 4M18 2a8 8 0 0 1 8 8"/>
            </svg>
            Detener lectura`;
  } else {
    ttsButton.classList.remove('tts-active');
    ttsButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 6v12M6 12h12"/>
                <path d="M16 6a4 4 0 0 1 4 4M18 2a8 8 0 0 1 8 8"/>
            </svg>
            Leer mensajes`;
    speechSynthesis.cancel();
  }
}

function speakText(text) {
  if (!ttsEnabled) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = spanishVoice;
  utterance.lang = 'es-ES';
  utterance.rate = 1;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

window.onload = function () {
  displayWelcomeMessage();
  document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      sendQuestion();
    }
  });
  const html = document.documentElement;
  const themeButton = document.querySelector(".action-button[onclick='toggleDarkMode()']");
  if (themeButton) {
    themeButton.textContent = html.getAttribute('data-theme') === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
  }
  initializeSpeechRecognition();
  initTextToSpeech();
};

