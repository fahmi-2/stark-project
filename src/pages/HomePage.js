// src/pages/HomePage.js
import React, { useEffect, useRef, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
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
} from 'chart.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2025);

  // Fetch data berdasarkan tahun
  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, monthlyRes, categoryRes, requestersRes] = await Promise.all([
  fetch(`http://localhost:8000/api/dashboard-metrics/${selectedYear}`),
  fetch(`http://localhost:8000/api/monthly-demand/${selectedYear}`),
  fetch(`http://localhost:8000/api/category-and-top-items/${selectedYear}`),
  fetch(`http://localhost:8000/api/top-requesters/${selectedYear}`) // ← Tambahkan ini
]);

      if (!metricsRes.ok || !monthlyRes.ok || !categoryRes.ok || !requestersRes.ok) {
  throw new Error('Gagal mengambil data dari server');
}

      const metrics = await metricsRes.json();
      const monthly = await monthlyRes.json();
      const category = await categoryRes.json();
      const requesters = await requestersRes.json();
      setDashboardData({
  ...metrics,
  monthlyDemand: monthly.monthlyDemand,
  categoryValueLabels: category.categoryValueLabels,
  categoryValueData: category.categoryValueData,
  topItems: category.topItems,
  topRequesters: requesters.topRequesters // ← Tambahkan ini
});
    } catch (err) {
      console.error('Error fetching ', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [selectedYear]); // ← Hanya trigger ulang saat selectedYear berubah

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `barang: ${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: Rp ${(context.parsed / 1e6).toFixed(1)}jt`,
        },
      },
    },
  };

  const lineData = dashboardData ? {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Des'],
    datasets: [
      {
        label: 'Total Pengeluaran Barang Bulanan (Unit)',
        data: dashboardData.monthlyDemand,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : null;

  const doughnutData = dashboardData ? {
    labels: dashboardData.categoryValueLabels,
    datasets: [
      {
        data: dashboardData.categoryValueData,
        backgroundColor: ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'],
      },
    ],
  } : null;

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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Permintaan (Unit Keluar)</span>
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
              <i className="fas fa-download"></i>
            </div>
          </div>
          <div className="stat-value">{dashboardData.metrics.totalRequests.value.toLocaleString()}</div>
          <div className={`stat-change ${!dashboardData.metrics.totalRequests.isPositive ? 'negative' : ''}`}>
            {dashboardData.metrics.totalRequests.changeText}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Nilai Pengeluaran Barang</span>
            <div className="stat-icon" style={{ background: '#d1fae5', color: '#065f46' }}>
              <i className="fas fa-hand-holding-usd"></i>
            </div>
          </div>
          <div className="stat-value">{dashboardData.metrics.outflowValue.value}</div>
          <div className={`stat-change ${!dashboardData.metrics.outflowValue.isPositive ? 'negative' : ''}`}>
            {dashboardData.metrics.outflowValue.changeText}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Unit Pemohon (Unik)</span>
            <div className="stat-icon" style={{ background: '#fed7aa', color: '#92400e' }}>
              <i className="fas fa-user-friends"></i>
            </div>
          </div>
          <div className="stat-value">{dashboardData.metrics.totalUniqueRequesters.value}</div>
          <div className="stat-change">Total Unit yang Aktif Meminta</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Barang Unik (SKU)</span>
            <div className="stat-icon" style={{ background: '#fecaca', color: '#991b1b' }}>
              <i className="fas fa-rocket"></i>
            </div>
          </div>
          <div className="stat-value">{dashboardData.metrics.totalUniqueSKUs.value}</div>
          <div className="stat-change">Total Jenis Item</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Tren Pengeluaran Barang Bulanan (barang))</h3>
          <div className="chart-container" style={{ height: '300px' }}>
            {lineData && <Line data={lineData} options={lineOptions} />}
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Proporsi Nilai Pengeluaran Berdasarkan Kategori (Top 6)</h3>
          <div className="chart-container" style={{ height: '300px', position: 'relative'  }}>
            {doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />}
          </div>
        </div>
      </div>

      <div className="table-card">
</div>
    </div>
  );
};

export default HomePage;