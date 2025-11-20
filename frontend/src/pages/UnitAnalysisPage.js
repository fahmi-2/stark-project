import React, { useEffect, useState, useMemo } from "react";
import { Bar, Line, Scatter, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { fetchAPI } from "../utils/api";

ChartJS.register(
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

// === Helper: Format Rupiah Lengkap (tanpa M/jt) ===
const formatRupiahLengkap = (value) => {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
};

// === Helper: Warna biru gradasi (gelap → terang) ===
const getBlueGradientColor = (index, total) => {
  const dark = [26, 42, 122]; // #1a2a7a (lebih gelap)
  const light = [147, 197, 253]; // #93c5fd
  const ratio = index / Math.max(total - 1, 1);
  const r = Math.round(dark[0] + (light[0] - dark[0]) * ratio);
  const g = Math.round(dark[1] + (light[1] - dark[1]) * ratio);
  const b = Math.round(dark[2] + (light[2] - dark[2]) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

// === Helper: Warna oranye gradasi untuk Pengeluaran ===
const getOrangeGradient = (index, total) => {
  const dark = [124, 45, 18];   // #7c2d12 (oranye tua)
  const light = [251, 218, 116]; // #fdba74 (oranye terang)
  const ratio = index / Math.max(total - 1, 1);
  const r = Math.round(dark[0] + (light[0] - dark[0]) * ratio);
  const g = Math.round(dark[1] + (light[1] - dark[1]) * ratio);
  const b = Math.round(dark[2] + (light[2] - dark[2]) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const UnitAnalysisPage = () => {
  // === Perbaikan 1: Default ke semua tahun ===
  const [selectedYears, setSelectedYears] = useState([2023, 2024, 2025]);
  const [topRequesters, setTopRequesters] = useState([]);
  const [topSpendingUnits, setTopSpendingUnits] = useState([]);
  const [allUnits, setAllUnits] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [unitItems, setUnitItems] = useState([]);
  const [selectedItemForChart, setSelectedItemForChart] = useState(null);
  const [scatterData, setScatterData] = useState([]);
  const [radarUnit1, setRadarUnit1] = useState("");
  const [radarUnit2, setRadarUnit2] = useState("");
  const [radarData1, setRadarData1] = useState(null);
  const [radarData2, setRadarData2] = useState(null);
  const [availableUnitsForRadar, setAvailableUnitsForRadar] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedYearForTable, setSelectedYearForTable] = useState(2025);

  const ALL_YEARS = [2023, 2024, 2025];

  // Toggle tahun
  const toggleYear = (year) => {
    if (selectedYears.includes(year)) {
      const newSelection = selectedYears.filter((y) => y !== year);
      setSelectedYears(newSelection.length ? newSelection : ALL_YEARS);
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  // Toggle "Semua Tahun"
  const toggleAllYears = () => {
    if (selectedYears.length === ALL_YEARS.length) {
      setSelectedYears([2025]); // Jika semua dipilih, unselect ke 2025 saja
    } else {
      setSelectedYears([...ALL_YEARS]); // Jika tidak semua dipilih, pilih semua
    }
  };

  // === Perbaikan 2: Fetch SEMUA data grafik (Top Requesters, Top Spending, Scatter) berdasarkan selectedYears ===
  useEffect(() => {
    const fetchAggregatedData = async () => {
      const yearsParam =
        selectedYears.includes(2023) &&
        selectedYears.includes(2024) &&
        selectedYears.includes(2025)
          ? "all"
          : selectedYears.join(",");

      try {
        const [topReqRes, topSpenRes, scatterRes] = await Promise.all([
          fetchAPI(`/api/top-requesters?years=${yearsParam}`),
          fetchAPI(`/api/top-spending-units?years=${yearsParam}`),
          fetchAPI(`/api/unit-scatter-data?years=${yearsParam}`), // Pastikan API ini menerima `years`
        ]);

        if (!topReqRes.ok || !topSpenRes.ok || !scatterRes.ok) {
          throw new Error("Gagal mengambil data agregat");
        }

        const topReqData = await topReqRes.json();
        const topSpenData = await topSpenRes.json();
        const scatterDataRes = await scatterRes.json();

        setTopRequesters(topReqData.topRequesters || []);
        setTopSpendingUnits(topSpenData.topSpendingUnits || []);
        setScatterData(scatterDataRes.units || []);
      } catch (error) {
        console.error("Gagal memuat data agregat:", error);
        setTopRequesters([]);
        setTopSpendingUnits([]);
        setScatterData([]);
      }
    };

    fetchAggregatedData();
  }, [selectedYears]); // Efek ini dijalankan setiap kali `selectedYears` berubah


  // === Fetch Daftar Semua Unit (Tidak terpengaruh oleh filter tahun) ===
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await fetchAPI(`/api/unit-pemohon-list/${selectedYearForTable}`);
        const data = await res.json();
        const sortedUnits = (data.units || []).sort((a, b) =>
          a.UnitPemohon.localeCompare(b.UnitPemohon)
        );
        setAllUnits(sortedUnits);
        setAvailableUnitsForRadar(data.units?.map((u) => u.UnitPemohon) || []);
      } catch (error) {
        console.error("Gagal memuat daftar unit:", error);
        setAllUnits([]);
        setAvailableUnitsForRadar([]);
      }
    };

    // Reset pencarian & halaman **setelah** data di-fetch
    fetchUnits().then(() => {
      setSearchQuery("");
      setCurrentPage(1);
    });
  }, [selectedYearForTable]); // ✅ TAMBAHKAN DEPENDENCY INI

  useEffect(() => {
    setSearchQuery(""); // Reset pencarian saat ganti tahun
    setCurrentPage(1);
  }, [selectedYearForTable]);

  // === Fetch Radar Data ===
  useEffect(() => {
    const fetchRadar = async (unit, setter) => {
      if (!unit) return;
      try {
        const res = await fetchAPI(
          `/api/data-radar?unit=${encodeURIComponent(unit)}`
        );
        const data = await res.json();
        setter(data);
      } catch (error) {
        console.error(`Gagal memuat radar untuk ${unit}:`, error);
        setter(null);
      }
    };

    fetchRadar(radarUnit1, setRadarData1);
    fetchRadar(radarUnit2, setRadarData2);
  }, [radarUnit1, radarUnit2]);

  // === Pilih 2 unit acak saat pertama kali ===
  // ✅ Perbaikan: Inisialisasi radar unit hanya saat belum ada pilihan (initial render / kosong)
  useEffect(() => {
    // Cukup sekali saat availableUnitsForRadar pertama kali terisi & belum ada pilihan aktif
    if (
      availableUnitsForRadar.length > 0 &&
      !radarUnit1 &&
      !radarUnit2
    ) {
      const shuffled = [...availableUnitsForRadar].sort(() => 0.5 - Math.random());
      if (shuffled.length >= 2) {
        setRadarUnit1(shuffled[0]);
        setRadarUnit2(shuffled[1]);
      } else if (shuffled.length === 1) {
        setRadarUnit1(shuffled[0]);
        setRadarUnit2("");
      }
    }
  }, [availableUnitsForRadar, radarUnit1, radarUnit2]); // Tambahkan dependency agar tidak over-trigger

  // === Filter & Pagination (untuk Tabel) ===
  const filteredUnits = useMemo(() => {
    if (!searchQuery) return allUnits;
    const q = searchQuery.toLowerCase();
    return allUnits.filter((unit) =>
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
    // Gunakan tahun terbaru dari selectedYears untuk detail
    const latestYear = Math.max(...selectedYears);
    setIsModalOpen(true);
    setSelectedItemForChart(null);
    try {
      const res = await fetchAPI(
        `/api/unit-item-monthly?unit=${encodeURIComponent(
          unitName
        )}&year=${latestYear}`
      );
      const data = await res.json();
      setUnitItems(data.items || []);
    } catch (error) {
      console.error("Gagal memuat detail barang:", error);
      setUnitItems([]);
    }
  };

  // === Chart Options ===
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y", // Horizontal bar
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `${context.label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}M`;
            if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}jt`;
            if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
            return value.toString();
          },
          maxRotation: 0, // Jangan putar label
          minRotation: 0,
          font: {
            size: 12, // ⬇️ Ukuran font lebih kecil
          },
          padding: 6, // ⬇️ Jarak antara label dan sumbu
        },
        grid: {
          display: false, // Hilangkan grid line agar lebih bersih
        },
      },
      y: {
        ticks: {
          font: {
            size: 12, // ⬇️ Ukuran font lebih kecil
          },
          padding: 6, // ⬇️ Jarak antara label dan sumbu
        },
        grid: {
          display: false, // Hilangkan grid line
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
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
    plugins: { legend: { position: "top" } },
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: "Total Permintaan (Unit)" },
        beginAtZero: true,
      },
      y: {
        title: { display: true, text: "Total Pengeluaran (Rp)" },
        beginAtZero: true,
        ticks: {
          callback: (value) => formatRupiahLengkap(value),
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const d = context.raw;
            return `${
              d.unit
            } | Permintaan: ${d.x.toLocaleString()} | Pengeluaran: ${formatRupiahLengkap(
              d.y
            )}`;
          },
          afterLabel: (context) => {
            return `Segmen: ${context.raw.segmen}`;
          },
        },
      },
    },
  };

  // === Chart Data ===
 // Helper: Singkatkan teks jika lebih dari 20 karakter
const shortenLabel = (text, maxLength = 20) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
};

const barDataRequesters = {
  labels: topRequesters.map((item) => shortenLabel(item.UnitPemohon, 20)),
  datasets: [
    {
      label: "Total Barang Diminta",
      data: topRequesters.map((item) => item.TotalPermintaan),
      backgroundColor: topRequesters.map((_, i) =>
        getOrangeGradient(i, topRequesters.length)
      ),
    },
  ],
};

const barDataSpending = {
  labels: topSpendingUnits.map((item) => shortenLabel(item.UnitPemohon, 20)),
  datasets: [
    {
      label: "Total Pengeluaran (Rp)",
      data: topSpendingUnits.map((item) => item.TotalPengeluaran),
      backgroundColor: topSpendingUnits.map((_, i) =>
        getBlueGradientColor(i, topSpendingUnits.length)
      ),
    },
  ],
};

  const scatterChartData = {
    datasets: [
      {
        label: "Unit Pemohon",
        data: scatterData.map((u) => ({
          x: u.TotalPermintaan,
          y: u.TotalPengeluaran,
          unit: u.UnitPemohon,
          segmen: u.Segmen || "Tidak Diketahui",
        })),
        backgroundColor: scatterData.map((u) => {
          switch (u.Segmen) {
            case "Hemat":
              return "rgba(16, 185, 129, 0.7)";
            case "Sedang":
              return "rgba(245, 158, 11, 0.7)";
            case "Boros":
              return "rgba(239, 68, 68, 0.7)";
            default:
              return "rgba(156, 163, 175, 0.7)";
          }
        }),
        borderColor: scatterData.map((u) => {
          switch (u.Segmen) {
            case "Hemat":
              return "#10b981";
            case "Sedang":
              return "#f59e0b";
            case "Boros":
              return "#ef4444";
            default:
              return "#9ca3af";
          }
        }),
        borderWidth: 1,
        pointRadius: 6,
      },
    ],
  };

  const monthlyLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Oct",
    "Nov",
    "Des",
  ];
  const lineData = selectedItemForChart
    ? {
        labels: monthlyLabels,
        datasets: [
          {
            label: `Permintaan Bulanan: ${selectedItemForChart.NamaBarang}`,
            data: selectedItemForChart.Bulanan,
            borderColor: "#3b82f6",
            tension: 0,
          },
        ],
      }
    : null;

  return (
    <div className="page-content">
      <div className="analytics-header">
        <h1 className="page-title">
          <i className="fas fa-users"></i> Analisis Unit Pemohon & Detail Barang
        </h1>
        <div className="filter-section">
          <span className="filter-label">Tahun :</span>
          <div className="year-chips" role="tablist" aria-label="Pilih tahun">
            <button
              type="button"
              className={`year-pill ${selectedYears.length === ALL_YEARS.length ? "active" : ""}`}
              onClick={toggleAllYears}
              aria-pressed={selectedYears.length === ALL_YEARS.length}
            >
              Semua
            </button>
            {ALL_YEARS.map((year) => (
              <button
                key={year}
                type="button"
                className={`year-pill ${selectedYears.includes(year) ? "active" : ""}`}
                onClick={() => toggleYear(year)}
                aria-pressed={selectedYears.includes(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout 2 kolom - Responsif */}
      <div
        className="charts-grid responsive-charts-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
          marginTop: "24px",
          width: "100%",
        }}
      >
        {/* Bar Chart: Top Requesters */}
        <div className="chart-card" style={{ minHeight: "300px", display: "flex", flexDirection: "column" }}>
          <h3 className="chart-title">
            Top 10 Unit Pemohon (
            {selectedYears.length === ALL_YEARS.length
              ? "Semua Tahun"
              : selectedYears.join(", ")}
            )
          </h3>
          <div
            className="chart-container"
            style={{
              flex: 1,
              minHeight: "200px",
              maxHeight: "400px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflowX: "auto", // 🔥 KUNCI: Scroll horizontal jika lebar
              padding: "10px 0", // Ruang untuk label Y
            }}
          >
            {topRequesters.length > 0 ? (
              <Bar
                data={barDataRequesters}
                options={barOptions}
              />
            ) : (
              <div style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Top Spending Units */}
        <div className="chart-card" style={{ minHeight: "300px", display: "flex", flexDirection: "column" }}>
          <h3 className="chart-title">
            Top 10 Unit dengan Pengeluaran Terbesar (
            {selectedYears.length === ALL_YEARS.length
              ? "Semua Tahun"
              : selectedYears.join(", ")}
            )
          </h3>
          <div
            className="chart-container"
            style={{
              flex: 1,
              minHeight: "200px",
              maxHeight: "400px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflowX: "auto", // 🔥 KUNCI: Scroll horizontal jika lebar
              padding: "10px 0", // Ruang untuk label Y
            }}
          >
            {topSpendingUnits.length > 0 ? (
              <Bar
                data={barDataSpending}
                options={barOptions}
              />
            ) : (
              <div style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
                Tidak ada data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scatter Plot - Sekarang tergantung pada selectedYears */}
      <div className="chart-card" style={{ marginTop: "24px" }}>
        <h3 className="chart-title">
          Scatter Plot: Total Pengeluaran vs Total Permintaan (
          {selectedYears.length === ALL_YEARS.length
            ? "Semua Tahun"
            : selectedYears.join(", ")}
          )
        </h3>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
          Titik berwarna: <span style={{ color: "#10b981" }}>● Hemat</span>,{" "}
          <span style={{ color: "#f59e0b" }}>● Sedang</span>,{" "}
          <span style={{ color: "#ef4444" }}>● Boros</span>
        </p>
        <div className="chart-container" style={{ height: "400px" }}>
          <Scatter data={scatterChartData} options={scatterOptions} />
        </div>
      </div>

      {/* Radar Chart - Tidak terpengaruh oleh filter tahun */}
      <div className="chart-card" style={{ marginTop: "24px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <h3 className="chart-title">Perbandingan Profil Unit (Radar Chart)</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              width: "100%",
            }}
          >
            <select
              value={radarUnit1}
              onChange={(e) => setRadarUnit1(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <option value="">Pilih Unit 1</option>
              {availableUnitsForRadar.map((unit) => (
                <option key={`u1-${unit}`} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <select
              value={radarUnit2}
              onChange={(e) => setRadarUnit2(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <option value="">Pilih Unit 2</option>
              {availableUnitsForRadar.map((unit) => (
                <option key={`u2-${unit}`} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="chart-container"
          style={{
            height: "300px", // ⬇️ Dikurangi dari 400px → lebih kompak
            minHeight: "250px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {radarUnit1 || radarUnit2 ? (
            <Radar
              data={{
                labels: [
                  "Total Anggaran Digunakan",
                  "Volume Permintaan",
                  "Rata-rata Biaya per Item",
                  "Efisiensi Pengadaan",
                  "Diversitas Permintaan",
                  "Segmen Keuangan",
                ],
                datasets: [
                  ...(radarData1
                    ? [
                        {
                          label: `${radarUnit1} (${radarData1.cluster || "–"})`,
                          data: [
                            radarData1.scores["Total Anggaran Digunakan"],
                            radarData1.scores["Volume Permintaan"],
                            radarData1.scores["Rata-rata Biaya per Item"],
                            radarData1.scores["Efisiensi Pengadaan"],
                            radarData1.scores["Diversitas Permintaan"],
                            radarData1.scores["Segmen Keuangan"],
                          ],
                          borderColor: "#3b82f6",
                          backgroundColor: "rgba(59, 130, 246, 0.2)",
                          fill: true,
                          pointBackgroundColor: "#3b82f6",
                          pointBorderColor: "#fff",
                          pointHoverBackgroundColor: "#fff",
                          pointHoverBorderColor: "#3b82f6",
                        },
                      ]
                    : []),
                  ...(radarData2
                    ? [
                        {
                          label: `${radarUnit2} (${radarData2.cluster || "–"})`,
                          data: [
                            radarData2.scores["Total Anggaran Digunakan"],
                            radarData2.scores["Volume Permintaan"],
                            radarData2.scores["Rata-rata Biaya per Item"],
                            radarData2.scores["Efisiensi Pengadaan"],
                            radarData2.scores["Diversitas Permintaan"],
                            radarData2.scores["Segmen Keuangan"],
                          ],
                          borderColor: "#ef4444",
                          backgroundColor: "rgba(239, 68, 68, 0.2)",
                          fill: true,
                          pointBackgroundColor: "#ef4444",
                          pointBorderColor: "#fff",
                          pointHoverBackgroundColor: "#fff",
                          pointHoverBorderColor: "#ef4444",
                        },
                      ]
                    : []),
                ],
              }}
              options={{
                ...radarOptions,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "top",
                    labels: {
                      font: {
                        size: 12,
                      },
                    },
                  },
                },
                scales: {
                  r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 10,
                    ticks: { stepSize: 2, font: { size: 10 } },
                  },
                },
              }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
              Pilih minimal satu unit untuk membandingkan profil.
            </div>
          )}
        </div>
      </div>

      {/* Tabel Unit - Tidak terpengaruh oleh filter tahun, diurutkan ascending */}
      <div className="chart-card" style={{ marginTop: "24px" }}>
        {/* Header dengan Judul, Search, dan Filter Tahun */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h3 className="chart-title">
            Daftar Unit Pemohon (Tahun {selectedYearForTable} - Diurutkan A-Z)
          </h3>

          <div className="search-bar">
            <div className="search-container">
              <input
                type="text"
                placeholder="Cari Nama Unit..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari unit"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  minWidth: "200px",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Bersihkan pencarian"
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

            <div className="table-controls" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <label className="table-year-label" htmlFor="table-year-select" style={{ fontSize: "14px", color: "#374151" }}>
                Tahun:
              </label>
              <select
                id="table-year-select"
                className="year-filter-select"
                value={selectedYearForTable}
                onChange={(e) => setSelectedYearForTable(Number(e.target.value))}
                aria-label="Pilih tahun untuk tabel"
                style={{
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: "14px",
                  minWidth: "80px",
                }}
              >
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Unit Pemohon */}
        <div className="table-container" style={{ overflowX: "auto" }}>
          {paginatedUnits.length > 0 ? (
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "bold" }}>Unit Pemohon</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold" }}>Total Permintaan</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold" }}>Total Pengeluaran</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "bold" }}>Segmen (Uang)</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "bold" }}>Label Segmen (Jumlah)</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "bold" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUnits.map((unit, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px 12px", wordBreak: "break-word" }}>{unit.UnitPemohon}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{unit.TotalPermintaan.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatRupiahLengkap(unit.TotalPengeluaran)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{unit.Segmen}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{unit.LabelSegmen}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => openDetailModal(unit.UnitPemohon)}
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
                        Detail Barang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              {searchQuery ? "Unit tidak ditemukan" : "Tidak ada data unit pemohon"}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredUnits.length > ITEMS_PER_PAGE && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "16px",
              gap: "8px",
            }}
          >
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

      {/* Modal Detail Barang */}
      {isModalOpen && (
        <div
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
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "1000px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Detail Barang: {selectedUnit}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                overflowY: "auto", // ⬅️ Aktifkan scroll
              }}
            >
              {unitItems.length > 0 ? (
                <>
                  {selectedItemForChart && (
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ marginBottom: "12px" }}>
                        Tren Bulanan: {selectedItemForChart.NamaBarang}
                      </h4>
                      <div style={{ height: "200px" }}>
                        <Line data={lineData} options={lineOptions} />
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      overflowX: "auto", // ⬅️ Jika tabel lebar, bisa scroll horizontal
                      border: "1px solid #eee",
                      borderRadius: "6px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <table
                      className="data-table"
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed", // ⬅️ Agar kolom tidak meledak
                        fontSize: "14px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th
                            style={{
                              padding: "10px",
                              textAlign: "left",
                              fontWeight: "bold",
                              width: "40%",
                            }}
                          >
                            Nama Barang
                          </th>
                          <th
                            style={{
                              padding: "10px",
                              textAlign: "right",
                              fontWeight: "bold",
                              width: "30%",
                            }}
                          >
                            Total
                          </th>
                          <th
                            style={{
                              padding: "10px",
                              textAlign: "center",
                              fontWeight: "bold",
                              width: "30%",
                            }}
                          >
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitItems.map((item, idx) => (
                          <tr
                            key={idx}
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
                            <td
                              style={{
                                padding: "10px",
                                wordBreak: "break-word", // ⬅️ Jika nama panjang, turun baris
                                whiteSpace: "normal",
                              }}
                            >
                              {item.NamaBarang}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                textAlign: "right",
                                fontWeight: "500",
                              }}
                            >
                              {item.Total}
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                textAlign: "center",
                              }}
                            >
                              <button
                                onClick={() => setSelectedItemForChart(item)}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                Lihat Tren
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
                  Tidak ada data permintaan barang untuk unit ini di tahun
                  terbaru dari filter.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === CSS RESPONSIF === */}
      <style jsx>{`
        .responsive-charts-grid {
          width: 100%;
        }

        @media (max-width: 768px) {
          .responsive-charts-grid {
            grid-template-columns: 1fr !important;
          }
          .chart-card {
            width: 100% !important;
            padding: 16px !important;
          }
          .chart-title {
            font-size: 16px !important;
          }
        }

        /* Agar chart tidak terpotong saat horizontal */
        .chart-container {
          width: 100% !important;
          min-height: 250px;
          position: relative;
          overflow-x: auto; /* ✅ Ini kunci utama */
          padding-left: 10px; /* Ruang untuk label Y */
        }

        /* Force Bar chart to be fully contained */
        .chart-container canvas {
          max-width: 100% !important;
          height: auto !important;
        }
      `}</style>
    </div>
  );
};

export default UnitAnalysisPage;