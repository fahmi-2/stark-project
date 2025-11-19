import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ChatBotPage from '../pages/ChatBotPage';

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  useEffect(() => {
    // Create isolated portal container
    let container = document.getElementById('chat-widget-portal');
    if (!container) {
      container = document.createElement('div');
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
    }
    setPortalRoot(container);

    return () => {
      // Cleanup on unmount
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

  const widgetContent = (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <button
          id="chat-widget-button"
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
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
            e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.4)';
          }}
        >
          💬
        </button>
      )}

      {/* Chat Widget Panel */}
      {open && (
        <div
          id="chat-widget-panel"
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            width: '380px',
            height: '550px',
            zIndex: 999999,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setOpen(false)}
            title="Tutup Chat"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#1e40af',
              border: '2px solid transparent',
              cursor: 'pointer',
              fontSize: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000001,
              fontWeight: 'bold',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.color = '#1e40af';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            ✕
          </button>

          {/* Isolated Chat Content */}
          <div
            className="isolated-chatbot-wrapper"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              isolation: 'isolate',
            }}
          >
            <ChatBotPage />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* CRITICAL: Force main layout to stay intact */
        #root,
        #root > div,
        .container {
          position: relative !important;
        }

        .main-content {
          margin-left: 260px !important;
          overflow-y: auto !important;
        }

        /* Isolated chatbot styles - ONLY apply inside widget */
        .isolated-chatbot-wrapper .page-content {
          height: 100% !important;
          width: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
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
          flex-shrink: 0 !important;
          padding: 18px 20px !important;
          padding-right: 50px !important;
          font-size: 17px !important;
          font-weight: 600 !important;
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
          border-radius: 16px 16px 0 0 !important;
          margin: 0 !important;
          color: white !important;
          text-align: center !important;
        }

        .isolated-chatbot-wrapper .chat-box {
          background: #f8fafc !important;
          padding: 16px !important;
          flex: 1 1 auto !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          min-height: 0 !important;
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
          border-radius: 0 0 16px 16px !important;
        }

        .isolated-chatbot-wrapper .chat-input input {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 12px 16px !important;
          border: 2px solid #cbd5e1 !important;
          border-radius: 24px !important;
          font-size: 14px !important;
          transition: all 0.2s ease !important;
        }

        .isolated-chatbot-wrapper .chat-input input:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
        }

        .isolated-chatbot-wrapper .chat-input button {
          flex-shrink: 0 !important;
          padding: 12px 24px !important;
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
          color: white !important;
          border: none !important;
          border-radius: 24px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
        }

        .isolated-chatbot-wrapper .chat-input button:hover {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%) !important;
          transform: scale(1.05) !important;
          box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3) !important;
        }

        .isolated-chatbot-wrapper .message {
          margin-bottom: 12px !important;
          display: flex !important;
        }

        .isolated-chatbot-wrapper .user-message {
          justify-content: flex-end !important;
        }

        .isolated-chatbot-wrapper .bot-message {
          justify-content: flex-start !important;
        }

        .isolated-chatbot-wrapper .message-bubble {
          max-width: 75% !important;
          font-size: 14px !important;
          padding: 12px 16px !important;
          border-radius: 18px !important;
          word-wrap: break-word !important;
          line-height: 1.5 !important;
        }

        .isolated-chatbot-wrapper .user-message .message-bubble {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
          color: white !important;
          border-bottom-right-radius: 4px !important;
        }

        .isolated-chatbot-wrapper .bot-message .message-bubble {
          background: #f1f5f9 !important;
          color: #334155 !important;
          border-bottom-left-radius: 4px !important;
          border: 1px solid #e2e8f0 !important;
        }

        /* Custom scrollbar */
        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar {
          width: 8px;
        }

        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .isolated-chatbot-wrapper .chat-box::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Ensure popup suggestions work */
        .isolated-chatbot-wrapper div[style*="position: absolute"] {
          max-width: 360px !important;
          max-height: 300px !important;
        }

        /* ===== RESPONSIVE DESIGN ===== */
        
        /* Tablet & Small Desktop (768px - 1024px) */
        @media (max-width: 1024px) and (min-width: 768px) {
          #chat-widget-panel {
            width: 360px !important;
            height: 520px !important;
          }
          
          .isolated-chatbot-wrapper .message-bubble {
            max-width: 80% !important;
            font-size: 13px !important;
          }
        }

        /* Mobile Landscape & Small Tablet (481px - 767px) */
        @media (max-width: 767px) and (min-width: 481px) {
          #chat-widget-panel {
            width: calc(100vw - 40px) !important;
            max-width: 400px !important;
            height: 500px !important;
            right: 20px !important;
            bottom: 20px !important;
          }

          #chat-widget-button {
            width: 56px !important;
            height: 56px !important;
            right: 16px !important;
            bottom: 16px !important;
            font-size: 22px !important;
          }

          .isolated-chatbot-wrapper .chat-header {
            padding: 14px 16px !important;
            padding-right: 45px !important;
            font-size: 15px !important;
          }

          .isolated-chatbot-wrapper .message-bubble {
            max-width: 85% !important;
            font-size: 13px !important;
            padding: 10px 14px !important;
          }

          .isolated-chatbot-wrapper .chat-input input {
            font-size: 13px !important;
            padding: 10px 14px !important;
          }

          .isolated-chatbot-wrapper .chat-input button {
            padding: 10px 20px !important;
            font-size: 13px !important;
          }
        }

        /* Mobile Portrait (320px - 480px) */
        @media (max-width: 480px) {
          #chat-widget-panel {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            right: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            top: 0 !important;
            border-radius: 0 !important;
            animation: slideUpMobile 0.3s ease-out !important;
          }

          #chat-widget-button {
            width: 52px !important;
            height: 52px !important;
            right: 12px !important;
            bottom: 12px !important;
            font-size: 20px !important;
          }

          .isolated-chatbot-wrapper .chat-header {
            padding: 16px !important;
            padding-right: 50px !important;
            font-size: 16px !important;
            border-radius: 0 !important;
          }

          .isolated-chatbot-wrapper .chat-box {
            padding: 12px !important;
          }

          .isolated-chatbot-wrapper .message-bubble {
            max-width: 90% !important;
            font-size: 14px !important;
            padding: 10px 12px !important;
          }

          .isolated-chatbot-wrapper .chat-input {
            padding: 12px !important;
            border-radius: 0 !important;
          }

          .isolated-chatbot-wrapper .chat-input input {
            font-size: 14px !important;
            padding: 11px 14px !important;
          }

          .isolated-chatbot-wrapper .chat-input button {
            padding: 11px 18px !important;
            font-size: 14px !important;
          }

          /* Close button adjustment for mobile */
          button[title="Tutup Chat"] {
            top: 10px !important;
            right: 10px !important;
            width: 34px !important;
            height: 34px !important;
            font-size: 18px !important;
          }
        }

        /* Extra Small Mobile (< 360px) */
        @media (max-width: 359px) {
          .isolated-chatbot-wrapper .chat-header {
            font-size: 14px !important;
            padding: 14px !important;
            padding-right: 45px !important;
          }

          .isolated-chatbot-wrapper .message-bubble {
            font-size: 13px !important;
            padding: 9px 11px !important;
          }

          .isolated-chatbot-wrapper .chat-input input {
            font-size: 13px !important;
            padding: 10px 12px !important;
          }

          .isolated-chatbot-wrapper .chat-input button {
            padding: 10px 16px !important;
            font-size: 13px !important;
          }
        }

        @keyframes slideUpMobile {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );

  // Use portal to render outside main DOM tree
  if (!portalRoot) return null;
  return ReactDOM.createPortal(widgetContent, portalRoot);
};

export default ChatWidget;