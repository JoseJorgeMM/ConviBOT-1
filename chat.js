import fetchGroqData from './script';

export async function sendQuestion(question, contextString) {
  try {
    const stream = await fetchGroqData(question, contextString);
    return stream;
  } catch (error) {
    console.error('Error in sendQuestion:', error);
    throw error;
  }
}

