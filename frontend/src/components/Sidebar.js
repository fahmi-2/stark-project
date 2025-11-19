// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';

const Sidebar = ({ activePage, onNavigate }) => {
  const menuItems = [
    { key: 'home', label: 'Home', icon: 'fa-home' },
    { key: 'unit-analysis', label: 'Analisis Unit Pemohon', icon: 'fa-users' },
    { key: 'item-analysis', label: 'Analisis Barang', icon: 'fa-boxes' },
    // { key: 'chatbot', label: 'Chatbot Konsultan', icon: 'fa-comments' },
    { key: 'about', label: 'About', icon: 'fa-info-circle' },
  ];

  const [hoveredItem, setHoveredItem] = useState(null);
  const [logoHover, setLogoHover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // untuk mobile toggle

  // Deteksi ukuran layar
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true); // auto buka di desktop
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Tutup sidebar saat klik item (di mobile)
  const handleNav = (key) => {
    onNavigate(key);
    if (isMobile) setIsSidebarOpen(false);
  };

  // Styles
  const sidebarWidth = isMobile ? '280px' : '280px';
  const isCollapsed = isMobile && !isSidebarOpen;

  return (
    <>
      {/* Overlay untuk mobile */}
      {isMobile && isSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 999,
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: isCollapsed ? '0' : sidebarWidth,
          background: 'linear-gradient(180deg, #003d82 0%, #001d3d 100%)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxSizing: 'border-box',
          transition: 'width 0.3s ease, transform 0.3s ease',
          transform: isCollapsed ? 'translateX(-100%)' : 'translateX(0)',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: isMobile ? '20px 16px' : '30px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              position: 'relative',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '14px',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: logoHover
                ? '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : '0 6px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              cursor: 'pointer',
              width: '100%',
              maxWidth: isCollapsed ? '50px' : '180px',
            }}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
          >
            <img
              src="/logo-sidebar.png"
              alt="Logo Analitik"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Menu */}
        <div
          style={{
            flex: 1,
            padding: '20px 12px',
            overflowY: 'auto',
          }}
        >
          {menuItems.map((item) => {
            const isActive = activePage === item.key;
            const isHovered = hoveredItem === item.key;

            return (
              <div
                key={item.key}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: isCollapsed ? '16px' : '14px 18px',
                  margin: '6px 0',
                  borderRadius: '12px',
                  color: isActive || isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
                    : isHovered
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  transform: isActive ? 'translateX(6px)' : isHovered ? 'translateX(4px)' : 'translateX(0)',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  whiteSpace: isCollapsed ? 'nowrap' : 'normal',
                }}
                onClick={() => handleNav(item.key)}
                onMouseEnter={() => setHoveredItem(item.key)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-label={isCollapsed ? item.label : undefined}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isActive
                      ? 'rgba(255, 255, 255, 0.15)'
                      : isHovered
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.05)',
                    fontSize: '18px',
                    transition: 'all 0.3s ease',
                    transform: isHovered || isActive ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <i className={`fas ${item.icon}`} />
                </span>
                {!isCollapsed && (
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
                {isActive && !isCollapsed && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '60%',
                      background: 'linear-gradient(180deg, #4fc3f7, #29b6f6)',
                      borderRadius: '0 4px 4px 0',
                      boxShadow: '0 0 12px rgba(79, 195, 247, 0.6)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Upload Data - Bottom (non-sticky di mobile) */}
        <div
          style={{
            padding: '0 12px 20px',
            borderTop: isCollapsed ? 'none' : '2px solid rgba(255, 255, 255, 0.1)',
            ...(isCollapsed
              ? {
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 'auto',
                }
              : {
                  background: 'rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  margin: '0 12px 10px',
                  paddingTop: '20px',
                }),
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: isCollapsed ? '16px' : '14px 18px',
              borderRadius: '12px',
              color:
                activePage === 'data-management' || hoveredItem === 'data-management'
                  ? '#ffffff'
                  : 'rgba(255, 255, 255, 0.85)',
              fontWeight: activePage === 'data-management' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.25s',
              background:
                activePage === 'data-management'
                  ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(255, 68, 68, 0.15))'
                  : hoveredItem === 'data-management'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : isCollapsed
                  ? 'transparent'
                  : 'rgba(0, 0, 0, 0.15)',
              transform:
                activePage === 'data-management' ? 'translateX(6px)' : 'translateX(0)',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            onClick={() => handleNav('data-management')}
            onMouseEnter={() => setHoveredItem('data-management')}
            onMouseLeave={() => setHoveredItem(null)}
            aria-label={isCollapsed ? 'Upload Data' : undefined}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background:
                  activePage === 'data-management'
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                fontSize: '18px',
              }}
            >
              <i className="fas fa-database" />
            </span>
            {!isCollapsed && <span style={{ flex: 1 }}>Upload Data</span>}
            {activePage === 'data-management' && !isCollapsed && (
              <div
                style={{
                  position: 'absolute',
                  left: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '4px',
                  height: '60%',
                  background: 'linear-gradient(180deg, #ff5252, #ff1744)',
                  borderRadius: '0 4px 4px 0',
                  boxShadow: '0 0 12px rgba(255, 82, 82, 0.6)',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button (hanya di mobile) */}
      {isMobile && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            background: '#3b82f6',
            color: 'white',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            cursor: 'pointer',
          }}
          aria-label={isSidebarOpen ? 'Tutup menu' : 'Buka menu'}
        >
          <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'}`} />
        </button>
      )}
    </>
  );
};

export default Sidebar;