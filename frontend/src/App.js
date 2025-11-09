// src/App.js
import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import UnitAnalysisPage from './pages/UnitAnalysisPage';
import ItemAnalysisPage from './pages/ItemAnalysisPage';
import ChatBotPage from './pages/ChatBotPage';
import AboutPage from './pages/AboutPage'; // ✅ Pastikan ini ada

const App = () => {
  const [activePage, setActivePage] = useState('home');
  const [year, setYear] = useState('2025');

  const handleNavigate = (page) => setActivePage(page);
  const handleYearChange = (newYear) => setYear(newYear);

  const renderPage = () => {
    const props = { year, onYearChange: handleYearChange };
    switch (activePage) {
      case 'home':
        return <HomePage {...props} />;
      case 'unit-analysis':
        return <UnitAnalysisPage {...props} />;
      case 'item-analysis':
        return <ItemAnalysisPage {...props} />;
  
      
      case 'chatbot':
        return <ChatBotPage />;
      case 'about':
        return <AboutPage />; // ✅ Gunakan halaman ini
      // ... sisa halaman lainnya
      default:
        return <HomePage {...props} />;
    }
  };

  return (
    <div className="container">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <div className="main-content">{renderPage()}</div>
    </div>
  );
};

export default App;