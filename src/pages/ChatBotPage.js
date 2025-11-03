// src/pages/ChatBotPage.js
import React, { useState, useEffect, useRef } from 'react';

const ChatBotPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Halo! Saya adalah Asisten Analitik Permintaan Anda. Tanyakan tentang pengeluaran, tren permintaan, atau barang terlaris. Contoh: "Berapa total permintaan unit di tahun 2024?"'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll ke bawah saat ada pesan baru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fungsi untuk mengirim pesan
  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    // Tambahkan pesan user
    setMessages(prev => [...prev, { sender: 'user', text: inputValue }]);

    // Kirim ke backend
    try {
      // Di dalam handleSendMessage:
const response = await fetch(`http://localhost:8000/api/chatbot-query?question=${encodeURIComponent(inputValue)}`);
      const data = await response.json();

      // Tampilkan respons bot
      setMessages(prev => [...prev, { sender: 'bot', text: data.answer }]);
    } catch (err) {
      console.error('Error:', err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Maaf, terjadi kesalahan saat memproses pertanyaan Anda." }]);
    }

    // Kosongkan input
    setInputValue('');
  };

  // Fungsi untuk menangani Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="page-content">
      <div className="chatbot-container">
        <div className="chat-header">
          Asisten Analitik Permintaan (Bot)
        </div>
        <div className="chat-box" id="chatBox">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
              <div className="message-bubble">{msg.text}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            id="chatInput"
            placeholder="Ketik pertanyaan Anda..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button id="sendChat" onClick={handleSendMessage}>
            <i className="fas fa-paper-plane"></i> Kirim
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBotPage;