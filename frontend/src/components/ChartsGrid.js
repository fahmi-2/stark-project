// ChartsGrid.js
import React from 'react';

const ChartsGrid = ({ charts }) => (
  <div className="charts-grid">
    {charts.map((chart, index) => (
      <div className="chart-card" key={index}>
        <h3 className="chart-title">{chart.title}</h3>
        <div className="chart-container">
          <canvas id={chart.id}></canvas>
        </div>
      </div>
    ))}
  </div>
);

export default ChartsGrid;
