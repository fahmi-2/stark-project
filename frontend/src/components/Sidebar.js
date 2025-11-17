// src/components/Sidebar.js
import React from 'react';

const Sidebar = ({ activePage, onNavigate }) => {
  const menuItems = [
    { key: 'home', label: 'Home', icon: 'fa-home' },
    { key: 'unit-analysis', label: 'Analisis Unit Pemohon', icon: 'fa-users' },
    { key: 'item-analysis', label: 'Analisis Barang', icon: 'fa-boxes' },
    { key: 'chatbot', label: 'Chatbot Konsultan', icon: 'fa-comments' },
    { key: 'about', label: 'About', icon: 'fa-info-circle' },
  ];

  return (
    <div className="sidebar">
      <img src="/logo-sidebar.png" alt="Logo Saya" className="sidebar-logo" />
      
      {/* Menu Utama */}
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <div
            key={item.key}
            className={`menu-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="menu-icon"><i className={`fas ${item.icon}`}></i></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* 🔽 MENU BARU: Manajemen Data — DI POJOK KIRI BAWAH (TEPAT DI ATAS GARIS MERAH) */}
      <div
        className={`menu-item ${activePage === 'data-management' ? 'active' : ''}`}
        onClick={() => onNavigate('data-management')}
        style={{
          position: 'absolute',
          bottom: '20px', // sesuaikan jika perlu
          left: 0,
          right: 0,
          background: 'transparent',
          padding: '12px 20px',
          borderRadius: 0,
          borderTop: 'none',
          borderBottom: 'none',
          boxShadow: 'none',
          transition: 'all 0.3s',
        }}
      >
        <span className="menu-icon"><i className="fas fa-database"></i></span>
        <span>Upload Data</span>
      </div>
    </div>
  );
};

export default Sidebar;