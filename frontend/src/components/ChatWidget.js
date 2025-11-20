// src/components/ChatWidget.js
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
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    document.body.appendChild(container);
    setPortalRoot(container);

    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  const widgetContent = (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
          cursor: 'pointer',
          fontSize: '24px',
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
      >
        💬
      </button>

      {/* Modal Chatbot */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            backdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#1e40af',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/ironman.png"
                  alt="Jarvis"
                  style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                />
                <h3 style={{ margin: 0, fontSize: '18px' }}>Jarvis Bot</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {/* Isi Chatbot dari ChatBotPage */}
            <div
              className="isolated-chatbot-wrapper"
              style={{
                width: '100%',
                height: '100%',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <ChatBotPage />
            </div>
          </div>
        </div>
      )}

      {/* Gaya khusus untuk mengisolasi ChatBotPage */}
      <style jsx>{`
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

        .isolated-chatbot-wrapper .chat-header {
          display: none !important; /* Sembunyikan header asli ChatBotPage */
        }

        .isolated-chatbot-wrapper .chat-box {
          background: #f8fafc !important;
          padding: 16px !important;
          flex: 1 1 auto !important;
          overflow-y: auto !important;
          margin: 0 !important;
          border: none !important;
        }

        .isolated-chatbot-wrapper .chat-input {
          flex-shrink: 0 !important;
          padding: 16px !important;
          background: white !important;
          border-top: 2px solid #e2e8f0 !important;
          display: flex !important;
          gap: 10px !important;
          margin: 0 !important;
          border-radius: 0 0 12px 12px !important;
        }
      `}</style>
    </>
  );

  if (!portalRoot) return null;
  return ReactDOM.createPortal(widgetContent, portalRoot);
};

export default ChatWidget;