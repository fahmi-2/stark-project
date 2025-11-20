// src/components/ChatWidget.js - FIXED VERSION
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import ChatBotPage from '../pages/ChatBotPage';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  // Buat container portal saat komponen mount
  React.useEffect(() => {
    const container = document.createElement('div');
    container.id = 'chat-widget-portal';
    // ✅ PENTING: Gunakan style yang sama dengan CSS
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      z-index: 999999 !important;
    `;
    document.body.appendChild(container);
    setPortalRoot(container);

    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  // Tambahkan setelah useEffect portal root
React.useEffect(() => {
  if (isOpen) {
    document.body.classList.add('chatbot-open');
  } else {
    document.body.classList.remove('chatbot-open');
  }
  
  return () => {
    document.body.classList.remove('chatbot-open');
  };
}, [isOpen]);

  const widgetContent = (
    <>
      {/* ✅ Floating Chat Button - Hanya tampil jika chatbot tertutup */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
            cursor: 'pointer',
            fontSize: '28px',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.4)';
          }}
          aria-label="Open Jarvis Bot"
        >
          💬
        </button>
      )}

      {/* ✅ Modal Chatbot - Muncul di tengah layar */}
      {isOpen && (
        <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.3)', // ← UBAH: Transparan gelap tipis
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              backdropFilter: 'blur(8px)', // ← UBAH: Blur background
              pointerEvents: 'auto',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => setIsOpen(false)}
         >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '600px',
              height: '80vh',
              maxHeight: '700px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ Header dengan Close Button */}
            <div
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/ironman.png"
                  alt="Jarvis"
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                    Jarvis Bot
                  </h3>
                  <p style={{ 
                    margin: '2px 0 0 0', 
                    fontSize: '12px', 
                    opacity: 0.9,
                    fontWeight: '400',
                  }}>
                    Asisten Analitik STARK
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '28px',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  lineHeight: '1',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                aria-label="Close chatbot"
              >
                ×
              </button>
            </div>

            {/* ✅ Isi Chatbot dari ChatBotPage - ISOLATED */}
            <div
              className="isolated-chatbot-wrapper"
              style={{
                width: '100%',
                height: '100%',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0, // Important for flex children
              }}
            >
              <ChatBotPage />
            </div>
          </div>
        </div>
      )}

      {/* ✅ Inline Styles untuk Animasi */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ✅ CRITICAL: Isolasi ChatBotPage di dalam widget */
        .isolated-chatbot-wrapper .page-content {
          height: 100% !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          margin-left: 0 !important;
          background: transparent !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .isolated-chatbot-wrapper .chatbot-container {
          width: 100% !important;
          max-width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          display: flex !important;
          flex-direction: column !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* ✅ Sembunyikan header asli ChatBotPage karena sudah ada di widget */
        .isolated-chatbot-wrapper .chat-header {
          display: none !important;
        }

        .isolated-chatbot-wrapper .chat-box {
          background: #f8fafc !important;
          padding: 20px !important;
          flex: 1 1 auto !important;
          overflow-y: auto !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
        }

        .isolated-chatbot-wrapper .chat-input {
          flex-shrink: 0 !important;
          padding: 16px 20px !important;
          background: white !important;
          border-top: 2px solid #e5e7eb !important;
          display: flex !important;
          gap: 10px !important;
          margin: 0 !important;
          border-radius: 0 !important;
        }

        /* ✅ Responsive untuk mobile */
        @media (max-width: 768px) {
          .isolated-chatbot-wrapper .chat-box {
            padding: 16px !important;
          }

          .isolated-chatbot-wrapper .chat-input {
            padding: 12px 16px !important;
            gap: 8px !important;
          }
        }

        /* ✅ Scrollbar styling */
        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar {
          width: 6px;
        }

        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );

  if (!portalRoot) return null;
  return ReactDOM.createPortal(widgetContent, portalRoot);
};

export default ChatWidget;