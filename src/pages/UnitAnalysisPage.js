// src/pages/UnitAnalysisPage.js
import React, { useEffect, useState, useMemo } from 'react';
import { Bar, Line, Pie, Radar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);

const ITEMS_PER_PAGE = 10;

// === Helper: Warna berdasarkan segmen keuangan ===
const getClusterColor = (segmen) => {
  switch (segmen) {
    case 'Hemat': return 'rgba(16, 185, 129, 0.7)';
    case 'Sedang': return 'rgba(245, 158, 11, 0.7)';
    case 'Boros': return 'rgba(239, 68, 68, 0.7)';
    default: return 'rgba(156, 163, 175, 0.7)';
  }
};

const getBorderColor = (segmen) => {
  switch (segmen) {
    case 'Hemat': return '#10b981';
    case 'Sedang': return '#f59e0b';
    case 'Boros': return '#ef4444';
    default: return '#9ca3af';
  }
};

// === Simulasi rentang global untuk normalisasi radar (sebaiknya diambil dari API) ===
const GLOBAL_MIN_MAX = {
  TotalPengeluaran: { min: 0, max: 500_000_000 },
  TotalPermintaan: { min: 0, max: 10_000 },
  RataRataHargaBarang: { min: 0, max: 5_000_000 },
  KeragamanKategori: { min: 1, max: 20 },
  FrekuensiPermintaan: { min: 0, max: 100 },
};

const normalizeToTen = (value, min, max) => {
  if (max <= min) return 5;
  const clamped = Math.max(min, Math.min(max, value));
  return 10 * ((clamped - min) / (max - min));
};

const UnitAnalysisPage = () => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [topRequesters, setTopRequesters] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [modalYear, setModalYear] = useState(2025);
  const [unitItems, setUnitItems] = useState([]);
  const [selectedItemForChart, setSelectedItemForChart] = useState(null);

  const [scatterData, setScatterData] = useState([]);
  const [radarUnit1, setRadarUnit1] = useState('');
  const [radarUnit2, setRadarUnit2] = useState('');
  const [radarData1, setRadarData1] = useState(null);
  const [radarData2, setRadarData2] = useState(null);
  const [availableUnitsForRadar, setAvailableUnitsForRadar] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);

  // === Fetch Top Requesters (descending by default) ===
  useEffect(() => {
    const fetchTopRequesters = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/top-requesters/${selectedYear}`);
        const data = await res.json();
        // Urutkan DESCENDING (terbesar dulu) → logis untuk "Top"
        const sorted = (data.topRequesters || [])
          .sort((a, b) => b.TotalPermintaan - a.TotalPermintaan)
          .slice(0, 5); // Ambil hanya 5 teratas
        setTopRequesters(sorted);
      } catch (error) {
        console.error('Gagal memuat top requesters:', error);
        setTopRequesters([]);
      }
    };
    fetchTopRequesters();
  }, [selectedYear]);

  // === Fetch Daftar Semua Unit ===
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/unit-pemohon-list');
        const data = await res.json();
        setAllUnits(data.units || []);
        setAvailableUnitsForRadar(data.units?.map(u => u.UnitPemohon) || []);
      } catch (error) {
        console.error('Gagal memuat daftar unit:', error);
        setAllUnits([]);
        setAvailableUnitsForRadar([]);
      }
    };
    fetchUnits();
  }, []);

  // === Fetch Scatter Data ===
  useEffect(() => {
    const fetchScatter = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/unit-scatter-data');
        const data = await res.json();
        setScatterData(data.units || []);
      } catch (error) {
        console.error('Gagal memuat scatter data:', error);
        setScatterData([]);
      }
    };
    fetchScatter();
  }, []);

  // === Helper: Persiapkan data radar dengan normalisasi ===
  const prepareRadarData = (rawData) => {
    if (!rawData) return null;
    return {
      TotalPengeluaran: normalizeToTen(
        rawData.TotalPengeluaran,
        GLOBAL_MIN_MAX.TotalPengeluaran.min,
        GLOBAL_MIN_MAX.TotalPengeluaran.max
      ),
      TotalPermintaan: normalizeToTen(
        rawData.TotalPermintaan,
        GLOBAL_MIN_MAX.TotalPermintaan.min,
        GLOBAL_MIN_MAX.TotalPermintaan.max
      ),
      RataRataHargaBarang: normalizeToTen(
        rawData.RataRataHargaBarang,
        GLOBAL_MIN_MAX.RataRataHargaBarang.min,
        GLOBAL_MIN_MAX.RataRataHargaBarang.max
      ),
      EfisiensiPembelian: Math.min(10, (rawData.EfisiensiPembelian || 0) * 10),
      KeragamanKategori: normalizeToTen(
        rawData.KeragamanKategori,
        GLOBAL_MIN_MAX.KeragamanKategori.min,
        GLOBAL_MIN_MAX.KeragamanKategori.max
      ),
      FrekuensiPermintaan: normalizeToTen(
        rawData.FrekuensiPermintaan || 0,
        GLOBAL_MIN_MAX.FrekuensiPermintaan.min,
        GLOBAL_MIN_MAX.FrekuensiPermintaan.max
      ),
    };
  };

  // === Fetch Radar Data ===
  useEffect(() => {
    const fetchRadar = async (unit, setter) => {
      if (!unit) return;
      try {
        const res = await fetch(`http://localhost:8000/api/unit-radar-data?unit=${encodeURIComponent(unit)}`);
        const data = await res.json();
        setter(prepareRadarData(data));
      } catch (error) {
        console.error(`Gagal memuat radar untuk ${unit}:`, error);
        setter(null);
      }
    };

    fetchRadar(radarUnit1, setRadarData1);
    fetchRadar(radarUnit2, setRadarData2);
  }, [radarUnit1, radarUnit2]);

  // === Pilih 2 unit acak saat pertama kali ===
  useEffect(() => {
    if (availableUnitsForRadar.length >= 2) {
      const shuffled = [...availableUnitsForRadar].sort(() => 0.5 - Math.random());
      setRadarUnit1(shuffled[0]);
      setRadarUnit2(shuffled[1]);
    } else if (availableUnitsForRadar.length === 1) {
      setRadarUnit1(availableUnitsForRadar[0]);
      setRadarUnit2('');
    }
  }, [availableUnitsForRadar]);

  // === Filter & Pagination ===
  const filteredUnits = useMemo(() => {
    if (!searchQuery) return allUnits;
    const q = searchQuery.toLowerCase();
    return allUnits.filter(unit =>
      unit.UnitPemohon.toLowerCase().includes(q)
    );
  }, [allUnits, searchQuery]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // === Modal Handlers ===
  const openDetailModal = async (unitName) => {
    setSelectedUnit(unitName);
    setModalYear(2025);
    setIsModalOpen(true);
    setSelectedItemForChart(null);
    try {
      const res = await fetch(`http://localhost:8000/api/unit-item-monthly?unit=${encodeURIComponent(unitName)}&year=2025`);
      const data = await res.json();
      setUnitItems(data.items || []);
    } catch (error) {
      console.error('Gagal memuat detail barang:', error);
      setUnitItems([]);
    }
  };

  const handleModalYearChange = async (year) => {
    setModalYear(year);
    try {
      const res = await fetch(`http://localhost:8000/api/unit-item-monthly?unit=${encodeURIComponent(selectedUnit)}&year=${year}`);
      const data = await res.json();
      setUnitItems(data.items || []);
      setSelectedItemForChart(null);
    } catch (error) {
      console.error('Gagal memuat detail barang:', error);
      setUnitItems([]);
    }
  };

  // === Chart Options ===
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          font: { size: 10 },
          padding: 8,
        },
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: 10,
        ticks: { stepSize: 2 },
      },
    },
    plugins: { legend: { position: 'top' } },
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'Total Permintaan (Unit)' },
        beginAtZero: true,
      },
      y: {
        title: { display: true, text: 'Total Pengeluaran (Rp)' },
        beginAtZero: true,
        ticks: {
          callback: (value) => `Rp${(value / 1e6).toFixed(1)}jt`,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const d = context.raw;
            return `${d.unit} | Permintaan: ${d.x.toLocaleString()} | Pengeluaran: Rp${d.y.toLocaleString()}`;
          },
          afterLabel: (context) => {
            return `Segmen: ${context.raw.segmen}`;
          },
        },
      },
    },
  };

  // === Chart Data ===
  const barData = {
    labels: topRequesters.map(item => item.UnitPemohon),
    datasets: [{
      label: 'Total Unit Diminta',
      data: topRequesters.map(item => item.TotalPermintaan),
      backgroundColor: '#3b82f6',
    }],
  };

  const segmenUangCounts = useMemo(() => {
    const counts = { Boros: 0, Sedang: 0, Hemat: 0 };
    allUnits.forEach(u => {
      if (['Boros', 'Sedang', 'Hemat'].includes(u.Segmen)) {
        counts[u.Segmen]++;
      }
    });
    return counts;
  }, [allUnits]);

  const segmenPermintaanCounts = useMemo(() => {
    const counts = { Tinggi: 0, Sedang: 0, Rendah: 0 };
    allUnits.forEach(u => {
      if (['Tinggi', 'Sedang', 'Rendah'].includes(u.LabelSegmen)) {
        counts[u.LabelSegmen]++;
      }
    });
    return counts;
  }, [allUnits]);

  const pieDataUang = {
    labels: ['Boros', 'Sedang', 'Hemat'],
    datasets: [{
      data: [segmenUangCounts.Boros, segmenUangCounts.Sedang, segmenUangCounts.Hemat],
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
    }],
  };

  const pieDataPermintaan = {
    labels: ['Tinggi', 'Sedang', 'Rendah'],
    datasets: [{
      data: [segmenPermintaanCounts.Tinggi, segmenPermintaanCounts.Sedang, segmenPermintaanCounts.Rendah],
      backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899'],
    }],
  };

  const radarData = {
    labels: [
      'Total Pengeluaran',
      'Total Permintaan',
      'Rata-rata Harga Barang',
      'Efisiensi Pembelian',
      'Keragaman Kategori',
      'Frekuensi Permintaan'
    ],
    datasets: [
      ...(radarData1 ? [{
        label: radarUnit1,
        data: Object.values(radarData1),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
      }] : []),
      ...(radarData2 ? [{
        label: radarUnit2,
        data: Object.values(radarData2),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: true,
      }] : []),
    ],
  };

  const scatterChartData = {
    datasets: [{
      label: 'Unit Pemohon',
      data: scatterData.map(u => ({
        x: u.TotalPermintaan,
        y: u.TotalPengeluaran,
        unit: u.UnitPemohon,
        segmen: u.Segmen || 'Tidak Diketahui',
      })),
      backgroundColor: scatterData.map(u => getClusterColor(u.Segmen)),
      borderColor: scatterData.map(u => getBorderColor(u.Segmen)),
      borderWidth: 1,
      pointRadius: 6,
    }],
  };

  const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Des'];
  const lineData = selectedItemForChart
    ? {
        labels: monthlyLabels,
        datasets: [{
          label: `Permintaan Bulanan: ${selectedItemForChart.NamaBarang}`,
          data: selectedItemForChart.Bulanan,
          borderColor: '#3b82f6',
          tension: 0.3,
        }]
      }
    : null;

  return (
    <div className="page-content">
      <div className="analytics-header">
        <h1 className="page-title"><i className="fas fa-users"></i> Analisis Unit Pemohon & Detail Barang</h1>
        <div className="filter-section">
          <span className="filter-label">Tahun (Top Unit):</span>
          <select
            className="year-filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      {/* Layout 2 kolom */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="chart-card">
          <h3 className="chart-title">Top 5 Unit Pemohon ({selectedYear})</h3>
          <div className="chart-container" style={{ height: '280px' }}>
            {topRequesters.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Proporsi Segmen Unit</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: '200px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Pengeluaran</div>
              <div style={{ width: '100%', height: '140px' }}>
                <Pie data={pieDataUang} options={pieOptions} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Permintaan</div>
              <div style={{ width: '100%', height: '140px' }}>
                <Pie data={pieDataPermintaan} options={pieOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scatter Plot */}
      <div className="chart-card" style={{ marginTop: '24px' }}>
        <h3 className="chart-title">Scatter Plot: Total Pengeluaran vs Total Permintaan</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
          Titik berwarna: <span style={{ color: '#10b981' }}>● Hemat</span>, <span style={{ color: '#f59e0b' }}>● Sedang</span>, <span style={{ color: '#ef4444' }}>● Boros</span>
        </p>
        <div className="chart-container" style={{ height: '400px' }}>
          <Scatter data={scatterChartData} options={scatterOptions} />
        </div>
      </div>

      {/* Radar Chart */}
      <div className="chart-card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="chart-title">Perbandingan Profil Unit (Radar Chart)</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={radarUnit1}
              onChange={(e) => setRadarUnit1(e.target.value)}
              style={{ padding: '6px', minWidth: '180px' }}
            >
              <option value="">Pilih Unit 1</option>
              {availableUnitsForRadar.map(unit => (
                <option key={`u1-${unit}`} value={unit}>{unit}</option>
              ))}
            </select>
            <select
              value={radarUnit2}
              onChange={(e) => setRadarUnit2(e.target.value)}
              style={{ padding: '6px', minWidth: '180px' }}
            >
              <option value="">Pilih Unit 2</option>
              {availableUnitsForRadar.map(unit => (
                <option key={`u2-${unit}`} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="chart-container" style={{ height: '400px' }}>
          {(radarUnit1 || radarUnit2) ? (
            <Radar data={radarData} options={radarOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              Pilih minimal satu unit
            </div>
          )}
        </div>
      </div>

      {/* Tabel Unit */}
      <div className="chart-card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="chart-title">Daftar Unit Pemohon</h3>
          <input
            type="text"
            placeholder="Cari unit pemohon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '250px',
            }}
          />
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          {paginatedUnits.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit Pemohon</th>
                  <th>Total Permintaan</th>
                  <th>Total Pengeluaran</th>
                  <th>Segmen (Uang)</th>
                  <th>Label Segmen (Jumlah)</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUnits.map((unit, idx) => (
                  <tr key={idx}>
                    <td>{unit.UnitPemohon}</td>
                    <td>{unit.TotalPermintaan.toLocaleString()}</td>
                    <td>Rp{unit.TotalPengeluaran.toLocaleString()}</td>
                    <td>{unit.Segmen}</td>
                    <td>{unit.LabelSegmen}</td>
                    <td>
                      <button
                        onClick={() => openDetailModal(unit.UnitPemohon)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Detail Barang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              {searchQuery ? 'Unit tidak ditemukan' : 'Tidak ada data unit pemohon'}
            </div>
          )}
        </div>

        {filteredUnits.length > ITEMS_PER_PAGE && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                backgroundColor: currentPage === 1 ? '#e5e7eb' : '#3b82f6',
                color: currentPage === 1 ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center' }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                backgroundColor: currentPage === totalPages ? '#e5e7eb' : '#3b82f6',
                color: currentPage === totalPages ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3>Detail Barang: {selectedUnit}</h3>
              <div>
                <span style={{ marginRight: '8px' }}>Tahun:</span>
                <select
                  value={modalYear}
                  onChange={(e) => handleModalYearChange(Number(e.target.value))}
                  style={{ padding: '4px', marginRight: '12px' }}
                >
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                  }}
                >
                  &times;
                </button>
              </div>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {unitItems.length > 0 ? (
                <>
                  {selectedItemForChart && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ marginBottom: '12px' }}>
                        Tren Bulanan: {selectedItemForChart.NamaBarang}
                      </h4>
                      <div style={{ height: '200px' }}>
                        <Line data={lineData} options={lineOptions} />
                      </div>
                    </div>
                  )}

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama Barang</th>
                        <th>Total</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.NamaBarang}</td>
                          <td>{item.Total}</td>
                          <td>
                            <button
                              onClick={() => setSelectedItemForChart(item)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Lihat Tren
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p>Tidak ada data permintaan barang untuk unit ini di tahun {modalYear}.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitAnalysisPage;