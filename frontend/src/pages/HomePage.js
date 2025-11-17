// src/pages/HomePage.js
import React, { useEffect, useState } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  plugins,
} from "chart.js";
import { fetchAPI } from "../utils/api";

ChartJS.register(
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

const HomePage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [monthlyExpenditureByYear, setMonthlyExpenditureByYear] = useState({});
  const [monthlyDemandByYear, setMonthlyDemandByYear] = useState({});
  const [loading, setLoading] = useState(true);
  const [categoryDemandData, setCategoryDemandData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedYears, setSelectedYears] = useState([2023, 2024, 2025]); // default semua tahun

  const ALL_YEARS = [2023, 2024, 2025];

  // Helper: format Rupiah
  const formatRupiah = (value) => {
    if (value >= 1_000_000_000) return `Rp ${(value / 1e9).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1e6).toFixed(1)}jt`;
    return `Rp ${value.toLocaleString("id-ID")}`;
  };
  const formatRupiahLengkap = (value) => {
    // Pastikan value adalah angka
    if (typeof value === "string") {
      // Jika sudah berupa string (misal "Rp1.9M"), kita ambil angkanya dari API asli
      // Tapi sebaiknya hindari ini — lebih baik format di backend atau gunakan value numerik
      return value;
    }
    // Format sebagai Rupiah lengkap dengan pemisah ribuan
    return `Rp${Math.round(value).toLocaleString("id-ID")}`;
  };

  // Toggle tahun
  const toggleYear = (year) => {
    if (selectedYears.includes(year)) {
      const newSelection = selectedYears.filter((y) => y !== year);
      setSelectedYears(newSelection.length ? newSelection : [2025]);
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  // Toggle "Semua Tahun"
  const toggleAllYears = () => {
    if (selectedYears.length === ALL_YEARS.length) {
      setSelectedYears([2025]);
    } else {
      setSelectedYears([...ALL_YEARS]);
    }
  };

  // Fetch data utama
  const fetchMainData = async (years) => {
    const yearsParam =
      years.includes(2023) && years.includes(2024) && years.includes(2025)
        ? "all"
        : years.join(",");

    try {
      const [metricsRes, monthlyRes, categoryRes, requestersRes] =
        await Promise.all([
          fetchAPI(`/api/dashboard-metrics?years=${yearsParam}`),
          fetchAPI(`/api/monthly-demand?years=${yearsParam}`),
          fetchAPI(`/api/category-and-top-items?years=${yearsParam}`),
          fetchAPI(`/api/top-requesters?years=${yearsParam}`),
        ]);

      if (
        !metricsRes.ok ||
        !monthlyRes.ok ||
        !categoryRes.ok ||
        !requestersRes.ok
      ) {
        throw new Error("Gagal mengambil data utama");
      }

      const metrics = await metricsRes.json();
      const monthly = await monthlyRes.json();
      const category = await categoryRes.json();
      const requesters = await requestersRes.json();

      return {
        ...metrics,
        monthlyDemand: monthly.monthlyDemand || Array(12).fill(0),
        categoryValueLabels: category.categoryValueLabels || [],
        categoryValueData: category.categoryValueData || [],
        topItems: category.topItems || [],
        topRequesters: requesters.topRequesters || [],
      };
    } catch (err) {
      console.error("Error fetching main data:", err);
      throw err;
    }
  };
  // Tambahkan fungsi fetch baru
  const fetchCategoryDemandData = async (years) => {
    const yearsParam =
      years.includes(2023) && years.includes(2024) && years.includes(2025)
        ? "all"
        : years.join(",");

    try {
      const res = await fetchAPI(
        `/api/category-demand-proportion?years=${yearsParam}`
      );
      if (!res.ok) throw new Error("Gagal mengambil data proporsi permintaan");
      const json = await res.json();
      return {
        labels: json.labels || [],
        data: json.data || [],
      };
    } catch (err) {
      console.error("Error fetching category demand proportion:", err);
      return { labels: [], data: [] };
    }
  };
  const fetchMonthlyDemandByYear = async (year) => {
    try {
      const res = await fetchAPI(`/api/monthly-demand?years=${year}`);
      if (res.ok) {
        const json = await res.json();
        return json.monthlyDemand || Array(12).fill(0);
      }
    } catch (e) {
      console.warn(`Gagal ambil data permintaan ${year}:`, e);
    }
    return Array(12).fill(0);
  };
  // Fetch data pengeluaran PER TAHUN
  const fetchExpenditureData = async (years) => {
    const data = {};
    await Promise.all(
      years.map(async (year) => {
        try {
          const res = await fetchAPI(`/api/monthly-expenditure?years=${year}`);
          if (res.ok) {
            const json = await res.json();
            data[year] = json.monthlyExpenditure || Array(12).fill(0);
          } else {
            data[year] = Array(12).fill(0);
          }
        } catch (e) {
          console.warn(`Gagal ambil data pengeluaran ${year}:`, e);
          data[year] = Array(12).fill(0);
        }
      })
    );
    return data;
  };

  // Efek utama — HANYA DEPEND ON selectedYears
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          mainData,
          expenditureData,
          demand2023,
          demand2024,
          demand2025,
          categoryDemand,
        ] = await Promise.all([
          fetchMainData(selectedYears),
          fetchExpenditureData(selectedYears),
          fetchMonthlyDemandByYear(2023),
          fetchMonthlyDemandByYear(2024),
          fetchMonthlyDemandByYear(2025),
          fetchCategoryDemandData(selectedYears), // ⬅️ Tambahkan ini
        ]);

        setDashboardData(mainData);
        setMonthlyExpenditureByYear(expenditureData);
        setMonthlyDemandByYear({
          2023: demand2023,
          2024: demand2024,
          2025: demand2025,
        });
        setCategoryDemandData(categoryDemand); // ⬅️ Simpan data baru
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedYears]);

  // === Chart Configs ===
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `Rp. ${value.toLocaleString("id-ID")}`,
        },
      },
    },
  };
  const lineOptionsUnits = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} unit`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => value.toLocaleString(), // ✅ Hanya angka, tanpa Rp.
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.raw)}`,
        },
      },
    },
  };
  const doughnutOptionsDemand = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw.toLocaleString()} unit`,
        },
      },
    },
  };

  // Data: Permintaan (unit) per bulan
  const lineDataUnits = {
    labels: [
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
    ],
    datasets: [
      ...(selectedYears.includes(2023)
        ? [
            {
              label: "Permintaan 2023",
              data: monthlyDemandByYear[2023] || Array(12).fill(0), // ✅ Tambahkan "data:"
              borderColor: "#ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              tension: 0,
              fill: false,
            },
          ]
        : []),
      ...(selectedYears.includes(2024)
        ? [
            {
              label: "Permintaan 2024",
              data: monthlyDemandByYear[2024] || Array(12).fill(0), // ✅ Tambahkan "data:"
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0,
              fill: false,
            },
          ]
        : []),
      ...(selectedYears.includes(2025)
        ? [
            {
              label: "Permintaan 2025",
              data: monthlyDemandByYear[2025] || Array(12).fill(0), // ✅ Tambahkan "data:"
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0,
              fill: false,
            },
          ]
        : []),
    ],
  };
  const doughnutDataDemand = categoryDemandData
    ? {
        labels: categoryDemandData.labels,
        datasets: [
          {
            data: categoryDemandData.data,
            backgroundColor: [
              "#1e40af",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
              "#0ea5e9",
            ],
          },
        ],
      }
    : null;

  // ✅ Data: Pengeluaran Uang — 3 garis berbeda
  const lineDataExpenditure = {
    labels: [
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
    ],
    datasets: [
      ...(selectedYears.includes(2023)
        ? [
            {
              label: "Pengeluaran 2023",
              data: monthlyExpenditureByYear[2023] || Array(12).fill(0),
              borderColor: "#ef4444", // merah
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              tension: 0,
              fill: false,
            },
          ]
        : []),
      ...(selectedYears.includes(2024)
        ? [
            {
              label: "Pengeluaran 2024",
              data: monthlyExpenditureByYear[2024] || Array(12).fill(0),
              borderColor: "#3b82f6", // biru
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0,
              fill: false,
            },
          ]
        : []),
      ...(selectedYears.includes(2025)
        ? [
            {
              label: "Pengeluaran 2025",
              data: monthlyExpenditureByYear[2025] || Array(12).fill(0),
              borderColor: "#10b981", // hijau
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0,
              fill: false,
            },
          ]
        : []),
    ],
  };

  const doughnutData = dashboardData
    ? {
        labels: dashboardData.categoryValueLabels,
        datasets: [
          {
            data: dashboardData.categoryValueData,
            backgroundColor: [
              "#1e40af",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
              "#0ea5e9",
            ],
          },
        ],
      }
    : null;

  if (loading) {
    return <div className="page-content">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="page-content">Error: {error}</div>;
  }

  if (!dashboardData) {
    return <div className="page-content">Tidak ada data.</div>;
  }

return (
  <div className="page-content">
    <div className="dashboard-header">
      <h1>Dashboard Permintaan & Pengeluaran</h1>
      <div className="filter-section">
  <span className="filter-label">Tahun :</span>
  <div className="year-chips" role="tablist" aria-label="Pilih tahun untuk grafik">
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
        key={`chart-${year}`}
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

    <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Permintaan</span>
            <div
              className="stat-icon"
              style={{ background: "#dbeafe", color: "#1e40af" }}
            >
              <i className="fas fa-download"></i>
            </div>
          </div>
          <div className="stat-value">
            {dashboardData.metrics.totalRequests.value.toLocaleString()}
          </div>
          <div
            className={`stat-change ${
              !dashboardData.metrics.totalRequests.isPositive ? "negative" : ""
            }`}
          >
            {dashboardData.metrics.totalRequests.changeText}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Nilai Pengeluaran Barang</span>
            <div
              className="stat-icon"
              style={{ background: "#d1fae5", color: "#065f46" }}
            >
              <i className="fas fa-hand-holding-usd"></i>
            </div>
          </div>
          <div className="stat-value">
            {formatRupiahLengkap(dashboardData.metrics.outflowValue.value)}
          </div>
          <div
            className={`stat-change ${
              !dashboardData.metrics.outflowValue.isPositive ? "negative" : ""
            }`}
          >
            {dashboardData.metrics.outflowValue.changeText}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Unit Pemohon</span>
            <div
              className="stat-icon"
              style={{ background: "#fed7aa", color: "#92400e" }}
            >
              <i className="fas fa-user-friends"></i>
            </div>
          </div>
          <div className="stat-value">
            {dashboardData.metrics.totalUniqueRequesters.value}
          </div>
          <div className="stat-change">Total Unit yang Aktif Meminta</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Barang</span>
            <div
              className="stat-icon"
              style={{ background: "#fecaca", color: "#991b1b" }}
            >
              <i className="fas fa-rocket"></i>
            </div>
          </div>
          <div className="stat-value">
            {dashboardData.metrics.totalUniqueSKUs.value}
          </div>
          <div className="stat-change">Total Jenis Item</div>
        </div>
      </div>

      <div className="charts-grid">
        {/* === GRAFIK 3 GARIS: Pengeluaran Uang per Tahun === */}
        <div className="chart-card" style={{ marginTop: "24px" }}>
          <h3 className="chart-title">
            Tren Pengeluaran Uang oleh Unit Pemohon per Bulan
            {selectedYears.length > 1
              ? ` (${selectedYears.join(", ")})`
              : ` (${selectedYears[0]})`}
          </h3>
          <div className="chart-container" style={{ height: "350px" }}>
            <Line data={lineDataExpenditure} options={lineOptions} />
          </div>
        </div>

        <div className="chart-card" style={{ marginTop: "24px" }}>
          <h3 className="chart-title">
            Proporsi Permintaan & Pengeluaran Berdasarkan Kategori Barang
          </h3>
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "space-between",
              marginTop: "16px",
            }}
          >
            {/* Donat 1: Proporsi Nilai Pengeluaran */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <h4 style={{ fontSize: "13px", color: "#475569" }}>
                Nilai Pengeluaran (Rp)
              </h4>
              <div className="chart-container" style={{ height: "300px" }}>
                {doughnutData && (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                )}
              </div>
            </div>

            {/* Donat 2: Proporsi Permintaan (Unit) */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <h4 style={{ fontSize: "13px", color: "#475569" }}>
                Jumlah Permintaan (Unit)
              </h4>
              <div className="chart-container" style={{ height: "300px" }}>
                {doughnutDataDemand && (
                  <Doughnut
                    data={doughnutDataDemand}
                    options={doughnutOptionsDemand}
                  />
                )}
              </div>
            </div>
          </div>{" "}
          {/* <-- Tutup div flex container di sini */}
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">
            Tren Pengeluaran Barang Bulanan (Unit)
          </h3>
          <div className="chart-container" style={{ height: "300px" }}>
            {lineDataUnits && (
              <Line data={lineDataUnits} options={lineOptionsUnits} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
