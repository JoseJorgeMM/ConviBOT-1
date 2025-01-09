import React, { useState, useEffect, useRef } from 'react';
import ChatContainer from './components/ChatContainer';
import InputContainer from './components/InputContainer';
import Header from './components/Header';
import { Message, ConversationHistory } from './types';
import { sendQuestion, displayWelcomeMessage } from './utils/chatUtils';
import { initTextToSpeech } from './utils/speechUtils';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    displayWelcomeMessage(setMessages);
    initTextToSpeech();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendQuestion = async (question: string) => {
    setIsLoading(true);
    const newMessages = await sendQuestion(question, messages, conversationHistory, ttsEnabled);
    setMessages(newMessages);
    setConversationHistory(prev => [...prev, { role: "user", content: question }, { role: "assistant", content: newMessages[newMessages.length - 1].content }]);
    setIsLoading(false);
  };

  const handleResetChat = () => {
    setMessages([]);
    setConversationHistory([]);
    displayWelcomeMessage(setMessages);
  };

  const handleToggleTts = () => {
    setTtsEnabled(prev => !prev);
  };

  return (
    <div className="card">
      <Header onResetChat={handleResetChat} onToggleTts={handleToggleTts} ttsEnabled={ttsEnabled} />
      <ChatContainer messages={messages} ref={chatContainerRef} />
      <InputContainer onSendQuestion={handleSendQuestion} isLoading={isLoading} />
    </div>
  );
};

export default App;

