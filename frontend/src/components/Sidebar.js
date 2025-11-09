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
    </div>
  );
};

export default Sidebar;