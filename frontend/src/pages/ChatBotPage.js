// src/pages/ChatBotPage.js
import React, { useState, useEffect, useRef } from "react";

const ChatBotPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: 'Halo! 👋 Saya adalah Asisten Analitik Permintaan Anda. Tanyakan tentang pengeluaran, tren permintaan, atau barang terlaris. Contoh: "Berapa total permintaan unit di tahun 2024?"',
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef(null);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (question = null) => {
    const text = question || inputValue;
    if (text.trim() === "") return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputValue("");
    setShowSuggestions(false);
    setIsBotTyping(true);

    try {
      const response = await fetch("http://localhost:8000/api/chatbot-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.answer || "Tidak ada respons dari server." },
      ]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Maaf, terjadi kesalahan: ${err.message}. Pastikan backend berjalan di localhost:8000`,
        },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestions = [
    "Berapa total permintaan unit tahun 2025?",
    "Total permintaan semua tahun?",
    "Barang apa yang paling sering diminta?",
    "Unit pemohon paling aktif?",
    "Kategori dengan nilai tertinggi?",
    "Berapa jumlah pemohon unik?",
    "Berapa jenis barang yang diminta?",
  ];

  return (
    <div className="page-content">
      <div className="chatbot-container">
        <div className="chat-header">🤖 Asisten Analitik Permintaan</div>
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
              <div className="message-bubble">⏳ Bot sedang mengetik...</div>
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
            className="chat-input-field"
          />
          <button
            id="suggestionChat"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="chat-btn suggestion-btn"
          >
            💡 Saran
          </button>
          <button
            id="sendChat"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className={`chat-btn send-btn ${!inputValue.trim() ? "disabled" : ""}`}
          >
            ✈ Kirim
          </button>
        </div>

        {/* Popup Saran Responsif */}
        {showSuggestions && (
          <div className="suggestions-popup">
            <h4 className="suggestions-title">💭 Pertanyaan Saran</h4>
            <div className="suggestions-grid">
              {suggestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="suggestion-item"
                  onMouseOver={(e) => {
                    e.target.style.background = "#3b82f6";
                    e.target.style.color = "white";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "";
                    e.target.style.color = "";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        /* ✅ Full Responsive Styles */
        .page-content {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: transparent;
          padding: 16px;
          box-sizing: border-box;
        }

        .chatbot-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          background: transparent;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 32px); /* margin top/bottom 16px */
          max-height: 800px;
          overflow: hidden;
        }

        .chat-header {
          background: #3b82f6;
          color: white;
          padding: 14px 16px;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          flex-shrink: 0;
        }

        .chat-box {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-sizing: border-box;
        }

        .message {
          display: flex;
          animation: slideIn 0.3s ease;
        }

        .user-message {
          justify-content: flex-end;
        }

        .bot-message {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 12px;
          line-height: 1.4;
          font-size: 13px;
          word-wrap: break-word;
        }

        .user-message .message-bubble {
          background: #3b82f6;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .bot-message .message-bubble {
          background: #e5e7eb;
          color: #1f2937;
          border-bottom-left-radius: 4px;
        }

        .chat-input {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px;
          background: white;
          border-top: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .chat-input-field {
          flex: 1;
          min-width: 200px;
          padding: 10px 15px;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
        }

        .chat-btn {
          padding: 10px 12px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
        }

        .suggestion-btn {
          background: #8b5cf6;
          color: white;
        }

        .send-btn {
          background: #3b82f6;
          color: white;
        }

        .send-btn.disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* ✅ Popup Saran Responsif */
        .suggestions-popup {
          position: absolute;
          bottom: 72px; /* di atas input (tinggi input ~56px + padding) */
          left: 16px;
          right: 16px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          padding: 14px;
          max-height: 50vh;
          overflow-y: auto;
        }

        .suggestions-title {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 15px;
          font-weight: 600;
        }

        .suggestions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .suggestion-item {
          flex: 1 1 calc(50% - 4px); /* 2 kolom di mobile */
          min-width: 180px; /* mencegah terlalu sempit */
          padding: 10px 12px;
          font-size: 13px;
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 14px;
          cursor: pointer;
          text-align: center;
          font-weight: 500;
          color: #1e40af;
          transition: all 0.2s;
        }

        @media (max-width: 480px) {
          .suggestion-item {
            min-width: 100%;
            flex: 1 1 100%;
          }

          .chat-input-field {
            min-width: 100%;
          }

          .chat-input {
            flex-direction: column;
          }

          .suggestions-popup {
            left: 8px;
            right: 8px;
            bottom: 68px;
          }

          .message-bubble {
            max-width: 90%;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbar */
        .chat-box::-webkit-scrollbar,
        .suggestions-popup::-webkit-scrollbar {
          width: 6px;
        }

        .chat-box::-webkit-scrollbar-track,
        .suggestions-popup::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .chat-box::-webkit-scrollbar-thumb,
        .suggestions-popup::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .chat-box::-webkit-scrollbar-thumb:hover,
        .suggestions-popup::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default ChatBotPage;