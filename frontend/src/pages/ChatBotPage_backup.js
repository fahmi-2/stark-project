// src/pages/ChatBotPage.js
import React, { useState, useEffect, useRef } from "react";
import { fetchAPI } from "../utils/api";

const ChatBotPage = () => {
  // ✅ Ganti: messages → conversationHistory
  const [conversationHistory, setConversationHistory] = useState([
    {
      role: "assistant",
      content: 'Halo! Saya adalah Asisten Analitik Permintaan Anda. Tanyakan tentang pengeluaran, tren permintaan, atau barang terlaris. Contoh: "Berapa total permintaan unit di tahun 2024?"',
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [aiMode, setAiMode] = useState("gemini"); // "rule", "openrouter", "gemini"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]); // ✅ gunakan conversationHistory

 const handleSendMessage = async (question = null) => {
  const text = question || inputValue.trim();
  if (!text) return;

  const newUserMessage = { role: "user", content: text };
  setConversationHistory((prev) => [...prev, newUserMessage]);
  setInputValue("");
  setShowSuggestions(false);
  setIsBotTyping(true);

  let endpoint = "/api/chatbot-ai"; // default: OpenRouter
  if (aiMode === "rule") endpoint = "/api/chatbot-query?question=" + encodeURIComponent(text);
  if (aiMode === "gemini") endpoint = "/api/chatbot-gemini";

  try {
    let response;
    if (aiMode === "rule") {
      // GET request for rule-based
      response = await fetchAPI(endpoint);
    } else {
      // POST request for AI models
      response = await fetchAPI(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory.concat(newUserMessage),
        }),
      });
    }

    const data = await response.json();
    const botMessage = {
      role: "assistant",
      content: data.answer || "Maaf, saya tidak mengerti.",
    };
    setConversationHistory((prev) => [...prev, botMessage]);
  } catch (err) {
    console.error("Error:", err);
    setConversationHistory((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Maaf, terjadi kesalahan. Coba ganti mode AI atau ulangi.",
      },
    ]);
  } finally {
    setIsBotTyping(false);
  }
};

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  const suggestions = [
  "Berapa total permintaan unit (Total Gabungan 2023–2025)?",
  "Berapa nilai pengeluaran barang semua tahun",
  "Barang apa yang paling sering diminta?",
  "Unit pemohon mana yang paling aktif?",
  "Kategori dengan nilai pengeluaran tertinggi?",
  "Berapa rata-rata permintaan per bulan?",
  "Jumlah transaksi tahun 2025 berapa kali?",
];

  return (
    <div className="page-content">
      <div className="chatbot-container">
        <div className="chat-header">Asisten Analitik Permintaan (Bot)</div>
        <div className="chat-box" id="chatBox">
          {/* ✅ Ganti: messages → conversationHistory */}
          {conversationHistory.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role === "user" ? "user-message" : "bot-message"}`}
            >
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}
          {isBotTyping && (
            <div className="message bot-message">
              <div className="message-bubble">
                <span className="typing-indicator">
                  <span></span><span></span><span></span>
                </span>
              </div>
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
            disabled={isBotTyping}
          />
          <div style={{
  display: "flex", gap: "8px", marginTop: "8px", justifyContent: "center"
}}>
  <button 
    onClick={() => setAiMode("rule")}
    style={{
      fontSize: "12px",
      padding: "4px 8px",
      backgroundColor: aiMode === "rule" ? "#3b82f6" : "#e2e8f0",
      color: aiMode === "rule" ? "white" : "#4b5563",
      border: "1px solid #cbd5e1",
      borderRadius: "6px"
    }}
  >
    Rule-Based
  </button>
  <button 
    onClick={() => setAiMode("gemini")}
    style={{
      fontSize: "12px",
      padding: "4px 8px",
      backgroundColor: aiMode === "gemini" ? "#8b5cf6" : "#e2e8f0",
      color: aiMode === "gemini" ? "white" : "#4b5563",
      border: "1px solid #cbd5e1",
      borderRadius: "6px"
    }}
  >
    🟣 Gemini
  </button>
  <button 
    onClick={() => setAiMode("openrouter")}
    style={{
      fontSize: "12px",
      padding: "4px 8px",
      backgroundColor: aiMode === "openrouter" ? "#10b981" : "#e2e8f0",
      color: aiMode === "openrouter" ? "white" : "#4b5563",
      border: "1px solid #cbd5e1",
      borderRadius: "6px"
    }}
  >
    🟢 OpenRouter
  </button>
</div>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            disabled={isBotTyping}
            style={{
              backgroundColor: "#8b5cf6",
              color: "white",
              border: "none",
              padding: "10px 12px",
              cursor: isBotTyping ? "not-allowed" : "pointer",
              fontSize: "12px",
            }}
          >
            <i className="fas fa-lightbulb"></i> Saran
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isBotTyping}
            style={{
              backgroundColor: !inputValue.trim() || isBotTyping ? "#ccc" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "10px 12px",
              cursor: !inputValue.trim() || isBotTyping ? "not-allowed" : "pointer",
            }}
          >
            <i className="fas fa-paper-plane"></i> Kirim
          </button>
        </div>

        {showSuggestions && (
          <div
            className="suggestions-popup"
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
              maxHeight: "300px",
              overflowY: "auto",
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
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .chatbot-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          position: relative;
        }
        .chat-header {
          background: #1e40af;
          color: white;
          padding: 12px 20px;
          border-radius: 12px 12px 0 0;
          font-weight: 600;
          text-align: center;
        }
        .chat-box {
          height: 400px;
          overflow-y: auto;
          padding: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-bottom: none;
        }
        .message {
          display: flex;
          margin: 8px 0;
        }
        .user-message {
          justify-content: flex-end;
        }
        .bot-message {
          justify-content: flex-start;
        }
        .message-bubble {
          max-width: 80%;
          padding: 10px 12px;
          border-radius: 18px;
        }
        .user-message .message-bubble {
          background: #3b82f6;
          color: white;
          border-bottom-right-radius: 2px;
        }
        .bot-message .message-bubble {
          background: #f1f5f9;
          color: #334155;
          border-bottom-left-radius: 2px;
        }
        .chat-input {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 8px 8px;
          
        }
        .chat-input input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 20px 0 0 20px;
          font-size: 14px;
        }
        
        .typing-indicator {
          display: flex;
          gap: 3px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #64748b;
          border-radius: 50%;
          animation: typing 1s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          .chatbot-container {
            margin: 10px;
            padding: 10px;
          }
          .chat-box {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatBotPage;