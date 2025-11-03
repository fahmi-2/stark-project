import React from 'react';

function DashboardHeader() {
  return (
    <div className="dashboard-header">
      <h1>Dashboard Permintaan & Pengeluaran</h1>
      <div className="filter-section">
        <span className="filter-label">Tahun:</span>
        <select className="year-filter-select" data-page-reload="home">
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
        </select>
      </div>
    </div>
  );
}

export default DashboardHeader;
