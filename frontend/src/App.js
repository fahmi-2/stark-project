import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import StarkSplash from './components/StarkSplash';
import PageTransition from './components/PageTransition';
import HomePage from './pages/HomePage';
import UnitAnalysisPage from './pages/UnitAnalysisPage';
import ItemAnalysisPage from './pages/ItemAnalysisPage';
import ChatBotPage from './pages/ChatBotPage';
import AboutPage from './pages/AboutPage';

const App = () => {
  const [activePage, setActivePage] = useState('home');
  const [year, setYear] = useState('2025');
  const [showSplash, setShowSplash] = useState(true);
  const [showTransition, setShowTransition] = useState(false);

  const handleNavigate = (page) => {
    if (page !== activePage) {
      setShowTransition(true);
      setTimeout(() => {
        setActivePage(page);
      }, 400);
    }
  };

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
        return <AboutPage />;
      default:
        return <HomePage {...props} />;
    }
  };

  if (showSplash) {
    return <StarkSplash onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="container">
      <PageTransition 
        isActive={showTransition} 
        onComplete={() => setShowTransition(false)} 
      />
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <div className="main-content">{renderPage()}</div>
    </div>
  );
};

export default App;