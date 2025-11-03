// src/pages/ItemAnalysisPage.js
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ItemAnalysisPage = () => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [categoryValueData, setCategoryValueData] = useState({ labels: [], data: [] });
  const [categoryUnitData, setCategoryUnitData] = useState({ labels: [], data: [] });
  const [allItems, setAllItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Format Rupiah
  const formatRupiah = (value) => {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [valueRes, unitRes, itemsRes] = await Promise.all([
          fetch(`http://localhost:8000/api/category-value/${selectedYear}`),
          fetch(`http://localhost:8000/api/category-unit/${selectedYear}`),
          fetch(`http://localhost:8000/api/all-items/${selectedYear}`)
        ]);

        if (!valueRes.ok || !unitRes.ok || !itemsRes.ok) {
          throw new Error('Gagal mengambil data');
        }

        const valueData = await valueRes.json();
        const unitData = await unitRes.json();
        const itemsData = await itemsRes.json();

        setCategoryValueData(valueData);
        setCategoryUnitData(unitData);
        setAllItems(itemsData.items || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Filter items berdasarkan pencarian
  const filteredItems = allItems.filter(item =>
    item.NamaBrg.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.Kategori.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ambil detail unit pemohon
  const handleShowDetail = async (namaBarang) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/item-detail/${selectedYear}/${encodeURIComponent(namaBarang)}`
      );
      const data = await res.json();
      setDetailModal({ namaBarang, units: data.units || [] });
    } catch (err) {
      console.error('Gagal ambil detail unit:', err);
      alert('Gagal memuat detail unit');
    }
  };

  const closeModal = () => setDetailModal(null);

  // Chart Options
  const barValueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  const barUnitOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw.toLocaleString()} unit`,
        },
      },
    },
    scales: {
      x: { beginAtZero: true },
    },
  };

  // Chart Data
  const barValueData = {
    labels: categoryValueData.labels,
    datasets: [{
      label: 'Nilai Pengeluaran',
      data: categoryValueData.data,
      backgroundColor: '#3b82f6',
    }],
  };

  const barUnitData = {
    labels: categoryUnitData.labels,
    datasets: [{
      label: 'Total Unit Diminta',
      data: categoryUnitData.data,
      backgroundColor: '#10b981',
    }],
  };

  return (
    <div className="page-content">
      <div className="analytics-header">
        <h1 className="page-title">
          <i className="fas fa-boxes"></i> Analisis Barang - Distribusi Permintaan Kategori & Detail Barang
        </h1>
        <div className="filter-section">
          <span className="filter-label">Tahun:</span>
          <select
            className="year-filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Kategori Barang dengan Nilai Pengeluaran Tertinggi (Top 5)</h3>
          <div className="chart-container" style={{ height: '300px' }}>
            {categoryValueData.labels?.length > 0 ? (
              <Bar data={barValueData} options={barValueOptions} />
            ) : (
              <div className="chart-placeholder">Tidak ada data nilai pengeluaran</div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Kategori Barang dengan Volume Unit Pengeluaran Tertinggi (Top 5)</h3>
          <div className="chart-container" style={{ height: '300px' }}>
            {categoryUnitData.labels?.length > 0 ? (
              <Bar data={barUnitData} options={barUnitOptions} />
            ) : (
              <div className="chart-placeholder">Tidak ada data volume unit</div>
            )}
          </div>
        </div>
      </div>

      <div className="table-card">
        <h3 className="chart-title">Tabel Detail Semua Barang yang Diminta</h3>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Cari Nama Barang atau Kategori..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <table id="detailedItemTable">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Nama Barang</th>
              <th>Total Unit Diminta</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.Kategori}</td>
                  <td>{item.NamaBrg}</td>
                  <td>{item.TotalPermintaan.toLocaleString()} unit</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleShowDetail(item.NamaBrg)}
                    >
                      Detail Unit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>
                  Tidak ada data barang ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detail Unit */}
      {detailModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Unit Pemohon: {detailModal.namaBarang}</h4>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {detailModal.units.length > 0 ? (
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Unit Pemohon</th>
                      <th>Jumlah Permintaan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailModal.units.map((unit, idx) => (
                      <tr key={idx}>
                        <td>{unit.UnitPemohon}</td>
                        <td>{unit.Jumlah.toLocaleString()} unit</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Tidak ada unit pemohon untuk barang ini di tahun {selectedYear}.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Styles untuk Modal & UI */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
        .detail-table {
          width: 100%;
          border-collapse: collapse;
        }
        .detail-table th,
        .detail-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .detail-table th {
          background-color: #f3f4f6;
        }
        .search-bar {
          margin-bottom: 16px;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }
        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }
        .chart-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default ItemAnalysisPage;