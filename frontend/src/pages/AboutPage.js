import React from 'react';

const AboutPage = () => {
  return (
    <div className="page-content">
      {/* === HEADER SECTION === */}
      <div className="about-container">
        <div className="about-header">
          <h1 className="page-title"><i className="fas fa-info-circle"></i> Tentang Sistem STARK</h1>
        </div>

        <div className="about-content">
          {/* What is STARK Section */}
          <section className="about-section">
            <div className="section-header">
              <h2 className="section-title">Apa Itu STARK?</h2>
            </div>
            <div className="section-box">
              <h3 className="highlight-title">STARK → Strategic Tools for ATK Reporting & Control</h3>
              <p className="section-text">
                STARK (Strategic Tools for ATK Reporting & Control) adalah sebuah dashboard analitik berbasis data yang 
                dirancang untuk mendukung pengelolaan Permintaan dan Pengeluaran Barang di Politeknik Elektronika Negeri Surabaya (PENS).
              </p>
              <p className="section-text">
                Sistem ini menyediakan informasi kebutuhan ATK dan menganalisis tren permintaan untuk 
                mendukung pengambilan keputusan berbasis data.
              </p>
            </div>
          </section>

          {/* Key Features Section */}
          <section className="about-section">
            <div className="section-header">
              <h2 className="section-title">Fitur Utama</h2>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h4>Dashboard Komprehensif</h4>
                <p>Visualisasi data permintaan dan pengeluaran barang.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-filter"></i>
                </div>
                <h4>Analisis Multi-Dimensi</h4>
                <p>Analisis mendalam berdasarkan unit pemohon, kategori barang, dan periode waktu.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-robot"></i>
                </div>
                <h4>ChatBot AI</h4>
                <p>Asisten virtual yang membantu memberikan insights data secara interaktif.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-table"></i>
                </div>
                <h4>Tabel Data Terperinci</h4>
                <p>Akses detail lengkap dari setiap transaksi dengan fitur pencarian dan filter.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-calendar"></i>
                </div>
                <h4>Perbandingan Temporal</h4>
                <p>Bandingkan data antar tahun dengan mudah.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-pie-chart"></i>
                </div>
                <h4>15+ Visualisasi</h4>
                <p>Berbagai jenis chart untuk pemahaman data yang lebih mendalam.</p>
              </div>
            </div>
          </section>

          {/* System Coverage Section */}
          <section className="about-section">
            <div className="section-header">
              <h2 className="section-title">Jangkauan Sistem</h2>
            </div>
            <div className="coverage-box">
              <div className="coverage-item">
                <div className="coverage-number">5</div>
                <div className="coverage-label">Halaman Utama</div>
              </div>
              <div className="coverage-item">
                <div className="coverage-number">15+</div>
                <div className="coverage-label">Visualisasi Data</div>
              </div>
              <div className="coverage-item">
                <div className="coverage-number">3</div>
                <div className="coverage-label">Tahun Data</div>
              </div>
              <div className="coverage-item">
                <div className="coverage-number">100+</div>
                <div className="coverage-label">Jenis Item</div>
              </div>
            </div>
          </section>

          {/* Page Description */}
          <section className="about-section">
            <div className="section-header">
              <h2 className="section-title">Panduan Halaman Sistem</h2>
            </div>
            <div className="pages-list">
              <div className="page-item">
                <div className="page-number">01</div>
                <div className="page-detail">
                  <h4>Apa Itu STARK?</h4>
                  <p>Pengenalan lengkap tentang sistem.</p>
                </div>
              </div>

              <div className="page-item">
                <div className="page-number">02</div>
                <div className="page-detail">
                  <h4>Halaman Home - Overview</h4>
                  <p>Dashboard utama dengan ringkasan metrik kunci dan grafik tren.</p>
                </div>
              </div>

              <div className="page-item">
                <div className="page-number">03</div>
                <div className="page-detail">
                  <h4>Halaman Analisis Unit</h4>
                  <p>Analisis mendalam berdasarkan unit pemohon.</p>
                </div>
              </div>

              <div className="page-item">
                <div className="page-number">04</div>
                <div className="page-detail">
                  <h4>Halaman Analisis Barang</h4>
                  <p>Analisis untuk item dan tren permintaan.</p>
                </div>
              </div>

              <div className="page-item">
                <div className="page-number">05</div>
                <div className="page-detail">
                  <h4>Halaman Chatbot</h4>
                  <p>Interaksi dengan AI assistant.</p>
                </div>
              </div>
            </div>
          </section>

          {/* How to Read Visualization */}
          <section className="about-section">
            <div className="section-header">
              <h2 className="section-title">Cara Membaca Visualisasi Data</h2>
            </div>
            <div className="tips-box">
              <div className="tip-item">
                <div className="tip-number">1</div>
                <div className="tip-content">
                  <h4>Grafik Garis</h4>
                  <p>Untuk melihat tren naik atau turun.</p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-number">2</div>
                <div className="tip-content">
                  <h4>Grafik Lingkaran</h4>
                  <p>Menunjukkan proporsi dari kategori.</p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-number">3</div>
                <div className="tip-content">
                  <h4>Kartu Statistik</h4>
                  <p>Menampilkan metrik penting dalam angka besar.</p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-number">4</div>
                <div className="tip-content">
                  <h4>Filter Tahun</h4>
                  <p>Pilih tahun untuk analisis perbandingan.</p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-number">5</div>
                <div className="tip-content">
                  <h4>Tabel Data</h4>
                  <p>Gunakan pencarian untuk menemukan data tertentu.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tips (export & refresh removed) */}
          <section className="about-section">
            <div className="section-header">
              <h2 className="section-title">Tips Penggunaan Dashboard</h2>
            </div>
            <div className="tips-grid">
              <div className="tip-card">
                <i className="fas fa-mouse-pointer"></i>
                <h4>Interaksi dengan Chart</h4>
                <p>Hover grafik untuk melihat detail.</p>
              </div>

              <div className="tip-card">
                <i className="fas fa-compare"></i>
                <h4>Bandingkan Antar Tahun</h4>
                <p>Pilih multiple tahun untuk perbandingan tren.</p>
              </div>

              <div className="tip-card">
                <i className="fas fa-search"></i>
                <h4>Cari Data Spesifik</h4>
                <p>Navigasi data dengan cepat menggunakan search.</p>
              </div>

              <div className="tip-card">
                <i className="fas fa-comments"></i>
                <h4>Tanya ChatBot</h4>
                <p>Gunakan AI untuk mendapatkan jawaban cepat.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;