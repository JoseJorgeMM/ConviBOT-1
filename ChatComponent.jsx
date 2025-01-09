import React, { useState, useEffect } from 'react';
import { sendQuestion } from './chat';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: input }]);

    try {
      const contextString = ""; // You should implement a function to get relevant context
      const stream = await sendQuestion(input, contextString);

      let result = '';
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
        
        // Update the bot's message in real-time
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'bot') {
            lastMessage.content = result;
          } else {
            newMessages.push({ type: 'bot', content: result });
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { type: 'error', content: 'Error processing your request. Please try again.' }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.type}`}>
          {message.content}
        </div>
      ))}
      {isLoading && <div className="message bot">Thinking...</div>}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        placeholder="Type your message..."
        disabled={isLoading}
      />
      <button onClick={handleSendMessage} disabled={isLoading}>Send</button>
    </div>
  );
};

export default ChatComponent;

