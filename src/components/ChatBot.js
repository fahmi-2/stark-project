// ChatBot.js
import React, { useState } from 'react';

const ChatBot = () => {
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'Halo! Saya adalah Asisten Analitik Permintaan Anda.' }]);

  const handleSendMessage = (message) => {
    setMessages([...messages, { sender: 'user', text: message }]);
  };

  return (
    <div className="chatbot-container">
      <div className="chat-header">Asisten Analitik Permintaan (Bot)</div>
      <div className="chat-box">
        {messages.map((message, index) => (
          <div className={`message ${message.sender}-message`} key={index}>
            <div className="message-bubble">{message.text}</div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input type="text" placeholder="Ketik pertanyaan Anda..." onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(e.target.value); }} />
        <button onClick={() => handleSendMessage(document.querySelector('input').value)}><i className="fas fa-paper-plane"></i> Kirim</button>
      </div>
    </div>
  );
};

export default ChatBot;
