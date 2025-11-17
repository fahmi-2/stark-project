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
        const res = await fetchAPI("/api/unit-pemohon-list");
        const data = await res.json();
        // Urutkan unit secara ascending berdasarkan UnitPemohon
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
    fetchUnits();
  }, []);

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
  useEffect(() => {
    if (availableUnitsForRadar.length >= 2) {
      const shuffled = [...availableUnitsForRadar].sort(
        () => 0.5 - Math.random()
      );
      setRadarUnit1(shuffled[0]);
      setRadarUnit2(shuffled[1]);
    } else if (availableUnitsForRadar.length === 1) {
      setRadarUnit1(availableUnitsForRadar[0]);
      setRadarUnit2("");
    }
  }, [availableUnitsForRadar]);

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
    indexAxis: "y",
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
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
  const barDataRequesters = {
    labels: topRequesters.map((item) => item.UnitPemohon),
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
    labels: topSpendingUnits.map((item) => item.UnitPemohon),
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

{/* Layout 2 kolom */}
      <div
        className="charts-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <div className="chart-card">
          <h3 className="chart-title">
            Top 10 Unit Pemohon (
            {selectedYears.length === ALL_YEARS.length
              ? "Semua Tahun"
              : selectedYears.join(", ")}
            )
          </h3>
          <div className="chart-container" style={{ height: "280px" }}>
            {topRequesters.length > 0 ? (
              <Bar data={barDataRequesters} options={barOptions} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">
            Top 10 Unit dengan Pengeluaran Terbesar (
            {selectedYears.length === ALL_YEARS.length
              ? "Semua Tahun"
              : selectedYears.join(", ")}
            )
          </h3>
          <div className="chart-container" style={{ height: "280px" }}>
            {topSpendingUnits.length > 0 ? (
              <Bar data={barDataSpending} options={barOptions} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
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
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 className="chart-title">
            Perbandingan Profil Unit (Radar Chart)
          </h3>
          <div style={{ display: "flex", gap: "12px" }}>
            <select
              value={radarUnit1}
              onChange={(e) => setRadarUnit1(e.target.value)}
              style={{ padding: "6px", minWidth: "180px" }}
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
              style={{ padding: "6px", minWidth: "180px" }}
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
        <div className="chart-container" style={{ height: "400px" }}>
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
              options={radarOptions}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              Pilih minimal satu unit
            </div>
          )}
        </div>
      </div>

      {/* Tabel Unit - Tidak terpengaruh oleh filter tahun, diurutkan ascending */}
      <div className="chart-card" style={{ marginTop: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 className="chart-title">
            Daftar Unit Pemohon (Semua Tahun - Diurutkan A-Z)
          </h3>
          <input
            type="text"
            placeholder="Cari unit pemohon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "250px",
            }}
          />
        </div>

        <div className="table-container" style={{ overflowX: "auto" }}>
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
                    <td>{formatRupiahLengkap(unit.TotalPengeluaran)}</td>
                    <td>{unit.Segmen}</td>
                    <td>{unit.LabelSegmen}</td>
                    <td>
                      <button
                        onClick={() => openDetailModal(unit.UnitPemohon)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
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
            <div
              style={{ padding: "20px", textAlign: "center", color: "#666" }}
            >
              {searchQuery
                ? "Unit tidak ditemukan"
                : "Tidak ada data unit pemohon"}
            </div>
          )}
        </div>

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
            <span style={{ alignSelf: "center" }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                backgroundColor:
                  currentPage === totalPages ? "#e5e7eb" : "#3b82f6",
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
              overflow: "hidden",
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

            <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
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
                                padding: "4px 8px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
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
                <p>
                  Tidak ada data permintaan barang untuk unit ini di tahun
                  terbaru dari filter.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitAnalysisPage;