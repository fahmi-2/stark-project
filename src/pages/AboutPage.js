// src/pages/AboutPage.js
import React from 'react';

const AboutPage = () => {
  return (
    <div className="page-content">
      <div className="about-container">
        <div className="about-header">
          <h1 className="page-title"><i className="fas fa-info-circle"></i> Tentang Sistem</h1>
        </div>
        <div className="about-content">
          <p>Sistem ini berfokus pada analisis mendalam terhadap Permintaan dan Pengeluaran Barang. Sistem ini membantu mengidentifikasi tren pasar, potensi *backlog*, dan barang-barang yang paling diminati.</p>
          <p style={{ marginTop: '15px', fontSize: '16px' }}>Dirancang untuk mendukung strategi penjualan dan pengadaan berbasis *demand-driven*.</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;