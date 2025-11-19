// src/pages/ItemAnalysisPage.js
import React, { useState, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { fetchAPI } from "../utils/api";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ITEMS_PER_PAGE = 10;
const ALL_YEARS = [2023, 2024, 2025];
const CATEGORIES = [
  "",
  "ATK",
  "Elektronik & Komputer",
  "Dokumen Akademik",
  "Alat Pembersih & Pewangi",
  "Tissue & Tempat Sampah",
  "Perlengkapan Umum",
];

const ItemAnalysisPage = () => {
  const [selectedYearsForCharts, setSelectedYearsForCharts] = useState([...ALL_YEARS]);
  const [selectedYearForTable, setSelectedYearForTable] = useState(2025);
  const [selectedCategory, setSelectedCategory] = useState(""); // ✅ Tambahkan state filter kategori

  const [categoryValueData, setCategoryValueData] = useState({ labels: [], data: [] });
  const [categoryUnitData, setCategoryUnitData] = useState({ labels: [], data: [] });
  const [allItemsForTable, setAllItemsForTable] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const formatRupiah = (value) => {
    if (!value && value !== 0) return "Rp 0";
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  };

  const toggleYearForCharts = (year) => {
    if (selectedYearsForCharts.includes(year)) {
      const newSelection = selectedYearsForCharts.filter((y) => y !== year);
      setSelectedYearsForCharts(newSelection.length ? newSelection : [...ALL_YEARS]);
    } else {
      setSelectedYearsForCharts([...selectedYearsForCharts, year]);
    }
  };

  const toggleAllYearsForCharts = () => {
    if (selectedYearsForCharts.length === ALL_YEARS.length) {
      setSelectedYearsForCharts([2025]);
    } else {
      setSelectedYearsForCharts([...ALL_YEARS]);
    }
  };

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch chart data
  useEffect(() => {
    const fetchDataCharts = async () => {
      try {
        setLoading(true);

        if (selectedYearsForCharts.length === 1) {
          const year = selectedYearsForCharts[0];
          const [valueRes, unitRes] = await Promise.all([
            fetchAPI(`/api/category-value/${year}`),
            fetchAPI(`/api/category-unit/${year}`),
          ]);

          if (!valueRes.ok || !unitRes.ok) throw new Error("Gagal mengambil data kategori");

          const valueData = await valueRes.json();
          const unitData = await unitRes.json();

          setCategoryValueData({ labels: valueData.labels || [], data: valueData.data || [] });
          setCategoryUnitData({ labels: unitData.labels || [], data: unitData.data || [] });
        } else {
          const fetchPromises = selectedYearsForCharts.map((year) =>
            Promise.all([
              fetchAPI(`/api/category-value/${year}`).then((r) => (r.ok ? r.json() : { labels: [], data: [] })),
              fetchAPI(`/api/category-unit/${year}`).then((r) => (r.ok ? r.json() : { labels: [], data: [] })),
            ])
          );

          const allResponses = await Promise.all(fetchPromises);
          const valueResponses = allResponses.map((res) => res[0]);
          const unitResponses = allResponses.map((res) => res[1]);

          const aggregateData = (dataList) => {
            const result = {};
            dataList.forEach((data) => {
              if (!data || !Array.isArray(data.labels)) return;
              data.labels.forEach((label, i) => {
                if (!result[label]) result[label] = 0;
                result[label] += data.data[i] || 0;
              });
            });
            const sorted = Object.entries(result).sort((a, b) => b[1] - a[1]).slice(0, 6);
            return {
              labels: sorted.map(([label]) => label),
              data: sorted.map(([, value]) => value),
            };
          };

          setCategoryValueData(aggregateData(valueResponses));
          setCategoryUnitData(aggregateData(unitResponses));
        }
      } catch (err) {
        console.error("Error fetching chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDataCharts();
  }, [selectedYearsForCharts]);

  // Fetch table data
  useEffect(() => {
    const fetchDataTable = async () => {
      try {
        setLoading(true);
        const res = await fetchAPI(`/api/all-items/${selectedYearForTable}`);
        if (!res.ok) throw new Error("Gagal ambil items");
        const data = await res.json();
        setAllItemsForTable(
          data.items?.map((item) => ({ ...item, HargaSatuan: item.HargaSatuan || 0 })) || []
        );
      } catch (err) {
        console.error("Error fetching table data:", err);
        setAllItemsForTable([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataTable();
  }, [selectedYearForTable]);

  // ✅ Filter dengan kategori & search
  const filteredItems = useMemo(() => {
    return allItemsForTable.filter((item) => {
      const categoryMatch = selectedCategory === "" || item.Kategori === selectedCategory;
      const searchMatch =
        item.NamaBrg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Kategori.toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [allItemsForTable, searchTerm, selectedCategory]);

  // ✅ Urutkan berdasarkan kategori → nama barang
  const sortedFilteredItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (a.Kategori !== b.Kategori) {
        return a.Kategori.localeCompare(b.Kategori);
      }
      return a.NamaBrg.localeCompare(b.NamaBrg);
    });
  }, [filteredItems]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    return sortedFilteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedFilteredItems, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // ✅ Perbaiki handleShowDetail: ganti '/' → '-'
  const handleShowDetail = async (namaBarang) => {
    try {
      // 🔑 Ganti '/' dengan '-' agar aman di URL path
      const safeNamaBarang = namaBarang.replace(/\//g, "-");
      const encodedNamaBarang = encodeURIComponent(safeNamaBarang);

      const res = await fetchAPI(`/api/item-detail/${selectedYearForTable}/${encodedNamaBarang}`);
      if (!res.ok) throw new Error("Gagal ambil detail item");

      const data = await res.json();
      const item = allItemsForTable.find((i) => i.NamaBrg === namaBarang);
      const hargaSatuan = item?.HargaSatuan || 0;

      const unitsWithCost = data.units?.map((unit) => ({
        ...unit,
        TotalPengeluaran: unit.Jumlah * hargaSatuan,
      })) || [];

      setDetailModal({
        namaBarang,
        units: unitsWithCost,
        hargaSatuan: hargaSatuan,
        noUnitsMessage:
          data.units && data.units.length === 0
            ? `Tidak ada unit pemohon yang meminta "${namaBarang}" di tahun ${selectedYearForTable}.`
            : null,
      });
    } catch (err) {
      console.error("Gagal ambil detail unit:", err);
      alert("Gagal memuat detail unit");
    }
  };

  const closeModal = () => setDetailModal(null);

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
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `Rp ${value.toLocaleString("id-ID")}`,
        },
      },
    },
  };

  const barUnitOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw.toLocaleString()} unit`,
        },
      },
    },
    scales: { x: { beginAtZero: true } },
  };

  const barValueData = useMemo(
    () => ({
      labels: categoryValueData.labels?.length > 0 ? categoryValueData.labels : ["Tidak Ada Data"],
      datasets: [
        {
          label: "Nilai Pengeluaran",
          data: categoryValueData.data?.length > 0 ? categoryValueData.data : [0],
          backgroundColor: "#3b82f6",
        },
      ],
    }),
    [categoryValueData]
  );

  const barUnitData = useMemo(
    () => ({
      labels: categoryUnitData.labels?.length > 0 ? categoryUnitData.labels : ["Tidak Ada Data"],
      datasets: [
        {
          label: "Total Unit Diminta",
          data: categoryUnitData.data?.length > 0 ? categoryUnitData.data : [0],
          backgroundColor: "#10b981",
        },
      ],
    }),
    [categoryUnitData]
  );

  if (loading) return <div className="page-content">Loading...</div>;

  return (
    <div className="page-content">
      <div className="analytics-header">
        <h1 className="page-title">
          <i className="fas fa-boxes"></i> Analisis Barang - Distribusi Permintaan Kategori & Detail Barang
        </h1>
        <div className="filter-section">
          <span className="filter-label">Tahun :</span>
          <div className="year-chips" role="tablist" aria-label="Pilih tahun untuk grafik">
            <button
              type="button"
              className={`year-chip ${selectedYearsForCharts.length === ALL_YEARS.length ? "active" : ""}`}
              onClick={toggleAllYearsForCharts}
              aria-pressed={selectedYearsForCharts.length === ALL_YEARS.length}
            >
              Semua
            </button>
            {ALL_YEARS.map((year) => (
              <button
                key={`chart-${year}`}
                type="button"
                className={`year-chip ${selectedYearsForCharts.includes(year) ? "active" : ""}`}
                onClick={() => toggleYearForCharts(year)}
                aria-pressed={selectedYearsForCharts.includes(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Kategori Barang dengan Nilai Pengeluaran Tertinggi</h3>
          <div className="chart-container" style={{ height: "300px" }}>
            {categoryValueData.labels?.length > 0 ? (
              <Bar data={barValueData} options={barValueOptions} />
            ) : (
              <div className="chart-placeholder">Tidak ada data nilai pengeluaran</div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Kategori Barang dengan Volume Unit Pengeluaran Tertinggi</h3>
          <div className="chart-container" style={{ height: "300px" }}>
            {categoryUnitData.labels?.length > 0 ? (
              <Bar data={barUnitData} options={barUnitOptions} />
            ) : (
              <div className="chart-placeholder">Tidak ada data volume unit</div>
            )}
          </div>
        </div>
      </div>

      <div className="table-card">
        <h3 className="chart-title">
          Tabel Detail Barang{selectedCategory ? ` - ${selectedCategory}` : ""} (Tahun {selectedYearForTable})
        </h3>
        <div className="search-bar">
          <div className="search-container">
            <input
              type="text"
              placeholder="Cari Nama Barang atau Kategori..."
              className="search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Cari barang"
            />
            {searchInput && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                }}
                aria-label="Bersihkan pencarian"
              >
                ×
              </button>
            )}
          </div>

          <div className="table-controls">
            <label className="table-year-label" htmlFor="table-year-select">
              Tahun:
            </label>
            <select
              id="table-year-select"
              className="year-filter-select"
              value={selectedYearForTable}
              onChange={(e) => setSelectedYearForTable(Number(e.target.value))}
              aria-label="Pilih tahun untuk tabel"
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>

            {/* ✅ TAMBAHKAN FILTER KATEGORI DI SINI */}
            <label className="table-category-label" htmlFor="category-filter">
              Kategori:
            </label>
            <select
              id="category-filter"
              className="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Pilih kategori barang"
            >
              <option value="">Semua Kategori</option>
              {CATEGORIES.slice(1).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="results-info">
              Menampilkan <strong>{sortedFilteredItems.length}</strong> dari{" "}
              <strong>{allItemsForTable.length}</strong>
            </div>
          </div>
        </div>

        <table id="detailedItemTable">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Nama Barang</th>
              <th>Harga Satuan</th>
              <th>Total Barang Diminta</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => (
                <tr key={item.NamaBrg || index}>
                  <td>{item.Kategori}</td>
                  <td>{item.NamaBrg}</td>
                  <td>{formatRupiah(item.HargaSatuan)}</td>
                  <td>{item.TotalPermintaan.toLocaleString()} barang</td>
                  <td>
                    <button className="btn btn-primary" onClick={() => handleShowDetail(item.NamaBrg)}>
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  Tidak ada data barang ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-controls" style={{ marginTop: "16px", display: "flex", justifyContent: "center", gap: "8px" }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                backgroundColor: currentPage === 1 ? "#e5e7eb" : "#3b82f6",
                color: currentPage === 1 ? "#9ca3af" : "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={{ alignSelf: "center" }}>Halaman {currentPage} dari {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                backgroundColor: currentPage === totalPages ? "#e5e7eb" : "#3b82f6",
                color: currentPage === totalPages ? "#9ca3af" : "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {detailModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Nama Barang: {detailModal.namaBarang}</h4>
              <button className="close-btn" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Harga Satuan:</strong> {formatRupiah(detailModal.hargaSatuan)}
              </p>
              {detailModal.units && detailModal.units.length > 0 ? (
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Unit Pemohon</th>
                      <th>Jumlah Permintaan</th>
                      <th>Total Pengeluaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailModal.units.map((unit, idx) => (
                      <tr key={idx}>
                        <td>{unit.UnitPemohon}</td>
                        <td>{unit.Jumlah.toLocaleString()} barang</td>
                        <td>{formatRupiah(unit.TotalPengeluaran)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>
                  {detailModal.noUnitsMessage ||
                    `Tidak ada unit pemohon untuk barang ini di tahun ${selectedYearForTable}.`}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CSS Filter Kategori & Year Chips */}
      <style jsx>{`
        .year-chips {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .year-chip {
          padding: 6px 10px;
          border-radius: 16px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
        }
        .year-chip.active {
          background: #3b82f6;
          color: #fff;
          border-color: transparent;
        }
        .filter-label {
          font-weight: 500;
          color: #475569;
          margin-right: 12px;
        }
        .search-container {
          display: flex;
          gap: 8px;
          align-items: center;
          max-width: 420px;
          width: 100%;
        }
        .search-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .clear-btn {
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
        }
        .table-controls {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-left: auto;
          flex-wrap: wrap;
        }
        .table-year-label,
        .table-category-label {
          font-size: 14px;
          color: #374151;
        }
        .table-category-label {
          margin-left: 16px;
        }
        .year-filter-select,
        .category-filter-select {
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: #fff;
        }
        .category-filter-select {
          min-width: 200px;
        }
        .results-info {
          margin-left: 12px;
          color: #374151;
          font-size: 14px;
          align-self: center;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
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
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
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
        .pagination-controls button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .table-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          .category-filter-select,
          .year-filter-select {
            width: 100%;
            min-width: auto;
          }
          .table-category-label {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ItemAnalysisPage;