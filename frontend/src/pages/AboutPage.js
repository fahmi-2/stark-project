import React, { useState, useEffect } from 'react';

const AboutPage = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animasi fade-in saat halaman dimuat
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-content">
      {/* === HEADER SECTION === */}
      <div className="about-container">
        <div className="about-header">
          <h1 className="page-title">
            <i className="fas fa-info-circle" style={{ color: '#1e40af', marginRight: '12px' }}></i>
            Tentang Sistem STARK
          </h1>
        </div>

        <div className="about-content">
          {/* What is STARK Section */}
          <section className={`about-section ${isVisible ? 'fade-in' : ''}`}>
            <div className="section-header">
              <h2 className="section-title" style={{ color: '#1e293b', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>
                Apa Itu STARK?
              </h2>
            </div>
            <div className="section-box" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #1e40af', padding: '24px', borderRadius: '8px' }}>
              <h3 className="highlight-title" style={{ color: '#1e40af', fontSize: '22px', marginBottom: '16px', fontWeight: '700' }}>
                STARK → Strategic Tools for ATK Reporting & Control
              </h3>
              <p className="section-text" style={{ fontSize: '16px', lineHeight: '1.7', color: '#334155', marginBottom: '16px' }}>
                STARK (Strategic Tools for ATK Reporting & Control) adalah sebuah dashboard analitik berbasis data yang dirancang untuk mendukung pengelolaan Permintaan dan Pengeluaran Barang di Politeknik Elektronika Negeri Surabaya (PENS).
              </p>
              <p className="section-text" style={{ fontSize: '16px', lineHeight: '1.7', color: '#334155' }}>
                Sistem ini menyediakan informasi kebutuhan ATK dan menganalisis tren permintaan untuk mendukung pengambilan keputusan berbasis data, sehingga pengelolaan logistik menjadi lebih transparan, efisien, dan terukur.
              </p>
            </div>
          </section>

          {/* Key Features Section */}
          <section className={`about-section ${isVisible ? 'fade-in' : ''}`} style={{ marginTop: '40px' }}>
            <div className="section-header">
              <h2 className="section-title" style={{ color: '#1e293b', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>
                Fitur Utama
              </h2>
            </div>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '24px' }}>
              {[
                { icon: 'fas fa-chart-line', title: 'Dashboard Komprehensif', desc: 'Visualisasi data permintaan dan pengeluaran barang secara real-time.' },
                { icon: 'fas fa-filter', title: 'Analisis Multi-Dimensi', desc: 'Analisis mendalam berdasarkan unit pemohon, kategori barang, dan periode waktu.' },
                { icon: 'fas fa-robot', title: 'ChatBot AI', desc: 'Asisten virtual yang membantu memberikan insights data secara interaktif dan cepat.' },
                { icon: 'fas fa-table', title: 'Tabel Data Terperinci', desc: 'Akses detail lengkap dari setiap transaksi dengan fitur pencarian dan filter.' },
                { icon: 'fas fa-calendar', title: 'Perbandingan Temporal', desc: 'Bandingkan data antar tahun dengan mudah untuk melihat tren jangka panjang.' },
                { icon: 'fas fa-pie-chart', title: '15+ Visualisasi', desc: 'Berbagai jenis chart untuk pemahaman data yang lebih mendalam dan intuitif.' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="feature-card"
                  style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div className="feature-icon" style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#1e40af',
                    fontSize: '24px',
                  }}>
                    <i className={item.icon}></i>
                  </div>
                  <h4 style={{ color: '#1e293b', fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                    {item.title}
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* System Coverage Section */}
          <section className={`about-section ${isVisible ? 'fade-in' : ''}`} style={{ marginTop: '40px' }}>
            <div className="section-header">
              <h2 className="section-title" style={{ color: '#1e293b', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>
                Jangkauan Sistem
              </h2>
            </div>
            <div className="coverage-box" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {[
                { number: '5', label: 'Halaman Utama' },
                { number: '15+', label: 'Visualisasi Data' },
                { number: '3', label: 'Tahun Data' },
                { number: '100+', label: 'Jenis Item' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="coverage-item"
                  style={{
                    backgroundColor: '#1e40af',
                    color: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
                  }}
                >
                  <div className="coverage-number" style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
                    {item.number}
                  </div>
                  <div className="coverage-label" style={{ fontSize: '14px', opacity: 0.9 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Page Description */}
          <section className={`about-section ${isVisible ? 'fade-in' : ''}`} style={{ marginTop: '40px' }}>
            <div className="section-header">
              <h2 className="section-title" style={{ color: '#1e293b', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>
                Panduan Halaman Sistem
              </h2>
            </div>
            <div className="pages-list" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { number: '01', title: 'Apa Itu STARK?', desc: 'Pengenalan lengkap tentang sistem.' },
                { number: '02', title: 'Halaman Home - Overview', desc: 'Dashboard utama dengan ringkasan metrik kunci dan grafik tren.' },
                { number: '03', title: 'Halaman Analisis Unit', desc: 'Analisis mendalam berdasarkan unit pemohon.' },
                { number: '04', title: 'Halaman Analisis Barang', desc: 'Analisis untuk item dan tren permintaan.' },
                { number: '05', title: 'Halaman Chatbot', desc: 'Interaksi dengan AI assistant.' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="page-item"
                  style={{
                    display: 'flex',
                    gap: '20px',
                    backgroundColor: '#f9fafb',
                    padding: '20px',
                    borderRadius: '10px',
                    borderLeft: '4px solid #1e40af',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f5ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                >
                  <div className="page-number" style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#1e40af',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}>
                    {item.number}
                  </div>
                  <div className="page-detail">
                    <h4 style={{ color: '#1e293b', fontSize: '17px', fontWeight: '600', margin: '0 0 6px 0' }}>
                      {item.title}
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '15px', margin: '0', lineHeight: '1.6' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* How to Read Visualization */}
          <section className={`about-section ${isVisible ? 'fade-in' : ''}`} style={{ marginTop: '40px' }}>
            <div className="section-header">
              <h2 className="section-title" style={{ color: '#1e293b', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>
                Cara Membaca Visualisasi Data
              </h2>
            </div>
            <div className="tips-box" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              {[
                { number: '1', title: 'Grafik Garis', desc: 'Untuk melihat tren naik atau turun.' },
                { number: '2', title: 'Grafik Lingkaran', desc: 'Menunjukkan proporsi dari kategori.' },
                { number: '3', title: 'Kartu Statistik', desc: 'Menampilkan metrik penting dalam angka besar.' },
                { number: '4', title: 'Filter Tahun', desc: 'Pilih tahun untuk analisis perbandingan.' },
                { number: '5', title: 'Tabel Data', desc: 'Gunakan pencarian untuk menemukan data tertentu.' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="tip-item"
                  style={{
                    display: 'flex',
                    gap: '20px',
                    backgroundColor: '#f0f9ff',
                    padding: '20px',
                    borderRadius: '10px',
                    borderLeft: '4px solid #1e40af',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6f2ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                >
                  <div className="tip-number" style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#1e40af',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}>
                    {item.number}
                  </div>
                  <div className="tip-content">
                    <h4 style={{ color: '#1e293b', fontSize: '17px', fontWeight: '600', margin: '0 0 6px 0' }}>
                      {item.title}
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '15px', margin: '0', lineHeight: '1.6' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tips Penggunaan Dashboard */}
          <section className={`about-section ${isVisible ? 'fade-in' : ''}`} style={{ marginTop: '40px' }}>
            <div className="section-header">
              <h2 className="section-title" style={{ color: '#1e293b', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>
                Tips Penggunaan Dashboard
              </h2>
            </div>
            <div className="tips-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {[
                { icon: 'fas fa-mouse-pointer', title: 'Interaksi dengan Chart', desc: 'Hover grafik untuk melihat detail.' },
                { icon: 'fas fa-compare', title: 'Bandingkan Antar Tahun', desc: 'Pilih multiple tahun untuk perbandingan tren.' },
                { icon: 'fas fa-search', title: 'Cari Data Spesifik', desc: 'Navigasi data dengan cepat menggunakan search.' },
                { icon: 'fas fa-comments', title: 'Tanya ChatBot', desc: 'Gunakan AI untuk mendapatkan jawaban cepat.' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="tip-card"
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div className="feature-icon" style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#1e40af',
                    fontSize: '24px',
                  }}>
                    <i className={item.icon}></i>
                  </div>
                  <h4 style={{ color: '#1e293b', fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                    {item.title}
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* === ANIMASI FADE-IN === */}
      <style jsx>{`
        .fade-in {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.8s ease-out forwards;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .about-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          padding: 40px;
          margin: 20px;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 24px;
          color: #1e293b;
          font-weight: 700;
          margin: 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #dbeafe;
        }

        .highlight-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e40af;
          margin: 0 0 16px 0;
        }

        .section-text {
          font-size: 16px;
          color: #334155;
          line-height: 1.7;
          margin: 12px 0;
        }

        .coverage-box,
        .pages-list,
        .tips-box,
        .features-grid,
        .tips-grid {
          margin-top: 24px;
        }

        .feature-card,
        .tip-card,
        .coverage-item,
        .page-item {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default AboutPage;