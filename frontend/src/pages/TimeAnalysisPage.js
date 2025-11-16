// src/pages/TimeAnalysisPage.js
import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
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
  Tooltip,
  Legend,
  Filler
);

const TimeAnalysisPage = () => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [monthlyDemand, setMonthlyDemand] = useState(Array(12).fill(0));
  const [yearlyData, setYearlyData] = useState({
    2023: Array(12).fill(0),
    2024: Array(12).fill(0),
    2025: Array(12).fill(0),
  });

  // Fetch data bulanan per tahun
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil data tahun yang dipilih untuk bar chart
        const monthlyRes = await fetchAPI(
          `/api/monthly-demand/${selectedYear}`
        );
        const monthlyData = await monthlyRes.json();
        setMonthlyDemand(monthlyData.monthlyDemand || Array(12).fill(0));

        // Ambil data 3 tahun untuk line chart
        const [data2023, data2024, data2025] = await Promise.all([
          fetchAPI(`/api/monthly-demand/2023`).then((r) => r.json()),
          fetchAPI(`/api/monthly-demand/2024`).then((r) => r.json()),
          fetchAPI(`/api/monthly-demand/2025`).then((r) => r.json()),
        ]);

        setYearlyData({
          2023: data2023.monthlyDemand || Array(12).fill(0),
          2024: data2024.monthlyDemand || Array(12).fill(0),
          2025: data2025.monthlyDemand || Array(12).fill(0),
        });
      } catch (error) {
        console.error("Gagal memuat data:", error);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Options for Bar Chart (Tren Pengeluaran Per Bulan)
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Unit: ${context.raw}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.max(...monthlyDemand) * 1.1, // +10% ruang kosong
        ticks: {
          stepSize: 500,
        },
      },
    },
  };

  // Options for Line Chart (Musiman Permintaan - Perbandingan Tahunan)
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw} unit`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max:
          Math.max(
            ...yearlyData[2023],
            ...yearlyData[2024],
            ...yearlyData[2025]
          ) * 1.1,
        ticks: {
          stepSize: 1000,
        },
      },
      x: {
        title: { display: true, text: "Bulan" },
      },
    },
  };

  // Data for Bar Chart (Tren Pengeluaran Per Bulan)
  const barData = {
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
      {
        label: "Total Pengeluaran Barang Bulanan (Unit)",
        data: monthlyDemand,
        backgroundColor: "#f59e0b",
        borderWidth: 1,
      },
    ],
  };

  // Data for Line Chart (Musiman Permintaan - Perbandingan Tahunan)
  const lineData = {
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
      {
        label: "Pengeluaran 2023",
        data: yearlyData[2023],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: false,
      },
      {
        label: "Pengeluaran 2024",
        data: yearlyData[2024],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: false,
      },
      {
        label: "Pengeluaran 2025",
        data: yearlyData[2025],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 128, 0.1)",
        tension: 0.4,
        fill: false,
      },
    ],
  };

  return (
    <div className="page-content">
      <div className="analytics-header">
        <h1 className="page-title">
          <i className="fas fa-chart-line"></i> Analisis Tren Permintaan
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
          <h3 className="chart-title">Tren Pengeluaran Per Bulan</h3>
          <div className="chart-container" style={{ height: "300px" }}>
            {monthlyDemand.some((x) => x > 0) ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                Tidak ada data untuk tahun ini.
              </div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">
            Musiman Permintaan (Perbandingan Tahunan)
          </h3>
          <div className="chart-container" style={{ height: "300px" }}>
            {Object.values(yearlyData).some((data) =>
              data.some((x) => x > 0)
            ) ? (
              <Line data={lineData} options={lineOptions} />
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                Tidak ada data untuk ketiga tahun.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeAnalysisPage;
