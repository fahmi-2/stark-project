// StatsGrid.js
import React from 'react';

const StatsGrid = ({ stats }) => {
  if (!stats) {
    return <div>No data available</div>; // Ensure we handle the case when stats is undefined
  }

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-header">
            <span className="stat-title">{stat.title}</span>
            <div className="stat-icon" style={{ background: stat.iconColor }}>
              <i className={stat.icon}></i>
            </div>
          </div>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-change">{stat.change}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;
