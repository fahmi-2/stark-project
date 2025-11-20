// src/components/StarkSplash.js
import React, { useState, useEffect } from 'react';

const StarkSplash = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 500); // sesuaikan dengan durasi animasi fadeOut
      return () => clearTimeout(exitTimer);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`stark-splash ${isExiting ? 'exit' : ''}`}
      role="status"
      aria-label="Memuat aplikasi STARK"
      aria-live="polite"
    >
      <div className="stark-splash-content">
        <img
          src="/robot.png"
          alt="STARK Robot Assistant"
          className="stark-robot-image"
          aria-hidden="true"
        />
        <h1 className="stark-splash-text" aria-hidden="true">
          STARK
        </h1>
        <div className="stark-loading-dots" aria-hidden="true">
          <div className="stark-dot"></div>
          <div className="stark-dot"></div>
          <div className="stark-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default StarkSplash;