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
// === Warna biru gradasi (gelap → terang)  ===
const getBlueGradientColor = (index, total) => {
  const dark = [26, 42, 122]; // #1a2a7a
  const light = [147, 197, 253]; // #93c5fd
  const ratio = index / Math.max(total - 1, 1);
  const r = Math.round(dark[0] + (light[0] - dark[0]) * ratio);
  const g = Math.round(dark[1] + (light[1] - dark[1]) * ratio);
  const b = Math.round(dark[2] + (light[2] - dark[2]) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

// === Warna oranye gradasi ===
const getOrangeGradient = (index, total) => {
  const dark = [124, 45, 18];      // #7c2d12
  const light = [251, 218, 116];   // #fdba74
  const ratio = index / Math.max(total - 1, 1);
  const r = Math.round(dark[0] + (light[0] - dark[0]) * ratio);
  const g = Math.round(dark[1] + (light[1] - dark[1]) * ratio);
  const b = Math.round(dark[2] + (light[2] - dark[2]) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

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
      // const selectedCategory = document.getElementById("category-filter")
      const searchMatch =
        item.NamaBrg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Kategori.toLowerCase().includes(searchTerm.toLowerCase());
      // selectedCategory.size = 5;

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

const barValueData = useMemo(() => {
  const labels =
    categoryValueData.labels?.length > 0
      ? categoryValueData.labels
      : ["Tidak Ada Data"];

  const data =
    categoryValueData.data?.length > 0
      ? categoryValueData.data
      : [0];

  return {
    labels,
    datasets: [
      {
        label: "Nilai Pengeluaran",
        data,
        backgroundColor: data.map((_, i) =>
          getBlueGradientColor(i, data.length)
        ),
      },
    ],
  };
}, [categoryValueData]);


const barUnitData = useMemo(() => {
  const labels =
    categoryUnitData.labels?.length > 0
      ? categoryUnitData.labels
      : ["Tidak Ada Data"];

  const data =
    categoryUnitData.data?.length > 0
      ? categoryUnitData.data
      : [0];

  return {
    labels,
    datasets: [
      {
        label: "Total Unit Diminta",
        data,
        backgroundColor: data.map((_, i) =>
          getOrangeGradient(i, data.length)
        ),
      },
    ],
  };
}, [categoryUnitData]);
const shortenText = (text, maxLength = 20) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
};



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
    <div className="chart-container">
      {categoryValueData.labels?.length > 0 ? (
        <Bar data={barValueData} options={barValueOptions} />
      ) : (
        <div className="chart-placeholder">Tidak ada data nilai pengeluaran</div>
      )}
    </div>
  </div>
  <div className="chart-card">
    <h3 className="chart-title">Kategori Barang dengan Volume Unit Pengeluaran Tertinggi</h3>
    <div className="chart-container">
      {categoryUnitData.labels?.length > 0 ? (
        <Bar data={barUnitData} options={barUnitOptions} />
      ) : (
        <div className="chart-placeholder">Tidak ada data volume unit</div>
      )}
    </div>
  </div>
</div>

            <div className="table-card" style={{
        marginTop: "24px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        <h3 className="chart-title" style={{
          marginBottom: 0,
          fontSize: "18px",
          fontWeight: "600",
        }}>
          Tabel Detail Barang{selectedCategory ? ` - ${selectedCategory}` : ""} (Tahun {selectedYearForTable})
        </h3>

                {/* Filter Row — Sejajar dengan tabel, ukuran lebih kompak */}
        {/* Filter Row — Urutan: Search → Tahun → Kategori */}
<div style={{
  display: "flex",
  flexDirection: "column", // Default: stack vertikal di semua layar
  gap: "12px",
  padding: "12px 0",
  borderBottom: "1px solid #eee",
}}>
  {/* Search Input — selalu di atas */}
  <div style={{
    display: "flex",
    gap: "8px",
    alignItems: "center",
    width: "100%",
    maxWidth: "600px",
  }}>
    <input
      type="text"
      placeholder="Cari Nama Barang atau Kategori..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      style={{
        flex: 1,
        padding: "8px 12px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "14px",
      }}
    />
    {searchInput && (
      <button
        type="button"
        onClick={() => {
          setSearchInput("");
          setSearchTerm("");
        }}
        style={{
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ×
      </button>
    )}
  </div>

  {/* Tahun & Kategori — sejajar di layar lebar, stack di mobile */}
  <div style={{
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  }}>
    {/* Filter Tahun */}
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <label htmlFor="table-year-select" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
        Tahun:
      </label>
      <select
        id="table-year-select"
        value={selectedYearForTable}
        onChange={(e) => setSelectedYearForTable(Number(e.target.value))}
        style={{
          padding: "6px 8px",
          borderRadius: "10px",
          border: "1px solid #ddd",
          fontSize: "12px",
          minWidth: "80px",
        }}
      >
        <option value={2025}>2025</option>
        <option value={2024}>2024</option>
        <option value={2023}>2023</option>
      </select>
    </div>

    {/* Filter Kategori */}
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <label htmlFor="category-filter" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
        Kategori:
      </label>
      <select
        id="category-filter"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        style={{
          padding: "6px 8px",
          borderRadius: "10px",
          border: "1px solid #ddd",
          fontSize: "12px",
          minWidth: "100px",
        }}
      >
        <option value="">Semua Kategori</option>
        {CATEGORIES.slice(1).map((cat) => (
          <option key={cat} value={cat}>
            {shortenText(cat, 25)}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* Info Total */}
  <div style={{
    fontSize: "14px",
    color: "#666",
    alignSelf: "flex-end",
    textAlign: "right",
    width: "100%",
  }}>
    Menampilkan <strong>{sortedFilteredItems.length}</strong> dari{" "}
    <strong>{allItemsForTable.length}</strong> barang
  </div>
</div>

        {/* Tabel — Scroll Horizontal Saja */}
        <div style={{
          overflowX: "auto", // ⬅️ Hanya scroll horizontal
          border: "1px solid #eee",
          borderRadius: "8px",
          backgroundColor: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          maxHeight: "400px",
        }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: "14px",
            }}
          >
            <thead style={{
              position: "sticky",
              top: 0,
              backgroundColor: "#f9fafb",
              zIndex: 1,
            }}>
              <tr style={{
                borderBottom: "2px solid #e5e7eb",
              }}>
                <th style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontWeight: "bold",
                  width: "15%",
                }}>Kategori</th>
                <th style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontWeight: "bold",
                  width: "30%",
                }}>Nama Barang</th>
                <th style={{
                  padding: "10px 12px",
                  textAlign: "right",
                  fontWeight: "bold",
                  width: "20%",
                }}>Harga Satuan</th>
                <th style={{
                  padding: "10px 12px",
                  textAlign: "right",
                  fontWeight: "bold",
                  width: "20%",
                }}>Total Barang Diminta</th>
                <th style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontWeight: "bold",
                  width: "15%",
                }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <tr
                    key={item.NamaBrg || index}
                    style={{
                      borderBottom: "1px solid #eee",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "white")
                    }
                  >
                    <td style={{
                      padding: "10px 12px",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                    }}>{item.Kategori}</td>
                    <td style={{
                      padding: "10px 12px",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                    }}>{item.NamaBrg}</td>
                    <td style={{
                      padding: "10px 12px",
                      textAlign: "right",
                    }}>{formatRupiah(item.HargaSatuan)}</td>
                    <td style={{
                      padding: "10px 12px",
                      textAlign: "right",
                    }}>{item.TotalPermintaan.toLocaleString()} barang</td>
                    <td style={{
                      padding: "10px 12px",
                      textAlign: "center",
                    }}>
                      <button
                        onClick={() => handleShowDetail(item.NamaBrg)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "#666",
                    backgroundColor: "#fafafa",
                    fontSize: "14px",
                  }}>
                    Tidak ada data barang ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — HANYA SATU, DI BAWAH TABEL */}
        {totalPages > 1 && (
          <div style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
            gap: "8px",
          }}>
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
            <span style={{ alignSelf: "center" }}>
              Halaman {currentPage} dari {totalPages}
            </span>
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
        <div
          className="modal-overlay"
          onClick={closeModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {/* Modal Header — fixed, tidak scroll */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "18px" }}>
                Detail Barang: <strong>{detailModal.namaBarang}</strong>
              </h4>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body — ✅ HANYA INI YANG SCROLL */}
            <div
              style={{
                padding: "0 20px",
                overflowY: "auto", // ⬅️ Scroll vertical
                overflowX: "auto", // ⬅️ Scroll horizontal jika tabel lebar
                flex: 1,
                maxHeight: "calc(85vh - 120px)", // header + footer ≈ 120px
              }}
            >
              <div style={{ padding: "16px 0" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "15px" }}>
                  <strong>Harga Satuan:</strong> {formatRupiah(detailModal.hargaSatuan)}
                </p>

                {detailModal.units && detailModal.units.length > 0 ? (
                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #eee",
                      borderRadius: "6px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                        fontSize: "14px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th
                            style={{
                              padding: "10px 12px",
                              textAlign: "left",
                              fontWeight: "bold",
                              width: "35%",
                            }}
                          >
                            Unit Pemohon
                          </th>
                          <th
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontWeight: "bold",
                              width: "30%",
                            }}
                          >
                            Jumlah Permintaan
                          </th>
                          <th
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontWeight: "bold",
                              width: "35%",
                            }}
                          >
                            Total Pengeluaran
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailModal.units.map((unit, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            <td
                              style={{
                                padding: "10px 12px",
                                wordBreak: "break-word",
                                whiteSpace: "normal",
                              }}
                            >
                              {unit.UnitPemohon}
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                textAlign: "right",
                              }}
                            >
                              {unit.Jumlah.toLocaleString()} barang
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                textAlign: "right",
                                fontWeight: "500",
                              }}
                            >
                              {formatRupiah(unit.TotalPengeluaran)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "24px 16px",
                      textAlign: "center",
                      color: "#666",
                      backgroundColor: "#fafafa",
                      borderRadius: "6px",
                    }}
                  >
                    {detailModal.noUnitsMessage ||
                      `Tidak ada unit pemohon untuk barang ini di tahun ${selectedYearForTable}.`}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer — fixed, tidak scroll */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #eee",
                textAlign: "right",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
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
            /* === RESPONSIVE CHARTS === */
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-bottom: 24px;
  }
  .chart-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
  }
  .chart-title {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
  }
  .chart-container {
    flex: 1;
    min-height: 240px;
    width: 100%;
  }

  /* === RESPONSIVE TABLE === */
  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }
  table#detailedItemTable {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px; /* Pastikan tidak collapse terlalu kecil */
  }
  table#detailedItemTable th,
  table#detailedItemTable td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  table#detailedItemTable th {
    background-color: #f9fafb;
    position: sticky;
    top: 0;
  }

  /* Pagination controls tetap di tengah */
  .pagination-controls {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Modal tetap responsif */
  .modal-content {
    max-width: 95vw;
    width: 90%;
  }

  /* Mobile: search dan controls stack vertikal */
  @media (max-width: 768px) {
    .search-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .search-container,
    .table-controls {
      width: 100%;
    }
    .results-info {
      margin-left: 0;
      margin-top: 8px;
      text-align: center;
    }
    .table-controls {
      justify-content: center;
    }
    .chart-container {
      min-height: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default ItemAnalysisPage;