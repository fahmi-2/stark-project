// src/pages/ChatBotPage.js
import React, { useState, useEffect, useRef } from "react";
import { fetchAPI } from "../utils/api";

const ChatBotPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: 'Halo! Saya adalah Asisten Analitik Permintaan Anda. Tanyakan tentang pengeluaran, tren permintaan, atau barang terlaris. Contoh: "Berapa total permintaan unit di tahun 2024?"',
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef(null);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Scroll ke bawah saat ada pesan baru
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fungsi untuk mengirim pesan
  const handleSendMessage = async (question = null) => {
    const text = question || inputValue;
    if (text.trim() === "") return;

    // Tambahkan pesan user
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputValue("");
    setShowSuggestions(false);
    setIsBotTyping(true);

    try {
      // ✅ KIRIM KE ENDPOINT BARU — POST dengan body JSON
      const response = await fetchAPI("/api/chatbot-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { question: text },
      });

      const data = await response.json();

      // Tampilkan respons bot
      setMessages((prev) => [...prev, { sender: "bot", text: data.answer }]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Maaf, terjadi kesalahan saat memproses pertanyaan Anda.",
        },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  // Fungsi untuk menangani Enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Daftar pertanyaan saran
  const suggestions = [
    "Berapa total permintaan unit tahun 2025?",
    "Total permintaan semua tahun (2023–2025)?",
    "Barang apa yang paling sering diminta?",
    "Unit pemohon paling aktif tahun 2024?",
    "Kategori dengan nilai tertinggi tahun 2025?",
    "Tren bulanan pengeluaran tahun 2025?",
    "Siapa yang paling banyak mengajukan permintaan?",
  ];

  return (
    <div className="page-content">
      <div className="chatbot-container">
        <div className="chat-header">Asisten Analitik Permintaan (Bot)</div>
        <div className="chat-box" id="chatBox">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.sender === "user" ? "user-message" : "bot-message"
              }`}
            >
              <div className="message-bubble">{msg.text}</div>
            </div>
          ))}
          {isBotTyping && (
            <div className="message bot-message">
              <div className="message-bubble">Bot sedang mengetik...</div>
            </div>
          )}
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
          <button
            id="suggestionChat"
            onClick={() => setShowSuggestions(!showSuggestions)}
            style={{
              backgroundColor: "#8b5cf6",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: "20px",
              cursor: "pointer",
              marginRight: "8px",
              fontSize: "12px",
            }}
          >
            <i className="fas fa-lightbulb"></i> Saran
          </button>
          <button
            id="sendChat"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            style={{
              backgroundColor: !inputValue.trim() ? "#ccc" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: "20px",
              cursor: !inputValue.trim() ? "not-allowed" : "pointer",
            }}
          >
            <i className="fas fa-paper-plane"></i> Kirim
          </button>
        </div>

        {/* Popup Saran Pertanyaan */}
        {showSuggestions && (
          <div
            style={{
              position: "absolute",
              bottom: "60px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "80%",
              maxWidth: "500px",
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 1000,
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {suggestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "12px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "12px",
                    cursor: "pointer",
                    flex: "1 1 auto",
                    textAlign: "center",
                    maxWidth: "100%",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBotPage;