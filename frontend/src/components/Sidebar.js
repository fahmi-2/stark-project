import React from 'react';

const Sidebar = ({ activePage, onNavigate }) => {
  const menuItems = [
    { key: 'home', label: 'Home', icon: 'fa-home' },
    { key: 'unit-analysis', label: 'Analisis Unit Pemohon', icon: 'fa-users' },
    { key: 'item-analysis', label: 'Analisis Barang', icon: 'fa-boxes' },
    // { key: 'chatbot', label: 'Chatbot Konsultan', icon: 'fa-comments' },
    { key: 'about', label: 'About', icon: 'fa-info-circle' },
  ];

  // Styles menggunakan CSS-in-JS, diperbaiki untuk responsif
  const styles = {
    sidebar: {
      width: '280px',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #003d82 0%, #001d3d 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
      boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box',
      transition: 'width 0.3s ease',
      overflowY: 'auto'
    },
    logoContainer: {
      padding: '30px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
    },
    logoWrapper: {
      position: 'relative',
      padding: '15px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      border: '2px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease',
      overflow: 'hidden',
      cursor: 'pointer',
      width: '100%',
      maxWidth: '180px'
    },
    logo: {
      width: '100%',
      height: 'auto',
      display: 'block',
      position: 'relative',
      zIndex: 1
    },
    sidebarMenu: {
      flex: 1,
      padding: '20px 12px',
      overflowY: 'auto'
    },
    menuItem: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 18px',
      margin: '5px 0',
      borderRadius: '12px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      boxSizing: 'border-box'
    },
    menuItemActive: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)',
      color: '#ffffff',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      transform: 'translateX(6px)'
    },
    menuIcon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: 'rgba(255, 255, 255, 0.05)',
      fontSize: '18px',
      transition: 'all 0.3s ease'
    },
    activeIndicator: {
      position: 'absolute',
      left: '-12px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '4px',
      height: '60%',
      background: 'linear-gradient(180deg, #4fc3f7 0%, #29b6f6 100%)',
      borderRadius: '0 4px 4px 0',
      boxShadow: '0 0 12px rgba(79, 195, 247, 0.6)'
    },
    menuItemBottom: {
      position: 'sticky',
      bottom: '20px',
      left: '12px',
      right: '12px',
      margin: '0 0 10px',
      borderTop: '2px solid rgba(255, 255, 255, 0.1)',
      paddingTop: '20px',
      background: 'rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px'
    }
  };

  const [hoveredItem, setHoveredItem] = React.useState(null);
  const [logoHover, setLogoHover] = React.useState(false);

  // Responsif: tambahkan hook untuk ukuran layar
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      ...styles.sidebar,
      width: isMobile ? '80px' : '280px'
    }}>
      {/* Logo */}
      <div style={styles.logoContainer}>
        <div 
          style={{
            ...styles.logoWrapper,
            transform: logoHover ? 'translateY(-3px)' : 'translateY(0)',
            boxShadow: logoHover 
              ? '0 12px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            borderColor: logoHover ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)'
          }}
          onMouseEnter={() => setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
        >
          <img src="/logo-sidebar.png" alt="Logo Saya" style={styles.logo} />
        </div>
      </div>

      {/* Menu Utama */}
      <div style={styles.sidebarMenu}>
        {menuItems.map((item) => {
          const isActive = activePage === item.key;
          const isHovered = hoveredItem === item.key;

          return (
            <div
              key={item.key}
              style={{
                ...styles.menuItem,
                ...(isActive ? styles.menuItemActive : {}),
                background: isActive 
                  ? styles.menuItemActive.background
                  : isHovered 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'transparent',
                color: isActive || isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                transform: isActive ? 'translateX(6px)' : isHovered ? 'translateX(4px)' : 'translateX(0)'
              }}
              onClick={() => onNavigate(item.key)}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={{
                ...styles.menuIcon,
                background: isActive 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : isHovered 
                    ? 'rgba(255, 255, 255, 0.12)' 
                    : 'rgba(255, 255, 255, 0.05)',
                transform: isHovered || isActive ? 'scale(1.1)' : 'scale(1)'
              }}>
                <i className={`fas ${item.icon}`}></i>
              </span>
              {!isMobile && <span style={{ flex: 1 }}>{item.label}</span>}
              {isActive && <div style={styles.activeIndicator}></div>}
            </div>
          );
        })}
      </div>

      {/* Upload Data - Bottom */}
      <div
        style={{
          ...styles.menuItem,
          ...styles.menuItemBottom,
          ...(activePage === 'data-management' ? {
            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 68, 68, 0.15) 100%)',
            color: '#ffffff',
            fontWeight: '600'
          } : {}),
          background: activePage === 'data-management'
            ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 68, 68, 0.15) 100%)'
            : hoveredItem === 'data-management'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.15)',
          transform: activePage === 'data-management' ? 'translateX(6px)' : 'translateX(0)'
        }}
        onClick={() => onNavigate('data-management')}
        onMouseEnter={() => setHoveredItem('data-management')}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <span style={{
          ...styles.menuIcon,
          background: activePage === 'data-management' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(255, 255, 255, 0.05)'
        }}>
          <i className="fas fa-database"></i>
        </span>
        {!isMobile && <span style={{ flex: 1 }}>Upload Data</span>}
        {activePage === 'data-management' && <div style={styles.activeIndicator}></div>}
      </div>
    </div>
  );
};

export default Sidebar;