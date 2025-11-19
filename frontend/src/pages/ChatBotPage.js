// src/pages/ChatBotPage.js
import React, { useState, useEffect, useRef } from "react";

const ChatBotPage = () => {
  // ✅ Ganti: messages → conversationHistory
  const [conversationHistory, setConversationHistory] = useState([
    {
      sender: "bot",
      text: 'Halo! 👋 Saya adalah Asisten Analitik Permintaan STARK. Tanyakan tentang sistem, data permintaan, tren, atau barang terlaris. Contoh: "Apa itu STARK?" atau "Berapa total permintaan unit di tahun 2024?"',
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("data"); // 'data' atau 'sistem'
  const messagesEndRef = useRef(null);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]); // ✅ gunakan conversationHistory

 const handleSendMessage = async (question = null) => {
  const text = question || inputValue.trim();
  if (!text) return;

    // Tambahkan pesan user
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
      console.log("Response dari backend:", data);

      // Tampilkan respons bot dengan formatting yang lebih baik
      const formattedAnswer = data.answer || "Tidak ada respons dari server.";
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: formattedAnswer },
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

  // ===== DAFTAR SARAN PERTANYAAN (Dikelompokkan) ===== ✅ DIPERBAIKI
  const suggestionCategories = {
    sistem: [
      "Apa itu STARK?",
      "Apa itu ATK?",
      "Fitur apa saja di STARK?",
      "Bagaimana cara menggunakan dashboard?",
      "Berapa halaman yang ada?",
      "Cara membaca visualisasi?",
      "Data tahun berapa saja tersedia?",
    ],
    data: [
      "Berapa total permintaan unit tahun 2025?",
      "Tren permintaan tahun 2024",
      "Tren pengeluaran tahun 2025",
      "Barang apa yang paling sering diminta?",
      "Unit pemohon paling aktif?",
      "Kategori dengan nilai tertinggi?",
      "Berapa jumlah pemohon unik?",
      "Berapa jenis barang yang diminta?",
      "Rata-rata harga per unit?",
    ],
  };

  const currentSuggestions = suggestionCategories[selectedCategory];

  return (
    <div className="page-content">
      <div className="chatbot-container">
        <div className="chat-header">🤖 Asisten Analitik STARK</div>
        <div className="chat-box" id="chatBox">
          {/* ✅ Ganti: messages → conversationHistory */}
          {conversationHistory.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role === "user" ? "user-message" : "bot-message"}`}
            >
              <div 
                className="message-bubble"
                style={{
                  whiteSpace: "pre-line", // ✅ Biar format \n berfungsi
                }}
              >
                {msg.text}
              </div>
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
            style={{
              flex: 1,
              padding: "10px 15px",
              borderRadius: "20px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              marginRight: "8px",
            }}
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
              fontWeight: "600",
            }}
          >
            💡 Saran
          </button>
          <button
            id="sendChat"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            style={{
              backgroundColor: !inputValue.trim() ? "#ccc" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: "20px",
              cursor: !inputValue.trim() ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            ✈️ Kirim
          </button>
        </div>

        {/* ===== Popup Saran Pertanyaan dengan Tab ===== ✅ BARU */}
        {showSuggestions && (
          <div
            className="suggestions-popup"
            style={{
              position: "absolute",
              bottom: "70px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "90%",
              maxWidth: "550px",
              backgroundColor: "white",
              border: "2px solid #3b82f6",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 1000,
              padding: "0",
              overflow: "hidden",
            }}
          >
            {/* Tab Header */}
            <div
              style={{
                display: "flex",
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              <button
                onClick={() => setSelectedCategory("data")}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor:
                    selectedCategory === "data" ? "#3b82f6" : "#f3f4f6",
                  color: selectedCategory === "data" ? "white" : "#6b7280",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  transition: "all 0.2s",
                }}
              >
                📊 Pertanyaan Data
              </button>
              <button
                onClick={() => setSelectedCategory("sistem")}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor:
                    selectedCategory === "sistem" ? "#3b82f6" : "#f3f4f6",
                  color: selectedCategory === "sistem" ? "white" : "#6b7280",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  transition: "all 0.2s",
                }}
              >
                ℹ️ Tentang Sistem
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: "12px", maxHeight: "300px", overflowY: "auto" }}>
              <h4
                style={{
                  margin: "0 0 10px 0",
                  color: "#1f2937",
                  fontSize: "14px",
                }}
              >
                {selectedCategory === "data"
                  ? "💭 Tanyakan tentang Data & Tren"
                  : "💭 Tanyakan tentang Sistem STARK"}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {currentSuggestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(q);
                      setShowSuggestions(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      backgroundColor: "#dbeafe",
                      border: "1px solid #3b82f6",
                      borderRadius: "14px",
                      cursor: "pointer",
                      flex: "0 1 auto",
                      textAlign: "center",
                      fontWeight: "500",
                      color: "#1e40af",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#3b82f6";
                      e.target.style.color = "white";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#dbeafe";
                      e.target.style.color = "#1e40af";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .page-content {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: transparent;
          padding: 20px;
        }

        .chatbot-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          height: 600px;
          background: transparent;
          border-radius: 0;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          background: #3b82f6;
          color: white;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
        }

        .chat-box {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 10px;
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
          max-width: 70%;
          padding: 10px 14px;
          border-radius: 12px;
          line-height: 1.5;
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
          gap: 8px;
          padding: 12px;
          background: white;
          border-top: 1px solid #e5e7eb;
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

        .chat-box::-webkit-scrollbar {
          width: 6px;
        }

        .chat-box::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .chat-box::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .chat-box::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default ChatBotPage;